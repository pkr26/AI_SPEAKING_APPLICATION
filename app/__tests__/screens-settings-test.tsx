import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import ChangePasswordScreen from '../src/app/settings/change-password';
import DeleteAccountScreen from '../src/app/settings/delete-account';
import { ApiError } from '../src/lib/api';
import { AccountDeletedCleanupError, MAX_PASSWORD_UTF8_BYTES, useAuth } from '../src/lib/auth';
import { colors, layout } from '../src/lib/theme';
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
    restoreError: null,
    retrySessionRestore: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    changePassword: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
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
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
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

async function withPlatformOS(os: 'ios' | 'android', run: () => Promise<void>): Promise<void> {
  const originalOS = Object.getOwnPropertyDescriptor(Platform, 'OS');
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
  try {
    await run();
  } finally {
    if (originalOS) Object.defineProperty(Platform, 'OS', originalOS);
  }
}

function alertButtons(): {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}[] {
  const calls = alertSpy.mock.calls;
  if (calls.length === 0) throw new Error('Alert.alert was not called');
  return (calls[calls.length - 1][2] ?? []) as {
    text?: string;
    style?: 'default' | 'cancel' | 'destructive';
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

async function fillChangePassword(current: string, next: string, confirm: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Your current password'), current);
  await fireEvent.changeText(
    screen.getByPlaceholderText('At least 8 characters, with a letter and a number'),
    next,
  );
  await fireEvent.changeText(screen.getByPlaceholderText('Repeat the new password'), confirm);
}

function updateButton() {
  return screen.getByRole('button', { name: 'Update Password' });
}

describe('change password screen', () => {
  it('keeps Update disabled until all fields validate', async () => {
    await renderScreen(<ChangePasswordScreen />);
    expect(screen.getByLabelText('Current password').props.value).toBe('');
    expect(screen.getByLabelText('New password').props.value).toBe('');
    expect(screen.getByLabelText('Confirm new password').props.value).toBe('');
    expect(screen.queryByText('Password must be at least 8 characters.')).toBeNull();
    expect(screen.queryByText('Passwords do not match.')).toBeNull();
    expect(flattenedStyle(updateButton())).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.primary,
      minHeight: layout.minimumTarget,
      opacity: 0.5,
    });
    expect(updateButton().props.accessibilityState.disabled).toBe(true);

    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    expect(screen.queryByText('Passwords do not match.')).toBeNull();
    expect(updateButton().props.accessibilityState.disabled).toBe(false);
    expect(flattenedStyle(updateButton()).opacity).toBeUndefined();
    await expectPressFeedback(
      updateButton,
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('requires an explicit matching confirmation and exposes complete disabled state', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', '');

    expect(screen.queryByText('Passwords do not match.')).toBeNull();
    expect(updateButton().props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(mockAuthValue.changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ] as const)('uses the %s keyboard-avoidance behavior', async (os, expectedBehavior) => {
    await withPlatformOS(os, async () => {
      await renderScreen(<ChangePasswordScreen />);

      expect(screen.getByTestId('keyboard-avoiding-view').props.behavior).toBe(expectedBehavior);
    });
  });

  it('does not submit valid replacement fields without the current password', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('', 'newpass1', 'newpass1');

    expect(updateButton().props.accessibilityState).toEqual({ disabled: true, busy: false });
    await fireEvent.press(updateButton());
    expect(mockAuthValue.changePassword).not.toHaveBeenCalled();
  });

  it('configures every password field as private with the shared input limit', async () => {
    await renderScreen(<ChangePasswordScreen />);

    for (const label of ['Current password', 'New password', 'Confirm new password']) {
      expect(screen.getByLabelText(label).props).toMatchObject({
        secureTextEntry: true,
        maxLength: MAX_PASSWORD_UTF8_BYTES,
      });
    }
    expect(screen.getByLabelText('Current password').props.textContentType).toBe('password');
    expect(screen.getByLabelText('New password').props.textContentType).toBe('newPassword');
    expect(screen.getByLabelText('Confirm new password').props.textContentType).toBe('newPassword');
  });

  it('shows a mismatch error when confirmation differs', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass2');
    expect(screen.getByText('Passwords do not match.').props.accessibilityLiveRegion).toBe(
      'polite',
    );
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('enforces the password policy on the new password', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'short', 'short');
    expect(
      screen.getByText('Password must be at least 8 characters.').props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(updateButton().props.accessibilityState.disabled).toBe(true);

    await fillChangePassword('oldpass1', 'abcdefgh', 'abcdefgh');
    expect(
      screen.getByText('Password must include at least one letter and one number.'),
    ).toBeTruthy();
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects current passwords over the UTF-8 byte limit', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('a'.repeat(73), 'newpass1', 'newpass1');
    expect(screen.getByText('Password must be at most 72 UTF-8 bytes.')).toBeTruthy();
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('changes the password and navigates back after confirmation', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    await waitFor(() =>
      expect(mockAuthValue.changePassword).toHaveBeenCalledWith('oldpass1', 'newpass1'),
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
    const change = deferred<void>();
    mockAuthValue.changePassword = jest.fn(() => change.promise);
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    // fireEvent.press awaits the async handler; keep it pending while busy.
    const pressPromise = fireEvent.press(updateButton());

    try {
      const busyButton = await screen.findByRole('button', {
        name: 'Updating…',
      });
      expect(busyButton.props.accessibilityState).toEqual({
        disabled: true,
        busy: true,
      });
    } finally {
      try {
        await act(async () => change.resolve(undefined));
      } finally {
        await pressPromise;
      }
    }
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.changePassword = jest.fn().mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(await screen.findByText('Current password is incorrect.')).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.changePassword = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(await screen.findByText('Too many attempts, please try again later.')).toBeTruthy();
  });

  it('maps other API errors through userMessageForError', async () => {
    mockAuthValue.changePassword = jest.fn().mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(
      await screen.findByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.changePassword = jest
      .fn()
      .mockRejectedValueOnce(new Error('storage full'))
      .mockResolvedValueOnce(undefined);
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(
      await screen.findByText('Could not change your password. Please try again.'),
    ).toBeTruthy();
    expect(updateButton().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(updateButton());
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Password updated',
        expect.any(String),
        expect.any(Array),
      ),
    );
    expect(mockAuthValue.changePassword).toHaveBeenCalledTimes(2);
  });
});

// ----- delete account -----

async function typePassword(password: string) {
  await fireEvent.changeText(screen.getByPlaceholderText('Your password'), password);
}

function deleteButton() {
  return screen.getByRole('button', { name: 'Delete My Account' });
}

describe('delete account screen', () => {
  it('renders the permanence warning and keeps delete disabled initially', async () => {
    await renderScreen(<DeleteAccountScreen />);
    expect(
      flattenedStyle(screen.getByRole('header', { name: 'This action is permanent' })),
    ).toMatchObject({ color: colors.danger });
    const warningCard = screen.getByRole('header', { name: 'This action is permanent' }).parent;
    if (!warningCard) throw new Error('Permanence warning has no rendered card');
    expect(flattenedStyle(warningCard)).toMatchObject({
      backgroundColor: colors.dangerLight,
      borderColor: colors.danger,
      alignSelf: 'center',
      maxWidth: layout.formMaxWidth,
      width: '100%',
    });
    expect(flattenedStyle(deleteButton())).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.danger,
      minHeight: layout.minimumTarget,
      opacity: 0.5,
    });
    expect(deleteButton().props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(screen.getByLabelText('Confirm your password').props).toMatchObject({
      secureTextEntry: true,
      textContentType: 'password',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it.each([
    ['ios', 'padding'],
    ['android', undefined],
  ] as const)('uses the %s keyboard-avoidance behavior', async (os, expectedBehavior) => {
    await withPlatformOS(os, async () => {
      await renderScreen(<DeleteAccountScreen />);

      expect(screen.getByTestId('keyboard-avoiding-view').props.behavior).toBe(expectedBehavior);
    });
  });

  it('rejects passwords over the UTF-8 byte limit client-side', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('a'.repeat(73));
    expect(screen.getByText('Password must be at most 72 UTF-8 bytes.')).toBeTruthy();
    expect(deleteButton().props.accessibilityState.disabled).toBe(true);
  });

  it('asks for confirmation before deleting', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    expect(flattenedStyle(deleteButton()).opacity).toBeUndefined();
    await expectPressFeedback(
      deleteButton,
      { backgroundColor: colors.danger },
      { backgroundColor: colors.danger, opacity: 0.85 },
    );
    await fireEvent.press(deleteButton());

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete your account?',
      'This permanently deletes your account and all progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: expect.any(Function) },
      ],
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

    await waitFor(() => expect(mockAuthValue.deleteAccount).toHaveBeenCalledWith('password1'));
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
    const deletion = deferred<void>();
    mockAuthValue.deleteAccount = jest.fn(() => deletion.promise);
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    const pressPromise = pressAlertButton('Delete');

    try {
      const busyButton = await screen.findByRole('button', { name: 'Deleting…' });
      expect(busyButton.props.accessibilityState).toEqual({ disabled: true, busy: true });
    } finally {
      try {
        await pressPromise;
      } finally {
        await act(async () => deletion.resolve(undefined));
      }
    }
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Account deleted',
        expect.any(String),
        expect.any(Array),
      ),
    );
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(await screen.findByText('Incorrect password.')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(await screen.findByText('Too many attempts, please try again later.')).toBeTruthy();
  });

  it('maps delete service failures to safe shared copy', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new ApiError(500, 'private detail'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(
      await screen.findByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
  });

  it('surfaces local cleanup failures after deletion', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new AccountDeletedCleanupError());
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
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(undefined);
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');

    expect(
      await screen.findByText('Could not delete your account. Please try again.'),
    ).toBeTruthy();
    expect(deleteButton().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(deleteButton());
    await pressAlertButton('Delete');
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Account deleted',
        expect.any(String),
        expect.any(Array),
      ),
    );
    expect(mockAuthValue.deleteAccount).toHaveBeenCalledTimes(2);
  });
});
