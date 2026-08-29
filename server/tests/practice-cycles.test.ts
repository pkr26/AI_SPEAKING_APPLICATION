import { afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { answerForm, app, completeDiagnostic, createClosedPracticeCycle, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('durable practice serving cycles', () => {
  const a = app();

  it('shares exactly three spoken tries across native and English, resumes after remount, and rejects a fourth', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await completeDiagnostic(a, token);

    const assignment = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(assignment.status).toBe(200);
    expect(assignment.body).toMatchObject({ attemptsUsed: 0, attemptsLeft: 3 });
    const questionId = assignment.body.question.id as string;
    const cycleId = assignment.body.cycleId as string;

    const nativeFirst = await answerForm(
      request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
      questionId,
      randomUUID(),
      cycleId,
    );
    expect(nativeFirst.status, JSON.stringify(nativeFirst.body)).toBe(200);
    expect(nativeFirst.body).toMatchObject({
      mode: 'native',
      cycleId,
      nativeLanguage: 'te',
      attemptNo: 1,
      attemptsLeft: 2,
      translatedTranscript: '(mock English translation)',
    });

    const resumed = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(resumed.body).toMatchObject({ cycleId, kind: 'revision', attemptsUsed: 1, attemptsLeft: 2 });
    expect(resumed.body.question.id).toBe(questionId);

    vi.spyOn(Math, 'random').mockReturnValue(0); // mock English score 40
    const englishSecond = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
      randomUUID(),
      cycleId,
    );
    expect(englishSecond.status, JSON.stringify(englishSecond.body)).toBe(200);
    expect(englishSecond.body).toMatchObject({ cycleId, attemptNo: 2, attemptsLeft: 1, passed: false });

    const finalRequestId = randomUUID();
    const sendFinal = () =>
      answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        questionId,
        finalRequestId,
        cycleId,
      );
    const nativeThird = await sendFinal();
    expect(nativeThird.status, JSON.stringify(nativeThird.body)).toBe(200);
    expect(nativeThird.body).toMatchObject({
      cycleId,
      attemptNo: 3,
      attemptsLeft: 0,
      mode: 'native',
      nativeLanguage: 'te',
    });
    expect(nativeThird.body.next).toMatchObject({ attemptsUsed: 0, attemptsLeft: 3 });
    expect(nativeThird.body.next.cycleId).not.toBe(cycleId);
    expect(nativeThird.body.next.question.id).not.toBe(questionId);

    // Completed replay wins over both the now-closed cycle and a later profile
    // change: it keeps the language that actually produced the transcript.
    await pool.query("UPDATE users SET native_language = 'hi' WHERE id = $1", [userId]);
    const replay = await sendFinal();
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(nativeThird.body);
    expect(
      (
        await pool.query<{ native_language: string }>(
          `SELECT native_language FROM assessment_requests
           WHERE user_id = $1 AND request_id = $2`,
          [userId, finalRequestId],
        )
      ).rows,
    ).toEqual([{ native_language: 'te' }]);

    const fourth = await answerForm(
      request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
      questionId,
      randomUUID(),
      cycleId,
    );
    expect(fourth.status).toBe(409);
    expect(fourth.body).toEqual({
      error: 'This practice question is no longer active',
      code: 'PRACTICE_CYCLE_CLOSED',
    });

    const persisted = await pool.query<{
      context: string;
      attempt_no: number;
      translated_transcript: string | null;
      native_language: string | null;
    }>(
      `SELECT context, attempt_no, translated_transcript, native_language
       FROM attempts WHERE user_id = $1 AND practice_cycle_id = $2
       ORDER BY attempt_no`,
      [userId, cycleId],
    );
    expect(persisted.rows.map(({ context, attempt_no }) => [context, attempt_no])).toEqual([
      ['practice-native', 1],
      ['practice', 2],
      ['practice-native', 3],
    ]);
    expect(persisted.rows[0].translated_transcript).toBe('(mock English translation)');
    expect(persisted.rows.map(({ native_language }) => native_language)).toEqual(['te', null, 'te']);

    const progress = await pool.query<{ status: string; attempt_count: number; best_score: number }>(
      `SELECT status, attempt_count, best_score FROM practice_progress
       WHERE user_id = $1 AND question_id = $2`,
      [userId, questionId],
    );
    expect(progress.rows[0]).toEqual({ status: 'learning', attempt_count: 3, best_score: 40 });

    const history = await request(a).get('/practice/history').set('Authorization', `Bearer ${token}`);
    const nativeHistory = history.body.items.find((item: { context: string }) => item.context === 'practice-native');
    expect(nativeHistory).toMatchObject({
      cycleId,
      score: null,
      passed: null,
      understood: true,
      nativeLanguage: 'te',
      translatedTranscript: '(mock English translation)',
    });

    const exported = await request(a).get('/auth/me/data').set('Authorization', `Bearer ${token}`);
    expect(exported.body.attempts.filter((item: { context: string }) => item.context === 'practice-native')).toEqual(
      expect.arrayContaining([expect.objectContaining({ nativeLanguage: 'te' })]),
    );
    expect(exported.body.practiceCycles).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: cycleId, questionId, attemptsUsed: 3, status: 'closed' })]),
    );
    expect(exported.body.practiceProgress).toEqual(
      expect.arrayContaining([expect.objectContaining({ questionId, attemptCount: 3 })]),
    );
    expect(exported.body.diagnosticState).toMatchObject({ questionsAsked: expect.any(Number) });

    const cyclePage = await request(a).get('/auth/me/data?limit=1').set('Authorization', `Bearer ${token}`);
    expect(cyclePage.body.practiceCycles).toHaveLength(1);
    expect(cyclePage.body.nextPracticeCycleCursor).toEqual(expect.any(String));
    const nextCyclePage = await request(a)
      .get(`/auth/me/data?limit=1&practiceCycleCursor=${cyclePage.body.nextPracticeCycleCursor}`)
      .set('Authorization', `Bearer ${token}`);
    expect(nextCyclePage.status).toBe(200);
    expect(nextCyclePage.body.practiceCycles[0].id).not.toBe(cyclePage.body.practiceCycles[0].id);

    const stats = await request(a)
      .get('/practice/stats?timeZone=America%2FPhoenix')
      .set('Authorization', `Bearer ${token}`);
    expect(stats.body).toMatchObject({ totalAttempts: 3, practicedToday: 3, timeZone: 'America/Phoenix' });
  });

  it('keeps silence free and reports the still-pending native attempt', async () => {
    // The provider-silence behavior is exercised with a mocked assess result in
    // practice-stuck-cases; this assertion pins the durable cycle independently.
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [
      res.body.user.id,
    ]);
    const assignment = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const cycle = await pool.query<{ attempts_used: number }>(
      'SELECT attempts_used FROM practice_cycles WHERE id = $1',
      [assignment.body.cycleId],
    );
    expect(cycle.rows[0].attempts_used).toBe(0);
  });

  it('rejects reuse of one completed requestId after the same question is assigned in another cycle', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    await completeDiagnostic(a, token);
    const assignment = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = assignment.body.question.id as string;
    const firstCycleId = assignment.body.cycleId as string;
    const requestId = randomUUID();

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
      requestId,
      firstCycleId,
    );
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ cycleId: firstCycleId, attemptNo: 1, attemptsLeft: 2 });

    await pool.query(
      `UPDATE practice_cycles
       SET status = 'closed', closed_at = now(), updated_at = now()
       WHERE id = $1`,
      [firstCycleId],
    );
    const secondCycleId = (
      await pool.query<{ id: string }>(
        `INSERT INTO practice_cycles (user_id, question_id, kind)
         VALUES ($1, $2, 'revision') RETURNING id`,
        [userId, questionId],
      )
    ).rows[0].id;

    const reused = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      questionId,
      requestId,
      secondCycleId,
    );
    expect(reused.status).toBe(409);
    expect(reused.body).toEqual({
      error: 'Assessment request identifier was already used',
      code: 'REQUEST_ID_REUSED',
    });
    const attempts = await pool.query<{ first_cycle: number; second_cycle: number }>(
      `SELECT
         count(*) FILTER (
           WHERE context = 'practice' AND practice_cycle_id = $3
         )::int AS first_cycle,
         count(*) FILTER (
           WHERE context = 'practice' AND practice_cycle_id = $4
         )::int AS second_cycle
       FROM attempts
       WHERE user_id = $1 AND question_id = $2`,
      [userId, questionId, firstCycleId, secondCycleId],
    );
    expect(attempts.rows[0]).toEqual({ first_cycle: 1, second_cycle: 0 });
  });

  it('paginates empty attempts and skipped cycles without restarting an exhausted stream', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [
      res.body.user.id,
    ]);
    const first = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    await request(a)
      .post('/practice/skip')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: first.body.question.id, cycleId: first.body.cycleId });
    const second = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    const pageOne = await request(a).get('/auth/me/data?limit=1').set('Authorization', `Bearer ${token}`);
    expect(pageOne.body).toMatchObject({
      attempts: [],
      nextCursor: null,
      attemptsDone: true,
      practiceCyclesDone: false,
      nextPracticeCycleCursor: first.body.cycleId,
    });

    const pageTwo = await request(a)
      .get(`/auth/me/data?limit=1&attemptsDone=true&practiceCycleCursor=${pageOne.body.nextPracticeCycleCursor}`)
      .set('Authorization', `Bearer ${token}`);
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.attempts).toEqual([]);
    expect(pageTwo.body.practiceCycles[0].id).toBe(second.body.cycleId);
    expect(pageTwo.body).toMatchObject({ attemptsDone: true, practiceCyclesDone: true });

    const contradictory = await request(a)
      .get(`/auth/me/data?attemptsDone=true&cursor=${randomUUID()}`)
      .set('Authorization', `Bearer ${token}`);
    expect(contradictory.status).toBe(400);
    expect(contradictory.body.error).toBe('cursor: must be omitted when attemptsDone=true');
  });
});

describe('practice statistics learner time zone', () => {
  const a = app();

  it('rejects unknown zones and counts the learner-local day across UTC midnight', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions WHERE cefr_level = $1 LIMIT 1', [
      level,
    ]);
    const cycleId = await createClosedPracticeCycle(userId, question.rows[0].id);
    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, created_at,
          practice_cycle_id)
       VALUES ($1, $2, 'practice', 1, 'answer', 60, true, 'feedback',
         (date_trunc('day', now() AT TIME ZONE 'Pacific/Kiritimati') + interval '1 hour')
           AT TIME ZONE 'Pacific/Kiritimati', $3)`,
      [userId, question.rows[0].id, cycleId],
    );

    const local = await request(a)
      .get('/practice/stats?timeZone=Pacific%2FKiritimati')
      .set('Authorization', `Bearer ${token}`);
    expect(local.status).toBe(200);
    expect(local.body).toMatchObject({ practicedToday: 1, streakDays: 1, timeZone: 'Pacific/Kiritimati' });

    const invalid = await request(a)
      .get('/practice/stats?timeZone=Definitely%2FNot_A_Zone')
      .set('Authorization', `Bearer ${token}`);
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({
      error: 'timeZone must be a valid IANA time zone',
      code: 'VALIDATION_FAILED',
    });
  });
});
