import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const mutationProvenanceSchemaVersion = 1;

export const mutationEnvironmentVariableNames = Object.freeze([
  'ADS_AUDIENCE_MODE',
  'ADS_ENABLED',
  'ADS_HISTORY_NATIVE_ENABLED',
  'ADS_HOME_BANNER_ENABLED',
  'AI_MAX_CONCURRENCY',
  'ASSESS_DAILY_CAP',
  'ASSESS_GLOBAL_DAILY_CAP',
  'ASSESS_IP_DAILY_CAP',
  'AUDIO_INSPECTION_MAX_CONCURRENCY',
  'CI',
  'CORS_ORIGINS',
  'DATABASE_URL',
  'DB_LOCK_TIMEOUT_MS',
  'DB_POOL_MAX',
  'DB_STATEMENT_TIMEOUT_MS',
  'FFMPEG_PATH',
  'FFPROBE_PATH',
  'GRADING_MODEL',
  'JWT_SECRET',
  'LANG',
  'LC_ALL',
  'LOG_LEVEL',
  'MAIL_MODE',
  'MAIL_WEBHOOK_URL',
  'METRICS_ENABLED',
  'MIN_CLIENT_VERSION',
  'MOCK_AI',
  'NODE_ENV',
  'NODE_OPTIONS',
  'OPENAI_API_KEY',
  'OPENAI_TIMEOUT_MS',
  'PATH',
  'PGPORT',
  'PORT',
  'RATE_LIMIT_ASSESS_MAX',
  'RATE_LIMIT_ASSESS_WINDOW_MS',
  'RATE_LIMIT_AUTH_MAX',
  'RATE_LIMIT_AUTH_WINDOW_MS',
  'RATE_LIMIT_FORGOT_EMAIL_MAX',
  'RATE_LIMIT_FORGOT_EMAIL_WINDOW_MS',
  'RATE_LIMIT_GLOBAL_MAX',
  'RATE_LIMIT_GLOBAL_STORE',
  'RATE_LIMIT_GLOBAL_WINDOW_MS',
  'RATE_LIMIT_LOGIN_ACCOUNT_MAX',
  'RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS',
  'RATE_LIMIT_PASSWORD_MAX',
  'RATE_LIMIT_PASSWORD_WINDOW_MS',
  'RATE_LIMIT_PLAYBACK_GRANT_MAX',
  'RATE_LIMIT_PLAYBACK_GRANT_WINDOW_MS',
  'RATE_LIMIT_REGISTER_MAX',
  'RATE_LIMIT_REGISTER_WINDOW_MS',
  'RATE_LIMIT_UPLOAD_GRANT_MAX',
  'RATE_LIMIT_UPLOAD_GRANT_WINDOW_MS',
  'RECORDING_MAINTENANCE_BATCH_SIZE',
  'RECORDING_MAINTENANCE_CONCURRENCY',
  'RECORDING_MAINTENANCE_INTERVAL_MS',
  'RECORDING_PLAYBACK_URL_TTL_SECONDS',
  'S3_ACCESS_KEY_ID',
  'S3_DIAGNOSTIC_BUCKET',
  'S3_DIAGNOSTIC_REGION',
  'S3_OPERATION_TIMEOUT_MS',
  'S3_PRACTICE_BUCKET',
  'S3_PRACTICE_REGION',
  'S3_SECRET_ACCESS_KEY',
  'S3_SESSION_TOKEN',
  'S3_UPLOAD_URL_TTL_SECONDS',
  'SHUTDOWN_DRAIN_MS',
  'TEST_DATABASE_URL',
  'TRUST_PROXY',
  'TZ',
]);

export const mutationToolPackageNames = Object.freeze([
  '@stryker-mutator/core',
  '@stryker-mutator/vitest-runner',
  'tsx',
  'typescript',
  'vitest',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function stableRuntimeIdentity(runtime) {
  if (runtime !== undefined) return runtime;
  return {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    versions: Object.fromEntries(
      Object.entries(process.versions).toSorted(([left], [right]) => left.localeCompare(right)),
    ),
  };
}

function environmentFingerprint(environment) {
  const hash = createHash('sha256');
  for (const name of mutationEnvironmentVariableNames) {
    const value = environment[name];
    hash.update(`${name}\0${value === undefined ? '<unset>' : String(value)}\0`);
  }
  return hash.digest('hex');
}

function excludedStableInput(relativeFileName) {
  const normalized = relativeFileName.replaceAll(path.sep, '/').replace(/^\.\//, '');
  const segments = normalized.split('/');
  if (
    segments.some(
      (segment) =>
        segment === 'node_modules' ||
        segment === 'reports' ||
        segment === 'dist' ||
        segment === 'coverage' ||
        segment === 'uploads' ||
        segment === '.git' ||
        segment === '.stryker-tmp' ||
        /^\.stryker-.*-tmp$/.test(segment),
    )
  ) {
    return true;
  }
  const baseName = path.posix.basename(normalized);
  if (baseName === '.mutation-campaign.lock' || baseName === '.npmrc') return true;
  if (baseName === '.env' || (baseName.startsWith('.env.') && baseName !== '.env.example')) return true;
  if (/\.(?:key|pem|p12|pfx)$/i.test(baseName)) return true;
  if (/\.tmp-\d+(?:-|$)/.test(baseName)) return true;
  return false;
}

/**
 * Enumerate every tracked or pending-addition backend input while respecting
 * .gitignore. Pending additions matter in a dirty audit workspace: a new source
 * or tool script must influence provenance before it is committed.
 */
export async function listStableMutationInputFiles(serverDir) {
  let stdout;
  let deletedStdout;
  try {
    ({ stdout } = await execFileAsync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: serverDir,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }));
    ({ stdout: deletedStdout } = await execFileAsync('git', ['ls-files', '--deleted', '-z'], {
      cwd: serverDir,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    }));
  } catch (error) {
    throw new Error(`Cannot enumerate backend mutation inputs under ${serverDir}`, { cause: error });
  }
  const deleted = new Set(deletedStdout.split('\0').filter(Boolean));
  const files = stdout
    .split('\0')
    .filter(Boolean)
    .map((fileName) => fileName.replaceAll(path.sep, '/'))
    .filter((fileName) => !deleted.has(fileName))
    .filter((fileName) => !excludedStableInput(fileName))
    .toSorted();
  if (files.length === 0) throw new Error('Backend mutation provenance found no stable workspace inputs');
  return files;
}

async function fingerprintFiles(serverDir, relativeFileNames) {
  const hash = createHash('sha256');
  for (const relativeFileName of [...new Set(relativeFileNames)].toSorted()) {
    const contents = await fs.readFile(path.join(serverDir, relativeFileName));
    hash.update(`${relativeFileName}\0${contents.byteLength}\0`);
    hash.update(contents);
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function installedToolVersions(serverDir) {
  const versions = {};
  for (const packageName of mutationToolPackageNames) {
    const packagePath = path.join(serverDir, 'node_modules', ...packageName.split('/'), 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      versions[packageName] = typeof packageJson.version === 'string' ? packageJson.version : null;
    } catch (error) {
      if (error?.code === 'ENOENT') versions[packageName] = null;
      else throw new Error(`Cannot read installed mutation tool identity for ${packageName}`, { cause: error });
    }
  }
  return versions;
}

export function normalizedMutationReportConfig(config, campaign) {
  if (!isRecord(config)) throw new Error(`Mutation ${campaign} report has no resolved config object`);
  const normalized = structuredClone(config);
  delete normalized.tempDirName;
  delete normalized.jsonReporter;
  delete normalized.htmlReporter;
  if (campaign === 'code') {
    delete normalized.mutate;
    delete normalized.testFiles;
  }
  return normalized;
}

export function mutationReportConfigFingerprint(config, campaign) {
  return sha256(JSON.stringify(normalizedMutationReportConfig(config, campaign)));
}

/** Build the shared, deterministic, secret-free identity for one campaign moment. */
export async function createMutationExecutionIdentity({
  serverDir,
  environment = process.env,
  runtime,
  stableInputFiles,
} = {}) {
  if (typeof serverDir !== 'string' || serverDir.length === 0) throw new Error('serverDir must be a non-empty string');
  const inputFiles = stableInputFiles ?? (await listStableMutationInputFiles(serverDir));
  if (
    !Array.isArray(inputFiles) ||
    inputFiles.length === 0 ||
    inputFiles.some(
      (fileName) =>
        typeof fileName !== 'string' ||
        fileName.length === 0 ||
        path.isAbsolute(fileName) ||
        fileName.replaceAll(path.sep, '/').split('/').includes('..'),
    )
  ) {
    throw new Error('stableInputFiles must contain only non-empty workspace-relative paths');
  }
  const identity = {
    workspaceFingerprint: await fingerprintFiles(serverDir, inputFiles),
    inputFileCount: new Set(inputFiles).size,
    environmentFingerprint: environmentFingerprint(environment),
    runtime: stableRuntimeIdentity(runtime),
    tools: await installedToolVersions(serverDir),
  };
  return { ...identity, fingerprint: sha256(JSON.stringify(identity)) };
}

export async function assertMutationExecutionIdentityUnchanged({ expected, ...options }) {
  const current = await createMutationExecutionIdentity(options);
  if (current.fingerprint !== expected.fingerprint) {
    throw new Error('Backend mutation workspace, toolchain, runtime, or environment changed during the campaign');
  }
  return current;
}

export function mutationProvenancePath(reportDir, laneName) {
  return path.join(reportDir, `${laneName}.provenance.json`);
}

export async function createMutationReportProvenance({ campaign, laneName, reportPath, executionIdentity }) {
  if (campaign !== 'code' && campaign !== 'catalog') throw new Error(`Unknown mutation campaign: ${campaign}`);
  if (typeof laneName !== 'string' || laneName.length === 0) throw new Error('laneName must be a non-empty string');
  const reportSource = await fs.readFile(reportPath, 'utf8');
  let report;
  try {
    report = JSON.parse(reportSource);
  } catch (error) {
    throw new Error(`Mutation report for ${laneName} is not valid JSON`, { cause: error });
  }
  const provenance = {
    schemaVersion: mutationProvenanceSchemaVersion,
    campaign,
    laneName,
    execution: executionIdentity,
    reportFingerprint: sha256(reportSource),
    configFingerprint: mutationReportConfigFingerprint(report.config, campaign),
  };
  return { ...provenance, fingerprint: sha256(JSON.stringify(provenance)) };
}

export async function writeMutationReportProvenance({ reportDir, provenance }) {
  await fs.mkdir(reportDir, { recursive: true });
  const filePath = mutationProvenancePath(reportDir, provenance.laneName);
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, filePath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
  return filePath;
}

function assertProvenanceShape(provenance, { campaign, laneName, filePath }) {
  if (
    !isRecord(provenance) ||
    provenance.schemaVersion !== mutationProvenanceSchemaVersion ||
    provenance.campaign !== campaign ||
    provenance.laneName !== laneName ||
    !isRecord(provenance.execution) ||
    !isSha256(provenance.execution.fingerprint) ||
    !isSha256(provenance.reportFingerprint) ||
    !isSha256(provenance.configFingerprint) ||
    !isSha256(provenance.fingerprint)
  ) {
    throw new Error(`Mutation provenance for ${laneName} at ${filePath} is invalid`);
  }
  const { fingerprint: _fingerprint, ...unsigned } = provenance;
  if (sha256(JSON.stringify(unsigned)) !== provenance.fingerprint) {
    throw new Error(`Mutation provenance for ${laneName} at ${filePath} has an invalid fingerprint`);
  }
}

async function readRecordedProvenance({ reportDir, campaign, laneName }) {
  const filePath = mutationProvenancePath(reportDir, laneName);
  let provenance;
  try {
    provenance = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Mutation provenance for ${laneName} is missing; rerun that campaign before merging`, {
        cause: error,
      });
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Mutation provenance for ${laneName} is not valid JSON`, { cause: error });
    }
    throw error;
  }
  assertProvenanceShape(provenance, { campaign, laneName, filePath });
  return provenance;
}

/** Validate every sidecar against the current workspace and exact JSON report. */
export async function assertMutationReportProvenance({
  reportDir,
  serverDir,
  campaign,
  laneNames,
  reportFileName = (laneName) => `${laneName}.json`,
  environment = process.env,
  runtime,
  stableInputFiles,
}) {
  if (!Array.isArray(laneNames) || laneNames.length === 0) throw new Error('laneNames must be non-empty');
  const execution = await createMutationExecutionIdentity({
    serverDir,
    environment,
    runtime,
    ...(stableInputFiles === undefined ? {} : { stableInputFiles }),
  });
  let sharedConfigFingerprint;
  for (const laneName of laneNames) {
    const recorded = await readRecordedProvenance({ reportDir, campaign, laneName });
    if (recorded.execution.fingerprint !== execution.fingerprint) {
      throw new Error(
        `Mutation provenance for ${laneName} is stale; backend workspace, toolchain, runtime, or environment changed`,
      );
    }
    const expected = await createMutationReportProvenance({
      campaign,
      laneName,
      reportPath: path.join(reportDir, reportFileName(laneName)),
      executionIdentity: execution,
    });
    if (recorded.fingerprint !== expected.fingerprint) {
      throw new Error(`Mutation provenance for ${laneName} does not match its current JSON report or resolved config`);
    }
    if (campaign === 'code') {
      sharedConfigFingerprint ??= recorded.configFingerprint;
      if (recorded.configFingerprint !== sharedConfigFingerprint) {
        throw new Error(`Resolved mutation config differs between code lanes at ${laneName}`);
      }
    }
  }
  return execution;
}
