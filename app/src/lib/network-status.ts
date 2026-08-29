import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useEffect, useSyncExternalStore } from 'react';

export type NetworkReachability = 'unknown' | 'offline' | 'online';

export interface NetworkStatusSnapshot {
  reachability: NetworkReachability;
  /** Increments only for a known offline -> online transition. */
  reconnectCount: number;
}

const INITIAL_SNAPSHOT: NetworkStatusSnapshot = Object.freeze({
  reachability: 'unknown',
  reconnectCount: 0,
});

let snapshot = INITIAL_SNAPSHOT;
const listeners = new Set<() => void>();

function reachabilityForState(state: Network.NetworkState): NetworkReachability {
  // Internet reachability is the stronger signal when the platform supplies
  // it. Fall back to connection state while the reachability field is absent.
  if (state.isInternetReachable === true) return 'online';
  if (state.isInternetReachable === false) return 'offline';
  if (state.isConnected === true) return 'online';
  if (state.isConnected === false || state.type === Network.NetworkStateType.NONE) return 'offline';
  return 'unknown';
}

function publishNetworkState(state: Network.NetworkState): boolean {
  const reachability = reachabilityForState(state);
  if (reachability === 'unknown') return false;

  // React Query retains its safe default while the native state is unknown,
  // then pauses/resumes queries and mutations from explicit native evidence.
  onlineManager.setOnline(reachability === 'online');
  if (snapshot.reachability === reachability) return true;

  snapshot = Object.freeze({
    reachability,
    reconnectCount:
      snapshot.reachability === 'offline' && reachability === 'online'
        ? snapshot.reconnectCount + 1
        : snapshot.reconnectCount,
  });
  for (const listener of listeners) listener();
  return true;
}

export function getNetworkStatusSnapshot(): NetworkStatusSnapshot {
  return snapshot;
}

export function subscribeToNetworkStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Starts one native listener and obtains an initial sample.
 *
 * Subscription intentionally happens before sampling. A listener event bumps
 * `eventRevision`, so a slower initial sample can never overwrite a newer
 * connectivity event that arrived while the promise was in flight.
 */
export function startNetworkStatusMonitoring(): () => void {
  let active = true;
  let eventRevision = 0;
  let subscription: { remove: () => void } | undefined;

  try {
    subscription = Network.addNetworkStateListener((state) => {
      if (publishNetworkState(state)) eventRevision += 1;
    });
  } catch {
    // Sampling below can still provide a useful state when native listener
    // registration is temporarily unavailable.
  }

  const revisionBeforeSample = eventRevision;
  try {
    void Network.getNetworkStateAsync()
      .then((state) => {
        if (active && eventRevision === revisionBeforeSample) publishNetworkState(state);
      })
      .catch(() => undefined);
  } catch {
    // Treat a synchronous native-module failure like a rejected sample.
  }

  return () => {
    active = false;
    try {
      subscription?.remove();
    } catch {
      // Native subscription cleanup is best effort during app teardown.
    }
  };
}

export function NetworkStatusBridge(): null {
  useEffect(() => startNetworkStatusMonitoring(), []);
  return null;
}

export function useNetworkStatus(): NetworkStatusSnapshot {
  return useSyncExternalStore(
    subscribeToNetworkStatus,
    getNetworkStatusSnapshot,
    getNetworkStatusSnapshot,
  );
}

/** Test isolation only; production monitoring never resets known state. */
export function resetNetworkStatusModuleForTests(): void {
  snapshot = INITIAL_SNAPSHOT;
  listeners.clear();
  onlineManager.setOnline(true);
}
