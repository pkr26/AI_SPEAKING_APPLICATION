import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  cancelDailyReminderQuietly,
  DEFAULT_REMINDER_HOUR,
  disableDailyReminder,
  enableDailyReminder,
  getDailyReminder,
  isReminderHour,
  parseDailyReminder,
  type DailyReminder,
} from '../src/lib/daily-reminder';
import { dictionaries } from '../src/lib/i18n';

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

const mockGetPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockRequestPermissionsAsync = jest.fn(async () => ({ granted: true }));
const mockScheduleNotificationAsync = jest.fn(async (_request: unknown) => 'notification-id');
const mockCancelAllScheduledNotificationsAsync = jest.fn(async () => undefined);
const mockSetNotificationChannelAsync = jest.fn(async (_id: string, _channel: unknown) => null);

// daily-reminder imports expo-notifications lazily; babel lowers that dynamic
// import to require(), which this mock intercepts.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  scheduleNotificationAsync: (request: unknown) => mockScheduleNotificationAsync(request),
  cancelAllScheduledNotificationsAsync: () => mockCancelAllScheduledNotificationsAsync(),
  setNotificationChannelAsync: (id: string, channel: unknown) =>
    mockSetNotificationChannelAsync(id, channel),
}));

const getItemAsync = SecureStore.getItemAsync as jest.Mock;
const setItemAsync = SecureStore.setItemAsync as jest.Mock;
const deleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

const STORAGE_OPTIONS = expect.objectContaining({
  keychainService: 'ai-english-coach.daily-reminder',
});

/**
 * Model SecureStore as a durable keychain already holding `initial`, so a test
 * can assert what a later getDailyReminder() really reads back rather than
 * only which cleanup calls were made.
 */
function withPersistedReminder(initial: DailyReminder): void {
  let persisted: string | null = JSON.stringify(initial);
  getItemAsync.mockImplementation(async () => persisted);
  setItemAsync.mockImplementation(async (_key: string, value: string) => {
    persisted = value;
  });
  deleteItemAsync.mockImplementation(async () => {
    persisted = null;
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

beforeEach(() => {
  jest.clearAllMocks();
  getItemAsync.mockImplementation(async () => null);
  setItemAsync.mockImplementation(async () => undefined);
  deleteItemAsync.mockImplementation(async () => undefined);
  mockGetPermissionsAsync.mockImplementation(async () => ({ granted: true }));
  mockRequestPermissionsAsync.mockImplementation(async () => ({ granted: true }));
  mockScheduleNotificationAsync.mockImplementation(async (_request: unknown) => 'notification-id');
  mockCancelAllScheduledNotificationsAsync.mockImplementation(async () => undefined);
});

describe('reminder hour validation', () => {
  it.each([0, 7, DEFAULT_REMINDER_HOUR, 23])('accepts hour %d', (hour) => {
    expect(isReminderHour(hour)).toBe(true);
  });

  it.each([-1, 24, 1.5, NaN, '19', null, undefined])('rejects %p', (hour) => {
    expect(isReminderHour(hour)).toBe(false);
  });

  it('parses only well-formed stored preferences', () => {
    expect(parseDailyReminder({ hour: 8 })).toEqual({ hour: 8 });
    expect(parseDailyReminder({ hour: 24 })).toBeNull();
    expect(parseDailyReminder({})).toBeNull();
    expect(parseDailyReminder(['hour'])).toBeNull();
    expect(parseDailyReminder('8')).toBeNull();
    expect(parseDailyReminder(null)).toBeNull();
    // Only an object-shaped payload is a stored preference: an hour carried on
    // anything else (a callable, say) is not one, however well-formed it looks.
    expect(parseDailyReminder(Object.assign(() => undefined, { hour: 8 }))).toBeNull();
  });
});

describe('getDailyReminder', () => {
  it('reports off when nothing is stored', async () => {
    await expect(getDailyReminder()).resolves.toBeNull();
    expect(getItemAsync).toHaveBeenCalledWith('daily_reminder_v1', STORAGE_OPTIONS);
  });

  it('returns the stored hour', async () => {
    getItemAsync.mockImplementation(async () => JSON.stringify({ hour: 8 }));
    await expect(getDailyReminder()).resolves.toEqual({ hour: 8 });
  });

  it.each([
    ['unreadable storage', () => Promise.reject(new Error('locked'))],
    ['corrupt JSON', () => Promise.resolve('{not json')],
    ['an invalid stored hour', () => Promise.resolve(JSON.stringify({ hour: 99 }))],
  ])('reads %s as off', async (_label, implementation) => {
    getItemAsync.mockImplementation(implementation);
    await expect(getDailyReminder()).resolves.toBeNull();
  });
});

describe('enableDailyReminder', () => {
  it('schedules one localized daily notification and stores the hour', async () => {
    await expect(enableDailyReminder(19)).resolves.toBe('enabled');

    // Exactly one owned notification: any previous schedule is replaced.
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: dictionaries.en['reminder.notificationTitle'],
        body: dictionaries.en['reminder.notificationBody'],
      },
      trigger: { type: 'daily', hour: 19, minute: 0 },
    });
    expect(setItemAsync).toHaveBeenCalledWith(
      'daily_reminder_v1',
      JSON.stringify({ hour: 19 }),
      STORAGE_OPTIONS,
    );
    // Notification channels are Android-only (on iOS the call just logs and
    // resolves to null), so iOS neither creates one nor names one in the
    // trigger asserted above.
    expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('creates the Android channel and pins the Android schedule to it', async () => {
    await withPlatformOS('android', async () => {
      await expect(enableDailyReminder(19)).resolves.toBe('enabled');
    });

    // The channel must exist before a notification names it, and it is named
    // in the learner's language so the system settings entry is readable.
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('daily-reminder', {
      name: dictionaries.en['reminder.toggleLabel'],
      importance: 3, // AndroidImportance.DEFAULT
    });
    expect(mockSetNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockScheduleNotificationAsync.mock.invocationCallOrder[0],
    );
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: dictionaries.en['reminder.notificationTitle'],
        body: dictionaries.en['reminder.notificationBody'],
      },
      trigger: { type: 'daily', hour: 19, minute: 0, channelId: 'daily-reminder' },
    });
  });

  it('names the Android channel in an explicitly passed language', async () => {
    await withPlatformOS('android', async () => {
      await expect(enableDailyReminder(7, 'hi')).resolves.toBe('enabled');
    });

    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      'daily-reminder',
      expect.objectContaining({ name: dictionaries.hi['reminder.toggleLabel'] }),
    );
  });

  it('schedules the notification copy in an explicitly passed language', async () => {
    // Settings re-schedules right after a language change, before the provider
    // syncs the module-level active language — the copy must follow the
    // explicit language, not the stale active one.
    await expect(enableDailyReminder(19, 'hi')).resolves.toBe('enabled');

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: dictionaries.hi['reminder.notificationTitle'],
        body: dictionaries.hi['reminder.notificationBody'],
      },
      trigger: { type: 'daily', hour: 19, minute: 0 },
    });
  });

  it('skips the permission prompt when permission is already granted', async () => {
    await enableDailyReminder(7);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission once when it is not granted yet', async () => {
    mockGetPermissionsAsync.mockImplementation(async () => ({ granted: false }));
    await expect(enableDailyReminder(7)).resolves.toBe('enabled');
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('reports denial without scheduling or storing anything', async () => {
    mockGetPermissionsAsync.mockImplementation(async () => ({ granted: false }));
    mockRequestPermissionsAsync.mockImplementation(async () => ({ granted: false }));

    await expect(enableDailyReminder(7)).resolves.toBe('denied');
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it('forgets the stored preference and any schedule when permission is denied', async () => {
    // Permission is often revoked in OS settings long after the reminder was
    // enabled. Leaving the preference behind would show the toggle on at the
    // stored hour on every future launch for a reminder that can never fire.
    withPersistedReminder({ hour: 19 });
    mockGetPermissionsAsync.mockImplementation(async () => ({ granted: false }));
    mockRequestPermissionsAsync.mockImplementation(async () => ({ granted: false }));

    await expect(enableDailyReminder(20)).resolves.toBe('denied');

    await expect(getDailyReminder()).resolves.toBeNull();
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('still reports denial when forgetting the preference or the schedule fails', async () => {
    mockGetPermissionsAsync.mockImplementation(async () => ({ granted: false }));
    mockRequestPermissionsAsync.mockImplementation(async () => ({ granted: false }));
    mockCancelAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('os error'));
    deleteItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));

    // The denial is what the caller acts on; the cleanup is best effort.
    await expect(enableDailyReminder(7)).resolves.toBe('denied');
  });

  it('rejects an invalid hour before touching the OS', async () => {
    await expect(enableDailyReminder(24)).rejects.toThrow('Invalid reminder hour');
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
  });

  it('propagates scheduling failures without storing a phantom preference', async () => {
    mockScheduleNotificationAsync.mockImplementation(async () => {
      throw new Error('os error');
    });
    await expect(enableDailyReminder(7)).rejects.toThrow('os error');
    expect(setItemAsync).not.toHaveBeenCalled();
  });
});

describe('enableDailyReminder failure leaves no lying preference', () => {
  it('forgets the stored preference when scheduling throws', async () => {
    // The previous schedule is cancelled before the new one is created, so a
    // surviving "on" preference would show the toggle on while the OS has
    // nothing scheduled and the learner is never reminded again.
    const failure = new Error('scheduling unavailable');
    mockScheduleNotificationAsync.mockRejectedValueOnce(failure);

    await expect(enableDailyReminder(9)).rejects.toBe(failure);

    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(deleteItemAsync).toHaveBeenCalledWith('daily_reminder_v1', STORAGE_OPTIONS);
    expect(setItemAsync).not.toHaveBeenCalled();
  });

  it('still reports the scheduling failure when forgetting the preference also fails', async () => {
    const failure = new Error('scheduling unavailable');
    mockScheduleNotificationAsync.mockRejectedValueOnce(failure);
    deleteItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));

    await expect(enableDailyReminder(9)).rejects.toBe(failure);
  });

  it('cancels the just-scheduled notification when storing the preference fails', async () => {
    // Otherwise the OS schedule stays live while the toggle reads off.
    const failure = new Error('keychain unavailable');
    setItemAsync.mockRejectedValueOnce(failure);

    await expect(enableDailyReminder(9)).rejects.toBe(failure);

    // One cancel replaces the old schedule before scheduling; the second is
    // the compensation for the live schedule the learner never asked for.
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(2);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('forgets the previous preference when storing the new one fails', async () => {
    // A failed write leaves the earlier hour in storage, and both schedules —
    // the old one and the compensated new one — are gone: without forgetting
    // the preference too, the toggle reads on at 08:00 on every future launch
    // with nothing scheduled at all.
    withPersistedReminder({ hour: 8 });
    const failure = new Error('keychain unavailable');
    setItemAsync.mockRejectedValueOnce(failure);

    await expect(enableDailyReminder(20)).rejects.toBe(failure);

    await expect(getDailyReminder()).resolves.toBeNull();
  });

  it('still reports the storage failure when the compensating cleanup also fails', async () => {
    const failure = new Error('keychain unavailable');
    setItemAsync.mockRejectedValueOnce(failure);
    mockCancelAllScheduledNotificationsAsync
      .mockImplementationOnce(async () => undefined)
      .mockRejectedValueOnce(new Error('os error'));
    deleteItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));

    await expect(enableDailyReminder(9)).rejects.toBe(failure);
  });
});

describe('disableDailyReminder', () => {
  it('forgets the preference and cancels the schedule, preference first', async () => {
    await disableDailyReminder();
    expect(deleteItemAsync).toHaveBeenCalledWith('daily_reminder_v1', STORAGE_OPTIONS);
    expect(mockCancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    // Delete-first: a failed delete then leaves preference and schedule
    // consistently on instead of a live toggle with nothing scheduled.
    expect(deleteItemAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mockCancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0],
    );
  });

  it('leaves the schedule alone when forgetting the preference fails', async () => {
    getItemAsync.mockImplementation(async () => JSON.stringify({ hour: 8 }));
    const failure = new Error('keychain unavailable');
    deleteItemAsync.mockRejectedValueOnce(failure);

    await expect(disableDailyReminder()).rejects.toBe(failure);

    // Preference and schedule both stay on — they never disagree.
    expect(mockCancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it('restores the preference when the OS cancel fails after the delete', async () => {
    getItemAsync.mockImplementation(async () => JSON.stringify({ hour: 8 }));
    const failure = new Error('os error');
    mockCancelAllScheduledNotificationsAsync.mockRejectedValueOnce(failure);

    await expect(disableDailyReminder()).rejects.toBe(failure);

    expect(deleteItemAsync).toHaveBeenCalledWith('daily_reminder_v1', STORAGE_OPTIONS);
    // Compensation: the preference goes back so it agrees with the schedule
    // that is still live.
    expect(setItemAsync).toHaveBeenCalledWith(
      'daily_reminder_v1',
      JSON.stringify({ hour: 8 }),
      STORAGE_OPTIONS,
    );
  });

  it('still reports the cancel failure when restoring the preference also fails', async () => {
    getItemAsync.mockImplementation(async () => JSON.stringify({ hour: 8 }));
    const failure = new Error('os error');
    mockCancelAllScheduledNotificationsAsync.mockRejectedValueOnce(failure);
    setItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));

    await expect(disableDailyReminder()).rejects.toBe(failure);
  });

  it('propagates cancellation failures to the settings UI', async () => {
    mockCancelAllScheduledNotificationsAsync.mockImplementation(async () => {
      throw new Error('os error');
    });
    await expect(disableDailyReminder()).rejects.toThrow('os error');
  });
});

describe('cancelDailyReminderQuietly', () => {
  it('cancels like disable but never throws (logout must not block)', async () => {
    mockCancelAllScheduledNotificationsAsync.mockImplementation(async () => {
      throw new Error('os error');
    });
    await expect(cancelDailyReminderQuietly()).resolves.toBeUndefined();

    mockCancelAllScheduledNotificationsAsync.mockImplementation(async () => undefined);
    await expect(cancelDailyReminderQuietly()).resolves.toBeUndefined();
    expect(deleteItemAsync).toHaveBeenCalledWith('daily_reminder_v1', STORAGE_OPTIONS);
  });
});
