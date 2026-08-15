import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { logger } from '../src/logger';
import { app, completeDiagnostic, pool, registerUser } from './helpers';

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
    .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
      filename: 'answer.m4a',
      contentType: 'audio/mp4',
    })
    .field('questionId', questionId)
    .field('requestId', requestId);
}

describe('practice eligibility state', () => {
  it('rejects an incomplete diagnostic even when a CEFR level is present', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    await pool.query("UPDATE users SET diagnostic_completed = false, cefr_level = 'A1' WHERE id = $1", [
      res.body.user.id,
    ]);

    const response = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });
  });
});

describe('diagnostic failure cleanup', () => {
  it('abandons the request and clears the durable question claim after assessment fails', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
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
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
    const requestId = randomUUID();
    const attemptTrigger = `test_fail_diagnostic_attempt_${randomUUID().replaceAll('-', '')}`;
    const attemptFunction = `${attemptTrigger}_fn`;
    const cleanupTrigger = `test_fail_diagnostic_cleanup_${randomUUID().replaceAll('-', '')}`;
    const cleanupFunction = `${cleanupTrigger}_fn`;
    const warn = vi.spyOn(logger, 'warn');

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
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
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
            FOR EACH STATEMENT EXECUTE FUNCTION ${auditFunction}()
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
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
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
              FOR EACH STATEMENT EXECUTE FUNCTION ${auditFunction}()
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
          // claimAssessmentRequest performs one stale-row cleanup. A successful
          // route must not run abandonAssessmentRequest as a second DELETE.
          expect(audit.rows[0].calls).toBe(1);
          expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 1, requests: 1 });
        },
      );
    } finally {
      unlink.mockRestore();
    }
  });

  it('returns the stable catalog error when the adaptive next level has no questions', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
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
          expect(next.body.question.cefrLevel).toBe('B1');
          const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

          expect(response.status).toBe(500);
          expect(response.body).toEqual({ error: 'No questions available for this level', code: 'INTERNAL' });
          expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
        },
      );
    } finally {
      random.mockRestore();
    }
  });
});

describe('diagnostic question availability', () => {
  it('returns the stable error when the initial diagnostic level has no questions', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
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

describe('diagnostic finalization ownership', () => {
  it('rejects a replacement processing claim after the answer is claimed', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
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
        const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
        expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
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
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
    const replacementQuestion = await pool.query<{ id: string }>(
      'SELECT id FROM questions WHERE id <> $1 ORDER BY id LIMIT 1',
      [questionId],
    );
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
        const response = await fixedRequestForm('/diagnostic/answer', token, questionId, requestId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
        expect(await routeArtifacts(userId, requestId, 'diagnostic')).toEqual({ attempts: 0, requests: 0 });
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
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const question = await pool.query<{ id: string }>("SELECT id FROM questions WHERE cefr_level = 'B1' LIMIT 1");
    const questionId = question.rows[0].id;
    await pool.query(
      `UPDATE diagnostic_state
       SET low_idx = 0, high_idx = 5, questions_asked = 4, current_question_id = $1
       WHERE user_id = $2`,
      [questionId, userId],
    );

    const response = await fixedRequestForm('/diagnostic/answer', token, questionId, randomUUID());

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

describe('practice finalization and cleanup', () => {
  it('rolls back and abandons the request when ownership changes before finalization', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);
    const questionId = question.rows[0].id;
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
        const response = await fixedRequestForm('/practice/attempt', token, questionId, requestId);

        expect(response.status).toBe(409);
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
        expect(await routeArtifacts(userId, requestId, 'practice')).toEqual({ attempts: 0, requests: 0 });
        const inflight = await pool.query(
          'SELECT count(*)::int AS count FROM practice_inflight WHERE user_id = $1 AND question_id = $2',
          [userId, questionId],
        );
        expect(inflight.rows[0].count).toBe(0);
      },
    );
  });
});
