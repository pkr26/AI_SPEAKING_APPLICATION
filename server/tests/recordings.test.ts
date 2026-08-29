import { randomUUID } from 'crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getSignedUrlMock } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn().mockResolvedValue('https://private.example.invalid/short-lived-playback'),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: getSignedUrlMock }));

import { config } from '../src/config';
import { logger } from '../src/logger';
import { recordingBulkCleanupBatchSql } from '../src/recordings';
import { app, pool, registerUser } from './helpers';

config.s3.practice.bucket = 'private-practice-recordings';
config.s3.practice.region = 'us-east-1';

async function createRecording(
  userId: string,
  status: 'retention_pending' | 'available' = 'available',
  options: { createdAt?: Date; attemptId?: string } = {},
) {
  const question = await pool.query<{ id: string }>("SELECT id FROM questions WHERE cefr_level = 'A1' LIMIT 1");
  const id = randomUUID();
  const requestId = randomUUID();
  const audioKey = `audio-uploads/practice/${userId}/${randomUUID()}.m4a`;
  await pool.query(
    `INSERT INTO recordings (
       id, user_id, request_id, question_id, context, storage_scope, audio_key,
       s3_version_id, content_type, size_bytes, duration_ms, status, available_at,
       recording_retention_epoch
     ) VALUES ($1, $2, $3, $4, 'practice-native', 'practice', $5, 'version-1',
               'audio/mp4', 12345, 7200, $6, CASE WHEN $6 = 'available' THEN now() ELSE NULL END,
               (SELECT recording_retention_epoch FROM users WHERE id = $2))`,
    [id, userId, requestId, question.rows[0].id, audioKey, status],
  );
  if (options.createdAt !== undefined || options.attemptId !== undefined) {
    await pool.query(
      `UPDATE recordings
       SET created_at = COALESCE($2, created_at), attempt_id = COALESCE($3, attempt_id)
       WHERE id = $1`,
      [id, options.createdAt ?? null, options.attemptId ?? null],
    );
  }
  return { id, requestId, audioKey, questionId: question.rows[0].id };
}

beforeEach(() => {
  getSignedUrlMock.mockReset().mockResolvedValue('https://private.example.invalid/short-lived-playback');
});

afterEach(() => {
  vi.restoreAllMocks();
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

    const trailingSlashExport = await request(a)
      .get('/recordings/export/?limit=500')
      .set('Authorization', `Bearer ${token}`);
    expect(trailingSlashExport.status).toBe(200);
    expect(trailingSlashExport.body.recordings[0]).toMatchObject({ id: recording.id });
    expect(trailingSlashExport.body).not.toHaveProperty('items');
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
    expect(notReady.body).toEqual({
      error: 'Recording is not ready yet',
      code: 'REQUEST_IN_FLIGHT',
      retryAfterSeconds: 5,
    });
    expect(notReady.headers['retry-after']).toBe('5');

    const foreign = await request(a)
      .post(`/recordings/${available.id}/playback-url`)
      .set('Authorization', `Bearer ${stranger.res.body.token}`);
    expect(foreign.status).toBe(404);
    expect(foreign.body).toEqual({ error: 'Recording not found', code: 'NOT_FOUND' });
  });

  it('paginates owner records without gaps, duplicates, or foreign metadata in either direction', async () => {
    const a = app();
    const owner = await registerUser(a);
    const stranger = await registerUser(a);
    const baseTime = Date.now() - 60_000;
    const recordings = await Promise.all(
      [0, 1, 2].map((offset) =>
        createRecording(owner.res.body.user.id, 'available', { createdAt: new Date(baseTime + offset * 1_000) }),
      ),
    );
    const foreign = await createRecording(stranger.res.body.user.id, 'available', {
      createdAt: new Date(baseTime + 4_000),
    });
    const authorization = { Authorization: `Bearer ${owner.res.body.token}` };

    const newestPage = await request(a).get('/recordings?limit=2').set(authorization);
    expect(newestPage.status).toBe(200);
    expect(newestPage.body.items.map(({ id }: { id: string }) => id)).toEqual([recordings[2].id, recordings[1].id]);
    expect(newestPage.body.nextCursor).toBe(recordings[1].id);
    const olderPage = await request(a)
      .get(`/recordings?limit=2&cursor=${newestPage.body.nextCursor}`)
      .set(authorization);
    expect(olderPage.status).toBe(200);
    expect(olderPage.body.items.map(({ id }: { id: string }) => id)).toEqual([recordings[0].id]);
    expect(olderPage.body.nextCursor).toBeNull();

    const exactList = await request(a).get('/recordings?limit=3').set(authorization);
    expect(exactList.status).toBe(200);
    expect(exactList.body.items.map(({ id }: { id: string }) => id)).toEqual([
      recordings[2].id,
      recordings[1].id,
      recordings[0].id,
    ]);
    expect(exactList.body.nextCursor).toBeNull();

    const oldestPage = await request(a).get('/recordings/export?limit=2').set(authorization);
    expect(oldestPage.status).toBe(200);
    expect(oldestPage.body.recordings.map(({ id }: { id: string }) => id)).toEqual([
      recordings[0].id,
      recordings[1].id,
    ]);
    expect(oldestPage.body.nextCursor).toBe(recordings[1].id);
    const newerPage = await request(a)
      .get(`/recordings/export?limit=2&cursor=${oldestPage.body.nextCursor}`)
      .set(authorization);
    expect(newerPage.status).toBe(200);
    expect(newerPage.body.recordings.map(({ id }: { id: string }) => id)).toEqual([recordings[2].id]);
    expect(newerPage.body.nextCursor).toBeNull();

    const exactExport = await request(a).get('/recordings/export?limit=3').set(authorization);
    expect(exactExport.status).toBe(200);
    expect(exactExport.body.recordings.map(({ id }: { id: string }) => id)).toEqual([
      recordings[0].id,
      recordings[1].id,
      recordings[2].id,
    ]);
    expect(exactExport.body.nextCursor).toBeNull();
    expect(JSON.stringify([newestPage.body, olderPage.body, oldestPage.body, newerPage.body])).not.toContain(
      foreign.id,
    );
  });

  it('rejects unknown and foreign cursors with the exact stable list/export contracts', async () => {
    const a = app();
    const owner = await registerUser(a);
    const stranger = await registerUser(a);
    const foreign = await createRecording(stranger.res.body.user.id);
    const authorization = { Authorization: `Bearer ${owner.res.body.token}` };

    const unknownList = await request(a).get(`/recordings?cursor=${randomUUID()}`).set(authorization);
    expect(unknownList.status).toBe(400);
    expect(unknownList.body).toEqual({ error: 'Invalid recording cursor', code: 'VALIDATION_FAILED' });

    const foreignList = await request(a).get(`/recordings?cursor=${foreign.id}`).set(authorization);
    expect(foreignList.status).toBe(400);
    expect(foreignList.body).toEqual({ error: 'Invalid recording cursor', code: 'VALIDATION_FAILED' });

    const unknownExport = await request(a).get(`/recordings/export?cursor=${randomUUID()}`).set(authorization);
    expect(unknownExport.status).toBe(400);
    expect(unknownExport.body).toEqual({ error: 'Invalid recording export cursor', code: 'VALIDATION_FAILED' });

    const foreignExport = await request(a).get(`/recordings/export?cursor=${foreign.id}`).set(authorization);
    expect(foreignExport.status).toBe(400);
    expect(foreignExport.body).toEqual({ error: 'Invalid recording export cursor', code: 'VALIDATION_FAILED' });
  });

  it('validates route UUIDs and the larger export limit at their exact boundaries', async () => {
    const a = app();
    const owner = await registerUser(a);
    const authorization = { Authorization: `Bearer ${owner.res.body.token}` };
    const invalidId = await request(a).post('/recordings/not-a-uuid/playback-url').set(authorization);
    expect(invalidId.status).toBe(400);
    expect(invalidId.body).toEqual({
      error: 'id: recording id must be a valid UUID',
      code: 'VALIDATION_FAILED',
    });
    const invalidDelete = await request(a).delete('/recordings/not-a-uuid').set(authorization);
    expect(invalidDelete.status).toBe(400);
    expect(invalidDelete.body).toEqual({
      error: 'id: recording id must be a valid UUID',
      code: 'VALIDATION_FAILED',
    });
    const invalidListCursor = await request(a).get('/recordings?cursor=not-a-uuid').set(authorization);
    expect(invalidListCursor.status).toBe(400);
    expect(invalidListCursor.body).toEqual({
      error: 'cursor: cursor must be a valid UUID',
      code: 'VALIDATION_FAILED',
    });
    const invalidExportCursor = await request(a).get('/recordings/export?cursor=not-a-uuid').set(authorization);
    expect(invalidExportCursor.status).toBe(400);
    expect(invalidExportCursor.body).toEqual({
      error: 'cursor: cursor must be a valid UUID',
      code: 'VALIDATION_FAILED',
    });

    expect((await request(a).get('/recordings/export?limit=499').set(authorization)).status).toBe(200);
    expect((await request(a).get('/recordings/export?limit=501').set(authorization)).status).toBe(400);
  });

  it('returns the stable provider failure and exact warning context when playback signing fails', async () => {
    const a = app();
    const owner = await registerUser(a);
    const recording = await createRecording(owner.res.body.user.id);
    const failure = Object.assign(new Error('signing failed'), { name: 'CredentialsProviderError' });
    getSignedUrlMock.mockRejectedValueOnce(failure);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    const response = await request(a)
      .post(`/recordings/${recording.id}/playback-url`)
      .set('Authorization', `Bearer ${owner.res.body.token}`);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: 'Recording storage unavailable; please try again',
      code: 'PROVIDER_FAILED',
    });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      { err: failure, recordingId: recording.id },
      'failed to issue recording playback URL',
    );
  });

  it('preserves the playback provider contract when warning serialization itself throws', async () => {
    const a = app();
    const owner = await registerUser(a);
    const recording = await createRecording(owner.res.body.user.id);
    getSignedUrlMock.mockRejectedValueOnce(new Error('signing failed'));
    vi.spyOn(logger, 'warn').mockImplementation(() => {
      throw new Error('logger failed');
    });

    const response = await request(a)
      .post(`/recordings/${recording.id}/playback-url`)
      .set('Authorization', `Bearer ${owner.res.body.token}`);

    expect(response.status).toBe(502);
    expect(response.body).toEqual({
      error: 'Recording storage unavailable; please try again',
      code: 'PROVIDER_FAILED',
    });
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

  it('bulk-hides only the owner recordings and durably queues bounded cleanup batches', async () => {
    const cleanupClient = await pool.connect();
    let cleanupLockHeld = false;
    try {
      // Hold the production janitor's advisory key on this session and execute
      // its exact batch SQL through the same lease. This makes the assertions
      // deterministic even if another test file/process attempts maintenance.
      await cleanupClient.query('SELECT pg_advisory_lock(hashtext($1))', ['janitor:stale-recordings']);
      cleanupLockHeld = true;

      // Other suites deliberately leave bulk-hidden metadata for maintenance.
      // Drain that shared-database backlog so the batch-size assertions below
      // measure this owner's two rows rather than scheduler order across files.
      for (let pass = 0; pass < 20; pass++) {
        const queued = await pool.query('SELECT 1 FROM recording_bulk_cleanup_jobs LIMIT 1');
        if (queued.rowCount === 0) break;
        await cleanupClient.query(recordingBulkCleanupBatchSql(50));
      }
      expect((await pool.query('SELECT 1 FROM recording_bulk_cleanup_jobs LIMIT 1')).rowCount).toBe(0);

      const a = app();
      const owner = await registerUser(a);
      const stranger = await registerUser(a);
      const first = await createRecording(owner.res.body.user.id);
      const second = await createRecording(owner.res.body.user.id, 'retention_pending');
      const foreign = await createRecording(stranger.res.body.user.id);
      const authorization = { Authorization: `Bearer ${owner.res.body.token}` };

      const deleted = await request(a).delete('/recordings').set(authorization);
      expect(deleted.status).toBe(204);
      expect(deleted.headers['cache-control']).toContain('no-store');
      expect(
        (
          await pool.query<{ recording_retention_epoch: string }>(
            'SELECT recording_retention_epoch FROM users WHERE id = $1',
            [owner.res.body.user.id],
          )
        ).rows,
      ).toEqual([{ recording_retention_epoch: '1' }]);
      expect(
        (
          await pool.query<{ cutoff_epoch: string }>(
            'SELECT cutoff_epoch FROM recording_bulk_cleanup_jobs WHERE user_id = $1',
            [owner.res.body.user.id],
          )
        ).rows,
      ).toEqual([{ cutoff_epoch: '1' }]);

      // Repeating delete-all coalesces into the same durable owner job and moves
      // only its guarded cutoff; it never creates an unbounded queue per epoch.
      expect((await request(a).delete('/recordings').set(authorization)).status).toBe(204);
      expect(
        (
          await pool.query<{ recording_retention_epoch: string }>(
            'SELECT recording_retention_epoch FROM users WHERE id = $1',
            [owner.res.body.user.id],
          )
        ).rows,
      ).toEqual([{ recording_retention_epoch: '2' }]);
      expect(
        (
          await pool.query<{ cutoff_epoch: string }>(
            'SELECT cutoff_epoch FROM recording_bulk_cleanup_jobs WHERE user_id = $1',
            [owner.res.body.user.id],
          )
        ).rows,
      ).toEqual([{ cutoff_epoch: '2' }]);

      // Logical deletion is immediate even though physical metadata remains as
      // the durable source for bounded outbox creation.
      const hiddenList = await request(a).get('/recordings').set(authorization);
      const hiddenExport = await request(a).get('/recordings/export').set(authorization);
      const hiddenPlayback = await request(a).post(`/recordings/${first.id}/playback-url`).set(authorization);
      expect(hiddenList.body).toEqual({ items: [], nextCursor: null });
      expect(hiddenExport.body).toEqual({ recordings: [], nextCursor: null });
      expect(hiddenPlayback.status).toBe(404);
      expect(
        (await pool.query('SELECT id FROM recordings WHERE user_id = $1', [owner.res.body.user.id])).rowCount,
      ).toBe(2);
      expect(
        (
          await pool.query(
            `SELECT 1
           FROM recording_deletion_jobs
           WHERE audio_key = ANY($1::text[])`,
            [[first.audioKey, second.audioKey]],
          )
        ).rowCount,
      ).toBe(0);

      const prioritizeOwnerCleanup = () =>
        cleanupClient.query(
          `UPDATE recording_bulk_cleanup_jobs
           SET last_processed_at = NULL, enqueued_at = '-infinity'::timestamptz
           WHERE user_id = $1`,
          [owner.res.body.user.id],
        );
      await prioritizeOwnerCleanup();
      expect((await cleanupClient.query(recordingBulkCleanupBatchSql(1))).rowCount).toBe(1);
      expect(
        (await pool.query('SELECT id FROM recordings WHERE user_id = $1', [owner.res.body.user.id])).rowCount,
      ).toBe(1);
      await prioritizeOwnerCleanup();
      expect((await cleanupClient.query(recordingBulkCleanupBatchSql(1))).rowCount).toBe(1);
      await prioritizeOwnerCleanup();
      expect((await cleanupClient.query(recordingBulkCleanupBatchSql(1))).rowCount).toBe(0);
      expect((await pool.query('SELECT id FROM recordings WHERE user_id = $1', [owner.res.body.user.id])).rows).toEqual(
        [],
      );
      expect(
        (
          await pool.query(
            `SELECT audio_key, known_version_id
           FROM recording_deletion_jobs
           WHERE audio_key = ANY($1::text[])
           ORDER BY audio_key`,
            [[first.audioKey, second.audioKey]],
          )
        ).rows,
      ).toEqual(
        [first.audioKey, second.audioKey].sort().map((audio_key) => ({ audio_key, known_version_id: 'version-1' })),
      );
      expect((await pool.query('SELECT id FROM recordings WHERE id = $1', [foreign.id])).rows).toEqual([
        { id: foreign.id },
      ]);
      expect(
        (await pool.query('SELECT 1 FROM recording_bulk_cleanup_jobs WHERE user_id = $1', [owner.res.body.user.id]))
          .rowCount,
      ).toBe(0);

      expect((await request(a).delete('/recordings').set(authorization)).status).toBe(204);
      expect(
        (
          await pool.query<{ recording_retention_epoch: string }>(
            'SELECT recording_retention_epoch FROM users WHERE id = $1',
            [owner.res.body.user.id],
          )
        ).rows,
      ).toEqual([{ recording_retention_epoch: '3' }]);
      expect(
        (
          await pool.query<{ cutoff_epoch: string }>(
            'SELECT cutoff_epoch FROM recording_bulk_cleanup_jobs WHERE user_id = $1',
            [owner.res.body.user.id],
          )
        ).rows,
      ).toEqual([{ cutoff_epoch: '3' }]);
      await prioritizeOwnerCleanup();
      expect((await cleanupClient.query(recordingBulkCleanupBatchSql(1))).rowCount).toBe(0);
      expect(
        (await pool.query('SELECT 1 FROM recording_bulk_cleanup_jobs WHERE user_id = $1', [owner.res.body.user.id]))
          .rowCount,
      ).toBe(0);
      expect((await pool.query('SELECT id FROM recordings WHERE id = $1', [foreign.id])).rowCount).toBe(1);
    } finally {
      if (cleanupLockHeld) {
        await cleanupClient.query('SELECT pg_advisory_unlock(hashtext($1))', ['janitor:stale-recordings']);
      }
      cleanupClient.release();
    }
  });

  it('requires authentication for bulk recording deletion', async () => {
    const response = await request(app()).delete('/recordings');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'Missing or invalid Authorization header',
      code: 'UNAUTHENTICATED',
    });
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
