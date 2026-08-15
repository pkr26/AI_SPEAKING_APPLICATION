import React from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import { apiFetch, userMessageForError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { firstParam, isUuid } from '../../lib/params';
import { createThemedStyles, useTheme } from '../../lib/theme';
import { parseHelpContent, type NativeLanguage } from '../../lib/types';

const NATIVE_ACCESSIBILITY_LANGUAGES: Record<NativeLanguage, string> = {
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

export default function HelpScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const params = useLocalSearchParams<{ questionId?: string }>();
  const questionId = firstParam(params.questionId);
  const validQuestionId = isUuid(questionId) ? questionId : null;

  const helpQuery = useQuery({
    queryKey: ['question-help', user?.id, user?.nativeLanguage, validQuestionId],
    queryFn: async ({ signal }) =>
      parseHelpContent(
        await apiFetch<unknown>(`/practice/question/${encodeURIComponent(validQuestionId!)}/help`, {
          signal,
        }),
      ),
    enabled: !!user && !!validQuestionId,
    retry: false,
    // Help content only changes when the server re-seeds.
    staleTime: 60 * 60_000,
  });

  const help = helpQuery.data;

  // The protected-route gate owns navigation when the session disappears.
  // Keep the disabled query from presenting an endless loading state.
  if (!user) return null;
  const nativeAccessibilityLanguage = NATIVE_ACCESSIBILITY_LANGUAGES[user.nativeLanguage];

  if (!validQuestionId) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          {t('help.invalidLinkTitle')}
        </Text>
        <Text style={styles.muted}>{t('help.invalidLinkBody')}</Text>
        <Button
          title={t('common.backToPractice')}
          onPress={() => router.replace('/practice')}
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {helpQuery.isPending && (
        <View style={styles.center}>
          <ActivityIndicator
            accessibilityLabel={t('help.loading')}
            size="large"
            color={theme.colors.primary}
          />
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {t('help.loading')}
          </Text>
        </View>
      )}

      {helpQuery.isError && (
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            {t('help.loadFailedTitle')}
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(helpQuery.error, t('help.loadFailed'))}
          </Text>
          <Button
            title={t('common.tryAgain')}
            onPress={() => void helpQuery.refetch()}
            style={styles.retryButton}
          />
        </View>
      )}

      {help && (
        <>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('label.word')}</Text>
              <Text style={styles.promptWord}>{help.promptWord}</Text>
              <Text accessibilityLanguage={nativeAccessibilityLanguage} style={styles.nativeText}>
                {help.promptWordNative}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t('label.question')}</Text>
              <Text style={styles.englishText}>{help.questionText}</Text>
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
                  <Text style={styles.englishText}>{example.en}</Text>
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
            <Button
              title={t('help.startPractice')}
              onPress={() =>
                router.push({
                  pathname: '/practice/attempt',
                  params: {
                    questionId: validQuestionId,
                  },
                })
              }
            />
          </View>
        </>
      )}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
    marginBottom: 14,
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
    fontSize: 28,
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
}));
