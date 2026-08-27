import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Button from '../../components/Button';
import RecordingPlayback from '../../components/RecordingPlayback';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { usePracticeFlow } from '../../lib/practice-flow';
import { createThemedStyles, useTheme } from '../../lib/theme';
import {
  isNativeOutcome,
  PRACTICE_MASTER_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_PASS_SCORE,
  type NativeLanguage,
  type PracticeOutcome,
} from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

type Variant =
  'native' | 'native-nospeech' | 'nospeech' | 'levelup' | 'mastered' | 'passed' | 'retry' | 'final';

interface FeedbackCard {
  questionId: string;
  result: PracticeOutcome;
}

const NATIVE_ACCESSIBILITY_LANGUAGES: Record<NativeLanguage, string> = {
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

/** Celebration art only; screen readers get the adjacent title instead. */
function DecorativeEmoji({ children, style }: { children: string; style: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={style}>
      {children}
    </Text>
  );
}

/**
 * Attempt feedback. Variants driven by the in-memory outcome:
 *  - native:   mother-tongue answer — comprehension result + model English answer
 *  - nospeech: silence — free retry, links to help and native mode
 *  - levelup:  a mastering pass that also promoted the CEFR level
 *  - mastered: passed at >= 75 — word mastered
 *  - passed:   passed below mastery — word returns in revision
 *  - retry:    failed with attempts left + Try Again (same question)
 *  - final:    out of attempts, final feedback + Next Question
 */
export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const { colors } = theme;
  const queryClient = useQueryClient();
  const { feedback, clearFeedback, setAnswerMode } = usePracticeFlow();
  // Every exit clears the flow state before the router finishes popping this
  // screen. Latch the outcome so the card slides away as itself instead of
  // flipping to the no-result state for the whole transition; a freshly
  // submitted outcome replaces the latched one.
  const [card, setCard] = useState<FeedbackCard | null>(() => {
    if (!feedback) return null;
    return { questionId: feedback.questionId, result: feedback.result };
  });
  if (feedback && (feedback.questionId !== card?.questionId || feedback.result !== card?.result)) {
    setCard({ questionId: feedback.questionId, result: feedback.result });
  }
  const result = card?.result ?? null;
  const questionId = card?.questionId ?? null;
  const sessionLease = useMemo(() => {
    void sessionVersion;
    void user?.id;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, user?.id]);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const activeCardRef = useRef<FeedbackCard | null>(card);
  const actedCardRef = useRef<FeedbackCard | null>(null);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
      activeCardRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    activeCardRef.current = card;
  }, [card]);

  useFocusEffect(
    React.useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
      };
    }, []),
  );

  let variant: Variant | null = null;
  if (result) {
    variant = isNativeOutcome(result)
      ? result.transcript === ''
        ? 'native-nospeech'
        : 'native'
      : result.noSpeech
        ? 'nospeech'
        : result.passed
          ? result.levelUp
            ? 'levelup'
            : result.mastered
              ? 'mastered'
              : 'passed'
          : (result.attemptsLeft ?? 0) > 0
            ? 'retry'
            : 'final';
  }

  // Mastery (and the level-up it can earn) deserves a physical cheer; haptics
  // are best effort (web/simulator).
  useEffect(() => {
    if (variant !== 'mastered' && variant !== 'levelup') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [result, variant]);

  // Every scored English attempt changes the home stats and the history list.
  // Both queries stay mounted beneath this stack, so invalidating here means
  // they are fresh again by the time the learner returns to them.
  const scoredAttempt = !!result && !isNativeOutcome(result) && !result.noSpeech;
  useEffect(() => {
    if (!scoredAttempt) return;
    void queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['practice-history'] });
  }, [queryClient, result, scoredAttempt]);

  /** One navigation per feedback card: a double-tap on Try Again or Next
   * Question must not pop or advance the practice stack twice. */
  const runOnce = (expectedCard: FeedbackCard | null, action: () => void) => {
    if (
      !expectedCard ||
      !mountedRef.current ||
      !focusedRef.current ||
      activeCardRef.current !== expectedCard ||
      actedCardRef.current === expectedCard ||
      !isSessionLeaseCurrent(sessionLease)
    ) {
      return;
    }
    actedCardRef.current = expectedCard;
    action();
  };

  const backToPractice = () =>
    runOnce(card, () => {
      clearFeedback();
      router.dismissTo('/practice');
    });

  const tryInEnglish = () =>
    runOnce(card, () => {
      setAnswerMode('english');
      clearFeedback();
      router.dismissTo('/practice');
    });

  const retry = () =>
    runOnce(card, () => {
      clearFeedback();
      router.back();
    });

  const goToNextQuestion = () => {
    if (!user || !result) return;
    runOnce(card, () => {
      const currentQuestionKey = ['practice-question', user.id, user.cefrLevel] as const;
      void queryClient.cancelQueries({ queryKey: currentQuestionKey, exact: true });
      if (!isNativeOutcome(result) && result.levelUp && result.next) {
        const nextLevel = result.levelUp.to;
        // The promotion response already carries the next question and
        // progress from the NEW level: adopt the level locally first so the
        // practice screen's cache key and level badge match what it renders.
        queryClient.setQueryData(['practice-question', user.id, nextLevel], result.next);
        setUser((current) =>
          current?.id === user.id ? { ...current, cefrLevel: nextLevel } : current,
        );
        void queryClient.invalidateQueries({ queryKey: ['me'] });
      } else if (!isNativeOutcome(result) && result.next) {
        queryClient.setQueryData(currentQuestionKey, result.next);
      } else {
        void queryClient.invalidateQueries({
          queryKey: currentQuestionKey,
        });
      }
      clearFeedback();
      router.dismissTo('/practice');
    });
  };

  const openHelp = () => {
    if (!questionId) return;
    runOnce(card, () => {
      clearFeedback();
      router.dismissTo('/practice');
      router.push({ pathname: '/practice/help', params: { questionId } });
    });
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
          {t('feedback.noResultTitle')}
        </Text>
        <Text style={styles.body}>{t('feedback.noResultBody')}</Text>
        <Button
          title={t('common.backToPractice')}
          fullWidth
          onPress={() => router.replace('/practice')}
          style={styles.noResultButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {/* Only the outcome headline and score announce themselves; the rest
            of the card is reachable without being read out all at once. */}
        <View accessibilityLiveRegion="polite" style={styles.liveHeader}>
          {variant === 'native' && isNativeOutcome(result) && (
            <>
              <DecorativeEmoji style={styles.emoji}>
                {result.understood ? '🌏' : '🧩'}
              </DecorativeEmoji>
              <Text
                accessibilityRole="header"
                style={[
                  styles.title,
                  { color: result.understood ? colors.success : colors.warning },
                ]}
              >
                {result.understood
                  ? t('feedback.nativeUnderstoodTitle')
                  : t('feedback.nativeMissedTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {result.understood
                  ? t('feedback.nativeUnderstoodBody')
                  : t('feedback.nativeMissedBody')}
              </Text>
            </>
          )}

          {variant === 'native-nospeech' && (
            <>
              <DecorativeEmoji style={styles.emoji}>🎤</DecorativeEmoji>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
                {t('feedback.noSpeechTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('feedback.nativeNoSpeechBody')}</Text>
            </>
          )}

          {variant === 'nospeech' && (
            <>
              <DecorativeEmoji style={styles.emoji}>🎤</DecorativeEmoji>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
                {t('feedback.noSpeechTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('feedback.noSpeechBody')}</Text>
            </>
          )}

          {variant === 'levelup' && !isNativeOutcome(result) && result.levelUp && (
            <>
              <DecorativeEmoji style={styles.emoji}>🚀</DecorativeEmoji>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.success }]}>
                {t('levelUp.title')}
              </Text>
              <Text style={styles.levelUpBody}>
                {t('levelUp.body', { level: result.levelUp.to })}
              </Text>
              <Text style={styles.subtitle}>
                {t('levelUp.progress', {
                  from: result.levelUp.from,
                  to: result.levelUp.to,
                })}
              </Text>
              <Text style={styles.subtitle}>{t(`cefr.${result.levelUp.to}`)}</Text>
            </>
          )}

          {variant === 'mastered' && (
            <>
              <DecorativeEmoji style={styles.emoji}>🏆</DecorativeEmoji>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.success }]}>
                {t('feedback.masteredTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {t('feedback.masteredBody', { score: PRACTICE_MASTER_SCORE })}
              </Text>
            </>
          )}

          {variant === 'passed' && (
            <>
              <DecorativeEmoji style={styles.emoji}>🎉</DecorativeEmoji>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.success }]}>
                {t('feedback.passedTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {t('feedback.passedBody', { score: PRACTICE_MASTER_SCORE })}
              </Text>
            </>
          )}

          {variant === 'retry' && !isNativeOutcome(result) && (
            <>
              <DecorativeEmoji style={styles.emoji}>💪</DecorativeEmoji>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
                {t('feedback.retryTitle', {
                  // The practice-screen attempt chip counts the UPCOMING try
                  // (max + 1 - attemptsLeft); name the same referent here so
                  // both surfaces agree on which "try N of 3" they mean. In
                  // the retry variant attemptsLeft ≥ 1, so attemptNo + 1 ≤ max.
                  attempt: result.attemptNo + 1,
                  max: PRACTICE_MAX_ATTEMPTS,
                })}
              </Text>
              <Text style={styles.subtitle}>
                {result.attemptsLeft === 1
                  ? t('feedback.retryBodyOne')
                  : t('feedback.retryBodyMany', { count: result.attemptsLeft ?? 0 })}
              </Text>
            </>
          )}

          {variant === 'final' && (
            <>
              <DecorativeEmoji style={styles.emoji}>📘</DecorativeEmoji>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.danger }]}>
                {t('feedback.finalTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('feedback.finalBody')}</Text>
            </>
          )}

          {!isNativeOutcome(result) && variant !== 'nospeech' && (
            <>
              <Text style={styles.scoreLine}>
                {t('feedback.scoreLine', { score: result.score })}
              </Text>
              <Text style={styles.scoreMeaning}>
                {t('feedback.scoreMeaning', {
                  pass: PRACTICE_PASS_SCORE,
                  master: PRACTICE_MASTER_SCORE,
                })}
              </Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          {!!result.transcript && (
            <>
              <Text style={styles.cardLabel}>{t('feedback.weHeard')}</Text>
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
            {variant === 'final' ? t('feedback.finalFeedbackLabel') : t('feedback.feedbackLabel')}
          </Text>
          <Text style={styles.body}>
            {variant === 'final' && !isNativeOutcome(result) && result.finalFeedback
              ? result.finalFeedback
              : result.feedback}
          </Text>

          {variant === 'native' && isNativeOutcome(result) && !!result.modelAnswer && (
            <>
              <Text style={styles.cardLabel}>{t('feedback.sayInEnglish')}</Text>
              <Text style={styles.modelAnswer}>{result.modelAnswer}</Text>
            </>
          )}

          {user && result.recordingId && (
            <>
              <Text style={styles.cardLabel}>{t('recordings.yourRecording')}</Text>
              <RecordingPlayback ownerId={user.id} recordingId={result.recordingId} />
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {variant === 'retry' && <Button title={t('common.tryAgain')} onPress={retry} />}

        {(variant === 'levelup' ||
          variant === 'mastered' ||
          variant === 'passed' ||
          variant === 'final') && (
          <Button title={t('feedback.nextQuestion')} onPress={goToNextQuestion} />
        )}

        {variant === 'native' && (
          <Button title={t('feedback.tryInEnglish')} onPress={tryInEnglish} />
        )}

        {variant === 'native-nospeech' && (
          <Button title={t('feedback.tryAgainNative')} onPress={backToPractice} />
        )}

        {variant === 'nospeech' && (
          <View style={styles.buttonColumn}>
            <Button title={t('common.tryAgain')} onPress={retry} />
            <Button title={t('feedback.seeHelp')} variant="secondary" onPress={openHelp} />
          </View>
        )}
      </View>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  liveHeader: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 52,
    marginTop: spacing.md,
  },
  title: {
    marginTop: spacing.md,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  levelUpBody: {
    marginTop: spacing.sm,
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  scoreLine: {
    marginTop: spacing.ml,
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  scoreMeaning: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    marginTop: spacing.xs,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 23,
    color: colors.text,
  },
  modelAnswer: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 24,
    color: colors.primary,
    fontWeight: '600',
  },
  body: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  noResultButton: {
    marginTop: spacing.lg,
  },
  bottomBar: {
    padding: spacing.ml,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  buttonColumn: {
    gap: 10,
  },
}));
