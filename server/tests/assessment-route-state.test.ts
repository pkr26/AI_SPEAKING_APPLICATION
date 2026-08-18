import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { logger } from '../src/logger';
import { app, fakeM4aBuffer, pool, registerUser } from './helpers';

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
});
