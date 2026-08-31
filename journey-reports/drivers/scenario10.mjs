// Scenario 10: RECORDING deep-dive per mother tongue (order: te → hi → zh → es).
// Per language: upload grants for all three endpoints, a real AAC take through
// English and native arcs, retainRecording true/false/omitted, native-endpoint
// replay, and the shared container/format gate matrix.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { audioForm, BASE, note, resetSteps, step, uuid } from './lib.mjs';

resetSteps();
let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`CHECK PASS: ${name}`); }
  else { fail++; console.log(`CHECK FAIL: ${name} ${detail}`); }
};

const tone = `/tmp/journey/tone10-${Date.now()}.m4a`;
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'aac', '-b:a', '64k', tone]);
const REAL = readFileSync(tone);
note(`real take: ${REAL.length} bytes, sha256 ${createHash('sha256').update(REAL).digest('hex').slice(0, 12)}…`);

const ORDER = ['te', 'hi', 'zh', 'es'];
note(`SCENARIO 10 — recording per mother tongue (${ORDER.join(' → ')}) against ${BASE}`);

for (const lang of ORDER) {
  note(`--- ${lang}: recording flows ---`);
  const email = `j10_${lang}_${Date.now()}@example.com`;
  const reg = await step(`[${lang}] Register`, 'POST', '/auth/register', {
    json: { name: `Recorder ${lang}`, email, password: 'secret123', nativeLanguage: lang, uiLanguage: lang },
  });
  const token = reg.body.token;

  for (const ep of ['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native']) {
    const g = await step(`[${lang}] Upload grant for ${ep}`, 'POST', '/uploads/audio-url', {
      token, json: { contentType: 'audio/mp4', assessmentEndpoint: ep },
    });
    check(`[${lang}] grant for ${ep} echoes the endpoint`, g.status === 200 && g.body.assessmentEndpoint === ep && g.body.mode === 'direct');
  }

  let q = (await step(`[${lang}] Placement question 1`, 'GET', '/diagnostic/next', { token })).body;
  const diagReq = uuid();
  const d1 = await step(`[${lang}] Placement answer 1 (retainRecording=true, real bytes)`, 'POST', '/diagnostic/answer', {
    token, form: audioForm(q.question.id, diagReq, undefined, 'true', REAL),
  });
  check(`[${lang}] retained-choice submission accepted`, d1.status === 200);
  const diagReplay = await step(`[${lang}] Diagnostic replay of that exact submission`, 'POST', '/diagnostic/answer', {
    token, form: audioForm(q.question.id, diagReq, undefined, 'true', REAL),
  });
  check(`[${lang}] diagnostic replay returns the stored response`, diagReplay.status === 200 && diagReplay.body.score === d1.body.score);
  let nextQ = d1.body.nextQuestion;
  for (let i = 2; i <= 3 && nextQ; i++) {
    const a = await step(`[${lang}] Placement answer ${i}`, 'POST', '/diagnostic/answer', { token, form: audioForm(nextQ.id, uuid(), undefined, 'false', REAL) });
    nextQ = a.body.done ? null : a.body.nextQuestion;
  }
  await step(`[${lang}] Acknowledge placement`, 'POST', '/diagnostic/acknowledge', { token });

  const pq = await step(`[${lang}] Practice assignment`, 'GET', '/practice/question', { token });
  let Q = pq.body.question, cycle = pq.body.cycleId;

  // English arc on real bytes (up to 3 tries; record the arc shape).
  let last;
  for (let t = 1; t <= 3; t++) {
    last = await step(`[${lang}] English try ${t} (real bytes, retain=false)`, 'POST', '/practice/attempt', {
      token, form: audioForm(Q.id, uuid(), cycle, 'false', REAL),
    });
    check(`[${lang}] english try ${t} attemptNo=${t}`, last.status === 200 && last.body.attemptNo === t, JSON.stringify(last.body).slice(0, 120));
    if (last.body.passed || last.body.attemptsLeft === 0) break;
  }
  if (last.body.next) { Q = last.body.next.question; cycle = last.body.next.cycleId; }

  // Native arc: three native tries on one fresh cycle.
  const pq2 = await step(`[${lang}] Next assignment for the all-native arc`, 'GET', '/practice/question', { token });
  Q = pq2.body.question; cycle = pq2.body.cycleId;
  const nReq = uuid();
  const n1 = await step(`[${lang}] Native try 1 (requestId kept for replay)`, 'POST', '/practice/attempt/native', {
    token, form: audioForm(Q.id, nReq, cycle, 'false', REAL),
  });
  check(`[${lang}] native try 1 = attempt 1`, n1.body.attemptNo === 1 && n1.body.nativeLanguage === lang);
  await step(`[${lang}] Native try 2`, 'POST', '/practice/attempt/native', { token, form: audioForm(Q.id, uuid(), cycle, 'false', REAL) });
  const n3 = await step(`[${lang}] Native try 3 (closes the shared budget)`, 'POST', '/practice/attempt/native', { token, form: audioForm(Q.id, uuid(), cycle, 'false', REAL) });
  check(`[${lang}] native try 3 = attempt 3`, n3.body.attemptNo === 3, JSON.stringify(n3.body).slice(0, 150));
  const afterNative = await step(`[${lang}] Assignment after three native tries`, 'GET', '/practice/question', { token });
  check(`[${lang}] all-native budget exhausted → new cycle served`, afterNative.body.cycleId !== cycle, 'same cycle re-served');
  // Native-endpoint replay (same requestId + questionId + cycleId).
  const nReplay = await step(`[${lang}] Replay the native submission exactly`, 'POST', '/practice/attempt/native', {
    token, form: audioForm(Q.id, nReq, cycle, 'false', REAL),
  });
  check(`[${lang}] native replay returns the stored response`, nReplay.status === 200 && nReplay.body.attemptNo === 1, `status=${nReplay.status}`);

  // retainRecording omitted = legacy default; still accepted.
  const legacyForm = new FormData();
  legacyForm.append('audio', new Blob([REAL], { type: 'audio/mp4' }), 'answer.m4a');
  legacyForm.append('questionId', afterNative.body.question.id);
  legacyForm.append('requestId', uuid());
  legacyForm.append('cycleId', afterNative.body.cycleId);
  const legacy = await step(`[${lang}] Submission with retainRecording OMITTED (legacy client)`, 'POST', '/practice/attempt', { token, form: legacyForm });
  check(`[${lang}] legacy omission accepted`, legacy.status === 200, JSON.stringify(legacy.body).slice(0, 120));

  const hist = await step(`[${lang}] History after the recording session`, 'GET', '/practice/history', { token });
  const nativeRows = (hist.body.items || []).filter((r) => r.context === 'practice-native');
  check(`[${lang}] native history rows snapshot ${lang}`, nativeRows.length >= 3 && nativeRows.every((r) => r.nativeLanguage === lang));

  await step(`[${lang}] Delete account`, 'DELETE', '/auth/account', {
    token, json: { password: 'secret123' },
  });
}

// ---------- container/format gate matrix (language-independent, one fresh user) ----------
note('--- container magic-byte matrix (any user; gate is language-independent) ---');
const mEmail = `j10m_${Date.now()}@example.com`;
const mTok = (await step('Register the format-matrix user', 'POST', '/auth/register', {
  json: { name: 'Formats', email: mEmail, password: 'secret123', nativeLanguage: 'te' },
})).body.token;
const anyQ = '00000000-0000-4000-8000-000000000000'; // nonexistent question: pins the ORDER — question check runs before the byte gate
// With a nonexistent question every submission 409s at the question check,
// whatever the bytes: this pins ordering. (409 = reached question validation)
const FORMS = [
  ['valid ftyp m4a', 'answer.m4a', 'audio/mp4', Buffer.from('00000018667479704d34412000000000', 'hex'), 409],
  ['text as m4a', 'answer.m4a', 'audio/mp4', Buffer.from('just text, definitely not audio'), 409],
  ['ID3 tag as mp3 in a .wav filename (pair mismatch)', 'answer.wav', 'audio/wav', Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00'), 409],
  ['RIFF/WAVE header in .wav (valid pair)', 'answer.wav', 'audio/wav', Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt '), 409],
  ['OggS header in .ogg (valid pair)', 'answer.ogg', 'audio/ogg', Buffer.from('OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00'), 409],
  ['EBML/webm header in .webm (valid pair)', 'answer.webm', 'audio/webm', Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01]), 409],
  ['fLaC header in .flac (valid pair)', 'answer.flac', 'audio/flac', Buffer.from('fLaC\x00\x00\x00\x22'), 409],
  ['mp3 ID3 in .mp3 (valid pair)', 'answer.mp3', 'audio/mpeg', Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00'), 409],
];
for (const [label, filename, type, bytes, expected] of FORMS) {
  const form = new FormData();
  form.append('audio', new Blob([bytes], { type }), filename);
  form.append('questionId', anyQ);
  form.append('requestId', uuid());
  const r = await step(`Byte gate: ${label} → expect ${expected} (no real question needed)`, 'POST', '/diagnostic/answer', { token: mTok, form });
  check(`gate "${label}" → ${expected}`, r.status === expected, `got ${r.status}`);
}

// Now with the SERVED question: the byte gate itself is reachable and the
// mismatched signatures must 415 exactly as in scenario 1.
const served = (await step('Format-matrix user starts the placement (served question)', 'GET', '/diagnostic/next', { token: mTok })).body.question;
for (const [label, filename, type, bytes] of [
  ['text as m4a (SERVED question)', 'answer.m4a', 'audio/mp4', Buffer.from('just text, definitely not audio')],
  ['ID3-as-mp3 in .wav (SERVED question)', 'answer.wav', 'audio/wav', Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00')],
]) {
  const form = new FormData();
  form.append('audio', new Blob([bytes], { type }), filename);
  form.append('questionId', served.id);
  form.append('requestId', uuid());
  const r = await step(`Byte gate with the served question: ${label} → expect 415`, 'POST', '/diagnostic/answer', { token: mTok, form });
  check(`served-question gate "${label}" → 415`, r.status === 415, `got ${r.status}`);
}

// A real MP3 (right magic AND right pair) passes the byte gate end-to-end.
const mp3File = `/tmp/journey/tone10-${Date.now()}.mp3`;
execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:a', 'libmp3lame', '-b:a', '64k', mp3File]);
const mp3Form = new FormData();
mp3Form.append('audio', new Blob([readFileSync(mp3File)], { type: 'audio/mpeg' }), 'answer.mp3');
mp3Form.append('questionId', served.id);
mp3Form.append('requestId', uuid());
const mp3r = await step('Real MP3 with the correct extension+MIME pair (served question)', 'POST', '/diagnostic/answer', { token: mTok, form: mp3Form });
check('real mp3 accepted end-to-end (200)', mp3r.status === 200, `got ${mp3r.status}`);

// Oversized upload (> 25 MiB) → 413.
const big = Buffer.concat([Buffer.from('00000018667479704d34412000000000', 'hex'), Buffer.alloc(26 * 1024 * 1024, 1)]);
const bigForm = new FormData();
bigForm.append('audio', new Blob([big], { type: 'audio/mp4' }), 'answer.m4a');
bigForm.append('questionId', anyQ);
bigForm.append('requestId', uuid());
const bigR = await step('26 MiB upload (cap is 25 MiB)', 'POST', '/diagnostic/answer', { token: mTok, form: bigForm });
check('oversized upload rejected', bigR.status === 413, `got ${bigR.status}`);

// Extra multipart fields beyond the 4-text-field budget → rejected by the parser.
const extraForm = new FormData();
extraForm.append('audio', new Blob([REAL], { type: 'audio/mp4' }), 'answer.m4a');
extraForm.append('questionId', anyQ);
extraForm.append('requestId', uuid());
extraForm.append('retainRecording', 'false');
extraForm.append('cycleId', uuid());
extraForm.append('surprise', 'sixth field');
const extraR = await step('Multipart form with a SIXTH part (fields budget is 4 text fields)', 'POST', '/diagnostic/answer', { token: mTok, form: extraForm });
check('extra multipart parts rejected', extraR.status === 400 || extraR.status === 413, `got ${extraR.status}`);

// Missing required text fields.
const noQ = new FormData();
noQ.append('audio', new Blob([REAL], { type: 'audio/mp4' }), 'answer.m4a');
noQ.append('requestId', uuid());
const noQR = await step('Submission without questionId', 'POST', '/diagnostic/answer', { token: mTok, form: noQ });
check('missing questionId rejected', noQR.status === 400, `got ${noQR.status}`);
const badRetain = audioForm(anyQ, uuid(), undefined, 'maybe', REAL);
const badR = await step("retainRecording='maybe' (invalid boolean string)", 'POST', '/diagnostic/answer', { token: mTok, form: badRetain });
check('invalid retainRecording rejected', badR.status === 400, `got ${badR.status}`);

console.log(`\n== SCENARIO 10 complete: ${pass} checks passed, ${fail} failed`);
if (fail > 0) process.exit(1);
