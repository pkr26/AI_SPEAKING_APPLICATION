import { config } from './config';
import { createApp } from './app';
import { pool } from './db';
import { logger } from './logger';
import { cleanupAssessmentRequests } from './idempotency';
import { cleanupOldUploads } from './upload';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, mockAi: config.mockAi, nodeEnv: config.nodeEnv }, 'AI English API listening');
});

server.requestTimeout = 75_000;
server.headersTimeout = 30_000;

// Boot-time janitor: drop orphaned uploads older than 1h (fire-and-forget).
cleanupOldUploads()
  .then((removed) => {
    if (removed > 0) logger.info({ removed }, 'janitor removed stale uploads');
  })
  .catch((err) => logger.warn({ err }, 'upload janitor failed'));

cleanupAssessmentRequests()
  .then((removed) => {
    if (removed > 0) logger.info({ removed }, 'janitor removed expired assessment replays');
  })
  .catch((err) => logger.warn({ err }, 'assessment replay janitor failed'));

// Keep cleaning orphaned files in long-running processes; boot-only cleanup
// leaves aborted/crashed requests on disk indefinitely until the next deploy.
const uploadJanitor = setInterval(
  () =>
    cleanupOldUploads()
      .then((removed) => {
        if (removed > 0) logger.info({ removed }, 'janitor removed stale uploads');
      })
      .catch((err) => logger.warn({ err }, 'upload janitor failed')),
  15 * 60 * 1000,
);
uploadJanitor.unref();

const assessmentReplayJanitor = setInterval(
  () =>
    cleanupAssessmentRequests()
      .then((removed) => {
        if (removed > 0) logger.info({ removed }, 'janitor removed expired assessment replays');
      })
      .catch((err) => logger.warn({ err }, 'assessment replay janitor failed')),
  60 * 60 * 1000,
);
assessmentReplayJanitor.unref();

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(uploadJanitor);
  clearInterval(assessmentReplayJanitor);
  logger.info({ signal }, 'shutting down');

  // Hard stop if graceful shutdown takes too long.
  const forceTimer = setTimeout(() => {
    logger.error('graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  server.close((err) => {
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
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
