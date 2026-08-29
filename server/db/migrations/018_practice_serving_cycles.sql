-- Durable practice serving cycles make the three-try budget a server-owned
-- invariant shared by English and native-language answers. A learner has at
-- most one active assigned question; completed cycles remain as immutable
-- history so a stale client can never reopen a fourth attempt.

CREATE TABLE practice_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('revision', 'new')),
  attempts_used INT NOT NULL DEFAULT 0 CHECK (attempts_used BETWEEN 0 AND 3),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  CONSTRAINT practice_cycles_state_check CHECK (
    (status = 'active' AND attempts_used < 3 AND closed_at IS NULL)
    OR (status = 'closed' AND closed_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX uq_practice_cycles_active_user
  ON practice_cycles (user_id)
  WHERE status = 'active';

CREATE INDEX idx_practice_cycles_question ON practice_cycles (question_id);
CREATE INDEX idx_practice_cycles_user_created_at ON practice_cycles (user_id, created_at DESC);

ALTER TABLE practice_cycles
  ADD CONSTRAINT practice_cycles_identity_owner_question_key
  UNIQUE (id, user_id, question_id);

-- Version durable responses at the same boundary that changes the practice
-- response contract. Deleting an incompatible replay would make its request
-- UUID claimable again and could duplicate paid work after a deploy. Keep
-- those rows as non-replayable tombstones until the normal 48-hour janitor
-- expires them. Legacy diagnostic responses with actual speech retain their
-- old, still-compatible shape and can safely be promoted to v2.
ALTER TABLE assessment_requests
  ADD COLUMN response_version SMALLINT,
  ADD COLUMN practice_cycle_id UUID;

UPDATE assessment_requests
SET response_version = 1;

UPDATE assessment_requests
SET response_version = 2
WHERE context = 'diagnostic'
  AND status = 'completed'
  AND jsonb_typeof(response_body->'transcript') = 'string'
  AND btrim(
    response_body->>'transcript',
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
  ) <> '';

ALTER TABLE assessment_requests
  ALTER COLUMN response_version SET DEFAULT 2,
  ALTER COLUMN response_version SET NOT NULL,
  ADD CONSTRAINT assessment_requests_response_version_check
    CHECK (response_version IN (1, 2));

-- Native answers are real spoken practice attempts for the shared three-try
-- budget, but intentionally have no English score/pass value. Keep their
-- comprehension verdict, faithful translation, and separate model answer in
-- the same durable history table used by History and account export.
ALTER TABLE attempts
  ADD COLUMN practice_cycle_id UUID REFERENCES practice_cycles(id) ON DELETE RESTRICT,
  ADD COLUMN understood BOOLEAN,
  ADD COLUMN translated_transcript TEXT,
  ADD COLUMN model_answer TEXT,
  ALTER COLUMN score DROP NOT NULL,
  ALTER COLUMN passed DROP NOT NULL;

-- Give legacy scored-practice rows a closed one-row cycle so the new foreign
-- key can be total without pretending we can reconstruct historical serving
-- boundaries that were never stored. New writers group tries correctly.
INSERT INTO practice_cycles (
  id, user_id, question_id, kind, attempts_used, status, created_at, updated_at, closed_at
)
SELECT
  a.id, a.user_id, a.question_id, 'revision', a.attempt_no, 'closed',
  a.created_at, a.created_at, a.created_at
FROM attempts a
WHERE a.context = 'practice';

UPDATE attempts
SET practice_cycle_id = id
WHERE context = 'practice';

ALTER TABLE attempts
  ADD CONSTRAINT attempts_practice_cycle_owner_question_fkey
  FOREIGN KEY (practice_cycle_id, user_id, question_id)
  REFERENCES practice_cycles (id, user_id, question_id) ON DELETE RESTRICT;

ALTER TABLE assessment_requests
  ADD CONSTRAINT assessment_requests_practice_cycle_owner_question_fkey
  FOREIGN KEY (practice_cycle_id, user_id, question_id)
  REFERENCES practice_cycles (id, user_id, question_id) ON DELETE RESTRICT,
  ADD CONSTRAINT assessment_requests_context_cycle_check CHECK (
    (context = 'diagnostic' AND practice_cycle_id IS NULL)
    OR (
      context IN ('practice', 'practice-native')
      AND (response_version = 1 OR practice_cycle_id IS NOT NULL)
    )
  );

ALTER TABLE attempts
  DROP CONSTRAINT attempts_context_check,
  DROP CONSTRAINT attempts_context_attempt_no_check,
  DROP CONSTRAINT attempts_passed_score_check;

ALTER TABLE attempts
  ADD CONSTRAINT attempts_context_check
    CHECK (context IN ('diagnostic', 'practice', 'practice-native')),
  ADD CONSTRAINT attempts_context_attempt_no_check CHECK (
    (context = 'diagnostic' AND attempt_no BETWEEN 1 AND 5)
    OR (context IN ('practice', 'practice-native') AND attempt_no BETWEEN 1 AND 3)
  ),
  ADD CONSTRAINT attempts_passed_score_check CHECK (
    (
      context IN ('diagnostic', 'practice')
      AND score IS NOT NULL
      AND passed = (score >= 60)
      AND understood IS NULL
      AND translated_transcript IS NULL
      AND model_answer IS NULL
    )
    OR
    (
      context = 'practice-native'
      AND score IS NULL
      AND passed IS NULL
      AND understood IS NOT NULL
      AND translated_transcript IS NOT NULL
      AND char_length(translated_transcript) BETWEEN 1 AND 12000
      AND btrim(translated_transcript, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> ''
      AND model_answer IS NOT NULL
      AND char_length(model_answer) BETWEEN 1 AND 800
      AND btrim(model_answer, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') <> ''
      AND practice_cycle_id IS NOT NULL
    )
  ),
  ADD CONSTRAINT attempts_context_cycle_check CHECK (
    (context = 'diagnostic' AND practice_cycle_id IS NULL)
    OR (context IN ('practice', 'practice-native') AND practice_cycle_id IS NOT NULL)
  );

CREATE INDEX idx_attempts_practice_cycle ON attempts (practice_cycle_id)
  WHERE practice_cycle_id IS NOT NULL;

-- One cycle owns one shared English/native sequence. The partial predicate
-- preserves diagnostic history (which intentionally has no cycle) while
-- making duplicate or cross-mode attempt numbers impossible in practice.
CREATE UNIQUE INDEX uq_attempts_practice_cycle_attempt_no
  ON attempts (practice_cycle_id, attempt_no)
  WHERE practice_cycle_id IS NOT NULL;

CREATE INDEX idx_assessment_requests_practice_cycle
  ON assessment_requests (practice_cycle_id)
  WHERE practice_cycle_id IS NOT NULL;
