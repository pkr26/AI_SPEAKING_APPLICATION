import Constants from 'expo-constants';
import React, { useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Linking, Modal, Platform, ScrollView, Text, View } from 'react-native';

import Button from './Button';
import { getClientUpgradeSnapshot, subscribeToClientUpgrade } from '../lib/client-upgrade-store';
import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';

export const IOS_STORE_SEARCH_FALLBACK =
  'https://apps.apple.com/us/search?term=AI%20English%20Coach';
export const ANDROID_PLAY_STORE_FALLBACK =
  'https://play.google.com/store/apps/details?id=com.aienglish.coach';

function configuredStoreUrls(): unknown {
  const extra: unknown = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') return undefined;
  return (extra as Record<string, unknown>).storeUrls;
}

function safeConfiguredUrl(platform: string, storeUrls: unknown): string | null {
  if (!storeUrls || typeof storeUrls !== 'object') return null;
  const record = storeUrls as Record<string, unknown>;
  const value = platform === 'ios' ? record.ios : record.android;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized) return null;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash)
    return null;
  if (platform === 'ios') {
    return url.hostname === 'apps.apple.com' && /\/id\d+\/?$/.test(url.pathname)
      ? normalized
      : null;
  }
  return url.hostname === 'play.google.com' &&
    url.pathname === '/store/apps/details' &&
    url.searchParams.get('id') === 'com.aienglish.coach'
    ? normalized
    : null;
}

/** Safe runtime fallback protects even a malformed development manifest. */
export function clientUpgradeStoreUrl(
  platform: string = Platform.OS,
  storeUrls: unknown = configuredStoreUrls(),
): string {
  return (
    safeConfiguredUrl(platform, storeUrls) ??
    (platform === 'ios' ? IOS_STORE_SEARCH_FALLBACK : ANDROID_PLAY_STORE_FALLBACK)
  );
}

/**
 * A non-dismissible overlay instead of a replacement route. The active screen
 * stays mounted below it, preserving recorder and interrupted-upload state.
 */
export default function ClientUpgradeModal({ onLocalSignOut }: { onLocalSignOut?: () => void }) {
  const t = useT();
  const styles = themedStyles(useTheme());
  const { required } = useSyncExternalStore(
    subscribeToClientUpgrade,
    getClientUpgradeSnapshot,
    getClientUpgradeSnapshot,
  );
  const [openingStore, setOpeningStore] = useState(false);
  const [openFailed, setOpenFailed] = useState(false);
  const openingStoreRef = useRef(false);

  const openStore = async () => {
    if (openingStoreRef.current) return;
    openingStoreRef.current = true;
    setOpeningStore(true);
    setOpenFailed(false);
    try {
      await Linking.openURL(clientUpgradeStoreUrl());
    } catch {
      setOpenFailed(true);
    } finally {
      openingStoreRef.current = false;
      setOpeningStore(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => AccessibilityInfo.announceForAccessibility(t('upgrade.title'))}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={required}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text accessibilityRole="header" style={styles.title}>
              {t('upgrade.title')}
            </Text>
            <Text style={styles.body}>{t('upgrade.body')}</Text>
            {openFailed && (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={styles.error}
              >
                {t('upgrade.openFailed')}
              </Text>
            )}
            <Button
              accessibilityHint={t('upgrade.actionHint')}
              fullWidth
              loading={openingStore}
              onPress={() => void openStore()}
              style={styles.action}
              title={t('upgrade.action')}
            />
            {onLocalSignOut && (
              <Button
                fullWidth
                onPress={onLocalSignOut}
                style={styles.secondaryAction}
                title={t('logout.thisDevice')}
                variant="secondary"
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const themedStyles = createThemedStyles(({ colors, layout, radii, spacing }) => ({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    maxHeight: '90%',
    overflow: 'hidden',
    borderRadius: radii.card,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 20,
  },
  content: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: spacing.md,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  error: {
    marginTop: spacing.ml,
    color: colors.danger,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.xl,
  },
  secondaryAction: {
    marginTop: spacing.md,
  },
}));
