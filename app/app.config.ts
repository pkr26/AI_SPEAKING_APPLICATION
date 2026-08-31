import type { ConfigContext, ExpoConfig } from 'expo/config';

import appJson from './app.json';

export const SAMPLE_ADMOB_ANDROID_APP_ID = 'ca-app-pub-3940256099942544~3347511713';
export const SAMPLE_ADMOB_IOS_APP_ID = 'ca-app-pub-3940256099942544~1458002511';
export const SAMPLE_HOME_BANNER_ANDROID_UNIT_ID = 'ca-app-pub-3940256099942544/9214589741';
export const SAMPLE_HOME_BANNER_IOS_UNIT_ID = 'ca-app-pub-3940256099942544/2435281174';
export const SAMPLE_HISTORY_NATIVE_ANDROID_UNIT_ID = 'ca-app-pub-3940256099942544/2247696110';
export const SAMPLE_HISTORY_NATIVE_IOS_UNIT_ID = 'ca-app-pub-3940256099942544/3986624511';

const ADMOB_APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const ADMOB_UNIT_ID = /^ca-app-pub-\d{16}\/\d{10}$/;
const IOS_STORE_SEARCH_FALLBACK = 'https://apps.apple.com/us/search?term=AI%20English%20Coach';
const ANDROID_PLAY_STORE_FALLBACK =
  'https://play.google.com/store/apps/details?id=com.aienglish.coach';

/** Current Google/participating-buyer list from the AdMob iOS privacy guide. */
export const GOOGLE_SKADNETWORK_IDENTIFIERS = [
  'cstr6suwn9.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '2fnua5tdw4.skadnetwork',
  'ydx93a7ass.skadnetwork',
  'p78axxw29g.skadnetwork',
  'v72qych5uu.skadnetwork',
  'ludvb6z3bs.skadnetwork',
  'cp8zw746q7.skadnetwork',
  '3sh42y64q3.skadnetwork',
  'c6k4g5qg8m.skadnetwork',
  's39g8k73mm.skadnetwork',
  'wg4vff78zm.skadnetwork',
  '3qy4746246.skadnetwork',
  'f38h382jlk.skadnetwork',
  'hs6bdukanm.skadnetwork',
  'mlmmfzh3r3.skadnetwork',
  'v4nxqhlyqp.skadnetwork',
  'wzmmz9fp6w.skadnetwork',
  'su67r6k2v3.skadnetwork',
  'yclnxrl5pm.skadnetwork',
  't38b2kh725.skadnetwork',
  '7ug5zh24hu.skadnetwork',
  'gta9lk7p23.skadnetwork',
  'vutu7akeur.skadnetwork',
  'y5ghdn5j9k.skadnetwork',
  'v9wttpbfk9.skadnetwork',
  'n38lu8286q.skadnetwork',
  '47vhws6wlr.skadnetwork',
  'kbd757ywx3.skadnetwork',
  '9t245vhmpl.skadnetwork',
  'a2p9lx4jpn.skadnetwork',
  '22mmun2rn5.skadnetwork',
  '44jx6755aq.skadnetwork',
  'k674qkevps.skadnetwork',
  '4468km3ulz.skadnetwork',
  '2u9pt9hc89.skadnetwork',
  '8s468mfl3y.skadnetwork',
  'klf5c3l5u5.skadnetwork',
  'ppxm28t8ap.skadnetwork',
  'kbmxgpxpgc.skadnetwork',
  'uw77j35x4d.skadnetwork',
  '578prtvx9j.skadnetwork',
  '4dzt52r2t5.skadnetwork',
  'tl55sbb4fm.skadnetwork',
  'c3frkrj4fj.skadnetwork',
  'e5fvkxwrpn.skadnetwork',
  '8c4e2ghe7u.skadnetwork',
  '3rd42ekr43.skadnetwork',
  '97r2b46745.skadnetwork',
  '3qcr597p9d.skadnetwork',
] as const;

const UMP_PROGUARD_RULES = `
# Google User Messaging Platform consent SDK.
-keep class com.google.android.gms.internal.consent_sdk.** { *; }
`.trim();

function productionAppId(name: string, value: string | undefined, sample: string): string {
  const normalized = value?.trim();
  if (
    !normalized ||
    !ADMOB_APP_ID.test(normalized) ||
    normalized === sample ||
    normalized.startsWith('ca-app-pub-3940256099942544~')
  ) {
    throw new Error(`${name} must be a real AdMob app ID in production`);
  }
  return normalized;
}

function productionUnitId(name: string, value: string | undefined, sample: string): string {
  const normalized = value?.trim();
  if (
    !normalized ||
    !ADMOB_UNIT_ID.test(normalized) ||
    normalized === sample ||
    normalized.startsWith('ca-app-pub-3940256099942544/')
  ) {
    throw new Error(`${name} must be a real AdMob unit ID in production`);
  }
  return normalized;
}

function storeUrl(
  name: string,
  value: string | undefined,
  platform: 'ios' | 'android',
  production: boolean,
): string {
  const normalized = value?.trim();
  if (!normalized) {
    if (production) throw new Error(`${name} must be configured in production`);
    return platform === 'ios' ? IOS_STORE_SEARCH_FALLBACK : ANDROID_PLAY_STORE_FALLBACK;
  }

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    throw new Error(`${name} must be a valid absolute store URL`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) {
    throw new Error(`${name} must be a safe HTTPS store URL`);
  }
  if (platform === 'ios') {
    if (url.hostname !== 'apps.apple.com' || !/\/id\d+\/?$/.test(url.pathname)) {
      throw new Error(`${name} must be an apps.apple.com URL ending in a numeric app ID`);
    }
  } else if (
    url.hostname !== 'play.google.com' ||
    url.pathname !== '/store/apps/details' ||
    url.searchParams.get('id') !== 'com.aienglish.coach'
  ) {
    throw new Error(`${name} must be the Google Play URL for com.aienglish.coach`);
  }
  return normalized;
}

export default (
  { config }: ConfigContext,
  environment: NodeJS.ProcessEnv = process.env,
): ExpoConfig => {
  const production = environment.NODE_ENV === 'production';
  // The API client resolves its base URL at module load and throws before any
  // error UI can mount, so a missing/typo'd EXPO_PUBLIC_API_URL would only
  // surface as a release white-screen. Fail the production bundle build here,
  // where the mistake is actionable, instead. Non-HTTPS URLs are equally
  // rejected: a plaintext API URL would broadcast bearer tokens.
  if (production) {
    const apiUrl = environment.EXPO_PUBLIC_API_URL;
    let apiUrlProblem: string | null = null;
    if (!apiUrl) apiUrlProblem = 'EXPO_PUBLIC_API_URL is required in production';
    else {
      try {
        const url = new URL(apiUrl);
        // Mirror the client's own resolveBaseUrl contract: https only, and no
        // credentials/query/fragment (a base path itself is allowed).
        if (url.protocol !== 'https:') {
          apiUrlProblem = 'EXPO_PUBLIC_API_URL must be an https URL in production';
        } else if (apiUrl.includes('?') || apiUrl.includes('#') || url.username || url.password) {
          apiUrlProblem = 'EXPO_PUBLIC_API_URL cannot contain credentials, a query, or a fragment';
        }
      } catch {
        apiUrlProblem = 'EXPO_PUBLIC_API_URL must be a valid https URL in production';
      }
    }
    if (apiUrlProblem) throw new Error(apiUrlProblem);
  }
  const androidAppId = production
    ? productionAppId(
        'ADMOB_ANDROID_APP_ID',
        environment.ADMOB_ANDROID_APP_ID,
        SAMPLE_ADMOB_ANDROID_APP_ID,
      )
    : SAMPLE_ADMOB_ANDROID_APP_ID;
  const iosAppId = production
    ? productionAppId('ADMOB_IOS_APP_ID', environment.ADMOB_IOS_APP_ID, SAMPLE_ADMOB_IOS_APP_ID)
    : SAMPLE_ADMOB_IOS_APP_ID;
  if (production && androidAppId === iosAppId) {
    throw new Error('ADMOB Android and iOS app IDs must be different in production');
  }
  const homeBannerAndroidUnitId = production
    ? productionUnitId(
        'EXPO_PUBLIC_ADMOB_ANDROID_HOME_BANNER_ID',
        environment.EXPO_PUBLIC_ADMOB_ANDROID_HOME_BANNER_ID,
        SAMPLE_HOME_BANNER_ANDROID_UNIT_ID,
      )
    : SAMPLE_HOME_BANNER_ANDROID_UNIT_ID;
  const homeBannerIosUnitId = production
    ? productionUnitId(
        'EXPO_PUBLIC_ADMOB_IOS_HOME_BANNER_ID',
        environment.EXPO_PUBLIC_ADMOB_IOS_HOME_BANNER_ID,
        SAMPLE_HOME_BANNER_IOS_UNIT_ID,
      )
    : SAMPLE_HOME_BANNER_IOS_UNIT_ID;
  const historyNativeAndroidUnitId = production
    ? productionUnitId(
        'EXPO_PUBLIC_ADMOB_ANDROID_HISTORY_NATIVE_ID',
        environment.EXPO_PUBLIC_ADMOB_ANDROID_HISTORY_NATIVE_ID,
        SAMPLE_HISTORY_NATIVE_ANDROID_UNIT_ID,
      )
    : SAMPLE_HISTORY_NATIVE_ANDROID_UNIT_ID;
  const historyNativeIosUnitId = production
    ? productionUnitId(
        'EXPO_PUBLIC_ADMOB_IOS_HISTORY_NATIVE_ID',
        environment.EXPO_PUBLIC_ADMOB_IOS_HISTORY_NATIVE_ID,
        SAMPLE_HISTORY_NATIVE_IOS_UNIT_ID,
      )
    : SAMPLE_HISTORY_NATIVE_IOS_UNIT_ID;
  if (
    production &&
    new Set([
      homeBannerAndroidUnitId,
      homeBannerIosUnitId,
      historyNativeAndroidUnitId,
      historyNativeIosUnitId,
    ]).size !== 4
  ) {
    throw new Error('AdMob production unit IDs must be unique per platform and placement');
  }
  const iosStoreUrl = storeUrl(
    'EXPO_PUBLIC_IOS_APP_STORE_URL',
    environment.EXPO_PUBLIC_IOS_APP_STORE_URL,
    'ios',
    production,
  );
  const androidStoreUrl = storeUrl(
    'EXPO_PUBLIC_ANDROID_PLAY_STORE_URL',
    environment.EXPO_PUBLIC_ANDROID_PLAY_STORE_URL,
    'android',
    production,
  );
  const base = appJson.expo as ExpoConfig;
  const plugins = (base.plugins ?? [])
    .filter((plugin) => {
      const name = Array.isArray(plugin) ? plugin[0] : plugin;
      return name !== 'react-native-google-mobile-ads' && name !== 'expo-build-properties';
    })
    .map((plugin) => {
      // The app schedules only local notifications (the daily reminder), but
      // every iOS prebuild still embeds an aps-environment entitlement, and
      // expo-notifications defaults it to 'development' when no mode is
      // configured. A locally prebuilt archive that escapes the pipeline's
      // entitlement rewrite then fails App Store distribution validation, so
      // pin the plugin's supported `mode` prop to 'production' for every
      // prebuild; it is inert for local notifications.
      if (Array.isArray(plugin) && plugin[0] === 'expo-notifications') {
        return [plugin[0], { ...plugin[1], mode: 'production' }] as typeof plugin;
      }
      return plugin;
    });

  return {
    ...config,
    ...base,
    extra: {
      ...base.extra,
      admob: {
        homeBannerAndroidUnitId,
        homeBannerIosUnitId,
        historyNativeAndroidUnitId,
        historyNativeIosUnitId,
      },
      storeUrls: {
        ios: iosStoreUrl,
        android: androidStoreUrl,
      },
    },
    plugins: [
      ...plugins,
      [
        'react-native-google-mobile-ads',
        {
          androidAppId,
          iosAppId,
          delayAppMeasurementInit: true,
          skAdNetworkItems: [...GOOGLE_SKADNETWORK_IDENTIFIERS],
          userTrackingUsageDescription:
            'This identifier may be used to show ads and measure their performance when you allow it.',
        },
      ],
      [
        'expo-build-properties',
        {
          android: { extraProguardRules: UMP_PROGUARD_RULES },
        },
      ],
    ],
  };
};
