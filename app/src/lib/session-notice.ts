import * as SecureStore from 'expo-secure-store';

/**
 * One-shot flag persisted when auth expires a session because the server
 * rejected its token (revoked/expired 401). The login screen consumes it to
 * explain the surprise sign-out; it is never set by a user-initiated logout.
 */

const STORAGE_KEY = 'session_expired_notice_v1';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.session-notice',
};

/** Best-effort persist; an unavailable credential store must not block expiry. */
export async function markSessionExpiredNotice(): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, '1', STORAGE_OPTIONS);
}

/**
 * Reads and clears the one-shot flag. Returns true when a notice was stored.
 * Read or delete failures report false so login never blocks on the store.
 */
export async function consumeSessionExpiredNotice(): Promise<boolean> {
  let stored: string | null;
  try {
    stored = await SecureStore.getItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  } catch {
    return false;
  }
  if (stored === null) return false;
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY, STORAGE_OPTIONS);
  } catch {
    // The flag stays behind and shows once more; still show it now.
  }
  return true;
}
