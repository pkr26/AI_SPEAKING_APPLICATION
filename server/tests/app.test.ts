import { randomUUID } from 'crypto';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { logger } from '../src/logger';
import { pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('CORS allowlist', () => {
  const ALLOWED = 'https://allowed.example';
  const savedOrigins = [...config.corsOrigins];

  afterEach(() => {
    config.corsOrigins.splice(0, config.corsOrigins.length, ...savedOrigins);
  });

  it('reflects allowlisted origins and omits the header for everything else', async () => {
    config.corsOrigins.splice(0, config.corsOrigins.length, ALLOWED);
    const a = createApp();

    const allowed = await request(a).get('/health').set('Origin', ALLOWED);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(ALLOWED);

    const disallowed = await request(a).get('/health').set('Origin', 'https://evil.example');
    expect(disallowed.status).toBe(200); // not blocked — just no CORS grant
    expect(disallowed.headers['access-control-allow-origin']).toBeUndefined();

    // Non-browser clients (mobile apps, curl) send no Origin and pass through.
    const noOrigin = await request(a).get('/health');
    expect(noOrigin.status).toBe(200);
    expect(noOrigin.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers preflights only for allowlisted origins and never allows credentials', async () => {
    config.corsOrigins.splice(0, config.corsOrigins.length, ALLOWED);
    const a = createApp();

    const preflight = await request(a)
      .options('/auth/login')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'POST');
    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(ALLOWED);
    expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();

    const badPreflight = await request(a)
      .options('/auth/login')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(badPreflight.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('app wiring', () => {
  const a = createApp();

  it('uses only the configured proxy hop count', () => {
    expect(a.get('trust proxy')).toBe(config.trustProxy);
  });

  it('sets security headers via helmet', async () => {
    const res = await request(a).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(a).get('/no-such-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found', code: 'NOT_FOUND' });
  });

  it('echoes an inbound x-request-id and generates one otherwise', async () => {
    const inbound = await request(a).get('/health').set('x-request-id', 'req-from-client');
    expect(inbound.headers['x-request-id']).toBe('req-from-client');

    const generated = await request(a).get('/health');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const empty = await request(a).get('/health').set('x-request-id', '');
    expect(empty.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(empty.headers['x-request-id']).not.toBe('');

    const tooLong = await request(a).get('/health').set('x-request-id', 'x'.repeat(200));
    expect(tooLong.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(tooLong.headers['x-request-id']).not.toBe('x'.repeat(200));

    const exactBoundary = 'r'.repeat(128);
    const acceptedBoundary = await request(a).get('/health').set('x-request-id', exactBoundary);
    expect(acceptedBoundary.headers['x-request-id']).toBe(exactBoundary);

    const firstRejected = 'r'.repeat(129);
    const rejectedBoundary = await request(a).get('/health').set('x-request-id', firstRejected);
    expect(rejectedBoundary.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(rejectedBoundary.headers['x-request-id']).not.toBe(firstRejected);
  });

  it('rejects malformed JSON with 400, not 500', async () => {
    const res = await request(a)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ definitely not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body is not valid JSON');
  });

  it('checks schema and media readiness concurrently and reports success only after both resolve', async () => {
    let resolveSchema: (() => void) | undefined;
    let resolveInspector: (() => void) | undefined;
    const schemaCheck = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSchema = resolve;
        }),
    );
    const audioInspectorCheck = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveInspector = resolve;
        }),
    );
    const readinessRequest = request(createApp({ schemaCheck, audioInspectorCheck })).get('/ready');
    let responseSettled = false;
    const response = readinessRequest.then(
      (result) => {
        responseSettled = true;
        return { status: 'fulfilled' as const, result };
      },
      (reason: unknown) => {
        responseSettled = true;
        return { status: 'rejected' as const, reason };
      },
    );

    try {
      await vi.waitFor(() => {
        expect(schemaCheck).toHaveBeenCalledOnce();
        expect(audioInspectorCheck).toHaveBeenCalledOnce();
      });
      resolveSchema?.();
      let settled = false;
      void response.then(() => {
        settled = true;
      });
      await new Promise((resolve) => setImmediate(resolve));
      expect(settled).toBe(false);
      resolveInspector?.();
      const outcome = await response;
      if (outcome.status === 'rejected') throw outcome.reason;
      expect(outcome.result.status).toBe(200);
      expect(outcome.result.body).toEqual({ ok: true });
    } finally {
      resolveSchema?.();
      resolveInspector?.();
      if (!responseSettled) readinessRequest.abort();
      await response;
    }
  });

  it('logs exact dependency context when readiness fails', async () => {
    const failure = new Error('database schema is unavailable');
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    try {
      const response = await request(
        createApp({
          schemaCheck: async () => {
            throw failure;
          },
          audioInspectorCheck: async () => undefined,
        }),
      ).get('/ready');

      expect(response.status).toBe(503);
      expect(error).toHaveBeenCalledWith({ err: failure }, 'readiness dependency check failed');
    } finally {
      error.mockRestore();
    }
  });

  it('returns only the authenticated learner assessment status and disables caching', async () => {
    const a = createApp();
    const { res: first } = await registerUser(a);
    const { res: second } = await registerUser(a);
    const requestId = randomUUID();
    const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at)
       VALUES ($1, $2, $3, 'practice', $4, 'completed', $5, now())`,
      [first.body.user.id, requestId, randomUUID(), question.rows[0].id, { score: 81 }],
    );

    const completed = await request(a)
      .get(`/assessments/${requestId}`)
      .set('Authorization', `Bearer ${first.body.token}`);
    expect(completed.status).toBe(200);
    expect(completed.headers['cache-control']).toBe('no-store');
    expect(completed.body).toEqual({
      status: 'completed',
      response: { score: 81 },
      context: 'practice',
      questionId: question.rows[0].id,
    });

    const otherUser = await request(a)
      .get(`/assessments/${requestId}`)
      .set('Authorization', `Bearer ${second.body.token}`);
    expect(otherUser.status).toBe(404);
    expect(otherUser.body).toEqual({ error: 'Assessment request not found', code: 'NOT_FOUND' });

    const malformed = await request(a)
      .get('/assessments/not-a-uuid')
      .set('Authorization', `Bearer ${first.body.token}`);
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toContain('requestId must be a valid UUID');
  });
});
