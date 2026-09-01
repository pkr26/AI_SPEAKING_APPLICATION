import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import Button from '../../../components/Button';
import Confetti from '../../../components/Confetti';
import Icon, { type IconName } from '../../../components/Icon';
import RecordingPlayback from '../../../components/RecordingPlayback';
import WordTaggedTranscript from '../../../components/WordTaggedTranscript';
import ScoreRing from '../../../components/ScoreRing';
import { useAuth } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { acknowledgePendingAssessmentFeedback } from '../../../lib/pending-assessment';
import { usePracticeFlow } from '../../../lib/practice-flow';
import { createThemedStyles, useTheme } from '../../../lib/theme';
import {
  isNativeOutcome,
  PRACTICE_MASTER_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_PASS_SCORE,
  type NativeLanguage,
  type PracticeOutcome,
  type Question,
} from '../../../lib/types';
import { useHardwareBack } from '../../../lib/use-hardware-back';

type Variant =
  | 'native'
  | 'native-final'
  | 'native-nospeech'
  | 'nospeech'
  | 'levelup'
  | 'mastered'
  | 'passed'
  | 'retry'
  | 'final';

interface FeedbackCard {
  questionId: string;
  result: PracticeOutcome;
  question?: Question;
  requestId?: string;
}

const NATIVE_ACCESSIBILITY_LANGUAGES: Record<NativeLanguage, string> = {
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

/** Per-variant outcome art: icon, its ink, and the tint behind the header. */
interface OutcomeArt {
  icon: IconName;
  ink: 'success' | 'danger' | 'warning' | 'accent' | 'primary';
}

const OUTCOME_ART: Record<Variant, OutcomeArt> = {
  native: { icon: 'globe', ink: 'success' },
  'native-final': { icon: 'book', ink: 'danger' },
  'native-nospeech': { icon: 'mic', ink: 'warning' },
  nospeech: { icon: 'mic', ink: 'warning' },
  levelup: { icon: 'trending-up', ink: 'accent' },
  mastered: { icon: 'trophy', ink: 'accent' },
  passed: { icon: 'check', ink: 'success' },
  retry: { icon: 'refresh', ink: 'warning' },
  final: { icon: 'book', ink: 'danger' },
};

/**
 * Celebration mark only; screen readers get the adjacent title instead. The
 * badge is a filled circle in the outcome's semantic ink with a light glyph —
 * the emoji art it replaces rendered differently per device vendor and could
 * not be tinted to the palette.
 */
function OutcomeBadge({ art, testID }: { art: OutcomeArt; testID: string }) {
  const theme = useTheme();
  const ink = theme.colors[art.ink === 'accent' ? 'accent' : art.ink];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={{
        width: 84,
        height: 84,
        borderRadius: 42,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: ink,
      }}
    >
      <Icon name={art.icon} size={38} color={theme.colors.card} strokeWidth={2.1} />
    </View>
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
  const { feedback, clearFeedback, clearRecordingReferences, restoreFeedback, setAnswerMode } =
    usePracticeFlow();
  // Every exit clears the flow state before the router finishes popping this
  // screen. Latch the outcome so the card slides away as itself instead of
  // flipping to the no-result state for the whole transition; a freshly
  // submitted outcome replaces the latched one.
  const [card, setCard] = useState<FeedbackCard | null>(() => {
    if (!feedback) return null;
    return {
      questionId: feedback.questionId,
      result: feedback.result,
      ...(feedback.question === undefined ? {} : { question: feedback.question }),
      ...(feedback.requestId === undefined ? {} : { requestId: feedback.requestId }),
    };
  });
  if (
    feedback &&
    (feedback.questionId !== card?.questionId ||
      feedback.result !== card?.result ||
      feedback.question !== card?.question ||
      feedback.requestId !== card?.requestId)
  ) {
    setCard({
      questionId: feedback.questionId,
      result: feedback.result,
      ...(feedback.question === undefined ? {} : { question: feedback.question }),
      ...(feedback.requestId === undefined ? {} : { requestId: feedback.requestId }),
    });
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
  const acknowledgedRequestIdsRef = useRef(new Set<string>());
  const [cardActionState, setCardActionState] = useState<{
    card: FeedbackCard;
    busy: boolean;
    error: boolean;
  } | null>(null);

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
        : result.attemptsLeft > 0
          ? 'native'
          : 'native-final'
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

  // Mastery (and the level-up it can earn) deserves a physical cheer; the
  // out-of-tries end of a word gets the gentler warning buzz. Haptics are
  // best effort (web/simulator).
  useEffect(() => {
    if (variant === 'mastered' || variant === 'levelup') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } else if (variant === 'final' || variant === 'native-final') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => undefined,
      );
    }
  }, [result, variant]);

  // Every processed spoken attempt changes the home stats and history list.
  // Both queries stay mounted beneath this stack, so invalidating here means
  // they are fresh again by the time the learner returns to them.
  const countedAttempt = !!result && !result.noSpeech;
  useEffect(() => {
    if (!countedAttempt) return;
    void queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['practice-history'] });
  }, [countedAttempt, queryClient, result]);

  const cardActionBusy = cardActionState?.card === card && cardActionState.busy;
  const cardActionError = cardActionState?.card === card && cardActionState.error;

  /** One navigation per feedback card: a double-tap on Try Again or Next
   * Question must not pop or advance the practice stack twice. Durable cards
   * clear their exact local replay pointer before any cache or route mutation. */
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
    const requestId = expectedCard.requestId;
    if (!requestId || acknowledgedRequestIdsRef.current.has(requestId)) {
      action();
      return;
    }

    setCardActionState({ card: expectedCard, busy: true, error: false });
    const ownerId = user?.id;
    void (async () => {
      let acknowledged = false;
      try {
        acknowledged =
          !!ownerId && (await acknowledgePendingAssessmentFeedback(ownerId, requestId));
      } catch {
        // The card remains the only safe source of feedback. The inline retry
        // state below deliberately avoids exposing SecureStore internals.
      }
      const cardStillBelongsToSession =
        mountedRef.current &&
        activeCardRef.current === expectedCard &&
        isSessionLeaseCurrent(sessionLease);
      if (!cardStillBelongsToSession) return;
      if (!acknowledged) {
        actedCardRef.current = null;
        setCardActionState({ card: expectedCard, busy: false, error: true });
        return;
      }

      acknowledgedRequestIdsRef.current.add(requestId);
      if (!focusedRef.current) {
        // The secure pointer is gone, but focus ownership was lost before the
        // route action could run. Keep the same card as an acknowledged legacy
        // card so a later refocus can finish without a false second delete.
        restoreFeedback(
          expectedCard.questionId,
          expectedCard.result,
          expectedCard.question,
          undefined,
        );
        actedCardRef.current = null;
        setCardActionState({ card: expectedCard, busy: false, error: false });
        return;
      }
      action();
    })();
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
      // A cold-start replay opens this screen with replace(), so there may be
      // no Practice route underneath to pop. dismissTo returns to an existing
      // Practice screen when present and replaces safely when it is absent.
      router.dismissTo('/practice');
    });

  const goToNextQuestion = () => {
    if (!user || !result) return;
    runOnce(card, () => {
      const currentQuestionKey = ['practice-question', user.id, user.cefrLevel] as const;
      void queryClient.cancelQueries({ queryKey: currentQuestionKey, exact: true });
      if (result.next) {
        const nextLevel = result.next.question.cefrLevel;
        const levelChanged = nextLevel !== user.cefrLevel;
        const nextQuestionKey = ['practice-question', user.id, nextLevel] as const;
        queryClient.setQueryData(nextQuestionKey, result.next);

        if (levelChanged) {
          // A rival request/device can promote the learner while this English
          // or native answer is in flight. In that case the terminal response
          // correctly carries a question from the authoritative new level but
          // no levelUp celebration (this answer did not earn it). Trust the
          // served question's level for both answer modes so Practice reads the
          // matching cache key instead of returning to a stale-level loop.
          queryClient.removeQueries({ queryKey: currentQuestionKey, exact: true });
          setUser((current) =>
            current?.id === user.id ? { ...current, cefrLevel: nextLevel } : current,
          );
          void queryClient.invalidateQueries({ queryKey: ['me'] });
        }
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
    if (!questionId || !result) return;
    runOnce(card, () => {
      clearFeedback();
      router.dismissTo('/practice');
      router.push({
        pathname: '/practice/help',
        params: {
          questionId,
          cycleId: result.cycleId,
          attemptsUsed: String(result.noSpeech ? result.attemptNo - 1 : result.attemptNo),
        },
      });
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
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('feedback.noResultTitle')}
        </Text>
        <Text style={styles.body}>{t('feedback.noResultBody')}</Text>
        <Button
          title={t('common.backToPractice')}
          fullWidth
          size="md"
          onPress={() => router.replace('/practice')}
          style={styles.noResultButton}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {/* Only the outcome headline and score announce themselves; the rest
            of the card is reachable without being read out all at once. The
            panel is tinted with the outcome's semantic color so the result is
            readable at a glance, before a single word is read. */}
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.outcomePanel,
            variant ? styles[`panel_${OUTCOME_ART[variant].ink}`] : null,
          ]}
        >
          {(variant === 'mastered' || variant === 'levelup') && (
            <Confetti testID="feedback-confetti" />
          )}
          {variant && <OutcomeBadge art={OUTCOME_ART[variant]} testID="feedback-outcome-badge" />}

          {variant === 'native' && isNativeOutcome(result) && (
            <>
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
              <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
                {t('feedback.noSpeechTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('feedback.nativeNoSpeechBody')}</Text>
            </>
          )}

          {variant === 'native-final' && (
            <>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.danger }]}>
                {t('feedback.nativeFinalTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('feedback.nativeFinalBody')}</Text>
            </>
          )}

          {variant === 'nospeech' && (
            <>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.warning }]}>
                {t('feedback.noSpeechTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('feedback.noSpeechBody')}</Text>
            </>
          )}

          {variant === 'levelup' && !isNativeOutcome(result) && result.levelUp && (
            <>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.accent }]}>
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
              <Text accessibilityRole="header" style={[styles.title, { color: colors.accent }]}>
                {t('feedback.masteredTitle')}
              </Text>
              <Text style={styles.subtitle}>
                {t('feedback.masteredBody', { score: PRACTICE_MASTER_SCORE })}
              </Text>
            </>
          )}

          {variant === 'passed' && (
            <>
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
              <Text accessibilityRole="header" style={[styles.title, { color: colors.danger }]}>
                {t('feedback.finalTitle')}
              </Text>
              <Text style={styles.subtitle}>{t('feedback.finalBody')}</Text>
            </>
          )}

          <Text style={styles.attemptLine}>
            {t(result.noSpeech ? 'feedback.attemptStillAvailable' : 'feedback.attemptLine', {
              current: result.attemptNo,
              max: PRACTICE_MAX_ATTEMPTS,
            })}
          </Text>

          {!isNativeOutcome(result) && variant !== 'nospeech' && (
            <ScoreRing
              score={result.score}
              size={132}
              thickness={11}
              color={
                variant === 'final'
                  ? colors.danger
                  : variant === 'retry'
                    ? colors.warning
                    : colors.success
              }
              label={t('feedback.scoreMeaning', {
                pass: PRACTICE_PASS_SCORE,
                master: PRACTICE_MASTER_SCORE,
              })}
              accessibilityLabel={t('feedback.scoreLine', { score: result.score })}
              testID="feedback-score-ring"
            />
          )}
        </View>
        <View style={styles.card}>
          {card?.question && (
            <View style={styles.questionSummary}>
              <Text style={styles.cardLabel}>{t('label.word')}</Text>
              <Text
                accessibilityLanguage="en-US"
                accessibilityRole="header"
                style={styles.feedbackWord}
                selectable
              >
                {card.question.promptWord}
              </Text>
              <Text style={styles.cardLabel}>{t('label.question')}</Text>
              <Text accessibilityLanguage="en-US" style={styles.feedbackQuestion} selectable>
                {card.question.questionText}
              </Text>
            </View>
          )}

          {!!result.transcript && (
            <View style={styles.transcriptSection}>
              <Text style={styles.transcriptLabel}>
                {isNativeOutcome(result)
                  ? t('feedback.originalTranscript', {
                      language: t(`language.${result.nativeLanguage}`),
                    })
                  : t('feedback.weHeard')}
              </Text>
              <WordTaggedTranscript
                transcript={result.transcript}
                quoted
                wordScores={isNativeOutcome(result) ? undefined : result.wordScores}
                accessibilityLanguage={
                  isNativeOutcome(result)
                    ? NATIVE_ACCESSIBILITY_LANGUAGES[result.nativeLanguage]
                    : 'en-US'
                }
                testID="feedback-word-transcript"
              />
            </View>
          )}

          {isNativeOutcome(result) && !!result.translatedTranscript && (
            <View style={styles.translationSection}>
              <Text style={styles.transcriptLabel}>{t('feedback.englishTranslation')}</Text>
              <Text accessibilityLanguage="en-US" selectable style={styles.translation}>
                {result.translatedTranscript}
              </Text>
            </View>
          )}

          <Text style={styles.cardLabel}>
            {variant === 'final' ? t('feedback.finalFeedbackLabel') : t('feedback.feedbackLabel')}
          </Text>
          <Text accessibilityLanguage="en-US" style={styles.body}>
            {variant === 'final' && !isNativeOutcome(result) && result.finalFeedback
              ? result.finalFeedback
              : result.feedback}
          </Text>

          {(variant === 'native' || variant === 'native-final') &&
            isNativeOutcome(result) &&
            !!result.modelAnswer && (
              <>
                <Text style={styles.cardLabel}>{t('feedback.exampleEnglishAnswer')}</Text>
                <Text accessibilityLanguage="en-US" selectable style={styles.modelAnswer}>
                  {result.modelAnswer}
                </Text>
              </>
            )}

          {user && result.recordingId && (
            <>
              <Text style={styles.cardLabel}>{t('recordings.yourRecording')}</Text>
              <RecordingPlayback
                ownerId={user.id}
                recordingId={result.recordingId}
                onDeleted={clearRecordingReferences}
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.bottomBarContent}>
          {cardActionError && (
            <Text accessibilityRole="alert" style={styles.cardActionError}>
              {t('boundary.body')}
            </Text>
          )}
          {variant === 'retry' && (
            <Button
              title={t('common.tryAgain')}
              fullWidth
              size="lg"
              disabled={cardActionBusy}
              onPress={retry}
            />
          )}

          {(variant === 'levelup' ||
            variant === 'mastered' ||
            variant === 'passed' ||
            variant === 'final' ||
            variant === 'native-final') && (
            <Button
              title={t('feedback.nextQuestion')}
              fullWidth
              size="lg"
              disabled={cardActionBusy}
              onPress={goToNextQuestion}
            />
          )}

          {variant === 'native' && (
            <View style={styles.buttonColumn}>
              <Button
                title={t('feedback.tryInEnglish')}
                fullWidth
                size="lg"
                disabled={cardActionBusy}
                onPress={tryInEnglish}
              />
              <Button
                title={t('feedback.tryAgainNative')}
                variant="secondary"
                fullWidth
                size="md"
                disabled={cardActionBusy}
                onPress={backToPractice}
              />
            </View>
          )}

          {variant === 'native-nospeech' && (
            <Button
              title={t('feedback.tryAgainNative')}
              fullWidth
              size="lg"
              disabled={cardActionBusy}
              onPress={backToPractice}
            />
          )}

          {variant === 'nospeech' && (
            <View style={styles.buttonColumn}>
              <Button
                title={t('common.tryAgain')}
                fullWidth
                size="lg"
                disabled={cardActionBusy}
                onPress={retry}
              />
              <Button
                title={t('feedback.seeHelp')}
                variant="secondary"
                fullWidth
                size="md"
                disabled={cardActionBusy}
                onPress={openHelp}
              />
            </View>
          )}
        </View>
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
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
  outcomePanel: {
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: radii.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  panel_success: { backgroundColor: colors.successLight },
  panel_danger: { backgroundColor: colors.dangerLight },
  panel_warning: { backgroundColor: colors.card },
  panel_accent: { backgroundColor: colors.accentLight },
  panel_primary: { backgroundColor: colors.primaryLight },
  title: {
    marginTop: spacing.md,
    fontSize: 24,
    lineHeight: 30,
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
  attemptLine: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.badge,
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
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
  questionSummary: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedbackWord: {
    marginTop: spacing.xs,
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  feedbackQuestion: {
    marginTop: spacing.xs,
    color: colors.text,
    fontSize: 17,
    lineHeight: 25,
  },
  transcriptSection: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.input,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  translationSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.input,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transcriptLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  transcript: {
    marginTop: spacing.sm,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 27,
    color: colors.text,
  },
  translation: {
    marginTop: spacing.sm,
    fontSize: 18,
    lineHeight: 27,
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
  bottomBarContent: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  buttonColumn: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  cardActionError: {
    marginBottom: spacing.md,
    color: colors.danger,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
}));
