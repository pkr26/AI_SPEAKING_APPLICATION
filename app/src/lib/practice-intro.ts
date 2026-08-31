import * as SecureStore from 'expo-secure-store';

/**
 * One-shot flag for the first-practice-visit explainer of the mastery rules.
 * Stored per account so a new learner on the same device still sees it once.
 * Storage failures never block practice: an unreadable flag counts as seen,
 * and a failed write only means the explainer may show once more.
 */

const STORAGE_KEY_PREFIX = 'practice_intro_seen_v1_';
const STORAGE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: 'ai-english-coach.practice-intro',
};

// Serialized tail: SecureStore gives no ordering guarantee, and a failed
// operation must leave the queue usable so a later mark still lands.
let storageQueue: Promise<void> = Promise.resolve();

/** Runs keychain operations one at a time, preserving invocation order. */
function serializeStorage<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Per-user key: the explainer is one-shot per account, not per device. */
function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

/** True when this account already dismissed the explainer; unreadable storage counts as seen. */
export async function hasSeenPracticeIntro(userId: string): Promise<boolean> {
  return serializeStorage(async () => {
    try {
      return (await SecureStore.getItemAsync(storageKey(userId), STORAGE_OPTIONS)) !== null;
    } catch {
      return true;
    }
  });
}

/** Best-effort one-shot mark; a failed write can only repeat the explainer. */
export async function markPracticeIntroSeen(userId: string): Promise<void> {
  await serializeStorage(async () => {
    try {
      await SecureStore.setItemAsync(storageKey(userId), '1', STORAGE_OPTIONS);
    } catch {
      // Best effort: the explainer may show once more on the next visit.
    }
  });
}
