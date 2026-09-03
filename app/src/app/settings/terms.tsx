import React from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useT } from '../../lib/i18n';
import { createThemedStyles, useTheme } from '../../lib/theme';

/** Static, localized terms matching the current educational service behavior. */
export default function TermsScreen() {
  const t = useT();
  const styles = themedStyles(useTheme());
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <View style={styles.noteCard}>
        <Text style={styles.noteText}>{t('legal.placeholderNote')}</Text>
      </View>
      <Text style={styles.paragraph}>{t('terms.p1')}</Text>
      <Text style={styles.paragraph}>{t('terms.p2')}</Text>
      <Text style={styles.paragraph}>{t('terms.p3')}</Text>
    </ScrollView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  container: {
    flexGrow: 1,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  noteCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.md,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.primaryDark,
  },
  paragraph: {
    marginTop: spacing.lg,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
}));
