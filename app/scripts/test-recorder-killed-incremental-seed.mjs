import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RECORDER_INCREMENTAL_SKIP_REASON,
  createRecorderKilledIncrementalSeed,
  normalizeRecorderCoverageOffIncrementalReport,
} from './recorder-killed-incremental-seed.mjs';
import {
  assertMutationTestingReportSchema,
  recorderMutantSignature,
} from './merge-recorder-mutation-passes.mjs';
import { RECORDER_SOURCE_FILE } from './recorder-mutation-plan.mjs';

const SOURCE = 'one\ntwo\nthree\nfour\nfive\nsix\n';
const INTEGRATION_TEST_FILE = '__tests__/recorder-test.tsx';

const location = (line, startColumn = 1, endColumn = 2) => ({
  start: { line, column: startColumn },
  end: { line, column: endColumn },
});

const definitions = [
  ['alpha', 'BooleanLiteral', 'true'],
  ['beta', 'BooleanLiteral', 'false'],
  ['gamma', 'StringLiteral', '""'],
  ['delta', 'BlockStatement', '{}'],
  ['epsilon', 'ConditionalExpression', 'true'],
  ['zeta', 'LogicalOperator', '&&'],
].map(([key, mutatorName, replacement], index) => ({
  key,
  mutatorName,
  replacement,
  location: location(index + 1),
  description: `${key} mutation`,
}));

const passDefinitions = [
  {
    key: 'cheap-a',
    testFile: '__tests__/recorder-contract-test.ts',
    selector: `${RECORDER_SOURCE_FILE}:1-6`,
    tests: [
      { id: 'local-0', name: 'a kills alpha', location: { start: { line: 1, column: 1 } } },
      { id: 'local-1', name: 'a helper', location: { start: { line: 2, column: 1 } } },
    ],
    statuses: {
      alpha: ['Killed', 'local-0'],
      beta: ['Timeout'],
      gamma: ['Survived'],
      delta: ['Survived'],
      epsilon: ['Timeout'],
      zeta: ['NoCoverage'],
    },
  },
  {
    key: 'cheap-b',
    testFile: '__tests__/recorder-audio-owner-contract-test.tsx',
    selector: `${RECORDER_SOURCE_FILE}:1-6`,
    tests: [
      { id: 'local-0', name: 'b also kills alpha', location: { start: { line: 1, column: 1 } } },
      { id: 'local-1', name: 'b kills beta', location: { start: { line: 2, column: 1 } } },
    ],
    statuses: {
      alpha: ['Killed', 'local-0'],
      beta: ['Killed', 'local-1'],
      gamma: ['NoCoverage'],
      delta: ['Survived'],
      epsilon: ['Timeout'],
      zeta: ['NoCoverage'],
    },
  },
];

function statusCounts(mutants) {
  return mutants.reduce((counts, mutant) => {
    counts[mutant.status] = (counts[mutant.status] ?? 0) + 1;
    return counts;
  }, {});
}

function cheapPassReport(pass, passIndex) {
  const testIds = pass.tests.map(({ id }) => id);
  const mutants = definitions.map((definition, mutantIndex) => {
    const [status, killer] = pass.statuses[definition.key];
    return {
      ...definition,
      id: `mutant-${passIndex}-${mutantIndex}`,
      status,
      static: mutantIndex % 2 === 0,
      coveredBy: status === 'NoCoverage' ? [] : [...testIds],
      ...(killer === undefined ? {} : { killedBy: [killer] }),
      ...(status === 'Killed' || status === 'Survived' ? { testsCompleted: mutantIndex + 1 } : {}),
      ...(status === 'Timeout' ? { statusReason: `timed out in ${pass.key}` } : {}),
      ...(status === 'Killed' ? { statusReason: `killed in ${pass.key}` } : {}),
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
      tempDirName: `.stryker-${pass.key}`,
      jsonReporter: { fileName: `/tmp/${pass.key}.json` },
      jest: { config: { testMatch: [`<rootDir>/${pass.testFile}`] } },
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
        source: `// source for ${pass.testFile}\n`,
        tests: structuredClone(pass.tests),
      },
    },
  };
}

function fixturePassReports() {
  return passDefinitions.map((pass, index) => ({
    pass: { key: pass.key, testFile: pass.testFile, selector: pass.selector },
    report: cheapPassReport(pass, index),
  }));
}

function clonePassReports() {
  return structuredClone(fixturePassReports());
}

function createSeed(passReports = fixturePassReports()) {
  return createRecorderKilledIncrementalSeed({ passReports, currentSource: SOURCE });
}

function signatureFor(key) {
  const definition = definitions.find((entry) => entry.key === key);
  return recorderMutantSignature(RECORDER_SOURCE_FILE, definition);
}

function mutantByKey(report, key) {
  const signature = signatureFor(key);
  return report.files[RECORDER_SOURCE_FILE].mutants.find(
    (mutant) => recorderMutantSignature(RECORDER_SOURCE_FILE, mutant) === signature,
  );
}

function cloneWithMutation(mutator) {
  const entries = clonePassReports();
  mutator(entries);
  return entries;
}

function createIncrementalRaw(seedResult = createSeed()) {
  const seedTestIdMap = new Map();
  const testFiles = {};
  for (const [fileName, file] of Object.entries(seedResult.report.testFiles)) {
    testFiles[fileName] = {
      source: file.source,
      tests: file.tests.map((testDefinition) => {
        const rawId = `old-${testDefinition.id}`;
        seedTestIdMap.set(testDefinition.id, rawId);
        return { ...structuredClone(testDefinition), id: rawId };
      }),
    };
  }
  testFiles[INTEGRATION_TEST_FILE] = {
    source: '// integration source\n',
    // Deliberately reverse source order versus location order.
    tests: [
      {
        id: 'integration-later',
        name: 'integration later',
        location: { start: { line: 2, column: 1 } },
      },
      {
        id: 'integration-first',
        name: 'integration first',
        location: { start: { line: 1, column: 1 } },
      },
    ],
  };

  const seedBySignature = new Map(
    seedResult.report.files[RECORDER_SOURCE_FILE].mutants.map((mutant) => [
      recorderMutantSignature(RECORDER_SOURCE_FILE, mutant),
      mutant,
    ]),
  );
  const oldHelperId = seedTestIdMap.get('1');
  const mutants = definitions.map((definition, index) => {
    const signature = recorderMutantSignature(RECORDER_SOURCE_FILE, definition);
    const seeded = seedBySignature.get(signature);
    if (seeded) {
      return {
        ...structuredClone(seeded),
        id: `raw-${index}`,
        static: false,
        // Stryker's coverage-off incremental differ takes coveredBy from the
        // current (coverage-less) run, not from the seed.
        coveredBy: [],
        killedBy: seeded.killedBy.map((id) => seedTestIdMap.get(id)),
      };
    }
    if (definition.key === 'gamma') {
      return {
        ...definition,
        id: `raw-${index}`,
        status: 'Survived',
        static: false,
        coveredBy: [oldHelperId, 'integration-later'],
        testsCompleted: 2,
      };
    }
    if (definition.key === 'delta') {
      return {
        ...definition,
        id: `raw-${index}`,
        status: 'Killed',
        static: false,
        coveredBy: [oldHelperId, 'integration-first'],
        killedBy: ['integration-first'],
        testsCompleted: 1,
        statusReason: 'integration caught delta',
        duration: 12,
      };
    }
    if (definition.key === 'epsilon') {
      return {
        ...definition,
        id: `raw-${index}`,
        status: 'Timeout',
        static: false,
        coveredBy: [],
        statusReason: 'actual integration timeout',
      };
    }
    return {
      ...definition,
      id: `raw-${index}`,
      status: 'NoCoverage',
      static: false,
      coveredBy: [],
    };
  });

  return {
    schemaVersion: '2.0',
    thresholds: { high: 100, low: 100, break: null },
    projectRoot: '/repo/app',
    framework: { name: 'StrykerJS', version: '9.6.1' },
    config: {
      mutate: [`${RECORDER_SOURCE_FILE}:1-6`],
      coverageAnalysis: 'off',
      incremental: true,
      incrementalFile: '/tmp/recorder-seed.json',
      force: false,
      ignoreStatic: false,
      tempDirName: '.stryker-integration',
      jsonReporter: { fileName: '/tmp/integration.json' },
      jest: { config: { testMatch: [`<rootDir>/${INTEGRATION_TEST_FILE}`] } },
    },
    files: {
      [RECORDER_SOURCE_FILE]: {
        language: 'typescript',
        source: SOURCE,
        mutants,
      },
    },
    testFiles,
  };
}

const integrationPass = {
  key: 'full-source:integration',
  passName: 'integration',
  testFile: INTEGRATION_TEST_FILE,
  selector: `${RECORDER_SOURCE_FILE}:1-6`,
};

function normalize(rawReport, seedResult = createSeed()) {
  return normalizeRecorderCoverageOffIncrementalReport({
    rawReport,
    seedResult,
    integrationPass,
    currentSource: SOURCE,
  });
}

test('creates a deterministic schema-valid killed-only seed with the full cheap test catalog', () => {
  const passReports = fixturePassReports();
  const before = structuredClone(passReports);
  const first = createSeed(passReports);
  const reversed = createSeed([...structuredClone(passReports)].reverse());

  assert.deepEqual(passReports, before, 'seed creation must not mutate raw reports');
  assert.deepEqual(first.report, reversed.report, 'completion order cannot alter the seed');
  assert.deepEqual(first.audit, reversed.audit, 'completion order cannot alter seed audit data');
  assert.equal(assertMutationTestingReportSchema(first.report), first.report);
  assert.deepEqual(first.seededSignatures, [signatureFor('alpha'), signatureFor('beta')]);
  assert.deepEqual([...first.seededSignatureSet], first.seededSignatures);
  assert.deepEqual(
    first.universeSignatures,
    definitions.map(({ key }) => signatureFor(key)),
  );
  assert.deepEqual([...first.universeSignatureSet], first.universeSignatures);

  const mutants = first.report.files[RECORDER_SOURCE_FILE].mutants;
  assert.deepEqual(
    mutants.map(({ id }) => id),
    ['0', '1'],
  );
  assert.ok(mutants.every(({ status }) => status === 'Killed'));
  assert.deepEqual(mutantByKey(first.report, 'alpha').killedBy, ['0', '2']);
  assert.deepEqual(mutantByKey(first.report, 'alpha').coveredBy, ['0', '1', '2', '3']);
  assert.deepEqual(mutantByKey(first.report, 'beta').killedBy, ['1']);
  assert.deepEqual(mutantByKey(first.report, 'beta').coveredBy, ['0', '1', '2', '3']);

  assert.deepEqual(Object.keys(first.report.testFiles), [
    '__tests__/recorder-audio-owner-contract-test.tsx',
    '__tests__/recorder-contract-test.ts',
  ]);
  assert.deepEqual(
    Object.values(first.report.testFiles).flatMap((file) => file.tests.map(({ id }) => id)),
    ['0', '1', '2', '3'],
  );
  assert.deepEqual(first.report.config.mutate, [RECORDER_SOURCE_FILE]);
  assert.equal(first.report.config.coverageAnalysis, 'all');
  assert.equal(first.report.config.tempDirName, undefined);
  assert.deepEqual(first.report.config.jest.config.testMatch, [
    '<rootDir>/__tests__/recorder-audio-owner-contract-test.tsx',
    '<rootDir>/__tests__/recorder-contract-test.ts',
  ]);
  assert.equal(first.audit.passType, 'killed-only-cheap-pass-seed');
  assert.equal(first.audit.universeCount, 6);
  assert.equal(first.audit.seededCount, 2);
  assert.match(first.audit.seedReportSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    first.audit.inputPasses.map(({ key }) => key),
    ['cheap-a', 'cheap-b'],
  );
  assert.deepEqual(
    first.audit.inputPasses[0].statusCounts,
    statusCounts(passReports[0].report.files[RECORDER_SOURCE_FILE].mutants),
  );
});

test('an exact universe with no cheap kills produces a valid empty-mutant seed without pruning tests', () => {
  const reports = cloneWithMutation((entries) => {
    for (const entry of entries) {
      for (const mutant of entry.report.files[RECORDER_SOURCE_FILE].mutants) {
        if (mutant.status === 'Killed') {
          mutant.status = 'Survived';
          delete mutant.killedBy;
        }
      }
    }
  });
  const result = createSeed(reports);
  assert.deepEqual(result.seededSignatures, []);
  assert.deepEqual(result.report.files[RECORDER_SOURCE_FILE].mutants, []);
  assert.equal(Object.keys(result.report.testFiles).length, 2);
  assert.equal(Object.values(result.report.testFiles).flatMap(({ tests }) => tests).length, 4);
  assert.equal(assertMutationTestingReportSchema(result.report), result.report);
});

test('seed validation rejects stale sources and any non-identical mutant universe', () => {
  assert.throws(
    () => createRecorderKilledIncrementalSeed({ passReports: [], currentSource: SOURCE }),
    /at least one cheap pass report/,
  );
  assert.throws(
    () =>
      createRecorderKilledIncrementalSeed({
        passReports: fixturePassReports(),
        currentSource: 'stale\n',
      }),
    /stale relative to current Recorder source/,
  );

  const missing = cloneWithMutation((entries) => {
    entries[1].report.files[RECORDER_SOURCE_FILE].mutants.pop();
  });
  assert.throws(() => createSeed(missing), /mutant universe differs/);

  const duplicate = cloneWithMutation((entries) => {
    const copy = structuredClone(entries[0].report.files[RECORDER_SOURCE_FILE].mutants[0]);
    copy.id = 'duplicate-signature';
    entries[0].report.files[RECORDER_SOURCE_FILE].mutants.push(copy);
  });
  assert.throws(() => createSeed(duplicate), /repeats mutant signature/);

  const changedStructure = cloneWithMutation((entries) => {
    entries[1].report.files[RECORDER_SOURCE_FILE].mutants[0].description = 'drifted';
  });
  assert.throws(() => createSeed(changedStructure), /mutant structure differs/);

  const sourceDrift = cloneWithMutation((entries) => {
    entries[1].report.files[RECORDER_SOURCE_FILE].source = 'different\n';
  });
  assert.throws(() => createSeed(sourceDrift), /stale relative to current Recorder source/);
});

test('seed validation rejects incomplete statuses and invalid local evidence', () => {
  for (const forbidden of ['CompileError', 'RuntimeError', 'Ignored', 'Pending']) {
    const reports = cloneWithMutation((entries) => {
      entries[0].report.files[RECORDER_SOURCE_FILE].mutants[2].status = forbidden;
    });
    assert.throws(() => createSeed(reports), /forbidden completed status/, forbidden);
  }

  const killedWithoutEvidence = cloneWithMutation((entries) => {
    delete entries[0].report.files[RECORDER_SOURCE_FILE].mutants[0].killedBy;
  });
  assert.throws(() => createSeed(killedWithoutEvidence), /Killed without killedBy evidence/);

  const survivorWithKiller = cloneWithMutation((entries) => {
    entries[0].report.files[RECORDER_SOURCE_FILE].mutants[2].killedBy = ['local-0'];
  });
  assert.throws(() => createSeed(survivorWithKiller), /has killedBy evidence but status Survived/);

  for (const field of ['coveredBy', 'killedBy']) {
    const unknown = cloneWithMutation((entries) => {
      entries[0].report.files[RECORDER_SOURCE_FILE].mutants[0][field] = ['unknown-test'];
    });
    assert.throws(() => createSeed(unknown), /references unknown test ID unknown-test/, field);
  }

  const duplicateMutantId = cloneWithMutation((entries) => {
    entries[0].report.files[RECORDER_SOURCE_FILE].mutants[1].id =
      entries[0].report.files[RECORDER_SOURCE_FILE].mutants[0].id;
  });
  assert.throws(() => createSeed(duplicateMutantId), /repeats local mutant ID/);

  const duplicateTestId = cloneWithMutation((entries) => {
    entries[0].report.testFiles[entries[0].pass.testFile].tests[1].id = 'local-0';
  });
  assert.throws(() => createSeed(duplicateTestId), /repeats local test ID/);

  const duplicateTestIdentity = cloneWithMutation((entries) => {
    const tests = entries[0].report.testFiles[entries[0].pass.testFile].tests;
    tests[1] = { ...structuredClone(tests[0]), id: 'different-id' };
  });
  assert.throws(() => createSeed(duplicateTestIdentity), /repeat.*Stryker test identity/);
});

test('seed validation binds pass metadata, report shape, and official schema', () => {
  const duplicateKey = clonePassReports();
  duplicateKey[1].pass.key = duplicateKey[0].pass.key;
  assert.throws(() => createSeed(duplicateKey), /repeats cheap pass key/);

  const duplicateFile = clonePassReports();
  duplicateFile[1].pass.testFile = duplicateFile[0].pass.testFile;
  assert.throws(() => createSeed(duplicateFile), /repeats cheap test file/);

  const wrongFile = cloneWithMutation((entries) => {
    entries[0].pass.testFile = '__tests__/wrong.ts';
  });
  assert.throws(() => createSeed(wrongFile), /did not report its declared test file/);

  const wrongSelector = cloneWithMutation((entries) => {
    entries[0].report.config.mutate = [`${RECORDER_SOURCE_FILE}:1-5`];
  });
  assert.throws(() => createSeed(wrongSelector), /config\.mutate does not match selector/);

  const wrongCoverage = cloneWithMutation((entries) => {
    entries[0].report.config.coverageAnalysis = 'off';
  });
  assert.throws(() => createSeed(wrongCoverage), /coverageAnalysis all/);

  const malformedSchema = cloneWithMutation((entries) => {
    entries[0].report.schemaVersion = 'invalid';
  });
  assert.throws(
    () => createSeed(malformedSchema),
    /does not satisfy mutation-testing-report-schema/,
  );
});

test('normalizes a coverage-off incremental result into one truthful integration observation', () => {
  const seedResult = createSeed();
  const rawReport = createIncrementalRaw(seedResult);
  const before = structuredClone(rawReport);
  const result = normalize(rawReport, seedResult);

  assert.deepEqual(rawReport, before, 'normalization must not mutate the archived raw result');
  assert.equal(assertMutationTestingReportSchema(result.report), result.report);
  assert.deepEqual(Object.keys(result.report.testFiles), [INTEGRATION_TEST_FILE]);
  assert.deepEqual(
    result.report.testFiles[INTEGRATION_TEST_FILE].tests.map(({ id, name }) => [id, name]),
    [
      ['0', 'integration first'],
      ['1', 'integration later'],
    ],
  );
  assert.equal(result.report.config.coverageAnalysis, 'off');
  assert.equal(result.report.config.incremental, true);
  assert.equal(result.report.config.force, false);
  assert.equal(result.report.config.tempDirName, undefined);
  assert.deepEqual(result.report.config.jest.config.testMatch, [
    `<rootDir>/${INTEGRATION_TEST_FILE}`,
  ]);

  assert.deepEqual(result.skippedDuePriorKillSignatures, seedResult.seededSignatures);
  for (const key of ['alpha', 'beta']) {
    const mutant = mutantByKey(result.report, key);
    assert.equal(mutant.status, 'NoCoverage');
    assert.equal(mutant.statusReason, RECORDER_INCREMENTAL_SKIP_REASON);
    assert.deepEqual(mutant.coveredBy, []);
    assert.equal(mutant.killedBy, undefined);
    assert.equal(mutant.testsCompleted, undefined);
  }
  assert.deepEqual(
    result.report.files[RECORDER_SOURCE_FILE].mutants.map(({ id }) => id),
    ['0', '1', '2', '3', '4', '5'],
  );
  assert.deepEqual(mutantByKey(result.report, 'gamma').coveredBy, ['1']);
  assert.equal(mutantByKey(result.report, 'gamma').status, 'Survived');
  const integrationKill = mutantByKey(result.report, 'delta');
  assert.equal(integrationKill.status, 'Killed');
  assert.deepEqual(integrationKill.coveredBy, ['0']);
  assert.deepEqual(integrationKill.killedBy, ['0']);
  assert.equal(integrationKill.statusReason, 'integration caught delta');
  assert.equal(integrationKill.testsCompleted, 1);
  assert.equal(integrationKill.duration, 12);
  assert.equal(mutantByKey(result.report, 'epsilon').status, 'Timeout');
  assert.equal(mutantByKey(result.report, 'epsilon').statusReason, 'actual integration timeout');
  assert.equal(mutantByKey(result.report, 'zeta').status, 'NoCoverage');

  assert.equal(result.audit.passType, 'coverage-off-incremental-integration-observation');
  assert.deepEqual(result.audit.integrationPass, integrationPass);
  assert.equal(result.audit.seededReuse.length, 2);
  assert.ok(
    result.audit.strippedTestFiles.every(({ fileName }) => fileName !== INTEGRATION_TEST_FILE),
  );
  assert.deepEqual(
    result.audit.strippedReferences.map(({ signature, field }) => [signature, field]),
    [
      [signatureFor('gamma'), 'coveredBy'],
      [signatureFor('delta'), 'coveredBy'],
    ],
  );
  assert.match(result.audit.rawReportSha256, /^[a-f0-9]{64}$/u);
  assert.match(result.audit.observationReportSha256, /^[a-f0-9]{64}$/u);
});

test('normalization canonicalizes raw mutant, file, and test completion order', () => {
  const seedResult = createSeed();
  const raw = createIncrementalRaw(seedResult);
  const canonical = normalize(raw, seedResult);
  const reordered = structuredClone(raw);
  reordered.files[RECORDER_SOURCE_FILE].mutants.reverse();
  for (const testFile of Object.values(reordered.testFiles)) testFile.tests.reverse();
  reordered.testFiles = Object.fromEntries(Object.entries(reordered.testFiles).reverse());
  const normalized = normalize(reordered, seedResult);

  assert.deepEqual(normalized.report, canonical.report);
  assert.deepEqual(
    normalized.skippedDuePriorKillSignatures,
    canonical.skippedDuePriorKillSignatures,
  );
  assert.deepEqual(normalized.audit.seededReuse, canonical.audit.seededReuse);
  assert.deepEqual(normalized.audit.strippedReferences, canonical.audit.strippedReferences);
});

test('normalization requires an exact full universe and current source', () => {
  const seedResult = createSeed();
  const missing = createIncrementalRaw(seedResult);
  missing.files[RECORDER_SOURCE_FILE].mutants.pop();
  assert.throws(() => normalize(missing, seedResult), /raw mutant universe differs/);

  const duplicate = createIncrementalRaw(seedResult);
  const copy = structuredClone(duplicate.files[RECORDER_SOURCE_FILE].mutants[0]);
  copy.id = 'duplicate';
  duplicate.files[RECORDER_SOURCE_FILE].mutants.push(copy);
  assert.throws(() => normalize(duplicate, seedResult), /repeats mutant signature/);

  const stale = createIncrementalRaw(seedResult);
  stale.files[RECORDER_SOURCE_FILE].source = 'stale\n';
  assert.throws(() => normalize(stale, seedResult), /stale relative to current Recorder source/);

  assert.throws(
    () =>
      normalizeRecorderCoverageOffIncrementalReport({
        rawReport: createIncrementalRaw(seedResult),
        seedResult,
        integrationPass,
        currentSource: 'stale\n',
      }),
    /seed is stale relative to current Recorder source/,
  );
});

test('normalization proves every seeded result was reused from the same killing identity', () => {
  const seedResult = createSeed();

  const notKilled = createIncrementalRaw(seedResult);
  mutantByKey(notKilled, 'alpha').status = 'Survived';
  delete mutantByKey(notKilled, 'alpha').killedBy;
  assert.throws(() => normalize(notKilled, seedResult), /seeded mutant .* did not return Killed/);

  const integrationKiller = createIncrementalRaw(seedResult);
  mutantByKey(integrationKiller, 'alpha').killedBy = ['integration-first'];
  assert.throws(
    () => normalize(integrationKiller, seedResult),
    /was not reused from its seed killer/,
  );

  const wrongOldKiller = createIncrementalRaw(seedResult);
  mutantByKey(wrongOldKiller, 'beta').killedBy = [
    wrongOldKiller.testFiles[passDefinitions[0].testFile].tests[0].id,
  ];
  assert.throws(() => normalize(wrongOldKiller, seedResult), /was not reused from its seed killer/);

  const lostKiller = createIncrementalRaw(seedResult);
  mutantByKey(lostKiller, 'alpha').killedBy = [];
  assert.throws(() => normalize(lostKiller, seedResult), /Killed without killedBy evidence/);

  const changedEvidence = createIncrementalRaw(seedResult);
  mutantByKey(changedEvidence, 'alpha').testsCompleted += 1;
  assert.throws(
    () => normalize(changedEvidence, seedResult),
    /reused observation differs from seed/,
  );

  const changedStructure = createIncrementalRaw(seedResult);
  mutantByKey(changedStructure, 'alpha').description = 'different structure';
  assert.throws(
    () => normalize(changedStructure, seedResult),
    /reused structure differs from seed/,
  );
});

test('normalization rejects forbidden or omitted nonseed outcomes and old-test kills', () => {
  const seedResult = createSeed();
  for (const forbidden of ['CompileError', 'RuntimeError', 'Ignored', 'Pending']) {
    const raw = createIncrementalRaw(seedResult);
    mutantByKey(raw, 'gamma').status = forbidden;
    assert.throws(() => normalize(raw, seedResult), /forbidden completed status/, forbidden);
  }

  const oldTestKill = createIncrementalRaw(seedResult);
  const delta = mutantByKey(oldTestKill, 'delta');
  delta.killedBy = [oldTestKill.testFiles[passDefinitions[0].testFile].tests[0].id];
  assert.throws(() => normalize(oldTestKill, seedResult), /old-test killedBy/);

  const unknown = createIncrementalRaw(seedResult);
  mutantByKey(unknown, 'gamma').coveredBy = ['unknown'];
  assert.throws(() => normalize(unknown, seedResult), /references unknown test ID unknown/);
});

test('normalization validates the coverage-off execution contract and exact test catalogs', () => {
  const seedResult = createSeed();
  for (const [field, value, message] of [
    ['coverageAnalysis', 'all', /coverageAnalysis off/],
    ['incremental', false, /incremental true/],
    ['force', true, /force false/],
  ]) {
    const raw = createIncrementalRaw(seedResult);
    raw.config[field] = value;
    assert.throws(() => normalize(raw, seedResult), message);
  }

  const wrongMatch = createIncrementalRaw(seedResult);
  wrongMatch.config.jest.config.testMatch = ['<rootDir>/__tests__/wrong.ts'];
  assert.throws(() => normalize(wrongMatch, seedResult), /Jest testMatch/);

  const missingOldFile = createIncrementalRaw(seedResult);
  delete missingOldFile.testFiles[passDefinitions[0].testFile];
  assert.throws(() => normalize(missingOldFile, seedResult), /test file universe differs/);

  const changedOldTest = createIncrementalRaw(seedResult);
  changedOldTest.testFiles[passDefinitions[0].testFile].tests[0].name = 'changed';
  assert.throws(
    () => normalize(changedOldTest, seedResult),
    /old test definitions differ from seed/,
  );

  const extraFile = createIncrementalRaw(seedResult);
  extraFile.testFiles['__tests__/unexpected.ts'] = {
    source: '// unexpected\n',
    tests: [{ id: 'unexpected', name: 'unexpected' }],
  };
  assert.throws(() => normalize(extraFile, seedResult), /test file universe differs/);

  const duplicateGlobalId = createIncrementalRaw(seedResult);
  duplicateGlobalId.testFiles[INTEGRATION_TEST_FILE].tests[0].id =
    duplicateGlobalId.testFiles[passDefinitions[0].testFile].tests[0].id;
  assert.throws(() => normalize(duplicateGlobalId, seedResult), /repeats global test ID/);
});
