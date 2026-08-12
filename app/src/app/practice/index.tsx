import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
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
import { usePracticeFlow } from '../../lib/practice-flow';
import { colors, layout } from '../../lib/theme';
import { parseAttemptResult, parseQuestionResponse, type AttemptResult } from '../../lib/types';

export default function PracticeScreen() {
  const { user, logout } = useAuth();
  const { showFeedback } = usePracticeFlow();
  const insets = useSafeAreaInsets();

  const questionQuery = useQuery({
    queryKey: ['practice-question', user?.id, user?.cefrLevel],
    queryFn: async ({ signal }) =>
      parseQuestionResponse(await apiFetch<unknown>('/practice/question', { signal })),
    enabled: !!user,
    retry: false,
    // Keep the assigned question stable until feedback explicitly advances it.
    staleTime: Infinity,
  });
  const question = questionQuery.data?.question;
  const handleResult = (result: AttemptResult) => {
    if (!question) return;
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
              hitSlop={4}
              style={({ pressed }) => [styles.helpButton, pressed && styles.helpButtonPressed]}
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
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{question.cefrLevel}</Text>
              </View>
              <Text style={styles.cardLabel}>Prompt word</Text>
              <Text accessibilityRole="header" style={styles.promptWord}>
                {question.promptWord}
              </Text>
              <Text style={styles.cardLabel}>Question</Text>
              <Text style={styles.questionText}>{question.questionText}</Text>
            </View>

            <View style={styles.recorderArea}>
              <Recorder
                ownerId={user!.id}
                questionId={question.id}
                endpoint="/practice/attempt"
                parseResult={parseAttemptResult}
                onResult={handleResult}
                onError={handleError}
                onRecoveryUnresolved={() => void questionQuery.refetch()}
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footerRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Pressable
          accessibilityRole="button"
          hitSlop={4}
          style={styles.footerButton}
          onPress={openSettingsMenu}
        >
          <Text style={styles.footerButtonText}>Settings</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          hitSlop={4}
          style={styles.footerButton}
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
