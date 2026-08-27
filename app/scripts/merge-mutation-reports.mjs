import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import {
  applyEquivalenceAllowlist,
  equivalentMutants,
  equivalentMutantSourceHashes,
} from './mutation-equivalents.mjs';
import {
  createMutationMergePolicyProvenance,
  mutationMergePolicyFiles,
  mutationMergePolicySchemaVersion,
} from './mutation-merge-policy.mjs';
import {
  assertMutationLaneManifest,
  duplicates,
  expectedMutationFiles,
  mutationLaneNames,
  mutationLanes,
} from './mutation-lanes.mjs';
import { assertMutationLaneProvenance } from './mutation-provenance.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const appDirectory = path.resolve(scriptsDirectory, '..');
const defaultReportDirectory = path.join(appDirectory, 'reports', 'mutation');
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

/**
 * The only statuses that count as a mutant having been judged on its merits.
 *
 * `Ignored` is deliberately absent. A `// Stryker disable` comment silences
 * every mutant from that line onward until a matching `restore`, and a restore
 * that fails to take effect is invisible — one such comment in login.tsx quietly
 * excluded 157 mutants while the campaign still reported a 100% score. Ignored
 * mutants therefore have to be explained just like survivors.
 */
export const resolvedStatuses = Object.freeze(['Killed', 'Timeout']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function assertMergePolicyProvenance(value) {
  if (
    !isRecord(value) ||
    value.schemaVersion !== mutationMergePolicySchemaVersion ||
    !Array.isArray(value.files) ||
    value.files.length === 0 ||
    value.files.some((fileName) => typeof fileName !== 'string' || fileName.length === 0) ||
    duplicates(value.files).length > 0 ||
    !isDeepStrictEqual(value.files, [...mutationMergePolicyFiles].toSorted()) ||
    typeof value.fingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(value.fingerprint)
  ) {
    throw new Error('Mutation merge policy provenance is invalid');
  }
}

function sortedDifference(first, second) {
  const secondSet = new Set(second);
  return first.filter((item) => !secondSet.has(item)).toSorted();
}

function assertExactKeys(actual, expected, label) {
  const duplicateActual = duplicates(actual);
  if (duplicateActual.length)
    throw new Error(`${label} has duplicate entries: ${duplicateActual.join(', ')}`);
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

export function assertMutant(mutant, label) {
  if (!isRecord(mutant)) throw new Error(`${label} must be an object`);
  if (typeof mutant.id !== 'string' || mutant.id.length === 0) {
    throw new Error(`${label}.id must be a non-empty string`);
  }
  if (typeof mutant.mutatorName !== 'string' || mutant.mutatorName.length === 0) {
    throw new Error(`${label}.mutatorName must be a non-empty string`);
  }
  if (!mutantStatusSet.has(mutant.status))
    throw new Error(`${label}.status is invalid: ${String(mutant.status)}`);
  assertLocation(mutant.location, `${label}.location`);
  if (mutant.coveredBy !== undefined) assertStringArray(mutant.coveredBy, `${label}.coveredBy`);
  if (mutant.killedBy !== undefined) assertStringArray(mutant.killedBy, `${label}.killedBy`);
  if (mutant.static !== undefined && typeof mutant.static !== 'boolean') {
    throw new Error(`${label}.static must be a boolean when present`);
  }
}

function assertTestDefinition(test, label) {
  if (!isRecord(test)) throw new Error(`${label} must be an object`);
  if (typeof test.id !== 'string' || test.id.length === 0)
    throw new Error(`${label}.id must be a non-empty string`);
  if (typeof test.name !== 'string' || test.name.length === 0) {
    throw new Error(`${label}.name must be a non-empty string`);
  }
  if (test.location !== undefined) assertLocation(test.location, `${label}.location`, true);
}

function assertReportShape(report, laneName, definition) {
  if (!isRecord(report))
    throw new Error(`Mutation report for lane ${laneName} must be a JSON object`);
  if (typeof report.schemaVersion !== 'string' || report.schemaVersion.length === 0) {
    throw new Error(`Mutation report for lane ${laneName} has no schemaVersion`);
  }
  if (!isRecord(report.thresholds) || typeof report.thresholds.high !== 'number') {
    throw new Error(`Mutation report for lane ${laneName} has invalid thresholds`);
  }
  if (!isRecord(report.files))
    throw new Error(`Mutation report for lane ${laneName} has no files object`);
  if (!isRecord(report.testFiles))
    throw new Error(`Mutation report for lane ${laneName} has no testFiles object`);

  assertExactKeys(
    Object.keys(report.files),
    [...definition.mutate],
    `Source files in lane ${laneName}`,
  );
  assertExactKeys(
    Object.keys(report.testFiles),
    [...definition.testFiles],
    `Test files in lane ${laneName}`,
  );

  for (const sourceFileName of definition.mutate) {
    const sourceFile = report.files[sourceFileName];
    if (!isRecord(sourceFile) || !Array.isArray(sourceFile.mutants)) {
      throw new Error(`Source file ${sourceFileName} in lane ${laneName} has no mutants array`);
    }
    if (typeof sourceFile.source !== 'string') {
      throw new Error(`Source file ${sourceFileName} in lane ${laneName} has no source text`);
    }
  }
  for (const testFileName of definition.testFiles) {
    const testFile = report.testFiles[testFileName];
    if (!isRecord(testFile) || !Array.isArray(testFile.tests)) {
      throw new Error(`Test file ${testFileName} in lane ${laneName} has no tests array`);
    }
    if (typeof testFile.source !== 'string') {
      throw new Error(`Test file ${testFileName} in lane ${laneName} has no source text`);
    }
  }
}

/**
 * Reports are reusable across partial runs only while the exact source and
 * owning test contents they exercised still match the workspace.
 */
export async function assertMutationReportInputsMatchWorkspace({
  reportsByLane,
  lanes,
  laneNames,
  appDir,
}) {
  for (const laneName of laneNames) {
    const definition = lanes[laneName];
    const report = reportsByLane[laneName];
    assertReportShape(report, laneName, definition);
    for (const fileName of definition.mutate) {
      const currentSource = await fs.readFile(path.join(appDir, fileName), 'utf8');
      if (report.files[fileName].source !== currentSource) {
        throw new Error(
          `Mutation report for lane ${laneName} is stale: source file ${fileName} changed; rerun that lane before merging`,
        );
      }
    }
    for (const testFileName of definition.testFiles) {
      const currentSource = await fs.readFile(path.join(appDir, testFileName), 'utf8');
      if (report.testFiles[testFileName].source !== currentSource) {
        throw new Error(
          `Mutation report for lane ${laneName} is stale: test file ${testFileName} changed; rerun every lane that owns that test before merging`,
        );
      }
    }
  }
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
  const unresolved = mutants.length - detected;
  const valid = detected + undetected;
  const covered = detected + statusCounts.Survived;
  return {
    mutantCount: mutants.length,
    staticMutants,
    dynamicMutants: mutants.length - staticMutants,
    statusCounts,
    strictMutationGatePassed: unresolved === 0,
    mutationScore: valid === 0 ? null : (detected / valid) * 100,
    mutationScoreBasedOnCoveredCode:
      valid === 0 ? null : covered === 0 ? 0 : (detected / covered) * 100,
  };
}

/** Whole source lines spanned by a mutant, retained as reviewable matching context. */
function mutantSourceText(source, location) {
  return String(source)
    .split('\n')
    .slice(location.start.line - 1, location.end.line)
    .join('\n')
    .trim();
}

/**
 * Collect every mutant the campaign left unresolved, tagged with the file and
 * its exact node location and the source text it replaced so the equivalence
 * allowlist can identify it without excusing a same-line sibling.
 */
function collectUnresolvedMutants(files) {
  const unresolved = [];
  for (const [fileName, file] of Object.entries(files)) {
    const sourceSha256 = createHash('sha256').update(String(file.source)).digest('hex');
    for (const mutant of file.mutants) {
      if (resolvedStatuses.includes(mutant.status)) continue;
      unresolved.push({
        file: fileName,
        status: mutant.status,
        mutatorName: mutant.mutatorName,
        replacement: mutant.replacement,
        original: mutantSourceText(file.source, mutant.location),
        sourceSha256,
        location: mutant.location,
        line: mutant.location.start.line,
      });
    }
  }
  return unresolved;
}

export function unresolvedStatusSummary(statusCounts) {
  return Object.entries(statusCounts)
    .filter(([status, count]) => !resolvedStatuses.includes(status) && count > 0)
    .map(([status, count]) => `${status}=${count}`)
    .join(', ');
}

/**
 * Merge already-parsed lane reports. The manifest arguments are injectable for
 * the focused fixture tests; normal callers use mergeMutationReports().
 */
export function mergeMutationReportData({
  reportsByLane,
  lanes,
  laneNames,
  expectedFiles,
  mergePolicy,
  equivalences = equivalentMutants,
  equivalenceSourceHashes = equivalences === equivalentMutants
    ? equivalentMutantSourceHashes
    : undefined,
}) {
  if (!isRecord(reportsByLane))
    throw new Error('reportsByLane must be an object keyed by lane name');
  if (
    !isRecord(lanes) ||
    !Array.isArray(laneNames) ||
    !Array.isArray(expectedFiles) ||
    laneNames.length === 0
  ) {
    throw new Error('Mutation lane manifest arguments are invalid');
  }
  assertMergePolicyProvenance(mergePolicy);
  assertExactKeys(Object.keys(lanes), laneNames, 'Mutation lane names');
  assertExactKeys(Object.keys(reportsByLane), laneNames, 'Mutation lane reports');
  assertExactKeys(
    laneNames.flatMap((laneName) => [...lanes[laneName].mutate]),
    [...expectedFiles],
    'Expected mutation source files',
  );

  const mergedFiles = new Map();
  const mergedTestFiles = new Map();
  const globalTests = new Map();
  const laneSummaries = [];
  let nextMutantId = 0;
  let nextTestId = 0;
  let firstReport;
  let firstLaneName;

  for (const laneName of laneNames) {
    const definition = lanes[laneName];
    const report = reportsByLane[laneName];
    assertReportShape(report, laneName, definition);
    if (firstReport === undefined) {
      firstReport = report;
      firstLaneName = laneName;
    } else {
      for (const field of ['schemaVersion', 'thresholds', 'projectRoot', 'framework']) {
        if (!isDeepStrictEqual(report[field], firstReport[field])) {
          throw new Error(
            `Mutation report metadata ${field} differs between lanes ${firstLaneName} and ${laneName}`,
          );
        }
      }
    }

    const localTestIds = new Map();
    for (const testFileName of definition.testFiles) {
      const testFile = report.testFiles[testFileName];
      let mergedTestFile = mergedTestFiles.get(testFileName);
      if (mergedTestFile === undefined) {
        mergedTestFile = { tests: [] };
        if (own(testFile, 'source')) mergedTestFile.source = testFile.source;
        mergedTestFiles.set(testFileName, mergedTestFile);
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
        const identity = JSON.stringify([testFileName, test.name, occurrence]);
        const existingTest = globalTests.get(identity);
        let globalId;
        if (existingTest === undefined) {
          globalId = String(nextTestId++);
          const mergedTest = { ...test, id: globalId };
          globalTests.set(identity, mergedTest);
          mergedTestFile.tests.push(mergedTest);
        } else {
          globalId = existingTest.id;
        }
        localTestIds.set(test.id, globalId);
      }
    }

    const laneMutants = [];
    const localMutantIds = new Set();
    for (const sourceFileName of definition.mutate) {
      if (mergedFiles.has(sourceFileName)) {
        throw new Error(
          `Source file ${sourceFileName} was reported by more than one mutation lane`,
        );
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
          mergedMutant.coveredBy = remapTestReferences(
            mutant.coveredBy,
            localTestIds,
            `${label}.coveredBy`,
          );
        }
        if (own(mutant, 'killedBy')) {
          mergedMutant.killedBy = remapTestReferences(
            mutant.killedBy,
            localTestIds,
            `${label}.killedBy`,
          );
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

  assertExactKeys([...mergedFiles.keys()], [...expectedFiles], 'Merged mutation source files');
  const orderedFiles = Object.fromEntries(
    expectedFiles.map((fileName) => [fileName, mergedFiles.get(fileName)]),
  );
  const orderedTestFileNames = [...mergedTestFiles.keys()].toSorted();
  const orderedTestFiles = Object.fromEntries(
    orderedTestFileNames.map((testFileName) => [testFileName, mergedTestFiles.get(testFileName)]),
  );
  const allMutants = Object.values(orderedFiles).flatMap((file) => file.mutants);
  const aggregate = summarizeMutants(allMutants);
  const { accepted, unexplained, staleEntries } = applyEquivalenceAllowlist(
    collectUnresolvedMutants(orderedFiles),
    equivalences,
    equivalenceSourceHashes,
  );
  const summary = {
    schemaVersion: 1,
    mergePolicy: {
      schemaVersion: mergePolicy.schemaVersion,
      files: [...mergePolicy.files],
      fingerprint: mergePolicy.fingerprint,
    },
    laneCount: laneNames.length,
    fileCount: expectedFiles.length,
    testFileCount: orderedTestFileNames.length,
    testCount: globalTests.size,
    ...aggregate,
    // Stryker's own gate ends at "was it killed". Ours also demands that every
    // surviving mutant be one somebody proved unkillable and wrote down, and
    // that no written-down exemption has outlived the code it excused.
    strictMutationGatePassed: unexplained.length === 0 && staleEntries.length === 0,
    acceptedEquivalents: accepted.length,
    unexplainedSurvivors: unexplained,
    staleEquivalenceEntries: staleEntries.map(({ file, mutator, original, matched, expected }) => ({
      file,
      mutator,
      original,
      matched,
      expected,
    })),
    thresholds: { ...firstReport.thresholds },
    lanes: laneSummaries,
  };
  const config = isRecord(firstReport.config)
    ? { ...firstReport.config, mutate: [...expectedFiles], mutationLanes: [...laneNames] }
    : undefined;
  if (config) {
    delete config.tempDirName;
    delete config.jsonReporter;
    delete config.htmlReporter;
  }
  const mergedReport = { ...firstReport, files: orderedFiles, testFiles: orderedTestFiles };
  if (config) mergedReport.config = config;
  else delete mergedReport.config;

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
    <title>App mutation report</title>
    <script>${scriptContent}</script>
  </head>
  <body>
    <mutation-test-report-app title-postfix="App">
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
  const missing = [];
  const reportsByLane = {};
  for (const laneName of mutationLaneNames) {
    const reportPath = path.join(reportDirectory, `${laneName}.json`);
    let source;
    try {
      source = await fs.readFile(reportPath, 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') {
        missing.push(`${laneName}.json`);
        continue;
      }
      throw error;
    }
    try {
      reportsByLane[laneName] = JSON.parse(source);
    } catch {
      throw new Error(`Mutation report for lane ${laneName} at ${reportPath} is not valid JSON`);
    }
  }
  if (missing.length) {
    throw new Error(
      `Cannot merge mutation reports; missing expected lane reports: ${missing.join(', ')}`,
    );
  }
  return reportsByLane;
}

async function writeArtifactsAtomically(artifacts) {
  const temporaryArtifacts = artifacts.map(({ filePath, contents }, index) => ({
    filePath,
    contents,
    temporaryPath: `${filePath}.tmp-${process.pid}-${index}`,
  }));
  try {
    await Promise.all(
      temporaryArtifacts.map(({ temporaryPath, contents }) =>
        fs.writeFile(temporaryPath, contents, 'utf8'),
      ),
    );
    for (const { filePath, temporaryPath } of temporaryArtifacts)
      await fs.rename(temporaryPath, filePath);
  } finally {
    await Promise.all(
      temporaryArtifacts.map(({ temporaryPath }) => fs.rm(temporaryPath, { force: true })),
    );
  }
}

/** Validate and merge every lane report in a run-specific directory. */
export async function mergeMutationReports({
  reportDir = process.env.MUTATION_REPORT_DIR || defaultReportDirectory,
  writeHtml = true,
  environment = process.env,
} = {}) {
  if (typeof reportDir !== 'string' || reportDir.length === 0)
    throw new Error('reportDir must be a non-empty string');
  await assertMutationLaneManifest({ appDir: appDirectory });
  const reportDirectory = path.resolve(reportDir);
  const reportsByLane = await readLaneReports(reportDirectory);
  await assertMutationLaneProvenance({
    reportDir: reportDirectory,
    appDir: appDirectory,
    lanes: mutationLanes,
    laneNames: mutationLaneNames,
    environment,
  });
  await assertMutationReportInputsMatchWorkspace({
    reportsByLane,
    lanes: mutationLanes,
    laneNames: mutationLaneNames,
    appDir: appDirectory,
  });
  const mergePolicy = await createMutationMergePolicyProvenance({ appDir: appDirectory });
  const merged = mergeMutationReportData({
    reportsByLane,
    lanes: mutationLanes,
    laneNames: mutationLaneNames,
    expectedFiles: expectedMutationFiles,
    mergePolicy,
  });
  const jsonPath = path.join(reportDirectory, 'app.json');
  const summaryPath = path.join(reportDirectory, 'app-summary.json');
  const htmlPath = path.join(reportDirectory, 'app.html');
  const artifacts = [
    { filePath: jsonPath, contents: JSON.stringify(merged.report) },
    { filePath: summaryPath, contents: `${JSON.stringify(merged.summary, null, 2)}\n` },
  ];
  if (writeHtml)
    artifacts.push({ filePath: htmlPath, contents: await createMutationReportHtml(merged.report) });
  await writeArtifactsAtomically(artifacts);
  return {
    ...merged,
    paths: { json: jsonPath, summary: summaryPath, html: writeHtml ? htmlPath : undefined },
  };
}

async function main() {
  const result = await mergeMutationReports();
  const score = result.summary.mutationScore;
  process.stdout.write(
    `Merged ${result.summary.mutantCount} mutants from ${result.summary.laneCount} lanes ` +
      `(${score === null ? 'n/a' : `${score.toFixed(2)}%`}).\n` +
      `JSON: ${result.paths.json}\nSummary: ${result.paths.summary}\nHTML: ${result.paths.html}\n`,
  );
  if (!result.summary.strictMutationGatePassed) {
    process.stderr.write(
      `App mutation strict gate failed: ${unresolvedStatusSummary(result.summary.statusCounts)}\n`,
    );
    for (const survivor of result.summary.unexplainedSurvivors) {
      process.stderr.write(
        `  ${survivor.status} ${survivor.file}:${survivor.line} [${survivor.mutatorName}] ${survivor.original.split('\n')[0]}\n`,
      );
    }
    for (const entry of result.summary.staleEquivalenceEntries) {
      // Over-matching (matched > expected) means a previously killed mutant now
      // survives behind an existing exemption — the dangerous case — so the
      // label must not claim "matched nothing" when it did.
      const matchDetail =
        entry.matched === 0
          ? 'matched nothing'
          : `matched ${entry.matched} of expected ${entry.expected}`;
      process.stderr.write(
        `  stale equivalence entry (${matchDetail}): ${entry.file} [${entry.mutator}] ${entry.original.split('\n')[0]}\n`,
      );
    }
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
