import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '../components/Button';
import Recorder from '../components/Recorder';
import { apiFetch, userMessageForError } from '../lib/api';
import { LogoutCleanupError, useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';
import {
  parseDiagnosticAnswerResult,
  parseDiagnosticNext,
  type CefrLevel,
  type DiagnosticAnswerResult,
  type Question,
} from '../lib/types';
import { useHardwareBack } from '../lib/use-hardware-back';

/** Per-answer outcome kept in screen state for the completion reveal. */
interface AnswerRecord {
  score: number;
  passed: boolean;
}

interface DiagnosticProgress {
  asked: number;
  maxQuestions: number;
}

interface DiagnosticViewState {
  question: Question | null;
  progress: DiagnosticProgress | null;
  result: DiagnosticAnswerResult | null;
  level: CefrLevel | null;
}

const EMPTY_DIAGNOSTIC_VIEW_STATE: DiagnosticViewState = Object.freeze({
  question: null,
  progress: null,
  result: null,
  level: null,
});

export default function DiagnosticScreen() {
  const { user, setUser, logout, sessionVersion, captureSessionLease, isSessionLeaseCurrent } =
    useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const identityKey = `${sessionVersion}:${userId ?? 'anonymous'}`;
  const activeIdentityRef = useRef<string | null>(identityKey);
  const sessionLease = useMemo(() => {
    void identityKey;
    return captureSessionLease();
  }, [captureSessionLease, identityKey]);

  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState<DiagnosticProgress | null>(null);
  const [result, setResult] = useState<DiagnosticAnswerResult | null>(null);
  const [level, setLevel] = useState<CefrLevel | null>(null);
  // One-shot per test state: tapping Start hides the intro for this session.
  // A resumed test (asked > 0) never shows it, so resuming is not blocked.
  const [introStarted, setIntroStarted] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [stateIdentity, setStateIdentity] = useState(identityKey);
  const [recorderLocked, setRecorderLocked] = useState(false);
  const recorderLockedRef = useRef(false);
  const logoutBusyRef = useRef(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const practiceStartRef = useRef(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const accountActionRef = useRef(true);
  const activeRecorderOwnerRef = useRef<string | null>(null);
  const recoveryRefreshRef = useRef<string | null>(null);
  // Mirrors the on-screen answer card for the /next effect below (effects must
  // not depend on `result`, or clearing it would reapply the stale question).
  // Mutate it at the same time as state: a passive-effect mirror leaves a
  // commit-sized window where a background refetch or a queued acknowledgement
  // can still act on the result React has already accepted.
  const resultRef = useRef<DiagnosticAnswerResult | null>(null);

  // The diagnostic is a root-like screen: Android hardware back would pop it
  // mid-test, and the stale question then costs a 409 mismatch and minutes of
  // recovery lock on re-entry.
  useHardwareBack(() => true);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
      accountActionRef.current = true;
      activeIdentityRef.current = null;
      activeRecorderOwnerRef.current = null;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      accountActionRef.current = false;
      return () => {
        focusedRef.current = false;
        accountActionRef.current = true;
      };
    }, []),
  );

  useLayoutEffect(() => {
    // Local diagnostic progress is sensitive account data and is not stored in
    // the query cache. Clear it at every session/identity boundary.
    activeIdentityRef.current = identityKey;
    setStateIdentity(identityKey);
    setQuestion(null);
    setProgress(null);
    resultRef.current = null;
    setResult(null);
    setLevel(null);
    setIntroStarted(false);
    setAnswers([]);
    practiceStartRef.current = false;
    recorderLockedRef.current = false;
    setRecorderLocked(false);
    logoutBusyRef.current = false;
    setLogoutBusy(false);
    accountActionRef.current = !focusedRef.current;
    recoveryRefreshRef.current = null;
    return () => {
      if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;
    };
  }, [identityKey]);

  const nextQuery = useQuery({
    queryKey: ['diagnostic-next', sessionVersion, userId],
    queryFn: async ({ signal }) =>
      parseDiagnosticNext(await apiFetch<unknown>('/diagnostic/next', { signal })),
    enabled: !!user,
    retry: false,
  });
  useEffect(() => {
    const data = nextQuery.data;
    if (!data || !userId) return;
    if (activeIdentityRef.current !== identityKey || !isSessionLeaseCurrent(sessionLease)) {
      return;
    }
    if (resultRef.current) return;
    // An unacknowledged answer card outranks a background refetch: the stale
    // /next response (pre-answer state) must not skip the learner past the
    // result they have not acknowledged. advance() applies the next question
    // locally when they continue.
    setStateIdentity(identityKey);
    resultRef.current = null;
    setResult(null);
    if (data.done) {
      setQuestion(null);
      setProgress(null);
      setLevel(data.level);
    } else {
      setLevel(null);
      setQuestion(data.question);
      setProgress(data.progress);
    }
  }, [identityKey, isSessionLeaseCurrent, nextQuery.data, sessionLease, userId]);

  // Select the identity-owned state as one unit. Field-by-field selectors are
  // equivalent once the identity differs, and make it easier for one stale
  // field to be added later without the account boundary. The explicit
  // equality remains covered by the standard mutation campaign.
  const currentViewState: DiagnosticViewState =
    stateIdentity === identityKey
      ? { question, progress, result, level }
      : EMPTY_DIAGNOSTIC_VIEW_STATE;
  const {
    question: currentQuestion,
    progress: currentProgress,
    result: currentResult,
    level: currentLevel,
  } = currentViewState;
  const recorderOwner = currentQuestion !== null ? `${identityKey}:${currentQuestion.id}` : null;

  useLayoutEffect(() => {
    activeRecorderOwnerRef.current = recorderOwner;
    recoveryRefreshRef.current = null;
    recorderLockedRef.current = false;
    setRecorderLocked(false);
  }, [recorderOwner]);

  const renderOwnsWork = useCallback(
    () =>
      mountedRef.current &&
      focusedRef.current &&
      activeIdentityRef.current === identityKey &&
      isSessionLeaseCurrent(sessionLease),
    [identityKey, isSessionLeaseCurrent, sessionLease],
  );

  const recorderOwnsWork = useCallback(
    (owner: string | null) =>
      owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),
    [renderOwnsWork],
  );

  const handleResult = (data: DiagnosticAnswerResult) => {
    if (!recorderOwnsWork(recorderOwner) || resultRef.current !== null) return;
    resultRef.current = data;
    void queryClient.cancelQueries({
      queryKey: ['diagnostic-next', sessionVersion, userId],
      exact: true,
    });
    setResult(data);
    // Remember the per-answer outcome for the completion reveal. A resumed
    // test only lists the answers given in this session.
    setAnswers((previous) => [...previous, { score: data.score, passed: data.passed }]);
  };

  const handleError = (message: string) => {
    if (!recorderOwnsWork(recorderOwner) || resultRef.current !== null) return;
    Alert.alert(t('diag.assessFailedTitle'), message);
  };

  const handleRecoveryUnresolved = () => {
    const owner = recorderOwner;
    if (
      !recorderOwnsWork(owner) ||
      resultRef.current !== null ||
      recoveryRefreshRef.current === owner
    ) {
      return;
    }
    recoveryRefreshRef.current = owner;
    const refresh = nextQuery.refetch();
    void refresh.then(
      () => {
        if (recoveryRefreshRef.current === owner) recoveryRefreshRef.current = null;
      },
      () => {
        if (recoveryRefreshRef.current === owner) recoveryRefreshRef.current = null;
      },
    );
  };

  const handleRecorderLockChange = useCallback(
    (locked: boolean) => {
      if (!recorderOwnsWork(recorderOwner)) return;
      if (locked && resultRef.current !== null) return;
      recorderLockedRef.current = locked;
      setRecorderLocked(locked);
    },
    [recorderOwner, recorderOwnsWork],
  );

  const handleSettings = () => {
    if (
      !renderOwnsWork() ||
      recorderLockedRef.current ||
      logoutBusyRef.current ||
      accountActionRef.current
    ) {
      return;
    }
    accountActionRef.current = true;
    router.navigate('/settings');
  };

  const handleLogout = async () => {
    if (
      !renderOwnsWork() ||
      recorderLockedRef.current ||
      logoutBusyRef.current ||
      accountActionRef.current
    ) {
      return;
    }
    accountActionRef.current = true;
    logoutBusyRef.current = true;
    setLogoutBusy(true);
    let rearm = false;
    try {
      await logout();
      if (mountedRef.current && focusedRef.current) router.replace('/');
    } catch (error) {
      if (error instanceof LogoutCleanupError) {
        Alert.alert(t('logout.cleanupTitle'), error.message);
      } else if (renderOwnsWork()) {
        Alert.alert(t('logout.failedTitle'), t('logout.failedBody'));
        rearm = true;
      }
    } finally {
      logoutBusyRef.current = false;
      if (mountedRef.current && activeIdentityRef.current === identityKey) {
        setLogoutBusy(false);
        if (rearm) accountActionRef.current = false;
      }
    }
  };

  const advance = () => {
    if (!renderOwnsWork() || !currentResult || resultRef.current !== currentResult) {
      return;
    }
    // Claim this exact card synchronously. A second tap delivered against the
    // old committed handler, or an even older handler replayed after a refetch,
    // is now a no-op rather than rewinding diagnostic state.
    resultRef.current = null;
    if (currentResult.done) {
      const determinedLevel = currentResult.level ?? null;
      setLevel(determinedLevel);
      setResult(null);
    } else if (currentResult.nextQuestion) {
      setQuestion(currentResult.nextQuestion);
      setProgress((prev) => (prev ? { ...prev, asked: prev.asked + 1 } : prev));
      setResult(null);
    }
  };

  const startPracticing = () => {
    if (practiceStartRef.current || !renderOwnsWork() || !user || !currentLevel) {
      return;
    }
    practiceStartRef.current = true;
    // Keep the diagnostic route protected until the completion screen has
    // actually been acknowledged; changing this earlier removes the screen.
    // A cross-device diagnostic restart can leave a cached pre-placement
    // stats response for this same account. This screen has no active stats
    // observer, so retire it here before Home mounts at the new level rather
    // than removing Home's own live query during a route-gate transition.
    queryClient.removeQueries({ queryKey: ['practice-stats'] });
    setUser({
      ...user,
      diagnosticCompleted: true,
      cefrLevel: currentLevel,
    });
    void queryClient.invalidateQueries({ queryKey: ['me'] });
    router.replace('/');
  };

  // ----- Loading / error states -----
  if (!user) return null;

  if (!currentLevel && !currentQuestion) {
    if (nextQuery.isPending) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.muted}>{t('diag.preparing')}</Text>
        </View>
      );
    }
    if (nextQuery.isError) {
      return (
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            {t('diag.loadFailedTitle')}
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(nextQuery.error, t('diag.loadFailed'))}
          </Text>
          <Button
            title={t('common.tryAgain')}
            fullWidth
            onPress={() => void nextQuery.refetch({ cancelRefetch: false })}
            style={styles.primaryAction}
          />
        </View>
      );
    }
  }

  // ----- Done: congrats view with the per-answer reveal -----
  if (currentLevel) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.centerScroll}
      >
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.congratsEmoji}
        >
          🎉
        </Text>
        <Text accessibilityRole="header" style={styles.congratsTitle}>
          {t('diag.completeTitle')}
        </Text>
        <Text style={styles.congratsText}>{t('diag.levelIntro')}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{currentLevel}</Text>
        </View>
        <Text style={styles.levelExplainText}>{t(`cefr.${currentLevel}`)}</Text>
        {answers.length > 0 && (
          <View style={styles.answersCard}>
            <Text style={styles.answersTitle}>{t('diag.answersTitle')}</Text>
            {answers.map((answer, index) => (
              <Text key={index} style={styles.answerLine}>
                {t('diag.answerLine', {
                  number: index + 1,
                  score: answer.score,
                  mark: answer.passed ? '✓' : '✗',
                })}
              </Text>
            ))}
          </View>
        )}
        <Text style={styles.congratsHint}>{t('diag.levelHint')}</Text>
        <Button
          title={t('diag.startPracticing')}
          fullWidth
          onPress={startPracticing}
          style={styles.primaryAction}
        />
      </ScrollView>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  // The intro shows once per fresh test, before the first question. A resumed
  // test (asked > 0) goes straight to its question.
  const showIntro = !introStarted && !currentResult && (currentProgress?.asked ?? 0) === 0;
  const accountActionsLocked = recorderLocked || logoutBusy;
  // Keep the result branch safe even when mutation testing deliberately forces
  // it with no result. The outer rendering selector is then rejected by direct
  // mount-state assertions instead of cascading through a null dereference.
  const resultActionTitle =
    currentResult?.done === true ? t('diag.seeLevel') : t('diag.nextQuestion');

  // ----- Question view -----
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('header.diagnostic')}
      </Text>
      <View style={styles.accountActions}>
        <Button
          title={t('header.settings')}
          variant="secondary"
          size="sm"
          accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
          disabled={accountActionsLocked}
          onPress={handleSettings}
        />
        <Button
          title={t('common.logOut')}
          variant="secondary"
          size="sm"
          accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
          disabled={accountActionsLocked}
          onPress={() => void handleLogout()}
        />
      </View>

      {showIntro ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.resultTitle}>
            {t('diag.introTitle')}
          </Text>
          <Text style={styles.introLine}>{t('diag.introWhat')}</Text>
          {currentProgress && (
            <Text style={styles.introLine}>
              {t('diag.introCount', { count: currentProgress.maxQuestions })}
            </Text>
          )}
          <Text style={styles.introLine}>{t('diag.introRecorded')}</Text>
          <Text style={styles.introLine}>{t('diag.introSpeakEnglish')}</Text>
          <Button
            title={t('diag.introStart')}
            fullWidth
            onPress={() => setIntroStarted(true)}
            style={styles.primaryAction}
          />
        </View>
      ) : (
        <>
          {currentProgress && (
            <Text style={styles.progressText}>
              {t('diag.progress', {
                current: Math.min(currentProgress.asked + 1, currentProgress.maxQuestions),
                max: currentProgress.maxQuestions,
              })}
            </Text>
          )}

          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('label.word')}</Text>
            <Text style={styles.promptWord}>{currentQuestion.promptWord}</Text>
            <Text style={styles.cardLabel}>{t('label.question')}</Text>
            <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
          </View>

          {currentResult ? (
            <View accessibilityLiveRegion="polite" style={styles.resultCard}>
              <Text style={styles.resultTitle}>{t('diag.answerSavedTitle')}</Text>
              <Text style={styles.resultText}>{t('diag.answerSavedBody')}</Text>
              <Button
                title={resultActionTitle}
                fullWidth
                onPress={advance}
                style={styles.primaryAction}
              />
            </View>
          ) : (
            <Recorder
              ownerId={user.id}
              questionId={currentQuestion.id}
              endpoint="/diagnostic/answer"
              parseResult={parseDiagnosticAnswerResult}
              onResult={handleResult}
              onError={handleError}
              onRecoveryUnresolved={handleRecoveryUnresolved}
              onInteractionLockChange={handleRecorderLockChange}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  centerScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  progressText: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.muted,
  },
  accountActions: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    marginTop: spacing.lg,
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
    marginTop: spacing.md,
  },
  promptWord: {
    marginTop: spacing.xs,
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  questionText: {
    marginTop: spacing.xs,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
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
  resultCard: {
    marginTop: spacing.xl,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  resultText: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  congratsEmoji: {
    fontSize: 56,
  },
  congratsTitle: {
    marginTop: spacing.md,
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  congratsText: {
    marginTop: spacing.ml,
    fontSize: 16,
    color: colors.muted,
  },
  levelBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  levelBadgeText: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  congratsHint: {
    marginTop: spacing.ml,
    marginBottom: spacing.sm,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  levelExplainText: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  answersCard: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.ml,
    borderWidth: 1,
    borderColor: colors.border,
  },
  answersTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  answerLine: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  introLine: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
  primaryAction: {
    marginTop: spacing.lg,
  },
}));
