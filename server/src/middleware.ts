import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { z } from 'zod';
import { config } from './config';
import { pool } from './db';
import { logger } from './logger';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  native_language: string;
  cefr_level: string | null;
  diagnostic_completed: boolean;
  token_version: number;
  created_at: string;
}

export interface AuthedRequest extends Request {
  user?: UserRow;
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
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    !UUID_PATTERN.test(payload.sub) ||
    typeof payload.tv !== 'number'
  ) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [payload.sub]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid token: user not found' });
    }
    if (user.token_version !== payload.tv) {
      return res.status(401).json({ error: 'Token no longer valid — please log in again' });
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
        const where = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return next(new HttpError(400, `${where}${issue.message}`));
      }
      if (key === 'body') req.body = result.data;
      else if (key === 'params') req.params = result.data;
      else req.query = result.data;
    }
    next();
  };

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large (max 25MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  // Map body-parser protocol errors to stable, non-sensitive API responses.
  // Never reflect parser messages because they can include request fragments.
  const bodyParserError = err as { type?: string; status?: number };
  if (bodyParserError.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (bodyParserError.type === 'encoding.unsupported' || bodyParserError.type === 'charset.unsupported') {
    return res.status(415).json({ error: 'Unsupported request body encoding' });
  }
  if (bodyParserError.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (bodyParserError.type === 'request.aborted' || bodyParserError.type === 'request.size.invalid') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  logger.error({ err, requestId: req.id }, 'unhandled error');
  return res.status(500).json({ error: 'Internal server error' });
}
