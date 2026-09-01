import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { createThemedStyles, useTheme } from '../lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet';
export type ButtonSize = 'lg' | 'md' | 'sm';

export interface ButtonProps {
  /** Visible label; also the accessible name unless a label is provided. */
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * primary   — filled brand CTA (default)
   * secondary — outlined brand action
   * danger    — filled destructive action
   * quiet     — text-only, low-emphasis action
   */
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Shows a spinner, reports busy to assistive tech, and blocks presses. */
  loading?: boolean;
  /** Stretches the button across its parent instead of hugging the label. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  /** Layout-only overrides from the call site (margins, alignment). */
  style?: StyleProp<ViewStyle>;
}

const themedStyles = createThemedStyles(({ colors, layout, radii, scheme, spacing }) => ({
  base: {
    minHeight: layout.minimumTarget,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.button,
  },
  lg: {
    paddingVertical: spacing.ml,
    paddingHorizontal: spacing.xl,
  },
  md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.ml,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
  },
  disabled: {
    opacity: 0.5,
  },
  primary: {
    backgroundColor: colors.primary,
    // A hard bottom edge (no blur) reads as a physical key; pressing it
    // collapses the edge (see primaryPressed) so the tap feels mechanical
    // rather than painted. Dark keeps a stronger cast for the same reason the
    // record button does: black shadows vanish on the dark background.
    shadowColor: colors.shadow,
    shadowOpacity: scheme === 'dark' ? 0.55 : 0.28,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  primaryPressed: {
    backgroundColor: colors.primaryDark,
    shadowOpacity: scheme === 'dark' ? 0.3 : 0.12,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryPressed: {
    backgroundColor: colors.primaryLight,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dangerPressed: {
    opacity: 0.85,
  },
  quiet: {},
  quietPressed: {
    backgroundColor: colors.primaryLight,
  },
  text: {
    flexShrink: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  lgText: {
    fontSize: 18,
    lineHeight: 24,
  },
  mdText: {
    fontSize: 17,
    lineHeight: 23,
  },
  smText: {
    fontSize: 15,
    lineHeight: 20,
  },
  primaryText: {
    color: colors.onPrimary,
  },
  secondaryText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.onDanger,
  },
  quietText: {
    color: colors.primary,
  },
}));

/**
 * The one shared button (U-M9); the mic button and other specialized controls
 * stay bespoke.
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const styles = themedStyles(theme);
  const blocked = disabled || loading;
  const spinnerColor =
    variant === 'primary'
      ? theme.colors.onPrimary
      : variant === 'danger'
        ? theme.colors.onDanger
        : theme.colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        pressed && styles[`${variant}Pressed`],
        blocked && styles.disabled,
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator
          testID="button-loading-indicator"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          size="small"
          color={spinnerColor}
        />
      )}
      <Text style={[styles.text, styles[`${size}Text`], styles[`${variant}Text`]]}>{title}</Text>
    </Pressable>
  );
}
