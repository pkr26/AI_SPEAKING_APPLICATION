import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
const DEFAULT_POSTGRES_PORT = '5432';

export type DestructiveDatabasePurpose = 'test' | 'mutation';

export interface DestructiveDatabaseTarget {
  url: URL;
  databaseName: string;
  host: string;
  port: number;
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Resolve server/.env from either the TypeScript source tree (`db/`) or the
 * compiled production tree (`dist/db/`). Keeping this independent of cwd
 * makes the destructive-database guard reliable when invoked by an operator,
 * a process supervisor, or an npm script from a different directory.
 */
export function defaultServerEnvPath(moduleDirectory = __dirname): string {
  const parentDirectory = path.resolve(moduleDirectory, '..');
  const serverDirectory =
    path.basename(parentDirectory) === 'dist' ? path.resolve(parentDirectory, '..') : parentDirectory;
  return path.join(serverDirectory, '.env');
}

/**
 * Select the process-level application URL first, then read only DATABASE_URL
 * from the local server .env file. dotenv.parse never populates process.env,
 * and no other parsed key leaves this function.
 */
export function configuredApplicationDatabaseUrl(
  explicitDatabaseUrl: string | undefined,
  envPath = defaultServerEnvPath(),
): string | undefined {
  if (explicitDatabaseUrl !== undefined) return explicitDatabaseUrl;

  let contents: Buffer;
  try {
    contents = fs.readFileSync(envPath);
  } catch (error) {
    if (isFileNotFound(error)) return undefined;
    throw error;
  }
  return dotenv.parse(contents).DATABASE_URL;
}

function canonicalHost(parsed: URL): string {
  const host = parsed.hostname.toLowerCase().replace(/\.+$/, '');
  return LOOPBACK_HOSTS.has(host) ? 'loopback' : host;
}

function effectivePort(parsed: URL, variableName: string, pgPort: string | undefined): number {
  // node-postgres applies parseInt(..., 10) to PGPORT when the URL omits a
  // port. Mirror that normalization so whitespace/zeros/suffixes cannot make
  // the same target compare as different.
  const port = Number.parseInt(parsed.port || pgPort || DEFAULT_POSTGRES_PORT, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${variableName} has an invalid effective PostgreSQL port`);
  }
  return port;
}

function databaseName(parsed: URL, variableName: string): string {
  let name: string;
  try {
    name = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error(`${variableName} contains an invalid encoded database name`);
  }
  if (!name || name.includes('/')) {
    throw new Error(`${variableName} must include exactly one database name`);
  }
  return name;
}

export function parseDestructiveDatabaseTarget(
  value: string,
  variableName: string,
  options: { requireExplicitPort?: boolean; pgPort?: string } = {},
): DestructiveDatabaseTarget {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${variableName} must use the postgres or postgresql protocol`);
  }
  if (!parsed.hostname) {
    throw new Error(`${variableName} must include a hostname`);
  }
  // node-postgres lets query parameters override host/port. Destructive tools
  // must reason about one unambiguous authority, so reject all query/fragment
  // options instead of maintaining a partial override blocklist.
  if (parsed.search || parsed.hash) {
    throw new Error(`${variableName} must not contain query parameters or a fragment`);
  }
  if (options.requireExplicitPort && !parsed.port) {
    throw new Error(`${variableName} must include an explicit port`);
  }

  return {
    url: parsed,
    databaseName: databaseName(parsed, variableName),
    host: canonicalHost(parsed),
    port: effectivePort(parsed, variableName, options.pgPort ?? process.env.PGPORT),
  };
}

function sameDatabaseTarget(first: DestructiveDatabaseTarget, second: DestructiveDatabaseTarget): boolean {
  return first.host === second.host && first.port === second.port && first.databaseName === second.databaseName;
}

/** Validate the exact target before any test tooling can recreate a database. */
export function assertSafeDestructiveDatabase(
  testDatabaseUrl: string | undefined,
  applicationDatabaseUrl: string | undefined,
  purpose: DestructiveDatabasePurpose,
  pgPort = process.env.PGPORT,
): DestructiveDatabaseTarget {
  if (!testDatabaseUrl) {
    const suffix = purpose === 'mutation' ? ' for backend mutation testing' : '';
    throw new Error(`TEST_DATABASE_URL is required${suffix}`);
  }

  const testTarget = parseDestructiveDatabaseTarget(testDatabaseUrl, 'TEST_DATABASE_URL', {
    requireExplicitPort: true,
    pgPort,
  });
  if (testTarget.host !== 'loopback') {
    if (purpose === 'mutation') {
      throw new Error('TEST_DATABASE_URL for mutation testing must use a loopback host');
    }
    throw new Error('refusing to reset a non-loopback TEST_DATABASE_URL');
  }

  if (purpose === 'mutation') {
    const normalizedName = testTarget.databaseName.toLowerCase();
    if (!normalizedName.includes('mutation') || !normalizedName.endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL must name a dedicated mutation database ending in _test');
    }
  } else if (!testTarget.databaseName.endsWith('_test')) {
    throw new Error(
      `refusing to reset database "${testTarget.databaseName}": TEST_DATABASE_URL must name a database ending in _test`,
    );
  }

  if (applicationDatabaseUrl !== undefined) {
    const applicationTarget = parseDestructiveDatabaseTarget(applicationDatabaseUrl, 'DATABASE_URL', { pgPort });
    if (sameDatabaseTarget(testTarget, applicationTarget)) {
      if (purpose === 'mutation') throw new Error('TEST_DATABASE_URL must not target DATABASE_URL');
      throw new Error('refusing to reset database: TEST_DATABASE_URL matches DATABASE_URL');
    }
  }

  return testTarget;
}
