import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import {
  ApiError,
  apiFetch,
  clearToken,
  getToken,
  saveToken,
  setUnauthorizedHandler,
} from '../src/lib/api';
import {
  AccountDeletedCleanupError,
  AuthProvider,
  LogoutCleanupError,
  useAuth,
} from '../src/lib/auth';
import { clearPendingAssessment } from '../src/lib/pending-assessment';
import { ContractError, type User } from '../src/lib/types';

// React 19 requires this opt-in before act() can track async updates.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../src/lib/api', () => {
  // A local class keeps `error instanceof ApiError` working inside auth.tsx,
  // which imports the mocked module, without executing the real api module.
  class MockApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }

  return {
    ApiError: MockApiError,
    apiFetch: jest.fn(),
    getToken: jest.fn(),
    saveToken: jest.fn(),
    clearToken: jest.fn(),
    setUnauthorizedHandler: jest.fn(),
  };
});

jest.mock('../src/lib/pending-assessment', () => ({
  clearPendingAssessment: jest.fn(),
}));

const mockedApiFetch = jest.mocked(apiFetch);
const mockedGetToken = jest.mocked(getToken);
const mockedSaveToken = jest.mocked(saveToken);
const mockedClearToken = jest.mocked(clearToken);
const mockedSetUnauthorizedHandler = jest.mocked(setUnauthorizedHandler);
const mockedClearPendingAssessment = jest.mocked(clearPendingAssessment);

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test User',
  email: 'test@example.com',
  nativeLanguage: 'te',
  cefrLevel: null,
  diagnosticCompleted: false,
};

function authResponse(token: string, user: User = USER) {
  return { token, user };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let auth: ReturnType<typeof useAuth> | null = null;

function Capture() {
  const value = useAuth();
  useEffect(() => {
    auth = value;
  });
  return null;
}

function SessionDisplay() {
  const { token, user, sessionVersion, isRestoring, restoreError } = useAuth();
  return (
    <>
      <Text testID="token">{token ?? 'null'}</Text>
      <Text testID="userEmail">{user?.email ?? 'null'}</Text>
      <Text testID="sessionVersion">{String(sessionVersion)}</Text>
      <Text testID="isRestoring">{String(isRestoring)}</Text>
      <Text testID="restoreError">{restoreError ?? 'null'}</Text>
    </>
  );
}

function text(testID: string): string {
  return String(screen.getByTestId(testID).props.children);
}

function renderTree(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Capture />
        <SessionDisplay />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function renderAuth(storedToken: string | null = null) {
  mockedGetToken.mockResolvedValue(storedToken);
  const queryClient = new QueryClient();
  const clearSpy = jest.spyOn(queryClient, 'clear');
  const rendered = await renderTree(queryClient);
  await waitFor(() => expect(text('isRestoring')).toBe('false'));
  return { ...rendered, queryClient, clearSpy };
}

async function renderLoggedIn(token = 'tok-1') {
  const rendered = await renderAuth(null);
  mockedApiFetch.mockResolvedValueOnce(authResponse(token));
  await act(async () => {
    await auth!.login('a@example.com', 'secret1');
  });
  return rendered;
}

function registeredUnauthorizedHandler(): (rejectedToken: string) => void {
  const registered = [...mockedSetUnauthorizedHandler.mock.calls]
    .reverse()
    .map(([handler]) => handler)
    .find((handler) => handler !== null);
  if (!registered) throw new Error('no unauthorized handler was registered');
  return registered;
}

beforeEach(() => {
  jest.resetAllMocks();
  auth = null;
  mockedGetToken.mockResolvedValue(null);
  mockedSaveToken.mockResolvedValue(undefined);
  mockedClearToken.mockResolvedValue(true);
  mockedClearPendingAssessment.mockResolvedValue(undefined);
});

describe('AuthProvider session restore', () => {
  it('stays in the restoring state until secure storage settles', async () => {
    const stored = deferred<string | null>();
    mockedGetToken.mockReturnValue(stored.promise);

    await renderTree(new QueryClient());

    expect(text('isRestoring')).toBe('true');
    expect(text('token')).toBe('null');
    await act(async () => stored.resolve(null));
    await waitFor(() => expect(text('isRestoring')).toBe('false'));
  });

  it('restores a persisted token and bumps sessionVersion', async () => {
    const { clearSpy } = await renderAuth('tok-stored');

    expect(text('token')).toBe('tok-stored');
    expect(text('userEmail')).toBe('null');
    expect(text('isRestoring')).toBe('false');
    expect(text('sessionVersion')).toBe('1');
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('completes the restore with no session when nothing is persisted', async () => {
    await renderAuth(null);

    expect(mockedGetToken).toHaveBeenCalledTimes(1);
    expect(text('token')).toBe('null');
    expect(text('isRestoring')).toBe('false');
    expect(text('sessionVersion')).toBe('1');
  });

  it('exposes a retryable error when secure session storage cannot be read', async () => {
    mockedGetToken.mockRejectedValueOnce(new Error('keychain locked'));
    await renderTree(new QueryClient());

    await waitFor(() => expect(text('isRestoring')).toBe('false'));
    expect(text('token')).toBe('null');
    expect(text('restoreError')).toBe(
      'Secure session storage is temporarily unavailable. Unlock your device and try again.',
    );

    const retry = deferred<string | null>();
    mockedGetToken.mockReturnValueOnce(retry.promise);
    await act(async () => {
      auth!.retrySessionRestore();
    });
    expect(text('isRestoring')).toBe('true');
    expect(text('restoreError')).toBe('null');

    await act(async () => retry.resolve('tok-recovered'));
    await waitFor(() => expect(text('token')).toBe('tok-recovered'));
    expect(text('restoreError')).toBe('null');
    expect(text('sessionVersion')).toBe('1');
  });

  it('can retry more than once after repeated secure-storage read failures', async () => {
    mockedGetToken
      .mockRejectedValueOnce(new Error('keychain locked'))
      .mockRejectedValueOnce(new Error('keychain still locked'))
      .mockResolvedValueOnce('tok-recovered-after-two-retries');
    await renderTree(new QueryClient());

    await waitFor(() => expect(text('isRestoring')).toBe('false'));
    expect(text('restoreError')).toBe(
      'Secure session storage is temporarily unavailable. Unlock your device and try again.',
    );

    await act(async () => {
      auth!.retrySessionRestore();
    });
    await waitFor(() => expect(mockedGetToken).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(text('isRestoring')).toBe('false'));
    expect(text('restoreError')).toBe(
      'Secure session storage is temporarily unavailable. Unlock your device and try again.',
    );

    await act(async () => {
      auth!.retrySessionRestore();
    });
    await waitFor(() => expect(text('token')).toBe('tok-recovered-after-two-retries'));

    expect(mockedGetToken).toHaveBeenCalledTimes(3);
    expect(text('restoreError')).toBe('null');
    expect(text('isRestoring')).toBe('false');
    expect(text('sessionVersion')).toBe('1');
  });

  it('ignores a restore that resolves after unmount', async () => {
    const stored = deferred<string | null>();
    mockedGetToken.mockReturnValue(stored.promise);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const rendered = await renderTree(new QueryClient());
    await rendered.unmount();
    expect(mockedSetUnauthorizedHandler).toHaveBeenLastCalledWith(null);

    await act(async () => {
      stored.resolve('tok-late');
      await stored.promise;
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('wipes the stored session and re-enables login only after an explicit reset', async () => {
    mockedGetToken.mockRejectedValue(new Error('undecryptable entry'));
    await renderTree(new QueryClient());

    await waitFor(() => expect(text('isRestoring')).toBe('false'));
    expect(text('token')).toBe('null');
    expect(text('restoreError')).toBe(
      'Secure session storage is temporarily unavailable. Unlock your device and try again.',
    );
    // The fail-closed default never wipes the entry on its own.
    expect(mockedClearToken).not.toHaveBeenCalled();

    await act(async () => {
      auth!.resetStoredSession();
    });

    expect(mockedClearToken).toHaveBeenCalledTimes(1);
    expect(mockedClearToken).toHaveBeenCalledWith();
    expect(text('restoreError')).toBe('null');
    expect(text('token')).toBe('null');
    expect(text('isRestoring')).toBe('false');

    // Logged-out state is reachable again: a fresh login establishes a session.
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-after-reset'));
    await act(async () => {
      await auth!.login('a@example.com', 'secret1');
    });
    expect(text('token')).toBe('tok-after-reset');
  });

  it('still degrades to logged out when wiping the unreadable entry also fails', async () => {
    mockedGetToken.mockRejectedValue(new Error('undecryptable entry'));
    mockedClearToken.mockRejectedValue(new Error('store unavailable'));
    await renderTree(new QueryClient());

    await waitFor(() => expect(text('isRestoring')).toBe('false'));
    expect(text('restoreError')).toBe(
      'Secure session storage is temporarily unavailable. Unlock your device and try again.',
    );

    await act(async () => {
      auth!.resetStoredSession();
      // Let the rejected delete settle; the wipe is best-effort.
      await Promise.resolve();
    });

    expect(mockedClearToken).toHaveBeenCalledTimes(1);
    expect(text('restoreError')).toBe('null');
    expect(text('token')).toBe('null');
    expect(text('isRestoring')).toBe('false');
  });
});

describe('login', () => {
  it('posts credentials, persists the token, and establishes the session', async () => {
    const { clearSpy } = await renderAuth(null);
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-login'));

    let loggedIn: User | undefined;
    await act(async () => {
      loggedIn = await auth!.login('a@example.com', 'secret1');
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { email: 'a@example.com', password: 'secret1' },
      auth: false,
      expireSessionOn401: false,
    });
    expect(mockedSaveToken).toHaveBeenCalledWith('tok-login');
    expect(loggedIn).toEqual(USER);
    expect(text('token')).toBe('tok-login');
    expect(text('userEmail')).toBe(USER.email);
    expect(text('sessionVersion')).toBe('2');
    expect(clearSpy).toHaveBeenCalledTimes(2);
    expect(mockedClearPendingAssessment).not.toHaveBeenCalled();
  });

  it('rejects a concurrent account operation', async () => {
    await renderAuth(null);
    const pending = deferred<unknown>();
    mockedApiFetch.mockReturnValueOnce(pending.promise);

    await act(async () => {
      const first = auth!.login('a@example.com', 'secret1');
      await expect(auth!.login('b@example.com', 'secret1')).rejects.toThrow(
        'An account operation is already in progress.',
      );
      pending.resolve(authResponse('tok-login'));
      await first;
    });

    expect(text('token')).toBe('tok-login');
    expect(text('sessionVersion')).toBe('2');
  });

  it('propagates a contract failure without establishing a session', async () => {
    await renderAuth(null);
    mockedApiFetch.mockResolvedValueOnce({ unexpected: true });

    await act(async () => {
      await expect(auth!.login('a@example.com', 'secret1')).rejects.toThrow(
        'The server returned an invalid response. Please try again.',
      );
    });

    expect(mockedSaveToken).not.toHaveBeenCalled();
    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('1');

    // The failed attempt must release the transition guard.
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-retry'));
    await act(async () => {
      await auth!.login('a@example.com', 'secret1');
    });
    expect(text('token')).toBe('tok-retry');
  });
});

describe('register', () => {
  it('posts the profile and establishes the session', async () => {
    await renderAuth(null);
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-registered'));

    let registered: User | undefined;
    await act(async () => {
      registered = await auth!.register('Test User', 'a@example.com', 'secret1', 'hi');
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: {
        name: 'Test User',
        email: 'a@example.com',
        password: 'secret1',
        nativeLanguage: 'hi',
      },
      auth: false,
      expireSessionOn401: false,
    });
    expect(mockedSaveToken).toHaveBeenCalledWith('tok-registered');
    expect(registered).toEqual(USER);
    expect(text('token')).toBe('tok-registered');
    expect(text('sessionVersion')).toBe('2');
  });

  it('releases the transition guard after a failed registration', async () => {
    await renderAuth(null);
    const failure = new ApiError(500, 'Request failed with status 500');
    mockedApiFetch.mockRejectedValueOnce(failure);

    await act(async () => {
      await expect(auth!.register('Test User', 'a@example.com', 'secret1', 'hi')).rejects.toBe(
        failure,
      );
    });

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-register-retry'));
    await act(async () => {
      await auth!.register('Test User', 'a@example.com', 'secret1', 'hi');
    });
    expect(text('token')).toBe('tok-register-retry');
  });
});

describe('logout', () => {
  it('uses stable, actionable cleanup error names and messages', () => {
    expect(new LogoutCleanupError()).toMatchObject({
      name: 'LogoutCleanupError',
      message:
        'You were logged out, but the revoked local session could not be removed. Restart the app before signing in again.',
    });
    expect(new AccountDeletedCleanupError()).toMatchObject({
      name: 'AccountDeletedCleanupError',
      message:
        'Your account was deleted, but local session cleanup failed. Restart the app before signing in again.',
    });
  });

  it('revokes the token and resets the session', async () => {
    const { clearSpy } = await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await auth!.logout();
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      expireSessionOn401: false,
    });
    expect(mockedClearToken).toHaveBeenCalledTimes(1);
    expect(mockedClearToken).toHaveBeenCalledWith('tok-1');
    expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(3); // mount + login + logout
    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
  });

  it('tolerates a 401 from the logout endpoint', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockRejectedValueOnce(new ApiError(401, 'Request failed with status 401'));

    await act(async () => {
      await auth!.logout();
    });

    expect(mockedClearToken).toHaveBeenCalledTimes(1);
    expect(text('token')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
  });

  it('logs out an in-memory session with no persisted token without invoking conditional cleanup', async () => {
    await renderAuth(null);
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearToken.mockClear();

    await act(async () => {
      await auth!.logout();
    });

    expect(mockedClearToken).not.toHaveBeenCalled();
    expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1);
    expect(text('token')).toBe('null');
  });

  it('aborts a failed logout and releases the transition guard for a retry', async () => {
    await renderLoggedIn();
    const failure = new ApiError(500, 'Request failed with status 500');
    mockedApiFetch.mockRejectedValueOnce(failure);

    await act(async () => {
      await expect(auth!.logout()).rejects.toBe(failure);
    });

    expect(mockedClearToken).not.toHaveBeenCalled();
    expect(text('token')).toBe('tok-1');
    expect(text('sessionVersion')).toBe('2');

    mockedApiFetch.mockResolvedValueOnce(undefined);
    await act(async () => {
      await auth!.logout();
    });
    expect(text('token')).toBe('null');
  });

  it('still resets the session when clearing the persisted token fails', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearToken.mockRejectedValueOnce(new Error('keychain unavailable'));

    await act(async () => {
      await expect(auth!.logout()).rejects.toBeInstanceOf(LogoutCleanupError);
    });

    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
  });

  it('reports a conditional token-cleanup miss after server-side logout', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearToken.mockResolvedValueOnce(false);

    let error: unknown;
    await act(async () => {
      try {
        await auth!.logout();
      } catch (caught) {
        error = caught;
      }
    });

    expect(error).toBeInstanceOf(LogoutCleanupError);
    expect(error).toMatchObject({
      name: 'LogoutCleanupError',
      message:
        'You were logged out, but the revoked local session could not be removed. Restart the app before signing in again.',
    });
    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
  });

  it('reports pending-assessment cleanup failure after revoking the session', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearPendingAssessment.mockRejectedValueOnce(new Error('keychain unavailable'));

    await act(async () => {
      await expect(auth!.logout()).rejects.toBeInstanceOf(LogoutCleanupError);
    });

    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
  });

  it('does not reset query state after a pending logout is unmounted', async () => {
    const { clearSpy, unmount } = await renderLoggedIn();
    const cleanup = deferred<void>();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearPendingAssessment.mockReturnValueOnce(cleanup.promise);

    const logout = auth!.logout();
    await waitFor(() => expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1));
    const clearCountBeforeUnmount = clearSpy.mock.calls.length;

    await unmount();
    cleanup.resolve();
    await expect(logout).resolves.toBeUndefined();

    expect(clearSpy).toHaveBeenCalledTimes(clearCountBeforeUnmount);
  });
});

describe('expireSession via the unauthorized handler', () => {
  it('registers the handler on mount and removes it on unmount', async () => {
    const { unmount } = await renderAuth(null);

    expect(registeredUnauthorizedHandler()).toBeInstanceOf(Function);

    await unmount();
    expect(mockedSetUnauthorizedHandler).toHaveBeenLastCalledWith(null);
  });

  it('resets the session when the active token is rejected', async () => {
    const { clearSpy } = await renderLoggedIn();

    await act(async () => {
      registeredUnauthorizedHandler()('tok-1');
    });

    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
    expect(mockedClearToken).toHaveBeenCalledTimes(1);
    expect(mockedClearToken).toHaveBeenCalledWith('tok-1');
    expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(3);
  });

  it('expires a session restored from storage', async () => {
    await renderAuth('tok-stored');

    await act(async () => {
      registeredUnauthorizedHandler()('tok-stored');
    });

    expect(text('token')).toBe('null');
    expect(text('sessionVersion')).toBe('2');
  });

  it('ignores a rejection for a stale token', async () => {
    await renderLoggedIn();

    await act(async () => {
      registeredUnauthorizedHandler()('tok-stale');
    });

    expect(text('token')).toBe('tok-1');
    expect(text('userEmail')).toBe(USER.email);
    expect(text('sessionVersion')).toBe('2');
    expect(mockedClearToken).not.toHaveBeenCalled();
    expect(mockedClearPendingAssessment).not.toHaveBeenCalled();
  });

  it('ignores a rejection that arrives during an account transition', async () => {
    await renderLoggedIn();
    const pending = deferred<unknown>();
    mockedApiFetch.mockReturnValueOnce(pending.promise);

    await act(async () => {
      const rotation = auth!.changePassword('secret1', 'secret2');
      // Let the change-password request start before the late 401 arrives.
      await Promise.resolve();
      registeredUnauthorizedHandler()('tok-1');
      expect(mockedClearToken).not.toHaveBeenCalled();
      pending.resolve(authResponse('tok-rotated'));
      await rotation;
    });

    expect(text('token')).toBe('tok-rotated');
    expect(text('sessionVersion')).toBe('3');
  });

  it('finishes old pending cleanup before establishing a new session', async () => {
    await renderLoggedIn();
    mockedSaveToken.mockClear();
    const cleanup = deferred<void>();
    mockedClearPendingAssessment.mockReturnValueOnce(cleanup.promise);

    await act(async () => {
      registeredUnauthorizedHandler()('tok-1');
    });
    await waitFor(() => expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1));

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-new'));
    let login!: Promise<User>;
    await act(async () => {
      login = auth!.login('a@example.com', 'secret1');
      await Promise.resolve();
    });
    expect(mockedSaveToken).not.toHaveBeenCalled();

    await act(async () => {
      cleanup.resolve();
      await login;
    });
    expect(mockedSaveToken).toHaveBeenCalledWith('tok-new');
    expect(text('token')).toBe('tok-new');
  });

  it('retries a failed old-account cleanup before saving a new session', async () => {
    await renderLoggedIn();
    mockedSaveToken.mockClear();
    mockedClearPendingAssessment.mockRejectedValueOnce(new Error('keychain unavailable'));

    await act(async () => {
      registeredUnauthorizedHandler()('tok-1');
    });
    await waitFor(() => expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1));

    const retry = deferred<void>();
    mockedClearPendingAssessment.mockReturnValueOnce(retry.promise);
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-new'));
    let login!: Promise<User>;
    await act(async () => {
      login = auth!.login('a@example.com', 'secret1');
      await Promise.resolve();
    });
    await waitFor(() => expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(2));
    expect(mockedSaveToken).not.toHaveBeenCalled();

    await act(async () => {
      retry.resolve();
      await login;
    });
    expect(mockedSaveToken).toHaveBeenCalledWith('tok-new');
    expect(text('token')).toBe('tok-new');
  });

  it('fails closed when the old-account cleanup retry also fails', async () => {
    await renderLoggedIn();
    mockedSaveToken.mockClear();
    mockedClearPendingAssessment
      .mockRejectedValueOnce(new Error('first cleanup failure'))
      .mockRejectedValueOnce(new Error('retry cleanup failure'));

    await act(async () => {
      registeredUnauthorizedHandler()('tok-1');
    });
    await waitFor(() => expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1));

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-new'));
    await act(async () => {
      await expect(auth!.login('a@example.com', 'secret1')).rejects.toThrow(
        'retry cleanup failure',
      );
    });

    expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(2);
    expect(mockedSaveToken).not.toHaveBeenCalled();
    expect(text('token')).toBe('null');
  });
});

describe('changePassword', () => {
  it('rotates the token on success', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-rotated'));

    await act(async () => {
      await auth!.changePassword('secret1', 'secret2');
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/change-password', {
      method: 'POST',
      body: { currentPassword: 'secret1', newPassword: 'secret2' },
      expireSessionOn401: false,
    });
    expect(mockedSaveToken).toHaveBeenCalledWith('tok-rotated');
    expect(text('token')).toBe('tok-rotated');
    expect(text('sessionVersion')).toBe('3');
  });

  it('verifies the session after a 401 and rethrows the original error', async () => {
    await renderLoggedIn();
    const failure = new ApiError(401, 'Request failed with status 401');
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === '/auth/change-password') throw failure;
      if (path === '/auth/me') return { user: USER };
      throw new Error(`unexpected apiFetch call: ${path}`);
    }) as unknown as typeof apiFetch);

    await act(async () => {
      await expect(auth!.changePassword('secret1', 'secret2')).rejects.toBe(failure);
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/me');
    expect(text('token')).toBe('tok-1');
    expect(text('sessionVersion')).toBe('2');
    expect(mockedClearToken).not.toHaveBeenCalled();
  });

  it('does not treat an arbitrary object with status 401 as an authentication error', async () => {
    await renderLoggedIn();
    const failure = { status: 401, message: 'not an ApiError' };
    mockedApiFetch.mockRejectedValueOnce(failure);

    await act(async () => {
      await expect(auth!.changePassword('secret1', 'secret2')).rejects.toBe(failure);
    });

    expect(mockedApiFetch).toHaveBeenCalledTimes(2); // login + change-password; no /auth/me
    expect(text('token')).toBe('tok-1');
    expect(mockedClearToken).not.toHaveBeenCalled();
  });

  it('preserves a valid session when change-password fails before receiving a response', async () => {
    await renderLoggedIn();
    const failure = new ApiError(500, 'Request failed with status 500');
    mockedApiFetch.mockRejectedValueOnce(failure);

    await act(async () => {
      await expect(auth!.changePassword('secret1', 'secret2')).rejects.toBe(failure);
    });

    expect(text('token')).toBe('tok-1');
    expect(text('userEmail')).toBe(USER.email);
    expect(mockedClearToken).not.toHaveBeenCalled();
    expect(mockedApiFetch).toHaveBeenCalledTimes(2); // login + change-password; no /auth/me

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-after-retry'));
    await act(async () => auth!.changePassword('secret1', 'secret2'));
    expect(text('token')).toBe('tok-after-retry');
  });

  it.each([
    ['a non-auth API failure', () => new ApiError(500, 'Request failed with status 500')],
    ['a malformed verification response', () => new ContractError()],
  ])(
    'preserves the session after credential verification encounters %s and permits a retry',
    async (_label, makeVerificationFailure) => {
      await renderLoggedIn();
      const credentialFailure = new ApiError(401, 'Request failed with status 401');
      const verificationFailure = makeVerificationFailure();
      mockedApiFetch.mockImplementation((async (path: string) => {
        if (path === '/auth/change-password') throw credentialFailure;
        if (path === '/auth/me') throw verificationFailure;
        throw new Error(`unexpected apiFetch call: ${path}`);
      }) as unknown as typeof apiFetch);

      await act(async () => {
        await expect(auth!.changePassword('secret1', 'secret2')).rejects.toBe(credentialFailure);
      });

      expect(text('token')).toBe('tok-1');
      expect(text('userEmail')).toBe(USER.email);
      expect(text('sessionVersion')).toBe('2');
      expect(mockedClearToken).not.toHaveBeenCalled();

      mockedApiFetch.mockReset();
      mockedApiFetch.mockResolvedValueOnce(authResponse('tok-after-verification-failure'));
      await act(async () => {
        await auth!.changePassword('secret1', 'secret2');
      });
      expect(text('token')).toBe('tok-after-verification-failure');
    },
  );

  it('expires the session when the post-401 verification also fails with 401', async () => {
    await renderLoggedIn();
    const failure = new ApiError(401, 'Request failed with status 401');
    mockedApiFetch.mockImplementation((async () => {
      throw failure;
    }) as unknown as typeof apiFetch);

    await act(async () => {
      await expect(auth!.changePassword('secret1', 'secret2')).rejects.toBe(failure);
    });

    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
    expect(mockedClearToken).toHaveBeenCalled();
  });

  it('fails closed when the rotated token cannot be persisted', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-rotated'));
    const keychain = new Error('keychain unavailable');
    mockedSaveToken.mockRejectedValueOnce(keychain);

    await act(async () => {
      await expect(auth!.changePassword('secret1', 'secret2')).rejects.toBe(keychain);
    });

    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
    expect(mockedClearToken).toHaveBeenCalled();
  });

  it('fails closed when token persistence reports a 401 after rotation', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-rotated'));
    const persistenceFailure = new ApiError(401, 'secure storage rejected the replacement');
    mockedSaveToken.mockRejectedValueOnce(persistenceFailure);

    await act(async () => {
      await expect(auth!.changePassword('secret1', 'secret2')).rejects.toBe(persistenceFailure);
    });

    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
    expect(mockedClearToken).toHaveBeenCalledWith('tok-1');
  });
});

describe('deleteAccount', () => {
  it('deletes the account and resets the session', async () => {
    const { clearSpy } = await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);

    await act(async () => {
      await auth!.deleteAccount('secret1');
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/account', {
      method: 'DELETE',
      body: { password: 'secret1' },
      expireSessionOn401: false,
    });
    expect(mockedClearToken).toHaveBeenCalledTimes(1);
    expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledTimes(3);
    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
  });

  it('finishes account deletion without conditional token cleanup when no token is persisted', async () => {
    await renderAuth(null);
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearToken.mockClear();

    await act(async () => {
      await auth!.deleteAccount('secret1');
    });

    expect(mockedClearToken).not.toHaveBeenCalled();
    expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1);
    expect(text('token')).toBe('null');
  });

  it('still resets the session when clearing the persisted token fails', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearToken.mockRejectedValueOnce(new Error('keychain unavailable'));

    await act(async () => {
      await expect(auth!.deleteAccount('secret1')).rejects.toBeInstanceOf(
        AccountDeletedCleanupError,
      );
    });

    expect(text('token')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
  });

  it('reports a conditional token-cleanup miss after the account was deleted', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearToken.mockResolvedValueOnce(false);

    let error: unknown;
    await act(async () => {
      try {
        await auth!.deleteAccount('secret1');
      } catch (caught) {
        error = caught;
      }
    });

    expect(error).toBeInstanceOf(AccountDeletedCleanupError);
    expect(error).toMatchObject({
      name: 'AccountDeletedCleanupError',
      message:
        'Your account was deleted, but local session cleanup failed. Restart the app before signing in again.',
    });
    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
  });

  it('reports pending-assessment cleanup failure after deleting the account', async () => {
    await renderLoggedIn();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    mockedClearPendingAssessment.mockRejectedValueOnce(new Error('keychain unavailable'));

    await act(async () => {
      await expect(auth!.deleteAccount('secret1')).rejects.toBeInstanceOf(
        AccountDeletedCleanupError,
      );
    });

    expect(text('token')).toBe('null');
    expect(text('userEmail')).toBe('null');
    expect(text('sessionVersion')).toBe('3');
  });

  it('verifies the session after a 401 and rethrows the original error', async () => {
    await renderLoggedIn();
    const failure = new ApiError(401, 'Request failed with status 401');
    mockedApiFetch.mockImplementation((async (path: string) => {
      if (path === '/auth/account') throw failure;
      if (path === '/auth/me') return { user: USER };
      throw new Error(`unexpected apiFetch call: ${path}`);
    }) as unknown as typeof apiFetch);

    await act(async () => {
      await expect(auth!.deleteAccount('secret1')).rejects.toBe(failure);
    });

    expect(mockedApiFetch).toHaveBeenCalledWith('/auth/me');
    expect(text('token')).toBe('tok-1');
    expect(text('sessionVersion')).toBe('2');
    expect(mockedClearToken).not.toHaveBeenCalled();

    mockedApiFetch.mockReset();
    mockedApiFetch.mockResolvedValueOnce(undefined);
    await act(async () => {
      await auth!.deleteAccount('secret1');
    });
    expect(text('token')).toBe('null');
  });

  it('does not verify or expire for a non-ApiError object carrying status 401', async () => {
    await renderLoggedIn();
    const failure = { status: 401, message: 'untrusted status property' };
    mockedApiFetch.mockRejectedValueOnce(failure);

    await act(async () => {
      await expect(auth!.deleteAccount('secret1')).rejects.toBe(failure);
    });

    expect(mockedApiFetch).toHaveBeenCalledTimes(2); // login + delete; no /auth/me
    expect(text('token')).toBe('tok-1');
    expect(text('userEmail')).toBe(USER.email);
    expect(mockedClearToken).not.toHaveBeenCalled();
  });

  it('does not verify or expire after a non-401 account-deletion API failure', async () => {
    await renderLoggedIn();
    const failure = new ApiError(429, 'Request failed with status 429');
    mockedApiFetch.mockRejectedValueOnce(failure);

    await act(async () => {
      await expect(auth!.deleteAccount('secret1')).rejects.toBe(failure);
    });

    expect(mockedApiFetch).toHaveBeenCalledTimes(2); // login + delete; no /auth/me
    expect(text('token')).toBe('tok-1');
    expect(text('userEmail')).toBe(USER.email);
    expect(text('sessionVersion')).toBe('2');
    expect(mockedClearToken).not.toHaveBeenCalled();
  });
});

describe('epoch race guards', () => {
  it('does not let a late restore overwrite a freshly established session', async () => {
    const stored = deferred<string | null>();
    mockedGetToken.mockReturnValue(stored.promise);
    await renderTree(new QueryClient());

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-login'));
    await act(async () => {
      await auth!.login('a@example.com', 'secret1');
    });

    await act(async () => {
      stored.resolve('tok-stored');
      await stored.promise;
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(text('token')).toBe('tok-login');
    expect(text('userEmail')).toBe(USER.email);
  });

  it('does not let a late restore failure erase a freshly established session', async () => {
    const stored = deferred<string | null>();
    mockedGetToken.mockReturnValue(stored.promise);
    await renderTree(new QueryClient());

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-login'));
    await act(async () => {
      await auth!.login('a@example.com', 'secret1');
    });

    await act(async () => {
      stored.reject(new Error('late keychain failure'));
      await stored.promise.catch(() => undefined);
    });

    expect(text('token')).toBe('tok-login');
    expect(text('userEmail')).toBe(USER.email);
    expect(text('restoreError')).toBe('null');
  });

  it('removes the revoked old token when a completed password rotation is cancelled before save', async () => {
    const { clearSpy, unmount } = await renderLoggedIn('tok-old');
    mockedSaveToken.mockClear();
    mockedClearToken.mockClear();
    const response = deferred<unknown>();
    mockedApiFetch.mockReturnValueOnce(response.promise);

    const rotation = auth!.changePassword('secret1', 'secret2');
    await Promise.resolve();
    const clearCountBeforeUnmount = clearSpy.mock.calls.length;
    await unmount();
    response.resolve(authResponse('tok-rotated'));

    await expect(rotation).rejects.toThrow('The account operation was cancelled.');
    expect(mockedSaveToken).not.toHaveBeenCalled();
    expect(mockedClearToken).toHaveBeenCalledWith('tok-old');
    expect(mockedClearPendingAssessment).not.toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalledTimes(clearCountBeforeUnmount);
  });

  it('keeps the old token when an unmounted password-rotation request fails', async () => {
    const { unmount } = await renderLoggedIn('tok-old');
    mockedClearToken.mockClear();
    const response = deferred<unknown>();
    const failure = new Error('request failed before rotation');
    mockedApiFetch.mockReturnValueOnce(response.promise);

    const rotation = auth!.changePassword('secret1', 'secret2');
    const result = rotation.catch((error: unknown) => error);
    await Promise.resolve();
    await unmount();
    response.reject(failure);

    await expect(result).resolves.toBe(failure);
    expect(mockedClearToken).not.toHaveBeenCalled();
    expect(mockedClearPendingAssessment).not.toHaveBeenCalled();
  });

  it('conditionally removes a token whose save finishes after unmount', async () => {
    const rendered = await renderAuth(null);
    const write = deferred<void>();
    mockedSaveToken.mockReturnValueOnce(write.promise);
    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-late'));

    let login!: Promise<User>;
    await act(async () => {
      login = auth!.login('a@example.com', 'secret1');
      await Promise.resolve();
    });
    await waitFor(() => expect(mockedSaveToken).toHaveBeenCalledWith('tok-late'));

    await rendered.unmount();
    write.resolve();
    await expect(login).rejects.toThrow('The account operation was cancelled.');
    expect(mockedClearToken).toHaveBeenCalledWith('tok-late');
  });

  it('does not persist a new token when unmounted while old-account cleanup is pending', async () => {
    const rendered = await renderLoggedIn();
    mockedSaveToken.mockClear();
    const cleanup = deferred<void>();
    mockedClearPendingAssessment.mockReturnValueOnce(cleanup.promise);

    await act(async () => registeredUnauthorizedHandler()('tok-1'));
    await waitFor(() => expect(mockedClearPendingAssessment).toHaveBeenCalledTimes(1));

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-must-not-save'));
    let login!: Promise<User>;
    await act(async () => {
      login = auth!.login('a@example.com', 'secret1');
      await Promise.resolve();
    });
    expect(mockedSaveToken).not.toHaveBeenCalled();

    await rendered.unmount();
    cleanup.resolve();
    await expect(login).rejects.toThrow('The account operation was cancelled.');
    expect(mockedSaveToken).not.toHaveBeenCalled();
  });
});

describe('sessionVersion', () => {
  it('increments on every identity change', async () => {
    await renderAuth(null);
    expect(text('sessionVersion')).toBe('1');

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-1'));
    await act(async () => {
      await auth!.login('a@example.com', 'secret1');
    });
    expect(text('sessionVersion')).toBe('2');

    mockedApiFetch.mockResolvedValueOnce(authResponse('tok-2'));
    await act(async () => {
      await auth!.changePassword('secret1', 'secret2');
    });
    expect(text('sessionVersion')).toBe('3');

    mockedApiFetch.mockResolvedValueOnce(undefined);
    await act(async () => {
      await auth!.logout();
    });
    expect(text('sessionVersion')).toBe('4');
  });
});

describe('useAuth', () => {
  it('throws outside an AuthProvider', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    function Bare() {
      useAuth();
      return null;
    }

    await expect(render(<Bare />)).rejects.toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });
});
