// Scenario 6: "is the audio in History the recording I made?"
// Verifies, live: what happens to a real audio file through the direct/dev
// pipeline, whether ANY audio surfaces on History/Recordings in this topology,
// server-side upload residue (privacy), owner-only cursors, and delete-all.
// The S3-only retained path is documented via the pinned suites.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { audioForm, BASE, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};
const UPLOADS = '/Users/pavankumarreddyreddem/Desktop/AI Learning Application/server/uploads';
const residue = () => { try { return readdirSync(UPLOADS).filter((f) => f !== '.gitkeep'); } catch { return ['(unreadable)']; } };

note(`SCENARIO 6 — audio fidelity/privacy against ${BASE}`);

// A REAL m4a this time (AAC sine tone), hashed so the report can name exact bytes.
const tmp = `/tmp/journey/tone-${Date.now()}.m4a`;
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'aac', '-b:a', '64k', tmp]);
const bytes = readFileSync(tmp);
const sha = createHash('sha256').update(bytes).digest('hex');
note(`synthetic take: ${bytes.length} bytes, sha256 ${sha.slice(0, 16)}…`);

const email = `journey6_${Date.now()}@example.com`;
const reg = await step('Register the learner', 'POST', '/auth/register', {
  json: { name: 'Audio Check', email, password: 'secret123', nativeLanguage: 'te' },
});
const token = reg.body.token;
let q = (await step('Placement question 1', 'GET', '/diagnostic/next', { token })).body;
for (let i = 1; i <= 3; i++) {
  const a = await step(`Placement answer ${i} (real 2s AAC tone)`, 'POST', '/diagnostic/answer', {
    token, form: audioForm(q.question.id, uuid(), undefined, 'true', bytes),
  });
  if (a.body.done) break;
  q = { question: a.body.nextQuestion };
}
const pq = await step('Practice assignment', 'GET', '/practice/question', { token });
let Q = pq.body.question, cycle = pq.body.cycleId;

note(`uploads dir BEFORE practice attempts: ${JSON.stringify(residue())}`);
const a1 = await step('Practice attempt with retainRecording=TRUE (real bytes)', 'POST', '/practice/attempt', {
  token, form: audioForm(Q.id, uuid(), cycle, 'true', bytes),
});
await step('Practice attempt with retainRecording=FALSE (default-off choice)', 'POST', '/practice/attempt', {
  token,
  form: a1.body.next ? audioForm(a1.body.next.question.id, uuid(), a1.body.next.cycleId, 'false', bytes) : audioForm(Q.id, uuid(), cycle, 'false', bytes),
});
const after = residue();
note(`uploads dir AFTER attempts: ${JSON.stringify(after)}`);
check('no uploaded audio residue persists server-side after assessment', after.length === 0, JSON.stringify(after));

// What does History know about audio in this topology?
const hist = await step('History rows for the attempts just made', 'GET', '/practice/history?limit=50', { token });
const rows = hist.body.items || [];
check('history rows are text records (no recordingId in direct mode)', rows.every((r) => r.recordingId === null || r.recordingId === undefined), JSON.stringify(rows.map((r) => r.recordingId)));
console.log(`== history recordingId values observed: ${JSON.stringify([...new Set(rows.map((r) => r.recordingId ?? null))])}`);
console.log('== history recordingStatus values observed: ' + JSON.stringify([...new Set(rows.map((r) => r.recordingStatus ?? null))]));

const recList = await step('Recordings list (the only audio surface)', 'GET', '/recordings', { token });
check('recordings list is empty in direct mode', (recList.body.items || []).length === 0);
await step('Recordings export', 'GET', '/recordings/export', { token });
await step('Playback grant for an arbitrary recording id', 'POST', `/recordings/${uuid()}/playback-url`, { token });
await step('Recordings list with an oversized limit', 'GET', '/recordings?limit=1000', { token });

// Delete-all is the privacy exit; then history text survives, audio never existed.
const bulk = await step('Delete ALL recordings (privacy exit)', 'DELETE', '/recordings', { token });
check('bulk delete 204', bulk.status === 204);
const hist2 = await step('History after delete-all: attempts remain as text', 'GET', '/practice/history?limit=50', { token });
check('history rows survive delete-all (they are not audio)', (hist2.body.items || []).length === rows.length);

// Owner-only paging: a foreign user's attempt id is not a valid cursor.
const otherEmail = `journey6b_${Date.now()}@example.com`;
const other = await step('Second learner registers (for the owner-only check)', 'POST', '/auth/register', {
  json: { name: 'Other', email: otherEmail, password: 'secret123', nativeLanguage: 'hi' },
});
const foreignCursor = rows[0]?.id;
if (foreignCursor) {
  await step('Use the FIRST user attempt id as the second user history cursor', 'GET', `/practice/history?limit=5&cursor=${foreignCursor}`, { token: other.body.token });
}
// Same cursor twice for the same user: deterministic idempotent paging.
const p1 = await step('History page 1 (limit 1)', 'GET', '/practice/history?limit=1', { token });
if (p1.body.nextCursor) {
  const c = p1.body.nextCursor;
  const r1 = await step('Follow the cursor (first time)', 'GET', `/practice/history?limit=1&cursor=${c}`, { token });
  const r2 = await step('Follow the SAME cursor again (idempotent)', 'GET', `/practice/history?limit=1&cursor=${c}`, { token });
  check('repeated cursor returns the identical page', JSON.stringify(r1.body) === JSON.stringify(r2.body));
}

console.log(`\n== SCENARIO 6 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
