-- 002_hardening.sql — production hardening changes.
--
-- 1. users.token_version for JWT revocation (password change bumps it).
-- 2. diagnostic_state.current_question_id for the diagnostic anti-cheat check.
-- 3. Foreign keys recreated with ON DELETE CASCADE so deleting a user row
--    (DELETE /auth/account) cleans up attempts and diagnostic state.

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 1;

ALTER TABLE diagnostic_state ADD COLUMN IF NOT EXISTS current_question_id UUID;

ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_user_id_fkey;
ALTER TABLE attempts DROP CONSTRAINT IF EXISTS attempts_question_id_fkey;
ALTER TABLE diagnostic_state DROP CONSTRAINT IF EXISTS diagnostic_state_user_id_fkey;
ALTER TABLE diagnostic_state DROP CONSTRAINT IF EXISTS diagnostic_state_current_question_id_fkey;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

ALTER TABLE diagnostic_state
  ADD CONSTRAINT diagnostic_state_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE diagnostic_state
  ADD CONSTRAINT diagnostic_state_current_question_id_fkey
  FOREIGN KEY (current_question_id) REFERENCES questions(id) ON DELETE CASCADE;
