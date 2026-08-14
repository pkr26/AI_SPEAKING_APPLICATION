import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import fs from 'fs/promises';
import { config } from '../src/config';
import { logger } from '../src/logger';
import { answerForm, app, completeDiagnostic, fakeM4aBuffer, pool, registerUser } from './helpers';
import { uploadsDir } from '../src/upload';

afterAll(async () => {
  await pool.end();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('practice', () => {
  const a = app();

  it('GET /question returns 403 before the diagnostic is completed', async () => {
    const { res } = await registerUser(a);
    const r = await request(a).get('/practice/question').set('Authorization', `Bearer ${res.body.token}`);
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('Diagnostic not completed');
  });

  it('does not expose diagnostic answer help before completion', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const help = await request(a)
      .get(`/practice/question/${next.body.question.id}/help`)
      .set('Authorization', `Bearer ${token}`);

    expect(help.status).toBe(403);
    expect(help.body.error).toBe('Diagnostic not completed');
  });

  it('GET /question is no-store once the diagnostic is done', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);
    const r = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
  });

  it('GET /question fails with the exact contract when the learner level has no questions', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const level = await completeDiagnostic(a, token);
    const questions = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1', [level]);
    const movedQuestionIds = questions.rows.map(({ id }) => id);
    const temporaryLevel = level === 'A1' ? 'A2' : 'A1';

    await pool.query('UPDATE questions SET cefr_level = $1 WHERE id = ANY($2::uuid[])', [
      temporaryLevel,
      movedQuestionIds,
    ]);
    try {
      const response = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'No questions available for this level' });
    } finally {
      await pool.query('UPDATE questions SET cefr_level = $1 WHERE id = ANY($2::uuid[])', [level, movedQuestionIds]);
    }
  });

  it('help endpoint: Cache-Control + ETag, 304 on If-None-Match, 400 on bad UUID', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);

    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = q.body.question.id;

    const help = await request(a).get(`/practice/question/${questionId}/help`).set('Authorization', `Bearer ${token}`);
    expect(help.status).toBe(200);
    expect(help.headers['cache-control']).toBe('private, max-age=3600');
    const etag = help.headers['etag'];
    expect(etag).toMatch(/^"[0-9a-f]{64}"$/);
    expect(help.body).toMatchObject({
      promptWord: expect.any(String),
      promptWordNative: expect.any(String),
      questionText: expect.any(String),
      questionTextNative: expect.any(String),
      examples: expect.any(Array),
    });
    expect(help.body.examples).toHaveLength(3);
    for (const example of help.body.examples) {
      expect(example).toEqual({ en: expect.any(String), native: expect.any(String) });
      expect(example.en.length).toBeGreaterThan(0);
      expect(example.native.length).toBeGreaterThan(0);
    }

    const cached = await request(a)
      .get(`/practice/question/${questionId}/help`)
      .set('Authorization', `Bearer ${token}`)
      .set('If-None-Match', etag);
    expect(cached.status).toBe(304);

    const bad = await request(a).get('/practice/question/not-a-uuid/help').set('Authorization', `Bearer ${token}`);
    expect(bad.status).toBe(400);

    const missing = await request(a)
      .get('/practice/question/00000000-0000-0000-0000-000000000000/help')
      .set('Authorization', `Bearer ${token}`);
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Question not found' });
  });

  it('help returns the exact 404 contract when the learner translation is missing', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string; translations: Record<string, unknown> }>(
      'SELECT * FROM questions WHERE cefr_level = $1 LIMIT 1',
      [level],
    );
    const questionId = question.rows[0].id;
    const malformedQuestion = {
      ...question.rows[0],
      translations: { ...question.rows[0].translations },
    };
    delete malformedQuestion.translations.te;
    const originalQuery = pool.query.bind(pool);
    vi.spyOn(pool, 'query').mockImplementation(((...args: unknown[]) => {
      const [text, values] = args;
      if (text === 'SELECT * FROM questions WHERE id = $1' && Array.isArray(values) && values[0] === questionId) {
        return Promise.resolve({ rows: [malformedQuestion] });
      }
      return Reflect.apply(originalQuery, undefined, args);
    }) as typeof pool.query);

    const response = await request(a)
      .get(`/practice/question/${questionId}/help`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Translation not available for this question' });
  });

  it('POST /attempt without audio returns 400', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);
    const requestId = randomUUID();

    const r = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .field('questionId', question.rows[0].id)
      .field('requestId', requestId);
    expect(r.status).toBe(400);
    expect(r.body).toEqual({ error: 'audio file is required' });
    const claims = await pool.query(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('POST /attempt with a malformed UUID returns 400', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);

    const r = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      'not-a-uuid',
    );
    expect(r.status).toBe(400);
  });

  it('cleans uploaded audio when multipart field validation fails', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);
    const before = (await fs.readdir(uploadsDir)).sort();

    const malformed = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      'not-a-uuid',
    );
    expect(malformed.status).toBe(400);
    expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);

    const unsupportedExtension = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
        filename: 'answer.attacker-controlled-extension',
        contentType: 'audio/mp4',
      })
      .field('questionId', 'not-a-uuid');
    expect(unsupportedExtension.status).toBe(415);
    expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);

    const missing = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
        filename: 'answer.m4a',
        contentType: 'audio/mp4',
      });
    expect(missing.status).toBe(400);
    expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);
  });

  it('maps malformed multipart framing to 400 instead of 500', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);
    const before = (await fs.readdir(uploadsDir)).sort();

    const postRaw = (contentType: string, body: string | Buffer) =>
      request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', contentType)
        .send(body);

    // A multipart content type without a boundary parameter.
    const noBoundary = await postRaw('multipart/form-data', 'garbage');
    expect(noBoundary.status).toBe(400);
    expect(noBoundary.body).toEqual({ error: 'Malformed multipart body' });

    // A form that opens a part but never sends the closing boundary.
    const truncated = await postRaw(
      'multipart/form-data; boundary=abc',
      '--abc\r\nContent-Disposition: form-data; name="questionId"\r\n\r\n9f1badb5',
    );
    expect(truncated.status).toBe(400);
    expect(truncated.body).toEqual({ error: 'Malformed multipart body' });

    // A NUL byte inside the file part's filename header.
    const nulFilename = await postRaw(
      'multipart/form-data; boundary=abc',
      Buffer.concat([
        Buffer.from('--abc\r\nContent-Disposition: form-data; name="audio"; filename="a.m4a', 'utf8'),
        Buffer.from([0]),
        Buffer.from('.exe"\r\nContent-Type: audio/mp4\r\n\r\n', 'utf8'),
        fakeM4aBuffer(),
        Buffer.from('\r\n--abc--\r\n', 'utf8'),
      ]),
    );
    expect(nulFilename.status).toBe(400);
    expect(nulFilename.body).toEqual({ error: 'Malformed multipart body' });

    expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);
  });

  it('refunds schema-invalid attempts instead of spending the paid assessment budgets', async () => {
    const savedRateLimit = { ...config.rateLimit };
    const savedIpCap = config.assessIpDailyCap;
    config.rateLimit.assessWindowMs = 60_000;
    config.rateLimit.assessMax = 1;
    config.assessIpDailyCap = 1;
    try {
      const scoped = app();
      const { res } = await registerUser(scoped);
      const token = res.body.token as string;
      const userId = res.body.user.id as string;
      // Force-complete the diagnostic so no paid budget is spent on setup.
      await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [userId]);
      await pool.query('DELETE FROM rate_limit_windows');

      // Schema-invalid submissions are 400s and must not consume either the
      // per-user assess budget or the shared per-IP daily budget. Refunds are
      // applied fire-and-forget on response finish, so each one must settle
      // before the next request for the assertions to stay deterministic.
      const expectRefunded = () =>
        vi.waitFor(async () => {
          const { rows } = await pool.query<{ hits: number }>(
            "SELECT coalesce(sum(hits), 0)::int AS hits FROM rate_limit_windows WHERE namespace IN ('assess:60000:1', 'assess-ip-daily:1')",
          );
          expect(rows[0].hits).toBe(0);
        });
      for (let i = 0; i < 3; i++) {
        const invalid = await answerForm(
          request(scoped).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
          'not-a-uuid',
        );
        expect(invalid.status).toBe(400);
        await expectRefunded();
      }

      // The single paid slot still works, and the next paid attempt is limited.
      const q = await request(scoped).get('/practice/question').set('Authorization', `Bearer ${token}`);
      const valid = await answerForm(
        request(scoped).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        q.body.question.id,
      );
      expect(valid.status).toBe(200);

      const limited = await answerForm(
        request(scoped).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        q.body.question.id,
      );
      expect(limited.status).toBe(429);
    } finally {
      Object.assign(config.rateLimit, savedRateLimit);
      config.assessIpDailyCap = savedIpCap;
    }
  });

  it('rejects help and attempts for questions outside the user CEFR level', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const level = await completeDiagnostic(a, token);
    const other = await pool.query('SELECT id FROM questions WHERE cefr_level != $1 LIMIT 1', [level]);
    const questionId = other.rows[0].id;

    const help = await request(a).get(`/practice/question/${questionId}/help`).set('Authorization', `Bearer ${token}`);
    expect(help.status).toBe(403);
    expect(help.body).toEqual({ error: 'Question is not available at your level' });

    const attempt = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
    );
    expect(attempt.status).toBe(403);
    expect(attempt.body).toEqual({ error: 'Question is not available at your level' });
  });

  it('POST /attempt with a text file renamed .m4a returns 415', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);

    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const r = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', Buffer.from('definitely not audio bytes'), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', q.body.question.id)
      .field('requestId', randomUUID());
    expect(r.status).toBe(415);
    expect(r.body.error).toBe('Invalid audio file');
  });

  it('preserves a live practice claim conflict and abandons the request', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);
    const questionId = question.rows[0].id;
    const existingClaimId = randomUUID();
    const requestId = randomUUID();
    await pool.query('INSERT INTO practice_inflight (user_id, question_id, claim_id) VALUES ($1, $2, $3)', [
      userId,
      questionId,
      existingClaimId,
    ]);

    try {
      const response = await request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
          filename: 'answer.m4a',
          contentType: 'audio/mp4',
        })
        .field('questionId', questionId)
        .field('requestId', requestId);

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'An assessment is already in progress for this question' });
      const requests = await pool.query(
        'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
        [userId, requestId],
      );
      expect(requests.rows[0].count).toBe(0);
      const inflight = await pool.query<{ claim_id: string }>(
        'SELECT claim_id FROM practice_inflight WHERE user_id = $1 AND question_id = $2',
        [userId, questionId],
      );
      expect(inflight.rows).toEqual([{ claim_id: existingClaimId }]);
    } finally {
      await pool.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2', [userId, questionId]);
    }
  });

  it('reclaims an expired practice claim before starting the next assessment', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);
    const questionId = question.rows[0].id;
    await pool.query(
      `INSERT INTO practice_inflight (user_id, question_id, claim_id, started_at)
       VALUES ($1, $2, $3, now() - interval '6 minutes')`,
      [userId, questionId, randomUUID()],
    );

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
    );

    expect(response.status).toBe(200);
    const inflight = await pool.query(
      'SELECT count(*)::int AS count FROM practice_inflight WHERE user_id = $1 AND question_id = $2',
      [userId, questionId],
    );
    expect(inflight.rows[0].count).toBe(0);
  });

  it('logs exact ownership context when best-effort practice-claim cleanup fails', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await completeDiagnostic(a, token);
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
    const cleanupError = new Error('practice cleanup unavailable');
    const originalQuery = pool.query.bind(pool);
    vi.spyOn(pool, 'query').mockImplementation(((...args: unknown[]) => {
      const [text] = args;
      if (typeof text === 'string' && text.includes('DELETE FROM practice_inflight WHERE user_id')) {
        return Promise.reject(cleanupError);
      }
      return Reflect.apply(originalQuery, undefined, args);
    }) as typeof pool.query);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const unlink = vi.spyOn(fs, 'unlink');

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
    );

    expect(response.status).toBe(200);
    // res.json() can finish before the route's async finally blocks settle.
    // Waiting for the last local cleanup step prevents mock restoration and
    // the next test from racing the claim-cleanup warning under inspection.
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledOnce();
      expect(unlink).toHaveBeenCalledOnce();
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      {
        err: cleanupError,
        userId,
        questionId,
        claimId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      },
      'failed to clear practice assessment claim',
    );
  });

  it('does not redundantly abandon an assessment request after successful completion', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    await completeDiagnostic(a, token);
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const query = vi.spyOn(pool, 'query');
    const unlink = vi.spyOn(fs, 'unlink');

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      next.body.question.id as string,
    );

    expect(response.status).toBe(200);
    // Express can finish the response before the async route finally blocks
    // settle. File cleanup runs after request-claim cleanup, so waiting for it
    // makes the negative assertion below deterministic.
    await vi.waitFor(() => expect(unlink).toHaveBeenCalledOnce());
    expect(
      query.mock.calls.filter(
        ([text]) =>
          typeof text === 'string' &&
          text.includes('DELETE FROM assessment_requests') &&
          text.includes("status = 'processing'"),
      ),
    ).toHaveLength(0);
  });

  it('a practice attempt walks attempt numbers and never duplicates them', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);

    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = q.body.question.id;

    // Fire several attempts; mock scores are random, so verify the transition
    // rule each response's own pass/fail implies instead of a fixed walk.
    const seen: { attemptNo: number; passed: boolean }[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(r.status).toBe(200);
      expect(r.body.attemptNo).toBeGreaterThanOrEqual(1);
      expect(r.body.attemptNo).toBeLessThanOrEqual(3);
      seen.push({ attemptNo: r.body.attemptNo, passed: r.body.passed });
      if (i > 0) {
        const prev = seen[i - 1];
        const expected = !prev.passed && prev.attemptNo < 3 ? prev.attemptNo + 1 : 1;
        expect(seen[i].attemptNo).toBe(expected);
      }
    }
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM attempts
       WHERE user_id = (SELECT id FROM users WHERE email = $1) AND question_id = $2 AND context = 'practice'`,
      [res.body.user.email, questionId],
    );
    expect(rows[0].n).toBe(seen.length); // every request inserted exactly one attempt row
    expect(seen[0].attemptNo).toBe(1); // first attempt on a fresh question is always #1
  });

  it('replays the same practice request without another attempt or quota reservation', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    await completeDiagnostic(a, token);
    await pool.query('DELETE FROM assessment_usage WHERE user_id = $1', [userId]);
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const requestId = randomUUID();
    const send = () =>
      request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
          filename: 'answer.m4a',
          contentType: 'audio/mp4',
        })
        .field('questionId', q.body.question.id)
        .field('requestId', requestId);

    const first = await send();
    const replay = await send();
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    const counts = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'practice') AS attempts,
         (SELECT count(*)::int FROM assessment_usage WHERE user_id = $1) AS usage`,
      [userId],
    );
    expect(counts.rows[0]).toEqual({ attempts: 1, usage: 1 });
  });

  it('atomically enforces daily quota across different parallel questions', async () => {
    const previousCap = config.assessDailyCap;
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    const level = await completeDiagnostic(a, token);
    const questions = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 2', [
      level,
    ]);
    await pool.query('DELETE FROM assessment_usage WHERE user_id = $1', [userId]);
    config.assessDailyCap = 1;
    try {
      const replies = await Promise.all(
        questions.rows.map(({ id }) =>
          answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), id),
        ),
      );
      expect(replies.map((r) => r.status).sort()).toEqual([200, 429]);

      const counts = await pool.query<{ attempts: number; usage: number; inflight: number }>(
        `SELECT
           (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'practice') AS attempts,
           (SELECT count(*)::int FROM assessment_usage WHERE user_id = $1) AS usage,
           (SELECT count(*)::int FROM practice_inflight WHERE user_id = $1) AS inflight`,
        [userId],
      );
      expect(counts.rows[0]).toEqual({ attempts: 1, usage: 1, inflight: 0 });
    } finally {
      config.assessDailyCap = previousCap;
    }
  });
});

describe('health', () => {
  const a = app();

  it('GET /health returns 200', async () => {
    const r = await request(a).get('/health');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
  });

  it('GET /ready returns 200 when the DB is up', async () => {
    const r = await request(a).get('/ready');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
  });
});
