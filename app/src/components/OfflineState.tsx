import React from 'react';
import { Text, View } from 'react-native';

import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';

/** Inline no-data state; the global banner remains the persistent indicator. */
export default function OfflineState() {
  const t = useT();
  const styles = themedStyles(useTheme());
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('network.offlineTitle')}
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.body}>
        {t('network.offlineBody')}
      </Text>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, spacing }) => ({
  container: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
}));
