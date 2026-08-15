import { randomUUID } from 'crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const speakMock = vi.hoisted(() => vi.fn());
const nativeMock = vi.hoisted(() => vi.fn());

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: speakMock, assessNativeComprehension: nativeMock };
});

import { answerForm, app, completeDiagnostic, pool, registerUser } from './helpers';

const SILENCE = {
  transcript: '',
  score: 0,
  passed: false,
  feedback: 'I could not hear enough English to assess. Please speak clearly and try a slightly longer answer.',
};

beforeEach(() => {
  speakMock.mockReset();
  speakMock.mockResolvedValue({
    transcript: 'A clear learner answer.',
    score: 82,
    passed: true,
    feedback: 'Relevant and well structured.',
  });
  nativeMock.mockReset();
  nativeMock.mockResolvedValue({
    understood: true,
    transcript: 'మీరు అర్థం చేసుకున్నారు.',
    modelAnswer: 'A simple model answer in English.',
    feedback: 'Your answer shows you understood the question.',
  });
});

afterAll(async () => {
  await pool.end();
});

describe('practice stuck cases', () => {
  const a = app();

  async function freshUser() {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const level = await completeDiagnostic(a, token);
    return { token, userId, level };
  }

  async function someQuestion(level: string) {
    const { rows } = await pool.query<{ id: string }>(
      'SELECT id FROM questions WHERE cefr_level = $1 ORDER BY id LIMIT 1',
      [level],
    );
    return rows[0].id;
  }

  describe('silence (case 04)', () => {
    it('is a free retry: no attempt row, no progress, counter unmoved', async () => {
      const { token, userId, level } = await freshUser();
      speakMock.mockClear(); // discount the diagnostic answers
      const questionId = await someQuestion(level);
      speakMock.mockResolvedValue(SILENCE);
      const requestId = randomUUID();
      const send = () =>
        request(a)
          .post('/practice/attempt')
          .set('Authorization', `Bearer ${token}`)
          .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
            filename: 'answer.m4a',
            contentType: 'audio/mp4',
          })
          .field('questionId', questionId)
          .field('requestId', requestId);

      const first = await send();
      expect(first.status).toBe(200);
      expect(first.body).toEqual({
        passed: false,
        noSpeech: true,
        mastered: false,
        attemptNo: 1,
        score: 0,
        transcript: '',
        feedback: SILENCE.feedback,
        attemptsLeft: 3,
      });

      // Idempotent replay: identical body, no second assessment.
      const replay = await send();
      expect(replay.status).toBe(200);
      expect(replay.body).toEqual(first.body);
      expect(speakMock).toHaveBeenCalledTimes(1);

      const counts = await pool.query<{ attempts: number; progress: number; inflight: number }>(
        `SELECT
           (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'practice') AS attempts,
           (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress,
           (SELECT count(*)::int FROM practice_inflight WHERE user_id = $1) AS inflight`,
        [userId],
      );
      expect(counts.rows[0]).toEqual({ attempts: 0, progress: 0, inflight: 0 });

      // The next real attempt is still attempt 1 — silence never advanced it.
      speakMock.mockResolvedValue({
        transcript: 'trying',
        score: 40,
        passed: false,
        feedback: 'Keep going.',
      });
      const real = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(real.status).toBe(200);
      expect(real.body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });
    });

    it('after a real failure, silence reports the pending attempt number without consuming it', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);
      speakMock.mockResolvedValue({
        transcript: 'weak answer',
        score: 40,
        passed: false,
        feedback: 'Add more detail.',
      });
      const failed = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(failed.body).toMatchObject({ passed: false, attemptNo: 1, attemptsLeft: 2 });

      speakMock.mockResolvedValue(SILENCE);
      const silent = await answerForm(
        request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
        questionId,
      );
      expect(silent.status).toBe(200);
      expect(silent.body).toMatchObject({ noSpeech: true, attemptNo: 2, attemptsLeft: 2 });

      const { rows } = await pool.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM attempts WHERE user_id = $1 AND context = 'practice'",
        [userId],
      );
      expect(rows[0].n).toBe(1);
    });
  });

  describe('native-language answers (case 02)', () => {
    it('returns comprehension feedback without touching attempts or mastery', async () => {
      const { token, userId, level } = await freshUser();
      const questionId = await someQuestion(level);

      const r = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        questionId,
      );

      expect(r.status).toBe(200);
      expect(r.body).toEqual({
        mode: 'native',
        understood: true,
        transcript: 'మీరు అర్థం చేసుకున్నారు.',
        modelAnswer: 'A simple model answer in English.',
        feedback: 'Your answer shows you understood the question.',
      });
      expect(nativeMock).toHaveBeenCalledOnce();
      expect(nativeMock).toHaveBeenCalledWith(
        expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/),
        expect.objectContaining({ cefrLevel: level }),
        'te',
        userId,
      );

      const counts = await pool.query<{ attempts: number; progress: number }>(
        `SELECT
           (SELECT count(*)::int FROM attempts WHERE user_id = $1 AND context = 'practice') AS attempts,
           (SELECT count(*)::int FROM practice_progress WHERE user_id = $1) AS progress`,
        [userId],
      );
      expect(counts.rows[0]).toEqual({ attempts: 0, progress: 0 });
    });

    it('appends the authored native example when the answer misses the question', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      const { rows } = await pool.query<{ native: string }>(
        `SELECT translations->'te'->'examples'->0->>'native' AS native FROM questions WHERE id = $1`,
        [questionId],
      );
      nativeMock.mockResolvedValue({
        understood: false,
        transcript: 'something off topic',
        modelAnswer: 'A simple model answer in English.',
        feedback: 'That answer is about something else.',
      });

      const r = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        questionId,
      );

      expect(r.status).toBe(200);
      expect(r.body.mode).toBe('native');
      expect(r.body.understood).toBe(false);
      expect(r.body.feedback).toContain('That answer is about something else.');
      expect(r.body.feedback).toContain(rows[0].native);
      expect(r.body.feedback.length).toBeLessThanOrEqual(800);
    });

    it('keeps native silence feedback focused on recording again', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      nativeMock.mockResolvedValue({
        understood: false,
        transcript: '',
        modelAnswer: '',
        feedback: 'I could not hear enough speech. Please try again.',
      });

      const r = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        questionId,
      );

      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({
        mode: 'native',
        understood: false,
        transcript: '',
        modelAnswer: '',
        feedback: 'I could not hear enough speech. Please try again.',
      });
      expect(r.body.feedback).not.toContain('An on-topic answer could be:');
    });

    it('replays the same native request without a second assessment', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      const requestId = randomUUID();
      const send = () =>
        request(a)
          .post('/practice/attempt/native')
          .set('Authorization', `Bearer ${token}`)
          .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
            filename: 'answer.m4a',
            contentType: 'audio/mp4',
          })
          .field('questionId', questionId)
          .field('requestId', requestId);

      const first = await send();
      const replay = await send();
      expect(replay.status).toBe(200);
      expect(replay.body).toEqual(first.body);
      expect(nativeMock).toHaveBeenCalledTimes(1);
    });

    it('keeps English and native request identifiers in separate replay namespaces', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);
      speakMock.mockClear();
      nativeMock.mockClear();
      const englishRequestId = randomUUID();
      const nativeRequestId = randomUUID();
      const send = (endpoint: '/practice/attempt' | '/practice/attempt/native', requestId: string) =>
        request(a)
          .post(endpoint)
          .set('Authorization', `Bearer ${token}`)
          .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
            filename: 'answer.m4a',
            contentType: 'audio/mp4',
          })
          .field('questionId', questionId)
          .field('requestId', requestId);

      expect((await send('/practice/attempt', englishRequestId)).status).toBe(200);
      const wrongNativeReplay = await send('/practice/attempt/native', englishRequestId);
      expect(wrongNativeReplay.status).toBe(409);
      expect(wrongNativeReplay.body).toEqual({ error: 'Assessment request identifier was already used' });

      expect((await send('/practice/attempt/native', nativeRequestId)).status).toBe(200);
      const wrongEnglishReplay = await send('/practice/attempt', nativeRequestId);
      expect(wrongEnglishReplay.status).toBe(409);
      expect(wrongEnglishReplay.body).toEqual({ error: 'Assessment request identifier was already used' });

      const nativeStatus = await request(a)
        .get(`/assessments/${nativeRequestId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(nativeStatus.status).toBe(200);
      expect(nativeStatus.body).toMatchObject({
        status: 'completed',
        context: 'practice-native',
        questionId,
        response: { mode: 'native' },
      });
      expect(speakMock).toHaveBeenCalledTimes(1);
      expect(nativeMock).toHaveBeenCalledTimes(1);
    });

    it('enforces the level guard, existence, and UUID contracts like the English route', async () => {
      const { token, level } = await freshUser();
      const other = await pool.query<{ id: string }>(
        'SELECT id FROM questions WHERE cefr_level != $1 ORDER BY id LIMIT 1',
        [level],
      );

      const foreign = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        other.rows[0].id,
      );
      expect(foreign.status).toBe(403);
      expect(foreign.body).toEqual({ error: 'Question is not available at your level' });

      const missing = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        '00000000-0000-0000-0000-000000000000',
      );
      expect(missing.status).toBe(404);

      const malformed = await answerForm(
        request(a).post('/practice/attempt/native').set('Authorization', `Bearer ${token}`),
        'not-a-uuid',
      );
      expect(malformed.status).toBe(400);
      expect(nativeMock).not.toHaveBeenCalled();
    });

    it('requires audio like the English route', async () => {
      const { token, level } = await freshUser();
      const questionId = await someQuestion(level);

      const r = await request(a)
        .post('/practice/attempt/native')
        .set('Authorization', `Bearer ${token}`)
        .field('questionId', questionId)
        .field('requestId', randomUUID());

      expect(r.status).toBe(400);
      expect(r.body).toEqual({ error: 'audio file is required' });
      expect(nativeMock).not.toHaveBeenCalled();
    });
  });
});
