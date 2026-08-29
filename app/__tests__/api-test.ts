import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import type { ApiErrorCode } from '../src/lib/api';
import { latchClientUpgradeRequired } from '../src/lib/client-upgrade-store';
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
const mockVersion: { value: string | undefined } = { value: undefined };
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
    return mockExpoConfigMissing.value
      ? undefined
      : { hostUri: mockHostUri.value, version: mockVersion.value };
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

jest.mock('../src/lib/client-upgrade-store', () => ({
  latchClientUpgradeRequired: jest.fn(),
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
const nativeSetTimeout = globalThis.setTimeout;
const nativeClearTimeout = globalThis.clearTimeout;
const MUTATION_WATCHDOG_MS = 500;

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
  fetchMock.mockImplementation((_input: unknown, init?: RequestInit) => {
    if (!init?.signal) {
      return Promise.reject(new Error('fetchWithTimeout must pass fetch an AbortSignal'));
    }
    const { signal } = init;
    return new Promise<Response>((_resolve, reject) => {
      const rejectAbort = () =>
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      if (signal.aborted) {
        rejectAbort();
        return;
      }
      signal.addEventListener('abort', rejectAbort);
    });
  });
}

async function catchAsync(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error;
  }
}

function settleWithin<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = nativeSetTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${label} did not settle within the mutation watchdog`));
    }, MUTATION_WATCHDOG_MS);
    void Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        nativeClearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        nativeClearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function captureWithin(promise: Promise<unknown>, label: string): Promise<unknown> {
  try {
    await settleWithin(promise, label);
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

async function expectBarrierBeforeSettlement<T>(
  barrier: Promise<void>,
  operation: Promise<T>,
): Promise<void> {
  await Promise.race([
    barrier,
    Promise.resolve(operation).then(
      () => {
        throw new Error('operation settled before reaching the test barrier');
      },
      (error: unknown) => {
        throw error;
      },
    ),
  ]);
}

async function assertMutationLiveness(): Promise<void> {
  const plainError = new api.ApiError(418, 'watchdog');
  if (plainError.name !== 'ApiError' || plainError.status !== 418) {
    throw new Error('ApiError constructor did not retain its required fields');
  }
  const detailedError = new api.ApiError(429, 'watchdog', 2, {
    code: 'RATE_LIMITED',
    retryAfterHours: 1,
  });
  if (detailedError.code !== 'RATE_LIMITED' || detailedError.retryAfterHours !== 1) {
    throw new Error('ApiError constructor did not retain its optional fields');
  }

  await settleWithin(api.saveToken('watchdog-token'), 'token save');
  if (mockSecureData.get('auth_token') !== 'watchdog-token') {
    throw new Error('Token save did not reach secure storage');
  }
  const cleared = await settleWithin(api.clearToken('watchdog-token'), 'conditional token clear');
  if (!cleared || mockSecureData.has('auth_token')) {
    throw new Error('Conditional token clear did not remove its matching token');
  }

  fetchMock.mockResolvedValueOnce(fakeResponse({ json: async () => ({ alive: true }) }));
  const success = await settleWithin(
    api.apiFetch<{ alive: boolean }>('/mutation-watchdog/success', { timeoutMs: 100 }),
    'successful response body',
  );
  if (success.alive !== true) throw new Error('Successful response body was not delivered');

  fetchMock.mockResolvedValueOnce(
    fakeResponse({
      json: async () => {
        throw new SyntaxError('invalid success JSON');
      },
    }),
  );
  const invalidBody = await captureWithin(
    api.apiFetch('/mutation-watchdog/invalid-body', { timeoutMs: 100 }),
    'rejected response body',
  );
  if (!(invalidBody instanceof api.ApiError) || invalidBody.status !== 502) {
    throw new Error('Rejected response body did not become a 502 ApiError');
  }

  const bodyReadStarted = deferred<void>();
  const caller = new AbortController();
  const callerReason = new Error('watchdog caller abort');
  fetchMock.mockResolvedValueOnce(
    fakeResponse({
      json: () => {
        bodyReadStarted.resolve();
        return new Promise(() => undefined);
      },
    }),
  );
  const abortedBody = api.apiFetch('/mutation-watchdog/body-abort', {
    signal: caller.signal,
    timeoutMs: 100,
  });
  await settleWithin(bodyReadStarted.promise, 'response body read start');
  caller.abort(callerReason);
  const bodyAbortError = await captureWithin(abortedBody, 'response body caller abort');
  if (bodyAbortError !== callerReason) {
    throw new Error('Response body caller abort did not preserve its reason');
  }

  fetchMock.mockResolvedValueOnce(fakeResponse({ json: () => new Promise(() => undefined) }));
  const bodyTimeout = await captureWithin(
    api.apiFetch('/mutation-watchdog/body-timeout', { timeoutMs: 10 }),
    'response body timeout',
  );
  if (!(bodyTimeout instanceof api.ApiError) || bodyTimeout.status !== 408) {
    throw new Error('Response body timeout did not produce a 408 ApiError');
  }

  fetchUntilAborted();
  const transportTimeout = await captureWithin(
    api.apiFetch('/mutation-watchdog/fetch-timeout', { timeoutMs: 10 }),
    'fetch timeout',
  );
  if (!(transportTimeout instanceof api.ApiError) || transportTimeout.status !== 408) {
    throw new Error('Fetch timeout did not produce a 408 ApiError');
  }

  const cursor = '550e8400-e29b-41d4-a716-446655440041';
  fetchMock.mockResolvedValue(
    fakeResponse({
      json: async () =>
        userExportPage({
          attempts: [{ id: 'a1' }],
          nextCursor: cursor,
          attemptsDone: false,
        }),
    }),
  );
  let emittedPages = 0;
  const repeatedCursor = await captureWithin(
    api.apiConsumeUserDataPages(() => {
      emittedPages += 1;
      if (emittedPages > 1) throw new Error('Repeated cursor page reached the consumer');
    }),
    'repeated export cursor',
  );
  if (!(repeatedCursor instanceof ContractError) || emittedPages !== 1) {
    throw new Error('Repeated export cursor was not rejected before its second page');
  }
}

beforeAll(async () => {
  setEnv(undefined);
  setDev(true);
  api = require('../src/lib/api') as ApiModule;
  let preflightPassed = false;
  try {
    await assertMutationLiveness();
    preflightPassed = true;
  } finally {
    mockSecureData.clear();
    fetchMock.mockReset();
    if (!preflightPassed) {
      // A stalled token operation can leave the old module's serialized queue
      // pending forever. Detach it before Jest processes the failed hook; all
      // late promise outcomes remain observed by settleWithin.
      api.setUnauthorizedHandler(null);
      api = importFreshApi();
    }
  }
});

afterEach(async () => {
  // Reset the module-level request snapshot as well as the mocked keychain.
  await api.clearToken().catch(() => undefined);
  setEnv(undefined);
  setDev(true);
  mockHostUri.value = undefined;
  mockExpoConfigMissing.value = false;
  mockVersion.value = undefined;
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
  jest.mocked(latchClientUpgradeRequired).mockClear();
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
    await expectBarrierBeforeSettlement(writeStarted.promise, saving);
    const staleCleanup = api.clearToken('jwt-old');

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    allowWrite.resolve();
    await saving;
    await expect(staleCleanup).resolves.toBe(false);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(mockSecureData.get('auth_token')).toBe('jwt-new');
  });

  it('makes a later API request wait for an in-flight token replacement', async () => {
    await api.saveToken('jwt-old');
    jest.mocked(SecureStore.setItemAsync).mockClear();
    const writeStarted = deferred<void>();
    const allowWrite = deferred<void>();
    jest
      .mocked(SecureStore.setItemAsync)
      .mockImplementationOnce(async (key: string, value: string) => {
        writeStarted.resolve();
        await allowWrite.promise;
        mockSecureData.set(key, value);
      });
    fetchMock.mockResolvedValue(fakeResponse());

    const saving = api.saveToken('jwt-new');
    await expectBarrierBeforeSettlement(writeStarted.promise, saving);
    const request = api.apiFetch('/me');
    await Promise.resolve();
    const callsBeforeRelease = fetchMock.mock.calls.length;

    allowWrite.resolve();
    await saving;
    await expect(request).resolves.toEqual({});
    expect(callsBeforeRelease).toBe(0);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-new',
    });
  });

  it('makes a later API request wait for an in-flight token clear', async () => {
    await api.saveToken('jwt-old');
    const deleteStarted = deferred<void>();
    const allowDelete = deferred<void>();
    jest.mocked(SecureStore.deleteItemAsync).mockImplementationOnce(async (key: string) => {
      deleteStarted.resolve();
      await allowDelete.promise;
      mockSecureData.delete(key);
    });
    fetchMock.mockResolvedValue(fakeResponse());

    const clearing = api.clearToken('jwt-old');
    await expectBarrierBeforeSettlement(deleteStarted.promise, clearing);
    const request = api.apiFetch('/me');
    await Promise.resolve();
    const callsBeforeRelease = fetchMock.mock.calls.length;

    allowDelete.resolve();
    await expect(clearing).resolves.toBe(true);
    await expect(request).resolves.toEqual({});
    expect(callsBeforeRelease).toBe(0);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' });
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
    // Declaration order mirrors API_ERROR_CODES so the completeness check below
    // reads as a diff when the server contract gains or drops a code.
    const codeCases: readonly [ApiErrorCode, MessageKey][] = [
      ['VALIDATION_FAILED', 'error.validation'],
      ['INVALID_CREDENTIALS', 'error.wrongCredentials'],
      ['EMAIL_TAKEN', 'error.emailTaken'],
      ['UNAUTHENTICATED', 'error.loginAgain'],
      ['TOKEN_REVOKED', 'error.loginAgain'],
      ['FORBIDDEN', 'error.forbidden'],
      ['NOT_FOUND', 'error.notFound'],
      ['QUESTION_MISMATCH', 'error.questionChanged'],
      ['DIAGNOSTIC_DONE', 'error.diagnosticDone'],
      ['REQUEST_IN_FLIGHT', 'error.stillChecking'],
      ['REQUEST_ID_REUSED', 'error.alreadySent'],
      ['ASSESSMENT_IN_PROGRESS', 'error.stillChecking'],
      ['ASSESSMENT_RESULT_INCOMPATIBLE', 'error.assessmentResultIncompatible'],
      ['PRACTICE_CYCLE_CLOSED', 'error.stateChanged'],
      ['STATE_CHANGED', 'error.stateChanged'],
      ['RATE_LIMITED', 'error.tooMany'],
      ['DAILY_LIMIT', 'error.dailyLimit'],
      ['NETWORK_DAILY_LIMIT', 'error.networkDailyLimit'],
      ['CAPACITY_BUSY', 'error.busy'],
      ['POOL_SATURATED', 'error.busy'],
      ['AUDIO_INVALID', 'error.audioInvalid'],
      ['AUDIO_SILENT', 'error.audioSilent'],
      ['AUDIO_UPLOAD_MISSING', 'error.audioInvalid'],
      ['AUDIO_TOO_LARGE', 'error.tooLarge'],
      ['AUDIO_TOO_LONG', 'error.audioTooLong'],
      ['AUDIO_UNREADABLE', 'error.audioUnreadable'],
      ['PROVIDER_FAILED', 'error.checkFailed'],
      ['PROVIDER_TIMEOUT', 'error.timeout'],
      ['RESET_INVALID', 'error.resetInvalid'],
      ['CLIENT_UPGRADE_REQUIRED', 'error.upgradeRequired'],
      ['INTERNAL', 'error.internal'],
    ];

    it('covers every advertised error code', () => {
      expect(codeCases.map(([code]) => code)).toEqual([...api.API_ERROR_CODES]);
    });

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
      // Header-only 429s (express-rate-limit) carry day-scale waits as seconds:
      // the per-network daily cap must read as hours, not "1440 minutes".
      [3599, t('wait.minutes', { count: 60 })],
      [3600, t('wait.hour')],
      [5401, t('wait.hours', { count: 2 })],
      [24 * 60 * 60, t('wait.hours', { count: 24 })],
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
    expect(init.cache).toBe('no-store');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends X-Client-Version so the server MIN_CLIENT_VERSION gate can engage', async () => {
    mockVersion.value = '1.0.0';
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/me');

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      'X-Client-Version': '1.0.0',
    });
  });

  it.each([
    ['no version is configured', undefined],
    ['the configured version is empty', ''],
  ])(
    'omits the X-Client-Version key entirely when %s',
    async (_case, version: string | undefined) => {
      mockVersion.value = version;
      fetchMock.mockResolvedValue(fakeResponse());

      await api.apiFetch('/me');

      // toStrictEqual, not toEqual: an `X-Client-Version: undefined` entry would
      // still reach the transport and be serialized as the literal "undefined".
      expect(fetchMock.mock.calls[0][1].headers).toStrictEqual({
        'Content-Type': 'application/json',
      });
    },
  );

  it('still sends requests when Expo exposes no config at all', async () => {
    mockExpoConfigMissing.value = true;
    fetchMock.mockResolvedValue(fakeResponse());

    await expect(api.apiFetch('/me')).resolves.toEqual({});

    expect(fetchMock.mock.calls[0][1].headers).toStrictEqual({
      'Content-Type': 'application/json',
    });
  });

  it.each([
    ['the status is not 426', 400, 'CLIENT_UPGRADE_REQUIRED'],
    ['the error code is not exact', 426, 'INTERNAL'],
    ['the error body has no code', 426, undefined],
  ])('does not latch a forced update when %s', async (_label, status, code: string | undefined) => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        ok: false,
        status,
        json: async () => (code === undefined ? {} : { code }),
      }),
    );

    await expect(api.apiFetch('/client-version-check')).rejects.toMatchObject({ status });

    expect(latchClientUpgradeRequired).not.toHaveBeenCalled();
  });

  it('latches only the exact first-party 426 client-upgrade contract', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 426,
        json: async () => ({ code: 'CLIENT_UPGRADE_REQUIRED' }),
      }),
    );

    await expect(api.apiFetch('/client-version-check')).rejects.toMatchObject({
      status: 426,
      code: 'CLIENT_UPGRADE_REQUIRED',
    });

    expect(latchClientUpgradeRequired).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the default JSON timeout', undefined, 20_000],
    ['a caller-selected timeout', 1_234, 1_234],
  ])('arms %s for the request', async (_label, timeoutMs: number | undefined, expectedDelay) => {
    fetchMock.mockResolvedValue(fakeResponse());
    const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');

    try {
      await api.apiFetch('/me', timeoutMs === undefined ? {} : { timeoutMs });

      // Headers and the JSON body are independently bounded: fetch() resolves
      // before a peer necessarily finishes streaming its body.
      expect(timeoutSpy.mock.calls.map(([, delay]) => delay)).toEqual([
        expectedDelay,
        expectedDelay,
      ]);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it('serializes the body as JSON', async () => {
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/items', {
      method: 'POST',
      body: { name: 'x', count: 2 },
    });

    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
    expect(fetchMock.mock.calls[0][1].body).toBe('{"name":"x","count":2}');
  });

  it('reads a request body accessor once before serializing it', async () => {
    fetchMock.mockResolvedValue(fakeResponse());
    let reads = 0;
    const options: { method: 'POST'; body?: unknown } = { method: 'POST' };
    Object.defineProperty(options, 'body', {
      enumerable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? { name: 'x' } : undefined;
      },
    });

    await api.apiFetch('/items', options);

    expect(reads).toBe(1);
    expect(fetchMock.mock.calls[0][1].body).toBe('{"name":"x"}');
  });

  it('subtracts elapsed header time from the response-body timeout budget', async () => {
    jest.useFakeTimers({ now: 1_000 });
    const response = deferred<Response>();
    const fetchStarted = deferred<void>();
    fetchMock.mockImplementationOnce(async () => {
      fetchStarted.resolve();
      return response.promise;
    });
    const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');

    try {
      const request = api.apiFetch('/budgeted', { timeoutMs: 100 });
      await expectBarrierBeforeSettlement(fetchStarted.promise, request);
      jest.advanceTimersByTime(40);
      response.resolve(fakeResponse());
      await request;

      expect(timeoutSpy.mock.calls.map(([, delay]) => delay)).toEqual([100, 60]);
    } finally {
      timeoutSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  it('times out a response body that never arrives after successful headers', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: () => new Promise(() => undefined),
      }),
    );

    const error = await catchAsync(api.apiFetch('/body-stalled', { timeoutMs: 10 }));

    expect(error).toMatchObject({
      status: 408,
      message: 'The response timed out. Please check your connection and try again.',
    });
  });

  it('preserves a caller reason while a successful response body is still pending', async () => {
    const caller = new AbortController();
    const reason = new Error('learner left this screen');
    const jsonStarted = deferred<void>();
    const jsonBody = deferred<unknown>();
    const cancel = jest.fn(async () => undefined);
    const addSpy = jest.spyOn(caller.signal, 'addEventListener');
    const removeSpy = jest.spyOn(caller.signal, 'removeEventListener');
    fetchMock.mockResolvedValueOnce({
      ...fakeResponse({
        json: () => {
          jsonStarted.resolve();
          return jsonBody.promise;
        },
      }),
      body: { cancel },
    } as unknown as Response);

    const request = catchAsync(
      api.apiFetch('/body-abort', {
        signal: caller.signal,
        timeoutMs: 60_000,
      }),
    );
    await expectBarrierBeforeSettlement(jsonStarted.promise, request);
    caller.abort(reason);
    jsonBody.resolve({ late: true });
    await expect(request).resolves.toBe(reason);
    await Promise.resolve();
    await Promise.resolve();

    const abortAdds = addSpy.mock.calls.filter(([event]) => event === 'abort');
    const abortRemoves = removeSpy.mock.calls.filter(([event]) => event === 'abort');
    expect(abortAdds).toHaveLength(2);
    expect(abortAdds.map(([, , options]) => options)).toEqual([{ once: true }, { once: true }]);
    expect(abortRemoves).toHaveLength(2);
    expect(cancel).toHaveBeenCalledTimes(1);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('preserves the caller abort when response-stream cancellation rejects', async () => {
    const caller = new AbortController();
    const reason = new Error('learner left while the body was open');
    const jsonStarted = deferred<void>();
    const jsonBody = deferred<unknown>();
    const cancel = jest.fn(() => Promise.reject(new Error('stream cancellation failed')));
    fetchMock.mockResolvedValueOnce({
      ...fakeResponse({
        json: () => {
          jsonStarted.resolve();
          return jsonBody.promise;
        },
      }),
      body: { cancel },
    } as unknown as Response);

    const request = catchAsync(
      api.apiFetch('/body-abort-with-failed-cleanup', {
        signal: caller.signal,
        timeoutMs: 60_000,
      }),
    );
    await expectBarrierBeforeSettlement(jsonStarted.promise, request);
    caller.abort(reason);
    jsonBody.resolve({ late: true });

    await expect(request).resolves.toBe(reason);
    await Promise.resolve();
    await Promise.resolve();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('does not start reading a body after a pre-aborted fetch resolves headers', async () => {
    const caller = new AbortController();
    const reason = new Error('cancelled before headers');
    const json = jest.fn(async () => ({ tooLate: true }));
    caller.abort(reason);
    fetchMock.mockResolvedValueOnce(fakeResponse({ json }));

    await expect(api.apiFetch('/pre-aborted-body', { signal: caller.signal })).rejects.toBe(reason);
    expect(json).not.toHaveBeenCalled();
  });

  it('uses the standard AbortError fallback when an aborted signal has a null reason', async () => {
    const caller = new AbortController();
    const json = jest.fn(async () => ({ tooLate: true }));
    caller.abort(null);
    fetchMock.mockResolvedValueOnce(fakeResponse({ json }));

    await expect(
      api.apiFetch('/legacy-abort-body', { signal: caller.signal }),
    ).rejects.toMatchObject({
      name: 'AbortError',
      message: 'The operation was aborted.',
    });
    expect(json).not.toHaveBeenCalled();
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

  it('marks a request started exactly once after token acquisition and immediately before fetch', async () => {
    const tokenReadStarted = deferred<void>();
    const allowTokenRead = deferred<string | null>();
    const events: string[] = [];
    jest.resetModules();
    const freshSecureStore = require('expo-secure-store') as typeof SecureStore;
    jest.mocked(freshSecureStore.getItemAsync).mockImplementationOnce(async () => {
      tokenReadStarted.resolve();
      return allowTokenRead.promise;
    });
    const fresh = require('../src/lib/api') as ApiModule;
    const onRequestStarted = jest.fn(() => events.push('request-started'));
    fetchMock.mockImplementationOnce(async () => {
      events.push('fetch');
      return fakeResponse();
    });

    const request = fresh.apiFetch('/me', { onRequestStarted });
    await expectBarrierBeforeSettlement(tokenReadStarted.promise, request);

    expect(onRequestStarted).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    allowTokenRead.resolve('jwt-after-delay');
    await expect(request).resolves.toEqual({});

    expect(onRequestStarted).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['request-started', 'fetch']);
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-after-delay',
    });
  });

  it('does not mark a pre-aborted request as started', async () => {
    const controller = new AbortController();
    const reason = new Error('cancelled before request start');
    const onRequestStarted = jest.fn();
    controller.abort(reason);
    fetchMock.mockRejectedValue(new Error('aborted by platform'));

    await catchAsync(
      api.apiFetch('/pre-aborted-start-hook', {
        signal: controller.signal,
        onRequestStarted,
      }),
    );

    expect(onRequestStarted).not.toHaveBeenCalled();
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

  it('requires an exact expected success status when the caller specifies one', async () => {
    const json = jest.fn(async () => ({ accepted: true }));
    fetchMock.mockResolvedValue(fakeResponse({ status: 200, json }));

    await expect(api.apiFetch('/gone', { expectedStatus: 204 })).rejects.toMatchObject({
      status: 502,
      message: 'The server returned an invalid response',
    });
    expect(json).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(fakeResponse({ status: 204 }));
    await expect(api.apiFetch('/gone', { expectedStatus: 204 })).resolves.toBeUndefined();
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

  it('does not relabel an earlier caller abort when fetch rejects after the timeout deadline', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const transport = deferred<Response>();
    const fetchStarted = deferred<void>();
    const platformAbort = new DOMException('cancelled by platform', 'AbortError');
    fetchMock.mockImplementationOnce(async () => {
      fetchStarted.resolve();
      return transport.promise;
    });

    try {
      const request = api.apiFetch('/near-deadline-abort', {
        signal: controller.signal,
        timeoutMs: 100,
      });
      await expectBarrierBeforeSettlement(fetchStarted.promise, request);
      controller.abort(new Error('learner cancelled'));
      jest.advanceTimersByTime(100);
      transport.reject(platformAbort);

      await expect(request).rejects.toBe(platformAbort);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not let a later caller abort overwrite an earlier request timeout', async () => {
    jest.useFakeTimers();
    const caller = new AbortController();
    const transport = deferred<Response>();
    const fetchStarted = deferred<void>();
    const platformFailure = new Error('transport settled after both aborts');
    fetchMock.mockImplementationOnce(async () => {
      fetchStarted.resolve();
      return transport.promise;
    });

    try {
      const request = catchAsync(
        api.apiFetch('/timeout-wins', { signal: caller.signal, timeoutMs: 100 }),
      );
      await expectBarrierBeforeSettlement(fetchStarted.promise, request);
      jest.advanceTimersByTime(100);
      caller.abort(new Error('later learner cancellation'));
      transport.reject(platformFailure);

      await expect(request).resolves.toMatchObject({
        status: 408,
        message: 'The request timed out. Please check your connection and try again.',
      });
    } finally {
      jest.useRealTimers();
    }
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

  it('does not let throwing abort-listener cleanup strand a completed body read', async () => {
    const caller = new AbortController();
    const removeSpy = jest.spyOn(caller.signal, 'removeEventListener').mockImplementation(() => {
      throw new Error('host signal cleanup failed');
    });
    fetchMock.mockResolvedValueOnce(fakeResponse({ json: async () => ({ ok: true }) }));

    try {
      await expect(
        api.apiFetch('/hostile-signal-cleanup', { signal: caller.signal }),
      ).resolves.toEqual({
        ok: true,
      });
      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    } finally {
      removeSpy.mockRestore();
    }
  });

  it('removes a completed 204 request timeout and abort listener', async () => {
    jest.useFakeTimers();
    const caller = new AbortController();
    const removeSpy = jest.spyOn(caller.signal, 'removeEventListener');
    let internalSignal: AbortSignal | undefined;
    fetchMock.mockImplementationOnce(async (_input: unknown, init?: RequestInit) => {
      internalSignal = init?.signal ?? undefined;
      return fakeResponse({ status: 204 });
    });

    try {
      await expect(
        api.apiFetch('/finished', { signal: caller.signal, timeoutMs: 100 }),
      ).resolves.toBeUndefined();
      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));

      jest.advanceTimersByTime(100);
      expect(internalSignal?.aborted).toBe(false);
    } finally {
      removeSpy.mockRestore();
      jest.useRealTimers();
    }
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

  it('preserves a timeout while reading a non-ok response body', async () => {
    const cancel = jest.fn(async () => undefined);
    fetchMock.mockResolvedValueOnce({
      ...fakeResponse({
        ok: false,
        status: 500,
        json: () => new Promise(() => undefined),
      }),
      body: { cancel },
    } as unknown as Response);

    await expect(api.apiFetch('/stalled-error', { timeoutMs: 10 })).rejects.toMatchObject({
      status: 408,
      message: 'The response timed out. Please check your connection and try again.',
    });
    expect(cancel).toHaveBeenCalledTimes(1);
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

  it.each([
    ['a number', 429],
    ['an object', { name: 'RATE_LIMITED' }],
    ['an array of codes', ['RATE_LIMITED']],
  ])('ignores a non-string body code (%s)', async (_case, code) => {
    fetchMock.mockResolvedValue(
      fakeResponse({ ok: false, status: 400, json: async () => ({ code }) }),
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

  it('maps a definitive missing S3 upload to the safe recording-again message', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 400,
        json: async () => ({ code: 'AUDIO_UPLOAD_MISSING' }),
      }),
    );

    const error = await catchAsync(api.apiFetch('/practice/attempt'));

    expect(error).toMatchObject({ status: 400, code: 'AUDIO_UPLOAD_MISSING' });
    expect(api.userMessageForError(error, 'Fallback')).toBe(t('error.audioInvalid'));
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
      ['body', {}, { retryAfterSeconds: 7 }, 7],
      ['header', { 'Retry-After': '9' }, { retryAfterSeconds: 7 }, 9],
      ['upper bound', {}, { retryAfterSeconds: 121 }, undefined],
    ])(
      'bounds REQUEST_IN_FLIGHT Retry-After from the %s',
      async (_case, headers, body, expected) => {
        fetchMock.mockResolvedValue(
          fakeResponse({
            ok: false,
            status: 409,
            headers,
            json: async () => ({ code: 'REQUEST_IN_FLIGHT', ...body }),
          }),
        );

        const error = (await catchAsync(api.apiFetch('/practice/attempt'))) as ApiErrorInstance;

        expect(error).toMatchObject({ status: 409, code: 'REQUEST_IN_FLIGHT' });
        expect(error.retryAfterSeconds).toBe(expected);
      },
    );

    it('ignores a retry hint on an unrelated 409', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 409,
          headers: { 'Retry-After': '7' },
          json: async () => ({ code: 'STATE_CHANGED', retryAfterSeconds: 7 }),
        }),
      );

      const error = (await catchAsync(api.apiFetch('/practice/attempt'))) as ApiErrorInstance;

      expect(error).toMatchObject({ status: 409, code: 'STATE_CHANGED' });
      expect(error.retryAfterSeconds).toBeUndefined();
    });

    it('keeps REQUEST_IN_FLIGHT seconds-only when the body also claims hours', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 409,
          json: async () => ({
            code: 'REQUEST_IN_FLIGHT',
            retryAfterSeconds: 2,
            retryAfterHours: 48,
          }),
        }),
      );

      const error = (await catchAsync(api.apiFetch('/practice/attempt'))) as ApiErrorInstance;

      expect(error).toMatchObject({
        status: 409,
        code: 'REQUEST_IN_FLIGHT',
        retryAfterSeconds: 2,
        retryAfterHours: undefined,
      });
      expect(api.userMessageForError(error, 'Fallback')).toBe(
        `${t('error.stillChecking')} ${t('wait.seconds', { count: 2 })}`,
      );
    });

    it('ignores REQUEST_IN_FLIGHT retry hints on a non-409 response', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 400,
          headers: { 'Retry-After': '7' },
          json: async () => ({ code: 'REQUEST_IN_FLIGHT', retryAfterSeconds: 9 }),
        }),
      );

      const error = (await catchAsync(api.apiFetch('/practice/attempt'))) as ApiErrorInstance;

      expect(error).toMatchObject({ status: 400, code: 'REQUEST_IN_FLIGHT' });
      expect(error.retryAfterSeconds).toBeUndefined();
    });

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

    // JSON can carry a quoted delay, a boolean, or an overflowing 1e999
    // literal; only a finite JSON number may become a wait line.
    it.each([
      ['the string "30"', '30'],
      ['the boolean true', true],
      ['an infinite number', Number.POSITIVE_INFINITY],
    ])('ignores a 503 body retryAfterSeconds carrying %s', async (_case, seconds) => {
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 503,
          json: async () => ({ retryAfterSeconds: seconds }),
        }),
      );

      const error = (await catchAsync(api.apiFetch('/busy'))) as ApiErrorInstance;

      expect(error.retryAfterSeconds).toBeUndefined();
      expect(api.userMessageForError(error, 'Fallback')).toBe(t('error.serverBusy'));
    });

    it.each([
      ['the string "24"', '24'],
      ['the boolean true', true],
      ['an infinite number', Number.POSITIVE_INFINITY],
    ])('ignores a 429 body retryAfterHours carrying %s', async (_case, hours) => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 429, json: async () => ({ retryAfterHours: hours }) }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error.retryAfterHours).toBeUndefined();
      expect(api.userMessageForError(error, 'Fallback')).toBe(t('error.tooMany'));
    });

    it.each([
      [
        'cannot be parsed',
        async () => {
          throw new SyntaxError('Unexpected token');
        },
      ],
      ['is not an object', async () => 'service unavailable'],
    ])('still yields a plain retry-free ApiError when a 503 body %s', async (_case, json) => {
      fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 503, json }));

      const error = (await catchAsync(api.apiFetch('/busy'))) as ApiErrorInstance;

      expect(error).toBeInstanceOf(api.ApiError);
      expect(error).toMatchObject({ status: 503, message: 'Request failed with status 503' });
      expect(error.retryAfterSeconds).toBeUndefined();
      expect(error.retryAfterHours).toBeUndefined();
    });

    it('does not trust properties attached to a callable error body', async () => {
      const callableBody = Object.assign(() => undefined, {
        code: 'RATE_LIMITED',
        retryAfterSeconds: 30,
      });
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 429, json: async () => callableBody }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error.code).toBeUndefined();
      expect(error.retryAfterSeconds).toBeUndefined();
    });

    it('keeps a primitive 429 body retry-free instead of dereferencing it', async () => {
      fetchMock.mockResolvedValue(
        fakeResponse({ ok: false, status: 429, json: async () => 'rate limited' }),
      );

      const error = (await catchAsync(api.apiFetch('/limited'))) as ApiErrorInstance;

      expect(error).toBeInstanceOf(api.ApiError);
      expect(error).toMatchObject({
        status: 429,
        code: undefined,
        retryAfterSeconds: undefined,
        retryAfterHours: undefined,
      });
    });

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

    it('renders the shared per-network daily cap as hours, not minutes', async () => {
      // express-rate-limit answers the daily cap with a Retry-After header and
      // no retryAfterHours field, so the whole wait arrives as seconds.
      fetchMock.mockResolvedValue(
        fakeResponse({
          ok: false,
          status: 429,
          headers: { 'Retry-After': '86400' },
          json: async () => ({ code: 'NETWORK_DAILY_LIMIT' }),
        }),
      );

      const error = await catchAsync(api.apiFetch('/practice/attempt'));

      expect(error).toMatchObject({
        status: 429,
        code: 'NETWORK_DAILY_LIMIT',
        retryAfterSeconds: 86_400,
        retryAfterHours: undefined,
      });
      expect(api.userMessageForError(error, 'Fallback')).toBe(
        `${t('error.networkDailyLimit')} ${t('wait.hours', { count: 24 })}`,
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
    expect(fetchMock).toHaveBeenCalledWith(
      'blob:https://app/audio-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
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

  it('aborts a stalled web descriptor read instead of continuing to an upload grant', async () => {
    mockPlatform.OS = 'web';
    const blob = deferred<Blob>();
    const cancel = jest.fn(async () => undefined);
    fetchMock.mockResolvedValueOnce({
      blob: () => blob.promise,
      body: { cancel },
    } as unknown as Response);
    const controller = new AbortController();

    const descriptor = api.resolveAudioFileDescriptor('blob:https://app/audio-1', {
      signal: controller.signal,
      timeoutMs: 60_000,
    });
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();

    await expect(descriptor).rejects.toMatchObject({ name: 'AbortError' });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('surfaces a stalled web descriptor fetch instead of spending a second timeout on a grant', async () => {
    mockPlatform.OS = 'web';
    fetchUntilAborted();

    const error = await catchAsync(
      api.resolveAudioFileDescriptor('blob:https://app/audio-1', { timeoutMs: 10 }),
    );

    expect(error).toMatchObject({ status: 408 });
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
      { questionId: 'q-1', requestId: 'r-1', retainRecording: 'false' },
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
      { name: 'retainRecording', value: 'false' },
    ]);
  });

  it('omits the Authorization header when no token is stored', async () => {
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiUploadAudio('/practice/attempt', 'file:///rec/a.wav', {});

    expect(fetchMock.mock.calls[0][1].headers).toEqual({});
  });

  it('sends X-Client-Version on multipart uploads when a version is configured', async () => {
    mockVersion.value = '1.0.0';
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ ok: true }) }));

    await api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {});

    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'X-Client-Version': '1.0.0' });
  });

  it('latches the exact upgrade contract from a direct first-party audio submission', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        ok: false,
        status: 426,
        json: async () => ({ code: 'CLIENT_UPGRADE_REQUIRED' }),
      }),
    );

    await expect(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {}),
    ).rejects.toMatchObject({ status: 426, code: 'CLIENT_UPGRADE_REQUIRED' });
    expect(latchClientUpgradeRequired).toHaveBeenCalledTimes(1);
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

    expect(fetchMock.mock.calls[0][0]).toBe('blob:https://app/audio-1');
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock.mock.calls[1][1].redirect).toBe('error');
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

  it('does not mark a direct upload as started until its local web blob is ready', async () => {
    mockPlatform.OS = 'web';
    const body = deferred<Blob>();
    const onRequestStarted = jest.fn();
    fetchMock
      .mockResolvedValueOnce({ ok: true, blob: () => body.promise } as unknown as Response)
      .mockResolvedValueOnce(fakeResponse({ json: async () => ({ ok: true }) }));

    const upload = api.apiUploadAudio(
      '/practice/attempt',
      'blob:https://app/audio-1',
      {},
      { onRequestStarted },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(onRequestStarted).not.toHaveBeenCalled();

    body.resolve(new Blob(['audio-bytes'], { type: 'audio/webm' }));
    await expect(upload).resolves.toEqual({ ok: true });
    expect(onRequestStarted).toHaveBeenCalledTimes(1);
  });

  it('rejects a failed local web blob response before starting the API upload', async () => {
    mockPlatform.OS = 'web';
    fetchMock.mockResolvedValueOnce(fakeResponse({ ok: false, status: 404 }));

    await expect(
      api.apiUploadAudio('/practice/attempt', 'blob:https://app/missing', {}),
    ).rejects.toMatchObject({ status: 404 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('never latches from a look-alike 426 returned by a local browser blob URL', async () => {
    mockPlatform.OS = 'web';
    fetchMock.mockResolvedValueOnce(
      fakeResponse({
        ok: false,
        status: 426,
        json: async () => ({ code: 'CLIENT_UPGRADE_REQUIRED' }),
      }),
    );

    await expect(
      api.apiUploadAudio('/practice/attempt', 'blob:https://app/missing', {}),
    ).rejects.toMatchObject({ status: 426, code: 'CLIENT_UPGRADE_REQUIRED' });
    expect(latchClientUpgradeRequired).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not mark a pre-aborted direct upload as started', async () => {
    const caller = new AbortController();
    const reason = new Error('cancelled before direct upload');
    const onRequestStarted = jest.fn();
    caller.abort(reason);
    fetchMock.mockRejectedValueOnce(reason);

    await expect(
      api.apiUploadAudio(
        '/practice/attempt',
        'file:///rec/a.m4a',
        {},
        {
          signal: caller.signal,
          onRequestStarted,
        },
      ),
    ).rejects.toBe(reason);
    expect(onRequestStarted).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetchMock.mock.calls[0][1].signal.reason).toBe(reason);
  });

  it('forwards a pre-aborted signal to the local web recording fetch', async () => {
    mockPlatform.OS = 'web';
    const caller = new AbortController();
    const reason = new Error('cancelled before reading the browser recording');
    const platformFailure = new Error('browser fetch observed cancellation');
    caller.abort(reason);
    fetchMock.mockRejectedValueOnce(platformFailure);

    await expect(
      api.apiUploadAudio(
        '/practice/attempt',
        'blob:https://app/audio-1',
        {},
        { signal: caller.signal },
      ),
    ).rejects.toBe(platformFailure);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetchMock.mock.calls[0][1].signal.reason).toBe(reason);
  });

  it('aborts a pending local web recording-body read before the direct API upload', async () => {
    mockPlatform.OS = 'web';
    const caller = new AbortController();
    const reason = new Error('screen left while reading the direct-upload recording');
    const blobStarted = deferred<void>();
    const blobBody = deferred<Blob>();
    const cancel = jest.fn(async () => undefined);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: () => {
        blobStarted.resolve();
        return blobBody.promise;
      },
      body: { cancel },
    } as unknown as Response);

    const upload = catchAsync(
      api.apiUploadAudio(
        '/practice/attempt',
        'blob:https://app/audio-1',
        {},
        { signal: caller.signal },
      ),
    );
    await expectBarrierBeforeSettlement(blobStarted.promise, upload);
    caller.abort(reason);
    blobBody.resolve(new Blob(['late audio'], { type: 'audio/webm' }));

    await expect(upload).resolves.toBe(reason);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it('preserves a 408 when a successful direct-upload response body stalls', async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({
        json: () => new Promise(() => undefined),
      }),
    );

    await expect(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {}, { timeoutMs: 10 }),
    ).rejects.toMatchObject({
      status: 408,
      message: 'The response timed out. Please check your connection and try again.',
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
  const assessmentEndpoint = '/practice/attempt' as const;
  const audioKey = `audio-uploads/practice/${ownerId}/550e8400-e29b-41d4-a716-446655440002.m4a`;
  const uploadFields = {
    key: audioKey,
    'Content-Type': 'audio/mp4',
    Policy: 'signed-policy',
  };

  it('posts the content type and parses the grant', async () => {
    const grant = {
      mode: 's3',
      assessmentEndpoint,
      uploadUrl: 'https://bucket.s3.amazonaws.com/',
      uploadFields,
      audioKey,
      contentType: 'audio/mp4',
      expiresIn: 900,
      maxBytes: 25 * 1024 * 1024,
    };
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => grant }));

    const result = await api.apiRequestAudioUpload('audio/mp4', ownerId, {
      assessmentEndpoint,
    });

    expect(result).toEqual(grant);
    const [input, init] = fetchMock.mock.calls[0];
    expect(input).toBe('http://localhost:4000/uploads/audio-url');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ contentType: 'audio/mp4', assessmentEndpoint }));
    expect(JSON.parse(init.body as string)).not.toHaveProperty('bucket');
    expect(JSON.parse(init.body as string)).not.toHaveProperty('bucketName');
  });

  it('accepts the direct-upload fallback without applying S3-only checks', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ mode: 'direct', assessmentEndpoint }) }),
    );

    await expect(
      api.apiRequestAudioUpload('audio/mp4', ownerId, { assessmentEndpoint }),
    ).resolves.toEqual({
      mode: 'direct',
      assessmentEndpoint,
    });
  });

  it.each(['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native'] as const)(
    'sends the exact logical assessment endpoint %s without a bucket selector',
    async (endpoint) => {
      fetchMock.mockResolvedValue(
        fakeResponse({ json: async () => ({ mode: 'direct', assessmentEndpoint: endpoint }) }),
      );

      await api.apiRequestAudioUpload('audio/mp4', ownerId, { assessmentEndpoint: endpoint });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
      expect(body).toEqual({ contentType: 'audio/mp4', assessmentEndpoint: endpoint });
      expect(Object.keys(body)).not.toEqual(
        expect.arrayContaining(['bucket', 'bucketName', 'bucketArn', 'bucketHost']),
      );
    },
  );

  it('forwards the caller abort signal to the grant request', async () => {
    fetchUntilAborted();
    const controller = new AbortController();

    const pending = catchAsync(
      api.apiRequestAudioUpload('audio/mp4', ownerId, {
        assessmentEndpoint,
        signal: controller.signal,
      }),
    );
    controller.abort();

    const error = await pending;
    expect(error).toMatchObject({ name: 'AbortError' });
  });

  it('compares a signed content type with the normalized requested value', async () => {
    const grant = {
      mode: 's3',
      assessmentEndpoint,
      uploadUrl: 'https://bucket.s3.amazonaws.com/',
      uploadFields,
      audioKey,
      contentType: 'audio/mp4',
      expiresIn: 900,
      maxBytes: 25 * 1024 * 1024,
    };
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => grant }));

    await expect(
      api.apiRequestAudioUpload('  AUDIO/MP4  ', ownerId, { assessmentEndpoint }),
    ).resolves.toEqual(grant);
  });

  it('rejects a malformed grant as a contract error', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ mode: 'carrier-pigeon' }) }));

    await expect(
      api.apiRequestAudioUpload('audio/mp4', ownerId, { assessmentEndpoint }),
    ).rejects.toThrow(ContractError);
  });

  it('rejects a signed content type that differs from the requested recording', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          mode: 's3',
          assessmentEndpoint,
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

    await expect(
      api.apiRequestAudioUpload('audio/mp4', ownerId, { assessmentEndpoint }),
    ).rejects.toThrow(ContractError);
  });

  it('rejects a self-consistent grant signed for a content type nobody asked for', async () => {
    // Everything below parses: only the requested-vs-granted comparison in
    // apiRequestAudioUpload can catch a grant for the wrong container.
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          mode: 's3',
          assessmentEndpoint,
          uploadUrl: 'https://bucket.s3.amazonaws.com/',
          uploadFields,
          audioKey,
          contentType: 'audio/mp4',
          expiresIn: 900,
          maxBytes: 25 * 1024 * 1024,
        }),
      }),
    );

    await expect(
      api.apiRequestAudioUpload('audio/webm', ownerId, { assessmentEndpoint }),
    ).rejects.toThrow(ContractError);
  });

  it('rejects an otherwise valid grant whose object key belongs to another user', async () => {
    const otherKey =
      'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440099/550e8400-e29b-41d4-a716-446655440002.m4a';
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          mode: 's3',
          assessmentEndpoint,
          uploadUrl: 'https://bucket.s3.amazonaws.com/',
          uploadFields: { ...uploadFields, key: otherKey },
          audioKey: otherKey,
          contentType: 'audio/mp4',
          expiresIn: 900,
          maxBytes: 25 * 1024 * 1024,
        }),
      }),
    );

    await expect(
      api.apiRequestAudioUpload('audio/mp4', ownerId, { assessmentEndpoint }),
    ).rejects.toThrow(ContractError);
  });

  it.each(['direct', 's3'] as const)(
    'rejects a %s grant echoed for a different assessment endpoint',
    async (mode) => {
      const diagnosticKey = audioKey.replace('/practice/', '/diagnostic/');
      const mismatchedGrant =
        mode === 'direct'
          ? { mode, assessmentEndpoint: '/diagnostic/answer' }
          : {
              mode,
              assessmentEndpoint: '/diagnostic/answer',
              uploadUrl: 'https://bucket.s3.amazonaws.com/',
              uploadFields: { ...uploadFields, key: diagnosticKey },
              audioKey: diagnosticKey,
              contentType: 'audio/mp4',
              expiresIn: 900,
              maxBytes: 25 * 1024 * 1024,
            };
      fetchMock.mockResolvedValue(fakeResponse({ json: async () => mismatchedGrant }));

      await expect(
        api.apiRequestAudioUpload('audio/mp4', ownerId, { assessmentEndpoint }),
      ).rejects.toThrow(ContractError);
    },
  );

  it('rejects an owned key whose scope does not match the requested endpoint', async () => {
    const diagnosticKey = `audio-uploads/diagnostic/${ownerId}/550e8400-e29b-41d4-a716-446655440002.m4a`;
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          mode: 's3',
          assessmentEndpoint,
          uploadUrl: 'https://bucket.s3.amazonaws.com/',
          uploadFields: { ...uploadFields, key: diagnosticKey },
          audioKey: diagnosticKey,
          contentType: 'audio/mp4',
          expiresIn: 900,
          maxBytes: 25 * 1024 * 1024,
        }),
      }),
    );

    await expect(
      api.apiRequestAudioUpload('audio/mp4', ownerId, { assessmentEndpoint }),
    ).rejects.toThrow(ContractError);
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

  it('never latches from a look-alike 426 returned by S3', async () => {
    mockPlatform.OS = 'web';
    const blob = new Blob(['web-audio'], { type: 'audio/webm' });
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => blob,
      } as unknown as Response)
      .mockResolvedValueOnce(
        fakeResponse({
          ok: false,
          status: 426,
          json: async () => ({ code: 'CLIENT_UPGRADE_REQUIRED' }),
        }),
      );

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 426, code: 'CLIENT_UPGRADE_REQUIRED' });
    expect(latchClientUpgradeRequired).not.toHaveBeenCalled();
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

  it('does not relabel an earlier native-upload cancellation after the timeout deadline', async () => {
    jest.useFakeTimers();
    const caller = new AbortController();
    const upload = deferred<Awaited<ReturnType<File['upload']>>>();
    const uploadStarted = deferred<void>();
    const platformAbort = new DOMException('cancelled by native upload', 'AbortError');
    mockFileUpload.mockImplementationOnce(async () => {
      uploadStarted.resolve();
      return upload.promise;
    });

    try {
      const request = api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
        { signal: caller.signal, timeoutMs: 100 },
      );
      await expectBarrierBeforeSettlement(uploadStarted.promise, request);
      caller.abort(new Error('learner cancelled'));
      jest.advanceTimersByTime(100);
      upload.reject(platformAbort);

      await expect(request).rejects.toBe(platformAbort);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not let a later caller abort overwrite an earlier native-upload timeout', async () => {
    jest.useFakeTimers();
    const caller = new AbortController();
    const upload = deferred<Awaited<ReturnType<File['upload']>>>();
    const uploadStarted = deferred<void>();
    const platformFailure = new Error('native upload settled after both aborts');
    mockFileUpload.mockImplementationOnce(async () => {
      uploadStarted.resolve();
      return upload.promise;
    });

    try {
      const request = catchAsync(
        api.apiPostPresignedAudio(
          uploadUrl,
          uploadFields,
          'file:///rec/a.m4a',
          'audio/mp4',
          maxBytes,
          { signal: caller.signal, timeoutMs: 100 },
        ),
      );
      await expectBarrierBeforeSettlement(uploadStarted.promise, request);
      jest.advanceTimersByTime(100);
      caller.abort(new Error('later learner cancellation'));
      upload.reject(platformFailure);

      await expect(request).resolves.toMatchObject({
        status: 408,
        message: 'The recording upload timed out',
      });
    } finally {
      jest.useRealTimers();
    }
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

  it('validates one stable native file-size snapshot', async () => {
    let sizeReads = 0;
    jest.mocked(File).mockImplementationOnce(
      () =>
        ({
          exists: true,
          get size() {
            sizeReads += 1;
            return sizeReads === 1 ? maxBytes + 1 : 5;
          },
          upload: mockFileUpload,
        }) as unknown as File,
    );

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        uploadFields,
        'file:///rec/a.m4a',
        'audio/mp4',
        maxBytes,
      ),
    ).rejects.toMatchObject({ status: 413, message: 'The recording is too large' });
    expect(sizeReads).toBe(1);
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

  it('aborts a pending browser recording-body read before posting to S3', async () => {
    mockPlatform.OS = 'web';
    const caller = new AbortController();
    const reason = new Error('screen left while reading the browser recording');
    const blobStarted = deferred<void>();
    const blobBody = deferred<Blob>();
    const cancel = jest.fn(async () => undefined);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: () => {
        blobStarted.resolve();
        return blobBody.promise;
      },
      body: { cancel },
    } as unknown as Response);

    const upload = catchAsync(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
        { signal: caller.signal },
      ),
    );
    await expectBarrierBeforeSettlement(blobStarted.promise, upload);
    caller.abort(reason);
    blobBody.resolve(new Blob(['late audio'], { type: 'audio/webm' }));

    await expect(upload).resolves.toBe(reason);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('forwards a pre-aborted signal to the browser recording fetch for an S3 upload', async () => {
    mockPlatform.OS = 'web';
    const caller = new AbortController();
    const reason = new Error('cancelled before the S3 handoff read');
    const platformFailure = new Error('browser fetch observed cancellation');
    caller.abort(reason);
    fetchMock.mockRejectedValueOnce(platformFailure);

    await expect(
      api.apiPostPresignedAudio(
        uploadUrl,
        { ...uploadFields, 'Content-Type': 'audio/webm' },
        'blob:https://app/audio-1',
        'audio/webm',
        maxBytes,
        { signal: caller.signal },
      ),
    ).rejects.toBe(platformFailure);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetchMock.mock.calls[0][1].signal.reason).toBe(reason);
  });

  it('forwards caller cancellation to the final browser S3 POST', async () => {
    mockPlatform.OS = 'web';
    const caller = new AbortController();
    const reason = new Error('cancelled during the S3 POST');
    const platformFailure = new Error('S3 transport observed cancellation');
    const postStarted = deferred<void>();
    const postTransport = deferred<Response>();
    const body = new Blob(['web-audio'], { type: 'audio/webm' });
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => body } as Response)
      .mockImplementationOnce((_url, init?: RequestInit) => {
        postStarted.resolve();
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return postTransport.promise;
      });

    const upload = api.apiPostPresignedAudio(
      uploadUrl,
      { ...uploadFields, 'Content-Type': 'audio/webm' },
      'blob:https://app/audio-1',
      'audio/webm',
      maxBytes,
      { signal: caller.signal },
    );
    const outcome = catchAsync(upload);
    await expectBarrierBeforeSettlement(postStarted.promise, upload);
    const postSignal = fetchMock.mock.calls[1][1].signal as AbortSignal;
    caller.abort(reason);
    const signalWasAborted = postSignal.aborted;
    const forwardedReason = postSignal.reason;
    postTransport.reject(platformFailure);

    await expect(outcome).resolves.toBe(platformFailure);
    expect(signalWasAborted).toBe(true);
    expect(forwardedReason).toBe(reason);
  });

  it('never sends X-Client-Version to S3 — presigned POSTs go to AWS, not our API', async () => {
    mockVersion.value = '1.0.0';
    mockPlatform.OS = 'web';
    const body = { size: 5 } as Blob;
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => body })
      .mockResolvedValueOnce(fakeResponse({ ok: true, status: 204 }));

    await api.apiPostPresignedAudio(
      uploadUrl,
      { ...uploadFields, 'Content-Type': 'audio/webm' },
      'blob:https://app/audio-1',
      'audio/webm',
      maxBytes,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(uploadUrl);
    expect(fetchMock.mock.calls[1][1].headers).toBeUndefined();
  });

  it.each([
    ['the default audio timeout', undefined, 150_000],
    ['a caller-selected audio timeout', 1_234, 1_234],
  ])(
    'applies %s to browser upload requests and their local blob body',
    async (_label, timeoutMs, expectedDelay) => {
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

        const delays = timeoutSpy.mock.calls.map(([, delay]) => delay as number);
        // The local-blob fetch begins with the whole end-to-end allowance;
        // later body/upload operations receive its remaining portion. Wall
        // clock time can advance one millisecond between mocked awaits, so
        // pin the budget shape rather than an accidentally exact timestamp.
        expect(delays).toHaveLength(3);
        expect(delays[0]).toBe(expectedDelay);
        for (const delay of delays.slice(1)) {
          expect(delay).toBeGreaterThanOrEqual(1);
          expect(delay).toBeLessThanOrEqual(expectedDelay);
        }
      } finally {
        timeoutSpy.mockRestore();
      }
    },
  );
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
    // An empty query/fragment reads as '' from url.search/url.hash but stays
    // in the serialized href, so every path would land after the delimiter.
    'https://api.example.com/api?',
    'https://api.example.com/api#',
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
  nativeLanguage: null,
  cycleId: '550e8400-e29b-41d4-a716-446655440020',
  attemptNo: 1,
  score: 82,
  passed: true,
  understood: null,
  transcript: 'I was brave.',
  translatedTranscript: null,
  modelAnswer: null,
  feedback: 'Nice work.',
  createdAt: '2026-08-15T10:00:00.000Z',
};

const PROFILE_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'hi',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

function userExportPage(overrides: Record<string, unknown> = {}) {
  return {
    user: PROFILE_USER,
    attempts: [],
    practiceProgress: [],
    practiceCycles: [],
    diagnosticState: null,
    nextCursor: null,
    nextPracticeCycleCursor: null,
    attemptsDone: true,
    practiceCyclesDone: true,
    ...overrides,
  };
}

describe('typed endpoint helpers', () => {
  const recordingId = '550e8400-e29b-41d4-a716-446655440090';
  const recordingBody = {
    id: recordingId,
    questionId: HISTORY_ITEM.questionId,
    context: 'practice',
    promptWord: 'courage',
    questionText: 'Describe courage.',
    cefrLevel: 'B1',
    contentType: 'audio/mp4',
    sizeBytes: 2_048,
    durationMs: 8_000,
    status: 'available',
    createdAt: '2026-08-25T00:00:00.000Z',
    availableAt: '2026-08-25T00:00:01.000Z',
  };
  const playbackUrl =
    'https://private.s3.us-west-1.amazonaws.com/object?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=x&X-Amz-Date=20260825T000000Z&X-Amz-Expires=60&X-Amz-SignedHeaders=host&X-Amz-Signature=abc';

  it('apiGetPracticeStats fetches /practice/stats and returns the parsed stats', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => STATS_BODY }));

    await expect(api.apiGetPracticeStats()).resolves.toEqual(STATS_BODY);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/practice/stats?timeZone=${encodeURIComponent(timeZone)}`,
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

  it('loads recordings, lazily requests a playback URL, and supports owner-scoped deletion', async () => {
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({ json: async () => ({ items: [recordingBody], nextCursor: null }) }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => ({
            recordingId,
            playbackUrl,
            expiresIn: 60,
            contentType: 'audio/mp4',
          }),
        }),
      )
      .mockResolvedValueOnce(fakeResponse({ status: 204 }))
      .mockResolvedValueOnce(fakeResponse({ status: 204 }));

    await expect(api.apiGetRecordings()).resolves.toEqual({
      items: [recordingBody],
      nextCursor: null,
    });
    await expect(api.apiGetRecordingPlaybackGrant(recordingId)).resolves.toEqual({
      recordingId,
      playbackUrl,
      expiresIn: 60,
      contentType: 'audio/mp4',
    });
    await expect(api.apiDeleteRecording(recordingId)).resolves.toBeUndefined();
    await expect(api.apiDeleteAllRecordings()).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:4000/recordings?limit=20',
      `http://localhost:4000/recordings/${recordingId}/playback-url`,
      `http://localhost:4000/recordings/${recordingId}`,
      'http://localhost:4000/recordings',
    ]);
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(fetchMock.mock.calls[2][1]).toEqual(expect.objectContaining({ method: 'DELETE' }));
    expect(fetchMock.mock.calls[3][1]).toEqual(expect.objectContaining({ method: 'DELETE' }));
  });

  it('URL-encodes the recordings cursor', async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ items: [recordingBody], nextCursor: null }) }),
    );

    await api.apiGetRecordings('older page / + ?', controller.signal);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:4000/recordings?limit=20&cursor=older%20page%20%2F%20%2B%20%3F',
    );
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('rejects a playback grant that echoes another recording id', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          recordingId: HISTORY_ITEM.id,
          playbackUrl,
          expiresIn: 60,
          contentType: 'audio/mp4',
        }),
      }),
    );
    await expect(api.apiGetRecordingPlaybackGrant(recordingId)).rejects.toBeInstanceOf(
      ContractError,
    );
  });

  it('exports attempts and recording metadata under one pinned token', async () => {
    await api.saveToken('pinned-export-token');
    const consumeUser = jest.fn();
    const consumeRecordings = jest.fn();
    fetchMock
      .mockImplementationOnce(async () => {
        await api.saveToken('replacement-token');
        return fakeResponse({
          json: async () => userExportPage(),
        });
      })
      .mockResolvedValueOnce(fakeResponse({ json: async () => userExportPage() }))
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => ({
            recordings: [
              {
                ...recordingBody,
                requestId: HISTORY_ITEM.questionId,
                attemptId: HISTORY_ITEM.id,
              },
            ],
            nextCursor: null,
          }),
        }),
      );

    await api.apiConsumeAccountExportPages(consumeUser, consumeRecordings);
    expect(consumeUser).toHaveBeenNthCalledWith(1, userExportPage(), 0);
    expect(consumeUser).toHaveBeenNthCalledWith(2, userExportPage(), 1);
    expect(consumeRecordings).toHaveBeenCalledWith(
      {
        recordings: [
          {
            ...recordingBody,
            requestId: HISTORY_ITEM.questionId,
            attemptId: HISTORY_ITEM.id,
          },
        ],
        nextCursor: null,
      },
      0,
    );
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers.Authorization).toBe('Bearer pinned-export-token');
    }
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:4000/auth/me/data?limit=500&attemptsDone=false&practiceCyclesDone=true',
      'http://localhost:4000/auth/me/data?limit=500&attemptsDone=true&practiceCyclesDone=false',
      'http://localhost:4000/recordings/export?limit=500',
    ]);
  });

  it('walks recording-export pages and rejects a repeated cursor before duplicate emission', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440099';
    const consume = jest.fn();
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => ({
          recordings: [
            {
              ...recordingBody,
              requestId: HISTORY_ITEM.questionId,
              attemptId: null,
            },
          ],
          nextCursor: cursor,
        }),
      }),
    );

    await expect(api.apiConsumeRecordingExportPages(consume)).rejects.toBeInstanceOf(ContractError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consume).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `http://localhost:4000/recordings/export?limit=500&cursor=${cursor}`,
    );
  });

  it('walks distinct recording-export pages with increasing indices and one caller signal', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440099';
    const controller = new AbortController();
    const consume = jest.fn();
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => ({
            recordings: [{ ...recordingBody, requestId: HISTORY_ITEM.questionId, attemptId: null }],
            nextCursor: cursor,
          }),
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({ json: async () => ({ recordings: [], nextCursor: null }) }),
      );

    await api.apiConsumeRecordingExportPages(consume, controller.signal);

    expect(consume.mock.calls.map(([, page]) => page)).toEqual([0, 1]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:4000/recordings/export?limit=500',
      `http://localhost:4000/recordings/export?limit=500&cursor=${cursor}`,
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.signal).toBeDefined();
      expect(init.signal?.aborted).toBe(false);
    }
  });

  it('aborts a later recording-export page through the caller signal', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440099';
    const controller = new AbortController();
    const reason = new Error('stop recording export');
    let markSecondRequestStarted!: () => void;
    const secondRequestStarted = new Promise<void>((resolve) => {
      markSecondRequestStarted = resolve;
    });
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => ({
            recordings: [{ ...recordingBody, requestId: HISTORY_ITEM.questionId, attemptId: null }],
            nextCursor: cursor,
          }),
        }),
      )
      .mockImplementationOnce((_url, init?: RequestInit) => {
        const signal = init?.signal;
        if (!signal) throw new Error('recording export omitted its signal');
        markSecondRequestStarted();
        return new Promise<Response>((_resolve, reject) => {
          const fail = () => reject(signal.reason);
          if (signal.aborted) fail();
          else signal.addEventListener('abort', fail, { once: true });
        });
      });

    const exportWalk = api.apiConsumeRecordingExportPages(jest.fn(), controller.signal);
    const exportOutcome = exportWalk.catch((error: unknown) => error);
    await secondRequestStarted;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    controller.abort(reason);

    await expect(exportOutcome).resolves.toBe(reason);
  });

  it('rejects the ten-thousandth nonterminal recording-export page before emitting it', async () => {
    let request = 0;
    const consume = jest.fn();
    fetchMock.mockImplementation(async () => {
      if (request >= 10_000) {
        throw new Error('recording export exceeded its request bound');
      }
      const cursor = `550e8400-e29b-41d4-8000-${String(request++).padStart(12, '0')}`;
      return fakeResponse({
        json: async () => ({
          recordings: [{ ...recordingBody, requestId: HISTORY_ITEM.questionId, attemptId: null }],
          nextCursor: cursor,
        }),
      });
    });

    await expect(api.apiConsumeRecordingExportPages(consume)).rejects.toBeInstanceOf(ContractError);
    expect(fetchMock).toHaveBeenCalledTimes(10_000);
    expect(consume).toHaveBeenCalledTimes(9_999);
    expect(consume.mock.calls.at(-1)?.[1]).toBe(9_998);
  });

  it.each([
    ['custom reason', new Error('export lease changed')],
    ['null reason', null],
  ] as const)('stops between account-export stages for a %s', async (_label, reason) => {
    const controller = new AbortController();
    const consumeUser = jest.fn(() => controller.abort(reason));
    const consumeRecordings = jest.fn();
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => userExportPage() }));

    const outcome = api.apiConsumeAccountExportPages(
      consumeUser,
      consumeRecordings,
      controller.signal,
    );
    if (reason) {
      await expect(outcome).rejects.toBe(reason);
    } else {
      await expect(outcome).rejects.toMatchObject({ name: 'AbortError', message: 'Aborted' });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consumeRecordings).not.toHaveBeenCalled();
  });

  it('apiSkipPracticeWord POSTs the question id to /practice/skip', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ status: 204 }));

    await api.apiSkipPracticeWord(HISTORY_ITEM.questionId, '550e8400-e29b-41d4-a716-446655440020');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/practice/skip',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          questionId: HISTORY_ITEM.questionId,
          cycleId: '550e8400-e29b-41d4-a716-446655440020',
        }),
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

    await api.apiResetPassword('ada@example.com', 'abcdef123456', ' NewPass123 ');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4000/auth/reset-password');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({
        email: 'ada@example.com',
        token: 'abcdef123456',
        newPassword: ' NewPass123 ',
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

  it('apiUpdateProfile PATCHes the UI language independently', async () => {
    const updated = { ...PROFILE_USER, uiLanguage: 'es' as const };
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => ({ user: updated }) }));

    await expect(api.apiUpdateProfile({ uiLanguage: 'es' })).resolves.toEqual(updated);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/auth/me',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ uiLanguage: 'es' }) }),
    );
  });

  it('apiUpdateProfile rejects a malformed user payload', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ user: { ...PROFILE_USER, nativeLanguage: 'fr' } }) }),
    );

    await expect(api.apiUpdateProfile({ name: 'Ada' })).rejects.toBeInstanceOf(ContractError);
  });

  it('apiUpdateProfile rejects an unsupported UI language in the response', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ user: { ...PROFILE_USER, uiLanguage: 'fr' } }) }),
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

  it('apiAcknowledgeDiagnostic POSTs the durable reveal acknowledgement', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ status: 204 }));

    await api.apiAcknowledgeDiagnostic();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/diagnostic/acknowledge',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it.each([
    [
      'apiSkipPracticeWord',
      () =>
        api.apiSkipPracticeWord(HISTORY_ITEM.questionId, '550e8400-e29b-41d4-a716-446655440020'),
    ],
    ['apiForgotPassword', () => api.apiForgotPassword('ada@example.com')],
    [
      'apiResetPassword',
      () => api.apiResetPassword('ada@example.com', 'abcdef123456', 'NewPass123'),
    ],
    ['apiRestartDiagnostic', () => api.apiRestartDiagnostic()],
  ])('%s rejects a non-204 success response', async (_name, call) => {
    fetchMock.mockResolvedValue(fakeResponse({ status: 200 }));

    await expect(call()).rejects.toMatchObject({ status: 502 });
  });

  it('apiConsumeUserDataPages emits each validated page without combining them', async () => {
    const attemptCursor = '550e8400-e29b-41d4-a716-446655440041';
    const cycleCursor = '550e8400-e29b-41d4-a716-446655440042';
    const consumePage = jest.fn();
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () =>
            userExportPage({
              attempts: [{ id: 'a1' }],
              nextCursor: attemptCursor,
              attemptsDone: false,
            }),
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => userExportPage({ attempts: [{ id: 'a2' }] }),
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () =>
            userExportPage({
              practiceCycles: [{ id: 'c1' }],
              nextPracticeCycleCursor: cycleCursor,
              practiceCyclesDone: false,
            }),
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => userExportPage({ practiceCycles: [{ id: 'c2' }] }),
        }),
      );

    await expect(api.apiConsumeUserDataPages(consumePage)).resolves.toBeUndefined();
    expect(
      consumePage.mock.calls.map(([page, index]) => [page.attempts, page.practiceCycles, index]),
    ).toEqual([
      [[{ id: 'a1' }], [], 0],
      [[{ id: 'a2' }], [], 1],
      [[], [{ id: 'c1' }], 2],
      [[], [{ id: 'c2' }], 3],
    ]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:4000/auth/me/data?limit=500&attemptsDone=false&practiceCyclesDone=true',
      `http://localhost:4000/auth/me/data?limit=500&attemptsDone=false&practiceCyclesDone=true&cursor=${attemptCursor}`,
      'http://localhost:4000/auth/me/data?limit=500&attemptsDone=true&practiceCyclesDone=false',
      `http://localhost:4000/auth/me/data?limit=500&attemptsDone=true&practiceCyclesDone=false&practiceCycleCursor=${cycleCursor}`,
    ]);
  });

  it('apiConsumeUserDataPages emits one empty terminal page for each independent stream', async () => {
    const consumePage = jest.fn();
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => userExportPage() }));

    await api.apiConsumeUserDataPages(consumePage);

    expect(consumePage).toHaveBeenNthCalledWith(1, userExportPage(), 0);
    expect(consumePage).toHaveBeenNthCalledWith(2, userExportPage(), 1);
  });

  it.each([0, 1.5, 10_001])(
    'apiConsumeUserDataPages rejects invalid page bound %s before network work',
    async (maxPages) => {
      await expect(
        api.apiConsumeUserDataPages(jest.fn(), undefined, maxPages),
      ).rejects.toBeInstanceOf(ContractError);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('rejects attempts leaked into the practice-cycle export stream', async () => {
    const consumePage = jest.fn();
    fetchMock
      .mockResolvedValueOnce(fakeResponse({ json: async () => userExportPage() }))
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => userExportPage({ attempts: [{ id: 'unexpected-attempt' }] }),
        }),
      );

    await expect(api.apiConsumeUserDataPages(consumePage)).rejects.toBeInstanceOf(ContractError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consumePage).toHaveBeenCalledTimes(1);
  });

  it('honors an abort raised by the consumer of a practice-cycle page', async () => {
    const controller = new AbortController();
    const reason = new Error('export screen left');
    const consumePage = jest.fn((_page, pageIndex: number) => {
      if (pageIndex === 1) controller.abort(reason);
    });
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => userExportPage() }));

    await expect(api.apiConsumeUserDataPages(consumePage, controller.signal)).rejects.toBe(reason);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consumePage).toHaveBeenCalledTimes(2);
  });

  it('apiConsumeUserDataPages stops before another request when its consumer fails', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440041';
    const failure = new Error('file write failed');
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () =>
          userExportPage({ attempts: [{ id: 'a1' }], nextCursor: cursor, attemptsDone: false }),
      }),
    );

    await expect(
      api.apiConsumeUserDataPages(() => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('apiConsumeUserDataPages pins its initiating token across every page', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440041';
    const consumePage = jest.fn();
    await api.saveToken('jwt-export-owner');
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => {
            await api.saveToken('jwt-new-session');
            return userExportPage({
              attempts: [{ id: 'a1' }],
              nextCursor: cursor,
              attemptsDone: false,
            });
          },
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () => userExportPage({ attempts: [{ id: 'a2' }] }),
        }),
      )
      .mockResolvedValueOnce(fakeResponse({ json: async () => userExportPage() }));

    await expect(api.apiConsumeUserDataPages(consumePage)).resolves.toBeUndefined();
    expect(consumePage).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([, init]) => init.headers.Authorization)).toEqual([
      'Bearer jwt-export-owner',
      'Bearer jwt-export-owner',
      'Bearer jwt-export-owner',
    ]);
    await expect(api.getToken()).resolves.toBe('jwt-new-session');
  });

  it('apiConsumeUserDataPages rejects a foreign-account page before emitting it', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440041';
    const consumePage = jest.fn();
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () =>
            userExportPage({ attempts: [{ id: 'a1' }], nextCursor: cursor, attemptsDone: false }),
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          json: async () =>
            userExportPage({
              user: { ...PROFILE_USER, id: '650e8400-e29b-41d4-a716-446655440111' },
              attempts: [{ id: 'foreign' }],
            }),
        }),
      );

    await expect(api.apiConsumeUserDataPages(consumePage)).rejects.toBeInstanceOf(ContractError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consumePage).toHaveBeenCalledTimes(1);
  });

  // A screen that unmounts mid-request must be able to cancel the read, so the
  // caller signal has to reach fetch rather than being dropped at the helper.
  it.each([
    ['apiGetPracticeStats', (signal: AbortSignal) => api.apiGetPracticeStats(signal)],
    [
      'apiGetPracticeHistory',
      (signal: AbortSignal) => api.apiGetPracticeHistory(undefined, signal),
    ],
    ['apiGetRecordings', (signal: AbortSignal) => api.apiGetRecordings(undefined, signal)],
    [
      'apiGetRecordingPlaybackGrant',
      (signal: AbortSignal) => api.apiGetRecordingPlaybackGrant(recordingId, signal),
    ],
    ['apiDeleteRecording', (signal: AbortSignal) => api.apiDeleteRecording(recordingId, signal)],
    ['apiDeleteAllRecordings', (signal: AbortSignal) => api.apiDeleteAllRecordings(signal)],
    [
      'apiConsumeUserDataPages',
      (signal: AbortSignal) => api.apiConsumeUserDataPages(jest.fn(), signal),
    ],
  ])('%s forwards the caller abort signal to the request', async (_name, call) => {
    const controller = new AbortController();
    const reason = new Error('screen left');
    controller.abort(reason);
    fetchMock.mockRejectedValue(new Error('aborted by platform'));

    const error = await catchAsync(call(controller.signal));

    // An unforwarded signal would be laundered into a generic status 0 ApiError.
    expect(error).not.toBeInstanceOf(api.ApiError);
    expect((error as Error).message).toBe('aborted by platform');
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
    expect(fetchMock.mock.calls[0][1].signal.reason).toBe(reason);
  });

  it('apiConsumeUserDataPages rejects a nonterminal page at its injected resource bound', async () => {
    const exportCursor = (page: number) =>
      `550e8400-e29b-41d4-a716-${String(page).padStart(12, '0')}`;
    let calls = 0;
    const consumePage = jest.fn();
    fetchMock.mockImplementation(async () => {
      calls += 1;
      return fakeResponse({
        json: async () =>
          userExportPage({
            attempts: [{ id: `a${calls}` }],
            nextCursor: exportCursor(calls),
            attemptsDone: false,
          }),
      });
    });

    await expect(api.apiConsumeUserDataPages(consumePage, undefined, 3)).rejects.toBeInstanceOf(
      ContractError,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe(
      `http://localhost:4000/auth/me/data?limit=500&attemptsDone=false&practiceCyclesDone=true&cursor=${exportCursor(2)}`,
    );
    expect(consumePage).toHaveBeenCalledTimes(2);
  });

  it('apiConsumeUserDataPages accepts a stream that terminates exactly at its injected bound', async () => {
    const exportCursor = (page: number) =>
      `550e8400-e29b-41d4-a716-${String(page).padStart(12, '0')}`;
    let calls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      calls += 1;
      if (url.includes('attemptsDone=true')) {
        return fakeResponse({ json: async () => userExportPage() });
      }
      return fakeResponse({
        json: async () =>
          userExportPage(
            calls === 3
              ? { attempts: [{ id: `a${calls}` }] }
              : {
                  attempts: [{ id: `a${calls}` }],
                  nextCursor: exportCursor(calls),
                  attemptsDone: false,
                },
          ),
      });
    });
    const consumePage = jest.fn();

    await expect(api.apiConsumeUserDataPages(consumePage, undefined, 3)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(consumePage).toHaveBeenCalledTimes(4);
    expect(consumePage).toHaveBeenLastCalledWith(userExportPage(), 3);
  });

  it('apiConsumeUserDataPages rejects a repeated cursor before emitting the cyclic page', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440042';
    let emittedPages = 0;
    const consumePage = jest.fn(() => {
      emittedPages += 1;
      if (emittedPages > 1) throw new Error('Cyclic page reached the consumer');
    });
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () =>
          userExportPage({ attempts: [{ id: 'a1' }], nextCursor: cursor, attemptsDone: false }),
      }),
    );

    await expect(api.apiConsumeUserDataPages(consumePage)).rejects.toBeInstanceOf(ContractError);
    // First page + the page fetched with the repeated cursor.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(consumePage).toHaveBeenCalledTimes(1);
  });

  it('rejects a repeated practice-cycle cursor before duplicate emission', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440043';
    const consumePage = jest.fn();
    fetchMock
      .mockResolvedValueOnce(fakeResponse({ json: async () => userExportPage() }))
      .mockResolvedValue(
        fakeResponse({
          json: async () =>
            userExportPage({
              practiceCycles: [{ id: 'c1' }],
              nextPracticeCycleCursor: cursor,
              practiceCyclesDone: false,
            }),
        }),
      );

    await expect(api.apiConsumeUserDataPages(consumePage)).rejects.toBeInstanceOf(ContractError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(consumePage).toHaveBeenCalledTimes(2);
  });

  it('rejects a contradictory non-target stream before emitting it', async () => {
    const consumePage = jest.fn();
    fetchMock.mockResolvedValue(
      fakeResponse({
        json: async () => userExportPage({ practiceCycles: [{ id: 'unexpected' }] }),
      }),
    );

    await expect(api.apiConsumeUserDataPages(consumePage)).rejects.toBeInstanceOf(ContractError);
    expect(consumePage).not.toHaveBeenCalled();
  });
});
