import React from 'react';
import { Stack } from 'expo-router';

import { useTheme } from '../../lib/theme';

/**
 * Route shell for the authentication flow. Headerless because each auth screen
 * renders its own title and fields; the themed background covers the native
 * stack so transitions never flash a default color.
 */
export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
