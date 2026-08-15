import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Button from '../../components/Button';
import Recorder from '../../components/Recorder';
import { apiFetch, userMessageForError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { firstParam, isUuid } from '../../lib/params';
import { applyFailedAttemptToQuestionCache, usePracticeFlow } from '../../lib/practice-flow';
import { createThemedStyles, useTheme } from '../../lib/theme';
import {
  parseAttemptResult,
  parseHelpContent,
  parseNativeAttemptResult,
  PRACTICE_MAX_ATTEMPTS,
  type PracticeOutcome,
} from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

/**
 * Practice Mode: deliberately minimal — only the prompt word, the question,
 * and the record button. No help, translations, or examples here.
 */
export default function AttemptScreen() {
  const { user } = useAuth();
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { answerMode, attemptStatus, setAnswerMode, showFeedback } = usePracticeFlow();
  const [recorderLocked, setRecorderLocked] = useState(false);
  // Localized "when can I try again" line from a 429/DAILY_LIMIT rejection,
  // rendered inline next to the recorder instead of only in a passing alert.
  const [rateLimitNotice, setRateLimitNotice] = useState<string | null>(null);
  const params = useLocalSearchParams<{ questionId?: string }>();
  const questionId = firstParam(params.questionId);
  const validQuestionId = isUuid(questionId) ? questionId : null;
  const nativeMode = answerMode === 'native';

  // This is the one recorder screen with a visible header back button. While
  // the recorder holds a take (recording, uploading, recovering), header back
  // and the iOS swipe gesture must not pop the screen — blur cleanup would
  // discard it. Restore normal exits as soon as the lock releases.
  useLayoutEffect(() => {
    navigation.setOptions(
      recorderLocked
        ? { headerBackVisible: false, gestureEnabled: false }
        : { headerBackVisible: true, gestureEnabled: true },
    );
  }, [navigation, recorderLocked]);

  const helpQuery = useQuery({
    queryKey: ['question-help', user?.id, user?.nativeLanguage, validQuestionId],
    queryFn: async ({ signal }) =>
      parseHelpContent(
        await apiFetch<unknown>(`/practice/question/${encodeURIComponent(validQuestionId!)}/help`, {
          signal,
        }),
      ),
    enabled: !!user && !!validQuestionId,
    retry: false,
  });

  const promptWord = helpQuery.data?.promptWord;
  const questionText = helpQuery.data?.questionText;

  // Hardware back is a normal exit here, except while a recording, upload, or
  // recovery is active — popping then would let blur cleanup discard the take.
  useHardwareBack(() => recorderLocked);

  // A new submission owns the inline space again: clear the old wait line the
  // moment the recorder locks for the next take.
  const handleLockChange = useCallback((locked: boolean) => {
    setRecorderLocked(locked);
    if (locked) setRateLimitNotice(null);
  }, []);

  const handleResult = (result: PracticeOutcome) => {
    if (!user || !validQuestionId) return;
    setRateLimitNotice(null);
    applyFailedAttemptToQuestionCache(queryClient, user, validQuestionId, result);
    showFeedback(validQuestionId, result);
    router.push('/practice/feedback');
  };

  const handleError = (message: string) => {
    Alert.alert(t('diag.assessFailedTitle'), message);
  };

  // The protected-route gate owns navigation when the session disappears.
  // A disabled query must not look like an indefinitely loading question.
  if (!user) return null;

  if (!validQuestionId) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          {t('help.invalidLinkTitle')}
        </Text>
        <Text style={styles.muted}>{t('attempt.invalidLinkBody')}</Text>
        <Button
          title={t('common.backToPractice')}
          onPress={() => router.replace('/practice')}
          style={styles.retryButton}
        />
      </View>
    );
  }

  if (!promptWord || !questionText) {
    if (helpQuery.isPending) {
      return (
        <View style={styles.center}>
          <ActivityIndicator
            accessibilityLabel={t('attempt.loading')}
            size="large"
            color={theme.colors.primary}
          />
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {t('attempt.loading')}
          </Text>
        </View>
      );
    }
    if (helpQuery.isError) {
      return (
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            {t('attempt.loadFailedTitle')}
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(helpQuery.error, t('attempt.loadFailed'))}
          </Text>
          <Button
            title={t('common.tryAgain')}
            onPress={() => void helpQuery.refetch()}
            style={styles.retryButton}
          />
        </View>
      );
    }
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <View style={styles.card}>
        {attemptStatus !== null && attemptStatus.questionId === validQuestionId && (
          <View style={styles.attemptChip}>
            <Text style={styles.attemptChipText}>
              {t('practice.attemptChip', {
                current: PRACTICE_MAX_ATTEMPTS + 1 - attemptStatus.attemptsLeft,
                max: PRACTICE_MAX_ATTEMPTS,
              })}
            </Text>
          </View>
        )}
        <Text accessibilityRole="header" style={styles.promptWord}>
          {promptWord}
        </Text>
        <Text style={styles.questionText}>{questionText}</Text>
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
        onPress={() => setAnswerMode(nativeMode ? 'english' : 'native')}
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
          questionId={validQuestionId}
          endpoint={nativeMode ? '/practice/attempt/native' : '/practice/attempt'}
          parseResult={nativeMode ? parseNativeAttemptResult : parseAttemptResult}
          onResult={handleResult}
          onError={handleError}
          onRateLimited={setRateLimitNotice}
          onRecoveryUnresolved={() => {
            void queryClient.invalidateQueries({
              queryKey: ['practice-question', user?.id, user?.cefrLevel],
            });
            router.replace('/practice');
          }}
          onRecoveryEndpointMismatch={(savedEndpoint) => {
            if (savedEndpoint === '/practice/attempt/native') {
              setAnswerMode('native');
              return true;
            }
            if (savedEndpoint === '/practice/attempt') {
              setAnswerMode('english');
              return true;
            }
            return false;
          }}
          onInteractionLockChange={handleLockChange}
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
    flex: 1,
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
}));
