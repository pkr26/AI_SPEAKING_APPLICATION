import React, { type PropsWithChildren, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import { ApiError, apiFetch, userMessageForError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { useNetworkStatus } from '../lib/network-status';
import { createThemedStyles, useTheme } from '../lib/theme';
import { parseUserResponse } from '../lib/types';

/**
 * Bounded wait before the Gate's disabled profile observer refetches on its
 * own. The root ProfileRefreshBridge normally populates the shared cache long
 * before this fires; it exists so a bridge regression degrades to one direct
 * request instead of an unbounded loading spinner.
 */
const GATE_PROFILE_FALLBACK_MS = 10_000;

function FallbackScreen({ children }: PropsWithChildren) {
  const styles = themedStyles(useTheme());
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.center}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingView({ label }: { label: string }) {
  const theme = useTheme();
  const styles = themedStyles(theme);
  return (
    <FallbackScreen>
      <ActivityIndicator accessibilityLabel={label} size="large" color={theme.colors.primary} />
      <Text accessibilityLiveRegion="polite" style={styles.muted}>
        {label}
      </Text>
    </FallbackScreen>
  );
}

/**
 * Entry gate: routes based on auth state.
 *  - no token            → login
 *  - token, not assessed → diagnostic
 *  - otherwise           → home (progress screen; practice is one tap away)
 * An expired/invalid token (401) is cleared and the user lands on login.
 */
export default function Gate() {
  const t = useT();
  const styles = themedStyles(useTheme());
  const { reachability } = useNetworkStatus();
  const {
    token,
    user,
    sessionVersion,
    isRestoring,
    restoreError,
    retrySessionRestore,
    resetStoredSession,
    setUser,
    captureSessionLease,
    isSessionLeaseCurrent,
  } = useAuth();

  const sessionLease = useMemo(() => {
    // Capture during render. Calling captureSessionLease from the query
    // continuation would brand stale work with whichever account is current
    // when the request happens to settle.
    void sessionVersion;
    void token;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, token]);

  const meQuery = useQuery({
    queryKey: ['me', sessionVersion],
    queryFn: async ({ signal }) =>
      parseUserResponse(await apiFetch<unknown>('/auth/me', { signal })).user,
    // Refresh even when SecureStore restored a cached user. Profile edits made
    // on another device (name, UI language, learning language, placement reset)
    // otherwise remain invisible for the entire local session because no other
    // screen owns an authoritative /me observer.
    // Root's persistent ProfileRefreshBridge is the sole eager owner. This
    // observer supplies Gate's loading/error/retry UI without issuing a second
    // request or disappearing after the redirect.
    enabled: false,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data && isSessionLeaseCurrent(sessionLease)) {
      setUser(meQuery.data);
    }
  }, [isSessionLeaseCurrent, meQuery.data, sessionLease, setUser]);

  // meQuery is disabled and relies on the root ProfileRefreshBridge to share
  // the ['me', sessionVersion] cache entry. If that bridge is ever refactored
  // away from its eager fetch, this observer would otherwise show an unbounded
  // spinner; after a bounded wait, refetch through this observer once so the
  // Gate degrades to its own request instead of hanging silently.
  useEffect(() => {
    if (!token || user || meQuery.data || meQuery.fetchStatus !== 'idle') return;
    const fallback = setTimeout(() => {
      void meQuery.refetch();
    }, GATE_PROFILE_FALLBACK_MS);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, meQuery.data, meQuery.fetchStatus, sessionVersion]);

  if (isRestoring) {
    return <LoadingView label={t('gate.restoring')} />;
  }

  if (restoreError) {
    return (
      <FallbackScreen>
        <Text accessibilityRole="header" style={styles.title}>
          {t('gate.sessionErrorTitle')}
        </Text>
        <Text accessibilityRole="alert" style={styles.muted}>
          {restoreError}
        </Text>
        <Button
          title={t('common.tryAgain')}
          onPress={retrySessionRestore}
          style={styles.retryButton}
        />
        <Button
          title={t('gate.resetSession')}
          variant="danger"
          onPress={resetStoredSession}
          style={styles.resetButton}
        />
      </FallbackScreen>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  // TanStack pauses a new profile query while offline. Keep the restored
  // bearer token intact and wait for its automatic reconnect instead of
  // turning an unavailable network into a logout or an endless spinner.
  if (!user && !meQuery.data && (reachability === 'offline' || meQuery.fetchStatus === 'paused')) {
    return (
      <FallbackScreen>
        <Text accessibilityRole="header" style={styles.title}>
          {t('gate.offlineTitle')}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          {t('gate.offlineBody')}
        </Text>
      </FallbackScreen>
    );
  }

  if (!user && meQuery.isPending) {
    return <LoadingView label={t('gate.loadingProfile')} />;
  }

  if (!user && meQuery.isError) {
    // The API client clears rejected sessions centrally. Show a spinner while
    // protected routes are removed and the login screen becomes available.
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      return <LoadingView label={t('gate.signingOut')} />;
    }
    return (
      <FallbackScreen>
        <Text accessibilityRole="header" style={styles.title}>
          {t('gate.serverErrorTitle')}
        </Text>
        <Text accessibilityLiveRegion="assertive" style={styles.muted}>
          {userMessageForError(meQuery.error, t('gate.profileFailed'))}
        </Text>
        <Button
          title={t('common.tryAgain')}
          onPress={() => void meQuery.refetch({ cancelRefetch: false })}
          style={styles.retryButton}
        />
      </FallbackScreen>
    );
  }

  const profile = user ?? (isSessionLeaseCurrent(sessionLease) ? meQuery.data : undefined);
  if (!profile) {
    return <LoadingView label={t('gate.loadingProfile')} />;
  }

  const placementRevealPending =
    profile.diagnosticCompleted && profile.diagnosticAcknowledged === false;
  return (
    <Redirect
      href={profile.diagnosticCompleted && !placementRevealPending ? '/home' : '/diagnostic'}
    />
  );
}

const themedStyles = createThemedStyles(({ colors, layout, spacing }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  muted: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.xl,
  },
  resetButton: {
    marginTop: spacing.ml,
  },
}));
