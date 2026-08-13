import { createServer } from 'http';
import { config } from './config';
import { createApp } from './app';
import { pool } from './db';
import { logger } from './logger';
import { cleanupAssessmentRequests } from './idempotency';
import { cleanupOldUploads } from './upload';
import { cleanupRateLimitWindows } from './postgres-rate-limit-store';
import { assertDatabaseSchemaCurrent } from './schema-readiness';
import { assertAudioInspectorAvailable } from './audio-inspection';

const app = createApp();
const server = createServer(app);

server.requestTimeout = 75_000;
server.headersTimeout = 30_000;

const UPLOAD_JANITOR_INTERVAL_MS = 15 * 60 * 1000;
const DATABASE_JANITOR_INTERVAL_MS = 60 * 60 * 1000;

interface JanitorDefinition {
  cleanup: () => Promise<number>;
  intervalMs: number;
  successMessage: string;
  failureMessage: string;
}

const janitorDefinitions: JanitorDefinition[] = [
  {
    cleanup: cleanupOldUploads,
    intervalMs: UPLOAD_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed stale uploads',
    failureMessage: 'upload janitor failed',
  },
  {
    cleanup: cleanupAssessmentRequests,
    intervalMs: DATABASE_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed expired assessment replays',
    failureMessage: 'assessment replay janitor failed',
  },
  {
    cleanup: cleanupRateLimitWindows,
    intervalMs: DATABASE_JANITOR_INTERVAL_MS,
    successMessage: 'janitor removed expired rate-limit counters',
    failureMessage: 'rate-limit janitor failed',
  },
];

let janitorTimers: NodeJS.Timeout[] = [];

function runJanitor(definition: JanitorDefinition): void {
  void definition
    .cleanup()
    .then((removed) => {
      if (removed > 0) logger.info({ removed }, definition.successMessage);
    })
    .catch((err) => logger.warn({ err }, definition.failureMessage));
}

function startJanitors(): void {
  if (janitorTimers.length > 0) return;
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
  for (const timer of janitorTimers) clearInterval(timer);
  janitorTimers = [];
}

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearJanitors();
  logger.info({ signal }, 'shutting down');

  // Hard stop if graceful shutdown takes too long.
  const forceTimer = setTimeout(() => {
    logger.error('graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
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
  if (server.listening) server.close(finishShutdown);
  else finishShutdown();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Refuse traffic until the release schema and required media inspector are
// ready. The same dependency checks back /ready for post-start drift/failure.
Promise.all([assertDatabaseSchemaCurrent(), assertAudioInspectorAvailable({ force: true })])
  .then(() => {
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
