#!/usr/bin/env node

// Explicitly gated, real-provider/S3 load journey. This is intentionally a
// separate harness from load-1000.mjs: the deterministic mock/direct test must
// remain impossible to point at paid providers by accident.

import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  ListObjectVersionsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import 'dotenv/config';

if (process.env.ALLOW_LIVE_PROVIDER_LOAD !== 'true') {
  throw new Error('refusing paid live load; set ALLOW_LIVE_PROVIDER_LOAD=true explicitly');
}

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(SCRIPT_DIR, '..', 'reports', 'load1000-live');
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NATIVE_LANGUAGES = ['te', 'hi', 'es', 'zh'];
const ENDPOINTS = {
  diagnostic: '/diagnostic/answer',
  practice: '/practice/attempt',
  native: '/practice/attempt/native',
};
const ENDPOINT_SCOPE = {
  [ENDPOINTS.diagnostic]: 'diagnostic',
  [ENDPOINTS.practice]: 'practice',
  [ENDPOINTS.native]: 'practice',
};
const SRS_INTERVALS_DAYS = [1, 3, 7, 21, 60];
const MAX_SERVER_AUDIO_BYTES = 25 * 1024 * 1024;
const WHISPER_USD_PER_MINUTE = 0.006;
const GPT_INPUT_USD_PER_MILLION_TOKENS = 0.15;
const GPT_OUTPUT_USD_PER_MILLION_TOKENS = 0.6;
// Budget the complete system/user context plus the maximum transcript and
// structured-output scaffolding, not merely a typical short request.
const BUDGETED_INPUT_TOKENS_PER_ASSESSMENT = 8_000;
const BUDGETED_OUTPUT_TOKENS_PER_ASSESSMENT = 2_000;

function integerEnv(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  const value = raw === undefined || raw.trim() === '' ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function numberEnv(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  const value = raw === undefined || raw.trim() === '' ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a number from ${minimum} to ${maximum}`);
  }
  return value;
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for live provider load`);
  return value;
}

function booleanFlag(name) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error(`${name} must be exactly true or false when set`);
}

const USER_COUNT = integerEnv('LOAD_USERS', 1_000, 1, 1_000);
const PROVISION_CONCURRENCY = integerEnv('PROVISION_CONCURRENCY', Math.min(100, USER_COUNT), 1, USER_COUNT);
const SESSION_CONCURRENCY = integerEnv('SESSION_CONCURRENCY', USER_COUNT, 1, 1_000);
const PAID_CONCURRENCY = integerEnv('PAID_CONCURRENCY', 10, 1, 100);
const S3_AUDIT_CONCURRENCY = integerEnv('S3_AUDIT_CONCURRENCY', 8, 1, 32);
const REQUEST_TIMEOUT_MS = integerEnv('REQUEST_TIMEOUT_MS', 180_000, 10_000, 300_000);
const S3_OPERATION_TIMEOUT_MS = integerEnv('S3_OPERATION_TIMEOUT_MS', 15_000, 1_000, 60_000);
const CAPACITY_RETRIES = integerEnv('CAPACITY_RETRIES', 12, 0, 100);
const STATUS_POLL_ATTEMPTS = integerEnv('STATUS_POLL_ATTEMPTS', 6, 1, 20);
const FRESH_ASSESSMENT_CEILING = integerEnv('FRESH_ASSESSMENT_CEILING', 5_700, 1, 5_700);
const PAID_ATTEMPT_CEILING = integerEnv('PAID_ATTEMPT_CEILING', 5_800, 1, 6_000);
const MAX_FIXTURE_BYTES = integerEnv('MAX_LIVE_AUDIO_BYTES', 256 * 1024, 1, 256 * 1024);
const MAX_FIXTURE_DURATION_SECONDS = numberEnv('MAX_LIVE_AUDIO_SECONDS', 15, 0.5, 15);
const LIVE_BUDGET_USD = numberEnv('LIVE_BUDGET_USD', 25, 1, 25);
const INFRASTRUCTURE_RESERVE_USD = numberEnv('INFRASTRUCTURE_RESERVE_USD', 5, 0, 10);
const LIVE_TRANSCRIPTION_MODEL = requiredEnv('LIVE_TRANSCRIPTION_MODEL');
const LIVE_GRADING_MODEL = requiredEnv('LIVE_GRADING_MODEL');
if (LIVE_TRANSCRIPTION_MODEL !== 'whisper-1') {
  throw new Error('LIVE_TRANSCRIPTION_MODEL must be exactly whisper-1');
}
if (LIVE_GRADING_MODEL !== 'gpt-4o-mini-2024-07-18') {
  throw new Error('LIVE_GRADING_MODEL must be exactly gpt-4o-mini-2024-07-18');
}
const campaignStateInput = requiredEnv('LIVE_CAMPAIGN_STATE_FILE');
if (!path.isAbsolute(campaignStateInput)) {
  throw new Error('LIVE_CAMPAIGN_STATE_FILE must be an absolute path');
}
const CAMPAIGN_STATE_FILE = path.resolve(campaignStateInput);
const METRICS_EXPECTED = requiredEnv('METRICS_EXPECTED').toLowerCase();
if (!['enabled', 'disabled'].includes(METRICS_EXPECTED)) {
  throw new Error("METRICS_EXPECTED must be 'enabled' or 'disabled'");
}

const BASE_INPUT = process.env.BASE_URL?.trim() || 'http://127.0.0.1:4000';
let baseUrl;
try {
  baseUrl = new URL(BASE_INPUT);
} catch {
  throw new Error('BASE_URL must be a valid absolute URL');
}
if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('BASE_URL must use HTTP or HTTPS');
if (
  baseUrl.username ||
  baseUrl.password ||
  baseUrl.search ||
  baseUrl.hash ||
  (baseUrl.pathname !== '/' && baseUrl.pathname !== '')
) {
  throw new Error('BASE_URL must contain only an origin');
}
const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname);
if (!loopback && process.env.ALLOW_NON_LOOPBACK_LOAD !== 'true') {
  throw new Error('non-loopback live load requires ALLOW_NON_LOOPBACK_LOAD=true');
}
if (!loopback && baseUrl.protocol !== 'https:') throw new Error('non-loopback live load requires HTTPS');
const VIRTUAL_SOURCE_IPS = booleanFlag('VIRTUAL_SOURCE_IPS');
if (VIRTUAL_SOURCE_IPS && !booleanFlag('ALLOW_VIRTUAL_SOURCE_IPS')) {
  throw new Error('VIRTUAL_SOURCE_IPS=true requires the separate ALLOW_VIRTUAL_SOURCE_IPS=true safety gate');
}
if (VIRTUAL_SOURCE_IPS && !loopback) {
  throw new Error('virtual source IP simulation is permitted only against a loopback BASE_URL');
}
const BASE = baseUrl.origin;

const RFC2544_ADDRESS_COUNT = 2 * 256 * 256;
const SYSTEM_VIRTUAL_SOURCE_OFFSET = RFC2544_ADDRESS_COUNT - 2;

function rfc2544Address(offset) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= RFC2544_ADDRESS_COUNT) {
    throw new Error('RFC 2544 source address offset is outside 198.18.0.0/15');
  }
  const secondOctet = 18 + Math.floor(offset / (256 * 256));
  const withinSecondOctet = offset % (256 * 256);
  const thirdOctet = Math.floor(withinSecondOctet / 256);
  const fourthOctet = withinSecondOctet % 256;
  return `198.${secondOctet}.${thirdOctet}.${fourthOctet}`;
}

function userVirtualSourceIp(index) {
  return rfc2544Address(index + 1);
}

function virtualSourceAssignmentDigest(userCount) {
  const assignments = [`system=${rfc2544Address(SYSTEM_VIRTUAL_SOURCE_OFFSET)}`];
  for (let index = 0; index < userCount; index++) {
    assignments.push(`user:${index}=${userVirtualSourceIp(index)}`);
  }
  return sha256(assignments.join('\n'));
}

const targets = {
  diagnostic: {
    bucket: requiredEnv('S3_DIAGNOSTIC_BUCKET'),
    region: requiredEnv('S3_DIAGNOSTIC_REGION'),
  },
  practice: {
    bucket: requiredEnv('S3_PRACTICE_BUCKET'),
    region: requiredEnv('S3_PRACTICE_REGION'),
  },
};
if (targets.diagnostic.bucket === targets.practice.bucket) {
  throw new Error('diagnostic and practice live-load buckets must differ');
}
const configuredS3Credentials =
  process.env.S3_ACCESS_KEY_ID?.trim() && process.env.S3_SECRET_ACCESS_KEY?.trim()
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY.trim(),
        ...(process.env.S3_SESSION_TOKEN?.trim() ? { sessionToken: process.env.S3_SESSION_TOKEN.trim() } : {}),
      }
    : undefined;
for (const target of Object.values(targets)) {
  target.client = new S3Client({
    region: target.region,
    ...(configuredS3Credentials ? { credentials: configuredS3Credentials } : {}),
  });
}

const appConfig = JSON.parse(await readFile(new URL('../../app/app.json', import.meta.url), 'utf8'));
const CLIENT_VERSION = appConfig?.expo?.version;
if (typeof CLIENT_VERSION !== 'string' || CLIENT_VERSION.length === 0) {
  throw new Error('app/app.json must provide expo.version');
}

const runStartedMs = Date.now();
const runId = `${runStartedMs}_${randomUUID().slice(0, 8)}`;
const emailPrefix = `live1000_${runId}_`;
const PASSWORD = `LiveLoad-${randomUUID()}-9a`;
const NEW_PASSWORD = `LiveLoad-${randomUUID()}-8b`;
const runAbortController = new AbortController();
let interruptedBy = null;
const interruptRun = (signal) => {
  if (interruptedBy) return;
  interruptedBy = signal;
  console.error(`live load received ${signal}; stopping new work and entering cleanup`);
  runAbortController.abort(new Error(`interrupted by ${signal}`));
};
const onSigint = () => interruptRun('SIGINT');
const onSigterm = () => interruptRun('SIGTERM');
process.once('SIGINT', onSigint);
process.once('SIGTERM', onSigterm);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function responseDigest(value) {
  return sha256(canonicalJson(value));
}

function safeFailureMessage(value) {
  return String(value)
    .replaceAll(CAMPAIGN_STATE_FILE, '[REDACTED_CAMPAIGN_STATE_PATH]')
    .replaceAll(cleanupJournalFile, '[REDACTED_CLEANUP_JOURNAL_PATH]')
    .replace(/audio-uploads\/[A-Za-z0-9_./-]+/g, '[REDACTED_S3_KEY]')
    .replace(/https:\/\/[^\s"']*\.amazonaws\.com[^\s"']*/gi, '[REDACTED_S3_URL]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .slice(0, 300);
}

function parsePathList(value) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

const generalAudioPaths = [...parsePathList(process.env.AUDIO_FILES), ...parsePathList(process.env.AUDIO_FILE)];
if (generalAudioPaths.length === 0) {
  throw new Error('AUDIO_FILES or AUDIO_FILE must name at least one controlled live audio fixture');
}
const englishAudioPaths = parsePathList(process.env.AUDIO_FILES_ENGLISH);
const audioPathGroups = {
  english: englishAudioPaths.length > 0 ? englishAudioPaths : generalAudioPaths,
  te: parsePathList(process.env.AUDIO_FILE_TE),
  hi: parsePathList(process.env.AUDIO_FILE_HI),
  es: parsePathList(process.env.AUDIO_FILE_ES),
  zh: parsePathList(process.env.AUDIO_FILE_ZH),
};
for (const language of NATIVE_LANGUAGES) {
  if (audioPathGroups[language].length === 0) audioPathGroups[language] = generalAudioPaths;
}

function mediaTypeForExtension(extension) {
  switch (extension) {
    case '.m4a':
    case '.mp4':
      return 'audio/mp4';
    case '.mp3':
      return 'audio/mpeg';
    case '.wav':
      return 'audio/wav';
    case '.ogg':
    case '.oga':
      return 'audio/ogg';
    case '.webm':
      return 'audio/webm';
    case '.flac':
      return 'audio/flac';
    default:
      return undefined;
  }
}

async function inspectAudioFixture(filePath, id) {
  const metadata = await stat(filePath);
  if (!metadata.isFile() || metadata.size < 1) throw new Error(`audio fixture ${id} must be a non-empty regular file`);
  if (metadata.size > MAX_FIXTURE_BYTES) {
    throw new Error(`audio fixture ${id} exceeds conservative ${MAX_FIXTURE_BYTES}-byte live-load limit`);
  }
  const extension = path.extname(filePath).toLowerCase();
  const contentType = mediaTypeForExtension(extension);
  if (!contentType) throw new Error(`audio fixture ${id} has an unsupported extension`);
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      process.env.FFPROBE_PATH || 'ffprobe',
      ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index:format=duration', '-of', 'json', filePath],
      {
        timeout: 10_000,
        maxBuffer: 64 * 1024,
      },
    ));
  } catch {
    throw new Error(`ffprobe could not inspect audio fixture ${id}`);
  }
  let probe;
  try {
    probe = JSON.parse(stdout);
  } catch {
    throw new Error(`ffprobe returned invalid JSON for audio fixture ${id}`);
  }
  if (!Array.isArray(probe.streams) || probe.streams.length !== 1) {
    throw new Error(`audio fixture ${id} must contain exactly one audio stream`);
  }
  const durationSeconds = Number(probe.format?.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0.5 || durationSeconds > MAX_FIXTURE_DURATION_SECONDS) {
    throw new Error(`audio fixture ${id} duration must be from 0.5 to ${MAX_FIXTURE_DURATION_SECONDS} seconds`);
  }
  const bytes = await readFile(filePath);
  return {
    id,
    filePath,
    bytes,
    sha256: sha256(bytes),
    sizeBytes: bytes.length,
    durationSeconds,
    contentType,
    extension,
  };
}

const uniqueAudioPaths = [...new Set(Object.values(audioPathGroups).flat())];
const audioCorpusInternal = await Promise.all(
  uniqueAudioPaths.map((filePath, index) => inspectAudioFixture(filePath, `audio-${index + 1}`)),
);
const audioByPath = new Map(audioCorpusInternal.map((audio) => [audio.filePath, audio]));
const audioGroups = Object.fromEntries(
  Object.entries(audioPathGroups).map(([name, paths]) => [name, paths.map((filePath) => audioByPath.get(filePath))]),
);
const maxFixtureDuration = Math.max(...audioCorpusInternal.map((audio) => audio.durationSeconds));
const whisperUpperBoundPerPaidAttemptUsd = (maxFixtureDuration / 60) * WHISPER_USD_PER_MINUTE;
const gradingUpperBoundPerPaidAttemptUsd =
  (BUDGETED_INPUT_TOKENS_PER_ASSESSMENT * GPT_INPUT_USD_PER_MILLION_TOKENS) / 1_000_000 +
  (BUDGETED_OUTPUT_TOKENS_PER_ASSESSMENT * GPT_OUTPUT_USD_PER_MILLION_TOKENS) / 1_000_000;
const upperBoundPerPaidAttemptUsd = whisperUpperBoundPerPaidAttemptUsd + gradingUpperBoundPerPaidAttemptUsd;
const projectedWhisperUsd = PAID_ATTEMPT_CEILING * whisperUpperBoundPerPaidAttemptUsd;
const projectedGptUsd = PAID_ATTEMPT_CEILING * gradingUpperBoundPerPaidAttemptUsd;
const projectedProviderUsd = projectedWhisperUsd + projectedGptUsd;
const projectedWorstCaseUsd = projectedProviderUsd + INFRASTRUCTURE_RESERVE_USD;
if (projectedWorstCaseUsd > LIVE_BUDGET_USD) {
  throw new Error(
    `worst-case live-load projection $${projectedWorstCaseUsd.toFixed(2)} exceeds $${LIVE_BUDGET_USD.toFixed(2)} budget`,
  );
}

const pricingManifest = {
  currency: 'USD',
  transcription: {
    model: LIVE_TRANSCRIPTION_MODEL,
    usdPerMinute: WHISPER_USD_PER_MINUTE,
  },
  grading: {
    model: LIVE_GRADING_MODEL,
    inputUsdPerMillionTokens: GPT_INPUT_USD_PER_MILLION_TOKENS,
    outputUsdPerMillionTokens: GPT_OUTPUT_USD_PER_MILLION_TOKENS,
    budgetedInputTokensPerAttempt: BUDGETED_INPUT_TOKENS_PER_ASSESSMENT,
    budgetedOutputTokensPerAttempt: BUDGETED_OUTPUT_TOKENS_PER_ASSESSMENT,
  },
  maxFixtureDurationSeconds: maxFixtureDuration,
  upperBoundPerPaidAttemptUsd,
};
const campaignLockFile = `${CAMPAIGN_STATE_FILE}.lock`;
const cleanupJournalFile = `${CAMPAIGN_STATE_FILE}.${runId}.s3-cleanup.journal`;
let campaignLockHandle;
let cleanupJournalHandle;
let campaignState;
let campaignReservationActive = false;
let campaignStateSummary = {
  stateFileHash: sha256(CAMPAIGN_STATE_FILE),
  lockFileHash: sha256(campaignLockFile),
  cleanupJournalFileHash: sha256(cleanupJournalFile),
  status: 'not-prepared',
  activeReservation: false,
  priorPaidAttempts: null,
  reservedPaidAttempts: PAID_ATTEMPT_CEILING,
  actualPotentialPaidAttempts: null,
  cumulativeUpperBoundBeforeUsd: null,
  cumulativeUpperBoundAfterUsd: null,
};

async function writeDurableJson(filePath, value) {
  try {
    const existing = await lstat(filePath);
    if (!existing.isFile() || existing.isSymbolicLink() || (existing.mode & 0o077) !== 0) {
      throw new Error('refusing to replace a non-private or non-regular campaign state file');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const tempPath = `${filePath}.${runId}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(tempPath, 'wx', 0o600);
    await handle.chmod(0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(tempPath, filePath);
    const directoryHandle = await open(path.dirname(filePath), 'r');
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  } finally {
    await handle?.close().catch(() => undefined);
    await unlink(tempPath).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
}

async function readCampaignStateIfPresent() {
  try {
    const metadata = await lstat(CAMPAIGN_STATE_FILE);
    if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o077) !== 0) {
      throw new Error('LIVE_CAMPAIGN_STATE_FILE must be a private 0600 regular file');
    }
    const parsed = JSON.parse(await readFile(CAMPAIGN_STATE_FILE, 'utf8'));
    return parsed;
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}

function parsePriorPaidAttempts() {
  const raw = process.env.LIVE_PRIOR_PAID_ATTEMPTS;
  if (raw === undefined || raw.trim() === '') {
    throw new Error(
      'creating a campaign state requires explicit LIVE_PRIOR_PAID_ATTEMPTS, including 0 for a new campaign',
    );
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) {
    throw new Error('LIVE_PRIOR_PAID_ATTEMPTS must be an integer from 0 to 1000000');
  }
  return value;
}

async function prepareCampaignBudget() {
  await mkdir(path.dirname(CAMPAIGN_STATE_FILE), { recursive: true, mode: 0o700 });
  try {
    campaignLockHandle = await open(campaignLockFile, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error('live campaign lock already exists; audit the retained reservation before manual recovery', {
        cause: error,
      });
    }
    throw error;
  }
  await campaignLockHandle.chmod(0o600);
  await campaignLockHandle.writeFile(
    `${JSON.stringify({ schemaVersion: 1, runId, createdAt: new Date().toISOString() })}\n`,
  );
  await campaignLockHandle.sync();

  campaignState = await readCampaignStateIfPresent();
  if (!campaignState) {
    const priorPaidAttempts = parsePriorPaidAttempts();
    const initialUpperBoundUsd = priorPaidAttempts * upperBoundPerPaidAttemptUsd;
    campaignState = {
      schemaVersion: 1,
      budgetUsd: LIVE_BUDGET_USD,
      oneTimeInfrastructureReserveUsd: INFRASTRUCTURE_RESERVE_USD,
      models: { transcription: LIVE_TRANSCRIPTION_MODEL, grading: LIVE_GRADING_MODEL },
      upperBoundPerPaidAttemptUsd,
      initialPriorPaidAttempts: priorPaidAttempts,
      cumulativePotentialPaidAttempts: priorPaidAttempts,
      cumulativeUpperBoundUsd: initialUpperBoundUsd,
      runs: [],
      activeReservation: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeDurableJson(CAMPAIGN_STATE_FILE, campaignState);
  }
  if (
    campaignState.schemaVersion !== 1 ||
    campaignState.models?.transcription !== LIVE_TRANSCRIPTION_MODEL ||
    campaignState.models?.grading !== LIVE_GRADING_MODEL ||
    Math.abs(Number(campaignState.upperBoundPerPaidAttemptUsd) - upperBoundPerPaidAttemptUsd) > 0.000_000_001
  ) {
    throw new Error('campaign state schema/model pins do not match this harness');
  }
  if (campaignState.budgetUsd !== LIVE_BUDGET_USD) {
    throw new Error('LIVE_BUDGET_USD must match the existing campaign state');
  }
  if (campaignState.oneTimeInfrastructureReserveUsd !== INFRASTRUCTURE_RESERVE_USD) {
    throw new Error('INFRASTRUCTURE_RESERVE_USD must match the existing campaign state');
  }
  if (campaignState.activeReservation) {
    throw new Error('campaign contains an active reservation from an unfinished run; manual audit is required');
  }
  const cumulativeBefore = Number(campaignState.cumulativeUpperBoundUsd);
  if (!Number.isFinite(cumulativeBefore) || cumulativeBefore < 0) {
    throw new Error('campaign cumulative upper-bound spend is invalid');
  }
  if (cumulativeBefore + projectedProviderUsd + INFRASTRUCTURE_RESERVE_USD > LIVE_BUDGET_USD) {
    throw new Error(
      `campaign provider upper bound $${cumulativeBefore.toFixed(2)} plus reservation $${projectedProviderUsd.toFixed(2)} and reserve $${INFRASTRUCTURE_RESERVE_USD.toFixed(2)} exceeds $${LIVE_BUDGET_USD.toFixed(2)}`,
    );
  }
  campaignState.activeReservation = {
    runId,
    createdAt: new Date().toISOString(),
    paidAttemptCeiling: PAID_ATTEMPT_CEILING,
    providerUpperBoundUsd: projectedProviderUsd,
  };
  campaignState.updatedAt = new Date().toISOString();
  await writeDurableJson(CAMPAIGN_STATE_FILE, campaignState);
  campaignReservationActive = true;
  campaignStateSummary = {
    ...campaignStateSummary,
    status: 'reserved',
    activeReservation: true,
    priorPaidAttempts: campaignState.cumulativePotentialPaidAttempts,
    cumulativeUpperBoundBeforeUsd: cumulativeBefore,
    protectedExposureBeforeRunUsd: cumulativeBefore + projectedProviderUsd + INFRASTRUCTURE_RESERVE_USD,
  };
}

async function prepareCleanupJournal() {
  cleanupJournalHandle = await open(cleanupJournalFile, 'wx', 0o600);
  await cleanupJournalHandle.chmod(0o600);
  await cleanupJournalHandle.appendFile(
    `${JSON.stringify({ schemaVersion: 1, runId, createdAt: new Date().toISOString() })}\n`,
    'utf8',
  );
  await cleanupJournalHandle.sync();
}

async function appendCleanupJournal(scope, rawKey, keyHash) {
  if (!cleanupJournalHandle) throw new Error('S3 cleanup journal is not open');
  await cleanupJournalHandle.appendFile(`${JSON.stringify({ scope, rawKey, keyHash })}\n`, 'utf8');
  await cleanupJournalHandle.sync();
}

async function finishCampaignBudget(outcome) {
  if (!campaignReservationActive) return;
  if (campaignState.activeReservation?.runId !== runId) {
    throw new Error('campaign reservation ownership changed');
  }
  const actualUpperBoundUsd = counters.potentialPaidAttempts * upperBoundPerPaidAttemptUsd;
  const cumulativeBefore = campaignStateSummary.cumulativeUpperBoundBeforeUsd;
  const cumulativeAfter = cumulativeBefore + actualUpperBoundUsd;
  if (cumulativeAfter > LIVE_BUDGET_USD) {
    // Preserve the reservation and lock: manual audit is safer than recording
    // a campaign whose upper-bound accounting exceeded its hard budget.
    throw new Error('actual campaign upper-bound spend exceeded LIVE_BUDGET_USD');
  }
  campaignState.activeReservation = null;
  campaignState.cumulativePotentialPaidAttempts =
    Number(campaignState.cumulativePotentialPaidAttempts || 0) + counters.potentialPaidAttempts;
  campaignState.cumulativeUpperBoundUsd = cumulativeAfter;
  campaignState.runs.push({
    runId,
    startedAt: new Date(runStartedMs).toISOString(),
    finishedAt: new Date().toISOString(),
    outcome,
    potentialPaidAttempts: counters.potentialPaidAttempts,
    upperBoundUsd: actualUpperBoundUsd,
    models: { transcription: LIVE_TRANSCRIPTION_MODEL, grading: LIVE_GRADING_MODEL },
  });
  campaignState.updatedAt = new Date().toISOString();
  await writeDurableJson(CAMPAIGN_STATE_FILE, campaignState);
  campaignReservationActive = false;
  campaignStateSummary = {
    ...campaignStateSummary,
    status: 'completed',
    activeReservation: false,
    outcome,
    actualPotentialPaidAttempts: counters.potentialPaidAttempts,
    actualUpperBoundUsd,
    cumulativeUpperBoundAfterUsd: cumulativeAfter,
    protectedExposureAfterRunUsd: cumulativeAfter + INFRASTRUCTURE_RESERVE_USD,
  };
}

async function releaseCampaignLock() {
  if (campaignLockHandle) {
    await campaignLockHandle.close();
    campaignLockHandle = undefined;
  }
  await unlink(campaignLockFile).catch((error) => {
    if (error?.code !== 'ENOENT') throw error;
  });
}

function pickAudio(user, mode) {
  const group = mode === 'native' ? audioGroups[user.nativeLanguage] : audioGroups.english;
  return group[(user.index + counters.freshAssessmentsPlanned) % group.length];
}

const counters = {
  httpAttempts: 0,
  networkErrors: 0,
  capacityBusy: 0,
  providerFailures: 0,
  freshAssessmentsPlanned: 0,
  freshAssessmentsCompleted: 0,
  statusPolls: 0,
  expectedPaidFailures: 0,
  activeSessionsEstablished: 0,
  potentialPaidAttempts: 0,
  refundedPotentialPaidAttempts: 0,
};

const systemTarget = {
  index: 'system',
  actions: [],
  _actionSeq: 0,
  _virtualSourceIp: VIRTUAL_SOURCE_IPS ? rfc2544Address(SYSTEM_VIRTUAL_SOURCE_OFFSET) : null,
};

function beginAction(target, logicalAction, method, route, expected = {}) {
  const seq = ++target._actionSeq;
  const action = {
    seq,
    actionId: `${target.index}-${seq}-${logicalAction}`,
    logicalAction,
    method,
    route,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    outcome: null,
    expected,
    attempts: [],
    essentials: {},
  };
  target.actions.push(action);
  return action;
}

function passAction(action, essentials = {}, body) {
  action.finishedAt = new Date().toISOString();
  action.outcome = 'passed';
  action.essentials = essentials;
  if (body !== undefined) action.responseDigest = responseDigest(body);
}

function failAction(action, message) {
  action.finishedAt = new Date().toISOString();
  action.outcome = 'failed';
  action.failure = safeFailureMessage(message);
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function routeTemplate(route) {
  return route.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
}

async function requestOnce(target, action, method, route, { token, json, headers = {}, retryReason } = {}) {
  const attemptNumber = action.attempts.length + 1;
  const xRequestId = `${runId}-${target.index}-${action.seq}-${attemptNumber}`;
  if (Object.keys(headers).some((name) => name.toLowerCase() === 'x-forwarded-for')) {
    throw new Error('request options must not supply X-Forwarded-For directly');
  }
  const requestHeaders = {
    Accept: 'application/json',
    'X-Client-Version': CLIENT_VERSION,
    'X-Request-ID': xRequestId,
    ...headers,
  };
  if (VIRTUAL_SOURCE_IPS) {
    assertCondition(typeof target._virtualSourceIp === 'string', 'request target has no virtual source assignment');
    // Exactly one benchmarking address: never a comma-delimited proxy chain.
    requestHeaders['X-Forwarded-For'] = target._virtualSourceIp;
  }
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  let requestBody;
  if (json !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(json);
  }
  const started = performance.now();
  let response;
  try {
    response = await fetch(`${BASE}${route}`, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), runAbortController.signal]),
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - started);
    counters.httpAttempts++;
    counters.networkErrors++;
    action.attempts.push({
      attempt: attemptNumber,
      method,
      route: routeTemplate(route),
      xRequestId,
      status: null,
      code: null,
      latencyMs,
      retryReason: retryReason || null,
      networkError: error instanceof Error ? error.name : 'NetworkError',
    });
    return { networkError: true };
  }
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  const latencyMs = Math.round(performance.now() - started);
  counters.httpAttempts++;
  action.attempts.push({
    attempt: attemptNumber,
    method,
    route: routeTemplate(route),
    xRequestId,
    status: response.status,
    code: typeof body?.code === 'string' ? body.code : null,
    latencyMs,
    retryReason: retryReason || null,
    networkError: null,
  });
  return { networkError: false, status: response.status, body, text, headers: response.headers };
}

async function getWithBoundedRetry(target, action, route, options = {}) {
  let retryReason;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await requestOnce(target, action, 'GET', route, { ...options, retryReason });
    if (!response.networkError && response.status < 500) return response;
    retryReason = response.networkError ? 'bounded-get-network-retry' : 'bounded-get-5xx-retry';
    action.attempts.at(-1).retryReason = retryReason;
    if (attempt < 2) await delay(250 * (attempt + 1));
  }
  return { networkError: true };
}

function delay(milliseconds, abortable = true) {
  if (!abortable) return new Promise((resolve) => setTimeout(resolve, milliseconds));
  if (runAbortController.signal.aborted) return Promise.reject(new Error(`interrupted by ${interruptedBy}`));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      runAbortController.signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error(`interrupted by ${interruptedBy}`));
    };
    runAbortController.signal.addEventListener('abort', onAbort, { once: true });
  });
}

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function validQuestion(value) {
  return (
    value &&
    isUuid(value.id) &&
    LEVELS.includes(value.cefrLevel) &&
    typeof value.promptWord === 'string' &&
    value.promptWord.trim().length > 0 &&
    value.promptWord.length <= 100 &&
    typeof value.questionText === 'string' &&
    value.questionText.trim().length > 0 &&
    value.questionText.length <= 1_000
  );
}

function validProgress(value) {
  return (
    value &&
    Number.isInteger(value.masteredCount) &&
    value.masteredCount >= 0 &&
    Number.isInteger(value.learningCount) &&
    value.learningCount >= 0 &&
    Number.isInteger(value.totalAtLevel) &&
    value.totalAtLevel > 0 &&
    value.masteredCount + value.learningCount <= value.totalAtLevel &&
    (value.dueCount === undefined || (Number.isInteger(value.dueCount) && value.dueCount >= 0))
  );
}

function rejectMockMarker(body) {
  const serialized = canonicalJson(body);
  assertCondition(!serialized.includes('MOCK_AI=true') && !serialized.includes('(mock transcript)'), 'mock AI marker');
}

function validateDiagnosticResponse(body) {
  rejectMockMarker(body);
  assertCondition(isUuid(body?.recordingId), 'diagnostic response omitted retained recording id');
  assertCondition(body && Number.isInteger(body.score) && body.score >= 0 && body.score <= 100, 'bad diagnostic score');
  assertCondition(body.passed === body.score >= 60, 'diagnostic pass/score mismatch');
  assertCondition(typeof body.transcript === 'string' && body.transcript.length <= 12_000, 'bad diagnostic transcript');
  assertCondition(
    typeof body.feedback === 'string' && body.feedback.trim().length > 0 && body.feedback.length <= 800,
    'bad diagnostic feedback',
  );
  assertCondition(typeof body.done === 'boolean', 'diagnostic response omitted done');
  if (body.done) assertCondition(LEVELS.includes(body.level), 'completed diagnostic omitted level');
  else assertCondition(validQuestion(body.nextQuestion), 'diagnostic response omitted next question');
}

function validatePracticeNext(value) {
  assertCondition(value && validQuestion(value.question), 'practice response omitted next question');
  assertCondition(value.kind === 'new' || value.kind === 'revision', 'practice next kind invalid');
  assertCondition(validProgress(value.progress), 'practice next progress invalid');
}

function validatePracticeResponse(body) {
  rejectMockMarker(body);
  assertCondition(isUuid(body?.recordingId), 'practice response omitted retained recording id');
  assertCondition(
    body && Number.isInteger(body.attemptNo) && body.attemptNo >= 1 && body.attemptNo <= 3,
    'bad attemptNo',
  );
  assertCondition(Number.isInteger(body.score) && body.score >= 0 && body.score <= 100, 'bad practice score');
  assertCondition(body.passed === body.score >= 60, 'practice pass/score mismatch');
  assertCondition(body.mastered === body.score >= 75, 'practice mastery/score mismatch');
  assertCondition(typeof body.transcript === 'string' && body.transcript.length <= 12_000, 'bad practice transcript');
  assertCondition(
    typeof body.feedback === 'string' && body.feedback.trim().length > 0 && body.feedback.length <= 800,
    'bad practice feedback',
  );
  if (body.transcript === '') {
    assertCondition(
      body.noSpeech === true &&
        body.score === 0 &&
        body.passed === false &&
        body.mastered === false &&
        body.attemptsLeft === 4 - body.attemptNo,
      'silence response contract mismatch',
    );
    return;
  }
  if (body.passed) {
    assertCondition(body.attemptsLeft === undefined && body.finalFeedback === undefined, 'pass exposed failure fields');
    validatePracticeNext(body.next);
  } else if (body.attemptNo < 3) {
    assertCondition(body.attemptsLeft === 3 - body.attemptNo && body.next === undefined, 'retry contract mismatch');
  } else {
    assertCondition(body.attemptsLeft === 0, 'terminal failure attemptsLeft mismatch');
    assertCondition(
      typeof body.finalFeedback === 'string' &&
        body.finalFeedback.trim().length > 0 &&
        body.finalFeedback.length <= 4_000,
      'terminal failure feedback invalid',
    );
    validatePracticeNext(body.next);
  }
  if (body.levelUp !== undefined) {
    const fromIndex = LEVELS.indexOf(body.levelUp?.from);
    assertCondition(
      body.mastered && fromIndex >= 0 && body.levelUp.to === LEVELS[fromIndex + 1],
      'levelUp contract mismatch',
    );
    assertCondition(body.next.question.cefrLevel === body.levelUp.to, 'levelUp next question mismatch');
  }
}

function validateNativeResponse(body) {
  rejectMockMarker(body);
  assertCondition(isUuid(body?.recordingId), 'native response omitted retained recording id');
  assertCondition(body?.mode === 'native' && typeof body.understood === 'boolean', 'bad native response mode');
  assertCondition(isUuid(body.cycleId), 'native response omitted cycle id');
  assertCondition(
    Number.isInteger(body.attemptNo) && body.attemptNo >= 1 && body.attemptNo <= 3,
    'bad native attempt number',
  );
  assertCondition(
    Number.isInteger(body.attemptsLeft) && body.attemptsLeft >= 0 && body.attemptsLeft <= 3,
    'bad native attempts left',
  );
  assertCondition(typeof body.transcript === 'string' && body.transcript.length <= 12_000, 'bad native transcript');
  assertCondition(
    typeof body.translatedTranscript === 'string' && body.translatedTranscript.length <= 12_000,
    'bad native translated transcript',
  );
  assertCondition(
    typeof body.feedback === 'string' && body.feedback.trim().length > 0 && body.feedback.length <= 800,
    'bad native feedback',
  );
  assertCondition(typeof body.modelAnswer === 'string' && body.modelAnswer.length <= 800, 'bad native model answer');
  if (body.transcript === '') {
    assertCondition(
      body.understood === false &&
        body.modelAnswer === '' &&
        body.translatedTranscript === '' &&
        body.noSpeech === true,
      'native silence contract mismatch',
    );
  } else {
    assertCondition(body.modelAnswer.trim().length > 0, 'native non-silence omitted model answer');
  }
}

function uploadHostIsAws(uploadUrl) {
  try {
    const url = new URL(uploadUrl);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.hostname.endsWith('.amazonaws.com')
    );
  } catch {
    return false;
  }
}

function uploadHostMatchesTarget(uploadUrl, bucket, region) {
  let url;
  try {
    url = new URL(uploadUrl);
  } catch {
    return false;
  }
  if (!uploadHostIsAws(uploadUrl)) return false;
  const expectedEndpoints = new Set([`s3.${region}`, `s3-${region}`, `s3.dualstack.${region}`]);
  if (region === 'us-east-1') expectedEndpoints.add('s3');
  const hostname = url.hostname.toLowerCase();
  const amazonSuffix = '.amazonaws.com';
  const virtualPrefix = `${bucket.toLowerCase()}.`;
  if (hostname.startsWith(virtualPrefix)) {
    return expectedEndpoints.has(hostname.slice(virtualPrefix.length, -amazonSuffix.length));
  }
  const endpoint = hostname.slice(0, -amazonSuffix.length);
  const firstPathSegment = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] || '');
  return expectedEndpoints.has(endpoint) && firstPathSegment === bucket;
}

function validateGrant(body, endpoint, scope, userId, audio) {
  assertCondition(body?.mode === 's3', 'live grant was not S3 mode');
  assertCondition(body.assessmentEndpoint === endpoint, 'grant endpoint mismatch');
  assertCondition(body.contentType === audio.contentType, 'grant content type mismatch');
  assertCondition(
    Number.isInteger(body.expiresIn) && body.expiresIn >= 60 && body.expiresIn <= 3_600,
    'grant TTL invalid',
  );
  assertCondition(
    Number.isInteger(body.maxBytes) &&
      body.maxBytes > 0 &&
      body.maxBytes <= MAX_SERVER_AUDIO_BYTES &&
      audio.sizeBytes <= body.maxBytes,
    'grant size bound invalid',
  );
  assertCondition(
    uploadHostMatchesTarget(body.uploadUrl, targets[scope].bucket, targets[scope].region),
    'grant did not target the configured HTTPS AWS S3 bucket/region',
  );
  const keyPattern = new RegExp(
    `^audio-uploads/${scope}/${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(m4a|mp4|mp3|wav|ogg|oga|webm|flac)$`,
    'i',
  );
  assertCondition(
    typeof body.audioKey === 'string' && keyPattern.test(body.audioKey),
    'grant key ownership/scope invalid',
  );
  assertCondition(body.uploadFields && !Array.isArray(body.uploadFields), 'grant fields missing');
  assertCondition(
    Object.entries(body.uploadFields).every(([name, value]) => name !== 'file' && typeof value === 'string'),
    'grant fields invalid',
  );
  assertCondition(body.uploadFields.key === body.audioKey, 'grant fields did not bind key');
  const contentTypeField = Object.keys(body.uploadFields).find((name) => name.toLowerCase() === 'content-type');
  assertCondition(
    contentTypeField && body.uploadFields[contentTypeField] === body.contentType,
    'grant fields did not bind MIME',
  );
}

const trackedObjects = [];

function reserveFreshAssessment() {
  if (counters.freshAssessmentsPlanned >= FRESH_ASSESSMENT_CEILING) {
    throw new Error(`hard fresh-assessment ceiling ${FRESH_ASSESSMENT_CEILING} reached`);
  }
  counters.freshAssessmentsPlanned++;
}

function reservePotentialPaidAttempt(action) {
  if (counters.potentialPaidAttempts >= PAID_ATTEMPT_CEILING) {
    throw new Error(`hard potential-paid-attempt ceiling ${PAID_ATTEMPT_CEILING} reached`);
  }
  counters.potentialPaidAttempts++;
  if (action.assessment) action.assessment.potentialPaidAttempts++;
}

function refundPotentialPaidAttempt(action, disposition) {
  if (counters.potentialPaidAttempts <= 0) throw new Error('potential paid-attempt accounting underflow');
  counters.potentialPaidAttempts--;
  counters.refundedPotentialPaidAttempts++;
  if (action.assessment) action.assessment.potentialPaidAttempts--;
  const attempt = action.attempts.at(-1);
  if (attempt) attempt.paidAttemptDisposition = disposition;
}

async function issueGrant(user, endpoint, audio) {
  const scope = ENDPOINT_SCOPE[endpoint];
  const action = beginAction(user, `upload-grant:${scope}`, 'POST', '/uploads/audio-url', {
    terminalStatus: 200,
  });
  try {
    const response = await requestOnce(user, action, 'POST', '/uploads/audio-url', {
      token: user._token,
      json: { contentType: audio.contentType, assessmentEndpoint: endpoint },
    });
    assertCondition(!response.networkError && response.status === 200, 'upload grant did not return 200');
    validateGrant(response.body, endpoint, scope, user._id, audio);
    const object = {
      rawKey: response.body.audioKey,
      keyHash: sha256(response.body.audioKey),
      audioFixtureId: audio.id,
      scope,
      ownerUserIndex: user.index,
      requestId: null,
      assessmentEndpoint: endpoint,
      outcome: 'granted',
      uploaded: false,
      expectedRetainedAfterSuccess: false,
      retainedAfterSuccess: null,
      recordingId: null,
      cleanupAttempted: false,
      absentAfterCleanup: null,
      errorCode: null,
      readProvenBeforeSubmission: false,
    };
    trackedObjects.push(object);
    await appendCleanupJournal(scope, object.rawKey, object.keyHash);
    passAction(
      action,
      {
        mode: 's3',
        scope,
        keyHash: object.keyHash,
        audioFixtureId: audio.id,
        contentType: response.body.contentType,
        expiresIn: response.body.expiresIn,
        maxBytes: response.body.maxBytes,
      },
      {
        mode: response.body.mode,
        assessmentEndpoint: response.body.assessmentEndpoint,
        contentType: response.body.contentType,
        expiresIn: response.body.expiresIn,
        maxBytes: response.body.maxBytes,
        keyHash: object.keyHash,
        audioFixtureId: audio.id,
      },
    );
    return { grant: response.body, object };
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function uploadSignedAudio(user, grant, object, audio) {
  const action = beginAction(user, `s3-upload:${object.scope}`, 'POST', 'S3 signed POST', {
    terminalStatus: 204,
  });
  const attemptNumber = action.attempts.length + 1;
  const started = performance.now();
  try {
    const form = new FormData();
    for (const [name, value] of Object.entries(grant.uploadFields)) form.append(name, value);
    form.append('file', new Blob([audio.bytes], { type: grant.contentType }), `answer${audio.extension}`);
    const response = await fetch(grant.uploadUrl, {
      method: 'POST',
      body: form,
      redirect: 'manual',
      signal: AbortSignal.any([AbortSignal.timeout(S3_OPERATION_TIMEOUT_MS), runAbortController.signal]),
    });
    const latencyMs = Math.round(performance.now() - started);
    counters.httpAttempts++;
    action.attempts.push({
      attempt: attemptNumber,
      method: 'POST',
      route: 'S3 signed POST',
      xRequestId: null,
      status: response.status,
      code: null,
      latencyMs,
      retryReason: null,
      networkError: null,
    });
    // Consume S3's small XML error/success response without persisting it.
    await response.arrayBuffer();
    assertCondition(response.status >= 200 && response.status < 300, 'signed S3 upload was rejected');
    object.uploaded = true;
    object.outcome = 'uploaded';
    // Prove the audit principal can read this exact key before the API deletes
    // it. A later least-privilege S3 403 can then be classified as the normal
    // missing-key response rather than an untested GetObject denial.
    assertCondition(await objectExists(object, true), 'S3 audit principal could not read the uploaded object');
    object.readProvenBeforeSubmission = true;
    passAction(action, {
      scope: object.scope,
      keyHash: object.keyHash,
      sizeBytes: audio.sizeBytes,
      readProvenBeforeSubmission: true,
    });
  } catch (error) {
    if (action.attempts.length === 0) {
      counters.httpAttempts++;
      counters.networkErrors++;
      action.attempts.push({
        attempt: attemptNumber,
        method: 'POST',
        route: 'S3 signed POST',
        xRequestId: null,
        status: null,
        code: null,
        latencyMs: Math.round(performance.now() - started),
        retryReason: null,
        networkError: error instanceof Error ? error.name : 'NetworkError',
      });
    }
    object.outcome = 'upload-failed';
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function pollAssessmentStatus(user, action, requestId, context, questionId) {
  let consecutiveMissing = 0;
  for (let poll = 0; poll < STATUS_POLL_ATTEMPTS; poll++) {
    if (runAbortController.signal.aborted) throw new Error(`interrupted by ${interruptedBy}`);
    if (poll > 0) await delay(Math.min(500 * 2 ** (poll - 1), 4_000));
    counters.statusPolls++;
    const status = await requestOnce(user, action, 'GET', `/assessments/${requestId}`, {
      token: user._token,
      retryReason: 'network-ambiguity-status-poll',
    });
    if (status.networkError) continue;
    if (status.status === 404) {
      consecutiveMissing++;
      continue;
    }
    if (status.status !== 200) return { kind: 'failed', response: status };
    assertCondition(status.body?.context === context, 'assessment status context mismatch');
    assertCondition(status.body?.questionId === questionId, 'assessment status question mismatch');
    if (status.body.status === 'completed') {
      assertCondition(
        status.body.response && typeof status.body.response === 'object',
        'completed status omitted response',
      );
      return { kind: 'completed', body: status.body.response, statusPolls: poll + 1 };
    }
    assertCondition(status.body.status === 'processing', 'assessment status value invalid');
    consecutiveMissing = 0;
  }
  if (consecutiveMissing === STATUS_POLL_ATTEMPTS) return { kind: 'absent' };
  return { kind: 'unresolved' };
}

async function submitAssessmentPost(user, action, endpoint, payload, context, validateBody, potentiallyFresh) {
  let capacityRetry = 0;
  let ambiguityRetryUsed = false;
  let retryReason;
  while (true) {
    if (runAbortController.signal.aborted) throw new Error(`interrupted by ${interruptedBy}`);
    if (potentiallyFresh) reservePotentialPaidAttempt(action);
    const response = await requestOnce(user, action, 'POST', endpoint, {
      token: user._token,
      json: payload,
      retryReason,
    });
    if (potentiallyFresh) action.attempts.at(-1).paidAttemptDisposition = 'counted-potential-paid-attempt';
    if (response.networkError) {
      action.attempts.at(-1).retryReason = 'network-ambiguity-status-reconciliation';
      const reconciled = await pollAssessmentStatus(user, action, payload.requestId, context, payload.questionId);
      if (reconciled.kind === 'completed') {
        validateBody(reconciled.body);
        return { body: reconciled.body, recoveredByStatus: true, statusPolls: reconciled.statusPolls };
      }
      if (reconciled.kind === 'absent' && !ambiguityRetryUsed) {
        ambiguityRetryUsed = true;
        retryReason = 'status-confirmed-absent-network-retry';
        continue;
      }
      throw new Error(`assessment network ambiguity remained ${reconciled.kind}`);
    }
    if (response.status === 200) {
      validateBody(response.body);
      return { body: response.body, recoveredByStatus: false, statusPolls: 0 };
    }
    if (response.status === 503 && response.body?.code === 'CAPACITY_BUSY') {
      if (potentiallyFresh) refundPotentialPaidAttempt(action, 'refunded-exact-capacity-busy');
      counters.capacityBusy++;
      if (capacityRetry >= CAPACITY_RETRIES) {
        throw new Error('assessment exhausted exact CAPACITY_BUSY retry budget');
      }
      capacityRetry++;
      const hinted = Number(response.body?.retryAfterSeconds || response.headers.get('retry-after') || 2);
      await delay(Math.min(Math.max(hinted, 1), 10) * 1_000 + Math.floor(Math.random() * 250));
      retryReason = 'exact-capacity-busy-retry';
      continue;
    }
    const noSpendConflict =
      response.status === 409 &&
      ['REQUEST_IN_FLIGHT', 'REQUEST_ID_REUSED', 'ASSESSMENT_IN_PROGRESS', 'QUESTION_MISMATCH'].includes(
        response.body?.code,
      );
    if (noSpendConflict && potentiallyFresh) {
      refundPotentialPaidAttempt(action, `refunded-proven-no-spend-${response.body.code.toLowerCase()}`);
    }
    if (response.status === 409 && response.body?.code === 'REQUEST_IN_FLIGHT') {
      const reconciled = await pollAssessmentStatus(user, action, payload.requestId, context, payload.questionId);
      if (reconciled.kind === 'completed') {
        validateBody(reconciled.body);
        return { body: reconciled.body, recoveredByStatus: true, statusPolls: reconciled.statusPolls };
      }
      throw new Error(`in-flight assessment status remained ${reconciled.kind}`);
    }
    if (response.status === 502 || response.status === 504) counters.providerFailures++;
    const code = typeof response.body?.code === 'string' ? response.body.code : 'NO_CODE';
    // In particular, PROVIDER_FAILED/PROVIDER_TIMEOUT and every other paid
    // failure stop here. They are never automatically POSTed again.
    throw new Error(`assessment returned terminal ${response.status} ${code}`);
  }
}

function assessmentEssentials(context, body) {
  if (context === 'diagnostic') {
    return { score: body.score, passed: body.passed, done: body.done, level: body.level || null };
  }
  if (context === 'practice') {
    return {
      score: body.score,
      passed: body.passed,
      mastered: body.mastered,
      attemptNo: body.attemptNo,
      attemptsLeft: body.attemptsLeft ?? null,
      noSpeech: body.noSpeech === true,
      levelUp: body.levelUp || null,
    };
  }
  return {
    mode: body.mode,
    understood: body.understood,
    transcriptEmpty: body.transcript === '',
    attemptNo: body.attemptNo,
    attemptsLeft: body.attemptsLeft,
    translatedTranscriptEmpty: body.translatedTranscript === '',
  };
}

async function performFreshAssessment(user, endpoint, questionId, context, mode, cycleId) {
  reserveFreshAssessment();
  const audio = pickAudio(user, mode);
  const { grant, object } = await issueGrant(user, endpoint, audio);
  await uploadSignedAudio(user, grant, object, audio);
  const requestId = randomUUID();
  object.requestId = requestId;
  const action = beginAction(user, `assessment:${context}`, 'POST', endpoint, { terminalStatus: 200 });
  action.assessment = {
    requestId,
    questionId,
    cycleId: cycleId || null,
    keyHash: object.keyHash,
    audioFixtureId: audio.id,
    scope: object.scope,
    context,
    fresh: true,
    usageReservationsExpected: 0,
    durableRequestExpected: false,
    statusPolls: 0,
    potentialPaidAttempts: 0,
  };
  const validator =
    context === 'diagnostic'
      ? validateDiagnosticResponse
      : context === 'practice'
        ? validatePracticeResponse
        : validateNativeResponse;
  try {
    const result = await submitAssessmentPost(
      user,
      action,
      endpoint,
      {
        questionId,
        requestId,
        audioKey: grant.audioKey,
        ...(context === 'diagnostic' ? {} : { cycleId }),
      },
      context,
      validator,
      true,
    );
    action.assessment.statusPolls = result.statusPolls;
    object.outcome = 'assessment-completed';
    object.recordingId = result.body.recordingId;
    object.expectedRetainedAfterSuccess = true;
    counters.freshAssessmentsCompleted++;
    action.assessment.usageReservationsExpected = 1;
    action.assessment.durableRequestExpected = true;
    user.expectedUsageReservations++;
    user.expectedAssessmentRequests.push({
      requestId,
      context,
      questionId,
      status: 'completed',
      responseDigest: responseDigest(result.body),
      audioKeyHash: object.keyHash,
      audioFixtureId: audio.id,
      recordingId: result.body.recordingId,
    });
    passAction(
      action,
      { ...assessmentEssentials(context, result.body), recoveredByStatus: result.recoveredByStatus },
      result.body,
    );
    return { body: result.body, requestId, questionId, cycleId, object, grant };
  } catch (error) {
    object.outcome = 'assessment-failed';
    const lastAssessmentPost = action.attempts.filter((attempt) => attempt.method === 'POST').at(-1);
    object.errorCode = lastAssessmentPost?.code || null;
    if (['PROVIDER_FAILED', 'PROVIDER_TIMEOUT'].includes(object.errorCode)) {
      // The live retry policy stops on these exact paid-provider contracts.
      // Their capacity reservation remains durable even though the request
      // claim is abandoned and no assessment response is stored.
      user.expectedUsageReservations++;
      counters.expectedPaidFailures++;
      action.assessment.usageReservationsExpected = 1;
      action.assessment.durableRequestExpected = false;
    }
    action.expected.terminalCode = object.errorCode;
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function replayAssessment(user, prior, context, validator) {
  const endpoint = prior.object.assessmentEndpoint;
  const action = beginAction(user, `assessment-replay:${context}`, 'POST', endpoint, { terminalStatus: 200 });
  action.assessment = {
    requestId: prior.requestId,
    questionId: prior.questionId,
    cycleId: prior.cycleId || null,
    keyHash: prior.object.keyHash,
    scope: prior.object.scope,
    context,
    fresh: false,
    audioFixtureId: prior.object.audioFixtureId,
    usageReservationsExpected: 0,
    durableRequestExpected: false,
    statusPolls: 0,
    potentialPaidAttempts: 0,
  };
  try {
    const result = await submitAssessmentPost(
      user,
      action,
      endpoint,
      {
        questionId: prior.questionId,
        requestId: prior.requestId,
        audioKey: prior.grant.audioKey,
        ...(context === 'diagnostic' ? {} : { cycleId: prior.cycleId }),
      },
      context,
      validator,
      false,
    );
    assertCondition(responseDigest(result.body) === responseDigest(prior.body), 'idempotent replay body mismatch');
    action.assessment.statusPolls = result.statusPolls;
    passAction(action, { exactReplay: true, recoveredByStatus: result.recoveredByStatus }, result.body);
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

function attemptExpectation(context, questionId, attemptNo, body) {
  return {
    seq: null,
    context,
    questionId,
    attemptNo,
    score: body.score ?? null,
    passed: body.passed ?? null,
    transcriptDigest: sha256(body.transcript),
    feedbackDigest: sha256(body.feedback),
    recordingId: body.recordingId,
    observedAt: new Date().toISOString(),
  };
}

function isoAround(milliseconds, spreadMs = 5_000) {
  return {
    min: new Date(milliseconds - spreadMs).toISOString(),
    max: new Date(milliseconds + spreadMs).toISOString(),
  };
}

function setExpectedSkip(user, questionId, actionStartedMs, actionFinishedMs) {
  const skipped = {
    min: new Date(actionStartedMs + 7 * 86_400_000 - 5_000).toISOString(),
    max: new Date(actionFinishedMs + 7 * 86_400_000 + 5_000).toISOString(),
  };
  const due = isoAround(actionStartedMs);
  user._progress.set(questionId, {
    questionId,
    status: 'learning',
    bestScore: 0,
    attemptCount: 0,
    srsIntervalIndex: 0,
    dueAtMin: due.min,
    dueAtMax: due.max,
    skippedUntilMin: skipped.min,
    skippedUntilMax: skipped.max,
  });
}

function applyExpectedPracticeAttempt(user, questionId, body, actionStartedMs, actionFinishedMs) {
  const prior = user._progress.get(questionId);
  const priorStatus = prior?.status;
  const priorIndex = prior?.srsIntervalIndex ?? 0;
  let status;
  let index;
  let dueDays;
  if (body.score < 60) {
    status = 'learning';
    index = 0;
    dueDays = 0;
  } else if (body.score >= 75 || priorStatus === 'mastered') {
    status = 'mastered';
    index = Math.min(priorIndex + 1, SRS_INTERVALS_DAYS.length - 1);
    dueDays = SRS_INTERVALS_DAYS[index];
  } else {
    status = 'learning';
    index = 1;
    dueDays = 1;
  }
  const dueBaseMin = actionStartedMs + dueDays * 86_400_000;
  const dueBaseMax = actionFinishedMs + dueDays * 86_400_000;
  user._progress.set(questionId, {
    questionId,
    status,
    bestScore: Math.max(prior?.bestScore ?? 0, body.score),
    attemptCount: (prior?.attemptCount ?? 0) + 1,
    srsIntervalIndex: index,
    dueAtMin: new Date(dueBaseMin - 5_000).toISOString(),
    dueAtMax: new Date(dueBaseMax + 5_000).toISOString(),
    skippedUntilMin: null,
    skippedUntilMax: null,
  });
}

function applyExpectedNativeAttempt(user, questionId, actionStartedMs, actionFinishedMs) {
  const prior = user._progress.get(questionId);
  const due = prior ? { min: prior.dueAtMin, max: prior.dueAtMax } : isoAround(actionStartedMs);
  user._progress.set(questionId, {
    questionId,
    status: prior?.status ?? 'learning',
    bestScore: prior?.bestScore ?? 0,
    attemptCount: (prior?.attemptCount ?? 0) + 1,
    srsIntervalIndex: prior?.srsIntervalIndex ?? 0,
    dueAtMin: due.min,
    dueAtMax: due.max,
    skippedUntilMin: null,
    skippedUntilMax: null,
    lastAttemptAtMin: new Date(actionStartedMs - 5_000).toISOString(),
    lastAttemptAtMax: new Date(actionFinishedMs + 5_000).toISOString(),
  });
}

const users = Array.from({ length: USER_COUNT }, (_, index) => {
  const nativeLanguage = NATIVE_LANGUAGES[index % NATIVE_LANGUAGES.length];
  const email = `${emailPrefix}${index + 1}@example.com`;
  const name = `Live Load User ${index + 1}`;
  return {
    index,
    nativeLanguage,
    cohort: index % 10 <= 3 ? 'full' : index % 10 <= 6 ? 'english' : index % 10 <= 8 ? 'native' : 'account',
    idHash: null,
    emailHash: sha256(email),
    expectedFinal: {
      exists: true,
      nameHash: sha256(name),
      emailHash: sha256(email),
      nativeLanguage,
      cefrLevel: null,
      diagnosticCompleted: false,
      tokenVersion: 1,
      diagnosticQuestionsAsked: 0,
    },
    expectedAttempts: [],
    expectedAssessmentRequests: [],
    expectedPracticeProgress: [],
    expectedUsageReservations: 0,
    nativeInvariantExpected: false,
    actions: [],
    failures: [],
    _actionSeq: 0,
    _virtualSourceIp: VIRTUAL_SOURCE_IPS ? userVirtualSourceIp(index) : null,
    _email: email,
    _name: name,
    _id: null,
    _token: null,
    _password: PASSWORD,
    _level: null,
    _diagnosticQuestion: null,
    _practiceQuestion: null,
    _progress: new Map(),
    _nativeAssessment: null,
    _deleted: false,
  };
});

function recordUserFailure(user, phase, error) {
  const message = error instanceof Error ? error.message : String(error);
  user.failures.push(safeFailureMessage(`${phase}: ${message}`));
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

async function runPhase(name, participants, concurrency, worker) {
  if (runAbortController.signal.aborted) throw new Error(`interrupted by ${interruptedBy}`);
  const startedAt = Date.now();
  const failuresBefore = users.filter((user) => user.failures.length > 0).length;
  const capacityBefore = counters.capacityBusy;
  const paidBefore = counters.freshAssessmentsPlanned;
  const paidAttemptsBefore = counters.potentialPaidAttempts;
  let completed = 0;
  console.log(`phase start: ${name} (${participants.length} participants, concurrency ${concurrency})`);
  const heartbeat = setInterval(() => {
    console.log(
      `progress: ${name} ${completed}/${participants.length}; paid logical ${counters.freshAssessmentsPlanned}/${FRESH_ASSESSMENT_CEILING}; potential paid attempts ${counters.potentialPaidAttempts}/${PAID_ATTEMPT_CEILING}; CAPACITY_BUSY ${counters.capacityBusy}; provider failures ${counters.providerFailures}`,
    );
  }, 30_000);
  heartbeat.unref();
  try {
    await runPool(participants, concurrency, async (user) => {
      if (runAbortController.signal.aborted) {
        completed++;
        return;
      }
      if (user.failures.length > 0 || user._deleted) {
        completed++;
        return;
      }
      try {
        await worker(user);
      } catch (error) {
        recordUserFailure(user, name, error);
      } finally {
        completed++;
      }
    });
  } finally {
    clearInterval(heartbeat);
  }
  console.log(
    `phase end: ${name} (${completed}/${participants.length}, ${Math.round((Date.now() - startedAt) / 1_000)}s)`,
  );
  phaseStats.push({
    phase: name,
    participants: participants.length,
    concurrency,
    completed,
    durationMs: Date.now() - startedAt,
    newFailedUsers: users.filter((user) => user.failures.length > 0).length - failuresBefore,
    freshAssessmentsPlanned: counters.freshAssessmentsPlanned - paidBefore,
    potentialPaidAttempts: counters.potentialPaidAttempts - paidAttemptsBefore,
    capacityBusy: counters.capacityBusy - capacityBefore,
  });
  if (runAbortController.signal.aborted) throw new Error(`interrupted by ${interruptedBy}`);
}

function validatePublicUser(body, user) {
  assertCondition(body && isUuid(body.id), 'user response omitted UUID');
  assertCondition(body.email === user._email, 'user email mismatch');
  assertCondition(body.nativeLanguage === user.nativeLanguage, 'user native language mismatch');
  assertCondition(typeof body.diagnosticCompleted === 'boolean', 'user diagnostic flag invalid');
  assertCondition(body.cefrLevel === null || LEVELS.includes(body.cefrLevel), 'user CEFR level invalid');
}

function captureIdentity(user, body, token) {
  validatePublicUser(body, user);
  assertCondition(typeof token === 'string' && token.length > 20, 'auth response omitted token');
  user._id = body.id;
  user.idHash = sha256(body.id);
  user._token = token;
}

async function actionRegister(user) {
  const action = beginAction(user, 'register', 'POST', '/auth/register', { terminalStatus: 201 });
  try {
    const response = await requestOnce(user, action, 'POST', '/auth/register', {
      json: {
        name: user._name,
        email: user._email,
        password: user._password,
        nativeLanguage: user.nativeLanguage,
      },
    });
    if (response.networkError) {
      action.attempts.at(-1).retryReason = 'register-network-ambiguity-login-reconciliation';
      const recovered = await requestOnce(user, action, 'POST', '/auth/login', {
        json: { email: user._email, password: user._password },
        retryReason: 'register-network-ambiguity-login-reconciliation',
      });
      assertCondition(
        !recovered.networkError && recovered.status === 200,
        'registration ambiguity could not reconcile',
      );
      captureIdentity(user, recovered.body?.user, recovered.body?.token);
      action.expected.terminalStatus = 200;
      passAction(action, { registered: true, recoveredByLogin: true });
      return;
    }
    assertCondition(response.status === 201, 'registration did not return 201');
    captureIdentity(user, response.body?.user, response.body?.token);
    assertCondition(response.body.user.name === user._name, 'registration name mismatch');
    assertCondition(
      response.body.user.cefrLevel === null && response.body.user.diagnosticCompleted === false,
      'registration placement state invalid',
    );
    passAction(action, { registered: true, recoveredByLogin: false, idHash: user.idHash });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionLogin(user) {
  const action = beginAction(user, 'login', 'POST', '/auth/login', { terminalStatus: 200 });
  try {
    const response = await requestOnce(user, action, 'POST', '/auth/login', {
      json: { email: user._email, password: user._password },
    });
    assertCondition(!response.networkError && response.status === 200, 'login did not return 200');
    validatePublicUser(response.body?.user, user);
    assertCondition(response.body.user.id === user._id, 'login returned another user');
    assertCondition(typeof response.body.token === 'string', 'login omitted token');
    user._token = response.body.token;
    passAction(action, { authenticated: true, idHash: user.idHash });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionMe(user) {
  const action = beginAction(user, 'get-me', 'GET', '/auth/me', { terminalStatus: 200 });
  try {
    const response = await getWithBoundedRetry(user, action, '/auth/me', { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'GET /auth/me did not return 200');
    validatePublicUser(response.body?.user, user);
    assertCondition(response.body.user.id === user._id, 'GET /auth/me returned another user');
    passAction(action, {
      idHash: user.idHash,
      cefrLevel: response.body.user.cefrLevel,
      diagnosticCompleted: response.body.user.diagnosticCompleted,
    });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionProfileUpdate(user) {
  const action = beginAction(user, 'profile-update', 'PATCH', '/auth/me', { terminalStatus: 200 });
  const updatedName = `${user._name} Updated`;
  try {
    const response = await requestOnce(user, action, 'PATCH', '/auth/me', {
      token: user._token,
      json: { name: updatedName },
    });
    assertCondition(!response.networkError && response.status === 200, 'profile update did not return 200');
    validatePublicUser(response.body?.user, user);
    assertCondition(response.body.user.name === updatedName, 'profile update name mismatch');
    user._name = updatedName;
    user.expectedFinal.nameHash = sha256(updatedName);
    passAction(action, { nameHash: user.expectedFinal.nameHash });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionForgotAndInvalidReset(user) {
  const forgot = beginAction(user, 'forgot-password-uniform', 'POST', '/auth/forgot-password', {
    terminalStatus: 204,
  });
  try {
    const response = await requestOnce(user, forgot, 'POST', '/auth/forgot-password', {
      json: { email: user._email },
    });
    assertCondition(!response.networkError && response.status === 204, 'forgot-password did not return 204');
    passAction(forgot, { uniformNoContent: true });
  } catch (error) {
    failAction(forgot, error instanceof Error ? error.message : error);
    throw error;
  }

  const reset = beginAction(user, 'reset-password-invalid-token', 'POST', '/auth/reset-password', {
    terminalStatus: 400,
    terminalCode: 'RESET_INVALID',
  });
  try {
    const response = await requestOnce(user, reset, 'POST', '/auth/reset-password', {
      json: {
        email: user._email,
        token: `invalid-${randomUUID()}`,
        newPassword: `NeverApplied-${randomUUID()}-7c`,
      },
    });
    assertCondition(
      !response.networkError && response.status === 400 && response.body?.code === 'RESET_INVALID',
      'invalid reset contract mismatch',
    );
    passAction(reset, { resetRejectedUniformly: true });
  } catch (error) {
    failAction(reset, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionDiagnosticRestart(user) {
  const action = beginAction(user, 'diagnostic-restart', 'POST', '/diagnostic/restart', { terminalStatus: 204 });
  try {
    const response = await requestOnce(user, action, 'POST', '/diagnostic/restart', {
      token: user._token,
      json: { confirm: true },
    });
    assertCondition(!response.networkError && response.status === 204, 'diagnostic restart did not return 204');
    passAction(action, { restartedBeforePlacement: true });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function getDiagnosticNext(user) {
  const action = beginAction(user, 'diagnostic-next', 'GET', '/diagnostic/next', { terminalStatus: 200 });
  try {
    const response = await getWithBoundedRetry(user, action, '/diagnostic/next', { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'diagnostic next did not return 200');
    if (response.body?.done) {
      assertCondition(LEVELS.includes(response.body.level), 'completed diagnostic next omitted level');
    } else {
      assertCondition(validQuestion(response.body?.question), 'diagnostic next omitted question');
      assertCondition(
        Number.isInteger(response.body.progress?.asked) && response.body.progress?.maxQuestions === 3,
        'diagnostic progress invalid',
      );
    }
    passAction(action, { done: response.body.done, level: response.body.level || null }, response.body);
    return response.body;
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionDiagnosticJourney(user) {
  let next = await getDiagnosticNext(user);
  let question = next.question;
  for (let answerIndex = 0; answerIndex < 3 && !next.done; answerIndex++) {
    const result = await performFreshAssessment(user, ENDPOINTS.diagnostic, question.id, 'diagnostic', 'english');
    const expected = attemptExpectation('diagnostic', question.id, answerIndex + 1, result.body);
    expected.seq = user.expectedAttempts.length + 1;
    user.expectedAttempts.push(expected);
    user.expectedFinal.diagnosticQuestionsAsked++;
    next = result.body;
    if (next.done) {
      user._level = next.level;
      user.expectedFinal.cefrLevel = next.level;
      user.expectedFinal.diagnosticCompleted = true;
    } else {
      question = next.nextQuestion;
    }
  }
  assertCondition(next.done === true && LEVELS.includes(user._level), 'diagnostic did not finish within three answers');
}

async function actionPracticeQuestion(user, logicalAction = 'practice-question') {
  const action = beginAction(user, logicalAction, 'GET', '/practice/question', { terminalStatus: 200 });
  try {
    const response = await getWithBoundedRetry(user, action, '/practice/question', { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'practice question did not return 200');
    assertCondition(validQuestion(response.body?.question), 'practice question shape invalid');
    assertCondition(response.body.question.cefrLevel === user._level, 'practice question level mismatch');
    assertCondition(response.body.kind === 'new' || response.body.kind === 'revision', 'practice kind invalid');
    assertCondition(validProgress(response.body.progress), 'practice progress invalid');
    assertCondition(isUuid(response.body.cycleId), 'practice cycle id invalid');
    user._practiceQuestion = response.body.question;
    user._practiceCycleId = response.body.cycleId;
    passAction(
      action,
      {
        questionId: response.body.question.id,
        cycleId: response.body.cycleId,
        kind: response.body.kind,
        progress: response.body.progress,
      },
      response.body,
    );
    return response.body;
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionSkip(user) {
  const questionId = user._practiceQuestion.id;
  const action = beginAction(user, 'practice-skip', 'POST', '/practice/skip', { terminalStatus: 204 });
  const startedMs = Date.now();
  try {
    const response = await requestOnce(user, action, 'POST', '/practice/skip', {
      token: user._token,
      json: { questionId, cycleId: user._practiceCycleId },
    });
    const finishedMs = Date.now();
    assertCondition(!response.networkError && response.status === 204, 'practice skip did not return 204');
    setExpectedSkip(user, questionId, startedMs, finishedMs);
    passAction(action, { questionId, parkedDays: 7 });
    await actionPracticeQuestion(user, 'practice-question-after-skip');
    assertCondition(user._practiceQuestion.id !== questionId, 'skip immediately re-served the same word');
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionHelp(user) {
  const route = `/practice/question/${user._practiceQuestion.id}/help`;
  const action = beginAction(user, 'practice-help-etag', 'GET', route, { terminalStatus: 304 });
  try {
    const response = await getWithBoundedRetry(user, action, route, { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'practice help did not return 200');
    assertCondition(
      typeof response.body?.promptWordNative === 'string' &&
        typeof response.body?.questionTextNative === 'string' &&
        Array.isArray(response.body?.examples) &&
        response.body.examples.length === 3 &&
        response.body.examples.every((example) => example?.en && example?.native),
      'practice help payload invalid',
    );
    const etag = response.headers.get('etag');
    assertCondition(typeof etag === 'string' && etag.length > 0, 'practice help omitted ETag');
    const cached = await requestOnce(user, action, 'GET', route, {
      token: user._token,
      headers: { 'If-None-Match': etag },
    });
    assertCondition(!cached.networkError && cached.status === 304, 'practice help ETag did not return 304');
    passAction(action, { questionId: user._practiceQuestion.id, etagRevalidated: true }, response.body);
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionEnglishJourney(user) {
  const questionId = user._practiceQuestion.id;
  for (let logicalAttempt = 1; logicalAttempt <= 3; logicalAttempt++) {
    const startedMs = Date.now();
    const result = await performFreshAssessment(
      user,
      ENDPOINTS.practice,
      questionId,
      'practice',
      'english',
      user._practiceCycleId,
    );
    const finishedMs = Date.now();
    const body = result.body;
    if (body.transcript === '') {
      // Silence is a valid paid provider result but deliberately creates no
      // attempt/progress row. Do not create another automatic paid take.
      return;
    }
    const expected = attemptExpectation('practice', questionId, body.attemptNo, body);
    expected.seq = user.expectedAttempts.length + 1;
    user.expectedAttempts.push(expected);
    applyExpectedPracticeAttempt(user, questionId, body, startedMs, finishedMs);
    if (body.passed || body.attemptsLeft === 0) {
      user._practiceQuestion = body.next.question;
      user._practiceCycleId = body.next.cycleId;
      if (body.levelUp) {
        user._level = body.levelUp.to;
        user.expectedFinal.cefrLevel = body.levelUp.to;
      }
      return;
    }
    assertCondition(body.attemptNo === logicalAttempt, 'practice attempt sequence drifted');
  }
  throw new Error('English attempt journey did not terminate after three scored attempts');
}

async function actionNativeJourney(user) {
  const questionId = user._practiceQuestion.id;
  const startedMs = Date.now();
  const result = await performFreshAssessment(
    user,
    ENDPOINTS.native,
    questionId,
    'practice-native',
    'native',
    user._practiceCycleId,
  );
  const finishedMs = Date.now();
  user._nativeAssessment = { ...result, questionId };
  if (result.body.transcript !== '') {
    const expected = attemptExpectation('practice-native', questionId, result.body.attemptNo, result.body);
    expected.seq = user.expectedAttempts.length + 1;
    user.expectedAttempts.push(expected);
    applyExpectedNativeAttempt(user, questionId, startedMs, finishedMs);
    if (result.body.attemptsLeft === 0) {
      user._practiceQuestion = result.body.next.question;
      user._practiceCycleId = result.body.next.cycleId;
    }
  }
  user.nativeInvariantExpected = true;
}

async function actionNativeReplay(user) {
  assertCondition(user._nativeAssessment, 'native replay has no completed assessment');
  await replayAssessment(user, user._nativeAssessment, 'practice-native', validateNativeResponse);
}

async function actionDurableAssessmentAccess(user) {
  for (const expectedRequest of user.expectedAssessmentRequests) {
    const route = `/assessments/${expectedRequest.requestId}`;
    const action = beginAction(user, `assessment-durable-access:${expectedRequest.context}`, 'GET', route, {
      terminalStatus: 200,
    });
    try {
      const response = await getWithBoundedRetry(user, action, route, { token: user._token });
      assertCondition(!response.networkError && response.status === 200, 'durable assessment GET did not return 200');
      assertCondition(
        response.body?.status === 'completed' &&
          response.body.context === expectedRequest.context &&
          response.body.questionId === expectedRequest.questionId &&
          responseDigest(response.body.response) === expectedRequest.responseDigest,
        'durable assessment response mismatch',
      );
      passAction(
        action,
        {
          requestId: expectedRequest.requestId,
          context: expectedRequest.context,
          questionId: expectedRequest.questionId,
          responseDigest: expectedRequest.responseDigest,
          audioFixtureId: expectedRequest.audioFixtureId,
        },
        response.body,
      );
    } catch (error) {
      failAction(action, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

async function actionRecordingLibrary(user) {
  const expectedById = new Map(user.expectedAssessmentRequests.map((request) => [request.recordingId, request]));
  const listAction = beginAction(user, 'recordings-list', 'GET', '/recordings?limit=50', { terminalStatus: 200 });
  try {
    const response = await getWithBoundedRetry(user, listAction, '/recordings?limit=50', { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'recording list did not return 200');
    assertCondition(Array.isArray(response.body?.items), 'recording list omitted items');
    assertCondition(response.body.items.length === expectedById.size, 'recording list count mismatch');
    for (const item of response.body.items) {
      const expected = expectedById.get(item.id);
      assertCondition(
        expected &&
          item.questionId === expected.questionId &&
          item.context === expected.context &&
          typeof item.promptWord === 'string' &&
          typeof item.questionText === 'string' &&
          ['retention_pending', 'available'].includes(item.status) &&
          !Object.hasOwn(item, 'requestId') &&
          !Object.hasOwn(item, 'audioKey'),
        'recording list mapping mismatch',
      );
    }
    passAction(listAction, { recordingCount: response.body.items.length }, response.body);
  } catch (error) {
    failAction(listAction, error instanceof Error ? error.message : error);
    throw error;
  }

  const exportAction = beginAction(user, 'recordings-export', 'GET', '/recordings/export?limit=500', {
    terminalStatus: 200,
  });
  try {
    const response = await getWithBoundedRetry(user, exportAction, '/recordings/export?limit=500', {
      token: user._token,
    });
    assertCondition(!response.networkError && response.status === 200, 'recording export did not return 200');
    assertCondition(response.body?.nextCursor === null, 'small recording export unexpectedly paginated');
    assertCondition(response.body.recordings?.length === expectedById.size, 'recording export count mismatch');
    for (const item of response.body.recordings) {
      const expected = expectedById.get(item.id);
      assertCondition(
        expected &&
          item.requestId === expected.requestId &&
          item.questionId === expected.questionId &&
          item.context === expected.context &&
          !Object.hasOwn(item, 'audioKey') &&
          !Object.hasOwn(item, 's3VersionId'),
        'recording export mapping mismatch',
      );
    }
    passAction(exportAction, { recordingCount: response.body.recordings.length }, response.body);
  } catch (error) {
    failAction(exportAction, error instanceof Error ? error.message : error);
    throw error;
  }

  for (const expected of expectedById.values()) {
    const route = `/recordings/${expected.recordingId}/playback-url`;
    const action = beginAction(user, 'recording-playback', 'POST', route, { terminalStatus: 200 });
    try {
      let playback;
      for (let attempt = 0; attempt < 12; attempt++) {
        playback = await requestOnce(user, action, 'POST', route, {
          token: user._token,
          retryReason: attempt === 0 ? undefined : 'recording-retention-pending',
        });
        if (!playback.networkError && playback.status === 200) break;
        assertCondition(
          !playback.networkError && playback.status === 409 && playback.body?.code === 'REQUEST_IN_FLIGHT',
          'recording playback grant failed',
        );
        await delay(1_000);
      }
      assertCondition(
        playback && !playback.networkError && playback.status === 200,
        'recording playback stayed pending',
      );
      assertCondition(
        playback.body?.recordingId === expected.recordingId &&
          typeof playback.body?.playbackUrl === 'string' &&
          playback.body.expiresIn > 0 &&
          playback.body.expiresIn <= 300 &&
          !Object.hasOwn(playback.body, 'audioKey'),
        'recording playback contract mismatch',
      );
      const started = performance.now();
      const media = await fetch(playback.body.playbackUrl, {
        signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), runAbortController.signal]),
      });
      const bytes = Buffer.from(await media.arrayBuffer());
      action.attempts.push({
        attempt: action.attempts.length + 1,
        method: 'GET',
        route: 'S3 signed recording playback',
        xRequestId: null,
        status: media.status,
        code: null,
        latencyMs: Math.round(performance.now() - started),
        retryReason: null,
        networkError: null,
      });
      const fixture = audioCorpusInternal.find((audio) => audio.id === expected.audioFixtureId);
      assertCondition(media.status === 200 && fixture && sha256(bytes) === fixture.sha256, 'playback bytes mismatch');
      const retainedObject = trackedObjects.find((candidate) => candidate.recordingId === expected.recordingId);
      if (retainedObject) {
        const versions = await listExactObjectVersions(retainedObject);
        let retainedVersionId;
        for (const version of versions) {
          const tagging = await targets[retainedObject.scope].client.send(
            new GetObjectTaggingCommand({
              Bucket: targets[retainedObject.scope].bucket,
              Key: retainedObject.rawKey,
              VersionId: version.VersionId,
            }),
            { abortSignal: s3AbortSignal() },
          );
          if (tagging.TagSet?.some((tag) => tag.Key === 'retention' && tag.Value === 'retained')) {
            retainedVersionId = version.VersionId;
            break;
          }
        }
        assertCondition(retainedVersionId, 'retained S3 version tag was not found');
        retainedObject.retainedAfterSuccess = true;
        retainedObject.retainedVersionHash = sha256(retainedVersionId);
      }
      passAction(action, { recordingId: expected.recordingId, audioFixtureId: expected.audioFixtureId });
    } catch (error) {
      failAction(action, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

async function actionHistory(user) {
  const action = beginAction(user, 'practice-history', 'GET', '/practice/history?limit=50', { terminalStatus: 200 });
  try {
    const response = await getWithBoundedRetry(user, action, '/practice/history?limit=50', { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'practice history did not return 200');
    assertCondition(Array.isArray(response.body?.items), 'practice history omitted items');
    assertCondition(response.body.items.length === user.expectedAttempts.length, 'practice history row count mismatch');
    assertCondition(response.body.nextCursor === null, 'small live history unexpectedly paginated');
    const expectedByKey = new Map(
      user.expectedAttempts.map((item) => [`${item.context}:${item.questionId}:${item.attemptNo}`, item]),
    );
    for (const item of response.body.items) {
      assertCondition(isUuid(item.id) && isUuid(item.questionId), 'practice history UUID invalid');
      const expected = expectedByKey.get(`${item.context}:${item.questionId}:${item.attemptNo}`);
      assertCondition(
        expected &&
          expected.score === item.score &&
          expected.passed === item.passed &&
          expected.recordingId === item.recordingId &&
          ['retention_pending', 'available'].includes(item.recordingStatus),
        'history attempt mismatch',
      );
    }
    passAction(action, { itemCount: response.body.items.length, nextCursor: null }, response.body);
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionStats(user) {
  const action = beginAction(user, 'practice-stats', 'GET', '/practice/stats', { terminalStatus: 200 });
  try {
    const response = await getWithBoundedRetry(user, action, '/practice/stats', { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'practice stats did not return 200');
    assertCondition(response.body?.level === user._level, 'practice stats level mismatch');
    assertCondition(validProgress(response.body?.progress), 'practice stats progress invalid');
    const practiceAttempts = user.expectedAttempts.filter((item) =>
      ['practice', 'practice-native'].includes(item.context),
    );
    const expectedPracticeAttempts = practiceAttempts.length;
    const currentUtcDay = new Date().toISOString().slice(0, 10);
    const expectedPracticedToday = practiceAttempts.filter(
      (item) => item.observedAt.slice(0, 10) === currentUtcDay,
    ).length;
    assertCondition(response.body.totalAttempts === expectedPracticeAttempts, 'practice stats total mismatch');
    assertCondition(
      Number.isInteger(response.body.streakDays) &&
        Number.isInteger(response.body.practicedToday) &&
        response.body.practicedToday === expectedPracticedToday,
      'practice stats streak/today invalid',
    );
    passAction(
      action,
      {
        level: response.body.level,
        totalAttempts: response.body.totalAttempts,
        practicedToday: response.body.practicedToday,
        streakDays: response.body.streakDays,
      },
      response.body,
    );
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionExport(user) {
  const action = beginAction(user, 'data-export', 'GET', '/auth/me/data?limit=500', { terminalStatus: 200 });
  try {
    const response = await getWithBoundedRetry(user, action, '/auth/me/data?limit=500', { token: user._token });
    assertCondition(!response.networkError && response.status === 200, 'data export did not return 200');
    assertCondition(response.body?.user?.id === user._id, 'data export returned another user');
    assertCondition(response.body.user.password_hash === undefined, 'data export exposed password hash');
    assertCondition(Array.isArray(response.body.attempts), 'data export omitted attempts');
    assertCondition(response.body.attempts.length === user.expectedAttempts.length, 'data export row count mismatch');
    assertCondition(response.body.nextCursor === null, 'small live export unexpectedly paginated');
    passAction(action, { attemptCount: response.body.attempts.length, nextCursor: null }, response.body);
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionLogoutRelogin(user) {
  const logout = beginAction(user, 'logout', 'POST', '/auth/logout', { terminalStatus: 204 });
  const revokedToken = user._token;
  try {
    const response = await requestOnce(user, logout, 'POST', '/auth/logout', { token: revokedToken });
    assertCondition(!response.networkError && response.status === 204, 'logout did not return 204');
    user.expectedFinal.tokenVersion++;
    passAction(logout, { tokenVersionIncremented: true });
  } catch (error) {
    failAction(logout, error instanceof Error ? error.message : error);
    throw error;
  }

  const revoked = beginAction(user, 'logout-token-revoked', 'GET', '/auth/me', {
    terminalStatus: 401,
    terminalCode: 'TOKEN_REVOKED',
  });
  try {
    const response = await requestOnce(user, revoked, 'GET', '/auth/me', { token: revokedToken });
    assertCondition(
      !response.networkError && response.status === 401 && response.body?.code === 'TOKEN_REVOKED',
      'logout token remained valid',
    );
    passAction(revoked, { revoked: true });
  } catch (error) {
    failAction(revoked, error instanceof Error ? error.message : error);
    throw error;
  }
  await actionLogin(user);
}

async function actionChangePassword(user) {
  const oldToken = user._token;
  const action = beginAction(user, 'change-password', 'POST', '/auth/change-password', { terminalStatus: 200 });
  try {
    const response = await requestOnce(user, action, 'POST', '/auth/change-password', {
      token: oldToken,
      json: { currentPassword: user._password, newPassword: NEW_PASSWORD },
    });
    assertCondition(!response.networkError && response.status === 200, 'change-password did not return 200');
    assertCondition(typeof response.body?.token === 'string', 'change-password omitted fresh token');
    validatePublicUser(response.body.user, user);
    user._password = NEW_PASSWORD;
    user._token = response.body.token;
    user.expectedFinal.tokenVersion++;
    passAction(action, { tokenVersionIncremented: true });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
  const revoked = beginAction(user, 'change-password-old-token-revoked', 'GET', '/auth/me', {
    terminalStatus: 401,
    terminalCode: 'TOKEN_REVOKED',
  });
  try {
    const response = await requestOnce(user, revoked, 'GET', '/auth/me', { token: oldToken });
    assertCondition(
      !response.networkError && response.status === 401 && response.body?.code === 'TOKEN_REVOKED',
      'old password-change token remained valid',
    );
    passAction(revoked, { revoked: true });
  } catch (error) {
    failAction(revoked, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionDeleteAccount(user) {
  const action = beginAction(user, 'delete-account', 'DELETE', '/auth/account', { terminalStatus: 204 });
  const deletedToken = user._token;
  try {
    const response = await requestOnce(user, action, 'DELETE', '/auth/account', {
      token: deletedToken,
      json: { password: user._password },
    });
    assertCondition(!response.networkError && response.status === 204, 'account deletion did not return 204');
    user._deleted = true;
    user.expectedFinal.exists = false;
    for (const expected of user.expectedAssessmentRequests) {
      expected.deleted = true;
      const object = trackedObjects.find((candidate) => candidate.recordingId === expected.recordingId);
      if (object) object.deletionRequested = true;
    }
    passAction(action, { deleted: true });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
  const revoked = beginAction(user, 'deleted-account-token-rejected', 'GET', '/auth/me', {
    terminalStatus: 401,
    terminalCode: 'UNAUTHENTICATED',
  });
  try {
    const response = await requestOnce(user, revoked, 'GET', '/auth/me', { token: deletedToken });
    assertCondition(!response.networkError && response.status === 401, 'deleted account token remained valid');
    passAction(revoked, { rejected: true });
  } catch (error) {
    failAction(revoked, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function actionDeleteRetainedRecordings(user) {
  for (const expected of user.expectedAssessmentRequests) {
    const route = `/recordings/${expected.recordingId}`;
    const action = beginAction(user, 'recording-delete', 'DELETE', route, { terminalStatus: 204 });
    try {
      const response = await requestOnce(user, action, 'DELETE', route, { token: user._token });
      assertCondition(!response.networkError && response.status === 204, 'recording delete did not return 204');
      expected.deleted = true;
      const object = trackedObjects.find((candidate) => candidate.recordingId === expected.recordingId);
      if (object) object.deletionRequested = true;
      passAction(action, { recordingId: expected.recordingId, deletionRequested: true });
    } catch (error) {
      failAction(action, error instanceof Error ? error.message : error);
      throw error;
    }
  }
}

async function actionErrorCheck(user) {
  const kinds = ['wrong-password', 'malformed-uuid', 'no-token', 'hostile-grant', 'unknown-request'];
  const kind = kinds[user.index % kinds.length];
  let method;
  let route;
  let options;
  let expectedStatus;
  let expectedCode;
  switch (kind) {
    case 'wrong-password':
      method = 'POST';
      route = '/auth/login';
      options = { json: { email: user._email, password: 'WrongPassword999' } };
      expectedStatus = 401;
      expectedCode = 'INVALID_CREDENTIALS';
      break;
    case 'malformed-uuid':
      method = 'GET';
      route = '/practice/question/not-a-uuid/help';
      options = { token: user._token };
      expectedStatus = 400;
      expectedCode = 'VALIDATION_FAILED';
      break;
    case 'no-token':
      method = 'GET';
      route = '/practice/question';
      options = {};
      expectedStatus = 401;
      expectedCode = 'UNAUTHENTICATED';
      break;
    case 'hostile-grant':
      method = 'POST';
      route = '/uploads/audio-url';
      options = {
        token: user._token,
        json: { contentType: 'application/x-live-load-invalid', assessmentEndpoint: ENDPOINTS.diagnostic },
      };
      expectedStatus = 415;
      expectedCode = 'AUDIO_INVALID';
      break;
    default:
      method = 'GET';
      route = `/assessments/${randomUUID()}`;
      options = { token: user._token };
      expectedStatus = 404;
      expectedCode = 'NOT_FOUND';
  }
  const action = beginAction(user, `error-check:${kind}`, method, route, {
    terminalStatus: expectedStatus,
    terminalCode: expectedCode,
  });
  try {
    const response = await requestOnce(user, action, method, route, options);
    assertCondition(
      !response.networkError && response.status === expectedStatus && response.body?.code === expectedCode,
      `${kind} error contract mismatch`,
    );
    passAction(action, { kind, rejected: true, code: response.body?.code || null });
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

const phaseStats = [];

async function systemGet(logicalAction, route, expectedStatus) {
  const action = beginAction(systemTarget, logicalAction, 'GET', route, { terminalStatus: expectedStatus });
  try {
    const response = await getWithBoundedRetry(systemTarget, action, route);
    assertCondition(!response.networkError && response.status === expectedStatus, `${logicalAction} status mismatch`);
    passAction(action, { status: response.status, ok: response.body?.ok ?? null }, response.body ?? undefined);
    return response;
  } catch (error) {
    failAction(action, error instanceof Error ? error.message : error);
    throw error;
  }
}

async function systemPreflight() {
  const health = await systemGet('health-preflight', '/health', 200);
  assertCondition(health.body?.ok === true, 'health preflight body invalid');
  const ready = await systemGet('readiness-preflight', '/ready', 200);
  assertCondition(ready.body?.ok === true, 'readiness preflight body invalid');
  const notFound = await systemGet('terminal-json-404', `/__live_load_not_found_${runId}`, 404);
  assertCondition(notFound.body?.code === 'NOT_FOUND', 'terminal 404 body invalid');
  const expectedStatus = METRICS_EXPECTED === 'enabled' ? 200 : 404;
  const metrics = await systemGet('metrics-contract', '/metrics', expectedStatus);
  if (expectedStatus === 200) {
    assertCondition(
      metrics.headers.get('content-type')?.includes('text/plain') && metrics.text.includes('http_'),
      'metrics response was not Prometheus text',
    );
  }
}

function isMissingObjectError(error, object) {
  return (
    error?.name === 'NoSuchKey' ||
    error?.name === 'NotFound' ||
    error?.name === '404' ||
    error?.$metadata?.httpStatusCode === 404 ||
    (object.readProvenBeforeSubmission && error?.name === 'AccessDenied' && error?.$metadata?.httpStatusCode === 403)
  );
}

function s3AbortSignal(includeRunSignal = false) {
  const timeout = AbortSignal.timeout(S3_OPERATION_TIMEOUT_MS);
  return includeRunSignal ? AbortSignal.any([timeout, runAbortController.signal]) : timeout;
}

async function objectExists(object, includeRunSignal = false) {
  const target = targets[object.scope];
  try {
    const response = await target.client.send(
      new GetObjectCommand({ Bucket: target.bucket, Key: object.rawKey, Range: 'bytes=0-0' }),
      { abortSignal: s3AbortSignal(includeRunSignal) },
    );
    response.Body?.destroy?.();
    return true;
  } catch (error) {
    if (isMissingObjectError(error, object)) return false;
    throw error;
  }
}

async function listExactObjectVersions(object) {
  const target = targets[object.scope];
  const found = [];
  let keyMarker;
  let versionIdMarker;
  const seen = new Set();
  for (let page = 0; page < 1000; page++) {
    const listed = await target.client.send(
      new ListObjectVersionsCommand({
        Bucket: target.bucket,
        Prefix: object.rawKey,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      }),
      { abortSignal: s3AbortSignal() },
    );
    for (const version of [...(listed.Versions || []), ...(listed.DeleteMarkers || [])]) {
      if (version.Key === object.rawKey && version.VersionId) {
        found.push({ Key: object.rawKey, VersionId: version.VersionId });
      }
    }
    if (!listed.IsTruncated) return found;
    assertCondition(listed.NextKeyMarker && listed.NextVersionIdMarker, 'truncated S3 listing omitted markers');
    const identity = `${listed.NextKeyMarker}\u0000${listed.NextVersionIdMarker}`;
    assertCondition(!seen.has(identity), 'S3 listing repeated continuation markers');
    seen.add(identity);
    keyMarker = listed.NextKeyMarker;
    versionIdMarker = listed.NextVersionIdMarker;
  }
  throw new Error('S3 version listing exceeded page bound');
}

async function waitForAllVersionsMissing(object) {
  for (const waitMs of [0, 1_000]) {
    if (waitMs > 0) await delay(waitMs, false);
    if ((await listExactObjectVersions(object)).length === 0) return true;
  }
  return false;
}

async function deleteAllObjectVersions(object) {
  const target = targets[object.scope];
  const versions = await listExactObjectVersions(object);
  if (versions.length === 0) return;
  const deleted = await target.client.send(
    new DeleteObjectsCommand({ Bucket: target.bucket, Delete: { Objects: versions, Quiet: true } }),
    { abortSignal: s3AbortSignal() },
  );
  if ((deleted.Errors?.length || 0) > 0) throw new Error('S3 cleanup returned per-version errors');
}

async function auditOneObject(object) {
  let exists;
  try {
    if (object.deletionRequested) {
      object.allVersionsAbsentAfterDeletion = await waitForAllVersionsMissing(object);
      exists = !object.allVersionsAbsentAfterDeletion;
    } else {
      exists = await objectExists(object);
    }
  } catch (error) {
    object.errorCode = object.errorCode || (error instanceof Error ? error.name : 'S3AuditError');
    // Unknown state fails closed: still attempt deletion of the exact load-owned key.
    exists = true;
  }
  if (exists) {
    object.cleanupAttempted = true;
    try {
      await deleteAllObjectVersions(object);
      object.absentAfterCleanup = await waitForAllVersionsMissing(object);
    } catch (error) {
      object.absentAfterCleanup = false;
      object.errorCode = object.errorCode || (error instanceof Error ? error.name : 'S3CleanupError');
    }
  } else {
    object.absentAfterCleanup = true;
  }
}

async function auditAndCleanupS3() {
  console.log(`S3 audit start: ${trackedObjects.length} load-owned keys`);
  await runPool(trackedObjects, S3_AUDIT_CONCURRENCY, auditOneObject);
  const objects = trackedObjects.map((object) => ({
    keyHash: object.keyHash,
    audioFixtureId: object.audioFixtureId,
    scope: object.scope,
    ownerUserIndex: object.ownerUserIndex,
    requestId: object.requestId,
    assessmentEndpoint: object.assessmentEndpoint,
    outcome: object.outcome,
    recordingId: object.recordingId,
    uploaded: object.uploaded,
    expectedRetainedAfterSuccess: object.expectedRetainedAfterSuccess,
    retainedAfterSuccess: object.retainedAfterSuccess,
    retainedVersionHash: object.retainedVersionHash,
    deletionRequested: object.deletionRequested === true,
    allVersionsAbsentAfterDeletion: object.allVersionsAbsentAfterDeletion,
    cleanupAttempted: object.cleanupAttempted,
    absentAfterCleanup: object.absentAfterCleanup,
    allVersionsAbsentFinal: object.absentAfterCleanup === true,
    errorCode: object.errorCode,
    readProvenBeforeSubmission: object.readProvenBeforeSubmission,
  }));
  const counts = {
    total: objects.length,
    uploaded: objects.filter((object) => object.uploaded).length,
    successfulAssessments: objects.filter((object) => object.outcome === 'assessment-completed').length,
    successfulRetainedAndPlayed: objects.filter(
      (object) => object.expectedRetainedAfterSuccess && object.retainedAfterSuccess === true,
    ).length,
    backendDeletedAllVersions: objects.filter(
      (object) => object.deletionRequested && object.allVersionsAbsentAfterDeletion === true,
    ).length,
    cleanupAttempted: objects.filter((object) => object.cleanupAttempted).length,
    absentAfterCleanup: objects.filter((object) => object.absentAfterCleanup === true).length,
    auditFailures: objects.filter(
      (object) =>
        (object.expectedRetainedAfterSuccess && object.retainedAfterSuccess !== true) ||
        object.absentAfterCleanup !== true ||
        object.errorCode !== null,
    ).length,
  };
  console.log(`S3 audit end: ${JSON.stringify(counts)}`);
  return { objects, counts };
}

async function finishCleanupJournal(s3Audit) {
  if (cleanupJournalHandle) {
    await cleanupJournalHandle.sync();
    await cleanupJournalHandle.close();
    cleanupJournalHandle = undefined;
  }
  const everyTrackedKeyAbsent =
    s3Audit.objects.length === trackedObjects.length &&
    s3Audit.objects.every((object) => object.absentAfterCleanup === true);
  if (everyTrackedKeyAbsent) {
    await unlink(cleanupJournalFile).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
    campaignStateSummary.cleanupJournalStatus = 'deleted-after-all-keys-proved-absent';
  } else {
    campaignStateSummary.cleanupJournalStatus = 'retained-for-manual-cleanup';
  }
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1)];
}

function allActions() {
  return [...systemTarget.actions, ...users.flatMap((user) => user.actions)];
}

function buildSummary(s3Audit) {
  const attempts = allActions().flatMap((action) => action.attempts);
  const latencies = attempts.map((attempt) => attempt.latencyMs).filter(Number.isFinite);
  const byRouteStatus = {};
  for (const attempt of attempts) {
    const key = `${attempt.method} ${attempt.route} ${attempt.status ?? 'NETERR'}`;
    byRouteStatus[key] = (byRouteStatus[key] || 0) + 1;
  }
  return {
    users: USER_COUNT,
    provisionConcurrency: PROVISION_CONCURRENCY,
    sessionConcurrency: SESSION_CONCURRENCY,
    paidConcurrency: PAID_CONCURRENCY,
    activeSessionsEstablished: counters.activeSessionsEstablished,
    failedUsers: users.filter((user) => user.failures.length > 0).length,
    deletedUsers: users.filter((user) => user._deleted).length,
    httpAttempts: attempts.length,
    networkErrors: counters.networkErrors,
    capacityBusy: counters.capacityBusy,
    providerFailures: counters.providerFailures,
    potentialPaidAttempts: counters.potentialPaidAttempts,
    refundedPotentialPaidAttempts: counters.refundedPotentialPaidAttempts,
    freshAssessmentsPlanned: counters.freshAssessmentsPlanned,
    freshAssessmentsCompleted: counters.freshAssessmentsCompleted,
    statusPolls: counters.statusPolls,
    interruptedBy,
    campaignState: campaignStateSummary,
    latencyMs: {
      p50: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
      p99: Math.round(percentile(latencies, 99)),
      max: latencies.length > 0 ? Math.round(Math.max(...latencies)) : 0,
    },
    byRouteStatus,
    phases: phaseStats,
    s3: s3Audit.counts,
  };
}

function requiredRateLimitNamespaces() {
  const namespaces = [
    'auth',
    'register',
    'login-account',
    'assess',
    'assess-ip-daily',
    'upload-grant',
    'playback-grant',
  ];
  if (users.some((user) => user.index % 100 === 9)) namespaces.push('forgot-email');
  if (users.some((user) => user.index % 100 === 2)) namespaces.push('diagnostic-restart');
  if (users.some((user) => user.index % 20 === 9 || user.index % 20 === 19)) namespaces.push('password-account');
  return namespaces;
}

function publicUserLedger(user) {
  user.expectedPracticeProgress = [...user._progress.values()].sort((a, b) => a.questionId.localeCompare(b.questionId));
  return {
    index: user.index,
    idHash: user.idHash,
    emailHash: user.emailHash,
    nativeLanguage: user.nativeLanguage,
    cohort: user.cohort,
    expectedFinal: user.expectedFinal,
    expectedAttempts: user.expectedAttempts,
    expectedAssessmentRequests: user.expectedAssessmentRequests,
    expectedPracticeProgress: user.expectedPracticeProgress,
    expectedUsageReservations: user.expectedUsageReservations,
    nativeInvariantExpected: user.nativeInvariantExpected,
    actions: user.actions,
    failures: user.failures,
  };
}

function sourceNetworkMetadata() {
  if (!VIRTUAL_SOURCE_IPS) {
    return {
      mode: 'direct',
      virtualSourceIps: false,
      userSourceCount: 0,
      totalUniqueSourceCount: 0,
    };
  }
  return {
    mode: 'virtual-rfc2544',
    virtualSourceIps: true,
    userSourceCount: USER_COUNT,
    totalUniqueSourceCount: USER_COUNT + 1,
    assignmentDigest: virtualSourceAssignmentDigest(USER_COUNT),
  };
}

async function writeLedger(s3Audit, fatalError) {
  const finishedAt = new Date().toISOString();
  const deletedReservations = users
    .filter((user) => user._deleted)
    .reduce((total, user) => total + user.expectedUsageReservations, 0);
  const summary = buildSummary(s3Audit);
  if (fatalError)
    summary.fatalError = fatalError instanceof Error ? safeFailureMessage(fatalError.message) : 'FatalError';
  const ledger = {
    schemaVersion: 1,
    run: {
      runId,
      emailPrefix,
      baseOrigin: BASE,
      userCount: USER_COUNT,
      provisionConcurrency: PROVISION_CONCURRENCY,
      sessionConcurrency: SESSION_CONCURRENCY,
      paidConcurrency: PAID_CONCURRENCY,
      startedAt: new Date(runStartedMs).toISOString(),
      finishedAt,
      clientVersion: CLIENT_VERSION,
      sourceNetwork: sourceNetworkMetadata(),
      models: {
        transcription: LIVE_TRANSCRIPTION_MODEL,
        grading: LIVE_GRADING_MODEL,
      },
      pricingManifest,
      freshAssessmentCeiling: FRESH_ASSESSMENT_CEILING,
      freshAssessmentsPlanned: counters.freshAssessmentsPlanned,
      paidAttemptCeiling: PAID_ATTEMPT_CEILING,
      potentialPaidAttempts: counters.potentialPaidAttempts,
      databaseBaseline: 'fresh-required',
      freshDatabaseExpected: true,
      budget: {
        limitUsd: LIVE_BUDGET_USD,
        projectedWorstCaseUsd: Number(projectedWorstCaseUsd.toFixed(4)),
        projectedProviderUsd: Number(projectedProviderUsd.toFixed(4)),
        whisperUsd: Number(projectedWhisperUsd.toFixed(4)),
        gptUsd: Number(projectedGptUsd.toFixed(4)),
        infrastructureReserveUsd: INFRASTRUCTURE_RESERVE_USD,
        protectedExposureUsd: Number(
          ((campaignStateSummary.cumulativeUpperBoundAfterUsd ?? 0) + INFRASTRUCTURE_RESERVE_USD).toFixed(4),
        ),
      },
      audioCorpus: audioCorpusInternal.map((audio) => ({
        id: audio.id,
        sha256: audio.sha256,
        sizeBytes: audio.sizeBytes,
        durationSeconds: audio.durationSeconds,
        contentType: audio.contentType,
        extension: audio.extension,
      })),
    },
    systemActions: systemTarget.actions,
    summary,
    expectedUsage: {
      total: users.reduce((total, user) => total + user.expectedUsageReservations, 0),
      anonymizedDeleted: deletedReservations,
      paidFailures: counters.expectedPaidFailures,
    },
    campaignStateSummary,
    requiredRateLimitNamespaces: requiredRateLimitNamespaces(),
    users: users.map(publicUserLedger),
    s3Audit,
  };
  await mkdir(REPORTS_DIR, { recursive: true });
  const reportPath = path.join(REPORTS_DIR, `ledger-${runId}.json`);
  await writeFile(reportPath, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 });
  return { reportPath, ledger };
}

async function main() {
  console.log(
    `live load ${runId}: ${USER_COUNT} users, provision concurrency ${PROVISION_CONCURRENCY}, session concurrency ${SESSION_CONCURRENCY}, paid concurrency ${PAID_CONCURRENCY}, logical ceiling ${FRESH_ASSESSMENT_CEILING}, paid-attempt ceiling ${PAID_ATTEMPT_CEILING}, projected protected exposure $${projectedWorstCaseUsd.toFixed(2)}`,
  );
  await systemPreflight();
  await runPhase('register', users, PROVISION_CONCURRENCY, actionRegister);
  await runPhase('login', users, PROVISION_CONCURRENCY, actionLogin);
  counters.activeSessionsEstablished = users.filter((user) => user._token && user.failures.length === 0).length;
  assertCondition(
    counters.activeSessionsEstablished === USER_COUNT,
    `only ${counters.activeSessionsEstablished}/${USER_COUNT} active sessions were established`,
  );
  await runPhase('simultaneous authenticated session barrier (GET /auth/me)', users, SESSION_CONCURRENCY, actionMe);
  await runPhase(
    'profile update cohort',
    users.filter((user) => user.index % 20 === 0),
    SESSION_CONCURRENCY,
    actionProfileUpdate,
  );
  await runPhase(
    'forgot + invalid reset cohort',
    // These users later change their password, which revokes the reset token;
    // the final database must not retain a live reset credential.
    users.filter((user) => user.index % 100 === 9),
    Math.min(20, SESSION_CONCURRENCY),
    actionForgotAndInvalidReset,
  );
  await runPhase(
    'diagnostic restart cohort',
    users.filter((user) => user.index % 100 === 2),
    Math.min(20, SESSION_CONCURRENCY),
    actionDiagnosticRestart,
  );
  await runPhase('diagnostic journey', users, PAID_CONCURRENCY, actionDiagnosticJourney);
  await runPhase('practice question', users, SESSION_CONCURRENCY, actionPracticeQuestion);
  await runPhase(
    'practice skip cohort',
    users.filter((user) => user.index % 20 === 3),
    Math.min(20, SESSION_CONCURRENCY),
    actionSkip,
  );
  const full = users.filter((user) => user.cohort === 'full');
  const english = users.filter((user) => user.cohort === 'full' || user.cohort === 'english');
  const native = users.filter((user) => user.cohort === 'full' || user.cohort === 'native');
  await runPhase('help + ETag', full, SESSION_CONCURRENCY, actionHelp);
  await runPhase('English practice journey', english, PAID_CONCURRENCY, actionEnglishJourney);
  await runPhase('native practice journey', native, PAID_CONCURRENCY, actionNativeJourney);
  await runPhase(
    'native idempotent replay',
    full.filter((user) => user._nativeAssessment),
    Math.min(50, SESSION_CONCURRENCY),
    actionNativeReplay,
  );
  await runPhase('durable assessment result access', users, SESSION_CONCURRENCY, actionDurableAssessmentAccess);
  await runPhase('recording library + authorized playback', users, SESSION_CONCURRENCY, actionRecordingLibrary);
  await runPhase('history', users, SESSION_CONCURRENCY, actionHistory);
  await runPhase('stats', users, SESSION_CONCURRENCY, actionStats);
  await runPhase(
    'data export',
    users.filter((user) => user.cohort === 'full' || user.index % 20 === 19),
    SESSION_CONCURRENCY,
    actionExport,
  );
  await runPhase(
    'logout + relogin cohort',
    users.filter((user) => user.index % 20 === 8),
    Math.min(50, SESSION_CONCURRENCY),
    actionLogoutRelogin,
  );
  await runPhase(
    'change-password cohort',
    users.filter((user) => user.index % 20 === 9),
    Math.min(50, SESSION_CONCURRENCY),
    actionChangePassword,
  );
  await runPhase(
    'delete-account cohort',
    users.filter((user) => user.index % 20 === 19),
    Math.min(50, SESSION_CONCURRENCY),
    actionDeleteAccount,
  );
  await runPhase(
    'individual retained-recording deletion',
    users.filter((user) => !user._deleted),
    SESSION_CONCURRENCY,
    actionDeleteRetainedRecordings,
  );
  await runPhase(
    'error-path cohorts',
    users.filter((user) => !user._deleted),
    SESSION_CONCURRENCY,
    actionErrorCheck,
  );
}

let fatalError = null;
let s3Audit = { objects: [], counts: { total: 0, auditFailures: 0 } };
let ledgerWritten = false;
try {
  // Local fixture/config checks above are free. From this point onward no
  // network request is permitted until the entire campaign exposure is durably
  // reserved and the raw-key cleanup journal exists.
  await prepareCampaignBudget();
  await prepareCleanupJournal();
  await main();
} catch (error) {
  fatalError = error;
  console.error(
    `fatal live-load error: ${error instanceof Error ? safeFailureMessage(error.message) : 'unknown error'}`,
  );
} finally {
  try {
    s3Audit = await auditAndCleanupS3();
  } catch (error) {
    fatalError ||= error;
    console.error(`S3 audit failed: ${error instanceof Error ? safeFailureMessage(error.message) : 'unknown error'}`);
  }
  try {
    await finishCleanupJournal(s3Audit);
  } catch (error) {
    fatalError ||= error;
    campaignStateSummary.cleanupJournalStatus = 'retained-after-journal-finalization-error';
  }
  for (const target of Object.values(targets)) target.client.destroy();
  const logicalRunFailed =
    users.some((user) => user.failures.length > 0) || counters.providerFailures > 0 || s3Audit.counts.auditFailures > 0;
  const controlledOutcome = interruptedBy
    ? `interrupted-${interruptedBy}`
    : fatalError || logicalRunFailed
      ? 'failed'
      : 'passed';
  try {
    await finishCampaignBudget(controlledOutcome);
  } catch (error) {
    fatalError ||= error;
    campaignStateSummary.status = 'reservation-retained-after-finalization-error';
    campaignStateSummary.activeReservation = campaignReservationActive;
  }
  try {
    const { reportPath, ledger } = await writeLedger(s3Audit, fatalError);
    ledgerWritten = true;
    console.log(`live-load ledger: ${reportPath}`);
    console.log(`summary: ${JSON.stringify(ledger.summary)}`);
    if (
      fatalError ||
      interruptedBy ||
      ledger.summary.failedUsers > 0 ||
      ledger.summary.providerFailures > 0 ||
      ledger.s3Audit.counts.auditFailures > 0 ||
      counters.freshAssessmentsPlanned > FRESH_ASSESSMENT_CEILING ||
      counters.potentialPaidAttempts > PAID_ATTEMPT_CEILING
    ) {
      process.exitCode = 1;
    } else {
      console.log('PASS: every live-load logical action and S3 audit check succeeded');
    }
  } catch (error) {
    console.error(`live-load ledger write failed: ${safeFailureMessage(error.message)}`);
    process.exitCode = 1;
  }
  if (ledgerWritten && !campaignReservationActive) {
    await releaseCampaignLock().catch((error) => {
      console.error(`campaign lock release failed: ${safeFailureMessage(error.message)}`);
      process.exitCode = 1;
    });
  }
  process.removeListener('SIGINT', onSigint);
  process.removeListener('SIGTERM', onSigterm);
}
