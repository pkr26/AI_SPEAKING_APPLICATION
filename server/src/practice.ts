import { createHash, randomUUID } from 'crypto';
import { NextFunction, Response, Router } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { assessNativeComprehension, assessSpeaking, type NativeLanguage } from './assess';
import { verifyAudioDuration } from './audio-inspection';
import {
  completeSubmittedPresignedAudioReplay,
  discardSubmittedPresignedAudio,
  finalizeSubmittedPresignedAudio,
  ownSubmittedPresignedAudio,
  preserveSubmittedPresignedAudio,
  resolvePresignedAudio,
} from './audio-upload';
import { config } from './config';
import { pool } from './db';
import { logger } from './logger';
import {
  abandonAssessmentRequest,
  AssessmentRequestInFlightError,
  claimAssessmentRequest,
  completeAssessmentRequest,
} from './idempotency';
import { AuthedRequest, h, HttpError, requireAuth, validate } from './middleware';
import { Limiters } from './rate-limit';
import { releaseTransactionClient, rollbackTransaction } from './transaction';
import { uploadAudio, verifyAudioMagicBytes } from './upload';

const MAX_ATTEMPTS = 3;
export const MAX_FINAL_FEEDBACK_LENGTH = 4000;
/** One practice attempt at or above this score masters the word. */
export const MASTER_SCORE = 75;

interface QuestionJson {
  id: string;
  cefrLevel: string;
  promptWord: string;
  questionText: string;
}

export type PracticeKind = 'revision' | 'new';

interface PracticePick {
  question: QuestionJson;
  kind: PracticeKind;
}

interface PracticeProgressJson {
  masteredCount: number;
  learningCount: number;
  totalAtLevel: number;
}

interface Queryable {
  query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

const QUESTION_COLUMNS = `q.id, q.cefr_level AS "cefrLevel", q.prompt_word AS "promptWord", q.question_text AS "questionText"`;

/** Oldest first: the word struggled with longest ago is revised first. */
async function pickRevisionQuestion(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT ${QUESTION_COLUMNS}
     FROM practice_progress pp
     JOIN questions q ON q.id = pp.question_id
     WHERE pp.user_id = $1 AND q.cefr_level = $2 AND pp.status = 'learning'
       AND ($3::uuid IS NULL OR q.id <> $3)
     ORDER BY pp.last_attempt_at ASC, random()
     LIMIT 1`,
    [userId, level, excludeQuestionId ?? null],
  );
  return rows[0];
}

async function pickNewQuestion(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT ${QUESTION_COLUMNS}
     FROM questions q
     LEFT JOIN practice_progress pp ON pp.question_id = q.id AND pp.user_id = $1
     WHERE q.cefr_level = $2 AND pp.question_id IS NULL
       AND ($3::uuid IS NULL OR q.id <> $3)
     ORDER BY random()
     LIMIT 1`,
    [userId, level, excludeQuestionId ?? null],
  );
  return rows[0];
}

/** Bank exhausted: keep mastered words in rotation, least recently seen first. */
async function pickRetentionQuestion(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT ${QUESTION_COLUMNS}
     FROM practice_progress pp
     JOIN questions q ON q.id = pp.question_id
     WHERE pp.user_id = $1 AND q.cefr_level = $2 AND pp.status = 'mastered'
       AND ($3::uuid IS NULL OR q.id <> $3)
     ORDER BY pp.last_attempt_at ASC, random()
     LIMIT 1`,
    [userId, level, excludeQuestionId ?? null],
  );
  return rows[0];
}

/**
 * Whether the user's most recent practice attempt was a revision (the word had
 * earlier practice attempts) or a new word. Drives the interleave: a session
 * opens with revision, then new and revision alternate. Undefined when the
 * user has never practiced.
 */
async function lastAttemptWasRevision(userId: string, db: Queryable): Promise<boolean | undefined> {
  const { rows } = await db.query<{ was_revision: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM attempts earlier
       WHERE earlier.user_id = latest.user_id
         AND earlier.question_id = latest.question_id
         AND earlier.context = 'practice'
         AND (earlier.created_at, earlier.id) < (latest.created_at, latest.id)
     ) AS was_revision
     FROM attempts latest
     WHERE latest.user_id = $1 AND latest.context = 'practice'
     ORDER BY latest.created_at DESC, latest.id DESC
     LIMIT 1`,
    [userId],
  );
  return rows[0]?.was_revision;
}

/**
 * Pick the next practice question: revision of still-learning words interleaved
 * with new words (session opens with revision when one is due, then buckets
 * alternate; an empty bucket defers to the other). When everything is
 * mastered, mastered words cycle back as retention revisions.
 */
export async function pickPracticeNext(
  userId: string,
  level: string,
  db: Queryable = pool,
  excludeQuestionId?: string,
): Promise<PracticePick | undefined> {
  const wasRevision = await lastAttemptWasRevision(userId, db);
  const preferRevision = wasRevision !== true;
  const first = preferRevision ? pickRevisionQuestion : pickNewQuestion;
  const second = preferRevision ? pickNewQuestion : pickRevisionQuestion;
  const firstKind: PracticeKind = preferRevision ? 'revision' : 'new';
  const secondKind: PracticeKind = preferRevision ? 'new' : 'revision';

  const firstPick = await first(userId, level, db, excludeQuestionId);
  if (firstPick) return { question: firstPick, kind: firstKind };
  const secondPick = await second(userId, level, db, excludeQuestionId);
  if (secondPick) return { question: secondPick, kind: secondKind };
  const retention = await pickRetentionQuestion(userId, level, db, excludeQuestionId);
  if (retention) return { question: retention, kind: 'revision' };
  return undefined;
}

async function practiceProgressSnapshot(
  userId: string,
  level: string,
  db: Queryable = pool,
): Promise<PracticeProgressJson> {
  const { rows } = await db.query<{ masteredCount: number; learningCount: number; totalAtLevel: number }>(
    `SELECT
       count(*) FILTER (WHERE pp.status = 'mastered')::int AS "masteredCount",
       count(*) FILTER (WHERE pp.status = 'learning')::int AS "learningCount",
       (SELECT count(*) FROM questions WHERE cefr_level = $2)::int AS "totalAtLevel"
     FROM practice_progress pp
     JOIN questions q ON q.id = pp.question_id
     WHERE pp.user_id = $1 AND q.cefr_level = $2`,
    [userId, level],
  );
  return rows[0];
}

const helpParamsSchema = z.object({
  id: z.string().uuid('question id must be a valid UUID'),
});

const attemptBodySchema = z.object({
  questionId: z.string().uuid('questionId must be a valid UUID'),
  requestId: z.string().uuid('requestId must be a valid UUID'),
});

// S3 mode receives JSON with the presigned object key; local mode receives
// multipart audio (see audio-upload.ts / upload.ts).
const attemptJsonBodySchema = attemptBodySchema.extend({ audioKey: z.string().max(512) });

interface PracticeClaim {
  attemptNo: number;
  claimId: string;
}

/** Claim one (user, question) attempt without holding a DB connection during AI work. */
async function claimPracticeAttempt(userId: string, questionId: string): Promise<PracticeClaim> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM practice_inflight
       WHERE user_id = $1 AND question_id = $2
         AND started_at < now() - interval '5 minutes'`,
      [userId, questionId],
    );

    const claimId = randomUUID();
    const claimed = await client.query(
      `INSERT INTO practice_inflight (user_id, question_id, claim_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, question_id) DO NOTHING`,
      [userId, questionId, claimId],
    );
    if (claimed.rowCount !== 1) {
      throw new HttpError(409, 'An assessment is already in progress for this question');
    }

    const { rows } = await client.query<{ attempt_no: number; passed: boolean | null }>(
      `SELECT attempt_no, passed FROM attempts
       WHERE user_id = $1 AND question_id = $2 AND context = 'practice'
       ORDER BY created_at DESC, attempt_no DESC LIMIT 1`,
      [userId, questionId],
    );
    const last = rows[0];
    const attemptNo = last && !last.passed && last.attempt_no < MAX_ATTEMPTS ? last.attempt_no + 1 : 1;
    await client.query('COMMIT');
    return { attemptNo, claimId };
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

async function clearPracticeClaim(userId: string, questionId: string, claimId: string): Promise<void> {
  try {
    await pool.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3', [
      userId,
      questionId,
      claimId,
    ]);
  } catch (err) {
    logger.warn({ err, userId, questionId, claimId }, 'failed to clear practice assessment claim');
  }
}

/**
 * Persist a scored attempt: insert the attempts row, upsert the word's
 * practice_progress (mastery at >= MASTER_SCORE, mastered words never
 * downgrade), and — for responses that advance — pick the next question inside
 * the same transaction so the idempotent replay always matches.
 */
async function storePracticeResult(
  userId: string,
  questionId: string,
  claim: PracticeClaim,
  result: Awaited<ReturnType<typeof assessSpeaking>>,
  mastered: boolean,
  requestId: string,
  requestClaimId: string,
  body: Record<string, unknown>,
  responseKind: 'passed' | 'retry' | 'final-failed',
  level: string,
  finalFeedback?: string,
): Promise<Record<string, unknown>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query(
      `SELECT 1 FROM practice_inflight
       WHERE user_id = $1 AND question_id = $2 AND claim_id = $3
       FOR UPDATE`,
      [userId, questionId, claim.claimId],
    );
    if (owned.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again');
    }
    await client.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'practice', $3, $4, $5, $6, $7)`,
      [userId, questionId, claim.attemptNo, result.transcript, result.score, result.passed, result.feedback],
    );
    await client.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, last_attempt_at)
       VALUES ($1, $2, $3, $4, 1, now())
       ON CONFLICT (user_id, question_id) DO UPDATE SET
         status = CASE
           WHEN practice_progress.status = 'mastered' THEN 'mastered'
           ELSE EXCLUDED.status
         END,
         best_score = greatest(practice_progress.best_score, EXCLUDED.best_score),
         attempt_count = practice_progress.attempt_count + 1,
         last_attempt_at = now()`,
      [userId, questionId, mastered ? 'mastered' : 'learning', result.score],
    );
    let response: Record<string, unknown>;
    if (responseKind === 'retry') {
      response = { ...body, attemptsLeft: MAX_ATTEMPTS - claim.attemptNo };
    } else {
      // Select after the current attempt is visible in this transaction and
      // explicitly exclude it. A pass/final failure must always advance.
      const nextPick = await pickPracticeNext(userId, level, client, questionId);
      const progress = await practiceProgressSnapshot(userId, level, client);
      const next = nextPick ? { ...nextPick, progress } : undefined;
      response = responseKind === 'passed' ? { ...body, next } : { ...body, attemptsLeft: 0, finalFeedback, next };
    }
    await client.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3', [
      userId,
      questionId,
      claim.claimId,
    ]);
    await completeAssessmentRequest(client, userId, requestId, requestClaimId, response);
    await client.query('COMMIT');
    return response;
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

/**
 * Silence is not an attempt: nothing is written to attempts/practice_progress
 * and the attempt counter does not advance. Only the idempotency record is
 * completed so a retry of the same request replays the same free-retry body.
 */
async function storeSilenceResult(
  userId: string,
  questionId: string,
  claim: PracticeClaim,
  requestId: string,
  requestClaimId: string,
  response: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query(
      `SELECT 1 FROM practice_inflight
       WHERE user_id = $1 AND question_id = $2 AND claim_id = $3
       FOR UPDATE`,
      [userId, questionId, claim.claimId],
    );
    if (owned.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again');
    }
    await client.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3', [
      userId,
      questionId,
      claim.claimId,
    ]);
    await completeAssessmentRequest(client, userId, requestId, requestClaimId, response);
    await client.query('COMMIT');
    return response;
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

export function authoredAnswerHint(question: Record<string, unknown>, language: string): string {
  const translations = question.translations as
    Record<string, { examples?: Array<{ en?: string }> } | undefined> | undefined;
  const example = translations?.[language]?.examples?.[0]?.en?.trim();
  return example || `a few clear, on-topic sentences about "${String(question.prompt_word)}"`;
}

function authoredNativeExample(question: Record<string, unknown>, language: string): string | undefined {
  const translations = question.translations as
    Record<string, { examples?: Array<{ native?: string }> } | undefined> | undefined;
  return translations?.[language]?.examples?.[0]?.native?.trim() || undefined;
}

export function buildFinalFeedback(providerFeedback: string, hint: string): string {
  const prefix = `Don't worry — here's the final feedback for this question: ${providerFeedback} A good answer could be: `;
  const suffix = ". Let's move on!";
  const availableHintLength = Math.max(0, MAX_FINAL_FEEDBACK_LENGTH - prefix.length - suffix.length);
  return `${prefix}${hint.slice(0, availableHintLength)}${suffix}`.slice(0, MAX_FINAL_FEEDBACK_LENGTH);
}

/**
 * When the learner's native-language answer misses the question, append the
 * authored native example (their own language, no extra AI call) so they can
 * see what an on-topic answer looks like. Capped to the attempts feedback
 * contract.
 */
function buildNativeFallbackFeedback(providerFeedback: string, nativeExample?: string): string {
  if (!nativeExample) return providerFeedback;
  const prefix = `${providerFeedback} An on-topic answer could be: `;
  const suffix = ' — try saying it in English next!';
  const available = Math.max(0, 800 - prefix.length - suffix.length);
  return `${prefix}${nativeExample.slice(0, available)}${suffix}`.slice(0, 800);
}

export function createPracticeRouter(limiters: Limiters) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  const requireCompletedDiagnostic = (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user!.diagnostic_completed || !req.user!.cefr_level) {
      return next(new HttpError(403, 'Diagnostic not completed'));
    }
    return next();
  };

  router.get(
    '/question',
    requireCompletedDiagnostic,
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const pick = await pickPracticeNext(user.id, user.cefr_level!);
      if (!pick) throw new HttpError(500, 'No questions available for this level');
      const progress = await practiceProgressSnapshot(user.id, user.cefr_level!);
      res.json({ question: pick.question, kind: pick.kind, progress });
    }),
  );

  router.get(
    '/question/:id/help',
    requireCompletedDiagnostic,
    validate({ params: helpParamsSchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { rows } = await pool.query('SELECT * FROM questions WHERE id = $1', [req.params.id]);
      const q = rows[0];
      if (!q) throw new HttpError(404, 'Question not found');
      if (q.cefr_level !== user.cefr_level) {
        throw new HttpError(403, 'Question is not available at your level');
      }
      const t = q.translations?.[user.native_language] as
        { word: string; question: string; examples: { en: string; native: string }[] } | undefined;
      if (!t) throw new HttpError(404, 'Translation not available for this question');
      const payload = {
        promptWord: q.prompt_word,
        promptWordNative: t.word,
        questionText: q.question_text,
        questionTextNative: t.question,
        examples: t.examples,
      };
      // Content is static per (question, language) — cache privately with an
      // ETag so repeat visits can be answered with a cheap 304.
      const etag = `"${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}"`;
      res.set('Cache-Control', 'private, max-age=3600');
      res.set('ETag', etag);
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      res.json(payload);
    }),
  );

  router.post(
    '/attempt',
    // Transient-object cleanup belongs to this submission route only: after
    // authentication, before eligibility, rate limiting, and validation, so
    // every authenticated submission path discards its owned key while reads
    // that happen to carry an audioKey body can never trigger a deletion.
    ...(config.s3.bucket ? [discardSubmittedPresignedAudio] : []),
    requireCompletedDiagnostic,
    limiters.assess,
    limiters.assessIpDaily,
    ...(config.s3.bucket
      ? [validate({ body: attemptJsonBodySchema })]
      : [uploadAudio, validate({ body: attemptBodySchema })]),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      // Only the route's own response finalizes here. On error paths the error
      // handler sets the real status only after this handler unwinds, so
      // finalizing now would read a stale 200 and delete objects that the
      // 409/429 contract preserves; the response-finish listener (registered
      // by discardSubmittedPresignedAudio) sees the final status and
      // finalizes those paths instead. Finalization is idempotent.
      let responded = false;
      try {
        const { questionId, requestId } = req.body as z.infer<typeof attemptBodySchema>;
        const { rows: qRows } = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
        const q = qRows[0];
        if (!q) throw new HttpError(404, 'Question not found');
        if (q.cefr_level !== user.cefr_level) {
          throw new HttpError(403, 'Question is not available at your level');
        }

        let requestClaim;
        try {
          requestClaim = await claimAssessmentRequest(user.id, requestId, 'practice', questionId);
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

        let claim: PracticeClaim | undefined;
        let completed = false;
        try {
          if (config.s3.bucket) await resolvePresignedAudio(req, res);
          if (!req.file) {
            throw new HttpError(400, 'audio file is required');
          }
          await verifyAudioMagicBytes(req.file.path);
          if (!config.mockAi) await verifyAudioDuration(req.file.path);
          claim = await claimPracticeAttempt(user.id, q.id);
          const result = await assessSpeaking(
            req.file.path,
            {
              cefrLevel: q.cefr_level,
              promptWord: q.prompt_word,
              questionText: q.question_text,
            },
            user.id,
          );

          let response: Record<string, unknown>;
          if (result.transcript === '') {
            // Silence: not an attempt. Nothing is persisted about the word and
            // the attempt counter does not advance; the retry is free.
            response = await storeSilenceResult(user.id, q.id, claim, requestId, requestClaim.claimId, {
              passed: false,
              noSpeech: true,
              mastered: false,
              attemptNo: claim.attemptNo,
              score: 0,
              transcript: '',
              feedback: result.feedback,
              attemptsLeft: MAX_ATTEMPTS - (claim.attemptNo - 1),
            });
          } else {
            const mastered = result.score >= MASTER_SCORE;
            const body: Record<string, unknown> = {
              passed: result.passed,
              mastered,
              attemptNo: claim.attemptNo,
              score: result.score,
              transcript: result.transcript,
              feedback: result.feedback,
            };

            let responseKind: 'passed' | 'retry' | 'final-failed';
            let finalFeedback: string | undefined;
            if (result.passed) {
              responseKind = 'passed';
            } else if (claim.attemptNo < MAX_ATTEMPTS) {
              responseKind = 'retry';
            } else {
              // Use reviewed, authored examples instead of making a second,
              // unmetered provider call after the assessment has already succeeded.
              const hint = authoredAnswerHint(q, user.native_language);
              finalFeedback = buildFinalFeedback(result.feedback, hint);
              responseKind = 'final-failed';
            }
            response = await storePracticeResult(
              user.id,
              q.id,
              claim,
              result,
              mastered,
              requestId,
              requestClaim.claimId,
              body,
              responseKind,
              user.cefr_level!,
              finalFeedback,
            );
          }
          completed = true;
          responded = true;
          return res.json(response);
        } finally {
          if (claim) await clearPracticeClaim(user.id, q.id, claim.claimId);
          if (!completed) await abandonAssessmentRequest(user.id, requestId, requestClaim.claimId);
        }
      } finally {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        if (responded && config.s3.bucket) await finalizeSubmittedPresignedAudio(res);
      }
    }),
  );

  // Native-language mode ("answer in my language"): the learner answers in
  // their mother tongue; we check comprehension and return a model English
  // answer. It never writes attempts or practice_progress — only English
  // attempts move mastery. Idempotency, audio gates, and rate limits are
  // identical to /attempt.
  router.post(
    '/attempt/native',
    ...(config.s3.bucket ? [discardSubmittedPresignedAudio] : []),
    requireCompletedDiagnostic,
    limiters.assess,
    limiters.assessIpDaily,
    ...(config.s3.bucket
      ? [validate({ body: attemptJsonBodySchema })]
      : [uploadAudio, validate({ body: attemptBodySchema })]),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      let responded = false;
      try {
        const { questionId, requestId } = req.body as z.infer<typeof attemptBodySchema>;
        const { rows: qRows } = await pool.query('SELECT * FROM questions WHERE id = $1', [questionId]);
        const q = qRows[0];
        if (!q) throw new HttpError(404, 'Question not found');
        if (q.cefr_level !== user.cefr_level) {
          throw new HttpError(403, 'Question is not available at your level');
        }

        let requestClaim;
        try {
          requestClaim = await claimAssessmentRequest(user.id, requestId, 'practice-native', questionId);
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

        let completed = false;
        try {
          if (config.s3.bucket) await resolvePresignedAudio(req, res);
          if (!req.file) {
            throw new HttpError(400, 'audio file is required');
          }
          await verifyAudioMagicBytes(req.file.path);
          if (!config.mockAi) await verifyAudioDuration(req.file.path);
          const result = await assessNativeComprehension(
            req.file.path,
            {
              cefrLevel: q.cefr_level,
              promptWord: q.prompt_word,
              questionText: q.question_text,
            },
            user.native_language as NativeLanguage,
            user.id,
          );
          const feedback =
            result.understood || result.transcript === ''
              ? result.feedback
              : buildNativeFallbackFeedback(result.feedback, authoredNativeExample(q, user.native_language));
          const response: Record<string, unknown> = {
            mode: 'native',
            understood: result.understood,
            transcript: result.transcript,
            modelAnswer: result.modelAnswer,
            feedback,
          };
          const client = await pool.connect();
          try {
            await client.query('BEGIN');
            await completeAssessmentRequest(client, user.id, requestId, requestClaim.claimId, response);
            await client.query('COMMIT');
          } catch (err) {
            return await rollbackTransaction(client, { value: err });
          } finally {
            releaseTransactionClient(client);
          }
          completed = true;
          responded = true;
          return res.json(response);
        } finally {
          if (!completed) await abandonAssessmentRequest(user.id, requestId, requestClaim.claimId);
        }
      } finally {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        if (responded && config.s3.bucket) await finalizeSubmittedPresignedAudio(res);
      }
    }),
  );

  return router;
}
