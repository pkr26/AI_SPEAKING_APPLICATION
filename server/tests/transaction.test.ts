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
  it('returns the exact 404 when the served question disappears before the diagnostic claim', async () => {
    const user: UserRow = {
      id: randomUUID(),
      name: 'Missing Question Test',
      email: 'missing-question@example.com',
      password_hash: 'not-used',
      native_language: 'te',
      cefr_level: null,
      diagnostic_completed: false,
      token_version: 1,
      created_at: new Date().toISOString(),
    };
    const questionId = randomUUID();
    const requestId = randomUUID();
    const token = jwt.sign({ sub: user.id, tv: user.token_version }, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '1h',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const requestClaimClient = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN' || text === 'COMMIT') return { rows: [], rowCount: null };
        if (text.includes('DELETE FROM assessment_requests')) return { rows: [], rowCount: 0 };
        if (text.includes('INSERT INTO assessment_requests')) return { rows: [], rowCount: 1 };
        throw new Error(`unexpected request-claim query: ${text}`);
      }),
      release: vi.fn(),
    };
    const diagnosticClient = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN' || text === 'ROLLBACK') return { rows: [], rowCount: null };
        if (text.includes('SELECT * FROM diagnostic_state')) {
          return {
            rows: [
              {
                user_id: user.id,
                low_idx: 0,
                high_idx: 5,
                questions_asked: 0,
                current_question_id: questionId,
                processing_question_id: null,
                processing_claim_id: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (text.includes('SELECT * FROM questions')) return { rows: [], rowCount: 0 };
        throw new Error(`unexpected diagnostic query: ${text}`);
      }),
      release: vi.fn(),
    };
    vi.spyOn(pool, 'query').mockImplementation(async (text: string) => {
      if (text === 'SELECT * FROM users WHERE id = $1') return { rows: [user], rowCount: 1 } as never;
      if (text === 'SELECT 1 FROM questions WHERE id = $1') return { rows: [{}], rowCount: 1 } as never;
      if (text.includes('DELETE FROM assessment_requests')) return { rows: [], rowCount: 1 } as never;
      throw new Error(`unexpected pool query: ${text}`);
    });
    vi.spyOn(pool, 'connect')
      .mockResolvedValueOnce(requestClaimClient as never)
      .mockResolvedValueOnce(diagnosticClient as never);
    const pass: RequestHandler = (_req, _res, next) => next();
    const direct = express();
    direct.use('/diagnostic', createDiagnosticRouter({ assess: pass, assessIpDaily: pass, assessAbortGuard: pass } as Limiters));
    direct.use(errorHandler);

    const response = await request(direct)
      .post('/diagnostic/answer')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', Buffer.from('00000018667479704d34412000000000', 'hex'), {
        filename: 'answer.m4a',
        contentType: 'audio/mp4',
      })
      .field('questionId', questionId)
      .field('requestId', requestId);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Question not found' });
    expect(requestClaimClient.release).toHaveBeenCalledOnce();
    expect(diagnosticClient.release).toHaveBeenCalledOnce();
    expect(diagnosticClient.query.mock.calls.map(([text]) => text)).toEqual([
      'BEGIN',
      expect.stringContaining('SELECT * FROM diagnostic_state'),
      expect.stringContaining('SELECT * FROM questions'),
      'ROLLBACK',
    ]);
  });

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
    direct.use('/diagnostic', createDiagnosticRouter({ assess: pass, assessIpDaily: pass, assessAbortGuard: pass } as Limiters));
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
