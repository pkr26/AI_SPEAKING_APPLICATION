import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../components/Button';
import Recorder from '../../components/Recorder';
import { apiFetch, apiSkipPracticeWord, userMessageForError } from '../../lib/api';
import { LogoutCleanupError, useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { applyFailedAttemptToQuestionCache, usePracticeFlow } from '../../lib/practice-flow';
import { hasSeenPracticeIntro, markPracticeIntroSeen } from '../../lib/practice-intro';
import { createThemedStyles, useTheme } from '../../lib/theme';
import {
  parseAttemptResult,
  parseNativeAttemptResult,
  parsePracticeQuestion,
  PRACTICE_MASTER_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  type PracticeOutcome,
} from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

export default function PracticeScreen() {
  const { user, logout, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const navigation = useNavigation();
  const { answerMode, attemptStatus, setAnswerMode, showFeedback } = usePracticeFlow();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [recorderLockState, setRecorderLockState] = useState<{
    owner: string | null;
    locked: boolean;
  }>({ owner: null, locked: false });
  // The Recorder reports a lock during its own commit. Keep a synchronous
  // mirror as well as render state so a second, same-frame tap cannot skip the
  // question, switch modes, or navigate away before React disables the control.
  const recorderLockedRef = useRef(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const skipBusyRef = useRef(false);
  // Localized "when can I try again" line from a 429/DAILY_LIMIT rejection,
  // rendered inline next to the recorder instead of only in a passing alert.
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);
  const logoutBusyRef = useRef(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const navigationStartedRef = useRef(true);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const activeRenderOwnerRef = useRef<string | null>(null);
  const activeRecorderOwnerRef = useRef<string | null>(null);
  const resultClaimRef = useRef<string | null>(null);
  const recoveryRefreshRef = useRef<string | null>(null);
  // First-practice-visit one-shot explainer of the mastery rules. The stored
  // flag is keyed by account so a stale read from a previous session's user
  // can never show or hide the card for the wrong learner; while unknown
  // (null) nothing renders, so the card cannot flash for returning learners.
  const [introState, setIntroState] = useState<{ userId: string; seen: boolean } | null>(null);
  const userId = user?.id ?? null;
  const renderOwner = `${sessionVersion}:${userId ?? 'anonymous'}`;
  const sessionLease = useMemo(() => {
    void sessionVersion;
    void userId;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, userId]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
      navigationStartedRef.current = true;
      activeRenderOwnerRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    activeRenderOwnerRef.current = renderOwner;
  }, [renderOwner]);
  useEffect(() => {
    let active = true;
    if (!userId) return undefined;
    void hasSeenPracticeIntro(userId).then((seen) => {
      if (active) setIntroState({ userId, seen });
    });
    return () => {
      active = false;
    };
  }, [userId]);
  const introSeen = introState && introState.userId === userId ? introState.seen : null;

  const dismissIntro = () => {
    if (!userId) return;
    setIntroState({ userId, seen: true });
    void markPracticeIntroSeen(userId);
  };
  const nativeMode = answerMode === 'native';
  const questionQueryKey = useMemo(
    () => ['practice-question', user?.id, user?.cefrLevel] as const,
    [user?.cefrLevel, user?.id],
  );
  const questionQuery = useQuery({
    queryKey: questionQueryKey,
    queryFn: async ({ signal }) =>
      parsePracticeQuestion(await apiFetch<unknown>('/practice/question', { signal })),
    enabled: !!user,
    retry: false,
    // Keep the assigned question stable until feedback explicitly advances it.
    staleTime: Infinity,
  });
  const question = questionQuery.data?.question;
  const kind = questionQuery.data?.kind;
  const progress = questionQuery.data?.progress;
  const recorderQuestionId = question?.id ?? null;
  const recorderOwner =
    recorderQuestionId &&
    `${renderOwner}:${recorderQuestionId}:${nativeMode ? 'native' : 'english'}`;
  const recorderLocked = recorderLockState.owner === recorderOwner && recorderLockState.locked;

  useLayoutEffect(() => {
    activeRecorderOwnerRef.current = recorderOwner;
    resultClaimRef.current = null;
    recoveryRefreshRef.current = null;
    recorderLockedRef.current = false;
  }, [recorderOwner]);

  const renderOwnsWork = useCallback(
    () =>
      mountedRef.current &&
      focusedRef.current &&
      activeRenderOwnerRef.current === renderOwner &&
      isSessionLeaseCurrent(sessionLease),
    [isSessionLeaseCurrent, renderOwner, sessionLease],
  );

  const recorderOwnsWork = useCallback(
    (owner: string | null) =>
      owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),
    [renderOwnsWork],
  );

  const interactionLocked = recorderLocked || skipBusy || logoutBusy;
  const interactionLockedNow = useCallback(
    () => recorderLockedRef.current || skipBusyRef.current || logoutBusyRef.current,
    [],
  );
  const publishNavigationLock = useCallback(() => {
    if (!mountedRef.current || !focusedRef.current) return;
    navigation.setOptions(
      interactionLockedNow()
        ? { headerBackVisible: false, gestureEnabled: false }
        : { headerBackVisible: true, gestureEnabled: true },
    );
  }, [interactionLockedNow, navigation]);

  // Practice now sits above Home. Leaving is a normal exit, except while a
  // recording, upload, or recovery is active — popping then would let blur
  // cleanup discard the take. Hardware back, header back, and the iOS swipe
  // gesture all follow the same lock.
  useHardwareBack(interactionLockedNow);
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      navigationStartedRef.current = false;
      publishNavigationLock();
      return () => {
        focusedRef.current = false;
        navigationStartedRef.current = true;
      };
    }, [publishNavigationLock]),
  );
  const claimNavigation = useCallback(() => {
    if (navigationStartedRef.current || interactionLockedNow() || !renderOwnsWork()) return false;
    navigationStartedRef.current = true;
    return true;
  }, [interactionLockedNow, renderOwnsWork]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      // Header back and the native swipe gesture dispatch GO_BACK. Read the
      // synchronous recorder ref so an event already queued in the lock's
      // pre-render window cannot discard the take. Route-gate resets and the
      // recorder's deliberate dismiss flows remain free to remove the screen.
      if (interactionLockedNow() && event.data.action.type === 'GO_BACK') {
        event.preventDefault();
      }
    });
    return unsubscribe;
  }, [interactionLockedNow, navigation]);
  useLayoutEffect(() => {
    publishNavigationLock();
  }, [interactionLocked, publishNavigationLock]);

  // A new submission owns the inline space again: clear the old wait line the
  // moment the recorder locks for the next take.
  const handleLockChange = useCallback(
    (locked: boolean) => {
      if (!recorderOwnsWork(recorderOwner)) return;
      recorderLockedRef.current = locked;
      // Close the pre-render window for native header/gesture exits as well as
      // the custom controls below. Recorder publishes its lock synchronously,
      // so the navigator can consume it before React commits disabled props.
      setRecorderLockState({ owner: recorderOwner, locked });
      if (locked) setRateLimitNotice(null);
      publishNavigationLock();
    },
    [publishNavigationLock, recorderOwner, recorderOwnsWork],
  );

  const handleResult = (result: PracticeOutcome) => {
    const owner = recorderOwner;
    if (
      !user ||
      !question ||
      !recorderOwnsWork(owner) ||
      navigationStartedRef.current ||
      resultClaimRef.current === owner
    ) {
      return;
    }
    resultClaimRef.current = owner;
    navigationStartedRef.current = true;
    void queryClient.cancelQueries({ queryKey: questionQueryKey, exact: true });
    setRateLimitNotice(null);
    applyFailedAttemptToQuestionCache(queryClient, user, question.id, result);
    showFeedback(question.id, result);
    router.push('/practice/feedback');
  };

  const handleError = (message: string) => {
    if (!recorderOwnsWork(recorderOwner) || navigationStartedRef.current) return;
    Alert.alert(t('diag.assessFailedTitle'), message);
  };

  const handleRateLimited = (message: string) => {
    if (!recorderOwnsWork(recorderOwner) || navigationStartedRef.current) return;
    setRateLimitNotice(message);
  };

  const handleRecoveryUnresolved = () => {
    const owner = recorderOwner;
    if (
      !recorderOwnsWork(owner) ||
      navigationStartedRef.current ||
      recoveryRefreshRef.current === owner
    ) {
      return;
    }
    recoveryRefreshRef.current = owner;
    const refresh = questionQuery.refetch();
    void refresh.then(
      () => {
        if (recoveryRefreshRef.current === owner) recoveryRefreshRef.current = null;
      },
      () => {
        if (recoveryRefreshRef.current === owner) recoveryRefreshRef.current = null;
      },
    );
  };

  const handleRecoveryEndpointMismatch = (
    savedEndpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
  ) => {
    if (!recorderOwnsWork(recorderOwner) || navigationStartedRef.current) return false;
    if (savedEndpoint === '/practice/attempt/native') {
      setAnswerMode('native');
      return true;
    }
    if (savedEndpoint === '/practice/attempt') {
      setAnswerMode('english');
      return true;
    }
    return false;
  };

  const handleSkip = async () => {
    const owner = recorderOwner;
    if (
      !question ||
      !recorderOwnsWork(owner) ||
      navigationStartedRef.current ||
      skipBusyRef.current ||
      recorderLockedRef.current ||
      logoutBusyRef.current
    ) {
      return;
    }
    skipBusyRef.current = true;
    setSkipBusy(true);
    publishNavigationLock();
    try {
      await apiSkipPracticeWord(question.id);
      if (!recorderOwnsWork(owner) || navigationStartedRef.current) return;
      setRateLimitNotice(null);
      // refetch() swallows its own failure: without this check the just-parked
      // word would stay on screen with no error shown.
      const refetched = await questionQuery.refetch();
      if (refetched.isError && recorderOwnsWork(owner) && !navigationStartedRef.current) {
        Alert.alert(
          t('practice.skipFailedTitle'),
          userMessageForError(refetched.error, t('practice.skipFailed')),
        );
      }
    } catch (error) {
      if (recorderOwnsWork(owner) && !navigationStartedRef.current) {
        Alert.alert(
          t('practice.skipFailedTitle'),
          userMessageForError(error, t('practice.skipFailed')),
        );
      }
    } finally {
      skipBusyRef.current = false;
      if (mountedRef.current && activeRenderOwnerRef.current === renderOwner) {
        setSkipBusy(false);
        publishNavigationLock();
      }
    }
  };

  const handleLogout = async () => {
    if (!claimNavigation()) return;
    logoutBusyRef.current = true;
    setLogoutBusy(true);
    publishNavigationLock();
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
      if (mountedRef.current && activeRenderOwnerRef.current === renderOwner) {
        setLogoutBusy(false);
        if (rearm) navigationStartedRef.current = false;
        publishNavigationLock();
      }
    }
  };

  // The route gate will redirect after logout/session expiry. Avoid showing a
  // disabled-query loading state during that transition.
  if (!user) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {user && <Text style={styles.greeting}>{t('practice.greeting', { name: user.name })}</Text>}

        {!question && questionQuery.isPending && (
          <View style={styles.center}>
            <ActivityIndicator
              accessibilityLabel={t('practice.loadingQuestion')}
              size="large"
              color={theme.colors.primary}
            />
            <Text accessibilityLiveRegion="polite" style={styles.muted}>
              {t('practice.loadingQuestion')}
            </Text>
          </View>
        )}

        {!question && questionQuery.isError && (
          <View style={styles.center}>
            <Text accessibilityRole="header" style={styles.errorTitle}>
              {t('practice.loadFailedTitle')}
            </Text>
            <Text accessibilityLiveRegion="assertive" style={styles.muted}>
              {userMessageForError(questionQuery.error, t('practice.loadFailed'))}
            </Text>
            <Button
              title={t('common.tryAgain')}
              onPress={() => void questionQuery.refetch({ cancelRefetch: false })}
              style={styles.retryButton}
            />
          </View>
        )}

        {question && introSeen === false && (
          <View style={styles.introCard}>
            <Text accessibilityRole="header" style={styles.introTitle}>
              {t('practiceIntro.title')}
            </Text>
            <Text style={styles.introLine}>
              {t('practiceIntro.master', { score: PRACTICE_MASTER_SCORE })}
            </Text>
            <Text style={styles.introLine}>
              {t('practiceIntro.tries', { count: PRACTICE_MAX_ATTEMPTS })}
            </Text>
            <Text style={styles.introLine}>{t('practiceIntro.silence')}</Text>
            <Button
              title={t('practiceIntro.dismiss')}
              onPress={dismissIntro}
              style={styles.retryButton}
            />
          </View>
        )}

        {question && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('practice.helpLabel')}
              accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
              disabled={interactionLocked}
              hitSlop={4}
              style={({ pressed }) => [
                styles.helpButton,
                interactionLocked && styles.controlDisabled,
                pressed && styles.helpButtonPressed,
              ]}
              onPress={() => {
                if (!claimNavigation()) return;
                router.navigate({
                  pathname: '/practice/help',
                  params: { questionId: question.id },
                });
              }}
            >
              <Text style={styles.helpButtonText}>?</Text>
            </Pressable>

            <View style={styles.card}>
              <View style={styles.badgeRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{question.cefrLevel}</Text>
                </View>
                {kind && (
                  <View style={[styles.kindBadge, kind === 'revision' && styles.kindBadgeRevision]}>
                    <Text
                      style={[
                        styles.kindBadgeText,
                        kind === 'revision' && styles.kindBadgeRevisionText,
                      ]}
                    >
                      {kind === 'revision' ? t('practice.revision') : t('practice.newWord')}
                    </Text>
                  </View>
                )}
                {attemptStatus !== null && attemptStatus.questionId === question.id && (
                  <View style={styles.attemptChip}>
                    <Text style={styles.attemptChipText}>
                      {t('practice.attemptChip', {
                        current: PRACTICE_MAX_ATTEMPTS + 1 - attemptStatus.attemptsLeft,
                        max: PRACTICE_MAX_ATTEMPTS,
                      })}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.levelExplainLine}>{t(`cefr.${question.cefrLevel}`)}</Text>
              {progress && (
                <Text style={styles.progressLine}>
                  {t('practice.progressLine', {
                    mastered: progress.masteredCount,
                    total: progress.totalAtLevel,
                  })}
                  {progress.learningCount > 0
                    ? t('practice.progressLearning', { count: progress.learningCount })
                    : ''}
                </Text>
              )}
              <Text style={styles.cardLabel}>{t('label.word')}</Text>
              <Text accessibilityRole="header" style={styles.promptWord}>
                {question.promptWord}
              </Text>
              <Text style={styles.cardLabel}>{t('label.question')}</Text>
              <Text style={styles.questionText}>{question.questionText}</Text>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityLabel={t('practice.answerInMyLanguage')}
              accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
              accessibilityState={{ checked: nativeMode, disabled: interactionLocked }}
              disabled={interactionLocked}
              style={({ pressed }) => [
                styles.modeToggle,
                nativeMode && styles.modeToggleOn,
                interactionLocked && styles.modeToggleDisabled,
                pressed && (nativeMode ? styles.modeTogglePressedOn : styles.modeTogglePressed),
              ]}
              onPress={() => {
                if (!interactionLockedNow() && renderOwnsWork()) {
                  setAnswerMode(nativeMode ? 'english' : 'native');
                }
              }}
            >
              <Text style={[styles.modeToggleText, nativeMode && styles.modeToggleTextOn]}>
                {nativeMode ? t('practice.answeringNative') : t('practice.answerInMyLanguage')}
              </Text>
            </Pressable>

            {rateLimitNotice && (
              <View style={styles.rateLimitCard}>
                <Text accessibilityRole="alert" style={styles.rateLimitText}>
                  {rateLimitNotice}
                </Text>
              </View>
            )}

            <View style={styles.recorderArea}>
              <Recorder
                key={nativeMode ? 'native' : 'english'}
                ownerId={user.id}
                questionId={question.id}
                disabled={skipBusy || logoutBusy}
                isStartBlocked={() => skipBusyRef.current || logoutBusyRef.current}
                endpoint={nativeMode ? '/practice/attempt/native' : '/practice/attempt'}
                parseResult={nativeMode ? parseNativeAttemptResult : parseAttemptResult}
                onResult={handleResult}
                onError={handleError}
                onRateLimited={handleRateLimited}
                onRecoveryUnresolved={handleRecoveryUnresolved}
                onRecoveryEndpointMismatch={handleRecoveryEndpointMismatch}
                onInteractionLockChange={handleLockChange}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
              accessibilityState={{ disabled: interactionLocked, busy: skipBusy }}
              disabled={interactionLocked}
              hitSlop={4}
              style={[styles.skipButton, interactionLocked && styles.controlDisabled]}
              onPress={() => void handleSkip()}
            >
              <Text style={styles.skipButtonText}>{t('practice.skipWord')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={[styles.footerRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
          disabled={interactionLocked}
          hitSlop={4}
          style={[styles.footerButton, interactionLocked && styles.controlDisabled]}
          onPress={() => {
            if (claimNavigation()) router.navigate('/settings');
          }}
        >
          <Text style={styles.footerButtonText}>{t('practice.settings')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
          disabled={interactionLocked}
          hitSlop={4}
          style={[styles.footerButton, interactionLocked && styles.controlDisabled]}
          onPress={() => void handleLogout()}
        >
          <Text style={styles.footerButtonText}>{t('common.logOut')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, scheme, spacing }) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    minHeight: 320,
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
  retryButton: {
    marginTop: spacing.lg,
  },
  helpButton: {
    alignSelf: 'flex-end',
    width: layout.minimumTarget,
    height: layout.minimumTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: scheme === 'dark' ? 0.4 : 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  helpButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  helpButtonText: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  card: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.badge,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: spacing.xs,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  kindBadge: {
    backgroundColor: colors.success,
    borderRadius: radii.badge,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  kindBadgeRevision: {
    backgroundColor: colors.warning,
  },
  kindBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSuccess,
  },
  kindBadgeRevisionText: {
    color: colors.onWarning,
  },
  progressLine: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  levelExplainLine: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  introCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  introLine: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  attemptChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.badge,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  attemptChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modeToggle: {
    alignSelf: 'center',
    marginTop: spacing.md,
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.ml,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modeToggleOn: {
    backgroundColor: colors.primary,
  },
  modeTogglePressed: {
    backgroundColor: colors.primaryLight,
  },
  modeTogglePressedOn: {
    backgroundColor: colors.primaryDark,
  },
  modeToggleDisabled: {
    opacity: 0.5,
  },
  controlDisabled: {
    opacity: 0.5,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modeToggleTextOn: {
    color: colors.onPrimary,
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
  recorderArea: {
    minHeight: 330,
    justifyContent: 'center',
  },
  rateLimitCard: {
    marginTop: spacing.md,
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.md,
  },
  rateLimitText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  skipButton: {
    alignSelf: 'center',
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.ml,
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  footerRow: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.ml,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerButton: {
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.ml,
  },
  footerButtonText: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
}));
