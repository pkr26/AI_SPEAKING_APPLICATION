import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  type AssessmentQuestionSnapshot,
  abandonAssessmentRequest,
  claimAssessmentRequest as claimAssessmentRequestWithCycle,
  cleanupAssessmentRequests,
  completeAssessmentRequest,
  isAssessmentRequestProcessing,
} from '../src/idempotency';
import { answerForm, app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('assessment request recovery', () => {
  const a = app();
  let ownerId: string;
  let ownerToken: string;
  let outsiderToken: string;
  let questionId: string;
  let question: AssessmentQuestionSnapshot & { id: string };
  let practiceCycleId: string;

  beforeAll(async () => {
    const owner = await registerUser(a);
    const outsider = await registerUser(a);
    expect(owner.res.status).toBe(201);
    expect(outsider.res.status).toBe(201);
    ownerId = owner.res.body.user.id;
    ownerToken = owner.res.body.token;
    outsiderToken = outsider.res.body.token;
    question = (
      await pool.query<AssessmentQuestionSnapshot & { id: string }>(
        `SELECT id, cefr_level AS "cefrLevel", prompt_word AS "promptWord", question_text AS "questionText"
         FROM questions ORDER BY id LIMIT 1`,
      )
    ).rows[0];
    questionId = question.id;
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [ownerId]);
    practiceCycleId = (
      await pool.query<{ id: string }>(
        `INSERT INTO practice_cycles
           (user_id, question_id, kind, attempts_used, status, closed_at)
         VALUES ($1, $2, 'revision', 0, 'closed', now())
         RETURNING id`,
        [ownerId, questionId],
      )
    ).rows[0].id;
  });

  async function insertRequest(
    requestId: string,
    options: {
      status?: 'processing' | 'completed';
      startedAt?: string;
      completedAt?: string;
      response?: Record<string, unknown>;
      claimId?: string;
      context?: 'diagnostic' | 'practice' | 'practice-native';
      responseVersion?: 1 | 2;
      practiceCycleId?: string | null;
    } = {},
  ) {
    const status = options.status ?? 'processing';
    const response = options.response ?? null;
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, response_body,
          started_at, completed_at, response_version, practice_cycle_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz, $9::timestamptz, $10, $11)`,
      [
        ownerId,
        requestId,
        options.claimId ?? randomUUID(),
        options.context ?? 'practice',
        questionId,
        status,
        response ? JSON.stringify(response) : null,
        options.startedAt ?? new Date().toISOString(),
        options.completedAt ?? null,
        options.responseVersion ?? 2,
        options.practiceCycleId === undefined ? practiceCycleId : options.practiceCycleId,
      ],
    );
  }

  function completedPracticeResponse(score = 80) {
    return {
      passed: true,
      mastered: score >= 75,
      cycleId: '22222222-2222-4222-8222-222222222222',
      attemptNo: 1,
      attemptsLeft: 0,
      score,
      transcript: 'A recovered transcript.',
      feedback: 'Clear and relevant.',
      next: {
        cycleId: '33333333-3333-4333-8333-333333333333',
        attemptsUsed: 0,
        attemptsLeft: 3,
        question: {
          id: questionId,
          cefrLevel: 'A1',
          promptWord: 'recovery',
          questionText: 'Describe a successful recovery.',
        },
        kind: 'new',
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
  }

  it("requires authentication and does not reveal another user's request", async () => {
    const requestId = randomUUID();
    await insertRequest(requestId);

    const anonymous = await request(a).get(`/assessments/${requestId}`);
    expect(anonymous.status).toBe(401);

    const foreign = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${outsiderToken}`);
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual({ error: 'Assessment request not found', code: 'NOT_FOUND' });
  });

  it('rejects a malformed request UUID with 400', async () => {
    const response = await request(a).get('/assessments/not-a-uuid').set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('requestId must be a valid UUID');
  });

  it('returns the processing state for a live request', async () => {
    const requestId = randomUUID();
    await insertRequest(requestId);

    const response = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'processing',
      context: 'practice',
      questionId,
      cycleId: practiceCycleId,
      question,
    });
  });

  it('returns the exact claim-time question snapshot after the catalog changes', async () => {
    const requestId = randomUUID();
    const originalQuestion = {
      cefrLevel: question.cefrLevel,
      promptWord: question.promptWord,
      questionText: question.questionText,
    };
    const revisedPrompt = `revised-${randomUUID().slice(0, 8)}`;
    const revisedText = 'This wording was published after the route loaded its grading context.';
    try {
      await pool.query('UPDATE questions SET prompt_word = $2, question_text = $3 WHERE id = $1', [
        questionId,
        revisedPrompt,
        revisedText,
      ]);
      const claim = await claimAssessmentRequestWithCycle(
        ownerId,
        requestId,
        'practice',
        questionId,
        undefined,
        practiceCycleId,
        true,
        undefined,
        originalQuestion,
      );
      expect(claim.kind).toBe('claimed');

      const status = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${ownerToken}`);
      expect(status.status).toBe(200);
      expect(status.body).toMatchObject({ status: 'processing', question: { id: questionId, ...originalQuestion } });
      expect(status.body.question).not.toMatchObject({ promptWord: revisedPrompt, questionText: revisedText });
      expect(
        (
          await pool.query(
            `SELECT question_cefr_level, question_prompt_word, question_text
             FROM assessment_requests WHERE user_id = $1 AND request_id = $2`,
            [ownerId, requestId],
          )
        ).rows,
      ).toEqual([
        {
          question_cefr_level: originalQuestion.cefrLevel,
          question_prompt_word: originalQuestion.promptWord,
          question_text: originalQuestion.questionText,
        },
      ]);
    } finally {
      await pool.query('DELETE FROM assessment_requests WHERE user_id = $1 AND request_id = $2', [ownerId, requestId]);
      await pool.query('UPDATE questions SET prompt_word = $2, question_text = $3 WHERE id = $1', [
        questionId,
        originalQuestion.promptWord,
        originalQuestion.questionText,
      ]);
    }
  });

  it('returns a null cycle with the original question for a diagnostic request', async () => {
    const requestId = randomUUID();
    await insertRequest(requestId, { context: 'diagnostic', practiceCycleId: null });

    const response = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'processing',
      context: 'diagnostic',
      questionId,
      cycleId: null,
      question,
    });
  });

  it('replays a completed response privately without cache storage', async () => {
    const requestId = randomUUID();
    const storedResponse = completedPracticeResponse(88);
    await insertRequest(requestId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      response: storedResponse,
    });

    const response = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.body).toEqual({
      status: 'completed',
      context: 'practice',
      questionId,
      cycleId: practiceCycleId,
      question,
      response: storedResponse,
    });
  });

  it('fails closed when completed JSONB does not satisfy its context response contract', async () => {
    const requestId = randomUUID();
    await insertRequest(requestId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      response: { passed: true, score: 90 },
    });

    const response = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Stored assessment response is invalid', code: 'INTERNAL' });
  });

  it.each([
    {
      label: 'practice',
      context: 'practice' as const,
      endpoint: '/practice/attempt',
      cycleId: (): string | null => practiceCycleId,
      response: {
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 50,
        transcript: 'legacy practice speech',
        feedback: 'Try again.',
      },
    },
    {
      label: 'native practice',
      context: 'practice-native' as const,
      endpoint: '/practice/attempt/native',
      cycleId: (): string | null => practiceCycleId,
      response: {
        mode: 'native',
        understood: true,
        transcript: 'legacy native speech',
        modelAnswer: 'A model answer.',
        feedback: 'Understood.',
      },
    },
    {
      label: 'silent diagnostic',
      context: 'diagnostic' as const,
      endpoint: '/diagnostic/answer',
      cycleId: (): string | null => null,
      response: {
        passed: false,
        score: 0,
        transcript: '',
        feedback: 'No speech was detected.',
        done: false,
        nextQuestion: {
          id: '00000000-0000-4000-8000-000000000001',
          cefrLevel: 'A1',
          promptWord: 'legacy',
          questionText: 'Describe a legacy answer.',
        },
      },
    },
  ])('keeps an incompatible legacy $label response as a non-spending replay tombstone', async (testCase) => {
    const requestId = randomUUID();
    await insertRequest(requestId, {
      context: testCase.context,
      status: 'completed',
      completedAt: new Date().toISOString(),
      response: testCase.response,
      responseVersion: 1,
      practiceCycleId: null,
    });
    const beforeAttempts = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM attempts WHERE user_id = $1',
      [ownerId],
    );
    const beforeUsage = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM assessment_usage WHERE user_id = $1',
      [ownerId],
    );
    const expectedError = {
      error: 'This saved assessment result was created by an older app version; start a new answer',
      code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
    };

    const status = await request(a).get(`/assessments/${requestId}`).set('Authorization', `Bearer ${ownerToken}`);
    expect(status.status).toBe(409);
    expect(status.body).toEqual(expectedError);

    const replay = await answerForm(
      request(a).post(testCase.endpoint).set('Authorization', `Bearer ${ownerToken}`),
      questionId,
      requestId,
      testCase.cycleId(),
    );
    expect(replay.status).toBe(409);
    expect(replay.body).toEqual(expectedError);

    const afterAttempts = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM attempts WHERE user_id = $1',
      [ownerId],
    );
    const afterUsage = await pool.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM assessment_usage WHERE user_id = $1',
      [ownerId],
    );
    expect(afterAttempts.rows[0].n).toBe(beforeAttempts.rows[0].n);
    expect(afterUsage.rows[0].n).toBe(beforeUsage.rows[0].n);
    await expect(
      pool.query(
        `SELECT 1 FROM assessment_requests
         WHERE user_id = $1 AND request_id = $2 AND response_version = 1 AND status = 'completed'`,
        [ownerId, requestId],
      ),
    ).resolves.toMatchObject({ rowCount: 1 });
  });

  it('uses the status-specific retention timestamp when deciding whether a request is recoverable', async () => {
    const staleProcessingId = randomUUID();
    await insertRequest(staleProcessingId, {
      startedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    });
    const staleProcessing = await request(a)
      .get(`/assessments/${staleProcessingId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(staleProcessing.status).toBe(404);

    const recentlyCompletedId = randomUUID();
    await insertRequest(recentlyCompletedId, {
      status: 'completed',
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      response: completedPracticeResponse(),
    });
    const recentlyCompleted = await request(a)
      .get(`/assessments/${recentlyCompletedId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(recentlyCompleted.status).toBe(200);
    expect(recentlyCompleted.body.status).toBe('completed');

    const expiredCompletedId = randomUUID();
    await insertRequest(expiredCompletedId, {
      status: 'completed',
      completedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
      response: { passed: true, score: 90 },
    });
    const expiredCompleted = await request(a)
      .get(`/assessments/${expiredCompletedId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(expiredCompleted.status).toBe(404);
  });

  it('prevents a stale worker from abandoning or completing a replacement claim', async () => {
    const requestId = randomUUID();
    const staleClaimId = randomUUID();
    await insertRequest(requestId, {
      claimId: staleClaimId,
      startedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    });

    const replacement = await claimAssessmentRequestWithCycle(
      ownerId,
      requestId,
      'practice',
      questionId,
      undefined,
      practiceCycleId,
      true,
      undefined,
      {
        cefrLevel: question.cefrLevel,
        promptWord: question.promptWord,
        questionText: question.questionText,
      },
    );
    expect(replacement.kind).toBe('claimed');
    if (replacement.kind !== 'claimed') throw new Error('expected a replacement claim');
    expect(replacement.claimId).not.toBe(staleClaimId);

    await abandonAssessmentRequest(ownerId, requestId, staleClaimId);
    await expect(
      completeAssessmentRequest(pool, ownerId, requestId, staleClaimId, completedPracticeResponse(), 'practice'),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request ownership changed; please retry',
      code: 'STATE_CHANGED',
    });

    const stillOwned = await pool.query<{ claim_id: string; status: string }>(
      'SELECT claim_id, status FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [ownerId, requestId],
    );
    expect(stillOwned.rows).toEqual([{ claim_id: replacement.claimId, status: 'processing' }]);

    const storedResponse = completedPracticeResponse(91);
    await completeAssessmentRequest(pool, ownerId, requestId, replacement.claimId, storedResponse, 'practice');
    await abandonAssessmentRequest(ownerId, requestId, staleClaimId);

    const completed = await pool.query<{ claim_id: string; status: string; response_body: Record<string, unknown> }>(
      `SELECT claim_id, status, response_body
       FROM assessment_requests WHERE user_id = $1 AND request_id = $2`,
      [ownerId, requestId],
    );
    expect(completed.rows).toEqual([
      { claim_id: replacement.claimId, status: 'completed', response_body: storedResponse },
    ]);
  });

  it('identifies only live processing ownership and removes exactly expired requests', async () => {
    await pool.query('DELETE FROM assessment_requests');
    const liveProcessingId = randomUUID();
    const staleProcessingId = randomUUID();
    const recentCompletedId = randomUUID();
    const expiredCompletedId = randomUUID();

    await insertRequest(liveProcessingId);
    await insertRequest(staleProcessingId, {
      startedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    });
    await insertRequest(recentCompletedId, {
      status: 'completed',
      completedAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      response: { passed: true, score: 80 },
    });
    await insertRequest(expiredCompletedId, {
      status: 'completed',
      completedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
      response: { passed: false, score: 40 },
    });

    await expect(isAssessmentRequestProcessing(ownerId, liveProcessingId)).resolves.toBe(true);
    await expect(isAssessmentRequestProcessing(ownerId, staleProcessingId)).resolves.toBe(false);
    await expect(isAssessmentRequestProcessing(ownerId, recentCompletedId)).resolves.toBe(false);
    await expect(isAssessmentRequestProcessing(randomUUID(), liveProcessingId)).resolves.toBe(false);

    await expect(cleanupAssessmentRequests()).resolves.toBe(2);
    const remaining = await pool.query<{ request_id: string }>(
      'SELECT request_id FROM assessment_requests ORDER BY request_id',
    );
    expect(remaining.rows.map((row) => row.request_id).sort()).toEqual([liveProcessingId, recentCompletedId].sort());
  });

  it('skips the replay-janitor tick while another replica holds its advisory lock', async () => {
    await pool.query('DELETE FROM assessment_requests');
    await insertRequest(randomUUID(), {
      startedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    });
    const rival = await pool.connect();
    try {
      const locked = await rival.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock(hashtext('janitor:assessment-requests')) AS locked",
      );
      expect(locked.rows[0].locked).toBe(true);
      await expect(cleanupAssessmentRequests()).resolves.toBe(0);

      await rival.query("SELECT pg_advisory_unlock(hashtext('janitor:assessment-requests'))");
      await expect(cleanupAssessmentRequests()).resolves.toBe(1);
    } finally {
      rival.release();
    }
  });
});
