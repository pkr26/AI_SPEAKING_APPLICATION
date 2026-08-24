import { createHash, randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { validatedAssessmentResponse } from '../src/idempotency';
import { logger } from '../src/logger';
import { assessmentResponseCases, type ResponseContext } from './assessment-response-corpus';
import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

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

let frontend: FrontendParsers;

beforeAll(async () => {
  // Keep this as a runtime import: the contract test intentionally executes the
  // app's real, pure response parsers without making the server TypeScript build
  // own or compile frontend source.
  frontend = (await vi.importActual('../../app/src/lib/types')) as FrontendParsers;
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
      .send({ name: 'Contract Learner', nativeLanguage: 'hi' });
    expect(profile.status).toBe(200);
    expect(() => frontend.parseUserResponse(profile.body)).not.toThrow();

    const grant = await request(a)
      .post('/uploads/audio-url')
      .set(bearer(user.token))
      .send({ contentType: 'audio/mp4' });
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
      .send({ questionId: practice.question.id });
    expectEmpty204(skip);

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
        practice.question.id,
        requestId,
      );
      expect(attempt.status).toBe(200);
      expect(frontend.parseAttemptResult(attempt.body)).toMatchObject(expectedBranch);
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
        modelAnswer: 'I understood the question and answered it clearly.',
        feedback: 'You understood the question.',
      })
      .mockResolvedValueOnce({
        understood: false,
        transcript: '',
        modelAnswer: '',
        feedback: 'I could not hear enough speech. Please try again.',
      });

    for (const expectedUnderstood of [true, false]) {
      const native = await answerForm(
        request(a).post('/practice/attempt/native').set(bearer(user.token)),
        practice.question.id,
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
});
