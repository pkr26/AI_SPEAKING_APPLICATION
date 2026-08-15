import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import type { TestInstance } from 'test-renderer';

import ForgotPasswordScreen from '../src/app/(auth)/forgot-password';
import LoginScreen from '../src/app/(auth)/login';
import ResetPasswordScreen from '../src/app/(auth)/reset-password';
import { ApiError, apiForgotPassword, apiResetPassword } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { consumeSessionExpiredNotice } from '../src/lib/session-notice';
import { colors } from '../src/lib/theme';
import type { User } from '../src/lib/types';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

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

function flattenedStyle(node: TestInstance): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style) ?? {};
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

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(true);
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

  it('links back to login from both reset screens', async () => {
    const forgot = await render(<ForgotPasswordScreen />);
    expect(screen.getByText(t('reset.backToLogin')).props.href).toBe('/login');
    await forgot.unmount();

    await render(<ResetPasswordScreen />);
    expect(screen.getByText(t('reset.backToLogin')).props.href).toBe('/login');
  });
});
