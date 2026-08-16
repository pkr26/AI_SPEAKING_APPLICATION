import path from 'node:path';
import { codeMutationLanes } from './scripts/mutation-lanes.mjs';

const laneName = process.env.MUTATION_LANE;
const lane = laneName === undefined ? undefined : codeMutationLanes[laneName];

if (!laneName || !lane) {
  throw new Error(
    `MUTATION_LANE must name one configured code lane (received ${JSON.stringify(laneName)}). ` +
      'Run npm run mutation:code to execute the complete manifest.',
  );
}

const reportDirectory = process.env.MUTATION_REPORT_DIR || 'reports/mutation/code';

/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
export default {
  $schema: './node_modules/@stryker-mutator/core/schema/stryker-schema.json',
  testRunner: 'vitest',
  mutate: [...lane.mutate],
  testFiles: [...lane.testFiles],
  ignorePatterns: [
    '/.env',
    '/.env.*',
    '/coverage',
    '/dist',
    '/uploads',
    '/reports',
    '/.stryker-tmp',
    '/.stryker-catalog-tmp',
    '/.stryker-*-tmp',
  ],
  ignoreStatic: false,
  coverageAnalysis: 'perTest',
  timeoutMS: 90_000,
  timeoutFactor: 2.5,
  concurrency: 1,
  vitest: { related: false },
  tempDirName: `.stryker-${laneName}-tmp`,
  cleanTempDir: 'always',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: path.join(reportDirectory, `${laneName}.html`) },
  jsonReporter: { fileName: path.join(reportDirectory, `${laneName}.json`) },
  thresholds: { high: 100, low: 100, break: 100 },
};
