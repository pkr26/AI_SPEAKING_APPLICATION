import React from 'react';
import { Text, View } from 'react-native';

import Button from './Button';
import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';

interface DataRefreshNoticeProps {
  updating: boolean;
  failed: boolean;
  onRetry: () => void;
}

/** Nonblocking freshness feedback that never replaces already loaded data. */
export default function DataRefreshNotice({ updating, failed, onRetry }: DataRefreshNoticeProps) {
  const t = useT();
  const styles = themedStyles(useTheme());
  if (!updating && !failed) return null;
  return (
    <View style={[styles.notice, failed && styles.failed]}>
      <Text
        accessibilityLiveRegion={failed ? 'assertive' : 'polite'}
        accessibilityRole={failed ? 'alert' : undefined}
        style={[styles.text, failed && styles.failedText]}
      >
        {t(failed ? 'refresh.failedUsingSaved' : 'refresh.updating')}
      </Text>
      {failed && (
        <Button title={t('common.tryAgain')} variant="quiet" size="sm" onPress={onRetry} />
      )}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, radii, spacing }) => ({
  notice: {
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.input,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  failed: {
    borderColor: colors.warning,
    backgroundColor: colors.card,
  },
  text: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  failedText: {
    color: colors.warning,
  },
}));
