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
import {
  configurePlaybackAudioMode,
  configureRecordingAudioMode,
  getSubmittedRecordingPlaybackActive,
  stopActivePlayback,
} from '../lib/audio-session';
import { translate, useT, type MessageKey } from '../lib/i18n';
import {
  capturePendingAssessmentGeneration,
  clearPendingAssessment,
  claimPendingAssessmentRecoveryPost,
  ensurePendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentCancelled,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  refundPendingAssessmentRecoveryPost,
  type AssessmentEndpoint,
  type PendingAssessment,
} from '../lib/pending-assessment';
import { createThemedStyles, useTheme } from '../lib/theme';
import { ContractError } from '../lib/types';
import Button from './Button';

export type Phase = 'idle' | 'recording' | 'recorded' | 'uploading' | 'recovering';

interface RecorderProps<T> {
  ownerId: string;
  questionId: string;
  /** Externally disables recorder actions while a sibling mutation is active. */
  disabled?: boolean;
  /** Ref-safe guard for a Start/Re-record handler captured before that mutation. */
  isStartBlocked?: () => boolean;
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

interface RecordingCompletion {
  status: RecordingStatus;
  takeGeneration: number;
}

interface TerminalEventQuarantine {
  takeGeneration: number;
  uri: string | null;
}

interface AssessmentIdentity {
  ownerId: string;
  endpoint: AssessmentEndpoint;
  questionId: string;
}

let activeRecoveryOwner: symbol | null = null;
let activeAudioSessionOwner: symbol | null = null;
let activeAudioSessionReleasePromise: Promise<void> | null = null;
let resolveActiveAudioSessionRelease: (() => void) | null = null;
const liveRecorderUris = new Set<string>();
let recordingCacheJanitorHasRun = false;

const MAX_RECORDING_SECONDS = 120;
const AUTO_STOP_TAP_GRACE_MS = 1_000;
const RECOVERY_LEASE_MS = 5 * 60_000;
const RECOVERY_RECORD_TTL_MS = 25 * 60 * 60_000;
const RECOVERY_REQUEST_TIMEOUT_MS = 5_000;
const MAX_CAPACITY_RETRIES = 3;
const CAPACITY_RETRY_ATTEMPTS = [0, 1, 2, 3] as const;
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
const MAX_TERMINAL_EVENT_QUARANTINES = 4;

export function monotonicNow(): number {
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

export function formatElapsed(durationMillis: number): string {
  const safeDuration = Number.isFinite(durationMillis) ? Math.max(0, durationMillis) : 0;
  const totalSeconds = Math.floor(safeDuration / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Maps a recorder metering reading (dBFS, ≤ 0) onto filled meter segments. */
export function activeMeterSegments(metering: number | undefined): number {
  if (!Number.isFinite(metering)) return 0;
  const finiteMetering = metering as number;
  const level = Math.min(1, Math.max(0, (finiteMetering + METER_RANGE_DB) / METER_RANGE_DB));
  return Math.round(level * METER_SEGMENT_COUNT);
}

export function assessmentIdentityMatches(
  current: AssessmentIdentity,
  ownerId: string,
  endpoint: AssessmentEndpoint,
  questionId: string,
): boolean {
  return (
    current.ownerId === ownerId &&
    current.endpoint === endpoint &&
    current.questionId === questionId
  );
}

export function recorderContextIsActive(
  mounted: boolean,
  focused: boolean,
  appState: string | null,
): boolean {
  return mounted && focused && appState === 'active';
}

export function terminalEventQuarantineIndex(
  quarantines: readonly TerminalEventQuarantine[],
  eventUri: string | null,
  recorderStillRecording: boolean,
  takeGeneration: number,
): number {
  if (eventUri !== null) {
    return quarantines.findIndex(
      (entry) =>
        entry.uri === eventUri ||
        (recorderStillRecording && entry.uri === null && entry.takeGeneration < takeGeneration),
    );
  }
  if (!recorderStillRecording) return -1;
  return quarantines.findIndex((entry) => entry.takeGeneration < takeGeneration);
}

export function rememberTerminalEventQuarantine(
  quarantines: TerminalEventQuarantine[],
  quarantine: TerminalEventQuarantine,
): void {
  if (quarantines.some((entry) => entry.takeGeneration === quarantine.takeGeneration)) return;
  quarantines.push(quarantine);
  if (quarantines.length > MAX_TERMINAL_EVENT_QUARANTINES) quarantines.shift();
}

export function canBeginRecorderOperation(
  supersede: boolean,
  hasOwner: boolean,
  inFlightCount: number,
): boolean {
  return supersede || (!hasOwner && inFlightCount === 0);
}

export function canResumeRecorderOperation(
  hasOwner: boolean,
  tokenIsInFlight: boolean,
  inFlightCount: number,
): boolean {
  return !hasOwner && tokenIsInFlight && inFlightCount === 1;
}

export function shouldRunDeferredRecovery(
  inFlightCount: number,
  mounted: boolean,
  unmounting: boolean,
  focused: boolean,
  appState: string | null,
  phase: Phase,
): boolean {
  return (
    inFlightCount === 0 &&
    !unmounting &&
    recorderContextIsActive(mounted, focused, appState) &&
    (phase === 'idle' || phase === 'recovering')
  );
}

function recoveryPhaseIsEligible(phase: Phase): boolean {
  return phase === 'idle' || phase === 'recovering';
}

export function canStartRecoveryAttempt(
  hasAttempt: boolean,
  recovering: boolean,
  hasUpload: boolean,
  contextIsActive: boolean,
  identityIsCurrent: boolean,
  phase: Phase,
): boolean {
  return (
    !hasAttempt &&
    !recovering &&
    !hasUpload &&
    contextIsActive &&
    identityIsCurrent &&
    recoveryPhaseIsEligible(phase)
  );
}

export function canContinueRecoveryLoad(
  hasPending: boolean,
  operationIsCurrent: boolean,
  hasUpload: boolean,
  contextIsActive: boolean,
  identityIsCurrent: boolean,
  phase: Phase,
  anotherOwner: boolean,
): boolean {
  return (
    hasPending &&
    operationIsCurrent &&
    !hasUpload &&
    contextIsActive &&
    identityIsCurrent &&
    recoveryPhaseIsEligible(phase) &&
    !anotherOwner
  );
}

export function canReleaseMissingRecovery(
  phase: Phase,
  operationIsCurrent: boolean,
  hasUpload: boolean,
  contextIsActive: boolean,
  identityIsCurrent: boolean,
  anotherOwner: boolean,
): boolean {
  return (
    phase === 'recovering' &&
    operationIsCurrent &&
    !hasUpload &&
    contextIsActive &&
    identityIsCurrent &&
    !anotherOwner
  );
}

export function recoveryAttemptIsCurrent(
  generationMatches: boolean,
  recovering: boolean,
  ownsLease: boolean,
  operationIsCurrent: boolean,
  signalAborted: boolean,
  identityIsCurrent: boolean,
  contextIsActive: boolean,
): boolean {
  return (
    generationMatches &&
    recovering &&
    ownsLease &&
    operationIsCurrent &&
    !signalAborted &&
    identityIsCurrent &&
    contextIsActive
  );
}

export function pendingAssessmentCanUpload(
  pending: PendingAssessment,
  ownerId: string,
  endpoint: AssessmentEndpoint,
  questionId: string,
  requestId: string,
): boolean {
  return (
    pending.requestId === requestId &&
    assessmentIdentityMatches(pending, ownerId, endpoint, questionId) &&
    pending.stage === 'prepared' &&
    pending.cancelRequested !== true &&
    (pending.recoveryPostAttempts ?? 0) === 0
  );
}

export function shouldRetryCapacityFailure(
  error: unknown,
  signalAborted: boolean,
  retries: number,
): error is ApiError {
  return (
    !signalAborted &&
    error instanceof ApiError &&
    error.status === 503 &&
    error.code === 'CAPACITY_BUSY' &&
    retries < MAX_CAPACITY_RETRIES
  );
}

export function previewStatusReachedEnd(status: {
  didJustFinish: boolean;
  playing: boolean;
  duration: number;
  currentTime: number;
}): boolean {
  return (
    status.didJustFinish ||
    (!status.playing && status.duration > 0 && status.currentTime >= status.duration - 0.05)
  );
}

export function autoStopTapIsWithinGrace(elapsedMillis: number): boolean {
  return elapsedMillis >= 0 && elapsedMillis < AUTO_STOP_TAP_GRACE_MS;
}

export function nativeStopFailed(
  completion: Pick<RecordingStatus, 'hasError' | 'mediaServicesDidReset'> | null,
  platform: string,
  stopResult: unknown,
): boolean {
  const androidResult =
    stopResult && typeof stopResult === 'object' ? (stopResult as { url?: unknown }) : null;
  return (
    completion?.hasError === true ||
    completion?.mediaServicesDidReset === true ||
    (platform === 'android' && androidResult !== null && typeof androidResult.url !== 'string')
  );
}

export function completedTakeIsValid(
  stopFailed: boolean,
  uri: string | null,
  durationMillis: number,
  fileIsUsable: boolean,
): boolean {
  return !stopFailed && uri !== null && durationMillis >= 500 && fileIsUsable;
}

export function rejectedStopTakeCanBeAdopted(
  uri: string | null,
  completionHasError: boolean,
  mediaServicesDidReset: boolean,
  recorderIsRecording: boolean,
  fileIsUsable: boolean,
  durationMillis: number,
  lifecycleIsCurrent: boolean,
): boolean {
  return (
    uri !== null &&
    !completionHasError &&
    !mediaServicesDidReset &&
    !recorderIsRecording &&
    fileIsUsable &&
    durationMillis >= 500 &&
    lifecycleIsCurrent
  );
}

export function recoveryDurationForRecordAge(ageMillis: number): number {
  return ageMillis > RECOVERY_RECORD_TTL_MS ? 0 : RECOVERY_LEASE_MS;
}

export function recoveryAbsenceIsConfirmed(confirmations: number, elapsedMillis: number): boolean {
  return confirmations >= NOT_FOUND_CONFIRMATIONS && elapsedMillis >= 10_000;
}

export function canAttemptS3RecoveryPost(
  absenceConfirmed: boolean,
  now: number,
  nextAttemptAt: number,
  stage: PendingAssessment['stage'],
  audioKey: string | undefined,
): boolean {
  return (
    absenceConfirmed &&
    now >= nextAttemptAt &&
    stage === 's3-granted' &&
    typeof audioKey === 'string' &&
    audioKey.length > 0
  );
}

export function recorderControlsAreDisabled(
  disabled: boolean,
  busy: boolean,
  operationActive: boolean,
): boolean {
  return disabled || busy || operationActive;
}

export function recoveryRetryIsVisible(phase: Phase, retryNeeded: boolean): boolean {
  return phase === 'recovering' && retryNeeded;
}

export function capacityRetryDelayMillis(retryAfterSeconds: unknown): number {
  const seconds = Number.isFinite(retryAfterSeconds) ? (retryAfterSeconds as number) : 5;
  return Math.min(CAPACITY_RETRY_MAX_DELAY_MS, Math.max(1_000, Math.round(seconds * 1_000)));
}

export function recoveryRetryDelayMillis(error: unknown): number | null {
  if (
    !(error instanceof ApiError) ||
    (error.status !== 429 &&
      error.status !== 503 &&
      !(error.status === 409 && error.code === 'REQUEST_IN_FLIGHT')) ||
    !Number.isFinite(error.retryAfterSeconds)
  ) {
    return null;
  }
  return Math.min(
    RECOVERY_LEASE_MS,
    Math.max(RECOVERY_POLL_MS, Math.ceil((error.retryAfterSeconds as number) * 1_000)),
  );
}

export function automaticRecoveryPostIsAllowed(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status === 408);
}

export function shouldRunRecordingCacheJanitor(
  platform: string,
  hasRun: boolean,
  audioSessionOwned: boolean,
): boolean {
  return platform !== 'web' && !hasRun && !audioSessionOwned;
}

export function recordingCacheEntryShouldBeDeleted(
  isFile: boolean,
  isLive: boolean,
  name: string,
): boolean {
  return isFile && !isLive && name.startsWith('recording-');
}

export function audioSessionCanBeAcquired(activeOwner: symbol | null, instanceId: symbol): boolean {
  return activeOwner === null || activeOwner === instanceId;
}

export function audioSessionIsOwnedBy(activeOwner: symbol | null, instanceId: symbol): boolean {
  return activeOwner === instanceId;
}

export function recordingStatusIsTerminal(
  status: Pick<RecordingStatus, 'isFinished' | 'hasError' | 'mediaServicesDidReset'>,
): boolean {
  return (
    status.isFinished === true || status.hasError === true || status.mediaServicesDidReset === true
  );
}

export function shouldPublishRecordingStatus(
  suppressed: boolean,
  mounted: boolean,
  unmounting: boolean,
): boolean {
  return !suppressed && mounted && !unmounting;
}

export function shouldMarkRecordingObserved(phase: Phase, isRecording: boolean): boolean {
  return phase === 'recording' && isRecording;
}

export function recordingCompletionCanBeAdopted(
  phase: Phase,
  operationInFlight: boolean,
  mediaServicesDidReset: boolean,
  recorderIsRecording: boolean,
  completionFinished: boolean,
  recordingWasObserved: boolean,
  recorderCanRecord: boolean,
): boolean {
  return (
    phase === 'recording' &&
    !operationInFlight &&
    !mediaServicesDidReset &&
    !recorderIsRecording &&
    (completionFinished || (recordingWasObserved && !recorderCanRecord))
  );
}

export function recordingTerminalFailureShouldInterrupt(
  phase: Phase,
  operationInFlight: boolean,
  completion: Pick<RecordingStatus, 'hasError' | 'mediaServicesDidReset'> | null,
): boolean {
  return (
    phase === 'recording' &&
    !operationInFlight &&
    completion !== null &&
    (completion.hasError === true || completion.mediaServicesDidReset === true)
  );
}

export function recorderOperationIsCurrent(
  operationIsCurrent: boolean,
  lifecycleMatches: boolean,
  identityMatches: boolean,
  contextIsActive: boolean,
): boolean {
  return operationIsCurrent && lifecycleMatches && identityMatches && contextIsActive;
}

export function recorderStateChanged(previous: RecorderState, next: RecorderState): boolean {
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
  const restore = () => configurePlaybackAudioMode();
  try {
    await restore();
    return;
  } catch {
    // Retry once; the second failure propagates to the owning cleanup path.
  }
  await restore();
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
export function waitForForeground(timeoutMs: number): Promise<void> {
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

export function preparedRecorderNeedsWebStart(platform: string, isRecording: boolean): boolean {
  return platform === 'web' && !isRecording;
}

export function recordingCompletionNeedsWait(platform: string): boolean {
  return platform !== 'web';
}

export function operationCanPublish(mounted: boolean, unmounting: boolean): boolean {
  return mounted && !unmounting;
}

export function operationShouldUnlock(
  mounted: boolean,
  unmounting: boolean,
  stillActive: boolean,
  phase: Phase,
  locked: boolean,
): boolean {
  return mounted && !unmounting && !stillActive && phase === 'idle' && locked;
}

export function nextRecordingTakeGeneration(current: number): number {
  return current + 1;
}

export function recordingStartIsBlocked(
  externallyBlocked: boolean,
  recovering: boolean,
  phase: Phase,
): boolean {
  return (
    externallyBlocked ||
    recovering ||
    phase === 'recording' ||
    phase === 'uploading' ||
    phase === 'recovering'
  );
}

export function previewToggleCanStart(operationInFlight: boolean, phase: Phase): boolean {
  return !operationInFlight && phase === 'recorded';
}

export function previewCanPlayAfterRewind(
  operationInFlight: boolean,
  phase: Phase,
  hasPlayer: boolean,
): boolean {
  return !operationInFlight && phase === 'recorded' && hasPlayer;
}

export function deleteRecording(uri: string | null): void {
  if (!uri) return;
  liveRecorderUris.delete(uri);
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

function registerLiveRecorderUri(uri: string | null): void {
  if (!uri) return;
  liveRecorderUris.add(uri);
}

export function recordingFileExists(uri: string): boolean {
  // Web blob URIs carry no file metadata; only native URIs can be verified.
  if (!uri.startsWith('file:')) return true;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Expo's recorder properties cross the native bridge and can throw after the
 * underlying recorder has been released. Cleanup and terminal-status paths
 * must never let that secondary read skip audio-session restoration.
 */
export function readRecorderUri(recorder: Pick<AudioRecorder, 'uri'>): string | null {
  try {
    return recorder.uri;
  } catch {
    return null;
  }
}

/** Fail closed when native state can no longer prove that recording stopped. */
export function readRecorderIsRecording(recorder: Pick<AudioRecorder, 'isRecording'>): boolean {
  try {
    return recorder.isRecording;
  } catch {
    return true;
  }
}

export function completedRecordingIsUsable(uri: string): boolean {
  if (!uri.startsWith('file:')) return true;
  try {
    const file = new File(uri);
    const exists = file.exists;
    const size = file.size;
    return exists && Number.isFinite(size) && (size as number) > 0;
  } catch {
    return false;
  }
}

function cleanupOrphanedRecordingCache(): void {
  if (
    !shouldRunRecordingCacheJanitor(
      Platform.OS,
      recordingCacheJanitorHasRun,
      activeAudioSessionOwner !== null,
    )
  ) {
    return;
  }
  // The first safe mount owns process-start cleanup. Re-running this on later
  // Recorder mounts creates a deletion race with a URI native preparation has
  // created but React has not rendered yet.
  recordingCacheJanitorHasRun = true;
  try {
    for (const directoryName of ['Audio', 'ExpoAudio']) {
      const directory = new Directory(Paths.cache, directoryName);
      if (!directory.exists) continue;
      for (const entry of directory.list()) {
        if (
          recordingCacheEntryShouldBeDeleted(
            entry instanceof File,
            liveRecorderUris.has(entry.uri),
            entry.name,
          )
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
  disabled = false,
  isStartBlocked,
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
  const recordingCompletionRef = useRef<RecordingCompletion | null>(null);
  const recordingStatusWaitersRef = useRef(
    new Set<(completion: RecordingCompletion | null) => void>(),
  );
  const recordingTakeGenerationRef = useRef(0);
  const terminalEventQuarantineRef = useRef<TerminalEventQuarantine[]>([]);
  const currentRecorderRef = useRef<AudioRecorder | null>(null);
  const suppressRecordingStatusRef = useRef(false);
  const [recordingStatusVersion, setRecordingStatusVersion] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  // expo-audio's subscription captures this callback only when the native
  // recorder identity changes, so it must stay referentially stable and read
  // mutable state exclusively through refs.
  const handleRecordingStatus = useCallback((status: RecordingStatus) => {
    if (recordingStatusIsTerminal(status)) {
      const takeGeneration = recordingTakeGenerationRef.current;
      let recorderStillRecording = false;
      try {
        recorderStillRecording = currentRecorderRef.current?.isRecording === true;
      } catch {
        // URI matching below still quarantines ordinary completion events.
      }
      const quarantineIndex = terminalEventQuarantineIndex(
        terminalEventQuarantineRef.current,
        status.url,
        recorderStillRecording,
        takeGeneration,
      );
      if (quarantineIndex >= 0) {
        terminalEventQuarantineRef.current.splice(quarantineIndex, 1);
        return;
      }
      const completion = { status, takeGeneration };
      recordingCompletionRef.current = completion;
      for (const resolve of recordingStatusWaitersRef.current) resolve(completion);
      recordingStatusWaitersRef.current.clear();
      if (
        shouldPublishRecordingStatus(
          suppressRecordingStatusRef.current,
          mountedRef.current,
          unmountingRef.current,
        )
      ) {
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
  const ownedTakeUrisRef = useRef(new Set<string>());
  const uploadControllerRef = useRef<AbortController | null>(null);
  const recoveryControllerRef = useRef<AbortController | null>(null);
  const nativeStopPromiseRef = useRef<Promise<unknown> | null>(null);
  const audioRestorePromiseRef = useRef<Promise<void> | null>(null);
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
  const stopRecordingRef = useRef<(reason?: 'user' | 'auto') => Promise<void>>(
    async () => undefined,
  );
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
  const previewRewindPromiseRef = useRef<Promise<void> | null>(null);
  const previewPlayRequestedRef = useRef(false);
  const webAutoStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveringRef = useRef(false);
  const recoveryAttemptRef = useRef<symbol | null>(null);
  const deferredRecoveryRequestedRef = useRef(false);
  const recoverPendingRef = useRef<() => Promise<void>>(async () => undefined);
  const recoveryGenerationRef = useRef(0);
  const instanceIdRef = useRef(Symbol('recorder-recovery'));
  const callbacksRef = useRef({
    disabled,
    isStartBlocked,
    onError,
    onInteractionLockChange,
    onRateLimited,
    onRecoveryEndpointMismatch,
    onRecoveryUnresolved,
    onResult,
    parseResult,
  });
  const acquireAudioSession = useCallback(() => {
    const instanceId = instanceIdRef.current;
    if (!audioSessionCanBeAcquired(activeAudioSessionOwner, instanceId)) throw new Error();
    if (activeAudioSessionOwner === null) {
      activeAudioSessionOwner = instanceId;
      activeAudioSessionReleasePromise = new Promise((resolve) => {
        resolveActiveAudioSessionRelease = resolve;
      });
    }
  }, []);
  const restoreOwnedAudioMode = useCallback(async (notify = true): Promise<void> => {
    if (audioRestorePromiseRef.current) return audioRestorePromiseRef.current;
    const instanceId = instanceIdRef.current;
    if (!audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) return;
    const promise = (async () => {
      try {
        await restoreAudioMode();
      } catch {
        if (
          notify &&
          recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState)
        ) {
          callbacksRef.current.onError(translate('recorder.errAudioReset'));
        }
      } finally {
        if (audioSessionIsOwnedBy(activeAudioSessionOwner, instanceId)) {
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
  const identityRef = useRef({ ownerId, endpoint, questionId });

  useLayoutEffect(() => {
    callbacksRef.current = {
      disabled,
      isStartBlocked,
      onError,
      onInteractionLockChange,
      onRateLimited,
      onRecoveryEndpointMismatch,
      onRecoveryUnresolved,
      onResult,
      parseResult,
    };
  }, [
    disabled,
    isStartBlocked,
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
    registerLiveRecorderUri(readRecorderUri(recorder));
    // The cache janitor is process-once and runs in this mount's passive phase.
    // Later prepare/record/adoption paths register every URI they create, so a
    // recorder-object replacement has no second janitor consumer to protect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // null until the first notification, so the screen still learns the initial
  // unlocked state.
  const lockedRef = useRef<boolean | null>(null);
  const interactionLockCallbackRef = useRef(onInteractionLockChange);

  const publishOperation = useCallback(() => {
    if (!operationCanPublish(mountedRef.current, unmountingRef.current)) return;
    setOperationActive(true);
    if (lockedRef.current !== true) {
      lockedRef.current = true;
      callbacksRef.current.onInteractionLockChange?.(true);
    }
  }, []);

  const beginOperation = useCallback(
    (supersede = false, publish = true): symbol | null => {
      if (
        !canBeginRecorderOperation(
          supersede,
          operationOwnerRef.current !== null,
          operationsInFlightRef.current.size,
        )
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
        !canResumeRecorderOperation(
          operationOwnerRef.current !== null,
          operationsInFlightRef.current.has(token),
          operationsInFlightRef.current.size,
        )
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
      operationShouldUnlock(
        mountedRef.current,
        unmountingRef.current,
        stillActive,
        phaseRef.current,
        lockedRef.current === true,
      )
    ) {
      lockedRef.current = false;
      callbacksRef.current.onInteractionLockChange?.(false);
    }
    if (!stillActive && deferredRecoveryRequestedRef.current) {
      deferredRecoveryRequestedRef.current = false;
      // A foreground/focus request can arrive while a lifecycle-invalidated
      // operation is still unwinding non-abortable SecureStore work. Retry once
      // after that final token leaves; re-check in the microtask so a same-turn
      // recording/upload transition wins without creating a recovery loop.
      void Promise.resolve().then(() => {
        if (
          shouldRunDeferredRecovery(
            operationsInFlightRef.current.size,
            mountedRef.current,
            unmountingRef.current,
            focusedRef.current,
            AppState.currentState,
            phaseRef.current,
          )
        ) {
          void recoverPendingRef.current();
        }
      });
    }
  }, []);

  const operationIsCurrent = useCallback(
    (token: symbol) => operationOwnerRef.current === token,
    [],
  );

  const operationIsInFlight = useCallback(() => operationsInFlightRef.current.size > 0, []);

  const readCancelPersistence = useCallback(() => cancelPersistenceRef.current, []);

  const startIsBlocked = useCallback(() => {
    if (callbacksRef.current.disabled) return true;
    try {
      return callbacksRef.current.isStartBlocked?.() === true;
    } catch {
      // A sibling mutation guard is a safety boundary; fail closed if its owner
      // disappears while a stale press handler is being delivered.
      return true;
    }
  }, []);

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
    return () => {
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
    previewRewindPromiseRef.current = null;
    previewPlayRequestedRef.current = false;
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
    clearTimeout(webAutoStopTimerRef.current ?? undefined);
    webAutoStopTimerRef.current = null;
  }, []);

  const discardRecording = useCallback((candidateUri?: string | null) => {
    const candidates = new Set(ownedTakeUrisRef.current);
    if (candidateUri) candidates.add(candidateUri);
    ownedTakeUrisRef.current.clear();
    activeUriRef.current = null;
    for (const uri of candidates) deleteRecording(uri);
  }, []);

  const adoptOwnedRecording = useCallback((uri: string) => {
    for (const candidateUri of ownedTakeUrisRef.current) {
      if (candidateUri !== uri) deleteRecording(candidateUri);
    }
    ownedTakeUrisRef.current.clear();
    ownedTakeUrisRef.current.add(uri);
    registerLiveRecorderUri(uri);
    activeUriRef.current = uri;
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
    recoveryAttemptRef.current = null;
    deferredRecoveryRequestedRef.current = false;
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

  const waitForRecordingCompletion = useCallback(
    async (
      takeGeneration: number,
      candidateUri: string | null,
    ): Promise<RecordingStatus | null> => {
      const existing = recordingCompletionRef.current;
      if (existing?.takeGeneration === takeGeneration) return existing.status;
      return new Promise((resolve) => {
        let settled = false;
        const finish = (completion: RecordingCompletion | null) => {
          if (settled || (completion && completion.takeGeneration !== takeGeneration)) return;
          settled = true;
          clearTimeout(timer);
          recordingStatusWaitersRef.current.delete(finish);
          resolve(completion?.status ?? null);
        };
        const timer = setTimeout(() => {
          rememberTerminalEventQuarantine(terminalEventQuarantineRef.current, {
            takeGeneration,
            uri: candidateUri,
          });
          finish(null);
        }, RECORDING_EVENT_WAIT_MS);
        recordingStatusWaitersRef.current.add(finish);
      });
    },
    [],
  );

  const disposePreparedRecording = useCallback(async (): Promise<readonly string[]> => {
    suppressRecordingStatusRef.current = true;
    clearWebAutoStopTimer();
    const takeGeneration = recordingTakeGenerationRef.current;
    const ownedUris = new Set<string>();
    const rememberUri = (uri: string | null | undefined) => {
      if (uri) ownedUris.add(uri);
    };
    const candidateUri = readRecorderUri(recorder);
    rememberUri(candidateUri);
    try {
      // Android's stop path resets even when MediaRecorder.stop throws. Web's
      // inactive MediaRecorder must be started first so its stop event releases
      // getUserMedia tracks. Priming can itself throw, but that must never skip
      // the independent best-effort stop attempt. iOS permits a no-op stop while
      // merely prepared.
      if (preparedRecorderNeedsWebStart(Platform.OS, readRecorderIsRecording(recorder))) {
        try {
          recorder.record();
        } catch {
          // Still attempt stop below: the prepared web stream may own live tracks.
        }
      }
      try {
        await stopNativeRecording();
      } catch {
        // URI deletion and audio-mode restoration still run at the caller.
      }
      if (recordingCompletionNeedsWait(Platform.OS)) {
        const completion = await waitForRecordingCompletion(takeGeneration, candidateUri);
        rememberUri(completion?.url);
      }
    } finally {
      const taggedCompletion = recordingCompletionRef.current;
      if (taggedCompletion?.takeGeneration === takeGeneration) {
        rememberUri(taggedCompletion.status.url);
      }
      rememberUri(readRecorderUri(recorder));
      recordingCompletionRef.current = null;
      suppressRecordingStatusRef.current = false;
    }
    return [...ownedUris];
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
      const takeGeneration = recordingTakeGenerationRef.current;
      let candidateUri = readRecorderUri(recorder);
      let recorderWasRecording = phaseRef.current === 'recording';
      if (!recorderWasRecording) {
        try {
          recorderWasRecording = recorder.isRecording;
        } catch {
          // A released idle recorder has nothing left that can be stopped.
        }
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
          const completion = recordingCompletionNeedsWait(Platform.OS)
            ? await waitForRecordingCompletion(takeGeneration, candidateUri)
            : null;
          const completedUri = completion?.url;
          if (completedUri) {
            candidateUri = completedUri;
          } else {
            candidateUri = readRecorderUri(recorder) ?? candidateUri;
          }
        } catch {
          // Native cleanup continues below.
          if (recordingCompletionNeedsWait(Platform.OS)) {
            await waitForRecordingCompletion(takeGeneration, candidateUri);
          }
        } finally {
          recordingCompletionRef.current = null;
          suppressRecordingStatusRef.current = false;
        }
      }
      discardRecording(candidateUri);
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      autoStoppedAtRef.current = null;
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
      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&
      currentRecorderRef.current === recorder;
    if (activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId) {
      if (phaseRef.current === 'recovering' && mountedRef.current) {
        setRecoveryRetryNeeded(true);
      }
      return;
    }
    if (
      !canStartRecoveryAttempt(
        recoveryAttemptRef.current !== null,
        recoveringRef.current,
        uploadControllerRef.current !== null,
        recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState),
        identityIsCurrent(),
        phaseRef.current,
      )
    ) {
      return;
    }
    if (operationIsInFlight()) {
      // Lifecycle invalidation aborts transports immediately, but SecureStore
      // reads/writes cannot be aborted. Remember this eligible foreground/focus
      // request and run it once the stale operation's final token leaves.
      deferredRecoveryRequestedRef.current = true;
      return;
    }

    const operationToken = beginOperation(false, false);
    if (!operationToken) return;
    const recoveryAttempt = Symbol('recorder-recovery-attempt');
    recoveryAttemptRef.current = recoveryAttempt;
    deferredRecoveryRequestedRef.current = false;
    const finishLoading = () => {
      if (recoveryAttemptRef.current === recoveryAttempt) recoveryAttemptRef.current = null;
      endOperation(operationToken);
    };

    let pending: PendingAssessment | null;
    try {
      pending = await loadPendingAssessment();
    } catch {
      if (
        recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState) &&
        identityIsCurrent() &&
        recoveryPhaseIsEligible(phaseRef.current)
      ) {
        failRecoveryAwaitingRetry(translate('recorder.errRetryInfoUnavailable'));
      }
      finishLoading();
      return;
    }
    const anotherRecoveryOwner = activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;
    if (
      !canContinueRecoveryLoad(
        pending !== null,
        operationIsCurrent(operationToken),
        uploadControllerRef.current !== null,
        recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState),
        identityIsCurrent(),
        phaseRef.current,
        anotherRecoveryOwner,
      )
    ) {
      // An ambiguous submission enters 'recovering' before calling this. If
      // the tombstone is already gone there is nothing to reconcile, so
      // release the controls with an honest message instead of latching
      // 'recovering' with no UI escape short of a remount.
      if (
        !pending &&
        canReleaseMissingRecovery(
          phaseRef.current,
          operationIsCurrent(operationToken),
          uploadControllerRef.current !== null,
          recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState),
          identityIsCurrent(),
          anotherRecoveryOwner,
        )
      ) {
        updatePhase('idle');
        callbacksRef.current.onError(translate('recorder.errNothingToConfirm'));
      }
      const leaseHeldElsewhere = pending !== null && anotherRecoveryOwner;
      finishLoading();
      if (leaseHeldElsewhere) {
        updatePhase('recovering');
        if (mountedRef.current) setRecoveryRetryNeeded(true);
      }
      return;
    }

    // `canContinueRecoveryLoad` proves this, but TypeScript cannot carry a
    // nullability predicate through the helper's boolean result.
    if (pending === null) {
      finishLoading();
      return;
    }

    // The answer mode is session-scoped, while the interrupted handoff is
    // durable. Restore the saved practice endpoint before taking ownership so
    // the remounted Recorder uses the matching parser and can display the
    // replay instead of discarding a valid response as a route mismatch.
    const endpointMismatch =
      pending.ownerId === ownerId &&
      pending.questionId === questionId &&
      pending.endpoint !== endpoint;
    if (endpointMismatch) {
      let endpointRestored: boolean;
      try {
        endpointRestored =
          callbacksRef.current.onRecoveryEndpointMismatch?.(pending.endpoint) === true;
      } catch {
        const shouldReport =
          recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState) &&
          identityIsCurrent() &&
          recoveryPhaseIsEligible(phaseRef.current);
        // This callback runs before the live recovery try/finally. Release the
        // storage-read token explicitly so a screen callback can never wedge all
        // later Recorder operations or retain an implicit recovery attempt.
        finishLoading();
        if (shouldReport) {
          failRecoveryAwaitingRetry(translate('recorder.errRecoveryMismatch'));
        }
        return;
      }
      if (endpointRestored) {
        finishLoading();
        return;
      }
      // The endpoint callback belongs to the screen and is therefore a
      // re-entrancy boundary: a rejecting callback may still blur, navigate,
      // replace the native recorder, or otherwise invalidate this load. Recheck
      // every ownership dimension before this stale continuation can acquire the
      // global recovery lease or create a transport after lifecycle abort ran.
      const anotherOwnerAfterCallback =
        activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId;
      if (
        !canContinueRecoveryLoad(
          true,
          operationIsCurrent(operationToken),
          uploadControllerRef.current !== null,
          recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState),
          identityIsCurrent(),
          phaseRef.current,
          anotherOwnerAfterCallback,
        )
      ) {
        finishLoading();
        return;
      }
    }

    activeRecoveryOwner = instanceId;
    recoveringRef.current = true;
    publishOperation();
    const recoveryController = new AbortController();
    recoveryControllerRef.current = recoveryController;
    // A live recovery loop now owns the recovering phase; hide the stale
    // failure's Try Again affordance.
    if (mountedRef.current) setRecoveryRetryNeeded(false);
    const generation = ++recoveryGenerationRef.current;
    const isCurrent = () =>
      recoveryAttemptIsCurrent(
        recoveryGenerationRef.current === generation,
        recoveringRef.current,
        activeRecoveryOwner === instanceId,
        operationIsCurrent(operationToken),
        recoveryController.signal.aborted,
        identityIsCurrent(),
        recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState),
      );
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
            throw new Error();
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
      const recoveryDuration = recoveryDurationForRecordAge(recoveryStartedAt - pending.createdAt);
      // Every ordinary iteration waits at least RECOVERY_POLL_MS; the only
      // immediate continue is the one bounded fresh-key re-upload. Keep an
      // independent count outside the loop body so a future control-flow bug
      // can neither spin synchronously nor flood status requests while a fake
      // or stalled monotonic clock remains unchanged.
      let recoveryPollsRemaining =
        Math.ceil(recoveryDuration / RECOVERY_POLL_MS) + MAX_S3_REUPLOADS + 2;
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
            assessmentEndpoint: pending.endpoint,
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
      while (
        recoveryPollsRemaining-- > 0 &&
        (firstStatusRead || monotonicNow() - recoveryStartedMonotonic <= recoveryDuration)
      ) {
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
                  throw new Error();
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
                  throw new Error();
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
                throw new Error();
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
            const absenceConfirmed = recoveryAbsenceIsConfirmed(
              notFoundCount,
              monotonicNow() - recoveryStartedMonotonic,
            );
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
              canAttemptS3RecoveryPost(
                absenceConfirmed,
                monotonicNow(),
                nextS3ResubmissionAt,
                pending.stage,
                currentAudioKey,
              )
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
                  await refundPendingAssessmentRecoveryPost(pending.requestId).catch(() => {});
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
                    throw new Error();
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
                  await refundPendingAssessmentRecoveryPost(pending.requestId).catch(() => {});
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
                  const retryDelay = recoveryRetryDelayMillis(retryError);
                  if (retryDelay !== null) nextPollDelayMs = retryDelay;
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
                    let refunded: boolean;
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
            await finishUnresolved(translate('error.upgradeRequired'), true);
            return;
          } else {
            const retryDelay = recoveryRetryDelayMillis(error);
            if (retryDelay !== null) nextPollDelayMs = retryDelay;
          }
          // Offline, timeout, and transient server errors retain the durable
          // request UUID until the five-minute ownership lease expires.
        }
        try {
          await sleepAbortable(nextPollDelayMs, recoveryController.signal);
        } catch {
          // Abort invalidates isCurrent(); the single guard below owns exit.
        }
        if (!isCurrent()) return;
      }
      await finishUnresolved(translate('recorder.errRecoveryExpired'), false);
    } finally {
      recoveryAttemptRef.current = null;
      recoveringRef.current = false;
      if (activeRecoveryOwner === instanceId) activeRecoveryOwner = null;
      recoveryControllerRef.current = null;
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

  useLayoutEffect(() => {
    recoverPendingRef.current = recoverPending;
  }, [recoverPending]);

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
            const identityMatches = assessmentIdentityMatches(
              deferredPermission,
              identityRef.current.ownerId,
              identityRef.current.endpoint,
              identityRef.current.questionId,
            );
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
  const hapticPhaseRef = useRef<Phase>(phase);
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
    const pulseSteps = [
      { toValue: 1.3, duration: 550, useNativeDriver: true },
      { toValue: 1, duration: 550, useNativeDriver: true },
    ];
    if (
      pulseSteps.length !== 2 ||
      pulseSteps.some(
        (step) =>
          !Number.isFinite(step.toValue) ||
          !Number.isFinite(step.duration) ||
          step.duration <= 0 ||
          step.useNativeDriver !== true,
      )
    ) {
      pulse.setValue(1);
      return;
    }
    const animations = pulseSteps.map((step) => Animated.timing(pulse, step));
    if (animations.length === 0) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(Animated.sequence(animations));
    loop.start();
    return () => loop.stop();
  }, [phase, pulse, reduceMotion]);

  const adoptCompletedRecording = useCallback(
    (uri: string, durationMillis: number) => {
      const safeDurationMillis = Number.isFinite(durationMillis) ? durationMillis : 0;
      clearWebAutoStopTimer();
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      if (safeDurationMillis < 500 || !completedRecordingIsUsable(uri)) {
        discardRecording(uri);
        updatePhase('idle');
        callbacksRef.current.onError(
          translate(safeDurationMillis < 500 ? 'recorder.errTooShort' : 'recorder.errSaveFailed'),
        );
        void restoreOwnedAudioMode();
        return;
      }
      adoptOwnedRecording(uri);
      autoStoppedAtRef.current = monotonicNow();
      setRecordedDurationMillis(Math.min(MAX_RECORDING_SECONDS * 1000, safeDurationMillis));
      updatePhase('recorded');
      void restoreOwnedAudioMode();
    },
    [
      adoptOwnedRecording,
      clearWebAutoStopTimer,
      discardRecording,
      restoreOwnedAudioMode,
      updatePhase,
    ],
  );

  // Native completion/error/reset is authoritative. The guarded polling
  // fallback remains for SDK implementations that omit the event, but a paused
  // recorder (`canRecord=true`) can never be mistaken for an auto-stop.
  useEffect(() => {
    const taggedCompletion = recordingCompletionRef.current;
    const completion =
      taggedCompletion?.takeGeneration === recordingTakeGenerationRef.current
        ? taggedCompletion.status
        : null;
    if (
      recordingTerminalFailureShouldInterrupt(phaseRef.current, operationIsInFlight(), completion)
    ) {
      recordingCompletionRef.current = null;
      recordingInterruptionHandledRef.current = true;
      callbacksRef.current.onError(translate('recorder.errDeviceInterrupted'));
      void stopForLifecycle();
      return;
    }
    if (shouldMarkRecordingObserved(phaseRef.current, recorderState.isRecording)) {
      hasObservedRecordingRef.current = true;
      return;
    }
    if (
      recordingCompletionCanBeAdopted(
        phaseRef.current,
        operationIsInFlight(),
        recorderState.mediaServicesDidReset,
        recorderState.isRecording,
        completion?.isFinished === true,
        hasObservedRecordingRef.current,
        recorderState.canRecord,
      )
    ) {
      const uri = completion?.url ?? readRecorderUri(recorder) ?? recorderState.url;
      if (uri) {
        const recordingStartedAt = recordingStartedAtRef.current;
        const rawWallDuration =
          recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;
        const wallDuration = Number.isFinite(rawWallDuration) ? Math.max(0, rawWallDuration) : 0;
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
    recorder,
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
    if (recordingStartIsBlocked(startIsBlocked(), recoveringRef.current, phaseRef.current)) {
      return;
    }
    const operationToken = beginOperation();
    if (!operationToken) return;
    let lifecycleEpoch = lifecycleEpochRef.current;
    const startIdentity = { ownerId, endpoint, questionId, recorder };
    const identityIsCurrent = () =>
      assessmentIdentityMatches(
        identityRef.current,
        startIdentity.ownerId,
        startIdentity.endpoint,
        startIdentity.questionId,
      ) && currentRecorderRef.current === startIdentity.recorder;
    const isCurrentLifecycle = () =>
      recorderOperationIsCurrent(
        operationIsCurrent(operationToken),
        lifecycleEpoch === lifecycleEpochRef.current,
        identityIsCurrent(),
        recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState),
      );
    const previousUri = activeUriRef.current;
    const deleteOwnedCandidates = (...candidateUris: (string | null | undefined)[]) => {
      for (const candidateUri of new Set(candidateUris)) {
        if (candidateUri && candidateUri !== previousUri) {
          ownedTakeUrisRef.current.delete(candidateUri);
          deleteRecording(candidateUri);
        }
      }
    };
    let prepared = false;
    let preparedCandidateUri: string | null = null;
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
      if (getSubmittedRecordingPlaybackActive()) await stopActivePlayback();
      await audioRestorePromiseRef.current;
      await activeAudioSessionReleasePromise;
      if (!isCurrentLifecycle()) return;
      acquireAudioSession();
      await configureRecordingAudioMode();
      if (!isCurrentLifecycle()) {
        await restoreOwnedAudioMode(false);
        return;
      }
      recordingTakeGenerationRef.current = nextRecordingTakeGeneration(
        recordingTakeGenerationRef.current,
      );
      recordingCompletionRef.current = null;
      await recorder.prepareToRecordAsync();
      prepared = true;
      preparedCandidateUri = readRecorderUri(recorder);
      registerLiveRecorderUri(preparedCandidateUri);
      if (preparedCandidateUri) ownedTakeUrisRef.current.add(preparedCandidateUri);
      if (!isCurrentLifecycle()) {
        const disposedUris = await disposePreparedRecording();
        deleteOwnedCandidates(preparedCandidateUri, ...disposedUris);
        await restoreOwnedAudioMode(false);
        return;
      }
      recordingInterruptionHandledRef.current = false;
      recordingStartedAtRef.current = monotonicNow();
      hasObservedRecordingRef.current = false;
      autoStoppedAtRef.current = null;
      clearWebAutoStopTimer();
      if (Platform.OS === 'web') {
        recorder.record();
        webAutoStopTimerRef.current = setTimeout(() => {
          webAutoStopTimerRef.current = null;
          void stopRecordingRef.current('auto');
        }, MAX_RECORDING_SECONDS * 1_000);
      } else {
        recorder.record({ forDuration: MAX_RECORDING_SECONDS });
      }
      const liveRecordingUri = readRecorderUri(recorder);
      registerLiveRecorderUri(liveRecordingUri);
      if (liveRecordingUri) ownedTakeUrisRef.current.add(liveRecordingUri);
      // A native/web implementation may rotate its cache URI when recording
      // actually begins. Once the live URI is known, the distinct prepared
      // candidate is obsolete: delete it now so it cannot remain pinned in the
      // process-wide live-URI set or leak on disk.
      if (liveRecordingUri) {
        for (const candidateUri of [...ownedTakeUrisRef.current]) {
          if (candidateUri !== liveRecordingUri) {
            ownedTakeUrisRef.current.delete(candidateUri);
            deleteRecording(candidateUri);
          }
        }
        ownedTakeUrisRef.current.add(liveRecordingUri);
      }
      prepared = false;
      if (!liveRecordingUri && previousUri && previousUri !== preparedCandidateUri) {
        ownedTakeUrisRef.current.delete(previousUri);
        deleteRecording(previousUri);
      }
      activeUriRef.current = null;
      updatePhase('recording');
    } catch {
      if (prepared) {
        const disposedUris = await disposePreparedRecording();
        deleteOwnedCandidates(preparedCandidateUri, ...disposedUris);
      } else {
        deleteOwnedCandidates(readRecorderUri(recorder));
      }
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
  useLayoutEffect(() => {
    startRecordingRef.current = startRecording;
  });

  const stopRecording = async (reason: 'user' | 'auto' = 'user') => {
    if (phaseRef.current !== 'recording') return;
    const operationToken = beginOperation();
    if (!operationToken) return;
    clearWebAutoStopTimer();
    const takeGeneration = recordingTakeGenerationRef.current;
    const stopCandidateUri = readRecorderUri(recorder);
    // Every lifecycle-epoch bump first supersedes the active operation, so
    // operation-token currency already proves the epoch is current here.
    const isCurrentLifecycle = () =>
      operationIsCurrent(operationToken) &&
      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&
      currentRecorderRef.current === recorder &&
      recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState);
    const recordingStartedAt = recordingStartedAtRef.current;
    const rawWallDuration = recordingStartedAt !== null ? monotonicNow() - recordingStartedAt : 0;
    const durationBeforeStop = Math.max(
      Number.isFinite(recorderState.durationMillis) ? Math.max(0, recorderState.durationMillis) : 0,
      Number.isFinite(rawWallDuration) ? Math.max(0, rawWallDuration) : 0,
    );
    try {
      const stopResult = await stopNativeRecording();
      const taggedCompletion = recordingCompletionRef.current;
      const completion =
        taggedCompletion?.takeGeneration === takeGeneration
          ? taggedCompletion.status
          : !recordingCompletionNeedsWait(Platform.OS)
            ? null
            : await waitForRecordingCompletion(
                takeGeneration,
                stopCandidateUri ?? readRecorderUri(recorder),
              );
      recordingCompletionRef.current = null;
      const stopFailed = nativeStopFailed(completion, Platform.OS, stopResult);
      const uri = completion?.url ?? readRecorderUri(recorder);
      if (!isCurrentLifecycle()) {
        discardRecording(uri);
        return;
      }
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);
      if (!completedTakeIsValid(stopFailed, uri, durationBeforeStop, fileIsUsable)) {
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
      adoptOwnedRecording(uri!);
      if (reason === 'auto') autoStoppedAtRef.current = monotonicNow();
      setRecordedDurationMillis(Math.min(MAX_RECORDING_SECONDS * 1_000, durationBeforeStop));
      updatePhase('recorded');
    } catch {
      // recorder.stop() can reject when the 2:00 auto-stop already finalized
      // this take natively. A completed file is a valid answer; keep it, and
      // only discard when no saved recording actually exists.
      const taggedCompletion = recordingCompletionRef.current;
      const completion =
        taggedCompletion?.takeGeneration === takeGeneration ? taggedCompletion.status : null;
      recordingCompletionRef.current = null;
      const uri = completion?.url ?? readRecorderUri(recorder);
      const completionHasError = completion?.hasError === true;
      const mediaServicesDidReset = completion?.mediaServicesDidReset === true;
      const recorderIsRecording = readRecorderIsRecording(recorder);
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      const fileIsUsable = uri !== null && completedRecordingIsUsable(uri);
      if (
        rejectedStopTakeCanBeAdopted(
          uri,
          completionHasError,
          mediaServicesDidReset,
          recorderIsRecording,
          fileIsUsable,
          durationBeforeStop,
          isCurrentLifecycle(),
        )
      ) {
        adoptOwnedRecording(uri!);
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
  useLayoutEffect(() => {
    stopRecordingRef.current = stopRecording;
  });

  const submit = async () => {
    if (phaseRef.current !== 'recorded') return;
    const pendingGeneration = capturePendingAssessmentGeneration();
    const operationToken = beginOperation();
    if (!operationToken) return;
    const uri = activeUriRef.current ?? readRecorderUri(recorder);
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
    // Every lifecycle-epoch bump first installs a superseding operation token,
    // so token currency already proves the epoch cannot have changed.
    const isCurrentSubmission = () =>
      operationIsCurrent(operationToken) &&
      assessmentIdentityMatches(identityRef.current, ownerId, endpoint, questionId) &&
      currentRecorderRef.current === recorder &&
      recorderContextIsActive(mountedRef.current, focusedRef.current, AppState.currentState);
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
      const pending: PendingAssessment = {
        ownerId,
        endpoint,
        questionId,
        requestId,
        createdAt: Date.now(),
        stage: 'prepared',
      };
      let authoritativePending: PendingAssessment | null;
      try {
        authoritativePending = await ensurePendingAssessment(pending, pendingGeneration);
        if (!canContinueSubmission()) return;
      } catch {
        if (!canContinueSubmission()) return;
        requestIdRef.current = null;
        updatePhase('recorded');
        callbacksRef.current.onError(translate('recorder.errInfoNotSavedNotUploaded'));
        return;
      }
      if (!authoritativePending) {
        requestIdRef.current = null;
        updatePhase('recorded');
        callbacksRef.current.onError(translate('recorder.errInfoNotSavedNotUploaded'));
        return;
      }
      if (
        !pendingAssessmentCanUpload(authoritativePending, ownerId, endpoint, questionId, requestId)
      ) {
        recoverAfterUpload = true;
        updatePhase('recovering');
        return;
      }
      // Ask the API where the audio goes: a size-constrained S3 POST form in production,
      // direct multipart to the API in local dev. The assessment requestId is
      // claimed by the answer endpoint either way, so the idempotency and
      // recovery flow below is identical for both paths.
      const descriptor = await resolveAudioFileDescriptor(uri, { signal: controller.signal });
      if (!canContinueSubmission()) return;
      const grant = await apiRequestAudioUpload(descriptor.type, ownerId, {
        assessmentEndpoint: endpoint,
        signal: controller.signal,
      });
      if (!canContinueSubmission()) return;
      let raw: unknown;
      // Only CAPACITY_BUSY is guaranteed to reject before paid work. It asks
      // clients to retry the SAME logical submission after Retry-After. Other
      // 503s (including pool saturation during persistence) can follow provider
      // spend and therefore require polling or an explicit learner retry.
      const postAssessment = async (): Promise<unknown> => {
        let lastCapacityError: unknown;
        // The iteration source is a fixed tuple rather than a mutable counter.
        // That provides an independent hard bound even if retry classification
        // or bookkeeping regresses, and prevents a malformed response from
        // turning this paid-work path into a tight infinite loop.
        for (const capacityRetries of CAPACITY_RETRY_ATTEMPTS) {
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
            if (!shouldRetryCapacityFailure(error, controller.signal.aborted, capacityRetries)) {
              throw error;
            }
            lastCapacityError = error;
            // A received 503 is a definite pre-commit refusal. While waiting
            // for its Retry-After there is no assessment request in flight, so
            // Cancel can return the take immediately without reconciliation.
            assessmentPostedRef.current = false;
            const delayMs = capacityRetryDelayMillis(error.retryAfterSeconds);
            await sleepAbortable(delayMs, controller.signal);
            if (!canContinueSubmission()) throw error;
          }
        }
        // Production reaches this only if the retry predicate and the fixed
        // attempt budget drift apart. Fail closed rather than returning an
        // undefined assessment response or continuing forever.
        throw lastCapacityError ?? new Error();
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
            throw new Error();
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
          throw new Error();
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
        const automaticRecoveryPostAllowed = automaticRecoveryPostIsAllowed(error);
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
        mountedRef.current
      ) {
        updatePhase('recovering');
      }
      // This submission owns the only live operation token, so no newer
      // submission can replace its cancel marker before this finally runs.
      cancelPersistenceRef.current = null;
      endOperation(operationToken);
      if (recoverAfterUpload) void recoverPending();
    }
  };

  const isRecording = phase === 'recording';

  const handleMicPress = () => {
    if (isRecording) return stopRecording();
    if (startIsBlocked()) return Promise.resolve();
    // The 2:00 native auto-stop can flip the phase to 'recorded' just as the
    // learner taps to stop; treating that tap as a re-record would destroy
    // the take they just captured. Ignore mic presses briefly after an
    // auto-stop; the explicit Re-record action stays available.
    if (
      autoStoppedAtRef.current !== null &&
      autoStopTapIsWithinGrace(monotonicNow() - autoStoppedAtRef.current)
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

  const togglePreview = async () => {
    if (!previewToggleCanStart(operationIsInFlight(), phaseRef.current)) return;
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
    const pendingRewind = previewRewindPromiseRef.current;
    if (pendingRewind) {
      const pendingPlayer = previewPlayerRef.current;
      if (previewPlayRequestedRef.current) return;
      previewPlayRequestedRef.current = true;
      try {
        await pendingRewind;
      } catch {
        // The rewind owner releases the player and reports the failure once.
        return;
      } finally {
        previewPlayRequestedRef.current = false;
      }
      if (
        previewPlayerRef.current !== pendingPlayer ||
        !previewCanPlayAfterRewind(
          operationIsInFlight(),
          phaseRef.current,
          previewPlayerRef.current !== null,
        )
      ) {
        return;
      }
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
          if (previewPlayerRef.current !== player) return;
          if (status.error) {
            releasePreviewPlayer();
            callbacksRef.current.onError(translate('recorder.errPlayFailed'));
            return;
          }
          const reachedEnd = previewStatusReachedEnd(status);
          if (!reachedEnd) return;
          // Rewind so Play starts the take from the beginning next time.
          if (previewRewindPromiseRef.current) return;
          let rewind: Promise<void>;
          try {
            rewind = Promise.resolve(player.seekTo(0));
          } catch {
            if (previewPlayerRef.current === player) {
              releasePreviewPlayer();
              callbacksRef.current.onError(translate('recorder.errPlayFailed'));
            }
            return;
          }
          previewRewindPromiseRef.current = rewind;
          void rewind.then(
            () => {
              if (previewRewindPromiseRef.current === rewind) {
                previewRewindPromiseRef.current = null;
              }
            },
            () => {
              if (
                previewRewindPromiseRef.current === rewind &&
                previewPlayerRef.current === player
              ) {
                previewRewindPromiseRef.current = null;
                releasePreviewPlayer();
                callbacksRef.current.onError(translate('recorder.errPlayFailed'));
              }
            },
          );
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
    const player = previewPlayerRef.current;
    if (!player) return;
    try {
      player.play();
      setPreviewPlaying(true);
    } catch {
      releasePreviewPlayer();
      callbacksRef.current.onError(translate('recorder.errPlayFailed'));
    }
  };

  const busy = phase === 'uploading' || phase === 'recovering';
  const controlsDisabled = recorderControlsAreDisabled(disabled, busy, operationActive);
  const reviewActionsDisabled = recorderControlsAreDisabled(disabled, false, operationActive);
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
              disabled={disabled}
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
          accessibilityState={{ disabled: controlsDisabled }}
          disabled={controlsDisabled}
          onPress={handleMicPress}
          style={({ pressed }) => [
            styles.recordButton,
            (controlsDisabled || pressed) && styles.recordButtonDimmed,
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
              disabled={disabled}
              style={styles.cancelButton}
            />
          )}
          {recoveryRetryIsVisible(phase, recoveryRetryNeeded) && (
            <Button
              title={t('common.tryAgain')}
              variant="secondary"
              size="sm"
              onPress={retryRecovery}
              disabled={disabled}
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
            disabled={reviewActionsDisabled}
          />
          <Button
            title={t('recorder.submit')}
            onPress={() => void submit()}
            disabled={reviewActionsDisabled}
          />
          <Button
            title={t('recorder.rerecord')}
            variant="quiet"
            onPress={() => void startRecording()}
            disabled={reviewActionsDisabled}
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
