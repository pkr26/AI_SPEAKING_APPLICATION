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
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
  Link: MockLink,
}));

jest.mock('../src/lib/session-notice', () => ({
  consumeSessionExpiredNotice: jest.fn(async () => false),
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
  replace: jest.Mock;
};

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
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
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
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
  borderWidth: 2,
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
  mockAuthValue = makeAuth();
  mockForgot.mockResolvedValue(undefined);
  mockReset.mockResolvedValue(undefined);
  mockedConsumeNotice.mockResolvedValue(false);
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

  it('shows no reset banner on a plain visit', async () => {
    await render(<LoginScreen />);
    expect(screen.queryByText(t('reset.doneBanner'))).toBeNull();
  });
});

describe('forgot-password screen', () => {
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
    expect(await screen.findByText(t('reset.sentTitle'))).toBeTruthy();
    // The neutral copy never says whether the account exists.
    expect(screen.getByText(t('reset.sentBody'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('reset.continue') }));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/reset-password',
      params: { email: 'ada@example.com' },
    });
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

  it('marks the request email field with a two-pixel accent border while focused', async () => {
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

    await fireEvent.changeText(email(), 'a'.repeat(MAX_EMAIL_LENGTH));
    expect(submitDisabled()).toBe(false);

    // Padding is trimmed before the limit is measured, so an address that fits
    // exactly still submits.
    await fireEvent.changeText(email(), `  ${'a'.repeat(MAX_EMAIL_LENGTH)}  `);
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

  it('re-enables the request form and centers the error after a failure', async () => {
    mockForgot.mockRejectedValue(new Error('offline'));
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
  });

  it('keeps a back-to-login escape on the neutral sent state', async () => {
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByLabelText(t('login.emailLabel')), 'ada@example.com');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reset.submitRequest') }));
    });

    const link = await screen.findByRole('link', { name: t('reset.backToLogin') });
    expect(link.props.href).toBe('/login');
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
  async function fillValidForm() {
    await fireEvent.changeText(
      screen.getByLabelText(t('reset.codeLabel')),
      ' 0123456789abcdef0123456789abcdef ',
    );
    await fireEvent.changeText(screen.getByLabelText(t('cp.newLabel')), 'NewPass123');
  }

  it('prefills the email carried over from the request step', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    expect(screen.getByLabelText(t('login.emailLabel')).props.value).toBe('ada@example.com');
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
    expect(button().props.accessibilityState).toMatchObject({ disabled: false });
  });

  it('reveals and hides the new password from the accessible toggle', async () => {
    await render(<ResetPasswordScreen />);
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(true);
    // The visible label mirrors the accessible name of the same control.
    expect(screen.getByText(t('common.show'))).toBeTruthy();
    expect(screen.queryByText(t('common.hide'))).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByText(t('common.hide'))).toBeTruthy();
    expect(screen.queryByText(t('common.show'))).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getByText(t('common.show'))).toBeTruthy();
  });

  it('chains email to code to password and submits from the password field', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    await render(<ResetPasswordScreen />);
    await fillValidForm();
    const codeFocus = spyOnTextInputFocus(screen.getByLabelText(t('reset.codeLabel')));
    const passwordFocus = spyOnTextInputFocus(screen.getByLabelText(t('cp.newLabel')));

    await fireEvent(screen.getByLabelText(t('login.emailLabel')), 'submitEditing');
    expect(codeFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('reset.codeLabel')), 'submitEditing');
    expect(passwordFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('cp.newLabel')), 'submitEditing');
    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith(
        'ada@example.com',
        '0123456789abcdef0123456789abcdef',
        'NewPass123',
      ),
    );
  });

  it('marks the focused field with a two-pixel accent border', async () => {
    await render(<ResetPasswordScreen />);

    for (const label of [t('login.emailLabel'), t('reset.codeLabel'), t('cp.newLabel')]) {
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
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
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
    expect(mockRouter.replace).not.toHaveBeenCalled();
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
      autoComplete: 'new-password',
      textContentType: 'newPassword',
      returnKeyType: 'go',
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

  it('overlays the reveal control inside the new-password field', async () => {
    await render(<ResetPasswordScreen />);
    const password = screen.getByLabelText(t('cp.newLabel'));

    expect(flattenedStyle(parentOf(password))).toEqual({
      position: 'relative',
      justifyContent: 'center',
    });
    // The field reserves room on the right so the text never runs under Show.
    expect(flattenedStyle(password)).toEqual({ ...restingInput, paddingRight: 64 });
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
    await fireEvent.changeText(code(), '0123456789abcdef');
    // A code alone never unlocks the submit: the address is still missing.
    expect(submitDisabled()).toBe(true);

    await fireEvent.changeText(email(), '   ');
    expect(submitDisabled()).toBe(true);

    await fireEvent.changeText(email(), 'a'.repeat(MAX_EMAIL_LENGTH));
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
    expect(mockRouter.replace).not.toHaveBeenCalled();
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
    // A one-shot code must not be spent twice by an impatient second tap.
    expect(screen.queryByText(t('reset.submitNew'))).toBeNull();

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: '/login',
        params: { notice: 'reset' },
      }),
    );
  });

  it('re-enables the form with the fallback copy after an unexpected failure', async () => {
    mockSearchParams = { email: 'ada@example.com' };
    mockReset.mockRejectedValue(new Error('offline'));
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
    expect(mockRouter.replace).not.toHaveBeenCalled();
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
