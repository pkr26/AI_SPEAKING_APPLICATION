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
import { assertDatabaseSchemaCurrent } from './schema-readiness';
import { assertAudioInspectorAvailable } from './audio-inspection';

const app = createApp();
const server = createServer(app);

// A nonzero hop count is only safe behind a proxy chain that strips
// client-supplied forwarding headers on exactly this many hops.
if (config.trustProxy) {
  logger.warn(
    { trustProxy: config.trustProxy },
    'TRUST_PROXY is set: the hop count must exactly match the deployment proxy chain; if this port is reachable directly, clients can spoof X-Forwarded-For to reset per-IP rate-limit budgets',
  );
}

// The whole-request budget must exceed the slowest legitimate assessment
// chain (S3 download + decode inspection + one provider deadline) plus upload
// ingress margin, or worst-case requests are socket-killed mid-flight.
server.requestTimeout = config.s3.operationTimeoutMs + config.openaiTimeoutMs + 40_000;
server.headersTimeout = 30_000;

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
];

let janitorTimers: NodeJS.Timeout[] | undefined;

function runJanitor(definition: JanitorDefinition): void {
  void definition
    .cleanup()
    .then((removed) => {
      janitorRemovedTotal.inc({ janitor: definition.janitor }, removed);
      if (removed > 0) logger.info({ removed }, definition.successMessage);
    })
    .catch((err) => logger.warn({ err }, definition.failureMessage));
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

let shuttingDown = false;

function clearJanitors() {
  const timers = janitorTimers;
  janitorTimers = undefined;
  if (!timers) return;
  for (const timer of timers) clearInterval(timer);
}

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearJanitors();
  logger.info({ signal }, 'shutting down');

  // Hard stop if the drain takes too long. SHUTDOWN_DRAIN_MS defaults above
  // the whole-request budget (server.requestTimeout) so the slowest
  // legitimate in-flight assessment can still finish before the force exit.
  const forceTimer = setTimeout(() => {
    logger.error('graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, config.shutdownDrainMs);
  forceTimer.unref();

  const finishShutdown = (err?: Error) => {
    if (err) logger.error({ err }, 'error closing HTTP server');
    pool
      .end()
      .then(() => {
        clearTimeout(forceTimer);
        logger.info('shutdown complete');
        process.exit(err ? 1 : 0);
      })
      .catch((poolErr) => {
        clearTimeout(forceTimer);
        logger.error({ err: poolErr }, 'error closing pg pool');
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
  // Abort in-flight provider calls so paid work dies fast and each route
  // unwinds through its normal timeout path, abandoning its idempotency claim.
  abortInFlightAssessments();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
      logger.error(
        { dbPoolMax: config.dbPoolMax, maxConnections },
        'DB_POOL_MAX leaves fewer than 3 database connections for admin, migration, and readiness clients; reduce DB_POOL_MAX or raise max_connections',
      );
    }
  } catch (err) {
    logger.warn({ err }, 'could not verify DB_POOL_MAX against server max_connections');
  }
}

// Refuse traffic until the release schema and required media inspector are
// ready. The same dependency checks back /ready for post-start drift/failure.
Promise.all([assertDatabaseSchemaCurrent(), assertAudioInspectorAvailable({ force: true })])
  .then(async () => {
    if (shuttingDown) return;
    await warnIfPoolOversized();
    if (shuttingDown) return;
    startJanitors();
    server.listen(config.port, () => {
      logger.info({ port: config.port, mockAi: config.mockAi, nodeEnv: config.nodeEnv }, 'AI English API listening');
    });
  })
  .catch((err) => {
    if (shuttingDown) return;
    shuttingDown = true;
    clearJanitors();
    logger.fatal({ err }, 'required service dependency is unavailable; refusing to start');
    pool
      .end()
      .catch((poolErr) => logger.error({ err: poolErr }, 'error closing pg pool after dependency startup failure'))
      .finally(() => process.exit(1));
  });
