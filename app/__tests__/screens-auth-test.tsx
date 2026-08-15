import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import LoginScreen from '../src/app/(auth)/login';
import SignupScreen from '../src/app/(auth)/signup';
import { ApiError } from '../src/lib/api';
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  type useAuth,
} from '../src/lib/auth';
import { translateFor, type MessageKey, type UiLanguage } from '../src/lib/i18n';
import { consumeSessionExpiredNotice } from '../src/lib/session-notice';
import { colors } from '../src/lib/theme';
import type { User } from '../src/lib/types';

// No I18nProvider is mounted in these tests, so screens render in English
// unless the signup live preview switches them; expectations always go
// through the typed catalog.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

// session-notice persists through expo-secure-store, which has no native
// module under jest; only the consume entry point is faked per test.
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('../src/lib/session-notice', () => ({
  ...jest.requireActual('../src/lib/session-notice'),
  consumeSessionExpiredNotice: jest.fn(async () => false),
}));

const mockedConsumeSessionExpiredNotice = jest.mocked(consumeSessionExpiredNotice);

interface MockKeyboardAvoidingViewProps {
  behavior?: 'height' | 'position' | 'padding';
  children?: React.ReactNode;
  style?: unknown;
}

function MockKeyboardAvoidingView({ behavior, children, style }: MockKeyboardAvoidingViewProps) {
  return React.createElement(
    'KeyboardAvoidingView',
    { behavior, style, testID: 'keyboard-avoiding-view' },
    children,
  );
}

jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => ({
  __esModule: true,
  default: MockKeyboardAvoidingView,
}));

// ----- expo-router mock -----

function MockLink({
  children,
  href,
  accessibilityRole,
  ...textProps
}: TextProps & { children: React.ReactNode; href: string }) {
  return (
    <Text {...textProps} accessibilityRole={accessibilityRole ?? 'link'} {...{ href }}>
      {children}
    </Text>
  );
}

let mockSearchParams: Record<string, string | string[] | undefined> = {};

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
  useLocalSearchParams: () => mockSearchParams,
  Link: MockLink,
}));

// ----- auth mock -----

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

let mockAuthValue: AuthValue;

function makeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    token: null,
    user: null,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
    resetStoredSession: jest.fn(),
    login: jest.fn().mockResolvedValue(USER),
    register: jest.fn().mockResolvedValue(USER),
    logout: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
}));

// ----- helpers -----

const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  dismissTo: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = {};
  mockAuthValue = makeAuth();
  mockedConsumeSessionExpiredNotice.mockResolvedValue(false);
});

async function fillLogin(email: string, password: string) {
  await fireEvent.changeText(screen.getByPlaceholderText(t('login.emailPlaceholder')), email);
  await fireEvent.changeText(screen.getByPlaceholderText(t('login.passwordPlaceholder')), password);
}

function logInButton() {
  return screen.getByRole('button', { name: t('login.submit') });
}

async function withPlatformOS(os: 'ios' | 'android', run: () => Promise<void>): Promise<void> {
  const originalOS = Object.getOwnPropertyDescriptor(Platform, 'OS');
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  try {
    await run();
  } finally {
    if (originalOS) Object.defineProperty(Platform, 'OS', originalOS);
  }
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function textNode(node: TestInstance, text: string): TestInstance {
  const match = node.queryAll((candidate) => candidate.children.includes(text))[0];
  if (!match) throw new Error(`Text "${text}" not found inside rendered control`);
  return match;
}

/**
 * The RN jest preset mocks TextInput as a class component whose prototype
 * shares one focus() jest.fn across every instance. Walk from the queried
 * host element up to that class instance and shadow focus() per instance so
 * return-key chaining can assert which field received focus.
 */
function spyOnTextInputFocus(element: TestInstance): jest.Mock {
  type Fiber = { stateNode: unknown; return: Fiber | null };
  let fiber = (element as unknown as { unstable_fiber: Fiber | null }).unstable_fiber;
  while (fiber) {
    const stateNode = fiber.stateNode as { focus?: unknown } | null;
    if (stateNode && typeof stateNode.focus === 'function') {
      const spy = jest.fn();
      Object.defineProperty(stateNode, 'focus', { configurable: true, value: spy });
      return spy;
    }
    fiber = fiber.return;
  }
  throw new Error('TextInput instance not found');
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

async function expectPressFeedback(
  getButton: () => TestInstance,
  resting: SemanticStyle,
  pressed: SemanticStyle,
): Promise<void> {
  expect(flattenedStyle(getButton())).toMatchObject(resting);
  await fireEvent(getButton(), 'responderGrant', responderEvent());
  expect(flattenedStyle(getButton())).toMatchObject(pressed);
  await fireEvent(getButton(), 'responderTerminate', responderEvent());
  await waitFor(() => {
    const restored = flattenedStyle(getButton());
    expect(restored).toMatchObject(resting);
    for (const property of Object.keys(pressed)) {
      if (!(property in resting)) expect(restored[property]).toBeUndefined();
    }
  });
}

describe('login screen', () => {
  it('renders the brand, inputs, and signup link', async () => {
    await render(<LoginScreen />);
    expect(screen.getByText(t('login.title'))).toBeTruthy();
    expect(screen.getByText(t('login.subtitle'))).toBeTruthy();
    expect(screen.getByPlaceholderText(t('login.emailPlaceholder')).props.value).toBe('');
    expect(screen.getByPlaceholderText(t('login.passwordPlaceholder')).props.value).toBe('');
    expect(screen.getByText(t('login.footerPrompt'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t('login.footerLink') }).props.href).toBe('/signup');
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ] as const)('uses the %s keyboard-avoidance behavior', async (os, expectedBehavior) => {
    await withPlatformOS(os, async () => {
      await render(<LoginScreen />);

      expect(screen.getByTestId('keyboard-avoiding-view').props.behavior).toBe(expectedBehavior);
    });
  });

  it('keeps Log in disabled until email and password are present', async () => {
    await render(<LoginScreen />);
    expect(flattenedStyle(logInButton())).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.primary,
      opacity: 0.5,
    });
    expect(logInButton().props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    expect(logInButton().props.accessibilityState.disabled).toBe(true);

    await fillLogin('ada@example.com', '');
    expect(logInButton().props.accessibilityState.disabled).toBe(true);

    await fillLogin('ada@example.com', 'password1');
    expect(logInButton().props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
    expect(logInButton().props.accessibilityState.disabled).toBe(false);
    expect(flattenedStyle(logInButton()).opacity).toBeUndefined();
    await expectPressFeedback(
      logInButton,
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('rejects whitespace-only and oversized email values while accepting the exact limit', async () => {
    await render(<LoginScreen />);

    await fillLogin('   ', 'password1');
    expect(logInButton().props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });

    await fillLogin('a'.repeat(MAX_EMAIL_LENGTH), 'password1');
    expect(logInButton().props.accessibilityState.disabled).toBe(false);

    await fillLogin('a'.repeat(MAX_EMAIL_LENGTH + 1), 'password1');
    expect(logInButton().props.accessibilityState.disabled).toBe(true);
  });

  it('configures login fields for email entry and password privacy', async () => {
    await render(<LoginScreen />);

    expect(screen.getByLabelText(t('login.emailLabel')).props).toMatchObject({
      autoCapitalize: 'none',
      autoComplete: 'email',
      autoCorrect: false,
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
      returnKeyType: 'next',
      maxLength: MAX_EMAIL_LENGTH,
    });
    expect(screen.getByLabelText(t('login.passwordLabel')).props).toMatchObject({
      secureTextEntry: true,
      autoComplete: 'password',
      textContentType: 'password',
      returnKeyType: 'go',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it('moves focus from email to password and submits from the password field', async () => {
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    const focusSpy = spyOnTextInputFocus(screen.getByLabelText(t('login.passwordLabel')));

    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'submitEditing');
    expect(focusSpy).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('login.passwordLabel')), 'submitEditing');
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.login).toHaveBeenCalledWith('ada@example.com', 'password1');
  });

  it('marks the focused field with a two-pixel accent border', async () => {
    await render(<LoginScreen />);
    const emailInput = () => screen.getByLabelText(t('login.emailLabel'));
    const passwordInput = () => screen.getByLabelText(t('login.passwordLabel'));

    expect(flattenedStyle(emailInput())).toMatchObject({
      borderWidth: 1,
      borderColor: colors.inputBorder,
    });

    await fireEvent(emailInput(), 'focus');
    expect(flattenedStyle(emailInput())).toMatchObject({
      borderWidth: 2,
      borderColor: colors.primary,
    });
    // Only one field carries the focus treatment at a time.
    expect(flattenedStyle(passwordInput())).toMatchObject({
      borderWidth: 1,
      borderColor: colors.inputBorder,
    });

    await fireEvent(emailInput(), 'blur');
    expect(flattenedStyle(emailInput())).toMatchObject({
      borderWidth: 1,
      borderColor: colors.inputBorder,
    });

    await fireEvent(passwordInput(), 'focus');
    expect(flattenedStyle(passwordInput())).toMatchObject({
      borderWidth: 2,
      borderColor: colors.primary,
    });
    await fireEvent(passwordInput(), 'blur');
    expect(flattenedStyle(passwordInput())).toMatchObject({
      borderWidth: 1,
      borderColor: colors.inputBorder,
    });
  });

  it('reveals and hides the password from the accessible toggle', async () => {
    await render(<LoginScreen />);
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByText(t('common.hide'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getByText(t('common.show'))).toBeTruthy();
  });

  it('shows the one-shot signed-out banner when the session was expired', async () => {
    mockedConsumeSessionExpiredNotice.mockResolvedValue(true);
    await render(<LoginScreen />);

    const banner = await screen.findByText(t('auth.sessionExpired'));
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(mockedConsumeSessionExpiredNotice).toHaveBeenCalledTimes(1);
  });

  it('shows no signed-out banner without a stored notice', async () => {
    await render(<LoginScreen />);

    expect(mockedConsumeSessionExpiredNotice).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('auth.sessionExpired'))).toBeNull();
  });

  it('rejects passwords over the UTF-8 byte limit client-side', async () => {
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'a'.repeat(73));
    expect(screen.getByText(t('password.tooLong'))).toBeTruthy();
    expect(logInButton().props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.login).not.toHaveBeenCalled();
  });

  it('logs in with trimmed credentials and navigates home', async () => {
    await render(<LoginScreen />);
    await fillLogin('  ada@example.com  ', 'password1');
    await fireEvent.press(logInButton());

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.login).toHaveBeenCalledWith('ada@example.com', 'password1');
  });

  it('shows the busy state while the login request is in flight', async () => {
    const login = deferred<User>();
    mockAuthValue.login = jest.fn(() => login.promise);
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(logInButton());

    try {
      const busyButton = await screen.findByRole('button', {
        name: t('login.submitBusy'),
      });
      expect(busyButton.props.accessibilityState).toEqual({
        disabled: true,
        busy: true,
      });
    } finally {
      try {
        await act(async () => login.resolve(USER));
      } finally {
        await pressPromise;
      }
    }
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.login = jest.fn().mockRejectedValue(new ApiError(401, 'unauthorized'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());

    expect(await screen.findByText(t('error.wrongCredentials'))).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('maps a 429 through userMessageForError', async () => {
    mockAuthValue.login = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());

    expect(await screen.findByText(t('error.tooMany'))).toBeTruthy();
  });

  it('maps other API errors through userMessageForError', async () => {
    mockAuthValue.login = jest.fn().mockRejectedValue(new ApiError(500, 'boom'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.login = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(USER);
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());

    expect(await screen.findByText(t('login.failed'))).toBeTruthy();
    expect(logInButton().props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });

    await fireEvent.press(logInButton());
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.login).toHaveBeenCalledTimes(2);
  });
});

// The signup screen live-previews the tapped chip language, so helpers accept
// the language the screen is currently rendered in.
async function fillSignup(name: string, email: string, password: string, lang: UiLanguage = 'en') {
  await fireEvent.changeText(
    screen.getByPlaceholderText(translateFor(lang, 'signup.namePlaceholder')),
    name,
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText(translateFor(lang, 'login.emailPlaceholder')),
    email,
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText(translateFor(lang, 'signup.passwordPlaceholder')),
    password,
  );
}

function signUpButton(lang: UiLanguage = 'en') {
  return screen.getByRole('button', { name: translateFor(lang, 'signup.submit') });
}

describe('signup screen', () => {
  it('renders all fields and language choices', async () => {
    await render(<SignupScreen />);
    expect(screen.getByText(t('signup.title'))).toBeTruthy();
    expect(screen.getByText(t('signup.subtitle'))).toBeTruthy();
    expect(screen.getByLabelText('Telugu, తెలుగు')).toBeTruthy();
    expect(screen.getByLabelText('Hindi, हिन्दी')).toBeTruthy();
    expect(screen.getByLabelText('Spanish, Español')).toBeTruthy();
    expect(screen.getByLabelText('Chinese (Simplified), 简体中文')).toBeTruthy();
    expect(screen.getByLabelText(t('signup.nameLabel')).props.value).toBe('');
    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('');
    expect(screen.getByLabelText(t('login.passwordLabel')).props.value).toBe('');
    expect(screen.getByText(t('signup.languageLabel'))).toBeTruthy();
    expect(screen.queryByText(t('password.tooShort'))).toBeNull();
    expect(screen.getByText(t('signup.footerPrompt'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t('signup.footerLink') }).props.href).toBe('/login');
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ] as const)('uses the %s keyboard-avoidance behavior', async (os, expectedBehavior) => {
    await withPlatformOS(os, async () => {
      await render(<SignupScreen />);

      expect(screen.getByTestId('keyboard-avoiding-view').props.behavior).toBe(expectedBehavior);
    });
  });

  it('requires every field plus a language before enabling Create account', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    expect(flattenedStyle(signUpButton())).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.primary,
      opacity: 0.5,
    });
    expect(signUpButton().props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);

    // Choosing the chip enables submit and live-previews the screen in Telugu.
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(signUpButton('te').props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(false);
    expect(flattenedStyle(signUpButton('te')).opacity).toBeUndefined();
    expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState.selected).toBe(true);
    await expectPressFeedback(
      () => signUpButton('te'),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('keeps language selection mutually exclusive and exposed to accessibility', async () => {
    await render(<SignupScreen />);
    const telugu = screen.getByLabelText('Telugu, తెలుగు');
    const spanish = screen.getByLabelText('Spanish, Español');

    expect(telugu.props.accessibilityState).toEqual({ selected: false });
    expect(spanish.props.accessibilityState).toEqual({ selected: false });
    expect(flattenedStyle(telugu)).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.border,
      flexBasis: '47%',
    });
    expect(flattenedStyle(textNode(telugu, 'తెలుగు'))).toMatchObject({
      color: colors.text,
    });
    expect(flattenedStyle(textNode(telugu, 'Telugu'))).toMatchObject({ color: colors.muted });

    await fireEvent.press(telugu);
    const selectedTelugu = screen.getByLabelText('Telugu, తెలుగు');
    expect(selectedTelugu.props.accessibilityState).toEqual({
      selected: true,
    });
    expect(flattenedStyle(selectedTelugu)).toMatchObject({
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(textNode(selectedTelugu, 'తెలుగు'))).toMatchObject({
      color: colors.primary,
    });
    expect(flattenedStyle(textNode(selectedTelugu, 'Telugu'))).toMatchObject({
      color: colors.primary,
    });
    expect(screen.getByLabelText('Spanish, Español').props.accessibilityState).toEqual({
      selected: false,
    });

    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(screen.getByLabelText('Spanish, Español').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('enforces trimmed name and email boundaries', async () => {
    await render(<SignupScreen />);
    // The live preview renders the whole screen in Telugu after the chip press.
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    await fillSignup('   ', 'ada@example.com', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    await fillSignup('Ada', '   ', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);

    await fillSignup('n'.repeat(MAX_NAME_LENGTH), 'e'.repeat(MAX_EMAIL_LENGTH), 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(false);

    await fillSignup('n'.repeat(MAX_NAME_LENGTH + 1), 'ada@example.com', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    await fillSignup('Ada', 'e'.repeat(MAX_EMAIL_LENGTH + 1), 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
  });

  it('configures signup fields for identity entry and password privacy', async () => {
    await render(<SignupScreen />);

    expect(screen.getByLabelText(t('signup.nameLabel')).props).toMatchObject({
      autoCapitalize: 'words',
      autoComplete: 'name',
      textContentType: 'name',
      returnKeyType: 'next',
      maxLength: MAX_NAME_LENGTH,
    });
    expect(screen.getByLabelText(t('login.emailLabel')).props).toMatchObject({
      autoCapitalize: 'none',
      autoComplete: 'email',
      autoCorrect: false,
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
      returnKeyType: 'next',
      maxLength: MAX_EMAIL_LENGTH,
    });
    expect(screen.getByLabelText(t('login.passwordLabel')).props).toMatchObject({
      secureTextEntry: true,
      autoComplete: 'new-password',
      textContentType: 'newPassword',
      returnKeyType: 'go',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it('chains name to email to password and submits from the password field', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    // The chip press relabels every field in Telugu via the live preview.
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    const emailFocus = spyOnTextInputFocus(
      screen.getByLabelText(translateFor('te', 'login.emailLabel')),
    );
    const passwordFocus = spyOnTextInputFocus(
      screen.getByLabelText(translateFor('te', 'login.passwordLabel')),
    );

    await fireEvent(screen.getByLabelText(translateFor('te', 'signup.nameLabel')), 'submitEditing');
    expect(emailFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(translateFor('te', 'login.emailLabel')), 'submitEditing');
    expect(passwordFocus).toHaveBeenCalledTimes(1);

    await fireEvent(
      screen.getByLabelText(translateFor('te', 'login.passwordLabel')),
      'submitEditing',
    );
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledWith(
      'Ada',
      'ada@example.com',
      'password1',
      'te',
    );
  });

  it('marks the focused signup field with a two-pixel accent border', async () => {
    await render(<SignupScreen />);

    for (const label of [t('signup.nameLabel'), t('login.emailLabel'), t('login.passwordLabel')]) {
      const input = () => screen.getByLabelText(label);
      expect(flattenedStyle(input())).toMatchObject({
        borderWidth: 1,
        borderColor: colors.inputBorder,
      });

      await fireEvent(input(), 'focus');
      expect(flattenedStyle(input())).toMatchObject({
        borderWidth: 2,
        borderColor: colors.primary,
      });

      await fireEvent(input(), 'blur');
      expect(flattenedStyle(input())).toMatchObject({
        borderWidth: 1,
        borderColor: colors.inputBorder,
      });
    }
  });

  it('reveals and hides the signup password from the accessible toggle', async () => {
    await render(<SignupScreen />);
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);
  });

  it('rejects names over the maximum length client-side', async () => {
    await render(<SignupScreen />);
    await fillSignup('A'.repeat(101), 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('shows the length policy error for short passwords', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'abc1');
    expect(screen.getByText(t('password.tooShort'))).toBeTruthy();
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
  });

  it('shows the letter+number policy error for passwords without digits', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'abcdefgh');
    expect(screen.getByText(t('password.needsLetterAndNumber'))).toBeTruthy();
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects signup passwords over the shared UTF-8 byte limit', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', `a1${'é'.repeat(36)}`);
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    // The inline policy error follows the live-preview language.
    expect(screen.getByText(translateFor('te', 'password.tooLong'))).toBeTruthy();
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('previews the whole signup screen in the tapped chip language', async () => {
    await render(<SignupScreen />);
    expect(screen.getByText(t('signup.title'))).toBeTruthy();
    expect(screen.getByText(t('signup.submit'))).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(screen.getByText(translateFor('te', 'signup.title'))).toBeTruthy();
    expect(screen.getByText(translateFor('te', 'signup.submit'))).toBeTruthy();
    expect(screen.queryByText(t('signup.title'))).toBeNull();
    expect(screen.queryByText(t('signup.submit'))).toBeNull();

    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    expect(screen.getByText(translateFor('es', 'signup.title'))).toBeTruthy();
    expect(screen.getByText(translateFor('es', 'signup.submit'))).toBeTruthy();
    expect(screen.queryByText(translateFor('te', 'signup.title'))).toBeNull();
    expect(screen.queryByText(translateFor('te', 'signup.submit'))).toBeNull();
  });

  it('renders inline password-policy errors in the preview language', async () => {
    await render(<SignupScreen />);
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    await fireEvent.changeText(
      screen.getByPlaceholderText(translateFor('te', 'signup.passwordPlaceholder')),
      'ab1',
    );
    expect(screen.getByText(translateFor('te', 'password.tooShort'))).toBeTruthy();
    expect(screen.queryByText(t('password.tooShort'))).toBeNull();

    // Switching the preview re-renders the existing error in the new language.
    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    expect(screen.getByText(translateFor('es', 'password.tooShort'))).toBeTruthy();
    expect(screen.queryByText(translateFor('te', 'password.tooShort'))).toBeNull();
  });

  it('registers and navigates home on success', async () => {
    await render(<SignupScreen />);
    await fillSignup('  Ada  ', '  ada@example.com ', 'password1');
    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    await fireEvent.press(signUpButton('es'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledWith(
      'Ada',
      'ada@example.com',
      'password1',
      'es',
    );
  });

  it.each([
    ['Hindi, हिन्दी', 'hi'],
    ['Chinese (Simplified), 简体中文', 'zh'],
  ] as const)('submits the exact server language code for %s', async (label, code) => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText(label));
    await fireEvent.press(signUpButton(code));

    await waitFor(() =>
      expect(mockAuthValue.register).toHaveBeenCalledWith(
        'Ada',
        'ada@example.com',
        'password1',
        code,
      ),
    );
  });

  it('shows the busy state while registering', async () => {
    const registration = deferred<User>();
    mockAuthValue.register = jest.fn(() => registration.promise);
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(signUpButton('te'));

    try {
      const busyButton = await screen.findByRole('button', {
        name: translateFor('te', 'signup.submitBusy'),
      });
      expect(busyButton.props.accessibilityState).toEqual({
        disabled: true,
        busy: true,
      });
    } finally {
      try {
        await act(async () => registration.resolve(USER));
      } finally {
        await pressPromise;
      }
    }
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('shows a duplicate-account error on 409', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(409, 'exists'));
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    // The screen translator follows the previewed language.
    expect(await screen.findByText(translateFor('te', 'error.emailTaken'))).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('maps a 429 through userMessageForError', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    // userMessageForError builds copy with the module-level translator, which
    // stays English here because no I18nProvider is mounted in these tests.
    expect(await screen.findByText(t('error.tooMany'))).toBeTruthy();
  });

  it('maps service failures to safe shared copy', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(500, 'private detail'));
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.register = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(USER);
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    // The fallback comes from the screen translator, so it is previewed Telugu.
    expect(await screen.findByText(translateFor('te', 'signup.failed'))).toBeTruthy();
    expect(signUpButton('te').props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(signUpButton('te'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledTimes(2);
  });
});
