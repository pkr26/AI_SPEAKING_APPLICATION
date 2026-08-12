import Constants from 'expo-constants';
import { File, UploadType } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { ContractError, parseAudioUploadGrant, type AudioUploadGrant } from './types';

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

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Converts transport/API failures into copy that cannot expose backend details. */
export function userMessageForError(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 0) {
    return 'Could not connect to the server. Check your connection and try again.';
  }
  if (error.status === 408) {
    return 'The request timed out. Check your connection and try again.';
  }
  if (error.status === 413) {
    return 'The recording is too large. Please record a shorter answer.';
  }
  if (error.status === 415) {
    return 'This recording format is not supported. Please record your answer again.';
  }
  if (error.status === 422) {
    return 'The recording could not be assessed. Speak for at least a moment and keep the answer under two minutes.';
  }
  if (error.status === 409) {
    return 'An assessment is already in progress or the question changed. Wait a moment and try again.';
  }
  if (error.status === 429) {
    return 'Too many attempts. Please wait and try again later.';
  }
  if (error.status >= 500) {
    return 'The service is temporarily unavailable. Please try again later.';
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

function throwForStatus(res: Response): never {
  // Do not forward server or upstream-provider error bodies into the UI.
  throw new ApiError(res.status, `Request failed with status ${res.status}`);
}

function authHeader(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
        ...authHeader(token),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    },
    options.timeoutMs ?? JSON_TIMEOUT_MS,
    options.signal,
  );
  if (!res.ok) {
    handleUnauthorized(res.status, token, options.expireSessionOn401 !== false);
    throwForStatus(res);
  }
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(502, 'The server returned an invalid response');
  }
}

export function audioFileDescriptor(audioUri: string): {
  name: string;
  type: string;
} {
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

export async function apiUploadAudio<T>(
  path: string,
  audioUri: string,
  fields: Record<string, string>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const token = await tokenForRequest();
  const form = new FormData();
  const descriptor = audioFileDescriptor(audioUri);
  if (Platform.OS === 'web') {
    const audioResponse = await fetch(audioUri);
    const blob = await audioResponse.blob();
    form.append('audio', blob, descriptor.name);
  } else {
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
      headers: { ...authHeader(token) },
      body: form,
    },
    options.timeoutMs ?? AUDIO_TIMEOUT_MS,
    options.signal,
  );
  if (!res.ok) {
    handleUnauthorized(res.status, token, true);
    throwForStatus(res);
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
export async function apiRequestAudioUpload(contentType: string): Promise<AudioUploadGrant> {
  const raw = await apiFetch<unknown>('/uploads/audio-url', {
    method: 'POST',
    body: { contentType },
  });
  const grant = parseAudioUploadGrant(raw);
  if (grant.mode === 's3' && grant.contentType !== contentType.trim().toLowerCase()) {
    throw new ContractError();
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

  if (Platform.OS === 'web') {
    const audioResponse = await fetchWithTimeout(
      audioUri,
      {},
      options.timeoutMs ?? AUDIO_TIMEOUT_MS,
      options.signal,
    );
    if (!audioResponse.ok) throwForStatus(audioResponse);
    const body = await audioResponse.blob();
    if (body.size === 0 || body.size > maxBytes) {
      throw new ApiError(413, 'The recording is too large');
    }
    const form = new FormData();
    for (const [key, value] of Object.entries(uploadFields)) {
      form.append(key, value);
    }
    form.append('file', body, audioFileDescriptor(audioUri).name);
    const res = await fetchWithTimeout(
      uploadUrl,
      { method: 'POST', body: form },
      options.timeoutMs ?? AUDIO_TIMEOUT_MS,
      options.signal,
    );
    if (!res.ok) throwForStatus(res);
  }
}
