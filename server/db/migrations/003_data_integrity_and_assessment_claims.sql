-- Stable content identity, stricter persisted-state invariants, and durable
-- assessment reservations/claims used by the cross-instance assessment flow.

ALTER TABLE questions
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT questions_cefr_level_prompt_word_key UNIQUE (cefr_level, prompt_word),
  ADD CONSTRAINT questions_prompt_word_length_check CHECK (char_length(prompt_word) BETWEEN 1 AND 100),
  ADD CONSTRAINT questions_question_text_length_check CHECK (char_length(question_text) BETWEEN 1 AND 1000),
  ADD CONSTRAINT questions_translations_shape_check CHECK (
    jsonb_typeof(translations) = 'object'
    AND translations ?& ARRAY['te', 'hi', 'es', 'zh']
    AND jsonb_typeof(translations->'te'->'examples') = 'array'
    AND jsonb_array_length(translations->'te'->'examples') = 3
    AND jsonb_typeof(translations->'hi'->'examples') = 'array'
    AND jsonb_array_length(translations->'hi'->'examples') = 3
    AND jsonb_typeof(translations->'es'->'examples') = 'array'
    AND jsonb_array_length(translations->'es'->'examples') = 3
    AND jsonb_typeof(translations->'zh'->'examples') = 'array'
    AND jsonb_array_length(translations->'zh'->'examples') = 3
  );

ALTER TABLE users
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT users_name_length_check CHECK (char_length(name) BETWEEN 1 AND 100),
  ADD CONSTRAINT users_email_length_check CHECK (char_length(email) BETWEEN 3 AND 254),
  ADD CONSTRAINT users_token_version_check CHECK (token_version > 0),
  ADD CONSTRAINT users_cefr_level_check
    CHECK (cefr_level IS NULL OR cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  ADD CONSTRAINT users_diagnostic_level_check
    CHECK (NOT diagnostic_completed OR cefr_level IS NOT NULL);

ALTER TABLE attempts
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN question_id SET NOT NULL,
  ALTER COLUMN transcript SET NOT NULL,
  ALTER COLUMN score SET NOT NULL,
  ALTER COLUMN passed SET NOT NULL,
  ALTER COLUMN feedback SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT attempts_attempt_no_check CHECK (attempt_no > 0),
  ADD CONSTRAINT attempts_score_check CHECK (score BETWEEN 0 AND 100),
  ADD CONSTRAINT attempts_transcript_length_check CHECK (char_length(transcript) <= 12000),
  ADD CONSTRAINT attempts_feedback_length_check CHECK (char_length(feedback) BETWEEN 1 AND 800);

ALTER TABLE diagnostic_state
  ADD COLUMN processing_question_id UUID,
  ADD COLUMN processing_started_at TIMESTAMPTZ,
  ADD COLUMN processing_claim_id UUID,
  ADD CONSTRAINT diagnostic_state_processing_question_id_fkey
    FOREIGN KEY (processing_question_id) REFERENCES questions(id) ON DELETE CASCADE,
  ADD CONSTRAINT diagnostic_state_low_idx_check CHECK (low_idx BETWEEN 0 AND 6),
  ADD CONSTRAINT diagnostic_state_high_idx_check CHECK (high_idx BETWEEN -1 AND 5),
  ADD CONSTRAINT diagnostic_state_questions_asked_check CHECK (questions_asked BETWEEN 0 AND 5),
  ADD CONSTRAINT diagnostic_state_bounds_check CHECK (low_idx <= high_idx + 1),
  ADD CONSTRAINT diagnostic_state_processing_current_check CHECK (
    processing_question_id IS NULL OR processing_question_id = current_question_id
  ),
  ADD CONSTRAINT diagnostic_state_processing_claim_check CHECK (
    (processing_question_id IS NULL AND processing_started_at IS NULL AND processing_claim_id IS NULL)
    OR
    (processing_question_id IS NOT NULL AND processing_started_at IS NOT NULL AND processing_claim_id IS NOT NULL)
  );

CREATE TABLE assessment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_usage_user_created_at
  ON assessment_usage (user_id, created_at);

CREATE INDEX idx_assessment_usage_created_at
  ON assessment_usage (created_at);

CREATE INDEX idx_attempts_user_created_at_id
  ON attempts (user_id, created_at, id);

CREATE TABLE practice_inflight (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
