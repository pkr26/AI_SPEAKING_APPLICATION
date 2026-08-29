-- Recovery must describe the exact assessment that was claimed, and a
-- diagnostic restart must make every request from the previous placement run
-- permanently non-replayable until its ordinary 48-hour tombstone expires.
--
-- Keep this migration rolling-compatible at the database boundary. Triggers
-- populate the new claim fields for a draining pre-024 writer, rotate the run
-- identity when that writer performs an old-shape reset, and mark old completed
-- responses incompatible so pre-024 replay code also refuses them.

ALTER TABLE diagnostic_state
  ADD COLUMN diagnostic_run_id UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE assessment_requests
  ADD COLUMN diagnostic_run_id UUID,
  ADD COLUMN question_cefr_level TEXT,
  ADD COLUMN question_prompt_word TEXT,
  ADD COLUMN question_text TEXT;

-- Existing rows predate question snapshots. The live catalog is their only
-- recoverable wording fallback; every post-migration INSERT is captured
-- atomically by the trigger below instead of consulting this mutable table
-- during recovery.
UPDATE assessment_requests AS request
SET question_cefr_level = question.cefr_level,
    question_prompt_word = question.prompt_word,
    question_text = question.question_text
FROM questions AS question
WHERE question.id = request.question_id;

-- No legacy diagnostic request can be proven to belong to the currently
-- visible run: a restart before this migration left no generation marker.
-- Give each one a deliberately mismatching generation and retain it as an
-- incompatible 48-hour tombstone. Converting processing rows also prevents a
-- pre-migration worker from completing after the cutover. response_version=1
-- makes draining pre-024 binaries reject these rows even though they do not
-- understand diagnostic_run_id yet.
UPDATE assessment_requests
SET diagnostic_run_id = gen_random_uuid(),
    status = 'completed',
    response_body = CASE
      WHEN status = 'processing' THEN '{}'::jsonb
      ELSE response_body
    END,
    completed_at = COALESCE(completed_at, now()),
    response_version = 1
WHERE context = 'diagnostic';

CREATE FUNCTION snapshot_assessment_request_public_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  catalog_cefr_level TEXT;
  catalog_prompt_word TEXT;
  catalog_question_text TEXT;
BEGIN
  IF NEW.question_cefr_level IS NULL
     OR NEW.question_prompt_word IS NULL
     OR NEW.question_text IS NULL THEN
    SELECT question.cefr_level, question.prompt_word, question.question_text
    INTO catalog_cefr_level, catalog_prompt_word, catalog_question_text
    FROM questions AS question
    WHERE question.id = NEW.question_id;

    NEW.question_cefr_level = COALESCE(NEW.question_cefr_level, catalog_cefr_level);
    NEW.question_prompt_word = COALESCE(NEW.question_prompt_word, catalog_prompt_word);
    NEW.question_text = COALESCE(NEW.question_text, catalog_question_text);
  END IF;

  IF NEW.context = 'diagnostic' AND NEW.diagnostic_run_id IS NULL THEN
    SELECT state.diagnostic_run_id
    INTO NEW.diagnostic_run_id
    FROM diagnostic_state AS state
    WHERE state.user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_requests_public_context_snapshot_trigger
BEFORE INSERT ON assessment_requests
FOR EACH ROW
EXECUTE FUNCTION snapshot_assessment_request_public_context();

ALTER TABLE assessment_requests
  ALTER COLUMN question_cefr_level SET NOT NULL,
  ALTER COLUMN question_prompt_word SET NOT NULL,
  ALTER COLUMN question_text SET NOT NULL,
  ADD CONSTRAINT assessment_requests_question_cefr_level_check
    CHECK (question_cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  ADD CONSTRAINT assessment_requests_question_prompt_word_length_check
    CHECK (char_length(question_prompt_word) BETWEEN 1 AND 100),
  ADD CONSTRAINT assessment_requests_question_text_length_check
    CHECK (char_length(question_text) BETWEEN 1 AND 1000),
  ADD CONSTRAINT assessment_requests_question_public_strings_nonblank_check CHECK (
    btrim(
      question_prompt_word,
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
    ) <> ''
    AND btrim(
      question_text,
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
    ) <> ''
  ),
  ADD CONSTRAINT assessment_requests_diagnostic_run_context_check CHECK (
    (context = 'diagnostic' AND diagnostic_run_id IS NOT NULL)
    OR (context IN ('practice', 'practice-native') AND diagnostic_run_id IS NULL)
  );

CREATE INDEX idx_assessment_requests_diagnostic_run
  ON assessment_requests (user_id, diagnostic_run_id)
  WHERE context = 'diagnostic';

-- A pre-024 restart/reset updates the old state columns without knowing about
-- diagnostic_run_id. Recognize that exact reset shape and rotate on its behalf.
-- Current writers set a fresh UUID explicitly, including a restart requested
-- while the state is already pristine.
CREATE FUNCTION rotate_diagnostic_run_on_legacy_reset()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF NEW.diagnostic_run_id = OLD.diagnostic_run_id
     AND NEW.low_idx = 0
     AND NEW.high_idx = 5
     AND NEW.questions_asked = 0
     AND NEW.current_question_id IS NULL
     AND NEW.processing_question_id IS NULL
     AND NEW.processing_started_at IS NULL
     AND NEW.processing_claim_id IS NULL THEN
    NEW.diagnostic_run_id = gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER diagnostic_state_legacy_reset_run_trigger
BEFORE UPDATE ON diagnostic_state
FOR EACH ROW
EXECUTE FUNCTION rotate_diagnostic_run_on_legacy_reset();

-- Restart never deletes request identities. Completed results become legacy
-- tombstones, and an in-flight request becomes the same kind of completed,
-- non-replayable tombstone for 48 hours. response_version=1 makes a draining
-- pre-024 binary reject completed replays too; current code additionally checks
-- the exact run UUID for both POST replay and GET status.
CREATE FUNCTION retire_restarted_diagnostic_requests()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF NEW.diagnostic_run_id IS DISTINCT FROM OLD.diagnostic_run_id THEN
    UPDATE assessment_requests
    SET status = 'completed',
        response_body = CASE
          WHEN status = 'processing' THEN '{}'::jsonb
          ELSE response_body
        END,
        completed_at = COALESCE(completed_at, now()),
        response_version = 1
    WHERE user_id = NEW.user_id
      AND context = 'diagnostic'
      AND diagnostic_run_id IS DISTINCT FROM NEW.diagnostic_run_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER diagnostic_state_retire_requests_trigger
AFTER UPDATE ON diagnostic_state
FOR EACH ROW
EXECUTE FUNCTION retire_restarted_diagnostic_requests();

-- This semantic recovery cutover cannot be rolling: a pre-024 binary ignores
-- diagnostic generations and still joins the mutable question catalog during
-- status recovery. The out-of-band row sorts before 001, making that binary's
-- positional readiness comparison fail as soon as this migration commits.
INSERT INTO schema_migrations (name, checksum)
VALUES (
  '000_runtime_cutover_assessment_recovery_v1',
  'a1e95cd63efc800d5b52c04a1ebeeeb7d1a6cff54dbeabde26f04a30d1c246ad'
);
