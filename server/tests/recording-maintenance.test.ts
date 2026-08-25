import { randomUUID } from 'crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  retain: vi.fn(async () => undefined),
  sweep: vi.fn(async () => 0),
  playback: vi.fn(async () => 'https://example.invalid/playback'),
}));

vi.mock('../src/audio-upload', () => ({
  retainPresignedAudioVersion: storage.retain,
  sweepPresignedAudioVersions: storage.sweep,
  createPresignedRecordingPlaybackUrl: storage.playback,
}));

import { pool } from '../src/db';
import { runRecordingMaintenance } from '../src/recordings';

async function createUserAndQuestion() {
  const user = await pool.query<{ id: string }>(
    `INSERT INTO users (name, email, password_hash, native_language)
     VALUES ('Maintenance User', $1, 'not-used', 'te') RETURNING id`,
    [`maintenance-${randomUUID()}@example.com`],
  );
  const question = await pool.query<{ id: string }>('SELECT id FROM questions LIMIT 1');
  return { userId: user.rows[0].id, questionId: question.rows[0].id };
}

beforeEach(() => {
  storage.retain.mockReset().mockResolvedValue(undefined);
  storage.sweep.mockReset().mockResolvedValue(0);
});

afterAll(async () => {
  await pool.end();
});

describe('recording maintenance leases', () => {
  it('reclaims an expired lease, retags the exact version, and makes it available', async () => {
    const { userId, questionId } = await createUserAndQuestion();
    const id = randomUUID();
    const audioKey = `audio-uploads/diagnostic/${userId}/${randomUUID()}.m4a`;
    await pool.query(
      `INSERT INTO recordings (
         id, user_id, request_id, question_id, context, storage_scope, audio_key,
         s3_version_id, content_type, size_bytes
       ) VALUES ($1, $2, $3, $4, 'diagnostic', 'diagnostic', $5, 'v1', 'audio/mp4', 1000)`,
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
  });

  it('deletes a quiet-period tombstone only after an exact-key sweep proves empty', async () => {
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
  });

  it('keeps failed retention pending, clears its lease, and schedules backoff', async () => {
    const { userId, questionId } = await createUserAndQuestion();
    const id = randomUUID();
    await pool.query(
      `INSERT INTO recordings (
         id, user_id, request_id, question_id, context, storage_scope, audio_key,
         s3_version_id, content_type, size_bytes
       ) VALUES ($1, $2, $3, $4, 'diagnostic', 'diagnostic', $5, 'v1', 'audio/mp4', 1000)`,
      [id, userId, randomUUID(), questionId, `audio-uploads/diagnostic/${userId}/${randomUUID()}.m4a`],
    );
    storage.retain.mockRejectedValueOnce(Object.assign(new Error('tagging failed'), { name: 'AccessDenied' }));

    await expect(runRecordingMaintenance()).resolves.toBe(0);
    const row = await pool.query(
      `SELECT status, retention_claim_id, retention_lease_expires_at,
              retention_attempts, last_retention_error_code,
              next_retention_attempt_at > now() AS backed_off
       FROM recordings WHERE id = $1`,
      [id],
    );
    expect(row.rows[0]).toMatchObject({
      status: 'retention_pending',
      retention_claim_id: null,
      retention_lease_expires_at: null,
      retention_attempts: 1,
      last_retention_error_code: 'AccessDenied',
      backed_off: true,
    });
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
              next_attempt_at > now() AS backed_off
       FROM recording_deletion_jobs WHERE storage_scope = 'practice' AND audio_key = $1`,
      [key],
    );
    expect(job.rows[0]).toEqual({
      claim_id: null,
      lease_expires_at: null,
      attempt_count: 1,
      last_error_code: 'ServiceUnavailable',
      backed_off: true,
    });
  });
});
