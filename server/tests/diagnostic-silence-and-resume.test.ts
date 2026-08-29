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
