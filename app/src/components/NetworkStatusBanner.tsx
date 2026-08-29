import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../lib/i18n';
import { useNetworkStatus } from '../lib/network-status';
import { createThemedStyles, useTheme } from '../lib/theme';

const BACK_ONLINE_DURATION_MS = 4_000;

/** Global, non-blocking connectivity feedback for every route. */
export default function NetworkStatusBanner() {
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);
  const insets = useSafeAreaInsets();
  const { reachability, reconnectCount } = useNetworkStatus();
  const [hiddenReconnectCount, setHiddenReconnectCount] = useState(reconnectCount);

  useEffect(() => {
    if (reachability !== 'online' || reconnectCount <= hiddenReconnectCount) return;
    const timeout = setTimeout(
      () => setHiddenReconnectCount(reconnectCount),
      BACK_ONLINE_DURATION_MS,
    );
    return () => clearTimeout(timeout);
  }, [hiddenReconnectCount, reachability, reconnectCount]);

  const offline = reachability === 'offline';
  const showBackOnline = reachability === 'online' && reconnectCount > hiddenReconnectCount;
  if (!offline && !showBackOnline) return null;

  const message = offline ? t('network.offline') : t('network.backOnline');
  return (
    <View
      pointerEvents="none"
      style={[styles.host, { paddingBottom: insets.bottom + theme.spacing.sm }]}
      testID="network-status-banner"
    >
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion={offline ? 'assertive' : 'polite'}
        style={[styles.banner, offline ? styles.offline : styles.online]}
      >
        <View style={[styles.dot, offline ? styles.offlineDot : styles.onlineDot]} />
        <Text style={[styles.text, offline ? styles.offlineText : styles.onlineText]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  host: {
    flexShrink: 0,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  banner: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    minHeight: layout.minimumTarget,
    borderRadius: radii.input,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.ml,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  offline: {
    backgroundColor: colors.warning,
  },
  online: {
    backgroundColor: colors.success,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  offlineDot: {
    backgroundColor: colors.onWarning,
  },
  onlineDot: {
    backgroundColor: colors.onSuccess,
  },
  text: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  offlineText: {
    color: colors.onWarning,
  },
  onlineText: {
    color: colors.onSuccess,
  },
}));
