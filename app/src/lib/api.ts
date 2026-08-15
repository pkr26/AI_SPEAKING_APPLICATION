import Constants from 'expo-constants';
import { File, UploadType } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { translate, type MessageKey } from './i18n';
import {
  audioKeyBelongsToOwner,
  ContractError,
  HISTORY_PAGE_LIMIT,
  parseAudioUploadGrant,
  parsePracticeHistory,
  parsePracticeStats,
  parseUserDataPage,
  parseUserResponse,
  type AudioUploadGrant,
  type HistoryPage,
  type NativeLanguage,
  type PracticeStats,
  type User,
} from './types';

const TOKEN_KEY = 'auth_token';
const TOKEN_KEYCHAIN_SERVICE = 'ai-english-coach.auth-token';
const TOKEN_STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: TOKEN_KEYCHAIN_SERVICE,
};
const JSON_TIMEOUT_MS = 20_000;
export const AUDIO_TIMEOUT_MS = 150_000;

type UnauthorizedHandler = (rejectedToken: string) => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let tokenSnapshot: string | null = null;
let tokenSnapshotReady = false;
let tokenStorageQueue: Promise<void> = Promise.resolve();

function developmentBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    try {
      const host = new URL(`http://${hostUri}`).hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        const bareHost = host.replace(/^\[|\]$/g, '');
        const formattedHost = bareHost.includes(':') ? `[${bareHost}]` : bareHost;
        return `http://${formattedHost}:4000`;
      }
    } catch {
      // Fall back to localhost for local development only.
    }
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configured && !__DEV__) {
    throw new Error('EXPO_PUBLIC_API_URL must be configured for production builds.');
  }

  const raw = configured || developmentBaseUrl();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL must be a valid absolute URL.');
  }

  if (url.protocol !== 'https:' && !(__DEV__ && url.protocol === 'http:')) {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTPS outside development.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('EXPO_PUBLIC_API_URL cannot contain credentials, a query, or a fragment.');
  }

  return url.toString().replace(/\/+$/, '');
}

export const API_URL = resolveBaseUrl();

/**
 * Machine-readable error codes the server attaches to error bodies. Older
 * server deployments may omit them; status-based mapping remains the fallback.
 */
export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  'UNAUTHENTICATED',
  'TOKEN_REVOKED',
  'FORBIDDEN',
  'NOT_FOUND',
  'QUESTION_MISMATCH',
  'DIAGNOSTIC_DONE',
  'REQUEST_IN_FLIGHT',
  'REQUEST_ID_REUSED',
  'ASSESSMENT_IN_PROGRESS',
  'STATE_CHANGED',
  'RATE_LIMITED',
  'DAILY_LIMIT',
  'NETWORK_DAILY_LIMIT',
  'CAPACITY_BUSY',
  'POOL_SATURATED',
  'AUDIO_INVALID',
  'AUDIO_TOO_LARGE',
  'AUDIO_TOO_LONG',
  'AUDIO_UNREADABLE',
  'PROVIDER_FAILED',
  'PROVIDER_TIMEOUT',
  'RESET_INVALID',
  'CLIENT_UPGRADE_REQUIRED',
  'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

const API_ERROR_CODE_SET: ReadonlySet<string> = new Set(API_ERROR_CODES);

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && API_ERROR_CODE_SET.has(value);
}

export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable error code from the response body, when present. */
  readonly code?: ApiErrorCode;
  /** Bounded server-supplied retry delay from the 503 backpressure contract. */
  readonly retryAfterSeconds?: number;
  /** Bounded server-supplied retry delay for daily limits, in hours. */
  readonly retryAfterHours?: number;

  constructor(
    status: number,
    message: string,
    retryAfterSeconds?: number,
    extra?: { code?: ApiErrorCode; retryAfterHours?: number },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.code = extra?.code;
    this.retryAfterHours = extra?.retryAfterHours;
  }
}

/** Localized message key for each machine-readable server error code. */
const CODE_MESSAGE_KEYS: Readonly<Record<ApiErrorCode, MessageKey>> = {
  VALIDATION_FAILED: 'error.validation',
  INVALID_CREDENTIALS: 'error.wrongCredentials',
  EMAIL_TAKEN: 'error.emailTaken',
  UNAUTHENTICATED: 'error.loginAgain',
  TOKEN_REVOKED: 'error.loginAgain',
  FORBIDDEN: 'error.forbidden',
  NOT_FOUND: 'error.notFound',
  QUESTION_MISMATCH: 'error.questionChanged',
  DIAGNOSTIC_DONE: 'error.diagnosticDone',
  REQUEST_IN_FLIGHT: 'error.stillChecking',
  REQUEST_ID_REUSED: 'error.alreadySent',
  ASSESSMENT_IN_PROGRESS: 'error.stillChecking',
  STATE_CHANGED: 'error.stateChanged',
  RATE_LIMITED: 'error.tooMany',
  DAILY_LIMIT: 'error.dailyLimit',
  NETWORK_DAILY_LIMIT: 'error.networkDailyLimit',
  CAPACITY_BUSY: 'error.busy',
  POOL_SATURATED: 'error.busy',
  AUDIO_INVALID: 'error.audioInvalid',
  AUDIO_TOO_LARGE: 'error.tooLarge',
  AUDIO_TOO_LONG: 'error.audioTooLong',
  AUDIO_UNREADABLE: 'error.audioUnreadable',
  PROVIDER_FAILED: 'error.checkFailed',
  PROVIDER_TIMEOUT: 'error.timeout',
  RESET_INVALID: 'error.resetInvalid',
  CLIENT_UPGRADE_REQUIRED: 'error.upgradeRequired',
  INTERNAL: 'error.internal',
};

/** Localized "Please wait N seconds/minutes/hours." from server retry hints. */
function retryWaitLine(error: ApiError): string | null {
  if (error.retryAfterHours !== undefined) {
    const hours = Math.max(1, Math.ceil(error.retryAfterHours));
    return hours === 1 ? translate('wait.hour') : translate('wait.hours', { count: hours });
  }
  if (error.retryAfterSeconds === undefined) return null;
  if (error.retryAfterSeconds >= 60) {
    const minutes = Math.ceil(error.retryAfterSeconds / 60);
    return minutes === 1 ? translate('wait.minute') : translate('wait.minutes', { count: minutes });
  }
  const seconds = Math.max(1, Math.ceil(error.retryAfterSeconds));
  return seconds === 1 ? translate('wait.second') : translate('wait.seconds', { count: seconds });
}

function withRetryWait(message: string, error: ApiError): string {
  const wait = retryWaitLine(error);
  return wait ? `${message} ${wait}` : message;
}

/**
 * Converts transport/API failures into localized copy that cannot expose
 * backend details. A machine-readable `code` from the server wins; the HTTP
 * status is the fallback for servers that do not send codes yet.
 */
export function userMessageForError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code) {
    return withRetryWait(translate(CODE_MESSAGE_KEYS[error.code]), error);
  }
  if (error.status === 0) {
    return translate('error.network');
  }
  if (error.status === 408) {
    return translate('error.timeout');
  }
  if (error.status === 413) {
    return translate('error.tooLarge');
  }
  if (error.status === 415) {
    return translate('error.unsupportedFormat');
  }
  if (error.status === 422) {
    return translate('error.cannotAssess');
  }
  if (error.status === 409) {
    return translate('error.conflict');
  }
  if (error.status === 429) {
    return withRetryWait(translate('error.tooMany'), error);
  }
  if (error.status >= 500) {
    return withRetryWait(translate('error.serverBusy'), error);
  }
  return fallback;
}

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export class TokenStorageReadError extends Error {
  constructor(cause: unknown) {
    super('Secure session storage is unavailable.', { cause });
    this.name = 'TokenStorageReadError';
  }
}

/**
 * SecureStore has no transactional API. Keep every token read/write ordered so
 * an older session cleanup can never overtake a newer login.
 */
function withTokenStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = tokenStorageQueue.then(operation, operation);
  tokenStorageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function getToken(): Promise<string | null> {
  return withTokenStorageLock(async () => {
    let stored: string | null;
    try {
      stored = await SecureStore.getItemAsync(TOKEN_KEY, TOKEN_STORAGE_OPTIONS);
    } catch (error) {
      throw new TokenStorageReadError(error);
    }
    tokenSnapshot = stored;
    tokenSnapshotReady = true;
    return stored;
  });
}

export async function saveToken(token: string): Promise<void> {
  await withTokenStorageLock(async () => {
    await SecureStore.setItemAsync(TOKEN_KEY, token, TOKEN_STORAGE_OPTIONS);
    tokenSnapshot = token;
    tokenSnapshotReady = true;
  });
}

/**
 * Deletes only the expected session when one is supplied. A stale 401 is
 * therefore harmless even when its cleanup runs after a newer login.
 */
export async function clearToken(expectedToken?: string): Promise<boolean> {
  return withTokenStorageLock(async () => {
    if (expectedToken !== undefined) {
      let current: string | null;
      try {
        current = await SecureStore.getItemAsync(TOKEN_KEY, TOKEN_STORAGE_OPTIONS);
      } catch (error) {
        throw new TokenStorageReadError(error);
      }
      tokenSnapshot = current;
      tokenSnapshotReady = true;
      if (current !== expectedToken) return false;
    }

    await SecureStore.deleteItemAsync(TOKEN_KEY, TOKEN_STORAGE_OPTIONS);
    tokenSnapshot = null;
    tokenSnapshotReady = true;
    return true;
  });
}

async function tokenForRequest(): Promise<string | null> {
  return tokenSnapshotReady ? tokenSnapshot : getToken();
}

function boundedSeconds(value: unknown, maxSeconds: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= maxSeconds
    ? value
    : undefined;
}

function parseRetryAfterSecondsHeader(
  header: string | null,
  maxSeconds: number,
): number | undefined {
  if (!header) return undefined;
  return boundedSeconds(Number(header), maxSeconds);
}

// The 503 backpressure contract (assess semaphore, pool shed) promises a small
// bounded delay; 429 rate/daily limits may legitimately ask for much longer.
const MAX_RETRY_AFTER_SECONDS_503 = 120;
const MAX_RETRY_AFTER_SECONDS_429 = 24 * 60 * 60;
const MAX_RETRY_AFTER_HOURS = 48;

async function throwForStatus(res: Response): Promise<never> {
  // Do not forward server or upstream-provider error bodies into the UI. The
  // only fields read are the machine-readable `code` (mapped to localized
  // copy by userMessageForError) and the bounded, non-sensitive retry delays
  // that drive the 429/503 "please wait" contract.
  const body: unknown = await res.json().catch(() => undefined);
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
  const code = isApiErrorCode(record?.code) ? record.code : undefined;

  let retryAfterSeconds: number | undefined;
  let retryAfterHours: number | undefined;
  if (res.status === 503 || res.status === 429) {
    const maxSeconds =
      res.status === 503 ? MAX_RETRY_AFTER_SECONDS_503 : MAX_RETRY_AFTER_SECONDS_429;
    retryAfterSeconds =
      parseRetryAfterSecondsHeader(res.headers.get('Retry-After'), maxSeconds) ??
      boundedSeconds(record?.retryAfterSeconds, maxSeconds);
    const hours = record?.retryAfterHours;
    if (
      typeof hours === 'number' &&
      Number.isFinite(hours) &&
      hours > 0 &&
      hours <= MAX_RETRY_AFTER_HOURS
    ) {
      retryAfterHours = hours;
    }
  }
  throw new ApiError(res.status, `Request failed with status ${res.status}`, retryAfterSeconds, {
    code,
    retryAfterHours,
  });
}

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Every API request identifies its build so the server's MIN_CLIENT_VERSION
 * gate (426 CLIENT_UPGRADE_REQUIRED) can actually retire old versions. When
 * expoConfig carries no version (should not happen in built clients), the
 * header is omitted rather than sent as the literal string "undefined".
 * Direct-to-S3 uploads never get this header — they go to AWS, not our API.
 */
function clientVersionHeader(): Record<string, string> {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version.length > 0 ? { 'X-Client-Version': version } : {};
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    abortFromCaller();
  } else {
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new ApiError(408, 'The request timed out. Please check your connection and try again.');
    }
    if (externalSignal?.aborted) throw error;
    throw new ApiError(0, 'Could not connect to the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromCaller);
  }
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Public endpoints neither read nor attach a persisted session token. */
  auth?: boolean;
  /** Some authenticated endpoints use 401 for credential confirmation errors. */
  expireSessionOn401?: boolean;
}

function handleUnauthorized(status: number, token: string | null, enabled: boolean): void {
  if (status === 401 && token && enabled) {
    unauthorizedHandler?.(token);
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  const token = useAuth ? await tokenForRequest() : null;
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...clientVersionHeader(),
        ...authHeader(token),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    },
    options.timeoutMs ?? JSON_TIMEOUT_MS,
    options.signal,
  );
  if (!res.ok) {
    handleUnauthorized(res.status, token, options.expireSessionOn401 !== false);
    await throwForStatus(res);
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(502, 'The server returned an invalid response');
  }
}

// Browser MediaRecorder output varies by engine — Safari emits MP4/AAC while
// Chrome emits WebM — and blob: URLs carry no extension. Name/type pairs the
// server allowlist accepts, keyed by the recorded Blob's base MIME type.
const WEB_BLOB_DESCRIPTORS: Record<string, { name: string; type: string }> = {
  'audio/mp4': { name: 'audio.m4a', type: 'audio/mp4' },
  'audio/m4a': { name: 'audio.m4a', type: 'audio/m4a' },
  'audio/x-m4a': { name: 'audio.m4a', type: 'audio/x-m4a' },
  'audio/webm': { name: 'audio.webm', type: 'audio/webm' },
  'audio/wav': { name: 'audio.wav', type: 'audio/wav' },
  'audio/ogg': { name: 'audio.ogg', type: 'audio/ogg' },
  'audio/mpeg': { name: 'audio.mp3', type: 'audio/mpeg' },
};

export function audioFileDescriptor(
  audioUri: string,
  blobType?: string,
): {
  name: string;
  type: string;
} {
  if (blobType) {
    // MediaRecorder may append codec parameters (audio/webm;codecs=opus).
    const descriptor = WEB_BLOB_DESCRIPTORS[blobType.split(';', 1)[0].trim().toLowerCase()];
    if (descriptor) return descriptor;
  }
  const path = audioUri.split(/[?#]/, 1)[0].toLowerCase();
  if (Platform.OS === 'web' || path.endsWith('.webm')) {
    return { name: 'audio.webm', type: 'audio/webm' };
  }
  if (path.endsWith('.wav')) {
    return { name: 'audio.wav', type: 'audio/wav' };
  }
  if (path.endsWith('.3gp') || path.endsWith('.aac')) {
    // The transcription endpoint does not document 3GP or raw AAC as accepted
    // inputs. Expo's configured native recorder emits M4A; fail locally if a
    // device ever returns either format instead.
    throw new ApiError(415, 'Unsupported recording format');
  }
  return { name: 'audio.m4a', type: 'audio/mp4' };
}

/**
 * Resolves the descriptor an upload grant is requested with. On web the
 * recorded Blob is the only source of truth for the container MediaRecorder
 * chose; native recordings are described by their file URI alone.
 */
export async function resolveAudioFileDescriptor(audioUri: string): Promise<{
  name: string;
  type: string;
}> {
  if (Platform.OS !== 'web') return audioFileDescriptor(audioUri);
  try {
    const blob = await (await fetch(audioUri)).blob();
    return audioFileDescriptor(audioUri, blob.type);
  } catch {
    // A lost blob is reported as a definite failure by the upload step; the
    // grant request itself must not fail on it.
    return audioFileDescriptor(audioUri);
  }
}

export async function apiUploadAudio<T>(
  path: string,
  audioUri: string,
  fields: Record<string, string>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const token = await tokenForRequest();
  const form = new FormData();
  if (Platform.OS === 'web') {
    const audioResponse = await fetch(audioUri);
    const blob = await audioResponse.blob();
    // The recorded Blob names the upload so Safari's MP4 output is not
    // declared as WebM and rejected by the server allowlist.
    form.append('audio', blob, audioFileDescriptor(audioUri, blob.type).name);
  } else {
    const descriptor = audioFileDescriptor(audioUri);
    // Mirror the presigned-upload check: if the OS evicted the cached
    // recording, fail as a definite local 400 instead of an ambiguous network
    // error that would trigger minutes of pointless recovery polling.
    if (!new File(audioUri).exists) {
      throw new ApiError(400, 'The recording is unavailable');
    }
    // React Native's FormData accepts { uri, name, type } file descriptors.
    form.append('audio', {
      uri: audioUri,
      ...descriptor,
    } as unknown as Blob);
  }
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method: 'POST',
      // Do not set Content-Type manually; fetch adds the multipart boundary.
      headers: { ...clientVersionHeader(), ...authHeader(token) },
      body: form,
    },
    options.timeoutMs ?? AUDIO_TIMEOUT_MS,
    options.signal,
  );
  if (!res.ok) {
    handleUnauthorized(res.status, token, true);
    await throwForStatus(res);
  }
  try {
    return (await res.json()) as T;
  } catch {
    // A 2xx assessment may already be committed. Recorder keeps the audio and
    // idempotency key so retrying safely replays the durable server response.
    throw new ApiError(502, 'The server returned an invalid response');
  }
}

/**
 * Ask the API where this recording should go. In production the API grants a
 * short-lived, size-constrained S3 POST grant; in local dev it answers `direct` and the
 * caller falls back to multipart upload (`apiUploadAudio`).
 */
export async function apiRequestAudioUpload(
  contentType: string,
  ownerId: string,
  options: { signal?: AbortSignal } = {},
): Promise<AudioUploadGrant> {
  const raw = await apiFetch<unknown>('/uploads/audio-url', {
    method: 'POST',
    body: { contentType },
    signal: options.signal,
  });
  const grant = parseAudioUploadGrant(raw);
  if (grant.mode === 's3') {
    if (
      grant.contentType !== contentType.trim().toLowerCase() ||
      !audioKeyBelongsToOwner(grant.audioKey, ownerId)
    ) {
      throw new ContractError();
    }
  }
  return grant;
}

/**
 * POST the recording straight to S3 using a policy-constrained multipart form.
 * No Authorization header: the signed form fields carry the grant.
 */
export async function apiPostPresignedAudio(
  uploadUrl: string,
  uploadFields: Record<string, string>,
  audioUri: string,
  contentType: string,
  maxBytes: number,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<void> {
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    uploadFields['Content-Type'] !== contentType ||
    Object.keys(uploadFields).some((key) => key.toLowerCase() === 'file')
  ) {
    throw new ContractError();
  }

  if (Platform.OS !== 'web') {
    const file = new File(audioUri);
    if (
      !file.exists ||
      typeof file.size !== 'number' ||
      !Number.isFinite(file.size) ||
      file.size <= 0
    ) {
      throw new ApiError(400, 'The recording is unavailable');
    }
    if (file.size > maxBytes) {
      throw new ApiError(413, 'The recording is too large');
    }
    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) {
      abortFromCaller();
    } else {
      options.signal?.addEventListener('abort', abortFromCaller, {
        once: true,
      });
    }
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? AUDIO_TIMEOUT_MS);
    let result: Awaited<ReturnType<File['upload']>>;
    try {
      result = await file.upload(uploadUrl, {
        httpMethod: 'POST',
        uploadType: UploadType.MULTIPART,
        fieldName: 'file',
        mimeType: contentType,
        parameters: uploadFields,
        sessionType: 'foreground',
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) {
        throw new ApiError(408, 'The recording upload timed out');
      }
      if (options.signal?.aborted) throw error;
      throw new ApiError(0, 'Could not upload the recording');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortFromCaller);
    }
    if (result.status < 200 || result.status >= 300) {
      throw new ApiError(result.status, `Request failed with status ${result.status}`);
    }
    return;
  }

  const audioResponse = await fetchWithTimeout(
    audioUri,
    {},
    options.timeoutMs ?? AUDIO_TIMEOUT_MS,
    options.signal,
  );
  if (!audioResponse.ok) await throwForStatus(audioResponse);
  const body = await audioResponse.blob();
  if (body.size === 0) {
    // A lost or evicted blob is the web analogue of the missing native file:
    // a definite local failure that means "record again", not "record less".
    throw new ApiError(400, 'The recording is unavailable');
  }
  if (body.size > maxBytes) {
    throw new ApiError(413, 'The recording is too large');
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(uploadFields)) {
    form.append(key, value);
  }
  form.append('file', body, audioFileDescriptor(audioUri, body.type).name);
  const res = await fetchWithTimeout(
    uploadUrl,
    { method: 'POST', body: form },
    options.timeoutMs ?? AUDIO_TIMEOUT_MS,
    options.signal,
  );
  if (!res.ok) await throwForStatus(res);
}

// ----- Typed endpoint helpers -----
// Screens call these instead of hand-rolling apiFetch + parser pairs, so
// contract drift fails loudly in exactly one place per endpoint.

/** Home-screen mastery/streak/due statistics. */
export async function apiGetPracticeStats(signal?: AbortSignal): Promise<PracticeStats> {
  return parsePracticeStats(await apiFetch<unknown>('/practice/stats', { signal }));
}

/** One newest-first page of attempt history; pass the previous nextCursor to page older. */
export async function apiGetPracticeHistory(
  cursor?: string,
  signal?: AbortSignal,
): Promise<HistoryPage> {
  const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
  return parsePracticeHistory(
    await apiFetch<unknown>(`/practice/history?limit=${HISTORY_PAGE_LIMIT}${cursorParam}`, {
      signal,
    }),
  );
}

/** Defers the current word for a week and frees the queue for the next one. */
export async function apiSkipPracticeWord(questionId: string): Promise<void> {
  await apiFetch<void>('/practice/skip', {
    method: 'POST',
    body: { questionId },
  });
}

/** Always succeeds with 204 (no account enumeration); errors are transport/rate-limit only. */
export async function apiForgotPassword(email: string): Promise<void> {
  await apiFetch<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export async function apiResetPassword(
  email: string,
  token: string,
  newPassword: string,
): Promise<void> {
  await apiFetch<void>('/auth/reset-password', {
    method: 'POST',
    body: { email, token, newPassword },
    auth: false,
  });
}

/** Updates name and/or native language; returns the server's updated user. */
export async function apiUpdateProfile(update: {
  name?: string;
  nativeLanguage?: NativeLanguage;
}): Promise<User> {
  return parseUserResponse(
    await apiFetch<unknown>('/auth/me', {
      method: 'PATCH',
      body: update,
    }),
  ).user;
}

/** Resets the placement test; practice history and progress are kept. */
export async function apiRestartDiagnostic(): Promise<void> {
  await apiFetch<void>('/diagnostic/restart', {
    method: 'POST',
    body: { confirm: true },
  });
}

// The export walker refuses to loop forever on a server that keeps handing
// out cursors; the server caps each page at 100 rows, so 500 pages bound the
// walk at 50k attempt rows — far beyond any real account.
const EXPORT_MAX_PAGES = 500;

/**
 * Walks every page of GET /auth/me/data and returns the combined export.
 * Repeated or excessive cursors abort as contract errors instead of spinning.
 */
export async function apiExportUserData(
  signal?: AbortSignal,
): Promise<{ user: User; attempts: Record<string, unknown>[] }> {
  const attempts: Record<string, unknown>[] = [];
  let user: User | null = null;
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const cursorParam: string = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const data = parseUserDataPage(
      await apiFetch<unknown>(`/auth/me/data${cursorParam}`, { signal }),
    );
    user ??= data.user;
    attempts.push(...data.attempts);
    if (data.nextCursor === null) return { user, attempts };
    if (seenCursors.has(data.nextCursor)) throw new ContractError();
    seenCursors.add(data.nextCursor);
    cursor = data.nextCursor;
  }
  throw new ContractError();
}
