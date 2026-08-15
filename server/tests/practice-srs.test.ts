import { randomUUID } from 'crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const speakMock = vi.hoisted(() => vi.fn());
const nativeMock = vi.hoisted(() => vi.fn());

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: speakMock, assessNativeComprehension: nativeMock };
});

import { answerForm, app, pool, registerUser } from './helpers';

beforeEach(() => {
  speakMock.mockReset();
  nativeMock.mockReset();
});

afterAll(async () => {
  await pool.end();
});

function mockScore(score: number) {
  speakMock.mockResolvedValue({
    transcript: 'a scored answer',
    score,
    passed: score >= 60,
    feedback: `scored ${score}`,
  });
}

describe('practice SRS scheduling and skip', () => {
  const a = app();

  /** Fresh learner placed at `level` directly (no diagnostic budget spent). */
  async function freshUserAt(level = 'A1') {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query('UPDATE users SET diagnostic_completed = true, cefr_level = $2 WHERE id = $1', [userId, level]);
    return { token, userId, level };
  }

  async function questionsAt(level: string, limit: number): Promise<string[]> {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id LIMIT $2',
      [level, limit],
    );
    return rows.map(({ id }) => id);
  }

  /** SRS-relevant columns with day-granular due offsets for exact pinning. */
  async function srsRow(userId: string, questionId: string) {
    const { rows } = await pool.query<{
      status: string;
      srs_interval_index: number;
      due_in_days: number;
      is_due: boolean;
      attempt_count: number;
      best_score: number;
      skipped_days: number | null;
    }>(
      `SELECT status, srs_interval_index,
              round(extract(epoch FROM (due_at - now())) / 86400)::int AS due_in_days,
              due_at <= now() AS is_due,
              attempt_count, best_score,
              round(extract(epoch FROM (skipped_until - now())) / 86400)::int AS skipped_days
       FROM practice_progress WHERE user_id = $1 AND question_id = $2`,
      [userId, questionId],
    );
    return rows[0];
  }

  const attempt = (token: string, questionId: string) =>
    answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId);

  it('schedules a first attempt per score bucket: fail due now, pass +1d, mastery +3d', async () => {
    const { token, userId, level } = await freshUserAt();
    const [failQ, passQ, masterQ] = await questionsAt(level, 3);

    mockScore(40);
    expect((await attempt(token, failQ)).status).toBe(200);
    expect(await srsRow(userId, failQ)).toMatchObject({
      status: 'learning',
      srs_interval_index: 0,
      due_in_days: 0,
      is_due: true,
    });

    mockScore(60);
    expect((await attempt(token, passQ)).status).toBe(200);
    expect(await srsRow(userId, passQ)).toMatchObject({
      status: 'learning',
      srs_interval_index: 1,
      due_in_days: 1,
      is_due: false,
    });

    mockScore(75);
    expect((await attempt(token, masterQ)).status).toBe(200);
    expect(await srsRow(userId, masterQ)).toMatchObject({
      status: 'mastered',
      srs_interval_index: 1,
      due_in_days: 3,
      is_due: false,
    });
  });

  it('walks the retention ladder 3d -> 7d -> 21d -> 60d and clamps at the last interval', async () => {
    const { token, userId, level } = await freshUserAt();
    const [questionId] = await questionsAt(level, 1);
    mockScore(90);

    const expected = [
      { srs_interval_index: 1, due_in_days: 3 },
      { srs_interval_index: 2, due_in_days: 7 },
      { srs_interval_index: 3, due_in_days: 21 },
      { srs_interval_index: 4, due_in_days: 60 },
      { srs_interval_index: 4, due_in_days: 60 }, // clamped
    ];
    for (const step of expected) {
      expect((await attempt(token, questionId)).status).toBe(200);
      expect(await srsRow(userId, questionId)).toMatchObject({ status: 'mastered', ...step });
    }
  });

  it('shortens the review to 1 day on a 60-74 retention pass without losing mastery', async () => {
    const { token, userId, level } = await freshUserAt();
    const [questionId] = await questionsAt(level, 1);

    mockScore(90);
    await attempt(token, questionId);
    mockScore(90);
    await attempt(token, questionId); // index 2 (7d)

    mockScore(65);
    expect((await attempt(token, questionId)).status).toBe(200);
    expect(await srsRow(userId, questionId)).toMatchObject({
      status: 'mastered',
      srs_interval_index: 1,
      due_in_days: 1,
      is_due: false,
      best_score: 90,
    });
  });

  it('demotes a mastered word to learning/index 0/due now only on a failed scored attempt', async () => {
    const { token, userId, level } = await freshUserAt();
    const [questionId] = await questionsAt(level, 1);

    mockScore(90);
    await attempt(token, questionId);

    mockScore(59);
    const failed = await attempt(token, questionId);
    expect(failed.status).toBe(200);
    expect(failed.body).toMatchObject({ passed: false, mastered: false, score: 59 });
    expect(await srsRow(userId, questionId)).toMatchObject({
      status: 'learning',
      srs_interval_index: 0,
      due_in_days: 0,
      is_due: true,
      best_score: 90,
    });

    // Re-mastering restarts the ladder from index 1.
    mockScore(80);
    await attempt(token, questionId);
    expect(await srsRow(userId, questionId)).toMatchObject({
      status: 'mastered',
      srs_interval_index: 1,
      due_in_days: 3,
    });
  });

  it('serves the most overdue learning word first and falls back to the earliest future due date', async () => {
    const { token, userId, level } = await freshUserAt();
    const [qa, qb] = await questionsAt(level, 2);
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, due_at)
       VALUES ($1, $2, 'learning', 40, 1, now() - interval '2 days'),
              ($1, $3, 'learning', 40, 1, now() - interval '1 day')`,
      [userId, qa, qb],
    );

    const mostOverdue = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(mostOverdue.body.kind).toBe('revision');
    expect(mostOverdue.body.question.id).toBe(qa);

    await pool.query(
      `UPDATE practice_progress SET due_at = now() + interval '2 days' WHERE user_id = $1 AND question_id = $2`,
      [userId, qa],
    );
    const remainingDue = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(remainingDue.body.question.id).toBe(qb);

    // Nothing due: the interleave still opens on revision, picking the word
    // closest to its review date.
    await pool.query(
      `UPDATE practice_progress SET due_at = now() + interval '1 day' WHERE user_id = $1 AND question_id = $2`,
      [userId, qb],
    );
    const fallback = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(fallback.body.kind).toBe('revision');
    expect(fallback.body.question.id).toBe(qb);
  });

  it('counts due, unskipped words in the progress dueCount', async () => {
    const { token, userId, level } = await freshUserAt();
    const [dueLearning, futureLearning, dueMastered, skippedDue] = await questionsAt(level, 4);
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, due_at, skipped_until)
       VALUES ($1, $2, 'learning', 40, 1, now() - interval '1 hour', NULL),
              ($1, $3, 'learning', 40, 1, now() + interval '1 day', NULL),
              ($1, $4, 'mastered', 90, 1, now() - interval '1 hour', NULL),
              ($1, $5, 'learning', 0, 0, now() - interval '1 hour', now() + interval '7 days')`,
      [userId, dueLearning, futureLearning, dueMastered, skippedDue],
    );

    const r = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.progress).toMatchObject({ masteredCount: 1, learningCount: 3, dueCount: 2 });
  });

  describe('POST /practice/skip', () => {
    it('parks a new word for 7 days with a zero-attempt learning row, and the next pick differs', async () => {
      const { token, userId } = await freshUserAt();
      const first = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      const questionId = first.body.question.id as string;

      const r = await request(a).post('/practice/skip').set('Authorization', `Bearer ${token}`).send({ questionId });
      expect(r.status).toBe(204);
      expect(r.headers['cache-control']).toContain('no-store');
      expect(await srsRow(userId, questionId)).toMatchObject({
        status: 'learning',
        best_score: 0,
        attempt_count: 0,
        skipped_days: 7,
      });

      const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      expect(next.status).toBe(200);
      expect(next.body.question.id).not.toBe(questionId);
    });

    it('only refreshes skipped_until on an existing row, never its learning state', async () => {
      const { token, userId, level } = await freshUserAt();
      const [questionId] = await questionsAt(level, 1);
      mockScore(90);
      await attempt(token, questionId);

      const r = await request(a).post('/practice/skip').set('Authorization', `Bearer ${token}`).send({ questionId });
      expect(r.status).toBe(204);
      expect(await srsRow(userId, questionId)).toMatchObject({
        status: 'mastered',
        best_score: 90,
        attempt_count: 1,
        srs_interval_index: 1,
        skipped_days: 7,
      });
    });

    it('makes the word eligible again (as revision) once skipped_until passes', async () => {
      const { token, userId } = await freshUserAt();
      const first = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      const questionId = first.body.question.id as string;
      await request(a).post('/practice/skip').set('Authorization', `Bearer ${token}`).send({ questionId });

      // Still inside the skip window: never served.
      const during = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      expect(during.body.question.id).not.toBe(questionId);

      await pool.query(
        `UPDATE practice_progress SET skipped_until = now() - interval '1 second'
         WHERE user_id = $1 AND question_id = $2`,
        [userId, questionId],
      );
      // The skip row is 'learning' and due, so it returns as the only revision.
      const after = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      expect(after.body.kind).toBe('revision');
      expect(after.body.question.id).toBe(questionId);
    });

    it('leaves retention selection unaffected by skips', async () => {
      const { token, userId, level } = await freshUserAt();
      await pool.query(
        `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, due_at)
         SELECT $1, id, 'mastered', 90, 1,
                now() - (row_number() OVER (ORDER BY id) || ' days')::interval
         FROM questions WHERE cefr_level = $2`,
        [userId, level],
      );
      const { rows } = await pool.query<{ question_id: string }>(
        'SELECT question_id FROM practice_progress WHERE user_id = $1 ORDER BY due_at ASC LIMIT 1',
        [userId],
      );
      const mostOverdue = rows[0].question_id;
      await request(a).post('/practice/skip').set('Authorization', `Bearer ${token}`).send({ questionId: mostOverdue });

      const r = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
      expect(r.status).toBe(200);
      expect(r.body.kind).toBe('revision');
      expect(r.body.question.id).toBe(mostOverdue);
    });

    it('enforces the level, existence, UUID, and diagnostic contracts', async () => {
      const { token, level } = await freshUserAt();
      const other = await pool.query<{ id: string }>(
        'SELECT id FROM questions WHERE cefr_level != $1 ORDER BY id LIMIT 1',
        [level],
      );

      const foreign = await request(a)
        .post('/practice/skip')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: other.rows[0].id });
      expect(foreign.status).toBe(403);
      expect(foreign.body).toEqual({ error: 'Question is not available at your level', code: 'FORBIDDEN' });

      const missing = await request(a)
        .post('/practice/skip')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: '00000000-0000-0000-0000-000000000000' });
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({ error: 'Question not found', code: 'NOT_FOUND' });

      const malformed = await request(a)
        .post('/practice/skip')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: 'not-a-uuid' });
      expect(malformed.status).toBe(400);
      expect(malformed.body).toEqual({
        error: 'questionId: questionId must be a valid UUID',
        code: 'VALIDATION_FAILED',
      });

      const { res } = await registerUser(a);
      const undiagnosed = await request(a)
        .post('/practice/skip')
        .set('Authorization', `Bearer ${res.body.token}`)
        .send({ questionId: randomUUID() });
      expect(undiagnosed.status).toBe(403);
      expect(undiagnosed.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });
    });
  });
});
