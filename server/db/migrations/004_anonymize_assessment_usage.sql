-- Keep paid-call reservations for the rolling global provider budget after an
-- account is deleted, while removing the association to the deleted learner.

ALTER TABLE assessment_usage
  DROP CONSTRAINT assessment_usage_user_id_fkey,
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE assessment_usage
  ADD CONSTRAINT assessment_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
