#!/usr/bin/env node

// Barrier-dispatched 10-user API smoke test for the complete practice journey.
// The server must be started separately in direct-upload + mock-AI mode. The
// high limits use distinct PostgreSQL rate-limit namespaces, so this scenario
// can run immediately after scripts/smoke.mjs without inheriting its counters:
//
//   MOCK_AI=true S3_BUCKET= PORT=4100 AI_MAX_CONCURRENCY=10 \
//   RATE_LIMIT_GLOBAL_MAX=100000 RATE_LIMIT_AUTH_MAX=100000 \
//   RATE_LIMIT_REGISTER_MAX=100000 RATE_LIMIT_ASSESS_MAX=100000 \
//   ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 \
//   ASSESS_IP_DAILY_CAP=100000 npm run dev
//
// In another terminal:
//   BASE_URL=http://localhost:4100 node scripts/concurrent-smoke.mjs
//
// The script deliberately uploads only a minimal magic-byte fixture. A real-AI
// server rejects it during duration inspection before any provider call. One
// serial assessment must then return the MOCK_AI marker before the script
// launches concurrent assessment waves. No OpenAI or AWS service is used.

import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { isDeepStrictEqual } from 'node:util';

const BASE_INPUT = process.env.BASE_URL || 'http://localhost:4000';
const USER_COUNT = 10;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30_000);
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NATIVE_LANGUAGES = ['te', 'hi', 'es', 'zh'];
const PASSWORD = 'concurrentPass123';
const MAX_BARRIER_DISPATCH_SPREAD_MS = 250;
const CLEANUP_LOGIN_RETRY_DELAYS_MS = [0, 500, 1_500];

let baseUrl;
try {
  baseUrl = new URL(BASE_INPUT);
} catch {
  throw new Error('BASE_URL must be a valid absolute URL');
}
if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
  throw new Error('BASE_URL must use http or https');
}
const loopbackHost =
  baseUrl.hostname === 'localhost' || baseUrl.hostname === '127.0.0.1' || baseUrl.hostname === '[::1]';
if (!loopbackHost && process.env.ALLOW_NON_LOOPBACK_LOAD !== 'true') {
  throw new Error(
    'refusing to run the 10-user load against a non-loopback host; set ALLOW_NON_LOOPBACK_LOAD=true only for an authorized test environment',
  );
}
if (!loopbackHost && baseUrl.protocol !== 'https:') {
  throw new Error('non-loopback BASE_URL targets must use https');
}
if (
  baseUrl.username ||
  baseUrl.password ||
  baseUrl.search ||
  baseUrl.hash ||
  (baseUrl.pathname !== '/' && baseUrl.pathname !== '')
) {
  throw new Error('BASE_URL must not contain credentials, a path, query parameters, or a fragment');
}
const BASE = baseUrl.origin;

if (!Number.isSafeInteger(REQUEST_TIMEOUT_MS) || REQUEST_TIMEOUT_MS < 1_000 || REQUEST_TIMEOUT_MS > 120_000) {
  throw new Error('REQUEST_TIMEOUT_MS must be an integer from 1000 to 120000');
}

let assertionCount = 0;
const phaseStats = [];
const plannedRegistrations = [];
const createdUsers = [];
let normalCleanupCompleted = false;
let receivedSignal = null;
const runAbortController = new AbortController();

function check(name, condition, extra = '') {
  if (!condition) {
    throw new Error(`${name}${extra ? `: ${extra}` : ''}`);
  }
  assertionCount++;
}

function safeJson(value) {
  try {
    return JSON.stringify(value, (key, nestedValue) => {
      if (key.toLowerCase().includes('token')) return '<redacted>';
      return nestedValue;
    }).slice(0, 1_000);
  } catch {
    return '<unserializable response>';
  }
}

function requestSignal(cleanupRequest = false) {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return cleanupRequest ? timeout : AbortSignal.any([timeout, runAbortController.signal]);
}

async function req(method, path, { token, json, form, cleanupRequest = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body,
    redirect: 'manual',
    signal: requestSignal(cleanupRequest),
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { __raw: text.slice(0, 1_000) };
  }
  return { status: response.status, body: parsed, headers: response.headers };
}

function expectResponse(name, response, expectedStatus) {
  check(
    name,
    response.status === expectedStatus,
    `expected ${expectedStatus}, got ${response.status} ${safeJson(response.body)}`,
  );
}

function audioForm(questionId, requestId = randomUUID()) {
  const form = new FormData();
  // Valid ISO BMFF magic bytes, but intentionally not playable audio. MOCK_AI
  // skips native duration inspection. Real mode rejects this before OpenAI.
  const fakeAudio = new Blob([Buffer.from('00000018667479704d34412000000000', 'hex')], { type: 'audio/mp4' });
  form.append('audio', fakeAudio, 'answer.m4a');
  form.append('questionId', questionId);
  form.append('requestId', requestId);
  return form;
}

async function requestDirectUploadGrant(user, name) {
  const grantResponse = await req('POST', '/uploads/audio-url', {
    token: user.token,
    json: { contentType: 'audio/mp4' },
  });
  expectResponse(`${name} upload grant`, grantResponse, 200);
  check(`${name} upload grant uses local direct mode`, grantResponse.body?.mode === 'direct');
}

const isUuid = (value) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const questionShape = (question) =>
  question &&
  isUuid(question.id) &&
  LEVELS.includes(question.cefrLevel) &&
  typeof question.promptWord === 'string' &&
  question.promptWord.length > 0 &&
  typeof question.questionText === 'string' &&
  question.questionText.length > 0;

const progressShape = (progress) =>
  progress &&
  Number.isInteger(progress.masteredCount) &&
  progress.masteredCount >= 0 &&
  Number.isInteger(progress.learningCount) &&
  progress.learningCount >= 0 &&
  Number.isInteger(progress.totalAtLevel) &&
  progress.totalAtLevel >= 2;

/**
 * Release every phase participant from one barrier and wait for every client
 * action, including failures, before moving on. This makes dispatch repeatable
 * and prevents a rejected Promise.all from leaving background work in flight.
 */
async function concurrentPhase(name, items, action) {
  let releaseGate = () => {};
  const gate = new Promise((resolve) => {
    releaseGate = resolve;
  });
  let activeClientParticipants = 0;
  let maxOverlappingClientParticipants = 0;
  const participantDispatchTimes = new Array(items.length);
  const startedAt = performance.now();
  const tasks = items.map((item, index) =>
    (async () => {
      await gate;
      participantDispatchTimes[index] = performance.now();
      activeClientParticipants++;
      maxOverlappingClientParticipants = Math.max(maxOverlappingClientParticipants, activeClientParticipants);
      try {
        return await action(item, index);
      } finally {
        activeClientParticipants--;
      }
    })(),
  );

  releaseGate();
  const settled = await Promise.allSettled(tasks);
  const durationMs = Math.round(performance.now() - startedAt);
  const dispatchSpreadMs =
    participantDispatchTimes.length > 1
      ? Math.max(...participantDispatchTimes) - Math.min(...participantDispatchTimes)
      : 0;
  phaseStats.push({
    name,
    participants: items.length,
    maxOverlappingClientParticipants,
    dispatchSpreadMs,
    durationMs,
  });

  const failures = settled
    .map((result, index) => ({ result, index }))
    .filter(({ result }) => result.status === 'rejected')
    .map(
      ({ result, index }) =>
        new Error(`${name} participant ${index + 1}: ${String(result.reason?.message || result.reason)}`),
    );
  if (failures.length > 0) {
    throw new AggregateError(failures, `${name} failed for ${failures.length}/${items.length} participants`);
  }
  check(
    `${name} barrier dispatch spread`,
    dispatchSpreadMs <= MAX_BARRIER_DISPATCH_SPREAD_MS,
    `expected at most ${MAX_BARRIER_DISPATCH_SPREAD_MS} ms, got ${dispatchSpreadMs.toFixed(1)} ms`,
  );
  console.log(
    `ok: ${name} (${items.length} participants, max client overlap ${maxOverlappingClientParticipants}, barrier spread ${dispatchSpreadMs.toFixed(1)} ms, ${durationMs} ms total)`,
  );
  return settled.map((result) => result.value);
}

function validateMockAssessment(name, response) {
  expectResponse(name, response, 200);
  check(`${name} transcript is mocked`, response.body?.transcript === '(mock transcript)', safeJson(response.body));
  check(
    `${name} feedback proves MOCK_AI=true`,
    typeof response.body?.feedback === 'string' && response.body.feedback.includes('MOCK_AI=true'),
    safeJson(response.body),
  );
  check(
    `${name} score is bounded`,
    Number.isInteger(response.body?.score) && response.body.score >= 40 && response.body.score <= 95,
  );
  check(
    `${name} pass threshold is enforced`,
    response.body.passed === response.body.score >= 60,
    safeJson(response.body),
  );
}

function validateNativeAssessment(name, response) {
  expectResponse(name, response, 200);
  check(
    `${name} response shape`,
    response.body?.mode === 'native' &&
      response.body.understood === true &&
      response.body.transcript === '(mock transcript)' &&
      typeof response.body.modelAnswer === 'string' &&
      response.body.modelAnswer.includes('MOCK_AI=true') &&
      typeof response.body.feedback === 'string' &&
      response.body.feedback.includes('MOCK_AI=true'),
    safeJson(response.body),
  );
}

async function submitDiagnosticAnswer(user, name) {
  const response = await req('POST', '/diagnostic/answer', {
    token: user.token,
    form: audioForm(user.currentQuestion.id),
  });
  validateMockAssessment(name, response);
  user.diagnosticAttempts++;

  if (response.body.done) {
    check(`${name} completed level is valid`, LEVELS.includes(response.body.level), safeJson(response.body));
    user.level = response.body.level;
    user.currentQuestion = null;
    return;
  }
  check(
    `${name} returns a next diagnostic question`,
    questionShape(response.body.nextQuestion),
    safeJson(response.body),
  );
  user.currentQuestion = response.body.nextQuestion;
}

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

async function deleteAccountForCleanup(token) {
  return req('DELETE', '/auth/account', {
    token,
    json: { password: PASSWORD },
    cleanupRequest: true,
  });
}

async function cleanupPlannedRegistration(registration) {
  if (registration.cleanupConfirmed) {
    return { ok: true, registration, outcome: 'already confirmed' };
  }

  const failures = [];
  if (registration.token) {
    try {
      const deleteResponse = await deleteAccountForCleanup(registration.token);
      if (deleteResponse.status === 204) {
        registration.cleanupConfirmed = true;
        return { ok: true, registration, outcome: 'deleted with recorded token' };
      }
      failures.push(`recorded-token delete returned ${deleteResponse.status}`);
    } catch (error) {
      failures.push(`recorded-token delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Registration may have committed even when its response never reached this
  // process. Bounded login retries recover a deletion token without creating a
  // second account; repeated generic 401s confirm that no account is visible.
  let everyLoginConfirmedAbsent = true;
  for (const retryDelayMs of CLEANUP_LOGIN_RETRY_DELAYS_MS) {
    if (retryDelayMs > 0) await wait(retryDelayMs);
    let loginResponse;
    try {
      loginResponse = await req('POST', '/auth/login', {
        json: { email: registration.email, password: PASSWORD },
        cleanupRequest: true,
      });
    } catch (error) {
      everyLoginConfirmedAbsent = false;
      failures.push(`cleanup login failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (loginResponse.status === 401) continue;
    everyLoginConfirmedAbsent = false;
    if (
      loginResponse.status !== 200 ||
      typeof loginResponse.body?.token !== 'string' ||
      loginResponse.body?.user?.email !== registration.email
    ) {
      failures.push(`cleanup login returned invalid ${loginResponse.status} response ${safeJson(loginResponse.body)}`);
      continue;
    }

    registration.token = loginResponse.body.token;
    try {
      const deleteResponse = await deleteAccountForCleanup(registration.token);
      if (deleteResponse.status === 204) {
        registration.cleanupConfirmed = true;
        return { ok: true, registration, outcome: 'recovered by login and deleted' };
      }
      failures.push(`fallback-token delete returned ${deleteResponse.status}`);
    } catch (error) {
      failures.push(`fallback-token delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (everyLoginConfirmedAbsent) {
    registration.cleanupConfirmed = true;
    return { ok: true, registration, outcome: 'account absent after bounded login checks' };
  }
  return { ok: false, registration, failures };
}

async function bestEffortCleanup() {
  if (normalCleanupCompleted || plannedRegistrations.length === 0) return [];
  const targets = plannedRegistrations.filter((registration) => !registration.cleanupConfirmed);
  const results = await Promise.all(targets.map(cleanupPlannedRegistration));
  const failures = results.filter((result) => !result.ok);
  for (const failure of failures) {
    console.error(
      `cleanup could not confirm removal for ${failure.registration.email}: ${failure.failures.join('; ')}`,
    );
  }
  const confirmedCount = results.length - failures.length;
  if (confirmedCount > 0) {
    console.error(`cleanup confirmed ${confirmedCount}/${results.length} remaining planned accounts`);
  }
  return failures;
}

function beginSignalShutdown(signal) {
  if (receivedSignal) return;
  receivedSignal = signal;
  console.error(`\nReceived ${signal}; aborting active smoke requests before account cleanup.`);
  runAbortController.abort(new Error(`smoke interrupted by ${signal}`));
}

process.once('SIGINT', () => beginSignalShutdown('SIGINT'));
process.once('SIGTERM', () => beginSignalShutdown('SIGTERM'));

async function main() {
  let response = await req('GET', '/health');
  expectResponse('/health is live', response, 200);
  check('/health body is healthy', response.body?.ok === true, safeJson(response.body));
  response = await req('GET', '/ready');
  expectResponse('/ready dependencies are healthy', response, 200);
  check('/ready body is healthy', response.body?.ok === true, safeJson(response.body));

  const runId = `${Date.now()}_${randomUUID().slice(0, 8)}`;
  // Persist all identities before dispatch so cleanup can recover accounts even
  // when registration commits but its response is interrupted or malformed.
  plannedRegistrations.push(
    ...Array.from({ length: USER_COUNT }, (_, index) => ({
      index,
      email: `concurrent_${runId}_${index + 1}@example.com`,
      nativeLanguage: NATIVE_LANGUAGES[index % NATIVE_LANGUAGES.length],
      id: null,
      token: null,
      cleanupConfirmed: false,
      currentQuestion: null,
      diagnosticAttempts: 0,
      level: null,
      practiceQuestion: null,
      englishResult: null,
      progressAfterEnglish: null,
      nativeRequestId: null,
      nativeQuestionId: null,
      nativeResponse: null,
    })),
  );

  await concurrentPhase('register 10 independent users', plannedRegistrations, async (registration) => {
    const registerResponse = await req('POST', '/auth/register', {
      json: {
        name: `Concurrent User ${registration.index + 1}`,
        email: registration.email,
        password: PASSWORD,
        nativeLanguage: registration.nativeLanguage,
      },
    });
    expectResponse(`register user ${registration.index + 1}`, registerResponse, 201);
    registration.id = registerResponse.body?.user?.id ?? null;
    registration.token = registerResponse.body?.token ?? null;
    check(`register user ${registration.index + 1} has UUID`, isUuid(registerResponse.body?.user?.id));
    check(`register user ${registration.index + 1} has token`, typeof registerResponse.body?.token === 'string');
    check(
      `register user ${registration.index + 1} preserves native language`,
      registerResponse.body?.user?.nativeLanguage === registration.nativeLanguage,
      safeJson(registerResponse.body),
    );
    createdUsers.push(registration);
  });

  check('all 10 registrations completed', createdUsers.length === USER_COUNT);
  check('all 10 user ids are isolated', new Set(createdUsers.map((user) => user.id)).size === USER_COUNT);
  check('all 10 bearer tokens are distinct', new Set(createdUsers.map((user) => user.token)).size === USER_COUNT);
  createdUsers.sort((left, right) => left.index - right.index);

  await concurrentPhase('load 10 initial diagnostic questions', createdUsers, async (user) => {
    const nextResponse = await req('GET', '/diagnostic/next', { token: user.token });
    expectResponse(`initial diagnostic question for user ${user.index + 1}`, nextResponse, 200);
    check(
      `initial diagnostic question shape for user ${user.index + 1}`,
      nextResponse.body?.done === false && questionShape(nextResponse.body.question),
      safeJson(nextResponse.body),
    );
    check(
      `initial diagnostic progress for user ${user.index + 1}`,
      nextResponse.body.progress?.asked === 0 && nextResponse.body.progress?.maxQuestions === 5,
      safeJson(nextResponse.body),
    );
    user.currentQuestion = nextResponse.body.question;
  });

  // Safety gate: in real-AI mode this fixture is rejected before provider
  // work, and no later assessment request is launched. In mock mode the marker
  // below proves that the remaining load is entirely local.
  await requestDirectUploadGrant(createdUsers[0], 'serial mock-AI safety probe');
  await submitDiagnosticAnswer(createdUsers[0], 'serial mock-AI safety probe');
  console.log('ok: MOCK_AI safety marker observed before concurrent assessments');

  for (let wave = 1; wave <= 5; wave++) {
    const pending = createdUsers.filter((user) => user.currentQuestion);
    if (pending.length === 0) break;
    check(
      `diagnostic wave ${wave} does not exceed five attempts per user`,
      pending.every((user) => user.diagnosticAttempts < 5),
    );
    await concurrentPhase(`diagnostic upload-grant wave ${wave}`, pending, (user) =>
      requestDirectUploadGrant(user, `diagnostic user ${user.index + 1} attempt ${user.diagnosticAttempts + 1}`),
    );
    await concurrentPhase(`diagnostic assessment wave ${wave}`, pending, (user) =>
      submitDiagnosticAnswer(user, `diagnostic user ${user.index + 1} attempt ${user.diagnosticAttempts + 1}`),
    );
  }

  check(
    'all 10 diagnostics completed',
    createdUsers.every((user) => !user.currentQuestion && LEVELS.includes(user.level)),
  );
  check(
    'every diagnostic completed within five answers',
    createdUsers.every((user) => user.diagnosticAttempts >= 2 && user.diagnosticAttempts <= 5),
  );
  check(
    'at least one diagnostic assessment phase overlapped all 10 client participant promises',
    phaseStats.some(
      (phase) =>
        phase.name.startsWith('diagnostic assessment') && phase.maxOverlappingClientParticipants === USER_COUNT,
    ),
  );

  await concurrentPhase('load 10 practice questions', createdUsers, async (user) => {
    const practiceResponse = await req('GET', '/practice/question', { token: user.token });
    expectResponse(`practice question for user ${user.index + 1}`, practiceResponse, 200);
    check(
      `practice question shape for user ${user.index + 1}`,
      questionShape(practiceResponse.body?.question) && practiceResponse.body.question.cefrLevel === user.level,
      safeJson(practiceResponse.body),
    );
    check(
      `new user practice state for user ${user.index + 1}`,
      practiceResponse.body.kind === 'new' &&
        progressShape(practiceResponse.body.progress) &&
        practiceResponse.body.progress.masteredCount === 0 &&
        practiceResponse.body.progress.learningCount === 0,
      safeJson(practiceResponse.body),
    );
    check(
      `practice response is no-store for user ${user.index + 1}`,
      (practiceResponse.headers.get('cache-control') || '').includes('no-store'),
    );
    user.practiceQuestion = practiceResponse.body.question;
  });

  await concurrentPhase('load and revalidate 10 localized help payloads', createdUsers, async (user) => {
    const path = `/practice/question/${user.practiceQuestion.id}/help`;
    const helpResponse = await req('GET', path, { token: user.token });
    expectResponse(`localized help for user ${user.index + 1}`, helpResponse, 200);
    check(
      `localized help examples for user ${user.index + 1}`,
      Array.isArray(helpResponse.body?.examples) &&
        helpResponse.body.examples.length === 3 &&
        helpResponse.body.examples.every(
          (example) =>
            typeof example.en === 'string' &&
            example.en.length > 0 &&
            typeof example.native === 'string' &&
            example.native.length > 0,
        ),
      safeJson(helpResponse.body),
    );
    const etag = helpResponse.headers.get('etag');
    check(`localized help ETag for user ${user.index + 1}`, typeof etag === 'string' && etag.length > 0);
    const cachedResponse = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${user.token}`, 'If-None-Match': etag },
      redirect: 'manual',
      signal: requestSignal(),
    });
    check(
      `localized help 304 for user ${user.index + 1}`,
      cachedResponse.status === 304,
      `got ${cachedResponse.status}`,
    );
  });

  await concurrentPhase('issue 10 English-practice upload grants', createdUsers, (user) =>
    requestDirectUploadGrant(user, `English practice user ${user.index + 1}`),
  );
  await concurrentPhase('submit 10 English practice attempts', createdUsers, async (user) => {
    const attemptResponse = await req('POST', '/practice/attempt', {
      token: user.token,
      form: audioForm(user.practiceQuestion.id),
    });
    validateMockAssessment(`English practice attempt for user ${user.index + 1}`, attemptResponse);
    check(
      `English attempt number for user ${user.index + 1}`,
      attemptResponse.body.attemptNo === 1,
      safeJson(attemptResponse.body),
    );
    check(
      `English mastery threshold for user ${user.index + 1}`,
      attemptResponse.body.mastered === attemptResponse.body.score >= 75,
      safeJson(attemptResponse.body),
    );
    if (attemptResponse.body.passed) {
      check(
        `passed English attempt advances user ${user.index + 1}`,
        questionShape(attemptResponse.body.next?.question) && progressShape(attemptResponse.body.next?.progress),
        safeJson(attemptResponse.body),
      );
      user.practiceQuestion = attemptResponse.body.next.question;
    } else {
      check(
        `failed English attempt keeps two retries for user ${user.index + 1}`,
        attemptResponse.body.attemptsLeft === 2 && !Object.prototype.hasOwnProperty.call(attemptResponse.body, 'next'),
        safeJson(attemptResponse.body),
      );
    }
    user.englishResult = attemptResponse.body;
  });

  await concurrentPhase('verify 10 English progress updates', createdUsers, async (user) => {
    const progressResponse = await req('GET', '/practice/question', { token: user.token });
    expectResponse(`English progress for user ${user.index + 1}`, progressResponse, 200);
    check(
      `English progress shape for user ${user.index + 1}`,
      progressShape(progressResponse.body?.progress),
      safeJson(progressResponse.body),
    );
    const expectedMastered = user.englishResult.mastered ? 1 : 0;
    check(
      `English progress count for user ${user.index + 1}`,
      progressResponse.body.progress.masteredCount === expectedMastered &&
        progressResponse.body.progress.learningCount === 1 - expectedMastered,
      safeJson(progressResponse.body),
    );
    user.progressAfterEnglish = { ...progressResponse.body.progress };
  });

  await concurrentPhase('issue 10 native-practice upload grants', createdUsers, (user) =>
    requestDirectUploadGrant(user, `native practice user ${user.index + 1}`),
  );
  for (const user of createdUsers) {
    user.nativeRequestId = randomUUID();
    user.nativeQuestionId = user.practiceQuestion.id;
  }
  await concurrentPhase('submit 10 native-language practice attempts', createdUsers, async (user) => {
    const nativeResponse = await req('POST', '/practice/attempt/native', {
      token: user.token,
      form: audioForm(user.nativeQuestionId, user.nativeRequestId),
    });
    validateNativeAssessment(`native practice attempt for user ${user.index + 1}`, nativeResponse);
    user.nativeResponse = nativeResponse.body;
  });

  await concurrentPhase('inspect 10 completed native request statuses', createdUsers, async (user) => {
    const statusResponse = await req('GET', `/assessments/${encodeURIComponent(user.nativeRequestId)}`, {
      token: user.token,
    });
    expectResponse(`native request status for user ${user.index + 1}`, statusResponse, 200);
    check(
      `native request status is isolated and completed for user ${user.index + 1}`,
      statusResponse.body?.status === 'completed' &&
        statusResponse.body.context === 'practice-native' &&
        statusResponse.body.questionId === user.nativeQuestionId &&
        isDeepStrictEqual(statusResponse.body.response, user.nativeResponse),
      safeJson(statusResponse.body),
    );
  });

  await concurrentPhase('replay 10 completed native requests with the same UUIDs', createdUsers, async (user) => {
    const replayResponse = await req('POST', '/practice/attempt/native', {
      token: user.token,
      form: audioForm(user.nativeQuestionId, user.nativeRequestId),
    });
    validateNativeAssessment(`native same-request replay for user ${user.index + 1}`, replayResponse);
    check(
      `native same-request replay is contract-equivalent for user ${user.index + 1}`,
      isDeepStrictEqual(replayResponse.body, user.nativeResponse),
      `original ${safeJson(user.nativeResponse)}, replay ${safeJson(replayResponse.body)}`,
    );
  });

  await concurrentPhase('prove native mode did not change 10 mastery states', createdUsers, async (user) => {
    const afterNativeResponse = await req('GET', '/practice/question', { token: user.token });
    expectResponse(`post-native progress for user ${user.index + 1}`, afterNativeResponse, 200);
    check(
      `native mode preserves progress for user ${user.index + 1}`,
      isDeepStrictEqual(afterNativeResponse.body?.progress, user.progressAfterEnglish),
      `before ${safeJson(user.progressAfterEnglish)}, after ${safeJson(afterNativeResponse.body?.progress)}`,
    );
  });

  await concurrentPhase('verify 10 isolated data exports', createdUsers, async (user) => {
    const exportResponse = await req('GET', '/auth/me/data?limit=100', { token: user.token });
    expectResponse(`data export for user ${user.index + 1}`, exportResponse, 200);
    check(
      `data export identity for user ${user.index + 1}`,
      exportResponse.body?.user?.id === user.id,
      safeJson(exportResponse.body),
    );
    check(
      `native mode writes no attempt for user ${user.index + 1}`,
      Array.isArray(exportResponse.body?.attempts) &&
        exportResponse.body.attempts.length === user.diagnosticAttempts + 1,
      safeJson(exportResponse.body),
    );
    check(
      `attempt contexts are isolated for user ${user.index + 1}`,
      exportResponse.body.attempts.filter((attempt) => attempt.context === 'diagnostic').length ===
        user.diagnosticAttempts &&
        exportResponse.body.attempts.filter((attempt) => attempt.context === 'practice').length === 1,
      safeJson(exportResponse.body),
    );
    check(
      `data export omits password hash for user ${user.index + 1}`,
      exportResponse.body.user.password_hash === undefined,
    );
  });

  await concurrentPhase('delete 10 users in one client barrier phase', createdUsers, async (user) => {
    const deleteResponse = await req('DELETE', '/auth/account', {
      token: user.token,
      json: { password: PASSWORD },
    });
    expectResponse(`delete user ${user.index + 1}`, deleteResponse, 204);
  });

  await concurrentPhase('verify 10 deleted tokens are revoked', createdUsers, async (user) => {
    const meResponse = await req('GET', '/auth/me', { token: user.token });
    expectResponse(`deleted token for user ${user.index + 1}`, meResponse, 401);
    // Do not mark cleanup complete on the DELETE response alone: this follow-up
    // proves the account/session is actually gone, and leaves fallback cleanup
    // enabled if that invariant ever regresses.
    user.cleanupConfirmed = true;
  });
  normalCleanupCompleted = true;

  const tenUserPhases = phaseStats.filter((phase) => phase.participants === USER_COUNT);
  check('multiple barrier phases dispatched exactly 10 client participants', tenUserPhases.length >= 8);
  check(
    'every 10-user phase overlapped all 10 client participant promises',
    tenUserPhases.every((phase) => phase.maxOverlappingClientParticipants === USER_COUNT),
  );
  check(
    'every 10-user phase met the barrier dispatch-spread bound',
    tenUserPhases.every((phase) => phase.dispatchSpreadMs <= MAX_BARRIER_DISPATCH_SPREAD_MS),
  );

  console.log(
    `\nAll 10-user client-barrier smoke checks passed (${assertionCount} assertions across ${phaseStats.length} phases).`,
  );
  console.log('Phase timing summary:');
  for (const phase of phaseStats) {
    console.log(
      `  ${phase.name}: ${phase.participants} participants, max client overlap ${phase.maxOverlappingClientParticipants}, barrier spread ${phase.dispatchSpreadMs.toFixed(1)} ms, ${phase.durationMs} ms total`,
    );
  }
}

let runError = null;
try {
  await main();
} catch (error) {
  runError = error;
}

if (runError || receivedSignal) {
  if (receivedSignal) {
    console.error(`\n10-user smoke interrupted by ${receivedSignal}.`);
  } else {
    console.error(`\n10-user smoke failed: ${runError instanceof Error ? runError.message : String(runError)}`);
  }
  if (runError instanceof AggregateError && !receivedSignal) {
    for (const nested of runError.errors) console.error(`  - ${nested.message}`);
  }
  try {
    const cleanupFailures = await bestEffortCleanup();
    if (cleanupFailures.length > 0) {
      console.error(`cleanup left ${cleanupFailures.length} planned account(s) unconfirmed`);
    }
  } catch (cleanupError) {
    console.error(
      `cleanup failed unexpectedly: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
    );
  }
  process.exitCode = receivedSignal === 'SIGINT' ? 130 : receivedSignal === 'SIGTERM' ? 143 : 1;
}
