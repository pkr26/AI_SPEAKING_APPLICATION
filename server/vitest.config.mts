import { defineConfig } from 'vitest/config';

// Overridable for CI, where Postgres requires user/password auth.
const testDbUrl = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/ai_english_test';

export default defineConfig({
  test: {
    globalSetup: './tests/global-setup.ts',
    // One worker: all files share the single test database.
    pool: 'forks',
    maxWorkers: 1,
    // Stryker sandboxes contain copies of the tests; never pick them up.
    // Covers the catalog sandbox (.stryker-catalog-tmp), the legacy shared
    // sandbox (.stryker-tmp), and every per-lane sandbox (.stryker-<lane>-tmp).
    exclude: ['**/node_modules/**', '**/dist/**', '.stryker-tmp/**', '.stryker-catalog-tmp/**', '.stryker-*-tmp/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        // Ratcheted to just below the measured global actuals (97.24/94.44/
        // 97.95/97.62 on 2026-08-15); ~1.5 points of headroom for routine
        // churn. Raise only after measuring again.
        statements: 96,
        branches: 93,
        functions: 96,
        lines: 96,
      },
      exclude: ['dist/**', 'db/seed-data.ts', 'db/generate-seed.ts'],
    },
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDbUrl,
      JWT_SECRET: 'test-jwt-secret-for-vitest-only-0123456789abcdef',
      MOCK_AI: 'true',
      LOG_LEVEL: 'silent',
      // Never let a developer's live S3 configuration leak into ordinary or
      // mutation tests. S3-specific suites inject mocked split-bucket config
      // explicitly; every other suite must stay in local multipart mode.
      S3_DIAGNOSTIC_BUCKET: '',
      S3_DIAGNOSTIC_REGION: 'us-east-1',
      S3_PRACTICE_BUCKET: '',
      S3_PRACTICE_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: '',
      S3_SECRET_ACCESS_KEY: '',
      S3_SESSION_TOKEN: '',
      // Limits high by default; dedicated tests lower them via config mutation.
      RATE_LIMIT_GLOBAL_MAX: '1000000',
      RATE_LIMIT_AUTH_MAX: '1000000',
      RATE_LIMIT_ASSESS_MAX: '1000000',
      RATE_LIMIT_REGISTER_MAX: '100000',
      RATE_LIMIT_PASSWORD_MAX: '100000',
      ASSESS_DAILY_CAP: '1000000',
      ASSESS_GLOBAL_DAILY_CAP: '1000000',
      ASSESS_IP_DAILY_CAP: '1000000',
    },
  },
});
