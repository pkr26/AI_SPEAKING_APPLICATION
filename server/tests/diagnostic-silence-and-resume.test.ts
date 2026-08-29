import { randomUUID } from 'crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const speakMock = vi.hoisted(() => vi.fn());

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: speakMock };
});

import { answerForm, app, pool, registerUser } from './helpers';

beforeEach(() => {
  speakMock.mockReset().mockResolvedValue({
    transcript: 'I answered the question clearly.',
    score: 78,
    passed: true,
    feedback: 'Clear and relevant. Add one more supporting detail.',
  });
});

afterAll(async () => {
  await pool.end();
});

describe('diagnostic silence and durable result summaries', () => {
  const a = app();

  it('replays silence as a free retry without changing placement or progress', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(next.body.progress).toEqual({ asked: 0, maxQuestions: 3 });
    expect(next.body.answers).toEqual([]);

    speakMock.mockResolvedValueOnce({
      transcript: '',
      score: 0,
      passed: false,
      feedback: 'I could not hear enough English. Please speak clearly and try again.',
    });
    const requestId = randomUUID();
    const send = () =>
      answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        next.body.question.id,
        requestId,
      );

    const first = await send();
    const replay = await send();

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      passed: false,
      score: 0,
      transcript: '',
      noSpeech: true,
      done: false,
      nextQuestion: { id: next.body.question.id },
    });
    expect(replay.body).toEqual(first.body);
    expect(speakMock).toHaveBeenCalledTimes(1);

    const state = await pool.query(
      `SELECT questions_asked, current_question_id, processing_claim_id,
              (SELECT count(*)::int FROM attempts
               WHERE user_id = $1 AND context = 'diagnostic') AS attempts
       FROM diagnostic_state WHERE user_id = $1`,
      [userId],
    );
    expect(state.rows[0]).toEqual({
      questions_asked: 0,
      current_question_id: next.body.question.id,
      processing_claim_id: null,
      attempts: 0,
    });

    const resumed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(resumed.body).toMatchObject({
      done: false,
      question: { id: next.body.question.id },
      progress: { asked: 0, maxQuestions: 3 },
      answers: [],
    });
  });

  it('returns the latest run transcripts and feedback when a test resumes', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const answered = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      first.body.question.id,
    );
    expect(answered.status).toBe(200);
    expect(answered.body.done).toBe(false);

    const resumed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(resumed.body.progress).toEqual({ asked: 1, maxQuestions: 3 });
    expect(resumed.body.answers).toEqual([
      {
        attemptNo: 1,
        promptWord: first.body.question.promptWord,
        questionText: first.body.question.questionText,
        transcript: 'I answered the question clearly.',
        score: 78,
        passed: true,
        feedback: 'Clear and relevant. Add one more supporting detail.',
      },
    ]);
  });

  it('restarts an incomplete legacy run before returning a blank answer summary', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    // Simulate the pre-silence-fix writer, including ECMAScript whitespace
    // that the 1.1 summary parser correctly rejects as an empty transcript.
    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'diagnostic', 1, $3, 0, false, 'No speech detected.')`,
      [userId, first.body.question.id, `\t\u00a0\ufeff`],
    );
    await pool.query(
      `UPDATE diagnostic_state
       SET low_idx = 0, high_idx = 1, questions_asked = 1,
           current_question_id = $2
       WHERE user_id = $1`,
      [userId, first.body.question.id],
    );

    const resumed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    expect(resumed.status).toBe(200);
    expect(resumed.body).toMatchObject({
      done: false,
      progress: { asked: 0, maxQuestions: 3 },
      answers: [],
      question: { id: expect.any(String) },
    });
    const repaired = await pool.query(
      `SELECT low_idx, high_idx, questions_asked, current_question_id,
              processing_question_id, processing_started_at, processing_claim_id
       FROM diagnostic_state WHERE user_id = $1`,
      [userId],
    );
    expect(repaired.rows[0]).toEqual({
      low_idx: 0,
      high_idx: 5,
      questions_asked: 0,
      current_question_id: resumed.body.question.id,
      processing_question_id: null,
      processing_started_at: null,
      processing_claim_id: null,
    });
  });

  it('restarts a completed but unacknowledged legacy-silence reveal and closes its stale practice cycle', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'diagnostic', 1, '', 0, false, 'No speech detected.')`,
      [userId, first.body.question.id],
    );
    await pool.query(
      `UPDATE diagnostic_state
       SET low_idx = 0, high_idx = -1, questions_asked = 1,
           current_question_id = NULL
       WHERE user_id = $1`,
      [userId],
    );
    await pool.query(
      `UPDATE users
       SET diagnostic_completed = true, diagnostic_acknowledged = false, cefr_level = 'A1'
       WHERE id = $1`,
      [userId],
    );
    const cycle = await pool.query<{ id: string }>(
      `INSERT INTO practice_cycles (user_id, question_id, kind)
       VALUES ($1, $2, 'new')
       RETURNING id`,
      [userId, first.body.question.id],
    );

    const resumed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    expect(resumed.status).toBe(200);
    expect(resumed.body).toMatchObject({
      done: false,
      progress: { asked: 0, maxQuestions: 3 },
      answers: [],
      question: { id: expect.any(String) },
    });
    expect(
      (
        await pool.query(
          `SELECT diagnostic_completed, diagnostic_acknowledged, cefr_level
           FROM users WHERE id = $1`,
          [userId],
        )
      ).rows,
    ).toEqual([{ diagnostic_completed: false, diagnostic_acknowledged: false, cefr_level: null }]);
    expect(
      (await pool.query('SELECT status, closed_at FROM practice_cycles WHERE id = $1', [cycle.rows[0].id])).rows,
    ).toEqual([{ status: 'closed', closed_at: expect.any(Date) }]);
  });

  it('preserves an acknowledged historical placement while omitting unavailable blank legacy summaries', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'diagnostic', 1, '', 0, false, 'Historical no-speech result.')`,
      [userId, first.body.question.id],
    );
    await pool.query(
      `UPDATE diagnostic_state
       SET low_idx = 0, high_idx = -1, questions_asked = 1,
           current_question_id = NULL
       WHERE user_id = $1`,
      [userId],
    );
    await pool.query(
      `UPDATE users
       SET diagnostic_completed = true, diagnostic_acknowledged = true, cefr_level = 'A1'
       WHERE id = $1`,
      [userId],
    );

    const completed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    expect(completed.status).toBe(200);
    expect(completed.body).toEqual({ done: true, level: 'A1', answers: [] });
    expect(
      (
        await pool.query(
          `SELECT diagnostic_completed, diagnostic_acknowledged, cefr_level
           FROM users WHERE id = $1`,
          [userId],
        )
      ).rows,
    ).toEqual([{ diagnostic_completed: true, diagnostic_acknowledged: true, cefr_level: 'A1' }]);
  });

  it('keeps a completed reveal pending until acknowledgement, including after relaunch fetches', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;

    let completion: Record<string, unknown> | undefined;
    for (let index = 0; index < 3; index += 1) {
      const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
      const answered = await answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        next.body.question.id,
      );
      if (answered.body.done) {
        completion = answered.body;
        break;
      }
    }
    expect(completion).toMatchObject({ done: true, level: expect.any(String) });

    const relaunchedProfile = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(relaunchedProfile.body.user).toMatchObject({
      diagnosticCompleted: true,
      diagnosticAcknowledged: false,
    });
    const durableReveal = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(durableReveal.body).toMatchObject({
      done: true,
      level: completion!.level,
      answers: expect.any(Array),
    });

    const acknowledged = await request(a).post('/diagnostic/acknowledge').set('Authorization', `Bearer ${token}`);
    expect(acknowledged.status).toBe(204);
    const replay = await request(a).post('/diagnostic/acknowledge').set('Authorization', `Bearer ${token}`);
    expect(replay.status).toBe(204);
    const homeProfile = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(homeProfile.body.user.diagnosticAcknowledged).toBe(true);
  });

  it('rejects acknowledgement before placement is complete', async () => {
    const { res } = await registerUser(a);
    const response = await request(a).post('/diagnostic/acknowledge').set('Authorization', `Bearer ${res.body.token}`);
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('STATE_CHANGED');
  });
});
