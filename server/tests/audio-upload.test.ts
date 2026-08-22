import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { contentTypeToExt, isOwnedAudioKey } from '../src/audio-upload';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('POST /uploads/audio-url', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app()).post('/uploads/audio-url').send({ contentType: 'audio/mp4' });
    expect(res.status).toBe(401);
  });

  it('returns direct mode when no S3 bucket is configured (local dev/test)', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    const res = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'audio/mp4' });
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ mode: 'direct' });
  });

  it('returns 415 for a disallowed content type', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    const res = await request(a)
      .post('/uploads/audio-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ contentType: 'text/plain' });
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
      .send({ contentType: 'a'.repeat(129) });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('returns 415 for prototype-chain content types that inherit truthy members', async () => {
    const a = app();
    const { res: reg } = await registerUser(a);
    const token = reg.body.token as string;
    for (const contentType of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
      const res = await request(a)
        .post('/uploads/audio-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentType });
      expect(res.status).toBe(415);
      expect(res.body).toEqual({ error: 'Unsupported audio media type', code: 'AUDIO_INVALID' });
    }
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
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`)).toBe(true);
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123E4567-E89B-42D3-A456-426614174001.WEBM`)).toBe(true);
  });

  it('rejects non-string values even when they coerce to an owned key', () => {
    const ownedKey = `audio-uploads/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`;
    expect(isOwnedAudioKey(userId, { toString: () => ownedKey })).toBe(false);
  });

  it('rejects keys owned by another user', () => {
    const other = '123e4567-e89b-42d3-a456-426614174999';
    expect(isOwnedAudioKey(userId, `audio-uploads/${other}/123e4567-e89b-42d3-a456-426614174001.m4a`)).toBe(false);
  });

  it('rejects traversal and non-audio keys', () => {
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/../../etc/passwd.m4a`)).toBe(false);
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123e4567-e89b-42d3-a456-426614174001.exe`)).toBe(false);
    expect(isOwnedAudioKey(userId, `other-prefix/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`)).toBe(false);
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123e4567-e89b-02d3-a456-426614174001.m4a`)).toBe(false);
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123e4567-e89b-42d3-7456-426614174001.m4a`)).toBe(false);
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a.bak`)).toBe(false);
  });
});
