-- Bulk recording deletion is a constant-time logical generation advance.
-- Existing metadata becomes immediately invisible, while the recording
-- maintenance worker consults a durable per-owner queue and removes stale
-- rows in bounded batches. The existing per-row DELETE trigger then durably
-- enqueues each exact S3 object/version for the mandatory all-version sweep.

ALTER TABLE recordings
  ADD COLUMN recording_retention_epoch BIGINT;

UPDATE recordings AS recordings
SET recording_retention_epoch = users.recording_retention_epoch
FROM users
WHERE users.id = recordings.user_id;

ALTER TABLE recordings
  ALTER COLUMN recording_retention_epoch SET NOT NULL,
  ADD CONSTRAINT recordings_recording_retention_epoch_check
    CHECK (recording_retention_epoch >= 0);

-- Deploy migrations before replacing application replicas. Populate the new
-- column for both the new explicit writer and an older in-flight replica that
-- still omits it, so a rolling deploy cannot break successful retention.
CREATE FUNCTION assign_recording_retention_epoch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT users.recording_retention_epoch
  INTO NEW.recording_retention_epoch
  FROM users
  WHERE users.id = NEW.user_id;
  RETURN NEW;
END
$$;

CREATE TRIGGER recordings_assign_retention_epoch
BEFORE INSERT ON recordings
FOR EACH ROW EXECUTE FUNCTION assign_recording_retention_epoch();

CREATE INDEX idx_recordings_user_retention_epoch_created_at_id
  ON recordings (user_id, recording_retention_epoch, created_at DESC, id DESC);

CREATE TABLE recording_bulk_cleanup_jobs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cutoff_epoch BIGINT NOT NULL CHECK (cutoff_epoch >= 0),
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_processed_at TIMESTAMPTZ
);

-- NULL means newly queued and sorts first. Each bounded worker pass timestamps
-- owners for which it found rows, rotating large libraries behind other
-- queued owners instead of letting one backlog starve every later request.
CREATE INDEX idx_recording_bulk_cleanup_jobs_next
  ON recording_bulk_cleanup_jobs (last_processed_at ASC NULLS FIRST, enqueued_at, user_id);

-- This is an intentional non-file manifest fence. Its name sorts before 001,
-- so pre-023 readiness code fails its positional manifest comparison as soon
-- as this transaction commits. Current binaries recognize and verify the
-- exact row. Deployments must remove old replicas from traffic and drain all
-- in-flight work before applying migrations 022/023; this fence is the
-- fail-safe that keeps any missed straggler unready after the cutover.
INSERT INTO schema_migrations (name, checksum)
VALUES (
  '000_runtime_cutover_recording_privacy_v1',
  'be0c62a55ec237f07b088798529ac1e27318fbfcd4a079712c79a183028b8a1c'
);
