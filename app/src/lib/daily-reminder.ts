import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getActiveLanguage, translateFor, type MessageKey, type UiLanguage } from './i18n';

/**
 * Local daily practice reminder (no remote push). The scheduled notification
 * lives in the OS; this module keeps the single source of truth for whether
 * the learner enabled it and at which hour, so Settings can re-render it and
 * logout can cancel it.
 *
 * expo-notifications is imported lazily: this module is reachable from auth
 * (logout cleanup), and screens that never touch reminders must not pay for —
 * or break on — the notifications native module.
 */

export interface DailyReminder {
  hour: number;
  /** Absent only for a legacy v1 preference that predates language tracking. */
  uiLanguage?: UiLanguage;
}

export const DEFAULT_REMINDER_HOUR = 19;

const STORAGE_KEY = 'daily_reminder_v1';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.daily-reminder',
};
const ANDROID_CHANNEL_ID = 'daily-reminder';

type NotificationsModule = typeof import('expo-notifications');

// Scheduling is a read/cancel/schedule/write transaction spread across the OS
// notification service and SecureStore. Settings, an auth expiry, and logout
// can all invoke it in the same JS process, so serialize those operations: an
// older enable must never finish by restoring a reminder after logout has
// already cancelled it.
let reminderQueue: Promise<void> = Promise.resolve();

function withReminderLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = reminderQueue.then(operation, operation);
  // Leave the queue usable after an OS/storage failure while preserving that
  // failure for the caller that initiated the operation.
  reminderQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function notifications(): NotificationsModule {
  // Lazy require instead of a top-level import: Metro inlines it at the call
  // site, and jest (which cannot execute dynamic import()) intercepts it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as NotificationsModule;
}

export function isReminderHour(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;
}

export function parseDailyReminder(value: unknown): DailyReminder | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const hour = (value as { hour?: unknown }).hour;
  const uiLanguage = (value as { uiLanguage?: unknown }).uiLanguage;
  if (!isReminderHour(hour)) return null;
  if (
    uiLanguage !== undefined &&
    uiLanguage !== 'en' &&
    uiLanguage !== 'te' &&
    uiLanguage !== 'hi' &&
    uiLanguage !== 'es' &&
    uiLanguage !== 'zh'
  ) {
    return null;
  }
  return { hour, ...(uiLanguage === undefined ? {} : { uiLanguage }) };
}

/** The stored reminder preference; caller must already own reminderQueue. */
async function getDailyReminderUnsafe(): Promise<DailyReminder | null> {
  let stored: string | null;
  try {
    stored = await SecureStore.getItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  } catch {
    return null;
  }
  if (!stored) return null;
  try {
    return parseDailyReminder(JSON.parse(stored) as unknown);
  } catch {
    return null;
  }
}

/** The stored reminder preference; unreadable or invalid storage reads as off. */
export function getDailyReminder(): Promise<DailyReminder | null> {
  return withReminderLock(getDailyReminderUnsafe);
}

/**
 * Requests permission when needed and (re)schedules the single daily
 * notification at `hour`:00 local time. Returns 'denied' when the learner
 * refused notification permission; the toggle then stays off with an
 * explanation instead of an error.
 *
 * `language` overrides the notification copy language: the module-level active
 * language only updates on the render after a language change, so Settings
 * passes the just-chosen language when re-scheduling.
 */
async function enableDailyReminderUnsafe(
  hour: number,
  language?: UiLanguage,
): Promise<'enabled' | 'denied'> {
  if (!isReminderHour(hour)) throw new Error('Invalid reminder hour');
  const resolvedLanguage = language ?? getActiveLanguage();
  const tr = (key: MessageKey) => translateFor(resolvedLanguage, key);
  const Notifications = notifications();
  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) {
    // Permission can be revoked long after the reminder was enabled. Nothing
    // can fire now, so a surviving preference would show the toggle on for a
    // reminder the OS will never deliver: forget it, and drop any schedule
    // orphaned by the revoked grant. Best effort — the denial is what the
    // caller acts on.
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS).catch(() => undefined);
    return 'denied';
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: tr('reminder.toggleLabel'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  // Replace any previous schedule: this app owns exactly one local notification.
  await Notifications.cancelAllScheduledNotificationsAsync();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: tr('reminder.notificationTitle'),
        body: tr('reminder.notificationBody'),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  } catch (error) {
    // The old schedule is already cancelled, so a stored "on" preference would
    // now be a lie: the learner would see the toggle on and never be reminded
    // again. Forget it before surfacing the failure so the persisted state
    // matches what the OS will actually do. Best effort — the scheduling
    // failure is the one worth reporting.
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS).catch(() => undefined);
    throw error;
  }
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify({ hour, uiLanguage: resolvedLanguage }),
      STORAGE_OPTIONS,
    );
  } catch (error) {
    // The new schedule is already live, so a missing "on" preference would
    // leave the OS nudging a learner whose toggle reads off — the mirror of
    // the failure compensated above. Cancel the just-scheduled notification,
    // then surface the original storage failure. Best effort — the storage
    // failure is the one worth reporting.
    await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
    // A failed write leaves the *previous* preference behind, which after the
    // cancel above is the same lie the sibling catch prevents: toggle on, hour
    // stale, nothing scheduled. Forget it too so storage and the OS agree.
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS).catch(() => undefined);
    throw error;
  }
  return 'enabled';
}

export function enableDailyReminder(
  hour: number,
  language?: UiLanguage,
): Promise<'enabled' | 'denied'> {
  return withReminderLock(() => enableDailyReminderUnsafe(hour, language));
}

/**
 * Rebuilds an enabled reminder's notification copy in `language` without a
 * read-then-enable gap that logout could interleave. Returns the surviving
 * preference, or null when reminders are off/permission is denied.
 */
export function refreshDailyReminderLanguage(language: UiLanguage): Promise<DailyReminder | null> {
  return withReminderLock(async () => {
    const stored = await getDailyReminderUnsafe();
    if (!stored) return null;
    if (stored.uiLanguage === language) return stored;
    const outcome = await enableDailyReminderUnsafe(stored.hour, language);
    return outcome === 'enabled' ? { hour: stored.hour, uiLanguage: language } : null;
  });
}

/** Cancels the reminder and forgets the stored preference. */
async function disableDailyReminderUnsafe(): Promise<void> {
  const Notifications = notifications();
  // Forget the preference first: a failed delete then leaves the preference
  // and the schedule consistently ON. If the OS cancel fails after the delete
  // succeeded, restore the just-read preference so the two cannot durably
  // disagree that way either — the same compensation shape as the enable path.
  const previous = await getDailyReminderUnsafe();
  await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    if (previous) {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(previous), STORAGE_OPTIONS).catch(
        () => undefined,
      );
    }
    throw error;
  }
}

export function disableDailyReminder(): Promise<void> {
  return withReminderLock(disableDailyReminderUnsafe);
}

/**
 * Logout/expiry cleanup: the reminder must not keep nudging someone who signed
 * out. Best effort — ending the session must never block on notifications.
 */
export async function cancelDailyReminderQuietly(): Promise<void> {
  try {
    await disableDailyReminder();
  } catch {
    // The OS keeps the notification until the next enable/disable succeeds.
  }
}
