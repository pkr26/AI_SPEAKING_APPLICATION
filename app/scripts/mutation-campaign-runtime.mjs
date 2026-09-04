import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const mutationCampaignLockFileName = '.mutation-campaign.lock';
export const mutationResultStatuses = Object.freeze(['Killed', 'Survived', 'Error', 'Timeout']);

export function uniqueSorted(values) {
  return [...new Set(values)].toSorted();
}

export function normalizeAppPath(value, label = 'path') {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty app-relative path`);
  }
  if (path.isAbsolute(value)) throw new Error(`${label} must be relative to the app directory`);
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

export function resolveMutationReportDirectory(value, appDir) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('report directory must be a non-empty path');
  }
  const resolvedAppDir = path.resolve(appDir);
  const resolved = path.resolve(resolvedAppDir, value);
  const relative = path.relative(resolvedAppDir, resolved);
  if (relative !== '..' && !relative.startsWith(`..${path.sep}`)) {
    const normalized = relative.split(path.sep).join('/');
    if (normalized !== 'reports' && !normalized.startsWith('reports/')) {
      throw new Error('A report directory inside the app must be reports/ or a descendant');
    }
  }
  return resolved;
}

export function parseBoundedInteger(
  value,
  label,
  { fallback, minimum = 1, maximum = Number.MAX_SAFE_INTEGER },
) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${label} must be an integer between ${minimum} and ${maximum} ` +
        `(received ${JSON.stringify(value)})`,
    );
  }
  return parsed;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalExecutionIdentity(environment) {
  const value = (name) => {
    const candidate = environment[name];
    return candidate === undefined ? null : String(candidate);
  };
  return {
    runtime: { node: process.version, platform: process.platform, arch: process.arch },
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

async function readToolVersions(appDir, packageNames) {
  const versions = {};
  for (const packageName of uniqueSorted(packageNames)) {
    const manifestPath = path.join(
      appDir,
      'node_modules',
      ...packageName.split('/'),
      'package.json',
    );
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
      throw new Error(`Installed mutation tool ${packageName} has no version`);
    }
    versions[packageName] = manifest.version;
  }
  return versions;
}

/**
 * Hash every source, owning test, and tool input before and after execution.
 * Callers choose the file sets; the JSX campaign deliberately passes every
 * production source because an owning test can import code from another lane.
 */
export async function createCampaignInputSnapshot({
  appDir,
  campaign,
  mode,
  toolingFiles,
  productionFiles,
  testFiles,
  toolPackages,
  environment = process.env,
}) {
  const execution = canonicalExecutionIdentity(environment);
  const toolVersions = await readToolVersions(appDir, toolPackages);
  const identity = { campaign, mode, execution, toolVersions };
  const aggregate = createHash('sha256').update(`${JSON.stringify(identity)}\n`);
  const files = [];

  for (const [kind, relativeFiles] of [
    ['tooling', toolingFiles],
    ['production', productionFiles],
    ['owningTest', testFiles],
  ]) {
    for (const relativeFile of uniqueSorted(relativeFiles)) {
      const normalized = normalizeAppPath(relativeFile, `${kind} input`);
      const contents = await fs.readFile(path.join(appDir, normalized));
      const digest = sha256(contents);
      files.push({ kind, path: normalized, bytes: contents.byteLength, sha256: digest });
      aggregate.update(`${kind}\0${normalized}\0${contents.byteLength}\0`);
      aggregate.update(contents);
      aggregate.update('\0');
    }
  }

  return {
    fingerprint: aggregate.digest('hex'),
    campaign,
    mode,
    execution,
    toolVersions,
    files,
    productionFiles: uniqueSorted(productionFiles),
    testFiles: uniqueSorted(testFiles),
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

export async function executeJestMutationProcess({
  appDir,
  jestConfigPath,
  testFiles,
  deadlineMs,
  outputFile,
  environment,
  forceExit = false,
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
  // Opt-in: a killed-by-assertion mutant can strand long real-timer deadlines
  // (for example the 150s audio-fetch abort) whose native timers keep the Jest
  // process alive long after the JSON report with every test verdict is
  // complete. forceExit ends that post-verdict drain without changing any
  // test outcome; the mutant's status still comes only from the report.
  if (forceExit) args.push('--forceExit');
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
  if (!Array.isArray(report.testResults) || typeof report.success !== 'boolean') {
    throw new Error('Jest JSON lacks testResults or success');
  }
  const counts = {
    failedSuites: integerField(report, 'numFailedTestSuites'),
    failedTests: integerField(report, 'numFailedTests'),
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
      if (!result || typeof result.name !== 'string' || !Array.isArray(result.assertionResults)) {
        throw new Error('Jest JSON contains an invalid test result');
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
      /Exceeded timeout of .* for a test|Async callback was not invoked within the .* timeout|test timed out after/iu.test(
        String(message),
      ),
    ),
  );
  const nonAssertionFailures = failedAssertions.filter(
    (assertion) => !jestFailureHasAssertionEvidence(assertion.failureMessages),
  );
  return {
    counts,
    failedAssertions,
    nonAssertionFailures,
    runtimeSuiteNames,
    timeoutAssertions,
    wasInterrupted: report.wasInterrupted === true,
  };
}

/**
 * Jest serializes both matcher failures and raw exceptions into an
 * `assertionResults` entry. Only matcher/query evidence is a mutation kill;
 * TypeErrors, SyntaxErrors, unhandled rejections, and manual helper throws are
 * test-infrastructure errors even when Jest attaches them to a named test.
 */
export function jestFailureHasAssertionEvidence(failureMessages) {
  if (!Array.isArray(failureMessages) || failureMessages.length === 0) return false;
  return failureMessages.some((message) => {
    const text = String(message);
    return (
      /(?:^|\n)\s*(?:Error:\s*)?expect(?:\.|\()/u.test(text) ||
      /TestingLibraryElementError/iu.test(text) ||
      /Unable to find an element(?: with| by|$)/iu.test(text) ||
      /Found multiple elements(?: with| for|$)/iu.test(text) ||
      /Unable to fire a ["'][^"']+["'] event/iu.test(text)
    );
  });
}

/** A mutant is killed only by a real failed assertion, never a crash or timeout. */
export function classifyJestMutationRun(run, { expectedTestFiles, appDir }) {
  if (run.timedOut) return { status: 'Timeout', reason: 'Jest exceeded the subprocess deadline' };
  if (run.signal) return { status: 'Error', reason: `Jest exited from signal ${run.signal}` };
  if (run.reportError) return { status: 'Error', reason: run.reportError };

  let inspection;
  try {
    inspection = inspectJestReport(run.report, expectedTestFiles, appDir);
  } catch (error) {
    return { status: 'Error', reason: `Invalid Jest result: ${error.message}` };
  }
  const failedTestNames = inspection.failedAssertions.map((assertion) =>
    Array.isArray(assertion.ancestorTitles)
      ? [...assertion.ancestorTitles, assertion.title].filter(Boolean).join(' > ')
      : assertion.title || '(unnamed test)',
  );
  const evidenceFailureCount = inspection.failedAssertions.filter((assertion) =>
    jestFailureHasAssertionEvidence(assertion.failureMessages),
  ).length;
  const withEvidence = (result) => ({ ...result, failedTestNames, evidenceFailureCount });
  if (inspection.wasInterrupted) {
    return withEvidence({ status: 'Error', reason: 'Jest reported interruption' });
  }
  if (inspection.timeoutAssertions.length > 0) {
    return withEvidence({ status: 'Timeout', reason: 'At least one Jest assertion timed out' });
  }
  if (inspection.counts.runtimeErrorSuites > 0 || inspection.runtimeSuiteNames.length > 0) {
    return withEvidence({ status: 'Error', reason: 'Jest reported a runtime test-suite failure' });
  }
  if (inspection.nonAssertionFailures.length > 0) {
    return withEvidence({
      status: 'Error',
      reason: 'At least one failed Jest test lacked matcher or Testing Library query evidence',
    });
  }
  if (run.exitCode === 0) {
    return run.report.success &&
      inspection.counts.failedSuites === 0 &&
      inspection.counts.failedTests === 0
      ? {
          status: 'Survived',
          reason: 'All owning assertions passed',
          failedTestNames,
          evidenceFailureCount,
        }
      : { status: 'Error', reason: 'Jest exited successfully but reported failures' };
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
      evidenceFailureCount,
    };
  }
  return {
    status: 'Error',
    reason: `Jest exited with code ${String(run.exitCode)} without an assertion failure`,
  };
}

export function countMutationStatuses(results) {
  const counts = { Killed: 0, Survived: 0, Error: 0, Timeout: 0 };
  for (const result of results) {
    if (!mutationResultStatuses.includes(result.status)) {
      throw new Error(`Unknown mutation result status: ${result.status}`);
    }
    counts[result.status] += 1;
  }
  return counts;
}

export async function runBoundedMutationJobs({ jobs, concurrency, runJob, log = () => {} }) {
  const results = new Array(jobs.length);
  let nextIndex = 0;
  let completed = 0;
  async function worker() {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= jobs.length) return;
      const result = await runJob(jobs[index], index);
      results[index] = result;
      completed += 1;
      log({ completed, total: jobs.length, result });
    }
  }
  const workerCount = Math.min(concurrency, jobs.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function readCampaignLock(lockPath) {
  let owner;
  try {
    owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') throw error;
    throw new Error(
      `Mutation campaign lock ${lockPath} is invalid; verify no mutation process is active`,
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
      `Mutation campaign lock ${lockPath} is invalid; verify no mutation process is active`,
    );
  }
  return owner;
}

export async function acquireMutationCampaignLock({ appDir, reportDir, campaign }) {
  const lockPath = path.join(appDir, mutationCampaignLockFileName);
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
        'Verify its parent and children are stopped before removing the lock manually.',
    );
  }
  try {
    await handle.writeFile(
      `${JSON.stringify({
        pid: process.pid,
        token,
        campaign,
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
      // A signal-ended campaign may leave orphaned Jest/Stryker children
      // mutating the workspace. Keep the lock so a new campaign cannot start
      // until a human verifies no child is alive and removes it manually.
      console.error(
        `Mutation campaign stopped by signal: preserving ${mutationCampaignLockFileName} ` +
          '(verify no orphaned Jest/Stryker child is alive, then remove it manually).',
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

export async function writeFileAtomically(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await fs.writeFile(temporaryPath, contents, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}
