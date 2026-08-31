// Scenario 7: the forced-upgrade handshake (ClientUpgradeModal trigger) plus
// operational edge cases. Runs against a SECOND server instance started with
// MIN_CLIENT_VERSION=1.1.1 (production-shaped gate).
import { BASE, note, resetSteps, step } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};

const GATE = process.env.GATE_URL || 'http://localhost:4200';
note(`SCENARIO 7 — client-version gate against ${GATE} (MIN_CLIENT_VERSION=1.1.1)`);
const origBase = BASE; // step() uses the lib BASE; override via env-free direct fetch below

async function gate(method, path, { token, json, version, omitVersion } = {}) {
  const headers = {};
  if (!omitVersion && version !== undefined) headers['X-Client-Version'] = version;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(GATE + path, { method, headers, body: json !== undefined ? JSON.stringify(json) : undefined });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { __raw: text }; }
  const label = `${method} ${path} · ${omitVersion ? 'no header' : `X-Client-Version: ${version}`}`;
  console.log(`\n> ${label}\n< HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return { status: res.status, body };
}

// ---------- the gate itself ----------
let r = await gate('GET', '/health', { omitVersion: true });
check('health exempt (no header) → 200', r.status === 200);
r = await gate('GET', '/ready', { omitVersion: true });
check('ready exempt (no header) → 200', r.status === 200);
r = await gate('GET', '/client-config', { omitVersion: true });
console.log(`CHECK NOTE: /client-config without header → ${r.status} (config fetch happens before any version handshake on first install)`);
r = await gate('POST', '/auth/login', { json: { email: 'x@example.com', password: 'secret123' }, omitVersion: true });
check('login without header → 426', r.status === 426 && r.body.code === 'CLIENT_UPGRADE_REQUIRED', JSON.stringify(r.body));
r = await gate('POST', '/auth/login', { json: { email: 'x@example.com', password: 'secret123' }, version: '1.0.0' });
check('old client 1.0.0 → 426', r.status === 426);
r = await gate('POST', '/auth/login', { json: { email: 'x@example.com', password: 'secret123' }, version: '1.1.0' });
check('1.1.0 (below 1.1.1 floor) → 426', r.status === 426);
r = await gate('POST', '/auth/login', { json: { email: 'x@example.com', password: 'secret123' }, version: '1.1.1' });
check('exact floor 1.1.1 passes the gate (401 wrong creds proves it got past)', r.status === 401, `got ${r.status}`);
r = await gate('POST', '/auth/login', { json: { email: 'x@example.com', password: 'secret123' }, version: '1.2' });
check('newer 1.2 passes the gate', r.status === 401, `got ${r.status}`);
r = await gate('POST', '/auth/login', { json: { email: 'x@example.com', password: 'secret123' }, version: 'garbage' });
check('malformed version → 426', r.status === 426);

// ---------- a gated user journey: register + exempt privacy exits ----------
const email = `journey7_${Date.now()}@example.com`;
r = await gate('POST', '/auth/register', {
  json: { name: 'Gate Test', email, password: 'secret123', nativeLanguage: 'te' }, version: '1.1.1',
});
check('register at floor version works', r.status === 201);
const token = r.body.token;

r = await gate('GET', '/auth/me/data', { token, omitVersion: true });
check('data export exempt without header (portability during upgrade)', r.status === 200, `got ${r.status}`);
r = await gate('GET', '/recordings/export', { token, omitVersion: true });
check('recordings export exempt without header', r.status === 200, `got ${r.status}`);
r = await gate('DELETE', '/recordings', { token, omitVersion: true });
check('bulk recording delete exempt without header (privacy exit)', r.status === 204, `got ${r.status}`);
r = await gate('DELETE', '/recordings/00000000-0000-4000-8000-000000000000', { token, omitVersion: true });
check('single recording delete exempt without header (204 idempotent = route reached, gate passed)', r.status === 204, `got ${r.status}`);
r = await gate('POST', '/auth/logout', { token, omitVersion: true });
check('logout exempt without header', r.status === 204, `got ${r.status}`);
r = await gate('POST', '/auth/login', { json: { email, password: 'secret123' }, version: '1.1.1' });
const token2 = r.body.token;
r = await gate('GET', '/practice/stats', { token: token2, omitVersion: true });
check('product route without header → 426 even when authenticated', r.status === 426, `got ${r.status}`);
r = await gate('DELETE', '/auth/account', { token: token2, json: { password: 'secret123' }, omitVersion: true });
check('account deletion exempt without header (final privacy exit)', r.status === 204, `got ${r.status}`);

console.log(`\n== SCENARIO 7 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
