import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clientConstructor, connect, end, query } = vi.hoisted(() => ({
  clientConstructor: vi.fn(),
  connect: vi.fn(),
  end: vi.fn(),
  query: vi.fn(),
}));

vi.mock('pg', () => ({
  Client: vi.fn().mockImplementation(function (options: unknown) {
    clientConstructor(options);
    return { connect, end, query };
  }),
}));

import { preflight, runPreflightCommand } from '../db/preflight';

const DATABASE_URL = 'postgres://localhost:5432/preflight_test';
const CHECK_NAMES = [
  'invalid users',
  'duplicate question natural keys',
  'invalid questions',
  'invalid attempts',
  'invalid diagnostic states',
] as const;

beforeEach(() => {
  clientConstructor.mockClear();
  connect.mockReset().mockResolvedValue(undefined);
  end.mockReset().mockResolvedValue(undefined);
  query.mockReset();
});

describe('database integrity preflight', () => {
  it('runs every bounded read-only integrity check and always closes the client', async () => {
    query.mockResolvedValue({ rows: [{ n: 0 }] });

    await expect(preflight(DATABASE_URL)).resolves.toBeUndefined();

    expect(clientConstructor).toHaveBeenCalledWith({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 10_000,
    });
    expect(connect).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]).toEqual(["SET statement_timeout = '60s'"]);
    expect(query).toHaveBeenCalledTimes(6);
    const integritySql = query.mock.calls.slice(1).map(([sql]) => String(sql));
    expect(integritySql).toHaveLength(5);
    expect(integritySql[0]).toContain('token_version <= 0');
    expect(integritySql[0]).toContain('diagnostic_completed AND cefr_level IS NULL');
    expect(integritySql[1]).toContain('GROUP BY cefr_level, prompt_word HAVING count(*) > 1');
    expect(integritySql[2]).toContain("translations ?& ARRAY['te', 'hi', 'es', 'zh']");
    expect(integritySql[2]).toContain("unnest(ARRAY['te', 'hi', 'es', 'zh'])");
    expect(integritySql[2]).toContain("jsonb_typeof(payload.translation->'word') IS DISTINCT FROM 'string'");
    expect(integritySql[2]).toContain("char_length(payload.translation->>'word') > 500");
    expect(integritySql[2]).toContain("btrim(payload.translation->>'question') = ''");
    expect(integritySql[2]).toContain("jsonb_array_length(payload.translation->'examples') <> 3");
    expect(integritySql[2]).toContain("jsonb_array_elements(payload.translation->'examples')");
    expect(integritySql[2]).toContain("jsonb_typeof(example.item->'native') IS DISTINCT FROM 'string'");
    expect(integritySql[2]).toContain("char_length(example.item->>'native') > 4000");
    expect(integritySql[3]).toContain('score NOT BETWEEN 0 AND 100');
    expect(integritySql[3]).toContain('char_length(transcript) > 12000');
    expect(integritySql[4]).toContain('low_idx > high_idx + 1');
    expect(end).toHaveBeenCalledOnce();
  });

  it.each(CHECK_NAMES.map((name, index) => [name, index, index + 1] as const))(
    'reports a nonzero %s failure by name and count',
    async (name, failedIndex, count) => {
      query.mockResolvedValueOnce({ rows: [] });
      for (let index = 0; index < CHECK_NAMES.length; index++) {
        query.mockResolvedValueOnce({ rows: [{ n: index === failedIndex ? count : 0 }] });
      }

      await expect(preflight(DATABASE_URL)).rejects.toThrow(`${name}: ${count}`);
      expect(end).toHaveBeenCalledOnce();
    },
  );

  it('reports multiple integrity failures on separate operator-readable lines', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ n: 2 }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockResolvedValueOnce({ rows: [{ n: 3 }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] })
      .mockResolvedValueOnce({ rows: [{ n: 0 }] });

    await expect(preflight(DATABASE_URL)).rejects.toThrow(
      'database integrity preflight failed; repair or explicitly migrate these rows before deployment:\n  - invalid users: 2\n  - invalid questions: 3',
    );
    expect(end).toHaveBeenCalledOnce();
  });

  it('closes the client when an integrity query fails', async () => {
    const failure = new Error('database disconnected');
    query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(failure);

    await expect(preflight(DATABASE_URL)).rejects.toBe(failure);
    expect(end).toHaveBeenCalledOnce();
  });

  it('preserves an integrity query failure when disconnect also fails', async () => {
    const queryFailure = new Error('integrity query failed');
    query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(queryFailure);
    end.mockRejectedValueOnce(new Error('disconnect failed'));

    await expect(preflight(DATABASE_URL)).rejects.toBe(queryFailure);
    expect(end).toHaveBeenCalledOnce();
  });

  it('propagates a disconnect failure when every integrity check succeeds', async () => {
    const disconnectFailure = new Error('disconnect failed');
    query.mockResolvedValue({ rows: [{ n: 0 }] });
    end.mockRejectedValueOnce(disconnectFailure);

    await expect(preflight(DATABASE_URL)).rejects.toBe(disconnectFailure);
    expect(end).toHaveBeenCalledOnce();
  });

  it('validates and wires the preflight command before logging success', async () => {
    const check = vi.fn(async () => undefined);
    const log = vi.fn();

    await expect(runPreflightCommand(DATABASE_URL, check, log)).resolves.toBeUndefined();
    expect(check).toHaveBeenCalledOnce();
    expect(check).toHaveBeenCalledWith(DATABASE_URL);
    expect(log).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith('database integrity preflight passed');

    await expect(runPreflightCommand(undefined, check, log)).rejects.toThrow('DATABASE_URL is required');
    expect(check).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledOnce();
  });

  it('does not log command success when the integrity check fails', async () => {
    const failure = new Error('preflight command failed');
    const check = vi.fn(async () => {
      throw failure;
    });
    const log = vi.fn();

    await expect(runPreflightCommand(DATABASE_URL, check, log)).rejects.toBe(failure);
    expect(log).not.toHaveBeenCalled();
  });
});
