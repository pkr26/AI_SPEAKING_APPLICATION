export const RECORDER_SOURCE_FILE = 'src/components/Recorder.tsx';
export const RECORDER_PASS_MODE_COVERAGE_ALL = 'coverage-all';
export const RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL = 'coverage-off-incremental';
export const RECORDER_INCREMENTAL_SKIP_REASON =
  'Skipped by the integration observation because an exact prior cheap-pass result killed this mutant';

const passDefinitions = [
  ['pure-contract', '__tests__/recorder-contract-test.ts'],
  ['audio-owner-contract', '__tests__/recorder-audio-owner-contract-test.tsx'],
  ['recovery-loop-contract', '__tests__/recorder-recovery-loop-contract-test.tsx'],
  ['component-sentinels', '__tests__/recorder-mutation-sentinels-test.tsx'],
  ['integration', '__tests__/recorder-test.tsx'],
];

export const RECORDER_MUTATION_TEST_FILES = Object.freeze(
  passDefinitions.map(([, testFile]) => testFile),
);

export const RECORDER_MUTATION_RANGES = Object.freeze([
  Object.freeze({ name: 'full-source', startLine: 1, endLine: null }),
]);

/**
 * The unresolved form is convenient for an execution layer that has not read
 * Recorder.tsx yet. `resolveRecorderMutationPlan` replaces the final null with
 * the exact current source line count before any Stryker process is started.
 *
 * Do not split this range at arbitrary line boundaries. Stryker includes a
 * mutation only when the complete AST node location fits inside the requested
 * range, so adjacent ranges can silently omit a callback/component node that
 * crosses their boundary. The former 1-1000/1001-1500/1501-2500/2501-EOF
 * matrix produced 3,041 signatures while full-source instrumentation produced
 * 3,046: exactly five boundary-spanning mutants vanished. One full-source
 * range is therefore the minimal complete inventory; parallelism comes from
 * its five isolated test-file passes.
 */
export const RECORDER_MUTATION_PASSES = Object.freeze(
  RECORDER_MUTATION_RANGES.flatMap((range) =>
    passDefinitions.map(([passName, testFile]) =>
      Object.freeze({
        key: `${range.name}:${passName}`,
        rangeName: range.name,
        startLine: range.startLine,
        endLine: range.endLine,
        passName,
        testFile,
      }),
    ),
  ),
);

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function assertExactArray(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    throw new Error(`${label} must contain exactly ${expected.length} entries`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new Error(
        `${label} differs at index ${index}: expected ${JSON.stringify(expected[index])}, ` +
          `received ${JSON.stringify(actual[index])}`,
      );
    }
  }
}

/** Fail closed if a resolved plan can omit, overlap, or reorder any work. */
export function assertRecorderMutationPlan(plan, { sourceLineCount } = {}) {
  if (plan === null || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new Error('Recorder mutation plan must be an object');
  }
  const expectedLineCount = sourceLineCount ?? plan.sourceLineCount;
  assertPositiveInteger(expectedLineCount, 'Recorder source line count');
  if (plan.sourceFile !== RECORDER_SOURCE_FILE) {
    throw new Error(`Recorder mutation plan must target ${RECORDER_SOURCE_FILE}`);
  }
  if (plan.sourceLineCount !== expectedLineCount) {
    throw new Error(
      `Recorder mutation plan source line count ${String(plan.sourceLineCount)} does not match ` +
        String(expectedLineCount),
    );
  }
  assertExactArray(
    plan.testFiles,
    RECORDER_MUTATION_TEST_FILES,
    'Recorder mutation plan test files',
  );
  if (!Array.isArray(plan.ranges) || plan.ranges.length !== RECORDER_MUTATION_RANGES.length) {
    throw new Error(
      `Recorder mutation plan must contain exactly ${RECORDER_MUTATION_RANGES.length} ranges`,
    );
  }
  if (!Array.isArray(plan.passes) || plan.passes.length !== RECORDER_MUTATION_PASSES.length) {
    throw new Error(
      `Recorder mutation plan must contain exactly ${RECORDER_MUTATION_PASSES.length} passes`,
    );
  }

  let expectedStartLine = 1;
  const seenRangeNames = new Set();
  const seenPassKeys = new Set();
  for (const [rangeIndex, range] of plan.ranges.entries()) {
    const definition = RECORDER_MUTATION_RANGES[rangeIndex];
    const expectedEndLine = definition.endLine ?? expectedLineCount;
    if (range === null || typeof range !== 'object' || Array.isArray(range)) {
      throw new Error(`Recorder mutation range ${rangeIndex} must be an object`);
    }
    if (range.name !== definition.name) {
      throw new Error(`Recorder mutation range ${rangeIndex} must be named ${definition.name}`);
    }
    if (seenRangeNames.has(range.name)) {
      throw new Error(`Recorder mutation plan repeats range ${range.name}`);
    }
    seenRangeNames.add(range.name);
    assertPositiveInteger(range.startLine, `Recorder mutation range ${range.name} startLine`);
    assertPositiveInteger(range.endLine, `Recorder mutation range ${range.name} endLine`);
    if (range.startLine !== definition.startLine || range.startLine !== expectedStartLine) {
      throw new Error(
        `Recorder mutation range ${range.name} does not start at ${expectedStartLine}`,
      );
    }
    if (range.endLine !== expectedEndLine || range.endLine < range.startLine) {
      throw new Error(`Recorder mutation range ${range.name} must end at ${expectedEndLine}`);
    }
    const expectedSelector = `${RECORDER_SOURCE_FILE}:${range.startLine}-${range.endLine}`;
    if (range.selector !== expectedSelector) {
      throw new Error(`Recorder mutation range ${range.name} has an invalid selector`);
    }
    assertExactArray(
      range.testFiles,
      RECORDER_MUTATION_TEST_FILES,
      `Recorder mutation range ${range.name} test files`,
    );
    expectedStartLine = range.endLine + 1;
  }
  if (expectedStartLine !== expectedLineCount + 1) {
    throw new Error('Recorder mutation ranges do not cover the source through EOF');
  }

  for (const [passIndex, pass] of plan.passes.entries()) {
    const unresolved = RECORDER_MUTATION_PASSES[passIndex];
    const expectedEndLine = unresolved.endLine ?? expectedLineCount;
    const expectedKey = unresolved.key;
    if (pass === null || typeof pass !== 'object' || Array.isArray(pass)) {
      throw new Error(`Recorder mutation pass ${passIndex} must be an object`);
    }
    if (seenPassKeys.has(pass.key)) {
      throw new Error(`Recorder mutation plan repeats pass ${pass.key}`);
    }
    seenPassKeys.add(pass.key);
    if (
      pass.key !== expectedKey ||
      pass.rangeName !== unresolved.rangeName ||
      pass.startLine !== unresolved.startLine ||
      pass.endLine !== expectedEndLine ||
      pass.passName !== unresolved.passName ||
      pass.testFile !== unresolved.testFile ||
      pass.selector !== `${RECORDER_SOURCE_FILE}:${pass.startLine}-${pass.endLine}`
    ) {
      throw new Error(`Recorder mutation pass ${passIndex} does not match ${expectedKey}`);
    }
  }
  return plan;
}

/**
 * Count physical source lines. A terminal newline produces an empty split
 * segment, not a selectable line; `"first\nsecond\n"` therefore has two lines.
 */
export function countRecorderSourceLines(source) {
  if (typeof source !== 'string') throw new Error('Recorder source must be a string');
  if (source.length === 0) return 1;
  const lines = source.split(/\r\n|\n|\r/);
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
}

/** Resolve the checked-in full-source/five-file matrix against current EOF. */
export function resolveRecorderMutationPlan({ sourceLineCount } = {}) {
  assertPositiveInteger(sourceLineCount, 'Recorder source line count');
  const ranges = RECORDER_MUTATION_RANGES.map((definition) => {
    const endLine = definition.endLine ?? sourceLineCount;
    return Object.freeze({
      name: definition.name,
      startLine: definition.startLine,
      endLine,
      selector: `${RECORDER_SOURCE_FILE}:${definition.startLine}-${endLine}`,
      testFiles: RECORDER_MUTATION_TEST_FILES,
    });
  });
  const rangeByName = new Map(ranges.map((range) => [range.name, range]));
  const passes = RECORDER_MUTATION_PASSES.map((definition) => {
    const range = rangeByName.get(definition.rangeName);
    return Object.freeze({
      key: definition.key,
      rangeName: definition.rangeName,
      startLine: range.startLine,
      endLine: range.endLine,
      selector: range.selector,
      passName: definition.passName,
      testFile: definition.testFile,
    });
  });
  const plan = Object.freeze({
    sourceFile: RECORDER_SOURCE_FILE,
    sourceLineCount,
    testFiles: RECORDER_MUTATION_TEST_FILES,
    ranges: Object.freeze(ranges),
    passes: Object.freeze(passes),
  });
  return assertRecorderMutationPlan(plan, { sourceLineCount });
}
