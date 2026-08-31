import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { z } from 'zod';
import { config } from './config';
import { pool } from './db';
import { logger } from './logger';
import { shedRequestsTotal } from './metrics';

// Stable machine-readable error codes (error contract v2). Every error body is
// `{ error, code, ...extras }`; clients map `code` to localized copy and fall
// back to the human-readable `error` string.
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'UNAUTHENTICATED'
  | 'TOKEN_REVOKED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'QUESTION_MISMATCH'
  | 'DIAGNOSTIC_DONE'
  | 'REQUEST_IN_FLIGHT'
  | 'REQUEST_ID_REUSED'
  | 'ASSESSMENT_RESULT_INCOMPATIBLE'
  | 'ASSESSMENT_IN_PROGRESS'
  | 'PRACTICE_CYCLE_CLOSED'
  | 'STATE_CHANGED'
  | 'RATE_LIMITED'
  | 'DAILY_LIMIT'
  | 'NETWORK_DAILY_LIMIT'
  | 'CAPACITY_BUSY'
  | 'POOL_SATURATED'
  | 'AUDIO_INVALID'
  | 'AUDIO_SILENT'
  | 'AUDIO_UPLOAD_MISSING'
  | 'AUDIO_TOO_LARGE'
  | 'AUDIO_TOO_LONG'
  | 'AUDIO_UNREADABLE'
  | 'PROVIDER_FAILED'
  | 'PROVIDER_TIMEOUT'
  | 'RESET_INVALID'
  | 'CLIENT_UPGRADE_REQUIRED'
  | 'INTERNAL';

/**
 * Fallback codes for HttpErrors thrown without an explicit one, so the whole
 * long tail of zod 400s and status-conventional throws stays machine-readable
 * without annotating every site. Anything semantically richer than its status
 * (409 conflicts, daily caps, audio gates) must pass its code explicitly.
 */
export function defaultErrorCode(status: number): ApiErrorCode {
  if (status >= 500) return 'INTERNAL';
  switch (status) {
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 429:
      return 'RATE_LIMITED';
    default:
      return 'VALIDATION_FAILED';
  }
}

export class HttpError extends Error {
  public status: number;
  public extra?: Record<string, unknown>;
  public code?: ApiErrorCode;

  // The third argument accepts either the extras object or, for the common
  // extras-free case, the code directly — existing `(status, message, extra)`
  // call sites keep working unchanged.
  constructor(status: number, message: string, code?: ApiErrorCode);
  constructor(status: number, message: string, extra?: Record<string, unknown>, code?: ApiErrorCode);
  constructor(
    status: number,
    message: string,
    extraOrCode?: Record<string, unknown> | ApiErrorCode,
    code?: ApiErrorCode,
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    if (typeof extraOrCode === 'string') {
      this.code = extraOrCode;
    } else {
      this.extra = extraOrCode;
      this.code = code;
    }
  }
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  native_language: string;
  ui_language: string;
  cefr_level: string | null;
  diagnostic_completed: boolean;
  diagnostic_acknowledged: boolean;
  token_version: number;
  created_at: string;
}

/**
 * The authenticated caller as requireAuth pins it: every user column EXCEPT
 * the bcrypt hash. Selecting explicit columns (instead of the full row) keeps
 * the password hash off the request object — one refactor away from leaking
 * via a future log/serialization call site — while the routes that genuinely
 * verify a credential (change-password, delete-account) fetch their own hash
 * snapshot at the moment of verification.
 */
export type AuthUser = Omit<UserRow, 'password_hash'>;

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

/** Wrap an async route handler so rejections reach the error middleware. */
export const h =
  (fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next);

export const JWT_ISSUER = 'ai-english-api';
export const JWT_AUDIENCE = 'ai-english-mobile';

// Reject non-UUID subjects before they reach the uuid-typed query, so a
// well-signed but malformed token gets a 401 instead of a 22P02 500.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  // Accept the RFC-compatible whitespace between the scheme and credentials,
  // but require the entire value to contain exactly one bearer credential.
  // Silently ignoring a trailing token makes the API and an upstream proxy
  // disagree about which credential was authenticated.
  const authorization = req.headers.authorization;
  const token = typeof authorization === 'string' ? /^Bearer[ \t]+([^\s]+)$/.exec(authorization)?.[1] : undefined;
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header', code: 'UNAUTHENTICATED' });
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' });
  }

  // jsonwebtoken can return a primitive string. Such a value has no string
  // `sub` claim (String.prototype.sub is a function), so the same structural
  // checks reject it without a redundant special case.
  const claims = payload as jwt.JwtPayload;
  // Every API-issued token has an expiry and an integer, positive token
  // version. `jwt.verify` checks an exp claim when present, but does not
  // require one; enforce the issuance contract here so a future signing call
  // cannot accidentally mint a non-expiring bearer credential.
  if (
    typeof claims.sub !== 'string' ||
    !UUID_PATTERN.test(claims.sub) ||
    !Number.isSafeInteger(claims.tv) ||
    claims.tv < 1 ||
    !Number.isSafeInteger(claims.exp)
  ) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' });
  }

  try {
    const { rows } = await pool.query<AuthUser>(
      `SELECT id, name, email, native_language, ui_language, cefr_level,
              diagnostic_completed, diagnostic_acknowledged, token_version, created_at
       FROM users WHERE id = $1`,
      [claims.sub],
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid token: user not found', code: 'UNAUTHENTICATED' });
    }
    if (user.token_version !== claims.tv) {
      return res.status(401).json({ error: 'Token no longer valid — please log in again', code: 'TOKEN_REVOKED' });
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

interface ValidateSchemas {
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
}

// validate() records each schema's parsed output per request so routes read
// typed data through validated() instead of `req.body as z.infer<...>` casts.
const validatedBySchema = new WeakMap<Request, Map<z.ZodTypeAny, unknown>>();

/**
 * Validate request body/params/query with zod. On failure the client gets a
 * clean 400 with the first issue message (e.g. malformed UUID params instead
 * of a Postgres 22P02 500).
 */
export const validate =
  (schemas: ValidateSchemas): RequestHandler =>
  (req, _res, next) => {
    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const issue = result.error.issues[0];
        const path = issue.path.join('.');
        const message = path.length > 0 ? `${path}: ${issue.message}` : issue.message;
        return next(new HttpError(400, message));
      }
      let store = validatedBySchema.get(req);
      if (!store) {
        store = new Map();
        validatedBySchema.set(req, store);
      }
      store.set(schema, result.data);
      if (key === 'body') req.body = result.data;
      else if (key === 'params') req.params = result.data;
      else req.query = result.data;
    }
    next();
  };

/**
 * Typed access to the output validate() parsed for this exact schema instance.
 * Throwing on a miss turns a route that forgot its validate() middleware into
 * a loud 500 instead of silently reading an unvalidated body.
 */
export function validated<S extends z.ZodTypeAny>(req: Request, schema: S): z.infer<S> {
  const store = validatedBySchema.get(req);
  if (!store || !store.has(schema)) {
    throw new Error('validated() called for a schema this request did not validate');
  }
  return store.get(schema) as z.infer<S>;
}

const CLIENT_VERSION_PATTERN = /^\d{1,9}(\.\d{1,9}){0,2}$/;

/** Dotted numeric version ("1", "1.2", "1.2.3") to comparable segments. */
export function parseClientVersion(value: string): number[] | undefined {
  const trimmed = value.trim();
  if (!CLIENT_VERSION_PATTERN.test(trimmed)) return undefined;
  return trimmed.split('.').map(Number);
}

/**
 * X-Client-Version handshake: when MIN_CLIENT_VERSION is configured and the
 * client is older or cannot advertise a well-formed version, fail fast with
 * 426 so a stale/pre-handshake build cannot bypass an incompatible contract.
 * Operational probes and stable privacy/account exits are exempt below.
 */
const RECORDING_DELETE_PATH =
  /^\/recordings\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Stable privacy/account exits remain usable while an old build updates. */
export function clientVersionGateExempt(method: string | undefined, path: string | undefined) {
  if (!method || !path) return false;
  const normalizedMethod = method.toUpperCase();
  // Express accepts one trailing slash for these routes. Normalize exactly
  // one so the exemption mirrors routing without accidentally blessing broad
  // prefixes or arbitrary repeated slashes. Express routing is case-insensitive
  // by default and automatically serves HEAD through matching GET handlers.
  const routePath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  const normalizedPath = routePath.toLowerCase();
  const readsRoute = normalizedMethod === 'GET' || normalizedMethod === 'HEAD';
  if (readsRoute && ['/health', '/ready', '/metrics'].includes(normalizedPath)) return true;
  if (normalizedMethod === 'POST' && normalizedPath === '/auth/logout') return true;
  if (normalizedMethod === 'DELETE' && normalizedPath === '/auth/account') return true;
  if (readsRoute && ['/auth/me/data', '/recordings/export'].includes(normalizedPath)) return true;
  if (normalizedMethod === 'DELETE' && normalizedPath === '/recordings') return true;
  return normalizedMethod === 'DELETE' && RECORDING_DELETE_PATH.test(routePath);
}

export const clientVersionGate: RequestHandler = (req, _res, next) => {
  if (clientVersionGateExempt(req.method, req.path)) return next();
  const minimumRaw = config.minClientVersion;
  if (!minimumRaw) return next();
  const header = req.headers['x-client-version'];
  const minimum = parseClientVersion(minimumRaw);
  if (!minimum) return next(new Error('configured minimum client version is invalid'));
  const clientVersion = typeof header === 'string' ? parseClientVersion(header) : undefined;
  if (!clientVersion) {
    return next(
      new HttpError(426, 'This app version is no longer supported; please update it', 'CLIENT_UPGRADE_REQUIRED'),
    );
  }
  for (const index of [0, 1, 2] as const) {
    const diff = (clientVersion[index] ?? 0) - (minimum[index] ?? 0);
    if (diff < 0) {
      return next(
        new HttpError(426, 'This app version is no longer supported; please update it', 'CLIENT_UPGRADE_REQUIRED'),
      );
    }
    if (diff > 0) return next();
  }
  return next();
};

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // The client disconnected (or the response otherwise ended) before this
  // error surfaced: nobody will read the status, and writing to a dead socket
  // risks secondary stream errors. Log compactly instead of the ERROR-level
  // "unhandled error" noise an abandoned upload otherwise produces (e.g. the
  // temp-file close listener deletes the audio out from under the handler).
  // Detect via the socket: `req.destroyed` is NOT safe here — it flips true
  // once a multipart body has been fully consumed (stream auto-destroy).
  if (res.writableEnded || res.destroyed || req.socket.destroyed) {
    logger.info({ err, requestId: req.id }, 'client gone before error response; dropping it');
    if (!res.writableEnded && !res.destroyed) res.end();
    return;
  }
  // Headers already flushed (e.g. a streaming handler that wrote, then threw):
  // res.status().json() would itself throw ERR_HTTP_HEADERS_SENT and fall
  // through to Express's default handler, destroying the socket mid-body. End
  // the partially-written response cleanly instead; the status line is already
  // on the wire and cannot be changed.
  if (res.headersSent) {
    logger.error({ err, requestId: req.id }, 'error after response headers were sent; ending partial response');
    res.end();
    return;
  }
  if (err instanceof HttpError) {
    // Uniform retry advertising: any error whose extras carry a retry hint
    // also emits the standard Retry-After header (always in seconds).
    const extra = err.extra ?? {};
    if (typeof extra.retryAfterSeconds === 'number') {
      res.set('Retry-After', String(extra.retryAfterSeconds));
    } else if (typeof extra.retryAfterHours === 'number') {
      res.set('Retry-After', String(extra.retryAfterHours * 3600));
    }
    return res.status(err.status).json({
      ...err.extra,
      error: err.message,
      code: err.code ?? defaultErrorCode(err.status),
    });
  }
  // A saturated pg pool (pg-pool's acquisition timeout) is transient
  // backpressure, not an application fault: shed the request with 503 +
  // Retry-After so clients back off, never a raw 500. Proven under a
  // 1000-user signup burst, where these surfaced on every route.
  // WARNING: pg-pool throws a bare Error for this condition — the message is
  // the ONLY distinguishing signal it exposes (no code/name), so this match
  // is unavoidably textual. It is case-insensitive to survive minor wording
  // tweaks, and middleware tests pin it so a pg bump that rewords it fails
  // loudly instead of silently degrading the shed to a 500.
  if (err instanceof Error && /^timeout exceeded when trying to connect$/i.test(err.message)) {
    logger.warn({ requestId: req.id }, 'database pool saturated; shedding request');
    shedRequestsTotal.inc({ reason: 'pool_saturated' });
    res.set('Retry-After', '5');
    return res
      .status(503)
      .json({ error: 'Server is busy, please try again shortly', code: 'POOL_SATURATED', retryAfterSeconds: 5 });
  }
  // PostgreSQL lock waits (55P03 lock_not_available, e.g. a wedged hot-path
  // advisory/row lock) and statement timeouts (57014 with the statement-
  // timeout message) are database backpressure, not application faults — a
  // client retry after the Retry-After window is the productive outcome, and
  // a 500 here would only turn a wedged session into a 5xx alarm storm.
  // User-initiated cancellations and every other query_canceled wording keep
  // the generic 500 path.
  if (
    err instanceof Error &&
    ((err as { code?: string }).code === '55P03' ||
      ((err as { code?: string }).code === '57014' &&
        /canceling statement due to statement timeout/i.test(err.message)))
  ) {
    logger.warn({ requestId: req.id, err }, 'database lock wait or statement timed out; shedding request');
    shedRequestsTotal.inc({ reason: 'db_lock_timeout' });
    res.set('Retry-After', '5');
    return res
      .status(503)
      .json({ error: 'Server is busy, please try again shortly', code: 'POOL_SATURATED', retryAfterSeconds: 5 });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 25MB)', code: 'AUDIO_TOO_LARGE' });
    }
    return res.status(400).json({ error: err.message, code: 'VALIDATION_FAILED' });
  }
  // Map body-parser protocol errors to stable, non-sensitive API responses.
  // Never reflect parser messages because they can include request fragments.
  const bodyParserError = err as { type?: string; status?: number };
  if (bodyParserError.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large', code: 'VALIDATION_FAILED' });
  }
  if (bodyParserError.type === 'encoding.unsupported' || bodyParserError.type === 'charset.unsupported') {
    return res.status(415).json({ error: 'Unsupported request body encoding', code: 'VALIDATION_FAILED' });
  }
  if (bodyParserError.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON', code: 'VALIDATION_FAILED' });
  }
  if (bodyParserError.type === 'request.aborted' || bodyParserError.type === 'request.size.invalid') {
    return res.status(400).json({ error: 'Invalid request body', code: 'VALIDATION_FAILED' });
  }
  // Not every parser failure carries a `type`: body-parser inflates bodies by
  // default and wraps a zlib failure (corrupt Content-Encoding) as a bare
  // exposed 400. Answer any client-safe 4xx the parser produced as the client
  // error it is, so a malformed request cannot mint fake 5xx traffic and
  // ERROR-level stack traces — still without reflecting the parser's message.
  const parserStatus = bodyParserError.status;
  if (
    typeof parserStatus === 'number' &&
    parserStatus >= 400 &&
    parserStatus < 500 &&
    (err as { expose?: boolean }).expose === true
  ) {
    return res.status(parserStatus).json({ error: 'Invalid request body', code: 'VALIDATION_FAILED' });
  }
  logger.error({ err, requestId: req.id }, 'unhandled error');
  return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL' });
}
