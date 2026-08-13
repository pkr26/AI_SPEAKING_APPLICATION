import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { config } from '../src/config';
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

function okApp(...middleware: Parameters<express.Express['use']>) {
  const a = express();
  a.use(...middleware);
  a.get('/x', (_req, res) => res.json({ ok: true }));
  return a;
}

function userApp(userId: string, middleware: Parameters<express.Express['use']>[0]) {
  const a = express();
  a.use((req, _res, next) => {
    (req as AuthedRequest).user = { id: userId } as AuthedRequest['user'];
    next();
  });
  a.use(middleware);
  a.get('/x', (_req, res) => res.json({ ok: true }));
  return a;
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

  it('keys the assess limiter per user, not per IP', async () => {
    config.rateLimit.assessWindowMs = 60_000;
    config.rateLimit.assessMax = 1;
    const limiters = buildLimiters();

    const as = (userId?: string) => {
      const a = express();
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

    // A different user (and an unauthenticated, IP-keyed request) still fits.
    expect((await request(as('user-2')).get('/x')).status).toBe(200);
    expect((await request(as()).get('/x')).status).toBe(200);
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
