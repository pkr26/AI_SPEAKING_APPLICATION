/**
 * One-way process latch for a server-enforced minimum client version.
 *
 * The latch deliberately lives outside React. API requests can trip it from
 * any screen, while the root modal observes it without replacing the active
 * route (and therefore without unmounting a recorder or recovery session).
 */
export interface ClientUpgradeSnapshot {
  required: boolean;
}

const NOT_REQUIRED: ClientUpgradeSnapshot = Object.freeze({ required: false });
const REQUIRED: ClientUpgradeSnapshot = Object.freeze({ required: true });

let snapshot = NOT_REQUIRED;
const listeners = new Set<() => void>();

export function getClientUpgradeSnapshot(): ClientUpgradeSnapshot {
  return snapshot;
}

export function subscribeToClientUpgrade(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Once required, only installing/restarting a newer build can clear it. */
export function latchClientUpgradeRequired(): void {
  if (snapshot.required) return;
  snapshot = REQUIRED;
  for (const listener of listeners) listener();
}

/** Test isolation only; production code must never clear the one-way latch. */
export function resetClientUpgradeModuleForTests(): void {
  snapshot = NOT_REQUIRED;
  listeners.clear();
}
