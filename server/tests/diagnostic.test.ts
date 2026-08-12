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

describe('diagnostic', () => {
  const a = app();

  it('GET /next stores the served question as current_question_id', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;

    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    expect(next.body.done).toBe(false);
    expect(next.headers['cache-control']).toContain('no-store');

    const { rows } = await pool.query('SELECT current_question_id FROM diagnostic_state WHERE user_id = $1', [userId]);
    expect(rows[0].current_question_id).toBe(next.body.question.id);
  });

  it('GET /next reuses the outstanding question instead of rerolling it', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;

    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const second = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.question.id).toBe(first.body.question.id);
    expect(second.body.progress).toEqual(first.body.progress);
  });

  it('POST /answer with a wrong questionId returns 409', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;

    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const servedId = next.body.question.id;

    // A real, existing question — just not the one that was served.
    const { rows } = await pool.query('SELECT id FROM questions WHERE id != $1 LIMIT 1', [servedId]);
    const otherId = rows[0].id;

    const r = await answerForm(request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`), otherId);
    expect(r.status).toBe(409);
    expect(r.body.error).toBe('Question mismatch');
  });

  it('POST /answer with an unknown but valid question UUID returns 409, not 500', async () => {
    const { res } = await registerUser(a);
    const reply = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${res.body.token}`),
      '00000000-0000-0000-0000-000000000000',
    );
    expect(reply.status).toBe(409);
    expect(reply.body.error).toBe('Question mismatch');
  });

  it('serializes parallel answers with one durable claim', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const replies = await Promise.all([
      answerForm(request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`), next.body.question.id),
      answerForm(request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`), next.body.question.id),
    ]);
    expect(replies.map((r) => r.status).sort()).toEqual([200, 409]);

    const saved = await pool.query<{ attempts: number; usage: number; claim: string | null }>(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'diagnostic') AS attempts,
         (SELECT count(*)::int FROM assessment_usage WHERE user_id = $1) AS usage,
         (SELECT processing_claim_id FROM diagnostic_state WHERE user_id = $1) AS claim`,
      [userId],
    );
    expect(saved.rows[0]).toEqual({ attempts: 1, usage: 1, claim: null });
  });

  it('replays the same diagnostic request without another attempt or quota reservation', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const requestId = randomUUID();
    const send = () =>
      request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
          filename: 'answer.m4a',
          contentType: 'audio/mp4',
        })
        .field('questionId', next.body.question.id)
        .field('requestId', requestId);

    const first = await send();
    const replay = await send();
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    const counts = await pool.query(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'diagnostic') AS attempts,
         (SELECT count(*)::int FROM assessment_usage WHERE user_id = $1) AS usage`,
      [userId],
    );
    expect(counts.rows[0]).toEqual({ attempts: 1, usage: 1 });
  });

  it('POST /answer with a malformed UUID returns 400 (not a PG 22P02 500)', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const r = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      'not-a-uuid',
    );
    expect(r.status).toBe(400);
    expect(typeof r.body.error).toBe('string');
  });

  it('cleans uploaded audio when multipart field validation fails', async () => {
    const { res } = await registerUser(a);
    const before = (await fs.readdir(uploadsDir)).sort();

    const malformed = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${res.body.token}`),
      'not-a-uuid',
    );
    expect(malformed.status).toBe(400);
    expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);

    const missing = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${res.body.token}`)
      .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
        filename: 'answer.m4a',
        contentType: 'audio/mp4',
      });
    expect(missing.status).toBe(400);
    expect((await fs.readdir(uploadsDir)).sort()).toEqual(before);
  });

  it('a full diagnostic journey reaches done with a level (MOCK_AI)', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;

    const level = await completeDiagnostic(a, token);
    expect(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).toContain(level);

    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.user.diagnosticCompleted).toBe(true);
    expect(me.body.user.cefrLevel).toBe(level);

    const { rows } = await pool.query('SELECT current_question_id FROM diagnostic_state WHERE user_id = $1', [userId]);
    expect(rows[0].current_question_id).toBeNull();

    const after = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(after.body.done).toBe(true);
    expect(after.body.level).toBe(level);
  });

  it('rejects a text file renamed to .m4a with 415', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const r = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', Buffer.from('this is plain text, not audio'), {
        filename: 'answer.m4a',
        contentType: 'audio/mp4',
      })
      .field('questionId', next.body.question.id)
      .field('requestId', randomUUID());
    expect(r.status).toBe(415);
    expect(r.body.error).toBe('Invalid audio file');
  });

  it('rejects a supported container disguised with a different extension/MIME pair', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const r = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', Buffer.from('4f6767530000000000000000', 'hex'), {
        filename: 'disguised.m4a',
        contentType: 'audio/mp4',
      })
      .field('questionId', next.body.question.id)
      .field('requestId', randomUUID());
    expect(r.status).toBe(415);
    expect(r.body.error).toBe('Invalid audio file');
  });

  it('enforces the daily assessment cap (429 with retryAfterHours)', async () => {
    const prev = config.assessDailyCap;
    config.assessDailyCap = 1;
    try {
      const { res } = await registerUser(a);
      const token = res.body.token;

      // First answer consumes the single allowed slot.
      let next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
      const first = await answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        next.body.question.id,
      );
      expect(first.status).toBe(200);

      if (!first.body.done) {
        next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
        const second = await answerForm(
          request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
          next.body.question.id,
        );
        expect(second.status).toBe(429);
        expect(second.body.error).toBe('Daily assessment limit reached');
        expect(typeof second.body.retryAfterHours).toBe('number');
      }
    } finally {
      config.assessDailyCap = prev;
    }
  });

  it('atomically enforces the cross-account provider budget', async () => {
    const previousGlobalCap = config.assessGlobalDailyCap;
    const previousUserCap = config.assessDailyCap;
    const first = await registerUser(a);
    const second = await registerUser(a);
    const users = [first, second];
    const next = await Promise.all(
      users.map(({ res }) => request(a).get('/diagnostic/next').set('Authorization', `Bearer ${res.body.token}`)),
    );
    await pool.query('DELETE FROM assessment_usage');
    config.assessDailyCap = 10;
    config.assessGlobalDailyCap = 1;
    try {
      const replies = await Promise.all(
        users.map(({ res }, index) =>
          answerForm(
            request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${res.body.token}`),
            next[index].body.question.id,
          ),
        ),
      );
      expect(replies.map((reply) => reply.status).sort()).toEqual([200, 429]);
      expect(replies.find((reply) => reply.status === 429)?.body.error).toBe(
        'Service daily assessment capacity reached',
      );
      expect((await pool.query('SELECT count(*)::int AS n FROM assessment_usage')).rows[0].n).toBe(1);
    } finally {
      config.assessDailyCap = previousUserCap;
      config.assessGlobalDailyCap = previousGlobalCap;
    }
  });
});
