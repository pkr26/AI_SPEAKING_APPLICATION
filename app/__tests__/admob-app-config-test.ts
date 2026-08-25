import buildConfig, {
  GOOGLE_SKADNETWORK_IDENTIFIERS,
  SAMPLE_ADMOB_ANDROID_APP_ID,
  SAMPLE_ADMOB_IOS_APP_ID,
} from '../app.config';
import type { ConfigContext } from 'expo/config';

const ORIGINAL_ENV = { ...process.env };
const CONFIG_CONTEXT = {
  config: {},
  projectRoot: '/tmp/admob-config-test',
  staticConfigPath: null,
  packageJsonPath: '/tmp/admob-config-test/package.json',
} as ConfigContext;

function plugin(
  config: ReturnType<typeof buildConfig>,
  name: string,
): [string, Record<string, unknown>] {
  const found = config.plugins?.find((entry) => (Array.isArray(entry) ? entry[0] : entry) === name);
  if (!Array.isArray(found)) throw new Error(`missing configured plugin ${name}`);
  return found as [string, Record<string, unknown>];
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('dynamic AdMob Expo configuration', () => {
  it('uses only Google sample app IDs and delayed measurement outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.ADMOB_ANDROID_APP_ID = 'ca-app-pub-1111111111111111~1111111111';
    process.env.ADMOB_IOS_APP_ID = 'ca-app-pub-2222222222222222~2222222222';

    const config = buildConfig(CONFIG_CONTEXT, process.env);
    expect(plugin(config, 'react-native-google-mobile-ads')[1]).toEqual(
      expect.objectContaining({
        androidAppId: SAMPLE_ADMOB_ANDROID_APP_ID,
        iosAppId: SAMPLE_ADMOB_IOS_APP_ID,
        delayAppMeasurementInit: true,
      }),
    );
  });

  it.each([
    ['missing IDs', undefined, undefined],
    ['malformed IDs', 'android', 'ios'],
    ['sample IDs', SAMPLE_ADMOB_ANDROID_APP_ID, SAMPLE_ADMOB_IOS_APP_ID],
  ])('fails production for %s', (_label, android, ios) => {
    process.env.NODE_ENV = 'production';
    if (android === undefined) delete process.env.ADMOB_ANDROID_APP_ID;
    else process.env.ADMOB_ANDROID_APP_ID = android;
    if (ios === undefined) delete process.env.ADMOB_IOS_APP_ID;
    else process.env.ADMOB_IOS_APP_ID = ios;

    expect(() => buildConfig(CONFIG_CONTEXT, process.env)).toThrow(/real AdMob app ID/);
  });

  it('accepts distinct valid production app IDs', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMOB_ANDROID_APP_ID = 'ca-app-pub-1111111111111111~1111111111';
    process.env.ADMOB_IOS_APP_ID = 'ca-app-pub-2222222222222222~2222222222';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_HOME_BANNER_ID = 'ca-app-pub-1111111111111111/1111111111';
    process.env.EXPO_PUBLIC_ADMOB_IOS_HOME_BANNER_ID = 'ca-app-pub-2222222222222222/2222222222';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_HISTORY_NATIVE_ID =
      'ca-app-pub-1111111111111111/3333333333';
    process.env.EXPO_PUBLIC_ADMOB_IOS_HISTORY_NATIVE_ID = 'ca-app-pub-2222222222222222/4444444444';

    const config = buildConfig(CONFIG_CONTEXT, process.env);
    expect(plugin(config, 'react-native-google-mobile-ads')[1]).toEqual(
      expect.objectContaining({
        androidAppId: process.env.ADMOB_ANDROID_APP_ID,
        iosAppId: process.env.ADMOB_IOS_APP_ID,
        delayAppMeasurementInit: true,
      }),
    );
  });

  it('fails production when any real placement unit ID is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMOB_ANDROID_APP_ID = 'ca-app-pub-1111111111111111~1111111111';
    process.env.ADMOB_IOS_APP_ID = 'ca-app-pub-2222222222222222~2222222222';
    delete process.env.EXPO_PUBLIC_ADMOB_ANDROID_HOME_BANNER_ID;
    expect(() => buildConfig(CONFIG_CONTEXT, process.env)).toThrow(/real AdMob unit ID/);
  });

  it('rejects one production unit ID reused across a platform or placement', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMOB_ANDROID_APP_ID = 'ca-app-pub-1111111111111111~1111111111';
    process.env.ADMOB_IOS_APP_ID = 'ca-app-pub-2222222222222222~2222222222';
    const duplicate = 'ca-app-pub-1111111111111111/1111111111';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_HOME_BANNER_ID = duplicate;
    process.env.EXPO_PUBLIC_ADMOB_IOS_HOME_BANNER_ID = 'ca-app-pub-2222222222222222/2222222222';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_HISTORY_NATIVE_ID = duplicate;
    process.env.EXPO_PUBLIC_ADMOB_IOS_HISTORY_NATIVE_ID = 'ca-app-pub-2222222222222222/4444444444';
    expect(() => buildConfig(CONFIG_CONTEXT, process.env)).toThrow(
      /unique per platform and placement/,
    );
  });

  it('rejects one production app ID reused across platforms', () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMOB_ANDROID_APP_ID = 'ca-app-pub-1111111111111111~1111111111';
    process.env.ADMOB_IOS_APP_ID = process.env.ADMOB_ANDROID_APP_ID;
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_HOME_BANNER_ID = 'ca-app-pub-1111111111111111/1111111111';
    process.env.EXPO_PUBLIC_ADMOB_IOS_HOME_BANNER_ID = 'ca-app-pub-2222222222222222/2222222222';
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_HISTORY_NATIVE_ID =
      'ca-app-pub-1111111111111111/3333333333';
    process.env.EXPO_PUBLIC_ADMOB_IOS_HISTORY_NATIVE_ID = 'ca-app-pub-2222222222222222/4444444444';
    expect(() => buildConfig(CONFIG_CONTEXT, process.env)).toThrow(/must be different/);
  });

  it('pins unique current SKAdNetwork IDs and UMP ProGuard rules', () => {
    process.env.NODE_ENV = 'development';
    const config = buildConfig(CONFIG_CONTEXT, process.env);
    expect(new Set(GOOGLE_SKADNETWORK_IDENTIFIERS).size).toBe(
      GOOGLE_SKADNETWORK_IDENTIFIERS.length,
    );
    expect(GOOGLE_SKADNETWORK_IDENTIFIERS).toContain('cstr6suwn9.skadnetwork');
    expect(
      GOOGLE_SKADNETWORK_IDENTIFIERS.every((id) => /^[a-z0-9]{10}\.skadnetwork$/.test(id)),
    ).toBe(true);
    expect(plugin(config, 'react-native-google-mobile-ads')[1]).toEqual(
      expect.objectContaining({ skAdNetworkItems: [...GOOGLE_SKADNETWORK_IDENTIFIERS] }),
    );
    expect(plugin(config, 'expo-build-properties')[1]).toEqual(
      expect.objectContaining({
        android: expect.objectContaining({
          extraProguardRules: expect.stringContaining(
            'com.google.android.gms.internal.consent_sdk',
          ),
        }),
      }),
    );
  });
});
