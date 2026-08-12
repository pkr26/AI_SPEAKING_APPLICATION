import { defineConfig } from 'vitest/config';

// Overridable for CI, where Postgres requires user/password auth.
const testDbUrl = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/ai_english_test';

export default defineConfig({
  test: {
    globalSetup: './tests/global-setup.ts',
    // One worker: all files share the single test database.
    pool: 'forks',
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 75,
        lines: 75,
      },
      exclude: ['dist/**', 'db/seed-data.ts', 'db/generate-seed.ts'],
    },
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDbUrl,
      JWT_SECRET: 'test-jwt-secret-for-vitest-only-0123456789abcdef',
      MOCK_AI: 'true',
      LOG_LEVEL: 'silent',
      // Limits high by default; dedicated tests lower them via config mutation.
      RATE_LIMIT_GLOBAL_MAX: '1000000',
      RATE_LIMIT_AUTH_MAX: '1000000',
      RATE_LIMIT_ASSESS_MAX: '1000000',
      ASSESS_DAILY_CAP: '1000000',
      ASSESS_GLOBAL_DAILY_CAP: '1000000',
    },
  },
});
