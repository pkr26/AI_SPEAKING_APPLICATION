import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const FAIL = 0; // mock score 40 -> fail
const PASS = 0.9999; // mock score 95 -> pass

describe('diagnostic adaptive binary search', () => {
  const a = app();

  async function nextQuestion(token: string) {
    const r = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    return r.body;
  }

  async function answer(token: string, questionId: string) {
    const r = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      questionId,
    );
    expect(r.status).toBe(200);
    return r.body;
  }

  it('assigns A1 when every answer fails (high_idx clamps at 0)', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    vi.spyOn(Math, 'random').mockReturnValue(FAIL);

    const first = await nextQuestion(token);
    expect(first.question.cefrLevel).toBe('B1'); // floor((0 + 5) / 2)
    const r1 = await answer(token, first.question.id);
    expect(r1.done).toBe(false);
    expect(r1.nextQuestion.cefrLevel).toBe('A1'); // floor((0 + 1) / 2)

    const r2 = await answer(token, r1.nextQuestion.id);
    expect(r2).toMatchObject({ done: true, level: 'A1', passed: false, score: 40 });

    const { rows } = await pool.query<{ low_idx: number; high_idx: number; questions_asked: number }>(
      'SELECT low_idx, high_idx, questions_asked FROM diagnostic_state WHERE user_id = $1',
      [res.body.user.id],
    );
    expect(rows[0]).toEqual({ low_idx: 0, high_idx: -1, questions_asked: 2 });
  });

  it('assigns C2 when every answer passes (level index clamps at LEVELS.length - 1)', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    vi.spyOn(Math, 'random').mockReturnValue(PASS);

    const first = await nextQuestion(token);
    expect(first.question.cefrLevel).toBe('B1');
    const r1 = await answer(token, first.question.id);
    expect(r1.nextQuestion.cefrLevel).toBe('C1'); // floor((3 + 5) / 2)

    const r2 = await answer(token, r1.nextQuestion.id);
    expect(r2.nextQuestion.cefrLevel).toBe('C2'); // floor((5 + 5) / 2)

    const r3 = await answer(token, r2.nextQuestion.id);
    expect(r3).toMatchObject({ done: true, level: 'C2', passed: true, score: 95 });

    const { rows } = await pool.query<{ low_idx: number; high_idx: number; questions_asked: number }>(
      'SELECT low_idx, high_idx, questions_asked FROM diagnostic_state WHERE user_id = $1',
      [res.body.user.id],
    );
    expect(rows[0]).toEqual({ low_idx: 6, high_idx: 5, questions_asked: 3 });
  });

  it('converges through the midpoint computation on a mixed pass/fail path', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const random = vi.spyOn(Math, 'random');

    random.mockReturnValue(FAIL);
    const first = await nextQuestion(token);
    const r1 = await answer(token, first.question.id); // B1 fail -> [0,1]
    expect(r1.nextQuestion.cefrLevel).toBe('A1');

    random.mockReturnValue(PASS);
    const r2 = await answer(token, r1.nextQuestion.id); // A1 pass -> [1,1]
    expect(r2.nextQuestion.cefrLevel).toBe('A2'); // floor((1 + 1) / 2)

    const r3 = await answer(token, r2.nextQuestion.id); // A2 pass -> low 2 > high 1
    expect(r3).toMatchObject({ done: true, level: 'A2' });
  });

  it('stops at MAX_QUESTIONS even while the search window is still open', async () => {
    // The 6-level binary search converges in <=3 answers from a fresh state, so
    // seed a nearly-finished state where low <= high still holds.
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    vi.spyOn(Math, 'random').mockReturnValue(PASS);

    const q = await pool.query<{ id: string }>(`SELECT id FROM questions WHERE cefr_level = 'A2' LIMIT 1`);
    await pool.query(
      `UPDATE diagnostic_state SET low_idx = 1, high_idx = 1, questions_asked = 4, current_question_id = $1
       WHERE user_id = $2`,
      [q.rows[0].id, userId],
    );

    const r = await answer(token, q.rows[0].id);
    // attemptNo 5 >= MAX_QUESTIONS ends the diagnostic even though low <= high.
    expect(r).toMatchObject({ done: true, level: 'A2' });
    const { rows } = await pool.query<{ low_idx: number; high_idx: number; questions_asked: number }>(
      'SELECT low_idx, high_idx, questions_asked FROM diagnostic_state WHERE user_id = $1',
      [userId],
    );
    expect(rows[0]).toEqual({ low_idx: 2, high_idx: 1, questions_asked: 5 });
  });

  it('rejects answers after completion', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    const level = await completeDiagnostic(a, token);

    // Completed diagnostic: fresh requestId reaches the completed guard.
    const q = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [level]);
    const done = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      q.rows[0].id,
    );
    expect(done.status).toBe(400);
    expect(done.body.error).toBe('Diagnostic already completed');
    // The guard abandoned its request row, so nothing lingers as 'processing'.
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM assessment_requests WHERE user_id = $1 AND status = 'processing'`,
      [userId],
    );
    expect(rows[0].n).toBe(0);
  });

  it('returns 409 when a previous answer is still being processed', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;

    const next = await nextQuestion(token);
    await pool.query(
      `UPDATE diagnostic_state
       SET processing_question_id = current_question_id, processing_started_at = now(), processing_claim_id = $1
       WHERE user_id = $2`,
      [randomUUID(), userId],
    );

    const r = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      next.question.id,
    );
    expect(r.status).toBe(409);
    expect(r.body).toEqual({
      error: 'An assessment is already in progress',
      code: 'ASSESSMENT_IN_PROGRESS',
    });
  });
});
