import { randomUUID } from 'crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
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

let a: ReturnType<typeof app>;

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

function fixedPracticeRequest(token: string, questionId: string, requestId: string) {
  return request(a)
    .post('/practice/attempt')
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
    const requestId = randomUUID();
    const attempt = await fixedPracticeRequest(token, question.rows[0].id, requestId);
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

    const response = await fixedPracticeRequest(token, questionId, requestId);

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
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);
    expect(question.rows[0]).toEqual({ id: expect.any(String) });
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
        const response = await fixedPracticeRequest(token, questionId, requestId);

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
