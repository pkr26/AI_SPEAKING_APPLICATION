// Database setup: create the database if missing, apply pending migrations
// from db/migrations/ (tracked in schema_migrations), then seed idempotently.
// Production deploys should run only compiled migrations via: npm run db:migrate:prod
//
// The exported functions are also reused by the test-suite global setup.
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEED_FILE = path.join(__dirname, 'seed.sql');
const CONNECTION_TIMEOUT_MS = 10_000;
const MIGRATION_STATEMENT_TIMEOUT_MS = 10 * 60 * 1000;
const MIGRATION_LOCK_TIMEOUT_MS = 30_000;

function databaseClient(connectionString: string): Client {
  return new Client({ connectionString, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS });
}

async function setOperationTimeouts(client: Client): Promise<void> {
  await client.query("SELECT set_config('statement_timeout', $1, false)", [String(MIGRATION_STATEMENT_TIMEOUT_MS)]);
  await client.query("SELECT set_config('lock_timeout', $1, false)", [String(MIGRATION_LOCK_TIMEOUT_MS)]);
}

function parseDbName(dbUrl: string): string {
  const dbName = decodeURIComponent(new URL(dbUrl).pathname.replace(/^\//, ''));
  if (!dbName) throw new Error('DATABASE_URL must include a database name');
  return dbName;
}

/** Create the database named in dbUrl if it does not exist yet. */
export async function ensureDatabase(dbUrl: string, log: (msg: string) => void = console.log): Promise<void> {
  const dbName = parseDbName(dbUrl);
  const adminUrl = new URL(dbUrl);
  adminUrl.pathname = '/postgres';
  const admin = databaseClient(adminUrl.toString());
  await admin.connect();
  try {
    await setOperationTimeouts(admin);
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      log(`created database "${dbName}"`);
    } else {
      log(`database "${dbName}" already exists`);
    }
  } finally {
    await admin.end();
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
  try {
    await setOperationTimeouts(client);
    const lock = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('ai_english_schema_migrations')) AS locked",
    );
    if (!lock.rows[0].locked) {
      throw new Error('another migration or seed operation is already in progress');
    }
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
          await client.query('ROLLBACK');
          throw err;
        }
        applied.push(file);
        log(`applied migration ${file}`);
      }
      await client.query('ALTER TABLE schema_migrations ALTER COLUMN checksum SET NOT NULL');
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
    }
    if (applied.length === 0) log('no pending migrations');
  } finally {
    await client.end();
  }
  return applied;
}

/** Idempotently insert/update the 36 questions without changing their IDs. */
export async function seed(dbUrl: string, log: (msg: string) => void = console.log): Promise<void> {
  const client = databaseClient(dbUrl);
  await client.connect();
  let operationLockHeld = false;
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
      await client.query('ROLLBACK');
      throw error;
    }
    const { rows: counts } = await client.query(
      'SELECT cefr_level, count(*)::int AS n FROM questions GROUP BY cefr_level ORDER BY cefr_level',
    );
    log('questions per level: ' + JSON.stringify(counts));
  } finally {
    if (operationLockHeld) {
      await client.query("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))").catch(() => undefined);
    }
    await client.end();
  }
}

export async function setupDatabase(dbUrl: string, log: (msg: string) => void = console.log): Promise<void> {
  await ensureDatabase(dbUrl, log);
  await migrate(dbUrl, log);
  await seed(dbUrl, log);
}

async function main() {
  const { default: dotenv } = await import('dotenv');
  dotenv.config();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const command = process.argv[2] ?? 'setup';
  if (command === 'migrate') {
    await migrate(databaseUrl);
    return;
  }
  if (command === 'seed') {
    await seed(databaseUrl);
    return;
  }
  if (command === 'setup') {
    await setupDatabase(databaseUrl);
    return;
  }
  throw new Error(`unknown database command "${command}" (expected "setup", "migrate", or "seed")`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
