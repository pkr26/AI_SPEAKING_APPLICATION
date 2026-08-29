import Constants from 'expo-constants';
import { File, UploadType } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { translate, type MessageKey } from './i18n';
import { latchClientUpgradeRequired } from './client-upgrade-store';
import {
  audioKeyBelongsToOwner,
  audioKeyMatchesAssessmentEndpoint,
  ContractError,
  HISTORY_PAGE_LIMIT,
  parseAudioUploadGrant,
  parsePracticeHistory,
  parsePracticeStats,
  parseRecordingExportPage,
  parseRecordingPage,
  parseRecordingPlaybackGrant,
  parseUserDataPage,
  parseUserResponse,
  type AudioUploadGrant,
  type HistoryPage,
  type NativeLanguage,
  type PracticeStats,
  type RecordingExportPage,
  type RecordingPage,
  type RecordingPlaybackGrant,
  type UiLanguage,
  type User,
  type UserDataPage,
} from './types';
import type { AssessmentEndpoint } from './pending-assessment';

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
  // An empty-but-present query or fragment ('https://api.example.com/api?')
  // reads back as '' from url.search/url.hash but still serializes into href,
  // so the raw value is what gets checked: a trailing '?' or '#' would
  // otherwise swallow every request path instead of failing fast here.
  if (raw.includes('?') || raw.includes('#') || url.username || url.password) {
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
  'ASSESSMENT_RESULT_INCOMPATIBLE',
  'PRACTICE_CYCLE_CLOSED',
  'STATE_CHANGED',
  'RATE_LIMITED',
  'DAILY_LIMIT',
  'NETWORK_DAILY_LIMIT',
  'CAPACITY_BUSY',
  'POOL_SATURATED',
  'AUDIO_INVALID',
  'AUDIO_SILENT',
  'AUDIO_UPLOAD_MISSING',
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
  ASSESSMENT_RESULT_INCOMPATIBLE: 'error.assessmentResultIncompatible',
  PRACTICE_CYCLE_CLOSED: 'error.stateChanged',
  STATE_CHANGED: 'error.stateChanged',
  RATE_LIMITED: 'error.tooMany',
  DAILY_LIMIT: 'error.dailyLimit',
  NETWORK_DAILY_LIMIT: 'error.networkDailyLimit',
  CAPACITY_BUSY: 'error.busy',
  POOL_SATURATED: 'error.busy',
  AUDIO_INVALID: 'error.audioInvalid',
  AUDIO_SILENT: 'error.audioSilent',
  AUDIO_UPLOAD_MISSING: 'error.audioInvalid',
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
  // express-rate-limit emits only a Retry-After header, so hour-scale 429s
  // (the per-network daily cap) reach us as seconds and must not be rendered
  // as "1440 minutes".
  if (error.retryAfterSeconds >= 3600) {
    const hours = Math.ceil(error.retryAfterSeconds / 3600);
    return hours === 1 ? translate('wait.hour') : translate('wait.hours', { count: hours });
  }
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

async function readStoredTokenUnsafe(): Promise<string | null> {
  let stored: string | null;
  try {
    stored = await SecureStore.getItemAsync(TOKEN_KEY, TOKEN_STORAGE_OPTIONS);
  } catch (error) {
    throw new TokenStorageReadError(error);
  }
  tokenSnapshot = stored;
  tokenSnapshotReady = true;
  return stored;
}

export async function getToken(): Promise<string | null> {
  return withTokenStorageLock(readStoredTokenUnsafe);
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
  // Joining the same queue is important even when a snapshot already exists:
  // a request invoked after saveToken/clearToken must observe that operation,
  // not race ahead with the snapshot it is replacing.
  return withTokenStorageLock(async () =>
    tokenSnapshotReady ? tokenSnapshot : readStoredTokenUnsafe(),
  );
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

function removeAbortListener(signal: AbortSignal | undefined, listener: () => void): void {
  try {
    signal?.removeEventListener('abort', listener);
  } catch {
    // Listener cleanup is best effort. A nonstandard signal must never mask
    // or strand an otherwise settled request, body read, or native upload.
  }
}

// The 409 in-flight and 503 backpressure contracts promise small bounded
// delays; 429 rate/daily limits may legitimately ask for much longer.
const MAX_RETRY_AFTER_SECONDS_503 = 120;
const MAX_RETRY_AFTER_SECONDS_429 = 24 * 60 * 60;
const MAX_RETRY_AFTER_SECONDS_REQUEST_IN_FLIGHT = 120;
const MAX_RETRY_AFTER_HOURS = 48;

/**
 * `fetch()` resolves once response headers arrive, so its timeout does not
 * protect a server that holds a JSON/blob body open forever. Bound body reads
 * separately and cancel the stream where the platform exposes one. This also
 * lets a caller cancellation stop a local web Blob read before it can reach an
 * assessment endpoint.
 */
function readResponseBody<T>(
  res: Response,
  read: () => Promise<T>,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cancelBody = () => {
      try {
        const body = res.body;
        if (body) void Promise.resolve(body.cancel()).catch(() => undefined);
      } catch {
        // Stream cancellation is a best-effort resource cleanup. The caller's
        // timeout/abort result must still settle even on a nonstandard fetch
        // implementation whose body cannot be cancelled.
      }
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      removeAbortListener(externalSignal, abortFromCaller);
      callback();
    };
    const abortFromCaller = () => {
      cancelBody();
      finish(() =>
        reject(
          externalSignal!.reason ?? new DOMException('The operation was aborted.', 'AbortError'),
        ),
      );
    };
    const timeout = setTimeout(() => {
      cancelBody();
      finish(() =>
        reject(
          new ApiError(408, 'The response timed out. Please check your connection and try again.'),
        ),
      );
    }, timeoutMs);

    if (externalSignal?.aborted) {
      abortFromCaller();
      return;
    }
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
    void Promise.resolve()
      .then(read)
      .then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
  });
}

function readJsonBody(
  res: Response,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<unknown> {
  return readResponseBody(res, () => res.json(), timeoutMs, externalSignal);
}

async function throwForStatus(
  res: Response,
  timeoutMs = JSON_TIMEOUT_MS,
  externalSignal?: AbortSignal,
  source: 'external' | 'first-party-api' = 'external',
): Promise<never> {
  // Do not forward server or upstream-provider error bodies into the UI. The
  // only fields read are the machine-readable `code` (mapped to localized
  // copy by userMessageForError) and the bounded, non-sensitive retry delays
  // that drive the 409/429/503 "please wait" contracts.
  let body: unknown;
  try {
    body = await readJsonBody(res, timeoutMs, externalSignal);
  } catch (error) {
    // A malformed error body is deliberately ignored, but a timed-out or
    // cancelled body must retain its transport meaning instead of becoming an
    // arbitrary HTTP error.
    if (error instanceof ApiError || externalSignal?.aborted) throw error;
    body = undefined;
  }
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
  const code = isApiErrorCode(record?.code) ? record.code : undefined;

  // Only our own API contract can retire this build. A blob URL, signed S3
  // upload, captive portal, or other external response must never be able to
  // display the non-dismissible update UI, even if it returns look-alike JSON.
  if (source === 'first-party-api' && res.status === 426 && code === 'CLIENT_UPGRADE_REQUIRED') {
    latchClientUpgradeRequired();
  }

  let retryAfterSeconds: number | undefined;
  let retryAfterHours: number | undefined;
  if (
    res.status === 503 ||
    res.status === 429 ||
    (res.status === 409 && code === 'REQUEST_IN_FLIGHT')
  ) {
    const maxSeconds =
      res.status === 429
        ? MAX_RETRY_AFTER_SECONDS_429
        : res.status === 503
          ? MAX_RETRY_AFTER_SECONDS_503
          : MAX_RETRY_AFTER_SECONDS_REQUEST_IN_FLIGHT;
    retryAfterSeconds =
      parseRetryAfterSecondsHeader(res.headers.get('Retry-After'), maxSeconds) ??
      boundedSeconds(record?.retryAfterSeconds, maxSeconds);
  }
  // Only rate/daily-limit responses define an hours-scale retry contract.
  // REQUEST_IN_FLIGHT is deliberately seconds-only even if a malformed peer
  // attaches both fields.
  if (res.status === 429) {
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
  let abortCause: 'caller' | 'timeout' | null = null;
  const abortFromCaller = () => {
    // Preserve the first terminal cause. A platform may reject fetch only
    // after its cancellation has crossed the timeout boundary.
    if (abortCause !== null) return;
    abortCause = 'caller';
    controller.abort(externalSignal!.reason);
  };

  if (externalSignal?.aborted) {
    abortFromCaller();
  } else {
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeout = setTimeout(() => {
    if (abortCause !== null) return;
    abortCause = 'timeout';
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (abortCause === 'timeout') {
      throw new ApiError(408, 'The request timed out. Please check your connection and try again.');
    }
    if (abortCause === 'caller') throw error;
    throw new ApiError(0, 'Could not connect to the server. Check your connection and try again.');
  } finally {
    clearTimeout(timeout);
    removeAbortListener(externalSignal, abortFromCaller);
  }
}

/** Remaining portion of one end-to-end transport budget after an earlier step. */
function remainingTimeoutMs(startedAt: number, totalTimeoutMs: number): number {
  return Math.max(1, totalTimeoutMs - (Date.now() - startedAt));
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
  /** Called immediately before the request can reach the API. */
  onRequestStarted?: () => void;
  /** Require one exact successful HTTP status before accepting the response. */
  expectedStatus?: number;
}

function handleUnauthorized(status: number, token: string | null, enabled: boolean): void {
  if (status === 401 && token && enabled) {
    unauthorizedHandler?.(token);
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  const token = useAuth ? await tokenForRequest() : null;
  return apiFetchWithToken(path, options, token);
}

/** Executes one API request with a token already resolved by its caller. */
async function apiFetchWithToken<T>(
  path: string,
  options: ApiFetchOptions,
  token: string | null,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? JSON_TIMEOUT_MS;
  const startedAt = Date.now();
  if (!options.signal?.aborted) options.onRequestStarted?.();
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method: options.method ?? 'GET',
      // API requests carry a bearer token. A deployment redirect must fail
      // closed instead of relying on platform-specific redirect behavior to
      // strip that credential before crossing an origin boundary.
      redirect: 'error',
      // Never let a platform cache turn an API GET into a conditional request
      // whose raw 304 has no JSON body for the endpoint contract to parse.
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...clientVersionHeader(),
        ...authHeader(token),
      },
      // JSON.stringify(undefined) already returns undefined. Reading the body
      // once also prevents a hostile accessor from changing between a presence
      // check and serialization.
      body: JSON.stringify(options.body),
    },
    timeoutMs,
    options.signal,
  );
  if (!res.ok) {
    handleUnauthorized(res.status, token, options.expireSessionOn401 !== false);
    await throwForStatus(
      res,
      remainingTimeoutMs(startedAt, timeoutMs),
      options.signal,
      'first-party-api',
    );
  }
  if (options.expectedStatus !== undefined && res.status !== options.expectedStatus) {
    throw new ApiError(502, 'The server returned an invalid response');
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await readJsonBody(res, remainingTimeoutMs(startedAt, timeoutMs), options.signal)) as T;
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error;
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
export async function resolveAudioFileDescriptor(
  audioUri: string,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{
  name: string;
  type: string;
}> {
  if (Platform.OS !== 'web') return audioFileDescriptor(audioUri);
  const timeoutMs = options.timeoutMs ?? AUDIO_TIMEOUT_MS;
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(audioUri, {}, timeoutMs, options.signal);
    const blob = await readResponseBody(
      response,
      () => response.blob(),
      remainingTimeoutMs(startedAt, timeoutMs),
      options.signal,
    );
    return audioFileDescriptor(audioUri, blob.type);
  } catch (error) {
    // Cancellation is a control-flow signal, not an unknown recording type.
    // Propagate it so Recorder returns the take to the learner rather than
    // continuing into an upload-grant request after they pressed Cancel.
    if (options.signal?.aborted || (error instanceof ApiError && error.status === 408)) {
      throw error;
    }
    // A lost blob is reported as a definite failure by the upload step; the
    // grant request itself must not fail on it.
    return audioFileDescriptor(audioUri);
  }
}

export async function apiUploadAudio<T>(
  path: string,
  audioUri: string,
  fields: Record<string, string>,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    /** Called immediately before the multipart request can reach the API. */
    onRequestStarted?: () => void;
  } = {},
): Promise<T> {
  const token = await tokenForRequest();
  const timeoutMs = options.timeoutMs ?? AUDIO_TIMEOUT_MS;
  const startedAt = Date.now();
  const form = new FormData();
  if (Platform.OS === 'web') {
    const audioResponse = await fetchWithTimeout(audioUri, {}, timeoutMs, options.signal);
    if (audioResponse.ok === false) {
      await throwForStatus(audioResponse, remainingTimeoutMs(startedAt, timeoutMs), options.signal);
    }
    const blob = await readResponseBody(
      audioResponse,
      () => audioResponse.blob(),
      remainingTimeoutMs(startedAt, timeoutMs),
      options.signal,
    );
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
  // Web has to read the local Blob before this point. Do not mark an
  // assessment as possibly committed until the actual API request is about to
  // start: cancelling during that local read is safe to return to `recorded`.
  if (!options.signal?.aborted) options.onRequestStarted?.();
  const res = await fetchWithTimeout(
    `${API_URL}${path}`,
    {
      method: 'POST',
      // This multipart request includes the bearer token, so follow the same
      // fail-closed redirect policy as JSON API calls.
      redirect: 'error',
      // Do not set Content-Type manually; fetch adds the multipart boundary.
      headers: { ...clientVersionHeader(), ...authHeader(token) },
      body: form,
    },
    remainingTimeoutMs(startedAt, timeoutMs),
    options.signal,
  );
  if (!res.ok) {
    handleUnauthorized(res.status, token, true);
    await throwForStatus(
      res,
      remainingTimeoutMs(startedAt, timeoutMs),
      options.signal,
      'first-party-api',
    );
  }
  try {
    return (await readJsonBody(res, remainingTimeoutMs(startedAt, timeoutMs), options.signal)) as T;
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error;
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
  options: { assessmentEndpoint: AssessmentEndpoint; signal?: AbortSignal },
): Promise<AudioUploadGrant> {
  const raw = await apiFetch<unknown>('/uploads/audio-url', {
    method: 'POST',
    body: { contentType, assessmentEndpoint: options.assessmentEndpoint },
    signal: options.signal,
  });
  const grant = parseAudioUploadGrant(raw);
  if (grant.assessmentEndpoint !== options.assessmentEndpoint) throw new ContractError();
  if (grant.mode === 's3') {
    if (
      grant.contentType !== contentType.trim().toLowerCase() ||
      !audioKeyBelongsToOwner(grant.audioKey, ownerId) ||
      !audioKeyMatchesAssessmentEndpoint(grant.audioKey, options.assessmentEndpoint)
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
    // Expo exposes size through a live native getter. Snapshot it once so an
    // evicted/replaced file cannot pass one validation read and a different
    // limit read (TOCTOU).
    const fileSize = file.size;
    if (
      !file.exists ||
      typeof fileSize !== 'number' ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      throw new ApiError(400, 'The recording is unavailable');
    }
    if (fileSize > maxBytes) {
      throw new ApiError(413, 'The recording is too large');
    }
    const controller = new AbortController();
    let abortCause: 'caller' | 'timeout' | null = null;
    const abortFromCaller = () => {
      // Native cancellation can settle asynchronously too. Do not let the
      // later deadline relabel an earlier learner cancellation as a timeout.
      if (abortCause !== null) return;
      abortCause = 'caller';
      controller.abort(options.signal!.reason);
    };
    if (options.signal?.aborted) {
      abortFromCaller();
    } else {
      options.signal?.addEventListener('abort', abortFromCaller, {
        once: true,
      });
    }
    const timeout = setTimeout(() => {
      if (abortCause !== null) return;
      abortCause = 'timeout';
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
      if (abortCause === 'timeout') {
        throw new ApiError(408, 'The recording upload timed out');
      }
      if (abortCause === 'caller') throw error;
      throw new ApiError(0, 'Could not upload the recording');
    } finally {
      clearTimeout(timeout);
      removeAbortListener(options.signal, abortFromCaller);
    }
    if (result.status < 200 || result.status >= 300) {
      throw new ApiError(result.status, `Request failed with status ${result.status}`);
    }
    return;
  }

  const timeoutMs = options.timeoutMs ?? AUDIO_TIMEOUT_MS;
  const startedAt = Date.now();
  const audioResponse = await fetchWithTimeout(audioUri, {}, timeoutMs, options.signal);
  if (!audioResponse.ok) {
    await throwForStatus(audioResponse, remainingTimeoutMs(startedAt, timeoutMs), options.signal);
  }
  const body = await readResponseBody(
    audioResponse,
    () => audioResponse.blob(),
    remainingTimeoutMs(startedAt, timeoutMs),
    options.signal,
  );
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
    remainingTimeoutMs(startedAt, timeoutMs),
    options.signal,
  );
  if (!res.ok) {
    await throwForStatus(res, remainingTimeoutMs(startedAt, timeoutMs), options.signal);
  }
}

// ----- Typed endpoint helpers -----
// Screens call these instead of hand-rolling apiFetch + parser pairs, so
// contract drift fails loudly in exactly one place per endpoint.

/** Home-screen mastery/streak/due statistics. */
export async function apiGetPracticeStats(signal?: AbortSignal): Promise<PracticeStats> {
  let timeZone = 'UTC';
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof resolved === 'string' && resolved.trim().length > 0 && resolved.length <= 100) {
      timeZone = resolved;
    }
  } catch {
    // Older runtimes can lack full Intl timezone data; UTC remains explicit.
  }
  return parsePracticeStats(
    await apiFetch<unknown>(`/practice/stats?timeZone=${encodeURIComponent(timeZone)}`, { signal }),
  );
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

/** One newest-first page of retained owner recordings. */
export async function apiGetRecordings(
  cursor?: string,
  signal?: AbortSignal,
): Promise<RecordingPage> {
  const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
  return parseRecordingPage(
    await apiFetch<unknown>(`/recordings?limit=${HISTORY_PAGE_LIMIT}${cursorParam}`, { signal }),
  );
}

/** Lazily issues one short-lived, owner-bound S3 playback capability. */
export async function apiGetRecordingPlaybackGrant(
  recordingId: string,
  signal?: AbortSignal,
): Promise<RecordingPlaybackGrant> {
  return parseRecordingPlaybackGrant(
    await apiFetch<unknown>(`/recordings/${encodeURIComponent(recordingId)}/playback-url`, {
      method: 'POST',
      signal,
    }),
    recordingId,
  );
}

/** Idempotently removes one owner recording while retaining assessment text. */
export async function apiDeleteRecording(recordingId: string, signal?: AbortSignal): Promise<void> {
  await apiFetch<void>(`/recordings/${encodeURIComponent(recordingId)}`, {
    method: 'DELETE',
    signal,
    expectedStatus: 204,
  });
}

/** Idempotently removes every retained recording owned by the current account. */
export async function apiDeleteAllRecordings(signal?: AbortSignal): Promise<void> {
  await apiFetch<void>('/recordings', {
    method: 'DELETE',
    signal,
    expectedStatus: 204,
  });
}

/** Defers the current word for a week and frees the queue for the next one. */
export async function apiSkipPracticeWord(questionId: string, cycleId: string): Promise<void> {
  await apiFetch<void>('/practice/skip', {
    method: 'POST',
    body: { questionId, cycleId },
    expectedStatus: 204,
  });
}

/** Always succeeds with 204 (no account enumeration); errors are transport/rate-limit only. */
export async function apiForgotPassword(email: string): Promise<void> {
  await apiFetch<void>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
    expectedStatus: 204,
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
    expectedStatus: 204,
  });
}

/** Updates independent profile/UI preferences; returns the server's updated user. */
export async function apiUpdateProfile(update: {
  name?: string;
  nativeLanguage?: NativeLanguage;
  uiLanguage?: UiLanguage;
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
    expectedStatus: 204,
  });
}

/** Durably acknowledges the completed placement reveal before Home unlocks. */
export async function apiAcknowledgeDiagnostic(): Promise<void> {
  await apiFetch<void>('/diagnostic/acknowledge', {
    method: 'POST',
    expectedStatus: 204,
  });
}

// Each independent export stream refuses to loop forever on a server that
// keeps handing out cursors. Requesting the server maximum of 500 rows and
// allowing 10,000 pages bounds each stream at 5,000,000 rows.
const EXPORT_PAGE_LIMIT = 500;
const EXPORT_MAX_PAGES = 10_000;

export type UserDataPageConsumer = (page: UserDataPage, pageIndex: number) => void | Promise<void>;
export type RecordingExportPageConsumer = (
  page: RecordingExportPage,
  pageIndex: number,
) => void | Promise<void>;

async function consumeUserDataPagesWithToken(
  token: string | null,
  consumePage: UserDataPageConsumer,
  signal?: AbortSignal,
  maxPages = EXPORT_MAX_PAGES,
): Promise<void> {
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > EXPORT_MAX_PAGES) {
    throw new ContractError();
  }
  let userId: string | null = null;
  let emittedPage = 0;

  const assertOwner = (data: UserDataPage) => {
    if (userId !== null && data.user.id !== userId) throw new ContractError();
    userId ??= data.user.id;
  };

  // Walk attempts first while explicitly telling the server not to resend any
  // cycles. This ordering lets callers stream attempts and then cycles into
  // one JSON document without buffering either lifetime-sized collection.
  let attemptCursor: string | null = null;
  const seenAttemptCursors = new Set<string>();
  for (let page = 0; page < maxPages; page += 1) {
    const cursorParam = attemptCursor ? `&cursor=${encodeURIComponent(attemptCursor)}` : '';
    const data = parseUserDataPage(
      await apiFetchWithToken<unknown>(
        `/auth/me/data?limit=${EXPORT_PAGE_LIMIT}&attemptsDone=false&practiceCyclesDone=true${cursorParam}`,
        { signal },
        token,
      ),
    );
    assertOwner(data);
    if (
      data.practiceCyclesDone !== true ||
      data.practiceCycles.length !== 0 ||
      data.nextPracticeCycleCursor !== null
    ) {
      throw new ContractError();
    }
    const nextCursor = data.nextCursor;
    if (nextCursor !== null) {
      if (page === maxPages - 1 || seenAttemptCursors.has(nextCursor)) {
        throw new ContractError();
      }
      seenAttemptCursors.add(nextCursor);
    }
    await consumePage(data, emittedPage++);
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }
    if (data.attemptsDone) break;
    attemptCursor = nextCursor;
  }

  // Then walk serving cycles independently. The done flag prevents the server
  // from re-reading attempts while their cursor intentionally stays absent.
  let practiceCycleCursor: string | null = null;
  const seenPracticeCycleCursors = new Set<string>();
  for (let page = 0; page < maxPages; page += 1) {
    const cursorParam = practiceCycleCursor
      ? `&practiceCycleCursor=${encodeURIComponent(practiceCycleCursor)}`
      : '';
    const data = parseUserDataPage(
      await apiFetchWithToken<unknown>(
        `/auth/me/data?limit=${EXPORT_PAGE_LIMIT}&attemptsDone=true&practiceCyclesDone=false${cursorParam}`,
        { signal },
        token,
      ),
    );
    assertOwner(data);
    if (data.attemptsDone !== true || data.attempts.length !== 0 || data.nextCursor !== null) {
      throw new ContractError();
    }
    const nextCursor = data.nextPracticeCycleCursor;
    if (nextCursor !== null) {
      if (page === maxPages - 1 || seenPracticeCycleCursors.has(nextCursor)) {
        throw new ContractError();
      }
      seenPracticeCycleCursors.add(nextCursor);
    }
    await consumePage(data, emittedPage++);
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('Aborted', 'AbortError');
    }
    if (data.practiceCyclesDone) return;
    practiceCycleCursor = nextCursor;
  }
  // A nonterminal final page is rejected inside the loop before emission;
  // a terminal page returns above. This is a defensive exhaustiveness guard.
  /* istanbul ignore next */
  throw new ContractError();
}

async function consumeRecordingExportPagesWithToken(
  token: string | null,
  consumePage: RecordingExportPageConsumer,
  signal?: AbortSignal,
): Promise<void> {
  let cursor: string | null = null;
  const seenCursors = new Set<string>();
  for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
    const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const data = parseRecordingExportPage(
      await apiFetchWithToken<unknown>(
        `/recordings/export?limit=${EXPORT_PAGE_LIMIT}${cursorParam}`,
        { signal },
        token,
      ),
    );
    const nextCursor = data.nextCursor;
    if (nextCursor !== null) {
      if (page === EXPORT_MAX_PAGES - 1 || seenCursors.has(nextCursor)) throw new ContractError();
      seenCursors.add(nextCursor);
    }
    await consumePage(data, page);
    if (nextCursor === null) return;
    cursor = nextCursor;
  }
  // The final nonterminal cursor is rejected inside the loop, while a null
  // cursor returns above. Retain the guard for future loop changes.
  /* istanbul ignore next */
  throw new ContractError();
}

/**
 * Walks GET /auth/me/data under one pinned bearer token and hands each fully
 * validated page to the caller. The walker retains only cursor identities;
 * consumers can stream each at-most-500-row page without accumulating the
 * account's lifetime history in RAM.
 */
export async function apiConsumeUserDataPages(
  consumePage: UserDataPageConsumer,
  signal?: AbortSignal,
  /** Optional lower resource bound for constrained callers and deterministic tests. */
  maxPages = EXPORT_MAX_PAGES,
): Promise<void> {
  // An export is one logical read even though it spans many HTTP requests.
  // Pin the initiating session so a logout/new login cannot silently switch
  // accounts between pages.
  const token = await tokenForRequest();
  await consumeUserDataPagesWithToken(token, consumePage, signal, maxPages);
}

export async function apiConsumeRecordingExportPages(
  consumePage: RecordingExportPageConsumer,
  signal?: AbortSignal,
): Promise<void> {
  const token = await tokenForRequest();
  await consumeRecordingExportPagesWithToken(token, consumePage, signal);
}

/** Exports attempts and recording metadata under one pinned bearer identity. */
export async function apiConsumeAccountExportPages(
  consumeUserPage: UserDataPageConsumer,
  consumeRecordingPage: RecordingExportPageConsumer,
  signal?: AbortSignal,
): Promise<void> {
  const token = await tokenForRequest();
  await consumeUserDataPagesWithToken(token, consumeUserPage, signal);
  if (signal?.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
  await consumeRecordingExportPagesWithToken(token, consumeRecordingPage, signal);
}
