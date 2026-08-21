import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import {
  RECORDER_INCREMENTAL_SKIP_REASON,
  RECORDER_PASS_MODE_COVERAGE_ALL,
  RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL,
  RECORDER_SOURCE_FILE,
  assertRecorderMutationPlan,
  countRecorderSourceLines,
} from './recorder-mutation-plan.mjs';

const require = createRequire(import.meta.url);
const Ajv = require('ajv');
const mutationTestingReportSchema = require('mutation-testing-report-schema/mutation-testing-report-schema.json');
const officialReportValidator = new Ajv({ allErrors: true, schemaId: 'auto' }).compile(
  mutationTestingReportSchema,
);

export const RECORDER_MUTANT_STATUS_PRECEDENCE = Object.freeze({
  NoCoverage: 0,
  Survived: 1,
  Timeout: 2,
  Killed: 3,
});

const allowedStatuses = new Set(Object.keys(RECORDER_MUTANT_STATUS_PRECEDENCE));
const observationFields = new Set([
  'id',
  'status',
  'statusReason',
  'coveredBy',
  'duration',
  'killedBy',
  'testsCompleted',
  'static',
]);

/** Validate with the installed official report schema before semantic checks. */
export function assertMutationTestingReportSchema(report, label = 'Mutation testing report') {
  if (officialReportValidator(report)) return report;
  const details = (officialReportValidator.errors ?? [])
    .map((error) => `${error.dataPath || '/'} ${error.message}`)
    .join('; ');
  throw new Error(`${label} does not satisfy mutation-testing-report-schema: ${details}`);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function own(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function assertPositivePosition(position, label) {
  if (
    !isRecord(position) ||
    !Number.isInteger(position.line) ||
    position.line < 1 ||
    !Number.isInteger(position.column) ||
    position.column < 1
  ) {
    throw new Error(`${label} must contain positive integer line and column values`);
  }
}

function assertLocation(location, label, endOptional = false) {
  if (!isRecord(location)) throw new Error(`${label} must be an object`);
  assertPositivePosition(location.start, `${label}.start`);
  if (location.end === undefined) {
    if (!endOptional) throw new Error(`${label}.end is required`);
  } else {
    assertPositivePosition(location.end, `${label}.end`);
  }
}

function assertStringReferences(value, label) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${label} must be an array of string test IDs`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} repeats a test ID`);
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

function mutantComparator(left, right) {
  return (
    compareLocations(left.location, right.location) ||
    compareStrings(left.mutatorName, right.mutatorName) ||
    compareStrings(left.replacement, right.replacement)
  );
}

function sortedUniqueTestIds(values) {
  return [...new Set(values)].sort((left, right) => Number(left) - Number(right));
}

function statusCounts(mutants) {
  const counts = Object.fromEntries(
    Object.keys(RECORDER_MUTANT_STATUS_PRECEDENCE).map((status) => [status, 0]),
  );
  for (const mutant of mutants) counts[mutant.status] += 1;
  return counts;
}

function strippedTestDefinition(test) {
  const { id: _id, ...definition } = test;
  return definition;
}

function assertTest(test, label) {
  if (!isRecord(test)) throw new Error(`${label} must be an object`);
  if (typeof test.id !== 'string' || test.id.length === 0) {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (typeof test.name !== 'string' || test.name.length === 0) {
    throw new Error(`${label}.name must be a non-empty string`);
  }
  if (test.location !== undefined) assertLocation(test.location, `${label}.location`, true);
}

function assertMutant(mutant, label) {
  if (!isRecord(mutant)) throw new Error(`${label} must be an object`);
  if (typeof mutant.id !== 'string' || mutant.id.length === 0) {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (typeof mutant.mutatorName !== 'string' || mutant.mutatorName.length === 0) {
    throw new Error(`${label}.mutatorName must be a non-empty string`);
  }
  if (typeof mutant.replacement !== 'string') {
    throw new Error(`${label}.replacement must be a string`);
  }
  if (!allowedStatuses.has(mutant.status)) {
    throw new Error(
      `${label}.status ${JSON.stringify(mutant.status)} is forbidden in a Recorder pass merge`,
    );
  }
  assertLocation(mutant.location, `${label}.location`);
  if (mutant.coveredBy !== undefined) {
    assertStringReferences(mutant.coveredBy, `${label}.coveredBy`);
  }
  if (mutant.killedBy !== undefined) assertStringReferences(mutant.killedBy, `${label}.killedBy`);
  if (mutant.status === 'Killed' && (!mutant.killedBy || mutant.killedBy.length === 0)) {
    throw new Error(`${label} is Killed without killedBy evidence`);
  }
  if (mutant.status !== 'Killed' && mutant.killedBy?.length) {
    throw new Error(`${label} has killedBy evidence but status ${mutant.status}`);
  }
  if (
    mutant.testsCompleted !== undefined &&
    (!Number.isInteger(mutant.testsCompleted) || mutant.testsCompleted < 0)
  ) {
    throw new Error(`${label}.testsCompleted must be a non-negative integer`);
  }
  if (
    mutant.duration !== undefined &&
    (typeof mutant.duration !== 'number' || !Number.isFinite(mutant.duration))
  ) {
    throw new Error(`${label}.duration must be a finite number`);
  }
  if (mutant.static !== undefined && typeof mutant.static !== 'boolean') {
    throw new Error(`${label}.static must be a boolean`);
  }
  if (mutant.statusReason !== undefined && typeof mutant.statusReason !== 'string') {
    throw new Error(`${label}.statusReason must be a string`);
  }
}

/** Exact, unnormalised identity. Pass-local mutant IDs are deliberately absent. */
export function recorderMutantSignature(fileName, mutant) {
  return JSON.stringify([
    fileName,
    mutant.location.start.line,
    mutant.location.start.column,
    mutant.location.end.line,
    mutant.location.end.column,
    mutant.mutatorName,
    mutant.replacement,
  ]);
}

function structuralMutant(mutant) {
  return Object.fromEntries(
    Object.entries(mutant).filter(([field]) => !observationFields.has(field)),
  );
}

function passKey(pass) {
  if (typeof pass === 'string') return pass;
  if (isRecord(pass) && typeof pass.key === 'string') return pass.key;
  throw new Error('Every Recorder pass report must identify its pass by key or plan object');
}

function assertPassObjectMatches(actual, expected) {
  if (typeof actual === 'string') return;
  for (const field of [
    'key',
    'rangeName',
    'startLine',
    'endLine',
    'selector',
    'passName',
    'testFile',
  ]) {
    if (actual[field] !== expected[field]) {
      throw new Error(`Recorder pass ${expected.key} has stale ${field} metadata`);
    }
  }
}

function indexPassReports(passReports, plan) {
  if (!Array.isArray(passReports)) throw new Error('passReports must be an array');
  const expectedByKey = new Map(plan.passes.map((pass) => [pass.key, pass]));
  const reportsByKey = new Map();
  const metadataByKey = new Map();
  for (const [index, entry] of passReports.entries()) {
    if (!isRecord(entry) || !isRecord(entry.report)) {
      throw new Error(`Recorder pass report ${index} must contain a parsed report object`);
    }
    const key = passKey(entry.pass);
    const expected = expectedByKey.get(key);
    if (!expected) throw new Error(`Unexpected Recorder mutation pass ${key}`);
    assertPassObjectMatches(entry.pass, expected);
    if (reportsByKey.has(key)) throw new Error(`Recorder mutation pass ${key} was reported twice`);
    const mode = entry.mode ?? RECORDER_PASS_MODE_COVERAGE_ALL;
    if (
      mode !== RECORDER_PASS_MODE_COVERAGE_ALL &&
      mode !== RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL
    ) {
      throw new Error(`Recorder mutation pass ${key} has unknown mode ${JSON.stringify(mode)}`);
    }
    if (
      mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL &&
      expected.testFile !== '__tests__/recorder-test.tsx'
    ) {
      throw new Error(
        'Only the planned Recorder integration pass may use coverage-off incremental mode',
      );
    }
    const skippedDuePriorKillSignatures = entry.skippedDuePriorKillSignatures ?? [];
    if (
      !Array.isArray(skippedDuePriorKillSignatures) ||
      skippedDuePriorKillSignatures.some(
        (signature) => typeof signature !== 'string' || signature.length === 0,
      )
    ) {
      throw new Error(`Recorder mutation pass ${key} has invalid skipped signatures`);
    }
    if (new Set(skippedDuePriorKillSignatures).size !== skippedDuePriorKillSignatures.length) {
      throw new Error(`Recorder mutation pass ${key} repeats a skipped signature`);
    }
    if (
      mode !== RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL &&
      skippedDuePriorKillSignatures.length > 0
    ) {
      throw new Error(`Recorder mutation pass ${key} declares skips outside incremental mode`);
    }
    reportsByKey.set(key, entry.report);
    metadataByKey.set(key, {
      mode,
      skippedDuePriorKillSignatures: [...skippedDuePriorKillSignatures],
      skippedDuePriorKillSignatureSet: new Set(skippedDuePriorKillSignatures),
    });
  }
  const missing = plan.passes.filter((pass) => !reportsByKey.has(pass.key));
  if (missing.length) {
    throw new Error(
      `Missing Recorder mutation passes: ${missing.map((pass) => pass.key).join(', ')}`,
    );
  }
  return { metadataByKey, reportsByKey };
}

function assertPassReportShape(report, pass, passMetadata) {
  if (typeof report.schemaVersion !== 'string' || report.schemaVersion.length === 0) {
    throw new Error(`Recorder pass ${pass.key} has no schemaVersion`);
  }
  if (!isRecord(report.thresholds)) throw new Error(`Recorder pass ${pass.key} has no thresholds`);
  if (!isRecord(report.files) || Object.keys(report.files).length !== 1) {
    throw new Error(`Recorder pass ${pass.key} must report exactly one source file`);
  }
  if (!own(report.files, RECORDER_SOURCE_FILE)) {
    throw new Error(`Recorder pass ${pass.key} did not report ${RECORDER_SOURCE_FILE}`);
  }
  if (!isRecord(report.testFiles) || Object.keys(report.testFiles).length !== 1) {
    throw new Error(`Recorder pass ${pass.key} must report exactly one test file`);
  }
  if (!own(report.testFiles, pass.testFile)) {
    throw new Error(`Recorder pass ${pass.key} did not report ${pass.testFile}`);
  }
  const sourceFile = report.files[RECORDER_SOURCE_FILE];
  if (!isRecord(sourceFile) || typeof sourceFile.source !== 'string') {
    throw new Error(`Recorder pass ${pass.key} has no Recorder source text`);
  }
  if (!Array.isArray(sourceFile.mutants)) {
    throw new Error(`Recorder pass ${pass.key} has no mutants array`);
  }
  const testFile = report.testFiles[pass.testFile];
  if (
    !isRecord(testFile) ||
    typeof testFile.source !== 'string' ||
    !Array.isArray(testFile.tests)
  ) {
    throw new Error(`Recorder pass ${pass.key} has an invalid test file record`);
  }
  if (testFile.tests.length === 0) {
    throw new Error(`Recorder pass ${pass.key} reported zero test definitions`);
  }
  if (!isRecord(report.config)) throw new Error(`Recorder pass ${pass.key} has no config`);
  if (
    !Array.isArray(report.config.mutate) ||
    report.config.mutate.length !== 1 ||
    report.config.mutate[0] !== pass.selector
  ) {
    throw new Error(`Recorder pass ${pass.key} config.mutate does not match its selector`);
  }
  const testMatch = report.config.jest?.config?.testMatch;
  const expectedTestMatch = `<rootDir>/${pass.testFile}`;
  if (!Array.isArray(testMatch) || testMatch.length !== 1 || testMatch[0] !== expectedTestMatch) {
    throw new Error(`Recorder pass ${pass.key} Jest testMatch does not match its test file`);
  }
  if (passMetadata.mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL) {
    if (report.config.coverageAnalysis !== 'off') {
      throw new Error(`Recorder pass ${pass.key} must use coverageAnalysis off`);
    }
    if (report.config.incremental !== true) {
      throw new Error(`Recorder pass ${pass.key} must set incremental true`);
    }
    if (report.config.force !== false) {
      throw new Error(`Recorder pass ${pass.key} must set force false`);
    }
  } else {
    if (report.config.coverageAnalysis !== 'all') {
      throw new Error(`Recorder pass ${pass.key} must use coverageAnalysis all`);
    }
    if (report.config.incremental === true) {
      throw new Error(`Recorder pass ${pass.key} cannot use incremental mode`);
    }
  }
  if (report.config.ignoreStatic !== false) {
    throw new Error(`Recorder pass ${pass.key} must set ignoreStatic false`);
  }
}

function assertCommonMetadata(report, firstReport, passKeyValue, firstPassKey) {
  for (const field of ['schemaVersion', 'thresholds', 'projectRoot', 'framework']) {
    if (!isDeepStrictEqual(report[field], firstReport[field])) {
      throw new Error(
        `Recorder report metadata ${field} differs between passes ${firstPassKey} and ${passKeyValue}`,
      );
    }
  }
}

function buildTestCatalog({ plan, reportsByKey }) {
  const canonicalByFile = new Map();
  let nextTestId = 0;
  for (const testFileName of plan.testFiles) {
    const matchingPasses = plan.passes.filter((pass) => pass.testFile === testFileName);
    const firstPass = matchingPasses[0];
    const firstTestFile = reportsByKey.get(firstPass.key).testFiles[testFileName];
    const definitions = firstTestFile.tests.map((test, index) => {
      assertTest(test, `Test ${index} in ${testFileName} for pass ${firstPass.key}`);
      return strippedTestDefinition(test);
    });
    const ids = definitions.map(() => String(nextTestId++));
    canonicalByFile.set(testFileName, {
      source: firstTestFile.source,
      definitions,
      ids,
      tests: definitions.map((definition, index) => ({ ...definition, id: ids[index] })),
    });

    for (const pass of matchingPasses.slice(1)) {
      const observed = reportsByKey.get(pass.key).testFiles[testFileName];
      const observedDefinitions = observed.tests.map((test, index) => {
        assertTest(test, `Test ${index} in ${testFileName} for pass ${pass.key}`);
        return strippedTestDefinition(test);
      });
      if (observed.source !== firstTestFile.source) {
        throw new Error(`Test source ${testFileName} differs between Recorder passes`);
      }
      if (!isDeepStrictEqual(observedDefinitions, definitions)) {
        throw new Error(`Test definitions in ${testFileName} differ between Recorder passes`);
      }
    }
  }

  const localMaps = new Map();
  for (const pass of plan.passes) {
    const testFile = reportsByKey.get(pass.key).testFiles[pass.testFile];
    const canonical = canonicalByFile.get(pass.testFile);
    const local = new Map();
    for (const [index, test] of testFile.tests.entries()) {
      if (local.has(test.id)) {
        throw new Error(`Recorder pass ${pass.key} repeats local test ID ${test.id}`);
      }
      local.set(test.id, canonical.ids[index]);
    }
    localMaps.set(pass.key, local);
  }
  return { canonicalByFile, localMaps, testCount: nextTestId };
}

function remapReferences(references, localMap, label) {
  if (references === undefined) return [];
  return references.map((localId) => {
    const globalId = localMap.get(localId);
    if (globalId === undefined) throw new Error(`${label} references unknown test ID ${localId}`);
    return globalId;
  });
}

function normalizedConfig(firstReport, plan) {
  if (!isRecord(firstReport.config)) return undefined;
  const config = structuredClone(firstReport.config);
  config.mutate = [RECORDER_SOURCE_FILE];
  if (isRecord(config.jest) && isRecord(config.jest.config)) {
    config.jest.config.testMatch = plan.testFiles.map((testFile) => `<rootDir>/${testFile}`);
  }
  delete config.tempDirName;
  delete config.concurrency;
  delete config.incremental;
  delete config.incrementalFile;
  delete config.force;
  delete config.jsonReporter;
  delete config.htmlReporter;
  delete config.eventReporter;
  return config;
}

/**
 * Merge already-parsed, complete pass reports into one ordinary Stryker report.
 * Input array order is ignored; manifest order owns every deterministic choice.
 */
export function mergeRecorderMutationPassData({ passReports, plan }) {
  assertRecorderMutationPlan(plan, { sourceLineCount: plan?.sourceLineCount });
  const { metadataByKey, reportsByKey } = indexPassReports(passReports, plan);
  const firstPass = plan.passes[0];
  const firstReport = reportsByKey.get(firstPass.key);
  let recorderSource;
  let sourceFileMetadata;
  const passSummaries = [];

  for (const pass of plan.passes) {
    const report = reportsByKey.get(pass.key);
    assertMutationTestingReportSchema(report, `Recorder pass ${pass.key}`);
    assertPassReportShape(report, pass, metadataByKey.get(pass.key));
    assertCommonMetadata(report, firstReport, pass.key, firstPass.key);
    const sourceFile = report.files[RECORDER_SOURCE_FILE];
    if (recorderSource === undefined) {
      recorderSource = sourceFile.source;
      const { mutants: _mutants, ...metadata } = sourceFile;
      sourceFileMetadata = metadata;
    } else {
      if (sourceFile.source !== recorderSource) {
        throw new Error(`Recorder source differs in pass ${pass.key}`);
      }
      const { mutants: _mutants, ...metadata } = sourceFile;
      if (!isDeepStrictEqual(metadata, sourceFileMetadata)) {
        throw new Error(`Recorder source metadata differs in pass ${pass.key}`);
      }
    }
  }
  if (countRecorderSourceLines(recorderSource) !== plan.sourceLineCount) {
    throw new Error('Recorder report source line count does not match the resolved pass plan');
  }

  const { canonicalByFile, localMaps, testCount } = buildTestCatalog({ plan, reportsByKey });
  const rangeSignatures = new Map();
  const observationsBySignature = new Map();
  const signatureRange = new Map();

  for (const range of plan.ranges) {
    const rangePasses = plan.passes.filter((pass) => pass.rangeName === range.name);
    let expectedSignatures;
    for (const pass of rangePasses) {
      const report = reportsByKey.get(pass.key);
      const passMetadata = metadataByKey.get(pass.key);
      const mutants = report.files[RECORDER_SOURCE_FILE].mutants;
      const localTestIds = localMaps.get(pass.key);
      const observedSignatures = new Set();
      const passMutants = [];
      const localMutantIds = new Set();
      const observedSkippedSignatures = new Set();
      for (const [index, mutant] of mutants.entries()) {
        const label = `Mutant ${index} in Recorder pass ${pass.key}`;
        assertMutant(mutant, label);
        if (localMutantIds.has(mutant.id)) {
          throw new Error(`Recorder pass ${pass.key} repeats mutant ID ${mutant.id}`);
        }
        localMutantIds.add(mutant.id);
        if (
          mutant.location.start.line < range.startLine ||
          mutant.location.start.line > range.endLine
        ) {
          throw new Error(`${label} starts outside declared range ${range.name}`);
        }
        const signature = recorderMutantSignature(RECORDER_SOURCE_FILE, mutant);
        if (observedSignatures.has(signature)) {
          throw new Error(`Recorder pass ${pass.key} repeats mutant signature ${signature}`);
        }
        observedSignatures.add(signature);
        const declaredSkipped = passMetadata.skippedDuePriorKillSignatureSet.has(signature);
        const hasExplicitSkipReason = mutant.statusReason === RECORDER_INCREMENTAL_SKIP_REASON;
        if (declaredSkipped) {
          if (
            mutant.status !== 'NoCoverage' ||
            !Array.isArray(mutant.coveredBy) ||
            mutant.coveredBy.length !== 0 ||
            mutant.killedBy !== undefined ||
            mutant.statusReason !== RECORDER_INCREMENTAL_SKIP_REASON ||
            mutant.testsCompleted !== undefined ||
            mutant.duration !== undefined
          ) {
            throw new Error(
              `Recorder pass ${pass.key} declared skip ${signature} without a truthful ` +
                'NoCoverage skip observation',
            );
          }
          observedSkippedSignatures.add(signature);
        } else if (hasExplicitSkipReason) {
          throw new Error(`Recorder pass ${pass.key} contains undeclared skip ${signature}`);
        }
        const coveredBy = remapReferences(mutant.coveredBy, localTestIds, `${label}.coveredBy`);
        const killedBy = remapReferences(mutant.killedBy, localTestIds, `${label}.killedBy`);
        const structure = structuralMutant(mutant);
        const existingRange = signatureRange.get(signature);
        if (existingRange !== undefined && existingRange !== range.name) {
          throw new Error(
            `Recorder mutant signature appears in overlapping ranges ${existingRange} and ${range.name}`,
          );
        }
        signatureRange.set(signature, range.name);
        const observations = observationsBySignature.get(signature) ?? [];
        if (observations.length && !isDeepStrictEqual(observations[0].structure, structure)) {
          throw new Error(`Recorder mutant structure differs between passes for ${signature}`);
        }
        const observation = {
          passKey: pass.key,
          passName: pass.passName,
          testFile: pass.testFile,
          mode: passMetadata.mode,
          skippedDuePriorKill: declaredSkipped,
          localId: mutant.id,
          status: mutant.status,
          ...(mutant.statusReason === undefined ? {} : { statusReason: mutant.statusReason }),
          coveredBy,
          ...(mutant.duration === undefined ? {} : { duration: mutant.duration }),
          killedBy,
          ...(mutant.testsCompleted === undefined ? {} : { testsCompleted: mutant.testsCompleted }),
          ...(mutant.static === undefined ? {} : { static: mutant.static }),
          structure,
        };
        observations.push(observation);
        observationsBySignature.set(signature, observations);
        passMutants.push(mutant);
      }
      const missingDeclaredSkips = passMetadata.skippedDuePriorKillSignatures.filter(
        (signature) => !observedSkippedSignatures.has(signature),
      );
      if (missingDeclaredSkips.length) {
        throw new Error(
          `Recorder pass ${pass.key} declared skips without matching observations: ` +
            missingDeclaredSkips.join(', '),
        );
      }
      if (expectedSignatures === undefined) {
        expectedSignatures = observedSignatures;
      } else {
        const missing = [...expectedSignatures].filter(
          (signature) => !observedSignatures.has(signature),
        );
        const extra = [...observedSignatures].filter(
          (signature) => !expectedSignatures.has(signature),
        );
        if (missing.length || extra.length) {
          throw new Error(
            `Recorder pass ${pass.key} mutant universe differs within range ${range.name} ` +
              `(missing ${missing.length}, extra ${extra.length})`,
          );
        }
      }
      passSummaries.push({
        key: pass.key,
        rangeName: pass.rangeName,
        passName: pass.passName,
        testFile: pass.testFile,
        mode: passMetadata.mode,
        skippedDuePriorKillCount: passMetadata.skippedDuePriorKillSignatures.length,
        skippedDuePriorKillSignatures: [...passMetadata.skippedDuePriorKillSignatures],
        mutantCount: passMutants.length,
        statusCounts: statusCounts(passMutants),
      });
    }
    if ((expectedSignatures?.size ?? 0) === 0) {
      throw new Error(`Recorder mutation range ${range.name} reported an empty mutant universe`);
    }
    rangeSignatures.set(range.name, expectedSignatures ?? new Set());
  }

  const mergedEntries = [...observationsBySignature.entries()]
    .map(([signature, observations]) => ({ signature, observations }))
    .sort((left, right) =>
      mutantComparator(left.observations[0].structure, right.observations[0].structure),
    );
  const mergedMutants = [];
  const sidecarMutants = [];
  for (const [index, entry] of mergedEntries.entries()) {
    const skippedObservations = entry.observations.filter(
      (observation) => observation.skippedDuePriorKill,
    );
    if (
      skippedObservations.length > 0 &&
      !entry.observations.some(
        (observation) => !observation.skippedDuePriorKill && observation.status === 'Killed',
      )
    ) {
      throw new Error(
        `Recorder incremental skip has no prior Killed observation: ${entry.signature}`,
      );
    }
    const ranked = [...entry.observations].sort(
      (left, right) =>
        RECORDER_MUTANT_STATUS_PRECEDENCE[right.status] -
        RECORDER_MUTANT_STATUS_PRECEDENCE[left.status],
    );
    const winning = ranked[0];
    const coveredBy = sortedUniqueTestIds(entry.observations.flatMap((item) => item.coveredBy));
    const killedBy = sortedUniqueTestIds(
      entry.observations
        .filter((item) => item.status === 'Killed')
        .flatMap((item) => item.killedBy),
    );
    const mergedMutant = {
      ...winning.structure,
      id: String(index),
      status: winning.status,
      coveredBy,
      static: entry.observations.some((observation) => observation.static === true),
    };
    if (winning.status === 'Killed') mergedMutant.killedBy = killedBy;
    if (winning.statusReason !== undefined) mergedMutant.statusReason = winning.statusReason;
    mergedMutants.push(mergedMutant);
    sidecarMutants.push({
      id: mergedMutant.id,
      signature: entry.signature,
      rangeName: signatureRange.get(entry.signature),
      finalStatus: mergedMutant.status,
      skippedDuePriorKillObservationCount: skippedObservations.length,
      dominatedStatuses: [
        ...new Set(
          entry.observations
            .map((item) => item.status)
            .filter((status) => status !== mergedMutant.status),
        ),
      ],
      observations: entry.observations.map(
        ({ structure: _structure, ...observation }) => observation,
      ),
    });
  }

  const testFiles = Object.fromEntries(
    plan.testFiles.map((testFileName) => {
      const canonical = canonicalByFile.get(testFileName);
      return [testFileName, { source: canonical.source, tests: canonical.tests }];
    }),
  );
  const report = {
    ...firstReport,
    files: {
      [RECORDER_SOURCE_FILE]: { ...sourceFileMetadata, mutants: mergedMutants },
    },
    testFiles,
  };
  const config = normalizedConfig(firstReport, plan);
  if (config === undefined) delete report.config;
  else report.config = config;
  assertMutationTestingReportSchema(report, 'Synthesized Recorder mutation report');

  const ranges = plan.ranges.map((range) => {
    const signatures = rangeSignatures.get(range.name);
    const rangeMutants = mergedMutants.filter(
      (mutant) =>
        mutant.location.start.line >= range.startLine &&
        mutant.location.start.line <= range.endLine,
    );
    return {
      name: range.name,
      startLine: range.startLine,
      endLine: range.endLine,
      selector: range.selector,
      mutantCount: signatures.size,
      statusCounts: statusCounts(rangeMutants),
      passes: passSummaries.filter((summary) => summary.rangeName === range.name),
    };
  });
  const sidecar = {
    schemaVersion: 1,
    sourceFile: RECORDER_SOURCE_FILE,
    sourceLineCount: plan.sourceLineCount,
    statusPrecedence: Object.keys(RECORDER_MUTANT_STATUS_PRECEDENCE).sort(
      (left, right) =>
        RECORDER_MUTANT_STATUS_PRECEDENCE[right] - RECORDER_MUTANT_STATUS_PRECEDENCE[left],
    ),
    incrementalSkipReason: RECORDER_INCREMENTAL_SKIP_REASON,
    rangeCount: plan.ranges.length,
    passCount: plan.passes.length,
    testFileCount: plan.testFiles.length,
    testCount,
    mutantCount: mergedMutants.length,
    statusCounts: statusCounts(mergedMutants),
    ranges,
    mutants: sidecarMutants,
  };
  return { report, sidecar };
}

async function writeArtifactsAtomically(artifacts) {
  const temporary = artifacts.map(({ filePath, contents }, index) => ({
    filePath,
    contents,
    temporaryPath: `${filePath}.tmp-${process.pid}-${index}`,
  }));
  try {
    await Promise.all(
      temporary.map(async ({ filePath, temporaryPath, contents }) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(temporaryPath, contents, 'utf8');
      }),
    );
    for (const artifact of temporary) await fs.rename(artifact.temporaryPath, artifact.filePath);
  } finally {
    await Promise.all(temporary.map(({ temporaryPath }) => fs.rm(temporaryPath, { force: true })));
  }
}

/** Read pass files, merge them, optionally verify workspace source, and publish. */
export async function mergeRecorderMutationPassReports({
  passReports,
  plan,
  outputPath,
  sidecarPath,
  recorderSourcePath,
}) {
  if (!Array.isArray(passReports)) throw new Error('passReports must be an array');
  const parsed = await Promise.all(
    passReports.map(async (entry, index) => {
      if (
        !isRecord(entry) ||
        typeof entry.reportPath !== 'string' ||
        entry.reportPath.length === 0
      ) {
        throw new Error(`Recorder pass report ${index} must contain reportPath`);
      }
      let report;
      try {
        report = JSON.parse(await fs.readFile(entry.reportPath, 'utf8'));
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`Recorder pass report ${entry.reportPath} is not valid JSON`);
        }
        throw error;
      }
      return {
        pass: entry.pass,
        report,
        ...(entry.mode === undefined ? {} : { mode: entry.mode }),
        ...(entry.skippedDuePriorKillSignatures === undefined
          ? {}
          : { skippedDuePriorKillSignatures: entry.skippedDuePriorKillSignatures }),
      };
    }),
  );
  const merged = mergeRecorderMutationPassData({ passReports: parsed, plan });
  if (recorderSourcePath !== undefined) {
    const currentSource = await fs.readFile(recorderSourcePath, 'utf8');
    if (merged.report.files[RECORDER_SOURCE_FILE].source !== currentSource) {
      throw new Error('Recorder pass reports are stale relative to recorderSourcePath');
    }
  }
  if (outputPath !== undefined) {
    if (typeof outputPath !== 'string' || outputPath.length === 0) {
      throw new Error('outputPath must be a non-empty string');
    }
    const resolvedSidecarPath = sidecarPath ?? outputPath.replace(/\.json$/u, '.multipass.json');
    if (resolvedSidecarPath === outputPath) {
      throw new Error('sidecarPath must differ from outputPath');
    }
    await writeArtifactsAtomically([
      { filePath: resolvedSidecarPath, contents: `${JSON.stringify(merged.sidecar, null, 2)}\n` },
      // The standard report is the commit marker: a crash may leave an inert
      // sidecar, but can never expose a new recorder.json before its audit data.
      { filePath: outputPath, contents: JSON.stringify(merged.report) },
    ]);
    return { ...merged, paths: { report: outputPath, sidecar: resolvedSidecarPath } };
  }
  if (sidecarPath !== undefined) throw new Error('sidecarPath requires outputPath');
  return { ...merged, paths: { report: undefined, sidecar: undefined } };
}
