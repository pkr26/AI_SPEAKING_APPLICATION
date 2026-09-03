import React, { type ReactNode } from 'react';
import { ScrollView, Text, View, type RefreshControlProps } from 'react-native';

import { createThemedStyles, useTheme } from '../lib/theme';
import Icon, { type IconName } from './Icon';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  body: string;
  /** Optional primary action (a Button) shown under the copy. */
  action?: ReactNode;
  /** Optional pull-to-refresh control for screens whose emptiness is live. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
  testID?: string;
}

/**
 * The shared empty state (Polaris pattern): friendly mark, short positive
 * title, one plain-language body line, and at most one clear action. Never a
 * dead end. The whole missing region is replaced — no orphan headers.
 */
export default function EmptyState({
  icon,
  title,
  body,
  action,
  refreshControl,
  testID,
}: EmptyStateProps) {
  const styles = themedStyles(useTheme());
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.host}
      refreshControl={refreshControl}
      testID={testID}
    >
      <View style={styles.markBadge}>
        <Icon name={icon} size={30} />
      </View>
      <Text accessibilityRole="header" style={styles.title} maxFontSizeMultiplier={1.8}>
        {title}
      </Text>
      <Text style={styles.body} maxFontSizeMultiplier={1.8}>
        {body}
      </Text>
      {action ? <View style={styles.actionRow}>{action}</View> : null}
    </ScrollView>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing, type }) => ({
  host: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  markBadge: {
    width: layout.brandMark,
    height: layout.brandMark,
    borderRadius: layout.brandMark / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: type.headline.fontSize,
    lineHeight: type.headline.lineHeight,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: type.callout.fontSize,
    lineHeight: type.callout.lineHeight,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 420,
  },
  actionRow: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
}));
