import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { contentTypeToExt, isOwnedAudioKey } from '../src/audio-upload';
import { app, registerUser } from './helpers';

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
  });
});

describe('contentTypeToExt', () => {
  it('maps allowlisted audio types to a canonical extension', () => {
    expect(contentTypeToExt('audio/mp4')).toBe('m4a');
    expect(contentTypeToExt('AUDIO/MPEG')).toBe('mp3');
  });

  it('rejects unknown types', () => {
    expect(contentTypeToExt('text/plain')).toBeUndefined();
    expect(contentTypeToExt('')).toBeUndefined();
  });
});

describe('isOwnedAudioKey', () => {
  const userId = '123e4567-e89b-42d3-a456-426614174000';

  it('accepts keys issued to the user', () => {
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`)).toBe(true);
  });

  it('rejects keys owned by another user', () => {
    const other = '123e4567-e89b-42d3-a456-426614174999';
    expect(isOwnedAudioKey(userId, `audio-uploads/${other}/123e4567-e89b-42d3-a456-426614174001.m4a`)).toBe(false);
  });

  it('rejects traversal and non-audio keys', () => {
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/../../etc/passwd.m4a`)).toBe(false);
    expect(isOwnedAudioKey(userId, `audio-uploads/${userId}/123e4567-e89b-42d3-a456-426614174001.exe`)).toBe(false);
    expect(isOwnedAudioKey(userId, `other-prefix/${userId}/123e4567-e89b-42d3-a456-426614174001.m4a`)).toBe(false);
  });
});
