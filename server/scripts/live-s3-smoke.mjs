#!/usr/bin/env node

// Controlled acceptance test for the real split S3 audio path.
//
// This script creates paid assessment work and real S3 objects. It is inert
// unless ALLOW_LIVE_S3_TEST=true is set explicitly. Run it against an
// authorized server whose DATABASE_URL and split S3 configuration match this
// process. It never lists either bucket and never prints credentials, bearer
// tokens, signed form fields, object keys, or response bodies.

import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  ListObjectVersionsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import 'dotenv/config';
import pg from 'pg';

if (process.env.ALLOW_LIVE_S3_TEST !== 'true') {
  throw new Error('refusing live S3 acceptance test; set ALLOW_LIVE_S3_TEST=true explicitly');
}

const { Client } = pg;
const DEFAULT_BASE_URL = 'http://127.0.0.1:4000';
const REQUEST_TIMEOUT_MS = 180_000;
const S3_OPERATION_TIMEOUT_MS = 15_000;
const DELETE_POLL_DELAYS_MS = [0, 250, 500, 1_000, 2_000, 4_000, 8_000, 15_000, 45_000];
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const ENDPOINTS = {
  diagnostic: '/diagnostic/answer',
  practice: '/practice/attempt',
  native: '/practice/attempt/native',
};

class SmokeFailure extends Error {}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new SmokeFailure(`${name} is required`);
  return value;
}

function parseBaseUrl() {
  let url;
  try {
    url = new URL(process.env.BASE_URL?.trim() || DEFAULT_BASE_URL);
  } catch {
    throw new SmokeFailure('BASE_URL must be a valid absolute URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SmokeFailure('BASE_URL must use HTTP or HTTPS');
  }
  if (url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new SmokeFailure('BASE_URL must contain only an origin');
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (!loopback && process.env.ALLOW_NON_LOOPBACK_LIVE_S3_TEST !== 'true') {
    throw new SmokeFailure(
      'non-loopback BASE_URL requires ALLOW_NON_LOOPBACK_LIVE_S3_TEST=true in addition to the live-test gate',
    );
  }
  if (!loopback && url.protocol !== 'https:') {
    throw new SmokeFailure('non-loopback BASE_URL must use HTTPS');
  }
  return url.origin;
}

function validBucketName(value) {
  return (
    value.length >= 3 &&
    value.length <= 63 &&
    /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(value) &&
    !value.includes('..') &&
    !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)
  );
}

function validRegion(value) {
  return /^[a-z]{2}(?:-[a-z0-9]+)+-[0-9]$/.test(value);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isMissingObjectError(error) {
  const candidate = error;
  return (
    candidate?.name === 'NoSuchKey' ||
    candidate?.name === 'NotFound' ||
    candidate?.$metadata?.httpStatusCode === 404 ||
    // Without s3:ListBucket, S3 deliberately answers 403 for a missing key so
    // callers cannot use GetObject as an existence oracle. This harness first
    // proves the same principal can read an uploaded object, so a subsequent
    // 403 for that exact key after DeleteObject is the expected least-
    // privilege missing-object response rather than an untested Get denial.
    (candidate?.name === 'AccessDenied' && candidate?.$metadata?.httpStatusCode === 403)
  );
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function operationSignal(includeRunSignal = true) {
  const timeout = AbortSignal.timeout(S3_OPERATION_TIMEOUT_MS);
  return includeRunSignal ? AbortSignal.any([timeout, runAbortController.signal]) : timeout;
}

function uploadHostMatchesBucket(uploadUrl, bucket, region) {
  let url;
  try {
    url = new URL(uploadUrl);
  } catch {
    return false;
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.hostname.endsWith('.amazonaws.com')
  ) {
    return false;
  }
  const expectedEndpoints = new Set([`s3.${region}`, `s3-${region}`, `s3.dualstack.${region}`]);
  if (region === 'us-east-1') expectedEndpoints.add('s3');
  const hostname = url.hostname.toLowerCase();
  const virtualPrefix = `${bucket.toLowerCase()}.`;
  if (hostname.startsWith(virtualPrefix)) {
    return expectedEndpoints.has(hostname.slice(virtualPrefix.length, -'.amazonaws.com'.length));
  }
  const endpoint = hostname.slice(0, -'.amazonaws.com'.length);
  const firstPathSegment = decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] || '');
  return expectedEndpoints.has(endpoint) && firstPathSegment === bucket;
}

function publicObjectUrl(uploadUrl, audioKey) {
  const url = new URL(uploadUrl);
  url.search = '';
  url.hash = '';
  const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  const encodedKey = audioKey.split('/').map(encodeURIComponent).join('/');
  url.pathname = `${basePath}${encodedKey}`;
  return url;
}

const baseUrl = parseBaseUrl();
const audioFile = requiredEnv('AUDIO_FILE');
const databaseUrl = requiredEnv('DATABASE_URL');
const audioContentType = (process.env.AUDIO_CONTENT_TYPE || 'audio/mp4').trim().toLowerCase();
const accessKeyId = requiredEnv('S3_ACCESS_KEY_ID');
const secretAccessKey = requiredEnv('S3_SECRET_ACCESS_KEY');
const sessionToken = process.env.S3_SESSION_TOKEN?.trim() || undefined;
const targets = {
  diagnostic: {
    bucket: requiredEnv('S3_DIAGNOSTIC_BUCKET'),
    region: requiredEnv('S3_DIAGNOSTIC_REGION'),
  },
  practice: {
    bucket: requiredEnv('S3_PRACTICE_BUCKET'),
    region: requiredEnv('S3_PRACTICE_REGION'),
  },
};

if (!validBucketName(targets.diagnostic.bucket) || !validBucketName(targets.practice.bucket)) {
  throw new SmokeFailure('split S3 bucket names must be valid DNS-style AWS bucket names');
}
if (targets.diagnostic.bucket === targets.practice.bucket) {
  throw new SmokeFailure('diagnostic and practice S3 buckets must be different');
}
if (!validRegion(targets.diagnostic.region) || !validRegion(targets.practice.region)) {
  throw new SmokeFailure('both split S3 regions must be explicit valid AWS regions');
}
if (!/^[a-z0-9][a-z0-9.+-]{0,126}\/[a-z0-9][a-z0-9.+-]{0,126}$/.test(audioContentType)) {
  throw new SmokeFailure('AUDIO_CONTENT_TYPE must be a normalized MIME type');
}

const credentials = {
  accessKeyId,
  secretAccessKey,
  ...(sessionToken ? { sessionToken } : {}),
};
for (const target of Object.values(targets)) {
  target.client = new S3Client({ region: target.region, credentials });
}

const db = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10_000,
  query_timeout: 15_000,
  statement_timeout: 15_000,
});
const runAbortController = new AbortController();
let interruptedBy = null;
const interrupt = (signal) => {
  interruptedBy = signal;
  runAbortController.abort();
};
const onSigint = () => interrupt('SIGINT');
const onSigterm = () => interrupt('SIGTERM');
process.once('SIGINT', onSigint);
process.once('SIGTERM', onSigterm);

let assertionCount = 0;
const trackedObjects = new Map();
let account = null;
let accountDeleted = false;

function check(label, condition) {
  if (!condition) throw new SmokeFailure(label);
  assertionCount += 1;
  console.log(`ok: ${label}`);
}

async function apiRequest(method, route, { token, json, cleanup = false } = {}) {
  const headers = { Accept: 'application/json', 'X-Client-Version': clientVersion };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body;
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  let response;
  try {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const signal = cleanup ? timeout : AbortSignal.any([timeout, runAbortController.signal]);
    response = await fetch(`${baseUrl}${route}`, { method, headers, body, signal });
  } catch {
    throw new SmokeFailure(`${method} ${route} did not return a response`);
  }
  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  return { status: response.status, body: parsed };
}

function checkStatus(label, response, expectedStatus) {
  check(`${label} returns HTTP ${expectedStatus}`, response.status === expectedStatus);
}

function questionFrom(response, label) {
  checkStatus(label, response, 200);
  const question = response.body?.question;
  check(`${label} returns a UUID question`, isRecord(question) && isUuid(question.id));
  return question;
}

async function requestGrant(endpoint, scope, userId) {
  const response = await apiRequest('POST', '/uploads/audio-url', {
    token: account.token,
    json: { contentType: audioContentType, assessmentEndpoint: endpoint },
  });
  checkStatus(`${scope} upload grant`, response, 200);
  const grant = response.body;
  check(`${scope} upload grant is S3 mode`, isRecord(grant) && grant.mode === 's3');
  check(`${scope} upload grant echoes its endpoint`, grant.assessmentEndpoint === endpoint);
  check(
    `${scope} upload grant has bounded normalized media metadata`,
    grant.contentType === audioContentType &&
      Number.isInteger(grant.expiresIn) &&
      grant.expiresIn >= 60 &&
      grant.expiresIn <= 3_600 &&
      Number.isInteger(grant.maxBytes) &&
      grant.maxBytes > 0 &&
      grant.maxBytes <= MAX_AUDIO_BYTES,
  );
  const keyPattern = new RegExp(
    `^audio-uploads/${scope}/${userId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(m4a|mp3|wav|ogg|webm|flac)$`,
    'i',
  );
  check(
    `${scope} upload grant key is owner- and scope-bound`,
    typeof grant.audioKey === 'string' && keyPattern.test(grant.audioKey),
  );
  check(
    `${scope} upload grant targets the configured AWS bucket`,
    typeof grant.uploadUrl === 'string' &&
      uploadHostMatchesBucket(grant.uploadUrl, targets[scope].bucket, targets[scope].region),
  );
  check(
    `${scope} upload grant fields bind the same key and media type`,
    isRecord(grant.uploadFields) &&
      grant.uploadFields.key === grant.audioKey &&
      grant.uploadFields['Content-Type'] === grant.contentType &&
      Object.entries(grant.uploadFields).every(([name, value]) => name !== 'file' && typeof value === 'string'),
  );
  trackedObjects.set(grant.audioKey, { scope, key: grant.audioKey });
  return grant;
}

async function uploadSignedObject(grant, bytes, { contentType = grant.contentType } = {}) {
  const fields = { ...grant.uploadFields };
  const contentTypeField = Object.keys(fields).find((name) => name.toLowerCase() === 'content-type');
  if (!contentTypeField) throw new SmokeFailure('signed upload grant omitted Content-Type');
  fields[contentTypeField] = contentType;
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append('file', new Blob([bytes], { type: contentType }), path.basename(audioFile));
  let response;
  let responseText;
  try {
    response = await fetch(grant.uploadUrl, {
      method: 'POST',
      body: form,
      signal: operationSignal(),
      redirect: 'manual',
    });
    responseText = await response.text();
  } catch {
    throw new SmokeFailure('signed S3 upload did not return a response');
  }
  const errorCode = /<Code>([^<]{1,128})<\/Code>/.exec(responseText)?.[1] || null;
  return { status: response.status, errorCode };
}

async function objectExists(scope, key, includeRunSignal = true) {
  try {
    const response = await targets[scope].client.send(
      new GetObjectCommand({ Bucket: targets[scope].bucket, Key: key, Range: 'bytes=0-0' }),
      { abortSignal: operationSignal(includeRunSignal) },
    );
    response.Body?.destroy?.();
    return true;
  } catch (error) {
    if (isMissingObjectError(error)) return false;
    throw new SmokeFailure(`${scope} GetObject could not prove object state`);
  }
}

async function waitForObjectMissing(scope, key, label) {
  for (const delayMs of DELETE_POLL_DELAYS_MS) {
    if (delayMs > 0) await delay(delayMs);
    if ((await listExactVersions(scope, key)).length === 0) {
      check(label, true);
      return;
    }
  }
  check(label, false);
}

async function listExactVersions(scope, key, includeRunSignal = true) {
  const target = targets[scope];
  const found = [];
  let keyMarker;
  let versionIdMarker;
  for (let page = 0; page < 1000; page++) {
    const listed = await target.client.send(
      new ListObjectVersionsCommand({
        Bucket: target.bucket,
        Prefix: key,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      }),
      { abortSignal: operationSignal(includeRunSignal) },
    );
    for (const version of [...(listed.Versions || []), ...(listed.DeleteMarkers || [])]) {
      if (version.Key === key && version.VersionId) found.push({ Key: key, VersionId: version.VersionId });
    }
    if (!listed.IsTruncated) return found;
    if (!listed.NextKeyMarker || !listed.NextVersionIdMarker) {
      throw new SmokeFailure(`${scope} version listing omitted continuation markers`);
    }
    keyMarker = listed.NextKeyMarker;
    versionIdMarker = listed.NextVersionIdMarker;
  }
  throw new SmokeFailure(`${scope} version listing exceeded its page bound`);
}

async function adminDelete(scope, key, includeRunSignal = true) {
  const versions = await listExactVersions(scope, key, includeRunSignal);
  if (versions.length === 0) return;
  const deleted = await targets[scope].client.send(
    new DeleteObjectsCommand({ Bucket: targets[scope].bucket, Delete: { Objects: versions, Quiet: true } }),
    { abortSignal: operationSignal(includeRunSignal) },
  );
  if ((deleted.Errors?.length || 0) > 0) throw new SmokeFailure(`${scope} version cleanup returned errors`);
}

async function submitAssessment(endpoint, questionId, audioKey, label, cycleId) {
  const response = await apiRequest('POST', endpoint, {
    token: account.token,
    json: {
      questionId,
      requestId: randomUUID(),
      audioKey,
      retainRecording: true,
      ...(cycleId ? { cycleId } : {}),
    },
  });
  checkStatus(label, response, 200);
  check(`${label} returns a JSON object`, isRecord(response.body));
  check(`${label} returns a retained recording id`, isUuid(response.body?.recordingId));
  return response.body;
}

async function requestPlayback(recordingId, label) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await apiRequest('POST', `/recordings/${recordingId}/playback-url`, {
      token: account.token,
    });
    if (response.status === 200) return response;
    if (response.status !== 409 || response.body?.code !== 'REQUEST_IN_FLIGHT') return response;
    await delay(1_000);
  }
  throw new SmokeFailure(`${label} playback did not become ready`);
}

async function exerciseSuccessfulAssessment(endpoint, scope, questionId, audioBytes, label, cycleId) {
  const grant = await requestGrant(endpoint, scope, account.userId);
  const upload = await uploadSignedObject(grant, audioBytes);
  check(
    `${label} signed upload returns 2xx (observed HTTP ${upload.status}${upload.errorCode ? ` ${upload.errorCode}` : ''})`,
    upload.status >= 200 && upload.status < 300,
  );
  const assessment = await submitAssessment(endpoint, questionId, grant.audioKey, label, cycleId);
  check(`${label} object remains private after assessment`, await objectExists(scope, grant.audioKey));
  const retainedVersions = await listExactVersions(scope, grant.audioKey);
  let retainedTagFound = false;
  for (const version of retainedVersions) {
    const tags = await targets[scope].client.send(
      new GetObjectTaggingCommand({
        Bucket: targets[scope].bucket,
        Key: grant.audioKey,
        VersionId: version.VersionId,
      }),
      { abortSignal: operationSignal() },
    );
    if (tags.TagSet?.some((tag) => tag.Key === 'retention' && tag.Value === 'retained')) {
      retainedTagFound = true;
      break;
    }
  }
  check(`${label} exact S3 version is tagged for indefinite retention`, retainedTagFound);
  const listed = await apiRequest('GET', '/recordings?limit=50', { token: account.token });
  checkStatus(`${label} recording list`, listed, 200);
  check(
    `${label} recording list maps the owner question without storage coordinates`,
    listed.body?.items?.some(
      (item) =>
        item.id === assessment.recordingId &&
        item.questionId === questionId &&
        item.context &&
        !Object.hasOwn(item, 'audioKey') &&
        !Object.hasOwn(item, 's3VersionId'),
    ),
  );
  const playback = await requestPlayback(assessment.recordingId, label);
  checkStatus(`${label} playback grant`, playback, 200);
  check(
    `${label} playback grant is short-lived and storage-secret-free`,
    playback.body?.recordingId === assessment.recordingId &&
      typeof playback.body?.playbackUrl === 'string' &&
      Number.isInteger(playback.body?.expiresIn) &&
      playback.body.expiresIn > 0 &&
      playback.body.expiresIn <= 300 &&
      !Object.hasOwn(playback.body, 'audioKey') &&
      !Object.hasOwn(playback.body, 'bucket'),
  );
  const playbackResponse = await fetch(playback.body.playbackUrl, {
    signal: operationSignal(),
    redirect: 'manual',
  });
  const playedBytes = Buffer.from(await playbackResponse.arrayBuffer());
  check(
    `${label} signed playback URL returns the exact uploaded fixture`,
    playbackResponse.status === 200 && playedBytes.equals(Buffer.from(audioBytes)),
  );
  const deleted = await apiRequest('DELETE', `/recordings/${assessment.recordingId}`, { token: account.token });
  checkStatus(`${label} recording deletion`, deleted, 204);
  await waitForObjectMissing(scope, grant.audioKey, `${label} object is eventually deleted after owner deletion`);
  return assessment;
}

async function exerciseRejectedPolicyUpload(label, mutate) {
  const grant = await requestGrant(ENDPOINTS.diagnostic, 'diagnostic', account.userId);
  const { bytes, contentType } = mutate(grant);
  const upload = await uploadSignedObject(grant, bytes, { contentType });
  check(
    `${label} is rejected by the signed S3 policy (observed HTTP ${upload.status}${upload.errorCode ? ` ${upload.errorCode}` : ''})`,
    upload.status < 200 || upload.status >= 300,
  );
  await waitForObjectMissing('diagnostic', grant.audioKey, `${label} creates no S3 object`);
}

async function cleanupAccountBestEffort() {
  if (accountDeleted || !account) return true;
  let token = account.token;
  if (!token) {
    const login = await apiRequest('POST', '/auth/login', {
      json: { email: account.email, password: account.password },
      cleanup: true,
    });
    if (login.status !== 200 || typeof login.body?.token !== 'string') return false;
    token = login.body.token;
  }
  const deleted = await apiRequest('DELETE', '/auth/account', {
    token,
    json: { password: account.password },
    cleanup: true,
  });
  if (deleted.status === 204) {
    accountDeleted = true;
    return true;
  }
  return deleted.status === 401;
}

async function cleanupObjectsBestEffort() {
  let failures = 0;
  for (const { scope, key } of trackedObjects.values()) {
    try {
      await adminDelete(scope, key, false);
    } catch {
      failures += 1;
    }
  }
  return failures;
}

let clientVersion;
let mainFailure = null;
let cleanupFailures = 0;
let dbConnected = false;

try {
  const appConfig = JSON.parse(await readFile(new URL('../../app/app.json', import.meta.url), 'utf8'));
  clientVersion = appConfig?.expo?.version;
  if (typeof clientVersion !== 'string' || clientVersion.length === 0) {
    throw new SmokeFailure('app/app.json must contain expo.version');
  }

  const audioStats = await stat(audioFile);
  check('AUDIO_FILE is a non-empty regular file', audioStats.isFile() && audioStats.size > 0);
  check('AUDIO_FILE fits the server audio limit', audioStats.size <= MAX_AUDIO_BYTES);
  const audioBytes = await readFile(audioFile);

  await db.connect();
  dbConnected = true;

  account = {
    email: `live_s3_${Date.now()}_${randomUUID()}@example.com`,
    password: `LiveS3-${randomUUID()}-9a`,
    token: null,
    userId: null,
  };
  const registration = await apiRequest('POST', '/auth/register', {
    json: {
      name: 'Live S3 Acceptance',
      email: account.email,
      password: account.password,
      nativeLanguage: 'te',
    },
  });
  checkStatus('throwaway registration', registration, 201);
  account.token = registration.body?.token;
  account.userId = registration.body?.user?.id;
  check(
    'throwaway registration returns an isolated identity',
    typeof account.token === 'string' &&
      isUuid(account.userId) &&
      registration.body.user.email === account.email &&
      registration.body.user.diagnosticCompleted === false,
  );

  const diagnosticNext = await apiRequest('GET', '/diagnostic/next', { token: account.token });
  const diagnosticQuestion = questionFrom(diagnosticNext, 'diagnostic next');
  await exerciseSuccessfulAssessment(
    ENDPOINTS.diagnostic,
    'diagnostic',
    diagnosticQuestion.id,
    audioBytes,
    'diagnostic assessment',
  );

  const eligibility = await db.query(
    `UPDATE users
     SET diagnostic_completed = true, cefr_level = 'A1'
     WHERE id = $1 AND email = $2
     RETURNING id, cefr_level, diagnostic_completed`,
    [account.userId, account.email],
  );
  check(
    'database marks only the throwaway user eligible at A1',
    eligibility.rowCount === 1 &&
      eligibility.rows[0]?.id === account.userId &&
      eligibility.rows[0]?.cefr_level === 'A1' &&
      eligibility.rows[0]?.diagnostic_completed === true,
  );

  const practiceNext = await apiRequest('GET', '/practice/question', { token: account.token });
  const practiceQuestion = questionFrom(practiceNext, 'practice next for English mode');
  await exerciseSuccessfulAssessment(
    ENDPOINTS.practice,
    'practice',
    practiceQuestion.id,
    audioBytes,
    'English practice assessment',
    practiceNext.body.cycleId,
  );

  const nativeNext = await apiRequest('GET', '/practice/question', { token: account.token });
  const nativeQuestion = questionFrom(nativeNext, 'practice next for native mode');
  const nativeAssessment = await exerciseSuccessfulAssessment(
    ENDPOINTS.native,
    'practice',
    nativeQuestion.id,
    audioBytes,
    'native practice assessment',
    nativeNext.body.cycleId,
  );
  check('native practice response snapshots the submitted language', nativeAssessment.nativeLanguage === 'te');

  const crossScopeQuestionResponse = await apiRequest('GET', '/practice/question', {
    token: account.token,
  });
  const crossScopeQuestion = questionFrom(crossScopeQuestionResponse, 'practice next for scope isolation');
  const crossScopeGrant = await requestGrant(ENDPOINTS.diagnostic, 'diagnostic', account.userId);
  const crossScopeUpload = await uploadSignedObject(crossScopeGrant, audioBytes);
  check(
    `cross-scope diagnostic object upload returns 2xx (observed HTTP ${crossScopeUpload.status}${crossScopeUpload.errorCode ? ` ${crossScopeUpload.errorCode}` : ''})`,
    crossScopeUpload.status >= 200 && crossScopeUpload.status < 300,
  );
  check(
    'cross-scope diagnostic object exists before the negative submission',
    await objectExists('diagnostic', crossScopeGrant.audioKey),
  );
  const crossScopeResponse = await apiRequest('POST', ENDPOINTS.practice, {
    token: account.token,
    json: {
      questionId: crossScopeQuestion.id,
      requestId: randomUUID(),
      cycleId: crossScopeQuestionResponse.body.cycleId,
      audioKey: crossScopeGrant.audioKey,
      retainRecording: true,
    },
  });
  checkStatus('practice submission with diagnostic key', crossScopeResponse, 400);
  check(
    'practice scope rejection preserves the diagnostic object',
    await objectExists('diagnostic', crossScopeGrant.audioKey),
  );

  const unsignedResponse = await fetch(publicObjectUrl(crossScopeGrant.uploadUrl, crossScopeGrant.audioKey), {
    method: 'GET',
    redirect: 'manual',
    signal: operationSignal(),
  });
  await unsignedResponse.arrayBuffer();
  check('unsigned public GET is denied', unsignedResponse.status === 401 || unsignedResponse.status === 403);
  check(
    'unsigned GET denial leaves the diagnostic object intact',
    await objectExists('diagnostic', crossScopeGrant.audioKey),
  );
  await adminDelete('diagnostic', crossScopeGrant.audioKey);
  await waitForObjectMissing(
    'diagnostic',
    crossScopeGrant.audioKey,
    'admin DeleteObject removes the retained cross-scope object',
  );

  await exerciseRejectedPolicyUpload('zero-byte upload', (grant) => ({
    bytes: new Uint8Array(0),
    contentType: grant.contentType,
  }));
  await exerciseRejectedPolicyUpload('wrong Content-Type upload', () => ({
    bytes: audioBytes,
    contentType: audioContentType === 'audio/wav' ? 'audio/mp4' : 'audio/wav',
  }));

  const deleted = await apiRequest('DELETE', '/auth/account', {
    token: account.token,
    json: { password: account.password },
  });
  checkStatus('throwaway account deletion', deleted, 204);
  accountDeleted = true;
  check('acceptance run completed every required assertion', assertionCount > 0);
} catch (error) {
  mainFailure = error;
} finally {
  try {
    if (!(await cleanupAccountBestEffort())) cleanupFailures += 1;
  } catch {
    cleanupFailures += 1;
  }
  cleanupFailures += await cleanupObjectsBestEffort();
  if (dbConnected) {
    await db.end().catch(() => {
      cleanupFailures += 1;
    });
  }
  for (const target of Object.values(targets)) target.client.destroy();
  process.removeListener('SIGINT', onSigint);
  process.removeListener('SIGTERM', onSigterm);
}

if (mainFailure) {
  const message =
    mainFailure instanceof SmokeFailure ? mainFailure.message : 'unexpected internal acceptance-script error';
  console.error(`FAIL: live S3 acceptance (${assertionCount} assertions before failure): ${message}`);
  if (cleanupFailures > 0) {
    console.error(`cleanup: ${cleanupFailures} best-effort operation(s) did not complete`);
  }
  process.exitCode = 1;
} else if (interruptedBy) {
  console.error(`FAIL: live S3 acceptance interrupted by ${interruptedBy}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: live S3 acceptance (${assertionCount} assertions)`);
  if (cleanupFailures > 0) {
    console.error(`cleanup: ${cleanupFailures} best-effort operation(s) did not complete`);
    process.exitCode = 1;
  }
}
