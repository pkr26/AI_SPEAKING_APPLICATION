import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { Fiber, TestInstance } from 'test-renderer';
import React from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';

import ChangePasswordScreen from '../src/app/settings/change-password';
import DeleteAccountScreen from '../src/app/settings/delete-account';
import PrivacyPolicyScreen from '../src/app/settings/privacy';
import TermsScreen from '../src/app/settings/terms';
import { ApiError } from '../src/lib/api';
import { AccountDeletedCleanupError, MAX_PASSWORD_UTF8_BYTES, useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { colors, layout, radii, spacing } from '../src/lib/theme';
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

jest.mock('../src/lib/use-hardware-back', () => ({
  useHardwareBack: (handler: () => boolean) => {
    mockHardwareBackHandler = handler;
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
  useNavigation: () => mockNavigation,
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
    captureSessionLease: jest.fn(() => ({}) as never),
    isSessionLeaseCurrent: jest.fn(() => true),
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

const LOCKED_NAVIGATION_OPTIONS = {
  headerBackVisible: false,
  gestureEnabled: false,
};

const UNLOCKED_NAVIGATION_OPTIONS = {
  headerBackVisible: true,
  gestureEnabled: true,
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

/** The card shell shared by the change-password and delete-account forms. */
const FORM_CARD_STYLE: SemanticStyle = {
  backgroundColor: colors.card,
  borderRadius: radii.card,
  padding: spacing.lg,
  width: '100%',
  maxWidth: layout.formMaxWidth,
  alignSelf: 'center',
  borderWidth: 1,
  borderColor: colors.border,
};

/** Field caption above every password input on both settings forms. */
const FIELD_LABEL_STYLE: SemanticStyle = {
  fontSize: 14,
  fontWeight: '600',
  color: colors.text,
  marginBottom: 6,
  marginTop: spacing.md,
};

/** The row that positions the Show/Hide control over the password field. */
const INPUT_ROW_STYLE: SemanticStyle = {
  position: 'relative',
  justifyContent: 'center',
};

/** A password input, including the right-hand gutter kept clear for Show. */
const PASSWORD_INPUT_STYLE: SemanticStyle = {
  borderWidth: 1,
  borderColor: colors.inputBorder,
  borderRadius: radii.input,
  paddingHorizontal: 14,
  paddingVertical: spacing.md,
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.inputBackground,
  paddingRight: 64,
};

/** The Show/Hide pressable, sized to the minimum accessible target. */
const INPUT_ACTION_STYLE: SemanticStyle = {
  position: 'absolute',
  right: 4,
  minHeight: layout.minimumTarget,
  minWidth: layout.minimumTarget,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: spacing.sm,
};

/** The Show/Hide caption itself. */
const INPUT_ACTION_TEXT_STYLE: SemanticStyle = {
  color: colors.primary,
  fontSize: 14,
  fontWeight: '600',
};

/** Inline, per-field validation copy. */
const FIELD_ERROR_STYLE: SemanticStyle = {
  marginTop: 6,
  color: colors.danger,
  fontSize: 13,
};

/** Form-level failure copy announced as an alert. */
const FORM_ERROR_STYLE: SemanticStyle = {
  marginTop: 14,
  color: colors.danger,
  fontSize: 14,
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

/**
 * Return the Pressable callback committed for a queried host node without
 * opening RNTL's own async act scope. This is only for same-render
 * re-entrancy tests, where awaiting one fireEvent would commit the busy state
 * before the second activation lands.
 */
function committedPressHandler(node: TestInstance): () => unknown {
  let fiber: Fiber | null = node.unstable_fiber;
  while (fiber) {
    const props = fiber.memoizedProps as { onPress?: unknown } | null;
    if (typeof props?.onPress === 'function') return props.onPress as () => unknown;
    if (fiber.return === null || typeof fiber.return.type === 'string') break;
    fiber = fiber.return;
  }
  throw new Error('No committed press handler found');
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

function expectFirstNavigationUpdate(expected: typeof LOCKED_NAVIGATION_OPTIONS): void {
  expect(mockSetOptions).toHaveBeenCalled();
  expect(mockSetOptions.mock.calls[0]?.[0]).toEqual(expected);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBeforeRemoveListener = null;
  mockHardwareBackHandler = null;
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

  it('captions every field and reveal control with visible copy', async () => {
    await renderScreen(<ChangePasswordScreen />);

    expect(screen.getByText(t('cp.currentLabel'))).toBeTruthy();
    expect(screen.getByText(t('cp.newLabel'))).toBeTruthy();
    expect(screen.getByText(t('cp.confirmLabel'))).toBeTruthy();
    // One reveal control per field, all resting on Show.
    expect(screen.getAllByText(t('common.show'))).toHaveLength(3);
    expect(screen.queryByText(t('common.hide'))).toBeNull();

    await fireEvent.press(screen.getAllByRole('button', { name: t('common.showPassword') })[1]);
    expect(screen.getByText(t('common.hide'))).toBeTruthy();
    expect(screen.getAllByText(t('common.show'))).toHaveLength(2);
  });

  it('lays out the change-password form on the shared token scale', async () => {
    await renderScreen(<ChangePasswordScreen />);

    expect(flattenedStyle(screen.getByTestId('keyboard-avoiding-view'))).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    expect(scrollContentStyle()).toEqual({ flexGrow: 1, padding: spacing.xl });
    expect(flattenedStyle(parentOf(screen.getByText(t('cp.currentLabel'))))).toEqual(
      FORM_CARD_STYLE,
    );
    for (const key of ['cp.currentLabel', 'cp.newLabel', 'cp.confirmLabel'] as const) {
      expect(flattenedStyle(screen.getByText(t(key)))).toEqual(FIELD_LABEL_STYLE);
    }
    expect(flattenedStyle(updateButton())).toMatchObject({ marginTop: spacing.lg });
  });

  it('overlays a reveal control inside every password field', async () => {
    await renderScreen(<ChangePasswordScreen />);

    for (const key of ['cp.currentLabel', 'cp.newLabel', 'cp.confirmLabel'] as const) {
      const input = screen.getByLabelText(t(key));
      expect(flattenedStyle(parentOf(input))).toEqual(INPUT_ROW_STYLE);
      // Each field reserves room on the right so its text never runs under Show.
      expect(flattenedStyle(input)).toEqual(PASSWORD_INPUT_STYLE);
    }
    for (const toggle of screen.getAllByRole('button', { name: t('common.showPassword') })) {
      expect(flattenedStyle(toggle)).toEqual(INPUT_ACTION_STYLE);
    }
    for (const caption of screen.getAllByText(t('common.show'))) {
      expect(flattenedStyle(caption)).toEqual(INPUT_ACTION_TEXT_STYLE);
    }
  });

  it('ignores a keyboard submit until every field validates', async () => {
    await renderScreen(<ChangePasswordScreen />);
    const submitFromKeyboard = () =>
      fireEvent(screen.getByLabelText(t('cp.confirmLabel')), 'submitEditing');

    await submitFromKeyboard();
    await fillChangePassword('oldpass1', 'newpass1', 'newpass2');
    await submitFromKeyboard();
    await fillChangePassword('', 'newpass1', 'newpass1');
    await submitFromKeyboard();
    await fillChangePassword('a'.repeat(73), 'newpass1', 'newpass1');
    await submitFromKeyboard();
    await fillChangePassword('oldpass1', 'short', 'short');
    await submitFromKeyboard();

    expect(mockAuthValue.changePassword).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
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
        // Show clears secureTextEntry, which is what suppresses the keyboard
        // defaults; a revealed field must still not capitalize or autocorrect.
        autoCapitalize: 'none',
        autoCorrect: false,
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
    const fieldError = screen.getByText(t('password.tooLong'));
    expect(fieldError.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenedStyle(fieldError)).toEqual(FIELD_ERROR_STYLE);
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

  it('locks only back navigation for exactly the lifetime of a password change', async () => {
    const change = deferred<void>();
    mockAuthValue.changePassword = jest.fn(() => change.promise);
    await renderScreen(<ChangePasswordScreen />);

    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();

    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    mockSetOptions.mockClear();
    await act(async () => {
      committedPressHandler(updateButton())();
      // The ref and native header lock must publish before React can commit
      // the render-time busy state.
      expect(hardwareBackIsHandled()).toBe(true);
      expectFirstNavigationUpdate(LOCKED_NAVIGATION_OPTIONS);
    });
    expect(mockAuthValue.changePassword).toHaveBeenCalledTimes(1);

    expect(dispatchBeforeRemove('GO_BACK')).toHaveBeenCalledTimes(1);
    expect(dispatchBeforeRemove('RESET')).not.toHaveBeenCalled();

    mockSetOptions.mockClear();
    await act(async () => change.resolve(undefined));

    expectFirstNavigationUpdate(UNLOCKED_NAVIGATION_OPTIONS);
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();
  });

  it('drops password-change completion effects after the screen unmounts', async () => {
    const change = deferred<void>();
    mockAuthValue.changePassword = jest.fn(() => change.promise);
    const rendered = await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');

    await act(async () => {
      committedPressHandler(updateButton())();
    });
    expect(mockAuthValue.changePassword).toHaveBeenCalledTimes(1);
    expect(hardwareBackIsHandled()).toBe(true);

    await rendered.unmount();
    mockSetOptions.mockClear();
    alertSpy.mockClear();
    await act(async () => {
      change.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    // busyRef must still be released, but no route-local state, navigation
    // options, or success dialog may publish from the stale continuation.
    expect(hardwareBackIsHandled()).toBe(false);
    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('drops a late password-change failure and its finalizer after unmount', async () => {
    const change = deferred<void>();
    mockAuthValue.changePassword = jest.fn(() => change.promise);
    const rendered = await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await act(async () => {
      committedPressHandler(updateButton())();
    });
    expect(mockAuthValue.changePassword).toHaveBeenCalledTimes(1);

    await rendered.unmount();
    mockSetOptions.mockClear();
    alertSpy.mockClear();
    await act(async () => {
      change.reject(new Error('late failure'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('makes the password-success Alert action inert once its screen is gone', async () => {
    const rendered = await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const confirm = alertButtons().find((button) => button.text === t('common.ok'))?.onPress;
    if (!confirm) throw new Error('Password success callback was not registered');

    await rendered.unmount();
    await act(async () => confirm());

    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('changes the password once when Update is pressed twice before a re-render', async () => {
    // canSubmit reads the render-time busy flag, so a second press landing in
    // the same committed render still passes it. The second request would fail
    // in the auth transition guard and paint that error under the success
    // alert while re-arming the button mid-flight.
    const change = deferred<void>();
    mockAuthValue.changePassword = jest.fn(() => change.promise);
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');

    const preventDefault = jest.fn();
    await act(async () => {
      const press = committedPressHandler(updateButton());
      press();
      mockBeforeRemoveListener?.({
        data: { action: { type: 'GO_BACK' } },
        preventDefault,
      });
      press();
    });

    expect(mockAuthValue.changePassword).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });

    await act(async () => change.resolve(undefined));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('cp.updatedTitle'),
        t('cp.updatedBody'),
        expect.any(Array),
      ),
    );
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.changePassword = jest.fn().mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderScreen(<ChangePasswordScreen />);
    await fillChangePassword('oldpass1', 'newpass1', 'newpass1');
    await fireEvent.press(updateButton());

    const alert = await screen.findByText(t('cp.wrongCurrent'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(alert)).toEqual(FORM_ERROR_STYLE);
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
    expect(flattenedStyle(screen.getByRole('header', { name: t('da.warningTitle') }))).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.danger,
    });
    const warningBody = screen.getByText(t('da.warningBody'));
    expect(flattenedStyle(warningBody)).toEqual({
      marginTop: spacing.sm,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    });
    expect(flattenedStyle(parentOf(warningBody))).toEqual({
      backgroundColor: colors.dangerLight,
      borderRadius: radii.card,
      padding: spacing.lg,
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: colors.danger,
      marginBottom: spacing.ml,
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
      autoCapitalize: 'none',
      autoComplete: 'password',
      autoCorrect: false,
      textContentType: 'password',
      returnKeyType: 'done',
      maxLength: MAX_PASSWORD_UTF8_BYTES,
    });
  });

  it('captions the password field and its reveal control with visible copy', async () => {
    await renderScreen(<DeleteAccountScreen />);

    expect(screen.getByText(t('da.passwordLabel'))).toBeTruthy();
    expect(screen.getByText(t('common.show'))).toBeTruthy();
    expect(screen.queryByText(t('common.hide'))).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: t('common.showPassword') }));
    expect(screen.getByText(t('common.hide'))).toBeTruthy();
    expect(screen.queryByText(t('common.show'))).toBeNull();
  });

  it('lays out the delete-account screen on the shared token scale', async () => {
    await renderScreen(<DeleteAccountScreen />);

    expect(flattenedStyle(screen.getByTestId('keyboard-avoiding-view'))).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    expect(scrollContentStyle()).toEqual({ flexGrow: 1, padding: spacing.xl });
    const passwordLabel = screen.getByText(t('da.passwordLabel'));
    expect(flattenedStyle(parentOf(passwordLabel))).toEqual(FORM_CARD_STYLE);
    expect(flattenedStyle(passwordLabel)).toEqual(FIELD_LABEL_STYLE);
    expect(flattenedStyle(deleteButton())).toMatchObject({ marginTop: spacing.lg });
  });

  it('overlays the reveal control inside the password field', async () => {
    await renderScreen(<DeleteAccountScreen />);

    const input = screen.getByLabelText(t('da.passwordLabel'));
    expect(flattenedStyle(parentOf(input))).toEqual(INPUT_ROW_STYLE);
    // The field reserves room on the right so the text never runs under Show.
    expect(flattenedStyle(input)).toEqual(PASSWORD_INPUT_STYLE);
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.showPassword') }))).toEqual(
      INPUT_ACTION_STYLE,
    );
    expect(flattenedStyle(screen.getByText(t('common.show')))).toEqual(INPUT_ACTION_TEXT_STYLE);
  });

  it('never opens the destructive confirmation while the password is unusable', async () => {
    await renderScreen(<DeleteAccountScreen />);
    const submitFromKeyboard = () =>
      fireEvent(screen.getByLabelText(t('da.passwordLabel')), 'submitEditing');

    await submitFromKeyboard();
    await typePassword('a'.repeat(73));
    await submitFromKeyboard();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockAuthValue.deleteAccount).not.toHaveBeenCalled();
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
      expect.any(Object),
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
    const fieldError = screen.getByText(t('password.tooLong'));
    expect(fieldError.props.accessibilityLiveRegion).toBe('polite');
    expect(flattenedStyle(fieldError)).toEqual(FIELD_ERROR_STYLE);
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
      t('da.confirmTitle'),
      t('da.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: expect.any(Function) },
        { text: t('da.confirmDelete'), style: 'destructive', onPress: expect.any(Function) },
      ],
      expect.objectContaining({ cancelable: true, onDismiss: expect.any(Function) }),
    );
    expect(mockAuthValue.deleteAccount).not.toHaveBeenCalled();
  });

  it('locks only back navigation while deletion confirmation is open', async () => {
    await renderScreen(<DeleteAccountScreen />);
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();

    await typePassword('password1');
    mockSetOptions.mockClear();
    await fireEvent.press(deleteButton());

    expectFirstNavigationUpdate(LOCKED_NAVIGATION_OPTIONS);
    expect(hardwareBackIsHandled()).toBe(true);
    expect(deleteButton().props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(dispatchBeforeRemove('GO_BACK')).toHaveBeenCalledTimes(1);
    expect(dispatchBeforeRemove('REPLACE')).not.toHaveBeenCalled();

    mockSetOptions.mockClear();
    await pressAlertButton(t('common.cancel'));

    expectFirstNavigationUpdate(UNLOCKED_NAVIGATION_OPTIONS);
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();
    expect(deleteButton().props.accessibilityState.disabled).toBe(false);
  });

  it('does not let a cancelled delete confirmation run from its captured callback', async () => {
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    const cancel = alertButtons().find((button) => button.text === t('common.cancel'))?.onPress;
    const confirmDelete = alertButtons().find(
      (button) => button.text === t('da.confirmDelete'),
    )?.onPress;
    if (!cancel || !confirmDelete) throw new Error('Delete callbacks were not registered');
    mockSetOptions.mockClear();

    await act(async () => {
      cancel();
      confirmDelete();
      await Promise.resolve();
    });

    expect(mockAuthValue.deleteAccount).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenLastCalledWith(UNLOCKED_NAVIGATION_OPTIONS);
    expect(deleteButton().props.accessibilityState).toEqual({ disabled: false, busy: false });
  });

  it('ignores every captured confirmation callback after unmount', async () => {
    const rendered = await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());

    const confirmationCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const buttons = (confirmationCall?.[2] ?? []) as {
      text?: string;
      onPress?: () => void;
    }[];
    const cancel = buttons.find((button) => button.text === t('common.cancel'))?.onPress;
    const confirmDelete = buttons.find((button) => button.text === t('da.confirmDelete'))?.onPress;
    const onDismiss = (confirmationCall?.[3] as { onDismiss?: () => void } | undefined)?.onDismiss;
    expect(cancel).toEqual(expect.any(Function));
    expect(confirmDelete).toEqual(expect.any(Function));
    expect(onDismiss).toEqual(expect.any(Function));

    await rendered.unmount();
    mockSetOptions.mockClear();
    await act(async () => {
      cancel?.();
      onDismiss?.();
      confirmDelete?.();
    });

    expect(hardwareBackIsHandled()).toBe(false);
    expect(mockSetOptions).not.toHaveBeenCalled();
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

  it('makes the deletion-success Alert action inert after the protected screen is gone', async () => {
    const rendered = await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('da.deletedTitle'),
        t('da.deletedBody'),
        expect.any(Array),
      ),
    );
    const acknowledge = alertButtons().find((button) => button.text === t('common.ok'))?.onPress;
    if (!acknowledge) throw new Error('Deletion success callback was not registered');

    await rendered.unmount();
    await act(async () => acknowledge());

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('keeps the deletion result but drops route-local finalizer effects after unmount', async () => {
    const deletion = deferred<void>();
    mockAuthValue.deleteAccount = jest.fn(() => deletion.promise);
    const queryClient = makeQueryClient();
    const clearSpy = jest.spyOn(queryClient, 'clear');
    const rendered = await renderScreen(<DeleteAccountScreen />, queryClient);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));
    expect(mockAuthValue.deleteAccount).toHaveBeenCalledTimes(1);
    expect(hardwareBackIsHandled()).toBe(true);

    await rendered.unmount();
    mockSetOptions.mockClear();
    alertSpy.mockClear();
    await act(async () => {
      deletion.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Account deletion and its native confirmation outlive the protected
    // route, but stale screen state/options must not be published afterward.
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      t('da.deletedTitle'),
      t('da.deletedBody'),
      expect.any(Array),
    );
    expect(hardwareBackIsHandled()).toBe(false);
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('drops a late generic deletion failure and its finalizer after unmount', async () => {
    const deletion = deferred<void>();
    mockAuthValue.deleteAccount = jest.fn(() => deletion.promise);
    const rendered = await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));
    expect(mockAuthValue.deleteAccount).toHaveBeenCalledTimes(1);

    await rendered.unmount();
    mockSetOptions.mockClear();
    alertSpy.mockClear();
    await act(async () => {
      deletion.reject(new Error('late failure'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
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

  it('keeps deletion locked while pending and opens a fresh confirmation after failure', async () => {
    const deletion = deferred<void>();
    mockAuthValue.deleteAccount = jest
      .fn()
      .mockImplementationOnce(() => deletion.promise)
      .mockResolvedValueOnce(undefined);
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));

    expect(mockAuthValue.deleteAccount).toHaveBeenCalledTimes(1);
    expect(hardwareBackIsHandled()).toBe(true);
    expect(dispatchBeforeRemove('GO_BACK')).toHaveBeenCalledTimes(1);
    expect(dispatchBeforeRemove('RESET')).not.toHaveBeenCalled();

    mockSetOptions.mockClear();
    await act(async () => deletion.reject(new Error('network down')));
    expect(await screen.findByText(t('da.failed'))).toBeTruthy();

    expectFirstNavigationUpdate(UNLOCKED_NAVIGATION_OPTIONS);
    expect(hardwareBackIsHandled()).toBe(false);
    expect(dispatchBeforeRemove('GO_BACK')).not.toHaveBeenCalled();

    const confirmationsBeforeRetry = alertSpy.mock.calls.filter(
      ([title]) => title === t('da.confirmTitle'),
    ).length;
    await fireEvent.press(deleteButton());
    expect(alertSpy.mock.calls.filter(([title]) => title === t('da.confirmTitle'))).toHaveLength(
      confirmationsBeforeRetry + 1,
    );
    expect(hardwareBackIsHandled()).toBe(true);

    await pressAlertButton(t('common.cancel'));
  });

  it('shows a credential error on 401', async () => {
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new ApiError(401, 'unauthorized'));
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));

    const alert = await screen.findByText(t('da.wrongPassword'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(flattenedStyle(alert)).toEqual(FORM_ERROR_STYLE);
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

  it('surfaces local cleanup failures after deletion in an alert', async () => {
    // The session is already reset when this rejects, so the route guard has
    // unmounted this screen: inline copy would never be seen, and a native
    // alert is the only way the "restart before logging in again" instruction
    // reaches the learner.
    mockAuthValue.deleteAccount = jest.fn().mockRejectedValue(new AccountDeletedCleanupError());
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');
    await fireEvent.press(deleteButton());
    await pressAlertButton(t('da.confirmDelete'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('da.deletedTitle'),
        t('auth.accountDeletedCleanupFailed'),
      ),
    );
    expect(screen.queryByText(t('auth.accountDeletedCleanupFailed'))).toBeNull();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('opens one locked confirmation and deletes once after a same-frame double tap', async () => {
    const deletion = deferred<void>();
    mockAuthValue.deleteAccount = jest.fn(() => deletion.promise);
    await renderScreen(<DeleteAccountScreen />);
    await typePassword('password1');

    const openConfirmation = committedPressHandler(deleteButton());
    const preventDefault = jest.fn();
    await act(async () => {
      openConfirmation();
      mockBeforeRemoveListener?.({
        data: { action: { type: 'GO_BACK' } },
        preventDefault,
      });
      openConfirmation();
    });
    const confirmations = alertSpy.mock.calls.map(
      (call) =>
        (call[2] as { text?: string; onPress?: () => void }[]).find(
          (button) => button.text === t('da.confirmDelete'),
        )?.onPress,
    );
    expect(confirmations).toHaveLength(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);

    await act(async () => confirmations[0]?.());

    expect(mockAuthValue.deleteAccount).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('da.failed'))).toBeNull();
    expect(
      screen.getByRole('button', { name: t('da.submitBusy') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: true });

    await act(async () => deletion.resolve(undefined));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('da.deletedTitle'),
        t('da.deletedBody'),
        expect.any(Array),
      ),
    );
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

/**
 * Privacy and terms share one static reading layout: a centred measure, a
 * primary-tinted placeholder note, and evenly spaced body paragraphs.
 */
function expectLegalLayout(headerKey: MessageKey, paragraphKeys: readonly MessageKey[]): void {
  expect(scrollContentStyle()).toEqual({
    flexGrow: 1,
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  });
  expect(flattenedStyle(screen.getByRole('header', { name: t(headerKey) }))).toEqual({
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  });

  const note = screen.getByText(t('legal.placeholderNote'));
  expect(flattenedStyle(parentOf(note))).toEqual({
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.md,
  });
  expect(flattenedStyle(note)).toEqual({
    fontSize: 14,
    lineHeight: 20,
    color: colors.primaryDark,
  });

  for (const key of paragraphKeys) {
    expect(flattenedStyle(screen.getByText(t(key)))).toEqual({
      marginTop: spacing.lg,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    });
  }
}

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

  it('lays out the privacy policy on the shared reading measure', async () => {
    await renderScreen(<PrivacyPolicyScreen />);

    expectLegalLayout('header.privacy', ['privacy.p1', 'privacy.p2', 'privacy.p3']);
  });

  it('lays out the terms on the shared reading measure', async () => {
    await renderScreen(<TermsScreen />);

    expectLegalLayout('header.terms', ['terms.p1', 'terms.p2', 'terms.p3']);
  });
});
