import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { ActivityIndicator, AppState, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import { apiFetch, ApiError } from './api';
import { parseAssessmentReplayStatus } from './assessment-replay';
import { useAuth } from './auth';
import { useT } from './i18n';
import {
  clearPendingAssessmentIfRequestMatches,
  getPendingAssessmentReplayRevision,
  loadPendingAssessment,
  markPendingAssessmentFeedbackPending,
  pendingAssessmentFeedbackIsExpired,
  subscribeToPendingAssessmentReplay,
  type PendingAssessment,
} from './pending-assessment';
import { usePracticeFlow } from './practice-flow';
import { createThemedStyles, useTheme } from './theme';
import type { DiagnosticAnswerResult, Question } from './types';

export interface DiagnosticFeedbackReplay {
  requestId: string;
  question: Question;
  result: DiagnosticAnswerResult;
}

interface AssessmentReplayContextValue {
  diagnosticReplay: DiagnosticFeedbackReplay | null;
  clearDiagnosticReplay: (requestId: string) => void;
}

const AssessmentReplayContext = createContext<AssessmentReplayContextValue | null>(null);

type ReplayTarget = '/diagnostic' | '/practice/feedback';
type ReplayPhase = 'checking' | 'ready' | 'error' | 'deferred';

interface ReplayState {
  identity: string;
  checkKey: string;
  phase: ReplayPhase;
  target: ReplayTarget | null;
  diagnosticReplay: DiagnosticFeedbackReplay | null;
}

/**
 * Seeds the phase machine for one identity/checkKey pair. `shouldCheck`
 * decides between hiding children behind the 'checking' spinner and starting
 * 'ready' with no replay question to ask (signed out, still restoring, or a
 * skip-keyed run).
 */
function initialState(identity: string, checkKey: string, shouldCheck: boolean): ReplayState {
  return {
    identity,
    checkKey,
    phase: shouldCheck ? 'checking' : 'ready',
    target: null,
    diagnosticReplay: null,
  };
}

/**
 * Restores one completed assessment card from the server before Recorder can
 * start a competing recovery loop. Only request identity lives in SecureStore;
 * transcript and feedback remain server-side until this authenticated replay.
 */
export function AssessmentReplayProvider({ children }: { children: React.ReactNode }) {
  const {
    token,
    user,
    sessionVersion,
    isRestoring,
    restoreError,
    captureSessionLease,
    isSessionLeaseCurrent,
  } = useAuth();
  const { restoreFeedback } = usePracticeFlow();
  const queryClient = useQueryClient();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const [retryVersion, setRetryVersion] = useState(0);
  const pendingReplayRevision = useSyncExternalStore(
    subscribeToPendingAssessmentReplay,
    getPendingAssessmentReplayRevision,
    getPendingAssessmentReplayRevision,
  );
  const identity = `${sessionVersion}:${user?.id ?? 'anonymous'}`;
  // Key the effect on the identity scalar, not the user object: every /auth/me
  // refetch produces a new object reference, and re-running this check while
  // `phase === 'checking'` replaces children with the full-screen "Checking
  // your saved answer" spinner for no reason. sessionVersion in `identity`
  // still rotates the check on real account transitions.
  const userId = user?.id;
  const shouldCheck = !!token && !!user && !isRestoring && !restoreError;
  const checkKey = `${identity}:${shouldCheck ? 'check' : 'skip'}:${retryVersion}:${pendingReplayRevision}`;
  const [state, setState] = useState<ReplayState>(() =>
    initialState(identity, checkKey, shouldCheck),
  );
  const current =
    state.checkKey === checkKey ? state : initialState(identity, checkKey, shouldCheck);

  /**
   * Captures one auth session lease per identity. The lease — not render-time
   * state — fences every post-await decision in the check effect; `identity`
   * is read solely to recapture on real account/session rotation without
   * touching the lease on ordinary re-renders.
   */
  const sessionLease = useMemo(() => {
    void identity;
    return captureSessionLease();
  }, [captureSessionLease, identity]);

  /**
   * One durable-replay check per checkKey. The worker loads the pending
   * pointer, retires foreign/expired records, then GETs the delivered result
   * and publishes diagnostic replay state or hands practice feedback to the
   * flow. Invariant: every await revalidates via stillCurrent(), so abort,
   * unmount, logout, or a replaced SecureStore pointer drops all downstream
   * state side effects. Terminal 404/409 replies retire their pointer;
   * ambiguous failures surface an explicit retry/deferred choice instead of
   * an automatic loop.
   */
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let queriedPointer: Pick<PendingAssessment, 'requestId' | 'stage'> | null = null;
    if (!shouldCheck || userId === undefined) return () => controller.abort();

    /** True only while this run is uncancelled and still holds its session lease. */
    const stillCurrent = () =>
      active && !controller.signal.aborted && isSessionLeaseCurrent(sessionLease);
    /**
     * Retires the durable pointer when it still names `requestId` and resets
     * to ready; `refreshCanonical` also drops the diagnostic/practice question
     * caches so a retired request's stale prompt cannot flash once children
     * are exposed again.
     */
    const retireReplayPointer = async (requestId: string, refreshCanonical = true) => {
      // The clear is request-conditional, so a late terminal response can
      // never erase a newer handoff installed by Recorder or another screen.
      const retired = await clearPendingAssessmentIfRequestMatches(requestId);
      if (!stillCurrent()) return;
      if (!retired) {
        // A newer slot won the race. Change the check identity so this effect
        // is replaced and the provider processes that current pointer instead
        // of exposing children while it remains unresolved.
        setRetryVersion((version) => version + 1);
        return;
      }
      // Both assessment contexts can advance their canonical question after a
      // completed/retired request. Drop either cached snapshot before exposing
      // the protected app again.
      if (refreshCanonical) {
        queryClient.removeQueries({ queryKey: ['diagnostic-next'] });
        queryClient.removeQueries({ queryKey: ['practice-question'] });
      }
      setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
    };
    void (async () => {
      try {
        const pending = await loadPendingAssessment();
        if (!stillCurrent()) return;
        if (!pending) {
          setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
          return;
        }
        if (pending.ownerId !== userId) {
          await retireReplayPointer(pending.requestId, false);
          return;
        }
        if (pending.stage !== 'feedback-pending' && pending.stage !== 'reconcile') {
          setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
          return;
        }
        if (pendingAssessmentFeedbackIsExpired(pending)) {
          await retireReplayPointer(pending.requestId);
          return;
        }

        // Bind every later status/error decision to the pointer whose request
        // is actually being queried. The SecureStore slot may be replaced
        // while this request is in flight.
        queriedPointer = { requestId: pending.requestId, stage: pending.stage };
        const raw = await apiFetch<unknown>(
          `/assessments/${encodeURIComponent(pending.requestId)}`,
          { signal: controller.signal },
        );
        if (!stillCurrent()) return;
        const replay = parseAssessmentReplayStatus(raw, pending);
        if (replay.status === 'processing') {
          // A known-delivered answer remains this provider's responsibility:
          // keep a visible same-session path back to the GET-only check instead
          // of requiring a remount. Legacy reconcile work still belongs to
          // Recorder, whose bounded recovery may need to resume the POST.
          setState({
            ...initialState(identity, checkKey, false),
            phase: pending.stage === 'feedback-pending' ? 'deferred' : 'ready',
          });
          return;
        }
        if (
          !(await markPendingAssessmentFeedbackPending(
            pending.requestId,
            pending.stage === 'feedback-pending' ? pending.feedbackReadyAt! : Date.now(),
          ))
        ) {
          throw new Error('The saved feedback pointer changed');
        }
        if (!stillCurrent()) return;
        if (replay.context === 'diagnostic') {
          setState({
            identity,
            checkKey,
            phase: 'ready',
            target: '/diagnostic',
            diagnosticReplay: {
              requestId: pending.requestId,
              question: replay.question,
              result: replay.result,
            },
          });
          return;
        }
        restoreFeedback(replay.questionId, replay.result, replay.question, pending.requestId);
        setState({
          identity,
          checkKey,
          phase: 'ready',
          target: '/practice/feedback',
          diagnosticReplay: null,
        });
      } catch (error) {
        if (!stillCurrent()) return;
        // A legacy reconcile record may not have reached the server. Let the
        // owning Recorder resume its existing bounded flow. A known delivered
        // result stays behind an explicit retry/check-later choice.
        const pending = await loadPendingAssessment().catch(() => null);
        if (!stillCurrent()) return;
        if (
          queriedPointer &&
          (pending?.requestId !== queriedPointer.requestId ||
            pending?.stage !== queriedPointer.stage)
        ) {
          // The HTTP error belongs to the old pointer. Re-run the provider for
          // the current slot without clearing or classifying its replacement.
          setRetryVersion((version) => version + 1);
          return;
        }
        const terminalReplayRequestId =
          queriedPointer?.stage === 'feedback-pending' &&
          pending !== null &&
          error instanceof ApiError &&
          error.status === 404
            ? queriedPointer.requestId
            : queriedPointer !== null &&
                pending !== null &&
                error instanceof ApiError &&
                error.status === 409 &&
                error.code === 'ASSESSMENT_RESULT_INCOMPATIBLE'
              ? queriedPointer.requestId
              : null;
        if (terminalReplayRequestId) {
          try {
            await retireReplayPointer(terminalReplayRequestId);
          } catch {
            if (stillCurrent()) {
              setState({ ...initialState(identity, checkKey, false), phase: 'error' });
            }
          }
        } else if (
          queriedPointer !== null &&
          queriedPointer.stage !== 'feedback-pending' &&
          error instanceof ApiError &&
          error.status === 404
        ) {
          setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
        } else {
          setState({ ...initialState(identity, checkKey, false), phase: 'error' });
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    checkKey,
    identity,
    isSessionLeaseCurrent,
    queryClient,
    restoreFeedback,
    sessionLease,
    shouldCheck,
    userId,
  ]);

  /**
   * Performs the single route replacement once the check resolves with a
   * target. `replace` (never push) keeps the replayed destination from
   * stacking a second copy onto the back stack.
   */
  useEffect(() => {
    if (current.phase !== 'ready' || !current.target) return;
    router.replace(current.target);
  }, [current.phase, current.target]);

  /**
   * While deferred, watches for one bounded re-check trigger: the first
   * regained connectivity, or the first return to foreground while still
   * online. The retryOnce latch guarantees at most one retry per deferred
   * card instead of stacked re-entries.
   */
  useEffect(() => {
    if (current.phase !== 'deferred') return;
    let previousAppState = AppState.currentState;
    let retryTriggered = false;
    /** Latched one-shot retry; bumps the version at most once per deferred card. */
    const retryOnce = () => {
      if (retryTriggered) return;
      retryTriggered = true;
      setRetryVersion((version) => version + 1);
    };
    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) retryOnce();
    });
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const returnedToForeground = nextState === 'active' && previousAppState !== 'active';
      previousAppState = nextState;
      // Do not turn a learner's nonblocking "Check Later" choice back into a
      // full-screen offline error merely because they foregrounded the app.
      if (returnedToForeground && onlineManager.isOnline()) retryOnce();
    });
    return () => {
      unsubscribeOnline();
      appStateSubscription.remove();
    };
  }, [current.checkKey, current.phase]);

  /**
   * Clears the in-memory diagnostic replay card only when it still belongs to
   * this identity and requestId, so a late clear from an old screen cannot
   * wipe a successor's card.
   */
  const clearDiagnosticReplay = useCallback(
    (requestId: string) => {
      setState((value) =>
        value.identity === identity && value.diagnosticReplay?.requestId === requestId
          ? { ...value, diagnosticReplay: null }
          : value,
      );
    },
    [identity],
  );
  const context = useMemo(
    () => ({
      diagnosticReplay: current.diagnosticReplay,
      clearDiagnosticReplay,
    }),
    [clearDiagnosticReplay, current.diagnosticReplay],
  );

  if (current.phase === 'checking') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text accessibilityLiveRegion="polite" style={styles.title}>
            {t('replay.checkingTitle')}
          </Text>
          <Text style={styles.body}>{t('replay.checkingBody')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (current.phase === 'error') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.center}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('replay.failedTitle')}
          </Text>
          <Text accessibilityRole="alert" style={styles.body}>
            {t('replay.failedBody')}
          </Text>
          <Button
            title={t('common.tryAgain')}
            fullWidth
            onPress={() => setRetryVersion((version) => version + 1)}
            style={styles.action}
          />
          <Button
            title={t('replay.checkLater')}
            variant="secondary"
            fullWidth
            onPress={() =>
              setState({ ...initialState(identity, checkKey, false), phase: 'deferred' })
            }
            style={styles.secondaryAction}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <AssessmentReplayContext.Provider value={context}>
      <View style={styles.appContent}>{children}</View>
      {current.phase === 'deferred' && (
        <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.deferredHost}>
          <View style={styles.deferredCard}>
            <Text accessibilityRole="header" style={styles.deferredTitle}>
              {t('replay.pendingTitle')}
            </Text>
            <Text accessibilityLiveRegion="polite" style={styles.deferredBody}>
              {t('replay.pendingBody')}
            </Text>
            <Button
              title={t('replay.checkNow')}
              fullWidth
              onPress={() => setRetryVersion((version) => version + 1)}
              style={styles.deferredAction}
            />
          </View>
        </SafeAreaView>
      )}
    </AssessmentReplayContext.Provider>
  );
}

/**
 * Reads the replay context from the mounted provider. Outside a provider it
 * degrades to an inert empty value so imported consumers remain renderable
 * in tests and isolated mounts.
 */
export function useAssessmentReplay(): AssessmentReplayContextValue {
  return (
    useContext(AssessmentReplayContext) ?? {
      diagnosticReplay: null,
      clearDiagnosticReplay: () => undefined,
    }
  );
}

/** Theme-resolved styles for the checking spinner, error pane, and deferred card. */
const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  appContent: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignSelf: 'center',
    padding: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.xl,
    maxWidth: layout.formMaxWidth,
  },
  secondaryAction: {
    marginTop: spacing.md,
    maxWidth: layout.formMaxWidth,
  },
  deferredHost: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  deferredCard: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  deferredTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  deferredBody: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  deferredAction: {
    marginTop: spacing.sm,
  },
}));
