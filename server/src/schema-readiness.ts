import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import { RUNTIME_SCHEMA_CUTOVERS } from '../db/schema-cutover';
import { pool } from './db';
import { boundedQuestionInventoryQuery, questionInventoryIssues } from './question-inventory';

export interface MigrationManifestEntry {
  name: string;
  checksum: string;
}

export type SchemaQuery = (text: string, values?: readonly unknown[]) => Promise<{ rows: unknown[] }>;

/**
 * Read the packaged migrations directory into name+sha256 entries sorted by
 * name. An empty directory throws: a release with no migrations cannot
 * validate any database, so packaging mistakes are boot errors, not readiness
 * drift.
 */
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

/**
 * Catalog content changes only during controlled publication. Cache the
 * multi-megabyte validation briefly so concurrent/public readiness probes do
 * not repeatedly transfer and parse all 600 translation payloads. Migration
 * and required-table queries below still execute on every probe, preserving a
 * cheap database-liveness check; a catalog drift is visible within this bound.
 */
export const QUESTION_INVENTORY_READINESS_TTL_MS = 60_000;

let questionInventoryReadyUntil = 0;
let questionInventoryValidationInFlight: Promise<void> | undefined;

/** The frozen packaged manifest; readiness compares the database against exactly this list. */
export function expectedMigrationManifest(): readonly MigrationManifestEntry[] {
  return PACKAGED_MIGRATION_MANIFEST;
}

/**
 * Default SchemaQuery over the shared pool. Identity is load-bearing:
 * assertDatabaseSchemaCurrent applies the process-wide inventory cache only to
 * this exact adapter, so test/deployment seams can never bless production.
 */
async function queryPool(text: string, values: readonly unknown[] = []): Promise<{ rows: unknown[] }> {
  return pool.query(text, [...values]);
}

/**
 * Run the bounded inventory scan through one adapter and throw unless the
 * catalog holds exactly 100 well-formed questions per CEFR level.
 */
async function validateQuestionInventory(query: SchemaQuery): Promise<void> {
  const inventoryQuery = boundedQuestionInventoryQuery();
  const questionResult = await query(inventoryQuery.text, inventoryQuery.values);
  if (questionInventoryIssues(questionResult.rows).length > 0) {
    throw new Error('Question inventory is invalid; every CEFR level requires exactly 100 well-formed questions');
  }
}

/**
 * Single-flight, TTL-bounded inventory validation. Concurrent probes join the
 * one in-flight promise instead of stacking duplicate multi-megabyte scans,
 * and the flight slot is cleared in finally so a failed validation is retried
 * on the next probe rather than latched.
 */
async function validateCachedQuestionInventory(query: SchemaQuery): Promise<void> {
  if (questionInventoryReadyUntil > Date.now()) return;
  if (questionInventoryValidationInFlight) return questionInventoryValidationInFlight;

  const validation = validateQuestionInventory(query).then(() => {
    questionInventoryReadyUntil = Date.now() + QUESTION_INVENTORY_READINESS_TTL_MS;
  });
  questionInventoryValidationInFlight = validation;
  try {
    await validation;
  } finally {
    questionInventoryValidationInFlight = undefined;
  }
}

/** Clear only the bounded inventory cache; used by isolated readiness tests. */
export function resetQuestionInventoryReadinessCacheForTests(): void {
  questionInventoryReadyUntil = 0;
}

/**
 * Runtime readiness gate over schema state. Verifies, in order:
 * 1. applied ordinary migrations are an exact name+checksum prefix of the
 *    packaged manifest (byte-ordered via COLLATE "C") — trailing rows a
 *    rolling additive deploy added are fine, missing or altered rows are not;
 * 2. each non-rolling cutover fence row appears exactly once with its exact
 *    checksum precisely when its guarded migration is packaged — a fence is
 *    never treated as an ordinary newer migration;
 * 3. the shared runtime rate_limit_windows table exists;
 * 4. the question inventory is exactly 100 well-formed questions per level,
 *    cached only for the default pool adapter.
 * Returns the latest packaged migration name. Any mismatch throws so /ready
 * reports this replica out of service instead of serving degraded traffic.
 */
export async function assertDatabaseSchemaCurrent(
  query: SchemaQuery = queryPool,
): Promise<{ latestMigration: string }> {
  const expected = expectedMigrationManifest();
  // migrationManifestFromDirectory rejects an empty release manifest.
  const latest = expected.at(-1)!;

  // Binary-name ordering, independent of the database's collation, so the
  // row sequence always matches the byte-sorted packaged manifest.
  const migrationResult = await query('SELECT name, checksum FROM schema_migrations ORDER BY name COLLATE "C"');
  const actualWithFences = migrationResult.rows as Array<
    | {
        name?: unknown;
        checksum?: unknown;
      }
    | undefined
  >;
  const fenceNames = new Set<string>(RUNTIME_SCHEMA_CUTOVERS.map(({ name }) => name));
  const actual = actualWithFences.filter((row) => typeof row?.name !== 'string' || !fenceNames.has(row.name));
  const cutoversValid = RUNTIME_SCHEMA_CUTOVERS.every((cutover) => {
    const fenceRows = actualWithFences.filter((row) => row?.name === cutover.name);
    const cutoverRequired = expected.some(({ name }) => name === cutover.requiredMigration);
    const cutoverValid = fenceRows.length === 1 && fenceRows[0]?.checksum === cutover.checksum;
    return !(fenceRows.length > 0 && !cutoverValid) && cutoverRequired === cutoverValid;
  });

  // Ordinary migration rows use prefix-subset matching: during a rolling
  // additive deploy, an old replica legitimately sees trailing rows it does
  // not package. The packaged rows must still be present, unchanged, and in
  // order. An under-migrated database fails because a packaged entry is then
  // missing. Explicit incompatible cutover fences are the exception and are
  // validated separately below.
  const manifestMatches = expected.every((entry, index) => {
    const row = actual[index];
    return row !== undefined && row.name === entry.name && row.checksum === entry.checksum;
  });

  // Migration 023 is deliberately non-rolling: it inserts a `000_` manifest
  // fence that makes old positional-readiness code fail. Current binaries
  // remove only the exact verified fence before applying the normal additive
  // prefix rule. A missing, altered, duplicated, or out-of-sequence fence is
  // never treated as an ordinary newer migration.
  if (!manifestMatches || !cutoversValid) {
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
  // One row beyond the exact catalog size proves an overfill, so cap the
  // readiness scan there instead of making a corrupted table an unbounded
  // cost on every probe. With exactly 600 rows, the shared JavaScript
  // validator also applies the mobile parser's UTF-16 length and trim rules to
  // every language-specific scalar and example returned by the help route.
  // Custom query adapters are test/deployment seams and deliberately bypass
  // process-global caching so one database/fixture can never bless another.
  if (query === queryPool) await validateCachedQuestionInventory(query);
  else await validateQuestionInventory(query);

  return { latestMigration: latest.name };
}
