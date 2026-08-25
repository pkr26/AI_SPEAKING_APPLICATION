-- Keep interface localization independent from the learner's native language.
-- Existing accounts and registrations that omit the new additive preference
-- deliberately start with an English interface.

ALTER TABLE users
  ADD COLUMN ui_language TEXT NOT NULL DEFAULT 'en',
  ADD CONSTRAINT users_ui_language_check
    CHECK (ui_language IN ('en', 'te', 'hi', 'es', 'zh'));
