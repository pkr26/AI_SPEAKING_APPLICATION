import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAssessmentSubmissionChain } from '../src/assessment-pipeline';
import { config } from '../src/config';
import type { Limiters } from '../src/rate-limit';

const originalDiagnosticBucket = config.s3.diagnostic.bucket;
const originalPracticeBucket = config.s3.practice.bucket;

afterEach(() => {
  config.s3.diagnostic.bucket = originalDiagnosticBucket;
  config.s3.practice.bucket = originalPracticeBucket;
});

function inertLimiters(): Limiters {
  const middleware = vi.fn();
  return {
    assess: middleware,
    assessIpDaily: middleware,
    assessAbortGuard: middleware,
    respendAssessmentBudget: vi.fn(),
  } as unknown as Limiters;
}

describe('assessment submission schema', () => {
  it('pins both UUID messages in direct-upload mode', () => {
    config.s3.diagnostic.bucket = '';
    const { bodySchema } = buildAssessmentSubmissionChain(inertLimiters(), 'diagnostic');
    const questionId = '00000000-0000-4000-8000-000000000001';
    const requestId = '00000000-0000-4000-8000-000000000002';

    expect(bodySchema.safeParse({ questionId, requestId })).toMatchObject({
      success: true,
      data: { questionId, requestId, retainRecording: true },
    });
    expect(bodySchema.safeParse({ questionId, requestId, retainRecording: false })).toMatchObject({
      success: true,
      data: { questionId, requestId, retainRecording: false },
    });
    expect(bodySchema.safeParse({ questionId, requestId, retainRecording: 'false' })).toMatchObject({
      success: true,
      data: { questionId, requestId, retainRecording: false },
    });
    expect(bodySchema.safeParse({ questionId, requestId, retainRecording: 'true' })).toMatchObject({
      success: true,
      data: { questionId, requestId, retainRecording: true },
    });
    expect(bodySchema.safeParse({ questionId, requestId, retainRecording: 'TRUE' }).success).toBe(false);
    expect(bodySchema.safeParse({ questionId, requestId, retainRecording: 1 }).success).toBe(false);
    const badQuestion = bodySchema.safeParse({ questionId: 'bad', requestId });
    const badRequest = bodySchema.safeParse({ questionId, requestId: 'bad' });
    expect(badQuestion.success).toBe(false);
    expect(badRequest.success).toBe(false);
    if (badQuestion.success || badRequest.success) throw new Error('invalid UUID unexpectedly passed validation');
    expect(badQuestion.error.issues).toEqual([
      expect.objectContaining({ path: ['questionId'], message: 'questionId must be a valid UUID' }),
    ]);
    expect(badRequest.error.issues).toEqual([
      expect.objectContaining({ path: ['requestId'], message: 'requestId must be a valid UUID' }),
    ]);
  });

  it('requires an S3 key and accepts 512 characters but rejects 513', () => {
    config.s3.practice.bucket = 'mutation-schema-practice-bucket';
    const { bodySchema, storageScope } = buildAssessmentSubmissionChain(inertLimiters(), 'practice');
    const ids = {
      questionId: '00000000-0000-4000-8000-000000000001',
      requestId: '00000000-0000-4000-8000-000000000002',
      cycleId: '00000000-0000-4000-8000-000000000003',
    };

    expect(bodySchema.safeParse(ids).success).toBe(false);
    expect(bodySchema.safeParse({ ...ids, audioKey: 'x'.repeat(512) })).toMatchObject({
      success: true,
      data: { ...ids, retainRecording: true, audioKey: 'x'.repeat(512) },
    });
    expect(bodySchema.safeParse({ ...ids, audioKey: 'x'.repeat(513) }).success).toBe(false);
    expect(storageScope).toBe('practice');

    // Practice submissions carry the durable cycle binding: pin the exact
    // UUID failure message the multipart 400 surfaces to clients.
    const badCycle = bodySchema.safeParse({ ...ids, cycleId: 'not-a-uuid', audioKey: 'x'.repeat(512) });
    expect(badCycle.success).toBe(false);
    if (badCycle.success) throw new Error('invalid cycleId unexpectedly passed validation');
    expect(badCycle.error.issues).toEqual([
      expect.objectContaining({ path: ['cycleId'], message: 'cycleId must be a valid UUID' }),
    ]);
  });

  it('registers S3 submission cleanup before eligibility and paid limiters', () => {
    config.s3.diagnostic.bucket = 'mutation-schema-diagnostic-bucket';
    const limiters = inertLimiters();
    const eligibility = vi.fn();
    const { middleware } = buildAssessmentSubmissionChain(limiters, 'diagnostic', [eligibility]);
    const userId = '00000000-0000-4000-8000-000000000001';
    const req = {
      user: { id: userId },
      body: {
        audioKey: `audio-uploads/diagnostic/${userId}/00000000-0000-4000-8000-000000000002.m4a`,
      },
    };
    const res = { once: vi.fn() };
    const next = vi.fn();

    expect(middleware).toHaveLength(6);
    middleware[0](req as never, res as never, next);

    expect(res.once.mock.calls.map(([event]) => event)).toEqual(['finish', 'close']);
    expect(next).toHaveBeenCalledOnce();
    expect(eligibility).not.toHaveBeenCalled();
  });
});
