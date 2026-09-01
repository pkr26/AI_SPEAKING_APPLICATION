import React from 'react';
import { Text, View } from 'react-native';

import { createThemedStyles, useTheme } from '../lib/theme';
import Icon, { type IconName } from './Icon';

export type StatTileTint = 'primary' | 'accent' | 'success' | 'neutral';

export interface StatTileProps {
  icon: IconName;
  /** The headline figure ("B1", "12", "3"). */
  value: string;
  /** What the figure measures ("Current level", "Day streak"). */
  label: string;
  tint?: StatTileTint;
  testID?: string;
}

/**
 * A dashboard stat tile: tinted icon badge, big numeral, caption. Tiles flex
 * equally inside a row so Home reads as a glanceable stat strip instead of a
 * paragraph of sentences.
 */
export default function StatTile({ icon, value, label, tint = 'neutral', testID }: StatTileProps) {
  const theme = useTheme();
  const styles = themedStyles(theme);

  const tintFill =
    tint === 'primary'
      ? theme.colors.primaryLight
      : tint === 'accent'
        ? theme.colors.accentLight
        : tint === 'success'
          ? theme.colors.successLight
          : theme.colors.card;
  const tintInk =
    tint === 'primary'
      ? theme.colors.primary
      : tint === 'accent'
        ? theme.colors.accent
        : tint === 'success'
          ? theme.colors.success
          : theme.colors.muted;
  const tintBorder = tint === 'neutral' ? theme.colors.border : 'transparent';

  return (
    <View
      testID={testID}
      style={[styles.tile, { borderColor: tintBorder, backgroundColor: tintFill }]}
    >
      <View style={[styles.iconBadge, { backgroundColor: theme.colors.card }]}>
        <Icon name={icon} size={18} color={tintInk} strokeWidth={2.2} />
      </View>
      <Text style={styles.value} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, radii, spacing, type, elevation }) => ({
  tile: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
    borderRadius: radii.card,
    borderWidth: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    ...elevation.resting,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: type.titleLg.fontSize,
    lineHeight: type.titleLg.lineHeight,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
}));
