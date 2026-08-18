import type { RequestHandler } from 'express';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';
import { getAiSlotsInUse } from './assess';
import { getAudioInspectionSlotsInUse } from './audio-inspection';
import { pool } from './db';

/**
 * Process-wide Prometheus registry. All application metrics register here (a
 * dedicated registry keeps test files isolated per worker and avoids the
 * global default registry's cross-import surprises). GET /metrics serves it
 * only when METRICS_ENABLED=true; the endpoint is for private scraping.
 */
export const registry = new Registry();

collectDefaultMetrics({ register: registry });

/**
 * HTTP request latency. The route label is the matched Express route pattern
 * (lower-cased req.baseUrl + req.route.path), never the raw URL, so label
 * cardinality stays bounded; requests that end before a route matches (404s,
 * limiter and version-gate rejections) share the single '(unmatched)' label,
 * and requests that never produced a response share the single 'aborted'
 * status. The top bucket tracks the 130s worst-case request budget (index.ts).
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds by method, matched route pattern, and status code',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 130],
  registers: [registry],
});

export const httpMetricsMiddleware: RequestHandler = (req, res, next) => {
  const endTimer = httpRequestDuration.startTimer({ method: req.method });
  // 'close', not 'finish': a client abort or a requestTimeout socket kill only
  // ever emits 'close', while a normal response emits it right after 'finish'.
  // Timing here is therefore the only hook that observes every request,
  // including the timeout tail the 130s top bucket exists to expose.
  res.once('close', () => {
    const routePath = (req.route as { path?: unknown } | undefined)?.path;
    // req.route.path is a pattern, but req.baseUrl is the matched slice of the
    // real URL and Express routing is case-insensitive, so a caller walking
    // case permutations of a mount ('/PrAcTiCe/stats') would otherwise mint a
    // fresh histogram child per spelling. A match can only differ from its
    // mount pattern by case, so lower-casing it fully restores the bound.
    const route = routePath === undefined ? '(unmatched)' : `${req.baseUrl.toLowerCase()}${String(routePath)}`;
    // A response that never ended carries a status no client ever saw; one
    // 'aborted' label keeps that tail visible without unbounded cardinality.
    endTimer({ route, status: res.writableEnded ? String(res.statusCode) : 'aborted' });
  });
  next();
};

// --- PostgreSQL pool gauges --------------------------------------------------
// Collected on scrape from pg-pool's live counters; per-process values.
new Gauge({
  name: 'pg_pool_total_connections',
  help: 'PostgreSQL clients currently owned by this process pool (idle + checked out)',
  registers: [registry],
  collect() {
    this.set(pool.totalCount ?? 0);
  },
});

new Gauge({
  name: 'pg_pool_idle_connections',
  help: 'PostgreSQL clients sitting idle in this process pool',
  registers: [registry],
  collect() {
    this.set(pool.idleCount ?? 0);
  },
});

new Gauge({
  name: 'pg_pool_waiting_requests',
  help: 'Checkout requests queued because every pool client is busy',
  registers: [registry],
  collect() {
    this.set(pool.waitingCount ?? 0);
  },
});

// --- capacity-slot gauges ----------------------------------------------------
// Read on scrape through the accessors the owning modules export, so the
// semaphore counters themselves stay private to assess.ts/audio-inspection.ts.
new Gauge({
  name: 'ai_slots_in_use',
  help: 'Paid AI assessments currently holding a concurrency slot on this process (cap: AI_MAX_CONCURRENCY)',
  registers: [registry],
  collect() {
    this.set(getAiSlotsInUse());
  },
});

new Gauge({
  name: 'audio_inspection_slots_in_use',
  help: 'Native audio inspections currently holding a decoder slot on this process (cap: AUDIO_INSPECTION_MAX_CONCURRENCY)',
  registers: [registry],
  collect() {
    this.set(getAudioInspectionSlotsInUse());
  },
});

// --- provider call metrics ---------------------------------------------------
export type ProviderCallKind = 'transcription' | 'grading';

/**
 * Provider call outcomes: 'ok', 'timeout' (deadline/shutdown abort), 'error'
 * (any other provider failure), or 'mock' (MOCK_AI simulated the call — kept
 * so dev/staging dashboards still show assessment traffic).
 */
export const providerCallDuration = new Histogram({
  name: 'provider_call_duration_seconds',
  help: 'OpenAI provider call duration in seconds by call kind and outcome',
  labelNames: ['kind', 'outcome'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 130],
  registers: [registry],
});

export const providerCallErrors = new Counter({
  name: 'provider_call_errors_total',
  help: 'Failed OpenAI provider calls by call kind and outcome',
  labelNames: ['kind', 'outcome'] as const,
  registers: [registry],
});

// --- load-shedding counter ---------------------------------------------------
/**
 * Requests shed by a backpressure guard before doing their work:
 *   pool_saturated — pg-pool checkout timed out (errorHandler's 503 branch);
 *   store_brownout — the rate-limit counter store could not record a hit;
 *   capacity_busy  — the per-process AI concurrency semaphore was full.
 */
export const shedRequestsTotal = new Counter({
  name: 'shed_requests_total',
  help: 'Requests shed by backpressure guards, by reason',
  labelNames: ['reason'] as const,
  registers: [registry],
});

// --- janitor counter -----------------------------------------------------------
/** Rows/files removed per janitor tick; incremented by index.ts's scheduler. */
export const janitorRemovedTotal = new Counter({
  name: 'janitor_removed_total',
  help: 'Records removed by periodic janitors, by janitor',
  labelNames: ['janitor'] as const,
  registers: [registry],
});
