import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, StyleSheet, Text, type TextProps } from 'react-native';
import type { Fiber, TestInstance } from 'test-renderer';

import LoginScreen from '../src/app/(auth)/login';
import SignupScreen from '../src/app/(auth)/signup';
import ChangePasswordScreen from '../src/app/settings/change-password';
import DeleteAccountScreen from '../src/app/settings/delete-account';
import SettingsScreen from '../src/app/settings/index';
import Button from '../src/components/Button';
import { apiDeleteAllRecordings, apiRestartDiagnostic, apiUpdateProfile } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import {
  disableDailyReminder,
  enableDailyReminder,
  getDailyReminder,
} from '../src/lib/daily-reminder';
import { setActiveLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
import type { User } from '../src/lib/types';

/**
 * INPUT-STORM adversarial suite: every test fires two (or three) activations of
 * one logical action inside a single committed render — before React can
 * re-render the `busy`/`disabled` state — and asserts the underlying mutation
 * happens exactly once. Guards under test are the synchronous ref latches the
 * screens own (nameBusyRef, languageBusyRef, reminderBusyRef, confirmation
 * owner symbols, busyRef), not the Button's render-time loading flag.
 */

// Under jest no I18nProvider is mounted, so the screens fall back to English;
// assert against the same typed catalog the screens render from.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

// ----- KeyboardAvoidingView mock (settings/auth screens) -----

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

// Both settings sub-screens sit under a visible navigation header; keyboard
// avoidance must offset by its measured height.
const MOCK_HEADER_HEIGHT = 64;

jest.mock('expo-router/react-navigation', () => ({
  useHeaderHeight: () => MOCK_HEADER_HEIGHT,
}));

// ----- expo-router mock (merged settings + auth harness requirements) -----

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
let mockSearchParams: Record<string, string | string[] | undefined> = {};
const mockLinkNavigate = jest.fn();

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  return {
    router: {
      push: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
    },
    useNavigation: () => mockNavigation,
    useLocalSearchParams: () => mockSearchParams,
    useFocusEffect: jest.fn((callback: () => void | (() => void)) => {
      ReactActual.useEffect(callback, [callback]);
    }),
    Link: MockLink,
  };
});

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
    <Text {...textProps} accessibilityRole={accessibilityRole ?? 'link'} onPress={handlePress}>
      {children}
    </Text>
  );
}

// ----- module mocks shared by the settings/auth harnesses -----

let mockHardwareBackHandler: (() => boolean) | null = null;

jest.mock('../src/lib/use-hardware-back', () => ({
  useHardwareBack: (handler: () => boolean) => {
    mockHardwareBackHandler = handler;
  },
}));

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

const mockSetGuestLanguage = jest.fn();
const mockMirrorAccountLanguage = jest.fn();

jest.mock('../src/lib/guest-language', () => ({
  useGuestLanguage: () => ({
    language: 'en',
    isRestoring: false,
    persistenceError: null,
    setLanguage: mockSetGuestLanguage,
    mirrorAccountLanguage: mockMirrorAccountLanguage,
  }),
}));

const mockWrite = jest.fn();
const mockDelete = jest.fn();
const mockDirectoryCreate = jest.fn();

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/mock-cache' },
  Directory: jest.fn().mockImplementation((...segments: unknown[]) => {
    const path = segments
      .map((segment) =>
        typeof segment === 'string'
          ? segment
          : ((segment as { uri?: string }).uri ?? String(segment)),
      )
      .join('/')
      .replace(/^file:\/\//, '');
    return {
      uri: `file://${path}`,
      exists: true,
      create: mockDirectoryCreate,
      list: jest.fn(() => []),
    };
  }),
  File: jest.fn().mockImplementation((...segments: unknown[]) => {
    const path = segments
      .map((segment) =>
        typeof segment === 'string'
          ? segment
          : ((segment as { uri?: string }).uri ?? String(segment)),
      )
      .join('/')
      .replace(/^file:\/\//, '');
    return { uri: `file://${path}`, write: mockWrite, delete: mockDelete };
  }),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('../src/lib/daily-reminder', () => ({
  DEFAULT_REMINDER_HOUR: 19,
  getDailyReminder: jest.fn(async () => null),
  enableDailyReminder: jest.fn(async () => 'enabled'),
  refreshDailyReminderLanguage: jest.fn(async () => null),
  disableDailyReminder: jest.fn(async () => undefined),
  cancelDailyReminderQuietly: jest.fn(async () => undefined),
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiConsumeAccountExportPages: jest.fn(),
  apiDeleteAllRecordings: jest.fn(),
  apiRestartDiagnostic: jest.fn(),
  apiUpdateProfile: jest.fn(),
}));

const mockResetPracticeFlow = jest.fn();
const mockClearRecordingReferences = jest.fn();

jest.mock('../src/lib/practice-flow', () => ({
  ...jest.requireActual('../src/lib/practice-flow'),
  usePracticeFlow: () => ({
    clearRecordingReferences: mockClearRecordingReferences,
    resetPracticeFlow: mockResetPracticeFlow,
  }),
}));

jest.mock('../src/lib/ads', () => ({
  useAds: () => ({
    privacyOptionsRequired: false,
    showPrivacyOptions: jest.fn(async () => true),
  }),
}));

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
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
    resetStoredSession: jest.fn(),
    signOutThisDevice: jest.fn().mockResolvedValue(undefined),
    captureSessionLease: jest.fn(() => ({}) as never),
    isSessionLeaseCurrent: jest.fn(() => true),
    login: jest.fn().mockResolvedValue(USER),
    register: jest.fn().mockResolvedValue(USER),
    logout: jest.fn().mockResolvedValue(undefined),
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

const mockUpdateProfile = apiUpdateProfile as jest.Mock;
const mockDeleteAllRecordings = apiDeleteAllRecordings as jest.Mock;
const mockRestartDiagnostic = apiRestartDiagnostic as jest.Mock;
const mockGetReminder = getDailyReminder as jest.Mock;
const mockEnableReminder = enableDailyReminder as jest.Mock;
const mockDisableReminder = disableDailyReminder as jest.Mock;
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  navigate: jest.Mock;
  replace: jest.Mock;
};

// ----- helpers -----

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Return the Pressable callback committed for a queried host node without
 * opening RNTL's own async act scope. This is only for same-render
 * re-entrancy storms, where awaiting one fireEvent would commit the busy state
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

/**
 * The keyboard-submit handler committed for a queried TextInput. The RN preset
 * forwards submit handlers onto the queried host element, so fall back to its
 * own props before giving up.
 */
function committedSubmitHandler(node: TestInstance): () => unknown {
  let fiber: Fiber | null = node.unstable_fiber;
  while (fiber) {
    const props = fiber.memoizedProps as { onSubmitEditing?: unknown } | null;
    if (typeof props?.onSubmitEditing === 'function') {
      return props.onSubmitEditing as () => unknown;
    }
    if (fiber.return === null || typeof fiber.return.type === 'string') break;
    fiber = fiber.return;
  }
  const own = (node.props as { onSubmitEditing?: unknown }).onSubmitEditing;
  if (typeof own === 'function') return own as () => unknown;
  throw new Error('No committed submit handler found');
}

function flattenedStyle(node: TestInstance): Record<string, unknown> {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function hardwareBackIsHandled(): boolean {
  if (!mockHardwareBackHandler) throw new Error('No hardware-back handler was registered');
  return mockHardwareBackHandler();
}

let alertSpy: jest.SpyInstance;

function latestAlertCall(): (typeof alertSpy.mock.calls)[number] {
  expect(alertSpy).toHaveBeenCalled();
  const call = alertSpy.mock.calls.at(-1);
  expect(call).toBeDefined();
  return call!;
}

function alertButtonOnPress(text: string): () => void {
  const buttons = (latestAlertCall()[2] ?? []) as {
    text?: string;
    onPress?: () => void;
  }[];
  const button = buttons.find((candidate) => candidate.text === text);
  expect(button?.onPress).toEqual(expect.any(Function));
  return button!.onPress!;
}

const queryClients: QueryClient[] = [];

function makeQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(client);
  return client;
}

async function renderWithQueryClient(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function renderSettings(user: User = USER): Promise<void> {
  mockAuthValue = makeAuth({ user });
  await renderWithQueryClient(<SettingsScreen />);
  // Let the stored-reminder read resolve before assertions.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setActiveLanguage('en');
  mockBeforeRemoveListener = null;
  mockHardwareBackHandler = null;
  mockNavigation = {
    setOptions: mockSetOptions,
    addListener: mockAddNavigationListener,
  };
  mockSearchParams = {};
  mockAuthValue = makeAuth();
  mockUpdateProfile.mockReset();
  mockDeleteAllRecordings.mockReset().mockResolvedValue(undefined);
  mockRestartDiagnostic.mockReset().mockResolvedValue(undefined);
  mockGetReminder.mockReset().mockResolvedValue(null);
  mockEnableReminder.mockReset().mockResolvedValue('enabled');
  mockDisableReminder.mockReset().mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
  alertSpy.mockRestore();
});

// ----- A1: shared Button -----

describe('A1 shared Button same-frame storm', () => {
  it('fires onPress exactly once when two rapid presses land while loading=true blocks the control', async () => {
    const work = deferred<void>();
    const onPress = jest.fn(() => work.promise);

    function Harness() {
      const [pending, setPending] = React.useState(0);
      return (
        <Button
          title="Save payment"
          loading={pending > 0}
          onPress={() => {
            onPress();
            setPending((count) => count + 1);
            void work.promise.finally(() => setPending((count) => count - 1));
          }}
        />
      );
    }

    await render(<Harness />);
    const button = () => screen.getByRole('button', { name: 'Save payment' });

    // First activation: exactly one call, promise pending.
    await fireEvent.press(button());
    expect(onPress).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(button().props.accessibilityState).toEqual({ disabled: true, busy: true }),
    );

    // Storm: two more rapid presses while the promise is still pending and the
    // loading render is committed. The disabled Pressable drops both.
    await fireEvent.press(button());
    await fireEvent.press(button());
    expect(onPress).toHaveBeenCalledTimes(1);

    await act(async () => {
      work.resolve(undefined);
    });
    await waitFor(() =>
      expect(button().props.accessibilityState).toEqual({ disabled: false, busy: false }),
    );
    expect(flattenedStyle(button()).opacity).toBeUndefined();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ----- A2: settings screen latches -----

describe('A2 settings same-frame double-invocation storms', () => {
  it('saves the name exactly once when Save is double-pressed before the busy re-render (nameBusyRef)', async () => {
    const update = deferred<User>();
    mockUpdateProfile.mockReturnValue(update.promise);
    await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada Storm');
    const save = screen.getByRole('button', { name: t('settings.saveName') });
    const press = committedPressHandler(save);
    await act(async () => {
      press();
      press();
    });

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ name: 'Ada Storm' });

    await act(async () => {
      update.resolve({ ...USER, name: 'Ada Storm' });
    });
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({ ...USER, name: 'Ada Storm' });

    // The latch releases in the finally: a later edit saves normally.
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada K');
    mockUpdateProfile.mockResolvedValue({ ...USER, name: 'Ada K' });
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    });
    expect(mockUpdateProfile).toHaveBeenCalledTimes(2);
  });

  it('submits one learning-language PATCH for a same-frame chip double-press (languageBusyRef)', async () => {
    const update = deferred<User>();
    mockUpdateProfile.mockReturnValue(update.promise);
    await renderSettings();

    const chip = screen.getByRole('radio', { name: 'Hindi, हिन्दी' });
    const press = committedPressHandler(chip);
    await act(async () => {
      press();
      press();
    });

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ nativeLanguage: 'hi' });

    await act(async () => {
      update.resolve({ ...USER, nativeLanguage: 'hi' });
    });
  });

  it('runs one reminder mutation for a same-frame toggle double-press (reminderBusyRef)', async () => {
    const enable = deferred<'enabled' | 'denied'>();
    // No stored reminder: the switch rests OFF, so one toggle press arms one
    // enableDailyReminder mutation at the stored default hour.
    mockGetReminder.mockResolvedValue(null);
    mockEnableReminder.mockReturnValue(enable.promise);
    await renderSettings();

    const toggle = screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: false });
    const press = committedPressHandler(toggle);
    await act(async () => {
      press();
      press();
    });

    expect(mockEnableReminder).toHaveBeenCalledTimes(1);
    expect(mockEnableReminder).toHaveBeenLastCalledWith(19, 'en');
    expect(mockDisableReminder).not.toHaveBeenCalled();

    await act(async () => {
      enable.resolve('enabled');
    });
  });
});

// ----- A3: delete-all-recordings confirmation owner -----

describe('A3 delete-all-recordings confirmation storm', () => {
  it('opens exactly one destructive confirmation for a same-frame row double-press', async () => {
    await renderSettings();

    const openConfirmation = committedPressHandler(
      screen.getByRole('button', { name: t('settings.recordingsDeleteAll') }),
    );
    await act(async () => {
      openConfirmation();
      openConfirmation();
    });

    const confirmations = alertSpy.mock.calls.filter(
      ([title]) => title === t('settings.recordingsDeleteAllTitle'),
    );
    expect(confirmations).toHaveLength(1);
    expect(mockDeleteAllRecordings).not.toHaveBeenCalled();
  });

  it('deletes all recordings exactly once when the destructive Alert action is double-invoked', async () => {
    const deletion = deferred<void>();
    mockDeleteAllRecordings.mockReturnValue(deletion.promise);
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.recordingsDeleteAll') }));
    const confirm = alertButtonOnPress(t('settings.recordingsDeleteAllConfirm'));

    // The confirmation owner symbol is consumed by the first invocation; the
    // second must be inert even before the busy render commits.
    await act(async () => {
      confirm();
      confirm();
    });

    expect(mockDeleteAllRecordings).toHaveBeenCalledTimes(1);

    await act(async () => {
      deletion.resolve(undefined);
    });
  });
});

// ----- A4: placement-test retake confirmation -----

describe('A4 placement retake confirmation storm', () => {
  it('restarts the placement test exactly once when the Alert confirm is double-invoked', async () => {
    const restart = deferred<void>();
    mockRestartDiagnostic.mockReturnValue(restart.promise);
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    const confirm = alertButtonOnPress(t('retake.confirm'));

    await act(async () => {
      confirm();
      confirm();
    });

    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await act(async () => {
      restart.resolve(undefined);
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/diagnostic');
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });
});

// ----- A5: login/signup submit storms -----

describe('A5 auth submit storms', () => {
  it('logs in exactly once across a same-frame button + keyboard-submit + button storm', async () => {
    const session = deferred<User>();
    mockAuthValue = makeAuth({ user: null, login: jest.fn(() => session.promise) });
    await renderWithQueryClient(<LoginScreen />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(t('login.emailPlaceholder')),
      'ada@example.com',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('login.passwordPlaceholder')),
      'passw0rd',
    );

    const submitButton = screen.getByRole('button', { name: t('login.submit') });
    const passwordSubmit = committedSubmitHandler(screen.getByLabelText(t('login.passwordLabel')));
    const press = committedPressHandler(submitButton);
    await act(async () => {
      press();
      passwordSubmit();
      press();
    });

    expect(mockAuthValue.login).toHaveBeenCalledTimes(1);
    expect(mockAuthValue.login).toHaveBeenLastCalledWith('ada@example.com', 'passw0rd');
    expect(mockRouter.replace).not.toHaveBeenCalled();
    // The synchronous latch also publishes the navigation lock: hardware back
    // is owned for exactly the lifetime of the single in-flight request.
    expect(hardwareBackIsHandled()).toBe(true);

    await act(async () => {
      session.resolve(USER);
    });
    expect(hardwareBackIsHandled()).toBe(false);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('registers exactly once across a same-frame keyboard-submit + button + button storm', async () => {
    const registration = deferred<User>();
    mockAuthValue = makeAuth({ user: null, register: jest.fn(() => registration.promise) });
    await renderWithQueryClient(<SignupScreen />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(t('signup.namePlaceholder')),
      'Ada Storm',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('login.emailPlaceholder')),
      'ada@example.com',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('signup.passwordPlaceholder')),
      'passw0rd',
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('password.confirmPlaceholder')),
      'passw0rd',
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Telugu, తెలుగు' }));

    const confirmSubmit = committedSubmitHandler(screen.getByLabelText(t('password.confirmLabel')));
    const press = committedPressHandler(screen.getByRole('button', { name: t('signup.submit') }));
    await act(async () => {
      confirmSubmit();
      press();
      press();
    });

    expect(mockAuthValue.register).toHaveBeenCalledTimes(1);
    expect(mockAuthValue.register).toHaveBeenLastCalledWith(
      'Ada Storm',
      'ada@example.com',
      'passw0rd',
      'te',
      'en',
    );

    await act(async () => {
      registration.resolve(USER);
    });
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });
});

// ----- A6: change-password + delete-account -----

describe('A6 account security submit storms', () => {
  it('changes the password exactly once for a same-frame double submit', async () => {
    const change = deferred<void>();
    mockAuthValue = makeAuth({ changePassword: jest.fn(() => change.promise) });
    await renderWithQueryClient(<ChangePasswordScreen />);

    await fireEvent.changeText(screen.getByPlaceholderText(t('cp.currentPlaceholder')), 'oldpass1');
    await fireEvent.changeText(
      screen.getByPlaceholderText(t('signup.passwordPlaceholder')),
      'newpass1',
    );
    await fireEvent.changeText(screen.getByPlaceholderText(t('cp.confirmPlaceholder')), 'newpass1');

    const submit = committedPressHandler(screen.getByRole('button', { name: t('cp.submit') }));
    await act(async () => {
      submit();
      submit();
    });

    expect(mockAuthValue.changePassword).toHaveBeenCalledTimes(1);
    expect(mockAuthValue.changePassword).toHaveBeenLastCalledWith('oldpass1', 'newpass1');

    await act(async () => {
      change.resolve(undefined);
    });
    // Success is the inline note + re-titled Done button, not a modal Alert.
    await waitFor(() => expect(screen.getByText(t('cp.updatedBody'))).toBeTruthy());
    expect(screen.getByRole('button', { name: t('cp.done') })).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('deletes the account exactly once when the destructive confirmation is double-invoked', async () => {
    const deletion = deferred<void>();
    mockAuthValue = makeAuth({ deleteAccount: jest.fn(() => deletion.promise) });
    await renderWithQueryClient(<DeleteAccountScreen />);

    await fireEvent.changeText(
      screen.getByPlaceholderText(t('da.passwordPlaceholder')),
      'password1',
    );
    await fireEvent.press(screen.getByRole('button', { name: t('da.submit') }));
    const confirm = alertButtonOnPress(t('da.confirmDelete'));

    await act(async () => {
      confirm();
      confirm();
    });

    expect(mockAuthValue.deleteAccount).toHaveBeenCalledTimes(1);
    expect(mockAuthValue.deleteAccount).toHaveBeenLastCalledWith('password1');

    await act(async () => {
      deletion.resolve(undefined);
    });
  });
});
