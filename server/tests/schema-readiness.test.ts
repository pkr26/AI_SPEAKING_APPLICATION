import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import { RUNTIME_SCHEMA_CUTOVERS } from '../db/schema-cutover';
import {
  assertDatabaseSchemaCurrent,
  expectedMigrationManifest,
  migrationManifestFromDirectory,
  QUESTION_INVENTORY_READINESS_TTL_MS,
  resetQuestionInventoryReadinessCacheForTests,
  SchemaQuery,
} from '../src/schema-readiness';

const QUESTION_ID = '11111111-1111-4111-8111-111111111111';

function successfulMigrationRows() {
  return [
    ...RUNTIME_SCHEMA_CUTOVERS.map(({ name, checksum }) => ({ name, checksum })),
    ...expectedMigrationManifest().map(({ name, checksum }) => ({ name, checksum })),
  ].sort(({ name: left }, { name: right }) => (left < right ? -1 : left > right ? 1 : 0));
}

function inventoryRow(cefr_level: string) {
  const translation = {
    word: 'translation',
    question: 'Translated question?',
    examples: Array.from({ length: 3 }, () => ({ en: 'English example.', native: 'Native example.' })),
  };
  return {
    id: QUESTION_ID,
    cefr_level,
    prompt_word: 'word',
    question_text: 'Answer this question.',
    translations: { te: translation, hi: translation, es: translation, zh: translation },
  };
}

const completeQuestionInventory = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].flatMap((cefrLevel) =>
  Array.from({ length: 100 }, () => inventoryRow(cefrLevel)),
);

// A migration this release does not package, sorting after every packaged one
// — what an old replica sees once the next release's migration job has run.
const NEWER_RELEASE_MIGRATION = { name: '999_from_a_newer_release.sql', checksum: 'f'.repeat(64) };

// A release that packages only ordinary migrations: neither runtime cutover's
// required migration (023/024) is in its manifest, so both fences are "not
// required" for it. Exercised by re-importing schema-readiness against a
// mocked migrations directory.
const LEGACY_RELEASE_MIGRATIONS: Record<string, string> = {
  '001_base.sql': 'SELECT 1;\n',
  '002_next.sql': 'SELECT 2;\n',
};

function legacyReleaseManifest(): Array<{ name: string; checksum: string }> {
  return Object.entries(LEGACY_RELEASE_MIGRATIONS).map(([name, sql]) => ({
    name,
    checksum: createHash('sha256').update(sql).digest('hex'),
  }));
}

function sortMigrationRows<T extends { name: string }>(rows: readonly T[]): T[] {
  return [...rows].sort(({ name: left }, { name: right }) => (left < right ? -1 : left > right ? 1 : 0));
}

async function importSchemaReadinessWithMigrations(files: Record<string, string>) {
  const realReaddirSync = fs.readdirSync as unknown as (target: unknown) => string[];
  const realReadFileSync = fs.readFileSync as unknown as (target: unknown) => string | Buffer;
  const isMigrationsDirectory = (target: unknown) => String(target).includes(path.join('db', 'migrations'));
  const readdir = vi.spyOn(fs, 'readdirSync').mockImplementation(((target: unknown) => {
    if (isMigrationsDirectory(target)) return Object.keys(files).sort();
    return realReaddirSync(target);
  }) as never);
  const readFile = vi.spyOn(fs, 'readFileSync').mockImplementation(((target: unknown) => {
    if (isMigrationsDirectory(target)) return Buffer.from(files[path.basename(String(target))], 'utf8');
    return realReadFileSync(target);
  }) as never);
  try {
    vi.resetModules();
    return await import('../src/schema-readiness');
  } finally {
    readdir.mockRestore();
    readFile.mockRestore();
  }
}

function readinessQuery(migrationRows: unknown[]) {
  return vi.fn().mockImplementation(((text: string) => {
    if (text.includes('schema_migrations')) return Promise.resolve({ rows: migrationRows });
    if (text.includes('to_regclass')) return Promise.resolve({ rows: [{ table_name: 'rate_limit_windows' }] });
    if (text.includes('FROM questions')) return Promise.resolve({ rows: completeQuestionInventory });
    return Promise.reject(new Error(`unexpected readiness query: ${text}`));
  }) as never);
}

beforeEach(() => {
  resetQuestionInventoryReadinessCacheForTests();
});

describe('database schema readiness', () => {
  it('filters non-SQL assets and hashes migrations in deterministic filename order', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-english-migration-manifest-'));
    let readdir: ReturnType<typeof vi.spyOn> | undefined;
    try {
      fs.writeFileSync(path.join(directory, '010_last.sql'), 'SELECT 10;\n');
      fs.writeFileSync(path.join(directory, '002_first.sql'), 'SELECT 2;\n');
      fs.writeFileSync(path.join(directory, 'README.txt'), 'not a migration');
      // Filesystems are allowed to return any directory order. Force the
      // reverse order so this test proves the manifest itself sorts names.
      readdir = vi.spyOn(fs, 'readdirSync').mockReturnValue(['010_last.sql', 'README.txt', '002_first.sql'] as never);

      expect(migrationManifestFromDirectory(directory)).toEqual([
        {
          name: '002_first.sql',
          checksum: createHash('sha256').update('SELECT 2;\n').digest('hex'),
        },
        {
          name: '010_last.sql',
          checksum: createHash('sha256').update('SELECT 10;\n').digest('hex'),
        },
      ]);
    } finally {
      readdir?.mockRestore();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('fails closed when no SQL migrations are packaged', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-english-empty-migrations-'));
    try {
      fs.writeFileSync(path.join(directory, 'README.txt'), 'no migrations');
      expect(() => migrationManifestFromDirectory(directory)).toThrow(
        'No database migrations were packaged with this release',
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('memoizes the packaged manifest instead of re-reading the directory per probe', () => {
    const readdir = vi.spyOn(fs, 'readdirSync');
    try {
      expect(expectedMigrationManifest()).toBe(expectedMigrationManifest());
      expect(readdir).not.toHaveBeenCalled();
    } finally {
      readdir.mockRestore();
    }
  });

  it('matches the packaged migration names/checksums and required runtime table', async () => {
    const manifest = expectedMigrationManifest();
    expect(manifest.at(-1)?.name).toBe('024_diagnostic_runs_and_question_snapshots.sql');
    expect(manifest.every(({ checksum }) => /^[0-9a-f]{64}$/.test(checksum))).toBe(true);

    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: completeQuestionInventory });

    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).resolves.toEqual({
      latestMigration: '024_diagnostic_runs_and_question_snapshots.sql',
    });
    expect(query.mock.calls[0]).toEqual(['SELECT name, checksum FROM schema_migrations ORDER BY name COLLATE "C"']);
    expect(query.mock.calls[1]).toEqual(['SELECT to_regclass($1)::text AS table_name', ['public.rate_limit_windows']]);
    expect(query.mock.calls[2]?.[0]).toContain('FROM questions');
    expect(query.mock.calls[2]?.[0]).toContain('SELECT id, cefr_level, prompt_word, question_text, translations');
    expect(query.mock.calls[2]?.[0]).toContain('ORDER BY cefr_level');
    expect(query.mock.calls[2]?.[0]).toContain('LIMIT $1');
    expect(query.mock.calls[2]?.[1]).toEqual([601]);
  });

  it('uses 000 manifest fences to make every pre-cutover positional readiness check fail closed', () => {
    const databaseRows = successfulMigrationRows();
    for (const cutover of RUNTIME_SCHEMA_CUTOVERS) {
      const oldPackagedManifest = expectedMigrationManifest().filter(({ name }) => name !== cutover.requiredMigration);
      expect(databaseRows).toContainEqual({ name: cutover.name, checksum: cutover.checksum });
      expect(
        oldPackagedManifest.every((entry, index) => {
          const row = databaseRows[index];
          return row?.name === entry.name && row.checksum === entry.checksum;
        }),
      ).toBe(false);
    }
  });

  it('rejects a missing, altered, duplicated, or out-of-sequence cutover fence', async () => {
    const current = successfulMigrationRows();
    for (const cutover of RUNTIME_SCHEMA_CUTOVERS) {
      const withoutFence = current.filter(({ name }) => name !== cutover.name);
      const wrongFence = current.map((row) => (row.name === cutover.name ? { ...row, checksum: '0'.repeat(64) } : row));
      const duplicatedFence = [...current, { name: cutover.name, checksum: cutover.checksum }];
      const withoutRequiredMigration = current.filter(({ name }) => name !== cutover.requiredMigration);

      for (const rows of [withoutFence, wrongFence, duplicatedFence, withoutRequiredMigration]) {
        const query = vi.fn().mockResolvedValue({ rows });
        await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
          'Database migrations do not match this release',
        );
        expect(query).toHaveBeenCalledOnce();
      }
    }
  });

  it('rejects a missing or checksum-mismatched migration, even beside newer extra rows', async () => {
    const current = successfulMigrationRows();
    const mismatched = current.map((row, index) =>
      index === current.length - 1 ? { ...row, checksum: '0'.repeat(64) } : row,
    );
    for (const rows of [current.slice(0, -1), mismatched, [...mismatched, NEWER_RELEASE_MIGRATION]]) {
      const query = vi.fn().mockResolvedValue({ rows });
      await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
        'Database migrations do not match this release',
      );
      expect(query).toHaveBeenCalledOnce();
    }
  });

  // Ship blocker: the new release's migration job runs before its replicas
  // boot, so an already-running replica sees a row it does not package. If
  // that failed readiness, every old replica would leave the load balancer at
  // once for an additive migration and the service would go dark.
  it('stays ready when a newer release has already applied an additive migration', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [...successfulMigrationRows(), NEWER_RELEASE_MIGRATION] })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: completeQuestionInventory });

    // The reported migration is still this release's latest packaged one.
    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).resolves.toEqual({
      latestMigration: '024_diagnostic_runs_and_question_snapshots.sql',
    });
  });

  // The packaged manifest is fixed per release, so the "cutover required" side
  // of the fence truth table is only controllable by re-importing the module
  // against a mocked migrations directory that omits the required migration.
  it('rejects a verified fence whose required migration this release does not package', async () => {
    const { assertDatabaseSchemaCurrent: assertForLegacyRelease } =
      await importSchemaReadinessWithMigrations(LEGACY_RELEASE_MIGRATIONS);
    const rows = sortMigrationRows([
      ...legacyReleaseManifest(),
      ...RUNTIME_SCHEMA_CUTOVERS.map(({ name, checksum }) => ({ name, checksum })),
    ]);
    const query = readinessQuery(rows);

    await expect(assertForLegacyRelease(query as SchemaQuery)).rejects.toThrow(
      'Database migrations do not match this release through 002_next.sql',
    );
    expect(query).toHaveBeenCalledOnce();
  });

  it('stays ready without cutover fences when this release predates the cutover migrations', async () => {
    const { assertDatabaseSchemaCurrent: assertForLegacyRelease } =
      await importSchemaReadinessWithMigrations(LEGACY_RELEASE_MIGRATIONS);
    // The trailing newer-release row must stay tolerated (rolling additive
    // deploy) alongside the absent, not-required fences.
    const rows = sortMigrationRows([...legacyReleaseManifest(), NEWER_RELEASE_MIGRATION]);
    const query = readinessQuery(rows);

    await expect(assertForLegacyRelease(query as SchemaQuery)).resolves.toEqual({
      latestMigration: '002_next.sql',
    });
    expect(query).toHaveBeenCalledTimes(3);
  });

  it('rejects a lone wrong-checksum fence even when the cutover is not required', async () => {
    const { assertDatabaseSchemaCurrent: assertForLegacyRelease } =
      await importSchemaReadinessWithMigrations(LEGACY_RELEASE_MIGRATIONS);
    const [cutover] = RUNTIME_SCHEMA_CUTOVERS;
    const rows = sortMigrationRows([...legacyReleaseManifest(), { name: cutover.name, checksum: '0'.repeat(64) }]);
    const query = readinessQuery(rows);

    await expect(assertForLegacyRelease(query as SchemaQuery)).rejects.toThrow(
      'Database migrations do not match this release through 002_next.sql',
    );
    expect(query).toHaveBeenCalledOnce();
  });

  it('rejects a duplicated fence even when the cutover is not required', async () => {
    const { assertDatabaseSchemaCurrent: assertForLegacyRelease } =
      await importSchemaReadinessWithMigrations(LEGACY_RELEASE_MIGRATIONS);
    const [cutover] = RUNTIME_SCHEMA_CUTOVERS;
    const fence = { name: cutover.name, checksum: cutover.checksum };
    const rows = sortMigrationRows([...legacyReleaseManifest(), fence, fence]);
    const query = readinessQuery(rows);

    await expect(assertForLegacyRelease(query as SchemaQuery)).rejects.toThrow(
      'Database migrations do not match this release through 002_next.sql',
    );
    expect(query).toHaveBeenCalledOnce();
  });

  it('treats a lone undefined fence row as an invalid cutover instead of dereferencing it', async () => {
    // The migration rows are a hostile not-quite-array whose filter yields a
    // single undefined entry: the checksum access must stay optional-chained
    // so readiness fails closed rather than crashing.
    const rows = { filter: () => [undefined] } as unknown as unknown[];
    const query = vi.fn().mockResolvedValue({ rows });

    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
      'Database migrations do not match this release',
    );
    expect(query).toHaveBeenCalledOnce();
  });

  it('rejects an ordinary migration row whose name or checksum differs, at any manifest position', async () => {
    const current = successfulMigrationRows();
    const firstOrdinaryIndex = RUNTIME_SCHEMA_CUTOVERS.length;
    const lastIndex = current.length - 1;
    for (const index of [firstOrdinaryIndex, Math.floor((firstOrdinaryIndex + lastIndex) / 2), lastIndex]) {
      // The renamed row keeps its packaged checksum, and the altered row keeps
      // its packaged name, so each mismatch exercises exactly one comparison.
      const renamed = current.map((row, position) => (position === index ? { ...row, name: '999_renamed.sql' } : row));
      const altered = current.map((row, position) => (position === index ? { ...row, checksum: '0'.repeat(64) } : row));
      for (const rows of [renamed, altered]) {
        const query = vi.fn().mockResolvedValue({ rows });
        await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
          'Database migrations do not match this release',
        );
        expect(query).toHaveBeenCalledOnce();
      }
    }
  });

  it('rejects a missing latest runtime table', async () => {
    for (const rows of [[], [{ table_name: null }]]) {
      const query = vi.fn().mockResolvedValueOnce({ rows: successfulMigrationRows() }).mockResolvedValueOnce({ rows });
      await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
        'Required database table public.rate_limit_windows is missing',
      );
    }
  });

  it('accepts the exact 100-question runtime boundary for every CEFR level', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: completeQuestionInventory });

    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).resolves.toEqual({
      latestMigration: '024_diagnostic_runs_and_question_snapshots.sql',
    });
  });

  it('rejects malformed migration row fields even when row counts match', async () => {
    const current = successfulMigrationRows();
    for (const rows of [
      current.map((row, index) => (index === 0 ? { ...row, name: 7 } : row)),
      current.map((row, index) => (index === 0 ? { ...row, checksum: null } : row)),
      [...current].reverse(),
      Object.assign([...current], { 0: undefined }),
    ]) {
      const query = vi.fn().mockResolvedValue({ rows });
      await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
        'Database migrations do not match this release',
      );
      expect(query).toHaveBeenCalledOnce();
    }
  });

  it('rejects an unseeded, incomplete, overfilled, or malformed CEFR question inventory', async () => {
    for (const rows of [
      [],
      completeQuestionInventory.slice(0, -1),
      [...completeQuestionInventory, inventoryRow('A1')],
      completeQuestionInventory.map((row, index) => (index === 0 ? { ...row, prompt_word: '\t' } : row)),
      completeQuestionInventory.map((row, index) =>
        index === 0 ? { ...row, id: '00000000-0000-0000-0000-000000000000' } : row,
      ),
      completeQuestionInventory.map((row, index) => (index === 0 ? { ...row, cefr_level: null } : row)),
      [...completeQuestionInventory.slice(1), inventoryRow('A0')],
    ]) {
      const query = vi
        .fn()
        .mockResolvedValueOnce({ rows: successfulMigrationRows() })
        .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
        .mockResolvedValueOnce({ rows });
      await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow('Question inventory is invalid');
    }
  });

  it('uses the pool adapter with explicit values for every readiness query', async () => {
    const query = vi
      .spyOn(pool, 'query')
      .mockResolvedValueOnce({ rows: successfulMigrationRows() } as never)
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] } as never)
      .mockResolvedValueOnce({ rows: completeQuestionInventory } as never);

    try {
      await expect(assertDatabaseSchemaCurrent()).resolves.toEqual({
        latestMigration: '024_diagnostic_runs_and_question_snapshots.sql',
      });
      expect(query.mock.calls).toEqual([
        ['SELECT name, checksum FROM schema_migrations ORDER BY name COLLATE "C"', []],
        ['SELECT to_regclass($1)::text AS table_name', ['public.rate_limit_windows']],
        [expect.stringContaining('FROM questions'), [601]],
      ]);
    } finally {
      query.mockRestore();
    }
  });

  it('single-flights concurrent inventory scans while every caller checks migration and table liveness', async () => {
    let inventoryReads = 0;
    let releaseInventory!: (value: { rows: unknown[] }) => void;
    const pendingInventory = new Promise<{ rows: unknown[] }>((resolve) => {
      releaseInventory = resolve;
    });
    const query = vi.spyOn(pool, 'query').mockImplementation(((text: string) => {
      if (text.includes('FROM schema_migrations')) return Promise.resolve({ rows: successfulMigrationRows() });
      if (text.includes('to_regclass')) return Promise.resolve({ rows: [{ table_name: 'rate_limit_windows' }] });
      if (text.includes('FROM questions')) {
        inventoryReads += 1;
        return pendingInventory;
      }
      return Promise.reject(new Error(`unexpected readiness query: ${text}`));
    }) as never);

    try {
      const first = assertDatabaseSchemaCurrent();
      const second = assertDatabaseSchemaCurrent();
      await vi.waitFor(() => expect(inventoryReads).toBe(1));
      releaseInventory({ rows: completeQuestionInventory });

      await expect(Promise.all([first, second])).resolves.toEqual([
        { latestMigration: '024_diagnostic_runs_and_question_snapshots.sql' },
        { latestMigration: '024_diagnostic_runs_and_question_snapshots.sql' },
      ]);
      expect(query.mock.calls.filter(([text]) => String(text).includes('FROM schema_migrations'))).toHaveLength(2);
      expect(query.mock.calls.filter(([text]) => String(text).includes('to_regclass'))).toHaveLength(2);
      expect(query.mock.calls.filter(([text]) => String(text).includes('FROM questions'))).toHaveLength(1);
    } finally {
      releaseInventory({ rows: completeQuestionInventory });
      query.mockRestore();
    }
  });

  it('reuses a valid inventory only before the TTL boundary and still checks DB liveness on every call', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-22T12:00:00.000Z'));
    const query = vi.spyOn(pool, 'query').mockImplementation(((text: string) => {
      if (text.includes('FROM schema_migrations')) return Promise.resolve({ rows: successfulMigrationRows() });
      if (text.includes('to_regclass')) return Promise.resolve({ rows: [{ table_name: 'rate_limit_windows' }] });
      if (text.includes('FROM questions')) return Promise.resolve({ rows: completeQuestionInventory });
      return Promise.reject(new Error(`unexpected readiness query: ${text}`));
    }) as never);

    try {
      await assertDatabaseSchemaCurrent();
      vi.advanceTimersByTime(QUESTION_INVENTORY_READINESS_TTL_MS - 1);
      await assertDatabaseSchemaCurrent();
      expect(query.mock.calls.filter(([text]) => String(text).includes('FROM questions'))).toHaveLength(1);

      vi.advanceTimersByTime(1);
      await assertDatabaseSchemaCurrent();
      expect(query.mock.calls.filter(([text]) => String(text).includes('FROM questions'))).toHaveLength(2);
      expect(query.mock.calls.filter(([text]) => String(text).includes('FROM schema_migrations'))).toHaveLength(3);
      expect(query.mock.calls.filter(([text]) => String(text).includes('to_regclass'))).toHaveLength(3);
    } finally {
      query.mockRestore();
      vi.useRealTimers();
    }
  });

  it('does not cache a failed inventory scan', async () => {
    let inventoryReads = 0;
    const query = vi.spyOn(pool, 'query').mockImplementation(((text: string) => {
      if (text.includes('FROM schema_migrations')) return Promise.resolve({ rows: successfulMigrationRows() });
      if (text.includes('to_regclass')) return Promise.resolve({ rows: [{ table_name: 'rate_limit_windows' }] });
      if (text.includes('FROM questions')) {
        inventoryReads += 1;
        return inventoryReads === 1
          ? Promise.reject(new Error('catalog read failed'))
          : Promise.resolve({ rows: completeQuestionInventory });
      }
      return Promise.reject(new Error(`unexpected readiness query: ${text}`));
    }) as never);

    try {
      await expect(assertDatabaseSchemaCurrent()).rejects.toThrow('catalog read failed');
      await expect(assertDatabaseSchemaCurrent()).resolves.toEqual({
        latestMigration: '024_diagnostic_runs_and_question_snapshots.sql',
      });
      expect(inventoryReads).toBe(2);
    } finally {
      query.mockRestore();
    }
  });

  it('never lets one custom query adapter cache inventory readiness for another', async () => {
    const healthyAdapter = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: completeQuestionInventory });
    const malformedInventory = completeQuestionInventory.map((row, index) =>
      index === 0 ? { ...row, id: '00000000-0000-0000-0000-000000000000' } : row,
    );
    const malformedAdapter = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: malformedInventory });

    await expect(assertDatabaseSchemaCurrent(healthyAdapter as SchemaQuery)).resolves.toEqual({
      latestMigration: '024_diagnostic_runs_and_question_snapshots.sql',
    });
    await expect(assertDatabaseSchemaCurrent(malformedAdapter as SchemaQuery)).rejects.toThrow(
      'Question inventory is invalid',
    );
    expect(healthyAdapter).toHaveBeenCalledTimes(3);
    expect(malformedAdapter).toHaveBeenCalledTimes(3);
  });

  it('/ready invokes both dependency checks for every probe', async () => {
    const schemaCheck = vi.fn(async () => undefined);
    const audioInspectorCheck = vi.fn(async () => undefined);
    const a = createApp({ schemaCheck, audioInspectorCheck });

    await expect(request(a).get('/ready')).resolves.toMatchObject({ status: 200, body: { ok: true } });
    await expect(request(a).get('/ready')).resolves.toMatchObject({ status: 200, body: { ok: true } });
    expect(schemaCheck).toHaveBeenCalledTimes(2);
    expect(audioInspectorCheck).toHaveBeenCalledTimes(2);
  });

  it.each(['schema', 'media inspector'] as const)('/ready hides a failed %s dependency check', async (failure) => {
    const sensitiveDetail = `${failure} failure with sensitive detail`;
    const a = createApp({
      schemaCheck: async () => {
        if (failure === 'schema') throw new Error(sensitiveDetail);
      },
      audioInspectorCheck: async () => {
        if (failure === 'media inspector') throw new Error(sensitiveDetail);
      },
    });
    const response = await request(a).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ ok: false, error: 'required service dependency unavailable', code: 'INTERNAL' });
    expect(JSON.stringify(response.body)).not.toContain(sensitiveDetail);
  });

  it('loads the packaged manifest from the release db/migrations directory', async () => {
    const readdir = vi.spyOn(fs, 'readdirSync');
    try {
      vi.resetModules();
      await import('../src/schema-readiness');
      expect(readdir).toHaveBeenCalledWith(path.resolve(__dirname, '..', 'db', 'migrations'));
    } finally {
      readdir.mockRestore();
    }
  });
});
