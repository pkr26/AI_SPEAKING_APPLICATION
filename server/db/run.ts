// Database setup: create the database if missing, apply pending migrations
// from db/migrations/ (tracked in schema_migrations), then seed idempotently.
// Production deploys run compiled migrations, then explicitly publish the
// reviewed catalog (neither command creates a database).
//
// The exported functions are also reused by the test-suite global setup.
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { RUNTIME_SCHEMA_CUTOVERS } from './schema-cutover';

const CONNECTION_TIMEOUT_MS = 10_000;

function databaseClient(connectionString: string): Client {
  return new Client({ connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });
}

/**
 * Run every cleanup action, preserving an error that is already propagating.
 * Connection, rollback, and advisory-unlock failures must never replace the
 * migration/seed failure that operators need in order to diagnose a deploy.
 */
async function cleanupPreservingPrimaryError(
  actions: Array<() => Promise<unknown>>,
  primaryFailure: boolean,
): Promise<void> {
  let firstCleanupError: unknown;
  let cleanupFailed = false;
  for (const action of actions) {
    try {
      await action();
    } catch (error) {
      if (!cleanupFailed) {
        firstCleanupError = error;
        cleanupFailed = true;
      }
    }
  }
  if (!primaryFailure && cleanupFailed) throw firstCleanupError;
}

async function setOperationTimeouts(client: Client): Promise<void> {
  const statementTimeoutMs = 600_000;
  const lockTimeoutMs = 30_000;
  await client.query("SELECT set_config('statement_timeout', $1, false)", [String(statementTimeoutMs)]);
  await client.query("SELECT set_config('lock_timeout', $1, false)", [String(lockTimeoutMs)]);
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
  let creationLockHeld = false;
  let operationFailed = false;
  try {
    await setOperationTimeouts(admin);
    // CREATE DATABASE cannot run inside a transaction, so serialize the
    // existence check + create pair with a session advisory lock. Without
    // this, two concurrent local setup processes can both observe a missing
    // database and one then fails with duplicate_database. The statement
    // timeout set above bounds the wait; the database-name key lets unrelated
    // local databases bootstrap independently.
    await admin.query("SELECT pg_advisory_lock(hashtext('ai_english_create_database'), hashtext($1))", [dbName]);
    creationLockHeld = true;
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      try {
        await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
        log(`created database "${dbName}"`);
      } catch (error) {
        // The advisory lock coordinates this runner, but an external creator
        // need not honor it. Accept duplicate_database only after proving the
        // requested database now exists; every other create error remains the
        // primary failure.
        if ((error as { code?: unknown }).code !== '42P04') throw error;
        const raced = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (raced.rows.length === 0) throw error;
        log(`database "${dbName}" already exists`);
      }
    } else {
      log(`database "${dbName}" already exists`);
    }
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    const cleanupActions: Array<() => Promise<unknown>> = [() => admin.end()];
    if (creationLockHeld) {
      cleanupActions.unshift(() =>
        admin.query("SELECT pg_advisory_unlock(hashtext('ai_english_create_database'), hashtext($1))", [dbName]),
      );
    }
    await cleanupPreservingPrimaryError(cleanupActions, operationFailed);
  }
}

/**
 * Apply any pending db/migrations/*.sql files, in filename order.
 * Applied names and SHA-256 checksums are recorded in schema_migrations.
 * A PostgreSQL advisory lock serializes concurrent migration jobs.
 */
export async function migrate(dbUrl: string, log: (msg: string) => void = console.log): Promise<string[]> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const client = databaseClient(dbUrl);
  await client.connect();
  const applied: string[] = [];
  let operationFailed = false;
  try {
    await setOperationTimeouts(client);
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('ai_english_schema_migrations')) AS locked",
    );
    if (!lock.rows[0].locked) {
      throw new Error('another migration or seed operation is already in progress');
    }
    let migrationFailed = false;
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
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      const { rows } = await client.query<{ name: string; checksum: string | null }>(
        'SELECT name, checksum FROM schema_migrations',
      );
      const fenceNames = new Set<string>(RUNTIME_SCHEMA_CUTOVERS.map(({ name }) => name));
      const ordinaryRows = rows.filter(({ name }) => !fenceNames.has(name));
      for (const cutover of RUNTIME_SCHEMA_CUTOVERS) {
        const fenceRows = rows.filter(({ name }) => name === cutover.name);
        const cutoverRequired = ordinaryRows.some(({ name }) => name === cutover.requiredMigration);
        const cutoverValid = fenceRows.length === 1 && fenceRows[0]?.checksum === cutover.checksum;
        if ((fenceRows.length > 0 && !cutoverValid) || cutoverRequired !== cutoverValid) {
          throw new Error(`database runtime cutover fence ${cutover.name} is missing, invalid, or out of sequence`);
        }
      }

      const done = new Map(ordinaryRows.map((r) => [r.name, r.checksum]));
      const unknown = ordinaryRows.map((r) => r.name).filter((name) => !files.includes(name));
      if (unknown.length > 0) {
        throw new Error(`database contains migration records missing from this release: ${unknown.join(', ')}`);
      }
      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
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
          await cleanupPreservingPrimaryError([() => client.query('ROLLBACK')], true);
          throw err;
        }
        applied.push(file);
        log(`applied migration ${file}`);
      }
      await client.query('ALTER TABLE schema_migrations ALTER COLUMN checksum SET NOT NULL');
    } catch (error) {
      migrationFailed = true;
      throw error;
    } finally {
      await cleanupPreservingPrimaryError(
        [() => client.query("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))")],
        migrationFailed,
      );
    }
    if (applied.length === 0) log('no pending migrations');
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    await cleanupPreservingPrimaryError([() => client.end()], operationFailed);
  }
  return applied;
}

/** Idempotently insert/update the 600 questions without changing their IDs. */
export async function seed(dbUrl: string, log: (msg: string) => void = console.log): Promise<void> {
  const seedFile = path.join(__dirname, 'seed.sql');
  const client = databaseClient(dbUrl);
  await client.connect();
  let operationLockHeld = false;
  let operationFailed = false;
  try {
    await setOperationTimeouts(client);
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('ai_english_schema_migrations')) AS locked",
    );
    if (!lock.rows[0].locked) {
      throw new Error('another migration or seed operation is already in progress');
    }
    operationLockHeld = true;
    // seed.sql carries its own BEGIN/COMMIT; wrapping it in a second
    // transaction only produces "already in transaction" warnings. The catch
    // still issues a ROLLBACK so a mid-file failure leaves no open
    // transaction on this client before it ends.
    try {
      await client.query(fs.readFileSync(seedFile, 'utf8'));
    } catch (error) {
      await cleanupPreservingPrimaryError([() => client.query('ROLLBACK')], true);
      throw error;
    }
    const { rows: counts } = await client.query(
      'SELECT cefr_level, count(*)::int AS n FROM questions GROUP BY cefr_level ORDER BY cefr_level',
    );
    log('questions per level: ' + JSON.stringify(counts));
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    const cleanupActions: Array<() => Promise<unknown>> = [() => client.end()];
    if (operationLockHeld) {
      cleanupActions.unshift(() => client.query("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))"));
    }
    await cleanupPreservingPrimaryError(cleanupActions, operationFailed);
  }
}

export interface DatabaseSetupSteps {
  ensure: typeof ensureDatabase;
  migrate: typeof migrate;
  seed: typeof seed;
}

function defaultSetupSteps(): DatabaseSetupSteps {
  return {
    ensure: ensureDatabase,
    migrate,
    seed,
  };
}

export async function setupDatabase(
  dbUrl: string,
  log: (msg: string) => void = console.log,
  steps: DatabaseSetupSteps = defaultSetupSteps(),
): Promise<void> {
  await steps.ensure(dbUrl, log);
  await steps.migrate(dbUrl, log);
  await steps.seed(dbUrl, log);
}

export interface DatabaseCommandActions {
  migrate: typeof migrate;
  catalog: typeof seed;
  seed: typeof seed;
  setup: typeof setupDatabase;
}

function defaultCommandActions(): DatabaseCommandActions {
  return {
    migrate,
    catalog: seed,
    seed,
    setup: setupDatabase,
  };
}

export async function runDatabaseCommand(
  databaseUrl: string | undefined,
  command = 'setup',
  actions: DatabaseCommandActions = defaultCommandActions(),
): Promise<void> {
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (command === 'migrate') {
    await actions.migrate(databaseUrl);
    return;
  }
  if (command === 'catalog') {
    // Safe production publication: unlike setup this neither creates a
    // database nor changes schema, and seed.sql only upserts stable natural
    // keys while the shared deployment lock excludes migrations.
    await actions.catalog(databaseUrl);
    return;
  }
  if (command === 'seed' || command === 'setup') {
    // Local bootstrap only: deploys apply compiled migrations via
    // `npm run db:migrate:prod` and must never reseed or recreate a
    // production database by operator mistake.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `refusing to run "${command}" with NODE_ENV=production; production deploys must use "npm run db:migrate:prod" and "npm run db:catalog:prod"`,
      );
    }
    if (command === 'seed') {
      await actions.seed(databaseUrl);
      return;
    }
    await actions.setup(databaseUrl);
    return;
  }
  throw new Error(`unknown database command "${command}" (expected "setup", "migrate", "catalog", or "seed")`);
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
