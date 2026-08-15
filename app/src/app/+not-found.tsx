import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import Button from '../components/Button';
import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';

export default function NotFoundScreen() {
  const t = useT();
  const styles = themedStyles(useTheme());
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('notFound.title')}
        </Text>
        <Text style={styles.body}>{t('notFound.body')}</Text>
        <Button
          title={t('notFound.goHome')}
          onPress={() => router.replace('/')}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.xl,
  },
}));
