import { afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import fs from 'fs/promises';
import type { PoolClient } from 'pg';
import { config } from '../src/config';
import { answerForm, app, completeDiagnostic, fakeM4aBuffer, pool, registerUser } from './helpers';
import { uploadsDir } from '../src/upload';

afterAll(async () => {
  await pool.end();
});

/**
 * Wrap every explicit pool lease for the duration of one action, recording
 * each leased client's query texts as their own segment (the segment ends
 * when the lease is released). Mirrors level-progression's
 * observeExplicitLeaseQueries, segmented per lease so a write transaction can
 * be asserted from its BEGIN through its final statement.
 */
async function observeLeaseQueries<T>(action: () => PromiseLike<T>): Promise<{ result: T; leases: string[][] }> {
  const originalConnect = pool.connect.bind(pool);
  const leases: string[][] = [];
  let current: string[] | null = null;
  const connect = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
    if (typeof callback === 'function') return originalConnect(callback as never);
    return originalConnect().then((client: PoolClient) => {
      const mutable = client as unknown as {
        query: (...args: unknown[]) => unknown;
        release: (error?: Error | boolean) => void;
      };
      const actualQuery = mutable.query;
      const actualRelease = mutable.release;
      mutable.query = (query: unknown, ...args: unknown[]) => {
        const text = typeof query === 'string' ? query : (query as { text?: unknown } | null)?.text;
        if (typeof text === 'string' && current) current.push(text);
        return actualQuery.call(client, query, ...args);
      };
      mutable.release = (error?: Error | boolean) => {
        mutable.query = actualQuery;
        mutable.release = actualRelease;
        if (current) leases.push(current);
        current = null;
        actualRelease.call(client, error);
      };
      current = [];
      return client;
    });
  }) as typeof pool.connect);

  try {
    return { result: await action(), leases };
  } finally {
    connect.mockRestore();
  }
}

const lastQuery = (texts: string[]) => texts[texts.length - 1];

describe('diagnostic', () => {
  const a = app();

  it('finishes the placement at the three-question bound while the window stays open', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(first.body.question.cefrLevel).toBe('B1');

    // B1 pass -> [3,5] (C1), C1 pass -> [5,5] (C2), C2 fail -> [3,4]: the
    // window is still open after the third answer, so only the attemptNo
    // bound can complete the run (duplicating the equivalent scenario in
    // diagnostic-silence-and-resume.test.ts, whose per-test coverage
    // attribution has proven unreliable under Stryker). This file drives the
    // real mock-AI scorer, so the score sequence is pinned through the
    // Math.random seed the scorer reads.
    const random = vi.spyOn(Math, 'random');
    try {
      random.mockReturnValue(0.9); // mock score 90: pass B1
      const firstAnswer = await answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        first.body.question.id,
      );
      expect(firstAnswer.status, JSON.stringify(firstAnswer.body)).toBe(200);
      expect(firstAnswer.body.done).toBe(false);
      expect(firstAnswer.body.nextQuestion.cefrLevel).toBe('C1');

      random.mockReturnValue(0.9); // mock score 90: pass C1
      const secondAnswer = await answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        firstAnswer.body.nextQuestion.id,
      );
      expect(secondAnswer.status).toBe(200);
      expect(secondAnswer.body.done).toBe(false);
      expect(secondAnswer.body.nextQuestion.cefrLevel).toBe('C2');

      random.mockReturnValue(0); // mock score 40: fail C2, window stays [3,4]
      const thirdAnswer = await answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        secondAnswer.body.nextQuestion.id,
      );
      expect(thirdAnswer.status).toBe(200);
      expect(thirdAnswer.body.done).toBe(true);
      expect(thirdAnswer.body.level).toBe('C1');
      expect(thirdAnswer.body.nextQuestion).toBeUndefined();
    } finally {
      random.mockRestore();
    }
  });

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

  it('recreates first-use state atomically and reports exact initial progress', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query('DELETE FROM diagnostic_state WHERE user_id = $1', [userId]);

    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    expect(next.status).toBe(200);
    expect(next.body).toMatchObject({
      done: false,
      progress: { asked: 0, maxQuestions: 3 },
      question: { id: expect.any(String), cefrLevel: 'B1' },
    });
    const state = await pool.query(
      `SELECT low_idx, high_idx, questions_asked, current_question_id
       FROM diagnostic_state WHERE user_id = $1`,
      [userId],
    );
    expect(state.rows).toEqual([
      { low_idx: 0, high_idx: 5, questions_asked: 0, current_question_id: next.body.question.id },
    ]);
  });

  it('GET /next reuses the outstanding question instead of rerolling it', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id as string;

    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const before = await pool.query<{ xmin: string }>(
      'SELECT xmin::text AS xmin FROM diagnostic_state WHERE user_id = $1',
      [userId],
    );
    const second = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const after = await pool.query<{ xmin: string }>(
      'SELECT xmin::text AS xmin FROM diagnostic_state WHERE user_id = $1',
      [userId],
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.question.id).toBe(first.body.question.id);
    expect(second.body.progress).toEqual(first.body.progress);
    expect(after.rows[0].xmin).toBe(before.rows[0].xmin);
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
    expect(r.body).toEqual({ error: 'Question mismatch', code: 'QUESTION_MISMATCH' });
  });

  it('POST /answer with an unknown but valid question UUID returns 409, not 500', async () => {
    const { res } = await registerUser(a);
    const reply = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${res.body.token}`),
      '00000000-0000-0000-0000-000000000000',
    );
    expect(reply.status).toBe(409);
    expect(reply.body).toEqual({ error: 'Question mismatch', code: 'QUESTION_MISMATCH' });
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
        .attach('audio', fakeM4aBuffer(), {
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

  it('burns a completed request tombstone and rejects both status and POST replay after restart', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
    const requestId = randomUUID();
    const first = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      questionId,
      requestId,
    );
    expect(first.status).toBe(200);
    const runBefore = await pool.query<{ diagnostic_run_id: string }>(
      'SELECT diagnostic_run_id FROM diagnostic_state WHERE user_id = $1',
      [userId],
    );

    const restarted = await request(a)
      .post('/diagnostic/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true });
    expect(restarted.status).toBe(204);
    const runAfter = await pool.query<{ diagnostic_run_id: string }>(
      'SELECT diagnostic_run_id FROM diagnostic_state WHERE user_id = $1',
      [userId],
    );
    expect(runAfter.rows[0].diagnostic_run_id).not.toBe(runBefore.rows[0].diagnostic_run_id);

    const retiredError = {
      error: 'This diagnostic answer belongs to a restarted placement; record a new answer',
      code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
    };
    const oldStatus = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${token}`);
    expect(oldStatus.status).toBe(409);
    expect(oldStatus.body).toEqual(retiredError);

    const oldReplay = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      questionId,
      requestId,
    );
    expect(oldReplay.status).toBe(409);
    expect(oldReplay.body).toEqual(retiredError);
    const tombstone = await pool.query<{
      status: string;
      response_version: number;
      diagnostic_run_id: string;
      attempts: number;
      usage: number;
    }>(
      `SELECT request.status, request.response_version, request.diagnostic_run_id,
              (SELECT count(*)::int FROM attempts
               WHERE user_id = $1 AND context = 'diagnostic') AS attempts,
              (SELECT count(*)::int FROM assessment_usage WHERE user_id = $1) AS usage
       FROM assessment_requests AS request
       WHERE request.user_id = $1 AND request.request_id = $2`,
      [userId, requestId],
    );
    expect(tombstone.rows).toEqual([
      {
        status: 'completed',
        response_version: 1,
        diagnostic_run_id: runBefore.rows[0].diagnostic_run_id,
        attempts: 1,
        usage: 1,
      },
    ]);
  });

  it('converts a processing request into a non-replayable 48-hour tombstone on restart', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
    const requestId = randomUUID();
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status)
       VALUES ($1, $2, $3, 'diagnostic', $4, 'processing')`,
      [userId, requestId, randomUUID(), questionId],
    );

    const restarted = await request(a)
      .post('/diagnostic/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true });
    expect(restarted.status).toBe(204);
    const row = await pool.query<{
      status: string;
      response_version: number;
      response_body: Record<string, unknown>;
      completed_at: string | null;
    }>(
      `SELECT status, response_version, response_body, completed_at
       FROM assessment_requests WHERE user_id = $1 AND request_id = $2`,
      [userId, requestId],
    );
    expect(row.rows).toEqual([
      {
        status: 'completed',
        response_version: 1,
        response_body: {},
        completed_at: expect.any(Date),
      },
    ]);

    const status = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(409);
    expect(status.body.code).toBe('ASSESSMENT_RESULT_INCOMPATIBLE');
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

  it('POST /answer with valid identifiers but no audio returns 400 and abandons its request claim', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const requestId = randomUUID();

    const response = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .field('questionId', next.body.question.id)
      .field('requestId', requestId);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'audio file is required', code: 'VALIDATION_FAILED' });
    const claims = await pool.query(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('rejects an already-completed diagnostic before the audio gate and abandons its request claim', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [userId]);
    const requestId = randomUUID();

    // No audio attached: the completed-diagnostic rejection must win over the
    // missing-audio 400, and the request UUID claimed on entry must be
    // abandoned so a future retake can reuse it.
    const response = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .field('questionId', next.body.question.id)
      .field('requestId', requestId);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Diagnostic already completed', code: 'DIAGNOSTIC_DONE' });
    const claims = await pool.query(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('requires the audio file before the durable claim rejects a wrong-question submission', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const { rows } = await pool.query('SELECT id FROM questions WHERE id != $1 LIMIT 1', [next.body.question.id]);

    // A known-but-unserved question without audio: the audio gate answers
    // first (400), because the question-mismatch 409 belongs to the durable
    // claim taken only after the audio checks pass.
    const response = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .field('questionId', rows[0].id)
      .field('requestId', randomUUID());

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'audio file is required', code: 'VALIDATION_FAILED' });
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
      .attach('audio', fakeM4aBuffer(), {
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

  it('ends its question-assignment and answer-finalization transactions with an explicit COMMIT', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;

    const { result: served, leases: nextLeases } = await observeLeaseQueries(() =>
      request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`),
    );
    expect(served.status).toBe(200);
    expect(served.body.done).toBe(false);
    const assignment = nextLeases.find((texts) =>
      texts.some((text) => text.includes('UPDATE diagnostic_state SET current_question_id')),
    );
    expect(assignment).toBeDefined();
    expect(assignment).toContain('BEGIN');
    expect(lastQuery(assignment!)).toBe('COMMIT');

    const { result: answered, leases: answerLeases } = await observeLeaseQueries(() =>
      answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        served.body.question.id,
      ),
    );
    expect(answered.status).toBe(200);
    // MOCK_AI always returns speech, so this pins the scored finalize path.
    expect(answered.body.transcript).toBe('(mock transcript)');
    const finalize = answerLeases.find((texts) => texts.some((text) => text.includes('INSERT INTO attempts')));
    expect(finalize).toBeDefined();
    expect(finalize).toContain('BEGIN');
    expect(lastQuery(finalize!)).toBe('COMMIT');
  });
});
