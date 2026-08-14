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
  // Over-budget requests are NOT rejected here: the route still verifies the
  // password and lets a correct login through (flagged via res.locals), so an
  // attacker saturating the account budget cannot lock out the real owner;
  // only failures are throttled. The per-IP auth limiter above still bounds
  // the bcrypt work this always-verify policy pays per source.
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
    handler: (_req, res, next) => {
      res.locals.loginAccountThrottled = true;
      next();
    },
    skipSuccessfulRequests: true,
  });

  // Password-confirmation routes (change-password, account deletion) run
  // bcrypt on authenticated requests, so a stolen bearer token plus
  // distributed IPs could otherwise brute-force the account password online.
  // Same always-verify shape as loginAccount: over-budget requests still check
  // the password, and only failures are throttled.
  const passwordAccount = rateLimit({
    ...common,
    windowMs: config.rateLimit.passwordWindowMs,
    limit: config.rateLimit.passwordMax,
    store: new PostgresRateLimitStore(
      `password-account:${config.rateLimit.passwordWindowMs}:${config.rateLimit.passwordMax}`,
      config.rateLimit.passwordWindowMs,
    ),
    // Mounted after requireAuth; the user is always present. The IP fallback
    // only protects against a future route that forgets that ordering.
    keyGenerator: (req) => {
      const user = (req as AuthedRequest).user;
      return user ? `user:${user.id}` : ipKeyGenerator(req.ip ?? '');
    },
    handler: (_req, res, next) => {
      res.locals.passwordAccountThrottled = true;
      next();
    },
    skipSuccessfulRequests: true,
  });

  // Registration gets its own tighter per-IP budget: bulk account creation is
  // the entry point for both account-cycling spend and email enumeration.
  const register = rateLimit({
    ...common,
    windowMs: config.rateLimit.registerWindowMs,
    limit: config.rateLimit.registerMax,
    store: new PostgresRateLimitStore(
      `register:${config.rateLimit.registerWindowMs}:${config.rateLimit.registerMax}`,
      config.rateLimit.registerWindowMs,
    ),
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    message: { error: 'Too many accounts created from this network, please try again later' },
  });

  // Readiness performs a database query and may be reachable outside the
  // orchestrator network, so keep it independently bounded.
  const readiness = rateLimit({
    ...common,
    windowMs: 60_000,
    limit: 60,
  });

  // Assessment endpoints are expensive (upload + AI) — per-user, not per-IP,
  // so shared networks don't let one user exhaust another's budget. Failed
  // (>=400) requests are refunded on response finish: schema-invalid and other
  // rejected submissions never reach paid work, so they must not spend the
  // budget. The store's decrement is window-guarded and fail-safe (the same
  // refund path the login limiter already relies on).
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
    skipFailedRequests: true,
    message: { error: 'Assessment rate limit reached, please slow down' },
  });

  // Per-user daily caps reset with every re-registered account, so a spender
  // cycling throwaway identities could otherwise keep consuming paid
  // assessments until the global cap 429s every learner. This fixed-window
  // daily budget follows the source IP across accounts; its default is
  // deliberately several times the per-user daily cap so ordinary
  // households/schools behind one NAT keep working. Failed (>=400) requests
  // are refunded so one account's rejected submissions cannot deny the shared
  // network budget to every other account behind the same NAT.
  const assessIpDaily = rateLimit({
    ...common,
    windowMs: 24 * 60 * 60 * 1000,
    limit: config.assessIpDailyCap,
    store: new PostgresRateLimitStore(`assess-ip-daily:${config.assessIpDailyCap}`, 24 * 60 * 60 * 1000),
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    skipFailedRequests: true,
    message: { error: 'Daily assessment limit reached for this network' },
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

  return { global, auth, loginAccount, passwordAccount, readiness, register, assess, assessIpDaily, uploadGrant };
}

export type Limiters = ReturnType<typeof buildLimiters>;
