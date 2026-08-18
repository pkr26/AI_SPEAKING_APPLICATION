import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiError, apiFetch, clearToken, getToken, saveToken, setUnauthorizedHandler } from './api';
import { cancelDailyReminderQuietly } from './daily-reminder';
import { translate } from './i18n';
import { parseAuthResponse, parseUserResponse, type NativeLanguage, type User } from './types';
import { clearPendingAssessment } from './pending-assessment';
import { markSessionExpiredNotice } from './session-notice';
export {
  comparablePasswordError,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  utf8ByteLength,
} from './password-policy';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  /** Changes whenever the local session identity changes. */
  sessionVersion: number;
  /** True while the persisted token is being read from SecureStore. */
  isRestoring: boolean;
  /** Safe user-facing error when the OS credential store could not be read. */
  restoreError: string | null;
  retrySessionRestore: () => void;
  /** User-initiated escape from an unreadable store entry: wipe it and continue logged out. */
  resetStoredSession: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    nativeLanguage: NativeLanguage,
  ) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setUser: (user: User | null) => void;
}

export class AccountDeletedCleanupError extends Error {
  constructor() {
    super(translate('auth.accountDeletedCleanupFailed'));
    this.name = 'AccountDeletedCleanupError';
  }
}

export class LogoutCleanupError extends Error {
  constructor() {
    super(translate('auth.logoutCleanupFailed'));
    this.name = 'LogoutCleanupError';
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const transitionRef = useRef(false);
  const epochRef = useRef(0);
  const tokenRef = useRef<string | null>(null);
  const pendingCleanupTailRef = useRef<Promise<void>>(Promise.resolve());
  const pendingCleanupFailedRef = useRef(false);

  const schedulePendingCleanup = useCallback(() => {
    const cleanup = pendingCleanupTailRef.current.then(async () => {
      try {
        await clearPendingAssessment();
        pendingCleanupFailedRef.current = false;
      } catch (error) {
        pendingCleanupFailedRef.current = true;
        throw error;
      }
    });
    // The tail always settles successfully so one OS-storage failure cannot
    // poison later cleanup. Callers may still observe `cleanup` itself.
    pendingCleanupTailRef.current = cleanup.then(
      () => undefined,
      () => undefined,
    );
    return cleanup;
  }, []);

  const waitForPendingCleanup = useCallback(async () => {
    // Include cleanup appended while an earlier operation is settling. If the
    // last OS-storage cleanup failed, append and await one real retry before a
    // new bearer token can be persisted.
    for (;;) {
      const pending = pendingCleanupTailRef.current;
      await pending;
      if (pending !== pendingCleanupTailRef.current) continue;
      if (!pendingCleanupFailedRef.current) return;
      await schedulePendingCleanup();
    }
  }, [schedulePendingCleanup]);

  const resetMemorySession = useCallback(() => {
    queryClient.clear();
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    setRestoreError(null);
    setSessionVersion((version) => version + 1);
  }, [queryClient]);

  const expireSession = useCallback(
    (rejectedToken?: string) => {
      // Ignore a late 401 from an earlier account after a new token is active.
      if (rejectedToken && rejectedToken !== tokenRef.current) return;
      // A password rotation/account deletion owns its transition and will
      // explicitly fail closed if it cannot establish or remove the session.
      if (rejectedToken && transitionRef.current) return;
      const tokenToClear = rejectedToken ?? tokenRef.current;
      epochRef.current += 1;
      // The learner did not ask to sign out; leave a one-shot explanation for
      // the login screen. Best effort — expiry itself must never block.
      void markSessionExpiredNotice().catch(() => undefined);
      void schedulePendingCleanup().catch(() => undefined);
      // A dead session must not keep nudging this device to practice.
      void cancelDailyReminderQuietly();
      resetMemorySession();
      // The server has already rejected this token. Clear persistence
      // best-effort and conditionally: a newer login must never be deleted by
      // this older 401's cleanup.
      if (tokenToClear) {
        void clearToken(tokenToClear).catch(() => undefined);
      }
    },
    [resetMemorySession, schedulePendingCleanup],
  );

  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  useEffect(() => {
    let cancelled = false;
    const epoch = ++epochRef.current;
    queryClient.clear();
    (async () => {
      try {
        const stored = await getToken();
        if (!cancelled && epoch === epochRef.current) {
          tokenRef.current = stored;
          setToken(stored);
          setRestoreError(null);
          setSessionVersion((version) => version + 1);
          setIsRestoring(false);
        }
      } catch {
        if (!cancelled && epoch === epochRef.current) {
          tokenRef.current = null;
          setToken(null);
          setUser(null);
          setRestoreError(translate('auth.restoreUnavailable'));
          setIsRestoring(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient, restoreAttempt]);

  useEffect(
    () => () => {
      // A token write that completes after the provider disappears must be
      // conditionally rolled back by establishSession.
      epochRef.current += 1;
    },
    [],
  );

  const retrySessionRestore = useCallback(() => {
    setRestoreError(null);
    setIsRestoring(true);
    setRestoreAttempt((attempt) => attempt + 1);
  }, []);

  const resetStoredSession = useCallback(() => {
    // Escape hatch for a permanently unreadable credential-store entry (e.g. an
    // undecryptable entry restored from an Android backup without its Keystore
    // key). Never invoked automatically: only the user's explicit action may
    // wipe the persisted session, and the fail-closed restore error stays the
    // default. The delete is best-effort — if it also fails, the unreadable
    // entry stays behind and the session still degrades to logged-out so
    // sign-in/register become reachable. Bump the epoch so a restore already
    // in flight cannot resurrect the wiped session afterwards.
    epochRef.current += 1;
    void clearToken().catch(() => undefined);
    // This is an explicit sign-out escape hatch, not merely a rendering
    // reset. Clear account-scoped handoff metadata and the local reminder too:
    // otherwise an unreadable old token can leave a prior learner's reminder
    // (or assessment metadata) behind until somebody signs in again.
    void schedulePendingCleanup().catch(() => undefined);
    void cancelDailyReminderQuietly();
    resetMemorySession();
  }, [resetMemorySession, schedulePendingCleanup]);

  const beginTransition = () => {
    if (transitionRef.current) {
      throw new Error('An account operation is already in progress.');
    }
    transitionRef.current = true;
    return ++epochRef.current;
  };

  const establishSession = useCallback(
    async (response: unknown, epoch: number): Promise<User> => {
      const parsed = parseAuthResponse(response);
      await waitForPendingCleanup();
      if (epoch !== epochRef.current) {
        throw new Error('The account operation was cancelled.');
      }
      await saveToken(parsed.token);
      if (epoch !== epochRef.current) {
        // Only remove the token written by this cancelled transition. If a
        // newer transition already saved another token, conditional cleanup
        // leaves it untouched.
        await clearToken(parsed.token);
        throw new Error('The account operation was cancelled.');
      }
      queryClient.clear();
      tokenRef.current = parsed.token;
      setToken(parsed.token);
      setUser(parsed.user);
      setSessionVersion((version) => version + 1);
      return parsed.user;
    },
    [queryClient, waitForPendingCleanup],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const epoch = beginTransition();
      try {
        const response = await apiFetch<unknown>('/auth/login', {
          method: 'POST',
          body: { email, password },
          auth: false,
          expireSessionOn401: false,
        });
        return await establishSession(response, epoch);
      } finally {
        transitionRef.current = false;
      }
    },
    [establishSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string, nativeLanguage: NativeLanguage) => {
      const epoch = beginTransition();
      try {
        const response = await apiFetch<unknown>('/auth/register', {
          method: 'POST',
          body: { name, email, password, nativeLanguage },
          auth: false,
          expireSessionOn401: false,
        });
        return await establishSession(response, epoch);
      } finally {
        transitionRef.current = false;
      }
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    const epoch = beginTransition();
    const sessionToken = tokenRef.current;
    try {
      // Revoke the bearer token before removing the local copy. Logout applies
      // to all devices until refresh-token families are introduced server-side.
      try {
        await apiFetch<void>('/auth/logout', {
          method: 'POST',
          expireSessionOn401: false,
        });
      } catch (error) {
        // An expired/revoked token already satisfies server-side logout. Do not
        // let that 401 keep protected data or the stale token on this device.
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
      // The learner signed out: stop the daily practice reminder on this
      // device. Best effort — logout must not fail on notification cleanup.
      void cancelDailyReminderQuietly();
      const [tokenCleanup, pendingCleanup] = await Promise.allSettled([
        sessionToken ? clearToken(sessionToken) : Promise.resolve(true),
        schedulePendingCleanup(),
      ]);
      const cleanupError =
        tokenCleanup.status === 'rejected' ||
        tokenCleanup.value === false ||
        pendingCleanup.status === 'rejected';
      if (epoch !== epochRef.current) return;
      // The server token is already revoked, so the protected UI must close
      // even if the OS keychain could not remove its now-useless local copy.
      resetMemorySession();
      if (cleanupError) {
        throw new LogoutCleanupError();
      }
    } finally {
      transitionRef.current = false;
    }
  }, [resetMemorySession, schedulePendingCleanup]);

  const verifySessionAfterCredentialError = useCallback(async () => {
    try {
      const response = await apiFetch<unknown>('/auth/me');
      parseUserResponse(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        expireSession();
      }
      // Preserve the original credential-confirmation error for valid sessions.
    }
  }, [expireSession]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const epoch = beginTransition();
      const sessionToken = tokenRef.current;
      let responseReceived = false;
      try {
        let response: unknown;
        try {
          response = await apiFetch<unknown>('/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword },
            expireSessionOn401: false,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await verifySessionAfterCredentialError();
          }
          throw error;
        }
        responseReceived = true;
        await establishSession(response, epoch);
      } catch (error) {
        // Once the server rotates the token, failing to persist its replacement
        // leaves the old session invalid. Fail closed and require a fresh login.
        if (epoch !== epochRef.current) {
          // If the provider disappeared after the server accepted the rotation
          // but before the replacement could be persisted, do not leave the
          // now-revoked token available for a stale restore on next launch.
          if (responseReceived && sessionToken) {
            await clearToken(sessionToken).catch(() => undefined);
          }
          throw error;
        }
        if (responseReceived) {
          expireSession();
        }
        throw error;
      } finally {
        transitionRef.current = false;
      }
    },
    [establishSession, expireSession, verifySessionAfterCredentialError],
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      beginTransition();
      const sessionToken = tokenRef.current;
      try {
        try {
          await apiFetch<void>('/auth/account', {
            method: 'DELETE',
            body: { password },
            expireSessionOn401: false,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await verifySessionAfterCredentialError();
          }
          throw error;
        }

        // The account is gone; its practice reminder must not outlive it.
        void cancelDailyReminderQuietly();
        const [tokenCleanup, pendingCleanup] = await Promise.allSettled([
          sessionToken ? clearToken(sessionToken) : Promise.resolve(true),
          schedulePendingCleanup(),
        ]);
        const cleanupError =
          tokenCleanup.status === 'rejected' ||
          tokenCleanup.value === false ||
          pendingCleanup.status === 'rejected';
        epochRef.current += 1;
        resetMemorySession();
        if (cleanupError) {
          throw new AccountDeletedCleanupError();
        }
      } finally {
        transitionRef.current = false;
      }
    },
    [resetMemorySession, schedulePendingCleanup, verifySessionAfterCredentialError],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      sessionVersion,
      isRestoring,
      restoreError,
      retrySessionRestore,
      resetStoredSession,
      login,
      register,
      logout,
      changePassword,
      deleteAccount,
      setUser,
    }),
    [
      token,
      user,
      sessionVersion,
      isRestoring,
      restoreError,
      retrySessionRestore,
      resetStoredSession,
      login,
      register,
      logout,
      changePassword,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
