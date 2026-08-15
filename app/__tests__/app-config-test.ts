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

  it('configures the splash screen with a contained icon on white', () => {
    expect(expo.splash).toEqual({
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    });
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
