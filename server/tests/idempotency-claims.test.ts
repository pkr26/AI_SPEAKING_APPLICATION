import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import {
  AssessmentRequestInFlightError,
  claimAssessmentRequest,
  completeAssessmentRequest,
  getAssessmentRequestStatus,
} from '../src/idempotency';
import { HttpError } from '../src/middleware';
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

    const differentQuestion = claimAssessmentRequest(userId, requestId, 'practice', otherQuestionId);
    await expect(differentQuestion).rejects.toBeInstanceOf(AssessmentRequestInFlightError);
    await expect(differentQuestion).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
    });
    const differentContext = claimAssessmentRequest(userId, requestId, 'diagnostic', questionId);
    await expect(differentContext).rejects.toBeInstanceOf(AssessmentRequestInFlightError);
    await expect(differentContext).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
    });
    // A different user can still use the same request UUID independently.
    const other = await registerUser(a);
    await expect(
      claimAssessmentRequest(other.res.body.user.id, requestId, 'practice', questionId),
    ).resolves.toMatchObject({ kind: 'claimed' });
  });

  it('treats completed identifier reuse as a definitive conflict, not an in-flight owner', async () => {
    const requestId = randomUUID();
    const claim = await claimAssessmentRequest(userId, requestId, 'practice', questionId);
    if (claim.kind !== 'claimed') throw new Error('expected a fresh claim');
    await completeAssessmentRequest(pool, userId, requestId, claim.claimId, { passed: true });

    const collision = claimAssessmentRequest(userId, requestId, 'practice', otherQuestionId);
    await expect(collision).rejects.toBeInstanceOf(HttpError);
    await expect(collision).rejects.not.toBeInstanceOf(AssessmentRequestInFlightError);
    await expect(collision).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
    });
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

  it('commits and releases the transaction used to replay a completed request', async () => {
    const requestId = randomUUID();
    const response = { passed: true, score: 88 };
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [
            {
              context: 'practice',
              question_id: questionId,
              status: 'completed',
              response_body: response,
            },
          ],
        })
        .mockResolvedValueOnce(undefined),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      await expect(claimAssessmentRequest(userId, requestId, 'practice', questionId)).resolves.toEqual({
        kind: 'completed',
        response,
      });

      expect(client.query.mock.calls[0][0]).toBe('BEGIN');
      expect(client.query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it('returns a stable 409 when the conflicting row disappears during an insert race', async () => {
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN' || text === 'ROLLBACK') return undefined;
        if (text.includes('DELETE FROM assessment_requests')) return { rowCount: 0 };
        if (text.includes('INSERT INTO assessment_requests')) return { rowCount: 0 };
        if (text.includes('SELECT context, question_id, status, response_body')) return { rows: [] };
        throw new Error(`unexpected query: ${text}`);
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      await expect(claimAssessmentRequest(userId, randomUUID(), 'practice', questionId)).rejects.toMatchObject({
        status: 409,
        message: 'Assessment request identifier was already used',
      });
      expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it('rolls back and releases the claim transaction after a query failure', async () => {
    const failure = new Error('claim cleanup failed');
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN') return undefined;
        if (text === 'ROLLBACK') throw new Error('rollback failed');
        throw failure;
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      await expect(claimAssessmentRequest(userId, randomUUID(), 'practice', questionId)).rejects.toBe(failure);
      expect(client.query.mock.calls.map(([text]) => text)).toEqual([
        'BEGIN',
        expect.stringContaining('DELETE FROM assessment_requests'),
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });
});
