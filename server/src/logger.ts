import { randomUUID } from 'crypto';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import { config } from './config';

export const logger = pino({
  level: config.logLevel ?? (config.nodeEnv === 'test' ? 'silent' : config.isProduction ? 'info' : 'debug'),
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
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.currentPassword',
      'req.body.newPassword',
      'res.headers["set-cookie"]',
    ],
    censor: '[redacted]',
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
