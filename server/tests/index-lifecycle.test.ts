import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => {
  const server = {
    listening: false,
    requestTimeout: 0,
    headersTimeout: 0,
    listen: vi.fn((_: number, callback?: () => void) => {
      server.listening = true;
      callback?.();
      return server;
    }),
    close: vi.fn((callback?: (error?: Error) => void) => {
      server.listening = false;
      callback?.();
      return server;
    }),
    closeIdleConnections: vi.fn(),
  };
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  };
  return {
    server,
    logger,
    createServer: vi.fn(() => server),
    createApp: vi.fn(() => vi.fn()),
    poolEnd: vi.fn(async (): Promise<void> => undefined),
    poolQuery: vi.fn(async () => ({ rows: [{ max_connections: '100' }] })),
    cleanupUploads: vi.fn(async () => 0),
    cleanupRequests: vi.fn(async () => 0),
    cleanupRateLimits: vi.fn(async () => 0),
    cleanupUsage: vi.fn(async () => 0),
    cleanupResetTokens: vi.fn(async () => 0),
    abortAssessments: vi.fn(() => 0),
    assertSchema: vi.fn(async (): Promise<void> => undefined),
    assertAudio: vi.fn(async (): Promise<void> => undefined),
    trustProxy: false as false | number,
    dbPoolMax: 20,
  };
});

vi.mock('http', () => ({ createServer: runtime.createServer }));
vi.mock('../src/app', () => ({ createApp: runtime.createApp }));
vi.mock('../src/config', () => ({
  config: {
    port: 43210,
    mockAi: true,
    nodeEnv: 'test',
    openaiTimeoutMs: 60_000,
    shutdownDrainMs: 140_000,
    s3: { operationTimeoutMs: 30_000 },
    get trustProxy() {
      return runtime.trustProxy;
    },
    get dbPoolMax() {
      return runtime.dbPoolMax;
    },
  },
}));
vi.mock('../src/db', () => ({ pool: { end: runtime.poolEnd, query: runtime.poolQuery } }));
vi.mock('../src/logger', () => ({ logger: runtime.logger }));
vi.mock('../src/upload', () => ({ cleanupOldUploads: runtime.cleanupUploads }));
vi.mock('../src/idempotency', () => ({ cleanupAssessmentRequests: runtime.cleanupRequests }));
vi.mock('../src/postgres-rate-limit-store', () => ({ cleanupRateLimitWindows: runtime.cleanupRateLimits }));
vi.mock('../src/assess', () => ({
  cleanupAssessmentUsage: runtime.cleanupUsage,
  abortInFlightAssessments: runtime.abortAssessments,
}));
vi.mock('../src/auth', () => ({ cleanupPasswordResetTokens: runtime.cleanupResetTokens }));
vi.mock('../src/schema-readiness', () => ({ assertDatabaseSchemaCurrent: runtime.assertSchema }));
vi.mock('../src/audio-inspection', () => ({ assertAudioInspectorAvailable: runtime.assertAudio }));

let originalSigtermListeners: Set<NodeJS.SignalsListener>;
let originalSigintListeners: Set<NodeJS.SignalsListener>;

function addedSignalListener(signal: 'SIGTERM' | 'SIGINT'): NodeJS.SignalsListener {
  const original = signal === 'SIGTERM' ? originalSigtermListeners : originalSigintListeners;
  const listener = process.listeners(signal).find((candidate) => !original.has(candidate));
  if (!listener) throw new Error(`index did not register ${signal}`);
  return listener;
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  runtime.trustProxy = false;
  runtime.dbPoolMax = 20;
  runtime.poolQuery.mockResolvedValue({ rows: [{ max_connections: '100' }] });
  runtime.server.listening = false;
  runtime.server.listen.mockImplementation((_: number, callback?: () => void) => {
    runtime.server.listening = true;
    callback?.();
    return runtime.server;
  });
  runtime.server.close.mockImplementation((callback?: (error?: Error) => void) => {
    runtime.server.listening = false;
    callback?.();
    return runtime.server;
  });
  runtime.poolEnd.mockResolvedValue(undefined);
  runtime.cleanupUploads.mockResolvedValue(0);
  runtime.cleanupRequests.mockResolvedValue(0);
  runtime.cleanupRateLimits.mockResolvedValue(0);
  runtime.cleanupUsage.mockResolvedValue(0);
  runtime.cleanupResetTokens.mockResolvedValue(0);
  runtime.abortAssessments.mockReturnValue(0);
  runtime.assertSchema.mockResolvedValue(undefined);
  runtime.assertAudio.mockResolvedValue(undefined);
  originalSigtermListeners = new Set(process.listeners('SIGTERM'));
  originalSigintListeners = new Set(process.listeners('SIGINT'));
});

afterEach(() => {
  for (const listener of process.listeners('SIGTERM')) {
    if (!originalSigtermListeners.has(listener)) process.removeListener('SIGTERM', listener);
  }
  for (const listener of process.listeners('SIGINT')) {
    if (!originalSigintListeners.has(listener)) process.removeListener('SIGINT', listener);
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('server lifecycle failure handling', () => {
  it('warns at boot when TRUST_PROXY is configured, and stays silent at zero hops', async () => {
    runtime.trustProxy = 2;
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    expect(runtime.logger.warn).toHaveBeenCalledWith(
      { trustProxy: 2 },
      'TRUST_PROXY is set: the hop count must exactly match the deployment proxy chain; if this port is reachable directly, clients can spoof X-Forwarded-For to reset per-IP rate-limit budgets',
    );

    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    // The default zero-hop configuration boots without the warning.
    runtime.trustProxy = false;
    runtime.logger.warn.mockClear();
    runtime.server.listen.mockClear();
    vi.resetModules();
    await import('../src/index');
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    expect(
      runtime.logger.warn.mock.calls.filter(([, message]) => String(message).includes('TRUST_PROXY')),
    ).toHaveLength(0);

    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });

  it('errors at boot when DB_POOL_MAX would starve the server, and stays quiet with headroom', async () => {
    runtime.dbPoolMax = 100;
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    expect(runtime.logger.error).toHaveBeenCalledWith(
      { dbPoolMax: 100, maxConnections: 100 },
      'DB_POOL_MAX leaves fewer than 3 database connections for admin, migration, and readiness clients; reduce DB_POOL_MAX or raise max_connections',
    );

    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    // A pool that leaves at least three server connections boots without the error.
    runtime.dbPoolMax = 20;
    runtime.logger.error.mockClear();
    runtime.server.listen.mockClear();
    vi.resetModules();
    await import('../src/index');
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    expect(
      runtime.logger.error.mock.calls.filter(([, message]) => String(message).includes('DB_POOL_MAX')),
    ).toHaveLength(0);

    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });

  it('contains every boot janitor rejection and reports it without blocking startup', async () => {
    const uploadError = new Error('upload cleanup failed');
    const replayError = new Error('replay cleanup failed');
    const rateLimitError = new Error('rate-limit cleanup failed');
    const usageError = new Error('usage cleanup failed');
    const resetTokenError = new Error('reset token cleanup failed');
    runtime.cleanupUploads.mockRejectedValueOnce(uploadError);
    runtime.cleanupRequests.mockRejectedValueOnce(replayError);
    runtime.cleanupRateLimits.mockRejectedValueOnce(rateLimitError);
    runtime.cleanupUsage.mockRejectedValueOnce(usageError);
    runtime.cleanupResetTokens.mockRejectedValueOnce(resetTokenError);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');

    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    await vi.waitFor(() => {
      expect(runtime.logger.warn).toHaveBeenCalledWith({ err: uploadError }, 'upload janitor failed');
      expect(runtime.logger.warn).toHaveBeenCalledWith({ err: replayError }, 'assessment replay janitor failed');
      expect(runtime.logger.warn).toHaveBeenCalledWith({ err: rateLimitError }, 'rate-limit janitor failed');
      expect(runtime.logger.warn).toHaveBeenCalledWith({ err: usageError }, 'assessment usage janitor failed');
      expect(runtime.logger.warn).toHaveBeenCalledWith({ err: resetTokenError }, 'password reset token janitor failed');
    });
    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });

  it('logs exact positive janitor results and stays quiet when no stale records were removed', async () => {
    vi.useFakeTimers();
    runtime.cleanupUploads.mockResolvedValueOnce(2);
    runtime.cleanupRequests.mockResolvedValueOnce(3);
    runtime.cleanupRateLimits.mockResolvedValueOnce(4);
    runtime.cleanupUsage.mockResolvedValueOnce(5);
    runtime.cleanupResetTokens.mockResolvedValueOnce(6);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    await vi.waitFor(() => {
      expect(runtime.logger.info).toHaveBeenCalledWith({ removed: 2 }, 'janitor removed stale uploads');
      expect(runtime.logger.info).toHaveBeenCalledWith({ removed: 3 }, 'janitor removed expired assessment replays');
      expect(runtime.logger.info).toHaveBeenCalledWith({ removed: 4 }, 'janitor removed expired rate-limit counters');
      expect(runtime.logger.info).toHaveBeenCalledWith(
        { removed: 5 },
        'janitor removed expired assessment reservations',
      );
      expect(runtime.logger.info).toHaveBeenCalledWith({ removed: 6 }, 'janitor removed expired password reset tokens');
    });

    // The same tick feeds janitor_removed_total, labeled per janitor. Import
    // the metrics module AFTER index so both share this test's module registry.
    const { janitorRemovedTotal } = await import('../src/metrics');
    const janitorCounts = async () => {
      const { values } = await janitorRemovedTotal.get();
      return Object.fromEntries(values.map(({ labels, value }) => [labels.janitor, value]));
    };
    expect(await janitorCounts()).toEqual({
      uploads: 2,
      'assessment-requests': 3,
      'rate-limit-windows': 4,
      'assessment-usage': 5,
      'password-reset-tokens': 6,
    });

    runtime.logger.info.mockClear();
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    expect(runtime.cleanupUploads).toHaveBeenCalledTimes(2);
    expect(runtime.logger.info).not.toHaveBeenCalled();
    // The second upload tick removed nothing: the counter must not move.
    expect((await janitorCounts()).uploads).toBe(2);

    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });

  it('starts janitors only after readiness, uses exact cadences, and cancels every timer on shutdown', async () => {
    vi.useFakeTimers();
    let releaseSchema!: () => void;
    runtime.assertSchema.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseSchema = resolve;
        }),
    );
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');

    expect(runtime.cleanupUploads).not.toHaveBeenCalled();
    expect(runtime.cleanupRequests).not.toHaveBeenCalled();
    expect(runtime.cleanupRateLimits).not.toHaveBeenCalled();
    expect(runtime.cleanupUsage).not.toHaveBeenCalled();
    expect(runtime.cleanupResetTokens).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();

    releaseSchema();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    // One extra tick: the awaited DB_POOL_MAX vs max_connections guard now runs
    // between the dependency checks and listen().
    await Promise.resolve();

    expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function));
    expect(runtime.cleanupUploads).toHaveBeenCalledOnce();
    expect(runtime.cleanupRequests).toHaveBeenCalledOnce();
    expect(runtime.cleanupRateLimits).toHaveBeenCalledOnce();
    expect(runtime.cleanupUsage).toHaveBeenCalledOnce();
    expect(runtime.cleanupResetTokens).toHaveBeenCalledOnce();
    expect(setIntervalSpy.mock.calls.map(([, delay]) => delay)).toEqual([
      15 * 60 * 1000,
      60 * 60 * 1000,
      60 * 60 * 1000,
      60 * 60 * 1000,
      60 * 60 * 1000,
    ]);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(runtime.cleanupUploads).toHaveBeenCalledTimes(5);
    expect(runtime.cleanupRequests).toHaveBeenCalledTimes(2);
    expect(runtime.cleanupRateLimits).toHaveBeenCalledTimes(2);
    expect(runtime.cleanupUsage).toHaveBeenCalledTimes(2);
    expect(runtime.cleanupResetTokens).toHaveBeenCalledTimes(2);

    addedSignalListener('SIGTERM')('SIGTERM');
    await Promise.resolve();
    await Promise.resolve();
    expect(exit).toHaveBeenCalledWith(0);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(5);

    const callsAfterShutdown = [
      runtime.cleanupUploads.mock.calls.length,
      runtime.cleanupRequests.mock.calls.length,
      runtime.cleanupRateLimits.mock.calls.length,
      runtime.cleanupUsage.mock.calls.length,
      runtime.cleanupResetTokens.mock.calls.length,
    ];
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect([
      runtime.cleanupUploads.mock.calls.length,
      runtime.cleanupRequests.mock.calls.length,
      runtime.cleanupRateLimits.mock.calls.length,
      runtime.cleanupUsage.mock.calls.length,
      runtime.cleanupResetTokens.mock.calls.length,
    ]).toEqual(callsAfterShutdown);
  });

  it('sets bounded HTTP timeouts and waits for both forced startup dependency checks', async () => {
    let releaseSchema!: () => void;
    let releaseAudio!: () => void;
    runtime.assertSchema.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseSchema = resolve;
        }),
    );
    runtime.assertAudio.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseAudio = resolve;
        }),
    );
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');

    // The whole-request budget tracks the slowest assessment chain: mocked
    // S3 download 30s + provider 60s + decode/ingress margin 40s.
    expect(runtime.server.requestTimeout).toBe(130_000);
    expect(runtime.server.headersTimeout).toBe(30_000);
    expect(runtime.assertSchema).toHaveBeenCalledOnce();
    expect(runtime.assertAudio).toHaveBeenCalledWith({ force: true });
    expect(runtime.server.listen).not.toHaveBeenCalled();

    releaseSchema();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(runtime.server.listen).not.toHaveBeenCalled();

    releaseAudio();
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    expect(runtime.logger.info).toHaveBeenCalledWith(
      { port: 43210, mockAi: true, nodeEnv: 'test' },
      'AI English API listening',
    );
    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });

  it('treats a shutdown signal before listen as a clean shutdown', async () => {
    let releaseSchema!: () => void;
    runtime.assertSchema.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseSchema = resolve;
        }),
    );
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    addedSignalListener('SIGTERM')('SIGTERM');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(runtime.server.close).not.toHaveBeenCalled();
    expect(runtime.poolEnd).toHaveBeenCalledOnce();
    expect(runtime.logger.info).toHaveBeenCalledWith({ signal: 'SIGTERM' }, 'shutting down');
    expect(runtime.logger.info).toHaveBeenCalledWith('shutdown complete');
    expect(runtime.logger.error).not.toHaveBeenCalledWith({ err: undefined }, 'error closing HTTP server');
    releaseSchema();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(runtime.server.listen).not.toHaveBeenCalled();
  });

  it('ignores a startup dependency rejection after an early shutdown has completed', async () => {
    const dependencyError = new Error('schema rejected after shutdown');
    let rejectSchema: ((reason?: unknown) => void) | undefined;
    runtime.assertSchema.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSchema = reject;
        }),
    );
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    try {
      addedSignalListener('SIGTERM')('SIGTERM');
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

      rejectSchema?.(dependencyError);
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(runtime.poolEnd).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenCalledOnce();
      expect(exit).toHaveBeenLastCalledWith(0);
      expect(runtime.logger.fatal).not.toHaveBeenCalled();
      expect(runtime.server.listen).not.toHaveBeenCalled();
    } finally {
      rejectSchema?.(dependencyError);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  });

  it('does not re-enter shutdown when a signal follows a startup dependency failure', async () => {
    const dependencyError = new Error('schema unavailable');
    let rejectSchema: ((reason?: unknown) => void) | undefined;
    let releasePool: (() => void) | undefined;
    runtime.assertSchema.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSchema = reject;
        }),
    );
    runtime.poolEnd.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releasePool = resolve;
        }),
    );
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    try {
      rejectSchema?.(dependencyError);
      await vi.waitFor(() => {
        expect(runtime.logger.fatal).toHaveBeenCalledWith(
          { err: dependencyError },
          'required service dependency is unavailable; refusing to start',
        );
        expect(runtime.poolEnd).toHaveBeenCalledOnce();
      });

      addedSignalListener('SIGINT')('SIGINT');
      expect(runtime.poolEnd).toHaveBeenCalledOnce();
      expect(runtime.logger.info).not.toHaveBeenCalledWith({ signal: 'SIGINT' }, 'shutting down');
      expect(exit).not.toHaveBeenCalled();

      releasePool?.();
      await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
      expect(exit).toHaveBeenCalledOnce();
    } finally {
      rejectSchema?.(dependencyError);
      releasePool?.();
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  });

  it('logs a startup dependency failure, closes the pool, and refuses to listen', async () => {
    const dependencyError = new Error('schema unavailable');
    const poolError = new Error('pool close failed');
    runtime.assertSchema.mockRejectedValueOnce(dependencyError);
    runtime.poolEnd.mockRejectedValueOnce(poolError);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(runtime.logger.fatal).toHaveBeenCalledWith(
      { err: dependencyError },
      'required service dependency is unavailable; refusing to start',
    );
    expect(runtime.logger.error).toHaveBeenCalledWith(
      { err: poolError },
      'error closing pg pool after dependency startup failure',
    );
    expect(runtime.server.listen).not.toHaveBeenCalled();
  });

  it('fails closed when the forced audio-inspector startup check rejects', async () => {
    const dependencyError = new Error('FFmpeg unavailable');
    runtime.assertAudio.mockRejectedValueOnce(dependencyError);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(runtime.assertAudio).toHaveBeenCalledWith({ force: true });
    expect(runtime.logger.fatal).toHaveBeenCalledWith(
      { err: dependencyError },
      'required service dependency is unavailable; refusing to start',
    );
    expect(runtime.poolEnd).toHaveBeenCalledOnce();
    expect(runtime.server.listen).not.toHaveBeenCalled();
  });

  it('reports a real HTTP close failure after the server has started', async () => {
    const closeError = new Error('HTTP close failed');
    runtime.server.close.mockImplementationOnce((callback?: (error?: Error) => void) => {
      runtime.server.listening = false;
      callback?.(closeError);
      return runtime.server;
    });
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    addedSignalListener('SIGINT')('SIGINT');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(runtime.server.close).toHaveBeenCalledOnce();
    expect(runtime.poolEnd).toHaveBeenCalledOnce();
    expect(runtime.logger.error).toHaveBeenCalledWith({ err: closeError }, 'error closing HTTP server');
  });

  it('reports a pool-close failure during an otherwise graceful shutdown', async () => {
    const poolError = new Error('pool close failed');
    runtime.poolEnd.mockRejectedValueOnce(poolError);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    addedSignalListener('SIGTERM')('SIGTERM');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(runtime.logger.error).toHaveBeenCalledWith({ err: poolError }, 'error closing pg pool');
  });

  it('forces a failed exit only when the drain exceeds the configured SHUTDOWN_DRAIN_MS budget', async () => {
    vi.useFakeTimers();
    runtime.server.close.mockImplementationOnce(() => runtime.server);
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    await Promise.resolve();
    await Promise.resolve();
    expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function));

    addedSignalListener('SIGINT')('SIGINT');
    expect(runtime.logger.info).toHaveBeenCalledWith({ signal: 'SIGINT' }, 'shutting down');
    // The drain budget is the mocked SHUTDOWN_DRAIN_MS (140s), sized above the
    // 130s worst-case request budget so in-flight assessments can finish.
    await vi.advanceTimersByTimeAsync(139_999);
    expect(exit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(runtime.logger.error).toHaveBeenCalledWith('graceful shutdown timed out — forcing exit');
    expect(exit).toHaveBeenCalledWith(1);
    expect(runtime.poolEnd).not.toHaveBeenCalled();
  });

  it('aborts in-flight assessments and severs idle keep-alive connections at drain start', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    await vi.waitFor(() => expect(runtime.server.listen).toHaveBeenCalledWith(43210, expect.any(Function)));
    expect(runtime.abortAssessments).not.toHaveBeenCalled();
    expect(runtime.server.closeIdleConnections).not.toHaveBeenCalled();

    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
    expect(runtime.server.close).toHaveBeenCalledOnce();
    expect(runtime.server.closeIdleConnections).toHaveBeenCalledOnce();
    expect(runtime.abortAssessments).toHaveBeenCalledOnce();
  });

  it('still aborts in-flight assessments when shutdown starts before listen, without touching sockets', async () => {
    let releaseSchema!: () => void;
    runtime.assertSchema.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseSchema = resolve;
        }),
    );
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await import('../src/index');
    addedSignalListener('SIGTERM')('SIGTERM');
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));

    expect(runtime.abortAssessments).toHaveBeenCalledOnce();
    expect(runtime.server.close).not.toHaveBeenCalled();
    expect(runtime.server.closeIdleConnections).not.toHaveBeenCalled();
    releaseSchema();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
});
