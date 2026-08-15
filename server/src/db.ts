import { Pool } from 'pg';
import { config } from './config';
import { logger } from './logger';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: config.dbStatementTimeoutMs,
  query_timeout: config.dbStatementTimeoutMs + 1_000,
  lock_timeout: config.dbLockTimeoutMs,
  maxLifetimeSeconds: 5 * 60,
});

// Idle-client errors must not take the process down.
pool.on('error', (err) => {
  logger.error({ err }, 'unexpected error on idle postgres client');
});

// Typed row for the questions table. Routes select these explicit columns
// instead of `SELECT *` so schema drift surfaces as a type error, not as an
// undefined property at runtime.
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface QuestionTranslation {
  word: string;
  question: string;
  examples: Array<{ en?: string; native?: string }>;
}

export interface QuestionRow {
  id: string;
  cefr_level: CefrLevel;
  prompt_word: string;
  question_text: string;
  translations: Partial<Record<string, QuestionTranslation>>;
}

export const QUESTION_ROW_COLUMNS = 'id, cefr_level, prompt_word, question_text, translations';
