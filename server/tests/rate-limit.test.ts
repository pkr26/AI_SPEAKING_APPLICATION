import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import { config } from '../src/config';
import { AuthedRequest } from '../src/middleware';
import { buildLimiters } from '../src/rate-limit';

const saved = { ...config.rateLimit };

afterEach(() => {
  Object.assign(config.rateLimit, saved);
});

function okApp(...middleware: Parameters<express.Express['use']>) {
  const a = express();
  a.use(...middleware);
  a.get('/x', (_req, res) => res.json({ ok: true }));
  return a;
}

describe('rate limiters', () => {
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

  it('throttles the readiness probe at its built-in budget', async () => {
    const a = okApp(buildLimiters().readiness);
    for (let i = 0; i < 60; i++) {
      expect((await request(a).get('/x')).status).toBe(200);
    }
    const limited = await request(a).get('/x');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: 'Too many requests, please try again later' });
  });
});
