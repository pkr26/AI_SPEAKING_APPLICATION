// Scenario 4: every SETTINGS / PROFILE field and its exact boundaries.
// Covers the fields behind: signup form, login form, Settings name editor,
// App-language radios, Learning-language radios, change-password form,
// forgot/reset forms, and export paging.
import { audioForm, BASE, note, resetSteps, step } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};

note(`SCENARIO 4 — field/boundary matrix against ${BASE}`);

// ---------- registration-time uiLanguage (guest language picker at signup) ----------
const email = `journey4_${Date.now()}@example.com`;
const reg = await step('Register with uiLanguage=te (app sends the guest picker value)', 'POST', '/auth/register', {
  json: { name: 'Field Matrix', email, password: 'secret123', nativeLanguage: 'hi', uiLanguage: 'te' },
});
check('register persists the signup-time ui language', reg.body.user?.uiLanguage === 'te');
const token = reg.body.token;

// ---------- name field boundaries ----------
const nameCases = [
  ['empty string', '', 400],
  ['whitespace only', '   ', 400],
  ['single character', 'A', 200],
  ['exactly 100 chars', 'X'.repeat(100), 200],
  ['101 chars', 'X'.repeat(101), 400],
  ['line separator control char', 'bad\u2028name', 400],
  ['Telugu script name', 'పవన్ కుమార్', 200],
  ['emoji name', '🙂📚', 200],
];
for (const [label, name, expected] of nameCases) {
  const r = await step(`PATCH name: ${label}`, 'PATCH', '/auth/me', { token, json: { name } });
  check(`name "${label}" → ${expected}`, r.status === expected, `got ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
}

// ---------- PATCH no-op / unknown-field behavior ----------
await step('PATCH with an empty body (no fields)', 'PATCH', '/auth/me', { token, json: {} });
await step('PATCH with an unknown field (should be ignored, not stored)', 'PATCH', '/auth/me', { token, json: { role: 'admin' } });

// ---------- email normalization ----------
const mixedEmail = `Mixed.Case.${Date.now()}@EXAMPLE.COM`;
const reg2 = await step('Register with MIXED-CASE email', 'POST', '/auth/register', {
  json: { name: 'Case Test', email: mixedEmail, password: 'secret123', nativeLanguage: 'te' },
});
check('email stored lowercase', reg2.body.user?.email === mixedEmail.toLowerCase(), reg2.body.user?.email);
await step('Login with the UPPERCASE form of the same email', 'POST', '/auth/login', {
  json: { email: mixedEmail.toUpperCase(), password: 'secret123' },
});

// ---------- password policy boundaries (server side) ----------
const pwCases = [
  ['7 chars with number', 'abc1234', 400],
  ['exactly 8 chars', 'abcd1234', 201],
  ['no letter', '12345678', 400],
  ['no number', 'abcdefgh', 400],
  ['72 ASCII bytes (bcrypt ceiling)', 'a'.repeat(64) + '12345678', 201],
  ['73 ASCII bytes', 'a'.repeat(65) + '12345678', 400],
];
for (const [label, password, expected] of pwCases) {
  const r = await step(`Register password: ${label}`, 'POST', '/auth/register', {
    json: { name: 'PW Test', email: `pw_${Date.now()}_${password.length}@example.com`, password, nativeLanguage: 'te' },
  });
  check(`password "${label}" → ${expected}`, r.status === expected, `got ${r.status}`);
}

// ---------- language radio grids ----------
for (const lang of ['te', 'hi', 'es', 'zh']) {
  const r = await step(`Learning language radio → ${lang}`, 'PATCH', '/auth/me', { token, json: { nativeLanguage: lang } });
  check(`nativeLanguage ${lang} accepted+persisted`, r.status === 200 && r.body.user.nativeLanguage === lang);
}
await step('Learning language radio → invalid "en"', 'PATCH', '/auth/me', { token, json: { nativeLanguage: 'en' } });
for (const lang of ['en', 'te', 'hi', 'es', 'zh']) {
  const r = await step(`App language radio → ${lang}`, 'PATCH', '/auth/me', { token, json: { uiLanguage: lang } });
  check(`uiLanguage ${lang} accepted+persisted`, r.status === 200 && r.body.user.uiLanguage === lang);
}
await step('App language radio → uppercase "TE" (enum is case-sensitive)', 'PATCH', '/auth/me', { token, json: { uiLanguage: 'TE' } });

// ---------- change-password form rules ----------
await step('Change password: new password equals current', 'POST', '/auth/change-password', {
  token, json: { currentPassword: 'secret123', newPassword: 'secret123' },
});
await step('Change password: weak new password', 'POST', '/auth/change-password', {
  token, json: { currentPassword: 'secret123', newPassword: 'short1' },
});
await step('Change password: missing current field', 'POST', '/auth/change-password', {
  token, json: { newPassword: 'different123' },
});
const cp = await step('Change password: valid distinct password', 'POST', '/auth/change-password', {
  token, json: { currentPassword: 'secret123', newPassword: 'different123' },
});
check('valid change succeeds and returns a fresh token', cp.status === 200 && typeof cp.body.token === 'string');
const token2 = cp.body.token;

// ---------- forgot/reset form rules ----------
await step('Forgot-password with a malformed email', 'POST', '/auth/forgot-password', { json: { email: 'not-an-email' } });
await step('Reset-password with a weak new password', 'POST', '/auth/reset-password', {
  json: { email, token: 'deadbeefdeadbeefdeadbeefdeadbeef', newPassword: 'short1' },
});

// ---------- export paging (Settings → Export my data) ----------
await step('Export with an over-max limit (server max is 500)', 'GET', '/auth/me/data?limit=501', { token: token2 });
await step('Export with limit=500 exactly', 'GET', '/auth/me/data?limit=500', { token: token2 });
await step('Export with an invalid cursor', 'GET', '/auth/me/data?cursor=not-a-uuid', { token: token2 });
const page1 = await step('Export page 1 (limit 2)', 'GET', '/auth/me/data?limit=2', { token: token2 });
check('export page 1 returns rows + cursor', Array.isArray(page1.body.attempts) && page1.body.attempts.length === 2 && typeof page1.body.nextCursor === 'string' || page1.body.nextCursor === null, JSON.stringify(page1.body).slice(0,150));
if (page1.body.nextCursor) {
  await step('Export page 2 via cursor', 'GET', `/auth/me/data?limit=2&cursor=${page1.body.nextCursor}`, { token: token2 });
}

console.log(`\n== SCENARIO 4 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
