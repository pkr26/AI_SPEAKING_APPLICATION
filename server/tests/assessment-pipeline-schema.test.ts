import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAssessmentSubmissionChain } from '../src/assessment-pipeline';
import { config } from '../src/config';
import type { Limiters } from '../src/rate-limit';

const originalBucket = config.s3.bucket;

afterEach(() => {
  config.s3.bucket = originalBucket;
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
    config.s3.bucket = '';
    const { bodySchema } = buildAssessmentSubmissionChain(inertLimiters());
    const questionId = '00000000-0000-4000-8000-000000000001';
    const requestId = '00000000-0000-4000-8000-000000000002';

    expect(bodySchema.safeParse({ questionId, requestId }).success).toBe(true);
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
    config.s3.bucket = 'mutation-schema-bucket';
    const { bodySchema } = buildAssessmentSubmissionChain(inertLimiters());
    const ids = {
      questionId: '00000000-0000-4000-8000-000000000001',
      requestId: '00000000-0000-4000-8000-000000000002',
    };

    expect(bodySchema.safeParse(ids).success).toBe(false);
    expect(bodySchema.safeParse({ ...ids, audioKey: 'x'.repeat(512) }).success).toBe(true);
    expect(bodySchema.safeParse({ ...ids, audioKey: 'x'.repeat(513) }).success).toBe(false);
  });
});
