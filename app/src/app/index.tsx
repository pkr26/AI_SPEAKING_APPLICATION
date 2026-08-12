import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ApiError, apiFetch, userMessageForError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';
import { parseUserResponse } from '../lib/types';

function LoadingView({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator
        accessibilityLabel={label}
        size="large"
        color={colors.primary}
      />
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
 *  - otherwise           → practice
 * An expired/invalid token (401) is cleared and the user lands on login.
 */
export default function Gate() {
  const { token, user, sessionVersion, isRestoring, setUser } = useAuth();

  const meQuery = useQuery({
    queryKey: ['me', sessionVersion],
    queryFn: async ({ signal }) =>
      parseUserResponse(await apiFetch<unknown>('/auth/me', { signal })).user,
    enabled: !!token && !user,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser]);

  if (isRestoring) {
    return <LoadingView label="Restoring your session…" />;
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  if (!user && meQuery.isPending) {
    return <LoadingView label="Loading your profile…" />;
  }

  if (!user && meQuery.isError) {
    // The API client clears rejected sessions centrally. Show a spinner while
    // protected routes are removed and the login screen becomes available.
    if (meQuery.error instanceof ApiError && meQuery.error.status === 401) {
      return <LoadingView label="Signing you out…" />;
    }
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Can&apos;t reach the server</Text>
        <Text accessibilityLiveRegion="assertive" style={styles.muted}>
          {userMessageForError(
            meQuery.error,
            'Could not load your profile. Please try again.',
          )}
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => void meQuery.refetch()}
        >
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  const profile = user ?? meQuery.data;
  if (!profile) {
    return <LoadingView label="Loading your profile…" />;
  }

  return (
    <Redirect href={profile.diagnosticCompleted ? '/practice' : '/diagnostic'} />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  muted: {
    marginTop: 12,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  pressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
