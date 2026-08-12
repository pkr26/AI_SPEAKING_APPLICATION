-- Ownership tokens prevent a worker whose five-minute lease expired from
-- completing or deleting a replacement worker's idempotency record.

ALTER TABLE assessment_requests
  ADD COLUMN claim_id UUID;

UPDATE assessment_requests
SET claim_id = gen_random_uuid()
WHERE claim_id IS NULL;

ALTER TABLE assessment_requests
  ALTER COLUMN claim_id SET NOT NULL;

CREATE INDEX idx_assessment_requests_completed_at
  ON assessment_requests (completed_at)
  WHERE status = 'completed';
