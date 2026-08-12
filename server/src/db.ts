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
