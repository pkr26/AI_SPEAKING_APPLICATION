import { randomUUID } from 'crypto';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import { config } from './config';

// Apply redaction to the base logger, not only HTTP auto-logs. This keeps a
// future diagnostic log from leaking credentials even if it bypasses pino-http
// or adds request fields outside the allowlisted HTTP serializer.
const SENSITIVE_LOG_PATHS = [
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
] as const;

export const logger = pino({
  level: config.logLevel ?? (config.nodeEnv === 'test' ? 'silent' : config.isProduction ? 'info' : 'debug'),
  redact: { paths: [...SENSITIVE_LOG_PATHS], censor: '[redacted]' },
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined,
});

/** HTTP request logging with request IDs (honors inbound x-request-id) and redaction. */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128 ? incoming : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  // Successful health probes are noise; log everything else at info.
  customLogLevel: (_req, res, err) =>
    err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});
