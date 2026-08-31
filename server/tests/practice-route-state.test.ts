import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Optional parked-assess seam (same shape as tests/assessment-route-state.test.ts):
// disabled by default so every other test in this file keeps the real
// MOCK_AI pipeline, and enabled only inside the bodies of the tests that need
// to hold the provider call open mid-flight.
const routeAssess = vi.hoisted(() => ({ useMock: false, assess: vi.fn(), nativeAssess: vi.fn() }));

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return {
    ...actual,
    assessSpeaking: (...args: Parameters<typeof actual.assessSpeaking>) =>
      routeAssess.useMock ? routeAssess.assess(...args) : actual.assessSpeaking(...args),
    assessNativeComprehension: (...args: Parameters<typeof actual.assessNativeComprehension>) =>
      routeAssess.useMock ? routeAssess.nativeAssess(...args) : actual.assessNativeComprehension(...args),
  };
});

import { app, completeDiagnostic, fakeM4aBuffer, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

interface RouteArtifacts {
  attempts: number;
  requests: number;
}

interface DatabaseStatement {
  text: string;
  values?: unknown[];
}

let a: ReturnType<typeof app>;

const PRACTICE_READ_PARENT_LOCK =
  'SELECT cefr_level, diagnostic_completed, native_language FROM users WHERE id = $1 FOR SHARE';
const PRACTICE_ASSIGN_PARENT_LOCK =
  'SELECT cefr_level, diagnostic_completed, native_language FROM users WHERE id = $1 FOR UPDATE';
const SKIP_PARENT_LOCK = 'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE';

beforeEach(() => {
  a = app();
});

async function withTemporaryDatabaseArtifacts(
  setup: DatabaseStatement[],
  cleanup: DatabaseStatement[],
  run: () => Promise<void>,
): Promise<void> {
  let primaryFailure: unknown;
  let primaryFailed = false;
  try {
    for (const statement of setup) await pool.query(statement.text, statement.values);
    await run();
  } catch (error) {
    primaryFailed = true;
    primaryFailure = error;
  }

  const cleanupFailures: unknown[] = [];
  for (const statement of cleanup) {
    try {
      await pool.query(statement.text, statement.values);
    } catch (error) {
      cleanupFailures.push(error);
    }
  }

  if (primaryFailed) throw primaryFailure;
  if (cleanupFailures.length > 0) throw cleanupFailures[0];
}

async function routeArtifacts(userId: string, requestId: string): Promise<RouteArtifacts> {
  const { rows } = await pool.query<RouteArtifacts>(
    `SELECT
       (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'practice') AS attempts,
       (SELECT count(*)::int FROM assessment_requests WHERE user_id = $1 AND request_id = $2) AS requests`,
    [userId, requestId],
  );
  return rows[0];
}

function fixedPracticeRequest(token: string, questionId: string, requestId: string, cycleId: string) {
  return request(a)
    .post('/practice/attempt')
    .set('Authorization', `Bearer ${token}`)
    .attach('audio', fakeM4aBuffer(), {
      filename: 'answer.m4a',
      contentType: 'audio/mp4',
    })
    .field('questionId', questionId)
    .field('requestId', requestId)
    .field('cycleId', cycleId);
}

async function registerPlacedPracticeUser(): Promise<{
  token: string;
  userId: string;
  questionId: string;
  cycleId: string;
}> {
  const { res } = await registerUser(a);
  const token = res.body.token as string;
  const userId = res.body.user.id as string;
  await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [userId]);
  const assignment = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
  return {
    token,
    userId,
    questionId: assignment.body.question.id as string,
    cycleId: assignment.body.cycleId as string,
  };
}

/** Commit a user mutation between the generic request claim and practice claim. */
async function withMutationAfterRequestClaim<T>(mutate: () => Promise<unknown>, run: () => PromiseLike<T>): Promise<T> {
  const originalConnect = pool.connect.bind(pool);
  let mutated = false;
  const connect = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
    if (typeof callback === 'function') return originalConnect(callback as never);
    return originalConnect().then((client: PoolClient) => {
      const mutable = client as unknown as {
        query: (...args: unknown[]) => unknown;
        release: (error?: Error | boolean) => void;
      };
      const actualQuery = mutable.query;
      const actualRelease = mutable.release;
      let insertedRequestClaim = false;
      mutable.query = async (...args: unknown[]) => {
        const text = typeof args[0] === 'string' ? args[0] : (args[0] as { text?: unknown } | null)?.text;
        const result = (await actualQuery.call(client, ...args)) as { rowCount?: number | null };
        if (typeof text === 'string' && text.includes('INSERT INTO assessment_requests') && result.rowCount === 1) {
          insertedRequestClaim = true;
        }
        if (text === 'COMMIT' && insertedRequestClaim && !mutated) {
          mutated = true;
          await mutate();
        }
        return result;
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
    const result = await Promise.resolve(run());
    expect(mutated).toBe(true);
    return result;
  } finally {
    connect.mockRestore();
  }
}

/** Force a practice read to wait after requireAuth, then commit newer user state. */
async function withPracticeUserRace<T>(options: {
  userId: string;
  parentLock?: string;
  startRequest: () => PromiseLike<T>;
  mutateBeforeRelease: (blocker: PoolClient) => Promise<unknown>;
}): Promise<{ response: T; statements: string[]; releaseCalls: number }> {
  const blocker = await pool.connect();
  const originalConnect = pool.connect.bind(pool);
  const parentLock = options.parentLock ?? PRACTICE_READ_PARENT_LOCK;
  let transactionOpen = false;
  let blockedStatements: string[] | undefined;
  let blockedReleaseCalls = 0;
  let connectSpy: ReturnType<typeof vi.spyOn> | undefined;
  try {
    await blocker.query('BEGIN');
    transactionOpen = true;
    await blocker.query('SELECT 1 FROM users WHERE id = $1 FOR NO KEY UPDATE', [options.userId]);

    connectSpy = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
      if (typeof callback === 'function') return originalConnect(callback as never);
      return originalConnect().then((client: PoolClient) => {
        const statements: string[] = [];
        const mutable = client as unknown as {
          query: (...args: unknown[]) => unknown;
          release: (error?: Error | boolean) => void;
        };
        const actualQuery = mutable.query;
        const actualRelease = mutable.release;
        let observedParentLock = false;
        mutable.query = (query: unknown, ...args: unknown[]) => {
          const text = typeof query === 'string' ? query : (query as { text?: unknown } | null)?.text;
          if (typeof text === 'string') statements.push(text);
          if (text === parentLock) {
            observedParentLock = true;
            blockedStatements = statements;
          }
          return actualQuery.call(client, query, ...args);
        };
        mutable.release = (error?: Error | boolean) => {
          if (observedParentLock) blockedReleaseCalls += 1;
          mutable.query = actualQuery;
          mutable.release = actualRelease;
          actualRelease.call(client, error);
        };
        return client;
      });
    }) as typeof pool.connect);

    const responsePromise = Promise.resolve(options.startRequest());
    await vi.waitFor(() => expect(blockedStatements).toBeDefined(), { timeout: 15_000, interval: 10 });
    await options.mutateBeforeRelease(blocker);
    await blocker.query('COMMIT');
    transactionOpen = false;
    const response = await responsePromise;
    return { response, statements: blockedStatements!, releaseCalls: blockedReleaseCalls };
  } finally {
    connectSpy?.mockRestore();
    if (transactionOpen) await blocker.query('ROLLBACK');
    blocker.release();
  }
}

describe('practice read snapshots', () => {
  it('returns state-changed when account deletion commits during the current-user read lock wait', async () => {
    const { token, userId } = await registerPlacedPracticeUser();

    const { response, statements } = await withPracticeUserRace({
      userId,
      parentLock: PRACTICE_ASSIGN_PARENT_LOCK,
      startRequest: () => request(a).get('/practice/question').set('Authorization', `Bearer ${token}`),
      mutateBeforeRelease: (blocker) => blocker.query('DELETE FROM users WHERE id = $1', [userId]),
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(statements[0]).toBe('BEGIN');
    expect(statements[1]).toBe(PRACTICE_ASSIGN_PARENT_LOCK);
    expect(statements.at(-1)).toBe('ROLLBACK');
    const user = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    expect(user.rowCount).toBe(0);
  });

  it('serves a question and progress from the level that is current after a concurrent promotion', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query("UPDATE users SET cefr_level = 'A1', diagnostic_completed = true WHERE id = $1", [userId]);

    const { response, statements } = await withPracticeUserRace({
      userId,
      parentLock: PRACTICE_ASSIGN_PARENT_LOCK,
      startRequest: () => request(a).get('/practice/question').set('Authorization', `Bearer ${token}`),
      mutateBeforeRelease: (blocker) => blocker.query("UPDATE users SET cefr_level = 'B1' WHERE id = $1", [userId]),
    });

    expect(response.status).toBe(200);
    expect(response.body.question.cefrLevel).toBe('B1');
    expect(response.body.progress).toEqual({
      masteredCount: 0,
      learningCount: 0,
      totalAtLevel: 100,
      dueCount: 0,
    });
    expect(statements[0]).toBe('BEGIN');
    expect(statements[1]).toBe(PRACTICE_ASSIGN_PARENT_LOCK);
    expect(statements.at(-1)).toBe('COMMIT');
  });

  it('reports stats from one current-level snapshot when promotion commits after authentication', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query("UPDATE users SET cefr_level = 'A1', diagnostic_completed = true WHERE id = $1", [userId]);
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count)
       SELECT $1, id, 'mastered', 90, 1 FROM questions WHERE cefr_level = 'A1' ORDER BY id LIMIT 1`,
      [userId],
    );

    const { response } = await withPracticeUserRace({
      userId,
      startRequest: () => request(a).get('/practice/stats').set('Authorization', `Bearer ${token}`),
      mutateBeforeRelease: (blocker) => blocker.query("UPDATE users SET cefr_level = 'B1' WHERE id = $1", [userId]),
    });

    expect(response.status).toBe(200);
    expect(response.body.level).toBe('B1');
    expect(response.body.progress).toEqual({
      masteredCount: 0,
      learningCount: 0,
      totalAtLevel: 100,
      dueCount: 0,
    });
    expect(response.body.totalAttempts).toBe(0);
  });

  it('uses the current native language for help after a concurrent profile update', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query("UPDATE users SET cefr_level = 'A1', diagnostic_completed = true WHERE id = $1", [userId]);
    const question = await pool.query<{ id: string; hindi_word: string }>(
      `SELECT id, translations->'hi'->>'word' AS hindi_word
       FROM questions WHERE cefr_level = 'A1' ORDER BY id LIMIT 1`,
    );

    const { response } = await withPracticeUserRace({
      userId,
      startRequest: () =>
        request(a).get(`/practice/question/${question.rows[0].id}/help`).set('Authorization', `Bearer ${token}`),
      mutateBeforeRelease: (blocker) =>
        blocker.query("UPDATE users SET native_language = 'hi' WHERE id = $1", [userId]),
    });

    expect(response.status).toBe(200);
    expect(response.body.promptWordNative).toBe(question.rows[0].hindi_word);
  });
});

describe('practice claim eligibility handoff', () => {
  it('abandons the request when account deletion lands before the practice claim', async () => {
    const { token, userId, questionId, cycleId } = await registerPlacedPracticeUser();
    const requestId = randomUUID();

    const response = await withMutationAfterRequestClaim(
      () => pool.query('DELETE FROM users WHERE id = $1', [userId]),
      () => fixedPracticeRequest(token, questionId, requestId, cycleId),
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
  });

  it('abandons the request when diagnostic eligibility is revoked before the practice claim', async () => {
    const { token, userId, questionId, cycleId } = await registerPlacedPracticeUser();
    const requestId = randomUUID();

    const response = await withMutationAfterRequestClaim(
      () => pool.query('UPDATE users SET diagnostic_completed = false WHERE id = $1', [userId]),
      () => fixedPracticeRequest(token, questionId, requestId, cycleId),
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
  });

  it('abandons the request when a rival promotion lands before the practice claim', async () => {
    const { token, userId, questionId, cycleId } = await registerPlacedPracticeUser();
    const requestId = randomUUID();

    const response = await withMutationAfterRequestClaim(
      () => pool.query("UPDATE users SET cefr_level = 'B1' WHERE id = $1", [userId]),
      () => fixedPracticeRequest(token, questionId, requestId, cycleId),
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
  });
});

describe('practice eligibility state', () => {
  it('rolls back and releases skip when account deletion wins its parent-lock wait', async () => {
    const { token, userId, questionId, cycleId } = await registerPlacedPracticeUser();

    const { response, statements, releaseCalls } = await withPracticeUserRace({
      userId,
      parentLock: SKIP_PARENT_LOCK,
      startRequest: () =>
        request(a).post('/practice/skip').set('Authorization', `Bearer ${token}`).send({ questionId, cycleId }),
      mutateBeforeRelease: (blocker) => blocker.query('DELETE FROM users WHERE id = $1', [userId]),
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(statements).toEqual(['BEGIN', SKIP_PARENT_LOCK, 'ROLLBACK']);
    expect(releaseCalls).toBe(1);
  });

  it('rejects an incomplete diagnostic even when a CEFR level is present', async () => {
    const { res } = await registerUser(a);
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(expect.objectContaining({ id: expect.any(String) }));
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query("UPDATE users SET diagnostic_completed = false, cefr_level = 'A1' WHERE id = $1", [userId]);

    const response = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });

    const question = await pool.query<{ id: string }>(
      "SELECT id FROM questions WHERE cefr_level = 'A1' ORDER BY id LIMIT 1",
    );
    expect(question.rows[0]).toEqual({ id: expect.any(String) });
    const skip = await request(a)
      .post('/practice/skip')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: question.rows[0].id, cycleId: randomUUID() });
    expect(skip.status).toBe(403);
    expect(skip.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });

    const help = await request(a)
      .get(`/practice/question/${question.rows[0].id}/help`)
      .set('Authorization', `Bearer ${token}`);
    expect(help.status).toBe(403);
    expect(help.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });

    const progress = await pool.query('SELECT 1 FROM practice_progress WHERE user_id = $1', [userId]);
    expect(progress.rowCount).toBe(0);

    const requestId = randomUUID();
    const attempt = await fixedPracticeRequest(token, question.rows[0].id, requestId, randomUUID());
    expect(attempt.status).toBe(403);
    expect(attempt.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });
    expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
  });

  it('abandons a newly claimed request for a question outside the learner level', async () => {
    const { res } = await registerUser(a);
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(expect.objectContaining({ id: expect.any(String) }));
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const other = await pool.query<{ id: string }>(
      'SELECT id FROM questions WHERE cefr_level <> $1 ORDER BY id LIMIT 1',
      [level],
    );
    expect(other.rows[0]).toEqual({ id: expect.any(String) });
    const questionId = other.rows[0].id;
    const requestId = randomUUID();

    const response = await fixedPracticeRequest(token, questionId, requestId, randomUUID());

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Question is not available at your level', code: 'FORBIDDEN' });
    expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
  });
});

describe('practice finalization and cleanup', () => {
  it('rolls back and abandons the request when ownership changes before finalization', async () => {
    const { res } = await registerUser(a);
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(expect.objectContaining({ id: expect.any(String) }));
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await completeDiagnostic(a, token);
    const assignment = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = assignment.body.question.id as string;
    const requestId = randomUUID();

    const triggerName = `test_remove_practice_claim_${randomUUID().replaceAll('-', '')}`;
    const functionName = `${triggerName}_fn`;
    await withTemporaryDatabaseArtifacts(
      [
        {
          text: `
            CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.user_id = '${userId}'::uuid THEN
                DELETE FROM practice_inflight WHERE user_id = NEW.user_id;
              END IF;
              RETURN NEW;
            END $$
          `,
        },
        {
          text: `
            CREATE TRIGGER ${triggerName}
            AFTER INSERT ON assessment_usage
            FOR EACH ROW EXECUTE FUNCTION ${functionName}()
          `,
        },
      ],
      [
        { text: `DROP TRIGGER IF EXISTS ${triggerName} ON assessment_usage` },
        { text: `DROP FUNCTION IF EXISTS ${functionName}()` },
      ],
      async () => {
        const response = await fixedPracticeRequest(token, questionId, requestId, assignment.body.cycleId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
        expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
        const inflight = await pool.query(
          'SELECT count(*)::int AS count FROM practice_inflight WHERE user_id = $1 AND question_id = $2',
          [userId, questionId],
        );
        expect(inflight.rows[0].count).toBe(0);
      },
    );
  });
});

describe('practice persistence race with a parked provider call', () => {
  function fixedNativePracticeRequest(token: string, questionId: string, requestId: string, cycleId: string) {
    return request(a)
      .post('/practice/attempt/native')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), {
        filename: 'answer.m4a',
        contentType: 'audio/mp4',
      })
      .field('questionId', questionId)
      .field('requestId', requestId)
      .field('cycleId', cycleId);
  }

  it('answers the exact cycle-closed contract when the serving cycle closes before an English persist', async () => {
    const { token, userId, questionId, cycleId } = await registerPlacedPracticeUser();
    const requestId = randomUUID();
    routeAssess.assess.mockClear();
    const passing = { transcript: 'passed', score: 65, passed: true, feedback: 'pass' };
    let releaseAssessment!: (result: typeof passing) => void;
    routeAssess.assess.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    routeAssess.useMock = true;
    let response: Awaited<ReturnType<typeof fixedPracticeRequest>>;
    const attemptPromise = Promise.resolve(fixedPracticeRequest(token, questionId, requestId, cycleId));
    try {
      await vi.waitFor(() => expect(routeAssess.assess).toHaveBeenCalledOnce());
      // The parked worker still owns its claim; closing the serving row behind
      // it must surface the stable public 409, never an undefined-row crash.
      await pool.query(`UPDATE practice_cycles SET status = 'closed', closed_at = now() WHERE id = $1`, [cycleId]);
      releaseAssessment(passing);
      response = await attemptPromise;
    } finally {
      routeAssess.useMock = false;
      releaseAssessment(passing);
      await attemptPromise.catch(() => undefined);
    }

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });
    expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM practice_inflight WHERE user_id = $1', [userId])).rows[0]
        .count,
    ).toBe(0);
  });

  it('answers the exact cycle-closed contract when the serving cycle closes before a native persist', async () => {
    const { token, userId, questionId, cycleId } = await registerPlacedPracticeUser();
    const requestId = randomUUID();
    routeAssess.nativeAssess.mockClear();
    const understood = {
      understood: true,
      transcript: 'una respuesta nativa',
      translatedTranscript: 'a native answer',
      modelAnswer: 'A model answer.',
      feedback: 'Understood.',
    };
    let releaseAssessment!: (result: typeof understood) => void;
    routeAssess.nativeAssess.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    routeAssess.useMock = true;
    let response: Awaited<ReturnType<typeof fixedNativePracticeRequest>>;
    const attemptPromise = Promise.resolve(fixedNativePracticeRequest(token, questionId, requestId, cycleId));
    try {
      await vi.waitFor(() => expect(routeAssess.nativeAssess).toHaveBeenCalledOnce());
      await pool.query(`UPDATE practice_cycles SET status = 'closed', closed_at = now() WHERE id = $1`, [cycleId]);
      releaseAssessment(understood);
      response = await attemptPromise;
    } finally {
      routeAssess.useMock = false;
      releaseAssessment(understood);
      await attemptPromise.catch(() => undefined);
    }

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });
    expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM practice_inflight WHERE user_id = $1', [userId])).rows[0]
        .count,
    ).toBe(0);
  });

  it('rejects a skip of the in-flight question with the exact in-progress contract', async () => {
    const { token, userId, questionId, cycleId } = await registerPlacedPracticeUser();
    const requestId = randomUUID();
    routeAssess.assess.mockClear();
    const passing = { transcript: 'passed', score: 65, passed: true, feedback: 'pass' };
    let releaseAssessment!: (result: typeof passing) => void;
    routeAssess.assess.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseAssessment = resolve;
        }),
    );
    routeAssess.useMock = true;
    const attemptPromise = Promise.resolve(fixedPracticeRequest(token, questionId, requestId, cycleId));
    try {
      await vi.waitFor(() => expect(routeAssess.assess).toHaveBeenCalledOnce());

      const skipped = await request(a)
        .post('/practice/skip')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, cycleId });

      expect(skipped.status).toBe(409);
      expect(skipped.body).toEqual({
        error: 'An assessment is already in progress for this question',
        code: 'ASSESSMENT_IN_PROGRESS',
      });
      // The rejected skip must not park the word or close the cycle.
      expect(
        (await pool.query('SELECT count(*)::int AS count FROM practice_progress WHERE user_id = $1', [userId])).rows[0]
          .count,
      ).toBe(0);
      expect(
        (await pool.query<{ status: string }>('SELECT status FROM practice_cycles WHERE id = $1', [cycleId])).rows[0]
          .status,
      ).toBe('active');

      releaseAssessment(passing);
      const completed = await attemptPromise;
      expect(completed.status).toBe(200);
    } finally {
      routeAssess.useMock = false;
      releaseAssessment(passing);
      await attemptPromise.catch(() => undefined);
    }
  });
});
