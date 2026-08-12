-- Durable response replay makes assessment POSTs safe when a mobile client
-- loses the network response after the server has committed the attempt.

CREATE TABLE assessment_requests (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('diagnostic', 'practice')),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed')),
  response_body JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, request_id),
  CONSTRAINT assessment_requests_response_check CHECK (
    (status = 'processing' AND response_body IS NULL AND completed_at IS NULL)
    OR
    (status = 'completed' AND response_body IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE INDEX idx_assessment_requests_started_at
  ON assessment_requests (started_at);
