import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { httpLogger, logger } from '../src/logger';
import { errorHandler } from '../src/middleware';

/**
 * LOG_LEVEL=silent in tests, so these temporarily raise the module logger to
 * info and intercept pino's destination stream (SonicBoom on fd 1 — it does
 * not go through process.stdout.write) to assert the pino-http wiring:
 * status-based log levels, /health suppression, and the req/res serializers.
 */

interface LogEntry {
  level: number;
  msg: string;
  req?: { id: string; method: string; url: string; remoteAddress?: string };
  res?: { statusCode: number };
  err?: unknown;
}

const streamSym = pino.symbols.streamSym;

describe('httpLogger', () => {
  let lines: string[];
  let writeSpy: ReturnType<typeof vi.spyOn>;
  const savedLevel = logger.level;

  function entries(): LogEntry[] {
    return lines
      .filter((l) => l.startsWith('{'))
      .map((l) => {
        try {
          return JSON.parse(l) as LogEntry;
        } catch {
          return undefined;
        }
      })
      .filter((e): e is LogEntry => !!e && typeof e.msg === 'string');
  }

  beforeAll(() => {
    logger.level = 'info';
    lines = [];
    const stream = (logger as unknown as Record<symbol, { write: (chunk: string) => boolean }>)[streamSym];
    writeSpy = vi.spyOn(stream, 'write').mockImplementation((chunk: string) => {
      lines.push(String(chunk));
      return true;
    });
  });

  afterAll(() => {
    logger.level = savedLevel;
    writeSpy.mockRestore();
  });

  function buildApp() {
    const a = express();
    a.use(httpLogger);
    a.get('/health', (_req, res) => res.json({ ok: true }));
    a.get('/ok', (_req, res) => res.json({ ok: true }));
    a.get('/warn', (_req, res) => res.status(404).json({ error: 'Not found' }));
    a.get('/boom', () => {
      throw new Error('boom');
    });
    a.use(errorHandler);
    return a;
  }

  it('logs 2xx at info, 4xx at warn, 5xx at error with serialized req/res', async () => {
    const a = buildApp();
    await request(a).get('/ok').set('x-request-id', 'req-123');
    await request(a).get('/warn');
    await request(a).get('/boom');

    const byUrl = new Map(entries().map((e) => [e.req?.url, e]));

    const ok = byUrl.get('/ok');
    expect(ok?.msg).toBe('request completed');
    expect(ok?.level).toBe(30); // info
    expect(ok?.req?.id).toBe('req-123');
    expect(ok?.req?.method).toBe('GET');
    expect(ok?.res).toEqual({ statusCode: 200 });

    const warn = byUrl.get('/warn');
    expect(warn?.level).toBe(40); // warn
    expect(warn?.res).toEqual({ statusCode: 404 });

    const boom = byUrl.get('/boom');
    expect(boom?.msg).toBe('request errored');
    expect(boom?.level).toBe(50); // error
    expect(boom?.err).toBeDefined();
    expect(boom?.res).toEqual({ statusCode: 500 });
  });

  it('suppresses successful /health probes entirely', async () => {
    const a = buildApp();
    const res = await request(a).get('/health');
    expect(res.status).toBe(200);
    expect(entries().some((e) => e.req?.url === '/health')).toBe(false);
  });

  it('redacts credentials from direct application logs as well as HTTP logs', () => {
    logger.info(
      {
        password: 'root-password-secret',
        currentPassword: 'root-current-secret',
        newPassword: 'root-new-secret',
        token: 'root-token-secret',
        accessToken: 'root-access-secret',
        refreshToken: 'root-refresh-secret',
        req: {
          headers: {
            authorization: 'Bearer header-secret',
            cookie: 'session=header-cookie-secret',
            'x-api-key': 'header-api-key-secret',
          },
          body: {
            password: 'body-password-secret',
            currentPassword: 'body-current-secret',
            newPassword: 'body-new-secret',
            token: 'body-token-secret',
            accessToken: 'body-access-secret',
            refreshToken: 'body-refresh-secret',
          },
        },
        res: { headers: { 'set-cookie': 'session=response-cookie-secret' } },
      },
      'sensitive-redaction-check',
    );

    const line = lines.find((candidate) => candidate.includes('sensitive-redaction-check'));
    expect(line).toBeDefined();
    for (const secret of [
      'root-password-secret',
      'root-current-secret',
      'root-new-secret',
      'root-token-secret',
      'root-access-secret',
      'root-refresh-secret',
      'header-secret',
      'header-cookie-secret',
      'header-api-key-secret',
      'body-password-secret',
      'body-current-secret',
      'body-new-secret',
      'body-token-secret',
      'body-access-secret',
      'body-refresh-secret',
      'response-cookie-secret',
    ]) {
      expect(line).not.toContain(secret);
    }
    expect(line).toContain('[redacted]');
  });
});
