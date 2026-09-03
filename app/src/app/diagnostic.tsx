import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';

import Button from '../components/Button';
import Confetti from '../components/Confetti';
import Icon from '../components/Icon';
import OfflineState from '../components/OfflineState';
import ProgressBar from '../components/ProgressBar';
import WordTaggedTranscript from '../components/WordTaggedTranscript';
import Recorder, {
  scrollToExpandedRecorderControls,
  type RecorderResultMetadata,
} from '../components/Recorder';
import { apiAcknowledgeDiagnostic, apiFetch, userMessageForError } from '../lib/api';
import { useAssessmentReplay } from '../lib/assessment-replay-provider';
import { LogoutCleanupError, useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { acknowledgePendingAssessmentFeedback } from '../lib/pending-assessment';
import { createThemedStyles, spacing, useTheme } from '../lib/theme';
import {
  parseDiagnosticAnswerResult,
  parseDiagnosticNext,
  type CefrLevel,
  type DiagnosticAnswerSummary,
  type DiagnosticAnswerResult,
  type Question,
} from '../lib/types';
import { useHardwareBack } from '../lib/use-hardware-back';

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
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const identityKey = `${sessionVersion}:${userId ?? 'anonymous'}`;
  const activeIdentityRef = useRef<string | null>(identityKey);
  const { diagnosticReplay, clearDiagnosticReplay } = useAssessmentReplay();
  const sessionLease = useMemo(() => {
    void identityKey;
    return captureSessionLease();
  }, [captureSessionLease, identityKey]);
  // The provider is identity-scoped, and this local binding prevents a replay
  // object retained by a stale provider render from being adopted after an
  // account/session switch. A genuinely new replay object binds to the current
  // identity when first observed.
  const [replayBinding, setReplayBinding] = useState<{
    identity: string;
    replay: NonNullable<typeof diagnosticReplay>;
  } | null>(null);
  let activeReplayBinding = replayBinding;
  if (diagnosticReplay && replayBinding?.replay !== diagnosticReplay) {
    activeReplayBinding = { identity: identityKey, replay: diagnosticReplay };
    setReplayBinding(activeReplayBinding);
  }
  const currentDiagnosticReplay =
    diagnosticReplay &&
    activeReplayBinding?.replay === diagnosticReplay &&
    activeReplayBinding.identity === identityKey &&
    userId &&
    isSessionLeaseCurrent(sessionLease)
      ? diagnosticReplay
      : null;

  const [question, setQuestion] = useState<Question | null>(
    () => currentDiagnosticReplay?.question ?? null,
  );
  const [progress, setProgress] = useState<DiagnosticProgress | null>(null);
  const [result, setResult] = useState<DiagnosticAnswerResult | null>(
    () => currentDiagnosticReplay?.result ?? null,
  );
  const [resultRequestId, setResultRequestId] = useState<string | null>(
    () => currentDiagnosticReplay?.requestId ?? null,
  );
  const [level, setLevel] = useState<CefrLevel | null>(null);
  // One-shot per test state: tapping Start hides the intro for this session.
  // A resumed test (asked > 0) never shows it, so resuming is not blocked.
  const [introStarted, setIntroStarted] = useState(() => currentDiagnosticReplay !== null);
  const [answers, setAnswers] = useState<DiagnosticAnswerSummary[]>([]);
  const [stateIdentity, setStateIdentity] = useState(identityKey);
  const recorderLockedRef = useRef(false);
  const [recorderExitLocked, setRecorderExitLocked] = useState(false);
  const recorderExitLockedRef = useRef(false);
  const logoutBusyRef = useRef(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const practiceStartRef = useRef(false);
  const [practiceStartBusy, setPracticeStartBusy] = useState(false);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const accountActionRef = useRef(true);
  const activeRecorderOwnerRef = useRef<string | null>(null);
  const recoveryRefreshRef = useRef<string | null>(null);
  const questionScrollRef = useRef<ScrollView>(null);
  // Mirrors the on-screen answer card for the /next effect below (effects must
  // not depend on `result`, or clearing it would reapply the stale question).
  // Mutate it at the same time as state: a passive-effect mirror leaves a
  // commit-sized window where a background refetch or a queued acknowledgement
  // can still act on the result React has already accepted.
  const resultRef = useRef<DiagnosticAnswerResult | null>(currentDiagnosticReplay?.result ?? null);
  const resultRequestIdRef = useRef<string | null>(currentDiagnosticReplay?.requestId ?? null);
  const replayResultRequestIdRef = useRef<string | null>(
    currentDiagnosticReplay?.requestId ?? null,
  );
  const seededReplayKeyRef = useRef<string | null>(null);
  const resultActionClaimRef = useRef<DiagnosticAnswerResult | null>(null);
  const resultActionBusyRef = useRef(false);
  const [resultActionBusy, setResultActionBusy] = useState(false);
  const [resultActionError, setResultActionError] = useState(false);
  // Localized "when can I try again" line from a 429/DAILY_LIMIT rejection,
  // rendered inline above the recorder instead of only in a passing alert.
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);

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
    resultRequestIdRef.current = null;
    setResultRequestId(null);
    replayResultRequestIdRef.current = null;
    seededReplayKeyRef.current = null;
    resultActionClaimRef.current = null;
    resultActionBusyRef.current = false;
    setResultActionBusy(false);
    setResultActionError(false);
    setLevel(null);
    setIntroStarted(false);
    setAnswers([]);
    setRateLimitNotice(null);
    practiceStartRef.current = false;
    setPracticeStartBusy(false);
    recorderLockedRef.current = false;
    recorderExitLockedRef.current = false;
    setRecorderExitLocked(false);
    logoutBusyRef.current = false;
    setLogoutBusy(false);
    accountActionRef.current = !focusedRef.current;
    recoveryRefreshRef.current = null;
    return () => {
      if (activeIdentityRef.current === identityKey) activeIdentityRef.current = null;
    };
  }, [identityKey]);

  // The provider normally publishes before routing here, but a same-route
  // retry can deliver after this screen is already mounted. A layout seed
  // keeps the replay card ahead of the passive /next observer in both cases.
  useLayoutEffect(() => {
    if (!currentDiagnosticReplay) return;
    const replayKey = `${identityKey}:${currentDiagnosticReplay.requestId}`;
    if (seededReplayKeyRef.current === replayKey) return;
    seededReplayKeyRef.current = replayKey;
    activeIdentityRef.current = identityKey;
    setStateIdentity(identityKey);
    setQuestion(currentDiagnosticReplay.question);
    setProgress(null);
    resultRef.current = currentDiagnosticReplay.result;
    setResult(currentDiagnosticReplay.result);
    resultRequestIdRef.current = currentDiagnosticReplay.requestId;
    setResultRequestId(currentDiagnosticReplay.requestId);
    replayResultRequestIdRef.current = currentDiagnosticReplay.requestId;
    resultActionClaimRef.current = null;
    resultActionBusyRef.current = false;
    setResultActionBusy(false);
    setResultActionError(false);
    setLevel(null);
    setIntroStarted(true);
    setAnswers([]);
  }, [currentDiagnosticReplay, identityKey]);

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
    if (resultRef.current) {
      if (
        replayResultRequestIdRef.current !== null &&
        resultRequestIdRef.current === replayResultRequestIdRef.current
      ) {
        // The canonical endpoint has already advanced beyond this replayed
        // answer. Keep the original question/result card visible, while using
        // canonical history and one-step-prior progress behind that card.
        setStateIdentity(identityKey);
        setAnswers(data.answers ?? []);
        setProgress(
          data.done
            ? null
            : {
                ...data.progress,
                asked: resultRef.current.noSpeech
                  ? data.progress.asked
                  : Math.max(0, data.progress.asked - 1),
              },
        );
      }
      return;
    }
    // An unacknowledged answer card outranks a background refetch: the stale
    // /next response (pre-answer state) must not skip the learner past the
    // result they have not acknowledged. advance() applies the next question
    // locally when they continue.
    setStateIdentity(identityKey);
    resultRef.current = null;
    setResult(null);
    resultRequestIdRef.current = null;
    setResultRequestId(null);
    replayResultRequestIdRef.current = null;
    resultActionClaimRef.current = null;
    resultActionBusyRef.current = false;
    setResultActionBusy(false);
    setResultActionError(false);
    if (data.done) {
      setQuestion(null);
      setProgress(null);
      setLevel(data.level);
      setAnswers(data.answers ?? []);
    } else {
      setLevel(null);
      setQuestion(data.question);
      setProgress(data.progress);
      setAnswers(data.answers ?? []);
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
  const currentResultRequestId = stateIdentity === identityKey ? resultRequestId : null;
  // Each step replaces content inside one route. Give the visible step a
  // stable identity so visual position and VoiceOver context advance with it.
  const showIntro =
    currentQuestion !== null &&
    !introStarted &&
    !currentResult &&
    (currentProgress?.asked ?? 0) === 0;
  const accessibleStepKey = currentLevel
    ? `${identityKey}:level:${currentLevel}`
    : currentResult
      ? `${identityKey}:result:${currentQuestion?.id ?? 'none'}:${currentResult.noSpeech}:${currentResult.done}`
      : currentQuestion
        ? `${identityKey}:${showIntro ? 'intro' : 'question'}:${currentQuestion.id}`
        : null;
  const accessibleStepAnnouncement = currentLevel
    ? `${t('diag.completeTitle')}. ${t('diag.levelIntro')} ${currentLevel}.`
    : currentResult
      ? currentResult.noSpeech
        ? `${t('diag.noSpeechTitle')}. ${currentResult.feedback}`
        : `${t('diag.answerCheckedTitle')}. ${t('diag.scoreLine', {
            score: currentResult.score,
            result: currentResult.passed ? t('diag.passed') : t('diag.notPassed'),
          })}`
      : currentQuestion
        ? `${
            currentProgress
              ? `${t('diag.progress', {
                  current: Math.min(currentProgress.asked + 1, currentProgress.maxQuestions),
                  max: currentProgress.maxQuestions,
                })}. `
              : ''
          }${currentQuestion.promptWord}. ${currentQuestion.questionText}`
        : null;
  const lastAccessibleStepRef = useRef<string | null>(null);
  useEffect(() => {
    if (!accessibleStepKey || !accessibleStepAnnouncement) {
      lastAccessibleStepRef.current = null;
      return;
    }
    if (lastAccessibleStepRef.current === accessibleStepKey) return;
    const hadPreviousStep = lastAccessibleStepRef.current !== null;
    lastAccessibleStepRef.current = accessibleStepKey;
    if (hadPreviousStep) {
      questionScrollRef.current?.scrollTo({ y: 0, animated: false });
    }
    // Android receives the authored live-region updates in the result card,
    // the question card, and the completion reveal. VoiceOver does not
    // implement live regions, so queue the same transition.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibilityWithOptions(accessibleStepAnnouncement, {
        queue: true,
      });
    }
  }, [accessibleStepAnnouncement, accessibleStepKey]);

  // The level reveal is this screen's one celebration; keep it to a single
  // success haptic per reveal and re-arm whenever the level clears (identity
  // reset, or advancing off a completion). Haptics are best effort
  // (web/simulator).
  const levelRevealHapticRef = useRef(false);
  useEffect(() => {
    if (!currentLevel) {
      levelRevealHapticRef.current = false;
      return;
    }
    if (levelRevealHapticRef.current) return;
    levelRevealHapticRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [currentLevel]);

  const recorderOwner = currentQuestion !== null ? `${identityKey}:${currentQuestion.id}` : null;

  useLayoutEffect(() => {
    activeRecorderOwnerRef.current = recorderOwner;
    recoveryRefreshRef.current = null;
    recorderLockedRef.current = false;
    recorderExitLockedRef.current = false;
    setRecorderExitLocked(false);
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
  const revealExpandedRecorderControls = useCallback(() => {
    scrollToExpandedRecorderControls(questionScrollRef.current, recorderOwnsWork(recorderOwner));
  }, [recorderOwner, recorderOwnsWork]);

  const handleResult = (data: DiagnosticAnswerResult, metadata?: RecorderResultMetadata) => {
    if (!recorderOwnsWork(recorderOwner) || resultRef.current !== null) return;
    // A new submission owns the inline space again: clear the old wait line.
    setRateLimitNotice(null);
    resultRef.current = data;
    resultRequestIdRef.current = metadata?.requestId ?? null;
    replayResultRequestIdRef.current = null;
    setResultRequestId(metadata?.requestId ?? null);
    resultActionClaimRef.current = null;
    resultActionBusyRef.current = false;
    setResultActionBusy(false);
    setResultActionError(false);
    void queryClient.cancelQueries({
      queryKey: ['diagnostic-next', sessionVersion, userId],
      exact: true,
    });
    if (data.recordingId && userId) {
      void queryClient.invalidateQueries({ queryKey: ['recordings', userId] });
    }
    setResult(data);
    if (!data.noSpeech && currentQuestion) {
      setAnswers((previous) => [
        ...previous,
        {
          attemptNo: previous.length + 1,
          promptWord: currentQuestion.promptWord,
          questionText: currentQuestion.questionText,
          transcript: data.transcript,
          score: data.score,
          passed: data.passed,
          feedback: data.feedback,
        },
      ]);
    }
  };

  const handleError = (message: string) => {
    if (!recorderOwnsWork(recorderOwner) || resultRef.current !== null) return;
    Alert.alert(t('diag.assessFailedTitle'), message);
  };

  const handleRateLimited = (message: string) => {
    if (!recorderOwnsWork(recorderOwner) || resultRef.current !== null) return;
    setRateLimitNotice(message);
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
      // A fresh take owns the inline wait line: retire it the moment the
      // recorder locks for the next attempt.
      if (locked) setRateLimitNotice(null);
      recorderLockedRef.current = locked;
      recorderExitLockedRef.current = locked;
      setRecorderExitLocked(locked);
    },
    [recorderOwner, recorderOwnsWork],
  );
  const handleRecorderExitLockChange = useCallback(
    (locked: boolean) => {
      if (!recorderOwnsWork(recorderOwner)) return;
      if (locked && resultRef.current !== null) return;
      recorderExitLockedRef.current = locked;
      setRecorderExitLocked(locked);
    },
    [recorderOwner, recorderOwnsWork],
  );

  const handleSettings = () => {
    if (
      !renderOwnsWork() ||
      recorderExitLockedRef.current ||
      logoutBusyRef.current ||
      practiceStartRef.current ||
      resultActionBusyRef.current ||
      accountActionRef.current
    ) {
      return;
    }
    accountActionRef.current = true;
    router.navigate('/settings');
  };

  const logoutBlocked = () =>
    !renderOwnsWork() ||
    recorderExitLockedRef.current ||
    logoutBusyRef.current ||
    practiceStartRef.current ||
    resultActionBusyRef.current ||
    accountActionRef.current;

  const performLogout = async () => {
    // Every ownership guard is re-checked here: the confirmation alert below
    // leaves a backgrounding-sized gap before this body runs.
    if (logoutBlocked()) return;
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
      } else if (
        mountedRef.current &&
        focusedRef.current &&
        activeIdentityRef.current === identityKey &&
        isSessionLeaseCurrent(sessionLease, { identityOnly: true })
      ) {
        // Auth intentionally invalidates the render lease while logout is in
        // flight. A failed request rearms leases asynchronously, so reporting
        // this same-identity failure must use the stable mounted identity.
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

  /** "Log out on all devices" ends every session at once: require an explicit
   * destructive confirmation. The same guard set fences the alert itself, and
   * the confirm press re-runs every ownership guard inside performLogout
   * after the alert gap. */
  const handleLogout = () => {
    if (logoutBlocked()) return;
    Alert.alert(t('settings.logOutConfirmTitle'), t('settings.logOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.logOut'), style: 'destructive', onPress: () => void performLogout() },
    ]);
  };

  const commitAdvance = (
    expectedResult: DiagnosticAnswerResult,
    expectedRequestId: string | null,
  ) => {
    if (
      !renderOwnsWork() ||
      resultRef.current !== expectedResult ||
      resultRequestIdRef.current !== expectedRequestId
    ) {
      return;
    }
    // Claim this exact card synchronously. A second tap delivered against the
    // old committed handler, or an even older handler replayed after a refetch,
    // is now a no-op rather than rewinding diagnostic state.
    resultActionClaimRef.current = null;
    resultActionBusyRef.current = false;
    setResultActionBusy(false);
    setResultActionError(false);
    resultRef.current = null;
    resultRequestIdRef.current = null;
    replayResultRequestIdRef.current = null;
    setResultRequestId(null);
    if (expectedResult.noSpeech) {
      setResult(null);
      return;
    }
    if (expectedResult.done) {
      const determinedLevel = expectedResult.level ?? null;
      setLevel(determinedLevel);
      setResult(null);
    } else if (expectedResult.nextQuestion) {
      setQuestion(expectedResult.nextQuestion);
      setProgress((prev) => (prev ? { ...prev, asked: prev.asked + 1 } : prev));
      setResult(null);
    }
  };

  const advance = () => {
    if (
      !renderOwnsWork() ||
      !currentResult ||
      resultRef.current !== currentResult ||
      resultActionClaimRef.current === currentResult
    ) {
      return;
    }
    const requestId = currentResultRequestId;
    resultActionClaimRef.current = currentResult;
    setResultActionError(false);
    if (!requestId) {
      commitAdvance(currentResult, requestId);
      return;
    }
    if (!userId) {
      resultActionClaimRef.current = null;
      setResultActionError(true);
      return;
    }

    resultActionBusyRef.current = true;
    setResultActionBusy(true);
    void (async () => {
      let acknowledged = false;
      try {
        acknowledged = await acknowledgePendingAssessmentFeedback(userId, requestId);
      } catch {
        // Secure storage details stay private; the result card exposes one safe
        // retry state below and remains the sole owner of this transition.
      }
      const resultStillBelongsToSession =
        mountedRef.current &&
        activeIdentityRef.current === identityKey &&
        isSessionLeaseCurrent(sessionLease) &&
        resultRef.current === currentResult &&
        resultRequestIdRef.current === requestId;
      if (!resultStillBelongsToSession) return;
      if (!acknowledged) {
        resultActionClaimRef.current = null;
        resultActionBusyRef.current = false;
        setResultActionBusy(false);
        setResultActionError(true);
        return;
      }
      clearDiagnosticReplay(requestId);
      if (!focusedRef.current) {
        // The pointer is durably gone, but route ownership was lost while the
        // delete was in flight. Rearm this same card as a legacy card so a
        // later refocus can finish without trying to delete it twice.
        resultRequestIdRef.current = null;
        replayResultRequestIdRef.current = null;
        setResultRequestId(null);
        resultActionClaimRef.current = null;
        resultActionBusyRef.current = false;
        setResultActionBusy(false);
        return;
      }
      commitAdvance(currentResult, requestId);
    })();
  };

  const startPracticing = async () => {
    if (
      practiceStartRef.current ||
      accountActionRef.current ||
      recorderLockedRef.current ||
      logoutBusyRef.current ||
      !renderOwnsWork() ||
      !user ||
      !currentLevel
    ) {
      return;
    }
    accountActionRef.current = true;
    practiceStartRef.current = true;
    setPracticeStartBusy(true);
    // Keep the diagnostic route protected until the completion screen has
    // actually been acknowledged; changing this earlier removes the screen.
    // A cross-device diagnostic restart can leave a cached pre-placement
    // stats response for this same account. This screen has no active stats
    // observer, so retire it here before Home mounts at the new level rather
    // than removing Home's own live query during a route-gate transition.
    try {
      await apiAcknowledgeDiagnostic();
      if (!renderOwnsWork()) return;
      queryClient.removeQueries({ queryKey: ['practice-stats'] });
      setUser({
        ...user,
        diagnosticCompleted: true,
        diagnosticAcknowledged: true,
        cefrLevel: currentLevel,
      });
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      router.replace('/');
    } catch (error) {
      if (renderOwnsWork()) {
        Alert.alert(t('diag.ackFailedTitle'), userMessageForError(error, t('diag.ackFailed')));
        practiceStartRef.current = false;
        accountActionRef.current = false;
      }
    } finally {
      if (mountedRef.current && activeIdentityRef.current === identityKey) {
        setPracticeStartBusy(false);
      }
    }
  };

  const accountActionsLocked =
    recorderExitLocked || logoutBusy || practiceStartBusy || resultActionBusy;
  const renderAccountActions = () => (
    <View style={styles.accountActions}>
      <Button
        title={t('header.settings')}
        variant="secondary"
        size="sm"
        accessibilityHint={recorderExitLocked ? t('hint.finishRecordingFirst') : undefined}
        disabled={accountActionsLocked}
        onPress={handleSettings}
      />
      <Button
        title={t('common.logOut')}
        variant="secondary"
        size="sm"
        accessibilityHint={recorderExitLocked ? t('hint.finishRecordingFirst') : undefined}
        disabled={accountActionsLocked}
        onPress={handleLogout}
      />
    </View>
  );

  // Settings and "Log out on all devices" are pinned as a fixed bottom bar in
  // every state that shows them: the learner can always reach the account
  // exits without scrolling past a long completion reveal. Only the placement
  // moved — every gating semantic (locks, hints, confirmation, busy latches)
  // stays with renderAccountActions above.
  const renderAccountFooter = () => (
    <View
      testID="diagnostic-account-footer"
      style={[styles.accountFooter, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      {renderAccountActions()}
    </View>
  );

  // ----- Loading / error states -----
  if (!user) return null;

  if (!currentLevel && !currentQuestion) {
    if (nextQuery.isPending) {
      return (
        <View style={styles.screen}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.centerScroll}
          >
            {nextQuery.fetchStatus === 'paused' ? (
              <OfflineState />
            ) : (
              <>
                <ActivityIndicator
                  accessibilityLabel={t('diag.preparing')}
                  size="large"
                  color={theme.colors.primary}
                />
                <Text accessibilityLiveRegion="polite" style={styles.muted}>
                  {t('diag.preparing')}
                </Text>
              </>
            )}
          </ScrollView>
          {renderAccountFooter()}
        </View>
      );
    }
    if (nextQuery.isError) {
      return (
        <View style={styles.screen}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.centerScroll}
          >
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
          </ScrollView>
          {renderAccountFooter()}
        </View>
      );
    }
  }

  // ----- Done: congrats view with the per-answer reveal -----
  if (currentLevel) {
    return (
      <View style={styles.screen}>
        <ScrollView
          ref={questionScrollRef}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.centerScroll}
        >
          <Confetti testID="diagnostic-confetti" />
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="diagnostic-complete-badge"
            style={styles.congratsBadge}
          >
            <Icon name="trophy" size={38} color={theme.colors.onAccent} strokeWidth={2.1} />
          </View>
          {/* Live region gives TalkBack the same level-reveal transition iOS
            receives through the queued step announcement below. */}
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="header"
            style={styles.congratsTitle}
          >
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
                <View key={answer.attemptNo} style={styles.answerSummary}>
                  <Text style={styles.answerLine}>
                    {t('diag.answerLine', {
                      number: index + 1,
                      score: answer.score,
                      mark: answer.passed ? '✓' : '✗',
                    })}
                  </Text>
                  <Text style={styles.answerQuestion}>
                    {t('diag.answerQuestion', {
                      word: answer.promptWord,
                      question: answer.questionText,
                    })}
                  </Text>
                  <Text style={styles.resultLabel}>{t('diag.transcriptLabel')}</Text>
                  <Text accessibilityLanguage="en-US" selectable style={styles.answerDetail}>
                    {answer.transcript}
                  </Text>
                  <Text style={styles.resultLabel}>{t('feedback.feedbackLabel')}</Text>
                  <Text accessibilityLanguage="en-US" style={styles.answerDetail}>
                    {answer.feedback}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.congratsHint}>{t('diag.levelHint')}</Text>
          <Button
            title={practiceStartBusy ? t('diag.startPracticingBusy') : t('diag.startPracticing')}
            fullWidth
            disabled={practiceStartBusy}
            loading={practiceStartBusy}
            onPress={() => void startPracticing()}
            style={styles.primaryAction}
          />
        </ScrollView>
        {renderAccountFooter()}
      </View>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  // The intro shows once per fresh test, before the first question. A resumed
  // test (asked > 0) goes straight to its question.
  // Keep the result branch safe even when mutation testing deliberately forces
  // it with no result. The outer rendering selector is then rejected by direct
  // mount-state assertions instead of cascading through a null dereference.
  const resultActionTitle =
    currentResult?.noSpeech === true
      ? t('diag.recordAgain')
      : currentResult?.done === true
        ? t('diag.seeLevel')
        : t('diag.nextQuestion');

  // ----- Question view -----
  return (
    <View style={styles.screen}>
      <ScrollView
        ref={questionScrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}
      >
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
              <>
                <Text style={styles.progressText}>
                  {t('diag.progress', {
                    current: Math.min(currentProgress.asked + 1, currentProgress.maxQuestions),
                    max: currentProgress.maxQuestions,
                  })}
                </Text>
                <View style={styles.progressBar}>
                  <ProgressBar
                    progress={
                      currentProgress.maxQuestions > 0
                        ? Math.min(1, currentProgress.asked / currentProgress.maxQuestions)
                        : 0
                    }
                    accessibilityLabel={t('header.diagnostic')}
                    fill={theme.colors.primary}
                    testID="diagnostic-progress"
                  />
                </View>
              </>
            )}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('label.word')}</Text>
              <Text accessibilityLanguage="en-US" style={styles.promptWord}>
                {currentQuestion.promptWord}
              </Text>
              <Text style={styles.cardLabel}>{t('label.question')}</Text>
              {/* TalkBack learns a new question was served through this live
                region; the announcement effect below covers VoiceOver, which
                does not implement live regions. */}
              <Text
                accessibilityLiveRegion="polite"
                accessibilityLanguage="en-US"
                style={styles.questionText}
              >
                {currentQuestion.questionText}
              </Text>
            </View>

            {currentResult ? (
              <View accessibilityLiveRegion="polite" style={styles.resultCard}>
                <Text accessibilityRole="header" style={styles.resultTitle}>
                  {currentResult.noSpeech ? t('diag.noSpeechTitle') : t('diag.answerCheckedTitle')}
                </Text>
                {currentResult.noSpeech ? (
                  <Text accessibilityLanguage="en-US" style={styles.resultText}>
                    {currentResult.feedback}
                  </Text>
                ) : (
                  <>
                    <Text style={styles.scoreText}>
                      {t('diag.scoreLine', {
                        score: currentResult.score,
                        result: currentResult.passed ? t('diag.passed') : t('diag.notPassed'),
                      })}
                    </Text>
                    <Text style={styles.resultLabel}>{t('diag.transcriptLabel')}</Text>
                    <WordTaggedTranscript
                      transcript={currentResult.transcript}
                      wordScores={currentResult.wordScores}
                      accessibilityLanguage="en-US"
                      testID="diagnostic-word-transcript"
                    />
                    <Text style={styles.resultLabel}>{t('feedback.feedbackLabel')}</Text>
                    <Text accessibilityLanguage="en-US" style={styles.feedbackText}>
                      {currentResult.feedback}
                    </Text>
                  </>
                )}
                <Button
                  title={resultActionTitle}
                  fullWidth
                  disabled={resultActionBusy}
                  loading={resultActionBusy}
                  onPress={() => void advance()}
                  style={styles.primaryAction}
                />
                {resultActionError && (
                  <Text accessibilityRole="alert" style={styles.resultActionError}>
                    {t('boundary.body')}
                  </Text>
                )}
              </View>
            ) : (
              <>
                {rateLimitNotice && (
                  <View style={styles.rateLimitCard}>
                    <Text accessibilityRole="alert" style={styles.rateLimitText}>
                      {rateLimitNotice}
                    </Text>
                  </View>
                )}
                <Recorder
                  ownerId={user.id}
                  questionId={currentQuestion.id}
                  // Mirror the practice screen: a logout already in flight must not
                  // admit a new take while the auth epoch is being torn down. The
                  // state prop disables the visible controls and the ref-backed
                  // guard blocks event-time starts inside the same commit.
                  disabled={logoutBusy}
                  isStartBlocked={() => logoutBusyRef.current}
                  endpoint="/diagnostic/answer"
                  parseResult={parseDiagnosticAnswerResult}
                  onResultWithMetadata={handleResult}
                  onError={handleError}
                  onRateLimited={handleRateLimited}
                  onRecoveryUnresolved={handleRecoveryUnresolved}
                  onInteractionLockChange={handleRecorderLockChange}
                  onExitLockChange={handleRecorderExitLockChange}
                  onExpandedControlsLayout={revealExpandedRecorderControls}
                />
              </>
            )}
          </>
        )}
      </ScrollView>

      {renderAccountFooter()}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing, type }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
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
  progressBar: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  progressText: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.muted,
  },
  accountActions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  accountFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
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
    lineHeight: 21,
    color: colors.muted,
  },
  scoreText: {
    marginTop: spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  resultLabel: {
    marginTop: spacing.lg,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  transcriptText: {
    marginTop: spacing.xs,
    fontSize: 17,
    lineHeight: 24,
    color: colors.text,
  },
  feedbackText: {
    marginTop: spacing.xs,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
  resultActionError: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  congratsBadge: {
    width: layout.outcomeBadge,
    height: layout.outcomeBadge,
    borderRadius: layout.outcomeBadge / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    marginBottom: spacing.sm,
  },
  congratsTitle: {
    marginTop: spacing.md,
    fontSize: type.titleLg.fontSize,
    lineHeight: type.titleLg.lineHeight,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  congratsText: {
    marginTop: spacing.ml,
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
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
    padding: spacing.lg,
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
  answerSummary: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerQuestion: {
    marginTop: spacing.xs,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    color: colors.text,
  },
  answerDetail: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  introLine: {
    marginTop: spacing.sm,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
  primaryAction: {
    marginTop: spacing.lg,
  },
}));
