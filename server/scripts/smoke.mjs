// End-to-end smoke test for the AI English API (run with MOCK_AI=true).
// Usage: node scripts/smoke.mjs   (server must be running on :4000)
//
// The practice-attempts loop fires dozens of assessments, so start the dev
// server with relaxed limits, e.g.:
//   RATE_LIMIT_ASSESS_MAX=100000 ASSESS_DAILY_CAP=100000 ASSESS_GLOBAL_DAILY_CAP=100000 ASSESS_IP_DAILY_CAP=100000 npm run dev

import { randomUUID } from 'node:crypto';

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Fail-closed assertion budget: the exact number of ok() calls that run
// exactly once per successful run (everything outside the diagnostic-answer
// and practice-attempt loops, excluding the final tally check itself).
// UPDATE THIS COUNT whenever checks are intentionally added or removed.
const EXPECTED_DETERMINISTIC_ASSERTIONS = 52;

let passed = 0;
function ok(name, cond, extra = '') {
  if (!cond) {
    console.error(`FAIL: ${name} ${extra}`);
    process.exit(1);
  }
  passed++;
  console.log(`ok: ${name}`);
}

async function req(method, path, { token, json, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // fetch sets multipart boundary itself
  }
  const res = await fetch(BASE + path, { method, headers, body });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { __raw: text };
  }
  return { status: res.status, body: data, headers: res.headers };
}

function audioForm(questionId, requestId = randomUUID()) {
  const form = new FormData();
  // Valid ISO BMFF header: box size 0x18, 'ftyp' at offset 4.
  const fakeAudio = new Blob([Buffer.from('00000018667479704d34412000000000', 'hex')], { type: 'audio/mp4' });
  form.append('audio', fakeAudio, 'answer.m4a');
  form.append('questionId', questionId);
  form.append('requestId', requestId);
  return form;
}

const isUuid = (s) =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const hasKeys = (obj, keys) => keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
const questionShape = (q) =>
  q &&
  isUuid(q.id) &&
  LEVELS.includes(q.cefrLevel) &&
  typeof q.promptWord === 'string' &&
  typeof q.questionText === 'string';

// ---------- health ----------
let r = await req('GET', '/health');
ok('/health returns 200', r.status === 200 && r.body.ok === true);
r = await req('GET', '/ready');
ok('/ready returns 200', r.status === 200 && r.body.ok === true, JSON.stringify(r.body));

// ---------- auth ----------
const email = `smoke_${Date.now()}@example.com`;
const password = 'secret123';

r = await req('POST', '/auth/register', { json: { name: 'Smoke Test', email, password, nativeLanguage: 'xx' } });
ok(
  'register rejects bad nativeLanguage with 400',
  r.status === 400 && typeof r.body.error === 'string',
  JSON.stringify(r.body),
);

r = await req('POST', '/auth/register', {
  json: { name: 'Smoke Test', email, password: 'weak', nativeLanguage: 'te' },
});
ok('register rejects weak password with 400', r.status === 400, `got ${r.status}`);

r = await req('POST', '/auth/register', { json: { name: 'Smoke Test', email, password, nativeLanguage: 'te' } });
ok('register returns 201', r.status === 201, `got ${r.status} ${JSON.stringify(r.body)}`);
ok('register body has token + user', typeof r.body.token === 'string' && r.body.user);
ok(
  'user shape {id,name,email,nativeLanguage,cefrLevel,diagnosticCompleted}',
  r.body.user &&
    hasKeys(r.body.user, ['id', 'name', 'email', 'nativeLanguage', 'cefrLevel', 'diagnosticCompleted']) &&
    r.body.user.nativeLanguage === 'te' &&
    r.body.user.cefrLevel === null &&
    r.body.user.diagnosticCompleted === false,
  JSON.stringify(r.body.user),
);
const token = r.body.token;
const userId = r.body.user.id;

r = await req('POST', '/auth/register', { json: { name: 'Dup', email, password, nativeLanguage: 'te' } });
ok('duplicate email rejected with 409', r.status === 409 && typeof r.body.error === 'string', `got ${r.status}`);

r = await req('POST', '/auth/login', { json: { email, password: 'wrong-password' } });
ok('login with wrong password returns 401', r.status === 401 && r.body.error === 'Invalid email or password');

r = await req('POST', '/auth/login', { json: { email, password } });
ok('login returns token + user', r.status === 200 && typeof r.body.token === 'string' && r.body.user?.email === email);

r = await req('GET', '/auth/me', { token });
ok(
  'GET /auth/me returns user',
  r.status === 200 && r.body.user?.id === userId && r.body.user?.email === email,
  JSON.stringify(r.body),
);

r = await req('GET', '/auth/me');
ok('GET /auth/me without token returns 401', r.status === 401);

// ---------- practice before diagnostic ----------
r = await req('GET', '/practice/question', { token });
ok(
  'practice/question before diagnostic returns 403',
  r.status === 403 && r.body.error === 'Diagnostic not completed',
  JSON.stringify(r.body),
);

// ---------- diagnostic ----------
// Audio upload grant: without S3_BUCKET the API runs in local multipart mode.
r = await req('POST', '/uploads/audio-url', { token, json: { contentType: 'audio/mp4' } });
ok(
  'uploads/audio-url returns direct mode without S3_BUCKET',
  r.status === 200 && r.body.mode === 'direct',
  JSON.stringify(r.body),
);
r = await req('POST', '/uploads/audio-url', { token, json: { contentType: 'text/plain' } });
ok('uploads/audio-url rejects non-audio content type with 415', r.status === 415, JSON.stringify(r.body));

r = await req('GET', '/diagnostic/next', { token });
ok(
  'diagnostic/next done:false with question + progress',
  r.status === 200 && r.body.done === false && questionShape(r.body.question),
  JSON.stringify(r.body),
);
ok(
  'progress shape {asked:0,maxQuestions:5}',
  r.body.progress?.asked === 0 && r.body.progress?.maxQuestions === 5,
  JSON.stringify(r.body.progress),
);

let question = r.body.question;

// Anti-cheat: answering anything but the served question must fail with 409.
r = await req('POST', '/diagnostic/answer', { token, form: audioForm('00000000-0000-0000-0000-000000000000') });
ok(
  'diagnostic answer with wrong questionId returns 409',
  r.status === 409 && r.body.error === 'Question mismatch',
  JSON.stringify(r.body),
);

// Magic-byte sniffing: a text file renamed .m4a must be rejected with 415.
const textForm = new FormData();
textForm.append('audio', new Blob([Buffer.from('just some text, not audio')], { type: 'audio/mp4' }), 'answer.m4a');
textForm.append('questionId', question.id);
textForm.append('requestId', randomUUID());
r = await req('POST', '/diagnostic/answer', { token, form: textForm });
ok(
  'diagnostic answer with fake audio returns 415',
  r.status === 415 && r.body.error === 'Invalid audio file',
  JSON.stringify(r.body),
);

let diagResult = null;
let firstAnswerRequestId = null;
// Every iteration asserts exactly twice: the score-fields check, then either
// the done check (break) or the nextQuestion check.
let diagAnswers = 0;
for (let i = 1; i <= 5; i++) {
  diagAnswers++;
  const answerRequestId = randomUUID();
  if (i === 1) firstAnswerRequestId = answerRequestId;
  r = await req('POST', '/diagnostic/answer', { token, form: audioForm(question.id, answerRequestId) });
  ok(
    `diagnostic answer ${i} returns score fields`,
    r.status === 200 &&
      typeof r.body.score === 'number' &&
      typeof r.body.passed === 'boolean' &&
      typeof r.body.transcript === 'string' &&
      typeof r.body.feedback === 'string',
    JSON.stringify(r.body),
  );
  diagResult = r.body;
  if (r.body.done) {
    ok(`diagnostic done after ${i} answers with level`, LEVELS.includes(r.body.level), JSON.stringify(r.body));
    break;
  }
  ok(`diagnostic answer ${i} has nextQuestion`, questionShape(r.body.nextQuestion), JSON.stringify(r.body));
  question = r.body.nextQuestion;
}
ok('diagnostic finished within 5 answers', diagResult && diagResult.done === true && LEVELS.includes(diagResult.level));
const assignedLevel = diagResult.level;

// The app's interrupted-upload recovery reconciles through this endpoint.
r = await req('GET', `/assessments/${firstAnswerRequestId}`, { token });
ok(
  'assessment reconciliation returns the completed first answer',
  r.status === 200 && r.body.status === 'completed' && r.body.context === 'diagnostic',
  JSON.stringify(r.body),
);
r = await req('GET', `/assessments/${randomUUID()}`, { token });
ok('assessment reconciliation 404s an unknown requestId', r.status === 404, JSON.stringify(r.body));

r = await req('GET', '/diagnostic/next', { token });
ok(
  'diagnostic/next after completion returns done:true + level',
  r.status === 200 && r.body.done === true && r.body.level === assignedLevel,
  JSON.stringify(r.body),
);

r = await req('GET', '/auth/me', { token });
ok(
  'user now has cefrLevel + diagnosticCompleted',
  r.body.user?.cefrLevel === assignedLevel && r.body.user?.diagnosticCompleted === true,
  JSON.stringify(r.body.user),
);

// ---------- practice ----------
r = await req('GET', '/practice/question', { token });
ok(
  'practice/question returns question at assigned level',
  r.status === 200 && questionShape(r.body.question) && r.body.question.cefrLevel === assignedLevel,
  JSON.stringify(r.body),
);
ok(
  'practice/question returns kind + progress',
  (r.body.kind === 'new' || r.body.kind === 'revision') &&
    typeof r.body.progress?.masteredCount === 'number' &&
    typeof r.body.progress?.learningCount === 'number' &&
    typeof r.body.progress?.totalAtLevel === 'number',
  JSON.stringify(r.body),
);
ok(
  'practice/question is no-store',
  (r.headers.get('cache-control') || '').includes('no-store'),
  r.headers.get('cache-control'),
);
const practiceQ = r.body.question;

r = await req('GET', `/practice/question/${practiceQ.id}/help`, { token });
ok(
  'help returns translations',
  r.status === 200 && typeof r.body.promptWordNative === 'string' && typeof r.body.questionTextNative === 'string',
  JSON.stringify(r.body),
);
ok(
  'help has exactly 3 examples with en+native',
  Array.isArray(r.body.examples) &&
    r.body.examples.length === 3 &&
    r.body.examples.every((e) => typeof e.en === 'string' && typeof e.native === 'string'),
  JSON.stringify(r.body.examples),
);
ok(
  'help promptWord matches question',
  r.body.promptWord === practiceQ.promptWord && r.body.questionText === practiceQ.questionText,
);
ok(
  'help is privately cacheable',
  r.headers.get('cache-control') === 'private, max-age=3600',
  r.headers.get('cache-control'),
);
const helpEtag = r.headers.get('etag');
ok('help sends an ETag', typeof helpEtag === 'string' && helpEtag.length > 0);

const cachedRes = await fetch(`${BASE}/practice/question/${practiceQ.id}/help`, {
  headers: { Authorization: `Bearer ${token}`, 'If-None-Match': helpEtag },
});
ok('help with If-None-Match returns 304', cachedRes.status === 304, `got ${cachedRes.status}`);

r = await req('GET', `/practice/question/00000000-0000-0000-0000-000000000000/help`, { token });
ok('help for unknown question returns 404', r.status === 404 && typeof r.body.error === 'string');

r = await req('GET', `/practice/question/not-a-uuid/help`, { token });
ok('help with malformed UUID returns 400', r.status === 400 && typeof r.body.error === 'string', `got ${r.status}`);

r = await req('POST', '/practice/attempt', { token, form: new FormData() });
ok(
  'practice/attempt without audio returns 400',
  r.status === 400 && typeof r.body.error === 'string',
  `got ${r.status}`,
);

// Loop attempts on the same question until we observe both the pass path and
// the attemptNo=3 final-feedback path (mock scores are random 40-95).
let sawPass = false;
let sawFinal = false;
let attempts = 0;
let passIterations = 0; // 3 ok() calls each: base + mastered flag + next payload
let finalIterations = 0; // 4 ok() calls each: base + attemptNo 3 + finalFeedback + next payload
let ordinaryFailIterations = 0; // 2 ok() calls each: base + attemptsLeft
for (let i = 0; i < 300 && !(sawPass && sawFinal); i++) {
  attempts++;
  r = await req('POST', '/practice/attempt', { token, form: audioForm(practiceQ.id) });
  ok(
    `practice attempt ${attempts} responds 200 with score fields`,
    r.status === 200 &&
      typeof r.body.score === 'number' &&
      typeof r.body.attemptNo === 'number' &&
      r.body.attemptNo >= 1 &&
      r.body.attemptNo <= 3,
    JSON.stringify(r.body),
  );
  if (r.body.passed) {
    sawPass = true;
    passIterations++;
    ok('pass response has mastered flag', typeof r.body.mastered === 'boolean', JSON.stringify(r.body));
    ok('pass response has next payload', questionShape(r.body.next?.question), JSON.stringify(r.body));
  } else if (r.body.attemptsLeft === 0) {
    sawFinal = true;
    finalIterations++;
    ok('final-fail response has attemptNo 3', r.body.attemptNo === 3, JSON.stringify(r.body));
    ok(
      'final-fail response has finalFeedback with model-answer hint',
      typeof r.body.finalFeedback === 'string' &&
        r.body.finalFeedback.includes("Don't worry") &&
        r.body.finalFeedback.includes('A good answer could be:') &&
        r.body.finalFeedback.includes("Let's move on!"),
      JSON.stringify(r.body),
    );
    ok('final-fail response has next payload', questionShape(r.body.next?.question), JSON.stringify(r.body));
  } else {
    ordinaryFailIterations++;
    ok(
      `fail response attemptNo ${r.body.attemptNo} has attemptsLeft ${3 - r.body.attemptNo}`,
      r.body.attemptsLeft === 3 - r.body.attemptNo && !('next' in r.body),
      JSON.stringify(r.body),
    );
  }
}
ok(`observed a pass path (after ${attempts} attempts)`, sawPass);
ok(`observed the attemptNo=3 final-feedback path (after ${attempts} attempts)`, sawFinal);

r = await req('POST', '/practice/attempt', { token, form: audioForm(practiceQ.id) });
ok(
  'attemptNo resets to 1 after a pass or a 3rd failure',
  r.status === 200 && r.body.attemptNo === 1,
  JSON.stringify(r.body),
);

// Native-language mode: comprehension only, never writes mastery.
r = await req('POST', '/practice/attempt/native', { token, form: audioForm(practiceQ.id) });
ok(
  'native attempt returns comprehension result',
  r.status === 200 &&
    r.body.mode === 'native' &&
    typeof r.body.understood === 'boolean' &&
    typeof r.body.transcript === 'string' &&
    typeof r.body.modelAnswer === 'string' &&
    typeof r.body.feedback === 'string',
  JSON.stringify(r.body),
);

// ---------- data export ----------
r = await req('GET', '/auth/me/data', { token });
ok(
  'data export returns user + attempts, no password_hash',
  r.status === 200 &&
    r.body.user?.id === userId &&
    Array.isArray(r.body.attempts) &&
    r.body.attempts.length > 0 &&
    r.body.user.password_hash === undefined,
  JSON.stringify(r.body).slice(0, 200),
);

// ---------- change password (token revocation) ----------
const newPassword = 'newsecret456';
r = await req('POST', '/auth/change-password', { token, json: { currentPassword: 'nope1234', newPassword } });
ok('change-password with wrong current password returns 401', r.status === 401, `got ${r.status}`);

r = await req('POST', '/auth/change-password', { token, json: { currentPassword: password, newPassword } });
ok(
  'change-password returns a fresh token',
  r.status === 200 && typeof r.body.token === 'string',
  JSON.stringify(r.body),
);
const newToken = r.body.token;

r = await req('GET', '/auth/me', { token });
ok('old token is revoked after password change', r.status === 401, `got ${r.status}`);

r = await req('GET', '/auth/me', { token: newToken });
ok('new token works after password change', r.status === 200 && r.body.user?.id === userId, JSON.stringify(r.body));

r = await req('POST', '/auth/login', { json: { email, password: newPassword } });
ok('login works with the new password', r.status === 200, `got ${r.status}`);

// Logout revokes copied bearer tokens. Log back in for the deletion checks.
r = await req('POST', '/auth/logout', { token: newToken });
ok('logout returns 204', r.status === 204, `got ${r.status}`);
r = await req('GET', '/auth/me', { token: newToken });
ok('logout revokes the bearer token server-side', r.status === 401, `got ${r.status}`);
r = await req('POST', '/auth/login', { json: { email, password: newPassword } });
ok('login works after logout', r.status === 200 && typeof r.body.token === 'string', `got ${r.status}`);
const deleteToken = r.body.token;

// ---------- delete account ----------
r = await req('DELETE', '/auth/account', { token: deleteToken, json: { password: 'nope1234' } });
ok('delete account with wrong password returns 401', r.status === 401, `got ${r.status}`);

r = await req('DELETE', '/auth/account', { token: deleteToken, json: { password: newPassword } });
ok('delete account returns 204', r.status === 204, `got ${r.status}`);

r = await req('GET', '/auth/me', { token: deleteToken });
ok('token rejected after account deletion', r.status === 401, `got ${r.status}`);

// ---------- fail-closed assertion tally ----------
// If a whole section were skipped or short-circuited, `passed` would fall
// short of the expected total and this check turns the run red. The ok()
// below compares before incrementing itself, so EXPECTED_DETERMINISTIC_ASSERTIONS
// excludes this tally check.
const expectedVariableAssertions =
  2 * diagAnswers + 3 * passIterations + 4 * finalIterations + 2 * ordinaryFailIterations;
const expectedTotalAssertions = EXPECTED_DETERMINISTIC_ASSERTIONS + expectedVariableAssertions;
ok(
  'assertion tally matches expected count',
  passed === expectedTotalAssertions,
  `passed=${passed} expected=${expectedTotalAssertions} ` +
    `(deterministic=${EXPECTED_DETERMINISTIC_ASSERTIONS}, variable=${expectedVariableAssertions}: ` +
    `diagAnswers=${diagAnswers}, pass=${passIterations}, final=${finalIterations}, ordinaryFail=${ordinaryFailIterations})`,
);

console.log(
  `\nAll smoke checks passed (${passed} assertions). Assigned level: ${assignedLevel}. Practice attempts looped: ${attempts}.`,
);
