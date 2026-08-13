import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import Recorder from '../components/Recorder';
import { apiFetch, userMessageForError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, layout } from '../lib/theme';
import {
  parseDiagnosticAnswerResult,
  parseDiagnosticNext,
  type CefrLevel,
  type DiagnosticAnswerResult,
  type Question,
} from '../lib/types';

export default function DiagnosticScreen() {
  const { user, setUser, logout, sessionVersion } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const identityKey = `${sessionVersion}:${userId ?? 'anonymous'}`;
  const activeIdentityRef = useRef<string | null>(identityKey);

  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState<{
    asked: number;
    maxQuestions: number;
  } | null>(null);
  const [result, setResult] = useState<DiagnosticAnswerResult | null>(null);
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [stateIdentity, setStateIdentity] = useState(identityKey);

  useLayoutEffect(() => {
    // Local diagnostic progress is sensitive account data and is not stored in
    // the query cache. Clear it at every session/identity boundary.
    activeIdentityRef.current = identityKey;
    setStateIdentity(identityKey);
    setQuestion(null);
    setProgress(null);
    setResult(null);
    setLevel(null);
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
    setStateIdentity(identityKey);
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
  }, [identityKey, nextQuery.data, userId]);

  const stateIsCurrent = stateIdentity === identityKey;
  const currentQuestion = stateIsCurrent ? question : null;
  const currentProgress = stateIsCurrent ? progress : null;
  const currentResult = stateIsCurrent ? result : null;
  const currentLevel = stateIsCurrent ? level : null;

  const handleResult = (data: DiagnosticAnswerResult) => {
    if (activeIdentityRef.current !== identityKey) return;
    setResult(data);
  };

  const handleError = (message: string) => {
    if (activeIdentityRef.current !== identityKey) return;
    Alert.alert('Could not assess your answer', message);
  };

  const handleRecoveryUnresolved = () => {
    if (activeIdentityRef.current !== identityKey) return;
    void nextQuery.refetch();
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch {
      Alert.alert('Could not log out', 'Check your connection and try again.');
    }
  };

  const openAccountMenu = () => {
    Alert.alert('Account & privacy', undefined, [
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

  const advance = () => {
    if (activeIdentityRef.current !== identityKey || !currentResult) return;
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
    if (activeIdentityRef.current !== identityKey || !user || !currentLevel) return;
    // Keep the diagnostic route protected until the completion screen has
    // actually been acknowledged; changing this earlier removes the screen.
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Preparing your diagnostic test…</Text>
        </View>
      );
    }
    if (nextQuery.isError) {
      return (
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.errorTitle}>
            Couldn&apos;t load the test
          </Text>
          <Text accessibilityLiveRegion="assertive" style={styles.muted}>
            {userMessageForError(
              nextQuery.error,
              'Could not load the diagnostic test. Please try again.',
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={() => void nextQuery.refetch()}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
  }

  // ----- Done: congrats view -----
  if (currentLevel) {
    return (
      <View style={styles.center}>
        <Text style={styles.congratsEmoji}>🎉</Text>
        <Text accessibilityRole="header" style={styles.congratsTitle}>
          Diagnostic complete!
        </Text>
        <Text style={styles.congratsText}>Your English level is</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{currentLevel}</Text>
        </View>
        <Text style={styles.congratsHint}>
          We&apos;ll give you practice questions matched to this level.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={startPracticing}
        >
          <Text style={styles.primaryButtonText}>Start Practicing</Text>
        </Pressable>
      </View>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  // ----- Question view -----
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.heading}>
        Diagnostic Test
      </Text>
      <View style={styles.accountActions}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.accountButton, pressed && styles.accountButtonPressed]}
          onPress={openAccountMenu}
        >
          <Text style={styles.accountButtonText}>Account & privacy</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.accountButton, pressed && styles.accountButtonPressed]}
          onPress={() => void handleLogout()}
        >
          <Text style={styles.accountButtonText}>Log out</Text>
        </Pressable>
      </View>
      {currentProgress && (
        <Text style={styles.progressText}>
          Question {Math.min(currentProgress.asked + 1, currentProgress.maxQuestions)} of up to{' '}
          {currentProgress.maxQuestions}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Prompt word</Text>
        <Text style={styles.promptWord}>{currentQuestion.promptWord}</Text>
        <Text style={styles.cardLabel}>Question</Text>
        <Text style={styles.questionText}>{currentQuestion.questionText}</Text>
      </View>

      {currentResult ? (
        <View accessibilityLiveRegion="polite" style={styles.resultCard}>
          <Text style={styles.resultTitle}>Answer received</Text>
          <Text style={styles.resultText}>
            Your answer was saved. Your score and level are revealed at the end of the test.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            onPress={advance}
          >
            <Text style={styles.primaryButtonText}>
              {currentResult.done ? 'See My Level' : 'Next Question'}
            </Text>
          </Pressable>
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
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 20,
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
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  accountButton: {
    minHeight: layout.minimumTarget,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  accountButtonPressed: {
    backgroundColor: colors.card,
  },
  accountActions: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  accountButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    marginTop: 20,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
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
  resultCard: {
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
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
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  congratsEmoji: {
    fontSize: 56,
  },
  congratsTitle: {
    marginTop: 12,
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  congratsText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.muted,
  },
  levelBadge: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  levelBadgeText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  congratsHint: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
