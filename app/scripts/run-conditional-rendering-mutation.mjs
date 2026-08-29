import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import conditionalRenderingCore from './conditional-rendering-core.cjs';
import { assertMutationLaneManifest, mutationLaneNames, mutationLanes } from './mutation-lanes.mjs';

const { FORCE_ENV, SITE_ENV, discoverConditionalRenderingSites } = conditionalRenderingCore;

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultAppDirectory = path.resolve(scriptsDirectory, '..');
const defaultReportDirectory = path.join(
  defaultAppDirectory,
  'reports',
  'mutation',
  'conditional-rendering',
);
const jestConfigPath = path.join(scriptsDirectory, 'conditional-rendering.jest.config.cjs');
const reportSchemaVersion = 1;
const maximumConcurrency = 8;
const maximumDeadlineMs = 15 * 60_000;
const campaignLockFileName = '.mutation-campaign.lock';
const campaignToolInputFiles = Object.freeze([
  'app.config.ts',
  'app.json',
  'package.json',
  'package-lock.json',
  'scripts/conditional-rendering-core.cjs',
  'scripts/conditional-rendering-transformer.cjs',
  'scripts/conditional-rendering.jest.config.cjs',
  'scripts/mutation-lanes.mjs',
  'scripts/run-conditional-rendering-mutation.mjs',
  'tsconfig.json',
]);
const campaignToolPackages = Object.freeze([
  '@babel/core',
  '@babel/parser',
  '@babel/traverse',
  '@stryker-mutator/instrumenter',
  'babel-jest',
  'jest',
  'jest-expo',
  'typescript',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function uniqueSorted(values) {
  return [...new Set(values)].toSorted();
}

function normalizeAppPath(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty app-relative path`);
  }
  if (path.isAbsolute(value)) {
    throw new Error(`${label} must be relative to the app directory: ${value}`);
  }
  const normalized = path.posix.normalize(value.replaceAll('\\', '/'));
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error(`${label} must stay inside the app directory: ${value}`);
  }
  return normalized;
}

function parseBoundedInteger(value, label, { fallback, minimum = 1, maximum }) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    (maximum !== undefined && parsed > maximum)
  ) {
    const bound =
      maximum === undefined ? `at least ${minimum}` : `between ${minimum} and ${maximum}`;
    throw new Error(`${label} must be an integer ${bound} (received ${JSON.stringify(value)})`);
  }
  return parsed;
}

export function resolveReportDirectory(value, appDir = defaultAppDirectory) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('report directory must be a non-empty path');
  }
  const resolvedAppDir = path.resolve(appDir);
  const resolved = path.resolve(resolvedAppDir, value);
  const relativeToApp = path.relative(resolvedAppDir, resolved);
  const insideApp = relativeToApp !== '..' && !relativeToApp.startsWith(`..${path.sep}`);
  if (insideApp) {
    const normalized = relativeToApp.split(path.sep).join('/');
    if (normalized !== 'reports' && !normalized.startsWith('reports/')) {
      throw new Error(
        'A report directory inside the app must be reports/ or one of its descendants',
      );
    }
  }
  return resolved;
}

function optionValue(argv, index, inlineValue, name) {
  if (inlineValue !== undefined) return { value: inlineValue, nextIndex: index };
  if (index + 1 >= argv.length || argv[index + 1].startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return { value: argv[index + 1], nextIndex: index + 1 };
}

export function parseCliArgs(
  argv,
  { appDir = defaultAppDirectory, environment = process.env } = {},
) {
  const lanes = [];
  const files = [];
  const sites = [];
  let concurrency = environment.CONDITIONAL_RENDER_CONCURRENCY;
  let deadlineMs = environment.CONDITIONAL_RENDER_DEADLINE_MS;
  let reportDirectory = environment.CONDITIONAL_RENDER_REPORT_DIR || defaultReportDirectory;
  let list = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${argument}`);
    }
    const equalsIndex = argument.indexOf('=');
    const name = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);

    if (name === '--list' || name === '--help') {
      if (inlineValue !== undefined) throw new Error(`${name} does not take a value`);
      if (name === '--list') list = true;
      if (name === '--help') help = true;
      continue;
    }

    const { value, nextIndex } = optionValue(argv, index, inlineValue, name);
    index = nextIndex;
    switch (name) {
      case '--lane':
        lanes.push(value);
        break;
      case '--file':
        files.push(normalizeAppPath(value, '--file'));
        break;
      case '--site':
        if (value.length === 0) throw new Error('--site must not be empty');
        sites.push(value);
        break;
      case '--concurrency':
        concurrency = value;
        break;
      case '--deadline-ms':
        deadlineMs = value;
        break;
      case '--report-dir':
        reportDirectory = value;
        break;
      default:
        throw new Error(`Unknown option: ${name}`);
    }
  }

  return {
    appDir: path.resolve(appDir),
    concurrency: parseBoundedInteger(concurrency, '--concurrency', {
      fallback: 2,
      maximum: maximumConcurrency,
    }),
    deadlineMs: parseBoundedInteger(deadlineMs, '--deadline-ms', {
      fallback: 120_000,
      minimum: 1_000,
      maximum: maximumDeadlineMs,
    }),
    reportDir: resolveReportDirectory(reportDirectory, appDir),
    filters: {
      lanes: uniqueSorted(lanes),
      files: uniqueSorted(files),
      sites: uniqueSorted(sites),
    },
    list,
    help,
  };
}

export function usage() {
  return `Usage: node scripts/run-conditional-rendering-mutation.mjs [options]

Runs the owning Jest tests once as a baseline, then in a fresh --runInBand
process with every discovered render predicate forced to true and false.

Options:
  --lane NAME          Select a mutation lane (repeatable)
  --file APP_PATH      Select a mutable .tsx source file (repeatable)
  --site SITE_ID       Select an exact discovered site ID (repeatable)
  --concurrency N      Run 1-${maximumConcurrency} Jest subprocesses (default: 2)
  --deadline-ms N      Per-process deadline, 1000-${maximumDeadlineMs} ms
  --report-dir PATH    Output directory (default: reports/mutation/conditional-rendering)
  --list               Print selected sites without running Jest
  --help               Show this help

Filters are intersected when more than one kind is supplied.`;
}

function sourceOwnership(lanes) {
  const ownership = new Map();
  for (const [laneName, lane] of Object.entries(lanes)) {
    for (const sourceFile of lane.mutate) {
      if (!sourceFile.endsWith('.tsx')) continue;
      if (ownership.has(sourceFile)) {
        throw new Error(
          `${sourceFile} belongs to both ${ownership.get(sourceFile).laneName} and ${laneName}`,
        );
      }
      ownership.set(sourceFile, {
        laneName,
        testFiles: [...lane.testFiles],
      });
    }
  }
  return ownership;
}

export async function discoverCampaignSites({
  appDir = defaultAppDirectory,
  lanes = mutationLanes,
} = {}) {
  const ownership = sourceOwnership(lanes);
  const discovered = [];
  for (const sourceFile of [...ownership.keys()].toSorted()) {
    const source = await fs.readFile(path.join(appDir, sourceFile), 'utf8');
    const owner = ownership.get(sourceFile);
    for (const site of discoverConditionalRenderingSites(source, {
      relativeFile: sourceFile,
      filename: path.join(appDir, sourceFile),
    })) {
      discovered.push({
        ...site,
        laneName: owner.laneName,
        testFiles: [...owner.testFiles],
      });
    }
  }

  discovered.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.predicateLocation.start.offset - right.predicateLocation.start.offset,
  );
  const ids = discovered.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('Conditional-rendering site IDs are not globally unique');
  }
  return discovered;
}

export function selectCampaignSites(allSites, filters, lanes = mutationLanes) {
  for (const laneName of filters.lanes) {
    if (!Object.hasOwn(lanes, laneName)) {
      throw new Error(
        `Unknown --lane ${JSON.stringify(laneName)}; expected one of ${mutationLaneNames.join(', ')}`,
      );
    }
  }

  const knownFiles = new Set(allSites.map(({ file }) => file));
  for (const sourceFile of filters.files) {
    if (!knownFiles.has(sourceFile)) {
      throw new Error(
        `--file ${JSON.stringify(sourceFile)} has no discovered conditional-rendering site`,
      );
    }
  }

  const knownSites = new Set(allSites.map(({ id }) => id));
  for (const id of filters.sites) {
    if (!knownSites.has(id)) throw new Error(`Unknown --site ${JSON.stringify(id)}`);
  }

  const laneFilter = new Set(filters.lanes);
  const fileFilter = new Set(filters.files);
  const siteFilter = new Set(filters.sites);
  const selected = allSites.filter(
    (site) =>
      (laneFilter.size === 0 || laneFilter.has(site.laneName)) &&
      (fileFilter.size === 0 || fileFilter.has(site.file)) &&
      (siteFilter.size === 0 || siteFilter.has(site.id)),
  );
  if (selected.length === 0) {
    throw new Error('The requested filters intersect to zero conditional-rendering sites');
  }
  return selected;
}

function canonicalExecutionIdentity(environment = process.env) {
  const value = (name) => {
    const candidate = environment[name];
    return candidate === undefined ? null : String(candidate);
  };
  return {
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    environment: {
      CI: value('CI'),
      EXPO_PUBLIC_API_URL: value('EXPO_PUBLIC_API_URL'),
      LANG: value('LANG'),
      LC_ALL: value('LC_ALL'),
      NODE_OPTIONS: value('NODE_OPTIONS'),
      TZ: value('TZ'),
    },
  };
}

async function readCampaignToolVersions(appDir) {
  const versions = {};
  for (const packageName of campaignToolPackages) {
    const packagePath = path.join(
      appDir,
      'node_modules',
      ...packageName.split('/'),
      'package.json',
    );
    const manifest = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
      throw new Error(`Installed mutation tool ${packageName} has no version`);
    }
    versions[packageName] = manifest.version;
  }
  return versions;
}

export async function createInputSnapshot({
  appDir,
  sites,
  lanes = mutationLanes,
  environment = process.env,
}) {
  const selectedSourceFiles = uniqueSorted(sites.map(({ file }) => file));
  const productionFiles = uniqueSorted(Object.values(lanes).flatMap(({ mutate }) => mutate));
  const testFiles = uniqueSorted(sites.flatMap(({ testFiles }) => testFiles));
  const execution = canonicalExecutionIdentity(environment);
  const toolVersions = await readCampaignToolVersions(appDir);
  const entries = [];
  const aggregate = createHash('sha256');
  aggregate.update(`${JSON.stringify({ execution, toolVersions })}\n`);
  for (const [kind, relativeFiles] of [
    ['tooling', campaignToolInputFiles],
    ['production', productionFiles],
    ['owningTest', testFiles],
  ]) {
    for (const relativeFile of uniqueSorted(relativeFiles)) {
      const contents = await fs.readFile(path.join(appDir, relativeFile));
      const digest = sha256(contents);
      entries.push({
        kind,
        path: relativeFile,
        bytes: contents.byteLength,
        sha256: digest,
      });
      aggregate.update(`${kind}\0${relativeFile}\0${contents.byteLength}\0`);
      aggregate.update(contents);
      aggregate.update('\0');
    }
  }
  return {
    fingerprint: aggregate.digest('hex'),
    selectedSourceFiles,
    productionFiles,
    testFiles,
    execution,
    toolVersions,
    files: entries,
  };
}

function appendTail(current, chunk, maximumBytes = 64 * 1024) {
  const next = current + chunk.toString('utf8');
  if (Buffer.byteLength(next) <= maximumBytes) return next;
  return Buffer.from(next).subarray(-maximumBytes).toString('utf8');
}

async function readJestReport(outputFile) {
  try {
    const text = await fs.readFile(outputFile, 'utf8');
    try {
      return { report: JSON.parse(text), reportError: null };
    } catch (error) {
      return { report: null, reportError: `Jest JSON is malformed: ${error.message}` };
    }
  } catch (error) {
    return {
      report: null,
      reportError:
        error?.code === 'ENOENT'
          ? 'Jest did not write its JSON result file'
          : `Could not read Jest JSON: ${error.message}`,
    };
  }
}

export async function executeJestSubprocess({
  appDir,
  testFiles,
  siteId = null,
  force = null,
  deadlineMs,
  outputFile,
}) {
  const jestEntrypoint = path.join(appDir, 'node_modules', 'jest', 'bin', 'jest.js');
  const args = [
    jestEntrypoint,
    '--config',
    jestConfigPath,
    '--runInBand',
    '--ci',
    '--coverage=false',
    '--watch=false',
    '--cacheDirectory',
    path.join(path.dirname(outputFile), 'jest-cache'),
    '--json',
    '--outputFile',
    outputFile,
    '--runTestsByPath',
    ...testFiles,
  ];
  const environment = {
    ...process.env,
    CONDITIONAL_RENDER_PROJECT_ROOT: appDir,
    NODE_ENV: 'test',
  };
  delete environment[SITE_ENV];
  delete environment[FORCE_ENV];
  if (siteId !== null) {
    environment[SITE_ENV] = siteId;
    environment[FORCE_ENV] = force ? 'true' : 'false';
  }

  const startedAt = Date.now();
  let child;
  try {
    child = spawn(process.execPath, args, {
      cwd: appDir,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    return {
      exitCode: null,
      signal: null,
      timedOut: false,
      durationMs: Date.now() - startedAt,
      stdoutTail: '',
      stderrTail: '',
      report: null,
      reportError: `Could not spawn Jest: ${error.message}`,
    };
  }

  let stdoutTail = '';
  let stderrTail = '';
  let timedOut = false;
  let spawnError = null;
  child.stdout.on('data', (chunk) => {
    stdoutTail = appendTail(stdoutTail, chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderrTail = appendTail(stderrTail, chunk);
  });

  const completion = new Promise((resolve) => {
    child.once('error', (error) => {
      spawnError = error;
    });
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  });
  const deadline = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, deadlineMs);
  const { exitCode, signal } = await completion;
  clearTimeout(deadline);

  const parsed = await readJestReport(outputFile);
  return {
    exitCode,
    signal,
    timedOut,
    durationMs: Date.now() - startedAt,
    stdoutTail,
    stderrTail,
    report: parsed.report,
    reportError:
      spawnError === null ? parsed.reportError : `Jest process error: ${spawnError.message}`,
  };
}

function integerField(report, name) {
  if (!Number.isInteger(report[name]) || report[name] < 0) {
    throw new Error(`Jest JSON field ${name} must be a non-negative integer`);
  }
  return report[name];
}

function inspectJestReport(report, expectedTestFiles, appDir) {
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Jest JSON must be an object');
  }
  if (!Array.isArray(report.testResults)) {
    throw new Error('Jest JSON testResults must be an array');
  }
  if (typeof report.success !== 'boolean') {
    throw new Error('Jest JSON success must be boolean');
  }
  const counts = {
    failedSuites: integerField(report, 'numFailedTestSuites'),
    failedTests: integerField(report, 'numFailedTests'),
    passedSuites: integerField(report, 'numPassedTestSuites'),
    passedTests: integerField(report, 'numPassedTests'),
    runtimeErrorSuites: integerField(report, 'numRuntimeErrorTestSuites'),
    totalSuites: integerField(report, 'numTotalTestSuites'),
    totalTests: integerField(report, 'numTotalTests'),
  };
  if (counts.totalTests < 1 || counts.totalSuites < 1) {
    throw new Error('Jest ran no tests or no test suites');
  }
  if (counts.totalSuites !== report.testResults.length) {
    throw new Error('Jest suite totals do not match testResults');
  }

  const expectedNames = expectedTestFiles
    .map((relativeFile) => path.resolve(appDir, relativeFile))
    .toSorted();
  const actualNames = report.testResults
    .map((result) => {
      if (!result || typeof result !== 'object' || typeof result.name !== 'string') {
        throw new Error('Jest JSON contains a test result without a name');
      }
      if (!Array.isArray(result.assertionResults)) {
        throw new Error(`Jest JSON suite ${result.name} has no assertionResults array`);
      }
      return path.resolve(result.name);
    })
    .toSorted();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error('Jest did not execute exactly the requested owning test files');
  }

  const assertions = report.testResults.flatMap((result) =>
    result.assertionResults.map((assertion) => ({ ...assertion, suite: result.name })),
  );
  if (assertions.length !== counts.totalTests) {
    throw new Error('Jest test totals do not match assertionResults');
  }
  const failedAssertions = assertions.filter(({ status }) => status === 'failed');
  if (failedAssertions.length !== counts.failedTests) {
    throw new Error('Jest failure totals do not match failed assertionResults');
  }

  const runtimeSuiteNames = report.testResults
    .filter((result) => {
      const executionError = result.testExecError;
      const hasExecutionError =
        executionError !== undefined &&
        executionError !== null &&
        (typeof executionError !== 'object' || Object.keys(executionError).length > 0);
      return (
        hasExecutionError ||
        (result.status === 'failed' &&
          !result.assertionResults.some(({ status }) => status === 'failed'))
      );
    })
    .map(({ name }) => name);
  const timeoutAssertions = failedAssertions.filter((assertion) =>
    (assertion.failureMessages || []).some((message) =>
      /Exceeded timeout of .* for a test|Async callback was not invoked within the .* timeout|test timed out after/i.test(
        String(message),
      ),
    ),
  );
  return {
    counts,
    failedAssertions,
    runtimeSuiteNames,
    timeoutAssertions,
    wasInterrupted: report.wasInterrupted === true,
  };
}

export function classifyJestRun(run, { expectedTestFiles, appDir }) {
  if (run.timedOut) {
    return { status: 'Timeout', reason: 'Jest exceeded the subprocess deadline' };
  }
  if (run.signal) {
    return {
      status: 'Error',
      reason: `Jest exited from signal ${run.signal}`,
    };
  }
  if (run.reportError) {
    return { status: 'Error', reason: run.reportError };
  }

  let inspection;
  try {
    inspection = inspectJestReport(run.report, expectedTestFiles, appDir);
  } catch (error) {
    return { status: 'Error', reason: `Invalid Jest result: ${error.message}` };
  }

  if (inspection.wasInterrupted) {
    return { status: 'Error', reason: 'Jest reported an interrupted run' };
  }
  if (inspection.timeoutAssertions.length > 0) {
    return {
      status: 'Timeout',
      reason: 'At least one Jest test exceeded its own timeout',
    };
  }
  if (inspection.counts.runtimeErrorSuites > 0 || inspection.runtimeSuiteNames.length > 0) {
    return {
      status: 'Error',
      reason: 'Jest reported a runtime test-suite failure',
    };
  }

  const failedTestNames = inspection.failedAssertions.map((assertion) =>
    Array.isArray(assertion.ancestorTitles)
      ? [...assertion.ancestorTitles, assertion.title].filter(Boolean).join(' > ')
      : assertion.title || '(unnamed test)',
  );
  if (run.exitCode === 0) {
    if (
      run.report.success &&
      inspection.counts.failedSuites === 0 &&
      inspection.counts.failedTests === 0
    ) {
      return {
        status: 'Survived',
        reason: 'All owning assertions passed',
        failedTestNames,
      };
    }
    return {
      status: 'Error',
      reason: 'Jest exited successfully but its JSON result reports failures',
    };
  }
  if (
    Number.isInteger(run.exitCode) &&
    run.exitCode > 0 &&
    !run.report.success &&
    inspection.counts.failedTests > 0 &&
    inspection.counts.failedSuites > 0
  ) {
    return {
      status: 'Killed',
      reason: 'An owning test assertion failed',
      failedTestNames,
    };
  }
  return {
    status: 'Error',
    reason: `Jest exited with code ${String(run.exitCode)} without an assertion failure`,
  };
}

function diagnosticsFor(run, classification) {
  if (classification.status !== 'Error' && classification.status !== 'Timeout') {
    return null;
  }
  return {
    stdoutTail: run.stdoutTail,
    stderrTail: run.stderrTail,
  };
}

async function runOneMutation({ job, appDir, deadlineMs, temporaryDirectory, executeJest }) {
  const outputFile = path.join(temporaryDirectory, `mutation-${job.index}.json`);
  let run;
  try {
    run = await executeJest({
      appDir,
      testFiles: job.site.testFiles,
      siteId: job.site.id,
      force: job.force,
      deadlineMs,
      outputFile,
    });
  } catch (error) {
    run = {
      exitCode: null,
      signal: null,
      timedOut: false,
      durationMs: 0,
      stdoutTail: '',
      stderrTail: '',
      report: null,
      reportError: `Jest executor threw: ${error.message}`,
    };
  }
  const classification = classifyJestRun(run, {
    expectedTestFiles: job.site.testFiles,
    appDir,
  });
  return {
    mutationId: `${job.site.id}:${job.force ? 'true' : 'false'}`,
    siteId: job.site.id,
    forcedValue: job.force,
    status: classification.status,
    reason: classification.reason,
    failedTestNames: classification.failedTestNames || [],
    durationMs: run.durationMs,
    process: {
      exitCode: run.exitCode,
      signal: run.signal,
    },
    diagnostics: diagnosticsFor(run, classification),
  };
}

function countStatuses(results) {
  const counts = { Killed: 0, Survived: 0, Error: 0, Timeout: 0 };
  for (const { status } of results) {
    if (!Object.hasOwn(counts, status)) {
      throw new Error(`Unknown mutation result status: ${status}`);
    }
    counts[status] += 1;
  }
  return counts;
}

function stripAnsi(value) {
  return String(value).replaceAll(/\u001b\[[0-9;]*m/g, '');
}

function markdownCell(value) {
  return stripAnsi(value).replaceAll('|', '\\|').replaceAll(/\s+/g, ' ').trim();
}

export function assertCampaignReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Campaign report must be an object');
  }
  if (report.schemaVersion !== reportSchemaVersion) {
    throw new Error(`Campaign report schemaVersion must be ${reportSchemaVersion}`);
  }
  if (!Array.isArray(report.sites) || !Array.isArray(report.results)) {
    throw new Error('Campaign report sites and results must be arrays');
  }
  const siteIds = report.sites.map(({ id }) => id);
  if (siteIds.some((id) => typeof id !== 'string') || new Set(siteIds).size !== siteIds.length) {
    throw new Error('Campaign report site IDs must be unique strings');
  }
  if (report.expectedMutationCount !== siteIds.length * 2) {
    throw new Error('Campaign report must expect exactly two forced mutants per site');
  }
  if (
    !report.discovery ||
    report.discovery.selectedSites !== siteIds.length ||
    report.discovery.forcedMutantsPerSite !== 2 ||
    !Number.isInteger(report.discovery.totalSites) ||
    report.discovery.totalSites < siteIds.length
  ) {
    throw new Error('Campaign report discovery totals are inconsistent');
  }
  if (!report.baseline || !['Passed', 'Error', 'Timeout'].includes(report.baseline.status)) {
    throw new Error('Campaign report baseline status is invalid');
  }
  const resultIds = report.results.map(({ mutationId }) => mutationId);
  if (
    resultIds.some((id) => typeof id !== 'string') ||
    new Set(resultIds).size !== resultIds.length
  ) {
    throw new Error('Campaign report mutation IDs must be unique strings');
  }
  const expectedResultIds = siteIds.flatMap((id) => [`${id}:true`, `${id}:false`]).toSorted();
  const expectedResultIdSet = new Set(expectedResultIds);
  for (const result of report.results) {
    if (!siteIds.includes(result.siteId)) {
      throw new Error(`Mutation result references unknown site ${result.siteId}`);
    }
    if (!['Killed', 'Survived', 'Error', 'Timeout'].includes(result.status)) {
      throw new Error(`Mutation result has invalid status ${result.status}`);
    }
    if (typeof result.forcedValue !== 'boolean') {
      throw new Error(`Mutation result ${result.mutationId} has no boolean forcedValue`);
    }
    const canonicalMutationId = `${result.siteId}:${String(result.forcedValue)}`;
    if (result.mutationId !== canonicalMutationId || !expectedResultIdSet.has(result.mutationId)) {
      throw new Error(`Mutation result ID is inconsistent: ${result.mutationId}`);
    }
  }
  if (report.results.length > report.expectedMutationCount) {
    throw new Error('Campaign report contains more mutation results than expected');
  }
  if (
    report.results.length === report.expectedMutationCount &&
    JSON.stringify([...resultIds].toSorted()) !== JSON.stringify(expectedResultIds)
  ) {
    throw new Error('Campaign report does not contain both forced values for every site');
  }
  const expectedCounts = countStatuses(report.results);
  if (JSON.stringify(expectedCounts) !== JSON.stringify(report.summary.statuses)) {
    throw new Error('Campaign report status totals do not match its results');
  }
  if (report.summary.completedMutationCount !== report.results.length) {
    throw new Error('Campaign report completed mutation total is inconsistent');
  }
  if (
    !report.provenance ||
    !report.provenance.before ||
    typeof report.provenance.before.fingerprint !== 'string' ||
    (report.provenance.after !== null &&
      typeof report.provenance.after?.fingerprint !== 'string') ||
    typeof report.provenance.inputsUnchanged !== 'boolean'
  ) {
    throw new Error('Campaign report provenance is invalid');
  }
  const strictPass =
    report.baseline.status === 'Passed' &&
    report.results.length === report.expectedMutationCount &&
    report.results.every(({ status }) => status === 'Killed') &&
    report.provenance.inputsUnchanged;
  if (report.passed !== strictPass) {
    throw new Error('Campaign report passed flag violates the strict all-killed policy');
  }
  return report;
}

export function renderCampaignMarkdown(report) {
  assertCampaignReport(report);
  const lines = [
    '# Conditional Rendering Mutant Campaign',
    '',
    `- Result: **${report.passed ? 'PASS' : 'FAIL'}**`,
    `- Baseline: **${report.baseline.status}**`,
    `- Discovered sites: ${report.discovery.totalSites}`,
    `- Selected sites: ${report.sites.length}`,
    `- Expected forced mutants: ${report.expectedMutationCount}`,
    `- Completed forced mutants: ${report.results.length}`,
    `- Killed: ${report.summary.statuses.Killed}`,
    `- Survived: ${report.summary.statuses.Survived}`,
    `- Error: ${report.summary.statuses.Error}`,
    `- Timeout: ${report.summary.statuses.Timeout}`,
    `- Inputs unchanged: ${report.provenance.inputsUnchanged ? 'yes' : 'no'}`,
    `- Duration: ${report.durationMs} ms`,
    '',
    'A strict pass requires a clean baseline, both forced values killed at every selected site, and identical before/after fingerprints for all production sources, owning tests, campaign tooling, installed tool versions, runtime, and relevant environment.',
    '',
    '## Input provenance',
    '',
    `- Before: \`${report.provenance.before.fingerprint}\``,
    `- After: \`${report.provenance.after?.fingerprint || 'unavailable'}\``,
    '',
    '## Sites and results',
    '',
    '| Site | Predicate location | Lane | Predicate | true | false |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  const resultsByMutationId = new Map(report.results.map((result) => [result.mutationId, result]));
  for (const site of report.sites) {
    const trueResult = resultsByMutationId.get(`${site.id}:true`);
    const falseResult = resultsByMutationId.get(`${site.id}:false`);
    const location = `${site.file}:${site.predicateLocation.start.line}:${site.predicateLocation.start.column}`;
    lines.push(
      `| ${markdownCell(site.id)} | ${markdownCell(location)} | ${markdownCell(site.laneName)} | \`${markdownCell(site.predicateSource)}\` | ${trueResult?.status || 'Not run'} | ${falseResult?.status || 'Not run'} |`,
    );
  }

  const exceptional = report.results.filter(
    ({ status }) => status === 'Survived' || status === 'Error' || status === 'Timeout',
  );
  if (report.baseline.status !== 'Passed' || exceptional.length > 0) {
    lines.push('', '## Failures requiring attention', '');
    if (report.baseline.status !== 'Passed') {
      lines.push(`- Baseline: ${markdownCell(report.baseline.reason)}`);
    }
    for (const result of exceptional) {
      lines.push(
        `- ${markdownCell(result.mutationId)} — **${result.status}**: ${markdownCell(result.reason)}`,
      );
    }
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function writeFileAtomically(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  try {
    await fs.writeFile(temporaryPath, contents, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

export async function writeCampaignReports({ reportDir, report }) {
  assertCampaignReport(report);
  const jsonPath = path.join(reportDir, 'conditional-rendering.json');
  const markdownPath = path.join(reportDir, 'conditional-rendering.md');
  try {
    // JSON is the commit marker: never publish it before the human-readable
    // companion report has completed successfully.
    await writeFileAtomically(markdownPath, renderCampaignMarkdown(report));
    await writeFileAtomically(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    await Promise.all([fs.rm(jsonPath, { force: true }), fs.rm(markdownPath, { force: true })]);
    throw error;
  }
  return { jsonPath, markdownPath };
}

async function removeCampaignReports(reportDir) {
  await fs.mkdir(reportDir, { recursive: true });
  await Promise.all([
    fs.rm(path.join(reportDir, 'conditional-rendering.json'), { force: true }),
    fs.rm(path.join(reportDir, 'conditional-rendering.md'), { force: true }),
  ]);
}

async function readCampaignLock(lockPath) {
  let owner;
  try {
    owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw error;
    throw new Error(
      `Mutation campaign lock ${lockPath} is invalid; confirm no mutation process is active before removing it manually`,
    );
  }
  if (
    owner === null ||
    typeof owner !== 'object' ||
    !Number.isInteger(owner.pid) ||
    owner.pid < 1 ||
    typeof owner.token !== 'string' ||
    owner.token.length === 0
  ) {
    throw new Error(
      `Mutation campaign lock ${lockPath} is invalid; confirm no mutation process is active before removing it manually`,
    );
  }
  return owner;
}

export async function acquireCampaignLock(appDir, reportDir) {
  const lockPath = path.join(appDir, campaignLockFileName);
  const token = randomUUID();
  let handle;
  try {
    handle = await fs.open(lockPath, 'wx');
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    const owner = await readCampaignLock(lockPath);
    throw new Error(
      `Another mutation campaign (pid ${owner.pid}, campaign ${owner.campaign ?? 'unknown'}, ` +
        `report directory ${owner.reportDir ?? 'unknown'}) already owns ${lockPath}. ` +
        'Verify that neither its parent nor any Jest/Stryker child is alive before removing the lock manually.',
    );
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({
        pid: process.pid,
        token,
        campaign: 'conditional-rendering',
        startedAt: new Date().toISOString(),
        reportDir: path.resolve(reportDir),
      })}\n`,
      'utf8',
    );
  } catch (error) {
    await handle.close();
    await fs.rm(lockPath, { force: true });
    throw error;
  }

  let released = false;
  return async (options = {}) => {
    if (released) return;
    released = true;
    await handle.close();
    if (options.preserve === true) {
      // A signal-ended campaign may leave orphaned Jest children mutating the
      // workspace. Keep the lock for manual verification before removal.
      console.error(
        `Mutation campaign stopped by signal: preserving ${campaignLockFileName} ` +
          '(verify no orphaned Jest child is alive, then remove it manually).',
      );
      return;
    }
    let owner;
    try {
      owner = await readCampaignLock(lockPath);
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      // An invalid lock must fail loudly: silently reporting successful cleanup
      // would hide a wedged/foreign lock file.
      throw error;
    }
    if (owner.token === token) await fs.rm(lockPath, { force: true });
  };
}

async function runMutationsWithConcurrency({
  jobs,
  concurrency,
  appDir,
  deadlineMs,
  temporaryDirectory,
  executeJest,
  log,
}) {
  const results = new Array(jobs.length);
  let nextIndex = 0;
  let completed = 0;
  async function worker() {
    for (;;) {
      const jobIndex = nextIndex;
      nextIndex += 1;
      if (jobIndex >= jobs.length) return;
      const result = await runOneMutation({
        job: jobs[jobIndex],
        appDir,
        deadlineMs,
        temporaryDirectory,
        executeJest,
      });
      results[jobIndex] = result;
      completed += 1;
      log(
        `[${completed}/${jobs.length}] ${result.status} ${result.siteId} => ${String(result.forcedValue)}`,
      );
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker()));
  return results;
}

export async function runConditionalRenderingCampaign({
  appDir = defaultAppDirectory,
  reportDir = defaultReportDirectory,
  filters = { lanes: [], files: [], sites: [] },
  concurrency = 2,
  deadlineMs = 120_000,
  validateManifest = assertMutationLaneManifest,
  lanes = mutationLanes,
  executeJest = executeJestSubprocess,
  log = console.log,
} = {}) {
  const startedAt = Date.now();
  const releaseCampaignLock = await acquireCampaignLock(appDir, reportDir);
  // Hoisted so the signal-preservation decision in finally can read it.
  let stopSignalSeen = false;
  try {
    await removeCampaignReports(reportDir);
    await validateManifest({ appDir });
    const allSites = await discoverCampaignSites({ appDir, lanes });
    const sites = selectCampaignSites(allSites, filters, lanes);
    const before = await createInputSnapshot({ appDir, sites, lanes });
    const expectedMutationCount = sites.length * 2;
    const temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'conditional-rendering-mutants-'),
    );
    let baseline;
    let results = [];
    let after = null;
    let afterError = null;
    try {
      log(
        `Running baseline across ${before.testFiles.length} owning test files for ${sites.length} sites...`,
      );
      let baselineRun;
      try {
        baselineRun = await executeJest({
          appDir,
          testFiles: before.testFiles,
          deadlineMs,
          outputFile: path.join(temporaryDirectory, 'baseline.json'),
        });
      } catch (error) {
        baselineRun = {
          exitCode: null,
          signal: null,
          timedOut: false,
          durationMs: 0,
          stdoutTail: '',
          stderrTail: '',
          report: null,
          reportError: `Baseline Jest executor threw: ${error.message}`,
        };
      }
      const baselineClassification = classifyJestRun(baselineRun, {
        expectedTestFiles: before.testFiles,
        appDir,
      });
      if (baselineRun.signal) stopSignalSeen = true;
      baseline = {
        status:
          baselineClassification.status === 'Survived'
            ? 'Passed'
            : baselineClassification.status === 'Timeout'
              ? 'Timeout'
              : 'Error',
        reason: baselineClassification.reason,
        durationMs: baselineRun.durationMs,
        process: {
          exitCode: baselineRun.exitCode,
          signal: baselineRun.signal,
        },
        diagnostics:
          baselineClassification.status === 'Survived'
            ? null
            : {
                stdoutTail: baselineRun.stdoutTail,
                stderrTail: baselineRun.stderrTail,
              },
      };

      if (baseline.status === 'Passed') {
        const jobs = sites.flatMap((site, siteIndex) => [
          { index: siteIndex * 2, site, force: true },
          { index: siteIndex * 2 + 1, site, force: false },
        ]);
        results = await runMutationsWithConcurrency({
          jobs,
          concurrency,
          appDir,
          deadlineMs,
          temporaryDirectory,
          executeJest,
          log,
        });
        if (results.some((result) => result.process?.signal)) stopSignalSeen = true;
      } else {
        log(`Baseline ${baseline.status.toLowerCase()}: ${baseline.reason}`);
      }
    } finally {
      try {
        after = await createInputSnapshot({ appDir, sites, lanes });
      } catch (error) {
        afterError = error.message;
      }
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }

    const inputsUnchanged = after !== null && before.fingerprint === after.fingerprint;
    const statuses = countStatuses(results);
    const passed =
      baseline.status === 'Passed' &&
      results.length === expectedMutationCount &&
      statuses.Killed === expectedMutationCount &&
      inputsUnchanged;
    const report = {
      schemaVersion: reportSchemaVersion,
      campaign: 'conditional-rendering',
      generatedAt: new Date().toISOString(),
      passed,
      durationMs: Date.now() - startedAt,
      configuration: {
        concurrency,
        deadlineMs,
        filters: {
          lanes: [...filters.lanes],
          files: [...filters.files],
          sites: [...filters.sites],
        },
      },
      discovery: {
        totalSites: allSites.length,
        selectedSites: sites.length,
        forcedMutantsPerSite: 2,
      },
      expectedMutationCount,
      baseline,
      summary: {
        statuses,
        completedMutationCount: results.length,
      },
      provenance: {
        before,
        after,
        afterError,
        inputsUnchanged,
      },
      sites,
      results,
    };
    const reportPaths = await writeCampaignReports({ reportDir, report });
    return { report, reportPaths };
  } finally {
    await releaseCampaignLock({ preserve: stopSignalSeen });
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.list) {
    await assertMutationLaneManifest({ appDir: options.appDir });
    const sites = selectCampaignSites(
      await discoverCampaignSites({ appDir: options.appDir }),
      options.filters,
    );
    for (const site of sites) {
      console.log(
        `${site.id}\t${site.laneName}\t${site.predicateNodeType}\t${site.predicateSource.replaceAll(/\s+/g, ' ')}`,
      );
    }
    console.log(`${sites.length} selected conditional-rendering sites`);
    return;
  }

  const { report, reportPaths } = await runConditionalRenderingCampaign(options);
  console.log(
    `Conditional-rendering campaign ${report.passed ? 'passed' : 'failed'}: ` +
      `${report.summary.statuses.Killed} killed, ` +
      `${report.summary.statuses.Survived} survived, ` +
      `${report.summary.statuses.Error} errors, ` +
      `${report.summary.statuses.Timeout} timeouts.`,
  );
  console.log(`JSON report: ${reportPaths.jsonPath}`);
  console.log(`Markdown report: ${reportPaths.markdownPath}`);
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 2;
  }
}
