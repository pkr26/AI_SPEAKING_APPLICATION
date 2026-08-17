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
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${target.databaseName.replace(/"/g, '""')}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
  await setupDatabase(TEST_DB_URL, () => {});
}
