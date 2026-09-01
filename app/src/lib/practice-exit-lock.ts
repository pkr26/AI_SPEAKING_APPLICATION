import { useSyncExternalStore } from 'react';

/**
 * Module-level exit-lock signal shared between the practice flow and the
 * bottom tab bar. The tab bar and the Home header Settings action live
 * OUTSIDE the practice stack, so the `setOptions` navigation lock the
 * practice screens publish cannot reach them — yet switching tabs or pushing
 * Settings blurs the practice stack exactly like a back swipe, and Recorder's
 * blur cleanup would discard a held take. The screens that own a recorder exit
 * lock (practice home and attempt) plus the statically locked feedback screen
 * publish here; the tab bar consumes it to disable every other tab and the
 * Settings action.
 *
 * Writes are last-writer-wins and focus-scoped: every publisher clears on
 * blur and unmount, so the lock can never outlive the screen that set it
 * (after logout or a crash of the practice flow the tab bar must not stay
 * disabled). Blur-safe clearing is what makes a module store viable here —
 * only the focused practice screen ever holds a take.
 */
let locked = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Publish the lock. Identical writes are no-ops, so mirrors may call freely. */
export function setPracticeExitLocked(next: boolean): void {
  if (next === locked) return;
  locked = next;
  emit();
}

/** Synchronous read for non-hook consumers and tests. */
export function getPracticeExitLocked(): boolean {
  return locked;
}

export function subscribeToPracticeExitLock(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Static server snapshot: navigation state is client-only. */
export function getPracticeExitLockServerSnapshot(): boolean {
  return false;
}

/** Reactive read for the tab bar and the Home header Settings action. */
export function usePracticeExitLocked(): boolean {
  return useSyncExternalStore(
    subscribeToPracticeExitLock,
    getPracticeExitLocked,
    getPracticeExitLockServerSnapshot,
  );
}

/** Test/reset helper: force-clear and notify (used between renders in tests). */
export function resetPracticeExitLockForTests(): void {
  locked = false;
  emit();
}
