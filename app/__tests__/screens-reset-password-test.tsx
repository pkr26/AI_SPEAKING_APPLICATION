import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';
import type { TestInstance } from 'test-renderer';

import ForgotPasswordScreen from '../src/app/(auth)/forgot-password';
import LoginScreen from '../src/app/(auth)/login';
import ResetPasswordScreen from '../src/app/(auth)/reset-password';
import { ApiError, apiForgotPassword, apiResetPassword } from '../src/lib/api';
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_UTF8_BYTES, useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { consumeSessionExpiredNotice } from '../src/lib/session-notice';
import { colors, layout, radii, spacing } from '../src/lib/theme';
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
    Link: MockLink,
  };
});

jest.mock('../src/lib/session-notice', () => ({
  consumeSessionExpiredNotice: jest.fn(async () => false),
}));

const mockSetGuestLanguage = jest.fn();

jest.mock('../src/lib/guest-language', () => ({
  useGuestLanguage: () => ({
    language: 'en',
    isRestoring: false,
    persistenceError: null,
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
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress as () => unknown;
    }
    fiber = fiber.return;
  }
  throw new Error('No committed press handler found');
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
  padding: spacing.xl,
  width: '100%',
  maxWidth: layout.formMaxWidth,
  alignSelf: 'center',
};

const screenTitle: SemanticStyle = {
  fontSize: 26,
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
  marginTop: 14,
  color: colors.danger,
  fontSize: 14,
  textAlign: 'center',
};

const footerLink: SemanticStyle = {
  marginTop: spacing.xl,
  minHeight: layout.minimumTarget,
  paddingVertical: spacing.md,
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
  it('links to the forgot-password screen', async () => {
    await render(<LoginScreen />);
    const link = screen.getByText(t('login.forgot'));
    expect(link.props.href).toBe('/forgot-password');
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
  it('rejects malformed email locally', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');

    expect(screen.getByText(t('email.invalid')).props.accessibilityLiveRegion).toBe('polite');
    expect(
      screen.getByRole('button', { name: t('reset.submitRequest') }).props.accessibilityState
        .disabled,
    ).toBe(true);
    expect(mockForgot).not.toHaveBeenCalled();
  });

  it('lets the idle Back to login Link navigate', async () => {
    await render(<ForgotPasswordScreen />);

    await fireEvent.press(screen.getByRole('link', { name: t('reset.backToLogin') }));

    expect(mockLinkNavigate).toHaveBeenCalledWith('/login');
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

    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(mockForgot).toHaveBeenCalledWith('ada@example.com');
    expect(screen.getByText(t('reset.sentBody'))).toBeTruthy();
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
      marginBottom: 6,
      marginTop: spacing.xl,
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('reset.submitRequest') })),
    ).toMatchObject({ marginTop: spacing.lg });
    expect(flattenedStyle(screen.getByRole('link', { name: t('reset.backToLogin') }))).toEqual(
      footerLink,
    );
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
    mockLinkNavigate.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: t('reset.resend') }));
    expect(screen.getByRole('button', { name: t('reset.resendBusy') })).toBeTruthy();
    const backToLogin = screen.getByRole('link', { name: t('reset.backToLogin') });
    expect(backToLogin.props.accessibilityState).toEqual({ disabled: true });
    await fireEvent.press(backToLogin);
    expect(mockLinkNavigate).not.toHaveBeenCalled();

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
    expect(mockLinkNavigate).not.toHaveBeenCalled();

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
    expect(link.props.href).toBe('/login');
    expect(link.props.accessibilityState).toEqual({ disabled: false });
    expect(flattenedStyle(link)).toEqual(footerLink);
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
  it('lets the idle Back to login Link navigate', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);

    await fireEvent.press(screen.getByRole('link', { name: t('reset.backToLogin') }));

    expect(mockLinkNavigate).toHaveBeenCalledWith('/login');
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

  it('announces an invalid reset email inline', async () => {
    await render(<ResetPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'not-an-email');

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
      marginBottom: 6,
      marginTop: spacing.lg,
    });
    expect(flattenedStyle(screen.getByLabelText(t('reset.codeLabel')))).toEqual(restingInput);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('reset.submitNew') })),
    ).toMatchObject({ marginTop: spacing.lg });
    expect(flattenedStyle(screen.getByRole('link', { name: t('reset.backToLogin') }))).toEqual(
      footerLink,
    );
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
      marginTop: 6,
      color: colors.danger,
      fontSize: 13,
    });
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
    expect(mockLinkNavigate).not.toHaveBeenCalled();

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

  it('links back to login from both reset screens', async () => {
    const forgot = await render(<ForgotPasswordScreen />);
    expect(screen.getByText(t('reset.backToLogin')).props.href).toBe('/login');
    await forgot.unmount();

    await render(<ResetPasswordScreen />);
    expect(screen.getByText(t('reset.backToLogin')).props.href).toBe('/login');
  });
});
