import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * config.ts parses process.env at module load and fail-fasts with
 * process.exit(1) on invalid input. Each case loads a fresh module with a
 * controlled environment; process.exit is stubbed to throw so the runner
 * survives. Note: dotenv fills gaps from server/.env, so rejection cases set
 * explicitly invalid values instead of deleting keys.
 */

const MANAGED_KEYS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV',
  'LOG_LEVEL',
  'CORS_ORIGINS',
  'TRUST_PROXY',
  'DB_POOL_MAX',
  'DB_STATEMENT_TIMEOUT_MS',
  'DB_LOCK_TIMEOUT_MS',
  'ASSESS_DAILY_CAP',
  'ASSESS_GLOBAL_DAILY_CAP',
  'AI_MAX_CONCURRENCY',
  'AUDIO_INSPECTION_MAX_CONCURRENCY',
  'OPENAI_TIMEOUT_MS',
  'FFMPEG_PATH',
  'RATE_LIMIT_GLOBAL_WINDOW_MS',
  'RATE_LIMIT_GLOBAL_MAX',
  'RATE_LIMIT_AUTH_WINDOW_MS',
  'RATE_LIMIT_AUTH_MAX',
  'RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS',
  'RATE_LIMIT_LOGIN_ACCOUNT_MAX',
  'RATE_LIMIT_ASSESS_WINDOW_MS',
  'RATE_LIMIT_ASSESS_MAX',
  'RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS',
  'RATE_LIMIT_UPLOAD_GRANT_MAX',
  'MOCK_AI',
  'OPENAI_API_KEY',
  'S3_BUCKET',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_SESSION_TOKEN',
  'S3_UPLOAD_URL_TTL_SECONDS',
  'S3_OPERATION_TIMEOUT_MS',
];

const VALID_SECRET = 'a-realistic-signing-secret-with-32-plus-characters';

function baseEnv(overrides: Record<string, string>): Record<string, string> {
  return {
    DATABASE_URL: 'postgres://localhost:5432/ai_english_test',
    JWT_SECRET: VALID_SECRET,
    NODE_ENV: 'test',
    MOCK_AI: 'true',
    ...overrides,
  };
}

let savedEnv: NodeJS.ProcessEnv;
let exitSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  savedEnv = { ...process.env };
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as never);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  vi.restoreAllMocks();
});

async function loadConfig(env: Record<string, string>) {
  for (const key of MANAGED_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  vi.resetModules();
  return (await import('../src/config')).config;
}

async function expectInvalid(env: Record<string, string>, fragment: string) {
  await expect(loadConfig(env)).rejects.toThrow('process.exit called');
  expect(exitSpy).toHaveBeenCalledWith(1);
  expect(errorSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain(fragment);
}

describe('config env validation', () => {
  it('applies documented defaults when optional variables are absent', async () => {
    const config = await loadConfig(baseEnv({}));
    expect(config.port).toBe(4000);
    expect(config.nodeEnv).toBe('test');
    expect(config.isProduction).toBe(false);
    expect(config.dbPoolMax).toBe(20);
    expect(config.dbStatementTimeoutMs).toBe(10_000);
    expect(config.dbLockTimeoutMs).toBe(5_000);
    expect(config.assessDailyCap).toBe(150);
    expect(config.assessGlobalDailyCap).toBe(5000);
    expect(config.aiMaxConcurrency).toBe(10);
    expect(config.audioInspectionMaxConcurrency).toBe(4);
    expect(config.openaiTimeoutMs).toBe(60_000);
    expect(config.ffmpegPath).toBe('ffmpeg');
    expect(config.rateLimit).toEqual({
      globalWindowMs: 15 * 60 * 1000,
      globalMax: 300,
      authWindowMs: 15 * 60 * 1000,
      authMax: 20,
      loginAccountWindowMs: 15 * 60 * 1000,
      loginAccountMax: 10,
      assessWindowMs: 60 * 60 * 1000,
      assessMax: 20,
      uploadGrantWindowMs: 60 * 60 * 1000,
      uploadGrantMax: 40,
    });
    expect(config.trustProxy).toBe(false);
    expect(config.corsOrigins).toEqual([]);
    expect(config.mockAi).toBe(true);
    expect(config.openaiApiKey).toBe('');
    expect(config.s3).toEqual({
      bucket: '',
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
      sessionToken: '',
      uploadUrlTtlSeconds: 300,
      operationTimeoutMs: 30_000,
    });
  });

  it('parses explicit numeric and list values', async () => {
    const config = await loadConfig(
      baseEnv({
        PORT: '4123',
        DB_POOL_MAX: '7',
        ASSESS_DAILY_CAP: '3',
        ASSESS_GLOBAL_DAILY_CAP: '9',
        AI_MAX_CONCURRENCY: '2',
        AUDIO_INSPECTION_MAX_CONCURRENCY: '3',
        OPENAI_TIMEOUT_MS: '5000',
        FFMPEG_PATH: '/opt/tools/ffmpeg',
        RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS: '180000',
        RATE_LIMIT_LOGIN_ACCOUNT_MAX: '6',
        RATE_LIMIT_ASSESS_MAX: '4',
        RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS: '120000',
        RATE_LIMIT_UPLOAD_GRANT_MAX: '8',
        CORS_ORIGINS: ' https://a.example ,,https://b.example ',
        S3_UPLOAD_URL_TTL_SECONDS: '120',
        S3_OPERATION_TIMEOUT_MS: '4000',
        LOG_LEVEL: 'warn',
      }),
    );
    expect(config.port).toBe(4123);
    expect(config.dbPoolMax).toBe(7);
    expect(config.assessDailyCap).toBe(3);
    expect(config.assessGlobalDailyCap).toBe(9);
    expect(config.aiMaxConcurrency).toBe(2);
    expect(config.audioInspectionMaxConcurrency).toBe(3);
    expect(config.openaiTimeoutMs).toBe(5000);
    expect(config.ffmpegPath).toBe('/opt/tools/ffmpeg');
    expect(config.rateLimit.loginAccountWindowMs).toBe(180_000);
    expect(config.rateLimit.loginAccountMax).toBe(6);
    expect(config.rateLimit.assessMax).toBe(4);
    expect(config.rateLimit.uploadGrantWindowMs).toBe(120_000);
    expect(config.rateLimit.uploadGrantMax).toBe(8);
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.s3.uploadUrlTtlSeconds).toBe(120);
    expect(config.s3.operationTimeoutMs).toBe(4000);
    expect(config.logLevel).toBe('warn');
  });

  it('rejects a missing/empty DATABASE_URL and a short JWT_SECRET', async () => {
    await expectInvalid(baseEnv({ DATABASE_URL: '' }), 'DATABASE_URL is required');
    await expectInvalid(baseEnv({ JWT_SECRET: 'too-short' }), 'JWT_SECRET must be at least 32 characters');
  });

  it('rejects non-numeric and out-of-range ports', async () => {
    await expectInvalid(baseEnv({ PORT: 'abc' }), 'PORT');
    await expectInvalid(baseEnv({ PORT: '0' }), 'PORT');
    await expectInvalid(baseEnv({ PORT: '70000' }), 'PORT');
  });

  it('parses MOCK_AI boolean spellings and rejects junk', async () => {
    expect((await loadConfig(baseEnv({ MOCK_AI: '1' }))).mockAi).toBe(true);
    expect((await loadConfig(baseEnv({ MOCK_AI: '0', OPENAI_API_KEY: 'sk-x' }))).mockAi).toBe(false);
    expect((await loadConfig(baseEnv({ MOCK_AI: 'false', OPENAI_API_KEY: 'sk-x' }))).mockAi).toBe(false);
    await expectInvalid(baseEnv({ MOCK_AI: 'yes' }), "must be one of 'true', 'false', '1', or '0'");
  });

  it('parses TRUST_PROXY hop counts and rejects unsafe values', async () => {
    expect((await loadConfig(baseEnv({ TRUST_PROXY: '0' }))).trustProxy).toBe(false);
    expect((await loadConfig(baseEnv({ TRUST_PROXY: 'false' }))).trustProxy).toBe(false);
    expect((await loadConfig(baseEnv({ TRUST_PROXY: ' FALSE ' }))).trustProxy).toBe(false);
    expect((await loadConfig(baseEnv({ TRUST_PROXY: '3' }))).trustProxy).toBe(3);
    expect((await loadConfig(baseEnv({ TRUST_PROXY: '10' }))).trustProxy).toBe(10);
    await expectInvalid(baseEnv({ TRUST_PROXY: 'true' }), "not 'true'");
    await expectInvalid(baseEnv({ TRUST_PROXY: '11' }), 'proxy hop count from 0 to 10');
    await expectInvalid(baseEnv({ TRUST_PROXY: '01' }), 'proxy hop count from 0 to 10');
    await expectInvalid(baseEnv({ TRUST_PROXY: '-1' }), 'proxy hop count from 0 to 10');
  });

  it('requires OPENAI_API_KEY when MOCK_AI=false', async () => {
    await expectInvalid(baseEnv({ MOCK_AI: 'false', OPENAI_API_KEY: '' }), 'OPENAI_API_KEY');
    const config = await loadConfig(baseEnv({ MOCK_AI: 'false', OPENAI_API_KEY: 'sk-real' }));
    expect(config.openaiApiKey).toBe('sk-real');
  });

  it('enforces production invariants: no mock AI, no placeholder secret, S3 required', async () => {
    await expectInvalid(baseEnv({ NODE_ENV: 'production', MOCK_AI: 'true' }), 'must be false in production');
    await expectInvalid(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        JWT_SECRET: 'this-is-a-test-secret-with-enough-length',
        S3_BUCKET: 'audio-bucket',
      }),
      'looks like a placeholder',
    );
    await expectInvalid(
      baseEnv({ NODE_ENV: 'production', MOCK_AI: 'false', OPENAI_API_KEY: 'sk-real', S3_BUCKET: '' }),
      'S3_BUCKET',
    );
    const prod = await loadConfig(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        S3_BUCKET: 'audio-bucket',
        DATABASE_URL: 'postgres://db.example/ai_english?sslmode=verify-full',
      }),
    );
    expect(prod.isProduction).toBe(true);
    expect(prod.s3.bucket).toBe('audio-bucket');
  });

  it('requires a structured database URL and verified TLS in production', async () => {
    await expectInvalid(baseEnv({ DATABASE_URL: 'not-a-database' }), 'must be a PostgreSQL URL');
    await expectInvalid(baseEnv({ DATABASE_URL: 'https://db.example/ai_english' }), 'must be a PostgreSQL URL');
    await expectInvalid(baseEnv({ DATABASE_URL: 'postgres://db.example' }), 'must be a PostgreSQL URL');
    await expectInvalid(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        S3_BUCKET: 'audio-bucket',
        DATABASE_URL: 'postgres://db.example/ai_english?sslmode=require',
      }),
      'sslmode=verify-full',
    );
  });

  it('requires complete, nonblank static S3 credentials and supports a session token', async () => {
    await expectInvalid(
      baseEnv({ S3_BUCKET: 'audio-bucket', S3_ACCESS_KEY_ID: 'access-only' }),
      'must either both be set or both be empty',
    );
    await expectInvalid(
      baseEnv({ S3_BUCKET: 'audio-bucket', S3_SECRET_ACCESS_KEY: 'secret-only' }),
      'must either both be set or both be empty',
    );
    await expectInvalid(
      baseEnv({
        S3_BUCKET: 'audio-bucket',
        S3_ACCESS_KEY_ID: '   ',
        S3_SECRET_ACCESS_KEY: 'secret-only',
      }),
      'must either both be set or both be empty',
    );
    await expectInvalid(baseEnv({ S3_SESSION_TOKEN: 'token-only' }), 'requires both');
    await expectInvalid(baseEnv({ S3_ACCESS_KEY_ID: 'access', S3_SECRET_ACCESS_KEY: 'secret' }), 'S3_BUCKET');

    const config = await loadConfig(
      baseEnv({
        S3_BUCKET: ' audio-bucket ',
        S3_ACCESS_KEY_ID: ' access ',
        S3_SECRET_ACCESS_KEY: ' secret ',
        S3_SESSION_TOKEN: ' session ',
      }),
    );
    expect(config.s3).toMatchObject({
      bucket: 'audio-bucket',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      sessionToken: 'session',
    });
  });

  it('rejects ASSESS_GLOBAL_DAILY_CAP below ASSESS_DAILY_CAP', async () => {
    await expectInvalid(
      baseEnv({ ASSESS_DAILY_CAP: '10', ASSESS_GLOBAL_DAILY_CAP: '5' }),
      'must be greater than or equal to ASSESS_DAILY_CAP',
    );
    const ok = await loadConfig(baseEnv({ ASSESS_DAILY_CAP: '5', ASSESS_GLOBAL_DAILY_CAP: '5' }));
    expect(ok.assessGlobalDailyCap).toBe(5);
  });

  it('rejects out-of-range pool and timeout numbers', async () => {
    await expectInvalid(baseEnv({ DB_POOL_MAX: '0' }), 'DB_POOL_MAX');
    await expectInvalid(baseEnv({ DB_POOL_MAX: '101' }), 'DB_POOL_MAX');
    await expectInvalid(baseEnv({ DB_STATEMENT_TIMEOUT_MS: '500' }), 'DB_STATEMENT_TIMEOUT_MS');
    await expectInvalid(baseEnv({ AUDIO_INSPECTION_MAX_CONCURRENCY: '0' }), 'AUDIO_INSPECTION_MAX_CONCURRENCY');
    await expectInvalid(baseEnv({ AUDIO_INSPECTION_MAX_CONCURRENCY: '33' }), 'AUDIO_INSPECTION_MAX_CONCURRENCY');
    await expectInvalid(baseEnv({ OPENAI_TIMEOUT_MS: '999' }), 'OPENAI_TIMEOUT_MS');
    await expectInvalid(baseEnv({ RATE_LIMIT_GLOBAL_WINDOW_MS: '500' }), 'RATE_LIMIT_GLOBAL_WINDOW_MS');
    await expectInvalid(baseEnv({ RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS: '500' }), 'RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS');
    await expectInvalid(baseEnv({ RATE_LIMIT_LOGIN_ACCOUNT_MAX: '0' }), 'RATE_LIMIT_LOGIN_ACCOUNT_MAX');
    await expectInvalid(baseEnv({ RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS: '500' }), 'RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS');
    await expectInvalid(baseEnv({ RATE_LIMIT_UPLOAD_GRANT_MAX: '0' }), 'RATE_LIMIT_UPLOAD_GRANT_MAX');
    await expectInvalid(baseEnv({ S3_UPLOAD_URL_TTL_SECONDS: '30' }), 'S3_UPLOAD_URL_TTL_SECONDS');
    await expectInvalid(baseEnv({ S3_OPERATION_TIMEOUT_MS: '500' }), 'S3_OPERATION_TIMEOUT_MS');
  });
});
