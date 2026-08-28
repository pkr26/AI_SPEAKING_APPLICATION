import React, { useEffect } from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import { AdsProvider } from '../lib/ads';
import { AuthProvider, useAuth } from '../lib/auth';
import { refreshDailyReminderLanguage } from '../lib/daily-reminder';
import { I18nProvider, translate, useT } from '../lib/i18n';
import { PracticeFlowProvider } from '../lib/practice-flow';
import { createThemedStyles, useTheme } from '../lib/theme';

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
  const t = useT();
  const { scheme, colors } = useTheme();
  const hasProfile = !isRestoring && !restoreError && !!token && !!user;
  const canPractice = hasProfile && user?.diagnosticCompleted === true;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
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
              title: t('header.diagnostic'),
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={canPractice}>
          <Stack.Screen
            name="home"
            options={{
              title: t('header.home'),
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="practice/index"
            options={{
              title: t('header.practice'),
              // The screen relaxes these while no recording/upload holds the
              // interaction lock; locked exits would discard the take.
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="practice/help" options={{ title: t('header.help') }} />
          <Stack.Screen name="practice/attempt" options={{ title: t('header.attempt') }} />
          <Stack.Screen
            name="practice/feedback"
            options={{
              title: t('header.feedback'),
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="history" options={{ title: t('header.history') }} />
        </Stack.Protected>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="recordings" options={{ title: t('header.recordings') }} />
          <Stack.Screen name="settings/index" options={{ title: t('header.settings') }} />
          <Stack.Screen
            name="settings/change-password"
            options={{ title: t('header.changePassword') }}
          />
          <Stack.Screen
            name="settings/delete-account"
            options={{ title: t('header.deleteAccount') }}
          />
          <Stack.Screen name="settings/privacy" options={{ title: t('header.privacy') }} />
          <Stack.Screen name="settings/terms" options={{ title: t('header.terms') }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/** Bridges the authenticated user's UI language into the i18n provider. */
function LocalizedProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <I18nProvider accountLanguage={user?.uiLanguage ?? null}>{children}</I18nProvider>;
}

/** Keeps OS-baked reminder copy aligned after restore or another device's edit. */
function ReminderLanguageBridge() {
  const { user } = useAuth();
  const userId = user?.id;
  const uiLanguage = user?.uiLanguage;
  useEffect(() => {
    if (!userId || !uiLanguage) return;
    void refreshDailyReminderLanguage(uiLanguage).catch(() => undefined);
  }, [uiLanguage, userId]);
  return null;
}

function QueryFocusBridge() {
  useEffect(() => {
    const updateFocus = (state: string) => {
      focusManager.setFocused(state === 'active');
    };
    const subscription = AppState.addEventListener('change', updateFocus);
    // Subscribe before sampling. A background transition between those two
    // operations is then either reflected in currentState or delivered to the
    // listener, rather than being missed until the next lifecycle event.
    updateFocus(AppState.currentState ?? 'active');
    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);
  return null;
}

/**
 * Last-resort route boundary; never expose stack traces or provider details.
 * It can render outside the providers, so it uses the module-level translator.
 */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const styles = themedStyles(useTheme());
  return (
    <SafeAreaView style={styles.errorScreen}>
      <ScrollView contentContainerStyle={styles.errorContent}>
        <View style={styles.errorCard}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            {translate('boundary.title')}
          </Text>
          <Text accessibilityRole="alert" style={styles.errorBody}>
            {translate('boundary.body')}
          </Text>
          <Button title={translate('common.tryAgain')} onPress={retry} style={styles.errorButton} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <QueryFocusBridge />
        <AdsProvider>
          <AuthProvider>
            <LocalizedProviders>
              <ReminderLanguageBridge />
              <PracticeFlowProvider>
                <RootNavigator />
              </PracticeFlowProvider>
            </LocalizedProviders>
          </AuthProvider>
        </AdsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  errorScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorCard: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    padding: spacing.xl,
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
    marginTop: spacing.xl,
  },
}));
