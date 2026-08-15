import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Recorder from '../../components/Recorder';
import { apiFetch, userMessageForError } from '../../lib/api';
import { LogoutCleanupError, useAuth } from '../../lib/auth';
import { applyFailedAttemptToQuestionCache, usePracticeFlow } from '../../lib/practice-flow';
import { colors, layout } from '../../lib/theme';
import {
  parseAttemptResult,
  parseNativeAttemptResult,
  parsePracticeQuestion,
  type PracticeOutcome,
} from '../../lib/types';
import { useHardwareBack } from '../../lib/use-hardware-back';

export default function PracticeScreen() {
  const { user, logout } = useAuth();
  const { answerMode, setAnswerMode, showFeedback } = usePracticeFlow();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [recorderLocked, setRecorderLocked] = useState(false);
  const nativeMode = answerMode === 'native';

  const questionQuery = useQuery({
    queryKey: ['practice-question', user?.id, user?.cefrLevel],
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

  // Practice is the root of the practice stack: Android hardware back would
  // pop it and let blur cleanup discard an active recording.
  useHardwareBack(() => true);

  const handleResult = (result: PracticeOutcome) => {
    if (!user || !question) return;
    applyFailedAttemptToQuestionCache(queryClient, user, question.id, result);
    showFeedback(question.id, result);
    router.push('/practice/feedback');
  };

  const handleError = (message: string) => {
    Alert.alert('Could not assess your answer', message);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      if (error instanceof LogoutCleanupError) {
        Alert.alert('Logged out', error.message);
      } else {
        Alert.alert(
          'Could not log out',
          'Could not revoke the server session. Check your connection and try again.',
        );
      }
    }
  };

  const openSettingsMenu = () => {
    Alert.alert('Settings', undefined, [
      {
        text: 'Change Password',
        onPress: () => router.push('/settings/change-password'),
      },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: () => router.push('/settings/delete-account'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
        {user && <Text style={styles.greeting}>Hi, {user.name}</Text>}

        {!question && questionQuery.isPending && (
          <View style={styles.center}>
            <ActivityIndicator
              accessibilityLabel="Loading your question"
              size="large"
              color={colors.primary}
            />
            <Text accessibilityLiveRegion="polite" style={styles.muted}>
              Loading your question…
            </Text>
          </View>
        )}

        {!question && questionQuery.isError && (
          <View style={styles.center}>
            <Text accessibilityRole="header" style={styles.errorTitle}>
              Couldn&apos;t load a question
            </Text>
            <Text accessibilityLiveRegion="assertive" style={styles.muted}>
              {userMessageForError(
                questionQuery.error,
                'Could not load a practice question. Please try again.',
              )}
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
              onPress={() => void questionQuery.refetch()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {question && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Help for this question"
              accessibilityHint={
                recorderLocked ? 'Finish the current recording before opening help.' : undefined
              }
              accessibilityState={{ disabled: recorderLocked }}
              disabled={recorderLocked}
              hitSlop={4}
              style={({ pressed }) => [
                styles.helpButton,
                recorderLocked && styles.controlDisabled,
                pressed && styles.helpButtonPressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/practice/help',
                  params: { questionId: question.id },
                })
              }
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
                    <Text style={styles.kindBadgeText}>
                      {kind === 'revision' ? 'Revision' : 'New word'}
                    </Text>
                  </View>
                )}
              </View>
              {progress && (
                <Text style={styles.progressLine}>
                  {progress.masteredCount} of {progress.totalAtLevel} words mastered
                  {progress.learningCount > 0 ? ` · ${progress.learningCount} in revision` : ''}
                </Text>
              )}
              <Text style={styles.cardLabel}>Prompt word</Text>
              <Text accessibilityRole="header" style={styles.promptWord}>
                {question.promptWord}
              </Text>
              <Text style={styles.cardLabel}>Question</Text>
              <Text style={styles.questionText}>{question.questionText}</Text>
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Answer in my language"
              accessibilityHint={
                recorderLocked
                  ? 'Finish the current recording before changing answer language.'
                  : undefined
              }
              accessibilityState={{ checked: nativeMode, disabled: recorderLocked }}
              disabled={recorderLocked}
              style={({ pressed }) => [
                styles.modeToggle,
                recorderLocked && styles.modeToggleDisabled,
                pressed && styles.modeTogglePressed,
              ]}
              onPress={() => setAnswerMode(nativeMode ? 'english' : 'native')}
            >
              <Text style={styles.modeToggleText}>
                {nativeMode
                  ? 'Answering in your language — tap for English'
                  : 'Answer in my language'}
              </Text>
            </Pressable>

            <View style={styles.recorderArea}>
              <Recorder
                key={nativeMode ? 'native' : 'english'}
                ownerId={user.id}
                questionId={question.id}
                endpoint={nativeMode ? '/practice/attempt/native' : '/practice/attempt'}
                parseResult={nativeMode ? parseNativeAttemptResult : parseAttemptResult}
                onResult={handleResult}
                onError={handleError}
                onRecoveryUnresolved={() => void questionQuery.refetch()}
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
                onInteractionLockChange={setRecorderLocked}
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footerRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={
            recorderLocked ? 'Finish the current recording before opening settings.' : undefined
          }
          accessibilityState={{ disabled: recorderLocked }}
          disabled={recorderLocked}
          hitSlop={4}
          style={[styles.footerButton, recorderLocked && styles.controlDisabled]}
          onPress={openSettingsMenu}
        >
          <Text style={styles.footerButtonText}>Settings</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityHint={
            recorderLocked ? 'Finish the current recording before logging out.' : undefined
          }
          accessibilityState={{ disabled: recorderLocked }}
          disabled={recorderLocked}
          hitSlop={4}
          style={[styles.footerButton, recorderLocked && styles.controlDisabled]}
          onPress={() => void handleLogout()}
        >
          <Text style={styles.footerButtonText}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 20,
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
    marginBottom: 12,
  },
  muted: {
    marginTop: 12,
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
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  retryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpButton: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  helpButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  helpButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  card: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  kindBadge: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  kindBadgeRevision: {
    backgroundColor: colors.warning,
  },
  kindBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressLine: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },
  modeToggle: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modeTogglePressed: {
    backgroundColor: colors.primaryLight,
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
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
  },
  promptWord: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  questionText: {
    marginTop: 4,
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
  },
  recorderArea: {
    minHeight: 330,
    justifyContent: 'center',
  },
  footerRow: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 4,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  footerButton: {
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  footerButtonText: {
    fontSize: 14,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
});
