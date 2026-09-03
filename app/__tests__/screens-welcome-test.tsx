import { fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import React from 'react';

import WelcomeScreen from '../src/app/(auth)/welcome';
import { translateFor } from '../src/lib/i18n';
import { lightColors, useTheme } from '../src/lib/theme';

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

// ---------------------------------------------------------------------------
// Deep mutation-hardening: exact feature copy, per-tint badge styling and icon
// ink, layout styles, footer link styling, and the navigation latch re-arm.
// ---------------------------------------------------------------------------

const lightTheme = async () => (await renderHook(() => useTheme())).result.current;

/** Typed accessors for RNTL test nodes (children are elements or strings). */
function nodeChild(
  node: { children: unknown[] },
  index: number,
): {
  props: Record<string, unknown>;
  children: unknown[];
} {
  return node.children[index] as { props: Record<string, unknown>; children: unknown[] };
}

describe('welcome screen deep contracts', () => {
  it('renders each value promise with its exact copy and tinted badge', async () => {
    const theme = await lightTheme();
    await render(<WelcomeScreen />);
    const hidden = { includeHiddenElements: true } as const;

    const expected = [
      {
        testID: 'welcome-feature-mic',
        title: t('welcome.speakTitle'),
        body: t('welcome.speakBody'),
        badgeFill: lightColors.primaryLight,
        iconInk: lightColors.primary,
      },
      {
        testID: 'welcome-feature-sparkle',
        title: t('welcome.feedbackTitle'),
        body: t('welcome.feedbackBody'),
        badgeFill: lightColors.successLight,
        iconInk: lightColors.success,
      },
      {
        testID: 'welcome-feature-trending-up',
        title: t('welcome.levelTitle'),
        body: t('welcome.levelBody'),
        badgeFill: lightColors.accentLight,
        iconInk: lightColors.accent,
      },
    ];
    for (const feature of expected) {
      const card = screen.getByTestId(feature.testID, hidden);
      // Exact title and body copy render inside the card.
      const copyColumn = nodeChild(card, card.children.length - 1);
      expect(nodeChild(copyColumn, 0).props.children).toBe(feature.title);
      expect(nodeChild(copyColumn, 1).props.children).toBe(feature.body);
      // The badge fills with its tint and the glyph inks with the tint color.
      const badge = nodeChild(card, 0);
      expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: feature.badgeFill,
      });
      const iconElement = badge.props.children as React.ReactElement<{
        color?: string;
        size?: number;
      }>;
      expect(iconElement.props.color).toBe(feature.iconInk);
      expect(iconElement.props.size).toBe(22);
      // The card itself is the bordered tinted row.
      expect(StyleSheet.flatten(card.props.style)).toMatchObject({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: lightColors.card,
        borderWidth: 1,
        borderColor: lightColors.border,
        borderRadius: theme.radii.card,
        padding: theme.spacing.lg,
      });
      // Copy typography.
      expect(StyleSheet.flatten(nodeChild(copyColumn, 0).props.style)).toMatchObject({
        fontWeight: '700',
        color: lightColors.text,
        fontSize: theme.type.bodyLg.fontSize,
      });
      expect(StyleSheet.flatten(nodeChild(copyColumn, 1).props.style)).toMatchObject({
        marginTop: 2,
        color: lightColors.muted,
        fontSize: theme.type.callout.fontSize,
      });
    }
  });

  it('styles the brand mark, headline pair, and scroll container', async () => {
    const theme = await lightTheme();
    await render(<WelcomeScreen />);
    const header = screen.getByRole('header', { name: t('login.title') });
    expect(StyleSheet.flatten(header.props.style)).toMatchObject({
      fontWeight: '800',
      color: lightColors.text,
      textAlign: 'center',
      fontSize: theme.type.titleLg.fontSize,
    });
    const tagline = screen.getByText(t('login.subtitle'));
    expect(StyleSheet.flatten(tagline.props.style)).toMatchObject({
      color: lightColors.muted,
      textAlign: 'center',
      fontSize: theme.type.body.fontSize,
    });
    // The brand mark badge centers above the headline.
    const brandMark = nodeChild(header.parent!, 0);
    expect(StyleSheet.flatten(brandMark.props.style)).toMatchObject({
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: lightColors.primaryLight,
      alignSelf: 'center',
      marginBottom: theme.spacing.sm,
    });
  });

  it('styles the quiet login link and its bold action word', async () => {
    const theme = await lightTheme();
    await render(<WelcomeScreen />);
    const link = screen.getByRole('button', {
      name: `${t('login.footerPrompt')}${t('login.footerLink')}`,
    });
    expect(StyleSheet.flatten(link.props.style)).toMatchObject({
      minHeight: theme.layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      marginTop: theme.spacing.xs,
    });
    const promptText = nodeChild(link, 0);
    expect(StyleSheet.flatten(promptText.props.style)).toMatchObject({
      color: lightColors.muted,
      textAlign: 'center',
      fontSize: theme.type.callout.fontSize,
    });
    const boldWord = nodeChild(promptText, 1);
    expect(StyleSheet.flatten(boldWord.props.style)).toMatchObject({
      color: lightColors.primary,
      fontWeight: '700',
    });
  });

  it('re-arms navigation when the screen regains focus', async () => {
    const { rerender } = await render(<WelcomeScreen />);
    const login = screen.getByRole('button', {
      name: `${t('login.footerPrompt')}${t('login.footerLink')}`,
    });
    await fireEvent.press(login);
    expect(asMock(router.navigate).mock.calls).toEqual([['/login']]);

    // A re-render re-runs the focus effect (as a real refocus would), which
    // must clear the one-navigation latch so the primary CTA still works.
    await rerender(<WelcomeScreen />);
    const cta = screen.getByRole('button', { name: t('welcome.getStarted') });
    await fireEvent.press(cta);
    expect(asMock(router.navigate).mock.calls).toEqual([['/login'], ['/signup']]);
  });
});
