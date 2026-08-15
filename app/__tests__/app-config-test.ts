import appConfig from '../app.json';

const expo = appConfig.expo;

describe('app identity configuration', () => {
  it('pins the store-facing name, slug, scheme, and version', () => {
    expect(expo.name).toBe('AI English Coach');
    expect(expo.slug).toBe('ai-english-coach');
    expect(expo.scheme).toBe('aienglishcoach');
    expect(expo.version).toBe('1.0.0');
  });

  it('pins the platform bundle identifiers', () => {
    expect(expo.ios.bundleIdentifier).toBe('com.aienglish.coach');
    expect(expo.android.package).toBe('com.aienglish.coach');
  });

  it('configures the splash screen plugin with a contained icon and a dark variant', () => {
    // SDK 57: the top-level `splash` key is invalid; the expo-splash-screen
    // config plugin owns splash configuration.
    expect('splash' in expo).toBe(false);
    expect(expo.plugins).toContainEqual([
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        dark: {
          image: './assets/splash-icon.png',
          backgroundColor: '#0F1417',
        },
      },
    ]);
  });

  it('keeps the existing icons and follows the OS color scheme', () => {
    expect(expo.icon).toBe('./assets/icon.png');
    // U-M8: dark mode — the app follows the device's light/dark setting.
    expect(expo.userInterfaceStyle).toBe('automatic');
    expect(expo.android.adaptiveIcon).toEqual({
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    });
  });
});
