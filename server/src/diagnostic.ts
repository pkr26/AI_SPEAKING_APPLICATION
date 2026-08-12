import { randomUUID } from 'crypto';
import { Router } from 'express';
import fs from 'fs/promises';
import { PoolClient } from 'pg';
import { z } from 'zod';
import { assessSpeaking } from './assess';
import { resolvePresignedAudio } from './audio-upload';
import { config } from './config';
import { pool } from './db';
import { abandonAssessmentRequest, claimAssessmentRequest, completeAssessmentRequest } from './idempotency';
import { logger } from './logger';
import { AuthedRequest, h, HttpError, requireAuth, validate } from './middleware';
import { Limiters } from './rate-limit';
import { uploadAudio, verifyAudioMagicBytes } from './upload';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const MAX_QUESTIONS = 5;

interface DiagnosticStateRow {
  user_id: string;
  low_idx: number;
  high_idx: number;
  questions_asked: number;
  current_question_id: string | null;
  processing_question_id: string | null;
  processing_claim_id: string | null;
}

interface QuestionJson {
  id: string;
  cefrLevel: string;
  promptWord: string;
  questionText: string;
}

/** Lock and read the user's diagnostic state, creating it on first use. */
async function lockState(client: PoolClient, userId: string): Promise<DiagnosticStateRow> {
  const { rows } = await client.query<DiagnosticStateRow>(
    'SELECT * FROM diagnostic_state WHERE user_id = $1 FOR UPDATE',
    [userId],
  );
  if (rows[0]) return rows[0];
  await client.query(
    'INSERT INTO diagnostic_state (user_id, low_idx, high_idx, questions_asked) VALUES ($1, 0, 5, 0) ON CONFLICT (user_id) DO NOTHING',
    [userId],
  );
  const again = await client.query<DiagnosticStateRow>('SELECT * FROM diagnostic_state WHERE user_id = $1 FOR UPDATE', [
    userId,
  ]);
  return again.rows[0];
}

async function randomQuestionAt(client: PoolClient, level: string): Promise<QuestionJson | undefined> {
  const { rows } = await client.query<QuestionJson>(
    `SELECT id, cefr_level AS "cefrLevel", prompt_word AS "promptWord", question_text AS "questionText"
     FROM questions WHERE cefr_level = $1 ORDER BY random() LIMIT 1`,
    [level],
  );
  return rows[0];
}

async function questionById(client: PoolClient, questionId: string): Promise<QuestionJson | undefined> {
  const { rows } = await client.query<QuestionJson>(
    `SELECT id, cefr_level AS "cefrLevel", prompt_word AS "promptWord", question_text AS "questionText"
     FROM questions WHERE id = $1`,
    [questionId],
  );
  return rows[0];
}

const answerBodySchema = z.object({
  questionId: z.string().uuid('questionId must be a valid UUID'),
  requestId: z.string().uuid('requestId must be a valid UUID'),
});

// S3 mode receives JSON with the presigned object key; local mode receives
// multipart audio (see audio-upload.ts / upload.ts).
const answerJsonBodySchema = answerBodySchema.extend({ audioKey: z.string().max(512) });

interface QuestionRow {
  id: string;
  cefr_level: (typeof LEVELS)[number];
  prompt_word: string;
  question_text: string;
}

interface DiagnosticClaim {
  claimId: string;
  question: QuestionRow;
}

/**
 * Claim the currently served question in a short transaction. A durable claim
 * serializes submissions across API instances without holding a pool client
 * while transcription and grading run.
 */
async function claimDiagnosticAnswer(userId: string, questionId: string): Promise<DiagnosticClaim> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const state = await lockState(client, userId);
    if (!state.current_question_id || state.current_question_id !== questionId) {
      throw new HttpError(409, 'Question mismatch');
    }

    const { rows } = await client.query<QuestionRow>('SELECT * FROM questions WHERE id = $1', [questionId]);
    const question = rows[0];
    if (!question) throw new HttpError(404, 'Question not found');

    const claimId = randomUUID();
    const claimed = await client.query(
      `UPDATE diagnostic_state
       SET processing_question_id = $1, processing_started_at = now(), processing_claim_id = $2
       WHERE user_id = $3
         AND (processing_claim_id IS NULL OR processing_started_at < now() - interval '5 minutes')`,
      [questionId, claimId, userId],
    );
    if (claimed.rowCount !== 1) {
      throw new HttpError(409, 'An assessment is already in progress');
    }

    await client.query('COMMIT');
    return { claimId, question };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function clearDiagnosticClaim(userId: string, claimId: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE diagnostic_state
       SET processing_question_id = NULL, processing_started_at = NULL, processing_claim_id = NULL
       WHERE user_id = $1 AND processing_claim_id = $2`,
      [userId, claimId],
    );
  } catch (err) {
    // Preserve the route's real result/error; ownership expires after five
    // minutes even when cleanup temporarily cannot reach PostgreSQL.
    logger.warn({ err, userId, claimId }, 'failed to clear diagnostic assessment claim');
  }
}

async function finalizeDiagnosticAnswer(
  userId: string,
  question: QuestionRow,
  claimId: string,
  requestId: string,
  requestClaimId: string,
  result: Awaited<ReturnType<typeof assessSpeaking>>,
): Promise<Record<string, unknown>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const state = await lockState(client, userId);
    if (
      state.processing_claim_id !== claimId ||
      state.processing_question_id !== question.id ||
      state.current_question_id !== question.id
    ) {
      throw new HttpError(409, 'Assessment state changed; please try again');
    }

    const attemptNo = state.questions_asked + 1;
    await client.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'diagnostic', $3, $4, $5, $6, $7)`,
      [userId, question.id, attemptNo, result.transcript, result.score, result.passed, result.feedback],
    );

    const mid = LEVELS.indexOf(question.cefr_level);
    let low = state.low_idx;
    let high = state.high_idx;
    if (result.passed) low = mid + 1;
    else high = mid - 1;
    const done = low > high || attemptNo >= MAX_QUESTIONS;

    let body: Record<string, unknown> = {
      passed: result.passed,
      score: result.score,
      transcript: result.transcript,
      feedback: result.feedback,
    };

    if (done) {
      const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, high))];
      await client.query(
        `UPDATE diagnostic_state
         SET low_idx = $1, high_idx = $2, questions_asked = $3,
             current_question_id = NULL, processing_question_id = NULL,
             processing_started_at = NULL, processing_claim_id = NULL
         WHERE user_id = $4 AND processing_claim_id = $5`,
        [low, high, attemptNo, userId, claimId],
      );
      await client.query('UPDATE users SET cefr_level = $1, diagnostic_completed = true WHERE id = $2', [
        level,
        userId,
      ]);
      body = { ...body, done: true, level };
    } else {
      const nextMid = Math.floor((low + high) / 2);
      const nextQuestion = await randomQuestionAt(client, LEVELS[nextMid]);
      if (!nextQuestion) throw new HttpError(500, 'No questions available for this level');
      await client.query(
        `UPDATE diagnostic_state
         SET low_idx = $1, high_idx = $2, questions_asked = $3,
             current_question_id = $4, processing_question_id = NULL,
             processing_started_at = NULL, processing_claim_id = NULL
         WHERE user_id = $5 AND processing_claim_id = $6`,
        [low, high, attemptNo, nextQuestion.id, userId, claimId],
      );
      body = { ...body, done: false, nextQuestion };
    }

    await completeAssessmentRequest(client, userId, requestId, requestClaimId, body);
    await client.query('COMMIT');
    return body;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function createDiagnosticRouter(limiters: Limiters) {
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get(
    '/next',
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      if (user.diagnostic_completed) {
        return res.json({ done: true, level: user.cefr_level });
      }
      // Store the served question so /answer can reject anything else.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const state = await lockState(client, user.id);
        let question: QuestionJson | undefined;
        if (state.current_question_id) {
          question = await questionById(client, state.current_question_id);
        } else {
          const mid = Math.floor((state.low_idx + state.high_idx) / 2);
          question = await randomQuestionAt(client, LEVELS[mid]);
        }
        if (!question) throw new HttpError(500, 'No questions available for this level');
        if (!state.current_question_id) {
          await client.query('UPDATE diagnostic_state SET current_question_id = $1 WHERE user_id = $2', [
            question.id,
            user.id,
          ]);
        }
        await client.query('COMMIT');
        res.json({ done: false, question, progress: { asked: state.questions_asked, maxQuestions: MAX_QUESTIONS } });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }),
  );

  router.post(
    '/answer',
    limiters.assess,
    ...(config.s3.bucket
      ? [validate({ body: answerJsonBodySchema }), resolvePresignedAudio]
      : [uploadAudio, validate({ body: answerBodySchema })]),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      try {
        if (!req.file) {
          throw new HttpError(400, 'audio file is required');
        }
        await verifyAudioMagicBytes(req.file.path);

        const { questionId, requestId } = req.body as z.infer<typeof answerBodySchema>;
        const knownQuestion = await pool.query('SELECT 1 FROM questions WHERE id = $1', [questionId]);
        if (knownQuestion.rowCount !== 1) {
          throw new HttpError(409, 'Question mismatch');
        }
        const requestClaim = await claimAssessmentRequest(user.id, requestId, 'diagnostic', questionId);
        if (requestClaim.kind === 'completed') {
          return res.json(requestClaim.response);
        }

        if (user.diagnostic_completed) {
          await abandonAssessmentRequest(user.id, requestId, requestClaim.claimId);
          throw new HttpError(400, 'Diagnostic already completed');
        }

        let claimId: string | undefined;
        let completed = false;
        try {
          const claim = await claimDiagnosticAnswer(user.id, questionId);
          claimId = claim.claimId;
          const result = await assessSpeaking(
            req.file.path,
            {
              cefrLevel: claim.question.cefr_level,
              promptWord: claim.question.prompt_word,
              questionText: claim.question.question_text,
            },
            user.id,
          );
          const body = await finalizeDiagnosticAnswer(
            user.id,
            claim.question,
            claim.claimId,
            requestId,
            requestClaim.claimId,
            result,
          );
          completed = true;
          res.json(body);
        } finally {
          if (claimId) await clearDiagnosticClaim(user.id, claimId);
          if (!completed) await abandonAssessmentRequest(user.id, requestId, requestClaim.claimId);
        }
      } finally {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
      }
    }),
  );

  return router;
}
