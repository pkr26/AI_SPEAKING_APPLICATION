import path from 'node:path';

import { mutationLanes } from './scripts/mutation-lanes.mjs';

const laneName = process.env.MUTATION_LANE;
const lane = laneName === undefined ? undefined : mutationLanes[laneName];

if (!laneName || !lane) {
  throw new Error(
    `MUTATION_LANE must name one configured lane (received ${JSON.stringify(laneName)}). ` +
      'Run npm run mutation to execute the complete manifest.',
  );
}

const reportDirectory = process.env.MUTATION_REPORT_DIR || 'reports/mutation';
const concurrency = Number(process.env.MUTATION_CONCURRENCY || '2');

if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error(
    `MUTATION_CONCURRENCY must be a positive integer (received ${JSON.stringify(process.env.MUTATION_CONCURRENCY)})`,
  );
}

/**
 * `testMatch` — not Stryker's `testFiles` — is what actually pins a lane to its
 * test files. Stryker's jest runner only forwards `testFiles` to the dry run;
 * every mutant run is selected with `jest --findRelatedTests <mutated file>`,
 * which resolves against jest's own `testMatch`. Overriding `testMatch` here is
 * therefore the only setting that bounds both phases.
 *
 * `coverageAnalysis: 'all'` is deliberate, not a missed optimisation. `perTest`
 * only re-runs the tests that *executed* the mutated line, which is unsound
 * wherever module-level memoisation caches a mutated value: `createThemedStyles`
 * builds each screen's StyleSheet once per colour scheme, so only the first
 * rendering test in a file executes the style factory. Under `perTest` every
 * other themed-style mutant is then judged by that one test and survives, even
 * though the assertions that would catch it run later in the same file from the
 * poisoned cache. Running the whole owning test file for every mutant removes
 * the artefact and makes each lane result mean exactly what it says.
 *
 * `testTimeout` is raised well above jest's 5s default because lanes run
 * concurrently: a render that is merely slow under CPU contention would
 * otherwise fail, and a failing test is scored as a kill. Genuinely hung
 * mutants are still caught by Stryker's own `timeoutMS`/`timeoutFactor`.
 */
/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
export default {
  $schema: './node_modules/@stryker-mutator/core/schema/stryker-schema.json',
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'package.json',
    config: {
      testMatch: lane.testFiles.map((testFile) => `<rootDir>/${testFile}`),
      testPathIgnorePatterns: ['/node_modules/'],
      testTimeout: 30_000,
    },
    enableFindRelatedTests: true,
  },
  mutate: [...lane.mutate],
  ignorePatterns: [
    '/.env',
    '/.env.*',
    '/.expo',
    '/coverage',
    '/dist',
    '/reports',
    '/.stryker-tmp',
    '/.stryker-*-tmp',
  ],
  ignoreStatic: false,
  coverageAnalysis: 'all',
  timeoutMS: 60_000,
  timeoutFactor: 2.5,
  concurrency,
  tempDirName: `.stryker-${laneName}-tmp`,
  cleanTempDir: 'always',
  reporters: ['clear-text', 'progress', 'html', 'json'],
  clearTextReporter: { maxTestsToLog: 0, allowEmojis: false },
  htmlReporter: { fileName: path.join(reportDirectory, `${laneName}.html`) },
  jsonReporter: { fileName: path.join(reportDirectory, `${laneName}.json`) },
  // No break threshold: pass/fail belongs to scripts/merge-mutation-reports.mjs,
  // which additionally requires every survivor to be a reviewed equivalent and
  // every reviewed equivalent to still match real code. Stryker's own gate would
  // fail a lane for a survivor this project has already proven unkillable.
  thresholds: { high: 100, low: 100, break: null },
};
