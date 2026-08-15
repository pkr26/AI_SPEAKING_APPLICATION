import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const speakMock = vi.hoisted(() => vi.fn());
const nativeMock = vi.hoisted(() => vi.fn());

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: speakMock, assessNativeComprehension: nativeMock };
});

import { config } from '../src/config';
import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

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

describe('CEFR level progression', () => {
  const a = app();

  async function freshUserAt(level: string) {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await pool.query('UPDATE users SET diagnostic_completed = true, cefr_level = $2 WHERE id = $1', [userId, level]);
    return { token, userId };
  }

  async function levelQuestionIds(level: string): Promise<string[]> {
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id', [
      level,
    ]);
    return rows.map(({ id }) => id);
  }

  async function seedMastered(userId: string, questionIds: string[]) {
    await pool.query(
      `INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count)
       SELECT $1, id, 'mastered', 90, 1 FROM unnest($2::uuid[]) AS q(id)`,
      [userId, questionIds],
    );
  }

  async function userLevel(userId: string): Promise<string | null> {
    const { rows } = await pool.query<{ cefr_level: string | null }>('SELECT cefr_level FROM users WHERE id = $1', [
      userId,
    ]);
    return rows[0].cefr_level;
  }

  const attempt = (token: string, questionId: string) =>
    answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId);

  it('promotes at exactly ceil(0.85 * totalAtLevel) mastered words, answering from the NEW level', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length); // 85 of the seeded 100
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const target = ids[threshold - 1];

    mockScore(90);
    const r = await attempt(token, target);

    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ passed: true, mastered: true, levelUp: { from: 'A1', to: 'A2' } });
    // Both the next question and the progress snapshot come from A2.
    expect(r.body.next.kind).toBe('new');
    expect(r.body.next.question.cefrLevel).toBe('A2');
    const a2Total = (await levelQuestionIds('A2')).length;
    expect(r.body.next.progress).toEqual({
      masteredCount: 0,
      learningCount: 0,
      totalAtLevel: a2Total,
      dueCount: 0,
    });
    expect(await userLevel(userId)).toBe('A2');

    const nextQuestion = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(nextQuestion.body.question.cefrLevel).toBe('A2');
  });

  it('does not promote one mastery below the threshold', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 2)); // one short after this attempt
    const target = ids[threshold - 1];

    mockScore(90);
    const r = await attempt(token, target);

    expect(r.status).toBe(200);
    expect(r.body.mastered).toBe(true);
    expect(r.body.levelUp).toBeUndefined();
    expect(r.body.next.question.cefrLevel).toBe('A1');
    expect(await userLevel(userId)).toBe('A1');
  });

  it('requires a mastery EVENT: re-passing an already-mastered word never promotes', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    // Already at the threshold — but only a transition into mastered counts.
    await seedMastered(userId, ids.slice(0, threshold));

    mockScore(90);
    const r = await attempt(token, ids[0]);

    expect(r.status).toBe(200);
    expect(r.body.mastered).toBe(true);
    expect(r.body.levelUp).toBeUndefined();
    expect(await userLevel(userId)).toBe('A1');
  });

  it('never promotes from C2; retention just continues', async () => {
    const { token, userId } = await freshUserAt('C2');
    const ids = await levelQuestionIds('C2');
    await seedMastered(userId, ids.slice(0, ids.length - 1));
    const target = ids[ids.length - 1];

    mockScore(90);
    const r = await attempt(token, target);

    expect(r.status).toBe(200);
    expect(r.body.mastered).toBe(true);
    expect(r.body.levelUp).toBeUndefined();
    expect(await userLevel(userId)).toBe('C2');
    // Everything is mastered now: the bank cycles back as retention revision.
    expect(r.body.next.kind).toBe('revision');
    expect(r.body.next.question.cefrLevel).toBe('C2');
    expect(r.body.next.progress.masteredCount).toBe(ids.length);
  });

  it('promotes exactly once under concurrent mastering attempts (locked transaction)', async () => {
    const { token, userId } = await freshUserAt('A1');
    const ids = await levelQuestionIds('A1');
    const threshold = Math.ceil(0.85 * ids.length);
    await seedMastered(userId, ids.slice(0, threshold - 1));
    const [targetA, targetB] = [ids[threshold - 1], ids[threshold]];

    mockScore(90);
    const [ra, rb] = await Promise.all([attempt(token, targetA), attempt(token, targetB)]);

    expect(ra.status).toBe(200);
    expect(rb.status).toBe(200);
    // The promotion commits exactly once, but BOTH attempts crossed the
    // threshold: the loser of the guarded UPDATE re-reads the promoted level
    // and echoes the same levelUp (and answers from the NEW level) instead of
    // serving one stale-level question.
    expect(ra.body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    expect(rb.body.levelUp).toEqual({ from: 'A1', to: 'A2' });
    expect(ra.body.next.question.cefrLevel).toBe('A2');
    expect(rb.body.next.question.cefrLevel).toBe('A2');
    // The user row was promoted exactly one step, never A1 -> A2 -> B1.
    expect(await userLevel(userId)).toBe('A2');
  });
});

describe('POST /diagnostic/restart', () => {
  const a = app();

  it('rejects a missing or false confirm with the validation contract', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;

    const missing = await request(a).post('/diagnostic/restart').set('Authorization', `Bearer ${token}`).send({});
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({
      error: 'confirm: must be true to restart the diagnostic',
      code: 'VALIDATION_FAILED',
    });

    const explicit = await request(a)
      .post('/diagnostic/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: false });
    expect(explicit.status).toBe(400);
    expect(explicit.body).toEqual({
      error: 'confirm: must be true to restart the diagnostic',
      code: 'VALIDATION_FAILED',
    });
  });

  it('resets placement, keeps all history, and lets the learner re-take and get re-placed', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    mockScore(90); // pass everything: placed at C2
    const firstLevel = await completeDiagnostic(a, token);
    expect(firstLevel).toBe('C2');
    // Practice once so real history exists.
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(
      (
        await answerForm(
          request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
          q.body.question.id,
        )
      ).status,
    ).toBe(200);
    const before = await pool.query<{ attempts: number; progress: number }>(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS attempts,
         (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress`,
      [userId],
    );
    expect(before.rows[0]).toEqual({ attempts: 4, progress: 1 }); // 3-step pass-walk diagnostic + 1 practice

    const restart = await request(a)
      .post('/diagnostic/restart')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: true });
    expect(restart.status).toBe(204);
    expect(restart.headers['cache-control']).toContain('no-store');

    // Placement cleared (valid under users_diagnostic_level_check)...
    const user = await pool.query<{ diagnostic_completed: boolean; cefr_level: string | null }>(
      'SELECT diagnostic_completed, cefr_level FROM users WHERE id = $1',
      [userId],
    );
    expect(user.rows[0]).toEqual({ diagnostic_completed: false, cefr_level: null });
    const state = await pool.query(
      `SELECT low_idx, high_idx, questions_asked, current_question_id,
              processing_question_id, processing_claim_id
       FROM diagnostic_state WHERE user_id = $1`,
      [userId],
    );
    expect(state.rows[0]).toEqual({
      low_idx: 0,
      high_idx: 5,
      questions_asked: 0,
      current_question_id: null,
      processing_question_id: null,
      processing_claim_id: null,
    });
    // ...practice is gated again, but nothing was deleted.
    const gated = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(gated.status).toBe(403);
    expect(gated.body).toEqual({ error: 'Diagnostic not completed', code: 'FORBIDDEN' });
    const after = await pool.query<{ attempts: number; progress: number }>(
      `SELECT
         (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS attempts,
         (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress`,
      [userId],
    );
    expect(after.rows[0]).toEqual(before.rows[0]);

    // Re-take: failing everything now places the learner at A1.
    mockScore(40);
    const secondLevel = await completeDiagnostic(a, token);
    expect(secondLevel).toBe('A1');
    const rePlaced = await pool.query<{ cefr_level: string; n: number }>(
      `SELECT cefr_level, (SELECT count(*)::int FROM attempts WHERE user_id = $1) AS n
       FROM users WHERE id = $1`,
      [userId],
    );
    expect(rePlaced.rows[0].cefr_level).toBe('A1');
    expect(rePlaced.rows[0].n).toBeGreaterThan(before.rows[0].attempts); // old rows intact + new diagnostic rows
    expect((await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });

  it('is bounded by a per-user budget and rejects over-budget restarts with 429', async () => {
    const savedRateLimit = { ...config.rateLimit };
    config.rateLimit.passwordWindowMs = 60_000;
    config.rateLimit.passwordMax = 1;
    await pool.query('DELETE FROM rate_limit_windows');
    try {
      const scoped = app();
      const { res } = await registerUser(scoped);
      const token = res.body.token as string;

      const first = await request(scoped)
        .post('/diagnostic/restart')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });
      expect(first.status).toBe(204);

      const limited = await request(scoped)
        .post('/diagnostic/restart')
        .set('Authorization', `Bearer ${token}`)
        .send({ confirm: true });
      expect(limited.status).toBe(429);
      expect(limited.body).toEqual({ error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' });

      // A different user keeps an independent budget.
      const { res: other } = await registerUser(scoped);
      const otherRestart = await request(scoped)
        .post('/diagnostic/restart')
        .set('Authorization', `Bearer ${other.body.token}`)
        .send({ confirm: true });
      expect(otherRestart.status).toBe(204);
    } finally {
      Object.assign(config.rateLimit, savedRateLimit);
      await pool.query('DELETE FROM rate_limit_windows');
    }
  });
});
