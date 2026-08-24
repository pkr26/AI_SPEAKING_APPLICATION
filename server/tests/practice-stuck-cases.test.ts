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

import { answerForm, app, completeDiagnostic, fakeM4aBuffer, pool, registerUser } from './helpers';

interface ObservedLease {
  statements: string[];
  release: ReturnType<typeof vi.fn>;
  releasedAfterStatementCount: number[];
}

async function observePoolLeases<T>(
  action: () => Promise<T>,
  failStatementOnce?: { text: string; error: Error },
): Promise<{ result: T; leases: ObservedLease[]; failureInjected: boolean }> {
  const originalConnect = pool.connect.bind(pool);
  const leases: ObservedLease[] = [];
  let failureInjected = false;
  const connect = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
    if (typeof callback === 'function') return originalConnect(callback as never);
    return originalConnect().then((client: PoolClient) => {
      const statements: string[] = [];
      const mutable = client as unknown as {
        query: (...args: unknown[]) => unknown;
        release: (error?: Error | boolean) => void;
      };
      const actualQuery = mutable.query.bind(client);
      const actualRelease = mutable.release.bind(client);
      mutable.query = (query: unknown, ...args: unknown[]) => {
        const text = typeof query === 'string' ? query : (query as { text?: unknown } | null)?.text;
        if (typeof text === 'string') statements.push(text);
        if (!failureInjected && failStatementOnce && text === failStatementOnce.text) {
          failureInjected = true;
          return Promise.reject(failStatementOnce.error);
        }
        return actualQuery(query, ...args);
      };
      const releasedAfterStatementCount: number[] = [];
      const release = vi.fn((error?: Error | boolean) => {
        releasedAfterStatementCount.push(statements.length);
        mutable.query = actualQuery;
        mutable.release = actualRelease;
        actualRelease(error);
      });
      mutable.release = release;
      leases.push({ statements, release, releasedAfterStatementCount });
      return client;
    });
  }) as typeof pool.connect);

  try {
    return { result: await action(), leases, failureInjected };
  } finally {
    connect.mockRestore();
  }
}

const CLAIM_OWNERSHIP_FRAGMENT = 'SELECT 1 FROM practice_inflight';
const EXACT_CLAIM_DELETE = 'DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3';

function expectCompletedPersistenceLease(leases: ObservedLease[]): void {
  const lease = leases.find(
    ({ statements }) =>
      statements.some((text) => text.includes(CLAIM_OWNERSHIP_FRAGMENT)) && statements.includes(EXACT_CLAIM_DELETE),
  );
  expect(lease).toBeDefined();
  expect(lease!.statements[0]).toBe('BEGIN');
  expect(lease!.statements[lease!.releasedAfterStatementCount[0] - 1]).toBe('COMMIT');
  expect(lease!.release).toHaveBeenCalledOnce();
  const parentLockAt = lease!.statements.indexOf('SELECT 1 FROM users WHERE id = $1 FOR UPDATE');
  const claimLockAt = lease!.statements.findIndex((text) => text.includes(CLAIM_OWNERSHIP_FRAGMENT));
  expect(parentLockAt).toBeGreaterThan(0);
  expect(claimLockAt).toBeGreaterThan(parentLockAt);
}

const SILENCE = {
  transcript: '',
  score: 0,
  passed: false,
  feedback: 'I could not hear enough English to assess. Please speak clearly and try a slightly longer answer.',
};

beforeEach(() => {
  speakMock.mockReset();
  speakMock.mockResolvedValue({
    transcript: 'A clear learner answer.',
    score: 82,
    passed: true,
    feedback: 'Relevant and well structured.',
  });
  nativeMock.mockReset();
  nativeMock.mockResolvedValue({
    understood: true,
    transcript: 'మీరు అర్థం చేసుకున్నారు.',
    modelAnswer: 'A simple model answer in English.',
    feedback: 'Your answer shows you understood the question.',
  });
});

afterAll(async () => {
  await pool.end();
});

describe('practice stuck cases', () => {
  const a = app();

  async function freshUser() {
    const { res } = await registerUser(a);
    if (res.status !== 201 || typeof res.body?.token !== 'string' || typeof res.body?.user?.id !== 'string') {
      throw new Error(`practice setup registration failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    return { token, userId, level };
  }

  async function someQuestion(level: string) {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id LIMIT 1',
      [level],
    );
    if (typeof rows[0]?.id !== 'string') {
      throw new Error(`practice setup found no question for level ${JSON.stringify(level)}`);
    }
    return rows[0].id;
  }

  describe('silence (case 04)', () => {
    it('is a free retry: no attempt row, no progress, counter unmoved', async () => {
      const { token, userId, level } = await freshUser();
      speakMock.mockClear(); // discount the diagnostic answers
      const questionId = await someQuestion(level);
      speakMock.mockResolvedValue(SILENCE);
      const requestId = randomUUID();
      const send = () =>
        request(a)
          .post('/practice/attempt')
          .set('Authorization', `Bearer ${token}`)
          .attach('audio', fakeM4aBuffer(), {
            filename: 'answer.m4a',
            contentType: 'audio/mp4',
          })
          .field('questionId', questionId)
          .field('requestId', requestId);

      const { result: first, leases } = await observePoolLeases(send);
      expect(first.status).toBe(200);
      expect(first.body).toEqual({
        passed: false,
        noSpeech: true,
        mastered: false,
        attemptNo: 1,
        score: 0,
        transcript: '',
        feedback: SILENCE.feedback,
        attemptsLeft: 3,
      });
      expectCompletedPersistenceLease(leases);

      // Idempotent replay: identical body, no second assessment.
      const replay = await send();
      expect(replay.status).toBe(200);
      expect(replay.body).toEqual(first.body);
      expect(speakMock).toHaveBeenCalledTimes(1);

      const counts = await pool.query<{ attempts: number; progress: number; inflight: number }>(
        `SELECT
           (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'practice') AS attempts,
           (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress,
           (SELECT count(*)::int FROM practice_inflight WHERE user_id = $1) AS inflight`,
        [userId],
      );
      expect(counts.rows[0]).toEqual({ attempts: 0, progress: 0, inflight: 0 });

      // The next real attempt is still attempt 1 — silence never advanced it.
      speakMock.mockResolvedValue({
        transcript: 'trying',
        score: 40,
        passed: false,
        feedback: 'Keep going.',
      });
      const real = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(real.status).toBe(200);
      expect(real.body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });
    });

    it('after a real failure, silence reports the pending attempt number without consuming it', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);
      speakMock.mockResolvedValue({
        transcript: 'weak answer',
        score: 40,
        passed: false,
        feedback: 'Add more detail.',
      });
      const failed = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(failed.body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });

      speakMock.mockResolvedValue(SILENCE);
      const silent = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(silent.status).toBe(200);
      expect(silent.body).toMatchObject({ noSpeech: true, attemptNo: 2, attemptsLeft: 2 });

      const { rows } = await pool.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM attempts WHERE user_id = $1 AND context = 'practice'",
        [userId],
      );
      expect(rows[0].n).toBe(1);
    });

    it('rolls back and returns the exact state-changed contract when silence no longer owns the claim', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);
      const rivalClaimId = randomUUID();
      speakMock.mockImplementationOnce(async () => {
        await pool.query('UPDATE practice_inflight SET claim_id = $1 WHERE user_id = $2 AND question_id = $3', [
          rivalClaimId,
          userId,
          questionId,
        ]);
        return SILENCE;
      });

      try {
        const { result, leases } = await observePoolLeases(() =>
          answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId),
        );

        expect(result.status).toBe(409);
        expect(result.body).toEqual({
          error: 'Assessment state changed; please try again',
          code: 'STATE_CHANGED',
        });
        const failedLease = leases.find(({ statements }) =>
          statements.some((text) => text.includes(CLAIM_OWNERSHIP_FRAGMENT)),
        );
        expect(failedLease).toBeDefined();
        expect(failedLease!.statements[0]).toBe('BEGIN');
        expect(failedLease!.statements[failedLease!.releasedAfterStatementCount[0] - 1]).toBe('ROLLBACK');
        expect(failedLease!.release).toHaveBeenCalledOnce();
      } finally {
        await pool.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2', [userId, questionId]);
      }
    });

    it('stops before the claim-row read when account deletion lands after the silence result', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);
      speakMock.mockImplementationOnce(async () => {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        return SILENCE;
      });

      const { result, leases } = await observePoolLeases(() =>
        answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId),
      );

      expect(result.status).toBe(409);
      expect(result.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
      const persistence = leases.find(
        ({ statements }) =>
          statements.includes('SELECT 1 FROM users WHERE id = $1 FOR UPDATE') && statements.at(-1) === 'ROLLBACK',
      );
      expect(persistence).toBeDefined();
      expect(persistence!.statements).toEqual(['BEGIN', 'SELECT 1 FROM users WHERE id = $1 FOR UPDATE', 'ROLLBACK']);
      expect(persistence!.release).toHaveBeenCalledOnce();
    });
  });

  describe('native-language answers (case 02)', () => {
    it('returns comprehension feedback without touching attempts or mastery', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);

      const { result: r, leases } = await observePoolLeases(() =>
        answerForm(request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`), questionId),
      );

      expect(r.status).toBe(200);
      expect(r.body).toEqual({
        mode: 'native',
        understood: true,
        transcript: 'మీరు అర్థం చేసుకున్నారు.',
        modelAnswer: 'A simple model answer in English.',
        feedback: 'Your answer shows you understood the question.',
      });
      expect(nativeMock).toHaveBeenCalledOnce();
      expect(nativeMock).toHaveBeenCalledWith(
        expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/),
        expect.objectContaining({ cefrLevel: level }),
        'te',
        userId,
        expect.objectContaining({ onCapacityReserved: expect.any(Function) }),
      );

      const counts = await pool.query<{ attempts: number; progress: number }>(
        `SELECT
           (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'practice') AS attempts,
           (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress`,
        [userId],
      );
      expect(counts.rows[0]).toEqual({ attempts: 0, progress: 0 });
      expectCompletedPersistenceLease(leases);
    });

    it('stops before the claim-row read when account deletion lands after the native result', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);
      nativeMock.mockImplementationOnce(async () => {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        return {
          understood: true,
          transcript: 'అర్థమైంది.',
          modelAnswer: 'A model answer.',
          feedback: 'Good comprehension.',
        };
      });

      const { result, leases } = await observePoolLeases(() =>
        answerForm(request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`), questionId),
      );

      expect(result.status).toBe(409);
      expect(result.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
      const persistence = leases.find(
        ({ statements }) =>
          statements.includes('SELECT 1 FROM users WHERE id = $1 FOR UPDATE') && statements.at(-1) === 'ROLLBACK',
      );
      expect(persistence).toBeDefined();
      expect(persistence!.statements).toEqual(['BEGIN', 'SELECT 1 FROM users WHERE id = $1 FOR UPDATE', 'ROLLBACK']);
      expect(persistence!.release).toHaveBeenCalledOnce();
    });

    it('appends the authored native example when the answer misses the question', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      const { rows } = await pool.query<{ native: string }>(
        `SELECT translations->'te'->'examples'->0->>'native' AS native FROM questions WHERE id = $1`,
        [questionId],
      );
      nativeMock.mockResolvedValue({
        understood: false,
        transcript: 'something off topic',
        modelAnswer: 'A simple model answer in English.',
        feedback: 'That answer is about something else.',
      });

      const r = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        questionId,
      );

      expect(r.status).toBe(200);
      expect(r.body.mode).toBe('native');
      expect(r.body.understood).toBe(false);
      expect(r.body.feedback).toContain('That answer is about something else.');
      expect(r.body.feedback).toContain(rows[0].native);
      expect(r.body.feedback.length).toBeLessThanOrEqual(800);
    });

    it('keeps native silence feedback focused on recording again', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      nativeMock.mockResolvedValue({
        understood: false,
        transcript: '',
        modelAnswer: '',
        feedback: 'I could not hear enough speech. Please try again.',
      });

      const r = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        questionId,
      );

      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({
        mode: 'native',
        understood: false,
        transcript: '',
        modelAnswer: '',
        feedback: 'I could not hear enough speech. Please try again.',
      });
      expect(r.body.feedback).not.toContain('An on-topic answer could be:');
    });

    it('replays the same native request without a second assessment', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      const requestId = randomUUID();
      const send = () =>
        request(a)
          .post('/practice/attempt/native')
          .set('Authorization', `Bearer ${token}`)
          .attach('audio', fakeM4aBuffer(), {
            filename: 'answer.m4a',
            contentType: 'audio/mp4',
          })
          .field('questionId', questionId)
          .field('requestId', requestId);

      const first = await send();
      const replay = await send();
      expect(replay.status).toBe(200);
      expect(replay.body).toEqual(first.body);
      expect(nativeMock).toHaveBeenCalledTimes(1);
    });

    it('keeps English and native request identifiers in separate replay namespaces', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      speakMock.mockClear();
      nativeMock.mockClear();
      const englishRequestId = randomUUID();
      const nativeRequestId = randomUUID();
      const send = (endpoint: '/practice/attempt' | '/practice/attempt/native', requestId: string) =>
        request(a)
          .post(endpoint)
          .set('Authorization', `Bearer ${token}`)
          .attach('audio', fakeM4aBuffer(), {
            filename: 'answer.m4a',
            contentType: 'audio/mp4',
          })
          .field('questionId', questionId)
          .field('requestId', requestId);

      expect((await send('/practice/attempt', englishRequestId)).status).toBe(200);
      const wrongNativeReplay = await send('/practice/attempt/native', englishRequestId);
      expect(wrongNativeReplay.status).toBe(409);
      expect(wrongNativeReplay.body).toEqual({
        error: 'Assessment request identifier was already used',
        code: 'REQUEST_ID_REUSED',
      });

      expect((await send('/practice/attempt/native', nativeRequestId)).status).toBe(200);
      const wrongEnglishReplay = await send('/practice/attempt', nativeRequestId);
      expect(wrongEnglishReplay.status).toBe(409);
      expect(wrongEnglishReplay.body).toEqual({
        error: 'Assessment request identifier was already used',
        code: 'REQUEST_ID_REUSED',
      });

      const nativeStatus = await request(a)
        .get(`/assessments/${nativeRequestId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(nativeStatus.status).toBe(200);
      expect(nativeStatus.body).toMatchObject({
        status: 'completed',
        context: 'practice-native',
        questionId,
        response: { mode: 'native' },
      });
      expect(speakMock).toHaveBeenCalledTimes(1);
      expect(nativeMock).toHaveBeenCalledTimes(1);
    });

    it('enforces the level guard, existence, and UUID contracts like the English route', async () => {
      const { token, level } = await freshUser();
      const other = await pool.query<{ id: string }>(
        'SELECT id FROM questions WHERE cefr_level != $1 ORDER BY id LIMIT 1',
        [level],
      );

      const foreign = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        other.rows[0].id,
      );
      expect(foreign.status).toBe(403);
      expect(foreign.body).toEqual({ error: 'Question is not available at your level', code: 'FORBIDDEN' });

      const missing = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        '00000000-0000-0000-0000-000000000000',
      );
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ error: 'Question not found', code: 'NOT_FOUND' });

      const malformed = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        'not-a-uuid',
      );
      expect(malformed.status).toBe(400);
      expect(nativeMock).not.toHaveBeenCalled();
    });

    it('requires audio like the English route', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);

      const r = await request(a)
        .post('/practice/attempt/native')
        .set('Authorization', `Bearer ${token}`)
        .field('questionId', questionId)
        .field('requestId', randomUUID());

      expect(r.status).toBe(400);
      expect(r.body).toEqual({ error: 'audio file is required', code: 'VALIDATION_FAILED' });
      expect(nativeMock).not.toHaveBeenCalled();
    });

    it('fails 409 when the claim was replaced mid-assessment, keeping the request retryable', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);
      const requestId = randomUUID();
      const send = () =>
        request(a)
          .post('/practice/attempt/native')
          .set('Authorization', `Bearer ${token}`)
          .attach('audio', fakeM4aBuffer(), {
            filename: 'answer.m4a',
            contentType: 'audio/mp4',
          })
          .field('questionId', questionId)
          .field('requestId', requestId);

      // Mid-assessment, this worker's claim lease is replaced by a rival
      // claim (claim_id no longer matches) — exactly the expired-lease race
      // both English persist paths already guard against.
      nativeMock.mockImplementationOnce(async () => {
        await pool.query('UPDATE practice_inflight SET claim_id = $1 WHERE user_id = $2 AND question_id = $3', [
          randomUUID(),
          userId,
          questionId,
        ]);
        return {
          understood: true,
          transcript: 'మీరు అర్థం చేసుకున్నారు.',
          modelAnswer: 'A simple model answer in English.',
          feedback: 'Your answer shows you understood the question.',
        };
      });

      const r = await send();
      expect(r.status).toBe(409);
      expect(r.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });

      // The rival claim finishes; the abandoned requestId stays retryable and
      // completes normally (the duplicate paid result was never persisted).
      await pool.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2', [userId, questionId]);
      const retry = await send();
      expect(retry.status).toBe(200);
      expect(retry.body.mode).toBe('native');
      expect(nativeMock).toHaveBeenCalledTimes(2);
    });

    it('rolls back, releases, and clears the claim when native persistence fails', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);
      const persistenceError = new Error('injected native persistence failure');

      const { result, leases, failureInjected } = await observePoolLeases(
        () =>
          answerForm(request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`), questionId),
        { text: EXACT_CLAIM_DELETE, error: persistenceError },
      );

      expect(failureInjected).toBe(true);
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      const failedLease = leases.find(({ statements }) => statements.includes(EXACT_CLAIM_DELETE));
      expect(failedLease).toBeDefined();
      expect(failedLease!.statements).toContain('ROLLBACK');
      expect(failedLease!.statements[failedLease!.releasedAfterStatementCount[0] - 1]).toBe('ROLLBACK');
      expect(failedLease!.release).toHaveBeenCalledOnce();
      const inflight = await pool.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM practice_inflight WHERE user_id = $1 AND question_id = $2',
        [userId, questionId],
      );
      expect(inflight.rows[0].count).toBe(0);
    });
  });

  describe('all-skipped dead end', () => {
    async function parkAllBut(userId: string, level: string, exceptId?: string) {
      await pool.query(
        `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, skipped_until)
         SELECT $1, id, 'learning', 0, 0, now() + interval '7 days'
         FROM questions WHERE cefr_level = $2 AND ($3::uuid IS NULL OR id <> $3)`,
        [userId, level, exceptId ?? null],
      );
    }

    it('serves the soonest-unparking skipped word instead of hard-500ing', async () => {
      const { token, userId, level } = await freshUser();
      const { rows } = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id', [
        level,
      ]);
      const soonest = rows[0].id;
      await parkAllBut(userId, level, soonest);
      await pool.query(
        `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, skipped_until)
         VALUES ($1, $2, 'learning', 0, 0, now() + interval '1 day')`,
        [userId, soonest],
      );

      const r = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

      expect(r.status).toBe(200);
      expect(r.body.question.id).toBe(soonest);
      expect(r.body.kind).toBe('revision');
      expect(r.body.progress.learningCount).toBe(rows.length);
    });

    it('re-skipping the fallback word parks it again and serves the next soonest-unparking one', async () => {
      const { token, userId, level } = await freshUser();
      const { rows } = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id', [
        level,
      ]);
      // Staggered parks: the word unparking in 1 day is served first, then 2...
      await pool.query(
        `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, skipped_until)
         SELECT $1, id, 'learning', 0, 0,
                now() + row_number() OVER (ORDER BY id) * interval '1 day'
         FROM questions WHERE cefr_level = $2`,
        [userId, level],
      );

      const first = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      expect(first.status).toBe(200);
      expect(first.body.question.id).toBe(rows[0].id);

      const skip = await request(a)
        .post('/practice/skip')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: rows[0].id });
      expect(skip.status).toBe(204);

      const second = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      expect(second.status).toBe(200);
      expect(second.body.question.id).toBe(rows[1].id);
    });

    it('clears the park when the served fallback word is answered, putting it back in play', async () => {
      const { token, userId, level } = await freshUser();
      await parkAllBut(userId, level);
      const served = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      expect(served.status).toBe(200);
      expect(served.body.kind).toBe('revision');
      const servedId = served.body.question.id as string;

      // A scored answer means the word is back in play: the park is cleared
      // instead of the level re-serving the same parked word for up to 7 days.
      const answer = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        servedId,
      );
      expect(answer.status).toBe(200);

      const progress = await pool.query<{ skipped_until: string | null; attempt_count: number }>(
        'SELECT skipped_until, attempt_count FROM practice_progress WHERE user_id = $1 AND question_id = $2',
        [userId, servedId],
      );
      expect(progress.rows[0]).toEqual({ skipped_until: null, attempt_count: 1 });

      const counts = await pool.query<{ parked: number; total: number }>(
        `SELECT
           (SELECT count(*)::int FROM practice_progress WHERE user_id = $1 AND skipped_until > now()) AS parked,
           (SELECT count(*)::int FROM questions WHERE cefr_level = $2) AS total`,
        [userId, level],
      );
      expect(counts.rows[0].parked).toBe(counts.rows[0].total - 1);
    });
  });
});
