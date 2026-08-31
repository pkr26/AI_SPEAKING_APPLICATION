-- History, the account export, and diagnostic run summaries must describe
-- the exact question the learner answered, not today's mutable catalog
-- wording. Migration 024 gave durable assessment request claims that
-- immutable snapshot; mirror the same columns onto attempts so every attempt
-- read path (practice history, account export, diagnostic summaries) joins
-- nothing and can never be rewritten by a later catalog edit.
--
-- Rolling-deploy shape mirrors 024: add the columns nullable, backfill from
-- the questions join (the attempts question foreign key cascades on delete,
-- so no attempt can outlive its question and every row has catalog wording
-- to recover), snapshot any draining pre-026 writer's INSERT through a
-- trigger, then enforce NOT NULL and the same CHECK contracts. Deploys apply
-- migrations before current replicas start.

ALTER TABLE attempts
  ADD COLUMN cefr_level TEXT,
  ADD COLUMN prompt_word TEXT,
  ADD COLUMN question_text TEXT;

-- A draining older replica still INSERTs attempts without the new columns.
-- Fill those from the catalog row the claim's migration-024 snapshot came
-- from; a current writer arrives with the exact in-memory question used for
-- grading already set, which the COALESCE preserves verbatim.
CREATE FUNCTION snapshot_attempt_public_question()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  catalog_cefr_level TEXT;
  catalog_prompt_word TEXT;
  catalog_question_text TEXT;
BEGIN
  IF NEW.cefr_level IS NULL
     OR NEW.prompt_word IS NULL
     OR NEW.question_text IS NULL THEN
    SELECT question.cefr_level, question.prompt_word, question.question_text
    INTO catalog_cefr_level, catalog_prompt_word, catalog_question_text
    FROM questions AS question
    WHERE question.id = NEW.question_id;

    NEW.cefr_level = COALESCE(NEW.cefr_level, catalog_cefr_level);
    NEW.prompt_word = COALESCE(NEW.prompt_word, catalog_prompt_word);
    NEW.question_text = COALESCE(NEW.question_text, catalog_question_text);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER attempts_public_question_snapshot_trigger
BEFORE INSERT ON attempts
FOR EACH ROW
EXECUTE FUNCTION snapshot_attempt_public_question();

-- The migration-022 native-language snapshot trigger on attempts is DEFERRABLE
-- INITIALLY DEFERRED: any backfill UPDATE queues trigger events that make every
-- later same-transaction ALTER TABLE fail with 55006 (pending trigger events).
-- Bracket the backfill with a disable/enable of exactly that trigger: it only
-- rewrites native-attempt snapshot columns the backfill never touches, and
-- re-enabling before COMMIT keeps it enforced for all subsequent writes.
ALTER TABLE attempts DISABLE TRIGGER attempts_native_language_required_trigger;

-- Existing rows predate the snapshot columns. The live catalog is their only
-- recoverable wording; every post-migration INSERT is captured atomically by
-- the trigger above (or arrives with the writer's in-memory grading copy).
UPDATE attempts AS attempt
SET cefr_level = question.cefr_level,
    prompt_word = question.prompt_word,
    question_text = question.question_text
FROM questions AS question
WHERE question.id = attempt.question_id;

ALTER TABLE attempts
  ALTER COLUMN cefr_level SET NOT NULL,
  ALTER COLUMN prompt_word SET NOT NULL,
  ALTER COLUMN question_text SET NOT NULL,
  ADD CONSTRAINT attempts_question_cefr_level_check
    CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  ADD CONSTRAINT attempts_question_prompt_word_length_check
    CHECK (char_length(prompt_word) BETWEEN 1 AND 100),
  ADD CONSTRAINT attempts_question_text_length_check
    CHECK (char_length(question_text) BETWEEN 1 AND 1000),
  ADD CONSTRAINT attempts_question_public_strings_nonblank_check CHECK (
    btrim(
      prompt_word,
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
    ) <> ''
    AND btrim(
      question_text,
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
    ) <> ''
  );

ALTER TABLE attempts ENABLE TRIGGER attempts_native_language_required_trigger;
