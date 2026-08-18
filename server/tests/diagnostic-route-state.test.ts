import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { app, fakeM4aBuffer, pool, registerUser } from './helpers';

/** The exact parent locks the diagnostic writers take before diagnostic_state. */
const NEXT_PARENT_LOCK = 'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE';
const WRITER_PARENT_LOCK = 'SELECT 1 FROM users WHERE id = $1 FOR UPDATE';

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

const a = app();

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

async function routeArtifacts(userId: string, requestId: string) {
  const { rows } = await pool.query<RouteArtifacts>(
    `SELECT
       (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'diagnostic') AS attempts,
       (SELECT count(*)::int FROM assessment_requests WHERE user_id = $1 AND request_id = $2) AS requests`,
    [userId, requestId],
  );
  return rows[0];
}

function fixedRequestForm(token: string, questionId: string, requestId: string) {
  return request(a)
    .post('/diagnostic/answer')
    .set('Authorization', `Bearer ${token}`)
    .attach('audio', fakeM4aBuffer(), {
      filename: 'answer.m4a',
      contentType: 'audio/mp4',
    })
    .field('questionId', questionId)
    .field('requestId', requestId);
}

async function registerDiagnosticUser(): Promise<{ token: string; userId: string }> {
  const { res } = await registerUser(a);
  expect(res.status).toBe(201);
  expect(res.body).toEqual(
    expect.objectContaining({
      token: expect.any(String),
      user: expect.objectContaining({ id: expect.any(String) }),
    }),
  );
  return { token: res.body.token as string, userId: res.body.user.id as string };
}

async function assignB1Question(userId: string): Promise<string> {
  const question = await pool.query<{ id: string }>(
    "SELECT id FROM questions WHERE cefr_level = 'B1' ORDER BY id LIMIT 1",
  );
  expect(question.rows[0]).toEqual({ id: expect.any(String) });
  const questionId = question.rows[0].id;
  const assigned = await pool.query('UPDATE diagnostic_state SET current_question_id = $1 WHERE user_id = $2', [
    questionId,
    userId,
  ]);
  expect(assigned.rowCount).toBe(1);
  return questionId;
}

/**
 * Hold the learner's users row in a rival transaction until the route under
 * test issues its own parent lock, then commit `mutateBeforeRelease` before
 * releasing it. The route therefore always resumes against state that changed
 * after requireAuth loaded its copy, instead of depending on scheduler timing.
 * The blocker takes FOR NO KEY UPDATE so the foreign-key checks of the child
 * rows a request writes before that lock (assessment_requests,
 * assessment_usage) still pass while every FOR UPDATE parent lock waits.
 * Returns the response together with every statement the blocked transaction
 * ran, so its outcome (COMMIT or ROLLBACK) is asserted, not assumed.
 */
async function withUsersRowRace<T>(options: {
  userId: string;
  parentLock: string;
  startRequest: () => PromiseLike<T>;
  mutateBeforeRelease: (blocker: PoolClient) => Promise<unknown>;
}): Promise<{ response: T; statements: string[] }> {
  const blocker = await pool.connect();
  const originalConnect = pool.connect.bind(pool);
  let transactionOpen = false;
  let blockedStatements: string[] | undefined;
  let connectSpy: ReturnType<typeof vi.spyOn> | undefined;
  try {
    await blocker.query('BEGIN');
    transactionOpen = true;
    await blocker.query('SELECT 1 FROM users WHERE id = $1 FOR NO KEY UPDATE', [options.userId]);

    connectSpy = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
      // pool.query leases through the callback overload; leave it untouched so
      // only explicit transaction leases are observed.
      if (typeof callback === 'function') return originalConnect(callback as never);
      return originalConnect().then((client: PoolClient) => {
        const statements: string[] = [];
        const mutable = client as unknown as {
          query: (...args: unknown[]) => unknown;
          release: (error?: Error | boolean) => void;
        };
        const actualQuery = mutable.query;
        const actualRelease = mutable.release;
        mutable.query = (query: unknown, ...args: unknown[]) => {
          const text = typeof query === 'string' ? query : (query as { text?: unknown } | null)?.text;
          if (typeof text === 'string') statements.push(text);
          if (text === options.parentLock) blockedStatements = statements;
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

    const responsePromise = Promise.resolve(options.startRequest());
    await vi.waitFor(
      () => {
        expect(blockedStatements).toBeDefined();
      },
      { timeout: 15_000, interval: 10 },
    );
    await options.mutateBeforeRelease(blocker);
    await blocker.query('COMMIT');
    transactionOpen = false;
    return { response: await responsePromise, statements: blockedStatements! };
  } finally {
    connectSpy?.mockRestore();
    if (transactionOpen) await blocker.query('ROLLBACK');
    blocker.release();
  }
}

async function accountRemnants(userId: string) {
  const { rows } = await pool.query<{ users: number; state: number; attempts: number }>(
    `SELECT
       (SELECT count(*)::int FROM users WHERE id = $1) AS users,
       (SELECT count(*)::int FROM diagnostic_state WHERE user_id = $1) AS state,
       (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS attempts`,
    [userId],
  );
  return rows[0];
}

describe('diagnostic finalization ownership', () => {
  it('rejects a replacement processing claim after the answer is claimed', async () => {
    const { token, userId } = await registerDiagnosticUser();
    const questionId = await assignB1Question(userId);
    const requestId = randomUUID();
    const replacement = randomUUID();
    const triggerName = `test_change_diagnostic_claim_${randomUUID().replaceAll('-', '')}`;
    const functionName = `${triggerName}_fn`;
    await withTemporaryDatabaseArtifacts(
      [
        {
          text: `
            CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.user_id = '${userId}'::uuid THEN
                UPDATE diagnostic_state SET processing_claim_id = '${replacement}' WHERE user_id = NEW.user_id;
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
        {
          text: `UPDATE diagnostic_state
                   SET current_question_id = NULL, processing_question_id = NULL,
                       processing_started_at = NULL, processing_claim_id = NULL
                   WHERE user_id = $1`,
          values: [userId],
        },
      ],
      async () => {
        const response = await fixedRequestForm(token, questionId, requestId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
        expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
        const state = await pool.query<{
          current_question_id: string | null;
          processing_question_id: string | null;
          processing_claim_id: string | null;
        }>(
          `SELECT current_question_id, processing_question_id, processing_claim_id
             FROM diagnostic_state WHERE user_id = $1`,
          [userId],
        );
        expect(state.rows[0]).toEqual({
          current_question_id: questionId,
          processing_question_id: questionId,
          processing_claim_id: replacement,
        });
      },
    );
  });

  it.each([
    ['processing question', 'processing_question_id'],
    ['current question', 'current_question_id'],
  ] as const)('rejects an independently corrupted %s during finalization', async (_caseName, column) => {
    const { token, userId } = await registerDiagnosticUser();
    const questionId = await assignB1Question(userId);
    const replacementQuestion = await pool.query<{ id: string }>(
      'SELECT id FROM questions WHERE id <> $1 ORDER BY id LIMIT 1',
      [questionId],
    );
    expect(replacementQuestion.rows[0]).toEqual({ id: expect.any(String) });
    const replacementQuestionId = replacementQuestion.rows[0].id;
    const requestId = randomUUID();
    const triggerName = `test_corrupt_${column}_${randomUUID().replaceAll('-', '')}`;
    const functionName = `${triggerName}_fn`;

    await withTemporaryDatabaseArtifacts(
      [
        {
          text: `ALTER TABLE diagnostic_state
                 DROP CONSTRAINT diagnostic_state_processing_current_check`,
        },
        {
          text: `
            CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.user_id = '${userId}'::uuid THEN
                UPDATE diagnostic_state
                   SET ${column} = '${replacementQuestionId}'::uuid
                 WHERE user_id = NEW.user_id;
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
        {
          text: `UPDATE diagnostic_state
                   SET current_question_id = NULL, processing_question_id = NULL,
                       processing_started_at = NULL, processing_claim_id = NULL
                 WHERE user_id = $1`,
          values: [userId],
        },
        {
          text: `ALTER TABLE diagnostic_state
                 ADD CONSTRAINT diagnostic_state_processing_current_check CHECK (
                   processing_question_id IS NULL OR processing_question_id = current_question_id
                 )`,
        },
      ],
      async () => {
        const response = await fixedRequestForm(token, questionId, requestId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
        expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
        const state = await pool.query<{
          current_question_id: string | null;
          processing_question_id: string | null;
          processing_claim_id: string | null;
        }>(
          `SELECT current_question_id, processing_question_id, processing_claim_id
             FROM diagnostic_state WHERE user_id = $1`,
          [userId],
        );
        expect(state.rows[0]).toEqual({
          current_question_id: column === 'current_question_id' ? replacementQuestionId : questionId,
          processing_question_id: null,
          processing_claim_id: null,
        });
      },
    );
  });

  it('finishes on answer five while the adaptive search window remains open', async () => {
    const { token, userId } = await registerDiagnosticUser();
    const questionId = await assignB1Question(userId);
    const primed = await pool.query(
      `UPDATE diagnostic_state
       SET low_idx = 0, high_idx = 5, questions_asked = 4, current_question_id = $1
       WHERE user_id = $2`,
      [questionId, userId],
    );
    expect(primed.rowCount).toBe(1);

    const response = await fixedRequestForm(token, questionId, randomUUID());

    expect(response.status).toBe(200);
    expect(response.body.done).toBe(true);
    expect(response.body.nextQuestion).toBeUndefined();
    const finalized = await pool.query<{
      questions_asked: number;
      low_idx: number;
      high_idx: number;
      diagnostic_completed: boolean;
    }>(
      `SELECT d.questions_asked, d.low_idx, d.high_idx, u.diagnostic_completed
       FROM diagnostic_state d JOIN users u ON u.id = d.user_id
       WHERE d.user_id = $1`,
      [userId],
    );
    expect(finalized.rows[0].questions_asked).toBe(5);
    expect(finalized.rows[0].low_idx).toBeLessThanOrEqual(finalized.rows[0].high_idx);
    expect(finalized.rows[0].diagnostic_completed).toBe(true);
  });
});

describe('diagnostic adaptive catalog state', () => {
  it('returns the stable catalog error when the adaptive next level has no questions', async () => {
    const { token, userId } = await registerDiagnosticUser();
    const questionId = await assignB1Question(userId);
    const requestId = randomUUID();
    const triggerName = `test_hide_next_level_${randomUUID().replaceAll('-', '')}`;
    const functionName = `${triggerName}_fn`;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const nextLevelQuestions = await pool.query<{ id: string; prompt_word: string }>(
      "SELECT id, prompt_word FROM questions WHERE cefr_level = 'C1'",
    );
    const nextLevelQuestionIds = nextLevelQuestions.rows.map(({ id }) => id);
    const nextLevelPromptWords = nextLevelQuestions.rows.map(({ prompt_word }) => prompt_word);
    expect(nextLevelQuestionIds.length).toBeGreaterThan(0);

    try {
      await withTemporaryDatabaseArtifacts(
        [
          {
            text: `
              CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
              BEGIN
                IF NEW.context = 'diagnostic' AND NEW.user_id = '${userId}'::uuid THEN
                  UPDATE questions
                  SET cefr_level = 'C2', prompt_word = 'test-' || id::text
                  WHERE cefr_level = 'C1';
                END IF;
                RETURN NEW;
              END $$
            `,
          },
          {
            text: `
              CREATE TRIGGER ${triggerName}
              AFTER INSERT ON attempts
              FOR EACH ROW EXECUTE FUNCTION ${functionName}()
            `,
          },
        ],
        [
          { text: `DROP TRIGGER IF EXISTS ${triggerName} ON attempts` },
          { text: `DROP FUNCTION IF EXISTS ${functionName}()` },
          {
            text: `
              UPDATE questions q
              SET cefr_level = 'C1', prompt_word = restored.prompt_word
              FROM unnest($1::uuid[], $2::text[]) AS restored(id, prompt_word)
              WHERE q.id = restored.id
            `,
            values: [nextLevelQuestionIds, nextLevelPromptWords],
          },
        ],
        async () => {
          const response = await fixedRequestForm(token, questionId, requestId);

          expect(response.status).toBe(500);
          expect(response.body).toEqual({ error: 'No questions available for this level', code: 'INTERNAL' });
          expect(await routeArtifacts(userId, requestId)).toEqual({ attempts: 0, requests: 0 });
        },
      );
    } finally {
      random.mockRestore();
    }
  });
});

describe('diagnostic question availability', () => {
  it('returns the stable error when the initial diagnostic level has no questions', async () => {
    const { token } = await registerDiagnosticUser();
    const questions = await pool.query<{ id: string; prompt_word: string }>(
      "SELECT id, prompt_word FROM questions WHERE cefr_level = 'B1'",
    );
    const questionIds = questions.rows.map(({ id }) => id);
    const promptWords = questions.rows.map(({ prompt_word }) => prompt_word);
    expect(questionIds.length).toBeGreaterThan(0);

    await withTemporaryDatabaseArtifacts(
      [
        {
          text: `
            UPDATE questions
            SET cefr_level = 'C2', prompt_word = 'test-' || id::text
            WHERE id = ANY($1::uuid[])
          `,
          values: [questionIds],
        },
      ],
      [
        {
          text: `
            UPDATE questions q
            SET cefr_level = 'B1', prompt_word = restored.prompt_word
            FROM unnest($1::uuid[], $2::text[]) AS restored(id, prompt_word)
            WHERE q.id = restored.id
          `,
          values: [questionIds, promptWords],
        },
      ],
      async () => {
        const response = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'No questions available for this level', code: 'INTERNAL' });
      },
    );
  });
});

describe('diagnostic completion race', () => {
  // requireAuth read diagnostic_completed before the transaction, so only the
  // locked users row can tell GET /next that the last answer just finished.
  // Both terminal windows below are unservable: low_idx > high_idx makes the
  // midpoint index LEVELS out of range (all answers failed) or point past the
  // finished search (all answers passed).
  it.each([
    ['every answer failed', 0, -1, 'A1'],
    ['every answer passed', 6, 5, 'C2'],
  ] as const)(
    'GET /next reports the placement when finalization of a %s diagnostic commits during its lock wait',
    async (_caseName, lowIdx, highIdx, level) => {
      const { token, userId } = await registerDiagnosticUser();

      const { response, statements } = await withUsersRowRace({
        userId,
        parentLock: NEXT_PARENT_LOCK,
        startRequest: () => request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`),
        mutateBeforeRelease: async (blocker) => {
          await blocker.query(
            `UPDATE diagnostic_state
             SET low_idx = $1, high_idx = $2, questions_asked = 3, current_question_id = NULL
             WHERE user_id = $3`,
            [lowIdx, highIdx, userId],
          );
          await blocker.query('UPDATE users SET cefr_level = $1, diagnostic_completed = true WHERE id = $2', [
            level,
            userId,
          ]);
        },
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ done: true, level });
      // The terminal state is never read or written: the locked users row
      // answers, and the transaction commits its lock release straight away.
      expect(statements).toEqual(['BEGIN', NEXT_PARENT_LOCK, 'COMMIT']);
      // No phantom question may be parked on the finished diagnostic: /answer
      // could only ever reject it with 400 DIAGNOSTIC_DONE.
      const state = await pool.query<{ current_question_id: string | null }>(
        'SELECT current_question_id FROM diagnostic_state WHERE user_id = $1',
        [userId],
      );
      expect(state.rows[0]).toEqual({ current_question_id: null });
    },
  );
});

describe('diagnostic account deletion races', () => {
  // A concurrent DELETE /auth/account commits while the route waits on its
  // parent lock. Every diagnostic writer must report the state change instead
  // of letting lockState re-insert diagnostic_state into a foreign-key
  // violation that the error handler can only answer as a 500.
  it('GET /next answers 409 when the account is deleted during its lock wait', async () => {
    const { token, userId } = await registerDiagnosticUser();

    const { response, statements } = await withUsersRowRace({
      userId,
      parentLock: NEXT_PARENT_LOCK,
      startRequest: () => request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`),
      mutateBeforeRelease: (blocker) => blocker.query('DELETE FROM users WHERE id = $1', [userId]),
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(statements).toEqual(['BEGIN', NEXT_PARENT_LOCK, 'ROLLBACK']);
    expect(await accountRemnants(userId)).toEqual({ users: 0, state: 0, attempts: 0 });
  });

  it('POST /restart answers 409 when the account is deleted during its lock wait', async () => {
    const { token, userId } = await registerDiagnosticUser();

    const { response, statements } = await withUsersRowRace({
      userId,
      parentLock: WRITER_PARENT_LOCK,
      startRequest: () =>
        request(a).post('/diagnostic/restart').set('Authorization', `Bearer ${token}`).send({ confirm: true }),
      mutateBeforeRelease: (blocker) => blocker.query('DELETE FROM users WHERE id = $1', [userId]),
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(statements).toEqual(['BEGIN', WRITER_PARENT_LOCK, 'ROLLBACK']);
    expect(await accountRemnants(userId)).toEqual({ users: 0, state: 0, attempts: 0 });
  });

  it('POST /answer answers 409 when the account is deleted before finalization', async () => {
    const { token, userId } = await registerDiagnosticUser();
    const questionId = await assignB1Question(userId);
    const requestId = randomUUID();

    const { response, statements } = await withUsersRowRace({
      userId,
      parentLock: WRITER_PARENT_LOCK,
      startRequest: () => fixedRequestForm(token, questionId, requestId),
      mutateBeforeRelease: (blocker) => blocker.query('DELETE FROM users WHERE id = $1', [userId]),
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    // Finalization stops at the parent lock: no attempt row, no diagnostic_state
    // re-insert, and therefore no foreign-key violation to answer as a 500.
    expect(statements).toEqual(['BEGIN', WRITER_PARENT_LOCK, 'ROLLBACK']);
    expect(await accountRemnants(userId)).toEqual({ users: 0, state: 0, attempts: 0 });
  });
});
