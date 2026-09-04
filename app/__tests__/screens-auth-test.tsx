import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import LoginScreen from '../src/app/(auth)/login';
import SignupScreen from '../src/app/(auth)/signup';
import { ApiError } from '../src/lib/api';
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_UTF8_BYTES,
  RegistrationCompletedLoginRequiredError,
  emailAddressError,
  isValidEmailAddress,
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
import { colors, layout, radii, spacing, type as typeScale } from '../src/lib/theme';
import type { User } from '../src/lib/types';

// No I18nProvider is mounted in these tests, so screens render in English
// unless the signup live preview switches them; expectations always go
// through the typed catalog.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const MAX_LENGTH_EMAIL = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;

describe('email validation parity with the API', () => {
  it.each([
    'ada@example.c',
    'ada@example.12',
    'ada@example.c1',
    'ada@example.c-m',
    'learner%tag@example.com',
    'learner!tag@example.com',
    'learner/example@example.com',
    '.learner@example.com',
    'learner..name@example.com',
  ])('rejects the server-invalid final domain in %s', (email) => {
    expect(isValidEmailAddress(email)).toBe(false);
  });

  it.each([
    'ada@example.co',
    'ada@learn.example.org',
    'student+practice@example.museum',
    'learner@domain-.com',
    "learner'name@example.com",
    'LEARNER_NAME@EXAMPLE.COM',
    ' learner@example.com ',
  ])('accepts the server-valid address %s', (email) => {
    expect(isValidEmailAddress(email)).toBe(true);
  });
});

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
const mockSetGuestLanguage = jest.fn();
let mockGuestLanguageState: {
  language: 'en' | 'te' | 'hi' | 'es' | 'zh';
  persistenceError: string | null;
} = { language: 'en', persistenceError: null };

jest.mock('../src/lib/guest-language', () => ({
  useGuestLanguage: () => ({
    language: mockGuestLanguageState.language,
    isRestoring: false,
    persistenceError: mockGuestLanguageState.persistenceError,
    setLanguage: mockSetGuestLanguage,
    mirrorAccountLanguage: jest.fn(),
  }),
}));

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
let mockNavigation: { setOptions: jest.Mock; addListener: jest.Mock } = {
  setOptions: mockSetOptions,
  addListener: mockAddNavigationListener,
};
let mockHardwareBackHandler: (() => boolean) | null = null;

jest.mock('../src/lib/use-hardware-back', () => ({
  useHardwareBack: (handler: () => boolean) => {
    mockHardwareBackHandler = handler;
  },
}));

let mockSearchParams: Record<string, string | string[] | undefined> = {};

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      navigate: jest.fn(),
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
  };
});

// ----- auth mock -----

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
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
  navigate: jest.Mock;
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

type BeforeRemoveListener = NonNullable<typeof mockBeforeRemoveListener>;

function navigationHarness() {
  let listener: BeforeRemoveListener | null = null;
  const remove = jest.fn();
  const addListener = jest.fn((event: string, next: BeforeRemoveListener) => {
    if (event === 'beforeRemove') listener = next;
    return remove;
  });
  return {
    navigation: { setOptions: jest.fn(), addListener },
    addListener,
    remove,
    listener: () => listener,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = {};
  mockBeforeRemoveListener = null;
  mockHardwareBackHandler = null;
  mockNavigation = {
    setOptions: mockSetOptions,
    addListener: mockAddNavigationListener,
  };
  mockAuthValue = makeAuth();
  mockGuestLanguageState = { language: 'en', persistenceError: null };
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
  let handler: (() => unknown) | undefined;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      handler = fiber.memoizedProps.onPress as () => unknown;
      break;
    }
    fiber = fiber.return;
  }
  // Assert instead of throwing raw: a missing handler is the observable
  // behavior under a wiring mutant and must fail as a kill, never an error.
  expect(handler).toBeInstanceOf(Function);
  return handler as () => unknown;
}

function textNode(node: TestInstance, text: string): TestInstance {
  const match = node.queryAll((candidate) => candidate.children.includes(text))[0];
  if (!match) throw new Error(`Text "${text}" not found inside rendered control`);
  return match;
}

/**
 * Renders fallback copy when a child render throws. The signup screen's
 * language grid calls its required accessibilityLabelFor prop at render time,
 * so a wiring mutant that drops that attribute would crash the reconciler and
 * fail every owning test with a raw TypeError (classified Error, not a kill).
 * The boundary swaps the crash for fallback copy, so those tests fail on
 * Testing Library query evidence — no screen content can be found — instead.
 */
class RenderCrashBoundary extends React.Component<
  { children: React.ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  render() {
    if (this.state.crashed) {
      return <Text testID="render-crash-fallback">render crashed</Text>;
    }
    return this.props.children;
  }
}

/** The signup screen mounted behind the render-crash boundary. */
function CrashBoundedSignupScreen() {
  return (
    <RenderCrashBoundary>
      <SignupScreen />
    </RenderCrashBoundary>
  );
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
    expect(screen.getByRole('link', { name: t('login.forgot') })).toBeTruthy();
    expect(screen.getByRole('link', { name: t('login.footerLink') })).toBeTruthy();
    for (const language of ['en', 'te', 'hi', 'es', 'zh']) {
      expect(screen.getByTestId(`ui-language-${language}`).props.accessibilityRole).toBe('radio');
    }
  });

  it('navigates to forgot-password once per tap burst', async () => {
    await render(<LoginScreen />);

    const forgot = screen.getByRole('link', { name: t('login.forgot') });
    await fireEvent.press(forgot);
    // The once-per-focus latch swallows the impatient second tap.
    await fireEvent.press(forgot);

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('navigates to the signup screen from the footer link', async () => {
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByRole('link', { name: t('login.footerLink') }));

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/signup');
  });

  it('reveals the email error when the blocked submit wrapper is pressed', async () => {
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    const submit = screen.getByRole('button', { name: t('login.submit') });
    expect(submit.props.accessibilityState.disabled).toBe(true);
    // The wrapper around the disabled Button is deliberately not an
    // accessibility element: its tap is pure validation feedback, so the
    // screen-reader focus stays on the disabled submit it explains.
    expect(parentOf(submit).props.accessible).toBe(false);
    // The accessible={false} wrapper around the disabled Button receives the
    // tap and marks the email field touched, so the blocked submit explains
    // itself instead of failing silently.
    await fireEvent.press(parentOf(submit));
    expect(screen.getByText(t('email.invalid'))).toBeTruthy();
  });

  it('sends an app-language choice to the guest-language preference', async () => {
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByTestId('ui-language-es'));

    expect(mockSetGuestLanguage).toHaveBeenCalledTimes(1);
    expect(mockSetGuestLanguage).toHaveBeenCalledWith('es');
  });

  it('resubscribes the login removal guard when navigation identity changes', async () => {
    const first = navigationHarness();
    mockNavigation = first.navigation;
    const rendered = await render(<LoginScreen />);
    expect(first.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));

    const second = navigationHarness();
    mockNavigation = second.navigation;
    await rendered.rerender(<LoginScreen />);

    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(second.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
    expect(second.listener()).toEqual(expect.any(Function));
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
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(screen.getByRole('header', { name: t('login.title') }))).toEqual({
      fontSize: typeScale.titleLg.fontSize,
      lineHeight: typeScale.titleLg.lineHeight,
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
      marginTop: spacing.xl,
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
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    });
  });

  it('lays the reveal control beside a flexible password field', async () => {
    await render(<LoginScreen />);
    const passwordInput = screen.getByLabelText(t('login.passwordLabel'));

    expect(flattenedStyle(parentOf(passwordInput))).toEqual({
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    });
    // The input owns the remaining row width instead of reserving a fixed
    // English-sized gutter that translated reveal labels can overlap.
    expect(flattenedStyle(passwordInput)).toEqual({
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radii.input,
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      flex: 1,
      minWidth: 0,
    });
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.showPassword') }))).toEqual({
      width: layout.minimumTarget,
      height: layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it.each(['te', 'es'] as const)(
    'keeps the %s reveal label and auth footer responsive',
    async (language) => {
      const localT = (key: MessageKey) => translateFor(language, key);
      await render(
        <I18nProvider accountLanguage={language}>
          <LoginScreen />
        </I18nProvider>,
      );

      const passwordInput = screen.getByLabelText(localT('login.passwordLabel'));
      const reveal = screen.getByRole('button', { name: localT('common.showPassword') });
      expect(flattenedStyle(passwordInput)).toMatchObject({ flex: 1, minWidth: 0 });
      expect(flattenedStyle(reveal)).toMatchObject({
        width: layout.minimumTarget,
        height: layout.minimumTarget,
      });
      expect(
        flattenedStyle(parentOf(screen.getByText(localT('login.footerPrompt')))),
      ).toMatchObject({ flexWrap: 'wrap' });
    },
  );

  it('spaces the submit button, forgot link, and signup footer', async () => {
    await render(<LoginScreen />);

    expect(flattenedStyle(logInButton())).toMatchObject({ marginTop: spacing.lg });
    const forgotLink = screen.getByRole('link', { name: t('login.forgot') });
    expect(flattenedStyle(forgotLink)).toEqual({
      marginTop: spacing.ml,
      minHeight: layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    });
    expect(flattenedStyle(textNode(forgotLink, t('login.forgot')))).toEqual({
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
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(flattenedStyle(footerText)).toEqual({
      flexShrink: 1,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });
    const footerLink = screen.getByRole('link', { name: t('login.footerLink') });
    expect(flattenedStyle(footerLink)).toEqual({
      flexShrink: 1,
      minHeight: layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    });
    expect(flattenedStyle(textNode(footerLink, t('login.footerLink')))).toEqual({
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
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

  it('rejects a malformed email locally before login', async () => {
    await render(<LoginScreen />);
    await fillLogin('not-an-email', 'password1');

    // The inline error waits for the learner to leave the field; the submit
    // gate still blocks live.
    expect(screen.queryByText(t('email.invalid'))).toBeNull();
    expect(logInButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent(screen.getByPlaceholderText(t('login.emailPlaceholder')), 'blur');
    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(logInButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(logInButton());
    expect(mockAuthValue.login).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only and oversized email values while accepting the exact limit', async () => {
    await render(<LoginScreen />);

    await fillLogin('   ', 'password1');
    expect(logInButton().props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });

    await fillLogin(MAX_LENGTH_EMAIL, 'password1');
    expect(logInButton().props.accessibilityState.disabled).toBe(false);

    // Surrounding whitespace is trimmed before the limit is measured, so a
    // padded address that fits exactly still submits.
    await fillLogin(`  ${MAX_LENGTH_EMAIL}  `, 'password1');
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

  it('changes only the focused field border color so focus does not move the form', async () => {
    await render(<LoginScreen />);
    const emailInput = () => screen.getByLabelText(t('login.emailLabel'));
    const passwordInput = () => screen.getByLabelText(t('login.passwordLabel'));

    expect(flattenedStyle(emailInput())).toMatchObject({
      borderWidth: 1,
      borderColor: colors.inputBorder,
    });

    await fireEvent(emailInput(), 'focus');
    expect(flattenedStyle(emailInput())).toMatchObject({
      borderWidth: 1,
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
      borderWidth: 1,
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
    // The icon flips to the eye-off glyph while the secret is revealed.
    expect(screen.getByTestId('password-toggle-hide')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getByTestId('password-toggle-show')).toBeTruthy();
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

  it('explains a committed registration that needs a fresh login', async () => {
    mockSearchParams = { notice: 'registered' };
    await render(<LoginScreen />);

    expect(screen.getByText(t('signup.createdLoginBanner')).props.accessibilityRole).toBe('alert');
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
      marginTop: spacing.sm,
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

  it('preserves an opaque legacy password even when it fails the new-password policy', async () => {
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', ' old ');

    expect(logInButton().props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(logInButton());

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.login).toHaveBeenCalledWith('ada@example.com', ' old ');
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
      expect(screen.getByLabelText(t('login.emailLabel')).props.editable).toBe(false);
      expect(screen.getByLabelText(t('login.passwordLabel')).props.editable).toBe(false);
      const passwordToggle = screen.getByRole('button', { name: t('common.showPassword') });
      expect(passwordToggle.props.accessibilityState).toEqual({ disabled: true });
      await fireEvent.press(passwordToggle);
      expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);
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
    expect(mockRouter.navigate).not.toHaveBeenCalled();

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
      marginTop: spacing.md,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('clears a stale credential error when either credential changes', async () => {
    mockAuthValue.login = jest.fn().mockRejectedValue(new ApiError(401, 'unauthorized'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());
    expect(await screen.findByText(t('error.wrongCredentials'))).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'new@example.com');
    expect(screen.queryByText(t('error.wrongCredentials'))).toBeNull();

    await fireEvent.press(logInButton());
    expect(await screen.findByText(t('error.wrongCredentials'))).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(t('login.passwordLabel')), 'password2');
    expect(screen.queryByText(t('error.wrongCredentials'))).toBeNull();
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

// Learning-language chips never relocalize signed-out UI; the optional
// argument remains so ownership/race tests can keep their concise call shape.
async function fillSignup(name: string, email: string, password: string, _lang: UiLanguage = 'en') {
  await fireEvent.changeText(
    screen.getByPlaceholderText(translateFor('en', 'signup.namePlaceholder')),
    name,
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText(translateFor('en', 'login.emailPlaceholder')),
    email,
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText(translateFor('en', 'signup.passwordPlaceholder')),
    password,
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText(translateFor('en', 'password.confirmPlaceholder')),
    password,
  );
}

function signUpButton(_lang: UiLanguage = 'en') {
  return screen.getByRole('button', { name: translateFor('en', 'signup.submit') });
}

/**
 * Reports the provider language outside signup so chip presses cannot hide a
 * signed-out relocalization side effect.
 */
function LanguageProbe() {
  const { language } = useI18n();
  return <Text testID="provider-language">{language}</Text>;
}

describe('signup screen', () => {
  it('navigates to login once per tap burst', async () => {
    await render(<CrashBoundedSignupScreen />);

    const login = screen.getByRole('link', { name: t('signup.footerLink') });
    await fireEvent.press(login);
    // The once-per-focus latch swallows the impatient second tap.
    await fireEvent.press(login);

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/login');
  });

  it('reveals the email and name errors when the blocked submit wrapper is pressed', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    // A control character in the name is the only authored name complaint;
    // an empty name stays silent, so the reveal needs a polluted value.
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'bad\u0007name');
    const submit = screen.getByRole('button', { name: t('signup.submit') });
    expect(submit.props.accessibilityState.disabled).toBe(true);
    // The wrapper around the disabled Button is deliberately not an
    // accessibility element: its tap is pure validation feedback, so the
    // screen-reader focus stays on the disabled submit it explains.
    expect(parentOf(submit).props.accessible).toBe(false);
    // The accessible={false} wrapper around the disabled Button receives the
    // tap and marks both fields touched, so the blocked submit explains
    // itself instead of failing silently.
    await fireEvent.press(parentOf(submit));
    expect(screen.getByText(t('email.invalid'))).toBeTruthy();
    expect(screen.getByText(t('name.invalid'))).toBeTruthy();
  });

  it('links to the public Privacy Policy and Terms of Use before account creation', async () => {
    const first = await render(<CrashBoundedSignupScreen />);

    await fireEvent.press(screen.getByRole('link', { name: t('header.privacy') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings/privacy');
    // One navigation per focus: a rapid second exit must not stack another
    // route behind the first while the screen is still interactive.
    await fireEvent.press(screen.getByRole('link', { name: t('header.terms') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    await first.unmount();

    await render(<CrashBoundedSignupScreen />);
    await fireEvent.press(screen.getByRole('link', { name: t('header.terms') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenLastCalledWith('/settings/terms');
  });

  it('resubscribes the signup removal guard when navigation identity changes', async () => {
    const first = navigationHarness();
    mockNavigation = first.navigation;
    const rendered = await render(<CrashBoundedSignupScreen />);
    expect(first.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));

    const second = navigationHarness();
    mockNavigation = second.navigation;
    await rendered.rerender(<CrashBoundedSignupScreen />);

    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(second.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
    expect(second.listener()).toEqual(expect.any(Function));
  });

  it('renders all fields and language choices', async () => {
    await render(<CrashBoundedSignupScreen />);
    expect(screen.getByText(t('signup.title'))).toBeTruthy();
    expect(screen.getByText(t('signup.subtitle'))).toBeTruthy();
    expect(screen.getByLabelText('Telugu, తెలుగు')).toBeTruthy();
    expect(screen.getByLabelText('Hindi, हिन्दी')).toBeTruthy();
    expect(screen.getByLabelText('Spanish, Español')).toBeTruthy();
    expect(screen.getByLabelText('Chinese, 简体中文')).toBeTruthy();
    expect(screen.getByText(t('signup.nameLabel'))).toBeTruthy();
    expect(screen.getByLabelText(t('signup.nameLabel')).props.value).toBe('');
    expect(screen.getByText(t('login.emailLabel'))).toBeTruthy();
    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('');
    expect(screen.getByText(t('login.passwordLabel'))).toBeTruthy();
    expect(screen.getByLabelText(t('login.passwordLabel')).props.value).toBe('');
    expect(screen.getByText(t('signup.languageLabel'))).toBeTruthy();
    expect(screen.getByText(t('signup.languageHelp'))).toBeTruthy();
    expect(screen.queryByText(t('password.tooShort'))).toBeNull();
    expect(screen.getByText(t('signup.footerPrompt'))).toBeTruthy();
    expect(screen.getByRole('link', { name: t('signup.footerLink') })).toBeTruthy();
    expect(screen.getByRole('link', { name: t('header.privacy') })).toBeTruthy();
    expect(screen.getByRole('link', { name: t('header.terms') })).toBeTruthy();
    for (const language of ['en', 'te', 'hi', 'es', 'zh']) {
      expect(screen.getByTestId(`ui-language-${language}`).props.accessibilityRole).toBe('radio');
    }
  });

  it('sends an app-language choice to the guest-language preference', async () => {
    await render(<CrashBoundedSignupScreen />);

    await fireEvent.press(screen.getByTestId('ui-language-hi'));

    expect(mockSetGuestLanguage).toHaveBeenCalledTimes(1);
    expect(mockSetGuestLanguage).toHaveBeenCalledWith('hi');
  });

  it('lays out the signup screen on the shared token scale', async () => {
    await render(<CrashBoundedSignupScreen />);

    expect(flattenedStyle(screen.getByTestId('keyboard-avoiding-view'))).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      justifyContent: 'center',
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(screen.getByRole('header', { name: t('signup.title') }))).toEqual({
      fontSize: typeScale.titleLg.fontSize,
      lineHeight: typeScale.titleLg.lineHeight,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('signup.subtitle')))).toEqual({
      marginTop: spacing.sm,
      fontSize: typeScale.body.fontSize,
      lineHeight: typeScale.body.lineHeight,
      color: colors.muted,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('signup.languageHelp')))).toEqual({
      marginBottom: spacing.sm,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 18,
    });

    const nameLabel = screen.getByText(t('signup.nameLabel'));
    expect(flattenedStyle(parentOf(nameLabel))).toEqual({
      marginTop: spacing.xl,
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
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    });
  });

  it('lays the reveal control beside a flexible signup password field', async () => {
    await render(<CrashBoundedSignupScreen />);
    const passwordInput = screen.getByLabelText(t('login.passwordLabel'));

    expect(flattenedStyle(parentOf(passwordInput))).toEqual({
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    });
    expect(flattenedStyle(passwordInput)).toEqual({
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radii.input,
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      flex: 1,
      minWidth: 0,
    });
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.showPassword') }))).toEqual({
      width: layout.minimumTarget,
      height: layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('wraps the language chips in a row and spaces the submit and login footer', async () => {
    await render(<CrashBoundedSignupScreen />);

    expect(flattenedStyle(parentOf(screen.getByLabelText('Telugu, తెలుగు')))).toEqual({
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
    });
    expect(flattenedStyle(signUpButton())).toMatchObject({ marginTop: spacing.lg });

    const footerText = screen.getByText(t('signup.footerPrompt'));
    expect(flattenedStyle(parentOf(footerText))).toEqual({
      marginTop: spacing.xl,
      minHeight: layout.minimumTarget,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(flattenedStyle(footerText)).toEqual({
      flexShrink: 1,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });
    const footerLink = screen.getByRole('link', { name: t('signup.footerLink') });
    expect(flattenedStyle(footerLink)).toEqual({
      flexShrink: 1,
      minHeight: layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    });
    expect(flattenedStyle(textNode(footerLink, t('signup.footerLink')))).toEqual({
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    });
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ] as const)('uses the %s keyboard-avoidance behavior', async (os, expectedBehavior) => {
    await withPlatformOS(os, async () => {
      await render(<CrashBoundedSignupScreen />);

      expect(screen.getByTestId('keyboard-avoiding-view').props.behavior).toBe(expectedBehavior);
    });
  });

  it('requires every field plus a language before enabling Create account', async () => {
    await render(<CrashBoundedSignupScreen />);
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
    expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState.checked).toBe(true);
    await expectPressFeedback(
      () => signUpButton('te'),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('requires a matching password confirmation and a valid email', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'not-an-email', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    // The inline email error waits for blur (erroring mid-typing is a hostile
    // pattern); the submit gate still blocks live.
    expect(screen.queryByText(t('email.invalid'))).toBeNull();
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'blur');
    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await fireEvent.changeText(screen.getByLabelText(t('password.confirmLabel')), 'different1');
    expect(screen.queryByText(t('email.invalid'))).toBeNull();
    expect(screen.getByText(t('cp.mismatch')).props.accessibilityLiveRegion).toBe('polite');
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('keeps language selection mutually exclusive and exposed to accessibility', async () => {
    await render(<CrashBoundedSignupScreen />);
    const telugu = screen.getByLabelText('Telugu, తెలుగు');
    const spanish = screen.getByLabelText('Spanish, Español');

    expect(telugu.props.accessibilityRole).toBe('radio');
    expect(spanish.props.accessibilityRole).toBe('radio');
    expect(telugu.props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
      busy: false,
    });
    expect(spanish.props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
      busy: false,
    });
    // The single-choice control is grouped for screen readers (the picker at
    // the top of the form carries its own app-language radiogroup).
    const nativeLanguageGroups = screen.container
      .queryAll((node) => node.props.accessibilityRole === 'radiogroup')
      .filter((node) => node.props.accessibilityLabel === t('signup.languageLabel'));
    expect(nativeLanguageGroups).toHaveLength(1);
    expect(screen.queryByTestId('signup-language-check-te')).toBeNull();
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
      textAlign: 'center',
    });
    expect(flattenedStyle(textNode(telugu, 'Telugu'))).toEqual({
      marginTop: 2,
      fontSize: 13,
      color: colors.muted,
      lineHeight: 18,
      textAlign: 'center',
    });

    await fireEvent.press(telugu);
    const selectedTelugu = screen.getByLabelText('Telugu, తెలుగు');
    expect(selectedTelugu.props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
      busy: false,
    });
    const teluguCheck = screen.getByTestId('signup-language-check-te', {
      includeHiddenElements: true,
    });
    expect(teluguCheck).toHaveTextContent('✓');
    expect(teluguCheck.props.accessibilityElementsHidden).toBe(true);
    expect(teluguCheck.props.importantForAccessibility).toBe('no-hide-descendants');
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
      checked: false,
      disabled: false,
      busy: false,
    });

    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
      busy: false,
    });
    expect(screen.getByLabelText('Spanish, Español').props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
      busy: false,
    });
    expect(
      screen.queryByTestId('signup-language-check-te', { includeHiddenElements: true }),
    ).toBeNull();
    expect(
      screen.getByTestId('signup-language-check-es', { includeHiddenElements: true }),
    ).toHaveTextContent('✓');
  });

  it('keeps signed-out UI English when a learning language is selected', async () => {
    await render(
      <I18nProvider accountLanguage={null}>
        <CrashBoundedSignupScreen />
        <LanguageProbe />
      </I18nProvider>,
    );

    await fireEvent.press(screen.getByLabelText('Chinese, 简体中文'));
    expect(screen.getByTestId('provider-language')).toHaveTextContent('en');
    expect(screen.getByText(t('signup.title'))).toBeTruthy();
  });

  it('enforces trimmed name and email boundaries', async () => {
    await render(<CrashBoundedSignupScreen />);
    // The live preview renders the whole screen in Telugu after the chip press.
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    await fillSignup('   ', 'ada@example.com', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    await fillSignup('Ada', '   ', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);

    await fillSignup('n'.repeat(MAX_NAME_LENGTH), MAX_LENGTH_EMAIL, 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(false);

    // Both limits are measured after trimming, so padded exact-limit values pass.
    await fillSignup(
      `  ${'n'.repeat(MAX_NAME_LENGTH)}  `,
      `  ${MAX_LENGTH_EMAIL}  `,
      'password1',
      'te',
    );
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(false);

    await fillSignup('n'.repeat(MAX_NAME_LENGTH + 1), 'ada@example.com', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    await fillSignup('Ada', 'e'.repeat(MAX_EMAIL_LENGTH + 1), 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
  });

  it('measures the name limit in UTF-16 code units like the server contract', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    await fillSignup('😀'.repeat(50), 'ada@example.com', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(false);

    await fillSignup('😀'.repeat(51), 'ada@example.com', 'password1', 'te');
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
  });

  it('configures signup fields for identity entry and password privacy', async () => {
    await render(<CrashBoundedSignupScreen />);

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
      returnKeyType: 'next',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it('chains name to email to password confirmation and submits from confirmation', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    const emailFocus = spyOnTextInputFocus(screen.getByLabelText(t('login.emailLabel')));
    const passwordFocus = spyOnTextInputFocus(screen.getByLabelText(t('login.passwordLabel')));
    const confirmationFocus = spyOnTextInputFocus(
      screen.getByLabelText(t('password.confirmLabel')),
    );

    await fireEvent(screen.getByLabelText(t('signup.nameLabel')), 'submitEditing');
    expect(emailFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'submitEditing');
    expect(passwordFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('login.passwordLabel')), 'submitEditing');
    expect(confirmationFocus).toHaveBeenCalledTimes(1);
    await fireEvent(screen.getByLabelText(t('password.confirmLabel')), 'submitEditing');
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledWith(
      'Ada',
      'ada@example.com',
      'password1',
      'te',
      'en',
    );
  });

  it('ignores a return-key submit until the form and a language are complete', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');

    // Every field is filled, but no language has been chosen yet.
    await fireEvent(screen.getByLabelText(t('login.passwordLabel')), 'submitEditing');
    expect(mockAuthValue.register).not.toHaveBeenCalled();

    // A chosen language alone is not enough once the name is blanked out.
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.changeText(screen.getByPlaceholderText(t('signup.namePlaceholder')), '   ');
    await fireEvent(screen.getByLabelText(t('login.passwordLabel')), 'submitEditing');

    expect(mockAuthValue.register).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.queryByText(t('signup.submitBusy'))).toBeNull();
  });

  it('keeps the name and email return keys harmless once the screen is gone', async () => {
    const view = await render(<CrashBoundedSignupScreen />);
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

  it('changes only the focused signup border color so focus does not move the form', async () => {
    await render(<CrashBoundedSignupScreen />);

    for (const label of [
      t('signup.nameLabel'),
      t('login.emailLabel'),
      t('login.passwordLabel'),
      t('password.confirmLabel'),
    ]) {
      const input = () => screen.getByLabelText(label);
      expect(flattenedStyle(input())).toMatchObject({
        borderWidth: 1,
        borderColor: colors.inputBorder,
      });

      await fireEvent(input(), 'focus');
      expect(flattenedStyle(input())).toMatchObject({
        borderWidth: 1,
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
    await render(<CrashBoundedSignupScreen />);
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);

    expect(screen.getAllByTestId('password-toggle-show')).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByTestId('password-toggle-hide')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getAllByTestId('password-toggle-show')).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: t('password.showConfirmation') }));
    expect(screen.getByLabelText(t('password.confirmLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getAllByTestId('password-toggle-hide')).toHaveLength(1);
    expect(screen.getByRole('button', { name: t('password.hideConfirmation') })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('password.hideConfirmation') }));
    expect(screen.getByLabelText(t('password.confirmLabel')).props.secureTextEntry).toBe(true);
  });

  it('rejects names over the maximum length client-side', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('A'.repeat(101), 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('shows the length policy error for short passwords', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'abc1');
    const fieldError = screen.getByText(t('password.tooShort'));
    expect(fieldError.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenedStyle(fieldError)).toEqual({
      marginTop: spacing.sm,
      color: colors.danger,
      fontSize: 13,
    });
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects a control-character name locally before registration', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Priya\n', 'ada@example.com', 'password1');

    // The submit gate blocks live on the control-character name...
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
    // ...but the inline copy waits for blur (erroring mid-typing is hostile).
    expect(screen.queryByText(t('name.invalid'))).toBeNull();
    await fireEvent(screen.getByLabelText(t('signup.nameLabel')), 'blur');
    const fieldError = screen.getByText(t('name.invalid'));
    expect(fieldError.props.accessibilityLiveRegion).toBe('polite');
    await fireEvent.press(signUpButton());
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('shows the letter+number policy error for passwords without digits', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'abcdefgh');
    expect(screen.getByText(t('password.needsLetterAndNumber'))).toBeTruthy();
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects signup passwords over the shared UTF-8 byte limit', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', `a1${'é'.repeat(36)}`);
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    expect(screen.getByText(t('password.tooLong'))).toBeTruthy();
    expect(signUpButton('te').props.accessibilityState.disabled).toBe(true);
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('does not use a learning-language chip as the app language', async () => {
    await render(<CrashBoundedSignupScreen />);
    expect(screen.getByText(t('signup.title'))).toBeTruthy();
    expect(screen.getByText(t('signup.submit'))).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(screen.getByText(t('signup.title'))).toBeTruthy();
    expect(screen.getByText(t('signup.submit'))).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    expect(screen.getByText(t('signup.title'))).toBeTruthy();
    expect(screen.getByText(t('signup.submit'))).toBeTruthy();
  });

  it('keeps inline password-policy errors in signed-out English', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));

    await fireEvent.changeText(screen.getByPlaceholderText(t('signup.passwordPlaceholder')), 'ab1');
    expect(screen.getByText(t('password.tooShort'))).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    expect(screen.getByText(t('password.tooShort'))).toBeTruthy();
  });

  it('registers and navigates home on success', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('  Ada  ', '  ada@example.com ', 'password1');
    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    await fireEvent.press(signUpButton('es'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledWith(
      'Ada',
      'ada@example.com',
      'password1',
      'es',
      'en',
    );
  });

  it('preserves leading and trailing whitespace in a new password', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', ' Password1 ');
    await fireEvent.press(screen.getByLabelText('Spanish, Español'));
    await fireEvent.press(signUpButton('es'));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledWith(
      'Ada',
      'ada@example.com',
      ' Password1 ',
      'es',
      'en',
    );
  });

  it.each([
    ['Hindi, हिन्दी', 'hi'],
    ['Chinese, 简体中文', 'zh'],
  ] as const)('submits the exact server language code for %s', async (label, code) => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText(label));
    await fireEvent.press(signUpButton(code));

    await waitFor(() =>
      expect(mockAuthValue.register).toHaveBeenCalledWith(
        'Ada',
        'ada@example.com',
        'password1',
        code,
        'en',
      ),
    );
  });

  it('shows the busy state while registering', async () => {
    const registration = deferred<User>();
    mockAuthValue.register = jest.fn(() => registration.promise);
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(signUpButton('te'));

    try {
      const busyButton = await screen.findByRole('button', {
        name: t('signup.submitBusy'),
      });
      expect(busyButton.props.accessibilityState).toEqual({
        disabled: true,
        busy: true,
      });
      for (const label of [
        t('signup.nameLabel'),
        t('login.emailLabel'),
        t('login.passwordLabel'),
        t('password.confirmLabel'),
      ]) {
        expect(screen.getByLabelText(label).props.editable).toBe(false);
      }
      for (const label of [t('common.showPassword'), t('password.showConfirmation')]) {
        const toggle = screen.getByRole('button', { name: label });
        expect(toggle.props.accessibilityState).toEqual({ disabled: true });
        await fireEvent.press(toggle);
      }
      expect(screen.getByLabelText(t('login.passwordLabel')).props.secureTextEntry).toBe(true);
      expect(screen.getByLabelText(t('password.confirmLabel')).props.secureTextEntry).toBe(true);
      expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState).toEqual({
        checked: true,
        disabled: true,
        busy: false,
      });
      await fireEvent.press(screen.getByLabelText('Spanish, Español'));
      expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState.checked).toBe(true);
      expect(
        screen.getByRole('link', { name: t('header.privacy') }).props.accessibilityState,
      ).toEqual({ disabled: true });
      expect(
        screen.getByRole('link', { name: t('header.terms') }).props.accessibilityState,
      ).toEqual({
        disabled: true,
      });
      await fireEvent.press(screen.getByRole('link', { name: t('header.privacy') }));
      await fireEvent.press(screen.getByRole('link', { name: t('header.terms') }));
      expect(mockRouter.navigate).not.toHaveBeenCalled();
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
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    const submit = committedPressHandler(signUpButton('te'));
    const loginBeforeBusy = screen.getByRole('link', {
      name: t('signup.footerLink'),
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
      name: t('signup.footerLink'),
    });
    expect(loginLink.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(loginLink);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    await act(async () => {
      firstRegistration.reject(new Error('offline'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText(t('signup.failed'))).toBeTruthy();
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
      const view = await render(<CrashBoundedSignupScreen />);
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
    await render(<CrashBoundedSignupScreen />);
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
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    // The screen translator follows the previewed language.
    const alert = await screen.findByText(t('error.emailTaken'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(alert)).toEqual({
      marginTop: spacing.md,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it.each(['name', 'email', 'password', 'confirmation', 'language'] as const)(
    'clears a stale registration error when the %s value changes',
    async (field) => {
      mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(409, 'exists'));
      await render(<CrashBoundedSignupScreen />);
      await fillSignup('Ada', 'ada@example.com', 'password1');
      await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
      await fireEvent.press(signUpButton('te'));
      expect(await screen.findByText(t('error.emailTaken'))).toBeTruthy();

      if (field === 'name') {
        await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Grace');
      } else if (field === 'email') {
        await fireEvent.changeText(
          screen.getByLabelText(t('login.emailLabel')),
          'grace@example.com',
        );
      } else if (field === 'password') {
        await fireEvent.changeText(screen.getByLabelText(t('login.passwordLabel')), 'password2');
      } else if (field === 'confirmation') {
        await fireEvent.changeText(screen.getByLabelText(t('password.confirmLabel')), 'password2');
      } else {
        await fireEvent.press(screen.getByLabelText('Spanish, Español'));
      }

      expect(screen.queryByText(t('error.emailTaken'))).toBeNull();
    },
  );

  it('routes a committed registration persistence failure to login recovery', async () => {
    mockAuthValue.register = jest
      .fn()
      .mockRejectedValue(new RegistrationCompletedLoginRequiredError());
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton());

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'registered' },
      }),
    );
    expect(screen.queryByText(t('signup.failed'))).toBeNull();
  });

  it('maps a 429 through userMessageForError', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    // userMessageForError builds copy with the module-level translator, which
    // stays English here because no I18nProvider is mounted in these tests.
    expect(await screen.findByText(t('error.tooMany'))).toBeTruthy();
  });

  it('maps service failures to safe shared copy', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new ApiError(500, 'private detail'));
    await render(<CrashBoundedSignupScreen />);
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
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));

    // The fallback comes from the screen translator, so it is previewed Telugu.
    expect(await screen.findByText(t('signup.failed'))).toBeTruthy();
    expect(signUpButton('te').props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(signUpButton('te'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.register).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Deep mutation-hardening: form-gate conjunct boundaries, mismatch copy,
// email-touch wrappers, busy control styling, and login notice separation.
// ---------------------------------------------------------------------------

const AT_MAX_EMAIL = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;

describe('identity-validation boundaries', () => {
  it('accepts exactly the server length bound around the pinned pattern', () => {
    expect(AT_MAX_EMAIL).toHaveLength(MAX_EMAIL_LENGTH);
    expect(isValidEmailAddress(AT_MAX_EMAIL)).toBe(true);
    expect(isValidEmailAddress(`${AT_MAX_EMAIL}a`)).toBe(false);
    expect(isValidEmailAddress('')).toBe(false);
    // An over-length entry still reads as an invalid address to the field —
    // the shared length bound lives inside the validator.
    expect(emailAddressError(`${AT_MAX_EMAIL}a`, t)).toBe(t('email.invalid'));
    expect(emailAddressError('not-an-email', t)).toBe(t('email.invalid'));
    expect(emailAddressError('', t)).toBeNull();
  });
});

describe('login deep contracts', () => {
  it('shows only the registered-notice banner for that notice', async () => {
    mockSearchParams = { notice: 'registered' };
    await render(<LoginScreen />);
    expect(screen.getByText(t('signup.createdLoginBanner'))).toBeTruthy();
    expect(screen.queryByText(t('reset.doneBanner'))).toBeNull();
  });

  it('shows only the reset banner for the reset notice', async () => {
    mockSearchParams = { notice: 'reset' };
    await render(<LoginScreen />);
    expect(screen.getByText(t('reset.doneBanner'))).toBeTruthy();
    expect(screen.queryByText(t('signup.createdLoginBanner'))).toBeNull();
  });

  it('submits at exactly the maximum email length and blocks one past it', async () => {
    mockSearchParams = {};
    await render(<LoginScreen />);
    await fillLogin(AT_MAX_EMAIL, 'password1');
    await fireEvent.press(logInButton());
    expect(mockAuthValue.login).toHaveBeenCalledTimes(1);

    const { unmount } = await render(<LoginScreen />);
    await fillLogin(`${AT_MAX_EMAIL}a`, 'password1');
    await fireEvent.press(logInButton());
    expect(mockAuthValue.login).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe('signup deep contracts', () => {
  async function fillConfirm(value: string) {
    await fireEvent.changeText(
      screen.getByPlaceholderText(translateFor('en', 'password.confirmPlaceholder')),
      value,
    );
  }
  function signupButton() {
    return screen.getByRole('button', { name: translateFor('en', 'signup.submit') });
  }

  it('shows the mismatch copy only while a mismatched confirmation is present', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Priya', 'priya@example.com', 'password1');
    await fillConfirm('password2');
    expect(screen.getByText(translateFor('en', 'cp.mismatch'))).toBeTruthy();
    // An empty confirmation is not a mismatch — the required-field copy owns it.
    await fillConfirm('');
    expect(screen.queryByText(translateFor('en', 'cp.mismatch'))).toBeNull();
    await fillConfirm('password1');
    expect(screen.queryByText(translateFor('en', 'cp.mismatch'))).toBeNull();
  });

  it('blocks registration without a confirmation and past the email bound', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Priya', 'priya@example.com', 'password1');
    await fireEvent.press(signupButton());
    expect(mockAuthValue.register).not.toHaveBeenCalled();

    await fillSignup('Priya', `${AT_MAX_EMAIL}a`, 'password1');
    await fillConfirm('password1');
    await fireEvent.press(signupButton());
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('registers at exactly the maximum email length with a matching confirmation', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Priya', AT_MAX_EMAIL, 'password1');
    await fillConfirm('password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signupButton());
    await waitFor(() => expect(mockAuthValue.register).toHaveBeenCalledTimes(1));
  });

  it('keeps the confirmation field uncorrected and the CTA dimmed while busy', async () => {
    const gate = deferred<User>();
    mockAuthValue = makeAuth({ register: jest.fn(() => gate.promise) });
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Priya', 'priya@example.com', 'password1');
    await fillConfirm('password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    const confirmField = screen.getByPlaceholderText(
      translateFor('en', 'password.confirmPlaceholder'),
    );
    expect(confirmField.props.autoCorrect).toBe(false);
    const cta = signupButton();
    await fireEvent.press(cta);
    await waitFor(() => expect(mockAuthValue.register).toHaveBeenCalledTimes(1));
    expect(StyleSheet.flatten(cta.props.style)).toMatchObject({ opacity: 0.5 });
    gate.resolve(USER);
  });
});

// ---------------------------------------------------------------------------
// State/prop wiring pins: authored null initial states (vs any hostile
// boolean), stale-error clearing setters, and the chrome/field/child-component
// prop wiring the style-scale tests above do not reach.
// ---------------------------------------------------------------------------

/** The host ScrollView, which keeps contentContainerStyle as a prop. */
function scrollViewHost(): TestInstance {
  const [scrollView] = screen.container.queryAll((node) => node.type === 'RCTScrollView');
  if (!scrollView) throw new Error('No ScrollView rendered');
  return scrollView;
}

/** A rendered child test instance by position (screen-content order). */
function childInstance(node: TestInstance, index: number): TestInstance {
  const child = node.children[index];
  if (!child) throw new Error(`No child ${index} on the laid-out element`);
  return child as unknown as TestInstance;
}

type IconElementProps = { name?: string; size?: number; color?: string; strokeWidth?: number };

/** The authored Icon element inside a brand-mark host view. */
function brandIconElement(screenTitle: string): React.ReactElement<IconElementProps> {
  const header = screen.getByRole('header', { name: screenTitle });
  const brandMark = childInstance(parentOf(header), 0);
  const children = brandMark.props.children as
    React.ReactElement<IconElementProps> | React.ReactElement<IconElementProps>[];
  const icon = Array.isArray(children) ? children[0] : children;
  if (!icon) throw new Error('No icon element inside the brand mark');
  return icon;
}

const wiringFieldError: SemanticStyle = {
  marginTop: spacing.sm,
  color: colors.danger,
  fontSize: 13,
};

const wiringFormLabel: SemanticStyle = {
  fontSize: 14,
  fontWeight: '600',
  color: colors.text,
  marginBottom: spacing.sm,
  marginTop: spacing.md,
};

describe('login state wiring', () => {
  it('starts with no focused field and no summary alert', async () => {
    await render(<LoginScreen />);

    expect(screen.queryByRole('alert')).toBeNull();
    const passwordStyle = screen.getByLabelText(t('login.passwordLabel')).props.style as unknown[];
    // The style array itself must exist before its null focus slot is read, so
    // a removed style wiring dies on this matcher instead of a raw deref.
    expect(passwordStyle).toBeDefined();
    expect(passwordStyle[2]).toBeNull();
  });

  it('marks the email touched when a blocked return-key submit fires', async () => {
    await render(<LoginScreen />);
    await fillLogin('not-an-email', 'password1');

    await fireEvent(screen.getByLabelText(t('login.passwordLabel')), 'submitEditing');

    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(mockAuthValue.login).not.toHaveBeenCalled();
  });

  it('clears a stale credential error on a successful retry', async () => {
    mockAuthValue.login = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(401, 'unauthorized'))
      .mockResolvedValueOnce(USER);
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());
    expect(await screen.findByText(t('error.wrongCredentials'))).toBeTruthy();

    await fireEvent.press(logInButton());
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByText(t('error.wrongCredentials'))).toBeNull();
  });
});

describe('signup state wiring', () => {
  it('starts with an empty confirmation, no mismatch copy, no focus, and no alert', async () => {
    await render(<CrashBoundedSignupScreen />);

    expect(screen.getByLabelText(t('password.confirmLabel')).props.value).toBe('');
    expect(screen.queryByText(t('cp.mismatch'))).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    const passwordStyle = screen.getByLabelText(t('login.passwordLabel')).props.style as unknown[];
    // The style array itself must exist before its null focus slot is read, so
    // a removed style wiring dies on this matcher instead of a raw deref.
    expect(passwordStyle).toBeDefined();
    expect(passwordStyle[2]).toBeNull();
    const confirmStyle = screen.getByLabelText(t('password.confirmLabel')).props.style as unknown[];
    expect(confirmStyle).toBeDefined();
    expect(confirmStyle[2]).toBeNull();
  });

  it('marks the email and name touched when a blocked return-key submit fires', async () => {
    await render(<CrashBoundedSignupScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'bad\u0007name');
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');

    await fireEvent(screen.getByLabelText(t('password.confirmLabel')), 'submitEditing');

    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText(t('name.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(mockAuthValue.register).not.toHaveBeenCalled();
  });

  it('clears a stale registration error on a successful retry', async () => {
    mockAuthValue.register = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(409, 'exists'))
      .mockResolvedValueOnce(USER);
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));
    expect(await screen.findByText(t('error.emailTaken'))).toBeTruthy();

    await fireEvent.press(signUpButton('te'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(screen.queryByText(t('error.emailTaken'))).toBeNull();
  });
});

describe('signup prop wiring', () => {
  it('pins the screen chrome, brand badge, and brand icon ink', async () => {
    await render(<CrashBoundedSignupScreen />);

    expect(flattenedStyle(parentOf(screen.getByTestId('keyboard-avoiding-view')))).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    expect(scrollViewHost().props.keyboardShouldPersistTaps).toBe('handled');

    const header = screen.getByRole('header', { name: t('signup.title') });
    expect(flattenedStyle(childInstance(parentOf(header), 0))).toEqual({
      width: layout.brandMark,
      height: layout.brandMark,
      borderRadius: layout.brandMark / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      marginBottom: spacing.md,
      alignSelf: 'center',
    });
    expect(brandIconElement(t('signup.title')).props).toMatchObject({
      name: 'mic',
      size: 26,
      color: colors.primary,
      strokeWidth: 2.1,
    });
  });

  it('pins the app-language picker value, busy lock, and persistence error', async () => {
    await render(<CrashBoundedSignupScreen />);
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: false,
    });

    const registration = deferred<User>();
    mockAuthValue.register = jest.fn(() => registration.promise);
    await render(<CrashBoundedSignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton('te'));
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
    await act(async () => {
      registration.resolve(USER);
      await Promise.resolve();
      await Promise.resolve();
    });

    mockGuestLanguageState = { language: 'en', persistenceError: 'Secure storage unavailable' };
    await render(<CrashBoundedSignupScreen />);
    expect(screen.getByText('Secure storage unavailable').props.accessibilityRole).toBe('alert');
  });

  it('pins the field labels, confirm row, and confirm field configuration', async () => {
    await render(<CrashBoundedSignupScreen />);

    expect(flattenedStyle(screen.getByText(t('login.emailLabel')))).toEqual(wiringFormLabel);
    expect(flattenedStyle(screen.getByText(t('login.passwordLabel')))).toEqual(wiringFormLabel);
    expect(flattenedStyle(screen.getByText(t('password.confirmLabel')))).toEqual(wiringFormLabel);
    expect(flattenedStyle(screen.getByText(t('signup.languageLabel')))).toEqual(wiringFormLabel);
    const confirm = screen.getByLabelText(t('password.confirmLabel'));
    expect(flattenedStyle(parentOf(confirm))).toEqual({
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    });
    expect(confirm.props).toMatchObject({
      placeholderTextColor: colors.muted,
      autoCapitalize: 'none',
      autoComplete: 'new-password',
      textContentType: 'newPassword',
      returnKeyType: 'go',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });

    await fireEvent.changeText(confirm, 'password1');
    expect(screen.getByLabelText(t('password.confirmLabel')).props.value).toBe('password1');

    // Placeholder ink is pinned for every text field on the form.
    expect(screen.getByLabelText(t('signup.nameLabel')).props.placeholderTextColor).toBe(
      colors.muted,
    );
    expect(screen.getByLabelText(t('login.emailLabel')).props.placeholderTextColor).toBe(
      colors.muted,
    );
    expect(screen.getByLabelText(t('login.passwordLabel')).props.placeholderTextColor).toBe(
      colors.muted,
    );
    expect(screen.getByLabelText(t('password.confirmLabel')).props.placeholderTextColor).toBe(
      colors.muted,
    );
  });

  it('pins the strength meter testID under the password field', async () => {
    await render(<CrashBoundedSignupScreen />);
    expect(screen.queryByTestId('signup-strength')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(t('login.passwordLabel')), 'password1');
    expect(screen.getByTestId('signup-strength')).toBeTruthy();
  });

  it('pins the inline field-error ink for the name, email, and confirmation complaints', async () => {
    await render(<CrashBoundedSignupScreen />);

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'bad\u0007name');
    await fireEvent(screen.getByLabelText(t('signup.nameLabel')), 'blur');
    expect(flattenedStyle(screen.getByText(t('name.invalid')))).toEqual(wiringFieldError);

    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'blur');
    expect(flattenedStyle(screen.getByText(t('email.invalid')))).toEqual(wiringFieldError);

    await fireEvent.changeText(screen.getByLabelText(t('login.passwordLabel')), 'password1');
    await fireEvent.changeText(screen.getByLabelText(t('password.confirmLabel')), 'password2');
    expect(flattenedStyle(screen.getByText(t('cp.mismatch')))).toEqual(wiringFieldError);
  });

  it('pins the language chip prefix and the selected check glyph wiring', async () => {
    await render(<CrashBoundedSignupScreen />);
    expect(screen.getByTestId('signup-language-te')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    const check = screen.getByTestId('signup-language-check-te', {
      includeHiddenElements: true,
    });
    expect(check).toHaveTextContent('✓');
    expect(flattenedStyle(check)).toEqual({
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      color: colors.primary,
      fontSize: 16,
      fontWeight: '800',
    });
  });

  it('pins the legal link row, press styling, and ink', async () => {
    await render(<CrashBoundedSignupScreen />);
    const privacy = screen.getByRole('link', { name: t('header.privacy') });
    const terms = screen.getByRole('link', { name: t('header.terms') });

    expect(flattenedStyle(parentOf(privacy))).toEqual({
      marginTop: spacing.sm,
      minHeight: layout.minimumTarget,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
    });
    for (const link of [privacy, terms]) {
      expect(flattenedStyle(link)).toEqual({
        minHeight: layout.minimumTarget,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
      });
      // The authored Pressable style is a pressed-state callback; the resting
      // flatten must not carry the pressed ink.
      expect(flattenedStyle(link)).not.toMatchObject({ opacity: 0.6 });
    }
    expect(flattenedStyle(textNode(privacy, t('header.privacy')))).toEqual({
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    });
    expect(flattenedStyle(textNode(terms, t('header.terms')))).toEqual({
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    });
  });
});

describe('login prop wiring', () => {
  it('pins the screen chrome, brand badge, and brand icon ink', async () => {
    await render(<LoginScreen />);

    expect(flattenedStyle(parentOf(screen.getByTestId('keyboard-avoiding-view')))).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    expect(scrollViewHost().props.keyboardShouldPersistTaps).toBe('handled');

    const header = screen.getByRole('header', { name: t('login.title') });
    expect(flattenedStyle(childInstance(parentOf(header), 0))).toEqual({
      width: layout.brandMark,
      height: layout.brandMark,
      borderRadius: layout.brandMark / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      marginBottom: spacing.md,
      alignSelf: 'center',
    });
    expect(brandIconElement(t('login.title')).props).toMatchObject({
      name: 'mic',
      size: 30,
      color: colors.primary,
      strokeWidth: 2.1,
    });
  });

  it('pins the app-language picker value, busy lock, and persistence error', async () => {
    await render(<LoginScreen />);
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: false,
    });

    const login = deferred<User>();
    mockAuthValue.login = jest.fn(() => login.promise);
    const busy = await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(logInButton());
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
    await act(async () => {
      login.resolve(USER);
      await Promise.resolve();
      await Promise.resolve();
    });
    await busy.unmount();

    mockGuestLanguageState = { language: 'en', persistenceError: 'Secure storage unavailable' };
    await render(<LoginScreen />);
    expect(screen.getByText('Secure storage unavailable').props.accessibilityRole).toBe('alert');
  });

  it('pins the registered-notice banner ink', async () => {
    mockSearchParams = { notice: 'registered' };
    await render(<LoginScreen />);

    expect(flattenedStyle(screen.getByText(t('signup.createdLoginBanner')))).toEqual({
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
  });

  it('pins the field labels, placeholder ink, and the email field-error ink', async () => {
    await render(<LoginScreen />);

    expect(flattenedStyle(screen.getByText(t('login.passwordLabel')))).toEqual(wiringFormLabel);
    expect(screen.getByLabelText(t('login.emailLabel')).props.placeholderTextColor).toBe(
      colors.muted,
    );
    expect(screen.getByLabelText(t('login.passwordLabel')).props.placeholderTextColor).toBe(
      colors.muted,
    );

    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'blur');
    expect(flattenedStyle(screen.getByText(t('email.invalid')))).toEqual(wiringFieldError);
  });
});
