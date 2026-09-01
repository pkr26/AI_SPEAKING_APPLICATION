import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import WelcomeScreen from '../src/app/(auth)/welcome';
import { translateFor } from '../src/lib/i18n';

const asMock = (fn: unknown) => fn as jest.Mock;

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('../src/lib/auth', () => ({
  useAuth: () => ({ user: null, token: null }),
}));

const mockSetLanguage = jest.fn();
let mockGuestLanguageState: {
  language: 'en' | 'te' | 'hi' | 'es' | 'zh';
  persistenceError: string | null;
} = { language: 'en', persistenceError: null };

jest.mock('../src/lib/guest-language', () => ({
  useGuestLanguage: () => ({
    language: mockGuestLanguageState.language,
    isRestoring: false,
    setLanguage: mockSetLanguage,
    mirrorAccountLanguage: jest.fn(),
    persistenceError: mockGuestLanguageState.persistenceError,
  }),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn() },
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  // Invoke the effect like the real hook does on focus so the screen's
  // latch-reset body is exercised.
  useFocusEffect: (effect: () => (() => void) | undefined) => {
    void effect();
  },
}));

const t = (key: Parameters<typeof translateFor>[1]) => translateFor('en', key);

beforeEach(() => {
  mockSetLanguage.mockClear();
  mockGuestLanguageState = { language: 'en', persistenceError: null };
  asMock(router.push).mockClear();
  asMock(router.navigate).mockClear();
});

describe('welcome screen', () => {
  it('shows the brand, the three value promises, and the language picker', async () => {
    await render(<WelcomeScreen />);

    expect(screen.getByRole('header', { name: t('login.title') })).toBeTruthy();
    expect(screen.getByText(t('login.subtitle'))).toBeTruthy();
    expect(screen.getByText(t('welcome.speakTitle'))).toBeTruthy();
    expect(screen.getByText(t('welcome.feedbackTitle'))).toBeTruthy();
    expect(screen.getByText(t('welcome.levelTitle'))).toBeTruthy();
    // Each promise carries its decorative feature mark.
    expect(screen.getByTestId('welcome-feature-mic', { includeHiddenElements: true })).toBeTruthy();
    expect(
      screen.getByTestId('welcome-feature-sparkle', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.getByTestId('welcome-feature-trending-up', { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it('sends new learners to signup exactly once per tap burst', async () => {
    const first = await render(<WelcomeScreen />);

    // A double-tap on the CTA navigates once (singleton-navigation latch).
    const cta = screen.getByRole('button', { name: t('welcome.getStarted') });
    await fireEvent.press(cta);
    await fireEvent.press(cta);
    expect(asMock(router.navigate)).toHaveBeenCalledTimes(1);
    expect(asMock(router.navigate)).toHaveBeenCalledWith('/signup');
    expect(asMock(router.push)).not.toHaveBeenCalled();
    first.unmount();
  });

  it('sends returning learners to login exactly once per tap burst', async () => {
    await render(<WelcomeScreen />);

    // The login link's accessible name is its full sentence; the once-latch
    // applies to it exactly as it does to the primary CTA.
    const loginLink = screen.getByRole('button', {
      name: `${t('login.footerPrompt')}${t('login.footerLink')}`,
    });
    await fireEvent.press(loginLink);
    await fireEvent.press(loginLink);
    expect(asMock(router.navigate)).toHaveBeenCalledTimes(1);
    expect(asMock(router.navigate)).toHaveBeenCalledWith('/login');
    expect(asMock(router.push)).not.toHaveBeenCalled();
  });

  it('wires the language picker to the device UiLanguage preference', async () => {
    await render(<WelcomeScreen />);

    // Choosing a UI language writes the non-sensitive device preference, not
    // any account state (this screen renders before any account exists).
    await fireEvent.press(screen.getByTestId('ui-language-te'));
    expect(mockSetLanguage).toHaveBeenCalledTimes(1);
    expect(mockSetLanguage).toHaveBeenCalledWith('te');

    // A persistence failure from the picker's own store surfaces as an alert.
    mockGuestLanguageState = { language: 'te', persistenceError: 'Secure storage unavailable' };
    await render(<WelcomeScreen />);
    expect(
      screen.getAllByText('Secure storage unavailable').some((node) => {
        const role = (node.props as { accessibilityRole?: string }).accessibilityRole;
        return role === 'alert';
      }),
    ).toBe(true);
  });
});
