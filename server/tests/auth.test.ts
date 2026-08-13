import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { assertDailyAssessmentCapacity } from '../src/assess';
import { createAuthRouter } from '../src/auth';
import { config } from '../src/config';
import { errorHandler } from '../src/middleware';
import { buildLimiters } from '../src/rate-limit';
import { app, pool, registerUser, STRONG_PASSWORD, uniqueEmail } from './helpers';

afterAll(async () => {
  await pool.end();
});

describe('auth: register validation', () => {
  const a = app();

  it('rejects a bad nativeLanguage with 400', async () => {
    const { res } = await registerUser(a, { nativeLanguage: 'xx' });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
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
    expect(res.body.user.cefrLevel).toBeNull();
    expect(res.body.user.diagnosticCompleted).toBe(false);

    const { rows } = await pool.query('SELECT * FROM diagnostic_state WHERE user_id = $1', [res.body.user.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].questions_asked).toBe(0);
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

  it('logs in with correct credentials', async () => {
    const { res, body } = await registerUser(a);
    expect(res.status).toBe(201);
    const login = await request(a).post('/auth/login').send({ email: body.email, password: STRONG_PASSWORD });
    expect(login.status).toBe(200);
    expect(typeof login.body.token).toBe('string');
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
      expect(blocked.body).toEqual({ error: 'Too many login attempts, please try again later' });

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
      expect(response.body).toEqual({ error: 'Internal server error' });
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
      expect(response.body).toEqual({ error: 'Email already registered' });
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
    const query = vi.spyOn(pool, 'query').mockRejectedValueOnce(new Error('database unavailable'));
    try {
      const me = await request(a).get('/auth/me').set('Authorization', `Bearer ${res.body.token}`);
      expect(me.status).toBe(500);
      expect(me.body.error).toBe('Internal server error');
    } finally {
      query.mockRestore();
    }
  });
});

describe('auth: change-password token revocation', () => {
  const a = app();

  it('rejects a wrong current password with 401', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const r = await request(a)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'nope-nope1', newPassword: 'newpass123' });
    expect(r.status).toBe(401);
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

    const withOld = await request(a).get('/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(withOld.status).toBe(401);

    const withNew = await request(a).get('/auth/me').set('Authorization', `Bearer ${changed.body.token}`);
    expect(withNew.status).toBe(200);
    expect(withNew.body.user.email).toBe(body.email);

    // And the new password is the one that logs in now.
    const login = await request(a).post('/auth/login').send({ email: body.email, password: newPassword });
    expect(login.status).toBe(200);
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
  });

  it('deletes personal data but retains an anonymous global provider-cost reservation', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;

    // Give the user an attempts row directly (question FK needs a real question).
    const q = await pool.query('SELECT id FROM questions LIMIT 1');
    await pool.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'practice', 1, 'x', 50, false, 'y')`,
      [userId, q.rows[0].id],
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
    expect(blocked.body).toEqual({ error: 'Too many attempts, please try again later' });

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
    expect((await attempt(firstReplica, 'wrong-pass-3')).status).toBe(429);
    expect((await attempt(secondReplica, STRONG_PASSWORD)).status).toBe(204);
  });
});

describe('auth: data export', () => {
  const a = app();

  it('exports user + attempts without password_hash', async () => {
    const { res } = await registerUser(a);
    const token = res.body.token;
    const userId = res.body.user.id;
    const q = await pool.query('SELECT id FROM questions LIMIT 1');
    await pool.query(
      `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'practice', 1, 'hello', 80, true, 'nice')`,
      [userId, q.rows[0].id],
    );

    const r = await request(a).get('/auth/me/data').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('no-store');
    expect(r.body.user.id).toBe(userId);
    expect(r.body.user.password_hash).toBeUndefined();
    expect(r.body.attempts).toHaveLength(1);
    expect(r.body.attempts[0].transcript).toBe('hello');
    expect(r.body.nextCursor).toBeNull();
  });

  it('paginates exports with an account-bound cursor', async () => {
    const first = await registerUser(a);
    const second = await registerUser(a);
    const q = await pool.query('SELECT id FROM questions LIMIT 1');
    for (const transcript of ['first', 'second', 'third']) {
      await pool.query(
        `INSERT INTO attempts (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
         VALUES ($1, $2, 'practice', 1, $3, 80, true, 'nice')`,
        [first.res.body.user.id, q.rows[0].id, transcript],
      );
    }

    const pageOne = await request(a)
      .get('/auth/me/data?limit=2')
      .set('Authorization', `Bearer ${first.res.body.token}`);
    expect(pageOne.status).toBe(200);
    expect(pageOne.body.attempts).toHaveLength(2);
    expect(pageOne.body.nextCursor).toBe(pageOne.body.attempts[1].id);

    const pageTwo = await request(a)
      .get(`/auth/me/data?limit=2&cursor=${pageOne.body.nextCursor}`)
      .set('Authorization', `Bearer ${first.res.body.token}`);
    expect(pageTwo.status).toBe(200);
    expect(pageTwo.body.attempts).toHaveLength(1);
    expect(pageTwo.body.nextCursor).toBeNull();

    const foreignAttempt = await pool.query<{ id: string }>(
      `INSERT INTO attempts
         (user_id, question_id, context, attempt_no, transcript, score, passed, feedback)
       VALUES ($1, $2, 'practice', 1, 'foreign', 50, false, 'foreign feedback')
       RETURNING id`,
      [second.res.body.user.id, q.rows[0].id],
    );
    const foreignCursor = await request(a)
      .get(`/auth/me/data?cursor=${foreignAttempt.rows[0].id}`)
      .set('Authorization', `Bearer ${first.res.body.token}`);
    expect(foreignCursor.status).toBe(400);
  });
});
