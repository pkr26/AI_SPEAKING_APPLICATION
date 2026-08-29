import { createHmac } from 'crypto';
import type { ClientRateLimitInfo, Store } from 'express-rate-limit';
import { config } from './config';
import { pool } from './db';
import { JANITOR_BATCH_SIZE, runExclusiveBatchedDelete } from './janitor';
import { logger } from './logger';
import { shedRequestsTotal } from './metrics';
import { HttpError } from './middleware';

interface CounterRow {
  hits: number;
  reset_at: Date | string;
}

const HASH_KEY_INFO = 'postgres-rate-limit-store/v1';

// `config` is frozen at boot, so the derived key is computed once and reused.
let cachedHashKeySecret: Buffer | undefined;

function hashKeySecret(): Buffer {
  if (!cachedHashKeySecret) {
    cachedHashKeySecret = createHmac('sha256', config.rateLimitHashSecret || config.jwtSecret)
      .update(HASH_KEY_INFO)
      .digest();
  }
  return cachedHashKeySecret;
}

// Refund/reset/re-spend callbacks are deliberately fire-and-forget. A broken
// logging transport must not turn the catch path itself into an unhandled
// rejection (or replace increment's contracted retryable 503).
function warnStoreFailure(payload: Record<string, unknown>, message: string): void {
  try {
    logger.warn(payload, message);
  } catch {
    // The counter operation's fail-safe behavior remains authoritative.
  }
}

/**
 * PostgreSQL-backed fixed-window counters for multi-replica enforcement.
 * Each middleware gets its own instance/namespace; all API replicas share the
 * same rows. Raw IPs and user IDs are HMACed before persistence.
 */
export class PostgresRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix: string;

  constructor(
    private readonly namespace: string,
    private readonly windowMs: number,
  ) {
    this.prefix = `${namespace}:`;
  }

  // Counter keys are HMACed with a dedicated subkey, not the raw JWT secret:
  // domain separation means the signing key never appears as a MAC key
  // anywhere else, and RATE_LIMIT_HASH_SECRET lets operators give the counter
  // store its own rotation lifecycle. With the derived default, rotating
  // JWT_SECRET still invalidates every persisted window once — set the
  // dedicated secret to decouple the two.
  private hash(key: string): string {
    return createHmac('sha256', hashKeySecret()).update(this.namespace).update('\0').update(key).digest('hex');
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    let rows: CounterRow[];
    try {
      // clock_timestamp() is VOLATILE: every call site is evaluated separately,
      // so two independent samples straddling reset_at would let the hits and
      // reset_at branches disagree and carry a full stale count into a brand
      // new window. The proposed row samples the clock exactly once, and both
      // branches recover that single instant from EXCLUDED.reset_at.
      ({ rows } = await pool.query<CounterRow>(
        `INSERT INTO rate_limit_windows (namespace, key_hash, hits, reset_at)
       VALUES ($1, $2, 1, clock_timestamp() + ($3::double precision * interval '1 millisecond'))
       ON CONFLICT (namespace, key_hash) DO UPDATE
       SET hits = CASE
             WHEN rate_limit_windows.reset_at <= EXCLUDED.reset_at - ($3::double precision * interval '1 millisecond')
               THEN 1
             ELSE LEAST(rate_limit_windows.hits + 1, 2147483647)
           END,
           reset_at = CASE
             WHEN rate_limit_windows.reset_at <= EXCLUDED.reset_at - ($3::double precision * interval '1 millisecond')
               THEN EXCLUDED.reset_at
             ELSE rate_limit_windows.reset_at
           END
       RETURNING hits::int, reset_at`,
        [this.namespace, this.hash(key), this.windowMs],
      ));
    } catch (err) {
      // Without its counter the limiter cannot admit the request safely, but a
      // database brownout here is backpressure, not an application fault: fail
      // closed as a retryable 503 instead of an unhandled 500.
      warnStoreFailure({ err, namespace: this.namespace }, 'rate-limit increment failed; shedding request');
      shedRequestsTotal.inc({ reason: 'store_brownout' });
      throw new HttpError(503, 'Server is busy, please try again shortly', { retryAfterSeconds: 5 }, 'POOL_SATURATED');
    }
    const row = rows[0];
    if (!row) throw new Error('rate limit counter was not returned');
    return {
      totalHits: row.hits,
      resetTime: row.reset_at instanceof Date ? row.reset_at : new Date(row.reset_at),
    };
  }

  // Store-interface fallback for callers that do not retain the window they
  // incremented. Application limiters use decrementWithinWindow below: a
  // liveness-only guard cannot distinguish the old window from a successor
  // that another request renewed in place between the response-time expiry
  // check and this UPDATE.
  // The try/catch is load-bearing: express-rate-limit invokes decrement
  // fire-and-forget without handling rejections, so a database brownout here
  // would otherwise surface as an unhandled rejection and terminate the
  // process. A lost refund only leaves the budget slightly consumed until the
  // window expires.
  async decrement(key: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE rate_limit_windows
         SET hits = GREATEST(hits - 1, 0)
         WHERE namespace = $1 AND key_hash = $2 AND reset_at > clock_timestamp()`,
        [this.namespace, this.hash(key)],
      );
    } catch (err) {
      warnStoreFailure({ err, namespace: this.namespace }, 'rate-limit refund failed');
    }
  }

  /**
   * Refund exactly the fixed window observed by the incrementing request.
   * Matching the millisecond-truncated reset timestamp closes the rollover
   * TOCTOU in decrement(): an old response queued on the row lock can never
   * subtract a hit from the successor window after it wakes.
   */
  async decrementWithinWindow(key: string, observedResetAt: Date | undefined): Promise<void> {
    try {
      await pool.query(
        `UPDATE rate_limit_windows
         SET hits = GREATEST(hits - 1, 0)
         WHERE namespace = $1
           AND key_hash = $2
           AND reset_at > clock_timestamp()
           AND date_trunc('milliseconds', reset_at) = $3`,
        [this.namespace, this.hash(key), observedResetAt],
      );
    } catch (err) {
      warnStoreFailure({ err, namespace: this.namespace }, 'rate-limit exact-window refund failed');
    }
  }

  // Conditional re-spend (mirror of the window-guarded decrement): used by the
  // assess abort guard to take back the hit express-rate-limit refunded when
  // the client disconnected after paid capacity was committed. A plain
  // increment would start a FRESH window (hits=1) when the abort lands after
  // the window expired while the library refund was skipped — over-charging
  // the aborting user into the next window. Liveness alone is not enough
  // either: increment renews an expired window IN PLACE on the same row, so a
  // rival request can roll the counter into a successor window that is equally
  // live but no longer owes this hit anything. `observedResetAt` is the reset
  // time the limiter saw when it counted the hit, which pins the re-spend to
  // that exact window; a rolled row (or an absent observation, when the
  // limiter never ran) matches nothing and the re-spend stays a no-op. The
  // comparison is millisecond-truncated because node-postgres drops the
  // microsecond remainder when it parses timestamptz into a Date. Same
  // fail-safe contract as decrement: callers fire-and-forget, so errors are
  // logged, never thrown.
  async incrementWithinWindow(key: string, observedResetAt: Date | undefined): Promise<void> {
    try {
      await pool.query(
        `UPDATE rate_limit_windows
         SET hits = LEAST(hits + 1, 2147483647)
         WHERE namespace = $1
           AND key_hash = $2
           AND reset_at > clock_timestamp()
           AND date_trunc('milliseconds', reset_at) = $3`,
        [this.namespace, this.hash(key), observedResetAt],
      );
    } catch (err) {
      warnStoreFailure({ err, namespace: this.namespace }, 'rate-limit re-spend failed');
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await pool.query('DELETE FROM rate_limit_windows WHERE namespace = $1 AND key_hash = $2', [
        this.namespace,
        this.hash(key),
      ]);
    } catch (err) {
      warnStoreFailure({ err, namespace: this.namespace }, 'rate-limit key reset failed');
    }
  }
}

export async function cleanupRateLimitWindows(): Promise<number> {
  return runExclusiveBatchedDelete(
    'janitor:rate-limit-windows',
    `DELETE FROM rate_limit_windows
     WHERE ctid IN (
       SELECT ctid FROM rate_limit_windows
       WHERE reset_at < now() - interval '1 hour'
       LIMIT ${JANITOR_BATCH_SIZE}
     )`,
  );
}
