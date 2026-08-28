import React, { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { adUnitIdFor, adsNativeModuleWhenReady, useAds } from '../lib/ads';
import { useT } from '../lib/i18n';
import { layout, useTheme } from '../lib/theme';

export function homeBannerContentWidth(windowWidth: number): number {
  return Math.max(
    1,
    Math.floor(Math.min(windowWidth, layout.contentMaxWidth) - 2 * layout.screenPadding),
  );
}

/** Focused-only adaptive banner with a reserved slot while policy/consent resolves. */
export default function HomeBannerAd({ focused }: { focused: boolean }) {
  return focused ? <FocusedHomeBannerAd /> : null;
}

function FocusedHomeBannerAd() {
  const ads = useAds();
  const t = useT();
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { activatePlacement } = ads;
  const [failedConsentVersion, setFailedConsentVersion] = useState<number | null>(null);
  const [validatedForFocus, setValidatedForFocus] = useState(false);
  const [measuredSlotWidth, setMeasuredSlotWidth] = useState<number | null>(null);
  const slotWidth = measuredSlotWidth ?? homeBannerContentWidth(windowWidth);
  const failed = failedConsentVersion === ads.consentVersion;
  useEffect(() => {
    let active = true;
    void activatePlacement('homeBanner').then((ready) => {
      if (active) setValidatedForFocus(ready);
    });
    return () => {
      active = false;
    };
  }, [activatePlacement, ads.consentVersion]);

  if (failed || ads.statuses.homeBanner === 'blocked') return null;
  const native =
    validatedForFocus && ads.statuses.homeBanner === 'ready' ? adsNativeModuleWhenReady() : null;
  const unitId = adUnitIdFor('homeBanner');
  const BannerAd = native?.BannerAd;
  return (
    <View
      style={[styles.slot, { borderColor: theme.colors.border }]}
      accessibilityLabel={t('ads.label')}
      onLayout={(event: LayoutChangeEvent) => {
        const measured = Math.floor(event.nativeEvent.layout.width);
        if (measured > 0) {
          setMeasuredSlotWidth((current) => (current === measured ? current : measured));
        }
      }}
    >
      <Text style={[styles.label, { color: theme.colors.muted }]}>{t('ads.label')}</Text>
      {BannerAd && unitId ? (
        <BannerAd
          key={ads.consentVersion}
          unitId={unitId}
          // Bind the audited anchored placement to the actual padded content
          // column instead of letting the SDK default to full device width.
          size={native.BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          width={slotWidth}
          requestOptions={{ requestNonPersonalizedAdsOnly: ads.requestNonPersonalizedAdsOnly }}
          onAdFailedToLoad={() => setFailedConsentVersion(ads.consentVersion)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    // The label plus the largest anchored adaptive creative fit without a
    // load-time expansion on tablets; narrower creatives remain centered.
    minHeight: 108,
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
