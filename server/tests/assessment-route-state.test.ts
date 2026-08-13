import { randomUUID } from 'crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
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
    expect(response.body).toEqual({ error: 'Diagnostic not completed' });
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
        expect(response.body).toEqual({ error: 'Internal server error' });
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
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again' });
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
        expect(response.body).toEqual({ error: 'Assessment state changed; please try again' });
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
