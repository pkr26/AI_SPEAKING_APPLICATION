import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// MOCK_AI scores are 40 + floor(Math.random() * 56), so these pins are exact.
const SCORE_75 = 0.625; // 40 + 35 = 75 — the mastery threshold
const SCORE_74 = 0.616; // 40 + 34 = 74 — passed but not mastered
const SCORE_HIGH = 0.9999; // 95
const SCORE_LOW = 0; // 40

describe('practice mastery and interleave (deterministic mock scores)', () => {
  const a = app();

  async function freshUser() {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    return { token, userId, level };
  }

  async function progressRow(userId: string, questionId: string) {
    const { rows } = await pool.query<{
      status: string;
      best_score: number;
      attempt_count: number;
    }>('SELECT status, best_score, attempt_count FROM practice_progress WHERE user_id = $1 AND question_id = $2', [
      userId,
      questionId,
    ]);
    return rows[0];
  }

  it('masters a word at exactly 75', async () => {
    const { token, userId } = await freshUser();
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(q.body.kind).toBe('new');
    const questionId = q.body.question.id as string;

    vi.spyOn(Math, 'random').mockReturnValue(SCORE_75);
    const r = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
    );

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ passed: true, mastered: true, score: 75, attemptNo: 1 });
    expect(r.body.next.kind).toBeDefined();
    expect(r.body.next.question.id).not.toBe(questionId);
    expect(await progressRow(userId, questionId)).toEqual({
      status: 'mastered',
      best_score: 75,
      attempt_count: 1,
    });
  });

  it('passes but does not master a word at 74', async () => {
    const { token, userId } = await freshUser();
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = q.body.question.id as string;

    vi.spyOn(Math, 'random').mockReturnValue(SCORE_74);
    const r = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
    );

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ passed: true, mastered: false, score: 74 });
    expect(await progressRow(userId, questionId)).toEqual({
      status: 'learning',
      best_score: 74,
      attempt_count: 1,
    });
  });

  it('keeps a mastered word mastered on a 60-74 retention pass but demotes it on a failed attempt', async () => {
    const { token, userId } = await freshUser();
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = q.body.question.id as string;
    const attempt = () =>
      answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId);

    const random = vi.spyOn(Math, 'random');
    random.mockReturnValue(SCORE_HIGH);
    expect((await attempt()).body).toMatchObject({ mastered: true, score: 95 });

    // A mediocre retention pass (60-74) never downgrades mastery.
    random.mockReturnValue(SCORE_74);
    const retained = await attempt();
    expect(retained.body).toMatchObject({ passed: true, mastered: false, score: 74, attemptNo: 1 });
    expect(await progressRow(userId, questionId)).toEqual({
      status: 'mastered',
      best_score: 95,
      attempt_count: 2,
    });

    // A failed retention attempt (<60) is the one downgrade path: back to
    // learning while the historical best score is kept.
    random.mockReturnValue(SCORE_LOW);
    const failed = await attempt();
    expect(failed.body).toMatchObject({ passed: false, mastered: false, score: 40, attemptNo: 1 });
    expect(await progressRow(userId, questionId)).toEqual({
      status: 'learning',
      best_score: 95,
      attempt_count: 3,
    });
  });

  it('opens on revision after a failure, then alternates to a new word', async () => {
    const { token } = await freshUser();
    const first = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(first.body.kind).toBe('new');
    expect(first.body.progress).toMatchObject({ masteredCount: 0, learningCount: 0 });
    const questionId = first.body.question.id as string;

    vi.spyOn(Math, 'random').mockReturnValue(SCORE_LOW);
    const attempt = () =>
      answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId);
    expect((await attempt()).body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });

    // The failed word is learning, so the next pick is that word as revision.
    const revision = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(revision.body.kind).toBe('revision');
    expect(revision.body.question.id).toBe(questionId);
    expect(revision.body.progress).toMatchObject({ masteredCount: 0, learningCount: 1 });

    // Revising (a word with earlier attempts) flips the interleave back to new.
    expect((await attempt()).body).toMatchObject({ passed: false, attemptNo: 2, attemptsLeft: 1 });
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.body.kind).toBe('new');
    expect(next.body.question.id).not.toBe(questionId);
  });

  it('serves the most overdue mastered word as retention revision when the level is exhausted', async () => {
    const { token, userId, level } = await freshUser();
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, due_at)
       SELECT $1, id, 'mastered', 90, 1,
              now() - (row_number() OVER (ORDER BY id) || ' days')::interval
       FROM questions WHERE cefr_level = $2`,
      [userId, level],
    );
    const expected = await pool.query<{ question_id: string }>(
      `SELECT question_id FROM practice_progress
       WHERE user_id = $1 ORDER BY due_at ASC LIMIT 1`,
      [userId],
    );

    const r = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    expect(r.status).toBe(200);
    expect(r.body.kind).toBe('revision');
    expect(r.body.question.id).toBe(expected.rows[0].question_id);
    expect(r.body.progress.masteredCount).toBe(r.body.progress.totalAtLevel);
    expect(r.body.progress.learningCount).toBe(0);
  });

  it('reports mastered, learning, and due counts in the progress snapshot', async () => {
    const { token, userId, level } = await freshUser();
    const questions = await pool.query<{ id: string }>(
      'SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id LIMIT 3',
      [level],
    );
    const [m1, m2, learning] = questions.rows;
    // One mastered word is due now (default due_at), the other only tomorrow.
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count)
       VALUES ($1, $2, 'mastered', 90, 1)`,
      [userId, m1.id],
    );
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, due_at)
       VALUES ($1, $2, 'mastered', 90, 1, now() + interval '1 day')`,
      [userId, m2.id],
    );
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count)
       VALUES ($1, $2, 'learning', 55, 2)`,
      [userId, learning.id],
    );
    const total = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM questions WHERE cefr_level = $1', [
      level,
    ]);

    const r = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    expect(r.status).toBe(200);
    expect(r.body.progress).toEqual({
      masteredCount: 2,
      learningCount: 1,
      totalAtLevel: total.rows[0].n,
      dueCount: 2,
    });
    // A learning word exists and there is no attempt history: revision opens.
    expect(r.body.kind).toBe('revision');
    expect(r.body.question.id).toBe(learning.id);
  });

  it('backfills practice_progress from attempts history exactly as the migration does', async () => {
    const { res } = await registerUser(a);
    const userId = res.body.user.id as string;
    const questions = await pool.query<{ id: string }>('SELECT id FROM questions ORDER BY id LIMIT 3');
    const [masteredQ, learningQ, diagnosticQ] = questions.rows;
    await pool.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'practice', 1, 'strong answer', 80, true, 'Great')`,
      [userId, masteredQ.id],
    );
    for (const [attemptNo, score] of [
      [1, 50],
      [2, 55],
    ] as const) {
      await pool.query(
        `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
         VALUES ($1, $2, 'practice', $3, 'weak answer', $4, false, 'Keep going')`,
        [userId, learningQ.id, attemptNo, score],
      );
    }
    await pool.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'diagnostic', 1, 'diagnostic answer', 90, true, 'Great')`,
      [userId, diagnosticQ.id],
    );

    // Re-run the migration's backfill statement verbatim against an empty table,
    // exactly the state migration 008 sees on an existing deployment.
    await pool.query('DELETE FROM practice_progress');
    const migration = await fs.readFile(path.join(__dirname, '../db/migrations/008_practice_progress.sql'), 'utf8');
    const backfill = migration.slice(migration.indexOf('INSERT INTO practice_progress'));
    await pool.query(backfill);

    const { rows } = await pool.query<{
      question_id: string;
      status: string;
      best_score: number;
      attempt_count: number;
    }>('SELECT question_id, status, best_score, attempt_count FROM practice_progress WHERE user_id = $1', [userId]);
    const byQuestion = new Map(rows.map((row) => [row.question_id, row]));
    expect(byQuestion.get(masteredQ.id)).toMatchObject({
      status: 'mastered',
      best_score: 80,
      attempt_count: 1,
    });
    expect(byQuestion.get(learningQ.id)).toMatchObject({
      status: 'learning',
      best_score: 55,
      attempt_count: 2,
    });
    expect(byQuestion.has(diagnosticQ.id)).toBe(false);
  });
});
