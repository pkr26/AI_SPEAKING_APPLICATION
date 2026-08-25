import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import type { Fiber, TestInstance } from 'test-renderer';

import SettingsScreen, { formatReminderHour } from '../src/app/settings/index';
import {
  ApiError,
  apiConsumeAccountExportPages,
  apiRestartDiagnostic,
  apiUpdateProfile,
} from '../src/lib/api';
import { LogoutCleanupError, MAX_NAME_LENGTH, useAuth } from '../src/lib/auth';
import {
  disableDailyReminder,
  enableDailyReminder,
  getDailyReminder,
  refreshDailyReminderLanguage,
} from '../src/lib/daily-reminder';
import { deviceLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
import { colors, layout, radii, spacing } from '../src/lib/theme';
import type { User } from '../src/lib/types';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const hi = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('hi', key, params);

// The screen renders reminder times via formatReminderHour in the active UI
// language (the device language under jest, no provider wraps these renders).
const reminderTimeText = (hour: number) =>
  t('reminder.timeLabel', { time: formatReminderHour(hour, deviceLanguage()) });

const mockSetOptions = jest.fn();
let mockFocusCallback: (() => void | (() => void)) | null = null;
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
    useFocusEffect: jest.fn((callback: () => void | (() => void)) => {
      mockFocusCallback = callback;
      ReactActual.useEffect(callback, [callback]);
    }),
  };
});

const mockWrite = jest.fn();
const mockDelete = jest.fn();
let lastFileUri: string | null = null;
let lastFileContents = '';

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/mock-cache' },
  File: jest.fn().mockImplementation((...segments: unknown[]) => {
    const uri = `file://${(segments as string[]).join('/')}`;
    lastFileUri = uri;
    return { uri, write: mockWrite, delete: mockDelete };
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
  apiRestartDiagnostic: jest.fn(),
  apiUpdateProfile: jest.fn(),
}));

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

const mockShowAdPrivacyOptions = jest.fn(async () => true);
let mockPrivacyOptionsRequired = false;

jest.mock('../src/lib/ads', () => ({
  useAds: () => ({
    privacyOptionsRequired: mockPrivacyOptionsRequired,
    showPrivacyOptions: mockShowAdPrivacyOptions,
  }),
}));

const OTHER_USER: User = {
  ...USER,
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  nativeLanguage: 'es',
};

/** Every language the screen offers, in the order the grid lays them out. */
const LANGUAGE_CHIPS = [
  { code: 'te', english: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
  { code: 'es', english: 'Spanish', native: 'Español' },
  { code: 'zh', english: 'Chinese (Simplified)', native: '简体中文' },
] as const;

const chipLabel = (index: number) =>
  `${LANGUAGE_CHIPS[index].english}, ${LANGUAGE_CHIPS[index].native}`;

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
    logout: jest.fn().mockResolvedValue(undefined),
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

const mockUpdateProfile = apiUpdateProfile as jest.Mock;
const mockConsumeExportPages = apiConsumeAccountExportPages as jest.Mock;
const mockExportData = jest.fn();
const mockRestartDiagnostic = apiRestartDiagnostic as jest.Mock;
const mockGetReminder = getDailyReminder as jest.Mock;
const mockEnableReminder = enableDailyReminder as jest.Mock;
const mockDisableReminder = disableDailyReminder as jest.Mock;
const mockRefreshReminderLanguage = refreshDailyReminderLanguage as jest.Mock;
const mockSharingAvailable = Sharing.isAvailableAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockFile = File as unknown as jest.Mock;
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  navigate: jest.Mock;
  replace: jest.Mock;
};

let alertSpy: jest.SpyInstance;

async function pressAlertButton(text: string) {
  const calls = alertSpy.mock.calls;
  const buttons = calls[calls.length - 1][2] as
    { text?: string; onPress?: () => void }[] | undefined;
  const button = buttons?.find((candidate) => candidate.text === text);
  if (!button?.onPress) throw new Error(`Alert button "${text}" not found`);
  await act(async () => button.onPress?.());
}

const queryClients: QueryClient[] = [];

function makeQueryClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClients.push(client);
  return client;
}

const settingsTree = (client: QueryClient) => (
  <QueryClientProvider client={client}>
    <SettingsScreen />
  </QueryClientProvider>
);

async function renderSettings(queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient();
  const view = await render(settingsTree(client));
  // Let the stored-reminder read resolve before assertions.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { ...view, rerenderSettings: () => view.rerender(settingsTree(client)) };
}

type SettingsOwnershipBoundary = 'identity' | 'unmount';

async function crossSettingsOwnershipBoundary(
  view: Awaited<ReturnType<typeof renderSettings>>,
  boundary: SettingsOwnershipBoundary,
): Promise<void> {
  if (boundary === 'unmount') {
    await view.unmount();
    return;
  }
  mockAuthValue = makeAuth({ user: OTHER_USER, sessionVersion: 2 });
  await view.rerenderSettings();
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

/** The host view a control is laid out in (card, name row, language grid). */
function parentOf(node: TestInstance): TestInstance {
  const parent = node.parent;
  if (!parent) throw new Error('Element is not laid out inside a parent view');
  return parent;
}

/**
 * Return the Pressable callback associated with a queried host node without
 * opening RNTL's own async act scope. This is only for same-render re-entrancy
 * tests, where awaiting one fireEvent would commit the disabled state before
 * the second activation.
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
 * ScrollView renders as the host `RCTScrollView`, which keeps
 * `contentContainerStyle` as a prop instead of applying it to a child view.
 */
function scrollContentStyle(): SemanticStyle {
  const [scrollView] = screen.container.queryAll((node) => node.type === 'RCTScrollView');
  if (!scrollView) throw new Error('No ScrollView rendered');
  return StyleSheet.flatten(scrollView.props.contentContainerStyle) ?? {};
}

/** The language-change spinner is the only ActivityIndicator on this screen. */
function languageSpinners(): TestInstance[] {
  return screen.container.queryAll((node) => node.type === 'ActivityIndicator');
}

function languageChip(index: number): TestInstance {
  return screen.getByRole('button', { name: chipLabel(index) });
}

function appLanguageChip(index: number): TestInstance {
  return screen.getByRole('button', {
    name: `${t('settings.appLanguageLabel')}: ${chipLabel(index)}`,
  });
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
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

beforeEach(() => {
  jest.clearAllMocks();
  lastFileUri = null;
  lastFileContents = '';
  mockFocusCallback = null;
  mockBeforeRemoveListener = null;
  mockAuthValue = makeAuth();
  mockPrivacyOptionsRequired = false;
  mockShowAdPrivacyOptions.mockReset().mockResolvedValue(true);
  mockUpdateProfile.mockReset();
  mockExportData.mockReset().mockResolvedValue({ user: USER, attempts: [] });
  mockConsumeExportPages
    .mockReset()
    .mockImplementation(async (consumePage, consumeRecordings, signal) => {
      const data = (await mockExportData(signal)) as {
        user: User;
        attempts: Record<string, unknown>[];
      };
      await consumePage({ ...data, nextCursor: null }, 0);
      await consumeRecordings({ recordings: [], nextCursor: null }, 0);
    });
  mockRestartDiagnostic.mockReset();
  mockWrite
    .mockReset()
    .mockImplementation((content: string, options?: { append?: boolean; encoding?: string }) => {
      lastFileContents = options?.append ? `${lastFileContents}${content}` : content;
    });
  mockDelete.mockReset();
  mockGetReminder.mockReset().mockResolvedValue(null);
  mockEnableReminder.mockReset().mockResolvedValue('enabled');
  mockRefreshReminderLanguage.mockReset().mockResolvedValue(null);
  mockDisableReminder.mockReset().mockResolvedValue(undefined);
  mockSharingAvailable.mockReset().mockResolvedValue(true);
  mockShareAsync.mockReset().mockResolvedValue(undefined);
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

describe('formatReminderHour', () => {
  it('renders the hour locale-aware in the given UI language', () => {
    // en uses 12-hour clock; zh prefixes the hour with 时-like formatting.
    expect(formatReminderHour(19, 'en')).toBe(
      new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date(2020, 0, 1, 19, 0)),
    );
    expect(formatReminderHour(19, 'zh')).toBe(
      new Intl.DateTimeFormat('zh', { hour: 'numeric' }).format(new Date(2020, 0, 1, 19, 0)),
    );
    expect(formatReminderHour(19, 'en')).not.toBe('19:00');
  });

  it('formats in English when no UI language is supplied', () => {
    // The default must be a tag Intl accepts, otherwise every caller that
    // omits the language silently drops to the 24-hour fallback.
    expect(formatReminderHour(19)).toBe(formatReminderHour(19, 'en'));
    expect(formatReminderHour(19)).not.toBe('19:00');
  });

  it('falls back to zero-padded HH:00 when Intl rejects the language tag', () => {
    expect(formatReminderHour(9, '123456789' as never)).toBe('09:00');
  });
});

describe('settings profile card', () => {
  it('shows name, email, level with its explainer, and the selected language', async () => {
    await renderSettings();

    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
    expect(screen.getByLabelText(t('signup.nameLabel')).props.value).toBe(USER.name);
    expect(screen.getByText(USER.email)).toBeTruthy();
    expect(screen.getByText(`B1 — ${t('cefr.B1')}`)).toBeTruthy();
    // Nothing has been saved yet, so no confirmation is showing.
    expect(screen.queryByText(t('settings.saved'))).toBeNull();

    const telugu = screen.getByRole('button', { name: 'Telugu, తెలుగు' });
    expect(telugu.props.accessibilityState).toMatchObject({ selected: true });
    const hindi = screen.getByRole('button', { name: 'Hindi, हिन्दी' });
    expect(hindi.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('names every card, field label, and control on the screen', async () => {
    await renderSettings();

    expect(screen.getByRole('header', { name: t('settings.profileTitle') })).toBeTruthy();
    expect(screen.getByRole('header', { name: t('reminder.toggleLabel') })).toBeTruthy();
    expect(screen.getByRole('header', { name: t('menu.accountTitle') })).toBeTruthy();
    expect(screen.getByText(t('signup.nameLabel'))).toBeTruthy();
    expect(screen.getByText(t('login.emailLabel'))).toBeTruthy();
    expect(screen.getByText(t('settings.levelLabel'))).toBeTruthy();
    expect(screen.getByText(t('signup.languageLabel'))).toBeTruthy();

    const input = screen.getByLabelText(t('signup.nameLabel'));
    expect(input.props.placeholder).toBe(t('signup.namePlaceholder'));
    expect(input.props.placeholderTextColor).toBe(colors.muted);
    expect(input.props.maxLength).toBe(MAX_NAME_LENGTH);

    // The toggle carries its own label as well as visible copy: screen readers
    // must not fall back to the child text.
    const toggle = screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    expect(toggle.props.accessibilityLabel).toBe(t('reminder.toggleLabel'));
    expect(within(toggle).getByText(t('reminder.toggleLabel'))).toBeTruthy();
  });

  it('offers every supported native language with its English and native name', async () => {
    await renderSettings();

    for (const [index, language] of LANGUAGE_CHIPS.entries()) {
      const chip = languageChip(index);
      expect(within(chip).getByText(language.native)).toBeTruthy();
      expect(within(chip).getByText(language.english)).toBeTruthy();
    }
  });

  it('sends the code of the tapped chip, Spanish and Chinese included', async () => {
    mockUpdateProfile.mockResolvedValue({ ...USER, nativeLanguage: 'es' as const });
    await renderSettings();

    await act(async () => {
      await fireEvent.press(languageChip(2));
    });
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ nativeLanguage: 'es' });

    await act(async () => {
      await fireEvent.press(languageChip(3));
    });
    expect(mockUpdateProfile).toHaveBeenLastCalledWith({ nativeLanguage: 'zh' });
  });

  it('shows the not-tested placeholder before the diagnostic', async () => {
    mockAuthValue = makeAuth({
      user: { ...USER, cefrLevel: null, diagnosticCompleted: false },
    });
    await renderSettings();

    expect(screen.getByText(t('settings.levelPending'))).toBeTruthy();
    // No level test to retake yet.
    expect(screen.queryByText(t('settings.retake'))).toBeNull();
  });

  it('re-syncs the name draft when the session user arrives after mount', async () => {
    mockAuthValue = makeAuth({ user: null });
    const { rerenderSettings } = await renderSettings();
    expect(screen.queryByLabelText(t('signup.nameLabel'))).toBeNull();

    mockAuthValue = makeAuth();
    await act(async () => rerenderSettings());

    // The draft follows the canonical name once the session user is known;
    // seeding only at mount would leave the field stuck blank.
    expect(screen.getByLabelText(t('signup.nameLabel')).props.value).toBe(USER.name);
    expect(
      screen.getByRole('button', { name: t('settings.saveName') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('re-syncs the draft on an external name change but never while the field is focused', async () => {
    const { rerenderSettings } = await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));

    // An in-progress edit belongs to the learner, not to the arriving profile.
    await act(async () => {
      await fireEvent(input(), 'focus');
    });
    await fireEvent.changeText(input(), 'Grace');
    mockAuthValue = makeAuth({ user: { ...USER, name: 'Ada King' } });
    await act(async () => rerenderSettings());
    expect(input().props.value).toBe('Grace');

    // Once the field is not focused, the canonical name wins again.
    await act(async () => {
      await fireEvent(input(), 'blur');
    });
    mockAuthValue = makeAuth({ user: { ...USER, name: 'Ada Byron' } });
    await act(async () => rerenderSettings());
    expect(input().props.value).toBe('Ada Byron');
  });

  it('re-syncs an unchanged focused draft as soon as it blurs', async () => {
    const { rerenderSettings } = await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));

    await act(async () => {
      await fireEvent(input(), 'focus');
    });
    await fireEvent.changeText(input(), USER.name);
    // A profile refresh while focused must not overwrite active typing, but a
    // field the learner never edited should adopt that canonical name on blur
    // instead of leaving an accidental stale overwrite ready to save.
    mockAuthValue = makeAuth({ user: { ...USER, name: 'Ada King' } });
    await act(async () => rerenderSettings());
    expect(input().props.value).toBe(USER.name);

    await act(async () => {
      await fireEvent(input(), 'blur');
    });
    expect(input().props.value).toBe('Ada King');
  });

  it('keeps a canonical resync clean across a later focused profile refresh', async () => {
    const { rerenderSettings } = await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));

    mockAuthValue = makeAuth({ user: { ...USER, name: 'Ada King' } });
    await rerenderSettings();
    expect(input().props.value).toBe('Ada King');

    await fireEvent(input(), 'focus');
    mockAuthValue = makeAuth({ user: { ...USER, name: 'Ada Byron' } });
    await rerenderSettings();
    expect(input().props.value).toBe('Ada King');

    await fireEvent(input(), 'blur');
    expect(input().props.value).toBe('Ada Byron');
  });

  it('keeps an unsaved different draft when the field blurs', async () => {
    await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));

    await fireEvent(input(), 'focus');
    await fireEvent.changeText(input(), 'Grace');
    await fireEvent(input(), 'blur');

    expect(input().props.value).toBe('Grace');
  });

  it('saves the name once when Save is tapped twice before a re-render', async () => {
    // Same-render re-entrancy: the committed handler still sees nameBusy=false
    // on the second activation, so only a synchronous latch prevents a double
    // PATCH.
    let resolveUpdate: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    const saveButton = screen.getByRole('button', { name: t('settings.saveName') });
    await act(async () => {
      const press = committedPressHandler(saveButton);
      press();
      press();
    });

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveUpdate({ ...USER, name: 'Ada King' });
    });
    expect(await screen.findByText(t('settings.saved'))).toBeTruthy();

    // The latch releases in the finally: a later edit saves normally.
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada K');
    mockUpdateProfile.mockResolvedValue({ ...USER, name: 'Ada K' });
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    });
    expect(mockUpdateProfile).toHaveBeenCalledTimes(2);
  });

  it('does not clobber a newer name draft when an older save finishes', async () => {
    let resolveUpdate: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));

    await fireEvent.changeText(input(), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    await fireEvent.changeText(input(), 'Ada King Jr');
    await act(async () => {
      resolveUpdate({ ...USER, name: 'Ada King' });
    });

    expect(input().props.value).toBe('Ada King Jr');
    expect(screen.queryByText(t('settings.saved'))).toBeNull();
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({ ...USER, name: 'Ada King' });
  });

  it('changes the language once when a chip is tapped twice before a re-render', async () => {
    let resolveUpdate: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();

    const chip = languageChip(1); // Hindi
    await act(async () => {
      const press = committedPressHandler(chip);
      press();
      press();
    });

    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockUpdateProfile).toHaveBeenCalledWith({ nativeLanguage: 'hi' });
    await act(async () => {
      resolveUpdate({ ...USER, nativeLanguage: 'hi' });
    });
  });

  it('saves an edited name through PATCH /auth/me and confirms inline', async () => {
    const updated = { ...USER, name: 'Ada King' };
    mockUpdateProfile.mockResolvedValue(updated);
    await renderSettings();

    const saveButton = () => screen.getByRole('button', { name: t('settings.saveName') });
    expect(saveButton().props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), '  Ada King ');
    expect(saveButton().props.accessibilityState).toMatchObject({ disabled: false });

    await act(async () => {
      await fireEvent.press(saveButton());
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Ada King' });
    expect(mockAuthValue.setUser).toHaveBeenCalledWith(updated);
    const saved = await screen.findByText(t('settings.saved'));
    expect(flattenedStyle(saved)).toEqual({
      marginTop: 6,
      color: colors.success,
      fontSize: 13,
    });

    // Typing again retracts the stale confirmation.
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada K');
    expect(screen.queryByText(t('settings.saved'))).toBeNull();
  });

  it('merges out-of-order name and language PATCH responses without reverting either field', async () => {
    let resolveName: (user: User) => void = () => undefined;
    let resolveLanguage: (user: User) => void = () => undefined;
    mockUpdateProfile
      .mockImplementationOnce(
        () =>
          new Promise<User>((resolve) => {
            resolveName = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<User>((resolve) => {
            resolveLanguage = resolve;
          }),
      );
    await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
      await fireEvent.press(appLanguageChip(1));
    });

    const setUser = mockAuthValue.setUser;
    await act(async () => {
      resolveLanguage({ ...USER, uiLanguage: 'hi' });
    });
    await act(async () => {
      // This delayed server snapshot predates the language write.
      resolveName({ ...USER, name: 'Ada King' });
    });

    expect(setUser).toHaveBeenLastCalledWith({
      ...USER,
      name: 'Ada King',
      uiLanguage: 'hi',
    });
  });

  it('does not restore a profile when a delayed name PATCH finishes after logout', async () => {
    let resolveName: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveName = resolve;
      }),
    );
    const { rerenderSettings } = await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);

    const setUser = mockAuthValue.setUser;
    mockAuthValue = makeAuth({ user: null, sessionVersion: 2, setUser });
    await act(async () => rerenderSettings());
    await act(async () => {
      resolveName({ ...USER, name: 'Ada King' });
    });

    expect(setUser).not.toHaveBeenCalled();
  });

  it('rejects a delayed profile response as soon as its auth lease is invalidated', async () => {
    let resolveName: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveName = resolve;
      }),
    );
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    leaseCurrent = false;
    await act(async () => {
      resolveName({ ...USER, name: 'Ada King' });
    });

    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.saved'))).toBeNull();
  });

  it('accepts a name of exactly the maximum length but not one character more', async () => {
    await renderSettings();
    const input = screen.getByLabelText(t('signup.nameLabel'));
    const saveButton = () => screen.getByRole('button', { name: t('settings.saveName') });

    await fireEvent.changeText(input, 'a'.repeat(MAX_NAME_LENGTH));
    expect(saveButton().props.accessibilityState).toMatchObject({ disabled: false });

    await fireEvent.changeText(input, 'a'.repeat(MAX_NAME_LENGTH + 1));
    expect(saveButton().props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('keeps Save name disabled for a blank draft', async () => {
    await renderSettings();
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), '   ');
    expect(
      screen.getByRole('button', { name: t('settings.saveName') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('saves on the keyboard return key and ignores it when nothing changed', async () => {
    mockUpdateProfile.mockResolvedValue({ ...USER, name: 'Ada King' });
    await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));

    // The return key is not gated by the Save button's disabled state, so the
    // save itself has to refuse an unchanged draft.
    await act(async () => {
      await fireEvent(input(), 'submitEditing');
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();

    await fireEvent.changeText(input(), 'Ada King');
    await act(async () => {
      await fireEvent(input(), 'submitEditing');
    });
    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Ada King' });
    expect(await screen.findByText(t('settings.saved'))).toBeTruthy();
  });

  it('swaps the Save name button for a busy one until the PATCH settles', async () => {
    let resolveUpdate: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    });

    const busyButton = screen.getByRole('button', { name: t('settings.saveNameBusy') });
    expect(busyButton.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(
      screen.getByRole('button', { name: t('header.changePassword') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });
    expect(screen.queryByText(t('settings.saveName'))).toBeNull();

    await act(async () => {
      resolveUpdate({ ...USER, name: 'Ada King' });
    });

    expect(
      screen.getByRole('button', { name: t('settings.saveName') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    expect(screen.queryByText(t('settings.saveNameBusy'))).toBeNull();
  });

  it('blocks a same-frame native back removal while a profile write is starting', async () => {
    let resolveUpdate: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    const save = committedPressHandler(
      screen.getByRole('button', { name: t('settings.saveName') }),
    );
    const preventDefault = jest.fn();

    mockSetOptions.mockClear();
    await act(async () => {
      save();
      // The ref-backed publication must happen before React can commit the
      // disabled render; the layout effect cannot be allowed to mask it.
      expect(mockSetOptions).toHaveBeenNthCalledWith(1, {
        headerBackVisible: false,
        gestureEnabled: false,
      });
      mockBeforeRemoveListener?.({
        data: { action: { type: 'GO_BACK' } },
        preventDefault,
      });
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });

    const unrelatedPrevent = jest.fn();
    mockBeforeRemoveListener?.({
      data: { action: { type: 'NAVIGATE' } },
      preventDefault: unrelatedPrevent,
    });
    expect(unrelatedPrevent).not.toHaveBeenCalled();

    mockSetOptions.mockClear();
    await act(async () => {
      resolveUpdate({ ...USER, name: 'Ada King' });
    });
    expect(mockSetOptions).toHaveBeenNthCalledWith(1, {
      headerBackVisible: true,
      gestureEnabled: true,
    });
    const unlockedPrevent = jest.fn();
    mockBeforeRemoveListener?.({
      data: { action: { type: 'GO_BACK' } },
      preventDefault: unlockedPrevent,
    });
    expect(unlockedPrevent).not.toHaveBeenCalled();
  });

  it('shows the update error when the name PATCH fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('offline'));
    await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    });

    const error = await screen.findByText(t('settings.updateFailed'));
    expect(flattenedStyle(error)).toEqual({ marginTop: 6, color: colors.danger, fontSize: 13 });
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
    // A failed save must never leave a "Saved" confirmation behind.
    expect(screen.queryByText(t('settings.saved'))).toBeNull();
  });

  it('switches learning language without changing UI or reminder copy', async () => {
    const updated = { ...USER, nativeLanguage: 'hi' as const };
    mockUpdateProfile.mockResolvedValue(updated);
    const queryClient = makeQueryClient();
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    await renderSettings(queryClient);

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Hindi, हिन्दी' }));
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({ nativeLanguage: 'hi' });
    expect(mockAuthValue.setUser).toHaveBeenCalledWith(updated);
    // Help content is served in the learning language.
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['question-help'] });
    expect(mockRefreshReminderLanguage).not.toHaveBeenCalled();
    expect(mockEnableReminder).not.toHaveBeenCalled();
  });

  it('re-schedules an enabled daily reminder in the new language', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    mockRefreshReminderLanguage.mockResolvedValue({ hour: 19 });
    const updated = { ...USER, uiLanguage: 'hi' as const };
    mockUpdateProfile.mockResolvedValue(updated);
    await renderSettings();

    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    expect(mockAuthValue.setUser).toHaveBeenCalledWith(updated);
    // The reminder copy must follow the new language immediately; the explicit
    // language argument covers the render lag of the module-level active one.
    expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi');
  });

  it('requests the atomic language refresh before reminder hydration has rendered', async () => {
    mockGetReminder.mockReturnValue(new Promise(() => undefined));
    const updated = { ...USER, uiLanguage: 'hi' as const };
    mockUpdateProfile.mockResolvedValue(updated);
    await renderSettings();

    // Nothing is known about the reminder yet, so the card has no controls.
    expect(screen.queryByRole('switch', { name: t('reminder.toggleLabel') })).toBeNull();

    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    expect(mockAuthValue.setUser).toHaveBeenCalledWith(updated);
    expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi');
    expect(mockEnableReminder).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
  });

  it('re-schedules at the hour storage holds, not the one captured at press time', async () => {
    // The hour can move while the PATCH is in flight; re-arming from the
    // closure would put the reminder back at the hour the learner just left.
    mockGetReminder.mockResolvedValue({ hour: 19 });
    mockRefreshReminderLanguage.mockResolvedValue({ hour: 20 });
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' as const });
    await renderSettings();

    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi');
    expect(screen.getByText(reminderTimeText(20))).toBeTruthy();
  });

  it('leaves a reminder switched off during the language change switched off', async () => {
    // Storage is the truth: re-arming from the press-time state would revive a
    // daily notification the learner has just turned off, with the toggle —
    // and the stored preference — both still reading off.
    mockGetReminder.mockResolvedValue({ hour: 19 });
    mockRefreshReminderLanguage.mockResolvedValue(null);
    let resolveUpdate: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();

    const staleToggle = committedPressHandler(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }),
    );
    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });
    await act(async () => {
      staleToggle();
    });
    expect(mockDisableReminder).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpdate({ ...USER, uiLanguage: 'hi' });
    });

    expect(mockEnableReminder).not.toHaveBeenCalled();
    expect(screen.queryByText(t('reminder.failed'))).toBeNull();
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ checked: false });
  });

  it('queues the language refresh behind another reminder change', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    let resolveDisable: () => void = () => undefined;
    mockDisableReminder.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDisable = resolve;
      }),
    );
    let resolveUpdate: (user: User) => void = () => undefined;
    let resolveRefresh: (value: { hour: number } | null) => void = () => undefined;
    mockRefreshReminderLanguage.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    });
    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    await act(async () => {
      resolveUpdate({ ...USER, uiLanguage: 'hi' });
    });
    expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi');

    await act(async () => {
      resolveDisable();
      resolveRefresh(null);
    });
    expect(mockEnableReminder).not.toHaveBeenCalled();
  });

  it('holds the reminder latch while the language re-schedule runs', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    let resolveRefresh: (value: { hour: number } | null) => void = () => undefined;
    mockRefreshReminderLanguage.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' as const });
    await renderSettings();

    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    const toggle = () => screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    expect(toggle().props.accessibilityState).toEqual({
      checked: true,
      disabled: true,
      busy: true,
    });
    // A press already queued against the previous render must not start a
    // second reminder mutation on top of the re-schedule.
    await act(async () => {
      committedPressHandler(toggle())();
    });
    expect(mockDisableReminder).not.toHaveBeenCalled();

    await act(async () => {
      resolveRefresh({ hour: 19 });
    });

    expect(toggle().props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
      busy: false,
    });
    // The latch is released in the finally: the toggle works again.
    await act(async () => {
      await fireEvent.press(toggle());
    });
    expect(mockDisableReminder).toHaveBeenCalledTimes(1);
  });

  it('atomically confirms that there is no reminder to re-schedule', async () => {
    mockGetReminder.mockResolvedValue(null);
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' as const });
    await renderSettings();

    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi');
    expect(mockEnableReminder).not.toHaveBeenCalled();
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toEqual({ checked: false, disabled: false, busy: false });
  });

  it('does not surface a language error when the reminder re-schedule fails', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' as const });
    mockRefreshReminderLanguage.mockRejectedValue(new Error('os error'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    expect(mockAuthValue.setUser).toHaveBeenCalled();
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
    // A failure that never reached the schedule leaves the preference intact,
    // so the toggle keeps reporting the reminder that is still armed.
    expect(await screen.findByText(hi('reminder.failed'))).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(screen.getByText(reminderTimeText(19))).toBeTruthy();
  });

  it('turns the toggle off when the failed re-schedule left nothing scheduled', async () => {
    // enableDailyReminder cancels the old schedule before creating the new one
    // and forgets the preference when it cannot replace it: the toggle must
    // stop claiming a reminder that no longer exists anywhere.
    mockGetReminder.mockResolvedValueOnce({ hour: 8 }).mockResolvedValue(null);
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' as const });
    mockRefreshReminderLanguage.mockRejectedValue(new Error('os error'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(appLanguageChip(1));
    });

    expect(await screen.findByText(hi('reminder.failed'))).toBeTruthy();
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
    const toggle = () => screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    expect(toggle().props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.queryByText(reminderTimeText(8))).toBeNull();

    // The hour survives the failure, so re-arming resumes where it was.
    mockEnableReminder.mockResolvedValue('enabled');
    await act(async () => {
      await fireEvent.press(toggle());
    });
    expect(mockEnableReminder).toHaveBeenLastCalledWith(8, 'en');
  });

  it('shows and opens UMP privacy options only when the SDK requires them', async () => {
    const initial = await renderSettings();
    expect(screen.queryByRole('button', { name: t('ads.privacyOptions') })).toBeNull();
    await initial.unmount();

    mockPrivacyOptionsRequired = true;
    await renderSettings();
    expect(screen.getByText(t('ads.privacyOptionsHelp'))).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('ads.privacyOptions') }));
    expect(mockShowAdPrivacyOptions).toHaveBeenCalledTimes(1);
  });

  it('keeps UMP privacy progress and errors separate from reminder state', async () => {
    const privacyResult = deferred<boolean>();
    mockPrivacyOptionsRequired = true;
    mockShowAdPrivacyOptions.mockReturnValue(privacyResult.promise);
    await renderSettings();

    const privacyButton = () => screen.getByRole('button', { name: t('ads.privacyOptions') });
    await fireEvent.press(privacyButton());
    await waitFor(() =>
      expect(privacyButton().props.accessibilityState).toMatchObject({
        busy: true,
        disabled: true,
      }),
    );
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ busy: false });
    expect(
      screen.container.queryAll(
        (node) =>
          node.type === 'ActivityIndicator' &&
          node.props.accessibilityLabel === t('ads.privacyOptions'),
      ),
    ).toHaveLength(1);
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });

    // UMP may make the form no longer required before a later request-config
    // step fails. The dedicated error must survive that action-row removal.
    mockPrivacyOptionsRequired = false;
    privacyResult.resolve(false);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('ads.privacyFailed')),
    );
    expect(screen.queryByRole('button', { name: t('ads.privacyOptions') })).toBeNull();
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
    expect(screen.queryByText(t('reminder.failed'))).toBeNull();
  });

  it('suppresses stale UMP privacy failures after the account changes', async () => {
    const privacyResult = deferred<boolean>();
    mockPrivacyOptionsRequired = true;
    mockShowAdPrivacyOptions.mockReturnValue(privacyResult.promise);
    const view = await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('ads.privacyOptions') }));
    await waitFor(() => expect(mockShowAdPrivacyOptions).toHaveBeenCalledTimes(1));

    await crossSettingsOwnershipBoundary(view, 'identity');
    mockSetOptions.mockClear();
    privacyResult.reject(new Error('late UMP failure'));
    await act(async () => Promise.resolve());

    expect(screen.queryByText(t('ads.privacyFailed'))).toBeNull();
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('does not PATCH when tapping the already-selected language', async () => {
    await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: 'Telugu, తెలుగు' }));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('locks the chips and spins while the language change is in flight', async () => {
    let resolveUpdate: (user: User) => void = () => undefined;
    mockUpdateProfile.mockReturnValue(
      new Promise<User>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    await renderSettings();
    expect(languageSpinners()).toHaveLength(0);

    await act(async () => {
      await fireEvent.press(languageChip(1));
    });

    expect(languageChip(1).props.accessibilityState).toEqual({ disabled: true, selected: false });
    expect(languageChip(0).props.accessibilityState).toEqual({ disabled: true, selected: true });
    // Only the chips you could still move to are dimmed; the current one keeps
    // its full-strength selected treatment.
    expect(flattenedStyle(languageChip(1)).opacity).toBe(0.5);
    expect(flattenedStyle(languageChip(2)).opacity).toBe(0.5);
    expect(flattenedStyle(languageChip(0)).opacity).toBeUndefined();
    expect(languageSpinners()).toHaveLength(1);
    expect(flattenedStyle(languageSpinners()[0])).toEqual({ marginTop: spacing.sm });
    expect(languageSpinners()[0].props.color).toBe(colors.primary);

    await act(async () => {
      resolveUpdate({ ...USER, nativeLanguage: 'hi' });
    });

    expect(languageChip(1).props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(flattenedStyle(languageChip(1)).opacity).toBeUndefined();
    expect(languageSpinners()).toHaveLength(0);
  });

  it('hides the spinner when the account language is not one on offer', async () => {
    mockAuthValue = makeAuth({ user: { ...USER, nativeLanguage: 'fr' as never } });
    mockUpdateProfile.mockReturnValue(new Promise(() => undefined));
    await renderSettings();

    for (const index of LANGUAGE_CHIPS.keys()) {
      expect(languageChip(index).props.accessibilityState).toMatchObject({ selected: false });
    }

    await act(async () => {
      await fireEvent.press(languageChip(1));
    });

    // The spinner sits under the selected chip; with no chip selected there is
    // nothing for it to annotate.
    expect(languageChip(1).props.accessibilityState).toMatchObject({ disabled: true });
    expect(languageSpinners()).toHaveLength(0);
  });

  it('surfaces a language-change failure without touching the session user', async () => {
    mockUpdateProfile.mockRejectedValue(new ApiError(500, 'boom'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Hindi, हिन्दी' }));
    });

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
  });

  it('falls back to the generic update message and re-arms the chips on failure', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('offline'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(languageChip(1));
    });

    expect(await screen.findByText(t('settings.updateFailed'))).toBeTruthy();
    // The change can be retried straight away.
    expect(languageChip(1).props.accessibilityState).toEqual({ disabled: false, selected: false });
    expect(flattenedStyle(languageChip(1)).opacity).toBeUndefined();
    expect(languageSpinners()).toHaveLength(0);
  });
});

describe('settings screen layout', () => {
  it('lays the cards out on the shared token scale', async () => {
    await renderSettings();

    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.background,
    });

    const profileTitle = screen.getByRole('header', { name: t('settings.profileTitle') });
    expect(flattenedStyle(parentOf(profileTitle))).toEqual({
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: layout.screenPadding,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    });
    expect(flattenedStyle(profileTitle)).toEqual({
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText(t('login.emailLabel')))).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: spacing.lg,
      marginBottom: 6,
    });
    expect(flattenedStyle(screen.getByText(USER.email))).toEqual({
      fontSize: 16,
      color: colors.text,
    });
  });

  it('rings the name field only while it holds focus', async () => {
    await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));

    expect(flattenedStyle(parentOf(input()))).toEqual({
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    });
    const resting = {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: radii.input,
      paddingHorizontal: 14,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.inputBackground,
      flex: 1,
    };
    expect(flattenedStyle(input())).toEqual(resting);

    await act(async () => {
      await fireEvent(input(), 'focus');
    });
    expect(flattenedStyle(input())).toEqual({
      ...resting,
      borderWidth: 2,
      borderColor: colors.primary,
    });

    await act(async () => {
      await fireEvent(input(), 'blur');
    });
    expect(flattenedStyle(input())).toEqual(resting);
  });

  it('paints the selected language chip in brand ink and the rest at rest', async () => {
    await renderSettings();

    expect(flattenedStyle(parentOf(languageChip(0)))).toEqual({
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    });
    const chip = {
      flexBasis: '47%',
      flexGrow: 1,
      borderWidth: 1.5,
      borderRadius: radii.input,
      paddingVertical: spacing.md,
      alignItems: 'center',
    };
    expect(flattenedStyle(languageChip(0))).toEqual({
      ...chip,
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    });
    expect(flattenedStyle(languageChip(1))).toEqual({
      ...chip,
      borderColor: colors.inputBorder,
      backgroundColor: colors.card,
    });

    expect(flattenedStyle(within(languageChip(0)).getByText('తెలుగు'))).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(within(languageChip(0)).getByText('Telugu'))).toEqual({
      marginTop: 2,
      fontSize: 13,
      color: colors.primary,
    });
    expect(flattenedStyle(within(languageChip(1)).getByText('हिन्दी'))).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(within(languageChip(1)).getByText('Hindi'))).toEqual({
      marginTop: 2,
      fontSize: 13,
      color: colors.muted,
    });
  });

  it('styles the reminder toggle as an outline pill that fills once it is on', async () => {
    await renderSettings();
    const toggle = () => screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    const toggleText = () => within(toggle()).getByText(t('reminder.toggleLabel'));

    const pill = {
      marginTop: spacing.md,
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.ml,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.primary,
    };
    const label = { fontSize: 15, fontWeight: '600', color: colors.primary };
    expect(flattenedStyle(toggle())).toEqual(pill);
    expect(flattenedStyle(toggleText())).toEqual(label);

    await act(async () => {
      await fireEvent.press(toggle());
    });

    expect(flattenedStyle(toggle())).toEqual({ ...pill, backgroundColor: colors.primary });
    expect(flattenedStyle(toggleText())).toEqual({ ...label, color: colors.onPrimary });
  });

  it('styles the hour stepper and tints each button while it is held', async () => {
    mockGetReminder.mockResolvedValue({ hour: 8 });
    await renderSettings();

    const timeText = screen.getByText(reminderTimeText(8));
    expect(flattenedStyle(parentOf(timeText))).toEqual({
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    });
    expect(flattenedStyle(timeText)).toEqual({
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    });

    const glyph = { fontSize: 20, fontWeight: '700', color: colors.primary };
    expect(flattenedStyle(screen.getByText('−'))).toEqual(glyph);
    expect(flattenedStyle(screen.getByText('+'))).toEqual(glyph);

    const hourButton = {
      width: layout.minimumTarget,
      height: layout.minimumTarget,
      borderRadius: radii.input,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    };
    const held = { ...hourButton, backgroundColor: colors.primaryLight };
    for (const name of [t('reminder.earlier'), t('reminder.later')]) {
      const button = () => screen.getByRole('button', { name });
      expect(flattenedStyle(button())).toEqual(hourButton);
      await expectPressFeedback(button, hourButton, held);
    }
  });

  it('lays every account row on the shared row scale and tints it while held', async () => {
    await renderSettings();

    const restingRow = {
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    };
    const heldRow = { ...restingRow, backgroundColor: colors.background };
    for (const name of [
      t('header.changePassword'),
      t('settings.export'),
      t('settings.retake'),
      t('header.privacy'),
      t('header.terms'),
      t('common.logOut'),
    ]) {
      const row = () => screen.getByRole('button', { name });
      expect(flattenedStyle(row())).toEqual(restingRow);
      await expectPressFeedback(row, restingRow, heldRow);
    }

    // Delete account closes the list, so it drops the divider.
    const deleteRow = () => screen.getByRole('button', { name: t('header.deleteAccount') });
    const lastRow = { ...restingRow, borderBottomWidth: 0 };
    expect(flattenedStyle(deleteRow())).toEqual(lastRow);
    await expectPressFeedback(deleteRow, lastRow, {
      ...lastRow,
      backgroundColor: colors.background,
    });

    const actionText = { fontSize: 16, fontWeight: '600', color: colors.primary };
    expect(flattenedStyle(screen.getByText(t('header.changePassword')))).toEqual(actionText);
    expect(flattenedStyle(screen.getByText(t('header.deleteAccount')))).toEqual({
      ...actionText,
      color: colors.danger,
    });
  });
});

describe('data export', () => {
  it('writes a JSON export and hands it to the share sheet', async () => {
    const exportData = { user: USER, attempts: [{ id: 'a1' }] };
    mockExportData.mockResolvedValue(exportData);
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    });

    expect(mockExportData).toHaveBeenCalledTimes(1);
    // A timestamped .json name in the cache directory keeps repeat exports
    // from colliding and keeps the payload out of user-visible storage.
    expect(mockFile).toHaveBeenCalledWith(
      Paths.cache,
      expect.stringMatching(/^ai-english-coach-data-\d+\.json$/),
    );
    expect(lastFileContents).toBe(JSON.stringify({ ...exportData, recordings: [] }));
    expect(mockWrite).toHaveBeenNthCalledWith(1, `{"user":${JSON.stringify(USER)},"attempts":[`, {
      encoding: 'utf8',
    });
    expect(mockWrite).toHaveBeenNthCalledWith(2, '{"id":"a1"}', {
      append: true,
      encoding: 'utf8',
    });
    expect(mockWrite).toHaveBeenNthCalledWith(3, '],"recordings":[', {
      append: true,
      encoding: 'utf8',
    });
    expect(mockWrite).toHaveBeenNthCalledWith(4, ']}', {
      append: true,
      encoding: 'utf8',
    });
    expect(mockShareAsync).toHaveBeenCalledWith(lastFileUri, {
      mimeType: 'application/json',
      dialogTitle: t('settings.export'),
    });
    // The export embeds PII: the cache file is deleted once the share sheet closes.
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('appends multiple pages into one exact JSON document without retaining an aggregate', async () => {
    const cursor = '550e8400-e29b-41d4-a716-446655440041';
    const expected = {
      user: USER,
      attempts: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
      recordings: [],
    };
    mockConsumeExportPages.mockImplementation(async (consumePage, consumeRecordings) => {
      await consumePage({ user: USER, attempts: [{ id: 'a1' }], nextCursor: cursor }, 0);
      await consumePage(
        { user: USER, attempts: [{ id: 'a2' }, { id: 'a3' }], nextCursor: null },
        1,
      );
      await consumeRecordings({ recordings: [], nextCursor: null }, 0);
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));

    expect(lastFileContents).toBe(JSON.stringify(expected));
    expect(JSON.parse(lastFileContents)).toEqual(expected);
    expect(mockWrite).toHaveBeenCalledTimes(5);
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('adds strictly parsed recording metadata without playback capabilities or storage coordinates', async () => {
    const exportedRecording = {
      id: '550e8400-e29b-41d4-a716-446655440090',
      requestId: '550e8400-e29b-41d4-a716-446655440091',
      attemptId: '550e8400-e29b-41d4-a716-446655440092',
      questionId: '550e8400-e29b-41d4-a716-446655440093',
      context: 'practice',
      promptWord: 'courage',
      questionText: 'Describe courage.',
      cefrLevel: 'B1',
      contentType: 'audio/mp4',
      sizeBytes: 2_048,
      durationMs: 8_000,
      status: 'available',
      createdAt: '2026-08-25T00:00:00.000Z',
      availableAt: '2026-08-25T00:00:01.000Z',
    };
    mockConsumeExportPages.mockImplementation(async (consumePage, consumeRecordings) => {
      await consumePage({ user: USER, attempts: [], nextCursor: null }, 0);
      await consumeRecordings({ recordings: [exportedRecording], nextCursor: null }, 0);
    });
    await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));

    expect(JSON.parse(lastFileContents)).toEqual({
      user: USER,
      attempts: [],
      recordings: [exportedRecording],
    });
    expect(lastFileContents).not.toContain('playbackUrl');
    expect(lastFileContents).not.toContain('audioKey');
    expect(lastFileContents).not.toContain('s3VersionId');
  });

  it('deletes a partial file and never shares when a later page fails', async () => {
    mockConsumeExportPages.mockImplementation(async (consumePage) => {
      await consumePage(
        {
          user: USER,
          attempts: [{ id: 'a1' }],
          nextCursor: '550e8400-e29b-41d4-a716-446655440041',
        },
        0,
      );
      throw new ApiError(500, 'page failed');
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
    expect(lastFileContents.endsWith(']}')).toBe(false);
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('rejects an unserializable attempt before creating an export file', async () => {
    const invalidAttempt = { toJSON: () => undefined };
    mockConsumeExportPages.mockImplementation(async (consumePage) => {
      await consumePage({ user: USER, attempts: [invalidAttempt], nextCursor: null }, 0);
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));

    expect(await screen.findByText(t('settings.exportFailed'))).toBeTruthy();
    expect(mockFile).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('rejects an unserializable current user before creating an export file', async () => {
    const invalidUser = { ...USER, toJSON: () => undefined };
    mockConsumeExportPages.mockImplementation(async (consumePage) => {
      await consumePage({ user: invalidUser, attempts: [], nextCursor: null }, 0);
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));

    expect(await screen.findByText(t('settings.exportFailed'))).toBeTruthy();
    expect(mockFile).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('rejects a wrong-account first page before creating or writing a file', async () => {
    mockConsumeExportPages.mockImplementation(async (consumePage) => {
      await consumePage({ user: OTHER_USER, attempts: [{ id: 'foreign' }], nextCursor: null }, 0);
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));

    expect(mockFile).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.exportFailed'))).toBeNull();
  });

  it('aborts and deletes a partial file when identity changes after page one', async () => {
    const remainingPages = deferred<void>();
    let exportSignal: AbortSignal | undefined;
    mockConsumeExportPages.mockImplementation(async (consumePage, _consumeRecordings, signal) => {
      exportSignal = signal;
      await consumePage(
        {
          user: USER,
          attempts: [{ id: 'a1' }],
          nextCursor: '550e8400-e29b-41d4-a716-446655440041',
        },
        0,
      );
      await remainingPages.promise;
    });
    const view = await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(2));
    await crossSettingsOwnershipBoundary(view, 'identity');
    expect(exportSignal?.aborted).toBe(true);
    remainingPages.reject(exportSignal?.reason ?? new Error('aborted'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(1));
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.exportFailed'))).toBeNull();
  });

  it('deletes the export file even when the share sheet fails', async () => {
    mockExportData.mockResolvedValue({ user: USER, attempts: [] });
    mockShareAsync.mockRejectedValue(new Error('share cancelled'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    });

    expect(await screen.findByText(t('settings.exportFailed'))).toBeTruthy();
    expect(lastFileContents).toBe(JSON.stringify({ user: USER, attempts: [], recordings: [] }));
    // Each additive array writes one boundary even when both are empty.
    expect(mockWrite).toHaveBeenCalledTimes(3);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('deletes without closing or sharing when the lease expires after the final page', async () => {
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockConsumeExportPages.mockImplementation(async (consumePage) => {
      await consumePage({ user: USER, attempts: [{ id: 'a1' }], nextCursor: null }, 0);
      leaseCurrent = false;
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));

    expect(lastFileContents.endsWith(']}')).toBe(false);
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('settings.exportFailed'))).toBeNull();
  });

  it('does not write or share an export whose session lease expired in flight', async () => {
    let resolveExport: (data: unknown) => void = () => undefined;
    mockExportData.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      }),
    );
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    await waitFor(() => expect(mockExportData).toHaveBeenCalledTimes(1));
    leaseCurrent = false;
    await act(async () => {
      resolveExport({ user: USER, attempts: [] });
    });

    expect(mockWrite).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.exportFailed'))).toBeNull();
  });

  it('still reports the share outcome when export-file cleanup fails', async () => {
    mockExportData.mockResolvedValue({ user: USER, attempts: [] });
    mockDelete.mockImplementation(() => {
      throw new Error('locked');
    });
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    });

    expect(mockShareAsync).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(t('settings.exportFailed'))).toBeNull();
  });

  it('explains when sharing is unavailable instead of exporting', async () => {
    mockSharingAvailable.mockResolvedValue(false);
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    });

    expect(await screen.findByText(t('settings.exportUnavailable'))).toBeTruthy();
    expect(mockExportData).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('shows the export error when a page fails', async () => {
    mockExportData.mockRejectedValue(new ApiError(429, 'rate limited', 60));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    });

    expect(await screen.findByText(`${t('error.tooMany')} ${t('wait.minute')}`)).toBeTruthy();
    expect(mockFile).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('shows the preparing label and locks the row until the export settles', async () => {
    let resolveExport: (data: unknown) => void = () => undefined;
    mockExportData.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      }),
    );
    await renderSettings();

    const exportRow = () => screen.getByRole('button', { name: t('settings.export') });
    expect(exportRow().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await act(async () => {
      await fireEvent.press(exportRow());
    });

    const busyRow = screen.getByRole('button', { name: t('settings.exportBusy') });
    expect(busyRow.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(
      screen.getByRole('button', { name: t('header.changePassword') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(flattenedStyle(busyRow).opacity).toBe(0.5);
    expect(screen.queryByText(t('settings.export'))).toBeNull();

    await act(async () => {
      resolveExport({ user: USER, attempts: [] });
    });

    expect(exportRow().props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(flattenedStyle(exportRow()).opacity).toBeUndefined();
    expect(screen.queryByText(t('settings.exportBusy'))).toBeNull();
  });
});

describe('daily reminder controls', () => {
  it('enables the reminder at the default hour and shows the time picker', async () => {
    await renderSettings();

    const toggle = () => screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    expect(toggle().props.accessibilityState).toMatchObject({ checked: false });

    await act(async () => {
      await fireEvent.press(toggle());
    });

    expect(mockEnableReminder).toHaveBeenCalledWith(19, 'en');
    expect(toggle().props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(reminderTimeText(19))).toBeTruthy();
  });

  it('schedules once when the toggle is tapped twice before a re-render', async () => {
    let resolveEnable: (value: string) => void = () => undefined;
    mockEnableReminder.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveEnable = resolve;
      }),
    );
    await renderSettings();

    const toggle = screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    await act(async () => {
      // Invoke the committed handler twice inside one React act scope. Calling
      // async RNTL fireEvent twice without awaiting it creates overlapping act
      // scopes, while awaiting the first call would let React disable the
      // control before this same-render re-entrancy case can be exercised.
      const press = committedPressHandler(toggle);
      press();
      press();
    });

    expect(mockEnableReminder).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveEnable('enabled');
    });
  });

  it('keeps the toggle off with an explanation when permission is denied', async () => {
    mockEnableReminder.mockResolvedValue('denied');
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    });

    expect(await screen.findByText(t('reminder.denied'))).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ checked: false });
    expect(screen.queryByText(reminderTimeText(19))).toBeNull();
  });

  it('remembers the hour you were moving to when permission is denied', async () => {
    mockGetReminder.mockResolvedValue({ hour: 8 });
    mockEnableReminder.mockResolvedValue('denied');
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reminder.later') }));
    });

    expect(await screen.findByText(t('reminder.denied'))).toBeTruthy();
    const toggle = () => screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    expect(toggle().props.accessibilityState).toMatchObject({ checked: false });

    mockEnableReminder.mockResolvedValue('enabled');
    await act(async () => {
      await fireEvent.press(toggle());
    });

    // Turning it back on resumes at 9, the hour that was denied — not the old
    // hour and not the default.
    expect(mockEnableReminder).toHaveBeenLastCalledWith(9, 'en');
    expect(screen.getByText(reminderTimeText(9))).toBeTruthy();
  });

  it('restores a stored reminder and reschedules on hour changes with wrap-around', async () => {
    mockGetReminder.mockResolvedValue({ hour: 0 });
    await renderSettings();

    expect(screen.getByText(reminderTimeText(0))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reminder.earlier') }));
    });
    expect(mockEnableReminder).toHaveBeenCalledWith(23, 'en');
    expect(screen.getByText(reminderTimeText(23))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reminder.later') }));
    });
    expect(mockEnableReminder).toHaveBeenLastCalledWith(0, 'en');
    expect(screen.getByText(reminderTimeText(0))).toBeTruthy();
  });

  it('disables the reminder and hides the time picker', async () => {
    mockGetReminder.mockResolvedValue({ hour: 8 });
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    });

    expect(mockDisableReminder).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ checked: false });
    expect(screen.queryByText(reminderTimeText(8))).toBeNull();
  });

  it('locks every reminder control while the OS scheduling is in flight', async () => {
    mockGetReminder.mockResolvedValue({ hour: 8 });
    let resolveEnable: (outcome: string) => void = () => undefined;
    mockEnableReminder.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveEnable = resolve;
      }),
    );
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reminder.later') }));
    });

    const toggle = () => screen.getByRole('switch', { name: t('reminder.toggleLabel') });
    const hourButton = (name: string) => screen.getByRole('button', { name });
    expect(toggle().props.accessibilityState).toEqual({
      checked: true,
      disabled: true,
      busy: true,
    });
    expect(
      screen.getByRole('button', { name: t('header.changePassword') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    for (const name of [
      t('header.changePassword'),
      t('header.privacy'),
      t('header.terms'),
      t('header.deleteAccount'),
    ]) {
      const row = screen.getByRole('button', { name });
      expect(row.props.accessibilityState).toMatchObject({ disabled: true });
      expect(flattenedStyle(row).opacity).toBe(0.5);
      await fireEvent.press(row);
    }
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(flattenedStyle(toggle()).opacity).toBe(0.5);
    for (const name of [t('reminder.earlier'), t('reminder.later')]) {
      const button = hourButton(name);
      expect(button.props.accessibilityState).toMatchObject({ disabled: true });
      expect(flattenedStyle(button).opacity).toBe(0.5);
      await fireEvent.press(button);
    }
    expect(mockEnableReminder).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveEnable('enabled');
    });

    expect(toggle().props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
      busy: false,
    });
    expect(flattenedStyle(toggle()).opacity).toBeUndefined();
    for (const name of [t('reminder.earlier'), t('reminder.later')]) {
      const button = hourButton(name);
      expect(button.props.accessibilityState).toMatchObject({ disabled: false });
      expect(flattenedStyle(button).opacity).toBeUndefined();
    }
    expect(screen.getByText(reminderTimeText(9))).toBeTruthy();
  });

  it('shows the reminder error when the OS scheduling fails', async () => {
    mockEnableReminder.mockRejectedValue(new Error('os error'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    });

    const error = await screen.findByText(t('reminder.failed'));
    expect(flattenedStyle(error)).toEqual({ marginTop: 6, color: colors.danger, fontSize: 13 });
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ checked: false });
  });
});

describe('retake placement test', () => {
  it('opens one navigation-locked confirmation and releases it on cancel', async () => {
    await renderSettings();
    const row = screen.getByRole('button', { name: t('settings.retake') });
    const open = committedPressHandler(row);
    const preventDefault = jest.fn();

    await act(async () => {
      open();
      mockBeforeRemoveListener?.({
        data: { action: { type: 'GO_BACK' } },
        preventDefault,
      });
      open();
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: t('settings.retake') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });
    expect(
      screen.getByRole('button', { name: t('header.changePassword') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await pressAlertButton(t('common.cancel'));
    expect(
      screen.getByRole('button', { name: t('settings.retake') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });

  it('confirms, restarts the diagnostic, drops practice caches, and routes to the test', async () => {
    mockRestartDiagnostic.mockResolvedValue(undefined);
    const queryClient = makeQueryClient();
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderSettings(queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    expect(alertSpy).toHaveBeenCalledWith(
      t('retake.confirmTitle'),
      t('retake.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel', onPress: expect.any(Function) },
        { text: t('retake.confirm'), style: 'destructive', onPress: expect.any(Function) },
      ],
      expect.objectContaining({ cancelable: true, onDismiss: expect.any(Function) }),
    );

    await pressAlertButton(t('retake.confirm'));

    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);
    // The reset test re-uses the same /next cache key, so a surviving entry
    // would re-serve the already-answered question (or the old congrats
    // screen) and the recorded answer would come back 409 QUESTION_MISMATCH.
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['diagnostic-next'] });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['practice-question'] });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'], type: 'inactive' });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['practice-history'] });
    // The session profile just lost its level: the cached /auth/me must refetch.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({
      ...USER,
      diagnosticCompleted: false,
      cefrLevel: null,
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/diagnostic');
  });

  it('locks the retake row while the restart is in flight and frees it after', async () => {
    let resolveRestart: () => void = () => undefined;
    mockRestartDiagnostic.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRestart = resolve;
      }),
    );
    await renderSettings();

    const retakeRow = () => screen.getByRole('button', { name: t('settings.retake') });
    expect(retakeRow().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(retakeRow());
    await pressAlertButton(t('retake.confirm'));

    expect(retakeRow().props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(
      screen.getByRole('button', { name: t('header.changePassword') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(flattenedStyle(retakeRow()).opacity).toBe(0.5);

    await act(async () => {
      resolveRestart();
    });

    expect(retakeRow().props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(flattenedStyle(retakeRow()).opacity).toBeUndefined();
  });

  it('frees the export latch so a later export still runs', async () => {
    // The re-entrancy ref must be released in the finally, or the learner gets
    // exactly one export per app launch.
    await renderSettings();
    const row = () => screen.getByRole('button', { name: t('settings.export') });

    await fireEvent.press(row());
    expect(mockExportData).toHaveBeenCalledTimes(1);
    await fireEvent.press(row());
    expect(mockExportData).toHaveBeenCalledTimes(2);
  });

  it('exports once when the row is tapped twice before a re-render', async () => {
    // Both presses are dispatched inside one act(), so React has not yet
    // re-rendered the row as disabled when the second one lands.
    let resolveExport: (value: unknown) => void = () => undefined;
    mockExportData.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve;
      }),
    );
    await renderSettings();

    const row = screen.getByRole('button', { name: t('settings.export') });
    await act(async () => {
      // Keep both activations in the same committed render without nesting the
      // async act scope that RNTL's fireEvent creates internally.
      const press = committedPressHandler(row);
      press();
      press();
    });

    expect(mockExportData).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveExport({ user: {}, attempts: [], nextCursor: null });
    });
  });

  it('frees the retake latch so a later retake still runs', async () => {
    mockRestartDiagnostic
      .mockRejectedValueOnce(new Error('first restart failed'))
      .mockResolvedValueOnce(undefined);
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));
    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));
    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(2);
  });

  it('fires one restart when the confirmation is taken twice before a re-render', async () => {
    // The row's `disabled={retakeBusy}` and retakeTest's own guard read the same
    // render's state, so a second activation arriving before React re-renders
    // still sees `false`. Only a synchronous latch stops the second restart.
    let resolveRestart: () => void = () => undefined;
    mockRestartDiagnostic.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRestart = resolve;
      }),
    );
    await renderSettings();

    const retakeRow = screen.getByRole('button', { name: t('settings.retake') });
    const reopen = committedPressHandler(retakeRow);
    await fireEvent.press(retakeRow);
    const calls = alertSpy.mock.calls;
    const buttons = calls[calls.length - 1][2] as { text?: string; onPress?: () => void }[];
    const confirm = buttons.find((candidate) => candidate.text === t('retake.confirm'))?.onPress;
    if (!confirm) throw new Error('retake confirmation button not found');

    await act(async () => {
      confirm();
      reopen();
      confirm();
    });

    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveRestart();
    });
  });

  it('keeps settings handlers inert after a successful retake starts navigation', async () => {
    mockRestartDiagnostic.mockResolvedValue(undefined);
    await renderSettings();
    const staleExport = committedPressHandler(
      screen.getByRole('button', { name: t('settings.export') }),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/diagnostic'));
    mockSharingAvailable.mockClear();

    await act(async () => {
      staleExport();
      await Promise.resolve();
    });

    expect(mockSharingAvailable).not.toHaveBeenCalled();
  });

  it('does not let an old dismiss clear a newer retake confirmation', async () => {
    mockRestartDiagnostic.mockResolvedValue(undefined);
    await renderSettings();
    const row = () => screen.getByRole('button', { name: t('settings.retake') });
    await fireEvent.press(row());
    const firstCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const firstButtons = firstCall[2] as { text?: string; onPress?: () => void }[];
    const firstCancel = firstButtons.find((button) => button.text === t('common.cancel'))?.onPress;
    const firstDismiss = (firstCall[3] as { onDismiss?: () => void }).onDismiss;
    if (!firstCancel || !firstDismiss) throw new Error('First confirmation callbacks are missing');
    await act(async () => firstCancel());

    await fireEvent.press(row());
    const secondCall = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    const secondButtons = secondCall[2] as { text?: string; onPress?: () => void }[];
    const secondConfirm = secondButtons.find(
      (button) => button.text === t('retake.confirm'),
    )?.onPress;
    if (!secondConfirm) throw new Error('Second confirmation callback is missing');

    await act(async () => {
      firstDismiss();
      secondConfirm();
      await Promise.resolve();
    });

    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);
  });

  it('writes the session user as it stands when the restart lands', async () => {
    // A language (or name) change can resolve while the restart is in flight.
    // Rebuilding the user from the confirmation-time closure would revert it,
    // and nothing refetches /me while a user is set to repair that.
    let resolveRestart: () => void = () => undefined;
    mockRestartDiagnostic.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRestart = resolve;
      }),
    );
    const { rerenderSettings } = await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));

    const setUser = mockAuthValue.setUser;
    const relanguaged = { ...USER, nativeLanguage: 'hi' as const };
    mockAuthValue = makeAuth({ user: relanguaged, setUser });
    await act(async () => rerenderSettings());

    await act(async () => {
      resolveRestart();
    });

    expect(setUser).toHaveBeenCalledWith({
      ...relanguaged,
      diagnosticCompleted: false,
      cefrLevel: null,
    });
  });

  it('does not rebuild a session that ended while the restart was in flight', async () => {
    let resolveRestart: () => void = () => undefined;
    mockRestartDiagnostic.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRestart = resolve;
      }),
    );
    const { rerenderSettings } = await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));

    const setUser = mockAuthValue.setUser;
    mockAuthValue = makeAuth({ user: null, setUser });
    await act(async () => rerenderSettings());

    await act(async () => {
      resolveRestart();
    });

    // There is no profile left to flip; writing a fields-only object would
    // resurrect a signed-out session as a user with no id or email.
    expect(setUser).not.toHaveBeenCalled();
  });

  it('keeps the profile untouched when the restart fails', async () => {
    mockRestartDiagnostic.mockRejectedValue(new ApiError(500, 'boom'));
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('falls back to the generic retake message and re-arms the row', async () => {
    mockRestartDiagnostic.mockRejectedValue(new Error('offline'));
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));

    const error = await screen.findByText(t('retake.failed'));
    expect(flattenedStyle(error)).toEqual({ marginTop: 6, color: colors.danger, fontSize: 13 });
    expect(
      screen.getByRole('button', { name: t('settings.retake') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });
});

describe('account actions', () => {
  it.each([
    [t('header.changePassword'), '/settings/change-password'],
    [t('header.privacy'), '/settings/privacy'],
    [t('header.terms'), '/settings/terms'],
    [t('header.deleteAccount'), '/settings/delete-account'],
  ] as const)('navigates once to %s after a same-frame double tap', async (label, destination) => {
    await renderSettings();
    const navigate = committedPressHandler(screen.getByRole('button', { name: label }));

    await act(async () => {
      navigate();
      navigate();
    });
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(destination);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('re-arms singleton navigation on focus and blocks saved handlers after blur', async () => {
    await renderSettings();
    const focus = mockFocusCallback;
    if (!focus) throw new Error('Settings did not register its focus lifecycle');

    await fireEvent.press(screen.getByRole('button', { name: t('header.changePassword') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);

    await act(async () => {
      focus();
    });
    await fireEvent.press(screen.getByRole('button', { name: t('header.privacy') }));
    expect(mockRouter.navigate).toHaveBeenCalledTimes(2);

    let cleanup: void | (() => void);
    await act(async () => {
      cleanup = focus();
      cleanup?.();
    });
    await act(async () => {
      committedPressHandler(screen.getByRole('button', { name: t('header.terms') }))();
    });
    expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
  });

  it('logs out and returns to the gate', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.logout).toHaveBeenCalledTimes(1);
  });

  it('keeps settings handlers inert after logout starts gate navigation', async () => {
    await renderSettings();
    const staleExport = committedPressHandler(
      screen.getByRole('button', { name: t('settings.export') }),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    mockSharingAvailable.mockClear();

    await act(async () => {
      staleExport();
      await Promise.resolve();
    });

    expect(mockSharingAvailable).not.toHaveBeenCalled();
  });

  it('logs out once when the row is tapped twice before a re-render', async () => {
    // The second tap would throw out of the auth transition guard, alerting
    // "we could not log you out" over a logout that is in fact succeeding.
    let resolveLogout: () => void = () => undefined;
    const logout = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogout = resolve;
      }),
    );
    mockAuthValue = makeAuth({ logout });
    await renderSettings();

    const row = screen.getByRole('button', { name: t('common.logOut') });
    await act(async () => {
      const press = committedPressHandler(row);
      press();
      press();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();

    await act(async () => {
      resolveLogout();
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('locks the log out row while the logout is in flight and frees it after', async () => {
    let resolveLogout: () => void = () => undefined;
    const logout = jest.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogout = resolve;
      }),
    );
    mockAuthValue = makeAuth({ logout });
    await renderSettings();

    const logoutRow = () => screen.getByRole('button', { name: t('common.logOut') });
    expect(logoutRow().props.accessibilityState).toEqual({ disabled: false, busy: false });

    await fireEvent.press(logoutRow());

    expect(logoutRow().props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(flattenedStyle(logoutRow()).opacity).toBe(0.5);

    await act(async () => {
      resolveLogout();
    });

    expect(logoutRow().props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(flattenedStyle(logoutRow()).opacity).toBeUndefined();
  });

  it('frees the logout latch so a later attempt still runs', async () => {
    mockAuthValue = makeAuth({ logout: jest.fn().mockRejectedValue(new Error('network down')) });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() => expect(mockAuthValue.logout).toHaveBeenCalledTimes(2));
  });

  it('explains a logout cleanup failure', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new LogoutCleanupError()),
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('logout.cleanupTitle'),
        t('auth.logoutCleanupFailed'),
      ),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('reports a logout failure that is not a cleanup problem generically', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new Error('network down')),
    });
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(t('logout.failedTitle'), t('logout.failedBody')),
    );
    // The raw transport message never reaches the user.
    expect(alertSpy).not.toHaveBeenCalledWith(t('logout.cleanupTitle'), 'network down');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('renders nothing without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    await renderSettings();
    expect(screen.queryByText(t('settings.profileTitle'))).toBeNull();
  });
});

describe('settings async race fences', () => {
  it('aborts an in-flight export on an identity transition and on unmount', async () => {
    const firstExport = deferred<unknown>();
    let firstSignal: AbortSignal | undefined;
    mockExportData.mockImplementationOnce((signal: AbortSignal) => {
      firstSignal = signal;
      return firstExport.promise;
    });
    const first = await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    await waitFor(() => expect(mockExportData).toHaveBeenCalledTimes(1));
    expect(firstSignal?.aborted).toBe(false);

    const setUser = mockAuthValue.setUser;
    mockAuthValue = makeAuth({
      user: { ...USER, id: '550e8400-e29b-41d4-a716-446655440001' },
      sessionVersion: 2,
      setUser,
    });
    await first.rerenderSettings();
    expect(firstSignal?.aborted).toBe(true);
    firstExport.reject(new Error('aborted'));
    await act(async () => Promise.resolve());
    await first.unmount();

    const secondExport = deferred<unknown>();
    let secondSignal: AbortSignal | undefined;
    mockExportData.mockImplementationOnce((signal: AbortSignal) => {
      secondSignal = signal;
      return secondExport.promise;
    });
    const second = await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    await waitFor(() => expect(mockExportData).toHaveBeenCalledTimes(2));
    expect(secondSignal?.aborted).toBe(false);
    await second.unmount();
    expect(secondSignal?.aborted).toBe(true);
    secondExport.reject(new Error('aborted'));
    await act(async () => Promise.resolve());
  });

  it.each([
    ['name', 'identity'],
    ['name', 'unmount'],
    ['language', 'identity'],
    ['language', 'unmount'],
  ] as const)(
    'publishes no stale %s finalizer after %s ownership is lost',
    async (field, boundary) => {
      const update = deferred<User>();
      mockUpdateProfile.mockReturnValue(update.promise);
      const originalSetUser = mockAuthValue.setUser;
      const view = await renderSettings();
      let submit: () => unknown;
      if (field === 'name') {
        const input = screen.getByLabelText(t('signup.nameLabel'));
        await fireEvent(input, 'focus');
        await fireEvent.changeText(input, 'Ada King');
        submit = committedPressHandler(
          screen.getByRole('button', { name: t('settings.saveName') }),
        );
      } else {
        submit = committedPressHandler(languageChip(1));
      }

      await act(async () => {
        void submit();
        await Promise.resolve();
      });
      expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
      await crossSettingsOwnershipBoundary(view, boundary);
      mockSetOptions.mockClear();
      alertSpy.mockClear();

      await act(async () => {
        update.resolve(
          field === 'name' ? { ...USER, name: 'Ada King' } : { ...USER, nativeLanguage: 'hi' },
        );
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(originalSetUser).not.toHaveBeenCalled();
      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
      if (boundary === 'identity') {
        expect(screen.queryByText(t('settings.saved'))).toBeNull();
        expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
      }
    },
  );

  it.each(['identity', 'unmount'] as const)(
    'does not write, share, or publish an export finalizer after %s loss',
    async (boundary) => {
      const exported = deferred<unknown>();
      mockExportData.mockReturnValue(exported.promise);
      const view = await renderSettings();
      const exportData = committedPressHandler(
        screen.getByRole('button', { name: t('settings.export') }),
      );
      await act(async () => {
        void exportData();
        await Promise.resolve();
        await Promise.resolve();
      });
      await waitFor(() => expect(mockExportData).toHaveBeenCalledTimes(1));

      await crossSettingsOwnershipBoundary(view, boundary);
      mockSetOptions.mockClear();
      mockWrite.mockClear();
      mockShareAsync.mockClear();
      alertSpy.mockClear();
      await act(async () => {
        exported.resolve({ profile: USER });
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockWrite).not.toHaveBeenCalled();
      expect(mockShareAsync).not.toHaveBeenCalled();
      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      if (boundary === 'identity') {
        expect(screen.queryByText(t('settings.exportFailed'))).toBeNull();
      }
    },
  );

  it.each(['identity', 'unmount'] as const)(
    'publishes no stale reminder state or navigation finalizer after %s loss',
    async (boundary) => {
      const enabled = deferred<string>();
      mockEnableReminder.mockReturnValue(enabled.promise);
      const view = await renderSettings();
      const toggle = committedPressHandler(
        screen.getByRole('switch', { name: t('reminder.toggleLabel') }),
      );
      await act(async () => {
        void toggle();
        await Promise.resolve();
      });
      expect(mockEnableReminder).toHaveBeenCalledTimes(1);

      await crossSettingsOwnershipBoundary(view, boundary);
      mockSetOptions.mockClear();
      await act(async () => {
        enabled.resolve('enabled');
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockSetOptions).not.toHaveBeenCalled();
      if (boundary === 'identity') {
        expect(
          screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
        ).toMatchObject({ checked: false });
        expect(screen.queryByText(t('reminder.failed'))).toBeNull();
      }
    },
  );

  it.each(['identity', 'unmount'] as const)(
    'publishes no stale retake finalizer after %s loss',
    async (boundary) => {
      const restart = deferred<void>();
      mockRestartDiagnostic.mockReturnValue(restart.promise);
      const client = makeQueryClient();
      const remove = jest.spyOn(client, 'removeQueries');
      const invalidate = jest.spyOn(client, 'invalidateQueries');
      const view = await renderSettings(client);
      await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
      await pressAlertButton(t('retake.confirm'));
      expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);

      await crossSettingsOwnershipBoundary(view, boundary);
      mockSetOptions.mockClear();
      alertSpy.mockClear();
      await act(async () => {
        restart.resolve(undefined);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(remove).not.toHaveBeenCalled();
      expect(invalidate).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    },
  );

  it.each(['identity', 'unmount'] as const)(
    'publishes no stale logout finalizer after %s loss',
    async (boundary) => {
      const logoutRequest = deferred<void>();
      const logout = jest.fn(() => logoutRequest.promise);
      mockAuthValue = makeAuth({ logout });
      const view = await renderSettings();
      const logOut = committedPressHandler(
        screen.getByRole('button', { name: t('common.logOut') }),
      );
      await act(async () => {
        void logOut();
        await Promise.resolve();
      });
      expect(logout).toHaveBeenCalledTimes(1);

      await crossSettingsOwnershipBoundary(view, boundary);
      mockSetOptions.mockClear();
      alertSpy.mockClear();
      await act(async () => {
        logoutRequest.resolve(undefined);
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    },
  );

  it.each(['name', 'language', 'reminder', 'retake', 'logout'] as const)(
    'does not publish a stale %s failure into a replacement identity',
    async (operation) => {
      const failure = deferred<never>();
      let start: () => unknown;
      let called: jest.Mock;

      if (operation === 'name' || operation === 'language') {
        mockUpdateProfile.mockReturnValue(failure.promise);
        called = mockUpdateProfile;
      } else if (operation === 'reminder') {
        mockEnableReminder.mockReturnValue(failure.promise);
        called = mockEnableReminder;
      } else if (operation === 'retake') {
        mockRestartDiagnostic.mockReturnValue(failure.promise);
        called = mockRestartDiagnostic;
      } else {
        const logout = jest.fn(() => failure.promise);
        mockAuthValue = makeAuth({ logout });
        called = logout;
      }

      const view = await renderSettings();
      if (operation === 'name') {
        const input = screen.getByLabelText(t('signup.nameLabel'));
        await fireEvent(input, 'focus');
        await fireEvent.changeText(input, 'Ada King');
        start = committedPressHandler(screen.getByRole('button', { name: t('settings.saveName') }));
      } else if (operation === 'language') {
        start = committedPressHandler(languageChip(1));
      } else if (operation === 'reminder') {
        start = committedPressHandler(
          screen.getByRole('switch', { name: t('reminder.toggleLabel') }),
        );
      } else if (operation === 'retake') {
        start = committedPressHandler(screen.getByRole('button', { name: t('settings.retake') }));
      } else {
        start = committedPressHandler(screen.getByRole('button', { name: t('common.logOut') }));
      }

      await act(async () => {
        void start();
        await Promise.resolve();
      });
      if (operation === 'retake') await pressAlertButton(t('retake.confirm'));
      await waitFor(() => expect(called).toHaveBeenCalledTimes(1));
      await crossSettingsOwnershipBoundary(view, 'identity');
      mockSetOptions.mockClear();
      alertSpy.mockClear();

      await act(async () => {
        failure.reject(new Error('late failure'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
      expect(screen.queryByText(t('reminder.failed'))).toBeNull();
      expect(screen.queryByText(t('retake.failed'))).toBeNull();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockSetOptions).not.toHaveBeenCalled();
    },
  );

  it('does not show a generic logout failure after Settings has unmounted', async () => {
    const logoutRequest = deferred<void>();
    const logout = jest.fn(() => logoutRequest.promise);
    mockAuthValue = makeAuth({ logout });
    const view = await renderSettings();
    const logOut = committedPressHandler(screen.getByRole('button', { name: t('common.logOut') }));
    await act(async () => {
      void logOut();
      await Promise.resolve();
    });
    expect(logout).toHaveBeenCalledTimes(1);

    await view.unmount();
    alertSpy.mockClear();
    mockSetOptions.mockClear();
    await act(async () => {
      logoutRequest.reject(new Error('late failure'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('still reports logout cleanup failure globally without stale route finalization', async () => {
    const logoutRequest = deferred<void>();
    const logout = jest.fn(() => logoutRequest.promise);
    mockAuthValue = makeAuth({ logout });
    const view = await renderSettings();
    const logOut = committedPressHandler(screen.getByRole('button', { name: t('common.logOut') }));
    await act(async () => {
      void logOut();
      await Promise.resolve();
    });
    expect(logout).toHaveBeenCalledTimes(1);

    await view.unmount();
    alertSpy.mockClear();
    mockSetOptions.mockClear();
    await act(async () => {
      logoutRequest.reject(new LogoutCleanupError());
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledWith(t('logout.cleanupTitle'), t('auth.logoutCleanupFailed'));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('makes every retake Alert callback inert after unmount', async () => {
    const view = await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    const alertCalls = alertSpy.mock.calls;
    const buttons = alertCalls[alertCalls.length - 1]?.[2] as
      { text?: string; onPress?: () => void }[] | undefined;
    const cancel = buttons?.find((button) => button.text === t('common.cancel'))?.onPress;
    const confirm = buttons?.find((button) => button.text === t('retake.confirm'))?.onPress;
    const options = alertCalls[alertCalls.length - 1]?.[3] as
      { onDismiss?: () => void } | undefined;
    expect(cancel).toEqual(expect.any(Function));
    expect(confirm).toEqual(expect.any(Function));
    await view.unmount();
    mockSetOptions.mockClear();

    await act(async () => {
      cancel?.();
      options?.onDismiss?.();
      confirm?.();
    });
    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(mockRestartDiagnostic).not.toHaveBeenCalled();
  });

  it('rejects a profile response belonging to another account', async () => {
    mockUpdateProfile.mockResolvedValue({
      ...USER,
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Mallory',
    });
    await renderSettings();
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: t('settings.saveName') }).props.accessibilityState,
      ).toMatchObject({ busy: false }),
    );
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.saved'))).toBeNull();
  });

  it('does not let saved profile handlers start work after unmount', async () => {
    mockUpdateProfile.mockResolvedValue({ ...USER, name: 'Ada King' });
    const nameView = await renderSettings();
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    const save = committedPressHandler(
      screen.getByRole('button', { name: t('settings.saveName') }),
    );
    await nameView.unmount();
    await act(async () => {
      save();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();

    const languageView = await renderSettings();
    const chooseHindi = committedPressHandler(languageChip(1));
    await languageView.unmount();
    await act(async () => {
      chooseHindi();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('does not let profile handlers captured by an older identity PATCH the new account', async () => {
    mockUpdateProfile.mockResolvedValue({ ...USER, name: 'Ada King', nativeLanguage: 'hi' });
    const view = await renderSettings();
    const originalSetUser = mockAuthValue.setUser;
    const nameInput = screen.getByLabelText(t('signup.nameLabel'));
    await fireEvent(nameInput, 'focus');
    await fireEvent.changeText(nameInput, 'Ada King');
    const saveName = committedPressHandler(
      screen.getByRole('button', { name: t('settings.saveName') }),
    );
    const chooseHindi = committedPressHandler(languageChip(1));

    await crossSettingsOwnershipBoundary(view, 'identity');
    mockUpdateProfile.mockClear();
    await act(async () => {
      await Promise.resolve(saveName());
      await Promise.resolve(chooseHindi());
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(originalSetUser).not.toHaveBeenCalled();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
  });

  it('keeps old-identity text callbacks from mutating the replacement profile field', async () => {
    const view = await renderSettings();
    const oldInput = screen.getByLabelText(t('signup.nameLabel'));
    const oldChange = oldInput.props.onChangeText as (value: string) => void;
    const oldFocus = oldInput.props.onFocus as () => void;
    const oldBlur = oldInput.props.onBlur as () => void;

    await crossSettingsOwnershipBoundary(view, 'identity');
    const replacementInput = () => screen.getByLabelText(t('signup.nameLabel'));
    const restingStyle = flattenedStyle(replacementInput());

    await act(async () => oldChange('Stale intruder'));
    expect(replacementInput().props.value).toBe(OTHER_USER.name);

    await act(async () => oldFocus());
    expect(flattenedStyle(replacementInput())).toEqual(restingStyle);

    await fireEvent(replacementInput(), 'focus');
    await fireEvent.changeText(replacementInput(), 'Grace Murray');
    const focusedStyle = flattenedStyle(replacementInput());
    await act(async () => oldBlur());
    expect(replacementInput().props.value).toBe('Grace Murray');
    expect(flattenedStyle(replacementInput())).toEqual(focusedStyle);
  });

  it.each(['identity', 'unmount'] as const)(
    'does not let an export handler captured before %s read or share account data',
    async (boundary) => {
      mockExportData.mockResolvedValue({ profile: USER });
      const view = await renderSettings();
      const exportData = committedPressHandler(
        screen.getByRole('button', { name: t('settings.export') }),
      );

      await crossSettingsOwnershipBoundary(view, boundary);
      mockSharingAvailable.mockClear();
      mockExportData.mockClear();
      mockWrite.mockClear();
      mockShareAsync.mockClear();
      await act(async () => {
        void exportData();
        await Promise.resolve();
      });

      expect(mockSharingAvailable).not.toHaveBeenCalled();
      expect(mockExportData).not.toHaveBeenCalled();
      expect(mockWrite).not.toHaveBeenCalled();
      expect(mockShareAsync).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['toggle', t('reminder.toggleLabel')],
    ['hour stepper', t('reminder.earlier')],
  ] as const)(
    'does not let a captured reminder %s mutate device state after identity or unmount',
    async (_control, label) => {
      for (const boundary of ['identity', 'unmount'] as const) {
        mockGetReminder.mockResolvedValue({ hour: 8 });
        const view = await renderSettings();
        const changeReminder = committedPressHandler(
          screen.getByRole(label === t('reminder.toggleLabel') ? 'switch' : 'button', {
            name: label,
          }),
        );

        await crossSettingsOwnershipBoundary(view, boundary);
        mockEnableReminder.mockClear();
        mockDisableReminder.mockClear();
        await act(async () => {
          void changeReminder();
          await Promise.resolve();
        });

        expect(mockEnableReminder).not.toHaveBeenCalled();
        expect(mockDisableReminder).not.toHaveBeenCalled();
        if (boundary === 'identity') await view.unmount();
      }
    },
  );

  it.each(['identity', 'unmount'] as const)(
    'makes a captured retake opener inert after %s ownership is lost',
    async (boundary) => {
      const view = await renderSettings();
      const openRetake = committedPressHandler(
        screen.getByRole('button', { name: t('settings.retake') }),
      );

      await crossSettingsOwnershipBoundary(view, boundary);
      alertSpy.mockClear();
      await act(async () => openRetake());

      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockRestartDiagnostic).not.toHaveBeenCalled();
    },
  );

  it.each(['identity', 'unmount'] as const)(
    'makes a captured logout handler inert after %s ownership is lost',
    async (boundary) => {
      const logout = jest.fn().mockResolvedValue(undefined);
      mockAuthValue = makeAuth({ logout });
      const view = await renderSettings();
      const logOut = committedPressHandler(
        screen.getByRole('button', { name: t('common.logOut') }),
      );

      await crossSettingsOwnershipBoundary(view, boundary);
      await act(async () => {
        void logOut();
        await Promise.resolve();
      });

      expect(logout).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['blank', '   '],
    ['overlong', 'a'.repeat(MAX_NAME_LENGTH + 1)],
    ['canonical', USER.name],
  ])('revalidates a same-frame %s draft before PATCH', async (_label, unsafeDraft) => {
    mockUpdateProfile.mockResolvedValue({ ...USER, name: 'Ada King' });
    await renderSettings();
    const input = screen.getByLabelText(t('signup.nameLabel'));
    await fireEvent.changeText(input, 'Ada King');
    const save = committedPressHandler(
      screen.getByRole('button', { name: t('settings.saveName') }),
    );
    const change = input.props.onChangeText as (value: string) => void;

    await act(async () => {
      change(unsafeDraft);
      save();
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('submits a name of exactly the maximum length', async () => {
    const maximumName = 'a'.repeat(MAX_NAME_LENGTH);
    mockUpdateProfile.mockResolvedValue({ ...USER, name: maximumName });
    await renderSettings();
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), maximumName);
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ name: maximumName }));
  });

  it('marks an unchanged saved draft clean before a later canonical blur', async () => {
    const update = deferred<User>();
    mockUpdateProfile.mockReturnValue(update.promise);
    const { rerenderSettings } = await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));
    await fireEvent(input(), 'focus');
    await fireEvent.changeText(input(), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    update.resolve({ ...USER, name: 'Ada King' });
    await act(async () => Promise.resolve());

    const setUser = mockAuthValue.setUser;
    mockAuthValue = makeAuth({ user: { ...USER, name: 'Ada Byron' }, setUser });
    await rerenderSettings();
    await fireEvent(input(), 'blur');
    expect(input().props.value).toBe('Ada Byron');
  });

  it('treats a newer whitespace-only variation of the saved name as clean', async () => {
    const update = deferred<User>();
    mockUpdateProfile.mockReturnValue(update.promise);
    const { rerenderSettings } = await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));
    await fireEvent(input(), 'focus');
    await fireEvent.changeText(input(), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    await fireEvent.changeText(input(), '  Ada King  ');
    update.resolve({ ...USER, name: 'Ada King' });
    await act(async () => Promise.resolve());

    const setUser = mockAuthValue.setUser;
    mockAuthValue = makeAuth({ user: { ...USER, name: 'Ada Byron' }, setUser });
    await rerenderSettings();
    await fireEvent(input(), 'blur');
    expect(input().props.value).toBe('Ada Byron');
  });

  it('keeps a genuinely newer draft dirty when the older save lands', async () => {
    const update = deferred<User>();
    mockUpdateProfile.mockReturnValue(update.promise);
    await renderSettings();
    const input = () => screen.getByLabelText(t('signup.nameLabel'));
    await fireEvent(input(), 'focus');
    await fireEvent.changeText(input(), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    await fireEvent.changeText(input(), 'Ada King Jr');
    update.resolve({ ...USER, name: 'Ada King' });
    await act(async () => Promise.resolve());
    await fireEvent(input(), 'blur');
    expect(input().props.value).toBe('Ada King Jr');
  });

  it('suppresses a name failure after its session lease expires', async () => {
    const update = deferred<User>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockUpdateProfile.mockReturnValue(update.promise);
    await renderSettings();
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    update.reject(new Error('late failure'));
    await act(async () => Promise.resolve());
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
  });

  it('stops a language continuation when commitUser rejects its expired lease', async () => {
    const update = deferred<User>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockUpdateProfile.mockReturnValue(update.promise);
    const client = makeQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await renderSettings(client);
    await fireEvent.press(languageChip(1));
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    update.resolve({ ...USER, nativeLanguage: 'hi' });
    await act(async () => Promise.resolve());
    expect(invalidate).not.toHaveBeenCalled();
    expect(mockRefreshReminderLanguage).not.toHaveBeenCalled();
  });

  it('does not release another reminder operation when language refresh finishes first', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    const disable = deferred<void>();
    const refresh = deferred<{ hour: number } | null>();
    mockDisableReminder.mockReturnValue(disable.promise);
    mockRefreshReminderLanguage.mockReturnValue(refresh.promise);
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' });
    await renderSettings();

    const staleToggle = committedPressHandler(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }),
    );
    await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    await fireEvent.press(appLanguageChip(1));
    await waitFor(() => expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi'));
    refresh.resolve(null);
    await act(async () => Promise.resolve());

    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ disabled: true, busy: true });
    await act(async () => {
      staleToggle();
      await Promise.resolve();
    });
    expect(mockDisableReminder).toHaveBeenCalledTimes(1);
    disable.resolve();
    await act(async () => Promise.resolve());
  });

  it('does not publish a refreshed reminder after the language lease expires', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    const refresh = deferred<{ hour: number } | null>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockRefreshReminderLanguage.mockReturnValue(refresh.promise);
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' });
    await renderSettings();
    await fireEvent.press(appLanguageChip(1));
    await waitFor(() => expect(mockAuthValue.setUser).toHaveBeenCalled());
    await waitFor(() => expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi'));

    leaseCurrent = false;
    refresh.resolve({ hour: 20 });
    await act(async () => Promise.resolve());
    expect(screen.getByText(reminderTimeText(19))).toBeTruthy();
    expect(screen.queryByText(reminderTimeText(20))).toBeNull();
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ disabled: true, busy: true });
  });

  it('does not publish fallback reminder state after the language lease expires', async () => {
    const fallback = deferred<{ hour: number } | null>();
    mockGetReminder.mockResolvedValueOnce({ hour: 19 }).mockReturnValueOnce(fallback.promise);
    const refresh = deferred<{ hour: number } | null>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockRefreshReminderLanguage.mockReturnValue(refresh.promise);
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' });
    await renderSettings();
    await fireEvent.press(appLanguageChip(1));
    await waitFor(() => expect(mockAuthValue.setUser).toHaveBeenCalled());
    await waitFor(() => expect(mockRefreshReminderLanguage).toHaveBeenCalledWith('hi'));

    leaseCurrent = false;
    refresh.reject(new Error('schedule failed'));
    await waitFor(() => expect(mockGetReminder).toHaveBeenCalledTimes(2));
    fallback.resolve({ hour: 20 });
    await act(async () => Promise.resolve());
    expect(screen.getByText(reminderTimeText(19))).toBeTruthy();
    expect(screen.queryByText(reminderTimeText(20))).toBeNull();
    expect(screen.queryByText(hi('reminder.failed'))).toBeNull();
  });

  it('suppresses a language PATCH failure after its lease expires', async () => {
    const update = deferred<User>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockUpdateProfile.mockReturnValue(update.promise);
    await renderSettings();
    await fireEvent.press(languageChip(1));
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    update.reject(new Error('late failure'));
    await act(async () => Promise.resolve());
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
  });

  it('handles a successful language refresh before reminder hydration', async () => {
    mockGetReminder.mockReturnValueOnce(new Promise(() => undefined));
    mockRefreshReminderLanguage.mockResolvedValue(null);
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' });
    await renderSettings();
    await fireEvent.press(appLanguageChip(1));

    await waitFor(() =>
      expect(screen.getByRole('switch', { name: t('reminder.toggleLabel') })).toBeTruthy(),
    );
    expect(screen.queryByText(hi('reminder.failed'))).toBeNull();
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
  });

  it('reports reminder fallback failure before hydration without mislabeling the PATCH', async () => {
    mockGetReminder.mockReturnValueOnce(new Promise(() => undefined)).mockResolvedValue(null);
    mockRefreshReminderLanguage.mockRejectedValue(new Error('schedule failed'));
    mockUpdateProfile.mockResolvedValue({ ...USER, uiLanguage: 'hi' });
    await renderSettings();
    await fireEvent.press(appLanguageChip(1));

    expect(await screen.findByText(hi('reminder.failed'))).toBeTruthy();
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
  });

  it('does not show sharing-unavailable after the export lease expires', async () => {
    const availability = deferred<boolean>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockSharingAvailable.mockReturnValue(availability.promise);
    await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    expect(mockSharingAvailable).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    availability.resolve(false);
    await act(async () => Promise.resolve());
    expect(screen.queryByText(t('settings.exportUnavailable'))).toBeNull();
    expect(mockExportData).not.toHaveBeenCalled();
  });

  it('does not start export data loading after availability outlives the lease', async () => {
    const availability = deferred<boolean>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockSharingAvailable.mockReturnValue(availability.promise);
    await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    expect(mockSharingAvailable).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    availability.resolve(true);
    await act(async () => Promise.resolve());
    expect(mockExportData).not.toHaveBeenCalled();
  });

  it('suppresses a rejected export after its lease expires', async () => {
    const exported = deferred<unknown>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockExportData.mockReturnValue(exported.promise);
    await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    await waitFor(() => expect(mockExportData).toHaveBeenCalledTimes(1));

    leaseCurrent = false;
    exported.reject(new Error('late export failure'));
    await act(async () => Promise.resolve());
    expect(screen.queryByText(t('settings.exportFailed'))).toBeNull();
  });

  it('does not enable a reminder after its session lease expires', async () => {
    const enabled = deferred<string>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockEnableReminder.mockReturnValue(enabled.promise);
    await renderSettings();
    await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    expect(mockEnableReminder).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    enabled.resolve('enabled');
    await act(async () => Promise.resolve());
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ checked: false });
  });

  it('does not disable a reminder after its session lease expires', async () => {
    mockGetReminder.mockResolvedValue({ hour: 8 });
    const disabled = deferred<void>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockDisableReminder.mockReturnValue(disabled.promise);
    await renderSettings();
    await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    expect(mockDisableReminder).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    disabled.resolve();
    await act(async () => Promise.resolve());
    expect(
      screen.getByRole('switch', { name: t('reminder.toggleLabel') }).props.accessibilityState,
    ).toMatchObject({ checked: true });
  });

  it('suppresses a reminder failure after its session lease expires', async () => {
    const enabled = deferred<string>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockEnableReminder.mockReturnValue(enabled.promise);
    await renderSettings();
    await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    expect(mockEnableReminder).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    enabled.reject(new Error('late reminder failure'));
    await act(async () => Promise.resolve());
    expect(screen.queryByText(t('reminder.failed'))).toBeNull();
  });

  it('rejects a confirmation callback captured by an older identity and unlocks', async () => {
    mockRestartDiagnostic.mockResolvedValue(undefined);
    const { rerenderSettings } = await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    const alertCalls = alertSpy.mock.calls;
    const buttons = alertCalls[alertCalls.length - 1]?.[2] as
      { text?: string; onPress?: () => void }[] | undefined;
    const confirm = buttons?.find((button) => button.text === t('retake.confirm'))?.onPress;
    if (!confirm) throw new Error('Retake confirm callback was not registered');

    const setUser = mockAuthValue.setUser;
    mockAuthValue = makeAuth({
      user: { ...USER, id: '550e8400-e29b-41d4-a716-446655440001' },
      sessionVersion: 2,
      setUser,
    });
    await rerenderSettings();
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
    expect(
      screen.getByRole('button', { name: t('settings.retake') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    mockSetOptions.mockClear();
    await act(async () => confirm());

    expect(mockRestartDiagnostic).not.toHaveBeenCalled();
    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('gives a replacement identity fresh navigation and profile callbacks', async () => {
    const update = { ...OTHER_USER, name: 'Grace Murray' };
    mockUpdateProfile.mockResolvedValue(update);
    const view = await renderSettings();
    await crossSettingsOwnershipBoundary(view, 'identity');
    mockRouter.navigate.mockClear();
    mockUpdateProfile.mockClear();

    await fireEvent.press(screen.getByRole('button', { name: t('header.privacy') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings/privacy');

    // Re-arm the route after the navigation assertion so the replacement
    // identity's profile callback is tested independently in the same mount.
    const focus = mockFocusCallback;
    await act(async () => {
      focus?.();
    });
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Grace Murray');
    await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Grace Murray' });
  });

  it('routes a replacement identity after its own logout completes', async () => {
    const replacementLogout = jest.fn().mockResolvedValue(undefined);
    const view = await renderSettings();
    mockAuthValue = makeAuth({
      user: OTHER_USER,
      sessionVersion: 2,
      logout: replacementLogout,
    });
    await view.rerenderSettings();
    mockRouter.replace.mockClear();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));

    expect(replacementLogout).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('does not let a cancelled retake confirmation start later from its captured callback', async () => {
    mockRestartDiagnostic.mockResolvedValue(undefined);
    await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    const alertCalls = alertSpy.mock.calls;
    const buttons = alertCalls[alertCalls.length - 1]?.[2] as
      { text?: string; onPress?: () => void }[] | undefined;
    const cancel = buttons?.find((button) => button.text === t('common.cancel'))?.onPress;
    const confirm = buttons?.find((button) => button.text === t('retake.confirm'))?.onPress;
    if (!cancel || !confirm) throw new Error('Retake confirmation callbacks were not registered');
    mockSetOptions.mockClear();

    await act(async () => {
      cancel();
      confirm();
      await Promise.resolve();
    });

    expect(mockRestartDiagnostic).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
    expect(
      screen.getByRole('button', { name: t('settings.retake') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
  });

  it('does no retake cache work after the request lease expires', async () => {
    const restart = deferred<void>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockRestartDiagnostic.mockReturnValue(restart.promise);
    const client = makeQueryClient();
    const remove = jest.spyOn(client, 'removeQueries');
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await renderSettings(client);
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));
    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    restart.resolve();
    await act(async () => Promise.resolve());
    expect(remove).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('does not route when the lease expires between retake validation and commit', async () => {
    mockRestartDiagnostic.mockResolvedValue(undefined);
    const client = makeQueryClient();
    const remove = jest.spyOn(client, 'removeQueries');
    // Keep the lease valid through confirmation and the post-request cache
    // retirement, then expire it immediately before commitUser validates it.
    // Counting mock calls is brittle because render/handler guards may add
    // validation phases without changing this race boundary.
    mockAuthValue.isSessionLeaseCurrent = jest.fn(
      () => !remove.mock.calls.some(([filters]) => filters?.queryKey?.[0] === 'practice-history'),
    );
    await renderSettings(client);
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));

    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('suppresses a retake failure after its lease expires', async () => {
    const restart = deferred<void>();
    let leaseCurrent = true;
    mockAuthValue.isSessionLeaseCurrent = jest.fn(() => leaseCurrent);
    mockRestartDiagnostic.mockReturnValue(restart.promise);
    await renderSettings();
    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    await pressAlertButton(t('retake.confirm'));
    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);

    leaseCurrent = false;
    restart.reject(new Error('late restart failure'));
    await act(async () => Promise.resolve());
    expect(screen.queryByText(t('retake.failed'))).toBeNull();
  });
});
