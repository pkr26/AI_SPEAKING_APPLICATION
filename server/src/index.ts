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

const UPLOAD_JANITOR_INTERVAL_MS = 900_000;
const DATABASE_JANITOR_INTERVAL_MS = 3_600_000;

interface JanitorDefinition {
  /** Stable metric label for janitor_removed_total (metrics.ts). */
  janitor: string;
  cleanup: () => Promise<number>;
  intervalMs: number;
  successMessage: string;
  failureMessage: string;
}

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

let janitorTimers: NodeJS.Timeout[] | undefined;
const runningJanitors = new Set<JanitorDefinition>();
let shuttingDown = false;

type LifecycleLogPayload = Record<string, unknown> | string;

function logLifecycleInfo(payload: LifecycleLogPayload, message?: string): void {
  try {
    if (message === undefined) logger.info(payload);
    else logger.info(payload, message);
  } catch {
    // Logging is observational; it must never become lifecycle control flow.
  }
}

function logLifecycleWarning(payload: LifecycleLogPayload, message: string): void {
  try {
    logger.warn(payload, message);
  } catch {
    // Logging is observational; it must never become lifecycle control flow.
  }
}

function logLifecycleFatal(payload: LifecycleLogPayload, message: string): void {
  try {
    logger.fatal(payload, message);
  } catch {
    // Fatal draining/exiting below remains authoritative.
  }
}

function logJanitorFailure(definition: JanitorDefinition, err: unknown): void {
  logLifecycleWarning({ err }, definition.failureMessage);
}

function logShutdownError(payload: LifecycleLogPayload, message?: string): void {
  try {
    if (message === undefined) logger.error(payload);
    else logger.error(payload, message);
  } catch {
    // Exiting is authoritative. A failed logger must never suppress a forced
    // exit or turn a contained pool rejection into an unhandled rejection.
  }
}

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
// raw uncaught exception. Route it through the same fatal log + pool drain as
// every other startup failure; the shuttingDown guard keeps a shutdown-time
// socket error from double-exiting.
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
  shuttingDown = true;
  clearJanitors();
  abortInFlightAssessments({ preventNew: true });
  drainPoolAfterFatal('error closing pg pool after HTTP server failure');
  logLifecycleFatal({ err }, 'HTTP server failed');
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
    if (shuttingDown) return;
    shuttingDown = true;
    clearJanitors();
    abortInFlightAssessments({ preventNew: true });
    drainPoolAfterFatal('error closing pg pool after dependency startup failure');
    logLifecycleFatal({ err }, 'required service dependency is unavailable; refusing to start');
  });
