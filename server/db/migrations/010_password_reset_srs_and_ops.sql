-- Password-reset tokens, spaced-repetition (SRS) scheduling columns, and
-- operational hardening (question_id-leading indexes, RESTRICT on attempts'
-- question FK, autovacuum/fillfactor tuning for the hot upsert tables).
-- Schema only: the SRS/skip/reset behavior ships in a later release, and 008's
-- backfilled rows pick up the new columns via their defaults.

-- One active reset token per user (requests upsert the row). Only a SHA-256
-- of the token is stored; delivery happens out of band via the mailer.
CREATE TABLE password_reset_tokens (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SRS scheduling: every existing progress row becomes due immediately at
-- interval index 0, so introducing review scheduling never hides a word.
-- skipped_until parks a word the learner skipped without inventing attempts,
-- which is why attempt_count must now admit zero.
ALTER TABLE practice_progress
  ADD COLUMN due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN srs_interval_index INT NOT NULL DEFAULT 0
    CONSTRAINT practice_progress_srs_interval_index_check CHECK (srs_interval_index BETWEEN 0 AND 8),
  ADD COLUMN skipped_until TIMESTAMPTZ;

ALTER TABLE practice_progress
  DROP CONSTRAINT practice_progress_attempt_count_check;
ALTER TABLE practice_progress
  ADD CONSTRAINT practice_progress_attempt_count_check CHECK (attempt_count >= 0);

-- Deleting or republishing a question must not silently destroy learner
-- attempt history: surface the dependency instead of cascading.
ALTER TABLE attempts
  DROP CONSTRAINT attempts_question_id_fkey;
ALTER TABLE attempts
  ADD CONSTRAINT attempts_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT;

-- question_id-leading indexes: the existing indexes all lead with user_id, so
-- FK checks (now RESTRICT) and per-question content operations were full scans.
CREATE INDEX idx_attempts_question ON attempts (question_id);
CREATE INDEX idx_practice_progress_question ON practice_progress (question_id);
CREATE INDEX idx_assessment_requests_question ON assessment_requests (question_id);

-- Both tables churn through short-lived row versions (progress upserts,
-- fixed-window counters): vacuum far more aggressively than the 20% default
-- and leave heap room for HOT updates.
ALTER TABLE practice_progress SET (autovacuum_vacuum_scale_factor = 0.01, fillfactor = 80);
ALTER TABLE rate_limit_windows SET (autovacuum_vacuum_scale_factor = 0.01, fillfactor = 80);
