import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import { pool } from './db';

const REQUIRED_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const REQUIRED_QUESTIONS_PER_LEVEL = 100;

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
      const sql = fs.readFileSync(path.join(migrationsDirectory, name));
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

// The packaged manifest is immutable for a given release, so hash it once at
// module load instead of re-reading the migrations directory on every /ready
// probe.
const PACKAGED_MIGRATION_MANIFEST = migrationManifestFromDirectory(path.join(__dirname, '..', 'db', 'migrations'));

export function expectedMigrationManifest(): readonly MigrationManifestEntry[] {
  return PACKAGED_MIGRATION_MANIFEST;
}

async function queryPool(text: string, values: readonly unknown[] = []): Promise<{ rows: unknown[] }> {
  return pool.query(text, [...values]);
}

export async function assertDatabaseSchemaCurrent(
  query: SchemaQuery = queryPool,
): Promise<{ latestMigration: string }> {
  const expected = expectedMigrationManifest();
  // migrationManifestFromDirectory rejects an empty release manifest.
  const latest = expected.at(-1)!;

  // Binary-name ordering, independent of the database's collation, so the
  // row sequence always matches the byte-sorted packaged manifest.
  const migrationResult = await query('SELECT name, checksum FROM schema_migrations ORDER BY name COLLATE "C"');
  const actual = migrationResult.rows as Array<{
    name?: unknown;
    checksum?: unknown;
  }>;

  // Prefix-subset, not equality: during a rolling deploy the new release's
  // migration job runs before its replicas boot, so this replica legitimately
  // sees rows it does not package. Failing those would pull every old replica
  // out of the load balancer at once for an additive migration. Rows beyond
  // the packaged manifest come from a newer release; the packaged ones must
  // still be present, unchanged, and in order. An under-migrated database
  // still fails, because a packaged entry would then be missing (positional
  // equality already implies the database has at least as many rows).
  const manifestMatches = expected.every((entry, index) => {
    const row = actual[index];
    return row !== undefined && row.name === entry.name && row.checksum === entry.checksum;
  });

  if (!manifestMatches) {
    throw new Error(`Database migrations do not match this release through ${latest.name}`);
  }

  const requiredRuntimeTable = 'public.rate_limit_windows';
  const tableResult = await query('SELECT to_regclass($1)::text AS table_name', [requiredRuntimeTable]);
  const requiredTable = tableResult.rows[0] as { table_name?: unknown } | undefined;
  if (typeof requiredTable?.table_name !== 'string') {
    throw new Error(`Required database table ${requiredRuntimeTable} is missing`);
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
    (questionResult.rows as Array<{ cefr_level?: unknown; count?: unknown }>).map(
      (row) => [row.cefr_level, row.count] as const,
    ),
  );
  if (
    REQUIRED_CEFR_LEVELS.some((level) => {
      const count = questionCounts.get(level);
      return typeof count !== 'number' || count < REQUIRED_QUESTIONS_PER_LEVEL;
    })
  ) {
    throw new Error('Question inventory is incomplete; every CEFR level requires at least 100 questions');
  }

  return { latestMigration: latest.name };
}
