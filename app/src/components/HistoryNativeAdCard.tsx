import type { NativeAd } from 'react-native-google-mobile-ads';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, Text } from 'react-native';

import { adUnitIdFor, adsNativeModuleWhenReady, useAds } from '../lib/ads';
import {
  getSubmittedRecordingPlaybackActive,
  subscribeSubmittedRecordingPlaybackActive,
} from '../lib/audio-session';
import { useT } from '../lib/i18n';
import { useTheme } from '../lib/theme';

/** One labeled native card; callers insert it only after at least eight real rows. */
export default function HistoryNativeAdCard({ focused }: { focused: boolean }) {
  const ads = useAds();
  const t = useT();
  const theme = useTheme();
  const { activatePlacement, currentRequestNonPersonalizedAdsOnly } = ads;
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const nativeAdRef = useRef<NativeAd | null>(null);
  const playbackActive = useSyncExternalStore(
    subscribeSubmittedRecordingPlaybackActive,
    getSubmittedRecordingPlaybackActive,
    getSubmittedRecordingPlaybackActive,
  );

  useEffect(() => {
    if (ads.statuses.historyNative !== 'blocked' && !playbackActive) return;
    nativeAdRef.current?.destroy();
    nativeAdRef.current = null;
    void Promise.resolve().then(() => setNativeAd(null));
  }, [ads.statuses.historyNative, playbackActive]);

  useEffect(() => {
    if (!focused || playbackActive) return;
    let active = true;
    let loaded: NativeAd | null = null;
    void (async () => {
      if (!(await activatePlacement('historyNative')) || !active) return;
      const native = adsNativeModuleWhenReady();
      const unitId = adUnitIdFor('historyNative');
      if (!native || !unitId) return;
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
      }
    })();
    return () => {
      active = false;
      if (loaded && nativeAdRef.current === loaded) {
        loaded.destroy();
        nativeAdRef.current = null;
      }
      setNativeAd(null);
    };
  }, [
    activatePlacement,
    ads.consentVersion,
    currentRequestNonPersonalizedAdsOnly,
    focused,
    playbackActive,
  ]);

  if (!focused || playbackActive || ads.statuses.historyNative === 'blocked' || !nativeAd)
    return null;
  const native = adsNativeModuleWhenReady();
  if (!native) return null;
  const { NativeAdView, NativeAsset, NativeAssetType } = native;
  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[
        styles.card,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
      ]}
      accessibilityLabel={t('ads.label')}
    >
      <Text style={[styles.label, { color: theme.colors.muted }]}>{t('ads.label')}</Text>
      <NativeAsset assetType={NativeAssetType.HEADLINE}>
        <Text style={[styles.headline, { color: theme.colors.text }]}>{nativeAd.headline}</Text>
      </NativeAsset>
      {nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text numberOfLines={3} style={[styles.body, { color: theme.colors.muted }]}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      ) : null}
      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <Text
            accessibilityRole="button"
            style={[
              styles.cta,
              { backgroundColor: theme.colors.primary, color: theme.colors.onPrimary },
            ]}
          >
            {nativeAd.callToAction}
          </Text>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingTop: 28,
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  headline: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  cta: {
    minHeight: 44,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontWeight: '700',
  },
});
