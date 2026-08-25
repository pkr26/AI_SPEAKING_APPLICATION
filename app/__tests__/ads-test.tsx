import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Constants from 'expo-constants';
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';

import { apiFetch } from '../src/lib/api';
import {
  AdsProvider,
  adUnitIdFor,
  loadAdsNativeModule,
  parseRemoteAdsPolicy,
  resetAdsModuleForTests,
  useAds,
} from '../src/lib/ads';
import HomeBannerAd from '../src/components/HomeBannerAd';
import HistoryNativeAdCard from '../src/components/HistoryNativeAdCard';
import { claimPlaybackOwner } from '../src/lib/audio-session';

const mockGatherConsent = jest.fn();
const mockGetConsentInfo = jest.fn();
const mockGetGdprApplies = jest.fn();
const mockGetUserChoices = jest.fn();
const mockShowPrivacyOptionsForm = jest.fn();
const mockSetRequestConfiguration = jest.fn();
const mockInitialize = jest.fn();
const mockNativeAdCreate = jest.fn();
const mockBannerMount = jest.fn();

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
  const { Text: NativeText } = require('react-native') as typeof import('react-native');
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
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED' },
    BannerAd: (props: {
      onAdFailedToLoad: () => void;
      requestOptions: { requestNonPersonalizedAdsOnly: boolean };
    }) => {
      ReactModule.useEffect(() => {
        mockBannerMount(props.requestOptions);
        // A real BannerAd requests only at mount; the consentVersion key must
        // replace it when privacy choices change.
      }, []);
      return ReactModule.createElement(
        NativeText,
        { onPress: props.onAdFailedToLoad, testID: 'banner-ad' },
        'banner',
      );
    },
    NativeAd: { createForAdRequest: mockNativeAdCreate },
    NativeAdView: ({ children }: { children: React.ReactNode }) => children,
    NativeAsset: ({ children }: { children: React.ReactNode }) => children,
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

function Probe() {
  const ads = useAds();
  const [privacyResult, setPrivacyResult] = React.useState('unset');
  return (
    <>
      <Text testID="status">{ads.statuses.homeBanner}</Text>
      <Text testID="privacy">{String(ads.privacyOptionsRequired)}</Text>
      <Text testID="npa">{String(ads.requestNonPersonalizedAdsOnly)}</Text>
      <Text testID="consent-version">{String(ads.consentVersion)}</Text>
      <Text testID="privacy-result">{privacyResult}</Text>
      <Pressable testID="activate" onPress={() => void ads.activatePlacement('homeBanner')} />
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
  jest.clearAllMocks();
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
    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockGatherConsent).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(apiFetch).toHaveBeenCalledWith('/client-config', { auth: false });
    expect(mockGatherConsent).toHaveBeenCalledTimes(1);
    expect(mockSetRequestConfiguration).toHaveBeenCalledWith(
      expect.objectContaining({
        maxAdContentRating: 'PG',
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      }),
    );
    expect(mockInitialize).toHaveBeenCalledTimes(1);
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
    await fireEvent.press(screen.getByTestId('activate'));
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'));
    expect(mockInitialize).toHaveBeenCalledTimes(2);
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
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('consent-version')).toHaveTextContent('1'));
    expect(screen.getByTestId('npa')).toHaveTextContent('true');
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
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('false'));
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

  it('rejects Google sample ids in release builds', () => {
    const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
    const originalDev = devGlobal.__DEV__;
    const originalPlatform = Platform.OS;
    const admob = Constants.expoConfig!.extra!.admob as Record<string, unknown>;
    const originalUnitId = admob.homeBannerAndroidUnitId;
    try {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      devGlobal.__DEV__ = false;
      expect(adUnitIdFor('homeBanner')).toBeNull();
      admob.homeBannerAndroidUnitId = 'ca-app-pub-1111111111111111/2222222222';
      expect(adUnitIdFor('homeBanner')).toBe('ca-app-pub-1111111111111111/2222222222');
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
    await fireEvent.press(screen.getByTestId('activate'));
    await fireEvent.press(screen.getByTestId('privacy-action'));
    await waitFor(() => expect(screen.getByTestId('privacy-result')).toHaveTextContent('false'));
  });
});

describe('ad surfaces', () => {
  it('reserves and loads a banner only while Home is focused', async () => {
    jest.mocked(apiFetch).mockResolvedValue(remoteEnabled);
    const view = await render(
      <AdsProvider>
        <HomeBannerAd focused />
      </AdsProvider>,
    );
    expect(screen.getByLabelText('Advertisement')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('banner-ad')).toBeTruthy());
    await view.rerender(
      <AdsProvider>
        <HomeBannerAd focused={false} />
      </AdsProvider>,
    );
    expect(screen.queryByLabelText('Advertisement')).toBeNull();
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
      release = await claimPlaybackOwner(Symbol('test-playback'), () => undefined);
    });
    await waitFor(() => expect(screen.queryByText('Learn today')).toBeNull());
    expect(ad.destroy).toHaveBeenCalled();
    await act(async () => release());
    await waitFor(() => expect(screen.getByText('Learn today')).toBeTruthy());
    await view.unmount();
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
    expect(screen.queryByText('A test ad')).toBeNull();
    expect(screen.queryByText('Open')).toBeNull();
  });
});
