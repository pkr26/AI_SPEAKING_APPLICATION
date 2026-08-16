import dotenv from 'dotenv';
import { isIP } from 'node:net';
import { z } from 'zod';

dotenv.config();

const bool = z
  .enum(['true', 'false', '1', '0'], {
    errorMap: () => ({ message: "must be one of 'true', 'false', '1', or '0'" }),
  })
  .optional()
  .transform((v) => v === 'true' || v === '1');

const trustProxyHops = z
  .string()
  .default('0')
  .transform((raw, ctx): false | number => {
    const value = raw.trim().toLowerCase();
    if (value === '0' || value === 'false') return false;
    if (value === 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "must be an exact proxy hop count, not 'true' (which trusts spoofed forwarding headers)",
      });
      return z.NEVER;
    }
    if (!/^[1-9]\d*$/.test(value) || Number(value) > 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be a proxy hop count from 0 to 10' });
      return z.NEVER;
    }
    return Number(value);
  });

const envSchema = z
  .object({
    DATABASE_URL: z
      .string({ required_error: 'DATABASE_URL is required' })
      .trim()
      .min(1, 'DATABASE_URL is required')
      .refine((value) => {
        if (!URL.canParse(value)) return false;
        const url = new URL(value);
        return (
          (url.protocol === 'postgres:' || url.protocol === 'postgresql:') && !!url.hostname && url.pathname.length > 1
        );
      }, 'must be a PostgreSQL URL with a host and database name'),
    JWT_SECRET: z
      .string({ required_error: 'JWT_SECRET is required (no default — set a real secret)' })
      .min(32, 'JWT_SECRET must be at least 32 characters'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).optional(),
    CORS_ORIGINS: z.string().default(''),
    TRUST_PROXY: trustProxyHops,
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(10_000),
    DB_LOCK_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(5_000),
    ASSESS_DAILY_CAP: z.coerce.number().int().min(1).default(150),
    ASSESS_GLOBAL_DAILY_CAP: z.coerce.number().int().min(1).default(5000),
    // Per-IP fixed-window daily budget on paid assessment submissions; bounds
    // spend from account re-registration cycling (per-user caps reset with each
    // new identity). Must cover at least one user's full daily allowance.
    ASSESS_IP_DAILY_CAP: z.coerce.number().int().min(1).default(300),
    AI_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(10),
    AUDIO_INSPECTION_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(70_000).default(60_000),
    // Structured-output transcript grader. Kept in config so a model
    // deprecation is an env change, not a code release.
    GRADING_MODEL: z.string().trim().min(1).max(128).default('gpt-4o-mini-2024-07-18'),
    // Graceful-shutdown drain budget. The default sits above the 130s
    // worst-case request budget (S3 download + provider deadline + ingress
    // margin, see index.ts requestTimeout) so a deploy never socket-kills the
    // slowest legitimate assessment.
    SHUTDOWN_DRAIN_MS: z.coerce.number().int().min(10_000).max(300_000).default(140_000),
    // Prometheus endpoint gate. Off by default: GET /metrics exposes
    // operational detail (routes, latencies, provider error rates) and must
    // only be scraped from a private network when enabled (404 when off).
    METRICS_ENABLED: bool,
    // Oldest app version the API still answers ("1.2.3"); empty disables the
    // X-Client-Version gate. Response contracts are additive-only, so this is
    // for retiring clients that predate a required behavior, not routine use.
    MIN_CLIENT_VERSION: z
      .string()
      .trim()
      .default('')
      .refine((value) => value === '' || /^\d{1,9}(\.\d{1,9}){0,2}$/.test(value), {
        message: "must be a dotted numeric version like '1.2.3' (or empty to disable the client gate)",
      }),
    FFMPEG_PATH: z.string().trim().min(1).max(1024).default('ffmpeg'),
    FFPROBE_PATH: z.string().trim().min(1).max(1024).default('ffprobe'),
    // Password-reset delivery. 'log' (default) writes the mail to the info log
    // for dev/manual delivery; 'webhook' POSTs {to, subject, text} to
    // MAIL_WEBHOOK_URL so an external relay owns the actual sending.
    MAIL_MODE: z
      .enum(['log', 'webhook'], {
        errorMap: () => ({ message: "must be 'log' or 'webhook'" }),
      })
      .default('log'),
    MAIL_WEBHOOK_URL: z
      .string()
      .trim()
      .max(2048)
      .default('')
      .refine((value) => {
        if (value === '') return true;
        if (!URL.canParse(value)) return false;
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      }, 'must be an http(s) URL (or empty when MAIL_MODE=log)'),
    RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).default(300),
    // Counter store for the coarse global per-IP flood brake. 'memory'
    // (default) keeps it in-process: RATE_LIMIT_GLOBAL_MAX becomes a
    // per-replica budget and no database row is written per client IP.
    // 'postgres' shares one cluster-wide budget through the shared store.
    // Security-sensitive limiters always stay PostgreSQL-backed.
    RATE_LIMIT_GLOBAL_STORE: z
      .enum(['memory', 'postgres'], {
        errorMap: () => ({ message: "must be 'memory' or 'postgres'" }),
      })
      .default('memory'),
    RATE_LIMIT_AUTH_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).default(20),
    RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(86_400_000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_LOGIN_ACCOUNT_MAX: z.coerce.number().int().min(1).max(100_000).default(10),
    RATE_LIMIT_PASSWORD_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(86_400_000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_PASSWORD_MAX: z.coerce.number().int().min(1).max(100_000).default(10),
    // Account creation is the heaviest unauthenticated action (bcrypt +
    // identity provisioning) and the entry point for bulk account cycling, so
    // it carries a tighter per-IP budget than the credential routes.
    RATE_LIMIT_REGISTER_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(86_400_000)
      .default(60 * 60 * 1000),
    RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().min(1).max(100_000).default(10),
    // Per-target-email budget for password-reset requests: bounds mailbox spam
    // and token churn against one address across source IPs. Over-budget
    // requests still answer 204 (the route silently skips issuing/sending), so
    // the response never becomes an existence or throttling oracle.
    RATE_LIMIT_FORGOT_EMAIL_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(86_400_000)
      .default(60 * 60 * 1000),
    RATE_LIMIT_FORGOT_EMAIL_MAX: z.coerce.number().int().min(1).max(100_000).default(5),
    RATE_LIMIT_ASSESS_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(60 * 60 * 1000),
    RATE_LIMIT_ASSESS_MAX: z.coerce.number().int().min(1).default(20),
    RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(86_400_000)
      .default(60 * 60 * 1000),
    RATE_LIMIT_UPLOAD_GRANT_MAX: z.coerce.number().int().min(1).max(100_000).default(40),
    MOCK_AI: bool,
    OPENAI_API_KEY: z.string().default(''),
    // Audio ingress: empty S3_BUCKET keeps the local multipart-to-disk flow for
    // dev/test; production must store uploads in S3 via presigned POST grants.
    S3_BUCKET: z.string().trim().default(''),
    S3_REGION: z.string().trim().min(1).default('us-east-1'),
    // Optional static credentials; when empty the AWS default provider chain
    // (instance/task IAM role, shared config) is used instead.
    S3_ACCESS_KEY_ID: z.string().trim().max(256).default(''),
    S3_SECRET_ACCESS_KEY: z.string().trim().max(4096).default(''),
    S3_SESSION_TOKEN: z.string().trim().max(8192).default(''),
    S3_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
    S3_OPERATION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60_000).default(30_000),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      try {
        const databaseUrl = new URL(env.DATABASE_URL);
        if (databaseUrl.searchParams.get('sslmode') !== 'verify-full') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['DATABASE_URL'],
            message: 'must set sslmode=verify-full in production',
          });
        }
      } catch {
        // The field-level URL issue is more specific.
      }
    }
    if (env.MAIL_MODE === 'webhook' && !env.MAIL_WEBHOOK_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MAIL_WEBHOOK_URL'],
        message: 'is required when MAIL_MODE=webhook',
      });
    }
    // In production, 'log' mode would write live password-reset tokens to the
    // info log and deliver no mail at all; a plaintext webhook URL would POST
    // the same account-takeover tokens in cleartext. Loopback http stays
    // allowed for co-located relays that never leave the host.
    if (env.NODE_ENV === 'production' && env.MAIL_MODE !== 'webhook') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MAIL_MODE'],
        message: "must be 'webhook' in production; 'log' writes live reset tokens to logs and delivers no mail",
      });
    }
    if (env.NODE_ENV === 'production' && env.MAIL_WEBHOOK_URL) {
      try {
        const webhookUrl = new URL(env.MAIL_WEBHOOK_URL);
        const isIpv4Loopback = isIP(webhookUrl.hostname) === 4 && webhookUrl.hostname.split('.', 1)[0] === '127';
        const isLoopback =
          webhookUrl.hostname === 'localhost' ||
          webhookUrl.hostname.endsWith('.localhost') ||
          isIpv4Loopback ||
          webhookUrl.hostname === '[::1]';
        if (webhookUrl.protocol === 'http:' && !isLoopback) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['MAIL_WEBHOOK_URL'],
            message: 'must be an https URL in production (http is allowed only for loopback hosts)',
          });
        }
      } catch {
        // The field-level URL issue is more specific.
      }
    }
    if (!env.MOCK_AI && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['OPENAI_API_KEY'],
        message: 'is required when MOCK_AI=false',
      });
    }
    if (env.NODE_ENV === 'production' && env.MOCK_AI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MOCK_AI'],
        message: 'must be false in production; simulated scoring must never reach learners',
      });
    }
    if (env.NODE_ENV === 'production' && /(example|replace|change|test[-_ ]?secret)/i.test(env.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'looks like a placeholder and is not allowed in production',
      });
    }
    // A 32-character secret built from a handful of characters (all-same-char,
    // short repeating cycles) still passes the length check but is trivially
    // brute-forced; anyone with the secret forges every user's token.
    if (env.NODE_ENV === 'production' && new Set(env.JWT_SECRET).size < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'must have at least 10 distinct characters in production; use a randomly generated secret',
      });
    }
    if (env.NODE_ENV === 'production' && !env.S3_BUCKET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['S3_BUCKET'],
        message: 'is required in production; learner audio must use size-constrained S3 presigned POST grants',
      });
    }
    const hasS3AccessKey = env.S3_ACCESS_KEY_ID.length > 0;
    const hasS3SecretKey = env.S3_SECRET_ACCESS_KEY.length > 0;
    if (hasS3AccessKey !== hasS3SecretKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['S3_ACCESS_KEY_ID'],
        message: 'and S3_SECRET_ACCESS_KEY must either both be set or both be empty',
      });
    }
    if (env.S3_SESSION_TOKEN && !(hasS3AccessKey && hasS3SecretKey)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['S3_SESSION_TOKEN'],
        message: 'requires both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY',
      });
    }
    if (!env.S3_BUCKET && (hasS3AccessKey || hasS3SecretKey || env.S3_SESSION_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['S3_BUCKET'],
        message: 'is required when static S3 credentials are configured',
      });
    }
    if (env.ASSESS_GLOBAL_DAILY_CAP < env.ASSESS_DAILY_CAP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ASSESS_GLOBAL_DAILY_CAP'],
        message: 'must be greater than or equal to ASSESS_DAILY_CAP',
      });
    }
    if (env.ASSESS_IP_DAILY_CAP < env.ASSESS_DAILY_CAP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ASSESS_IP_DAILY_CAP'],
        message: 'must be greater than or equal to ASSESS_DAILY_CAP so one learner keeps their full daily allowance',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);
export function formatConfigProblems(issues: ReadonlyArray<{ path: Array<string | number>; message: string }>): string {
  return issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`).join('\n');
}

if (!parsed.success) {
  const problems = formatConfigProblems(parsed.error.issues);
  // Config is loaded before the logger exists; stderr + exit is the intended fail-fast.
  console.error(`Invalid environment configuration:\n${problems}`);
  process.exit(1);
}
const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  logLevel: env.LOG_LEVEL,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  trustProxy: env.TRUST_PROXY,
  dbPoolMax: env.DB_POOL_MAX,
  dbStatementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
  dbLockTimeoutMs: env.DB_LOCK_TIMEOUT_MS,
  assessDailyCap: env.ASSESS_DAILY_CAP,
  assessGlobalDailyCap: env.ASSESS_GLOBAL_DAILY_CAP,
  assessIpDailyCap: env.ASSESS_IP_DAILY_CAP,
  aiMaxConcurrency: env.AI_MAX_CONCURRENCY,
  audioInspectionMaxConcurrency: env.AUDIO_INSPECTION_MAX_CONCURRENCY,
  openaiTimeoutMs: env.OPENAI_TIMEOUT_MS,
  gradingModel: env.GRADING_MODEL,
  shutdownDrainMs: env.SHUTDOWN_DRAIN_MS,
  metricsEnabled: env.METRICS_ENABLED,
  minClientVersion: env.MIN_CLIENT_VERSION || undefined,
  ffmpegPath: env.FFMPEG_PATH,
  ffprobePath: env.FFPROBE_PATH,
  rateLimit: {
    globalWindowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
    globalMax: env.RATE_LIMIT_GLOBAL_MAX,
    globalStore: env.RATE_LIMIT_GLOBAL_STORE,
    authWindowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
    authMax: env.RATE_LIMIT_AUTH_MAX,
    loginAccountWindowMs: env.RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS,
    loginAccountMax: env.RATE_LIMIT_LOGIN_ACCOUNT_MAX,
    passwordWindowMs: env.RATE_LIMIT_PASSWORD_WINDOW_MS,
    passwordMax: env.RATE_LIMIT_PASSWORD_MAX,
    registerWindowMs: env.RATE_LIMIT_REGISTER_WINDOW_MS,
    registerMax: env.RATE_LIMIT_REGISTER_MAX,
    forgotEmailWindowMs: env.RATE_LIMIT_FORGOT_EMAIL_WINDOW_MS,
    forgotEmailMax: env.RATE_LIMIT_FORGOT_EMAIL_MAX,
    assessWindowMs: env.RATE_LIMIT_ASSESS_WINDOW_MS,
    assessMax: env.RATE_LIMIT_ASSESS_MAX,
    uploadGrantWindowMs: env.RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS,
    uploadGrantMax: env.RATE_LIMIT_UPLOAD_GRANT_MAX,
  },
  mail: {
    mode: env.MAIL_MODE,
    webhookUrl: env.MAIL_WEBHOOK_URL,
  },
  mockAi: env.MOCK_AI,
  openaiApiKey: env.OPENAI_API_KEY,
  s3: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    sessionToken: env.S3_SESSION_TOKEN,
    uploadUrlTtlSeconds: env.S3_UPLOAD_URL_TTL_SECONDS,
    operationTimeoutMs: env.S3_OPERATION_TIMEOUT_MS,
  },
};
