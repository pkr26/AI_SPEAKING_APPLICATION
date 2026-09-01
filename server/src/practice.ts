import { createHash, randomUUID } from 'crypto';
import { NextFunction, Response, Router } from 'express';
import { z } from 'zod';
import {
  AssessResult,
  assessNativeComprehension,
  assessSpeaking,
  NativeAssessResult,
  type NativeLanguage,
} from './assess';
import { buildAssessmentSubmissionChain, runAssessmentSubmission } from './assessment-pipeline';
import { pool, QUESTION_ROW_COLUMNS, QuestionRow } from './db';
import { logger } from './logger';
import { completeAssessmentRequest, validatedAttemptQuestionSnapshot } from './idempotency';
import { AuthedRequest, h, HttpError, requireAuth, validate, validated } from './middleware';
import { Limiters } from './rate-limit';
import { RecordingCapture } from './recording-store';
import { releaseTransactionClient, rollbackTransaction } from './transaction';

/** Hard per-cycle try budget: one assigned question, three tries shared by English and native speech. */
const MAX_ATTEMPTS = 3;
export const MAX_FINAL_FEEDBACK_LENGTH = 4000;
/** One practice attempt at or above this score masters the word. */
const MASTER_SCORE = 75;
/** Scores below this fail the attempt (and demote a mastered word). */
export const PASS_SCORE = 60;
/**
 * Spaced-repetition review intervals in days, indexed by
 * practice_progress.srs_interval_index; the index clamps at the last entry.
 */
export const SRS_INTERVALS_DAYS = [1, 3, 7, 21, 60] as const;
/** A skipped word stays out of new/revision selection for this long. */
const SKIP_DAYS = 7;

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
/**
 * Mastering this share of the level's word bank (with the next level existing)
 * promotes the learner inside the same transaction as the mastering attempt.
 */
const LEVEL_UP_MASTERY_RATIO = 0.85;

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

interface PracticeQuestionPayload extends PracticePick {
  cycleId: string;
  attemptsUsed: number;
  attemptsLeft: number;
  progress: PracticeProgressJson;
}

interface PracticeProgressJson {
  masteredCount: number;
  learningCount: number;
  totalAtLevel: number;
  dueCount: number;
}

interface Queryable {
  query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

interface CurrentPracticeUser {
  cefr_level: string | null;
  diagnostic_completed: boolean;
  native_language: string;
}

/**
 * Run a read that must agree with the learner's current placement/profile.
 * Practice writers all lock users first with FOR UPDATE, so a compatible
 * parent-first FOR SHARE lock gives the multi-query read one coherent state
 * without serializing it against other readers.
 */
async function withCurrentPracticeUser<T>(
  userId: string,
  read: (client: Queryable, user: CurrentPracticeUser) => Promise<T>,
  lock: 'SHARE' | 'UPDATE' = 'SHARE',
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<CurrentPracticeUser>(
      `SELECT cefr_level, diagnostic_completed, native_language FROM users WHERE id = $1 FOR ${lock}`,
      [userId],
    );
    const user = rows[0];
    if (!user) throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    const result = await read(client, user);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

/**
 * Shared SELECT projection for the questions table: aliases the snake_case columns into the
 * exact camelCase keys of QuestionJson so every question-fetch query returns one wire shape.
 */
function questionColumns(): string {
  return `q.id, q.cefr_level AS "cefrLevel", q.prompt_word AS "promptWord", q.question_text AS "questionText"`;
}

/**
 * SRS ordering: earliest due_at first, so overdue words (due_at <= now())
 * always outrank not-yet-due ones, and when nothing is due the word closest to
 * its review date is the fallback. Skipped words are ineligible until
 * skipped_until passes.
 */
async function pickRevisionQuestion(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT ${questionColumns()}
     FROM practice_progress pp
     JOIN questions q ON q.id = pp.question_id
     WHERE pp.user_id = $1 AND q.cefr_level = $2 AND pp.status = 'learning'
       AND (pp.skipped_until IS NULL OR pp.skipped_until <= now())
       AND ($3::uuid IS NULL OR q.id <> $3)
     ORDER BY pp.due_at ASC, random()
     LIMIT 1`,
    [userId, level, excludeQuestionId ?? null],
  );
  return rows[0];
}

// A skipped word already has a practice_progress row (the skip upsert creates
// one), so the row-existence filter below is also what keeps skipped words out
// of the "new" bucket until their skip expires into the revision bucket.
/** Pick a uniformly random question at this level that has no practice_progress row yet. */
async function pickNewQuestion(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT ${questionColumns()}
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

/**
 * Bank exhausted: keep mastered words in rotation, due-first like revision.
 * A skip never makes a mastered word ineligible here (retention must not
 * dead-end when every word is parked), but a parked word sorts LAST: skipping
 * defers the word whenever another mastered word can take its place, instead
 * of re-serving the identical question the learner just skipped.
 */
async function pickRetentionQuestion(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT ${questionColumns()}
     FROM practice_progress pp
     JOIN questions q ON q.id = pp.question_id
     WHERE pp.user_id = $1 AND q.cefr_level = $2 AND pp.status = 'mastered'
       AND ($3::uuid IS NULL OR q.id <> $3)
     ORDER BY (pp.skipped_until IS NULL OR pp.skipped_until <= now()) DESC, pp.due_at ASC, random()
     LIMIT 1`,
    [userId, level, excludeQuestionId ?? null],
  );
  return rows[0];
}

/**
 * Dead-end fallback: a learner who skipped EVERY word at their level empties
 * all three buckets (new/revision exclude parked words; retention needs a
 * mastered word) for the rest of the 7-day park. Serve the skipped learning
 * word whose park expires soonest so GET /practice/question always has an
 * answer instead of hard-500ing for up to SKIP_DAYS days.
 */
async function pickSkippedFallbackQuestion(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<QuestionJson | undefined> {
  const { rows } = await db.query<QuestionJson>(
    `SELECT ${questionColumns()}
     FROM practice_progress pp
     JOIN questions q ON q.id = pp.question_id
     WHERE pp.user_id = $1 AND q.cefr_level = $2 AND pp.status = 'learning'
       AND pp.skipped_until > now()
       AND ($3::uuid IS NULL OR q.id <> $3)
     ORDER BY pp.skipped_until ASC, random()
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
         AND earlier.context IN ('practice', 'practice-native')
         AND (earlier.created_at, earlier.id) < (latest.created_at, latest.id)
     ) AS was_revision
     FROM attempts latest
     WHERE latest.user_id = $1 AND latest.context IN ('practice', 'practice-native')
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
 * mastered, mastered words cycle back as retention revisions. A level whose
 * words are ALL parked by skips falls back to the soonest-unparking skipped
 * learning word, so skipping every word never dead-ends the session.
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
  const skipped = await pickSkippedFallbackQuestion(userId, level, db, excludeQuestionId);
  if (skipped) return { question: skipped, kind: 'revision' };
  return undefined;
}

/**
 * Aggregate progress counters for one level: mastered and learning word counts (progress
 * rows joined to that level's questions), the level's full bank size, and how many words are
 * due now (due_at passed and not parked by a skip). Read-only, so callers pass their own
 * transaction client when the snapshot must agree with their locks.
 */
async function practiceProgressSnapshot(
  userId: string,
  level: string,
  db: Queryable = pool,
): Promise<PracticeProgressJson> {
  const { rows } = await db.query<PracticeProgressJson>(
    `SELECT
       count(*) FILTER (WHERE pp.status = 'mastered')::int AS "masteredCount",
       count(*) FILTER (WHERE pp.status = 'learning')::int AS "learningCount",
       (SELECT count(*) FROM questions WHERE cefr_level = $2)::int AS "totalAtLevel",
       count(*) FILTER (
         WHERE pp.due_at <= now() AND (pp.skipped_until IS NULL OR pp.skipped_until <= now())
       )::int AS "dueCount"
     FROM practice_progress pp
     JOIN questions q ON q.id = pp.question_id
     WHERE pp.user_id = $1 AND q.cefr_level = $2`,
    [userId, level],
  );
  return rows[0];
}

interface ActivePracticeCycleRow extends QuestionJson {
  cycleId: string;
  kind: PracticeKind;
  attemptsUsed: number;
}

/**
 * Load the learner's one active practice cycle with its assigned question, locking only the
 * practice_cycles row (FOR UPDATE OF pc, never the joined questions row) so the resume-vs-
 * reassign decision serializes against concurrent attempts, skips, and closures. Returns
 * undefined when nothing is being served.
 */
async function activePracticeCycle(userId: string, db: Queryable): Promise<ActivePracticeCycleRow | undefined> {
  const { rows } = await db.query<ActivePracticeCycleRow>(
    `SELECT pc.id AS "cycleId", pc.kind, pc.attempts_used AS "attemptsUsed",
            ${questionColumns()}
     FROM practice_cycles pc
     JOIN questions q ON q.id = pc.question_id
     WHERE pc.user_id = $1 AND pc.status = 'active'
     FOR UPDATE OF pc`,
    [userId],
  );
  return rows[0];
}

/**
 * Pick the next question and INSERT the fresh active practice_cycles row for it, returning
 * the complete GET /practice/question payload with zero attempts used. Runs inside the
 * caller's transaction so the at-most-one-active-cycle invariant and the embedded progress
 * snapshot commit atomically; returns undefined only when every selection bucket is empty.
 */
async function createPracticeCyclePayload(
  userId: string,
  level: string,
  db: Queryable,
  excludeQuestionId?: string,
): Promise<PracticeQuestionPayload | undefined> {
  const pick = await pickPracticeNext(userId, level, db, excludeQuestionId);
  if (!pick) return undefined;
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO practice_cycles (user_id, question_id, kind)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, pick.question.id, pick.kind],
  );
  const progress = await practiceProgressSnapshot(userId, level, db);
  return {
    cycleId: rows[0].id,
    attemptsUsed: 0,
    attemptsLeft: MAX_ATTEMPTS,
    question: pick.question,
    kind: pick.kind,
    progress,
  };
}

/** Resume the assigned question after a remount, or atomically assign one. */
async function getOrCreatePracticeCyclePayload(
  userId: string,
  level: string,
  db: Queryable,
): Promise<PracticeQuestionPayload | undefined> {
  const active = await activePracticeCycle(userId, db);
  if (active && active.cefrLevel === level) {
    const progress = await practiceProgressSnapshot(userId, level, db);
    return {
      cycleId: active.cycleId,
      attemptsUsed: active.attemptsUsed,
      attemptsLeft: MAX_ATTEMPTS - active.attemptsUsed,
      question: {
        id: active.id,
        cefrLevel: active.cefrLevel,
        promptWord: active.promptWord,
        questionText: active.questionText,
      },
      kind: active.kind,
      progress,
    };
  }
  if (active) {
    // Defensive repair for a diagnostic re-placement or an older deployment
    // that changed the level without closing its serving row.
    await db.query(
      `UPDATE practice_cycles
       SET status = 'closed', closed_at = now(), updated_at = now()
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [active.cycleId, userId],
    );
  }
  return createPracticeCyclePayload(userId, level, db);
}

interface PracticeClaim {
  attemptNo: number;
  claimId: string;
  cycleId: string;
}

/** Claim one (user, question) attempt without holding a DB connection during AI work. */
async function claimPracticeAttempt(
  userId: string,
  questionId: string,
  questionLevel: string,
  cycleId: string,
): Promise<PracticeClaim> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Parent-first lock ordering (mirrors storePracticeResult and
    // diagnostic.ts): account deletion locks users and then cascades into
    // practice_inflight, so taking the child row first here — the stale-claim
    // DELETE below, or the INSERT's FK check — would be a lock inversion that
    // deadlocks (40P01) against a concurrent DELETE /auth/account.
    const lockedUser = await client.query<{ cefr_level: string | null; diagnostic_completed: boolean }>(
      'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const currentUser = lockedUser.rows[0];
    if (!currentUser) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    // The request-time user snapshot can go stale while audio validation runs:
    // a diagnostic restart or rival promotion must be noticed before this path
    // begins paid provider work. Once a claim is live, persist handles a later
    // level change as its own state transition.
    if (!currentUser.diagnostic_completed || currentUser.cefr_level !== questionLevel) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const cycle = await client.query<{ attempts_used: number }>(
      `SELECT attempts_used
       FROM practice_cycles
       WHERE id = $1 AND user_id = $2 AND question_id = $3 AND status = 'active'
       FOR UPDATE`,
      [cycleId, userId, questionId],
    );
    if (!cycle.rows[0]) {
      throw new HttpError(409, 'This practice question is no longer active', 'PRACTICE_CYCLE_CLOSED');
    }

    // Steal-only-after-5-minutes lease semantics: a legitimate submission can
    // never outlive this window because the whole request (S3 download +
    // provider deadlines + inspection) is bounded well under it — config
    // enforces request budget ≤ SHUTDOWN_DRAIN_MS and the provider timeouts
    // cap at 70s per call. Only a crashed/abandoned worker leaves a claim this
    // old, and the persist-side attempt/cycle guards make a stolen lease fail
    // safe (409, no double-count) even if two workers ever race.
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
      throw new HttpError(409, 'An assessment is already in progress for this question', 'ASSESSMENT_IN_PROGRESS');
    }

    const attemptNo = cycle.rows[0].attempts_used + 1;
    await client.query('COMMIT');
    return { attemptNo, claimId, cycleId };
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

/**
 * Best-effort release of the per-question in-flight claim after a failed or aborted
 * submission. Deliberately never throws — the pipeline must still abandon its request claim
 * after this hook — and a claim that cannot be cleared self-expires through the five-minute
 * steal window in claimPracticeAttempt.
 */
async function clearPracticeClaim(userId: string, questionId: string, claimId: string): Promise<void> {
  try {
    await pool.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3', [
      userId,
      questionId,
      claimId,
    ]);
  } catch (err) {
    try {
      logger.warn({ err, userId, questionId, claimId }, 'failed to clear practice assessment claim');
    } catch {
      // Preserve the route's real result/error and let the pipeline continue
      // to its request-claim abandonment even when observability is impaired.
    }
  }
}

/**
 * Persist a scored attempt: insert the attempts row (snapshotting the exact
 * graded question wording per migration 026), upsert the word's
 * practice_progress with its SRS schedule (mastery at >= MASTER_SCORE; a
 * mastered word demotes back to learning only when a scored attempt on it
 * fails below PASS_SCORE), evaluate CEFR promotion when the attempt just
 * mastered a word, and — for responses that advance — pick the next question
 * inside the same transaction so the idempotent replay always matches.
 */
async function storePracticeResult(
  userId: string,
  question: QuestionRow,
  claim: PracticeClaim,
  result: AssessResult,
  mastered: boolean,
  requestId: string,
  requestClaimId: string,
  body: Record<string, unknown>,
  level: string,
  finalFeedback: string,
  recording?: RecordingCapture,
): Promise<Record<string, unknown>> {
  // Migration 026 snapshot: history and export read these columns instead of
  // rejoining the mutable catalog, so the row must carry the exact in-memory
  // question this result was graded against.
  const snapshot = validatedAttemptQuestionSnapshot({
    cefrLevel: question.cefr_level,
    promptWord: question.prompt_word,
    questionText: question.question_text,
  });
  const questionId = question.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serialize every scored result for a learner before any child-row/FK
    // write. Besides making threshold promotion atomic, this makes a result
    // that waited behind a rival promotion answer from the learner's current
    // level even when this result itself did not master a word. Parent-first
    // ordering also avoids lock-upgrade and account-deletion deadlocks.
    const lockedUser = await client.query<{ cefr_level: string | null }>(
      'SELECT cefr_level FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const lockedUserLevel = lockedUser.rows[0]?.cefr_level;
    if (!lockedUserLevel) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const owned = await client.query(
      `SELECT 1 FROM practice_inflight
       WHERE user_id = $1 AND question_id = $2 AND claim_id = $3
       FOR UPDATE`,
      [userId, questionId, claim.claimId],
    );
    if (owned.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const cycle = await client.query<{ attempts_used: number }>(
      `SELECT attempts_used FROM practice_cycles
       WHERE id = $1 AND user_id = $2 AND question_id = $3 AND status = 'active'
       FOR UPDATE`,
      [claim.cycleId, userId, questionId],
    );
    if (cycle.rows[0]?.attempts_used !== claim.attemptNo - 1) {
      throw new HttpError(409, 'This practice question is no longer active', 'PRACTICE_CYCLE_CLOSED');
    }
    const insertedAttempt = await client.query<{ id: string }>(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id,
          cefr_level, prompt_word, question_text)
       VALUES ($1, $2, 'practice', $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        userId,
        questionId,
        claim.attemptNo,
        result.transcript,
        result.score,
        result.passed,
        result.feedback,
        claim.cycleId,
        snapshot.cefrLevel,
        snapshot.promptWord,
        snapshot.questionText,
      ],
    );
    if (recording) recording.attemptId = insertedAttempt.rows[0].id;
    // Lock the word's progress row (when it exists) so the mastery transition
    // and the promotion decision below read a stable prior state even if a
    // rival transaction touches the same word.
    const prior = await client.query<{ status: string }>(
      'SELECT status FROM practice_progress WHERE user_id = $1 AND question_id = $2 FOR UPDATE',
      [userId, questionId],
    );
    const justMastered = mastered && prior.rows[0]?.status !== 'mastered';
    // SRS schedule, bucketed by score:
    //   < PASS_SCORE          -> due now, index 0 (a mastered word DEMOTES to
    //                            learning — the only downgrade path);
    //   PASS_SCORE..<MASTER   -> learning word: due in 1 day, index 1. A
    //                            mastered word keeps its status and treats the
    //                            pass as retention: index advances (clamped)
    //                            exactly like a mastery pass;
    //   >= MASTER_SCORE       -> mastered, index advances (clamped), due after
    //                            SRS_INTERVALS_DAYS[new index] days.
    // The insert branch bakes the same rules for a first attempt (prior
    // index 0): mastered -> index 1 / +3d, passed -> index 1 / +1d,
    // failed -> index 0 / due now. A scored answer puts the word back in play,
    // so both branches clear any skip park (skipped_until).
    const insertIndex = mastered || result.score >= PASS_SCORE ? 1 : 0;
    const insertDueDays = mastered ? SRS_INTERVALS_DAYS[1] : result.score >= PASS_SCORE ? 1 : 0;
    const maxSrsIntervalIndex = SRS_INTERVALS_DAYS.length - 1;
    await client.query(
      `INSERT INTO practice_progress
         (user_id, question_id, status, best_score, attempt_count, last_attempt_at, srs_interval_index, due_at, skipped_until)
       VALUES ($1, $2, $3, $4, 1, now(), $5, now() + $6 * interval '1 day', NULL)
       ON CONFLICT (user_id, question_id) DO UPDATE SET
         status = CASE
           WHEN EXCLUDED.status = 'mastered' THEN 'mastered'
           WHEN practice_progress.status = 'mastered' AND EXCLUDED.best_score >= ${PASS_SCORE} THEN 'mastered'
           ELSE 'learning'
         END,
         best_score = greatest(practice_progress.best_score, EXCLUDED.best_score),
         attempt_count = practice_progress.attempt_count + 1,
         last_attempt_at = now(),
         skipped_until = NULL,
         srs_interval_index = CASE
           WHEN EXCLUDED.status = 'mastered'
             THEN least(practice_progress.srs_interval_index + 1, ${maxSrsIntervalIndex})
           WHEN practice_progress.status = 'mastered' AND EXCLUDED.best_score >= ${PASS_SCORE}
             THEN least(practice_progress.srs_interval_index + 1, ${maxSrsIntervalIndex})
           WHEN EXCLUDED.best_score >= ${PASS_SCORE} THEN 1
           ELSE 0
         END,
         due_at = CASE
           WHEN EXCLUDED.status = 'mastered'
             THEN now() +
               (ARRAY[${SRS_INTERVALS_DAYS.join(', ')}])[least(practice_progress.srs_interval_index + 1, ${maxSrsIntervalIndex}) + 1]
               * interval '1 day'
           WHEN practice_progress.status = 'mastered' AND EXCLUDED.best_score >= ${PASS_SCORE}
             THEN now() +
               (ARRAY[${SRS_INTERVALS_DAYS.join(', ')}])[least(practice_progress.srs_interval_index + 1, ${maxSrsIntervalIndex}) + 1]
               * interval '1 day'
           WHEN EXCLUDED.best_score >= ${PASS_SCORE} THEN now() + interval '1 day'
           ELSE now()
         END`,
      [userId, questionId, mastered ? 'mastered' : 'learning', result.score, insertIndex, insertDueDays],
    );

    // Level promotion: mastering this word may complete the level. Lock the
    // user row BEFORE counting mastery so distinct words mastered in parallel
    // cannot both observe a pre-threshold snapshot and then commit without a
    // promotion. The waiter takes a fresh READ COMMITTED snapshot after the
    // winner commits. C2 never promotes (no next level). Only THIS attempt's
    // own mastery may attach levelUp: the client contract rejects a promotion
    // flag on an attempt that did not master a word, so when a rival
    // promotion lands while this provider call is in flight, the response
    // keeps this attempt's normal outcome shape (next/progress still come
    // from the possibly promoted current level below).
    let effectiveLevel = lockedUserLevel;
    let levelUp: { from: string; to: string } | undefined;
    // Stryker disable next-line ConditionalExpression: two suite tests pin this guard
    // (a mastery landing after a rival promotion keeps levelUp off the response and serves
    // the next question from the CURRENT level: tests/level-progression.test.ts 'never
    // attaches levelUp to a mastery that landed after the level already moved' and the
    // mirrored practice-stuck-cases scenario). The level-equality mutants fail both in the
    // ordinary suite, but per-test coverage attribution never selects them under Stryker.
    if (justMastered && lockedUserLevel === level) {
      const nextLevel = CEFR_LEVELS[CEFR_LEVELS.indexOf(level as (typeof CEFR_LEVELS)[number]) + 1];
      if (nextLevel) {
        const snapshot = await practiceProgressSnapshot(userId, level, client);
        if (snapshot.masteredCount >= Math.ceil(LEVEL_UP_MASTERY_RATIO * snapshot.totalAtLevel)) {
          await client.query('UPDATE users SET cefr_level = $1 WHERE id = $2 AND cefr_level = $3', [
            nextLevel,
            userId,
            level,
          ]);
          // The user row is held FOR UPDATE and the level equality guard above
          // was evaluated from that locked row, so this guarded UPDATE must
          // affect exactly that row.
          levelUp = { from: level, to: nextLevel };
          effectiveLevel = nextLevel;
        }
      }
    }

    let response: Record<string, unknown>;
    // A rival promotion that landed while this provider call was in flight
    // left the answered question behind at the old level, and /practice/attempt
    // rejects an off-level question with 403 (assessment-pipeline.ts). Offering
    // a retry would arm a "Try Again" that the very next request must refuse,
    // so a stale level closes the run from the current level instead — still
    // without levelUp, which this attempt did not earn.
    const staleLevel = lockedUserLevel !== level;
    const shouldRetry = !result.passed && claim.attemptNo < MAX_ATTEMPTS && !staleLevel;
    await client.query(
      `UPDATE practice_cycles
       SET attempts_used = $1,
           kind = CASE WHEN $2 THEN 'revision' ELSE kind END,
           status = CASE WHEN $2 THEN 'active' ELSE 'closed' END,
           closed_at = CASE WHEN $2 THEN NULL ELSE now() END,
           updated_at = now()
       WHERE id = $3 AND user_id = $4 AND status = 'active'`,
      [claim.attemptNo, shouldRetry, claim.cycleId, userId],
    );
    if (shouldRetry) {
      response = { ...body, attemptsLeft: MAX_ATTEMPTS - claim.attemptNo };
    } else {
      // Select after the current attempt is visible in this transaction and
      // explicitly exclude it. A pass, a final failure, or a run closed by a
      // stale level must always advance, and after a promotion — this
      // attempt's own, or a rival's that landed while the provider call was in
      // flight — both the next question and the progress snapshot come from
      // the CURRENT level.
      const next = await createPracticeCyclePayload(userId, effectiveLevel, client, questionId);
      response = result.passed
        ? { ...body, attemptsLeft: 0, levelUp, next }
        : { ...body, attemptsLeft: 0, finalFeedback, levelUp, next };
    }
    await client.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3', [
      userId,
      questionId,
      claim.claimId,
    ]);
    response = await completeAssessmentRequest(
      client,
      userId,
      requestId,
      requestClaimId,
      response,
      'practice',
      recording,
    );
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
  context: 'practice' | 'practice-native',
  recording?: RecordingCapture,
): Promise<Record<string, unknown>> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Keep the same parent-first ordering as scored and native persistence.
    // Without it, account deletion can lock users and cascade into this claim
    // while this transaction locks practice_inflight then tries to complete the
    // idempotency row — a child-table deadlock or a post-delete FK failure.
    const lockedUser = await client.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (lockedUser.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const owned = await client.query(
      `SELECT 1 FROM practice_inflight
       WHERE user_id = $1 AND question_id = $2 AND claim_id = $3
       FOR UPDATE`,
      [userId, questionId, claim.claimId],
    );
    if (owned.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const cycle = await client.query<{ attempts_used: number }>(
      `SELECT attempts_used FROM practice_cycles
       WHERE id = $1 AND user_id = $2 AND question_id = $3 AND status = 'active'
       FOR UPDATE`,
      [claim.cycleId, userId, questionId],
    );
    if (cycle.rows[0]?.attempts_used !== claim.attemptNo - 1) {
      throw new HttpError(409, 'This practice question is no longer active', 'PRACTICE_CYCLE_CLOSED');
    }
    await client.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3', [
      userId,
      questionId,
      claim.claimId,
    ]);
    response = await completeAssessmentRequest(client, userId, requestId, requestClaimId, response, context, recording);
    await client.query('COMMIT');
    return response;
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

/**
 * Persist one spoken native-language try. It participates in the same durable
 * three-attempt cycle and activity/history counters as English, while leaving
 * English mastery, best score, status and SRS schedule unchanged. The
 * language label always comes from the durable request claim's snapshot, so
 * the attempt, response, and replay can never disagree after a profile change.
 */
async function storeNativePracticeResult(
  userId: string,
  question: QuestionRow,
  claim: PracticeClaim,
  result: NativeAssessResult,
  feedback: string,
  requestId: string,
  requestClaimId: string,
  level: string,
  nativeLanguage: NativeLanguage,
  recording?: RecordingCapture,
): Promise<Record<string, unknown>> {
  // Migration 026 snapshot: same immutable-wording contract as scored practice.
  const snapshot = validatedAttemptQuestionSnapshot({
    cefrLevel: question.cefr_level,
    promptWord: question.prompt_word,
    questionText: question.question_text,
  });
  const questionId = question.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockedUser = await client.query<{ cefr_level: string | null }>(
      'SELECT cefr_level FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    const effectiveLevel = lockedUser.rows[0]?.cefr_level;
    if (!effectiveLevel) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const owned = await client.query(
      `SELECT 1 FROM practice_inflight
       WHERE user_id = $1 AND question_id = $2 AND claim_id = $3
       FOR UPDATE`,
      [userId, questionId, claim.claimId],
    );
    if (owned.rowCount !== 1) {
      throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
    }
    const cycle = await client.query<{ attempts_used: number }>(
      `SELECT attempts_used FROM practice_cycles
       WHERE id = $1 AND user_id = $2 AND question_id = $3 AND status = 'active'
       FOR UPDATE`,
      [claim.cycleId, userId, questionId],
    );
    if (cycle.rows[0]?.attempts_used !== claim.attemptNo - 1) {
      throw new HttpError(409, 'This practice question is no longer active', 'PRACTICE_CYCLE_CLOSED');
    }

    const insertedAttempt = await client.query<{ id: string }>(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback,
          practice_cycle_id, understood, translated_transcript, model_answer, native_language,
          cefr_level, prompt_word, question_text)
       VALUES ($1, $2, 'practice-native', $3, $4, NULL, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        userId,
        questionId,
        claim.attemptNo,
        result.transcript,
        feedback,
        claim.cycleId,
        result.understood,
        result.translatedTranscript,
        result.modelAnswer,
        nativeLanguage,
        snapshot.cefrLevel,
        snapshot.promptWord,
        snapshot.questionText,
      ],
    );
    if (recording) recording.attemptId = insertedAttempt.rows[0].id;

    await client.query(
      `INSERT INTO practice_progress
         (user_id, question_id, status, best_score, attempt_count, last_attempt_at,
          srs_interval_index, due_at, skipped_until)
       VALUES ($1, $2, 'learning', 0, 1, now(), 0, now(), NULL)
       ON CONFLICT (user_id, question_id) DO UPDATE SET
         attempt_count = practice_progress.attempt_count + 1,
         last_attempt_at = now(),
         skipped_until = NULL`,
      [userId, questionId],
    );

    const shouldRetry = claim.attemptNo < MAX_ATTEMPTS && effectiveLevel === level;
    await client.query(
      `UPDATE practice_cycles
       SET attempts_used = $1,
           kind = CASE WHEN $2 THEN 'revision' ELSE kind END,
           status = CASE WHEN $2 THEN 'active' ELSE 'closed' END,
           closed_at = CASE WHEN $2 THEN NULL ELSE now() END,
           updated_at = now()
       WHERE id = $3 AND user_id = $4 AND status = 'active'`,
      [claim.attemptNo, shouldRetry, claim.cycleId, userId],
    );

    const response: Record<string, unknown> = {
      mode: 'native',
      cycleId: claim.cycleId,
      nativeLanguage,
      understood: result.understood,
      transcript: result.transcript,
      translatedTranscript: result.translatedTranscript,
      modelAnswer: result.modelAnswer,
      feedback,
      attemptNo: claim.attemptNo,
      attemptsLeft: shouldRetry ? MAX_ATTEMPTS - claim.attemptNo : 0,
    };
    if (!shouldRetry) {
      response.next = await createPracticeCyclePayload(userId, effectiveLevel, client, questionId);
    }

    await client.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2 AND claim_id = $3', [
      userId,
      questionId,
      claim.claimId,
    ]);
    const completedResponse = await completeAssessmentRequest(
      client,
      userId,
      requestId,
      requestClaimId,
      response,
      'practice-native',
      recording,
    );
    await client.query('COMMIT');
    return completedResponse;
  } catch (err) {
    return await rollbackTransaction(client, { value: err });
  } finally {
    releaseTransactionClient(client);
  }
}

/**
 * Build the "a good answer could be" hint from the catalog's first English example authored
 * for the learner's native language, falling back to a generic prompt-word phrase when that
 * language has no usable examples. Deterministic and free: no provider call is involved.
 */
export function authoredAnswerHint(question: QuestionRow, language: string): string {
  const translation = question.translations[language];
  if (!translation || !Array.isArray(translation.examples)) {
    return `a few clear, on-topic sentences about "${question.prompt_word}"`;
  }
  const firstExample = translation.examples[0];
  const example = firstExample && typeof firstExample.en === 'string' ? firstExample.en.trim() : '';
  return example || `a few clear, on-topic sentences about "${question.prompt_word}"`;
}

/** The catalog's first native-language example sentence for this question, or undefined when none is authored. */
export function authoredNativeExample(question: QuestionRow, language: string): string | undefined {
  const translation = question.translations[language];
  if (!translation || !Array.isArray(translation.examples)) return undefined;
  const firstExample = translation.examples[0];
  if (!firstExample || typeof firstExample.native !== 'string') return undefined;
  return firstExample.native.trim() || undefined;
}

/**
 * Assemble the final (third-strike) failure feedback: provider verdict plus the authored
 * answer hint, with the hint budgeted against the fixed prefix/suffix so the result stays
 * within MAX_FINAL_FEEDBACK_LENGTH; the trailing slice is only a defensive backstop.
 */
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
export function buildNativeFallbackFeedback(providerFeedback: string, nativeExample?: string): string {
  if (!nativeExample) return providerFeedback.slice(0, 800);
  const lead = ' An on-topic answer could be: ';
  const suffix = ' — try saying it in English next!';
  // The provider feedback is itself only bounded by the 800-char grading
  // schema, so the fixed text is budgeted against it and not just against the
  // example: with no room left, send the feedback alone rather than a
  // hard-cut lead-in promising an example that was sliced away.
  const available = 800 - providerFeedback.length - lead.length - suffix.length;
  if (available <= 0) return providerFeedback.slice(0, 800);
  return `${providerFeedback}${lead}${nativeExample.slice(0, available)}${suffix}`;
}

/** Prompt context handed to the assess pipeline for a catalog question. */
function assessQuestionContext(question: QuestionRow) {
  return {
    cefrLevel: question.cefr_level,
    promptWord: question.prompt_word,
    questionText: question.question_text,
  };
}

/**
 * Weak If-None-Match comparison: accepts exact validators, W/-prefixed weak validators,
 * comma-separated lists, and '*'. Evaluated by hand because Express's req.fresh reports
 * false when a revalidating client also sends Cache-Control: no-cache.
 */
function matchesIfNoneMatch(header: string | undefined, etag: string): boolean {
  if (!header) return false;
  return header.split(',').some((value) => {
    const candidate = value.trim();
    if (candidate === '*') return true;
    return (candidate.startsWith('W/') ? candidate.slice(2) : candidate) === etag;
  });
}

/**
 * Build the practice router: assignment (GET /question), skip, attempt history, home stats,
 * mother-tongue help, and the two paid assessment submissions — all behind requireAuth and
 * no-store, with the diagnostic-completed gate layered onto the submission chain.
 */
export function createPracticeRouter(limiters: Limiters) {
  const router = Router();
  const helpParamsSchema = z.object({
    id: z.string().uuid('question id must be a valid UUID'),
  });
  const skipBodySchema = z.object({
    questionId: z.string().uuid('questionId must be a valid UUID'),
    cycleId: z.string().uuid('cycleId must be a valid UUID'),
  });
  const historyQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().uuid('cursor must be a valid UUID').optional(),
  });
  const statsQuerySchema = z.object({
    timeZone: z.string().trim().min(1).max(128).default('UTC'),
  });
  /** Practice responses are learner-specific and must never be cached. */
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  /** Submission-chain eligibility gate: paid practice requires a completed placement with a level. */
  const requireCompletedDiagnostic = (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user!.diagnostic_completed || !req.user!.cefr_level) {
      return next(new HttpError(403, 'Diagnostic not completed'));
    }
    return next();
  };

  // Shared submission choreography (S3-conditional cleanup + eligibility +
  // paid limiters + dual-mode validation); see assessment-pipeline.ts.
  const submission = buildAssessmentSubmissionChain(limiters, 'practice', [requireCompletedDiagnostic]);

  /**
   * Serve the learner's current assignment: resumes the durable active cycle after a remount
   * or atomically assigns a new one, under the user-row FOR UPDATE lock (not the default
   * SHARE) because assignment writes — so concurrent GETs can never mint two active cycles.
   */
  router.get(
    '/question',
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const body = await withCurrentPracticeUser(
        user.id,
        async (client, currentUser) => {
          if (!currentUser.diagnostic_completed || !currentUser.cefr_level) {
            throw new HttpError(403, 'Diagnostic not completed');
          }
          const payload = await getOrCreatePracticeCyclePayload(user.id, currentUser.cefr_level, client);
          if (!payload) throw new HttpError(500, 'No questions available for this level');
          return payload;
        },
        'UPDATE',
      );
      res.json(body);
    }),
  );

  // "Skip this word for now": parks the word out of new/revision selection
  // without inventing an attempt. The upsert never touches an existing row's
  // learning state — a repeat skip only refreshes skipped_until. Retention
  // selection deliberately ignores skips.
  router.post(
    '/skip',
    validate({ body: skipBodySchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { questionId, cycleId } = validated(req, skipBodySchema);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serialize skip against result persistence and account deletion. This
        // makes a score that races an earlier skip reliably clear that park,
        // while a skip that wins after scoring deliberately parks the word.
        const lockedUser = await client.query<{ cefr_level: string | null; diagnostic_completed: boolean }>(
          'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1 FOR UPDATE',
          [user.id],
        );
        const currentUser = lockedUser.rows[0];
        if (!currentUser) {
          throw new HttpError(409, 'Assessment state changed; please try again', 'STATE_CHANGED');
        }
        if (!currentUser.diagnostic_completed || !currentUser.cefr_level) {
          throw new HttpError(403, 'Diagnostic not completed');
        }
        const { rows } = await client.query<{ cefr_level: string }>('SELECT cefr_level FROM questions WHERE id = $1', [
          questionId,
        ]);
        const q = rows[0];
        if (!q) throw new HttpError(404, 'Question not found');
        if (q.cefr_level !== currentUser.cefr_level) {
          throw new HttpError(403, 'Question is not available at your level');
        }
        const currentCycle = await client.query(
          `SELECT 1 FROM practice_cycles
           WHERE id = $1 AND user_id = $2 AND question_id = $3 AND status = 'active'
           FOR UPDATE`,
          [cycleId, user.id, questionId],
        );
        if (currentCycle.rowCount !== 1) {
          throw new HttpError(409, 'This practice question is no longer active', 'PRACTICE_CYCLE_CLOSED');
        }
        // Assessment claims are five-minute leases. A crashed provider worker
        // must not block Skip forever merely because no later assessment came
        // along to reclaim its stale row.
        await client.query(
          `DELETE FROM practice_inflight
           WHERE user_id = $1 AND question_id = $2
             AND started_at < now() - interval '5 minutes'`,
          [user.id, questionId],
        );
        const inFlight = await client.query('SELECT 1 FROM practice_inflight WHERE user_id = $1 AND question_id = $2', [
          user.id,
          questionId,
        ]);
        if (inFlight.rowCount !== 0) {
          throw new HttpError(409, 'An assessment is already in progress for this question', 'ASSESSMENT_IN_PROGRESS');
        }
        await client.query(
          `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, skipped_until)
           VALUES ($1, $2, 'learning', 0, 0, now() + interval '${SKIP_DAYS} days')
           ON CONFLICT (user_id, question_id) DO UPDATE SET
             skipped_until = now() + interval '${SKIP_DAYS} days'`,
          [user.id, questionId],
        );
        await client.query(
          `UPDATE practice_cycles
           SET status = 'closed', closed_at = now(), updated_at = now()
           WHERE id = $1 AND user_id = $2 AND status = 'active'`,
          [cycleId, user.id],
        );
        await client.query('COMMIT');
      } catch (err) {
        return await rollbackTransaction(client, { value: err });
      } finally {
        releaseTransactionClient(client);
      }
      res.status(204).end();
    }),
  );

  // Attempt history for the History screen. Deliberately no diagnostic gate:
  // diagnostic attempts are part of the history (`context` tells them apart).
  router.get(
    '/history',
    validate({ query: historyQuerySchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { limit, cursor } = validated(req, historyQuerySchema);
      if (cursor) {
        const cursorRow = await pool.query('SELECT 1 FROM attempts WHERE id = $1 AND user_id = $2', [cursor, user.id]);
        if (!cursorRow.rows[0]) throw new HttpError(400, 'Invalid history cursor');
      }

      // Newest first with a (created_at, id) keyset cursor, mirroring the
      // ascending export pagination in auth.ts. Question wording comes from
      // the attempt's own migration-026 snapshot, never a live catalog join,
      // so editing catalog wording cannot rewrite history.
      const { rows } = await pool.query(
        `SELECT a.id, a.question_id AS "questionId", a.prompt_word AS "promptWord",
                a.question_text AS "questionText", a.cefr_level AS "cefrLevel", a.context,
                a.attempt_no AS "attemptNo", a.score, a.passed, a.transcript, a.feedback,
                a.practice_cycle_id AS "cycleId", a.understood,
                a.translated_transcript AS "translatedTranscript", a.model_answer AS "modelAnswer",
                a.native_language AS "nativeLanguage",
                a.created_at AS "createdAt", r.id AS "recordingId", r.status AS "recordingStatus"
         FROM attempts a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN recordings r
           ON r.attempt_id = a.id
          AND r.user_id = a.user_id
          AND r.recording_retention_epoch = u.recording_retention_epoch
         WHERE a.user_id = $1
           AND (
             $2::uuid IS NULL
             OR (a.created_at, a.id) < (
               SELECT created_at, id FROM attempts WHERE id = $2 AND user_id = $1
             )
           )
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT $3`,
        [user.id, cursor ?? null, limit + 1],
      );
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      res.json({ items, nextCursor: hasMore ? (items[items.length - 1] as { id: string }).id : null });
    }),
  );

  // Home-screen stats. No diagnostic gate either: before placement the level
  // is null and the progress counters are simply zero.
  router.get(
    '/stats',
    validate({ query: statsQuerySchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const { timeZone } = validated(req, statsQuerySchema);
      const body = await withCurrentPracticeUser(user.id, async (client, currentUser) => {
        const knownTimeZone = await client.query('SELECT 1 FROM pg_timezone_names WHERE name = $1 LIMIT 1', [timeZone]);
        // The zone only picks learner-local day buckets; it is not a security
        // input. A syntactically valid name the server's tzdata does not know
        // (stale catalog, exotic alias) must not 400 the whole Home screen:
        // warn with the rejected name and bucket in UTC instead. The response
        // echoes the zone actually used, so known zones are unchanged.
        let zone = timeZone;
        if (!knownTimeZone.rows[0]) {
          logger.warn({ userId: user.id, timeZone }, 'unknown time zone for practice stats; using UTC day buckets');
          zone = 'UTC';
        }
        const level = currentUser.cefr_level;
        const progress = level
          ? await practiceProgressSnapshot(user.id, level, client)
          : { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 };
        // Streak = consecutive learner-local calendar days with at least one practice
        // attempt, anchored on the most recent practiced day and counted only
        // when that anchor is today or yesterday (one quiet day is allowed
        // before the streak dies). Gaps-and-islands over the distinct day list:
        // the run starting at the latest day is exactly the rows where
        // day = latest - (rank - 1).
        const { rows } = await client.query<{
          streakDays: number;
          practicedToday: number;
          totalAttempts: number;
          lastPracticedAt: string | null;
        }>(
          `WITH practice_days AS (
             SELECT DISTINCT (created_at AT TIME ZONE $2)::date AS day
             FROM attempts
             WHERE user_id = $1 AND context IN ('practice', 'practice-native')
           ),
           ranked AS (
             SELECT day,
                    max(day) OVER () AS latest,
                    row_number() OVER (ORDER BY day DESC) AS rn
             FROM practice_days
           )
           SELECT
             (SELECT count(*)::int FROM ranked
              WHERE latest >= (now() AT TIME ZONE $2)::date - 1
                AND day = latest - (rn - 1)::int) AS "streakDays",
             (SELECT count(*)::int FROM attempts
              WHERE user_id = $1 AND context IN ('practice', 'practice-native')
                AND (created_at AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date) AS "practicedToday",
             (SELECT count(*)::int FROM attempts
              WHERE user_id = $1 AND context IN ('practice', 'practice-native')) AS "totalAttempts",
             (SELECT max(created_at) FROM attempts
              WHERE user_id = $1 AND context IN ('practice', 'practice-native')) AS "lastPracticedAt"`,
          [user.id, zone],
        );
        const stats = rows[0];
        return {
          level,
          progress,
          streakDays: stats.streakDays,
          practicedToday: stats.practicedToday,
          totalAttempts: stats.totalAttempts,
          lastPracticedAt: stats.lastPracticedAt,
          timeZone: zone,
        };
      });
      res.json(body);
    }),
  );

  /**
   * Mother-tongue help for one question at the learner's current level. The language comes
   * from the profile rather than the URL, so the payload is ETag-revalidated per
   * authorization instead of being stored by any cache.
   */
  router.get(
    '/question/:id/help',
    validate({ params: helpParamsSchema }),
    h(async (req: AuthedRequest, res) => {
      const user = req.user!;
      const payload = await withCurrentPracticeUser(user.id, async (client, currentUser) => {
        if (!currentUser.diagnostic_completed || !currentUser.cefr_level) {
          throw new HttpError(403, 'Diagnostic not completed');
        }
        const { rows } = await client.query<QuestionRow>(
          `SELECT ${QUESTION_ROW_COLUMNS} FROM questions WHERE id = $1`,
          [req.params.id],
        );
        const q = rows[0];
        if (!q) throw new HttpError(404, 'Question not found');
        if (q.cefr_level !== currentUser.cefr_level) {
          throw new HttpError(403, 'Question is not available at your level');
        }
        const t = q.translations[currentUser.native_language];
        if (!t) throw new HttpError(404, 'Translation not available for this question');
        return {
          promptWord: q.prompt_word,
          promptWordNative: t.word,
          questionText: q.question_text,
          questionTextNative: t.question,
          examples: t.examples,
        };
      });
      // Content is static per (question, language), but the language comes
      // from the caller's profile while the URL does not: a stored response
      // must never be reused after a language switch or an account swap on
      // the same device. Keep the cheap 304 (the ETag hashes the
      // language-specific payload) but force revalidation, and declare the
      // Authorization dependency for any shared cache in between.
      const etag = `"${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}"`;
      res.set('Cache-Control', 'private, no-cache');
      res.vary('Authorization');
      res.set('ETag', etag);
      // Fetch clients commonly add `Cache-Control: no-cache` while
      // revalidating an explicit If-None-Match. Express then deliberately
      // reports req.fresh=false, so evaluate the validator directly. GET uses
      // weak comparison: exact, W/, comma-list, and wildcard validators all
      // match the current representation.
      if (matchesIfNoneMatch(req.headers['if-none-match'], etag)) {
        return res.status(304).end();
      }
      res.json(payload);
    }),
  );

  /**
   * Scored English attempt through the shared paid pipeline: the options below supply the
   * practice-specific claim/assess/persist hooks, silence stays a free retry, and a failed
   * third try closes the cycle with final feedback plus the next assignment.
   */
  router.post(
    '/attempt',
    ...submission.middleware,
    h(async (req: AuthedRequest, res) =>
      runAssessmentSubmission<PracticeClaim, AssessResult>(req, res, {
        storageScope: submission.storageScope,
        context: 'practice',
        bodySchema: submission.bodySchema,
        respendAssessmentBudget: submission.respendAssessmentBudget,
        questionMissingError: () => new HttpError(404, 'Question not found'),
        requireQuestionAtUserLevel: true,
        claimAttempt: (user, question) =>
          claimPracticeAttempt(user.id, question.id, question.cefr_level, (req.body as { cycleId: string }).cycleId),
        assess: (audioPath, user, question, _claim, options) =>
          assessSpeaking(audioPath, assessQuestionContext(question), user.id, options),
        persist: (user, question, claim, result, requestId, requestClaimId, recording) => {
          if (result.transcript === '') {
            // Silence: not an attempt. Nothing is persisted about the word and
            // the attempt counter does not advance; the retry is free.
            return storeSilenceResult(
              user.id,
              question.id,
              claim,
              requestId,
              requestClaimId,
              {
                passed: false,
                noSpeech: true,
                mastered: false,
                attemptNo: claim.attemptNo,
                score: 0,
                transcript: '',
                feedback: result.feedback,
                cycleId: claim.cycleId,
                attemptsLeft: MAX_ATTEMPTS - (claim.attemptNo - 1),
              },
              'practice',
              recording,
            );
          }
          const mastered = result.score >= MASTER_SCORE;
          const body: Record<string, unknown> = {
            passed: result.passed,
            mastered,
            attemptNo: claim.attemptNo,
            score: result.score,
            transcript: result.transcript,
            feedback: result.feedback,
            // Additive word-level transcript tags (absent on older deployments).
            ...(result.wordScores === undefined ? {} : { wordScores: result.wordScores }),
            cycleId: claim.cycleId,
          };

          // Precompute the final-failure response without another provider
          // call. Retry/pass branches never expose it; storePracticeResult's
          // final-failure branch is the sole consumer.
          const hint = authoredAnswerHint(question, user.native_language);
          const finalFeedback = buildFinalFeedback(result.feedback, hint);
          return storePracticeResult(
            user.id,
            question,
            claim,
            result,
            mastered,
            requestId,
            requestClaimId,
            body,
            user.cefr_level!,
            finalFeedback,
            recording,
          );
        },
        clearClaim: (user, question, claim) => clearPracticeClaim(user.id, question.id, claim.claimId),
      }),
    ),
  );

  // Native-language mode ("answer in my language"): the learner answers in
  // their mother tongue; we check comprehension and return a model English
  // answer. It consumes the same durable three-try budget and is retained in
  // history/progress, but never changes English mastery or SRS state.
  router.post(
    '/attempt/native',
    ...submission.middleware,
    h(async (req: AuthedRequest, res) => {
      // The durable request claim owns this submission's native language
      // (migration 022's snapshot, committed under users FOR UPDATE). Today
      // the claim INSERT passes the requireAuth copy, so the two agree on
      // every fresh claim this pipeline writes — but the claim row is the
      // authoritative surface (migration 022's completion trigger rewrites
      // response and attempt to its value, and a draining older writer can
      // still insert a claim without the copy). Resolve the language from
      // the claim snapshot so the provider call, the response, and the
      // attempt can never disagree with what the claim durably records.
      const claimNativeLanguage: { value?: NativeLanguage } = {};
      /** Claim snapshot first; the requireAuth copy only covers a legacy row with no snapshot. */
      const nativeLanguageFor = (user: AuthedRequest['user']): NativeLanguage =>
        claimNativeLanguage.value ?? (user!.native_language as NativeLanguage);
      return runAssessmentSubmission<PracticeClaim, NativeAssessResult>(req, res, {
        storageScope: submission.storageScope,
        context: 'practice-native',
        bodySchema: submission.bodySchema,
        respendAssessmentBudget: submission.respendAssessmentBudget,
        questionMissingError: () => new HttpError(404, 'Question not found'),
        requireQuestionAtUserLevel: true,
        onFreshRequestClaim: (requestClaim) => {
          if (requestClaim.nativeLanguage) claimNativeLanguage.value = requestClaim.nativeLanguage;
        },
        // Same per-question serialization as English practice: without a
        // claim, concurrent native submissions with distinct requestIds each
        // trigger their own paid provider calls for one question.
        claimAttempt: (user, question) =>
          claimPracticeAttempt(user.id, question.id, question.cefr_level, (req.body as { cycleId: string }).cycleId),
        assess: (audioPath, user, question, _claim, options) =>
          assessNativeComprehension(
            audioPath,
            assessQuestionContext(question),
            nativeLanguageFor(user),
            user.id,
            options,
          ),
        persist: (user, question, claim, result, requestId, requestClaimId, recording) => {
          const nativeLanguage = nativeLanguageFor(user);
          const feedback =
            result.understood || result.transcript === ''
              ? result.feedback
              : buildNativeFallbackFeedback(result.feedback, authoredNativeExample(question, nativeLanguage));
          if (result.transcript === '') {
            return storeSilenceResult(
              user.id,
              question.id,
              claim,
              requestId,
              requestClaimId,
              {
                mode: 'native',
                cycleId: claim.cycleId,
                nativeLanguage,
                understood: false,
                transcript: '',
                translatedTranscript: '',
                modelAnswer: '',
                feedback,
                noSpeech: true,
                attemptNo: claim.attemptNo,
                attemptsLeft: MAX_ATTEMPTS - (claim.attemptNo - 1),
              },
              'practice-native',
              recording,
            );
          }
          return storeNativePracticeResult(
            user.id,
            question,
            claim,
            result,
            feedback,
            requestId,
            requestClaimId,
            user.cefr_level!,
            nativeLanguage,
            recording,
          );
        },
        clearClaim: (user, question, claim) => clearPracticeClaim(user.id, question.id, claim.claimId),
      });
    }),
  );

  return router;
}
