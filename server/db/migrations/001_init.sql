-- Schema for the AI English Learning app (PostgreSQL 14+)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  native_language TEXT NOT NULL CHECK (native_language IN ('te','hi','es','zh')),
  cefr_level TEXT,
  diagnostic_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cefr_level TEXT NOT NULL CHECK (cefr_level IN ('A1','A2','B1','B2','C1','C2')),
  prompt_word TEXT NOT NULL,
  question_text TEXT NOT NULL,
  translations JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  question_id UUID REFERENCES questions(id),
  context TEXT NOT NULL CHECK (context IN ('diagnostic','practice')),
  attempt_no INT NOT NULL,
  transcript TEXT,
  score INT,
  passed BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS diagnostic_state (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  low_idx INT NOT NULL,
  high_idx INT NOT NULL,
  questions_asked INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts (user_id, question_id, context, created_at);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions (cefr_level);
