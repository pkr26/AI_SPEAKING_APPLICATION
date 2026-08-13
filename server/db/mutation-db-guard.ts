import { assertSafeDestructiveDatabase, configuredApplicationDatabaseUrl } from './database-safety';

/**
 * Mutation tests recreate their database. Require an unmistakable, local,
 * dedicated target so a missing or mistyped environment variable cannot reset
 * the ordinary test database—or any remote application database.
 */
export function assertSafeMutationDatabaseUrl(
  testDatabaseUrl: string | undefined,
  applicationDatabaseUrl?: string,
): void {
  assertSafeDestructiveDatabase(testDatabaseUrl, applicationDatabaseUrl, 'mutation');
}

export function runMutationDatabaseGuard(environment: NodeJS.ProcessEnv = process.env, envPath?: string): void {
  const applicationDatabaseUrl = configuredApplicationDatabaseUrl(environment.DATABASE_URL, envPath);
  assertSafeMutationDatabaseUrl(environment.TEST_DATABASE_URL, applicationDatabaseUrl);
}

// Stryker disable all: the CommonJS entrypoint identity and exit behavior are
// exercised in a subprocess; mutating this host-process guard only causes a
// test-runner bootstrap crash and does not represent an application behavior.
if (require.main === module) {
  runMutationDatabaseGuard();
}
// Stryker restore all
