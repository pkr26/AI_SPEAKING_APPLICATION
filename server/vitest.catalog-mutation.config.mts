import { defineConfig } from 'vitest/config';

/**
 * Fast, deterministic lane for the authored multilingual catalog. Stryker
 * treats every exported literal as static and would otherwise rerun the full
 * database integration suite for each one. This lane still mutates every
 * catalog literal, but uses the single byte-for-byte deployment-artifact test.
 */
export default defineConfig({
  test: {
    include: ['tests/seed-catalog-mutation.test.ts'],
    pool: 'forks',
    maxWorkers: 1,
  },
});
