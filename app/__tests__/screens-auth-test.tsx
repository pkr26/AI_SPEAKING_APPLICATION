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
import {
  I18nProvider,
  setActiveLanguage,
  translateFor,
  useI18n,
  type MessageKey,
  type UiLanguage,
} from '../src/lib/i18n';
import { consumeSessionExpiredNotice } from '../src/lib/session-notice';
import { colors, layout, radii, spacing } from '../src/lib/theme';
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

const mockSetOptions = jest.fn();
let mockBeforeRemoveListener:
  ((event: { data: { action: { type: string } }; preventDefault: () => void }) => void) | null =
  null;
const mockAddNavigationListener = jest.fn(
  (
    event: string,
    listener: (event: { data: { action: { type: string } }; preventDefault: () => void }) => void,
  ) => {
    if (event === 'beforeRemove') mockBeforeRemoveListener = listener;
    return () => {
      if (mockBeforeRemoveListener === listener) mockBeforeRemoveListener = null;
    };
  },
);
const mockNavigation = {
  setOptions: mockSetOptions,
  addListener: mockAddNavigationListener,
};
let mockHardwareBackHandler: (() => boolean) | null = null;
const mockLinkNavigate = jest.fn();

jest.mock('../src/lib/use-hardware-back', () => ({
  useHardwareBack: (handler: () => boolean) => {
    mockHardwareBackHandler = handler;
  },
}));

function MockLink({
  children,
  href,
  accessibilityRole,
  onPress,
  ...textProps
}: TextProps & { children: React.ReactNode; href: string }) {
  const handlePress = () => {
    let prevented = false;
    onPress?.({
      preventDefault: () => {
        prevented = true;
      },
    } as never);
    if (!prevented) mockLinkNavigate(href);
  };
  return (
    <Text
      {...textProps}
      accessibilityRole={accessibilityRole ?? 'link'}
      onPress={handlePress}
      {...{ href }}
    >
      {children}
    </Text>
  );
}

let mockSearchParams: Record<string, string | string[] | undefined> = {};

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
    },
    useLocalSearchParams: () => mockSearchParams,
    useNavigation: () => mockNavigation,
    // Signup scopes its language preview to focus; run the effect on mount and
    // its cleanup on unmount, the way expo-router does on navigation.
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
    Link: MockLink,
  };
});

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
    captureSessionLease: jest.fn(() => ({}) as never),
    isSessionLeaseCurrent: jest.fn(() => true),
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

const LOCKED_NAVIGATION_OPTIONS = {
  headerBackVisible: false,
  gestureEnabled: false,
};

const UNLOCKED_NAVIGATION_OPTIONS = {
  headerBackVisible: true,
  gestureEnabled: true,
};

function hardwareBackIsHandled(): boolean {
  if (!mockHardwareBackHandler) throw new Error('No hardware-back handler was registered');
  return mockHardwareBackHandler();
}

function dispatchBeforeRemove(type: string): jest.Mock {
  if (!mockBeforeRemoveListener) throw new Error('No beforeRemove listener was registered');
  const preventDefault = jest.fn();
  mockBeforeRemoveListener({ data: { action: { type } }, preventDefault });
  return preventDefault;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = {};
  mockBeforeRemoveListener = null;
  mockHardwareBackHandler = null;
  mockAuthValue = makeAuth();
  mockedConsumeSessionExpiredNotice.mockResolvedValue(false);
  // The preview test below mounts the real I18nProvider, whose effect moves the
  // module-level language; pin it back so every test starts in English.
  setActiveLanguage('en');
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

/** Reads the currently committed Pressable callback without a nested RNTL act,
 * used to model two taps arriving before the busy render commits. */
function committedPressHandler(node: TestInstance): () => unknown {
  type Fiber = {
    memoizedProps?: { onPress?: unknown };
    return: Fiber | null;
  };
  let fiber = node.unstable_fiber as Fiber | null;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress as () => unknown;
    }
    fiber = fiber.return;
  }
  throw new Error('No committed press handler found');
}

function textNode(node: TestInstance, text: string): TestInstance {
  const match = node.queryAll((candidate) => candidate.children.includes(text))[0];
  if (!match) throw new Error(`Text "${text}" not found inside rendered control`);
  return match;
}

/** The host view a control is laid out in (form card, input row, footer row). */
function parentOf(node: TestInstance): TestInstance {
  const parent = node.parent;
  if (!parent) throw new Error('Element is not laid out inside a parent view');
  return parent;
}

/**
 * ScrollView renders as the host `RCTScrollView`, which keeps
 * `contentContainerStyle` as a prop instead of applying it to a child view.
 */
function scrollContentStyle(): SemanticStyle {
  const [scrollView] = screen.container.queryAll((node) => node.type === 'RCTScrollView');
  if (!scrollView) throw new Error('No ScrollView rendered');
  return StyleSheet.flatten(scrollView.props.contentContainerStyle) ?? {};
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
    expect(screen.getByText(t('login.emailLabel'))).toBeTruthy();
    expect(screen.getByPlaceholderText(t('login.emailPlaceholder')).props.value).toBe('');
    expect(screen.getByText(t('login.passwordLabel'))).toBeTruthy();
    expect(screen.getByPlaceholderText(t('login.passwordPlaceholder')).props.value).toBe('');
    // An untouched password carries no inline error.
    expect(screen.queryByText(t('password.tooLong'))).toBeNull();
    expect(screen.queryByText(t('reset.doneBanner'))).toBeNull();
    expect(screen.getByText(t('login.footerPrompt'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t('login.forgot') }).props.href).toBe(
      '/forgot-password',
    );
    expect(screen.getByRole('link', { name: t('login.footerLink') }).props.href).toBe('/signup');
  });

  it('lays out the login screen on the shared token scale', async () => {
    await render(<LoginScreen />);

    expect(flattenedStyle(screen.getByTestId('keyboard-avoiding-view'))).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(screen.getByRole('header', { name: t('login.title') }))).toEqual({
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('login.subtitle')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
    });

    const emailLabel = screen.getByText(t('login.emailLabel'));
    expect(flattenedStyle(parentOf(emailLabel))).toEqual({
      marginTop: 36,
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    });
    expect(flattenedStyle(emailLabel)).toEqual({
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: spacing.md,
    });
  });

  it('overlays the password reveal control inside the password field', async () => {
    await render(<LoginScreen />);
    const passwordInput = screen.getByLabelText(t('login.passwordLabel'));

    expect(flattenedStyle(parentOf(passwordInput))).toEqual({
      position: 'relative',
      justifyContent: 'center',
    });
    // The field reserves room on the right so the text never runs under Show.
    expect(flattenedStyle(passwordInput)).toEqual({
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radii.input,
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      paddingRight: 64,
    });
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.showPassword') }))).toEqual({
      position: 'absolute',
      right: 4,
      minHeight: layout.minimumTarget,
      minWidth: layout.minimumTarget,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
    });
    expect(flattenedStyle(screen.getByText(t('common.show')))).toEqual({
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    });
  });

  it('spaces the submit button, forgot link, and signup footer', async () => {
    await render(<LoginScreen />);

    expect(flattenedStyle(logInButton())).toMatchObject({ marginTop: spacing.lg });
    expect(flattenedStyle(screen.getByRole('link', { name: t('login.forgot') }))).toEqual({
      marginTop: spacing.ml,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    });

    const footerText = screen.getByText(t('login.footerPrompt'));
    expect(flattenedStyle(parentOf(footerText))).toEqual({
      marginTop: spacing.xl,
      minHeight: layout.minimumTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(flattenedStyle(footerText)).toEqual({ fontSize: 15, color: colors.muted });
    expect(flattenedStyle(screen.getByRole('link', { name: t('login.footerLink') }))).toEqual({
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
    });
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

    // Surrounding whitespace is trimmed before the limit is measured, so a
    // padded address that fits exactly still submits.
    await fillLogin(`  ${'a'.repeat(MAX_EMAIL_LENGTH)}  `, 'password1');
    expect(logInButton().props.accessibilityState.disabled).toBe(false);

    await fillLogin('a'.repeat(MAX_EMAIL_LENGTH + 1), 'password1');
    expect(logInButton().props.accessibilityState.disabled).toBe(true);
  });

  it('ignores a return-key submit while the login form is incomplete', async () => {
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', '');

    await fireEvent(screen.getByLabelText(t('login.passwordLabel')), 'submitEditing');

    expect(mockAuthValue.login).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(t('login.submitBusy'))).toBeNull();
  });

  it('keeps the email return key harmless once the screen is gone', async () => {
    const view = await render(<LoginScreen />);
    const submitFromEmail = screen.getByLabelText(t('login.emailLabel')).props
      .onSubmitEditing as () => void;
    const focusSpy = spyOnTextInputFocus(screen.getByLabelText(t('login.passwordLabel')));
    await view.unmount();

    // The password ref is detached on unmount, so chaining must not reach it.
    expect(submitFromEmail).not.toThrow();
    expect(focusSpy).not.toHaveBeenCalled();
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
      // Show turns secureTextEntry off, so the keyboard defaults apply to a
      // revealed password unless both of these are pinned.
      autoCapitalize: 'none',
      autoComplete: 'password',
      autoCorrect: false,
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
    expect(flattenedStyle(banner)).toEqual({
      marginTop: spacing.lg,
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: radii.input,
      padding: spacing.md,
      color: colors.primaryDark,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    });
    expect(mockedConsumeSessionExpiredNotice).toHaveBeenCalledTimes(1);
  });

  it('shows the password-reset success banner after the reset redirect', async () => {
    mockSearchParams = { notice: 'reset' };
    await render(<LoginScreen />);

    const banner = screen.getByText(t('reset.doneBanner'));
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(banner)).toEqual({
      marginTop: spacing.lg,
      backgroundColor: colors.successLight,
      borderColor: colors.success,
      borderWidth: 1,
      borderRadius: radii.input,
      padding: spacing.md,
      color: colors.success,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    });
    expect(screen.queryByText(t('auth.sessionExpired'))).toBeNull();
  });

  it('shows no signed-out banner without a stored notice', async () => {
    await render(<LoginScreen />);

    expect(mockedConsumeSessionExpiredNotice).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('auth.sessionExpired'))).toBeNull();
  });

  it('rejects passwords over the UTF-8 byte limit client-side', async () => {
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'a'.repeat(73));
    const fieldError = screen.getByText(t('password.tooLong'));
    expect(fieldError.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenedStyle(fieldError)).toEqual({
      marginTop: 6,
      color: colors.danger,
      fontSize: 13,
    });
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

  it('locks native exits and Links while login is pending, then unlocks for a retry', async () => {
    const firstLogin = deferred<User>();
    const login = jest.fn().mockReturnValueOnce(firstLogin.promise).mockResolvedValueOnce(USER);
    mockAuthValue.login = login;
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    const submit = committedPressHandler(logInButton());
    const forgotBeforeBusy = screen.getByRole('link', { name: t('login.forgot') });
    const openForgot = committedPressHandler(forgotBeforeBusy);
    let preventedBack!: jest.Mock;
    let resetRemoval!: jest.Mock;
    mockSetOptions.mockClear();

    await act(async () => {
      void submit();
      openForgot();
      preventedBack = dispatchBeforeRemove('GO_BACK');
      resetRemoval = dispatchBeforeRemove('RESET');
      expect(hardwareBackIsHandled()).toBe(true);
      await Promise.resolve();
    });

    expect(preventedBack).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledTimes(1);
    expect(resetRemoval).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(LOCKED_NAVIGATION_OPTIONS);
    const forgot = screen.getByRole('link', { name: t('login.forgot') });
    const signup = screen.getByRole('link', { name: t('login.footerLink') });
    expect(forgot.props.accessibilityState).toMatchObject({ disabled: true });
    expect(signup.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(forgot);
    await fireEvent.press(signup);
    expect(mockLinkNavigate).not.toHaveBeenCalled();

    await act(async () => {
      firstLogin.reject(new Error('offline'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText(t('login.failed'))).toBeTruthy();
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(UNLOCKED_NAVIGATION_OPTIONS);

    await fireEvent.press(logInButton());
    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it.each(['success', 'failure'] as const)(
    'publishes no login %s continuation after external unmount',
    async (outcome) => {
      const loginRequest = deferred<User>();
      mockAuthValue.login = jest.fn(() => loginRequest.promise);
      const view = await render(<LoginScreen />);
      await fillLogin('ada@example.com', 'password1');
      const submit = committedPressHandler(logInButton());
      await act(async () => {
        void submit();
        await Promise.resolve();
      });
      expect(mockAuthValue.login).toHaveBeenCalledTimes(1);

      await view.unmount();
      mockSetOptions.mockClear();
      mockRouter.replace.mockClear();
      await act(async () => {
        if (outcome === 'success') loginRequest.resolve(USER);
        else loginRequest.reject(new Error('late failure'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    },
  );

  it('submits login once for two same-render activations', async () => {
    const login = deferred<User>();
    mockAuthValue.login = jest.fn(() => login.promise);
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    const press = committedPressHandler(logInButton());
    await act(async () => {
      void press();
      void press();
    });
    expect(mockAuthValue.login).toHaveBeenCalledTimes(1);

    await act(async () => {
      login.resolve(USER);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.login = jest.fn().mockRejectedValue(new ApiError(401, 'unauthorized'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());

    const alert = await screen.findByText(t('error.wrongCredentials'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(alert)).toEqual({
      marginTop: 14,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    });
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

/**
 * Reports the provider's language from outside the signup route, so a preview
 * that outlives the screen is observable the way login and the reset flow see
 * it.
 */
function LanguageProbe() {
  const { language } = useI18n();
  return <Text testID="provider-language">{language}</Text>;
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
    expect(screen.getByText(t('signup.nameLabel'))).toBeTruthy();
    expect(screen.getByLabelText(t('signup.nameLabel')).props.value).toBe('');
    expect(screen.getByText(t('login.emailLabel'))).toBeTruthy();
    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('');
    expect(screen.getByText(t('login.passwordLabel'))).toBeTruthy();
    expect(screen.getByLabelText(t('login.passwordLabel')).props.value).toBe('');
    expect(screen.getByText(t('signup.languageLabel'))).toBeTruthy();
    expect(screen.queryByText(t('password.tooShort'))).toBeNull();
    expect(screen.getByText(t('signup.footerPrompt'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t('signup.footerLink') }).props.href).toBe('/login');
  });

  it('lays out the signup screen on the shared token scale', async () => {
    await render(<SignupScreen />);

    expect(flattenedStyle(screen.getByTestId('keyboard-avoiding-view'))).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.xl,
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(screen.getByRole('header', { name: t('signup.title') }))).toEqual({
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('signup.subtitle')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });

    const nameLabel = screen.getByText(t('signup.nameLabel'));
    expect(flattenedStyle(parentOf(nameLabel))).toEqual({
      marginTop: 28,
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    });
    expect(flattenedStyle(nameLabel)).toEqual({
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
      marginTop: spacing.md,
    });
  });

  it('overlays the password reveal control inside the signup password field', async () => {
    await render(<SignupScreen />);
    const passwordInput = screen.getByLabelText(t('login.passwordLabel'));

    expect(flattenedStyle(parentOf(passwordInput))).toEqual({
      position: 'relative',
      justifyContent: 'center',
    });
    // The field reserves room on the right so the text never runs under Show.
    expect(flattenedStyle(passwordInput)).toEqual({
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radii.input,
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      paddingRight: 64,
    });
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.showPassword') }))).toEqual({
      position: 'absolute',
      right: 4,
      minHeight: layout.minimumTarget,
      minWidth: layout.minimumTarget,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
    });
    expect(flattenedStyle(screen.getByText(t('common.show')))).toEqual({
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    });
  });

  it('wraps the language chips in a row and spaces the submit and login footer', async () => {
    await render(<SignupScreen />);

    expect(flattenedStyle(parentOf(screen.getByLabelText('Telugu, తెలుగు')))).toEqual({
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    });
    expect(flattenedStyle(signUpButton())).toMatchObject({ marginTop: spacing.lg });

    const footerText = screen.getByText(t('signup.footerPrompt'));
    expect(flattenedStyle(parentOf(footerText))).toEqual({
      marginTop: spacing.xl,
      minHeight: layout.minimumTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(flattenedStyle(footerText)).toEqual({ fontSize: 15, color: colors.muted });
    expect(flattenedStyle(screen.getByRole('link', { name: t('signup.footerLink') }))).toEqual({
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
    });
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
      // The chip fill is the card it sits on, so the resting boundary must be
      // the form-field token, not the decorative hairline.
      borderColor: colors.inputBorder,
      flexBasis: '47%',
    });
    expect(flattenedStyle(textNode(telugu, 'తెలుగు'))).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(textNode(telugu, 'Telugu'))).toEqual({
      marginTop: 2,
      fontSize: 13,
      color: colors.muted,
    });

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

  it('drops the previewed language once the signup screen is left', async () => {
    const view = await render(
      <I18nProvider userLanguage={null}>
        <SignupScreen />
        <LanguageProbe />
      </I18nProvider>,
    );

    // The preview is provider-wide while signup is on screen.
    await fireEvent.press(screen.getByLabelText('Chinese (Simplified), 简体中文'));
    expect(screen.getByTestId('provider-language')).toHaveTextContent('zh');

    // Leaving signup must not strand login, the reset flow, and event-time copy
    // in a language the user only sampled: no signed-out screen offers a chip
    // back to English.
    await view.rerender(
      <I18nProvider userLanguage={null}>
        <LanguageProbe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('provider-language')).toHaveTextContent('en');
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

    // Both limits are measured after trimming, so padded exact-limit values pass.
    await fillSignup(
      `  ${'n'.repeat(MAX_NAME_LENGTH)}  `,
      `  ${'e'.repeat(MAX_EMAIL_LENGTH)}  `,
      'password1',
      'te',
    );
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
      // The registered password must be exactly what was typed: with Show on,
      // the keyboard would otherwise capitalize and autocorrect it.
      autoCapitalize: 'none',
      autoComplete: 'new-password',
      autoCorrect: false,
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

  it('ignores a return-key submit until the form and a language are complete', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');

    // Every field is filled, but no language has been chosen yet.
    await fireEvent(screen.getByLabelText(t('login.passwordLabel')), 'submitEditing');
    expect(mockAuthValue.register).not.toHaveBeenCalled();

    // A chosen language alone is not enough once the name is blanked out.
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.changeText(
      screen.getByPlaceholderText(translateFor('te', 'signup.namePlaceholder')),
      '   ',
    );
    await fireEvent(
      screen.getByLabelText(translateFor('te', 'login.passwordLabel')),
      'submitEditing',
    );

    expect(mockAuthValue.register).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(translateFor('te', 'signup.submitBusy'))).toBeNull();
  });

  it('keeps the name and email return keys harmless once the screen is gone', async () => {
    const view = await render(<SignupScreen />);
    const submitFromName = screen.getByLabelText(t('signup.nameLabel')).props
      .onSubmitEditing as () => void;
    const submitFromEmail = screen.getByLabelText(t('login.emailLabel')).props
      .onSubmitEditing as () => void;
    const emailFocus = spyOnTextInputFocus(screen.getByLabelText(t('login.emailLabel')));
    const passwordFocus = spyOnTextInputFocus(screen.getByLabelText(t('login.passwordLabel')));
    await view.unmount();

    // Both refs are detached on unmount, so neither chain may reach through.
    expect(submitFromName).not.toThrow();
    expect(submitFromEmail).not.toThrow();
    expect(emailFocus).not.toHaveBeenCalled();
    expect(passwordFocus).not.toHaveBeenCalled();
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

    expect(screen.getByText(t('common.show'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByText(t('common.hide'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getByText(t('common.show'))).toBeTruthy();
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
    const fieldError = screen.getByText(t('password.tooShort'));
    expect(fieldError.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenedStyle(fieldError)).toEqual({
      marginTop: 6,
      color: colors.danger,
      fontSize: 13,
    });
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

  it('locks native exits and the login Link while registration is pending, then retries', async () => {
    const firstRegistration = deferred<User>();
    const register = jest
      .fn()
      .mockReturnValueOnce(firstRegistration.promise)
      .mockResolvedValueOnce(USER);
    mockAuthValue.register = register;
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    const submit = committedPressHandler(signUpButton('te'));
    const loginBeforeBusy = screen.getByRole('link', {
      name: translateFor('te', 'signup.footerLink'),
    });
    const openLogin = committedPressHandler(loginBeforeBusy);
    let preventedBack!: jest.Mock;
    let resetRemoval!: jest.Mock;
    mockSetOptions.mockClear();

    await act(async () => {
      void submit();
      openLogin();
      preventedBack = dispatchBeforeRemove('GO_BACK');
      resetRemoval = dispatchBeforeRemove('RESET');
      expect(hardwareBackIsHandled()).toBe(true);
      await Promise.resolve();
    });

    expect(preventedBack).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledTimes(1);
    expect(resetRemoval).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(LOCKED_NAVIGATION_OPTIONS);
    const loginLink = screen.getByRole('link', {
      name: translateFor('te', 'signup.footerLink'),
    });
    expect(loginLink.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(loginLink);
    expect(mockLinkNavigate).not.toHaveBeenCalled();

    await act(async () => {
      firstRegistration.reject(new Error('offline'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText(translateFor('te', 'signup.failed'))).toBeTruthy();
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(UNLOCKED_NAVIGATION_OPTIONS);

    await fireEvent.press(signUpButton('te'));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it.each(['success', 'failure'] as const)(
    'publishes no registration %s continuation after external unmount',
    async (outcome) => {
      const registration = deferred<User>();
      mockAuthValue.register = jest.fn(() => registration.promise);
      const view = await render(<SignupScreen />);
      await fillSignup('Ada', 'ada@example.com', 'password1');
      await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
      const submit = committedPressHandler(signUpButton('te'));
      await act(async () => {
        void submit();
        await Promise.resolve();
      });
      expect(mockAuthValue.register).toHaveBeenCalledTimes(1);

      await view.unmount();
      mockSetOptions.mockClear();
      mockRouter.replace.mockClear();
      await act(async () => {
        if (outcome === 'success') registration.resolve(USER);
        else registration.reject(new Error('late failure'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    },
  );

  it('submits registration once for two same-render activations', async () => {
    const registration = deferred<User>();
    mockAuthValue.register = jest.fn(() => registration.promise);
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    const press = committedPressHandler(signUpButton('te'));
    await act(async () => {
      void press();
      void press();
    });
    expect(mockAuthValue.register).toHaveBeenCalledTimes(1);

    await act(async () => {
      registration.resolve(USER);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('shows a duplicate-account error on 409', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(409, 'exists'));
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    // The screen translator follows the previewed language.
    const alert = await screen.findByText(translateFor('te', 'error.emailTaken'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(alert)).toEqual({
      marginTop: 14,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    });
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
