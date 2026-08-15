import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import express from 'express';
import request from 'supertest';
import { ipKeyGenerator } from 'express-rate-limit';
import { config } from '../src/config';
import { logger } from '../src/logger';
import { AuthedRequest } from '../src/middleware';
import { buildLimiters, normalizeLoginEmail } from '../src/rate-limit';
import { cleanupRateLimitWindows, PostgresRateLimitStore } from '../src/postgres-rate-limit-store';
import { pool } from './helpers';

const saved = { ...config.rateLimit };

beforeEach(async () => {
  await pool.query('DELETE FROM rate_limit_windows');
});

afterEach(async () => {
  Object.assign(config.rateLimit, saved);
  await pool.query('DELETE FROM rate_limit_windows');
});

afterAll(async () => {
  await pool.end();
});

function okApp(...middleware: express.RequestHandler[]) {
  const a = express();
  a.use(...middleware);
  a.get('/x', (_req, res) => res.json({ ok: true }));
  return a;
}

function userApp(userId: string, middleware: express.RequestHandler) {
  const a = express();
  a.use((req, _res, next) => {
    (req as AuthedRequest).user = { id: userId } as AuthedRequest['user'];
    next();
  });
  a.use(middleware);
  a.get('/x', (_req, res) => res.json({ ok: true }));
  a.get('/rejected', (_req, res) => res.status(400).json({ error: 'invalid request' }));
  return a;
}

/** Wait until fire-and-forget failure refunds have settled for one namespace. */
async function expectRefunded(namespace: string) {
  await vi.waitFor(async () => {
    const { rows } = await pool.query<{ hits: number }>(
      'SELECT coalesce(sum(hits), 0)::int AS hits FROM rate_limit_windows WHERE namespace = $1',
      [namespace],
    );
    expect(rows[0].hits).toBe(0);
  });
}

describe('rate limiters', () => {
  it('normalizes bounded login account identifiers and skips unusable values', () => {
    expect(normalizeLoginEmail('  Learner@Example.COM ')).toBe('learner@example.com');
    expect(normalizeLoginEmail('X'.repeat(254))).toBe('x'.repeat(254));
    expect(normalizeLoginEmail('')).toBeUndefined();
    expect(normalizeLoginEmail(123)).toBeUndefined();
    expect(normalizeLoginEmail('x'.repeat(255))).toBeUndefined();
  });

  it('throttles the global limiter with the shared message and standard headers', async () => {
    config.rateLimit.globalWindowMs = 60_000;
    config.rateLimit.globalMax = 2;
    const a = okApp(buildLimiters().global);

    expect((await request(a).get('/x')).status).toBe(200);
    const second = await request(a).get('/x');
    expect(second.status).toBe(200);
    expect(second.headers['ratelimit-limit']).toBe('2');
    expect(second.headers['x-ratelimit-limit']).toBeUndefined(); // legacyHeaders off

    const third = await request(a).get('/x');
    expect(third.status).toBe(429);
    expect(third.body).toEqual({ error: 'Too many requests, please try again later' });
    expect(third.headers['ratelimit-remaining']).toBe('0');
  });

  it('shares counters across independently built app instances', async () => {
    config.rateLimit.globalWindowMs = 60_000;
    config.rateLimit.globalMax = 1;
    const firstReplica = okApp(buildLimiters().global);
    const secondReplica = okApp(buildLimiters().global);

    expect((await request(firstReplica).get('/x')).status).toBe(200);
    expect((await request(secondReplica).get('/x')).status).toBe(429);
  });

  it('throttles the auth limiter with its own message', async () => {
    config.rateLimit.authWindowMs = 60_000;
    config.rateLimit.authMax = 1;
    const a = okApp(buildLimiters().auth);

    expect((await request(a).get('/x')).status).toBe(200);
    const limited = await request(a).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many attempts, please try again later' });
  });

  it('keeps the defensive password-account fallback isolated by source IP', async () => {
    config.rateLimit.passwordWindowMs = 60_000;
    config.rateLimit.passwordMax = 1;

    const a = express();
    a.set('trust proxy', 1);
    a.use(buildLimiters().passwordAccount);
    a.get('/x', (_req, res) => {
      const throttled = res.locals.passwordAccountThrottled === true;
      res.status(throttled ? 429 : 401).json({ throttled });
    });

    const firstIp = () => request(a).get('/x').set('X-Forwarded-For', '203.0.113.11');
    expect((await firstIp()).status).toBe(401);
    expect((await firstIp()).status).toBe(429);

    // This limiter is mounted after authentication in production, but its
    // documented fallback must still avoid coupling distinct IPs if a future
    // route is mounted in the wrong order.
    const otherIp = await request(a).get('/x').set('X-Forwarded-For', '203.0.113.12');
    expect(otherIp.status).toBe(401);
    expect(otherIp.body).toEqual({ throttled: false });
  });

  it('throttles registration per source IP with its own budget', async () => {
    config.rateLimit.registerWindowMs = 60_000;
    config.rateLimit.registerMax = 2;
    const a = okApp(buildLimiters().register);

    expect((await request(a).get('/x')).status).toBe(200);
    expect((await request(a).get('/x')).status).toBe(200);
    const limited = await request(a).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many accounts created from this network, please try again later' });
  });

  it('keys the assess limiter per user, not per IP', async () => {
    config.rateLimit.assessWindowMs = 60_000;
    config.rateLimit.assessMax = 1;
    const limiters = buildLimiters();

    const as = (userId?: string) => {
      const a = express();
      a.set('trust proxy', 1);
      a.use((req, _res, next) => {
        if (userId) (req as AuthedRequest).user = { id: userId } as AuthedRequest['user'];
        next();
      });
      a.use(limiters.assess);
      a.get('/x', (_req, res) => res.json({ ok: true }));
      return a;
    };

    expect((await request(as('user-1')).get('/x')).status).toBe(200);
    const limited = await request(as('user-1')).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Assessment rate limit reached, please slow down' });

    // A different user (and unauthenticated requests from distinct source IPs)
    // still fit. The fallback must retain the IP instead of collapsing every
    // unauthenticated request into one shared key.
    expect((await request(as('user-2')).get('/x')).status).toBe(200);
    expect((await request(as()).get('/x').set('X-Forwarded-For', '203.0.113.21')).status).toBe(200);
    expect((await request(as()).get('/x').set('X-Forwarded-For', '203.0.113.22')).status).toBe(200);
  });

  it('bounds paid assessments per source IP across identities', async () => {
    const savedCap = config.assessIpDailyCap;
    config.assessIpDailyCap = 1;
    try {
      // Two different authenticated users behind one test-agent IP share the
      // daily network budget: re-registering cannot reset it.
      const first = userApp('ip-cap-user-1', buildLimiters().assessIpDaily).set('trust proxy', 1);
      const second = userApp('ip-cap-user-2', buildLimiters().assessIpDaily).set('trust proxy', 1);
      const otherNetwork = userApp('ip-cap-user-3', buildLimiters().assessIpDaily).set('trust proxy', 1);

      expect((await request(first).get('/x').set('X-Forwarded-For', '203.0.113.31')).status).toBe(200);
      const limited = await request(second).get('/x').set('X-Forwarded-For', '203.0.113.31');
      expect(limited.status).toBe(429);
      expect(limited.body).toEqual({ error: 'Daily assessment limit reached for this network' });

      // A different network retains its own daily budget. Collapsing all
      // populated IPs to an empty fallback key would incorrectly reject it.
      expect((await request(otherNetwork).get('/x').set('X-Forwarded-For', '203.0.113.32')).status).toBe(200);
    } finally {
      config.assessIpDailyCap = savedCap;
    }
  });

  it('refunds failed requests on the per-user assess budget while successful requests still count', async () => {
    config.rateLimit.assessWindowMs = 60_000;
    config.rateLimit.assessMax = 1;
    const a = userApp('assess-refund-user', buildLimiters().assess);

    // Any number of >=400 rejections never spends the paid budget. Refunds run
    // fire-and-forget on response finish, so each one must settle before the
    // next request for the assertion to stay deterministic.
    for (let i = 0; i < 5; i++) {
      expect((await request(a).get('/rejected')).status).toBe(400);
      await expectRefunded('assess:60000:1');
    }

    // Successful requests still consume the budget exactly as before.
    expect((await request(a).get('/x')).status).toBe(200);
    expect((await request(a).get('/x')).status).toBe(429);
  });

  it("does not let one account's failed requests burn the shared per-IP daily assessment budget", async () => {
    const savedCap = config.assessIpDailyCap;
    config.assessIpDailyCap = 1;
    try {
      const first = userApp('ip-refund-user-1', buildLimiters().assessIpDaily).set('trust proxy', 1);
      const second = userApp('ip-refund-user-2', buildLimiters().assessIpDaily).set('trust proxy', 1);

      for (let i = 0; i < 5; i++) {
        expect((await request(first).get('/rejected').set('X-Forwarded-For', '203.0.113.61')).status).toBe(400);
        await expectRefunded('assess-ip-daily:1');
      }

      // A second account behind the same NAT keeps its full paid budget...
      expect((await request(second).get('/x').set('X-Forwarded-For', '203.0.113.61')).status).toBe(200);
      // ...which a successful request still spends.
      expect((await request(second).get('/x').set('X-Forwarded-For', '203.0.113.61')).status).toBe(429);
    } finally {
      config.assessIpDailyCap = savedCap;
    }
  });

  it('shares upload-grant counters across replicas without consuming the assessment budget', async () => {
    config.rateLimit.uploadGrantWindowMs = 60_000;
    config.rateLimit.uploadGrantMax = 1;
    config.rateLimit.assessWindowMs = 60_000;
    config.rateLimit.assessMax = 1;

    const userId = 'grant-user';
    const firstReplica = userApp(userId, buildLimiters().uploadGrant);
    const secondReplica = userApp(userId, buildLimiters().uploadGrant);

    expect((await request(firstReplica).get('/x')).status).toBe(200);
    const limitedGrant = await request(secondReplica).get('/x');
    expect(limitedGrant.status).toBe(429);
    expect(limitedGrant.body).toEqual({
      error: 'Audio upload grant rate limit reached, please try again later',
    });

    // Authenticated learners behind the same test-agent IP retain independent
    // grant budgets; falling back to IP for either user would throttle this.
    const otherUser = userApp('grant-user-2', buildLimiters().uploadGrant);
    expect((await request(otherUser).get('/x')).status).toBe(200);

    // A grant and a paid assessment use different stable namespaces, so one
    // logical assessment consumes exactly one assessment-limit unit.
    const assessment = userApp(userId, buildLimiters().assess);
    expect((await request(assessment).get('/x')).status).toBe(200);
    expect((await request(assessment).get('/x')).status).toBe(429);
  });

  it('keeps the defensive upload-grant fallback isolated by source IP', async () => {
    config.rateLimit.uploadGrantWindowMs = 60_000;
    config.rateLimit.uploadGrantMax = 1;

    const a = express();
    a.set('trust proxy', 1);
    a.use(buildLimiters().uploadGrant);
    a.get('/x', (_req, res) => res.json({ ok: true }));

    const firstIp = () => request(a).get('/x').set('X-Forwarded-For', '203.0.113.41');
    expect((await firstIp()).status).toBe(200);
    expect((await firstIp()).status).toBe(429);

    // Production authenticates before this limiter, while the fallback keeps
    // a future mis-mounted route from collapsing all clients into one budget.
    expect((await request(a).get('/x').set('X-Forwarded-For', '203.0.113.42')).status).toBe(200);
  });

  it('throttles the readiness probe at its built-in budget', async () => {
    const a = okApp(buildLimiters().readiness);
    for (let i = 0; i < 60; i++) {
      expect((await request(a).get('/x')).status).toBe(200);
    }
    const limited = await request(a).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many requests, please try again later' });
  });

  it('stores only HMACed client identifiers and removes expired rows', async () => {
    const store = new PostgresRateLimitStore('privacy-test', 60_000);
    await store.increment('203.0.113.42');

    const { rows } = await pool.query<{ key_hash: string }>(
      "SELECT key_hash FROM rate_limit_windows WHERE namespace = 'privacy-test'",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].key_hash).not.toContain('203.0.113.42');

    await pool.query("UPDATE rate_limit_windows SET reset_at = now() - interval '2 hours'");
    await expect(cleanupRateLimitWindows()).resolves.toBe(1);
  });

  it('increments, refunds, resets, and renews an expired shared counter', async () => {
    const store = new PostgresRateLimitStore('store-contract', 60_000);

    await expect(store.increment('learner')).resolves.toMatchObject({ totalHits: 1, resetTime: expect.any(Date) });
    await expect(store.increment('learner')).resolves.toMatchObject({ totalHits: 2, resetTime: expect.any(Date) });
    await store.decrement('learner');
    await expect(store.increment('learner')).resolves.toMatchObject({ totalHits: 2, resetTime: expect.any(Date) });

    await pool.query("UPDATE rate_limit_windows SET reset_at = now() - interval '1 second'");
    await expect(store.increment('learner')).resolves.toMatchObject({ totalHits: 1, resetTime: expect.any(Date) });

    await store.resetKey('learner');
    await expect(store.increment('learner')).resolves.toMatchObject({ totalHits: 1, resetTime: expect.any(Date) });
  });

  it('fails closed with a stable diagnostic when an increment returns no counter row', async () => {
    const store = new PostgresRateLimitStore('store-missing-row', 60_000);
    const query = vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] } as never);
    try {
      await expect(store.increment('learner')).rejects.toThrowError('rate limit counter was not returned');
    } finally {
      query.mockRestore();
    }
  });

  it('sheds an increment database failure as retryable 503 backpressure, never a 500', async () => {
    const namespace = 'store-increment-brownout';
    const store = new PostgresRateLimitStore(namespace, 60_000);
    const failure = new Error('timeout exceeded when trying to connect');
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(failure);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      await expect(store.increment('learner')).rejects.toMatchObject({
        status: 503,
        message: 'Server is busy, please try again shortly',
        extra: { retryAfterSeconds: 5 },
      });
      expect(warn).toHaveBeenCalledWith({ err: failure, namespace }, 'rate-limit increment failed; shedding request');
    } finally {
      warn.mockRestore();
      query.mockRestore();
    }
  });

  it('never lets a refund failure escape (express-rate-limit decrements fire-and-forget)', async () => {
    const store = new PostgresRateLimitStore('store-fail-safe', 60_000);
    const query = vi.spyOn(pool, 'query').mockRejectedValue(new Error('database unavailable'));
    try {
      await expect(store.decrement('learner')).resolves.toBeUndefined();
      await expect(store.resetKey('learner')).resolves.toBeUndefined();
    } finally {
      query.mockRestore();
    }
  });

  describe('assessAbortGuard', () => {
    function fakeResponse(locals: Record<string, unknown>, writableEnded = false) {
      const res = new EventEmitter() as EventEmitter & {
        locals: Record<string, unknown>;
        writableEnded: boolean;
      };
      res.locals = locals;
      res.writableEnded = writableEnded;
      return res;
    }

    it('re-spends both assessment counters when a client aborts after the capacity reservation', async () => {
      const increment = vi
        .spyOn(PostgresRateLimitStore.prototype, 'increment')
        .mockResolvedValue({ totalHits: 1, resetTime: new Date() });
      try {
        const limiters = buildLimiters();
        const req = { ip: '127.0.0.1', user: { id: 'user-1' } } as unknown as AuthedRequest;
        const res = fakeResponse({ assessmentCapacityReserved: true });
        const next = vi.fn();
        limiters.assessAbortGuard(req, res as never, next);
        expect(next).toHaveBeenCalledOnce();
        expect(increment).not.toHaveBeenCalled();

        res.emit('close');
        await vi.waitFor(() => expect(increment).toHaveBeenCalledTimes(2));
        const keys = increment.mock.calls.map(([key]) => key);
        expect(keys).toContain('user:user-1');
        expect(keys).toContain(ipKeyGenerator('127.0.0.1'));
      } finally {
        increment.mockRestore();
      }
    });

    it('leaves the close-path refund alone when no paid work was reserved', async () => {
      const increment = vi
        .spyOn(PostgresRateLimitStore.prototype, 'increment')
        .mockResolvedValue({ totalHits: 1, resetTime: new Date() });
      try {
        const limiters = buildLimiters();
        const req = { ip: '127.0.0.1', user: { id: 'user-1' } } as unknown as AuthedRequest;
        const res = fakeResponse({});
        limiters.assessAbortGuard(req, res as never, vi.fn());
        res.emit('close');
        await new Promise((resolve) => setImmediate(resolve));
        expect(increment).not.toHaveBeenCalled();
      } finally {
        increment.mockRestore();
      }
    });

    it('ignores a close that follows a normally finished response', async () => {
      const increment = vi
        .spyOn(PostgresRateLimitStore.prototype, 'increment')
        .mockResolvedValue({ totalHits: 1, resetTime: new Date() });
      try {
        const limiters = buildLimiters();
        const req = { ip: '127.0.0.1', user: { id: 'user-1' } } as unknown as AuthedRequest;
        const res = fakeResponse({ assessmentCapacityReserved: true }, true);
        limiters.assessAbortGuard(req, res as never, vi.fn());
        res.emit('close');
        await new Promise((resolve) => setImmediate(resolve));
        expect(increment).not.toHaveBeenCalled();
      } finally {
        increment.mockRestore();
      }
    });
  });

  it('logs exact diagnostic context when fail-safe store cleanup fails', async () => {
    const namespace = 'store-fail-safe-observability';
    const store = new PostgresRateLimitStore(namespace, 60_000);
    const failure = new Error('database unavailable');
    const query = vi.spyOn(pool, 'query').mockRejectedValue(failure);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      await expect(store.decrement('learner')).resolves.toBeUndefined();
      await expect(store.resetKey('learner')).resolves.toBeUndefined();

      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenNthCalledWith(1, { err: failure, namespace }, 'rate-limit refund failed');
      expect(warn).toHaveBeenNthCalledWith(2, { err: failure, namespace }, 'rate-limit key reset failed');
    } finally {
      warn.mockRestore();
      query.mockRestore();
    }
  });

  it('does not let a late refund eat a hit from an expired window', async () => {
    const store = new PostgresRateLimitStore('store-window-guard', 60_000);
    await store.increment('learner');
    await pool.query(
      "UPDATE rate_limit_windows SET reset_at = now() - interval '1 second' WHERE namespace = 'store-window-guard'",
    );

    // The refund lands after the window expired: it must leave the stale row
    // untouched rather than decrementing a counter the next window inherits.
    await store.decrement('learner');
    const { rows } = await pool.query<{ hits: number }>(
      "SELECT hits FROM rate_limit_windows WHERE namespace = 'store-window-guard'",
    );
    expect(Number(rows[0].hits)).toBe(1);
  });

  it('isolates identical client keys between limiter namespaces', async () => {
    const first = new PostgresRateLimitStore('namespace-one', 60_000);
    const second = new PostgresRateLimitStore('namespace-two', 60_000);

    await first.increment('same-client');
    await second.increment('same-client');
    const { rows } = await pool.query<{ namespace: string; key_hash: string }>(
      `SELECT namespace, key_hash FROM rate_limit_windows
       WHERE namespace IN ('namespace-one', 'namespace-two') ORDER BY namespace`,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].key_hash).not.toBe(rows[1].key_hash);
  });
});
