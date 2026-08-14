import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const bool = (defaultValue: boolean) =>
  z
    .enum(['true', 'false', '1', '0'], {
      errorMap: () => ({ message: "must be one of 'true', 'false', '1', or '0'" }),
    })
    .optional()
    .transform((v) => (v === undefined ? defaultValue : v === 'true' || v === '1'));

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
        try {
          const url = new URL(value);
          return (
            (url.protocol === 'postgres:' || url.protocol === 'postgresql:') &&
            !!url.hostname &&
            url.pathname.length > 1
          );
        } catch {
          return false;
        }
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
    FFMPEG_PATH: z.string().trim().min(1).max(1024).default('ffmpeg'),
    FFPROBE_PATH: z.string().trim().min(1).max(1024).default('ffprobe'),
    RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(15 * 60 * 1000),
    RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().min(1).default(300),
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
    MOCK_AI: bool(false),
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
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
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
  ffmpegPath: env.FFMPEG_PATH,
  ffprobePath: env.FFPROBE_PATH,
  rateLimit: {
    globalWindowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
    globalMax: env.RATE_LIMIT_GLOBAL_MAX,
    authWindowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
    authMax: env.RATE_LIMIT_AUTH_MAX,
    loginAccountWindowMs: env.RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS,
    loginAccountMax: env.RATE_LIMIT_LOGIN_ACCOUNT_MAX,
    passwordWindowMs: env.RATE_LIMIT_PASSWORD_WINDOW_MS,
    passwordMax: env.RATE_LIMIT_PASSWORD_MAX,
    registerWindowMs: env.RATE_LIMIT_REGISTER_WINDOW_MS,
    registerMax: env.RATE_LIMIT_REGISTER_MAX,
    assessWindowMs: env.RATE_LIMIT_ASSESS_WINDOW_MS,
    assessMax: env.RATE_LIMIT_ASSESS_MAX,
    uploadGrantWindowMs: env.RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS,
    uploadGrantMax: env.RATE_LIMIT_UPLOAD_GRANT_MAX,
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
