import React from 'react';
import { Text, View } from 'react-native';

import LanguageChipGrid from './LanguageChipGrid';
import { useT } from '../lib/i18n';
import { UI_LANGUAGE_OPTIONS } from '../lib/language-options';
import { createThemedStyles, useTheme } from '../lib/theme';
import type { UiLanguage } from '../lib/types';

interface UiLanguagePickerProps {
  value: UiLanguage;
  onChange: (language: UiLanguage) => void;
  disabled?: boolean;
  error?: string | null;
}

/** Compact, screen-reader-friendly app-language chooser for public screens. */
export default function UiLanguagePicker({
  value,
  onChange,
  disabled = false,
  error = null,
}: UiLanguagePickerProps) {
  const t = useT();
  const styles = themedStyles(useTheme());

  return (
    <View style={styles.container}>
      <Text nativeID="ui-language-label" style={styles.label}>
        {t('language.appLabel')}
      </Text>
      <Text nativeID="ui-language-help" style={styles.help}>
        {t('language.appHelp')}
      </Text>
      <LanguageChipGrid
        options={UI_LANGUAGE_OPTIONS}
        selected={value}
        onSelect={onChange}
        disabled={disabled}
        groupAccessibilityLabel={t('language.appLabel')}
        groupAccessibilityHint={t('language.appHelp')}
        gridMarginTop={styles.gridWrap.marginTop}
        chipFlexBasis="30%"
        chipTestIDPrefix="ui-language"
        accessibilityLabelFor={(option, localizedLabel) => {
          const spokenName =
            localizedLabel === option.native
              ? localizedLabel
              : `${localizedLabel}, ${option.native}`;
          return `${t('language.appLabel')}: ${spokenName}`;
        }}
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, spacing }) => ({
  container: {
    marginTop: spacing.lg,
    width: '100%',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  help: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  gridWrap: {
    marginTop: spacing.sm,
  },
  error: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
}));
