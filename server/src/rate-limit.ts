import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { config } from './config';
import { AuthedRequest } from './middleware';

/**
 * Rate limiters. NOTE: these use the default in-memory store, so limits are
 * per-process — running multiple API instances behind a load balancer needs a
 * shared store instead (see README).
 *
 * Built per-app (not module singletons) so tests can create apps with
 * different limits.
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
  });

  const auth = rateLimit({
    ...common,
    windowMs: config.rateLimit.authWindowMs,
    limit: config.rateLimit.authMax,
    message: { error: 'Too many attempts, please try again later' },
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
    keyGenerator: (req) => {
      const user = (req as AuthedRequest).user;
      return user ? `user:${user.id}` : ipKeyGenerator(req.ip ?? '');
    },
    message: { error: 'Assessment rate limit reached, please slow down' },
  });

  return { global, auth, readiness, assess };
}

export type Limiters = ReturnType<typeof buildLimiters>;
