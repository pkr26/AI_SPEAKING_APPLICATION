import { afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config';
import { pool } from '../src/db';
import { logger } from '../src/logger';

/**
 * Bootstrap coverage for index.ts and db.ts. index.ts is imported in-process
 * with process.exit stubbed so the graceful-shutdown path (server.close ->
 * pool.end -> exit) runs for real without killing the worker. NOTE: the
 * shutdown test ends the shared pool, so it must stay the last test in this
 * file and nothing here may use the pool afterwards.
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('db pool', () => {
  it('logs idle-client errors instead of crashing', () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const err = new Error('idle boom');
    expect(() => pool.emit('error', err)).not.toThrow();
    expect(errorSpy).toHaveBeenCalledWith({ err }, 'unexpected error on idle postgres client');
  });
});

describe('index bootstrap', () => {
  it('serves requests and shuts down gracefully on SIGTERM (exactly once)', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');

    // The server is up once /health answers.
    const url = `http://127.0.0.1:${config.port}/health`;
    await vi.waitFor(
      async () => {
        const res = await fetch(url, { headers: { connection: 'close' } });
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
      },
      { timeout: 10_000, interval: 100 },
    );

    process.emit('SIGTERM', 'SIGTERM');
    await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(0), { timeout: 15_000, interval: 100 });

    // A second signal must not re-enter shutdown.
    const calls = exitSpy.mock.calls.length;
    process.emit('SIGINT', 'SIGINT');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(exitSpy.mock.calls.length).toBe(calls);
  }, 30_000);
});
