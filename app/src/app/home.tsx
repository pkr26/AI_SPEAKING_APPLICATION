import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import Button from '../components/Button';
import HomeBannerAd from '../components/HomeBannerAd';
import { apiGetPracticeStats, userMessageForError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { usePracticeFlow } from '../lib/practice-flow';
import { createThemedStyles, useTheme } from '../lib/theme';
import { useHardwareBack } from '../lib/use-hardware-back';

/** Decorative art (streak flame); screen readers get the adjacent text. */
function DecorativeEmoji({ children, style }: { children: string; style: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      {children}
    </Text>
  );
}

/**
 * Post-diagnostic landing screen: mastery progress, streak, due-for-review
 * count, today's activity, and the session summary tallied while practicing.
 */
export default function HomeScreen() {
  const { user, setUser, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const focused = useIsFocused();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { sessionTally, resetSessionTally } = usePracticeFlow();
  const queryClient = useQueryClient();
  const sessionLease = useMemo(() => {
    // These values define when a new render belongs to a new session even
    // though the imperative capture function itself is referentially stable.
    void sessionVersion;
    void user?.id;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, user?.id]);
  // Fail closed until the focus lifecycle explicitly grants this mounted route
  // navigation ownership. A tap delivered before the passive focus effect runs
  // must not navigate from a screen that is already being replaced.
  const navigationStartedRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      navigationStartedRef.current = false;
      return () => {
        navigationStartedRef.current = true;
      };
    }, []),
  );
  const navigateOnce = useCallback(
    (destination: '/practice' | '/history' | '/recordings' | '/settings') => {
      if (navigationStartedRef.current || !isSessionLeaseCurrent(sessionLease)) return;
      navigationStartedRef.current = true;
      router.navigate(destination);
    },
    [isSessionLeaseCurrent, sessionLease],
  );

  const statsQuery = useQuery({
    queryKey: ['practice-stats', user?.id],
    queryFn: async ({ signal }) => apiGetPracticeStats(signal),
    enabled: !!user,
    retry: false,
  });
  const stats = statsQuery.data;

  // `/practice/stats` is deliberately available before placement and returns
  // `level: null` only for that all-zero state. If another device restarts the
  // diagnostic while this Home screen is open, the in-memory profile remains
  // temporarily stale and would otherwise keep this learner on a broken
  // practice route. Adopt the authoritative state and retire caches whose
  // level/question identity is no longer valid.
  useEffect(() => {
    if (
      !user?.diagnosticCompleted ||
      stats?.level !== null ||
      !isSessionLeaseCurrent(sessionLease)
    ) {
      return;
    }
    queryClient.removeQueries({ queryKey: ['diagnostic-next'] });
    queryClient.removeQueries({ queryKey: ['practice-question'] });
    setUser((current) =>
      current?.id === user.id
        ? { ...current, diagnosticCompleted: false, cefrLevel: null }
        : current,
    );
  }, [isSessionLeaseCurrent, queryClient, sessionLease, setUser, stats?.level, user]);

  // Home is the root of the signed-in stack: while the entry gate is still
  // beneath it, Android hardware back must not pop back onto the gate (which
  // would immediately redirect here). With nothing left to pop the press falls
  // through instead of being swallowed, so Android's own "back at the task root
  // leaves the app" behavior still works.
  useHardwareBack(() => router.canGoBack());

  // The route gate redirects after logout/session expiry.
  if (!user) return null;

  // Do not leave a tappable Practice CTA in the one render before the effect
  // above updates the route gate for a cross-device diagnostic reset.
  if (user.diagnosticCompleted && stats?.level === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          accessibilityLabel={t('gate.loadingProfile')}
          size="large"
          color={theme.colors.primary}
        />
        <Text accessibilityLiveRegion="polite" style={styles.muted}>
          {t('gate.loadingProfile')}
        </Text>
      </View>
    );
  }

  const level = stats?.level ?? user.cefrLevel;
  const practicedTodayLine = !stats
    ? null
    : stats.practicedToday === 0
      ? t('home.practicedNoneToday')
      : stats.practicedToday === 1
        ? t('home.practicedOnceToday')
        : t('home.practicedToday', { count: stats.practicedToday });
  const streakLine = !stats
    ? null
    : stats.streakDays === 0
      ? t('home.streakNone')
      : stats.streakDays === 1
        ? t('home.streakOne')
        : t('home.streakMany', { count: stats.streakDays });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>{t('practice.greeting', { name: user.name })}</Text>

      {sessionTally.attempts > 0 && (
        <View style={styles.summaryCard}>
          <Text accessibilityRole="header" style={styles.summaryTitle}>
            {t('summary.title')}
          </Text>
          <Text style={styles.summaryLine}>
            {t('summary.attempts', { count: sessionTally.attempts })}
          </Text>
          <Text style={styles.summaryLine}>
            {t('summary.passed', { count: sessionTally.passed })}
          </Text>
          <Text style={styles.summaryLine}>
            {t('summary.mastered', { count: sessionTally.mastered })}
          </Text>
          {sessionTally.levelUps > 0 && (
            <Text style={styles.summaryLine}>
              {t('summary.levelUps', { count: sessionTally.levelUps })}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.summaryDismiss, pressed && styles.summaryDismissed]}
            onPress={resetSessionTally}
          >
            <Text style={styles.summaryDismissText}>{t('summary.dismiss')}</Text>
          </Pressable>
        </View>
      )}

      {!stats && statsQuery.isPending && (
        <View style={styles.center}>
          <ActivityIndicator
            accessibilityLabel={t('home.loading')}
            size="large"
            color={theme.colors.primary}
          />
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {t('home.loading')}
          </Text>
        </View>
      )}

      {!stats && statsQuery.isError && (
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            {t('home.loadFailedTitle')}
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(statsQuery.error, t('home.loadFailed'))}
          </Text>
          <Button
            title={t('common.tryAgain')}
            fullWidth
            onPress={() => void statsQuery.refetch({ cancelRefetch: false })}
            style={styles.primaryAction}
          />
        </View>
      )}

      {stats && (
        <View style={styles.card}>
          <View style={styles.levelRow}>
            <View>
              <Text style={styles.cardLabel}>{t('home.levelLabel')}</Text>
              {level && (
                <>
                  <Text style={styles.levelText}>{level}</Text>
                  <Text style={styles.levelExplain}>{t(`cefr.${level}`)}</Text>
                </>
              )}
            </View>
            {stats.progress.dueCount > 0 && (
              <View style={styles.dueChip}>
                <Text style={styles.dueChipText}>
                  {t('home.dueChip', { count: stats.progress.dueCount })}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.cardLabel}>{t('home.masteryLabel')}</Text>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={t('home.masteryLabel')}
            accessibilityValue={{
              min: 0,
              max: stats.progress.totalAtLevel,
              now: stats.progress.masteredCount,
            }}
            style={styles.masteryTrack}
          >
            <View
              style={[
                styles.masteryFill,
                {
                  // totalAtLevel is 0 only on the pre-placement snapshot, which
                  // normal routing never renders here; divide defensively anyway.
                  width: `${
                    stats.progress.totalAtLevel > 0
                      ? Math.min(
                          100,
                          Math.round(
                            (stats.progress.masteredCount / stats.progress.totalAtLevel) * 100,
                          ),
                        )
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.masteryLine}>
            {t('practice.progressLine', {
              mastered: stats.progress.masteredCount,
              total: stats.progress.totalAtLevel,
            })}
            {stats.progress.learningCount > 0
              ? t('practice.progressLearning', { count: stats.progress.learningCount })
              : ''}
          </Text>

          <View style={styles.streakRow}>
            <DecorativeEmoji style={styles.streakEmoji}>🔥</DecorativeEmoji>
            <Text style={styles.streakText}>{streakLine}</Text>
          </View>
          <Text style={styles.todayLine}>{practicedTodayLine}</Text>
          {stats.progress.dueCount === 0 && (
            <Text style={styles.todayLine}>{t('home.dueNone')}</Text>
          )}
        </View>
      )}

      <Button
        title={t('home.startPractice')}
        fullWidth
        onPress={() => navigateOnce('/practice')}
        style={styles.primaryAction}
      />

      <View style={styles.linkRow}>
        <Button
          title={t('header.history')}
          variant="quiet"
          size="sm"
          onPress={() => navigateOnce('/history')}
        />
        <Button
          title={t('header.recordings')}
          variant="quiet"
          size="sm"
          onPress={() => navigateOnce('/recordings')}
        />
        <Button
          title={t('header.settings')}
          variant="quiet"
          size="sm"
          onPress={() => navigateOnce('/settings')}
        />
      </View>
      <HomeBannerAd focused={focused} />
    </ScrollView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  container: {
    flexGrow: 1,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 15,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  muted: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  summaryCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  summaryLine: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  summaryDismiss: {
    marginTop: spacing.md,
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.success,
  },
  summaryDismissed: {
    backgroundColor: colors.card,
  },
  summaryDismissText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: layout.screenPadding,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
  },
  levelText: {
    marginTop: spacing.xs,
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  levelExplain: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  dueChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: spacing.md,
  },
  dueChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  masteryTrack: {
    marginTop: spacing.sm,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  masteryFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.success,
  },
  masteryLine: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  streakRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakEmoji: {
    fontSize: 22,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  todayLine: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.muted,
  },
  primaryAction: {
    marginTop: spacing.xl,
  },
  linkRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xl,
  },
}));
