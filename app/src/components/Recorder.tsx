import { File } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  AppState,
  Linking,
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
  useAudioRecorderState,
  type AudioPlayer,
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
  loadPendingAssessment,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
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

const MAX_RECORDING_SECONDS = 120;
const AUTO_STOP_TAP_GRACE_MS = 1_000;
const RECOVERY_LEASE_MS = 5 * 60_000;
const RECOVERY_RECORD_TTL_MS = 25 * 60 * 60_000;
const RECOVERY_REQUEST_TIMEOUT_MS = 5_000;
const MAX_CAPACITY_RETRIES = 3;
const CAPACITY_RETRY_MAX_DELAY_MS = 30_000;
const RECOVERY_POLL_MS = 2_000;
const NOT_FOUND_CONFIRMATIONS = 3;
const MAX_S3_RESUBMISSIONS = 3;
const S3_RESUBMIT_BASE_BACKOFF_MS = 5_000;
const UPLOAD_STAGE_LISTENING_MS = 8_000;
const UPLOAD_STAGE_ALMOST_DONE_MS = 25_000;
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
  const totalSeconds = Math.max(0, Math.floor(durationMillis / 1000));
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

async function restoreAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    allowsBackgroundRecording: false,
    shouldPlayInBackground: false,
  });
}

function deleteRecording(uri: string | null): void {
  if (!uri) return;
  if (uri.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
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
  const recorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 200);
  const t = useT();
  const theme = useTheme();
  const styles = themedStyles(theme);

  const [phase, setPhase] = useState<Phase>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [recordedDurationMillis, setRecordedDurationMillis] = useState(0);
  const [waitElapsedMillis, setWaitElapsedMillis] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const pulse = useAnimatedValue(1);
  const phaseRef = useRef<Phase>('idle');
  const operationRef = useRef(false);
  const activeUriRef = useRef<string | null>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const nativeStopPromiseRef = useRef<Promise<void> | null>(null);
  const lifecycleStopPromiseRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const focusedRef = useRef(false);
  const lifecycleEpochRef = useRef(0);
  const recordingStartedAtRef = useRef<number | null>(null);
  const hasObservedRecordingRef = useRef(false);
  const autoStoppedAtRef = useRef<number | null>(null);
  const previousIdentityRef = useRef({ ownerId, endpoint, questionId });
  const requestIdRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);
  const assessmentPostedRef = useRef(false);
  const waitStartedAtRef = useRef<number | null>(null);
  const previewPlayerRef = useRef<AudioPlayer | null>(null);
  const previewListenerRef = useRef<{ remove: () => void } | null>(null);
  const recoveringRef = useRef(false);
  const recoveryGenerationRef = useRef(0);
  const instanceIdRef = useRef(Symbol('recorder-recovery'));
  const callbacksRef = useRef({
    onError,
    onRateLimited,
    onRecoveryEndpointMismatch,
    onRecoveryUnresolved,
    onResult,
    parseResult,
  });
  const identityRef = useRef({ ownerId, endpoint, questionId });

  useLayoutEffect(() => {
    callbacksRef.current = {
      onError,
      onRateLimited,
      onRecoveryEndpointMismatch,
      onRecoveryUnresolved,
      onResult,
      parseResult,
    };
  }, [
    onError,
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
    onInteractionLockChange?.(phase !== 'idle');
  }, [onInteractionLockChange, phase]);

  useEffect(
    () => () => {
      onInteractionLockChange?.(false);
    },
    [onInteractionLockChange],
  );

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    // Each wait (upload or recovery) shows its own elapsed clock from zero.
    waitStartedAtRef.current = next === 'uploading' || next === 'recovering' ? Date.now() : null;
    if (mountedRef.current) {
      setPhase(next);
      setWaitElapsedMillis(0);
    }
  }, []);

  const releasePreviewPlayer = useCallback(() => {
    previewListenerRef.current?.remove();
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
    if (activeRecoveryOwner === instanceIdRef.current) {
      activeRecoveryOwner = null;
    }
  }, []);

  const stopNativeRecording = useCallback(() => {
    if (nativeStopPromiseRef.current) return nativeStopPromiseRef.current;
    const promise = recorder.stop().finally(() => {
      if (nativeStopPromiseRef.current === promise) {
        nativeStopPromiseRef.current = null;
      }
    });
    nativeStopPromiseRef.current = promise;
    return promise;
  }, [recorder]);

  const stopForLifecycle = useCallback(() => {
    if (lifecycleStopPromiseRef.current) {
      return lifecycleStopPromiseRef.current;
    }
    const promise = (async () => {
      lifecycleEpochRef.current += 1;
      invalidateRecovery();
      operationRef.current = true;
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
      let candidateUri = recorder.uri;
      if (recorder.isRecording || phaseRef.current === 'recording') {
        try {
          await stopNativeRecording();
          candidateUri = recorder.uri ?? candidateUri;
        } catch {
          // Native cleanup continues below.
        }
      }
      discardRecording(candidateUri);
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      autoStoppedAtRef.current = null;
      operationRef.current = false;
      if (mountedRef.current) setRecordedDurationMillis(0);
      updatePhase('idle');
      await restoreAudioMode().catch(() => undefined);
    })().finally(() => {
      if (lifecycleStopPromiseRef.current === promise) {
        lifecycleStopPromiseRef.current = null;
      }
    });
    lifecycleStopPromiseRef.current = promise;
    return promise;
  }, [discardRecording, invalidateRecovery, recorder, stopNativeRecording, updatePhase]);

  const recoverPending = useCallback(async () => {
    const instanceId = instanceIdRef.current;
    const identityIsCurrent = () =>
      identityRef.current.ownerId === ownerId &&
      identityRef.current.endpoint === endpoint &&
      identityRef.current.questionId === questionId;
    if (
      recoveringRef.current ||
      operationRef.current ||
      uploadControllerRef.current !== null ||
      !mountedRef.current ||
      !focusedRef.current ||
      AppState.currentState !== 'active' ||
      !identityIsCurrent() ||
      (phaseRef.current !== 'idle' && phaseRef.current !== 'recovering') ||
      (activeRecoveryOwner !== null && activeRecoveryOwner !== instanceId)
    ) {
      return;
    }

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
        updatePhase('recovering');
        callbacksRef.current.onError(translate('recorder.errRetryInfoUnavailable'));
      }
      return;
    }
    if (
      !pending ||
      operationRef.current ||
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
        !operationRef.current &&
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
      return;
    }

    activeRecoveryOwner = instanceId;
    recoveringRef.current = true;
    operationRef.current = true;
    const generation = ++recoveryGenerationRef.current;
    const isCurrent = () =>
      recoveryGenerationRef.current === generation &&
      recoveringRef.current &&
      activeRecoveryOwner === instanceId &&
      identityIsCurrent() &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    updatePhase('recovering');
    try {
      if (pending.ownerId !== ownerId) {
        const cleared = await clearRequestTracking(pending.requestId);
        if (isCurrent()) {
          updatePhase(cleared ? 'idle' : 'recovering');
          if (!cleared) {
            callbacksRef.current.onError(translate('recorder.errRetryInfoClear'));
          }
        }
        return;
      }

      if (pending.stage === 'reconcile') {
        if (!isCurrent()) return;
        callbacksRef.current.onRecoveryUnresolved();
        if (!isCurrent()) return;
        updatePhase('idle');
        void clearRequestTracking(pending.requestId);
        return;
      }

      const routeMatches = pending.endpoint === endpoint && pending.questionId === questionId;
      if (pending.stage === 'prepared') {
        if (!isCurrent()) return;
        const cleared = await clearRequestTracking(pending.requestId);
        if (!isCurrent()) return;
        updatePhase(
          cleared ? (activeUriRef.current && routeMatches ? 'recorded' : 'idle') : 'recovering',
        );
        if (!cleared) {
          callbacksRef.current.onError(translate('recorder.errRetryInfoClear'));
        }
        return;
      }
      const finishUnresolved = async (message: string, allowRecordedRetry: boolean) => {
        if (!isCurrent()) return;
        try {
          if (!(await markPendingAssessmentForReconciliation(pending.requestId))) {
            throw new Error('Pending assessment disappeared');
          }
        } catch {
          if (!isCurrent()) return;
          updatePhase('recovering');
          callbacksRef.current.onError(translate('recorder.errRetryInfoUpdate'));
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
        callbacksRef.current.onError(message);
        void clearRequestTracking(pending.requestId);
      };

      let notFoundCount = 0;
      let resubmissionConflictPending = false;
      const recoveryStartedAt = Date.now();
      // Every restart gets one bounded reconciliation window. `createdAt`
      // describes the original handoff, not the current recovery attempt; an
      // older record may still have a server replay available for 24 hours.
      // Beyond that retention horizon we still perform one final status read.
      const recoveryDeadline =
        recoveryStartedAt - pending.createdAt > RECOVERY_RECORD_TTL_MS
          ? recoveryStartedAt
          : recoveryStartedAt + RECOVERY_LEASE_MS;
      let firstStatusRead = true;
      let s3ResubmissionAttempts = 0;
      let nextS3ResubmissionAt = 0;
      while (firstStatusRead || Date.now() <= recoveryDeadline) {
        firstStatusRead = false;
        try {
          const status = await apiFetch<unknown>(
            `/assessments/${encodeURIComponent(pending.requestId)}`,
            { timeoutMs: RECOVERY_REQUEST_TIMEOUT_MS },
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
                  updatePhase('recovering');
                  callbacksRef.current.onError(translate('recorder.errRetryInfoUpdate'));
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
                  updatePhase('recovering');
                  callbacksRef.current.onError(translate('recorder.errRetryInfoUpdate'));
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
                updatePhase('recovering');
                callbacksRef.current.onError(translate('recorder.errResultSafeRetryInfo'));
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
              notFoundCount >= NOT_FOUND_CONFIRMATIONS && Date.now() - recoveryStartedAt >= 10_000;
            // A lone 404 can race the original assessment POST before its
            // idempotency row exists. Only reuse the already-uploaded key after
            // repeated absence over ten seconds. Ambiguous transport failures
            // get a small, bounded exponential retry budget; every retry keeps
            // the same request UUID and object key.
            if (
              absenceConfirmed &&
              s3ResubmissionAttempts < MAX_S3_RESUBMISSIONS &&
              Date.now() >= nextS3ResubmissionAt &&
              pending.stage === 's3-granted' &&
              pending.audioKey
            ) {
              s3ResubmissionAttempts += 1;
              try {
                const raw = await apiFetch<unknown>(pending.endpoint, {
                  method: 'POST',
                  body: {
                    questionId: pending.questionId,
                    requestId: pending.requestId,
                    audioKey: pending.audioKey,
                  },
                  timeoutMs: AUDIO_TIMEOUT_MS,
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
                    updatePhase('recovering');
                    callbacksRef.current.onError(translate('recorder.errResultSafeRetryInfo'));
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
                if (
                  retryError instanceof ApiError &&
                  [400, 403, 404, 413, 415, 422].includes(retryError.status)
                ) {
                  await finishUnresolved(translate('recorder.errUploadGone'), true);
                  return;
                }
                // An ambiguous failure may have committed. Continue polling the
                // same durable request before retrying the identical handoff.
                nextS3ResubmissionAt =
                  Date.now() + S3_RESUBMIT_BASE_BACKOFF_MS * 2 ** (s3ResubmissionAttempts - 1);
              }
            }
            if (absenceConfirmed && pending.stage !== 's3-granted') {
              await finishUnresolved(translate('recorder.errUploadUnconfirmed'), false);
              return;
            }
          } else if (error instanceof ApiError && error.status === 401) {
            return;
          }
          // Offline, timeout, and transient server errors retain the durable
          // request UUID until the five-minute ownership lease expires.
        }
        await new Promise((resolve) => setTimeout(resolve, RECOVERY_POLL_MS));
        if (!isCurrent()) return;
      }
      await finishUnresolved(translate('recorder.errRecoveryExpired'), false);
    } finally {
      if (recoveryGenerationRef.current === generation) {
        recoveringRef.current = false;
        operationRef.current = false;
        if (activeRecoveryOwner === instanceId) activeRecoveryOwner = null;
      }
    }
  }, [clearRequestTracking, discardRecording, endpoint, ownerId, questionId, updatePhase]);

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
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void (async () => {
          await lifecycleStopPromiseRef.current;
          await recoverPending();
        })();
      } else if (
        state === 'background' ||
        (state === 'inactive' && phaseRef.current === 'recording')
      ) {
        void stopForLifecycle();
      }
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
      void stopForLifecycle();
    };
  }, [recoverPending, stopForLifecycle]);

  useEffect(() => {
    const previous = previousIdentityRef.current;
    if (
      previous.ownerId !== ownerId ||
      previous.endpoint !== endpoint ||
      previous.questionId !== questionId
    ) {
      previousIdentityRef.current = { ownerId, endpoint, questionId };
      void stopForLifecycle();
      if (mountedRef.current) setPermissionDenied(false);
      if (mountedRef.current) setPermissionNeedsSettings(false);
    }
  }, [endpoint, ownerId, questionId, stopForLifecycle]);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
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
      if (startedAt !== null) setWaitElapsedMillis(Date.now() - startedAt);
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

  // `record({ forDuration })` can stop natively without a tap. Reflect that
  // transition in the UI and preserve the resulting URI for submission.
  useEffect(() => {
    if (phaseRef.current === 'recording' && recorderState.isRecording) {
      hasObservedRecordingRef.current = true;
      return;
    }
    if (
      phaseRef.current === 'recording' &&
      !operationRef.current &&
      hasObservedRecordingRef.current &&
      !recorderState.mediaServicesDidReset &&
      !recorderState.isRecording
    ) {
      const uri = recorder.uri ?? recorderState.url;
      if (uri) {
        const wallDuration = recordingStartedAtRef.current
          ? Date.now() - recordingStartedAtRef.current
          : 0;
        activeUriRef.current = uri;
        recordingStartedAtRef.current = null;
        autoStoppedAtRef.current = Date.now();
        setRecordedDurationMillis(
          Math.min(
            MAX_RECORDING_SECONDS * 1000,
            Math.max(recorderState.durationMillis, wallDuration),
          ),
        );
        updatePhase('recorded');
        void restoreAudioMode().catch(() => undefined);
      }
    }
  }, [recorder.uri, recorderState, updatePhase]);

  useEffect(() => {
    if (phaseRef.current === 'recording' && recorderState.mediaServicesDidReset) {
      callbacksRef.current.onError(translate('recorder.errDeviceInterrupted'));
      void stopForLifecycle();
    }
  }, [recorderState.mediaServicesDidReset, stopForLifecycle]);

  const startRecording = async () => {
    if (
      operationRef.current ||
      recoveringRef.current ||
      phaseRef.current === 'uploading' ||
      phaseRef.current === 'recovering'
    ) {
      return;
    }
    operationRef.current = true;
    const lifecycleEpoch = lifecycleEpochRef.current;
    const isCurrentLifecycle = () =>
      lifecycleEpoch === lifecycleEpochRef.current &&
      identityRef.current.ownerId === ownerId &&
      identityRef.current.endpoint === endpoint &&
      identityRef.current.questionId === questionId &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    if (mountedRef.current) setPermissionDenied(false);
    try {
      const current = await AudioModule.getRecordingPermissionsAsync();
      const response = current.granted
        ? current
        : current.canAskAgain === false
          ? current
          : await AudioModule.requestRecordingPermissionsAsync();
      if (!isCurrentLifecycle()) return;
      if (!response.granted) {
        if (mountedRef.current) {
          setPermissionDenied(true);
          setPermissionNeedsSettings(response.canAskAgain === false);
        }
        return;
      }

      const previousRequestId = requestIdRef.current;
      if (previousRequestId) {
        const cleared = await clearRequestTracking(previousRequestId);
        if (!isCurrentLifecycle()) return;
        if (!cleared) {
          updatePhase('recovering');
          callbacksRef.current.onError(translate('recorder.errRetryInfoClear'));
          return;
        }
      }
      discardRecording();
      setRecordedDurationMillis(0);
      updatePhase('idle');
      await setAudioModeAsync({
        allowsRecording: true,
        allowsBackgroundRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      if (!isCurrentLifecycle()) {
        await restoreAudioMode().catch(() => undefined);
        return;
      }
      await recorder.prepareToRecordAsync();
      if (!isCurrentLifecycle()) {
        discardRecording(recorder.uri);
        await restoreAudioMode().catch(() => undefined);
        return;
      }
      recordingStartedAtRef.current = Date.now();
      hasObservedRecordingRef.current = false;
      autoStoppedAtRef.current = null;
      recorder.record({ forDuration: MAX_RECORDING_SECONDS });
      updatePhase('recording');
    } catch {
      discardRecording(recorder.uri);
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      if (mountedRef.current) setRecordedDurationMillis(0);
      updatePhase('idle');
      await restoreAudioMode().catch(() => undefined);
      if (isCurrentLifecycle()) {
        callbacksRef.current.onError(translate('recorder.errStartFailed'));
      }
    } finally {
      operationRef.current = false;
    }
  };

  const stopRecording = async () => {
    if (operationRef.current || phaseRef.current !== 'recording') return;
    operationRef.current = true;
    const lifecycleEpoch = lifecycleEpochRef.current;
    const isCurrentLifecycle = () =>
      lifecycleEpoch === lifecycleEpochRef.current &&
      identityRef.current.ownerId === ownerId &&
      identityRef.current.endpoint === endpoint &&
      identityRef.current.questionId === questionId &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    const durationBeforeStop = Math.max(
      recorderState.durationMillis ?? 0,
      recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0,
    );
    try {
      await stopNativeRecording();
      const uri = recorder.uri;
      if (!isCurrentLifecycle()) {
        discardRecording(uri);
        return;
      }
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      if (!uri || durationBeforeStop < 500) {
        discardRecording(uri);
        updatePhase('idle');
        callbacksRef.current.onError(translate('recorder.errTooShort'));
        return;
      }
      activeUriRef.current = uri;
      setRecordedDurationMillis(durationBeforeStop);
      updatePhase('recorded');
    } catch {
      // recorder.stop() can reject when the 2:00 auto-stop already finalized
      // this take natively. A completed file is a valid answer; keep it, and
      // only discard when no saved recording actually exists.
      const uri = recorder.uri;
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      if (
        uri &&
        !recorder.isRecording &&
        recordingFileExists(uri) &&
        durationBeforeStop >= 500 &&
        isCurrentLifecycle()
      ) {
        activeUriRef.current = uri;
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
      await restoreAudioMode().catch(() => undefined);
      operationRef.current = false;
    }
  };

  const submit = async () => {
    if (operationRef.current || phaseRef.current !== 'recorded') return;
    const uri = activeUriRef.current ?? recorder.uri;
    // Unreachable by design: every path that clears activeUriRef also leaves
    // the recorded phase (pinned by the identity-change and lifecycle tests).
    // Kept as fail-closed defense; the missing-FILE case is handled as a
    // definite 400 inside apiUploadAudio.
    /* istanbul ignore next */
    if (!uri) {
      updatePhase('idle');
      callbacksRef.current.onError(translate('recorder.errNoRecording'));
      return;
    }

    operationRef.current = true;
    cancelRequestedRef.current = false;
    assessmentPostedRef.current = false;
    updatePhase('uploading');
    const lifecycleEpoch = lifecycleEpochRef.current;
    const isCurrentSubmission = () =>
      lifecycleEpoch === lifecycleEpochRef.current &&
      identityRef.current.ownerId === ownerId &&
      identityRef.current.endpoint === endpoint &&
      identityRef.current.questionId === questionId &&
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState === 'active';
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    let recoverAfterUpload = false;
    try {
      const requestId = requestIdRef.current ?? Crypto.randomUUID();
      requestIdRef.current = requestId;
      const existing = await loadPendingAssessment();
      if (!isCurrentSubmission()) return;
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
          if (!isCurrentSubmission()) return;
        } catch {
          if (!isCurrentSubmission()) return;
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
      const descriptor = await resolveAudioFileDescriptor(uri);
      if (!isCurrentSubmission()) return;
      const grant = await apiRequestAudioUpload(descriptor.type, ownerId);
      if (!isCurrentSubmission()) return;
      let raw: unknown;
      // The 503 backpressure contract (assess semaphore, database pool shed)
      // asks clients to retry the SAME logical submission after Retry-After.
      // The idempotency row is abandoned on a 503, so resubmitting this
      // requestId is safe; anything else falls through to recovery as before.
      const postAssessment = async (): Promise<unknown> => {
        let capacityRetries = 0;
        for (;;) {
          try {
            // Once the assessment POST is issued, a user cancel can no longer
            // simply return to 'recorded': the server may have committed the
            // attempt, so cancellation defers to the recovery flow instead.
            if (!controller.signal.aborted) assessmentPostedRef.current = true;
            if (grant.mode === 's3') {
              return await apiFetch<unknown>(endpoint, {
                method: 'POST',
                body: { questionId, requestId, audioKey: grant.audioKey },
                signal: controller.signal,
                timeoutMs: AUDIO_TIMEOUT_MS,
              });
            }
            return await apiUploadAudio<unknown>(
              endpoint,
              uri,
              { questionId, requestId },
              { signal: controller.signal },
            );
          } catch (error) {
            if (
              controller.signal.aborted ||
              !(error instanceof ApiError) ||
              error.status !== 503 ||
              capacityRetries >= MAX_CAPACITY_RETRIES
            ) {
              throw error;
            }
            capacityRetries += 1;
            const delayMs = Math.min(
              CAPACITY_RETRY_MAX_DELAY_MS,
              Math.max(1_000, Math.round((error.retryAfterSeconds ?? 5) * 1_000)),
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            if (!isCurrentSubmission()) throw error;
          }
        }
      };
      if (grant.mode === 's3') {
        if (!(await markPendingAssessmentStage(requestId, 's3-granted', grant.audioKey))) {
          // The tombstone vanished before anything was uploaded. Keep the
          // recording and let the learner retry — there is nothing to
          // reconcile, so recovery would latch with no way forward.
          if (!isCurrentSubmission()) return;
          requestIdRef.current = null;
          updatePhase('recorded');
          callbacksRef.current.onError(translate('recorder.errInfoNotSavedNotUploaded'));
          return;
        }
        if (!isCurrentSubmission()) return;
        await apiPostPresignedAudio(
          grant.uploadUrl,
          grant.uploadFields,
          uri,
          grant.contentType,
          grant.maxBytes,
          { signal: controller.signal },
        );
        if (!isCurrentSubmission()) return;
        raw = await postAssessment();
      } else {
        if (!(await markPendingAssessmentStage(requestId, 'direct-posting'))) {
          // Same vanished-tombstone handling as the S3 branch above.
          if (!isCurrentSubmission()) return;
          requestIdRef.current = null;
          updatePhase('recorded');
          callbacksRef.current.onError(translate('recorder.errInfoNotSavedNotUploaded'));
          return;
        }
        if (!isCurrentSubmission()) return;
        raw = await postAssessment();
      }
      if (!isCurrentSubmission()) {
        recoverAfterUpload = true;
        return;
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
          if (!isCurrentSubmission()) return;
          updatePhase('recovering');
          callbacksRef.current.onError(translate('recorder.errAnswerSavedRetryInfo'));
          return;
        }
        if (!isCurrentSubmission()) return;
        updatePhase('idle');
        callbacksRef.current.onRecoveryUnresolved();
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
        if (!isCurrentSubmission()) return;
        updatePhase('recovering');
        callbacksRef.current.onError(translate('recorder.errResultSafeRetryInfo'));
        return;
      }
      if (!isCurrentSubmission()) return;
      updatePhase('idle');
      callbacksRef.current.onResult(data);
      void clearRequestTracking(requestId);
    } catch (error) {
      if (controller.signal.aborted) {
        // Lifecycle cleanup (blur, background, unmount) owns non-user aborts.
        if (!cancelRequestedRef.current) return;
        cancelRequestedRef.current = false;
        if (!isCurrentSubmission()) return;
        if (assessmentPostedRef.current) {
          // The cancelled POST may have committed server-side. Resolve the
          // durable request instead of risking a double submission.
          recoverAfterUpload = true;
          updatePhase('recovering');
          return;
        }
        // Nothing was claimed server-side: forget the handoff and hand the
        // saved take back so the learner can replay or resubmit it.
        const requestId = requestIdRef.current;
        const cleared = requestId ? await clearRequestTracking(requestId) : true;
        if (!isCurrentSubmission()) return;
        if (!cleared) {
          updatePhase('recovering');
          callbacksRef.current.onError(translate('recorder.errRetryInfoClear'));
          return;
        }
        updatePhase('recorded');
        return;
      }
      if (!isCurrentSubmission()) return;
      const definitelyRejected =
        error instanceof ApiError && [400, 403, 404, 413, 415, 422, 429].includes(error.status);
      if (definitelyRejected) {
        const requestId = requestIdRef.current;
        const cleared = requestId ? await clearRequestTracking(requestId) : true;
        if (!isCurrentSubmission()) return;
        if (!cleared) {
          updatePhase('recovering');
          callbacksRef.current.onError(translate('recorder.errRetryInfoClear'));
          return;
        }
        updatePhase('recorded');
        const message = userMessageForError(error, translate('recorder.errRejected'));
        // 429 covers RATE_LIMITED, DAILY_LIMIT, and NETWORK_DAILY_LIMIT; their
        // localized wait line deserves an inline home, not just an alert.
        if (error.status === 429 && callbacksRef.current.onRateLimited) {
          callbacksRef.current.onRateLimited(message);
        } else {
          callbacksRef.current.onError(message);
        }
      } else {
        // A timeout, disconnect, 409, or server failure can happen after the
        // attempt commits. Resolve its durable status before enabling controls.
        recoverAfterUpload = true;
        updatePhase('recovering');
      }
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }
      operationRef.current = false;
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
      Date.now() - autoStoppedAtRef.current < AUTO_STOP_TAP_GRACE_MS
    ) {
      return Promise.resolve();
    }
    return startRecording();
  };

  const cancelUpload = () => {
    if (phaseRef.current !== 'uploading') return;
    const controller = uploadControllerRef.current;
    if (!controller) return;
    cancelRequestedRef.current = true;
    controller.abort();
  };

  const togglePreview = () => {
    if (previewPlaying) {
      previewPlayerRef.current?.pause();
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
      previewPlayerRef.current = player;
      previewListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (!status.didJustFinish) return;
        // Rewind so Play starts the take from the beginning next time.
        void player.seekTo(0).catch(() => undefined);
        if (mountedRef.current && previewPlayerRef.current === player) {
          setPreviewPlaying(false);
        }
      });
    }
    previewPlayerRef.current.play();
    setPreviewPlaying(true);
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
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={handleMicPress}
          style={({ pressed }) => [
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            (busy || pressed) && styles.recordButtonDimmed,
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
        </>
      )}

      {phase === 'recorded' && (
        <View style={styles.actions}>
          <Button
            title={previewPlaying ? t('recorder.pause') : t('recorder.play')}
            variant="secondary"
            accessibilityLabel={previewPlaying ? t('recorder.pauseLabel') : t('recorder.playLabel')}
            onPress={togglePreview}
          />
          <Button title={t('recorder.submit')} onPress={() => void submit()} />
          <Button
            title={t('recorder.rerecord')}
            variant="quiet"
            onPress={() => void startRecording()}
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
  recordButtonActive: {
    backgroundColor: colors.danger,
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
