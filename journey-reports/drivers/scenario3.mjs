// Scenario 3: account WITH a completed diagnostic — the full learner loop.
// Practice cycles, try budget, native mode, skip, mastery/SRS via stats,
// history paging, bilingual help, profile, recordings (direct mode),
// placement retake, change password, logout, data export, account deletion.
import { readFileSync } from 'node:fs';
import { audioForm, BASE, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};

const A = JSON.parse(readFileSync('/tmp/journey/userA.json', 'utf8'));
note(`SCENARIO 3 — placed learner (level ${A.level}) against ${BASE}`);

// ---------- relaunch ----------
const login = await step('Relaunch the app: sign in', 'POST', '/auth/login', {
  json: { email: A.email, password: A.password },
});
const token = login.body.token;
const me = await step('Home needs my profile: placed at C1, diagnostic done', 'GET', '/auth/me', { token });
check('profile shows placed level', me.body.user.cefrLevel === A.level && me.body.user.diagnosticCompleted === true);

const stats0 = await step('Home dashboard stats (timeZone-aware)', 'GET', '/practice/stats?timeZone=Asia/Kolkata', { token });
check('stats level matches placement', stats0.body.level === A.level);
check('stats shows 100 words at level', stats0.body.progress.totalAtLevel === 100, JSON.stringify(stats0.body.progress));

// ---------- diagnostic is closed now ----------
const pq0 = await step('Fetch a practice question (also gives me a real catalog id)', 'GET', '/practice/question', { token });
const anyQuestionId = pq0.body.question.id;
await step('Try to submit a DIAGNOSTIC answer with a real question id after completion', 'POST', '/diagnostic/answer', {
  token,
  form: audioForm(anyQuestionId, uuid()),
});

// ---------- durable practice cycle ----------
let Q = pq0.body.question;
let cycle = pq0.body.cycleId;
check('practice serves my placed level', Q.cefrLevel === A.level, JSON.stringify(Q));
check('cycle is a UUID with kind/progress', typeof cycle === 'string' && (pq0.body.kind === 'new' || pq0.body.kind === 'revision'));
const resumeQ = await step('Re-open practice (app remount): must resume the SAME cycle', 'GET', '/practice/question', { token });
check('same question resumed', resumeQ.body.question.id === Q.id);
check('same cycleId resumed', resumeQ.body.cycleId === cycle);

// ---------- bilingual help ----------
const help = await step('Open bilingual help for this word (mother tongue: Telugu)', 'GET', `/practice/question/${Q.id}/help`, { token });
check('help has 3 bilingual examples', Array.isArray(help.body.examples) && help.body.examples.length === 3);
check('help echoes EN + native wording', typeof help.body.promptWordNative === 'string' && help.body.questionTextNative.length > 0);
const etag = help.headers.get('etag');
const help304 = await step('Re-open help with the ETag (conditional revalidation)', 'GET', `/practice/question/${Q.id}/help`, {
  token,
  headers: { 'If-None-Match': etag },
});
check('help ETag yields 304', help304.status === 304);
await step('Help for an unknown question id', 'GET', `/practice/question/${uuid()}/help`, { token });
await step('Help with a malformed question id', 'GET', '/practice/question/not-a-uuid/help', { token });

// ---------- cycle guards ----------
await step('Attempt with an arbitrary (not my) cycleId', 'POST', '/practice/attempt', {
  token,
  form: audioForm(Q.id, uuid(), uuid()),
});
await step('Attempt for a question that is not my assignment', 'POST', '/practice/attempt', {
  token,
  form: audioForm(anyQuestionId === Q.id ? uuid() : anyQuestionId, uuid(), cycle),
});

// ---------- question 1: English tries until pass or final ----------
note('Question 1 — English attempts (mock scores are random 40–95; pass ≥60, master ≥75)');
let attemptLog = [];
let r1;
for (let i = 1; i <= 3; i++) {
  r1 = await step(`Try ${i} of 3 on “${Q.promptWord}” in English`, 'POST', '/practice/attempt', {
    token,
    form: audioForm(Q.id, uuid(), cycle),
  });
  attemptLog.push({ attemptNo: r1.body.attemptNo, score: r1.body.score, passed: r1.body.passed, mastered: r1.body.mastered });
  if (r1.body.passed || r1.body.attemptsLeft === 0) break;
}
check('attempts numbered 1..3', attemptLog[0].attemptNo === 1, JSON.stringify(attemptLog));
check('pass or 3rd-try final ends the cycle', !!(r1.body.passed || (r1.body.attemptsLeft === 0 && r1.body.finalFeedback)));
if (r1.body.mastered !== undefined) check('mastered flag present on pass', typeof r1.body.mastered === 'boolean');
const next1 = r1.body.next;
if (next1) { Q = next1.question; cycle = next1.cycleId; }

// idempotent replay of the last attempt (exact same logical submission)
const replayReqId = uuid();
await step('Submit a try, then the network retries the exact same submission', 'POST', '/practice/attempt', {
  token,
  form: audioForm(Q.id, replayReqId, cycle),
});
const replay2 = await step('…retry retransmit (same requestId/questionId/cycleId)', 'POST', '/practice/attempt', {
  token,
  form: audioForm(Q.id, replayReqId, cycle),
});
check('practice duplicate submission replays identically',
  replay2.status === 200 && replay2.body.attemptNo !== undefined, `status=${replay2.status}`);
if (replay2.body.next) { Q = replay2.body.next.question; cycle = replay2.body.next.cycleId; }

// ---------- question 2: native mode shares the try budget ----------
note('Question 2 — native-language (Telugu) attempts share the same 3-try budget');
const n1 = await step(`Native try 1 on “${Q.promptWord}” (answer in my language)`, 'POST', '/practice/attempt/native', {
  token,
  form: audioForm(Q.id, uuid(), cycle),
});
check('native mode returns comprehension payload', n1.body.mode === 'native' && typeof n1.body.understood === 'boolean' && n1.body.nativeLanguage === 'te', JSON.stringify(n1.body).slice(0, 200));
check('native try 1 = attempt 1 of cycle', n1.body.attemptNo === 1, JSON.stringify(n1.body));
const n2 = await step('Native try 2', 'POST', '/practice/attempt/native', {
  token,
  form: audioForm(Q.id, uuid(), cycle),
});
check('native try 2 = attempt 2', n2.body.attemptNo === 2);
const e3 = await step('Switch back to English for try 3 (shared budget)', 'POST', '/practice/attempt', {
  token,
  form: audioForm(Q.id, uuid(), cycle),
});
check('English after two natives = attempt 3', e3.body.attemptNo === 3, JSON.stringify(e3.body).slice(0, 200));
check('third try ends the cycle either way', !!(e3.body.next || e3.body.finalFeedback || e3.body.passed));
const fourth = await step('Submit a FOURTH try on the closed cycle', 'POST', '/practice/attempt', {
  token,
  form: audioForm(Q.id, uuid(), cycle),
});
check('fourth submission rejected', fourth.status === 409 || fourth.status === 400, `status=${fourth.status}`);
if (e3.body.next) { Q = e3.body.next.question; cycle = e3.body.next.cycleId; }

// ---------- skip ----------
const beforeSkip = await step('Fetch my current assignment before skipping', 'GET', '/practice/question', { token });
Q = beforeSkip.body.question; cycle = beforeSkip.body.cycleId;
await step('Skip a question that is not my current assignment', 'POST', '/practice/skip', {
  token,
  json: { questionId: uuid(), cycleId: cycle },
});
const skip = await step(`Skip “${Q.promptWord}”`, 'POST', '/practice/skip', {
  token,
  json: { questionId: Q.id, cycleId: cycle },
});
check('skip is an empty 204', skip.status === 204);
const afterSkip = await step('Next assignment arrives after the skip', 'GET', '/practice/question', { token });
check('skip moved to a new cycle', afterSkip.body.cycleId !== cycle && afterSkip.body.question.id !== Q.id);
Q = afterSkip.body.question; cycle = afterSkip.body.cycleId;

// ---------- a few more scored cycles to move mastery/SRS ----------
note('Running several more cycles to observe mastery/SRS bookkeeping');
let masterySeen = 0;
for (let round = 0; round < 6; round++) {
  let r;
  for (let t = 1; t <= 3; t++) {
    r = await step(`Cycle ${round + 1}, try ${t} on “${Q.promptWord}”`, 'POST', '/practice/attempt', {
      token,
      form: audioForm(Q.id, uuid(), cycle),
    });
    if (r.body.passed || r.body.attemptsLeft === 0) break;
  }
  if (r.body.mastered === true) masterySeen++;
  if (r.body.next) { Q = r.body.next.question; cycle = r.body.next.cycleId; } else break;
}
const stats1 = await step('Stats after practice (mastery, streak, totals)', 'GET', '/practice/stats?timeZone=Asia/Kolkata', { token });
check('totalAttempts grew', stats1.body.totalAttempts > stats0.body.totalAttempts, `${stats0.body.totalAttempts} → ${stats1.body.totalAttempts}`);
check('practicedToday counts this session', stats1.body.practicedToday > 0);
console.log(`== mastery events observed this session: ${masterySeen}; progress now ${JSON.stringify(stats1.body.progress)}`);

// ---------- history paging ----------
const h1 = await step('History page 1 (limit 5)', 'GET', '/practice/history?limit=5', { token });
check('history has rows in the app contract', Array.isArray(h1.body.items) && h1.body.items.length > 0);
check('history rows carry context + score', h1.body.items.every((i) => typeof i.score === 'number' && typeof i.context === 'string'));
if (h1.body.nextCursor) {
  await step('History page 2 via cursor', 'GET', `/practice/history?limit=5&cursor=${h1.body.nextCursor}`, { token });
}
await step('History with a garbage cursor', 'GET', '/practice/history?limit=5&cursor=not-a-uuid', { token });
await step('History with an oversized limit (server caps it)', 'GET', '/practice/history?limit=5000', { token });

// ---------- bilingual language switch ----------
await step('Switch my interface language to Telugu', 'PATCH', '/auth/me', { token, json: { uiLanguage: 'te' } });
const natSwitch = await step('Switch my MOTHER TONGUE to Spanish (affects native mode + help)', 'PATCH', '/auth/me', { token, json: { nativeLanguage: 'es' } });
check('profile update returns the new mother tongue', natSwitch.body.user.nativeLanguage === 'es');
const helpEs = await step('Help for my current word now renders in Spanish', 'GET', `/practice/question/${Q.id}/help`, { token });
check('native help follows the new mother tongue', helpEs.body.examples?.every((e) => typeof e.native === 'string'), JSON.stringify(helpEs.body).slice(0, 150));
await step('Reject an unsupported interface language', 'PATCH', '/auth/me', { token, json: { uiLanguage: 'xx' } });
await step('Reject an over-long name', 'PATCH', '/auth/me', { token, json: { name: 'x'.repeat(101) } });

// ---------- recordings (direct/dev mode: nothing retained) ----------
const rec1 = await step('My recordings list (dev direct mode stores nothing)', 'GET', '/recordings', { token });
check('recordings list is well-formed', rec1.status === 200 && Array.isArray(rec1.body.items));
await step('Request playback for a recording id I do not have', 'POST', `/recordings/${uuid()}/playback-url`, { token });
await step('Delete a nonexistent recording', 'DELETE', `/recordings/${uuid()}`, { token });
const bulk = await step('Delete ALL my recordings (privacy exit)', 'DELETE', '/recordings', { token });
check('bulk delete is 204 even when empty', bulk.status === 204);

// ---------- placement retake ----------
const retake = await step('Settings → Retake placement test (confirmed)', 'POST', '/diagnostic/restart', { token, json: { confirm: true } });
check('retake accepted', retake.status === 204);
const meAfterRetake = await step('Profile after retake: unplaced again', 'GET', '/auth/me', { token });
check('retake cleared placement', meAfterRetake.body.user.cefrLevel === null && meAfterRetake.body.user.diagnosticCompleted === false);
await step('Practice is gated again after retake', 'GET', '/practice/question', { token });
const statsAfterRetake = await step('Stats survive the retake (progress is NOT wiped)', 'GET', '/practice/stats?timeZone=Asia/Kolkata', { token });
check('attempt history survives retake', statsAfterRetake.body.totalAttempts === stats1.body.totalAttempts, `${statsAfterRetake.body.totalAttempts} vs ${stats1.body.totalAttempts}`);

// complete a second placement quickly
let q = (await step('Second placement: question 1', 'GET', '/diagnostic/next', { token })).body;
let placed2 = null;
for (let i = 1; i <= 3 && !placed2; i++) {
  const a = await step(`Second placement answer ${i} (${q.question.cefrLevel}: ${q.question.promptWord})`, 'POST', '/diagnostic/answer', {
    token,
    form: audioForm(q.question.id, uuid()),
  });
  if (a.body.done) placed2 = a.body.level;
  else q = { question: a.body.nextQuestion };
}
check('second placement completed with a level', typeof placed2 === 'string');
await step('Acknowledge the second placement', 'POST', '/diagnostic/acknowledge', { token });
const stats2 = await step('Stats after re-placement: mastery counts carried over', 'GET', '/practice/stats?timeZone=Asia/Kolkata', { token });
check('mastery bookkeeping survived re-placement', stats2.body.progress.masteredCount >= stats1.body.progress.masteredCount, `${stats2.body.progress.masteredCount} vs ${stats1.body.progress.masteredCount}`);

// ---------- change password ----------
await step('Change password with the WRONG current password', 'POST', '/auth/change-password', {
  token,
  json: { currentPassword: 'nope1234', newPassword: 'newsecret456' },
});
const cp = await step('Change password (correct current)', 'POST', '/auth/change-password', {
  token,
  json: { currentPassword: A.password, newPassword: 'newsecret456' },
});
const newToken = cp.body.token;
check('change-password issues a fresh token', typeof newToken === 'string');
await step('Old token after password change', 'GET', '/auth/me', { token });
const meNew = await step('New token works', 'GET', '/auth/me', { token: newToken });
check('new token valid', meNew.status === 200);

// ---------- export + logout ----------
const exp = await step('Export all my data (JSON)', 'GET', '/auth/me/data', { token: newToken });
check('export has attempts + user, no password hash', Array.isArray(exp.body.attempts) && exp.body.user && exp.body.user.password_hash === undefined);
const lo = await step('Log out', 'POST', '/auth/logout', { token: newToken });
check('logout 204', lo.status === 204);
await step('Bearer is dead after logout', 'GET', '/auth/me', { token: newToken });
const relog = await step('Log back in with the changed password', 'POST', '/auth/login', {
  json: { email: A.email, password: 'newsecret456' },
});
const delToken = relog.body.token;

// ---------- delete account ----------
await step('Delete my account with the WRONG password', 'DELETE', '/auth/account', {
  token: delToken,
  json: { password: 'nope1234' },
});
const del = await step('Delete my account (correct password, final)', 'DELETE', '/auth/account', {
  token: delToken,
  json: { password: 'newsecret456' },
});
check('account deletion 204', del.status === 204);
const gone = await step('Token is worthless after deletion', 'GET', '/auth/me', { token: delToken });
check('token rejected post-deletion', gone.status === 401);
const ghost = await step('The account no longer exists', 'POST', '/auth/login', {
  json: { email: A.email, password: 'newsecret456' },
});
check('login fails for deleted account', ghost.status === 401);

console.log(`\n== SCENARIO 3 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
