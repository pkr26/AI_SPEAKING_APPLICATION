import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryResult = { rows: unknown[] };
type FakeClient = {
  connect: ReturnType<typeof vi.fn>;
  query: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
};

const pgMock = vi.hoisted(() => ({
  clients: [] as FakeClient[],
  options: [] as unknown[],
}));

vi.mock('pg', () => ({
  Client: class MockClient {
    constructor(options: unknown) {
      pgMock.options.push(options);
      const client = pgMock.clients.shift();
      if (!client) throw new Error('test did not provide a pg client');
      return client;
    }
  },
}));

import {
  DatabaseCommandActions,
  DatabaseSetupSteps,
  ensureDatabase,
  migrate,
  runDatabaseCommand,
  seed,
  setupDatabase,
} from '../db/run';

const migrationsDir = path.join(__dirname, '../db/migrations');

function migrationRows(firstChecksum: string | null = 'recorded') {
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name, index) => {
      const sql = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      return { name, checksum: index === 0 && firstChecksum !== 'recorded' ? firstChecksum : checksum };
    });
}

function provideClient(
  query: (sql: string, params?: unknown[]) => Promise<QueryResult> = async () => ({ rows: [] }),
): FakeClient {
  const client: FakeClient = {
    connect: vi.fn(async () => undefined),
    query: vi.fn(query),
    end: vi.fn(async () => undefined),
  };
  pgMock.clients.push(client);
  return client;
}

beforeEach(() => {
  pgMock.clients.length = 0;
  pgMock.options.length = 0;
});

describe('database deployment runner', () => {
  it('creates a missing database through postgres with an escaped identifier and bounded client', async () => {
    const log = vi.fn();
    const client = provideClient(async (sql) => {
      if (sql.startsWith('SELECT set_config')) return { rows: [] };
      if (sql.startsWith('SELECT 1 FROM pg_database')) return { rows: [] };
      if (sql === 'CREATE DATABASE "release_""candidate""_test"') return { rows: [] };
      throw new Error(`unexpected query: ${sql}`);
    });

    await ensureDatabase('postgres://localhost:5432/release_%22candidate%22_test', log);

    expect(pgMock.options).toEqual([
      {
        connectionString: 'postgres://localhost:5432/postgres',
        connectionTimeoutMillis: 10_000,
      },
    ]);
    expect(client.connect).toHaveBeenCalledOnce();
    expect(client.query).toHaveBeenCalledWith("SELECT set_config('statement_timeout', $1, false)", ['600000']);
    expect(client.query).toHaveBeenCalledWith("SELECT set_config('lock_timeout', $1, false)", ['30000']);
    expect(client.end).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('created database "release_"candidate"_test"');
  });

  it('propagates a disconnect failure after an otherwise successful database check', async () => {
    const disconnectError = new Error('admin disconnect failed');
    const log = vi.fn();
    const client = provideClient(async (sql) => {
      if (sql.startsWith('SELECT set_config')) return { rows: [] };
      if (sql.startsWith('SELECT 1 FROM pg_database')) return { rows: [{ exists: 1 }] };
      throw new Error(`unexpected query: ${sql}`);
    });
    client.end.mockRejectedValueOnce(disconnectError);

    await expect(ensureDatabase('postgres://localhost:5432/existing_test', log)).rejects.toBe(disconnectError);
    expect(client.query).toHaveBeenCalledWith('SELECT 1 FROM pg_database WHERE datname = $1', ['existing_test']);
    expect(log).toHaveBeenCalledWith('database "existing_test" already exists');
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('preserves a database bootstrap failure when disconnect also fails', async () => {
    const bootstrapError = new Error('create database failed');
    const client = provideClient(async (sql) => {
      if (sql.startsWith('SELECT set_config')) return { rows: [] };
      if (sql.startsWith('SELECT 1 FROM pg_database')) return { rows: [] };
      if (sql.startsWith('CREATE DATABASE')) throw bootstrapError;
      throw new Error(`unexpected query: ${sql}`);
    });
    client.end.mockRejectedValueOnce(new Error('admin disconnect failed'));

    await expect(ensureDatabase('postgres://localhost:5432/bootstrap_test')).rejects.toBe(bootstrapError);
    expect(client.end).toHaveBeenCalledOnce();
  });

  it.each([
    ['postgres://localhost:5432', 'must include exactly one database name'],
    ['postgres://localhost:5432/one%2Ftwo', 'must include exactly one database name'],
    ['postgres://localhost:5432/invalid%ZZ', 'invalid encoded database name'],
    ['https://localhost:5432/release_test', 'postgres or postgresql protocol'],
    ['not-a-url', 'valid PostgreSQL URL'],
  ])('rejects an invalid database URL %s before opening a connection', async (databaseUrl, message) => {
    await expect(ensureDatabase(databaseUrl)).rejects.toThrow(message);
    expect(pgMock.options).toEqual([]);
  });

  it('accepts the postgresql protocol used by node-postgres', async () => {
    const client = provideClient(async (sql) => {
      if (sql.startsWith('SELECT set_config')) return { rows: [] };
      if (sql.startsWith('SELECT 1 FROM pg_database')) return { rows: [{ exists: 1 }] };
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(ensureDatabase('postgresql://localhost:5432/existing_test')).resolves.toBeUndefined();
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('backfills legacy checksums and reports a no-op migration run', async () => {
    const rows = migrationRows(null);
    const log = vi.fn();
    const client = provideClient(async (sql) => {
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows };
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      return { rows: [] };
    });

    await expect(migrate('postgres://localhost/release_test', log)).resolves.toEqual([]);

    expect(client.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /CREATE TABLE IF NOT EXISTS schema_migrations \(\s*name TEXT PRIMARY KEY,\s*checksum TEXT,\s*applied_at TIMESTAMPTZ NOT NULL DEFAULT now\(\)\s*\)/,
      ),
    );
    expect(client.query).toHaveBeenCalledWith('ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT');
    const first = rows[0];
    const expectedChecksum = createHash('sha256')
      .update(fs.readFileSync(path.join(migrationsDir, first.name), 'utf8'))
      .digest('hex');
    expect(client.query).toHaveBeenCalledWith(
      'UPDATE schema_migrations SET checksum = $1 WHERE name = $2 AND checksum IS NULL',
      [expectedChecksum, first.name],
    );
    expect(client.query).toHaveBeenCalledWith('ALTER TABLE schema_migrations ALTER COLUMN checksum SET NOT NULL');
    expect(client.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
    expect(log).toHaveBeenCalledWith('no pending migrations');
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('does not rewrite checksums that are already recorded', async () => {
    const client = provideClient(async (sql) => {
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows: migrationRows() };
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      return { rows: [] };
    });

    await expect(migrate('postgres://localhost/release_test')).resolves.toEqual([]);

    expect(client.query.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE schema_migrations'))).toBe(false);
  });

  it('rejects an altered applied migration checksum before running migration SQL', async () => {
    const rows = migrationRows();
    rows[0] = { ...rows[0]!, checksum: '0'.repeat(64) };
    const client = provideClient(async (sql) => {
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows };
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      return { rows: [] };
    });

    await expect(migrate('postgres://localhost/release_test')).rejects.toThrow(
      `applied migration ${rows[0]!.name} has changed (checksum mismatch)`,
    );
    expect(client.query).not.toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
  });

  it('applies every pending migration in filename order inside individual transactions', async () => {
    const files = migrationRows().map((row) => row.name);
    const log = vi.fn();
    const client = provideClient(async (sql) => {
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows: [] };
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      return { rows: [] };
    });

    await expect(migrate('postgres://localhost/release_test', log)).resolves.toEqual(files);

    expect(client.query.mock.calls.filter(([sql]) => sql === 'BEGIN')).toHaveLength(files.length);
    expect(client.query.mock.calls.filter(([sql]) => sql === 'COMMIT')).toHaveLength(files.length);
    const recorded = client.query.mock.calls
      .filter(([sql]) => sql === 'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)')
      .map(([, params]) => params);
    expect(recorded).toHaveLength(files.length);
    expect(recorded.map((params) => params[0])).toEqual(files);
    expect(recorded.every((params) => /^[0-9a-f]{64}$/.test(String(params[1])))).toBe(true);
    for (const file of files) {
      expect(client.query).toHaveBeenCalledWith(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
    }
    expect(log.mock.calls.map(([message]) => message)).toEqual(files.map((file) => `applied migration ${file}`));
  });

  it('filters non-SQL entries and sorts migration discovery before applying files', async () => {
    const files = migrationRows().map((row) => row.name);
    const originalReaddir = fs.readdirSync.bind(fs);
    const readdir = vi.spyOn(fs, 'readdirSync').mockImplementation(((directory: fs.PathLike) => {
      if (String(directory) === migrationsDir) return ['README.txt', ...[...files].reverse()];
      return originalReaddir(directory);
    }) as typeof fs.readdirSync);
    const client = provideClient(async (sql) => {
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows: [] };
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      return { rows: [] };
    });

    try {
      await expect(migrate('postgres://localhost/release_test')).resolves.toEqual(files);
    } finally {
      readdir.mockRestore();
    }

    const recorded = client.query.mock.calls
      .filter(([sql]) => sql === 'INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)')
      .map(([, params]) => params[0]);
    expect(recorded).toEqual(files);
  });

  it('rejects and identifies every migration record that is absent from the release', async () => {
    const rows = [
      ...migrationRows(),
      { name: '998_removed.sql', checksum: '0'.repeat(64) },
      { name: '999_removed.sql', checksum: 'f'.repeat(64) },
    ];
    const client = provideClient(async (sql) => {
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows };
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      return { rows: [] };
    });

    await expect(migrate('postgres://localhost/release_test')).rejects.toMatchObject({
      message: 'database contains migration records missing from this release: 998_removed.sql, 999_removed.sql',
    });
    expect(client.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('fails closed when another deployment owns the migration lock', async () => {
    const client = provideClient(async (sql) =>
      sql.includes('pg_try_advisory_lock') ? { rows: [{ locked: false }] } : { rows: [] },
    );

    await expect(migrate('postgres://localhost/release_test')).rejects.toThrow(
      'another migration or seed operation is already in progress',
    );
    expect(client.query).not.toHaveBeenCalledWith(
      "SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))",
    );
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('propagates an advisory-unlock failure after an otherwise successful no-op migration', async () => {
    const unlockError = new Error('migration unlock failed');
    const client = provideClient(async (sql) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows: migrationRows() };
      if (sql.includes('pg_advisory_unlock')) throw unlockError;
      return { rows: [] };
    });

    await expect(migrate('postgres://localhost/release_test')).rejects.toBe(unlockError);
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('preserves a migration failure when rollback, unlock, and disconnect also fail', async () => {
    const migrationError = new Error('migration SQL failed');
    let transactionStarted = false;
    const client = provideClient(async (sql) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows: [] };
      if (sql === 'BEGIN') {
        transactionStarted = true;
        return { rows: [] };
      }
      if (sql === 'ROLLBACK') throw new Error('rollback failed');
      if (sql.includes('pg_advisory_unlock')) throw new Error('unlock failed');
      if (transactionStarted) throw migrationError;
      return { rows: [] };
    });
    client.end.mockRejectedValueOnce(new Error('disconnect failed'));

    await expect(migrate('postgres://localhost/release_test')).rejects.toBe(migrationError);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('preserves a seed failure while still attempting rollback, unlock, and disconnect', async () => {
    const seedError = new Error('seed SQL failed');
    let transactionStarted = false;
    const client = provideClient(async (sql) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql === 'BEGIN') {
        transactionStarted = true;
        return { rows: [] };
      }
      if (sql === 'ROLLBACK') throw new Error('rollback failed');
      if (sql.includes('pg_advisory_unlock')) throw new Error('unlock failed');
      if (transactionStarted) throw seedError;
      return { rows: [] };
    });
    client.end.mockRejectedValueOnce(new Error('disconnect failed'));

    await expect(seed('postgres://localhost/release_test')).rejects.toBe(seedError);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('commits a successful seed and logs the resulting CEFR inventory', async () => {
    const counts = [
      { cefr_level: 'A1', n: 6 },
      { cefr_level: 'A2', n: 6 },
    ];
    const log = vi.fn();
    const client = provideClient(async (sql) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql.startsWith('SELECT cefr_level')) return { rows: counts };
      return { rows: [] };
    });

    await seed('postgres://localhost/release_test', log);

    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).not.toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
    expect(log).toHaveBeenCalledWith(`questions per level: ${JSON.stringify(counts)}`);
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('fails a seed cleanly when another deployment owns the advisory lock', async () => {
    const client = provideClient(async (sql) =>
      sql.includes('pg_try_advisory_lock') ? { rows: [{ locked: false }] } : { rows: [] },
    );

    await expect(seed('postgres://localhost/release_test')).rejects.toThrow(
      'another migration or seed operation is already in progress',
    );
    expect(client.query).not.toHaveBeenCalledWith('BEGIN');
    expect(client.query).not.toHaveBeenCalledWith(
      "SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))",
    );
    expect(client.end).toHaveBeenCalledOnce();
  });

  it('runs database setup steps sequentially with the same URL and logger', async () => {
    const calls: string[] = [];
    const ensure = vi.fn(async () => {
      calls.push('ensure');
    });
    const migrateStep = vi.fn(async () => {
      calls.push('migrate');
      return [];
    });
    const seedStep = vi.fn(async () => {
      calls.push('seed');
    });
    const steps = {
      ensure,
      migrate: migrateStep,
      seed: seedStep,
    } as unknown as DatabaseSetupSteps;
    const log = vi.fn();

    await setupDatabase('postgres://localhost:5432/setup_test', log, steps);

    expect(calls).toEqual(['ensure', 'migrate', 'seed']);
    expect(ensure).toHaveBeenCalledWith('postgres://localhost:5432/setup_test', log);
    expect(migrateStep).toHaveBeenCalledWith('postgres://localhost:5432/setup_test', log);
    expect(seedStep).toHaveBeenCalledWith('postgres://localhost:5432/setup_test', log);
  });

  it('uses the real default setup steps when no test seam is supplied', async () => {
    const admin = provideClient(async (sql) => {
      if (sql.startsWith('SELECT 1 FROM pg_database')) return { rows: [{ exists: 1 }] };
      return { rows: [] };
    });
    const migration = provideClient(async (sql) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows: migrationRows() };
      return { rows: [] };
    });
    const seeding = provideClient(async (sql) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql.startsWith('SELECT cefr_level')) return { rows: [] };
      return { rows: [] };
    });
    const log = vi.fn();

    await expect(setupDatabase('postgres://localhost:5432/default_setup_test', log)).resolves.toBeUndefined();

    expect(pgMock.clients).toEqual([]);
    for (const client of [admin, migration, seeding]) {
      expect(client.connect).toHaveBeenCalledOnce();
      expect(client.end).toHaveBeenCalledOnce();
    }
    expect(log).toHaveBeenCalledWith('database "default_setup_test" already exists');
    expect(log).toHaveBeenCalledWith('no pending migrations');
    expect(log).toHaveBeenCalledWith('questions per level: []');
  });

  it.each(['migrate', 'seed', 'setup'] as const)('dispatches the %s database command exactly once', async (command) => {
    const actions = {
      migrate: vi.fn(async () => []),
      seed: vi.fn(async () => undefined),
      setup: vi.fn(async () => undefined),
    } as unknown as DatabaseCommandActions;

    await runDatabaseCommand('postgres://localhost:5432/command_test', command, actions);

    expect(actions[command]).toHaveBeenCalledOnce();
    expect(actions[command]).toHaveBeenCalledWith('postgres://localhost:5432/command_test');
    for (const other of ['migrate', 'seed', 'setup'] as const) {
      if (other !== command) expect(actions[other]).not.toHaveBeenCalled();
    }
  });

  it('uses the real default command actions when no dispatch seam is supplied', async () => {
    const client = provideClient(async (sql) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql === 'SELECT name, checksum FROM schema_migrations') return { rows: migrationRows() };
      return { rows: [] };
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await expect(
        runDatabaseCommand('postgres://localhost:5432/default_command_test', 'migrate'),
      ).resolves.toBeUndefined();

      expect(client.connect).toHaveBeenCalledOnce();
      expect(client.end).toHaveBeenCalledOnce();
      expect(client.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(hashtext('ai_english_schema_migrations'))");
    } finally {
      log.mockRestore();
    }
  });

  it('defaults the database command to setup and rejects missing or unknown inputs before dispatch', async () => {
    const actions = {
      migrate: vi.fn(async () => []),
      seed: vi.fn(async () => undefined),
      setup: vi.fn(async () => undefined),
    } as unknown as DatabaseCommandActions;

    await runDatabaseCommand('postgres://localhost:5432/default_command_test', undefined, actions);
    expect(actions.setup).toHaveBeenCalledOnce();

    await expect(runDatabaseCommand(undefined, 'setup', actions)).rejects.toThrow('DATABASE_URL is required');
    await expect(runDatabaseCommand('postgres://localhost:5432/command_test', 'drop', actions)).rejects.toThrow(
      'unknown database command "drop" (expected "setup", "migrate", or "seed")',
    );
    expect(actions.migrate).not.toHaveBeenCalled();
    expect(actions.seed).not.toHaveBeenCalled();
    expect(actions.setup).toHaveBeenCalledOnce();
  });

  it('refuses setup and seed in production while migrate stays allowed', async () => {
    const actions = {
      migrate: vi.fn(async () => []),
      seed: vi.fn(async () => undefined),
      setup: vi.fn(async () => undefined),
    } as unknown as DatabaseCommandActions;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await expect(runDatabaseCommand('postgres://localhost:5432/command_test', 'setup', actions)).rejects.toThrow(
        'refusing to run "setup" with NODE_ENV=production; production deploys must use "npm run db:migrate:prod"',
      );
      await expect(runDatabaseCommand('postgres://localhost:5432/command_test', 'seed', actions)).rejects.toThrow(
        'refusing to run "seed" with NODE_ENV=production; production deploys must use "npm run db:migrate:prod"',
      );
      expect(actions.setup).not.toHaveBeenCalled();
      expect(actions.seed).not.toHaveBeenCalled();

      // `npm run db:migrate:prod` is the supported production path.
      await expect(
        runDatabaseCommand('postgres://localhost:5432/command_test', 'migrate', actions),
      ).resolves.toBeUndefined();
      expect(actions.migrate).toHaveBeenCalledOnce();
      expect(actions.migrate).toHaveBeenCalledWith('postgres://localhost:5432/command_test');
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});
