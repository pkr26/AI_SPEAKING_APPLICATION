import { randomUUID } from 'crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSignedUrlMock } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn().mockResolvedValue('https://private.example.invalid/short-lived-playback'),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: getSignedUrlMock }));

import { config } from '../src/config';
import { app, pool, registerUser } from './helpers';

config.s3.practice.bucket = 'private-practice-recordings';
config.s3.practice.region = 'us-east-1';

async function createRecording(userId: string, status: 'retention_pending' | 'available' = 'available') {
  const question = await pool.query<{ id: string }>("SELECT id FROM questions WHERE cefr_level = 'A1' LIMIT 1");
  const id = randomUUID();
  const requestId = randomUUID();
  const audioKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
  await pool.query(
    `INSERT INTO recordings (
       id, user_id, request_id, question_id, context, storage_scope, audio_key,
       s3_version_id, content_type, size_bytes, duration_ms, status, available_at
     ) VALUES ($1, $2, $3, $4, 'practice-native', 'practice', $5, 'version-1',
               'audio/mp4', 12345, 7200, $6, CASE WHEN $6 = 'available' THEN now() ELSE NULL END)`,
    [id, userId, requestId, question.rows[0].id, audioKey, status],
  );
  return { id, requestId, audioKey, questionId: question.rows[0].id };
}

beforeEach(() => {
  getSignedUrlMock.mockClear();
});

afterAll(async () => {
  await pool.end();
});

describe('recording owner API', () => {
  it('lists minimal prompt metadata and exports request mapping without storage coordinates', async () => {
    const a = app();
    const { res: registered } = await registerUser(a);
    const token = registered.body.token as string;
    const userId = registered.body.user.id as string;
    const recording = await createRecording(userId);

    const list = await request(a).get('/recordings?limit=20').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({
      id: recording.id,
      questionId: recording.questionId,
      context: 'practice-native',
      promptWord: expect.any(String),
      questionText: expect.any(String),
      cefrLevel: 'A1',
      contentType: 'audio/mp4',
      status: 'available',
    });
    expect(list.body.items[0]).not.toHaveProperty('requestId');
    expect(JSON.stringify(list.body)).not.toContain(recording.audioKey);

    const exported = await request(a).get('/recordings/export?limit=500').set('Authorization', `Bearer ${token}`);
    expect(exported.status).toBe(200);
    expect(exported.body.recordings[0]).toMatchObject({
      id: recording.id,
      requestId: recording.requestId,
      attemptId: null,
    });
    expect(JSON.stringify(exported.body)).not.toContain(recording.audioKey);
  });

  it('issues an owner-only short-lived playback URL and keeps pending/foreign rows private', async () => {
    const a = app();
    const owner = await registerUser(a);
    const stranger = await registerUser(a);
    const available = await createRecording(owner.res.body.user.id);
    const pending = await createRecording(owner.res.body.user.id, 'retention_pending');

    const playback = await request(a)
      .post(`/recordings/${available.id}/playback-url`)
      .set('Authorization', `Bearer ${owner.res.body.token}`);
    expect(playback.status).toBe(200);
    expect(playback.body).toEqual({
      recordingId: available.id,
      playbackUrl: 'https://private.example.invalid/short-lived-playback',
      expiresIn: config.recordings.playbackUrlTtlSeconds,
      contentType: 'audio/mp4',
    });
    expect(playback.headers['cache-control']).toContain('no-store');

    const notReady = await request(a)
      .post(`/recordings/${pending.id}/playback-url`)
      .set('Authorization', `Bearer ${owner.res.body.token}`);
    expect(notReady.status).toBe(409);
    expect(notReady.body.code).toBe('REQUEST_IN_FLIGHT');

    const foreign = await request(a)
      .post(`/recordings/${available.id}/playback-url`)
      .set('Authorization', `Bearer ${stranger.res.body.token}`);
    expect(foreign.status).toBe(404);
  });

  it('deletes idempotently and transactionally leaves a durable S3 deletion job', async () => {
    const a = app();
    const { res: registered } = await registerUser(a);
    const recording = await createRecording(registered.body.user.id);

    for (let attempt = 0; attempt < 2; attempt++) {
      const deleted = await request(a)
        .delete(`/recordings/${recording.id}`)
        .set('Authorization', `Bearer ${registered.body.token}`);
      expect(deleted.status).toBe(204);
    }
    const rows = await pool.query('SELECT 1 FROM recordings WHERE id = $1', [recording.id]);
    const jobs = await pool.query(
      'SELECT known_version_id FROM recording_deletion_jobs WHERE storage_scope = $1 AND audio_key = $2',
      ['practice', recording.audioKey],
    );
    expect(rows.rowCount).toBe(0);
    expect(jobs.rows).toEqual([{ known_version_id: 'version-1' }]);
  });

  it('account deletion cascades metadata but preserves a durable object-deletion tombstone', async () => {
    const a = app();
    const { res: registered } = await registerUser(a);
    const recording = await createRecording(registered.body.user.id);

    await pool.query('DELETE FROM users WHERE id = $1', [registered.body.user.id]);
    expect((await pool.query('SELECT 1 FROM recordings WHERE id = $1', [recording.id])).rowCount).toBe(0);
    expect(
      (
        await pool.query(
          'SELECT known_version_id FROM recording_deletion_jobs WHERE storage_scope = $1 AND audio_key = $2',
          ['practice', recording.audioKey],
        )
      ).rows,
    ).toEqual([{ known_version_id: 'version-1' }]);
  });
});
