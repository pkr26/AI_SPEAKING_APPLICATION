import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';
import { assertDatabaseSchemaCurrent, expectedMigrationManifest, SchemaQuery } from '../src/schema-readiness';

function successfulMigrationRows() {
  return expectedMigrationManifest().map(({ name, checksum }) => ({ name, checksum }));
}

const completeQuestionInventory = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((cefr_level) => ({
  cefr_level,
  count: 6,
}));

describe('database schema readiness', () => {
  it('matches the packaged migration names/checksums and required runtime table', async () => {
    const manifest = expectedMigrationManifest();
    expect(manifest.at(-1)?.name).toBe('007_distributed_rate_limits.sql');
    expect(manifest.every(({ checksum }) => /^[0-9a-f]{64}$/.test(checksum))).toBe(true);

    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: 'rate_limit_windows' }] })
      .mockResolvedValueOnce({ rows: completeQuestionInventory });

    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).resolves.toEqual({
      latestMigration: '007_distributed_rate_limits.sql',
    });
    expect(query.mock.calls[1]).toEqual(['SELECT to_regclass($1)::text AS table_name', ['public.rate_limit_windows']]);
    expect(query.mock.calls[2]?.[0]).toContain('FROM questions');
  });

  it('rejects a missing, extra, or checksum-mismatched migration', async () => {
    const current = successfulMigrationRows();
    for (const rows of [
      current.slice(0, -1),
      [...current, { name: '999_unknown.sql', checksum: 'f'.repeat(64) }],
      current.map((row, index) => (index === current.length - 1 ? { ...row, checksum: '0'.repeat(64) } : row)),
    ]) {
      const query = vi.fn().mockResolvedValue({ rows });
      await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
        'Database migrations do not match this release',
      );
      expect(query).toHaveBeenCalledOnce();
    }
  });

  it('rejects a missing latest runtime table', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: successfulMigrationRows() })
      .mockResolvedValueOnce({ rows: [{ table_name: null }] });
    await expect(assertDatabaseSchemaCurrent(query as SchemaQuery)).rejects.toThrow(
      'Required database table public.rate_limit_windows is missing',
    );
  });

  it('rejects an unseeded or incomplete CEFR question inventory', async () => {
    for (const rows of [[], completeQuestionInventory.slice(0, -1), [{ cefr_level: 'A1', count: 1 }]]) {
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
    expect(response.body).toEqual({ ok: false, error: 'required service dependency unavailable' });
    expect(JSON.stringify(response.body)).not.toContain(sensitiveDetail);
  });
});
