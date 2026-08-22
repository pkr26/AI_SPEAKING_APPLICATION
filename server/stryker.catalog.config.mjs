import path from 'node:path';

const reportDirectory = process.env.MUTATION_REPORT_DIR || 'reports/mutation';

/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
export default {
  $schema: './node_modules/@stryker-mutator/core/schema/stryker-schema.json',
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.catalog-mutation.config.mts',
    related: false,
  },
  mutate: ['db/seed-data.ts', 'db/seed-data/**/*.ts'],
  ignorePatterns: [
    '/.env',
    '/.env.*',
    '/coverage',
    '/dist',
    '/uploads',
    '/reports',
    '/.mutation-campaign.lock',
    '/.stryker-tmp',
    '/.stryker-*-tmp',
  ],
  ignoreStatic: false,
  coverageAnalysis: 'perTest',
  timeoutMS: 10_000,
  timeoutFactor: 2,
  // This campaign runs one pure, read-only artifact oracle. Stryker workers
  // have isolated sandboxes, while Vitest remains single-worker per child.
  concurrency: 4,
  tempDirName: '.stryker-catalog-tmp',
  cleanTempDir: true,
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: path.join(reportDirectory, 'catalog.html') },
  jsonReporter: { fileName: path.join(reportDirectory, 'catalog.json') },
  thresholds: { high: 100, low: 100, break: 100 },
};
