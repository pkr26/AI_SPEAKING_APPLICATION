#!/usr/bin/env node

// Read-only, every-user reconciliation for load-1000-live.mjs.
//
// Usage:
//   LOAD_DATABASE_URL=postgres://.../ai_english_load1000_live \
//     node scripts/verify-1000-live.mjs [reports/load1000-live/ledger-....json]
// Set EXPECTED_LOAD_USERS for a staged 1..1000-user ledger; it defaults to
// 1000 so an accidentally partial final run fails closed.
//
// The database connection is forced into PostgreSQL's read-only mode. The
// verifier writes only its reconciliation JSON report beside the source
// ledger; it never changes application, provider, or S3 state.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const EXPECTED_SCHEMA_VERSION = 1;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const REPORTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'reports', 'load1000-live');
const SEED_SQL_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'seed.sql');
const UUID_ZERO = '00000000-0000-0000-0000-000000000000';

function expectedLoadUsers() {
  const raw = process.env.EXPECTED_LOAD_USERS?.trim() || '1000';
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000) {
    throw new Error('EXPECTED_LOAD_USERS must be an integer from 1 to 1000');
  }
  return value;
}

function requireDatabaseUrl() {
  const value = process.env.LOAD_DATABASE_URL?.trim();
  if (!value) throw new Error('LOAD_DATABASE_URL is required; no database default is permitted for live verification');
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('LOAD_DATABASE_URL must be a valid PostgreSQL URL');
  }
  if ((parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') || !parsed.hostname) {
    throw new Error('LOAD_DATABASE_URL must be a PostgreSQL URL with a host');
  }
  let databaseName;
  try {
    databaseName = decodeURIComponent(parsed.pathname.slice(1));
  } catch {
    throw new Error('LOAD_DATABASE_URL database name must use valid percent encoding');
  }
  if (!databaseName || databaseName.includes('/')) {
    throw new Error('LOAD_DATABASE_URL must name exactly one PostgreSQL database');
  }
  if (!/load/i.test(databaseName)) {
    throw new Error(`refusing non-load database named by LOAD_DATABASE_URL: "${databaseName}"`);
  }
  return { value, databaseName };
}

function newestLedgerPath() {
  const candidates = fs
    .readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('ledger-') && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  if (candidates.length === 0) throw new Error(`no live ledger found in ${REPORTS_DIR}`);
  return path.join(REPORTS_DIR, candidates[candidates.length - 1]);
}

function readLedger() {
  const requested = process.argv[2] ? path.resolve(process.argv[2]) : newestLedgerPath();
  const stat = fs.lstatSync(requested);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('ledger path must name a regular, non-symlink file');
  const ledger = JSON.parse(fs.readFileSync(requested, 'utf8'));
  return { ledger, ledgerPath: requested };
}

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

const RFC2544_ADDRESS_COUNT = 2 * 256 * 256;
const SYSTEM_VIRTUAL_SOURCE_OFFSET = RFC2544_ADDRESS_COUNT - 2;

function rfc2544Address(offset) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= RFC2544_ADDRESS_COUNT) {
    throw new Error('RFC 2544 source address offset is invalid');
  }
  const secondOctet = 18 + Math.floor(offset / (256 * 256));
  const withinSecondOctet = offset % (256 * 256);
  return `198.${secondOctet}.${Math.floor(withinSecondOctet / 256)}.${withinSecondOctet % 256}`;
}

function expectedVirtualSourceAssignmentDigest(userCount) {
  const assignments = [`system=${rfc2544Address(SYSTEM_VIRTUAL_SOURCE_OFFSET)}`];
  for (let index = 0; index < userCount; index++) {
    assignments.push(`user:${index}=${rfc2544Address(index + 1)}`);
  }
  return sha256(assignments.join('\n'));
}

function normalizeDigest(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value) ? value : undefined;
}

function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(',')}}`;
}

function jsonDigest(value) {
  return sha256(canonicalJson(value));
}

function decodeGeneratedSqlLiteral(literal) {
  const escapeLiteral = literal.startsWith("E'");
  const body = literal.slice(escapeLiteral ? 2 : 1, -1);
  if (!escapeLiteral) return body.replaceAll("''", "'");
  let decoded = '';
  for (let index = 0; index < body.length; index++) {
    if (body[index] === '\\' && index + 1 < body.length) index++;
    decoded += body[index];
  }
  return decoded;
}

function readAuthoritativeCatalog() {
  const sqlLiteral = "((?:E)?'(?:''|\\\\.|[^'])*')";
  const insertPattern = new RegExp(
    `VALUES \\(${sqlLiteral}, ${sqlLiteral}, ${sqlLiteral}, ${sqlLiteral}::jsonb\\) ON CONFLICT`,
  );
  const rows = [];
  for (const line of fs.readFileSync(SEED_SQL_PATH, 'utf8').split('\n')) {
    if (!line.startsWith('INSERT INTO questions')) continue;
    const match = insertPattern.exec(line);
    if (!match) throw new Error('packaged seed.sql contains an unparseable question row');
    rows.push({
      cefrLevel: decodeGeneratedSqlLiteral(match[1]),
      promptWord: decodeGeneratedSqlLiteral(match[2]),
      questionText: decodeGeneratedSqlLiteral(match[3]),
      translations: JSON.parse(decodeGeneratedSqlLiteral(match[4])),
    });
  }
  if (rows.length !== 600) throw new Error(`packaged seed.sql contains ${rows.length} questions instead of 600`);
  return rows.sort(
    (left, right) => left.cefrLevel.localeCompare(right.cefrLevel) || left.promptWord.localeCompare(right.promptWord),
  );
}

function escapeLikePrefix(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function asInteger(value) {
  return Number.isSafeInteger(value) ? value : undefined;
}

function asTimestamp(value) {
  if (typeof value !== 'string') return undefined;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : undefined;
}

function sameOptionalDigest(expected, actualValue) {
  const digest = normalizeDigest(expected);
  return digest === undefined || digest === sha256(actualValue ?? '');
}

function groupBy(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(row);
  }
  return grouped;
}

function expectedFinalFor(user) {
  if (user.expectedFinal && typeof user.expectedFinal === 'object') return user.expectedFinal;
  return undefined;
}

function expectedAttemptsFor(user) {
  if (Array.isArray(user.expectedAttempts)) return user.expectedAttempts;
  return [];
}

function expectedRequestsFor(user) {
  if (Array.isArray(user.expectedAssessmentRequests)) return user.expectedAssessmentRequests;
  return [];
}

function expectedProgressFor(user) {
  if (Array.isArray(user.expectedPracticeProgress)) return user.expectedPracticeProgress;
  return [];
}

const ERROR_CONTRACTS = [
  { kind: 'wrong-password', method: 'POST', status: 401, code: 'INVALID_CREDENTIALS' },
  { kind: 'malformed-uuid', method: 'GET', status: 400, code: 'VALIDATION_FAILED' },
  { kind: 'no-token', method: 'GET', status: 401, code: 'UNAUTHENTICATED' },
  { kind: 'hostile-grant', method: 'POST', status: 415, code: 'AUDIO_INVALID' },
  { kind: 'unknown-request', method: 'GET', status: 404, code: 'NOT_FOUND' },
];

const ACTION_CONTRACTS = new Map([
  ['login', { method: 'POST', statuses: [200] }],
  ['get-me', { method: 'GET', statuses: [200] }],
  ['profile-update', { method: 'PATCH', statuses: [200] }],
  ['forgot-password-uniform', { method: 'POST', statuses: [204] }],
  ['reset-password-invalid-token', { method: 'POST', statuses: [400], code: 'RESET_INVALID' }],
  ['diagnostic-restart', { method: 'POST', statuses: [204] }],
  ['diagnostic-next', { method: 'GET', statuses: [200] }],
  ['practice-question', { method: 'GET', statuses: [200] }],
  ['practice-question-after-skip', { method: 'GET', statuses: [200] }],
  ['practice-skip', { method: 'POST', statuses: [204] }],
  ['practice-help-etag', { method: 'GET', statuses: [304] }],
  ['practice-history', { method: 'GET', statuses: [200] }],
  ['practice-stats', { method: 'GET', statuses: [200] }],
  ['recordings-list', { method: 'GET', statuses: [200] }],
  ['recordings-export', { method: 'GET', statuses: [200] }],
  ['recording-playback', { method: 'POST', statuses: [200] }],
  ['recording-delete', { method: 'DELETE', statuses: [204] }],
  ['data-export', { method: 'GET', statuses: [200] }],
  ['logout', { method: 'POST', statuses: [204] }],
  ['logout-token-revoked', { method: 'GET', statuses: [401], code: 'TOKEN_REVOKED' }],
  ['change-password', { method: 'POST', statuses: [200] }],
  ['change-password-old-token-revoked', { method: 'GET', statuses: [401], code: 'TOKEN_REVOKED' }],
  ['delete-account', { method: 'DELETE', statuses: [204] }],
  ['deleted-account-token-rejected', { method: 'GET', statuses: [401], code: 'UNAUTHENTICATED' }],
]);

function incrementCount(counts, name, amount = 1) {
  if (amount === 0) return;
  if (!Number.isSafeInteger(amount) || amount < 0)
    throw new Error('action inventory count must be a nonnegative integer');
  counts.set(name, (counts.get(name) ?? 0) + amount);
}

function expectedCohort(index) {
  if (index % 10 <= 3) return 'full';
  if (index % 10 <= 6) return 'english';
  if (index % 10 <= 8) return 'native';
  return 'account';
}

function expectedUserActionCounts(user) {
  const counts = new Map();
  const index = user.index;
  const cohort = expectedCohort(index);
  const requests = expectedRequestsFor(user);
  const diagnosticAssessments = requests.filter((request) => request.context === 'diagnostic').length;
  const englishAssessments = requests.filter((request) => request.context === 'practice').length;
  const nativeAssessments = requests.filter((request) => request.context === 'practice-native').length;

  for (const action of [
    'register',
    'login',
    'get-me',
    'diagnostic-next',
    'practice-question',
    'practice-history',
    'practice-stats',
  ]) {
    incrementCount(counts, action);
  }
  incrementCount(counts, 'upload-grant:diagnostic', diagnosticAssessments);
  incrementCount(counts, 's3-upload:diagnostic', diagnosticAssessments);
  incrementCount(counts, 'assessment:diagnostic', diagnosticAssessments);
  incrementCount(counts, 'assessment-durable-access:diagnostic', diagnosticAssessments);
  incrementCount(counts, 'upload-grant:practice', englishAssessments + nativeAssessments);
  incrementCount(counts, 's3-upload:practice', englishAssessments + nativeAssessments);
  incrementCount(counts, 'assessment:practice', englishAssessments);
  incrementCount(counts, 'assessment:practice-native', nativeAssessments);
  incrementCount(counts, 'assessment-durable-access:practice', englishAssessments);
  incrementCount(counts, 'assessment-durable-access:practice-native', nativeAssessments);
  incrementCount(counts, 'recordings-list');
  incrementCount(counts, 'recordings-export');
  incrementCount(counts, 'recording-playback', requests.length);

  if (index % 20 === 0) incrementCount(counts, 'profile-update');
  if (index % 100 === 9) {
    incrementCount(counts, 'forgot-password-uniform');
    incrementCount(counts, 'reset-password-invalid-token');
  }
  if (index % 100 === 2) incrementCount(counts, 'diagnostic-restart');
  if (index % 20 === 3) {
    incrementCount(counts, 'practice-skip');
    incrementCount(counts, 'practice-question-after-skip');
  }
  if (cohort === 'full') incrementCount(counts, 'practice-help-etag');
  if (cohort === 'full') incrementCount(counts, 'assessment-replay:practice-native');
  if (cohort === 'full' || index % 20 === 19) incrementCount(counts, 'data-export');
  if (index % 20 === 8) {
    incrementCount(counts, 'logout');
    incrementCount(counts, 'logout-token-revoked');
    incrementCount(counts, 'login');
  }
  if (index % 20 === 9) {
    incrementCount(counts, 'change-password');
    incrementCount(counts, 'change-password-old-token-revoked');
  }
  if (index % 20 === 19) {
    incrementCount(counts, 'delete-account');
    incrementCount(counts, 'deleted-account-token-rejected');
  } else {
    incrementCount(counts, 'recording-delete', requests.length);
    incrementCount(counts, `error-check:${ERROR_CONTRACTS[index % ERROR_CONTRACTS.length].kind}`);
  }
  return counts;
}

function independentActionContract(logicalAction) {
  if (logicalAction === 'register') return { method: 'POST', statuses: [200, 201] };
  if (logicalAction.startsWith('upload-grant:')) return { method: 'POST', statuses: [200] };
  if (logicalAction.startsWith('s3-upload:')) return { method: 'POST', statuses: [204] };
  if (logicalAction.startsWith('assessment-replay:')) return { method: 'POST', statuses: [200] };
  if (logicalAction.startsWith('assessment-durable-access:')) return { method: 'GET', statuses: [200] };
  if (logicalAction.startsWith('assessment:')) return { method: 'POST', statuses: [200] };
  if (logicalAction.startsWith('error-check:')) {
    const error = ERROR_CONTRACTS.find((candidate) => logicalAction === `error-check:${candidate.kind}`);
    return error ? { method: error.method, statuses: [error.status], code: error.code } : undefined;
  }
  return ACTION_CONTRACTS.get(logicalAction);
}

function countsObject(counts) {
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function successfulS3Outcome(outcome) {
  return new Set([
    'success',
    'successful',
    'completed',
    'assessment-success',
    'successful-assessment',
    'assessment-completed',
  ]).has(outcome);
}

function forbiddenLedgerPaths(value, currentPath = '$', found = []) {
  if (typeof value === 'string') {
    const sensitiveValue =
      /audio-uploads\/(?:diagnostic|practice)\//i.test(value) ||
      /(?:X-Amz-Credential|X-Amz-Signature)=/i.test(value) ||
      /^Bearer\s+/i.test(value) ||
      /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ||
      /^sk-[A-Za-z0-9_-]{16,}$/.test(value) ||
      /(?:^|[^0-9])198\.(?:18|19)\.\d{1,3}\.\d{1,3}(?:$|[^0-9])/.test(value) ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (sensitiveValue) found.push(currentPath);
    return found;
  }
  if (value === null || typeof value !== 'object') return found;
  const forbiddenKeys = new Set([
    '_email',
    '_id',
    '_password',
    '_token',
    'accessKeyId',
    'audioKey',
    'authorization',
    'bytes',
    'email',
    'filePath',
    'grant',
    'name',
    'password',
    'rawEmail',
    'rawKey',
    'rawUserId',
    'secretAccessKey',
    'sessionToken',
    'signedFields',
    'token',
    'uploadFields',
    'uploadUrl',
    'userId',
  ]);
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    // Legacy stage ledgers used `name` for a fixed phase label such as
    // "register" or "diagnostic journey". That field is operational metadata,
    // not a learner's raw display name; keep rejecting `name` everywhere else.
    const safeLegacyPhaseLabel = key === 'name' && /^\$\.summary\.phases\.\d+$/.test(currentPath);
    if (forbiddenKeys.has(key) && !safeLegacyPhaseLabel) found.push(childPath);
    forbiddenLedgerPaths(child, childPath, found);
  }
  return found;
}

function invalidDigestPaths(value, currentPath = '$', found = []) {
  if (value === null || typeof value !== 'object') return found;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if ((key === 'sha256' || key.endsWith('Digest') || key.endsWith('Hash')) && !normalizeDigest(child)) {
      found.push(childPath);
    }
    invalidDigestPaths(child, childPath, found);
  }
  return found;
}

async function main() {
  const { value: databaseUrl, databaseName: expectedDatabaseName } = requireDatabaseUrl();
  const expectedUserCount = expectedLoadUsers();
  const { ledger, ledgerPath } = readLedger();
  const run = ledger.run ?? {};
  const users = Array.isArray(ledger.users) ? ledger.users : [];
  const runId = typeof run.runId === 'string' ? run.runId : ledger.runId;
  const checks = [];
  const userResults = [];
  let actionCount = 0;

  function check(scope, name, condition, detail = undefined) {
    const passed = Boolean(condition);
    checks.push({ scope, name, passed, ...(detail === undefined ? {} : { detail }) });
    return passed;
  }

  check('ledger', 'schema version is supported', ledger.schemaVersion === EXPECTED_SCHEMA_VERSION, {
    actual: ledger.schemaVersion,
    expected: EXPECTED_SCHEMA_VERSION,
  });
  check('ledger', 'run id is present', typeof runId === 'string' && runId.length > 0);
  check(
    'ledger',
    'run timestamps define a completed interval',
    asTimestamp(run.startedAt) !== undefined &&
      asTimestamp(run.finishedAt) !== undefined &&
      asTimestamp(run.finishedAt) >= asTimestamp(run.startedAt),
  );
  check('ledger', 'run requires a fresh dedicated database', run.databaseBaseline === 'fresh-required', {
    actual: run.databaseBaseline ?? null,
    expected: 'fresh-required',
  });
  check('ledger', 'declared user count matches the expected stage size', run.userCount === expectedUserCount, {
    actual: run.userCount,
    expected: expectedUserCount,
  });
  check('ledger', 'ledger user count matches the expected stage size', users.length === expectedUserCount, {
    actual: users.length,
    expected: expectedUserCount,
  });
  const sourceNetwork = run.sourceNetwork;
  check(
    'ledger',
    'source-network mode metadata is explicit',
    sourceNetwork && ['direct', 'virtual-rfc2544'].includes(sourceNetwork.mode),
    { actual: sourceNetwork?.mode ?? null },
  );
  if (sourceNetwork?.mode === 'virtual-rfc2544') {
    check(
      'ledger',
      'virtual source mode proves one unique RFC 2544 assignment per user plus system traffic',
      sourceNetwork.virtualSourceIps === true &&
        sourceNetwork.userSourceCount === expectedUserCount &&
        sourceNetwork.totalUniqueSourceCount === expectedUserCount + 1 &&
        normalizeDigest(sourceNetwork.assignmentDigest) === expectedVirtualSourceAssignmentDigest(expectedUserCount),
      {
        userSourceCount: sourceNetwork.userSourceCount ?? null,
        totalUniqueSourceCount: sourceNetwork.totalUniqueSourceCount ?? null,
        expectedUsers: expectedUserCount,
      },
    );
  } else if (sourceNetwork?.mode === 'direct') {
    check(
      'ledger',
      'direct source mode declares no synthetic assignments',
      sourceNetwork.virtualSourceIps === false &&
        sourceNetwork.userSourceCount === 0 &&
        sourceNetwork.totalUniqueSourceCount === 0 &&
        sourceNetwork.assignmentDigest === undefined,
    );
  }
  check(
    'ledger',
    'provisioning and active-session concurrency are explicit and bounded',
    Number.isSafeInteger(run.provisionConcurrency) &&
      run.provisionConcurrency >= 1 &&
      run.provisionConcurrency <= expectedUserCount &&
      run.sessionConcurrency === expectedUserCount &&
      Number.isSafeInteger(run.paidConcurrency) &&
      run.paidConcurrency >= 1 &&
      run.paidConcurrency <= 100,
    {
      provisionConcurrency: run.provisionConcurrency ?? null,
      sessionConcurrency: run.sessionConcurrency ?? null,
      paidConcurrency: run.paidConcurrency ?? null,
      expectedUserCount,
    },
  );
  check(
    'ledger',
    'summary concurrency metadata agrees with the run',
    ledger.summary?.provisionConcurrency === run.provisionConcurrency &&
      ledger.summary?.sessionConcurrency === run.sessionConcurrency &&
      ledger.summary?.paidConcurrency === run.paidConcurrency,
  );
  check(
    'ledger',
    'user indexes are unique',
    new Set(users.map((user) => user.index)).size === users.length &&
      users.every((user) => Number.isSafeInteger(user.index) && user.index >= 0) &&
      users
        .map((user) => user.index)
        .sort((left, right) => left - right)
        .every((index, position) => index === position),
  );
  const userIdHashes = users.map((user) => normalizeDigest(user.idHash));
  const userEmailHashes = users.map((user) => normalizeDigest(user.emailHash));
  check(
    'ledger',
    'all user id hashes are exact lowercase SHA-256 and unique',
    userIdHashes.every(Boolean) && new Set(userIdHashes).size === users.length,
  );
  check(
    'ledger',
    'all user email hashes are exact lowercase SHA-256 and unique',
    userEmailHashes.every(Boolean) && new Set(userEmailHashes).size === users.length,
  );
  check(
    'ledger',
    'fresh assessment plan stayed inside its hard ceiling',
    Number.isSafeInteger(run.freshAssessmentsPlanned) &&
      Number.isSafeInteger(run.freshAssessmentCeiling) &&
      run.freshAssessmentsPlanned >= 0 &&
      run.freshAssessmentsPlanned <= run.freshAssessmentCeiling,
    { planned: run.freshAssessmentsPlanned ?? null, ceiling: run.freshAssessmentCeiling ?? null },
  );
  check(
    'ledger',
    'live provider models are pinned exactly',
    run.models?.transcription === 'whisper-1' && run.models?.grading === 'gpt-4o-mini-2024-07-18',
    { actual: run.models ?? null },
  );
  check(
    'ledger',
    'pricing manifest uses the same pinned models and USD',
    run.pricingManifest?.currency === 'USD' &&
      run.pricingManifest?.transcription?.model === 'whisper-1' &&
      run.pricingManifest?.grading?.model === 'gpt-4o-mini-2024-07-18',
    { actual: run.pricingManifest ?? null },
  );
  check(
    'ledger',
    'potential paid attempts stayed inside their hard ceiling',
    Number.isSafeInteger(run.paidAttemptCeiling) &&
      Number.isSafeInteger(run.potentialPaidAttempts) &&
      run.paidAttemptCeiling > 0 &&
      run.potentialPaidAttempts >= 0 &&
      run.potentialPaidAttempts <= run.paidAttemptCeiling,
    { actual: run.potentialPaidAttempts ?? null, ceiling: run.paidAttemptCeiling ?? null },
  );
  check(
    'ledger',
    'worst-case run projection stayed inside the approved $25 budget',
    Number.isFinite(run.budget?.limitUsd) &&
      Number.isFinite(run.budget?.projectedWorstCaseUsd) &&
      run.budget.limitUsd > 0 &&
      run.budget.limitUsd <= 25 &&
      run.budget.projectedWorstCaseUsd <= run.budget.limitUsd,
    {
      limitUsd: run.budget?.limitUsd ?? null,
      projectedWorstCaseUsd: run.budget?.projectedWorstCaseUsd ?? null,
    },
  );
  check(
    'ledger',
    'cumulative protected campaign exposure stayed inside its hard budget',
    Number.isFinite(run.budget?.protectedExposureUsd) &&
      run.budget.protectedExposureUsd >= 0 &&
      run.budget.protectedExposureUsd <= run.budget.limitUsd &&
      run.budget.protectedExposureUsd <= 25,
    { protectedExposureUsd: run.budget?.protectedExposureUsd ?? null, limitUsd: run.budget?.limitUsd ?? null },
  );
  const campaignSummary = ledger.campaignStateSummary;
  check(
    'ledger',
    'durable campaign accounting completed with no active reservation',
    campaignSummary?.status === 'completed' &&
      campaignSummary?.outcome === 'passed' &&
      campaignSummary?.activeReservation === false,
    {
      status: campaignSummary?.status ?? null,
      outcome: campaignSummary?.outcome ?? null,
      activeReservation: campaignSummary?.activeReservation ?? null,
    },
  );
  check(
    'ledger',
    'campaign file identities are exact lowercase SHA-256 digests',
    !!normalizeDigest(campaignSummary?.stateFileHash) &&
      !!normalizeDigest(campaignSummary?.lockFileHash) &&
      !!normalizeDigest(campaignSummary?.cleanupJournalFileHash),
  );
  check(
    'ledger',
    'campaign attempt reservation and actual count match this run',
    campaignSummary?.reservedPaidAttempts === run.paidAttemptCeiling &&
      campaignSummary?.actualPotentialPaidAttempts === run.potentialPaidAttempts &&
      Number.isSafeInteger(campaignSummary?.priorPaidAttempts) &&
      campaignSummary.priorPaidAttempts >= 0,
    {
      reserved: campaignSummary?.reservedPaidAttempts ?? null,
      ceiling: run.paidAttemptCeiling ?? null,
      actual: campaignSummary?.actualPotentialPaidAttempts ?? null,
      runActual: run.potentialPaidAttempts ?? null,
      prior: campaignSummary?.priorPaidAttempts ?? null,
    },
  );
  const pricingUpperBound = run.pricingManifest?.upperBoundPerPaidAttemptUsd;
  const expectedActualUpperBound = Number(run.potentialPaidAttempts) * Number(pricingUpperBound);
  const observedCampaignBefore = Number(campaignSummary?.cumulativeUpperBoundBeforeUsd);
  const expectedCampaignAfter = observedCampaignBefore + expectedActualUpperBound;
  const closeUsd = (actual, expected) =>
    Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= 0.000_1;
  check(
    'ledger',
    'campaign dollar accounting recomputes from pinned pricing and attempt counts',
    Number.isFinite(observedCampaignBefore) &&
      observedCampaignBefore >= 0 &&
      closeUsd(campaignSummary?.actualUpperBoundUsd, expectedActualUpperBound) &&
      closeUsd(campaignSummary?.cumulativeUpperBoundAfterUsd, expectedCampaignAfter),
    {
      observedBefore: observedCampaignBefore,
      expectedActual: expectedActualUpperBound,
      expectedAfter: expectedCampaignAfter,
    },
  );
  check(
    'ledger',
    'campaign protected exposure agrees with the run and remains at most $25',
    closeUsd(campaignSummary?.protectedExposureAfterRunUsd, run.budget?.protectedExposureUsd) &&
      campaignSummary.protectedExposureAfterRunUsd <= 25,
    {
      campaign: campaignSummary?.protectedExposureAfterRunUsd ?? null,
      run: run.budget?.protectedExposureUsd ?? null,
    },
  );
  check(
    'ledger',
    'campaign cleanup journal was removed only after every key was absent',
    campaignSummary?.cleanupJournalStatus === 'deleted-after-all-keys-proved-absent',
    { actual: campaignSummary?.cleanupJournalStatus ?? null },
  );
  check('ledger', 'run was not interrupted', ledger.summary?.interruptedBy === null, {
    actual: ledger.summary?.interruptedBy ?? null,
  });
  const audioCorpus = Array.isArray(run.audioCorpus) ? run.audioCorpus : [];
  check('ledger', 'controlled audio corpus is recorded', audioCorpus.length > 0);
  const audioFixtureIds = audioCorpus.map((audio) => audio.id);
  check(
    'ledger',
    'audio fixture identifiers are nonempty and unique',
    audioFixtureIds.every((id) => typeof id === 'string' && id.length > 0) &&
      new Set(audioFixtureIds).size === audioFixtureIds.length,
  );
  check(
    'ledger',
    'every audio fixture is hashed and bounded to 256 KiB / 15 seconds',
    audioCorpus.every(
      (audio) =>
        !!normalizeDigest(audio.sha256) &&
        Number.isSafeInteger(audio.sizeBytes) &&
        audio.sizeBytes > 0 &&
        audio.sizeBytes <= 256 * 1024 &&
        Number.isFinite(audio.durationSeconds) &&
        audio.durationSeconds >= 0.5 &&
        audio.durationSeconds <= 15 &&
        typeof audio.contentType === 'string' &&
        typeof audio.extension === 'string',
    ),
  );
  check('ledger', 'summary reports no failed users', ledger.summary?.failedUsers === 0, {
    actual: ledger.summary?.failedUsers ?? null,
  });
  const expectedDeletedUsers = users.filter((user) => user.index % 20 === 19).length;
  check(
    'ledger',
    'summary proves every staged user established an authenticated session',
    ledger.summary?.users === expectedUserCount && ledger.summary?.activeSessionsEstablished === expectedUserCount,
    {
      users: ledger.summary?.users ?? null,
      activeSessionsEstablished: ledger.summary?.activeSessionsEstablished ?? null,
      expected: expectedUserCount,
    },
  );
  check(
    'ledger',
    'summary deletion count matches the verifier-owned account cohort',
    ledger.summary?.deletedUsers === expectedDeletedUsers,
    { actual: ledger.summary?.deletedUsers ?? null, expected: expectedDeletedUsers },
  );
  check('ledger', 'summary reports no provider failures', ledger.summary?.providerFailures === 0, {
    actual: ledger.summary?.providerFailures ?? null,
  });
  check(
    'ledger',
    'summary contains no global fatal error',
    ledger.summary?.fatalError === undefined || ledger.summary.fatalError === null || ledger.summary.fatalError === '',
    { actual: ledger.summary?.fatalError ?? null },
  );

  const expectedLanguages = ['te', 'hi', 'es', 'zh'];
  const languageCounts = Object.fromEntries(expectedLanguages.map((language) => [language, 0]));
  for (const user of users) {
    if (Object.hasOwn(languageCounts, user.nativeLanguage)) languageCounts[user.nativeLanguage]++;
  }
  check(
    'ledger',
    'native languages follow the verifier-owned round-robin mapping',
    users.every((user) => user.nativeLanguage === expectedLanguages[user.index % expectedLanguages.length]),
  );
  check(
    'ledger',
    'native language distribution is balanced',
    Math.max(...Object.values(languageCounts)) - Math.min(...Object.values(languageCounts)) <= 1,
    { byLanguage: languageCounts },
  );
  if (expectedUserCount === 1_000) {
    check(
      'ledger',
      'final 1000-user run has exactly 250 learners per native language',
      expectedLanguages.every((language) => languageCounts[language] === 250),
      { byLanguage: languageCounts },
    );
  }
  const forbiddenPaths = forbiddenLedgerPaths(ledger);
  check(
    'ledger',
    'ledger contains no raw identity, credential, signed-upload, or S3-key fields',
    forbiddenPaths.length === 0,
    {
      forbiddenPaths: forbiddenPaths.slice(0, 25),
      additionalCount: Math.max(0, forbiddenPaths.length - 25),
    },
  );
  const invalidDigests = invalidDigestPaths(ledger);
  check(
    'ledger',
    'every recorded digest/hash is exact 64-character lowercase hexadecimal SHA-256',
    invalidDigests.length === 0,
    {
      invalidPaths: invalidDigests.slice(0, 25),
      additionalCount: Math.max(0, invalidDigests.length - 25),
    },
  );

  const emailPrefix =
    typeof run.emailPrefix === 'string' && run.emailPrefix.length > 0
      ? run.emailPrefix
      : typeof runId === 'string'
        ? `load1000_live_${runId}_`
        : '';
  check('ledger', 'synthetic email prefix is available', emailPrefix.length > 0);

  for (const user of users) {
    const scope = `user:${user.index}`;
    const expectedFinal = expectedFinalFor(user);
    check(scope, 'cohort matches verifier-owned index mapping', user.cohort === expectedCohort(user.index), {
      actual: user.cohort,
      expected: expectedCohort(user.index),
    });
    check(scope, 'final identity expectation is present', expectedFinal !== undefined);
    check(scope, 'user id hash is present', !!normalizeDigest(user.idHash));
    check(scope, 'user email hash is present', !!normalizeDigest(user.emailHash));
    if (expectedFinal) {
      check(scope, 'final existence oracle is explicit', typeof expectedFinal.exists === 'boolean');
      check(scope, 'final name hash is present', !!normalizeDigest(expectedFinal.nameHash));
      check(scope, 'final email hash is present', !!normalizeDigest(expectedFinal.emailHash));
      check(
        scope,
        'user and final email hashes agree',
        normalizeDigest(user.emailHash) === normalizeDigest(expectedFinal.emailHash),
      );
      check(scope, 'final native language is valid', ['te', 'hi', 'es', 'zh'].includes(expectedFinal.nativeLanguage));
      check(
        scope,
        'final native language matches the assigned learner language',
        expectedFinal.nativeLanguage === user.nativeLanguage,
      );
      check(scope, 'final CEFR oracle is valid', LEVELS.includes(expectedFinal.cefrLevel));
      check(
        scope,
        'final diagnostic completion oracle is explicit',
        typeof expectedFinal.diagnosticCompleted === 'boolean',
      );
      check(
        scope,
        'final token version is a positive integer',
        Number.isSafeInteger(expectedFinal.tokenVersion) && expectedFinal.tokenVersion > 0,
      );
      check(
        scope,
        'diagnostic asked-count oracle is bounded',
        Number.isSafeInteger(expectedFinal.diagnosticQuestionsAsked) &&
          expectedFinal.diagnosticQuestionsAsked >= 0 &&
          expectedFinal.diagnosticQuestionsAsked <= 3,
      );
    }
    check(scope, 'attempt expectations are present', Array.isArray(user.expectedAttempts));
    check(scope, 'assessment request expectations are present', Array.isArray(user.expectedAssessmentRequests));
    check(scope, 'practice progress expectations are present', Array.isArray(user.expectedPracticeProgress));
    check(
      scope,
      'attempt expectations include exact row fields and digests',
      expectedAttemptsFor(user).every(
        (attempt) =>
          ['diagnostic', 'practice', 'practice-native'].includes(attempt.context) &&
          typeof attempt.questionId === 'string' &&
          Number.isSafeInteger(attempt.seq) &&
          Number.isSafeInteger(attempt.attemptNo) &&
          (attempt.context === 'practice-native'
            ? attempt.score === null && attempt.passed === null
            : Number.isSafeInteger(attempt.score) && typeof attempt.passed === 'boolean') &&
          typeof attempt.recordingId === 'string' &&
          !!normalizeDigest(attempt.transcriptDigest) &&
          !!normalizeDigest(attempt.feedbackDigest),
      ),
    );
    check(
      scope,
      'assessment request expectations include exact durable fields and digests',
      expectedRequestsFor(user).every(
        (request) =>
          typeof request.requestId === 'string' &&
          ['diagnostic', 'practice', 'practice-native'].includes(request.context) &&
          typeof request.questionId === 'string' &&
          request.status === 'completed' &&
          !!normalizeDigest(request.responseDigest) &&
          !!normalizeDigest(request.audioKeyHash) &&
          typeof request.audioFixtureId === 'string' &&
          typeof request.recordingId === 'string' &&
          audioFixtureIds.includes(request.audioFixtureId),
      ),
    );
    const contextCounts = expectedRequestsFor(user).reduce(
      (counts, request) => {
        counts[request.context] = (counts[request.context] ?? 0) + 1;
        return counts;
      },
      { diagnostic: 0, practice: 0, 'practice-native': 0 },
    );
    check(
      scope,
      'diagnostic produced exactly two or three completed requests',
      [2, 3].includes(contextCounts.diagnostic),
      {
        actual: contextCounts.diagnostic,
      },
    );
    check(
      scope,
      'final diagnostic asked count equals completed diagnostic requests',
      expectedFinal?.diagnosticQuestionsAsked === contextCounts.diagnostic,
      { finalAsked: expectedFinal?.diagnosticQuestionsAsked ?? null, requests: contextCounts.diagnostic },
    );
    const cohortHasEnglish = ['full', 'english'].includes(expectedCohort(user.index));
    check(
      scope,
      'English assessment count matches cohort and retry bounds',
      cohortHasEnglish ? contextCounts.practice >= 1 && contextCounts.practice <= 3 : contextCounts.practice === 0,
      { actual: contextCounts.practice, cohort: expectedCohort(user.index) },
    );
    const cohortHasNative = ['full', 'native'].includes(expectedCohort(user.index));
    check(
      scope,
      'native assessment count matches cohort exactly',
      contextCounts['practice-native'] === (cohortHasNative ? 1 : 0),
      { actual: contextCounts['practice-native'], cohort: expectedCohort(user.index) },
    );
    check(
      scope,
      'practice progress expectations include exact mastery and SRS fields',
      expectedProgressFor(user).every(
        (progress) =>
          typeof progress.questionId === 'string' &&
          ['learning', 'mastered'].includes(progress.status) &&
          Number.isSafeInteger(progress.bestScore) &&
          Number.isSafeInteger(progress.attemptCount) &&
          Number.isSafeInteger(progress.srsIntervalIndex),
      ),
    );
    check(
      scope,
      'assessment usage expectation is a nonnegative integer',
      Number.isSafeInteger(user.expectedUsageReservations) && user.expectedUsageReservations >= 0,
    );
    check(scope, 'native progress invariant has an explicit oracle', typeof user.nativeInvariantExpected === 'boolean');
    check(scope, 'ledger contains no user failures', Array.isArray(user.failures) && user.failures.length === 0, {
      failureCount: Array.isArray(user.failures) ? user.failures.length : null,
    });
    const actions = Array.isArray(user.actions) ? user.actions : [];
    check(scope, 'user has recorded API actions', actions.length > 0);
    if (actions.some((action) => action.logicalAction === 'assessment:practice-native')) {
      check(scope, 'native assessment declares mastery invariance', user.nativeInvariantExpected === true);
    }
    const actualActionCounts = new Map();
    for (const action of actions) {
      incrementCount(actualActionCounts, action.logicalAction);
      actionCount++;
      const actionScope = `${scope}:action:${action.seq ?? action.actionId ?? actionCount}`;
      const actionFailures = Array.isArray(action.failures) ? action.failures : [];
      const actionPassed =
        action.outcome === 'passed' || action.outcome === 'success' || action.ok === true || action.success === true;
      check(actionScope, 'action oracle passed', actionPassed && actionFailures.length === 0, {
        outcome: action.outcome ?? null,
        failureCount: actionFailures.length,
      });
      const actionStartedAt = asTimestamp(action.startedAt);
      const actionFinishedAt = asTimestamp(action.finishedAt);
      check(
        actionScope,
        'action has a valid bounded time window',
        actionStartedAt !== undefined && actionFinishedAt !== undefined && actionFinishedAt >= actionStartedAt,
      );
      const attempts = Array.isArray(action.attempts) ? action.attempts : [];
      check(actionScope, 'action recorded at least one transport attempt', attempts.length > 0);
      const terminal = attempts.at(-1);
      const expected = action.expected ?? {};
      check(actionScope, 'action has a terminal status oracle', Number.isInteger(expected.terminalStatus));
      const independentContract = independentActionContract(action.logicalAction);
      check(actionScope, 'action belongs to the verifier-owned contract', independentContract !== undefined);
      if (independentContract) {
        check(
          actionScope,
          'action method matches the independent contract',
          independentContract.method === undefined || action.method === independentContract.method,
          { actual: action.method, expected: independentContract.method ?? null },
        );
        check(
          actionScope,
          'terminal status matches the independent contract',
          !!terminal && independentContract.statuses.includes(terminal.status),
          { actual: terminal?.status ?? null, expected: independentContract.statuses },
        );
        if (independentContract.code) {
          check(
            actionScope,
            'terminal code matches the independent contract',
            terminal?.code === independentContract.code,
            {
              actual: terminal?.code ?? null,
              expected: independentContract.code,
            },
          );
          check(
            actionScope,
            'self-declared terminal code matches the independent contract',
            expected.terminalCode === independentContract.code,
            { actual: expected.terminalCode ?? null, expected: independentContract.code },
          );
        }
      }
      if (terminal && Number.isInteger(expected.terminalStatus)) {
        check(actionScope, 'terminal HTTP status matches oracle', terminal.status === expected.terminalStatus, {
          actual: terminal.status,
          expected: expected.terminalStatus,
        });
      }
      if (terminal && typeof expected.terminalCode === 'string') {
        check(actionScope, 'terminal API code matches oracle', terminal.code === expected.terminalCode, {
          actual: terminal.code ?? null,
          expected: expected.terminalCode,
        });
      }
      check(
        actionScope,
        'transport attempts contain no unclassified network error',
        attempts.every((attempt) => !attempt.networkError || typeof attempt.retryReason === 'string'),
      );
    }
    const expectedActionCounts = expectedUserActionCounts(user);
    check(
      scope,
      'logical action inventory and counts exactly match the verifier-owned cohort plan',
      canonicalJson(countsObject(actualActionCounts)) === canonicalJson(countsObject(expectedActionCounts)),
      { actual: countsObject(actualActionCounts), expected: countsObject(expectedActionCounts) },
    );
  }

  const systemActions = Array.isArray(ledger.systemActions) ? ledger.systemActions : [];
  check('ledger', 'system-level API actions are recorded', systemActions.length > 0);
  const systemActionCounts = new Map();
  for (const action of systemActions) {
    incrementCount(systemActionCounts, action.logicalAction);
    actionCount++;
    const actionScope = `system-action:${action.seq ?? action.actionId ?? actionCount}`;
    const attempts = Array.isArray(action.attempts) ? action.attempts : [];
    const expected = action.expected ?? {};
    const terminal = attempts.at(-1);
    check(actionScope, 'action oracle passed', action.outcome === 'passed' && !action.failure);
    const actionStartedAt = asTimestamp(action.startedAt);
    const actionFinishedAt = asTimestamp(action.finishedAt);
    check(
      actionScope,
      'action has a valid bounded time window',
      actionStartedAt !== undefined && actionFinishedAt !== undefined && actionFinishedAt >= actionStartedAt,
    );
    check(actionScope, 'action recorded at least one transport attempt', attempts.length > 0);
    check(actionScope, 'action has a terminal status oracle', Number.isInteger(expected.terminalStatus));
    if (terminal && Number.isInteger(expected.terminalStatus)) {
      check(actionScope, 'terminal HTTP status matches oracle', terminal.status === expected.terminalStatus, {
        actual: terminal.status,
        expected: expected.terminalStatus,
      });
    }
    if (terminal && typeof expected.terminalCode === 'string') {
      check(actionScope, 'terminal API code matches oracle', terminal.code === expected.terminalCode, {
        actual: terminal.code ?? null,
        expected: expected.terminalCode,
      });
    }
    let independentContract;
    switch (action.logicalAction) {
      case 'health-preflight':
      case 'readiness-preflight':
        independentContract = { method: 'GET', statuses: [200] };
        break;
      case 'terminal-json-404':
        independentContract = { method: 'GET', statuses: [404], code: 'NOT_FOUND' };
        break;
      case 'metrics-contract':
        independentContract = { method: 'GET', statuses: [200, 404] };
        break;
    }
    check(actionScope, 'system action belongs to the verifier-owned contract', independentContract !== undefined);
    if (independentContract) {
      check(actionScope, 'system action method matches', action.method === independentContract.method);
      check(
        actionScope,
        'system action terminal status matches',
        independentContract.statuses.includes(terminal?.status),
      );
      if (independentContract.code) {
        check(actionScope, 'system action terminal code matches', terminal?.code === independentContract.code);
      }
      if (action.logicalAction === 'metrics-contract' && terminal?.status === 404) {
        check(actionScope, 'disabled metrics route returns NOT_FOUND', terminal.code === 'NOT_FOUND');
      }
    }
  }
  const expectedSystemActionCounts = new Map([
    ['health-preflight', 1],
    ['readiness-preflight', 1],
    ['terminal-json-404', 1],
    ['metrics-contract', 1],
  ]);
  check(
    'ledger',
    'system action inventory exactly covers health, readiness, 404, and metrics',
    canonicalJson(countsObject(systemActionCounts)) === canonicalJson(countsObject(expectedSystemActionCounts)),
    { actual: countsObject(systemActionCounts), expected: countsObject(expectedSystemActionCounts) },
  );
  const allLedgerActions = [
    ...systemActions,
    ...users.flatMap((user) => (Array.isArray(user.actions) ? user.actions : [])),
  ];
  const freshAssessmentActions = allLedgerActions.filter((action) => action.assessment?.fresh === true);
  const replayAssessmentActions = allLedgerActions.filter((action) => action.assessment?.fresh === false);
  const actionPotentialPaidAttempts = freshAssessmentActions.reduce(
    (total, action) => total + (asInteger(action.assessment?.potentialPaidAttempts) ?? 0),
    0,
  );
  const countedPotentialAttempts = freshAssessmentActions
    .flatMap((action) => action.attempts ?? [])
    .filter(
      (attempt) => attempt.method === 'POST' && attempt.paidAttemptDisposition === 'counted-potential-paid-attempt',
    ).length;
  check(
    'ledger',
    'fresh assessment actions exactly match the planned fresh count',
    freshAssessmentActions.length === run.freshAssessmentsPlanned,
    { actions: freshAssessmentActions.length, planned: run.freshAssessmentsPlanned ?? null },
  );
  check(
    'ledger',
    'every fresh assessment action has positive bounded potential-paid accounting',
    freshAssessmentActions.every(
      (action) =>
        Number.isSafeInteger(action.assessment?.potentialPaidAttempts) && action.assessment.potentialPaidAttempts >= 1,
    ),
  );
  check(
    'ledger',
    'replay actions never consume potential-paid budget',
    replayAssessmentActions.every((action) => action.assessment?.potentialPaidAttempts === 0),
  );
  check(
    'ledger',
    'action potential-paid totals equal the run counter',
    actionPotentialPaidAttempts === run.potentialPaidAttempts,
    { actions: actionPotentialPaidAttempts, run: run.potentialPaidAttempts ?? null },
  );
  check(
    'ledger',
    'non-refunded POST dispositions equal the potential-paid counter',
    countedPotentialAttempts === run.potentialPaidAttempts,
    { dispositions: countedPotentialAttempts, run: run.potentialPaidAttempts ?? null },
  );
  check(
    'ledger',
    'every potentially fresh assessment POST has an explicit paid-attempt disposition',
    freshAssessmentActions
      .flatMap((action) => action.attempts ?? [])
      .filter((attempt) => attempt.method === 'POST')
      .every(
        (attempt) =>
          attempt.paidAttemptDisposition === 'counted-potential-paid-attempt' ||
          (typeof attempt.paidAttemptDisposition === 'string' &&
            attempt.paidAttemptDisposition.startsWith('refunded-')),
      ),
  );
  const observedMaxFixtureDuration = Math.max(...audioCorpus.map((audio) => Number(audio.durationSeconds)));
  const expectedWhisperUpperPerAttempt = (observedMaxFixtureDuration / 60) * 0.006;
  const expectedGradingUpperPerAttempt = (8_000 * 0.15) / 1_000_000 + (2_000 * 0.6) / 1_000_000;
  check(
    'ledger',
    'pricing values and token budgets match the verifier-owned manifest',
    run.pricingManifest?.transcription?.usdPerMinute === 0.006 &&
      run.pricingManifest?.grading?.inputUsdPerMillionTokens === 0.15 &&
      run.pricingManifest?.grading?.outputUsdPerMillionTokens === 0.6 &&
      run.pricingManifest?.grading?.budgetedInputTokensPerAttempt === 8_000 &&
      run.pricingManifest?.grading?.budgetedOutputTokensPerAttempt === 2_000 &&
      closeUsd(run.pricingManifest?.maxFixtureDurationSeconds, observedMaxFixtureDuration) &&
      closeUsd(
        run.pricingManifest?.upperBoundPerPaidAttemptUsd,
        expectedWhisperUpperPerAttempt + expectedGradingUpperPerAttempt,
      ),
    { actual: run.pricingManifest ?? null },
  );
  check(
    'ledger',
    'summary potential-paid count agrees with the run',
    ledger.summary?.potentialPaidAttempts === run.potentialPaidAttempts,
    { summary: ledger.summary?.potentialPaidAttempts ?? null, run: run.potentialPaidAttempts ?? null },
  );
  check('ledger', 'at least one API action was recorded', actionCount > 0, { actionCount });

  const expectedUsageTotalFromUsers = users.reduce(
    (total, user) => total + (asInteger(user.expectedUsageReservations) ?? 0),
    0,
  );
  const expectedCompletedRequestsFromUsers = users.reduce((total, user) => total + expectedRequestsFor(user).length, 0);
  check(
    'ledger',
    'fresh assessment actions, durable expectations, and completion summary agree',
    freshAssessmentActions.length === expectedCompletedRequestsFromUsers &&
      ledger.summary?.freshAssessmentsCompleted === expectedCompletedRequestsFromUsers,
    {
      actions: freshAssessmentActions.length,
      durableRequests: expectedCompletedRequestsFromUsers,
      summaryCompleted: ledger.summary?.freshAssessmentsCompleted ?? null,
    },
  );
  check(
    'ledger',
    'top-level usage total equals every user reservation',
    asInteger(ledger.expectedUsage?.total) === expectedUsageTotalFromUsers,
    { topLevel: ledger.expectedUsage?.total ?? null, perUser: expectedUsageTotalFromUsers },
  );
  check(
    'ledger',
    'paid failure count explains usage without durable completed requests',
    asInteger(ledger.expectedUsage?.paidFailures) === expectedUsageTotalFromUsers - expectedCompletedRequestsFromUsers,
    {
      paidFailures: ledger.expectedUsage?.paidFailures ?? null,
      usageReservations: expectedUsageTotalFromUsers,
      completedRequests: expectedCompletedRequestsFromUsers,
    },
  );
  check('ledger', 'successful campaign contains no paid provider failures', ledger.expectedUsage?.paidFailures === 0, {
    actual: ledger.expectedUsage?.paidFailures ?? null,
  });
  const allExpectedRequests = users.flatMap((user) =>
    expectedRequestsFor(user).map((request) => ({ userIndex: user.index, ...request })),
  );
  check(
    'ledger',
    'logical assessment request IDs are globally unique',
    new Set(allExpectedRequests.map((request) => request.requestId)).size === allExpectedRequests.length,
  );
  check(
    'ledger',
    'assessment request audio-key hashes are globally unique',
    allExpectedRequests.every((request) => !!normalizeDigest(request.audioKeyHash)) &&
      new Set(allExpectedRequests.map((request) => request.audioKeyHash)).size === allExpectedRequests.length,
  );

  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
    query_timeout: 31_000,
    options: '-c default_transaction_read_only=on',
  });
  await client.connect();
  let snapshotOpen = false;

  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    snapshotOpen = true;
    const databaseResult = await client.query(
      `SELECT current_database() AS name,
              current_setting('transaction_read_only') AS read_only,
              current_setting('transaction_isolation') AS isolation`,
    );
    const databaseName = databaseResult.rows[0]?.name;
    if (typeof databaseName !== 'string' || !/load/i.test(databaseName)) {
      throw new Error(`refusing to reconcile against non-load database "${databaseName ?? 'unknown'}"`);
    }
    if (databaseName !== expectedDatabaseName) {
      throw new Error(
        `LOAD_DATABASE_URL names database "${expectedDatabaseName}" but PostgreSQL connected to "${databaseName}"`,
      );
    }
    check('database', 'session is forced read-only', databaseResult.rows[0]?.read_only === 'on');
    check(
      'database',
      'all reads share one repeatable-read snapshot',
      databaseResult.rows[0]?.isolation === 'repeatable read',
    );

    const userRows = await client.query(
      `SELECT id::text, name, email, native_language AS "nativeLanguage",
              cefr_level AS "cefrLevel", diagnostic_completed AS "diagnosticCompleted",
              token_version AS "tokenVersion"
       FROM users
       WHERE email LIKE $1 ESCAPE '\\'
       ORDER BY email`,
      [`${escapeLikePrefix(emailPrefix)}%`],
    );
    const rowsByIdHash = new Map(userRows.rows.map((row) => [sha256(row.id), row]));
    const rowsByEmailHash = new Map(userRows.rows.map((row) => [sha256(row.email), row]));
    const aliveDatabaseIds = [];
    const ledgerUserByDatabaseId = new Map();

    for (const user of users) {
      const scope = `user:${user.index}`;
      const result = { index: user.index, passed: true, checks: 0, failures: [] };
      const expected = expectedFinalFor(user);
      if (!expected) {
        result.passed = false;
        result.failures.push('missing expectedFinal');
        userResults.push(result);
        continue;
      }
      const idHash = normalizeDigest(user.idHash ?? expected.idHash);
      const emailHash = normalizeDigest(user.emailHash ?? expected.emailHash);
      const byId = idHash ? rowsByIdHash.get(idHash) : undefined;
      const byEmail = emailHash ? rowsByEmailHash.get(emailHash) : undefined;
      const row = byId ?? byEmail;
      const shouldExist = expected.exists !== false && expected.deleted !== true && user.terminalState !== 'deleted';
      const identityMatches = !byId || !byEmail || byId.id === byEmail.id;
      check(scope, 'id and email hashes resolve to one identity', identityMatches);
      check(scope, shouldExist ? 'expected live user exists' : 'deleted user is absent', shouldExist ? !!row : !row);

      if (shouldExist && row) {
        aliveDatabaseIds.push(row.id);
        ledgerUserByDatabaseId.set(row.id, user);
        check(scope, 'stored user id hash matches', !idHash || sha256(row.id) === idHash);
        check(scope, 'stored email hash matches', !emailHash || sha256(row.email) === emailHash);
        check(scope, 'stored name hash matches', sameOptionalDigest(expected.nameHash, row.name));
        check(scope, 'native language matches final profile', row.nativeLanguage === expected.nativeLanguage, {
          actual: row.nativeLanguage,
          expected: expected.nativeLanguage,
        });
        check(scope, 'final CEFR level matches', row.cefrLevel === expected.cefrLevel, {
          actual: row.cefrLevel,
          expected: expected.cefrLevel,
        });
        check(scope, 'diagnostic completion matches', row.diagnosticCompleted === expected.diagnosticCompleted, {
          actual: row.diagnosticCompleted,
          expected: expected.diagnosticCompleted,
        });
        check(scope, 'token version matches', row.tokenVersion === expected.tokenVersion, {
          actual: row.tokenVersion,
          expected: expected.tokenVersion,
        });
      }
      userResults.push(result);
    }

    const expectedAlive = users.filter((user) => {
      const expected = expectedFinalFor(user);
      return expected && expected.exists !== false && expected.deleted !== true && user.terminalState !== 'deleted';
    });
    check('database', 'live user row count exactly matches ledger', userRows.rowCount === expectedAlive.length, {
      actual: userRows.rowCount,
      expected: expectedAlive.length,
    });

    const idArray = aliveDatabaseIds.length > 0 ? aliveDatabaseIds : [UUID_ZERO];
    const attemptsResult = await client.query(
      `SELECT id::text, user_id::text AS "userId", question_id::text AS "questionId",
              context, attempt_no AS "attemptNo", transcript, score, passed, feedback,
              created_at AS "createdAt"
       FROM attempts
       WHERE user_id = ANY($1::uuid[])
       ORDER BY user_id, created_at, id`,
      [idArray],
    );
    const attemptsByUser = groupBy(attemptsResult.rows, 'userId');

    const requestsResult = await client.query(
      `SELECT user_id::text AS "userId", request_id::text AS "requestId", context,
              question_id::text AS "questionId", status, response_body AS "responseBody",
              audio_key AS "audioKey", started_at AS "startedAt", completed_at AS "completedAt"
       FROM assessment_requests
       WHERE user_id = ANY($1::uuid[])
       ORDER BY user_id, request_id`,
      [idArray],
    );
    const requestsByUser = groupBy(requestsResult.rows, 'userId');

    const progressResult = await client.query(
      `SELECT user_id::text AS "userId", question_id::text AS "questionId", status,
              best_score AS "bestScore", attempt_count AS "attemptCount",
              srs_interval_index AS "srsIntervalIndex", due_at AS "dueAt",
              skipped_until AS "skippedUntil", last_attempt_at AS "lastAttemptAt"
       FROM practice_progress
       WHERE user_id = ANY($1::uuid[])
       ORDER BY user_id, question_id`,
      [idArray],
    );
    const progressByUser = groupBy(progressResult.rows, 'userId');

    const diagnosticResult = await client.query(
      `SELECT user_id::text AS "userId", questions_asked AS "questionsAsked",
              current_question_id AS "currentQuestionId",
              processing_question_id AS "processingQuestionId",
              processing_started_at AS "processingStartedAt",
              processing_claim_id AS "processingClaimId"
       FROM diagnostic_state
       WHERE user_id = ANY($1::uuid[])
       ORDER BY user_id`,
      [idArray],
    );
    const diagnosticByUser = new Map(diagnosticResult.rows.map((row) => [row.userId, row]));

    const usageResult = await client.query(
      `SELECT user_id::text AS "userId", count(*)::int AS count
       FROM assessment_usage
       GROUP BY user_id
       ORDER BY user_id NULLS FIRST`,
    );
    const usageByUser = new Map(usageResult.rows.map((row) => [row.userId, row.count]));

    for (const databaseId of aliveDatabaseIds) {
      const user = ledgerUserByDatabaseId.get(databaseId);
      const scope = `user:${user.index}`;
      const expectedAttempts = expectedAttemptsFor(user);
      const actualAttempts = attemptsByUser.get(databaseId) ?? [];
      check(scope, 'attempt row count exactly matches ledger', actualAttempts.length === expectedAttempts.length, {
        actual: actualAttempts.length,
        expected: expectedAttempts.length,
      });
      for (let index = 0; index < Math.max(actualAttempts.length, expectedAttempts.length); index++) {
        const actual = actualAttempts[index];
        const expected = expectedAttempts[index];
        const attemptScope = `${scope}:attempt:${index + 1}`;
        check(attemptScope, 'attempt exists on both sides', !!actual && !!expected);
        if (!actual || !expected) continue;
        check(attemptScope, 'ledger attempt sequence is contiguous', expected.seq === index + 1, {
          actual: expected.seq,
          expected: index + 1,
        });
        check(
          attemptScope,
          'ordered attempt fields match',
          actual.context === expected.context &&
            actual.questionId === expected.questionId &&
            actual.attemptNo === expected.attemptNo &&
            actual.score === expected.score &&
            actual.passed === expected.passed,
          {
            actual: {
              context: actual.context,
              questionId: actual.questionId,
              attemptNo: actual.attemptNo,
              score: actual.score,
              passed: actual.passed,
            },
            expected: {
              context: expected.context,
              questionId: expected.questionId,
              attemptNo: expected.attemptNo,
              score: expected.score,
              passed: expected.passed,
            },
          },
        );
        check(
          attemptScope,
          'transcript digest matches',
          sameOptionalDigest(expected.transcriptDigest, actual.transcript),
        );
        check(attemptScope, 'feedback digest matches', sameOptionalDigest(expected.feedbackDigest, actual.feedback));
      }

      const expectedRequests = expectedRequestsFor(user);
      const actualRequests = requestsByUser.get(databaseId) ?? [];
      const actualByRequestId = new Map(actualRequests.map((request) => [request.requestId, request]));
      check(
        scope,
        'assessment request count exactly matches ledger',
        actualRequests.length === expectedRequests.length,
        {
          actual: actualRequests.length,
          expected: expectedRequests.length,
        },
      );
      for (const expected of expectedRequests) {
        const requestScope = `${scope}:request:${expected.requestId}`;
        const assessmentActions = (user.actions ?? []).filter(
          (action) => action.assessment?.fresh === true && action.assessment.requestId === expected.requestId,
        );
        check(requestScope, 'request maps to exactly one fresh assessment action', assessmentActions.length === 1, {
          actual: assessmentActions.length,
          expected: 1,
        });
        const assessmentAction = assessmentActions[0];
        if (assessmentAction) {
          check(
            requestScope,
            'assessment action maps context, question, key hash, and fixture exactly',
            assessmentAction.assessment.context === expected.context &&
              assessmentAction.assessment.questionId === expected.questionId &&
              assessmentAction.assessment.keyHash === expected.audioKeyHash &&
              assessmentAction.assessment.audioFixtureId === expected.audioFixtureId,
          );
        }
        const durableAccessActions = (user.actions ?? []).filter(
          (action) =>
            action.logicalAction === `assessment-durable-access:${expected.context}` &&
            action.essentials?.requestId === expected.requestId,
        );
        check(
          requestScope,
          'request has exactly one successful durable GET access action',
          durableAccessActions.length === 1,
          {
            actual: durableAccessActions.length,
            expected: 1,
          },
        );
        const durableAccess = durableAccessActions[0];
        if (durableAccess) {
          check(
            requestScope,
            'durable GET maps context, question, response digest, and fixture exactly',
            durableAccess.essentials.context === expected.context &&
              durableAccess.essentials.questionId === expected.questionId &&
              durableAccess.essentials.responseDigest === expected.responseDigest &&
              durableAccess.essentials.audioFixtureId === expected.audioFixtureId &&
              durableAccess.attempts?.at(-1)?.status === 200,
          );
        }
        const actual = actualByRequestId.get(expected.requestId);
        check(requestScope, 'durable request exists', !!actual);
        if (!actual) continue;
        check(
          requestScope,
          'request context, question, and status match',
          actual.context === expected.context &&
            actual.questionId === expected.questionId &&
            actual.status === expected.status,
          {
            actual: { context: actual.context, questionId: actual.questionId, status: actual.status },
            expected: { context: expected.context, questionId: expected.questionId, status: expected.status },
          },
        );
        const expectedResponseDigest = normalizeDigest(expected.responseDigest);
        check(requestScope, 'response digest expectation is present', !!expectedResponseDigest);
        if (expectedResponseDigest) {
          check(
            requestScope,
            'canonical response digest matches',
            jsonDigest(actual.responseBody) === expectedResponseDigest,
          );
        }
        const expectedAudioHash = normalizeDigest(expected.audioKeyHash ?? expected.keyHash);
        check(requestScope, 'S3 key digest expectation is present', !!expectedAudioHash);
        if (expectedAudioHash) {
          check(
            requestScope,
            'bound S3 key hash matches',
            !!actual.audioKey && sha256(actual.audioKey) === expectedAudioHash,
          );
        }
      }

      const expectedProgress = expectedProgressFor(user);
      const actualProgress = progressByUser.get(databaseId) ?? [];
      const actualByQuestion = new Map(actualProgress.map((progress) => [progress.questionId, progress]));
      check(
        scope,
        'practice progress row count exactly matches ledger',
        actualProgress.length === expectedProgress.length,
        {
          actual: actualProgress.length,
          expected: expectedProgress.length,
        },
      );
      for (const expected of expectedProgress) {
        const progressScope = `${scope}:progress:${expected.questionId}`;
        const relatedAttempts = expectedAttempts.filter(
          (attempt) =>
            ['practice', 'practice-native'].includes(attempt.context) && attempt.questionId === expected.questionId,
        );
        const relatedEnglishAttempts = relatedAttempts.filter((attempt) => attempt.context === 'practice');
        const expectedBestScore =
          relatedEnglishAttempts.length > 0 ? Math.max(...relatedEnglishAttempts.map((attempt) => attempt.score)) : 0;
        check(
          progressScope,
          'progress count and best score agree with the exact attempt ledger',
          expected.attemptCount === relatedAttempts.length && expected.bestScore === expectedBestScore,
          {
            progressAttemptCount: expected.attemptCount,
            ledgerAttemptCount: relatedAttempts.length,
            progressBestScore: expected.bestScore,
            ledgerBestScore: expectedBestScore,
          },
        );
        const actual = actualByQuestion.get(expected.questionId);
        check(progressScope, 'expected progress row exists', !!actual);
        if (!actual) continue;
        check(
          progressScope,
          'progress status, best score, count, and SRS index match',
          actual.status === expected.status &&
            actual.bestScore === expected.bestScore &&
            actual.attemptCount === expected.attemptCount &&
            (expected.srsIntervalIndex === undefined || actual.srsIntervalIndex === expected.srsIntervalIndex),
          {
            actual: {
              status: actual.status,
              bestScore: actual.bestScore,
              attemptCount: actual.attemptCount,
              srsIntervalIndex: actual.srsIntervalIndex,
            },
            expected: {
              status: expected.status,
              bestScore: expected.bestScore,
              attemptCount: expected.attemptCount,
              srsIntervalIndex: expected.srsIntervalIndex ?? null,
            },
          },
        );
        const sourceActions = (Array.isArray(user.actions) ? user.actions : []).filter((action) => {
          if (expected.attemptCount === 0) {
            return action.logicalAction === 'practice-skip' && action.essentials?.questionId === expected.questionId;
          }
          return (
            ['assessment:practice', 'assessment:practice-native'].includes(action.logicalAction) &&
            action.assessment?.questionId === expected.questionId
          );
        });
        sourceActions.sort((left, right) => Date.parse(left.finishedAt) - Date.parse(right.finishedAt));
        const sourceAction = sourceActions.at(-1);
        check(
          progressScope,
          expected.attemptCount === 0
            ? 'zero-attempt last_attempt_at is sourced by the skip action'
            : 'spoken last_attempt_at is sourced by the latest practice assessment',
          !!sourceAction,
        );
        if (sourceAction) {
          const observedLastAttempt =
            actual.lastAttemptAt instanceof Date ? actual.lastAttemptAt.getTime() : asTimestamp(actual.lastAttemptAt);
          const sourceStarted = asTimestamp(sourceAction.startedAt);
          const sourceFinished = asTimestamp(sourceAction.finishedAt);
          check(
            progressScope,
            'last_attempt_at falls within its source action window',
            observedLastAttempt !== undefined &&
              sourceStarted !== undefined &&
              sourceFinished !== undefined &&
              observedLastAttempt >= sourceStarted - 5_000 &&
              observedLastAttempt <= sourceFinished + 5_000,
            {
              sourceAction: sourceAction.logicalAction,
              sourceStarted: sourceAction.startedAt,
              sourceFinished: sourceAction.finishedAt,
            },
          );
          if (expected.attemptCount > 0) {
            const matchingDatabaseAttempts = actualAttempts.filter(
              (attempt) =>
                ['practice', 'practice-native'].includes(attempt.context) && attempt.questionId === expected.questionId,
            );
            const latestDatabaseAttempt = matchingDatabaseAttempts.at(-1);
            const latestCreatedAt =
              latestDatabaseAttempt?.createdAt instanceof Date
                ? latestDatabaseAttempt.createdAt.getTime()
                : asTimestamp(latestDatabaseAttempt?.createdAt);
            check(
              progressScope,
              'last_attempt_at equals the latest persisted practice attempt timestamp',
              observedLastAttempt !== undefined &&
                latestCreatedAt !== undefined &&
                observedLastAttempt === latestCreatedAt,
            );
          }
        }
        for (const [field, minField, maxField] of [
          ['dueAt', 'dueAtMin', 'dueAtMax'],
          ['skippedUntil', 'skippedUntilMin', 'skippedUntilMax'],
        ]) {
          if (expected[field] === null || (expected[minField] === null && expected[maxField] === null)) {
            check(progressScope, `${field} is null`, actual[field] === null);
          }
          const min = asTimestamp(expected[minField]);
          const max = asTimestamp(expected[maxField]);
          if (min !== undefined || max !== undefined) {
            const observed = actual[field] instanceof Date ? actual[field].getTime() : asTimestamp(actual[field]);
            check(
              progressScope,
              `${field} falls inside the ledger window`,
              observed !== undefined &&
                (min === undefined || observed >= min) &&
                (max === undefined || observed <= max),
            );
          }
        }
      }

      const expectedFinal = expectedFinalFor(user);
      const diagnostic = diagnosticByUser.get(databaseId);
      check(scope, 'diagnostic state row exists', !!diagnostic);
      if (diagnostic) {
        const expectedAsked = asInteger(expectedFinal.diagnosticQuestionsAsked);
        if (expectedAsked !== undefined) {
          check(scope, 'diagnostic questions_asked matches ledger', diagnostic.questionsAsked === expectedAsked, {
            actual: diagnostic.questionsAsked,
            expected: expectedAsked,
          });
        }
        if (expectedFinal.diagnosticCompleted === true) {
          check(scope, 'completed diagnostic has no current question', diagnostic.currentQuestionId === null);
        }
        check(
          scope,
          'diagnostic state has no processing claim',
          diagnostic.processingQuestionId === null &&
            diagnostic.processingStartedAt === null &&
            diagnostic.processingClaimId === null,
        );
      }

      const expectedUsage = asInteger(user.expectedUsageReservations);
      if (expectedUsage !== undefined) {
        check(
          scope,
          'assessment usage reservations match ledger',
          (usageByUser.get(databaseId) ?? 0) === expectedUsage,
          {
            actual: usageByUser.get(databaseId) ?? 0,
            expected: expectedUsage,
          },
        );
      }
    }

    const expectedAliveAttempts = expectedAlive.reduce((total, user) => total + expectedAttemptsFor(user).length, 0);
    const expectedAliveRequests = expectedAlive.reduce((total, user) => total + expectedRequestsFor(user).length, 0);
    const expectedAliveProgress = expectedAlive.reduce((total, user) => total + expectedProgressFor(user).length, 0);
    check(
      'database',
      'global attempt count equals all surviving ledger attempts',
      attemptsResult.rowCount === expectedAliveAttempts,
      {
        actual: attemptsResult.rowCount,
        expected: expectedAliveAttempts,
      },
    );
    check(
      'database',
      'global assessment request count equals all surviving ledger requests',
      requestsResult.rowCount === expectedAliveRequests,
      { actual: requestsResult.rowCount, expected: expectedAliveRequests },
    );
    check(
      'database',
      'global practice progress count equals ledger',
      progressResult.rowCount === expectedAliveProgress,
      {
        actual: progressResult.rowCount,
        expected: expectedAliveProgress,
      },
    );

    const globalCountsResult = await client.query(
      `SELECT
         (SELECT count(*)::int FROM users) AS users,
         (SELECT count(*)::int FROM attempts) AS attempts,
         (SELECT count(*)::int FROM assessment_requests) AS requests,
         (SELECT count(*)::int FROM practice_progress) AS progress,
         (SELECT count(*)::int FROM diagnostic_state) AS diagnostics,
         (SELECT count(*)::int FROM recordings) AS recordings,
         (SELECT count(*)::int FROM recording_deletion_jobs) AS "recordingDeletionJobs",
         (SELECT count(*)::int FROM password_reset_tokens) AS "passwordResetTokens"`,
    );
    const globalCounts = globalCountsResult.rows[0];
    check(
      'database',
      'fresh database contains no users outside this ledger',
      globalCounts.users === expectedAlive.length,
      {
        actual: globalCounts.users,
        expected: expectedAlive.length,
      },
    );
    check(
      'database',
      'fresh database contains no attempts outside this ledger',
      globalCounts.attempts === expectedAliveAttempts,
      {
        actual: globalCounts.attempts,
        expected: expectedAliveAttempts,
      },
    );
    check(
      'database',
      'all recording metadata was removed only after owner/account delete requests',
      globalCounts.recordings === 0,
      {
        actual: globalCounts.recordings,
      },
    );
    check(
      'database',
      'durable deletion outbox contains one quiet-period tombstone per retained recording',
      globalCounts.recordingDeletionJobs === expectedCompletedRequestsFromUsers,
      { actual: globalCounts.recordingDeletionJobs, expected: expectedCompletedRequestsFromUsers },
    );
    check(
      'database',
      'fresh database contains no assessment requests outside this ledger',
      globalCounts.requests === expectedAliveRequests,
      { actual: globalCounts.requests, expected: expectedAliveRequests },
    );
    check(
      'database',
      'fresh database contains no progress outside this ledger',
      globalCounts.progress === expectedAliveProgress,
      {
        actual: globalCounts.progress,
        expected: expectedAliveProgress,
      },
    );
    check(
      'database',
      'fresh database contains one diagnostic state per live user',
      globalCounts.diagnostics === expectedAlive.length,
      {
        actual: globalCounts.diagnostics,
        expected: expectedAlive.length,
      },
    );
    check('database', 'no password reset token remains active after the run', globalCounts.passwordResetTokens === 0, {
      actual: globalCounts.passwordResetTokens,
    });

    const expectedUsageTotal = asInteger(ledger.expectedUsage?.total);
    const expectedDeletedUsage =
      asInteger(ledger.expectedUsage?.anonymizedDeleted) ??
      users
        .filter((user) => {
          const expected = expectedFinalFor(user);
          return (
            expected && (expected.exists === false || expected.deleted === true || user.terminalState === 'deleted')
          );
        })
        .reduce((total, user) => total + (asInteger(user.expectedUsageReservations) ?? 0), 0);
    const actualUsageTotal = [...usageByUser.values()].reduce((total, value) => total + value, 0);
    if (expectedUsageTotal !== undefined) {
      check(
        'database',
        'total assessment usage includes successes and paid failures exactly',
        actualUsageTotal === expectedUsageTotal,
        {
          actual: actualUsageTotal,
          expected: expectedUsageTotal,
        },
      );
    }
    check(
      'database',
      'fresh database usage total equals all per-user expectations',
      actualUsageTotal === expectedUsageTotalFromUsers,
      {
        actual: actualUsageTotal,
        expected: expectedUsageTotalFromUsers,
      },
    );
    check(
      'database',
      'deleted-user assessment usage is anonymized exactly',
      (usageByUser.get(null) ?? 0) === expectedDeletedUsage,
      { actual: usageByUser.get(null) ?? 0, expected: expectedDeletedUsage },
    );

    const claimsResult = await client.query(
      `SELECT
         (SELECT count(*)::int FROM practice_inflight) AS "practiceInflight",
         (SELECT count(*)::int FROM assessment_requests WHERE status = 'processing') AS "processingRequests",
         (SELECT count(*)::int FROM assessment_requests
           WHERE status = 'processing' AND started_at >= now() - interval '5 minutes') AS "unexpiredRequests",
         (SELECT count(*)::int FROM diagnostic_state WHERE processing_claim_id IS NOT NULL) AS "diagnosticClaims"`,
    );
    const claims = claimsResult.rows[0];
    check('database', 'no practice inflight claims remain', claims.practiceInflight === 0, claims);
    check('database', 'no assessment request is stuck processing', claims.processingRequests === 0, claims);
    check('database', 'no unexpired processing lease remains', claims.unexpiredRequests === 0, claims);
    check('database', 'no diagnostic processing claim remains', claims.diagnosticClaims === 0, claims);

    const catalogResult = await client.query(
      `SELECT id::text, cefr_level AS "cefrLevel", prompt_word AS "promptWord",
              question_text AS "questionText", translations
       FROM questions
       ORDER BY cefr_level, prompt_word, id`,
    );
    const catalogCounts = Object.fromEntries(LEVELS.map((level) => [level, 0]));
    for (const row of catalogResult.rows) {
      if (Object.hasOwn(catalogCounts, row.cefrLevel)) catalogCounts[row.cefrLevel]++;
    }
    check(
      'catalog',
      'catalog remains exactly 100 questions per CEFR level',
      catalogResult.rowCount === 600 && LEVELS.every((level) => catalogCounts[level] === 100),
      { total: catalogResult.rowCount, byLevel: catalogCounts },
    );
    check(
      'catalog',
      'every catalog row remains structurally well formed',
      catalogResult.rows.every(
        (row) =>
          typeof row.promptWord === 'string' &&
          row.promptWord.trim().length > 0 &&
          typeof row.questionText === 'string' &&
          row.questionText.trim().length > 0 &&
          row.translations !== null &&
          typeof row.translations === 'object' &&
          ['te', 'hi', 'es', 'zh'].every(
            (language) =>
              row.translations[language] &&
              typeof row.translations[language].word === 'string' &&
              typeof row.translations[language].question === 'string' &&
              Array.isArray(row.translations[language].examples) &&
              row.translations[language].examples.length === 3,
          ),
      ),
    );
    const expectedCatalog = readAuthoritativeCatalog();
    const actualCatalog = catalogResult.rows
      .map((row) => ({
        cefrLevel: row.cefrLevel,
        promptWord: row.promptWord,
        questionText: row.questionText,
        translations: row.translations,
      }))
      .sort(
        (left, right) =>
          left.cefrLevel.localeCompare(right.cefrLevel) || left.promptWord.localeCompare(right.promptWord),
      );
    check(
      'catalog',
      'catalog content exactly matches the reviewed packaged seed',
      canonicalJson(actualCatalog) === canonicalJson(expectedCatalog),
      {
        actualDigest: jsonDigest(actualCatalog),
        expectedDigest: jsonDigest(expectedCatalog),
      },
    );
    const catalogDigest = jsonDigest(actualCatalog);
    const expectedCatalogDigest = normalizeDigest(run.expectedCatalogDigest ?? run.catalogDigest);
    if (expectedCatalogDigest) {
      check('catalog', 'catalog content digest is unchanged', catalogDigest === expectedCatalogDigest);
    }

    const rateLimitsResult = await client.query(
      `SELECT split_part(namespace, ':', 1) AS namespace, sum(hits)::bigint AS hits
       FROM rate_limit_windows
       GROUP BY 1
       ORDER BY 1`,
    );
    const rateLimits = Object.fromEntries(rateLimitsResult.rows.map((row) => [row.namespace, Number(row.hits)]));
    const requiredNamespaces = [
      ...new Set([
        'auth',
        'register',
        'login-account',
        'assess',
        'assess-ip-daily',
        'upload-grant',
        'playback-grant',
        ...(Array.isArray(ledger.requiredRateLimitNamespaces) ? ledger.requiredRateLimitNamespaces : []),
      ]),
    ];
    for (const namespace of requiredNamespaces) {
      check('rate-limits', `namespace ${namespace} is present`, Object.hasOwn(rateLimits, namespace));
    }

    const actionAttempts = allLedgerActions.flatMap((action) =>
      (action.attempts ?? []).map((attempt) => ({ action: action.logicalAction, ...attempt })),
    );
    const responseAndTotal = (predicate) => {
      const matching = actionAttempts.filter(predicate);
      return { lower: matching.filter((attempt) => attempt.status !== null).length, upper: matching.length };
    };
    const registerRange = responseAndTotal(
      (attempt) => attempt.method === 'POST' && attempt.route === '/auth/register',
    );
    const uploadGrantRange = responseAndTotal(
      (attempt) => attempt.method === 'POST' && attempt.route === '/uploads/audio-url',
    );
    const playbackGrantRange = responseAndTotal(
      (attempt) => attempt.action === 'recording-playback' && attempt.method === 'POST',
    );
    const authRoutes = new Set([
      '/auth/login',
      '/auth/change-password',
      '/auth/account',
      '/auth/forgot-password',
      '/auth/reset-password',
    ]);
    const authRelevantAttempts = actionAttempts.filter(
      (attempt) => authRoutes.has(attempt.route) && (attempt.method === 'POST' || attempt.method === 'DELETE'),
    );
    // `rate_limit_windows` retains one current fixed-window row per source key;
    // it does not preserve the predecessor hit total after a 15-minute rollover.
    // This campaign can legitimately span that boundary, so the durable lower
    // bound is one responded auth request per distinct simulated source (or one
    // shared source when virtual networking is disabled), while every observed
    // auth attempt remains the upper bound.
    const authRespondedUsers = users.filter((user) =>
      (user.actions ?? []).some((action) =>
        (action.attempts ?? []).some(
          (attempt) =>
            authRoutes.has(attempt.route) &&
            (attempt.method === 'POST' || attempt.method === 'DELETE') &&
            attempt.status !== null,
        ),
      ),
    ).length;
    const authRange = {
      lower: authRelevantAttempts.some((attempt) => attempt.status !== null)
        ? run.sourceNetwork?.virtualSourceIps === true
          ? authRespondedUsers
          : 1
        : 0,
      upper: authRelevantAttempts.length,
    };
    const loginAttempts = actionAttempts.filter(
      (attempt) => attempt.method === 'POST' && attempt.route === '/auth/login',
    );
    const loginAccountRange = {
      lower: loginAttempts.filter((attempt) => attempt.status !== null && attempt.status >= 400).length,
      upper: loginAttempts.filter(
        (attempt) => attempt.status === null || (attempt.status !== null && attempt.status >= 400),
      ).length,
    };
    const passwordAttempts = actionAttempts.filter(
      (attempt) =>
        (attempt.method === 'POST' && attempt.route === '/auth/change-password') ||
        (attempt.method === 'DELETE' && attempt.route === '/auth/account'),
    );
    const passwordAccountRange = {
      lower: passwordAttempts.filter((attempt) => attempt.status !== null && attempt.status >= 400).length,
      upper: passwordAttempts.filter(
        (attempt) => attempt.status === null || (attempt.status !== null && attempt.status >= 400),
      ).length,
    };
    const forgotRange = responseAndTotal(
      (attempt) => attempt.method === 'POST' && attempt.route === '/auth/forgot-password',
    );
    const restartRange = responseAndTotal(
      (attempt) => attempt.method === 'POST' && attempt.route === '/diagnostic/restart',
    );
    const assessmentPosts = actionAttempts.filter(
      (attempt) =>
        attempt.method === 'POST' &&
        ['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native'].includes(attempt.route),
    );
    const assessmentUpper = assessmentPosts.filter(
      (attempt) =>
        !(typeof attempt.paidAttemptDisposition === 'string' && attempt.paidAttemptDisposition.startsWith('refunded-')),
    ).length;
    const assessmentLower = expectedUsageTotalFromUsers + replayAssessmentActions.length;
    const rateRanges = {
      register: registerRange,
      'upload-grant': uploadGrantRange,
      'playback-grant': playbackGrantRange,
      auth: authRange,
      'login-account': loginAccountRange,
      'password-account': passwordAccountRange,
      'forgot-email': forgotRange,
      'diagnostic-restart': restartRange,
      assess: { lower: assessmentLower, upper: assessmentUpper },
      'assess-ip-daily': { lower: assessmentLower, upper: assessmentUpper },
    };
    for (const [namespace, range] of Object.entries(rateRanges)) {
      if (!Object.hasOwn(rateLimits, namespace) && range.upper === 0) continue;
      const actual = rateLimits[namespace];
      check(
        'rate-limits',
        `${namespace} hits fall within verifier-derived bounds`,
        Number.isSafeInteger(actual) && actual >= range.lower && actual <= range.upper,
        { actual: actual ?? null, lower: range.lower, upper: range.upper },
      );
    }
    if (Object.hasOwn(rateLimits, 'assess') && Object.hasOwn(rateLimits, 'assess-ip-daily')) {
      check(
        'rate-limits',
        'assessment user and network limiter hits remain symmetric',
        rateLimits.assess === rateLimits['assess-ip-daily'],
        { assess: rateLimits.assess, assessIpDaily: rateLimits['assess-ip-daily'] },
      );
    }

    const s3Objects = Array.isArray(ledger.s3Audit?.objects) ? ledger.s3Audit.objects : [];
    check('s3', 'S3 audit contains object-level evidence', s3Objects.length > 0);
    const s3KeyHashes = s3Objects.map((object) => normalizeDigest(object.keyHash));
    check(
      's3',
      'S3 audit key hashes are exact lowercase SHA-256 and unique',
      s3KeyHashes.every(Boolean) && new Set(s3KeyHashes).size === s3Objects.length,
    );
    const s3ByKeyHash = new Map(s3Objects.map((object) => [normalizeDigest(object.keyHash), object]));
    for (const user of users) {
      for (const expectedRequest of expectedRequestsFor(user)) {
        const keyHash = normalizeDigest(expectedRequest.audioKeyHash);
        const object = keyHash ? s3ByKeyHash.get(keyHash) : undefined;
        const scope = `s3-request:${user.index}:${expectedRequest.requestId}`;
        check(scope, 'completed assessment has matching object audit evidence', !!object);
        if (object) {
          check(
            scope,
            'object audit is bound to the same user, request, recording, and audio fixture',
            object.ownerUserIndex === user.index &&
              object.requestId === expectedRequest.requestId &&
              object.recordingId === expectedRequest.recordingId &&
              object.audioFixtureId === expectedRequest.audioFixtureId,
            {
              actualOwnerUserIndex: object.ownerUserIndex,
              expectedOwnerUserIndex: user.index,
              actualRequestId: object.requestId,
              expectedRequestId: expectedRequest.requestId,
              actualAudioFixtureId: object.audioFixtureId ?? null,
              expectedAudioFixtureId: expectedRequest.audioFixtureId,
            },
          );
        }
      }
    }
    for (let index = 0; index < s3Objects.length; index++) {
      const object = s3Objects[index];
      const scope = `s3:${index}:${object.keyHash ?? 'unknown'}`;
      check(
        scope,
        'audit stores a key hash, not a raw key',
        !!normalizeDigest(object.keyHash) && object.key === undefined,
      );
      check(
        scope,
        'object scope and endpoint agree',
        (object.scope === 'diagnostic' && object.assessmentEndpoint === '/diagnostic/answer') ||
          (object.scope === 'practice' &&
            ['/practice/attempt', '/practice/attempt/native'].includes(object.assessmentEndpoint)),
      );
      check(
        scope,
        'object owner index belongs to this ledger',
        Number.isSafeInteger(object.ownerUserIndex) &&
          object.ownerUserIndex >= 0 &&
          object.ownerUserIndex < users.length,
      );
      check(
        scope,
        'object references a known controlled audio fixture',
        audioFixtureIds.includes(object.audioFixtureId),
      );
      if (object.uploaded === true) {
        check(
          scope,
          'uploaded object was range-read before API submission',
          object.readProvenBeforeSubmission === true,
        );
      }
      if (successfulS3Outcome(object.outcome)) {
        check(
          scope,
          'successful object was retained and authorized playback succeeded',
          object.expectedRetainedAfterSuccess === true &&
            object.retainedAfterSuccess === true &&
            !!normalizeDigest(object.retainedVersionHash),
        );
        check(scope, 'owner/account deletion was requested', object.deletionRequested === true);
        check(
          scope,
          'all object versions were absent after deletion or safe harness cleanup',
          object.allVersionsAbsentFinal === true,
        );
      }
      if (object.cleanupAttempted === true) {
        check(scope, 'explicit cleanup left no object', object.absentAfterCleanup === true);
      }
      check(
        scope,
        'object has an explained final state',
        object.allVersionsAbsentFinal === true ||
          object.absentAfterCleanup === true ||
          object.retainedExpected === true ||
          object.uploaded === false ||
          object.outcome === 'policy-rejected',
      );
    }
    const successfulObjectCount = s3Objects.filter((object) => successfulS3Outcome(object.outcome)).length;
    const incompleteSuccessfulObjectCount = s3Objects.filter(
      (object) =>
        successfulS3Outcome(object.outcome) &&
        (object.retainedAfterSuccess !== true || object.allVersionsAbsentFinal !== true),
    ).length;
    check(
      's3',
      'all successful objects were retained, played, then fully deleted',
      incompleteSuccessfulObjectCount === 0,
      {
        successfulObjectCount,
        incompleteSuccessfulObjectCount,
      },
    );
    check(
      's3',
      'one retained/deleted object exists per completed assessment request',
      successfulObjectCount === expectedCompletedRequestsFromUsers,
      { actual: successfulObjectCount, expected: expectedCompletedRequestsFromUsers },
    );
    const s3Counts = ledger.s3Audit?.counts;
    if (s3Counts && typeof s3Counts === 'object') {
      if (asInteger(s3Counts.total) !== undefined) {
        check('s3', 'declared object audit total is exact', s3Counts.total === s3Objects.length, {
          actual: s3Objects.length,
          expected: s3Counts.total,
        });
      }
      if (asInteger(s3Counts.successfulAssessments) !== undefined) {
        check(
          's3',
          'declared successful-assessment count is exact',
          s3Counts.successfulAssessments === successfulObjectCount,
          { actual: successfulObjectCount, expected: s3Counts.successfulAssessments },
        );
      }
      if (asInteger(s3Counts.successfulRetainedAndPlayed) !== undefined) {
        check(
          's3',
          'retained playback count is exact',
          s3Counts.successfulRetainedAndPlayed ===
            s3Objects.filter((object) => object.expectedRetainedAfterSuccess && object.retainedAfterSuccess).length,
        );
      }
      if (asInteger(s3Counts.backendDeletedAllVersions) !== undefined) {
        check(
          's3',
          'backend all-version deletion count is exact',
          s3Counts.backendDeletedAllVersions ===
            s3Objects.filter((object) => object.deletionRequested && object.allVersionsAbsentAfterDeletion).length,
        );
      }
      if (asInteger(s3Counts.cleanupFailures) !== undefined) {
        check('s3', 'declared cleanup failures are zero', s3Counts.cleanupFailures === 0, {
          actual: s3Counts.cleanupFailures,
        });
      }
      if (asInteger(s3Counts.auditFailures) !== undefined) {
        check('s3', 'S3 audit reports zero failures', s3Counts.auditFailures === 0, {
          actual: s3Counts.auditFailures,
        });
      }
    }

    const globalFailures = Array.isArray(ledger.failures) ? ledger.failures : [];
    check('ledger', 'run contains no global failures', globalFailures.length === 0, {
      failureCount: globalFailures.length,
    });

    const failedChecks = checks.filter((entry) => !entry.passed);
    const checksByUserIndex = new Map();
    for (const entry of checks) {
      const match = /^user:(\d+)(?::|$)/.exec(entry.scope);
      if (!match) continue;
      const index = Number(match[1]);
      if (!checksByUserIndex.has(index)) checksByUserIndex.set(index, []);
      checksByUserIndex.get(index).push(entry);
    }
    for (const result of userResults) {
      const relevant = checksByUserIndex.get(result.index) ?? [];
      result.checks = relevant.length;
      result.failures = relevant.filter((entry) => !entry.passed).map((entry) => entry.name);
      result.passed = result.failures.length === 0;
    }

    const userResultByIndex = new Map(userResults.map((result) => [result.index, result]));
    const userMappings = users.map((user) => {
      const expectedFinal = expectedFinalFor(user);
      const actions = Array.isArray(user.actions) ? user.actions : [];
      const actionNames = new Map();
      const actionStatuses = new Map();
      const actionCodes = new Map();
      for (const action of actions) {
        incrementCount(actionNames, action.logicalAction);
        if (!actionStatuses.has(action.logicalAction)) actionStatuses.set(action.logicalAction, []);
        if (!actionCodes.has(action.logicalAction)) actionCodes.set(action.logicalAction, []);
        actionStatuses.get(action.logicalAction).push(action.attempts?.at(-1)?.status ?? null);
        actionCodes.get(action.logicalAction).push(action.attempts?.at(-1)?.code ?? null);
      }
      const attempts = expectedAttemptsFor(user);
      const requests = expectedRequestsFor(user);
      const objects = s3Objects.filter((object) => object.ownerUserIndex === user.index);
      const objectsClean = objects.every(
        (object) =>
          (!successfulS3Outcome(object.outcome) ||
            (object.retainedAfterSuccess === true && object.allVersionsAbsentFinal === true)) &&
          object.absentAfterCleanup === true &&
          object.errorCode === null,
      );
      const databaseId = [...ledgerUserByDatabaseId.entries()].find(([, owner]) => owner.index === user.index)?.[0];
      const result = userResultByIndex.get(user.index);
      return {
        index: user.index,
        idHash: user.idHash,
        emailHash: user.emailHash,
        nativeLanguage: user.nativeLanguage,
        cohort: user.cohort,
        exists: expectedFinal?.exists === true,
        deleted: expectedFinal?.exists === false,
        actions: {
          count: actions.length,
          names: countsObject(actionNames),
          terminalStatuses: Object.fromEntries([...actionStatuses.entries()].sort(([a], [b]) => a.localeCompare(b))),
          terminalCodes: Object.fromEntries([...actionCodes.entries()].sort(([a], [b]) => a.localeCompare(b))),
        },
        diagnosticAttempts: attempts.filter((attempt) => attempt.context === 'diagnostic').length,
        englishPracticeAttempts: attempts.filter((attempt) => attempt.context === 'practice').length,
        nativePracticeAttempts: attempts.filter((attempt) => attempt.context === 'practice-native').length,
        diagnosticRequests: requests.filter((request) => request.context === 'diagnostic').length,
        englishPracticeRequests: requests.filter((request) => request.context === 'practice').length,
        nativeRequests: requests.filter((request) => request.context === 'practice-native').length,
        audioFixtureIds: [...new Set(requests.map((request) => request.audioFixtureId))].sort(),
        progressRows: expectedProgressFor(user).length,
        expectedUsageReservations: user.expectedUsageReservations,
        databaseUsageReservations: databaseId ? (usageByUser.get(databaseId) ?? 0) : null,
        usageAnonymizedByDeletion: expectedFinal?.exists === false,
        s3: {
          objects: objects.length,
          successfulAssessments: objects.filter((object) => successfulS3Outcome(object.outcome)).length,
          retainedAndPlayed: objects.filter(
            (object) => successfulS3Outcome(object.outcome) && object.retainedAfterSuccess === true,
          ).length,
          allVersionsDeletedAfterOwnerRequest: objects.filter(
            (object) => successfulS3Outcome(object.outcome) && object.allVersionsAbsentFinal === true,
          ).length,
          lifecycle: 'transient-upload-retained-playback-owner-delete-all-versions',
        },
        checks: {
          passed: result?.passed === true && objectsClean && failedChecks.length === 0,
          userScopedPassed: result?.passed === true,
          globalReconciliationPassed: failedChecks.length === 0,
          failed: [
            ...(result?.failures ?? []),
            ...(objectsClean ? [] : ['S3 object lifecycle mismatch']),
            ...(failedChecks.length === 0 ? [] : ['Global reconciliation mismatch']),
          ],
        },
      };
    });

    const reconciliation = {
      schemaVersion: 1,
      kind: 'load1000-live-reconciliation',
      runId,
      ledgerPath: path.basename(ledgerPath),
      databaseName,
      generatedAt: new Date().toISOString(),
      passed: failedChecks.length === 0,
      summary: {
        users: users.length,
        usersPassed: userResults.filter((result) => result.passed).length,
        languageDistribution: languageCounts,
        actions: actionCount,
        checks: checks.length,
        failedChecks: failedChecks.length,
        attempts: attemptsResult.rowCount,
        assessmentRequests: requestsResult.rowCount,
        practiceProgressRows: progressResult.rowCount,
        assessmentUsageRows: actualUsageTotal,
        anonymizedUsageRows: usageByUser.get(null) ?? 0,
        s3Objects: s3Objects.length,
        successfulS3Objects: successfulObjectCount,
      },
      catalog: { total: catalogResult.rowCount, byLevel: catalogCounts, digest: catalogDigest },
      audioLifecycle: 's3-readable-before-submit-and-deleted-after-success',
      rateLimitNamespaces: rateLimits,
      userResults,
      userMappings,
      checks,
    };
    const safeRunId = String(runId || path.basename(ledgerPath, '.json')).replace(/[^A-Za-z0-9._-]/g, '_');
    const reportName = `reconciliation-${safeRunId}.json`;
    const reportPath = path.join(path.dirname(ledgerPath), reportName);
    if (path.resolve(reportPath) === path.resolve(ledgerPath)) {
      throw new Error('refusing to overwrite the source ledger with its reconciliation report');
    }
    fs.writeFileSync(reportPath, `${JSON.stringify(reconciliation, null, 2)}\n`, {
      mode: 0o600,
      flag: 'wx',
    });
    fs.chmodSync(reportPath, 0o600);

    console.log(
      `${reconciliation.passed ? 'PASS' : 'FAIL'}: ${reconciliation.summary.usersPassed}/${users.length} users, ` +
        `${checks.length - failedChecks.length}/${checks.length} checks, ${actionCount} actions`,
    );
    console.log(
      `DB: ${attemptsResult.rowCount} attempts, ${requestsResult.rowCount} assessment requests, ` +
        `${progressResult.rowCount} progress rows, ${actualUsageTotal} usage reservations`,
    );
    console.log(
      `languages: ${expectedLanguages.map((language) => `${language}=${languageCounts[language]}`).join(' ')}`,
    );
    console.log(
      `S3: ${successfulObjectCount - incompleteSuccessfulObjectCount}/${successfulObjectCount} retained, played, and fully deleted`,
    );
    console.log(`report: ${reportPath}`);
    if (failedChecks.length > 0) process.exitCode = 1;
  } finally {
    if (snapshotOpen) await client.query('ROLLBACK').catch(() => undefined);
    await client.end();
  }
}

main().catch((error) => {
  console.error(`live reconciliation aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
