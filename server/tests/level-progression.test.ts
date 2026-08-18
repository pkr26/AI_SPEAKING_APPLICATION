import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const speakMock = vi.hoisted(() => vi.fn());
const nativeMock = vi.hoisted(() => vi.fn());

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: speakMock, assessNativeComprehension: nativeMock };
});

import { config } from '../src/config';
import { answerForm, app, completeDiagnostic, fakeM4aBuffer, pool, registerUser } from './helpers';

beforeEach(() => {
  speakMock.mockReset();
  nativeMock.mockReset();
});

afterAll(async () => {
  await pool.end();
});

function mockScore(score: number) {
  speakMock.mockResolvedValue({
    transcript: 'a scored answer',
    score,
    passed: score >= 60,
    feedback: `scored ${score}`,
  });
}

interface ObservedQuery {
  text: string;
  values: unknown[] | undefined;
}

async function observeExplicitLeaseQueries<T>(
  action: () => Promise<T>,
): Promise<{ result: T; queries: ObservedQuery[] }> {
  const originalConnect = pool.connect.bind(pool);
  const queries: ObservedQuery[] = [];
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
        if (typeof text === 'string') {
          queries.push({ text, values: Array.isArray(args[0]) ? (args[0] as unknown[]) : undefined });
        }
        return actualQuery.call(client, query, ...args);
      };
      mutable.release = (error?: Error | boolean) => {
        mutable.query = actualQuery;
        mutable.release = actualRelease;
        actualRelease.call(client, error);
      };
      return client;
    });
  }) as typeof pool.connect);

  try {
    return { result: await action(), queries };
  } finally {
    connect.mockRestore();
  }
}

describe('CEFR level progression', () => {
  const a = app();

  async function freshUserAt(level: string) {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query('UPDATE users SET diagnostic_completed = true, cefr_level = $2 WHERE id = $1', [userId, level]);
    return { token, userId };
  }

  async function levelQuestionIds(level: string): Promise<string[]> {
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id', [
      level,
    ]);
    return rows.map(({ id }) => id);
  }

  async function seedMastered(userId: string, questionIds: string[]) {
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count)
       SELECT $1, id, 'mastered', 90, 1 FROM unnest($2::uuid[]) AS q(id)`,
      [userId, questionIds],
    );
  }

  async function userLevel(userId: string): Promise<string | null> {
    const { rows } = await pool.query<{ cefr_level: string | null }>('SELECT cefr_level FROM users WHERE id = $1', [
      userId,
    ]);
    return rows[0].cefr_level;
  }

  const attempt = (token: string, questionId: string) =>
    answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId);

  const fixedAttempt = (token: string, questionId: string, requestId: string) =>
    request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', questionId)
      .field('requestId', requestId);

  it('promotes at exactly ceil(0.85 * totalAtLevel) mastered words, answering from the NEW level', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length); // 85 of the seeded 100
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const target = ids[threshold - 1];

    mockScore(90);
    const r = await attempt(token, target);

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ passed: true, mastered: true, levelUp: { from: 'A1', to: 'A2' } });
    // Both the next question and the progress snapshot come from A2.
    expect(r.body.next.kind).toBe('new');
    expect(r.body.next.question.cefrLevel).toBe('A2');
    const a2Total = (await levelQuestionIds('A2')).length;
    expect(r.body.next.progress).toEqual({
      masteredCount: 0,
      learningCount: 0,
      totalAtLevel: a2Total,
      dueCount: 0,
    });
    expect(await userLevel(userId)).toBe('A2');

    const nextQuestion = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(nextQuestion.body.question.cefrLevel).toBe('A2');
  });

  it('replays the exact threshold-crossing response after that response changes the user level', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const target = ids[threshold - 1];
    const requestId = randomUUID();

    mockScore(90);
    const first = await fixedAttempt(token, target, requestId);
    const replay = await fixedAttempt(token, target, requestId);

    expect(first.status).toBe(200);
    expect(first.body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(speakMock).toHaveBeenCalledOnce();
    const persisted = await pool.query<{ attempts: number; requests: number }>(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND question_id = $2) AS attempts,
         (SELECT count(*)::int FROM assessment_requests WHERE user_id = $1 AND request_id = $3) AS requests`,
      [userId, target, requestId],
    );
    expect(persisted.rows[0]).toEqual({ attempts: 1, requests: 1 });
  });

  it('does not promote one mastery below the threshold', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 2)); // one short after this attempt
    const target = ids[threshold - 1];

    mockScore(90);
    const r = await attempt(token, target);

    expect(r.status).toBe(200);
    expect(r.body.mastered).toBe(true);
    expect(r.body.levelUp).toBeUndefined();
    expect(r.body.next.question.cefrLevel).toBe('A1');
    expect(await userLevel(userId)).toBe('A1');
  });

  it('requires a mastery EVENT: re-passing an already-mastered word never promotes', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    // Already at the threshold — but only a transition into mastered counts.
    await seedMastered(userId, ids.slice(0, threshold));

    mockScore(90);
    const r = await attempt(token, ids[0]);

    expect(r.status).toBe(200);
    expect(r.body.mastered).toBe(true);
    expect(r.body.levelUp).toBeUndefined();
    expect(await userLevel(userId)).toBe('A1');
  });

  it('never promotes from C2; retention just continues', async () => {
    const { token, userId } = await freshUserAt('C2');
    const ids = await levelQuestionIds('C2');
    await seedMastered(userId, ids.slice(0, ids.length - 1));
    const target = ids[ids.length - 1];

    mockScore(90);
    const r = await attempt(token, target);

    expect(r.status).toBe(200);
    expect(r.body.mastered).toBe(true);
    expect(r.body.levelUp).toBeUndefined();
    expect(await userLevel(userId)).toBe('C2');
    // Everything is mastered now: the bank cycles back as retention revision.
    expect(r.body.next.kind).toBe('revision');
    expect(r.body.next.question.cefrLevel).toBe('C2');
    expect(r.body.next.progress.masteredCount).toBe(ids.length);
  });

  it('promotes exactly once under concurrent mastering attempts (locked transaction)', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const [targetA, targetB] = [ids[threshold - 1], ids[threshold]];

    mockScore(90);
    const { result, queries } = await observeExplicitLeaseQueries(() =>
      Promise.all([attempt(token, targetA), attempt(token, targetB)]),
    );
    const [ra, rb] = result;

    expect(ra.status).toBe(200);
    expect(rb.status).toBe(200);
    // The promotion commits exactly once, and the waiter observes that new
    // level from the parent-row lock instead of running a redundant old-level
    // mastery aggregate or a guaranteed-zero guarded UPDATE. Only the attempt
    // whose own mastery crossed the threshold reports levelUp — the waiter's
    // mastered pass keeps its normal outcome shape without the flag.
    expect(ra.body.mastered).toBe(true);
    expect(rb.body.mastered).toBe(true);
    expect([ra.body.levelUp, rb.body.levelUp].filter(Boolean)).toEqual([{ from: 'A1', to: 'A2' }]);
    expect(ra.body.next.question.cefrLevel).toBe('A2');
    expect(rb.body.next.question.cefrLevel).toBe('A2');
    const oldLevelMasterySnapshots = queries.filter(
      ({ text, values }) => text.includes("count(*) FILTER (WHERE pp.status = 'mastered')") && values?.[1] === 'A1',
    );
    expect(oldLevelMasterySnapshots).toHaveLength(1);
    expect(queries.filter(({ text }) => text.startsWith('UPDATE users SET cefr_level = $1'))).toHaveLength(1);
    // The user row was promoted exactly one step, never A1 -> A2 -> B1.
    expect(await userLevel(userId)).toBe('A2');
  });

  it('does not miss the threshold when two different words are mastered concurrently', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 2));
    const [targetA, targetB] = [ids[threshold - 2], ids[threshold - 1]];

    const assessment = {
      transcript: 'a scored answer',
      score: 90,
      passed: true,
      feedback: 'scored 90',
    };
    const release: Array<(value: typeof assessment) => void> = [];
    speakMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release.push(resolve);
          if (release.length === 2) {
            for (const resolveAssessment of release) resolveAssessment(assessment);
          }
        }),
    );

    const [ra, rb] = await Promise.all([attempt(token, targetA), attempt(token, targetB)]);

    expect(ra.status).toBe(200);
    expect(rb.status).toBe(200);
    expect([ra.body.levelUp, rb.body.levelUp]).toContainEqual({ from: 'A1', to: 'A2' });
    expect([ra.body.next.question.cefrLevel, rb.body.next.question.cefrLevel]).toContain('A2');
    expect(await userLevel(userId)).toBe('A2');
    const progress = await pool.query<{ mastered: number }>(
      `SELECT count(*)::int AS mastered
       FROM practice_progress pp
       JOIN questions q ON q.id = pp.question_id
       WHERE pp.user_id = $1 AND q.cefr_level = 'A1' AND pp.status = 'mastered'`,
      [userId],
    );
    expect(progress.rows[0].mastered).toBe(threshold);
  });

  it('answers a non-mastering result from the new level when it waits behind a promotion', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const [promotingQuestion, waitingQuestion] = [ids[threshold - 1], ids[threshold]];

    type Assessment = { transcript: string; score: number; passed: boolean; feedback: string };
    let releasePromoter!: (result: Assessment) => void;
    let releaseWaiter!: (result: Assessment) => void;
    speakMock
      .mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releasePromoter = resolve)))
      .mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releaseWaiter = resolve)));

    const promoterPromise = Promise.resolve(attempt(token, promotingQuestion));
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledTimes(1));
    const waiterPromise = Promise.resolve(attempt(token, waitingQuestion));
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledTimes(2));

    releasePromoter({ transcript: 'mastered', score: 90, passed: true, feedback: 'great' });
    const promoted = await promoterPromise;
    expect(promoted.body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    expect(await userLevel(userId)).toBe('A2');

    releaseWaiter({ transcript: 'passed', score: 65, passed: true, feedback: 'pass' });
    const waited = await waiterPromise;
    expect(waited.status).toBe(200);
    // The rival earned the promotion, not this attempt: no levelUp (the client
    // contract rejects the flag on a non-mastering attempt), while the next
    // question and progress still come from the promoted level.
    expect(waited.body).toMatchObject({ passed: true, mastered: false });
    expect(waited.body.levelUp).toBeUndefined();
    expect(waited.body.attemptsLeft).toBeUndefined();
    expect(waited.body.finalFeedback).toBeUndefined();
    expect(waited.body.next.question.cefrLevel).toBe('A2');
    expect(await userLevel(userId)).toBe('A2');
  });

  it('closes the run instead of arming a doomed retry when a rival promotion lands mid-assessment', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const [promotingQuestion, waitingQuestion] = [ids[threshold - 1], ids[threshold]];

    type Assessment = { transcript: string; score: number; passed: boolean; feedback: string };
    let releasePromoter!: (result: Assessment) => void;
    let releaseWaiter!: (result: Assessment) => void;
    speakMock
      .mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releasePromoter = resolve)))
      .mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releaseWaiter = resolve)));

    const promoterPromise = Promise.resolve(attempt(token, promotingQuestion));
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledTimes(1));
    const waiterPromise = Promise.resolve(attempt(token, waitingQuestion));
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledTimes(2));

    releasePromoter({ transcript: 'mastered', score: 90, passed: true, feedback: 'great' });
    expect((await promoterPromise).body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    releaseWaiter({ transcript: 'missed', score: 45, passed: false, feedback: 'try again' });
    const waited = await waiterPromise;

    expect(waited.status).toBe(200);
    // The answered A1 question is off-level now, so the retry this miss would
    // otherwise advertise could never be scored: the run closes with the final
    // feedback and a next question from A2. levelUp stays off — the client
    // contract rejects a promotion flag this attempt did not earn.
    expect(waited.body).toMatchObject({
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 0,
    });
    expect(waited.body.levelUp).toBeUndefined();
    expect(waited.body.finalFeedback).toContain('final feedback');
    expect(waited.body.next.question.cefrLevel).toBe('A2');
    expect(waited.body.next.progress.totalAtLevel).toBe((await levelQuestionIds('A2')).length);

    // Exactly the retry the old shape invited, and exactly why it had to go.
    const retry = await attempt(token, waitingQuestion);
    expect(retry.status).toBe(403);
    expect(retry.body).toEqual({ error: 'Question is not available at your level', code: 'FORBIDDEN' });
    expect(speakMock).toHaveBeenCalledTimes(2);
  });

  it('rejects an in-flight scored result when diagnostic state was reset before persistence', async () => {
    const { token, userId } = await freshUserAt('A1');
    const [questionId] = await levelQuestionIds('A1');
    type Assessment = { transcript: string; score: number; passed: boolean; feedback: string };
    let releaseAssessment!: (result: Assessment) => void;
    speakMock.mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releaseAssessment = resolve)));

    const attemptPromise = Promise.resolve(attempt(token, questionId));
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());
    await pool.query('UPDATE users SET diagnostic_completed = false, cefr_level = NULL WHERE id = $1', [userId]);
    releaseAssessment({ transcript: 'passed', score: 65, passed: true, feedback: 'pass' });
    const response = await attemptPromise;

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'Assessment state changed; please try again',
      code: 'STATE_CHANGED',
    });
    const persisted = await pool.query<{ attempts: number; progress: number }>(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND question_id = $2) AS attempts,
         (SELECT count(*)::int FROM practice_progress WHERE user_id = $1 AND question_id = $2) AS progress`,
      [userId, questionId],
    );
    expect(persisted.rows[0]).toEqual({ attempts: 0, progress: 0 });
  });

  it('returns the exact state-changed contract when the learner is deleted before persistence', async () => {
    const { token, userId } = await freshUserAt('A1');
    const [questionId] = await levelQuestionIds('A1');
    type Assessment = { transcript: string; score: number; passed: boolean; feedback: string };
    let releaseAssessment!: (result: Assessment) => void;
    speakMock.mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releaseAssessment = resolve)));

    const attemptPromise = Promise.resolve(attempt(token, questionId));
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    releaseAssessment({ transcript: 'passed', score: 65, passed: true, feedback: 'pass' });
    const response = await attemptPromise;

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'Assessment state changed; please try again',
      code: 'STATE_CHANGED',
    });
  });
});

describe('POST /diagnostic/restart', () => {
  const a = app();

  it('rejects a missing or false confirm with the validation contract', async () => {
    // Build this router inside the test so the schema and route wiring are
    // exercised under the active mutation, not only during suite discovery.
    const validationApp = app();
    const { res } = await registerUser(validationApp);
    const token = res.body.token as string;

    const missing = await request(validationApp)
      .post('/diagnostic/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({
      error: 'confirm: must be true to restart the diagnostic',
      code: 'VALIDATION_FAILED',
    });

    const explicit = await request(validationApp)
      .post('/diagnostic/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: false });
    expect(explicit.status).toBe(400);
    expect(explicit.body).toEqual({
      error: 'confirm: must be true to restart the diagnostic',
      code: 'VALIDATION_FAILED',
    });
  });

  it('resets placement, keeps all history, and lets the learner re-take and get re-placed', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    mockScore(90); // pass everything: placed at C2
    const firstLevel = await completeDiagnostic(a, token);
    expect(firstLevel).toBe('C2');
    // Practice once so real history exists.
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(
      (
        await answerForm(
          request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
          q.body.question.id,
        )
      ).status,
    ).toBe(200);
    const before = await pool.query<{ attempts: number; progress: number }>(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS attempts,
         (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress`,
      [userId],
    );
    expect(before.rows[0]).toEqual({ attempts: 4, progress: 1 }); // 3-step pass-walk diagnostic + 1 practice

    const restart = await request(a)
      .post('/diagnostic/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true });
    expect(restart.status).toBe(204);
    expect(restart.headers['cache-control']).toContain('no-store');

    // Placement cleared (valid under users_diagnostic_level_check)...
    const user = await pool.query<{ diagnostic_completed: boolean; cefr_level: string | null }>(
      'SELECT diagnostic_completed, cefr_level FROM users WHERE id = $1',
      [userId],
    );
    expect(user.rows[0]).toEqual({ diagnostic_completed: false, cefr_level: null });
    const state = await pool.query(
      `SELECT low_idx, high_idx, questions_asked, current_question_id,
              processing_question_id, processing_claim_id
       FROM diagnostic_state WHERE user_id = $1`,
      [userId],
    );
    expect(state.rows[0]).toEqual({
      low_idx: 0,
      high_idx: 5,
      questions_asked: 0,
      current_question_id: null,
      processing_question_id: null,
      processing_claim_id: null,
    });
    // ...practice is gated again, but nothing was deleted.
    const gated = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(gated.status).toBe(403);
    expect(gated.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });
    const after = await pool.query<{ attempts: number; progress: number }>(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS attempts,
         (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress`,
      [userId],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);

    // Re-take: failing everything now places the learner at A1.
    mockScore(40);
    const secondLevel = await completeDiagnostic(a, token);
    expect(secondLevel).toBe('A1');
    const rePlaced = await pool.query<{ cefr_level: string; n: number }>(
      `SELECT cefr_level, (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS n
       FROM users WHERE id = $1`,
      [userId],
    );
    expect(rePlaced.rows[0].cefr_level).toBe('A1');
    expect(rePlaced.rows[0].n).toBeGreaterThan(before.rows[0].attempts); // old rows intact + new diagnostic rows
    expect((await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });

  it('is bounded by a per-user budget and rejects over-budget restarts with 429', async () => {
    const savedRateLimit = { ...config.rateLimit };
    config.rateLimit.passwordWindowMs = 60_000;
    config.rateLimit.passwordMax = 1;
    await pool.query('DELETE FROM rate_limit_windows');
    try {
      const scoped = app();
      const { res } = await registerUser(scoped);
      const token = res.body.token as string;

      const first = await request(scoped)
        .post('/diagnostic/restart')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });
      expect(first.status).toBe(204);

      const limited = await request(scoped)
        .post('/diagnostic/restart')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });
      expect(limited.status).toBe(429);
      expect(limited.body).toEqual({ error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' });

      // A different user keeps an independent budget.
      const { res: other } = await registerUser(scoped);
      const otherRestart = await request(scoped)
        .post('/diagnostic/restart')
        .set('Authorization', `Bearer ${other.body.token}`)
        .send({ confirm: true });
      expect(otherRestart.status).toBe(204);
    } finally {
      Object.assign(config.rateLimit, savedRateLimit);
      await pool.query('DELETE FROM rate_limit_windows');
    }
  });
});
