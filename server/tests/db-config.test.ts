import { describe, expect, it, vi } from 'vitest';

const { poolConstructor, on, loggerError } = vi.hoisted(() => ({
  poolConstructor: vi.fn(),
  on: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(function (options: unknown) {
    poolConstructor(options);
    return { on };
  }),
}));

vi.mock('../src/logger', () => ({
  logger: { error: loggerError },
}));

import { config } from '../src/config';

describe('database pool configuration', () => {
  it('applies the exact pool contract, columns, and idle-client error handler', async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const { QUESTION_ROW_COLUMNS } = await import('../src/db');

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
    expect(QUESTION_ROW_COLUMNS).toBe('id, cefr_level, prompt_word, question_text, translations');

    const idleError = new Error('idle client failed');
    const errorHandler = on.mock.calls[0]?.[1] as ((error: Error) => void) | undefined;
    expect(errorHandler).toBeDefined();
    errorHandler?.(idleError);
    expect(loggerError).toHaveBeenCalledOnce();
    expect(loggerError).toHaveBeenCalledWith({ err: idleError }, 'unexpected error on idle postgres client');
  });
});
