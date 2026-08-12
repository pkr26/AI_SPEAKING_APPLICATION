import React, { useEffect } from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../lib/auth';
import { PracticeFlowProvider } from '../lib/practice-flow';
import { colors, layout } from '../lib/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,
    },
  },
});

function RootNavigator() {
  const { token, user, isRestoring, restoreError } = useAuth();
  const hasProfile = !isRestoring && !restoreError && !!token && !!user;
  const canPractice = hasProfile && user?.diagnosticCompleted === true;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={!isRestoring && !restoreError && !token}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={hasProfile && user?.diagnosticCompleted === false}>
          <Stack.Screen
            name="diagnostic"
            options={{
              title: 'Diagnostic Test',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={canPractice}>
          <Stack.Screen
            name="practice/index"
            options={{
              title: 'Practice',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="practice/help" options={{ title: 'Help' }} />
          <Stack.Screen name="practice/attempt" options={{ title: 'Practice Mode' }} />
          <Stack.Screen
            name="practice/feedback"
            options={{
              title: 'Feedback',
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="settings/change-password" options={{ title: 'Change Password' }} />
          <Stack.Screen name="settings/delete-account" options={{ title: 'Delete Account' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

function QueryFocusBridge() {
  useEffect(() => {
    const updateFocus = (state: string) => {
      focusManager.setFocused(state === 'active');
    };
    updateFocus(AppState.currentState ?? 'active');
    const subscription = AppState.addEventListener('change', updateFocus);
    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);
  return null;
}

/** Last-resort route boundary; never expose stack traces or provider details. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.errorScreen}>
      <View style={styles.errorCard}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          Something went wrong
        </Text>
        <Text accessibilityRole="alert" style={styles.errorBody}>
          Your learning data is safe. Try this screen again.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={({ pressed }) => [styles.errorButton, pressed && styles.errorButtonPressed]}
        >
          <Text style={styles.errorButtonText}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <QueryFocusBridge />
        <AuthProvider>
          <PracticeFlowProvider>
            <RootNavigator />
          </PracticeFlowProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorCard: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorBody: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  errorButton: {
    minHeight: layout.minimumTarget,
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  errorButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
