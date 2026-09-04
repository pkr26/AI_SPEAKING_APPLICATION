import React, { useEffect, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { adUnitIdFor, adsNativeModuleWhenReady, useAds } from '../lib/ads';
import { useT } from '../lib/i18n';
import { createThemedStyles, layout, useTheme } from '../lib/theme';

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
  const styles = themedStyles(useTheme());
  const { width: windowWidth } = useWindowDimensions();
  const { activatePlacement } = ads;
  const [failedConsentVersion, setFailedConsentVersion] = useState<number | null>(null);
  const [validatedForFocus, setValidatedForFocus] = useState(false);
  const [measuredSlotWidth, setMeasuredSlotWidth] = useState<number | null>(null);
  const slotWidth = measuredSlotWidth ?? homeBannerContentWidth(windowWidth);
  // The failure record is either the null sentinel (never failed) or the
  // consent version it failed under; any other value can only be corrupted
  // state, and the slot fails closed instead of requesting under an unknown
  // failure history.
  const failed =
    (failedConsentVersion !== null && typeof failedConsentVersion !== 'number') ||
    failedConsentVersion === ads.consentVersion;
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
      style={styles.slot}
      accessibilityLabel={t('ads.label')}
      onLayout={(event: LayoutChangeEvent) => {
        const measured = Math.floor(event.nativeEvent.layout.width);
        if (measured > 0) {
          setMeasuredSlotWidth((current) => (current === measured ? current : measured));
        }
      }}
    >
      <Text style={styles.label}>{t('ads.label')}</Text>
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

const themedStyles = createThemedStyles(({ colors, type }) => ({
  slot: {
    // The label plus the largest anchored adaptive creative fit without a
    // load-time expansion on tablets; narrower creatives remain centered.
    minHeight: 108,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  label: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    marginBottom: 2,
    color: colors.muted,
  },
}));
