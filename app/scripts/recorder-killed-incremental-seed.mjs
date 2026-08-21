import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import {
  assertMutationTestingReportSchema,
  recorderMutantSignature,
} from './merge-recorder-mutation-passes.mjs';
import {
  RECORDER_INCREMENTAL_SKIP_REASON,
  RECORDER_SOURCE_FILE,
} from './recorder-mutation-plan.mjs';

export { RECORDER_INCREMENTAL_SKIP_REASON } from './recorder-mutation-plan.mjs';

const COMPLETED_STATUSES = Object.freeze(['Killed', 'Timeout', 'Survived', 'NoCoverage']);
const completedStatusSet = new Set(COMPLETED_STATUSES);
const observationFields = new Set([
  'id',
  'status',
  'statusReason',
  'coveredBy',
  'killedBy',
  'testsCompleted',
  'duration',
  'static',
]);
const executionPathConfigFields = ['tempDirName', 'jsonReporter', 'htmlReporter', 'eventReporter'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function own(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function clone(value) {
  return structuredClone(value);
}

function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareLocations(left, right) {
  return (
    left.start.line - right.start.line ||
    left.start.column - right.start.column ||
    left.end.line - right.end.line ||
    left.end.column - right.end.column
  );
}

function compareMutants(left, right) {
  return (
    compareLocations(left.location, right.location) ||
    compareStrings(left.mutatorName, right.mutatorName) ||
    compareStrings(left.replacement, right.replacement)
  );
}

function testStart(testDefinition) {
  return testDefinition.location?.start ?? { line: 0, column: 0 };
}

function compareTestEntries(left, right) {
  const leftStart = testStart(left.definition);
  const rightStart = testStart(right.definition);
  return (
    compareStrings(left.fileName, right.fileName) ||
    leftStart.line - rightStart.line ||
    leftStart.column - rightStart.column ||
    compareStrings(left.definition.name, right.definition.name) ||
    compareStrings(stableJson(left.definition), stableJson(right.definition))
  );
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareStrings)
      .map((key) => [key, stableValue(value[key])]),
  );
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function semanticHash(value) {
  return sha256(stableJson(value));
}

function sortedUniqueNumericIds(ids) {
  return [...new Set(ids)].sort((left, right) => Number(left) - Number(right));
}

function statusCounts(mutants) {
  const counts = Object.fromEntries(COMPLETED_STATUSES.map((status) => [status, 0]));
  for (const mutant of mutants) counts[mutant.status] += 1;
  return counts;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertCurrentSource(currentSource) {
  if (typeof currentSource !== 'string') {
    throw new Error('currentSource must be the current Recorder source string');
  }
}

function assertStringReferences(references, label) {
  if (!Array.isArray(references) || references.some((reference) => typeof reference !== 'string')) {
    throw new Error(`${label} must be an array of string test IDs`);
  }
  if (new Set(references).size !== references.length) {
    throw new Error(`${label} repeats a test ID`);
  }
}

function assertCompletedMutant(mutant, label) {
  if (!isRecord(mutant)) throw new Error(`${label} must be an object`);
  assertNonEmptyString(mutant.id, `${label}.id`);
  assertNonEmptyString(mutant.mutatorName, `${label}.mutatorName`);
  if (typeof mutant.replacement !== 'string') {
    throw new Error(`${label}.replacement must be a string`);
  }
  if (!completedStatusSet.has(mutant.status)) {
    throw new Error(`${label} has forbidden completed status ${JSON.stringify(mutant.status)}`);
  }
  if (mutant.coveredBy !== undefined) {
    assertStringReferences(mutant.coveredBy, `${label}.coveredBy`);
  }
  if (mutant.killedBy !== undefined) {
    assertStringReferences(mutant.killedBy, `${label}.killedBy`);
  }
  if (mutant.status === 'Killed' && (!mutant.killedBy || mutant.killedBy.length === 0)) {
    throw new Error(`${label} is Killed without killedBy evidence`);
  }
  if (mutant.status !== 'Killed' && mutant.killedBy?.length) {
    throw new Error(`${label} has killedBy evidence but status ${mutant.status}`);
  }
}

function assertTestDefinition(testDefinition, label) {
  if (!isRecord(testDefinition)) throw new Error(`${label} must be an object`);
  assertNonEmptyString(testDefinition.id, `${label}.id`);
  assertNonEmptyString(testDefinition.name, `${label}.name`);
}

function withoutId(testDefinition) {
  const { id: _id, ...definition } = testDefinition;
  return definition;
}

function testIdentity(fileName, testDefinition) {
  const start = testStart(testDefinition);
  return JSON.stringify([fileName, start.line, start.column, testDefinition.name]);
}

function structuralMutant(mutant) {
  return Object.fromEntries(
    Object.entries(mutant)
      .filter(([field]) => !observationFields.has(field))
      .map(([field, value]) => [field, clone(value)]),
  );
}

function sourceFileMetadata(sourceFile) {
  const { source: _source, mutants: _mutants, ...metadata } = sourceFile;
  return metadata;
}

function assertExactSet(actual, expected, label) {
  const missing = [...expected].filter((value) => !actual.has(value));
  const extra = [...actual].filter((value) => !expected.has(value));
  if (missing.length || extra.length) {
    throw new Error(`${label} differs (missing ${missing.length}, extra ${extra.length})`);
  }
}

function normalizedPassMetadata(pass, label) {
  if (!isRecord(pass)) throw new Error(`${label} must be an object`);
  assertNonEmptyString(pass.key, `${label}.key`);
  assertNonEmptyString(pass.testFile, `${label}.testFile`);
  if (pass.selector !== undefined) assertNonEmptyString(pass.selector, `${label}.selector`);
  return clone(pass);
}

function assertSingleSourceReport(report, label, currentSource) {
  assertMutationTestingReportSchema(report, label);
  if (!isRecord(report.files) || Object.keys(report.files).length !== 1) {
    throw new Error(`${label} must report exactly one source file`);
  }
  if (!own(report.files, RECORDER_SOURCE_FILE)) {
    throw new Error(`${label} did not report ${RECORDER_SOURCE_FILE}`);
  }
  const sourceFile = report.files[RECORDER_SOURCE_FILE];
  if (!isRecord(sourceFile) || typeof sourceFile.source !== 'string') {
    throw new Error(`${label} has no Recorder source text`);
  }
  if (sourceFile.source !== currentSource) {
    throw new Error(`${label} is stale relative to current Recorder source`);
  }
  if (!Array.isArray(sourceFile.mutants)) {
    throw new Error(`${label} has no Recorder mutant array`);
  }
  return sourceFile;
}

function assertCommonMetadata(report, firstReport, label, firstLabel) {
  for (const field of ['schemaVersion', 'thresholds', 'projectRoot', 'framework']) {
    if (!isDeepStrictEqual(report[field], firstReport[field])) {
      throw new Error(`${label} metadata ${field} differs from ${firstLabel}`);
    }
  }
}

function assertCheapPassShape(entry, currentSource) {
  const { pass, report } = entry;
  const label = `Recorder cheap pass ${pass.key}`;
  if (!isRecord(report)) throw new Error(`${label} report must be an object`);
  const sourceFile = assertSingleSourceReport(report, label, currentSource);
  if (!isRecord(report.testFiles) || Object.keys(report.testFiles).length !== 1) {
    throw new Error(`${label} must report exactly one test file`);
  }
  if (!own(report.testFiles, pass.testFile)) {
    throw new Error(`${label} did not report its declared test file ${pass.testFile}`);
  }
  const testFile = report.testFiles[pass.testFile];
  if (
    !isRecord(testFile) ||
    typeof testFile.source !== 'string' ||
    !Array.isArray(testFile.tests)
  ) {
    throw new Error(`${label} has an invalid test file record`);
  }
  if (testFile.tests.length === 0) throw new Error(`${label} reported zero tests`);
  if (!isRecord(report.config)) throw new Error(`${label} has no config`);
  if (report.config.coverageAnalysis !== 'all') {
    throw new Error(`${label} must use coverageAnalysis all`);
  }
  if (pass.selector !== undefined) {
    if (
      !Array.isArray(report.config.mutate) ||
      report.config.mutate.length !== 1 ||
      report.config.mutate[0] !== pass.selector
    ) {
      throw new Error(`${label} config.mutate does not match selector ${pass.selector}`);
    }
  }
  const expectedTestMatch = `<rootDir>/${pass.testFile}`;
  const testMatch = report.config.jest?.config?.testMatch;
  if (!Array.isArray(testMatch) || testMatch.length !== 1 || testMatch[0] !== expectedTestMatch) {
    throw new Error(`${label} Jest testMatch does not match its declared test file`);
  }
  return { sourceFile, testFile };
}

function buildCheapTestCatalog(entries) {
  const tests = [];
  const localMaps = new Map();
  const identities = new Set();
  for (const { pass, report } of entries) {
    const testFile = report.testFiles[pass.testFile];
    const localIds = new Set();
    const localMap = new Map();
    for (const [index, rawTest] of testFile.tests.entries()) {
      const label = `Test ${index} in Recorder cheap pass ${pass.key}`;
      assertTestDefinition(rawTest, label);
      if (localIds.has(rawTest.id)) {
        throw new Error(`Recorder cheap pass ${pass.key} repeats local test ID ${rawTest.id}`);
      }
      localIds.add(rawTest.id);
      const definition = clone(withoutId(rawTest));
      const identity = testIdentity(pass.testFile, definition);
      if (identities.has(identity)) {
        throw new Error(`Recorder cheap passes repeat Stryker test identity ${identity}`);
      }
      identities.add(identity);
      const entry = {
        passKey: pass.key,
        fileName: pass.testFile,
        source: testFile.source,
        localId: rawTest.id,
        definition,
        identity,
      };
      tests.push(entry);
      localMap.set(rawTest.id, entry);
    }
    localMaps.set(pass.key, localMap);
  }
  tests.sort(compareTestEntries);
  tests.forEach((entry, index) => {
    entry.globalId = String(index);
  });
  const testFiles = {};
  for (const fileName of [...new Set(tests.map((entry) => entry.fileName))].sort(compareStrings)) {
    const fileTests = tests.filter((entry) => entry.fileName === fileName);
    testFiles[fileName] = {
      source: fileTests[0].source,
      tests: fileTests.map((entry) => ({ ...clone(entry.definition), id: entry.globalId })),
    };
  }
  return { tests, testFiles, localMaps };
}

function remapReferences(references, localMap, label) {
  if (references === undefined) return [];
  return references.map((localId) => {
    const test = localMap.get(localId);
    if (!test) throw new Error(`${label} references unknown test ID ${localId}`);
    return test.globalId;
  });
}

function stripExecutionPaths(config) {
  for (const field of executionPathConfigFields) delete config[field];
  return config;
}

function normalizedSeedConfig(firstReport, testFileNames) {
  const config = stripExecutionPaths(clone(firstReport.config));
  config.mutate = [RECORDER_SOURCE_FILE];
  config.coverageAnalysis = 'all';
  if (isRecord(config.jest) && isRecord(config.jest.config)) {
    config.jest.config.testMatch = testFileNames.map((fileName) => `<rootDir>/${fileName}`);
  }
  delete config.incrementalFile;
  return config;
}

/**
 * Build the deliberately narrow Stryker incremental input used before the
 * expensive Recorder integration pass. Every cheap pass must have observed
 * the same complete current mutant universe. Only exact Killed results enter
 * the seed; the complete cheap-pass test catalog is retained for Stryker's
 * identity remapping and for auditability.
 */
export function createRecorderKilledIncrementalSeed({ passReports, currentSource }) {
  assertCurrentSource(currentSource);
  if (!Array.isArray(passReports) || passReports.length === 0) {
    throw new Error('passReports must contain at least one cheap pass report');
  }
  const entries = passReports.map((entry, index) => {
    if (!isRecord(entry) || !isRecord(entry.report)) {
      throw new Error(`Recorder cheap pass report ${index} must contain pass metadata and report`);
    }
    return {
      pass: normalizedPassMetadata(entry.pass, `Cheap pass ${index}`),
      report: entry.report,
    };
  });
  entries.sort((left, right) => compareStrings(left.pass.key, right.pass.key));
  const passKeys = new Set();
  const testFileNames = new Set();
  for (const { pass } of entries) {
    if (passKeys.has(pass.key)) throw new Error(`Recorder seed repeats cheap pass key ${pass.key}`);
    if (testFileNames.has(pass.testFile)) {
      throw new Error(`Recorder seed repeats cheap test file ${pass.testFile}`);
    }
    passKeys.add(pass.key);
    testFileNames.add(pass.testFile);
  }

  const first = entries[0];
  let sourceMetadata;
  for (const entry of entries) {
    const { sourceFile } = assertCheapPassShape(entry, currentSource);
    if (entry === first) {
      sourceMetadata = sourceFileMetadata(sourceFile);
    } else {
      assertCommonMetadata(
        entry.report,
        first.report,
        `Recorder cheap pass ${entry.pass.key}`,
        `Recorder cheap pass ${first.pass.key}`,
      );
      if (!isDeepStrictEqual(sourceFileMetadata(sourceFile), sourceMetadata)) {
        throw new Error(`Recorder source metadata differs in cheap pass ${entry.pass.key}`);
      }
    }
  }

  const testCatalog = buildCheapTestCatalog(entries);
  const observationsBySignature = new Map();
  let expectedUniverse;
  for (const { pass, report } of entries) {
    const mutants = report.files[RECORDER_SOURCE_FILE].mutants;
    const localMutantIds = new Set();
    const observedUniverse = new Set();
    const localTests = testCatalog.localMaps.get(pass.key);
    for (const [index, mutant] of mutants.entries()) {
      const label = `Mutant ${index} in Recorder cheap pass ${pass.key}`;
      assertCompletedMutant(mutant, label);
      if (localMutantIds.has(mutant.id)) {
        throw new Error(`Recorder cheap pass ${pass.key} repeats local mutant ID ${mutant.id}`);
      }
      localMutantIds.add(mutant.id);
      const signature = recorderMutantSignature(RECORDER_SOURCE_FILE, mutant);
      if (observedUniverse.has(signature)) {
        throw new Error(`Recorder cheap pass ${pass.key} repeats mutant signature ${signature}`);
      }
      observedUniverse.add(signature);
      const structure = structuralMutant(mutant);
      const observations = observationsBySignature.get(signature) ?? [];
      if (observations.length && !isDeepStrictEqual(observations[0].structure, structure)) {
        throw new Error(`Recorder mutant structure differs between cheap passes for ${signature}`);
      }
      observations.push({
        passKey: pass.key,
        localMutantId: mutant.id,
        status: mutant.status,
        structure,
        coveredBy: remapReferences(mutant.coveredBy, localTests, `${label}.coveredBy`),
        killedBy: remapReferences(mutant.killedBy, localTests, `${label}.killedBy`),
        ...(mutant.statusReason === undefined ? {} : { statusReason: mutant.statusReason }),
        ...(mutant.testsCompleted === undefined ? {} : { testsCompleted: mutant.testsCompleted }),
        ...(mutant.static === undefined ? {} : { static: mutant.static }),
      });
      observationsBySignature.set(signature, observations);
    }
    if (expectedUniverse === undefined) {
      expectedUniverse = observedUniverse;
    } else {
      assertExactSet(
        observedUniverse,
        expectedUniverse,
        `Recorder cheap pass ${pass.key} mutant universe`,
      );
    }
  }
  if ((expectedUniverse?.size ?? 0) === 0) {
    throw new Error('Recorder cheap passes reported an empty mutant universe');
  }

  const universeEntries = [...observationsBySignature.entries()]
    .map(([signature, observations]) => ({ signature, observations }))
    .sort((left, right) =>
      compareMutants(left.observations[0].structure, right.observations[0].structure),
    );
  const universeSignatures = universeEntries.map(({ signature }) => signature);
  const seededEntries = universeEntries.filter(({ observations }) =>
    observations.some(({ status }) => status === 'Killed'),
  );
  const seededMutants = seededEntries.map(({ observations }, index) => {
    const killedObservations = observations.filter(({ status }) => status === 'Killed');
    const winning = killedObservations[0];
    const killedBy = sortedUniqueNumericIds(killedObservations.flatMap((item) => item.killedBy));
    const coveredBy = sortedUniqueNumericIds([
      ...observations.flatMap((item) => item.coveredBy),
      ...killedBy,
    ]);
    return {
      ...clone(winning.structure),
      id: String(index),
      status: 'Killed',
      coveredBy,
      killedBy,
      static: observations.some(({ static: isStatic }) => isStatic === true),
      ...(winning.statusReason === undefined ? {} : { statusReason: winning.statusReason }),
      ...(winning.testsCompleted === undefined ? {} : { testsCompleted: winning.testsCompleted }),
    };
  });
  const sortedTestFileNames = Object.keys(testCatalog.testFiles).sort(compareStrings);
  const report = {
    schemaVersion: first.report.schemaVersion,
    thresholds: clone(first.report.thresholds),
    ...(first.report.projectRoot === undefined ? {} : { projectRoot: first.report.projectRoot }),
    ...(first.report.framework === undefined ? {} : { framework: clone(first.report.framework) }),
    config: normalizedSeedConfig(first.report, sortedTestFileNames),
    files: {
      [RECORDER_SOURCE_FILE]: {
        ...clone(sourceMetadata),
        source: currentSource,
        mutants: seededMutants,
      },
    },
    testFiles: testCatalog.testFiles,
  };
  assertMutationTestingReportSchema(report, 'Recorder killed-only incremental seed');

  const seededSignatures = seededEntries.map(({ signature }) => signature);
  const audit = {
    schemaVersion: 1,
    passType: 'killed-only-cheap-pass-seed',
    sourceFile: RECORDER_SOURCE_FILE,
    sourceSha256: sha256(currentSource),
    sourceByteLength: Buffer.byteLength(currentSource),
    universeCount: universeSignatures.length,
    seededCount: seededSignatures.length,
    universeSignatures,
    seededSignatures,
    testIdentities: testCatalog.tests.map(({ globalId, fileName, identity }) => ({
      id: globalId,
      fileName,
      identity,
    })),
    inputPasses: entries.map(({ pass, report: rawReport }) => ({
      ...clone(pass),
      reportSha256: semanticHash(rawReport),
      mutantCount: rawReport.files[RECORDER_SOURCE_FILE].mutants.length,
      statusCounts: statusCounts(rawReport.files[RECORDER_SOURCE_FILE].mutants),
    })),
    seededEvidence: seededEntries.map(({ signature, observations }) => ({
      signature,
      observations: observations
        .filter(({ status }) => status === 'Killed')
        .map(({ passKey, localMutantId, killedBy }) => ({
          passKey,
          localMutantId,
          killingTestIdentities: killedBy.map(
            (testId) => testCatalog.tests[Number(testId)].identity,
          ),
        })),
    })),
  };
  audit.seedReportSha256 = semanticHash(report);
  return {
    report,
    universeSignatures,
    universeSignatureSet: new Set(universeSignatures),
    seededSignatures,
    seededSignatureSet: new Set(seededSignatures),
    audit,
  };
}

function indexReportTests(report, label) {
  if (!isRecord(report.testFiles)) throw new Error(`${label} has no testFiles object`);
  const byId = new Map();
  const byIdentity = new Map();
  const byFile = new Map();
  for (const fileName of Object.keys(report.testFiles).sort(compareStrings)) {
    const testFile = report.testFiles[fileName];
    if (
      !isRecord(testFile) ||
      typeof testFile.source !== 'string' ||
      !Array.isArray(testFile.tests)
    ) {
      throw new Error(`${label} has invalid test file ${fileName}`);
    }
    const entries = [];
    for (const [index, rawTest] of testFile.tests.entries()) {
      assertTestDefinition(rawTest, `Test ${index} in ${label} file ${fileName}`);
      if (byId.has(rawTest.id)) throw new Error(`${label} repeats global test ID ${rawTest.id}`);
      const definition = clone(withoutId(rawTest));
      const identity = testIdentity(fileName, definition);
      if (byIdentity.has(identity)) {
        throw new Error(`${label} repeats Stryker test identity ${identity}`);
      }
      const entry = { id: rawTest.id, fileName, source: testFile.source, definition, identity };
      byId.set(rawTest.id, entry);
      byIdentity.set(identity, entry);
      entries.push(entry);
    }
    byFile.set(fileName, { source: testFile.source, entries });
  }
  return { byId, byIdentity, byFile };
}

function assertSeedResult(seedResult, currentSource) {
  if (!isRecord(seedResult) || !isRecord(seedResult.report)) {
    throw new Error('seedResult must be returned by createRecorderKilledIncrementalSeed');
  }
  const seedSourceFile = assertSingleSourceReport(
    seedResult.report,
    'Recorder incremental seed',
    currentSource,
  );
  if (!Array.isArray(seedResult.universeSignatures) || seedResult.universeSignatures.length === 0) {
    throw new Error('Recorder incremental seed has no exact universeSignatures');
  }
  if (new Set(seedResult.universeSignatures).size !== seedResult.universeSignatures.length) {
    throw new Error('Recorder incremental seed repeats a universe signature');
  }
  if (!Array.isArray(seedResult.seededSignatures)) {
    throw new Error('Recorder incremental seed has no seededSignatures array');
  }
  if (new Set(seedResult.seededSignatures).size !== seedResult.seededSignatures.length) {
    throw new Error('Recorder incremental seed repeats a seeded signature');
  }
  const universeSet = new Set(seedResult.universeSignatures);
  const declaredSeedSet = new Set(seedResult.seededSignatures);
  for (const signature of declaredSeedSet) {
    if (!universeSet.has(signature)) {
      throw new Error(`Recorder incremental seed signature is outside its universe: ${signature}`);
    }
  }
  const testCatalog = indexReportTests(seedResult.report, 'Recorder incremental seed');
  const mutantsBySignature = new Map();
  const localMutantIds = new Set();
  for (const [index, mutant] of seedSourceFile.mutants.entries()) {
    const label = `Mutant ${index} in Recorder incremental seed`;
    assertCompletedMutant(mutant, label);
    if (mutant.status !== 'Killed') throw new Error(`${label} is not Killed`);
    if (localMutantIds.has(mutant.id)) {
      throw new Error(`Recorder incremental seed repeats local mutant ID ${mutant.id}`);
    }
    localMutantIds.add(mutant.id);
    const signature = recorderMutantSignature(RECORDER_SOURCE_FILE, mutant);
    if (mutantsBySignature.has(signature)) {
      throw new Error(`Recorder incremental seed repeats mutant signature ${signature}`);
    }
    for (const field of ['coveredBy', 'killedBy']) {
      for (const testId of mutant[field] ?? []) {
        if (!testCatalog.byId.has(testId)) {
          throw new Error(`${label}.${field} references unknown test ID ${testId}`);
        }
      }
    }
    mutantsBySignature.set(signature, mutant);
  }
  assertExactSet(
    new Set(mutantsBySignature.keys()),
    declaredSeedSet,
    'Recorder incremental seed mutant signatures',
  );
  return { seedSourceFile, universeSet, mutantsBySignature, testCatalog };
}

function assertIntegrationPass(integrationPass) {
  const pass = normalizedPassMetadata(integrationPass, 'integrationPass');
  assertNonEmptyString(pass.selector, 'integrationPass.selector');
  return pass;
}

function assertCoverageOffConfig(report, pass) {
  if (!isRecord(report.config)) throw new Error('Recorder incremental raw report has no config');
  if (report.config.coverageAnalysis !== 'off') {
    throw new Error('Recorder incremental raw report must use coverageAnalysis off');
  }
  if (report.config.incremental !== true) {
    throw new Error('Recorder incremental raw report must set incremental true');
  }
  if (report.config.force !== false) {
    throw new Error('Recorder incremental raw report must set force false');
  }
  if (
    !Array.isArray(report.config.mutate) ||
    report.config.mutate.length !== 1 ||
    report.config.mutate[0] !== pass.selector
  ) {
    throw new Error(
      'Recorder incremental raw report config.mutate does not match integration selector',
    );
  }
  const expectedMatch = `<rootDir>/${pass.testFile}`;
  const testMatch = report.config.jest?.config?.testMatch;
  if (!Array.isArray(testMatch) || testMatch.length !== 1 || testMatch[0] !== expectedMatch) {
    throw new Error(
      'Recorder incremental raw report Jest testMatch does not match integration file',
    );
  }
}

function assertRawTestCatalog({ rawCatalog, seedCatalog, integrationPass }) {
  if (seedCatalog.byFile.has(integrationPass.testFile)) {
    throw new Error('Recorder integration test file must be disjoint from cheap seed test files');
  }
  const expectedFiles = new Set([...seedCatalog.byFile.keys(), integrationPass.testFile]);
  assertExactSet(
    new Set(rawCatalog.byFile.keys()),
    expectedFiles,
    'Recorder incremental raw test file universe',
  );
  const integrationFile = rawCatalog.byFile.get(integrationPass.testFile);
  if (integrationFile.entries.length === 0) {
    throw new Error('Recorder incremental raw integration file reported zero tests');
  }
  for (const [fileName, seedFile] of seedCatalog.byFile) {
    const rawFile = rawCatalog.byFile.get(fileName);
    if (rawFile.source !== seedFile.source) {
      throw new Error(`Recorder incremental raw old test source differs from seed for ${fileName}`);
    }
    const seedDefinitions = [...seedFile.entries]
      .sort((left, right) => compareStrings(left.identity, right.identity))
      .map(({ identity, definition }) => [identity, definition]);
    const rawDefinitions = [...rawFile.entries]
      .sort((left, right) => compareStrings(left.identity, right.identity))
      .map(({ identity, definition }) => [identity, definition]);
    if (!isDeepStrictEqual(rawDefinitions, seedDefinitions)) {
      throw new Error(
        `Recorder incremental raw old test definitions differ from seed for ${fileName}`,
      );
    }
  }
  return integrationFile;
}

function remapIntegrationReferences({ references, rawCatalog, integrationIds, label, allowOld }) {
  if (references === undefined) return { remapped: undefined, stripped: [] };
  assertStringReferences(references, label);
  const remapped = [];
  const stripped = [];
  for (const testId of references) {
    const test = rawCatalog.byId.get(testId);
    if (!test) throw new Error(`${label} references unknown test ID ${testId}`);
    const globalId = integrationIds.get(test.identity);
    if (globalId === undefined) {
      if (!allowOld) throw new Error(`${label} contains old-test killedBy reference ${testId}`);
      stripped.push(test.identity);
    } else {
      remapped.push(globalId);
    }
  }
  return { remapped: sortedUniqueNumericIds(remapped), stripped };
}

/**
 * Convert Stryker's cumulative coverage-off incremental output into a normal
 * one-file integration observation. Seeded mutants become explicit
 * NoCoverage/skipped observations so the later dominance merge obtains their
 * Killed evidence solely from the cheap pass that actually established it.
 */
export function normalizeRecorderCoverageOffIncrementalReport({
  rawReport,
  seedResult,
  integrationPass,
  currentSource,
}) {
  assertCurrentSource(currentSource);
  const pass = assertIntegrationPass(integrationPass);
  const seed = assertSeedResult(seedResult, currentSource);
  if (seed.seedSourceFile.source !== currentSource) {
    throw new Error('Recorder incremental seed is stale relative to current Recorder source');
  }
  if (!isRecord(rawReport)) throw new Error('rawReport must be a parsed Stryker report');
  const rawSourceFile = assertSingleSourceReport(
    rawReport,
    'Recorder incremental raw report',
    currentSource,
  );
  assertCommonMetadata(
    rawReport,
    seedResult.report,
    'Recorder incremental raw report',
    'Recorder incremental seed',
  );
  if (
    !isDeepStrictEqual(sourceFileMetadata(rawSourceFile), sourceFileMetadata(seed.seedSourceFile))
  ) {
    throw new Error('Recorder incremental raw source metadata differs from seed');
  }
  assertCoverageOffConfig(rawReport, pass);

  const rawCatalog = indexReportTests(rawReport, 'Recorder incremental raw report');
  const rawIntegrationFile = assertRawTestCatalog({
    rawCatalog,
    seedCatalog: seed.testCatalog,
    integrationPass: pass,
  });
  const integrationTests = [...rawIntegrationFile.entries].sort(compareTestEntries);
  const integrationIds = new Map(
    integrationTests.map((entry, index) => [entry.identity, String(index)]),
  );
  const integrationTestFile = {
    source: rawIntegrationFile.source,
    tests: integrationTests.map((entry, index) => ({
      ...clone(entry.definition),
      id: String(index),
    })),
  };

  const rawEntries = [];
  const rawUniverse = new Set();
  const localMutantIds = new Set();
  for (const [index, mutant] of rawSourceFile.mutants.entries()) {
    const label = `Mutant ${index} in Recorder incremental raw report`;
    assertCompletedMutant(mutant, label);
    if (localMutantIds.has(mutant.id)) {
      throw new Error(`Recorder incremental raw report repeats local mutant ID ${mutant.id}`);
    }
    localMutantIds.add(mutant.id);
    const signature = recorderMutantSignature(RECORDER_SOURCE_FILE, mutant);
    if (rawUniverse.has(signature)) {
      throw new Error(`Recorder incremental raw report repeats mutant signature ${signature}`);
    }
    rawUniverse.add(signature);
    for (const field of ['coveredBy', 'killedBy']) {
      for (const testId of mutant[field] ?? []) {
        if (!rawCatalog.byId.has(testId)) {
          throw new Error(`${label}.${field} references unknown test ID ${testId}`);
        }
      }
    }
    rawEntries.push({ signature, mutant, label });
  }
  assertExactSet(rawUniverse, seed.universeSet, 'Recorder incremental raw mutant universe');
  rawEntries.sort((left, right) => compareMutants(left.mutant, right.mutant));

  const skippedDuePriorKillSignatures = [];
  const seededReuse = [];
  const strippedReferences = [];
  const normalizedMutants = [];
  for (const [index, entry] of rawEntries.entries()) {
    const { signature, mutant, label } = entry;
    const seededMutant = seed.mutantsBySignature.get(signature);
    if (seededMutant) {
      if (mutant.status !== 'Killed') {
        throw new Error(`Recorder seeded mutant ${signature} did not return Killed/reused`);
      }
      if (!isDeepStrictEqual(structuralMutant(mutant), structuralMutant(seededMutant))) {
        throw new Error(`Recorder seeded mutant ${signature} reused structure differs from seed`);
      }
      const expectedKillerIdentities = new Set(
        seededMutant.killedBy.map((id) => seed.testCatalog.byId.get(id).identity),
      );
      const actualKillerIdentities = new Set(
        mutant.killedBy.map((id) => rawCatalog.byId.get(id).identity),
      );
      if (
        [...actualKillerIdentities].some(
          (identity) => !expectedKillerIdentities.has(identity) || integrationIds.has(identity),
        ) ||
        actualKillerIdentities.size !== expectedKillerIdentities.size
      ) {
        throw new Error(`Recorder seeded mutant ${signature} was not reused from its seed killer`);
      }
      for (const field of ['statusReason', 'testsCompleted']) {
        if (!isDeepStrictEqual(mutant[field], seededMutant[field])) {
          throw new Error(
            `Recorder seeded mutant ${signature} reused observation differs from seed in ${field}`,
          );
        }
      }
      for (const testId of mutant.coveredBy ?? []) {
        const rawTest = rawCatalog.byId.get(testId);
        if (integrationIds.has(rawTest.identity)) {
          throw new Error(
            `Recorder seeded mutant ${signature} has new integration coverage evidence`,
          );
        }
      }
      const normalized = clone(mutant);
      normalized.id = String(index);
      normalized.status = 'NoCoverage';
      normalized.statusReason = RECORDER_INCREMENTAL_SKIP_REASON;
      normalized.coveredBy = [];
      delete normalized.killedBy;
      delete normalized.testsCompleted;
      delete normalized.duration;
      normalizedMutants.push(normalized);
      skippedDuePriorKillSignatures.push(signature);
      seededReuse.push({
        signature,
        rawMutantId: mutant.id,
        killingTestIdentities: [...actualKillerIdentities].sort(compareStrings),
      });
      continue;
    }

    const covered = remapIntegrationReferences({
      references: mutant.coveredBy,
      rawCatalog,
      integrationIds,
      label: `${label}.coveredBy`,
      allowOld: true,
    });
    const killed = remapIntegrationReferences({
      references: mutant.killedBy,
      rawCatalog,
      integrationIds,
      label: `${label}.killedBy`,
      allowOld: false,
    });
    if (mutant.status === 'Killed' && (!killed.remapped || killed.remapped.length === 0)) {
      throw new Error(`${label} is Killed without integration killedBy evidence`);
    }
    const normalized = clone(mutant);
    normalized.id = String(index);
    if (covered.remapped === undefined) delete normalized.coveredBy;
    else normalized.coveredBy = covered.remapped;
    if (killed.remapped === undefined) delete normalized.killedBy;
    else normalized.killedBy = killed.remapped;
    normalizedMutants.push(normalized);
    if (covered.stripped.length) {
      strippedReferences.push({
        signature,
        field: 'coveredBy',
        testIdentities: covered.stripped.sort(compareStrings),
      });
    }
  }

  assertExactSet(
    new Set(skippedDuePriorKillSignatures),
    new Set(seedResult.seededSignatures),
    'Recorder skipped-due-prior-kill signatures',
  );
  const config = stripExecutionPaths(clone(rawReport.config));
  const report = {
    ...clone(rawReport),
    config,
    files: {
      [RECORDER_SOURCE_FILE]: {
        ...clone(sourceFileMetadata(rawSourceFile)),
        source: currentSource,
        mutants: normalizedMutants,
      },
    },
    testFiles: {
      [pass.testFile]: integrationTestFile,
    },
  };
  assertMutationTestingReportSchema(report, 'Recorder normalized integration observation');

  const audit = {
    schemaVersion: 1,
    passType: 'coverage-off-incremental-integration-observation',
    sourceFile: RECORDER_SOURCE_FILE,
    integrationPass: clone(pass),
    sourceSha256: sha256(currentSource),
    seedReportSha256: semanticHash(seedResult.report),
    rawReportSha256: semanticHash(rawReport),
    observationReportSha256: semanticHash(report),
    universeCount: seedResult.universeSignatures.length,
    seededCount: seedResult.seededSignatures.length,
    executedNonseedCount: seedResult.universeSignatures.length - seedResult.seededSignatures.length,
    skippedDuePriorKillSignatures,
    rawStatusCounts: statusCounts(rawSourceFile.mutants),
    observationStatusCounts: statusCounts(normalizedMutants),
    integrationTestIdentities: integrationTests.map(({ identity }, index) => ({
      id: String(index),
      identity,
    })),
    seededReuse,
    strippedTestFiles: [...seed.testCatalog.byFile.entries()]
      .sort(([left], [right]) => compareStrings(left, right))
      .map(([fileName, file]) => ({
        fileName,
        sourceSha256: sha256(file.source),
        testIdentities: file.entries.map(({ identity }) => identity).sort(compareStrings),
      })),
    strippedReferences,
  };
  return { report, skippedDuePriorKillSignatures, audit };
}
