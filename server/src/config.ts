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
    DATABASE_URL: z.string({ required_error: 'DATABASE_URL is required' }).min(1, 'DATABASE_URL is required'),
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
    AI_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(10),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(70_000).default(60_000),
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
    RATE_LIMIT_ASSESS_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .default(60 * 60 * 1000),
    RATE_LIMIT_ASSESS_MAX: z.coerce.number().int().min(1).default(20),
    MOCK_AI: bool(false),
    OPENAI_API_KEY: z.string().default(''),
    // Audio ingress: empty S3_BUCKET keeps the local multipart-to-disk flow for
    // dev/test; production must store uploads in S3 via presigned PUT URLs.
    S3_BUCKET: z.string().default(''),
    S3_REGION: z.string().min(1).default('us-east-1'),
    // Optional static credentials; when empty the AWS default provider chain
    // (instance/task IAM role, shared config) is used instead.
    S3_ACCESS_KEY_ID: z.string().default(''),
    S3_SECRET_ACCESS_KEY: z.string().default(''),
    S3_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
  })
  .superRefine((env, ctx) => {
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
    if (env.NODE_ENV === 'production' && !env.S3_BUCKET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['S3_BUCKET'],
        message: 'is required in production; learner audio must be uploaded to S3 via presigned URLs',
      });
    }
    if (env.ASSESS_GLOBAL_DAILY_CAP < env.ASSESS_DAILY_CAP) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ASSESS_GLOBAL_DAILY_CAP'],
        message: 'must be greater than or equal to ASSESS_DAILY_CAP',
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
  aiMaxConcurrency: env.AI_MAX_CONCURRENCY,
  openaiTimeoutMs: env.OPENAI_TIMEOUT_MS,
  rateLimit: {
    globalWindowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
    globalMax: env.RATE_LIMIT_GLOBAL_MAX,
    authWindowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
    authMax: env.RATE_LIMIT_AUTH_MAX,
    assessWindowMs: env.RATE_LIMIT_ASSESS_WINDOW_MS,
    assessMax: env.RATE_LIMIT_ASSESS_MAX,
  },
  mockAi: env.MOCK_AI,
  openaiApiKey: env.OPENAI_API_KEY,
  s3: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    uploadUrlTtlSeconds: env.S3_UPLOAD_URL_TTL_SECONDS,
  },
};
