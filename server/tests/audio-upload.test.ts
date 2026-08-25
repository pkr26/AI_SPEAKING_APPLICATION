import express from 'express';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import {
  createAudioUploadRouter,
  contentTypeToExt,
  isOwnedAudioKey,
  s3StorageEnabled,
  storageScopeForAssessmentEndpoint,
  type AudioStorageScope,
} from '../src/audio-upload';
import { config } from '../src/config';
import type { Limiters } from '../src/rate-limit';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('POST /uploads/audio-url', () => {
  const assessmentEndpoint = '/diagnostic/answer';
  it('returns 401 without a token', async () => {
    const res = await request(app()).post('/uploads/audio-url').send({ contentType: 'audio/mp4' });
    expect(res.status).toBe(401);
  });

  it('returns direct mode when no S3 bucket is configured (local dev/test)', async () => {
    const diagnosticBucket = config.s3.diagnostic.bucket;
    const practiceBucket = config.s3.practice.bucket;
    config.s3.diagnostic.bucket = '';
    config.s3.practice.bucket = '';
    try {
      const a = app();
      const { res: reg } = await registerUser(a);
      const token = reg.body.token as string;
      const res = await request(a)
        .post('/uploads/audio-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentType: 'audio/mp4', assessmentEndpoint });
      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.body).toEqual({ mode: 'direct', assessmentEndpoint });
    } finally {
      config.s3.diagnostic.bucket = diagnosticBucket;
      config.s3.practice.bucket = practiceBucket;
    }
  });

  it('bypasses the upload-grant limiter only when every split storage scope is disabled', async () => {
    const diagnosticBucket = config.s3.diagnostic.bucket;
    const practiceBucket = config.s3.practice.bucket;
    const uploadGrant = vi.fn((_req, res) => res.sendStatus(418));
    const limiters = { uploadGrant } as unknown as Limiters;
    const buildUploadApp = () => {
      const isolated = express();
      isolated.use(express.json());
      isolated.use('/uploads', createAudioUploadRouter(limiters));
      return isolated;
    };
    try {
      const identityApp = app();
      const { res: registration } = await registerUser(identityApp);
      const authorization = `Bearer ${registration.body.token as string}`;

      config.s3.diagnostic.bucket = '';
      config.s3.practice.bucket = '';
      const direct = await request(buildUploadApp())
        .post('/uploads/audio-url')
        .set('Authorization', authorization)
        .send({ contentType: 'audio/mp4', assessmentEndpoint });
      expect(direct.status).toBe(200);
      expect(direct.body).toEqual({ mode: 'direct', assessmentEndpoint });
      expect(uploadGrant).not.toHaveBeenCalled();

      config.s3.diagnostic.bucket = 'sentinel-diagnostic-bucket';
      const limited = await request(buildUploadApp())
        .post('/uploads/audio-url')
        .set('Authorization', authorization)
        .send({ contentType: 'audio/mp4', assessmentEndpoint });
      expect(limited.status).toBe(418);
      expect(uploadGrant).toHaveBeenCalledOnce();
    } finally {
      config.s3.diagnostic.bucket = diagnosticBucket;
      config.s3.practice.bucket = practiceBucket;
    }
  });

  it('returns 415 for a disallowed content type', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    const res = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'text/plain', assessmentEndpoint });
    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: 'Unsupported audio media type', code: 'AUDIO_INVALID' });
  });

  it('rejects a content type beyond the grant schema boundary before the handler runs', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    const res = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'a'.repeat(129), assessmentEndpoint });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it.each([undefined, '/practice/question', 'diagnostic'])(
    'requires an exact assessment endpoint instead of accepting %s',
    async (assessmentEndpoint) => {
      const a = app();
      const { res: registration } = await registerUser(a);
      const response = await request(a)
        .post('/uploads/audio-url')
        .set('Authorization', `Bearer ${registration.body.token as string}`)
        .send({ contentType: 'audio/mp4', ...(assessmentEndpoint ? { assessmentEndpoint } : {}) });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
    },
  );

  it('returns 415 for prototype-chain content types that inherit truthy members', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    for (const contentType of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      const res = await request(a)
        .post('/uploads/audio-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentType, assessmentEndpoint });
      expect(res.status).toBe(415);
      expect(res.body).toEqual({ error: 'Unsupported audio media type', code: 'AUDIO_INVALID' });
    }
  });
});

describe('s3StorageEnabled', () => {
  it.each(['diagnostic', 'practice'] as const)(
    'returns false for an empty %s bucket and true once that exact scope is configured',
    (scope: AudioStorageScope) => {
      const bucket = config.s3[scope].bucket;
      try {
        config.s3[scope].bucket = '';
        expect(s3StorageEnabled(scope)).toBe(false);

        config.s3[scope].bucket = `sentinel-${scope}-bucket`;
        expect(s3StorageEnabled(scope)).toBe(true);
      } finally {
        config.s3[scope].bucket = bucket;
      }
    },
  );
});

describe('storageScopeForAssessmentEndpoint', () => {
  it('maps diagnostic separately and both practice endpoints together', () => {
    expect(storageScopeForAssessmentEndpoint('/diagnostic/answer')).toBe('diagnostic');
    expect(storageScopeForAssessmentEndpoint('/practice/attempt')).toBe('practice');
    expect(storageScopeForAssessmentEndpoint('/practice/attempt/native')).toBe('practice');
  });
});

describe('contentTypeToExt', () => {
  it.each([
    ['audio/m4a', 'm4a'],
    ['audio/mp4', 'm4a'],
    ['audio/x-m4a', 'm4a'],
    ['video/mp4', 'm4a'],
    ['audio/mpeg', 'mp3'],
    ['audio/mp3', 'mp3'],
    ['audio/wav', 'wav'],
    ['audio/x-wav', 'wav'],
    ['audio/wave', 'wav'],
    ['audio/ogg', 'ogg'],
    ['application/ogg', 'ogg'],
    ['audio/webm', 'webm'],
    ['video/webm', 'webm'],
    ['audio/flac', 'flac'],
    ['audio/x-flac', 'flac'],
  ])('maps %s to canonical .%s uploads', (contentType, extension) => {
    expect(contentTypeToExt(contentType)).toBe(extension);
    expect(contentTypeToExt(` ${contentType.toUpperCase()} `)).toBe(extension);
  });

  it('rejects unknown types', () => {
    expect(contentTypeToExt('text/plain')).toBeUndefined();
    expect(contentTypeToExt('')).toBeUndefined();
  });

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'rejects prototype-chain member %s instead of resolving an inherited value',
    (contentType) => {
      expect(contentTypeToExt(contentType)).toBeUndefined();
    },
  );
});

describe('isOwnedAudioKey', () => {
  const userId = '123e4567-e89b-42d3-a456-426614174000';

  it('accepts keys issued to the user', () => {
    expect(
      isOwnedAudioKey(
        'diagnostic',
        userId,
        `audio-uploads/diagnostic/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`,
      ),
    ).toBe(true);
    expect(
      isOwnedAudioKey('practice', userId, `audio-uploads/practice/${userId}/123E4567-E89B-42D3-A456-426614174001.WEBM`),
    ).toBe(true);
  });

  it('rejects non-string values even when they coerce to an owned key', () => {
    const ownedKey = `audio-uploads/diagnostic/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`;
    expect(isOwnedAudioKey('diagnostic', userId, { toString: () => ownedKey })).toBe(false);
  });

  it('rejects keys owned by another user', () => {
    const other = '123e4567-e89b-42d3-a456-426614174999';
    expect(
      isOwnedAudioKey(
        'diagnostic',
        userId,
        `audio-uploads/diagnostic/${other}/123e4567-e89b-42d3-a456-426614174001.m4a`,
      ),
    ).toBe(false);
    expect(
      isOwnedAudioKey(
        'diagnostic',
        userId,
        `audio-uploads/practice/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`,
      ),
    ).toBe(false);
  });

  it('rejects traversal and non-audio keys', () => {
    for (const key of [
      `audio-uploads/diagnostic/${userId}/../../etc/passwd.m4a`,
      `audio-uploads/diagnostic/${userId}/123e4567-e89b-42d3-a456-426614174001.exe`,
      `other-prefix/diagnostic/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`,
      `audio-uploads/diagnostic/${userId}/123e4567-e89b-02d3-a456-426614174001.m4a`,
      `audio-uploads/diagnostic/${userId}/123e4567-e89b-42d3-7456-426614174001.m4a`,
      `audio-uploads/diagnostic/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a.bak`,
    ]) {
      expect(isOwnedAudioKey('diagnostic', userId, key)).toBe(false);
    }
  });
});
