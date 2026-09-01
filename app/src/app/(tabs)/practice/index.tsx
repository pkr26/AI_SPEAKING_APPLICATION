import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import Button from '../../../components/Button';
import Icon from '../../../components/Icon';
import OfflineState from '../../../components/OfflineState';
import Skeleton from '../../../components/Skeleton';
import Recorder, {
  scrollToExpandedRecorderControls,
  type RecorderResultMetadata,
} from '../../../components/Recorder';
import { ApiError, apiFetch, apiSkipPracticeWord, userMessageForError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { applyFailedAttemptToQuestionCache, usePracticeFlow } from '../../../lib/practice-flow';
import { setPracticeExitLocked } from '../../../lib/practice-exit-lock';
import { hasSeenPracticeIntro, markPracticeIntroSeen } from '../../../lib/practice-intro';
import { createThemedStyles, useTheme } from '../../../lib/theme';
import {
  parseAttemptResult,
  parseNativeAttemptResult,
  parsePracticeQuestion,
  PRACTICE_MASTER_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  type PracticeOutcome,
  type PracticeQuestionPayload,
} from '../../../lib/types';
import { useHardwareBack } from '../../../lib/use-hardware-back';

// Silence retries are unbounded, so retain only a small recent window while
// still suppressing recovery replays for the current recorder owner.
const MAX_HANDLED_RESULT_REQUEST_IDS = 8;

function isClosedPracticeCycle(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    (error.code === 'PRACTICE_CYCLE_CLOSED' || error.code === 'STATE_CHANGED')
  );
}

export default function PracticeScreen() {
  const { user, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const navigation = useNavigation();
  const { answerMode, setAnswerMode, showFeedback } = usePracticeFlow();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [recorderLockState, setRecorderLockState] = useState<{
    owner: string | null;
    locked: boolean;
  }>({ owner: null, locked: false });
  // The Recorder reports a lock during its own commit. Keep a synchronous
  // mirror as well as render state so a second, same-frame tap cannot skip the
  // question, switch modes, or navigate away before React disables the control.
  const recorderLockedRef = useRef(false);
  const [recorderExitLockState, setRecorderExitLockState] = useState<{
    owner: string | null;
    locked: boolean;
  }>({ owner: null, locked: false });
  const recorderExitLockedRef = useRef(false);
  const [skipBusy, setSkipBusy] = useState(false);
  const skipBusyRef = useRef(false);
  // Localized "when can I try again" line from a 429/DAILY_LIMIT rejection,
  // rendered inline next to the recorder instead of only in a passing alert.
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);
  const navigationStartedRef = useRef(true);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const activeRenderOwnerRef = useRef<string | null>(null);
  const activeRecorderOwnerRef = useRef<string | null>(null);
  const handledResultRequestIdsRef = useRef(new Set<string>());
  const recoveryRefreshRef = useRef<string | null>(null);
  const focusRevalidationRef = useRef<{
    owner: string;
    controller: AbortController;
  } | null>(null);
  const [focusEpoch, setFocusEpoch] = useState(0);
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
  const cancelFocusRevalidation = useCallback(() => {
    focusRevalidationRef.current?.controller.abort();
    focusRevalidationRef.current = null;
  }, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
      navigationStartedRef.current = true;
      activeRenderOwnerRef.current = null;
      // Never let this screen's exit lock outlive it (logout, gate reset).
      setPracticeExitLocked(false);
      cancelFocusRevalidation();
    };
  }, [cancelFocusRevalidation]);

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
  const cycleId = questionQuery.data?.cycleId;
  const attemptsUsed = questionQuery.data?.attemptsUsed;
  const recorderQuestionId = question?.id ?? null;
  const recorderOwner =
    recorderQuestionId && cycleId
      ? `${renderOwner}:${recorderQuestionId}:${cycleId}:${nativeMode ? 'native' : 'english'}`
      : null;
  const recorderLocked = recorderLockState.owner === recorderOwner && recorderLockState.locked;
  const recorderExitLocked =
    recorderExitLockState.owner === recorderOwner && recorderExitLockState.locked;

  useLayoutEffect(() => {
    activeRecorderOwnerRef.current = recorderOwner;
    handledResultRequestIdsRef.current = new Set();
    recoveryRefreshRef.current = null;
    recorderLockedRef.current = false;
    recorderExitLockedRef.current = false;
    setPracticeExitLocked(false);
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
  const revealExpandedRecorderControls = useCallback(() => {
    scrollToExpandedRecorderControls(scrollViewRef.current, recorderOwnsWork(recorderOwner));
  }, [recorderOwner, recorderOwnsWork]);

  const interactionLocked = recorderLocked || skipBusy;
  const navigationLocked = recorderExitLocked || skipBusy;
  const interactionLockedNow = useCallback(
    () => recorderLockedRef.current || skipBusyRef.current,
    [],
  );
  const navigationLockedNow = useCallback(
    () => recorderExitLockedRef.current || skipBusyRef.current,
    [],
  );

  // A served cycle can advance on another device while this route remains in
  // the stack. Revalidate when Practice receives focus, but keep that GET out
  // of TanStack's live query so a response can be discarded instead of
  // replacing a Recorder that acquired ownership while the request was in
  // flight. The initial no-cache fetch is already canonical and needs no
  // duplicate request.
  const scheduleFocusRevalidation = useCallback(() => {
    const cachedAtFocus = queryClient.getQueryData<PracticeQuestionPayload>(questionQueryKey);
    const queryStateAtFocus = queryClient.getQueryState(questionQueryKey);
    if (!cachedAtFocus || queryStateAtFocus?.fetchStatus === 'fetching' || interactionLockedNow()) {
      return () => undefined;
    }

    const source = {
      questionId: cachedAtFocus.question.id,
      cycleId: cachedAtFocus.cycleId,
      attemptsUsed: cachedAtFocus.attemptsUsed,
    };
    const owner = `${renderOwner}:${source.questionId}:${source.cycleId}:${source.attemptsUsed}`;
    // Defer one JS turn so the returning route and Recorder can publish any
    // navigation/recovery ownership acquired by the same focus transition.
    const task = setTimeout(() => {
      if (
        !renderOwnsWork() ||
        navigationStartedRef.current ||
        interactionLockedNow() ||
        focusRevalidationRef.current !== null
      ) {
        return;
      }
      const current = queryClient.getQueryData<PracticeQuestionPayload>(questionQueryKey);
      if (
        !current ||
        current.question.id !== source.questionId ||
        current.cycleId !== source.cycleId ||
        current.attemptsUsed !== source.attemptsUsed
      ) {
        return;
      }

      const controller = new AbortController();
      const revalidation = { owner, controller };
      focusRevalidationRef.current = revalidation;
      void Promise.resolve(apiFetch<unknown>('/practice/question', { signal: controller.signal }))
        .then(parsePracticeQuestion)
        .then((canonical) => {
          if (
            controller.signal.aborted ||
            !renderOwnsWork() ||
            navigationStartedRef.current ||
            interactionLockedNow() ||
            focusRevalidationRef.current !== revalidation
          ) {
            return;
          }
          const stillCurrent = queryClient.getQueryData<PracticeQuestionPayload>(questionQueryKey);
          if (
            !stillCurrent ||
            stillCurrent.question.id !== source.questionId ||
            stillCurrent.cycleId !== source.cycleId ||
            stillCurrent.attemptsUsed !== source.attemptsUsed
          ) {
            return;
          }
          queryClient.setQueryData(questionQueryKey, canonical);
          if (canonical.question.cefrLevel !== user?.cefrLevel) {
            void queryClient.invalidateQueries({ queryKey: ['me'] });
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (focusRevalidationRef.current === revalidation) {
            focusRevalidationRef.current = null;
          }
        });
    }, 0);
    return () => clearTimeout(task);
  }, [
    interactionLockedNow,
    queryClient,
    questionQueryKey,
    renderOwner,
    renderOwnsWork,
    user?.cefrLevel,
  ]);
  const publishNavigationLock = useCallback(() => {
    if (!mountedRef.current || !focusedRef.current) return;
    navigation.setOptions(
      navigationLockedNow()
        ? { headerBackVisible: false, gestureEnabled: false }
        : { headerBackVisible: true, gestureEnabled: true },
    );
    // Mirror the same lock for the bottom tab bar and the Home header
    // Settings action: they sit outside this stack, where a tab switch or a
    // pushed Settings screen would blur it and let Recorder cleanup discard
    // a held take. Synchronous with the ref above, so there is no pre-render
    // window in which the bar stays tappable.
    setPracticeExitLocked(navigationLockedNow());
  }, [navigationLockedNow, navigation]);

  // Practice is one tab among four. Leaving is a normal exit, except while a
  // recording, upload, or recovery is active — leaving then would let blur
  // cleanup discard the take. Hardware back, header back, the iOS swipe
  // gesture, and (via the shared exit lock) the other tabs and the Home
  // header Settings action all follow the same lock.
  useHardwareBack(navigationLockedNow);
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      navigationStartedRef.current = false;
      setFocusEpoch((current) => current + 1);
      publishNavigationLock();
      const cancelScheduledRevalidation = scheduleFocusRevalidation();
      return () => {
        cancelScheduledRevalidation();
        cancelFocusRevalidation();
        focusedRef.current = false;
        navigationStartedRef.current = true;
        // Only the focused screen may hold the tab bar's exit lock.
        setPracticeExitLocked(false);
      };
    }, [cancelFocusRevalidation, publishNavigationLock, scheduleFocusRevalidation]),
  );

  // Replacing a question inside this long-lived route must also replace the
  // learner's visual and VoiceOver context. Include cycleId because a resumed
  // serving can legitimately reuse the same word under a new hard try budget.
  const accessibleQuestionKey =
    question && cycleId && introSeen === true ? `${renderOwner}:${question.id}:${cycleId}` : null;
  const accessibleQuestionAnnouncement =
    question && accessibleQuestionKey ? `${question.promptWord}. ${question.questionText}` : null;
  const lastAccessibleQuestionRef = useRef<string | null>(null);
  useEffect(() => {
    void focusEpoch;
    if (!focusedRef.current || !isSessionLeaseCurrent(sessionLease)) return;
    if (!accessibleQuestionKey || !accessibleQuestionAnnouncement) {
      lastAccessibleQuestionRef.current = null;
      return;
    }
    if (lastAccessibleQuestionRef.current === accessibleQuestionKey) return;
    const hadPreviousQuestion = lastAccessibleQuestionRef.current !== null;
    lastAccessibleQuestionRef.current = accessibleQuestionKey;
    if (hadPreviousQuestion) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibilityWithOptions(accessibleQuestionAnnouncement, {
        queue: true,
      });
    }
  }, [
    accessibleQuestionAnnouncement,
    accessibleQuestionKey,
    focusEpoch,
    isSessionLeaseCurrent,
    sessionLease,
  ]);
  const claimNavigation = useCallback(() => {
    if (navigationStartedRef.current || navigationLockedNow() || !renderOwnsWork()) return false;
    cancelFocusRevalidation();
    navigationStartedRef.current = true;
    return true;
  }, [cancelFocusRevalidation, navigationLockedNow, renderOwnsWork]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      // Header back and the native swipe gesture dispatch GO_BACK. Read the
      // synchronous recorder ref so an event already queued in the lock's
      // pre-render window cannot discard the take. Route-gate resets and the
      // recorder's deliberate dismiss flows remain free to remove the screen.
      if (navigationLockedNow() && event.data.action.type === 'GO_BACK') {
        event.preventDefault();
        return;
      }
      // Once any permitted removal begins, the old route may stay focused for
      // part of the transition. Retire its background canonical refresh now so
      // it cannot publish into a screen that is already leaving.
      navigationStartedRef.current = true;
      cancelFocusRevalidation();
    });
    return unsubscribe;
  }, [cancelFocusRevalidation, navigationLockedNow, navigation]);
  useLayoutEffect(() => {
    publishNavigationLock();
  }, [navigationLocked, publishNavigationLock]);

  // A new submission owns the inline space again: clear the old wait line the
  // moment the recorder locks for the next take.
  const handleLockChange = useCallback(
    (locked: boolean) => {
      if (!recorderOwnsWork(recorderOwner)) return;
      if (locked) cancelFocusRevalidation();
      recorderLockedRef.current = locked;
      recorderExitLockedRef.current = locked;
      // Close the pre-render window for native header/gesture exits as well as
      // the custom controls below. Recorder publishes its lock synchronously,
      // so the navigator can consume it before React commits disabled props.
      setRecorderLockState({ owner: recorderOwner, locked });
      setRecorderExitLockState({ owner: recorderOwner, locked });
      if (locked) setRateLimitNotice(null);
      publishNavigationLock();
    },
    [cancelFocusRevalidation, publishNavigationLock, recorderOwner, recorderOwnsWork],
  );
  const handleExitLockChange = useCallback(
    (locked: boolean) => {
      if (!recorderOwnsWork(recorderOwner)) return;
      recorderExitLockedRef.current = locked;
      setRecorderExitLockState({ owner: recorderOwner, locked });
      publishNavigationLock();
    },
    [publishNavigationLock, recorderOwner, recorderOwnsWork],
  );

  const handleResult = (result: PracticeOutcome, metadata: RecorderResultMetadata) => {
    const owner = recorderOwner;
    if (
      !user ||
      !question ||
      !recorderOwnsWork(owner) ||
      navigationStartedRef.current ||
      handledResultRequestIdsRef.current.has(metadata.requestId)
    ) {
      return;
    }
    handledResultRequestIdsRef.current.add(metadata.requestId);
    handledResultRequestIdsRef.current = new Set(
      [...handledResultRequestIdsRef.current].slice(-MAX_HANDLED_RESULT_REQUEST_IDS),
    );
    cancelFocusRevalidation();
    navigationStartedRef.current = true;
    void queryClient.cancelQueries({ queryKey: questionQueryKey, exact: true });
    setRateLimitNotice(null);
    applyFailedAttemptToQuestionCache(queryClient, user, question.id, result);
    if (result.recordingId) {
      void queryClient.invalidateQueries({ queryKey: ['recordings', user.id] });
    }
    showFeedback(question.id, result, question, metadata.requestId);
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
    cancelFocusRevalidation();
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
      !cycleId ||
      !recorderOwnsWork(owner) ||
      navigationStartedRef.current ||
      skipBusyRef.current ||
      recorderLockedRef.current
    ) {
      return;
    }
    skipBusyRef.current = true;
    cancelFocusRevalidation();
    setSkipBusy(true);
    publishNavigationLock();
    try {
      await apiSkipPracticeWord(question.id, cycleId);
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
      if (isClosedPracticeCycle(error)) {
        if (recorderOwnsWork(owner) && !navigationStartedRef.current) {
          setRateLimitNotice(null);
          // Another request/device already advanced this serving cycle, or
          // changed placement/level state. Revalidate both authorities: the
          // question refresh replaces a same-level stale assignment, while
          // /auth/me lets the persistent profile bridge move the route/cache
          // key when the learner's placement or CEFR level changed.
          const [refetched] = await Promise.all([
            questionQuery.refetch({ cancelRefetch: false }),
            queryClient.invalidateQueries({ queryKey: ['me'] }),
          ]);
          if (refetched.isError && recorderOwnsWork(owner) && !navigationStartedRef.current) {
            Alert.alert(
              t('practice.skipFailedTitle'),
              userMessageForError(refetched.error, t('practice.loadFailed')),
            );
          }
        }
        return;
      }
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

  // The route gate will redirect after logout/session expiry. Avoid showing a
  // disabled-query loading state during that transition.
  if (!user) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {user && <Text style={styles.greeting}>{t('practice.greeting', { name: user.name })}</Text>}

        {!question &&
          questionQuery.isPending &&
          (questionQuery.fetchStatus === 'paused' ? (
            <OfflineState />
          ) : (
            // The skeleton mirrors the served card: badge row, hero word,
            // question lines. The recorder stays absent until a real question
            // owns the surface.
            <View style={styles.questionSkeleton} testID="practice-question-skeleton">
              {/* Visually hidden but kept in the accessibility tree: Android
                  announces it via the live region, iOS VoiceOver can focus it
                  (live regions alone are not announced there). */}
              <Text accessibilityLiveRegion="polite" style={styles.hiddenLoadingText}>
                {t('practice.loadingQuestion')}
              </Text>
              <View style={styles.skeletonBadgeRow}>
                <Skeleton width={44} height={22} borderRadius={8} />
                <Skeleton width={72} height={22} borderRadius={8} />
                <Skeleton width={64} height={22} borderRadius={8} />
              </View>
              <Skeleton width="55%" height={40} borderRadius={10} testID="practice-skeleton-word" />
              <Skeleton height={18} />
              <Skeleton height={18} width="82%" />
              <Skeleton height={18} width="70%" />
            </View>
          ))}

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

        {question && introSeen === null && (
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
            <Text style={styles.introLine}>{t('practiceIntro.native')}</Text>
            <Button
              title={t('practiceIntro.dismiss')}
              onPress={dismissIntro}
              style={styles.retryButton}
            />
          </View>
        )}

        {question && introSeen === true && (
          <>
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
                {attemptsUsed !== undefined && (
                  <View style={styles.attemptChip}>
                    <Text style={styles.attemptChipText}>
                      {t('practice.attemptChip', {
                        current: attemptsUsed + 1,
                        max: PRACTICE_MAX_ATTEMPTS,
                      })}
                    </Text>
                  </View>
                )}
              </View>
              {/* The prompt word is the hero of this screen; everything else is
                  supporting metadata so a learner reads the word first. */}
              <Text style={styles.cardLabel}>{t('label.word')}</Text>
              <Text
                accessibilityLanguage="en-US"
                accessibilityRole="header"
                style={styles.promptWord}
              >
                {question.promptWord}
              </Text>
              <View style={styles.questionHeadingRow}>
                <Text style={[styles.cardLabel, styles.questionCardLabel]}>
                  {t('label.question')}
                </Text>
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
                      params: {
                        questionId: question.id,
                        cycleId,
                        attemptsUsed: String(attemptsUsed),
                      },
                    });
                  }}
                >
                  <Icon name="help" size={22} color={theme.colors.onPrimary} strokeWidth={2.2} />
                </Pressable>
              </View>
              {/* The served card persists across questions, so its live region
                  announces each replacement to TalkBack; the announcement
                  effect below covers VoiceOver. */}
              <Text
                accessibilityLiveRegion="polite"
                accessibilityLanguage="en-US"
                style={styles.questionText}
              >
                {question.questionText}
              </Text>
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
                  cancelFocusRevalidation();
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
                key={`${cycleId}:${nativeMode ? 'native' : 'english'}`}
                ownerId={user.id}
                questionId={question.id}
                cycleId={cycleId}
                disabled={skipBusy}
                isStartBlocked={() => skipBusyRef.current}
                endpoint={nativeMode ? '/practice/attempt/native' : '/practice/attempt'}
                parseResult={(raw) =>
                  nativeMode
                    ? parseNativeAttemptResult(raw, cycleId)
                    : parseAttemptResult(raw, cycleId)
                }
                onResultWithMetadata={handleResult}
                onError={handleError}
                onRateLimited={handleRateLimited}
                onRecoveryUnresolved={handleRecoveryUnresolved}
                onRecoveryEndpointMismatch={handleRecoveryEndpointMismatch}
                onInteractionLockChange={handleLockChange}
                onExitLockChange={handleExitLockChange}
                onExpandedControlsLayout={revealExpandedRecorderControls}
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
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing, elevation }) => ({
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
    // No bottom safe-area padding by design: the bottom tab bar (not this
    // screen's footer, removed by the redesign) owns insets.bottom for every
    // tab screen, so scroll content stops above the bar itself.
  },
  center: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionSkeleton: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hiddenLoadingText: {
    height: 0,
    opacity: 0,
  },
  greeting: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
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
    width: layout.minimumTarget,
    height: layout.minimumTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.raised,
  },
  helpButtonPressed: {
    backgroundColor: colors.primaryDark,
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
    flexWrap: 'wrap',
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
  questionHeadingRow: {
    marginTop: spacing.md,
    minHeight: layout.minimumTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  questionCardLabel: {
    marginTop: 0,
    flexShrink: 1,
  },
  promptWord: {
    marginTop: spacing.xs,
    fontSize: 34,
    lineHeight: 41,
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
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
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
}));
