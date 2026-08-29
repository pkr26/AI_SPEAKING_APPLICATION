import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createAuthRouter } from './auth';
import { createClientConfigRouter } from './client-config';
import { assertAudioInspectorAvailable } from './audio-inspection';
import { assertRetainedAudioStorageAvailable, createAudioUploadRouter } from './audio-upload';
import { config } from './config';
import { createDiagnosticRouter } from './diagnostic';
import { httpLogger, logger } from './logger';
import { getAssessmentRequestStatus } from './idempotency';
import { httpMetricsMiddleware, registry } from './metrics';
import { AuthedRequest, clientVersionGate, errorHandler, h, HttpError, requireAuth, validate } from './middleware';
import { z } from 'zod';
import { createPracticeRouter } from './practice';
import { buildLimiters } from './rate-limit';
import { createRecordingsRouter } from './recordings';
import { assertDatabaseSchemaCurrent } from './schema-readiness';

interface AppDependencies {
  schemaCheck?: () => Promise<unknown>;
  audioInspectorCheck?: () => Promise<unknown>;
  recordingStorageCheck?: () => Promise<unknown>;
}

export function createApp({
  schemaCheck = assertDatabaseSchemaCurrent,
  audioInspectorCheck = assertAudioInspectorAvailable,
  recordingStorageCheck = assertRetainedAudioStorageAvailable,
}: AppDependencies = {}) {
  const app = express();

  // Use the exact configured hop count. Express warns against `true`, which
  // would trust an attacker-supplied forwarding chain and bypass IP limits.
  app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(httpLogger);
  // Time every request (including limiter/gate rejections) with bounded route
  // labels; see metrics.ts for the label contract.
  app.use(httpMetricsMiddleware);

  // Allowlist CORS: requests without an Origin header (mobile apps, curl)
  // pass; browser origins must be listed in CORS_ORIGINS. No credentials.
  const allowedOrigins = new Set(config.corsOrigins);
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowedOrigins.has(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: false,
    }),
  );

  // Outdated, version-less, or malformed clients (per MIN_CLIENT_VERSION) get
  // a cheap deterministic 426 before budget/parsing work. Operational probes
  // and the explicit privacy/account exits are exempt in middleware.ts.
  app.use(clientVersionGate);

  const limiters = buildLimiters();

  // Liveness stays cheap and independent of external services.
  app.get('/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true });
  });
  app.get('/ready', limiters.readiness, async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      await Promise.all([schemaCheck(), audioInspectorCheck(), recordingStorageCheck()]);
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, 'readiness dependency check failed');
      res.status(503).json({ ok: false, error: 'required service dependency unavailable', code: 'INTERNAL' });
    }
  });

  // Prometheus scrape endpoint, resolved at app build time (tests flip
  // config.metricsEnabled before creating the app). Disabled deployments fall
  // through to the terminal JSON 404 below. Mounted with /health and /ready,
  // before the global limiter, so a private scraper cannot be starved by a
  // saturated per-IP budget; METRICS_ENABLED deployments must only expose the
  // route to a private scrape network.
  if (config.metricsEnabled) {
    app.get(
      '/metrics',
      h(async (_req, res) => {
        res.set('Cache-Control', 'no-store');
        res.set('Content-Type', registry.contentType);
        res.send(await registry.metrics());
      }),
    );
  }

  // Reject over-budget requests before any shared PostgreSQL security counter,
  // compression, or body parsing work. The default in-memory global limiter is
  // the cheap per-replica flood brake; mounting it after credential limiters
  // would let rejected attack traffic keep writing a PG row on every request.
  app.use(limiters.global);
  app.use('/client-config', createClientConfigRouter(config.ads));

  // Credential routes are throttled before JSON parsing/bcrypt work. Logout is
  // deliberately excluded: an authenticated learner must always be able to
  // revoke a token, even after an attacker exhausts the IP's login budget.
  // Registration carries its own tighter per-IP budget instead of the generic
  // credential one.
  app.use('/auth/login', limiters.auth);
  app.use('/auth/register', limiters.register);
  app.use('/auth/change-password', limiters.auth);
  app.use('/auth/account', limiters.auth);
  // Password-reset routes are unauthenticated credential surfaces: the same
  // per-IP budget bounds token minting, mail fan-out, and code guessing. The
  // additional per-target-email budget lives on the route (it needs the
  // parsed body).
  app.use('/auth/forgot-password', limiters.auth);
  app.use('/auth/reset-password', limiters.auth);

  app.use(compression());
  // This API has no legitimate compressed request bodies. Refusing them
  // before decompression prevents a tiny gzip payload from consuming CPU and
  // memory as an inflated JSON bomb; response compression remains enabled.
  app.use(express.json({ limit: '1mb', inflate: false }));

  // The account-targeted login limiter needs the parsed/normalized-able email.
  // The independent IP limiter above still rejects abusive bodies before JSON
  // parsing, while this shared budget prevents distributed credential attacks.
  app.use('/auth/login', limiters.loginAccount);

  app.use('/auth', createAuthRouter(limiters));
  app.get(
    '/assessments/:requestId',
    requireAuth,
    validate({ params: z.object({ requestId: z.string().uuid('requestId must be a valid UUID') }) }),
    h(async (req: AuthedRequest, res) => {
      res.set('Cache-Control', 'no-store');
      const status = await getAssessmentRequestStatus(req.user!.id, req.params.requestId);
      if (!status) throw new HttpError(404, 'Assessment request not found');
      res.json(status);
    }),
  );
  app.use('/diagnostic', createDiagnosticRouter(limiters));
  app.use('/practice', createPracticeRouter(limiters));
  app.use('/uploads', createAudioUploadRouter(limiters));
  app.use('/recordings', createRecordingsRouter(limiters));

  app.use((_req, res) => res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' }));
  app.use(errorHandler);

  return app;
}
