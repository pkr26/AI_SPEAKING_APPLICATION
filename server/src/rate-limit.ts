import { ipKeyGenerator, rateLimit, type RateLimitInfo } from 'express-rate-limit';
import type { RequestHandler, Response } from 'express';
import { z } from 'zod';
import { config } from './config';
import { AuthedRequest } from './middleware';
import { PostgresRateLimitStore } from './postgres-rate-limit-store';

const MAX_EMAIL_LENGTH = 254;
const emailShape = z.string().email();

export function normalizeLoginEmail(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  // Do not let arbitrary malformed JSON strings create a durable shared
  // counter row. The auth route applies the same normalization and Zod email
  // shape check immediately after this limiter, so only identifiers that
  // could name an account need a cross-replica budget.
  if (!normalized || normalized.length > MAX_EMAIL_LENGTH || !emailShape.safeParse(normalized).success)
    return undefined;
  return normalized;
}

/** One stable fallback key for the rare request whose socket has no address. */
export function rateLimitIpKey(ip: string | undefined): string {
  return ipKeyGenerator(ip ?? '');
}

/** express-rate-limit validates custom request key functions by source. */
export function requestIpRateLimitKey(req: { ip?: string }): string {
  return ipKeyGenerator(req.ip ?? '');
}

function userOrIpRateLimitKey(req: AuthedRequest): string {
  const user = req.user;
  return user ? `user:${user.id}` : rateLimitIpKey(req.ip);
}

type ParsedEmailRequest = { body?: { email?: unknown } };

// Both email-keyed limiters are mounted after express.json(). Treat a missing
// body as an invalid identifier too: Express deliberately leaves req.body
// undefined for requests with no JSON content type, and a malformed request
// must not turn that defensive limiter into a TypeError/500.
function skipInvalidEmail(req: ParsedEmailRequest): boolean {
  return normalizeLoginEmail(req.body?.email) === undefined;
}

/** express-rate-limit invokes this only after skipInvalidEmail returned false. */
function validEmailRateLimitKey(req: ParsedEmailRequest): string {
  const email = normalizeLoginEmail(req.body!.email)!;
  return `email:${email}`;
}

// The two assessment limiters publish their per-request info under distinct
// properties: with the shared default name the second would overwrite the
// first, and the abort re-spend needs the exact window EACH hit was counted
// in (increment renews an expired row in place, so "some window is live" is
// not the same question as "the window this hit belongs to is still live").
type AssessRateLimitedRequest = AuthedRequest & {
  assessRateLimit?: RateLimitInfo;
  assessIpDailyRateLimit?: RateLimitInfo;
};

interface ExactWindowRefundOptions {
  limiter: RequestHandler;
  store: PostgresRateLimitStore;
  requestPropertyName: string;
  refundFinished: (req: AuthedRequest, res: Response) => boolean;
}

/**
 * express-rate-limit's Store#decrement receives only a key, so it cannot tell
 * whether a row was renewed into a successor window after the request's hit.
 * Keep a synchronous one-shot refund decision and apply it through the exact
 * resetTime this request observed. The decision can precede the limiter's
 * async increment; later observations safely complete it once and only once.
 */
function createExactWindowRefundController(
  req: AuthedRequest,
  store: PostgresRateLimitStore,
  requestPropertyName: string,
): { requestRefund: () => void; refundIfObserved: () => void } {
  let refundRequested = false;
  let refunded = false;
  const refundIfObserved = () => {
    if (!refundRequested || refunded) return;
    const info = (req as unknown as Record<string, unknown>)[requestPropertyName] as RateLimitInfo | undefined;
    if (!info) return;
    // Set synchronously before the fire-and-forget counter update: finish,
    // close, error, and promise settlement can all land in the same turn.
    refunded = true;
    void store.decrementWithinWindow(info.key, info.resetTime);
  };
  return {
    requestRefund: () => {
      refundRequested = true;
      refundIfObserved();
    },
    refundIfObserved,
  };
}

function invokeLimiterWithRefundObservation(
  limiter: RequestHandler,
  req: AuthedRequest,
  res: Response,
  next: Parameters<RequestHandler>[2],
  observeRefund: () => void,
): void {
  const result = limiter(req, res, (error?: unknown) => {
    observeRefund();
    if (error !== undefined) next(error);
    else next();
  }) as unknown;
  void Promise.resolve(result).then(observeRefund, next);
}

/** Credential budgets refund successful, finished responses only. */
export function withExactWindowFinishRefund(options: ExactWindowRefundOptions): RequestHandler {
  return (rawReq, res, next) => {
    const req = rawReq as AuthedRequest;
    const refund = createExactWindowRefundController(req, options.store, options.requestPropertyName);
    res.once('finish', () => {
      if (options.refundFinished(req, res)) refund.requestRefund();
    });
    invokeLimiterWithRefundObservation(options.limiter, req, res, next, refund.refundIfObserved);
  };
}

/** Assessment budgets also refund unfinished close/error transport failures. */
export function withAssessmentExactWindowRefund(options: ExactWindowRefundOptions): RequestHandler {
  return (rawReq, res, next) => {
    const req = rawReq as AuthedRequest;
    const refund = createExactWindowRefundController(req, options.store, options.requestPropertyName);
    const requestMissedTransportRefund = () => {
      if (
        !res.writableEnded &&
        (res.locals.assessmentTransportClosed === true || res.closed || res.destroyed || req.socket.destroyed)
      ) {
        refund.requestRefund();
      }
      if (res.locals.assessmentTransportFailed === true) refund.requestRefund();
    };
    const observeRefund = () => {
      requestMissedTransportRefund();
      refund.refundIfObserved();
    };

    res.once('finish', () => {
      if (options.refundFinished(req, res)) refund.requestRefund();
    });
    res.once('close', () => {
      res.locals.assessmentTransportClosed = true;
      if (!res.writableEnded) refund.requestRefund();
    });
    res.once('error', () => {
      res.locals.assessmentTransportFailed = true;
      refund.requestRefund();
    });
    // A prior assessment limiter may have observed the one-shot event while
    // this downstream limiter was still waiting to mount.
    requestMissedTransportRefund();
    invokeLimiterWithRefundObservation(options.limiter, req, res, next, observeRefund);
  };
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
    message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
  };

  // Budgets that flag instead of rejecting must stay invisible at the HTTP
  // level too. express-rate-limit emits the over-limit Retry-After only when a
  // header family is enabled, so turning standardHeaders off (legacyHeaders is
  // already off above) makes an over-budget response byte-identical to an
  // in-budget one. All three count an account identifier rather than the
  // caller — for login/forgot-password the TARGET email, shared across every
  // source IP and replica — so RateLimit-Remaining/Reset would otherwise
  // publish a third party's recent failed logins or reset requests to any
  // unauthenticated prober, and Retry-After would tell an attacker exactly when
  // the always-204 forgot-password route started silently dropping mail. The
  // headers also contradict these responses: an over-budget request that
  // verifies the correct password still succeeds, Retry-After and all. The
  // rejecting limiters keep their headers — they key the caller and their 429
  // already states the throttle — and the per-IP limiter mounted ahead of
  // these routes still reports the caller's own budget.
  const silentBudgetHeaders = { standardHeaders: false as const };

  // The global limiter is a coarse per-IP flood brake, not a security budget.
  // With RATE_LIMIT_GLOBAL_STORE=memory (the default) it uses express-rate-
  // limit's in-process store: the budget is enforced per replica and busy
  // traffic never writes a counter row per client IP. 'postgres' opts into one
  // cluster-wide budget through the shared store; the security limiters below
  // are always PostgreSQL-backed regardless.
  const global = rateLimit({
    ...common,
    windowMs: config.rateLimit.globalWindowMs,
    limit: config.rateLimit.globalMax,
    ...(config.rateLimit.globalStore === 'postgres'
      ? {
          store: new PostgresRateLimitStore(
            `global:${config.rateLimit.globalWindowMs}:${config.rateLimit.globalMax}`,
            config.rateLimit.globalWindowMs,
          ),
        }
      : {}),
  });

  const auth = rateLimit({
    ...common,
    windowMs: config.rateLimit.authWindowMs,
    limit: config.rateLimit.authMax,
    store: new PostgresRateLimitStore(
      `auth:${config.rateLimit.authWindowMs}:${config.rateLimit.authMax}`,
      config.rateLimit.authWindowMs,
    ),
    message: { error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' },
  });

  // This second login budget follows the normalized account identifier across
  // source IPs. It runs after JSON parsing, persists only an HMAC of the key,
  // and refunds successful logins so legitimate use cannot exhaust it.
  // Over-budget requests are NOT rejected here: the route still verifies the
  // password and lets a correct login through (flagged via res.locals), so an
  // attacker saturating the account budget cannot lock out the real owner;
  // only failures are throttled. The per-IP auth limiter above still bounds
  // the bcrypt work this always-verify policy pays per source.
  const loginAccountStore = new PostgresRateLimitStore(
    `login-account:${config.rateLimit.loginAccountWindowMs}:${config.rateLimit.loginAccountMax}`,
    config.rateLimit.loginAccountWindowMs,
  );
  const loginAccountRequestProperty = 'loginAccountRateLimit';
  const loginAccountLimiter = rateLimit({
    ...common,
    ...silentBudgetHeaders,
    windowMs: config.rateLimit.loginAccountWindowMs,
    limit: config.rateLimit.loginAccountMax,
    store: loginAccountStore,
    skip: skipInvalidEmail,
    keyGenerator: validEmailRateLimitKey,
    requestPropertyName: loginAccountRequestProperty,
    handler: (_req, res, next) => {
      res.locals.loginAccountThrottled = true;
      next();
    },
  });
  const loginAccount = withExactWindowFinishRefund({
    limiter: loginAccountLimiter,
    store: loginAccountStore,
    requestPropertyName: loginAccountRequestProperty,
    refundFinished: (_req, res) => res.statusCode < 400,
  });

  // Password-confirmation routes (change-password, account deletion) run
  // bcrypt on authenticated requests, so a stolen bearer token plus
  // distributed IPs could otherwise brute-force the account password online.
  // Same always-verify shape as loginAccount: over-budget requests still check
  // the password, and only failures are throttled.
  const passwordAccountStore = new PostgresRateLimitStore(
    `password-account:${config.rateLimit.passwordWindowMs}:${config.rateLimit.passwordMax}`,
    config.rateLimit.passwordWindowMs,
  );
  const passwordAccountRequestProperty = 'passwordAccountRateLimit';
  const passwordAccountLimiter = rateLimit({
    ...common,
    ...silentBudgetHeaders,
    windowMs: config.rateLimit.passwordWindowMs,
    limit: config.rateLimit.passwordMax,
    store: passwordAccountStore,
    // Mounted after requireAuth; the user is always present. The IP fallback
    // only protects against a future route that forgets that ordering.
    keyGenerator: (req) => userOrIpRateLimitKey(req as AuthedRequest),
    handler: (_req, res, next) => {
      res.locals.passwordAccountThrottled = true;
      next();
    },
    requestPropertyName: passwordAccountRequestProperty,
  });
  const passwordAccount = withExactWindowFinishRefund({
    limiter: passwordAccountLimiter,
    store: passwordAccountStore,
    requestPropertyName: passwordAccountRequestProperty,
    refundFinished: (_req, res) => res.statusCode < 400,
  });

  // Password-reset requests follow the normalized TARGET email across source
  // IPs (same key shape as loginAccount) so distributed requests cannot spam
  // one mailbox or churn one account's active reset token. Over-budget
  // requests are not rejected: the route sees the flag, silently skips
  // issuing/sending, and still answers the uniform 204 — a 429 here would
  // leak throttling state and break the always-204 anti-enumeration contract.
  // Unlike loginAccount there is no success refund: every issued mail counts.
  const forgotPasswordEmail = rateLimit({
    ...common,
    ...silentBudgetHeaders,
    windowMs: config.rateLimit.forgotEmailWindowMs,
    limit: config.rateLimit.forgotEmailMax,
    store: new PostgresRateLimitStore(
      `forgot-email:${config.rateLimit.forgotEmailWindowMs}:${config.rateLimit.forgotEmailMax}`,
      config.rateLimit.forgotEmailWindowMs,
    ),
    skip: skipInvalidEmail,
    keyGenerator: validEmailRateLimitKey,
    handler: (_req, res, next) => {
      res.locals.forgotEmailThrottled = true;
      next();
    },
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
    keyGenerator: requestIpRateLimitKey,
    message: { error: 'Too many accounts created from this network, please try again later', code: 'RATE_LIMITED' },
  });

  // Restarting the placement test resets the learner's level, so it shares
  // the passwordAccount budget shape (PG-backed, per authenticated user).
  // Unlike the credential budgets it rejects outright: the operation is
  // destructive-ish and every accepted request counts, so there is no
  // always-verify pass-through and no success refund.
  const diagnosticRestart = rateLimit({
    ...common,
    windowMs: config.rateLimit.passwordWindowMs,
    limit: config.rateLimit.passwordMax,
    store: new PostgresRateLimitStore(
      `diagnostic-restart:${config.rateLimit.passwordWindowMs}:${config.rateLimit.passwordMax}`,
      config.rateLimit.passwordWindowMs,
    ),
    // Mounted after requireAuth; the user is always present. The IP fallback
    // only protects against a future route that forgets that ordering.
    keyGenerator: (req) => userOrIpRateLimitKey(req as AuthedRequest),
    message: { error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' },
  });

  // Readiness performs a database query and may be reachable outside the
  // orchestrator network, so keep it independently bounded.
  const readiness = rateLimit({
    ...common,
    windowMs: 60_000,
    limit: 60,
  });

  // Failed responses are refunded ONLY when the request never reached paid
  // work: schema-invalid and otherwise-rejected submissions must not spend the
  // budget, but a provider 502/504 thrown after the capacity reservation (and
  // outside mock mode, after paid provider calls) must keep its hit — without
  // this, a client stuck in a provider-failure loop is never rate-limited.
  // Routes set the flag via assessSpeaking's onCapacityReserved hook.
  const assessmentSpentPaidWork = (_req: unknown, res: { statusCode: number; locals: Record<string, unknown> }) =>
    res.statusCode < 400 || res.locals.assessmentCapacityReserved === true;

  // Assessment endpoints are expensive (upload + AI) — per-user, not per-IP,
  // so shared networks don't let one user exhaust another's budget. Failed
  // (>=400) requests that never reached paid work are refunded on response
  // finish. Refunds are pinned to the reset timestamp observed by that exact
  // request, so a rollover can never subtract a successor window's hit. Note
  // that a silence
  // (empty-transcript) response deliberately keeps its hit even though the
  // practice attempt counter treats it as a free retry: the Whisper
  // transcription that detected the silence already spent real provider money.
  const assessStore = new PostgresRateLimitStore(
    `assess:${config.rateLimit.assessWindowMs}:${config.rateLimit.assessMax}`,
    config.rateLimit.assessWindowMs,
  );
  const assessLimiter = rateLimit({
    ...common,
    windowMs: config.rateLimit.assessWindowMs,
    limit: config.rateLimit.assessMax,
    store: assessStore,
    keyGenerator: (req) => userOrIpRateLimitKey(req as AuthedRequest),
    requestPropertyName: 'assessRateLimit',
    message: { error: 'Assessment rate limit reached, please slow down', code: 'RATE_LIMITED' },
  });
  const assess = withAssessmentExactWindowRefund({
    limiter: assessLimiter,
    store: assessStore,
    requestPropertyName: 'assessRateLimit',
    refundFinished: (req, res) => !assessmentSpentPaidWork(req, res),
  });

  // Per-user daily caps reset with every re-registered account, so a spender
  // cycling throwaway identities could otherwise keep consuming paid
  // assessments until the global cap 429s every learner. This fixed-window
  // daily budget follows the source IP across accounts; its default is
  // deliberately several times the per-user daily cap so ordinary
  // households/schools behind one NAT keep working. Failed (>=400) requests
  // that never reached paid work are refunded so one account's rejected
  // submissions cannot deny the shared network budget to every other account
  // behind the same NAT.
  const assessIpDailyStore = new PostgresRateLimitStore(
    `assess-ip-daily:${config.assessIpDailyCap}`,
    24 * 60 * 60 * 1000,
  );
  const assessIpDailyLimiter = rateLimit({
    ...common,
    windowMs: 24 * 60 * 60 * 1000,
    limit: config.assessIpDailyCap,
    store: assessIpDailyStore,
    keyGenerator: requestIpRateLimitKey,
    requestPropertyName: 'assessIpDailyRateLimit',
    message: { error: 'Daily assessment limit reached for this network', code: 'NETWORK_DAILY_LIMIT' },
  });
  const assessIpDaily = withAssessmentExactWindowRefund({
    limiter: assessIpDailyLimiter,
    store: assessIpDailyStore,
    requestPropertyName: 'assessIpDailyRateLimit',
    refundFinished: (req, res) => !assessmentSpentPaidWork(req, res),
  });

  // The exact-window wrapper refunds an aborted request on an unfinished
  // 'close' and on a response 'error'. That refund is legitimate before paid
  // work — but once
  // the daily-capacity reservation has committed, the paid pipeline runs to
  // completion whether or not the caller stays connected, so a transport
  // failure must keep both hits. Re-spend
  // is guarded by the exact window each limiter observed for this request
  // (incrementWithinWindow): an abort landing after that window expired got no
  // refund, so nothing is taken back either — and because the store renews an
  // expired window in place on the same row, the observed reset time is what
  // keeps a late re-spend off a SUCCESSOR window opened by somebody else's
  // request. Both counter ops are single atomic updates on the same row, so
  // the refund and the re-spend net to zero in either completion order;
  // failures fail open (log only, inside the store) rather than taking the
  // request down with a dead client. Exposed on the limiter set so the
  // assessment pipeline can make the same decision when the reservation
  // commits AFTER the response already closed (the guard's close listener has
  // fired by then and will not fire again). The res.locals sentinel makes the
  // pair of paths idempotent: whichever re-spends first wins, and the other
  // becomes a no-op.
  const respendAssessmentBudget = (req: AuthedRequest, res: Response): void => {
    if (res.locals.assessmentBudgetRespent) return;
    res.locals.assessmentBudgetRespent = true;
    const observed = req as AssessRateLimitedRequest;
    if (observed.assessRateLimit) {
      void assessStore.incrementWithinWindow(observed.assessRateLimit.key, observed.assessRateLimit.resetTime);
    }
    if (observed.assessIpDailyRateLimit) {
      void assessIpDailyStore.incrementWithinWindow(
        observed.assessIpDailyRateLimit.key,
        observed.assessIpDailyRateLimit.resetTime,
      );
    }
  };

  // Mounted after the two assessment limiters, this mirrors every transport
  // event on which the exact-window wrapper can refund. The durable locals markers
  // close the event-before-reservation race without relying on Node's response
  // flags having updated by the time the provider reservation callback runs.
  const assessAbortGuard: RequestHandler = (req, res, next) => {
    res.once('error', () => {
      res.locals.assessmentTransportFailed = true;
      if (!res.locals.assessmentCapacityReserved) return;
      respendAssessmentBudget(req as AuthedRequest, res);
    });
    res.once('close', () => {
      res.locals.assessmentTransportClosed = true;
      if (res.writableEnded || !res.locals.assessmentCapacityReserved) return;
      respendAssessmentBudget(req as AuthedRequest, res);
    });
    next();
  };

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
    keyGenerator: (req) => userOrIpRateLimitKey(req as AuthedRequest),
    message: { error: 'Audio upload grant rate limit reached, please try again later', code: 'RATE_LIMITED' },
  });

  return {
    global,
    auth,
    loginAccount,
    passwordAccount,
    forgotPasswordEmail,
    diagnosticRestart,
    readiness,
    register,
    assess,
    assessIpDaily,
    assessAbortGuard,
    respendAssessmentBudget,
    uploadGrant,
  };
}

export type Limiters = ReturnType<typeof buildLimiters>;
