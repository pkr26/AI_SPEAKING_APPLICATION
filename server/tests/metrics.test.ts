import { randomUUID } from 'crypto';
import { EventEmitter } from 'node:events';
import fs from 'fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'path';
import { PassThrough } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Counter, Histogram } from 'prom-client';

const openaiMocks = vi.hoisted(() => ({
  transcribe: vi.fn(),
  parse: vi.fn(),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = { transcriptions: { create: openaiMocks.transcribe } };
    beta = { chat: { completions: { parse: openaiMocks.parse } } };
  },
}));

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: spawnMock };
});

import { abortInFlightAssessments, assessSpeaking, AssessQuestion } from '../src/assess';
import { verifyAudioDuration } from '../src/audio-inspection';
import { config } from '../src/config';
import { logger } from '../src/logger';
import {
  httpMetricsMiddleware,
  httpRequestDuration,
  providerCallDuration,
  providerCallErrors,
  registry,
  shedRequestsTotal,
} from '../src/metrics';
import { errorHandler } from '../src/middleware';
import { PostgresRateLimitStore } from '../src/postgres-rate-limit-store';
import { uploadsDir } from '../src/upload';
import { app, fakeM4aBuffer, pool, registerUser } from './helpers';

const QUESTION: AssessQuestion = {
  cefrLevel: 'B1',
  promptWord: 'hometown',
  questionText: 'Describe your hometown.',
};

let userId: string;
let audioPath: string;

beforeAll(async () => {
  const { res } = await registerUser(app());
  userId = res.body.user.id;
  audioPath = path.join(uploadsDir, `metrics-test-${randomUUID()}.m4a`);
  await fs.writeFile(audioPath, fakeM4aBuffer(), { mode: 0o600 });
});

afterEach(() => {
  vi.restoreAllMocks();
  openaiMocks.transcribe.mockReset();
  openaiMocks.parse.mockReset();
  spawnMock.mockReset();
});

afterAll(async () => {
  if (audioPath) await fs.rm(audioPath, { force: true });
  await pool.end();
});

async function counterValue(counter: Counter<string>, labels: Record<string, string>): Promise<number> {
  const { values } = await counter.get();
  const match = values.find((entry) => Object.entries(labels).every(([key, value]) => entry.labels[key] === value));
  return match?.value ?? 0;
}

async function histogramCount(histogram: Histogram<string>, labels: Record<string, string>): Promise<number> {
  const { values } = await histogram.get();
  const match = values.find(
    (entry) =>
      entry.metricName?.endsWith('_count') === true &&
      Object.entries(labels).every(([key, value]) => entry.labels[key] === value),
  );
  return match?.value ?? 0;
}

async function gaugeValue(name: string): Promise<number> {
  const metrics = await registry.getMetricsAsJSON();
  const metric = metrics.find((entry) => entry.name === name);
  const value = (metric as { values?: Array<{ value: number }> } | undefined)?.values?.[0]?.value;
  return value ?? 0;
}

describe('GET /metrics gating', () => {
  it('is a plain 404 while METRICS_ENABLED is off (the default)', async () => {
    expect(config.metricsEnabled).toBe(false);
    const res = await request(app()).get('/metrics');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found', code: 'NOT_FOUND' });
  });

  it('serves the Prometheus registry with no-store when enabled at app build time', async () => {
    config.metricsEnabled = true;
    try {
      const res = await request(app()).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.headers['cache-control']).toBe('no-store');
      // Application metric families and the prom-client default node metrics.
      expect(res.text).toContain('http_request_duration_seconds_bucket');
      expect(res.text).toContain('pg_pool_total_connections');
      expect(res.text).toContain('ai_slots_in_use');
      expect(res.text).toContain('audio_inspection_slots_in_use');
      expect(res.text).toContain('process_cpu_user_seconds_total');
    } finally {
      config.metricsEnabled = false;
    }
  });
});

describe('http_request_duration_seconds', () => {
  it('records the matched route pattern with method and status labels', async () => {
    const a = app();
    const labels = { method: 'GET', route: '/health', status: '200' };
    const before = await histogramCount(httpRequestDuration, labels);

    expect((await request(a).get('/health')).status).toBe(200);

    await vi.waitFor(async () => {
      expect(await histogramCount(httpRequestDuration, labels)).toBe(before + 1);
    });
  });

  it('uses router-mounted route patterns and one bounded label for unmatched requests', async () => {
    const a = app();
    const histogram = httpRequestDuration;
    const registerLabels = { method: 'POST', route: '/auth/register', status: '201' };
    const unmatchedLabels = { method: 'GET', route: '(unmatched)', status: '404' };
    const registerBefore = await histogramCount(histogram, registerLabels);
    const unmatchedBefore = await histogramCount(histogram, unmatchedLabels);

    const { res } = await registerUser(a);
    expect(res.status).toBe(201);
    expect((await request(a).get(`/no-such-route-${randomUUID()}`)).status).toBe(404);

    await vi.waitFor(async () => {
      // The raw URL must never become a label: the unmatched 404 lands on the
      // single bounded '(unmatched)' label, the register POST on its pattern.
      expect(await histogramCount(histogram, registerLabels)).toBe(registerBefore + 1);
      expect(await histogramCount(histogram, unmatchedLabels)).toBe(unmatchedBefore + 1);
    });
  });

  it('collapses case-permuted mount spellings onto the mounted route label', async () => {
    // Express routing is case-insensitive and req.baseUrl echoes the URL's own
    // casing, so an authenticated caller could otherwise walk permutations of
    // a mount and mint a new histogram child per spelling.
    const a = express();
    a.use(httpMetricsMiddleware);
    const router = express.Router();
    router.get('/stats', (_req, res) => res.json({ ok: true }));
    a.use('/casing-probe', router);
    const labels = { method: 'GET', route: '/casing-probe/stats', status: '200' };
    const before = await histogramCount(httpRequestDuration, labels);

    expect((await request(a).get('/CaSiNg-PrObE/stats')).status).toBe(200);

    await vi.waitFor(async () => {
      expect(await histogramCount(httpRequestDuration, labels)).toBe(before + 1);
    });
    const { values } = await httpRequestDuration.get();
    expect(values.filter((entry) => entry.labels.route === '/CaSiNg-PrObE/stats')).toEqual([]);
  });

  it("observes a client-aborted request under the bounded 'aborted' status", async () => {
    const labels = { method: 'GET', route: '/abort-probe', status: 'aborted' };
    const before = await histogramCount(httpRequestDuration, labels);
    const a = express();
    a.use(httpMetricsMiddleware);
    let handlerReached!: () => void;
    const reached = new Promise<void>((resolve) => {
      handlerReached = resolve;
    });
    // The handler never responds, so 'finish' never fires: only the abort's
    // 'close' can record the request that rate-limit.ts's abort guard exists
    // for, and the same is true of a requestTimeout socket kill.
    a.get('/abort-probe', () => handlerReached());
    const server = await new Promise<http.Server>((resolve) => {
      const listening = a.listen(0, () => resolve(listening));
    });
    try {
      const clientRequest = http.request({ port: (server.address() as AddressInfo).port, path: '/abort-probe' });
      clientRequest.on('error', () => undefined);
      clientRequest.end();
      await reached;
      clientRequest.destroy();

      await vi.waitFor(async () => {
        expect(await histogramCount(httpRequestDuration, labels)).toBe(before + 1);
      });
    } finally {
      // Never let a half-closed probe socket hold this suite's worker open.
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

describe('capacity slot gauges', () => {
  it('moves ai_slots_in_use while a provider call holds a slot', async () => {
    const savedMockAi = config.mockAi;
    const savedKey = config.openaiApiKey;
    config.mockAi = false;
    config.openaiApiKey = 'sk-test-key';
    let observedSignal: AbortSignal | undefined;
    openaiMocks.transcribe.mockImplementation(
      (_args: unknown, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          observedSignal = opts.signal;
          opts.signal.addEventListener('abort', () => reject(new Error('aborted by test')));
        }),
    );
    try {
      expect(await gaugeValue('ai_slots_in_use')).toBe(0);
      const inFlight = assessSpeaking(audioPath, QUESTION, userId);
      await vi.waitFor(() => expect(observedSignal).toBeInstanceOf(AbortSignal));

      expect(await gaugeValue('ai_slots_in_use')).toBe(1);

      abortInFlightAssessments();
      await expect(inFlight).rejects.toMatchObject({ status: 504, code: 'PROVIDER_TIMEOUT' });
      expect(await gaugeValue('ai_slots_in_use')).toBe(0);
    } finally {
      config.mockAi = savedMockAi;
      config.openaiApiKey = savedKey;
    }
  });

  it('moves audio_inspection_slots_in_use while a native decode holds a slot', async () => {
    class FakeChild extends EventEmitter {
      stdout = new PassThrough();
      stderr = new PassThrough();
      killed = false;
      kill = vi.fn(() => {
        this.killed = true;
        return true;
      });
    }
    const filePath = path.join(uploadsDir, `metrics-inspection-${randomUUID()}.wav`);
    await fs.writeFile(filePath, 'private test media', { mode: 0o600 });
    const probe = new FakeChild();
    const decoder = new FakeChild();
    spawnMock.mockReturnValueOnce(probe).mockReturnValueOnce(decoder);
    try {
      expect(await gaugeValue('audio_inspection_slots_in_use')).toBe(0);
      const result = verifyAudioDuration(filePath).then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason: unknown) => ({ status: 'rejected' as const, reason }),
      );
      // One audio stream passes the probe; the decoder then holds the slot.
      probe.stdout.emit('data', Buffer.from('0\n'));
      probe.emit('close', 0);
      await vi.waitFor(() => expect(spawnMock).toHaveBeenCalledTimes(2));

      expect(await gaugeValue('audio_inspection_slots_in_use')).toBe(1);

      // One second of mono 8 kHz signed 16-bit PCM completes the decode.
      decoder.stdout.emit('data', Buffer.alloc(8_000 * 2));
      decoder.emit('close', 0);
      await expect(result).resolves.toEqual({ status: 'fulfilled', value: true });
      expect(await gaugeValue('audio_inspection_slots_in_use')).toBe(0);
    } finally {
      if (!decoder.killed) {
        decoder.kill();
        decoder.emit('close', null);
      }
      await fs.unlink(filePath).catch(() => undefined);
    }
  });
});

describe('shed_requests_total', () => {
  it('counts capacity_busy when the AI semaphore rejects at capacity', async () => {
    const before = await counterValue(shedRequestsTotal, { reason: 'capacity_busy' });
    const savedConcurrency = config.aiMaxConcurrency;
    config.aiMaxConcurrency = 0;
    try {
      await expect(assessSpeaking(audioPath, QUESTION, userId)).rejects.toMatchObject({
        status: 503,
        code: 'CAPACITY_BUSY',
      });
    } finally {
      config.aiMaxConcurrency = savedConcurrency;
    }
    expect(await counterValue(shedRequestsTotal, { reason: 'capacity_busy' })).toBe(before + 1);
  });

  it('counts store_brownout when the rate-limit counter store cannot record a hit', async () => {
    const before = await counterValue(shedRequestsTotal, { reason: 'store_brownout' });
    const store = new PostgresRateLimitStore('metrics-brownout-test', 60_000);
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('database unavailable') as never);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      await expect(store.increment('learner')).rejects.toMatchObject({ status: 503, code: 'POOL_SATURATED' });
    } finally {
      warn.mockRestore();
      query.mockRestore();
    }
    expect(await counterValue(shedRequestsTotal, { reason: 'store_brownout' })).toBe(before + 1);
  });

  it('counts pool_saturated when the error handler sheds a saturated pool', async () => {
    const before = await counterValue(shedRequestsTotal, { reason: 'pool_saturated' });
    const a = express();
    a.get('/x', (_req, _res, next) => next(new Error('timeout exceeded when trying to connect')));
    a.use(errorHandler);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    try {
      const res = await request(a).get('/x');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('POOL_SATURATED');
    } finally {
      warn.mockRestore();
    }
    expect(await counterValue(shedRequestsTotal, { reason: 'pool_saturated' })).toBe(before + 1);
  });
});

describe('provider call metrics', () => {
  it('labels mock-mode assessments with outcome=mock for both call kinds', async () => {
    expect(config.mockAi).toBe(true);
    const beforeTranscription = await histogramCount(providerCallDuration, {
      kind: 'transcription',
      outcome: 'mock',
    });
    const beforeGrading = await histogramCount(providerCallDuration, { kind: 'grading', outcome: 'mock' });

    await assessSpeaking(audioPath, QUESTION, userId);

    expect(await histogramCount(providerCallDuration, { kind: 'transcription', outcome: 'mock' })).toBe(
      beforeTranscription + 1,
    );
    expect(await histogramCount(providerCallDuration, { kind: 'grading', outcome: 'mock' })).toBe(beforeGrading + 1);
  });

  it('observes ok outcomes for both calls and leaves the error counter untouched', async () => {
    const savedMockAi = config.mockAi;
    const savedKey = config.openaiApiKey;
    config.mockAi = false;
    config.openaiApiKey = 'sk-test-key';
    openaiMocks.transcribe.mockResolvedValue({ text: 'hello world' });
    openaiMocks.parse.mockResolvedValue({ choices: [{ message: { parsed: { score: 80, feedback: 'Good.' } } }] });
    const beforeTranscription = await histogramCount(providerCallDuration, { kind: 'transcription', outcome: 'ok' });
    const beforeGrading = await histogramCount(providerCallDuration, { kind: 'grading', outcome: 'ok' });
    const errorsBefore = (await providerCallErrors.get()).values.reduce((sum, { value }) => sum + value, 0);
    try {
      await expect(assessSpeaking(audioPath, QUESTION, userId)).resolves.toMatchObject({ score: 80 });
    } finally {
      config.mockAi = savedMockAi;
      config.openaiApiKey = savedKey;
    }

    expect(await histogramCount(providerCallDuration, { kind: 'transcription', outcome: 'ok' })).toBe(
      beforeTranscription + 1,
    );
    expect(await histogramCount(providerCallDuration, { kind: 'grading', outcome: 'ok' })).toBe(beforeGrading + 1);
    expect((await providerCallErrors.get()).values.reduce((sum, { value }) => sum + value, 0)).toBe(errorsBefore);
  });

  it('counts provider failures as error and provider deadlines as timeout', async () => {
    const savedMockAi = config.mockAi;
    const savedKey = config.openaiApiKey;
    config.mockAi = false;
    config.openaiApiKey = 'sk-test-key';
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const errorBefore = await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'error' });
    const timeoutBefore = await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'timeout' });
    try {
      openaiMocks.transcribe.mockRejectedValue(new Error('socket hangup'));
      await expect(assessSpeaking(audioPath, QUESTION, userId)).rejects.toMatchObject({ status: 502 });
      expect(await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'error' })).toBe(errorBefore + 1);
      expect(await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'timeout' })).toBe(timeoutBefore);

      openaiMocks.transcribe.mockRejectedValue(
        Object.assign(new Error('timed out'), { name: 'APIConnectionTimeoutError' }),
      );
      await expect(assessSpeaking(audioPath, QUESTION, userId)).rejects.toMatchObject({ status: 504 });
      expect(await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'error' })).toBe(errorBefore + 1);
      expect(await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'timeout' })).toBe(
        timeoutBefore + 1,
      );
    } finally {
      warn.mockRestore();
      config.mockAi = savedMockAi;
      config.openaiApiKey = savedKey;
    }

    expect(await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'error' })).toBe(errorBefore + 1);
    expect(await counterValue(providerCallErrors, { kind: 'transcription', outcome: 'timeout' })).toBe(
      timeoutBefore + 1,
    );
    expect(await histogramCount(providerCallDuration, { kind: 'transcription', outcome: 'error' })).toBeGreaterThan(0);
    expect(await histogramCount(providerCallDuration, { kind: 'transcription', outcome: 'timeout' })).toBeGreaterThan(
      0,
    );
  });
});
