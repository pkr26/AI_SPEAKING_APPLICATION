import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import type { ApiErrorCode } from '../src/lib/api';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { ContractError } from '../src/lib/types';

type ApiModule = typeof import('../src/lib/api');
type ApiErrorInstance = InstanceType<ApiModule['ApiError']>;

/** Asserts UI copy via the catalog; the active language under jest is 'en'. */
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

// jest-expo keeps dynamic import() intact, but jest cannot execute it without
// --experimental-vm-modules, so fresh module graphs are loaded with require.
declare const require: (id: string) => unknown;

const mockHostUri: { value: string | undefined } = { value: undefined };
const mockExpoConfigMissing: { value: boolean } = { value: false };
const mockPlatform: { OS: string } = { OS: 'ios' };
const mockSecureData = new Map<string, string>();
const mockArrayBuffer = jest.fn(
  async () => new TextEncoder().encode('audio').buffer as ArrayBuffer,
);
const mockFileState: { exists: boolean; size: number } = {
  exists: true,
  size: 5,
};
const mockFileUpload = jest.fn(async (_url: string, _options: { signal?: AbortSignal }) => ({
  status: 204,
  headers: {},
  body: '',
}));

jest.mock('expo-constants', () => ({
  get expoConfig() {
    return mockExpoConfigMissing.value ? undefined : { hostUri: mockHostUri.value };
  },
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
  getItemAsync: jest.fn(async (key: string) => mockSecureData.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureData.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureData.delete(key);
  }),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn(() => ({
    arrayBuffer: mockArrayBuffer,
    get exists() {
      return mockFileState.exists;
    },
    get size() {
      return mockFileState.size;
    },
    upload: mockFileUpload,
  })),
  UploadType: { MULTIPART: 'multipart' },
}));

jest.mock('react-native', () => ({
  get Platform() {
    return mockPlatform;
  },
}));

interface MockFormDataEntry {
  name: string;
  value: unknown;
  filename?: string;
}

class MockFormData {
  readonly entries: MockFormDataEntry[] = [];

  append(name: string, value: unknown, filename?: string): void {
    this.entries.push({ name, value, filename });
  }
}

const fetchMock = jest.fn();

globalThis.fetch = fetchMock as unknown as typeof fetch;
globalThis.FormData = MockFormData as unknown as typeof FormData;

let api: ApiModule;

const ORIGINAL_ENV = process.env.EXPO_PUBLIC_API_URL;
const KEYCHAIN_OPTIONS = {
  keychainAccessible: 'when-unlocked-this-device-only',
  keychainService: 'ai-english-coach.auth-token',
};

function setEnv(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = value;
  }
}

function setDev(value: boolean): void {
  (globalThis as unknown as { __DEV__: boolean }).__DEV__ = value;
}

function importFreshApi(): ApiModule {
  jest.resetModules();
  return require('../src/lib/api') as ApiModule;
}

function fakeResponse(
  options: {
    ok?: boolean;
    status?: number;
    json?: () => Promise<unknown>;
    headers?: Record<string, string>;
  } = {},
): Response {
  const headers = options.headers ?? {};
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: options.json ?? (async () => ({})),
    headers: { get: (name: string) => headers[name] ?? null },
  } as unknown as Response;
}

/** Mimics a platform fetch that only settles when the request is aborted. */
function fetchUntilAborted(): void {
  fetchMock.mockImplementation(
    (_input: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const rejectAbort = () =>
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (init?.signal?.aborted) {
          rejectAbort();
          return;
        }
        init?.signal?.addEventListener('abort', rejectAbort);
      }),
  );
}

async function catchAsync(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

function catchSync(run: () => unknown): unknown {
  try {
    run();
    return undefined;
  } catch (error) {
    return error;
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeAll(() => {
  setEnv(undefined);
  setDev(true);
  api = require('../src/lib/api') as ApiModule;
});

afterEach(async () => {
  // Reset the module-level request snapshot as well as the mocked keychain.
  await api.clearToken().catch(() => undefined);
  setEnv(undefined);
  setDev(true);
  mockHostUri.value = undefined;
  mockExpoConfigMissing.value = false;
  mockPlatform.OS = 'ios';
  mockSecureData.clear();
  fetchMock.mockReset();
  mockArrayBuffer.mockClear();
  mockFileState.exists = true;
  mockFileState.size = 5;
  mockFileUpload.mockReset();
  mockFileUpload.mockImplementation(async (_url: string, _options: { signal?: AbortSignal }) => ({
    status: 204,
    headers: {},
    body: '',
  }));
  api.setUnauthorizedHandler(null);
});

afterAll(() => {
  setEnv(ORIGINAL_ENV);
});

describe('token storage', () => {
  it('reads the token with the keychain options', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    jest.mocked(SecureStore.getItemAsync).mockClear();

    await expect(api.getToken()).resolves.toBe('jwt-123');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token', KEYCHAIN_OPTIONS);
  });

  it('rejects distinctly when the keychain read fails', async () => {
    const cause = new Error('keychain locked');
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(cause);

    const error = await catchAsync(api.getToken());

    expect(error).toBeInstanceOf(api.TokenStorageReadError);
    expect(error).toMatchObject({
      name: 'TokenStorageReadError',
      message: 'Secure session storage is unavailable.',
      cause,
    });
  });

  it('saves and clears the token with the keychain options', async () => {
    await api.saveToken('jwt-9');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'jwt-9', KEYCHAIN_OPTIONS);

    await expect(api.clearToken()).resolves.toBe(true);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token', KEYCHAIN_OPTIONS);
  });

  it('reports successful conditional cleanup and keeps that cleared snapshot authoritative', async () => {
    await api.saveToken('jwt-current');
    jest.mocked(SecureStore.getItemAsync).mockClear();

    await expect(api.clearToken('jwt-current')).resolves.toBe(true);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(1);

    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());
    await api.apiFetch('/me');

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('serves requests from a newly saved token snapshot without rereading the keychain', async () => {
    await api.saveToken('jwt-saved');
    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/me');

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-saved',
    });
  });

  it('keeps the prior token snapshot authoritative when saving a replacement fails', async () => {
    await api.saveToken('jwt-prior');
    const cause = new Error('keychain write failed');
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(cause);

    await expect(api.saveToken('jwt-replacement')).rejects.toBe(cause);

    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());
    await api.apiFetch('/me');

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-prior',
    });
  });

  it('keeps the prior token snapshot authoritative when deletion fails', async () => {
    await api.saveToken('jwt-prior');
    const cause = new Error('keychain delete failed');
    jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(cause);

    await expect(api.clearToken()).rejects.toBe(cause);

    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());
    await api.apiFetch('/me');

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-prior',
    });
  });

  it('fails closed when conditional token cleanup cannot read secure storage', async () => {
    const cause = new Error('keychain locked');
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(cause);
    jest.mocked(SecureStore.deleteItemAsync).mockClear();

    const error = await catchAsync(api.clearToken('jwt-expected'));

    expect(error).toBeInstanceOf(api.TokenStorageReadError);
    expect(error).toMatchObject({ cause });
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('keeps the cleared-token snapshot authoritative for later requests', async () => {
    await api.saveToken('jwt-cleared');
    await api.clearToken('jwt-cleared');
    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/me');

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('serializes a new save ahead of stale conditional cleanup', async () => {
    await api.saveToken('jwt-old');
    jest.mocked(SecureStore.setItemAsync).mockClear();
    jest.mocked(SecureStore.deleteItemAsync).mockClear();

    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        writeStarted.resolve();
        await allowWrite.promise;
        mockSecureData.set(key, value);
      });

    const saving = api.saveToken('jwt-new');
    await writeStarted.promise;
    const staleCleanup = api.clearToken('jwt-old');

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    allowWrite.resolve();
    await saving;
    await expect(staleCleanup).resolves.toBe(false);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(mockSecureData.get('auth_token')).toBe('jwt-new');
  });

  it('does not delete a newer persisted token when the snapshot is stale', async () => {
    await api.saveToken('jwt-old');
    mockSecureData.set('auth_token', 'jwt-new');
    jest.mocked(SecureStore.deleteItemAsync).mockClear();

    await expect(api.clearToken('jwt-old')).resolves.toBe(false);

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(mockSecureData.get('auth_token')).toBe('jwt-new');

    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());
    await api.apiFetch('/me');
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-new',
    });
  });

  it('serves API calls from the snapshot established by restore', async () => {
    mockSecureData.set('auth_token', 'jwt-restored');
    await api.getToken();
    jest.mocked(SecureStore.getItemAsync).mockClear();
    mockSecureData.set('auth_token', 'unexpected-external-value');
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/me');

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-restored',
    });
  });
});

describe('userMessageForError', () => {
  it('uses a stable ApiError identity', () => {
    expect(new api.ApiError(418, 'short and stout')).toMatchObject({
      name: 'ApiError',
      status: 418,
      message: 'short and stout',
    });
  });

  it('carries the optional machine-readable code and retry hints', () => {
    const error = new api.ApiError(429, 'internal', 30, {
      code: 'RATE_LIMITED',
      retryAfterHours: 2,
    });

    expect(error).toMatchObject({
      name: 'ApiError',
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterSeconds: 30,
      retryAfterHours: 2,
    });
  });

  it.each([
    [0, t('error.network')],
    [408, t('error.timeout')],
    [413, t('error.tooLarge')],
    [415, t('error.unsupportedFormat')],
    [422, t('error.cannotAssess')],
    [409, t('error.conflict')],
    [429, t('error.tooMany')],
    [500, t('error.serverBusy')],
    [503, t('error.serverBusy')],
  ])('maps codeless status %i to localized catalog copy', (status, expected) => {
    expect(api.userMessageForError(new api.ApiError(status, 'internal'), 'Fallback')).toBe(
      expected,
    );
  });

  it.each([400, 401, 404, 499])('falls back for codeless status %i', (status) => {
    expect(api.userMessageForError(new api.ApiError(status, 'internal'), 'Fallback')).toBe(
      'Fallback',
    );
  });

  it('falls back for non-ApiError values', () => {
    expect(api.userMessageForError(new Error('boom'), 'Fallback')).toBe('Fallback');
    expect(api.userMessageForError('nope', 'Fallback')).toBe('Fallback');
    expect(api.userMessageForError(null, 'Fallback')).toBe('Fallback');
  });

  describe('error-code mapping', () => {
    const codeCases: readonly [ApiErrorCode, MessageKey][] = [
      ['VALIDATION_FAILED', 'error.validation'],
      ['INVALID_CREDENTIALS', 'error.wrongCredentials'],
      ['EMAIL_TAKEN', 'error.emailTaken'],
      ['TOKEN_REVOKED', 'error.loginAgain'],
      ['QUESTION_MISMATCH', 'error.questionChanged'],
      ['RATE_LIMITED', 'error.tooMany'],
      ['DAILY_LIMIT', 'error.dailyLimit'],
      ['CAPACITY_BUSY', 'error.busy'],
      ['AUDIO_TOO_LONG', 'error.audioTooLong'],
      ['PROVIDER_TIMEOUT', 'error.timeout'],
      ['CLIENT_UPGRADE_REQUIRED', 'error.upgradeRequired'],
      ['INTERNAL', 'error.internal'],
    ];

    it.each(codeCases)('maps code %s to the %s catalog message', (code, key) => {
      const error = new api.ApiError(400, 'internal', undefined, { code });

      expect(api.userMessageForError(error, 'Fallback')).toBe(t(key));
    });

    it('prefers the code mapping over the status mapping', () => {
      const error = new api.ApiError(409, 'internal', undefined, { code: 'EMAIL_TAKEN' });

      expect(api.userMessageForError(error, 'Fallback')).toBe(t('error.emailTaken'));
      expect(api.userMessageForError(error, 'Fallback')).not.toBe(t('error.conflict'));
    });
  });

  describe('retry-wait line', () => {
    it.each([
      [30, t('wait.seconds', { count: 30 })],
      [1, t('wait.second')],
      [0.4, t('wait.second')],
      [90, t('wait.minutes', { count: 2 })],
      [60, t('wait.minute')],
    ])('appends the wait line for a 429 with retryAfterSeconds %d', (seconds, waitLine) => {
      const error = new api.ApiError(429, 'internal', seconds);

      expect(api.userMessageForError(error, 'Fallback')).toBe(`${t('error.tooMany')} ${waitLine}`);
    });

    it.each([
      [24, t('wait.hours', { count: 24 })],
      [1, t('wait.hour')],
      [1.5, t('wait.hours', { count: 2 })],
    ])('appends the wait line for a 429 with retryAfterHours %d', (hours, waitLine) => {
      const error = new api.ApiError(429, 'internal', undefined, { retryAfterHours: hours });

      expect(api.userMessageForError(error, 'Fallback')).toBe(`${t('error.tooMany')} ${waitLine}`);
    });

    it('appends the wait line to the 503 server-busy message', () => {
      const error = new api.ApiError(503, 'internal', 45);

      expect(api.userMessageForError(error, 'Fallback')).toBe(
        `${t('error.serverBusy')} ${t('wait.seconds', { count: 45 })}`,
      );
    });

    it('prefers hours over seconds when both retry hints are set', () => {
      const error = new api.ApiError(429, 'internal', 30, { retryAfterHours: 2 });

      expect(api.userMessageForError(error, 'Fallback')).toBe(
        `${t('error.tooMany')} ${t('wait.hours', { count: 2 })}`,
      );
    });

    it('appends the wait line to code-mapped messages', () => {
      const error = new api.ApiError(429, 'internal', undefined, {
        code: 'DAILY_LIMIT',
        retryAfterHours: 24,
      });

      expect(api.userMessageForError(error, 'Fallback')).toBe(
        `${t('error.dailyLimit')} ${t('wait.hours', { count: 24 })}`,
      );
    });
  });
});

describe('apiFetch', () => {
  it('performs an authenticated JSON GET by default', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ hello: 'world' }) }));

    const result = await api.apiFetch<{ hello: string }>('/health');

    expect(result).toEqual({ hello: 'world' });
    const [input, init] = fetchMock.mock.calls[0];
    expect(input).toBe('http://localhost:4000/health');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('serializes the body as JSON', async () => {
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/items', {
      method: 'POST',
      body: { name: 'x', count: 2 },
    });

    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[0][1].body).toBe('{"name":"x","count":2}');
  });

  it('attaches the bearer token when one is stored', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    await api.getToken();
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/me');

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-123',
    });
  });

  it('skips the token lookup when auth is false', async () => {
    await api.saveToken('jwt-123');
    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/public', { auth: false });

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('loads secure storage for the first authenticated request in a fresh process', async () => {
    mockSecureData.set('auth_token', 'jwt-first-request');
    fetchMock.mockResolvedValue(fakeResponse());
    const fresh = importFreshApi();

    await fresh.apiFetch('/me');

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-first-request',
    });
  });

  it('invokes the unauthorized handler on 401 when a token was used', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    await api.getToken();
    const handler = jest.fn();
    api.setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    const error = await catchAsync(api.apiFetch('/me'));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledWith('jwt-123');
  });

  it('suppresses the unauthorized handler when expireSessionOn401 is false', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    await api.getToken();
    const handler = jest.fn();
    api.setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    await catchAsync(api.apiFetch('/login', { expireSessionOn401: false }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not expire the session for a non-401 API failure', async () => {
    await api.saveToken('jwt-123');
    const handler = jest.fn();
    api.setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 500 }));

    await catchAsync(api.apiFetch('/broken'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not invoke the unauthorized handler without a stored token', async () => {
    const handler = jest.fn();
    api.setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    const error = await catchAsync(api.apiFetch('/me'));

    expect(handler).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({ status: 401 });
  });

  it('preserves the 401 ApiError when no unauthorized handler is registered', async () => {
    await api.saveToken('jwt-123');
    api.setUnauthorizedHandler(null);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    const error = await catchAsync(api.apiFetch('/me'));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 401,
      message: 'Request failed with status 401',
    });
  });

  it('throws an ApiError carrying the response status', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 500 }));

    const error = await catchAsync(api.apiFetch('/broken'));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 500,
      message: 'Request failed with status 500',
    });
  });

  it('resolves undefined for 204 responses without parsing a body', async () => {
    const json = jest.fn();
    fetchMock.mockResolvedValue(fakeResponse({ status: 204, json }));

    await expect(api.apiFetch('/gone')).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('maps a non-JSON success body to a 502 ApiError', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    );

    const error = await catchAsync(api.apiFetch('/weird'));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 502,
      message: 'The server returned an invalid response',
    });
  });

  it('maps a custom timeout to a 408 ApiError', async () => {
    fetchUntilAborted();

    const error = await catchAsync(api.apiFetch('/slow', { timeoutMs: 10 }));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 408,
      message: 'The request timed out. Please check your connection and try again.',
    });
  });

  it('propagates external aborts without wrapping them', async () => {
    fetchUntilAborted();
    const controller = new AbortController();

    const promise = api.apiFetch('/abortable', {
      signal: controller.signal,
      timeoutMs: 60_000,
    });
    controller.abort();
    const error = await catchAsync(promise);

    expect(error).not.toBeInstanceOf(api.ApiError);
    expect((error as Error).name).toBe('AbortError');
  });

  it('rethrows the raw error when the caller signal was already aborted', async () => {
    const controller = new AbortController();
    const reason = new Error('cancelled before fetch');
    controller.abort(reason);
    fetchMock.mockRejectedValue(new Error('aborted by platform'));

    const error = await catchAsync(api.apiFetch('/pre-aborted', { signal: controller.signal }));

    expect(error).not.toBeInstanceOf(api.ApiError);
    expect((error as Error).message).toBe('aborted by platform');
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetchMock.mock.calls[0][1].signal.reason).toBe(reason);
  });

  it('maps network failures to a status 0 ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const error = await catchAsync(api.apiFetch('/offline'));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 0,
      message: 'Could not connect to the server. Check your connection and try again.',
    });
  });

  it('removes the external abort listener after the request settles', async () => {
    const controller = new AbortController();
    const addSpy = jest.spyOn(controller.signal, 'addEventListener');
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/tidy', { signal: controller.signal });

    expect(addSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('error response parsing', () => {
  it('extracts an allowlisted code from any non-ok response body', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 400, json: async () => ({ code: 'QUESTION_MISMATCH' }) }),
    );

    const error = await catchAsync(api.apiFetch('/attempt'));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'QUESTION_MISMATCH',
      message: 'Request failed with status 400',
    });
    expect(api.userMessageForError(error, 'Fallback')).toBe(t('error.questionChanged'));
  });

  it('reads the error body exactly once for every non-ok response', async () => {
    const json = jest.fn(async () => ({ code: 'VALIDATION_FAILED' }));
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 400, json }));

    const error = await catchAsync(api.apiFetch('/attempt'));

    expect(json).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
  });

  it('ignores codes outside the allowlist and falls back to the status mapping', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 400, json: async () => ({ code: 'NOT_A_CODE' }) }),
    );

    const error = (await catchAsync(api.apiFetch('/attempt'))) as ApiErrorInstance;

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error.code).toBeUndefined();
    expect(api.userMessageForError(error, 'Fallback')).toBe('Fallback');
  });

  it('swallows an unparseable error body and keeps the status ApiError', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 500,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    );

    const error = (await catchAsync(api.apiFetch('/broken'))) as ApiErrorInstance;

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({ status: 500, message: 'Request failed with status 500' });
    expect(error.code).toBeUndefined();
  });

  it('extracts the code from failed audio uploads too', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 422, json: async () => ({ code: 'AUDIO_TOO_LONG' }) }),
    );

    const error = await catchAsync(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {}),
    );

    expect(error).toMatchObject({ status: 422, code: 'AUDIO_TOO_LONG' });
    expect(api.userMessageForError(error, 'Fallback')).toBe(t('error.audioTooLong'));
  });

  describe('retry hints', () => {
    it.each([
      [86_400, 86_400],
      [30, 30],
    ])('honors a bounded 429 Retry-After header of %d seconds', async (header, expected) => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 429, headers: { 'Retry-After': String(header) } }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error.retryAfterSeconds).toBe(expected);
    });

    it('ignores a 429 Retry-After header above the 24-hour bound', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 429, headers: { 'Retry-After': '86401' } }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error.retryAfterSeconds).toBeUndefined();
    });

    it('uses the 429 body retryAfterSeconds when no header is present', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 429, json: async () => ({ retryAfterSeconds: 3600 }) }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error.retryAfterSeconds).toBe(3600);
    });

    it('prefers the Retry-After header over the body retryAfterSeconds', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 429,
          headers: { 'Retry-After': '30' },
          json: async () => ({ retryAfterSeconds: 60 }),
        }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error.retryAfterSeconds).toBe(30);
    });

    it.each([
      [24, 24],
      [48, 48],
      [49, undefined],
      [0, undefined],
    ])('bounds the body retryAfterHours %d to (0, 48]', async (hours, expected) => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 429, json: async () => ({ retryAfterHours: hours }) }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error.retryAfterHours).toBe(expected);
    });

    it.each([
      [120, 120],
      [121, undefined],
      [0, undefined],
    ])(
      'retains the (0, 120] bound for 503 body retryAfterSeconds %d',
      async (seconds, expected) => {
        fetchMock.mockResolvedValue(
          fakeResponse({
            ok: false,
            status: 503,
            json: async () => ({ retryAfterSeconds: seconds }),
          }),
        );

        const error = (await catchAsync(api.apiFetch('/busy'))) as ApiErrorInstance;

        expect(error.retryAfterSeconds).toBe(expected);
      },
    );

    it.each([
      [120, 120],
      [121, undefined],
    ])(
      'retains the (0, 120] bound for a 503 Retry-After header of %d',
      async (header, expected) => {
        fetchMock.mockResolvedValue(
          fakeResponse({ ok: false, status: 503, headers: { 'Retry-After': String(header) } }),
        );

        const error = (await catchAsync(api.apiFetch('/busy'))) as ApiErrorInstance;

        expect(error.retryAfterSeconds).toBe(expected);
      },
    );

    it('ignores retry hints on statuses outside the 429/503 contract', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 500,
          headers: { 'Retry-After': '30' },
          json: async () => ({ retryAfterSeconds: 30, retryAfterHours: 2 }),
        }),
      );

      const error = (await catchAsync(api.apiFetch('/broken'))) as ApiErrorInstance;

      expect(error.retryAfterSeconds).toBeUndefined();
      expect(error.retryAfterHours).toBeUndefined();
    });

    it('produces a fully localized message from a coded 429 with a retry hint', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 429,
          headers: { 'Retry-After': '30' },
          json: async () => ({ code: 'RATE_LIMITED' }),
        }),
      );

      const error = await catchAsync(api.apiFetch('/limited'));

      expect(error).toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 30 });
      expect(api.userMessageForError(error, 'Fallback')).toBe(
        `${t('error.tooMany')} ${t('wait.seconds', { count: 30 })}`,
      );
    });
  });
});

describe('audioFileDescriptor', () => {
  it.each([
    ['file:///rec/a.webm', { name: 'audio.webm', type: 'audio/webm' }],
    ['file:///rec/a.wav', { name: 'audio.wav', type: 'audio/wav' }],
    ['file:///rec/a.m4a', { name: 'audio.m4a', type: 'audio/mp4' }],
    ['file:///rec/a.bin', { name: 'audio.m4a', type: 'audio/mp4' }],
    ['file:///rec/no-extension', { name: 'audio.m4a', type: 'audio/mp4' }],
    ['file:///REC/A.WEBM', { name: 'audio.webm', type: 'audio/webm' }],
    ['file:///REC/A.WAV', { name: 'audio.wav', type: 'audio/wav' }],
    ['file:///rec/a.wav?duration=10', { name: 'audio.wav', type: 'audio/wav' }],
    ['file:///rec/a.webm?next=.m4a', { name: 'audio.webm', type: 'audio/webm' }],
  ])('maps %s to %o', (uri, expected) => {
    expect(api.audioFileDescriptor(uri)).toEqual(expected);
  });

  it('rejects undocumented recording formats with a 415 ApiError', () => {
    for (const uri of [
      'file:///rec/a.3gp',
      'file:///REC/A.3GP?x=1',
      'file:///rec/a.aac',
      'file:///REC/A.AAC#clip',
    ]) {
      const error = catchSync(() => api.audioFileDescriptor(uri));
      expect(error).toBeInstanceOf(api.ApiError);
      expect(error).toMatchObject({
        status: 415,
        message: 'Unsupported recording format',
      });
    }
  });

  it('always uses webm on web regardless of the extension', () => {
    mockPlatform.OS = 'web';
    expect(api.audioFileDescriptor('file:///rec/a.m4a')).toEqual({
      name: 'audio.webm',
      type: 'audio/webm',
    });
  });

  it.each([
    ['audio/mp4', { name: 'audio.m4a', type: 'audio/mp4' }],
    ['audio/m4a', { name: 'audio.m4a', type: 'audio/m4a' }],
    ['audio/x-m4a', { name: 'audio.m4a', type: 'audio/x-m4a' }],
    ['audio/webm', { name: 'audio.webm', type: 'audio/webm' }],
    ['audio/wav', { name: 'audio.wav', type: 'audio/wav' }],
    ['audio/ogg', { name: 'audio.ogg', type: 'audio/ogg' }],
    ['audio/mpeg', { name: 'audio.mp3', type: 'audio/mpeg' }],
    ['audio/webm;codecs=opus', { name: 'audio.webm', type: 'audio/webm' }],
    [' Audio/MP4 ; codecs="mp4a.40.2"', { name: 'audio.m4a', type: 'audio/mp4' }],
  ])('maps the recorded blob type %s to %o', (blobType, expected) => {
    mockPlatform.OS = 'web';
    expect(api.audioFileDescriptor('blob:https://app/audio-1', blobType)).toEqual(expected);
  });

  it.each([
    ['an empty blob type', ''],
    ['an unrecognized blob type', 'video/mp4'],
  ])('keeps the web default for %s', (_case, blobType) => {
    mockPlatform.OS = 'web';
    expect(api.audioFileDescriptor('blob:https://app/audio-1', blobType)).toEqual({
      name: 'audio.webm',
      type: 'audio/webm',
    });
  });
});

describe('resolveAudioFileDescriptor', () => {
  it('describes a native recording from its file URI without reading a blob', async () => {
    await expect(api.resolveAudioFileDescriptor('file:///rec/a.m4a')).resolves.toEqual({
      name: 'audio.m4a',
      type: 'audio/mp4',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('describes a web recording by its recorded blob type', async () => {
    mockPlatform.OS = 'web';
    fetchMock.mockResolvedValueOnce({
      blob: async () => new Blob(['audio'], { type: 'audio/mp4' }),
    } as unknown as Response);

    await expect(api.resolveAudioFileDescriptor('blob:https://app/audio-1')).resolves.toEqual({
      name: 'audio.m4a',
      type: 'audio/mp4',
    });
    expect(fetchMock).toHaveBeenCalledWith('blob:https://app/audio-1');
  });

  it('keeps the web default when the blob reports no type', async () => {
    mockPlatform.OS = 'web';
    fetchMock.mockResolvedValueOnce({
      blob: async () => new Blob(['audio']),
    } as unknown as Response);

    await expect(api.resolveAudioFileDescriptor('blob:https://app/audio-1')).resolves.toEqual({
      name: 'audio.webm',
      type: 'audio/webm',
    });
  });

  it('keeps the web default when the blob cannot be read', async () => {
    mockPlatform.OS = 'web';
    fetchMock.mockRejectedValueOnce(new TypeError('blob revoked'));

    await expect(api.resolveAudioFileDescriptor('blob:https://app/audio-1')).resolves.toEqual({
      name: 'audio.webm',
      type: 'audio/webm',
    });
  });
});

describe('apiUploadAudio', () => {
  it('builds multipart form data with the React Native file descriptor', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    await api.getToken();
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ result: 'ok' }) }));

    const result = await api.apiUploadAudio<{ result: string }>(
      '/practice/attempt',
      'file:///recordings/answer.m4a',
      { questionId: 'q-1', requestId: 'r-1' },
    );

    expect(result).toEqual({ result: 'ok' });
    const [input, init] = fetchMock.mock.calls[0];
    expect(input).toBe('http://localhost:4000/practice/attempt');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer jwt-123' });
    const form = init.body as unknown as MockFormData;
    expect(form).toBeInstanceOf(MockFormData);
    expect(form.entries).toEqual([
      {
        name: 'audio',
        value: {
          uri: 'file:///recordings/answer.m4a',
          name: 'audio.m4a',
          type: 'audio/mp4',
        },
      },
      { name: 'questionId', value: 'q-1' },
      { name: 'requestId', value: 'r-1' },
    ]);
  });

  it('omits the Authorization header when no token is stored', async () => {
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiUploadAudio('/practice/attempt', 'file:///rec/a.wav', {});

    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
  });

  it('uploads a fetched blob on web', async () => {
    mockPlatform.OS = 'web';
    const blob = new Blob(['audio-bytes'], { type: 'audio/webm' });
    fetchMock
      .mockResolvedValueOnce({
        blob: async () => blob,
      } as unknown as Response)
      .mockResolvedValueOnce(fakeResponse({ json: async () => ({ ok: true }) }));

    await api.apiUploadAudio('/practice/attempt', 'blob:https://app/audio-1', {
      questionId: 'q-1',
    });

    expect(fetchMock.mock.calls[0]).toEqual(['blob:https://app/audio-1']);
    const form = fetchMock.mock.calls[1][1].body as unknown as MockFormData;
    expect(form.entries[0]).toEqual({
      name: 'audio',
      value: blob,
      filename: 'audio.webm',
    });
  });

  it('names a Safari MP4 web recording by its recorded blob type', async () => {
    mockPlatform.OS = 'web';
    const blob = new Blob(['audio-bytes'], { type: 'audio/mp4' });
    fetchMock
      .mockResolvedValueOnce({
        blob: async () => blob,
      } as unknown as Response)
      .mockResolvedValueOnce(fakeResponse({ json: async () => ({ ok: true }) }));

    await api.apiUploadAudio('/practice/attempt', 'blob:https://app/audio-1', {});

    const form = fetchMock.mock.calls[1][1].body as unknown as MockFormData;
    expect(form.entries[0]).toEqual({
      name: 'audio',
      value: blob,
      filename: 'audio.m4a',
    });
  });

  it('reports 401 uploads to the unauthorized handler', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    await api.getToken();
    const handler = jest.fn();
    api.setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    const error = await catchAsync(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {}),
    );

    expect(error).toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledWith('jwt-123');
  });

  it('maps a non-JSON upload response to a 502 ApiError', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
    );

    const error = await catchAsync(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {}),
    );

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 502,
      message: 'The server returned an invalid response',
    });
  });

  it('rejects unsupported formats before any network call', async () => {
    const error = await catchAsync(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.3gp', {}),
    );

    expect(error).toMatchObject({ status: 415 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails as a definite local 400 when the cached recording is gone', async () => {
    mockFileState.exists = false;

    const error = await catchAsync(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {}),
    );

    expect(error).toMatchObject({ status: 400, message: 'The recording is unavailable' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('times out slow uploads with a 408 ApiError', async () => {
    fetchUntilAborted();

    const error = await catchAsync(
      api.apiUploadAudio(
        '/practice/attempt',
        'file:///rec/a.m4a',
        {},
        {
          timeoutMs: 10,
        },
      ),
    );

    expect(error).toMatchObject({ status: 408 });
  });
});

describe('apiRequestAudioUpload', () => {
  const ownerId = '550e8400-e29b-41d4-a716-446655440000';
  const audioKey = `audio-uploads/${ownerId}/550e8400-e29b-41d4-a716-446655440002.m4a`;
  const uploadFields = {
    key: audioKey,
    'Content-Type': 'audio/mp4',
    Policy: 'signed-policy',
  };

  it('posts the content type and parses the grant', async () => {
    const grant = {
      mode: 's3',
      uploadUrl: 'https://bucket.s3.amazonaws.com/',
      uploadFields,
      audioKey,
      contentType: 'audio/mp4',
      expiresIn: 900,
      maxBytes: 25 * 1024 * 1024,
    };
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => grant }));

    const result = await api.apiRequestAudioUpload('audio/mp4', ownerId);

    expect(result).toEqual(grant);
    const [input, init] = fetchMock.mock.calls[0];
    expect(input).toBe('http://localhost:4000/uploads/audio-url');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ contentType: 'audio/mp4' }));
  });

  it('accepts the direct-upload fallback without applying S3-only checks', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ mode: 'direct' }) }));

    await expect(api.apiRequestAudioUpload('audio/mp4', ownerId)).resolves.toEqual({
      mode: 'direct',
    });
  });

  it('compares a signed content type with the normalized requested value', async () => {
    const grant = {
      mode: 's3',
      uploadUrl: 'https://bucket.s3.amazonaws.com/',
      uploadFields,
      audioKey,
      contentType: 'audio/mp4',
      expiresIn: 900,
      maxBytes: 25 * 1024 * 1024,
    };
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => grant }));

    await expect(api.apiRequestAudioUpload('  AUDIO/MP4  ', ownerId)).resolves.toEqual(grant);
  });

  it('rejects a malformed grant as a contract error', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ mode: 'carrier-pigeon' }) }));

    await expect(api.apiRequestAudioUpload('audio/mp4', ownerId)).rejects.toThrow(ContractError);
  });

  it('rejects a signed content type that differs from the requested recording', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          mode: 's3',
          uploadUrl: 'https://bucket.s3.amazonaws.com/',
          uploadFields: {
            ...uploadFields,
            'Content-Type': 'audio/wav',
          },
          audioKey,
          contentType: 'audio/wav',
          expiresIn: 900,
          maxBytes: 25 * 1024 * 1024,
        }),
      }),
    );

    await expect(api.apiRequestAudioUpload('audio/mp4', ownerId)).rejects.toThrow(ContractError);
  });

  it('rejects an otherwise valid grant whose object key belongs to another user', async () => {
    const otherKey =
      'audio-uploads/550e8400-e29b-41d4-a716-446655440099/550e8400-e29b-41d4-a716-446655440002.m4a';
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          mode: 's3',
          uploadUrl: 'https://bucket.s3.amazonaws.com/',
          uploadFields: { ...uploadFields, key: otherKey },
          audioKey: otherKey,
          contentType: 'audio/mp4',
          expiresIn: 900,
          maxBytes: 25 * 1024 * 1024,
        }),
      }),
    );

    await expect(api.apiRequestAudioUpload('audio/mp4', ownerId)).rejects.toThrow(ContractError);
  });
});

describe('apiPostPresignedAudio', () => {
  const uploadUrl = 'https://bucket.s3.amazonaws.com/';
  const uploadFields = {
    key: 'audio-uploads/user/key.m4a',
    'Content-Type': 'audio/mp4',
    Policy: 'signed-policy',
  };
  const maxBytes = 25 * 1024 * 1024;

  it('streams a native file with the signed multipart fields and no auth header', async () => {
    const FileMock = jest.mocked(File);
    FileMock.mockClear();

    await api.apiPostPresignedAudio(
      uploadUrl,
      uploadFields,
      'file:///recordings/answer.m4a',
      'audio/mp4',
      maxBytes,
    );

    expect(FileMock).toHaveBeenCalledWith('file:///recordings/answer.m4a');
    expect(mockArrayBuffer).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockFileUpload).toHaveBeenCalledWith(
      uploadUrl,
      expect.objectContaining({
        httpMethod: 'POST',
        uploadType: 'multipart',
        fieldName: 'file',
        mimeType: 'audio/mp4',
        parameters: uploadFields,
        sessionType: 'foreground',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each([
    ['a fractional maximum', uploadFields, 1.5],
    ['a zero maximum', uploadFields, 0],
    ['a mismatched content type', { ...uploadFields, 'Content-Type': 'audio/wav' }, maxBytes],
    ['a lowercase file field', { ...uploadFields, file: 'attacker-controlled' }, maxBytes],
    ['a mixed-case file field', { ...uploadFields, FiLe: 'attacker-controlled' }, maxBytes],
  ])('rejects an unsafe signed form with %s before file access', async (_case, fields, limit) => {
    const FileMock = jest.mocked(File);
    FileMock.mockClear();

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        fields,
        'file:///recordings/answer.m4a',
        'audio/mp4',
        limit,
      ),
    ).rejects.toThrow(ContractError);
    expect(FileMock).not.toHaveBeenCalled();
    expect(mockFileUpload).not.toHaveBeenCalled();
  });

  it('accepts a one-byte native recording at an exact one-byte signed limit', async () => {
    mockFileState.size = 1;

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///recordings/answer.m4a',
        'audio/mp4',
        1,
      ),
    ).resolves.toBeUndefined();
    expect(mockFileUpload).toHaveBeenCalledTimes(1);
  });

  it('POSTs signed fields before a fetched blob on web', async () => {
    mockPlatform.OS = 'web';
    const blob = new Blob(['web-audio'], { type: 'audio/webm' });
    const webFields = {
      ...uploadFields,
      'Content-Type': 'audio/webm',
    };
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => blob,
      } as unknown as Response)
      .mockResolvedValueOnce(fakeResponse());

    await api.apiPostPresignedAudio(
      uploadUrl,
      webFields,
      'blob:https://app/audio-1',
      'audio/webm',
      maxBytes,
    );

    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe('POST');
    const form = init.body as unknown as MockFormData;
    expect(form.entries).toEqual([
      { name: 'key', value: uploadFields.key },
      { name: 'Content-Type', value: 'audio/webm' },
      { name: 'Policy', value: 'signed-policy' },
      { name: 'file', value: blob, filename: 'audio.webm' },
    ]);
  });

  it('throws an ApiError when S3 rejects the upload', async () => {
    mockFileUpload.mockResolvedValueOnce({
      status: 403,
      headers: {},
      body: 'sensitive provider response',
    });

    const error = await catchAsync(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
      ),
    );

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({ status: 403 });
  });

  it('sanitizes a native upload implementation failure that was not caused by the caller', async () => {
    const nativeFailure = new Error('private native implementation detail');
    mockFileUpload.mockRejectedValueOnce(nativeFailure);

    const error = await catchAsync(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
      ),
    );

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({ status: 0, message: 'Could not upload the recording' });
    expect(error).not.toBe(nativeFailure);
  });

  it.each([
    [199, false],
    [200, true],
    [299, true],
    [300, false],
  ])('enforces the native upload success boundary for status %i', async (status, succeeds) => {
    mockFileUpload.mockResolvedValueOnce({ status, headers: {}, body: '' });
    const upload = api.apiPostPresignedAudio(
      uploadUrl,
      uploadFields,
      'file:///rec/a.m4a',
      'audio/mp4',
      maxBytes,
    );

    if (succeeds) {
      await expect(upload).resolves.toBeUndefined();
    } else {
      await expect(upload).rejects.toMatchObject({
        status,
        message: `Request failed with status ${status}`,
      });
    }
  });

  it('times out slow presigned uploads with a 408 ApiError', async () => {
    mockFileUpload.mockImplementationOnce(
      async (_url: string, options: { signal?: AbortSignal }) =>
        await new Promise((_, reject) => {
          const fail = () => reject(new DOMException('aborted', 'AbortError'));
          if (options.signal?.aborted) fail();
          else options.signal?.addEventListener('abort', fail, { once: true });
        }),
    );

    const error = await catchAsync(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
        { timeoutMs: 10 },
      ),
    );

    expect(error).toMatchObject({
      status: 408,
      message: 'The recording upload timed out',
    });
  });

  it('propagates caller cancellation and removes its one-shot native listener', async () => {
    const caller = new AbortController();
    const reason = new Error('screen left');
    const addSpy = jest.spyOn(caller.signal, 'addEventListener');
    const removeSpy = jest.spyOn(caller.signal, 'removeEventListener');
    mockFileUpload.mockImplementationOnce(
      async (_url: string, options: { signal?: AbortSignal }) =>
        await new Promise((_, reject) => {
          options.signal?.addEventListener('abort', () => reject(reason), { once: true });
        }),
    );

    const upload = api.apiPostPresignedAudio(
      uploadUrl,
      uploadFields,
      'file:///rec/a.m4a',
      'audio/mp4',
      maxBytes,
      { signal: caller.signal, timeoutMs: 60_000 },
    );
    caller.abort(reason);

    await expect(upload).rejects.toBe(reason);
    const nativeSignal = mockFileUpload.mock.calls[0][1].signal!;
    expect(nativeSignal.aborted).toBe(true);
    expect(nativeSignal.reason).toBe(reason);
    expect(addSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('passes an already-aborted caller signal to native upload as aborted', async () => {
    const caller = new AbortController();
    const reason = new Error('already cancelled');
    caller.abort(reason);
    mockFileUpload.mockImplementationOnce(
      async (_url: string, options: { signal?: AbortSignal }) => {
        expect(options.signal?.aborted).toBe(true);
        expect(options.signal?.reason).toBe(reason);
        throw reason;
      },
    );

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
        { signal: caller.signal },
      ),
    ).rejects.toBe(reason);
  });

  it('fails closed when native file metadata is unavailable or oversized', async () => {
    mockFileState.size = Number.NaN;
    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 400 });

    mockFileState.size = maxBytes + 1;
    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 413, message: 'The recording is too large' });
    expect(mockFileUpload).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing file', false, 5],
    ['a nonnumeric file size', true, '5'],
    ['an empty file', true, 0],
  ])('rejects %s before native upload', async (_case, exists, size) => {
    mockFileState.exists = exists;
    (mockFileState as { size: unknown }).size = size;

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 400, message: 'The recording is unavailable' });
    expect(mockFileUpload).not.toHaveBeenCalled();
  });

  it('reports a lost browser recording as unavailable, not too large', async () => {
    mockPlatform.OS = 'web';
    const body = { size: 0 } as Blob;
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, blob: async () => body });

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 400, message: 'The recording is unavailable' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversized browser recording before posting the signed form', async () => {
    mockPlatform.OS = 'web';
    const body = { size: maxBytes + 1 } as Blob;
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, blob: async () => body });

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 413, message: 'The recording is too large' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('names a Safari MP4 web recording by its blob type in the signed form', async () => {
    mockPlatform.OS = 'web';
    const blob = new Blob(['web-audio'], { type: 'audio/mp4;codecs=mp4a.40.2' });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => blob,
      } as unknown as Response)
      .mockResolvedValueOnce(fakeResponse());

    await api.apiPostPresignedAudio(
      uploadUrl,
      uploadFields,
      'blob:https://app/audio-1',
      'audio/mp4',
      maxBytes,
    );

    const form = fetchMock.mock.calls[1][1].body as unknown as MockFormData;
    expect(form.entries[3]).toEqual({ name: 'file', value: blob, filename: 'audio.m4a' });
  });

  it('accepts a browser recording at the exact signed size limit', async () => {
    mockPlatform.OS = 'web';
    const body = { size: maxBytes } as Blob;
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => body })
      .mockResolvedValueOnce(fakeResponse());

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
      ),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects a failed browser recording read before posting to S3', async () => {
    mockPlatform.OS = 'web';
    fetchMock.mockResolvedValueOnce(fakeResponse({ ok: false, status: 404 }));

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/missing',
        'audio/webm',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a failed browser S3 response', async () => {
    mockPlatform.OS = 'web';
    const body = { size: 5 } as Blob;
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => body })
      .mockResolvedValueOnce(fakeResponse({ ok: false, status: 403 }));

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it.each([
    ['the default audio timeout', undefined, 150_000],
    ['a caller-selected audio timeout', 1_234, 1_234],
  ])('applies %s to both browser upload requests', async (_label, timeoutMs, expectedDelay) => {
    mockPlatform.OS = 'web';
    const body = { size: 5 } as Blob;
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => body })
      .mockResolvedValueOnce(fakeResponse());
    const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');

    try {
      await api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
        timeoutMs === undefined ? {} : { timeoutMs },
      );

      expect(timeoutSpy.mock.calls.map(([, delay]) => delay)).toEqual([
        expectedDelay,
        expectedDelay,
      ]);
    } finally {
      timeoutSpy.mockRestore();
    }
  });
});

describe('resolveBaseUrl', () => {
  it('throws in production when EXPO_PUBLIC_API_URL is missing', async () => {
    setDev(false);
    setEnv(undefined);

    expect(() => importFreshApi()).toThrow(
      'EXPO_PUBLIC_API_URL must be configured for production builds.',
    );
  });

  it('throws in production when EXPO_PUBLIC_API_URL is blank', async () => {
    setDev(false);
    setEnv('   ');

    expect(() => importFreshApi()).toThrow(
      'EXPO_PUBLIC_API_URL must be configured for production builds.',
    );
  });

  it('throws for an invalid URL', async () => {
    setDev(false);
    setEnv('not-a-url');

    expect(() => importFreshApi()).toThrow('EXPO_PUBLIC_API_URL must be a valid absolute URL.');
  });

  it('rejects plain HTTP outside development', async () => {
    setDev(false);
    setEnv('http://api.example.com');

    expect(() => importFreshApi()).toThrow(
      'EXPO_PUBLIC_API_URL must use HTTPS outside development.',
    );
  });

  it.each([
    'https://user:secret@api.example.com',
    'https://api.example.com?token=1',
    'https://api.example.com#fragment',
  ])('rejects unsafe URL %s', async (value) => {
    setDev(false);
    setEnv(value);

    expect(() => importFreshApi()).toThrow(
      'EXPO_PUBLIC_API_URL cannot contain credentials, a query, or a fragment.',
    );
  });

  it('trims whitespace and strips trailing slashes', async () => {
    setDev(false);
    setEnv('  https://api.example.com//  ');

    const mod = importFreshApi();

    expect(mod.API_URL).toBe('https://api.example.com');
  });

  it('allows HTTP URLs in development', async () => {
    setDev(true);
    setEnv('http://192.168.1.20:4000/');

    const mod = importFreshApi();

    expect(mod.API_URL).toBe('http://192.168.1.20:4000');
  });

  it('still rejects non-HTTP protocols in development', async () => {
    setDev(true);
    setEnv('ftp://api.example.com');

    expect(() => importFreshApi()).toThrow(
      'EXPO_PUBLIC_API_URL must use HTTPS outside development.',
    );
  });

  it('rejects a URL containing only a username', async () => {
    setDev(false);
    setEnv('https://user@api.example.com');

    expect(() => importFreshApi()).toThrow(
      'EXPO_PUBLIC_API_URL cannot contain credentials, a query, or a fragment.',
    );
  });
});

describe('developmentBaseUrl', () => {
  it('falls back safely when Expo configuration is unavailable', async () => {
    mockExpoConfigMissing.value = true;

    expect(importFreshApi().API_URL).toBe('http://localhost:4000');
  });

  it('derives the LAN IP from the Expo hostUri', async () => {
    mockHostUri.value = '192.168.1.5:8081';

    expect(importFreshApi().API_URL).toBe('http://192.168.1.5:4000');
  });

  it('accepts a hostUri without an explicit port', async () => {
    mockHostUri.value = '192.168.1.5';

    expect(importFreshApi().API_URL).toBe('http://192.168.1.5:4000');
  });

  it('re-brackets IPv6 hosts from the hostUri', async () => {
    mockHostUri.value = '[::1]:8081';

    expect(importFreshApi().API_URL).toBe('http://[::1]:4000');
  });

  it.each(['localhost:8081', '127.0.0.1:8081'])(
    'falls back to the platform URL for hostUri %s',
    async (hostUri) => {
      mockHostUri.value = hostUri;
      mockPlatform.OS = 'android';

      expect(importFreshApi().API_URL).toBe('http://10.0.2.2:4000');
    },
  );

  it('falls back when the hostUri is malformed', async () => {
    mockHostUri.value = 'bad host:8081';
    mockPlatform.OS = 'android';

    expect(importFreshApi().API_URL).toBe('http://10.0.2.2:4000');
  });

  it('uses the Android emulator host when no hostUri is available', async () => {
    mockPlatform.OS = 'android';

    expect(importFreshApi().API_URL).toBe('http://10.0.2.2:4000');
  });

  it('uses localhost on iOS when no hostUri is available', async () => {
    mockPlatform.OS = 'ios';

    expect(importFreshApi().API_URL).toBe('http://localhost:4000');
  });

  it('treats an empty hostUri as missing', async () => {
    mockHostUri.value = '';

    expect(importFreshApi().API_URL).toBe('http://localhost:4000');
  });
});

// ----- Typed endpoint helpers -----

const STATS_BODY = {
  level: 'B1',
  progress: { masteredCount: 3, learningCount: 2, totalAtLevel: 10, dueCount: 4 },
  streakDays: 2,
  practicedToday: 1,
  totalAttempts: 12,
  lastPracticedAt: '2026-08-15T10:00:00.000Z',
};

const HISTORY_ITEM = {
  id: '550e8400-e29b-41d4-a716-446655440031',
  questionId: '550e8400-e29b-41d4-a716-446655440032',
  promptWord: 'courage',
  questionText: 'Describe a time you showed courage.',
  cefrLevel: 'B1',
  context: 'practice',
  attemptNo: 1,
  score: 82,
  passed: true,
  transcript: 'I was brave.',
  feedback: 'Nice work.',
  createdAt: '2026-08-15T10:00:00.000Z',
};

const PROFILE_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'hi',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

describe('typed endpoint helpers', () => {
  it('apiGetPracticeStats fetches /practice/stats and returns the parsed stats', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => STATS_BODY }));

    await expect(api.apiGetPracticeStats()).resolves.toEqual(STATS_BODY);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/practice/stats',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('apiGetPracticeStats rejects contract drift with a ContractError', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ ...STATS_BODY, streakDays: -1 }) }),
    );

    await expect(api.apiGetPracticeStats()).rejects.toBeInstanceOf(ContractError);
  });

  it('apiGetPracticeHistory pins the page limit and omits the cursor on the first page', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ items: [HISTORY_ITEM], nextCursor: null }) }),
    );

    await expect(api.apiGetPracticeHistory()).resolves.toEqual({
      items: [HISTORY_ITEM],
      nextCursor: null,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/practice/history?limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('apiGetPracticeHistory URL-encodes the keyset cursor', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ items: [HISTORY_ITEM], nextCursor: null }) }),
    );

    await api.apiGetPracticeHistory(HISTORY_ITEM.id);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/practice/history?limit=20&cursor=${HISTORY_ITEM.id}`,
      expect.anything(),
    );
  });

  it('apiSkipPracticeWord POSTs the question id to /practice/skip', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ status: 204 }));

    await api.apiSkipPracticeWord(HISTORY_ITEM.questionId);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/practice/skip',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ questionId: HISTORY_ITEM.questionId }),
      }),
    );
  });

  it('apiForgotPassword POSTs without any Authorization header', async () => {
    await api.saveToken('secret-token');
    fetchMock.mockResolvedValue(fakeResponse({ status: 204 }));

    await api.apiForgotPassword('ada@example.com');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4000/auth/forgot-password');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'ada@example.com' }));
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('apiResetPassword POSTs email, token, and new password without auth', async () => {
    await api.saveToken('secret-token');
    fetchMock.mockResolvedValue(fakeResponse({ status: 204 }));

    await api.apiResetPassword('ada@example.com', 'abcdef123456', 'NewPass123');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4000/auth/reset-password');
    expect(init.body).toBe(
      JSON.stringify({
        email: 'ada@example.com',
        token: 'abcdef123456',
        newPassword: 'NewPass123',
      }),
    );
    expect(init.headers).not.toHaveProperty('Authorization');
  });

  it('apiResetPassword surfaces RESET_INVALID through the localized code mapping', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Reset code is invalid or expired', code: 'RESET_INVALID' }),
      }),
    );

    const error = (await catchAsync(
      api.apiResetPassword('ada@example.com', 'bad', 'NewPass123'),
    )) as ApiErrorInstance;
    expect(error.code).toBe('RESET_INVALID');
    expect(api.userMessageForError(error, 'fallback')).toBe(t('error.resetInvalid'));
  });

  it('apiUpdateProfile PATCHes /auth/me and returns the parsed user', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ user: PROFILE_USER }) }));

    await expect(api.apiUpdateProfile({ nativeLanguage: 'hi' })).resolves.toEqual(PROFILE_USER);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/auth/me',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ nativeLanguage: 'hi' }),
      }),
    );
  });

  it('apiUpdateProfile rejects a malformed user payload', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ user: { ...PROFILE_USER, nativeLanguage: 'fr' } }) }),
    );

    await expect(api.apiUpdateProfile({ name: 'Ada' })).rejects.toBeInstanceOf(ContractError);
  });

  it('apiRestartDiagnostic POSTs the explicit confirmation body', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ status: 204 }));

    await api.apiRestartDiagnostic();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/diagnostic/restart',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      }),
    );
  });

  it('apiExportUserData walks every page and combines the attempts', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440041';
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => ({
            user: PROFILE_USER,
            attempts: [{ id: 'a1' }],
            nextCursor: cursor,
          }),
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => ({
            user: PROFILE_USER,
            attempts: [{ id: 'a2' }],
            nextCursor: null,
          }),
        }),
      );

    await expect(api.apiExportUserData()).resolves.toEqual({
      user: PROFILE_USER,
      attempts: [{ id: 'a1' }, { id: 'a2' }],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4000/auth/me/data',
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `http://localhost:4000/auth/me/data?cursor=${cursor}`,
      expect.anything(),
    );
  });

  it('apiExportUserData aborts on a repeated cursor instead of spinning forever', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440042';
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          user: PROFILE_USER,
          attempts: [{ id: 'a1' }],
          nextCursor: cursor,
        }),
      }),
    );

    await expect(api.apiExportUserData()).rejects.toBeInstanceOf(ContractError);
    // First page + the page fetched with the repeated cursor.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
