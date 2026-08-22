import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  collectDefaultMetrics: vi.fn(),
  histogramOptions: [] as Array<Record<string, unknown>>,
  gaugeOptions: [] as Array<Record<string, unknown>>,
  counterOptions: [] as Array<Record<string, unknown>>,
  startTimer: vi.fn(),
  aiSlots: vi.fn(() => 3),
  audioSlots: vi.fn(() => 4),
  pool: { totalCount: 7, idleCount: 5, waitingCount: 2 },
}));

vi.mock('prom-client', () => ({
  Registry: class Registry {},
  collectDefaultMetrics: runtime.collectDefaultMetrics,
  Histogram: class Histogram {
    startTimer = runtime.startTimer;

    constructor(options: Record<string, unknown>) {
      runtime.histogramOptions.push(options);
    }
  },
  Gauge: class Gauge {
    constructor(options: Record<string, unknown>) {
      runtime.gaugeOptions.push(options);
    }
  },
  Counter: class Counter {
    constructor(options: Record<string, unknown>) {
      runtime.counterOptions.push(options);
    }
  },
}));

vi.mock('../src/assess', () => ({ getAiSlotsInUse: runtime.aiSlots }));
vi.mock('../src/audio-inspection', () => ({ getAudioInspectionSlotsInUse: runtime.audioSlots }));
vi.mock('../src/db', () => ({ pool: runtime.pool }));

function optionNamed(options: Array<Record<string, unknown>>, name: string): Record<string, unknown> {
  const match = options.find((option) => option.name === name);
  if (!match) throw new Error(`missing metric options for ${name}`);
  return match;
}

describe('metrics initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    runtime.histogramOptions.length = 0;
    runtime.gaugeOptions.length = 0;
    runtime.counterOptions.length = 0;
    runtime.pool.totalCount = 7;
    runtime.pool.idleCount = 5;
    runtime.pool.waitingCount = 2;
  });

  it('registers every metric with its exact bounded labels, buckets, and registry', async () => {
    const { registry } = await import('../src/metrics');

    expect(runtime.collectDefaultMetrics).toHaveBeenCalledOnce();
    expect(runtime.collectDefaultMetrics).toHaveBeenCalledWith({ register: registry });
    expect(runtime.histogramOptions).toEqual([
      {
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds by method, matched route pattern, and status code',
        labelNames: ['method', 'route', 'status'],
        buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 130],
        registers: [registry],
      },
      {
        name: 'provider_call_duration_seconds',
        help: 'OpenAI provider call duration in seconds by call kind and outcome',
        labelNames: ['kind', 'outcome'],
        buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 130],
        registers: [registry],
      },
    ]);
    expect(runtime.counterOptions).toEqual([
      {
        name: 'provider_call_errors_total',
        help: 'Failed OpenAI provider calls by call kind and outcome',
        labelNames: ['kind', 'outcome'],
        registers: [registry],
      },
      {
        name: 'shed_requests_total',
        help: 'Requests shed by backpressure guards, by reason',
        labelNames: ['reason'],
        registers: [registry],
      },
      {
        name: 'janitor_removed_total',
        help: 'Records removed by periodic janitors, by janitor',
        labelNames: ['janitor'],
        registers: [registry],
      },
    ]);

    for (const [name, help] of [
      ['pg_pool_total_connections', 'PostgreSQL clients currently owned by this process pool (idle + checked out)'],
      ['pg_pool_idle_connections', 'PostgreSQL clients sitting idle in this process pool'],
      ['pg_pool_waiting_requests', 'Checkout requests queued because every pool client is busy'],
      [
        'ai_slots_in_use',
        'Paid AI assessments currently holding a concurrency slot on this process (cap: AI_MAX_CONCURRENCY)',
      ],
      [
        'audio_inspection_slots_in_use',
        'Native audio inspections currently holding a decoder slot on this process (cap: AUDIO_INSPECTION_MAX_CONCURRENCY)',
      ],
    ] as const) {
      expect(optionNamed(runtime.gaugeOptions, name)).toEqual({
        name,
        help,
        registers: [registry],
        collect: expect.any(Function),
      });
    }
  });

  it('keeps every allowlisted HTTP method in its bounded metric label', async () => {
    const { metricMethod } = await import('../src/metrics');

    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      expect(metricMethod(method.toLowerCase())).toBe(method);
    }
  });

  it('collects live pool and capacity values and records the exact matched route labels', async () => {
    const { httpMetricsMiddleware } = await import('../src/metrics');

    for (const [name, expected] of [
      ['pg_pool_total_connections', 7],
      ['pg_pool_idle_connections', 5],
      ['pg_pool_waiting_requests', 2],
      ['ai_slots_in_use', 3],
      ['audio_inspection_slots_in_use', 4],
    ] as const) {
      const set = vi.fn();
      const collect = optionNamed(runtime.gaugeOptions, name).collect as (this: { set: typeof set }) => void;
      collect.call({ set });
      expect(set).toHaveBeenCalledOnce();
      expect(set).toHaveBeenCalledWith(expected);
    }

    const endTimer = vi.fn();
    runtime.startTimer.mockReturnValueOnce(endTimer);
    let close: (() => void) | undefined;
    // The mount prefix comes from the request URL, so its casing must be
    // normalized away before it becomes a label.
    const req = { method: 'POST', baseUrl: '/ApI', route: { path: '/practice' } };
    const res = {
      statusCode: 201,
      writableEnded: true,
      once: vi.fn((event: string, callback: () => void) => {
        // Only 'close' fires for aborted and socket-killed requests.
        expect(event).toBe('close');
        close = callback;
      }),
    };
    const next = vi.fn();

    httpMetricsMiddleware(req as never, res as never, next);

    expect(runtime.startTimer).toHaveBeenCalledWith({ method: 'POST' });
    expect(next).toHaveBeenCalledOnce();
    close?.();
    expect(endTimer).toHaveBeenCalledWith({ route: '/api/practice', status: '201' });
  });

  it("labels a response that never ended as 'aborted' and an unmatched request once", async () => {
    const { httpMetricsMiddleware } = await import('../src/metrics');

    const endTimer = vi.fn();
    runtime.startTimer.mockReturnValueOnce(endTimer);
    let close: (() => void) | undefined;
    // No matched route and no completed response: the client vanished while
    // the request was in flight, which must still be observed.
    const req = { method: 'GET', baseUrl: '', route: undefined };
    const res = {
      statusCode: 200,
      writableEnded: false,
      once: vi.fn((_event: string, callback: () => void) => {
        close = callback;
      }),
    };

    httpMetricsMiddleware(req as never, res as never, vi.fn());
    close?.();

    expect(endTimer).toHaveBeenCalledWith({ route: '(unmatched)', status: 'aborted' });
  });
});
