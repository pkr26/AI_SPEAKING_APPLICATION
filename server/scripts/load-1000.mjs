#!/usr/bin/env node

// 1000-user mixed-action end-to-end load test against a locally running
// mock-AI, direct-upload server. Every user registers, logs in, completes the
// adaptive diagnostic, and opens practice; cohorts then diverge:
//
//   index % 10 in 0..3  full journey: help+ETag, English attempt (retry loop),
//                       progress check, native attempt, status poll, replay,
//                       progress invariance re-check, data export
//   index % 10 in 4..6  English practice only (attempt loop + progress check)
//   index % 10 in 7..8  native-language practice only (attempt + status poll)
//   index % 20 == 9     change password, verify old token revoked, re-login
//   index % 20 == 19    data export, delete account, verify token revoked
//
// Survivors then run one error-path check each (wrong password, malformed UUID,
// missing token, hostile grant content type, unknown requestId) — these must
// all fail with the expected 4xx and write nothing.
//
// Every logical action and its server-visible outcome is recorded in a ledger
// written to reports/load1000/ so scripts/verify-1000.mjs can reconcile the
// database row-for-row. Network-level failures are retried transparently —
// assessment POSTs always reuse the same requestId, register recovers through
// login, change-password/delete re-establish ground truth before retrying —
// so the ledger describes committed logical actions, not HTTP attempts.
//
// Start the server first, e.g.:
//   PORT=4100 DATABASE_URL=postgres://localhost:5432/ai_english_load1000 \
//   MOCK_AI=true S3_DIAGNOSTIC_BUCKET= S3_PRACTICE_BUCKET= LOG_LEVEL=warn \
//   DB_POOL_MAX=100 UV_THREADPOOL_SIZE=16 \
//   RATE_LIMIT_GLOBAL_MAX=50000000 RATE_LIMIT_AUTH_MAX=10000000 \
//   RATE_LIMIT_LOGIN_ACCOUNT_MAX=100000 RATE_LIMIT_PASSWORD_MAX=100000 \
//   RATE_LIMIT_REGISTER_MAX=100000 RATE_LIMIT_ASSESS_MAX=100000000 \
//   RATE_LIMIT_UPLOAD_GRANT_MAX=100000 ASSESS_DAILY_CAP=100000 \
//   ASSESS_GLOBAL_DAILY_CAP=10000000 ASSESS_IP_DAILY_CAP=10000000 \
//   AI_MAX_CONCURRENCY=100 node dist/src/index.js
//
// Then:
//   BASE_URL=http://localhost:4100 node scripts/load-1000.mjs

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const BASE_INPUT = process.env.BASE_URL || 'http://localhost:4100';
const USER_COUNT = Number(process.env.LOAD_USERS || 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 60_000);
const MAX_BARRIER_DISPATCH_SPREAD_MS = Number(process.env.MAX_BARRIER_SPREAD_MS || 5_000);
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NATIVE_LANGUAGES = ['te', 'hi', 'es', 'zh'];
const DIAGNOSTIC_ASSESSMENT_ENDPOINT = '/diagnostic/answer';
const PRACTICE_ASSESSMENT_ENDPOINT = '/practice/attempt';
const NATIVE_ASSESSMENT_ENDPOINT = '/practice/attempt/native';
const PASSWORD = 'loadTestPass123';
const NEW_PASSWORD = 'loadTestPass456';
const REPORTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'reports', 'load1000');

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
    'refusing to run the 1000-user load against a non-loopback host; set ALLOW_NON_LOOPBACK_LOAD=true only for an authorized test environment',
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

// The app advertises its version on every API request; mirror that handshake
// so the client-version gate treats this harness like a real first-party app.
const appConfig = JSON.parse(await readFile(new URL('../../app/app.json', import.meta.url), 'utf8'));
const CLIENT_VERSION = appConfig?.expo?.version;
if (typeof CLIENT_VERSION !== 'string' || CLIENT_VERSION.length === 0) {
  throw new Error('app/app.json must provide expo.version for the API compatibility handshake');
}

if (!Number.isSafeInteger(USER_COUNT) || USER_COUNT < 20 || USER_COUNT > 20_000) {
  throw new Error('LOAD_USERS must be an integer from 20 to 20000');
}
if (!Number.isSafeInteger(REQUEST_TIMEOUT_MS) || REQUEST_TIMEOUT_MS < 1_000 || REQUEST_TIMEOUT_MS > 300_000) {
  throw new Error('REQUEST_TIMEOUT_MS must be an integer from 1000 to 300000');
}

// ---------------------------------------------------------------------------
// Transport: raw http with a wide keep-alive agent so 1000 clients can truly
// overlap (fetch/undici would cap per-origin sockets far below that).
// ---------------------------------------------------------------------------
const transport = baseUrl.protocol === 'https:' ? https : http;
const agent = new transport.Agent({ keepAlive: true, maxSockets: 4096, maxFreeSockets: 1024, keepAliveMsecs: 30_000 });

const stats = {
  requests: 0,
  networkErrors: 0,
  retries: 0,
  throttled: 0, // contracted 503 + Retry-After responses honored
  serverErrors: 0, // 5xx responses retried
  byRouteStatus: new Map(), // "GET /practice/question 200" -> count
  latencyByRoute: new Map(), // "GET /practice/question" -> number[]
  latencies: [],
};

function templatePath(p) {
  return p.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
}

function recordStats(method, pathName, status, durationMs) {
  stats.requests++;
  const route = `${method} ${templatePath(pathName)}`;
  const key = `${route} ${status}`;
  stats.byRouteStatus.set(key, (stats.byRouteStatus.get(key) || 0) + 1);
  if (!stats.latencyByRoute.has(route)) stats.latencyByRoute.set(route, []);
  stats.latencyByRoute.get(route).push(durationMs);
  stats.latencies.push(durationMs);
}

function rawHttpRequest(method, pathName, { token, json, form, timeoutMs, extraHeaders }) {
  return new Promise((resolve) => {
    const started = performance.now();
    const headers = { 'X-Client-Version': CLIENT_VERSION, ...(extraHeaders || {}) };
    let body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = Buffer.from(JSON.stringify(json));
    } else if (form) {
      headers['Content-Type'] = form.contentType;
      body = form.body;
    }
    if (body) headers['Content-Length'] = body.length;
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = transport.request(
      { method, hostname: baseUrl.hostname, port: baseUrl.port, path: pathName, agent, headers },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on('data', (chunk) => {
          if (size < 4_000_000) {
            chunks.push(chunk);
            size += chunk.length;
          }
        });
        res.on('end', () => {
          resolve({
            ok: true,
            status: res.statusCode,
            headers: res.headers,
            text: Buffer.concat(chunks).toString('utf8'),
            durationMs: performance.now() - started,
          });
        });
        res.on('error', (error) => resolve({ ok: false, error, durationMs: performance.now() - started }));
      },
    );
    req.on('error', (error) => resolve({ ok: false, error, durationMs: performance.now() - started }));
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`request timeout after ${timeoutMs}ms`)));
    if (body) req.write(body);
    req.end();
  });
}

async function req(method, pathName, { token, json, form, timeoutMs = REQUEST_TIMEOUT_MS, extraHeaders } = {}) {
  const raw = await rawHttpRequest(method, pathName, { token, json, form, timeoutMs, extraHeaders });
  recordStats(method, pathName, raw.ok ? raw.status : 'NETERR', raw.durationMs);
  if (!raw.ok) {
    stats.networkErrors++;
    return { ok: false, error: raw.error };
  }
  let body;
  try {
    body = raw.text ? JSON.parse(raw.text) : null;
  } catch {
    body = { __raw: raw.text.slice(0, 500) };
  }
  return { ok: true, status: raw.status, body, headers: raw.headers };
}

// Retries cover transport failures, 5xx, and the assess semaphore's
// contracted 503 + Retry-After. Assessment POSTs reuse one requestId for the
// whole policy loop, so a retried submission is an idempotent replay
// server-side; register recovers through login; GETs are naturally safe.
async function reqRobust(method, pathName, opts = {}, maxAttempts = 12) {
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await req(method, pathName, opts);
    if (result.ok) {
      if (result.status === 503 && typeof result.body?.retryAfterSeconds === 'number') {
        stats.throttled++;
        last = result;
        // Clamp the server-supplied hint: a pathological Retry-After (e.g. a
        // daily-capacity value in hours) must not stall the load run.
        const retryAfterSeconds = Math.min(result.body.retryAfterSeconds, 60);
        if (retryAfterSeconds !== result.body.retryAfterSeconds) {
          console.warn(
            `clamping retryAfterSeconds ${result.body.retryAfterSeconds}s -> ${retryAfterSeconds}s for ${method} ${pathName}`,
          );
        }
        await wait(retryAfterSeconds * 1000 + Math.random() * 1000);
        continue;
      }
      if (result.status >= 500) {
        stats.serverErrors++;
        last = result;
        await wait(Math.min(250 * 2 ** attempt, 5000) + Math.random() * 250);
        continue;
      }
      return result;
    }
    stats.retries++;
    last = result;
    await wait(150 * attempt + Math.random() * 200);
  }
  return last;
}

const wait = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

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

function audioForm(questionId, requestId, cycleId) {
  const boundary = `----load1000${randomUUID().replace(/-/g, '')}`;
  // Valid ISO BMFF magic bytes, intentionally not playable audio; MOCK_AI
  // skips native duration inspection. Same fixture as scripts/smoke.mjs.
  const audio = Buffer.from('00000018667479704d34412000000000', 'hex');
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="answer.m4a"\r\nContent-Type: audio/mp4\r\n\r\n`,
  );
  const tail = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="questionId"\r\n\r\n${questionId}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="requestId"\r\n\r\n${requestId}\r\n` +
      (cycleId ? `--${boundary}\r\nContent-Disposition: form-data; name="cycleId"\r\n\r\n${cycleId}\r\n` : '') +
      `--${boundary}\r\nContent-Disposition: form-data; name="retainRecording"\r\n\r\nfalse\r\n` +
      `--${boundary}--\r\n`,
  );
  return { body: Buffer.concat([head, audio, tail]), contentType: `multipart/form-data; boundary=${boundary}` };
}

// ---------------------------------------------------------------------------
// Per-user ledger + failure bookkeeping. Any failed logical action lands in
// user.failures and excludes the user from later phases; the run fails if any
// failure was recorded.
// ---------------------------------------------------------------------------
const users = [];
const phaseStats = [];

function fail(user, action, detail) {
  user.failures.push(`${action}: ${detail}`.slice(0, 400));
}

function mockAssessmentValid(body) {
  return (
    body &&
    body.transcript === '(mock transcript)' &&
    typeof body.feedback === 'string' &&
    body.feedback.includes('MOCK_AI=true') &&
    Number.isInteger(body.score) &&
    body.score >= 40 &&
    body.score <= 95 &&
    body.passed === body.score >= 60
  );
}

function directGrantValid(response, assessmentEndpoint) {
  return (
    response.ok &&
    response.status === 200 &&
    response.body?.mode === 'direct' &&
    response.body.assessmentEndpoint === assessmentEndpoint
  );
}

async function concurrentPhase(name, participants, action) {
  if (participants.length === 0) {
    phaseStats.push({ name, participants: 0, maxOverlap: 0, dispatchSpreadMs: 0, durationMs: 0 });
    console.log(`skip: ${name} (no eligible participants)`);
    return;
  }
  let releaseGate = () => {};
  const gate = new Promise((resolve) => {
    releaseGate = resolve;
  });
  let active = 0;
  let maxOverlap = 0;
  const dispatchTimes = new Array(participants.length);
  const startedAt = performance.now();
  const tasks = participants.map((participant, index) =>
    (async () => {
      await gate;
      dispatchTimes[index] = performance.now();
      active++;
      maxOverlap = Math.max(maxOverlap, active);
      try {
        await action(participant);
      } catch (error) {
        fail(participant, name, `uncaught ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        active--;
      }
    })(),
  );
  releaseGate();
  await Promise.all(tasks);
  const durationMs = Math.round(performance.now() - startedAt);
  // Dispatch spread is the widest gap between any two participants' gate
  // releases, not last-minus-first: the array is filled in participant order,
  // but the spread must not silently shrink if a later participant is ever
  // released before an earlier one (mirroring concurrent-smoke.mjs).
  const spread = dispatchTimes.length > 1 ? Math.max(...dispatchTimes) - Math.min(...dispatchTimes) : 0;
  phaseStats.push({
    name,
    participants: participants.length,
    maxOverlap,
    dispatchSpreadMs: Math.round(spread),
    durationMs,
  });
  console.log(
    `ok: ${name} (${participants.length} participants, max overlap ${maxOverlap}, spread ${Math.round(spread)} ms, ${durationMs} ms)`,
  );
}

const alive = () => users.filter((u) => u.failures.length === 0 && !u.deleted);

// ---------------------------------------------------------------------------
// Journey actions
// ---------------------------------------------------------------------------
async function actionRegister(user) {
  const response = await reqRobust('POST', '/auth/register', {
    json: {
      name: `Load User ${user.index + 1}`,
      email: user.email,
      password: PASSWORD,
      nativeLanguage: user.nativeLanguage,
    },
  });
  if (response.ok && response.status === 201) {
    const { user: body, token } = response.body || {};
    if (!isUuid(body?.id) || typeof token !== 'string' || body.nativeLanguage !== user.nativeLanguage) {
      fail(user, 'register', `malformed 201 body ${JSON.stringify(response.body)?.slice(0, 200)}`);
      return;
    }
    user.id = body.id;
    user.token = token;
    user.registered = true;
    return;
  }
  // A timed-out register may still have committed: recover ground truth.
  const login = await reqRobust('POST', '/auth/login', { json: { email: user.email, password: PASSWORD } });
  if (login.ok && login.status === 200 && typeof login.body?.token === 'string') {
    user.id = login.body.user.id;
    user.token = login.body.token;
    user.registered = true;
    user.registerRecovered = true;
    return;
  }
  fail(
    user,
    'register',
    `status ${response.ok ? response.status : 'NETERR'}; recovery login ${login.ok ? login.status : 'NETERR'}`,
  );
}

async function actionLogin(user) {
  const response = await reqRobust('POST', '/auth/login', { json: { email: user.email, password: PASSWORD } });
  if (!response.ok || response.status !== 200) {
    fail(user, 'login', `expected 200, got ${response.ok ? response.status : 'NETERR'}`);
    return;
  }
  if (typeof response.body?.token !== 'string' || response.body?.user?.id !== user.id) {
    fail(user, 'login', 'malformed body or wrong user id');
    return;
  }
  user.loggedIn = true;
}

async function actionDiagnosticJourney(user) {
  const next = await reqRobust('GET', '/diagnostic/next', { token: user.token });
  if (!next.ok || next.status !== 200 || next.body?.done !== false || !questionShape(next.body?.question)) {
    fail(
      user,
      'diagnostic/next',
      `unexpected ${next.ok ? next.status : 'NETERR'} ${JSON.stringify(next.body)?.slice(0, 200)}`,
    );
    return;
  }
  let current = next.body.question;
  for (let round = 0; round < 3 && current; round++) {
    const grant = await reqRobust('POST', '/uploads/audio-url', {
      token: user.token,
      json: {
        contentType: 'audio/mp4',
        assessmentEndpoint: DIAGNOSTIC_ASSESSMENT_ENDPOINT,
      },
    });
    if (!directGrantValid(grant, DIAGNOSTIC_ASSESSMENT_ENDPOINT)) {
      fail(user, 'diagnostic grant', `expected endpoint-bound direct grant, got ${grant.ok ? grant.status : 'NETERR'}`);
      return;
    }
    const requestId = randomUUID();
    // requestId fixed before any retry: transport/5xx/503 retries all replay
    // idempotently against the same idempotency row.
    const answer = await reqRobust('POST', '/diagnostic/answer', {
      token: user.token,
      form: audioForm(current.id, requestId),
    });
    if (!answer.ok || answer.status !== 200 || !mockAssessmentValid(answer.body)) {
      fail(
        user,
        'diagnostic/answer',
        `unexpected ${answer.ok ? answer.status : 'NETERR'} ${JSON.stringify(answer.body)?.slice(0, 200)}`,
      );
      return;
    }
    user.diagnosticAnswers.push({
      questionId: current.id,
      requestId,
      score: answer.body.score,
      passed: answer.body.passed,
    });
    if (answer.body.done) {
      if (!LEVELS.includes(answer.body.level)) {
        fail(user, 'diagnostic/answer', `done without valid level ${JSON.stringify(answer.body)?.slice(0, 200)}`);
        return;
      }
      user.level = answer.body.level;
      current = null;
    } else {
      if (!questionShape(answer.body.nextQuestion)) {
        fail(user, 'diagnostic/answer', 'missing next question');
        return;
      }
      current = answer.body.nextQuestion;
    }
  }
  if (!user.level) {
    fail(user, 'diagnostic', 'not completed after 3 answers');
  }
}

async function actionPracticeQuestion(user) {
  const response = await reqRobust('GET', '/practice/question', { token: user.token });
  if (!response.ok || response.status !== 200) {
    fail(user, 'practice/question', `expected 200, got ${response.ok ? response.status : 'NETERR'}`);
    return;
  }
  const { question, kind, progress, cycleId } = response.body || {};
  if (
    !questionShape(question) ||
    question.cefrLevel !== user.level ||
    kind !== 'new' ||
    !progress ||
    progress.masteredCount !== 0 ||
    progress.learningCount !== 0 ||
    progress.totalAtLevel !== 100 ||
    !isUuid(cycleId)
  ) {
    fail(user, 'practice/question', `bad shape ${JSON.stringify(response.body)?.slice(0, 250)}`);
    return;
  }
  user.practiceQuestionId = question.id;
  user.practiceCycleId = cycleId;
}

async function actionHelp(user) {
  const pathName = `/practice/question/${user.practiceQuestionId}/help`;
  const response = await reqRobust('GET', pathName, { token: user.token });
  if (!response.ok || response.status !== 200) {
    fail(user, 'help', `expected 200, got ${response.ok ? response.status : 'NETERR'}`);
    return;
  }
  const examples = response.body?.examples;
  if (!Array.isArray(examples) || examples.length !== 3 || !examples.every((e) => e.en && e.native)) {
    fail(user, 'help', 'bad examples payload');
    return;
  }
  const etag = response.headers?.etag;
  if (typeof etag !== 'string') {
    fail(user, 'help', 'missing ETag');
    return;
  }
  const revalidate = await req('GET', pathName, {
    token: user.token,
    extraHeaders: { 'If-None-Match': etag },
  });
  if (!revalidate.ok || revalidate.status !== 304) {
    fail(user, 'help', `expected 304 on revalidation, got ${revalidate.ok ? revalidate.status : 'NETERR'}`);
    return;
  }
  user.helpOk = true;
}

async function englishAttemptOnce(user, questionId, cycleId) {
  const grant = await reqRobust('POST', '/uploads/audio-url', {
    token: user.token,
    json: {
      contentType: 'audio/mp4',
      assessmentEndpoint: PRACTICE_ASSESSMENT_ENDPOINT,
    },
  });
  if (!directGrantValid(grant, PRACTICE_ASSESSMENT_ENDPOINT)) {
    fail(user, 'english grant', `expected endpoint-bound direct grant, got ${grant.ok ? grant.status : 'NETERR'}`);
    return null;
  }
  const requestId = randomUUID();
  const response = await reqRobust('POST', '/practice/attempt', {
    token: user.token,
    form: audioForm(questionId, requestId, cycleId),
  });
  if (!response.ok || response.status !== 200 || !mockAssessmentValid(response.body)) {
    fail(
      user,
      'practice/attempt',
      `unexpected ${response.ok ? response.status : 'NETERR'} ${JSON.stringify(response.body)?.slice(0, 200)}`,
    );
    return null;
  }
  const body = response.body;
  if (body.mastered !== body.score >= 75) {
    fail(user, 'practice/attempt', 'mastered flag inconsistent with score');
    return null;
  }
  return { questionId, requestId, score: body.score, passed: body.passed, mastered: body.mastered, body };
}

async function actionEnglishJourney(user) {
  let questionId = user.practiceQuestionId;
  let cycleId = user.practiceCycleId;
  let expectedAttemptNo = 1;
  while (expectedAttemptNo <= 3) {
    const attempt = await englishAttemptOnce(user, questionId, cycleId);
    if (!attempt) return;
    if (attempt.body.attemptNo !== expectedAttemptNo) {
      fail(user, 'practice/attempt', `attemptNo ${attempt.body.attemptNo}, expected ${expectedAttemptNo}`);
      return;
    }
    user.englishAttempts.push({
      questionId,
      cycleId,
      requestId: attempt.requestId,
      score: attempt.score,
      passed: attempt.passed,
      mastered: attempt.mastered,
    });
    if (attempt.passed) {
      if (!attempt.body.next || !questionShape(attempt.body.next.question)) {
        fail(user, 'practice/attempt', 'passed without next question');
        return;
      }
      user.practiceQuestionId = attempt.body.next.question.id;
      user.practiceCycleId = attempt.body.next.cycleId;
      return;
    }
    if (expectedAttemptNo < 3) {
      if (attempt.body.attemptsLeft !== 3 - expectedAttemptNo || 'next' in attempt.body) {
        fail(user, 'practice/attempt', 'failed attempt contract violated');
        return;
      }
      expectedAttemptNo++;
      continue;
    }
    // Final failure: attemptsLeft 0 and the user still advances.
    if (attempt.body.attemptsLeft !== 0 || !attempt.body.next || !questionShape(attempt.body.next.question)) {
      fail(user, 'practice/attempt', 'final-failed contract violated');
      return;
    }
    user.practiceQuestionId = attempt.body.next.question.id;
    user.practiceCycleId = attempt.body.next.cycleId;
    return;
  }
}

function expectedEnglishProgress(user) {
  const mastered = user.englishAttempts.some((a) => a.score >= 75) ? 1 : 0;
  return { masteredCount: mastered, learningCount: user.englishAttempts.length > 0 ? 1 - mastered : 0 };
}

async function actionEnglishProgress(user) {
  const response = await reqRobust('GET', '/practice/question', { token: user.token });
  if (!response.ok || response.status !== 200) {
    fail(user, 'progress check', `expected 200, got ${response.ok ? response.status : 'NETERR'}`);
    return;
  }
  const expected = expectedEnglishProgress(user);
  const progress = response.body?.progress;
  if (
    !progress ||
    progress.masteredCount !== expected.masteredCount ||
    progress.learningCount !== expected.learningCount ||
    progress.totalAtLevel !== 100
  ) {
    fail(user, 'progress check', `expected ${JSON.stringify(expected)}, got ${JSON.stringify(progress)}`);
    return;
  }
  user.progressAfterEnglish = { masteredCount: progress.masteredCount, learningCount: progress.learningCount };
  user.practiceQuestionId = response.body.question.id;
  user.practiceCycleId = response.body.cycleId;
}

async function actionNativeJourney(user) {
  const grant = await reqRobust('POST', '/uploads/audio-url', {
    token: user.token,
    json: {
      contentType: 'audio/mp4',
      assessmentEndpoint: NATIVE_ASSESSMENT_ENDPOINT,
    },
  });
  if (!directGrantValid(grant, NATIVE_ASSESSMENT_ENDPOINT)) {
    fail(user, 'native grant', `expected endpoint-bound direct grant, got ${grant.ok ? grant.status : 'NETERR'}`);
    return;
  }
  const requestId = randomUUID();
  const questionId = user.practiceQuestionId;
  const response = await reqRobust('POST', '/practice/attempt/native', {
    token: user.token,
    form: audioForm(questionId, requestId, user.practiceCycleId),
  });
  const body = response.ok ? response.body : null;
  const nativeValid =
    body &&
    body.mode === 'native' &&
    body.nativeLanguage === user.nativeLanguage &&
    body.understood === true &&
    body.transcript === '(mock transcript)' &&
    body.translatedTranscript === '(mock English translation)' &&
    typeof body.modelAnswer === 'string' &&
    body.modelAnswer.includes('MOCK_AI=true') &&
    typeof body.feedback === 'string' &&
    body.feedback.includes('MOCK_AI=true') &&
    body.attemptNo === 1 &&
    body.attemptsLeft === 2;
  if (!response.ok || response.status !== 200 || !nativeValid) {
    fail(
      user,
      'native attempt',
      `unexpected ${response.ok ? response.status : 'NETERR'} ${JSON.stringify(body)?.slice(0, 200)}`,
    );
    return;
  }
  user.nativeAttempt = { questionId, cycleId: user.practiceCycleId, requestId, response: body };

  const status = await reqRobust('GET', `/assessments/${requestId}`, { token: user.token });
  if (
    !status.ok ||
    status.status !== 200 ||
    status.body?.status !== 'completed' ||
    status.body?.context !== 'practice-native' ||
    status.body?.questionId !== questionId
  ) {
    fail(
      user,
      'native status',
      `unexpected ${status.ok ? status.status : 'NETERR'} ${JSON.stringify(status.body)?.slice(0, 200)}`,
    );
    return;
  }
  user.nativeStatusOk = true;
}

async function actionNativeReplay(user) {
  const { questionId, cycleId, requestId, response: original } = user.nativeAttempt;
  const replay = await reqRobust('POST', '/practice/attempt/native', {
    token: user.token,
    form: audioForm(questionId, requestId, cycleId),
  });
  // The stored response round-trips through JSONB, which does not preserve
  // key order — compare structurally, not by serialization.
  if (!replay.ok || replay.status !== 200 || !isDeepStrictEqual(replay.body, original)) {
    fail(user, 'native replay', `replay mismatch ${replay.ok ? replay.status : 'NETERR'}`);
    return;
  }
  user.nativeReplayOk = true;
  // Native mode consumes a shared try but must not move English mastery.
  const after = await reqRobust('GET', '/practice/question', { token: user.token });
  const expected = user.progressAfterEnglish || { masteredCount: 0, learningCount: 0 };
  const progress = after.body?.progress;
  if (
    !after.ok ||
    after.status !== 200 ||
    !progress ||
    progress.masteredCount !== expected.masteredCount ||
    progress.learningCount !== expected.learningCount + 1
  ) {
    fail(
      user,
      'native mastery invariance',
      `expected mastered=${expected.masteredCount}, learning=${expected.learningCount + 1}; got ${JSON.stringify(progress)}`,
    );
    return;
  }
  if (
    after.body.cycleId !== cycleId ||
    after.body.attemptsUsed !== original.attemptNo ||
    after.body.attemptsLeft !== original.attemptsLeft
  ) {
    fail(user, 'native shared attempt budget', `unexpected ${JSON.stringify(after.body)?.slice(0, 250)}`);
  }
}

async function actionExport(user) {
  const response = await reqRobust('GET', '/auth/me/data?limit=100', { token: user.token });
  if (!response.ok || response.status !== 200) {
    fail(user, 'export', `expected 200, got ${response.ok ? response.status : 'NETERR'}`);
    return;
  }
  const expectedNativeAttempts = user.nativeAttempt ? 1 : 0;
  const expectedAttempts = user.diagnosticAnswers.length + user.englishAttempts.length + expectedNativeAttempts;
  const attempts = response.body?.attempts;
  if (
    response.body?.user?.id !== user.id ||
    !Array.isArray(attempts) ||
    attempts.length !== expectedAttempts ||
    response.body.nextCursor !== null ||
    response.body.user.password_hash !== undefined
  ) {
    fail(
      user,
      'export',
      `expected ${expectedAttempts} attempts, got ${Array.isArray(attempts) ? attempts.length : 'n/a'}`,
    );
    return;
  }
  if (
    attempts.filter((a) => a.context === 'diagnostic').length !== user.diagnosticAnswers.length ||
    attempts.filter((a) => a.context === 'practice').length !== user.englishAttempts.length ||
    attempts.filter((a) => a.context === 'practice-native').length !== expectedNativeAttempts ||
    (user.nativeAttempt &&
      attempts.find((a) => a.context === 'practice-native')?.nativeLanguage !== user.nativeLanguage)
  ) {
    fail(user, 'export', 'attempt contexts mismatch');
    return;
  }
  user.exportOk = true;
}

async function actionChangePassword(user) {
  const response = await req('POST', '/auth/change-password', {
    token: user.token,
    json: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD },
  });
  if (!response.ok) {
    // Ground truth first: did it commit?
    const relogin = await reqRobust('POST', '/auth/login', { json: { email: user.email, password: NEW_PASSWORD } });
    if (relogin.ok && relogin.status === 200) {
      user.token = relogin.body.token;
      user.changedPassword = true;
      user.changeRecovered = true;
      return;
    }
    fail(user, 'change-password', 'NETERR and new-password login rejected');
    return;
  }
  if (response.status !== 200 || typeof response.body?.token !== 'string') {
    fail(user, 'change-password', `expected 200, got ${response.status}`);
    return;
  }
  const newToken = response.body.token;
  const oldTokenCheck = await reqRobust('GET', '/auth/me', { token: user.token });
  if (!oldTokenCheck.ok || oldTokenCheck.status !== 401) {
    fail(user, 'change-password', `old token expected 401, got ${oldTokenCheck.ok ? oldTokenCheck.status : 'NETERR'}`);
    return;
  }
  const relogin = await reqRobust('POST', '/auth/login', { json: { email: user.email, password: NEW_PASSWORD } });
  if (!relogin.ok || relogin.status !== 200) {
    fail(user, 'change-password', 're-login with new password failed');
    return;
  }
  user.token = newToken;
  user.changedPassword = true;
}

async function actionDeleteAccount(user) {
  const response = await req('DELETE', '/auth/account', { token: user.token, json: { password: PASSWORD } });
  if (!response.ok) {
    const me = await reqRobust('GET', '/auth/me', { token: user.token });
    if (me.ok && me.status === 401) {
      user.deleted = true;
      user.deleteRecovered = true;
      return;
    }
    fail(user, 'delete', 'NETERR and account still alive');
    return;
  }
  if (response.status !== 204) {
    fail(user, 'delete', `expected 204, got ${response.status}`);
    return;
  }
  const me = await reqRobust('GET', '/auth/me', { token: user.token });
  if (!me.ok || me.status !== 401) {
    fail(user, 'delete', `post-delete token expected 401, got ${me.ok ? me.status : 'NETERR'}`);
    return;
  }
  user.deleted = true;
}

async function actionErrorCheck(user, kind) {
  switch (kind) {
    case 'wrong-password': {
      const r = await reqRobust('POST', '/auth/login', { json: { email: user.email, password: 'wrongPass999' } });
      if (!r.ok || r.status !== 401)
        fail(user, 'err wrong-password', `expected 401, got ${r.ok ? r.status : 'NETERR'}`);
      return;
    }
    case 'malformed-uuid': {
      const r = await reqRobust('GET', '/practice/question/not-a-uuid/help', { token: user.token });
      if (!r.ok || r.status !== 400)
        fail(user, 'err malformed-uuid', `expected 400, got ${r.ok ? r.status : 'NETERR'}`);
      return;
    }
    case 'no-token': {
      const r = await reqRobust('GET', '/practice/question', {});
      if (!r.ok || r.status !== 401) fail(user, 'err no-token', `expected 401, got ${r.ok ? r.status : 'NETERR'}`);
      return;
    }
    case 'hostile-grant': {
      const r = await reqRobust('POST', '/uploads/audio-url', {
        token: user.token,
        json: {
          contentType: 'application/x-evil',
          assessmentEndpoint: DIAGNOSTIC_ASSESSMENT_ENDPOINT,
        },
      });
      // Unsupported media types are rejected with 415 by design (audio-upload.ts).
      if (!r.ok || r.status !== 415) fail(user, 'err hostile-grant', `expected 415, got ${r.ok ? r.status : 'NETERR'}`);
      return;
    }
    case 'unknown-request': {
      const r = await reqRobust('GET', `/assessments/${randomUUID()}`, { token: user.token });
      if (!r.ok || r.status !== 404)
        fail(user, 'err unknown-request', `expected 404, got ${r.ok ? r.status : 'NETERR'}`);
      return;
    }
    default:
      fail(user, 'error-check', `unknown kind ${kind}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[idx]);
}

async function main() {
  const health = await req('GET', '/health');
  const ready = await req('GET', '/ready');
  if (!health.ok || health.status !== 200 || !ready.ok || ready.status !== 200) {
    throw new Error('server is not healthy/ready; aborting before load');
  }

  const runId = `${Date.now()}_${randomUUID().slice(0, 8)}`;
  for (let index = 0; index < USER_COUNT; index++) {
    users.push({
      index,
      email: `load1000_${runId}_${index + 1}@example.com`,
      nativeLanguage: NATIVE_LANGUAGES[index % NATIVE_LANGUAGES.length],
      id: null,
      token: null,
      registered: false,
      loggedIn: false,
      diagnosticAnswers: [],
      level: null,
      practiceQuestionId: null,
      englishAttempts: [],
      nativeAttempt: null,
      failures: [],
      cohort: index % 10 <= 3 ? 'full' : index % 10 <= 6 ? 'english' : index % 10 <= 8 ? 'native' : 'account',
      deleted: false,
      changedPassword: false,
    });
  }
  console.log(`run id: ${runId} — ${USER_COUNT} users against ${BASE}`);

  await concurrentPhase('register', users, actionRegister);
  const registered = users.filter((u) => u.registered);
  await concurrentPhase('login', registered, actionLogin);

  // Serial mock-AI safety probe before any concurrent assessment work.
  const probe = registered[0];
  if (probe) {
    const probeNext = await reqRobust('GET', '/diagnostic/next', { token: probe.token });
    if (probeNext.ok && probeNext.status === 200 && probeNext.body?.done === false) {
      const probeGrant = await reqRobust('POST', '/uploads/audio-url', {
        token: probe.token,
        json: {
          contentType: 'audio/mp4',
          assessmentEndpoint: DIAGNOSTIC_ASSESSMENT_ENDPOINT,
        },
      });
      if (!directGrantValid(probeGrant, DIAGNOSTIC_ASSESSMENT_ENDPOINT)) {
        throw new Error('upload grant probe failed — server is not in endpoint-bound direct-upload mock mode');
      }
      const probeRequestId = randomUUID();
      const probeAnswer = await req('POST', '/diagnostic/answer', {
        token: probe.token,
        form: audioForm(probeNext.body.question.id, probeRequestId),
      });
      if (!probeAnswer.ok || !probeAnswer.body?.feedback?.includes('MOCK_AI=true')) {
        throw new Error('MOCK_AI safety marker missing — refusing to launch concurrent load against a real provider');
      }
      probe.diagnosticAnswers.push({
        questionId: probeNext.body.question.id,
        requestId: probeRequestId,
        score: probeAnswer.body.score,
        passed: probeAnswer.body.passed,
      });
      probe.probeAnswered = true;
    }
  }

  await concurrentPhase('diagnostic journey', registered, async (user) => {
    // The probe user already answered question 1; continue from the response chain.
    await actionDiagnosticJourney(user);
  });

  const diagnosed = registered.filter((u) => u.level);
  await concurrentPhase('practice question', diagnosed, actionPracticeQuestion);

  const full = diagnosed.filter((u) => u.cohort === 'full');
  const englishOnly = diagnosed.filter((u) => u.cohort === 'english');
  const nativeOnly = diagnosed.filter((u) => u.cohort === 'native');
  const accountCohort = diagnosed.filter((u) => u.cohort === 'account');
  const englishCohort = [...full, ...englishOnly];
  const nativeCohort = [...full, ...nativeOnly];

  await concurrentPhase('help + ETag revalidation', full, actionHelp);
  await concurrentPhase('english attempt journey', englishCohort, actionEnglishJourney);
  const englishDone = englishCohort.filter((u) => u.englishAttempts.length > 0 && u.failures.length === 0);
  await concurrentPhase('english progress verification', englishDone, actionEnglishProgress);
  await concurrentPhase(
    'native attempt + status',
    nativeCohort.filter((u) => u.failures.length === 0),
    actionNativeJourney,
  );
  const nativeDone = nativeCohort.filter((u) => u.nativeStatusOk && u.failures.length === 0);
  await concurrentPhase(
    'native replay + mastery invariance',
    full.filter((u) => nativeDone.includes(u)),
    actionNativeReplay,
  );

  const exportCohort = [
    ...full.filter((u) => u.failures.length === 0),
    ...accountCohort.filter((u) => u.index % 20 === 19 && u.failures.length === 0),
  ];
  await concurrentPhase('data export', exportCohort, actionExport);

  const passwordCohort = accountCohort.filter((u) => u.index % 20 === 9 && u.failures.length === 0);
  await concurrentPhase('change password + revoke', passwordCohort, actionChangePassword);

  const deleteCohort = accountCohort.filter((u) => u.index % 20 === 19 && u.failures.length === 0);
  await concurrentPhase('delete account + revoke', deleteCohort, actionDeleteAccount);

  const ERROR_KINDS = ['wrong-password', 'malformed-uuid', 'no-token', 'hostile-grant', 'unknown-request'];
  const survivors = alive();
  await concurrentPhase('error-path checks', survivors, (user) =>
    actionErrorCheck(user, ERROR_KINDS[user.index % ERROR_KINDS.length]),
  );

  // -------------------------------------------------------------------------
  // Summary + ledger persistence
  // -------------------------------------------------------------------------
  const failedUsers = users.filter((u) => u.failures.length > 0);
  const sortedLatencies = [...stats.latencies].sort((a, b) => a - b);
  const summary = {
    runId,
    base: BASE,
    userCount: USER_COUNT,
    startedAt: new Date(Number(runId.split('_')[0])).toISOString(),
    totals: {
      httpRequests: stats.requests,
      networkErrors: stats.networkErrors,
      retries: stats.retries,
      throttled503: stats.throttled,
      retried5xx: stats.serverErrors,
      registered: users.filter((u) => u.registered).length,
      loggedIn: users.filter((u) => u.loggedIn).length,
      diagnosed: users.filter((u) => u.level).length,
      englishAttempts: users.reduce((n, u) => n + u.englishAttempts.length, 0),
      nativeAttempts: users.filter((u) => u.nativeAttempt).length,
      exportsOk: users.filter((u) => u.exportOk).length,
      changedPassword: users.filter((u) => u.changedPassword).length,
      deleted: users.filter((u) => u.deleted).length,
      failedUsers: failedUsers.length,
    },
    latencyMs: {
      p50: percentile(sortedLatencies, 50),
      p95: percentile(sortedLatencies, 95),
      p99: percentile(sortedLatencies, 99),
      max: sortedLatencies.length ? Math.round(sortedLatencies[sortedLatencies.length - 1]) : 0,
    },
    phases: phaseStats,
    byRouteStatus: Object.fromEntries([...stats.byRouteStatus.entries()].sort()),
  };

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const ledgerPath = path.join(REPORTS_DIR, `ledger-${runId}.json`);
  fs.writeFileSync(
    ledgerPath,
    JSON.stringify(
      {
        runId,
        summary,
        users: users.map((u) => ({
          index: u.index,
          email: u.email,
          nativeLanguage: u.nativeLanguage,
          id: u.id,
          registered: u.registered,
          loggedIn: u.loggedIn,
          cohort: u.cohort,
          diagnosticAnswers: u.diagnosticAnswers,
          level: u.level,
          practiceQuestionId: u.practiceQuestionId,
          practiceCycleId: u.practiceCycleId,
          englishAttempts: u.englishAttempts,
          nativeAttempt: u.nativeAttempt
            ? {
                questionId: u.nativeAttempt.questionId,
                cycleId: u.nativeAttempt.cycleId,
                requestId: u.nativeAttempt.requestId,
                attemptNo: u.nativeAttempt.response.attemptNo,
                nativeLanguage: u.nativeAttempt.response.nativeLanguage,
                understood: u.nativeAttempt.response.understood,
              }
            : null,
          changedPassword: u.changedPassword,
          deleted: u.deleted,
          failures: u.failures,
        })),
      },
      null,
      2,
    ),
  );

  console.log('\n==== 1000-user load summary ====');
  console.log(
    `http requests: ${summary.totals.httpRequests} (network errors: ${stats.networkErrors}, transport retries: ${stats.retries}, 503 throttled retries: ${stats.throttled}, 5xx retries: ${stats.serverErrors})`,
  );
  console.log(
    `registered ${summary.totals.registered} | diagnosed ${summary.totals.diagnosed} | english attempts ${summary.totals.englishAttempts} | native ${summary.totals.nativeAttempts} | exports ${summary.totals.exportsOk} | pw changed ${summary.totals.changedPassword} | deleted ${summary.totals.deleted}`,
  );
  console.log(
    `latency p50 ${summary.latencyMs.p50} ms | p95 ${summary.latencyMs.p95} ms | p99 ${summary.latencyMs.p99} ms | max ${summary.latencyMs.max} ms`,
  );
  console.log(`ledger: ${ledgerPath}`);
  if (failedUsers.length > 0) {
    console.log(`\nFAILED USERS: ${failedUsers.length}`);
    for (const u of failedUsers.slice(0, 20)) {
      console.log(`  user ${u.index + 1} (${u.email}): ${u.failures.join(' | ')}`);
    }
  }
  const barrierViolations = phaseStats.filter(
    (p) =>
      p.participants > 1 && (p.maxOverlap !== p.participants || p.dispatchSpreadMs > MAX_BARRIER_DISPATCH_SPREAD_MS),
  );
  if (barrierViolations.length > 0) {
    console.log('\nbarrier violations (overlap/spread):');
    for (const p of barrierViolations) console.log(`  ${p.name}: ${JSON.stringify(p)}`);
  }
  if (failedUsers.length > 0 || barrierViolations.length > 0) {
    // Barrier integrity is part of the run's evidence: a phase that never
    // genuinely dispatched its full participant set at once invalidates the
    // concurrency claim even when every logical action happened to succeed,
    // so the run must exit nonzero (mirroring concurrent-smoke.mjs).
    process.exitCode = 1;
    if (barrierViolations.length > 0 && failedUsers.length === 0) {
      console.log('\nfailing the run for barrier violations despite successful logical actions.');
    }
  } else {
    console.log('\nAll logical actions succeeded. Ledger ready for DB reconciliation.');
  }
}

main().catch((error) => {
  console.error(`load test aborted: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
