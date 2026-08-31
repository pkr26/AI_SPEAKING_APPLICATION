import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  type AssessmentQuestionSnapshot,
  abandonAssessmentRequest,
  claimAssessmentRequest as claimAssessmentRequestWithCycle,
  cleanupAssessmentRequests,
  completeAssessmentRequest,
  getAssessmentRequestStatus,
  isAssessmentRequestProcessing,
  validatedAssessmentResponse,
} from '../src/idempotency';
import { logger } from '../src/logger';
import { answerForm, app, pool, registerUser } from './helpers';
import { assessmentResponseCases } from './assessment-response-corpus';

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

describe('durable response corpus and claim contracts', () => {
  const a = app();
  let ownerId: string;
  let questionId: string;
  let question: AssessmentQuestionSnapshot & { id: string };
  let practiceCycleId: string;

  beforeAll(async () => {
    const owner = await registerUser(a);
    ownerId = owner.res.body.user.id;
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [ownerId]);
    question = (
      await pool.query<AssessmentQuestionSnapshot & { id: string }>(
        `SELECT id, cefr_level AS "cefrLevel", prompt_word AS "promptWord", question_text AS "questionText"
         FROM questions ORDER BY id LIMIT 1`,
      )
    ).rows[0];
    questionId = question.id;
    practiceCycleId = (
      await pool.query<{ id: string }>(
        `INSERT INTO practice_cycles (user_id, question_id, kind)
         VALUES ($1, $2, 'revision') RETURNING id`,
        [ownerId, questionId],
      )
    ).rows[0].id;
  });

  function snapshot(): AssessmentQuestionSnapshot {
    return { cefrLevel: question.cefrLevel, promptWord: question.promptWord, questionText: question.questionText };
  }

  it('accepts and rejects every durable-response corpus case exactly as specified', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      for (const testCase of assessmentResponseCases) {
        let accepted = true;
        try {
          validatedAssessmentResponse(testCase.context, structuredClone(testCase.value) as Record<string, unknown>);
        } catch {
          accepted = false;
        }
        expect(accepted, `${testCase.name}`).toBe(testCase.valid);
      }
    } finally {
      error.mockRestore();
    }
  });

  it('rejects corpus-adjacent schema drift the corpus does not spell out', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const invalid = (context: 'diagnostic' | 'practice' | 'practice-native', value: unknown) => {
      let accepted = true;
      try {
        validatedAssessmentResponse(context, structuredClone(value) as Record<string, unknown>);
      } catch {
        accepted = false;
      }
      return accepted;
    };
    try {
      // diagnostic: every level value must be a legal enum member
      for (const level of ['a1', 'A3', '', 'X1']) {
        expect(
          invalid('diagnostic', {
            passed: true,
            score: 60,
            transcript: 'An answer.',
            feedback: 'ok.',
            done: true,
            level,
          }),
          level,
        ).toBe(false);
      }
      // practice: wrong attemptsLeft arithmetic per attempt and score band
      expect(
        invalid('practice', {
          passed: false,
          mastered: false,
          cycleId: '22222222-2222-4222-8222-222222222222',
          attemptNo: 1,
          score: 59,
          transcript: 'A.',
          feedback: 'ok.',
          attemptsLeft: 2,
          finalFeedback: undefined,
          next: undefined,
          levelUp: undefined,
        }),
      ).toBe(true);
      expect(
        invalid('practice', {
          passed: false,
          mastered: false,
          cycleId: '22222222-2222-4222-8222-222222222222',
          attemptNo: 1,
          score: 59,
          transcript: 'A.',
          feedback: 'ok.',
          attemptsLeft: 1,
        }),
      ).toBe(false); // retry attemptsLeft must be exactly 2
      expect(
        invalid('practice', {
          passed: true,
          mastered: true,
          cycleId: '22222222-2222-4222-8222-222222222222',
          attemptNo: 2,
          score: 90,
          transcript: 'A.',
          feedback: 'ok.',
          attemptsLeft: 1,
          levelUp: { from: 'A1', to: 'B1' },
        }),
      ).toBe(false); // non-adjacent promotion
      // practice-native: silence keeps all-empty string fields
      expect(
        invalid('practice-native', {
          mode: 'native',
          nativeLanguage: 'te',
          cycleId: '22222222-2222-4222-8222-222222222222',
          attemptNo: 1,
          feedback: 'ok.',
          understood: false,
          transcript: '',
          translatedTranscript: 'x',
          modelAnswer: '',
          noSpeech: true,
          attemptsLeft: 3,
        }),
      ).toBe(false);
    } finally {
      error.mockRestore();
    }
  });

  it('accepts durable native responses for every supported native language and rejects others', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const accepts = (value: unknown) => {
      let ok = true;
      try {
        validatedAssessmentResponse('practice-native', structuredClone(value) as Record<string, unknown>);
      } catch {
        ok = false;
      }
      return ok;
    };
    const base = (nativeLanguage: string) => ({
      mode: 'native',
      nativeLanguage,
      cycleId: '22222222-2222-4222-8222-222222222222',
      attemptNo: 1,
      feedback: 'good content',
      understood: true,
      transcript: 'A native answer.',
      translatedTranscript: 'A translation.',
      modelAnswer: 'A model answer.',
      attemptsLeft: 2,
    });
    try {
      for (const language of ['te', 'hi', 'es', 'zh']) expect(accepts(base(language)), language).toBe(true);
      expect(accepts(base('fr'))).toBe(false);
      expect(accepts(base(''))).toBe(false);
    } finally {
      error.mockRestore();
    }
  });

  it('enforces its internal claim argument contracts', async () => {
    await expect(
      claimAssessmentRequestWithCycle(ownerId, randomUUID(), 'diagnostic', questionId, undefined, practiceCycleId),
    ).rejects.toThrow('practice assessment requests require a cycle identity and diagnostic requests must omit it');
    await expect(
      claimAssessmentRequestWithCycle(ownerId, randomUUID(), 'practice', questionId, undefined, undefined),
    ).rejects.toThrow('practice assessment requests require a cycle identity and diagnostic requests must omit it');
    await expect(
      claimAssessmentRequestWithCycle(
        ownerId,
        randomUUID(),
        'practice-native',
        questionId,
        undefined,
        practiceCycleId,
        true,
        undefined,
      ),
    ).rejects.toThrow('practice-native assessment requests require a language snapshot');
    await expect(
      claimAssessmentRequestWithCycle(
        ownerId,
        randomUUID(),
        'practice',
        questionId,
        undefined,
        practiceCycleId,
        true,
        'te',
      ),
    ).rejects.toThrow('practice-native assessment requests require a language snapshot');
    await expect(
      claimAssessmentRequestWithCycle(
        ownerId,
        randomUUID(),
        'practice',
        questionId,
        undefined,
        practiceCycleId,
        true,
        undefined,
        {
          cefrLevel: question.cefrLevel,
          promptWord: '  ',
          questionText: question.questionText,
        },
      ),
    ).rejects.toThrow('assessment requests require a valid claim-time question snapshot');
    await expect(
      claimAssessmentRequestWithCycle(
        ownerId,
        randomUUID(),
        'practice',
        questionId,
        undefined,
        practiceCycleId,
        true,
        undefined,
        {
          cefrLevel: 'A9' as never,
          promptWord: question.promptWord,
          questionText: question.questionText,
        },
      ),
    ).rejects.toThrow('assessment requests require a valid claim-time question snapshot');
  });

  it('claims, replays, and retires requests bound to one diagnostic run', async () => {
    await pool.query('DELETE FROM assessment_requests WHERE user_id = $1', [ownerId]);
    const requestId = randomUUID();
    const first = await claimAssessmentRequestWithCycle(
      ownerId,
      requestId,
      'diagnostic',
      questionId,
      undefined,
      undefined,
      false,
      undefined,
      snapshot(),
    );
    expect(first.kind).toBe('claimed');
    await pool.query('UPDATE diagnostic_state SET diagnostic_run_id = gen_random_uuid() WHERE user_id = $1', [ownerId]);
    await expect(
      claimAssessmentRequestWithCycle(
        ownerId,
        requestId,
        'diagnostic',
        questionId,
        undefined,
        undefined,
        false,
        undefined,
        snapshot(),
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
      message: 'This diagnostic answer belongs to a restarted placement; record a new answer',
    });
    await expect(getAssessmentRequestStatus(ownerId, requestId)).rejects.toMatchObject({
      status: 409,
      code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
      message: 'This diagnostic answer belongs to a restarted placement; record a new answer',
    });
  });

  it('replays completed practice rows only with their exact v2 cycle identity', async () => {
    await pool.query('DELETE FROM assessment_requests WHERE user_id = $1', [ownerId]);
    const requestId = randomUUID();
    const response = {
      passed: true,
      mastered: false,
      cycleId: '22222222-2222-4222-8222-222222222222',
      attemptNo: 1,
      attemptsLeft: 0,
      score: 70,
      transcript: 'A recovered transcript.',
      feedback: 'Clear and relevant.',
      next: {
        cycleId: '33333333-3333-4333-8333-333333333333',
        attemptsUsed: 0,
        attemptsLeft: 3,
        question: {
          id: questionId,
          cefrLevel: question.cefrLevel,
          promptWord: 'recovery',
          questionText: 'Describe a successful recovery.',
        },
        kind: 'new' as const,
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at, response_version, practice_cycle_id)
       VALUES ($1, $2, $3, 'practice', $4, 'completed', $5::jsonb, now(), 2, $6)`,
      [ownerId, requestId, randomUUID(), questionId, JSON.stringify(response), practiceCycleId],
    );
    const replay = await claimAssessmentRequestWithCycle(
      ownerId,
      requestId,
      'practice',
      questionId,
      undefined,
      practiceCycleId,
      true,
      undefined,
      snapshot(),
    );
    expect(replay.kind).toBe('completed');
    expect(replay).toMatchObject({ kind: 'completed', response });
    await expect(
      claimAssessmentRequestWithCycle(
        ownerId,
        requestId,
        'practice',
        questionId,
        undefined,
        randomUUID(),
        true,
        undefined,
        snapshot(),
      ),
    ).rejects.toMatchObject({ status: 409, code: 'REQUEST_ID_REUSED' });
    await expect(
      claimAssessmentRequestWithCycle(
        ownerId,
        requestId,
        'practice-native',
        questionId,
        undefined,
        practiceCycleId,
        true,
        'te',
        snapshot(),
      ),
    ).rejects.toMatchObject({ status: 409, code: 'REQUEST_ID_REUSED' });
  });

  it('strips a deleted recording reference from an otherwise valid replay', async () => {
    await pool.query('DELETE FROM assessment_requests WHERE user_id = $1', [ownerId]);
    await pool.query('DELETE FROM recordings WHERE user_id = $1', [ownerId]);
    const recordingId = randomUUID();
    const requestId = randomUUID();
    const response = {
      passed: false,
      mastered: false,
      recordingId,
      cycleId: '22222222-2222-4222-8222-222222222222',
      attemptNo: 1,
      attemptsLeft: 0,
      score: 40,
      transcript: 'A recovered transcript.',
      feedback: 'Clear and relevant.',
      finalFeedback: 'Final feedback text.'.repeat(4),
      next: {
        cycleId: '33333333-3333-4333-8333-333333333333',
        attemptsUsed: 0,
        attemptsLeft: 3,
        question: {
          id: questionId,
          cefrLevel: question.cefrLevel,
          promptWord: 'recovery',
          questionText: 'Describe a successful recovery.',
        },
        kind: 'new' as const,
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at, response_version, practice_cycle_id)
       VALUES ($1, $2, $3, 'practice', $4, 'completed', $5::jsonb, now(), 2, $6)`,
      [ownerId, requestId, randomUUID(), questionId, JSON.stringify(response), practiceCycleId],
    );
    await pool.query(
      `INSERT INTO recordings
         (id, user_id, request_id, question_id, context, storage_scope, audio_key, s3_version_id, content_type, size_bytes)
       VALUES ($1, $2, $3, $4, 'practice', 'practice', $5, 'v1', 'audio/mp4', 1000)`,
      [recordingId, ownerId, requestId, questionId, `audio-uploads/practice/${ownerId}/${randomUUID()}.m4a`],
    );
    const visible = await claimAssessmentRequestWithCycle(
      ownerId,
      requestId,
      'practice',
      questionId,
      undefined,
      practiceCycleId,
      true,
      undefined,
      snapshot(),
    );
    expect(visible.kind).toBe('completed');
    expect((visible as { response?: Record<string, unknown> }).response?.recordingId).toBe(recordingId);

    await pool.query('DELETE FROM recordings WHERE id = $1', [recordingId]);
    const stripped = await claimAssessmentRequestWithCycle(
      ownerId,
      requestId,
      'practice',
      questionId,
      undefined,
      practiceCycleId,
      true,
      undefined,
      snapshot(),
    );
    expect(stripped.kind).toBe('completed');
    expect((stripped as { response?: Record<string, unknown> }).response?.recordingId).toBeUndefined();
  });

  it('refuses to retain a recording whose request has no authoritative audio key', async () => {
    await pool.query('DELETE FROM assessment_requests WHERE user_id = $1', [ownerId]);
    const requestId = randomUUID();
    const claimed = await claimAssessmentRequestWithCycle(
      ownerId,
      requestId,
      'practice',
      questionId,
      undefined,
      practiceCycleId,
      true,
      undefined,
      snapshot(),
    );
    expect(claimed.kind).toBe('claimed');
    const body = {
      passed: true,
      mastered: false,
      cycleId: '22222222-2222-4222-8222-222222222222',
      attemptNo: 1,
      attemptsLeft: 0,
      score: 70,
      transcript: 'A recovered transcript.',
      feedback: 'Clear and relevant.',
      next: {
        cycleId: '33333333-3333-4333-8333-333333333333',
        attemptsUsed: 0,
        attemptsLeft: 3,
        question: {
          id: questionId,
          cefrLevel: question.cefrLevel,
          promptWord: 'recovery',
          questionText: 'Describe a successful recovery.',
        },
        kind: 'new' as const,
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
    const capture = {
      id: randomUUID(),
      storageScope: 'practice' as const,
      audioKey: `audio-uploads/practice/${ownerId}/${randomUUID()}.m4a`,
      s3VersionId: 'v1',
      contentType: 'audio/mp4',
      sizeBytes: 1000,
    };
    // Direct-mode claims carry no audio_key, so retention must fail loudly
    // instead of binding metadata to a nonexistent object.
    await expect(
      completeAssessmentRequest(
        pool as never,
        ownerId,
        requestId,
        (claimed as { claimId: string }).claimId,
        { ...body },
        'practice',
        capture,
      ),
    ).rejects.toThrow('recording completion has no authoritative S3 audio key');
    // The completion UPDATE commits before the retention guard throws, so the
    // row is durably completed without recording metadata: exactly the
    // fail-closed outcome the guard exists to produce.
    const saved = await pool.query<{ status: string }>(
      'SELECT status FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [ownerId, requestId],
    );
    expect(saved.rows[0].status).toBe('completed');
  });

  it('rejects a diagnostic claim when the run state row vanished with the exact contract', async () => {
    const owner = await registerUser(a);
    const userId = owner.res.body.user.id;
    await pool.query('DELETE FROM diagnostic_state WHERE user_id = $1', [userId]);
    const rejected = claimAssessmentRequestWithCycle(
      userId,
      randomUUID(),
      'diagnostic',
      questionId,
      undefined,
      undefined,
      false,
      undefined,
      snapshot(),
    );
    await expect(rejected).rejects.toMatchObject({
      status: 409,
      message: 'Assessment state changed; please try again',
      code: 'STATE_CHANGED',
    });
  });
});

describe('claim snapshot schema and durable claim row contracts', () => {
  const a = app();
  let ownerId: string;
  let firstQuestionId: string;
  let secondQuestionId: string;
  let practiceCycleId: string;

  beforeAll(async () => {
    const owner = await registerUser(a);
    ownerId = owner.res.body.user.id;
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [ownerId]);
    const questions = await pool.query<{ id: string }>(
      `SELECT id FROM questions WHERE cefr_level = 'A1' ORDER BY id LIMIT 2`,
    );
    firstQuestionId = questions.rows[0].id;
    secondQuestionId = questions.rows[1].id;
    practiceCycleId = (
      await pool.query<{ id: string }>(
        `INSERT INTO practice_cycles (user_id, question_id, kind)
         VALUES ($1, $2, 'revision') RETURNING id`,
        [ownerId, firstQuestionId],
      )
    ).rows[0].id;
  });

  function snapshotFor(overrides: Partial<AssessmentQuestionSnapshot> = {}): AssessmentQuestionSnapshot {
    return { cefrLevel: 'A1', promptWord: 'snapshot', questionText: 'A claim-time snapshot body.', ...overrides };
  }

  async function claimPractice(
    requestId: string,
    snapshot: AssessmentQuestionSnapshot,
    options: { questionId?: string; retainRecording?: boolean } = {},
  ) {
    return claimAssessmentRequestWithCycle(
      ownerId,
      requestId,
      'practice',
      options.questionId ?? firstQuestionId,
      undefined,
      practiceCycleId,
      options.retainRecording,
      undefined,
      snapshot,
    );
  }

  it('claims with a valid question snapshot for every CEFR level', async () => {
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const) {
      const claim = await claimPractice(randomUUID(), snapshotFor({ cefrLevel: level }));
      expect(claim, level).toEqual({ kind: 'claimed', claimId: expect.any(String) });
    }
  });

  it('accepts snapshot boundary lengths and rejects blank or oversized snapshot fields', async () => {
    await expect(claimPractice(randomUUID(), snapshotFor({ promptWord: 'a'.repeat(100) }))).resolves.toMatchObject({
      kind: 'claimed',
    });
    await expect(claimPractice(randomUUID(), snapshotFor({ questionText: 'b'.repeat(1_000) }))).resolves.toMatchObject({
      kind: 'claimed',
    });
    for (const invalid of [
      snapshotFor({ promptWord: 'a'.repeat(101) }),
      snapshotFor({ questionText: 'b'.repeat(1_001) }),
      snapshotFor({ promptWord: '  ' }),
      snapshotFor({ questionText: ' \t ' }),
    ]) {
      await expect(claimPractice(randomUUID(), invalid), JSON.stringify(invalid)).rejects.toThrow(
        'assessment requests require a valid claim-time question snapshot',
      );
    }
  });

  it('claims a native practice request for every supported native language', async () => {
    for (const language of ['te', 'hi', 'es', 'zh'] as const) {
      const claim = await claimAssessmentRequestWithCycle(
        ownerId,
        randomUUID(),
        'practice-native',
        firstQuestionId,
        undefined,
        practiceCycleId,
        true,
        language,
        snapshotFor(),
      );
      expect(claim, language).toEqual({ kind: 'claimed', claimId: expect.any(String) });
    }
  });

  it('persists the claim-time retention default and the exact native language snapshot', async () => {
    // Omitting the retention argument must fall back to true (the pre-choice
    // client contract), while an explicit false is stored verbatim.
    const defaultRequestId = randomUUID();
    const defaulted = await claimAssessmentRequestWithCycle(
      ownerId,
      defaultRequestId,
      'practice',
      firstQuestionId,
      undefined,
      practiceCycleId,
      undefined,
      undefined,
      snapshotFor(),
    );
    expect(defaulted).toMatchObject({ kind: 'claimed' });

    const explicitRequestId = randomUUID();
    const explicit = await claimPractice(explicitRequestId, snapshotFor(), { retainRecording: false });
    expect(explicit).toMatchObject({ kind: 'claimed' });

    // The claim's language snapshot wins over the profile default (the
    // registered profile is 'te', so grading 'hi' must be the stored value).
    const nativeRequestId = randomUUID();
    const native = await claimAssessmentRequestWithCycle(
      ownerId,
      nativeRequestId,
      'practice-native',
      firstQuestionId,
      undefined,
      practiceCycleId,
      true,
      'hi',
      snapshotFor(),
    );
    expect(native).toMatchObject({ kind: 'claimed' });

    const stored = await pool.query<{ request_id: string; retain_recording: boolean; native_language: string | null }>(
      `SELECT request_id::text, retain_recording, native_language
       FROM assessment_requests
       WHERE user_id = $1 AND request_id = ANY($2::uuid[])
       ORDER BY request_id`,
      [ownerId, [defaultRequestId, explicitRequestId, nativeRequestId]],
    );
    expect(stored.rows).toEqual(
      [
        { request_id: defaultRequestId, retain_recording: true, native_language: null },
        { request_id: explicitRequestId, retain_recording: false, native_language: null },
        { request_id: nativeRequestId, retain_recording: true, native_language: 'hi' },
      ].sort((left, right) => left.request_id.localeCompare(right.request_id)),
    );
  });

  it('answers a reused identifier that names a different question with REQUEST_ID_REUSED', async () => {
    const requestId = randomUUID();
    const completed = {
      passed: true,
      mastered: false,
      cycleId: '22222222-2222-4222-8222-222222222222',
      attemptNo: 1,
      attemptsLeft: 0,
      score: 70,
      transcript: 'A recovered transcript.',
      feedback: 'Clear and relevant.',
      next: {
        cycleId: '33333333-3333-4333-8333-333333333333',
        attemptsUsed: 0,
        attemptsLeft: 3,
        question: {
          id: firstQuestionId,
          cefrLevel: 'A1',
          promptWord: 'recovery',
          questionText: 'Describe a successful recovery.',
        },
        kind: 'new' as const,
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at, response_version, practice_cycle_id)
       VALUES ($1, $2, $3, 'practice', $4, 'completed', $5::jsonb, now(), 2, $6)`,
      [ownerId, requestId, randomUUID(), firstQuestionId, JSON.stringify(completed), practiceCycleId],
    );

    await expect(claimPractice(requestId, snapshotFor(), { questionId: secondQuestionId })).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
      code: 'REQUEST_ID_REUSED',
    });
  });

  it('answers a practice claim over a diagnostic row with REQUEST_ID_REUSED, not a run retirement', async () => {
    const requestId = randomUUID();
    const diagnosticResponse = {
      passed: false,
      score: 0,
      transcript: '',
      feedback: 'No speech was detected.',
      noSpeech: true,
      done: false,
      nextQuestion: {
        id: firstQuestionId,
        cefrLevel: 'A1',
        promptWord: 'recovery',
        questionText: 'Describe a successful recovery.',
      },
    };
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at, response_version,
          practice_cycle_id, diagnostic_run_id)
       VALUES ($1, $2, $3, 'diagnostic', $4, 'completed', $5::jsonb, now(), 2, NULL, $6)`,
      [ownerId, requestId, randomUUID(), firstQuestionId, JSON.stringify(diagnosticResponse), randomUUID()],
    );

    await expect(claimPractice(requestId, snapshotFor())).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
      code: 'REQUEST_ID_REUSED',
    });
  });
});

describe('durable response arithmetic contracts', () => {
  const uuid = '22222222-2222-4222-8222-222222222222';
  const nextUuid = '33333333-3333-4333-8333-333333333333';
  const questionId = '00000000-0000-4000-8000-000000000001';

  function accepted(context: 'diagnostic' | 'practice' | 'practice-native', value: Record<string, unknown>) {
    let valid = true;
    try {
      validatedAssessmentResponse(context, structuredClone(value));
    } catch {
      valid = false;
    }
    return valid;
  }

  function retryBody(attemptNo: number, attemptsLeft: number) {
    return {
      passed: false,
      mastered: false,
      cycleId: uuid,
      attemptNo,
      attemptsLeft,
      score: 40,
      transcript: 'A retry answer.',
      feedback: 'Try again.',
    };
  }

  function silenceBody(attemptNo: number, attemptsLeft: number) {
    return {
      passed: false,
      mastered: false,
      cycleId: uuid,
      attemptNo,
      attemptsLeft,
      score: 0,
      transcript: '',
      noSpeech: true,
      feedback: 'No speech was detected.',
    };
  }

  function nativeSilenceBody(attemptNo: number, attemptsLeft: number) {
    return {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: uuid,
      attemptNo,
      attemptsLeft,
      understood: false,
      transcript: '',
      translatedTranscript: '',
      modelAnswer: '',
      noSpeech: true,
      feedback: 'No speech was detected.',
    };
  }

  function terminalBody(attemptsUsed: number, attemptsLeft: number) {
    return {
      passed: false,
      mastered: false,
      cycleId: uuid,
      attemptNo: 3,
      attemptsLeft: 0,
      score: 40,
      transcript: 'A final failed answer.',
      feedback: 'Try again.',
      finalFeedback: 'Final feedback text.'.repeat(4),
      next: {
        cycleId: nextUuid,
        attemptsUsed,
        attemptsLeft,
        question: {
          id: questionId,
          cefrLevel: 'A1',
          promptWord: 'recovery',
          questionText: 'Describe a successful recovery.',
        },
        kind: 'new' as const,
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
  }

  it('judges retry, silence, and native silence attempt arithmetic exactly', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      expect(accepted('practice', retryBody(1, 2))).toBe(true);
      expect(accepted('practice', retryBody(2, 1))).toBe(true);
      expect(accepted('practice', retryBody(1, 3))).toBe(false);
      expect(accepted('practice', retryBody(3, 0))).toBe(false);

      expect(accepted('practice', silenceBody(2, 2))).toBe(true);
      expect(accepted('practice', silenceBody(2, 3))).toBe(false);

      expect(accepted('practice-native', nativeSilenceBody(2, 2))).toBe(true);
      expect(accepted('practice-native', nativeSilenceBody(2, 3))).toBe(false);
    } finally {
      error.mockRestore();
    }
  });

  it('judges the next-question attempts budget arithmetic exactly', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      expect(accepted('practice', terminalBody(0, 3))).toBe(true);
      expect(accepted('practice', terminalBody(1, 2))).toBe(true);
      expect(accepted('practice', terminalBody(2, 1))).toBe(true);
      expect(accepted('practice', terminalBody(1, 3))).toBe(false);
      expect(accepted('practice', terminalBody(0, 2))).toBe(false);
      expect(accepted('practice', terminalBody(3, 0))).toBe(false);
    } finally {
      error.mockRestore();
    }
  });
});
