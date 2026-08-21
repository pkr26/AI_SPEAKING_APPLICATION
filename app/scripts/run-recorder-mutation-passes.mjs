import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { constants as fsConstants, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import {
  assertMutationReportInputsMatchWorkspace,
  createMutationReportHtml,
} from './merge-mutation-reports.mjs';
import { mergeRecorderMutationPassData } from './merge-recorder-mutation-passes.mjs';
import { mutationLanes } from './mutation-lanes.mjs';
import { createMutationLaneProvenance } from './mutation-provenance.mjs';
import {
  createRecorderKilledIncrementalSeed,
  normalizeRecorderCoverageOffIncrementalReport,
} from './recorder-killed-incremental-seed.mjs';
import {
  assertRecorderMutationPlan,
  countRecorderSourceLines,
  RECORDER_PASS_MODE_COVERAGE_ALL,
  RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL,
  RECORDER_SOURCE_FILE,
  resolveRecorderMutationPlan,
} from './recorder-mutation-plan.mjs';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultAppDirectory = path.resolve(scriptsDirectory, '..');

export const RECORDER_MUTATION_PASS_CONCURRENCY_ENV = 'MUTATION_RECORDER_PARALLEL_PASSES';
export const RECORDER_MUTATION_TOTAL_WORKERS_ENV = 'MUTATION_RECORDER_TOTAL_WORKERS';
export const RECORDER_KILLED_ONLY_INCREMENTAL_ENV = 'MUTATION_RECORDER_KILLED_ONLY_INCREMENTAL';
export const DEFAULT_RECORDER_MUTATION_PASS_CONCURRENCY = 4;
export const MAX_RECORDER_MUTATION_PASS_CONCURRENCY = 4;
export const RECORDER_MUTATION_REPORT_FILE = 'recorder.json';
export const RECORDER_MUTATION_HTML_FILE = 'recorder.html';
export const RECORDER_MUTATION_PASS_SIDECAR_FILE = 'recorder.multipass.json';
export const RECORDER_MUTATION_OUTCOME_FILE = 'outcome.json';
export const RECORDER_MUTATION_STOP_GRACE_MS = 5_000;

function parsePositiveInteger(value, label, fallback) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer (received ${JSON.stringify(value)})`);
  }
  return parsed;
}

function parseBoolean(value, label, fallback) {
  if (value === undefined || value === '') return fallback;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  throw new Error(`${label} must be true or false (received ${JSON.stringify(value)})`);
}

function resolveExecutionBudget({ environment, passConcurrency }) {
  const resolvedPassConcurrency = parsePositiveInteger(
    passConcurrency === undefined
      ? environment[RECORDER_MUTATION_PASS_CONCURRENCY_ENV]
      : passConcurrency,
    RECORDER_MUTATION_PASS_CONCURRENCY_ENV,
    DEFAULT_RECORDER_MUTATION_PASS_CONCURRENCY,
  );
  if (resolvedPassConcurrency > MAX_RECORDER_MUTATION_PASS_CONCURRENCY) {
    throw new Error(
      `${RECORDER_MUTATION_PASS_CONCURRENCY_ENV} must not exceed ` +
        `${MAX_RECORDER_MUTATION_PASS_CONCURRENCY}`,
    );
  }
  const childConcurrency = parsePositiveInteger(
    environment.MUTATION_CONCURRENCY,
    'MUTATION_CONCURRENCY',
    2,
  );
  const totalWorkerBudget = parsePositiveInteger(
    environment[RECORDER_MUTATION_TOTAL_WORKERS_ENV],
    RECORDER_MUTATION_TOTAL_WORKERS_ENV,
    childConcurrency,
  );
  if (childConcurrency > totalWorkerBudget) {
    throw new Error(
      `Recorder integration requests ${childConcurrency} Stryker workers, above ` +
        `${RECORDER_MUTATION_TOTAL_WORKERS_ENV}=${totalWorkerBudget}`,
    );
  }
  return {
    cheapPassConcurrency: Math.min(resolvedPassConcurrency, totalWorkerBudget),
    integrationConcurrency: childConcurrency,
    passConcurrencyLimit: resolvedPassConcurrency,
    totalWorkerBudget,
  };
}

function safePathSegment(value) {
  const segment = String(value).replaceAll(/[^a-zA-Z0-9_-]/g, '-');
  if (!segment || segment === '.' || segment === '..') {
    throw new Error(`Recorder mutation pass key ${JSON.stringify(value)} is not path-safe`);
  }
  return segment;
}

async function writeFileAtomically(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await fs.writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' });
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

async function writeOutcomeManifest(manifestPath, manifest) {
  manifest.updatedAt = new Date().toISOString();
  await writeFileAtomically(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function createManifestWriter(manifestPath, manifest, writeManifest) {
  let writes = Promise.resolve();
  return () => {
    const snapshot = structuredClone(manifest);
    const nextWrite = writes.catch(() => {}).then(() => writeManifest(manifestPath, snapshot));
    writes = nextWrite;
    return nextWrite;
  };
}

function isMissingFile(error) {
  return error?.code === 'ENOENT';
}

async function readJsonObject(filePath, label) {
  let value;
  try {
    value = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (isMissingFile(error)) throw new Error(`${label} is missing at ${filePath}`);
    if (error instanceof SyntaxError) throw new Error(`${label} at ${filePath} is not valid JSON`);
    throw error;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} at ${filePath} must contain an object`);
  }
  return value;
}

async function sha256File(filePath) {
  return createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');
}

async function readOptionalJsonObject(filePath, label) {
  try {
    return await readJsonObject(filePath, label);
  } catch (error) {
    if (error.message === `${label} is missing at ${filePath}`) return undefined;
    throw error;
  }
}

function createNewOutcomeManifest({ fingerprint, plan, provenance, budget }) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    fingerprint,
    provenanceFingerprint: provenance.fingerprint,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    budget,
    plan,
    retentionPolicy: 'preserve-all-attempt-evidence',
    publication: null,
    passes: plan.passes.map((pass) => ({
      key: pass.key,
      testFile: pass.testFile,
      selector: pass.selector,
      status: 'pending',
      attempts: [],
    })),
  };
}

const passStateStatuses = new Set(['pending', 'running', 'completed', 'failed', 'stopped']);
const manifestStatuses = new Set([
  'pending',
  'running',
  'complete',
  'failed',
  'stopped',
  'validation-failed',
]);
const attemptStatuses = new Set(['running', 'completed', 'failed', 'stopped']);
const passModes = new Set([
  RECORDER_PASS_MODE_COVERAGE_ALL,
  RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL,
]);
const attemptPathFields = [
  'reportPath',
  'rawReportPath',
  'reportDir',
  'logPath',
  'incrementalWorkingPath',
  'normalizationAuditPath',
];
const attemptHashFields = [
  'reportSha256',
  'rawReportSha256',
  'seedInputSha256',
  'incrementalWorkingSha256',
  'normalizationAuditSha256',
];

function resolveArtifactRelativePath(artifactDir, relativePath, label) {
  if (
    typeof relativePath !== 'string' ||
    relativePath.length === 0 ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`${label} must be a non-empty relative path`);
  }
  const root = path.resolve(artifactDir);
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} escapes Recorder artifact directory`);
  }
  return resolved;
}

function validateOutcomeManifest(manifest, { artifactDir, fingerprint, plan }) {
  if (
    manifest.schemaVersion !== 1 ||
    manifest.fingerprint !== fingerprint ||
    !/^[a-f0-9]{64}$/u.test(manifest.fingerprint) ||
    !manifestStatuses.has(manifest.status) ||
    manifest.retentionPolicy !== 'preserve-all-attempt-evidence' ||
    !isDeepStrictEqual(manifest.plan, plan) ||
    !Array.isArray(manifest.passes) ||
    manifest.passes.length !== plan.passes.length
  ) {
    throw new Error('Recorder mutation outcome manifest does not match the current inputs/plan');
  }
  for (const [index, passState] of manifest.passes.entries()) {
    const pass = plan.passes[index];
    if (
      passState?.key !== pass.key ||
      passState.testFile !== pass.testFile ||
      passState.selector !== pass.selector ||
      !passStateStatuses.has(passState.status) ||
      !Array.isArray(passState.attempts)
    ) {
      throw new Error(`Recorder mutation outcome manifest pass ${index} is invalid`);
    }
    for (const [attemptIndex, attempt] of passState.attempts.entries()) {
      const label = `Recorder mutation outcome pass ${pass.key} attempt ${attemptIndex + 1}`;
      if (
        attempt === null ||
        typeof attempt !== 'object' ||
        Array.isArray(attempt) ||
        attempt.number !== attemptIndex + 1 ||
        !attemptStatuses.has(attempt.status) ||
        !passModes.has(attempt.mode) ||
        !Number.isInteger(attempt.childConcurrency) ||
        attempt.childConcurrency < 1 ||
        typeof attempt.startedAt !== 'string' ||
        (attempt.finishedAt !== null && typeof attempt.finishedAt !== 'string') ||
        (attempt.exitCode !== null && !Number.isInteger(attempt.exitCode))
      ) {
        throw new Error(`${label} metadata is invalid`);
      }
      if (
        attempt.status !== 'running' &&
        (typeof attempt.finishedAt !== 'string' || !Number.isInteger(attempt.exitCode))
      ) {
        throw new Error(`${label} terminal status lacks finishedAt/exitCode`);
      }
      if (attempt.error !== undefined && typeof attempt.error !== 'string') {
        throw new Error(`${label}.error must be a string`);
      }
      for (const field of attemptPathFields) {
        if (attempt[field] !== undefined) {
          resolveArtifactRelativePath(artifactDir, attempt[field], `${label}.${field}`);
        }
      }
      for (const field of attemptHashFields) {
        if (attempt[field] !== undefined && !/^[a-f0-9]{64}$/u.test(attempt[field])) {
          throw new Error(`${label}.${field} must be a SHA-256 hash`);
        }
      }
      if (
        attempt.tempDirName !== undefined &&
        (typeof attempt.tempDirName !== 'string' ||
          attempt.tempDirName.includes('/') ||
          attempt.tempDirName.includes('\\') ||
          !attempt.tempDirName.startsWith('.stryker-recorder-'))
      ) {
        throw new Error(`${label}.tempDirName is invalid`);
      }
      if (attempt.status === 'completed') {
        if (attempt.reportPath === undefined || attempt.reportSha256 === undefined) {
          throw new Error(`${label} completed without a report path/hash`);
        }
        if (attempt.mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL) {
          for (const field of [
            'rawReportPath',
            'rawReportSha256',
            'incrementalWorkingPath',
            'incrementalWorkingSha256',
            'seedInputSha256',
            'normalizationAuditPath',
            'normalizationAuditSha256',
          ]) {
            if (attempt[field] === undefined) {
              throw new Error(`${label} incremental completion lacks ${field}`);
            }
          }
          if (
            !Array.isArray(attempt.skippedDuePriorKillSignatures) ||
            attempt.skippedDuePriorKillSignatures.some(
              (signature) => typeof signature !== 'string' || signature.length === 0,
            ) ||
            new Set(attempt.skippedDuePriorKillSignatures).size !==
              attempt.skippedDuePriorKillSignatures.length
          ) {
            throw new Error(`${label} has invalid skipped signatures`);
          }
        }
      }
    }
  }
  if (manifest.incrementalSeed !== undefined) {
    const seed = manifest.incrementalSeed;
    if (
      seed === null ||
      typeof seed !== 'object' ||
      !Number.isInteger(seed.generation) ||
      seed.generation < 1 ||
      !/^[a-f0-9]{64}$/u.test(seed.reportSha256) ||
      !/^[a-f0-9]{64}$/u.test(seed.auditSha256) ||
      !Number.isInteger(seed.seededCount) ||
      seed.seededCount < 0 ||
      !Number.isInteger(seed.universeCount) ||
      seed.universeCount < seed.seededCount ||
      !Array.isArray(seed.seededSignatures) ||
      seed.seededSignatures.length !== seed.seededCount ||
      seed.seededSignatures.some(
        (signature) => typeof signature !== 'string' || signature.length === 0,
      ) ||
      new Set(seed.seededSignatures).size !== seed.seededSignatures.length
    ) {
      throw new Error('Recorder mutation outcome incremental seed is invalid');
    }
    resolveArtifactRelativePath(artifactDir, seed.reportPath, 'incrementalSeed.reportPath');
    resolveArtifactRelativePath(artifactDir, seed.auditPath, 'incrementalSeed.auditPath');
  }
  return manifest;
}

async function defaultInputFingerprint({ appDir, environment, plan }) {
  const provenance = await createMutationLaneProvenance({
    appDir,
    laneName: 'recorder',
    lane: mutationLanes.recorder,
    environment,
  });
  const fingerprint = createHash('sha256')
    .update(provenance.fingerprint)
    .update('\0')
    .update(JSON.stringify(plan))
    .digest('hex');
  return { fingerprint, provenance };
}

function createStopController(externalSignal, handleProcessSignals) {
  const controller = new AbortController();
  const forwardExternalAbort = () => controller.abort(externalSignal.reason);
  if (externalSignal?.aborted) forwardExternalAbort();
  else externalSignal?.addEventListener('abort', forwardExternalAbort, { once: true });

  const onSigint = () => controller.abort({ kind: 'user-stop', signal: 'SIGINT' });
  const onSigterm = () => controller.abort({ kind: 'user-stop', signal: 'SIGTERM' });
  if (handleProcessSignals) {
    process.once('SIGINT', onSigint);
    process.once('SIGTERM', onSigterm);
  }
  return {
    abort(reason) {
      if (!controller.signal.aborted) controller.abort(reason);
    },
    signal: controller.signal,
    cleanup() {
      externalSignal?.removeEventListener('abort', forwardExternalAbort);
      if (handleProcessSignals) {
        process.removeListener('SIGINT', onSigint);
        process.removeListener('SIGTERM', onSigterm);
      }
    },
  };
}

function ignoredMissingProcess(error) {
  return error?.code === 'ESRCH';
}

function permissionDeniedProcess(error) {
  return error?.code === 'EPERM';
}

function listProcessGroupPidsWithPs(processGroupId) {
  return new Promise((resolve, reject) => {
    execFile('/bin/ps', ['-axo', 'pid=,pgid='], { encoding: 'utf8' }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      const pids = [];
      for (const line of stdout.split('\n')) {
        const [pidText, pgidText] = line.trim().split(/\s+/u);
        const pid = Number(pidText);
        const pgid = Number(pgidText);
        if (Number.isInteger(pid) && pid > 0 && pgid === processGroupId) pids.push(pid);
      }
      resolve([...new Set(pids)]);
    });
  });
}

/** TERM a complete Stryker process group, then KILL it after a bounded grace period. */
export function terminateRecorderMutationProcessTree(
  child,
  {
    clearTimer = clearTimeout,
    killProcess = process.kill,
    listProcessGroupPids = listProcessGroupPidsWithPs,
    platform = process.platform,
    schedule = setTimeout,
    stopGraceMs = RECORDER_MUTATION_STOP_GRACE_MS,
  } = {},
) {
  let timer;
  let settled = false;
  const diagnostics = [];
  let resolveCompletion;
  const completion = new Promise((resolve) => {
    resolveCompletion = resolve;
  });
  const record = (phase, error, details = {}) => {
    diagnostics.push({
      phase,
      code: error?.code ?? 'UNKNOWN',
      message: String(error?.message ?? error),
      ...details,
    });
  };
  const enumerate = async (phase) => {
    try {
      const pids = await listProcessGroupPids(child.pid);
      return pids.filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
    } catch (error) {
      record(phase, error, { processGroupId: child.pid });
      return undefined;
    }
  };
  const signalMembers = async (signalName, phase) => {
    const pids = await enumerate(`${phase}-enumerate`);
    if (pids === undefined) return;
    for (const pid of pids) {
      try {
        killProcess(pid, signalName);
      } catch (error) {
        if (ignoredMissingProcess(error)) continue;
        record(phase, error, { pid, signal: signalName });
      }
    }
  };
  const send = async (signalName, phase) => {
    try {
      if (platform === 'win32') child.kill(signalName);
      else killProcess(-child.pid, signalName);
    } catch (error) {
      if (ignoredMissingProcess(error)) return;
      record(phase, error, { processGroupId: child.pid, signal: signalName });
      // macOS can return EPERM for killpg after the leader exits. Enumerating
      // the exact PGID and signaling positive PIDs keeps teardown bounded.
      await signalMembers(signalName, `${phase}-member`);
    }
  };
  const groupIsAlive = async () => {
    if (platform === 'win32') return child.exitCode === null && child.signalCode === null;
    try {
      killProcess(-child.pid, 0);
      return true;
    } catch (error) {
      if (ignoredMissingProcess(error)) return false;
      if (permissionDeniedProcess(error)) {
        record('probe-group', error, { processGroupId: child.pid, signal: 0 });
        const pids = await enumerate('probe-enumerate');
        // Enumeration failure is unknown, not proof that the group is gone.
        return pids === undefined ? true : pids.length > 0;
      }
      record('probe-group', error, { processGroupId: child.pid, signal: 0 });
      return true;
    }
  };
  const settle = () => {
    if (settled) return;
    settled = true;
    clearTimer(timer);
    resolveCompletion(diagnostics);
  };
  const term = send('SIGTERM', 'term-group');
  timer = schedule(() => {
    void (async () => {
      try {
        await term;
        if (await groupIsAlive()) await send('SIGKILL', 'kill-group');
      } catch (error) {
        // Timer callbacks must never take down the mutation parent.
        record('kill-escalation', error, { processGroupId: child.pid });
      } finally {
        settle();
      }
    })();
  }, stopGraceMs);
  return {
    completion,
    diagnostics,
    async leaderExited() {
      // The leader can exit while Jest descendants remain in its process group.
      try {
        await term;
        if (!(await groupIsAlive())) settle();
      } catch (error) {
        record('leader-exit-probe', error, { processGroupId: child.pid });
      }
    },
  };
}

async function runChildProcess(command, args, { cwd, environment, logPath, signal }) {
  if (signal.aborted) return Promise.resolve(143);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const detached = process.platform !== 'win32';
    const child = spawn(command, args, {
      cwd,
      detached,
      env: environment,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    const log = createWriteStream(logPath, { flags: 'a' });
    let logError;
    log.on('error', (error) => {
      logError = error;
    });
    child.stdout?.on('data', (chunk) => {
      process.stdout.write(chunk);
      log.write(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      process.stderr.write(chunk);
      log.write(chunk);
    });
    let finished = false;
    let termination;
    const closeLog = () =>
      new Promise((closeResolve) => {
        log.end(closeResolve);
      });
    const finish = async (callback, value) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener('abort', stopChild);
      if (termination) {
        await termination.leaderExited();
        const diagnostics = await termination.completion;
        if (diagnostics.length) {
          const message = `[recorder-teardown] ${JSON.stringify(diagnostics)}\n`;
          process.stderr.write(message);
          log.write(message);
        }
      }
      await closeLog();
      if (logError) {
        reject(logError);
        return;
      }
      callback(value);
    };
    const stopChild = () => {
      if (!termination && child.exitCode === null && child.signalCode === null) {
        termination = terminateRecorderMutationProcessTree(child);
      }
    };
    signal.addEventListener('abort', stopChild, { once: true });
    child.once('error', (error) => void finish(reject, error));
    child.once('close', (code, exitSignal) => void finish(resolve, code ?? (exitSignal ? 143 : 1)));
    if (signal.aborted) stopChild();
  });
}

export function createRecorderMutationPassInvocation({
  appDir,
  childConcurrency,
  environment,
  incrementalFile,
  pass,
  passReportDir,
  logPath,
  mode = RECORDER_PASS_MODE_COVERAGE_ALL,
  signal,
  tempDirName,
}) {
  if (
    typeof pass?.testFile !== 'string' ||
    pass.testFile.length === 0 ||
    pass.testFile.includes(',')
  ) {
    throw new Error('Recorder mutation pass must select exactly one test file');
  }
  if (
    typeof pass.selector !== 'string' ||
    pass.selector !== `${RECORDER_SOURCE_FILE}:${pass.startLine}-${pass.endLine}`
  ) {
    throw new Error('Recorder mutation pass selector must be the exact resolved source range');
  }
  const strykerEntrypoint = path.join(
    appDir,
    'node_modules',
    '@stryker-mutator',
    'core',
    'bin',
    'stryker.js',
  );
  if (
    mode !== RECORDER_PASS_MODE_COVERAGE_ALL &&
    mode !== RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL
  ) {
    throw new Error(`Unknown Recorder mutation pass mode ${JSON.stringify(mode)}`);
  }
  if (
    mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL &&
    (typeof incrementalFile !== 'string' || incrementalFile.length === 0)
  ) {
    throw new Error('Incremental Recorder integration requires a working incrementalFile');
  }
  if (mode === RECORDER_PASS_MODE_COVERAGE_ALL && incrementalFile !== undefined) {
    throw new Error('Coverage-all Recorder pass cannot declare incrementalFile');
  }
  if (mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL && pass.passName !== 'integration') {
    throw new Error('Only the Recorder integration pass may use incremental coverage-off mode');
  }
  const args = [
    strykerEntrypoint,
    'run',
    'stryker.lane.config.mjs',
    '--mutate',
    pass.selector,
    '--tempDirName',
    tempDirName,
  ];
  if (mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL) {
    args.push('--coverageAnalysis', 'off', '--incremental', '--incrementalFile', incrementalFile);
  }
  return {
    command: process.execPath,
    args,
    options: {
      cwd: appDir,
      environment: {
        ...environment,
        MUTATION_CONCURRENCY: String(childConcurrency),
        MUTATION_LANE: 'recorder',
        MUTATION_REPORT_DIR: passReportDir,
        MUTATION_TEST_FILES: pass.testFile,
      },
      signal,
      logPath,
    },
  };
}

export async function runStrykerRecorderMutationPass(options) {
  const invocation = createRecorderMutationPassInvocation(options);
  return runChildProcess(invocation.command, invocation.args, invocation.options);
}

async function publishMergedRecorderReports({ html, reportDir, report, sidecar }) {
  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('Merged Recorder mutation report must be an object');
  }
  if (sidecar === null || typeof sidecar !== 'object' || Array.isArray(sidecar)) {
    throw new Error('Merged Recorder mutation sidecar must be an object');
  }
  if (typeof html !== 'string' || !html.startsWith('<!doctype html>')) {
    throw new Error('Merged Recorder mutation HTML must be a complete document');
  }
  const reportPath = path.join(reportDir, RECORDER_MUTATION_REPORT_FILE);
  const htmlPath = path.join(reportDir, RECORDER_MUTATION_HTML_FILE);
  const sidecarPath = path.join(reportDir, RECORDER_MUTATION_PASS_SIDECAR_FILE);
  const token = `${process.pid}-${randomUUID()}`;
  const artifacts = [
    {
      finalPath: sidecarPath,
      temporaryPath: `${sidecarPath}.tmp-${token}`,
      contents: `${JSON.stringify(sidecar, null, 2)}\n`,
    },
    { finalPath: htmlPath, temporaryPath: `${htmlPath}.tmp-${token}`, contents: html },
    {
      finalPath: reportPath,
      temporaryPath: `${reportPath}.tmp-${token}`,
      contents: `${JSON.stringify(report)}\n`,
    },
  ].map((artifact) => ({
    ...artifact,
    backupPath: `${artifact.finalPath}.backup-${token}`,
    hadPriorArtifact: false,
  }));
  const published = [];
  try {
    await fs.mkdir(reportDir, { recursive: true });
    for (const artifact of artifacts) {
      try {
        await fs.copyFile(artifact.finalPath, artifact.backupPath);
        artifact.hadPriorArtifact = true;
      } catch (error) {
        if (!isMissingFile(error)) throw error;
      }
    }
    await Promise.all(
      artifacts.map(({ temporaryPath, contents }) =>
        fs.writeFile(temporaryPath, contents, { encoding: 'utf8', flag: 'wx' }),
      ),
    );
    // JSON is the commit marker used by the app-level merger.
    for (const artifact of artifacts.slice(0, -1)) {
      await fs.rename(artifact.temporaryPath, artifact.finalPath);
      published.push(artifact);
    }
    const reportArtifact = artifacts.at(-1);
    await fs.rename(reportArtifact.temporaryPath, reportPath);
    published.push(reportArtifact);
    return { htmlPath, reportPath, sidecarPath };
  } catch (error) {
    const restoration = await Promise.allSettled(
      published.map((artifact) =>
        artifact.hadPriorArtifact
          ? fs.copyFile(artifact.backupPath, artifact.finalPath)
          : fs.rm(artifact.finalPath, { force: true }),
      ),
    );
    const restorationErrors = restoration
      .filter(({ status }) => status === 'rejected')
      .map(({ reason }) => reason);
    if (restorationErrors.length) {
      throw new AggregateError(
        [error, ...restorationErrors],
        'Recorder publication rollback failed',
      );
    }
    throw error;
  } finally {
    await Promise.all(
      artifacts.flatMap(({ backupPath, temporaryPath }) => [
        fs.rm(temporaryPath, { force: true }),
        fs.rm(backupPath, { force: true }),
      ]),
    );
  }
}

/**
 * Execute the validated full-source Recorder plan. Raw pass evidence and an
 * atomic outcome manifest are durable and resumable; recorder.json is only
 * published after every pass and the cross-pass merger validates successfully.
 * Attempt evidence is intentionally retained without automatic pruning because
 * a completed pass can represent hours of work; its fingerprinted path is the
 * explicit lifecycle boundary for later manual retention policy.
 */
export async function runRecorderMutationPasses({
  appDir = defaultAppDirectory,
  reportDir = path.join(defaultAppDirectory, 'reports', 'mutation'),
  environment = process.env,
  passConcurrency,
  signal: externalSignal,
  continueOnFailure = false,
  handleProcessSignals = true,
  runPass = runStrykerRecorderMutationPass,
  mergePassData = mergeRecorderMutationPassData,
  validateMergedReport = assertMutationReportInputsMatchWorkspace,
  renderReportHtml = createMutationReportHtml,
  resolvePlan = resolveRecorderMutationPlan,
  assertPlan = assertRecorderMutationPlan,
  createInputFingerprint = defaultInputFingerprint,
  createKilledSeed = createRecorderKilledIncrementalSeed,
  normalizeIncrementalReport = normalizeRecorderCoverageOffIncrementalReport,
  writeManifest = writeOutcomeManifest,
} = {}) {
  const budget = resolveExecutionBudget({ environment, passConcurrency });
  const incrementalEnabled = parseBoolean(
    environment[RECORDER_KILLED_ONLY_INCREMENTAL_ENV],
    RECORDER_KILLED_ONLY_INCREMENTAL_ENV,
    true,
  );
  await fs.mkdir(reportDir, { recursive: true });

  const recorderSource = await fs.readFile(path.join(appDir, RECORDER_SOURCE_FILE), 'utf8');
  const sourceLineCount = countRecorderSourceLines(recorderSource);
  const plan = resolvePlan({ sourceLineCount });
  assertPlan(plan, { sourceLineCount });
  if (!Array.isArray(plan.passes) || plan.passes.length === 0) {
    throw new Error('Recorder mutation plan must contain at least one pass');
  }
  const integrationIndexes = plan.passes
    .map((pass, index) => ({ index, pass }))
    .filter(({ pass }) => pass.passName === 'integration')
    .map(({ index }) => index);
  if (integrationIndexes.length !== 1) {
    throw new Error('Recorder mutation plan must contain exactly one integration pass');
  }
  const integrationIndex = integrationIndexes[0];
  const cheapIndexes = plan.passes
    .map((_pass, index) => index)
    .filter((index) => index !== integrationIndex);
  const sentinelIndexes = cheapIndexes.filter(
    (index) => plan.passes[index].passName === 'component-sentinels',
  );
  const fastCheapIndexes = cheapIndexes.filter((index) => !sentinelIndexes.includes(index));
  if (cheapIndexes.length === 0 || integrationIndex !== plan.passes.length - 1) {
    throw new Error('Recorder mutation plan must place cheap passes before integration');
  }
  if (sentinelIndexes.length !== 1 || fastCheapIndexes.length !== 3) {
    throw new Error('Recorder mutation plan must contain three fast cheap passes and one sentinel');
  }
  const sentinelIndex = sentinelIndexes[0];

  const executionEnvironment = {
    ...environment,
    MUTATION_CONCURRENCY: String(budget.integrationConcurrency),
    [RECORDER_KILLED_ONLY_INCREMENTAL_ENV]: String(incrementalEnabled),
    [RECORDER_MUTATION_PASS_CONCURRENCY_ENV]: String(budget.passConcurrencyLimit),
    [RECORDER_MUTATION_TOTAL_WORKERS_ENV]: String(budget.totalWorkerBudget),
  };
  const input = await createInputFingerprint({
    appDir,
    environment: executionEnvironment,
    plan,
  });
  if (
    input === null ||
    typeof input !== 'object' ||
    typeof input.fingerprint !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(input.fingerprint)
  ) {
    throw new Error('Recorder mutation input fingerprint is invalid');
  }
  const artifactDir = path.join(reportDir, 'recorder-pass-runs', input.fingerprint);
  const manifestPath = path.join(artifactDir, RECORDER_MUTATION_OUTCOME_FILE);
  let manifest = await readOptionalJsonObject(manifestPath, 'Recorder mutation outcome manifest');
  if (manifest) {
    validateOutcomeManifest(manifest, {
      artifactDir,
      fingerprint: input.fingerprint,
      plan,
    });
  } else {
    manifest = createNewOutcomeManifest({
      fingerprint: input.fingerprint,
      plan,
      provenance: input.provenance ?? { fingerprint: input.fingerprint },
      budget,
    });
  }
  for (const passState of manifest.passes) {
    if (passState.status === 'completed') {
      const completedAttempt = [...passState.attempts]
        .reverse()
        .find(({ status }) => status === 'completed');
      try {
        if (!completedAttempt) throw new Error('completed attempt missing');
        const completedReportPath = resolveArtifactRelativePath(
          artifactDir,
          completedAttempt.reportPath,
          `Recorder pass ${passState.key} reportPath`,
        );
        await readJsonObject(completedReportPath, `Recorder pass ${passState.key} report`);
        if (
          typeof completedAttempt.reportSha256 !== 'string' ||
          completedAttempt.reportSha256 !== (await sha256File(completedReportPath))
        ) {
          throw new Error('completed report hash changed');
        }
      } catch {
        // Preserve the old attempt, but rerun into a new attempt directory.
        passState.status = 'pending';
      }
    } else {
      passState.status = 'pending';
    }
  }
  manifest.budget = budget;
  manifest.incrementalOptimization = {
    enabled: incrementalEnabled,
    cheapPassKeys: cheapIndexes.map((index) => plan.passes[index].key),
    fastCheapPassKeys: fastCheapIndexes.map((index) => plan.passes[index].key),
    sentinelPassKey: plan.passes[sentinelIndex].key,
    integrationPassKey: plan.passes[integrationIndex].key,
  };
  manifest.publication = null;
  manifest.status = 'running';
  delete manifest.incrementalDominance;
  delete manifest.stopReason;
  delete manifest.validationError;
  const persistManifest = createManifestWriter(manifestPath, manifest, writeManifest);
  await persistManifest();

  const stop = createStopController(externalSignal, handleProcessSignals);
  const failedPasses = [];
  const tempDirNames = new Set();
  let failureTriggeredStop = false;
  let validationError;
  let publication;
  let seedResult;
  let incrementalAudit;

  const latestCompletedAttempt = (passState) =>
    [...passState.attempts].reverse().find(({ status }) => status === 'completed');

  const persistJsonArtifact = async (filePath, value, pretty = false) => {
    const contents = `${JSON.stringify(value, null, pretty ? 2 : undefined)}\n`;
    await writeFileAtomically(filePath, contents);
    return { contents, sha256: createHash('sha256').update(contents).digest('hex') };
  };

  const validateHashedArtifact = async (relativePath, expectedHash, label) => {
    if (typeof relativePath !== 'string' || typeof expectedHash !== 'string') {
      throw new Error(`${label} has no recorded path/hash`);
    }
    const absolutePath = resolveArtifactRelativePath(artifactDir, relativePath, `${label} path`);
    if ((await sha256File(absolutePath)) !== expectedHash) {
      throw new Error(`${label} hash changed`);
    }
    return absolutePath;
  };

  async function prepareKilledSeed() {
    const cheapPassReports = [];
    for (const index of cheapIndexes) {
      const pass = plan.passes[index];
      const attempt = latestCompletedAttempt(manifest.passes[index]);
      if (!attempt) throw new Error(`Cheap Recorder pass ${pass.key} is incomplete`);
      const reportPath = await validateHashedArtifact(
        attempt.reportPath,
        attempt.reportSha256,
        `Cheap Recorder pass ${pass.key} report`,
      );
      cheapPassReports.push({
        pass,
        report: await readJsonObject(reportPath, `Cheap Recorder pass ${pass.key} report`),
      });
    }
    const computed = createKilledSeed({
      passReports: cheapPassReports,
      currentSource: recorderSource,
    });
    if (!Array.isArray(computed.seededSignatures)) {
      throw new Error('Recorder killed-only seed has no exact seeded-signature inventory');
    }
    const seedDir = path.join(artifactDir, 'incremental-seed');
    const reportPath = path.join(seedDir, 'killed-only-seed.json');
    const auditPath = path.join(seedDir, 'seed-audit.json');
    const reportContents = `${JSON.stringify(computed.report)}\n`;
    const auditContents = `${JSON.stringify(computed.audit, null, 2)}\n`;
    const reportSha256 = createHash('sha256').update(reportContents).digest('hex');
    const auditSha256 = createHash('sha256').update(auditContents).digest('hex');
    await fs.mkdir(seedDir, { recursive: true });
    let artifactsMatch = false;
    try {
      artifactsMatch =
        (await fs.readFile(reportPath, 'utf8')) === reportContents &&
        (await fs.readFile(auditPath, 'utf8')) === auditContents;
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
    if (!artifactsMatch) {
      const archiveToken = `${Date.now()}-${randomUUID()}`;
      for (const filePath of [reportPath, auditPath]) {
        try {
          await fs.rename(filePath, `${filePath}.corrupt-${archiveToken}`);
        } catch (error) {
          if (!isMissingFile(error)) throw error;
        }
      }
      // Raw cheap reports are authoritative. Atomic replacement recovers both
      // orphaned crash-window files and later seed/audit corruption.
      await writeFileAtomically(reportPath, reportContents);
      await writeFileAtomically(auditPath, auditContents);
    }
    manifest.incrementalSeed = {
      generation: manifest.incrementalSeed
        ? (manifest.incrementalSeed.generation ?? 0) + (artifactsMatch ? 0 : 1)
        : 1,
      reportPath: path.relative(artifactDir, reportPath),
      reportSha256,
      auditPath: path.relative(artifactDir, auditPath),
      auditSha256,
      seededCount: computed.seededSignatures.length,
      universeCount: computed.universeSignatures.length,
      seededSignatures: [...computed.seededSignatures],
    };
    await persistManifest();
    return computed;
  }

  async function validateCompletedIncrementalAttempt() {
    const passState = manifest.passes[integrationIndex];
    if (passState.status !== 'completed') return;
    const attempt = latestCompletedAttempt(passState);
    try {
      if (attempt.mode !== RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL) {
        throw new Error('completed integration attempt has wrong mode');
      }
      const rawPath = await validateHashedArtifact(
        attempt.rawReportPath,
        attempt.rawReportSha256,
        'Recorder incremental raw report',
      );
      await validateHashedArtifact(
        attempt.incrementalWorkingPath,
        attempt.incrementalWorkingSha256,
        'Recorder incremental working report',
      );
      const normalizedPath = await validateHashedArtifact(
        attempt.reportPath,
        attempt.reportSha256,
        'Recorder normalized integration report',
      );
      const auditPath = await validateHashedArtifact(
        attempt.normalizationAuditPath,
        attempt.normalizationAuditSha256,
        'Recorder integration normalization audit',
      );
      if (attempt.seedInputSha256 !== manifest.incrementalSeed.reportSha256) {
        throw new Error('Recorder integration attempt used a different killed-only seed');
      }
      if (attempt.incrementalWorkingSha256 === attempt.seedInputSha256) {
        throw new Error('Recorder integration working copy was never overwritten');
      }
      const recomputed = normalizeIncrementalReport({
        rawReport: await readJsonObject(rawPath, 'Recorder incremental raw report'),
        seedResult,
        integrationPass: plan.passes[integrationIndex],
        currentSource: recorderSource,
      });
      const normalizedContents = `${JSON.stringify(recomputed.report)}\n`;
      const auditContents = `${JSON.stringify(recomputed.audit, null, 2)}\n`;
      if (
        (await fs.readFile(normalizedPath, 'utf8')) !== normalizedContents ||
        (await fs.readFile(auditPath, 'utf8')) !== auditContents ||
        !isDeepStrictEqual(
          attempt.skippedDuePriorKillSignatures,
          recomputed.skippedDuePriorKillSignatures,
        )
      ) {
        throw new Error('Recorder integration normalization is not deterministic on resume');
      }
    } catch {
      passState.status = 'pending';
    }
  }

  async function executePass(index, { childConcurrency, mode, incrementalSeed }) {
    const pass = plan.passes[index];
    const passState = manifest.passes[index];
    const passSegment = `${String(index + 1).padStart(2, '0')}-${safePathSegment(pass.key)}`;
    const attemptNumber = passState.attempts.length + 1;
    const attemptSegment = `attempt-${String(attemptNumber).padStart(3, '0')}`;
    const passReportDir = path.join(artifactDir, 'passes', passSegment, attemptSegment);
    const rawReportPath = path.join(passReportDir, RECORDER_MUTATION_REPORT_FILE);
    const logPath = path.join(passReportDir, 'stryker.log');
    const tempDirName =
      `.stryker-recorder-${input.fingerprint.slice(0, 12)}-${passSegment}-` +
      `${attemptSegment}-${randomUUID().slice(0, 8)}-tmp`;
    if (tempDirNames.has(tempDirName)) throw new Error('Recorder pass temp directory repeated');
    tempDirNames.add(tempDirName);
    await fs.mkdir(passReportDir, { recursive: true });
    let incrementalFile;
    const attempt = {
      number: attemptNumber,
      mode,
      childConcurrency,
      status: 'running',
      phase: 'setup',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      exitCode: null,
      rawReportPath: path.relative(artifactDir, rawReportPath),
      reportDir: path.relative(artifactDir, passReportDir),
      logPath: path.relative(artifactDir, logPath),
      tempDirName,
    };
    if (mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL) {
      incrementalFile = path.join(passReportDir, 'incremental-working.json');
      attempt.incrementalWorkingPath = path.relative(artifactDir, incrementalFile);
    }
    passState.status = 'running';
    passState.attempts.push(attempt);
    await persistManifest();
    if (mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL) {
      const immutableSeedPath = resolveArtifactRelativePath(
        artifactDir,
        manifest.incrementalSeed.reportPath,
        'Recorder immutable incremental seed path',
      );
      await fs.copyFile(immutableSeedPath, incrementalFile, fsConstants.COPYFILE_EXCL);
      attempt.seedInputSha256 = await sha256File(incrementalFile);
      if (attempt.seedInputSha256 !== manifest.incrementalSeed.reportSha256) {
        throw new Error('Recorder integration working seed copy differs from immutable seed');
      }
    }
    attempt.phase = 'execution';
    await persistManifest();
    console.log(
      `\n=== Recorder mutation pass: ${pass.key} ` +
        `(${pass.selector}; ${pass.testFile}; ${mode}; attempt ${attemptNumber}) ===`,
    );
    let exitCode;
    let passError;
    try {
      exitCode = await runPass({
        appDir,
        childConcurrency,
        environment: executionEnvironment,
        incrementalFile,
        mode,
        pass,
        passReportDir,
        reportPath: rawReportPath,
        logPath,
        signal: stop.signal,
        tempDirName,
      });
    } catch (error) {
      exitCode = 1;
      passError = error;
    }
    attempt.exitCode = exitCode;
    attempt.finishedAt = new Date().toISOString();
    if (exitCode === 0) {
      try {
        const rawReport = await readJsonObject(rawReportPath, `Recorder pass ${pass.key} report`);
        attempt.rawReportSha256 = await sha256File(rawReportPath);
        if (mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL) {
          await readJsonObject(incrementalFile, 'Recorder overwritten incremental working report');
          attempt.incrementalWorkingSha256 = await sha256File(incrementalFile);
          if (attempt.incrementalWorkingSha256 === attempt.seedInputSha256) {
            throw new Error('Stryker did not overwrite the Recorder incremental working copy');
          }
          const normalized = normalizeIncrementalReport({
            rawReport,
            seedResult: incrementalSeed,
            integrationPass: pass,
            currentSource: recorderSource,
          });
          const normalizedPath = path.join(passReportDir, 'normalized-report.json');
          const auditPath = path.join(passReportDir, 'normalization-audit.json');
          const normalizedArtifact = await persistJsonArtifact(
            normalizedPath,
            normalized.report,
            false,
          );
          const auditArtifact = await persistJsonArtifact(auditPath, normalized.audit, true);
          attempt.reportPath = path.relative(artifactDir, normalizedPath);
          attempt.reportSha256 = normalizedArtifact.sha256;
          attempt.normalizationAuditPath = path.relative(artifactDir, auditPath);
          attempt.normalizationAuditSha256 = auditArtifact.sha256;
          attempt.skippedDuePriorKillSignatures = [...normalized.skippedDuePriorKillSignatures];
        } else {
          attempt.reportPath = attempt.rawReportPath;
          attempt.reportSha256 = attempt.rawReportSha256;
        }
        attempt.status = 'completed';
        attempt.phase = 'complete';
        passState.status = 'completed';
      } catch (error) {
        exitCode = 1;
        attempt.exitCode = 1;
        attempt.status = 'failed';
        passState.status = 'failed';
        passError = error;
      }
    } else {
      attempt.status = stop.signal.aborted ? 'stopped' : 'failed';
      passState.status = attempt.status;
    }
    if (exitCode !== 0) {
      if (passError) attempt.error = String(passError.stack || passError.message || passError);
      failedPasses.push({ key: pass.key, exitCode, error: passError });
      if (!continueOnFailure && !stop.signal.aborted) {
        failureTriggeredStop = true;
        stop.abort({ kind: 'pass-failure', passKey: pass.key, signal: 'SIGTERM' });
      }
    }
    await persistManifest();
  }

  async function runStage(indexes, concurrency, options) {
    const pending = indexes.filter((index) => manifest.passes[index].status !== 'completed');
    let next = 0;
    async function worker() {
      while (!stop.signal.aborted) {
        const index = pending[next];
        next += 1;
        if (index === undefined) return;
        try {
          await executePass(index, options);
        } catch (error) {
          const pass = plan.passes[index];
          const passState = manifest.passes[index];
          let attempt = passState.attempts.at(-1);
          if (!attempt || attempt.status !== 'running') {
            attempt = {
              number: passState.attempts.length + 1,
              mode: options.mode,
              childConcurrency: options.childConcurrency,
              status: 'failed',
              phase: 'setup',
              startedAt: new Date().toISOString(),
              finishedAt: new Date().toISOString(),
              exitCode: 1,
            };
            passState.attempts.push(attempt);
          } else {
            attempt.status = 'failed';
            attempt.finishedAt = new Date().toISOString();
            attempt.exitCode = 1;
          }
          attempt.error = String(error.stack || error.message || error);
          passState.status = 'failed';
          failedPasses.push({ key: pass.key, exitCode: 1, error });
          if (!continueOnFailure && !stop.signal.aborted) {
            failureTriggeredStop = true;
            stop.abort({ kind: 'pass-setup-failure', passKey: pass.key, signal: 'SIGTERM' });
          }
          await persistManifest();
        }
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, pending.length || 1) }, () =>
      worker().catch((error) => {
        failureTriggeredStop = true;
        stop.abort({ kind: 'stage-internal-failure', signal: 'SIGTERM' });
        throw error;
      }),
    );
    const results = await Promise.allSettled(workers);
    const rejected = results.find(({ status }) => status === 'rejected');
    if (rejected) throw rejected.reason;
  }

  async function recordStageFailure(error, stage) {
    validationError = error;
    failureTriggeredStop = true;
    manifest.status = 'failed';
    manifest.validationError = String(error.stack || error.message || error);
    if (!failedPasses.some(({ key }) => key === stage)) {
      failedPasses.push({ key: stage, exitCode: 1, error });
    }
    stop.abort({ kind: 'stage-internal-failure', stage, signal: 'SIGTERM' });
    await persistManifest();
  }

  try {
    try {
      await runStage(fastCheapIndexes, budget.cheapPassConcurrency, {
        childConcurrency: 1,
        mode: RECORDER_PASS_MODE_COVERAGE_ALL,
      });
    } catch (error) {
      await recordStageFailure(error, 'cheap-pass-stage');
    }

    if (!stop.signal.aborted && failedPasses.length === 0 && !validationError) {
      try {
        await runStage([sentinelIndex], 1, {
          childConcurrency: budget.integrationConcurrency,
          mode: RECORDER_PASS_MODE_COVERAGE_ALL,
        });
      } catch (error) {
        await recordStageFailure(error, 'sentinel-stage');
      }
    }

    if (!stop.signal.aborted && failedPasses.length === 0 && incrementalEnabled) {
      try {
        seedResult = await prepareKilledSeed();
        await validateCompletedIncrementalAttempt();
      } catch (error) {
        validationError = error;
        manifest.validationError = String(error.stack || error.message || error);
        failedPasses.push({ key: 'incremental-seed', exitCode: 1, error });
        failureTriggeredStop = true;
        stop.abort({ kind: 'seed-failure', signal: 'SIGTERM' });
        await persistManifest();
      }
    }

    if (!stop.signal.aborted && failedPasses.length === 0 && !validationError) {
      try {
        await runStage([integrationIndex], 1, {
          childConcurrency: budget.integrationConcurrency,
          mode: incrementalEnabled
            ? RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL
            : RECORDER_PASS_MODE_COVERAGE_ALL,
          incrementalSeed: seedResult,
        });
      } catch (error) {
        await recordStageFailure(error, 'integration-stage');
      }
    }

    if (!stop.signal.aborted && failedPasses.length === 0) {
      try {
        const fingerprintAfter = await createInputFingerprint({
          appDir,
          environment: executionEnvironment,
          plan,
        });
        if (fingerprintAfter.fingerprint !== input.fingerprint) {
          throw new Error('Recorder mutation inputs changed while passes were running');
        }
        const passReports = [];
        for (const [index, pass] of plan.passes.entries()) {
          const passState = manifest.passes[index];
          const completedAttempt = [...passState.attempts]
            .reverse()
            .find(({ status }) => status === 'completed');
          if (!completedAttempt) throw new Error(`Recorder pass ${pass.key} is incomplete`);
          const reportPath = resolveArtifactRelativePath(
            artifactDir,
            completedAttempt.reportPath,
            `Recorder pass ${pass.key} reportPath`,
          );
          if (completedAttempt.reportSha256 !== (await sha256File(reportPath))) {
            throw new Error(`Recorder pass ${pass.key} report hash changed after completion`);
          }
          passReports.push({
            pass,
            report: await readJsonObject(reportPath, `Recorder pass ${pass.key} report`),
            ...(completedAttempt.mode === RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL
              ? {
                  mode: RECORDER_PASS_MODE_COVERAGE_OFF_INCREMENTAL,
                  skippedDuePriorKillSignatures: [
                    ...(completedAttempt.skippedDuePriorKillSignatures ?? []),
                  ],
                }
              : {}),
          });
        }
        const merged = mergePassData({ passReports, plan });
        if (incrementalEnabled) {
          const integrationAttempt = latestCompletedAttempt(manifest.passes[integrationIndex]);
          const normalizationAuditPath = resolveArtifactRelativePath(
            artifactDir,
            integrationAttempt.normalizationAuditPath,
            'Recorder integration normalization audit path',
          );
          const normalizationAudit = await readJsonObject(
            normalizationAuditPath,
            'Recorder integration normalization audit',
          );
          incrementalAudit = {
            schemaVersion: 1,
            enabled: true,
            runFingerprint: input.fingerprint,
            artifactRoot: path.relative(reportDir, artifactDir),
            universeCount: manifest.incrementalSeed.universeCount,
            seededCount: manifest.incrementalSeed.seededCount,
            executedNonseedCount:
              manifest.incrementalSeed.universeCount - manifest.incrementalSeed.seededCount,
            seedReportSha256: manifest.incrementalSeed.reportSha256,
            seedAuditSha256: manifest.incrementalSeed.auditSha256,
            rawReportSha256: integrationAttempt.rawReportSha256,
            overwrittenIncrementalWorkSha256: integrationAttempt.incrementalWorkingSha256,
            normalizedReportSha256: integrationAttempt.reportSha256,
            normalizationAuditSha256: integrationAttempt.normalizationAuditSha256,
            rawStatusCounts: normalizationAudit.rawStatusCounts,
            observationStatusCounts: normalizationAudit.observationStatusCounts,
            skippedDuePriorKillSignatures: [...integrationAttempt.skippedDuePriorKillSignatures],
            seededReuse: normalizationAudit.seededReuse,
            strippedReferences: normalizationAudit.strippedReferences,
            artifacts: {
              seedReport: manifest.incrementalSeed.reportPath,
              seedAudit: manifest.incrementalSeed.auditPath,
              rawIntegrationReport: integrationAttempt.rawReportPath,
              overwrittenIncrementalWork: integrationAttempt.incrementalWorkingPath,
              normalizedIntegrationReport: integrationAttempt.reportPath,
              normalizationAudit: integrationAttempt.normalizationAuditPath,
            },
          };
        } else {
          incrementalAudit = {
            schemaVersion: 1,
            enabled: false,
            runFingerprint: input.fingerprint,
            artifactRoot: path.relative(reportDir, artifactDir),
          };
        }
        const mergedForPublication = {
          ...merged,
          sidecar: { ...merged.sidecar, incrementalDominance: incrementalAudit },
        };
        await validateMergedReport({
          appDir,
          laneNames: ['recorder'],
          lanes: mutationLanes,
          reportsByLane: { recorder: mergedForPublication.report },
        });
        const html = await renderReportHtml(mergedForPublication.report);
        publication = await publishMergedRecorderReports({
          reportDir,
          html,
          ...mergedForPublication,
        });
        manifest.status = 'complete';
        manifest.publication = publication;
        manifest.incrementalDominance = incrementalAudit;
      } catch (error) {
        validationError = error;
        manifest.status = 'validation-failed';
        manifest.validationError = String(error.stack || error.message || error);
      }
    } else if (failureTriggeredStop || (!stop.signal.aborted && failedPasses.length)) {
      manifest.status = 'failed';
    } else if (stop.signal.aborted) {
      manifest.status = 'stopped';
    }
    if (stop.signal.aborted) manifest.stopReason = stop.signal.reason;
    await persistManifest();

    const succeeded = manifest.status === 'complete' && publication && !validationError;
    return {
      exitCode: succeeded
        ? 0
        : failureTriggeredStop || (!stop.signal.aborted && failedPasses.length) || validationError
          ? 1
          : 143,
      aborted: stop.signal.aborted,
      artifactDir,
      completedPasses: manifest.passes
        .filter(({ status }) => status === 'completed')
        .map(({ key }) => key),
      failedPasses,
      manifestPath,
      plan,
      publication,
      resumedPasses: manifest.passes
        .filter(({ attempts }) => attempts.length > 0 && attempts.at(-1).number > 1)
        .map(({ key }) => key),
      validationError,
    };
  } finally {
    stop.cleanup();
    await Promise.all(
      [...tempDirNames].map((tempDirName) =>
        fs.rm(path.join(appDir, tempDirName), { recursive: true, force: true }),
      ),
    );
  }
}
