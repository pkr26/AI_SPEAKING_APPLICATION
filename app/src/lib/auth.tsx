import { useQueryClient } from "@tanstack/react-query";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ApiError,
  apiFetch,
  clearToken,
  getToken,
  saveToken,
  setUnauthorizedHandler,
} from "./api";
import {
  parseAuthResponse,
  parseUserResponse,
  type NativeLanguage,
  type User,
} from "./types";
import { clearPendingAssessment } from "./pending-assessment";
export {
  comparablePasswordError,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  passwordPolicyError,
  utf8ByteLength,
} from "./password-policy";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  /** Changes whenever the local session identity changes. */
  sessionVersion: number;
  /** True while the persisted token is being read from SecureStore. */
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    nativeLanguage: NativeLanguage,
  ) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setUser: (user: User | null) => void;
}

export class AccountDeletedCleanupError extends Error {
  constructor() {
    super(
      "Your account was deleted, but local session cleanup failed. Restart the app before signing in again.",
    );
    this.name = "AccountDeletedCleanupError";
  }
}

export class LogoutCleanupError extends Error {
  constructor() {
    super(
      "You were logged out, but the revoked local session could not be removed. Restart the app before signing in again.",
    );
    this.name = "LogoutCleanupError";
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const transitionRef = useRef(false);
  const epochRef = useRef(0);
  const tokenRef = useRef<string | null>(null);

  const resetMemorySession = useCallback(() => {
    queryClient.clear();
    void clearPendingAssessment().catch(() => undefined);
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    setSessionVersion((version) => version + 1);
  }, [queryClient]);

  const expireSession = useCallback(
    (rejectedToken?: string) => {
      // Ignore a late 401 from an earlier account after a new token is active.
      if (rejectedToken && rejectedToken !== tokenRef.current) return;
      // A password rotation/account deletion owns its transition and will
      // explicitly fail closed if it cannot establish or remove the session.
      if (rejectedToken && transitionRef.current) return;
      epochRef.current += 1;
      resetMemorySession();
      // The server has already rejected this token. Clear persistence
      // best-effort so protected UI closes even if the keychain is unavailable.
      void clearToken().catch(() => undefined);
    },
    [resetMemorySession],
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
      const stored = await getToken();
      if (!cancelled && epoch === epochRef.current) {
        tokenRef.current = stored;
        setToken(stored);
        setSessionVersion((version) => version + 1);
        setIsRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  const beginTransition = () => {
    if (transitionRef.current) {
      throw new Error("An account operation is already in progress.");
    }
    transitionRef.current = true;
    return ++epochRef.current;
  };

  const establishSession = useCallback(
    async (response: unknown, epoch: number): Promise<User> => {
      const parsed = parseAuthResponse(response);
      if (epoch !== epochRef.current) {
        throw new Error("The account operation was cancelled.");
      }
      await saveToken(parsed.token);
      if (epoch !== epochRef.current) {
        throw new Error("The account operation was cancelled.");
      }
      queryClient.clear();
      tokenRef.current = parsed.token;
      setToken(parsed.token);
      setUser(parsed.user);
      setSessionVersion((version) => version + 1);
      return parsed.user;
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const epoch = beginTransition();
      try {
        const response = await apiFetch<unknown>("/auth/login", {
          method: "POST",
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
    async (
      name: string,
      email: string,
      password: string,
      nativeLanguage: NativeLanguage,
    ) => {
      const epoch = beginTransition();
      try {
        const response = await apiFetch<unknown>("/auth/register", {
          method: "POST",
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
    try {
      // Revoke the bearer token before removing the local copy. Logout applies
      // to all devices until refresh-token families are introduced server-side.
      try {
        await apiFetch<void>("/auth/logout", {
          method: "POST",
          expireSessionOn401: false,
        });
      } catch (error) {
        // An expired/revoked token already satisfies server-side logout. Do not
        // let that 401 keep protected data or the stale token on this device.
        if (!(error instanceof ApiError && error.status === 401)) throw error;
      }
      let cleanupError: unknown;
      try {
        await clearToken();
      } catch (error) {
        cleanupError = error;
      }
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
  }, [resetMemorySession]);

  const verifySessionAfterCredentialError = useCallback(async () => {
    try {
      const response = await apiFetch<unknown>("/auth/me");
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
      let responseReceived = false;
      try {
        let response: unknown;
        try {
          response = await apiFetch<unknown>("/auth/change-password", {
            method: "POST",
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
        if (epoch !== epochRef.current) throw error;
        if (
          responseReceived &&
          !(error instanceof ApiError && error.status === 401)
        ) {
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
      try {
        try {
          await apiFetch<void>("/auth/account", {
            method: "DELETE",
            body: { password },
            expireSessionOn401: false,
          });
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) {
            await verifySessionAfterCredentialError();
          }
          throw error;
        }

        let cleanupError: unknown;
        try {
          await clearToken();
        } catch (error) {
          cleanupError = error;
        }
        epochRef.current += 1;
        resetMemorySession();
        if (cleanupError) {
          throw new AccountDeletedCleanupError();
        }
      } finally {
        transitionRef.current = false;
      }
    },
    [resetMemorySession, verifySessionAfterCredentialError],
  );

  const value = useMemo(
    () => ({
      token,
      user,
      sessionVersion,
      isRestoring,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
