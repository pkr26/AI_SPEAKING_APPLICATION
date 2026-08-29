-- Bind the learner's per-submission recording-retention choice to the same
-- durable identity that prevents duplicate paid assessment work. Existing
-- requests came from clients whose contract always retained successful S3
-- recordings, so the backward-compatible backfill/default is true.

ALTER TABLE assessment_requests
  ADD COLUMN retain_recording BOOLEAN NOT NULL DEFAULT true;
