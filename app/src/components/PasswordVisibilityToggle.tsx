import React from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../lib/theme';
import Icon from './Icon';

export interface PasswordVisibilityToggleProps {
  /** Whether the password is currently revealed. */
  visible: boolean;
  /** Localized "Show password" label; announced instead of the glyph. */
  accessibilityLabel: string;
  onToggle: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * The eye-icon password reveal used beside every secret field (NN/g: mask by
 * default at login, offer an unmask control — typing on mobile is slow and
 * error-prone). The icon is the visible affordance; the localized label is the
 * accessible name, so no translated word has to fit beside the field.
 */
export default function PasswordVisibilityToggle({
  visible,
  accessibilityLabel,
  onToggle,
  disabled = false,
  testID,
}: PasswordVisibilityToggleProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      testID={testID ?? (visible ? 'password-toggle-hide' : 'password-toggle-show')}
      hitSlop={4}
      onPress={onToggle}
      style={({ pressed }) => [
        {
          width: theme.layout.minimumTarget,
          height: theme.layout.minimumTarget,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && { opacity: 0.6 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Icon name={visible ? 'eye-off' : 'eye'} size={22} color={theme.colors.primary} />
    </Pressable>
  );
}
