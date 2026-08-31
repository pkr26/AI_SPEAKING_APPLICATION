export type RecordingContext = 'diagnostic' | 'practice' | 'practice-native';
export type RecordingStorageScope = 'diagnostic' | 'practice';

/** Object facts captured at download time (SubmittedAudioFile.retainedSource in audio-upload.ts). */
export interface RecordingCapture {
  id: string;
  storageScope: RecordingStorageScope;
  audioKey: string;
  s3VersionId: string;
  contentType: string;
  sizeBytes: number;
  durationMs?: number;
  etag?: string;
  attemptId?: string;
}

/** Structural query minimum shared by the pg Pool and a transaction-scoped PoolClient. */
interface Queryable {
  query(text: string, values?: unknown[]): Promise<unknown>;
}

/**
 * Insert permanent recording metadata inside the caller's own transaction, so
 * the row commits or rolls back atomically with the assessment result it
 * describes. The capture must describe the exact object the assessment
 * consumed: a key disagreement with the authoritative owner throws rather
 * than persisting metadata for a different object. The statement itself
 * snapshots the owner's current recording-retention epoch, binding the row to
 * the generation that exists at commit so a later bulk delete-all fence hides
 * it immediately. Anything but exactly one inserted row also throws, aborting
 * the caller's transaction instead of silently dropping the recording.
 */
export async function insertRetainedRecording(
  client: Queryable,
  userId: string,
  requestId: string,
  questionId: string,
  context: RecordingContext,
  authoritativeAudioKey: string,
  capture: RecordingCapture,
): Promise<void> {
  if (capture.audioKey !== authoritativeAudioKey) {
    throw new Error('recording capture does not match the assessment audio owner');
  }
  const inserted = (await client.query(
    `INSERT INTO recordings (
       id, user_id, request_id, attempt_id, question_id, context, storage_scope,
       audio_key, s3_version_id, content_type, size_bytes, duration_ms, etag,
       recording_retention_epoch
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
       (SELECT recording_retention_epoch FROM users WHERE id = $2)
     )`,
    [
      capture.id,
      userId,
      requestId,
      capture.attemptId ?? null,
      questionId,
      context,
      capture.storageScope,
      authoritativeAudioKey,
      capture.s3VersionId,
      capture.contentType,
      capture.sizeBytes,
      capture.durationMs ?? null,
      capture.etag ?? null,
    ],
  )) as { rowCount?: number | null };
  if (inserted.rowCount !== 1) throw new Error('failed to insert retained recording metadata');
}
