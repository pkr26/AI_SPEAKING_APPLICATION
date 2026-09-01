import React from 'react';
import { Text, View } from 'react-native';

import { useT, type MessageKey } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';

export type PasswordStrength = 'empty' | 'weak' | 'fair' | 'strong';

/**
 * Local strength tier for a candidate password. The server's policy (8+
 * characters with a letter and a number) is the "fair" floor — anything the
 * server would reject is "weak" — and strength beyond it rewards length and
 * character variety. Pure client-side guidance: the authoritative check stays
 * on the server.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 'empty';
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (password.length < 8 || !hasLetter || !hasNumber) return 'weak';
  const variety =
    (/[a-z]/.test(password) ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(password) ? 1 : 0);
  if (password.length >= 12 && variety >= 3) return 'strong';
  return 'fair';
}

const SEGMENT_TIER: Record<Exclude<PasswordStrength, 'empty'>, number> = {
  weak: 1,
  fair: 2,
  strong: 3,
};

const LABEL_KEY: Record<Exclude<PasswordStrength, 'empty'>, MessageKey> = {
  weak: 'password.strengthWeak',
  fair: 'password.strengthFair',
  strong: 'password.strengthStrong',
};

export interface PasswordStrengthMeterProps {
  /** The candidate password; an empty string renders nothing. */
  password: string;
  testID?: string;
}

/**
 * The live strength meter under a new-password field (NN/g: disclose
 * constraints and show strength for error-prone input). Three segments fill
 * with the tier's semantic ink and a localized label names the tier, so the
 * reading never depends on color alone.
 */
export default function PasswordStrengthMeter({ password, testID }: PasswordStrengthMeterProps) {
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const tier = passwordStrength(password);
  if (tier === 'empty') return null;

  const filled = SEGMENT_TIER[tier];
  const ink =
    tier === 'weak'
      ? theme.colors.danger
      : tier === 'fair'
        ? theme.colors.warning
        : theme.colors.success;

  return (
    <View accessible accessibilityLabel={t(LABEL_KEY[tier])} testID={testID} style={styles.row}>
      <View style={styles.segments}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            testID={testID ? `${testID}-segment-${index < filled ? 'on' : 'off'}` : undefined}
            style={[
              styles.segment,
              { backgroundColor: index < filled ? ink : theme.colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color: ink }]}>{t(LABEL_KEY[tier])}</Text>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, radii, spacing, type }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  segment: {
    flex: 1,
    height: 5,
    borderRadius: radii.pill,
  },
  label: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    fontWeight: '700',
  },
}));
