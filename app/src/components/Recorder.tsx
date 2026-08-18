import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  AppState,
  Linking,
  Platform,
  Pressable,
  Text,
  useAnimatedValue,
  View,
} from 'react-native';
import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioRecorder,
  type AudioPlayer,
  type RecorderState,
  type RecordingStatus,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';

import {
  ApiError,
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  AUDIO_TIMEOUT_MS,
  resolveAudioFileDescriptor,
  userMessageForError,
} from '../lib/api';
import { translate, useT, type MessageKey } from '../lib/i18n';
import {
  clearPendingAssessment,
  claimPendingAssessmentRecoveryPost,
  loadPendingAssessment,
  markPendingAssessmentCancelled,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  refundPendingAssessmentRecoveryPost,
  savePendingAssessment,
  type AssessmentEndpoint,
  type PendingAssessment,
} from '../lib/pending-assessment';
import { createThemedStyles, useTheme } from '../lib/theme';
import { ContractError } from '../lib/types';
import Button from './Button';

type Phase = 'idle' | 'recording' | 'recorded' | 'uploading' | 'recovering';

interface RecorderProps<T> {
  ownerId: string;
  questionId: string;
  /** Assessment endpoint that accepts audio + questionId + retry-stable requestId. */
  endpoint: AssessmentEndpoint;
  parseResult: (data: unknown) => T;
  onResult: (data: T) => void;
  onError: (message: string) => void;
  /**
   * Rate/daily-limit rejections (HTTP 429) carry a localized "when can I try
   * again" message. Screens that render it inline near the record button pass
   * this; without it those rejections fall back to onError like any other.
   */
  onRateLimited?: (message: string) => void;
  /** Refreshes canonical server state when feedback cannot be reconstructed. */
  onRecoveryUnresolved: () => void;
  /** Locks controls that would discard or retarget the current recording. */
  onInteractionLockChange?: (locked: boolean) => void;
  /** Lets a screen restore the endpoint saved with an interrupted submission. */
  onRecoveryEndpointMismatch?: (endpoint: AssessmentEndpoint) => boolean;
}

let activeRecoveryOwner: symbol | null = null;
let activeAudioSessionOwner: symbol | null = null;
let activeAudioSessionReleasePromise: Promise<void> | null = null;
let resolveActiveAudioSessionRelease: (() => void) | null = null;
const liveRecorderUris = new Set<string>();
let audioModeQueue: Promise<void> = Promise.resolve();

const MAX_RECORDING_SECONDS = 120;
const AUTO_STOP_TAP_GRACE_MS = 1_000;
const RECOVERY_LEASE_MS = 5 * 60_000;
const RECOVERY_RECORD_TTL_MS = 25 * 60 * 60_000;
const RECOVERY_REQUEST_TIMEOUT_MS = 5_000;
const MAX_CAPACITY_RETRIES = 3;
const CAPACITY_RETRY_MAX_DELAY_MS = 30_000;
const RECOVERY_POLL_MS = 2_000;
const NOT_FOUND_CONFIRMATIONS = 3;
const S3_RESUBMIT_BASE_BACKOFF_MS = 5_000;
/** Automatic re-uploads of the surviving local recording per recovery cycle. */
const MAX_S3_REUPLOADS = 1;
const UPLOAD_STAGE_LISTENING_MS = 8_000;
const UPLOAD_STAGE_ALMOST_DONE_MS = 25_000;
/** Bounded wait for the resume that follows a microphone permission dialog. */
const PERMISSION_PROMPT_RESUME_MS = 2_000;
/** Briefly await the native completion event that carries stop failures. */
const RECORDING_EVENT_WAIT_MS = 500;

function monotonicNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function appIsActive(): boolean {
  return AppState.currentState === 'active';
}

function isDefiniteAssessmentServerFailure(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    (error.code === 'PROVIDER_FAILED' ||
      error.code === 'PROVIDER_TIMEOUT' ||
      error.code === 'CAPACITY_BUSY' ||
      error.code === 'POOL_SATURATED' ||
      error.code === 'INTERNAL')
  );
}

function serializeAudioMode(operation: () => Promise<void>): Promise<void> {
  const result = audioModeQueue.then(operation, operation);
  audioModeQueue = result.catch(() => undefined);
  return result;
}

/**
 * Capacity-retry backoff that stays responsive to cancel: resolves after `ms`
 * or rejects with an AbortError as soon as the signal fires, whichever comes
 * first. Without this the cancel button would appear dead for up to
 * CAPACITY_RETRY_MAX_DELAY_MS of plain setTimeout.
 *
 * The timer declaration is hoisted above rejectAbort: a signal that is already
 * aborted at entry rejects before the setTimeout line runs, and a `const`
 * declared below would still be in its temporal dead zone at that point.
 * Exported for the pre-aborted-signal unit test.
 */
export function sleepAbortable(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rejectAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    };
    if (signal.aborted) {
      rejectAbort();
      return;
    }
    timer = setTimeout(() => {
      signal.removeEventListener('abort', rejectAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', rejectAbort, { once: true });
  });
}
const WAIT_TICK_MS = 1_000;
const METER_SEGMENT_COUNT = 6;
const METER_RANGE_DB = 60;
const REMAINING_TIME_ANNOUNCEMENTS: readonly (readonly [number, MessageKey])[] = [
  [60_000, 'recorder.oneMinuteLeft'],
  [90_000, 'recorder.thirtySecondsLeft'],
  [110_000, 'recorder.tenSecondsLeft'],
];
const SPEECH_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 64_000,
  isMeteringEnabled: true,
  web: {
    ...RecordingPresets.HIGH_QUALITY.web,
    bitsPerSecond: 64_000,
  },
};

function formatElapsed(durationMillis: number): string {
  const safeDuration = Number.isFinite(durationMillis) && durationMillis > 0 ? durationMillis : 0;
  const totalSeconds = Math.floor(safeDuration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Maps a recorder metering reading (dBFS, ≤ 0) onto filled meter segments. */
function activeMeterSegments(metering: number | undefined): number {
  if (typeof metering !== 'number' || !Number.isFinite(metering)) return 0;
  const level = Math.min(1, Math.max(0, (metering + METER_RANGE_DB) / METER_RANGE_DB));
  return Math.round(level * METER_SEGMENT_COUNT);
}

function recorderStateChanged(previous: RecorderState, next: RecorderState): boolean {
  return (
    previous.canRecord !== next.canRecord ||
    previous.isRecording !== next.isRecording ||
    previous.mediaServicesDidReset !== next.mediaServicesDidReset ||
    previous.url !== next.url ||
    Math.abs(previous.durationMillis - next.durationMillis) > 50 ||
    previous.metering !== next.metering
  );
}

/** Poll the native bridge only while live recording needs duration/meter data. */
function useScopedAudioRecorderState(
  recorder: AudioRecorder,
  active: boolean,
  eventVersion: number,
): RecorderState {
  const [state, setState] = useState<RecorderState>(() => recorder.getStatus());
  useEffect(() => {
    const refresh = () => {
      try {
        const next = recorder.getStatus();
        setState((previous) => (recorderStateChanged(previous, next) ? next : previous));
      } catch {
        // Completion/error events remain authoritative if a released recorder
        // can no longer answer a final status read.
      }
    };
    refresh();
    if (!active) return;
    const interval = setInterval(refresh, 200);
    return () => clearInterval(interval);
  }, [active, eventVersion, recorder]);
  return state;
}

async function restoreAudioMode(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await serializeAudioMode(() =>
        setAudioModeAsync({
          allowsRecording: false,
          allowsBackgroundRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        }),
      );
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Resolves as soon as the app reports 'active' again, or after `timeoutMs`
 * when it does not. The permission dialog pauses the app itself, so a start
 * that survives the prompt has to outlast that blip; the timeout keeps a
 * genuine backgrounding from latching the start (its caller re-checks the
 * foreground and abandons the take, and its `finally` frees the controls).
 *
 * The timer declaration is hoisted above the listener for the same reason as
 * in sleepAbortable: clearTimeout must never read it in its dead zone.
 */
function waitForForeground(timeoutMs: number): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      clearTimeout(timer);
      subscription.remove();
      resolve();
    });
    timer = setTimeout(() => {
      subscription.remove();
      resolve();
    }, timeoutMs);
  });
}

function deleteRecording(uri: string | null): void {
  if (!uri) return;
  if (uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      // Browser blob cleanup is best effort.
    }
    return;
  }
  if (!uri.startsWith('file:')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup is best effort; the OS can also evict cache files.
  }
}

function recordingFileExists(uri: string): boolean {
  // Web blob URIs carry no file metadata; only native URIs can be verified.
  if (!uri.startsWith('file:')) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function completedRecordingIsUsable(uri: string): boolean {
  if (!uri.startsWith('file:')) return true;
  try {
    const file = new File(uri);
    return (
      file.exists && typeof file.size === 'number' && Number.isFinite(file.size) && file.size > 0
    );
  } catch {
    return false;
  }
}

function cleanupOrphanedRecordingCache(): void {
  if (Platform.OS === 'web') return;
  try {
    for (const directoryName of ['Audio', 'ExpoAudio']) {
      const directory = new Directory(Paths.cache, directoryName);
      if (!directory.exists) continue;
      for (const entry of directory.list()) {
        if (
          entry instanceof File &&
          !liveRecorderUris.has(entry.uri) &&
          entry.name.startsWith('recording-')
        ) {
          entry.delete();
        }
      }
    }
  } catch {
    // Cache janitor is best effort; normal lifecycle deletion remains primary.
  }
}

/** Shared recorder for diagnostic and practice assessment. */
export default function Recorder<T>({
  ownerId,
  questionId,
  endpoint,
  parseResult,
  onResult,
  onError,
  onRateLimited,
  onRecoveryUnresolved,
  onInteractionLockChange,
  onRecoveryEndpointMismatch,
}: RecorderProps<T>) {
  const mountedRef = useRef(true);
  const unmountingRef = useRef(false);
  const recordingCompletionRef = useRef<RecordingStatus | null>(null);
  const recordingStatusWaitersRef = useRef(new Set<(status: RecordingStatus | null) => void>());
  const suppressRecordingStatusRef = useRef(false);
  const [recordingStatusVersion, setRecordingStatusVersion] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  // expo-audio's subscription captures this callback only when the native
  // recorder identity changes, so it must stay referentially stable and read
  // mutable state exclusively through refs.
  const handleRecordingStatus = useCallback((status: RecordingStatus) => {
    if (status.isFinished || status.hasError || status.mediaServicesDidReset) {
      recordingCompletionRef.current = status;
      for (const resolve of recordingStatusWaitersRef.current) resolve(status);
      recordingStatusWaitersRef.current.clear();
      if (!suppressRecordingStatusRef.current && mountedRef.current && !unmountingRef.current) {
        setRecordingStatusVersion((version) => version + 1);
      }
    }
  }, []);
  const recorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS, handleRecordingStatus);
  const recorderState = useScopedAudioRecorderState(
    recorder,
    phase === 'recording',
    recordingStatusVersion,
  );
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);

  const [operationActive, setOperationActive] = useState(false);
  // True only when a terminal recovery failure parked the recorder in
  // 'recovering' with no polling loop behind it; the Try Again affordance then
  // re-invokes recoverPending so a SecureStore hiccup cannot latch the
  // controls until a remount.
  const [recoveryRetryNeeded, setRecoveryRetryNeeded] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [recordedDurationMillis, setRecordedDurationMillis] = useState(0);
  const [waitElapsedMillis, setWaitElapsedMillis] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const pulse = useAnimatedValue(1);
  const phaseRef = useRef<Phase>('idle');
  const operationOwnerRef = useRef<symbol | null>(null);
  const operationsInFlightRef = useRef(new Set<symbol>());
  const activeUriRef = useRef<string | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const recoveryControllerRef = useRef<AbortController | null>(null);
  const nativeStopPromiseRef = useRef<Promise<unknown> | null>(null);
  const audioRestorePromiseRef = useRef<Promise<boolean> | null>(null);
  const lifecycleStopPromiseRef = useRef<Promise<void> | null>(null);
  const focusedRef = useRef(false);
  const lifecycleEpochRef = useRef(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const hasObservedRecordingRef = useRef(false);
  const recordingInterruptionHandledRef = useRef(false);
  const autoStoppedAtRef = useRef<number | null>(null);
  const previousIdentityRef = useRef({ ownerId, endpoint, questionId });
  const requestIdRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);
  const assessmentPostedRef = useRef(false);
  const cancelPersistenceRef = useRef<{
    requestId: string;
    promise: Promise<boolean>;
  } | null>(null);
  const deferredPermissionResponseRef = useRef<{
    ownerId: string;
    endpoint: AssessmentEndpoint;
    questionId: string;
    response: { granted: boolean; canAskAgain?: boolean };
  } | null>(null);
  const startRecordingRef = useRef<() => Promise<void>>(async () => undefined);
  // The requestId of a submission the learner cancelled after its assessment
  // POST went out. Recovery honors that cancel once it proves the server
  // committed nothing, instead of resubmitting the answer they stopped.
  const cancelledSubmissionRequestIdRef = useRef<string | null>(null);
  // Set when lifecycle cleanup threw away a take on the way to the background,
  // so the next foreground can say so instead of showing an empty recorder.
  const backgroundDiscardedRef = useRef(false);
  const waitStartedAtRef = useRef<number | null>(null);
  const previewPlayerRef = useRef<AudioPlayer | null>(null);
  const previewListenerRef = useRef<{ remove: () => void } | null>(null);
  const webAutoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveringRef = useRef(false);
  const recoveryGenerationRef = useRef(0);
  const instanceIdRef = useRef(Symbol('recorder-recovery'));
  const acquireAudioSession = useCallback(() => {
    const instanceId = instanceIdRef.current;
    if (activeAudioSessionOwner !== null && activeAudioSessionOwner !== instanceId) return false;
    if (activeAudioSessionOwner === null) {
      activeAudioSessionOwner = instanceId;
      activeAudioSessionReleasePromise = new Promise((resolve) => {
        resolveActiveAudioSessionRelease = resolve;
      });
    }
    return true;
  }, []);
  const restoreOwnedAudioMode = useCallback(async (notify = true): Promise<boolean> => {
    if (audioRestorePromiseRef.current) return audioRestorePromiseRef.current;
    const instanceId = instanceIdRef.current;
    if (activeAudioSessionOwner !== instanceId) return true;
    const promise = (async () => {
      try {
        await restoreAudioMode();
        return true;
      } catch {
        if (
          notify &&
          mountedRef.current &&
          focusedRef.current &&
          AppState.currentState === 'active'
        ) {
          callbacksRef.current.onError(translate('recorder.errAudioReset'));
        }
        return false;
      } finally {
        if (activeAudioSessionOwner === instanceId) {
          activeAudioSessionOwner = null;
          const resolveRelease = resolveActiveAudioSessionRelease;
          resolveActiveAudioSessionRelease = null;
          activeAudioSessionReleasePromise = null;
          resolveRelease?.();
        }
      }
    })().finally(() => {
      if (audioRestorePromiseRef.current === promise) audioRestorePromiseRef.current = null;
    });
    audioRestorePromiseRef.current = promise;
    return promise;
  }, []);
  const callbacksRef = useRef({
    onError,
    onInteractionLockChange,
    onRateLimited,
    onRecoveryEndpointMismatch,
    onRecoveryUnresolved,
    onResult,
    parseResult,
  });
  const identityRef = useRef({ ownerId, endpoint, questionId });
  const currentRecorderRef = useRef(recorder);

  useLayoutEffect(() => {
    callbacksRef.current = {
      onError,
      onInteractionLockChange,
      onRateLimited,
      onRecoveryEndpointMismatch,
      onRecoveryUnresolved,
      onResult,
      parseResult,
    };
  }, [
    onError,
    onInteractionLockChange,
    onRateLimited,
    onRecoveryEndpointMismatch,
    onRecoveryUnresolved,
    onResult,
    parseResult,
  ]);

  useLayoutEffect(() => {
    identityRef.current = { ownerId, endpoint, questionId };
  }, [endpoint, ownerId, questionId]);

  useLayoutEffect(() => {
    currentRecorderRef.current = recorder;
  }, [recorder]);

  useLayoutEffect(() => {
    const uri = recorder.uri;
    if (uri) liveRecorderUris.add(uri);
  }, [recorder.uri]);

  // null until the first notification, so the screen still learns the initial
  // unlocked state.
  const lockedRef = useRef<boolean | null>(null);
  const interactionLockCallbackRef = useRef(onInteractionLockChange);

  const publishOperation = useCallback(() => {
    if (!mountedRef.current || unmountingRef.current) return;
    setOperationActive(true);
    if (lockedRef.current !== true) {
      lockedRef.current = true;
      callbacksRef.current.onInteractionLockChange?.(true);
    }
  }, []);

  const beginOperation = useCallback(
    (supersede = false, publish = true): symbol | null => {
      if (
        !supersede &&
        (operationOwnerRef.current !== null || operationsInFlightRef.current.size > 0)
      ) {
        return null;
      }
      const token = Symbol('recorder-operation');
      operationsInFlightRef.current.add(token);
      operationOwnerRef.current = token;
      if (publish) publishOperation();
      return token;
    },
    [publishOperation],
  );

  const resumeOperation = useCallback(
    (token: symbol): boolean => {
      if (
        operationOwnerRef.current !== null ||
        !operationsInFlightRef.current.has(token) ||
        operationsInFlightRef.current.size !== 1
      ) {
        return false;
      }
      operationOwnerRef.current = token;
      publishOperation();
      return true;
    },
    [publishOperation],
  );

  const endOperation = useCallback((token: symbol) => {
    operationsInFlightRef.current.delete(token);
    if (operationOwnerRef.current === token) operationOwnerRef.current = null;
    const stillActive = operationsInFlightRef.current.size > 0;
    if (mountedRef.current) setOperationActive(stillActive);
    // A fast operation can begin and end inside one React batch, so the layout
    // effect may never observe operationActive=true. Balance the synchronous
    // begin notification explicitly when the final operation leaves idle.
    if (
      mountedRef.current &&
      !unmountingRef.current &&
      !stillActive &&
      phaseRef.current === 'idle' &&
      lockedRef.current === true
    ) {
      lockedRef.current = false;
      callbacksRef.current.onInteractionLockChange?.(false);
    }
  }, []);

  const operationIsCurrent = useCallback(
    (token: symbol) => operationOwnerRef.current === token,
    [],
  );

  const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);

  const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);

  useLayoutEffect(() => {
    const locked = phase !== 'idle' || operationActive;
    if (interactionLockCallbackRef.current !== onInteractionLockChange) {
      interactionLockCallbackRef.current?.(false);
      interactionLockCallbackRef.current = onInteractionLockChange;
      lockedRef.current = null;
    }
    // Only an actual transition is reported: screens clear their inline
    // notices whenever the recorder locks, so re-announcing a lock the phase
    // never left would wipe the 429 wait line published in the same commit.
    if (lockedRef.current === locked) return;
    lockedRef.current = locked;
    onInteractionLockChange?.(locked);
  }, [onInteractionLockChange, operationActive, phase]);

  useEffect(() => {
    unmountingRef.current = false;
    return () => {
      unmountingRef.current = true;
      lockedRef.current = false;
      interactionLockCallbackRef.current?.(false);
    };
  }, []);

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    // Each wait (upload or recovery) shows its own elapsed clock from zero.
    waitStartedAtRef.current =
      next === 'uploading' || next === 'recovering' ? monotonicNow() : null;
    if (mountedRef.current) {
      setPhase(next);
      setWaitElapsedMillis(0);
    }
  }, []);

  /**
   * Every terminal recovery failure goes through here: the recorder stays in
   * 'recovering' (the pending state is genuinely unresolved) but the retry
   * flag arms the Try Again button, so the learner is never one remount away
   * from escaping a failed storage read.
   */
  const failRecoveryAwaitingRetry = useCallback(
    (message: string) => {
      updatePhase('recovering');
      if (mountedRef.current) setRecoveryRetryNeeded(true);
      callbacksRef.current.onError(message);
    },
    [updatePhase],
  );

  const releasePreviewPlayer = useCallback(() => {
    try {
      previewListenerRef.current?.remove();
    } catch {
      // Listener teardown is best effort just like native player teardown.
    }
    previewListenerRef.current = null;
    const player = previewPlayerRef.current;
    previewPlayerRef.current = null;
    try {
      player?.remove();
    } catch {
      // Releasing native player resources is best effort.
    }
    if (mountedRef.current) setPreviewPlaying(false);
  }, []);

  const clearWebAutoStopTimer = useCallback(() => {
    if (webAutoStopTimerRef.current !== null) {
      clearTimeout(webAutoStopTimerRef.current);
      webAutoStopTimerRef.current = null;
    }
  }, []);

  const discardRecording = useCallback((candidateUri?: string | null) => {
    const activeUri = activeUriRef.current;
    deleteRecording(activeUri);
    if (candidateUri !== activeUri) deleteRecording(candidateUri ?? null);
    activeUriRef.current = null;
  }, []);

  const clearRequestTracking = useCallback(async (requestId: string) => {
    try {
      await clearPendingAssessment(requestId);
      if (requestIdRef.current === requestId) requestIdRef.current = null;
      return true;
    } catch {
      return false;
    }
  }, []);

  const invalidateRecovery = useCallback(() => {
    recoveryGenerationRef.current += 1;
    recoveringRef.current = false;
    recoveryControllerRef.current?.abort();
    recoveryControllerRef.current = null;
    if (activeRecoveryOwner === instanceIdRef.current) {
      activeRecoveryOwner = null;
    }
  }, []);

  const stopNativeRecording = useCallback(() => {
    if (nativeStopPromiseRef.current) return nativeStopPromiseRef.current;
    const promise = (recorder.stop() as Promise<unknown>).finally(() => {
      if (nativeStopPromiseRef.current === promise) {
        nativeStopPromiseRef.current = null;
      }
    });
    nativeStopPromiseRef.current = promise;
    return promise;
  }, [recorder]);

  const waitForRecordingCompletion = useCallback(async (): Promise<RecordingStatus | null> => {
    if (recordingCompletionRef.current) return recordingCompletionRef.current;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (status: RecordingStatus | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        recordingStatusWaitersRef.current.delete(finish);
        resolve(status);
      };
      const timer = setTimeout(() => finish(null), RECORDING_EVENT_WAIT_MS);
      recordingStatusWaitersRef.current.add(finish);
    });
  }, []);

  const disposePreparedRecording = useCallback(async () => {
    suppressRecordingStatusRef.current = true;
    clearWebAutoStopTimer();
    try {
      // Android's stop path resets even when MediaRecorder.stop throws. Web's
      // inactive MediaRecorder must be started first so its stop event releases
      // getUserMedia tracks. iOS permits a no-op stop while merely prepared.
      if (Platform.OS === 'web' && !recorder.isRecording) recorder.record();
      await stopNativeRecording();
      if (Platform.OS !== 'web') await waitForRecordingCompletion();
    } catch {
      // The best available SDK cleanup was attempted; URI deletion and audio
      // mode restoration still run at the caller.
      if (Platform.OS !== 'web') await waitForRecordingCompletion();
    } finally {
      recordingCompletionRef.current = null;
      suppressRecordingStatusRef.current = false;
    }
  }, [clearWebAutoStopTimer, recorder, stopNativeRecording, waitForRecordingCompletion]);

  const stopForLifecycle = useCallback(() => {
    if (lifecycleStopPromiseRef.current) {
      return lifecycleStopPromiseRef.current;
    }
    const operationToken = beginOperation(true);
    if (!operationToken) return Promise.resolve();
    const promise = (async () => {
      lifecycleEpochRef.current += 1;
      invalidateRecovery();
      clearWebAutoStopTimer();
      let candidateUri: string | null = null;
      let recorderWasRecording = phaseRef.current === 'recording';
      try {
        candidateUri = recorder.uri;
        recorderWasRecording ||= recorder.isRecording;
      } catch {
        // Expo may already have released the shared object; continue with refs.
      }
      let nativeStop: Promise<unknown> | null = null;
      if (recorderWasRecording) {
        suppressRecordingStatusRef.current = true;
        try {
          // Invoke stop before any await so Expo's later passive hook cleanup
          // cannot release the native object out from under lifecycle teardown.
          nativeStop = stopNativeRecording();
        } catch {
          // Native cleanup continues below.
        }
      }
      const pendingCancel = readCancelPersistence();
      if (cancelRequestedRef.current && pendingCancel) {
        await pendingCancel.promise;
      }
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
      if (recorderWasRecording) {
        try {
          await nativeStop;
          if (Platform.OS !== 'web') await waitForRecordingCompletion();
          const completedUri = recordingCompletionRef.current?.url;
          if (completedUri) {
            candidateUri = completedUri;
          } else {
            try {
              candidateUri = recorder.uri ?? candidateUri;
            } catch {
              // The captured/event URI remains the best cleanup candidate.
            }
          }
        } catch {
          // Native cleanup continues below.
          if (Platform.OS !== 'web') await waitForRecordingCompletion();
        } finally {
          recordingCompletionRef.current = null;
          suppressRecordingStatusRef.current = false;
        }
      }
      discardRecording(candidateUri);
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      autoStoppedAtRef.current = null;
      if (mountedRef.current) setRecordedDurationMillis(0);
      updatePhase('idle');
      await restoreOwnedAudioMode();
    })().finally(() => {
      endOperation(operationToken);
      if (lifecycleStopPromiseRef.current === promise) {
        lifecycleStopPromiseRef.current = null;
      }
    });
    lifecycleStopPromiseRef.current = promise;
    return promise;
  }, [
    beginOperation,
    clearWebAutoStopTimer,
    discardRecording,
    endOperation,
    invalidateRecovery,
    readCancelPersistence,
    recorder,
    restoreOwnedAudioMode,
    stopNativeRecording,
    updatePhase,
    waitForRecordingCompletion,
  ]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    unmountingRef.current = false;
    return () => {
      unmountingRef.current = true;
      mountedRef.current = false;
      void stopForLifecycle();
    };
  }, [stopForLifecycle]);

  const recoverPending = useCallback(async () => {
    const instanceId = instanceIdRef.current;
    const identityIsCurrent = () =>
      identityRef.current.ownerId === ownerId &&
      identityRef.current.endpoint === endpoint &&
      identityRef.current.questionId === questionId &&
      currentRecorderRef.current === recorder;
    if (activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId) {
      if (phaseRef.current === 'recovering' && mountedRef.current) {
        setRecoveryRetryNeeded(true);
      }
      return;
    }
    if (
      recoveringRef.current ||
      operationIsInFlight() ||
      uploadControllerRef.current !== null ||
      !mountedRef.current ||
      !focusedRef.current ||
      AppState.currentState !== 'active' ||
      !identityIsCurrent() ||
      (phaseRef.current !== 'idle' && phaseRef.current !== 'recovering')
    ) {
      return;
    }

    const operationToken = beginOperation(false, false);
    if (!operationToken) return;
    let operationHandedToRecovery = false;
    const finishLoading = () => {
      if (!operationHandedToRecovery) endOperation(operationToken);
    };

    let pending: PendingAssessment | null;
    try {
      pending = await loadPendingAssessment();
    } catch {
      if (
        mountedRef.current &&
        focusedRef.current &&
        AppState.currentState === 'active' &&
        identityIsCurrent() &&
        (phaseRef.current === 'idle' || phaseRef.current === 'recovering')
      ) {
        failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUnavailable'));
      }
      finishLoading();
      return;
    }
    if (
      !pending ||
      !operationIsCurrent(operationToken) ||
      uploadControllerRef.current !== null ||
      !mountedRef.current ||
      !focusedRef.current ||
      AppState.currentState !== 'active' ||
      !identityIsCurrent() ||
      (phaseRef.current !== 'idle' && phaseRef.current !== 'recovering') ||
      (activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId)
    ) {
      // An ambiguous submission enters 'recovering' before calling this. If
      // the tombstone is already gone there is nothing to reconcile, so
      // release the controls with an honest message instead of latching
      // 'recovering' with no UI escape short of a remount.
      if (
        !pending &&
        phaseRef.current === 'recovering' &&
        operationIsCurrent(operationToken) &&
        uploadControllerRef.current === null &&
        mountedRef.current &&
        focusedRef.current &&
        AppState.currentState === 'active' &&
        identityIsCurrent() &&
        (activeRecoveryOwner === null || activeRecoveryOwner === instanceId)
      ) {
        updatePhase('idle');
        callbacksRef.current.onError(translate('recorder.errNothingToConfirm'));
      }
      const leaseHeldElsewhere =
        pending !== null && activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;
      finishLoading();
      if (leaseHeldElsewhere) {
        updatePhase('recovering');
        if (mountedRef.current) setRecoveryRetryNeeded(true);
      }
      return;
    }

    // The answer mode is session-scoped, while the interrupted handoff is
    // durable. Restore the saved practice endpoint before taking ownership so
    // the remounted Recorder uses the matching parser and can display the
    // replay instead of discarding a valid response as a route mismatch.
    if (
      pending.ownerId === ownerId &&
      pending.questionId === questionId &&
      pending.endpoint !== endpoint &&
      callbacksRef.current.onRecoveryEndpointMismatch?.(pending.endpoint)
    ) {
      finishLoading();
      return;
    }

    activeRecoveryOwner = instanceId;
    recoveringRef.current = true;
    operationHandedToRecovery = true;
    publishOperation();
    const recoveryController = new AbortController();
    recoveryControllerRef.current = recoveryController;
    // A live recovery loop now owns the recovering phase; hide the stale
    // failure's Try Again affordance.
    if (mountedRef.current) setRecoveryRetryNeeded(false);
    const generation = ++recoveryGenerationRef.current;
    const isCurrent = () =>
      recoveryGenerationRef.current === generation &&
      recoveringRef.current &&
      activeRecoveryOwner === instanceId &&
      operationIsCurrent(operationToken) &&
      !recoveryController.signal.aborted &&
      identityIsCurrent() &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    updatePhase('recovering');
    try {
      if (pending.ownerId !== ownerId) {
        const cleared = await clearRequestTracking(pending.requestId);
        if (isCurrent()) {
          if (cleared) {
            updatePhase('idle');
          } else {
            failRecoveryAwaitingRetry(translate('recorder.errRetryInfoClear'));
          }
        }
        return;
      }

      if (pending.stage === 'reconcile') {
        if (!isCurrent()) return;
        callbacksRef.current.onRecoveryUnresolved();
        if (!isCurrent()) return;
        discardRecording();
        updatePhase('idle');
        void clearRequestTracking(pending.requestId);
        return;
      }

      const routeMatches = pending.endpoint === endpoint && pending.questionId === questionId;
      /**
       * Releases a handoff that provably claimed nothing server-side and hands
       * the take back for review: the never-uploaded 'prepared' stage, and a
       * user cancel whose absence this recovery has now confirmed.
       */
      const releaseUnclaimedHandoff = async () => {
        const cleared = await clearRequestTracking(pending.requestId);
        if (!isCurrent()) return;
        if (cleared) {
          updatePhase(activeUriRef.current && routeMatches ? 'recorded' : 'idle');
        } else {
          failRecoveryAwaitingRetry(translate('recorder.errRetryInfoClear'));
        }
      };
      if (pending.stage === 'prepared') {
        if (!isCurrent()) return;
        await releaseUnclaimedHandoff();
        return;
      }
      const finishUnresolved = async (
        message: string,
        allowRecordedRetry: boolean,
        rejection?: ApiError,
      ) => {
        if (!isCurrent()) return;
        try {
          if (!(await markPendingAssessmentForReconciliation(pending.requestId))) {
            throw new Error('Pending assessment disappeared');
          }
        } catch {
          if (!isCurrent()) return;
          failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUpdate'));
          return;
        }
        if (!isCurrent()) return;
        callbacksRef.current.onRecoveryUnresolved();
        if (!isCurrent()) return;
        if (!allowRecordedRetry || !activeUriRef.current || !routeMatches) {
          discardRecording();
          updatePhase('idle');
        } else {
          updatePhase('recorded');
        }
        // A rate/daily-limit refusal carries the localized "when can I try
        // again" line; screens that render it inline deserve it there, exactly
        // as the submit path routes its own 429.
        if (rejection?.status === 429 && callbacksRef.current.onRateLimited) {
          callbacksRef.current.onRateLimited(message);
        } else {
          callbacksRef.current.onError(message);
        }
        void clearRequestTracking(pending.requestId);
      };

      let notFoundCount = 0;
      let resubmissionConflictPending = false;
      const recoveryStartedAt = Date.now();
      const recoveryStartedMonotonic = monotonicNow();
      // Every restart gets one bounded reconciliation window. `createdAt`
      // describes the original handoff, not the current recovery attempt; an
      // The server retains completed replays for 48 hours; this client retires
      // automatic recovery sooner and still performs one final status read.
      const recoveryDuration =
        recoveryStartedAt - pending.createdAt > RECOVERY_RECORD_TTL_MS ? 0 : RECOVERY_LEASE_MS;
      let firstStatusRead = true;
      let nextS3ResubmissionAt = 0;
      let s3Reuploads = 0;
      let currentAudioKey = pending.audioKey;

      /**
       * Re-runs the upload grant + S3 POST for the surviving local recording
       * under a FRESH audioKey but the SAME durable requestId, then points the
       * resubmission loop at the new object. Needed because the server deletes
       * the submitted object even when it abandons the claim for a retryable
       * provider failure or object expiry, so the persisted key can be dead.
       * Same ordering as the submit flow: the new handoff is persisted before
       * the upload I/O.
       */
      const reuploadRecording = async (uri: string, requestId: string): Promise<boolean> => {
        try {
          const descriptor = await resolveAudioFileDescriptor(uri, {
            signal: recoveryController.signal,
          });
          if (!isCurrent()) return false;
          const grant = await apiRequestAudioUpload(descriptor.type, ownerId, {
            signal: recoveryController.signal,
          });
          if (!isCurrent() || grant.mode !== 's3') return false;
          if (!(await markPendingAssessmentStage(requestId, 's3-granted', grant.audioKey))) {
            return false;
          }
          if (!isCurrent()) return false;
          await apiPostPresignedAudio(
            grant.uploadUrl,
            grant.uploadFields,
            uri,
            grant.contentType,
            grant.maxBytes,
            { signal: recoveryController.signal },
          );
          currentAudioKey = grant.audioKey;
          return true;
        } catch {
          return false;
        }
      };
      while (firstStatusRead || monotonicNow() - recoveryStartedMonotonic <= recoveryDuration) {
        firstStatusRead = false;
        let nextPollDelayMs = RECOVERY_POLL_MS;
        try {
          const status = await apiFetch<unknown>(
            `/assessments/${encodeURIComponent(pending.requestId)}`,
            { timeoutMs: RECOVERY_REQUEST_TIMEOUT_MS, signal: recoveryController.signal },
          );
          if (!isCurrent()) return;
          notFoundCount = 0;
          resubmissionConflictPending = false;
          if (!status || typeof status !== 'object' || !('status' in status)) {
            await finishUnresolved(translate('recorder.errBadRecoveryResponse'), false);
            return;
          }
          const expectedContext =
            pending.endpoint === '/diagnostic/answer'
              ? 'diagnostic'
              : pending.endpoint === '/practice/attempt/native'
                ? 'practice-native'
                : 'practice';
          if (
            !('context' in status) ||
            status.context !== expectedContext ||
            !('questionId' in status) ||
            status.questionId !== pending.questionId
          ) {
            await finishUnresolved(translate('recorder.errRecoveryMismatch'), false);
            return;
          }
          if (status.status === 'processing') {
            // The server owns the request; wait for the durable response.
          } else if (status.status === 'completed' && 'response' in status) {
            if (!routeMatches) {
              try {
                if (!(await markPendingAssessmentForReconciliation(pending.requestId))) {
                  throw new Error('Pending assessment disappeared');
                }
              } catch {
                if (isCurrent()) {
                  failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUpdate'));
                }
                return;
              }
              if (!isCurrent()) return;
              callbacksRef.current.onRecoveryUnresolved();
              if (!isCurrent()) return;
              discardRecording();
              updatePhase('idle');
              callbacksRef.current.onError(translate('recorder.errInterruptedSaved'));
              void clearRequestTracking(pending.requestId);
              return;
            }
            let data: T;
            try {
              data = callbacksRef.current.parseResult(status.response);
            } catch {
              try {
                if (!(await markPendingAssessmentForReconciliation(pending.requestId))) {
                  throw new Error('Pending assessment disappeared');
                }
              } catch {
                if (isCurrent()) {
                  failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUpdate'));
                }
                return;
              }
              if (!isCurrent()) return;
              callbacksRef.current.onRecoveryUnresolved();
              if (!isCurrent()) return;
              discardRecording();
              updatePhase('idle');
              callbacksRef.current.onError(translate('recorder.errCannotDisplay'));
              void clearRequestTracking(pending.requestId);
              return;
            }
            if (!isCurrent()) return;
            try {
              if (!(await markPendingAssessmentForReconciliation(pending.requestId))) {
                throw new Error('Pending assessment disappeared');
              }
            } catch {
              if (isCurrent()) {
                failRecoveryAwaitingRetry(translate('recorder.errResultSafeRetryInfo'));
              }
              return;
            }
            if (!isCurrent()) {
              return;
            }
            discardRecording();
            updatePhase('idle');
            callbacksRef.current.onResult(data);
            void clearRequestTracking(pending.requestId);
            return;
          } else {
            await finishUnresolved(translate('recorder.errRecoveryMismatch'), false);
            return;
          }
        } catch (error) {
          if (!isCurrent()) return;
          if (error instanceof ApiError && error.status === 404) {
            notFoundCount += 1;
            if (resubmissionConflictPending) {
              // The 409 was never this request's own in-flight row — that row
              // would have answered this status read. Its claim was abandoned:
              // the question moved on, or another session owns it.
              await finishUnresolved(translate('recorder.errAlreadyAnswered'), true);
              return;
            }
            const absenceConfirmed =
              notFoundCount >= NOT_FOUND_CONFIRMATIONS &&
              monotonicNow() - recoveryStartedMonotonic >= 10_000;
            // This handoff only entered recovery because the learner cancelled
            // after the assessment POST went out, when it might still have
            // committed. Confirmed absence proves it did not, so honor the
            // cancel and return the take instead of submitting an answer they
            // explicitly stopped (and spending a capped assessment on it).
            if (
              absenceConfirmed &&
              (pending.cancelRequested === true ||
                cancelledSubmissionRequestIdRef.current === pending.requestId)
            ) {
              await releaseUnclaimedHandoff();
              return;
            }
            // A lone 404 can race the original assessment POST before its
            // idempotency row exists. Only reuse the already-uploaded key after
            // repeated absence over ten seconds. Ambiguous transport failures
            // get a small, bounded exponential retry budget; every retry keeps
            // the same request UUID and object key.
            if (
              absenceConfirmed &&
              monotonicNow() >= nextS3ResubmissionAt &&
              pending.stage === 's3-granted' &&
              currentAudioKey
            ) {
              let recoveryPostClaimed: boolean;
              try {
                recoveryPostClaimed = await claimPendingAssessmentRecoveryPost(pending.requestId);
              } catch {
                if (isCurrent()) {
                  failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUpdate'));
                }
                return;
              }
              if (!isCurrent()) {
                if (recoveryPostClaimed) {
                  await refundPendingAssessmentRecoveryPost(pending.requestId).catch(() => false);
                }
                return;
              }
              if (!recoveryPostClaimed) {
                await finishUnresolved(translate('recorder.errRecoveryExpired'), true);
                return;
              }
              let recoveryPostStarted = false;
              try {
                const raw = await apiFetch<unknown>(pending.endpoint, {
                  method: 'POST',
                  body: {
                    questionId: pending.questionId,
                    requestId: pending.requestId,
                    audioKey: currentAudioKey,
                  },
                  signal: recoveryController.signal,
                  timeoutMs: AUDIO_TIMEOUT_MS,
                  onRequestStarted: () => {
                    recoveryPostStarted = true;
                  },
                });
                if (!isCurrent()) return;
                if (!routeMatches) {
                  await finishUnresolved(translate('recorder.errInterruptedSaved'), false);
                  return;
                }
                let data: T;
                try {
                  data = callbacksRef.current.parseResult(raw);
                } catch {
                  await finishUnresolved(translate('recorder.errCannotDisplay'), false);
                  return;
                }
                try {
                  if (!(await markPendingAssessmentForReconciliation(pending.requestId))) {
                    throw new Error('Pending assessment disappeared');
                  }
                } catch {
                  if (isCurrent()) {
                    failRecoveryAwaitingRetry(translate('recorder.errResultSafeRetryInfo'));
                  }
                  return;
                }
                if (!isCurrent()) return;
                discardRecording();
                updatePhase('idle');
                callbacksRef.current.onResult(data);
                void clearRequestTracking(pending.requestId);
                return;
              } catch (retryError) {
                if (!recoveryPostStarted) {
                  await refundPendingAssessmentRecoveryPost(pending.requestId).catch(() => false);
                  if (isCurrent()) {
                    await finishUnresolved(
                      userMessageForError(retryError, translate('recorder.errNotSent')),
                      true,
                    );
                  }
                  return;
                }
                if (!isCurrent()) return;
                if (retryError instanceof ApiError && retryError.status === 401) return;
                // A 409 here is genuinely ambiguous: either this requestId's
                // idempotency row appeared between the 404 absence checks and
                // is still processing (the next status read will answer
                // 'processing'/'completed'), or its claim was abandoned —
                // another session owns the question, or the diagnostic moved
                // on — and the next read stays 404. Defer the decision to that
                // read instead of polling an abandoned row for the full lease.
                if (retryError instanceof ApiError && retryError.status === 409) {
                  resubmissionConflictPending = true;
                }
                // AUDIO_UPLOAD_MISSING is the exact additive contract proving
                // the persisted key is dead without reaching provider work.
                // Refund the durable recovery-POST claim, re-upload a surviving
                // local take once under a fresh key, and let the next poll make
                // the one allowed POST. Every other 400 stays terminal.
                if (
                  retryError instanceof ApiError &&
                  retryError.status === 400 &&
                  retryError.code === 'AUDIO_UPLOAD_MISSING' &&
                  s3Reuploads < MAX_S3_REUPLOADS
                ) {
                  const uri = activeUriRef.current;
                  // recordingFileExists, not a bare `new File(uri).exists`: this
                  // runs inside catch (retryError), so a throw here escapes the
                  // retry loop and rejects recoverPending(), which the caller
                  // invokes as `void recoverPending()` — an unhandled rejection
                  // that strands the recorder in `recovering` with no message.
                  if (uri !== null && routeMatches && recordingFileExists(uri)) {
                    let refunded = false;
                    try {
                      refunded = await refundPendingAssessmentRecoveryPost(pending.requestId);
                    } catch {
                      if (isCurrent()) {
                        failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUpdate'));
                      }
                      return;
                    }
                    if (!isCurrent()) return;
                    if (refunded && (await reuploadRecording(uri, pending.requestId))) {
                      if (!isCurrent()) return;
                      s3Reuploads += 1;
                      // The fresh object is in place; resubmit it on the next
                      // poll instead of failing terminally.
                      continue;
                    }
                    if (!isCurrent()) return;
                  }
                }
                // Rate and daily limits reject before the idempotency claim,
                // so a 429 proves this resubmission committed nothing. Finish
                // now with the wait line the submit path would have shown,
                // instead of polling absent reads until the lease expires and
                // then deleting a recording the server never accepted.
                if (retryError instanceof ApiError && retryError.status === 429) {
                  await finishUnresolved(
                    userMessageForError(retryError, translate('recorder.errRejected')),
                    true,
                    retryError,
                  );
                  return;
                }
                if (isDefiniteAssessmentServerFailure(retryError)) {
                  await finishUnresolved(
                    userMessageForError(retryError, translate('recorder.errNotSent')),
                    true,
                    retryError,
                  );
                  return;
                }
                if (
                  retryError instanceof ApiError &&
                  [400, 403, 404, 413, 415, 422].includes(retryError.status)
                ) {
                  await finishUnresolved(translate('recorder.errUploadGone'), true);
                  return;
                }
                // An ambiguous failure may have committed. Continue polling the
                // same durable request before retrying the identical handoff.
                // The single durable recovery-POST budget is now spent. A
                // transport-ambiguous failure remains pollable, but cannot be
                // multiplied by remounts or fresh recovery cycles.
                nextS3ResubmissionAt = monotonicNow() + S3_RESUBMIT_BASE_BACKOFF_MS;
              }
            }
            if (absenceConfirmed && pending.stage !== 's3-granted') {
              await finishUnresolved(translate('recorder.errUploadUnconfirmed'), false);
              return;
            }
          } else if (error instanceof ApiError && error.status === 401) {
            return;
          } else if (error instanceof ApiError && error.code === 'CLIENT_UPGRADE_REQUIRED') {
            // The version gate rejects every route before any claim is made,
            // so polling it out is pointless: surface the upgrade message and
            // keep the take instead of burning the lease and deleting it.
            await finishUnresolved(
              userMessageForError(error, translate('recorder.errRejected')),
              true,
            );
            return;
          } else if (
            error instanceof ApiError &&
            (error.status === 429 || error.status === 503) &&
            error.retryAfterSeconds !== undefined &&
            Number.isFinite(error.retryAfterSeconds)
          ) {
            nextPollDelayMs = Math.min(
              RECOVERY_LEASE_MS,
              Math.max(RECOVERY_POLL_MS, Math.ceil(error.retryAfterSeconds * 1_000)),
            );
          }
          // Offline, timeout, and transient server errors retain the durable
          // request UUID until the five-minute ownership lease expires.
        }
        try {
          await sleepAbortable(nextPollDelayMs, recoveryController.signal);
        } catch {
          return;
        }
        if (!isCurrent()) return;
      }
      await finishUnresolved(translate('recorder.errRecoveryExpired'), false);
    } finally {
      if (recoveryGenerationRef.current === generation) {
        recoveringRef.current = false;
        if (activeRecoveryOwner === instanceId) activeRecoveryOwner = null;
      }
      if (recoveryControllerRef.current === recoveryController) {
        recoveryControllerRef.current = null;
      }
      endOperation(operationToken);
    }
  }, [
    beginOperation,
    clearRequestTracking,
    discardRecording,
    endOperation,
    endpoint,
    failRecoveryAwaitingRetry,
    operationIsCurrent,
    operationIsInFlight,
    ownerId,
    publishOperation,
    questionId,
    recorder,
    updatePhase,
  ]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      void (async () => {
        await lifecycleStopPromiseRef.current;
        await recoverPending();
      })();
      return () => {
        focusedRef.current = false;
        invalidateRecovery();
        void stopForLifecycle();
      };
    }, [invalidateRecovery, recoverPending, stopForLifecycle]),
  );

  useEffect(() => {
    cleanupOrphanedRecordingCache();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (backgroundDiscardedRef.current) {
          backgroundDiscardedRef.current = false;
          callbacksRef.current.onError(translate('recorder.errBackgroundDiscarded'));
        }
        void (async () => {
          await lifecycleStopPromiseRef.current;
          const deferredPermission = deferredPermissionResponseRef.current;
          if (deferredPermission) {
            deferredPermissionResponseRef.current = null;
            const identityMatches =
              deferredPermission.ownerId === identityRef.current.ownerId &&
              deferredPermission.endpoint === identityRef.current.endpoint &&
              deferredPermission.questionId === identityRef.current.questionId;
            if (identityMatches && mountedRef.current && focusedRef.current) {
              if (deferredPermission.response.granted) {
                await startRecordingRef.current();
              } else {
                setPermissionDenied(true);
                setPermissionNeedsSettings(deferredPermission.response.canAskAgain === false);
              }
            }
          }
          await recoverPending();
        })();
      } else if (
        state === 'background' ||
        (state === 'inactive' && phaseRef.current === 'recording')
      ) {
        // Leaving the app deliberately discards an unsubmitted take (no
        // unsubmitted audio persists outside the recovery stages), so record
        // that a take was lost and tell the learner on the way back rather
        // than returning them to an empty recorder with no explanation.
        backgroundDiscardedRef.current ||=
          phaseRef.current === 'recording' || phaseRef.current === 'recorded';
        void stopForLifecycle();
      }
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
      void stopForLifecycle();
    };
  }, [recoverPending, stopForLifecycle]);

  useLayoutEffect(() => {
    const previous = previousIdentityRef.current;
    if (
      previous.ownerId !== ownerId ||
      previous.endpoint !== endpoint ||
      previous.questionId !== questionId
    ) {
      previousIdentityRef.current = { ownerId, endpoint, questionId };
      deferredPermissionResponseRef.current = null;
      // stopForLifecycle invalidates the epoch synchronously before its first
      // await. Keeping this in the commit's layout phase prevents old async
      // work from observing the new identity before cleanup begins.
      void stopForLifecycle();
      setPermissionDenied(false);
    }
  }, [endpoint, ownerId, questionId, stopForLifecycle]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  // Pre-submit playback exists only while a take is held for review; every
  // other phase releases the native player (submit, re-record, lifecycle).
  useEffect(() => {
    if (phase !== 'recorded') releasePreviewPlayer();
  }, [phase, releasePreviewPlayer]);

  useEffect(() => () => releasePreviewPlayer(), [releasePreviewPlayer]);

  // The assessment wait shows honest progress: an elapsed clock plus staged
  // copy while uploading, and a longer-than-usual note while recovering. The
  // clock zero point is stamped by updatePhase; this effect only ticks.
  useEffect(() => {
    if (phase !== 'uploading' && phase !== 'recovering') return;
    const interval = setInterval(() => {
      const startedAt = waitStartedAtRef.current;
      if (startedAt !== null) setWaitElapsedMillis(monotonicNow() - startedAt);
    }, WAIT_TICK_MS);
    return () => clearInterval(interval);
  }, [phase]);

  // Screen-reader users cannot watch the countdown; announce the remaining
  // time at fixed marks of the two-minute recording window.
  useEffect(() => {
    if (phase !== 'recording') return;
    const timers = REMAINING_TIME_ANNOUNCEMENTS.map(([atMillis, messageKey]) =>
      setTimeout(() => AccessibilityInfo.announceForAccessibility(translate(messageKey)), atMillis),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [phase]);

  // Light tap on record start and on a take being saved; failures are ignored
  // because haptics are unavailable on some devices and on web.
  const hapticPhaseRef = useRef<Phase>('idle');
  useEffect(() => {
    const previous = hapticPhaseRef.current;
    hapticPhaseRef.current = phase;
    if (phase === 'recording' || (previous === 'recording' && phase === 'recorded')) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }, [phase]);

  const announcedPhaseRef = useRef<Phase>('idle');
  useEffect(() => {
    if (announcedPhaseRef.current === phase) return;
    announcedPhaseRef.current = phase;
    if (!focusedRef.current || AppState.currentState !== 'active') return;
    const announcement =
      phase === 'recording'
        ? translate('recorder.announceStarted')
        : phase === 'recorded'
          ? translate('recorder.a11ySaved')
          : phase === 'uploading'
            ? translate('recorder.a11yUploading')
            : phase === 'recovering'
              ? translate('recorder.a11yRecovering')
              : null;
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'recording' || reduceMotion) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.3,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse, reduceMotion]);

  const adoptCompletedRecording = useCallback(
    (uri: string, durationMillis: number) => {
      const safeDurationMillis =
        Number.isFinite(durationMillis) && durationMillis > 0 ? durationMillis : 0;
      clearWebAutoStopTimer();
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      if (safeDurationMillis < 500 || !completedRecordingIsUsable(uri)) {
        discardRecording(uri);
        if (mountedRef.current) setRecordedDurationMillis(0);
        updatePhase('idle');
        callbacksRef.current.onError(
          translate(safeDurationMillis < 500 ? 'recorder.errTooShort' : 'recorder.errSaveFailed'),
        );
        void restoreOwnedAudioMode();
        return;
      }
      activeUriRef.current = uri;
      autoStoppedAtRef.current = monotonicNow();
      setRecordedDurationMillis(Math.min(MAX_RECORDING_SECONDS * 1000, safeDurationMillis));
      updatePhase('recorded');
      void restoreOwnedAudioMode();
    },
    [clearWebAutoStopTimer, discardRecording, restoreOwnedAudioMode, updatePhase],
  );

  // Native completion/error/reset is authoritative. The guarded polling
  // fallback remains for SDK implementations that omit the event, but a paused
  // recorder (`canRecord=true`) can never be mistaken for an auto-stop.
  useEffect(() => {
    const completion = recordingCompletionRef.current;
    if (
      phaseRef.current === 'recording' &&
      !operationIsInFlight() &&
      completion &&
      (completion.hasError || completion.mediaServicesDidReset)
    ) {
      recordingCompletionRef.current = null;
      recordingInterruptionHandledRef.current = true;
      callbacksRef.current.onError(translate('recorder.errDeviceInterrupted'));
      void stopForLifecycle();
      return;
    }
    if (phaseRef.current === 'recording' && recorderState.isRecording) {
      hasObservedRecordingRef.current = true;
      return;
    }
    if (
      phaseRef.current === 'recording' &&
      !operationIsInFlight() &&
      !recorderState.mediaServicesDidReset &&
      !recorderState.isRecording &&
      (completion?.isFinished === true ||
        (hasObservedRecordingRef.current && recorderState.canRecord === false))
    ) {
      const uri = completion?.url ?? recorder.uri ?? recorderState.url;
      if (uri) {
        const wallDuration = recordingStartedAtRef.current
          ? monotonicNow() - recordingStartedAtRef.current
          : 0;
        const nativeDuration = Number.isFinite(recorderState.durationMillis)
          ? Math.max(0, recorderState.durationMillis)
          : 0;
        recordingCompletionRef.current = null;
        adoptCompletedRecording(uri, Math.max(nativeDuration, wallDuration));
      }
    }
  }, [
    adoptCompletedRecording,
    operationIsInFlight,
    recorder.uri,
    recorderState,
    recordingStatusVersion,
    stopForLifecycle,
  ]);

  useEffect(() => {
    if (
      phaseRef.current === 'recording' &&
      recorderState.mediaServicesDidReset &&
      !recordingInterruptionHandledRef.current
    ) {
      recordingInterruptionHandledRef.current = true;
      callbacksRef.current.onError(translate('recorder.errDeviceInterrupted'));
      void stopForLifecycle();
    }
  }, [recorderState.mediaServicesDidReset, stopForLifecycle]);

  const startRecording = async () => {
    if (
      recoveringRef.current ||
      phaseRef.current === 'recording' ||
      phaseRef.current === 'uploading' ||
      phaseRef.current === 'recovering'
    ) {
      return;
    }
    const operationToken = beginOperation();
    if (!operationToken) return;
    let lifecycleEpoch = lifecycleEpochRef.current;
    const startIdentity = { ownerId, endpoint, questionId, recorder };
    const identityIsCurrent = () =>
      identityRef.current.ownerId === startIdentity.ownerId &&
      identityRef.current.endpoint === startIdentity.endpoint &&
      identityRef.current.questionId === startIdentity.questionId &&
      currentRecorderRef.current === startIdentity.recorder;
    const isCurrentLifecycle = () =>
      operationIsCurrent(operationToken) &&
      lifecycleEpoch === lifecycleEpochRef.current &&
      identityIsCurrent() &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    const previousUri = activeUriRef.current;
    let prepared = false;
    let recoverAfterStart = false;
    releasePreviewPlayer();
    if (mountedRef.current) setPermissionDenied(false);
    try {
      if (!appIsActive()) {
        await waitForForeground(PERMISSION_PROMPT_RESUME_MS);
        if (!appIsActive() && mountedRef.current && focusedRef.current && identityIsCurrent()) {
          callbacksRef.current.onError(translate('recorder.errStartFailed'));
        }
        if (!isCurrentLifecycle()) return;
      }
      const current = await AudioModule.getRecordingPermissionsAsync();
      if (!isCurrentLifecycle()) return;
      const prompted = !current.granted && current.canAskAgain !== false;
      const response = prompted ? await AudioModule.requestRecordingPermissionsAsync() : current;
      // The system dialog pauses the app itself: on Android it fires a
      // 'background' blip that bumps the lifecycle epoch, and on iOS it can
      // answer before didBecomeActive crosses the bridge. Wait out that
      // resume and adopt the fresh epoch, or a learner's first-ever grant
      // would be swallowed with no recording and no message.
      if (prompted) {
        await waitForForeground(PERMISSION_PROMPT_RESUME_MS);
        await lifecycleStopPromiseRef.current;
        if (!identityIsCurrent() || !mountedRef.current || !focusedRef.current) {
          return;
        }
        if (!appIsActive()) {
          deferredPermissionResponseRef.current = {
            ownerId: startIdentity.ownerId,
            endpoint: startIdentity.endpoint,
            questionId: startIdentity.questionId,
            response,
          };
          return;
        }
        if (!operationIsCurrent(operationToken) && !resumeOperation(operationToken)) return;
        lifecycleEpoch = lifecycleEpochRef.current;
      }
      if (!isCurrentLifecycle()) return;
      if (!response.granted) {
        if (mountedRef.current) {
          setPermissionDenied(true);
          setPermissionNeedsSettings(response.canAskAgain === false);
        }
        return;
      }

      let pending: PendingAssessment | null;
      try {
        pending = await loadPendingAssessment();
      } catch {
        if (isCurrentLifecycle()) {
          failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUnavailable'));
        }
        return;
      }
      if (!isCurrentLifecycle()) return;
      if (pending) {
        recoverAfterStart = true;
        updatePhase('recovering');
        return;
      }
      const previousRequestId = requestIdRef.current;
      if (previousRequestId) {
        const cleared = await clearRequestTracking(previousRequestId);
        if (!isCurrentLifecycle()) return;
        if (!cleared) {
          failRecoveryAwaitingRetry(translate('recorder.errRetryInfoClear'));
          return;
        }
      }
      await audioRestorePromiseRef.current;
      await activeAudioSessionReleasePromise;
      if (!isCurrentLifecycle()) return;
      if (!acquireAudioSession()) {
        throw new Error('Another recorder still owns the global audio session');
      }
      await serializeAudioMode(() =>
        setAudioModeAsync({
          allowsRecording: true,
          allowsBackgroundRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        }),
      );
      if (!isCurrentLifecycle()) {
        await restoreOwnedAudioMode(false);
        return;
      }
      await recorder.prepareToRecordAsync();
      prepared = true;
      if (!isCurrentLifecycle()) {
        await disposePreparedRecording();
        if (recorder.uri !== previousUri) deleteRecording(recorder.uri);
        await restoreOwnedAudioMode(false);
        return;
      }
      recordingCompletionRef.current = null;
      recordingInterruptionHandledRef.current = false;
      recordingStartedAtRef.current = monotonicNow();
      hasObservedRecordingRef.current = false;
      autoStoppedAtRef.current = null;
      clearWebAutoStopTimer();
      if (Platform.OS === 'web') {
        recorder.record();
        webAutoStopTimerRef.current = setTimeout(() => {
          webAutoStopTimerRef.current = null;
          void stopRecording('auto');
        }, MAX_RECORDING_SECONDS * 1_000);
      } else {
        recorder.record({ forDuration: MAX_RECORDING_SECONDS });
      }
      prepared = false;
      deleteRecording(previousUri);
      activeUriRef.current = null;
      if (mountedRef.current) setRecordedDurationMillis(0);
      updatePhase('recording');
    } catch {
      if (prepared) await disposePreparedRecording();
      if (recorder.uri !== previousUri) deleteRecording(recorder.uri);
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      clearWebAutoStopTimer();
      await restoreOwnedAudioMode(false);
      if (isCurrentLifecycle()) {
        updatePhase(activeUriRef.current === previousUri && previousUri ? 'recorded' : 'idle');
        callbacksRef.current.onError(translate('recorder.errStartFailed'));
      }
    } finally {
      endOperation(operationToken);
      if (recoverAfterStart) void recoverPending();
    }
  };
  startRecordingRef.current = startRecording;

  const stopRecording = async (reason: 'user' | 'auto' = 'user') => {
    if (phaseRef.current !== 'recording') return;
    const operationToken = beginOperation();
    if (!operationToken) return;
    clearWebAutoStopTimer();
    const lifecycleEpoch = lifecycleEpochRef.current;
    const isCurrentLifecycle = () =>
      operationIsCurrent(operationToken) &&
      lifecycleEpoch === lifecycleEpochRef.current &&
      identityRef.current.ownerId === ownerId &&
      identityRef.current.endpoint === endpoint &&
      identityRef.current.questionId === questionId &&
      currentRecorderRef.current === recorder &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    const durationBeforeStop = Math.max(
      Number.isFinite(recorderState.durationMillis) ? Math.max(0, recorderState.durationMillis) : 0,
      recordingStartedAtRef.current ? monotonicNow() - recordingStartedAtRef.current : 0,
    );
    try {
      const stopResult = await stopNativeRecording();
      const completion =
        recordingCompletionRef.current ??
        (Platform.OS === 'web' ? null : await waitForRecordingCompletion());
      recordingCompletionRef.current = null;
      const androidResult =
        stopResult && typeof stopResult === 'object' ? (stopResult as { url?: unknown }) : null;
      const stopFailed =
        completion?.hasError === true ||
        completion?.mediaServicesDidReset === true ||
        (Platform.OS === 'android' &&
          androidResult !== null &&
          typeof androidResult.url !== 'string');
      const uri = completion?.url ?? recorder.uri;
      if (!isCurrentLifecycle()) {
        discardRecording(uri);
        return;
      }
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      if (stopFailed || !uri || durationBeforeStop < 500 || !completedRecordingIsUsable(uri)) {
        discardRecording(uri);
        updatePhase('idle');
        callbacksRef.current.onError(
          translate(
            !stopFailed && uri && durationBeforeStop < 500
              ? 'recorder.errTooShort'
              : 'recorder.errSaveFailed',
          ),
        );
        return;
      }
      activeUriRef.current = uri;
      if (reason === 'auto') autoStoppedAtRef.current = monotonicNow();
      setRecordedDurationMillis(Math.min(MAX_RECORDING_SECONDS * 1_000, durationBeforeStop));
      updatePhase('recorded');
    } catch {
      // recorder.stop() can reject when the 2:00 auto-stop already finalized
      // this take natively. A completed file is a valid answer; keep it, and
      // only discard when no saved recording actually exists.
      const completion = recordingCompletionRef.current;
      recordingCompletionRef.current = null;
      const uri = completion?.url ?? recorder.uri;
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      if (
        uri &&
        completion?.hasError !== true &&
        completion?.mediaServicesDidReset !== true &&
        !recorder.isRecording &&
        completedRecordingIsUsable(uri) &&
        durationBeforeStop >= 500 &&
        isCurrentLifecycle()
      ) {
        activeUriRef.current = uri;
        if (reason === 'auto') autoStoppedAtRef.current = monotonicNow();
        setRecordedDurationMillis(Math.min(MAX_RECORDING_SECONDS * 1000, durationBeforeStop));
        updatePhase('recorded');
      } else {
        discardRecording(uri);
        updatePhase('idle');
        if (isCurrentLifecycle()) {
          callbacksRef.current.onError(translate('recorder.errSaveFailed'));
        }
      }
    } finally {
      await restoreOwnedAudioMode();
      endOperation(operationToken);
    }
  };

  const submit = async () => {
    if (phaseRef.current !== 'recorded') return;
    const operationToken = beginOperation();
    if (!operationToken) return;
    const uri = activeUriRef.current ?? recorder.uri;
    // Unreachable by design: every path that clears activeUriRef also leaves
    // the recorded phase (pinned by the identity-change and lifecycle tests).
    // Kept as fail-closed defense; the missing-FILE case is handled as a
    // definite 400 inside apiUploadAudio.
    /* istanbul ignore next */
    if (!uri) {
      updatePhase('idle');
      callbacksRef.current.onError(translate('recorder.errNoRecording'));
      endOperation(operationToken);
      return;
    }

    releasePreviewPlayer();
    cancelRequestedRef.current = false;
    assessmentPostedRef.current = false;
    cancelPersistenceRef.current = null;
    cancelledSubmissionRequestIdRef.current = null;
    updatePhase('uploading');
    const lifecycleEpoch = lifecycleEpochRef.current;
    const isCurrentSubmission = () =>
      operationIsCurrent(operationToken) &&
      lifecycleEpoch === lifecycleEpochRef.current &&
      identityRef.current.ownerId === ownerId &&
      identityRef.current.endpoint === endpoint &&
      identityRef.current.questionId === questionId &&
      currentRecorderRef.current === recorder &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    const canContinueSubmission = () => {
      if (controller.signal.aborted) {
        throw (
          controller.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
        );
      }
      return isCurrentSubmission();
    };
    let recoverAfterUpload = false;
    try {
      const requestId = requestIdRef.current ?? Crypto.randomUUID();
      requestIdRef.current = requestId;
      const existing = await loadPendingAssessment();
      if (!canContinueSubmission()) return;
      if (
        existing &&
        (existing.requestId !== requestId ||
          existing.ownerId !== ownerId ||
          existing.endpoint !== endpoint ||
          existing.questionId !== questionId)
      ) {
        recoverAfterUpload = true;
        updatePhase('recovering');
        return;
      }
      if (!existing) {
        const pending: PendingAssessment = {
          ownerId,
          endpoint,
          questionId,
          requestId,
          createdAt: Date.now(),
          stage: 'prepared',
        };
        try {
          await savePendingAssessment(pending);
          if (!canContinueSubmission()) return;
        } catch {
          if (!canContinueSubmission()) return;
          requestIdRef.current = null;
          updatePhase('recorded');
          callbacksRef.current.onError(translate('recorder.errInfoNotSavedNotUploaded'));
          return;
        }
      }
      // Ask the API where the audio goes: a size-constrained S3 POST form in production,
      // direct multipart to the API in local dev. The assessment requestId is
      // claimed by the answer endpoint either way, so the idempotency and
      // recovery flow below is identical for both paths.
      const descriptor = await resolveAudioFileDescriptor(uri, { signal: controller.signal });
      if (!canContinueSubmission()) return;
      const grant = await apiRequestAudioUpload(descriptor.type, ownerId, {
        signal: controller.signal,
      });
      if (!canContinueSubmission()) return;
      let raw: unknown;
      // Only CAPACITY_BUSY is guaranteed to reject before paid work. It asks
      // clients to retry the SAME logical submission after Retry-After. Other
      // 503s (including pool saturation during persistence) can follow provider
      // spend and therefore require polling or an explicit learner retry.
      const postAssessment = async (): Promise<unknown> => {
        let capacityRetries = 0;
        for (;;) {
          try {
            // Once the assessment POST is issued, a user cancel can no longer
            // simply return to 'recorded': the server may have committed the
            // attempt, so cancellation defers to the recovery flow instead.
            if (grant.mode === 's3') {
              return await apiFetch<unknown>(endpoint, {
                method: 'POST',
                body: { questionId, requestId, audioKey: grant.audioKey },
                signal: controller.signal,
                timeoutMs: AUDIO_TIMEOUT_MS,
                onRequestStarted: () => {
                  assessmentPostedRef.current = true;
                },
              });
            }
            // Token/file preparation happens before the multipart request on
            // every platform. Only the callback below marks the handoff
            // ambiguous once bytes can actually reach the API.
            return await apiUploadAudio<unknown>(
              endpoint,
              uri,
              { questionId, requestId },
              {
                signal: controller.signal,
                onRequestStarted: () => {
                  assessmentPostedRef.current = true;
                },
              },
            );
          } catch (error) {
            if (
              controller.signal.aborted ||
              !(error instanceof ApiError) ||
              error.status !== 503 ||
              error.code !== 'CAPACITY_BUSY' ||
              capacityRetries >= MAX_CAPACITY_RETRIES
            ) {
              throw error;
            }
            // A received 503 is a definite pre-commit refusal. While waiting
            // for its Retry-After there is no assessment request in flight, so
            // Cancel can return the take immediately without reconciliation.
            assessmentPostedRef.current = false;
            capacityRetries += 1;
            const retryAfterSeconds =
              error.retryAfterSeconds !== undefined && Number.isFinite(error.retryAfterSeconds)
                ? error.retryAfterSeconds
                : 5;
            const delayMs = Math.min(
              CAPACITY_RETRY_MAX_DELAY_MS,
              Math.max(1_000, Math.round(retryAfterSeconds * 1_000)),
            );
            await sleepAbortable(delayMs, controller.signal);
            if (!canContinueSubmission()) throw error;
          }
        }
      };
      if (grant.mode === 's3') {
        if (!(await markPendingAssessmentStage(requestId, 's3-granted', grant.audioKey))) {
          // The tombstone vanished before anything was uploaded. Keep the
          // recording and let the learner retry — there is nothing to
          // reconcile, so recovery would latch with no way forward.
          if (!canContinueSubmission()) return;
          requestIdRef.current = null;
          updatePhase('recorded');
          callbacksRef.current.onError(translate('recorder.errInfoNotSavedNotUploaded'));
          return;
        }
        if (!canContinueSubmission()) return;
        await apiPostPresignedAudio(
          grant.uploadUrl,
          grant.uploadFields,
          uri,
          grant.contentType,
          grant.maxBytes,
          { signal: controller.signal },
        );
        if (!canContinueSubmission()) return;
        raw = await postAssessment();
      } else {
        if (!(await markPendingAssessmentStage(requestId, 'direct-posting'))) {
          // Same vanished-tombstone handling as the S3 branch above.
          if (!canContinueSubmission()) return;
          requestIdRef.current = null;
          updatePhase('recorded');
          callbacksRef.current.onError(translate('recorder.errInfoNotSavedNotUploaded'));
          return;
        }
        if (!canContinueSubmission()) return;
        raw = await postAssessment();
      }
      if (!canContinueSubmission()) {
        recoverAfterUpload = true;
        return;
      }
      if (cancelRequestedRef.current) {
        const cancelPersistence = readCancelPersistence();
        if (cancelPersistence) await cancelPersistence.promise;
        throw new DOMException('The operation was aborted.', 'AbortError');
      }
      let data: T;
      try {
        data = callbacksRef.current.parseResult(raw);
      } catch (error) {
        if (!(error instanceof ContractError)) throw error;
        // A successful response means the server already stored and charged
        // the attempt. Never let the same audio be submitted a second time.
        discardRecording();
        try {
          if (!(await markPendingAssessmentForReconciliation(requestId))) {
            throw new Error('Pending assessment disappeared');
          }
        } catch {
          if (!canContinueSubmission()) return;
          failRecoveryAwaitingRetry(translate('recorder.errAnswerSavedRetryInfo'));
          return;
        }
        if (!canContinueSubmission()) return;
        updatePhase('idle');
        callbacksRef.current.onRecoveryUnresolved();
        if (!canContinueSubmission()) return;
        callbacksRef.current.onError(translate('recorder.errCannotDisplay'));
        void clearRequestTracking(requestId);
        return;
      }
      discardRecording();
      try {
        if (!(await markPendingAssessmentForReconciliation(requestId))) {
          throw new Error('Pending assessment disappeared');
        }
      } catch {
        if (!canContinueSubmission()) return;
        failRecoveryAwaitingRetry(translate('recorder.errResultSafeRetryInfo'));
        return;
      }
      if (!canContinueSubmission()) return;
      updatePhase('idle');
      callbacksRef.current.onResult(data);
      void clearRequestTracking(requestId);
    } catch (error) {
      if (controller.signal.aborted) {
        // Lifecycle cleanup (blur, background, unmount) owns non-user aborts.
        if (!cancelRequestedRef.current) return;
        if (assessmentPostedRef.current) {
          // The cancelled POST may have committed server-side. Resolve the
          // durable request instead of risking a double submission, and carry
          // the cancel across the handoff so recovery hands the take back
          // rather than resubmitting once it proves nothing was claimed.
          const cancelPersistence = readCancelPersistence();
          const cancelMarked = cancelPersistence ? await cancelPersistence.promise : false;
          cancelRequestedRef.current = false;
          if (!isCurrentSubmission()) return;
          if (!cancelMarked) {
            failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUpdate'));
            return;
          }
          recoverAfterUpload = true;
          updatePhase('recovering');
          return;
        }
        // Nothing was claimed server-side: forget the handoff and hand the
        // saved take back so the learner can replay or resubmit it.
        const requestId = requestIdRef.current;
        const cleared = requestId ? await clearRequestTracking(requestId) : true;
        cancelRequestedRef.current = false;
        if (!isCurrentSubmission()) return;
        if (!cleared) {
          failRecoveryAwaitingRetry(translate('recorder.errRetryInfoClear'));
          return;
        }
        updatePhase('recorded');
        return;
      }
      if (!isCurrentSubmission()) return;
      // 426 belongs here: the client-version gate rejects ahead of the
      // idempotency claim, so it can never accompany a committed attempt.
      const definitelyRejected =
        error instanceof ApiError &&
        [400, 403, 404, 413, 415, 422, 426, 429].includes(error.status);
      const definiteServerFailure = isDefiniteAssessmentServerFailure(error);
      // A definite rejection, and any failure raised before the assessment
      // POST was ever issued, both prove nothing can have committed: clear the
      // handoff and hand the take straight back. Routing a never-sent
      // submission into recovery instead would spin silently and then delete
      // the recording once the five-minute lease expired.
      if (definitelyRejected || definiteServerFailure || !assessmentPostedRef.current) {
        const requestId = requestIdRef.current;
        const cleared = requestId ? await clearRequestTracking(requestId) : true;
        if (!isCurrentSubmission()) return;
        if (!cleared) {
          failRecoveryAwaitingRetry(translate('recorder.errRetryInfoClear'));
          return;
        }
        updatePhase('recorded');
        const message = userMessageForError(
          error,
          definitelyRejected ? translate('recorder.errRejected') : translate('recorder.errNotSent'),
        );
        // 429 covers RATE_LIMITED, DAILY_LIMIT, and NETWORK_DAILY_LIMIT; their
        // localized wait line deserves an inline home, not just an alert.
        if (
          error instanceof ApiError &&
          error.status === 429 &&
          callbacksRef.current.onRateLimited
        ) {
          callbacksRef.current.onRateLimited(message);
        } else {
          callbacksRef.current.onError(message);
        }
      } else {
        // A timeout, disconnect, invalid success body, or 409 can happen after
        // the attempt commits. Poll all of them, but reserve automatic recovery
        // POSTs only for transport status 0/408. A received HTTP response or
        // parser failure must not multiply paid work when status later reads 404.
        const automaticRecoveryPostAllowed =
          error instanceof ApiError && (error.status === 0 || error.status === 408);
        if (!automaticRecoveryPostAllowed) {
          const requestId = requestIdRef.current;
          if (requestId) {
            try {
              await claimPendingAssessmentRecoveryPost(requestId);
            } catch {
              if (isCurrentSubmission()) {
                failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUpdate'));
              }
              return;
            }
            if (!isCurrentSubmission()) return;
          }
        }
        recoverAfterUpload = true;
        updatePhase('recovering');
      }
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }
      // An 'inactive' dip (Control Center, a call banner, Siri) fails
      // isCurrentSubmission without bumping the lifecycle epoch, so submit can
      // return with the phase still 'uploading' and nothing left driving it —
      // a permanent spinner over a dead Cancel button. Every real blur,
      // background, or unmount bumps the epoch through stopForLifecycle and
      // parks the phase at 'idle', so this only catches the orphan; recovery
      // then resolves the durable request on the next foreground.
      // Asserted because TypeScript still carries the entry guard's 'recorded'
      // narrowing of phaseRef.current across every await above; updatePhase
      // writes it from outside this function.
      const settledPhase = phaseRef.current as Phase;
      if (
        settledPhase === 'uploading' &&
        operationIsCurrent(operationToken) &&
        lifecycleEpoch === lifecycleEpochRef.current &&
        mountedRef.current
      ) {
        updatePhase('recovering');
        recoverAfterUpload = true;
      }
      if (readCancelPersistence()?.requestId === requestIdRef.current) {
        cancelPersistenceRef.current = null;
      }
      endOperation(operationToken);
      if (recoverAfterUpload) void recoverPending();
    }
  };

  const isRecording = phase === 'recording';

  const handleMicPress = () => {
    if (isRecording) return stopRecording();
    // The 2:00 native auto-stop can flip the phase to 'recorded' just as the
    // learner taps to stop; treating that tap as a re-record would destroy
    // the take they just captured. Ignore mic presses briefly after an
    // auto-stop; the explicit Re-record action stays available.
    if (
      autoStoppedAtRef.current !== null &&
      monotonicNow() - autoStoppedAtRef.current >= 0 &&
      monotonicNow() - autoStoppedAtRef.current < AUTO_STOP_TAP_GRACE_MS
    ) {
      return Promise.resolve();
    }
    return startRecording();
  };

  const cancelUpload = () => {
    if (phaseRef.current !== 'uploading') return;
    const controller = uploadControllerRef.current;
    // Unreachable by design: a submission that detaches its controller also
    // leaves the uploading phase (it completes, or the finally hands the
    // orphan to recovery). Kept as fail-closed defense.
    /* istanbul ignore next */
    if (!controller) return;
    if (cancelPersistenceRef.current) return;
    cancelRequestedRef.current = true;
    const requestId = requestIdRef.current;
    if (assessmentPostedRef.current && requestId) {
      cancelledSubmissionRequestIdRef.current = requestId;
      const promise = markPendingAssessmentCancelled(requestId).catch(() => false);
      cancelPersistenceRef.current = { requestId, promise };
      void promise.finally(() => controller.abort());
    } else {
      controller.abort();
    }
  };

  // Escape hatch for a terminally failed recovery (e.g. SecureStore threw):
  // re-run the same recovery path the focus/foreground triggers would run.
  const retryRecovery = () => {
    void recoverPending();
  };

  const togglePreview = () => {
    if (operationIsInFlight() || phaseRef.current !== 'recorded') return;
    if (previewPlaying) {
      try {
        previewPlayerRef.current?.pause();
      } catch {
        releasePreviewPlayer();
        callbacksRef.current.onError(translate('recorder.errPlayFailed'));
        return;
      }
      setPreviewPlaying(false);
      return;
    }
    if (!previewPlayerRef.current) {
      const uri = activeUriRef.current;
      // Unreachable by design: the recorded phase always holds a saved take
      // (same invariant as submit). Kept as fail-closed defense.
      /* istanbul ignore next */
      if (!uri) return;
      let player: AudioPlayer;
      try {
        player = createAudioPlayer(uri);
      } catch {
        callbacksRef.current.onError(translate('recorder.errPlayFailed'));
        return;
      }
      try {
        previewListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
          if (status.error) {
            if (previewPlayerRef.current === player) {
              releasePreviewPlayer();
              callbacksRef.current.onError(translate('recorder.errPlayFailed'));
            }
            return;
          }
          const reachedEnd =
            status.didJustFinish ||
            (!status.playing &&
              status.duration > 0 &&
              status.currentTime >= status.duration - 0.05);
          if (!reachedEnd) return;
          // Rewind so Play starts the take from the beginning next time.
          void player.seekTo(0).catch(() => undefined);
          if (mountedRef.current && previewPlayerRef.current === player) {
            setPreviewPlaying(false);
          }
        });
        previewPlayerRef.current = player;
      } catch {
        try {
          player.remove();
        } catch {
          // Best-effort cleanup after listener installation failure.
        }
        callbacksRef.current.onError(translate('recorder.errPlayFailed'));
        return;
      }
    }
    try {
      previewPlayerRef.current.play();
      setPreviewPlaying(true);
    } catch {
      releasePreviewPlayer();
      callbacksRef.current.onError(translate('recorder.errPlayFailed'));
    }
  };

  const busy = phase === 'uploading' || phase === 'recovering';
  const elapsed = formatElapsed(
    phase === 'recorded' ? recordedDurationMillis : (recorderState.durationMillis ?? 0),
  );
  const meterSegments = activeMeterSegments(recorderState.metering);
  const uploadStageText =
    waitElapsedMillis >= UPLOAD_STAGE_ALMOST_DONE_MS
      ? t('recorder.stageAlmostDone')
      : waitElapsedMillis >= UPLOAD_STAGE_LISTENING_MS
        ? t('recorder.stageListening')
        : t('recorder.stageUploading');

  return (
    <View style={styles.container}>
      {permissionDenied && (
        <View accessibilityRole="alert" style={styles.permissionBanner}>
          <Text style={styles.permissionText}>{t('recorder.permissionBody')}</Text>
          {permissionNeedsSettings && (
            <Button
              title={t('recorder.openSettings')}
              variant="danger"
              size="sm"
              onPress={() => {
                void Linking.openSettings().catch(() =>
                  callbacksRef.current.onError(translate('recorder.openSettingsFailed')),
                );
              }}
              style={styles.settingsButton}
            />
          )}
        </View>
      )}

      <View style={styles.buttonWrap}>
        {isRecording && !reduceMotion && (
          <Animated.View
            accessible={false}
            style={[styles.pulseRing, { transform: [{ scale: pulse }] }]}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRecording ? t('recorder.stopLabel') : t('recorder.startLabel')}
          accessibilityState={{ disabled: busy || operationActive }}
          disabled={busy || operationActive}
          onPress={handleMicPress}
          style={({ pressed }) => [
            styles.recordButton,
            (busy || operationActive || pressed) && styles.recordButtonDimmed,
          ]}
        >
          <View style={isRecording ? styles.stopIcon : styles.micDot} />
        </Pressable>
      </View>

      {isRecording &&
        (reduceMotion ? (
          <Text style={styles.listeningText}>{t('recorder.listening')}</Text>
        ) : (
          <View
            testID="live-level-meter"
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.meterRow}
          >
            {Array.from({ length: METER_SEGMENT_COUNT }, (_, index) => (
              <View
                key={index}
                testID={index < meterSegments ? 'level-segment-active' : 'level-segment-idle'}
                style={[styles.meterSegment, index < meterSegments && styles.meterSegmentActive]}
              />
            ))}
          </View>
        ))}

      <Text
        accessible={!isRecording}
        accessibilityLabel={
          isRecording
            ? t('recorder.a11yRecording')
            : phase === 'recorded'
              ? t('recorder.a11ySaved')
              : phase === 'recovering'
                ? t('recorder.a11yRecovering')
                : busy
                  ? t('recorder.a11yUploading')
                  : t('recorder.a11yIdle')
        }
        style={styles.statusText}
      >
        {isRecording
          ? t('recorder.statusRecording', { elapsed })
          : phase === 'recorded'
            ? t('recorder.statusRecorded', { elapsed })
            : phase === 'recovering'
              ? t('recorder.statusRecovering')
              : busy
                ? uploadStageText
                : t('recorder.statusIdle')}
      </Text>

      <Text style={styles.privacyText}>{t('recorder.privacyNote')}</Text>

      {busy && (
        <>
          <ActivityIndicator
            accessibilityLabel={
              phase === 'recovering' ? t('recorder.a11yRecovering') : t('recorder.a11yUploading')
            }
            style={styles.spinner}
            size="large"
            color={theme.colors.primary}
          />
          {phase === 'recovering' && (
            <Text style={styles.waitHintText}>{t('recorder.waitHint')}</Text>
          )}
          <Text style={styles.waitElapsedText}>
            {t('recorder.waitingFor', { elapsed: formatElapsed(waitElapsedMillis) })}
          </Text>
          {phase === 'uploading' && (
            <Button
              title={t('common.cancel')}
              variant="secondary"
              size="sm"
              accessibilityHint={t('recorder.cancelHint')}
              onPress={cancelUpload}
              style={styles.cancelButton}
            />
          )}
          {phase === 'recovering' && recoveryRetryNeeded && (
            <Button
              title={t('common.tryAgain')}
              variant="secondary"
              size="sm"
              onPress={retryRecovery}
              style={styles.cancelButton}
            />
          )}
        </>
      )}

      {phase === 'recorded' && (
        <View style={styles.actions}>
          <Button
            title={previewPlaying ? t('recorder.pause') : t('recorder.play')}
            variant="secondary"
            accessibilityLabel={previewPlaying ? t('recorder.pauseLabel') : t('recorder.playLabel')}
            onPress={togglePreview}
            disabled={operationActive}
          />
          <Button
            title={t('recorder.submit')}
            onPress={() => void submit()}
            disabled={operationActive}
          />
          <Button
            title={t('recorder.rerecord')}
            variant="quiet"
            onPress={() => void startRecording()}
            disabled={operationActive}
          />
        </View>
      )}
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, radii, scheme, spacing }) => ({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  permissionBanner: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  permissionText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  settingsButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
  buttonWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.dangerPulse,
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    // Black shadows disappear against the dark background; lean on a stronger
    // cast (and the bright fill itself) instead of a light-mode-tuned haze.
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  recordButtonDimmed: {
    opacity: 0.6,
  },
  micDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.onDanger,
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.onDanger,
  },
  listeningText: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  meterRow: {
    marginTop: spacing.md,
    height: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  meterSegment: {
    width: 10,
    height: 6,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  meterSegmentActive: {
    height: 14,
    backgroundColor: colors.success,
  },
  statusText: {
    marginTop: spacing.ml,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  waitHintText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  waitElapsedText: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  privacyText: {
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
  spinner: {
    marginTop: spacing.ml,
  },
  actions: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    gap: spacing.md,
  },
}));
