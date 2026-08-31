import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { symbols } from 'pino';
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

const streamSym = symbols.streamSym;

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

  it('suppresses every /health spelling: query string, one trailing slash, and case', async () => {
    const a = buildApp();
    lines.length = 0;
    for (const url of ['/health?x=1', '/health/', '/HEALTH', '/Health?probe=1']) {
      const res = await request(a).get(url);
      expect(res.status).toBe(200);
    }
    // None of the probe spellings may write a log line — an exact-match
    // predicate would let all four through unthrottled.
    expect(entries().filter((e) => (e.req?.url ?? '').toLowerCase().startsWith('/health'))).toHaveLength(0);
  });

  it('still logs /healthz and /ready spellings that are not the liveness probe', async () => {
    const a = buildApp();
    lines.length = 0;
    // buildApp defines no /ready route: the request 404s, and pino-http still
    // logs it — suppression is scoped to the exact /health liveness path.
    await request(a).get('/healthz');
    await request(a).get('/ready?x=1');
    await request(a).get('/ready');
    const urls = entries().map((e) => e.req?.url);
    expect(urls).toContain('/healthz');
    expect(urls).toContain('/ready?x=1');
    expect(urls).toContain('/ready');
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

describe('logger initialization', () => {
  afterEach(() => {
    vi.doUnmock('../src/config');
    vi.doUnmock('pino');
    vi.doUnmock('pino-http');
    vi.resetModules();
  });

  async function captureLoggerOptions(config: {
    nodeEnv: 'development' | 'test' | 'production';
    isProduction: boolean;
    logLevel: string | undefined;
  }): Promise<{ pinoOptions: Record<string, unknown>; httpOptions: Record<string, unknown> }> {
    const mockLogger = { kind: 'base-logger' };
    const mockHttpLogger = vi.fn();
    const pinoSpy = vi.fn((_options: unknown) => mockLogger);
    const pinoHttpSpy = vi.fn((_options: unknown) => mockHttpLogger);

    vi.resetModules();
    vi.doMock('../src/config', () => ({ config }));
    vi.doMock('pino', () => ({ pino: pinoSpy }));
    vi.doMock('pino-http', () => ({ pinoHttp: pinoHttpSpy }));

    const isolatedModule = await import('../src/logger');

    expect(isolatedModule.logger).toBe(mockLogger);
    expect(isolatedModule.httpLogger).toBe(mockHttpLogger);
    expect(pinoSpy).toHaveBeenCalledOnce();
    expect(pinoHttpSpy).toHaveBeenCalledOnce();
    expect(pinoHttpSpy).toHaveBeenCalledWith(expect.objectContaining({ logger: mockLogger }));
    return {
      pinoOptions: pinoSpy.mock.calls[0]?.[0] as Record<string, unknown>,
      httpOptions: pinoHttpSpy.mock.calls[0]?.[0] as Record<string, unknown>,
    };
  }

  it.each([
    { nodeEnv: 'test' as const, isProduction: false, expectedLevel: 'silent' },
    { nodeEnv: 'production' as const, isProduction: true, expectedLevel: 'info' },
    { nodeEnv: 'development' as const, isProduction: false, expectedLevel: 'debug' },
  ])(
    'uses the $expectedLevel fallback and exact transport for $nodeEnv',
    async ({ nodeEnv, isProduction, expectedLevel }) => {
      const { pinoOptions: options } = await captureLoggerOptions({ nodeEnv, isProduction, logLevel: undefined });

      expect(options).toHaveProperty('level', expectedLevel);
      expect(options).toHaveProperty(
        'transport',
        nodeEnv === 'development'
          ? {
              target: 'pino-pretty',
              options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
            }
          : undefined,
      );
    },
  );

  it('passes the exact redaction, request-id, level, serializer, and auto-log contracts to pino', async () => {
    const { pinoOptions, httpOptions } = await captureLoggerOptions({
      nodeEnv: 'test',
      isProduction: false,
      logLevel: 'warn',
    });

    expect(pinoOptions).toEqual({
      level: 'warn',
      redact: {
        paths: [
          'password',
          'currentPassword',
          'newPassword',
          'token',
          'accessToken',
          'refreshToken',
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'req.body.password',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.token',
          'req.body.accessToken',
          'req.body.refreshToken',
          'res.headers["set-cookie"]',
        ],
        censor: '[redacted]',
      },
      transport: undefined,
    });

    const genReqId = httpOptions.genReqId as (
      req: { headers: Record<string, unknown> },
      res: { setHeader: (name: string, value: string) => void },
    ) => string;
    const setHeader = vi.fn();
    expect(genReqId({ headers: { 'x-request-id': 'request-123' } }, { setHeader })).toBe('request-123');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request-123');

    const exactMaximum = 'x'.repeat(128);
    const maximumHeader = vi.fn();
    expect(genReqId({ headers: { 'x-request-id': exactMaximum } }, { setHeader: maximumHeader })).toBe(exactMaximum);
    expect(maximumHeader).toHaveBeenCalledWith('x-request-id', exactMaximum);

    for (const rejected of ['', 'x'.repeat(129), 'contains/slash', '.starts-with-punctuation']) {
      const rejectedHeader = vi.fn();
      const generated = genReqId({ headers: { 'x-request-id': rejected } }, { setHeader: rejectedHeader });
      expect(generated).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(generated).not.toBe(rejected);
      expect(rejectedHeader).toHaveBeenCalledWith('x-request-id', generated);
    }

    const customLogLevel = httpOptions.customLogLevel as (
      req: unknown,
      res: { statusCode: number },
      err?: Error,
    ) => string;
    expect(customLogLevel({}, { statusCode: 200 })).toBe('info');
    expect(customLogLevel({}, { statusCode: 400 })).toBe('warn');
    expect(customLogLevel({}, { statusCode: 500 })).toBe('error');
    expect(customLogLevel({}, { statusCode: 200 }, new Error('request failed'))).toBe('error');

    const serializers = httpOptions.serializers as {
      req: (value: Record<string, unknown>) => unknown;
      res: (value: Record<string, unknown>) => unknown;
    };
    expect(
      serializers.req({
        id: 'request-123',
        method: 'POST',
        url: '/practice/attempt',
        remoteAddress: '203.0.113.10',
        body: { password: 'must-not-be-serialized' },
      }),
    ).toEqual({
      id: 'request-123',
      method: 'POST',
      url: '/practice/attempt',
      remoteAddress: '203.0.113.10',
    });
    expect(serializers.res({ statusCode: 204, headers: { 'set-cookie': 'secret' } })).toEqual({ statusCode: 204 });

    const autoLogging = httpOptions.autoLogging as { ignore: (req: { url?: string }) => boolean };
    expect(autoLogging.ignore({ url: '/health' })).toBe(true);
    expect(autoLogging.ignore({ url: '/health?x=1' })).toBe(true);
    expect(autoLogging.ignore({ url: '/health/' })).toBe(true);
    expect(autoLogging.ignore({ url: '/HEALTH' })).toBe(true);
    expect(autoLogging.ignore({ url: undefined })).toBe(false);
    expect(autoLogging.ignore({ url: '/healthz' })).toBe(false);
    expect(autoLogging.ignore({ url: '/health//' })).toBe(false);
    expect(autoLogging.ignore({ url: '/ready' })).toBe(false);
    expect(autoLogging.ignore({ url: '/ready?x=1' })).toBe(false);
  });
});
