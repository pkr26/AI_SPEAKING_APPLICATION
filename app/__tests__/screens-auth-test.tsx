import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import LoginScreen from '../src/app/(auth)/login';
import SignupScreen from '../src/app/(auth)/signup';
import { ApiError } from '../src/lib/api';
import type { useAuth } from '../src/lib/auth';
import type { User } from '../src/lib/types';

// ----- expo-router mock -----

function MockLink({ children }: { children: React.ReactNode; href: string }) {
  return <Text>{children}</Text>;
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
    login: jest.fn().mockResolvedValue(USER),
    register: jest.fn().mockResolvedValue(USER),
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

describe('login screen', () => {
  it('renders the brand, inputs, and signup link', async () => {
    await render(<LoginScreen />);
    expect(screen.getByText('AI English Coach')).toBeTruthy();
    expect(screen.getByText('Practice speaking English with instant AI feedback.')).toBeTruthy();
    expect(screen.getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('Your password')).toBeTruthy();
    expect(screen.getByText('Create an account')).toBeTruthy();
  });

  it('keeps Sign In disabled until email and password are present', async () => {
    await render(<LoginScreen />);
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      true,
    );

    await fillLogin('ada@example.com', '');
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      true,
    );

    await fillLogin('ada@example.com', 'password1');
    expect(screen.getByRole('button', { name: 'Sign In' }).props.accessibilityState.disabled).toBe(
      false,
    );
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
    let resolveLogin!: (user: User) => void;
    mockAuthValue.login = jest.fn(() => new Promise<User>((resolve) => (resolveLogin = resolve)));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    const busyButton = await screen.findByRole('button', {
      name: 'Signing in…',
    });
    expect(busyButton.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    await act(async () => resolveLogin(USER));
    await pressPromise;
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
    mockAuthValue.login = jest.fn().mockRejectedValue(new Error('network down'));
    await render(<LoginScreen />);
    await fillLogin('ada@example.com', 'password1');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Could not sign in. Please try again.')).toBeTruthy();
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
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('requires every field plus a language before enabling Sign Up', async () => {
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    expect(signUpButton().props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    expect(signUpButton().props.accessibilityState.disabled).toBe(false);
    expect(screen.getByLabelText('Telugu, తెలుగు').props.accessibilityState.selected).toBe(true);
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

  it('shows the busy state while registering', async () => {
    let resolveRegister!: (user: User) => void;
    mockAuthValue.register = jest.fn(
      () => new Promise<User>((resolve) => (resolveRegister = resolve)),
    );
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(signUpButton());

    const busyButton = await screen.findByRole('button', {
      name: 'Creating account…',
    });
    expect(busyButton.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    await act(async () => resolveRegister(USER));
    await pressPromise;
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

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.register = jest.fn().mockRejectedValue(new Error('network down'));
    await render(<SignupScreen />);
    await fillSignup('Ada', 'ada@example.com', 'password1');
    await fireEvent.press(screen.getByLabelText('Telugu, తెలుగు'));
    await fireEvent.press(signUpButton());

    expect(
      await screen.findByText(
        'Could not create your account. Check your information and try again.',
      ),
    ).toBeTruthy();
  });
});
