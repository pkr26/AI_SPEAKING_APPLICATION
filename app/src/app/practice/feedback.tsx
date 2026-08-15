import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/auth';
import { usePracticeFlow } from '../../lib/practice-flow';
import { colors, layout } from '../../lib/theme';
import { isNativeOutcome, type NativeLanguage } from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

type Variant =
  'native' | 'native-nospeech' | 'nospeech' | 'mastered' | 'passed' | 'retry' | 'final';

const NATIVE_ACCESSIBILITY_LANGUAGES: Record<NativeLanguage, string> = {
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

/**
 * Attempt feedback. Variants driven by the in-memory outcome:
 *  - native:   mother-tongue answer — comprehension result + model English answer
 *  - nospeech: silence — free retry, links to help and native mode
 *  - mastered: passed at >= 75 — word mastered
 *  - passed:   passed below mastery — word returns in revision
 *  - retry:    failed with attempts left + Try Again (same question)
 *  - final:    out of attempts, final feedback + Next Question
 */
export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { feedback, clearFeedback, setAnswerMode } = usePracticeFlow();
  const result = feedback?.result ?? null;
  const questionId = feedback?.questionId ?? null;

  const variant: Variant | null = !result
    ? null
    : isNativeOutcome(result)
      ? result.transcript === ''
        ? 'native-nospeech'
        : 'native'
      : result.noSpeech
        ? 'nospeech'
        : result.passed
          ? result.mastered
            ? 'mastered'
            : 'passed'
          : (result.attemptsLeft ?? 0) > 0
            ? 'retry'
            : 'final';

  const backToPractice = () => {
    clearFeedback();
    router.dismissTo('/practice');
  };

  const tryInEnglish = () => {
    setAnswerMode('english');
    backToPractice();
  };

  const retry = () => {
    clearFeedback();
    router.back();
  };

  const goToNextQuestion = () => {
    if (!user || !result) return;
    if (!isNativeOutcome(result) && result.next) {
      queryClient.setQueryData(['practice-question', user.id, user.cefrLevel], result.next);
    } else {
      void queryClient.invalidateQueries({
        queryKey: ['practice-question', user.id, user.cefrLevel],
      });
    }
    clearFeedback();
    router.dismissTo('/practice');
  };

  const openHelp = () => {
    if (!questionId) return;
    clearFeedback();
    router.dismissTo('/practice');
    router.push({ pathname: '/practice/help', params: { questionId } });
  };

  // Android hardware back would pop this screen without advancing the cached
  // question, re-issuing the last assessed question. Route it through the
  // same handler as each variant's primary on-screen action.
  useHardwareBack(() => {
    if (variant === 'retry' || variant === 'nospeech') {
      retry();
    } else if (variant === 'native') {
      tryInEnglish();
    } else if (variant === 'native-nospeech') {
      backToPractice();
    } else if (variant) {
      goToNextQuestion();
    } else {
      router.replace('/practice');
    }
    return true;
  });

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

  return (
    <View style={styles.container}>
      <ScrollView
        accessibilityLiveRegion="polite"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {variant === 'native' && isNativeOutcome(result) && (
          <>
            <Text style={styles.emoji}>{result.understood ? '🌏' : '🧩'}</Text>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: result.understood ? colors.success : colors.warning }]}
            >
              {result.understood ? 'You understood the question!' : 'Not quite on topic'}
            </Text>
            <Text style={styles.subtitle}>
              {result.understood
                ? 'Your answer made sense. Now try saying it in English!'
                : 'Your answer missed the question. Check the example and try again.'}
            </Text>
          </>
        )}

        {variant === 'native-nospeech' && (
          <>
            <Text style={styles.emoji}>🎤</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
              We couldn&apos;t hear you
            </Text>
            <Text style={styles.subtitle}>
              Your English practice progress was not changed. Speak clearly and try again in your
              language.
            </Text>
          </>
        )}

        {variant === 'nospeech' && (
          <>
            <Text style={styles.emoji}>🎤</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
              We couldn&apos;t hear you
            </Text>
            <Text style={styles.subtitle}>
              Don&apos;t worry — this didn&apos;t count as an attempt. Tap the record button, speak
              clearly, then tap it again to stop — or get help first.
            </Text>
          </>
        )}

        {variant === 'mastered' && (
          <>
            <Text style={styles.emoji}>🏆</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.success }]}>
              Word mastered!
            </Text>
            <Text style={styles.subtitle}>You scored 75 or above — this word is yours.</Text>
          </>
        )}

        {variant === 'passed' && (
          <>
            <Text style={styles.emoji}>🎉</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.success }]}>
              Great job!
            </Text>
            <Text style={styles.subtitle}>
              You passed! A score of 75 or above masters a word that is still in learning.
            </Text>
          </>
        )}

        {variant === 'retry' && !isNativeOutcome(result) && (
          <>
            <Text style={styles.emoji}>💪</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
              Not quite — attempt {result.attemptNo} of 3
            </Text>
            <Text style={styles.subtitle}>
              {result.attemptsLeft} {result.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.
              Review the feedback and try again.
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
              Here&apos;s what to work on. You&apos;ll see this word again in future practice.
            </Text>
          </>
        )}

        <View style={styles.card}>
          {!isNativeOutcome(result) && variant !== 'nospeech' && (
            <View style={styles.scoreRow}>
              <Text style={styles.cardLabel}>Score</Text>
              <Text style={styles.scoreValue}>{result.score}</Text>
            </View>
          )}

          {!!result.transcript && (
            <>
              <Text style={styles.cardLabel}>We heard</Text>
              <Text
                accessibilityLanguage={
                  isNativeOutcome(result) && user
                    ? NATIVE_ACCESSIBILITY_LANGUAGES[user.nativeLanguage]
                    : 'en-US'
                }
                style={styles.transcript}
              >
                “{result.transcript}”
              </Text>
            </>
          )}

          <Text style={styles.cardLabel}>
            {variant === 'final' ? 'Final feedback' : 'Feedback'}
          </Text>
          <Text style={styles.body}>
            {variant === 'final' && !isNativeOutcome(result) && result.finalFeedback
              ? result.finalFeedback
              : result.feedback}
          </Text>

          {variant === 'native' && isNativeOutcome(result) && !!result.modelAnswer && (
            <>
              <Text style={styles.cardLabel}>Say it in English</Text>
              <Text style={styles.modelAnswer}>{result.modelAnswer}</Text>
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {variant === 'retry' && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={retry}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        )}

        {(variant === 'mastered' || variant === 'passed' || variant === 'final') && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={goToNextQuestion}
          >
            <Text style={styles.primaryButtonText}>Next Question</Text>
          </Pressable>
        )}

        {variant === 'native' && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={tryInEnglish}
          >
            <Text style={styles.primaryButtonText}>Try in English</Text>
          </Pressable>
        )}

        {variant === 'native-nospeech' && (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={backToPractice}
          >
            <Text style={styles.primaryButtonText}>Try Again in My Language</Text>
          </Pressable>
        )}

        {variant === 'nospeech' && (
          <View style={styles.buttonColumn}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={retry}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
              onPress={openHelp}
            >
              <Text style={styles.secondaryButtonText}>See translation &amp; examples</Text>
            </Pressable>
          </View>
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
  modelAnswer: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 24,
    color: colors.primary,
    fontWeight: '600',
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
  buttonColumn: {
    gap: 10,
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
  secondaryButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.primaryLight,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
