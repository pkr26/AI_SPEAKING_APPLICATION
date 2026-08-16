import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import bcrypt from 'bcrypt';
import express from 'express';
import request from 'supertest';
import { cleanupPasswordResetTokens, createAuthRouter } from '../src/auth';
import { config } from '../src/config';
import { logger } from '../src/logger';
import { sendMail } from '../src/mailer';
import { errorHandler } from '../src/middleware';
import { app, pool, registerUser, STRONG_PASSWORD, uniqueEmail } from './helpers';

afterAll(async () => {
  await pool.end();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const RESET_INVALID_BODY = { error: 'Reset code is invalid or expired', code: 'RESET_INVALID' };

/** Capture the 32-hex reset code the log-mode mailer writes for `email`. */
function captureMailedToken(): { tokenFor: (email: string) => string; calls: () => number } {
  const seen: Array<{ to: string; token: string; subject: string }> = [];
  vi.spyOn(logger, 'info').mockImplementation(((...args: unknown[]) => {
    const [payload, message] = args as [Record<string, unknown>, string];
    if (message === 'mail delivered to log (MAIL_MODE=log)') {
      const match = /reset code is ([0-9a-f]{32})\b/.exec(String(payload.text));
      seen.push({ to: String(payload.to), token: match?.[1] ?? '', subject: String(payload.subject) });
    }
    return logger;
  }) as typeof logger.info);
  return {
    tokenFor: (email: string) => {
      const mail = seen.filter((entry) => entry.to === email).at(-1);
      if (!mail || !mail.token) throw new Error(`no reset mail logged for ${email}`);
      expect(mail.subject).toBe('Your password reset code');
      return mail.token;
    },
    calls: () => seen.length,
  };
}

async function tokenRow(email: string) {
  const { rows } = await pool.query<{ token_hash: string; ttl_minutes: number }>(
    `SELECT t.token_hash, round(extract(epoch FROM (t.expires_at - now())) / 60)::int AS ttl_minutes
     FROM password_reset_tokens t JOIN users u ON u.id = t.user_id
     WHERE u.email = $1`,
    [email],
  );
  return rows[0];
}

describe('POST /auth/forgot-password', () => {
  const a = app();

  it('answers 204, stores only the sha256 of a 30-minute token, and mails the code via the log mailer', async () => {
    const mailer = captureMailedToken();
    const { body: reg } = await registerUser(a);

    const r = await request(a).post('/auth/forgot-password').send({ email: reg.email });

    expect(r.status).toBe(204);
    expect(r.body).toEqual({});
    expect(r.headers['cache-control']).toContain('no-store');
    const token = mailer.tokenFor(reg.email as string);
    const row = await tokenRow(reg.email as string);
    expect(row.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(row.ttl_minutes).toBe(30);
  });

  it('still answers 204 for an unknown email and writes no token row (no account enumeration)', async () => {
    const mailer = captureMailedToken();
    const unknown = uniqueEmail('ghost');

    const r = await request(a).post('/auth/forgot-password').send({ email: unknown });

    expect(r.status).toBe(204);
    expect(mailer.calls()).toBe(0);
    const { rows } = await pool.query(
      'SELECT 1 FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1',
      [unknown],
    );
    expect(rows).toHaveLength(0);

    const invalid = await request(a).post('/auth/forgot-password').send({ email: 'not-an-email' });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: 'email: a valid email is required', code: 'VALIDATION_FAILED' });
  });

  it('keeps exactly one active token per user: a repeat request revokes the previous code', async () => {
    const mailer = captureMailedToken();
    const { body: reg } = await registerUser(a);
    const email = reg.email as string;

    await request(a).post('/auth/forgot-password').send({ email });
    const firstToken = mailer.tokenFor(email);
    await request(a).post('/auth/forgot-password').send({ email });
    const secondToken = mailer.tokenFor(email);
    expect(secondToken).not.toBe(firstToken);

    const { rows } = await pool.query(
      'SELECT count(*)::int AS n FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1',
      [email],
    );
    expect(rows[0].n).toBe(1);

    const staleReset = await request(a)
      .post('/auth/reset-password')
      .send({ email, token: firstToken, newPassword: 'brandNew1pass' });
    expect(staleReset.status).toBe(400);
    expect(staleReset.body).toEqual(RESET_INVALID_BODY);

    const freshReset = await request(a)
      .post('/auth/reset-password')
      .send({ email, token: secondToken, newPassword: 'brandNew1pass' });
    expect(freshReset.status).toBe(204);
  });

  it('silently stops issuing once the per-email budget is exhausted while still answering 204', async () => {
    const savedRateLimit = { ...config.rateLimit };
    config.rateLimit.forgotEmailWindowMs = 60_000;
    config.rateLimit.forgotEmailMax = 1;
    await pool.query('DELETE FROM rate_limit_windows');
    try {
      const scoped = app();
      const mailer = captureMailedToken();
      const { body: reg } = await registerUser(scoped);
      const email = reg.email as string;

      expect((await request(scoped).post('/auth/forgot-password').send({ email })).status).toBe(204);
      const activeHash = (await tokenRow(email)).token_hash;
      expect(mailer.calls()).toBe(1);

      // Over budget — the email key is normalized, so case games don't reset
      // it. Same 204, but no new token and no second mail.
      const throttled = await request(scoped).post('/auth/forgot-password').send({ email: email.toUpperCase() });
      expect(throttled.status).toBe(204);
      expect((await tokenRow(email)).token_hash).toBe(activeHash);
      expect(mailer.calls()).toBe(1);
    } finally {
      Object.assign(config.rateLimit, savedRateLimit);
      await pool.query('DELETE FROM rate_limit_windows');
    }
  });

  it('is throttled per IP by the shared auth limiter', async () => {
    const savedRateLimit = { ...config.rateLimit };
    config.rateLimit.authWindowMs = 60_000;
    config.rateLimit.authMax = 1;
    await pool.query('DELETE FROM rate_limit_windows');
    try {
      const scoped = app();
      expect((await request(scoped).post('/auth/forgot-password').send({ email: uniqueEmail() })).status).toBe(204);
      const limited = await request(scoped).post('/auth/forgot-password').send({ email: uniqueEmail() });
      expect(limited.status).toBe(429);
      expect(limited.body).toEqual({ error: 'Too many attempts, please try again later', code: 'RATE_LIMITED' });
    } finally {
      Object.assign(config.rateLimit, savedRateLimit);
      await pool.query('DELETE FROM rate_limit_windows');
    }
  });
});

describe('POST /auth/reset-password', () => {
  const a = app();

  async function issueToken(email: string): Promise<string> {
    const mailer = captureMailedToken();
    const r = await request(a).post('/auth/forgot-password').send({ email });
    expect(r.status).toBe(204);
    const token = mailer.tokenFor(email);
    vi.restoreAllMocks();
    return token;
  }

  it('resets the password, revokes previously issued JWTs, and consumes the token', async () => {
    const { res, body: reg } = await registerUser(a);
    const oldJwt = res.body.token as string;
    const email = reg.email as string;
    const token = await issueToken(email);

    const reset = await request(a).post('/auth/reset-password').send({ email, token, newPassword: 'freshPass1word' });
    expect(reset.status).toBe(204);
    expect(reset.body).toEqual({});

    // token_version bump: every earlier bearer token is dead.
    const stale = await request(a).get('/auth/me').set('Authorization', `Bearer ${oldJwt}`);
    expect(stale.status).toBe(401);
    expect(stale.body).toEqual({ error: 'Token no longer valid — please log in again', code: 'TOKEN_REVOKED' });

    const oldLogin = await request(a).post('/auth/login').send({ email, password: STRONG_PASSWORD });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(a).post('/auth/login').send({ email, password: 'freshPass1word' });
    expect(newLogin.status).toBe(200);

    // Single use: the row is gone and a replay fails with the uniform code.
    const { rows } = await pool.query(
      'SELECT 1 FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1',
      [email],
    );
    expect(rows).toHaveLength(0);
    const replay = await request(a)
      .post('/auth/reset-password')
      .send({ email, token, newPassword: 'anotherPass1word' });
    expect(replay.status).toBe(400);
    expect(replay.body).toEqual(RESET_INVALID_BODY);
  });

  it('consumes one reset token exactly once under simultaneous requests', async () => {
    const { body: reg } = await registerUser(a);
    const email = reg.email as string;
    const token = await issueToken(email);

    const [first, second] = await Promise.all([
      request(a).post('/auth/reset-password').send({ email, token, newPassword: 'concurrentPass1' }),
      request(a).post('/auth/reset-password').send({ email, token, newPassword: 'concurrentPass2' }),
    ]);

    expect([first.status, second.status].sort()).toEqual([204, 400]);
    const rejected = first.status === 400 ? first : second;
    expect(rejected.body).toEqual(RESET_INVALID_BODY);
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE u.email = $1`,
      [email],
    );
    expect(rows[0].n).toBe(0);
  });

  it('rejects wrong, expired, and unknown-account codes with one uniform contract', async () => {
    const { body: reg } = await registerUser(a);
    const email = reg.email as string;
    const token = await issueToken(email);

    const wrong = await request(a)
      .post('/auth/reset-password')
      .send({ email, token: '0'.repeat(32), newPassword: 'freshPass1word' });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toEqual(RESET_INVALID_BODY);

    const unknownAccount = await request(a)
      .post('/auth/reset-password')
      .send({ email: uniqueEmail('ghost'), token, newPassword: 'freshPass1word' });
    expect(unknownAccount.status).toBe(400);
    expect(unknownAccount.body).toEqual(RESET_INVALID_BODY);

    await pool.query(
      `UPDATE password_reset_tokens SET expires_at = now() - interval '1 second'
       WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [email],
    );
    const expired = await request(a).post('/auth/reset-password').send({ email, token, newPassword: 'freshPass1word' });
    expect(expired.status).toBe(400);
    expect(expired.body).toEqual(RESET_INVALID_BODY);

    // The password that never got applied must still be the old one.
    const login = await request(a).post('/auth/login').send({ email, password: STRONG_PASSWORD });
    expect(login.status).toBe(200);
  });

  it('holds the new password to the register-grade policy', async () => {
    const { body: reg } = await registerUser(a);
    const email = reg.email as string;
    const token = await issueToken(email);

    const weak = await request(a).post('/auth/reset-password').send({ email, token, newPassword: 'onlyletters' });
    expect(weak.status).toBe(400);
    expect(weak.body).toEqual({
      error: 'newPassword: password must contain at least one number',
      code: 'VALIDATION_FAILED',
    });

    // The rejected attempt must not have consumed the token.
    const ok = await request(a).post('/auth/reset-password').send({ email, token, newPassword: 'freshPass1word' });
    expect(ok.status).toBe(204);
  });

  it('begins, rolls back, and releases the reset transaction when the user update fails', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const email = uniqueEmail('reset-transaction-failure');
    const token = 'known-reset-token';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const primaryError = new Error('user update failed');
    const query = vi
      .spyOn(pool, 'query')
      .mockResolvedValueOnce({
        rows: [
          {
            id: userId,
            name: 'Reset Failure',
            email,
            password_hash: 'old-hash',
            native_language: 'te',
            cefr_level: null,
            diagnostic_completed: false,
            token_version: 1,
            created_at: new Date().toISOString(),
          },
        ],
      } as never)
      .mockResolvedValueOnce({ rows: [{ token_hash: tokenHash }] } as never);
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === 'BEGIN' || text === 'ROLLBACK') return { rows: [] };
        if (text.startsWith('DELETE FROM password_reset_tokens')) return { rows: [], rowCount: 1 };
        if (text.startsWith('UPDATE users SET password_hash')) throw primaryError;
        throw new Error(`unexpected query: ${text}`);
      }),
      release: vi.fn(),
    };
    const connect = vi.spyOn(pool, 'connect').mockResolvedValue(client as never);
    const hash = vi.spyOn(bcrypt, 'hash').mockResolvedValue('replacement-hash' as never);
    const pass = (_req: express.Request, _res: express.Response, next: express.NextFunction) => next();
    const direct = express();
    direct.use(express.json());
    direct.use('/auth', createAuthRouter({ forgotPasswordEmail: pass, passwordAccount: pass } as never));
    direct.use(errorHandler);

    try {
      const response = await request(direct)
        .post('/auth/reset-password')
        .send({ email, token, newPassword: 'replacementPass1' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Internal server error', code: 'INTERNAL' });
      expect(client.query.mock.calls.map(([text]) => text)).toEqual([
        'BEGIN',
        expect.stringContaining('DELETE FROM password_reset_tokens'),
        expect.stringContaining('UPDATE users SET password_hash'),
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalledOnce();
    } finally {
      hash.mockRestore();
      connect.mockRestore();
      query.mockRestore();
    }
  });
});

describe('webhook mail mode', () => {
  const a = app();
  const savedMail = { ...config.mail };

  afterEach(() => {
    Object.assign(config.mail, savedMail);
  });

  async function startWebhookServer(): Promise<{
    server: Server;
    url: string;
    received: Array<{ contentType: string | undefined; body: string }>;
  }> {
    const received: Array<{ contentType: string | undefined; body: string }> = [];
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', (chunk: Buffer) => (body += chunk.toString('utf8')));
      req.on('end', () => {
        received.push({ contentType: req.headers['content-type'], body });
        res.statusCode = 204;
        res.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    return { server, url: `http://127.0.0.1:${port}/hooks/mail`, received };
  }

  it('does not log a rejection for a successful webhook response', async () => {
    const { server, url, received } = await startWebhookServer();
    config.mail.mode = 'webhook';
    config.mail.webhookUrl = url;
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      await sendMail({ to: 'success@example.com', subject: 'Successful delivery', text: 'hello' });
      expect(received).toHaveLength(1);
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('POSTs {to, subject, text} to MAIL_WEBHOOK_URL and the mailed code actually resets the password', async () => {
    const { server, url, received } = await startWebhookServer();
    config.mail.mode = 'webhook';
    config.mail.webhookUrl = url;
    try {
      const { body: reg } = await registerUser(a);
      const email = reg.email as string;

      const r = await request(a).post('/auth/forgot-password').send({ email });
      expect(r.status).toBe(204);

      await vi.waitFor(() => expect(received).toHaveLength(1));
      expect(received[0].contentType).toBe('application/json');
      const message = JSON.parse(received[0].body) as { to: string; subject: string; text: string };
      expect(message.to).toBe(email);
      expect(message.subject).toBe('Your password reset code');
      const token = /reset code is ([0-9a-f]{32})\b/.exec(message.text)?.[1];
      expect(token).toBeDefined();

      config.mail.mode = 'log'; // the reset itself is mode-independent
      const reset = await request(a).post('/auth/reset-password').send({ email, token, newPassword: 'freshPass1word' });
      expect(reset.status).toBe(204);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('refuses redirects so a relay cannot forward a reset code to another origin', async () => {
    const received: string[] = [];
    const receiver = createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => (body += chunk));
      req.on('end', () => {
        received.push(body);
        res.statusCode = 204;
        res.end();
      });
    });
    await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
    const receiverPort = (receiver.address() as AddressInfo).port;
    const redirector = createServer((_req, res) => {
      res.statusCode = 307;
      res.setHeader('Location', `http://127.0.0.1:${receiverPort}/stolen`);
      res.end();
    });
    await new Promise<void>((resolve) => redirector.listen(0, '127.0.0.1', resolve));
    const redirectorPort = (redirector.address() as AddressInfo).port;
    config.mail.mode = 'webhook';
    config.mail.webhookUrl = `http://127.0.0.1:${redirectorPort}/hooks/mail`;
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation((() => logger) as never);

    try {
      const { body: reg } = await registerUser(a);
      const response = await request(a).post('/auth/forgot-password').send({ email: reg.email });

      expect(response.status).toBe(204);
      await vi.waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith(
          expect.objectContaining({ to: reg.email, subject: 'Your password reset code' }),
          'mail webhook delivery failed',
        ),
      );
      await new Promise((resolve) => setImmediate(resolve));
      expect(received).toEqual([]);
    } finally {
      await new Promise((resolve) => redirector.close(resolve));
      await new Promise((resolve) => receiver.close(resolve));
    }
  });

  it('still answers 204 when the webhook is unreachable, logging the delivery failure', async () => {
    // Grab a port that is guaranteed closed by binding and releasing it.
    const { server, url } = await startWebhookServer();
    await new Promise((resolve) => server.close(resolve));
    config.mail.mode = 'webhook';
    config.mail.webhookUrl = url;
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation((() => logger) as never);
    const { body: reg } = await registerUser(a);

    const r = await request(a).post('/auth/forgot-password').send({ email: reg.email });

    expect(r.status).toBe(204);
    await vi.waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ to: reg.email, subject: 'Your password reset code' }),
        'mail webhook delivery failed',
      );
    });
    // The token was still issued: delivery is best-effort, state is not.
    const { rows } = await pool.query(
      'SELECT 1 FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1',
      [reg.email],
    );
    expect(rows).toHaveLength(1);
  });

  it('still answers 204 when the webhook rejects with a non-2xx status', async () => {
    const server = createServer((_req, res) => {
      res.statusCode = 500;
      res.end('relay broken');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    config.mail.mode = 'webhook';
    config.mail.webhookUrl = `http://127.0.0.1:${port}/hooks/mail`;
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation((() => logger) as never);
    try {
      const { body: reg } = await registerUser(a);

      const r = await request(a).post('/auth/forgot-password').send({ email: reg.email });

      expect(r.status).toBe(204);
      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.objectContaining({ to: reg.email, subject: 'Your password reset code', status: 500 }),
          'mail webhook rejected',
        );
      });
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('still answers 204 when the webhook hangs past the 5s delivery timeout', async () => {
    // Never answers: the mailer's AbortSignal.timeout(5s) must cut it off.
    const server = createServer(() => {});
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    config.mail.mode = 'webhook';
    config.mail.webhookUrl = `http://127.0.0.1:${port}/hooks/mail`;
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation((() => logger) as never);
    try {
      const { body: reg } = await registerUser(a);

      // sendMail is fire-and-forget: the 204 does not wait out the timeout.
      const r = await request(a).post('/auth/forgot-password').send({ email: reg.email });
      expect(r.status).toBe(204);

      await vi.waitFor(
        () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.objectContaining({ to: reg.email, subject: 'Your password reset code' }),
            'mail webhook delivery failed',
          );
        },
        { timeout: 10_000 },
      );
      expect(String(errorSpy.mock.calls[0][0] && (errorSpy.mock.calls[0][0] as { err?: Error }).err)).toMatch(
        /TimeoutError|AbortError/,
      );
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }, 20_000);
});

describe('password reset token janitor', () => {
  const a = app();

  it('removes only expired tokens in a locked, batched sweep', async () => {
    const { body: expiredUser } = await registerUser(a);
    const { body: liveUser } = await registerUser(a);
    await pool.query('DELETE FROM password_reset_tokens');
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       SELECT id, $2, now() - interval '1 minute' FROM users WHERE email = $1`,
      [expiredUser.email, createHash('sha256').update('expired').digest('hex')],
    );
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       SELECT id, $2, now() + interval '10 minutes' FROM users WHERE email = $1`,
      [liveUser.email, createHash('sha256').update('live').digest('hex')],
    );

    const removed = await cleanupPasswordResetTokens();

    expect(removed).toBe(1);
    const { rows } = await pool.query<{ email: string }>(
      'SELECT u.email FROM password_reset_tokens t JOIN users u ON u.id = t.user_id',
    );
    expect(rows).toEqual([{ email: liveUser.email }]);
  });
});
