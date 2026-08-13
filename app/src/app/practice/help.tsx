import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { apiFetch, userMessageForError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { firstParam, isUuid } from '../../lib/params';
import { colors, layout } from '../../lib/theme';
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
          Invalid question link
        </Text>
        <Text style={styles.muted}>
          Return to practice and open help from the current question.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={() => router.replace('/practice')}
        >
          <Text style={styles.primaryButtonText}>Back to Practice</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {helpQuery.isPending && (
        <View style={styles.center}>
          <ActivityIndicator
            accessibilityLabel="Loading help"
            size="large"
            color={colors.primary}
          />
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            Loading help…
          </Text>
        </View>
      )}

      {helpQuery.isError && (
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            Couldn&apos;t load help
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(
              helpQuery.error,
              'Could not load help for this question. Please try again.',
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => void helpQuery.refetch()}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {help && (
        <>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
          >
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Word</Text>
              <Text style={styles.promptWord}>{help.promptWord}</Text>
              <Text accessibilityLanguage={nativeAccessibilityLanguage} style={styles.nativeText}>
                {help.promptWordNative}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Question</Text>
              <Text style={styles.englishText}>{help.questionText}</Text>
              <Text accessibilityLanguage={nativeAccessibilityLanguage} style={styles.nativeText}>
                {help.questionTextNative}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Example sentences</Text>
              {help.examples.map((example, index) => (
                <View key={index} style={styles.exampleCard}>
                  <Text style={styles.exampleNumber}>Example {index + 1}</Text>
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
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/practice/attempt',
                  params: {
                    questionId: validQuestionId,
                  },
                })
              }
            >
              <Text style={styles.primaryButtonText}>Start Practice</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  muted: {
    marginTop: 12,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
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
    marginBottom: 8,
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
    paddingTop: 12,
    marginTop: 12,
  },
  exampleNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  bottomBar: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
