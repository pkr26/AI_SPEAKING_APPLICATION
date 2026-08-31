import { setAudioModeAsync } from 'expo-audio';

interface PlaybackOwner {
  token: symbol;
  stop: () => void | Promise<void>;
}

let audioModeQueue: Promise<void> = Promise.resolve();
let playbackOwnerQueue: Promise<void> = Promise.resolve();
let activePlaybackOwner: PlaybackOwner | null = null;
let publishedPlaybackActive = false;
const playbackActiveListeners = new Set<() => void>();

/** Notifies playback-active listeners only on a real edge; repeated states never re-fire. */
function publishPlaybackActive(): void {
  const active = activePlaybackOwner !== null;
  if (active === publishedPlaybackActive) return;
  publishedPlaybackActive = active;
  for (const listener of playbackActiveListeners) listener();
}

/**
 * Returns whether submitted-recording playback currently owns the process.
 * Recorder polls this synchronously before microphone acquisition, and ad
 * surfaces pair it with the subscribe twin to react to changes immediately.
 */
export function getSubmittedRecordingPlaybackActive(): boolean {
  return publishedPlaybackActive;
}

/**
 * Subscribes to playback-active edges; together with the getter it forms the
 * store half of a useSyncExternalStore subscription.
 */
export function subscribeSubmittedRecordingPlaybackActive(listener: () => void): () => void {
  playbackActiveListeners.add(listener);
  return () => playbackActiveListeners.delete(listener);
}

/** Serializes every process-wide audio-mode mutation, including Recorder. */
export function serializeAudioMode(operation: () => Promise<void>): Promise<void> {
  const result = audioModeQueue.then(operation, operation);
  audioModeQueue = result.catch(() => undefined);
  return result;
}

/** Playback mode shared by submitted-recording players and Recorder cleanup. */
export function configurePlaybackAudioMode(): Promise<void> {
  return serializeAudioMode(() =>
    setAudioModeAsync({
      allowsRecording: false,
      allowsBackgroundRecording: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }),
  );
}

/** Recording mode for Recorder takes; queued behind every other audio-mode change. */
export function configureRecordingAudioMode(): Promise<void> {
  return serializeAudioMode(() =>
    setAudioModeAsync({
      allowsRecording: true,
      allowsBackgroundRecording: false,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }),
  );
}

/**
 * Tail-chains `operation` onto the playback-owner queue and absorbs its
 * failure from the chain (the caller's promise still rejects), so one
 * throwing stop() can never poison later ownership transitions.
 */
function serializePlaybackOwnership(operation: () => Promise<void>): Promise<void> {
  const result = playbackOwnerQueue.then(operation, operation);
  playbackOwnerQueue = result.catch(() => undefined);
  return result;
}

/** Claims the one app-wide submitted-recording playback slot. */
export async function claimPlaybackOwner(
  token: symbol,
  stop: () => void | Promise<void>,
): Promise<() => void> {
  await serializePlaybackOwnership(async () => {
    const previous = activePlaybackOwner;
    if (previous && previous.token !== token) {
      activePlaybackOwner = null;
      try {
        await previous.stop();
      } catch (error) {
        publishPlaybackActive();
        throw error;
      }
    }
    activePlaybackOwner = { token, stop };
    publishPlaybackActive();
  });
  return () => {
    if (activePlaybackOwner?.token === token) {
      activePlaybackOwner = null;
      publishPlaybackActive();
    }
  };
}

/** Stops submitted-recording playback before microphone ownership is acquired. */
export function stopActivePlayback(): Promise<void> {
  return serializePlaybackOwnership(async () => {
    const current = activePlaybackOwner;
    activePlaybackOwner = null;
    publishPlaybackActive();
    await current?.stop();
  });
}
