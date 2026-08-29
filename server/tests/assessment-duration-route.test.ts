import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';

const routeMocks = vi.hoisted(() => ({
  assess: vi.fn(),
  measureDuration: vi.fn(),
}));

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return { ...actual, assessSpeaking: routeMocks.assess };
});

vi.mock('../src/audio-inspection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/audio-inspection')>();
  return { ...actual, measureAudioDuration: routeMocks.measureDuration };
});

import { config } from '../src/config';
import { HttpError } from '../src/middleware';
import { answerForm, app, completeDiagnostic, fakeM4aBuffer, pool, registerUser } from './helpers';

const originalMockAi = config.mockAi;

beforeEach(() => {
  config.mockAi = false;
  routeMocks.measureDuration.mockReset().mockResolvedValue(1);
  routeMocks.assess.mockReset().mockResolvedValue({
    transcript: 'A complete spoken response.',
    score: 80,
    passed: true,
    feedback: 'Clear and relevant.',
  });
});

afterEach(() => {
  config.mockAi = originalMockAi;
});

afterAll(async () => {
  await pool.end();
});

describe('route audio-duration enforcement', () => {
  const a = app();

  it('verifies decoded duration before a diagnostic assessment', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    const response = await answerForm(
      request(a).post('/diagnostic/answer').set('Authorization', `Bearer ${token}`),
      next.body.question.id,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.measureDuration).toHaveBeenCalledOnce();
    expect(routeMocks.measureDuration).toHaveBeenCalledWith(expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/));
    expect(routeMocks.measureDuration.mock.invocationCallOrder[0]).toBeLessThan(
      routeMocks.assess.mock.invocationCallOrder[0],
    );
  });

  it('verifies decoded duration before a practice assessment', async () => {
    // Diagnostic completion also exercises duration, then the call history is
    // reset so the assertion belongs only to the practice route.
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    await completeDiagnostic(a, token);
    routeMocks.measureDuration.mockClear();
    routeMocks.assess.mockClear();
    const question = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    const response = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      question.body.question.id,
      undefined,
      question.body.cycleId,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.measureDuration).toHaveBeenCalledOnce();
    expect(routeMocks.measureDuration).toHaveBeenCalledWith(expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/));
    expect(routeMocks.measureDuration.mock.invocationCallOrder[0]).toBeLessThan(
      routeMocks.assess.mock.invocationCallOrder[0],
    );
  });

  it('rejects overlong media before any paid work and leaves the request retryable', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    routeMocks.measureDuration
      .mockReset()
      .mockRejectedValueOnce(new HttpError(413, 'Recording must be two minutes or shorter', 'AUDIO_TOO_LONG'))
      .mockResolvedValue(1);
    const requestId = randomUUID();

    const rejected = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', next.body.question.id)
      .field('requestId', requestId);

    expect(rejected.status).toBe(413);
    expect(rejected.body).toEqual({ error: 'Recording must be two minutes or shorter', code: 'AUDIO_TOO_LONG' });
    expect(routeMocks.assess).not.toHaveBeenCalled();

    // The abandoned claim must not strand the logical request: an immediate
    // retry with the same requestId runs the assessment normally.
    const retried = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', next.body.question.id)
      .field('requestId', requestId);
    expect(retried.status).toBe(200);
    expect(routeMocks.assess).toHaveBeenCalledOnce();
  });

  it('rejects signal-free media before paid work and leaves no completed claim or recording', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    routeMocks.measureDuration
      .mockReset()
      .mockRejectedValueOnce(new HttpError(422, 'No audible signal was detected in the recording', 'AUDIO_SILENT'))
      .mockResolvedValue(1);
    const requestId = randomUUID();

    const rejected = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'silent.m4a', contentType: 'audio/mp4' })
      .field('questionId', next.body.question.id)
      .field('requestId', requestId);

    expect(rejected.status).toBe(422);
    expect(rejected.body).toEqual({
      error: 'No audible signal was detected in the recording',
      code: 'AUDIO_SILENT',
    });
    expect(routeMocks.assess).not.toHaveBeenCalled();
    await expect(
      pool.query('SELECT 1 FROM assessment_requests WHERE user_id = $1 AND request_id = $2', [
        res.body.user.id,
        requestId,
      ]),
    ).resolves.toMatchObject({ rowCount: 0 });
    await expect(pool.query('SELECT 1 FROM recordings WHERE user_id = $1', [res.body.user.id])).resolves.toMatchObject({
      rowCount: 0,
    });

    const retried = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', fakeM4aBuffer(), { filename: 'answer.m4a', contentType: 'audio/mp4' })
      .field('questionId', next.body.question.id)
      .field('requestId', requestId);
    expect(retried.status).toBe(200);
    expect(routeMocks.assess).toHaveBeenCalledOnce();
  });

  it('rejects overlong media on the practice route before any paid work', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token as string;
    await completeDiagnostic(a, token);
    routeMocks.measureDuration
      .mockReset()
      .mockRejectedValueOnce(new HttpError(413, 'Recording must be two minutes or shorter', 'AUDIO_TOO_LONG'))
      .mockResolvedValue(1);
    routeMocks.assess.mockClear();
    const question = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    const rejected = await answerForm(
      request(a).post('/practice/attempt').set('Authorization', `Bearer ${token}`),
      question.body.question.id,
      undefined,
      question.body.cycleId,
    );

    expect(rejected.status).toBe(413);
    expect(rejected.body).toEqual({ error: 'Recording must be two minutes or shorter', code: 'AUDIO_TOO_LONG' });
    expect(routeMocks.assess).not.toHaveBeenCalled();
  });
});
