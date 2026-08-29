import { randomUUID } from 'crypto';
import { z } from 'zod';
import { pool, type CefrLevel } from './db';
import { JANITOR_BATCH_SIZE, runExclusiveBatchedDelete } from './janitor';
import { logger } from './logger';
import { ApiErrorCode, HttpError } from './middleware';
import { insertRetainedRecording, RecordingCapture } from './recording-store';
import { releaseTransactionClient, rollbackTransaction } from './transaction';

export type AssessmentContext = 'diagnostic' | 'practice' | 'practice-native';
export type AssessmentNativeLanguage = 'te' | 'hi' | 'es' | 'zh';

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
  practice_cycle_id: string | null;
  retain_recording: boolean;
  response_version: number;
  status: 'processing' | 'completed';
  response_body: Record<string, unknown> | null;
  recording_visible: boolean;
}

interface RequestStatusRow extends RequestRow {
  question_cefr_level: CefrLevel;
  question_prompt_word: string;
  question_text: string;
}

function createResponseSchemas(): Record<AssessmentContext, z.ZodTypeAny> {
  const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
  const PRACTICE_MAX_ATTEMPTS = 3;
  const PRACTICE_PASS_SCORE = 60;
  const PRACTICE_MASTER_SCORE = 75;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const absent = z.undefined().optional();
  const nonEmptyString = (maximum: number) =>
    z
      .string()
      .max(maximum)
      .refine((value) => value.trim().length > 0);
  const integer = (minimum: number, maximum: number) => z.number().finite().int().min(minimum).max(maximum);

  const uuid = z.string().regex(UUID_PATTERN);
  const recordingFields = { recordingId: uuid.optional() } as const;
  const cefrLevel = z.enum(CEFR_LEVELS);
  const nativeLanguage = z.enum(['te', 'hi', 'es', 'zh']);
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

  const practiceQuestionPayload = z
    .object({
      cycleId: uuid,
      attemptsUsed: integer(0, PRACTICE_MAX_ATTEMPTS - 1),
      attemptsLeft: integer(1, PRACTICE_MAX_ATTEMPTS),
      question,
      kind: z.enum(['revision', 'new']),
      progress: practiceProgress,
    })
    .refine(({ attemptsUsed, attemptsLeft }) => attemptsLeft === PRACTICE_MAX_ATTEMPTS - attemptsUsed);

  const levelUp = z.union([
    z.object({ from: z.literal('A1'), to: z.literal('A2') }),
    z.object({ from: z.literal('A2'), to: z.literal('B1') }),
    z.object({ from: z.literal('B1'), to: z.literal('B2') }),
    z.object({ from: z.literal('B2'), to: z.literal('C1') }),
    z.object({ from: z.literal('C1'), to: z.literal('C2') }),
  ]);

  const diagnosticOutcome = z.union([
    z.object({
      ...recordingFields,
      passed: z.literal(false),
      score: failingScore,
      transcript: nonEmptyString(12_000),
      feedback: nonEmptyString(800),
    }),
    z.object({
      ...recordingFields,
      passed: z.literal(true),
      score: passingScore,
      transcript: nonEmptyString(12_000),
      feedback: nonEmptyString(800),
    }),
  ]);
  const noDiagnosticSilenceField = { noSpeech: absent } as const;
  const diagnosticCompletion = z.discriminatedUnion('done', [
    z.object({ done: z.literal(true), level: cefrLevel, nextQuestion: absent }),
    z.object({ done: z.literal(false), level: absent, nextQuestion: question }),
  ]);
  const diagnosticScoredResponse = z.intersection(
    z.intersection(diagnosticOutcome, z.object(noDiagnosticSilenceField)),
    diagnosticCompletion,
  );
  const diagnosticSilenceResponse = z.object({
    ...recordingFields,
    passed: z.literal(false),
    score: z.literal(0),
    transcript: z.literal(''),
    feedback: nonEmptyString(800),
    noSpeech: z.literal(true),
    done: z.literal(false),
    level: absent,
    nextQuestion: question,
  });
  const diagnosticResponse = z.union([diagnosticScoredResponse, diagnosticSilenceResponse]);

  const commonPracticeFields = {
    ...recordingFields,
    cycleId: uuid,
    attemptNo: attemptNumber,
    feedback: nonEmptyString(800),
  } as const;
  const noConditionalPracticeFields = {
    noSpeech: absent,
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
    attemptsLeft: z.literal(0),
    passed: z.literal(true),
    mastered: z.literal(false),
    score: learningPassScore,
    transcript: nonEmptyString(12_000),
    next: practiceQuestionPayload,
  });

  const masteryResponse = z.object({
    ...commonPracticeFields,
    ...noConditionalPracticeFields,
    attemptsLeft: z.literal(0),
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
      attemptsLeft: z.literal(0),
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
    ...recordingFields,
    mode: z.literal('native'),
    nativeLanguage,
    cycleId: uuid,
    attemptNo: attemptNumber,
    feedback: nonEmptyString(800),
  } as const;
  const nativeResponse = z.union([
    z
      .object({
        ...nativeCommonFields,
        understood: z.literal(false),
        transcript: z.literal(''),
        translatedTranscript: z.literal(''),
        modelAnswer: z.literal(''),
        noSpeech: z.literal(true),
        attemptsLeft: integer(1, PRACTICE_MAX_ATTEMPTS),
        next: absent,
      })
      .refine(({ attemptNo, attemptsLeft }) => attemptsLeft === PRACTICE_MAX_ATTEMPTS - (attemptNo - 1)),
    z
      .object({
        ...nativeCommonFields,
        understood: z.boolean(),
        transcript: nonEmptyString(12_000),
        translatedTranscript: nonEmptyString(12_000),
        modelAnswer: nonEmptyString(800),
        noSpeech: absent,
        attemptsLeft: attemptNumber,
        next: absent,
      })
      .refine(({ attemptNo, attemptsLeft }) => attemptsLeft === PRACTICE_MAX_ATTEMPTS - attemptNo),
    z.object({
      ...nativeCommonFields,
      understood: z.boolean(),
      transcript: nonEmptyString(12_000),
      translatedTranscript: nonEmptyString(12_000),
      modelAnswer: nonEmptyString(800),
      noSpeech: absent,
      attemptsLeft: z.literal(0),
      next: practiceQuestionPayload,
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

/**
 * A completed response remains replayable for 48 hours, but a recording
 * reference is only public while its authoritative metadata still exists in
 * the owner's current retention generation. Validate the stored JSONB before
 * sanitizing it so corrupt durable data never becomes acceptable merely
 * because its recording was deleted.
 */
function visibleAssessmentResponse(row: RequestRow): Record<string, unknown> {
  const response = validatedAssessmentResponse(row.context, row.response_body!);
  if (response.recordingId === undefined || row.recording_visible) return response;

  const withoutDeletedRecording = { ...response };
  delete withoutDeletedRecording.recordingId;
  return validatedAssessmentResponse(row.context, withoutDeletedRecording);
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
 * retry hint. The same UUID can never be reused for another question,
 * context, or durable practice cycle. Version-1 completed rows that cannot
 * satisfy the new public contract remain non-replayable tombstones: a stable
 * 409 prevents both invalid JSON and duplicate paid work until normal expiry.
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
  practiceCycleId?: string,
  retainRecording = true,
  nativeLanguage?: AssessmentNativeLanguage,
): Promise<AssessmentRequestClaim> {
  if (
    (context === 'diagnostic' && practiceCycleId !== undefined) ||
    (context !== 'diagnostic' && practiceCycleId === undefined)
  ) {
    throw new Error('practice assessment requests require a cycle identity and diagnostic requests must omit it');
  }
  if ((context === 'practice-native') !== (nativeLanguage !== undefined)) {
    throw new Error('practice-native assessment requests require a language snapshot and other contexts must omit it');
  }
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
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, audio_key, practice_cycle_id,
          retain_recording, recording_retention_epoch, native_language)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6, $7, $8,
               (SELECT recording_retention_epoch FROM users WHERE id = $1), $9)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        requestId,
        requestClaimId,
        context,
        questionId,
        audioKey ?? null,
        practiceCycleId ?? null,
        retainRecording,
        nativeLanguage ?? null,
      ],
    );
    if (inserted.rowCount === 1) {
      await client.query('COMMIT');
      return { kind: 'claimed', claimId: requestClaimId };
    }

    const existing = await client.query<RequestRow>(
      `SELECT context, question_id, practice_cycle_id, retain_recording, response_version, status, response_body,
              EXISTS (
                SELECT 1
                FROM recordings AS replay_recording
                JOIN users AS replay_owner ON replay_owner.id = replay_recording.user_id
                WHERE replay_recording.user_id = ar.user_id
                  AND replay_recording.request_id = ar.request_id
                  AND replay_recording.context = ar.context
                  AND replay_recording.id::text = ar.response_body ->> 'recordingId'
                  AND replay_recording.recording_retention_epoch = replay_owner.recording_retention_epoch
              ) AS recording_visible
       FROM assessment_requests AS ar
       WHERE user_id = $1 AND request_id = $2
       FOR UPDATE OF ar`,
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
    if (
      row.context !== context ||
      row.question_id !== questionId ||
      (row.response_version === 2 && row.practice_cycle_id !== (practiceCycleId ?? null)) ||
      row.retain_recording !== retainRecording
    ) {
      if (row.status === 'processing') {
        throw new AssessmentRequestInFlightError('Assessment request identifier was already used', 'REQUEST_ID_REUSED');
      }
      throw new HttpError(409, 'Assessment request identifier was already used', 'REQUEST_ID_REUSED');
    }
    if (row.status === 'completed' && row.response_body) {
      if (row.response_version !== 2) {
        throw new HttpError(
          409,
          'This saved assessment result was created by an older app version; start a new answer',
          'ASSESSMENT_RESULT_INCOMPATIBLE',
        );
      }
      const response = visibleAssessmentResponse(row);
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
  recording?: RecordingCapture,
): Promise<Record<string, unknown>> {
  // A caller never owns recordingId directly. It is added only when the
  // authoritative per-user retention epoch still matches the request's claim
  // snapshot; delete-all advances that epoch before removing existing rows.
  const responseWithoutRecording = { ...response };
  delete responseWithoutRecording.recordingId;
  const validatedResponseWithoutRecording = validatedAssessmentResponse(context, responseWithoutRecording);
  const responseWithRecording = recording
    ? validatedAssessmentResponse(context, {
        ...responseWithoutRecording,
        recordingId: recording.id,
      })
    : validatedResponseWithoutRecording;
  const completed = (await client.query(
    `WITH owner AS MATERIALIZED (
       SELECT recording_retention_epoch
       FROM users
       WHERE id = $2
       FOR UPDATE
     )
     UPDATE assessment_requests AS requests
     SET status = 'completed',
         response_body = CASE
           WHEN $7::boolean
             AND requests.recording_retention_epoch = owner.recording_retention_epoch
             THEN $1::jsonb
           ELSE $6::jsonb
         END,
         completed_at = now(),
         response_version = 2
     FROM owner
     WHERE requests.user_id = $2 AND requests.request_id = $3 AND requests.claim_id = $4
       AND requests.context = $5 AND requests.status = 'processing'
     RETURNING requests.question_id, requests.audio_key,
       ($7::boolean
         AND requests.recording_retention_epoch = owner.recording_retention_epoch) AS recording_retained`,
    [
      JSON.stringify(responseWithRecording),
      userId,
      requestId,
      claimId,
      context,
      JSON.stringify(validatedResponseWithoutRecording),
      recording !== undefined,
    ],
  )) as {
    rowCount?: number | null;
    rows: Array<{ question_id: string; audio_key: string | null; recording_retained: boolean }>;
  };
  if (completed.rowCount !== 1) {
    throw new HttpError(409, 'Assessment request ownership changed; please retry', 'STATE_CHANGED');
  }
  const owner = completed.rows[0];
  if (recording && !owner) {
    throw new Error('recording completion has no authoritative S3 audio key');
  }
  if (recording && owner.recording_retained) {
    if (!owner?.audio_key) throw new Error('recording completion has no authoritative S3 audio key');
    await insertRetainedRecording(client, userId, requestId, owner.question_id, context, owner.audio_key, recording);
  }
  return recording && owner?.recording_retained ? responseWithRecording : validatedResponseWithoutRecording;
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

export interface AssessmentRequestStatusQuestion {
  id: string;
  cefrLevel: CefrLevel;
  promptWord: string;
  questionText: string;
}

interface AssessmentRequestStatusBase {
  context: AssessmentContext;
  questionId: string;
  cycleId: string | null;
  question: AssessmentRequestStatusQuestion;
}

export type AssessmentRequestStatus =
  | ({ status: 'processing' } & AssessmentRequestStatusBase)
  | {
      status: 'completed';
      context: AssessmentContext;
      questionId: string;
      cycleId: string | null;
      question: AssessmentRequestStatusQuestion;
      response: Record<string, unknown>;
    };

export async function getAssessmentRequestStatus(
  userId: string,
  requestId: string,
): Promise<AssessmentRequestStatus | undefined> {
  const { rows } = await pool.query<RequestStatusRow>(
    `SELECT ar.context, ar.question_id, ar.practice_cycle_id, ar.response_version, ar.status, ar.response_body,
            EXISTS (
              SELECT 1
              FROM recordings AS replay_recording
              JOIN users AS replay_owner ON replay_owner.id = replay_recording.user_id
              WHERE replay_recording.user_id = ar.user_id
                AND replay_recording.request_id = ar.request_id
                AND replay_recording.context = ar.context
                AND replay_recording.id::text = ar.response_body ->> 'recordingId'
                AND replay_recording.recording_retention_epoch = replay_owner.recording_retention_epoch
            ) AS recording_visible,
            q.cefr_level AS question_cefr_level, q.prompt_word AS question_prompt_word,
            q.question_text AS question_text
     FROM assessment_requests ar
     JOIN questions q ON q.id = ar.question_id
     WHERE ar.user_id = $1 AND ar.request_id = $2
       AND (
         (ar.status = 'processing' AND ar.started_at >= now() - interval '5 minutes')
         OR
         (ar.status = 'completed' AND ar.completed_at >= now() - ${COMPLETED_RETENTION_INTERVAL_SQL})
       )`,
    [userId, requestId],
  );
  const row = rows[0];
  if (!row) return undefined;
  const details: AssessmentRequestStatusBase = {
    context: row.context,
    questionId: row.question_id,
    cycleId: row.practice_cycle_id,
    question: {
      id: row.question_id,
      cefrLevel: row.question_cefr_level,
      promptWord: row.question_prompt_word,
      questionText: row.question_text,
    },
  };
  if (row.status === 'completed' && row.response_body) {
    if (row.response_version !== 2) {
      throw new HttpError(
        409,
        'This saved assessment result was created by an older app version; start a new answer',
        'ASSESSMENT_RESULT_INCOMPATIBLE',
      );
    }
    return {
      status: 'completed',
      ...details,
      response: visibleAssessmentResponse(row),
    };
  }
  return { status: 'processing', ...details };
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
