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
export interface AssessmentQuestionSnapshot {
  cefrLevel: CefrLevel;
  promptWord: string;
  questionText: string;
}

// Constructed per claim (like the response schemas in createResponseSchemas)
// so every schema mutant executes inside the tests that exercise claims.
/**
 * Strict shape of the claim-time question snapshot (migration 024): the CEFR
 * level, prompt word, and question text taken from the exact in-memory
 * question used for grading. Rejecting bad snapshots at claim time guarantees
 * recovery reads immutable columns and never rejoins mutable catalog wording.
 */
function createAssessmentQuestionSnapshotSchema() {
  return z
    .object({
      cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
      promptWord: z
        .string()
        .max(100)
        .refine((value) => value.trim().length > 0),
      questionText: z
        .string()
        .max(1_000)
        .refine((value) => value.trim().length > 0),
    })
    .strict();
}

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
  diagnostic_run_id: string | null;
  retain_recording: boolean;
  response_version: number;
  status: 'processing' | 'completed';
  response_body: Record<string, unknown> | null;
  recording_visible: boolean;
}

interface RequestStatusRow extends RequestRow {
  current_diagnostic_run_id: string | null;
  question_cefr_level: CefrLevel;
  question_prompt_word: string;
  question_text: string;
}

/**
 * Build the per-context zod validators for durable assessment JSONB. Each
 * entry encodes one context's full additive public contract — diagnostic
 * scored/silence shapes, the six practice outcomes, and the native
 * comprehension shapes — including cross-field attemptsLeft refinements that
 * per-field schemas cannot express. Rebuilt on every validation on purpose so
 * each schema mutant runs inside tests that exercise stored responses.
 */
function createResponseSchemas(): Record<AssessmentContext, z.ZodTypeAny> {
  const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
  const PRACTICE_MAX_ATTEMPTS = 3;
  const PRACTICE_PASS_SCORE = 60;
  const PRACTICE_MASTER_SCORE = 75;
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const absent = z.undefined().optional();
  /** Bounded string that must be non-blank under JavaScript trim, like every persisted public scalar. */
  const nonEmptyString = (maximum: number) =>
    z
      .string()
      .max(maximum)
      .refine((value) => value.trim().length > 0);
  /** Bounded finite integer schema; callers pick the inclusive limits. */
  const integer = (minimum: number, maximum: number) => z.number().finite().int().min(minimum).max(maximum);

  const uuid = z.string().regex(UUID_PATTERN);
  const recordingFields = { recordingId: uuid.optional() } as const;
  const cefrLevel = z.enum(CEFR_LEVELS);
  const nativeLanguage = z.enum(['te', 'hi', 'es', 'zh']);
  // Stryker disable next-line ArithmeticOperator: attemptsLeft's own min(1) plus the === refine
  // force attemptsLeft to 3-attemptsUsed within 1..3, so attemptsUsed>=3 is rejected by the
  // refine regardless of this bound — the accepted-body set is identical under the mutant.
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
      // Stryker disable next-line ArithmeticOperator: widening the upper bound admits only
      // attemptsUsed>=3, which the attemptsLeft===3-attemptsUsed refine with min(1) already
      // rejects — behaviorally identical.
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
  // Stryker disable next-line ConditionalExpression: the false-mutant strips an ABSENT key
  // (no-op delete) and revalidates the identical object; present recordingIds are decided by
  // recording_visible in both versions. Byte-identical outputs on every input.
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
  /** Status is fixed at 409; message, code, and extras come from the throwing site. */
  constructor(message: string, code: ApiErrorCode, extra?: Record<string, unknown>) {
    super(409, message, extra, code);
    this.name = 'AssessmentRequestInFlightError';
  }
}

/**
 * Stable 409 ASSESSMENT_RESULT_INCOMPATIBLE for work bound to a diagnostic
 * run the learner has since restarted. Shared by the claim and status paths
 * so an old POST and an old recovery GET answer identically without any new
 * provider work.
 */
function retiredDiagnosticRunError(): HttpError {
  return new HttpError(
    409,
    'This diagnostic answer belongs to a restarted placement; record a new answer',
    'ASSESSMENT_RESULT_INCOMPATIBLE',
  );
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
  questionSnapshot?: AssessmentQuestionSnapshot,
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
  const parsedQuestionSnapshot = createAssessmentQuestionSnapshotSchema().safeParse(questionSnapshot);
  if (!parsedQuestionSnapshot.success) {
    throw new Error('assessment requests require a valid claim-time question snapshot');
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
    // Restart takes the same parent lock before rotating this UUID, so a
    // diagnostic claim is bound to exactly one run. Migration 024's INSERT
    // trigger writes this identity (and the public question snapshot) in the
    // same transaction, including for a draining pre-024 application writer.
    let diagnosticRunId: string | undefined;
    if (context === 'diagnostic') {
      const diagnosticState = await client.query<{ diagnostic_run_id: string }>(
        'SELECT diagnostic_run_id FROM diagnostic_state WHERE user_id = $1',
        [userId],
      );
      diagnosticRunId = diagnosticState.rows[0]?.diagnostic_run_id;
      if (!diagnosticRunId) {
        throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
      }
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
          retain_recording, recording_retention_epoch, native_language, diagnostic_run_id,
          question_cefr_level, question_prompt_word, question_text)
       VALUES ($1, $2, $3, $4, $5, 'processing', $6, $7, $8,
               (SELECT recording_retention_epoch FROM users WHERE id = $1), $9, $10, $11, $12, $13)
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
        // Stryker disable next-line LogicalOperator: a NULL native_language on a practice-native
        // INSERT is backfilled by migration 022's claim trigger from the same users row the
        // claim locked; the profile cannot change under that lock, so the mutant's NULL is
        // always rewritten to the identical claimed value.
        nativeLanguage ?? null,
        // Stryker disable next-line LogicalOperator: a NULL diagnostic_run_id is backfilled by
        // migration 024's snapshot trigger from the same diagnostic_state row the claim read
        // under users FOR UPDATE — restart rotates the run only through that parent lock.
        diagnosticRunId ?? null,
        parsedQuestionSnapshot.data.cefrLevel,
        parsedQuestionSnapshot.data.promptWord,
        parsedQuestionSnapshot.data.questionText,
      ],
    );
    if (inserted.rowCount === 1) {
      await client.query('COMMIT');
      return { kind: 'claimed', claimId: requestClaimId };
    }

    const existing = await client.query<RequestRow>(
      `SELECT context, question_id, practice_cycle_id, diagnostic_run_id, retain_recording,
              response_version, status, response_body,
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
    // A restart keeps the UUID row as a non-replayable tombstone. Check the
    // run before mutable question/retention collision fields so both an old
    // GET and an old POST get the stable result-retirement contract without
    // another provider call.
    if (context === 'diagnostic' && row.context === 'diagnostic' && row.diagnostic_run_id !== diagnosticRunId) {
      throw retiredDiagnosticRunError();
    }
    if (
      row.context !== context ||
      row.question_id !== questionId ||
      // v1 rows predate migration 024's practice_cycle_id column and always
      // read NULL here. A current client retrying one of those request ids
      // sends a cycleId, so applying the cycle check to them would answer
      // REQUEST_ID_REUSED and hide the legacy-result retirement contract
      // below — the replay tombstone must win for pre-024 rows.
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
       AND (
         requests.context <> 'diagnostic'
         OR EXISTS (
           SELECT 1
           FROM diagnostic_state AS current_diagnostic
           WHERE current_diagnostic.user_id = requests.user_id
             AND current_diagnostic.diagnostic_run_id = requests.diagnostic_run_id
         )
       )
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
  // Unreachable against a real PostgreSQL UPDATE ... RETURNING (rowCount 1
  // implies the row), but this function's query client is injectable and unit
  // tests exercise malformed-driver shapes; fail closed instead of crashing on
  // property access.
  if (!owner) {
    throw new Error('recording completion has no authoritative S3 audio key');
  }
  if (recording && owner.recording_retained) {
    if (!owner.audio_key) throw new Error('recording completion has no authoritative S3 audio key');
    await insertRetainedRecording(client, userId, requestId, owner.question_id, context, owner.audio_key, recording);
  }
  return recording && owner.recording_retained ? responseWithRecording : validatedResponseWithoutRecording;
}

/**
 * Drop this worker's own processing claim after a failure. Keyed by the exact
 * claimId so it can never delete a lease-expired replacement worker's row.
 * Best-effort by design: if the delete fails, the 5-minute lease expiry still
 * frees the UUID, so the error is swallowed instead of masking the original
 * failure.
 */
export async function abandonAssessmentRequest(userId: string, requestId: string, claimId: string): Promise<void> {
  await pool
    .query(
      `DELETE FROM assessment_requests
       WHERE user_id = $1 AND request_id = $2 AND claim_id = $3 AND status = 'processing'`,
      [userId, requestId, claimId],
    )
    .catch(() => undefined);
}

/**
 * Janitor for assessment_requests: expire dead processing leases (older than
 * 5 minutes) and completed replays past the 48-hour retention window in
 * bounded batches under the shared advisory lock, keeping expiry sweeps off
 * the hot claim path.
 */
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

/**
 * Read one request UUID's durable status for recovery polling. Only live rows
 * are visible — a processing row past its 5-minute lease or a completion past
 * the 48-hour retention reads as undefined, which clients treat as terminal.
 * Completed v2 rows replay their sanitized response; v1 rows answer the same
 * stable ASSESSMENT_RESULT_INCOMPATIBLE 409 as the claim path, and a restarted
 * diagnostic run retires both reads and replays through the shared helper.
 */
export async function getAssessmentRequestStatus(
  userId: string,
  requestId: string,
): Promise<AssessmentRequestStatus | undefined> {
  const { rows } = await pool.query<RequestStatusRow>(
    `SELECT ar.context, ar.question_id, ar.practice_cycle_id, ar.diagnostic_run_id,
            current_diagnostic.diagnostic_run_id AS current_diagnostic_run_id,
            ar.retain_recording, ar.response_version, ar.status, ar.response_body,
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
            ar.question_cefr_level, ar.question_prompt_word, ar.question_text
     FROM assessment_requests ar
     LEFT JOIN diagnostic_state AS current_diagnostic
       ON current_diagnostic.user_id = ar.user_id
      AND ar.context = 'diagnostic'
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
  // Stryker disable next-line ConditionalExpression: for non-diagnostic rows both run columns
  // and the context-restricted LEFT JOIN are NULL (null !== null is false), so the conjunct is
  // false either way; diagnostic rows compare the same runs in both versions.
  if (row.context === 'diagnostic' && row.diagnostic_run_id !== row.current_diagnostic_run_id) {
    throw retiredDiagnosticRunError();
  }
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
