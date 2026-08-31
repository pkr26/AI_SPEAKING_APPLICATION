import { randomUUID } from 'crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  retain: vi.fn(async (_scope: string, _userId: string, _audioKey: string, _versionId: string) => undefined),
  sweep: vi.fn(async (_scope: string, _audioKey: string) => 0),
  playback: vi.fn(async () => 'https://example.invalid/playback'),
}));

vi.mock('../src/audio-upload', async (importOriginal) => ({
  // Spread the real module so app wiring (e.g. the /ready storage probe) keeps
  // its imports, then stub only the storage primitives these tests drive.
  ...(await importOriginal<typeof import('../src/audio-upload')>()),
  retainPresignedAudioVersion: storage.retain,
  sweepPresignedAudioVersions: storage.sweep,
  createPresignedRecordingPlaybackUrl: storage.playback,
}));

import { config } from '../src/config';
import { pool } from '../src/db';
import { logger } from '../src/logger';
import { recordingMaintenanceTotal } from '../src/metrics';
import { insertRetainedRecording, type RecordingCapture } from '../src/recording-store';
import {
  RETENTION_MAX_ATTEMPTS,
  recordingBulkCleanupBatchSql,
  runRecordingMaintenance,
  tryRetainRecording,
} from '../src/recordings';
import { app, registerUser } from './helpers';

const configuredMaintenanceConcurrency = config.recordings.maintenanceConcurrency;

async function createUserAndQuestion() {
  const user = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, native_language)
     VALUES ('Maintenance User', $1, 'not-used', 'te') RETURNING id`,
    [`maintenance-${randomUUID()}@example.com`],
  );
  const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
  return { userId: user.rows[0].id, questionId: question.rows[0].id };
}

async function createPendingRecording(storageScope: 'diagnostic' | 'practice' = 'diagnostic') {
  const { userId, questionId } = await createUserAndQuestion();
  const id = randomUUID();
  const audioKey = `audio-uploads/${storageScope}/${userId}/${randomUUID()}.m4a`;
  await pool.query(
    `INSERT INTO recordings (
       id, user_id, request_id, question_id, context, storage_scope, audio_key,
       s3_version_id, content_type, size_bytes, recording_retention_epoch
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'v1', 'audio/mp4', 1000,
               (SELECT recording_retention_epoch FROM users WHERE id = $2))`,
    [
      id,
      userId,
      randomUUID(),
      questionId,
      storageScope === 'diagnostic' ? 'diagnostic' : 'practice',
      storageScope,
      audioKey,
    ],
  );
  return { id, userId, questionId, audioKey };
}

async function maintenanceMetric(operation: 'retention' | 'deletion', outcome: 'ok' | 'error') {
  const metric = await recordingMaintenanceTotal.get();
  return (
    metric.values.find((value) => value.labels.operation === operation && value.labels.outcome === outcome)?.value ?? 0
  );
}

beforeEach(() => {
  storage.retain.mockReset().mockResolvedValue(undefined);
  storage.sweep.mockReset().mockResolvedValue(0);
});

afterEach(() => {
  config.recordings.maintenanceConcurrency = configuredMaintenanceConcurrency;
  vi.restoreAllMocks();
});

afterAll(async () => {
  await pool.end();
});

describe('recording maintenance leases', () => {
  it('builds only validated, literal-bounded bulk cleanup statements', () => {
    expect(recordingBulkCleanupBatchSql(1)).toContain('LIMIT 1');
    expect(recordingBulkCleanupBatchSql(500)).toContain('LIMIT 500');
    for (const invalid of [0, 1.5, 501, Number.NaN]) {
      expect(() => recordingBulkCleanupBatchSql(invalid)).toThrow(
        'recording cleanup batch size must be an integer between 1 and 500',
      );
    }
  });

  it('never retains a bulk-hidden generation and converts it to a durable deletion job', async () => {
    const cleanupClient = await pool.connect();
    let cleanupLockHeld = false;
    try {
      await cleanupClient.query('SELECT pg_advisory_lock(hashtext($1))', ['janitor:stale-recordings']);
      cleanupLockHeld = true;
      const recording = await createPendingRecording();
      const unqueued = await createPendingRecording();
      await pool.query(
        `WITH owner AS (
           UPDATE users
           SET recording_retention_epoch = recording_retention_epoch + 1
           WHERE id = $1
           RETURNING id, recording_retention_epoch
         )
         INSERT INTO recording_bulk_cleanup_jobs (user_id, cutoff_epoch, enqueued_at)
         SELECT id, recording_retention_epoch, '-infinity'::timestamptz FROM owner`,
        [recording.userId],
      );
      await pool.query(
        `UPDATE users
         SET recording_retention_epoch = recording_retention_epoch + 1
         WHERE id = $1`,
        [unqueued.userId],
      );

      await expect(tryRetainRecording(recording.id)).resolves.toBeUndefined();
      expect(storage.retain).not.toHaveBeenCalled();
      expect((await pool.query('SELECT 1 FROM recordings WHERE id = $1', [recording.id])).rowCount).toBe(1);

      expect((await cleanupClient.query(recordingBulkCleanupBatchSql(1))).rowCount).toBe(1);
      expect((await pool.query('SELECT 1 FROM recordings WHERE id = $1', [recording.id])).rowCount).toBe(0);
      // Discovery is queue-driven: even a synthetic stale row without a queue
      // entry is not found through a global recordings-table scan.
      expect((await pool.query('SELECT 1 FROM recordings WHERE id = $1', [unqueued.id])).rowCount).toBe(1);
      expect(
        (
          await pool.query(
            `SELECT known_version_id
             FROM recording_deletion_jobs
             WHERE storage_scope = 'diagnostic' AND audio_key = $1`,
            [recording.audioKey],
          )
        ).rows,
      ).toEqual([{ known_version_id: 'v1' }]);
      await cleanupClient.query(
        `UPDATE recording_bulk_cleanup_jobs
         SET last_processed_at = NULL, enqueued_at = '-infinity'::timestamptz
         WHERE user_id = $1`,
        [recording.userId],
      );
      expect((await cleanupClient.query(recordingBulkCleanupBatchSql(1))).rowCount).toBe(0);
      expect(
        (await pool.query('SELECT 1 FROM recording_bulk_cleanup_jobs WHERE user_id = $1', [recording.userId])).rowCount,
      ).toBe(0);
      await pool.query('DELETE FROM users WHERE id = $1', [unqueued.userId]);
    } finally {
      if (cleanupLockHeld) {
        await cleanupClient.query('SELECT pg_advisory_unlock(hashtext($1))', ['janitor:stale-recordings']);
      }
      cleanupClient.release();
    }
  });

  it('reclaims an expired lease, retags the exact version, and makes it available', async () => {
    const metricBefore = await maintenanceMetric('retention', 'ok');
    const { userId, questionId } = await createUserAndQuestion();
    const id = randomUUID();
    const audioKey = `audio-uploads/diagnostic/${userId}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recordings (
         id, user_id, request_id, question_id, context, storage_scope, audio_key,
         s3_version_id, content_type, size_bytes, recording_retention_epoch
       ) VALUES ($1, $2, $3, $4, 'diagnostic', 'diagnostic', $5, 'v1', 'audio/mp4', 1000,
                 (SELECT recording_retention_epoch FROM users WHERE id = $2))`,
      [id, userId, randomUUID(), questionId, audioKey],
    );
    await pool.query(
      `UPDATE recordings SET retention_claim_id = $2,
         retention_lease_expires_at = now() - interval '1 second' WHERE id = $1`,
      [id, randomUUID()],
    );

    await expect(runRecordingMaintenance()).resolves.toBe(0);
    expect(storage.retain).toHaveBeenCalledWith('diagnostic', userId, audioKey, 'v1');
    const stored = await pool.query('SELECT status, available_at FROM recordings WHERE id = $1', [id]);
    expect(stored.rows[0]).toMatchObject({ status: 'available', available_at: expect.any(Date) });
    expect((await maintenanceMetric('retention', 'ok')) - metricBefore).toBe(storage.retain.mock.calls.length);
  });

  it('deletes a quiet-period tombstone only after an exact-key sweep proves empty', async () => {
    const metricBefore = await maintenanceMetric('deletion', 'ok');
    const key = `audio-uploads/practice/${randomUUID()}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recording_deletion_jobs (
         storage_scope, audio_key, known_version_id, finalize_after
       ) VALUES ('practice', $1, 'v1', now() - interval '1 second')`,
      [key],
    );

    await expect(runRecordingMaintenance()).resolves.toBeGreaterThanOrEqual(1);
    expect(storage.sweep).toHaveBeenCalledWith('practice', key);
    expect(
      (
        await pool.query('SELECT 1 FROM recording_deletion_jobs WHERE storage_scope = $1 AND audio_key = $2', [
          'practice',
          key,
        ])
      ).rowCount,
    ).toBe(0);
    expect((await maintenanceMetric('deletion', 'ok')) - metricBefore).toBe(1);
  });

  it('keeps failed retention pending, clears its lease, and schedules backoff', async () => {
    const metricBefore = await maintenanceMetric('retention', 'error');
    const { userId, questionId } = await createUserAndQuestion();
    const id = randomUUID();
    await pool.query(
      `INSERT INTO recordings (
         id, user_id, request_id, question_id, context, storage_scope, audio_key,
         s3_version_id, content_type, size_bytes, recording_retention_epoch
       ) VALUES ($1, $2, $3, $4, 'diagnostic', 'diagnostic', $5, 'v1', 'audio/mp4', 1000,
                 (SELECT recording_retention_epoch FROM users WHERE id = $2))`,
      [id, userId, randomUUID(), questionId, `audio-uploads/diagnostic/${userId}/${randomUUID()}.m4a`],
    );
    storage.retain.mockRejectedValueOnce(Object.assign(new Error('tagging failed'), { name: 'AccessDenied' }));

    await expect(runRecordingMaintenance()).resolves.toBe(0);
    const row = await pool.query(
      `SELECT status, retention_claim_id, retention_lease_expires_at,
              retention_attempts, last_retention_error_code,
              EXTRACT(EPOCH FROM next_retention_attempt_at - now()) AS retry_in_seconds
       FROM recordings WHERE id = $1`,
      [id],
    );
    expect(row.rows[0]).toMatchObject({
      status: 'retention_pending',
      retention_claim_id: null,
      retention_lease_expires_at: null,
      retention_attempts: 1,
      last_retention_error_code: 'AccessDenied',
    });
    expect(Number(row.rows[0].retry_in_seconds)).toBeGreaterThanOrEqual(8);
    expect(Number(row.rows[0].retry_in_seconds)).toBeLessThanOrEqual(11);
    expect((await maintenanceMetric('retention', 'error')) - metricBefore).toBe(1);
  });

  it('keeps a job after deleting versions and through its pre-final quiet period', async () => {
    const key = `audio-uploads/practice/${randomUUID()}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recording_deletion_jobs (
         storage_scope, audio_key, known_version_id, finalize_after
       ) VALUES ('practice', $1, 'v1', now() + interval '10 minutes')`,
      [key],
    );
    storage.sweep.mockResolvedValueOnce(1);

    await expect(runRecordingMaintenance()).resolves.toBe(0);
    const job = await pool.query(
      `SELECT claim_id, lease_expires_at, next_attempt_at >= finalize_after AS waits_for_final_sweep
       FROM recording_deletion_jobs WHERE storage_scope = 'practice' AND audio_key = $1`,
      [key],
    );
    expect(job.rows[0]).toEqual({ claim_id: null, lease_expires_at: null, waits_for_final_sweep: true });
  });

  it('does not finalize an already-empty job before the grant-reuse quiet period', async () => {
    const key = `audio-uploads/diagnostic/${randomUUID()}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recording_deletion_jobs (
         storage_scope, audio_key, known_version_id, finalize_after
       ) VALUES ('diagnostic', $1, 'v1', now() + interval '10 minutes')`,
      [key],
    );
    storage.sweep.mockResolvedValueOnce(0);

    await expect(runRecordingMaintenance()).resolves.toBe(0);
    expect(
      (
        await pool.query(
          `SELECT claim_id, lease_expires_at FROM recording_deletion_jobs
           WHERE storage_scope = 'diagnostic' AND audio_key = $1`,
          [key],
        )
      ).rows,
    ).toEqual([{ claim_id: null, lease_expires_at: null }]);
  });

  it('keeps a failed deletion job durable, clears its lease, and schedules retry', async () => {
    const metricBefore = await maintenanceMetric('deletion', 'error');
    const key = `audio-uploads/practice/${randomUUID()}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recording_deletion_jobs (
         storage_scope, audio_key, known_version_id, finalize_after
       ) VALUES ('practice', $1, 'v1', now() - interval '1 second')`,
      [key],
    );
    storage.sweep.mockRejectedValueOnce(Object.assign(new Error('delete failed'), { name: 'ServiceUnavailable' }));

    await expect(runRecordingMaintenance()).resolves.toBe(0);
    const job = await pool.query(
      `SELECT claim_id, lease_expires_at, attempt_count, last_error_code,
              EXTRACT(EPOCH FROM next_attempt_at - now()) AS retry_in_seconds
       FROM recording_deletion_jobs WHERE storage_scope = 'practice' AND audio_key = $1`,
      [key],
    );
    expect(job.rows[0]).toMatchObject({
      claim_id: null,
      lease_expires_at: null,
      attempt_count: 1,
      last_error_code: 'ServiceUnavailable',
    });
    expect(Number(job.rows[0].retry_in_seconds)).toBeGreaterThanOrEqual(8);
    expect(Number(job.rows[0].retry_in_seconds)).toBeLessThanOrEqual(11);
    expect((await maintenanceMetric('deletion', 'error')) - metricBefore).toBe(1);
  });

  it('processes every claimed recording exactly once without exceeding the configured concurrency', async () => {
    config.recordings.maintenanceConcurrency = 2;
    const recordings = await Promise.all(Array.from({ length: 5 }, () => createPendingRecording()));
    const seenKeys: string[] = [];
    let active = 0;
    let maxActive = 0;
    storage.retain.mockImplementation(async (_scope, _userId, audioKey: string) => {
      seenKeys.push(audioKey);
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      active--;
    });

    await expect(runRecordingMaintenance()).resolves.toBe(0);

    expect(maxActive).toBe(2);
    expect([...seenKeys].sort()).toEqual(recordings.map(({ audioKey }) => audioKey).sort());
    const stored = await pool.query<{ id: string; status: string }>(
      'SELECT id, status FROM recordings WHERE id = ANY($1::uuid[]) ORDER BY id',
      [recordings.map(({ id }) => id)],
    );
    expect(stored.rows).toHaveLength(5);
    expect(stored.rows.every(({ status }) => status === 'available')).toBe(true);
  });

  it('does nothing for an unknown targeted recording instead of invoking storage or warning', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    await expect(tryRetainRecording(randomUUID())).resolves.toBeUndefined();

    expect(storage.retain).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('claims the requested retention row instead of the oldest unrelated pending row', async () => {
    const distractor = await createPendingRecording();
    const target = await createPendingRecording();
    await pool.query(
      `UPDATE recordings
       SET next_retention_attempt_at = CASE id
         WHEN $1::uuid THEN '2000-01-01T00:00:00Z'::timestamptz
         WHEN $2::uuid THEN '2000-01-02T00:00:00Z'::timestamptz
       END
       WHERE id = ANY($3::uuid[])`,
      [distractor.id, target.id, [distractor.id, target.id]],
    );

    await expect(tryRetainRecording(target.id)).resolves.toBeUndefined();

    expect(storage.retain).toHaveBeenCalledOnce();
    expect(storage.retain).toHaveBeenCalledWith('diagnostic', target.userId, target.audioKey, 'v1');
    expect((await pool.query('SELECT status FROM recordings WHERE id = $1', [distractor.id])).rows).toEqual([
      { status: 'retention_pending' },
    ]);
    await pool.query("UPDATE recordings SET next_retention_attempt_at = now() + interval '1 day' WHERE id = $1", [
      distractor.id,
    ]);
  });

  it('leaves targeted retention durable and logs the exact failure context', async () => {
    const recording = await createPendingRecording();
    const failure = Object.assign(new Error('tagging failed'), { name: 'AccessDenied' });
    storage.retain.mockRejectedValueOnce(failure);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);

    await expect(tryRetainRecording(recording.id)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      { err: failure, recordingId: recording.id },
      'recording retention tagging failed; durable retry remains pending',
    );
    expect((await pool.query('SELECT status FROM recordings WHERE id = $1', [recording.id])).rows).toEqual([
      { status: 'retention_pending' },
    ]);
  });

  it('keeps targeted retention best-effort even when warning serialization throws', async () => {
    const recording = await createPendingRecording();
    storage.retain.mockRejectedValueOnce(new Error('tagging failed'));
    vi.spyOn(logger, 'warn').mockImplementation(() => {
      throw new Error('logger failed');
    });

    await expect(tryRetainRecording(recording.id)).resolves.toBeUndefined();
  });

  it('stores the stable fallback code for non-Error retention failures', async () => {
    const recording = await createPendingRecording();
    storage.retain.mockRejectedValueOnce('raw provider failure');

    await expect(runRecordingMaintenance()).resolves.toBe(0);

    expect(
      (await pool.query('SELECT last_retention_error_code FROM recordings WHERE id = $1', [recording.id])).rows,
    ).toEqual([{ last_retention_error_code: 'S3_ERROR' }]);
  });

  it('finalizes an empty deletion sweep at the exact quiet-period boundary', async () => {
    const key = `audio-uploads/diagnostic/${randomUUID()}/${randomUUID()}.m4a`;
    const finalizeAt = new Date(Date.now() + 30_000);
    await pool.query(
      `INSERT INTO recording_deletion_jobs (
         storage_scope, audio_key, known_version_id, finalize_after
       ) VALUES ('diagnostic', $1, 'v1', $2)`,
      [key, finalizeAt],
    );
    vi.spyOn(Date, 'now').mockReturnValue(finalizeAt.getTime());

    await expect(runRecordingMaintenance()).resolves.toBeGreaterThanOrEqual(1);

    expect(
      (
        await pool.query(
          "SELECT 1 FROM recording_deletion_jobs WHERE storage_scope = 'diagnostic' AND audio_key = $1",
          [key],
        )
      ).rowCount,
    ).toBe(0);
  });

  it('keeps a final-window tombstone when the sweep still removed a version', async () => {
    const key = `audio-uploads/practice/${randomUUID()}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recording_deletion_jobs (
         storage_scope, audio_key, known_version_id, finalize_after
       ) VALUES ('practice', $1, 'v1', now() - interval '1 second')`,
      [key],
    );
    storage.sweep.mockResolvedValueOnce(1);

    await expect(runRecordingMaintenance()).resolves.toBe(0);

    expect(
      (
        await pool.query(
          `SELECT claim_id, lease_expires_at, next_attempt_at > now() AS retry_scheduled
           FROM recording_deletion_jobs WHERE storage_scope = 'practice' AND audio_key = $1`,
          [key],
        )
      ).rows,
    ).toEqual([{ claim_id: null, lease_expires_at: null, retry_scheduled: true }]);
  });

  it('stores the stable fallback code for non-Error deletion failures', async () => {
    const key = `audio-uploads/practice/${randomUUID()}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recording_deletion_jobs (
         storage_scope, audio_key, known_version_id, finalize_after
       ) VALUES ('practice', $1, 'v1', now() - interval '1 second')`,
      [key],
    );
    storage.sweep.mockRejectedValueOnce('raw provider failure');

    await expect(runRecordingMaintenance()).resolves.toBe(0);

    expect(
      (
        await pool.query(
          `SELECT last_error_code FROM recording_deletion_jobs
           WHERE storage_scope = 'practice' AND audio_key = $1`,
          [key],
        )
      ).rows,
    ).toEqual([{ last_error_code: 'S3_ERROR' }]);
  });
});

describe('terminal retention transitions', () => {
  it('marks a recording unavailable once the exact S3 version is provably gone', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const a = app();
    const { res: registered } = await registerUser(a);
    const userId = registered.body.user.id as string;
    const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
    const id = randomUUID();
    const audioKey = `audio-uploads/diagnostic/${userId}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recordings (
         id, user_id, request_id, question_id, context, storage_scope, audio_key,
         s3_version_id, content_type, size_bytes, recording_retention_epoch
       ) VALUES ($1, $2, $3, $4, 'diagnostic', 'diagnostic', $5, 'v1', 'audio/mp4', 1000,
                 (SELECT recording_retention_epoch FROM users WHERE id = $2))`,
      [id, userId, randomUUID(), question.rows[0].id, audioKey],
    );
    storage.retain.mockRejectedValueOnce(Object.assign(new Error('version expired'), { name: 'NoSuchVersion' }));

    await expect(tryRetainRecording(id)).resolves.toBeUndefined();

    expect(storage.retain).toHaveBeenCalledWith('diagnostic', userId, audioKey, 'v1');
    const row = await pool.query(
      `SELECT status, last_retention_error_code, retention_claim_id, retention_lease_expires_at,
              retention_attempts
       FROM recordings WHERE id = $1`,
      [id],
    );
    expect(row.rows[0]).toMatchObject({
      status: 'unavailable',
      last_retention_error_code: 'NoSuchVersion',
      retention_claim_id: null,
      retention_lease_expires_at: null,
      retention_attempts: 1,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ recordingId: id, errorCode: 'NoSuchVersion' }),
      'recording retention can never succeed; metadata marked unavailable',
    );

    // No further retry is scheduled: neither a targeted attempt nor a full
    // maintenance tick can claim a row that has left retention_pending.
    storage.retain.mockClear();
    await expect(tryRetainRecording(id)).resolves.toBeUndefined();
    await expect(runRecordingMaintenance()).resolves.toBeGreaterThanOrEqual(0);
    expect(storage.retain).not.toHaveBeenCalledWith('diagnostic', userId, audioKey, 'v1');

    const playback = await request(a)
      .post(`/recordings/${id}/playback-url`)
      .set('Authorization', `Bearer ${registered.body.token as string}`);
    expect(playback.status).toBe(404);
    expect(playback.body).toEqual({ error: 'Recording not found', code: 'NOT_FOUND' });
  });

  it('marks a recording unavailable when persistent generic failures exhaust the retry budget', async () => {
    const recording = await createPendingRecording();
    // One claim below the terminal budget: this attempt's claim increments the
    // counter onto exactly RETENTION_MAX_ATTEMPTS.
    await pool.query('UPDATE recordings SET retention_attempts = $2 WHERE id = $1', [
      recording.id,
      RETENTION_MAX_ATTEMPTS - 1,
    ]);
    storage.retain.mockRejectedValue(Object.assign(new Error('still denied'), { name: 'AccessDenied' }));

    await expect(tryRetainRecording(recording.id)).resolves.toBeUndefined();

    expect(
      (await pool.query('SELECT status, last_retention_error_code FROM recordings WHERE id = $1', [recording.id])).rows,
    ).toEqual([{ status: 'unavailable', last_retention_error_code: 'AccessDenied' }]);
  });

  it('still schedules capped backoff one attempt below the terminal budget', async () => {
    const recording = await createPendingRecording();
    await pool.query('UPDATE recordings SET retention_attempts = $2 WHERE id = $1', [
      recording.id,
      RETENTION_MAX_ATTEMPTS - 2,
    ]);
    storage.retain.mockRejectedValueOnce(Object.assign(new Error('still denied'), { name: 'AccessDenied' }));

    await expect(tryRetainRecording(recording.id)).resolves.toBeUndefined();

    const row = await pool.query(
      `SELECT status, retention_attempts, retention_claim_id,
              EXTRACT(EPOCH FROM next_retention_attempt_at - now()) AS retry_in_seconds
       FROM recordings WHERE id = $1`,
      [recording.id],
    );
    expect(row.rows[0]).toMatchObject({
      status: 'retention_pending',
      retention_attempts: RETENTION_MAX_ATTEMPTS - 1,
      retention_claim_id: null,
    });
    expect(Number(row.rows[0].retry_in_seconds)).toBeGreaterThan(0);
  });

  it('hides terminally unavailable metadata from the list and export pages', async () => {
    const a = app();
    const { res: registered } = await registerUser(a);
    const userId = registered.body.user.id as string;
    const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
    const insertForOwner = async (status: 'available' | 'retention_pending' | 'unavailable') => {
      const id = randomUUID();
      await pool.query(
        `INSERT INTO recordings (
           id, user_id, request_id, question_id, context, storage_scope, audio_key,
           s3_version_id, content_type, size_bytes, duration_ms, status, available_at,
           recording_retention_epoch
         ) VALUES ($1, $2, $3, $4, 'practice-native', 'practice', $5, 'version-1',
                   'audio/mp4', 12345, 7200, $6, CASE WHEN $6 = 'available' THEN now() ELSE NULL END,
                   (SELECT recording_retention_epoch FROM users WHERE id = $2))`,
        [id, userId, randomUUID(), question.rows[0].id, `audio-uploads/practice/${userId}/${randomUUID()}.m4a`, status],
      );
      return id;
    };
    const availableId = await insertForOwner('available');
    const pendingId = await insertForOwner('retention_pending');
    const unavailableId = await insertForOwner('unavailable');
    const authorization = { Authorization: `Bearer ${registered.body.token as string}` };

    const list = await request(a).get('/recordings?limit=50').set(authorization);
    expect(list.status).toBe(200);
    expect(list.body.items.map((item: { id: string }) => item.id)).not.toContain(unavailableId);
    // retention_pending rows stay exposed exactly as before; only the enum
    // value no old client has ever received is held back.
    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([availableId, pendingId]),
    );

    const exported = await request(a).get('/recordings/export?limit=500').set(authorization);
    expect(exported.status).toBe(200);
    expect(exported.body.recordings.map((item: { id: string }) => item.id)).not.toContain(unavailableId);
    expect(exported.body.recordings.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([availableId, pendingId]),
    );
  });
});

describe('retained recording insertion contract', () => {
  const capture: RecordingCapture = {
    id: '6d3d43f4-981e-4cbd-8882-d4d4cbf9d32a',
    storageScope: 'practice',
    audioKey: 'audio-uploads/practice/owner/audio.m4a',
    s3VersionId: 'version-1',
    contentType: 'audio/mp4',
    sizeBytes: 1234,
  };

  it('rejects a capture that does not belong to the authoritative assessment audio before querying', async () => {
    const query = vi.fn();

    await expect(
      insertRetainedRecording(
        { query },
        randomUUID(),
        randomUUID(),
        randomUUID(),
        'practice',
        'audio-uploads/practice/owner/other.m4a',
        capture,
      ),
    ).rejects.toThrow('recording capture does not match the assessment audio owner');
    expect(query).not.toHaveBeenCalled();
  });

  it('fails closed when the metadata insert does not affect exactly one row', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0 });

    await expect(
      insertRetainedRecording(
        { query },
        randomUUID(),
        randomUUID(),
        randomUUID(),
        'practice',
        capture.audioKey,
        capture,
      ),
    ).rejects.toThrow('failed to insert retained recording metadata');
    expect(query).toHaveBeenCalledOnce();
  });

  it('binds optional capture fields as null in the successful insert', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const userId = randomUUID();
    const requestId = randomUUID();
    const questionId = randomUUID();

    await expect(
      insertRetainedRecording({ query }, userId, requestId, questionId, 'practice', capture.audioKey, capture),
    ).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO recordings'), [
      capture.id,
      userId,
      requestId,
      null,
      questionId,
      'practice',
      'practice',
      capture.audioKey,
      'version-1',
      'audio/mp4',
      1234,
      null,
      null,
    ]);
  });
});
