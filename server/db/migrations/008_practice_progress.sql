-- Per-word practice mastery: a word is 'learning' until one practice attempt
-- scores >= 75 ('mastered'). Drives the revision/new interleave in practice
-- question selection. Backfilled from existing practice attempts so current
-- users keep their progress.

CREATE TABLE practice_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('learning', 'mastered')),
  best_score INT NOT NULL CHECK (best_score BETWEEN 0 AND 100),
  attempt_count INT NOT NULL CHECK (attempt_count > 0),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE INDEX idx_practice_progress_user_status
  ON practice_progress (user_id, status, last_attempt_at);

INSERT INTO practice_progress (user_id, question_id, status, best_score, attempt_count, last_attempt_at)
SELECT
  user_id,
  question_id,
  CASE WHEN max(score) >= 75 THEN 'mastered' ELSE 'learning' END,
  max(score)::int,
  count(*)::int,
  max(created_at)
FROM attempts
WHERE context = 'practice'
GROUP BY user_id, question_id;
