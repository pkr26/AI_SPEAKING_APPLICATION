export type RecordingContext = 'diagnostic' | 'practice' | 'practice-native';
export type RecordingStorageScope = 'diagnostic' | 'practice';

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

interface Queryable {
  query(text: string, values?: unknown[]): Promise<unknown>;
}

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
