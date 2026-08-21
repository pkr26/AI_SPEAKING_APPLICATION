import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  RECORDER_MUTANT_STATUS_PRECEDENCE,
  assertMutationTestingReportSchema,
  mergeRecorderMutationPassData,
  mergeRecorderMutationPassReports,
  recorderMutantSignature,
} from './merge-recorder-mutation-passes.mjs';
import {
  RECORDER_INCREMENTAL_SKIP_REASON,
  RECORDER_MUTATION_PASSES,
  RECORDER_MUTATION_RANGES,
  RECORDER_MUTATION_TEST_FILES,
  RECORDER_PASS_MODE_COVERAGE_ALL,
  RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL,
  RECORDER_SOURCE_FILE,
  assertRecorderMutationPlan,
  countRecorderSourceLines,
  resolveRecorderMutationPlan,
} from './recorder-mutation-plan.mjs';
import { assertMutationReportInputsMatchWorkspace } from './merge-mutation-reports.mjs';

const SOURCE = 'first line\nsecond line\nthird line\n';
const plan = resolveRecorderMutationPlan({ sourceLineCount: countRecorderSourceLines(SOURCE) });

const location = (line, startColumn, endColumn) => ({
  start: { line, column: startColumn },
  end: { line, column: endColumn },
});

const mutantDefinitions = [
  {
    key: 'killed',
    mutatorName: 'BooleanLiteral',
    replacement: 'true',
    location: location(1, 1, 2),
    statuses: ['NoCoverage', 'Timeout', 'Survived', 'Killed', 'NoCoverage'],
  },
  {
    key: 'survived',
    mutatorName: 'BooleanLiteral',
    replacement: 'false',
    location: location(1, 3, 4),
    statuses: ['NoCoverage', 'Survived', 'NoCoverage', 'NoCoverage', 'NoCoverage'],
  },
  {
    key: 'no-coverage',
    mutatorName: 'StringLiteral',
    replacement: '""',
    location: location(2, 1, 2),
    statuses: ['NoCoverage', 'NoCoverage', 'NoCoverage', 'NoCoverage', 'NoCoverage'],
  },
  {
    key: 'timeout',
    mutatorName: 'BlockStatement',
    replacement: '{}',
    location: location(3, 1, 2),
    statuses: ['NoCoverage', 'Timeout', 'Survived', 'NoCoverage', 'NoCoverage'],
  },
];

function passReport(pass, passIndex) {
  const localTestId = String(100 + passIndex);
  const mutants = mutantDefinitions.map((definition, mutantIndex) => {
    const status = definition.statuses[passIndex];
    return {
      id: String(passIndex * 100 + mutantIndex),
      mutatorName: definition.mutatorName,
      replacement: definition.replacement,
      location: definition.location,
      static: true,
      duration: passIndex + mutantIndex / 10,
      status,
      coveredBy: status === 'NoCoverage' ? [] : [localTestId],
      ...(status === 'Killed' ? { killedBy: [localTestId] } : {}),
      ...(status === 'Timeout' ? { statusReason: `timeout in ${pass.passName}` } : {}),
      ...(status === 'NoCoverage' ? {} : { testsCompleted: 1 }),
    };
  });
  return {
    schemaVersion: '2.0',
    thresholds: { high: 100, low: 100, break: null },
    projectRoot: '/repo/app',
    framework: { name: 'StrykerJS', version: '9.6.1' },
    config: {
      mutate: [pass.selector],
      coverageAnalysis: 'all',
      ignoreStatic: false,
      concurrency: 1,
      incremental: false,
      incrementalFile: `/tmp/${pass.passName}-incremental.json`,
      force: false,
      tempDirName: `.stryker-${pass.passName}`,
      jsonReporter: { fileName: `/tmp/${pass.passName}.json` },
      htmlReporter: { fileName: `/tmp/${pass.passName}.html` },
      eventReporter: { baseDir: `/tmp/${pass.passName}-events` },
      jest: {
        config: { testMatch: [`<rootDir>/${pass.testFile}`] },
      },
    },
    files: {
      [RECORDER_SOURCE_FILE]: {
        language: 'typescript',
        source: SOURCE,
        mutants,
      },
    },
    testFiles: {
      [pass.testFile]: {
        source: `// ${pass.testFile}`,
        tests: [
          {
            id: localTestId,
            name: `${pass.passName} test`,
            location: location(1, 1, 2),
          },
        ],
      },
    },
  };
}

function fixturePassReports() {
  return plan.passes.map((pass, index) => ({ pass, report: passReport(pass, index) }));
}

function cloneFixtureReports() {
  return structuredClone(fixturePassReports());
}

function incrementalFixturePassReports() {
  const reports = cloneFixtureReports();
  const integration = reports.find(({ pass }) => pass.passName === 'integration');
  const skippedMutant = integration.report.files[RECORDER_SOURCE_FILE].mutants.find(
    (mutant) => mutant.replacement === 'true',
  );
  const skippedSignature = recorderMutantSignature(RECORDER_SOURCE_FILE, skippedMutant);
  integration.mode = RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL;
  integration.skippedDuePriorKillSignatures = [skippedSignature];
  integration.report.config.coverageAnalysis = 'off';
  integration.report.config.incremental = true;
  integration.report.config.force = false;
  skippedMutant.status = 'NoCoverage';
  skippedMutant.statusReason = RECORDER_INCREMENTAL_SKIP_REASON;
  skippedMutant.coveredBy = [];
  delete skippedMutant.killedBy;
  delete skippedMutant.testsCompleted;
  delete skippedMutant.duration;
  return reports;
}

function mutantByReplacement(report, replacement) {
  return report.files[RECORDER_SOURCE_FILE].mutants.find(
    (mutant) => mutant.replacement === replacement,
  );
}

test('the authoritative plan is one complete physical-source range by five isolated files', () => {
  assert.equal(countRecorderSourceLines('first\nsecond\n'), 2);
  assert.equal(countRecorderSourceLines('first\nsecond'), 2);
  assert.equal(countRecorderSourceLines('first\r\nsecond\r\n'), 2);
  assert.equal(countRecorderSourceLines('first\rsecond\r'), 2);
  assert.equal(countRecorderSourceLines(''), 1);
  assert.deepEqual(RECORDER_MUTATION_RANGES, [
    { name: 'full-source', startLine: 1, endLine: null },
  ]);
  assert.equal(RECORDER_MUTATION_TEST_FILES.length, 5);
  assert.equal(RECORDER_MUTATION_PASSES.length, 5);
  assert.equal(plan.ranges.length, 1);
  assert.deepEqual(plan.ranges[0], {
    name: 'full-source',
    startLine: 1,
    endLine: 3,
    selector: `${RECORDER_SOURCE_FILE}:1-3`,
    testFiles: RECORDER_MUTATION_TEST_FILES,
  });
  assert.deepEqual(
    plan.passes.map(({ selector, testFile }) => [selector, testFile]),
    RECORDER_MUTATION_TEST_FILES.map((testFile) => [`${RECORDER_SOURCE_FILE}:1-3`, testFile]),
  );
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.passes));
});

test('plan validation rejects internal line boundaries that could omit crossing AST nodes', () => {
  const split = structuredClone(plan);
  split.ranges = [
    {
      name: 'first-half',
      startLine: 1,
      endLine: 1,
      selector: `${RECORDER_SOURCE_FILE}:1-1`,
      testFiles: [...RECORDER_MUTATION_TEST_FILES],
    },
    {
      name: 'second-half',
      startLine: 2,
      endLine: 3,
      selector: `${RECORDER_SOURCE_FILE}:2-3`,
      testFiles: [...RECORDER_MUTATION_TEST_FILES],
    },
  ];
  assert.throws(
    () => assertRecorderMutationPlan(split, { sourceLineCount: 3 }),
    /exactly 1 ranges/,
  );
});

test('exact signatures ignore local IDs while retaining every structural identity field', () => {
  const first = fixturePassReports()[0].report.files[RECORDER_SOURCE_FILE].mutants[0];
  const second = { ...first, id: 'different-local-id' };
  assert.equal(
    recorderMutantSignature(RECORDER_SOURCE_FILE, first),
    recorderMutantSignature(RECORDER_SOURCE_FILE, second),
  );
  assert.notEqual(
    recorderMutantSignature(RECORDER_SOURCE_FILE, first),
    recorderMutantSignature(RECORDER_SOURCE_FILE, { ...second, replacement: 'false' }),
  );
});

test('merging applies deterministic precedence and globally remaps all test evidence', () => {
  const input = fixturePassReports();
  const merged = mergeRecorderMutationPassData({ passReports: [...input].reverse(), plan });
  const again = mergeRecorderMutationPassData({ passReports: input, plan });
  assert.deepEqual(merged, again, 'input completion order cannot change output IDs or evidence');

  assert.deepEqual(RECORDER_MUTANT_STATUS_PRECEDENCE, {
    NoCoverage: 0,
    Survived: 1,
    Timeout: 2,
    Killed: 3,
  });
  assert.equal(mutantByReplacement(merged.report, 'true').status, 'Killed');
  assert.equal(mutantByReplacement(merged.report, 'false').status, 'Survived');
  assert.equal(mutantByReplacement(merged.report, '""').status, 'NoCoverage');
  assert.equal(mutantByReplacement(merged.report, '{}').status, 'Timeout');
  assert.deepEqual(mutantByReplacement(merged.report, 'true').killedBy, ['3']);
  assert.deepEqual(mutantByReplacement(merged.report, 'true').coveredBy, ['1', '2', '3']);
  assert.equal(mutantByReplacement(merged.report, 'true').testsCompleted, undefined);
  assert.equal(mutantByReplacement(merged.report, 'true').duration, undefined);
  assert.equal(
    mutantByReplacement(merged.report, '{}').statusReason,
    'timeout in audio-owner-contract',
  );
  assert.deepEqual(Object.keys(merged.report.testFiles), RECORDER_MUTATION_TEST_FILES);
  assert.deepEqual(
    Object.values(merged.report.testFiles).flatMap((file) => file.tests.map((entry) => entry.id)),
    ['0', '1', '2', '3', '4'],
  );
  assert.deepEqual(merged.report.config.mutate, [RECORDER_SOURCE_FILE]);
  assert.deepEqual(
    merged.report.config.jest.config.testMatch,
    RECORDER_MUTATION_TEST_FILES.map((testFile) => `<rootDir>/${testFile}`),
  );
  assert.equal(merged.report.config.tempDirName, undefined);
  assert.equal(merged.report.config.concurrency, undefined);
  assert.equal(merged.report.config.incremental, undefined);
  assert.equal(merged.report.config.incrementalFile, undefined);
  assert.equal(merged.report.config.force, undefined);
  assert.equal(merged.report.config.coverageAnalysis, 'all');
  assert.deepEqual(merged.sidecar.statusCounts, {
    NoCoverage: 1,
    Survived: 1,
    Timeout: 1,
    Killed: 1,
  });
  const killedAudit = merged.sidecar.mutants.find((mutant) => mutant.finalStatus === 'Killed');
  assert.deepEqual(killedAudit.dominatedStatuses, ['NoCoverage', 'Timeout', 'Survived']);
  assert.equal(killedAudit.observations.length, 5);
  assert.deepEqual(
    killedAudit.observations.map((observation) => observation.testsCompleted),
    [undefined, 1, 1, 1, undefined],
  );
  assert.deepEqual(
    killedAudit.observations.map((observation) => observation.duration),
    [0, 1, 2, 3, 4],
  );
});

test('coverage-off incremental integration skips remain truthful and auditable', () => {
  const passReports = incrementalFixturePassReports();
  const merged = mergeRecorderMutationPassData({ passReports, plan });
  const killed = mutantByReplacement(merged.report, 'true');
  assert.equal(killed.status, 'Killed');
  assert.equal(merged.report.config.coverageAnalysis, 'all');
  assert.notEqual(merged.report.config.incremental, true);
  assert.equal(merged.sidecar.incrementalSkipReason, RECORDER_INCREMENTAL_SKIP_REASON);

  const passAudits = merged.sidecar.ranges[0].passes;
  assert.ok(
    passAudits
      .filter(({ passName }) => passName !== 'integration')
      .every(
        ({ mode, skippedDuePriorKillCount }) =>
          mode === RECORDER_PASS_MODE_COVERAGE_ALL && skippedDuePriorKillCount === 0,
      ),
  );
  const integrationAudit = passAudits.find(({ passName }) => passName === 'integration');
  assert.equal(integrationAudit.mode, RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL);
  assert.equal(integrationAudit.skippedDuePriorKillCount, 1);
  assert.equal(integrationAudit.skippedDuePriorKillSignatures.length, 1);

  const mutantAudit = merged.sidecar.mutants.find(({ id }) => id === killed.id);
  assert.equal(mutantAudit.skippedDuePriorKillObservationCount, 1);
  const integrationObservation = mutantAudit.observations.find(
    ({ passName }) => passName === 'integration',
  );
  assert.equal(integrationObservation.mode, RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL);
  assert.equal(integrationObservation.skippedDuePriorKill, true);
  assert.equal(integrationObservation.status, 'NoCoverage');
  assert.equal(integrationObservation.statusReason, RECORDER_INCREMENTAL_SKIP_REASON);
  assert.deepEqual(integrationObservation.coveredBy, []);
  assert.deepEqual(integrationObservation.killedBy, []);
});

test('incremental mode and exact skip declarations fail closed', () => {
  const cheapIncremental = cloneFixtureReports();
  cheapIncremental[0].mode = RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL;
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: cheapIncremental, plan }),
    /Only the planned Recorder integration pass/,
  );

  const unknownMode = cloneFixtureReports();
  unknownMode.at(-1).mode = 'unknown-mode';
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: unknownMode, plan }),
    /unknown mode/,
  );

  const skipOutsideMode = cloneFixtureReports();
  skipOutsideMode.at(-1).skippedDuePriorKillSignatures = ['signature'];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: skipOutsideMode, plan }),
    /declares skips outside incremental mode/,
  );

  const duplicateSkip = incrementalFixturePassReports();
  duplicateSkip
    .at(-1)
    .skippedDuePriorKillSignatures.push(duplicateSkip.at(-1).skippedDuePriorKillSignatures[0]);
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: duplicateSkip, plan }),
    /repeats a skipped signature/,
  );

  for (const [field, value, message] of [
    ['coverageAnalysis', 'all', /coverageAnalysis off/],
    ['incremental', false, /incremental true/],
    ['force', true, /force false/],
  ]) {
    const reports = incrementalFixturePassReports();
    reports.at(-1).report.config[field] = value;
    assert.throws(() => mergeRecorderMutationPassData({ passReports: reports, plan }), message);
  }

  const malformedSkip = incrementalFixturePassReports();
  const malformedMutant = malformedSkip
    .at(-1)
    .report.files[RECORDER_SOURCE_FILE].mutants.find((mutant) => mutant.replacement === 'true');
  malformedMutant.coveredBy = ['104'];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: malformedSkip, plan }),
    /without a truthful NoCoverage skip observation/,
  );

  const undeclaredSkip = incrementalFixturePassReports();
  undeclaredSkip.at(-1).skippedDuePriorKillSignatures = [];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: undeclaredSkip, plan }),
    /contains undeclared skip/,
  );

  const unknownSkip = incrementalFixturePassReports();
  unknownSkip.at(-1).skippedDuePriorKillSignatures = ['not-a-mutant-signature'];
  const formerlySkipped = unknownSkip
    .at(-1)
    .report.files[RECORDER_SOURCE_FILE].mutants.find((mutant) => mutant.replacement === 'true');
  delete formerlySkipped.statusReason;
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: unknownSkip, plan }),
    /declared skips without matching observations/,
  );

  const noPriorKill = incrementalFixturePassReports();
  const cheapKiller = noPriorKill[3].report.files[RECORDER_SOURCE_FILE].mutants.find(
    (mutant) => mutant.replacement === 'true',
  );
  cheapKiller.status = 'Survived';
  delete cheapKiller.killedBy;
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: noPriorKill, plan }),
    /incremental skip has no prior Killed observation/,
  );
});

test('every pass must exist exactly once and report the exact planned source and test file', () => {
  const missing = fixturePassReports().slice(1);
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: missing, plan }),
    /Missing Recorder mutation passes/,
  );

  const duplicate = fixturePassReports();
  duplicate.push(duplicate[0]);
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: duplicate, plan }),
    /reported twice/,
  );

  const wrongTest = cloneFixtureReports();
  wrongTest[0].report.testFiles = {
    '__tests__/wrong-test.ts': wrongTest[0].report.testFiles[wrongTest[0].pass.testFile],
  };
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: wrongTest, plan }),
    /did not report/,
  );

  const wrongSelector = cloneFixtureReports();
  wrongSelector[0].report.config.mutate = [`${RECORDER_SOURCE_FILE}:1-2`];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: wrongSelector, plan }),
    /config\.mutate does not match/,
  );

  const wrongTestMatch = cloneFixtureReports();
  wrongTestMatch[0].report.config.jest.config.testMatch = ['<rootDir>/__tests__/wrong.ts'];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: wrongTestMatch, plan }),
    /Jest testMatch does not match/,
  );

  for (const [field, value, message] of [
    ['coverageAnalysis', 'perTest', /coverageAnalysis all/],
    ['ignoreStatic', true, /ignoreStatic false/],
  ]) {
    const reports = cloneFixtureReports();
    reports[0].report.config[field] = value;
    assert.throws(() => mergeRecorderMutationPassData({ passReports: reports, plan }), message);
  }

  const noTests = cloneFixtureReports();
  noTests[0].report.testFiles[noTests[0].pass.testFile].tests = [];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: noTests, plan }),
    /zero test definitions/,
  );
});

test('mutant universes and structures must match exactly across all five passes', () => {
  const missingMutant = cloneFixtureReports();
  missingMutant[1].report.files[RECORDER_SOURCE_FILE].mutants.pop();
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: missingMutant, plan }),
    /mutant universe differs/,
  );

  const emptyUniverse = cloneFixtureReports();
  for (const entry of emptyUniverse) entry.report.files[RECORDER_SOURCE_FILE].mutants = [];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: emptyUniverse, plan }),
    /empty mutant universe/,
  );

  const duplicateSignature = cloneFixtureReports();
  duplicateSignature[0].report.files[RECORDER_SOURCE_FILE].mutants.push(
    structuredClone(duplicateSignature[0].report.files[RECORDER_SOURCE_FILE].mutants[0]),
  );
  duplicateSignature[0].report.files[RECORDER_SOURCE_FILE].mutants.at(-1).id = 'duplicate';
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: duplicateSignature, plan }),
    /repeats mutant signature/,
  );

  const staticVariation = cloneFixtureReports();
  staticVariation[1].report.files[RECORDER_SOURCE_FILE].mutants[0].static = false;
  const staticMerged = mergeRecorderMutationPassData({ passReports: staticVariation, plan });
  assert.equal(mutantByReplacement(staticMerged.report, 'true').static, true);
  assert.equal(
    staticMerged.sidecar.mutants
      .find((mutant) => mutant.signature.includes('"true"'))
      .observations.some((observation) => observation.static === false),
    true,
  );

  const structureMismatch = cloneFixtureReports();
  structureMismatch[1].report.files[RECORDER_SOURCE_FILE].mutants[0].description = 'changed';
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: structureMismatch, plan }),
    /structure differs/,
  );

  const outsideRange = cloneFixtureReports();
  for (const entry of outsideRange) {
    entry.report.files[RECORDER_SOURCE_FILE].mutants[0].location = location(4, 1, 2);
  }
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: outsideRange, plan }),
    /starts outside declared range/,
  );
});

test('malformed statuses and test evidence fail closed', () => {
  for (const forbidden of ['CompileError', 'RuntimeError', 'Ignored', 'Pending']) {
    const reports = cloneFixtureReports();
    reports[0].report.files[RECORDER_SOURCE_FILE].mutants[0].status = forbidden;
    assert.throws(
      () => mergeRecorderMutationPassData({ passReports: reports, plan }),
      /is forbidden/,
      forbidden,
    );
  }

  const unknownReference = cloneFixtureReports();
  unknownReference[0].report.files[RECORDER_SOURCE_FILE].mutants[1].coveredBy = ['404'];
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: unknownReference, plan }),
    /unknown test ID 404/,
  );

  const killedWithoutEvidence = cloneFixtureReports();
  delete killedWithoutEvidence[3].report.files[RECORDER_SOURCE_FILE].mutants[0].killedBy;
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: killedWithoutEvidence, plan }),
    /Killed without killedBy evidence/,
  );

  const invalidDuration = cloneFixtureReports();
  invalidDuration[0].report.files[RECORDER_SOURCE_FILE].mutants[0].duration = Number.NaN;
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: invalidDuration, plan }),
    /duration must be a finite number/,
  );
});

test('official schema validation guards raw and synthesized report boundaries', () => {
  const rawSchemaFailure = cloneFixtureReports();
  rawSchemaFailure[0].report.schemaVersion = 'not-a-schema-version';
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: rawSchemaFailure, plan }),
    /Recorder pass .* does not satisfy mutation-testing-report-schema/,
  );

  const { report } = mergeRecorderMutationPassData({
    passReports: fixturePassReports(),
    plan,
  });
  assert.equal(assertMutationTestingReportSchema(report), report);
  const malformedCanonical = structuredClone(report);
  malformedCanonical.files[RECORDER_SOURCE_FILE].mutants[0].location.start.line = 0;
  assert.throws(
    () => assertMutationTestingReportSchema(malformedCanonical, 'canonical fixture'),
    /canonical fixture does not satisfy mutation-testing-report-schema/,
  );
});

test('source and framework drift between pass reports is rejected', () => {
  const sourceDrift = cloneFixtureReports();
  sourceDrift[1].report.files[RECORDER_SOURCE_FILE].source = 'changed\nsource\ntext\n';
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: sourceDrift, plan }),
    /Recorder source differs/,
  );

  const metadataDrift = cloneFixtureReports();
  metadataDrift[1].report.framework.version = 'different';
  assert.throws(
    () => mergeRecorderMutationPassData({ passReports: metadataDrift, plan }),
    /metadata framework differs/,
  );

  const testDrift = cloneFixtureReports();
  testDrift[1].report.testFiles[testDrift[1].pass.testFile].tests[0].name = 'changed name';
  // Each test file is intentionally unique to one pass, so its workspace source
  // is validated by the async integration boundary rather than another pass.
  assert.doesNotThrow(() => mergeRecorderMutationPassData({ passReports: testDrift, plan }));
});

test('the async boundary reads, verifies, and publishes the standard report and sidecar', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-pass-merge-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const passFiles = [];
  for (const [index, entry] of fixturePassReports().entries()) {
    const reportPath = path.join(directory, `pass-${index}.json`);
    await fs.writeFile(reportPath, JSON.stringify(entry.report), 'utf8');
    passFiles.push({ pass: entry.pass, reportPath });
  }
  const recorderSourcePath = path.join(directory, 'Recorder.tsx');
  const outputPath = path.join(directory, 'recorder.json');
  const sidecarPath = path.join(directory, 'recorder-multipass.json');
  await fs.writeFile(recorderSourcePath, SOURCE, 'utf8');
  const result = await mergeRecorderMutationPassReports({
    passReports: passFiles.reverse(),
    plan,
    outputPath,
    sidecarPath,
    recorderSourcePath,
  });
  assert.deepEqual(JSON.parse(await fs.readFile(outputPath, 'utf8')), result.report);
  assert.deepEqual(JSON.parse(await fs.readFile(sidecarPath, 'utf8')), result.sidecar);
  assert.deepEqual(result.paths, { report: outputPath, sidecar: sidecarPath });

  await fs.writeFile(recorderSourcePath, 'stale source\n', 'utf8');
  await assert.rejects(
    () =>
      mergeRecorderMutationPassReports({
        passReports: passFiles,
        plan,
        recorderSourcePath,
      }),
    /stale relative to recorderSourcePath/,
  );
});

test('the async boundary preserves normalized integration mode and skip metadata', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-incremental-merge-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const passFiles = [];
  for (const [index, entry] of incrementalFixturePassReports().entries()) {
    const reportPath = path.join(directory, `pass-${index}.json`);
    await fs.writeFile(reportPath, JSON.stringify(entry.report), 'utf8');
    passFiles.push({
      pass: entry.pass,
      reportPath,
      ...(entry.mode === undefined ? {} : { mode: entry.mode }),
      ...(entry.skippedDuePriorKillSignatures === undefined
        ? {}
        : { skippedDuePriorKillSignatures: entry.skippedDuePriorKillSignatures }),
    });
  }
  const result = await mergeRecorderMutationPassReports({ passReports: passFiles, plan });
  const integrationAudit = result.sidecar.ranges[0].passes.find(
    ({ passName }) => passName === 'integration',
  );
  assert.equal(integrationAudit.mode, RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL);
  assert.equal(integrationAudit.skippedDuePriorKillCount, 1);
});

test('the synthesized report satisfies the existing standard workspace validator', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'recorder-standard-report-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.mkdir(path.join(directory, path.dirname(RECORDER_SOURCE_FILE)), { recursive: true });
  await fs.writeFile(path.join(directory, RECORDER_SOURCE_FILE), SOURCE, 'utf8');
  for (const testFile of RECORDER_MUTATION_TEST_FILES) {
    await fs.mkdir(path.join(directory, path.dirname(testFile)), { recursive: true });
    await fs.writeFile(path.join(directory, testFile), `// ${testFile}`, 'utf8');
  }
  const { report } = mergeRecorderMutationPassData({ passReports: fixturePassReports(), plan });
  await assert.doesNotReject(() =>
    assertMutationReportInputsMatchWorkspace({
      reportsByLane: { recorder: report },
      lanes: {
        recorder: {
          mutate: [RECORDER_SOURCE_FILE],
          testFiles: [...RECORDER_MUTATION_TEST_FILES],
        },
      },
      laneNames: ['recorder'],
      appDir: directory,
    }),
  );
  const staleTestFile = RECORDER_MUTATION_TEST_FILES[0];
  await fs.writeFile(path.join(directory, staleTestFile), '// changed after pass', 'utf8');
  await assert.rejects(
    () =>
      assertMutationReportInputsMatchWorkspace({
        reportsByLane: { recorder: report },
        lanes: {
          recorder: {
            mutate: [RECORDER_SOURCE_FILE],
            testFiles: [...RECORDER_MUTATION_TEST_FILES],
          },
        },
        laneNames: ['recorder'],
        appDir: directory,
      }),
    /test file .* changed/,
  );
});
