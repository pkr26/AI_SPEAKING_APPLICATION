import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import Button from '../components/Button';
import { ApiError, apiFetch, userMessageForError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';
import { parseUserResponse } from '../lib/types';

function LoadingView({ label }: { label: string }) {
  const theme = useTheme();
  const styles = themedStyles(theme);
  return (
    <View style={styles.center}>
      <ActivityIndicator accessibilityLabel={label} size="large" color={theme.colors.primary} />
      <Text accessibilityLiveRegion="polite" style={styles.muted}>
        {label}
      </Text>
    </View>
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
    enabled: !!token && !user,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data && isSessionLeaseCurrent(sessionLease)) {
      setUser(meQuery.data);
    }
  }, [isSessionLeaseCurrent, meQuery.data, sessionLease, setUser]);

  if (isRestoring) {
    return <LoadingView label={t('gate.restoring')} />;
  }

  if (restoreError) {
    return (
      <View style={styles.center}>
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
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
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
      <View style={styles.center}>
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
      </View>
    );
  }

  const profile = user ?? (isSessionLeaseCurrent(sessionLease) ? meQuery.data : undefined);
  if (!profile) {
    return <LoadingView label={t('gate.loadingProfile')} />;
  }

  return <Redirect href={profile.diagnosticCompleted ? '/home' : '/diagnostic'} />;
}

const themedStyles = createThemedStyles(({ colors, spacing }) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
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
