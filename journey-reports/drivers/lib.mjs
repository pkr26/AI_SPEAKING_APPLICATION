// Shared driver for the manual user-journey verification reports.
// Run against a local mock-mode direct-upload server (see journey-reports/README.md).

import { randomUUID } from 'node:crypto';

export const BASE = process.env.BASE_URL || 'http://localhost:4100';
export const CLIENT_VERSION = process.env.CLIENT_VERSION || '1.1.1';
export const uuid = randomUUID;

let stepNo = 0;
export function resetSteps() {
  stepNo = 0;
}
export function note(text) {
  console.log(`\n== ${text}`);
}

function trim(text, max = 700) {
  if (text === null || text === undefined || text === '') return '(empty body)';
  const s = typeof text === 'string' ? text : JSON.stringify(text);
  return s.length > max ? s.slice(0, max) + ` …(+${s.length - max} chars)` : s;
}

export async function step(title, method, path, opts = {}) {
  const { token, json, form, headers: extra = {}, noVersion = false } = opts;
  const headers = { 'X-Client-Version': CLIENT_VERSION, ...extra };
  if (noVersion) delete headers['X-Client-Version'];
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) {
    body = form; // fetch sets the multipart boundary itself
  }
  const res = await fetch(BASE + path, { method, headers, body });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { __raw: text };
  }
  stepNo++;
  console.log(`\n### ${stepNo}. ${title}`);
  console.log(`> ${method} ${path}${json !== undefined ? `  body=${trim(json, 300)}` : ''}${form ? '  (multipart form)' : ''}`);
  console.log(`< HTTP ${res.status}`);
  console.log(`< ${trim(data)}`);
  const interestingHeaders = ['retry-after', 'cache-control', 'etag', 'vary', 'x-ratelimit-remaining'];
  for (const h of interestingHeaders) {
    const v = res.headers.get(h);
    if (v) console.log(`< header ${h}: ${v}`);
  }
  return { status: res.status, body: data, headers: res.headers };
}

// A minimal container-valid m4a header (the same fixture the repo's own smoke
// test uses): passes the upload magic-byte gate; with MOCK_AI=true the ffmpeg
// inspection stage is deliberately skipped, standing in for "learner speech".
export const FAKE_AUDIO_BYTES = Buffer.from('00000018667479704d34412000000000', 'hex');

export function audioForm(questionId, requestId = randomUUID(), cycleId, retainRecording = 'false', bytes = FAKE_AUDIO_BYTES) {
  const form = new FormData();
  form.append('audio', new Blob([bytes], { type: 'audio/mp4' }), 'answer.m4a');
  form.append('questionId', questionId);
  form.append('requestId', requestId);
  if (cycleId) form.append('cycleId', cycleId);
  form.append('retainRecording', retainRecording);
  return form;
}

export function textForm(questionId, requestId = randomUUID(), cycleId) {
  const form = new FormData();
  form.append('audio', new Blob([Buffer.from('just some text, not audio')], { type: 'audio/mp4' }), 'answer.m4a');
  form.append('questionId', questionId);
  form.append('requestId', requestId);
  if (cycleId) form.append('cycleId', cycleId);
  form.append('retainRecording', 'false');
  return form;
}
