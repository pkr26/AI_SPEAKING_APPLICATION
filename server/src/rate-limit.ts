import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { config } from './config';
import { AuthedRequest } from './middleware';
import { PostgresRateLimitStore } from './postgres-rate-limit-store';

const MAX_EMAIL_LENGTH = 254;

export function normalizeLoginEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_EMAIL_LENGTH) return undefined;
  return normalized;
}

/**
 * Security-sensitive limiters use PostgreSQL counters so every API replica
 * enforces one shared budget. Built per app so tests can vary configuration;
 * stable namespaces still make independently built replicas share counters.
 */
export function buildLimiters() {
  const common = {
    standardHeaders: true as const,
    legacyHeaders: false as const,
    message: { error: 'Too many requests, please try again later' },
  };

  const global = rateLimit({
    ...common,
    windowMs: config.rateLimit.globalWindowMs,
    limit: config.rateLimit.globalMax,
    store: new PostgresRateLimitStore(
      `global:${config.rateLimit.globalWindowMs}:${config.rateLimit.globalMax}`,
      config.rateLimit.globalWindowMs,
    ),
  });

  const auth = rateLimit({
    ...common,
    windowMs: config.rateLimit.authWindowMs,
    limit: config.rateLimit.authMax,
    store: new PostgresRateLimitStore(
      `auth:${config.rateLimit.authWindowMs}:${config.rateLimit.authMax}`,
      config.rateLimit.authWindowMs,
    ),
    message: { error: 'Too many attempts, please try again later' },
  });

  // This second login budget follows the normalized account identifier across
  // source IPs. It runs after JSON parsing, persists only an HMAC of the key,
  // and refunds successful logins so legitimate use cannot exhaust it.
  const loginAccount = rateLimit({
    ...common,
    windowMs: config.rateLimit.loginAccountWindowMs,
    limit: config.rateLimit.loginAccountMax,
    store: new PostgresRateLimitStore(
      `login-account:${config.rateLimit.loginAccountWindowMs}:${config.rateLimit.loginAccountMax}`,
      config.rateLimit.loginAccountWindowMs,
    ),
    skip: (req) => normalizeLoginEmail((req.body as { email?: unknown } | undefined)?.email) === undefined,
    keyGenerator: (req) => {
      const email = normalizeLoginEmail((req.body as { email?: unknown } | undefined)?.email);
      // `skip` excludes this case before key generation; retain a stable
      // defensive value for custom express-rate-limit implementations.
      return email ? `email:${email}` : 'email:invalid';
    },
    skipSuccessfulRequests: true,
    message: { error: 'Too many login attempts, please try again later' },
  });

  // Readiness performs a database query and may be reachable outside the
  // orchestrator network, so keep it independently bounded.
  const readiness = rateLimit({
    ...common,
    windowMs: 60_000,
    limit: 60,
  });

  // Assessment endpoints are expensive (upload + AI) — per-user, not per-IP,
  // so shared networks don't let one user exhaust another's budget.
  const assess = rateLimit({
    ...common,
    windowMs: config.rateLimit.assessWindowMs,
    limit: config.rateLimit.assessMax,
    store: new PostgresRateLimitStore(
      `assess:${config.rateLimit.assessWindowMs}:${config.rateLimit.assessMax}`,
      config.rateLimit.assessWindowMs,
    ),
    keyGenerator: (req) => {
      const user = (req as AuthedRequest).user;
      return user ? `user:${user.id}` : ipKeyGenerator(req.ip ?? '');
    },
    message: { error: 'Assessment rate limit reached, please slow down' },
  });

  // Issuing an S3 upload grant has its own shared per-user budget. It must not
  // consume the paid assessment budget before the assessment is submitted,
  // while still bounding abandoned/retried presigned uploads across replicas.
  const uploadGrant = rateLimit({
    ...common,
    windowMs: config.rateLimit.uploadGrantWindowMs,
    limit: config.rateLimit.uploadGrantMax,
    store: new PostgresRateLimitStore(
      `upload-grant:${config.rateLimit.uploadGrantWindowMs}:${config.rateLimit.uploadGrantMax}`,
      config.rateLimit.uploadGrantWindowMs,
    ),
    keyGenerator: (req) => {
      const user = (req as AuthedRequest).user;
      return user ? `user:${user.id}` : ipKeyGenerator(req.ip ?? '');
    },
    message: { error: 'Audio upload grant rate limit reached, please try again later' },
  });

  return { global, auth, loginAccount, readiness, assess, uploadGrant };
}

export type Limiters = ReturnType<typeof buildLimiters>;
