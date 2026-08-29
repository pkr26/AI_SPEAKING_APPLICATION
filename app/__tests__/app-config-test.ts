import appConfig from '../app.json';

const expo = appConfig.expo;

describe('app identity configuration', () => {
  it('pins the store-facing name, slug, scheme, and version', () => {
    expect(expo.name).toBe('AI English Coach');
    expect(expo.slug).toBe('ai-english-coach');
    expect(expo.scheme).toBe('aienglishcoach');
    expect(expo.version).toBe('1.1.0');
  });

  it('pins the platform bundle identifiers', () => {
    expect(expo.ios.bundleIdentifier).toBe('com.aienglish.coach');
    expect(expo.android.package).toBe('com.aienglish.coach');
  });

  it('carries per-build store metadata both stores reject uploads without', () => {
    // Both stores reject a second upload that reuses a build identifier, so
    // these must exist to be bumped; `version` alone is not enough.
    expect(expo.ios.buildNumber).toBe('2');
    expect(expo.android.versionCode).toBe(2);
    // Declaring the app exempt from the US export-encryption filing (it only
    // uses HTTPS) keeps every App Store upload from stalling on the
    // encryption questionnaire.
    expect(expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('registers the notifications plugin with a monochrome small icon', () => {
    // The daily reminder (src/lib/daily-reminder.ts) is the app's only
    // notification. Without this plugin entry no
    // `expo.modules.notifications.default_notification_icon` meta-data reaches
    // AndroidManifest and expo-notifications falls back to the full-color
    // launcher icon, which Android alpha-masks into a blank square. The icon
    // must stay a white-on-transparent 96x96 PNG; the color tints it in the
    // notification tray, so it is the brand primary (theme.ts `colors.primary`),
    // not a near-black that would vanish in the dark-mode shade.
    expect(expo.plugins).toContainEqual([
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#4F46E5',
      },
    ]);
  });

  it('configures the splash screen plugin with a contained icon and a dark variant', () => {
    // SDK 57: the top-level `splash` key is invalid; the expo-splash-screen
    // config plugin owns splash configuration.
    expect('splash' in expo).toBe(false);
    expect(expo.plugins).toContainEqual([
      'expo-splash-screen',
      {
        image: './assets/splash-icon-v2.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        dark: {
          image: './assets/splash-icon-v2.png',
          backgroundColor: '#0F1417',
        },
      },
    ]);
  });

  it('uses the production-ready icons and follows the OS color scheme', () => {
    expect(expo.icon).toBe('./assets/icon-v2.png');
    // Phones and tablets must remain usable when the device or an assistive
    // mount rotates; Expo defaults to supporting both orientations.
    expect('orientation' in expo).toBe(false);
    // U-M8: dark mode — the app follows the device's light/dark setting.
    expect(expo.userInterfaceStyle).toBe('automatic');
    expect(expo.android.adaptiveIcon).toEqual({
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    });
  });
});
