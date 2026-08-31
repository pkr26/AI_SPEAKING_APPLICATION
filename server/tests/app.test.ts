import { randomUUID } from 'crypto';
import { gzipSync } from 'zlib';
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
    expect(res.headers['cache-control']).toBe('no-store');
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

    for (const unsafe of ['contains a space', 'contains/slash', '.starts-with-punctuation']) {
      const rejected = await request(a).get('/health').set('x-request-id', unsafe);
      expect(rejected.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      expect(rejected.headers['x-request-id']).not.toBe(unsafe);
    }
  });

  it('rejects malformed JSON with 400, not 500', async () => {
    const res = await request(a)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ definitely not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body is not valid JSON');
  });

  it('rejects compressed JSON before inflating it', async () => {
    const compressed = gzipSync(Buffer.from(JSON.stringify({ email: 'learner@example.com', password: 'passw0rd1' })));
    const res = await request(createApp())
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send(compressed);

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'Unsupported request body encoding', code: 'VALIDATION_FAILED' });
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
      expect(outcome.result.headers['cache-control']).toBe('no-store');
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
      expect(response.body).toEqual({
        ok: false,
        error: 'required service dependency unavailable',
        code: 'INTERNAL',
      });
      expect(error).toHaveBeenCalledWith({ err: failure }, 'readiness dependency check failed');
    } finally {
      error.mockRestore();
    }
  });

  it('still answers /ready for dependency-ok and dependency-failed checks after the h() wrap', async () => {
    const ok = await request(
      createApp({
        schemaCheck: async () => undefined,
        audioInspectorCheck: async () => undefined,
        recordingStorageCheck: async () => undefined,
      }),
    ).get('/ready');
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ ok: true });
    expect(ok.headers['cache-control']).toBe('no-store');

    const failure = new Error('retained audio storage unavailable');
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const failed = await request(
        createApp({
          schemaCheck: async () => undefined,
          audioInspectorCheck: async () => undefined,
          recordingStorageCheck: async () => {
            throw failure;
          },
        }),
      ).get('/ready');

      expect(failed.status).toBe(503);
      expect(failed.body).toEqual({
        ok: false,
        error: 'required service dependency unavailable',
        code: 'INTERNAL',
      });
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
    const question = await pool.query<{
      id: string;
      cefr_level: string;
      prompt_word: string;
      question_text: string;
    }>('SELECT id, cefr_level, prompt_word, question_text FROM questions LIMIT 1');
    const q = question.rows[0];
    const practiceCycleId = (
      await pool.query<{ id: string }>(
        `INSERT INTO practice_cycles
           (user_id, question_id, kind, attempts_used, status, closed_at)
         VALUES ($1, $2, 'revision', 1, 'closed', now())
         RETURNING id`,
        [first.body.user.id, q.id],
      )
    ).rows[0].id;
    const storedResponse = {
      passed: true,
      mastered: true,
      cycleId: '22222222-2222-4222-8222-222222222222',
      attemptNo: 1,
      attemptsLeft: 0,
      score: 81,
      transcript: 'A complete stored answer.',
      feedback: 'Clear and relevant.',
      next: {
        cycleId: '33333333-3333-4333-8333-333333333333',
        attemptsUsed: 0,
        attemptsLeft: 3,
        question: {
          id: q.id,
          cefrLevel: q.cefr_level,
          promptWord: q.prompt_word,
          questionText: q.question_text,
        },
        kind: 'new',
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at,
          practice_cycle_id)
       VALUES ($1, $2, $3, 'practice', $4, 'completed', $5, now(), $6)`,
      [first.body.user.id, requestId, randomUUID(), q.id, storedResponse, practiceCycleId],
    );

    const completed = await request(a)
      .get(`/assessments/${requestId}`)
      .set('Authorization', `Bearer ${first.body.token}`);
    expect(completed.status).toBe(200);
    expect(completed.headers['cache-control']).toBe('no-store');
    expect(completed.body).toEqual({
      status: 'completed',
      response: storedResponse,
      context: 'practice',
      questionId: q.id,
      cycleId: practiceCycleId,
      question: {
        id: q.id,
        cefrLevel: q.cefr_level,
        promptWord: q.prompt_word,
        questionText: q.question_text,
      },
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

describe('metrics bearer gate', () => {
  // Meets the 32-character config floor.
  const TOKEN = 'metrics-scrape-bearer-token-0123456789abcdef';

  afterEach(() => {
    config.metricsEnabled = false;
    config.metricsBearerToken = '';
  });

  it('stays a plain 404 while metrics are disabled, whatever the bearer', async () => {
    config.metricsEnabled = false;
    config.metricsBearerToken = TOKEN;

    const withBearer = await request(createApp()).get('/metrics').set('Authorization', `Bearer ${TOKEN}`);
    expect(withBearer.status).toBe(404);
    expect(withBearer.body).toEqual({ error: 'Not found', code: 'NOT_FOUND' });

    // The 404 must not confirm or deny that the endpoint exists.
    const withoutBearer = await request(createApp()).get('/metrics');
    expect(withoutBearer.status).toBe(404);
    expect(withoutBearer.body).toEqual({ error: 'Not found', code: 'NOT_FOUND' });
  });

  it('serves metrics without any bearer when no token is configured', async () => {
    config.metricsEnabled = true;
    config.metricsBearerToken = '';

    const res = await request(createApp()).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text.length).toBeGreaterThan(0);
  });

  it('requires exactly the configured bearer when a token is set', async () => {
    config.metricsEnabled = true;
    config.metricsBearerToken = TOKEN;
    const a = createApp();

    const missing = await request(a).get('/metrics');
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({ error: 'Missing or invalid Authorization header', code: 'UNAUTHENTICATED' });

    const wrong = await request(a)
      .get('/metrics')
      .set('Authorization', `Bearer ${'y'.repeat(TOKEN.length)}`);
    expect(wrong.status).toBe(401);
    expect(wrong.body).toEqual({ error: 'Missing or invalid Authorization header', code: 'UNAUTHENTICATED' });

    // Two credentials in one header value must not authenticate either.
    const malformed = await request(a).get('/metrics').set('Authorization', `Bearer ${TOKEN} extra`);
    expect(malformed.status).toBe(401);
    expect(malformed.body).toEqual({ error: 'Missing or invalid Authorization header', code: 'UNAUTHENTICATED' });

    const ok = await request(a).get('/metrics').set('Authorization', `Bearer ${TOKEN}`);
    expect(ok.status).toBe(200);
    expect(ok.headers['cache-control']).toBe('no-store');
    expect(ok.headers['content-type']).toContain('text/plain');
  });
});
