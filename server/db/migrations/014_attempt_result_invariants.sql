-- Keep stored attempt history inside the response contracts consumed by the
-- mobile app. Diagnostic placement can ask at most five questions, while one
-- practice run has three tries. Passing is derived solely from the persisted
-- score threshold in both contexts.

ALTER TABLE attempts
  ADD CONSTRAINT attempts_context_attempt_no_check CHECK (
    (context = 'diagnostic' AND attempt_no BETWEEN 1 AND 5)
    OR
    (context = 'practice' AND attempt_no BETWEEN 1 AND 3)
  ) NOT VALID,
  ADD CONSTRAINT attempts_passed_score_check CHECK (passed = (score >= 60)) NOT VALID;

-- Install the new checks before retiring the older broad positivity check,
-- then explicitly validate all historical rows. The migration transaction
-- rolls back cleanly if the read-only deployment preflight missed bad legacy
-- data.
ALTER TABLE attempts VALIDATE CONSTRAINT attempts_context_attempt_no_check;
ALTER TABLE attempts VALIDATE CONSTRAINT attempts_passed_score_check;

ALTER TABLE attempts DROP CONSTRAINT attempts_attempt_no_check;
