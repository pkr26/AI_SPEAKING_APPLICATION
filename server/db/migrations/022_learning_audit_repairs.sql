-- Repair learning-history gaps found while auditing the cycle-aware release.
--
-- Silence used to be persisted as a counted diagnostic answer. The 1.1
-- client correctly requires every durable answer summary to contain speech,
-- so an interrupted legacy run containing silence must restart before that
-- invalid summary can be returned. Include a completed-but-unacknowledged
-- reveal: an older replica can finish its counted silent answer after migration
-- 019 introduced acknowledgement but before that replica drains. Completed,
-- already-acknowledged historical placements stay intact because the learner
-- has moved past their reveal and should not lose an established level.
WITH affected AS MATERIALIZED (
  SELECT state.user_id
  FROM diagnostic_state AS state
  JOIN users ON users.id = state.user_id
  WHERE state.questions_asked > 0
    AND (users.diagnostic_completed = false OR users.diagnostic_acknowledged = false)
    AND EXISTS (
      SELECT 1
      FROM LATERAL (
        SELECT attempt.transcript
        FROM attempts AS attempt
        WHERE attempt.user_id = state.user_id
          AND attempt.context = 'diagnostic'
        ORDER BY attempt.created_at DESC, attempt.id DESC
        LIMIT state.questions_asked
      ) AS active_run
      WHERE btrim(
        active_run.transcript,
        U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
      ) = ''
    )
), reset_users AS (
  UPDATE users
  SET diagnostic_completed = false,
      diagnostic_acknowledged = false,
      cefr_level = NULL
  WHERE id IN (SELECT user_id FROM affected)
  RETURNING id
), closed_cycles AS (
  UPDATE practice_cycles
  SET status = 'closed', closed_at = now(), updated_at = now()
  WHERE user_id IN (SELECT id FROM reset_users)
    AND status = 'active'
)
UPDATE diagnostic_state
SET low_idx = 0,
    high_idx = 5,
    questions_asked = 0,
    current_question_id = NULL,
    processing_question_id = NULL,
    processing_started_at = NULL,
    processing_claim_id = NULL
WHERE user_id IN (SELECT id FROM reset_users);

-- A draining older replica can also complete a counted-silence idempotency row
-- after migration 018 gave new rows response_version=2. Its response lacks the
-- new noSpeech marker and is not a valid v2 free-retry result. Preserve the
-- paid-work tombstone, but mark it incompatible so recovery gets the stable 409
-- contract instead of either replaying invalid JSON or spending the work again.
UPDATE assessment_requests
SET response_version = 1
WHERE context = 'diagnostic'
  AND status = 'completed'
  AND response_version = 2
  AND jsonb_typeof(response_body->'transcript') = 'string'
  AND btrim(
    response_body->>'transcript',
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
  ) = ''
  AND response_body->'noSpeech' IS DISTINCT FROM 'true'::jsonb;

CREATE FUNCTION downgrade_legacy_silent_diagnostic_response()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF NEW.context = 'diagnostic'
     AND NEW.status = 'completed'
     AND NEW.response_version = 2
     AND jsonb_typeof(NEW.response_body->'transcript') = 'string'
     AND btrim(
       NEW.response_body->>'transcript',
       U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
     ) = ''
     AND NEW.response_body->'noSpeech' IS DISTINCT FROM 'true'::jsonb THEN
    NEW.response_version = 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_requests_legacy_silence_version_trigger
BEFORE INSERT OR UPDATE OF status, response_body, response_version ON assessment_requests
FOR EACH ROW
EXECUTE FUNCTION downgrade_legacy_silent_diagnostic_response();

-- Native speech needs the language used for grading, not the learner's mutable
-- current profile. Put that immutable snapshot on the durable request claim so
-- one identity owns the attempt, response, replay, History, and export labels.
-- Existing rows predate this field, so the current profile is their only
-- recoverable fallback; every request created after this migration snapshots at
-- claim time (including an older draining writer whose INSERT omits the field).
ALTER TABLE attempts ADD COLUMN native_language TEXT;
ALTER TABLE assessment_requests ADD COLUMN native_language TEXT;

UPDATE assessment_requests AS request
SET native_language = users.native_language
FROM users
WHERE users.id = request.user_id
  AND request.context = 'practice-native'
  AND request.native_language IS NULL;

UPDATE attempts AS attempt
SET native_language = users.native_language
FROM users
WHERE users.id = attempt.user_id
  AND attempt.context = 'practice-native'
  AND attempt.native_language IS NULL;

CREATE FUNCTION snapshot_assessment_request_native_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
BEGIN
  IF NEW.context = 'practice-native' AND NEW.native_language IS NULL THEN
    SELECT users.native_language
    INTO NEW.native_language
    FROM users
    WHERE users.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_requests_native_language_claim_trigger
BEFORE INSERT ON assessment_requests
FOR EACH ROW
EXECUTE FUNCTION snapshot_assessment_request_native_language();

ALTER TABLE assessment_requests
  ADD CONSTRAINT assessment_requests_native_language_context_check CHECK (
    (context = 'practice-native' AND native_language IN ('te', 'hi', 'es', 'zh'))
    OR (context IN ('diagnostic', 'practice') AND native_language IS NULL)
  ) NOT VALID;

ALTER TABLE assessment_requests
  VALIDATE CONSTRAINT assessment_requests_native_language_context_check;

-- A current writer supplies the request snapshot directly on its attempt. A
-- draining older writer temporarily inserts NULL; its assessment completion
-- trigger below synchronizes that exact cycle/attempt from the owning request
-- later in the same transaction. The deferred constraint trigger re-reads the
-- final row at commit, so no native attempt can escape without a snapshot while
-- avoiding a mutable-profile fallback for new work.
ALTER TABLE attempts
  ADD CONSTRAINT attempts_native_language_context_check CHECK (
    (
      context = 'practice-native'
      AND (native_language IS NULL OR native_language IN ('te', 'hi', 'es', 'zh'))
    )
    OR (context IN ('diagnostic', 'practice') AND native_language IS NULL)
  ) NOT VALID;

ALTER TABLE attempts VALIDATE CONSTRAINT attempts_native_language_context_check;

CREATE FUNCTION enforce_attempt_native_language_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  stored_context TEXT;
  stored_language TEXT;
BEGIN
  SELECT context, native_language
  INTO stored_context, stored_language
  FROM attempts
  WHERE id = NEW.id;

  -- A row deleted later in the same transaction has nothing left to validate.
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF stored_context = 'practice-native' AND stored_language IS NULL THEN
    RAISE EXCEPTION 'practice-native attempt is missing its request language snapshot'
      USING ERRCODE = '23514',
            CONSTRAINT = 'attempts_native_language_required_check';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER attempts_native_language_required_trigger
AFTER INSERT OR UPDATE ON attempts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_attempt_native_language_snapshot();

-- Existing replays also need the additive language field. The request column
-- above is authoritative: preexisting requests received the documented
-- fallback, while all post-migration claims hold their exact claim-time value.
UPDATE assessment_requests AS request
SET response_body = request.response_body || jsonb_build_object('nativeLanguage', request.native_language)
WHERE request.context = 'practice-native'
  AND request.status = 'completed'
  AND jsonb_typeof(request.response_body) = 'object'
  AND NOT request.response_body ? 'nativeLanguage';

-- Preserve exactness for a draining older writer. Its attempt INSERT omits the
-- new field, but its later request completion carries the durable request
-- identity plus cycle/attempt number; synchronize the attempt and response in
-- that same transaction. Current writers arrive with the same value already.
CREATE FUNCTION fill_native_assessment_response_language()
RETURNS trigger
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  expected_attempt_no INTEGER;
  synchronized_attempts INTEGER;
BEGIN
  IF NEW.context = 'practice-native'
     AND NEW.status = 'completed'
     AND jsonb_typeof(NEW.response_body) = 'object' THEN
    IF NEW.native_language IS NULL THEN
      RAISE EXCEPTION 'practice-native request is missing its language snapshot'
        USING ERRCODE = '23514',
              CONSTRAINT = 'assessment_requests_native_language_context_check';
    END IF;

    NEW.response_body =
      NEW.response_body || jsonb_build_object('nativeLanguage', NEW.native_language);

    IF NEW.response_version = 2
       AND jsonb_typeof(NEW.response_body->'transcript') = 'string'
       AND btrim(
         NEW.response_body->>'transcript',
         U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
       ) <> '' THEN
      IF jsonb_typeof(NEW.response_body->'attemptNo') <> 'number' THEN
        RAISE EXCEPTION 'spoken practice-native response is missing its attempt number'
          USING ERRCODE = '23514',
                CONSTRAINT = 'attempts_native_language_required_check';
      END IF;
      expected_attempt_no = (NEW.response_body->>'attemptNo')::integer;
      IF expected_attempt_no NOT BETWEEN 1 AND 3 THEN
        RAISE EXCEPTION 'spoken practice-native response has an invalid attempt number'
          USING ERRCODE = '23514',
                CONSTRAINT = 'attempts_native_language_required_check';
      END IF;

      UPDATE attempts
      SET native_language = NEW.native_language
      WHERE user_id = NEW.user_id
        AND question_id = NEW.question_id
        AND context = 'practice-native'
        AND practice_cycle_id = NEW.practice_cycle_id
        AND attempt_no = expected_attempt_no;
      GET DIAGNOSTICS synchronized_attempts = ROW_COUNT;
      IF synchronized_attempts <> 1 THEN
        RAISE EXCEPTION 'practice-native response did not resolve one owning attempt'
          USING ERRCODE = '23514',
                CONSTRAINT = 'attempts_native_language_required_check';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_requests_native_language_response_trigger
BEFORE INSERT OR UPDATE OF status, response_body, native_language ON assessment_requests
FOR EACH ROW
EXECUTE FUNCTION fill_native_assessment_response_language();
