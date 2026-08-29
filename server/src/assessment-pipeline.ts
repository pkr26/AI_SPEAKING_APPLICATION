import { randomUUID } from 'crypto';
import { RequestHandler, Response } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { AssessOptions } from './assess';
import { measureAudioDuration } from './audio-inspection';
import {
  completeSubmittedPresignedAudio,
  discardSubmittedPresignedAudio,
  isOwnedAudioKey,
  ownSubmittedPresignedAudio,
  preserveSubmittedPresignedAudio,
  resolvePresignedAudio,
  s3StorageEnabled,
  AudioStorageScope,
  SubmittedAudioFile,
} from './audio-upload';
import { config } from './config';
import { pool, QUESTION_ROW_COLUMNS, QuestionRow } from './db';
import {
  abandonAssessmentRequest,
  type AssessmentContext,
  type AssessmentNativeLanguage,
  claimAssessmentRequest,
} from './idempotency';
import { AuthedRequest, HttpError, UserRow, validate, validated } from './middleware';
import { Limiters } from './rate-limit';
import { RecordingCapture } from './recording-store';
import { tryRetainRecording } from './recordings';
import { ownSubmittedAudioFile, uploadAudio, verifyAudioMagicBytes } from './upload';

/**
 * Shared choreography for the three paid assessment submission routes
 * (practice /attempt, practice /attempt/native, diagnostic /answer): one
 * middleware chain (S3-conditional cleanup registration, eligibility, paid
 * limiters, dual-mode body handling) and one request runner owning the
 * question fetch, the idempotency-claim dance, the audio gates, and the exact
 * cleanup semantics. Route-specific behavior (per-route claims, provider call,
 * persistence, error codes) is injected through AssessmentSubmissionHooks.
 */

function createSubmissionBodySchema(storageScope: AudioStorageScope) {
  const retainRecording = z.preprocess((value) => {
    // Multipart fields arrive as strings, while S3-mode JSON carries a real
    // boolean. Missing means true for clients released before retention became
    // an explicit per-submission choice.
    if (value === undefined) return true;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }, z.boolean());
  const commonSubmissionBodySchema = z
    .object({
      questionId: z.string().uuid('questionId must be a valid UUID'),
      requestId: z.string().uuid('requestId must be a valid UUID'),
      retainRecording,
    })
    .strict();
  // Practice submissions are bound to the durable serving cycle returned by
  // GET /practice/question. Diagnostic retains its existing body contract.
  const submissionBodySchema =
    storageScope === 'practice'
      ? commonSubmissionBodySchema.extend({ cycleId: z.string().uuid('cycleId must be a valid UUID') })
      : commonSubmissionBodySchema;

  // S3 mode receives JSON with the presigned object key; local mode receives
  // multipart audio (see audio-upload.ts / upload.ts).
  return s3StorageEnabled(storageScope)
    ? submissionBodySchema.extend({ audioKey: z.string().max(512) })
    : submissionBodySchema;
}

export type SubmissionBodySchema = ReturnType<typeof createSubmissionBodySchema>;

export interface AssessmentSubmissionChain {
  /** Storage destination fixed by the mounted assessment route. */
  storageScope: AudioStorageScope;
  /** Mount before the route handler; ends with the dual-mode body validation. */
  middleware: RequestHandler[];
  /** The exact schema instance validate() parsed, for validated() reads. */
  bodySchema: SubmissionBodySchema;
  /**
   * Re-spend both assessment-budget hits for a request whose client aborted
   * after paid capacity was committed. The runner needs it when the capacity
   * reservation lands after the response already closed — by then the abort
   * guard's close listener has run (refund issued, flag unset) and will never
   * fire again. Idempotent per response (res.locals.assessmentBudgetRespent).
   */
  respendAssessmentBudget: (req: AuthedRequest, res: Response) => void;
}

/**
 * Build the submission middleware chain. Resolved at router build time (not
 * module load): tests flip the route scope's bucket before creating the app.
 *
 * Order matters and is pinned by tests:
 * - Transient-object cleanup registration belongs to submission routes only:
 *   after authentication, before eligibility, rate limiting, and validation,
 *   so every authenticated submission path discards its owned key while reads
 *   that happen to carry an audioKey body can never trigger a deletion.
 * - The eligibility gate rejects before any paid-limiter budget is spent.
 * - assessAbortGuard mounts after the two assessment limiters so a client
 *   abort after the capacity reservation re-spends both hits.
 */
export function buildAssessmentSubmissionChain(
  limiters: Limiters,
  storageScope: AudioStorageScope,
  eligibility: RequestHandler[] = [],
): AssessmentSubmissionChain {
  const bodySchema = createSubmissionBodySchema(storageScope);
  return {
    storageScope,
    bodySchema,
    respendAssessmentBudget: limiters.respendAssessmentBudget,
    middleware: [
      ...(s3StorageEnabled(storageScope) ? [discardSubmittedPresignedAudio(storageScope)] : []),
      ...eligibility,
      limiters.assess,
      limiters.assessIpDaily,
      limiters.assessAbortGuard,
      ...(s3StorageEnabled(storageScope)
        ? [validate({ body: bodySchema })]
        : [uploadAudio, validate({ body: bodySchema })]),
    ],
  };
}

export interface AssessmentSubmissionHooks<Claim, Result> {
  /** Route-bound storage scope; never accepted from the submission body. */
  storageScope: AudioStorageScope;
  /** Idempotency context stored with the durable request claim. */
  context: AssessmentContext;
  /** The chain's schema instance, so the runner reads the validated body. */
  bodySchema: SubmissionBodySchema;
  /** The chain's abort re-spend, invoked when capacity commits after close. */
  respendAssessmentBudget: (req: AuthedRequest, res: Response) => void;
  /** Per-route error for a questionId that matches no catalog row. */
  questionMissingError: () => HttpError;
  /** Practice routes reject questions outside the learner's level with 403. */
  requireQuestionAtUserLevel: boolean;
  /**
   * Post-ownership eligibility gate (diagnostic already completed). Runs after
   * the request UUID is owned and before any audio work, so the rejection
   * abandons the claim without spending storage or provider budget.
   */
  assertEligibleAfterOwned?: (user: UserRow) => void | Promise<void>;
  /** Take the per-question serialization claim (after every audio gate). */
  claimAttempt: (user: UserRow, question: QuestionRow) => Promise<Claim>;
  /** Run the paid provider call; forward options to the assess pipeline. */
  assess: (
    audioPath: string,
    user: UserRow,
    question: QuestionRow,
    claim: Claim,
    options: AssessOptions,
  ) => Promise<Result>;
  /** Persist the result and complete the request claim; returns the response body. */
  persist: (
    user: UserRow,
    question: QuestionRow,
    claim: Claim,
    result: Result,
    requestId: string,
    requestClaimId: string,
    recording?: RecordingCapture,
  ) => Promise<Record<string, unknown>>;
  /** Best-effort release of the per-question claim (never throws). */
  clearClaim: (user: UserRow, question: QuestionRow, claim: Claim) => Promise<void>;
}

/**
 * Run one assessment submission end to end. The dual-finally semantics are
 * load-bearing and pinned by tests:
 * - inner finally: the per-question claim is always cleared once taken, and a
 *   request that did not complete abandons its durable request claim so the
 *   same requestId stays retryable;
 * - each successful fresh-owner response owns a small finally that finalizes
 *   its S3 object even when a disconnected response never emits `finish`;
 * - outer finally: the local audio file is always unlinked. Error-path S3
 *   finalization stays with the response listener because the error handler
 *   sets the real status only after this handler unwinds; reading the stale
 *   200 here could delete an object that a 409/429 response must preserve.
 *   Finalization is idempotent.
 */
export async function runAssessmentSubmission<Claim, Result>(
  req: AuthedRequest,
  res: Response,
  hooks: AssessmentSubmissionHooks<Claim, Result>,
): Promise<unknown> {
  const user = req.user!;
  let audioFile: SubmittedAudioFile | undefined = req.file;
  // From this point the outer finally is the sole close-path owner of the
  // local file. The request may deliberately finish after a client abort, so
  // upload middleware must not unlink it from a response `close` listener.
  ownSubmittedAudioFile(res);
  try {
    const { questionId, requestId, retainRecording } = validated(req, hooks.bodySchema);
    const practiceCycleId = hooks.storageScope === 'practice' ? (req.body as { cycleId: string }).cycleId : undefined;
    // The dual-mode schema carries audioKey only in S3 ingress mode (the zod
    // union collapses it out of the inferred type, so read it the same
    // defensive way resolvePresignedAudio does). Recording it with the
    // processing claim lets submitted-object cleanup see which object this
    // worker is reading. Only a well-formed owned key is recorded: the schema
    // constrains nothing but the length, and binding arbitrary client bytes
    // into the claim INSERT would turn resolvePresignedAudio's clean 400 into a
    // 500 (PostgreSQL text rejects a NUL byte). A key the download would refuse
    // is also a key no cleanup may ever consult. Direct mode has none.
    const rawAudioKey = (req.body as { audioKey?: unknown }).audioKey;
    const audioKey = isOwnedAudioKey(hooks.storageScope, user.id, rawAudioKey) ? rawAudioKey : undefined;
    const { rows: qRows } = await pool.query<QuestionRow>(
      `SELECT ${QUESTION_ROW_COLUMNS} FROM questions WHERE id = $1`,
      [questionId],
    );
    const question = qRows[0];
    if (!question) throw hooks.questionMissingError();
    if (hooks.requireQuestionAtUserLevel && practiceCycleId) {
      // A composite database FK is the final ownership backstop, but hostile
      // question/cycle pairs must remain a stable public 403/409 instead of
      // surfacing a constraint violation. Match closed cycles too so an exact
      // completed replay still wins after a pass promoted the learner.
      const matchingCycle = await pool.query(
        `SELECT 1 FROM practice_cycles
         WHERE id = $1 AND user_id = $2 AND question_id = $3`,
        [practiceCycleId, user.id, questionId],
      );
      if (matchingCycle.rowCount !== 1) {
        if (question.cefr_level !== user.cefr_level) {
          throw new HttpError(403, 'Question is not available at your level', 'FORBIDDEN');
        }
        throw new HttpError(409, 'This practice question is no longer active', 'PRACTICE_CYCLE_CLOSED');
      }
    }
    const requestClaim = await claimAssessmentRequest(
      user.id,
      requestId,
      hooks.context,
      questionId,
      audioKey,
      practiceCycleId,
      retainRecording,
      hooks.context === 'practice-native' ? (user.native_language as AssessmentNativeLanguage) : undefined,
      {
        cefrLevel: question.cefr_level,
        promptWord: question.prompt_word,
        questionText: question.question_text,
      },
    );
    if (requestClaim.kind === 'completed') {
      // Completed replays retain their object for the bucket lifecycle: an
      // active delete near tombstone expiry could race a newly rebound owner.
      return res.json(requestClaim.response);
    }
    ownSubmittedPresignedAudio(res);

    let claim: Claim | undefined;
    let completed = false;
    try {
      // A completed idempotent response takes precedence over mutable level
      // eligibility: the original request may itself have promoted the user,
      // and its retry must still replay byte-for-byte without new paid work.
      if (hooks.requireQuestionAtUserLevel && question.cefr_level !== user.cefr_level) {
        throw new HttpError(403, 'Question is not available at your level', 'FORBIDDEN');
      }
      await hooks.assertEligibleAfterOwned?.(user);
      if (s3StorageEnabled(hooks.storageScope)) {
        audioFile = await resolvePresignedAudio(hooks.storageScope, req, res);
      }
      if (!audioFile) {
        throw new HttpError(400, 'audio file is required');
      }
      await verifyAudioMagicBytes(audioFile.path);
      const durationMs = config.mockAi ? undefined : Math.round((await measureAudioDuration(audioFile.path)) * 1000);
      claim = await hooks.claimAttempt(user, question);
      const result = await hooks.assess(audioFile.path, user, question, claim, {
        // Once the capacity reservation commits, the assessment limiters
        // must not refund this request even if it later fails (>=400).
        onCapacityReserved: () => {
          res.locals.assessmentCapacityReserved = true;
          // Close-before-commit ordering: the client already disconnected, so
          // express-rate-limit's close handler has refunded both hits while
          // the abort guard saw no reservation flag and stayed silent — and
          // 'close' never fires twice. Re-spend the pair now that paid
          // capacity is consumed (fail-open inside the store). The sentinel
          // inside respendAssessmentBudget makes a second path a no-op.
          if (
            res.locals.assessmentTransportClosed ||
            res.locals.assessmentTransportFailed ||
            res.closed ||
            res.destroyed ||
            req.socket.destroyed
          ) {
            hooks.respendAssessmentBudget(req, res);
          }
        },
      });
      const recording: RecordingCapture | undefined =
        retainRecording && audioFile.retainedSource
          ? {
              id: randomUUID(),
              storageScope: audioFile.retainedSource.scope,
              audioKey: audioFile.retainedSource.audioKey,
              s3VersionId: audioFile.retainedSource.s3VersionId,
              contentType: audioFile.retainedSource.contentType,
              sizeBytes: audioFile.retainedSource.sizeBytes,
              // Downstream persistence deliberately normalizes undefined to SQL
              // NULL. Keeping the stable capture shape avoids a semantically
              // redundant presence/absence branch in mock mode.
              durationMs,
              ...(audioFile.retainedSource.etag ? { etag: audioFile.retainedSource.etag } : {}),
            }
          : undefined;
      const response = await hooks.persist(user, question, claim, result, requestId, requestClaim.claimId, recording);
      const recordingWasRetained = recording !== undefined && response.recordingId === recording.id;
      if (recordingWasRetained) {
        // The metadata and idempotent response committed together. Suppress the
        // old success DeleteObject and promote the exact version; a durable
        // worker retries if this immediate best-effort tag fails.
        preserveSubmittedPresignedAudio(res);
        void tryRetainRecording(recording.id);
      }
      completed = true;
      // `finish` owns the normal response path, but a disconnected response has
      // already emitted its one early `close` and will never emit `finish`.
      // Settle the storage decision in a finally around res.json so opt-outs and
      // delete-all epoch fences are still deleted after their durable commit.
      // Every successfully retained recording is marked preserve=true first.
      try {
        return res.json(response);
      } finally {
        await completeSubmittedPresignedAudio(res);
      }
    } finally {
      if (claim) await hooks.clearClaim(user, question, claim);
      if (!completed) await abandonAssessmentRequest(user.id, requestId, requestClaim.claimId);
    }
  } finally {
    if (audioFile) await fs.unlink(audioFile.path).catch(() => {});
  }
}
