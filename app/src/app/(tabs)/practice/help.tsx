import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../../components/Button';
import DataRefreshNotice from '../../../components/DataRefreshNotice';
import OfflineState from '../../../components/OfflineState';
import { apiFetch, userMessageForError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { NATIVE_LANGUAGE_LOCALES } from '../../../lib/language-options';
import { firstParam, isUuid } from '../../../lib/params';
import { createThemedStyles, useTheme } from '../../../lib/theme';
import { parseHelpContent } from '../../../lib/types';

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const { user, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const sessionLease = React.useMemo(() => {
    void sessionVersion;
    void user?.id;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, user?.id]);
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const params = useLocalSearchParams<{
    questionId?: string;
    cycleId?: string;
    attemptsUsed?: string;
  }>();
  const questionId = firstParam(params.questionId);
  const cycleId = firstParam(params.cycleId);
  const attemptsUsedParam = firstParam(params.attemptsUsed);
  const validQuestionId = isUuid(questionId) ? questionId : null;
  const validCycleId = isUuid(cycleId) ? cycleId : null;
  const attemptsUsed =
    attemptsUsedParam !== undefined && /^[0-2]$/.test(attemptsUsedParam)
      ? Number(attemptsUsedParam)
      : null;
  const validLink = !!validQuestionId && !!validCycleId && attemptsUsed !== null;

  const helpQuery = useQuery({
    queryKey: ['question-help', user?.id, user?.nativeLanguage, validQuestionId],
    queryFn: async ({ signal }) =>
      parseHelpContent(
        await apiFetch<unknown>(`/practice/question/${encodeURIComponent(validQuestionId!)}/help`, {
          signal,
        }),
      ),
    enabled: !!user && validLink,
    retry: false,
    // Help content only changes when the server re-seeds.
    staleTime: 60 * 60_000,
  });

  const help = helpQuery.data;

  // The protected-route gate owns navigation when the session disappears.
  // Keep the disabled query from presenting an endless loading state.
  if (!user) return null;
  const nativeAccessibilityLanguage = NATIVE_LANGUAGE_LOCALES[user.nativeLanguage];

  if (!validLink) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          {t('help.invalidLinkTitle')}
        </Text>
        <Text style={styles.muted}>{t('help.invalidLinkBody')}</Text>
        <Button
          title={t('common.backToPractice')}
          onPress={() => router.dismissTo('/practice')}
          style={styles.retryButton}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {!help && helpQuery.isPending && (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.stateScroll}
          contentContainerStyle={styles.center}
        >
          {helpQuery.fetchStatus === 'paused' ? (
            <OfflineState />
          ) : (
            <>
              <ActivityIndicator
                accessibilityLabel={t('help.loading')}
                size="large"
                color={theme.colors.primary}
              />
              <Text accessibilityLiveRegion="polite" style={styles.muted}>
                {t('help.loading')}
              </Text>
            </>
          )}
        </ScrollView>
      )}

      {/* Practice Mode observes this same query key, so the shared cache can
          go stale and a background refetch can fail while this screen still
          holds content. Offer the retry card only when there is nothing to
          show, or it stacks on top of the help the learner is reading. */}
      {!help && helpQuery.isError && (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.stateScroll}
          contentContainerStyle={styles.center}
        >
          <Text accessibilityRole="header" style={styles.errorTitle}>
            {t('help.loadFailedTitle')}
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(helpQuery.error, t('help.loadFailed'))}
          </Text>
          <Button
            title={t('common.tryAgain')}
            fullWidth
            onPress={() => void helpQuery.refetch({ cancelRefetch: false })}
            style={styles.retryButton}
          />
        </ScrollView>
      )}

      {help && (
        <>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={helpQuery.isRefetching}
                onRefresh={() => {
                  if (isSessionLeaseCurrent(sessionLease)) {
                    void helpQuery.refetch({ cancelRefetch: false });
                  }
                }}
                tintColor={theme.colors.primary}
              />
            }
          >
            <DataRefreshNotice
              updating={helpQuery.isRefetching && !helpQuery.isRefetchError}
              failed={helpQuery.isRefetchError}
              onRetry={() => void helpQuery.refetch({ cancelRefetch: false })}
            />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('label.word')}</Text>
              <Text accessibilityLanguage="en-US" style={styles.promptWord}>
                {help.promptWord}
              </Text>
              <Text accessibilityLanguage={nativeAccessibilityLanguage} style={styles.nativeText}>
                {help.promptWordNative}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('label.question')}</Text>
              <Text accessibilityLanguage="en-US" style={styles.englishText}>
                {help.questionText}
              </Text>
              <Text accessibilityLanguage={nativeAccessibilityLanguage} style={styles.nativeText}>
                {help.questionTextNative}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('help.examplesLabel')}</Text>
              {help.examples.map((example, index) => (
                <View key={index} style={styles.exampleCard}>
                  <Text style={styles.exampleNumber}>
                    {t('help.exampleNumber', { number: index + 1 })}
                  </Text>
                  <Text accessibilityLanguage="en-US" style={styles.englishText}>
                    {example.en}
                  </Text>
                  <Text
                    accessibilityLanguage={nativeAccessibilityLanguage}
                    style={styles.nativeText}
                  >
                    {example.native}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.bottomBarContent}>
              <Button
                title={t('help.startPractice')}
                onPress={() => router.dismissTo('/practice')}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing, type }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  stateScroll: {
    flex: 1,
  },
  content: {
    padding: layout.screenPadding,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
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
  retryButton: {
    marginTop: spacing.lg,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  promptWord: {
    fontSize: type.headline.fontSize,
    fontWeight: '800',
    color: colors.primary,
  },
  englishText: {
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
  },
  nativeText: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 23,
    color: colors.muted,
  },
  exampleCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  exampleNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  bottomBar: {
    padding: spacing.ml,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomBarContent: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
}));
