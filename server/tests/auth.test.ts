import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';
import request from 'supertest';
import { assertDailyAssessmentCapacity } from '../src/assess';
import { createAuthRouter } from '../src/auth';
import { config } from '../src/config';
import { errorHandler } from '../src/middleware';
import { buildLimiters } from '../src/rate-limit';
import { app, createClosedPracticeCycle, pool, registerUser, STRONG_PASSWORD, uniqueEmail } from './helpers';

afterAll(async () => {
  await pool.end();
});

/**
 * Hold a user's row until the request has authenticated, verified its password,
 * and issued its guarded mutation. The blocker can then change just one piece
 * of authentication state before releasing the write, making TOCTOU coverage
 * deterministic instead of relying on bcrypt or scheduler timing.
 */
async function runAuthenticationWriteRace<T>(options: {
  userId: string;
  matchesWrite: (sql: string) => boolean;
  startRequest: () => PromiseLike<T>;
  mutateBeforeRelease: (client: PoolClient) => Promise<unknown>;
  expectedWrites?: number;
}): Promise<T> {
  const blocker = await pool.connect();
  let transactionOpen = false;
  let querySpy: ReturnType<typeof vi.spyOn> | undefined;
  try {
    await blocker.query('BEGIN');
    transactionOpen = true;
    await blocker.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [options.userId]);

    const originalQuery = pool.query.bind(pool);
    let observedWrites = 0;
    querySpy = vi.spyOn(pool, 'query').mockImplementation(((text: unknown, ...rest: unknown[]) => {
      if (typeof text === 'string' && options.matchesWrite(text)) observedWrites += 1;
      return (originalQuery as (...args: unknown[]) => unknown)(text, ...rest);
    }) as never);

    const responsePromise = Promise.resolve(options.startRequest());
    await vi.waitFor(
      () => {
        expect(observedWrites).toBeGreaterThanOrEqual(options.expectedWrites ?? 1);
      },
      { timeout: 15_000, interval: 10 },
    );
    await options.mutateBeforeRelease(blocker);
    await blocker.query('COMMIT');
    transactionOpen = false;
    return await responsePromise;
  } finally {
    querySpy?.mockRestore();
    if (transactionOpen) await blocker.query('ROLLBACK');
    blocker.release();
  }
}

describe('auth: register validation', () => {
  const a = app();

  it('rejects a bad nativeLanguage with 400', async () => {
    const { res } = await registerUser(a, { nativeLanguage: 'xx' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "nativeLanguage: nativeLanguage must be one of 'te','hi','es','zh'",
      code: 'VALIDATION_FAILED',
    });
  });

  it('rejects an unsupported uiLanguage with 400', async () => {
    const { res } = await registerUser(a, { uiLanguage: 'fr' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "uiLanguage: uiLanguage must be one of 'en','te','hi','es','zh'",
      code: 'VALIDATION_FAILED',
    });
  });

  it('rejects a short password (<8) with 400', async () => {
    const { res } = await registerUser(a, { password: 'ab1' });
    expect(res.status).toBe(400);
  });

  it('rejects a weak password (no number) with 400', async () => {
    const { res } = await registerUser(a, { password: 'onlyletters' });
    expect(res.status).toBe(400);
  });

  it('rejects a weak password (no letter) with 400', async () => {
    const { res } = await registerUser(a, { password: '12345678' });
    expect(res.status).toBe(400);
  });

  it('rejects identity fields and passwords beyond their safe limits', async () => {
    expect((await registerUser(a, { name: 'n'.repeat(101) })).res.status).toBe(400);
    expect((await registerUser(a, { email: `${'e'.repeat(250)}@x.com` })).res.status).toBe(400);
    // 30 three-byte characters + a letter/number is well under 72 characters
    // but exceeds bcrypt's 72-byte input boundary.
    expect((await registerUser(a, { password: `${'漢'.repeat(30)}a1` })).res.status).toBe(400);
  });

  it('accepts exact identity and minimum-password boundaries but rejects the next byte and blank names', async () => {
    const local = `boundary${'a'.repeat(56)}`;
    const exactEmail = `${local}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;
    expect(exactEmail).toHaveLength(254);

    const exact = await registerUser(a, {
      name: 'n'.repeat(100),
      email: exactEmail,
      password: 'abcd1234',
    });
    expect(exact.res.status).toBe(201);
    expect(exact.res.body.user.name).toBe('n'.repeat(100));
    expect(exact.res.body.user.email).toBe(exactEmail);

    expect((await registerUser(a, { name: '   ' })).res.status).toBe(400);
    expect((await registerUser(a, { email: `${exactEmail}x` })).res.status).toBe(400);
  });

  it('registers a valid user (201) and creates diagnostic state', async () => {
    const { res, body } = await registerUser(a);
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body.user.email).toBe(body.email);
    expect(res.body.user.nativeLanguage).toBe('te');
    expect(res.body.user.uiLanguage).toBe('en');
    expect(res.body.user.cefrLevel).toBeNull();
    expect(res.body.user.diagnosticCompleted).toBe(false);

    const { rows } = await pool.query('SELECT * FROM diagnostic_state WHERE user_id = $1', [res.body.user.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].questions_asked).toBe(0);
  });

  it('accepts an explicit supported uiLanguage independently of nativeLanguage', async () => {
    const { res } = await registerUser(a, { nativeLanguage: 'te', uiLanguage: 'zh' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ nativeLanguage: 'te', uiLanguage: 'zh' });

    const stored = await pool.query<{ native_language: string; ui_language: string }>(
      'SELECT native_language, ui_language FROM users WHERE id = $1',
      [res.body.user.id],
    );
    expect(stored.rows[0]).toEqual({ native_language: 'te', ui_language: 'zh' });
  });

  it("accepts letters from the learner's writing system in passwords", async () => {
    const { res } = await registerUser(a, { password: 'हिन्दी1234' });
    expect(res.status).toBe(201);
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail('dup');
    const first = await registerUser(a, { email });
    expect(first.res.status).toBe(201);
    const second = await registerUser(a, { email });
    expect(second.res.status).toBe(409);
    expect(typeof second.res.body.error).toBe('string');
  });

  it('rejects control characters in the name with 400 instead of a database 500', async () => {
    // PostgreSQL text rejects U+0000 with 22021; validation must catch control
    // characters first so the register INSERT never sees them.
    const nul = await registerUser(a, { name: 'Ab\u0000cd' });
    expect(nul.res.status).toBe(400);
    expect(nul.res.body).toEqual({
      error: 'name: name must not contain control characters',
      code: 'VALIDATION_FAILED',
    });

    for (const name of [
      'line\nbreak',
      'tab\tname',
      'bell\x07name',
      'del\x7Fname',
      'next\u0085record',
      'line\u2028separator',
      'paragraph\u2029separator',
    ]) {
      expect((await registerUser(a, { name })).res.status).toBe(400);
    }
  });
});

describe('auth: login', () => {
  const a = app();

  it('rejects a wrong password with a generic 401', async () => {
    const { res, body } = await registerUser(a);
    expect(res.status).toBe(201);
    const login = await request(a).post('/auth/login').send({ email: body.email, password: 'wrong-pass-1' });
    expect(login.status).toBe(401);
    expect(login.body.error).toBe('Invalid email or password');
  });

  it('uses a real cost-12 dummy bcrypt hash and keeps unknown and known-wrong responses identical', async () => {
    const { res, body } = await registerUser(a);
    expect(res.status).toBe(201);
    const compare = vi.spyOn(bcrypt, 'compare');

    const unknown = await request(a)
      .post('/auth/login')
      .send({
        email: uniqueEmail('unknown-login'),
        password: 'wrong-pass-1',
      });
    const knownWrong = await request(a).post('/auth/login').send({ email: body.email, password: 'wrong-pass-1' });

    expect(unknown.status).toBe(401);
    expect(knownWrong.status).toBe(401);
    expect(unknown.body).toEqual({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    expect(knownWrong.body).toEqual(unknown.body);
    expect(compare).toHaveBeenCalledTimes(2);
    const dummyHash = compare.mock.calls[0][1] as string;
    expect(dummyHash).toMatch(/^\$2b\$12\$/);
    expect(bcrypt.getRounds(dummyHash)).toBe(12);
    expect(compare.mock.calls[1][1]).not.toBe(dummyHash);
  });

  it('logs in with correct credentials', async () => {
    const { res, body } = await registerUser(a, { nativeLanguage: 'te', uiLanguage: 'hi' });
    expect(res.status).toBe(201);
    const login = await request(a).post('/auth/login').send({ email: body.email, password: STRONG_PASSWORD });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');
    expect(login.body.user).toMatchObject({ nativeLanguage: 'te', uiLanguage: 'hi' });
    expect(login.headers['cache-control']).toContain('no-store');
  });

  it('rejects an overlong bcrypt input before comparison', async () => {
    const login = await request(a)
      .post('/auth/login')
      .send({ email: uniqueEmail('long'), password: `${'漢'.repeat(30)}a1` });
    expect(login.status).toBe(400);
  });

  it('rejects tokens without the API issuer and mobile audience', async () => {
    const { res } = await registerUser(a);
    const payload = JSON.parse(Buffer.from(res.body.token.split('.')[1], 'base64url').toString('utf8')) as {
      sub: string;
      tv: number;
    };
    const jwt = await import('jsonwebtoken');
    const unscopedToken = jwt.default.sign({ sub: payload.sub, tv: payload.tv }, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '1h',
    });

    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${unscopedToken}`);
    expect(me.status).toBe(401);
  });

  it('rate limits /auth/login after N tries', async () => {
    const prev = config.rateLimit.authMax;
    config.rateLimit.authMax = 3;
    try {
      const limited = app(); // limiters are built per app instance
      const email = uniqueEmail('rl');
      for (let i = 0; i < 3; i++) {
        const r = await request(limited).post('/auth/login').send({ email, password: 'x' });
        expect(r.status).toBe(401);
      }
      const blocked = await request(limited).post('/auth/login').send({ email, password: 'x' });
      expect(blocked.status).toBe(429);
    } finally {
      config.rateLimit.authMax = prev;
    }
  });

  it('limits failed logins for one normalized account across IPs/replicas and refunds successes', async () => {
    const setup = app();
    const { body } = await registerUser(setup);
    const savedTrustProxy = config.trustProxy;
    const savedWindow = config.rateLimit.loginAccountWindowMs;
    const savedMax = config.rateLimit.loginAccountMax;
    const windowMs = 73_000;
    const max = 2;
    const namespace = `login-account:${windowMs}:${max}`;

    config.trustProxy = 1;
    config.rateLimit.loginAccountWindowMs = windowMs;
    config.rateLimit.loginAccountMax = max;
    await pool.query('DELETE FROM rate_limit_windows WHERE namespace = $1', [namespace]);

    try {
      const firstReplica = app();
      const secondReplica = app();
      const login = (target: ReturnType<typeof app>, ip: string, email: string, password: string) =>
        request(target).post('/auth/login').set('X-Forwarded-For', ip).send({ email, password });

      // Successes briefly increment and are then refunded, so normal account
      // use cannot consume the failed-login budget.
      expect((await login(firstReplica, '203.0.113.1', `  ${body.email.toUpperCase()} `, STRONG_PASSWORD)).status).toBe(
        200,
      );
      expect((await login(secondReplica, '203.0.113.2', body.email, STRONG_PASSWORD)).status).toBe(200);
      await vi.waitFor(async () => {
        const result = await pool.query<{ hits: number }>('SELECT hits FROM rate_limit_windows WHERE namespace = $1', [
          namespace,
        ]);
        expect(Number(result.rows[0]?.hits)).toBe(0);
      });

      expect((await login(firstReplica, '203.0.113.11', body.email.toUpperCase(), 'wrong-1')).status).toBe(401);
      expect((await login(secondReplica, '203.0.113.12', ` ${body.email} `, 'wrong-2')).status).toBe(401);
      const blocked = await login(firstReplica, '203.0.113.13', body.email, 'wrong-3');
      expect(blocked.status).toBe(429);
      expect(blocked.body).toEqual({ error: 'Too many login attempts, please try again later', code: 'RATE_LIMITED' });

      // The budget blocks only failures: the real owner's correct password
      // still authenticates while an attacker holds the window saturated.
      expect((await login(firstReplica, '203.0.113.14', body.email, STRONG_PASSWORD)).status).toBe(200);

      const stored = await pool.query<{ key_hash: string }>(
        'SELECT key_hash FROM rate_limit_windows WHERE namespace = $1',
        [namespace],
      );
      expect(stored.rows).toHaveLength(1);
      expect(stored.rows[0].key_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored.rows[0].key_hash).not.toContain(body.email);
    } finally {
      config.trustProxy = savedTrustProxy;
      config.rateLimit.loginAccountWindowMs = savedWindow;
      config.rateLimit.loginAccountMax = savedMax;
      await pool.query('DELETE FROM rate_limit_windows WHERE namespace = $1', [namespace]);
    }
  });
});

describe('auth: infrastructure failures', () => {
  it('rolls back and reports non-unique registration database failures as 500', async () => {
    const failure = Object.assign(new Error('database unavailable'), { code: 'XX000' });
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN' || text === 'ROLLBACK') return { rows: [] };
        if (text.startsWith('INSERT INTO users')) throw failure;
        throw new Error(`unexpected query: ${text}`);
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      // Mount the router directly so the shared rate-limit store can keep using
      // Pool#connect internally without consuming this transaction-specific mock.
      const direct = express();
      direct.use(express.json());
      direct.use('/auth', createAuthRouter(buildLimiters()));
      direct.use(errorHandler);
      const response = await request(direct)
        .post('/auth/register')
        .send({
          name: 'Infrastructure Test',
          email: uniqueEmail('register-db-failure'),
          password: STRONG_PASSWORD,
          nativeLanguage: 'te',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      expect(client.query.mock.calls.map(([text]) => text)).toEqual([
        'BEGIN',
        expect.stringContaining('INSERT INTO users'),
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it('preserves duplicate-email handling when rollback also fails', async () => {
    const duplicate = Object.assign(new Error('duplicate email'), { code: '23505' });
    const rollbackFailure = new Error('rollback failed');
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN') return { rows: [] };
        if (text === 'ROLLBACK') throw rollbackFailure;
        if (text.startsWith('INSERT INTO users')) throw duplicate;
        throw new Error(`unexpected query: ${text}`);
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    try {
      const direct = express();
      direct.use(express.json());
      direct.use('/auth', createAuthRouter(buildLimiters()));
      direct.use(errorHandler);
      const response = await request(direct)
        .post('/auth/register')
        .send({
          name: 'Rollback Test',
          email: uniqueEmail('register-rollback-failure'),
          password: STRONG_PASSWORD,
          nativeLanguage: 'te',
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({ error: 'Email already registered', code: 'EMAIL_TAKEN' });
      expect(client.query.mock.calls.map(([text]) => text)).toEqual([
        'BEGIN',
        expect.stringContaining('INSERT INTO users'),
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      connect.mockRestore();
    }
  });

  it('reports an authenticated database failure as 500, not an invalid-token 401', async () => {
    const a = app();
    const { res } = await registerUser(a);
    // Fail only the requireAuth user lookup: the rate-limit counters run their
    // own queries first, and a failure there is 503 backpressure, not this 500.
    const original = pool.query.bind(pool);
    const query = vi.spyOn(pool, 'query').mockImplementation(((text: unknown, ...rest: unknown[]) => {
      if (typeof text === 'string' && text.includes('FROM users WHERE id')) {
        return Promise.reject(new Error('database unavailable'));
      }
      return (original as (...args: unknown[]) => unknown)(text, ...rest);
    }) as never);
    try {
      const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${res.body.token}`);
      expect(me.status).toBe(500);
      expect(me.body.error).toBe('Internal server error');
    } finally {
      query.mockRestore();
    }
  });

  it('sheds a saturated-pool failure as 503 with Retry-After, never a 500', async () => {
    const a = app();
    const { res } = await registerUser(a);
    const original = pool.query.bind(pool);
    const query = vi.spyOn(pool, 'query').mockImplementation(((text: unknown, ...rest: unknown[]) => {
      if (typeof text === 'string' && text.includes('FROM users WHERE id')) {
        return Promise.reject(new Error('timeout exceeded when trying to connect'));
      }
      return (original as (...args: unknown[]) => unknown)(text, ...rest);
    }) as never);
    try {
      const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${res.body.token}`);
      expect(me.status).toBe(503);
      expect(me.body).toEqual({
        error: 'Server is busy, please try again shortly',
        code: 'POOL_SATURATED',
        retryAfterSeconds: 5,
      });
      expect(me.headers['retry-after']).toBe('5');
    } finally {
      query.mockRestore();
    }
  });
});

describe('auth: change-password token revocation', () => {
  it('rejects reusing the current password before rotating credentials', async () => {
    const { res, body } = await registerUser(a);
    const unchanged = await request(a)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${res.body.token}`)
      .send({ currentPassword: body.password, newPassword: body.password });

    expect(unchanged.status).toBe(400);
    expect(unchanged.body).toEqual({
      error: 'newPassword: new password must be different from the current password',
      code: 'VALIDATION_FAILED',
    });

    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${res.body.token}`);
    expect(me.status).toBe(200);
  });

  const a = app();

  it('rejects a wrong current password with 401', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const r = await request(a)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'nope-nope1', newPassword: 'newpass123' });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: 'Current password is incorrect', code: 'INVALID_CREDENTIALS' });
  });

  it('success bumps token_version: old token dies, new token works', async () => {
    const { res, body } = await registerUser(a);
    const oldToken = res.body.token;
    const newPassword = 'newpass123';

    const changed = await request(a)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: STRONG_PASSWORD, newPassword });
    expect(changed.status).toBe(200);
    expect(typeof changed.body.token).toBe('string');
    expect(changed.body.user.uiLanguage).toBe('en');

    const withOld = await request(a).get('/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(withOld.status).toBe(401);

    const withNew = await request(a).get('/auth/me').set('Authorization', `Bearer ${changed.body.token}`);
    expect(withNew.status).toBe(200);
    expect(withNew.body.user.email).toBe(body.email);

    // And the new password is the one that logs in now.
    const login = await request(a).post('/auth/login').send({ email: body.email, password: newPassword });
    expect(login.status).toBe(200);
  });

  it('allows exactly one of two concurrent changes verified against the same credential snapshot', async () => {
    const { res, body } = await registerUser(a);
    const userId = res.body.user.id as string;
    const oldToken = res.body.token as string;
    const before = await pool.query<{ token_version: number }>('SELECT token_version FROM users WHERE id = $1', [
      userId,
    ]);

    const responses = await runAuthenticationWriteRace({
      userId,
      matchesWrite: (sql) => sql.includes('UPDATE users') && sql.includes('SET password_hash = $1'),
      expectedWrites: 2,
      startRequest: () =>
        Promise.all([
          request(a)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${oldToken}`)
            .send({ currentPassword: STRONG_PASSWORD, newPassword: 'first-new-pass1' }),
          request(a)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${oldToken}`)
            .send({ currentPassword: STRONG_PASSWORD, newPassword: 'second-new-pass2' }),
        ]),
      mutateBeforeRelease: async () => undefined,
    });

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const conflicted = responses.find((response) => response.status === 409)!;
    expect(conflicted.body).toEqual({
      error: 'Authentication state changed; please try again',
      code: 'STATE_CHANGED',
    });

    const after = await pool.query<{ token_version: number }>('SELECT token_version FROM users WHERE id = $1', [
      userId,
    ]);
    expect(after.rows[0].token_version).toBe(before.rows[0].token_version + 1);
    const firstLogin = await request(a).post('/auth/login').send({ email: body.email, password: 'first-new-pass1' });
    const secondLogin = await request(a).post('/auth/login').send({ email: body.email, password: 'second-new-pass2' });
    expect([firstLogin.status, secondLogin.status].sort()).toEqual([200, 401]);
  });

  it('rejects password-hash-only and token-version-only drift after password verification', async () => {
    for (const changedState of ['password_hash', 'token_version'] as const) {
      const { res } = await registerUser(a);
      const userId = res.body.user.id as string;
      const token = res.body.token as string;
      const before = await pool.query<{ password_hash: string; token_version: number }>(
        'SELECT password_hash, token_version FROM users WHERE id = $1',
        [userId],
      );
      const replacementHash = `superseded-${before.rows[0].password_hash}`;

      const response = await runAuthenticationWriteRace({
        userId,
        matchesWrite: (sql) => sql.includes('UPDATE users') && sql.includes('SET password_hash = $1'),
        startRequest: () =>
          request(a)
            .post('/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: STRONG_PASSWORD, newPassword: 'replacement-pass1' }),
        mutateBeforeRelease: (client) =>
          changedState === 'password_hash'
            ? client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [replacementHash, userId])
            : client.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId]),
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'Authentication state changed; please try again',
        code: 'STATE_CHANGED',
      });
      const after = await pool.query<{ password_hash: string; token_version: number }>(
        'SELECT password_hash, token_version FROM users WHERE id = $1',
        [userId],
      );
      expect(after.rows).toHaveLength(1);
      expect(after.rows[0]).toEqual(
        changedState === 'password_hash'
          ? { password_hash: replacementHash, token_version: before.rows[0].token_version }
          : { password_hash: before.rows[0].password_hash, token_version: before.rows[0].token_version + 1 },
      );
    }
  });
});

describe('auth: logout token revocation', () => {
  const a = app();

  it('revokes the presented token and other tokens issued to the account', async () => {
    const { res, body } = await registerUser(a);
    const firstToken = res.body.token;
    const login = await request(a).post('/auth/login').send({ email: body.email, password: STRONG_PASSWORD });
    const secondToken = login.body.token;

    const logout = await request(a).post('/auth/logout').set('Authorization', `Bearer ${firstToken}`);
    expect(logout.status).toBe(204);
    expect(logout.headers['cache-control']).toContain('no-store');

    expect((await request(a).get('/auth/me').set('Authorization', `Bearer ${firstToken}`)).status).toBe(401);
    expect((await request(a).get('/auth/me').set('Authorization', `Bearer ${secondToken}`)).status).toBe(401);
  });
});

describe('auth: delete account', () => {
  const a = app();

  it('rejects a wrong password with 401', async () => {
    const { res } = await registerUser(a);
    const r = await request(a)
      .delete('/auth/account')
      .set('Authorization', `Bearer ${res.body.token}`)
      .send({ password: 'nope-nope1' });
    expect(r.status).toBe(401);
    expect(r.body).toEqual({ error: 'Password is incorrect', code: 'INVALID_CREDENTIALS' });
  });

  it('preserves the account when either authentication snapshot field changes after verification', async () => {
    for (const changedState of ['password_hash', 'token_version'] as const) {
      const { res } = await registerUser(a);
      const userId = res.body.user.id as string;
      const token = res.body.token as string;
      const before = await pool.query<{ password_hash: string; token_version: number }>(
        'SELECT password_hash, token_version FROM users WHERE id = $1',
        [userId],
      );
      const replacementHash = `superseded-${before.rows[0].password_hash}`;

      const response = await runAuthenticationWriteRace({
        userId,
        matchesWrite: (sql) => sql.startsWith('DELETE FROM users WHERE id'),
        startRequest: () =>
          request(a)
            .delete('/auth/account')
            .set('Authorization', `Bearer ${token}`)
            .send({ password: STRONG_PASSWORD }),
        mutateBeforeRelease: (client) =>
          changedState === 'password_hash'
            ? client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [replacementHash, userId])
            : client.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId]),
      });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'Authentication state changed; please try again',
        code: 'STATE_CHANGED',
      });
      const after = await pool.query<{ password_hash: string; token_version: number }>(
        'SELECT password_hash, token_version FROM users WHERE id = $1',
        [userId],
      );
      expect(after.rows).toHaveLength(1);
      expect(after.rows[0]).toEqual(
        changedState === 'password_hash'
          ? { password_hash: replacementHash, token_version: before.rows[0].token_version }
          : { password_hash: before.rows[0].password_hash, token_version: before.rows[0].token_version + 1 },
      );
    }
  });

  it('deletes personal data but retains an anonymous global provider-cost reservation', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;

    // Give the user an attempts row directly (question FK needs a real question).
    const q = await pool.query('SELECT id FROM questions LIMIT 1');
    const cycleId = await createClosedPracticeCycle(userId, q.rows[0].id);
    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
       VALUES ($1, $2, 'practice', 1, 'x', 50, false, 'y', $3)`,
      [userId, q.rows[0].id, cycleId],
    );
    await pool.query('DELETE FROM assessment_usage');
    const usage = await pool.query<{ id: string }>('INSERT INTO assessment_usage (user_id) VALUES ($1) RETURNING id', [
      userId,
    ]);

    const del = await request(a)
      .delete('/auth/account')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: STRONG_PASSWORD });
    expect(del.status).toBe(204);

    const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(401);

    const attempts = await pool.query('SELECT count(*)::int AS n FROM attempts WHERE user_id = $1', [userId]);
    expect(attempts.rows[0].n).toBe(0);
    const state = await pool.query('SELECT count(*)::int AS n FROM diagnostic_state WHERE user_id = $1', [userId]);
    expect(state.rows[0].n).toBe(0);
    const user = await pool.query('SELECT count(*)::int AS n FROM users WHERE id = $1', [userId]);
    expect(user.rows[0].n).toBe(0);

    const anonymousUsage = await pool.query<{ user_id: string | null }>(
      'SELECT user_id FROM assessment_usage WHERE id = $1',
      [usage.rows[0].id],
    );
    expect(anonymousUsage.rows).toEqual([{ user_id: null }]);

    const previousGlobalCap = config.assessGlobalDailyCap;
    const previousUserCap = config.assessDailyCap;
    const second = await registerUser(a);
    config.assessDailyCap = 10;
    config.assessGlobalDailyCap = 1;
    try {
      await expect(assertDailyAssessmentCapacity(second.res.body.user.id)).rejects.toMatchObject({
        status: 429,
        message: 'Service daily assessment capacity reached',
      });
    } finally {
      config.assessDailyCap = previousUserCap;
      config.assessGlobalDailyCap = previousGlobalCap;
    }
  });
});

describe('auth: password-confirmation throttling', () => {
  const windowMs = 74_000;
  const max = 2;
  const namespace = `password-account:${windowMs}:${max}`;
  let savedWindow: number;
  let savedMax: number;

  const throttleApp = () => {
    config.rateLimit.passwordWindowMs = windowMs;
    config.rateLimit.passwordMax = max;
    return app();
  };

  beforeEach(async () => {
    savedWindow = config.rateLimit.passwordWindowMs;
    savedMax = config.rateLimit.passwordMax;
    await pool.query('DELETE FROM rate_limit_windows WHERE namespace = $1', [namespace]);
  });

  afterEach(async () => {
    config.rateLimit.passwordWindowMs = savedWindow;
    config.rateLimit.passwordMax = savedMax;
    await pool.query('DELETE FROM rate_limit_windows WHERE namespace = $1', [namespace]);
  });

  it('throttles change-password failures per account but never locks out the correct password', async () => {
    const a = throttleApp();
    const { res } = await registerUser(a);
    const { res: otherUser } = await registerUser(a);
    const token = res.body.token as string;
    const attempt = (currentPassword: string) =>
      request(a)
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword, newPassword: 'newpass123' });

    expect((await attempt('wrong-pass-1')).status).toBe(401);
    expect((await attempt('wrong-pass-2')).status).toBe(401);
    const blocked = await attempt('wrong-pass-3');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' });

    // Exhausting one learner's password-confirmation budget must not throttle
    // a different authenticated account.
    expect(
      (
        await request(a)
          .post('/auth/change-password')
          .set('Authorization', `Bearer ${otherUser.body.token as string}`)
          .send({ currentPassword: 'wrong-pass-other', newPassword: 'newpass123' })
      ).status,
    ).toBe(401);

    // A stolen token could saturate the budget, yet the real owner's correct
    // current password still goes through.
    expect((await attempt(STRONG_PASSWORD)).status).toBe(200);
  });

  it('throttles account-deletion failures per account and tracks the identity across replicas', async () => {
    const firstReplica = throttleApp();
    const secondReplica = throttleApp();
    const { res } = await registerUser(firstReplica);
    const token = res.body.token as string;
    const attempt = (target: ReturnType<typeof app>, password: string) =>
      request(target).delete('/auth/account').set('Authorization', `Bearer ${token}`).send({ password });

    expect((await attempt(firstReplica, 'wrong-pass-1')).status).toBe(401);
    expect((await attempt(secondReplica, 'wrong-pass-2')).status).toBe(401);
    const blocked = await attempt(firstReplica, 'wrong-pass-3');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' });
    expect((await attempt(secondReplica, STRONG_PASSWORD)).status).toBe(204);
  });
});

describe('auth: data export', () => {
  const a = app();

  it('exports user + attempts without password_hash', async () => {
    const { res } = await registerUser(a);
    expect(res.status).toBe(201);
    const token = res.body.token as string;
    const userId = res.body.user.id as string;
    const q = await pool.query('SELECT id FROM questions LIMIT 1');
    const cycleId = await createClosedPracticeCycle(userId, q.rows[0].id);
    await pool.query(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
       VALUES ($1, $2, 'practice', 1, 'hello', 80, true, 'nice', $3)`,
      [userId, q.rows[0].id, cycleId],
    );

    const r = await request(a).get('/auth/me/data').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
    expect(r.body.user.id).toBe(userId);
    expect(r.body.user.uiLanguage).toBe('en');
    expect(r.body.user.password_hash).toBeUndefined();
    expect(r.body.attempts).toHaveLength(1);
    expect(r.body.attempts[0].transcript).toBe('hello');
    expect(r.body.nextCursor).toBeNull();
  });

  it('paginates exports with an account-bound cursor', async () => {
    const first = await registerUser(a);
    const second = await registerUser(a);
    expect(first.res.status).toBe(201);
    expect(second.res.status).toBe(201);
    const firstUserId = first.res.body.user.id as string;
    const firstToken = first.res.body.token as string;
    const secondUserId = second.res.body.user.id as string;
    const q = await pool.query('SELECT id FROM questions LIMIT 1');
    for (const transcript of ['first', 'second', 'third']) {
      const cycleId = await createClosedPracticeCycle(firstUserId, q.rows[0].id);
      await pool.query(
        `INSERT INTO attempts
           (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
         VALUES ($1, $2, 'practice', 1, $3, 80, true, 'nice', $4)`,
        [firstUserId, q.rows[0].id, transcript, cycleId],
      );
    }

    const pageOne = await request(a).get('/auth/me/data?limit=2').set('Authorization', `Bearer ${firstToken}`);
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.attempts).toHaveLength(2);
    expect(pageOne.body.nextCursor).toBe(pageOne.body.attempts[1].id);

    const pageTwo = await request(a)
      .get(`/auth/me/data?limit=2&cursor=${pageOne.body.nextCursor}`)
      .set('Authorization', `Bearer ${firstToken}`);
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.attempts).toHaveLength(1);
    expect(pageTwo.body.nextCursor).toBeNull();

    const foreignCycleId = await createClosedPracticeCycle(secondUserId, q.rows[0].id);
    const foreignAttempt = await pool.query<{ id: string }>(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback, practice_cycle_id)
       VALUES ($1, $2, 'practice', 1, 'foreign', 50, false, 'foreign feedback', $3)
       RETURNING id`,
      [secondUserId, q.rows[0].id, foreignCycleId],
    );
    const foreignCursor = await request(a)
      .get(`/auth/me/data?cursor=${foreignAttempt.rows[0].id}`)
      .set('Authorization', `Bearer ${firstToken}`);
    expect(foreignCursor.status).toBe(400);
    expect(foreignCursor.body).toEqual({ error: 'Invalid export cursor', code: 'VALIDATION_FAILED' });
  });
});

describe('auth: per-target-email registration budget', () => {
  // buildLimiters() snapshots the config at app creation, so the app must be
  // built AFTER the budget overrides below, not at describe-collection time.
  const saved = {
    registerWindowMs: config.rateLimit.registerWindowMs,
    registerMax: config.rateLimit.registerMax,
    registerEmailWindowMs: config.rateLimit.registerEmailWindowMs,
    registerEmailMax: config.rateLimit.registerEmailMax,
  };

  beforeEach(async () => {
    // Relax the per-IP register budget so only the email-keyed budget under
    // test can reject; keep it above the number of requests this suite makes.
    config.rateLimit.registerWindowMs = 60_000;
    config.rateLimit.registerMax = 100;
    config.rateLimit.registerEmailWindowMs = 60_000;
    config.rateLimit.registerEmailMax = 2;
    await pool.query('DELETE FROM rate_limit_windows WHERE namespace LIKE $1', ['register-email:%']);
  });

  afterEach(async () => {
    Object.assign(config.rateLimit, saved);
    await pool.query('DELETE FROM rate_limit_windows WHERE namespace LIKE $1', ['register-email:%']);
  });

  it('bounds repeated EMAIL_TAKEN probes of one address without touching other registrations', async () => {
    const a = app();
    const probed = uniqueEmail('enumerated');
    expect((await registerUser(a, { email: probed })).res.status).toBe(201);

    // The success refunded its hit, so the address's budget is intact: two
    // 409 probes count, and the third duplicate submission is over budget.
    expect((await registerUser(a, { email: probed })).res.status).toBe(409);
    expect((await registerUser(a, { email: probed })).res.status).toBe(409);
    const { res: limited } = await registerUser(a, { email: probed });
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({
      error: 'Too many registration attempts, please try again later',
      code: 'RATE_LIMITED',
    });
    // The email-keyed budget must not advertise when the probe window ends
    // (the per-IP register limiter ahead of it may still publish the caller's
    // own budget via RateLimit-* — that is its documented behavior).
    expect(limited.headers['retry-after']).toBeUndefined();

    // A different address keeps its own budget.
    expect((await registerUser(a, { email: uniqueEmail('other') })).res.status).toBe(201);
  });
});
