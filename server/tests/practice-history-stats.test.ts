import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

let a: ReturnType<typeof app>;

beforeEach(() => {
  a = app();
});

/** Fresh learner placed at A1 directly (no diagnostic budget spent). */
async function freshUser() {
  const { res } = await registerUser(a);
  const token = res.body.token as string;
  const userId = res.body.user.id as string;
  await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [userId]);
  return { token, userId };
}

/** Insert one attempt row `minutesAgo` minutes in the past; returns its id. */
async function insertAttempt(
  userId: string,
  questionId: string,
  minutesAgo: number,
  overrides: { context?: string; score?: number; passed?: boolean } = {},
): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, created_at)
     VALUES ($1, $2, $3, 1, 'transcribed answer', $4, $5, 'feedback text', now() - ($6 || ' minutes')::interval)
     RETURNING id`,
    [userId, questionId, overrides.context ?? 'practice', overrides.score ?? 70, overrides.passed ?? true, minutesAgo],
  );
  return rows[0].id;
}

async function someQuestions(
  limit: number,
): Promise<Array<{ id: string; prompt_word: string; question_text: string }>> {
  const { rows } = await pool.query<{ id: string; prompt_word: string; question_text: string }>(
    "SELECT id, prompt_word, question_text FROM questions WHERE cefr_level = 'A1' ORDER BY id LIMIT $1",
    [limit],
  );
  return rows;
}

describe('GET /practice/history', () => {
  it('returns newest-first items with the exact joined shape and requires auth', async () => {
    const { token, userId } = await freshUser();
    const [q1, q2] = await someQuestions(2);
    await insertAttempt(userId, q1.id, 30, { context: 'diagnostic', score: 55, passed: false });
    await insertAttempt(userId, q2.id, 20, { score: 45, passed: false });
    const newestId = await insertAttempt(userId, q1.id, 10, { score: 80, passed: true });

    const r = await request(a).get('/practice/history').set('Authorization', `Bearer ${token}`);

    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
    expect(r.body.nextCursor).toBeNull();
    expect(r.body.items.map((item: { id: string }) => item.id)).toEqual([
      newestId,
      expect.any(String),
      expect.any(String),
    ]);
    expect(r.body.items[0]).toEqual({
      id: newestId,
      questionId: q1.id,
      promptWord: q1.prompt_word,
      questionText: q1.question_text,
      cefrLevel: 'A1',
      context: 'practice',
      attemptNo: 1,
      score: 80,
      passed: true,
      transcript: 'transcribed answer',
      feedback: 'feedback text',
      createdAt: expect.any(String),
    });
    // Diagnostic attempts belong to the history, flagged by their context.
    expect(r.body.items[2]).toMatchObject({ context: 'diagnostic', score: 55, passed: false });

    const exactLimit = await request(a).get('/practice/history?limit=3').set('Authorization', `Bearer ${token}`);
    expect(exactLimit.status).toBe(200);
    expect(exactLimit.body.items).toHaveLength(3);
    expect(exactLimit.body.nextCursor).toBeNull();

    expect((await request(a).get('/practice/history')).status).toBe(401);
  });

  it('walks pages with the keyset cursor without gaps or overlaps', async () => {
    const { token, userId } = await freshUser();
    const [q] = await someQuestions(1);
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(await insertAttempt(userId, q.id, i + 1)); // newest first
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const url: string = `/practice/history?limit=2${cursor ? `&cursor=${cursor}` : ''}`;
      const page: request.Response = await request(a).get(url).set('Authorization', `Bearer ${token}`);
      expect(page.status).toBe(200);
      const pageIds = page.body.items.map((item: { id: string }) => item.id) as string[];
      expect(pageIds.every((id) => !seen.includes(id))).toBe(true);
      seen.push(...pageIds);
      cursor = page.body.nextCursor as string | null;
      pages++;
      expect(pages).toBeLessThanOrEqual(3);
    } while (cursor !== null);

    expect(pages).toBe(3); // 2 + 2 + 1
    expect(seen).toEqual(ids);
  });

  it('validates limit bounds and rejects foreign or malformed cursors', async () => {
    const { token, userId } = await freshUser();
    const { userId: otherUserId } = await freshUser();
    const [q] = await someQuestions(1);
    await insertAttempt(userId, q.id, 1);
    const foreignAttempt = await insertAttempt(otherUserId, q.id, 1);

    const foreign = await request(a)
      .get(`/practice/history?cursor=${foreignAttempt}`)
      .set('Authorization', `Bearer ${token}`);
    expect(foreign.status).toBe(400);
    expect(foreign.body).toEqual({ error: 'Invalid history cursor', code: 'VALIDATION_FAILED' });

    const malformed = await request(a)
      .get('/practice/history?cursor=not-a-uuid')
      .set('Authorization', `Bearer ${token}`);
    expect(malformed.status).toBe(400);
    expect(malformed.body).toEqual({ error: 'cursor: cursor must be a valid UUID', code: 'VALIDATION_FAILED' });

    expect((await request(a).get('/practice/history?limit=0').set('Authorization', `Bearer ${token}`)).status).toBe(
      400,
    );
    expect((await request(a).get('/practice/history?limit=51').set('Authorization', `Bearer ${token}`)).status).toBe(
      400,
    );
  });

  it('never leaks another learner attempts', async () => {
    const { token, userId } = await freshUser();
    const { userId: otherUserId } = await freshUser();
    const [q] = await someQuestions(1);
    const mine = await insertAttempt(userId, q.id, 1);
    await insertAttempt(otherUserId, q.id, 1);

    const r = await request(a).get('/practice/history').set('Authorization', `Bearer ${token}`);
    expect(r.body.items.map((item: { id: string }) => item.id)).toEqual([mine]);
  });
});

describe('GET /practice/stats', () => {
  const MINUTES_PER_DAY = 24 * 60;

  it('returns zeros and a null lastPracticedAt for a learner with no history', async () => {
    const { token } = await freshUser();
    const total = await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM questions WHERE cefr_level = 'A1'");

    const r = await request(a).get('/practice/stats').set('Authorization', `Bearer ${token}`);

    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
    expect(r.body).toEqual({
      level: 'A1',
      progress: { masteredCount: 0, learningCount: 0, totalAtLevel: total.rows[0].n, dueCount: 0 },
      streakDays: 0,
      practicedToday: 0,
      totalAttempts: 0,
      lastPracticedAt: null,
    });
  });

  it('serves a pre-diagnostic learner a null level with zero progress', async () => {
    const { res } = await registerUser(a);
    const r = await request(a).get('/practice/stats').set('Authorization', `Bearer ${res.body.token}`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      level: null,
      progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
      streakDays: 0,
    });
  });

  it('computes streaks over UTC days: yesterday keeps it alive, today extends it, a gap breaks it', async () => {
    const { token, userId } = await freshUser();
    const [q] = await someQuestions(1);
    // Two consecutive days ending YESTERDAY: the streak is still alive.
    await insertAttempt(userId, q.id, 2 * MINUTES_PER_DAY);
    await insertAttempt(userId, q.id, 1 * MINUTES_PER_DAY);
    let r = await request(a).get('/practice/stats').set('Authorization', `Bearer ${token}`);
    expect(r.body.streakDays).toBe(2);
    expect(r.body.practicedToday).toBe(0);

    // Practicing today extends it to 3 and counts toward practicedToday.
    await insertAttempt(userId, q.id, 0);
    r = await request(a).get('/practice/stats').set('Authorization', `Bearer ${token}`);
    expect(r.body.streakDays).toBe(3);
    expect(r.body.practicedToday).toBe(1);
    expect(r.body.totalAttempts).toBe(3);

    // A gap two days back caps the streak at the run that touches today.
    const { token: gapToken, userId: gapUserId } = await freshUser();
    for (const minutesAgo of [3 * MINUTES_PER_DAY, 1 * MINUTES_PER_DAY, 0]) {
      await insertAttempt(gapUserId, q.id, minutesAgo);
    }
    const gapStats = await request(a).get('/practice/stats').set('Authorization', `Bearer ${gapToken}`);
    expect(gapStats.body.streakDays).toBe(2);

    // A last practice two days ago is a dead streak.
    const { token: staleToken, userId: staleUserId } = await freshUser();
    await insertAttempt(staleUserId, q.id, 2 * MINUTES_PER_DAY);
    const staleStats = await request(a).get('/practice/stats').set('Authorization', `Bearer ${staleToken}`);
    expect(staleStats.body.streakDays).toBe(0);
    expect(staleStats.body.totalAttempts).toBe(1);
  });

  it('counts only practice attempts and reports the newest practice timestamp', async () => {
    const { token, userId } = await freshUser();
    const [q] = await someQuestions(1);
    await insertAttempt(userId, q.id, 5, { context: 'diagnostic' });
    // This assertion is about context filtering, not elapsed time. Keep both
    // practice rows on the current UTC day even when the suite runs during the
    // first hour after midnight.
    await insertAttempt(userId, q.id, 0);
    await insertAttempt(userId, q.id, 0);

    const r = await request(a).get('/practice/stats').set('Authorization', `Bearer ${token}`);

    expect(r.body.totalAttempts).toBe(2);
    expect(r.body.practicedToday).toBe(2);
    expect(r.body.streakDays).toBe(1);
    const { rows } = await pool.query<{ latest: string }>(
      "SELECT max(created_at) AS latest FROM attempts WHERE user_id = $1 AND context = 'practice'",
      [userId],
    );
    expect(new Date(r.body.lastPracticedAt).getTime()).toBe(new Date(rows[0].latest).getTime());
  });

  it('reflects live progress counters including dueCount', async () => {
    const { token, userId } = await freshUser();
    const [q1, q2] = await someQuestions(2);
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, due_at)
       VALUES ($1, $2, 'mastered', 90, 1, now() - interval '1 hour'),
              ($1, $3, 'learning', 40, 2, now() + interval '1 day')`,
      [userId, q1.id, q2.id],
    );

    const r = await request(a).get('/practice/stats').set('Authorization', `Bearer ${token}`);

    expect(r.body.progress).toMatchObject({ masteredCount: 1, learningCount: 1, dueCount: 1 });
  });
});
