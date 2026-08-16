import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import SettingsScreen, { formatReminderHour } from '../src/app/settings/index';
import {
  ApiError,
  apiExportUserData,
  apiRestartDiagnostic,
  apiUpdateProfile,
} from '../src/lib/api';
import { LogoutCleanupError, MAX_NAME_LENGTH, useAuth } from '../src/lib/auth';
import {
  disableDailyReminder,
  enableDailyReminder,
  getDailyReminder,
} from '../src/lib/daily-reminder';
import { deviceLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
import { colors, layout, radii, spacing } from '../src/lib/theme';
import type { User } from '../src/lib/types';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

// The screen renders reminder times via formatReminderHour in the active UI
// language (the device language under jest, no provider wraps these renders).
const reminderTimeText = (hour: number) =>
  t('reminder.timeLabel', { time: formatReminderHour(hour, deviceLanguage()) });

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn() },
  useFocusEffect: jest.fn(),
}));

const mockWrite = jest.fn();
const mockDelete = jest.fn();
let lastFileUri: string | null = null;

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
  disableDailyReminder: jest.fn(async () => undefined),
  cancelDailyReminderQuietly: jest.fn(async () => undefined),
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiExportUserData: jest.fn(),
  apiRestartDiagnostic: jest.fn(),
  apiUpdateProfile: jest.fn(),
}));

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
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
const mockExportData = apiExportUserData as jest.Mock;
const mockRestartDiagnostic = apiRestartDiagnostic as jest.Mock;
const mockGetReminder = getDailyReminder as jest.Mock;
const mockEnableReminder = enableDailyReminder as jest.Mock;
const mockDisableReminder = disableDailyReminder as jest.Mock;
const mockSharingAvailable = Sharing.isAvailableAsync as jest.Mock;
const mockShareAsync = Sharing.shareAsync as jest.Mock;
const mockFile = File as unknown as jest.Mock;
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
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

beforeEach(() => {
  jest.clearAllMocks();
  lastFileUri = null;
  mockAuthValue = makeAuth();
  mockGetReminder.mockResolvedValue(null);
  mockEnableReminder.mockResolvedValue('enabled');
  mockDisableReminder.mockResolvedValue(undefined);
  mockSharingAvailable.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
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

  it('starts the name draft blank when the screen renders before the session user', async () => {
    mockAuthValue = makeAuth({ user: null });
    const { rerenderSettings } = await renderSettings();
    expect(screen.queryByLabelText(t('signup.nameLabel'))).toBeNull();

    mockAuthValue = makeAuth();
    await act(async () => rerenderSettings());

    // The draft seeds from the user present at mount; with none there is
    // nothing to prefill and nothing to save.
    expect(screen.getByLabelText(t('signup.nameLabel')).props.value).toBe('');
    expect(
      screen.getByRole('button', { name: t('settings.saveName') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
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
    expect(screen.queryByText(t('settings.saveName'))).toBeNull();

    await act(async () => {
      resolveUpdate({ ...USER, name: 'Ada King' });
    });

    expect(
      screen.getByRole('button', { name: t('settings.saveName') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    expect(screen.queryByText(t('settings.saveNameBusy'))).toBeNull();
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

  it('switches the native language through the server before re-rendering the UI', async () => {
    const updated = { ...USER, nativeLanguage: 'hi' as const };
    mockUpdateProfile.mockResolvedValue(updated);
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderSettings(queryClient);

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Hindi, हिन्दी' }));
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({ nativeLanguage: 'hi' });
    // The account language drives i18n: the provider re-renders everything.
    expect(mockAuthValue.setUser).toHaveBeenCalledWith(updated);
    // Help content is served in the account language and must refetch.
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['question-help'] });
    // No reminder is enabled: nothing to re-schedule.
    expect(mockEnableReminder).not.toHaveBeenCalled();
  });

  it('re-schedules an enabled daily reminder in the new language', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    const updated = { ...USER, nativeLanguage: 'hi' as const };
    mockUpdateProfile.mockResolvedValue(updated);
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Hindi, हिन्दी' }));
    });

    expect(mockAuthValue.setUser).toHaveBeenCalledWith(updated);
    // The reminder copy must follow the new language immediately; the explicit
    // language argument covers the render lag of the module-level active one.
    expect(mockEnableReminder).toHaveBeenCalledWith(19, 'hi');
  });

  it('changes the language before the stored reminder has been read', async () => {
    mockGetReminder.mockReturnValue(new Promise(() => undefined));
    const updated = { ...USER, nativeLanguage: 'hi' as const };
    mockUpdateProfile.mockResolvedValue(updated);
    await renderSettings();

    // Nothing is known about the reminder yet, so the card has no controls.
    expect(screen.queryByRole('switch', { name: t('reminder.toggleLabel') })).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Hindi, हिन्दी' }));
    });

    expect(mockAuthValue.setUser).toHaveBeenCalledWith(updated);
    expect(mockEnableReminder).not.toHaveBeenCalled();
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
  });

  it('does not surface a language error when the reminder re-schedule fails', async () => {
    mockGetReminder.mockResolvedValue({ hour: 19 });
    mockUpdateProfile.mockResolvedValue({ ...USER, nativeLanguage: 'hi' as const });
    mockEnableReminder.mockRejectedValue(new Error('os error'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Hindi, हिन्दी' }));
    });

    expect(mockAuthValue.setUser).toHaveBeenCalled();
    expect(screen.queryByText(t('settings.updateFailed'))).toBeNull();
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

    expect(flattenedStyle(screen.getByText('తెలుగు'))).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(screen.getByText('Telugu'))).toEqual({
      marginTop: 2,
      fontSize: 13,
      color: colors.primary,
    });
    expect(flattenedStyle(screen.getByText('हिन्दी'))).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText('Hindi'))).toEqual({
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
  it('walks the export, writes a JSON file, and hands it to the share sheet', async () => {
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
    expect(mockWrite).toHaveBeenCalledWith(JSON.stringify(exportData, null, 2));
    expect(mockShareAsync).toHaveBeenCalledWith(lastFileUri, {
      mimeType: 'application/json',
      dialogTitle: t('settings.export'),
    });
    // The export embeds PII: the cache file is deleted once the share sheet closes.
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('deletes the export file even when the share sheet fails', async () => {
    mockExportData.mockResolvedValue({ user: USER, attempts: [] });
    mockShareAsync.mockRejectedValue(new Error('share cancelled'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.export') }));
    });

    expect(await screen.findByText(t('settings.exportFailed'))).toBeTruthy();
    expect(mockDelete).toHaveBeenCalledTimes(1);
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

    expect(mockEnableReminder).toHaveBeenCalledWith(19);
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
      fireEvent.press(toggle);
      fireEvent.press(toggle);
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
    expect(mockEnableReminder).toHaveBeenLastCalledWith(9);
    expect(screen.getByText(reminderTimeText(9))).toBeTruthy();
  });

  it('restores a stored reminder and reschedules on hour changes with wrap-around', async () => {
    mockGetReminder.mockResolvedValue({ hour: 0 });
    await renderSettings();

    expect(screen.getByText(reminderTimeText(0))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reminder.earlier') }));
    });
    expect(mockEnableReminder).toHaveBeenCalledWith(23);
    expect(screen.getByText(reminderTimeText(23))).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('reminder.later') }));
    });
    expect(mockEnableReminder).toHaveBeenLastCalledWith(0);
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
    expect(flattenedStyle(toggle()).opacity).toBe(0.5);
    expect(flattenedStyle(hourButton(t('reminder.earlier'))).opacity).toBe(0.5);
    expect(flattenedStyle(hourButton(t('reminder.later'))).opacity).toBe(0.5);

    await act(async () => {
      resolveEnable('enabled');
    });

    expect(toggle().props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
      busy: false,
    });
    expect(flattenedStyle(toggle()).opacity).toBeUndefined();
    expect(flattenedStyle(hourButton(t('reminder.earlier'))).opacity).toBeUndefined();
    expect(flattenedStyle(hourButton(t('reminder.later'))).opacity).toBeUndefined();
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
  it('confirms, restarts the diagnostic, drops practice caches, and routes to the test', async () => {
    mockRestartDiagnostic.mockResolvedValue(undefined);
    const queryClient = makeQueryClient();
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderSettings(queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    expect(alertSpy).toHaveBeenCalledWith(t('retake.confirmTitle'), t('retake.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('retake.confirm'), style: 'destructive', onPress: expect.any(Function) },
    ]);

    await pressAlertButton(t('retake.confirm'));

    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['practice-question'] });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
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
      fireEvent.press(row);
      fireEvent.press(row);
    });

    expect(mockExportData).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveExport({ user: {}, attempts: [], nextCursor: null });
    });
  });

  it('frees the retake latch so a later retake still runs', async () => {
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

    await fireEvent.press(screen.getByRole('button', { name: t('settings.retake') }));
    const calls = alertSpy.mock.calls;
    const buttons = calls[calls.length - 1][2] as { text?: string; onPress?: () => void }[];
    const confirm = buttons.find((candidate) => candidate.text === t('retake.confirm'))?.onPress;
    if (!confirm) throw new Error('retake confirmation button not found');

    await act(async () => {
      confirm();
      confirm();
    });

    expect(mockRestartDiagnostic).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveRestart();
    });
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
  });
});

describe('account actions', () => {
  it('navigates to the change-password, legal, and delete-account screens', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('header.changePassword') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/change-password');

    await fireEvent.press(screen.getByRole('button', { name: t('header.privacy') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/privacy');

    await fireEvent.press(screen.getByRole('button', { name: t('header.terms') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/terms');

    await fireEvent.press(screen.getByRole('button', { name: t('header.deleteAccount') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/delete-account');
  });

  it('logs out and returns to the gate', async () => {
    await renderSettings();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.logout).toHaveBeenCalledTimes(1);
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
