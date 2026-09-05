import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import ForgotPasswordScreen from '../src/app/(auth)/forgot-password';
import LoginScreen from '../src/app/(auth)/login';
import ResetPasswordScreen from '../src/app/(auth)/reset-password';
import { ApiError, apiForgotPassword, apiResetPassword } from '../src/lib/api';
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_UTF8_BYTES, useAuth } from '../src/lib/auth';
import { setActiveLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
import { consumeSessionExpiredNotice } from '../src/lib/session-notice';
import { colors, layout, radii, spacing, type as typeScale } from '../src/lib/theme';
import type { User } from '../src/lib/types';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const MAX_LENGTH_EMAIL = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;

/** Mirrors the reset-code cap the screen keeps private; pinned via maxLength. */
const MAX_RESET_CODE_LENGTH = 128;

// ----- keyboard-avoidance mock -----

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
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

jest.mock('../src/lib/session-notice', () => ({
  consumeSessionExpiredNotice: jest.fn(async () => false),
}));

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

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiForgotPassword: jest.fn(),
  apiResetPassword: jest.fn(),
}));

// ----- auth mock (login screen needs the provider surface) -----

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
    sessionVersion: 0,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
    resetStoredSession: jest.fn(),
    captureSessionLease: jest.fn(() => ({}) as never),
    isSessionLeaseCurrent: jest.fn(() => true),
    login: jest.fn().mockResolvedValue(USER),
    register: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
}));

const mockForgot = apiForgotPassword as jest.Mock;
const mockReset = apiResetPassword as jest.Mock;
const mockedConsumeNotice = consumeSessionExpiredNotice as jest.Mock;
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  navigate: jest.Mock;
  replace: jest.Mock;
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

/** The host view a control is laid out in (the reveal-overlay input row). */
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

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

// Both reset screens paint the same form chrome from the shared token scale;
// the expectations below are the whole flattened style, not a subset, so a
// dropped declaration is a failure rather than a silent visual regression.
const screenChrome: SemanticStyle = { flex: 1, backgroundColor: colors.background };

const formContainer: SemanticStyle = {
  flexGrow: 1,
  justifyContent: 'center',
  padding: layout.screenPadding,
  width: '100%',
  maxWidth: layout.formMaxWidth,
  alignSelf: 'center',
};

const screenTitle: SemanticStyle = {
  fontSize: typeScale.titleLg.fontSize,
  lineHeight: typeScale.titleLg.lineHeight,
  fontWeight: '800',
  color: colors.text,
  textAlign: 'center',
};

const restingInput: SemanticStyle = {
  borderWidth: 1,
  borderColor: colors.inputBorder,
  borderRadius: radii.input,
  paddingHorizontal: 14,
  paddingVertical: spacing.md,
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.inputBackground,
};

const focusedInput: SemanticStyle = {
  ...restingInput,
  borderColor: colors.primary,
};

const formError: SemanticStyle = {
  marginTop: spacing.md,
  color: colors.danger,
  fontSize: 14,
  textAlign: 'center',
};

const footerLink: SemanticStyle = {
  marginTop: spacing.xl,
  minHeight: layout.minimumTarget,
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: spacing.md,
};

const footerLinkText: SemanticStyle = {
  fontSize: 15,
  color: colors.primary,
  fontWeight: '600',
  textAlign: 'center',
};

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

function textNode(node: TestInstance, text: string): TestInstance {
  const match = node.queryAll((candidate) => candidate.children.includes(text))[0];
  if (!match) throw new Error(`Text "${text}" not found inside rendered control`);
  return match;
}

/** Underlying React fiber of a rendered element; identity changes on remount. */
function fiberOf(node: TestInstance): unknown {
  return (node as unknown as { unstable_fiber?: unknown }).unstable_fiber;
}

/**
 * The never-disabled Pressable wrapping a validation-gated submit Button: a
 * real tap on the blocked CTA lands on its host view (marked
 * accessible=false), revealing the hidden field error. The walk asserts
 * existence instead of throwing: a missing accessible=false marking is the
 * observable wiring failure and must die on matcher evidence, never a helper
 * throw.
 */
function revealWrapperOf(node: TestInstance): TestInstance {
  let wrapper: TestInstance | null = null;
  for (let current: TestInstance | null = node; current; current = current.parent) {
    if (current.props.accessible === false) {
      wrapper = current;
      break;
    }
  }
  expect(wrapper?.props.accessible).toBe(false);
  return wrapper as TestInstance;
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
  mockForgot.mockReset().mockResolvedValue(undefined);
  mockReset.mockReset().mockResolvedValue(undefined);
  mockedConsumeNotice.mockReset().mockResolvedValue(false);
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

describe('login entry points', () => {
  it('navigates to the forgot-password screen from the login link', async () => {
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByRole('link', { name: t('login.forgot') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('shows the one-shot reset success banner after a completed reset', async () => {
    mockSearchParams = { notice: 'reset' };
    await render(<LoginScreen />);
    expect(screen.getByText(t('reset.doneBanner'))).toBeTruthy();
  });

  it('uses the first repeated notice parameter', async () => {
    mockSearchParams = { notice: ['reset', 'ignored'] };
    await render(<LoginScreen />);

    expect(screen.getByText(t('reset.doneBanner'))).toBeTruthy();
  });

  it('shows no reset banner on a plain visit', async () => {
    await render(<LoginScreen />);
    expect(screen.queryByText(t('reset.doneBanner'))).toBeNull();
  });
});

describe('forgot-password screen', () => {
  it('returns to the login screen from the sent-state back-to-login link', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    await screen.findByText(t('reset.sentBody'));

    await fireEvent.press(screen.getByRole('link', { name: t('reset.backToLogin') }));

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/login');
  });

  it('shows the email error only after blur or submit, never mid-typing', async () => {
    await render(<ForgotPasswordScreen />);
    const email = screen.getByLabelText(t('login.emailLabel'));

    await fireEvent.changeText(email, 'not-an-email');
    // Inline validation waits for the learner to leave the field; the submit
    // gate still blocks live.
    expect(screen.queryByText(t('email.invalid'))).toBeNull();
    expect(
      screen.getByRole('button', { name: t('reset.submitRequest') }).props.accessibilityState
        .disabled,
    ).toBe(true);

    await fireEvent(email, 'blur');
    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');

    // A corrected field clears the inline complaint.
    await fireEvent.changeText(email, 'ada@example.com');
    expect(screen.queryByText(t('email.invalid'))).toBeNull();
  });

  it('reveals the email error from the return key without issuing the request', async () => {
    await render(<ForgotPasswordScreen />);
    const email = screen.getByLabelText(t('login.emailLabel'));

    await fireEvent.changeText(email, 'not-an-email');
    await fireEvent(email, 'submitEditing');

    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('navigates back to login once per tap burst', async () => {
    await render(<ForgotPasswordScreen />);

    const back = screen.getByRole('link', { name: t('reset.backToLogin') });
    await fireEvent.press(back);
    // The once-per-focus latch swallows the impatient second tap.
    await fireEvent.press(back);

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/login');
  });

  it('sends app-language choices from both request states to the device preference', async () => {
    await render(<ForgotPasswordScreen />);

    await fireEvent.press(screen.getByTestId('ui-language-es'));
    expect(mockSetGuestLanguage).toHaveBeenLastCalledWith('es');

    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    await screen.findByText(t('reset.sentTitle'));
    await fireEvent.press(screen.getByTestId('ui-language-hi'));

    expect(mockSetGuestLanguage).toHaveBeenCalledTimes(2);
    expect(mockSetGuestLanguage).toHaveBeenLastCalledWith('hi');
  });

  it('resubscribes the removal guard when navigation identity changes', async () => {
    const first = navigationHarness();
    mockNavigation = first.navigation;
    const rendered = await render(<ForgotPasswordScreen />);

    const second = navigationHarness();
    mockNavigation = second.navigation;
    await rendered.rerender(<ForgotPasswordScreen />);

    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(second.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
    expect(second.listener()).toEqual(expect.any(Function));
  });

  it('keeps Send code disabled until an email is typed', async () => {
    await render(<ForgotPasswordScreen />);
    const button = () => screen.getByRole('button', { name: t('reset.submitRequest') });
    expect(button().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    expect(button().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('always advances to the neutral sent state — no account enumeration', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), ' ada@example.com ');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    expect(mockForgot).toHaveBeenCalledWith('ada@example.com');
    expect((await screen.findByText(t('reset.sentTitle'))).props.accessibilityRole).toBe('header');
    // The neutral copy never says whether the account exists.
    expect(screen.getByText(t('reset.sentBody'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('reset.continue') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/reset-password',
      params: { email: 'ada@example.com' },
    });
  });

  it('prefills the address that received the code when the field changes in flight', async () => {
    const request = deferred<void>();
    mockForgot.mockReturnValue(request.promise);
    await render(<ForgotPasswordScreen />);
    const input = screen.getByLabelText(t('login.emailLabel'));
    await fireEvent.changeText(input, 'first@example.com');

    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    await fireEvent.changeText(input, 'second@example.com');
    await act(async () => request.resolve(undefined));

    await fireEvent.press(await screen.findByRole('button', { name: t('reset.continue') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/reset-password',
      params: { email: 'first@example.com' },
    });
  });

  it('resends through the same neutral endpoint for the pinned email', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), ' ada@example.com ');
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    await screen.findByText(t('reset.sentTitle'));
    mockForgot.mockClear();

    const noteBefore = fiberOf(screen.getByText(t('reset.sentBody')));
    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(mockForgot).toHaveBeenCalledWith('ada@example.com');
    expect(screen.getByText(t('reset.sentBody'))).toBeTruthy();
    // A successful resend mirrors the first send: the keyed note remounts so
    // the polite live region announces the confirmation again.
    expect(fiberOf(screen.getByText(t('reset.sentBody')))).not.toBe(noteBefore);
  });

  it('keeps the neutral sent state and allows another resend after failure', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    await screen.findByText(t('reset.sentTitle'));
    mockForgot.mockRejectedValueOnce(new Error('mail transport unavailable'));

    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect((await screen.findByText(t('reset.requestFailed'))).props.accessibilityRole).toBe(
      'alert',
    );
    expect(
      screen.getByRole('button', { name: t('reset.resend') }).props.accessibilityState,
    ).toMatchObject({
      disabled: false,
      busy: false,
    });
    expect(screen.getByText(t('reset.sentBody'))).toBeTruthy();
  });

  it('routes a double-tapped Continue through the deduping navigation', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    await screen.findByRole('button', { name: t('reset.continue') });
    const target = { pathname: '/reset-password', params: { email: 'ada@example.com' } };
    await fireEvent.press(screen.getByRole('button', { name: t('reset.continue') }));
    await fireEvent.press(screen.getByRole('button', { name: t('reset.continue') }));

    // push always pushes, so an impatient second tap would leave an orphan,
    // empty reset form in the stack; both taps must name the identical route
    // so navigate dismisses back to the open one instead.
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
    expect(mockRouter.navigate).toHaveBeenNthCalledWith(1, target);
    expect(mockRouter.navigate).toHaveBeenNthCalledWith(2, target);
  });

  it('shows the rate-limit wait line inline on a 429', async () => {
    mockForgot.mockRejectedValue(new ApiError(429, 'rate limited', 120, { code: 'RATE_LIMITED' }));
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    expect(
      await screen.findByText(`${t('error.tooMany')} ${t('wait.minutes', { count: 2 })}`),
    ).toBeTruthy();
    // Still on the form; the neutral sent state is only for accepted requests.
    expect(screen.queryByText(t('reset.sentTitle'))).toBeNull();

    // Editing the field clears the stale summary error, like the login form.
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('falls back to the request-failed copy for unexpected errors', async () => {
    mockForgot.mockRejectedValue(new Error('offline'));
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    expect(await screen.findByText(t('reset.requestFailed'))).toBeTruthy();
  });

  it('renders the request copy over an empty email field', async () => {
    await render(<ForgotPasswordScreen />);

    expect(screen.getByRole('header', { name: t('reset.requestTitle') })).toBeTruthy();
    expect(screen.getByText(t('reset.requestBody'))).toBeTruthy();
    expect(screen.getByText(t('login.emailLabel'))).toBeTruthy();
    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('');
    expect(screen.getByRole('button', { name: t('reset.submitRequest') })).toBeTruthy();
    for (const language of ['en', 'te', 'hi', 'es', 'zh']) {
      expect(screen.getByTestId(`ui-language-${language}`).props.accessibilityRole).toBe('radio');
    }
    // Nothing is in flight yet, so the sending label must not be on screen.
    expect(screen.queryByText(t('reset.submitRequestBusy'))).toBeNull();
  });

  it('configures the request email field for address entry', async () => {
    await render(<ForgotPasswordScreen />);

    expect(screen.getByLabelText(t('login.emailLabel')).props).toMatchObject({
      placeholder: t('login.emailPlaceholder'),
      placeholderTextColor: colors.muted,
      autoCapitalize: 'none',
      autoComplete: 'email',
      // Autocorrect would mangle an address as it is typed.
      autoCorrect: false,
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
      returnKeyType: 'go',
      maxLength: MAX_EMAIL_LENGTH,
    });
  });

  it('lays out the request screen on the shared token scale', async () => {
    await render(<ForgotPasswordScreen />);

    expect(flattenedStyle(screen.getByTestId('keyboard-avoiding-view'))).toEqual(screenChrome);
    expect(scrollContentStyle()).toEqual(formContainer);
    expect(flattenedStyle(screen.getByRole('header', { name: t('reset.requestTitle') }))).toEqual(
      screenTitle,
    );
    expect(flattenedStyle(screen.getByText(t('reset.requestBody')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 16,
      lineHeight: 23,
      color: colors.muted,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('login.emailLabel')))).toEqual({
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('reset.submitRequest') })),
    ).toMatchObject({ marginTop: spacing.lg });
    const footer = screen.getByRole('link', { name: t('reset.backToLogin') });
    expect(flattenedStyle(footer)).toEqual(footerLink);
    expect(flattenedStyle(textNode(footer, t('reset.backToLogin')))).toEqual(footerLinkText);
  });

  it('changes the request field border color without changing its width', async () => {
    await render(<ForgotPasswordScreen />);
    const input = () => screen.getByLabelText(t('login.emailLabel'));

    expect(flattenedStyle(input())).toEqual(restingInput);

    await fireEvent(input(), 'focus');
    expect(flattenedStyle(input())).toEqual(focusedInput);

    await fireEvent(input(), 'blur');
    expect(flattenedStyle(input())).toEqual(restingInput);
  });

  it('rejects whitespace-only and oversized emails while accepting the exact limit', async () => {
    await render(<ForgotPasswordScreen />);
    const email = () => screen.getByLabelText(t('login.emailLabel'));
    const submitDisabled = () =>
      screen.getByRole('button', { name: t('reset.submitRequest') }).props.accessibilityState
        .disabled;

    await fireEvent.changeText(email(), '   ');
    expect(submitDisabled()).toBe(true);

    await fireEvent.changeText(email(), MAX_LENGTH_EMAIL);
    expect(submitDisabled()).toBe(false);

    // Padding is trimmed before the limit is measured, so an address that fits
    // exactly still submits.
    await fireEvent.changeText(email(), `  ${MAX_LENGTH_EMAIL}  `);
    expect(submitDisabled()).toBe(false);

    await fireEvent.changeText(email(), 'a'.repeat(MAX_EMAIL_LENGTH + 1));
    expect(submitDisabled()).toBe(true);
  });

  it('sends from the email return key only once the address is usable', async () => {
    await render(<ForgotPasswordScreen />);
    const email = screen.getByLabelText(t('login.emailLabel'));

    await fireEvent(email, 'submitEditing');
    expect(mockForgot).not.toHaveBeenCalled();
    expect(screen.queryByText(t('reset.sentTitle'))).toBeNull();
    expect(screen.queryByText(t('reset.submitRequestBusy'))).toBeNull();

    await fireEvent.changeText(email, ' ada@example.com ');
    await act(async () => {
      await fireEvent(email, 'submitEditing');
    });

    expect(mockForgot).toHaveBeenCalledWith('ada@example.com');
    expect(await screen.findByText(t('reset.sentTitle'))).toBeTruthy();
  });

  it('reports the sending state while the request is in flight', async () => {
    const pending = deferred<void>();
    mockForgot.mockReturnValue(pending.promise);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    const sending = screen.getByRole('button', { name: t('reset.submitRequestBusy') });
    expect(sending.props.accessibilityState).toEqual({ disabled: true, busy: true });
    // A second tap cannot start a duplicate request while one is open.
    expect(screen.queryByText(t('reset.submitRequest'))).toBeNull();

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    expect(screen.getByText(t('reset.sentTitle'))).toBeTruthy();
  });

  it('blocks the sent-state Back link while a resend is in flight', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    await screen.findByText(t('reset.sentTitle'));

    const resend = deferred<void>();
    mockForgot.mockReturnValueOnce(resend.promise);
    mockRouter.navigate.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(screen.getByRole('button', { name: t('reset.resendBusy') })).toBeTruthy();
    const backToLogin = screen.getByRole('link', { name: t('reset.backToLogin') });
    expect(backToLogin.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(backToLogin);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    await act(async () => {
      resend.resolve();
      await resend.promise;
    });
  });

  it('locks native exits and Back to login while a reset email is pending, then retries', async () => {
    const firstRequest = deferred<void>();
    mockForgot.mockReturnValueOnce(firstRequest.promise).mockResolvedValueOnce(undefined);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    const submit = committedPressHandler(
      screen.getByRole('button', { name: t('reset.submitRequest') }),
    );
    const backBeforeBusy = screen.getByRole('link', { name: t('reset.backToLogin') });
    const goBackToLogin = committedPressHandler(backBeforeBusy);
    let preventedBack!: jest.Mock;
    let resetRemoval!: jest.Mock;
    mockSetOptions.mockClear();

    await act(async () => {
      void submit();
      goBackToLogin();
      preventedBack = dispatchBeforeRemove('GO_BACK');
      resetRemoval = dispatchBeforeRemove('RESET');
      expect(hardwareBackIsHandled()).toBe(true);
      await Promise.resolve();
    });

    expect(preventedBack).toHaveBeenCalledTimes(1);
    expect(mockForgot).toHaveBeenCalledTimes(1);
    expect(resetRemoval).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(LOCKED_NAVIGATION_OPTIONS);
    const backToLogin = screen.getByRole('link', { name: t('reset.backToLogin') });
    expect(backToLogin.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(backToLogin);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    await act(async () => {
      firstRequest.reject(new Error('offline'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText(t('reset.requestFailed'))).toBeTruthy();
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(UNLOCKED_NAVIGATION_OPTIONS);

    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    expect(mockForgot).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(t('reset.sentTitle'))).toBeTruthy();
  });

  it.each(['success', 'failure'] as const)(
    'publishes no forgot-password %s continuation after external unmount',
    async (outcome) => {
      const request = deferred<void>();
      mockForgot.mockReturnValue(request.promise);
      const view = await render(<ForgotPasswordScreen />);
      await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
      const submit = committedPressHandler(
        screen.getByRole('button', { name: t('reset.submitRequest') }),
      );
      await act(async () => {
        void submit();
        await Promise.resolve();
      });
      expect(mockForgot).toHaveBeenCalledTimes(1);

      await view.unmount();
      mockSetOptions.mockClear();
      mockRouter.navigate.mockClear();
      await act(async () => {
        if (outcome === 'success') request.resolve(undefined);
        else request.reject(new Error('late failure'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    },
  );

  it('sends one reset-request email for two same-render activations', async () => {
    const pending = deferred<void>();
    mockForgot.mockReturnValue(pending.promise);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    const press = committedPressHandler(
      screen.getByRole('button', { name: t('reset.submitRequest') }),
    );
    await act(async () => {
      void press();
      void press();
    });
    expect(mockForgot).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText(t('reset.sentTitle'))).toBeTruthy();
  });

  it('re-enables the request form and centers the error after a failure', async () => {
    mockForgot.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    const error = screen.getByText(t('reset.requestFailed'));
    expect(error.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(error)).toEqual(formError);
    // Busy is cleared in `finally`, so the user can retry immediately.
    expect(
      screen.getByRole('button', { name: t('reset.submitRequest') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    expect(screen.queryByText(t('reset.submitRequestBusy'))).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });
    expect(mockForgot).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(t('reset.sentTitle'))).toBeTruthy();
  });

  it('keeps a back-to-login escape on the neutral sent state', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    const link = await screen.findByRole('link', { name: t('reset.backToLogin') });
    expect(link.props.accessibilityState).toEqual({ disabled: false });
    expect(flattenedStyle(link)).toEqual(footerLink);
    expect(flattenedStyle(textNode(link, t('reset.backToLogin')))).toEqual(footerLinkText);
    expect(screen.getByText(t('reset.sentBody')).props.accessibilityLiveRegion).toBe('polite');
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ] as const)(
    'uses the %s keyboard-avoidance behavior on the request form',
    async (os, expectedBehavior) => {
      await withPlatformOS(os, async () => {
        await render(<ForgotPasswordScreen />);

        expect(screen.getByTestId('keyboard-avoiding-view').props.behavior).toBe(expectedBehavior);
      });
    },
  );
});

describe('reset-password screen', () => {
  it('navigates back to login once per tap burst', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);

    const back = screen.getByRole('link', { name: t('reset.backToLogin') });
    await fireEvent.press(back);
    // The once-per-focus latch swallows the impatient second tap.
    await fireEvent.press(back);

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/login');
  });

  it('sends an app-language choice to the guest-language preference', async () => {
    await render(<ResetPasswordScreen />);

    await fireEvent.press(screen.getByTestId('ui-language-zh'));

    expect(mockSetGuestLanguage).toHaveBeenCalledTimes(1);
    expect(mockSetGuestLanguage).toHaveBeenCalledWith('zh');
  });

  it('resubscribes the removal guard when navigation identity changes', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    const first = navigationHarness();
    mockNavigation = first.navigation;
    const rendered = await render(<ResetPasswordScreen />);

    const second = navigationHarness();
    mockNavigation = second.navigation;
    await rendered.rerender(<ResetPasswordScreen />);

    expect(first.remove).toHaveBeenCalledTimes(1);
    expect(second.addListener).toHaveBeenCalledWith('beforeRemove', expect.any(Function));
    expect(second.listener()).toEqual(expect.any(Function));
  });

  async function fillValidForm() {
    await fireEvent.changeText(
      screen.getByLabelText(t('reset.codeLabel')),
      ' 0123456789abcdef0123456789abcdef ',
    );
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'NewPass123');
  }

  it('prefills the email carried over from the request step', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('ada@example.com');
  });

  it('prefills the first repeated email parameter', async () => {
    mockSearchParams = { email: ['first@example.com', 'ignored@example.com'] };
    await expect(
      Promise.resolve().then(() => render(<ResetPasswordScreen />)),
    ).resolves.toBeDefined();

    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('first@example.com');
  });

  it('keeps the submit disabled until email, code, and a valid password exist', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    const button = () => screen.getByRole('button', { name: t('reset.submitNew') });
    expect(button().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'somecode');
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'short');
    expect(screen.getByText(t('password.tooShort'))).toBeTruthy();
    expect(button().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
    expect(button().props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'NewPass123');
    expect(button().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('announces an invalid reset email inline after blur', async () => {
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    // The inline error waits for blur; erroring mid-typing is hostile.
    expect(screen.queryByText(t('email.invalid'))).toBeNull();
    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'blur');

    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
  });

  it('requires the reset password confirmation to match', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'somecode');
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'Different123');

    expect(screen.getByText(t('cp.mismatch')).props.accessibilityLiveRegion).toBe('polite');
    expect(
      screen.getByRole('button', { name: t('reset.submitNew') }).props.accessibilityState.disabled,
    ).toBe(true);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('reveals and hides the new password from the accessible toggle', async () => {
    await render(<ResetPasswordScreen />);
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(true);
    const confirmationToggle = screen.getByLabelText(t('password.showConfirmation'));
    expect(confirmationToggle.props.accessibilityRole).toBe('button');
    expect(confirmationToggle.props.accessibilityLabel).toBe(t('password.showConfirmation'));
    // Both secrets start masked with the eye glyph.
    expect(screen.getAllByTestId('password-toggle-show')).toHaveLength(2);
    expect(screen.queryByTestId('password-toggle-hide')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getAllByTestId('password-toggle-show')).toHaveLength(1);
    expect(screen.getAllByTestId('password-toggle-hide')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getAllByTestId('password-toggle-show')).toHaveLength(2);

    await fireEvent.press(screen.getByRole('button', { name: t('password.showConfirmation') }));
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByRole('button', { name: t('password.hideConfirmation') })).toBeTruthy();
    expect(screen.getAllByTestId('password-toggle-hide')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: t('password.hideConfirmation') }));
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.secureTextEntry).toBe(true);
    expect(screen.queryByTestId('password-toggle-hide')).toBeNull();
  });

  it('chains email to code to password confirmation and submits from confirmation', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillValidForm();
    const codeFocus = spyOnTextInputFocus(screen.getByLabelText(t('reset.codeLabel')));
    const passwordFocus = spyOnTextInputFocus(screen.getByLabelText(t('cp.newLabel')));
    const confirmFocus = spyOnTextInputFocus(screen.getByLabelText(t('cp.confirmLabel')));

    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'submitEditing');
    expect(codeFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('reset.codeLabel')), 'submitEditing');
    expect(passwordFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('cp.newLabel')), 'submitEditing');
    expect(confirmFocus).toHaveBeenCalledTimes(1);
    await fireEvent(screen.getByLabelText(t('cp.confirmLabel')), 'submitEditing');
    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith(
        'ada@example.com',
        '0123456789abcdef0123456789abcdef',
        'NewPass123',
      ),
    );
  });

  it('changes only the focused field border color so focus does not move the form', async () => {
    await render(<ResetPasswordScreen />);

    for (const label of [
      t('login.emailLabel'),
      t('reset.codeLabel'),
      t('cp.newLabel'),
      t('cp.confirmLabel'),
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

  it('resets the password and returns to login with the success banner', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillValidForm();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });

    expect(mockReset).toHaveBeenCalledWith(
      'ada@example.com',
      '0123456789abcdef0123456789abcdef',
      'NewPass123',
    );
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
    // replace would only swap this screen, leaving the request step and its
    // "check your email" state one back-gesture away with a spent code.
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('preserves leading and trailing whitespace in the new password', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'reset-code');
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), ' NewPass123 ');
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), ' NewPass123 ');

    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));

    expect(mockReset).toHaveBeenCalledWith('ada@example.com', 'reset-code', ' NewPass123 ');
  });

  it('maps RESET_INVALID onto the localized invalid-code copy', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    mockReset.mockRejectedValue(
      new ApiError(400, 'Reset code is invalid or expired', undefined, {
        code: 'RESET_INVALID',
      }),
    );
    await render(<ResetPasswordScreen />);
    await fillValidForm();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });

    expect(await screen.findByText(t('error.resetInvalid'))).toBeTruthy();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('shows the rate-limit wait line when reset attempts are throttled', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    mockReset.mockRejectedValue(new ApiError(429, 'rate limited', 45, { code: 'RATE_LIMITED' }));
    await render(<ResetPasswordScreen />);
    await fillValidForm();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });

    expect(
      await screen.findByText(`${t('error.tooMany')} ${t('wait.seconds', { count: 45 })}`),
    ).toBeTruthy();
  });

  it('starts every field empty and silent when nothing is carried over', async () => {
    await render(<ResetPasswordScreen />);

    expect(screen.getByRole('header', { name: t('reset.newTitle') })).toBeTruthy();
    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('');
    expect(screen.getByLabelText(t('reset.codeLabel')).props.value).toBe('');
    expect(screen.getByLabelText(t('cp.newLabel')).props.value).toBe('');
    // Every field is visibly labelled, not only labelled for assistive tech.
    expect(screen.getByText(t('login.emailLabel'))).toBeTruthy();
    expect(screen.getByText(t('reset.codeLabel'))).toBeTruthy();
    expect(screen.getByText(t('cp.newLabel'))).toBeTruthy();
    // An untouched password carries no policy complaint.
    expect(screen.queryByText(t('password.tooShort'))).toBeNull();
    expect(screen.queryByText(t('password.needsLetterAndNumber'))).toBeNull();
    for (const language of ['en', 'te', 'hi', 'es', 'zh']) {
      expect(screen.getByTestId(`ui-language-${language}`).props.accessibilityRole).toBe('radio');
    }
  });

  it('configures the reset fields for one-time code and new-password entry', async () => {
    await render(<ResetPasswordScreen />);

    expect(screen.getByLabelText(t('login.emailLabel')).props).toMatchObject({
      placeholder: t('login.emailPlaceholder'),
      placeholderTextColor: colors.muted,
      autoCapitalize: 'none',
      autoComplete: 'email',
      autoCorrect: false,
      keyboardType: 'email-address',
      textContentType: 'emailAddress',
      returnKeyType: 'next',
      maxLength: MAX_EMAIL_LENGTH,
    });
    expect(screen.getByLabelText(t('reset.codeLabel')).props).toMatchObject({
      placeholder: t('reset.codePlaceholder'),
      placeholderTextColor: colors.muted,
      autoCapitalize: 'none',
      autoComplete: 'one-time-code',
      // A pasted code must survive verbatim; autocorrect would rewrite it.
      autoCorrect: false,
      textContentType: 'oneTimeCode',
      returnKeyType: 'next',
      maxLength: MAX_RESET_CODE_LENGTH,
    });
    expect(screen.getByLabelText(t('cp.newLabel')).props).toMatchObject({
      placeholder: t('signup.passwordPlaceholder'),
      placeholderTextColor: colors.muted,
      // Show clears secureTextEntry, so without these the keyboard would
      // capitalize and autocorrect the password this flow saves.
      autoCapitalize: 'none',
      autoComplete: 'new-password',
      autoCorrect: false,
      textContentType: 'newPassword',
      returnKeyType: 'next',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it('lays out the reset screen on the shared token scale', async () => {
    await render(<ResetPasswordScreen />);

    expect(flattenedStyle(screen.getByTestId('keyboard-avoiding-view'))).toEqual(screenChrome);
    expect(scrollContentStyle()).toEqual(formContainer);
    expect(flattenedStyle(screen.getByRole('header', { name: t('reset.newTitle') }))).toEqual(
      screenTitle,
    );
    expect(flattenedStyle(screen.getByText(t('reset.codeLabel')))).toEqual({
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    });
    expect(flattenedStyle(screen.getByLabelText(t('reset.codeLabel')))).toEqual(restingInput);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('reset.submitNew') })),
    ).toMatchObject({ marginTop: spacing.lg });
    const footer = screen.getByRole('link', { name: t('reset.backToLogin') });
    expect(flattenedStyle(footer)).toEqual(footerLink);
    expect(flattenedStyle(textNode(footer, t('reset.backToLogin')))).toEqual(footerLinkText);
  });

  it('lays the reveal control beside a flexible new-password field', async () => {
    await render(<ResetPasswordScreen />);
    const password = screen.getByLabelText(t('cp.newLabel'));

    expect(flattenedStyle(parentOf(password))).toEqual({
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    });
    expect(flattenedStyle(password)).toEqual({ ...restingInput, flex: 1, minWidth: 0 });
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.showPassword') }))).toEqual({
      width: layout.minimumTarget,
      height: layout.minimumTarget,
      alignItems: 'center',
      justifyContent: 'center',
    });
  });

  it('announces an unusable password inline under the field', async () => {
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'short');

    const fieldError = screen.getByText(t('password.tooShort'));
    expect(fieldError.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenedStyle(fieldError)).toEqual({
      marginTop: spacing.sm,
      color: colors.danger,
      fontSize: 13,
    });
  });

  it('reveals the hidden email error when the disabled submit is tapped', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'somecode');
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'NewPass123');

    const submit = screen.getByRole('button', { name: t('reset.submitNew') });
    expect(submit.props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText(t('email.invalid'))).toBeNull();
    // The wrapper Pressable receives the tap the disabled Button drops.
    await fireEvent.press(revealWrapperOf(submit));
    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('holds the submit at the exact email and code length limits', async () => {
    await render(<ResetPasswordScreen />);
    const email = () => screen.getByLabelText(t('login.emailLabel'));
    const code = () => screen.getByLabelText(t('reset.codeLabel'));
    const submitDisabled = () =>
      screen.getByRole('button', { name: t('reset.submitNew') }).props.accessibilityState.disabled;

    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'NewPass123');
    await fireEvent.changeText(code(), '0123456789abcdef');
    // A code alone never unlocks the submit: the address is still missing.
    expect(submitDisabled()).toBe(true);

    await fireEvent.changeText(email(), '   ');
    expect(submitDisabled()).toBe(true);

    await fireEvent.changeText(email(), MAX_LENGTH_EMAIL);
    expect(submitDisabled()).toBe(false);

    await fireEvent.changeText(email(), 'a'.repeat(MAX_EMAIL_LENGTH + 1));
    expect(submitDisabled()).toBe(true);

    await fireEvent.changeText(email(), 'ada@example.com');
    await fireEvent.changeText(code(), '   ');
    expect(submitDisabled()).toBe(true);

    await fireEvent.changeText(code(), 'a'.repeat(MAX_RESET_CODE_LENGTH));
    expect(submitDisabled()).toBe(false);

    await fireEvent.changeText(code(), 'a'.repeat(MAX_RESET_CODE_LENGTH + 1));
    expect(submitDisabled()).toBe(true);
  });

  it('ignores the password return key while the form is incomplete', async () => {
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'somecode');

    await fireEvent(screen.getByLabelText(t('cp.newLabel')), 'submitEditing');

    expect(mockReset).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(screen.queryByText(t('reset.submitNewBusy'))).toBeNull();
  });

  it('keeps the chaining return keys harmless once the screen is gone', async () => {
    const view = await render(<ResetPasswordScreen />);
    const submitFromEmail = screen.getByLabelText(t('login.emailLabel')).props
      .onSubmitEditing as () => void;
    const submitFromCode = screen.getByLabelText(t('reset.codeLabel')).props
      .onSubmitEditing as () => void;
    const codeFocus = spyOnTextInputFocus(screen.getByLabelText(t('reset.codeLabel')));
    const passwordFocus = spyOnTextInputFocus(screen.getByLabelText(t('cp.newLabel')));
    await view.unmount();

    // Both refs are detached on unmount, so chaining must not reach them.
    expect(submitFromEmail).not.toThrow();
    expect(submitFromCode).not.toThrow();
    expect(codeFocus).not.toHaveBeenCalled();
    expect(passwordFocus).not.toHaveBeenCalled();
  });

  it('trims the typed email before spending the reset code', async () => {
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), '  ada@example.com  ');
    await fillValidForm();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });

    expect(mockReset).toHaveBeenCalledWith(
      'ada@example.com',
      '0123456789abcdef0123456789abcdef',
      'NewPass123',
    );
  });

  it('reports the saving state while the reset is in flight', async () => {
    const pending = deferred<void>();
    mockReset.mockReturnValue(pending.promise);
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillValidForm();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });

    const saving = screen.getByRole('button', { name: t('reset.submitNewBusy') });
    expect(saving.props.accessibilityState).toEqual({ disabled: true, busy: true });
    // The form locks while the one-shot code is being spent: no field edits,
    // no visibility toggles (matching the login/signup busy contract).
    expect(screen.getByLabelText(t('login.emailLabel')).props.editable).toBe(false);
    expect(screen.getByLabelText(t('reset.codeLabel')).props.editable).toBe(false);
    expect(screen.getByLabelText(t('cp.newLabel')).props.editable).toBe(false);
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.editable).toBe(false);
    expect(
      screen.getByRole('button', { name: t('common.showPassword') }).props.accessibilityState,
    ).toEqual({ disabled: true });
    expect(
      screen.getByRole('button', { name: t('password.showConfirmation') }).props.accessibilityState,
    ).toEqual({ disabled: true });
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.showPassword') }))).toEqual(
      expect.objectContaining({ opacity: 0.5 }),
    );
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('password.showConfirmation') })),
    ).toEqual(expect.objectContaining({ opacity: 0.5 }));
    // A one-shot code must not be spent twice by an impatient second tap.
    expect(screen.queryByText(t('reset.submitNew'))).toBeNull();

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
  });

  it('locks native exits and Back to login while spending a reset code, then retries', async () => {
    const firstReset = deferred<void>();
    mockReset.mockReturnValueOnce(firstReset.promise).mockResolvedValueOnce(undefined);
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillValidForm();
    const submit = committedPressHandler(
      screen.getByRole('button', { name: t('reset.submitNew') }),
    );
    const backBeforeBusy = screen.getByRole('link', { name: t('reset.backToLogin') });
    const goBackToLogin = committedPressHandler(backBeforeBusy);
    let preventedBack!: jest.Mock;
    let resetRemoval!: jest.Mock;
    mockSetOptions.mockClear();

    await act(async () => {
      void submit();
      goBackToLogin();
      preventedBack = dispatchBeforeRemove('GO_BACK');
      resetRemoval = dispatchBeforeRemove('RESET');
      expect(hardwareBackIsHandled()).toBe(true);
      await Promise.resolve();
    });

    expect(preventedBack).toHaveBeenCalledTimes(1);
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(resetRemoval).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(LOCKED_NAVIGATION_OPTIONS);
    const backToLogin = screen.getByRole('link', { name: t('reset.backToLogin') });
    expect(backToLogin.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(backToLogin);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    await act(async () => {
      firstReset.reject(new Error('offline'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(await screen.findByText(t('cp.failed'))).toBeTruthy();
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith(UNLOCKED_NAVIGATION_OPTIONS);

    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    expect(mockReset).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
  });

  it.each(['success', 'failure'] as const)(
    'publishes no reset-password %s continuation after external unmount',
    async (outcome) => {
      const reset = deferred<void>();
      mockReset.mockReturnValue(reset.promise);
      mockSearchParams = { email: 'ada@example.com' };
      const view = await render(<ResetPasswordScreen />);
      await fillValidForm();
      const submit = committedPressHandler(
        screen.getByRole('button', { name: t('reset.submitNew') }),
      );
      await act(async () => {
        void submit();
        await Promise.resolve();
      });
      expect(mockReset).toHaveBeenCalledTimes(1);

      await view.unmount();
      mockSetOptions.mockClear();
      mockRouter.dismissTo.mockClear();
      await act(async () => {
        if (outcome === 'success') reset.resolve(undefined);
        else reset.reject(new Error('late failure'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    },
  );

  it('spends a reset code once for two same-render activations', async () => {
    const pending = deferred<void>();
    mockReset.mockReturnValue(pending.promise);
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillValidForm();
    const press = committedPressHandler(screen.getByRole('button', { name: t('reset.submitNew') }));
    await act(async () => {
      void press();
      void press();
    });
    expect(mockReset).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
  });

  it('re-enables the form with the fallback copy after an unexpected failure', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    mockReset.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    await render(<ResetPasswordScreen />);
    await fillValidForm();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });

    const error = screen.getByText(t('cp.failed'));
    expect(error.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(error)).toEqual(formError);
    // Busy is cleared in `finally`, so a retry is possible right away.
    expect(
      screen.getByRole('button', { name: t('reset.submitNew') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    // Editing any field clears the stale summary error, like the login form.
    await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'fresh-code');
    expect(screen.queryByText(t('cp.failed'))).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });
    expect(mockReset).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ] as const)(
    'uses the %s keyboard-avoidance behavior on the reset form',
    async (os, expectedBehavior) => {
      await withPlatformOS(os, async () => {
        await render(<ResetPasswordScreen />);

        expect(screen.getByTestId('keyboard-avoiding-view').props.behavior).toBe(expectedBehavior);
      });
    },
  );

  it('navigates back to login from both reset screens', async () => {
    const forgot = await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByRole('link', { name: t('reset.backToLogin') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/login');
    await forgot.unmount();

    await render(<ResetPasswordScreen />);
    await fireEvent.press(screen.getByRole('link', { name: t('reset.backToLogin') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/login');
  });
});

// ---------------------------------------------------------------------------
// Deep mutation-hardening: reset-form gate conjuncts at their exact bounds,
// mismatch copy visibility, untouched confirm state, and busy control styling.
// ---------------------------------------------------------------------------
const AT_MAX_EMAIL = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`;

describe('reset-password deep contracts', () => {
  beforeEach(() => {
    // Earlier suites deliberately move the active language; pin it back so
    // these English-copy probes stay deterministic.
    setActiveLanguage('en');
  });

  async function fillReset(code: string, password: string, confirm: string) {
    await fireEvent.changeText(screen.getByPlaceholderText(t('reset.codePlaceholder')), code);
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('signup.passwordPlaceholder')),
      password,
    );
    await fireEvent.changeText(screen.getByPlaceholderText(t('cp.confirmPlaceholder')), confirm);
  }
  function resetButton() {
    return screen.getByRole('button', { name: t('reset.submitNew') });
  }

  it('shows the live strength meter under the new-password field', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    expect(screen.queryByTestId('reset-password-strength')).toBeNull();

    await fireEvent.changeText(
      screen.getByPlaceholderText(t('signup.passwordPlaceholder')),
      'newpass1',
    );
    const meter = screen.getByTestId('reset-password-strength');
    // 'newpass1' meets the policy but stays a fair tier: two filled segments.
    expect(screen.getAllByTestId('reset-password-strength-segment-on')).toHaveLength(2);
    expect(meter.props.accessibilityLiveRegion).toBe('polite');
  });

  it('starts the confirmation field empty with autocorrect off and labelled copy', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    const confirm = screen.getByPlaceholderText(t('cp.confirmPlaceholder'));
    expect(confirm.props.value).toBe('');
    expect(confirm.props.autoCorrect).toBe(false);
    expect(screen.getByText(t('cp.confirmLabel'))).toBeTruthy();
  });

  it('shows the mismatch copy only while a mismatched confirmation is present', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillReset('123456', 'password1', 'password2');
    expect(screen.getByText(t('cp.mismatch'))).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(t('cp.confirmPlaceholder')), '');
    expect(screen.queryByText(t('cp.mismatch'))).toBeNull();
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('cp.confirmPlaceholder')),
      'password1',
    );
    expect(screen.queryByText(t('cp.mismatch'))).toBeNull();
  });

  it('submits at the exact email bound and blocks one past it', async () => {
    mockReset.mockResolvedValue(undefined);
    mockSearchParams = { email: AT_MAX_EMAIL };
    await render(<ResetPasswordScreen />);
    await fillReset('123456', 'password1', 'password1');
    await fireEvent.press(resetButton());
    await waitFor(() => expect(mockReset).toHaveBeenCalledTimes(1));

    mockSearchParams = { email: `${AT_MAX_EMAIL}a` };
    await render(<ResetPasswordScreen />);
    await fillReset('123456', 'password1', 'password1');
    await fireEvent.press(resetButton());
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('never submits without a confirmation, with a policy-failing password, or without a code', async () => {
    mockReset.mockResolvedValue(undefined);
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillReset('123456', 'password1', '');
    await fireEvent.press(resetButton());
    await fillReset('123456', 'allletters', 'allletters');
    await fireEvent.press(resetButton());
    await fillReset('', 'password1', 'password1');
    await fireEvent.press(resetButton());
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('dims the submit control while the reset request is busy', async () => {
    const gate = deferred<void>();
    mockReset.mockReturnValue(gate.promise);
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillReset('123456', 'password1', 'password1');
    const cta = resetButton();
    await fireEvent.press(cta);
    await waitFor(() => expect(mockReset).toHaveBeenCalledTimes(1));
    expect(StyleSheet.flatten(cta.props.style)).toMatchObject({ opacity: 0.5 });
    gate.resolve(undefined);
  });
});

describe('forgot-password deep contracts', () => {
  beforeEach(() => {
    setActiveLanguage('en');
  });

  it('sends at the exact email bound and blocks one past it', async () => {
    mockForgot.mockResolvedValue(undefined);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('login.emailPlaceholder')),
      AT_MAX_EMAIL,
    );
    const send = screen.getByRole('button', { name: t('reset.submitRequest') });
    await fireEvent.press(send);
    await waitFor(() => expect(mockForgot).toHaveBeenCalledTimes(1));

    // A fresh visit with an over-bound address never issues the request.
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('login.emailPlaceholder')),
      `${AT_MAX_EMAIL}a`,
    );
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    expect(mockForgot).toHaveBeenCalledTimes(1);
  });

  it('ignores a second tap while a request is already in flight', async () => {
    const gate = deferred<void>();
    mockForgot.mockReturnValue(gate.promise);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('login.emailPlaceholder')),
      'ada@example.com',
    );
    const send = screen.getByRole('button', { name: t('reset.submitRequest') });
    await fireEvent.press(send);
    await fireEvent.press(send);
    expect(mockForgot).toHaveBeenCalledTimes(1);
    gate.resolve(undefined);
  });
});

// ---------------------------------------------------------------------------
// Mutation-hardening pins: resend/continue busy guards, the keyed note bump,
// the sent-state alert slot, pressed-link dimming, focus-style wiring, and the
// detached password chaining ref.
// ---------------------------------------------------------------------------

describe('forgot-password resend and continue guards', () => {
  it('spends one resend for two same-render activations', async () => {
    await arriveAtSentState();
    const pending = deferred<void>();
    mockForgot.mockReset().mockReturnValue(pending.promise);

    const resend = committedPressHandler(screen.getByRole('button', { name: t('reset.resend') }));
    await act(async () => {
      void resend();
      void resend();
    });

    // The busy/sent guard swallows the impatient second activation before a
    // second transport request can open.
    expect(mockForgot).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(undefined);
      await pending.promise;
    });
  });

  it('remounts the neutral note under key 2 after an accepted resend', async () => {
    await arriveAtSentState();
    expect(elementKey(screen.getByText(t('reset.sentBody')))).toBe('1');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    });

    // The resend bumps the same keyed counter the first send started, so the
    // polite live region re-announces instead of sitting stale.
    expect(elementKey(screen.getByText(t('reset.sentBody')))).toBe('2');
  });

  it('holds Continue while a resend is in flight', async () => {
    await arriveAtSentState();
    const continuePress = committedPressHandler(
      screen.getByRole('button', { name: t('reset.continue') }),
    );
    const pending = deferred<void>();
    mockForgot.mockReset().mockReturnValue(pending.promise);

    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    mockRouter.navigate.mockClear();
    await act(async () => {
      void continuePress();
    });

    // The pending resend owns the screen: the captured Continue activation
    // must not carry the pinned email onward until the request settles.
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve(undefined);
      await pending.promise;
    });
  });

  it('renders no alert in the neutral sent state before any resend failure', async () => {
    await arriveAtSentState();

    expect(screen.queryByRole('alert')).toBeNull();
  });
});

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

/**
 * Pressed-state feedback contract: the link rests on the token style, dims
 * only for the duration of the press, and releases the dim afterwards.
 */
async function expectPressFeedback(
  getLink: () => TestInstance,
  resting: SemanticStyle,
  pressed: SemanticStyle,
): Promise<void> {
  expect(flattenedStyle(getLink())).toMatchObject(resting);
  await fireEvent(getLink(), 'responderGrant', responderEvent());
  expect(flattenedStyle(getLink())).toMatchObject(pressed);
  await fireEvent(getLink(), 'responderTerminate', responderEvent());
  await waitFor(() => {
    const restored = flattenedStyle(getLink());
    expect(restored).toMatchObject(resting);
    for (const property of Object.keys(pressed)) {
      if (!(property in resting)) expect(restored[property]).toBeUndefined();
    }
  });
}

describe('reset-flow link press contracts', () => {
  it('dims the sent-state back-to-login link only while pressed', async () => {
    await arriveAtSentState();
    await expectPressFeedback(
      () => screen.getByRole('link', { name: t('reset.backToLogin') }),
      { minHeight: layout.minimumTarget },
      { opacity: 0.6 },
    );
  });

  it('dims the request-state back-to-login link only while pressed', async () => {
    await render(<ForgotPasswordScreen />);
    await expectPressFeedback(
      () => screen.getByRole('link', { name: t('reset.backToLogin') }),
      { minHeight: layout.minimumTarget },
      { opacity: 0.6 },
    );
  });

  it('dims the reset back-to-login link only while pressed', async () => {
    await render(<ResetPasswordScreen />);
    await expectPressFeedback(
      () => screen.getByRole('link', { name: t('reset.backToLogin') }),
      { minHeight: layout.minimumTarget },
      { opacity: 0.6 },
    );
  });
});

describe('reset-password focus and chaining pins', () => {
  const rowInput: SemanticStyle = { ...restingInput, flex: 1, minWidth: 0 };

  it('keeps the password and confirmation borders resting while another field is focused', async () => {
    await render(<ResetPasswordScreen />);
    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'focus');

    // Focus treatment belongs to the focused field alone: the reveal rows keep
    // the exact resting field style while the email owns the focus slot.
    expect(flattenedStyle(screen.getByLabelText(t('cp.newLabel')))).toEqual(rowInput);
    expect(flattenedStyle(screen.getByLabelText(t('cp.confirmLabel')))).toEqual(rowInput);

    // Focusing each reveal-row field still swaps only the border color.
    await fireEvent(screen.getByLabelText(t('cp.newLabel')), 'focus');
    expect(flattenedStyle(screen.getByLabelText(t('cp.newLabel')))).toEqual({
      ...rowInput,
      borderColor: colors.primary,
    });
    await fireEvent(screen.getByLabelText(t('cp.newLabel')), 'blur');
    expect(flattenedStyle(screen.getByLabelText(t('cp.newLabel')))).toEqual(rowInput);

    await fireEvent(screen.getByLabelText(t('cp.confirmLabel')), 'focus');
    expect(flattenedStyle(screen.getByLabelText(t('cp.confirmLabel')))).toEqual({
      ...rowInput,
      borderColor: colors.primary,
    });
  });

  it('keeps the password return key harmless once the screen is gone', async () => {
    const view = await render(<ResetPasswordScreen />);
    const submitFromPassword = screen.getByLabelText(t('cp.newLabel')).props
      .onSubmitEditing as () => void;
    const confirmFocus = spyOnTextInputFocus(screen.getByLabelText(t('cp.confirmLabel')));
    await view.unmount();

    // The confirm ref is detached on unmount, so the chaining call must not
    // dereference it.
    expect(() => submitFromPassword()).not.toThrow();
    expect(confirmFocus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// State/prop wiring pins: the authored initial states (null vs any hostile
// boolean, 0-keyed note), the stale-error clearing setters, and the exact
// chrome/field prop wiring the deep styles above do not reach.
// ---------------------------------------------------------------------------

/** The host ScrollView, which keeps contentContainerStyle as a prop. */
function scrollViewHost(): TestInstance {
  const [scrollView] = screen.container.queryAll((node) => node.type === 'RCTScrollView');
  if (!scrollView) throw new Error('No ScrollView rendered');
  return scrollView;
}

/**
 * The React key committed on a keyed element: RNT hands back the inner text
 * host fiber, so the authored key lives one fiber up.
 */
function elementKey(node: TestInstance): string | null {
  const fiber = fiberOf(node) as { key?: string | null; return?: { key?: string | null } | null };
  return fiber.return?.key ?? fiber.key ?? null;
}

/** Fills the reset form with a valid code and matching passwords. */
async function fillResetForm() {
  await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'somecode');
  await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
  await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'NewPass123');
}

const fieldErrorInk: SemanticStyle = { marginTop: spacing.sm, color: colors.danger, fontSize: 13 };

const formLabel: SemanticStyle = {
  fontSize: 14,
  fontWeight: '600',
  color: colors.text,
  marginBottom: spacing.sm,
  marginTop: spacing.md,
};

describe('forgot-password state wiring', () => {
  it('renders the request form — not the sent state or any alert — before a send', async () => {
    await render(<ForgotPasswordScreen />);

    expect(screen.getByRole('header', { name: t('reset.requestTitle') })).toBeTruthy();
    expect(screen.queryByText(t('reset.sentTitle'))).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('remounts the neutral note under key 1 after the first accepted send', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    const note = await screen.findByText(t('reset.sentBody'));
    // The note key starts at 0 and the accepted send bumps it exactly once, so
    // the keyed remount (and its polite re-announcement) is wired to the send.
    expect(elementKey(note)).toBe('1');
  });

  it('clears a stale transport error once a retry is accepted', async () => {
    mockForgot
      .mockReset()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });
    expect(await screen.findByText(t('reset.requestFailed'))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });
    expect(await screen.findByText(t('reset.sentTitle'))).toBeTruthy();
    expect(screen.queryByText(t('reset.requestFailed'))).toBeNull();
  });

  it('clears a stale resend error once a resend is accepted', async () => {
    mockForgot
      .mockReset()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });
    expect(await screen.findByText(t('reset.sentTitle'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(await screen.findByText(t('reset.requestFailed'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(await screen.findByText(t('reset.sentBody'))).toBeTruthy();
    expect(screen.queryByText(t('reset.requestFailed'))).toBeNull();
  });
});

describe('reset-password state wiring', () => {
  it('starts with no focused field, no summary alert, and a null focus slot', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);

    expect(screen.queryByRole('alert')).toBeNull();
    const passwordStyle = screen.getByLabelText(t('cp.newLabel')).props.style as unknown[];
    // The style array itself must exist before its null focus slot is read, so
    // a removed style wiring dies on this matcher instead of a raw deref.
    expect(passwordStyle).toBeDefined();
    expect(passwordStyle[2]).toBeNull();
    const confirmStyle = screen.getByLabelText(t('cp.confirmLabel')).props.style as unknown[];
    expect(confirmStyle).toBeDefined();
    expect(confirmStyle[2]).toBeNull();
  });

  it('marks the email touched when a blocked return-key submit fires', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('reset.codeLabel')), 'somecode');
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'NewPass123');
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');

    await fireEvent(screen.getByLabelText(t('cp.confirmLabel')), 'submitEditing');

    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('clears the summary error on a successful retry', async () => {
    mockReset
      .mockReset()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillResetForm();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });
    expect(await screen.findByText(t('cp.failed'))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    });
    await waitFor(() =>
      expect(mockRouter.dismissTo).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
    expect(screen.queryByText(t('cp.failed'))).toBeNull();
  });

  it.each(['email', 'password', 'confirm'] as const)(
    'clears the summary error when the %s field is edited',
    async (field) => {
      mockReset.mockReset().mockRejectedValue(new Error('offline'));
      mockSearchParams = { email: 'ada@example.com' };
      await render(<ResetPasswordScreen />);
      await fillResetForm();
      await act(async () => {
        await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
      });
      expect(await screen.findByText(t('cp.failed'))).toBeTruthy();

      if (field === 'email') {
        await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'new@example.com');
      } else if (field === 'password') {
        await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass124');
      } else {
        await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'NewPass124');
      }

      expect(screen.queryByText(t('cp.failed'))).toBeNull();
    },
  );
});

describe('reset-password prop wiring', () => {
  it('pins the screen chrome and the keyboard-persistent scroll container', async () => {
    await render(<ResetPasswordScreen />);

    expect(flattenedStyle(parentOf(screen.getByTestId('keyboard-avoiding-view')))).toEqual(
      screenChrome,
    );
    expect(scrollViewHost().props.keyboardShouldPersistTaps).toBe('handled');
  });

  it('pins the app-language picker value, busy lock, and persistence error', async () => {
    await render(<ResetPasswordScreen />);
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: false,
    });

    const pending = deferred<void>();
    mockReset.mockReset().mockReturnValue(pending.promise);
    mockSearchParams = { email: 'ada@example.com' };
    const second = await render(<ResetPasswordScreen />);
    await fillResetForm();
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitNew') }));
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
    await act(async () => {
      pending.resolve(undefined);
      await pending.promise;
    });
    await second.unmount();

    mockGuestLanguageState = { language: 'en', persistenceError: 'Secure storage unavailable' };
    await render(<ResetPasswordScreen />);
    expect(screen.getByText('Secure storage unavailable').props.accessibilityRole).toBe('alert');
  });

  it('pins the field labels, the confirm row, and the confirm field configuration', async () => {
    await render(<ResetPasswordScreen />);

    expect(flattenedStyle(screen.getByText(t('login.emailLabel')))).toEqual(formLabel);
    expect(flattenedStyle(screen.getByText(t('cp.newLabel')))).toEqual(formLabel);
    expect(flattenedStyle(screen.getByText(t('cp.confirmLabel')))).toEqual(formLabel);
    const confirm = screen.getByLabelText(t('cp.confirmLabel'));
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

    await fireEvent.changeText(confirm, 'NewPass123');
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.value).toBe('NewPass123');
  });

  it('pins the inline field-error ink for the email and confirmation complaints', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'blur');
    expect(flattenedStyle(screen.getByText(t('email.invalid')))).toEqual(fieldErrorInk);

    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
    await fireEvent.changeText(screen.getByLabelText(t('cp.confirmLabel')), 'Different123');
    expect(flattenedStyle(screen.getByText(t('cp.mismatch')))).toEqual(fieldErrorInk);
  });
});

/** Props of the shared Button component that rendered a queried host button. */
function sharedButtonProps(node: TestInstance): Record<string, unknown> {
  type Fiber = { memoizedProps?: Record<string, unknown>; return: Fiber | null };
  let fiber = node.unstable_fiber as Fiber | null;
  let owner: Record<string, unknown> | null = null;
  while (fiber) {
    const props = fiber.memoizedProps;
    if (props && typeof props.title === 'string' && 'onPress' in props && 'style' in props) {
      owner = props;
      break;
    }
    fiber = fiber.return;
  }
  // A control with no shared Button above it is the observable behavior under
  // a wiring mutant and must fail as a kill, never a raw infrastructure error.
  expect(owner).not.toBeNull();
  return owner as Record<string, unknown>;
}

async function arriveAtSentState() {
  await render(<ForgotPasswordScreen />);
  await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
  });
  await screen.findByText(t('reset.sentTitle'));
}

describe('forgot-password prop wiring', () => {
  it('pins the request chrome, scroll persistence, and email field-error ink', async () => {
    await render(<ForgotPasswordScreen />);

    expect(flattenedStyle(parentOf(screen.getByTestId('keyboard-avoiding-view')))).toEqual(
      screenChrome,
    );
    expect(scrollViewHost().props.keyboardShouldPersistTaps).toBe('handled');

    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');
    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'blur');
    expect(flattenedStyle(screen.getByText(t('email.invalid')))).toEqual(fieldErrorInk);
  });

  it('pins the request-state picker value, busy lock, and persistence error', async () => {
    await render(<ForgotPasswordScreen />);
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: false,
    });

    const pending = deferred<void>();
    mockForgot.mockReset().mockReturnValue(pending.promise);
    const busy = await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
    await act(async () => {
      pending.resolve(undefined);
      await pending.promise;
    });
    await busy.unmount();

    mockGuestLanguageState = { language: 'en', persistenceError: 'Secure storage unavailable' };
    await render(<ForgotPasswordScreen />);
    expect(screen.getByText('Secure storage unavailable').props.accessibilityRole).toBe('alert');
  });

  it('pins the sent-state chrome and copy styles', async () => {
    await arriveAtSentState();

    expect(flattenedStyle(parentOf(scrollViewHost()))).toEqual(screenChrome);
    expect(scrollContentStyle()).toEqual(formContainer);
    expect(flattenedStyle(screen.getByRole('header', { name: t('reset.sentTitle') }))).toEqual(
      screenTitle,
    );
    expect(flattenedStyle(screen.getByText(t('reset.sentBody')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 16,
      lineHeight: 23,
      color: colors.muted,
      textAlign: 'center',
    });
  });

  it('pins the sent-state picker value and persistence error', async () => {
    await arriveAtSentState();
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: false,
    });
    const first = screen.getByTestId('ui-language-en');
    expect(first).toBeTruthy();

    const resend = deferred<void>();
    mockForgot.mockReset().mockReturnValue(resend.promise);
    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(screen.getByTestId('ui-language-en').props.accessibilityState).toMatchObject({
      checked: true,
      disabled: true,
    });
    await act(async () => {
      resend.resolve(undefined);
      await resend.promise;
    });

    mockGuestLanguageState = { language: 'en', persistenceError: 'Secure storage unavailable' };
    await arriveAtSentState();
    expect(screen.getByText('Secure storage unavailable').props.accessibilityRole).toBe('alert');
  });

  it('pins the Continue and Resend button wiring in the sent state', async () => {
    await arriveAtSentState();

    const continueButton = screen.getByRole('button', { name: t('reset.continue') });
    expect(flattenedStyle(continueButton)).toMatchObject({ marginTop: spacing.lg });
    const resendButton = screen.getByRole('button', { name: t('reset.resend') });
    expect(flattenedStyle(resendButton)).toMatchObject({ marginTop: spacing.sm });
    // The resend action is the outlined secondary variant, not a second filled
    // CTA, and both controls carry their idle disabled/loading wiring to the
    // shared Button even though `loading` alone would also block presses.
    expect(sharedButtonProps(resendButton)).toMatchObject({
      variant: 'secondary',
      disabled: false,
      loading: false,
    });
    expect(sharedButtonProps(continueButton)).toMatchObject({ disabled: false });

    const resend = deferred<void>();
    mockForgot.mockReset().mockReturnValue(resend.promise);
    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(sharedButtonProps(screen.getByRole('button', { name: t('reset.resendBusy') }))).toEqual(
      expect.objectContaining({ disabled: true, loading: true }),
    );
    expect(
      screen.getByRole('button', { name: t('reset.continue') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    await act(async () => {
      resend.resolve(undefined);
      await resend.promise;
    });
  });

  it('pins the sent-state summary-error ink after a failed resend', async () => {
    await arriveAtSentState();
    mockForgot.mockReset().mockRejectedValueOnce(new Error('offline'));

    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));

    const error = await screen.findByText(t('reset.requestFailed'));
    expect(flattenedStyle(error)).toEqual(formError);
  });
});
