import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { translate } from './i18n';

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
}

export const DEFAULT_REMINDER_HOUR = 19;

const STORAGE_KEY = 'daily_reminder_v1';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.daily-reminder',
};
const ANDROID_CHANNEL_ID = 'daily-reminder';

type NotificationsModule = typeof import('expo-notifications');

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
  return isReminderHour(hour) ? { hour } : null;
}

/** The stored reminder preference; unreadable or invalid storage reads as off. */
export async function getDailyReminder(): Promise<DailyReminder | null> {
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

/**
 * Requests permission when needed and (re)schedules the single daily
 * notification at `hour`:00 local time. Returns 'denied' when the learner
 * refused notification permission; the toggle then stays off with an
 * explanation instead of an error.
 */
export async function enableDailyReminder(hour: number): Promise<'enabled' | 'denied'> {
  if (!isReminderHour(hour)) throw new Error('Invalid reminder hour');
  const Notifications = notifications();
  let { granted } = await Notifications.getPermissionsAsync();
  if (!granted) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return 'denied';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: translate('reminder.toggleLabel'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  // Replace any previous schedule: this app owns exactly one local notification.
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: translate('reminder.notificationTitle'),
      body: translate('reminder.notificationBody'),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
  });
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ hour }), STORAGE_OPTIONS);
  return 'enabled';
}

/** Cancels the reminder and forgets the stored preference. */
export async function disableDailyReminder(): Promise<void> {
  const Notifications = notifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
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
