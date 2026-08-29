-- A delete-all operation must also cover retain=true assessments that were
-- already processing but had not inserted their recording metadata yet.
-- Claims snapshot the user's epoch; bulk deletion advances it atomically with
-- deleting existing rows, and finalization retains audio only when the two
-- epochs still match.

ALTER TABLE users
  ADD COLUMN recording_retention_epoch BIGINT NOT NULL DEFAULT 0,
  ADD CONSTRAINT users_recording_retention_epoch_check
    CHECK (recording_retention_epoch >= 0);

ALTER TABLE assessment_requests
  ADD COLUMN recording_retention_epoch BIGINT NOT NULL DEFAULT 0,
  ADD CONSTRAINT assessment_requests_recording_retention_epoch_check
    CHECK (recording_retention_epoch >= 0);
