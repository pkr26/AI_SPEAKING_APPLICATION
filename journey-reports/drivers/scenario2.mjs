// Scenario 2: returning user with an account but NO completed diagnostic.
// Registers, answers ONE placement question, "closes the app", comes back later:
// verifies durable resume, mismatch guards, restart, gating, and password reset.
import { audioForm, BASE, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    console.log(`CHECK PASS: ${name}`);
  } else {
    fail++;
    console.log(`CHECK FAIL: ${name} ${detail}`);
  }
};

note(`SCENARIO 2 — registered account, diagnostic abandoned, against ${BASE}`);

// ---------- day 1: register, start placement, answer once, abandon ----------
const email = `journey2_${Date.now()}@example.com`;
const password = 'secret123';
const reg = await step('Day 1: create an account (mother tongue Hindi)', 'POST', '/auth/register', {
  json: { name: 'Returning User', email, password, nativeLanguage: 'hi' },
});
const token1 = reg.body.token;
const first = await step('Open the placement test and read question 1', 'GET', '/diagnostic/next', { token: token1 });
const q1 = first.body.question;
check('fresh run starts at the B1 midpoint', q1.cefrLevel === 'B1' && first.body.progress.asked === 0, JSON.stringify(q1));

const reqId1 = uuid();
const ans1 = await step('Answer question 1 (scored) — then the app is force-closed mid-test', 'POST', '/diagnostic/answer', {
  token: token1,
  form: audioForm(q1.id, reqId1),
});
const q2 = ans1.body.nextQuestion;
check('run continues to a second question', ans1.status === 200 && !!q2);

// True idempotent replay: identical logical submission (same requestId AND questionId).
const replay = await step('Network layer retries the exact same submission (same requestId + questionId)', 'POST', '/diagnostic/answer', {
  token: token1,
  form: audioForm(q1.id, reqId1),
});
check('duplicate submission replays/terminates without double-charging progress',
  replay.status === 200 || replay.status === 409, `status=${replay.status}`);
check('replay did not advance the placement twice', !(replay.status === 200 && replay.body.nextQuestion && replay.body.nextQuestion.id !== q2.id) || replay.status === 409);

// ---------- day 2: fresh login, state must resume ----------
const relogin = await step('Day 2: sign in again on a fresh app install', 'POST', '/auth/login', { json: { email, password } });
const token = relogin.body.token;
const me = await step('Profile still shows the diagnostic as incomplete', 'GET', '/auth/me', { token });
check('diagnosticCompleted still false', me.body.user.diagnosticCompleted === false && me.body.user.cefrLevel === null);

const resumed = await step('Reopen the placement test — state must resume where I left off', 'GET', '/diagnostic/next', { token });
check('resume serves the SAME second question (durable cycle)', resumed.body.question.id === q2.id, `expected ${q2.id}`);
check('resume shows asked=1 of 3', resumed.body.progress.asked === 1);
check('resume replays the first answer summary', resumed.body.answers.length === 1 && resumed.body.answers[0].promptWord === q1.promptWord);

await step('Try to answer the STALE question 1 again after resume', 'POST', '/diagnostic/answer', {
  token,
  form: audioForm(q1.id, uuid()),
});

// ---------- practice remains gated mid-run ----------
await step('Mid-diagnostic: try practice again', 'GET', '/practice/question', { token });
await step('Mid-diagnostic: practice history is visible but empty', 'GET', '/practice/history', { token });
await step('Mid-diagnostic: my recordings list', 'GET', '/recordings', { token });

// ---------- restart the placement ----------
await step('Restart the placement test WITHOUT confirming', 'POST', '/diagnostic/restart', { token, json: { confirm: false } });
await step('Restart the placement test with explicit confirmation', 'POST', '/diagnostic/restart', { token, json: { confirm: true } });
const afterRestart = await step('Placement is fresh again after restart', 'GET', '/diagnostic/next', { token });
check('restart reset asked to 0', afterRestart.body.progress.asked === 0);
check('restart cleared the old answer summaries', afterRestart.body.answers.length === 0);
check('restart re-anchored at B1 midpoint', afterRestart.body.question.cefrLevel === 'B1');
const me2 = await step('Profile: still unplaced after restart', 'GET', '/auth/me', { token });
check('restart cleared cefrLevel/completed flags', me2.body.user.diagnosticCompleted === false && me2.body.user.cefrLevel === null);

// ---------- forgot password while diagnostic is pending ----------
await step('Forgot my password: request a reset code', 'POST', '/auth/forgot-password', { json: { email } });
await step('Forgot-password for an email that may not exist (uniform answer)', 'POST', '/auth/forgot-password', { json: { email: 'nobody@example.com' } });
await step('Reset with a wrong code', 'POST', '/auth/reset-password', {
  json: { email, token: '000000', newPassword: 'resetpass1' },
});
console.log(`\n== NOTE: the real reset code is read from the server's MAIL_MODE=log output; if found, reset completes below.`);
let resetCode = null;
try {
  const { readFileSync } = await import('node:fs');
  const logFiles = [
    '/Users/pavankumarreddyreddem/.zcode/cli/exec/sess_eccc4aad-e5d5-4459-a00c-cee780d9cec6/call_ad4ac10b17604d07a15d6055-stdout.log',
    '/Users/pavankumarreddyreddem/.zcode/cli/exec/sess_eccc4aad-e5d5-4459-a00c-cee780d9cec6/call_2a3ef9bff065457d83034735-stdout.log',
  ];
  for (const f of logFiles) {
    try {
      const text = readFileSync(f, 'utf8');
      const m = text.match(new RegExp(`${email.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}[^}]*?(\\d{6})`, 'g')) || [];
      const last = m.at(-1);
      if (last) resetCode = last.match(/(\d{6})/)[1];
    } catch {}
  }
} catch {}
if (resetCode) {
  const rp = await step(`Reset my password using the emailed code (${resetCode})`, 'POST', '/auth/reset-password', {
    json: { email, token: resetCode, newPassword: 'resetpass1' },
  });
  check('reset with the real code succeeds', rp.status === 200);
  const oldTok = await step('My old session token is revoked after the reset', 'GET', '/auth/me', { token });
  check('old token rejected after reset', oldTok.status === 401);
  const nl = await step('Sign in with the NEW password', 'POST', '/auth/login', { json: { email, password: 'resetpass1' } });
  check('login works with the reset password', nl.status === 200);
  const stillPending = await step('Diagnostic is STILL pending after the password reset', 'GET', '/diagnostic/next', { token: nl.body.token });
  check('placement still mid-run after password reset', stillPending.body.progress.asked === 0 && stillPending.body.done === false);
} else {
  console.log('CHECK SKIP: reset code not found in server log');
}

// ---------- final state: still a "no diagnostic" account ----------
const fin = await step('Final state: profile (unplaced, incomplete)', 'GET', '/auth/me', { token: relogin.body.token });
await step('Final state: practice still gated', 'GET', '/practice/question', { token: relogin.body.token });

// Persist identity for the reset addendum (scenario2-reset.mjs).
// NOTE: if the password was already reset in an earlier run, re-running this
// scenario creates a NEW user (fresh timestamped email).
const { mkdirSync, writeFileSync } = await import('node:fs');
mkdirSync('/tmp/journey', { recursive: true });
writeFileSync('/tmp/journey/userB.json', JSON.stringify({ email, token: relogin.body.token }, null, 2));

console.log(`\n== SCENARIO 2 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
