import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * config.ts parses process.env at module load and fail-fasts with
 * process.exit(1) on invalid input. Each case loads a fresh module with a
 * controlled environment; process.exit is stubbed to throw so the runner
 * survives. dotenv is mocked out so a developer's server/.env can never
 * backfill a key a test deliberately deleted (which would make "defaults"
 * assertions vacuous on that machine).
 */
vi.mock('dotenv', () => ({ default: { config: () => ({}) } }));

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
  'ASSESS_IP_DAILY_CAP',
  'AI_MAX_CONCURRENCY',
  'AUDIO_INSPECTION_MAX_CONCURRENCY',
  'OPENAI_TIMEOUT_MS',
  'GRADING_MODEL',
  'SHUTDOWN_DRAIN_MS',
  'METRICS_ENABLED',
  'MIN_CLIENT_VERSION',
  'FFMPEG_PATH',
  'FFPROBE_PATH',
  'MAIL_MODE',
  'MAIL_WEBHOOK_URL',
  'RATE_LIMIT_GLOBAL_WINDOW_MS',
  'RATE_LIMIT_GLOBAL_MAX',
  'RATE_LIMIT_GLOBAL_STORE',
  'RATE_LIMIT_AUTH_WINDOW_MS',
  'RATE_LIMIT_AUTH_MAX',
  'RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS',
  'RATE_LIMIT_LOGIN_ACCOUNT_MAX',
  'RATE_LIMIT_PASSWORD_WINDOW_MS',
  'RATE_LIMIT_PASSWORD_MAX',
  'RATE_LIMIT_REGISTER_WINDOW_MS',
  'RATE_LIMIT_REGISTER_MAX',
  'RATE_LIMIT_FORGOT_EMAIL_WINDOW_MS',
  'RATE_LIMIT_FORGOT_EMAIL_MAX',
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

// Production boots only with real mail delivery configured (F-5 guard).
const PRODUCTION_MAIL = {
  MAIL_MODE: 'webhook',
  MAIL_WEBHOOK_URL: 'https://relay.example/hooks/mail',
} as const;

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

async function loadConfigModule(env: Record<string, string>) {
  for (const key of MANAGED_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  vi.resetModules();
  return import('../src/config');
}

async function loadConfig(env: Record<string, string>) {
  return (await loadConfigModule(env)).config;
}

async function expectInvalid(env: Record<string, string>, fragment: string) {
  exitSpy.mockClear();
  errorSpy.mockClear();
  await expect(loadConfig(env)).rejects.toThrow('process.exit called');
  expect(exitSpy).toHaveBeenCalledWith(1);
  expect(errorSpy.mock.calls.map((c: unknown[]) => String(c[0])).join('\n')).toContain(fragment);
}

async function expectSingleInvalidIssue(env: Record<string, string>, path: string, message: string) {
  exitSpy.mockClear();
  errorSpy.mockClear();
  await expect(loadConfig(env)).rejects.toThrow('process.exit called');
  expect(exitSpy).toHaveBeenCalledWith(1);
  expect(errorSpy).toHaveBeenCalledOnce();
  expect(errorSpy).toHaveBeenCalledWith(`Invalid environment configuration:\n  - ${path}: ${message}`);
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
    expect(config.assessIpDailyCap).toBe(300);
    expect(config.aiMaxConcurrency).toBe(10);
    expect(config.audioInspectionMaxConcurrency).toBe(4);
    expect(config.openaiTimeoutMs).toBe(60_000);
    expect(config.gradingModel).toBe('gpt-4o-mini-2024-07-18');
    expect(config.shutdownDrainMs).toBe(140_000);
    expect(config.metricsEnabled).toBe(false);
    expect(config.minClientVersion).toBeUndefined();
    expect(config.ffmpegPath).toBe('ffmpeg');
    expect(config.ffprobePath).toBe('ffprobe');
    expect(config.rateLimit).toEqual({
      globalWindowMs: 15 * 60 * 1000,
      globalMax: 300,
      globalStore: 'memory',
      authWindowMs: 15 * 60 * 1000,
      authMax: 20,
      loginAccountWindowMs: 15 * 60 * 1000,
      loginAccountMax: 10,
      passwordWindowMs: 15 * 60 * 1000,
      passwordMax: 10,
      registerWindowMs: 60 * 60 * 1000,
      registerMax: 10,
      forgotEmailWindowMs: 60 * 60 * 1000,
      forgotEmailMax: 5,
      assessWindowMs: 60 * 60 * 1000,
      assessMax: 20,
      uploadGrantWindowMs: 60 * 60 * 1000,
      uploadGrantMax: 40,
    });
    expect(config.trustProxy).toBe(false);
    expect(config.corsOrigins).toEqual([]);
    expect(config.mail).toEqual({ mode: 'log', webhookUrl: '' });
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

  it('uses the documented development and real-provider defaults when their variables are absent', async () => {
    const env = baseEnv({ OPENAI_API_KEY: 'sk-real' });
    delete env.NODE_ENV;
    delete env.MOCK_AI;

    const config = await loadConfig(env);
    expect(config.nodeEnv).toBe('development');
    expect(config.isProduction).toBe(false);
    expect(config.mockAi).toBe(false);
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
        FFMPEG_PATH: ' /opt/tools/ffmpeg ',
        FFPROBE_PATH: ' /opt/tools/ffprobe ',
        RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS: '180000',
        RATE_LIMIT_LOGIN_ACCOUNT_MAX: '6',
        RATE_LIMIT_ASSESS_MAX: '4',
        RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS: '120000',
        RATE_LIMIT_UPLOAD_GRANT_MAX: '8',
        CORS_ORIGINS: ' https://a.example ,,https://b.example ',
        S3_REGION: ' eu-west-2 ',
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
    expect(config.ffprobePath).toBe('/opt/tools/ffprobe');
    expect(config.rateLimit.loginAccountWindowMs).toBe(180_000);
    expect(config.rateLimit.loginAccountMax).toBe(6);
    expect(config.rateLimit.assessMax).toBe(4);
    expect(config.rateLimit.uploadGrantWindowMs).toBe(120_000);
    expect(config.rateLimit.uploadGrantMax).toBe(8);
    expect(config.corsOrigins).toEqual(['https://a.example', 'https://b.example']);
    expect(config.s3.uploadUrlTtlSeconds).toBe(120);
    expect(config.s3.operationTimeoutMs).toBe(4000);
    expect(config.s3.region).toBe('eu-west-2');
    expect(config.logLevel).toBe('warn');
  });

  it('rejects a missing/empty DATABASE_URL and a short JWT_SECRET', async () => {
    const missingDatabase = baseEnv({});
    delete missingDatabase.DATABASE_URL;
    await expectSingleInvalidIssue(missingDatabase, 'DATABASE_URL', 'DATABASE_URL is required');
    await expectInvalid(baseEnv({ DATABASE_URL: '' }), 'DATABASE_URL is required');

    const missingSecret = baseEnv({});
    delete missingSecret.JWT_SECRET;
    await expectSingleInvalidIssue(
      missingSecret,
      'JWT_SECRET',
      'JWT_SECRET is required (no default — set a real secret)',
    );
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

  it('parses RATE_LIMIT_GLOBAL_STORE modes and rejects junk', async () => {
    expect((await loadConfig(baseEnv({}))).rateLimit.globalStore).toBe('memory');
    expect((await loadConfig(baseEnv({ RATE_LIMIT_GLOBAL_STORE: 'postgres' }))).rateLimit.globalStore).toBe('postgres');
    expect((await loadConfig(baseEnv({ RATE_LIMIT_GLOBAL_STORE: 'memory' }))).rateLimit.globalStore).toBe('memory');
    await expectSingleInvalidIssue(
      baseEnv({ RATE_LIMIT_GLOBAL_STORE: 'redis' }),
      'RATE_LIMIT_GLOBAL_STORE',
      "must be 'memory' or 'postgres'",
    );
  });

  it('parses METRICS_ENABLED boolean spellings and rejects junk', async () => {
    expect((await loadConfig(baseEnv({ METRICS_ENABLED: 'true' }))).metricsEnabled).toBe(true);
    expect((await loadConfig(baseEnv({ METRICS_ENABLED: '1' }))).metricsEnabled).toBe(true);
    expect((await loadConfig(baseEnv({ METRICS_ENABLED: '0' }))).metricsEnabled).toBe(false);
    await expectInvalid(baseEnv({ METRICS_ENABLED: 'on' }), "must be one of 'true', 'false', '1', or '0'");
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
    await expectInvalid(baseEnv({ TRUST_PROXY: '1junk' }), 'proxy hop count from 0 to 10');
    await expectInvalid(baseEnv({ TRUST_PROXY: '10x' }), 'proxy hop count from 0 to 10');
    await expectInvalid(baseEnv({ TRUST_PROXY: '-1' }), 'proxy hop count from 0 to 10');
  });

  it('requires OPENAI_API_KEY when MOCK_AI=false', async () => {
    await expectInvalid(baseEnv({ MOCK_AI: 'false', OPENAI_API_KEY: '' }), 'OPENAI_API_KEY');
    const config = await loadConfig(baseEnv({ MOCK_AI: 'false', OPENAI_API_KEY: 'sk-real' }));
    expect(config.openaiApiKey).toBe('sk-real');
  });

  it('enforces production invariants: no mock AI, no placeholder secret, S3 required', async () => {
    await expectInvalid(
      baseEnv({ NODE_ENV: 'production', MOCK_AI: 'true', ...PRODUCTION_MAIL }),
      'must be false in production',
    );
    await expectInvalid(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        JWT_SECRET: 'this-is-a-test-secret-with-enough-length',
        S3_BUCKET: 'audio-bucket',
        ...PRODUCTION_MAIL,
      }),
      'looks like a placeholder',
    );
    await expectInvalid(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        S3_BUCKET: '',
        ...PRODUCTION_MAIL,
      }),
      'S3_BUCKET',
    );
    await expectInvalid(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        JWT_SECRET: 'this is a test secret with enough length',
        S3_BUCKET: 'audio-bucket',
        ...PRODUCTION_MAIL,
      }),
      'looks like a placeholder',
    );
    const prod = await loadConfig(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        S3_BUCKET: 'audio-bucket',
        DATABASE_URL: 'postgres://db.example/ai_english?sslmode=verify-full',
        ...PRODUCTION_MAIL,
      }),
    );
    expect(prod.isProduction).toBe(true);
    expect(prod.s3.bucket).toBe('audio-bucket');
  });

  it('requires a structured database URL and verified TLS in production', async () => {
    await expectInvalid(baseEnv({ DATABASE_URL: 'not-a-database' }), 'must be a PostgreSQL URL');
    await expectInvalid(baseEnv({ DATABASE_URL: 'https://db.example/ai_english' }), 'must be a PostgreSQL URL');
    await expectInvalid(baseEnv({ DATABASE_URL: 'postgres://db.example' }), 'must be a PostgreSQL URL');
    await expectInvalid(baseEnv({ DATABASE_URL: 'postgres://db.example/' }), 'must be a PostgreSQL URL');
    expect(
      (await loadConfig(baseEnv({ DATABASE_URL: ' postgresql://localhost:5432/ai_english_test ' }))).databaseUrl,
    ).toBe('postgresql://localhost:5432/ai_english_test');
    expect(
      (await loadConfig(baseEnv({ DATABASE_URL: 'postgresql://localhost:5432/ai_english_test' }))).databaseUrl,
    ).toBe('postgresql://localhost:5432/ai_english_test');
    await expectInvalid(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        S3_BUCKET: 'audio-bucket',
        DATABASE_URL: 'postgres://db.example/ai_english?sslmode=require',
        ...PRODUCTION_MAIL,
      }),
      'sslmode=verify-full',
    );
  });

  it('supports silent logging and rejects an unseparated testsecret placeholder in production', async () => {
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']) {
      expect((await loadConfig(baseEnv({ LOG_LEVEL: level }))).logLevel).toBe(level);
    }
    expect(
      (await loadConfig(baseEnv({ NODE_ENV: 'development', JWT_SECRET: 'this-is-a-test-secret-with-enough-length' })))
        .nodeEnv,
    ).toBe('development');
    await expectInvalid(
      baseEnv({
        NODE_ENV: 'production',
        MOCK_AI: 'false',
        OPENAI_API_KEY: 'sk-real',
        JWT_SECRET: 'prefix-testsecret-suffix-with-enough-length',
        S3_BUCKET: 'audio-bucket',
        DATABASE_URL: 'postgres://db.example/ai_english?sslmode=verify-full',
        ...PRODUCTION_MAIL,
      }),
      'looks like a placeholder',
    );
  });

  it('rejects low-entropy JWT secrets in production but not in development', async () => {
    const production = {
      NODE_ENV: 'production',
      MOCK_AI: 'false',
      OPENAI_API_KEY: 'sk-real',
      S3_BUCKET: 'audio-bucket',
      DATABASE_URL: 'postgres://db.example/ai_english?sslmode=verify-full',
      ...PRODUCTION_MAIL,
    };

    // All-same-character and short repeating cycles pass the length check but
    // carry almost no entropy.
    await expectSingleInvalidIssue(
      baseEnv({ ...production, JWT_SECRET: 'a'.repeat(32) }),
      'JWT_SECRET',
      'must have at least 10 distinct characters in production; use a randomly generated secret',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ...production, JWT_SECRET: 'ab'.repeat(16) }),
      'JWT_SECRET',
      'must have at least 10 distinct characters in production; use a randomly generated secret',
    );

    // A random hex secret has ample distinct characters.
    const accepted = await loadConfig(
      baseEnv({ ...production, JWT_SECRET: '9f1badb54e8c47d2a6f03c1e72d85b94c0e6a3f817d29b4c65e80a1f3d7c5b92' }),
    );
    expect(accepted.isProduction).toBe(true);

    const exactlyTenDistinct = await loadConfig(baseEnv({ ...production, JWT_SECRET: 'abcdefghij'.repeat(4) }));
    expect(exactlyTenDistinct.isProduction).toBe(true);

    // Outside production the length floor is the only constraint.
    expect((await loadConfig(baseEnv({ JWT_SECRET: 'a'.repeat(32) }))).jwtSecret).toBe('a'.repeat(32));
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
    await expectInvalid(baseEnv({ S3_ACCESS_KEY_ID: 'access-only' }), 'S3_BUCKET');
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

  it('rejects ASSESS_IP_DAILY_CAP below ASSESS_DAILY_CAP', async () => {
    await expectInvalid(
      baseEnv({ ASSESS_DAILY_CAP: '10', ASSESS_IP_DAILY_CAP: '5' }),
      'must be greater than or equal to ASSESS_DAILY_CAP',
    );
    const ok = await loadConfig(baseEnv({ ASSESS_DAILY_CAP: '10', ASSESS_IP_DAILY_CAP: '10' }));
    expect(ok.assessIpDailyCap).toBe(10);
  });

  it('parses the grading model, shutdown drain, and minimum client version knobs', async () => {
    const config = await loadConfig(
      baseEnv({
        GRADING_MODEL: ' gpt-4o-mini-2025-01-01 ',
        SHUTDOWN_DRAIN_MS: '10000',
        MIN_CLIENT_VERSION: ' 1.2.3 ',
      }),
    );
    expect(config.gradingModel).toBe('gpt-4o-mini-2025-01-01');
    expect(config.shutdownDrainMs).toBe(10_000);
    expect(config.minClientVersion).toBe('1.2.3');

    const maxDrain = await loadConfig(baseEnv({ SHUTDOWN_DRAIN_MS: '300000' }));
    expect(maxDrain.shutdownDrainMs).toBe(300_000);

    // Blank stays "gate disabled" rather than becoming an empty string.
    const disabledGate = await loadConfig(baseEnv({ MIN_CLIENT_VERSION: '   ' }));
    expect(disabledGate.minClientVersion).toBeUndefined();

    for (const version of ['12', '1.12', '1.2.345', '123456789.123456789.123456789']) {
      expect((await loadConfig(baseEnv({ MIN_CLIENT_VERSION: version }))).minClientVersion).toBe(version);
    }
  });

  it('parses the mailer knobs and enforces the webhook-mode URL invariants', async () => {
    const webhook = await loadConfig(
      baseEnv({ MAIL_MODE: 'webhook', MAIL_WEBHOOK_URL: ' https://relay.example/hooks/mail ' }),
    );
    expect(webhook.mail).toEqual({ mode: 'webhook', webhookUrl: 'https://relay.example/hooks/mail' });

    // A relay URL may be pre-provisioned while the mode still logs.
    const provisioned = await loadConfig(baseEnv({ MAIL_WEBHOOK_URL: 'http://relay.internal:8080/mail' }));
    expect(provisioned.mail).toEqual({ mode: 'log', webhookUrl: 'http://relay.internal:8080/mail' });

    await expectInvalid(baseEnv({ MAIL_MODE: 'smtp' }), "must be 'log' or 'webhook'");
    await expectSingleInvalidIssue(
      baseEnv({ MAIL_MODE: 'webhook' }),
      'MAIL_WEBHOOK_URL',
      'is required when MAIL_MODE=webhook',
    );
    await expectSingleInvalidIssue(
      baseEnv({ MAIL_MODE: 'webhook', MAIL_WEBHOOK_URL: 'ftp://relay.example/mail' }),
      'MAIL_WEBHOOK_URL',
      'must be an http(s) URL (or empty when MAIL_MODE=log)',
    );
    await expectSingleInvalidIssue(
      baseEnv({ MAIL_WEBHOOK_URL: 'not a url' }),
      'MAIL_WEBHOOK_URL',
      'must be an http(s) URL (or empty when MAIL_MODE=log)',
    );
  });

  it('requires webhook mode with an https relay in production, allowing only loopback http', async () => {
    const production = {
      NODE_ENV: 'production',
      MOCK_AI: 'false',
      OPENAI_API_KEY: 'sk-real',
      S3_BUCKET: 'audio-bucket',
      DATABASE_URL: 'postgres://db.example/ai_english?sslmode=verify-full',
    };

    // Log mode in production: reset tokens would sit in info logs, undelivered.
    await expectSingleInvalidIssue(
      baseEnv({ ...production }),
      'MAIL_MODE',
      "must be 'webhook' in production; 'log' writes live reset tokens to logs and delivers no mail",
    );
    await expectSingleInvalidIssue(
      baseEnv({ ...production, MAIL_MODE: 'log' }),
      'MAIL_MODE',
      "must be 'webhook' in production; 'log' writes live reset tokens to logs and delivers no mail",
    );

    // Plaintext relay URLs would POST account-takeover tokens in cleartext.
    await expectSingleInvalidIssue(
      baseEnv({ ...production, MAIL_MODE: 'webhook', MAIL_WEBHOOK_URL: 'http://relay.example/mail' }),
      'MAIL_WEBHOOK_URL',
      'must be an https URL in production (http is allowed only for loopback hosts)',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ...production, MAIL_MODE: 'webhook', MAIL_WEBHOOK_URL: 'http://127.attacker.example/mail' }),
      'MAIL_WEBHOOK_URL',
      'must be an https URL in production (http is allowed only for loopback hosts)',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ...production, MAIL_MODE: 'webhook', MAIL_WEBHOOK_URL: 'http://10.0.0.1/mail' }),
      'MAIL_WEBHOOK_URL',
      'must be an https URL in production (http is allowed only for loopback hosts)',
    );

    // Co-located relays that never leave the host may stay on plaintext http.
    for (const loopback of [
      'http://127.0.0.1:8080/mail',
      'http://127.255.1.2:8080/mail',
      'http://localhost:8080/mail',
      'http://relay.localhost:8080/mail',
      'http://[::1]:8080/mail',
    ]) {
      const config = await loadConfig(baseEnv({ ...production, MAIL_MODE: 'webhook', MAIL_WEBHOOK_URL: loopback }));
      expect(config.mail).toEqual({ mode: 'webhook', webhookUrl: loopback });
    }

    const accepted = await loadConfig(baseEnv({ ...production, ...PRODUCTION_MAIL }));
    expect(accepted.mail).toEqual({ mode: 'webhook', webhookUrl: 'https://relay.example/hooks/mail' });
  });

  it('rejects an unusable grading model, drain budget, or client version pin', async () => {
    await expectInvalid(baseEnv({ GRADING_MODEL: '   ' }), 'GRADING_MODEL');
    await expectInvalid(baseEnv({ SHUTDOWN_DRAIN_MS: '9999' }), 'SHUTDOWN_DRAIN_MS');
    await expectInvalid(baseEnv({ SHUTDOWN_DRAIN_MS: '300001' }), 'SHUTDOWN_DRAIN_MS');
    await expectSingleInvalidIssue(
      baseEnv({ MIN_CLIENT_VERSION: 'v1.2.3' }),
      'MIN_CLIENT_VERSION',
      "must be a dotted numeric version like '1.2.3' (or empty to disable the client gate)",
    );
    for (const version of ['1.2.3x', '1234567890', '1.1234567890', '1.2.1234567890']) {
      await expectSingleInvalidIssue(
        baseEnv({ MIN_CLIENT_VERSION: version }),
        'MIN_CLIENT_VERSION',
        "must be a dotted numeric version like '1.2.3' (or empty to disable the client gate)",
      );
    }
  });

  it('formats nested and root configuration issues unambiguously for operators', async () => {
    const { formatConfigProblems } = await loadConfigModule(baseEnv({}));
    expect(
      formatConfigProblems([
        { path: ['outer', 2, 'leaf'], message: 'nested problem' },
        { path: [], message: 'root problem' },
      ]),
    ).toBe('  - outer.2.leaf: nested problem\n  - (root): root problem');
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

  it('reports exact paths and messages for cross-field security invariants', async () => {
    const validProduction = {
      NODE_ENV: 'production',
      MOCK_AI: 'false',
      OPENAI_API_KEY: 'sk-real',
      S3_BUCKET: 'audio-bucket',
      DATABASE_URL: 'postgres://db.example/ai_english?sslmode=verify-full',
      ...PRODUCTION_MAIL,
    };

    await expectSingleInvalidIssue(
      baseEnv({ ...validProduction, DATABASE_URL: 'postgres://db.example/ai_english?sslmode=require' }),
      'DATABASE_URL',
      'must set sslmode=verify-full in production',
    );
    await expectSingleInvalidIssue(
      baseEnv({ MOCK_AI: 'false', OPENAI_API_KEY: '' }),
      'OPENAI_API_KEY',
      'is required when MOCK_AI=false',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ...validProduction, MOCK_AI: 'true' }),
      'MOCK_AI',
      'must be false in production; simulated scoring must never reach learners',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ...validProduction, JWT_SECRET: 'this-is-a-test-secret-with-enough-length' }),
      'JWT_SECRET',
      'looks like a placeholder and is not allowed in production',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ...validProduction, S3_BUCKET: '' }),
      'S3_BUCKET',
      'is required in production; learner audio must use size-constrained S3 presigned POST grants',
    );
    await expectSingleInvalidIssue(
      baseEnv({ S3_BUCKET: 'audio-bucket', S3_ACCESS_KEY_ID: 'access-only' }),
      'S3_ACCESS_KEY_ID',
      'and S3_SECRET_ACCESS_KEY must either both be set or both be empty',
    );
    await expectSingleInvalidIssue(
      baseEnv({ S3_BUCKET: 'audio-bucket', S3_SESSION_TOKEN: 'session-only' }),
      'S3_SESSION_TOKEN',
      'requires both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY',
    );
    await expectSingleInvalidIssue(
      baseEnv({ S3_ACCESS_KEY_ID: 'access', S3_SECRET_ACCESS_KEY: 'secret' }),
      'S3_BUCKET',
      'is required when static S3 credentials are configured',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ASSESS_DAILY_CAP: '10', ASSESS_GLOBAL_DAILY_CAP: '9' }),
      'ASSESS_GLOBAL_DAILY_CAP',
      'must be greater than or equal to ASSESS_DAILY_CAP',
    );
    await expectSingleInvalidIssue(
      baseEnv({ ASSESS_DAILY_CAP: '10', ASSESS_IP_DAILY_CAP: '9' }),
      'ASSESS_IP_DAILY_CAP',
      'must be greater than or equal to ASSESS_DAILY_CAP so one learner keeps their full daily allowance',
    );
  });

  it('keeps multiple configuration issues on separate operator-readable lines', async () => {
    exitSpy.mockClear();
    errorSpy.mockClear();
    await expect(
      loadConfig(baseEnv({ S3_BUCKET: 'audio-bucket', S3_ACCESS_KEY_ID: 'access', S3_SESSION_TOKEN: 'token' })),
    ).rejects.toThrow('process.exit called');
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      'Invalid environment configuration:\n' +
        '  - S3_ACCESS_KEY_ID: and S3_SECRET_ACCESS_KEY must either both be set or both be empty\n' +
        '  - S3_SESSION_TOKEN: requires both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY',
    );
  });
});
