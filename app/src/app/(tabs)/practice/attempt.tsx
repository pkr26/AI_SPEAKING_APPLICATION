import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '../../../components/Button';
import DataRefreshNotice from '../../../components/DataRefreshNotice';
import OfflineState from '../../../components/OfflineState';
import Recorder, {
  scrollToExpandedRecorderControls,
  type RecorderResultMetadata,
} from '../../../components/Recorder';
import { apiFetch, userMessageForError } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { useT } from '../../../lib/i18n';
import { firstParam, isUuid } from '../../../lib/params';
import { applyFailedAttemptToQuestionCache, usePracticeFlow } from '../../../lib/practice-flow';
import { createThemedStyles, useTheme } from '../../../lib/theme';
import {
  parseAttemptResult,
  parseHelpContent,
  parseNativeAttemptResult,
  PRACTICE_MAX_ATTEMPTS,
  type PracticeOutcome,
} from '../../../lib/types';
import { useHardwareBack } from '../../../lib/use-hardware-back';

// Silence retries are unbounded, so retain only a small recent window while
// still suppressing recovery replays for the current recorder owner.
const MAX_HANDLED_RESULT_REQUEST_IDS = 8;

/**
 * Practice Mode: deliberately minimal — only the prompt word, the question,
 * and the record button. No help, translations, or examples here.
 */
export default function AttemptScreen() {
  const { user, sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const { answerMode, attemptStatus, setAnswerMode, showFeedback } = usePracticeFlow();
  const [recorderLockState, setRecorderLockState] = useState<{
    owner: string | null;
    locked: boolean;
  }>({ owner: null, locked: false });
  // Render state disables the switch, while this mirror closes the tiny window
  // between Recorder taking ownership of a recording and that disabled render.
  const recorderLockedRef = useRef(false);
  const [recorderExitLockState, setRecorderExitLockState] = useState<{
    owner: string | null;
    locked: boolean;
  }>({ owner: null, locked: false });
  const recorderExitLockedRef = useRef(false);
  // Localized "when can I try again" line from a 429/DAILY_LIMIT rejection,
  // rendered inline next to the recorder instead of only in a passing alert.
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const navigationStartedRef = useRef(true);
  const activeRecorderOwnerRef = useRef<string | null>(null);
  const handledResultRequestIdsRef = useRef(new Set<string>());
  const recoveryExitRef = useRef<string | null>(null);
  const [promptSnapshot, setPromptSnapshot] = useState<{
    owner: string;
    promptWord: string;
    questionText: string;
  } | null>(null);
  const params = useLocalSearchParams<{
    questionId?: string;
    cycleId?: string;
    attemptsUsed?: string;
  }>();
  const questionId = firstParam(params.questionId);
  const cycleId = firstParam(params.cycleId);
  const attemptsUsedParam = firstParam(params.attemptsUsed);
  let validQuestionId: string | null = null;
  if (isUuid(questionId)) validQuestionId = questionId;
  const validCycleId = isUuid(cycleId) ? cycleId : null;
  const routedAttemptsUsed =
    attemptsUsedParam !== undefined && /^[0-2]$/.test(attemptsUsedParam)
      ? Number(attemptsUsedParam)
      : null;
  const validLink =
    validQuestionId !== null && validCycleId !== null && routedAttemptsUsed !== null;
  const nativeMode = answerMode === 'native';
  const userId = user?.id ?? null;
  const renderOwner = `${sessionVersion}:${userId ?? 'anonymous'}`;
  const sessionLease = useMemo(() => {
    void sessionVersion;
    void userId;
    return captureSessionLease();
  }, [captureSessionLease, sessionVersion, userId]);
  const recorderOwner =
    validQuestionId && validCycleId
      ? `${renderOwner}:${validQuestionId}:${validCycleId}:${nativeMode ? 'native' : 'english'}`
      : null;
  const recorderLocked = recorderLockState.owner === recorderOwner && recorderLockState.locked;
  const recorderExitLocked =
    recorderExitLockState.owner === recorderOwner && recorderExitLockState.locked;
  const practiceQuestionKey = useMemo(
    () => ['practice-question', user?.id, user?.cefrLevel] as const,
    [user?.cefrLevel, user?.id],
  );

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
      navigationStartedRef.current = true;
      activeRecorderOwnerRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    activeRecorderOwnerRef.current = recorderOwner;
    handledResultRequestIdsRef.current = new Set();
    recoveryExitRef.current = null;
    recorderLockedRef.current = false;
    recorderExitLockedRef.current = false;
  }, [recorderOwner]);

  const renderOwnsWork = useCallback(
    () => mountedRef.current && focusedRef.current && isSessionLeaseCurrent(sessionLease),
    [isSessionLeaseCurrent, sessionLease],
  );
  const recorderOwnsWork = useCallback(
    (owner: string | null) =>
      owner !== null && activeRecorderOwnerRef.current === owner && renderOwnsWork(),
    [renderOwnsWork],
  );
  const revealExpandedRecorderControls = useCallback(() => {
    scrollToExpandedRecorderControls(scrollViewRef.current, recorderOwnsWork(recorderOwner));
  }, [recorderOwner, recorderOwnsWork]);
  const publishNavigationLock = useCallback(() => {
    if (!mountedRef.current || !focusedRef.current) return;
    navigation.setOptions(
      recorderExitLockedRef.current
        ? { headerBackVisible: false, gestureEnabled: false }
        : { headerBackVisible: true, gestureEnabled: true },
    );
  }, [navigation]);

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

  // This is the one recorder screen with a visible header back button. While
  // the recorder holds a take (recording, uploading, recovering), header back
  // and the iOS swipe gesture must not pop the screen — blur cleanup would
  // discard it. Restore normal exits as soon as the lock releases.
  useLayoutEffect(() => {
    publishNavigationLock();
  }, [publishNavigationLock, recorderExitLocked]);

  const helpQuery = useQuery({
    queryKey: ['question-help', user?.id, user?.nativeLanguage, validQuestionId],
    queryFn: async ({ signal }) =>
      parseHelpContent(
        await apiFetch<unknown>(`/practice/question/${encodeURIComponent(validQuestionId!)}/help`, {
          signal,
        }),
      ),
    enabled: !!user && validLink,
    retry: false,
  });

  // A cross-device mother-tongue edit changes the help query key and the root
  // profile bridge retires the former language cache. Snapshot only the routed
  // cycle's loaded English prompt, then use it through replacement loading or
  // failure so Recorder stays mounted beside nonblocking retry UI. A new
  // route, placement, session, or cycle cannot inherit the snapshot.
  const promptOwner = `${renderOwner}:${user?.cefrLevel ?? 'unplaced'}:${validQuestionId ?? 'invalid'}:${
    validCycleId ?? 'invalid'
  }`;
  const loadedPromptWord = helpQuery.data?.promptWord;
  const loadedQuestionText = helpQuery.data?.questionText;
  useLayoutEffect(() => {
    if (!loadedPromptWord || !loadedQuestionText) return;
    // Deliberate layout-phase handoff: the snapshot must exist before a later
    // profile-refresh effect can remove the active help cache.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Preserve an active recorder across the query-key handoff.
    setPromptSnapshot({
      owner: promptOwner,
      promptWord: loadedPromptWord,
      questionText: loadedQuestionText,
    });
  }, [loadedPromptWord, loadedQuestionText, promptOwner]);
  const replacementPending =
    !loadedPromptWord && !loadedQuestionText && (helpQuery.isPending || helpQuery.isFetching);
  const retainedPrompt =
    (replacementPending || helpQuery.isError) && promptSnapshot?.owner === promptOwner
      ? promptSnapshot
      : null;
  const promptWord = loadedPromptWord || retainedPrompt?.promptWord;
  const questionText = loadedQuestionText || retainedPrompt?.questionText;

  // Hardware back is a normal exit here, except while a recording, upload, or
  // recovery is active — popping then would let blur cleanup discard the take.
  useHardwareBack(() => recorderExitLockedRef.current);
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (recorderExitLockedRef.current && event.data.action.type === 'GO_BACK') {
        event.preventDefault();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // A new submission owns the inline space again: clear the old wait line the
  // moment the recorder locks for the next take.
  const handleLockChange = useCallback(
    (locked: boolean) => {
      if (!recorderOwnsWork(recorderOwner)) return;
      recorderLockedRef.current = locked;
      recorderExitLockedRef.current = locked;
      setRecorderLockState({ owner: recorderOwner, locked });
      setRecorderExitLockState({ owner: recorderOwner, locked });
      if (locked) setRateLimitNotice(null);
      publishNavigationLock();
    },
    [publishNavigationLock, recorderOwner, recorderOwnsWork],
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
      !validQuestionId ||
      !validCycleId ||
      !promptWord ||
      !questionText ||
      !user.cefrLevel ||
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
    navigationStartedRef.current = true;
    void queryClient.cancelQueries({ queryKey: practiceQuestionKey, exact: true });
    setRateLimitNotice(null);
    applyFailedAttemptToQuestionCache(queryClient, user, validQuestionId, result);
    if (result.recordingId) {
      void queryClient.invalidateQueries({ queryKey: ['recordings', user.id] });
    }
    showFeedback(
      validQuestionId,
      result,
      {
        id: validQuestionId,
        cefrLevel: user.cefrLevel,
        promptWord,
        questionText,
      },
      metadata.requestId,
    );
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
      !user ||
      !recorderOwnsWork(owner) ||
      navigationStartedRef.current ||
      recoveryExitRef.current === owner
    ) {
      return;
    }
    recoveryExitRef.current = owner;
    navigationStartedRef.current = true;
    void queryClient.invalidateQueries({ queryKey: practiceQuestionKey });
    router.dismissTo('/practice');
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

  // The protected-route gate owns navigation when the session disappears.
  // A disabled query must not look like an indefinitely loading question.
  if (!user) return null;

  if (!validLink) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          {t('help.invalidLinkTitle')}
        </Text>
        <Text style={styles.muted}>{t('attempt.invalidLinkBody')}</Text>
        <Button
          title={t('common.backToPractice')}
          onPress={() => router.replace('/practice')}
          style={styles.retryButton}
        />
      </ScrollView>
    );
  }

  if (!promptWord || !questionText) {
    if (helpQuery.isPending) {
      return (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.center}
        >
          {helpQuery.fetchStatus === 'paused' ? (
            <OfflineState />
          ) : (
            <>
              <ActivityIndicator
                accessibilityLabel={t('attempt.loading')}
                size="large"
                color={theme.colors.primary}
              />
              <Text accessibilityLiveRegion="polite" style={styles.muted}>
                {t('attempt.loading')}
              </Text>
            </>
          )}
        </ScrollView>
      );
    }
    if (helpQuery.isError) {
      return (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.center}
        >
          <Text accessibilityRole="header" style={styles.errorTitle}>
            {t('attempt.loadFailedTitle')}
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(helpQuery.error, t('attempt.loadFailed'))}
          </Text>
          <Button
            title={t('common.tryAgain')}
            onPress={() => void helpQuery.refetch({ cancelRefetch: false })}
            style={styles.retryButton}
          />
        </ScrollView>
      );
    }
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
    >
      <DataRefreshNotice
        updating={helpQuery.isFetching && !helpQuery.isError}
        failed={helpQuery.isError}
        onRetry={() => void helpQuery.refetch({ cancelRefetch: false })}
      />
      <View style={styles.card}>
        {routedAttemptsUsed !== null && (
          <View style={styles.attemptChip}>
            <Text style={styles.attemptChipText}>
              {t('practice.attemptChip', {
                current:
                  attemptStatus !== null &&
                  attemptStatus.questionId === validQuestionId &&
                  attemptStatus.cycleId === validCycleId
                    ? PRACTICE_MAX_ATTEMPTS + 1 - attemptStatus.attemptsLeft
                    : routedAttemptsUsed + 1,
                max: PRACTICE_MAX_ATTEMPTS,
              })}
            </Text>
          </View>
        )}
        <Text accessibilityLanguage="en-US" accessibilityRole="header" style={styles.promptWord}>
          {promptWord}
        </Text>
        <Text accessibilityLanguage="en-US" style={styles.questionText}>
          {questionText}
        </Text>
      </View>

      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={t('practice.answerInMyLanguage')}
        accessibilityHint={recorderLocked ? t('hint.finishRecordingFirst') : undefined}
        accessibilityState={{ checked: nativeMode, disabled: recorderLocked }}
        disabled={recorderLocked}
        style={({ pressed }) => [
          styles.modeToggle,
          nativeMode && styles.modeToggleOn,
          recorderLocked && styles.modeToggleDisabled,
          pressed && (nativeMode ? styles.modeTogglePressedOn : styles.modeTogglePressed),
        ]}
        onPress={() => {
          if (!recorderLockedRef.current && !navigationStartedRef.current && renderOwnsWork()) {
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
          key={`${validCycleId}:${nativeMode ? 'native' : 'english'}`}
          ownerId={user.id}
          questionId={validQuestionId!}
          cycleId={validCycleId!}
          endpoint={nativeMode ? '/practice/attempt/native' : '/practice/attempt'}
          parseResult={(raw) =>
            nativeMode
              ? parseNativeAttemptResult(raw, validCycleId!)
              : parseAttemptResult(raw, validCycleId!)
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
    </ScrollView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  container: {
    flexGrow: 1,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
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
  card: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptWord: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  questionText: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
  },
  attemptChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.badge,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: spacing.xs,
  },
  attemptChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  modeToggle: {
    alignSelf: 'center',
    marginTop: spacing.ml,
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
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modeToggleTextOn: {
    color: colors.onPrimary,
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
}));
