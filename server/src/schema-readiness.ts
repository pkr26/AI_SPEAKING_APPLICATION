import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import { pool } from './db';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');
const REQUIRED_RUNTIME_TABLE = 'public.rate_limit_windows';
const REQUIRED_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export interface MigrationManifestEntry {
  name: string;
  checksum: string;
}

export type SchemaQuery = (text: string, values?: readonly unknown[]) => Promise<{ rows: unknown[] }>;

export function migrationManifestFromDirectory(migrationsDirectory: string): readonly MigrationManifestEntry[] {
  const entries = fs
    .readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(migrationsDirectory, name), 'utf8');
      return Object.freeze({
        name,
        checksum: createHash('sha256').update(sql).digest('hex'),
      });
    });

  if (entries.length === 0) {
    throw new Error('No database migrations were packaged with this release');
  }

  return Object.freeze(entries);
}

export function expectedMigrationManifest(): readonly MigrationManifestEntry[] {
  return migrationManifestFromDirectory(MIGRATIONS_DIR);
}

const queryPool: SchemaQuery = async (text, values) => pool.query(text, values ? [...values] : undefined);

export async function assertDatabaseSchemaCurrent(
  query: SchemaQuery = queryPool,
): Promise<{ latestMigration: string }> {
  const expected = expectedMigrationManifest();
  const latest = expected.at(-1);
  if (!latest) throw new Error('No expected database migration was found');

  const migrationResult = await query('SELECT name, checksum FROM schema_migrations ORDER BY name');
  const actual = migrationResult.rows as Array<{
    name?: unknown;
    checksum?: unknown;
  }>;

  const manifestMatches =
    actual.length === expected.length &&
    expected.every((entry, index) => actual[index]?.name === entry.name && actual[index]?.checksum === entry.checksum);

  if (!manifestMatches) {
    throw new Error(`Database migrations do not match this release through ${latest.name}`);
  }

  const tableResult = await query('SELECT to_regclass($1)::text AS table_name', [REQUIRED_RUNTIME_TABLE]);
  const requiredTable = tableResult.rows[0] as { table_name?: unknown } | undefined;
  if (typeof requiredTable?.table_name !== 'string') {
    throw new Error(`Required database table ${REQUIRED_RUNTIME_TABLE} is missing`);
  }

  // Practice completion promises a different next question. Treat the
  // authored content inventory as a runtime dependency so an unseeded or
  // partially published database never serves an impossible response shape.
  const questionResult = await query(
    `SELECT cefr_level, count(*)::int AS count
     FROM questions
     GROUP BY cefr_level
     ORDER BY cefr_level`,
  );
  const questionCounts = new Map(
    (questionResult.rows as Array<{ cefr_level?: unknown; count?: unknown }>)
      .filter(
        (row): row is { cefr_level: string; count: number } =>
          typeof row.cefr_level === 'string' && typeof row.count === 'number',
      )
      .map((row) => [row.cefr_level, row.count]),
  );
  if (REQUIRED_CEFR_LEVELS.some((level) => (questionCounts.get(level) ?? 0) < 2)) {
    throw new Error('Question inventory is incomplete; every CEFR level requires at least two questions');
  }

  return { latestMigration: latest.name };
}
