import { describe, expect, it, vi } from 'vitest';

const { poolConstructor, on } = vi.hoisted(() => ({
  poolConstructor: vi.fn(),
  on: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(function (options: unknown) {
    poolConstructor(options);
    return { on };
  }),
}));

import { config } from '../src/config';
import '../src/db';

describe('database pool configuration', () => {
  it('applies bounded connection, query, lock, idle, and lifetime settings', () => {
    expect(poolConstructor).toHaveBeenCalledOnce();
    expect(poolConstructor).toHaveBeenCalledWith({
      connectionString: config.databaseUrl,
      max: config.dbPoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: config.dbStatementTimeoutMs,
      query_timeout: config.dbStatementTimeoutMs + 1_000,
      lock_timeout: config.dbLockTimeoutMs,
      maxLifetimeSeconds: 5 * 60,
    });
    expect(on).toHaveBeenCalledOnce();
    expect(on.mock.calls[0]?.[0]).toBe('error');
    expect(on.mock.calls[0]?.[1]).toEqual(expect.any(Function));
  });
});
