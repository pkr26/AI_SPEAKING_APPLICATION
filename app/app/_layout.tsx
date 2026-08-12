import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../lib/auth";
import { PracticeFlowProvider } from "../lib/practice-flow";
import { colors } from "../lib/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60_000,
    },
  },
});

function RootNavigator() {
  const { token, user, isRestoring } = useAuth();
  const hasProfile = !isRestoring && !!token && !!user;
  const canPractice = hasProfile && user?.diagnosticCompleted === true;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={!isRestoring && !token}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected
          guard={hasProfile && user?.diagnosticCompleted === false}
        >
          <Stack.Screen
            name="diagnostic"
            options={{
              title: "Diagnostic Test",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={canPractice}>
          <Stack.Screen
            name="practice/index"
            options={{
              title: "Practice",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen name="practice/help" options={{ title: "Help" }} />
          <Stack.Screen
            name="practice/attempt"
            options={{ title: "Practice Mode" }}
          />
          <Stack.Screen
            name="practice/feedback"
            options={{
              title: "Feedback",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen
            name="settings/change-password"
            options={{ title: "Change Password" }}
          />
          <Stack.Screen
            name="settings/delete-account"
            options={{ title: "Delete Account" }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PracticeFlowProvider>
            <RootNavigator />
          </PracticeFlowProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
