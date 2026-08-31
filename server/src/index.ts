import { createServer } from 'http';
import { config } from './config';
import { createApp } from './app';
import { abortInFlightAssessments, cleanupAssessmentUsage } from './assess';
import { cleanupPasswordResetTokens } from './auth';
import { pool } from './db';
import { logger } from './logger';
import { cleanupAssessmentRequests } from './idempotency';
import { janitorRemovedTotal } from './metrics';
import { cleanupOldUploads } from './upload';
import { cleanupRateLimitWindows } from './postgres-rate-limit-store';
import { runRecordingMaintenance } from './recordings';
import { assertDatabaseSchemaCurrent } from './schema-readiness';
import { assertAudioInspectorAvailable } from './audio-inspection';
import { assertRetainedAudioStorageAvailable } from './audio-upload';
import { installSlowClientGuards } from './slow-client-guard';

// Build the express app and HTTP server eagerly, but listen() only runs after
// the startup dependency checks below pass: a process whose schema, media
// inspector, or storage gate failed must never accept a single request.
const app = createApp();
const server = createServer(app);
// Bound two slow-client stall shapes Node's own HTTP timeouts miss (a socket
// parked mid-header-line fires neither headersTimeout nor requestTimeout).
// Registered before listen() so no accepted connection can miss the guards.
installSlowClientGuards(server);

// A nonzero hop count is only safe behind a proxy chain that strips
// client-supplied forwarding headers on exactly this many hops.
if (config.trustProxy) {
  logLifecycleWarning(
    { trustProxy: config.trustProxy },
    'TRUST_PROXY is set: the hop count must exactly match the deployment proxy chain; if this port is reachable directly, clients can spoof X-Forwarded-For to reset per-IP rate-limit budgets',
  );
}

// A developer .env with real S3 buckets silently flips local smoke/test runs
// into S3 ingress mode (the smoke journey expects the direct-upload flow).
if (!config.isProduction && config.s3.diagnostic.bucket && config.s3.practice.bucket) {
  logLifecycleWarning(
    { diagnosticBucket: config.s3.diagnostic.bucket, practiceBucket: config.s3.practice.bucket },
    'S3 audio ingress is enabled on a non-production server: submissions will use presigned uploads against those buckets, and the documented smoke recipe needs them blanked',
  );
}

// The whole-request budget must exceed the slowest legitimate assessment
// chain (S3 download + decode inspection + one provider deadline) plus upload
// ingress margin, or worst-case requests are socket-killed mid-flight.
server.requestTimeout = config.s3.operationTimeoutMs + config.openaiTimeoutMs + 40_000;
server.headersTimeout = 30_000;
// Node's 5s keep-alive default is shorter than every common fronting proxy's
// idle timeout (AWS ALB defaults to 60s), so the balancer keeps reusing a
// connection this process is closing at the same moment and the mobile app
// sees a sporadic 502/ECONNRESET. Outlive the proxy instead. Deliberately
// above headersTimeout: Node measures header time from the first byte of each
// request, not across an idle keep-alive gap, so the 30s slow-header guard is
// unaffected, and shutdown severs idle sockets explicitly
// (closeIdleConnections) so a longer keep-alive cannot pin the drain open.
server.keepAliveTimeout = 65_000;

// Uploads sweep the local disk four times as often as the database janitors:
// orphaned multipart files are pure disk waste, while DB cleanups are bounded
// batched deletes that tolerate the slower cadence.
const UPLOAD_JANITOR_INTERVAL_MS = 900_000;
const DATABASE_JANITOR_INTERVAL_MS = 3_600_000;

/** One periodic cleanup job: what to run, how often, and how to log either outcome. */
interface JanitorDefinition {
  /** Stable metric label for janitor_removed_total (metrics.ts). */
  janitor: string;
  cleanup: () => Promise<number>;
  intervalMs: number;
  successMessage: string;
  failureMessage: string;
}

/**
 * The complete janitor schedule — every periodic cleanup must be registered
 * here so shutdown clears its timer and its removals reach the
 * janitor_removed_total metric. `cleanup` resolves the number of rows/files
 * removed; a 0 (quiet tick) is counted but never logged.
 */
const janitorDefinitions: JanitorDefinition[] = [
  {
    janitor: 'uploads',
    cleanup: cleanupOldUploads,
    intervalMs: UPLOAD_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed stale uploads',
    failureMessage: 'upload janitor failed',
  },
  {
    janitor: 'assessment-requests',
    cleanup: cleanupAssessmentRequests,
    intervalMs: DATABASE_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed expired assessment replays',
    failureMessage: 'assessment replay janitor failed',
  },
  {
    janitor: 'rate-limit-windows',
    cleanup: cleanupRateLimitWindows,
    intervalMs: DATABASE_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed expired rate-limit counters',
    failureMessage: 'rate-limit janitor failed',
  },
  {
    janitor: 'assessment-usage',
    cleanup: cleanupAssessmentUsage,
    intervalMs: DATABASE_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed expired assessment reservations',
    failureMessage: 'assessment usage janitor failed',
  },
  {
    janitor: 'password-reset-tokens',
    cleanup: cleanupPasswordResetTokens,
    intervalMs: DATABASE_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed expired password reset tokens',
    failureMessage: 'password reset token janitor failed',
  },
  {
    janitor: 'recordings',
    cleanup: runRecordingMaintenance,
    intervalMs: config.recordings.maintenanceIntervalMs,
    successMessage: 'recording maintenance removed completed deletion tombstones',
    failureMessage: 'recording maintenance failed',
  },
];

// Janitor scheduler state. `shuttingDown` is the one-shot latch every exit
// path (signal, server error, dependency failure) sets before clearing
// timers; `runningJanitors` is runJanitor's per-job overlap guard.
let janitorTimers: NodeJS.Timeout[] | undefined;
const runningJanitors = new Set<JanitorDefinition>();
let shuttingDown = false;

/** A lifecycle log's payload: a structured pino object or a bare message string. */
type LifecycleLogPayload = Record<string, unknown> | string;

/**
 * Info-level lifecycle log that never throws: logging is observational and
 * must not become startup/shutdown control flow when the logger itself fails.
 */
function logLifecycleInfo(payload: LifecycleLogPayload, message?: string): void {
  try {
    if (message === undefined) logger.info(payload);
    else logger.info(payload, message);
  } catch {
    // Logging is observational; it must never become lifecycle control flow.
  }
}

/**
 * Warning-level lifecycle log with the same swallow rule: startup advisories
 * (trust proxy, non-production S3) must never crash the process they warn.
 */
function logLifecycleWarning(payload: LifecycleLogPayload, message: string): void {
  try {
    logger.warn(payload, message);
  } catch {
    // Logging is observational; it must never become lifecycle control flow.
  }
}

/**
 * Fatal-level lifecycle log. The caller's exit/drain sequencing stays
 * authoritative even when the logger is the component that broke.
 */
function logLifecycleFatal(payload: LifecycleLogPayload, message: string): void {
  try {
    logger.fatal(payload, message);
  } catch {
    // Fatal draining/exiting below remains authoritative.
  }
}

/** Report one failed janitor tick at warn level; janitors never crash the process. */
function logJanitorFailure(definition: JanitorDefinition, err: unknown): void {
  logLifecycleWarning({ err }, definition.failureMessage);
}

/**
 * Error-level shutdown-path log. Swallowing logger failures here is what
 * keeps the forced exit reachable and a contained pool rejection from
 * becoming an unhandled rejection during teardown.
 */
function logShutdownError(payload: LifecycleLogPayload, message?: string): void {
  try {
    if (message === undefined) logger.error(payload);
    else logger.error(payload, message);
  } catch {
    // Exiting is authoritative. A failed logger must never suppress a forced
    // exit or turn a contained pool rejection into an unhandled rejection.
  }
}

/**
 * Run a single janitor tick without ever overlapping the same janitor or
 * starting new work after shutdown has begun (entry-guard rationale inline).
 * The resolved removal count feeds janitor_removed_total; only non-zero
 * sweeps are logged, and a synchronous throw from `cleanup` is caught so the
 * interval keeps firing.
 */
function runJanitor(definition: JanitorDefinition): void {
  // setInterval does not wait for an async callback. Keep one local invocation
  // per janitor so a slow filesystem sweep cannot overlap itself, and so a
  // timer callback already queued when shutdown begins cannot start new work.
  if (shuttingDown || runningJanitors.has(definition)) return;
  runningJanitors.add(definition);
  let cleanup: Promise<number>;
  try {
    cleanup = definition.cleanup();
  } catch (err) {
    runningJanitors.delete(definition);
    logJanitorFailure(definition, err);
    return;
  }
  void cleanup
    .then((removed) => {
      janitorRemovedTotal.inc({ janitor: definition.janitor }, removed);
      if (removed > 0) logLifecycleInfo({ removed }, definition.successMessage);
    })
    .catch((err) => logJanitorFailure(definition, err))
    .finally(() => runningJanitors.delete(definition));
}

/**
 * Schedule every janitor: one immediate tick right after the startup
 * dependency checks pass (rationale inline), then an unref'd interval per
 * definition so no janitor timer can hold the event loop open by itself.
 */
function startJanitors(): void {
  janitorTimers = janitorDefinitions.map((definition) => {
    // The first cleanup happens only after startup dependencies pass. Failed
    // processes never mutate storage/database state while refusing traffic.
    runJanitor(definition);
    const timer = setInterval(() => runJanitor(definition), definition.intervalMs);
    timer.unref();
    return timer;
  });
}

/** Idempotently stop every janitor timer; safe on any exit path, even pre-start. */
function clearJanitors() {
  const timers = janitorTimers;
  janitorTimers = undefined;
  if (!timers) return;
  for (const timer of timers) clearInterval(timer);
}

/**
 * Fatal paths cannot trust an unbounded pool drain: a leaked checkout would
 * otherwise leave a failed process alive forever and prevent the supervisor
 * from replacing it. Preserve the pool error log when available, but force one
 * failed exit at the same configured upper bound as graceful shutdown.
 */
function drainPoolAfterFatal(poolFailureMessage: string): void {
  let exited = false;
  /** Exit exactly once — whichever of force timer or pool completion fires first. */
  function exitOnce(timedOut: boolean): void {
    if (exited) return;
    exited = true;
    clearTimeout(forceTimer);
    if (timedOut) logShutdownError('fatal shutdown timed out — forcing exit');
    process.exit(1);
  }

  const forceTimer = setTimeout(() => exitOnce(true), config.shutdownDrainMs);
  void pool
    .end()
    .catch((poolErr) => logShutdownError({ err: poolErr }, poolFailureMessage))
    .finally(() => exitOnce(false));
}

/**
 * The one fatal exit path every non-signal failure funnels through (HTTP
 * server error, startup dependency failure, unhandled rejection/exception):
 * latch the one-shot shutdown state so re-entrant or late callers cannot
 * double-drain, freeze the janitor schedule, latch the provider gate before
 * touching the pool so no in-flight assessment escapes the abort sweep or
 * starts new paid work on a failed process, then drain the pool on the same
 * bounded force-exit budget as graceful shutdown and log the fatal reason.
 */
function fatalShutdown(err: unknown, message: string, poolFailureMessage: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  clearJanitors();
  abortInFlightAssessments({ preventNew: true });
  drainPoolAfterFatal(poolFailureMessage);
  logLifecycleFatal({ err }, message);
}

/**
 * One-shot graceful shutdown for SIGTERM/SIGINT (repeat signals are ignored).
 * Ordering is load-bearing: freeze the janitor schedule, latch the provider
 * gate before touching sockets or the pool so no in-flight assessment escapes
 * the abort sweep, then close the HTTP server — severing idle keep-alives so
 * they cannot pin the drain — and finally the pg pool. A force timer bounds
 * the whole drain at SHUTDOWN_DRAIN_MS (kept above the worst-case request
 * budget by config), and the exit status is 0 unless a close itself failed.
 */
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearJanitors();
  // Latch the provider gate before touching sockets or the pool. An accepted
  // request may still be between audio inspection and provider registration;
  // the latch prevents it from escaping this one-time controller sweep.
  abortInFlightAssessments({ preventNew: true });

  // Hard stop if the drain takes too long. SHUTDOWN_DRAIN_MS defaults above
  // the whole-request budget (server.requestTimeout) so the slowest
  // legitimate in-flight assessment can still finish before the force exit.
  const forceTimer = setTimeout(() => {
    logShutdownError('graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, config.shutdownDrainMs);
  forceTimer.unref();
  logLifecycleInfo({ signal }, 'shutting down');

  /** Last drain step: close the pool, then exit with the server-close outcome. */
  const finishShutdown = (err?: Error) => {
    if (err) logShutdownError({ err }, 'error closing HTTP server');
    pool
      .end()
      .then(() => {
        clearTimeout(forceTimer);
        logLifecycleInfo('shutdown complete');
        process.exit(err ? 1 : 0);
      })
      .catch((poolErr) => {
        clearTimeout(forceTimer);
        logShutdownError({ err: poolErr }, 'error closing pg pool');
        process.exit(1);
      });
  };

  // A signal can arrive while dependency checks are still running and before
  // listen(). Calling close() on that state reports ERR_SERVER_NOT_RUNNING,
  // which is not a shutdown failure and should not turn a normal deploy into
  // exit status 1.
  if (server.listening) {
    server.close(finishShutdown);
    // Sever idle keep-alive sockets immediately so they cannot pin the drain
    // open; active requests keep their connection until they respond.
    server.closeIdleConnections();
  } else {
    finishShutdown();
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A listen failure (EADDRINUSE, a refused bind) would otherwise crash with a
// raw uncaught exception. Route it through the shared fatal path; the
// shuttingDown guard inside keeps a shutdown-time socket error from
// double-exiting.
server.on('error', (err) => {
  if (shuttingDown) return;
  // Node emits this same event for a single failed accept() (EMFILE/ENFILE
  // under descriptor pressure) on a server that stays listening and keeps
  // serving. Losing that one connection is recoverable; exiting here would
  // reset every in-flight request without the SHUTDOWN_DRAIN_MS drain the
  // signal path grants them — including paid assessments that already spent
  // provider money and a daily-capacity reservation.
  if (server.listening && (err as NodeJS.ErrnoException).syscall === 'accept') {
    logShutdownError({ err }, 'accept failed; dropped one incoming connection');
    return;
  }
  fatalShutdown(err, 'HTTP server failed', 'error closing pg pool after HTTP server failure');
});

// Node's default for an unhandled rejection or uncaught exception is a raw
// crash with no drain at all. Route both through the same fatal path as a
// server 'error' — janitors stop, in-flight paid assessments abort, the pool
// drains on the bounded budget, the failure reaches the pino log, and the
// process exits with failure once the drain settles — instead of a divergent
// shutdown path. The one-shot latch inside fatalShutdown keeps double-calls
// and races with an already-draining shutdown safe.
process.on('unhandledRejection', (reason) => {
  fatalShutdown(reason, 'unhandled promise rejection', 'error closing pg pool after unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  fatalShutdown(err, 'uncaught exception', 'error closing pg pool after uncaught exception');
});

/**
 * Operational guardrail: a pool that can consume every server connection locks
 * out readiness probes, migrations, and admin clients (observed as
 * `FATAL: too many clients` during a 1000-user load run with DB_POOL_MAX=100
 * against a stock max_connections=100 server). Loud but never fatal: managed
 * PostgreSQL and poolers can legitimately report surprising numbers.
 */
async function warnIfPoolOversized(): Promise<void> {
  try {
    const { rows } = await pool.query<{ max_connections: string }>('SHOW max_connections');
    const maxConnections = Number(rows[0].max_connections);
    if (Number.isInteger(maxConnections) && maxConnections > 0 && config.dbPoolMax > maxConnections - 3) {
      logShutdownError(
        { dbPoolMax: config.dbPoolMax, maxConnections },
        'DB_POOL_MAX leaves fewer than 3 database connections for admin, migration, and readiness clients; reduce DB_POOL_MAX or raise max_connections',
      );
    }
  } catch (err) {
    logLifecycleWarning({ err }, 'could not verify DB_POOL_MAX against server max_connections');
  }
}

// Refuse traffic until the release schema and required media inspector are
// ready. The same dependency checks back /ready for post-start drift/failure.
Promise.all([
  assertDatabaseSchemaCurrent(),
  assertAudioInspectorAvailable({ force: true }),
  assertRetainedAudioStorageAvailable({ force: true }),
])
  .then(async () => {
    if (shuttingDown) return;
    await warnIfPoolOversized();
    if (shuttingDown) return;
    startJanitors();
    server.listen(config.port, () => {
      logLifecycleInfo(
        { port: config.port, mockAi: config.mockAi, nodeEnv: config.nodeEnv },
        'AI English API listening',
      );
    });
  })
  .catch((err) => {
    fatalShutdown(
      err,
      'required service dependency is unavailable; refusing to start',
      'error closing pg pool after dependency startup failure',
    );
  });
