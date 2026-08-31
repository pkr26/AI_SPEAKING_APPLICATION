import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { validatedAssessmentResponse } from '../src/idempotency';
import { logger } from '../src/logger';
import { assessmentResponseCases, type ResponseContext } from './assessment-response-corpus';
import { answerForm, app, completeDiagnostic, createClosedPracticeCycle, pool, registerUser } from './helpers';

const providerMocks = vi.hoisted(() => ({
  speaking: vi.fn(),
  native: vi.fn(),
}));

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return {
    ...actual,
    assessSpeaking: providerMocks.speaking,
    assessNativeComprehension: providerMocks.native,
  };
});

interface FrontendParsers {
  parseAudioUploadGrant(value: unknown): unknown;
  parseAttemptResult(value: unknown): unknown;
  parseAuthResponse(value: unknown): unknown;
  parseDiagnosticAnswerResult(value: unknown): unknown;
  parseDiagnosticNext(value: unknown): unknown;
  parseHelpContent(value: unknown): unknown;
  parseNativeAttemptResult(value: unknown): unknown;
  parsePracticeHistory(value: unknown): unknown;
  parsePracticeQuestion(value: unknown): unknown;
  parsePracticeStats(value: unknown): unknown;
  parseUserDataPage(value: unknown): unknown;
  parseUserResponse(value: unknown): unknown;
}

interface FrontendReplayParser {
  /** Structural subset of PendingAssessment the recovery parser actually reads. */
  parseAssessmentReplayStatus(
    value: unknown,
    pending: { endpoint: string; questionId: string; cycleId?: string },
  ): unknown;
}

let frontend: FrontendParsers;
let frontendReplay: FrontendReplayParser;

beforeAll(async () => {
  // Keep these as runtime imports: the contract test intentionally executes the
  // app's real, pure response parsers without making the server TypeScript build
  // own or compile frontend source. assessment-replay.ts is importable the same
  // way because its runtime graph (params/types) is pure — unlike api.ts, whose
  // expo/react-native module graph only executes under the app's own test runner.
  frontend = (await vi.importActual('../../app/src/lib/types')) as FrontendParsers;
  frontendReplay = (await vi.importActual('../../app/src/lib/assessment-replay')) as FrontendReplayParser;
});

beforeEach(() => {
  providerMocks.speaking.mockReset().mockResolvedValue({
    transcript: 'A clear contract-test answer.',
    score: 80,
    passed: true,
    feedback: 'Clear and relevant.',
  });
  providerMocks.native.mockReset().mockResolvedValue({
    mode: 'native',
    understood: true,
    transcript: 'నేను ప్రశ్నను అర్థం చేసుకున్నాను.',
    modelAnswer: 'I understood the question and answered it clearly.',
    feedback: 'You understood the question.',
  });
});

afterAll(async () => {
  await pool.end();
});

function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

function expectEmpty204(response: { status: number; text: string }): void {
  expect(response.status).toBe(204);
  expect(response.text).toBe('');
}

async function registerAndParse(a: Express) {
  const registration = await registerUser(a);
  expect(registration.res.status).toBe(201);
  expect(registration.res.body.user).toMatchObject({ nativeLanguage: 'te', uiLanguage: 'en' });
  expect(() => frontend.parseAuthResponse(registration.res.body)).not.toThrow();
  return {
    id: registration.res.body.user.id as string,
    email: registration.body.email as string,
    password: registration.body.password as string,
    token: registration.res.body.token as string,
  };
}

function accepts(run: () => unknown): boolean {
  try {
    run();
    return true;
  } catch {
    return false;
  }
}

function parseAppAssessment(context: ResponseContext, value: unknown): unknown {
  switch (context) {
    case 'diagnostic':
      return frontend.parseDiagnosticAnswerResult(value);
    case 'practice':
      return frontend.parseAttemptResult(value);
    case 'practice-native':
      return frontend.parseNativeAttemptResult(value);
  }
}

/**
 * Extract the quoted members of one authored literal (`what` names it for
 * failures). Used where a definition is compile-time-only or lives in app
 * source whose module graph cannot execute outside the app's own test runner;
 * the literal text is exactly what each side ships, so reading it from source
 * binds the same artifact an import would.
 */
function quotedLiterals(source: string, startMarker: string, endMarker: string, what: string): string[] {
  const start = source.indexOf(startMarker);
  expect(
    start,
    `${what}: start marker not found; update this contract test's extraction markers`,
  ).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start);
  expect(end, `${what}: end marker not found; update this contract test's extraction markers`).toBeGreaterThan(start);
  return [...source.slice(start, end).matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

describe('real API responses satisfy the mobile app parsers', () => {
  it('keeps every durable-response corpus case in exact server/app acceptance parity', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    for (const testCase of assessmentResponseCases) {
      const serverAccepted = accepts(() =>
        validatedAssessmentResponse(testCase.context, testCase.value as Record<string, unknown>),
      );
      const appAccepted = accepts(() => parseAppAssessment(testCase.context, testCase.value));

      expect(serverAccepted, `${testCase.name}: server`).toBe(testCase.valid);
      expect(appAccepted, `${testCase.name}: app`).toBe(testCase.valid);
      expect(serverAccepted, `${testCase.name}: parity`).toBe(appAccepted);
    }
    error.mockRestore();
  });

  it('keeps auth, profile, password, direct-upload, and empty-204 contracts aligned', async () => {
    const a = app();
    const user = await registerAndParse(a);

    const login = await request(a).post('/auth/login').send({ email: user.email, password: user.password });
    expect(login.status).toBe(200);
    expect(() => frontend.parseAuthResponse(login.body)).not.toThrow();

    const me = await request(a).get('/auth/me').set(bearer(user.token));
    expect(me.status).toBe(200);
    expect(() => frontend.parseUserResponse(me.body)).not.toThrow();

    const profile = await request(a)
      .patch('/auth/me')
      .set(bearer(user.token))
      .send({ name: 'Contract Learner', nativeLanguage: 'hi', uiLanguage: 'es' });
    expect(profile.status).toBe(200);
    expect(profile.body.user).toMatchObject({ nativeLanguage: 'hi', uiLanguage: 'es' });
    expect(() => frontend.parseUserResponse(profile.body)).not.toThrow();

    const grant = await request(a)
      .post('/uploads/audio-url')
      .set(bearer(user.token))
      .send({ contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/answer' });
    expect(grant.status).toBe(200);
    expect(() => frontend.parseAudioUploadGrant(grant.body)).not.toThrow();

    const forgot = await request(a).post('/auth/forgot-password').send({ email: user.email });
    expectEmpty204(forgot);

    const resetToken = 'contract-reset-token';
    const resetHash = createHash('sha256').update(resetToken).digest('hex');
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '30 minutes')
       ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at`,
      [user.id, resetHash],
    );
    const resetPassword = 'resetpass123';
    const reset = await request(a)
      .post('/auth/reset-password')
      .send({ email: user.email, token: resetToken, newPassword: resetPassword });
    expectEmpty204(reset);

    const loginAfterReset = await request(a).post('/auth/login').send({ email: user.email, password: resetPassword });
    expect(loginAfterReset.status).toBe(200);
    expect(() => frontend.parseAuthResponse(loginAfterReset.body)).not.toThrow();

    const changedPassword = 'changedpass456';
    const changed = await request(a)
      .post('/auth/change-password')
      .set(bearer(loginAfterReset.body.token as string))
      .send({ currentPassword: resetPassword, newPassword: changedPassword });
    expect(changed.status).toBe(200);
    expect(() => frontend.parseAuthResponse(changed.body)).not.toThrow();

    const logout = await request(a)
      .post('/auth/logout')
      .set(bearer(changed.body.token as string));
    expectEmpty204(logout);

    const loginForDelete = await request(a).post('/auth/login').send({ email: user.email, password: changedPassword });
    expect(loginForDelete.status).toBe(200);
    expect(() => frontend.parseAuthResponse(loginForDelete.body)).not.toThrow();

    const deleted = await request(a)
      .delete('/auth/account')
      .set(bearer(loginForDelete.body.token as string))
      .send({ password: changedPassword });
    expectEmpty204(deleted);
  });

  it('parses active/completed diagnostic responses and the durable replay payload', async () => {
    const a = app();
    const user = await registerAndParse(a);

    const restart = await request(a).post('/diagnostic/restart').set(bearer(user.token)).send({ confirm: true });
    expectEmpty204(restart);

    const initial = await request(a).get('/diagnostic/next').set(bearer(user.token));
    expect(initial.status).toBe(200);
    let next = frontend.parseDiagnosticNext(initial.body) as {
      done: boolean;
      question?: { id: string };
    };
    expect(next.done).toBe(false);

    let done = false;
    let firstRequestId: string | undefined;
    for (let answerNo = 0; answerNo < 5 && !done; answerNo++) {
      if (!next.question) throw new Error('active diagnostic response did not carry a question');
      const requestId = randomUUID();
      firstRequestId ??= requestId;
      const answer = await answerForm(
        request(a).post('/diagnostic/answer').set(bearer(user.token)),
        next.question.id,
        requestId,
      );
      expect(answer.status).toBe(200);
      const parsed = frontend.parseDiagnosticAnswerResult(answer.body) as {
        done: boolean;
        nextQuestion?: { id: string };
      };

      if (answerNo === 0) {
        const replay = await request(a).get(`/assessments/${requestId}`).set(bearer(user.token));
        expect(replay.status).toBe(200);
        expect(replay.body).toMatchObject({
          status: 'completed',
          context: 'diagnostic',
          questionId: next.question.id,
        });
        expect(() => frontend.parseDiagnosticAnswerResult(replay.body.response)).not.toThrow();
      }

      done = parsed.done;
      if (!done) next = { done: false, question: parsed.nextQuestion };
    }
    expect(firstRequestId).toBeDefined();
    expect(done).toBe(true);

    const completed = await request(a).get('/diagnostic/next').set(bearer(user.token));
    expect(completed.status).toBe(200);
    expect(frontend.parseDiagnosticNext(completed.body)).toMatchObject({ done: true });
  });

  it('parses every practice outcome branch plus help, history, stats, export, and replay', async () => {
    const a = app();
    const user = await registerAndParse(a);
    await completeDiagnostic(a, user.token);

    const questionResponse = await request(a).get('/practice/question').set(bearer(user.token));
    expect(questionResponse.status).toBe(200);
    const practice = frontend.parsePracticeQuestion(questionResponse.body) as {
      question: { id: string };
      cycleId: string;
    };

    const help = await request(a).get(`/practice/question/${practice.question.id}/help`).set(bearer(user.token));
    expect(help.status).toBe(200);
    expect(() => frontend.parseHelpContent(help.body)).not.toThrow();

    const initialHistory = await request(a).get('/practice/history').set(bearer(user.token));
    expect(initialHistory.status).toBe(200);
    expect(() => frontend.parsePracticeHistory(initialHistory.body)).not.toThrow();

    const initialStats = await request(a).get('/practice/stats').set(bearer(user.token));
    expect(initialStats.status).toBe(200);
    expect(() => frontend.parsePracticeStats(initialStats.body)).not.toThrow();

    const skip = await request(a)
      .post('/practice/skip')
      .set(bearer(user.token))
      .send({ questionId: practice.question.id, cycleId: practice.cycleId });
    expectEmpty204(skip);
    let current = frontend.parsePracticeQuestion(
      (await request(a).get('/practice/question').set(bearer(user.token))).body,
    ) as { question: { id: string }; cycleId: string };

    providerMocks.speaking.mockReset();
    for (let index = 0; index < 3; index++) {
      providerMocks.speaking.mockResolvedValueOnce({
        transcript: `Scored miss ${index + 1}.`,
        score: 50,
        passed: false,
        feedback: 'Add more relevant detail.',
      });
    }
    providerMocks.speaking
      .mockResolvedValueOnce({
        transcript: 'A passing answer with enough detail.',
        score: 65,
        passed: true,
        feedback: 'Good answer; keep building detail.',
      })
      .mockResolvedValueOnce({
        transcript: 'A mastered answer with clear detail.',
        score: 80,
        passed: true,
        feedback: 'Clear and relevant.',
      })
      .mockResolvedValueOnce({
        transcript: '',
        score: 0,
        passed: false,
        feedback: 'I could not hear enough English. Please try again.',
      });

    const expectedBranches = [
      { passed: false, attemptsLeft: 2 },
      { passed: false, attemptsLeft: 1 },
      { passed: false, attemptsLeft: 0 },
      { passed: true, mastered: false },
      { passed: true, mastered: true },
      { passed: false, noSpeech: true },
    ];
    let masteredRequestId = '';
    for (const [index, expectedBranch] of expectedBranches.entries()) {
      const requestId = randomUUID();
      if (index === 4) masteredRequestId = requestId;
      const attempt = await answerForm(
        request(a).post('/practice/attempt').set(bearer(user.token)),
        current.question.id,
        requestId,
        current.cycleId,
      );
      expect(attempt.status).toBe(200);
      const parsed = frontend.parseAttemptResult(attempt.body) as typeof attempt.body;
      expect(parsed).toMatchObject(expectedBranch);
      if (attempt.body.next) current = attempt.body.next;
    }

    const replay = await request(a).get(`/assessments/${masteredRequestId}`).set(bearer(user.token));
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ status: 'completed', context: 'practice' });
    expect(frontend.parseAttemptResult(replay.body.response)).toMatchObject({ passed: true, mastered: true });

    providerMocks.native
      .mockReset()
      .mockResolvedValueOnce({
        understood: true,
        transcript: 'నేను ప్రశ్నను అర్థం చేసుకున్నాను.',
        translatedTranscript: 'I understood the question.',
        modelAnswer: 'I understood the question and answered it clearly.',
        feedback: 'You understood the question.',
      })
      .mockResolvedValueOnce({
        understood: false,
        transcript: '',
        translatedTranscript: '',
        modelAnswer: '',
        feedback: 'I could not hear enough speech. Please try again.',
      });

    for (const expectedUnderstood of [true, false]) {
      const native = await answerForm(
        request(a).post('/practice/attempt/native').set(bearer(user.token)),
        current.question.id,
        undefined,
        current.cycleId,
      );
      expect(native.status).toBe(200);
      expect(frontend.parseNativeAttemptResult(native.body)).toMatchObject({ understood: expectedUnderstood });
    }

    const history = await request(a).get('/practice/history').set(bearer(user.token));
    expect(history.status).toBe(200);
    expect(frontend.parsePracticeHistory(history.body)).toMatchObject({ nextCursor: null });

    const stats = await request(a).get('/practice/stats').set(bearer(user.token));
    expect(stats.status).toBe(200);
    expect(() => frontend.parsePracticeStats(stats.body)).not.toThrow();

    const exported = await request(a).get('/auth/me/data').set(bearer(user.token));
    expect(exported.status).toBe(200);
    expect(() => frontend.parseUserDataPage(exported.body)).not.toThrow();
  });

  it('keeps the server ApiErrorCode union and the app API_ERROR_CODES list in exact set parity', () => {
    // Executing app/src/lib/api.ts here is impossible outside the app's own test
    // runner: it module-loads expo-constants/expo-file-system/expo-secure-store/
    // react-native and evaluates resolveBaseUrl() at import time, and those
    // packages cannot execute under plain Node (Flow syntax in react-native,
    // untransformed expo-modules-core TypeScript). The two authored literals
    // below are the shipped artifacts — the server union exists only at compile
    // time and the app array is what its bundler freezes — so reading them from
    // source binds exactly what each side ships.
    const serverCodes = quotedLiterals(
      readFileSync(join(__dirname, '../src/middleware.ts'), 'utf8'),
      'export type ApiErrorCode =',
      ';',
      'server ApiErrorCode union',
    );
    const appCodes = quotedLiterals(
      readFileSync(join(__dirname, '../../app/src/lib/api.ts'), 'utf8'),
      'export const API_ERROR_CODES = [',
      '] as const;',
      'app API_ERROR_CODES list',
    );

    expect(serverCodes.length, 'server ApiErrorCode extraction unexpectedly found no codes').toBeGreaterThan(0);
    expect(appCodes.length, 'app API_ERROR_CODES extraction unexpectedly found no codes').toBeGreaterThan(0);
    expect(new Set(serverCodes).size, 'server ApiErrorCode union has duplicate members').toBe(serverCodes.length);
    expect(new Set(appCodes).size, 'app API_ERROR_CODES list has duplicate members').toBe(appCodes.length);

    const appSet = new Set(appCodes);
    const serverSet = new Set(serverCodes);
    const onlyServer = serverCodes.filter((code) => !appSet.has(code));
    const onlyApp = appCodes.filter((code) => !serverSet.has(code));

    const explanation = [
      'server/src/middleware.ts ApiErrorCode and app/src/lib/api.ts API_ERROR_CODES drifted.',
      'Unknown NEW server codes degrade gracefully (the additive contract lets the app fall back to',
      'status-based copy), but a rename or retype is silently breaking on both sides: the app keys',
      'CAPACITY_BUSY 503 auto-retry, the AUDIO_UPLOAD_MISSING recovery refund/re-upload,',
      'ASSESSMENT_RESULT_INCOMPATIBLE result retirement, and the CLIENT_UPGRADE_REQUIRED 426',
      'forced-upgrade latch on exact code strings, while the server emits its union through every',
      'error body. An intentional change must update both sides in one commit; a genuinely',
      'non-additive shift must raise MIN_CLIENT_VERSION so older clients get 426 instead of misparsing.',
    ].join(' ');

    expect(onlyServer, `${explanation} Codes only the server defines: ${JSON.stringify(onlyServer)}.`).toEqual([]);
    expect(onlyApp, `${explanation} Codes only the app recognizes: ${JSON.stringify(onlyApp)}.`).toEqual([]);
  });

  it('binds the explicit retainRecording string encoding to the durable per-request choice', async () => {
    const a = app();
    const user = await registerAndParse(a);
    await completeDiagnostic(a, user.token);

    const questionResponse = await request(a).get('/practice/question').set(bearer(user.token));
    expect(questionResponse.status).toBe(200);
    const practice = frontend.parsePracticeQuestion(questionResponse.body) as {
      question: { id: string };
      cycleId: string;
    };

    // Scored failures keep the serving cycle open, so both explicit choices ride
    // the same three-try budget the way two real takes would.
    providerMocks.speaking.mockReset().mockResolvedValue({
      transcript: 'A deliberately short try.',
      score: 50,
      passed: false,
      feedback: 'Add more relevant detail.',
    });

    const explicitTrueRequestId = randomUUID();
    const explicitTrue = await answerForm(
      request(a).post('/practice/attempt').set(bearer(user.token)),
      practice.question.id,
      explicitTrueRequestId,
      practice.cycleId,
      true,
    );
    expect(explicitTrue.status, JSON.stringify(explicitTrue.body)).toBe(200);
    // Direct multipart mode has no retained object, so neither explicit choice
    // may surface recordingId; only the durable claim records the learner's pick.
    expect(explicitTrue.body.recordingId).toBeUndefined();
    expect(() => frontend.parseAttemptResult(explicitTrue.body)).not.toThrow();

    const explicitFalseRequestId = randomUUID();
    const explicitFalse = await answerForm(
      request(a).post('/practice/attempt').set(bearer(user.token)),
      practice.question.id,
      explicitFalseRequestId,
      practice.cycleId,
      false,
    );
    expect(explicitFalse.status, JSON.stringify(explicitFalse.body)).toBe(200);
    expect(explicitFalse.body.recordingId).toBeUndefined();
    expect(frontend.parseAttemptResult(explicitFalse.body)).toMatchObject({ passed: false });

    for (const [requestId, expected] of [
      [explicitTrueRequestId, true],
      [explicitFalseRequestId, false],
    ] as const) {
      const claim = await pool.query<{ retain_recording: boolean }>(
        'SELECT retain_recording FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
        [user.id, requestId],
      );
      expect(claim.rows, `durable retain_recording choice for ${requestId}`).toEqual([{ retain_recording: expected }]);
      const retained = await pool.query<{ count: number }>(
        'SELECT count(*)::int AS count FROM recordings WHERE user_id = $1 AND request_id = $2',
        [user.id, requestId],
      );
      expect(retained.rows[0].count, `retained metadata rows for ${requestId}`).toBe(0);
    }
  });

  it('parses the processing status-replay shape and keeps its ownership boundary', async () => {
    const a = app();
    const user = await registerAndParse(a);

    const { rows: questions } = await pool.query<{
      id: string;
      cefrLevel: string;
      promptWord: string;
      questionText: string;
    }>(
      `SELECT id, cefr_level AS "cefrLevel", prompt_word AS "promptWord", question_text AS "questionText"
       FROM questions ORDER BY id LIMIT 1`,
    );
    const question = questions[0];
    const cycleId = await createClosedPracticeCycle(user.id, question.id);
    const requestId = randomUUID();
    // Migration 024 requires every claim to snapshot the exact public question
    // wording (migrations 005/006 fix the durable identity columns), so the
    // fixture insert carries the full snapshot a live claim would persist.
    await pool.query(
      `INSERT INTO assessment_requests
         (user_id, request_id, claim_id, context, question_id, status, started_at, practice_cycle_id,
          question_cefr_level, question_prompt_word, question_text)
       VALUES ($1, $2, $3, 'practice', $4, 'processing', now(), $5, $6, $7, $8)`,
      [
        user.id,
        requestId,
        randomUUID(),
        question.id,
        cycleId,
        question.cefrLevel,
        question.promptWord,
        question.questionText,
      ],
    );

    const processing = await request(a).get(`/assessments/${requestId}`).set(bearer(user.token));
    expect(processing.status).toBe(200);
    expect(processing.body).toEqual({
      status: 'processing',
      context: 'practice',
      questionId: question.id,
      cycleId,
      question: {
        id: question.id,
        cefrLevel: question.cefrLevel,
        promptWord: question.promptWord,
        questionText: question.questionText,
      },
    });

    // The app's recovery validator must accept the exact route payload for the
    // same durable handoff identity (endpoint/question/cycle) — what a polling
    // client runs on every tick after a lost response.
    const parsed = frontendReplay.parseAssessmentReplayStatus(processing.body, {
      endpoint: '/practice/attempt',
      questionId: question.id,
      cycleId,
    }) as { status: string; context: string; questionId: string; cycleId: string | null };
    expect(parsed).toMatchObject({ status: 'processing', context: 'practice', questionId: question.id, cycleId });

    // Owner-scoped: a foreign token receives the route's uniform 404, identical
    // to a requestId that never existed — no cross-owner existence oracle.
    const stranger = await registerAndParse(a);
    const foreign = await request(a).get(`/assessments/${requestId}`).set(bearer(stranger.token));
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual({ error: 'Assessment request not found', code: 'NOT_FOUND' });

    const missing = await request(a).get(`/assessments/${randomUUID()}`).set(bearer(user.token));
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: 'Assessment request not found', code: 'NOT_FOUND' });
  });
});
