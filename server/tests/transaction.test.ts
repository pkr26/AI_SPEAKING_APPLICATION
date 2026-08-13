import { randomUUID } from 'crypto';
import express, { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config';
import { pool } from '../src/db';
import { createDiagnosticRouter } from '../src/diagnostic';
import { errorHandler, HttpError, JWT_AUDIENCE, JWT_ISSUER, UserRow } from '../src/middleware';
import { Limiters } from '../src/rate-limit';
import { releaseTransactionClient, rollbackTransaction } from '../src/transaction';

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await pool.end();
});

describe('transaction rollback error precedence', () => {
  it('completes a standalone rollback and releases its lease normally', async () => {
    const successful = {
      query: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
    };
    await expect(rollbackTransaction(successful)).resolves.toBeUndefined();
    releaseTransactionClient(successful);
    expect(successful.query).toHaveBeenCalledWith('ROLLBACK');
    expect(successful.release).toHaveBeenCalledOnce();
    expect(successful.release).toHaveBeenCalledWith(undefined);
  });

  it('discards a standalone client once and propagates its rollback failure', async () => {
    const rollbackError = new Error('rollback failed');
    const failed = {
      query: vi.fn().mockRejectedValue(rollbackError),
      release: vi.fn(),
    };
    await expect(rollbackTransaction(failed)).rejects.toBe(rollbackError);
    releaseTransactionClient(failed);
    expect(failed.release).toHaveBeenCalledOnce();
    expect(failed.release).toHaveBeenCalledWith(rollbackError);
  });

  it('normalizes a non-Error rollback failure before poisoning the pool lease', async () => {
    const rollbackFailure = 'socket closed';
    const failed = {
      query: vi.fn().mockRejectedValue(rollbackFailure),
      release: vi.fn(),
    };

    await expect(rollbackTransaction(failed)).rejects.toBe(rollbackFailure);
    expect(failed.release).toHaveBeenCalledOnce();
    const releaseError = failed.release.mock.calls[0][0];
    expect(releaseError).toBeInstanceOf(Error);
    expect(releaseError).toMatchObject({
      message: 'PostgreSQL transaction rollback failed',
      cause: rollbackFailure,
    });
  });

  it('preserves the primary error even if the poisoned release closure throws', async () => {
    const primaryError = new Error('primary transaction failure');
    const rollbackError = new Error('rollback failed');
    const releaseError = new Error('release failed');
    const failed = {
      query: vi.fn().mockRejectedValue(rollbackError),
      release: vi.fn(() => {
        throw releaseError;
      }),
    };

    await expect(
      rollbackTransaction(failed, { value: primaryError }).finally(() => releaseTransactionClient(failed)),
    ).rejects.toBe(primaryError);
    expect(failed.release).toHaveBeenCalledOnce();
    expect(failed.release).toHaveBeenCalledWith(rollbackError);
  });

  it('treats a fresh pg-pool release closure as a new lease on a reused client object', () => {
    const firstRelease = vi.fn();
    const client = {
      query: vi.fn().mockResolvedValue(undefined),
      release: firstRelease,
    };
    releaseTransactionClient(client);

    const secondRelease = vi.fn();
    client.release = secondRelease;
    releaseTransactionClient(client);

    expect(firstRelease).toHaveBeenCalledOnce();
    expect(secondRelease).toHaveBeenCalledOnce();
  });

  it.each(['successful rollback', 'failed rollback'])(
    'rethrows the primary error and finalizes once after a %s',
    async (rollbackOutcome) => {
      const primaryError = new Error('primary transaction failure');
      const rollbackError = new Error('rollback failed');
      const client = {
        query: vi
          .fn()
          .mockImplementation(() =>
            rollbackOutcome === 'successful rollback' ? Promise.resolve(undefined) : Promise.reject(rollbackError),
          ),
        release: vi.fn(),
      };

      await expect(
        rollbackTransaction(client, { value: primaryError }).finally(() => releaseTransactionClient(client)),
      ).rejects.toBe(primaryError);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK');
      expect(client.release).toHaveBeenCalledOnce();
      expect(client.release).toHaveBeenCalledWith(
        rollbackOutcome === 'successful rollback' ? undefined : rollbackError,
      );
    },
  );
});

describe('diagnostic transaction rollback precedence', () => {
  it('keeps the GET /next transaction error when rollback also fails and releases the client', async () => {
    const user: UserRow = {
      id: randomUUID(),
      name: 'Rollback Test',
      email: 'rollback@example.com',
      password_hash: 'not-used',
      native_language: 'te',
      cefr_level: null,
      diagnostic_completed: false,
      token_version: 1,
      created_at: new Date().toISOString(),
    };
    const token = jwt.sign({ sub: user.id, tv: user.token_version }, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const primaryError = new HttpError(409, 'diagnostic transaction failed');
    const rollbackError = new Error('rollback failed');
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN') return { rows: [] };
        if (text === 'ROLLBACK') throw rollbackError;
        throw primaryError;
      }),
      release: vi.fn(),
    };
    vi.spyOn(pool, 'query').mockResolvedValue({ rows: [user] } as never);
    vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    const pass: RequestHandler = (_req, _res, next) => next();
    const direct = express();
    direct.use('/diagnostic', createDiagnosticRouter({ assess: pass } as Limiters));
    direct.use(errorHandler);

    const response = await request(direct).get('/diagnostic/next').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: 'diagnostic transaction failed' });
    expect(client.query.mock.calls.map(([text]) => text)).toEqual([
      'BEGIN',
      expect.stringContaining('SELECT * FROM diagnostic_state'),
      'ROLLBACK',
    ]);
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.release).toHaveBeenCalledWith(rollbackError);
  });
});
