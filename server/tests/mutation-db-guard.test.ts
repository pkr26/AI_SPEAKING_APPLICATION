import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertSafeDestructiveDatabase,
  configuredApplicationDatabaseUrl,
  defaultServerEnvPath,
} from '../db/database-safety';
import { assertSafeMutationDatabaseUrl, runMutationDatabaseGuard } from '../db/mutation-db-guard';

const tempDirectories = new Set<string>();

function thrownMessage(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return (error as Error).message;
  }
  throw new Error('Expected action to throw');
}

function tempEnv(contents?: string): { directory: string; envPath: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-english-database-safety-'));
  tempDirectories.add(directory);
  const envPath = path.join(directory, '.env');
  if (contents !== undefined) fs.writeFileSync(envPath, contents, { encoding: 'utf8', mode: 0o600 });
  return { directory, envPath };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of tempDirectories) fs.rmSync(directory, { recursive: true, force: true });
  tempDirectories.clear();
});

describe('application database URL selection', () => {
  it('resolves server/.env from source and compiled database module directories', () => {
    const serverDirectory = path.resolve(__dirname, '..');
    expect(defaultServerEnvPath(path.join(serverDirectory, 'db'))).toBe(path.join(serverDirectory, '.env'));
    expect(defaultServerEnvPath(path.join(serverDirectory, 'dist', 'db'))).toBe(path.join(serverDirectory, '.env'));
  });

  it('uses the explicit URL without reading a conflicting local file', () => {
    const { directory } = tempEnv();
    expect(configuredApplicationDatabaseUrl('postgres://localhost:5432/explicit', directory)).toBe(
      'postgres://localhost:5432/explicit',
    );
  });

  it('returns undefined when the injected environment file is absent', () => {
    const { envPath } = tempEnv();
    expect(configuredApplicationDatabaseUrl(undefined, envPath)).toBeUndefined();
  });

  it('parses a quoted DATABASE_URL without exposing other keys', () => {
    const markerKey = 'DATABASE_SAFETY_UNRELATED_SECRET';
    const previousMarker = process.env[markerKey];
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env[markerKey];
    const { envPath } = tempEnv(
      `DATABASE_URL="postgresql://app@localhost:5432/application"\n${markerKey}=do-not-export-this\n`,
    );
    try {
      expect(configuredApplicationDatabaseUrl(undefined, envPath)).toBe('postgresql://app@localhost:5432/application');
      expect(process.env[markerKey]).toBeUndefined();
      expect(process.env.DATABASE_URL).toBe(previousDatabaseUrl);
    } finally {
      if (previousMarker === undefined) delete process.env[markerKey];
      else process.env[markerKey] = previousMarker;
    }
  });

  it('rejects a same-target URL loaded from the file after alias normalization', () => {
    const { envPath } = tempEnv('DATABASE_URL="postgresql://app@LOCALHOST.:5432/app_mutation_test"\n');
    const applicationUrl = configuredApplicationDatabaseUrl(undefined, envPath);
    expect(() =>
      assertSafeMutationDatabaseUrl('postgres://test@127.0.0.1:5432/app_mutation_test', applicationUrl),
    ).toThrow('must not target DATABASE_URL');
  });

  it.each(['', 'not a url'])('fails closed for a %j DATABASE_URL loaded from the file', (databaseUrl) => {
    const secretMarker = 'do-not-expose-this-secret';
    const { envPath } = tempEnv(`DATABASE_URL="${databaseUrl}"\nUNRELATED_SECRET=${secretMarker}\n`);
    const applicationUrl = configuredApplicationDatabaseUrl(undefined, envPath);
    let caught: unknown;
    try {
      assertSafeMutationDatabaseUrl('postgres://localhost:5432/safe_mutation_test', applicationUrl);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain('DATABASE_URL must be a valid PostgreSQL URL');
    expect((caught as Error).message).not.toContain(secretMarker);
  });

  it('propagates non-ENOENT file read failures', () => {
    const { directory } = tempEnv();
    expect(() => configuredApplicationDatabaseUrl(undefined, directory)).toThrow();
  });

  it('propagates deterministic non-ENOENT errors instead of treating every Error as a missing file', () => {
    const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw denied;
    });

    expect(() => configuredApplicationDatabaseUrl(undefined, '/injected/.env')).toThrow(denied);
  });

  it('does not trust a forged non-Error value that merely claims the ENOENT code', () => {
    const forgedFailure = { code: 'ENOENT' };
    vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
      throw forgedFailure;
    });

    expect(() => configuredApplicationDatabaseUrl(undefined, '/injected/.env')).toThrow(forgedFailure);
  });

  it('supports a private injected file and deterministic cleanup', () => {
    const { directory, envPath } = tempEnv('DATABASE_URL=postgres://localhost:5432/private_app\n');
    expect(fs.statSync(envPath).mode & 0o777).toBe(0o600);
    expect(configuredApplicationDatabaseUrl(undefined, envPath)).toBe('postgres://localhost:5432/private_app');

    fs.rmSync(directory, { recursive: true, force: true });
    tempDirectories.delete(directory);
    expect(fs.existsSync(directory)).toBe(false);
  });
});

describe('backend mutation database guard', () => {
  it('uses purpose-specific missing-target diagnostics without weakening the ordinary test guard', () => {
    expect(thrownMessage(() => assertSafeMutationDatabaseUrl(undefined))).toBe(
      'TEST_DATABASE_URL is required for backend mutation testing',
    );
    expect(thrownMessage(() => assertSafeDestructiveDatabase(undefined, undefined, 'test'))).toBe(
      'TEST_DATABASE_URL is required',
    );
  });

  it('names TEST_DATABASE_URL exactly when target parsing fails', () => {
    expect(() => assertSafeMutationDatabaseUrl('postgres://localhost/mutation_test')).toThrowError(
      'TEST_DATABASE_URL must include an explicit port',
    );
  });

  it.each([
    'postgres://localhost:5432/ai_english_mutation_test',
    'postgresql://127.0.0.1:5432/backend_mutation_20260812_test',
    'postgres://[::1]:5432/mutation_test',
  ])('accepts a dedicated loopback mutation database: %s', (url) => {
    expect(() => assertSafeMutationDatabaseUrl(url)).not.toThrow();
  });

  it.each([
    [undefined, 'is required'],
    ['not a url', 'valid PostgreSQL URL'],
    ['https://localhost/mutation_test', 'postgres or postgresql'],
    ['postgres://database.internal:5432/mutation_test', 'loopback host'],
    ['postgres://localhost:5432/ai_english_test', 'dedicated mutation database'],
    ['postgres://localhost:5432/scratch_test', 'dedicated mutation database'],
    ['postgres://localhost:5432/mutation', 'dedicated mutation database'],
    ['postgres://localhost:5432/', 'exactly one database name'],
    ['postgres://localhost:5432/mutation%2Fother_test', 'exactly one database name'],
    ['postgres://localhost:5432/mutation%ZZ_test', 'invalid encoded database name'],
    ['postgres:///mutation_test', 'must include a hostname'],
    ['postgres://localhost/mutation_test', 'explicit port'],
    ['postgres://localhost:0/mutation_test', 'invalid effective PostgreSQL port'],
    ['postgres://localhost/mutation_test?host=database.internal', 'must not contain query parameters'],
    ['postgres://localhost/mutation_test?port=6543', 'must not contain query parameters'],
    ['postgres://localhost/mutation_test#remote', 'must not contain query parameters'],
  ] as const)('rejects an unsafe target %#', (url, message) => {
    expect(() => assertSafeMutationDatabaseUrl(url)).toThrow(message);
  });

  it('rejects the application database even when default ports are spelled differently', () => {
    expect(() =>
      assertSafeMutationDatabaseUrl(
        'postgres://test:test@localhost:5432/app_mutation_test',
        'postgres://app:secret@localhost/app_mutation_test',
      ),
    ).toThrow('must not target DATABASE_URL');
  });

  it('treats every loopback hostname alias as the same application target', () => {
    expect(() =>
      assertSafeMutationDatabaseUrl(
        'postgres://test@localhost:5432/app_mutation_test',
        'postgresql://app@127.0.0.1:5432/app_mutation_test',
      ),
    ).toThrow('must not target DATABASE_URL');
  });

  it.each([
    [
      'a different database name',
      'postgres://localhost:5432/safe_mutation_test',
      'postgres://localhost:5432/application_database',
    ],
    [
      'a different port',
      'postgres://localhost:5432/safe_mutation_test',
      'postgres://localhost:6543/safe_mutation_test',
    ],
    [
      'a different host',
      'postgres://localhost:5432/safe_mutation_test',
      'postgres://database.internal:5432/safe_mutation_test',
    ],
  ])(
    'accepts %s instead of treating one matching component as the application target',
    (_caseName, testUrl, appUrl) => {
      expect(() => assertSafeMutationDatabaseUrl(testUrl, appUrl)).not.toThrow();
    },
  );

  it.each(['LOCALHOST', 'localhost.'])(
    'normalizes the application loopback spelling %s before comparing targets',
    (host) => {
      expect(() =>
        assertSafeMutationDatabaseUrl(
          'postgres://localhost:5432/app_mutation_test',
          `postgres://${host}:5432/app_mutation_test`,
        ),
      ).toThrow('must not target DATABASE_URL');
    },
  );

  it('rejects connection-target options in DATABASE_URL before comparing targets', () => {
    expect(() =>
      assertSafeMutationDatabaseUrl(
        'postgres://localhost:5432/mutation_test',
        'postgres://database.internal/application?host=localhost',
      ),
    ).toThrow('DATABASE_URL must not contain query parameters');
  });

  it('rejects an invalid application database URL instead of bypassing comparison', () => {
    expect(() => assertSafeMutationDatabaseUrl('postgres://localhost:5432/mutation_test', 'invalid')).toThrow(
      'DATABASE_URL must be a valid PostgreSQL URL',
    );
  });

  it('uses PGPORT when DATABASE_URL omits its port', () => {
    const previous = process.env.PGPORT;
    process.env.PGPORT = '6543';
    try {
      expect(() =>
        assertSafeMutationDatabaseUrl(
          'postgres://localhost:6543/app_mutation_test',
          'postgres://127.0.0.1/app_mutation_test',
        ),
      ).toThrow('must not target DATABASE_URL');
    } finally {
      if (previous === undefined) delete process.env.PGPORT;
      else process.env.PGPORT = previous;
    }
  });

  it('uses the explicitly supplied PGPORT for both target URLs instead of ambient process state', () => {
    const previous = process.env.PGPORT;
    process.env.PGPORT = '7654';
    try {
      expect(() =>
        assertSafeDestructiveDatabase(
          'postgres://localhost:6543/app_mutation_test',
          'postgres://127.0.0.1/app_mutation_test',
          'mutation',
          '6543',
        ),
      ).toThrow('must not target DATABASE_URL');
    } finally {
      if (previous === undefined) delete process.env.PGPORT;
      else process.env.PGPORT = previous;
    }
  });

  it.each(['1', '65535'])('accepts PostgreSQL port boundary %s', (port) => {
    expect(() => assertSafeMutationDatabaseUrl(`postgres://localhost:${port}/boundary_mutation_test`)).not.toThrow();
  });

  it('normalizes every trailing dot on a loopback host before target comparison', () => {
    expect(() =>
      assertSafeMutationDatabaseUrl(
        'postgres://localhost:5432/app_mutation_test',
        'postgres://localhost..:5432/app_mutation_test',
      ),
    ).toThrow('must not target DATABASE_URL');
  });

  it('runs the environment guard with an injected .env path without exporting unrelated values', () => {
    const marker = 'MUTATION_GUARD_UNRELATED_SECRET';
    const previous = process.env[marker];
    delete process.env[marker];
    const { envPath } = tempEnv(`DATABASE_URL=postgres://localhost:5432/application\n${marker}=must-stay-private\n`);
    try {
      expect(() =>
        runMutationDatabaseGuard({ TEST_DATABASE_URL: 'postgres://localhost:5432/isolated_mutation_test' }, envPath),
      ).not.toThrow();
      expect(process.env[marker]).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env[marker];
      else process.env[marker] = previous;
    }
  });

  it('runs the destructive-target assertion for an unsafe injected environment', () => {
    expect(() =>
      runMutationDatabaseGuard({
        DATABASE_URL: 'postgres://localhost:5432/application',
        TEST_DATABASE_URL: 'postgres://localhost:5432/ai_english_test',
        PGPORT: '5432',
      }),
    ).toThrow('dedicated mutation database');
  });

  it.each(['05432', ' 5432', '5432suffix'])('normalizes PGPORT=%j exactly as node-postgres does', (port) => {
    const previous = process.env.PGPORT;
    process.env.PGPORT = port;
    try {
      expect(() =>
        assertSafeMutationDatabaseUrl(
          'postgres://localhost:5432/app_mutation_test',
          'postgres://127.0.0.1/app_mutation_test',
        ),
      ).toThrow('must not target DATABASE_URL');
    } finally {
      if (previous === undefined) delete process.env.PGPORT;
      else process.env.PGPORT = previous;
    }
  });

  it.each(['0', '65536', 'not-a-port'])(
    'rejects invalid ambient PGPORT=%j when DATABASE_URL omits its port',
    (port) => {
      const previous = process.env.PGPORT;
      process.env.PGPORT = port;
      try {
        expect(() =>
          assertSafeMutationDatabaseUrl(
            'postgres://localhost:5432/safe_mutation_test',
            'postgres://localhost/application_database',
          ),
        ).toThrow('DATABASE_URL has an invalid effective PostgreSQL port');
      } finally {
        if (previous === undefined) delete process.env.PGPORT;
        else process.env.PGPORT = previous;
      }
    },
  );

  it('rejects an application URL without a hostname instead of using ambient PGHOST', () => {
    expect(() =>
      assertSafeMutationDatabaseUrl('postgres://localhost:5432/mutation_test', 'postgres:///mutation_test'),
    ).toThrow('DATABASE_URL must include a hostname');
  });
});
