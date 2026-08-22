import { Client } from 'pg';
import {
  assertSafeDestructiveDatabase,
  configuredApplicationDatabaseUrl,
  type DestructiveDatabaseTarget,
} from '../db/database-safety';
import { setupDatabase } from '../db/run';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/ai_english_test';

export function assertSafeTestDatabase(testDbUrl: string, applicationDbUrl?: string): DestructiveDatabaseTarget {
  return assertSafeDestructiveDatabase(testDbUrl, applicationDbUrl, 'test');
}

/**
 * Stryker lane runs export MUTATION_LANE, which vitest workers inherit. When
 * it is present the destructive target must satisfy the stricter mutation
 * rules even when Stryker is invoked directly (bypassing the npm pre-step
 * guard in db/mutation-db-guard.ts).
 */
export function destructivePurposeForEnvironment(environment: NodeJS.ProcessEnv): 'test' | 'mutation' {
  return environment.MUTATION_LANE === undefined ? 'test' : 'mutation';
}

/** Recreate the test database from scratch: drop, create, migrate, seed. */
export default async function globalSetup() {
  const applicationDatabaseUrl = configuredApplicationDatabaseUrl(process.env.DATABASE_URL);
  const target = assertSafeDestructiveDatabase(
    TEST_DB_URL,
    applicationDatabaseUrl,
    destructivePurposeForEnvironment(process.env),
  );
  const adminUrl = new URL(target.url.toString());
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  let campaignLockHeld = false;
  try {
    // Hold this session lock through the entire Vitest run (the returned
    // teardown releases it). A setup-only lock is insufficient: a second test
    // or Stryker process could otherwise acquire it after initialization and
    // DROP DATABASE ... FORCE while this process is executing tests.
    const lock = await admin.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('ai_english_test_campaign'), hashtext($1)) AS locked",
      [target.databaseName],
    );
    if (lock.rows[0]?.locked !== true) {
      throw new Error(`another backend test or mutation campaign is already using database "${target.databaseName}"`);
    }
    campaignLockHeld = true;
    await admin.query(`DROP DATABASE IF EXISTS "${target.databaseName.replace(/"/g, '""')}" WITH (FORCE)`);
    await setupDatabase(TEST_DB_URL, () => {});
  } catch (error) {
    if (campaignLockHeld) {
      await admin
        .query("SELECT pg_advisory_unlock(hashtext('ai_english_test_campaign'), hashtext($1))", [target.databaseName])
        .catch(() => undefined);
    }
    await admin.end().catch(() => undefined);
    throw error;
  }

  return async () => {
    let unlockError: unknown;
    try {
      await admin.query("SELECT pg_advisory_unlock(hashtext('ai_english_test_campaign'), hashtext($1))", [
        target.databaseName,
      ]);
    } catch (error) {
      unlockError = error;
    }
    try {
      await admin.end();
    } catch (error) {
      if (unlockError === undefined) unlockError = error;
    }
    if (unlockError !== undefined) throw unlockError;
  };
}
