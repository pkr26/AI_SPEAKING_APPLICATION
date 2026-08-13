import { createHash, randomUUID } from 'crypto';
import { Router } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { assessSpeaking } from './assess';
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

interface QuestionJson {
  id: string;
  cefrLevel: string;
  promptWord: string;
  questionText: string;
}

/**
 * Pick a question at the user's level, preferring questions with no passed
 * practice attempt by this user, then the least-recently attempted ones,
 * with a random tiebreak.
 */
interface Queryable {
  query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

async function pickPracticeQuestion(
  userId: string,
  level: string,
  db: Queryable = pool,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT q.id, q.cefr_level AS "cefrLevel", q.prompt_word AS "promptWord", q.question_text AS "questionText"
     FROM questions q
     LEFT JOIN attempts a
       ON a.question_id = q.id AND a.user_id = $1 AND a.context = 'practice'
     WHERE q.cefr_level = $2
       AND ($3::uuid IS NULL OR q.id <> $3)
     GROUP BY q.id
     ORDER BY COALESCE(BOOL_OR(a.passed), FALSE) ASC,
              MAX(a.created_at) ASC NULLS FIRST,
              random()
     LIMIT 1`,
    [userId, level, excludeQuestionId ?? null],
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

async function storePracticeResult(
  userId: string,
  questionId: string,
  claim: PracticeClaim,
  result: Awaited<ReturnType<typeof assessSpeaking>>,
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
    let response: Record<string, unknown>;
    if (responseKind === 'retry') {
      response = { ...body, attemptsLeft: MAX_ATTEMPTS - claim.attemptNo };
    } else {
      // Select after the current attempt is visible in this transaction and
      // explicitly exclude it. A pass/final failure must always advance.
      const nextQuestion = await pickPracticeQuestion(userId, level, client, questionId);
      response =
        responseKind === 'passed'
          ? { ...body, nextQuestion }
          : { ...body, attemptsLeft: 0, finalFeedback, nextQuestion };
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

export function buildFinalFeedback(providerFeedback: string, hint: string): string {
  const prefix = `Don't worry — here's the final feedback for this question: ${providerFeedback} A good answer could be: `;
  const suffix = ". Let's move on!";
  const availableHintLength = Math.max(0, MAX_FINAL_FEEDBACK_LENGTH - prefix.length - suffix.length);
  return `${prefix}${hint.slice(0, availableHintLength)}${suffix}`.slice(0, MAX_FINAL_FEEDBACK_LENGTH);
}

export function createPracticeRouter(limiters: Limiters) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);
  // Register transient-object cleanup before eligibility checks, per-route rate
  // limiting, and validation so every authenticated submission path is covered.
  if (config.s3.bucket) router.use(discardSubmittedPresignedAudio);
  router.use((req: AuthedRequest, _res, next) => {
    if (!req.user!.diagnostic_completed || !req.user!.cefr_level) {
      return next(new HttpError(403, 'Diagnostic not completed'));
    }
    return next();
  });

  router.get(
    '/question',
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const question = await pickPracticeQuestion(user.id, user.cefr_level!);
      if (!question) throw new HttpError(500, 'No questions available for this level');
      res.json({ question });
    }),
  );

  router.get(
    '/question/:id/help',
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
    limiters.assess,
    limiters.assessIpDaily,
    ...(config.s3.bucket
      ? [validate({ body: attemptJsonBodySchema })]
      : [uploadAudio, validate({ body: attemptBodySchema })]),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
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
          const body: Record<string, unknown> = {
            passed: result.passed,
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
          const response = await storePracticeResult(
            user.id,
            q.id,
            claim,
            result,
            requestId,
            requestClaim.claimId,
            body,
            responseKind,
            user.cefr_level!,
            finalFeedback,
          );
          completed = true;
          return res.json(response);
        } finally {
          if (claim) await clearPracticeClaim(user.id, q.id, claim.claimId);
          if (!completed) await abandonAssessmentRequest(user.id, requestId, requestClaim.claimId);
        }
      } finally {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        if (config.s3.bucket) await finalizeSubmittedPresignedAudio(res);
      }
    }),
  );

  return router;
}
