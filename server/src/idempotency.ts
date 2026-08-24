import { randomUUID } from 'crypto';
import { z } from 'zod';
import { pool } from './db';
import { JANITOR_BATCH_SIZE, runExclusiveBatchedDelete } from './janitor';
import { logger } from './logger';
import { ApiErrorCode, HttpError } from './middleware';
import { releaseTransactionClient, rollbackTransaction } from './transaction';

export type AssessmentContext = 'diagnostic' | 'practice' | 'practice-native';

/**
 * Completed responses must outlive the app's 25-hour recovery window so a
 * delayed retry still replays the original result instead of spending paid
 * provider work and recording a second attempt under a newly claimable UUID.
 */
export const ASSESSMENT_REQUEST_COMPLETED_RETENTION_HOURS = 48;

const COMPLETED_RETENTION_INTERVAL_SQL = `interval '${ASSESSMENT_REQUEST_COMPLETED_RETENTION_HOURS} hours'` as const;

interface RequestRow {
  context: AssessmentContext;
  question_id: string;
  status: 'processing' | 'completed';
  response_body: Record<string, unknown> | null;
}

function createResponseSchemas(): Record<AssessmentContext, z.ZodTypeAny> {
  const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
  const PRACTICE_MAX_ATTEMPTS = 3;
  const PRACTICE_PASS_SCORE = 60;
  const PRACTICE_MASTER_SCORE = 75;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const absent = z.undefined().optional();
  const boundedString = (maximum: number) => z.string().max(maximum);
  const nonEmptyString = (maximum: number) =>
    z
      .string()
      .max(maximum)
      .refine((value) => value.trim().length > 0);
  const integer = (minimum: number, maximum: number) => z.number().finite().int().min(minimum).max(maximum);

  const uuid = z.string().regex(UUID_PATTERN);
  const cefrLevel = z.enum(CEFR_LEVELS);
  const attemptNumber = integer(1, PRACTICE_MAX_ATTEMPTS);
  const failingScore = integer(0, PRACTICE_PASS_SCORE - 1);
  const passingScore = integer(PRACTICE_PASS_SCORE, 100);
  const learningPassScore = integer(PRACTICE_PASS_SCORE, PRACTICE_MASTER_SCORE - 1);
  const masteryScore = integer(PRACTICE_MASTER_SCORE, 100);

  const question = z.object({
    id: uuid,
    cefrLevel,
    promptWord: nonEmptyString(100),
    questionText: nonEmptyString(1_000),
  });

  const wordBankCount = integer(0, 100_000);
  const practiceProgress = z
    .object({
      masteredCount: wordBankCount,
      learningCount: wordBankCount,
      totalAtLevel: integer(1, 100_000),
      dueCount: wordBankCount.optional(),
    })
    .refine(({ masteredCount, learningCount, totalAtLevel }) => masteredCount + learningCount <= totalAtLevel)
    .refine(
      ({ masteredCount, learningCount, dueCount }) =>
        dueCount === undefined || dueCount <= masteredCount + learningCount,
    );

  const practiceQuestionPayload = z.object({
    question,
    kind: z.enum(['revision', 'new']),
    progress: practiceProgress,
  });

  const levelUp = z.union([
    z.object({ from: z.literal('A1'), to: z.literal('A2') }),
    z.object({ from: z.literal('A2'), to: z.literal('B1') }),
    z.object({ from: z.literal('B1'), to: z.literal('B2') }),
    z.object({ from: z.literal('B2'), to: z.literal('C1') }),
    z.object({ from: z.literal('C1'), to: z.literal('C2') }),
  ]);

  const diagnosticOutcome = z.union([
    z.object({
      passed: z.literal(false),
      score: failingScore,
      transcript: boundedString(12_000),
      feedback: nonEmptyString(800),
    }),
    z.object({
      passed: z.literal(true),
      score: passingScore,
      transcript: boundedString(12_000),
      feedback: nonEmptyString(800),
    }),
  ]);
  const diagnosticCompletion = z.discriminatedUnion('done', [
    z.object({ done: z.literal(true), level: cefrLevel, nextQuestion: absent }),
    z.object({ done: z.literal(false), level: absent, nextQuestion: question }),
  ]);
  const diagnosticResponse = z.intersection(diagnosticOutcome, diagnosticCompletion);

  const commonPracticeFields = {
    attemptNo: attemptNumber,
    feedback: nonEmptyString(800),
  } as const;
  const noConditionalPracticeFields = {
    noSpeech: absent,
    attemptsLeft: absent,
    finalFeedback: absent,
    levelUp: absent,
  } as const;

  const silenceResponse = z
    .object({
      ...commonPracticeFields,
      passed: z.literal(false),
      mastered: z.literal(false),
      score: z.literal(0),
      transcript: z.literal(''),
      noSpeech: z.literal(true),
      attemptsLeft: integer(1, PRACTICE_MAX_ATTEMPTS),
      finalFeedback: absent,
      next: absent,
      levelUp: absent,
    })
    .refine(({ attemptNo, attemptsLeft }) => attemptsLeft === PRACTICE_MAX_ATTEMPTS - (attemptNo - 1));

  const retryResponse = z
    .object({
      ...commonPracticeFields,
      passed: z.literal(false),
      mastered: z.literal(false),
      score: failingScore,
      transcript: nonEmptyString(12_000),
      noSpeech: absent,
      attemptsLeft: attemptNumber,
      finalFeedback: absent,
      next: absent,
      levelUp: absent,
    })
    .refine(({ attemptNo, attemptsLeft }) => attemptsLeft === PRACTICE_MAX_ATTEMPTS - attemptNo);

  const terminalResponse = z.object({
    ...commonPracticeFields,
    passed: z.literal(false),
    mastered: z.literal(false),
    score: failingScore,
    transcript: nonEmptyString(12_000),
    noSpeech: absent,
    attemptsLeft: z.literal(0),
    finalFeedback: nonEmptyString(4_000),
    next: practiceQuestionPayload,
    levelUp: absent,
  });

  const learningPassResponse = z.object({
    ...commonPracticeFields,
    ...noConditionalPracticeFields,
    passed: z.literal(true),
    mastered: z.literal(false),
    score: learningPassScore,
    transcript: nonEmptyString(12_000),
    next: practiceQuestionPayload,
  });

  const masteryResponse = z.object({
    ...commonPracticeFields,
    ...noConditionalPracticeFields,
    passed: z.literal(true),
    mastered: z.literal(true),
    score: masteryScore,
    transcript: nonEmptyString(12_000),
    next: practiceQuestionPayload,
  });

  const promotionResponse = z
    .object({
      ...commonPracticeFields,
      noSpeech: absent,
      attemptsLeft: absent,
      finalFeedback: absent,
      passed: z.literal(true),
      mastered: z.literal(true),
      score: masteryScore,
      transcript: nonEmptyString(12_000),
      next: practiceQuestionPayload,
      levelUp,
    })
    .refine(({ levelUp: promotion, next }) => next.question.cefrLevel === promotion.to);

  const practiceResponse = z.union([
    silenceResponse,
    retryResponse,
    terminalResponse,
    learningPassResponse,
    masteryResponse,
    promotionResponse,
  ]);

  const nativeCommonFields = {
    mode: z.literal('native'),
    feedback: nonEmptyString(800),
  } as const;
  const nativeResponse = z.union([
    z.object({
      ...nativeCommonFields,
      understood: z.literal(false),
      transcript: z.literal(''),
      modelAnswer: z.literal(''),
    }),
    z.object({
      ...nativeCommonFields,
      understood: z.boolean(),
      transcript: nonEmptyString(12_000),
      modelAnswer: nonEmptyString(800),
    }),
  ]);

  return {
    diagnostic: diagnosticResponse,
    practice: practiceResponse,
    'practice-native': nativeResponse,
  };
}

/**
 * Validate durable JSONB before it crosses the database-to-client boundary.
 * Internal writers are expected to produce these exact discriminated shapes,
 * but a manual data repair or future writer drift must fail closed as a 500
 * instead of making the app consume an impossible completed response.
 */
export function validatedAssessmentResponse(
  context: AssessmentContext,
  response: Record<string, unknown>,
): Record<string, unknown> {
  const valid = createResponseSchemas()[context].safeParse(response).success;
  if (!valid) {
    logger.error({ context }, 'stored assessment response failed its public contract');
    throw new HttpError(500, 'Stored assessment response is invalid', 'INTERNAL');
  }
  return response;
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
    // Account deletion locks users before cascading into assessment_requests.
    // Take that parent lock before touching this child table so a delete that
    // won the race becomes a stable 409, rather than a foreign-key error (or a
    // parent/child lock inversion) on the claim insert below.
    const owner = await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (owner.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    // Only this request UUID or submitted object can block the insert below,
    // so expiry cleanup stays scoped to those two identities. Including the
    // object identity is load-bearing: after a failed worker outlives its
    // lease, a retry may legitimately bind the same key under a replacement
    // request UUID. An unscoped sweep here would scan and row-lock every stale
    // row cluster-wide on the hottest path; the hourly janitor owns that.
    await client.query(
      `DELETE FROM assessment_requests
       WHERE user_id = $1
         AND (request_id = $2 OR ($3::text IS NOT NULL AND audio_key = $3))
         AND ((status = 'processing' AND started_at < now() - interval '5 minutes')
           OR (status = 'completed' AND completed_at < now() - ${COMPLETED_RETENTION_INTERVAL_SQL}))`,
      [userId, requestId, audioKey ?? null],
    );
    const requestClaimId = randomUUID();
    const inserted = await client.query(
      `INSERT INTO assessment_requests (user_id, request_id, claim_id, context, question_id, status, audio_key)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6)
       ON CONFLICT DO NOTHING`,
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
      // The request UUID is free, so a failed insert can only have collided
      // with the unique S3-object binding. A presigned object is one logical
      // assessment input: admitting a second requestId would duplicate paid
      // work and let either response delete the other worker's input.
      if (audioKey) {
        const existingAudio = await client.query<{ status: 'processing' | 'completed' }>(
          `SELECT status
           FROM assessment_requests
           WHERE user_id = $1 AND audio_key = $2
           FOR UPDATE`,
          [userId, audioKey],
        );
        if (existingAudio.rows[0]) {
          throw new HttpError(409, 'Audio upload was already submitted', 'REQUEST_ID_REUSED');
        }
      }
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
      const response = validatedAssessmentResponse(row.context, row.response_body);
      await client.query('COMMIT');
      return { kind: 'completed', response };
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
  context: AssessmentContext,
): Promise<void> {
  const validatedResponse = validatedAssessmentResponse(context, response);
  const completed = (await client.query(
    `UPDATE assessment_requests
     SET status = 'completed', response_body = $1::jsonb, completed_at = now()
     WHERE user_id = $2 AND request_id = $3 AND claim_id = $4
       AND context = $5 AND status = 'processing'`,
    [JSON.stringify(validatedResponse), userId, requestId, claimId, context],
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
          OR (status = 'completed' AND completed_at < now() - ${COMPLETED_RETENTION_INTERVAL_SQL})
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
         (status = 'completed' AND completed_at >= now() - ${COMPLETED_RETENTION_INTERVAL_SQL})
       )`,
    [userId, requestId],
  );
  const row = rows[0];
  if (!row) return undefined;
  if (row.status === 'completed' && row.response_body) {
    return {
      status: 'completed',
      context: row.context,
      questionId: row.question_id,
      response: validatedAssessmentResponse(row.context, row.response_body),
    };
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
