import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const FAIL_SCORE = 0; // Math.random() -> 0 gives mock score 40 (fail)
const PASS_SCORE = 0.9999; // mock score 95 (pass)

describe('practice attempt numbering (deterministic mock scores)', () => {
  const a = app();

  async function freshUserAtQuestion() {
    const { res } = await registerUser(a);
    const token = res.body.token;
    await completeDiagnostic(a, token);
    const q = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    return { token, questionId: q.body.question.id as string };
  }

  it('walks attempts 1-3 on repeated failures, then resets to 1', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(FAIL_SCORE);
    const { token, questionId } = await freshUserAtQuestion();
    const attempt = () =>
      answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId);

    const first = await attempt();
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });
    expect(first.body.nextQuestion).toBeUndefined();
    expect(first.body.finalFeedback).toBeUndefined();

    const second = await attempt();
    expect(second.body).toMatchObject({ passed: false, attemptNo: 2, attemptsLeft: 1 });

    const third = await attempt();
    expect(third.body).toMatchObject({ passed: false, attemptNo: 3, attemptsLeft: 0 });
    expect(third.body.finalFeedback).toContain('final feedback');
    expect(third.body.nextQuestion).toBeDefined();

    // attempt_no 3 is NOT < MAX_ATTEMPTS: the next attempt restarts at 1.
    const fourth = await attempt();
    expect(fourth.body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });
  });

  it('resets to attempt 1 after a pass and offers the next question', async () => {
    const { token, questionId } = await freshUserAtQuestion();
    const attempt = () =>
      answerForm(request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`), questionId);

    vi.spyOn(Math, 'random').mockReturnValue(FAIL_SCORE);
    const failed = await attempt();
    expect(failed.body).toMatchObject({ passed: false, attemptNo: 1 });

    vi.spyOn(Math, 'random').mockReturnValue(PASS_SCORE);
    const passed = await attempt();
    expect(passed.body).toMatchObject({ passed: true, attemptNo: 2 });
    expect(passed.body.nextQuestion).toBeDefined();
    expect(passed.body.attemptsLeft).toBeUndefined();
    expect(passed.body.finalFeedback).toBeUndefined();

    // A passed last attempt restarts numbering at 1.
    const afterPass = await attempt();
    expect(afterPass.body).toMatchObject({ attemptNo: 1 });
  });
});
