import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { config } from '../src/config';
import { logger } from '../src/logger';
import { shedRequestsTotal } from '../src/metrics';
import {
  AuthedRequest,
  clientVersionGate,
  clientVersionGateExempt,
  defaultErrorCode,
  errorHandler,
  h,
  HttpError,
  JWT_AUDIENCE,
  JWT_ISSUER,
  parseClientVersion,
  requireAuth,
  validate,
  validated,
} from '../src/middleware';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

function sign(payload: string | Record<string, unknown>, options: jwt.SignOptions = {}) {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '30d',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    ...options,
  });
}

describe('requireAuth', () => {
  const a = app();
  const me = (token?: string) => {
    const req = request(a).get('/auth/me');
    return token === undefined ? req : req.set('Authorization', token);
  };

  it('rejects a missing header, malformed schemes, and bearer values with extra credentials', async () => {
    for (const header of [
      undefined,
      'Basic abc123',
      'Bearer',
      'bearer validlooking',
      'Bearer token another-token',
      'Basic Bearer validlooking',
    ]) {
      const res = await me(header as string | undefined);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: 'Missing or invalid Authorization header',
        code: 'UNAUTHENTICATED',
      });
    }
  });

  it('accepts multiple RFC-compatible spaces between Bearer and the token', async () => {
    const { res: registration } = await registerUser(a);
    const response = await me(`Bearer  ${registration.body.token as string}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(registration.body.user.id);
  });

  it('rejects a non-string authorization value before token verification', async () => {
    const verify = vi.spyOn(jwt, 'verify');
    const req = {
      headers: { authorization: ['Bearer structurally-valid-token'] },
    } as unknown as AuthedRequest;
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    const next = vi.fn();

    try {
      await requireAuth(req, res as never, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing or invalid Authorization header',
        code: 'UNAUTHENTICATED',
      });
      expect(verify).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      verify.mockRestore();
    }
  });

  it('rejects malformed, wrongly-signed, and wrong-issuer tokens', async () => {
    for (const token of [
      'not-a-jwt',
      jwt.sign({ sub: randomUUID(), tv: 1 }, 'wrong-secret-but-long-enough-to-be-valid!', {
        algorithm: 'HS256',
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }),
      sign({ sub: randomUUID(), tv: 1 }, { issuer: 'someone-else' }),
      sign({ sub: randomUUID(), tv: 1 }, { audience: 'someone-else' }),
      sign({ sub: randomUUID(), tv: 1 }, { algorithm: 'HS384' }),
    ]) {
      const res = await me(`Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' });
    }
  });

  it('rejects well-formed tokens with an unexpected payload shape', async () => {
    for (const payload of [
      { tv: 1 }, // no sub
      { sub: 12345, tv: 1 }, // sub not a string
      { sub: randomUUID() }, // no tv
      { sub: randomUUID(), tv: '1' }, // tv not a number
      { sub: randomUUID(), tv: 0 }, // token versions are positive integers
      { sub: randomUUID(), tv: 1.5 }, // integer database versions only
    ]) {
      const res = await me(`Bearer ${sign(payload)}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    }
    // A string payload can never satisfy the issuer/audience check either.
    const stringToken = jwt.sign('a-plain-string-payload', config.jwtSecret, { algorithm: 'HS256' });
    const res = await me(`Bearer ${stringToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('rejects an otherwise valid signature that omitted the mandatory expiry claim', async () => {
    const tokenWithoutExpiry = jwt.sign({ sub: randomUUID(), tv: 1 }, config.jwtSecret, {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const res = await me(`Bearer ${tokenWithoutExpiry}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' });
  });

  it('requires the entire token subject to be exactly one UUID', async () => {
    const userId = randomUUID();
    for (const subject of [`prefix-${userId}`, `${userId}-suffix`]) {
      const res = await me(`Bearer ${sign({ sub: subject, tv: 1 })}`);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' });
    }
  });

  it('rejects tokens for unknown users and stale token versions', async () => {
    const unknown = await me(`Bearer ${sign({ sub: randomUUID(), tv: 1 })}`);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual({ error: 'Invalid token: user not found', code: 'UNAUTHENTICATED' });

    const { res } = await registerUser(a);
    const stale = await me(`Bearer ${sign({ sub: res.body.user.id, tv: 999 })}`);
    expect(stale.status).toBe(401);
    expect(stale.body).toEqual({
      error: 'Token no longer valid — please log in again',
      code: 'TOKEN_REVOKED',
    });
  });

  it('forwards a user lookup rejection exactly once without rewriting it as a 401', async () => {
    const databaseError = new Error('database unavailable');
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(databaseError as never);
    const req = {
      headers: { authorization: `Bearer ${sign({ sub: randomUUID(), tv: 1 })}` },
    } as AuthedRequest;
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    const next = vi.fn();

    try {
      await requireAuth(req, res as never, next);
      expect(next).toHaveBeenCalledOnce();
      expect(next).toHaveBeenCalledWith(databaseError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    } finally {
      query.mockRestore();
    }
  });

  it('rejects a coercible non-string token subject before querying PostgreSQL', async () => {
    const userId = randomUUID();
    const verify = vi.spyOn(jwt, 'verify').mockReturnValueOnce({
      sub: { toString: () => userId },
      tv: 1,
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as never);
    const query = vi.spyOn(pool, 'query');
    const req = { headers: { authorization: 'Bearer structurally-valid-token' } } as AuthedRequest;
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    const next = vi.fn();

    try {
      await requireAuth(req, res as never, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' });
      expect(query).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      query.mockRestore();
      verify.mockRestore();
    }
  });

  it('rejects a string payload returned by the verifier before querying PostgreSQL', async () => {
    const verify = vi.spyOn(jwt, 'verify').mockReturnValueOnce('string-payload' as never);
    const query = vi.spyOn(pool, 'query');
    const req = { headers: { authorization: 'Bearer structurally-valid-token' } } as AuthedRequest;
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    const next = vi.fn();

    try {
      await requireAuth(req, res as never, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' });
      expect(query).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      query.mockRestore();
      verify.mockRestore();
    }
  });

  it('never selects the password hash onto the request object', async () => {
    const { res: registered } = await registerUser(a);
    const original = pool.query.bind(pool);
    const texts: string[] = [];
    const query = vi.spyOn(pool, 'query').mockImplementation(((text: unknown, ...rest: unknown[]) => {
      if (typeof text === 'string') texts.push(text);
      return (original as (...args: unknown[]) => unknown)(text, ...rest);
    }) as never);

    try {
      const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${registered.body.token}`);
      expect(me.status).toBe(200);
      // The public profile still serializes every non-sensitive column...
      expect(me.body.user).toMatchObject({ id: registered.body.user.id, email: registered.body.user.email });
      // ...but the authenticated lookup itself must not fetch password_hash:
      // it would ride on req.user through every downstream handler, one
      // refactor away from leaking through a future log/serialization site.
      const authSelect = texts.find((text) => text.includes('FROM users WHERE id = $1'));
      expect(authSelect).toBeDefined();
      expect(authSelect).not.toMatch(/password_hash/i);
    } finally {
      query.mockRestore();
    }
  });
});

describe('validate', () => {
  const a = app();

  it('prefixes the first issue message with its joined path', async () => {
    const res = await request(a)
      .post('/auth/register')
      .send({ name: 'X', email: 'not-an-email', password: 'passw0rd123', nativeLanguage: 'te' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('email: a valid email is required');
  });

  it('validates query params with the same message shape', async () => {
    const { res } = await registerUser(a);
    const bad = await request(a)
      .get('/auth/me/data?cursor=not-a-uuid')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('cursor: cursor must be a valid UUID');
  });

  it('replaces req.body with the parsed (trimmed/lowercased) data', async () => {
    const res = await request(a)
      .post('/auth/register')
      .send({ name: '  Trim Me  ', email: '  UPPER@EXAMPLE.COM ', password: 'passw0rd123', nativeLanguage: 'te' });
    expect(res.status).toBe(201);
    expect(res.body.user.name).toBe('Trim Me');
    expect(res.body.user.email).toBe('upper@example.com');
  });

  it('replaces route params with transformed data and keeps root issue messages unprefixed', async () => {
    const a = express();
    a.get(
      '/items/:slug',
      validate({ params: z.object({ slug: z.string().transform((value) => value.toUpperCase()) }) }),
      (req, res) => res.json(req.params),
    );
    a.post(
      '/root-error',
      express.json(),
      validate({ body: z.object({ value: z.string() }).refine(() => false, 'root validation failed') }),
      (_req, res) => res.sendStatus(204),
    );
    a.get(
      '/query',
      validate({ query: z.object({ filter: z.string().transform((value) => value.toUpperCase()) }) }),
      (req, res) => res.json(req.query),
    );
    a.use(errorHandler);

    const transformed = await request(a).get('/items/lowercase');
    expect(transformed.status).toBe(200);
    expect(transformed.body).toEqual({ slug: 'LOWERCASE' });

    const transformedQuery = await request(a).get('/query?filter=lowercase');
    expect(transformedQuery.status).toBe(200);
    expect(transformedQuery.body).toEqual({ filter: 'LOWERCASE' });

    const rootError = await request(a).post('/root-error').send({ value: 'valid-shape' });
    expect(rootError.status).toBe(400);
    expect(rootError.body).toEqual({ error: 'root validation failed', code: 'VALIDATION_FAILED' });
  });

  it('joins every nested issue path segment with a dot', async () => {
    const a = express();
    a.use(express.json());
    a.post(
      '/nested',
      validate({ body: z.object({ parent: z.object({ child: z.string().min(2, 'child is too short') }) }) }),
      (_req, res) => res.sendStatus(204),
    );
    a.use(errorHandler);

    const res = await request(a)
      .post('/nested')
      .send({ parent: { child: 'x' } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'parent.child: child is too short', code: 'VALIDATION_FAILED' });
  });
});

describe('validated', () => {
  it('returns the exact parsed output validate() stored for the schema instance', async () => {
    const schema = z.object({ value: z.string().transform((value) => value.toUpperCase()) });
    const a = express();
    a.use(express.json());
    a.post('/echo', validate({ body: schema }), (req, res) => res.json(validated(req, schema)));
    a.use(errorHandler);

    const res = await request(a).post('/echo').send({ value: 'shout' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ value: 'SHOUT' });
  });

  it('retains every parsed output when one middleware validates multiple schemas', async () => {
    const paramsSchema = z.object({ slug: z.string().transform((value) => value.toUpperCase()) });
    const bodySchema = z.object({ value: z.string().transform((value) => value.trim()) });
    const a = express();
    a.use(express.json());
    a.post('/items/:slug', validate({ params: paramsSchema, body: bodySchema }), (req, res) => {
      res.json({
        params: validated(req, paramsSchema),
        body: validated(req, bodySchema),
      });
    });
    a.use(errorHandler);

    const res = await request(a).post('/items/example').send({ value: '  preserved  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      params: { slug: 'EXAMPLE' },
      body: { value: 'preserved' },
    });
  });

  it('throws loudly when a route reads a schema it never validated', async () => {
    const validatedSchema = z.object({ value: z.string() });
    const strangerSchema = z.object({ value: z.string() });
    const a = express();
    a.use(express.json());
    a.post(
      '/wrong',
      validate({ body: validatedSchema }),
      h(async (req, res) => res.json(validated(req, strangerSchema))),
    );
    a.use(errorHandler);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const res = await request(a).post('/wrong').send({ value: 'x' });
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      expect(error).toHaveBeenCalledWith(
        {
          err: expect.objectContaining({ message: 'validated() called for a schema this request did not validate' }),
          requestId: undefined,
        },
        'unhandled error',
      );
    } finally {
      error.mockRestore();
    }
  });
});

describe('clientVersionGate', () => {
  const a = app();
  const savedMinClientVersion = config.minClientVersion;

  afterEach(() => {
    config.minClientVersion = savedMinClientVersion;
  });

  it('parses dotted numeric versions and rejects junk', () => {
    expect(parseClientVersion('1.2.3')).toEqual([1, 2, 3]);
    expect(parseClientVersion(' 2.0 ')).toEqual([2, 0]);
    expect(parseClientVersion('7')).toEqual([7]);
    expect(parseClientVersion('1.2.3.4')).toBeUndefined();
    expect(parseClientVersion('v1.2')).toBeUndefined();
    expect(parseClientVersion('1..2')).toBeUndefined();
    expect(parseClientVersion('')).toBeUndefined();
  });

  it('rejects an older client with the exact 426 upgrade contract', async () => {
    config.minClientVersion = '1.4.0';
    const res = await request(a).get('/client-config').set('X-Client-Version', '1.3.9');
    expect(res.status).toBe(426);
    expect(res.body).toEqual({
      error: 'This app version is no longer supported; please update it',
      code: 'CLIENT_UPGRADE_REQUIRED',
    });
  });

  it('passes equal and newer versions, comparing missing segments as zero', async () => {
    config.minClientVersion = '1.4';
    expect((await request(a).get('/client-config').set('X-Client-Version', '1.4.0')).status).toBe(200);
    expect((await request(a).get('/client-config').set('X-Client-Version', '1.4')).status).toBe(200);
    expect((await request(a).get('/client-config').set('X-Client-Version', '2')).status).toBe(200);
    expect((await request(a).get('/client-config').set('X-Client-Version', '1.10.0')).status).toBe(200);
    expect((await request(a).get('/client-config').set('X-Client-Version', '1.3.9')).status).toBe(426);
  });

  it('passes through when disabled but rejects an absent or malformed product-route header', async () => {
    config.minClientVersion = undefined;
    expect((await request(a).get('/client-config').set('X-Client-Version', '0.0.1')).status).toBe(200);

    config.minClientVersion = '1.0.0';
    for (const header of [undefined, 'not-a-version']) {
      const pending = request(a).get('/client-config');
      const response = await (header === undefined ? pending : pending.set('X-Client-Version', header));
      expect(response.status).toBe(426);
      expect(response.body).toEqual({
        error: 'This app version is no longer supported; please update it',
        code: 'CLIENT_UPGRADE_REQUIRED',
      });
    }
  });

  it('refuses traffic when the configured minimum client version is unparseable', async () => {
    config.minClientVersion = 'not.a.version';
    const res = await request(a).get('/client-config');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
  });

  it('keeps operational probes usable regardless of version header', async () => {
    config.minClientVersion = '9.0.0';
    for (const path of ['/health', '/health/']) {
      expect((await request(a).get(path)).status).toBe(200);
      expect((await request(a).get(path).set('X-Client-Version', 'malformed')).status).toBe(200);
    }
  });

  it('is exported as standalone middleware that forwards the 426 as an HttpError', () => {
    config.minClientVersion = '2.0.0';
    const next = vi.fn();
    clientVersionGate({ headers: { 'x-client-version': '1.9.9' } } as never, {} as never, next);
    expect(next).toHaveBeenCalledOnce();
    const forwarded = next.mock.calls[0][0] as HttpError;
    expect(forwarded).toBeInstanceOf(HttpError);
    expect(forwarded.status).toBe(426);
    expect(forwarded.code).toBe('CLIENT_UPGRADE_REQUIRED');
  });

  it.each([
    ['GET', '/health'],
    ['GET', '/health/'],
    ['HEAD', '/health'],
    ['HEAD', '/HEALTH/'],
    ['GET', '/ready'],
    ['GET', '/ready/'],
    ['GET', '/metrics'],
    ['GET', '/metrics/'],
    ['POST', '/auth/logout'],
    ['POST', '/auth/logout/'],
    ['POST', '/AUTH/LOGOUT'],
    ['DELETE', '/auth/account'],
    ['DELETE', '/auth/account/'],
    ['GET', '/auth/me/data'],
    ['GET', '/recordings/export'],
    ['GET', '/recordings/export/'],
    ['HEAD', '/RECORDINGS/EXPORT/'],
    ['DELETE', '/recordings'],
    ['DELETE', '/recordings/550e8400-e29b-41d4-a716-446655440000'],
    ['DELETE', '/recordings/550e8400-e29b-41d4-a716-446655440000/'],
  ])('keeps the stable privacy exit %s %s available to an outdated client', (method, path) => {
    expect(clientVersionGateExempt(method, path)).toBe(true);
    config.minClientVersion = '2.0.0';
    const next = vi.fn();
    clientVersionGate({ method, path, headers: { 'x-client-version': '1.0.0' } } as never, {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['GET', '/auth/logout'],
    ['POST', '/auth/account'],
    ['POST', '/auth/me/data'],
    ['POST', '/recordings'],
    ['GET', '/recordings/550e8400-e29b-41d4-a716-446655440000'],
    ['DELETE', '/recordings/not-a-uuid'],
    ['GET', '/health//'],
    ['POST', '/ready'],
    ['GET', '/practice/question'],
  ])('does not exempt unrelated or wrong-method route %s %s', (method, path) => {
    expect(clientVersionGateExempt(method, path)).toBe(false);
  });
});

describe('errorHandler', () => {
  function buildApp() {
    const a = express();
    a.use(express.json());
    a.get(
      '/http-error',
      h(async () => {
        throw new HttpError(418, 'teapot', { hint: 'use coffee' });
      }),
    );
    a.get(
      '/retry-seconds',
      h(async () => {
        throw new HttpError(503, 'busy', { retryAfterSeconds: 7 }, 'CAPACITY_BUSY');
      }),
    );
    a.get(
      '/retry-hours',
      h(async () => {
        throw new HttpError(429, 'capped', { retryAfterHours: 3 }, 'DAILY_LIMIT');
      }),
    );
    a.get(
      '/reserved-extra',
      h(async () => {
        throw new HttpError(
          409,
          'canonical message',
          { error: 'spoofed message', code: 'INTERNAL', hint: 'preserved' },
          'STATE_CHANGED',
        );
      }),
    );
    a.get('/multer-size', (_req, _res, next) => next(new multer.MulterError('LIMIT_FILE_SIZE')));
    a.get('/multer-other', (_req, _res, next) => next(new multer.MulterError('LIMIT_FIELD_COUNT')));
    a.get('/request-aborted', (_req, _res, next) => next({ type: 'request.aborted' }));
    a.get('/request-size-invalid', (_req, _res, next) => next({ type: 'request.size.invalid' }));
    // Parser-shaped failures the generic 4xx fallback must NOT claim.
    a.get('/parser-server-status', (_req, _res, next) => next({ status: 500, expose: true }));
    a.get('/parser-status-below-client-range', (_req, _res, next) => next({ status: 399, expose: true }));
    a.get('/parser-not-exposed', (_req, _res, next) => next({ status: 400, expose: false }));
    a.get('/parser-status-not-a-number', (_req, _res, next) => next({ status: '429', expose: true }));
    a.get(
      '/boom',
      h(async () => {
        throw new Error('boom');
      }),
    );
    a.use(errorHandler);
    return a;
  }

  it('maps HttpError to its status and spreads extra fields', async () => {
    const res = await request(buildApp()).get('/http-error');
    expect(res.status).toBe(418);
    expect(res.body).toEqual({ error: 'teapot', code: 'VALIDATION_FAILED', hint: 'use coffee' });
    // No retry extras: the uniform contract must not invent a header.
    expect(res.headers['retry-after']).toBeUndefined();
  });

  it('never lets HttpError extras overwrite the reserved error contract fields', async () => {
    const res = await request(buildApp()).get('/reserved-extra');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'canonical message', code: 'STATE_CHANGED', hint: 'preserved' });
  });

  it('advertises Retry-After uniformly for second- and hour-denominated retry extras', async () => {
    const seconds = await request(buildApp()).get('/retry-seconds');
    expect(seconds.status).toBe(503);
    expect(seconds.headers['retry-after']).toBe('7');
    expect(seconds.body).toEqual({ error: 'busy', code: 'CAPACITY_BUSY', retryAfterSeconds: 7 });

    const hours = await request(buildApp()).get('/retry-hours');
    expect(hours.status).toBe(429);
    expect(hours.headers['retry-after']).toBe('10800'); // 3 hours in seconds
    expect(hours.body).toEqual({ error: 'capped', code: 'DAILY_LIMIT', retryAfterHours: 3 });
  });

  it('defaults missing codes by status family and keeps explicit codes', () => {
    expect(defaultErrorCode(400)).toBe('VALIDATION_FAILED');
    expect(defaultErrorCode(401)).toBe('UNAUTHENTICATED');
    expect(defaultErrorCode(403)).toBe('FORBIDDEN');
    expect(defaultErrorCode(404)).toBe('NOT_FOUND');
    expect(defaultErrorCode(409)).toBe('VALIDATION_FAILED');
    expect(defaultErrorCode(418)).toBe('VALIDATION_FAILED');
    expect(defaultErrorCode(429)).toBe('RATE_LIMITED');
    expect(defaultErrorCode(500)).toBe('INTERNAL');
    expect(defaultErrorCode(503)).toBe('INTERNAL');

    expect(new HttpError(409, 'x', 'QUESTION_MISMATCH').code).toBe('QUESTION_MISMATCH');
    expect(new HttpError(409, 'x', { a: 1 }, 'STATE_CHANGED')).toMatchObject({
      extra: { a: 1 },
      code: 'STATE_CHANGED',
    });
    expect(new HttpError(418, 'x').code).toBeUndefined();
    expect(new HttpError(418, 'x', { a: 1 }).extra).toEqual({ a: 1 });
  });

  it('maps MulterError LIMIT_FILE_SIZE to 413 and other codes to 400', async () => {
    const size = await request(buildApp()).get('/multer-size');
    expect(size.status).toBe(413);
    expect(size.body).toEqual({ error: 'File too large (max 25MB)', code: 'AUDIO_TOO_LARGE' });

    const other = await request(buildApp()).get('/multer-other');
    expect(other.status).toBe(400);
    // Static message by design: multer embeds the client-controlled field
    // name in LIMIT_UNEXPECTED_FILE text, so it must not be reflected.
    expect(other.body).toEqual({ error: 'Invalid multipart upload', code: 'VALIDATION_FAILED' });
  });

  it('maps malformed JSON bodies to 400 instead of a misleading 500', async () => {
    const res = await request(buildApp()).post('/anything').set('Content-Type', 'application/json').send('{ not json');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Request body is not valid JSON', code: 'VALIDATION_FAILED' });
  });

  it('sheds an exhausted PostgreSQL pool with its exact log, metric, retry, and response contract', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const increment = vi.spyOn(shedRequestsTotal, 'inc').mockImplementation(() => undefined as never);
    const req = { id: 'pool-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = {
      writableEnded: false,
      destroyed: false,
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as express.Response;

    try {
      errorHandler(new Error('timeout exceeded when trying to connect'), req, res, vi.fn());
      expect(warn).toHaveBeenCalledWith({ requestId: 'pool-request' }, 'database pool saturated; shedding request');
      expect(increment).toHaveBeenCalledWith({ reason: 'pool_saturated' });
      expect(res.set).toHaveBeenCalledWith('Retry-After', '5');
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server is busy, please try again shortly',
        code: 'POOL_SATURATED',
        retryAfterSeconds: 5,
      });
    } finally {
      increment.mockRestore();
      warn.mockRestore();
    }
  });

  it('still sheds a pool timeout when the driver message differs only in case', () => {
    // pg-pool exposes no error code for this condition, so the discriminator
    // is unavoidably textual; it must tolerate minor wording drift, and a pg
    // bump that rewords the message entirely should fail HERE first.
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const increment = vi.spyOn(shedRequestsTotal, 'inc').mockImplementation(() => undefined as never);
    const req = { id: 'pool-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = {
      writableEnded: false,
      destroyed: false,
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as express.Response;

    try {
      errorHandler(new Error('Timeout Exceeded When Trying To Connect'), req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server is busy, please try again shortly',
        code: 'POOL_SATURATED',
        retryAfterSeconds: 5,
      });
    } finally {
      increment.mockRestore();
      warn.mockRestore();
    }
  });

  it('sheds a PostgreSQL lock-timeout error as retryable 503 instead of a 500', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const increment = vi.spyOn(shedRequestsTotal, 'inc').mockImplementation(() => undefined as never);
    const req = { id: 'lock-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = {
      writableEnded: false,
      destroyed: false,
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as express.Response;
    const lockTimeout = new Error('canceling statement due to lock timeout') as Error & { code: string };
    lockTimeout.code = '55P03';

    try {
      errorHandler(lockTimeout, req, res, vi.fn());
      expect(warn).toHaveBeenCalledWith(
        { requestId: 'lock-request', err: expect.anything() },
        'database lock wait or statement timed out; shedding request',
      );
      expect(increment).toHaveBeenCalledWith({ reason: 'db_lock_timeout' });
      expect(res.set).toHaveBeenCalledWith('Retry-After', '5');
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server is busy, please try again shortly',
        code: 'POOL_SATURATED',
        retryAfterSeconds: 5,
      });
    } finally {
      increment.mockRestore();
      warn.mockRestore();
    }
  });

  it('sheds a PostgreSQL statement timeout as retryable 503', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const increment = vi.spyOn(shedRequestsTotal, 'inc').mockImplementation(() => undefined as never);
    const req = { id: 'stmt-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = {
      writableEnded: false,
      destroyed: false,
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as express.Response;
    const statementTimeout = new Error('canceling statement due to statement timeout') as Error & { code: string };
    statementTimeout.code = '57014';

    try {
      errorHandler(statementTimeout, req, res, vi.fn());
      expect(increment).toHaveBeenCalledWith({ reason: 'db_lock_timeout' });
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Server is busy, please try again shortly',
        code: 'POOL_SATURATED',
        retryAfterSeconds: 5,
      });
    } finally {
      increment.mockRestore();
      warn.mockRestore();
    }
  });

  it('anchored pool-timeout matching: prefixed or suffixed driver messages stay 500', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const req = { id: 'anchor-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = () =>
      ({
        writableEnded: false,
        destroyed: false,
        set: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      }) as unknown as express.Response;
    const statusOf = (err: Error) => {
      const r = res();
      errorHandler(err, req, r, vi.fn());
      return (r.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    };
    try {
      expect(statusOf(new Error('x timeout exceeded when trying to connect'))).toBe(500);
      expect(statusOf(new Error('timeout exceeded when trying to connectx'))).toBe(500);
      expect(statusOf(new Error('timeout exceeded when trying to connect'))).toBe(503);
    } finally {
      error.mockRestore();
    }
  });

  it('requires the statement-timeout message even when the SQLSTATE arm is widened', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const req = { id: 'widened-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = () =>
      ({
        writableEnded: false,
        destroyed: false,
        set: vi.fn().mockReturnThis(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      }) as unknown as express.Response;
    try {
      const foreignCode = new Error('canceling statement due to statement timeout') as Error & { code: string };
      foreignCode.code = '58000';
      const r1 = res();
      errorHandler(foreignCode, req, r1, vi.fn());
      expect((r1.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(500);
    } finally {
      error.mockRestore();
    }
  });

  it('forwards the exact invalid-configuration error from the standalone gate', () => {
    config.minClientVersion = 'garbage!';
    const next = vi.fn();
    clientVersionGate({ headers: {} } as never, {} as never, next);
    expect(next).toHaveBeenCalledOnce();
    const forwarded = next.mock.calls[0][0] as Error;
    expect(forwarded).toBeInstanceOf(Error);
    expect(forwarded.message).toBe('configured minimum client version is invalid');
  });

  it('keeps a non-Error object with a lock-timeout shape on the generic 500 path', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const req = { id: 'shape-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = {
      writableEnded: false,
      destroyed: false,
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as express.Response;
    try {
      errorHandler({ code: '55P03', message: 'canceling statement due to lock timeout' }, req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error', code: 'INTERNAL' });
    } finally {
      error.mockRestore();
    }
  });

  it('keeps a user-initiated query cancellation on the generic 500 path', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const req = { id: 'cancel-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = {
      writableEnded: false,
      destroyed: false,
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as express.Response;
    const userCancel = new Error('canceling statement due to user request') as Error & { code: string };
    userCancel.code = '57014';

    try {
      errorHandler(userCancel, req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error', code: 'INTERNAL' });
    } finally {
      error.mockRestore();
    }
  });

  it('ends a partial response instead of double-writing after headers were sent', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const req = { id: 'flushed-request', socket: { destroyed: false } } as unknown as express.Request;
    const res = {
      writableEnded: false,
      destroyed: false,
      headersSent: true,
      set: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      end: vi.fn(),
    } as unknown as express.Response;

    try {
      errorHandler(new HttpError(500, 'late failure'), req, res, vi.fn());
      // res.status().json() after headersSent throws ERR_HTTP_HEADERS_SENT and
      // would fall through to Express's default socket-destroying handler; the
      // only safe action is ending the already-started response.
      expect(res.end).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledWith(
        { err: expect.anything(), requestId: 'flushed-request' },
        'error after response headers were sent; ending partial response',
      );
    } finally {
      error.mockRestore();
    }
  });

  it('maps an oversized JSON body to 413 without exposing parser details', async () => {
    const res = await request(buildApp())
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ value: 'x'.repeat(110 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Request body is too large', code: 'VALIDATION_FAILED' });
  });

  it('maps unsupported JSON encodings and charsets to 415', async () => {
    const encoding = await request(buildApp())
      .post('/anything')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'made-up')
      .send('{"ok":true}');
    expect(encoding.status).toBe(415);
    expect(encoding.body).toEqual({ error: 'Unsupported request body encoding', code: 'VALIDATION_FAILED' });

    const charset = await request(buildApp())
      .post('/anything')
      .set('Content-Type', 'application/json; charset=iso-8859-1')
      .send('{"ok":true}');
    expect(charset.status).toBe(415);
    expect(charset.body).toEqual({ error: 'Unsupported request body encoding', code: 'VALIDATION_FAILED' });
  });

  it.each(['/request-aborted', '/request-size-invalid'])(
    'maps parser protocol failure %s to a stable 400',
    async (path) => {
      const res = await request(buildApp()).get(path);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid request body', code: 'VALIDATION_FAILED' });
    },
  );

  it('maps a corrupt Content-Encoding body to 400 without an error-level log', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      // body-parser inflates by default and wraps the zlib failure as an
      // exposed 400 carrying no `type`, so only the generic parser fallback
      // keeps this plainly malformed request off the INTERNAL path.
      const res = await request(buildApp())
        .post('/anything')
        .set('Content-Type', 'application/json')
        .set('Content-Encoding', 'gzip')
        .send('not gzip at all');
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid request body', code: 'VALIDATION_FAILED' });
      // A client protocol error must never mint a fake 5xx or a logged stack.
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it.each([
    ['a parser status outside the client range', '/parser-server-status'],
    ['a parser status below the client range', '/parser-status-below-client-range'],
    ['an error the parser did not mark exposable', '/parser-not-exposed'],
    ['a parser status that is not a number', '/parser-status-not-a-number'],
  ])('keeps %s on the logged 500 path', async (_condition, path) => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const res = await request(buildApp()).get(path);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      expect(error).toHaveBeenCalledWith({ err: expect.anything(), requestId: undefined }, 'unhandled error');
    } finally {
      error.mockRestore();
    }
  });

  it('maps unexpected errors to a generic 500', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const res = await request(buildApp()).get('/boom');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      expect(error).toHaveBeenCalledWith({ err: expect.any(Error), requestId: undefined }, 'unhandled error');
    } finally {
      error.mockRestore();
    }
  });

  it('keeps a stable HttpError identity for routing and diagnostics', () => {
    expect(new HttpError(418, 'teapot').name).toBe('HttpError');
  });

  it.each([
    { condition: 'response already ended', writableEnded: true, responseDestroyed: false, socketDestroyed: false },
    { condition: 'response destroyed', writableEnded: false, responseDestroyed: true, socketDestroyed: false },
    { condition: 'socket destroyed', writableEnded: false, responseDestroyed: false, socketDestroyed: true },
  ])(
    'drops the error response quietly when the $condition',
    ({ writableEnded, responseDestroyed, socketDestroyed }) => {
      const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
      const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
      try {
        const res = {
          writableEnded,
          destroyed: responseDestroyed,
          end: vi.fn(),
          status: vi.fn().mockReturnThis(),
          json: vi.fn(),
          set: vi.fn(),
        } as unknown as express.Response;
        const req = { socket: { destroyed: socketDestroyed }, id: 'req-gone' } as unknown as express.Request;
        errorHandler(new Error('ENOENT from the temp-file close race'), req, res, vi.fn());
        expect(info).toHaveBeenCalledWith(
          { err: expect.any(Error), requestId: 'req-gone' },
          'client gone before error response; dropping it',
        );
        expect(error).not.toHaveBeenCalled();
        if (!writableEnded && !responseDestroyed) expect(res.end).toHaveBeenCalledOnce();
        else expect(res.end).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      } finally {
        info.mockRestore();
        error.mockRestore();
      }
    },
  );
});
