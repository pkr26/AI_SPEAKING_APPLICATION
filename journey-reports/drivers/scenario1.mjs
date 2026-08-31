// Scenario 1: first-time user — install → register → diagnostic placement.
import { mkdirSync, writeFileSync } from 'node:fs';
import { audioForm, BASE, note, resetSteps, step, textForm, uuid } from './lib.mjs';

resetSteps();
note(`SCENARIO 1 — first-time user against ${BASE} (fresh install, no account)`);

// ---------- 1. App startup / discovery ----------
await step('App cold start asks the server for public client config (no auth)', 'GET', '/client-config');
await step('App connectivity probe', 'GET', '/health');
await step('Unknown route is a clean 404', 'GET', '/nope');

// ---------- 2. Registration validation ----------
const email = `journey1_${Date.now()}@example.com`;
const password = 'secret123';
await step('Register with a missing password field', 'POST', '/auth/register', {
  json: { name: 'First Time', email, nativeLanguage: 'te' },
});
await step('Register with a malformed email', 'POST', '/auth/register', {
  json: { name: 'First Time', email: 'not-an-email', password, nativeLanguage: 'te' },
});
await step('Register with a weak password (no number)', 'POST', '/auth/register', {
  json: { name: 'First Time', email, password: 'weakpass', nativeLanguage: 'te' },
});
await step('Register with an unsupported mother tongue', 'POST', '/auth/register', {
  json: { name: 'First Time', email, password, nativeLanguage: 'xx' },
});
const reg = await step('Register with valid details (name, email, password, mother tongue Telugu)', 'POST', '/auth/register', {
  json: { name: 'First Time', email, password, nativeLanguage: 'te' },
});
const token = reg.body.token;
const userId = reg.body.user.id;
await step('Register again with the same email', 'POST', '/auth/register', {
  json: { name: 'Duplicate', email, password, nativeLanguage: 'te' },
});

// ---------- 3. Login ----------
await step('Login with the wrong password', 'POST', '/auth/login', { json: { email, password: 'wrong-password1' } });
await step('Login for a nonexistent account', 'POST', '/auth/login', { json: { email: 'ghost@example.com', password } });
await step('Login with correct credentials', 'POST', '/auth/login', { json: { email, password } });

// ---------- 4. Session state ----------
await step('Fetch my profile after sign-up (drives the post-login router decision)', 'GET', '/auth/me', { token });
await step('Fetch my profile without a token', 'GET', '/auth/me');
await step('Fetch my profile with a garbage token', 'GET', '/auth/me', {
  headers: { Authorization: 'Bearer not-a-jwt' },
});

// ---------- 5. Everything practice is locked before the placement test ----------
await step('Try to jump straight into practice before the diagnostic', 'GET', '/practice/question', { token });
await step('Try to skip a practice question before the diagnostic', 'POST', '/practice/skip', {
  token,
  json: { questionId: uuid(), cycleId: uuid() },
});
await step('Try practice stats before the diagnostic', 'GET', '/practice/stats', { token });
await step('Try practice history before the diagnostic', 'GET', '/practice/history', { token });

// ---------- 6. Audio upload grant (two-step upload, step 1) ----------
await step('Request an audio upload grant for the diagnostic endpoint', 'POST', '/uploads/audio-url', {
  token,
  json: { contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/answer' },
});
await step('Request a grant for a non-audio content type', 'POST', '/uploads/audio-url', {
  token,
  json: { contentType: 'text/plain', assessmentEndpoint: '/diagnostic/answer' },
});
await step('Request a grant for an unknown assessment endpoint', 'POST', '/uploads/audio-url', {
  token,
  json: { contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/wrong' },
});
await step('Request a grant without signing in', 'POST', '/uploads/audio-url', {
  json: { contentType: 'audio/mp4', assessmentEndpoint: '/diagnostic/answer' },
});

// ---------- 7. Diagnostic: adaptive placement ----------
await step('Start the placement test (first question)', 'GET', '/diagnostic/next', { token });
let question = reg.body.__hold ? null : null; // placeholder, set below
const first = await step('Read the served question again (state is durable, nothing is lost)', 'GET', '/diagnostic/next', { token });
question = first.body.question;
note(`Placement starts at level ${question.cefrLevel} (binary-search midpoint of A1..C2), progress=${JSON.stringify(first.body.progress)}`);

await step('Submit an answer for a question I was never served', 'POST', '/diagnostic/answer', {
  token,
  form: audioForm('00000000-0000-0000-0000-000000000000'),
});
await step('Submit a file that is not real audio (text renamed to .m4a)', 'POST', '/diagnostic/answer', {
  token,
  form: textForm(question.id),
});

// Answer loop until placement completes (max 3 scored answers by design).
let answerNo = 0;
let doneBody = null;
let firstRequestId = null;
for (let i = 1; i <= 3 && !doneBody; i++) {
  const requestId = uuid();
  if (i === 1) firstRequestId = requestId;
  const r = await step(
    `Speak my answer ${i} to the ${question.cefrLevel} question “${question.promptWord}” (requestId reused on any retry)`,
    'POST',
    '/diagnostic/answer',
    { token, form: audioForm(question.id, requestId) },
  );
  answerNo = i;
  if (r.body.done) {
    doneBody = r.body;
  } else {
    question = r.body.nextQuestion;
    note(`Adaptive step: level window narrowed; next question served at ${question.cefrLevel}`);
  }
}
note(`Placement finished after ${answerNo} scored answers → assigned level ${doneBody?.level}`);

// ---------- 8. Durable replay / crash recovery ----------
await step('Retransmit my first answer after its exact requestId (network retry replay)', 'POST', '/diagnostic/answer', {
  token,
  form: audioForm(uuid(), firstRequestId),
});
await step('App reconciliation poll for the first answer (interrupted handoff recovery)', 'GET', `/assessments/${firstRequestId}`, { token });
await step('Reconciliation poll for a requestId that never existed', 'GET', `/assessments/${uuid()}`, { token });
await step('Reconciliation poll with a malformed UUID', 'GET', '/assessments/not-a-uuid', { token });

// ---------- 9. Completed state ----------
await step('Ask for the next diagnostic question after completion', 'GET', '/diagnostic/next', { token });
await step('Submit another diagnostic answer after completion', 'POST', '/diagnostic/answer', {
  token,
  form: audioForm(uuid()),
});
const meAfter = await step('My profile now shows the placed level', 'GET', '/auth/me', { token });
await step('Acknowledge the placement result (unlocks the practice home in the app)', 'POST', '/diagnostic/acknowledge', { token });
await step('Acknowledge is idempotent when the app retries it', 'POST', '/diagnostic/acknowledge', { token });

// ---------- persist identity for scenario 3 ----------
mkdirSync('/tmp/journey', { recursive: true });
writeFileSync(
  '/tmp/journey/userA.json',
  JSON.stringify({ email, password, token, userId, level: meAfter.body.user.cefrLevel }, null, 2),
);
note(`Saved scenario-3 identity: ${email} (level ${meAfter.body.user?.cefrLevel})`);
note('SCENARIO 1 complete');
