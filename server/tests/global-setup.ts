import { Client } from 'pg';
import { setupDatabase } from '../db/run';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/ai_english_test';

function databaseName(connectionString: string): string {
  return decodeURIComponent(new URL(connectionString).pathname.replace(/^\//, ''));
}

function targetHost(url: URL): string {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) ? 'loopback' : url.hostname;
}

export function assertSafeTestDatabase(testDbUrl: string, applicationDbUrl = process.env.DATABASE_URL): void {
  const testUrl = new URL(testDbUrl);
  const dbName = databaseName(testDbUrl);
  if (!dbName.endsWith('_test')) {
    throw new Error(`refusing to reset database "${dbName}": TEST_DATABASE_URL must name a database ending in _test`);
  }
  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  if (!loopbackHosts.has(testUrl.hostname)) {
    throw new Error('refusing to reset a non-loopback TEST_DATABASE_URL');
  }
  if (applicationDbUrl) {
    const applicationUrl = new URL(applicationDbUrl);
    const sameTarget =
      targetHost(applicationUrl) === targetHost(testUrl) &&
      (applicationUrl.port || '5432') === (testUrl.port || '5432') &&
      databaseName(applicationDbUrl) === dbName;
    if (sameTarget) {
      throw new Error('refusing to reset database: TEST_DATABASE_URL matches DATABASE_URL');
    }
  }
}

/** Recreate the test database from scratch: drop, create, migrate, seed. */
export default async function globalSetup() {
  assertSafeTestDatabase(TEST_DB_URL);
  const adminUrl = new URL(TEST_DB_URL);
  adminUrl.pathname = '/postgres';
  const dbName = databaseName(TEST_DB_URL);
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${dbName.replace(/"/g, '""')}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
  await setupDatabase(TEST_DB_URL, () => {});
}
