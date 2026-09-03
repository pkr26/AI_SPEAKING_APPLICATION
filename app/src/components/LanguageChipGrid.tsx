import React, { type ReactNode } from 'react';
import { Pressable, Text, View, type DimensionValue } from 'react-native';

import { useT } from '../lib/i18n';
import type { LanguageOption } from '../lib/language-options';
import { createThemedStyles, useTheme } from '../lib/theme';
import type { UiLanguage } from '../lib/types';

interface LanguageChipGridProps<Code extends UiLanguage = UiLanguage> {
  /** The choosable languages (UI-language or mother-tongue option lists). */
  options: readonly LanguageOption<Code>[];
  selected: Code | null;
  onSelect: (code: Code) => void;
  disabled?: boolean;
  /** Per-chip busy flag; busy chips announce `busy` to screen readers. */
  isBusy?: (code: Code) => boolean;
  /** Screen-reader summary of one chip, e.g. `${label}: ${spoken}`. */
  accessibilityLabelFor: (option: LanguageOption<Code>, localizedLabel: string) => string;
  /** Secondary chip line. Defaults to the localized `language.${code}` copy. */
  localizedLabelFor?: (code: Code) => string;
  /** Optional node rendered inside the chip (check mark, busy spinner slot). */
  renderOverlay?: (code: Code, selected: boolean, busy: boolean) => ReactNode;
  /** Radiogroup label announced to screen readers. */
  groupAccessibilityLabel: string;
  /** Optional radiogroup hint announced to screen readers. */
  groupAccessibilityHint?: string;
  /** Gap above the grid, for callers whose help text sits directly on top. */
  gridMarginTop?: number;
  /** Flex basis per chip; narrower for five-option rows, wider for four. */
  chipFlexBasis?: DimensionValue;
  /** Per-chip testID prefix: `${prefix}-${code}`. */
  chipTestIDPrefix?: string;
}

/**
 * The one language-chip recipe. The auth UI-language picker, signup's
 * mother-tongue picker, and both Settings pickers render this grid so chip
 * metrics, press feedback, disabled dimming, and radio semantics cannot drift
 * between screens. The secondary line shows the localized language name and
 * collapses when it equals the autonym (an English-UI learner still sees
 * "English" once, not twice).
 */
export default function LanguageChipGrid<Code extends UiLanguage = UiLanguage>({
  options,
  selected,
  onSelect,
  disabled = false,
  isBusy,
  accessibilityLabelFor,
  localizedLabelFor,
  renderOverlay,
  groupAccessibilityLabel,
  groupAccessibilityHint,
  gridMarginTop,
  chipFlexBasis,
  chipTestIDPrefix = 'language-chip',
}: LanguageChipGridProps<Code>) {
  const t = useT();
  const styles = themedStyles(useTheme());
  const localizedFor: (code: Code) => string =
    localizedLabelFor ?? ((code: Code) => t(`language.${code}`));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={groupAccessibilityLabel}
      accessibilityHint={groupAccessibilityHint}
      style={[styles.grid, gridMarginTop !== undefined && { marginTop: gridMarginTop }]}
    >
      {options.map((option) => {
        const isSelected = selected === option.code;
        const busy = isBusy?.(option.code) ?? false;
        const localizedLabel = localizedFor(option.code);
        return (
          <Pressable
            key={option.code}
            testID={`${chipTestIDPrefix}-${option.code}`}
            accessibilityRole="radio"
            accessibilityLabel={accessibilityLabelFor(option, localizedLabel)}
            accessibilityState={{ checked: isSelected, disabled, busy }}
            disabled={disabled}
            onPress={() => onSelect(option.code)}
            style={({ pressed }) => [
              styles.chip,
              chipFlexBasis !== undefined && { flexBasis: chipFlexBasis },
              isSelected && styles.chipSelected,
              pressed && !disabled && styles.chipPressed,
              disabled && styles.chipDisabled,
            ]}
          >
            <Text style={[styles.nativeName, isSelected && styles.selectedText]}>
              {option.native}
            </Text>
            {localizedLabel !== option.native && (
              <Text style={[styles.localizedLabel, isSelected && styles.selectedText]}>
                {localizedLabel}
              </Text>
            )}
            {renderOverlay && renderOverlay(option.code, isSelected, busy)}
          </Pressable>
        );
      })}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chip: {
    position: 'relative',
    minHeight: layout.minimumTarget,
    minWidth: layout.minimumTarget,
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    // The chip fill is the form's own card color, so this border is the only
    // thing that makes a mandatory tap target visible. `border` is a
    // decorative hairline; the form-field token clears the 3:1 non-text bar.
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  nativeName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  localizedLabel: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  selectedText: {
    color: colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
}));
