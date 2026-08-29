import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { AppState, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ClientUpgradeModal from '../components/ClientUpgradeModal';
import NetworkStatusBanner from '../components/NetworkStatusBanner';
import { AdsProvider } from '../lib/ads';
import { apiFetch } from '../lib/api';
import { AssessmentReplayProvider } from '../lib/assessment-replay-provider';
import { AuthProvider, useAuth } from '../lib/auth';
import { refreshDailyReminderLanguage } from '../lib/daily-reminder';
import { GuestLanguageProvider, useGuestLanguage } from '../lib/guest-language';
import { I18nProvider, translate, useT, type UiLanguage } from '../lib/i18n';
import { NetworkStatusBridge } from '../lib/network-status';
import { PracticeFlowProvider } from '../lib/practice-flow';
import { createThemedStyles, useTheme } from '../lib/theme';
import { parseUserResponse, type User } from '../lib/types';

// Anchor valid cold deep links behind the route gate. Without an initial root
// entry, a direct custom-scheme link to a leaf screen can have no safe Back
// destination and leave the learner exiting the app from History or Settings.
export const unstable_settings = {
  initialRouteName: 'index',
};

// SDK 57 requires this call at module scope so native auto-hide cannot win the
// race with the asynchronous device-language preference restore.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,
    },
  },
});

const UI_ACCESSIBILITY_LANGUAGES: Record<UiLanguage, string> = {
  en: 'en-US',
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

function RootNavigator() {
  const { token, user, isRestoring, restoreError } = useAuth();
  const t = useT();
  const { scheme, colors } = useTheme();
  const hasProfile = !isRestoring && !restoreError && !!token && !!user;
  const placementRevealPending =
    user?.diagnosticCompleted === true && user.diagnosticAcknowledged === false;
  const canPractice = hasProfile && user?.diagnosticCompleted === true && !placementRevealPending;

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
        <Stack.Protected
          guard={hasProfile && (user?.diagnosticCompleted === false || placementRevealPending)}
        >
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
        </Stack.Protected>
        <Stack.Screen name="settings/privacy" options={{ title: t('header.privacy') }} />
        <Stack.Screen name="settings/terms" options={{ title: t('header.terms') }} />
      </Stack>
    </>
  );
}

/** Bridges the authenticated user's UI language into the i18n provider. */
function LocalizedProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const styles = themedStyles(useTheme());
  const { language: guestLanguage, mirrorAccountLanguage } = useGuestLanguage();
  const accountLanguage = user?.uiLanguage;
  const renderedLanguage = accountLanguage ?? guestLanguage;
  useEffect(() => {
    if (accountLanguage) mirrorAccountLanguage(accountLanguage);
  }, [accountLanguage, mirrorAccountLanguage]);
  return (
    <I18nProvider accountLanguage={accountLanguage ?? null} guestLanguage={guestLanguage}>
      <View
        accessibilityLanguage={UI_ACCESSIBILITY_LANGUAGES[renderedLanguage]}
        style={styles.localizedRoot}
      >
        {children}
      </View>
    </I18nProvider>
  );
}

/** Keeps the native splash visible until the first rendered copy is localized. */
function LanguageBootstrapGate({ children }: { children: React.ReactNode }) {
  const { isRestoring } = useGuestLanguage();
  useEffect(() => {
    if (!isRestoring) void SplashScreen.hideAsync().catch(() => undefined);
  }, [isRestoring]);
  return isRestoring ? null : children;
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

function ClientUpgradeBridge() {
  const { token, resetStoredSession } = useAuth();
  return <ClientUpgradeModal onLocalSignOut={token ? resetStoredSession : undefined} />;
}

/**
 * Keeps the authenticated profile authoritative for the full signed-in
 * session. The entry gate only lives long enough to redirect; this bridge
 * remains mounted on Home, practice, history, recordings, and Settings and
 * refreshes after every native foreground transition without replacing the
 * current UI with a loading screen.
 */
export function ProfileRefreshBridge() {
  const {
    token,
    user,
    sessionVersion,
    isRestoring,
    restoreError,
    setUser,
    captureSessionLease,
    isSessionLeaseCurrent,
  } = useAuth();
  const queryClient = useQueryClient();
  const userRef = useRef(user);
  const completedFetchRef = useRef<{ profile: User; baseline: User | null } | null>(null);
  useLayoutEffect(() => {
    userRef.current = user;
  }, [user]);

  const sessionLease = useMemo(() => {
    // Identity fields intentionally drive recapture; ordinary profile edits do
    // not grant a stale request a new lease.
    void sessionVersion;
    void token;
    void user?.id;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, token, user?.id]);

  const profileQuery = useQuery({
    queryKey: ['me', sessionVersion],
    queryFn: async ({ signal }) => {
      const baseline = userRef.current;
      const profile = parseUserResponse(await apiFetch<unknown>('/auth/me', { signal })).user;
      completedFetchRef.current = { profile, baseline };
      return profile;
    },
    // This is the sole eager /auth/me observer. Gate passively observes the
    // same query so the bridge can survive its redirect and keep refreshing.
    enabled: !!token && !isRestoring && !restoreError,
    retry: false,
    refetchOnWindowFocus: 'always',
    structuralSharing: false,
  });

  useEffect(() => {
    const refreshed = profileQuery.data;
    if (!refreshed || refreshed === userRef.current) return;
    const completed = completedFetchRef.current;
    // A local PATCH that committed while this GET was in flight owns the newer
    // screen state. Skip this response and let the next focus refresh converge.
    if (
      completed?.profile === refreshed &&
      completed.baseline !== null &&
      userRef.current !== completed.baseline
    ) {
      return;
    }
    if (!isSessionLeaseCurrent(sessionLease)) return;
    const previous = userRef.current;
    if (previous?.nativeLanguage !== refreshed.nativeLanguage) {
      queryClient.removeQueries({ queryKey: ['question-help'] });
    }
    if (
      previous?.cefrLevel !== refreshed.cefrLevel ||
      previous?.diagnosticCompleted !== refreshed.diagnosticCompleted ||
      previous?.diagnosticAcknowledged !== refreshed.diagnosticAcknowledged
    ) {
      queryClient.removeQueries({ queryKey: ['diagnostic-next'] });
      queryClient.removeQueries({ queryKey: ['practice-question'] });
      void queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
    }
    userRef.current = refreshed;
    setUser(refreshed);
  }, [isSessionLeaseCurrent, profileQuery.data, queryClient, sessionLease, setUser]);

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
    <GuestLanguageProvider>
      <LanguageBootstrapGate>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <QueryFocusBridge />
            <NetworkStatusBridge />
            <AdsProvider>
              <AuthProvider>
                <ProfileRefreshBridge />
                <LocalizedProviders>
                  <ReminderLanguageBridge />
                  <PracticeFlowProvider>
                    <AssessmentReplayProvider>
                      <RootNavigator />
                    </AssessmentReplayProvider>
                  </PracticeFlowProvider>
                  <NetworkStatusBanner />
                  <ClientUpgradeBridge />
                </LocalizedProviders>
              </AuthProvider>
            </AdsProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </LanguageBootstrapGate>
    </GuestLanguageProvider>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  localizedRoot: {
    flex: 1,
  },
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
