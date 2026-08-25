import Constants from 'expo-constants';
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { apiFetch } from './api';

export type AdsPlacement = 'homeBanner' | 'historyNative';
export type AdsPlacementStatus = 'idle' | 'checking' | 'ready' | 'blocked';

interface RemoteAdsPolicy {
  enabled: boolean;
  audienceMode: 'unknown' | 'adult-only' | 'child';
  placements: Record<AdsPlacement, boolean>;
}

type AdsNativeModule = typeof import('react-native-google-mobile-ads');

interface AdsContextValue {
  statuses: Record<AdsPlacement, AdsPlacementStatus>;
  requestNonPersonalizedAdsOnly: boolean;
  consentVersion: number;
  privacyOptionsRequired: boolean;
  activatePlacement: (placement: AdsPlacement) => Promise<boolean>;
  showPrivacyOptions: () => Promise<boolean>;
}

const INITIAL_STATUSES: Record<AdsPlacement, AdsPlacementStatus> = {
  homeBanner: 'idle',
  historyNative: 'idle',
};
const BLOCKED_STATUSES: Record<AdsPlacement, AdsPlacementStatus> = {
  homeBanner: 'blocked',
  historyNative: 'blocked',
};

const AdsContext = createContext<AdsContextValue | null>(null);
const ADMOB_UNIT_ID = /^ca-app-pub-\d{16}\/\d{10}$/;
const GOOGLE_SAMPLE_PUBLISHER = 'ca-app-pub-3940256099942544/';

let nativeModule: AdsNativeModule | null = null;

export function parseRemoteAdsPolicy(value: unknown): RemoteAdsPolicy | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const ads = (value as { ads?: unknown }).ads;
  if (!ads || typeof ads !== 'object' || Array.isArray(ads)) return null;
  const candidate = ads as Record<string, unknown>;
  const placements = candidate.placements;
  if (!placements || typeof placements !== 'object' || Array.isArray(placements)) return null;
  const placementRecord = placements as Record<string, unknown>;
  if (
    typeof candidate.enabled !== 'boolean' ||
    !['unknown', 'adult-only', 'child'].includes(String(candidate.audienceMode)) ||
    typeof placementRecord.homeBanner !== 'boolean' ||
    typeof placementRecord.historyNative !== 'boolean'
  ) {
    return null;
  }
  const audienceMode = candidate.audienceMode as RemoteAdsPolicy['audienceMode'];
  // Treat a contradictory enabled response as hostile instead of trusting it.
  if (candidate.enabled && audienceMode !== 'adult-only') return null;
  return {
    enabled: candidate.enabled,
    audienceMode,
    placements: {
      homeBanner: placementRecord.homeBanner,
      historyNative: placementRecord.historyNative,
    },
  };
}

/** Resolves the native dependency without letting a missing native binary crash JS startup. */
export function loadAdsNativeModule(loader: () => AdsNativeModule): AdsNativeModule | null {
  try {
    return loader();
  } catch {
    return null;
  }
}

function requireAdsModule(): AdsNativeModule | null {
  // The SDK contains native code and is unavailable in Expo Go. Returning null
  // is a fail-closed capability check, not a claim that Expo Go supports ads.
  if (Constants.appOwnership === 'expo') return null;
  if (nativeModule) return nativeModule;
  return loadAdsNativeModule(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    nativeModule = require('react-native-google-mobile-ads') as AdsNativeModule;
    return nativeModule;
  });
}

interface AdmobExtra {
  homeBannerAndroidUnitId?: unknown;
  homeBannerIosUnitId?: unknown;
  historyNativeAndroidUnitId?: unknown;
  historyNativeIosUnitId?: unknown;
}

export function adUnitIdFor(placement: AdsPlacement): string | null {
  const extra = Constants.expoConfig?.extra?.admob as AdmobExtra | undefined;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;
  const key =
    placement === 'homeBanner'
      ? Platform.OS === 'android'
        ? 'homeBannerAndroidUnitId'
        : 'homeBannerIosUnitId'
      : Platform.OS === 'android'
        ? 'historyNativeAndroidUnitId'
        : 'historyNativeIosUnitId';
  const value = extra?.[key];
  if (typeof value !== 'string' || !ADMOB_UNIT_ID.test(value)) return null;
  if (!__DEV__ && value.startsWith(GOOGLE_SAMPLE_PUBLISHER)) return null;
  return value;
}

export function AdsProvider({ children }: { children: React.ReactNode }) {
  const [statuses, setStatuses] = useState(INITIAL_STATUSES);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [requestNonPersonalizedAdsOnly, setRequestNonPersonalizedAdsOnly] = useState(true);
  const [consentVersion, setConsentVersion] = useState(0);
  const policyRef = useRef<{
    promise: Promise<RemoteAdsPolicy | null> | null;
  }>({ promise: null });
  const initializationPromiseRef = useRef<Promise<boolean> | null>(null);

  const loadPolicy = useCallback(() => {
    const cache = policyRef.current;
    if (cache.promise) return cache.promise;
    cache.promise = apiFetch<unknown>('/client-config', { auth: false })
      .then(parseRemoteAdsPolicy)
      .catch(() => null)
      .finally(() => {
        cache.promise = null;
      });
    return cache.promise;
  }, []);

  const updateConsentRequestMode = useCallback(async (ads: AdsNativeModule) => {
    const gdprApplies = await ads.AdsConsent.getGdprApplies().catch(() => null);
    let nonPersonalized = true;
    if (gdprApplies === false) {
      nonPersonalized = false;
    } else if (gdprApplies === true) {
      const choices = await ads.AdsConsent.getUserChoices().catch(() => null);
      nonPersonalized = choices?.selectPersonalisedAds !== true;
    }
    setRequestNonPersonalizedAdsOnly(nonPersonalized);
    await ads.default().setRequestConfiguration({
      maxAdContentRating: ads.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      ...(__DEV__ ? { testDeviceIdentifiers: ['EMULATOR'] } : {}),
    });
    return nonPersonalized;
  }, []);

  const initializeSdk = useCallback(() => {
    if (initializationPromiseRef.current) return initializationPromiseRef.current;
    const initialization = (async () => {
      const ads = requireAdsModule();
      if (!ads) return false;
      try {
        let consent;
        try {
          consent = await ads.AdsConsent.gatherConsent();
        } catch {
          consent = await ads.AdsConsent.getConsentInfo().catch(() => null);
        }
        if (!consent) return false;
        setPrivacyOptionsRequired(
          consent.privacyOptionsRequirementStatus ===
            ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
        );
        if (!consent.canRequestAds) return false;
        await updateConsentRequestMode(ads);
        await ads.default().initialize();
        return true;
      } catch {
        return false;
      }
    })();
    initializationPromiseRef.current = initialization;
    void initialization.then((ready) => {
      if (!ready && initializationPromiseRef.current === initialization) {
        initializationPromiseRef.current = null;
      }
    });
    return initialization;
  }, [updateConsentRequestMode]);

  const activatePlacement = useCallback(
    async (placement: AdsPlacement) => {
      setStatuses((current) => ({ ...current, [placement]: 'checking' }));
      // Every focused placement activation revalidates the remote kill switch.
      const policy = await loadPolicy();
      if (
        !policy ||
        !policy.enabled ||
        policy.audienceMode !== 'adult-only' ||
        !policy.placements[placement] ||
        !adUnitIdFor(placement)
      ) {
        setStatuses((current) => ({ ...current, [placement]: 'blocked' }));
        return false;
      }
      const ready = await initializeSdk();
      setStatuses((current) => ({ ...current, [placement]: ready ? 'ready' : 'blocked' }));
      return ready;
    },
    [initializeSdk, loadPolicy],
  );

  const showPrivacyOptions = useCallback(async () => {
    if (!privacyOptionsRequired) return false;
    const ads = requireAdsModule();
    if (!ads) return false;
    let formCompleted = false;
    try {
      const result = await ads.AdsConsent.showPrivacyOptionsForm();
      formCompleted = true;
      setPrivacyOptionsRequired(
        result.privacyOptionsRequirementStatus ===
          ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
      );
      if (!result.canRequestAds) {
        initializationPromiseRef.current = null;
        setStatuses({ homeBanner: 'blocked', historyNative: 'blocked' });
        return true;
      }
      await updateConsentRequestMode(ads);
      return true;
    } catch {
      if (formCompleted) {
        initializationPromiseRef.current = null;
        setStatuses({ homeBanner: 'blocked', historyNative: 'blocked' });
      }
      return false;
    } finally {
      // Remount active ads only after the latest request mode has committed.
      // A completed form still invalidates old ads if mode recomputation fails.
      if (formCompleted) setConsentVersion((version) => version + 1);
    }
  }, [privacyOptionsRequired, updateConsentRequestMode]);

  const value = useMemo<AdsContextValue>(
    () => ({
      statuses,
      requestNonPersonalizedAdsOnly,
      consentVersion,
      privacyOptionsRequired,
      activatePlacement,
      showPrivacyOptions,
    }),
    [
      activatePlacement,
      consentVersion,
      privacyOptionsRequired,
      requestNonPersonalizedAdsOnly,
      showPrivacyOptions,
      statuses,
    ],
  );
  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextValue {
  return (
    useContext(AdsContext) ?? {
      statuses: BLOCKED_STATUSES,
      requestNonPersonalizedAdsOnly: true,
      consentVersion: 0,
      privacyOptionsRequired: false,
      activatePlacement: async () => false,
      showPrivacyOptions: async () => false,
    }
  );
}

export function adsNativeModuleWhenReady(): AdsNativeModule | null {
  return nativeModule;
}

export function resetAdsModuleForTests(): void {
  nativeModule = null;
}
