import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  claimAssessmentRequest,
  completeAssessmentRequest,
  getAssessmentRequestStatus,
} from '../src/idempotency';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('claimAssessmentRequest ownership and replay', () => {
  const a = app();
  let userId: string;
  let questionId: string;
  let otherQuestionId: string;

  beforeAll(async () => {
    const { res } = await registerUser(a);
    userId = res.body.user.id;
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM questions ORDER BY id LIMIT 2');
    [questionId, otherQuestionId] = [rows[0].id, rows[1].id];
  });

  it('rejects reuse of the same requestId for a different question or context', async () => {
    const requestId = randomUUID();
    const claim = await claimAssessmentRequest(userId, requestId, 'practice', questionId);
    expect(claim.kind).toBe('claimed');

    await expect(claimAssessmentRequest(userId, requestId, 'practice', otherQuestionId)).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
    });
    await expect(claimAssessmentRequest(userId, requestId, 'diagnostic', questionId)).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
    });
    // A different user can still use the same request UUID independently.
    const other = await registerUser(a);
    await expect(
      claimAssessmentRequest(other.res.body.user.id, requestId, 'practice', questionId),
    ).resolves.toMatchObject({ kind: 'claimed' });
  });

  it('returns 409 while a matching request is still processing', async () => {
    const requestId = randomUUID();
    await claimAssessmentRequest(userId, requestId, 'practice', questionId);
    await expect(claimAssessmentRequest(userId, requestId, 'practice', questionId)).rejects.toMatchObject({
      status: 409,
      message: 'Assessment is still processing',
      extra: { retryAfterSeconds: 2 },
    });
  });

  it('replays the stored response for a completed request', async () => {
    const withBody = randomUUID();
    const claim = await claimAssessmentRequest(userId, withBody, 'practice', questionId);
    if (claim.kind !== 'claimed') throw new Error('expected a fresh claim');
    await completeAssessmentRequest(pool, userId, withBody, claim.claimId, { passed: true, score: 91 });

    const replay = await claimAssessmentRequest(userId, withBody, 'practice', questionId);
    expect(replay).toEqual({ kind: 'completed', response: { passed: true, score: 91 } });

    // NOTE: a completed row without a response body is rejected by the
    // assessment_requests_response_check constraint, so the corresponding
    // defensive branches in claimAssessmentRequest / getAssessmentRequestStatus
    // are not reachable through the database.
    const status = await getAssessmentRequestStatus(userId, withBody);
    expect(status).toEqual({
      status: 'completed',
      context: 'practice',
      questionId,
      response: { passed: true, score: 91 },
    });
  });
});
