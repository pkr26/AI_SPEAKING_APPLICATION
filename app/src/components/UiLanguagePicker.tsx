import React from 'react';
import { Pressable, Text, View } from 'react-native';

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
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('language.appLabel')}
        accessibilityHint={t('language.appHelp')}
        style={styles.grid}
      >
        {UI_LANGUAGE_OPTIONS.map((option) => {
          const selected = value === option.code;
          const localizedName = t(`language.${option.code}`);
          const spokenName =
            localizedName === option.native ? localizedName : `${localizedName}, ${option.native}`;
          return (
            <Pressable
              key={option.code}
              testID={`ui-language-${option.code}`}
              accessibilityRole="radio"
              accessibilityLabel={`${t('language.appLabel')}: ${spokenName}`}
              accessibilityState={{ checked: selected, selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.code)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !disabled && styles.chipPressed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[styles.nativeName, selected && styles.selectedText]}>
                {option.native}
              </Text>
              {localizedName !== option.native && (
                <Text style={[styles.englishName, selected && styles.selectedText]}>
                  {localizedName}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
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
  grid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    minHeight: layout.minimumTarget,
    minWidth: layout.minimumTarget,
    flexGrow: 1,
    flexBasis: '30%',
    maxWidth: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipPressed: {
    borderColor: colors.primary,
  },
  nativeName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  englishName: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  selectedText: {
    color: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
}));
