import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultServerDirectory = path.resolve(scriptsDirectory, '..');

function lane(mutate, testFiles) {
  return Object.freeze({
    mutate: Object.freeze(mutate),
    testFiles: Object.freeze(testFiles),
  });
}

/**
 * Each executable backend TypeScript file belongs to exactly one mutation
 * lane. Tests are deliberately explicit: Stryker's static mutants reload all
 * tests selected for their lane, while runtime mutants retain per-test
 * coverage filtering.
 */
export const codeMutationLanes = Object.freeze({
  config: lane(['src/config.ts'], ['tests/config.test.ts']),
  db: lane(['src/db.ts'], ['tests/db-config.test.ts']),
  logger: lane(['src/logger.ts'], ['tests/logger.test.ts']),
  middleware: lane(['src/middleware.ts'], ['tests/middleware.test.ts']),
  app: lane(
    ['src/app.ts'],
    [
      'tests/app.test.ts',
      'tests/auth.test.ts',
      'tests/password-reset.test.ts',
      'tests/diagnostic.test.ts',
      'tests/practice.test.ts',
      'tests/audio-upload.test.ts',
      'tests/metrics.test.ts',
      'tests/middleware.test.ts',
      'tests/rate-limit.test.ts',
    ],
  ),
  schemaReadiness: lane(['src/schema-readiness.ts'], ['tests/schema-readiness.test.ts']),
  metrics: lane(['src/metrics.ts'], ['tests/metrics-initialization.test.ts', 'tests/metrics.test.ts']),
  index: lane(['src/index.ts'], ['tests/index-lifecycle.test.ts']),
  auth: lane(
    ['src/auth.ts', 'src/mailer.ts'],
    [
      'tests/auth.test.ts',
      'tests/auth-boundaries.test.ts',
      'tests/auth-janitor-unit.test.ts',
      'tests/password-reset.test.ts',
      'tests/profile.test.ts',
    ],
  ),
  assess: lane(
    ['src/assess.ts'],
    ['tests/assess.test.ts', 'tests/metrics.test.ts', 'tests/practice-route-state.test.ts'],
  ),
  assessmentFlow: lane(
    ['src/assessment-pipeline.ts', 'src/idempotency.ts', 'src/transaction.ts'],
    [
      'tests/assessment-context.test.ts',
      'tests/assessment-duration-route.test.ts',
      'tests/assessment-pipeline-schema.test.ts',
      'tests/assessment-route-state.test.ts',
      'tests/practice-route-state.test.ts',
      'tests/audio-upload-s3.test.ts',
      'tests/idempotency-claims.test.ts',
      'tests/idempotency.test.ts',
      'tests/level-progression.test.ts',
      'tests/rate-limit.test.ts',
      'tests/route-transactions.test.ts',
      'tests/transaction.test.ts',
    ],
  ),
  diagnostic: lane(
    ['src/diagnostic.ts'],
    [
      'tests/diagnostic.test.ts',
      'tests/diagnostic-search.test.ts',
      'tests/level-progression.test.ts',
      'tests/assessment-context.test.ts',
      'tests/assessment-duration-route.test.ts',
      'tests/assessment-route-state.test.ts',
      'tests/diagnostic-route-state.test.ts',
      'tests/practice-route-state.test.ts',
      'tests/route-transactions.test.ts',
      'tests/transaction.test.ts',
    ],
  ),
  practice: lane(
    ['src/practice.ts'],
    [
      'tests/practice.test.ts',
      'tests/practice-boundaries.test.ts',
      'tests/practice-history-stats.test.ts',
      'tests/practice-mastery.test.ts',
      'tests/practice-srs.test.ts',
      'tests/practice-stuck-cases.test.ts',
      'tests/level-progression.test.ts',
      'tests/assessment-context.test.ts',
      'tests/assessment-duration-route.test.ts',
      'tests/practice-route-state.test.ts',
      'tests/route-transactions.test.ts',
    ],
  ),
  audioInspection: lane(
    ['src/audio-inspection.ts'],
    ['tests/audio-inspection.test.ts', 'tests/audio-inspection-concurrency.test.ts', 'tests/metrics.test.ts'],
  ),
  audioUpload: lane(
    ['src/audio-upload.ts'],
    ['tests/audio-upload.test.ts', 'tests/audio-upload-client.test.ts', 'tests/audio-upload-s3.test.ts'],
  ),
  upload: lane(
    ['src/upload.ts'],
    [
      'tests/upload.test.ts',
      'tests/upload-magic-bytes.test.ts',
      'tests/upload-lifecycle-unit.test.ts',
      'tests/upload-policy.test.ts',
    ],
  ),
  limits: lane(
    ['src/rate-limit.ts', 'src/postgres-rate-limit-store.ts'],
    ['tests/rate-limit.test.ts', 'tests/auth.test.ts'],
  ),
  janitor: lane(
    ['src/janitor.ts'],
    [
      'tests/janitor.test.ts',
      'tests/assess.test.ts',
      'tests/idempotency.test.ts',
      'tests/password-reset.test.ts',
      'tests/rate-limit.test.ts',
    ],
  ),
  dbTooling: lane(
    ['db/database-safety.ts', 'db/generate-seed.ts', 'db/mutation-db-guard.ts', 'db/preflight.ts', 'db/run.ts'],
    [
      'tests/database.test.ts',
      'tests/db-cli.test.ts',
      'tests/db-run-unit.test.ts',
      'tests/mutation-db-guard.test.ts',
      'tests/preflight.test.ts',
      'tests/seed-catalog-mutation.test.ts',
      'tests/seed-generator.test.ts',
    ],
  ),
});

export const codeMutationLaneNames = Object.freeze(Object.keys(codeMutationLanes));
export const expectedCodeMutationFiles = Object.freeze(
  Object.values(codeMutationLanes)
    .flatMap(({ mutate }) => mutate)
    .toSorted(),
);

async function recursivelyListTypeScriptFiles(directory, relativeDirectory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativeName = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await recursivelyListTypeScriptFiles(path.join(directory, entry.name), relativeName)));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(relativeName);
    }
  }
  return files;
}

function duplicates(values) {
  const seen = new Set();
  const duplicateValues = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicateValues.add(value);
    seen.add(value);
  }
  return [...duplicateValues].toSorted();
}

function difference(first, second) {
  const secondSet = new Set(second);
  return first.filter((value) => !secondSet.has(value));
}

/**
 * Fail closed when a production file or lane test is added, removed, renamed,
 * or accidentally assigned twice. Stryker only warns for unmatched testFiles
 * globs, so this validation is a required preflight for the campaign.
 */
export async function assertMutationLaneManifest({ serverDir = defaultServerDirectory } = {}) {
  const sourceFiles = await recursivelyListTypeScriptFiles(path.join(serverDir, 'src'), 'src');
  const databaseFiles = (await recursivelyListTypeScriptFiles(path.join(serverDir, 'db'), 'db')).filter(
    (fileName) => fileName !== 'db/seed-data.ts' && !fileName.startsWith('db/seed-data/'),
  );
  const actualProductionFiles = [...sourceFiles, ...databaseFiles].toSorted();
  const assignedFiles = Object.values(codeMutationLanes).flatMap(({ mutate }) => mutate);
  const duplicateFiles = duplicates(assignedFiles);
  const missingFiles = difference(actualProductionFiles, assignedFiles);
  const unexpectedFiles = difference(assignedFiles, actualProductionFiles);

  if (duplicateFiles.length || missingFiles.length || unexpectedFiles.length) {
    throw new Error(
      [
        'Mutation lane manifest does not exactly partition the executable backend TypeScript files.',
        duplicateFiles.length ? `Duplicate assignments: ${duplicateFiles.join(', ')}` : undefined,
        missingFiles.length ? `Missing assignments: ${missingFiles.join(', ')}` : undefined,
        unexpectedFiles.length ? `Unexpected assignments: ${unexpectedFiles.join(', ')}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  for (const [laneName, definition] of Object.entries(codeMutationLanes)) {
    if (!/^[a-z][A-Za-z0-9]*$/.test(laneName)) {
      throw new Error(`Mutation lane name is not filesystem-safe: ${laneName}`);
    }
    if (definition.mutate.length === 0 || definition.testFiles.length === 0) {
      throw new Error(`Mutation lane ${laneName} must select at least one source file and one test file`);
    }
    const duplicateTests = duplicates(definition.testFiles);
    if (duplicateTests.length) {
      throw new Error(`Mutation lane ${laneName} repeats test files: ${duplicateTests.join(', ')}`);
    }
    for (const testFile of definition.testFiles) {
      if (!/^tests\/.+\.test\.ts$/.test(testFile)) {
        throw new Error(`Mutation lane ${laneName} has an invalid test path: ${testFile}`);
      }
      const stat = await fs.stat(path.join(serverDir, testFile)).catch(() => undefined);
      if (!stat?.isFile()) {
        throw new Error(`Mutation lane ${laneName} references a missing test file: ${testFile}`);
      }
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await assertMutationLaneManifest();
  console.log(
    `Mutation manifest is exhaustive: ${codeMutationLaneNames.length} lanes cover ` +
      `${expectedCodeMutationFiles.length} executable TypeScript files.`,
  );
}
