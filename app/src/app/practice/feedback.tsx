import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/auth';
import { usePracticeFlow } from '../../lib/practice-flow';
import { colors, layout } from '../../lib/theme';

type Variant = 'passed' | 'retry' | 'final';

/**
 * Attempt feedback. Three variants driven by the in-memory attempt result:
 *  - passed: celebratory + Next Question
 *  - retry:  failed with attempts left + Try Again (same question)
 *  - final:  out of attempts, final feedback + Next Question
 */
export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { feedback, clearFeedback } = usePracticeFlow();
  const result = feedback?.result ?? null;

  if (!result) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>
          No result to show
        </Text>
        <Text style={styles.body}>Something went wrong displaying this feedback.</Text>
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

  const attemptsLeft = result.attemptsLeft ?? 0;
  const variant: Variant = result.passed ? 'passed' : attemptsLeft > 0 ? 'retry' : 'final';

  const goToNextQuestion = () => {
    if (!user) return;
    if (result.nextQuestion) {
      queryClient.setQueryData(['practice-question', user.id, user.cefrLevel], {
        question: result.nextQuestion,
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: ['practice-question', user.id, user.cefrLevel],
      });
    }
    clearFeedback();
    router.dismissTo('/practice');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        accessibilityLiveRegion="polite"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {variant === 'passed' && (
          <>
            <Text style={styles.emoji}>🎉</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.success }]}>
              Great job!
            </Text>
            <Text style={styles.subtitle}>You passed this question.</Text>
          </>
        )}

        {variant === 'retry' && (
          <>
            <Text style={styles.emoji}>💪</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
              Not quite — attempt {result.attemptNo} of 3
            </Text>
            <Text style={styles.subtitle}>
              {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left. Review the feedback
              and try again.
            </Text>
          </>
        )}

        {variant === 'final' && (
          <>
            <Text style={styles.emoji}>📘</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.danger }]}>
              Out of attempts
            </Text>
            <Text style={styles.subtitle}>
              Here&apos;s what to work on before the next question.
            </Text>
          </>
        )}

        <View style={styles.card}>
          <View style={styles.scoreRow}>
            <Text style={styles.cardLabel}>Score</Text>
            <Text style={styles.scoreValue}>{result.score}</Text>
          </View>

          {!!result.transcript && (
            <>
              <Text style={styles.cardLabel}>We heard</Text>
              <Text style={styles.transcript}>“{result.transcript}”</Text>
            </>
          )}

          <Text style={styles.cardLabel}>
            {variant === 'final' ? 'Final feedback' : 'Feedback'}
          </Text>
          <Text style={styles.body}>
            {variant === 'final' && result.finalFeedback ? result.finalFeedback : result.feedback}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {variant === 'retry' ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={goToNextQuestion}
          >
            <Text style={styles.primaryButtonText}>Next Question</Text>
          </Pressable>
        )}
      </View>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  emoji: {
    fontSize: 52,
    marginTop: 12,
  },
  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    marginTop: 24,
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 14,
  },
  transcript: {
    marginTop: 4,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 23,
    color: colors.text,
  },
  body: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
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
