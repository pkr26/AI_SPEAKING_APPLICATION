import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import {
  createPresignedRecordingPlaybackUrl,
  retainPresignedAudioVersion,
  sweepPresignedAudioVersions,
  AudioStorageScope,
} from './audio-upload';
import { config } from './config';
import { pool } from './db';
import { logger } from './logger';
import { recordingMaintenanceTotal } from './metrics';
import { AuthedRequest, h, HttpError, requireAuth, validate, validated } from './middleware';
import { Limiters } from './rate-limit';

interface RecordingRow {
  id: string;
  user_id: string;
  request_id: string;
  attempt_id: string | null;
  question_id: string;
  context: 'diagnostic' | 'practice' | 'practice-native';
  storage_scope: AudioStorageScope;
  audio_key: string;
  s3_version_id: string;
  content_type: string;
  size_bytes: number;
  duration_ms: number | null;
  status: 'retention_pending' | 'available' | 'unavailable';
  retention_attempts: number;
  retention_claim_id: string | null;
  created_at: string;
  available_at: string | null;
  prompt_word: string;
  question_text: string;
  cefr_level: string;
}

interface DeletionJobRow {
  storage_scope: AudioStorageScope;
  audio_key: string;
  known_version_id: string;
  finalize_after: string;
  attempt_count: number;
  claim_id: string;
}

function toPublicRecording(row: RecordingRow) {
  return {
    id: row.id,
    questionId: row.question_id,
    context: row.context,
    promptWord: row.prompt_word,
    questionText: row.question_text,
    cefrLevel: row.cefr_level,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes),
    durationMs: row.duration_ms,
    status: row.status,
    createdAt: row.created_at,
    availableAt: row.available_at,
  };
}

function toExportRecording(row: RecordingRow) {
  return {
    ...toPublicRecording(row),
    requestId: row.request_id,
    attemptId: row.attempt_id,
  };
}

async function mapBounded<T>(items: T[], concurrency: number, work: (item: T) => Promise<void>): Promise<void> {
  const queue = items.values();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      for (const item of queue) {
        await work(item);
      }
    }),
  );
}

async function claimPendingRecordings(recordingId?: string): Promise<RecordingRow[]> {
  const claimId = randomUUID();
  const { rows } = await pool.query<RecordingRow>(
    `WITH candidates AS (
       SELECT id
       FROM recordings
       WHERE status = 'retention_pending'
         AND next_retention_attempt_at <= now()
         AND (retention_lease_expires_at IS NULL OR retention_lease_expires_at < now())
         AND ($1::uuid IS NULL OR id = $1)
       ORDER BY next_retention_attempt_at, created_at
       FOR UPDATE SKIP LOCKED
       LIMIT $2
     )
     UPDATE recordings AS recordings
     SET retention_claim_id = $3,
         retention_lease_expires_at = now() + interval '5 minutes',
         retention_attempts = retention_attempts + 1
     FROM candidates
     WHERE recordings.id = candidates.id
     RETURNING recordings.*`,
    [recordingId ?? null, recordingId ? 1 : config.recordings.maintenanceBatchSize, claimId],
  );
  return rows;
}

async function retainClaimedRecording(recording: RecordingRow): Promise<void> {
  try {
    await retainPresignedAudioVersion(
      recording.storage_scope,
      recording.user_id,
      recording.audio_key,
      recording.s3_version_id,
    );
    await pool.query(
      `UPDATE recordings
       SET status = 'available', available_at = now(), retention_claim_id = NULL,
           retention_lease_expires_at = NULL, last_retention_error_code = NULL
       WHERE id = $1 AND retention_claim_id = $2 AND status = 'retention_pending'`,
      [recording.id, recording.retention_claim_id],
    );
    recordingMaintenanceTotal.inc({ operation: 'retention', outcome: 'ok' });
  } catch (err) {
    recordingMaintenanceTotal.inc({ operation: 'retention', outcome: 'error' });
    const delaySeconds = Math.min(3600, 5 * 2 ** Math.min(recording.retention_attempts, 9));
    await pool
      .query(
        `UPDATE recordings
         SET retention_claim_id = NULL, retention_lease_expires_at = NULL,
             next_retention_attempt_at = now() + $3 * interval '1 second',
             last_retention_error_code = $4
         WHERE id = $1 AND retention_claim_id = $2 AND status = 'retention_pending'`,
        [recording.id, recording.retention_claim_id, delaySeconds, (err as { name?: string }).name ?? 'S3_ERROR'],
      )
      .catch(() => undefined);
    throw err;
  }
}

export async function tryRetainRecording(recordingId: string): Promise<void> {
  try {
    const [recording] = await claimPendingRecordings(recordingId);
    if (!recording) return;
    await retainClaimedRecording(recording);
  } catch (err) {
    try {
      logger.warn({ err, recordingId }, 'recording retention tagging failed; durable retry remains pending');
    } catch {
      // The durable pending row remains authoritative.
    }
  }
}

async function claimDeletionJobs(): Promise<DeletionJobRow[]> {
  const claimId = randomUUID();
  const { rows } = await pool.query<DeletionJobRow>(
    `WITH candidates AS (
       SELECT storage_scope, audio_key
       FROM recording_deletion_jobs
       WHERE next_attempt_at <= now()
         AND (lease_expires_at IS NULL OR lease_expires_at < now())
       ORDER BY next_attempt_at, created_at
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
     UPDATE recording_deletion_jobs AS jobs
     SET claim_id = $2, lease_expires_at = now() + interval '5 minutes',
         attempt_count = attempt_count + 1
     FROM candidates
     WHERE jobs.storage_scope = candidates.storage_scope
       AND jobs.audio_key = candidates.audio_key
     RETURNING jobs.*`,
    [config.recordings.maintenanceBatchSize, claimId],
  );
  return rows;
}

async function processDeletionJob(job: DeletionJobRow): Promise<boolean> {
  try {
    const removed = await sweepPresignedAudioVersions(job.storage_scope, job.audio_key);
    const finalWindowReached = Date.now() >= new Date(job.finalize_after).getTime();
    if (finalWindowReached && removed === 0) {
      await pool.query(
        `DELETE FROM recording_deletion_jobs
         WHERE storage_scope = $1 AND audio_key = $2 AND claim_id = $3`,
        [job.storage_scope, job.audio_key, job.claim_id],
      );
      recordingMaintenanceTotal.inc({ operation: 'deletion', outcome: 'ok' });
      return true;
    }
    await pool.query(
      `UPDATE recording_deletion_jobs
       SET claim_id = NULL, lease_expires_at = NULL, last_error_code = NULL,
           next_attempt_at = CASE WHEN finalize_after > now() THEN finalize_after ELSE now() + interval '30 seconds' END
       WHERE storage_scope = $1 AND audio_key = $2 AND claim_id = $3`,
      [job.storage_scope, job.audio_key, job.claim_id],
    );
    return false;
  } catch (err) {
    recordingMaintenanceTotal.inc({ operation: 'deletion', outcome: 'error' });
    const delaySeconds = Math.min(3600, 5 * 2 ** Math.min(job.attempt_count, 9));
    await pool
      .query(
        `UPDATE recording_deletion_jobs
         SET claim_id = NULL, lease_expires_at = NULL,
             next_attempt_at = now() + $4 * interval '1 second', last_error_code = $5
         WHERE storage_scope = $1 AND audio_key = $2 AND claim_id = $3`,
        [job.storage_scope, job.audio_key, job.claim_id, delaySeconds, (err as { name?: string }).name ?? 'S3_ERROR'],
      )
      .catch(() => undefined);
    throw err;
  }
}

export async function runRecordingMaintenance(): Promise<number> {
  const pending = await claimPendingRecordings();
  const deletions = await claimDeletionJobs();
  let completed = 0;
  await mapBounded(pending, config.recordings.maintenanceConcurrency, async (recording) => {
    await retainClaimedRecording(recording).catch(() => undefined);
  });
  await mapBounded(deletions, config.recordings.maintenanceConcurrency, async (job) => {
    await processDeletionJob(job).then(
      (removed) => {
        if (removed) completed++;
      },
      () => undefined,
    );
  });
  return completed;
}

export function createRecordingsRouter(limiters: Limiters) {
  const router = Router();
  const paramsSchema = z.object({ id: z.string().uuid('recording id must be a valid UUID') });
  const listSchema = z.object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().uuid('cursor must be a valid UUID').optional(),
  });
  const exportSchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    cursor: z.string().uuid('cursor must be a valid UUID').optional(),
  });

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  router.use(requireAuth);

  router.get(
    new RegExp('^/$'),
    validate({ query: listSchema }),
    h(async (req: AuthedRequest, res) => {
      const { limit, cursor } = validated(req, listSchema);
      if (cursor) {
        const owned = await pool.query('SELECT 1 FROM recordings WHERE id = $1 AND user_id = $2', [
          cursor,
          req.user!.id,
        ]);
        if (!owned.rows[0]) throw new HttpError(400, 'Invalid recording cursor');
      }
      const { rows } = await pool.query<RecordingRow>(
        `SELECT r.*, q.prompt_word, q.question_text, q.cefr_level
         FROM recordings r
         JOIN questions q ON q.id = r.question_id
         WHERE r.user_id = $1
           AND ($2::uuid IS NULL OR (r.created_at, r.id) < (
             SELECT created_at, id FROM recordings WHERE id = $2 AND user_id = $1
           ))
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT $3`,
        [req.user!.id, cursor ?? null, limit + 1],
      );
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      res.json({
        items: items.map(toPublicRecording),
        nextCursor: hasMore ? items[items.length - 1].id : null,
      });
    }),
  );

  router.get(
    '/export',
    validate({ query: exportSchema }),
    h(async (req: AuthedRequest, res) => {
      const { limit, cursor } = validated(req, exportSchema);
      if (cursor) {
        const owned = await pool.query('SELECT 1 FROM recordings WHERE id = $1 AND user_id = $2', [
          cursor,
          req.user!.id,
        ]);
        if (!owned.rows[0]) throw new HttpError(400, 'Invalid recording export cursor');
      }
      const { rows } = await pool.query<RecordingRow>(
        `SELECT r.*, q.prompt_word, q.question_text, q.cefr_level
         FROM recordings r
         JOIN questions q ON q.id = r.question_id
         WHERE r.user_id = $1
           AND ($2::uuid IS NULL OR (r.created_at, r.id) > (
             SELECT created_at, id FROM recordings WHERE id = $2 AND user_id = $1
           ))
         ORDER BY r.created_at ASC, r.id ASC
         LIMIT $3`,
        [req.user!.id, cursor ?? null, limit + 1],
      );
      const hasMore = rows.length > limit;
      const recordings = hasMore ? rows.slice(0, limit) : rows;
      res.json({
        recordings: recordings.map(toExportRecording),
        nextCursor: hasMore ? recordings[recordings.length - 1].id : null,
      });
    }),
  );

  router.delete(
    new RegExp('^/$'),
    limiters.recordingBulkDelete,
    h(async (req: AuthedRequest, res) => {
      // One statement is one transaction: advancing the owner epoch fences
      // retain=true assessments that are still in provider work, deleting only
      // this owner's metadata preserves isolation, and the existing per-row
      // AFTER DELETE trigger commits every exact-version outbox job atomically.
      await pool.query(
        `WITH owner AS (
           UPDATE users
           SET recording_retention_epoch = recording_retention_epoch + 1
           WHERE id = $1
           RETURNING id
         )
         DELETE FROM recordings
         WHERE user_id IN (SELECT id FROM owner)`,
        [req.user!.id],
      );
      res.status(204).end();
    }),
  );

  router.post(
    '/:id/playback-url',
    limiters.playbackGrant,
    validate({ params: paramsSchema }),
    h(async (req: AuthedRequest, res) => {
      const { rows } = await pool.query<RecordingRow>('SELECT * FROM recordings WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user!.id,
      ]);
      const recording = rows[0];
      if (!recording) throw new HttpError(404, 'Recording not found');
      if (recording.status !== 'available') {
        throw new HttpError(409, 'Recording is not ready yet', { retryAfterSeconds: 5 }, 'REQUEST_IN_FLIGHT');
      }
      let playbackUrl: string;
      try {
        playbackUrl = await createPresignedRecordingPlaybackUrl(
          recording.storage_scope,
          recording.audio_key,
          recording.s3_version_id,
          recording.content_type,
          config.recordings.playbackUrlTtlSeconds,
        );
      } catch (err) {
        try {
          logger.warn({ err, recordingId: recording.id }, 'failed to issue recording playback URL');
        } catch {
          // Preserve the stable provider failure contract.
        }
        throw new HttpError(502, 'Recording storage unavailable; please try again', 'PROVIDER_FAILED');
      }
      res.json({
        recordingId: recording.id,
        playbackUrl,
        expiresIn: config.recordings.playbackUrlTtlSeconds,
        contentType: recording.content_type,
      });
    }),
  );

  router.delete(
    '/:id',
    validate({ params: paramsSchema }),
    h(async (req: AuthedRequest, res) => {
      await pool.query(
        `WITH owner AS (
           SELECT id FROM users WHERE id = $1 FOR UPDATE
         )
         DELETE FROM recordings
         WHERE id = $2 AND user_id IN (SELECT id FROM owner)`,
        [req.user!.id, req.params.id],
      );
      res.status(204).end();
    }),
  );

  return router;
}

export { toPublicRecording };
