#!/usr/bin/env node

// Offline, secret-free analysis for a successful live-load ledger and its
// read-only database reconciliation. This script performs no network, database,
// S3, or provider calls. It writes new 0600 reports with exclusive creation.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 1;
const MAX_SOURCE_BYTES = 256 * 1024 * 1024;
const MAX_FAILURE_ITEMS = 50;
const LANGUAGES = ['te', 'hi', 'es', 'zh'];
const COHORTS = ['full', 'english', 'native', 'account'];
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(SCRIPT_DIR, '..', 'reports', 'load1000-live');

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeInteger(value, fallback = 0) {
  return Number.isSafeInteger(value) ? value : fallback;
}

function safeNumber(value, fallback = null) {
  return Number.isFinite(value) ? value : fallback;
}

function safeLabel(value, fallback = 'unknown') {
  if (typeof value !== 'string' || value.length < 1 || value.length > 120) return fallback;
  return /^[A-Za-z0-9][A-Za-z0-9:._+/-]*$/.test(value) ? value : fallback;
}

function isDigest(value) {
  return typeof value === 'string' && /^(?:sha256:)?[0-9a-f]{64}$/i.test(value);
}

function mapIncrement(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortedObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function percentile(sorted, value) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil((value / 100) * sorted.length) - 1);
  return sorted[index];
}

function numericStats(values, { round = true } = {}) {
  const numbers = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);
  if (numbers.length === 0) {
    return { count: 0, min: null, average: null, p50: null, p95: null, p99: null, max: null };
  }
  const normalize = (value) => (round ? Math.round(value) : Number(value.toFixed(4)));
  return {
    count: numbers.length,
    min: normalize(numbers[0]),
    average: normalize(numbers.reduce((total, value) => total + value, 0) / numbers.length),
    p50: normalize(percentile(numbers, 50)),
    p95: normalize(percentile(numbers, 95)),
    p99: normalize(percentile(numbers, 99)),
    max: normalize(numbers[numbers.length - 1]),
  };
}

function countDistribution(values) {
  const counts = new Map();
  for (const value of values) mapIncrement(counts, String(value));
  return sortedObject(counts);
}

function scoreSummary(values) {
  const scores = values.filter((value) => Number.isInteger(value) && value >= 0 && value <= 100);
  const histogram = new Map();
  for (const score of scores) {
    const bucket = score === 100 ? '100' : `${Math.floor(score / 10) * 10}-${Math.floor(score / 10) * 10 + 9}`;
    mapIncrement(histogram, bucket);
  }
  return { ...numericStats(scores, { round: false }), histogram: sortedObject(histogram) };
}

function newestLedgerPath() {
  const entries = fs
    .readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith('ledger-') && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .sort();
  if (entries.length === 0) throw new Error(`no live ledger found in ${REPORTS_DIR}`);
  return path.join(REPORTS_DIR, entries.at(-1));
}

function readJsonFile(filePath, label) {
  const resolved = path.resolve(filePath);
  const metadata = fs.lstatSync(resolved);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${label} must be a regular, non-symlink file`);
  }
  if (metadata.size < 2 || metadata.size > MAX_SOURCE_BYTES) {
    throw new Error(`${label} size must be from 2 bytes to ${MAX_SOURCE_BYTES} bytes`);
  }
  const bytes = fs.readFileSync(resolved);
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error(`${label} must contain valid JSON`);
  }
  if (!isRecord(parsed)) throw new Error(`${label} root must be a JSON object`);
  return { path: resolved, value: parsed, digest: sha256(bytes) };
}

function sensitivePaths(value, currentPath = '$', found = [], depth = 0) {
  if (depth > 80) throw new Error('source JSON nesting exceeds the safe analysis bound');
  if (typeof value === 'string') {
    if (
      /audio-uploads\/(?:diagnostic|practice)\//i.test(value) ||
      /(?:X-Amz-Credential|X-Amz-Signature)=/i.test(value) ||
      /\bBearer\s+[A-Za-z0-9._-]+/i.test(value) ||
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(value) ||
      /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/.test(value) ||
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)
    ) {
      found.push(currentPath);
    }
    return found;
  }
  if (value === null || typeof value !== 'object') return found;
  const forbiddenKeys = new Set([
    '_email',
    '_id',
    '_name',
    '_password',
    '_token',
    'accessKeyId',
    'audioKey',
    'authorization',
    'bytes',
    'email',
    'filePath',
    'grant',
    'password',
    'rawEmail',
    'rawKey',
    'rawName',
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
    if (forbiddenKeys.has(key)) found.push(childPath);
    sensitivePaths(child, childPath, found, depth + 1);
  }
  return found;
}

function validateSources(ledgerFile, reconciliationFile) {
  const ledger = ledgerFile.value;
  const reconciliation = reconciliationFile.value;
  if (ledger.schemaVersion !== SCHEMA_VERSION || reconciliation.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('ledger and reconciliation schemaVersion must both be 1');
  }
  if (reconciliation.kind !== 'load1000-live-reconciliation') {
    throw new Error('reconciliation kind is not load1000-live-reconciliation');
  }
  const runId = ledger.run?.runId;
  if (typeof runId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runId)) {
    throw new Error('ledger run id is missing or unsafe');
  }
  if (reconciliation.runId !== runId) throw new Error('ledger and reconciliation run ids do not match');
  if (reconciliation.ledgerPath !== path.basename(ledgerFile.path)) {
    throw new Error('reconciliation does not name the supplied ledger');
  }
  if (path.dirname(ledgerFile.path) !== path.dirname(reconciliationFile.path)) {
    throw new Error('ledger and reconciliation must be in the same report directory');
  }
  if (
    reconciliation.passed !== true ||
    reconciliation.summary?.failedChecks !== 0 ||
    !Array.isArray(reconciliation.checks) ||
    reconciliation.checks.some((check) => check?.passed !== true)
  ) {
    throw new Error('refusing analysis because reconciliation did not pass every check');
  }
  const users = Array.isArray(ledger.users) ? ledger.users : [];
  if (
    users.length < 1 ||
    ledger.run?.userCount !== users.length ||
    reconciliation.summary?.users !== users.length ||
    reconciliation.summary?.usersPassed !== users.length
  ) {
    throw new Error('ledger and reconciliation user totals do not agree');
  }
  const indexes = users.map((user) => user?.index);
  if (indexes.some((index) => !Number.isSafeInteger(index) || index < 0) || new Set(indexes).size !== users.length) {
    throw new Error('ledger user indexes are invalid or duplicated');
  }
  const ledgerSensitive = sensitivePaths(ledger);
  const reconciliationSensitive = sensitivePaths(reconciliation);
  if (ledgerSensitive.length > 0 || reconciliationSensitive.length > 0) {
    throw new Error('refusing to analyze a source containing raw identity, credential, upload, or S3-key data');
  }
  return { ledger, reconciliation, runId, users };
}

function actionPassed(action) {
  return (
    action?.outcome === 'passed' || action?.outcome === 'success' || action?.ok === true || action?.success === true
  );
}

function terminalStatus(action) {
  const status = Array.isArray(action?.attempts) ? action.attempts.at(-1)?.status : null;
  return Number.isInteger(status) ? String(status) : 'NETERR';
}

function buildPopulation(users) {
  const byLanguage = new Map(LANGUAGES.map((language) => [language, 0]));
  const byCohort = new Map(COHORTS.map((cohort) => [cohort, 0]));
  const languageByCohort = new Map();
  for (const user of users) {
    const language = LANGUAGES.includes(user.nativeLanguage) ? user.nativeLanguage : 'unknown';
    const cohort = COHORTS.includes(user.cohort) ? user.cohort : 'unknown';
    mapIncrement(byLanguage, language);
    mapIncrement(byCohort, cohort);
    if (!languageByCohort.has(language)) languageByCohort.set(language, new Map());
    mapIncrement(languageByCohort.get(language), cohort);
  }
  return {
    total: users.length,
    byLanguage: sortedObject(byLanguage),
    byCohort: sortedObject(byCohort),
    byLanguageAndCohort: Object.fromEntries(
      [...languageByCohort.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([language, cohorts]) => [language, sortedObject(cohorts)]),
    ),
  };
}

function buildMappingAnalysis(users, reconciliation, addFailure) {
  const results = new Map((reconciliation.userResults ?? []).map((result) => [result.index, result]));
  const mappings = new Map((reconciliation.userMappings ?? []).map((mapping) => [mapping.index, mapping]));
  const completeness = [];
  const reconciliationCheckCounts = [];
  let fullyMapped = 0;
  let detailedMappingRecords = 0;
  for (const user of users) {
    const attempts = Array.isArray(user.expectedAttempts) ? user.expectedAttempts : [];
    const requests = Array.isArray(user.expectedAssessmentRequests) ? user.expectedAssessmentRequests : [];
    const progress = Array.isArray(user.expectedPracticeProgress) ? user.expectedPracticeProgress : [];
    const result = results.get(user.index);
    const mapping = mappings.get(user.index);
    const components = [
      isDigest(user.idHash) && isDigest(user.emailHash),
      isRecord(user.expectedFinal),
      Array.isArray(user.actions) && user.actions.length > 0,
      Array.isArray(user.expectedAttempts),
      Array.isArray(user.expectedAssessmentRequests),
      Array.isArray(user.expectedPracticeProgress),
      Number.isSafeInteger(user.expectedUsageReservations) && user.expectedUsageReservations >= 0,
      result?.passed === true,
    ];
    if (mapping) {
      detailedMappingRecords++;
      const expectedDiagnostic = attempts.filter((attempt) => attempt.context === 'diagnostic').length;
      const expectedEnglish = attempts.filter((attempt) => attempt.context === 'practice').length;
      const expectedDiagnosticRequests = requests.filter((request) => request.context === 'diagnostic').length;
      const expectedEnglishRequests = requests.filter((request) => request.context === 'practice').length;
      const expectedNativeRequests = requests.filter((request) => request.context === 'practice-native').length;
      const usageMatches =
        user.expectedFinal?.exists === false
          ? mapping.usageAnonymizedByDeletion === true
          : mapping.databaseUsageReservations === user.expectedUsageReservations;
      components.push(
        mapping.nativeLanguage === user.nativeLanguage &&
          mapping.cohort === user.cohort &&
          mapping.actions?.count === user.actions.length &&
          mapping.diagnosticAttempts === expectedDiagnostic &&
          mapping.englishPracticeAttempts === expectedEnglish &&
          mapping.diagnosticRequests === expectedDiagnosticRequests &&
          mapping.englishPracticeRequests === expectedEnglishRequests &&
          mapping.nativeRequests === expectedNativeRequests &&
          mapping.progressRows === progress.length &&
          usageMatches &&
          mapping.s3?.successfulAssessments === requests.length &&
          mapping.s3?.retainedAndPlayed === requests.length &&
          mapping.s3?.allVersionsDeletedAfterOwnerRequest === requests.length &&
          mapping.checks?.passed === true,
      );
    } else {
      // Version-1 reconciliations created before userMappings existed still
      // contain the every-user userResults/check set. Preserve compatibility
      // while making the evidence source explicit in the output.
      components.push(result?.passed === true);
    }
    const score = components.filter(Boolean).length;
    const total = components.length;
    completeness.push(`${score}/${total}`);
    if (score === total) fullyMapped++;
    else addFailure({ scope: 'mapping', userIndex: user.index, kind: 'incomplete', completed: score, expected: total });
    if (Number.isSafeInteger(result?.checks)) reconciliationCheckCounts.push(result.checks);
  }
  return {
    users: users.length,
    fullyMapped,
    incomplete: users.length - fullyMapped,
    detailedMappingRecords,
    legacyUserResultFallbacks: users.length - detailedMappingRecords,
    completenessDistribution: countDistribution(completeness),
    reconciliationCheckCountDistribution: countDistribution(reconciliationCheckCounts),
    reconciliationChecksPerUser: numericStats(reconciliationCheckCounts),
  };
}

function collectActions(users, ledger) {
  const actions = [];
  for (const action of Array.isArray(ledger.systemActions) ? ledger.systemActions : []) {
    actions.push({ action, userIndex: null, language: null, cohort: 'system' });
  }
  for (const user of users) {
    for (const action of Array.isArray(user.actions) ? user.actions : []) {
      actions.push({ action, userIndex: user.index, language: user.nativeLanguage, cohort: user.cohort });
    }
  }
  return actions;
}

function buildActionAnalysis(actionEntries, addFailure) {
  const byAction = new Map();
  const globalLatencies = [];
  const globalStatuses = new Map();
  const globalCodes = new Map();
  const retryReasons = new Map();
  const networkErrorKinds = new Map();
  let retries = 0;
  let networkErrors = 0;
  let passed = 0;
  let failed = 0;
  let transportAttempts = 0;

  for (const entry of actionEntries) {
    const action = entry.action;
    const logicalAction = safeLabel(action?.logicalAction, 'invalid-action');
    if (!byAction.has(logicalAction)) {
      byAction.set(logicalAction, {
        count: 0,
        passed: 0,
        failed: 0,
        system: 0,
        users: 0,
        transportAttempts: 0,
        retries: 0,
        networkErrors: 0,
        outcomes: new Map(),
        terminalStatuses: new Map(),
        attemptStatuses: new Map(),
        terminalCodes: new Map(),
        retryReasons: new Map(),
        latencies: [],
      });
    }
    const aggregate = byAction.get(logicalAction);
    aggregate.count++;
    if (entry.userIndex === null) aggregate.system++;
    else aggregate.users++;
    const outcome = safeLabel(action?.outcome, 'unknown');
    mapIncrement(aggregate.outcomes, outcome);
    const isPassed = actionPassed(action);
    if (isPassed) {
      aggregate.passed++;
      passed++;
    } else {
      aggregate.failed++;
      failed++;
      addFailure({
        scope: 'action',
        ...(entry.userIndex === null ? { system: true } : { userIndex: entry.userIndex }),
        logicalAction,
        outcome,
      });
    }
    const terminal = terminalStatus(action);
    mapIncrement(aggregate.terminalStatuses, terminal);
    const expectedStatus = action?.expected?.terminalStatus;
    if (Number.isInteger(expectedStatus) && terminal !== String(expectedStatus)) {
      addFailure({
        scope: 'action',
        ...(entry.userIndex === null ? { system: true } : { userIndex: entry.userIndex }),
        logicalAction,
        kind: 'terminal-status-mismatch',
        actual: terminal,
        expected: expectedStatus,
      });
    }
    const attempts = Array.isArray(action?.attempts) ? action.attempts : [];
    aggregate.transportAttempts += attempts.length;
    transportAttempts += attempts.length;
    for (const attempt of attempts) {
      const status = Number.isInteger(attempt?.status) ? String(attempt.status) : 'NETERR';
      mapIncrement(aggregate.attemptStatuses, status);
      mapIncrement(globalStatuses, status);
      if (typeof attempt?.code === 'string' && attempt.code.length > 0) {
        const code = safeLabel(attempt.code, 'other-code');
        mapIncrement(globalCodes, code);
      }
      if (typeof attempt?.retryReason === 'string' && attempt.retryReason.length > 0) {
        const reason = safeLabel(attempt.retryReason, 'other-retry');
        aggregate.retries++;
        retries++;
        mapIncrement(aggregate.retryReasons, reason);
        mapIncrement(retryReasons, reason);
      }
      if (attempt?.networkError) {
        const errorKind = safeLabel(attempt.networkError, 'NetworkError');
        aggregate.networkErrors++;
        networkErrors++;
        mapIncrement(networkErrorKinds, errorKind);
      }
      if (Number.isFinite(attempt?.latencyMs) && attempt.latencyMs >= 0) {
        aggregate.latencies.push(attempt.latencyMs);
        globalLatencies.push(attempt.latencyMs);
      }
    }
    const terminalAttempt = attempts.at(-1);
    if (typeof terminalAttempt?.code === 'string' && terminalAttempt.code.length > 0) {
      mapIncrement(aggregate.terminalCodes, safeLabel(terminalAttempt.code, 'other-code'));
    }
  }

  const finalized = {};
  for (const [logicalAction, aggregate] of [...byAction.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    finalized[logicalAction] = {
      count: aggregate.count,
      passed: aggregate.passed,
      failed: aggregate.failed,
      system: aggregate.system,
      users: aggregate.users,
      transportAttempts: aggregate.transportAttempts,
      retries: aggregate.retries,
      networkErrors: aggregate.networkErrors,
      outcomes: sortedObject(aggregate.outcomes),
      terminalStatuses: sortedObject(aggregate.terminalStatuses),
      attemptStatuses: sortedObject(aggregate.attemptStatuses),
      terminalCodes: sortedObject(aggregate.terminalCodes),
      retryReasons: sortedObject(aggregate.retryReasons),
      latencyMs: numericStats(aggregate.latencies),
    };
  }
  return {
    totals: {
      actions: actionEntries.length,
      passed,
      failed,
      transportAttempts,
      retries,
      networkErrors,
      latencyMs: numericStats(globalLatencies),
      statusCodes: sortedObject(globalStatuses),
      apiCodes: sortedObject(globalCodes),
      retryReasons: sortedObject(retryReasons),
      networkErrorKinds: sortedObject(networkErrorKinds),
    },
    inventory: finalized,
  };
}

function expectedAttempts(user, context) {
  return (Array.isArray(user.expectedAttempts) ? user.expectedAttempts : []).filter(
    (attempt) => attempt?.context === context,
  );
}

function expectedRequests(user, context) {
  return (Array.isArray(user.expectedAssessmentRequests) ? user.expectedAssessmentRequests : []).filter(
    (request) => request?.context === context,
  );
}

function buildLearningAnalysis(users) {
  const diagnosticScores = [];
  const diagnosticAttemptsPerUser = [];
  const diagnosticFinalLevels = new Map();
  let diagnosticPassed = 0;
  let diagnosticFailed = 0;
  let diagnosticCompletedUsers = 0;

  const englishEligible = users.filter((user) => user.cohort === 'full' || user.cohort === 'english');
  const englishScores = [];
  const englishAttemptsPerUser = [];
  let englishPassedAttempts = 0;
  let englishPassedUsers = 0;
  let englishMasteredAttempts = 0;
  let englishMasteredUsers = 0;
  let englishFinalFailureAttempts = 0;
  let englishFinalFailureUsers = 0;
  let englishTranscriptEmptyResults = 0;

  for (const user of users) {
    const attempts = expectedAttempts(user, 'diagnostic');
    diagnosticAttemptsPerUser.push(attempts.length);
    for (const attempt of attempts) {
      diagnosticScores.push(attempt.score);
      if (attempt.passed) diagnosticPassed++;
      else diagnosticFailed++;
    }
    if (user.expectedFinal?.diagnosticCompleted === true) diagnosticCompletedUsers++;
    mapIncrement(diagnosticFinalLevels, safeLabel(user.expectedFinal?.cefrLevel, 'unknown'));
  }

  for (const user of englishEligible) {
    const attempts = expectedAttempts(user, 'practice');
    englishAttemptsPerUser.push(attempts.length);
    for (const attempt of attempts) {
      englishScores.push(attempt.score);
      if (attempt.passed) englishPassedAttempts++;
      if (attempt.score >= 75) englishMasteredAttempts++;
      if (attempt.passed === false && attempt.attemptNo === 3) englishFinalFailureAttempts++;
    }
    if (attempts.some((attempt) => attempt.passed)) englishPassedUsers++;
    if (attempts.some((attempt) => attempt.score >= 75)) englishMasteredUsers++;
    if (attempts.some((attempt) => attempt.passed === false && attempt.attemptNo === 3)) englishFinalFailureUsers++;
    for (const action of Array.isArray(user.actions) ? user.actions : []) {
      if (action.logicalAction === 'assessment:practice' && action.essentials?.noSpeech === true) {
        englishTranscriptEmptyResults++;
      }
    }
  }

  return {
    diagnostic: {
      users: users.length,
      completedUsers: diagnosticCompletedUsers,
      questions: diagnosticScores.length,
      questionsPerUser: countDistribution(diagnosticAttemptsPerUser),
      passedAnswers: diagnosticPassed,
      failedAnswers: diagnosticFailed,
      finalCefrLevels: sortedObject(diagnosticFinalLevels),
      scores: scoreSummary(diagnosticScores),
    },
    englishPractice: {
      eligibleUsers: englishEligible.length,
      scoredAttempts: englishScores.length,
      scoredAttemptsPerEligibleUser: countDistribution(englishAttemptsPerUser),
      passedAttempts: englishPassedAttempts,
      passedUsers: englishPassedUsers,
      masteredAttempts: englishMasteredAttempts,
      masteredUsers: englishMasteredUsers,
      finalFailureAttempts: englishFinalFailureAttempts,
      finalFailureUsers: englishFinalFailureUsers,
      transcriptEmptyPaidResults: englishTranscriptEmptyResults,
      scores: scoreSummary(englishScores),
    },
  };
}

function buildNativeAnalysis(users) {
  const byLanguage = Object.fromEntries(
    LANGUAGES.map((language) => [
      language,
      {
        eligibleUsers: 0,
        completed: 0,
        understood: 0,
        notUnderstood: 0,
        understoodUnknown: 0,
        transcriptEmpty: 0,
        transcriptNonEmpty: 0,
        transcriptUnknown: 0,
      },
    ]),
  );
  const overall = {
    eligibleUsers: 0,
    completed: 0,
    understood: 0,
    notUnderstood: 0,
    understoodUnknown: 0,
    transcriptEmpty: 0,
    transcriptNonEmpty: 0,
    transcriptUnknown: 0,
    durableRequests: 0,
    replays: 0,
  };
  for (const user of users) {
    if (user.cohort !== 'full' && user.cohort !== 'native') continue;
    const language = LANGUAGES.includes(user.nativeLanguage) ? user.nativeLanguage : null;
    if (!language) continue;
    overall.eligibleUsers++;
    byLanguage[language].eligibleUsers++;
    const actions = (user.actions ?? []).filter((action) => action.logicalAction === 'assessment:practice-native');
    overall.durableRequests += expectedRequests(user, 'practice-native').length;
    overall.replays += (user.actions ?? []).filter(
      (action) => action.logicalAction === 'assessment-replay:practice-native',
    ).length;
    for (const action of actions) {
      overall.completed++;
      byLanguage[language].completed++;
      if (action.essentials?.understood === true) {
        overall.understood++;
        byLanguage[language].understood++;
      } else if (action.essentials?.understood === false) {
        overall.notUnderstood++;
        byLanguage[language].notUnderstood++;
      } else {
        overall.understoodUnknown++;
        byLanguage[language].understoodUnknown++;
      }
      if (action.essentials?.transcriptEmpty === true) {
        overall.transcriptEmpty++;
        byLanguage[language].transcriptEmpty++;
      } else if (action.essentials?.transcriptEmpty === false) {
        overall.transcriptNonEmpty++;
        byLanguage[language].transcriptNonEmpty++;
      } else {
        overall.transcriptUnknown++;
        byLanguage[language].transcriptUnknown++;
      }
    }
  }
  return { overall, byLanguage };
}

function buildResultAccess(users) {
  const definitions = [
    ['durableAssessment', (name) => name.startsWith('assessment-durable-access:')],
    ['nativeReplay', (name) => name === 'assessment-replay:practice-native'],
    ['history', (name) => name === 'practice-history'],
    ['stats', (name) => name === 'practice-stats'],
    ['dataExport', (name) => name === 'data-export'],
  ];
  const output = {};
  for (const [key, matches] of definitions) {
    const actions = users.flatMap((user) =>
      (user.actions ?? []).filter((action) => matches(action.logicalAction ?? '')),
    );
    const statuses = new Map();
    for (const action of actions) mapIncrement(statuses, terminalStatus(action));
    output[key] = {
      recorded: actions.length,
      passed: actions.filter(actionPassed).length,
      failed: actions.filter((action) => !actionPassed(action)).length,
      terminalStatuses: sortedObject(statuses),
    };
  }
  output.durableAssessment.expected = users.reduce(
    (total, user) =>
      total + (Array.isArray(user.expectedAssessmentRequests) ? user.expectedAssessmentRequests.length : 0),
    0,
  );
  const durableByContext = new Map();
  for (const user of users) {
    for (const action of user.actions ?? []) {
      if (typeof action.logicalAction === 'string' && action.logicalAction.startsWith('assessment-durable-access:')) {
        mapIncrement(durableByContext, safeLabel(action.logicalAction.split(':').slice(1).join(':'), 'unknown'));
      }
    }
  }
  output.durableAssessment.byContext = sortedObject(durableByContext);
  return output;
}

function buildDatabaseAnalysis(ledger, reconciliation) {
  const summary = reconciliation.summary ?? {};
  const mappings = Array.isArray(reconciliation.userMappings) ? reconciliation.userMappings : [];
  const requestContexts = new Map();
  let preDeletionAttemptRows = 0;
  let preDeletionRequestRows = 0;
  for (const user of ledger.users ?? []) {
    preDeletionAttemptRows += Array.isArray(user.expectedAttempts) ? user.expectedAttempts.length : 0;
    preDeletionRequestRows += Array.isArray(user.expectedAssessmentRequests)
      ? user.expectedAssessmentRequests.length
      : 0;
    for (const request of user.expectedAssessmentRequests ?? []) {
      mapIncrement(requestContexts, safeLabel(request.context, 'unknown'));
    }
  }
  return {
    mappedUsers: safeInteger(summary.users),
    usersPassed: safeInteger(summary.usersPassed),
    survivingUsers: mappings.filter((mapping) => mapping.exists === true && mapping.deleted !== true).length,
    deletedUsers: mappings.filter((mapping) => mapping.deleted === true || mapping.exists === false).length,
    survivingAttemptRows: safeInteger(summary.attempts),
    preDeletionAttemptRows,
    survivingAssessmentRequestRows: safeInteger(summary.assessmentRequests),
    preDeletionAssessmentRequestRows: preDeletionRequestRows,
    preDeletionAssessmentRequestsByContext: sortedObject(requestContexts),
    practiceProgressRows: safeInteger(summary.practiceProgressRows),
    assessmentUsageRows: safeInteger(summary.assessmentUsageRows),
    anonymizedUsageRows: safeInteger(summary.anonymizedUsageRows),
    expectedUsageRows: safeInteger(ledger.expectedUsage?.total),
    expectedPaidFailures: safeInteger(ledger.expectedUsage?.paidFailures),
    catalogQuestions: safeInteger(reconciliation.catalog?.total),
    catalogByLevel: isRecord(reconciliation.catalog?.byLevel) ? reconciliation.catalog.byLevel : {},
    rateLimitNamespaces: Object.keys(reconciliation.rateLimitNamespaces ?? {}).sort(),
  };
}

function buildS3Analysis(ledger, reconciliation) {
  const fixtures = Array.isArray(ledger.run?.audioCorpus) ? ledger.run.audioCorpus : [];
  const objects = Array.isArray(ledger.s3Audit?.objects) ? ledger.s3Audit.objects : [];
  const byScope = new Map();
  const byOutcome = new Map();
  const errorCodes = new Map();
  const contentTypes = new Map();
  const extensions = new Map();
  const fixtureUses = new Map();
  for (const fixture of fixtures) {
    mapIncrement(contentTypes, safeLabel(fixture.contentType, 'unknown'));
    mapIncrement(extensions, safeLabel(String(fixture.extension ?? '').replace(/^\./, ''), 'unknown'));
  }
  for (const object of objects) {
    mapIncrement(byScope, safeLabel(object.scope, 'unknown'));
    mapIncrement(byOutcome, safeLabel(object.outcome, 'unknown'));
    if (object.errorCode) mapIncrement(errorCodes, safeLabel(object.errorCode, 'other-error'));
    if (typeof object.audioFixtureId === 'string') mapIncrement(fixtureUses, object.audioFixtureId);
  }
  const successful = objects.filter((object) => object.outcome === 'assessment-completed');
  const declaredCounts = {};
  for (const [key, value] of Object.entries(ledger.s3Audit?.counts ?? {})) {
    if (Number.isSafeInteger(value) && value >= 0) declaredCounts[safeLabel(key, 'other')] = value;
  }
  return {
    fixtures: {
      count: fixtures.length,
      contentTypes: sortedObject(contentTypes),
      extensions: sortedObject(extensions),
      sizeBytes: numericStats(fixtures.map((fixture) => fixture.sizeBytes)),
      durationSeconds: numericStats(
        fixtures.map((fixture) => fixture.durationSeconds),
        { round: false },
      ),
      objectUseCountDistribution: countDistribution([...fixtureUses.values()]),
    },
    objects: {
      total: objects.length,
      uploaded: objects.filter((object) => object.uploaded === true).length,
      readProvenBeforeSubmission: objects.filter((object) => object.readProvenBeforeSubmission === true).length,
      successfulAssessments: successful.length,
      retainedAndPlayed: successful.filter((object) => object.retainedAfterSuccess === true).length,
      allVersionsDeletedAfterOwnerRequest: successful.filter((object) => object.allVersionsAbsentFinal === true).length,
      harnessCleanupAttempted: objects.filter((object) => object.cleanupAttempted === true).length,
      absentAfterCleanup: objects.filter((object) => object.absentAfterCleanup === true).length,
      retained: objects.filter((object) => object.absentAfterCleanup !== true).length,
      withAuditError: objects.filter((object) => object.errorCode !== null && object.errorCode !== undefined).length,
      byScope: sortedObject(byScope),
      byOutcome: sortedObject(byOutcome),
      errorCodes: sortedObject(errorCodes),
      declaredCounts,
      reconciliationTotal: safeInteger(reconciliation.summary?.s3Objects),
      reconciliationSuccessful: safeInteger(reconciliation.summary?.successfulS3Objects),
    },
  };
}

function buildResilience(ledger, actionAnalysis) {
  const summary = ledger.summary ?? {};
  const codes = actionAnalysis.totals.apiCodes;
  const providerCodes = {};
  for (const code of ['PROVIDER_FAILED', 'PROVIDER_TIMEOUT']) {
    providerCodes[code] = safeInteger(codes[code]);
  }
  return {
    capacityBusy: safeInteger(summary.capacityBusy),
    capacityBusyObservedInAttempts: safeInteger(codes.CAPACITY_BUSY),
    networkErrors: safeInteger(summary.networkErrors),
    networkErrorsObservedInAttempts: actionAnalysis.totals.networkErrors,
    networkErrorKinds: actionAnalysis.totals.networkErrorKinds,
    providerFailures: safeInteger(summary.providerFailures),
    providerCodes,
    statusPolls: safeInteger(summary.statusPolls),
    retries: actionAnalysis.totals.retries,
    retryReasons: actionAnalysis.totals.retryReasons,
    potentialPaidAttempts: safeInteger(summary.potentialPaidAttempts),
    refundedPotentialPaidAttempts: safeInteger(summary.refundedPotentialPaidAttempts),
    freshAssessmentsPlanned: safeInteger(summary.freshAssessmentsPlanned),
    freshAssessmentsCompleted: safeInteger(summary.freshAssessmentsCompleted),
    httpStatusCodes: actionAnalysis.totals.statusCodes,
    latencyMs: actionAnalysis.totals.latencyMs,
  };
}

function selectedNumbers(source, keys) {
  const output = {};
  for (const key of keys) {
    if (Number.isFinite(source?.[key])) output[key] = source[key];
  }
  return output;
}

function buildBudget(ledger) {
  const run = ledger.run ?? {};
  const budget = run.budget ?? {};
  const campaign = ledger.campaignStateSummary ?? ledger.summary?.campaignState ?? {};
  const pricing = run.pricingManifest ?? {};
  const limitUsd = safeNumber(budget.limitUsd);
  const protectedExposureUsd = safeNumber(budget.protectedExposureUsd ?? campaign.protectedExposureAfterRunUsd);
  return {
    models: {
      transcription: safeLabel(run.models?.transcription ?? pricing.transcription?.model, 'unknown'),
      grading: safeLabel(run.models?.grading ?? pricing.grading?.model, 'unknown'),
    },
    run: {
      ...selectedNumbers(budget, [
        'limitUsd',
        'projectedWorstCaseUsd',
        'projectedProviderUsd',
        'whisperUsd',
        'gptUsd',
        'infrastructureReserveUsd',
        'protectedExposureUsd',
      ]),
      freshAssessmentCeiling: safeInteger(run.freshAssessmentCeiling),
      freshAssessmentsPlanned: safeInteger(run.freshAssessmentsPlanned),
      paidAttemptCeiling: safeInteger(run.paidAttemptCeiling),
      potentialPaidAttempts: safeInteger(run.potentialPaidAttempts),
      headroomUsd:
        limitUsd === null || protectedExposureUsd === null
          ? null
          : Number((limitUsd - protectedExposureUsd).toFixed(4)),
    },
    campaign: {
      status: safeLabel(campaign.status, 'unknown'),
      outcome: safeLabel(campaign.outcome, 'unknown'),
      ...selectedNumbers(campaign, [
        'priorPaidAttempts',
        'reservedPaidAttempts',
        'actualPotentialPaidAttempts',
        'cumulativeUpperBoundBeforeUsd',
        'cumulativeUpperBoundAfterUsd',
        'actualUpperBoundUsd',
        'protectedExposureBeforeRunUsd',
        'protectedExposureAfterRunUsd',
      ]),
    },
    pricing: {
      currency: safeLabel(pricing.currency, 'USD'),
      upperBoundPerPaidAttemptUsd: safeNumber(pricing.upperBoundPerPaidAttemptUsd),
      transcriptionUsdPerMinute: safeNumber(pricing.transcription?.usdPerMinute),
      gradingInputUsdPerMillionTokens: safeNumber(pricing.grading?.inputUsdPerMillionTokens),
      gradingOutputUsdPerMillionTokens: safeNumber(pricing.grading?.outputUsdPerMillionTokens),
      budgetedInputTokensPerAttempt: safeInteger(pricing.grading?.budgetedInputTokensPerAttempt),
      budgetedOutputTokensPerAttempt: safeInteger(pricing.grading?.budgetedOutputTokensPerAttempt),
    },
    interpretation: 'Conservative upper-bound accounting, not provider-billed actuals.',
  };
}

function markdownEscape(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

function compactMap(value) {
  const entries = Object.entries(value ?? {});
  return entries.length === 0 ? 'none' : entries.map(([key, count]) => `${key}: ${count}`).join(', ');
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(markdownEscape).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownEscape).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(analysis) {
  const lines = [
    '# Live Load Exhaustive Analysis',
    '',
    `- Verdict: ${analysis.verdict.analysisPassed ? 'PASS' : 'ATTENTION REQUIRED'}`,
    `- Reconciliation: PASS (${analysis.verdict.reconciliationChecks} checks)`,
    `- Users: ${analysis.population.total}`,
    `- Actions: ${analysis.actions.totals.actions}`,
    `- Generated: ${analysis.generatedAt}`,
    '',
    '## Population',
    '',
    markdownTable(
      ['Cohort', 'Users'],
      Object.entries(analysis.population.byCohort).map(([cohort, count]) => [cohort, count]),
    ),
    '',
    markdownTable(
      ['Native language', 'Users', 'Cohort split'],
      Object.entries(analysis.population.byLanguage).map(([language, count]) => [
        language,
        count,
        compactMap(analysis.population.byLanguageAndCohort[language]),
      ]),
    ),
    '',
    '## Per-user mapping completeness',
    '',
    `- Fully mapped: ${analysis.mapping.fullyMapped}/${analysis.mapping.users}`,
    `- Detailed mapping records: ${analysis.mapping.detailedMappingRecords}`,
    `- Legacy per-user reconciliation fallbacks: ${analysis.mapping.legacyUserResultFallbacks}`,
    `- Completeness distribution: ${compactMap(analysis.mapping.completenessDistribution)}`,
    `- Reconciliation checks per user: ${compactMap(analysis.mapping.reconciliationCheckCountDistribution)}`,
    '',
    '## Action inventory and transport behavior',
    '',
    markdownTable(
      [
        'Logical action',
        'Count',
        'Passed',
        'Failed',
        'Retries',
        'Network',
        'p50 ms',
        'p95 ms',
        'p99 ms',
        'Max ms',
        'Terminal status',
      ],
      Object.entries(analysis.actions.inventory).map(([name, action]) => [
        name,
        action.count,
        action.passed,
        action.failed,
        action.retries,
        action.networkErrors,
        action.latencyMs.p50 ?? 'n/a',
        action.latencyMs.p95 ?? 'n/a',
        action.latencyMs.p99 ?? 'n/a',
        action.latencyMs.max ?? 'n/a',
        compactMap(action.terminalStatuses),
      ]),
    ),
    '',
    `Overall status codes: ${compactMap(analysis.actions.totals.statusCodes)}`,
    '',
    '## Diagnostic',
    '',
    `- Completed users: ${analysis.diagnostic.completedUsers}/${analysis.diagnostic.users}`,
    `- Questions: ${analysis.diagnostic.questions}; per-user distribution: ${compactMap(analysis.diagnostic.questionsPerUser)}`,
    `- Passed / failed answers: ${analysis.diagnostic.passedAnswers} / ${analysis.diagnostic.failedAnswers}`,
    `- Final CEFR: ${compactMap(analysis.diagnostic.finalCefrLevels)}`,
    `- Scores: count ${analysis.diagnostic.scores.count}, average ${analysis.diagnostic.scores.average ?? 'n/a'}, p50 ${analysis.diagnostic.scores.p50 ?? 'n/a'}, p95 ${analysis.diagnostic.scores.p95 ?? 'n/a'}, histogram ${compactMap(analysis.diagnostic.scores.histogram)}`,
    '',
    '## English practice',
    '',
    `- Eligible users: ${analysis.englishPractice.eligibleUsers}`,
    `- Scored attempts: ${analysis.englishPractice.scoredAttempts}; per-user distribution: ${compactMap(analysis.englishPractice.scoredAttemptsPerEligibleUser)}`,
    `- Passed users / attempts: ${analysis.englishPractice.passedUsers} / ${analysis.englishPractice.passedAttempts}`,
    `- Mastered users / attempts: ${analysis.englishPractice.masteredUsers} / ${analysis.englishPractice.masteredAttempts}`,
    `- Final-failure users / attempts: ${analysis.englishPractice.finalFailureUsers} / ${analysis.englishPractice.finalFailureAttempts}`,
    `- Empty-transcript paid results: ${analysis.englishPractice.transcriptEmptyPaidResults}`,
    `- Scores: count ${analysis.englishPractice.scores.count}, average ${analysis.englishPractice.scores.average ?? 'n/a'}, p50 ${analysis.englishPractice.scores.p50 ?? 'n/a'}, p95 ${analysis.englishPractice.scores.p95 ?? 'n/a'}, histogram ${compactMap(analysis.englishPractice.scores.histogram)}`,
    '',
    '## Native-language practice',
    '',
    markdownTable(
      ['Language', 'Eligible', 'Completed', 'Understood', 'Not understood', 'Transcript empty', 'Transcript non-empty'],
      Object.entries(analysis.nativePractice.byLanguage).map(([language, native]) => [
        language,
        native.eligibleUsers,
        native.completed,
        native.understood,
        native.notUnderstood,
        native.transcriptEmpty,
        native.transcriptNonEmpty,
      ]),
    ),
    '',
    `Native durable requests: ${analysis.nativePractice.overall.durableRequests}; idempotent replays: ${analysis.nativePractice.overall.replays}`,
    '',
    '## Result-access verification',
    '',
    markdownTable(
      ['Access path', 'Expected', 'Recorded', 'Passed', 'Failed', 'Statuses'],
      Object.entries(analysis.resultAccess).map(([name, result]) => [
        name,
        result.expected ?? 'n/a',
        result.recorded,
        result.passed,
        result.failed,
        compactMap(result.terminalStatuses),
      ]),
    ),
    '',
    '## Database reconciliation totals',
    '',
    `- Mapped users: ${analysis.database.mappedUsers}; passed: ${analysis.database.usersPassed}; surviving DB users: ${analysis.database.survivingUsers}; deleted: ${analysis.database.deletedUsers}`,
    `- Attempt rows: ${analysis.database.survivingAttemptRows} surviving / ${analysis.database.preDeletionAttemptRows} before delete cascades`,
    `- Assessment request rows: ${analysis.database.survivingAssessmentRequestRows} surviving / ${analysis.database.preDeletionAssessmentRequestRows} before delete cascades (${compactMap(analysis.database.preDeletionAssessmentRequestsByContext)})`,
    `- Practice progress rows: ${analysis.database.practiceProgressRows}`,
    `- Assessment usage rows: ${analysis.database.assessmentUsageRows}; anonymized: ${analysis.database.anonymizedUsageRows}; expected paid failures: ${analysis.database.expectedPaidFailures}`,
    `- Catalog: ${analysis.database.catalogQuestions} questions (${compactMap(analysis.database.catalogByLevel)})`,
    '',
    '## S3 fixtures and object lifecycle',
    '',
    `- Fixtures: ${analysis.s3.fixtures.count}; content types: ${compactMap(analysis.s3.fixtures.contentTypes)}; extensions: ${compactMap(analysis.s3.fixtures.extensions)}`,
    `- Fixture duration seconds: p50 ${analysis.s3.fixtures.durationSeconds.p50 ?? 'n/a'}, p95 ${analysis.s3.fixtures.durationSeconds.p95 ?? 'n/a'}, max ${analysis.s3.fixtures.durationSeconds.max ?? 'n/a'}`,
    `- Objects: ${analysis.s3.objects.total}; uploaded: ${analysis.s3.objects.uploaded}; read-proven: ${analysis.s3.objects.readProvenBeforeSubmission}`,
    `- Successful assessments: ${analysis.s3.objects.successfulAssessments}; retained + playback-proven: ${analysis.s3.objects.retainedAndPlayed}; all versions deleted after owner/account request: ${analysis.s3.objects.allVersionsDeletedAfterOwnerRequest}`,
    `- Harness cleanup attempted: ${analysis.s3.objects.harnessCleanupAttempted}; absent after cleanup: ${analysis.s3.objects.absentAfterCleanup}; retained: ${analysis.s3.objects.retained}; audit errors: ${analysis.s3.objects.withAuditError}`,
    `- Outcomes: ${compactMap(analysis.s3.objects.byOutcome)}`,
    '',
    '## Backpressure, network, and provider outcomes',
    '',
    `- CAPACITY_BUSY: ledger ${analysis.resilience.capacityBusy}; transport evidence ${analysis.resilience.capacityBusyObservedInAttempts}`,
    `- Network errors: ledger ${analysis.resilience.networkErrors}; transport evidence ${analysis.resilience.networkErrorsObservedInAttempts}; kinds ${compactMap(analysis.resilience.networkErrorKinds)}`,
    `- Provider failures: ${analysis.resilience.providerFailures}; codes ${compactMap(analysis.resilience.providerCodes)}`,
    `- Retries: ${analysis.resilience.retries}; reasons ${compactMap(analysis.resilience.retryReasons)}; status polls ${analysis.resilience.statusPolls}`,
    `- Fresh assessments planned/completed: ${analysis.resilience.freshAssessmentsPlanned}/${analysis.resilience.freshAssessmentsCompleted}`,
    `- Potential/refunded paid attempts: ${analysis.resilience.potentialPaidAttempts}/${analysis.resilience.refundedPotentialPaidAttempts}`,
    `- HTTP latency ms: p50 ${analysis.resilience.latencyMs.p50 ?? 'n/a'}, p95 ${analysis.resilience.latencyMs.p95 ?? 'n/a'}, p99 ${analysis.resilience.latencyMs.p99 ?? 'n/a'}, max ${analysis.resilience.latencyMs.max ?? 'n/a'}`,
    '',
    '## Budget envelope',
    '',
    `- Models: transcription ${analysis.budget.models.transcription}; grading ${analysis.budget.models.grading}`,
    `- Limit / projected worst-case / protected exposure USD: ${analysis.budget.run.limitUsd ?? 'n/a'} / ${analysis.budget.run.projectedWorstCaseUsd ?? 'n/a'} / ${analysis.budget.run.protectedExposureUsd ?? 'n/a'}`,
    `- Paid-attempt ceiling / potential attempts: ${analysis.budget.run.paidAttemptCeiling} / ${analysis.budget.run.potentialPaidAttempts}`,
    `- Campaign upper bound before / after USD: ${analysis.budget.campaign.cumulativeUpperBoundBeforeUsd ?? 'n/a'} / ${analysis.budget.campaign.cumulativeUpperBoundAfterUsd ?? 'n/a'}`,
    `- Campaign status / outcome: ${analysis.budget.campaign.status} / ${analysis.budget.campaign.outcome}`,
    `- Interpretation: ${analysis.budget.interpretation}`,
    '',
    '## Compact failure list',
    '',
  ];
  if (analysis.failureCount === 0) {
    lines.push('- None.');
  } else {
    for (const failure of analysis.failures) {
      lines.push(
        `- ${Object.entries(failure)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ')}`,
      );
    }
    if (analysis.failuresTruncated)
      lines.push(`- Additional failures omitted: ${analysis.failureCount - analysis.failures.length}`);
  }
  lines.push('');
  return lines.join('\n');
}

function assertSecretFreeOutput(jsonText, markdownText) {
  const combined = `${jsonText}\n${markdownText}`;
  const forbiddenPatterns = [
    /audio-uploads\/(?:diagnostic|practice)\//i,
    /(?:X-Amz-Credential|X-Amz-Signature)=/i,
    /\bBearer\s+[A-Za-z0-9._-]+/i,
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /(?:\/Users\/|\/home\/|[A-Za-z]:\\)/,
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(combined))) {
    throw new Error('refusing to write analysis containing a sensitive value or local path');
  }
}

function writeExclusiveReports(directory, runId, analysis, markdown) {
  const jsonPath = path.join(directory, `analysis-${runId}.json`);
  const markdownPath = path.join(directory, `analysis-${runId}.md`);
  const jsonText = `${JSON.stringify(analysis, null, 2)}\n`;
  assertSecretFreeOutput(jsonText, markdown);
  let jsonDescriptor;
  let markdownDescriptor;
  let jsonCreated = false;
  let markdownCreated = false;
  try {
    jsonDescriptor = fs.openSync(jsonPath, 'wx', 0o600);
    jsonCreated = true;
    fs.fchmodSync(jsonDescriptor, 0o600);
    markdownDescriptor = fs.openSync(markdownPath, 'wx', 0o600);
    markdownCreated = true;
    fs.fchmodSync(markdownDescriptor, 0o600);
    fs.writeFileSync(jsonDescriptor, jsonText, 'utf8');
    fs.writeFileSync(markdownDescriptor, markdown, 'utf8');
    fs.fsyncSync(jsonDescriptor);
    fs.fsyncSync(markdownDescriptor);
    fs.closeSync(jsonDescriptor);
    jsonDescriptor = undefined;
    fs.closeSync(markdownDescriptor);
    markdownDescriptor = undefined;
    const directoryDescriptor = fs.openSync(directory, 'r');
    try {
      fs.fsyncSync(directoryDescriptor);
    } finally {
      fs.closeSync(directoryDescriptor);
    }
  } catch (error) {
    if (jsonDescriptor !== undefined) fs.closeSync(jsonDescriptor);
    if (markdownDescriptor !== undefined) fs.closeSync(markdownDescriptor);
    if (jsonCreated) {
      try {
        fs.unlinkSync(jsonPath);
      } catch {
        // The exclusive output either never existed or has already been removed.
      }
    }
    if (markdownCreated) {
      try {
        fs.unlinkSync(markdownPath);
      } catch {
        // The exclusive output either never existed or has already been removed.
      }
    }
    throw error;
  }
  return { jsonPath, markdownPath };
}

function main() {
  if (process.argv.length > 4) {
    throw new Error('usage: node scripts/analyze-1000-live.mjs [ledger.json] [reconciliation.json]');
  }
  const ledgerPath = process.argv[2] ? path.resolve(process.argv[2]) : newestLedgerPath();
  const ledgerFile = readJsonFile(ledgerPath, 'live ledger');
  const provisionalRunId = ledgerFile.value.run?.runId;
  if (typeof provisionalRunId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(provisionalRunId)) {
    throw new Error('ledger run id is missing or unsafe');
  }
  const reconciliationPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(path.dirname(ledgerPath), `reconciliation-${provisionalRunId}.json`);
  const reconciliationFile = readJsonFile(reconciliationPath, 'live reconciliation');
  const { ledger, reconciliation, runId, users } = validateSources(ledgerFile, reconciliationFile);

  const failureItems = [];
  let failureCount = 0;
  const addFailure = (failure) => {
    failureCount++;
    if (failureItems.length < MAX_FAILURE_ITEMS) failureItems.push(failure);
  };
  for (const user of users) {
    if (Array.isArray(user.failures) && user.failures.length > 0) {
      addFailure({ scope: 'user', userIndex: user.index, kind: 'ledger-failures', count: user.failures.length });
    }
  }

  const population = buildPopulation(users);
  const mapping = buildMappingAnalysis(users, reconciliation, addFailure);
  const actionEntries = collectActions(users, ledger);
  const actions = buildActionAnalysis(actionEntries, addFailure);
  const learning = buildLearningAnalysis(users);
  const nativePractice = buildNativeAnalysis(users);
  const resultAccess = buildResultAccess(users);
  if (resultAccess.durableAssessment.recorded !== resultAccess.durableAssessment.expected) {
    addFailure({
      scope: 'result-access',
      kind: 'durable-count-mismatch',
      actual: resultAccess.durableAssessment.recorded,
      expected: resultAccess.durableAssessment.expected,
    });
  }
  const database = buildDatabaseAnalysis(ledger, reconciliation);
  const s3 = buildS3Analysis(ledger, reconciliation);
  if (
    s3.objects.successfulAssessments !== s3.objects.retainedAndPlayed ||
    s3.objects.successfulAssessments !== s3.objects.allVersionsDeletedAfterOwnerRequest ||
    s3.objects.retained !== 0 ||
    s3.objects.withAuditError !== 0
  ) {
    addFailure({
      scope: 's3',
      kind: 'lifecycle-summary',
      successful: s3.objects.successfulAssessments,
      retainedAndPlayed: s3.objects.retainedAndPlayed,
      allVersionsDeletedAfterOwnerRequest: s3.objects.allVersionsDeletedAfterOwnerRequest,
      retained: s3.objects.retained,
      auditErrors: s3.objects.withAuditError,
    });
  }
  const resilience = buildResilience(ledger, actions);
  const budget = buildBudget(ledger);

  const analysis = {
    schemaVersion: 1,
    kind: 'load1000-live-analysis',
    runId,
    generatedAt: new Date().toISOString(),
    sources: {
      ledgerSha256: ledgerFile.digest,
      reconciliationSha256: reconciliationFile.digest,
    },
    verdict: {
      reconciliationPassed: true,
      reconciliationChecks: safeInteger(reconciliation.summary?.checks),
      analysisPassed: failureCount === 0,
    },
    population,
    mapping,
    actions,
    diagnostic: learning.diagnostic,
    englishPractice: learning.englishPractice,
    nativePractice,
    resultAccess,
    database,
    s3,
    resilience,
    budget,
    failureCount,
    failuresTruncated: failureCount > failureItems.length,
    failures: failureItems,
  };
  const markdown = buildMarkdown(analysis);
  const output = writeExclusiveReports(path.dirname(ledgerFile.path), runId, analysis, markdown);
  console.log(
    `${analysis.verdict.analysisPassed ? 'PASS' : 'ATTENTION'}: analyzed ${users.length} users, ${actions.totals.actions} actions, ${failureCount} compact failures`,
  );
  console.log(`JSON: ${output.jsonPath}`);
  console.log(`Markdown: ${output.markdownPath}`);
  if (!analysis.verdict.analysisPassed) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(`live analysis aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
