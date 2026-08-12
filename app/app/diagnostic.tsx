import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Recorder from "../components/Recorder";
import { apiFetch, userMessageForError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";
import {
  parseDiagnosticAnswerResult,
  parseDiagnosticNext,
  type CefrLevel,
  type DiagnosticAnswerResult,
  type Question,
} from "../lib/types";

export default function DiagnosticScreen() {
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();

  const [question, setQuestion] = useState<Question | null>(null);
  const [progress, setProgress] = useState<{
    asked: number;
    maxQuestions: number;
  } | null>(null);
  const [result, setResult] = useState<DiagnosticAnswerResult | null>(null);
  const [level, setLevel] = useState<CefrLevel | null>(null);

  const nextQuery = useQuery({
    queryKey: ["diagnostic-next", user?.id],
    queryFn: async ({ signal }) =>
      parseDiagnosticNext(
        await apiFetch<unknown>("/diagnostic/next", { signal }),
      ),
    enabled: !!user,
    retry: false,
  });
  useEffect(() => {
    const data = nextQuery.data;
    if (!data) return;
    if (data.done) {
      setLevel(data.level);
    } else {
      setQuestion(data.question);
      setProgress(data.progress);
    }
  }, [nextQuery.data]);

  const handleResult = (data: DiagnosticAnswerResult) => {
    setResult(data);
  };

  const handleError = (message: string) => {
    Alert.alert("Could not assess your answer", message);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch {
      Alert.alert("Could not log out", "Check your connection and try again.");
    }
  };

  const openAccountMenu = () => {
    Alert.alert("Account & privacy", undefined, [
      {
        text: "Change Password",
        onPress: () => router.push("/settings/change-password"),
      },
      {
        text: "Delete Account",
        style: "destructive",
        onPress: () => router.push("/settings/delete-account"),
      },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => void handleLogout(),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const advance = () => {
    if (!result) return;
    if (result.done) {
      const determinedLevel = result.level ?? null;
      setLevel(determinedLevel);
      setResult(null);
    } else if (result.nextQuestion) {
      setQuestion(result.nextQuestion);
      setProgress((prev) => (prev ? { ...prev, asked: prev.asked + 1 } : prev));
      setResult(null);
    }
  };

  const startPracticing = () => {
    if (!user || !level) return;
    // Keep the diagnostic route protected until the completion screen has
    // actually been acknowledged; changing this earlier removes the screen.
    setUser({
      ...user,
      diagnosticCompleted: true,
      cefrLevel: level,
    });
    void queryClient.invalidateQueries({ queryKey: ["me"] });
    router.replace("/");
  };

  // ----- Loading / error states -----
  if (!level && !question) {
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
              "Could not load the diagnostic test. Please try again.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => void nextQuery.refetch()}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }
  }

  // ----- Done: congrats view -----
  if (level) {
    return (
      <View style={styles.center}>
        <Text style={styles.congratsEmoji}>🎉</Text>
        <Text accessibilityRole="header" style={styles.congratsTitle}>
          Diagnostic complete!
        </Text>
        <Text style={styles.congratsText}>Your English level is</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{level}</Text>
        </View>
        <Text style={styles.congratsHint}>
          We&apos;ll give you practice questions matched to this level.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={startPracticing}
        >
          <Text style={styles.primaryButtonText}>Start Practicing</Text>
        </Pressable>
      </View>
    );
  }

  if (!question) {
    return null;
  }

  // ----- Question view -----
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
    >
      <Text accessibilityRole="header" style={styles.heading}>
        Diagnostic Test
      </Text>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.accountButton,
          pressed && styles.accountButtonPressed,
        ]}
        onPress={openAccountMenu}
      >
        <Text style={styles.accountButtonText}>Account & privacy</Text>
      </Pressable>
      {progress && (
        <Text style={styles.progressText}>
          Question {Math.min(progress.asked + 1, progress.maxQuestions)} of up
          to {progress.maxQuestions}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Prompt word</Text>
        <Text style={styles.promptWord}>{question.promptWord}</Text>
        <Text style={styles.cardLabel}>Question</Text>
        <Text style={styles.questionText}>{question.questionText}</Text>
      </View>

      {result ? (
        <View accessibilityLiveRegion="polite" style={styles.resultCard}>
          <Text style={styles.resultTitle}>Answer received</Text>
          <Text style={styles.resultText}>
            Your answer was saved. Your score and level are revealed at the end
            of the test.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={advance}
          >
            <Text style={styles.primaryButtonText}>
              {result.done ? "See My Level" : "Next Question"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Recorder
          ownerId={user!.id}
          questionId={question.id}
          endpoint="/diagnostic/answer"
          parseResult={parseDiagnosticAnswerResult}
          onResult={handleResult}
          onError={handleError}
          onRecoveryUnresolved={() => void nextQuery.refetch()}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
  },
  progressText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  accountButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },
  accountButtonPressed: {
    backgroundColor: colors.card,
  },
  accountButtonText: {
    color: colors.primary,
    fontWeight: "700",
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
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 12,
  },
  promptWord: {
    marginTop: 4,
    fontSize: 30,
    fontWeight: "800",
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
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
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
    fontWeight: "800",
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
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
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
    fontWeight: "800",
    color: "#FFFFFF",
  },
  congratsHint: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignItems: "center",
    alignSelf: "stretch",
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
});
