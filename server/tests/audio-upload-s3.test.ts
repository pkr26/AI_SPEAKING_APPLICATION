import { randomUUID } from 'crypto';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { createServer } from 'http';
import { PassThrough, Readable } from 'stream';
import type { PoolClient } from 'pg';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the AWS SDK at the module boundary so S3 mode is fully exercisable
// without real credentials or a bucket.
const { sendMock, createPresignedPostMock, getSignedUrlMock, s3ClientConstructorMock, routeMocks } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    sendMock: send,
    createPresignedPostMock: vi.fn(),
    getSignedUrlMock: vi.fn(),
    s3ClientConstructorMock: vi.fn().mockImplementation(function () {
      return { send };
    }),
    routeMocks: {
      useLiveAssess: false,
      assess: vi.fn(),
      measureDuration: vi.fn(),
    },
  };
});

vi.mock('@aws-sdk/client-s3', () => {
  // Functions (not arrows) so `new XCommand(input)` works; the returned object wins.
  const command = (kind: string) =>
    vi.fn().mockImplementation(function (input: unknown) {
      return { kind, input };
    });
  return {
    S3Client: s3ClientConstructorMock,
    GetObjectCommand: command('get'),
    DeleteObjectCommand: command('delete'),
    DeleteObjectsCommand: command('delete-versions'),
    ListObjectVersionsCommand: command('list-versions'),
    PutObjectTaggingCommand: command('tag-retained'),
    GetBucketVersioningCommand: command('get-versioning'),
    GetBucketLifecycleConfigurationCommand: command('get-lifecycle'),
  };
});

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: (client: unknown, options: unknown) => createPresignedPostMock(client, options),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (client: unknown, command: unknown, options: unknown) => getSignedUrlMock(client, command, options),
}));

vi.mock('../src/assess', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/assess')>();
  return {
    ...actual,
    assessSpeaking: (...args: Parameters<typeof actual.assessSpeaking>) =>
      routeMocks.useLiveAssess ? routeMocks.assess(...args) : actual.assessSpeaking(...args),
  };
});

vi.mock('../src/audio-inspection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/audio-inspection')>();
  return {
    ...actual,
    measureAudioDuration: (...args: Parameters<typeof actual.measureAudioDuration>) =>
      routeMocks.measureDuration(...args),
  };
});

import { config } from '../src/config';
import {
  assertRetainedAudioStorageAvailable,
  createPresignedRecordingPlaybackUrl,
  createAudioSizeCap,
  discardPresignedAudio as discardScopedPresignedAudio,
  discardSubmittedPresignedAudio as createDiscardSubmittedPresignedAudio,
  finalizeSubmittedPresignedAudio,
  ownSubmittedPresignedAudio,
  preserveSubmittedPresignedAudio,
  retainPresignedAudioVersion,
  resolvePresignedAudio as resolveScopedPresignedAudio,
  sweepPresignedAudioVersions,
} from '../src/audio-upload';
import { logger } from '../src/logger';
import { AuthedRequest } from '../src/middleware';
import { MAX_AUDIO_BYTES, ownSubmittedAudioFile, uploadsDir } from '../src/upload';
import { app, fakeM4aBuffer, pool, registerUser } from './helpers';

// Switch both assessment domains into S3 ingress mode (must precede
// createApp()). Most lifecycle tests use the diagnostic route-bound scope;
// dedicated assertions below pin practice routing independently.
config.s3.diagnostic.bucket = 'test-diagnostic-audio-bucket';
config.s3.diagnostic.region = 'us-east-1';
config.s3.practice.bucket = 'test-practice-audio-bucket';
config.s3.practice.region = 'eu-west-2';
config.s3.accessKeyId = '';
config.s3.secretAccessKey = '';
config.s3.sessionToken = '';

const discardSubmittedPresignedAudio = createDiscardSubmittedPresignedAudio('diagnostic');
const discardPresignedAudio = (userId: string, audioKey: string) =>
  discardScopedPresignedAudio('diagnostic', userId, audioKey);
const resolvePresignedAudio = (
  request: Parameters<typeof resolveScopedPresignedAudio>[1],
  response: Parameters<typeof resolveScopedPresignedAudio>[2],
) => resolveScopedPresignedAudio('diagnostic', request, response);

async function registerAndGetQuestion(a: ReturnType<typeof app>) {
  const { res: reg } = await registerUser(a);
  if (reg.status !== 201) {
    throw new Error(`registration failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  }
  const token = reg.body.token as string;
  const userId = reg.body.user.id as string;
  const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
  return { token, userId, questionId: next.body.question.id as string };
}

function ownedKey(userId: string): string {
  return `audio-uploads/diagnostic/${userId}/${randomUUID()}.m4a`;
}

function practiceOwnedKey(userId: string): string {
  return `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
}

async function completeDiagnosticInS3Mode(a: ReturnType<typeof app>, token: string, userId: string): Promise<void> {
  let retainedTags = 0;
  for (let i = 0; i < 5; i++) {
    const next = await request(a).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);
    if (next.body.done) return;
    const audioKey = ownedKey(userId);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });
    const response = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey });
    if (response.status !== 200) {
      throw new Error(`diagnostic answer failed: ${response.status} ${JSON.stringify(response.body)}`);
    }
    // Retention tagging lands immediately after the result transaction.
    retainedTags++;
    const expectedTags = retainedTags;
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.filter(([command]) => command.kind === 'tag-retained')).toHaveLength(expectedTags);
    });
    if (response.body.done) return;
  }
  throw new Error('diagnostic did not finish within 5 S3 answers');
}

async function consumeSizeCap(chunks: Buffer[], maxBytes: number): Promise<Buffer> {
  const received: Buffer[] = [];
  for await (const chunk of Readable.from(chunks).pipe(createAudioSizeCap(maxBytes))) {
    received.push(chunk as Buffer);
  }
  return Buffer.concat(received);
}

function directS3Request(userId: string, audioKey = ownedKey(userId)): AuthedRequest {
  return {
    body: { audioKey },
    user: { id: userId },
  } as AuthedRequest;
}

beforeEach(() => {
  vi.restoreAllMocks();
  sendMock.mockReset();
  createPresignedPostMock.mockReset();
  getSignedUrlMock.mockReset().mockResolvedValue('https://private.example.invalid/recording');
  routeMocks.useLiveAssess = false;
  routeMocks.assess
    .mockReset()
    .mockImplementation(
      (_audioPath: string, _question: unknown, _userId: string, options?: { onCapacityReserved?: () => void }) => {
        options?.onCapacityReserved?.();
        return Promise.resolve({
          transcript: 'A complete measured response.',
          score: 80,
          passed: true,
          feedback: 'Clear and relevant.',
        });
      },
    );
  routeMocks.measureDuration.mockReset().mockResolvedValue(1.234);
  createPresignedPostMock.mockImplementation(
    (_client: unknown, options: { Key: string; Fields: Record<string, string> }) =>
      Promise.resolve({
        url: 'https://test-audio-bucket.s3.us-east-1.amazonaws.com/presigned-post',
        fields: { key: options.Key, ...options.Fields, policy: 'signed-policy' },
      }),
  );
});

afterAll(async () => {
  await pool.end();
});

describe('POST /uploads/audio-url (S3 mode)', () => {
  it('returns a size-constrained presigned POST grant with a user-owned key and normalized content type', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    const userId = reg.body.user.id as string;

    const res = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: ' AUDIO/MP4 ', assessmentEndpoint: '/diagnostic/answer' });

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.mode).toBe('s3');
    expect(res.body.assessmentEndpoint).toBe('/diagnostic/answer');
    expect(res.body.uploadUrl).toBe('https://test-audio-bucket.s3.us-east-1.amazonaws.com/presigned-post');
    expect(res.body.audioKey).toMatch(new RegExp(`^audio-uploads/diagnostic/${userId}/[0-9a-f-]{36}\\.m4a$`));
    expect(res.body.contentType).toBe('audio/mp4');
    expect(res.body.expiresIn).toBe(config.s3.uploadUrlTtlSeconds);
    expect(res.body.maxBytes).toBe(25 * 1024 * 1024);
    expect(res.body.uploadFields).toMatchObject({
      key: res.body.audioKey,
      'Content-Type': 'audio/mp4',
      tagging: expect.stringContaining('<Key>retention</Key><Value>transient</Value>'),
      policy: 'signed-policy',
    });

    // The storage service, not only the API download, enforces identity, type,
    // and size before accepting the learner's bytes.
    expect(createPresignedPostMock).toHaveBeenCalledOnce();
    const postOptions = createPresignedPostMock.mock.calls[0][1] as {
      Bucket: string;
      Key: string;
      Fields: Record<string, string>;
      Conditions: unknown[];
      Expires: number;
    };
    expect(postOptions).toMatchObject({
      Bucket: config.s3.diagnostic.bucket,
      Key: res.body.audioKey,
      Fields: {
        'Content-Type': 'audio/mp4',
        tagging: expect.stringContaining('<Key>retention</Key><Value>transient</Value>'),
      },
      Expires: config.s3.uploadUrlTtlSeconds,
    });
    expect(postOptions.Conditions).toContainEqual(['eq', '$Content-Type', 'audio/mp4']);
    expect(postOptions.Conditions).toContainEqual([
      'eq',
      '$tagging',
      expect.stringContaining('<Key>retention</Key><Value>transient</Value>'),
    ]);
    expect(postOptions.Conditions).toContainEqual(['content-length-range', 1, 25 * 1024 * 1024]);
    expect(s3ClientConstructorMock).toHaveBeenCalledOnce();
    expect(s3ClientConstructorMock).toHaveBeenCalledWith({ region: config.s3.diagnostic.region });
  });

  it('routes native-practice grants to the practice bucket and scope', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const userId = registration.body.user.id as string;
    const response = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${registration.body.token as string}`)
      .send({ contentType: 'audio/mp4', assessmentEndpoint: '/practice/attempt/native' });

    expect(response.status).toBe(200);
    expect(response.body.assessmentEndpoint).toBe('/practice/attempt/native');
    expect(response.body.audioKey).toMatch(new RegExp(`^audio-uploads/practice/${userId}/[0-9a-f-]{36}\\.m4a$`));
    expect(createPresignedPostMock.mock.calls[0][1]).toMatchObject({
      Bucket: config.s3.practice.bucket,
      Key: response.body.audioKey,
    });
    expect(s3ClientConstructorMock).toHaveBeenCalledWith({ region: config.s3.practice.region });
  });

  it('maps presigned-grant provider failures to the stable retryable storage contract', async () => {
    const failure = new Error('credential provider unavailable');
    createPresignedPostMock.mockRejectedValueOnce(failure);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const a = app();
    const { res: registration } = await registerUser(a);
    const userId = registration.body.user.id as string;

    try {
      const response = await request(a)
        .post('/uploads/audio-url')
        .set('Authorization', `Bearer ${registration.body.token as string}`)
        .send({ contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/answer' });

      expect(response.status).toBe(502);
      expect(response.body).toEqual({
        error: 'Audio storage unavailable; please try again',
        code: 'PROVIDER_FAILED',
      });
      expect(JSON.stringify(response.body)).not.toContain('credential provider unavailable');
      expect(warn).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledWith({ err: failure, userId }, 'failed to create presigned audio upload grant');
    } finally {
      warn.mockRestore();
    }
  });

  it('enforces the upload-grant budget per user without coupling learners on one IP', async () => {
    const previousWindow = config.rateLimit.uploadGrantWindowMs;
    const previousMax = config.rateLimit.uploadGrantMax;
    config.rateLimit.uploadGrantWindowMs = 61_337;
    config.rateLimit.uploadGrantMax = 1;
    try {
      const a = app();
      const { res: firstRegistration } = await registerUser(a);
      const { res: secondRegistration } = await registerUser(a);
      const firstToken = firstRegistration.body.token as string;
      const secondToken = secondRegistration.body.token as string;

      expect(
        (
          await request(a)
            .post('/uploads/audio-url')
            .set('Authorization', `Bearer ${firstToken}`)
            .send({ contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/answer' })
        ).status,
      ).toBe(200);
      const limited = await request(a)
        .post('/uploads/audio-url')
        .set('Authorization', `Bearer ${firstToken}`)
        .send({ contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/answer' });
      expect(limited.status).toBe(429);
      expect(limited.headers['cache-control']).toBe('no-store');
      expect(limited.body).toEqual({
        error: 'Audio upload grant rate limit reached, please try again later',
        code: 'RATE_LIMITED',
      });

      expect(
        (
          await request(a)
            .post('/uploads/audio-url')
            .set('Authorization', `Bearer ${secondToken}`)
            .send({ contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/answer' })
        ).status,
      ).toBe(200);
    } finally {
      config.rateLimit.uploadGrantWindowMs = previousWindow;
      config.rateLimit.uploadGrantMax = previousMax;
    }
  });
});

describe('retained-audio storage readiness', () => {
  const exactLifecycle = {
    Rules: [
      {
        Status: 'Enabled',
        Filter: { Tag: { Key: 'retention', Value: 'transient' } },
        Expiration: { Days: 1 },
        NoncurrentVersionExpiration: { NoncurrentDays: 1 },
      },
    ],
  };

  const exactAndLifecycle = {
    Rules: [
      {
        Status: 'Enabled',
        Filter: { And: { Tags: [{ Key: 'retention', Value: 'transient' }] } },
        Expiration: { Days: 7 },
        NoncurrentVersionExpiration: { NoncurrentDays: 7 },
      },
    ],
  };

  function mockStorageProbe(lifecycle: unknown = exactLifecycle, versioningStatus: unknown = 'Enabled'): void {
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get-versioning') return Promise.resolve({ Status: versioningStatus });
      if (command.kind === 'get-lifecycle') return Promise.resolve(lifecycle);
      return Promise.resolve({});
    });
  }

  it('requires versioning and an exact transient-only current/noncurrent lifecycle', async () => {
    mockStorageProbe();
    await expect(assertRetainedAudioStorageAvailable({ force: true })).resolves.toBeUndefined();

    expect(sendMock.mock.calls.map(([command]) => command)).toEqual([
      { kind: 'get-versioning', input: { Bucket: config.s3.diagnostic.bucket } },
      { kind: 'get-lifecycle', input: { Bucket: config.s3.diagnostic.bucket } },
      { kind: 'get-versioning', input: { Bucket: config.s3.practice.bucket } },
      { kind: 'get-lifecycle', input: { Bucket: config.s3.practice.bucket } },
    ]);
    for (const [, options] of sendMock.mock.calls) {
      expect((options as { abortSignal: AbortSignal }).abortSignal).toBeInstanceOf(AbortSignal);
    }
  });

  it('accepts the sole-tag And filter and both inclusive seven-day boundaries', async () => {
    mockStorageProbe(exactAndLifecycle);

    await expect(assertRetainedAudioStorageAvailable({ force: true })).resolves.toBeUndefined();
  });

  it.each([
    ['no filter', undefined],
    ['an empty filter', {}],
    ['wrong direct tag key', { Tag: { Key: 'other', Value: 'transient' } }],
    ['wrong direct tag value', { Tag: { Key: 'retention', Value: 'retained' } }],
    ['a direct prefix', { Tag: { Key: 'retention', Value: 'transient' }, Prefix: '' }],
    ['a direct And sibling', { Tag: { Key: 'retention', Value: 'transient' }, And: {} }],
    ['a direct lower-size bound', { Tag: { Key: 'retention', Value: 'transient' }, ObjectSizeGreaterThan: 0 }],
    ['a direct upper-size bound', { Tag: { Key: 'retention', Value: 'transient' }, ObjectSizeLessThan: 1 }],
    ['an empty And', { And: {} }],
    ['no And tags', { And: { Prefix: '' } }],
    ['zero And tags', { And: { Tags: [] } }],
    [
      'multiple And tags',
      {
        And: {
          Tags: [
            { Key: 'retention', Value: 'transient' },
            { Key: 'other', Value: 'value' },
          ],
        },
      },
    ],
    ['a wrong And tag key', { And: { Tags: [{ Key: 'other', Value: 'transient' }] } }],
    ['a wrong And tag value', { And: { Tags: [{ Key: 'retention', Value: 'retained' }] } }],
    ['a top-level prefix around And', { Prefix: '', And: { Tags: [{ Key: 'retention', Value: 'transient' }] } }],
    [
      'a top-level lower-size bound around And',
      { ObjectSizeGreaterThan: 0, And: { Tags: [{ Key: 'retention', Value: 'transient' }] } },
    ],
    [
      'a top-level upper-size bound around And',
      { ObjectSizeLessThan: 1, And: { Tags: [{ Key: 'retention', Value: 'transient' }] } },
    ],
    ['an And prefix', { And: { Prefix: '', Tags: [{ Key: 'retention', Value: 'transient' }] } }],
    [
      'an And lower-size bound',
      { And: { ObjectSizeGreaterThan: 0, Tags: [{ Key: 'retention', Value: 'transient' }] } },
    ],
    ['an And upper-size bound', { And: { ObjectSizeLessThan: 1, Tags: [{ Key: 'retention', Value: 'transient' }] } }],
  ])('rejects an expiration rule whose filter has %s', async (_caseName, Filter) => {
    mockStorageProbe({
      Rules: [
        {
          Status: 'Enabled',
          ...(Filter === undefined ? {} : { Filter }),
          Expiration: { Days: 1 },
          NoncurrentVersionExpiration: { NoncurrentDays: 1 },
        },
      ],
    });

    await expect(assertRetainedAudioStorageAvailable({ force: true })).rejects.toThrow(
      'expiration rule that can delete retained recordings',
    );
  });

  it.each([
    ['current-version expiration only', { Expiration: { Days: 1 } }],
    ['noncurrent-version expiration only', { NoncurrentVersionExpiration: { NoncurrentDays: 1 } }],
  ])('rejects a broad enabled %s rule', async (_caseName, expiration) => {
    mockStorageProbe({ Rules: [{ Status: 'Enabled', Filter: { Prefix: 'audio-uploads/' }, ...expiration }] });

    await expect(assertRetainedAudioStorageAvailable({ force: true })).rejects.toThrow(
      'expiration rule that can delete retained recordings',
    );
  });

  it('ignores disabled rules and enabled rules that do not expire objects', async () => {
    mockStorageProbe({
      Rules: [
        { Status: 'Disabled', Filter: { Prefix: '' }, Expiration: { Days: 1 } },
        { Status: 'Enabled', Filter: { Prefix: '' }, AbortIncompleteMultipartUpload: { DaysAfterInitiation: 1 } },
        ...exactLifecycle.Rules,
      ],
    });

    await expect(assertRetainedAudioStorageAvailable({ force: true })).resolves.toBeUndefined();
  });

  it.each(['Suspended', null])('rejects bucket versioning status %s before reading lifecycle', async (status) => {
    mockStorageProbe(exactLifecycle, status);

    await expect(assertRetainedAudioStorageAvailable({ force: true })).rejects.toThrow(
      'diagnostic audio bucket versioning is not enabled',
    );
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get-versioning']);
  });

  it.each([{}, { Rules: [] }])('rejects a lifecycle without a qualifying rule', async (lifecycle) => {
    mockStorageProbe(lifecycle);

    await expect(assertRetainedAudioStorageAvailable({ force: true })).rejects.toThrow(
      'diagnostic audio bucket lacks the required transient-tag lifecycle',
    );
  });

  it('rejects a broad expiration rule that could delete retained versions', async () => {
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get-versioning') return Promise.resolve({ Status: 'Enabled' });
      if (command.kind === 'get-lifecycle') {
        return Promise.resolve({
          Rules: [
            ...exactLifecycle.Rules,
            { Status: 'Enabled', Filter: { Prefix: 'audio-uploads/' }, Expiration: { Days: 30 } },
          ],
        });
      }
      return Promise.resolve({});
    });
    await expect(assertRetainedAudioStorageAvailable({ force: true })).rejects.toThrow(
      'expiration rule that can delete retained recordings',
    );
  });

  it.each([
    { Expiration: { Date: new Date('2099-01-01') }, NoncurrentVersionExpiration: { NoncurrentDays: 1 } },
    { NoncurrentVersionExpiration: { NoncurrentDays: 1 } },
    { Expiration: { Days: 0 }, NoncurrentVersionExpiration: { NoncurrentDays: 1 } },
    { Expiration: { Days: 1.5 }, NoncurrentVersionExpiration: { NoncurrentDays: 1 } },
    { Expiration: { Days: 8 }, NoncurrentVersionExpiration: { NoncurrentDays: 1 } },
    { Expiration: { Days: 100 }, NoncurrentVersionExpiration: { NoncurrentDays: 1 } },
    { Expiration: { Days: 1 } },
    { Expiration: { Days: 1 }, NoncurrentVersionExpiration: { NoncurrentDays: 0 } },
    { Expiration: { Days: 1 }, NoncurrentVersionExpiration: { NoncurrentDays: 1.5 } },
    { Expiration: { Days: 1 }, NoncurrentVersionExpiration: { NoncurrentDays: 8 } },
    { Expiration: { Days: 1 }, NoncurrentVersionExpiration: { NoncurrentDays: 100 } },
  ])('rejects a non-recurring or non-short transient lifecycle', async (timing) => {
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get-versioning') return Promise.resolve({ Status: 'Enabled' });
      if (command.kind === 'get-lifecycle') {
        return Promise.resolve({
          Rules: [{ Status: 'Enabled', Filter: { Tag: { Key: 'retention', Value: 'transient' } }, ...timing }],
        });
      }
      return Promise.resolve({});
    });
    await expect(assertRetainedAudioStorageAvailable({ force: true })).rejects.toThrow(
      'lacks the required transient-tag lifecycle',
    );
  });

  it('skips a disabled scope and probes only the configured bucket', async () => {
    const previousDiagnosticBucket = config.s3.diagnostic.bucket;
    config.s3.diagnostic.bucket = '';
    mockStorageProbe();

    try {
      await expect(assertRetainedAudioStorageAvailable({ force: true })).resolves.toBeUndefined();
      expect(sendMock.mock.calls.map(([command]) => command)).toEqual([
        { kind: 'get-versioning', input: { Bucket: config.s3.practice.bucket } },
        { kind: 'get-lifecycle', input: { Bucket: config.s3.practice.bucket } },
      ]);
    } finally {
      config.s3.diagnostic.bucket = previousDiagnosticBucket;
    }
  });

  it('serves a successful probe from cache, then re-probes at the exact 30-second boundary', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    mockStorageProbe();

    try {
      await assertRetainedAudioStorageAvailable({ force: true });
      expect(sendMock).toHaveBeenCalledTimes(4);
      await assertRetainedAudioStorageAvailable();
      expect(sendMock).toHaveBeenCalledTimes(4);

      await vi.advanceTimersByTimeAsync(29_999);
      await assertRetainedAudioStorageAvailable();
      expect(sendMock).toHaveBeenCalledTimes(4);

      await vi.advanceTimersByTimeAsync(1);
      await assertRetainedAudioStorageAvailable();
      expect(sendMock).toHaveBeenCalledTimes(8);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bypasses a completed cache entry when force is requested', async () => {
    mockStorageProbe();

    await assertRetainedAudioStorageAvailable({ force: true });
    await assertRetainedAudioStorageAvailable({ force: true });

    expect(sendMock).toHaveBeenCalledTimes(8);
  });

  it('coalesces forced callers onto one active probe', async () => {
    let releaseVersioning!: () => void;
    sendMock
      .mockImplementationOnce(
        () =>
          new Promise<{ Status: string }>((resolve) => {
            releaseVersioning = () => resolve({ Status: 'Enabled' });
          }),
      )
      .mockImplementation((command: { kind: string }) => {
        if (command.kind === 'get-versioning') return Promise.resolve({ Status: 'Enabled' });
        if (command.kind === 'get-lifecycle') return Promise.resolve(exactLifecycle);
        return Promise.resolve({});
      });

    const first = assertRetainedAudioStorageAvailable({ force: true });
    const second = assertRetainedAudioStorageAvailable({ force: true });
    expect(second).toBe(first);
    expect(sendMock).toHaveBeenCalledOnce();

    releaseVersioning();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(sendMock).toHaveBeenCalledTimes(4);
  });

  it('caches a normalized non-Error failure for exactly two seconds', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T00:00:00.000Z'));
    const providerFailure = { reason: 'credentials unavailable' };
    sendMock.mockRejectedValueOnce(providerFailure);

    try {
      const firstError = await assertRetainedAudioStorageAvailable({ force: true }).catch((error: unknown) => error);
      expect(firstError).toBeInstanceOf(Error);
      expect(firstError).toMatchObject({ message: 'recording storage readiness failed', cause: providerFailure });

      const cachedError = await assertRetainedAudioStorageAvailable().catch((error: unknown) => error);
      expect(cachedError).toBe(firstError);
      expect(sendMock).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(1_999);
      await expect(assertRetainedAudioStorageAvailable()).rejects.toBe(firstError);
      expect(sendMock).toHaveBeenCalledOnce();

      await vi.advanceTimersByTimeAsync(1);
      mockStorageProbe();
      await expect(assertRetainedAudioStorageAvailable()).resolves.toBeUndefined();
      expect(sendMock).toHaveBeenCalledTimes(5);
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts a stalled readiness request at the storage deadline and clears the failed in-flight probe', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce(
      (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          observedSignal = options?.abortSignal;
          observedSignal?.addEventListener('abort', () => {
            const error = new Error('readiness aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    try {
      const probe = assertRetainedAudioStorageAvailable({ force: true });
      const result = probe.then(
        () => ({ status: 'fulfilled' as const }),
        (reason: unknown) => ({ status: 'rejected' as const, reason }),
      );
      await vi.advanceTimersByTimeAsync(20);
      await expect(result).resolves.toMatchObject({
        status: 'rejected',
        reason: { name: 'AbortError', message: 'readiness aborted' },
      });
      expect(observedSignal?.aborted).toBe(true);

      mockStorageProbe();
      await expect(assertRetainedAudioStorageAvailable({ force: true })).resolves.toBeUndefined();
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('clears every successful readiness deadline', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    const observedSignals: AbortSignal[] = [];
    sendMock.mockImplementation((command: { kind: string }, options?: { abortSignal?: AbortSignal }) => {
      observedSignals.push(options!.abortSignal!);
      if (command.kind === 'get-versioning') return Promise.resolve({ Status: 'Enabled' });
      if (command.kind === 'get-lifecycle') return Promise.resolve(exactLifecycle);
      return Promise.resolve({});
    });

    try {
      await assertRetainedAudioStorageAvailable({ force: true });
      await vi.advanceTimersByTimeAsync(20);
      expect(observedSignals).toHaveLength(4);
      expect(observedSignals.every((signal) => !signal.aborted)).toBe(true);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });
});

describe('retained recording storage primitives', () => {
  it('retags only a learner-owned exact version and clears the successful deadline', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    const userId = randomUUID();
    const audioKey = practiceOwnedKey(userId);
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((_command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({});
    });

    try {
      await expect(retainPresignedAudioVersion('practice', userId, audioKey, 'version-123')).resolves.toBeUndefined();
      expect(sendMock).toHaveBeenCalledWith(
        {
          kind: 'tag-retained',
          input: {
            Bucket: config.s3.practice.bucket,
            Key: audioKey,
            VersionId: 'version-123',
            Tagging: { TagSet: [{ Key: 'retention', Value: 'retained' }] },
          },
        },
        { abortSignal: observedSignal },
      );
      await vi.advanceTimersByTimeAsync(20);
      expect(observedSignal?.aborted).toBe(false);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('rejects an unowned recording key before starting an S3 operation', async () => {
    const userId = randomUUID();

    await expect(
      retainPresignedAudioVersion('diagnostic', userId, ownedKey(randomUUID()), 'version-123'),
    ).rejects.toThrow('recording key is not owned by the learner');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('aborts stalled retained tagging at the storage deadline', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce(
      (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          observedSignal = options?.abortSignal;
          observedSignal?.addEventListener('abort', () => {
            const error = new Error('tagging aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );
    const userId = randomUUID();

    try {
      const tagging = retainPresignedAudioVersion('diagnostic', userId, ownedKey(userId), 'version-123');
      const result = tagging.then(
        () => ({ status: 'fulfilled' as const }),
        (reason: unknown) => ({ status: 'rejected' as const, reason }),
      );
      await vi.advanceTimersByTimeAsync(20);
      await expect(result).resolves.toMatchObject({
        status: 'rejected',
        reason: { name: 'AbortError', message: 'tagging aborted' },
      });
      expect(observedSignal?.aborted).toBe(true);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('signs an exact VersionId-pinned inline playback request with the requested TTL', async () => {
    await expect(
      createPresignedRecordingPlaybackUrl(
        'practice',
        'audio-uploads/practice/owner/object.m4a',
        'version-123',
        'audio/mp4',
        45,
      ),
    ).resolves.toBe('https://private.example.invalid/recording');

    expect(getSignedUrlMock).toHaveBeenCalledOnce();
    expect(getSignedUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({ send: sendMock }),
      {
        kind: 'get',
        input: {
          Bucket: config.s3.practice.bucket,
          Key: 'audio-uploads/practice/owner/object.m4a',
          VersionId: 'version-123',
          ResponseContentType: 'audio/mp4',
          ResponseContentDisposition: 'inline',
        },
      },
      { expiresIn: 45 },
    );
  });
});

describe('durable recording deletion sweep', () => {
  it('deletes only exact-key versions and delete markers and returns the accumulated count across pages', async () => {
    let listedPages = 0;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'list-versions') {
        listedPages += 1;
        if (listedPages === 1) {
          return Promise.resolve({
            Versions: [
              { Key: 'exact-key', VersionId: 'v1' },
              { Key: 'exact-key-suffix', VersionId: 'foreign-version' },
              { Key: 'exact-key' },
            ],
            DeleteMarkers: [
              { Key: 'exact-key', VersionId: 'd1' },
              { Key: 'other-key', VersionId: 'foreign-marker' },
            ],
            IsTruncated: true,
            NextKeyMarker: 'exact-key',
            NextVersionIdMarker: 'd1',
          });
        }
        return Promise.resolve({
          Versions: [{ Key: 'exact-key', VersionId: 'v2' }],
          DeleteMarkers: [],
          IsTruncated: false,
        });
      }
      if (command.kind === 'delete-versions') return Promise.resolve({ Errors: [] });
      return Promise.resolve({});
    });

    await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).resolves.toBe(3);

    const listCommands = sendMock.mock.calls
      .filter(([command]) => command.kind === 'list-versions')
      .map(([command]) => command);
    expect(listCommands).toEqual([
      {
        kind: 'list-versions',
        input: {
          Bucket: config.s3.diagnostic.bucket,
          Prefix: 'exact-key',
          KeyMarker: undefined,
          VersionIdMarker: undefined,
        },
      },
      {
        kind: 'list-versions',
        input: {
          Bucket: config.s3.diagnostic.bucket,
          Prefix: 'exact-key',
          KeyMarker: 'exact-key',
          VersionIdMarker: 'd1',
        },
      },
    ]);
    const deleteCommands = sendMock.mock.calls
      .filter(([command]) => command.kind === 'delete-versions')
      .map(([command]) => command);
    expect(deleteCommands).toEqual([
      {
        kind: 'delete-versions',
        input: {
          Bucket: config.s3.diagnostic.bucket,
          Delete: {
            Objects: [
              { Key: 'exact-key', VersionId: 'v1' },
              { Key: 'exact-key', VersionId: 'd1' },
            ],
            Quiet: true,
          },
        },
      },
      {
        kind: 'delete-versions',
        input: {
          Bucket: config.s3.diagnostic.bucket,
          Delete: { Objects: [{ Key: 'exact-key', VersionId: 'v2' }], Quiet: true },
        },
      },
    ]);
  });

  it('does not confuse opaque marker strings with absent terminal-page markers', async () => {
    sendMock
      .mockResolvedValueOnce({
        IsTruncated: true,
        NextKeyMarker: 'undefined',
        NextVersionIdMarker: 'undefined',
      })
      .mockResolvedValueOnce({ IsTruncated: false });

    await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).resolves.toBe(0);
    expect(
      sendMock.mock.calls.filter(([command]) => command.kind === 'list-versions').map(([command]) => command.input),
    ).toEqual([
      {
        Bucket: config.s3.diagnostic.bucket,
        Prefix: 'exact-key',
        KeyMarker: undefined,
        VersionIdMarker: undefined,
      },
      {
        Bucket: config.s3.diagnostic.bucket,
        Prefix: 'exact-key',
        KeyMarker: 'undefined',
        VersionIdMarker: 'undefined',
      },
    ]);
  });

  it('returns zero without issuing DeleteObjects for an empty final page', async () => {
    sendMock.mockResolvedValue({ IsTruncated: false });

    await expect(sweepPresignedAudioVersions('practice', 'empty-key')).resolves.toBe(0);
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0]).toEqual({
      kind: 'list-versions',
      input: {
        Bucket: config.s3.practice.bucket,
        Prefix: 'empty-key',
        KeyMarker: undefined,
        VersionIdMarker: undefined,
      },
    });
  });

  it('fails when a 200 DeleteObjects response contains per-version errors', async () => {
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'list-versions') {
        return Promise.resolve({ Versions: [{ Key: 'exact-key', VersionId: 'v1' }], IsTruncated: false });
      }
      if (command.kind === 'delete-versions') return Promise.resolve({ Errors: [{ Code: 'AccessDenied' }] });
      return Promise.resolve({});
    });
    await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).rejects.toThrow('per-version deletion errors');
  });

  it('fails closed when a truncated version listing omits continuation markers', async () => {
    sendMock.mockResolvedValue({ Versions: [], DeleteMarkers: [], IsTruncated: true });
    await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).rejects.toThrow(
      'omitted continuation markers',
    );
  });

  it.each([
    ['the key marker', { NextVersionIdMarker: 'v1' }],
    ['the version marker', { NextKeyMarker: 'exact-key' }],
  ])('fails closed when a truncated listing omits %s', async (_caseName, remainingMarker) => {
    sendMock.mockResolvedValue({ IsTruncated: true, ...remainingMarker });

    await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).rejects.toThrow(
      'truncated S3 version listing omitted continuation markers',
    );
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it('fails closed when S3 repeats a continuation pair', async () => {
    sendMock.mockResolvedValue({
      IsTruncated: true,
      NextKeyMarker: 'exact-key',
      NextVersionIdMarker: 'v1',
    });

    await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).rejects.toThrow(
      'S3 version listing repeated a continuation marker',
    );
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('enforces the 1000-page bound after allowing exactly 1000 unique continuation pages', async () => {
    let page = 0;
    sendMock.mockImplementation(() => {
      page += 1;
      return Promise.resolve({
        IsTruncated: true,
        NextKeyMarker: `exact-key-${page}`,
        NextVersionIdMarker: `version-${page}`,
      });
    });

    await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).rejects.toThrow(
      'S3 version sweep exceeded its page bound',
    );
    expect(sendMock).toHaveBeenCalledTimes(1000);
  });

  it('aborts a stalled version listing at the storage deadline', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce(
      (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          observedSignal = options?.abortSignal;
          observedSignal?.addEventListener('abort', () => {
            const error = new Error('list aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    try {
      const sweep = sweepPresignedAudioVersions('diagnostic', 'exact-key');
      const result = sweep.then(
        () => ({ status: 'fulfilled' as const }),
        (reason: unknown) => ({ status: 'rejected' as const, reason }),
      );
      await vi.advanceTimersByTimeAsync(20);
      await expect(result).resolves.toMatchObject({
        status: 'rejected',
        reason: { name: 'AbortError', message: 'list aborted' },
      });
      expect(observedSignal?.aborted).toBe(true);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('clears the shared listing/deletion deadline after a successful page', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    const observedSignals: AbortSignal[] = [];
    sendMock.mockImplementation((command: { kind: string }, options?: { abortSignal?: AbortSignal }) => {
      observedSignals.push(options!.abortSignal!);
      if (command.kind === 'list-versions') {
        return Promise.resolve({ Versions: [{ Key: 'exact-key', VersionId: 'v1' }], IsTruncated: false });
      }
      return Promise.resolve({});
    });

    try {
      await expect(sweepPresignedAudioVersions('diagnostic', 'exact-key')).resolves.toBe(1);
      expect(observedSignals).toHaveLength(2);
      expect(observedSignals[0]).toBe(observedSignals[1]);
      await vi.advanceTimersByTimeAsync(20);
      expect(observedSignals.every((signal) => !signal.aborted)).toBe(true);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });
});

describe('submitted S3 cleanup lifecycle', () => {
  it('ignores preservation requests when no submitted-audio cleanup was registered', () => {
    const res = {} as Parameters<typeof preserveSubmittedPresignedAudio>[0];

    expect(() => preserveSubmittedPresignedAudio(res)).not.toThrow();
  });

  it('ignores finalization when no submitted-audio cleanup was registered', async () => {
    const res = {} as Parameters<typeof finalizeSubmittedPresignedAudio>[0];
    await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();
  });

  it('honors an explicit preservation request without querying ownership or deleting', async () => {
    const userId = randomUUID();
    const req = {
      body: { audioKey: ownedKey(userId), requestId: randomUUID() },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const ownershipQuery = vi.spyOn(pool, 'query');

    try {
      discardSubmittedPresignedAudio(req, res, vi.fn());
      ownSubmittedPresignedAudio(res);
      preserveSubmittedPresignedAudio(res);
      await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();

      expect(ownershipQuery).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      ownershipQuery.mockRestore();
    }
  });

  it('defaults an unowned submission to preservation even when a response still has the default 200 status', async () => {
    const userId = randomUUID();
    const req = directS3Request(userId);
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const ownershipQuery = vi.spyOn(pool, 'query');

    try {
      discardSubmittedPresignedAudio(req, res, vi.fn());
      await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();

      expect(ownershipQuery).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      ownershipQuery.mockRestore();
    }
  });

  it.each([
    ['an absent body', { body: undefined, user: { id: randomUUID() } }],
    ['an absent authenticated user', { body: { audioKey: ownedKey(randomUUID()) } }],
  ])('passes through %s without registering cleanup', (_caseName, rawReq) => {
    const res = { once: vi.fn() } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const next = vi.fn();

    expect(() =>
      discardSubmittedPresignedAudio(
        rawReq as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0],
        res,
        next,
      ),
    ).not.toThrow();
    expect(next).toHaveBeenCalledOnce();
    expect(res.once).not.toHaveBeenCalled();
  });

  it('does not register cleanup for a foreign key or a non-string key that coerces to an owned key', () => {
    const userId = randomUUID();
    const validOwnedKey = ownedKey(userId);

    for (const audioKey of [ownedKey(randomUUID()), { toString: () => validOwnedKey }]) {
      const req = {
        body: { audioKey },
        user: { id: userId },
      } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
      const res = { once: vi.fn() } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
      const next = vi.fn();

      discardSubmittedPresignedAudio(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.once).not.toHaveBeenCalled();
    }
  });

  it('registers the exact response events and automatically finalizes on finish', async () => {
    const userId = randomUUID();
    const req = directS3Request(userId);
    const res = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: true });
    const once = vi.spyOn(res, 'once');
    sendMock.mockResolvedValue({});

    discardSubmittedPresignedAudio(req, res as never, vi.fn());
    ownSubmittedPresignedAudio(res as never);
    expect(once.mock.calls.map(([event]) => event)).toEqual(['finish', 'close']);

    res.emit('finish');
    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledOnce());
    await finalizeSubmittedPresignedAudio(res as never);
  });

  it('automatically finalizes a normally finished response when close fires first', async () => {
    const userId = randomUUID();
    const req = directS3Request(userId);
    const res = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: true });
    sendMock.mockResolvedValue({});

    discardSubmittedPresignedAudio(req, res as never, vi.fn());
    ownSubmittedPresignedAudio(res as never);
    res.emit('close');

    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledOnce());
    await finalizeSubmittedPresignedAudio(res as never);
  });

  it('preserves on an early close, then owner finalization deletes exactly once', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    const req = {
      body: { audioKey },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const listeners = new Map<string, () => void>();
    const res = {
      writableFinished: false,
      once: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, listener);
        return res;
      }),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const next = vi.fn();

    discardSubmittedPresignedAudio(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    listeners.get('close')?.();
    expect(sendMock).not.toHaveBeenCalled();

    ownSubmittedPresignedAudio(res);
    sendMock.mockResolvedValue({});
    await finalizeSubmittedPresignedAudio(res);
    await finalizeSubmittedPresignedAudio(res);
    expect(sendMock).toHaveBeenCalledOnce();
    expect((sendMock.mock.calls[0][0] as { kind: string }).kind).toBe('delete');
  });

  it('preserves a limiter-rejected duplicate while a shared request claim is processing', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const userId = registration.body.user.id as string;
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
    await pool.query(
      `INSERT INTO assessment_requests (user_id, request_id, claim_id, context, question_id, status)
       VALUES ($1, $2, $3, 'diagnostic', $4, 'processing')`,
      [userId, requestId, randomUUID(), question.rows[0].id],
    );
    const req = {
      body: { audioKey, requestId },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const listeners = new Map<string, () => void>();
    const res = {
      writableFinished: true,
      once: vi.fn((event: string, listener: () => void) => {
        listeners.set(event, listener);
        return res;
      }),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];

    discardSubmittedPresignedAudio(req, res, vi.fn());
    listeners.get('finish')?.();
    await finalizeSubmittedPresignedAudio(res);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('preserves the object while any live processing claim references it, even under another requestId', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const userId = registration.body.user.id as string;
    const audioKey = ownedKey(userId);
    const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
    // A blind retry (or duplicate) re-claimed the same object under a
    // DIFFERENT requestId: the failed original's own requestId lookup sees
    // nothing, so only the audio-key claim check can stop its post-response
    // delete from landing under the live worker.
    await pool.query(
      `INSERT INTO assessment_requests (user_id, request_id, claim_id, context, question_id, status, audio_key)
       VALUES ($1, $2, $3, 'practice', $4, 'processing', $5)`,
      [userId, randomUUID(), randomUUID(), question.rows[0].id, audioKey],
    );
    const req = {
      body: { audioKey, requestId: randomUUID() },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];

    discardSubmittedPresignedAudio(req, res, vi.fn());
    ownSubmittedPresignedAudio(res);
    await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
    await pool.query('DELETE FROM assessment_requests WHERE user_id = $1', [userId]);
  });

  it.each([199, 300, 400, 403, 404, 409, 413, 415, 429, 500, 502, 503, 504])(
    'preserves an owned submitted object on non-success status %s without an ownership lookup',
    async (statusCode) => {
      const userId = randomUUID();
      const req = {
        body: { audioKey: ownedKey(userId), requestId: randomUUID() },
        user: { id: userId },
      } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
      const listeners = new Map<string, Array<() => void>>();
      const res = {
        statusCode,
        writableFinished: true,
        once: vi.fn((event: string, listener: () => void) => {
          listeners.set(event, [...(listeners.get(event) ?? []), listener]);
          return res;
        }),
      } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];

      const ownershipQuery = vi.spyOn(pool, 'query');
      try {
        discardSubmittedPresignedAudio(req, res, vi.fn());
        ownSubmittedPresignedAudio(res);
        for (const listener of listeners.get('finish') ?? []) listener();

        // Await the same finalizer that the response listener started. Every
        // non-success must preserve without a racy ownership-check/delete gap;
        // the bucket lifecycle bounds storage for terminal failures.
        await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();
        expect(res.statusCode).toBe(statusCode);
        expect(ownershipQuery).not.toHaveBeenCalled();
        expect(sendMock).not.toHaveBeenCalled();
      } finally {
        ownershipQuery.mockRestore();
      }
    },
  );

  it('deletes only a key owned by the supplied user and sends the exact bucket/key pair', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    sendMock.mockResolvedValue({});

    await discardPresignedAudio(userId, audioKey);
    expect(sendMock).toHaveBeenCalledOnce();
    expect(sendMock.mock.calls[0][0]).toEqual({
      kind: 'delete',
      input: { Bucket: config.s3.diagnostic.bucket, Key: audioKey },
    });
    expect((sendMock.mock.calls[0][1] as { abortSignal: AbortSignal }).abortSignal).toBeInstanceOf(AbortSignal);

    await discardPresignedAudio(userId, ownedKey(randomUUID()));
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it('retains the object when the ownership query fails closed', async () => {
    const userId = randomUUID();
    const req = {
      body: { audioKey: ownedKey(userId), requestId: randomUUID() },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const ownershipError = new Error('ownership lookup failed');
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(ownershipError as never);
    const warn = vi.spyOn(logger, 'warn');

    try {
      discardSubmittedPresignedAudio(req, res, vi.fn());
      ownSubmittedPresignedAudio(res);
      await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();
      expect(query).toHaveBeenCalledOnce();
      expect(sendMock).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith({ err: ownershipError, userId }, 'failed to verify S3 audio cleanup ownership');
    } finally {
      warn.mockRestore();
      query.mockRestore();
    }
  });

  it('keeps fire-and-forget cleanup fulfilled when the warning logger throws', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    const req = directS3Request(userId, audioKey);
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    const ownershipError = new Error('ownership lookup failed');
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(ownershipError as never);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {
      throw new Error('logger transport failed');
    });

    try {
      discardSubmittedPresignedAudio(req, res, vi.fn());
      ownSubmittedPresignedAudio(res);
      await expect(finalizeSubmittedPresignedAudio(res)).resolves.toBeUndefined();
      expect(sendMock).not.toHaveBeenCalled();

      sendMock.mockRejectedValueOnce(new Error('delete failed'));
      await expect(discardPresignedAudio(userId, audioKey)).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      warn.mockRestore();
      query.mockRestore();
    }
  });

  it('reports a failed best-effort deletion with its exact object context', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    const deletionError = new Error('delete failed');
    const warn = vi.spyOn(logger, 'warn');
    sendMock.mockRejectedValue(deletionError);

    try {
      await expect(discardPresignedAudio(userId, audioKey)).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith({ err: deletionError, userId, audioKey }, 'failed to delete S3 audio object');
    } finally {
      warn.mockRestore();
    }
  });

  it('coalesces simultaneous finalizers into one in-flight delete', async () => {
    const userId = randomUUID();
    const req = {
      body: { audioKey: ownedKey(userId) },
      user: { id: userId },
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[0];
    const res = {
      statusCode: 200,
      writableFinished: true,
      once: vi.fn().mockReturnThis(),
    } as unknown as Parameters<typeof discardSubmittedPresignedAudio>[1];
    let releaseDelete!: () => void;
    sendMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseDelete = resolve;
        }),
    );

    discardSubmittedPresignedAudio(req, res, vi.fn());
    ownSubmittedPresignedAudio(res);
    const first = finalizeSubmittedPresignedAudio(res);
    const second = finalizeSubmittedPresignedAudio(res);

    expect(second).toBe(first);
    // The claim-table check runs before the delete; once the delete is in
    // flight it stays coalesced into this one call.
    await vi.waitFor(() => expect(sendMock).toHaveBeenCalledOnce());
    releaseDelete();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it('aborts a hung DeleteObject at the storage deadline while remaining best effort', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce(
      (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          observedSignal = options?.abortSignal;
          observedSignal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    try {
      const userId = randomUUID();
      const deletion = discardPresignedAudio(userId, ownedKey(userId));
      await vi.advanceTimersByTimeAsync(20);
      await expect(deletion).resolves.toBeUndefined();
      expect(observedSignal?.aborted).toBe(true);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('clears the DeleteObject deadline after a successful deletion', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((_command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({});
    });

    try {
      const userId = randomUUID();
      await discardPresignedAudio(userId, ownedKey(userId));
      await vi.advanceTimersByTimeAsync(20);
      expect(observedSignal?.aborted).toBe(false);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });
});

describe('S3 object download boundaries', () => {
  it('accepts the exact stream cap and rejects the first byte beyond it', async () => {
    await expect(consumeSizeCap([Buffer.from('ab'), Buffer.from('cd')], 4)).resolves.toEqual(Buffer.from('abcd'));
    await expect(consumeSizeCap([Buffer.from('abcd'), Buffer.from('e')], 4)).rejects.toEqual(
      expect.objectContaining({ status: 413, message: 'Audio file is too large', code: 'AUDIO_TOO_LARGE' }),
    );
  });

  it('accepts an exact-cap ContentLength and creates a private temporary file', async () => {
    const userId = randomUUID();
    const req = directS3Request(userId);
    const res = new EventEmitter();
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    const chmod = vi.spyOn(fsSync, 'chmodSync');
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()), ContentLength: MAX_AUDIO_BYTES });
    });

    let file: { path: string } | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);

      expect(file.path).toBeTruthy();
      expect(sendMock.mock.calls[0][0]).toEqual({
        kind: 'get',
        input: { Bucket: config.s3.diagnostic.bucket, Key: req.body.audioKey },
      });
      expect(observedSignal).toBeInstanceOf(AbortSignal);
      expect(createWriteStream).toHaveBeenCalledWith(file.path, { flags: 'wx', mode: 0o600 });
      expect(chmod).toHaveBeenCalledWith(file.path, 0o600);
      const stat = await fs.stat(file.path);
      expect(stat.mode & 0o777).toBe(0o600);
      res.emit('finish');
      await vi.waitFor(async () => {
        await expect(fs.stat(file!.path)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      // A killed mutant or failed assertion must not leave a private fixture in
      // the shared uploads directory. The second emit is harmless (`once`).
      res.emit('finish');
      if (file?.path) await fs.rm(file.path, { force: true });
      createWriteStream.mockRestore();
      chmod.mockRestore();
    }
  });

  it('returns the exact retained-version metadata and normalizes an allowlisted supplied content type', async () => {
    const userId = randomUUID();
    const audioKey = ownedKey(userId);
    const req = directS3Request(userId, audioKey);
    const res = new EventEmitter();
    const bytes = fakeM4aBuffer();
    sendMock.mockResolvedValue({
      Body: Readable.from(bytes),
      ContentType: ' AUDIO/X-M4A ',
      VersionId: 'version-123',
      ETag: '"etag-123"',
    });

    let file: Awaited<ReturnType<typeof resolvePresignedAudio>> | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      expect(file).toEqual({
        path: expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/),
        originalname: path.basename(audioKey),
        retainedSource: {
          audioKey,
          scope: 'diagnostic',
          s3VersionId: 'version-123',
          contentType: 'audio/x-m4a',
          sizeBytes: bytes.length,
          etag: '"etag-123"',
        },
      });
    } finally {
      res.emit('finish');
      if (file?.path) await fs.rm(file.path, { force: true });
    }
  });

  it.each([
    ['missing', undefined],
    ['incompatible', 'audio/mpeg'],
  ])('uses the extension canonical content type when S3 metadata is %s', async (_caseName, suppliedContentType) => {
    const userId = randomUUID();
    const req = directS3Request(userId);
    const res = new EventEmitter();
    sendMock.mockResolvedValue({
      Body: Readable.from(fakeM4aBuffer()),
      ...(suppliedContentType === undefined ? {} : { ContentType: suppliedContentType }),
      VersionId: 'version-123',
    });

    let file: Awaited<ReturnType<typeof resolvePresignedAudio>> | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      expect(file.retainedSource).toEqual({
        audioKey: req.body.audioKey,
        scope: 'diagnostic',
        s3VersionId: 'version-123',
        contentType: 'audio/m4a',
        sizeBytes: fakeM4aBuffer().length,
      });
      expect(file.retainedSource).not.toHaveProperty('etag');
    } finally {
      res.emit('finish');
      if (file?.path) await fs.rm(file.path, { force: true });
    }
  });

  it('requires an S3 VersionId outside mock mode and removes the completed download on rejection', async () => {
    const previousMockAi = config.mockAi;
    config.mockAi = false;
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()), ContentType: 'audio/mp4' });

    try {
      await expect(
        resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
      ).rejects.toMatchObject({
        status: 503,
        message: 'Versioned audio storage is required',
        code: 'PROVIDER_FAILED',
      });
      const tempPath = createWriteStream.mock.calls[0][0] as string;
      await vi.waitFor(async () => {
        await expect(fs.stat(tempPath)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      if (createWriteStream.mock.calls[0]) await fs.rm(createWriteStream.mock.calls[0][0] as string, { force: true });
      createWriteStream.mockRestore();
      config.mockAi = previousMockAi;
    }
  });

  it('uses the explicit mock version sentinel only in mock mode', async () => {
    const previousMockAi = config.mockAi;
    config.mockAi = true;
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()), VersionId: '' });

    let file: Awaited<ReturnType<typeof resolvePresignedAudio>> | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      expect(file.retainedSource?.s3VersionId).toBe('mock-unversioned-object');
    } finally {
      res.emit('finish');
      if (file?.path) await fs.rm(file.path, { force: true });
      config.mockAi = previousMockAi;
    }
  });

  it('returns the stable configuration error if a valid key is resolved without a bucket', async () => {
    const previousBucket = config.s3.diagnostic.bucket;
    config.s3.diagnostic.bucket = '';

    try {
      await expect(
        resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
      ).rejects.toMatchObject({ status: 503, message: 'Audio storage is not configured' });
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      config.s3.diagnostic.bucket = previousBucket;
    }
  });

  it('rejects an invalid or foreign key with the exact pre-storage error contract', async () => {
    const userId = randomUUID();

    await expect(
      resolvePresignedAudio(directS3Request(userId, ownedKey(randomUUID())), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 400, message: 'audioKey is missing or invalid' });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('clears the GetObject/body deadline after a successful private download', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((_command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
    });

    let file: { path: string } | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      await vi.advanceTimersByTimeAsync(20);
      expect(observedSignal?.aborted).toBe(false);
    } finally {
      res.emit('finish');
      if (file?.path) await fs.rm(file.path, { force: true });
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it('removes a completed download when final mode enforcement fails', async () => {
    const req = directS3Request(randomUUID());
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    const chmodFailure = Object.assign(new Error('chmod failed'), { code: 'EIO' });
    const chmod = vi.spyOn(fsSync, 'chmodSync').mockImplementationOnce(() => {
      throw chmodFailure;
    });
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()) });

    try {
      // A local chmod/write syscall failure is a server-side disk fault, not an
      // S3 provider failure: plain 500, no retry hint.
      await expect(resolvePresignedAudio(req, new EventEmitter() as never)).rejects.toMatchObject({
        status: 500,
        message: 'Internal server error',
        code: 'INTERNAL',
      });
      const tempPath = createWriteStream.mock.calls[0][0] as string;
      await vi.waitFor(async () => {
        await expect(fs.stat(tempPath)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      if (createWriteStream.mock.calls[0]) await fs.rm(createWriteStream.mock.calls[0][0] as string, { force: true });
      chmod.mockRestore();
      createWriteStream.mockRestore();
    }
  });

  it('unlinks a downloaded temporary file only once when both response events fire', async () => {
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    const unlink = vi.spyOn(fsSync, 'unlink');
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()) });

    let file: { path: string } | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      res.emit('finish');
      res.emit('close');

      expect(unlink.mock.calls.filter(([filePath]) => filePath === file!.path)).toHaveLength(1);
      await vi.waitFor(async () => {
        await expect(fs.stat(file!.path)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      if (file?.path) await fs.rm(file.path, { force: true });
      unlink.mockRestore();
    }
  });

  it('rejects ContentLength one byte above the cap before consuming the body', async () => {
    const userId = randomUUID();
    let bodyRead = false;
    const body = new Readable({
      read() {
        bodyRead = true;
        this.push(null);
      },
    });
    const destroy = vi.spyOn(body, 'destroy');
    sendMock.mockResolvedValue({ Body: body, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(resolvePresignedAudio(directS3Request(userId), new EventEmitter() as never)).rejects.toMatchObject({
      status: 413,
      message: 'Audio file is too large',
      code: 'AUDIO_TOO_LARGE',
    });
    expect(bodyRead).toBe(false);
    expect(destroy).toHaveBeenCalledOnce();
    expect(() => body.emit('error', new Error('late transport failure'))).not.toThrow();
  });

  it('ignores malformed nonnumeric length metadata and still enforces the streaming cap', async () => {
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    sendMock.mockResolvedValue({
      Body: Readable.from(fakeM4aBuffer()),
      ContentLength: String(MAX_AUDIO_BYTES + 1),
    });

    let file: { path: string } | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      expect(file.path).toBeTruthy();
    } finally {
      res.emit('finish');
      if (file?.path) await fs.rm(file.path, { force: true });
    }
  });

  it('does not let a throwing Node body destroy mask the stable 413', async () => {
    const destroy = vi.fn(() => {
      throw new Error('destroy failed');
    });
    sendMock.mockResolvedValue({ Body: { destroy }, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 413, message: 'Audio file is too large' });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('removes the private download on a response close without finish', async () => {
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    const unlink = vi.spyOn(fsSync, 'unlink');
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()) });

    let file: { path: string } | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      expect(file.path).toBeTruthy();
      await expect(fs.stat(file.path)).resolves.toBeTruthy();
      res.emit('close');
      await vi.waitFor(async () => {
        await expect(fs.stat(file!.path)).rejects.toMatchObject({ code: 'ENOENT' });
      });
      expect(unlink.mock.calls.filter(([filePath]) => filePath === file!.path)).toHaveLength(1);
    } finally {
      res.emit('close');
      if (file?.path) await fs.rm(file.path, { force: true });
      unlink.mockRestore();
    }
  });

  it('keeps an owned private download through client close until the assessment runner unwinds', async () => {
    const req = directS3Request(randomUUID());
    const res = new EventEmitter();
    const unlink = vi.spyOn(fsSync, 'unlink');
    sendMock.mockResolvedValue({ Body: Readable.from(fakeM4aBuffer()) });
    ownSubmittedAudioFile(res as never);

    let file: { path: string } | undefined;
    try {
      file = await resolvePresignedAudio(req, res as never);
      res.emit('close');

      await expect(fs.stat(file.path)).resolves.toBeTruthy();
      expect(unlink.mock.calls.filter(([filePath]) => filePath === file!.path)).toHaveLength(0);

      // A normal finish remains a fallback; the real pipeline's outer finally
      // removes the file before it writes its successful response.
      res.emit('finish');
      await vi.waitFor(async () => {
        await expect(fs.stat(file!.path)).rejects.toMatchObject({ code: 'ENOENT' });
      });
      expect(unlink.mock.calls.filter(([filePath]) => filePath === file!.path)).toHaveLength(1);
    } finally {
      res.emit('finish');
      if (file?.path) await fs.rm(file.path, { force: true });
      unlink.mockRestore();
    }
  });

  it('cancels an unread non-Node body when oversized metadata is rejected', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    sendMock.mockResolvedValue({ Body: { cancel }, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 413, message: 'Audio file is too large' });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('checks a cancellable body hook before invoking it', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    let cancelReads = 0;
    const body = Object.defineProperty({}, 'cancel', {
      get() {
        cancelReads += 1;
        return cancel;
      },
    });
    sendMock.mockResolvedValue({ Body: body, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 413, message: 'Audio file is too large' });
    expect(cancel).toHaveBeenCalledOnce();
    expect(cancelReads).toBe(2);
  });

  it.each([
    ['never settles', () => new Promise<void>(() => undefined)],
    ['rejects', () => Promise.reject(new Error('cancel failed'))],
  ])('does not let body cleanup that %s delay or mask the stable 413', async (_caseName, cancelResult) => {
    const cancel = vi.fn(cancelResult);
    sendMock.mockResolvedValue({ Body: { cancel }, ContentLength: MAX_AUDIO_BYTES + 1 });

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 413, message: 'Audio file is too large' });
    expect(cancel).toHaveBeenCalledOnce();
    await Promise.resolve();
  });

  it('rejects an S3 response without a body as an expired upload', async () => {
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    sendMock.mockResolvedValue({ ContentLength: 1 });

    try {
      await expect(
        resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
      ).rejects.toMatchObject({
        status: 400,
        message: 'audio upload not found or expired',
        code: 'AUDIO_UPLOAD_MISSING',
      });
      expect(createWriteStream).not.toHaveBeenCalled();
    } finally {
      createWriteStream.mockRestore();
    }
  });

  it('aborts a stalled object-body pipeline at the deadline and removes its partial file', async () => {
    vi.useFakeTimers();
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    const body = new PassThrough();
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    let observedSignal: AbortSignal | undefined;
    sendMock.mockImplementationOnce((_command: unknown, options?: { abortSignal?: AbortSignal }) => {
      observedSignal = options?.abortSignal;
      return Promise.resolve({ Body: body });
    });
    const req = directS3Request(randomUUID());
    const result = resolvePresignedAudio(req, new EventEmitter() as never).then(
      () => ({ status: 'fulfilled' as const }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );

    try {
      await vi.waitFor(() => expect(createWriteStream).toHaveBeenCalledOnce());
      const tempPath = createWriteStream.mock.calls[0][0] as string;
      await vi.advanceTimersByTimeAsync(20);
      await expect(result).resolves.toMatchObject({
        status: 'rejected',
        reason: { status: 504, message: 'Audio storage timed out; please try again' },
      });
      expect(observedSignal?.aborted).toBe(true);
      await vi.waitFor(async () => {
        await expect(fs.stat(tempPath)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      body.destroy();
      if (createWriteStream.mock.calls[0]) await fs.rm(createWriteStream.mock.calls[0][0] as string, { force: true });
      createWriteStream.mockRestore();
      config.s3.operationTimeoutMs = previousTimeout;
      vi.useRealTimers();
    }
  });

  it.each(['NoSuchKey', 'NotFound', '404'])('maps S3 %s to an expired upload', async (name) => {
    const error = new Error(name);
    error.name = name;
    sendMock.mockRejectedValue(error);

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({
      status: 400,
      message: 'audio upload not found or expired',
      code: 'AUDIO_UPLOAD_MISSING',
    });
  });

  it('reports an unexpected fetch failure with the learner context and stable client error', async () => {
    const userId = randomUUID();
    const fetchError = new Error('connection failed');
    const warn = vi.spyOn(logger, 'warn');
    sendMock.mockRejectedValue(fetchError);

    try {
      await expect(resolvePresignedAudio(directS3Request(userId), new EventEmitter() as never)).rejects.toMatchObject({
        status: 502,
        message: 'Audio storage unavailable; please try again',
        code: 'PROVIDER_FAILED',
      });
      expect(warn).toHaveBeenCalledWith({ err: fetchError, userId }, 'failed to fetch audio from S3');
    } finally {
      warn.mockRestore();
    }
  });

  it.each(['EACCES', 'EDQUOT', 'EEXIST', 'EFBIG', 'EIO', 'EMFILE', 'ENFILE', 'ENOSPC', 'EPERM', 'EROFS'])(
    'maps the local filesystem failure %s to a plain 500 with a distinct log line, not a provider failure',
    async (code) => {
      const userId = randomUUID();
      const diskError = Object.assign(new Error(`write ${code}`), { code });
      sendMock.mockRejectedValue(diskError);
      const error = vi.spyOn(logger, 'error');

      try {
        await expect(resolvePresignedAudio(directS3Request(userId), new EventEmitter() as never)).rejects.toMatchObject(
          {
            status: 500,
            message: 'Internal server error',
            code: 'INTERNAL',
          },
        );
        expect(error).toHaveBeenCalledWith(
          { err: diskError, userId },
          'failed to store downloaded audio on local disk',
        );
      } finally {
        error.mockRestore();
      }
    },
  );

  // A truncated or reset download rejects with a bare Node errno and no
  // $metadata (the SDK operation already resolved, so it never sees the
  // failure). Blaming local disk here would point on-call at capacity during
  // an S3 incident and break the client's retryable provider-failure contract.
  it.each(['ERR_STREAM_PREMATURE_CLOSE', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'])(
    'keeps the 502 provider contract for the transport failure %s',
    async (code) => {
      const userId = randomUUID();
      const transportError = Object.assign(new Error(`download failed: ${code}`), { code });
      sendMock.mockRejectedValue(transportError);
      const warn = vi.spyOn(logger, 'warn');
      const error = vi.spyOn(logger, 'error');

      try {
        await expect(resolvePresignedAudio(directS3Request(userId), new EventEmitter() as never)).rejects.toMatchObject(
          {
            status: 502,
            message: 'Audio storage unavailable; please try again',
            code: 'PROVIDER_FAILED',
          },
        );
        expect(warn).toHaveBeenCalledWith({ err: transportError, userId }, 'failed to fetch audio from S3');
        expect(error).not.toHaveBeenCalled();
      } finally {
        error.mockRestore();
        warn.mockRestore();
      }
    },
  );

  it('reports a body dropped mid-download as a retryable provider failure and removes the partial file', async () => {
    const userId = randomUUID();
    const body = new PassThrough();
    const createWriteStream = vi.spyOn(fsSync, 'createWriteStream');
    const warn = vi.spyOn(logger, 'warn');
    const error = vi.spyOn(logger, 'error');
    sendMock.mockResolvedValue({ Body: body });

    try {
      const result = resolvePresignedAudio(directS3Request(userId), new EventEmitter() as never).then(
        () => ({ status: 'fulfilled' as const }),
        (reason: unknown) => ({ status: 'rejected' as const, reason }),
      );
      await vi.waitFor(() => expect(createWriteStream).toHaveBeenCalledOnce());
      const tempPath = createWriteStream.mock.calls[0][0] as string;
      body.write(fakeM4aBuffer());
      // Wait for the partial file to exist so its removal is what the
      // assertion below observes, not an open that never happened.
      await vi.waitFor(async () => {
        await expect(fs.stat(tempPath)).resolves.toBeTruthy();
      });
      // S3 (or an intermediate proxy) closes the connection with the body only
      // partly drained: the rejection comes from the raw Node stream, long
      // after the SDK's own error path could have classified it.
      const resetError = Object.assign(new Error('socket hang up'), { code: 'ECONNRESET' });
      body.destroy(resetError);

      await expect(result).resolves.toMatchObject({
        status: 'rejected',
        reason: {
          status: 502,
          message: 'Audio storage unavailable; please try again',
          code: 'PROVIDER_FAILED',
        },
      });
      expect(warn).toHaveBeenCalledWith({ err: resetError, userId }, 'failed to fetch audio from S3');
      expect(error).not.toHaveBeenCalled();
      await vi.waitFor(async () => {
        await expect(fs.stat(tempPath)).rejects.toMatchObject({ code: 'ENOENT' });
      });
    } finally {
      if (createWriteStream.mock.calls[0]) await fs.rm(createWriteStream.mock.calls[0][0] as string, { force: true });
      createWriteStream.mockRestore();
      error.mockRestore();
      warn.mockRestore();
    }
  });

  it.each([
    // A plain service code, and one that collides with a filesystem errno:
    // $metadata proves the SDK raised it, so the disk branch stays out of it.
    ['SlowDown', 'SlowDown'],
    ['EACCES', 'AccessDenied'],
  ])('keeps the 502 provider contract for an AWS-SDK-shaped error carrying the code %s', async (code, name) => {
    const userId = randomUUID();
    const serviceError = Object.assign(new Error(name), { name, code, $metadata: {} });
    sendMock.mockRejectedValue(serviceError);
    const warn = vi.spyOn(logger, 'warn');

    try {
      await expect(resolvePresignedAudio(directS3Request(userId), new EventEmitter() as never)).rejects.toMatchObject({
        status: 502,
        message: 'Audio storage unavailable; please try again',
        code: 'PROVIDER_FAILED',
      });
      expect(warn).toHaveBeenCalledWith({ err: serviceError, userId }, 'failed to fetch audio from S3');
    } finally {
      warn.mockRestore();
    }
  });
});

describe('POST /diagnostic/answer (S3 mode)', () => {
  it('downloads the presigned object, assesses it, and retains its exact version', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId, audioKey });

    expect(res.status).toBe(200);
    expect(typeof res.body.score).toBe('number');
    expect(typeof res.body.done).toBe('boolean');
    const storedClaim = await pool.query<{ audio_key: string | null }>(
      'SELECT audio_key FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(storedClaim.rows).toEqual([{ audio_key: audioKey }]);

    expect(res.body.recordingId).toMatch(/^[0-9a-f-]{36}$/i);
    await vi.waitFor(() => {
      const kinds = sendMock.mock.calls.map(([command]) => command.kind);
      expect(kinds).toContain('get');
      expect(kinds).toContain('tag-retained');
    });
    const tagCommand = sendMock.mock.calls.find(([command]) => command.kind === 'tag-retained')![0];
    expect(tagCommand.input).toMatchObject({
      Key: audioKey,
      VersionId: 'mock-unversioned-object',
      Tagging: { TagSet: [{ Key: 'retention', Value: 'retained' }] },
    });
    const recording = await pool.query(
      `SELECT id, request_id, audio_key, status
       FROM recordings WHERE user_id = $1 AND request_id = $2`,
      [userId, requestId],
    );
    expect(recording.rows).toEqual([
      { id: res.body.recordingId, request_id: requestId, audio_key: audioKey, status: 'available' },
    ]);
  });

  it('persists measured retained metadata and links it to the diagnostic attempt outside mock mode', async () => {
    const previousMockAi = config.mockAi;
    config.mockAi = false;
    routeMocks.useLiveAssess = true;
    routeMocks.measureDuration.mockResolvedValueOnce(1.234);
    const bytes = fakeM4aBuffer();
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') {
        return Promise.resolve({
          Body: Readable.from(bytes),
          ContentType: ' AUDIO/X-M4A ',
          VersionId: 'diagnostic-version-123',
          ETag: '"diagnostic-etag-123"',
        });
      }
      return Promise.resolve({});
    });

    try {
      const response = await request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId, audioKey });

      expect(response.status).toBe(200);
      expect(routeMocks.measureDuration).toHaveBeenCalledOnce();
      expect(routeMocks.measureDuration).toHaveBeenCalledWith(expect.stringMatching(/uploads\/[0-9a-f-]+\.m4a$/));
      expect(routeMocks.assess).toHaveBeenCalledOnce();

      const recording = await pool.query<{
        attempt_id: string;
        s3_version_id: string;
        content_type: string;
        size_bytes: string;
        duration_ms: number;
        etag: string;
      }>(
        `SELECT attempt_id, s3_version_id, content_type, size_bytes, duration_ms, etag
         FROM recordings
         WHERE user_id = $1 AND request_id = $2`,
        [userId, requestId],
      );
      expect(recording.rows).toEqual([
        {
          attempt_id: expect.stringMatching(/^[0-9a-f-]{36}$/i),
          s3_version_id: 'diagnostic-version-123',
          content_type: 'audio/x-m4a',
          size_bytes: String(bytes.length),
          duration_ms: 1234,
          etag: '"diagnostic-etag-123"',
        },
      ]);
      const insertedAttempt = await pool.query<{ id: string }>(
        `SELECT id
         FROM attempts
         WHERE user_id = $1 AND question_id = $2 AND context = 'diagnostic'`,
        [userId, questionId],
      );
      expect(insertedAttempt.rows).toEqual([{ id: recording.rows[0].attempt_id }]);

      await vi.waitFor(() => {
        const tagCommand = sendMock.mock.calls.find(([command]) => command.kind === 'tag-retained')?.[0];
        expect(tagCommand?.input).toMatchObject({
          Bucket: config.s3.diagnostic.bucket,
          Key: audioKey,
          VersionId: 'diagnostic-version-123',
        });
      });
      await vi.waitFor(async () => {
        const retained = await pool.query<{ status: string }>('SELECT status FROM recordings WHERE id = $1', [
          response.body.recordingId,
        ]);
        expect(retained.rows).toEqual([{ status: 'available' }]);
      });
    } finally {
      routeMocks.useLiveAssess = false;
      config.mockAi = previousMockAi;
    }
  });

  it('replays a completed request without another storage operation', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });

    const first = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId, audioKey });
    expect(first.status).toBe(200);
    // Drain the first answer's retention tag before clearing.
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toContain('tag-retained');
    });
    await vi.waitFor(async () => {
      const retained = await pool.query<{ status: string }>('SELECT status FROM recordings WHERE id = $1', [
        first.body.recordingId,
      ]);
      expect(retained.rows).toEqual([{ status: 'available' }]);
    });

    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const replay = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId, audioKey });

    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('replays a completed request without deleting a different, unbound submitted key', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const boundAudioKey = ownedKey(userId);
    const freshAudioKey = ownedKey(userId);
    const requestId = randomUUID();
    const replayBody = {
      passed: true,
      score: 87,
      transcript: 'A completed diagnostic answer.',
      feedback: 'Clear and relevant.',
      done: true,
      level: 'A1',
    };
    await pool.query(
      `INSERT INTO assessment_requests
           (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at, audio_key)
         VALUES ($1, $2, $3, 'diagnostic', $4, 'completed', $5::jsonb, now(), $6)`,
      [userId, requestId, randomUUID(), questionId, JSON.stringify(replayBody), boundAudioKey],
    );
    sendMock.mockResolvedValue({});

    const replay = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId, audioKey: freshAudioKey });

    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(replayBody);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('never schedules a late delete after disconnecting during a completed replay', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    const replayBody = {
      passed: true,
      score: 91,
      transcript: 'A completed diagnostic answer.',
      feedback: 'Clear and relevant.',
      done: true,
      level: 'A1',
    };
    await pool.query(
      `INSERT INTO assessment_requests
           (user_id, request_id, claim_id, context, question_id, status, response_body, completed_at, audio_key)
         VALUES ($1, $2, $3, 'diagnostic', $4, 'completed', $5::jsonb, now(), $6)`,
      [userId, requestId, randomUUID(), questionId, JSON.stringify(replayBody), audioKey],
    );
    sendMock.mockResolvedValue({});

    // Hold the replay row so the live request can be disconnected at a
    // deterministic point inside claimAssessmentRequest. pg_blocking_pids
    // below proves the route, rather than an unrelated request phase, is
    // waiting on this exact transaction before the socket is aborted.
    const lockClient = await pool.connect();
    const originalConnect = pool.connect.bind(pool);
    const server = createServer(a);
    let lockTransactionOpen = false;
    let responseFinished = false;
    let responseWritableFinishedOnClose: boolean | undefined;
    let abortClient: (() => void) | undefined;
    let clientOutcome: Promise<'fulfilled' | 'rejected'> | undefined;
    let connectSpy: ReturnType<typeof vi.spyOn> | undefined;
    let markRouteSettled!: () => void;
    const routeSettled = new Promise<void>((resolve) => {
      markRouteSettled = resolve;
    });

    try {
      const lockBackend = await lockClient.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      const lockBackendPid = lockBackend.rows[0].pid;
      await lockClient.query('BEGIN');
      lockTransactionOpen = true;
      await lockClient.query(
        `SELECT 1
           FROM assessment_requests
           WHERE user_id = $1 AND request_id = $2
           FOR UPDATE`,
        [userId, requestId],
      );

      // Resolve only after the completed-replay claim client releases. Its
      // release schedules a setImmediate, so the replay continuation must
      // finish before this test proceeds.
      connectSpy = vi.spyOn(pool, 'connect').mockImplementation(((callback?: unknown) => {
        if (typeof callback === 'function') return originalConnect(callback as never);
        return originalConnect().then((client: PoolClient) => {
          const mutable = client as unknown as {
            query: (...args: unknown[]) => unknown;
            release: (error?: Error | boolean) => void;
          };
          const actualQuery = mutable.query;
          const actualRelease = mutable.release;
          let replayRowRead = false;
          mutable.query = (query: unknown, ...args: unknown[]) => {
            const text = typeof query === 'string' ? query : (query as { text?: unknown } | null)?.text;
            if (typeof text === 'string' && text.includes('SELECT context') && text.includes('assessment_requests')) {
              replayRowRead = true;
            }
            return actualQuery.call(client, query, ...args);
          };
          mutable.release = (error?: Error | boolean) => {
            mutable.query = actualQuery;
            mutable.release = actualRelease;
            actualRelease.call(client, error);
            if (replayRowRead) setImmediate(markRouteSettled);
          };
          return client;
        });
      }) as typeof pool.connect);

      server.prependListener('request', (incoming, outgoing) => {
        if (incoming.url === '/diagnostic/answer') {
          outgoing.once('finish', () => {
            responseFinished = true;
          });
          outgoing.once('close', () => {
            responseWritableFinishedOnClose = outgoing.writableFinished;
          });
        }
      });
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('test server did not bind to a TCP port');
      }

      const clientRequest = request(`http://127.0.0.1:${address.port}`)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ questionId, requestId, audioKey }));
      abortClient = () => clientRequest.abort();
      clientOutcome = clientRequest.then(
        () => 'fulfilled' as const,
        () => 'rejected' as const,
      );

      await vi.waitFor(
        async () => {
          const blockedClaim = await pool.query<{ pid: number }>(
            `SELECT pid
               FROM pg_stat_activity
               WHERE datname = current_database()
                 AND $1::integer = ANY(pg_blocking_pids(pid))
                 AND query LIKE '%assessment_requests%'
               LIMIT 1`,
            [lockBackendPid],
          );
          expect(blockedClaim.rows[0]?.pid).toEqual(expect.any(Number));
        },
        { timeout: 5_000 },
      );

      clientRequest.abort();
      await vi.waitFor(() => expect(responseWritableFinishedOnClose).toBe(false), { timeout: 5_000 });
      expect(responseFinished).toBe(false);
      expect(sendMock).not.toHaveBeenCalled();

      await lockClient.query('COMMIT');
      lockTransactionOpen = false;
      await expect(clientOutcome).resolves.toBe('rejected');
      await routeSettled;

      // Completed replays deliberately leave cleanup to the bucket lifecycle:
      // a delete begun near the 48-hour replay boundary could outlive its
      // tombstone and remove a newly rebound worker's input.
      expect(sendMock).not.toHaveBeenCalled();
      expect(responseFinished).toBe(false);
    } finally {
      abortClient?.();
      connectSpy?.mockRestore();
      if (lockTransactionOpen) {
        await lockClient.query('ROLLBACK').catch(() => undefined);
      }
      await clientOutcome?.catch(() => undefined);
      lockClient.release();
      if (server.listening) {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    }
  }, 15_000);

  it('does not let a losing processing retry delete the object while its owner is reading it', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();

    let releaseOwner: ((value: { Body: Readable }) => void) | undefined;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      return new Promise((resolve) => {
        releaseOwner = resolve;
      });
    });

    const submit = () =>
      request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId, audioKey });

    const ownerRequest = submit();
    const ownerResponse = ownerRequest.then(
      (response) => ({ status: 'fulfilled' as const, response }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );
    let ownerOutcome: Awaited<typeof ownerResponse>;
    try {
      await vi.waitFor(() => expect(releaseOwner).toBeTypeOf('function'));

      const loser = await submit();
      expect(loser.status).toBe(409);
      expect(loser.body).toEqual({
        error: 'Assessment is still processing',
        code: 'REQUEST_IN_FLIGHT',
        retryAfterSeconds: 2,
      });
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
    } finally {
      if (releaseOwner) {
        releaseOwner({ Body: Readable.from(fakeM4aBuffer()) });
      } else {
        ownerRequest.abort();
      }
      ownerOutcome = await ownerResponse;
    }
    if (ownerOutcome.status === 'rejected') throw ownerOutcome.reason;
    const owner = ownerOutcome.response;
    expect(owner.status).toBe(200);
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'tag-retained']);
    });
  });

  it('preserves a confirmed in-flight diagnostic upload without a redundant cleanup ownership query', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    await pool.query(
      `INSERT INTO assessment_requests (user_id, request_id, claim_id, context, question_id, status)
       VALUES ($1, $2, $3, 'diagnostic', $4, 'processing')`,
      [userId, requestId, randomUUID(), questionId],
    );
    const query = vi.spyOn(pool, 'query');

    try {
      const loser = await request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId, audioKey });

      expect(loser.status).toBe(409);
      expect(loser.body).toEqual({
        error: 'Assessment is still processing',
        code: 'REQUEST_IN_FLIGHT',
        retryAfterSeconds: 2,
      });
      expect(
        query.mock.calls.filter(
          ([text]) =>
            typeof text === 'string' &&
            text.includes('SELECT 1') &&
            text.includes('FROM assessment_requests') &&
            text.includes("status = 'processing'") &&
            text.includes("started_at >= now() - interval '5 minutes'"),
        ),
      ).toHaveLength(0);
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      query.mockRestore();
    }
  });

  it('retains submitted audio when request claiming fails with a retryable infrastructure error', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    sendMock.mockResolvedValue({});
    const claimError = new Error('claim database unavailable');
    const originalConnect = pool.connect.bind(pool);
    const connect = vi.spyOn(pool, 'connect').mockImplementation(((...args: unknown[]) => {
      // pool.query internally checks out a client through the callback overload;
      // fail only the explicit promise-style checkout in claimAssessmentRequest.
      if (args.length > 0) return Reflect.apply(originalConnect, undefined, args);
      return Promise.reject(claimError);
    }) as typeof pool.connect);

    try {
      const response = await request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId: randomUUID(), audioKey });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      // A 500 has no durable claim and may be retried with this same key.
      // Finalization therefore retains the object for the bucket lifecycle
      // rather than racing the retry with a late DeleteObject.
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      connect.mockRestore();
    }
  });

  it('deletes owned S3 audio after the client disconnects before the diagnostic response', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const uploadsBefore = (await fs.readdir(uploadsDir)).sort();
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    let releaseDownload: ((value: { Body: Readable }) => void) | undefined;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      return new Promise((resolve) => {
        releaseDownload = resolve;
      });
    });

    const server = createServer(a);
    let responseFinished = false;
    let responseWritableFinishedOnClose: boolean | undefined;
    server.prependListener('request', (incoming, outgoing) => {
      if (incoming.url === '/diagnostic/answer') {
        outgoing.once('finish', () => {
          responseFinished = true;
        });
        outgoing.once('close', () => {
          responseWritableFinishedOnClose = outgoing.writableFinished;
        });
      }
    });
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      throw new Error('test server did not bind to a TCP port');
    }

    const payload = JSON.stringify({ questionId, requestId, audioKey });
    const clientRequest = request(`http://127.0.0.1:${address.port}`)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json')
      .send(payload);
    const clientOutcome = clientRequest.then(
      () => undefined,
      () => undefined,
    );

    try {
      await vi.waitFor(() => expect(releaseDownload).toBeTypeOf('function'));
      clientRequest.abort();
      await vi.waitFor(() => expect(responseWritableFinishedOnClose).toBe(false));
      releaseDownload!({ Body: Readable.from(fakeM4aBuffer()) });
      await clientOutcome;

      await vi.waitFor(() => {
        expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'tag-retained']);
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect((await fs.readdir(uploadsDir)).sort()).toEqual(uploadsBefore);
      expect(responseFinished).toBe(false);
    } finally {
      if (releaseDownload) releaseDownload({ Body: Readable.from(fakeM4aBuffer()) });
      clientRequest.abort();
      await clientOutcome;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('preserves a submitted object when diagnostic completion rejects before durable ownership', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    await pool.query("UPDATE users SET diagnostic_completed = true, cefr_level = 'A1' WHERE id = $1", [userId]);
    sendMock.mockResolvedValue({});

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Diagnostic already completed');
    // A terminal rejection is still unbound. Deleting it here would race a
    // different valid request that claims the key after a cleanup lookup.
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('preserves an owned key when body validation rejects before the route handler', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const audioKey = ownedKey(userId);
    sendMock.mockResolvedValue({});

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: 'not-a-uuid', audioKey });

    expect(res.status).toBe(400);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns 400 for a key owned by another user without touching S3', async () => {
    const a = app();
    const { token, questionId } = await registerAndGetQuestion(a);
    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(randomUUID()) });
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns 400 when the object is missing or expired', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const notFound = new Error('NoSuchKey');
    notFound.name = 'NoSuchKey';
    sendMock.mockRejectedValue(notFound);

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: 'audio upload not found or expired',
      code: 'AUDIO_UPLOAD_MISSING',
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
  });

  it('returns 413 when the object exceeds the audio size cap', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(Buffer.alloc(26 * 1024 * 1024, 1)) });
      return Promise.resolve({});
    });

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
    expect(res.status).toBe(413);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
  });

  it('returns 415 when the downloaded object is not real audio', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(Buffer.from('just text, not audio')) });
      return Promise.resolve({});
    });

    const res = await request(a)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
    expect(res.status).toBe(415);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
  });

  it('keeps a retryable S3 failure object so the same requestId/key can be claimed again without a re-upload', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const requestId = randomUUID();
    const audioKey = ownedKey(userId);
    let unavailable = true;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      if (unavailable) return Promise.reject(new Error('connection refused'));
      return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
    });
    const submit = () =>
      request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId, audioKey });

    const failed = await submit();
    expect(failed.status).toBe(502);
    expect(failed.body).toEqual({ error: 'Audio storage unavailable; please try again', code: 'PROVIDER_FAILED' });
    // A 502 abandons its claim, so a retry is entitled to use this exact S3
    // object. No late DeleteObject may race in and turn it into a 400.
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);

    unavailable = false;
    const retried = await submit();
    expect(retried.status).toBe(200);
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'get', 'tag-retained']);
    });
  });

  it('aborts a hung S3 GetObject request at the configured deadline', async () => {
    const a = app();
    const { token, userId, questionId } = await registerAndGetQuestion(a);
    const previousTimeout = config.s3.operationTimeoutMs;
    config.s3.operationTimeoutMs = 20;
    sendMock.mockImplementation(
      (_command: unknown, options?: { abortSignal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options?.abortSignal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );
    try {
      const res = await request(a)
        .post('/diagnostic/answer')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId: randomUUID(), audioKey: ownedKey(userId) });
      expect(res.status).toBe(504);
      expect(res.body).toEqual({ error: 'Audio storage timed out; please try again', code: 'PROVIDER_TIMEOUT' });
      // The timed-out handoff remains available for the same-key retry rather
      // than being deleted out from under its replacement claim.
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
    } finally {
      config.s3.operationTimeoutMs = previousTimeout;
    }
  });

  it('maps an immediate storage AbortError to the same retryable timeout contract', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    sendMock.mockRejectedValue(abortError);

    await expect(
      resolvePresignedAudio(directS3Request(randomUUID()), new EventEmitter() as never),
    ).rejects.toMatchObject({ status: 504, message: 'Audio storage timed out; please try again' });
  });
});

describe('POST /practice/attempt (S3 mode)', () => {
  const ownedKey = practiceOwnedKey;
  it('never schedules deletion for read routes carrying an owned audioKey body', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    // This read-route cleanup test does not need another five-request
    // diagnostic journey; seed the equivalent eligible state directly.
    await pool.query("UPDATE users SET cefr_level = 'A1', diagnostic_completed = true WHERE id = $1", [userId]);
    sendMock.mockClear();
    sendMock.mockResolvedValue({});

    const practiceQuestion = await request(a)
      .get('/practice/question')
      .set('Authorization', `Bearer ${token}`)
      .send({ audioKey: ownedKey(userId) });
    expect(practiceQuestion.status).toBe(200);

    const diagnosticNext = await request(a)
      .get('/diagnostic/next')
      .set('Authorization', `Bearer ${token}`)
      .send({ audioKey: ownedKey(userId) });
    expect(diagnosticNext.status).toBe(200);

    // Reads have no submission semantics: no GetObject and no DeleteObject may
    // be scheduled, even after any response-finish finalizer would have run.
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects a diagnostic-scoped key on the practice route without touching either bucket', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await pool.query("UPDATE users SET cefr_level = 'A1', diagnostic_completed = true WHERE id = $1", [userId]);
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const diagnosticKey = `audio-uploads/diagnostic/${userId}/${randomUUID()}.m4a`;
    sendMock.mockClear();

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey: diagnosticKey });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('audioKey is missing or invalid');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('preserves the submitted object when the route throws a claim-conflict 409', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const questionId = next.body.question.id as string;
    const audioKey = ownedKey(userId);
    await pool.query('INSERT INTO practice_inflight (user_id, question_id, claim_id) VALUES ($1, $2, $3)', [
      userId,
      questionId,
      randomUUID(),
    ]);
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });

    try {
      const response = await request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId, requestId: randomUUID(), audioKey });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'An assessment is already in progress for this question',
        code: 'ASSESSMENT_IN_PROGRESS',
      });
      // A route-thrown 409 must preserve the object: the response-finish
      // finalizer sees the real status and keeps it for the active owner.
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
    } finally {
      await pool.query('DELETE FROM practice_inflight WHERE user_id = $1 AND question_id = $2', [userId, questionId]);
    }
  });

  it('validates a malformed requestId before the route and preserves the unbound object', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const audioKey = ownedKey(userId);

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: 'not-a-uuid', audioKey });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('requestId must be a valid UUID');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('preserves the unbound object when a non-string requestId fails body validation', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const audioKey = ownedKey(userId);

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: 42, audioKey });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('requestId');
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('validates a non-string audioKey before the route and leaves no durable request claim', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const requestId = randomUUID();

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId, audioKey: { key: ownedKey(userId) } });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/^audioKey:/);
    expect(sendMock).not.toHaveBeenCalled();
    const claims = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('answers a NUL-bearing audioKey with the pre-storage 400 instead of a failed claim insert', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const requestId = randomUUID();

    // A NUL byte survives express.json() and the length-only body schema, but
    // PostgreSQL text cannot store it: recording an unvalidated key with the
    // processing claim would answer 500 instead of the download's clean 400.
    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId, audioKey: `audio-uploads/${userId}/x\u0000y.m4a` });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'audioKey is missing or invalid', code: 'VALIDATION_FAILED' });
    expect(sendMock).not.toHaveBeenCalled();
    const claims = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('returns 404 for a valid unknown question and preserves the unbound object', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const requestId = randomUUID();
    const audioKey = ownedKey(userId);

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: randomUUID(), requestId, audioKey });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Question not found', code: 'NOT_FOUND' });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sendMock).not.toHaveBeenCalled();
    const claims = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM assessment_requests WHERE user_id = $1 AND request_id = $2',
      [userId, requestId],
    );
    expect(claims.rows[0].count).toBe(0);
  });

  it('retains submitted audio when request claiming fails with a retryable infrastructure error', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    const audioKey = ownedKey(userId);
    sendMock.mockClear();
    sendMock.mockResolvedValue({});
    const claimError = new Error('claim database unavailable');
    const originalConnect = pool.connect.bind(pool);
    const connect = vi.spyOn(pool, 'connect').mockImplementation(((...args: unknown[]) => {
      // pool.query internally acquires a client with the callback overload;
      // only fail the explicit promise-style acquisition in the claim helper.
      if (args.length > 0) return Reflect.apply(originalConnect, undefined, args);
      return Promise.reject(claimError);
    }) as typeof pool.connect);

    try {
      const response = await request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      // The same retryable-500 rule applies to practice: no DeleteObject can
      // race a same-key resubmission after the temporary database outage.
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      expect(sendMock).not.toHaveBeenCalled();
    } finally {
      connect.mockRestore();
    }
  });

  it('downloads, assesses, and retains the learner-owned object', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    // Keep this focused mutation oracle to one S3 assessment. Diagnostic S3
    // journeys are covered above and only add shared async/auth state here.
    await pool.query("UPDATE users SET cefr_level = 'A1', diagnostic_completed = true WHERE id = $1", [userId]);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId, audioKey });

    expect(response.status).toBe(200);
    await vi.waitFor(() => {
      const operations = sendMock.mock.calls.map(([command]) => ({
        kind: command.kind,
        bucket: command.input.Bucket,
        key: command.input.Key,
      }));
      expect(operations).toEqual([
        { kind: 'get', bucket: config.s3.practice.bucket, key: audioKey },
        { kind: 'tag-retained', bucket: config.s3.practice.bucket, key: audioKey },
      ]);
    });
    const recording = await pool.query<{ attempt_id: string | null }>(
      `SELECT attempt_id
       FROM recordings
       WHERE user_id = $1 AND request_id = $2`,
      [userId, requestId],
    );
    expect(recording.rows).toEqual([{ attempt_id: expect.stringMatching(/^[0-9a-f-]{36}$/i) }]);
    const insertedAttempt = await pool.query<{ id: string }>(
      `SELECT id
       FROM attempts
       WHERE user_id = $1 AND question_id = $2 AND context = 'practice'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, next.body.question.id],
    );
    expect(insertedAttempt.rows).toEqual([{ id: recording.rows[0].attempt_id }]);
  });

  it('keeps the submitted object through 503 backpressure so the contracted same-key retry succeeds', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind === 'get') return Promise.resolve({ Body: Readable.from(fakeM4aBuffer()) });
      return Promise.resolve({});
    });
    const submit = () =>
      request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: next.body.question.id, requestId, audioKey });

    const previousConcurrency = config.aiMaxConcurrency;
    config.aiMaxConcurrency = 0;
    try {
      const shed = await submit();
      expect(shed.status).toBe(503);
      expect(shed.body).toEqual({ error: 'Assessment capacity busy', code: 'CAPACITY_BUSY', retryAfterSeconds: 5 });
    } finally {
      config.aiMaxConcurrency = previousConcurrency;
    }

    // Pure backpressure spent no paid work and left no claim, and the client
    // re-POSTs the identical grant after Retry-After. Deleting the object here
    // would answer that retry with the definitive "not found" 400 the app
    // treats as a permanent rejection, so the automatic retry could never win.
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);

    const retried = await submit();
    expect(retried.status).toBe(200);
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'get', 'tag-retained']);
    });
  });

  it('does not let a losing in-flight retry delete the object while the practice owner is reading it', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    const audioKey = ownedKey(userId);
    const requestId = randomUUID();

    let releaseOwner: ((value: { Body: Readable }) => void) | undefined;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      return new Promise((resolve) => {
        releaseOwner = resolve;
      });
    });
    const submit = () =>
      request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: next.body.question.id, requestId, audioKey });

    const ownerRequest = submit();
    const ownerResponse = ownerRequest.then(
      (response) => ({ status: 'fulfilled' as const, response }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );
    let ownerOutcome: Awaited<typeof ownerResponse>;
    try {
      await vi.waitFor(() => expect(releaseOwner).toBeTypeOf('function'));

      const loser = await submit();
      expect(loser.status).toBe(409);
      expect(loser.body).toEqual({
        error: 'Assessment is still processing',
        code: 'REQUEST_IN_FLIGHT',
        retryAfterSeconds: 2,
      });
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
    } finally {
      if (releaseOwner) {
        releaseOwner({ Body: Readable.from(fakeM4aBuffer()) });
      } else {
        ownerRequest.abort();
      }
      ownerOutcome = await ownerResponse;
    }
    if (ownerOutcome.status === 'rejected') throw ownerOutcome.reason;
    expect(ownerOutcome.response.status).toBe(200);
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'tag-retained']);
    });
  });

  it('does not let a duplicate under a different requestId delete the object while its owner is reading it', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);
    expect(next.status).toBe(200);
    const audioKey = ownedKey(userId);

    let releaseOwner: ((value: { Body: Readable }) => void) | undefined;
    sendMock.mockImplementation((command: { kind: string }) => {
      if (command.kind !== 'get') return Promise.resolve({});
      return new Promise((resolve) => {
        releaseOwner = resolve;
      });
    });

    const ownerRequest = request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey });
    const ownerResponse = ownerRequest.then(
      (response) => ({ status: 'fulfilled' as const, response }),
      (reason: unknown) => ({ status: 'rejected' as const, reason }),
    );
    let ownerOutcome: Awaited<typeof ownerResponse>;
    try {
      await vi.waitFor(() => expect(releaseOwner).toBeTypeOf('function'));

      // The duplicate shares the owned object but carries a different
      // requestId and an unknown question, so it is rejected before it could
      // claim anything. Its cleanup must still see the owner's live
      // audio-key claim and preserve the object.
      const duplicate = await request(a)
        .post('/practice/attempt')
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: randomUUID(), requestId: randomUUID(), audioKey });
      expect(duplicate.status).toBe(404);
      expect(duplicate.body).toEqual({ error: 'Question not found', code: 'NOT_FOUND' });
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get']);
    } finally {
      if (releaseOwner) {
        releaseOwner({ Body: Readable.from(fakeM4aBuffer()) });
      } else {
        ownerRequest.abort();
      }
      ownerOutcome = await ownerResponse;
    }
    if (ownerOutcome.status === 'rejected') throw ownerOutcome.reason;
    expect(ownerOutcome.response.status).toBe(200);
    await vi.waitFor(() => {
      expect(sendMock.mock.calls.map(([command]) => command.kind)).toEqual(['get', 'tag-retained']);
    });
  });

  it('rejects a foreign learner key before any S3 operation', async () => {
    const a = app();
    const { res: registration } = await registerUser(a);
    const token = registration.body.token as string;
    const userId = registration.body.user.id as string;
    await completeDiagnosticInS3Mode(a, token, userId);
    sendMock.mockClear();
    const next = await request(a).get('/practice/question').set('Authorization', `Bearer ${token}`);

    const response = await request(a)
      .post('/practice/attempt')
      .set('Authorization', `Bearer ${token}`)
      .send({ questionId: next.body.question.id, requestId: randomUUID(), audioKey: ownedKey(randomUUID()) });

    expect(response.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
