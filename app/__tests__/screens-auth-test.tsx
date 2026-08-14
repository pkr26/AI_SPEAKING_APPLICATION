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
import { colors } from '../src/lib/theme';
import type { User } from '../src/lib/types';

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

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
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
  mockAuthValue = makeAuth();
});

async function fillLogin(email: string, password: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), email);
  await fireEvent.changeText(screen.getByPlaceholderText('Your password'), password);
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
    expect(screen.getByText('AI English Coach')).toBeTruthy();
    expect(screen.getByText('Practice speaking English with instant AI feedback.')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com').props.value).toBe('');
    expect(screen.getByPlaceholderText('Your password').props.value).toBe('');
    expect(screen.getByRole('link', { name: 'Create an account' }).props.href).toBe('/signup');
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

  it('keeps Sign In disabled until email and password are present', async () => {
    await render(<LoginScreen />);
    expect(flattenedStyle(screen.getByRole('button', { name: 'Sign In' }))).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.primary,
      opacity: 0.5,
    });
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      true,
    );

    await fillLogin('ada@example.com', '');
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      true,
    );

    await fillLogin('ada@example.com', 'password1');
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      false,
    );
    expect(flattenedStyle(screen.getByRole('button', { name: 'Sign In' })).opacity).toBeUndefined();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Sign In' }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('rejects whitespace-only and oversized email values while accepting the exact limit', async () => {
    await render(<LoginScreen />);

    await fillLogin('   ', 'password1');
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });

    await fillLogin('a'.repeat(MAX_EMAIL_LENGTH), 'password1');
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      false,
    );

    await fillLogin('a'.repeat(MAX_EMAIL_LENGTH + 1), 'password1');
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it('configures login fields for email entry and password privacy', async () => {
    await render(<LoginScreen />);

    expect(screen.getByLabelText('Email').props).toMatchObject({
      autoCapitalize: 'none',
      autoCorrect: false,
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
      maxLength: MAX_EMAIL_LENGTH,
    });
    expect(screen.getByLabelText('Password').props).toMatchObject({
      secureTextEntry: true,
      textContentType: 'password',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it('rejects passwords over the UTF-8 byte limit client-side', async () => {
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'a'.repeat(73));
    expect(screen.getByText('Password must be at most 72 UTF-8 bytes.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      true,
    );
    expect(mockAuthValue.login).not.toHaveBeenCalled();
  });

  it('signs in with trimmed credentials and navigates home', async () => {
    await render(<LoginScreen />);
    await fillLogin('  ada@example.com  ', 'password1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.login).toHaveBeenCalledWith('ada@example.com', 'password1');
  });

  it('shows the busy state while the login request is in flight', async () => {
    const login = deferred<User>();
    mockAuthValue.login = jest.fn(() => login.promise);
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    try {
      const busyButton = await screen.findByRole('button', {
        name: 'Signing in…',
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
    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.login = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Too many attempts, please try again later.')).toBeTruthy();
  });

  it('maps other API errors through userMessageForError', async () => {
    mockAuthValue.login = jest.fn().mockRejectedValue(new ApiError(500, 'boom'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    expect(
      await screen.findByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.login = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(USER);
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Could not sign in. Please try again.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.login).toHaveBeenCalledTimes(2);
  });
});

async function fillSignup(name: string, email: string, password: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Your name'), name);
  await fireEvent.changeText(screen.getByPlaceholderText('you@example.com'), email);
  await fireEvent.changeText(
    screen.getByPlaceholderText('At least 8 characters, with a letter and a number'),
    password,
  );
}

function signUpButton() {
  return screen.getByRole('button', { name: 'Sign Up' });
}

describe('signup screen', () => {
  it('renders all fields and language choices', async () => {
    await render(<SignupScreen />);
    expect(screen.getByText('Create your account')).toBeTruthy();
    expect(screen.getByText("We'll tailor your practice to your native language.")).toBeTruthy();
    expect(screen.getByLabelText('Telugu, తెలుగు')).toBeTruthy();
    expect(screen.getByLabelText('Hindi, हिन्दी')).toBeTruthy();
    expect(screen.getByLabelText('Spanish, Español')).toBeTruthy();
    expect(screen.getByLabelText('Chinese (Simplified), 简体中文')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('');
    expect(screen.getByLabelText('Email').props.value).toBe('');
    expect(screen.getByLabelText('Password').props.value).toBe('');
    expect(screen.queryByText('Password must be at least 8 characters.')).toBeNull();
    expect(screen.getByRole('link', { name: 'Sign in' }).props.href).toBe('/login');
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

  it('requires every field plus a language before enabling Sign Up', async () => {
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

    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(signUpButton().props.accessibilityState).toEqual({
      disabled: false,
      busy: false,
    });
    expect(signUpButton().props.accessibilityState.disabled).toBe(false);
    expect(flattenedStyle(signUpButton()).opacity).toBeUndefined();
    expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState.selected).toBe(true);
    await expectPressFeedback(
      signUpButton,
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
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    await fillSignup('   ', 'ada@example.com', 'password1');
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
    await fillSignup('Ada', '   ', 'password1');
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);

    await fillSignup('n'.repeat(MAX_NAME_LENGTH), 'e'.repeat(MAX_EMAIL_LENGTH), 'password1');
    expect(signUpButton().props.accessibilityState.disabled).toBe(false);

    await fillSignup('n'.repeat(MAX_NAME_LENGTH + 1), 'ada@example.com', 'password1');
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
    await fillSignup('Ada', 'e'.repeat(MAX_EMAIL_LENGTH + 1), 'password1');
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
  });

  it('configures signup fields for identity entry and password privacy', async () => {
    await render(<SignupScreen />);

    expect(screen.getByLabelText('Name').props).toMatchObject({
      autoCapitalize: 'words',
      textContentType: 'name',
      maxLength: MAX_NAME_LENGTH,
    });
    expect(screen.getByLabelText('Email').props).toMatchObject({
      autoCapitalize: 'none',
      autoCorrect: false,
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
      maxLength: MAX_EMAIL_LENGTH,
    });
    expect(screen.getByLabelText('Password').props).toMatchObject({
      secureTextEntry: true,
      textContentType: 'newPassword',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it('rejects names over the maximum length client-side', async () => {
    await render(<SignupScreen />);
    await fillSignup('A'.repeat(101), 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('shows the length policy error for short passwords', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'abc1');
    expect(screen.getByText('Password must be at least 8 characters.')).toBeTruthy();
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
  });

  it('shows the letter+number policy error for passwords without digits', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'abcdefgh');
    expect(
      screen.getByText('Password must include at least one letter and one number.'),
    ).toBeTruthy();
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects signup passwords over the shared UTF-8 byte limit', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', `a1${'é'.repeat(36)}`);
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    expect(screen.getByText('Password must be at most 72 UTF-8 bytes.')).toBeTruthy();
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('registers and navigates home on success', async () => {
    await render(<SignupScreen />);
    await fillSignup('  Ada  ', '  ada@example.com ', 'password1');
    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    await fireEvent.press(signUpButton());

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
    await fireEvent.press(signUpButton());

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
    const pressPromise = fireEvent.press(signUpButton());

    try {
      const busyButton = await screen.findByRole('button', {
        name: 'Creating account…',
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
    await fireEvent.press(signUpButton());

    expect(await screen.findByText('An account with this email already exists.')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton());

    expect(await screen.findByText('Too many attempts, please try again later.')).toBeTruthy();
  });

  it('maps service failures to safe shared copy', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(500, 'private detail'));
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton());

    expect(
      await screen.findByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.register = jest
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(USER);
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton());

    expect(
      await screen.findByText(
        'Could not create your account. Check your information and try again.',
      ),
    ).toBeTruthy();
    expect(signUpButton().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(signUpButton());
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledTimes(2);
  });
});
