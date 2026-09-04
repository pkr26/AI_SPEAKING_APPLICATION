import type { NativeAd } from 'react-native-google-mobile-ads';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';

import { adUnitIdFor, adsNativeModuleWhenReady, useAds } from '../lib/ads';
import {
  getSubmittedRecordingPlaybackActive,
  subscribeSubmittedRecordingPlaybackActive,
} from '../lib/audio-session';
import { useT } from '../lib/i18n';
import { createThemedStyles, useTheme } from '../lib/theme';

export function historyNativeAdReservedHeight(fontScale: number): number {
  const safeScale = Number.isFinite(fontScale) ? Math.max(fontScale, 1) : 1;
  return Math.ceil(260 * safeScale);
}

/** One labeled native card; callers insert it only after at least eight real rows. */
export default function HistoryNativeAdCard({ focused }: { focused: boolean }) {
  const ads = useAds();
  const t = useT();
  const styles = themedStyles(useTheme());
  const { fontScale } = useWindowDimensions();
  const reservedHeight = historyNativeAdReservedHeight(fontScale);
  const { activatePlacement, currentRequestNonPersonalizedAdsOnly } = ads;
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const nativeAdRef = useRef<NativeAd | null>(null);
  // True once the focus effect has run at least once: the deferred
  // load-failure reset below only has work to do on a REfocus after a
  // collapsed no-fill, because the mount-time value of loadFailed is
  // definitionally the pristine authored false.
  const hadFocusRef = useRef(false);
  // Declared before the effects below so its unmount cleanup runs first: the
  // deferred/cleanup setState calls then skip cleanly once unmounted instead
  // of writing state on a gone component (harmless in RN, but inconsistent
  // with the `active` flag discipline the rest of this file follows).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const playbackActive = useSyncExternalStore(
    subscribeSubmittedRecordingPlaybackActive,
    getSubmittedRecordingPlaybackActive,
    getSubmittedRecordingPlaybackActive,
  );

  useEffect(() => {
    if (ads.statuses.historyNative !== 'blocked' && !playbackActive) return;
    nativeAdRef.current?.destroy();
    nativeAdRef.current = null;
    void Promise.resolve().then(() => {
      if (mountedRef.current) setNativeAd(null);
    });
  }, [ads.statuses.historyNative, playbackActive]);

  useEffect(() => {
    if (!focused || playbackActive) return;
    let active = true;
    let loaded: NativeAd | null = null;
    // A new focus is a new bounded request opportunity. Publish the visual
    // reset after the effect commit so it cannot cause a synchronous effect
    // render loop and a prior no-fill remains collapsed while blurred. The
    // first focus skips the reset: loadFailed still holds its initial false
    // there, so the authored initial value remains the only source of the
    // first ready paint's collapsed-or-reserved outcome.
    if (hadFocusRef.current) {
      void Promise.resolve().then(() => {
        if (active) setLoadFailed(false);
      });
    }
    hadFocusRef.current = true;
    void (async () => {
      if (!(await activatePlacement('historyNative')) || !active) return;
      const native = adsNativeModuleWhenReady();
      const unitId = adUnitIdFor('historyNative');
      if (!native || !unitId) {
        if (active) setLoadFailed(true);
        return;
      }
      try {
        loaded = await native.NativeAd.createForAdRequest(unitId, {
          requestNonPersonalizedAdsOnly: currentRequestNonPersonalizedAdsOnly(),
        });
        if (!active) {
          loaded.destroy();
          return;
        }
        nativeAdRef.current = loaded;
        setNativeAd(loaded);
      } catch {
        // No-fill and SDK failures stay collapsed until a later focus retry.
        if (active) setLoadFailed(true);
      }
    })();
    return () => {
      active = false;
      if (loaded && nativeAdRef.current === loaded) {
        loaded.destroy();
        nativeAdRef.current = null;
      }
      if (mountedRef.current) setNativeAd(null);
    };
  }, [
    activatePlacement,
    ads.consentVersion,
    currentRequestNonPersonalizedAdsOnly,
    focused,
    playbackActive,
  ]);

  if (!focused || playbackActive || ads.statuses.historyNative === 'blocked' || loadFailed)
    return null;
  // The reserved placeholder is keyed to the null sentinel itself: only the
  // un-requested state reserves the slot, and only a loaded creative renders
  // the card, so no other value can silently render an assetless card.
  if (nativeAd === null) {
    return (
      <Text
        style={[styles.placeholder, { minHeight: reservedHeight }]}
        testID="history-native-ad-reserved"
      >
        {t('ads.label')}
      </Text>
    );
  }
  const native = adsNativeModuleWhenReady();
  if (!native) return null;
  const { NativeAdView, NativeAsset, NativeAssetType } = native;
  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[styles.card, { minHeight: reservedHeight }]}
      accessibilityLabel={t('ads.label')}
      accessibilityRole="image"
    >
      <Text style={styles.label}>{t('ads.label')}</Text>
      <NativeAsset assetType={NativeAssetType.HEADLINE}>
        <Text numberOfLines={2} style={styles.headline}>
          {nativeAd.headline}
        </Text>
      </NativeAsset>
      {nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text numberOfLines={3} style={styles.body}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      ) : null}
      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View
            accessible
            accessibilityRole="button"
            // Rendered only for a loaded creative, and NativeAdView performs
            // the activation: this View deliberately has no press handler so
            // it cannot claim the touch responder away from the ad view, while
            // accessible + the authored role/state keep assistive tech honest.
            accessibilityState={{ disabled: false }}
            style={styles.cta}
          >
            <Text numberOfLines={2} style={styles.ctaText}>
              {nativeAd.callToAction}
            </Text>
          </View>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const themedStyles = createThemedStyles(({ colors, radii, spacing, type }) => ({
  card: {
    borderWidth: 1,
    borderRadius: radii.input,
    marginTop: 24,
    marginBottom: 24,
    padding: spacing.lg,
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  placeholder: {
    marginTop: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: 14,
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
    textAlignVertical: 'top',
    backgroundColor: colors.card,
    borderColor: colors.border,
    color: colors.muted,
  },
  label: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: colors.muted,
  },
  headline: { fontSize: 17, lineHeight: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.muted },
  cta: {
    minHeight: 48,
    borderRadius: radii.button,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  ctaText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.onPrimary,
  },
}));
