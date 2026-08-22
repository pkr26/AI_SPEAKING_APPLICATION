import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { pool } from '../src/db';
import {
  assertDatabaseSchemaCurrent,
  expectedMigrationManifest,
  migrationManifestFromDirectory,
  SchemaQuery,
} from '../src/schema-readiness';

function successfulMigrationRows() {
  return expectedMigrationManifest().map(({ name, checksum }) => ({ name, checksum }));
}

const completeQuestionInventory = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((cefr_level) => ({
  cefr_level,
  count: 100,
}));

// A migration this release does not package, sorting after every packaged one
// — what an old replica sees once the next release's migration job has run.
const NEWER_RELEASE_MIGRATION = { name: '999_from_a_newer_release.sql', checksum: 'f'.repeat(64) };

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
    expect(manifest.at(-1)?.name).toBe('013_assessment_audio_key_uniqueness.sql');
    expect(manifest.every(({ checksum }) => /^[0-9a-f]{64}$/.test(checksum))).toBe(true);

    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: completeQuestionInventory });

    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).resolves.toEqual({
      latestMigration: '013_assessment_audio_key_uniqueness.sql',
    });
    expect(query.mock.calls[0]).toEqual(['SELECT name, checksum FROM schema_migrations ORDER BY name COLLATE "C"']);
    expect(query.mock.calls[1]).toEqual(['SELECT to_regclass($1)::text AS table_name', ['public.rate_limit_windows']]);
    expect(query.mock.calls[2]?.[0]).toContain('FROM questions');
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
      latestMigration: '013_assessment_audio_key_uniqueness.sql',
    });
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
    const exactMinimum = completeQuestionInventory.map((row) => ({ ...row, count: 100 }));
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: exactMinimum });

    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).resolves.toEqual({
      latestMigration: '013_assessment_audio_key_uniqueness.sql',
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

  it('rejects an unseeded or incomplete CEFR question inventory', async () => {
    for (const rows of [
      [],
      completeQuestionInventory.slice(0, -1),
      completeQuestionInventory.map((row) => (row.cefr_level === 'A1' ? { ...row, count: 99 } : row)),
      completeQuestionInventory.map((row, index) => (index === 0 ? { ...row, cefr_level: null } : row)),
      completeQuestionInventory.map((row, index) => (index === 0 ? { ...row, count: '100' } : row)),
    ]) {
      const query = vi
        .fn()
        .mockResolvedValueOnce({ rows: successfulMigrationRows() })
        .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
        .mockResolvedValueOnce({ rows });
      await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
        'Question inventory is incomplete',
      );
    }
  });

  it('rejects a string count of 100 even when every CEFR inventory row is present', async () => {
    const rows = completeQuestionInventory.map((row, index) => (index === 0 ? { ...row, count: '100' } : row));
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows });

    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow('Question inventory is incomplete');
  });

  it('uses the pool adapter with explicit values for every readiness query', async () => {
    const query = vi
      .spyOn(pool, 'query')
      .mockResolvedValueOnce({ rows: successfulMigrationRows() } as never)
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] } as never)
      .mockResolvedValueOnce({ rows: completeQuestionInventory } as never);

    try {
      await expect(assertDatabaseSchemaCurrent()).resolves.toEqual({
        latestMigration: '013_assessment_audio_key_uniqueness.sql',
      });
      expect(query.mock.calls).toEqual([
        ['SELECT name, checksum FROM schema_migrations ORDER BY name COLLATE "C"', []],
        ['SELECT to_regclass($1)::text AS table_name', ['public.rate_limit_windows']],
        [expect.stringContaining('FROM questions'), []],
      ]);
    } finally {
      query.mockRestore();
    }
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
