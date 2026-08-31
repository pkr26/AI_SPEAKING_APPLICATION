// Scenario 13: live re-verification of the two fixes from the journey findings.
// 1) login-throttle 429 now carries the CONSTANT window retryAfterSeconds +
//    Retry-After header (and the real owner still signs in).
// 2) per-IP register budget refunds pure validation 400s (shared-NAT guard)
//    while a 409 probe still counts.
// Run against a strict-defaults server (see README recipe, RATE_LIMIT_AUTH_MAX
// relaxed only if this IP's window is already spent).
import { note, resetSteps, step } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};
const STRICT = process.env.STRICT_URL || 'http://localhost:4300';

const strict = async (method, path, { token, json } = {}) => {
  const headers = { 'X-Client-Version': '1.1.1' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(STRICT + path, { method, headers, body: json !== undefined ? JSON.stringify(json) : undefined });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { __raw: text }; }
  return { status: res.status, body, retryAfter: res.headers.get('retry-after') };
};

note(`SCENARIO 13 — fix re-verification against ${STRICT} (defaults)`);

// ---------- fix 1: constant-window login throttle hint ----------
const email = `j13_${Date.now()}@example.com`;
const created = await strict('POST', '/auth/register', {
  json: { name: 'Fix Check', email, password: 'secret123', nativeLanguage: 'te' },
});
check('fixture user created', created.status === 201, JSON.stringify(created.body).slice(0, 120));

let throttled = null;
for (let i = 1; i <= 12; i++) {
  const r = await strict('POST', '/auth/login', { json: { email, password: 'wrong-password-1' } });
  if (r.status === 429) { throttled = r; console.log(`\n> wrong-password #${i} → 429`); break; }
}
check('login throttle trips at the documented budget', !!throttled);
if (throttled) {
  console.log(`< body: ${JSON.stringify(throttled.body)}`);
  console.log(`< retry-after header: ${throttled.retryAfter}`);
  check('429 body carries the constant window extra', throttled.body.retryAfterSeconds === 900, JSON.stringify(throttled.body));
  check('Retry-After header mirrors it (constant, not remaining)', throttled.retryAfter === '900', `got ${throttled.retryAfter}`);
  const owner = await strict('POST', '/auth/login', { json: { email, password: 'secret123' } });
  check('the real owner still signs in while saturated', owner.status === 200, `got ${owner.status}`);
}

// ---------- fix 2: validation-400 refunds on the per-IP register budget ----------
note('burning 12 pure validation 400s (default budget is 10 per window)');
let saw400 = 0;
for (let i = 1; i <= 12; i++) {
  const r = await strict('POST', '/auth/register', {
    json: { name: 'Form Bug', email: `j13bad_${Date.now()}_${i}@example.com`, password: 'short', nativeLanguage: 'te' },
  });
  if (r.status === 400) saw400++;
}
check('12 validation 400s observed', saw400 === 12, `got ${saw400}`);
const valid = await strict('POST', '/auth/register', {
  json: { name: 'NAT Neighbor', email: `j13ok_${Date.now()}@example.com`, password: 'secret123', nativeLanguage: 'te' },
});
check('a VALID registration from the same network still succeeds after 12 form-error 400s', valid.status === 201, `got ${valid.status} ${JSON.stringify(valid.body).slice(0, 140)}`);

// 409 probes must still consume the budget: 10 duplicates + 1 more → 429.
const dupEmail = valid.body.user.email;
let dup429 = null;
for (let i = 1; i <= 12; i++) {
  const r = await strict('POST', '/auth/register', {
    json: { name: 'Probe', email: dupEmail, password: 'secret123', nativeLanguage: 'te' },
  });
  if (r.status === 429) { dup429 = r; console.log(`\n> duplicate-email probe #${i} → 429 (enumeration still bounded)`); break; }
}
check('EMAIL_TAKEN probes still saturate the network budget', !!dup429);

console.log(`\n== SCENARIO 13 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
