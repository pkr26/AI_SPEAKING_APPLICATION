-- One presigned S3 object is one logical assessment input. Without this
-- binding, two different requestIds can concurrently spend paid work against
-- the same upload, and the first successful request can delete the object
-- while the second request is about to read it.
--
-- Migration 012 only added cleanup metadata and did not enforce uniqueness.
-- Exclude old-replica writers across normalization + index construction. The
-- UPDATE alone takes only ROW EXCLUSIVE, which is compatible with INSERT and
-- would leave a duplicate-insert gap before CREATE UNIQUE INDEX takes its
-- stronger lock.
LOCK TABLE assessment_requests IN SHARE ROW EXCLUSIVE MODE;

-- Expired request rows are already outside every recovery/ownership contract.
-- Clear only their cleanup binding here; the normal janitor still owns row
-- deletion. This also prevents an expired processing lease from outranking a
-- completed owner for an already-consumed object.
UPDATE assessment_requests
SET audio_key = NULL
WHERE audio_key IS NOT NULL
  AND (
    (status = 'processing' AND started_at < now() - interval '5 minutes')
    OR
    (status = 'completed' AND completed_at < now() - interval '48 hours')
  );

-- There is no safe single-row winner while two live workers share one object,
-- or while a live worker conflicts with a completed tombstone: clearing either
-- binding would reopen cleanup/reassessment races in the old replica that owns
-- it. Fail the deploy and retry after old replicas drain / five-minute leases
-- expire instead of silently weakening ownership.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM assessment_requests
    WHERE audio_key IS NOT NULL
    GROUP BY user_id, audio_key
    HAVING count(*) FILTER (WHERE status = 'processing') > 1
       OR (
         count(*) FILTER (WHERE status = 'processing') > 0
         AND count(*) FILTER (WHERE status = 'completed') > 0
       )
  ) THEN
    RAISE EXCEPTION 'cannot safely deduplicate live assessment audio owners; drain old replicas and retry'
      USING ERRCODE = '55000';
  END IF;
END
$$;

-- Remaining duplicates are completed replay tombstones. Keep the most recent
-- completion; the other rows remain valid replay records and NULL only removes
-- their obsolete cleanup binding.

WITH ranked_audio_owners AS (
  SELECT ctid,
         row_number() OVER (
           PARTITION BY user_id, audio_key
           ORDER BY completed_at DESC NULLS LAST, started_at DESC, request_id DESC
         ) AS owner_rank
  FROM assessment_requests
  WHERE audio_key IS NOT NULL
)
UPDATE assessment_requests AS requests
SET audio_key = NULL
FROM ranked_audio_owners AS ranked
WHERE requests.ctid = ranked.ctid
  AND ranked.owner_rank > 1;

CREATE UNIQUE INDEX uq_assessment_requests_user_audio_key
  ON assessment_requests (user_id, audio_key)
  WHERE audio_key IS NOT NULL;
