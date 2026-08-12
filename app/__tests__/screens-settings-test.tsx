import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import ChangePasswordScreen from '../src/app/settings/change-password';
import DeleteAccountScreen from '../src/app/settings/delete-account';
import { ApiError } from '../src/lib/api';
import { AccountDeletedCleanupError, useAuth } from '../src/lib/auth';
import type { User } from '../src/lib/types';

// ----- expo-router mock -----

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
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
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
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
  replace: jest.Mock;
  back: jest.Mock;
};

let alertSpy: jest.SpyInstance;

const queryClients: QueryClient[] = [];

function makeQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(client);
  return client;
}

function renderScreen(ui: React.ReactElement, queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

function alertButtons(): { text?: string; onPress?: () => void }[] {
  const calls = alertSpy.mock.calls;
  if (calls.length === 0) throw new Error('Alert.alert was not called');
  return (calls[calls.length - 1][2] ?? []) as {
    text?: string;
    onPress?: () => void;
  }[];
}

async function pressAlertButton(text: string) {
  const button = alertButtons().find((candidate) => candidate.text === text);
  if (!button?.onPress) throw new Error(`Alert button "${text}" not found`);
  await act(async () => button.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthValue = makeAuth();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
  alertSpy.mockRestore();
});

// ----- change password -----

async function fillChangePassword(
  current: string,
  next: string,
  confirm: string,
) {
  await fireEvent.changeText(
    screen.getByPlaceholderText('Your current password'),
    current,
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText(
      'At least 8 characters, with a letter and a number',
    ),
    next,
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText('Repeat the new password'),
    confirm,
  );
}

function updateButton() {
  return screen.getByRole('button', { name: 'Update Password' });
}

describe('change password screen', () => {
  it('keeps Update disabled until all fields validate', async () => {
    await renderScreen(<ChangePasswordScreen />);
    expect(updateButton().props.accessibilityState.disabled).toBe(true);

    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    expect(updateButton().props.accessibilityState.disabled).toBe(false);
  });

  it('shows a mismatch error when confirmation differs', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass2');
    expect(screen.getByText('Passwords do not match.')).toBeTruthy();
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('enforces the password policy on the new password', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'short', 'short');
    expect(
      screen.getByText('Password must be at least 8 characters.'),
    ).toBeTruthy();
    expect(updateButton().props.accessibilityState.disabled).toBe(true);

    await fillChangePassword('oldpass1', 'abcdefgh', 'abcdefgh');
    expect(
      screen.getByText(
        'Password must include at least one letter and one number.',
      ),
    ).toBeTruthy();
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects current passwords over the UTF-8 byte limit', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('a'.repeat(73), 'newpass1', 'newpass1');
    expect(
      screen.getByText('Password must be at most 72 UTF-8 bytes.'),
    ).toBeTruthy();
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('changes the password and navigates back after confirmation', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    await waitFor(() =>
      expect(mockAuthValue.changePassword).toHaveBeenCalledWith(
        'oldpass1',
        'newpass1',
      ),
    );
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Password updated',
        'Your password has been changed.',
        expect.any(Array),
      ),
    );

    await pressAlertButton('OK');
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows the busy state while updating', async () => {
    let resolveChange!: () => void;
    mockAuthValue.changePassword = jest.fn(
      () => new Promise<void>((resolve) => (resolveChange = resolve)),
    );
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(updateButton());

    const busyButton = await screen.findByRole('button', {
      name: 'Updating…',
    });
    expect(busyButton.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });

    await act(async () => resolveChange());
    await pressPromise;
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.changePassword = jest
      .fn()
      .mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(
      await screen.findByText('Current password is incorrect.'),
    ).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.changePassword = jest
      .fn()
      .mockRejectedValue(new ApiError(429, 'slow down'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(
      await screen.findByText('Too many attempts, please try again later.'),
    ).toBeTruthy();
  });

  it('maps other API errors through userMessageForError', async () => {
    mockAuthValue.changePassword = jest
      .fn()
      .mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(
      await screen.findByText(
        'The service is temporarily unavailable. Please try again later.',
      ),
    ).toBeTruthy();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.changePassword = jest
      .fn()
      .mockRejectedValue(new Error('storage full'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(
      await screen.findByText(
        'Could not change your password. Please try again.',
      ),
    ).toBeTruthy();
  });
});

// ----- delete account -----

async function typePassword(password: string) {
  await fireEvent.changeText(
    screen.getByPlaceholderText('Your password'),
    password,
  );
}

function deleteButton() {
  return screen.getByRole('button', { name: 'Delete My Account' });
}

describe('delete account screen', () => {
  it('renders the permanence warning and keeps delete disabled initially', async () => {
    await renderScreen(<DeleteAccountScreen />);
    expect(screen.getByText('This action is permanent')).toBeTruthy();
    expect(deleteButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects passwords over the UTF-8 byte limit client-side', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('a'.repeat(73));
    expect(
      screen.getByText('Password must be at most 72 UTF-8 bytes.'),
    ).toBeTruthy();
    expect(deleteButton().props.accessibilityState.disabled).toBe(true);
  });

  it('asks for confirmation before deleting', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete your account?',
      'This permanently deletes your account and all progress. This cannot be undone.',
      expect.any(Array),
    );
    expect(mockAuthValue.deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the account, clears cached data, and returns to the gate', async () => {
    const queryClient = makeQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');
    await renderScreen(<DeleteAccountScreen />, queryClient);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    await waitFor(() =>
      expect(mockAuthValue.deleteAccount).toHaveBeenCalledWith('password1'),
    );
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Account deleted',
        'Your account and all its data have been deleted.',
        expect.any(Array),
      ),
    );
    expect(clearSpy).toHaveBeenCalled();

    await pressAlertButton('OK');
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('shows the busy state while deleting', async () => {
    let resolveDelete!: () => void;
    mockAuthValue.deleteAccount = jest.fn(
      () => new Promise<void>((resolve) => (resolveDelete = resolve)),
    );
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(await screen.findByText('Deleting…')).toBeTruthy();
    await act(async () => resolveDelete());
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Account deleted',
        expect.any(String),
        expect.any(Array),
      ),
    );
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.deleteAccount = jest
      .fn()
      .mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(await screen.findByText('Incorrect password.')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.deleteAccount = jest
      .fn()
      .mockRejectedValue(new ApiError(429, 'slow down'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(
      await screen.findByText('Too many attempts, please try again later.'),
    ).toBeTruthy();
  });

  it('surfaces local cleanup failures after deletion', async () => {
    mockAuthValue.deleteAccount = jest
      .fn()
      .mockRejectedValue(new AccountDeletedCleanupError());
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(
      await screen.findByText(
        'Your account was deleted, but local session cleanup failed. Restart the app before signing in again.',
      ),
    ).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.deleteAccount = jest
      .fn()
      .mockRejectedValue(new Error('network down'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(
      await screen.findByText(
        'Could not delete your account. Please try again.',
      ),
    ).toBeTruthy();
  });
});
