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

jest.mock('../src/lib/guest-language', () => ({
  useGuestLanguage: () => ({
    language: 'en',
    isRestoring: false,
    setLanguage: jest.fn(),
    mirrorAccountLanguage: jest.fn(),
    persistenceError: null,
  }),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn() },
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));

const t = (key: Parameters<typeof translateFor>[1]) => translateFor('en', key);

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

  it('sends new learners to signup and returning learners to login', async () => {
    await render(<WelcomeScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('welcome.getStarted') }));
    expect(asMock(router.push)).toHaveBeenCalledWith('/signup');

    // The login link's accessible name is its full sentence.
    await fireEvent.press(
      screen.getByRole('button', { name: `${t('login.footerPrompt')}${t('login.footerLink')}` }),
    );
    expect(asMock(router.push)).toHaveBeenCalledWith('/login');
  });
});
