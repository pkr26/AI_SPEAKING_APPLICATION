import { RequestHandler, Response } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { AssessOptions } from './assess';
import { verifyAudioDuration } from './audio-inspection';
import {
  completeSubmittedPresignedAudioReplay,
  discardSubmittedPresignedAudio,
  finalizeSubmittedPresignedAudio,
  ownSubmittedPresignedAudio,
  preserveSubmittedPresignedAudio,
  resolvePresignedAudio,
  SubmittedAudioFile,
} from './audio-upload';
import { config } from './config';
import { pool, QUESTION_ROW_COLUMNS, QuestionRow } from './db';
import {
  abandonAssessmentRequest,
  AssessmentContext,
  AssessmentRequestInFlightError,
  claimAssessmentRequest,
} from './idempotency';
import { AuthedRequest, HttpError, UserRow, validate, validated } from './middleware';
import { Limiters } from './rate-limit';
import { uploadAudio, verifyAudioMagicBytes } from './upload';

/**
 * Shared choreography for the three paid assessment submission routes
 * (practice /attempt, practice /attempt/native, diagnostic /answer): one
 * middleware chain (S3-conditional cleanup registration, eligibility, paid
 * limiters, dual-mode body handling) and one request runner owning the
 * question fetch, the idempotency-claim dance, the audio gates, and the exact
 * cleanup semantics. Route-specific behavior (per-route claims, provider call,
 * persistence, error codes) is injected through AssessmentSubmissionHooks.
 */

const submissionBodySchema = z.object({
  questionId: z.string().uuid('questionId must be a valid UUID'),
  requestId: z.string().uuid('requestId must be a valid UUID'),
});

// S3 mode receives JSON with the presigned object key; local mode receives
// multipart audio (see audio-upload.ts / upload.ts).
const submissionJsonBodySchema = submissionBodySchema.extend({ audioKey: z.string().max(512) });

export type SubmissionBodySchema = typeof submissionBodySchema | typeof submissionJsonBodySchema;

export interface AssessmentSubmissionChain {
  /** Mount before the route handler; ends with the dual-mode body validation. */
  middleware: RequestHandler[];
  /** The exact schema instance validate() parsed, for validated() reads. */
  bodySchema: SubmissionBodySchema;
}

/**
 * Build the submission middleware chain. Resolved at router build time (not
 * module load): tests flip config.s3.bucket before creating the app.
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
  eligibility: RequestHandler[] = [],
): AssessmentSubmissionChain {
  const bodySchema = config.s3.bucket ? submissionJsonBodySchema : submissionBodySchema;
  return {
    bodySchema,
    middleware: [
      ...(config.s3.bucket ? [discardSubmittedPresignedAudio] : []),
      ...eligibility,
      limiters.assess,
      limiters.assessIpDaily,
      limiters.assessAbortGuard,
      ...(config.s3.bucket ? [validate({ body: bodySchema })] : [uploadAudio, validate({ body: bodySchema })]),
    ],
  };
}

export interface AssessmentSubmissionHooks<Claim, Result> {
  /** Idempotency context stored with the durable request claim. */
  context: AssessmentContext;
  /** The chain's schema instance, so the runner reads the validated body. */
  bodySchema: SubmissionBodySchema;
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
 * - outer finally: the local audio file is always unlinked, and the S3 object
 *   is finalized here only when the route responded itself — on error paths
 *   the error handler sets the real status only after this handler unwinds,
 *   so finalizing now would read a stale 200 and delete objects that the
 *   409/429 contract preserves; the response-finish listener (registered by
 *   discardSubmittedPresignedAudio) sees the final status and finalizes those
 *   paths instead. Finalization is idempotent.
 */
export async function runAssessmentSubmission<Claim, Result>(
  req: AuthedRequest,
  res: Response,
  hooks: AssessmentSubmissionHooks<Claim, Result>,
): Promise<unknown> {
  const user = req.user!;
  let responded = false;
  let audioFile: SubmittedAudioFile | undefined = req.file;
  try {
    const { questionId, requestId } = validated(req, hooks.bodySchema);
    const { rows: qRows } = await pool.query<QuestionRow>(
      `SELECT ${QUESTION_ROW_COLUMNS} FROM questions WHERE id = $1`,
      [questionId],
    );
    const question = qRows[0];
    if (!question) throw hooks.questionMissingError();
    if (hooks.requireQuestionAtUserLevel && question.cefr_level !== user.cefr_level) {
      throw new HttpError(403, 'Question is not available at your level');
    }

    let requestClaim;
    try {
      requestClaim = await claimAssessmentRequest(user.id, requestId, hooks.context, questionId);
    } catch (err) {
      if (err instanceof AssessmentRequestInFlightError) {
        preserveSubmittedPresignedAudio(res);
      }
      throw err;
    }
    if (requestClaim.kind === 'completed') {
      completeSubmittedPresignedAudioReplay(res);
      responded = true;
      return res.json(requestClaim.response);
    }
    ownSubmittedPresignedAudio(res);

    let claim: Claim | undefined;
    let completed = false;
    try {
      await hooks.assertEligibleAfterOwned?.(user);
      if (config.s3.bucket) audioFile = await resolvePresignedAudio(req, res);
      if (!audioFile) {
        throw new HttpError(400, 'audio file is required');
      }
      await verifyAudioMagicBytes(audioFile.path);
      if (!config.mockAi) await verifyAudioDuration(audioFile.path);
      claim = await hooks.claimAttempt(user, question);
      const result = await hooks.assess(audioFile.path, user, question, claim, {
        // Once the capacity reservation commits, the assessment limiters
        // must not refund this request even if it later fails (>=400).
        onCapacityReserved: () => void (res.locals.assessmentCapacityReserved = true),
      });
      const response = await hooks.persist(user, question, claim, result, requestId, requestClaim.claimId);
      completed = true;
      responded = true;
      return res.json(response);
    } finally {
      if (claim) await hooks.clearClaim(user, question, claim);
      if (!completed) await abandonAssessmentRequest(user.id, requestId, requestClaim.claimId);
    }
  } finally {
    if (audioFile) await fs.unlink(audioFile.path).catch(() => {});
    if (responded && config.s3.bucket) await finalizeSubmittedPresignedAudio(res);
  }
}
