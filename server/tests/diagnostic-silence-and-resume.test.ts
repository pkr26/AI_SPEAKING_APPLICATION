import { randomUUID } from 'crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { PoolClient } from 'pg';

const speakMock = vi.hoisted(() => vi.fn());

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: speakMock };
});

import { answerForm, app, pool, registerUser } from './helpers';

type SpeakingResult = { transcript: string; score: number; passed: boolean; feedback: string };

/**
 * Wrap every explicit pool lease for the duration of one action, recording
 * each leased client's query texts as their own segment (the segment ends
 * when the lease is released). Mirrors level-progression's
 * observeExplicitLeaseQueries, segmented per lease so a write transaction can
 * be asserted from its BEGIN through its final statement.
 */
async function observeLeaseQueries<T>(action: () => PromiseLike<T>): Promise<{ result: T; leases: string[][] }> {
  const originalConnect = pool.connect.bind(pool);
  const leases: string[][] = [];
  let current: string[] | null = null;
  const connect = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
    if (typeof callback === 'function') return originalConnect(callback as never);
    return originalConnect().then((client: PoolClient) => {
      const mutable = client as unknown as {
        query: (...args: unknown[]) => unknown;
        release: (error?: Error | boolean) => void;
      };
      const actualQuery = mutable.query;
      const actualRelease = mutable.release;
      mutable.query = (query: unknown, ...args: unknown[]) => {
        const text = typeof query === 'string' ? query : (query as { text?: unknown } | null)?.text;
        if (typeof text === 'string' && current) current.push(text);
        return actualQuery.call(client, query, ...args);
      };
      mutable.release = (error?: Error | boolean) => {
        mutable.query = actualQuery;
        mutable.release = actualRelease;
        if (current) leases.push(current);
        current = null;
        actualRelease.call(client, error);
      };
      current = [];
      return client;
    });
  }) as typeof pool.connect);

  try {
    return { result: await action(), leases };
  } finally {
    connect.mockRestore();
  }
}

const lastQuery = (texts: string[]) => texts[texts.length - 1];

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

  it('ends the silence retry finalize transaction with an explicit COMMIT', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    speakMock.mockResolvedValueOnce({
      transcript: '',
      score: 0,
      passed: false,
      feedback: 'I could not hear enough English. Please speak clearly and try again.',
    });
    const { result, leases } = await observeLeaseQueries(() =>
      answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        next.body.question.id,
        randomUUID(),
      ),
    );
    expect(result.status).toBe(200);
    expect(result.body.noSpeech).toBe(true);
    const silenceFinalize = leases.find((texts) =>
      texts.some((text) =>
        text.includes('SET processing_question_id = NULL, processing_started_at = NULL, processing_claim_id = NULL'),
      ),
    );
    expect(silenceFinalize).toBeDefined();
    expect(silenceFinalize).toContain('BEGIN');
    expect(lastQuery(silenceFinalize!)).toBe('COMMIT');
  });

  it('rejects a silence finalize whose processing claim was rotated while the provider ran', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    let releaseSilence!: (result: SpeakingResult) => void;
    speakMock.mockImplementationOnce(() => new Promise<SpeakingResult>((resolve) => (releaseSilence = resolve)));
    const pending = Promise.resolve(
      answerForm(
        request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
        next.body.question.id,
        randomUUID(),
      ),
    );
    await vi.waitFor(() => expect(speakMock).toHaveBeenCalledOnce());

    // Another writer (restart, lease takeover) rotated the durable claim: the
    // silent result must not clear or complete work its owner no longer holds.
    await pool.query('UPDATE diagnostic_state SET processing_claim_id = gen_random_uuid() WHERE user_id = $1', [
      userId,
    ]);
    releaseSilence({ transcript: '', score: 0, passed: false, feedback: 'I could not hear enough English.' });
    const response = await pending;

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'Assessment state changed; please try again', code: 'STATE_CHANGED' });
  });

  it('orders run summaries oldest-first across multiple answered questions', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(first.body.question.cefrLevel).toBe('B1');

    speakMock.mockResolvedValueOnce({
      transcript: 'first chronological answer',
      score: 78,
      passed: true,
      feedback: 'first feedback',
    });
    const firstAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      first.body.question.id,
    );
    expect(firstAnswer.status).toBe(200);
    expect(firstAnswer.body.done).toBe(false);
    const secondQuestion = firstAnswer.body.nextQuestion;

    speakMock.mockResolvedValueOnce({
      transcript: 'second chronological answer',
      score: 40,
      passed: false,
      feedback: 'second feedback',
    });
    const secondAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      secondQuestion.id,
    );
    expect(secondAnswer.status).toBe(200);
    expect(secondAnswer.body.done).toBe(false);

    const resumed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(resumed.body.progress).toEqual({ asked: 2, maxQuestions: 3 });
    expect(resumed.body.answers).toEqual([
      {
        attemptNo: 1,
        promptWord: first.body.question.promptWord,
        questionText: first.body.question.questionText,
        transcript: 'first chronological answer',
        score: 78,
        passed: true,
        feedback: 'first feedback',
      },
      {
        attemptNo: 2,
        promptWord: secondQuestion.promptWord,
        questionText: secondQuestion.questionText,
        transcript: 'second chronological answer',
        score: 40,
        passed: false,
        feedback: 'second feedback',
      },
    ]);
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

  it('completes the placement on the third answer when the final failure collapses the window', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(first.body.question.cefrLevel).toBe('B1');

    // B1 pass -> [3,5] (C1), C1 pass -> [5,5] (C2), C2 fail -> [5,4]: the
    // third failure COLLAPSES the window (5 > 4), so the run finishes via the
    // window disjunct — never the attemptNo bound alone on a fresh journey
    // (the bound-only boundary is pinned by the seeded [3,5]/asked=2 test in
    // diagnostic-search.test.ts).
    speakMock.mockResolvedValueOnce({ transcript: 'passed b1', score: 80, passed: true, feedback: 'good' });
    const firstAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      first.body.question.id,
    );
    expect(firstAnswer.status).toBe(200);
    expect(firstAnswer.body.done).toBe(false);
    expect(firstAnswer.body.nextQuestion.cefrLevel).toBe('C1');

    speakMock.mockResolvedValueOnce({ transcript: 'passed c1', score: 80, passed: true, feedback: 'good' });
    const secondAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      firstAnswer.body.nextQuestion.id,
    );
    expect(secondAnswer.status).toBe(200);
    expect(secondAnswer.body.done).toBe(false);
    expect(secondAnswer.body.nextQuestion.cefrLevel).toBe('C2');

    speakMock.mockResolvedValueOnce({ transcript: 'failed c2', score: 40, passed: false, feedback: 'below the bar' });
    const thirdAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      secondAnswer.body.nextQuestion.id,
    );
    expect(thirdAnswer.status).toBe(200);
    expect(thirdAnswer.body.done).toBe(true);
    expect(thirdAnswer.body.level).toBe('C1');
    expect(thirdAnswer.body.nextQuestion).toBeUndefined();
  });

  it('completes the placement when the search window collapses below the floor before the three-question bound', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(first.body.question.cefrLevel).toBe('B1');

    speakMock.mockResolvedValueOnce({
      transcript: 'failed the middle level',
      score: 40,
      passed: false,
      feedback: 'below the bar',
    });
    const firstAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      first.body.question.id,
    );
    expect(firstAnswer.status).toBe(200);
    expect(firstAnswer.body.done).toBe(false);
    expect(firstAnswer.body.nextQuestion.cefrLevel).toBe('A1');

    speakMock.mockResolvedValueOnce({
      transcript: 'failed the bottom level',
      score: 40,
      passed: false,
      feedback: 'below the bar',
    });
    const secondAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      firstAnswer.body.nextQuestion.id,
    );
    expect(secondAnswer.status).toBe(200);
    // low (0) passed above high (-1) on the second answer: the window-collapse
    // disjunct finishes the run before the attemptNo bound could.
    expect(secondAnswer.body.done).toBe(true);
    expect(secondAnswer.body.level).toBe('A1');

    const persisted = await pool.query(
      `SELECT questions_asked, low_idx, high_idx, current_question_id,
              (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'diagnostic') AS attempts
       FROM diagnostic_state WHERE user_id = $1`,
      [userId],
    );
    expect(persisted.rows[0]).toEqual({
      questions_asked: 2,
      low_idx: 0,
      high_idx: -1,
      current_question_id: null,
      attempts: 2,
    });
    const placed = await pool.query<{ cefr_level: string; diagnostic_completed: boolean }>(
      'SELECT cefr_level, diagnostic_completed FROM users WHERE id = $1',
      [userId],
    );
    expect(placed.rows[0]).toEqual({ cefr_level: 'A1', diagnostic_completed: true });

    const reveal = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(reveal.body.done).toBe(true);
    expect(reveal.body.level).toBe('A1');
  });

  it('keeps the run open when a pass/fail split narrows the window to exactly one level', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const first = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(first.body.question.cefrLevel).toBe('B1');

    speakMock.mockResolvedValueOnce({
      transcript: 'passed the middle level',
      score: 78,
      passed: true,
      feedback: 'above the bar',
    });
    const firstAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      first.body.question.id,
    );
    expect(firstAnswer.status).toBe(200);
    expect(firstAnswer.body.done).toBe(false);
    expect(firstAnswer.body.nextQuestion.cefrLevel).toBe('C1');

    speakMock.mockResolvedValueOnce({
      transcript: 'failed the upper level',
      score: 40,
      passed: false,
      feedback: 'below the bar',
    });
    const secondAnswer = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      firstAnswer.body.nextQuestion.id,
    );
    expect(secondAnswer.status).toBe(200);
    // low and high meet at B2 (3): the window is one level wide, not closed.
    expect(secondAnswer.body.done).toBe(false);
    expect(secondAnswer.body.nextQuestion.cefrLevel).toBe('B2');

    const resumed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    expect(resumed.body.done).toBe(false);
    expect(resumed.body.progress).toEqual({ asked: 2, maxQuestions: 3 });
    expect(resumed.body.question.cefrLevel).toBe('B2');
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

  it('restarts a legacy counted-silence run that kept its full window with no current question', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const q = await pool.query<{ id: string }>("SELECT id FROM questions WHERE cefr_level = 'B1' LIMIT 1");
    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'diagnostic', 1, '', 0, false, 'No speech detected.')`,
      [userId, q.rows[0].id],
    );
    await pool.query(
      `UPDATE diagnostic_state
       SET low_idx = 0, high_idx = 5, questions_asked = 1, current_question_id = NULL
       WHERE user_id = $1`,
      [userId],
    );

    const resumed = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    expect(resumed.status).toBe(200);
    expect(resumed.body).toMatchObject({
      done: false,
      progress: { asked: 0, maxQuestions: 3 },
      answers: [],
      question: { cefrLevel: 'B1' },
    });
    const repaired = await pool.query(
      `SELECT low_idx, high_idx, questions_asked, current_question_id
       FROM diagnostic_state WHERE user_id = $1`,
      [userId],
    );
    expect(repaired.rows[0]).toEqual({
      low_idx: 0,
      high_idx: 5,
      questions_asked: 0,
      current_question_id: resumed.body.question.id,
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

  it('commits the acknowledged historical-placement read before returning its legacy summary', async () => {
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
       SET low_idx = 0, high_idx = -1, questions_asked = 1, current_question_id = NULL
       WHERE user_id = $1`,
      [userId],
    );
    await pool.query(
      `UPDATE users
       SET diagnostic_completed = true, diagnostic_acknowledged = true, cefr_level = 'A1'
       WHERE id = $1`,
      [userId],
    );

    const { result, leases } = await observeLeaseQueries(() =>
      request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`),
    );
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ done: true, level: 'A1', answers: [] });
    expect(leases).toHaveLength(1);
    expect(leases[0]).toContain('BEGIN');
    expect(lastQuery(leases[0])).toBe('COMMIT');
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
    expect(response.body).toEqual({
      error: 'Diagnostic is not ready to acknowledge',
      code: 'STATE_CHANGED',
    });
  });
});
