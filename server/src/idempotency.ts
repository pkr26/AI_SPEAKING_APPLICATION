import { randomUUID } from 'crypto';
import { pool } from './db';
import { JANITOR_BATCH_SIZE, runExclusiveBatchedDelete } from './janitor';
import { ApiErrorCode, HttpError } from './middleware';
import { releaseTransactionClient, rollbackTransaction } from './transaction';

export type AssessmentContext = 'diagnostic' | 'practice' | 'practice-native';

interface RequestRow {
  context: AssessmentContext;
  question_id: string;
  status: 'processing' | 'completed';
  response_body: Record<string, unknown> | null;
}

export type AssessmentRequestClaim =
  { kind: 'claimed'; claimId: string } | { kind: 'completed'; response: Record<string, unknown> };

/**
 * Internal signal that another worker still owns this request UUID. Routes use
 * it to preserve a possibly shared S3 object until that owner finishes. The
 * public status/message remain the normal HttpError contract.
 */
export class AssessmentRequestInFlightError extends HttpError {
  constructor(message: string, code: ApiErrorCode, extra?: Record<string, unknown>) {
    super(409, message, extra, code);
    this.name = 'AssessmentRequestInFlightError';
  }
}

/**
 * Claim a client request UUID before any quota/provider work. Completed rows
 * replay their exact response; concurrent processing returns 409 with a short
 * retry hint. The same UUID can never be reused for another question/context.
 * In S3 ingress mode the submitted audioKey is recorded with the processing
 * claim so submitted-object cleanup can tell which object a live worker is
 * reading (see finalizeSubmittedPresignedAudio).
 */
export async function claimAssessmentRequest(
  userId: string,
  requestId: string,
  context: AssessmentContext,
  questionId: string,
  audioKey?: string,
): Promise<AssessmentRequestClaim> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Only this claim's own expired row can block the insert below, so the
    // delete is scoped to it. An unscoped sweep here would scan and row-lock
    // every stale row cluster-wide on the hottest path; the hourly janitor
    // (cleanupAssessmentRequests) owns the global sweep.
    await client.query(
      `DELETE FROM assessment_requests
       WHERE user_id = $1 AND request_id = $2
         AND ((status = 'processing' AND started_at < now() - interval '5 minutes')
           OR (status = 'completed' AND completed_at < now() - interval '1 day'))`,
      [userId, requestId],
    );
    const requestClaimId = randomUUID();
    const inserted = await client.query(
      `INSERT INTO assessment_requests (user_id, request_id, claim_id, context, question_id, status, audio_key)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6)
       ON CONFLICT (user_id, request_id) DO NOTHING`,
      [userId, requestId, requestClaimId, context, questionId, audioKey ?? null],
    );
    if (inserted.rowCount === 1) {
      await client.query('COMMIT');
      return { kind: 'claimed', claimId: requestClaimId };
    }

    const existing = await client.query<RequestRow>(
      `SELECT context, question_id, status, response_body
       FROM assessment_requests
       WHERE user_id = $1 AND request_id = $2
       FOR UPDATE`,
      [userId, requestId],
    );
    const row = existing.rows[0];
    if (!row) {
      // The conflicting row vanished between the failed insert and this read,
      // so the identifier is immediately free again — not permanently burned.
      // Report it with the sibling branch's in-flight retry hint.
      throw new AssessmentRequestInFlightError('Assessment is still processing', 'REQUEST_IN_FLIGHT', {
        retryAfterSeconds: 2,
      });
    }
    if (row.context !== context || row.question_id !== questionId) {
      if (row.status === 'processing') {
        throw new AssessmentRequestInFlightError('Assessment request identifier was already used', 'REQUEST_ID_REUSED');
      }
      throw new HttpError(409, 'Assessment request identifier was already used', 'REQUEST_ID_REUSED');
    }
    if (row.status === 'completed' && row.response_body) {
      await client.query('COMMIT');
      return { kind: 'completed', response: row.response_body };
    }
    throw new AssessmentRequestInFlightError('Assessment is still processing', 'REQUEST_IN_FLIGHT', {
      retryAfterSeconds: 2,
    });
  } catch (error) {
    return await rollbackTransaction(client, { value: error });
  } finally {
    releaseTransactionClient(client);
  }
}

/** Store the response in the caller's finalization transaction. */
export async function completeAssessmentRequest(
  client: { query: (text: string, values?: unknown[]) => Promise<unknown> },
  userId: string,
  requestId: string,
  claimId: string,
  response: Record<string, unknown>,
): Promise<void> {
  const completed = (await client.query(
    `UPDATE assessment_requests
     SET status = 'completed', response_body = $1::jsonb, completed_at = now()
     WHERE user_id = $2 AND request_id = $3 AND claim_id = $4 AND status = 'processing'`,
    [JSON.stringify(response), userId, requestId, claimId],
  )) as { rowCount?: number | null };
  if (completed.rowCount !== 1) {
    throw new HttpError(409, 'Assessment request ownership changed; please retry', 'STATE_CHANGED');
  }
}

export async function abandonAssessmentRequest(userId: string, requestId: string, claimId: string): Promise<void> {
  await pool
    .query(
      `DELETE FROM assessment_requests
       WHERE user_id = $1 AND request_id = $2 AND claim_id = $3 AND status = 'processing'`,
      [userId, requestId, claimId],
    )
    .catch(() => undefined);
}

export async function cleanupAssessmentRequests(): Promise<number> {
  return runExclusiveBatchedDelete(
    'janitor:assessment-requests',
    `DELETE FROM assessment_requests
     WHERE ctid IN (
       SELECT ctid FROM assessment_requests
       WHERE (status = 'processing' AND started_at < now() - interval '5 minutes')
          OR (status = 'completed' AND completed_at < now() - interval '1 day')
       LIMIT ${JANITOR_BATCH_SIZE}
     )`,
  );
}

export type AssessmentRequestStatus =
  | { status: 'processing'; context: AssessmentContext; questionId: string }
  | {
      status: 'completed';
      context: AssessmentContext;
      questionId: string;
      response: Record<string, unknown>;
    };

export async function getAssessmentRequestStatus(
  userId: string,
  requestId: string,
): Promise<AssessmentRequestStatus | undefined> {
  const { rows } = await pool.query<RequestRow & { question_id: string }>(
    `SELECT context, question_id, status, response_body
     FROM assessment_requests
     WHERE user_id = $1 AND request_id = $2
       AND (
         (status = 'processing' AND started_at >= now() - interval '5 minutes')
         OR
         (status = 'completed' AND completed_at >= now() - interval '1 day')
       )`,
    [userId, requestId],
  );
  const row = rows[0];
  if (!row) return undefined;
  if (row.status === 'completed' && row.response_body) {
    return { status: 'completed', context: row.context, questionId: row.question_id, response: row.response_body };
  }
  return { status: 'processing', context: row.context, questionId: row.question_id };
}

/**
 * Cleanup guard used by pre-route S3 middleware. A live processing row means
 * some worker may still need the request's shared audio object, even if this
 * duplicate was rejected by validation, eligibility, or a limiter before it
 * reached claimAssessmentRequest.
 */
export async function isAssessmentRequestProcessing(userId: string, requestId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM assessment_requests
     WHERE user_id = $1 AND request_id = $2
       AND status = 'processing'
       AND started_at >= now() - interval '5 minutes'`,
    [userId, requestId],
  );
  return rows.length > 0;
}

/**
 * Companion cleanup guard keyed by the submitted object instead of the
 * request: true while ANY non-expired processing claim for this user
 * references this audioKey. Catches the duplicates a per-requestId check
 * cannot see — same object resubmitted under a different or malformed
 * requestId, or a blind same-key retry that re-claimed in the gap between a
 * failed request's claim abandon and its post-response delete.
 */
export async function isAudioKeyClaimedForProcessing(userId: string, audioKey: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
     FROM assessment_requests
     WHERE user_id = $1 AND audio_key = $2
       AND status = 'processing'
       AND started_at >= now() - interval '5 minutes'`,
    [userId, audioKey],
  );
  return rows.length > 0;
}
