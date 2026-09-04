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
import { useGuestLanguage } from './guest-language';
import { translate } from './i18n';
import {
  parseAuthResponse,
  parseUserResponse,
  type NativeLanguage,
  type UiLanguage,
  type User,
} from './types';
import { advanceUnconditionalClearGeneration, clearPendingAssessment } from './pending-assessment';
import { cleanupPrivateArtifacts } from './private-artifacts';
import { markSessionExpiredNotice } from './session-notice';
export {
  comparablePasswordError,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  utf8ByteLength,
} from './password-policy';
export { emailAddressError, isValidEmailAddress } from './identity-validation';

const sessionLeaseBrand: unique symbol = Symbol('SessionLease');

/**
 * Opaque snapshot of the active authenticated identity.
 *
 * Consumers can retain and later validate a lease, but cannot inspect or forge
 * its fields. Validation reads AuthProvider's synchronous refs, so a session
 * transition invalidates old async work before React commits the corresponding
 * state update.
 */
export interface SessionLease {
  readonly [sessionLeaseBrand]: true;
}
interface SessionLeaseSnapshot extends SessionLease {
  readonly epoch: number;
  readonly token: string | null;
  readonly userId: string | null;
  /** Lease re-arm generation captured alongside the identity fields. */
  readonly leaseRevision: number;
}
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
  /**
   * Signed-in, local-only sign-out used when the server cannot be reached (for
   * example behind the forced-upgrade gate). Unlike resetStoredSession, this
   * fails closed until the readable persisted bearer token is proven absent.
   */
  signOutThisDevice?: () => Promise<void>;
  /** Captures the current session identity for guarding an async continuation. */
  captureSessionLease: () => SessionLease;
  /**
   * True only while the captured session is current. Account-operation error
   * handlers may ignore the deliberately advanced transition epoch while
   * still requiring the exact token and user identity to match.
   */
  isSessionLeaseCurrent: (lease: SessionLease, options?: { identityOnly?: boolean }) => boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    nativeLanguage: NativeLanguage,
    uiLanguage?: UiLanguage,
  ) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export class AccountDeletedCleanupError extends Error {
  constructor() {
    super(translate('auth.accountDeletedCleanupFailed'));
    this.name = 'AccountDeletedCleanupError';
  }
}

export class AccountDeletionUnconfirmedError extends Error {
  constructor() {
    super(translate('da.unconfirmed'));
    this.name = 'AccountDeletionUnconfirmedError';
  }
}

export class LogoutCleanupError extends Error {
  constructor() {
    super(translate('auth.logoutCleanupFailed'));
    this.name = 'LogoutCleanupError';
  }
}

export class LocalSignOutUnconfirmedError extends Error {
  constructor() {
    super(translate('error.internal'));
    this.name = 'LocalSignOutUnconfirmedError';
  }
}

export class RegistrationCompletedLoginRequiredError extends Error {
  constructor() {
    super(translate('auth.registrationCompletedLoginRequired'));
    this.name = 'RegistrationCompletedLoginRequiredError';
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { mirrorAccountLanguage } = useGuestLanguage();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  // Failed account mutations deliberately advance the synchronous lease epoch
  // while their outcome is unknown. If the same identity survives, changing
  // this private revision republishes captureSessionLease without rotating the
  // session identity used to key navigators, queries, and practice state.
  const [leaseRevision, setLeaseRevision] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const transitionRef = useRef(false);
  const epochRef = useRef(0);
  const tokenRef = useRef<string | null>(null);
  const userRef = useRef<User | null>(null);
  const pendingCleanupTailRef = useRef<Promise<void>>(Promise.resolve());
  const pendingCleanupFailedRef = useRef(false);

  useEffect(() => {
    // A process can be killed while the OS share sheet is open or while a
    // retained recording is playing. Those files live only in our dedicated
    // cache tree, so every fresh provider lifetime can safely reap orphans.
    void cleanupPrivateArtifacts().catch(() => undefined);
  }, []);

  const setUser = useCallback((nextUser: React.SetStateAction<User | null>) => {
    // Keep the imperative identity guard ahead of React's asynchronous commit.
    // Screen continuations must never observe an old user during the gap after
    // AuthProvider has already requested a session/profile state change.
    const resolved = typeof nextUser === 'function' ? nextUser(userRef.current) : nextUser;
    userRef.current = resolved;
    setUserState(resolved);
  }, []);
  const captureSessionLease = useCallback((): SessionLease => {
    void leaseRevision;
    return Object.freeze({
      [sessionLeaseBrand]: true as const,
      epoch: epochRef.current,
      token: tokenRef.current,
      userId: userRef.current?.id ?? null,
      leaseRevision,
    }) satisfies SessionLeaseSnapshot;
  }, [leaseRevision]);

  const isSessionLeaseCurrent = useCallback(
    (lease: SessionLease, options?: { identityOnly?: boolean }): boolean => {
      const snapshot = lease as SessionLeaseSnapshot;
      return (
        snapshot[sessionLeaseBrand] === true &&
        (options?.identityOnly === true || snapshot.epoch === epochRef.current) &&
        snapshot.token === tokenRef.current &&
        snapshot.userId === (userRef.current?.id ?? null)
      );
    },
    [],
  );

  const schedulePendingCleanup = useCallback(() => {
    // Close the generation fence SYNCHRONOUSLY, before chaining the delete
    // onto the cleanup tail: a prior tail that hangs in the OS credential
    // store would otherwise leave the fence open (the bump used to happen only
    // when clearPendingAssessment actually ran), letting an in-flight creator
    // repopulate the slot after logout already considered cleanup complete.
    // The queued delete itself keeps its exact previous scheduling.
    advanceUnconditionalClearGeneration();
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
    // new bearer token can be persisted. This loop is bounded in practice,
    // not unbounded: a failing retry rethrows (schedulePendingCleanup
    // propagates the cleanup error), which exits the loop and surfaces to
    // establishSession's caller, and a succeeding retry clears the failure
    // flag. Only the "appended while settling" tail-chase can iterate twice.
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
  }, [queryClient, setUser]);

  const expireSession = useCallback(
    (rejectedToken?: string) => {
      // Ignore a late 401 from an earlier account after a new token is active.
      if (rejectedToken && rejectedToken !== tokenRef.current) return;
      // A password rotation/account deletion owns its transition and will
      // explicitly fail closed if it cannot establish or remove the session.
      if (rejectedToken && transitionRef.current) return;
      const tokenToClear = rejectedToken ?? tokenRef.current;
      const artifactOwnerId = userRef.current?.id;
      epochRef.current += 1;
      // The learner did not ask to sign out; leave a one-shot explanation for
      // the login screen. Best effort — expiry itself must never block.
      void markSessionExpiredNotice().catch(() => undefined);
      void schedulePendingCleanup().catch(() => undefined);
      void cleanupPrivateArtifacts(artifactOwnerId).catch(() => undefined);
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
  }, [queryClient, restoreAttempt, setUser]);

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
    void cleanupPrivateArtifacts(userRef.current?.id).catch(() => undefined);
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

  const rearmSessionLeasesAfterFailedTransition = useCallback(
    (epoch: number, sessionToken: string | null, sessionUserId: string | null) => {
      // beginTransition fences every continuation immediately, regardless of
      // whether a session exists. If the operation then fails while the same
      // identity remains — signed-in OR signed-out (a failed login from the
      // logged-out screen must not strand every pre-attempt lease) —
      // republish the lease factory so memoized screen leases recapture that
      // newer epoch. sessionVersion must stay stable: it keys the navigator
      // and practice state and therefore represents identity, not an internal
      // lease rearm.
      const sameSignedInIdentity =
        sessionToken !== null &&
        epoch === epochRef.current &&
        sessionToken === tokenRef.current &&
        sessionUserId === (userRef.current?.id ?? null);
      const sameSignedOutIdentity =
        sessionToken === null &&
        sessionUserId === null &&
        epoch === epochRef.current &&
        tokenRef.current === null &&
        (userRef.current?.id ?? null) === null;
      if (sameSignedInIdentity || sameSignedOutIdentity) {
        setLeaseRevision((revision) => revision + 1);
      }
    },
    [],
  );

  const signOutThisDevice = useCallback(async () => {
    // Unlike a server-backed account operation, attempting this local cleanup
    // is not itself an identity transition. Advancing the epoch up front would
    // invalidate every screen lease even when SecureStore fails and the same
    // signed-in UI must remain usable.
    if (transitionRef.current) {
      throw new Error('An account operation is already in progress.');
    }
    transitionRef.current = true;
    const epoch = epochRef.current;
    const sessionToken = tokenRef.current;
    const artifactOwnerId = userRef.current?.id;
    const stillOwnsSession = () => epoch === epochRef.current && sessionToken === tokenRef.current;
    try {
      if (!sessionToken) return;

      // A signed-in local sign-out is not the unreadable-store escape hatch.
      // Keep the protected UI and its in-memory identity intact unless the
      // exact bearer was removed and a serialized read proves no token remains.
      // This also keeps api.ts's synchronous token snapshot aligned with disk.
      try {
        const storedBefore = await getToken();
        if (!stillOwnsSession()) return;
        if (storedBefore !== null) {
          if (storedBefore !== sessionToken || !(await clearToken(sessionToken))) {
            throw new LocalSignOutUnconfirmedError();
          }
          if (!stillOwnsSession()) return;
        }
        if ((await getToken()) !== null) {
          throw new LocalSignOutUnconfirmedError();
        }
        if (!stillOwnsSession()) return;
      } catch (error) {
        if (error instanceof LocalSignOutUnconfirmedError) throw error;
        throw new LocalSignOutUnconfirmedError();
      }

      // Once serialized reads prove the exact bearer absent, fence old work and
      // close the protected UI synchronously. Pending-assessment cleanup can be
      // slow or hung in the OS credential store and must not delay that fence.
      const pendingCleanup = schedulePendingCleanup();
      epochRef.current += 1;
      resetMemorySession();
      void cancelDailyReminderQuietly();
      void cleanupPrivateArtifacts(artifactOwnerId).catch(() => undefined);
      try {
        await pendingCleanup;
      } catch {
        throw new LogoutCleanupError();
      }
    } finally {
      transitionRef.current = false;
    }
  }, [resetMemorySession, schedulePendingCleanup]);

  const establishSession = useCallback(
    async (
      response: unknown,
      epoch: number,
      tokenPersistenceError?: () => Error,
    ): Promise<User> => {
      const parsed = parseAuthResponse(response);
      await waitForPendingCleanup();
      if (epoch !== epochRef.current) {
        throw new Error('The account operation was cancelled.');
      }
      try {
        await saveToken(parsed.token);
      } catch (error) {
        if (tokenPersistenceError) throw tokenPersistenceError();
        throw error;
      }
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
      void Promise.resolve(mirrorAccountLanguage(parsed.user.uiLanguage)).catch(() => undefined);
      setSessionVersion((version) => version + 1);
      return parsed.user;
    },
    [mirrorAccountLanguage, queryClient, setUser, waitForPendingCleanup],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const epoch = beginTransition();
      const sessionToken = tokenRef.current;
      const sessionUserId = userRef.current?.id ?? null;
      try {
        const response = await apiFetch<unknown>('/auth/login', {
          method: 'POST',
          body: { email, password },
          auth: false,
          expireSessionOn401: false,
        });
        return await establishSession(response, epoch);
      } catch (error) {
        rearmSessionLeasesAfterFailedTransition(epoch, sessionToken, sessionUserId);
        throw error;
      } finally {
        transitionRef.current = false;
      }
    },
    [establishSession, rearmSessionLeasesAfterFailedTransition],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      nativeLanguage: NativeLanguage,
      uiLanguage: UiLanguage = 'en',
    ) => {
      const epoch = beginTransition();
      const sessionToken = tokenRef.current;
      const sessionUserId = userRef.current?.id ?? null;
      try {
        const response = await apiFetch<unknown>('/auth/register', {
          method: 'POST',
          body: { name, email, password, nativeLanguage, uiLanguage },
          auth: false,
          expireSessionOn401: false,
        });
        return await establishSession(
          response,
          epoch,
          () => new RegistrationCompletedLoginRequiredError(),
        );
      } catch (error) {
        rearmSessionLeasesAfterFailedTransition(epoch, sessionToken, sessionUserId);
        throw error;
      } finally {
        transitionRef.current = false;
      }
    },
    [establishSession, rearmSessionLeasesAfterFailedTransition],
  );

  const logout = useCallback(async () => {
    const epoch = beginTransition();
    const sessionToken = tokenRef.current;
    const sessionUserId = userRef.current?.id ?? null;
    const artifactOwnerId = userRef.current?.id;
    try {
      // Revoke the bearer token before removing the local copy. Logout applies
      // to all devices until refresh-token families are introduced server-side.
      try {
        await apiFetch<void>('/auth/logout', {
          method: 'POST',
          expireSessionOn401: false,
          expectedStatus: 204,
        });
      } catch (error) {
        // An expired/revoked token already satisfies server-side logout. Do not
        // let that 401 keep protected data or the stale token on this device.
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
      // The learner signed out: stop the daily practice reminder on this
      // device. Best effort — logout must not fail on notification cleanup.
      void cancelDailyReminderQuietly();
      void cleanupPrivateArtifacts(artifactOwnerId).catch(() => undefined);
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
    } catch (error) {
      rearmSessionLeasesAfterFailedTransition(epoch, sessionToken, sessionUserId);
      throw error;
    } finally {
      transitionRef.current = false;
    }
  }, [rearmSessionLeasesAfterFailedTransition, resetMemorySession, schedulePendingCleanup]);

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
      const sessionUserId = userRef.current?.id ?? null;
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
        } else {
          rearmSessionLeasesAfterFailedTransition(epoch, sessionToken, sessionUserId);
        }
        throw error;
      } finally {
        transitionRef.current = false;
      }
    },
    [
      establishSession,
      expireSession,
      rearmSessionLeasesAfterFailedTransition,
      verifySessionAfterCredentialError,
    ],
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      const epoch = beginTransition();
      const sessionToken = tokenRef.current;
      const sessionUserId = userRef.current?.id ?? null;
      const artifactOwnerId = userRef.current?.id;
      try {
        try {
          await apiFetch<void>('/auth/account', {
            method: 'DELETE',
            body: { password },
            expireSessionOn401: false,
            expectedStatus: 204,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await verifySessionAfterCredentialError();
            throw error;
          }
          if (
            error instanceof ApiError &&
            (error.status === 0 || error.status === 408 || error.status >= 500)
          ) {
            // A rejected old bearer is not durable deletion proof: it can also
            // mean expiry, password rotation, logout on another device, or
            // administrative revocation while the account and its data remain.
            // The API has no deletion-receipt endpoint, so an ambiguous DELETE
            // must stay unconfirmed and preserve the local session for retry.
            throw new AccountDeletionUnconfirmedError();
          } else {
            throw error;
          }
        }

        // The account is gone; its practice reminder must not outlive it.
        void cancelDailyReminderQuietly();
        void cleanupPrivateArtifacts(artifactOwnerId).catch(() => undefined);
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
      } catch (error) {
        rearmSessionLeasesAfterFailedTransition(epoch, sessionToken, sessionUserId);
        throw error;
      } finally {
        transitionRef.current = false;
      }
    },
    [
      rearmSessionLeasesAfterFailedTransition,
      resetMemorySession,
      schedulePendingCleanup,
      verifySessionAfterCredentialError,
    ],
  );
  lastRestoreAttempt = restoreAttempt; // mirror for getLastRestoreAttempt()
  const value = useMemo(
    () => ({
      token,
      user,
      sessionVersion,
      isRestoring,
      restoreError,
      retrySessionRestore,
      resetStoredSession,
      signOutThisDevice,
      captureSessionLease,
      isSessionLeaseCurrent,
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
      signOutThisDevice,
      captureSessionLease,
      isSessionLeaseCurrent,
      login,
      register,
      logout,
      changePassword,
      deleteAccount,
      setUser,
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

/**
 * Latest SecureStore-restore attempt generation mirrored by any mounted
 * AuthProvider during render; zero until the learner retries a failed restore.
 * Non-React diagnostics and tests read this instead of React state.
 */
let lastRestoreAttempt = 0;
export function getLastRestoreAttempt(): number {
  return lastRestoreAttempt;
}
