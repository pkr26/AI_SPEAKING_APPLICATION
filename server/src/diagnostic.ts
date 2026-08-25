import { randomUUID } from 'crypto';
import { Router } from 'express';
import { PoolClient } from 'pg';
import { z } from 'zod';
import { AssessResult, assessSpeaking } from './assess';
import { buildAssessmentSubmissionChain, runAssessmentSubmission } from './assessment-pipeline';
import { pool, QUESTION_ROW_COLUMNS, QuestionRow } from './db';
import { completeAssessmentRequest } from './idempotency';
import { logger } from './logger';
import { AuthedRequest, h, HttpError, requireAuth, validate } from './middleware';
import { Limiters } from './rate-limit';
import { releaseTransactionClient, rollbackTransaction } from './transaction';

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
    // Account deletion locks users before cascading into diagnostic_state.
    // Claiming this child first could either deadlock with that cascade or
    // recreate a missing state row into a foreign-key error after deletion.
    const lockedUser = await client.query<{ diagnostic_completed: boolean }>(
      'SELECT diagnostic_completed FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const currentUser = lockedUser.rows[0];
    if (!currentUser) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    if (currentUser.diagnostic_completed) {
      throw new HttpError(400, 'Diagnostic already completed', 'DIAGNOSTIC_DONE');
    }
    const state = await lockState(client, userId);
    if (!state.current_question_id || state.current_question_id !== questionId) {
      throw new HttpError(409, 'Question mismatch', 'QUESTION_MISMATCH');
    }

    const { rows } = await client.query<QuestionRow>(`SELECT ${QUESTION_ROW_COLUMNS} FROM questions WHERE id = $1`, [
      questionId,
    ]);
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
      throw new HttpError(409, 'An assessment is already in progress', 'ASSESSMENT_IN_PROGRESS');
    }

    await client.query('COMMIT');
    return { claimId, question };
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
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
    try {
      logger.warn({ err, userId, claimId }, 'failed to clear diagnostic assessment claim');
    } catch {
      // A broken logger must not violate this hook's never-throw contract: the
      // pipeline still has to abandon its request claim after this returns.
    }
  }
}

async function finalizeDiagnosticAnswer(
  userId: string,
  question: QuestionRow,
  claimId: string,
  requestId: string,
  requestClaimId: string,
  result: AssessResult,
): Promise<Record<string, unknown>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Parent-first lock ordering (mirrors storePracticeResult in practice.ts):
    // account deletion locks users and then cascades into diagnostic_state, so
    // taking the child row first here would be a lock-inversion deadlock. The
    // locked row is also the existence check: when the account was deleted
    // while this assessment ran, lockState would otherwise re-insert the child
    // row and surface a foreign-key violation as a 500 instead of this 409.
    const lockedUser = await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (lockedUser.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const state = await lockState(client, userId);
    if (
      state.processing_claim_id !== claimId ||
      state.processing_question_id !== question.id ||
      state.current_question_id !== question.id
    ) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
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
      // diagnostic_state.high_idx is constrained to [-1, 5] and only moves
      // downward here, so only the all-failed -1 boundary needs clamping.
      const level = LEVELS[Math.max(0, high)];
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

    await completeAssessmentRequest(client, userId, requestId, requestClaimId, body, 'diagnostic');
    await client.query('COMMIT');
    return body;
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

export function createDiagnosticRouter(limiters: Limiters) {
  // Restart resets the learner's level, so the client must confirm explicitly.
  // Construct this with the router so every freshly built app gets the exact
  // validation contract instead of sharing module-initialization state.
  const restartBodySchema = z.object({
    confirm: z.literal(true, {
      errorMap: () => ({ message: 'must be true to restart the diagnostic' }),
    }),
  });
  const router = Router();
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  // Shared submission choreography (S3-conditional cleanup + paid limiters +
  // dual-mode validation); see assessment-pipeline.ts. Unlike practice there
  // is no eligibility middleware: the already-completed rejection runs inside
  // the pipeline after the request UUID is owned, so it abandons the claim.
  const submission = buildAssessmentSubmissionChain(limiters, 'diagnostic');

  router.get(
    '/next',
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      // Store the served question so /answer can reject anything else.
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Parent-first lock ordering (mirrors finalizeDiagnosticAnswer), and
        // the locked row — not the copy requireAuth read before this
        // transaction — decides whether the diagnostic is still running: this
        // lock waits out a final answer's finalization, which leaves a
        // terminal window (low_idx > high_idx) that would otherwise index
        // LEVELS out of range or serve a question /answer can only reject.
        const lockedUser = await client.query<{ cefr_level: string | null; diagnostic_completed: boolean }>(
          'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE',
          [user.id],
        );
        const lockedUserRow = lockedUser.rows[0];
        if (!lockedUserRow) {
          throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
        }
        if (lockedUserRow.diagnostic_completed) {
          await client.query('COMMIT');
          return res.json({ done: true, level: lockedUserRow.cefr_level });
        }
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
        return await rollbackTransaction(client, { value: err });
      } finally {
        releaseTransactionClient(client);
      }
    }),
  );

  // Retake the placement test. Resets the adaptive search and clears the
  // learner's placement (users_diagnostic_level_check allows a NULL level once
  // diagnostic_completed is false) while KEEPING all attempt history and
  // practice progress — re-placement resumes mastery already earned at the
  // newly assigned level.
  router.post(
    '/restart',
    limiters.diagnosticRestart,
    validate({ body: restartBodySchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Parent-first lock ordering (mirrors finalizeDiagnosticAnswer):
        // account deletion locks users and then cascades into diagnostic_state,
        // and a missing row means the account went away after requireAuth read
        // it, so the restart must report state change instead of letting
        // lockState re-insert the child row into a foreign-key violation.
        const lockedUser = await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [user.id]);
        if (lockedUser.rowCount !== 1) {
          throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
        }
        // Locks the row (creating it on first use) so a restart serializes
        // against any concurrent answer finalization.
        await lockState(client, user.id);
        await client.query(
          `UPDATE diagnostic_state
           SET low_idx = 0, high_idx = 5, questions_asked = 0,
               current_question_id = NULL, processing_question_id = NULL,
               processing_started_at = NULL, processing_claim_id = NULL
           WHERE user_id = $1`,
          [user.id],
        );
        await client.query('UPDATE users SET diagnostic_completed = false, cefr_level = NULL WHERE id = $1', [user.id]);
        await client.query('COMMIT');
      } catch (err) {
        return await rollbackTransaction(client, { value: err });
      } finally {
        releaseTransactionClient(client);
      }
      res.status(204).end();
    }),
  );

  router.post(
    '/answer',
    ...submission.middleware,
    h(async (req: AuthedRequest, res) =>
      runAssessmentSubmission<DiagnosticClaim, AssessResult>(req, res, {
        storageScope: submission.storageScope,
        context: 'diagnostic',
        bodySchema: submission.bodySchema,
        respendAssessmentBudget: submission.respendAssessmentBudget,
        // A questionId that matches no catalog row can never be the served
        // question, so it shares the mismatch contract instead of a 404.
        questionMissingError: () => new HttpError(409, 'Question mismatch', 'QUESTION_MISMATCH'),
        requireQuestionAtUserLevel: false,
        assertEligibleAfterOwned: (user) => {
          if (user.diagnostic_completed) {
            throw new HttpError(400, 'Diagnostic already completed', 'DIAGNOSTIC_DONE');
          }
        },
        claimAttempt: (user, question) => claimDiagnosticAnswer(user.id, question.id),
        // The claim's question is authoritative (it must match the served
        // current_question_id), so the prompt context comes from the claim.
        assess: (audioPath, user, _question, claim, options) =>
          assessSpeaking(
            audioPath,
            {
              cefrLevel: claim.question.cefr_level,
              promptWord: claim.question.prompt_word,
              questionText: claim.question.question_text,
            },
            user.id,
            options,
          ),
        persist: (user, _question, claim, result, requestId, requestClaimId) =>
          finalizeDiagnosticAnswer(user.id, claim.question, claim.claimId, requestId, requestClaimId, result),
        clearClaim: (user, _question, claim) => clearDiagnosticClaim(user.id, claim.claimId),
      }),
    ),
  );

  return router;
}
