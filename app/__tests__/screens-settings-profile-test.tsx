import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { Alert } from 'react-native';

import SettingsScreen, { formatReminderHour } from '../src/app/settings/index';
import {
  ApiError,
  apiExportUserData,
  apiRestartDiagnostic,
  apiUpdateProfile,
} from '../src/lib/api';
import { LogoutCleanupError, useAuth } from '../src/lib/auth';
import {
  disableDailyReminder,
  enableDailyReminder,
  getDailyReminder,
} from '../src/lib/daily-reminder';
import { deviceLanguage, translateFor, type MessageKey } from '../src/lib/i18n';
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

async function renderSettings(queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient();
  const view = await render(
    <QueryClientProvider client={client}>
      <SettingsScreen />
    </QueryClientProvider>,
  );
  // Let the stored-reminder read resolve before assertions.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
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

    const telugu = screen.getByRole('button', { name: 'Telugu, తెలుగు' });
    expect(telugu.props.accessibilityState).toMatchObject({ selected: true });
    const hindi = screen.getByRole('button', { name: 'Hindi, हिन्दी' });
    expect(hindi.props.accessibilityState).toMatchObject({ selected: false });
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
    expect(await screen.findByText(t('settings.saved'))).toBeTruthy();
  });

  it('keeps Save name disabled for a blank draft', async () => {
    await renderSettings();
    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), '   ');
    expect(
      screen.getByRole('button', { name: t('settings.saveName') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('shows the update error when the name PATCH fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('offline'));
    await renderSettings();

    await fireEvent.changeText(screen.getByLabelText(t('signup.nameLabel')), 'Ada King');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('settings.saveName') }));
    });

    expect(await screen.findByText(t('settings.updateFailed'))).toBeTruthy();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
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

  it('surfaces a language-change failure without touching the session user', async () => {
    mockUpdateProfile.mockRejectedValue(new ApiError(500, 'boom'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Hindi, हिन्दी' }));
    });

    expect(await screen.findByText(t('error.serverBusy'))).toBeTruthy();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
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

  it('shows the reminder error when the OS scheduling fails', async () => {
    mockEnableReminder.mockRejectedValue(new Error('os error'));
    await renderSettings();

    await act(async () => {
      await fireEvent.press(screen.getByRole('switch', { name: t('reminder.toggleLabel') }));
    });

    expect(await screen.findByText(t('reminder.failed'))).toBeTruthy();
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
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({
      ...USER,
      diagnosticCompleted: false,
      cefrLevel: null,
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/diagnostic');
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

  it('renders nothing without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    await renderSettings();
    expect(screen.queryByText(t('settings.profileTitle'))).toBeNull();
  });
});
