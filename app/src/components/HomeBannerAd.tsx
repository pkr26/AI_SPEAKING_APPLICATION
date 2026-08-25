import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { adUnitIdFor, adsNativeModuleWhenReady, useAds } from '../lib/ads';
import { useT } from '../lib/i18n';
import { useTheme } from '../lib/theme';

/** Focused-only adaptive banner with a reserved slot while policy/consent resolves. */
export default function HomeBannerAd({ focused }: { focused: boolean }) {
  const ads = useAds();
  const t = useT();
  const theme = useTheme();
  const { activatePlacement } = ads;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!focused) return;
    void Promise.resolve().then(() => setFailed(false));
    void activatePlacement('homeBanner');
  }, [activatePlacement, focused]);

  if (!focused || failed || ads.statuses.homeBanner === 'blocked') return null;
  const native = ads.statuses.homeBanner === 'ready' ? adsNativeModuleWhenReady() : null;
  const unitId = adUnitIdFor('homeBanner');
  const BannerAd = native?.BannerAd;
  return (
    <View
      style={[styles.slot, { borderColor: theme.colors.border }]}
      accessibilityLabel={t('ads.label')}
    >
      <Text style={[styles.label, { color: theme.colors.muted }]}>{t('ads.label')}</Text>
      {BannerAd && unitId ? (
        <BannerAd
          key={ads.consentVersion}
          unitId={unitId}
          size={native.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: ads.requestNonPersonalizedAdsOnly }}
          onAdFailedToLoad={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    minHeight: 64,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 10,
    marginBottom: 2,
  },
});
