import React from 'react';
import { Stack } from 'expo-router';

import { useT } from '../../../lib/i18n';
import { useTheme } from '../../../lib/theme';

/**
 * The practice flow lives in its own stack inside the Practice tab so the
 * feedback/help pushes stay within the tab while each screen keeps the
 * exit-lock/gesture gating it already publishes through navigation.setOptions.
 */
export default function PracticeTabLayout() {
  const theme = useTheme();
  const t = useT();
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.colors.text,
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('header.practice'),
          // The screen relaxes these while no recording/upload holds the
          // interaction lock; locked exits would discard the take.
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="feedback"
        options={{
          title: t('header.feedback'),
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="help" options={{ title: t('header.help') }} />
    </Stack>
  );
}
