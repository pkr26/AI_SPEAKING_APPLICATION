import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import type { PoolClient } from 'pg';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { logger } from '../src/logger';
import { answerForm, app, fakeM4aBuffer, pool, registerUser, completeDiagnostic } from './helpers';

// Optional parked-assess seam (same shape as tests/audio-upload-s3.test.ts):
// disabled by default so every other test in this file keeps the real
// MOCK_AI pipeline, and enabled only inside the body of the test that needs
// the provider call to reject.
const routeAssess = vi.hoisted(() => ({ useMock: false, assess: vi.fn() }));

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return {
    ...actual,
    assessSpeaking: (...args: Parameters<typeof actual.assessSpeaking>) =>
      routeAssess.useMock ? routeAssess.assess(...args) : actual.assessSpeaking(...args),
  };
});

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

async function routeArtifacts(userId: string, requestId: string, context: 'diagnostic' | 'practice') {
  const { rows } = await pool.query<RouteArtifacts>(
    `SELECT
       (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = $3) AS attempts,
       (SELECT count(*)::int FROM assessment_requests WHERE user_id = $1 AND request_id = $2) AS requests`,
    [userId, requestId, context],
  );
  return rows[0];
}

function fixedRequestForm(
  path: '/diagnostic/answer' | '/practice/attempt',
  token: string,
  questionId: string,
  requestId: string,
) {
  return request(a)
    .post(path)
    .set('Authorization', `Bearer ${token}`)
    .attach('audio', fakeM4aBuffer(), {
      filename: 'answer.m4a',
      contentType: 'audio/mp4',
    })
    .field('questionId', questionId)
    .field('requestId', requestId);
}

async function registerInitialDiagnosticQuestion(): Promise<{
  token: string;
  userId: string;
  questionId: string;
}> {
  const { res } = await registerUser(a);
  expect(res.status).toBe(201);
  expect(res.body).toEqual(
    expect.objectContaining({
      token: expect.any(String),
      user: expect.objectContaining({ id: expect.any(String) }),
    }),
  );
  const token = res.body.token as string;
  const userId = res.body.user.id as string;
  const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
  expect(next.status).toBe(200);
  expect(next.body).toEqual(
    expect.objectContaining({ done: false, question: expect.objectContaining({ id: expect.any(String) }) }),
  );
  return { token, userId, questionId: next.body.question.id as string };
}

/**
 * Commit a user-state mutation after the generic assessment-request claim has
 * committed but before the route takes its diagnostic question claim.
 */
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

describe('diagnostic user-state handoff gaps', () => {
  it('abandons the request when account deletion lands between request claim and question claim', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();

    const response = await withMutationAfterRequestClaim(
      () => pool.query('DELETE FROM users WHERE id = $1', [userId]),
      () => fixedRequestForm('/diagnostic/answer', token, questionId, requestId),
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
    expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
    const remnants = await pool.query<{ users: number; state: number }>(
      `SELECT
         (SELECT count(*)::int FROM users WHERE id = $1) AS users,
         (SELECT count(*)::int FROM diagnostic_state WHERE user_id = $1) AS state`,
      [userId],
    );
    expect(remnants.rows[0]).toEqual({ users: 0, state: 0 });
  });

  it('abandons the request when completion lands between request claim and question claim', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();

    const response = await withMutationAfterRequestClaim(
      () => pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [userId]),
      () => fixedRequestForm('/diagnostic/answer', token, questionId, requestId),
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Diagnostic already completed', code: 'DIAGNOSTIC_DONE' });
    expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
    const state = await pool.query<{ processing_claim_id: string | null }>(
      'SELECT processing_claim_id FROM diagnostic_state WHERE user_id = $1',
      [userId],
    );
    expect(state.rows[0]).toEqual({ processing_claim_id: null });
  });

  it('rolls back persistence when account deletion lands after the provider result', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();
    const triggerName = `test_delete_diagnostic_provider_owner_${randomUUID().replaceAll('-', '')}`;
    const functionName = `${triggerName}_fn`;

    await withTemporaryDatabaseArtifacts(
      [
        {
          text: `
            CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.user_id = '${userId}'::uuid THEN
                DELETE FROM users WHERE id = NEW.user_id;
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
        const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
        expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
        const user = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
        expect(user.rowCount).toBe(0);
      },
    );
  });
});

describe('diagnostic failure cleanup', () => {
  it('abandons the request and clears the durable question claim after assessment fails', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();
    const triggerName = `test_fail_diagnostic_attempt_${randomUUID().replaceAll('-', '')}`;
    const functionName = `${triggerName}_fn`;

    await withTemporaryDatabaseArtifacts(
      [
        {
          text: `
            CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              IF NEW.context = 'diagnostic' AND NEW.user_id = '${userId}'::uuid THEN
                RAISE EXCEPTION 'forced diagnostic attempt failure';
              END IF;
              RETURN NEW;
            END $$
          `,
        },
        {
          text: `
            CREATE TRIGGER ${triggerName}
            BEFORE INSERT ON attempts
            FOR EACH ROW EXECUTE FUNCTION ${functionName}()
          `,
        },
      ],
      [
        { text: `DROP TRIGGER IF EXISTS ${triggerName} ON attempts` },
        { text: `DROP FUNCTION IF EXISTS ${functionName}()` },
      ],
      async () => {
        const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
        expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
        const state = await pool.query(
          `SELECT current_question_id, processing_question_id, processing_started_at, processing_claim_id
           FROM diagnostic_state WHERE user_id = $1`,
          [userId],
        );
        expect(state.rows[0]).toEqual({
          current_question_id: questionId,
          processing_question_id: null,
          processing_started_at: null,
          processing_claim_id: null,
        });
      },
    );
  });

  it('logs exact ownership context when clearing a failed diagnostic claim also fails', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();
    const attemptTrigger = `test_fail_diagnostic_attempt_${randomUUID().replaceAll('-', '')}`;
    const attemptFunction = `${attemptTrigger}_fn`;
    const cleanupTrigger = `test_fail_diagnostic_cleanup_${randomUUID().replaceAll('-', '')}`;
    const cleanupFunction = `${cleanupTrigger}_fn`;
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {
      throw new Error('warning logger failed');
    });

    try {
      await withTemporaryDatabaseArtifacts(
        [
          {
            text: `
              CREATE FUNCTION ${attemptFunction}() RETURNS trigger LANGUAGE plpgsql AS $$
              BEGIN
                IF NEW.context = 'diagnostic' AND NEW.user_id = '${userId}'::uuid THEN
                  RAISE EXCEPTION 'forced diagnostic attempt failure';
                END IF;
                RETURN NEW;
              END $$
            `,
          },
          {
            text: `
              CREATE TRIGGER ${attemptTrigger}
              BEFORE INSERT ON attempts
              FOR EACH ROW EXECUTE FUNCTION ${attemptFunction}()
            `,
          },
          {
            text: `
              CREATE FUNCTION ${cleanupFunction}() RETURNS trigger LANGUAGE plpgsql AS $$
              BEGIN
                IF OLD.user_id = '${userId}'::uuid
                   AND OLD.processing_claim_id IS NOT NULL
                   AND NEW.processing_claim_id IS NULL THEN
                  RAISE EXCEPTION 'forced diagnostic claim cleanup failure';
                END IF;
                RETURN NEW;
              END $$
            `,
          },
          {
            text: `
              CREATE TRIGGER ${cleanupTrigger}
              BEFORE UPDATE OF processing_claim_id ON diagnostic_state
              FOR EACH ROW EXECUTE FUNCTION ${cleanupFunction}()
            `,
          },
        ],
        [
          { text: `DROP TRIGGER IF EXISTS ${attemptTrigger} ON attempts` },
          { text: `DROP FUNCTION IF EXISTS ${attemptFunction}()` },
          { text: `DROP TRIGGER IF EXISTS ${cleanupTrigger} ON diagnostic_state` },
          { text: `DROP FUNCTION IF EXISTS ${cleanupFunction}()` },
          {
            text: `UPDATE diagnostic_state
                     SET processing_question_id = NULL, processing_started_at = NULL, processing_claim_id = NULL
                   WHERE user_id = $1`,
            values: [userId],
          },
        ],
        async () => {
          const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

          expect(response.status).toBe(500);
          expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
          expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
          const state = await pool.query<{ processing_claim_id: string }>(
            'SELECT processing_claim_id FROM diagnostic_state WHERE user_id = $1',
            [userId],
          );
          const claimId = state.rows[0].processing_claim_id;
          expect(claimId).toEqual(expect.any(String));

          const cleanupWarning = warn.mock.calls.find(
            ([, message]) => message === 'failed to clear diagnostic assessment claim',
          );
          expect(cleanupWarning).toBeDefined();
          expect(cleanupWarning?.[0]).toEqual({
            err: expect.objectContaining({ message: 'forced diagnostic claim cleanup failure' }),
            userId,
            claimId,
          });
        },
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('does not issue a diagnostic-claim cleanup statement before a claim exists', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();
    const auditTable = `test_diagnostic_cleanup_audit_${randomUUID().replaceAll('-', '')}`;
    const auditTrigger = `test_diagnostic_cleanup_stmt_${randomUUID().replaceAll('-', '')}`;
    const auditFunction = `${auditTrigger}_fn`;

    await withTemporaryDatabaseArtifacts(
      [
        { text: `CREATE TABLE ${auditTable} (calls integer NOT NULL)` },
        { text: `INSERT INTO ${auditTable} VALUES (0)` },
        {
          text: `
            CREATE FUNCTION ${auditFunction}() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
              UPDATE ${auditTable} SET calls = calls + 1;
              RETURN NULL;
            END $$
          `,
        },
        {
          text: `
            CREATE TRIGGER ${auditTrigger}
            AFTER UPDATE ON diagnostic_state
            FOR EACH ROW
            WHEN (OLD.user_id = '${userId}'::uuid)
            EXECUTE FUNCTION ${auditFunction}()
          `,
        },
      ],
      [
        { text: `DROP TRIGGER IF EXISTS ${auditTrigger} ON diagnostic_state` },
        { text: `DROP FUNCTION IF EXISTS ${auditFunction}()` },
        { text: `DROP TABLE IF EXISTS ${auditTable}` },
      ],
      async () => {
        const response = await request(a)
          .post('/diagnostic/answer')
          .set('Authorization', `Bearer ${token}`)
          .field('questionId', questionId)
          .field('requestId', requestId);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'audio file is required', code: 'VALIDATION_FAILED' });
        const audit = await pool.query<{ calls: number }>(`SELECT calls FROM ${auditTable}`);
        expect(audit.rows[0].calls).toBe(0);
        expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
      },
    );
  });

  it('does not redundantly abandon an assessment request after successful completion', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();
    const auditTable = `test_diagnostic_abandon_audit_${randomUUID().replaceAll('-', '')}`;
    const auditTrigger = `test_diagnostic_abandon_stmt_${randomUUID().replaceAll('-', '')}`;
    const auditFunction = `${auditTrigger}_fn`;
    const unlink = vi.spyOn(fs, 'unlink');

    try {
      await withTemporaryDatabaseArtifacts(
        [
          { text: `CREATE TABLE ${auditTable} (calls integer NOT NULL)` },
          { text: `INSERT INTO ${auditTable} VALUES (0)` },
          {
            text: `
              CREATE FUNCTION ${auditFunction}() RETURNS trigger LANGUAGE plpgsql AS $$
              BEGIN
                UPDATE ${auditTable} SET calls = calls + 1;
                RETURN NULL;
              END $$
            `,
          },
          {
            text: `
              CREATE TRIGGER ${auditTrigger}
              AFTER DELETE ON assessment_requests
              FOR EACH ROW
              WHEN (OLD.user_id = '${userId}'::uuid AND OLD.request_id = '${requestId}'::uuid)
              EXECUTE FUNCTION ${auditFunction}()
            `,
          },
        ],
        [
          { text: `DROP TRIGGER IF EXISTS ${auditTrigger} ON assessment_requests` },
          { text: `DROP FUNCTION IF EXISTS ${auditFunction}()` },
          { text: `DROP TABLE IF EXISTS ${auditTable}` },
        ],
        async () => {
          const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

          expect(response.status).toBe(200);
          // The response can finish before the handler's async finally blocks.
          // File deletion is the final local-mode cleanup step, so observing it
          // keeps the audit trigger installed until a mutant's abandon call
          // would have executed.
          await vi.waitFor(() => expect(unlink).toHaveBeenCalledOnce());
          const audit = await pool.query<{ calls: number }>(`SELECT calls FROM ${auditTable}`);
          // The trigger is scoped to exactly this (user, request) row so
          // parallel vitest workers deleting their own assessment requests on
          // the shared database can never perturb the count. Nothing may
          // delete this completed request: claimAssessmentRequest's stale-row
          // cleanup removes no live row, so a redundant
          // abandonAssessmentRequest (a mutant) is the only way to reach 1.
          expect(audit.rows[0].calls).toBe(0);
          expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 1, requests: 1 });
        },
      );
    } finally {
      unlink.mockRestore();
    }
  });
});

describe('assessment request completion flag', () => {
  it('abandons the durable request when the assess call rejects, keeping the requestId retryable', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();
    routeAssess.assess.mockRejectedValueOnce(new Error('forced provider failure'));
    routeAssess.useMock = true;
    let failed: Awaited<ReturnType<typeof fixedRequestForm>>;
    try {
      failed = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);
    } finally {
      routeAssess.useMock = false;
    }

    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
    // The not-completed submission must abandon its durable request claim so
    // the same logical requestId stays retryable instead of parking a lease.
    expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });

    const retried = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);
    expect(retried.status).toBe(200);
    expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 1, requests: 1 });
    const status = await pool.query<{ status: string }>(
      'SELECT status FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(status.rows).toEqual([{ status: 'completed' }]);
  });

  it('keeps a successful submission as the single completed durable request', async () => {
    const { token, userId, questionId } = await registerInitialDiagnosticQuestion();
    const requestId = randomUUID();

    const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

    expect(response.status).toBe(200);
    expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 1, requests: 1 });
    const status = await pool.query<{ status: string }>(
      'SELECT status FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(status.rows).toEqual([{ status: 'completed' }]);
  });
});

describe('practice submission cycle binding', () => {
  async function practiceQuestionAtLearnerLevel(token: string): Promise<{ questionId: string; cycleId: string }> {
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    return { questionId: next.body.question.id as string, cycleId: next.body.cycleId as string };
  }

  async function completedDiagnosticLearner(): Promise<string> {
    const { res: registered } = await registerUser(a);
    expect(registered.status).toBe(201);
    const token = registered.body.token as string;
    await completeDiagnostic(a, token);
    return token;
  }

  it('rejects a malformed multipart cycleId with the exact schema message', async () => {
    const token = await completedDiagnosticLearner();
    const { questionId } = await practiceQuestionAtLearnerLevel(token);
    const requestId = randomUUID();

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
      requestId,
      'not-a-uuid',
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'cycleId: cycleId must be a valid UUID', code: 'VALIDATION_FAILED' });
  });

  it('rejects a well-formed foreign cycleId with PRACTICE_CYCLE_CLOSED even at the learner level', async () => {
    const token = await completedDiagnosticLearner();
    const { questionId } = await practiceQuestionAtLearnerLevel(token);
    const requestId = randomUUID();

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
      requestId,
      randomUUID(),
    );

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });
  });
});
