// Scenario 12: lockouts and abuse guards under DEFAULT limits.
// Runs against a dedicated strict-defaults server (:4300). Users are created
// on the relaxed server (:4100) so only the abuse traffic burns strict budgets
// (tokens are valid across instances — same DB, same JWT secret).
import { audioForm, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};
const STRICT = process.env.STRICT_URL || 'http://localhost:4300';
const RELAXED = process.env.BASE_URL || 'http://localhost:4100';

const strict = async (method, path, { token, json } = {}) => {
  const headers = { 'X-Client-Version': '1.1.1' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(STRICT + path, { method, headers, body: json !== undefined ? JSON.stringify(json) : undefined });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { __raw: text }; }
  return { status: res.status, body, retryAfter: res.headers.get('retry-after'), remaining: res.headers.get('x-ratelimit-remaining') };
};
const relaxed = (method, path, opts = {}) => stepWrapper(method, path, opts);
async function stepWrapper(method, path, { token, json, form } = {}) {
  const headers = { 'X-Client-Version': '1.1.1' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
  else if (form) body = form;
  const res = await fetch(RELAXED + path, { method, headers, body });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { __raw: text }; }
  return { status: res.status, body: data };
}

note(`SCENARIO 12 — abuse/lockout matrix: strict=${STRICT} (defaults), users created on ${RELAXED}`);

// ---------- users on the relaxed instance ----------
const A = await relaxed('POST', '/auth/register', { json: { name: 'Lockout A', email: `j12a_${Date.now()}@example.com`, password: 'secret123', nativeLanguage: 'te' } });
const B = await relaxed('POST', '/auth/register', { json: { name: 'Lockout B', email: `j12b_${Date.now()}@example.com`, password: 'secret123', nativeLanguage: 'hi' } });
const C = await relaxed('POST', '/auth/register', { json: { name: 'Lockout C', email: `j12c_${Date.now()}@example.com`, password: 'secret123', nativeLanguage: 'zh' } });
const D = await relaxed('POST', '/auth/register', { json: { name: 'Lockout D', email: `j12d_${Date.now()}@example.com`, password: 'secret123', nativeLanguage: 'es' } });
check('users created on relaxed instance', [A, B, C, D].every((u) => u.status === 201));

// ---------- login credential budget (wrong password ×N, then the OWNER) ----------
let first429 = null;
for (let i = 1; i <= 12; i++) {
  const r = await strict('POST', '/auth/login', { json: { email: A.body.user.email, password: 'wrong-password-1' } });
  if (r.status === 429 && !first429) { first429 = { i, retryAfter: r.retryAfter }; console.log(`\n> wrong-password attempt ${i} → 429 (Retry-After ${r.retryAfter}s)`); }
  if (r.status === 429) break; // preserve the strict server's shared per-IP auth budget for later checks
}
check('wrong-password spray eventually gets 429', !!first429, 'never throttled');
if (first429) console.log(`== credential budget saturated at attempt ${first429.i}, Retry-After=${first429.retryAfter}s`);
const ownerLogin = await strict('POST', '/auth/login', { json: { email: A.body.user.email, password: 'secret123' } });
check('the REAL owner can still sign in while the budget is saturated', ownerLogin.status === 200, `got ${ownerLogin.status}`);

// ---------- forgot-password per-email silent budget ----------
let sawHeader = null;
for (let i = 1; i <= 7; i++) {
  const r = await strict('POST', '/auth/forgot-password', { json: { email: B.body.user.email } });
  if (i === 1 || i === 7) console.log(`\n> forgot-password #${i}: HTTP ${r.status} remaining=${r.remaining}`);
  if (i === 7) sawHeader = r;
}
check('forgot-password stays a uniform 204 even when over budget', sawHeader?.status === 204);
console.log('== (silent skip verified by mailer-log absence in the strict server log — see report)');

// ---------- diagnostic restart budget (shares the password budget: 10/user) ----------
const tokC = C.body.token;
let restart429 = null;
for (let i = 1; i <= 13; i++) {
  const r = await strict('POST', '/diagnostic/restart', { token: tokC, json: { confirm: true } });
  if (r.status === 429 && !restart429) { restart429 = { i, retryAfter: r.retryAfter }; console.log(`\n> restart #${i} → 429 (Retry-After ${r.retryAfter}s)`); }
  if (r.status === 429) break;
}
check('diagnostic restart spam throttled', !!restart429, 'never throttled');

// ---------- recordings delete budgets ----------
let bulk429 = null;
for (let i = 1; i <= 12; i++) {
  const r = await strict('DELETE', '/recordings', { token: tokC });
  if (r.status === 429 && !bulk429) { bulk429 = { i, retryAfter: r.retryAfter }; console.log(`\n> bulk recordings delete #${i} → 429 (Retry-After ${r.retryAfter}s)`); }
}
check('recordings bulk-delete spam throttled', !!bulk429, 'never throttled');
let del429 = null;
for (let i = 1; i <= 12; i++) {
  const r = await strict('DELETE', `/recordings/${uuid()}`, { token: tokC });
  if (r.status === 429 && !del429) { del429 = { i, retryAfter: r.retryAfter }; console.log(`\n> single recording delete #${i} → 429 (Retry-After ${r.retryAfter}s)`); }
}
check('single recording delete spam throttled', !!del429, 'never throttled');

// ---------- playback grant budget (default 60/hour) ----------
const tokD = D.body.token;
let pb429 = null;
for (let i = 1; i <= 65; i++) {
  const r = await strict('POST', `/recordings/${uuid()}/playback-url`, { token: tokD });
  if (r.status === 429 && !pb429) { pb429 = { i, retryAfter: r.retryAfter }; console.log(`\n> playback grant #${i} → 429 (Retry-After ${r.retryAfter}s)`); }
}
check('playback-grant spam throttled', !!pb429, 'never throttled');

// ---------- assessment budget: the practice 429 card ----------
// D completes placement on the RELAXED server, then spams attempts on STRICT
// until the hourly assess limiter answers 429 with Retry-After.
let dq = (await relaxed('GET', '/diagnostic/next', { token: tokD })).body;
for (let i = 1; i <= 3; i++) {
  const a = await relaxed('POST', '/diagnostic/answer', { token: tokD, form: audioForm(dq.question.id, uuid()) });
  if (a.body.done) break;
  dq = { question: a.body.nextQuestion };
}
await relaxed('POST', '/diagnostic/acknowledge', { token: tokD });
let assess429 = null;
for (let i = 1; i <= 30; i++) {
  const pq = await strict('GET', '/practice/question', { token: tokD });
  const form = audioForm(pq.body.question.id, uuid(), pq.body.cycleId);
  const headers = { 'X-Client-Version': '1.1.1', Authorization: `Bearer ${tokD}` };
  const res = await fetch(STRICT + '/practice/attempt', { method: 'POST', headers, body: form });
  if (res.status === 429 && !assess429) {
    const retryAfter = res.headers.get('retry-after');
    const text = await res.text();
    assess429 = { i, retryAfter, body: text.slice(0, 140) };
    console.log(`\n> assess attempt #${i} → 429 Retry-After=${retryAfter}s ${text.slice(0, 120)}`);
  } else await res.text();
  if (assess429) break;
}
check('assessment spam throttled with Retry-After (the app 429 card)', !!assess429, 'never throttled');
if (assess429) {
  const stillReads = await strict('GET', '/practice/question', { token: tokD });
  check('reading the next question still works while POSTs are throttled', stillReads.status === 200, `got ${stillReads.status}`);
}

console.log(`\n== SCENARIO 12 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
