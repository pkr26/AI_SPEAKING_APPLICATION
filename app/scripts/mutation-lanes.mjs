import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultAppDirectory = path.resolve(scriptsDirectory, '..');

function lane(mutate, testFiles) {
  return Object.freeze({
    mutate: Object.freeze([...mutate]),
    testFiles: Object.freeze([...testFiles]),
  });
}

/**
 * Every mutable app source file belongs to exactly one lane, and every lane
 * names the test files that own its behaviour.
 *
 * Why lanes exist at all: Stryker's jest runner re-runs *all* related tests for
 * a static (module-load-time) mutant. `src/lib/i18n.tsx` holds five translation
 * dictionaries as module-level object literals, so its ~1.4k string mutants are
 * static and would each reload the eighteen test files that transitively import
 * i18n. Pinning each lane's `testMatch` to the owning test files keeps that
 * bounded, and makes each lane's result a statement about the test file that is
 * actually responsible for the code.
 *
 * Narrowing can only make the campaign stricter: a lane can never manufacture a
 * kill, it can only fail to find one that a wider suite would have made. A
 * survivor is therefore always a real gap in the owning test file, which is
 * where the assertion belongs.
 */
export const mutationLanes = Object.freeze({
  recorder: lane(
    ['src/components/Recorder.tsx'],
    [
      '__tests__/recorder-contract-test.ts',
      '__tests__/recorder-audio-owner-contract-test.tsx',
      '__tests__/recorder-recovery-loop-contract-test.tsx',
      '__tests__/recorder-mutation-sentinels-test.tsx',
      '__tests__/recorder-test.tsx',
    ],
  ),
  i18n: lane(['src/lib/i18n.tsx'], ['__tests__/i18n-test.tsx']),
  types: lane(['src/lib/types.ts'], ['__tests__/types-test.ts']),
  api: lane(['src/lib/api.ts'], ['__tests__/api-test.ts']),
  authLib: lane(['src/lib/auth.tsx'], ['__tests__/auth-test.tsx']),
  storage: lane(
    ['src/lib/params.ts', 'src/lib/pending-assessment.ts'],
    ['__tests__/params-test.ts', '__tests__/pending-assessment-test.ts'],
  ),
  libs: lane(
    [
      'src/lib/daily-reminder.ts',
      'src/lib/password-policy.ts',
      'src/lib/practice-flow.tsx',
      'src/lib/practice-intro.ts',
      'src/lib/session-notice.ts',
    ],
    [
      '__tests__/daily-reminder-test.ts',
      '__tests__/password-policy-test.ts',
      '__tests__/practice-flow-test.tsx',
      '__tests__/practice-intro-test.ts',
      '__tests__/session-notice-test.ts',
    ],
  ),
  ui: lane(
    ['src/components/Button.tsx', 'src/lib/theme.ts'],
    ['__tests__/button-test.tsx', '__tests__/dark-mode-test.tsx', '__tests__/theme-test.ts'],
  ),
  hardwareBack: lane(
    ['src/lib/use-hardware-back.ts'],
    [
      // The hook has no dedicated unit test; the screens that mount it are its
      // owners, so the lane carries all four of them.
      '__tests__/dark-mode-test.tsx',
      '__tests__/screens-diagnostic-test.tsx',
      '__tests__/screens-home-test.tsx',
      '__tests__/screens-practice-test.tsx',
    ],
  ),
  gate: lane(
    [
      'src/app/(auth)/_layout.tsx',
      'src/app/+not-found.tsx',
      'src/app/_layout.tsx',
      'src/app/index.tsx',
    ],
    ['__tests__/screens-gate-test.tsx'],
  ),
  authScreens: lane(
    ['src/app/(auth)/login.tsx', 'src/app/(auth)/signup.tsx'],
    // login.tsx is also rendered by the reset-password journey.
    ['__tests__/screens-auth-test.tsx', '__tests__/screens-reset-password-test.tsx'],
  ),
  passwordReset: lane(
    ['src/app/(auth)/forgot-password.tsx', 'src/app/(auth)/reset-password.tsx'],
    ['__tests__/screens-reset-password-test.tsx'],
  ),
  home: lane(
    ['src/app/home.tsx'],
    ['__tests__/dark-mode-test.tsx', '__tests__/screens-home-test.tsx'],
  ),
  history: lane(['src/app/history.tsx'], ['__tests__/screens-history-test.tsx']),
  diagnostic: lane(['src/app/diagnostic.tsx'], ['__tests__/screens-diagnostic-test.tsx']),
  practice: lane(
    [
      'src/app/practice/attempt.tsx',
      'src/app/practice/feedback.tsx',
      'src/app/practice/help.tsx',
      'src/app/practice/index.tsx',
    ],
    ['__tests__/screens-practice-test.tsx'],
  ),
  settingsProfile: lane(
    ['src/app/settings/index.tsx'],
    ['__tests__/screens-settings-profile-test.tsx'],
  ),
  settingsOther: lane(
    [
      'src/app/settings/change-password.tsx',
      'src/app/settings/delete-account.tsx',
      'src/app/settings/privacy.tsx',
      'src/app/settings/terms.tsx',
    ],
    ['__tests__/screens-settings-test.tsx'],
  ),
});

/**
 * Test files that run in the ordinary jest suite but own no mutable source.
 * Every entry must say why. Manifest validation rejects any on-disk test file
 * that is neither assigned to a lane nor listed here, so a new test file can
 * never silently skip the campaign.
 */
export const intentionallyUnassignedTestFiles = Object.freeze({
  '__tests__/app-config-test.ts':
    'Asserts the shape of app.json (scheme, orientation, plugin list, EAS ' +
    'project wiring). It imports no TypeScript source, so it owns no mutants.',
});

export const mutationLaneNames = Object.freeze(Object.keys(mutationLanes));

export const expectedMutationFiles = Object.freeze(
  Object.values(mutationLanes)
    .flatMap(({ mutate }) => mutate)
    .toSorted(),
);

async function recursivelyListSourceFiles(directory, relativeDirectory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativeName = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(
        ...(await recursivelyListSourceFiles(path.join(directory, entry.name), relativeName)),
      );
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      files.push(relativeName);
    }
  }
  return files;
}

export function duplicates(values) {
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
 * Fail closed when a source or test file is added, removed, renamed, or
 * assigned twice. Stryker only warns about globs that match nothing, so this
 * is a required preflight rather than a nicety.
 */
export async function assertMutationLaneManifest({
  appDir = defaultAppDirectory,
  lanes = mutationLanes,
  unassignedTestFiles = intentionallyUnassignedTestFiles,
} = {}) {
  const problems = [];

  const actualSourceFiles = (
    await recursivelyListSourceFiles(path.join(appDir, 'src'), 'src')
  ).toSorted();
  const assignedSourceFiles = Object.values(lanes).flatMap(({ mutate }) => mutate);
  const duplicateSources = duplicates(assignedSourceFiles);
  const missingSources = difference(actualSourceFiles, assignedSourceFiles);
  const unexpectedSources = difference(assignedSourceFiles, actualSourceFiles);
  if (duplicateSources.length)
    problems.push(`Source files assigned to more than one lane: ${duplicateSources.join(', ')}`);
  if (missingSources.length)
    problems.push(`Source files assigned to no lane: ${missingSources.join(', ')}`);
  if (unexpectedSources.length)
    problems.push(`Lanes reference missing source files: ${unexpectedSources.join(', ')}`);

  const actualTestFiles = (await fs.readdir(path.join(appDir, '__tests__')))
    .filter((name) => /\.tsx?$/.test(name))
    .map((name) => path.posix.join('__tests__', name))
    .toSorted();
  const assignedTestFiles = [
    ...new Set(Object.values(lanes).flatMap(({ testFiles }) => testFiles)),
  ];
  const declaredUnassigned = Object.keys(unassignedTestFiles);
  const unknownTestFiles = difference(assignedTestFiles, actualTestFiles);
  const unclaimedTestFiles = difference(actualTestFiles, [
    ...assignedTestFiles,
    ...declaredUnassigned,
  ]);
  const staleUnassigned = difference(declaredUnassigned, actualTestFiles);
  const contradictoryUnassigned = declaredUnassigned.filter((name) =>
    assignedTestFiles.includes(name),
  );
  if (unknownTestFiles.length)
    problems.push(`Lanes reference missing test files: ${unknownTestFiles.join(', ')}`);
  if (unclaimedTestFiles.length) {
    problems.push(
      `Test files in neither a lane nor intentionallyUnassignedTestFiles: ${unclaimedTestFiles.join(', ')}`,
    );
  }
  if (staleUnassigned.length) {
    problems.push(
      `intentionallyUnassignedTestFiles names missing files: ${staleUnassigned.join(', ')}`,
    );
  }
  if (contradictoryUnassigned.length) {
    problems.push(
      `Test files listed as unassigned but used by a lane: ${contradictoryUnassigned.join(', ')}`,
    );
  }
  for (const [name, reason] of Object.entries(unassignedTestFiles)) {
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      problems.push(
        `intentionallyUnassignedTestFiles['${name}'] must explain why the file owns no mutants`,
      );
    }
  }

  for (const [laneName, definition] of Object.entries(lanes)) {
    if (definition.mutate.length === 0) problems.push(`Lane ${laneName} mutates nothing`);
    if (definition.testFiles.length === 0) problems.push(`Lane ${laneName} has no test files`);
    const duplicateLaneTests = duplicates([...definition.testFiles]);
    if (duplicateLaneTests.length) {
      problems.push(`Lane ${laneName} repeats test files: ${duplicateLaneTests.join(', ')}`);
    }
  }

  if (problems.length) {
    throw new Error(
      ['Mutation lane manifest is out of date:', ...problems.map((line) => `  - ${line}`)].join(
        '\n',
      ),
    );
  }

  return { sourceFiles: actualSourceFiles, testFiles: actualTestFiles };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { sourceFiles, testFiles } = await assertMutationLaneManifest();
  console.log(
    `Mutation lane manifest is complete: ${mutationLaneNames.length} lanes cover ` +
      `${sourceFiles.length} source files and ${testFiles.length} test files.`,
  );
}
