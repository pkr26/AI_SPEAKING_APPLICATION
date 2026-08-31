import { router, Stack } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Button from '../components/Button';
import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';

/**
 * Expo-router catch-all for unmatched routes and hostile deep links. The only
 * exit replaces the stack with Home, so back can never return to a dead route.
 */
export default function NotFoundScreen() {
  const t = useT();
  const styles = themedStyles(useTheme());
  return (
    <>
      {/* The root stack shows headers, and an unmatched deep link has no
          Stack.Screen declaring one: without this the native stack falls back
          to the route name and prints the raw "+not-found" above the card. */}
      <Stack.Screen options={{ title: t('notFound.title') }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.body}>{t('notFound.body')}</Text>
            <Button
              title={t('notFound.goHome')}
              onPress={() => router.replace('/')}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.card,
    padding: spacing.xl,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xl,
  },
}));
