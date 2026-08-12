import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { authRouter } from './auth';
import { createAudioUploadRouter } from './audio-upload';
import { config } from './config';
import { pool } from './db';
import { createDiagnosticRouter } from './diagnostic';
import { httpLogger, logger } from './logger';
import { getAssessmentRequestStatus } from './idempotency';
import { AuthedRequest, errorHandler, h, HttpError, requireAuth, validate } from './middleware';
import { z } from 'zod';
import { createPracticeRouter } from './practice';
import { buildLimiters } from './rate-limit';

export function createApp() {
  const app = express();

  // Use the exact configured hop count. Express warns against `true`, which
  // would trust an attacker-supplied forwarding chain and bypass IP limits.
  app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(httpLogger);

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

  const limiters = buildLimiters();

  // Liveness stays cheap and independent of external services.
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.get('/ready', limiters.readiness, async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, 'readiness check failed');
      res.status(503).json({ ok: false, error: 'database unreachable' });
    }
  });

  // Credential routes are throttled before JSON parsing/bcrypt work. Logout is
  // deliberately excluded: an authenticated learner must always be able to
  // revoke a token, even after an attacker exhausts the IP's login budget.
  app.use('/auth/login', limiters.auth);
  app.use('/auth/register', limiters.auth);
  app.use('/auth/change-password', limiters.auth);
  app.use('/auth/account', limiters.auth);

  // Reject over-budget requests before compression/body parsing allocates work.
  app.use(limiters.global);

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  app.use('/auth', authRouter);
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

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);

  return app;
}
