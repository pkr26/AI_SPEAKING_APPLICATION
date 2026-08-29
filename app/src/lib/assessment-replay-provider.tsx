import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import { apiFetch, ApiError } from './api';
import { parseAssessmentReplayStatus } from './assessment-replay';
import { useAuth } from './auth';
import { useT } from './i18n';
import {
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentFeedbackPending,
  pendingAssessmentFeedbackIsExpired,
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
  const identity = `${sessionVersion}:${user?.id ?? 'anonymous'}`;
  const shouldCheck = !!token && !!user && !isRestoring && !restoreError;
  const checkKey = `${identity}:${shouldCheck ? 'check' : 'skip'}:${retryVersion}`;
  const [state, setState] = useState<ReplayState>(() =>
    initialState(identity, checkKey, shouldCheck),
  );
  const current =
    state.checkKey === checkKey ? state : initialState(identity, checkKey, shouldCheck);

  const sessionLease = useMemo(() => {
    void identity;
    return captureSessionLease();
  }, [captureSessionLease, identity]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (!shouldCheck || !user) return () => controller.abort();

    const stillCurrent = () =>
      active && !controller.signal.aborted && isSessionLeaseCurrent(sessionLease);
    void (async () => {
      try {
        const pending = await loadPendingAssessment();
        if (!stillCurrent()) return;
        if (!pending) {
          setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
          return;
        }
        if (pending.ownerId !== user.id) {
          await clearPendingAssessment(pending.requestId);
          if (stillCurrent())
            setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
          return;
        }
        if (pending.stage !== 'feedback-pending' && pending.stage !== 'reconcile') {
          setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
          return;
        }
        if (pendingAssessmentFeedbackIsExpired(pending)) {
          await clearPendingAssessment(pending.requestId);
          if (!stillCurrent()) return;
          queryClient.removeQueries({ queryKey: ['diagnostic-next'] });
          queryClient.removeQueries({ queryKey: ['practice-question'] });
          setState({ ...initialState(identity, checkKey, false), phase: 'ready' });
          return;
        }

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
          pending?.stage !== 'feedback-pending' &&
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
    user,
  ]);

  useEffect(() => {
    if (current.phase !== 'ready' || !current.target) return;
    router.replace(current.target);
  }, [current.phase, current.target]);

  useEffect(() => {
    if (current.phase !== 'deferred') return;
    let previousAppState = AppState.currentState;
    let retryTriggered = false;
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

export function useAssessmentReplay(): AssessmentReplayContextValue {
  return (
    useContext(AssessmentReplayContext) ?? {
      diagnosticReplay: null,
      clearDiagnosticReplay: () => undefined,
    }
  );
}

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
