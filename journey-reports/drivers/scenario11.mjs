// Scenario 11: negative / malformed / edge-case API scenarios — the things a
// confused client, a proxy, or a curious user can produce.
import { audioForm, BASE, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};
const raw = async (method, path, { headers = {}, body } = {}) => {
  const res = await fetch(BASE + path, { method, headers: { 'X-Client-Version': '1.1.1', ...headers }, body });
  const text = await res.text();
  console.log(`\n> ${method} ${path}\n< HTTP ${res.status} ${text.slice(0, 160)}`);
  return { status: res.status, text, headers: res.headers };
};

note(`SCENARIO 11 — negative/edge matrix against ${BASE}`);

// ---------- malformed bodies ----------
let r = await raw('POST', '/auth/login', { headers: { 'Content-Type': 'application/json' }, body: '{not json' });
check('malformed JSON → 400', r.status === 400, `got ${r.status}`);
const bigJson = '{"pad":"' + 'x'.repeat(1_600_000) + '"}';
r = await raw('POST', '/auth/login', { headers: { 'Content-Type': 'application/json' }, body: bigJson });
check('oversized JSON (>1 MiB) → 413', r.status === 413, `got ${r.status}`);

// ---------- query-parameter edges ----------
const email = `j11_${Date.now()}@example.com`;
const reg = await step('Register the edge-case learner', 'POST', '/auth/register', {
  json: { name: 'Edges', email, password: 'secret123', nativeLanguage: 'te' },
});
const token = reg.body.token;
let q = (await step('Placement question', 'GET', '/diagnostic/next', { token })).body;
for (let i = 1; i <= 3; i++) {
  const a = await step(`Placement answer ${i}`, 'POST', '/diagnostic/answer', { token, form: audioForm(q.question.id, uuid()) });
  if (a.body.done) break;
  q = { question: a.body.nextQuestion };
}
await step('Acknowledge placement', 'POST', '/diagnostic/acknowledge', { token });
r = await raw('POST', '/practice/skip', { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' }, body: 'questionId=1' });
check('text body on a JSON route → 400', r.status === 400, `got ${r.status}`);
for (const bad of ['limit=0', 'limit=-1', 'limit=abc', 'limit=51']) {
  r = await raw('GET', `/practice/history?${bad}`, { headers: { Authorization: `Bearer ${token}` } });
  check(`history ${bad} → 400`, r.status === 400, `got ${r.status}`);
}
r = await raw('GET', '/practice/stats?timeZone=Not/AZone', { headers: { Authorization: `Bearer ${token}` } });
check('stats with an invalid IANA timeZone → 400', r.status === 400, `got ${r.status}`);
r = await raw('GET', '/practice/stats?timeZone=UTC', { headers: { Authorization: `Bearer ${token}` } });
check('stats with a valid timeZone → 200', r.status === 200, `got ${r.status}`);

// ---------- routing / operational edges ----------
r = await raw('POST', '/health');
check('POST /health → 404 (GET-only)', r.status === 404, `got ${r.status}`);
r = await raw('GET', '/practice/history/', { headers: { Authorization: `Bearer ${token}` } });
check('trailing slash on history → observed (strict routing documented)', r.status === 404 || r.status === 200, `got ${r.status}`);
r = await raw('GET', '/recordings/', { headers: { Authorization: `Bearer ${token}` } });
check('trailing slash on /recordings/ → 200 (documented exemption)', r.status === 200, `got ${r.status}`);
r = await raw('GET', '/metrics');
check('/metrics disabled without METRICS_ENABLED → 404', r.status === 404, `got ${r.status}`);
const health = await fetch(BASE + '/health');
const helmet = ['x-content-type-options', 'x-frame-options', 'strict-transport-security', 'content-security-policy']
  .filter((h) => health.headers.get(h));
console.log(`\n== security headers present on /health: ${helmet.join(', ')}`);
check('helmet security headers present', helmet.length >= 2);
const pre = await fetch(BASE + '/auth/login', { method: 'OPTIONS', headers: { Origin: 'https://example.com', 'Access-Control-Request-Method': 'POST' } });
console.log(`== CORS preflight: HTTP ${pre.status}, allow-origin=${pre.headers.get('access-control-allow-origin')}`);
check('CORS preflight answered', pre.status === 204 || pre.status === 200, `got ${pre.status}`);

// ---------- stale pre-skip cycle ----------
let pq = await step('Assignment before skip', 'GET', '/practice/question', { token });
const staleQ = pq.body.question, staleCycle = pq.body.cycleId;
await step('Skip it', 'POST', '/practice/skip', { token, json: { questionId: staleQ.id, cycleId: staleCycle } });
const staleAtt = await step('Attempt with the PRE-SKIP cycleId after skipping', 'POST', '/practice/attempt', {
  token, form: audioForm(staleQ.id, uuid(), staleCycle),
});
check('stale pre-skip cycle → 409 PRACTICE_CYCLE_CLOSED', staleAtt.status === 409 && staleAtt.body.code === 'PRACTICE_CYCLE_CLOSED', JSON.stringify(staleAtt.body));

// ---------- practice field leakage into diagnostic ----------
const diagLeak = await step('Send a practice cycleId to the DIAGNOSTIC endpoint', 'POST', '/diagnostic/answer', {
  token, form: audioForm(uuid(), uuid(), uuid()),
});
check('diagnostic rejects the leaked-practice-shape submission (already complete)', diagLeak.status === 400 || diagLeak.status === 409, `got ${diagLeak.status}`);

// ---------- foreign reconciliation (owner-only) ----------
const other = await step('Second user for the ownership check', 'POST', '/auth/register', {
  json: { name: 'Other', email: `j11b_${Date.now()}@example.com`, password: 'secret123', nativeLanguage: 'hi' },
});
const pq2 = await step('User 1 grabs a fresh assignment and submits once', 'GET', '/practice/question', { token });
const oneReq = uuid();
await step('User 1 submits an attempt (requestId captured)', 'POST', '/practice/attempt', {
  token, form: audioForm(pq2.body.question.id, oneReq, pq2.body.cycleId),
});
const foreign = await step('User 2 polls reconciliation for USER 1 requestId', 'GET', `/assessments/${oneReq}`, { token: other.body.token });
check('reconciliation is owner-only (404 for a foreign requestId)', foreign.status === 404, `got ${foreign.status}`);
const own = await step('User 1 polls their own requestId', 'GET', `/assessments/${oneReq}`, { token });
check('owner reconciliation finds it', own.status === 200 && own.body.status === 'completed');

// ---------- concurrent double-submit (double-tap Send) ----------
let race200 = 0, race409 = 0, raceOther = 0;
for (let round = 1; round <= 3; round++) {
  const cq = (await step(`Race round ${round}: fetch assignment`, 'GET', '/practice/question', { token })).body;
  const mk = () => audioForm(cq.question.id, uuid(), cq.cycleId);
  const [a, b] = await Promise.all([
    fetch(BASE + '/practice/attempt', { method: 'POST', headers: { 'X-Client-Version': '1.1.1', Authorization: `Bearer ${token}` }, body: mk() }),
    fetch(BASE + '/practice/attempt', { method: 'POST', headers: { 'X-Client-Version': '1.1.1', Authorization: `Bearer ${token}` }, body: mk() }),
  ]);
  const sa = a.status, sb = b.status;
  console.log(`\n> concurrent double-submit round ${round}: ${sa} / ${sb}`);
  for (const s of [sa, sb]) (s === 200 ? race200++ : s === 409 ? race409++ : raceOther++);
}
console.log(`\n== double-submit races: 200×${race200}, 409×${race409}, other×${raceOther}`);
check('no 5xx under a concurrent double-submit', raceOther === 0, `other statuses observed`);

// ---------- two devices, one account ----------
const l2 = await step('Sign in on a second device', 'POST', '/auth/login', { json: { email, password: 'secret123' } });
const d1 = await step('Device A reads the assignment', 'GET', '/practice/question', { token });
const d2 = await step('Device B reads the assignment', 'GET', '/practice/question', { token: l2.body.token });
check('both devices see the SAME durable cycle', d1.body.cycleId === d2.body.cycleId && d1.body.question.id === d2.body.question.id);

// ---------- full export walk (the documented two-cursor protocol) ----------
let pages = 0, cursor = null, cycleCursor = null, attemptsDone = false, cyclesDone = false;
do {
  const params = new URLSearchParams({ limit: '2', attemptsDone: String(attemptsDone), practiceCyclesDone: String(cyclesDone) });
  if (cursor && !attemptsDone) params.set('cursor', cursor);
  if (cycleCursor && !cyclesDone) params.set('practiceCycleCursor', cycleCursor);
  const p = await step(`Export walk page ${pages + 1}`, 'GET', `/auth/me/data?${params}`, { token });
  pages++;
  if (p.body.nextCursor !== null && p.body.nextCursor !== undefined) cursor = p.body.nextCursor;
  if (p.body.nextPracticeCycleCursor !== null && p.body.nextPracticeCycleCursor !== undefined) cycleCursor = p.body.nextPracticeCycleCursor;
  attemptsDone = p.body.attemptsDone === true;
  cyclesDone = p.body.practiceCyclesDone === true;
  if (pages > 30) break;
} while (!(attemptsDone && cyclesDone));
check('export walk terminates via the two-cursor done-flag protocol', attemptsDone && cyclesDone, `pages=${pages} attemptsDone=${attemptsDone} cyclesDone=${cyclesDone}`);
r = await raw('GET', '/auth/me/data?attemptsDone=banana', { headers: { Authorization: `Bearer ${token}` } });
check('invalid attemptsDone flag → 400', r.status === 400, `got ${r.status}`);

console.log(`\n== SCENARIO 11 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
