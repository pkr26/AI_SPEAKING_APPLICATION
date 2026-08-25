-- Permanent owner-private recording metadata plus a durable S3 deletion
-- outbox. S3 objects start with the policy-bound retention=transient tag and
-- are retagged retention=retained only after this metadata commits.

CREATE TABLE recordings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  attempt_id UUID REFERENCES attempts(id) ON DELETE SET NULL,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  context TEXT NOT NULL CHECK (context IN ('diagnostic', 'practice', 'practice-native')),
  storage_scope TEXT NOT NULL CHECK (storage_scope IN ('diagnostic', 'practice')),
  audio_key TEXT NOT NULL,
  s3_version_id TEXT NOT NULL CHECK (char_length(s3_version_id) BETWEEN 1 AND 1024),
  content_type TEXT NOT NULL CHECK (char_length(content_type) BETWEEN 3 AND 128),
  size_bytes BIGINT NOT NULL CHECK (size_bytes BETWEEN 1 AND 26214400),
  duration_ms INT CHECK (duration_ms BETWEEN 500 AND 120500),
  etag TEXT CHECK (etag IS NULL OR char_length(etag) BETWEEN 1 AND 256),
  status TEXT NOT NULL DEFAULT 'retention_pending'
    CHECK (status IN ('retention_pending', 'available', 'unavailable')),
  retention_attempts INT NOT NULL DEFAULT 0 CHECK (retention_attempts >= 0),
  next_retention_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  retention_claim_id UUID,
  retention_lease_expires_at TIMESTAMPTZ,
  last_retention_error_code TEXT CHECK (
    last_retention_error_code IS NULL OR char_length(last_retention_error_code) BETWEEN 1 AND 128
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  available_at TIMESTAMPTZ,
  UNIQUE (user_id, request_id),
  UNIQUE (storage_scope, audio_key, s3_version_id),
  CONSTRAINT recordings_context_scope_check CHECK (
    (context = 'diagnostic' AND storage_scope = 'diagnostic')
    OR (context IN ('practice', 'practice-native') AND storage_scope = 'practice')
  ),
  CONSTRAINT recordings_retention_claim_check CHECK (
    (retention_claim_id IS NULL AND retention_lease_expires_at IS NULL)
    OR (retention_claim_id IS NOT NULL AND retention_lease_expires_at IS NOT NULL)
  ),
  CONSTRAINT recordings_available_check CHECK (
    (status = 'available' AND available_at IS NOT NULL)
    OR (status <> 'available' AND available_at IS NULL)
  )
);

CREATE UNIQUE INDEX uq_recordings_attempt_id
  ON recordings (attempt_id)
  WHERE attempt_id IS NOT NULL;

CREATE INDEX idx_recordings_user_created_at_id
  ON recordings (user_id, created_at DESC, id DESC);

CREATE INDEX idx_recordings_pending_retention
  ON recordings (next_retention_attempt_at, created_at)
  WHERE status = 'retention_pending';

CREATE TABLE recording_deletion_jobs (
  storage_scope TEXT NOT NULL CHECK (storage_scope IN ('diagnostic', 'practice')),
  audio_key TEXT NOT NULL,
  known_version_id TEXT NOT NULL CHECK (char_length(known_version_id) BETWEEN 1 AND 1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A signed upload form may remain reusable for as long as one hour. Keep the
  -- tombstone through that full window and perform a final version sweep.
  finalize_after TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour',
  attempt_count INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claim_id UUID,
  lease_expires_at TIMESTAMPTZ,
  last_error_code TEXT CHECK (last_error_code IS NULL OR char_length(last_error_code) BETWEEN 1 AND 128),
  PRIMARY KEY (storage_scope, audio_key),
  CONSTRAINT recording_deletion_jobs_claim_check CHECK (
    (claim_id IS NULL AND lease_expires_at IS NULL)
    OR (claim_id IS NOT NULL AND lease_expires_at IS NOT NULL)
  )
);

CREATE INDEX idx_recording_deletion_jobs_due
  ON recording_deletion_jobs (next_attempt_at, created_at);

CREATE FUNCTION enqueue_recording_s3_deletion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO recording_deletion_jobs (
    storage_scope, audio_key, known_version_id, finalize_after, next_attempt_at
  ) VALUES (
    OLD.storage_scope,
    OLD.audio_key,
    OLD.s3_version_id,
    now() + interval '1 hour',
    now()
  )
  ON CONFLICT (storage_scope, audio_key) DO UPDATE SET
    known_version_id = EXCLUDED.known_version_id,
    finalize_after = greatest(recording_deletion_jobs.finalize_after, EXCLUDED.finalize_after),
    next_attempt_at = least(recording_deletion_jobs.next_attempt_at, now()),
    claim_id = NULL,
    lease_expires_at = NULL;
  RETURN OLD;
END
$$;

CREATE TRIGGER recordings_enqueue_s3_deletion
AFTER DELETE ON recordings
FOR EACH ROW EXECUTE FUNCTION enqueue_recording_s3_deletion();
