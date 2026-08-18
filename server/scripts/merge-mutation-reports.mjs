import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import {
  assertMutationLaneManifest,
  codeMutationLaneNames,
  codeMutationLanes,
  duplicates,
  expectedCodeMutationFiles,
} from './mutation-lanes.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(scriptsDirectory, '..');
const defaultReportDirectory = path.join(serverDirectory, 'reports', 'mutation', 'code');
const require = createRequire(import.meta.url);

const mutantStatuses = Object.freeze([
  'Killed',
  'Survived',
  'NoCoverage',
  'CompileError',
  'RuntimeError',
  'Timeout',
  'Ignored',
  'Pending',
]);
const mutantStatusSet = new Set(mutantStatuses);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function sortedDifference(first, second) {
  const secondSet = new Set(second);
  return first.filter((item) => !secondSet.has(item)).toSorted();
}

function assertExactKeys(actual, expected, label) {
  const duplicateActual = duplicates(actual);
  if (duplicateActual.length) {
    throw new Error(`${label} has duplicate actual entries: ${duplicateActual.join(', ')}`);
  }
  const duplicateExpected = duplicates(expected);
  if (duplicateExpected.length) {
    throw new Error(`${label} has duplicate expected entries: ${duplicateExpected.join(', ')}`);
  }
  const missing = sortedDifference(expected, actual);
  const unexpected = sortedDifference(actual, expected);
  if (missing.length || unexpected.length) {
    throw new Error(
      [
        `${label} does not match the mutation lane manifest.`,
        missing.length ? `Missing: ${missing.join(', ')}` : undefined,
        unexpected.length ? `Unexpected: ${unexpected.join(', ')}` : undefined,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
}

function assertPosition(position, label) {
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

function assertLocation(location, label, endIsOptional = false) {
  if (!isRecord(location)) throw new Error(`${label} must be an object`);
  assertPosition(location.start, `${label}.start`);
  if (location.end === undefined) {
    if (!endIsOptional) throw new Error(`${label}.end is required`);
  } else {
    assertPosition(location.end, `${label}.end`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${label} must be an array of string IDs`);
  }
  const duplicateIds = duplicates(value);
  if (duplicateIds.length) throw new Error(`${label} repeats IDs: ${duplicateIds.join(', ')}`);
}

function assertTestDefinition(test, label) {
  if (!isRecord(test)) throw new Error(`${label} must be an object`);
  if (typeof test.id !== 'string' || test.id.length === 0) throw new Error(`${label}.id must be a non-empty string`);
  if (typeof test.name !== 'string' || test.name.length === 0) {
    throw new Error(`${label}.name must be a non-empty string`);
  }
  if (test.location !== undefined) assertLocation(test.location, `${label}.location`, true);
}

export function assertMutant(mutant, label) {
  if (!isRecord(mutant)) throw new Error(`${label} must be an object`);
  if (typeof mutant.id !== 'string' || mutant.id.length === 0) {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (typeof mutant.mutatorName !== 'string' || mutant.mutatorName.length === 0) {
    throw new Error(`${label}.mutatorName must be a non-empty string`);
  }
  if (!mutantStatusSet.has(mutant.status)) throw new Error(`${label}.status is invalid: ${String(mutant.status)}`);
  assertLocation(mutant.location, `${label}.location`);
  if (mutant.coveredBy !== undefined) assertStringArray(mutant.coveredBy, `${label}.coveredBy`);
  if (mutant.killedBy !== undefined) assertStringArray(mutant.killedBy, `${label}.killedBy`);
  if (mutant.static !== undefined && typeof mutant.static !== 'boolean') {
    throw new Error(`${label}.static must be a boolean when present`);
  }
  if (mutant.testsCompleted !== undefined && (!Number.isInteger(mutant.testsCompleted) || mutant.testsCompleted < 0)) {
    throw new Error(`${label}.testsCompleted must be a non-negative integer when present`);
  }
  if (mutant.duration !== undefined && (typeof mutant.duration !== 'number' || mutant.duration < 0)) {
    throw new Error(`${label}.duration must be a non-negative number when present`);
  }
}

function assertThresholds(thresholds, laneName) {
  if (
    !isRecord(thresholds) ||
    typeof thresholds.high !== 'number' ||
    !Number.isFinite(thresholds.high) ||
    typeof thresholds.low !== 'number' ||
    !Number.isFinite(thresholds.low) ||
    (thresholds.break !== undefined && (typeof thresholds.break !== 'number' || !Number.isFinite(thresholds.break)))
  ) {
    throw new Error(`Mutation report for lane ${laneName} has invalid thresholds`);
  }
}

function assertPerformance(performance, laneName) {
  if (!isRecord(performance)) throw new Error(`Mutation report for lane ${laneName} has invalid performance data`);
  for (const phase of ['setup', 'initialRun', 'mutation']) {
    if (typeof performance[phase] !== 'number' || !Number.isFinite(performance[phase]) || performance[phase] < 0) {
      throw new Error(`Mutation report for lane ${laneName} has invalid performance.${phase}`);
    }
  }
}

function assertReportShape(report, laneName, definition) {
  if (!isRecord(report)) throw new Error(`Mutation report for lane ${laneName} must be a JSON object`);
  if (typeof report.schemaVersion !== 'string' || report.schemaVersion.length === 0) {
    throw new Error(`Mutation report for lane ${laneName} has no schemaVersion`);
  }
  assertThresholds(report.thresholds, laneName);
  if (!isRecord(report.files)) throw new Error(`Mutation report for lane ${laneName} has no files object`);
  if (!isRecord(report.testFiles)) throw new Error(`Mutation report for lane ${laneName} has no testFiles object`);

  assertExactKeys(Object.keys(report.files), definition.mutate, `Source files in lane ${laneName}`);
  assertExactKeys(Object.keys(report.testFiles), definition.testFiles, `Test files in lane ${laneName}`);

  for (const sourceFileName of definition.mutate) {
    const sourceFile = report.files[sourceFileName];
    if (!isRecord(sourceFile)) throw new Error(`Source file ${sourceFileName} in lane ${laneName} must be an object`);
    if (typeof sourceFile.language !== 'string' || sourceFile.language.length === 0) {
      throw new Error(`Source file ${sourceFileName} in lane ${laneName} has no language`);
    }
    if (typeof sourceFile.source !== 'string') {
      throw new Error(`Source file ${sourceFileName} in lane ${laneName} has no source text`);
    }
    if (!Array.isArray(sourceFile.mutants)) {
      throw new Error(`Source file ${sourceFileName} in lane ${laneName} has no mutants array`);
    }
  }

  for (const testFileName of definition.testFiles) {
    const testFile = report.testFiles[testFileName];
    if (!isRecord(testFile) || !Array.isArray(testFile.tests)) {
      throw new Error(`Test file ${testFileName} in lane ${laneName} has no tests array`);
    }
    // Stryker emits the original test source for every configured test file.
    // Require it so a report from an earlier test revision cannot be merged
    // after coverage has been weakened or a test has been removed.
    if (typeof testFile.source !== 'string') {
      throw new Error(`Test file ${testFileName} in lane ${laneName} has no source text`);
    }
  }

  if (report.projectRoot !== undefined && typeof report.projectRoot !== 'string') {
    throw new Error(`Mutation report for lane ${laneName} has an invalid projectRoot`);
  }
  if (report.performance !== undefined) assertPerformance(report.performance, laneName);
}

function assertCompatibleMetadata(report, firstReport, laneName, firstLaneName) {
  for (const field of ['schemaVersion', 'thresholds', 'projectRoot', 'framework', 'system']) {
    if (!isDeepStrictEqual(report[field], firstReport[field])) {
      throw new Error(`Mutation report metadata ${field} differs between lanes ${firstLaneName} and ${laneName}`);
    }
  }
  if ((report.performance === undefined) !== (firstReport.performance === undefined)) {
    throw new Error(`Mutation report metadata performance is missing from only some lanes`);
  }
}

function testIdentity(testFileName, testName, occurrence) {
  return JSON.stringify([testFileName, testName, occurrence]);
}

function remapTestReferences(references, localTestIds, label) {
  if (references === undefined) return undefined;
  return references.map((oldId) => {
    const newId = localTestIds.get(oldId);
    if (newId === undefined) throw new Error(`${label} references unknown test ID ${oldId}`);
    return newId;
  });
}

function emptyStatusCounts() {
  return Object.fromEntries(mutantStatuses.map((status) => [status, 0]));
}

export function summarizeMutants(mutants) {
  const statusCounts = emptyStatusCounts();
  let staticMutants = 0;
  for (const mutant of mutants) {
    statusCounts[mutant.status] += 1;
    if (mutant.static === true) staticMutants += 1;
  }
  const detected = statusCounts.Killed + statusCounts.Timeout;
  const undetected = statusCounts.Survived + statusCounts.NoCoverage;
  const unresolvedOrInvalid = undetected + statusCounts.CompileError + statusCounts.RuntimeError + statusCounts.Pending;
  const valid = detected + undetected;
  const covered = detected + statusCounts.Survived;
  return {
    mutantCount: mutants.length,
    staticMutants,
    dynamicMutants: mutants.length - staticMutants,
    statusCounts,
    strictMutationGatePassed: unresolvedOrInvalid === 0,
    mutationScore: valid === 0 ? null : (detected / valid) * 100,
    mutationScoreBasedOnCoveredCode: valid === 0 ? null : covered === 0 ? 0 : (detected / covered) * 100,
  };
}

function sanitizeConfig(config, expectedFiles, testFiles, laneNames) {
  if (!isRecord(config)) return undefined;
  const mergedConfig = { ...config };
  delete mergedConfig.tempDirName;
  delete mergedConfig.jsonReporter;
  delete mergedConfig.htmlReporter;
  mergedConfig.mutate = [...expectedFiles];
  mergedConfig.testFiles = [...testFiles];
  mergedConfig.mutationLanes = [...laneNames];
  return mergedConfig;
}

/**
 * Merge already-parsed lane reports. The injectable manifest arguments are
 * intentionally exposed for the focused fixture tests; normal callers should
 * use mergeMutationReports(), which uses and validates mutation-lanes.mjs.
 */
export function mergeMutationReportData({ reportsByLane, lanes, laneNames, expectedFiles }) {
  if (!isRecord(reportsByLane)) throw new Error('reportsByLane must be an object keyed by lane name');
  if (!isRecord(lanes) || !Array.isArray(laneNames) || !Array.isArray(expectedFiles) || laneNames.length === 0) {
    throw new Error('Mutation lane manifest arguments are invalid');
  }
  assertExactKeys(Object.keys(lanes), laneNames, 'Mutation lane names');
  assertExactKeys(Object.keys(reportsByLane), laneNames, 'Mutation lane reports');
  for (const laneName of laneNames) {
    const definition = lanes[laneName];
    if (!isRecord(definition) || !Array.isArray(definition.mutate) || !Array.isArray(definition.testFiles)) {
      throw new Error(`Mutation lane ${laneName} has an invalid definition`);
    }
  }
  const manifestFiles = laneNames.flatMap((laneName) => lanes[laneName].mutate);
  assertExactKeys(manifestFiles, expectedFiles, 'Expected mutation source files');

  const mergedFiles = new Map();
  const mergedTestFiles = new Map();
  const globalTests = new Map();
  const laneSummaries = [];
  let nextMutantId = 0;
  let nextTestId = 0;
  let firstReport;
  let firstLaneName;
  let aggregatePerformance;

  for (const laneName of laneNames) {
    const definition = lanes[laneName];
    const report = reportsByLane[laneName];
    assertReportShape(report, laneName, definition);
    if (firstReport === undefined) {
      firstReport = report;
      firstLaneName = laneName;
      if (report.performance !== undefined) aggregatePerformance = { setup: 0, initialRun: 0, mutation: 0 };
    } else {
      assertCompatibleMetadata(report, firstReport, laneName, firstLaneName);
    }
    if (aggregatePerformance !== undefined) {
      aggregatePerformance.setup += report.performance.setup;
      aggregatePerformance.initialRun += report.performance.initialRun;
      aggregatePerformance.mutation += report.performance.mutation;
    }

    const localTestIds = new Map();
    for (const testFileName of definition.testFiles) {
      const testFile = report.testFiles[testFileName];
      let mergedTestFile = mergedTestFiles.get(testFileName);
      if (mergedTestFile === undefined) {
        mergedTestFile = { tests: [] };
        if (own(testFile, 'source')) mergedTestFile.source = testFile.source;
        mergedTestFiles.set(testFileName, mergedTestFile);
      } else if (
        own(testFile, 'source') !== own(mergedTestFile, 'source') ||
        (own(testFile, 'source') && testFile.source !== mergedTestFile.source)
      ) {
        throw new Error(`Test file source differs across lanes for ${testFileName}`);
      }

      const occurrencesByName = new Map();
      for (const [testIndex, test] of testFile.tests.entries()) {
        const label = `Test ${testIndex} in ${testFileName} for lane ${laneName}`;
        assertTestDefinition(test, label);
        if (localTestIds.has(test.id)) {
          throw new Error(`Mutation report for lane ${laneName} repeats test ID ${test.id}`);
        }
        const occurrence = occurrencesByName.get(test.name) ?? 0;
        occurrencesByName.set(test.name, occurrence + 1);
        const identity = testIdentity(testFileName, test.name, occurrence);
        const existingTest = globalTests.get(identity);
        let globalId;
        if (existingTest === undefined) {
          globalId = String(nextTestId++);
          const mergedTest = { ...test, id: globalId };
          globalTests.set(identity, mergedTest);
          mergedTestFile.tests.push(mergedTest);
        } else {
          const { id: _existingId, ...existingMetadata } = existingTest;
          const { id: _incomingId, ...incomingMetadata } = test;
          if (!isDeepStrictEqual(existingMetadata, incomingMetadata)) {
            throw new Error(
              `Test metadata differs across lanes for ${testFileName}: ${test.name} (occurrence ${occurrence + 1})`,
            );
          }
          globalId = existingTest.id;
        }
        localTestIds.set(test.id, globalId);
      }
    }

    const laneMutants = [];
    const localMutantIds = new Set();
    for (const sourceFileName of definition.mutate) {
      if (mergedFiles.has(sourceFileName)) {
        throw new Error(`Source file ${sourceFileName} was reported by more than one mutation lane`);
      }
      const sourceFile = report.files[sourceFileName];
      const mergedMutants = [];
      for (const [mutantIndex, mutant] of sourceFile.mutants.entries()) {
        const label = `Mutant ${mutantIndex} in ${sourceFileName} for lane ${laneName}`;
        assertMutant(mutant, label);
        if (localMutantIds.has(mutant.id)) {
          throw new Error(`Mutation report for lane ${laneName} repeats mutant ID ${mutant.id}`);
        }
        localMutantIds.add(mutant.id);
        const mergedMutant = { ...mutant, id: String(nextMutantId++) };
        if (own(mutant, 'coveredBy')) {
          mergedMutant.coveredBy = remapTestReferences(mutant.coveredBy, localTestIds, `${label}.coveredBy`);
        }
        if (own(mutant, 'killedBy')) {
          mergedMutant.killedBy = remapTestReferences(mutant.killedBy, localTestIds, `${label}.killedBy`);
        }
        mergedMutants.push(mergedMutant);
        laneMutants.push(mergedMutant);
      }
      mergedFiles.set(sourceFileName, { ...sourceFile, mutants: mergedMutants });
    }
    laneSummaries.push({
      name: laneName,
      files: [...definition.mutate],
      testFiles: [...definition.testFiles],
      ...summarizeMutants(laneMutants),
    });
  }

  assertExactKeys([...mergedFiles.keys()], expectedFiles, 'Merged mutation source files');
  const orderedFiles = Object.fromEntries(expectedFiles.map((fileName) => [fileName, mergedFiles.get(fileName)]));
  const orderedTestFileNames = [...mergedTestFiles.keys()].toSorted();
  const orderedTestFiles = Object.fromEntries(
    orderedTestFileNames.map((testFileName) => [testFileName, mergedTestFiles.get(testFileName)]),
  );
  const allMutants = Object.values(orderedFiles).flatMap((file) => file.mutants);
  const aggregate = summarizeMutants(allMutants);
  const breakThreshold = firstReport.thresholds.break;
  const summary = {
    schemaVersion: 1,
    laneCount: laneNames.length,
    fileCount: expectedFiles.length,
    testFileCount: orderedTestFileNames.length,
    testCount: globalTests.size,
    ...aggregate,
    thresholds: { ...firstReport.thresholds },
    meetsBreakThreshold:
      aggregate.mutationScore === null || typeof breakThreshold !== 'number'
        ? null
        : aggregate.mutationScore >= breakThreshold,
    lanes: laneSummaries,
  };
  const mergedReport = {
    ...firstReport,
    files: orderedFiles,
    testFiles: orderedTestFiles,
    config: sanitizeConfig(firstReport.config, expectedFiles, orderedTestFileNames, laneNames),
  };
  if (aggregatePerformance === undefined) delete mergedReport.performance;
  else mergedReport.performance = aggregatePerformance;
  if (mergedReport.config === undefined) delete mergedReport.config;

  return { report: mergedReport, summary };
}

export async function createMutationReportHtml(report) {
  const bundlePath = require.resolve('mutation-testing-elements/mutation-test-elements.js');
  const scriptContent = await fs.readFile(bundlePath, 'utf8');
  const serializedReport = JSON.stringify(report)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Backend code mutation report</title>
    <script>${scriptContent}</script>
  </head>
  <body>
    <mutation-test-report-app title-postfix="Backend code">
      This report requires a browser with custom-elements support.
    </mutation-test-report-app>
    <script>
      const app = document.querySelector('mutation-test-report-app');
      app.report = ${serializedReport};
      const updateTheme = () => {
        document.body.style.backgroundColor = app.themeBackgroundColor;
      };
      app.addEventListener('theme-changed', updateTheme);
      updateTheme();
    </script>
  </body>
</html>`;
}

async function readLaneReports(reportDirectory) {
  const expectedReportPaths = Object.fromEntries(
    codeMutationLaneNames.map((laneName) => [laneName, path.join(reportDirectory, `${laneName}.json`)]),
  );
  const missing = [];
  for (const laneName of codeMutationLaneNames) {
    const stat = await fs.stat(expectedReportPaths[laneName]).catch((error) => {
      if (error?.code === 'ENOENT') return undefined;
      throw error;
    });
    if (!stat?.isFile()) missing.push(`${laneName}.json`);
  }
  if (missing.length) {
    throw new Error(`Cannot merge mutation reports; missing expected lane reports: ${missing.join(', ')}`);
  }

  const reportsByLane = {};
  for (const laneName of codeMutationLaneNames) {
    const reportPath = expectedReportPaths[laneName];
    let source;
    try {
      source = await fs.readFile(reportPath, 'utf8');
      reportsByLane[laneName] = JSON.parse(source);
    } catch (error) {
      throw new Error(`Cannot read mutation report for lane ${laneName} at ${reportPath}: ${error.message}`, {
        cause: error,
      });
    }
  }
  return reportsByLane;
}

/**
 * A lane report is only meaningful for the exact source and test bodies it
 * exercised. Stryker records those bodies; compare them to the workspace just
 * before writing the merged artifact so a stale report, or a source edit made
 * while a long campaign ran, fails closed rather than looking green.
 */
async function assertReportsMatchWorkspace(reportsByLane) {
  for (const laneName of codeMutationLaneNames) {
    const definition = codeMutationLanes[laneName];
    const report = reportsByLane[laneName];
    for (const sourceFileName of definition.mutate) {
      const currentSource = await fs.readFile(path.join(serverDirectory, sourceFileName), 'utf8');
      if (report.files[sourceFileName].source !== currentSource) {
        throw new Error(
          `Mutation report for lane ${laneName} embeds stale source for ${sourceFileName} that no longer matches the workspace`,
        );
      }
    }
    for (const testFileName of definition.testFiles) {
      const currentSource = await fs.readFile(path.join(serverDirectory, testFileName), 'utf8');
      if (report.testFiles[testFileName].source !== currentSource) {
        throw new Error(
          `Mutation report for lane ${laneName} embeds stale test source for ${testFileName} that no longer matches the workspace`,
        );
      }
    }
  }
}

async function writeArtifactsAtomically(artifacts) {
  const temporaryArtifacts = artifacts.map(({ filePath, contents }, index) => ({
    filePath,
    contents,
    temporaryPath: `${filePath}.tmp-${process.pid}-${index}`,
  }));
  try {
    await Promise.all(
      temporaryArtifacts.map(({ temporaryPath, contents }) => fs.writeFile(temporaryPath, contents, 'utf8')),
    );
    for (const { filePath, temporaryPath } of temporaryArtifacts) await fs.rename(temporaryPath, filePath);
  } finally {
    await Promise.all(temporaryArtifacts.map(({ temporaryPath }) => fs.rm(temporaryPath, { force: true })));
  }
}

/**
 * Validate and merge every code mutation lane in a run-specific directory.
 * Relative report directories are resolved from the current working directory.
 */
export async function mergeMutationReports({
  reportDir = process.env.MUTATION_REPORT_DIR || defaultReportDirectory,
  writeHtml = true,
} = {}) {
  if (typeof reportDir !== 'string' || reportDir.length === 0) throw new Error('reportDir must be a non-empty string');
  if (typeof writeHtml !== 'boolean') throw new Error('writeHtml must be a boolean');
  await assertMutationLaneManifest({ serverDir: serverDirectory });
  const reportDirectory = path.resolve(reportDir);
  const reportsByLane = await readLaneReports(reportDirectory);
  const merged = mergeMutationReportData({
    reportsByLane,
    lanes: codeMutationLanes,
    laneNames: codeMutationLaneNames,
    expectedFiles: expectedCodeMutationFiles,
  });
  await assertReportsMatchWorkspace(reportsByLane);
  const jsonPath = path.join(reportDirectory, 'code.json');
  const summaryPath = path.join(reportDirectory, 'code-summary.json');
  const htmlPath = path.join(reportDirectory, 'code.html');
  const artifacts = [
    { filePath: jsonPath, contents: JSON.stringify(merged.report) },
    { filePath: summaryPath, contents: `${JSON.stringify(merged.summary, null, 2)}\n` },
  ];
  if (writeHtml) artifacts.push({ filePath: htmlPath, contents: await createMutationReportHtml(merged.report) });
  await writeArtifactsAtomically(artifacts);
  return {
    ...merged,
    paths: { json: jsonPath, summary: summaryPath, html: writeHtml ? htmlPath : undefined },
  };
}

function parseArguments(arguments_) {
  let reportDir = process.env.MUTATION_REPORT_DIR || defaultReportDirectory;
  let writeHtml = true;
  for (let index = 0; index < arguments_.length; index++) {
    const argument = arguments_[index];
    if (argument === '--report-dir') {
      const value = arguments_[++index];
      if (!value || value.startsWith('--')) throw new Error('--report-dir requires a directory path');
      reportDir = value;
    } else if (argument === '--no-html') {
      writeHtml = false;
    } else if (argument === '--help') {
      return { help: true };
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return { reportDir, writeHtml, help: false };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node scripts/merge-mutation-reports.mjs [--report-dir <directory>] [--no-html]\n');
    return;
  }
  const result = await mergeMutationReports(options);
  const score = result.summary.mutationScore;
  process.stdout.write(
    `Merged ${result.summary.mutantCount} mutants from ${result.summary.laneCount} lanes (${score === null ? 'n/a' : `${score.toFixed(2)}%`}).\n` +
      `JSON: ${result.paths.json}\nSummary: ${result.paths.summary}${result.paths.html ? `\nHTML: ${result.paths.html}` : ''}\n`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
