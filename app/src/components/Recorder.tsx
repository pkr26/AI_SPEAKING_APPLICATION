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
  StyleSheet,
  Text,
  useAnimatedValue,
  View,
} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import {
  ApiError,
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  AUDIO_TIMEOUT_MS,
  audioFileDescriptor,
  userMessageForError,
} from '../lib/api';
import {
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  savePendingAssessment,
  type AssessmentEndpoint,
  type PendingAssessment,
} from '../lib/pending-assessment';
import { colors } from '../lib/theme';
import { ContractError } from '../lib/types';

type Phase = 'idle' | 'recording' | 'recorded' | 'uploading' | 'recovering';

interface RecorderProps<T> {
  ownerId: string;
  questionId: string;
  /** Assessment endpoint that accepts audio + questionId + retry-stable requestId. */
  endpoint: AssessmentEndpoint;
  parseResult: (data: unknown) => T;
  onResult: (data: T) => void;
  onError: (message: string) => void;
  /** Refreshes canonical server state when feedback cannot be reconstructed. */
  onRecoveryUnresolved: () => void;
}

let activeRecoveryOwner: symbol | null = null;

const MAX_RECORDING_SECONDS = 120;
const RECOVERY_LEASE_MS = 5 * 60_000;
const RECOVERY_RECORD_TTL_MS = 25 * 60 * 60_000;
const RECOVERY_REQUEST_TIMEOUT_MS = 5_000;
const RECOVERY_POLL_MS = 2_000;
const NOT_FOUND_CONFIRMATIONS = 3;
const MAX_S3_RESUBMISSIONS = 3;
const S3_RESUBMIT_BASE_BACKOFF_MS = 5_000;
const SPEECH_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 64_000,
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

/** Shared recorder for diagnostic and practice assessment. */
export default function Recorder<T>({
  ownerId,
  questionId,
  endpoint,
  parseResult,
  onResult,
  onError,
  onRecoveryUnresolved,
}: RecorderProps<T>) {
  const recorder = useAudioRecorder(SPEECH_RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 200);

  const [phase, setPhase] = useState<Phase>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionNeedsSettings, setPermissionNeedsSettings] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [recordedDurationMillis, setRecordedDurationMillis] = useState(0);
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
  const previousIdentityRef = useRef({ ownerId, endpoint, questionId });
  const requestIdRef = useRef<string | null>(null);
  const recoveringRef = useRef(false);
  const recoveryGenerationRef = useRef(0);
  const instanceIdRef = useRef(Symbol('recorder-recovery'));
  const callbacksRef = useRef({
    onError,
    onRecoveryUnresolved,
    onResult,
    parseResult,
  });
  const identityRef = useRef({ ownerId, endpoint, questionId });

  useLayoutEffect(() => {
    callbacksRef.current = {
      onError,
      onRecoveryUnresolved,
      onResult,
      parseResult,
    };
  }, [onError, onRecoveryUnresolved, onResult, parseResult]);

  useLayoutEffect(() => {
    identityRef.current = { ownerId, endpoint, questionId };
  }, [endpoint, ownerId, questionId]);

  const updatePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    if (mountedRef.current) setPhase(next);
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
        callbacksRef.current.onError(
          'Secure retry information is temporarily unavailable. Restart the app before recording another answer.',
        );
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
        callbacksRef.current.onError(
          'We could not confirm whether your answer was saved. If it does not appear, please record it again.',
        );
      }
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
            callbacksRef.current.onError(
              'Secure retry information could not be cleared. Restart the app before recording another answer.',
            );
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
          callbacksRef.current.onError(
            'Secure retry information could not be cleared. Restart the app before recording another answer.',
          );
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
          callbacksRef.current.onError(
            'Secure retry information could not be updated. Restart the app to finish recovery.',
          );
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
          if (!status || typeof status !== 'object' || !('status' in status)) {
            await finishUnresolved(
              'The server returned an invalid recovery response. Your learning state has been refreshed.',
              false,
            );
            return;
          }
          const expectedContext =
            pending.endpoint === '/diagnostic/answer' ? 'diagnostic' : 'practice';
          if (
            !('context' in status) ||
            status.context !== expectedContext ||
            !('questionId' in status) ||
            status.questionId !== pending.questionId
          ) {
            await finishUnresolved(
              'The server returned inconsistent recovery data. Your learning state has been refreshed.',
              false,
            );
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
                  callbacksRef.current.onError(
                    'Secure retry information could not be updated. Restart the app to finish recovery.',
                  );
                }
                return;
              }
              if (!isCurrent()) return;
              callbacksRef.current.onRecoveryUnresolved();
              if (!isCurrent()) return;
              discardRecording();
              updatePhase('idle');
              callbacksRef.current.onError(
                'Your interrupted assessment was saved. Your current learning state has been refreshed.',
              );
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
                  callbacksRef.current.onError(
                    'Secure retry information could not be updated. Restart the app to finish recovery.',
                  );
                }
                return;
              }
              if (!isCurrent()) return;
              callbacksRef.current.onRecoveryUnresolved();
              if (!isCurrent()) return;
              discardRecording();
              updatePhase('idle');
              callbacksRef.current.onError(
                'The assessment was saved, but this app version could not display it. Your learning state has been refreshed.',
              );
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
                callbacksRef.current.onError(
                  'The result is safe, but secure retry information could not be updated. Restart the app to finish recovery.',
                );
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
            await finishUnresolved(
              'The server returned inconsistent recovery data. Your learning state has been refreshed.',
              false,
            );
            return;
          }
        } catch (error) {
          if (!isCurrent()) return;
          if (error instanceof ApiError && error.status === 404) {
            notFoundCount += 1;
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
                  await finishUnresolved(
                    'Your interrupted assessment was saved. Your current learning state has been refreshed.',
                    false,
                  );
                  return;
                }
                let data: T;
                try {
                  data = callbacksRef.current.parseResult(raw);
                } catch {
                  await finishUnresolved(
                    'The assessment was saved, but this app version could not display it. Your learning state has been refreshed.',
                    false,
                  );
                  return;
                }
                try {
                  if (!(await markPendingAssessmentForReconciliation(pending.requestId))) {
                    throw new Error('Pending assessment disappeared');
                  }
                } catch {
                  if (isCurrent()) {
                    updatePhase('recovering');
                    callbacksRef.current.onError(
                      'The result is safe, but secure retry information could not be updated. Restart the app to finish recovery.',
                    );
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
                if (
                  retryError instanceof ApiError &&
                  [400, 403, 404, 413, 415, 422].includes(retryError.status)
                ) {
                  await finishUnresolved(
                    'The interrupted upload is no longer available. Please submit the recording again if the question remains.',
                    true,
                  );
                  return;
                }
                // An ambiguous failure may have committed. Continue polling the
                // same durable request before retrying the identical handoff.
                nextS3ResubmissionAt =
                  Date.now() + S3_RESUBMIT_BASE_BACKOFF_MS * 2 ** (s3ResubmissionAttempts - 1);
              }
            }
            if (absenceConfirmed && pending.stage !== 's3-granted') {
              await finishUnresolved(
                'The interrupted upload could not be confirmed. Your learning state has been refreshed; please record again only if the question remains.',
                false,
              );
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
      await finishUnresolved(
        'The interrupted assessment expired safely. Your learning state has been refreshed.',
        false,
      );
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

  const announcedPhaseRef = useRef<Phase>('idle');
  useEffect(() => {
    if (announcedPhaseRef.current === phase) return;
    announcedPhaseRef.current = phase;
    if (!focusedRef.current || AppState.currentState !== 'active') return;
    const announcement =
      phase === 'recording'
        ? 'Recording started. Tap the microphone to stop.'
        : phase === 'recorded'
          ? 'Recording saved. Ready to submit.'
          : phase === 'uploading'
            ? 'Uploading and assessing your answer.'
            : phase === 'recovering'
              ? 'Recovering your interrupted assessment.'
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
      callbacksRef.current.onError(
        'Recording was interrupted by the device. Please record your answer again.',
      );
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
          callbacksRef.current.onError(
            'Secure retry information could not be cleared. Restart the app before recording another answer.',
          );
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
        callbacksRef.current.onError(
          'Could not start recording. Check microphone access and try again.',
        );
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
    try {
      const durationBeforeStop = Math.max(
        recorderState.durationMillis ?? 0,
        recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : 0,
      );
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
        callbacksRef.current.onError(
          'The recording was too short. Please record your answer again.',
        );
        return;
      }
      activeUriRef.current = uri;
      setRecordedDurationMillis(durationBeforeStop);
      updatePhase('recorded');
    } catch {
      discardRecording(recorder.uri);
      recordingStartedAtRef.current = null;
      hasObservedRecordingRef.current = false;
      updatePhase('idle');
      if (isCurrentLifecycle()) {
        callbacksRef.current.onError(
          'Could not save the recording. Please record your answer again.',
        );
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
      callbacksRef.current.onError('No recording was saved. Please record again.');
      return;
    }

    operationRef.current = true;
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
          callbacksRef.current.onError(
            'The app could not securely save retry information, so your recording was not uploaded. Please try again.',
          );
          return;
        }
      }
      // Ask the API where the audio goes: a size-constrained S3 POST form in production,
      // direct multipart to the API in local dev. The assessment requestId is
      // claimed by the answer endpoint either way, so the idempotency and
      // recovery flow below is identical for both paths.
      const descriptor = audioFileDescriptor(uri);
      const grant = await apiRequestAudioUpload(descriptor.type);
      if (!isCurrentSubmission()) return;
      let raw: unknown;
      if (grant.mode === 's3') {
        if (!(await markPendingAssessmentStage(requestId, 's3-granted', grant.audioKey))) {
          // The tombstone vanished before anything was uploaded. Keep the
          // recording and let the learner retry — there is nothing to
          // reconcile, so recovery would latch with no way forward.
          if (!isCurrentSubmission()) return;
          requestIdRef.current = null;
          updatePhase('recorded');
          callbacksRef.current.onError(
            'Secure retry information could not be updated, so your recording was not uploaded. Please try again.',
          );
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
        raw = await apiFetch<unknown>(endpoint, {
          method: 'POST',
          body: { questionId, requestId, audioKey: grant.audioKey },
          signal: controller.signal,
          timeoutMs: AUDIO_TIMEOUT_MS,
        });
      } else {
        if (!(await markPendingAssessmentStage(requestId, 'direct-posting'))) {
          // Same vanished-tombstone handling as the S3 branch above.
          if (!isCurrentSubmission()) return;
          requestIdRef.current = null;
          updatePhase('recorded');
          callbacksRef.current.onError(
            'Secure retry information could not be updated, so your recording was not uploaded. Please try again.',
          );
          return;
        }
        if (!isCurrentSubmission()) return;
        raw = await apiUploadAudio<unknown>(
          endpoint,
          uri,
          { questionId, requestId },
          { signal: controller.signal },
        );
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
          callbacksRef.current.onError(
            'The assessment was saved, but secure retry information could not be updated. Restart the app to finish recovery.',
          );
          return;
        }
        if (!isCurrentSubmission()) return;
        updatePhase('idle');
        callbacksRef.current.onRecoveryUnresolved();
        callbacksRef.current.onError(
          'The assessment was saved, but this app version could not display it. Your learning state has been refreshed.',
        );
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
        callbacksRef.current.onError(
          'The result is safe, but secure retry information could not be updated. Restart the app to finish recovery.',
        );
        return;
      }
      if (!isCurrentSubmission()) return;
      updatePhase('idle');
      callbacksRef.current.onResult(data);
      void clearRequestTracking(requestId);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (!isCurrentSubmission()) return;
      const definitelyRejected =
        error instanceof ApiError && [400, 403, 404, 413, 415, 422, 429].includes(error.status);
      if (definitelyRejected) {
        const requestId = requestIdRef.current;
        const cleared = requestId ? await clearRequestTracking(requestId) : true;
        if (!isCurrentSubmission()) return;
        if (!cleared) {
          updatePhase('recovering');
          callbacksRef.current.onError(
            'Secure retry information could not be cleared. Restart the app before recording another answer.',
          );
          return;
        }
        updatePhase('recorded');
        callbacksRef.current.onError(
          userMessageForError(
            error,
            'The server rejected this recording. Please review the question and try again.',
          ),
        );
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
  const busy = phase === 'uploading' || phase === 'recovering';
  const elapsed = formatElapsed(
    phase === 'recorded' ? recordedDurationMillis : (recorderState.durationMillis ?? 0),
  );

  return (
    <View style={styles.container}>
      {permissionDenied && (
        <View accessibilityRole="alert" style={styles.permissionBanner}>
          <Text style={styles.permissionText}>
            Microphone access is needed to record your answer. Please allow microphone permission
            for this app in your device settings, then try again.
          </Text>
          {permissionNeedsSettings && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void Linking.openSettings().catch(() =>
                  callbacksRef.current.onError(
                    'Could not open device settings. Open Settings manually and allow microphone access for this app.',
                  ),
                );
              }}
              style={({ pressed }) => [
                styles.settingsButton,
                pressed && styles.settingsButtonPressed,
              ]}
            >
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </Pressable>
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
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={isRecording ? stopRecording : startRecording}
          style={({ pressed }) => [
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            (busy || pressed) && styles.recordButtonDimmed,
          ]}
        >
          <View style={isRecording ? styles.stopIcon : styles.micDot} />
        </Pressable>
      </View>

      <Text
        accessible={!isRecording}
        accessibilityLabel={
          isRecording
            ? 'Recording in progress. Tap the microphone to stop.'
            : phase === 'recorded'
              ? 'Recording saved. Ready to submit.'
              : phase === 'recovering'
                ? 'Recovering your interrupted assessment.'
                : busy
                  ? 'Uploading and assessing your answer.'
                  : 'Ready to record.'
        }
        style={styles.statusText}
      >
        {isRecording
          ? `Recording… ${elapsed} of 2:00 — tap to stop`
          : phase === 'recorded'
            ? `Recorded ${elapsed} — ready to submit`
            : phase === 'recovering'
              ? 'Confirming whether your interrupted assessment was saved…'
              : busy
                ? 'Uploading and assessing your answer…'
                : 'Tap the microphone to record your answer'}
      </Text>

      <Text style={styles.privacyText}>
        Your recording is uploaded only after you choose Submit Answer.
      </Text>

      {busy && (
        <ActivityIndicator
          accessibilityLabel={
            phase === 'recovering'
              ? 'Recovering your interrupted assessment'
              : 'Uploading and assessing your answer'
          }
          style={styles.spinner}
          size="large"
          color={colors.primary}
        />
      )}

      {phase === 'recorded' && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
            onPress={() => void submit()}
          >
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.rerecordButton}
            onPress={() => void startRecording()}
          >
            <Text style={styles.rerecordButtonText}>Re-record</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  permissionBanner: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  permissionText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  settingsButton: {
    minHeight: 44,
    marginTop: 10,
    alignSelf: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.danger,
  },
  settingsButtonPressed: {
    opacity: 0.82,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
  },
  recordButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  recordButtonActive: {
    backgroundColor: '#B91C1C',
  },
  recordButtonDimmed: {
    opacity: 0.6,
  },
  micDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    marginTop: 16,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  privacyText: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 16,
  },
  actions: {
    marginTop: 24,
    alignSelf: 'stretch',
    gap: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  rerecordButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rerecordButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '500',
  },
});
