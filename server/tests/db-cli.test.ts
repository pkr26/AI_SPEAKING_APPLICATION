import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

const SERVER_DIRECTORY = path.resolve(__dirname, '..');
const TSX_CLI = require.resolve('tsx/cli');

function runTypeScriptCli(relativePath: string, args: string[], environment: NodeJS.ProcessEnv, timeout = 15_000) {
  return spawnSync(process.execPath, [TSX_CLI, path.join(SERVER_DIRECTORY, relativePath), ...args], {
    cwd: SERVER_DIRECTORY,
    env: { ...process.env, ...environment },
    encoding: 'utf8',
    timeout,
  });
}

/** Same server/credentials as the suite database, with a swappable name. */
function suiteDatabaseUrl(databaseName?: string): string {
  const url = new URL(process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/ai_english_test');
  if (databaseName !== undefined) url.pathname = `/${databaseName}`;
  return url.toString();
}

async function dropDatabaseIfExists(databaseName: string): Promise<void> {
  const admin = new Client({ connectionString: suiteDatabaseUrl('postgres') });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName.replace(/"/g, '""')}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
}

async function createScratchDatabase(databaseName: string): Promise<void> {
  const admin = new Client({ connectionString: suiteDatabaseUrl('postgres') });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }
}

describe('database CLI entrypoints', () => {
  it('executes the mutation database safety guard as a standalone command', () => {
    const result = runTypeScriptCli('db/mutation-db-guard.ts', [], {
      DATABASE_URL: 'postgres://localhost:5432/application',
      TEST_DATABASE_URL: 'postgres://localhost:5432/cli_mutation_test',
      PGPORT: '5432',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('exits nonzero when the standalone mutation guard receives an unsafe target', () => {
    const result = runTypeScriptCli('db/mutation-db-guard.ts', [], {
      DATABASE_URL: 'postgres://localhost:5432/application',
      TEST_DATABASE_URL: 'postgres://localhost:5432/ai_english_test',
      PGPORT: '5432',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('dedicated mutation database');
  });

  it('executes the preflight entrypoint and reports missing configuration through stderr', () => {
    const result = runTypeScriptCli('db/preflight.ts', [], { DATABASE_URL: '' });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DATABASE_URL is required');
  });

  it('executes the database runner entrypoint and rejects an unknown command before connecting', () => {
    const result = runTypeScriptCli('db/run.ts', ['drop'], {
      DATABASE_URL: 'postgres://localhost:5432/cli_test',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('unknown database command "drop"');
  });

  it('executes the database runner entrypoint and rejects a missing DATABASE_URL before connecting', () => {
    const result = runTypeScriptCli('db/run.ts', ['migrate'], { DATABASE_URL: '' });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DATABASE_URL is required');
  });

  it('executes the catalog publication command against the migrated test database', () => {
    const result = runTypeScriptCli('db/run.ts', ['catalog'], { DATABASE_URL: suiteDatabaseUrl() }, 60_000);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('questions per level: ');
  });

  it('executes the seed command outside production idempotently', () => {
    const result = runTypeScriptCli('db/run.ts', ['seed'], { DATABASE_URL: suiteDatabaseUrl() }, 60_000);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('questions per level: ');
  });

  it('bootstraps a fresh database end to end through the setup command', async () => {
    const databaseName = `cli_setup_test_${process.pid}_${Date.now()}`;
    const result = runTypeScriptCli('db/run.ts', ['setup'], { DATABASE_URL: suiteDatabaseUrl(databaseName) }, 120_000);

    try {
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`created database "${databaseName}"`);
      expect(result.stdout).toContain('questions per level: ');
    } finally {
      await dropDatabaseIfExists(databaseName);
    }
  });

  it('refuses setup and seed with NODE_ENV=production before connecting', () => {
    for (const command of ['setup', 'seed']) {
      const result = runTypeScriptCli('db/run.ts', [command], {
        DATABASE_URL: 'postgres://localhost:5432/cli_prod_guard',
        NODE_ENV: 'production',
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        `refusing to run "${command}" with NODE_ENV=production; production deploys must use "npm run db:migrate:prod" and "npm run db:catalog:prod"`,
      );
    }
  });

  it('still allows migrate with NODE_ENV=production (the db:migrate:prod path)', () => {
    // The already-migrated test database makes the production migrate a no-op.
    const result = runTypeScriptCli('db/run.ts', ['migrate'], {
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/ai_english_test',
      NODE_ENV: 'production',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('no pending migrations');
  });

  it('rejects migrate when a recorded runtime cutover fence no longer matches its checksum', async () => {
    const databaseName = `cli_fence_test_${process.pid}_${Date.now()}`;
    await dropDatabaseIfExists(databaseName);
    await createScratchDatabase(databaseName);
    try {
      const migrated = runTypeScriptCli(
        'db/run.ts',
        ['migrate'],
        { DATABASE_URL: suiteDatabaseUrl(databaseName) },
        120_000,
      );
      expect(migrated.error).toBeUndefined();
      expect(migrated.status).toBe(0);
      expect(migrated.stdout).toContain('applied migration 026_attempts_question_snapshots.sql');

      const corrupt = new Client({ connectionString: suiteDatabaseUrl(databaseName) });
      await corrupt.connect();
      try {
        const corrupted = await corrupt.query(
          `UPDATE schema_migrations SET checksum = 'deadbeef'
           WHERE name = '000_runtime_cutover_recording_privacy_v1'`,
        );
        expect(corrupted.rowCount).toBe(1);
      } finally {
        await corrupt.end();
      }

      const rejected = runTypeScriptCli(
        'db/run.ts',
        ['migrate'],
        { DATABASE_URL: suiteDatabaseUrl(databaseName) },
        120_000,
      );
      expect(rejected.error).toBeUndefined();
      expect(rejected.status).toBe(1);
      expect(rejected.stderr).toContain(
        'database runtime cutover fence 000_runtime_cutover_recording_privacy_v1 is missing, invalid, or out of sequence',
      );
    } finally {
      await dropDatabaseIfExists(databaseName);
    }
  });

  it('executes the seed generator entrypoint without changing the deterministic artifact', () => {
    const seedPath = path.join(SERVER_DIRECTORY, 'db', 'seed.sql');
    const before = fs.readFileSync(seedPath, 'utf8');
    try {
      const result = runTypeScriptCli('db/generate-seed.ts', [], {});

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('wrote db/seed.sql with 600 questions');
      expect(fs.readFileSync(seedPath, 'utf8')).toBe(before);
    } finally {
      if (fs.readFileSync(seedPath, 'utf8') !== before) fs.writeFileSync(seedPath, before, 'utf8');
    }
  });
});
