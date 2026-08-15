import { afterAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { config } from '../src/config';
import { logger } from '../src/logger';
import {
  AuthedRequest,
  errorHandler,
  h,
  HttpError,
  JWT_AUDIENCE,
  JWT_ISSUER,
  requireAuth,
  validate,
} from '../src/middleware';
import { app, pool, registerUser } from './helpers';

afterAll(async () => {
  await pool.end();
});

function sign(payload: string | Record<string, unknown>, options: jwt.SignOptions = {}) {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
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

  it('rejects a missing header, a non-Bearer scheme, and a bare Bearer scheme', async () => {
    for (const header of [undefined, 'Basic abc123', 'Bearer', 'bearer validlooking']) {
      const res = await me(header as string | undefined);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing or invalid Authorization header');
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
      expect(res.body.error).toBe('Invalid or expired token');
    }
  });

  it('rejects well-formed tokens with an unexpected payload shape', async () => {
    for (const payload of [
      { tv: 1 }, // no sub
      { sub: 12345, tv: 1 }, // sub not a string
      { sub: randomUUID() }, // no tv
      { sub: randomUUID(), tv: '1' }, // tv not a number
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

  it('rejects tokens for unknown users and stale token versions', async () => {
    const unknown = await me(`Bearer ${sign({ sub: randomUUID(), tv: 1 })}`);
    expect(unknown.status).toBe(401);
    expect(unknown.body.error).toBe('Invalid token: user not found');

    const { res } = await registerUser(a);
    const stale = await me(`Bearer ${sign({ sub: res.body.user.id, tv: 999 })}`);
    expect(stale.status).toBe(401);
    expect(stale.body.error).toContain('no longer valid');
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
    } as never);
    const query = vi.spyOn(pool, 'query');
    const req = { headers: { authorization: 'Bearer structurally-valid-token' } } as AuthedRequest;
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    const next = vi.fn();

    try {
      await requireAuth(req, res as never, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(query).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    } finally {
      query.mockRestore();
      verify.mockRestore();
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
    a.use(errorHandler);

    const transformed = await request(a).get('/items/lowercase');
    expect(transformed.status).toBe(200);
    expect(transformed.body).toEqual({ slug: 'LOWERCASE' });

    const rootError = await request(a).post('/root-error').send({ value: 'valid-shape' });
    expect(rootError.status).toBe(400);
    expect(rootError.body).toEqual({ error: 'root validation failed' });
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
    a.get('/multer-size', (_req, _res, next) => next(new multer.MulterError('LIMIT_FILE_SIZE')));
    a.get('/multer-other', (_req, _res, next) => next(new multer.MulterError('LIMIT_FIELD_COUNT')));
    a.get('/request-aborted', (_req, _res, next) => next({ type: 'request.aborted' }));
    a.get('/request-size-invalid', (_req, _res, next) => next({ type: 'request.size.invalid' }));
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
    expect(res.body).toEqual({ error: 'teapot', hint: 'use coffee' });
  });

  it('maps MulterError LIMIT_FILE_SIZE to 413 and other codes to 400', async () => {
    const size = await request(buildApp()).get('/multer-size');
    expect(size.status).toBe(413);
    expect(size.body.error).toBe('File too large (max 25MB)');

    const other = await request(buildApp()).get('/multer-other');
    expect(other.status).toBe(400);
    expect(typeof other.body.error).toBe('string');
  });

  it('maps malformed JSON bodies to 400 instead of a misleading 500', async () => {
    const res = await request(buildApp()).post('/anything').set('Content-Type', 'application/json').send('{ not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body is not valid JSON');
  });

  it('maps an oversized JSON body to 413 without exposing parser details', async () => {
    const res = await request(buildApp())
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ value: 'x'.repeat(110 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Request body is too large' });
  });

  it('maps unsupported JSON encodings and charsets to 415', async () => {
    const encoding = await request(buildApp())
      .post('/anything')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'made-up')
      .send('{"ok":true}');
    expect(encoding.status).toBe(415);
    expect(encoding.body).toEqual({ error: 'Unsupported request body encoding' });

    const charset = await request(buildApp())
      .post('/anything')
      .set('Content-Type', 'application/json; charset=iso-8859-1')
      .send('{"ok":true}');
    expect(charset.status).toBe(415);
    expect(charset.body).toEqual({ error: 'Unsupported request body encoding' });
  });

  it.each(['/request-aborted', '/request-size-invalid'])(
    'maps parser protocol failure %s to a stable 400',
    async (path) => {
      const res = await request(buildApp()).get(path);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Invalid request body' });
    },
  );

  it('maps unexpected errors to a generic 500', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const res = await request(buildApp()).get('/boom');
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
      expect(error).toHaveBeenCalledWith({ err: expect.any(Error), requestId: undefined }, 'unhandled error');
    } finally {
      error.mockRestore();
    }
  });

  it('keeps a stable HttpError identity for routing and diagnostics', () => {
    expect(new HttpError(418, 'teapot').name).toBe('HttpError');
  });

  it('drops the error response quietly when the client is already gone', () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      const res = {
        writableEnded: false,
        destroyed: false,
        end: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        set: vi.fn(),
      } as unknown as express.Response;
      const req = { socket: { destroyed: true }, id: 'req-gone' } as unknown as express.Request;
      errorHandler(new Error('ENOENT from the temp-file close race'), req, res, vi.fn());
      expect(info).toHaveBeenCalledWith(
        { err: expect.any(Error), requestId: 'req-gone' },
        'client gone before error response; dropping it',
      );
      expect(error).not.toHaveBeenCalled();
      expect(res.end).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    } finally {
      info.mockRestore();
      error.mockRestore();
    }
  });
});
