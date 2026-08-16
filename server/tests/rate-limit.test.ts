import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'node:events';
import fsSync from 'node:fs';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { ipKeyGenerator } from 'express-rate-limit';
import { createApp } from '../src/app';
import { buildAssessmentSubmissionChain, runAssessmentSubmission } from '../src/assessment-pipeline';
import { config } from '../src/config';
import { JANITOR_BATCH_SIZE } from '../src/janitor';
import { logger } from '../src/logger';
import { shedRequestsTotal } from '../src/metrics';
import { AuthedRequest, errorHandler, HttpError, UserRow, validate } from '../src/middleware';
import { buildLimiters, normalizeLoginEmail, rateLimitIpKey, requestIpRateLimitKey } from '../src/rate-limit';
import { cleanupRateLimitWindows, PostgresRateLimitStore } from '../src/postgres-rate-limit-store';
import { submittedAudioFileIsOwned } from '../src/upload';
import { fakeM4aBuffer, pool } from './helpers';

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

async function shedCounterValue(reason: string): Promise<number> {
  const { values } = await shedRequestsTotal.get();
  return values.find((entry) => entry.labels.reason === reason)?.value ?? 0;
}

describe('rate limiters', () => {
  it('runs the cheap global flood brake before PostgreSQL credential counters', async () => {
    config.rateLimit.globalStore = 'memory';
    config.rateLimit.globalWindowMs = 60_000;
    config.rateLimit.globalMax = 1;
    config.rateLimit.authWindowMs = 60_000;
    config.rateLimit.authMax = 100;
    const a = createApp();

    const first = await request(a).post('/auth/login').send({ email: 'missing@example.com', password: 'wrong123' });
    const second = await request(a).post('/auth/login').send({ email: 'missing@example.com', password: 'wrong123' });

    expect(first.status).toBe(401);
    expect(second.status).toBe(429);
    expect(second.body).toEqual({ error: 'Too many requests, please try again later', code: 'RATE_LIMITED' });
    const { rows } = await pool.query<{ hits: number }>(
      `SELECT coalesce(sum(hits), 0)::int AS hits
       FROM rate_limit_windows
       WHERE namespace = $1`,
      [`auth:${config.rateLimit.authWindowMs}:${config.rateLimit.authMax}`],
    );
    expect(rows[0].hits).toBe(1);
    // Probes are intentionally mounted before the global budget.
    expect((await request(a).get('/health')).status).toBe(200);
  });

  it('normalizes bounded login account identifiers and skips unusable values', () => {
    expect(normalizeLoginEmail('  Learner@Example.COM ')).toBe('learner@example.com');
    expect(normalizeLoginEmail('X'.repeat(254))).toBe('x'.repeat(254));
    expect(normalizeLoginEmail('')).toBeUndefined();
    expect(normalizeLoginEmail(123)).toBeUndefined();
    expect(normalizeLoginEmail('x'.repeat(255))).toBeUndefined();
    expect(rateLimitIpKey('203.0.113.42')).toBe(ipKeyGenerator('203.0.113.42'));
    expect(rateLimitIpKey('2001:db8:abcd:1234::1')).toBe(ipKeyGenerator('2001:db8:abcd:1234::1'));
    expect(rateLimitIpKey(undefined)).toBe(ipKeyGenerator(''));
    expect(requestIpRateLimitKey({ ip: '203.0.113.42' })).toBe(ipKeyGenerator('203.0.113.42'));
    expect(requestIpRateLimitKey({ ip: '2001:db8:abcd:1234::1' })).toBe(ipKeyGenerator('2001:db8:abcd:1234::1'));
    expect(requestIpRateLimitKey({ ip: undefined })).toBe(ipKeyGenerator(''));
  });

  it('skips unusable forgot-password identifiers and isolates each valid normalized email key', async () => {
    config.rateLimit.forgotEmailWindowMs = 60_000;
    config.rateLimit.forgotEmailMax = 1;
    const namespace = 'forgot-email:60000:1';
    const a = express();
    a.use(express.json());
    a.use(buildLimiters().forgotPasswordEmail);
    a.post('/x', (_req, res) => res.json({ throttled: res.locals.forgotEmailThrottled === true }));

    expect((await request(a).post('/x')).body).toEqual({ throttled: false });
    expect((await request(a).post('/x').send({})).body).toEqual({ throttled: false });
    expect((await request(a).post('/x').send({ email: 42 })).body).toEqual({ throttled: false });
    const skipped = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM rate_limit_windows WHERE namespace = $1',
      [namespace],
    );
    expect(skipped.rows[0].count).toBe(0);

    expect((await request(a).post('/x').send({ email: ' First@Example.com ' })).body).toEqual({ throttled: false });
    expect((await request(a).post('/x').send({ email: 'second@example.com' })).body).toEqual({ throttled: false });
    expect((await request(a).post('/x').send({ email: 'first@example.COM' })).body).toEqual({ throttled: true });

    const stored = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM rate_limit_windows WHERE namespace = $1',
      [namespace],
    );
    expect(stored.rows[0].count).toBe(2);
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
    expect(third.body).toEqual({ error: 'Too many requests, please try again later', code: 'RATE_LIMITED' });
    expect(third.headers['ratelimit-remaining']).toBe('0');
  });

  it('shares global counters across independently built app instances in postgres mode', async () => {
    config.rateLimit.globalStore = 'postgres';
    config.rateLimit.globalWindowMs = 60_000;
    config.rateLimit.globalMax = 1;
    const firstReplica = okApp(buildLimiters().global);
    const secondReplica = okApp(buildLimiters().global);

    expect((await request(firstReplica).get('/x')).status).toBe(200);
    expect((await request(secondReplica).get('/x')).status).toBe(429);
  });

  it('keeps the default memory-mode global limiter out of the shared counter table', async () => {
    expect(config.rateLimit.globalStore).toBe('memory');
    config.rateLimit.globalWindowMs = 60_000;
    config.rateLimit.globalMax = 1;
    const firstReplica = okApp(buildLimiters().global);
    const secondReplica = okApp(buildLimiters().global);

    // Each replica enforces its own in-process budget: the shared window is
    // untouched, and a second replica still has its full per-replica budget.
    expect((await request(firstReplica).get('/x')).status).toBe(200);
    expect((await request(secondReplica).get('/x')).status).toBe(200);
    expect((await request(firstReplica).get('/x')).status).toBe(429);

    const { rows } = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM rate_limit_windows WHERE namespace LIKE 'global:%'",
    );
    expect(rows[0].n).toBe(0);
  });

  it('throttles the auth limiter with its own message', async () => {
    config.rateLimit.authWindowMs = 60_000;
    config.rateLimit.authMax = 1;
    const a = okApp(buildLimiters().auth);

    expect((await request(a).get('/x')).status).toBe(200);
    const limited = await request(a).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' });
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
    expect(limited.body).toEqual({
      error: 'Too many accounts created from this network, please try again later',
      code: 'RATE_LIMITED',
    });
  });

  it('throttles diagnostic restarts per user without coupling authenticated learners', async () => {
    config.rateLimit.passwordWindowMs = 60_000;
    config.rateLimit.passwordMax = 1;
    const limiters = buildLimiters();
    const first = userApp('diagnostic-user-1', limiters.diagnosticRestart);
    const second = userApp('diagnostic-user-2', limiters.diagnosticRestart);

    expect((await request(first).get('/x')).status).toBe(200);
    const limited = await request(first).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' });
    expect((await request(second).get('/x')).status).toBe(200);
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
    expect(limited.body).toEqual({ error: 'Assessment rate limit reached, please slow down', code: 'RATE_LIMITED' });

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
      expect(limited.body).toEqual({
        error: 'Daily assessment limit reached for this network',
        code: 'NETWORK_DAILY_LIMIT',
      });

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

  it('keeps the assess hit when a request fails after the capacity reservation committed', async () => {
    config.rateLimit.assessWindowMs = 60_000;
    config.rateLimit.assessMax = 5;
    const a = express();
    a.use((req, _res, next) => {
      (req as AuthedRequest).user = { id: 'assess-keep-user' } as AuthedRequest['user'];
      next();
    });
    a.use(buildLimiters().assess);
    // A provider failure AFTER the daily-capacity reservation committed: paid
    // work was spent, so the usual >=400 refund must be suppressed.
    a.get('/reserved-failure', (_req, res) => {
      res.locals.assessmentCapacityReserved = true;
      res.status(502).json({ error: 'Assessment provider unavailable; please try again', code: 'PROVIDER_FAILED' });
    });

    const decrement = vi.spyOn(PostgresRateLimitStore.prototype, 'decrement');
    try {
      expect((await request(a).get('/reserved-failure')).status).toBe(502);
      // Refunds run fire-and-forget on response finish; give one a chance to
      // fire before asserting it never did.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(decrement).not.toHaveBeenCalled();
      const { rows } = await pool.query<{ hits: number }>(
        "SELECT coalesce(sum(hits), 0)::int AS hits FROM rate_limit_windows WHERE namespace = 'assess:60000:5'",
      );
      expect(rows[0].hits).toBe(1);
    } finally {
      decrement.mockRestore();
    }
  });

  it('sheds a counter-store brownout as 503 with Retry-After through the error handler', async () => {
    config.rateLimit.globalStore = 'postgres';
    config.rateLimit.globalWindowMs = 60_000;
    config.rateLimit.globalMax = 5;
    const a = okApp(buildLimiters().global);
    a.use(errorHandler);
    const failure = new Error('database unavailable');
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(failure as never);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const shedBefore = await shedCounterValue('store_brownout');
    try {
      const res = await request(a).get('/x');
      expect(res.status).toBe(503);
      expect(res.headers['retry-after']).toBe('5');
      expect(res.body).toEqual({
        error: 'Server is busy, please try again shortly',
        code: 'POOL_SATURATED',
        retryAfterSeconds: 5,
      });
      expect(await shedCounterValue('store_brownout')).toBe(shedBefore + 1);
    } finally {
      warn.mockRestore();
      query.mockRestore();
    }
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
      code: 'RATE_LIMITED',
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
    expect(limited.body).toEqual({ error: 'Too many requests, please try again later', code: 'RATE_LIMITED' });
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
      const resp = vi.spyOn(PostgresRateLimitStore.prototype, 'incrementWithinWindow').mockResolvedValue(undefined);
      try {
        const limiters = buildLimiters();
        const req = { ip: '127.0.0.1', user: { id: 'user-1' } } as unknown as AuthedRequest;
        const res = fakeResponse({ assessmentCapacityReserved: true });
        const next = vi.fn();
        limiters.assessAbortGuard(req, res as never, next);
        expect(next).toHaveBeenCalledOnce();
        expect(resp).not.toHaveBeenCalled();

        res.emit('close');
        await vi.waitFor(() => expect(resp).toHaveBeenCalledTimes(2));
        const keys = resp.mock.calls.map(([key]) => key);
        expect(keys).toContain('user:user-1');
        expect(keys).toContain(ipKeyGenerator('127.0.0.1'));
      } finally {
        resp.mockRestore();
      }
    });

    it('leaves the close-path refund alone when no paid work was reserved', async () => {
      const resp = vi.spyOn(PostgresRateLimitStore.prototype, 'incrementWithinWindow').mockResolvedValue(undefined);
      try {
        const limiters = buildLimiters();
        const req = { ip: '127.0.0.1', user: { id: 'user-1' } } as unknown as AuthedRequest;
        const res = fakeResponse({});
        limiters.assessAbortGuard(req, res as never, vi.fn());
        res.emit('close');
        await new Promise((resolve) => setImmediate(resolve));
        expect(resp).not.toHaveBeenCalled();
      } finally {
        resp.mockRestore();
      }
    });

    it('ignores a close that follows a normally finished response', async () => {
      const resp = vi.spyOn(PostgresRateLimitStore.prototype, 'incrementWithinWindow').mockResolvedValue(undefined);
      try {
        const limiters = buildLimiters();
        const req = { ip: '127.0.0.1', user: { id: 'user-1' } } as unknown as AuthedRequest;
        const res = fakeResponse({ assessmentCapacityReserved: true }, true);
        limiters.assessAbortGuard(req, res as never, vi.fn());
        res.emit('close');
        await new Promise((resolve) => setImmediate(resolve));
        expect(resp).not.toHaveBeenCalled();
      } finally {
        resp.mockRestore();
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

  it('conditional re-spend tops up a live window but never opens a fresh one', async () => {
    const store = new PostgresRateLimitStore('store-respend-guard', 60_000);
    await store.increment('learner');

    // Live window: the abort re-spend takes the refunded hit back.
    await store.incrementWithinWindow('learner');
    const live = await pool.query<{ hits: number }>(
      "SELECT hits FROM rate_limit_windows WHERE namespace = 'store-respend-guard'",
    );
    expect(Number(live.rows[0].hits)).toBe(2);

    // Expired window: the library refund was skipped too, so the re-spend is
    // a no-op — a plain increment would instead open a fresh window (hits=1)
    // and over-charge the aborting user into it.
    await pool.query(
      "UPDATE rate_limit_windows SET reset_at = now() - interval '1 second' WHERE namespace = 'store-respend-guard'",
    );
    await store.incrementWithinWindow('learner');
    const { rows } = await pool.query<{ hits: number; reset_at: string }>(
      "SELECT hits, reset_at FROM rate_limit_windows WHERE namespace = 'store-respend-guard'",
    );
    expect(rows).toHaveLength(1);
    expect(Number(rows[0].hits)).toBe(2);
    expect(new Date(rows[0].reset_at).getTime()).toBeLessThan(Date.now());
  });

  it('never lets a re-spend failure escape (abort-guard re-spends fire-and-forget)', async () => {
    const store = new PostgresRateLimitStore('store-respend-fail-safe', 60_000);
    const failure = new Error('database unavailable');
    const query = vi.spyOn(pool, 'query').mockRejectedValue(failure);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      await expect(store.incrementWithinWindow('learner')).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        { err: failure, namespace: 'store-respend-fail-safe' },
        'rate-limit re-spend failed',
      );
    } finally {
      warn.mockRestore();
      query.mockRestore();
    }
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

  it('purges an expired backlog larger than one janitor batch and leaves live windows alone', async () => {
    await pool.query(
      `INSERT INTO rate_limit_windows (namespace, key_hash, hits, reset_at)
       SELECT 'janitor-batch-test', encode(sha256(i::text::bytea), 'hex'), 1, now() - interval '2 hours'
       FROM generate_series(1, $1) AS i`,
      [JANITOR_BATCH_SIZE + 1],
    );
    await pool.query(
      `INSERT INTO rate_limit_windows (namespace, key_hash, hits, reset_at)
       VALUES ('janitor-live-test', encode(sha256('live'::bytea), 'hex'), 1, now() + interval '1 hour')`,
    );

    await expect(cleanupRateLimitWindows()).resolves.toBe(JANITOR_BATCH_SIZE + 1);
    const { rows } = await pool.query<{ namespace: string }>('SELECT namespace FROM rate_limit_windows');
    expect(rows).toEqual([{ namespace: 'janitor-live-test' }]);
  });

  it('skips the janitor tick while another replica holds its advisory lock, then resumes after release', async () => {
    await pool.query(
      `INSERT INTO rate_limit_windows (namespace, key_hash, hits, reset_at)
       VALUES ('janitor-lock-test', encode(sha256('locked'::bytea), 'hex'), 1, now() - interval '2 hours')`,
    );
    const rival = await pool.connect();
    try {
      const locked = await rival.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock(hashtext('janitor:rate-limit-windows')) AS locked",
      );
      expect(locked.rows[0].locked).toBe(true);

      await expect(cleanupRateLimitWindows()).resolves.toBe(0);
      const held = await pool.query("SELECT 1 FROM rate_limit_windows WHERE namespace = 'janitor-lock-test'");
      expect(held.rowCount).toBe(1);

      await rival.query("SELECT pg_advisory_unlock(hashtext('janitor:rate-limit-windows'))");
      await expect(cleanupRateLimitWindows()).resolves.toBe(1);
      // Each tick releases the lock afterwards: an immediate rerun still runs.
      await expect(cleanupRateLimitWindows()).resolves.toBe(0);
    } finally {
      rival.release();
    }
  });
});

describe('assessment reservation after client disconnect', () => {
  // The pipeline's onCapacityReserved hook must re-spend both assessment
  // budget hits when the capacity reservation commits after the response has
  // already closed: express-rate-limit's close handler has refunded them while
  // the abort guard saw no reservation flag, and 'close' never fires twice.

  async function submissionHarness({
    closed = false,
    destroyed = false,
    socketDestroyed = false,
    emitCloseDuringAssessment = false,
  }: {
    closed?: boolean;
    destroyed?: boolean;
    socketDestroyed?: boolean;
    emitCloseDuringAssessment?: boolean;
  }) {
    const limiters = buildLimiters();
    const chain = buildAssessmentSubmissionChain(limiters);
    const respend = vi.fn();
    const { rows: userRows } = await pool.query<UserRow>(
      `INSERT INTO users (name, email, password_hash, native_language)
       VALUES ('Respend Test', $1, 'not-used', 'te') RETURNING *`,
      [`respend_${randomUUID()}@example.com`],
    );
    const user = userRows[0];
    const { rows: questionRows } = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
    const audioPath = path.join(os.tmpdir(), `respend-${process.pid}-${randomUUID()}.m4a`);
    await fs.writeFile(audioPath, fakeM4aBuffer());

    const req = {
      user,
      ip: '127.0.0.1',
      body: { questionId: questionRows[0].id, requestId: randomUUID() },
      file: { path: audioPath },
      socket: { destroyed: socketDestroyed },
    } as unknown as AuthedRequest;
    const res = new EventEmitter() as EventEmitter & {
      locals: Record<string, unknown>;
      writableEnded: boolean;
      closed: boolean;
      destroyed: boolean;
      json: ReturnType<typeof vi.fn>;
    };
    res.locals = {};
    res.writableEnded = false;
    res.closed = closed;
    res.destroyed = destroyed;
    res.json = vi.fn();
    if (emitCloseDuringAssessment) {
      // Model uploadAudio's response-close listener without running multipart
      // parsing in this focused pipeline harness.
      res.once('close', () => {
        if (!submittedAudioFileIsOwned(res as never)) fsSync.unlinkSync(audioPath);
      });
    }

    try {
      // validated() only serves bodies parsed by the validate() middleware.
      await new Promise<void>((resolve, reject) =>
        validate({ body: chain.bodySchema })(req as never, res as never, (err?: unknown) =>
          err ? reject(err) : resolve(),
        ),
      );

      await runAssessmentSubmission<{ claimId: string }, { ok: boolean }>(req, res as never, {
        context: 'practice',
        bodySchema: chain.bodySchema,
        respendAssessmentBudget: respend,
        questionMissingError: () => new HttpError(404, 'Question not found'),
        requireQuestionAtUserLevel: false,
        claimAttempt: async () => ({ claimId: randomUUID() }),
        assess: async (_audioPath, _user, _question, _claim, options) => {
          if (emitCloseDuringAssessment) {
            res.emit('close');
            await expect(fs.stat(audioPath)).resolves.toBeTruthy();
          }
          options.onCapacityReserved?.();
          return { ok: true };
        },
        persist: async () => ({ ok: true }),
        clearClaim: async () => {},
      });
    } finally {
      // The in-flight idempotency claim row cascades away with the user.
      await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
    }
    return { req, res, respend, audioPath };
  }

  it.each([
    ['response closed', { closed: true }],
    ['response destroyed', { destroyed: true }],
    ['request socket destroyed', { socketDestroyed: true }],
  ] as const)('re-spends both hits when capacity commits after the %s', async (_condition, state) => {
    const { req, res, respend } = await submissionHarness(state);
    expect(res.locals.assessmentCapacityReserved).toBe(true);
    expect(respend).toHaveBeenCalledOnce();
    expect(respend).toHaveBeenCalledWith(req);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('does not re-spend when the client is still connected at reservation time', async () => {
    const { res, respend } = await submissionHarness({});
    expect(res.locals.assessmentCapacityReserved).toBe(true);
    expect(respend).not.toHaveBeenCalled();
  });

  it('keeps owned local audio readable after close and removes it when the runner unwinds', async () => {
    const { audioPath } = await submissionHarness({ emitCloseDuringAssessment: true });
    await expect(fs.stat(audioPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
