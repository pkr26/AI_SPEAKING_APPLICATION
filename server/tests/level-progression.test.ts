import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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

  async function assignedCycle(token: string, questionId: string): Promise<string> {
    const userId = jwt.decode(token)!.sub as string;
    const active = await pool.query<{ id: string; question_id: string }>(
      "SELECT id, question_id FROM practice_cycles WHERE user_id = $1 AND status = 'active'",
      [userId],
    );
    if (active.rows[0]?.question_id === questionId) return active.rows[0].id;
    if (active.rows[0]) {
      await pool.query(
        `UPDATE practice_cycles SET status = 'closed', closed_at = now(), updated_at = now() WHERE id = $1`,
        [active.rows[0].id],
      );
    }
    const created = await pool.query<{ id: string }>(
      `INSERT INTO practice_cycles (user_id, question_id, kind)
       VALUES ($1, $2, 'revision') RETURNING id`,
      [userId, questionId],
    );
    return created.rows[0].id;
  }

  const attempt = async (token: string, questionId: string) =>
    answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
      undefined,
      await assignedCycle(token, questionId),
    );

  const fixedAttempt = async (token: string, questionId: string, requestId: string, cycleId?: string) =>
    request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', questionId)
      .field('requestId', requestId)
      .field('cycleId', cycleId ?? (await assignedCycle(token, questionId)));

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
    const cycleId = await assignedCycle(token, target);

    mockScore(90);
    const first = await fixedAttempt(token, target, requestId, cycleId);
    const replay = await fixedAttempt(token, target, requestId, cycleId);

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
    const target = ids[threshold - 1];

    mockScore(90);
    const cycleId = await assignedCycle(token, target);
    const send = () =>
      answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        target,
        undefined,
        cycleId,
      );
    const { result, queries } = await observeExplicitLeaseQueries(() => Promise.all([send(), send()]));
    const [ra, rb] = result;

    expect([ra.status, rb.status].sort()).toEqual([200, 409]);
    const winner = ra.status === 200 ? ra : rb;
    const loser = ra.status === 409 ? ra : rb;
    expect(winner.body).toMatchObject({ mastered: true, levelUp: { from: 'A1', to: 'A2' } });
    expect(winner.body.next.question.cefrLevel).toBe('A2');
    expect(['ASSESSMENT_IN_PROGRESS', 'PRACTICE_CYCLE_CLOSED']).toContain(loser.body.code);
    const oldLevelMasterySnapshots = queries.filter(
      ({ text, values }) => text.includes("count(*) FILTER (WHERE pp.status = 'mastered')") && values?.[1] === 'A1',
    );
    expect(oldLevelMasterySnapshots).toHaveLength(1);
    expect(queries.filter(({ text }) => text.startsWith('UPDATE users SET cefr_level = $1'))).toHaveLength(1);
    expect(await userLevel(userId)).toBe('A2');
  });

  it('does not miss the threshold when two different assigned words are mastered sequentially', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 2));
    const [targetA, targetB] = [ids[threshold - 2], ids[threshold - 1]];

    mockScore(90);
    const ra = await attempt(token, targetA);
    const rb = await attempt(token, targetB);

    expect(ra.status).toBe(200);
    expect(rb.status).toBe(200);
    expect(ra.body.levelUp).toBeUndefined();
    expect(rb.body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    expect(rb.body.next.question.cefrLevel).toBe('A2');
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

  it('rejects a different off-cycle question while the assigned promotion is in flight', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const [promotingQuestion, waitingQuestion] = [ids[threshold - 1], ids[threshold]];

    type Assessment = { transcript: string; score: number; passed: boolean; feedback: string };
    let releasePromoter!: (result: Assessment) => void;
    speakMock.mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releasePromoter = resolve)));
    const cycleId = await assignedCycle(token, promotingQuestion);
    const promoterPromise = Promise.resolve(
      answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        promotingQuestion,
        undefined,
        cycleId,
      ),
    );
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledTimes(1));
    const rejected = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      waitingQuestion,
      undefined,
      cycleId,
    );
    expect(rejected.status).toBe(409);
    expect(rejected.body.code).toBe('PRACTICE_CYCLE_CLOSED');
    expect(speakMock).toHaveBeenCalledTimes(1);

    releasePromoter({ transcript: 'mastered', score: 90, passed: true, feedback: 'great' });
    const promoted = await promoterPromise;
    expect(promoted.body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    expect(await userLevel(userId)).toBe('A2');
  });

  it('closes the promoted cycle and rejects concurrent or stale submissions', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const promotingQuestion = ids[threshold - 1];

    type Assessment = { transcript: string; score: number; passed: boolean; feedback: string };
    let releasePromoter!: (result: Assessment) => void;
    speakMock.mockImplementationOnce(() => new Promise<Assessment>((resolve) => (releasePromoter = resolve)));
    const cycleId = await assignedCycle(token, promotingQuestion);
    const send = () =>
      answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        promotingQuestion,
        undefined,
        cycleId,
      );
    const promoterPromise = Promise.resolve(send());
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledTimes(1));
    const concurrent = await send();
    expect(concurrent.status).toBe(409);
    expect(concurrent.body.code).toBe('ASSESSMENT_IN_PROGRESS');

    releasePromoter({ transcript: 'mastered', score: 90, passed: true, feedback: 'great' });
    const promoted = await promoterPromise;
    expect(promoted.body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    const retry = await send();
    expect(retry.status).toBe(403);
    expect(retry.body).toEqual({ error: 'Question is not available at your level', code: 'FORBIDDEN' });
    expect(speakMock).toHaveBeenCalledTimes(1);
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

  it('closes and replaces an active cycle left at a stale level on the next assignment', async () => {
    const { token, userId } = await freshUserAt('A1');
    const first = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    const staleCycleId = first.body.cycleId as string;

    // A diagnostic re-placement between releases can leave the served cycle at
    // the previous level; the next assignment must repair that durably.
    await pool.query("UPDATE users SET cefr_level = 'A2' WHERE id = $1", [userId]);
    const second = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(second.status).toBe(200);
    expect(second.body.cycleId).not.toBe(staleCycleId);
    expect(second.body.question.cefrLevel).toBe('A2');
    const stale = await pool.query<{ status: string }>('SELECT status FROM practice_cycles WHERE id = $1', [
      staleCycleId,
    ]);
    expect(stale.rows[0].status).toBe('closed');
  });

  it('rejects a scored persist whose cycle advanced while the provider ran', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const target = ids[0];
    const cycleId = await assignedCycle(token, target);
    let releaseAssessment!: (result: { transcript: string; score: number; passed: boolean; feedback: string }) => void;
    speakMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    const pending = fixedAttempt(token, target, randomUUID(), cycleId);
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());
    await pool.query('UPDATE practice_cycles SET attempts_used = attempts_used + 1 WHERE id = $1', [cycleId]);
    releaseAssessment({ transcript: 'passed', score: 65, passed: true, feedback: 'pass' });
    const response = await pending;
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });
    const persisted = await pool.query<{ attempts: number }>(
      'SELECT count(*)::int AS attempts FROM attempts WHERE user_id = $1 AND question_id = $2',
      [userId, target],
    );
    expect(persisted.rows[0].attempts).toBe(0);
  });

  it('rejects a silence persist whose cycle closed while the provider ran', async () => {
    const { token } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const target = ids[1];
    const cycleId = await assignedCycle(token, target);
    let releaseAssessment!: (result: { transcript: string; score: number; passed: boolean; feedback: string }) => void;
    speakMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    const pending = fixedAttempt(token, target, randomUUID(), cycleId);
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());
    await pool.query("UPDATE practice_cycles SET status = 'closed', closed_at = now() WHERE id = $1", [cycleId]);
    releaseAssessment({ transcript: '', score: 0, passed: false, feedback: 'silence' });
    const response = await pending;
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });
  });

  it('rejects a native persist whose cycle advanced while the provider ran', async () => {
    const { token } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const target = ids[2];
    const cycleId = await assignedCycle(token, target);
    nativeMock.mockResolvedValue({
      understood: true,
      transcript: 'native answer',
      translatedTranscript: 'translation',
      modelAnswer: 'model answer text',
      feedback: 'good content',
    });
    let releaseAssessment!: (result: {
      understood: boolean;
      transcript: string;
      translatedTranscript: string;
      modelAnswer: string;
      feedback: string;
    }) => void;
    nativeMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    const pending = Promise.resolve(
      request(a)
        .post('/practice/attempt/native')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
        .field('questionId', target)
        .field('requestId', randomUUID())
        .field('cycleId', cycleId),
    );
    await vi.waitFor(() => expect(nativeMock).toHaveBeenCalledOnce());
    await pool.query('UPDATE practice_cycles SET attempts_used = attempts_used + 1 WHERE id = $1', [cycleId]);
    releaseAssessment({
      understood: true,
      transcript: 'native answer',
      translatedTranscript: 'translation',
      modelAnswer: 'model',
      feedback: 'good',
    });
    const response = await pending;
    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });
  });

  it('never attaches levelUp to a mastery that landed after the level already moved', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const target = ids[8];
    const cycleId = await assignedCycle(token, target);
    let releaseAssessment!: (result: { transcript: string; score: number; passed: boolean; feedback: string }) => void;
    speakMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    const pending = fixedAttempt(token, target, randomUUID(), cycleId);
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());
    // A rival promotion moved the learner off A1 while this mastering attempt
    // was in flight: the guard's level-equality arm must keep levelUp off the
    // response even though this attempt itself mastered a word.
    await pool.query("UPDATE users SET cefr_level = 'A2' WHERE id = $1", [userId]);
    releaseAssessment({ transcript: 'mastered', score: 95, passed: true, feedback: 'excellent' });
    const response = await pending;
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ passed: true, mastered: true });
    expect(response.body.levelUp).toBeUndefined();
    expect(response.body.next.question.cefrLevel).toBe('A2');
    expect(await userLevel(userId)).toBe('A2');
  });

  it('closes a stale-level run instead of offering a doomed retry, in both modes', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const englishTarget = ids[3];
    const englishCycle = await assignedCycle(token, englishTarget);
    let releaseEnglish!: (result: { transcript: string; score: number; passed: boolean; feedback: string }) => void;
    speakMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseEnglish = resolve;
        }),
    );
    const englishPending = fixedAttempt(token, englishTarget, randomUUID(), englishCycle);
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());
    await pool.query("UPDATE users SET cefr_level = 'A2' WHERE id = $1", [userId]);
    releaseEnglish({ transcript: 'fail', score: 41, passed: false, feedback: 'fail' });
    const english = await englishPending;
    expect(english.status).toBe(200);
    // A failing first try would normally retry; a stale level must close the
    // run and serve the next question from the learner's CURRENT level, with
    // no levelUp this attempt did not earn.
    expect(english.body.attemptsLeft).toBe(0);
    expect(english.body.levelUp).toBeUndefined();
    expect(english.body.next.question.cefrLevel).toBe('A2');

    const a2Ids = await levelQuestionIds('A2');
    const nativeTarget = a2Ids[0];
    const nativeCycle = await assignedCycle(token, nativeTarget);
    nativeMock.mockResolvedValue({
      understood: true,
      transcript: 'native answer',
      translatedTranscript: 'translation',
      modelAnswer: 'model answer text',
      feedback: 'good content',
    });
    let releaseNative!: (result: {
      understood: boolean;
      transcript: string;
      translatedTranscript: string;
      modelAnswer: string;
      feedback: string;
    }) => void;
    nativeMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseNative = resolve;
        }),
    );
    const nativePending = Promise.resolve(
      request(a)
        .post('/practice/attempt/native')
        .set('Authorization', `Bearer ${token}`)
        .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
        .field('questionId', nativeTarget)
        .field('requestId', randomUUID())
        .field('cycleId', nativeCycle),
    );
    await vi.waitFor(() => expect(nativeMock).toHaveBeenCalledOnce());
    await pool.query("UPDATE users SET cefr_level = 'B1' WHERE id = $1", [userId]);
    releaseNative({
      understood: true,
      transcript: 'native answer',
      translatedTranscript: 'translation',
      modelAnswer: 'model',
      feedback: 'good',
    });
    const native = await nativePending;
    expect(native.status).toBe(200);
    expect(native.body.attemptsLeft).toBe(0);
    expect(native.body.next.question.cefrLevel).toBe('B1');
  });

  it('counts native silence attempts without consuming the shared try budget arithmetic', async () => {
    const { token } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const target = ids[5];
    const cycleId = await assignedCycle(token, target);
    nativeMock.mockResolvedValue({
      understood: true,
      transcript: 'native answer',
      translatedTranscript: 'translation',
      modelAnswer: 'model answer text',
      feedback: 'good content',
    });
    const nativeFirst = await request(a)
      .post('/practice/attempt/native')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', target)
      .field('requestId', randomUUID())
      .field('cycleId', cycleId);
    expect(nativeFirst.status).toBe(200);
    expect(nativeFirst.body.attemptNo).toBe(1);

    nativeMock.mockResolvedValueOnce({
      understood: false,
      transcript: '',
      translatedTranscript: '',
      modelAnswer: '',
      feedback: 'I could not hear enough speech to understand your answer. Please speak clearly and try again.',
    });
    const silence = await request(a)
      .post('/practice/attempt/native')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', target)
      .field('requestId', randomUUID())
      .field('cycleId', cycleId);
    expect(silence.status).toBe(200);
    expect(silence.body).toMatchObject({ noSpeech: true, attemptNo: 2, attemptsLeft: 2 });
  });

  it('keeps a retention pass at threshold free of levelUp', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold));
    // A 60-74 retention pass on an already-mastered word does not master a new
    // word, so even a fully-threshold level must not attach levelUp here.
    const target = ids[0];
    const cycleId = await assignedCycle(token, target);
    mockScore(70);
    const response = await fixedAttempt(token, target, randomUUID(), cycleId);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ passed: true, mastered: false });
    expect(response.body.levelUp).toBeUndefined();
    expect(await userLevel(userId)).toBe('A1');
  });

  it('serves revision first only when the latest attempt repeated an earlier word', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    // Seed one due revision word with no attempt history of a repeat, and no
    // other progress: the session opens on the revision bucket.
    const revisionTarget = ids[6];
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, due_at)
       VALUES ($1, $2, 'learning', 50, 1, now() - interval '1 hour')`,
      [userId, revisionTarget],
    );
    const opened = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(opened.status).toBe(200);
    expect(opened.body.kind).toBe('revision');
    expect(opened.body.question.id).toBe(revisionTarget);
  });

  it('rejects skip for a closed cycle and while an assessment holds the question', async () => {
    const { token } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const target = ids[7];
    const cycleId = await assignedCycle(token, target);

    let releaseAssessment!: (result: { transcript: string; score: number; passed: boolean; feedback: string }) => void;
    speakMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    const pending = fixedAttempt(token, target, randomUUID(), cycleId);
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());
    const inFlightSkip = await request(a)
      .post('/practice/skip')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: target, cycleId });
    expect(inFlightSkip.status).toBe(409);
    expect(inFlightSkip.body).toMatchObject({ code: 'ASSESSMENT_IN_PROGRESS' });
    releaseAssessment({ transcript: 'done', score: 80, passed: true, feedback: 'good' });
    expect((await pending).status).toBe(200);

    const closedSkip = await request(a)
      .post('/practice/skip')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: target, cycleId });
    expect(closedSkip.status).toBe(409);
    expect(closedSkip.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });
  });

  it('answers schema drift with the exact field messages', async () => {
    const { token } = await freshUserAt('A1');
    const badCycle = await request(a)
      .post('/practice/skip')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: randomUUID(), cycleId: 'not-a-uuid' });
    expect(badCycle.status).toBe(400);
    expect(badCycle.body).toEqual({ error: 'cycleId: cycleId must be a valid UUID', code: 'VALIDATION_FAILED' });

    const stats = await request(a).get('/practice/stats').set('Authorization', `Bearer ${token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.timeZone).toBe('UTC');
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
          undefined,
          q.body.cycleId,
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
