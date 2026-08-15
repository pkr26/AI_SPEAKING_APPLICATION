-- Native-language practice has a different response contract from scored
-- English practice. Keep their durable idempotency namespaces distinct so a
-- request UUID completed on one endpoint can never replay through the other.

ALTER TABLE assessment_requests
  DROP CONSTRAINT assessment_requests_context_check;

ALTER TABLE assessment_requests
  ADD CONSTRAINT assessment_requests_context_check
  CHECK (context IN ('diagnostic', 'practice', 'practice-native'));
