-- Schema hardening follow-up to 010:
-- (a) The SRS ladder is 5 steps (SRS_INTERVALS_DAYS in practice.ts), so the
--     interval index can only ever be 0..4; tighten the CHECK accordingly.
-- (b) Extend 010's "never destroy learner history" invariant to the remaining
--     question foreign keys: deleting or republishing a question must surface
--     the dependency (RESTRICT) instead of cascading away progress rows,
--     in-flight claims, idempotency records, or diagnostic state.

ALTER TABLE practice_progress
  DROP CONSTRAINT practice_progress_srs_interval_index_check;
ALTER TABLE practice_progress
  ADD CONSTRAINT practice_progress_srs_interval_index_check CHECK (srs_interval_index BETWEEN 0 AND 4);

ALTER TABLE assessment_requests
  DROP CONSTRAINT assessment_requests_question_id_fkey;
ALTER TABLE assessment_requests
  ADD CONSTRAINT assessment_requests_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT;

ALTER TABLE practice_progress
  DROP CONSTRAINT practice_progress_question_id_fkey;
ALTER TABLE practice_progress
  ADD CONSTRAINT practice_progress_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT;

ALTER TABLE practice_inflight
  DROP CONSTRAINT practice_inflight_question_id_fkey;
ALTER TABLE practice_inflight
  ADD CONSTRAINT practice_inflight_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE RESTRICT;

ALTER TABLE diagnostic_state
  DROP CONSTRAINT diagnostic_state_current_question_id_fkey;
ALTER TABLE diagnostic_state
  ADD CONSTRAINT diagnostic_state_current_question_id_fkey
  FOREIGN KEY (current_question_id) REFERENCES questions(id) ON DELETE RESTRICT;

ALTER TABLE diagnostic_state
  DROP CONSTRAINT diagnostic_state_processing_question_id_fkey;
ALTER TABLE diagnostic_state
  ADD CONSTRAINT diagnostic_state_processing_question_id_fkey
  FOREIGN KEY (processing_question_id) REFERENCES questions(id) ON DELETE RESTRICT;
