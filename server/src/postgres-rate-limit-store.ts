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

  private hash(key: string): string {
    return createHmac('sha256', config.jwtSecret).update(this.namespace).update('\0').update(key).digest('hex');
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    let rows: CounterRow[];
    try {
      ({ rows } = await pool.query<CounterRow>(
        `INSERT INTO rate_limit_windows (namespace, key_hash, hits, reset_at)
       VALUES ($1, $2, 1, clock_timestamp() + ($3::double precision * interval '1 millisecond'))
       ON CONFLICT (namespace, key_hash) DO UPDATE
       SET hits = CASE
             WHEN rate_limit_windows.reset_at <= clock_timestamp() THEN 1
             ELSE LEAST(rate_limit_windows.hits + 1, 2147483647)
           END,
           reset_at = CASE
             WHEN rate_limit_windows.reset_at <= clock_timestamp()
               THEN clock_timestamp() + ($3::double precision * interval '1 millisecond')
             ELSE rate_limit_windows.reset_at
           END
       RETURNING hits::int, reset_at`,
        [this.namespace, this.hash(key), this.windowMs],
      ));
    } catch (err) {
      // Without its counter the limiter cannot admit the request safely, but a
      // database brownout here is backpressure, not an application fault: fail
      // closed as a retryable 503 instead of an unhandled 500.
      logger.warn({ err, namespace: this.namespace }, 'rate-limit increment failed; shedding request');
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

  // The window guard keeps a late refund (response finishing after the window
  // rolled over) from touching the row once it has expired. One accepted
  // residue: a refund landing in the sub-millisecond gap AFTER a new-window
  // increment rolled reset_at forward still passes the guard and takes back
  // one of the new window's hits (bounded ±1 per rollover, self-healing at
  // expiry). Closing that gap would need per-hit window bookkeeping.
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
      logger.warn({ err, namespace: this.namespace }, 'rate-limit refund failed');
    }
  }

  // Conditional re-spend (mirror of the window-guarded decrement): used by the
  // assess abort guard to take back the hit express-rate-limit refunded when
  // the client disconnected after paid capacity was committed. A plain
  // increment would start a FRESH window (hits=1) when the abort lands after
  // the window expired while the library refund was skipped — over-charging
  // the aborting user into the next window. Same fail-safe contract as
  // decrement: callers fire-and-forget, so errors are logged, never thrown.
  async incrementWithinWindow(key: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE rate_limit_windows
         SET hits = LEAST(hits + 1, 2147483647)
         WHERE namespace = $1 AND key_hash = $2 AND reset_at > clock_timestamp()`,
        [this.namespace, this.hash(key)],
      );
    } catch (err) {
      logger.warn({ err, namespace: this.namespace }, 'rate-limit re-spend failed');
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await pool.query('DELETE FROM rate_limit_windows WHERE namespace = $1 AND key_hash = $2', [
        this.namespace,
        this.hash(key),
      ]);
    } catch (err) {
      logger.warn({ err, namespace: this.namespace }, 'rate-limit key reset failed');
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
