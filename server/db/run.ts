// Database setup: create the database if missing, apply pending migrations
// from db/migrations/ (tracked in schema_migrations), then seed idempotently.
// Production deploys should run only compiled migrations via: npm run db:migrate:prod
//
// The exported functions are also reused by the test-suite global setup.
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEED_FILE = path.join(__dirname, 'seed.sql');
const CONNECTION_TIMEOUT_MS = 10_000;
const MIGRATION_STATEMENT_TIMEOUT_MS = 10 * 60 * 1000;
const MIGRATION_LOCK_TIMEOUT_MS = 30_000;

function databaseClient(connectionString: string): Client {
  return new Client({ connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });
}

type CapturedError = { value: unknown };

/**
 * Run every cleanup action, preserving an error that is already propagating.
 * Connection, rollback, and advisory-unlock failures must never replace the
 * migration/seed failure that operators need in order to diagnose a deploy.
 */
async function cleanupPreservingPrimaryError(
  actions: Array<() => Promise<unknown>>,
  primaryError?: CapturedError,
): Promise<void> {
  let firstError = primaryError;
  for (const action of actions) {
    try {
      await action();
    } catch (error) {
      firstError ??= { value: error };
    }
  }
  if (!primaryError && firstError) throw firstError.value;
}

async function setOperationTimeouts(client: Client): Promise<void> {
  await client.query("SELECT set_config('statement_timeout', $1, false)", [String(MIGRATION_STATEMENT_TIMEOUT_MS)]);
  await client.query("SELECT set_config('lock_timeout', $1, false)", [String(MIGRATION_LOCK_TIMEOUT_MS)]);
}

function parseDbName(dbUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(dbUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }
  let dbName: string;
  try {
    dbName = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error('DATABASE_URL contains an invalid encoded database name');
  }
  if (!dbName || dbName.includes('/')) throw new Error('DATABASE_URL must include exactly one database name');
  return dbName;
}

/** Create the database named in dbUrl if it does not exist yet. */
export async function ensureDatabase(dbUrl: string, log: (msg: string) => void = console.log): Promise<void> {
  const dbName = parseDbName(dbUrl);
  const adminUrl = new URL(dbUrl);
  adminUrl.pathname = '/postgres';
  const admin = databaseClient(adminUrl.toString());
  await admin.connect();
  let operationError: CapturedError | undefined;
  try {
    await setOperationTimeouts(admin);
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      log(`created database "${dbName}"`);
    } else {
      log(`database "${dbName}" already exists`);
    }
  } catch (error) {
    operationError = { value: error };
    throw error;
  } finally {
    await cleanupPreservingPrimaryError([() => admin.end()], operationError);
  }
}

/**
 * Apply any pending db/migrations/*.sql files, in filename order.
 * Applied names and SHA-256 checksums are recorded in schema_migrations.
 * A PostgreSQL advisory lock serializes concurrent migration jobs.
 */
export async function migrate(dbUrl: string, log: (msg: string) => void = console.log): Promise<string[]> {
  const client = databaseClient(dbUrl);
  await client.connect();
  const applied: string[] = [];
  let operationError: CapturedError | undefined;
  try {
    await setOperationTimeouts(client);
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('ai_english_schema_migrations')) AS locked",
    );
    if (!lock.rows[0].locked) {
      throw new Error('another migration or seed operation is already in progress');
    }
    let migrationError: CapturedError | undefined;
    try {
      await client.query(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      );
      await client.query('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT');
      const files = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      const { rows } = await client.query<{ name: string; checksum: string | null }>(
        'SELECT name, checksum FROM schema_migrations',
      );
      const done = new Map(rows.map((r) => [r.name, r.checksum]));
      const unknown = rows.map((r) => r.name).filter((name) => !files.includes(name));
      if (unknown.length > 0) {
        throw new Error(`database contains migration records missing from this release: ${unknown.join(', ')}`);
      }
      for (const file of files) {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        if (done.has(file)) {
          const recorded = done.get(file);
          if (recorded && recorded !== checksum) {
            throw new Error(`applied migration ${file} has changed (checksum mismatch)`);
          }
          if (!recorded) {
            // Backfill hashes for databases created before checksum tracking.
            await client.query('UPDATE schema_migrations SET checksum = $1 WHERE name = $2 AND checksum IS NULL', [
              checksum,
              file,
            ]);
          }
          continue;
        }
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [file, checksum]);
          await client.query('COMMIT');
        } catch (err) {
          await cleanupPreservingPrimaryError([() => client.query('ROLLBACK')], { value: err });
          throw err;
        }
        applied.push(file);
        log(`applied migration ${file}`);
      }
      await client.query('ALTER TABLE schema_migrations ALTER COLUMN checksum SET NOT NULL');
    } catch (error) {
      migrationError = { value: error };
      throw error;
    } finally {
      await cleanupPreservingPrimaryError(
        [() => client.query("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))")],
        migrationError,
      );
    }
    if (applied.length === 0) log('no pending migrations');
  } catch (error) {
    operationError = { value: error };
    throw error;
  } finally {
    await cleanupPreservingPrimaryError([() => client.end()], operationError);
  }
  return applied;
}

/** Idempotently insert/update the 36 questions without changing their IDs. */
export async function seed(dbUrl: string, log: (msg: string) => void = console.log): Promise<void> {
  const client = databaseClient(dbUrl);
  await client.connect();
  let operationLockHeld = false;
  let operationError: CapturedError | undefined;
  try {
    await setOperationTimeouts(client);
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('ai_english_schema_migrations')) AS locked",
    );
    if (!lock.rows[0].locked) {
      throw new Error('another migration or seed operation is already in progress');
    }
    operationLockHeld = true;
    await client.query('BEGIN');
    try {
      await client.query(fs.readFileSync(SEED_FILE, 'utf8'));
      await client.query('COMMIT');
    } catch (error) {
      await cleanupPreservingPrimaryError([() => client.query('ROLLBACK')], { value: error });
      throw error;
    }
    const { rows: counts } = await client.query(
      'SELECT cefr_level, count(*)::int AS n FROM questions GROUP BY cefr_level ORDER BY cefr_level',
    );
    log('questions per level: ' + JSON.stringify(counts));
  } catch (error) {
    operationError = { value: error };
    throw error;
  } finally {
    await cleanupPreservingPrimaryError(
      [
        ...(operationLockHeld
          ? [() => client.query("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))")]
          : []),
        () => client.end(),
      ],
      operationError,
    );
  }
}

export interface DatabaseSetupSteps {
  ensure: typeof ensureDatabase;
  migrate: typeof migrate;
  seed: typeof seed;
}

const defaultSetupSteps: DatabaseSetupSteps = {
  ensure: ensureDatabase,
  migrate,
  seed,
};

export async function setupDatabase(
  dbUrl: string,
  log: (msg: string) => void = console.log,
  steps: DatabaseSetupSteps = defaultSetupSteps,
): Promise<void> {
  await steps.ensure(dbUrl, log);
  await steps.migrate(dbUrl, log);
  await steps.seed(dbUrl, log);
}

export type DatabaseCommand = 'migrate' | 'seed' | 'setup';

export interface DatabaseCommandActions {
  migrate: typeof migrate;
  seed: typeof seed;
  setup: typeof setupDatabase;
}

const defaultCommandActions: DatabaseCommandActions = {
  migrate,
  seed,
  setup: setupDatabase,
};

export async function runDatabaseCommand(
  databaseUrl: string | undefined,
  command = 'setup',
  actions: DatabaseCommandActions = defaultCommandActions,
): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (command === 'migrate') {
    await actions.migrate(databaseUrl);
    return;
  }
  if (command === 'seed' || command === 'setup') {
    // Local bootstrap only: deploys apply compiled migrations via
    // `npm run db:migrate:prod` and must never reseed or recreate a
    // production database by operator mistake.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `refusing to run "${command}" with NODE_ENV=production; production deploys must use "npm run db:migrate:prod"`,
      );
    }
    if (command === 'seed') {
      await actions.seed(databaseUrl);
      return;
    }
    await actions.setup(databaseUrl);
    return;
  }
  throw new Error(`unknown database command "${command}" (expected "setup", "migrate", or "seed")`);
}

// Stryker disable all: command dispatch is unit-tested and this process
// identity/error boundary is subprocess-tested. Mutating require.main in the
// Vitest host produces runner bootstrap errors rather than useful mutants.
if (require.main === module) {
  dotenv.config();
  runDatabaseCommand(process.env.DATABASE_URL, process.argv[2]).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
// Stryker restore all
