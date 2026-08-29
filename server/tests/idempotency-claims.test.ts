import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import {
  ASSESSMENT_REQUEST_COMPLETED_RETENTION_HOURS,
  AssessmentRequestInFlightError,
  abandonAssessmentRequest,
  claimAssessmentRequest as claimAssessmentRequestWithCycle,
  completeAssessmentRequest,
  getAssessmentRequestStatus,
  isAudioKeyClaimedForProcessing,
  validatedAssessmentResponse,
} from '../src/idempotency';
import { logger } from '../src/logger';
import { HttpError } from '../src/middleware';
import { assessmentResponseCases, practiceMastery } from './assessment-response-corpus';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('claimAssessmentRequest ownership and replay', () => {
  const a = app();
  let userId: string;
  let questionId: string;
  let otherQuestionId: string;
  let question: { id: string; cefrLevel: string; promptWord: string; questionText: string };
  const cycleIds = new Map<string, string>();

  async function createClosedCycle(cycleUserId: string, cycleQuestionId: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO practice_cycles
         (user_id, question_id, kind, attempts_used, status, closed_at)
       VALUES ($1, $2, 'revision', 0, 'closed', now())
       RETURNING id`,
      [cycleUserId, cycleQuestionId],
    );
    const id = rows[0].id;
    cycleIds.set(`${cycleUserId}:${cycleQuestionId}`, id);
    return id;
  }

  function claimAssessmentRequest(
    claimUserId: string,
    requestId: string,
    context: 'diagnostic' | 'practice' | 'practice-native',
    claimQuestionId: string,
    audioKey?: string,
    retainRecording = true,
  ) {
    const cycleId =
      context === 'diagnostic'
        ? undefined
        : (cycleIds.get(`${claimUserId}:${claimQuestionId}`) ?? cycleIds.get(`${userId}:${claimQuestionId}`));
    if (context !== 'diagnostic' && !cycleId) throw new Error('test fixture omitted a practice cycle');
    return claimAssessmentRequestWithCycle(
      claimUserId,
      requestId,
      context,
      claimQuestionId,
      audioKey,
      cycleId,
      retainRecording,
    );
  }

  beforeAll(async () => {
    const { res } = await registerUser(a);
    userId = res.body.user.id;
    const { rows } = await pool.query<{
      id: string;
      cefrLevel: string;
      promptWord: string;
      questionText: string;
    }>(
      `SELECT id, cefr_level AS "cefrLevel", prompt_word AS "promptWord", question_text AS "questionText"
       FROM questions ORDER BY id LIMIT 2`,
    );
    [questionId, otherQuestionId] = [rows[0].id, rows[1].id];
    question = rows[0];
    await createClosedCycle(userId, questionId);
    await createClosedCycle(userId, otherQuestionId);
  });

  function completedPracticeResponse(score = 86) {
    const cycleId = '22222222-2222-4222-8222-222222222222';
    return {
      passed: true,
      mastered: score >= 75,
      cycleId,
      attemptNo: 1,
      attemptsLeft: 0,
      score,
      transcript: 'A complete stored answer.',
      feedback: 'Clear and relevant.',
      next: {
        cycleId: '33333333-3333-4333-8333-333333333333',
        attemptsUsed: 0,
        attemptsLeft: 3,
        question: {
          id: questionId,
          cefrLevel: 'A1',
          promptWord: 'contract',
          questionText: 'Explain this contract.',
        },
        kind: 'new',
        progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 100, dueCount: 1 },
      },
    };
  }

  const retryPracticeResponse = {
    passed: false,
    mastered: false,
    cycleId: '22222222-2222-4222-8222-222222222222',
    attemptNo: 1,
    attemptsLeft: 2,
    score: 50,
    transcript: 'A retryable stored answer.',
    feedback: 'Add more detail.',
  } as const;

  const completedDiagnosticResponse = {
    passed: true,
    score: 60,
    transcript: 'A diagnostic answer.',
    feedback: 'This meets the threshold.',
    done: true,
    level: 'A1',
  } as const;

  const nativeResponse = {
    mode: 'native',
    cycleId: '22222222-2222-4222-8222-222222222222',
    attemptNo: 1,
    attemptsLeft: 2,
    understood: true,
    transcript: 'A native-language answer.',
    translatedTranscript: 'An English translation of the answer.',
    modelAnswer: 'This is a model English answer.',
    feedback: 'The answer shows understanding.',
  } as const;

  it('validates every durable assessment response context and rejects drift', () => {
    const practice = completedPracticeResponse();
    expect(validatedAssessmentResponse('diagnostic', completedDiagnosticResponse)).toBe(completedDiagnosticResponse);
    expect(validatedAssessmentResponse('practice', practice)).toBe(practice);
    expect(validatedAssessmentResponse('practice-native', nativeResponse)).toBe(nativeResponse);

    for (const [context, response] of [
      ['diagnostic', { ...completedDiagnosticResponse, passed: false }],
      ['practice', { passed: true, score: 90 }],
      ['practice-native', { ...nativeResponse, modelAnswer: '' }],
    ] as const) {
      expect(() => validatedAssessmentResponse(context, response)).toThrowError(
        expect.objectContaining({ status: 500, code: 'INTERNAL' }),
      );
    }
  });

  it('enforces the complete durable-response boundary corpus', () => {
    for (const testCase of assessmentResponseCases) {
      const validate = () => validatedAssessmentResponse(testCase.context, testCase.value as Record<string, unknown>);
      if (testCase.valid) {
        expect(validate(), testCase.name).toBe(testCase.value);
      } else {
        expect(validate, testCase.name).toThrowError(expect.objectContaining({ status: 500, code: 'INTERNAL' }));
      }
    }
  });

  it('logs only the failed response context with the stable diagnostic', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    expect(() => validatedAssessmentResponse('practice', { ...practiceMastery(), score: 74 })).toThrowError(
      expect.objectContaining({ status: 500, code: 'INTERNAL' }),
    );

    expect(error).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith(
      { context: 'practice' },
      'stored assessment response failed its public contract',
    );
    error.mockRestore();
  });

  it('refuses invalid or wrong-context response bodies before completing a claim', async () => {
    const invalidRequestId = randomUUID();
    const invalidClaim = await claimAssessmentRequest(userId, invalidRequestId, 'practice', questionId);
    if (invalidClaim.kind !== 'claimed') throw new Error('expected a fresh claim');
    await expect(
      completeAssessmentRequest(
        pool,
        userId,
        invalidRequestId,
        invalidClaim.claimId,
        { passed: true, score: 90 },
        'practice',
      ),
    ).rejects.toMatchObject({ status: 500, code: 'INTERNAL' });

    await expect(
      completeAssessmentRequest(
        pool,
        userId,
        invalidRequestId,
        invalidClaim.claimId,
        completedDiagnosticResponse,
        'diagnostic',
      ),
    ).rejects.toMatchObject({ status: 409, code: 'STATE_CHANGED' });

    const row = await pool.query<{ status: string }>(
      'SELECT status FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, invalidRequestId],
    );
    expect(row.rows).toEqual([{ status: 'processing' }]);
  });

  it('fails closed when recording completion returns no authoritative owner row', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
    };
    const recording = {
      id: randomUUID(),
      storageScope: 'practice' as const,
      audioKey: `audio-uploads/practice/${userId}/${randomUUID()}.m4a`,
      s3VersionId: 'version-1',
      contentType: 'audio/mp4',
      sizeBytes: 1234,
    };

    await expect(
      completeAssessmentRequest(
        client,
        userId,
        randomUUID(),
        randomUUID(),
        retryPracticeResponse,
        'practice',
        recording,
      ),
    ).rejects.toThrow('recording completion has no authoritative S3 audio key');
    expect(client.query).toHaveBeenCalledOnce();
  });

  it('preserves the in-flight subtype name for diagnostics', () => {
    const error = new AssessmentRequestInFlightError('Assessment is still processing', 'REQUEST_IN_FLIGHT', {
      retryAfterSeconds: 2,
    });

    expect(error.name).toBe('AssessmentRequestInFlightError');
    expect(error.code).toBe('REQUEST_IN_FLIGHT');
  });

  it('locks the user parent before an idempotency claim and maps a missing account to state changed', async () => {
    const missingUserId = randomUUID();

    await expect(claimAssessmentRequest(missingUserId, randomUUID(), 'practice', questionId)).rejects.toMatchObject({
      status: 409,
      message: 'Assessment state changed; please try again',
      code: 'STATE_CHANGED',
    });
  });

  it('rejects reuse of the same requestId for a different question or context', async () => {
    const requestId = randomUUID();
    const claim = await claimAssessmentRequest(userId, requestId, 'practice', questionId);
    expect(claim.kind).toBe('claimed');

    const differentQuestion = claimAssessmentRequest(userId, requestId, 'practice', otherQuestionId);
    await expect(differentQuestion).rejects.toBeInstanceOf(AssessmentRequestInFlightError);
    await expect(differentQuestion).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
      code: 'REQUEST_ID_REUSED',
    });
    const differentContext = claimAssessmentRequest(userId, requestId, 'diagnostic', questionId);
    await expect(differentContext).rejects.toBeInstanceOf(AssessmentRequestInFlightError);
    await expect(differentContext).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
      code: 'REQUEST_ID_REUSED',
    });
    // A different user can still use the same request UUID independently.
    const other = await registerUser(a);
    await createClosedCycle(other.res.body.user.id, questionId);
    await expect(
      claimAssessmentRequest(other.res.body.user.id, requestId, 'practice', questionId),
    ).resolves.toMatchObject({ kind: 'claimed' });
  });

  it('treats completed identifier reuse as a definitive conflict, not an in-flight owner', async () => {
    const requestId = randomUUID();
    const claim = await claimAssessmentRequest(userId, requestId, 'practice', questionId);
    if (claim.kind !== 'claimed') throw new Error('expected a fresh claim');
    await completeAssessmentRequest(pool, userId, requestId, claim.claimId, retryPracticeResponse, 'practice');

    const collision = claimAssessmentRequest(userId, requestId, 'practice', otherQuestionId);
    await expect(collision).rejects.toBeInstanceOf(HttpError);
    await expect(collision).rejects.not.toBeInstanceOf(AssessmentRequestInFlightError);
    await expect(collision).rejects.toMatchObject({
      status: 409,
      message: 'Assessment request identifier was already used',
      code: 'REQUEST_ID_REUSED',
    });
  });

  it('binds the recording-retention choice to processing and completed request identities', async () => {
    const processingRequestId = randomUUID();
    await claimAssessmentRequest(userId, processingRequestId, 'practice', questionId, undefined, false);

    const processingMismatch = claimAssessmentRequest(
      userId,
      processingRequestId,
      'practice',
      questionId,
      undefined,
      true,
    );
    await expect(processingMismatch).rejects.toBeInstanceOf(AssessmentRequestInFlightError);
    await expect(processingMismatch).rejects.toMatchObject({
      status: 409,
      code: 'REQUEST_ID_REUSED',
    });

    const completedRequestId = randomUUID();
    const completedClaim = await claimAssessmentRequest(
      userId,
      completedRequestId,
      'practice',
      questionId,
      undefined,
      false,
    );
    if (completedClaim.kind !== 'claimed') throw new Error('expected a fresh claim');
    await completeAssessmentRequest(
      pool,
      userId,
      completedRequestId,
      completedClaim.claimId,
      retryPracticeResponse,
      'practice',
    );

    await expect(
      claimAssessmentRequest(userId, completedRequestId, 'practice', questionId, undefined, false),
    ).resolves.toEqual({ kind: 'completed', response: retryPracticeResponse });
    await expect(
      claimAssessmentRequest(userId, completedRequestId, 'practice', questionId, undefined, true),
    ).rejects.toMatchObject({ status: 409, code: 'REQUEST_ID_REUSED' });
    const stored = await pool.query<{ retain_recording: boolean }>(
      `SELECT retain_recording FROM assessment_requests
       WHERE user_id = $1 AND request_id = $2`,
      [userId, completedRequestId],
    );
    expect(stored.rows[0].retain_recording).toBe(false);
  });

  it('returns 409 while a matching request is still processing', async () => {
    const requestId = randomUUID();
    await claimAssessmentRequest(userId, requestId, 'practice', questionId);
    await expect(claimAssessmentRequest(userId, requestId, 'practice', questionId)).rejects.toMatchObject({
      status: 409,
      message: 'Assessment is still processing',
      extra: { retryAfterSeconds: 2 },
    });
  });

  it('replays the stored response for a completed request', async () => {
    const withBody = randomUUID();
    const claim = await claimAssessmentRequest(userId, withBody, 'practice', questionId);
    if (claim.kind !== 'claimed') throw new Error('expected a fresh claim');
    const storedResponse = completedPracticeResponse(91);
    await completeAssessmentRequest(pool, userId, withBody, claim.claimId, storedResponse, 'practice');

    const replay = await claimAssessmentRequest(userId, withBody, 'practice', questionId);
    expect(replay).toEqual({ kind: 'completed', response: storedResponse });

    // NOTE: a completed row without a response body is rejected by the
    // assessment_requests_response_check constraint, so the corresponding
    // defensive branches in claimAssessmentRequest / getAssessmentRequestStatus
    // are not reachable through the database.
    const status = await getAssessmentRequestStatus(userId, withBody);
    expect(status).toEqual({
      status: 'completed',
      context: 'practice',
      questionId,
      cycleId: cycleIds.get(`${userId}:${questionId}`)!,
      question,
      response: storedResponse,
    });
  });

  it('retains completed claims for 48 hours before allowing the request UUID to be claimed again', async () => {
    expect(ASSESSMENT_REQUEST_COMPLETED_RETENTION_HOURS).toBe(48);

    const replayableRequestId = randomUUID();
    const replayableClaim = await claimAssessmentRequest(userId, replayableRequestId, 'practice', questionId);
    if (replayableClaim.kind !== 'claimed') throw new Error('expected a fresh claim');
    const replayableResponse = completedPracticeResponse();
    await completeAssessmentRequest(
      pool,
      userId,
      replayableRequestId,
      replayableClaim.claimId,
      replayableResponse,
      'practice',
    );
    await pool.query(
      `UPDATE assessment_requests
       SET completed_at = now() - interval '47 hours'
       WHERE user_id = $1 AND request_id = $2`,
      [userId, replayableRequestId],
    );

    await expect(claimAssessmentRequest(userId, replayableRequestId, 'practice', questionId)).resolves.toEqual({
      kind: 'completed',
      response: replayableResponse,
    });

    const expiredRequestId = randomUUID();
    const expiredClaim = await claimAssessmentRequest(userId, expiredRequestId, 'practice', questionId);
    if (expiredClaim.kind !== 'claimed') throw new Error('expected a fresh claim');
    await completeAssessmentRequest(
      pool,
      userId,
      expiredRequestId,
      expiredClaim.claimId,
      retryPracticeResponse,
      'practice',
    );
    await pool.query(
      `UPDATE assessment_requests
       SET completed_at = now() - interval '49 hours'
       WHERE user_id = $1 AND request_id = $2`,
      [userId, expiredRequestId],
    );

    const replacement = await claimAssessmentRequest(userId, expiredRequestId, 'practice', questionId);
    expect(replacement).toMatchObject({ kind: 'claimed' });
    if (replacement.kind !== 'claimed') throw new Error('expected an expired claim to be replaced');
    expect(replacement.claimId).not.toBe(expiredClaim.claimId);
  });

  it('commits and releases the transaction used to replay a completed request', async () => {
    const requestId = randomUUID();
    const response = completedPracticeResponse(88);
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [
            {
              context: 'practice',
              question_id: questionId,
              practice_cycle_id: cycleIds.get(`${userId}:${questionId}`),
              retain_recording: true,
              response_version: 2,
              status: 'completed',
              response_body: response,
            },
          ],
        })
        .mockResolvedValueOnce(undefined),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      await expect(claimAssessmentRequest(userId, requestId, 'practice', questionId)).resolves.toEqual({
        kind: 'completed',
        response,
      });

      expect(client.query.mock.calls[0][0]).toBe('BEGIN');
      expect(client.query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it.each([
    {
      label: 'a processing row that unexpectedly has a response body',
      status: 'processing',
      responseBody: { passed: true, score: 88 },
    },
    {
      label: 'a completed row that unexpectedly has no response body',
      status: 'completed',
      responseBody: null,
    },
  ] as const)('fails closed instead of replaying $label', async ({ status, responseBody }) => {
    const requestId = randomUUID();
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({ rowCount: 0 })
        .mockResolvedValueOnce({
          rows: [
            {
              context: 'practice',
              question_id: questionId,
              practice_cycle_id: cycleIds.get(`${userId}:${questionId}`),
              retain_recording: true,
              response_version: 2,
              status,
              response_body: responseBody,
            },
          ],
        })
        .mockResolvedValueOnce(undefined),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      await expect(claimAssessmentRequest(userId, requestId, 'practice', questionId)).rejects.toMatchObject({
        name: 'AssessmentRequestInFlightError',
        status: 409,
        message: 'Assessment is still processing',
      });

      expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it.each([
    {
      label: 'a processing row that unexpectedly has a response body',
      status: 'processing',
      responseBody: { passed: true, score: 88 },
    },
    {
      label: 'a completed row that unexpectedly has no response body',
      status: 'completed',
      responseBody: null,
    },
  ] as const)('reports $label as processing', async ({ status, responseBody }) => {
    const requestId = randomUUID();
    const query = vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [
        {
          context: 'practice',
          question_id: questionId,
          practice_cycle_id: cycleIds.get(`${userId}:${questionId}`),
          response_version: 2,
          status,
          response_body: responseBody,
          question_cefr_level: question.cefrLevel,
          question_prompt_word: question.promptWord,
          question_text: question.questionText,
        },
      ],
    } as never);
    try {
      await expect(getAssessmentRequestStatus(userId, requestId)).resolves.toEqual({
        status: 'processing',
        context: 'practice',
        questionId,
        cycleId: cycleIds.get(`${userId}:${questionId}`),
        question,
      });
    } finally {
      query.mockRestore();
    }
  });

  it('returns a retryable in-flight 409 when the conflicting row disappears during an insert race', async () => {
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN' || text === 'ROLLBACK') return undefined;
        if (text === 'SELECT 1 FROM users WHERE id = $1 FOR UPDATE') return { rowCount: 1 };
        if (text.includes('DELETE FROM assessment_requests')) return { rowCount: 0 };
        if (text.includes('INSERT INTO assessment_requests')) return { rowCount: 0 };
        if (text.includes('SELECT context, question_id, practice_cycle_id, retain_recording')) return { rows: [] };
        throw new Error(`unexpected query: ${text}`);
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      // The conflicting row vanished between the failed insert and the read, so
      // the identifier is immediately free: a retryable in-flight hint, not the
      // permanently burned REQUEST_ID_REUSED.
      await expect(claimAssessmentRequest(userId, randomUUID(), 'practice', questionId)).rejects.toMatchObject({
        name: 'AssessmentRequestInFlightError',
        status: 409,
        message: 'Assessment is still processing',
        code: 'REQUEST_IN_FLIGHT',
        extra: { retryAfterSeconds: 2 },
      });
      expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it('returns a retryable in-flight 409 when an audio-key conflict disappears before it can be read', async () => {
    const audioKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN' || text === 'ROLLBACK') return undefined;
        if (text === 'SELECT 1 FROM users WHERE id = $1 FOR UPDATE') return { rowCount: 1 };
        if (text.includes('DELETE FROM assessment_requests')) return { rowCount: 0 };
        if (text.includes('INSERT INTO assessment_requests')) return { rowCount: 0 };
        if (text.includes('SELECT context, question_id, practice_cycle_id, retain_recording')) return { rows: [] };
        if (text.includes('SELECT status') && text.includes('audio_key = $2')) return { rows: [] };
        throw new Error(`unexpected query: ${text}`);
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      await expect(
        claimAssessmentRequest(userId, randomUUID(), 'practice', questionId, audioKey),
      ).rejects.toMatchObject({
        name: 'AssessmentRequestInFlightError',
        status: 409,
        message: 'Assessment is still processing',
        code: 'REQUEST_IN_FLIGHT',
        extra: { retryAfterSeconds: 2 },
      });
      expect(client.query.mock.calls.map(([text]) => text)).toEqual([
        'BEGIN',
        'SELECT 1 FROM users WHERE id = $1 FOR UPDATE',
        expect.stringContaining('DELETE FROM assessment_requests'),
        expect.stringContaining('INSERT INTO assessment_requests'),
        expect.stringContaining('SELECT context, question_id, practice_cycle_id, retain_recording'),
        expect.stringContaining('SELECT status'),
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it('records the submitted audio key on the processing claim for cleanup arbitration', async () => {
    const requestId = randomUUID();
    const audioKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
    const claim = await claimAssessmentRequest(userId, requestId, 'practice', questionId, audioKey);
    if (claim.kind !== 'claimed') throw new Error('expected a fresh claim');

    const { rows } = await pool.query<{ audio_key: string | null }>(
      'SELECT audio_key FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(rows[0].audio_key).toBe(audioKey);

    // Only a live processing row for the SAME user protects the object.
    await expect(isAudioKeyClaimedForProcessing(userId, audioKey)).resolves.toBe(true);
    await expect(isAudioKeyClaimedForProcessing(randomUUID(), audioKey)).resolves.toBe(false);

    await completeAssessmentRequest(pool, userId, requestId, claim.claimId, retryPracticeResponse, 'practice');
    await expect(isAudioKeyClaimedForProcessing(userId, audioKey)).resolves.toBe(false);
    await expect(claimAssessmentRequest(userId, requestId, 'practice', questionId, audioKey)).resolves.toEqual({
      kind: 'completed',
      response: retryPracticeResponse,
    });

    // An expired processing row no longer protects the object either.
    const staleKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, started_at, audio_key, practice_cycle_id)
       VALUES ($1, $2, $3, 'practice', $4, 'processing', now() - interval '6 minutes', $5, $6)`,
      [userId, randomUUID(), randomUUID(), questionId, staleKey, cycleIds.get(`${userId}:${questionId}`)],
    );
    await expect(isAudioKeyClaimedForProcessing(userId, staleKey)).resolves.toBe(false);

    // Claims without an object key (local multipart mode) store NULL.
    const keyless = randomUUID();
    await claimAssessmentRequest(userId, keyless, 'practice', questionId);
    const keylessRow = await pool.query<{ audio_key: string | null }>(
      'SELECT audio_key FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, keyless],
    );
    expect(keylessRow.rows[0].audio_key).toBeNull();
  });

  it('binds one S3 object to one requestId across processing and completed states', async () => {
    const audioKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
    const ownerRequestId = randomUUID();
    const owner = await claimAssessmentRequest(userId, ownerRequestId, 'practice', questionId, audioKey);
    if (owner.kind !== 'claimed') throw new Error('expected a fresh owner claim');

    await expect(
      claimAssessmentRequest(userId, randomUUID(), 'practice', otherQuestionId, audioKey),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Audio upload was already submitted',
      code: 'REQUEST_ID_REUSED',
    });

    await completeAssessmentRequest(pool, userId, ownerRequestId, owner.claimId, retryPracticeResponse, 'practice');
    await expect(
      claimAssessmentRequest(userId, randomUUID(), 'diagnostic', questionId, audioKey),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Audio upload was already submitted',
      code: 'REQUEST_ID_REUSED',
    });
  });

  it('releases an abandoned audio binding and replaces a stale binding without touching another key', async () => {
    const abandonedKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
    const abandonedRequestId = randomUUID();
    const abandoned = await claimAssessmentRequest(userId, abandonedRequestId, 'practice', questionId, abandonedKey);
    if (abandoned.kind !== 'claimed') throw new Error('expected a fresh abandoned claim');
    await abandonAssessmentRequest(userId, abandonedRequestId, abandoned.claimId);

    const reboundAbandonedRequestId = randomUUID();
    await expect(
      claimAssessmentRequest(userId, reboundAbandonedRequestId, 'practice', questionId, abandonedKey),
    ).resolves.toMatchObject({ kind: 'claimed' });

    const staleKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
    const staleRequestId = randomUUID();
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, started_at, audio_key, practice_cycle_id)
       VALUES ($1, $2, $3, 'practice', $4, 'processing', now() - interval '6 minutes', $5, $6)`,
      [userId, staleRequestId, randomUUID(), questionId, staleKey, cycleIds.get(`${userId}:${questionId}`)],
    );
    const replacementRequestId = randomUUID();
    await expect(
      claimAssessmentRequest(userId, replacementRequestId, 'practice', otherQuestionId, staleKey),
    ).resolves.toMatchObject({ kind: 'claimed' });
    const bindings = await pool.query<{ request_id: string }>(
      `SELECT request_id
       FROM assessment_requests
       WHERE user_id = $1 AND audio_key = $2`,
      [userId, staleKey],
    );
    expect(bindings.rows).toEqual([{ request_id: replacementRequestId }]);
    const untouched = await pool.query<{ request_id: string }>(
      'SELECT request_id FROM assessment_requests WHERE user_id = $1 AND audio_key = $2',
      [userId, abandonedKey],
    );
    expect(untouched.rows).toEqual([{ request_id: reboundAbandonedRequestId }]);
  });

  it('rolls back and releases the claim transaction after a query failure', async () => {
    const failure = new Error('claim cleanup failed');
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN') return undefined;
        if (text === 'ROLLBACK') throw new Error('rollback failed');
        if (text === 'SELECT 1 FROM users WHERE id = $1 FOR UPDATE') return { rowCount: 1 };
        throw failure;
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      await expect(claimAssessmentRequest(userId, randomUUID(), 'practice', questionId)).rejects.toBe(failure);
      expect(client.query.mock.calls.map(([text]) => text)).toEqual([
        'BEGIN',
        'SELECT 1 FROM users WHERE id = $1 FOR UPDATE',
        expect.stringContaining('DELETE FROM assessment_requests'),
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });
});
