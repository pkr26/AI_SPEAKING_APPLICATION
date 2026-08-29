import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Constants from 'expo-constants';
import React from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { apiFetch } from '../src/lib/api';
import {
  AdsProvider,
  adUnitIdFor,
  adsNativeModuleWhenReady,
  loadAdsNativeModule,
  parseRemoteAdsPolicy,
  resetAdsModuleForTests,
  useAds,
} from '../src/lib/ads';
import HomeBannerAd, { homeBannerContentWidth } from '../src/components/HomeBannerAd';
import HistoryNativeAdCard, {
  historyNativeAdReservedHeight,
} from '../src/components/HistoryNativeAdCard';
import { claimPlaybackOwner } from '../src/lib/audio-session';
import { lightColors } from '../src/lib/theme';

const mockGatherConsent = jest.fn();
const mockGetConsentInfo = jest.fn();
const mockGetGdprApplies = jest.fn();
const mockGetUserChoices = jest.fn();
const mockShowPrivacyOptionsForm = jest.fn();
const mockSetRequestConfiguration = jest.fn();
const mockInitialize = jest.fn();
const mockNativeAdCreate = jest.fn();
const mockNativeAdViewRender = jest.fn();
const mockNativeAssetRender = jest.fn();
const mockBannerMount = jest.fn();
const mockBannerProps = jest.fn();

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    appOwnership: 'standalone',
    expoConfig: {
      extra: {
        admob: {
          homeBannerAndroidUnitId: 'ca-app-pub-3940256099942544/9214589741',
          homeBannerIosUnitId: 'ca-app-pub-3940256099942544/2435281174',
          historyNativeAndroidUnitId: 'ca-app-pub-3940256099942544/2247696110',
          historyNativeIosUnitId: 'ca-app-pub-3940256099942544/3986624511',
        },
      },
    },
  },
}));

jest.mock('../src/lib/api', () => ({ apiFetch: jest.fn() }));
jest.mock('expo-audio', () => ({ setAudioModeAsync: jest.fn(async () => undefined) }));

jest.mock('react-native-google-mobile-ads', () => {
  // Jest requires dependencies inside the hoisted factory.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactModule = require('react') as typeof React;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactNativeModule = require('react-native') as typeof import('react-native');
  const { Text: NativeText, View: NativeView } = ReactNativeModule;
  return {
    __esModule: true,
    default: () => ({
      setRequestConfiguration: mockSetRequestConfiguration,
      initialize: mockInitialize,
    }),
    AdsConsent: {
      gatherConsent: mockGatherConsent,
      getConsentInfo: mockGetConsentInfo,
      getGdprApplies: mockGetGdprApplies,
      getUserChoices: mockGetUserChoices,
      showPrivacyOptionsForm: mockShowPrivacyOptionsForm,
    },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 1, NOT_REQUIRED: 2 },
    MaxAdContentRating: { PG: 'PG' },
    BannerAdSize: {
      ANCHORED_ADAPTIVE_BANNER: 'ANCHORED',
      INLINE_ADAPTIVE_BANNER: 'INLINE',
    },
    BannerAd: (props: {
      onAdFailedToLoad: () => void;
      requestOptions: { requestNonPersonalizedAdsOnly: boolean };
      size: string;
      width: number;
    }) => {
      ReactModule.useEffect(() => {
        mockBannerProps(props);
        mockBannerMount(props.requestOptions);
        // A real BannerAd requests only at mount; the consentVersion key must
        // replace it when privacy choices change.
      }, []);
      return ReactModule.createElement(
        NativeText,
        {
          accessibilityValue: {
            text: `${props.size}:${props.width}`,
          },
          onPress: props.onAdFailedToLoad,
          testID: 'banner-ad',
        },
        'banner',
      );
    },
    NativeAd: { createForAdRequest: mockNativeAdCreate },
    NativeAdView: ({
      accessibilityLabel,
      children,
      nativeAd,
      style,
    }: {
      accessibilityLabel?: string;
      children: React.ReactNode;
      nativeAd: unknown;
      style?: React.ComponentProps<typeof NativeView>['style'];
    }) => {
      mockNativeAdViewRender({ accessibilityLabel, nativeAd, style });
      return ReactModule.createElement(
        NativeView,
        { accessibilityLabel, style, testID: 'native-ad-view' },
        children,
      );
    },
    NativeAsset: ({ assetType, children }: { assetType: string; children: React.ReactNode }) => {
      mockNativeAssetRender({ assetType });
      return children;
    },
    NativeAssetType: { HEADLINE: 'headline', BODY: 'body', CALL_TO_ACTION: 'callToAction' },
  };
});

const remoteEnabled = {
  ads: {
    enabled: true,
    audienceMode: 'adult-only',
    placements: { homeBanner: true, historyNative: false },
  },
};

let latestAds: ReturnType<typeof useAds> | null = null;

function Probe() {
  const ads = useAds();
  React.useEffect(() => {
    latestAds = ads;
    return () => {
      if (latestAds === ads) latestAds = null;
    };
  }, [ads]);
  const [activationResult, setActivationResult] = React.useState('unset');
  const [privacyResult, setPrivacyResult] = React.useState('unset');
  return (
    <>
      <Text testID="status">{ads.statuses.homeBanner}</Text>
      <Text testID="history-status">{ads.statuses.historyNative}</Text>
      <Text testID="activation-result">{activationResult}</Text>
      <Text testID="privacy">{String(ads.privacyOptionsRequired)}</Text>
      <Text testID="npa">{String(ads.requestNonPersonalizedAdsOnly)}</Text>
      <Text testID="current-npa">{String(ads.currentRequestNonPersonalizedAdsOnly())}</Text>
      <Text testID="consent-version">{String(ads.consentVersion)}</Text>
      <Text testID="privacy-result">{privacyResult}</Text>
      <Pressable
        testID="activate"
        onPress={() =>
          void ads
            .activatePlacement('homeBanner')
            .then((result) => setActivationResult(String(result)))
        }
      />
      <Pressable
        testID="privacy-action"
        onPress={() =>
          void ads.showPrivacyOptions().then((result) => setPrivacyResult(String(result)))
        }
      />
    </>
  );
}

beforeEach(() => {
  latestAds = null;
  jest.clearAllMocks();
  mockNativeAdCreate.mockReset();
  resetAdsModuleForTests();
  mockGatherConsent.mockResolvedValue({
    canRequestAds: true,
    privacyOptionsRequirementStatus: 2,
  });
  mockGetConsentInfo.mockResolvedValue({
    canRequestAds: false,
    privacyOptionsRequirementStatus: 2,
  });
  mockGetGdprApplies.mockResolvedValue(false);
  mockGetUserChoices.mockResolvedValue({ selectPersonalisedAds: false });
  mockShowPrivacyOptionsForm.mockResolvedValue({
    canRequestAds: true,
    privacyOptionsRequirementStatus: 2,
  });
  mockSetRequestConfiguration.mockResolvedValue(undefined);
  mockInitialize.mockResolvedValue([]);
  mockNativeAdCreate.mockResolvedValue({
    headline: 'Learn today',
    body: 'A test ad',
    callToAction: 'Open',
    destroy: jest.fn(),
  });
});

describe('remote ad policy parser', () => {
  it('accepts the exact adult-only placement contract', () => {
    expect(parseRemoteAdsPolicy(remoteEnabled)).toEqual(remoteEnabled.ads);
  });

  it.each(['unknown', 'child'] as const)(
    'accepts a disabled %s audience only as a fully disabled policy',
    (audienceMode) => {
      expect(
        parseRemoteAdsPolicy({
          ads: {
            enabled: false,
            audienceMode,
            placements: { homeBanner: false, historyNative: false },
          },
        }),
      ).toEqual({
        enabled: false,
        audienceMode,
        placements: { homeBanner: false, historyNative: false },
      });
    },
  );

  it('rejects truthy primitive containers and array-shaped nested contracts', () => {
    const adsArray = Object.assign([], {
      enabled: true,
      audienceMode: 'adult-only',
      placements: { homeBanner: true, historyNative: true },
    });
    const placementsArray = Object.assign([], {
      homeBanner: true,
      historyNative: true,
    });
    const rootFunction = Object.assign(() => undefined, { ads: remoteEnabled.ads });
    const adsFunction = Object.assign(() => undefined, remoteEnabled.ads);
    const placementsFunction = Object.assign(() => undefined, {
      homeBanner: true,
      historyNative: true,
    });
    expect(parseRemoteAdsPolicy('not-an-object')).toBeNull();
    expect(parseRemoteAdsPolicy(rootFunction)).toBeNull();
    expect(parseRemoteAdsPolicy({ ads: null })).toBeNull();
    expect(parseRemoteAdsPolicy({ ads: adsArray })).toBeNull();
    expect(parseRemoteAdsPolicy({ ads: adsFunction })).toBeNull();
    expect(
      parseRemoteAdsPolicy({ ads: { ...remoteEnabled.ads, placements: placementsArray } }),
    ).toBeNull();
    expect(
      parseRemoteAdsPolicy({ ads: { ...remoteEnabled.ads, placements: placementsFunction } }),
    ).toBeNull();
    expect(
      parseRemoteAdsPolicy({
        ads: {
          ...remoteEnabled.ads,
          placements: { homeBanner: 'yes', historyNative: false },
        },
      }),
    ).toBeNull();
  });

  it.each([
    null,
    {},
    { ads: [] },
    { ads: { ...remoteEnabled.ads, placements: [] } },
    { ads: { ...remoteEnabled.ads, placements: null } },
    { ads: { ...remoteEnabled.ads, enabled: 'yes' } },
    { ads: { ...remoteEnabled.ads, audienceMode: 'teen' } },
    {
      ads: {
        ...remoteEnabled.ads,
        placements: { homeBanner: true, historyNative: 'yes' },
      },
    },
    { ads: { ...remoteEnabled.ads, audienceMode: 'unknown' } },
    { ads: { ...remoteEnabled.ads, placements: { homeBanner: true } } },
  ])('rejects malformed or contradictory enabled policy %#', (value) => {
    expect(parseRemoteAdsPolicy(value)).toBeNull();
  });

  it('fails closed when the client-config request fails', async () => {
    jest.mocked(apiFetch).mockRejectedValue(new Error('offline'));
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(screen.getByTestId('activation-result')).toHaveTextContent('false');
  });

  it('coalesces simultaneous policy and initialization work', async () => {
    let resolvePolicy!: (value: typeof remoteEnabled) => void;
    jest.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolvePolicy = resolve;
      }),
    );
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await act(async () => {
      await fireEvent.press(screen.getByTestId('activate'));
      await fireEvent.press(screen.getByTestId('activate'));
      resolvePolicy(remoteEnabled);
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
  });
});

describe('AdsProvider consent and initialization', () => {
  it('fetches policy only after an eligible surface activates and initializes after consent', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    expect(screen.getByTestId('status')).toHaveTextContent('idle');
    expect(screen.getByTestId('history-status')).toHaveTextContent('idle');
    expect(screen.getByTestId('npa')).toHaveTextContent('true');
    expect(screen.getByTestId('current-npa')).toHaveTextContent('true');
    expect(screen.getByTestId('privacy')).toHaveTextContent('false');
    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockGatherConsent).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(apiFetch).toHaveBeenCalledWith('/client-config', { auth: false });
    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
    expect(mockSetRequestConfiguration).toHaveBeenCalledWith({
      maxAdContentRating: 'PG',
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: ['EMULATOR'],
    });
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('activation-result')).toHaveTextContent('true');
    expect(screen.getByTestId('privacy')).toHaveTextContent('false');
    expect(screen.getByTestId('npa')).toHaveTextContent('false');
  });

  it('blocks without touching the SDK when remote policy disables the placement', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: false,
        audienceMode: 'unknown',
        placements: { homeBanner: false, historyNative: false },
      },
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(screen.getByTestId('activation-result')).toHaveTextContent('false');
    expect(mockGatherConsent).not.toHaveBeenCalled();
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('does not initialize or request ads when UMP says ads cannot be requested', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('can recover on a later focus after transient consent failure', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent
      .mockResolvedValueOnce({ canRequestAds: false, privacyOptionsRequirementStatus: 2 })
      .mockResolvedValueOnce({ canRequestAds: true, privacyOptionsRequirementStatus: 2 });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(mockGatherConsent).toHaveBeenCalledTimes(2);
  });

  it('uses prior consent info when the UMP update fails', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    mockGetConsentInfo.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('fails closed when neither fresh nor prior UMP consent is available', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockRejectedValue(new Error('offline'));
    mockGetConsentInfo.mockRejectedValue(new Error('no prior consent'));
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('fails closed and retries after SDK initialization rejects', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockInitialize
      .mockRejectedValueOnce(new Error('native startup failed'))
      .mockResolvedValueOnce([]);
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(screen.getByTestId('activation-result')).toHaveTextContent('false');
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('activation-result')).toHaveTextContent('true');
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(mockInitialize).toHaveBeenCalledTimes(2);
    expect(mockGatherConsent).toHaveBeenCalledTimes(2);
  });

  it('requests non-personalized ads when GDPR applies without personalized-ad consent', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGetGdprApplies.mockResolvedValue(true);
    mockGetUserChoices.mockResolvedValue({ selectPersonalisedAds: false });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('npa')).toHaveTextContent('true');
    expect(screen.getByTestId('current-npa')).toHaveTextContent('true');
  });

  it('requests personalized ads only after the exact GDPR choice grants them', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGetGdprApplies.mockResolvedValue(true);
    mockGetUserChoices.mockResolvedValue({ selectPersonalisedAds: true });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(mockGetUserChoices).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('npa')).toHaveTextContent('false');
    expect(screen.getByTestId('current-npa')).toHaveTextContent('false');
  });

  it('shares one SDK initialization across independently eligible placements', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: true, historyNative: true },
      },
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    let results: boolean[] = [];
    await act(async () => {
      results = await Promise.all([
        latestAds!.activatePlacement('homeBanner'),
        latestAds!.activatePlacement('historyNative'),
      ]);
    });
    expect(results).toEqual([true, true]);
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('history-status')).toHaveTextContent('ready');
    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('lets only the newest same-placement activation publish after a shared policy wait', async () => {
    let resolvePolicy!: (value: typeof remoteEnabled) => void;
    jest.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolvePolicy = resolve;
      }),
    );
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    let results: boolean[] = [];
    await act(async () => {
      const first = latestAds!.activatePlacement('homeBanner');
      const second = latestAds!.activatePlacement('homeBanner');
      resolvePolicy(remoteEnabled);
      results = await Promise.all([first, second]);
    });
    expect(results).toEqual([false, true]);
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
  });

  it('does not let an older initialization overwrite a newer remote-policy block', async () => {
    jest
      .mocked(apiFetch)
      .mockResolvedValueOnce(remoteEnabled)
      .mockResolvedValueOnce({
        ads: {
          enabled: false,
          audienceMode: 'unknown',
          placements: { homeBanner: false, historyNative: false },
        },
      });
    let resolveInitialization!: (value: unknown[]) => void;
    mockInitialize.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveInitialization = resolve;
      }),
    );
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );

    let first!: Promise<boolean>;
    await act(async () => {
      first = latestAds!.activatePlacement('homeBanner');
    });
    await waitFor(() => expect(mockInitialize).toHaveBeenCalledTimes(1));
    let second!: Promise<boolean>;
    await act(async () => {
      second = latestAds!.activatePlacement('homeBanner');
    });
    await expect(second).resolves.toBe(false);
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');

    await act(async () => resolveInitialization([]));
    await expect(first).resolves.toBe(false);
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');
  });

  it('fails safe when GDPR user-choice lookup rejects', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGetGdprApplies.mockResolvedValue(true);
    mockGetUserChoices.mockRejectedValue(new Error('choice unavailable'));
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('npa')).toHaveTextContent('true');
    expect(screen.getByTestId('current-npa')).toHaveTextContent('true');
  });

  it('fails safe to non-personalized ads when GDPR applicability is unknown', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGetGdprApplies.mockRejectedValue(new Error('unknown'));
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(screen.getByTestId('npa')).toHaveTextContent('true');
    expect(mockGetUserChoices).not.toHaveBeenCalled();
  });

  it('rechecks the remote kill switch on the next focused activation', async () => {
    jest
      .mocked(apiFetch)
      .mockResolvedValueOnce(remoteEnabled)
      .mockResolvedValueOnce({
        ads: {
          enabled: false,
          audienceMode: 'unknown',
          placements: { homeBanner: false, historyNative: false },
        },
      });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('exposes the UMP privacy-options action only when required', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('privacy')).toHaveTextContent('true'));
    await fireEvent.press(screen.getByTestId('privacy-action'));
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('true'));
  });

  it('blocks active placements and invalidates readiness when privacy options revoke ad requests', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(screen.getByTestId('privacy')).toHaveTextContent('true');

    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
  });

  it('does not let an in-flight SDK initialization outlive privacy revocation', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: 1,
    });
    let resolveConfiguration!: () => void;
    mockSetRequestConfiguration.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveConfiguration = resolve;
      }),
    );
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );

    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('privacy')).toHaveTextContent('true'));
    expect(screen.getByTestId('status')).toHaveTextContent('checking');

    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    // A fresh focus/activation during the privacy transition must wait for the
    // stale initialization and inherit the fail-closed result.
    await fireEvent.press(screen.getByTestId('activate'));

    await act(async () => resolveConfiguration());
    await waitFor(() => expect(screen.getByTestId('activation-result')).toHaveTextContent('false'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('true'));
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('abandons a consent refresh that becomes stale while UMP gathering is pending', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    let resolveGather!: (value: {
      canRequestAds: boolean;
      privacyOptionsRequirementStatus: number;
    }) => void;
    mockGatherConsent
      .mockResolvedValueOnce({ canRequestAds: true, privacyOptionsRequirementStatus: 1 })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveGather = resolve;
        }),
      );
    mockInitialize.mockRejectedValueOnce(new Error('initialization failed'));
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    expect(screen.getByTestId('privacy')).toHaveTextContent('true');

    let activationResult!: Promise<boolean>;
    await act(async () => {
      activationResult = latestAds!.activatePlacement('homeBanner');
    });
    await waitFor(() => expect(mockGatherConsent).toHaveBeenCalledTimes(2));
    let privacyResult!: Promise<boolean>;
    await act(async () => {
      privacyResult = latestAds!.showPrivacyOptions();
      resolveGather({ canRequestAds: true, privacyOptionsRequirementStatus: 1 });
    });

    await expect(activationResult).resolves.toBe(false);
    await expect(privacyResult).resolves.toBe(true);
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');
    expect(mockSetRequestConfiguration).toHaveBeenCalledTimes(1);
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('remounts an active banner only after applying a changed privacy request mode', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(mockBannerMount).toHaveBeenCalledTimes(1));
    expect(mockBannerMount).toHaveBeenLastCalledWith({
      requestNonPersonalizedAdsOnly: false,
    });

    mockGetGdprApplies.mockResolvedValue(true);
    mockGetUserChoices.mockResolvedValue({ selectPersonalisedAds: false });
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('consent-version')).toHaveTextContent('1'));
    expect(screen.getByTestId('npa')).toHaveTextContent('true');
    expect(screen.getByTestId('privacy')).toHaveTextContent('false');
    expect(mockBannerMount).toHaveBeenCalledTimes(2);
    expect(mockBannerMount).toHaveBeenLastCalledWith({
      requestNonPersonalizedAdsOnly: true,
    });
  });

  it('returns false without opening privacy options when UMP does not require them', async () => {
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('false'));
    expect(mockShowPrivacyOptionsForm).not.toHaveBeenCalled();
  });

  it('returns false when the privacy-options form rejects', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    mockShowPrivacyOptionsForm.mockRejectedValue(new Error('form unavailable'));
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('privacy')).toHaveTextContent('true'));
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('false'));
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
    expect(screen.getByTestId('consent-version')).toHaveTextContent('0');
  });

  it('coalesces the privacy-options action while one native form is open', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    let resolveForm!: (value: {
      canRequestAds: boolean;
      privacyOptionsRequirementStatus: number;
    }) => void;
    mockShowPrivacyOptionsForm.mockReturnValue(
      new Promise((resolve) => {
        resolveForm = resolve;
      }),
    );
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('privacy')).toHaveTextContent('true'));

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    await act(async () => {
      first = latestAds!.showPrivacyOptions();
      second = latestAds!.showPrivacyOptions();
    });
    await expect(second).resolves.toBe(false);
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(1);

    await act(async () =>
      resolveForm({ canRequestAds: false, privacyOptionsRequirementStatus: 1 }),
    );
    await expect(first).resolves.toBe(true);
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');

    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: 1,
    });
    let thirdResult: boolean | undefined;
    await act(async () => {
      thirdResult = await latestAds!.showPrivacyOptions();
    });
    expect(thirdResult).toBe(true);
    expect(mockShowPrivacyOptionsForm).toHaveBeenCalledTimes(2);
  });

  it('publishes a privacy form becoming not required without an active ad surface', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('privacy')).toHaveTextContent('true'));
    let privacyResult: boolean | undefined;
    await act(async () => {
      privacyResult = await latestAds!.showPrivacyOptions();
    });
    expect(privacyResult).toBe(true);
    await waitFor(() => expect(screen.getByTestId('privacy')).toHaveTextContent('false'));
  });

  it('blocks an activation waiting on a failed post-form configuration transition', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    let rejectConfiguration!: (error: Error) => void;
    mockSetRequestConfiguration.mockReturnValueOnce(
      new Promise<void>((_resolve, reject) => {
        rejectConfiguration = reject;
      }),
    );
    let privacyResult!: Promise<boolean>;
    await act(async () => {
      privacyResult = latestAds!.showPrivacyOptions();
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    let resolvePolicy!: (value: typeof remoteEnabled) => void;
    jest.mocked(apiFetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePolicy = resolve;
      }),
    );
    let activationResult!: Promise<boolean>;
    await act(async () => {
      activationResult = latestAds!.activatePlacement('homeBanner');
    });
    await act(async () => {
      resolvePolicy(remoteEnabled);
    });
    await act(async () => {
      rejectConfiguration(new Error('configuration failed'));
    });
    await expect(privacyResult).resolves.toBe(false);
    await expect(activationResult).resolves.toBe(false);
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');
  });

  it('publishes only the newest activation waiting on a successful privacy transition', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));

    let resolveConfiguration!: () => void;
    mockSetRequestConfiguration.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveConfiguration = resolve;
      }),
    );
    let privacyResult!: Promise<boolean>;
    await act(async () => {
      privacyResult = latestAds!.showPrivacyOptions();
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));

    let resolveFirstPolicy!: (value: typeof remoteEnabled) => void;
    jest.mocked(apiFetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstPolicy = resolve;
      }),
    );
    let first!: Promise<boolean>;
    await act(async () => {
      first = latestAds!.activatePlacement('homeBanner');
    });
    await act(async () => {
      resolveFirstPolicy(remoteEnabled);
    });
    let second!: Promise<boolean>;
    await act(async () => {
      second = latestAds!.activatePlacement('homeBanner');
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      resolveConfiguration();
    });
    await expect(privacyResult).resolves.toBe(true);
    await expect(Promise.all([first, second])).resolves.toEqual([false, true]);
    expect(screen.getByTestId('status')).toHaveTextContent('ready');
  });

  it('blocks active placements when post-form request configuration fails', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    mockSetRequestConfiguration.mockRejectedValueOnce(new Error('configuration failed'));
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('false'));
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');
    expect(screen.getByTestId('consent-version')).toHaveTextContent('1');
  });

  it('fails closed when privacy options become unavailable in Expo Go', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('privacy')).toHaveTextContent('true'));
    resetAdsModuleForTests();
    const constants = Constants as unknown as { appOwnership: string };
    constants.appOwnership = 'expo';
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('false'));
    constants.appOwnership = 'standalone';
  });
});

describe('native capability and unit-id gates', () => {
  it('contains a missing native module and blocks Expo Go', async () => {
    expect(
      loadAdsNativeModule(() => {
        throw new Error('native binary missing');
      }),
    ).toBeNull();

    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    const constants = Constants as unknown as { appOwnership: string };
    constants.appOwnership = 'expo';
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('blocked'));
    constants.appOwnership = 'standalone';
  });

  it('selects platform-specific ids and rejects unsupported or malformed ids', () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    expect(adUnitIdFor('homeBanner')).toBe('ca-app-pub-3940256099942544/2435281174');
    expect(adUnitIdFor('historyNative')).toBe('ca-app-pub-3940256099942544/3986624511');

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    expect(adUnitIdFor('homeBanner')).toBeNull();

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    expect(adUnitIdFor('historyNative')).toBe('ca-app-pub-3940256099942544/2247696110');
    const admob = Constants.expoConfig!.extra!.admob as Record<string, unknown>;
    const original = admob.homeBannerAndroidUnitId;
    admob.homeBannerAndroidUnitId = 'not-an-ad-unit';
    expect(adUnitIdFor('homeBanner')).toBeNull();
    admob.homeBannerAndroidUnitId = original;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('requires an exact anchored string unit id and tolerates missing Expo config', () => {
    const originalPlatform = Platform.OS;
    const constants = Constants as unknown as {
      expoConfig?: { extra?: { admob?: Record<string, unknown> } };
    };
    const originalConfig = constants.expoConfig;
    const originalUnitId = originalConfig?.extra?.admob?.homeBannerAndroidUnitId;
    try {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      const admob = constants.expoConfig!.extra!.admob!;
      const valid = admob.homeBannerAndroidUnitId;
      admob.homeBannerAndroidUnitId = `prefix-${String(valid)}`;
      expect(adUnitIdFor('homeBanner')).toBeNull();
      admob.homeBannerAndroidUnitId = `${String(valid)}-suffix`;
      expect(adUnitIdFor('homeBanner')).toBeNull();
      admob.homeBannerAndroidUnitId = { toString: () => valid };
      expect(adUnitIdFor('homeBanner')).toBeNull();

      constants.expoConfig = undefined;
      expect(adUnitIdFor('homeBanner')).toBeNull();
    } finally {
      if (originalConfig?.extra?.admob) {
        originalConfig.extra.admob.homeBannerAndroidUnitId = originalUnitId;
      }
      constants.expoConfig = originalConfig;
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('rejects Google sample ids in release builds', () => {
    const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
    const originalDev = devGlobal.__DEV__;
    const originalPlatform = Platform.OS;
    const admob = Constants.expoConfig!.extra!.admob as Record<string, unknown>;
    const originalUnitId = admob.homeBannerAndroidUnitId;
    try {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      devGlobal.__DEV__ = false;
      expect(adUnitIdFor('homeBanner', false)).toBeNull();
      admob.homeBannerAndroidUnitId = 'ca-app-pub-1111111111111111/2222222222';
      expect(adUnitIdFor('homeBanner', false)).toBe('ca-app-pub-1111111111111111/2222222222');
    } finally {
      admob.homeBannerAndroidUnitId = originalUnitId;
      devGlobal.__DEV__ = originalDev;
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('omits test-device configuration when initializing a release build', async () => {
    const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
    const originalDev = devGlobal.__DEV__;
    const originalPlatform = Platform.OS;
    const admob = Constants.expoConfig!.extra!.admob as Record<string, unknown>;
    const originalUnitId = admob.homeBannerAndroidUnitId;
    try {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      devGlobal.__DEV__ = false;
      admob.homeBannerAndroidUnitId = 'ca-app-pub-1111111111111111/2222222222';
      jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
      await render(
        <AdsProvider>
          <Probe />
        </AdsProvider>,
      );
      await fireEvent.press(screen.getByTestId('activate'));
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
      expect(mockSetRequestConfiguration).toHaveBeenCalledWith({
        maxAdContentRating: 'PG',
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
    } finally {
      admob.homeBannerAndroidUnitId = originalUnitId;
      devGlobal.__DEV__ = originalDev;
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    }
  });

  it('provides a fail-closed context when no provider is mounted', async () => {
    await render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('blocked');
    expect(screen.getByTestId('history-status')).toHaveTextContent('blocked');
    expect(screen.getByTestId('npa')).toHaveTextContent('true');
    expect(screen.getByTestId('current-npa')).toHaveTextContent('true');
    expect(screen.getByTestId('privacy')).toHaveTextContent('false');
    expect(screen.getByTestId('consent-version')).toHaveTextContent('0');
    await fireEvent.press(screen.getByTestId('activate'));
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('activation-result')).toHaveTextContent('false'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('false'));
  });

  it('clears the cached native module for a fresh capability check', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    await render(
      <AdsProvider>
        <Probe />
      </AdsProvider>,
    );
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(adsNativeModuleWhenReady()).not.toBeNull();
    resetAdsModuleForTests();
    expect(adsNativeModuleWhenReady()).toBeNull();
  });
});

describe('ad surfaces', () => {
  it('caps the Home adaptive width to its padded phone/tablet content column', () => {
    expect([
      homeBannerContentWidth(320),
      homeBannerContentWidth(1_024),
      homeBannerContentWidth(30),
    ]).toEqual([280, 720, 1]);
  });

  it('reserves and loads a banner only while Home is focused', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    const view = await render(
      <AdsProvider>
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    expect(screen.getByLabelText('Advertisement')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('banner-ad')).toBeTruthy());
    const expectedHomeUnitId =
      Platform.OS === 'android'
        ? 'ca-app-pub-3940256099942544/9214589741'
        : 'ca-app-pub-3940256099942544/2435281174';
    expect(mockBannerProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        unitId: expectedHomeUnitId,
        size: 'ANCHORED',
        width: expect.any(Number),
        requestOptions: { requestNonPersonalizedAdsOnly: false },
        onAdFailedToLoad: expect.any(Function),
      }),
    );
    expect(StyleSheet.flatten(screen.getByLabelText('Advertisement').props.style)).toEqual({
      minHeight: 108,
      marginTop: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: lightColors.border,
    });
    expect(StyleSheet.flatten(screen.getByText('Advertisement').props.style)).toEqual({
      fontSize: 10,
      marginBottom: 2,
      color: lightColors.muted,
    });
    await fireEvent(screen.getByLabelText('Advertisement'), 'layout', {
      nativeEvent: { layout: { width: 280, height: 108, x: 0, y: 0 } },
    });
    expect(screen.getByTestId('banner-ad').props.accessibilityValue).toEqual({
      text: 'ANCHORED:280',
    });
    await fireEvent(screen.getByLabelText('Advertisement'), 'layout', {
      nativeEvent: { layout: { width: 720, height: 108, x: 0, y: 0 } },
    });
    expect(screen.getByTestId('banner-ad').props.accessibilityValue).toEqual({
      text: 'ANCHORED:720',
    });
    await fireEvent(screen.getByLabelText('Advertisement'), 'layout', {
      nativeEvent: { layout: { width: 0, height: 108, x: 0, y: 0 } },
    });
    expect(screen.getByTestId('banner-ad').props.accessibilityValue).toEqual({
      text: 'ANCHORED:720',
    });
    await view.rerender(
      <AdsProvider>
        <HomeBannerAd focused={false} />
      </AdsProvider>,
    );
    expect(screen.queryByLabelText('Advertisement')).toBeNull();
  });

  it('revalidates policy before remounting a banner on refocus', async () => {
    jest
      .mocked(apiFetch)
      .mockResolvedValueOnce(remoteEnabled)
      .mockResolvedValueOnce({
        ads: {
          enabled: false,
          audienceMode: 'unknown',
          placements: { homeBanner: false, historyNative: false },
        },
      });
    const view = await render(
      <AdsProvider>
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(mockBannerMount).toHaveBeenCalledTimes(1));

    await view.rerender(
      <AdsProvider>
        <HomeBannerAd focused={false} />
      </AdsProvider>,
    );
    await view.rerender(
      <AdsProvider>
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByLabelText('Advertisement')).toBeNull());
    expect(mockBannerMount).toHaveBeenCalledTimes(1);
  });

  it('unmounts a previously validated banner while a new policy check is pending', async () => {
    jest.mocked(apiFetch).mockResolvedValueOnce(remoteEnabled);
    await render(
      <AdsProvider>
        <Probe />
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('banner-ad')).toBeTruthy());

    let resolvePolicy!: (value: unknown) => void;
    jest.mocked(apiFetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePolicy = resolve;
      }),
    );
    let activation!: Promise<boolean>;
    await act(async () => {
      activation = latestAds!.activatePlacement('homeBanner');
    });
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('checking'));
    expect(screen.queryByTestId('banner-ad')).toBeNull();

    await act(async () =>
      resolvePolicy({
        ads: {
          enabled: false,
          audienceMode: 'unknown',
          placements: { homeBanner: false, historyNative: false },
        },
      }),
    );
    await expect(activation).resolves.toBe(false);
  });

  it('collapses the Home slot after a no-fill failure', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    await render(
      <AdsProvider>
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('banner-ad')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('banner-ad'));
    await waitFor(() => expect(screen.queryByLabelText('Advertisement')).toBeNull());
  });

  it('recovers a no-fill banner after a successful privacy reconfiguration', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await render(
      <AdsProvider>
        <Probe />
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('banner-ad')).toBeTruthy());
    await fireEvent.press(screen.getByTestId('banner-ad'));
    await waitFor(() => expect(screen.queryByTestId('banner-ad')).toBeNull());

    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('banner-ad')).toBeTruthy());
    expect(mockBannerMount).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale banner failure callback after consent remounts the placement', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await render(
      <AdsProvider>
        <Probe />
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(mockBannerMount).toHaveBeenCalledTimes(1));
    const staleFailure = (mockBannerProps.mock.calls[0][0] as { onAdFailedToLoad: () => void })
      .onAdFailedToLoad;

    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('consent-version')).toHaveTextContent('1'));
    await waitFor(() => expect(mockBannerMount).toHaveBeenCalledTimes(2));
    const currentFailure = (mockBannerProps.mock.calls[1][0] as { onAdFailedToLoad: () => void })
      .onAdFailedToLoad;

    await act(async () => staleFailure());
    expect(screen.getByTestId('banner-ad')).toBeTruthy();
    expect(mockBannerMount).toHaveBeenCalledTimes(2);

    await act(async () => currentFailure());
    await waitFor(() => expect(screen.queryByTestId('banner-ad')).toBeNull());
  });

  it('destroys and hides a History native ad during submitted-recording playback', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    const view = await render(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(screen.getByText('Learn today')).toBeTruthy());
    const ad = await mockNativeAdCreate.mock.results[0].value;
    let release: () => void = () => undefined;
    await act(async () => {
      mockNativeAdViewRender.mockClear();
      release = await claimPlaybackOwner(Symbol('test-playback'), () => undefined);
    });
    await waitFor(() => expect(screen.queryByText('Learn today')).toBeNull());
    expect(mockNativeAdViewRender).not.toHaveBeenCalled();
    expect(ad.destroy).toHaveBeenCalled();
    await act(async () => release());
    await waitFor(() => expect(screen.getByText('Learn today')).toBeTruthy());
    await view.unmount();
  });

  it('reserves the complete History card height while its native creative loads', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    let resolveAd!: (value: {
      headline: string;
      body: string;
      callToAction: string;
      destroy: jest.Mock;
    }) => void;
    mockNativeAdCreate.mockReturnValue(
      new Promise((resolve) => {
        resolveAd = resolve;
      }),
    );
    await render(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );

    const reserved = screen.getByTestId('history-native-ad-reserved');
    const reservedHeight = historyNativeAdReservedHeight(Dimensions.get('window').fontScale);
    expect(reserved.props.accessibilityLabel).toBe('Advertisement');
    expect(reserved).toHaveTextContent('Advertisement');
    expect(StyleSheet.flatten(reserved.props.style)).toEqual({
      marginTop: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      textAlign: 'center',
      textAlignVertical: 'top',
      minHeight: reservedHeight,
      backgroundColor: lightColors.card,
      borderColor: lightColors.border,
      color: lightColors.muted,
    });

    await waitFor(() => expect(mockNativeAdCreate).toHaveBeenCalledTimes(1));
    await act(async () =>
      resolveAd({
        headline: 'Reserved ad',
        body: 'Body',
        callToAction: 'Open',
        destroy: jest.fn(),
      }),
    );
    expect(await screen.findByText('Reserved ad')).toBeTruthy();
    expect(screen.queryByTestId('history-native-ad-reserved')).toBeNull();
  });

  it('removes a loaded native card in the same commit that remote policy blocks it', async () => {
    jest.mocked(apiFetch).mockResolvedValueOnce({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    const ad = {
      headline: 'Policy-sensitive ad',
      body: null,
      callToAction: null,
      destroy: jest.fn(),
    };
    mockNativeAdCreate.mockResolvedValue(ad);
    await render(
      <AdsProvider>
        <Probe />
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    expect(await screen.findByText('Policy-sensitive ad')).toBeTruthy();

    let resolvePolicy!: (value: unknown) => void;
    jest.mocked(apiFetch).mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePolicy = resolve;
      }),
    );
    let activation!: Promise<boolean>;
    await act(async () => {
      activation = latestAds!.activatePlacement('historyNative');
    });
    await waitFor(() => expect(screen.getByTestId('history-status')).toHaveTextContent('checking'));
    mockNativeAdViewRender.mockClear();
    await act(async () =>
      resolvePolicy({
        ads: {
          enabled: false,
          audienceMode: 'unknown',
          placements: { homeBanner: false, historyNative: false },
        },
      }),
    );

    await expect(activation).resolves.toBe(false);
    await waitFor(() => expect(screen.getByTestId('history-status')).toHaveTextContent('blocked'));
    expect(screen.queryByText('Policy-sensitive ad')).toBeNull();
    expect(mockNativeAdViewRender).not.toHaveBeenCalled();
    expect(ad.destroy).toHaveBeenCalledTimes(1);

    jest.mocked(apiFetch).mockResolvedValueOnce({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    let reactivated = false;
    await act(async () => {
      reactivated = await latestAds!.activatePlacement('historyNative');
    });
    expect(reactivated).toBe(true);
    await waitFor(() => expect(screen.getByTestId('history-status')).toHaveTextContent('ready'));
    expect(screen.queryByText('Policy-sensitive ad')).toBeNull();
    expect(mockNativeAdCreate).toHaveBeenCalledTimes(1);
  });

  it('reconfigures and replaces a native ad after privacy choices change request mode', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    const firstAd = {
      headline: 'First ad',
      body: 'First body',
      callToAction: 'First action',
      destroy: jest.fn(),
    };
    const secondAd = {
      headline: 'Second ad',
      body: 'Second body',
      callToAction: 'Second action',
      destroy: jest.fn(),
    };
    mockNativeAdCreate.mockResolvedValueOnce(firstAd).mockResolvedValueOnce(secondAd);
    await render(
      <AdsProvider>
        <Probe />
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    expect(await screen.findByText('First ad')).toBeTruthy();
    const expectedHistoryUnitId =
      Platform.OS === 'android'
        ? 'ca-app-pub-3940256099942544/2247696110'
        : 'ca-app-pub-3940256099942544/3986624511';
    expect(mockNativeAdCreate).toHaveBeenNthCalledWith(1, expectedHistoryUnitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    mockGetGdprApplies.mockResolvedValue(true);
    mockGetUserChoices.mockResolvedValue({ selectPersonalisedAds: false });
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 2,
    });
    await fireEvent.press(screen.getByTestId('privacy-action'));
    expect(await screen.findByText('Second ad')).toBeTruthy();
    expect(firstAd.destroy).toHaveBeenCalledTimes(1);
    expect(mockNativeAdCreate).toHaveBeenNthCalledWith(2, expectedHistoryUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
  });

  it('destroys and keeps a native ad absent after privacy revokes ad requests', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    mockGatherConsent.mockResolvedValue({
      canRequestAds: true,
      privacyOptionsRequirementStatus: 1,
    });
    mockShowPrivacyOptionsForm.mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: 1,
    });
    const ad = {
      headline: 'Privacy-sensitive ad',
      body: null,
      callToAction: null,
      destroy: jest.fn(),
    };
    mockNativeAdCreate.mockResolvedValue(ad);
    await render(
      <AdsProvider>
        <Probe />
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    expect(await screen.findByText('Privacy-sensitive ad')).toBeTruthy();

    mockGatherConsent.mockResolvedValue({
      canRequestAds: false,
      privacyOptionsRequirementStatus: 1,
    });
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.queryByText('Privacy-sensitive ad')).toBeNull());
    expect(ad.destroy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('history-status')).toHaveTextContent('blocked');
  });

  it('destroys a History ad that finishes loading after the surface unmounts', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    let resolveAd!: (ad: {
      headline: string;
      body: null;
      callToAction: null;
      destroy: jest.Mock;
    }) => void;
    mockNativeAdCreate.mockReturnValue(
      new Promise((resolve) => {
        resolveAd = resolve;
      }),
    );
    const view = await render(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(mockNativeAdCreate).toHaveBeenCalledTimes(1));
    await view.unmount();
    const ad = { headline: 'Late ad', body: null, callToAction: null, destroy: jest.fn() };
    await act(async () => resolveAd(ad));
    expect(ad.destroy).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a History native request rejects', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    mockNativeAdCreate.mockRejectedValue(new Error('no fill'));
    await render(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(mockNativeAdCreate).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText('Advertisement')).toBeNull();
  });

  it('retries a History native request on the next focus after no fill', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    mockNativeAdCreate.mockRejectedValueOnce(new Error('no fill')).mockResolvedValueOnce({
      headline: 'Recovered ad',
      body: null,
      callToAction: null,
      destroy: jest.fn(),
    });
    const view = await render(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    await waitFor(() => expect(mockNativeAdCreate).toHaveBeenCalledTimes(1));
    await view.rerender(
      <AdsProvider>
        <HistoryNativeAdCard focused={false} />
      </AdsProvider>,
    );
    await view.rerender(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    expect(await screen.findByText('Recovered ad')).toBeTruthy();
    expect(mockNativeAdCreate).toHaveBeenCalledTimes(2);
  });

  it('renders a native ad without optional body or call-to-action assets', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    mockNativeAdCreate.mockResolvedValue({
      headline: 'Headline only',
      body: null,
      callToAction: null,
      destroy: jest.fn(),
    });
    await render(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    expect(await screen.findByText('Headline only')).toBeTruthy();
    expect(mockNativeAssetRender.mock.calls.map(([props]) => props.assetType)).toEqual([
      'headline',
    ]);
    expect(screen.queryByText('A test ad')).toBeNull();
    expect(screen.queryByText('Open')).toBeNull();
  });

  it('renders the full native-card accessibility and visual contract', async () => {
    jest.mocked(apiFetch).mockResolvedValue({
      ads: {
        enabled: true,
        audienceMode: 'adult-only',
        placements: { homeBanner: false, historyNative: true },
      },
    });
    const view = await render(
      <AdsProvider>
        <HistoryNativeAdCard focused />
      </AdsProvider>,
    );
    const card = await screen.findByTestId('native-ad-view');
    const ad = await mockNativeAdCreate.mock.results[0].value;
    expect(mockNativeAdViewRender.mock.calls.at(-1)?.[0].nativeAd).toBe(ad);
    expect(mockNativeAssetRender.mock.calls.map(([props]) => props.assetType)).toEqual([
      'headline',
      'body',
      'callToAction',
    ]);
    expect(card.props.accessibilityLabel).toBe('Advertisement');
    expect(StyleSheet.flatten(card.props.style)).toEqual({
      borderWidth: 1,
      borderRadius: 12,
      marginTop: 24,
      marginBottom: 24,
      paddingTop: 28,
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 8,
      minHeight: historyNativeAdReservedHeight(Dimensions.get('window').fontScale),
      backgroundColor: lightColors.card,
      borderColor: lightColors.border,
    });
    expect(StyleSheet.flatten(screen.getByText('Advertisement').props.style)).toEqual({
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
      color: lightColors.muted,
    });
    expect(StyleSheet.flatten(screen.getByText('Learn today').props.style)).toEqual({
      fontSize: 17,
      lineHeight: 22,
      fontWeight: '700',
      color: lightColors.text,
    });
    expect(screen.getByText('Learn today').props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(screen.getByText('A test ad').props.style)).toEqual({
      fontSize: 14,
      lineHeight: 20,
      color: lightColors.muted,
    });
    expect(screen.getByText('A test ad').props.numberOfLines).toBe(3);
    expect(screen.getByText('Open').props.accessibilityRole).toBe('button');
    expect(screen.getByText('Open').props.numberOfLines).toBe(2);
    expect(StyleSheet.flatten(screen.getByText('Open').props.style)).toEqual({
      minHeight: 44,
      textAlign: 'center',
      textAlignVertical: 'center',
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',
      backgroundColor: lightColors.primary,
      color: lightColors.onPrimary,
    });
    // Two headline lines, three body lines, and a two-line CTA all remain
    // within the scale-aware placeholder/card reservation.
    expect(28 + 14 + 8 + 44 + 8 + 60 + 8 + 64 + 14).toBeLessThanOrEqual(
      historyNativeAdReservedHeight(1),
    );
    expect([historyNativeAdReservedHeight(2), historyNativeAdReservedHeight(Number.NaN)]).toEqual([
      520, 260,
    ]);
    mockNativeAdViewRender.mockClear();
    await view.rerender(
      <AdsProvider>
        <HistoryNativeAdCard focused={false} />
      </AdsProvider>,
    );
    expect(mockNativeAdViewRender).not.toHaveBeenCalled();
    await view.unmount();
    expect(ad.destroy).toHaveBeenCalledTimes(1);
  });
});
