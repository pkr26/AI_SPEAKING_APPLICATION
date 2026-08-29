-- Keep the final placement reveal durable until the learner explicitly
-- acknowledges it. Existing accounts have already moved past any historical
-- reveal, so completed accounts are backfilled as acknowledged; incomplete
-- accounts and new registrations remain unacknowledged.

-- The previous runtime advertised a five-question defensive ceiling, while
-- the six-level binary search actually completes in at most three. An
-- interrupted legacy run can therefore contain an incomplete state at or
-- above the new ceiling. It has no valid next midpoint and must restart as a
-- fresh placement run; completed learners keep their final state/history.
UPDATE diagnostic_state AS state
SET low_idx = 0,
    high_idx = 5,
    questions_asked = 0,
    current_question_id = NULL,
    processing_question_id = NULL,
    processing_started_at = NULL,
    processing_claim_id = NULL
FROM users
WHERE users.id = state.user_id
  AND users.diagnostic_completed = false
  AND state.questions_asked >= 3;

ALTER TABLE users ADD COLUMN diagnostic_acknowledged BOOLEAN;

UPDATE users SET diagnostic_acknowledged = diagnostic_completed;

ALTER TABLE users
  ALTER COLUMN diagnostic_acknowledged SET NOT NULL,
  ALTER COLUMN diagnostic_acknowledged SET DEFAULT false,
  ADD CONSTRAINT users_diagnostic_acknowledgement_check
    CHECK (NOT diagnostic_acknowledged OR diagnostic_completed);
