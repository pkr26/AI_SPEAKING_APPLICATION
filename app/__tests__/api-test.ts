import { File } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

import { ContractError } from '../src/lib/types';

type ApiModule = typeof import('../src/lib/api');

// jest-expo keeps dynamic import() intact, but jest cannot execute it without
// --experimental-vm-modules, so fresh module graphs are loaded with require.
declare const require: (id: string) => unknown;

const mockHostUri: { value: string | undefined } = { value: undefined };
const mockPlatform: { OS: string } = { OS: 'ios' };
const mockSecureData = new Map<string, string>();
const mockArrayBuffer = jest.fn(
  async () => new TextEncoder().encode('audio').buffer as ArrayBuffer,
);

jest.mock('expo-constants', () => ({
  get expoConfig() {
    return { hostUri: mockHostUri.value };
  },
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
  getItemAsync: jest.fn(
    async (key: string) => mockSecureData.get(key) ?? null,
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureData.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureData.delete(key);
  }),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn(() => ({ arrayBuffer: mockArrayBuffer })),
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
  } = {},
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: options.json ?? (async () => ({})),
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

beforeAll(() => {
  setEnv(undefined);
  setDev(true);
  api = require('../src/lib/api') as ApiModule;
});

afterEach(() => {
  setEnv(undefined);
  setDev(true);
  mockHostUri.value = undefined;
  mockPlatform.OS = 'ios';
  mockSecureData.clear();
  fetchMock.mockReset();
  mockArrayBuffer.mockClear();
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
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      'auth_token',
      KEYCHAIN_OPTIONS,
    );
  });

  it('returns null when the keychain read fails', async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockRejectedValueOnce(new Error('keychain locked'));

    await expect(api.getToken()).resolves.toBeNull();
  });

  it('saves and clears the token with the keychain options', async () => {
    await api.saveToken('jwt-9');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'auth_token',
      'jwt-9',
      KEYCHAIN_OPTIONS,
    );

    await api.clearToken();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      'auth_token',
      KEYCHAIN_OPTIONS,
    );
  });
});

describe('userMessageForError', () => {
  it.each([
    [0, 'Could not connect to the server. Check your connection and try again.'],
    [408, 'The request timed out. Check your connection and try again.'],
    [413, 'The recording is too large. Please record a shorter answer.'],
    [
      415,
      'This recording format is not supported. Please record your answer again.',
    ],
    [
      409,
      'An assessment is already in progress or the question changed. Wait a moment and try again.',
    ],
    [429, 'Too many attempts. Please wait and try again later.'],
    [500, 'The service is temporarily unavailable. Please try again later.'],
    [503, 'The service is temporarily unavailable. Please try again later.'],
  ])('maps status %i to safe copy', (status, expected) => {
    expect(
      api.userMessageForError(new api.ApiError(status, 'internal'), 'Fallback'),
    ).toBe(expected);
  });

  it.each([400, 401, 404, 499])('falls back for status %i', (status) => {
    expect(
      api.userMessageForError(new api.ApiError(status, 'internal'), 'Fallback'),
    ).toBe('Fallback');
  });

  it('falls back for non-ApiError values', () => {
    expect(api.userMessageForError(new Error('boom'), 'Fallback')).toBe(
      'Fallback',
    );
    expect(api.userMessageForError('nope', 'Fallback')).toBe('Fallback');
    expect(api.userMessageForError(null, 'Fallback')).toBe('Fallback');
  });
});

describe('apiFetch', () => {
  it('performs an authenticated JSON GET by default', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ hello: 'world' }) }),
    );

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
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/me');

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-123',
    });
  });

  it('skips the token lookup when auth is false', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    jest.mocked(SecureStore.getItemAsync).mockClear();
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/public', { auth: false });

    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('invokes the unauthorized handler on 401 when a token was used', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
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
    const handler = jest.fn();
    api.setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    await catchAsync(api.apiFetch('/login', { expireSessionOn401: false }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not invoke the unauthorized handler without a stored token', async () => {
    const handler = jest.fn();
    api.setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 401 }));

    await catchAsync(api.apiFetch('/me'));

    expect(handler).not.toHaveBeenCalled();
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
    expect(error).toMatchObject({ status: 408 });
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
    controller.abort();
    fetchMock.mockRejectedValue(new Error('aborted by platform'));

    const error = await catchAsync(
      api.apiFetch('/pre-aborted', { signal: controller.signal }),
    );

    expect(error).not.toBeInstanceOf(api.ApiError);
    expect((error as Error).message).toBe('aborted by platform');
  });

  it('maps network failures to a status 0 ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const error = await catchAsync(api.apiFetch('/offline'));

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      status: 0,
      message:
        'Could not connect to the server. Check your connection and try again.',
    });
  });

  it('removes the external abort listener after the request settles', async () => {
    const controller = new AbortController();
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiFetch('/tidy', { signal: controller.signal });

    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    removeSpy.mockRestore();
  });
});

describe('audioFileDescriptor', () => {
  it.each([
    ['file:///rec/a.webm', { name: 'audio.webm', type: 'audio/webm' }],
    ['file:///rec/a.wav', { name: 'audio.wav', type: 'audio/wav' }],
    ['file:///rec/a.aac', { name: 'audio.aac', type: 'audio/aac' }],
    ['file:///rec/a.m4a', { name: 'audio.m4a', type: 'audio/mp4' }],
    ['file:///rec/a.bin', { name: 'audio.m4a', type: 'audio/mp4' }],
    ['file:///rec/no-extension', { name: 'audio.m4a', type: 'audio/mp4' }],
    ['file:///REC/A.WEBM', { name: 'audio.webm', type: 'audio/webm' }],
    ['file:///REC/A.WAV', { name: 'audio.wav', type: 'audio/wav' }],
    ['file:///rec/a.wav?duration=10', { name: 'audio.wav', type: 'audio/wav' }],
    ['file:///rec/a.aac#clip', { name: 'audio.aac', type: 'audio/aac' }],
    ['file:///rec/a.webm?next=.m4a', { name: 'audio.webm', type: 'audio/webm' }],
  ])('maps %s to %o', (uri, expected) => {
    expect(api.audioFileDescriptor(uri)).toEqual(expected);
  });

  it('rejects 3GP recordings with a 415 ApiError', () => {
    for (const uri of ['file:///rec/a.3gp', 'file:///REC/A.3GP?x=1']) {
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
});

describe('apiUploadAudio', () => {
  it('builds multipart form data with the React Native file descriptor', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ result: 'ok' }) }),
    );

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

    await api.apiUploadAudio(
      '/practice/attempt',
      'blob:https://app/audio-1',
      { questionId: 'q-1' },
    );

    expect(fetchMock.mock.calls[0]).toEqual(['blob:https://app/audio-1']);
    const form = fetchMock.mock.calls[1][1].body as unknown as MockFormData;
    expect(form.entries[0]).toEqual({
      name: 'audio',
      value: blob,
      filename: 'audio.webm',
    });
  });

  it('reports 401 uploads to the unauthorized handler', async () => {
    mockSecureData.set('auth_token', 'jwt-123');
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

  it('times out slow uploads with a 408 ApiError', async () => {
    fetchUntilAborted();

    const error = await catchAsync(
      api.apiUploadAudio('/practice/attempt', 'file:///rec/a.m4a', {}, {
        timeoutMs: 10,
      }),
    );

    expect(error).toMatchObject({ status: 408 });
  });
});

describe('apiRequestAudioUpload', () => {
  it('posts the content type and parses the grant', async () => {
    const grant = {
      mode: 's3',
      uploadUrl: 'https://bucket.s3.amazonaws.com/key?sig=1',
      audioKey: 'audio-uploads/user/1.m4a',
      expiresIn: 900,
    };
    fetchMock.mockResolvedValue(fakeResponse({ json: async () => grant }));

    const result = await api.apiRequestAudioUpload('audio/mp4');

    expect(result).toEqual(grant);
    const [input, init] = fetchMock.mock.calls[0];
    expect(input).toBe('http://localhost:4000/uploads/audio-url');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ contentType: 'audio/mp4' }));
  });

  it('rejects a malformed grant as a contract error', async () => {
    fetchMock.mockResolvedValue(
      fakeResponse({ json: async () => ({ mode: 'carrier-pigeon' }) }),
    );

    await expect(api.apiRequestAudioUpload('audio/mp4')).rejects.toThrow(
      ContractError,
    );
  });
});

describe('apiPutPresignedAudio', () => {
  it('PUTs the file bytes with the signed content type and no auth header', async () => {
    const FileMock = jest.mocked(File);
    FileMock.mockClear();
    fetchMock.mockResolvedValue(fakeResponse());

    await api.apiPutPresignedAudio(
      'https://bucket.s3.amazonaws.com/key?sig=1',
      'file:///recordings/answer.m4a',
      'audio/mp4',
    );

    expect(FileMock).toHaveBeenCalledWith('file:///recordings/answer.m4a');
    expect(mockArrayBuffer).toHaveBeenCalledTimes(1);
    const [input, init] = fetchMock.mock.calls[0];
    expect(input).toBe('https://bucket.s3.amazonaws.com/key?sig=1');
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'Content-Type': 'audio/mp4' });
    expect(init.body).toBeInstanceOf(Blob);
    expect((init.body as Blob).type).toBe('audio/mp4');
    expect((init.body as Blob).size).toBe(5);
  });

  it('PUTs a fetched blob on web', async () => {
    mockPlatform.OS = 'web';
    const blob = new Blob(['web-audio'], { type: 'audio/webm' });
    fetchMock
      .mockResolvedValueOnce({
        blob: async () => blob,
      } as unknown as Response)
      .mockResolvedValueOnce(fakeResponse());

    await api.apiPutPresignedAudio(
      'https://bucket.s3.amazonaws.com/key?sig=1',
      'blob:https://app/audio-1',
      'audio/webm',
    );

    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe('PUT');
    expect(init.headers).toEqual({ 'Content-Type': 'audio/webm' });
    expect(init.body).toBe(blob);
  });

  it('throws an ApiError when S3 rejects the upload', async () => {
    fetchMock.mockResolvedValue(fakeResponse({ ok: false, status: 403 }));

    const error = await catchAsync(
      api.apiPutPresignedAudio(
        'https://bucket.s3.amazonaws.com/key?sig=1',
        'file:///rec/a.m4a',
        'audio/mp4',
      ),
    );

    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({ status: 403 });
  });

  it('times out slow presigned uploads with a 408 ApiError', async () => {
    fetchUntilAborted();

    const error = await catchAsync(
      api.apiPutPresignedAudio(
        'https://bucket.s3.amazonaws.com/key?sig=1',
        'file:///rec/a.m4a',
        'audio/mp4',
        { timeoutMs: 10 },
      ),
    );

    expect(error).toMatchObject({ status: 408 });
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

    expect(() => importFreshApi()).toThrow(
      'EXPO_PUBLIC_API_URL must be a valid absolute URL.',
    );
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
});

describe('developmentBaseUrl', () => {
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
