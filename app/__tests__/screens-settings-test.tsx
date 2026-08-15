import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import ChangePasswordScreen from '../src/app/settings/change-password';
import DeleteAccountScreen from '../src/app/settings/delete-account';
import PrivacyPolicyScreen from '../src/app/settings/privacy';
import TermsScreen from '../src/app/settings/terms';
import { ApiError } from '../src/lib/api';
import { AccountDeletedCleanupError, MAX_PASSWORD_UTF8_BYTES, useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { colors, layout } from '../src/lib/theme';
import type { User } from '../src/lib/types';

// Under jest no I18nProvider is mounted, so the screens fall back to English;
// assert against the same typed catalog the screens render from.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

interface MockKeyboardAvoidingViewProps {
  behavior?: 'height' | 'position' | 'padding';
  children?: React.ReactNode;
  keyboardVerticalOffset?: number;
  style?: unknown;
}

function MockKeyboardAvoidingView({
  behavior,
  children,
  keyboardVerticalOffset,
  style,
}: MockKeyboardAvoidingViewProps) {
  return React.createElement(
    'KeyboardAvoidingView',
    { behavior, keyboardVerticalOffset, style, testID: 'keyboard-avoiding-view' },
    children,
  );
}

jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => ({
  __esModule: true,
  default: MockKeyboardAvoidingView,
}));

// Both settings screens sit under a visible navigation header; keyboard
// avoidance must offset by its measured height.
const MOCK_HEADER_HEIGHT = 64;

jest.mock('expo-router/react-navigation', () => ({
  useHeaderHeight: () => MOCK_HEADER_HEIGHT,
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
    resetStoredSession: jest.fn(),
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
  await fireEvent.changeText(screen.getByPlaceholderText(t('cp.currentPlaceholder')), current);
  await fireEvent.changeText(screen.getByPlaceholderText(t('signup.passwordPlaceholder')), next);
  await fireEvent.changeText(screen.getByPlaceholderText(t('cp.confirmPlaceholder')), confirm);
}

function updateButton() {
  return screen.getByRole('button', { name: t('cp.submit') });
}

describe('change password screen', () => {
  it('keeps Update disabled until all fields validate', async () => {
    await renderScreen(<ChangePasswordScreen />);
    expect(screen.getByLabelText(t('cp.currentLabel')).props.value).toBe('');
    expect(screen.getByLabelText(t('cp.newLabel')).props.value).toBe('');
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.value).toBe('');
    expect(screen.queryByText(t('password.tooShort'))).toBeNull();
    expect(screen.queryByText(t('cp.mismatch'))).toBeNull();
    expect(flattenedStyle(updateButton())).toMatchObject({
      alignItems: 'center',
      backgroundColor: colors.primary,
      minHeight: layout.minimumTarget,
      opacity: 0.5,
    });
    expect(updateButton().props.accessibilityState.disabled).toBe(true);

    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    expect(screen.queryByText(t('cp.mismatch'))).toBeNull();
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

    expect(screen.queryByText(t('cp.mismatch'))).toBeNull();
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
      expect(screen.getByTestId('keyboard-avoiding-view').props.keyboardVerticalOffset).toBe(
        MOCK_HEADER_HEIGHT,
      );
    });
  });

  it('chains the three password fields and submits from the confirmation field', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    const newFocus = spyOnTextInputFocus(screen.getByLabelText(t('cp.newLabel')));
    const confirmFocus = spyOnTextInputFocus(screen.getByLabelText(t('cp.confirmLabel')));

    await fireEvent(screen.getByLabelText(t('cp.currentLabel')), 'submitEditing');
    expect(newFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('cp.newLabel')), 'submitEditing');
    expect(confirmFocus).toHaveBeenCalledTimes(1);

    await fireEvent(screen.getByLabelText(t('cp.confirmLabel')), 'submitEditing');
    await waitFor(() =>
      expect(mockAuthValue.changePassword).toHaveBeenCalledWith('oldpass1', 'newpass1'),
    );
  });

  it('marks the focused password field with a two-pixel accent border', async () => {
    await renderScreen(<ChangePasswordScreen />);

    await fireEvent(screen.getByLabelText(t('cp.currentLabel')), 'focus');
    expect(flattenedStyle(screen.getByLabelText(t('cp.currentLabel')))).toMatchObject({
      borderWidth: 2,
      borderColor: colors.primary,
    });
    // Only one field carries the focus treatment at a time.
    expect(flattenedStyle(screen.getByLabelText(t('cp.newLabel')))).toMatchObject({
      borderWidth: 1,
      borderColor: colors.inputBorder,
    });
    await fireEvent(screen.getByLabelText(t('cp.currentLabel')), 'blur');

    for (const label of [t('cp.currentLabel'), t('cp.newLabel'), t('cp.confirmLabel')]) {
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

  it('toggles visibility per password field without affecting the others', async () => {
    await renderScreen(<ChangePasswordScreen />);
    const labels = [t('cp.currentLabel'), t('cp.newLabel'), t('cp.confirmLabel')];
    for (const label of labels) {
      expect(screen.getByLabelText(label).props.secureTextEntry).toBe(true);
    }

    // One Show toggle per field, in render order.
    const showToggles = screen.getAllByRole('button', { name: t('common.showPassword') });
    expect(showToggles).toHaveLength(3);

    await fireEvent.press(showToggles[1]);
    expect(screen.getByLabelText(t('cp.currentLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(true);
    expect(screen.getAllByRole('button', { name: t('common.showPassword') })).toHaveLength(3);

    await fireEvent.press(screen.getAllByRole('button', { name: t('common.showPassword') })[0]);
    expect(screen.getByLabelText(t('cp.currentLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getAllByRole('button', { name: t('common.showPassword') })[1]);
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText(t('cp.newLabel')).props.secureTextEntry).toBe(true);
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

    for (const label of [t('cp.currentLabel'), t('cp.newLabel'), t('cp.confirmLabel')]) {
      expect(screen.getByLabelText(label).props).toMatchObject({
        secureTextEntry: true,
        maxLength: MAX_PASSWORD_UTF8_BYTES,
      });
    }
    expect(screen.getByLabelText(t('cp.currentLabel')).props.textContentType).toBe('password');
    expect(screen.getByLabelText(t('cp.currentLabel')).props.autoComplete).toBe('password');
    expect(screen.getByLabelText(t('cp.newLabel')).props.textContentType).toBe('newPassword');
    expect(screen.getByLabelText(t('cp.newLabel')).props.autoComplete).toBe('new-password');
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.textContentType).toBe('newPassword');
    expect(screen.getByLabelText(t('cp.confirmLabel')).props.autoComplete).toBe('new-password');
  });

  it('shows a mismatch error when confirmation differs', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass2');
    expect(screen.getByText(t('cp.mismatch')).props.accessibilityLiveRegion).toBe('polite');
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('enforces the password policy on the new password', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'short', 'short');
    expect(screen.getByText(t('password.tooShort')).props.accessibilityLiveRegion).toBe('polite');
    expect(updateButton().props.accessibilityState.disabled).toBe(true);

    await fillChangePassword('oldpass1', 'abcdefgh', 'abcdefgh');
    expect(screen.getByText(t('password.needsLetterAndNumber'))).toBeTruthy();
    expect(updateButton().props.accessibilityState.disabled).toBe(true);
  });

  it('rejects current passwords over the UTF-8 byte limit', async () => {
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('a'.repeat(73), 'newpass1', 'newpass1');
    expect(screen.getByText(t('password.tooLong'))).toBeTruthy();
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
        t('cp.updatedTitle'),
        t('cp.updatedBody'),
        expect.any(Array),
      ),
    );

    await pressAlertButton(t('common.ok'));
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
        name: t('cp.submitBusy'),
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

    expect(await screen.findByText(t('cp.wrongCurrent'))).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.changePassword = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(await screen.findByText(t('error.tooMany'))).toBeTruthy();
  });

  it('maps other API errors through userMessageForError', async () => {
    mockAuthValue.changePassword = jest.fn().mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
  });

  it('falls back to generic copy for non-API errors', async () => {
    mockAuthValue.changePassword = jest
      .fn()
      .mockRejectedValueOnce(new Error('storage full'))
      .mockResolvedValueOnce(undefined);
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    expect(await screen.findByText(t('cp.failed'))).toBeTruthy();
    expect(updateButton().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(updateButton());
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('cp.updatedTitle'),
        expect.any(String),
        expect.any(Array),
      ),
    );
    expect(mockAuthValue.changePassword).toHaveBeenCalledTimes(2);
  });
});

// ----- delete account -----

async function typePassword(password: string) {
  await fireEvent.changeText(screen.getByPlaceholderText(t('da.passwordPlaceholder')), password);
}

function deleteButton() {
  return screen.getByRole('button', { name: t('da.submit') });
}

describe('delete account screen', () => {
  it('renders the permanence warning and keeps delete disabled initially', async () => {
    await renderScreen(<DeleteAccountScreen />);
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('da.warningTitle') })),
    ).toMatchObject({ color: colors.danger });
    const warningCard = screen.getByRole('header', { name: t('da.warningTitle') }).parent;
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
    expect(screen.getByLabelText(t('da.passwordLabel')).props).toMatchObject({
      secureTextEntry: true,
      autoComplete: 'password',
      textContentType: 'password',
      returnKeyType: 'done',
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
      expect(screen.getByTestId('keyboard-avoiding-view').props.keyboardVerticalOffset).toBe(
        MOCK_HEADER_HEIGHT,
      );
    });
  });

  it('asks for the delete confirmation when submitting from the keyboard', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');

    await fireEvent(screen.getByLabelText(t('da.passwordLabel')), 'submitEditing');

    expect(alertSpy).toHaveBeenCalledWith(
      t('da.confirmTitle'),
      t('da.confirmBody'),
      expect.any(Array),
    );
    expect(mockAuthValue.deleteAccount).not.toHaveBeenCalled();
  });

  it('marks the focused password field with a two-pixel accent border', async () => {
    await renderScreen(<DeleteAccountScreen />);
    const passwordInput = () => screen.getByLabelText(t('da.passwordLabel'));

    expect(flattenedStyle(passwordInput())).toMatchObject({
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
    await renderScreen(<DeleteAccountScreen />);
    expect(screen.getByLabelText(t('da.passwordLabel')).props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByLabelText(t('da.passwordLabel')).props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: t('common.hidePassword') }));
    expect(screen.getByLabelText(t('da.passwordLabel')).props.secureTextEntry).toBe(true);
  });

  it('rejects passwords over the UTF-8 byte limit client-side', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('a'.repeat(73));
    expect(screen.getByText(t('password.tooLong'))).toBeTruthy();
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

    expect(alertSpy).toHaveBeenCalledWith(t('da.confirmTitle'), t('da.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('da.confirmDelete'), style: 'destructive', onPress: expect.any(Function) },
    ]);
    expect(mockAuthValue.deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the account, clears cached data, and returns to the gate', async () => {
    const queryClient = makeQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');
    await renderScreen(<DeleteAccountScreen />, queryClient);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));

    await waitFor(() => expect(mockAuthValue.deleteAccount).toHaveBeenCalledWith('password1'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('da.deletedTitle'),
        t('da.deletedBody'),
        expect.any(Array),
      ),
    );
    expect(clearSpy).toHaveBeenCalled();

    await pressAlertButton(t('common.ok'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('shows the busy state while deleting', async () => {
    const deletion = deferred<void>();
    mockAuthValue.deleteAccount = jest.fn(() => deletion.promise);
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    const pressPromise = pressAlertButton(t('da.confirmDelete'));

    try {
      const busyButton = await screen.findByRole('button', { name: t('da.submitBusy') });
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
        t('da.deletedTitle'),
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
    await pressAlertButton(t('da.confirmDelete'));

    expect(await screen.findByText(t('da.wrongPassword'))).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('shows a rate-limit error on 429', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new ApiError(429, 'slow down'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));

    expect(await screen.findByText(t('error.tooMany'))).toBeTruthy();
  });

  it('maps delete service failures to safe shared copy', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new ApiError(500, 'private detail'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
  });

  it('surfaces local cleanup failures after deletion', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new AccountDeletedCleanupError());
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));

    expect(await screen.findByText(t('auth.accountDeletedCleanupFailed'))).toBeTruthy();
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
    await pressAlertButton(t('da.confirmDelete'));

    expect(await screen.findByText(t('da.failed'))).toBeTruthy();
    expect(deleteButton().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('da.deletedTitle'),
        expect.any(String),
        expect.any(Array),
      ),
    );
    expect(mockAuthValue.deleteAccount).toHaveBeenCalledTimes(2);
  });
});

describe('legal screens', () => {
  it('renders the privacy policy header, placeholder note, and all paragraphs', async () => {
    await renderScreen(<PrivacyPolicyScreen />);

    const title = screen.getByRole('header', { name: t('header.privacy') });
    expect(flattenedStyle(title)).toMatchObject({ color: colors.text });
    expect(screen.getByText(t('legal.placeholderNote'))).toBeTruthy();
    expect(screen.getByText(t('privacy.p1'))).toBeTruthy();
    expect(screen.getByText(t('privacy.p2'))).toBeTruthy();
    expect(screen.getByText(t('privacy.p3'))).toBeTruthy();
  });

  it('renders the terms header, placeholder note, and all paragraphs', async () => {
    await renderScreen(<TermsScreen />);

    const title = screen.getByRole('header', { name: t('header.terms') });
    expect(flattenedStyle(title)).toMatchObject({ color: colors.text });
    expect(screen.getByText(t('legal.placeholderNote'))).toBeTruthy();
    expect(screen.getByText(t('terms.p1'))).toBeTruthy();
    expect(screen.getByText(t('terms.p2'))).toBeTruthy();
    expect(screen.getByText(t('terms.p3'))).toBeTruthy();
  });
});
