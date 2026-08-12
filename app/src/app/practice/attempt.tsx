import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Recorder from '../../components/Recorder';
import { apiFetch, userMessageForError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { firstParam, isUuid } from '../../lib/params';
import { usePracticeFlow } from '../../lib/practice-flow';
import { colors, layout } from '../../lib/theme';
import { parseAttemptResult, parseHelpContent, type AttemptResult } from '../../lib/types';

/**
 * Practice Mode: deliberately minimal — only the prompt word, the question,
 * and the record button. No help, translations, or examples here.
 */
export default function AttemptScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showFeedback } = usePracticeFlow();
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
  });

  const promptWord = helpQuery.data?.promptWord;
  const questionText = helpQuery.data?.questionText;

  const handleResult = (result: AttemptResult) => {
    if (!validQuestionId) return;
    showFeedback(validQuestionId, result);
    router.push('/practice/feedback');
  };

  const handleError = (message: string) => {
    Alert.alert('Could not assess your answer', message);
  };

  if (!validQuestionId) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          Invalid question link
        </Text>
        <Text style={styles.muted}>
          Return to practice and choose Practice Mode from the current question.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={() => router.replace('/practice')}
        >
          <Text style={styles.retryButtonText}>Back to Practice</Text>
        </Pressable>
      </View>
    );
  }

  if (!promptWord || !questionText) {
    if (helpQuery.isPending) {
      return (
        <View style={styles.center}>
          <ActivityIndicator
            accessibilityLabel="Loading question"
            size="large"
            color={colors.primary}
          />
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            Loading question…
          </Text>
        </View>
      );
    }
    if (helpQuery.isError) {
      return (
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            Couldn&apos;t load the question
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(
              helpQuery.error,
              'Could not load this practice question. Please try again.',
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            onPress={() => void helpQuery.refetch()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.promptWord}>
          {promptWord}
        </Text>
        <Text style={styles.questionText}>{questionText}</Text>
      </View>

      <View style={styles.recorderArea}>
        <Recorder
          ownerId={user!.id}
          questionId={validQuestionId}
          endpoint="/practice/attempt"
          parseResult={parseAttemptResult}
          onResult={handleResult}
          onError={handleError}
          onRecoveryUnresolved={() => {
            void queryClient.invalidateQueries({
              queryKey: ['practice-question', user?.id, user?.cefrLevel],
            });
            router.replace('/practice');
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
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
  retryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  retryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptWord: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  questionText: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
  },
  recorderArea: {
    flex: 1,
    justifyContent: 'center',
  },
});
