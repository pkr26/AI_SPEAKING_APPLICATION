import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import fs from 'fs/promises';
import { config } from '../src/config';
import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';
import { uploadsDir } from '../src/upload';

afterAll(async () => {
  await pool.end();
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
    expect(typeof etag).toBe('string');

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
  });

  it('POST /attempt without audio returns 400', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);

    const r = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .field('questionId', 'x');
    expect(r.status).toBe(400);
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

  it('rejects help and attempts for questions outside the user CEFR level', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const level = await completeDiagnostic(a, token);
    const other = await pool.query('SELECT id FROM questions WHERE cefr_level != $1 LIMIT 1', [level]);
    const questionId = other.rows[0].id;

    const help = await request(a).get(`/practice/question/${questionId}/help`).set('Authorization', `Bearer ${token}`);
    expect(help.status).toBe(403);

    const attempt = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
    );
    expect(attempt.status).toBe(403);
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

  it('a practice attempt walks attempt numbers and never duplicates them', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);

    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = q.body.question.id;

    // Fire several attempts; mock scores are random, so just verify invariants.
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(r.status).toBe(200);
      expect(r.body.attemptNo).toBeGreaterThanOrEqual(1);
      expect(r.body.attemptNo).toBeLessThanOrEqual(3);
      seen.push(r.body.attemptNo);
    }
    const { rows } = await pool.query(
      `SELECT count(*)::int AS n FROM attempts
       WHERE user_id = (SELECT id FROM users WHERE email = $1) AND question_id = $2 AND context = 'practice'`,
      [res.body.user.email, questionId],
    );
    expect(rows[0].n).toBe(seen.length); // every request inserted exactly one attempt row
    expect(seen[0]).toBe(1); // first attempt on a fresh question is always #1
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
