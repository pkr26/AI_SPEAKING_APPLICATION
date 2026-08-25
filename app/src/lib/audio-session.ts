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

function publishPlaybackActive(): void {
  const active = activePlaybackOwner !== null;
  if (active === publishedPlaybackActive) return;
  publishedPlaybackActive = active;
  for (const listener of playbackActiveListeners) listener();
}

export function getSubmittedRecordingPlaybackActive(): boolean {
  return publishedPlaybackActive;
}

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
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    }),
  );
}

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
