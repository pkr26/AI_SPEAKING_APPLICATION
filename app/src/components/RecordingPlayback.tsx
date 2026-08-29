import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, Text, View } from 'react-native';

import {
  ApiError,
  apiDeleteRecording,
  apiGetRecordingPlaybackGrant,
  userMessageForError,
} from '../lib/api';
import { claimPlaybackOwner, configurePlaybackAudioMode } from '../lib/audio-session';
import { useAuth } from '../lib/auth';
import { translate, useT } from '../lib/i18n';
import {
  claimPrivatePlaybackFile,
  downloadPrivatePlaybackFile,
  type OwnedPrivateFile,
} from '../lib/private-artifacts';
import { createThemedStyles, useTheme } from '../lib/theme';
import type {
  HistoryPage,
  RecordingPage,
  RecordingPlaybackGrant,
  RecordingStatus,
} from '../lib/types';
import Button from './Button';

type PlaybackPhase = 'idle' | 'loading' | 'playing' | 'paused' | 'error' | 'deleting' | 'deleted';

interface RecordingPlaybackProps {
  ownerId: string;
  recordingId: string;
  recordingStatus?: RecordingStatus | null;
  /** Hide duplicate status copy when the parent already renders it as metadata. */
  showStatus?: boolean;
  compact?: boolean;
  recordingLabel?: string;
  onDeleted?: (recordingId: string) => void | Promise<void>;
}

// A normal two-minute 64 kbps learner take is roughly 1 MB. Give slow links a
// generous bounded preparation window, while ensuring a native download or
// decoder that never reports ready cannot leave the UI saying "Preparing"
// forever.
const PLAYBACK_PREPARE_TIMEOUT_MS = 30_000;
const SHARE_PREPARE_TIMEOUT_MS = 30_000;

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

/** Exported so the pre-aborted and mid-wait cancellation contracts stay deterministic. */
export function waitAbortable(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const rejectAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    if (signal.aborted) {
      rejectAbort();
      return;
    }
    signal.addEventListener('abort', rejectAbort, { once: true });
    timer = setTimeout(() => {
      signal.removeEventListener('abort', rejectAbort);
      resolve();
    }, milliseconds);
  });
}

/** Bounds native/network preparation while preserving caller-driven cancellation. */
export function runWithAbortableTimeout<T>(
  operation: () => Promise<T>,
  controller: AbortController,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      controller.signal.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = () => {
      finish(() => reject(controller.signal.reason ?? abortError()));
    };
    if (controller.signal.aborted) {
      onAbort();
      return;
    }
    controller.signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      controller.abort(new Error('Operation timed out'));
    }, timeoutMs);
    void Promise.resolve()
      .then(operation)
      .then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
  });
}

/** Formats the native player's potentially hostile/non-finite timing values. */
export function formatPlaybackTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`;
}

export function removeRecordingFromPages(
  data: InfiniteData<RecordingPage> | undefined,
  recordingId: string,
): InfiniteData<RecordingPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== recordingId),
    })),
  };
}

export function removeRecordingFromHistoryPages(
  data: InfiniteData<HistoryPage> | undefined,
  recordingId: string,
): InfiniteData<HistoryPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.recordingId === recordingId
          ? { ...item, recordingId: null, recordingStatus: null }
          : item,
      ),
    })),
  };
}

export function applyRecordingDeletionToCache(
  queryClient: QueryClient,
  ownerId: string,
  recordingId: string,
): void {
  queryClient.setQueryData<InfiniteData<RecordingPage>>(['recordings', ownerId], (current) =>
    removeRecordingFromPages(current, recordingId),
  );
  queryClient.setQueryData<InfiniteData<HistoryPage>>(['practice-history', ownerId], (current) =>
    removeRecordingFromHistoryPages(current, recordingId),
  );
}

export default function RecordingPlayback({
  ownerId,
  recordingId,
  recordingStatus,
  showStatus = true,
  compact = false,
  recordingLabel,
  onDeleted,
}: RecordingPlaybackProps) {
  const { sessionVersion, captureSessionLease, isSessionLeaseCurrent } = useAuth();
  const t = useT();
  const styles = themedStyles(useTheme());
  const queryClient = useQueryClient();
  const identityToken = useMemo(() => {
    void ownerId;
    void recordingId;
    return Symbol();
  }, [ownerId, recordingId]);
  const [phase, setPhase] = useState<PlaybackPhase>('idle');
  const [sharing, setSharing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const mountedRef = useRef<boolean | null>(null);
  const focusedRef = useRef<boolean | null>(null);
  const lifecycleRef = useRef(Symbol());
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerListenerRef = useRef<{ remove: () => void } | null>(null);
  const playbackFileRef = useRef<OwnedPrivateFile | null>(null);
  const playbackControllerRef = useRef<AbortController | null>(null);
  const playbackPrepareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preparingPlayerRef = useRef<AudioPlayer | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  const shareControllerRef = useRef<AbortController | null>(null);
  const shareFileRef = useRef<OwnedPrivateFile | null>(null);
  // Once expo-sharing receives a local URI, Android's chooser may background
  // or blur the app while it is still reading that file. Lifecycle cleanup may
  // retire the logical operation, but this exact lease must survive until the
  // native share promise settles.
  const nativeShareFileRef = useRef<OwnedPrivateFile | null>(null);
  const operationRef = useRef<symbol | null>(null);
  const deleteOperationRef = useRef<symbol | null>(null);
  const shareOperationRef = useRef<symbol | null>(null);
  const deletedRef = useRef<boolean | null>(null);
  const releaseOwnerRef = useRef<(() => void) | null>(null);
  const committedIdentityRef = useRef(identityToken);
  const onDeletedRef = useRef(onDeleted);
  const recordingLabelRef = useRef(recordingLabel);
  const playbackUnavailableRef = useRef(recordingStatus === 'unavailable');
  const sessionLease = useMemo(() => {
    void ownerId;
    void sessionVersion;
    return captureSessionLease();
  }, [captureSessionLease, ownerId, sessionVersion]);

  useLayoutEffect(() => {
    onDeletedRef.current = onDeleted;
    recordingLabelRef.current = recordingLabel;
  }, [onDeleted, recordingLabel]);

  const contextIsCurrent = useCallback(
    (lifecycle: symbol) =>
      mountedRef.current === true &&
      focusedRef.current === true &&
      AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive' &&
      lifecycle === lifecycleRef.current &&
      isSessionLeaseCurrent(sessionLease),
    [isSessionLeaseCurrent, sessionLease],
  );

  const cancelDelete = useCallback(() => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteOperationRef.current = null;
  }, []);

  const cancelShare = useCallback(() => {
    shareControllerRef.current?.abort();
    shareControllerRef.current = null;
    shareOperationRef.current = null;
    const shareFile = shareFileRef.current;
    if (shareFile !== null && nativeShareFileRef.current !== shareFile) {
      shareFileRef.current = null;
      shareFile.release();
    }
    if (mountedRef.current === true) setSharing(false);
  }, []);

  const clearPlaybackPrepareTimer = useCallback(() => {
    if (playbackPrepareTimerRef.current !== null) {
      clearTimeout(playbackPrepareTimerRef.current);
      playbackPrepareTimerRef.current = null;
    }
  }, []);

  const releasePlayer = useCallback(() => {
    clearPlaybackPrepareTimer();
    playbackControllerRef.current?.abort();
    playbackControllerRef.current = null;
    operationRef.current = null;
    preparingPlayerRef.current = null;
    try {
      playerListenerRef.current?.remove();
    } catch {
      // Listener teardown is best effort.
    }
    playerListenerRef.current = null;
    const player = playerRef.current;
    playerRef.current = null;
    try {
      player?.pause();
    } catch {
      // A released or failed player may no longer accept pause.
    }
    try {
      player?.remove();
    } catch {
      // Native player release is best effort.
    }
    const playbackFile = playbackFileRef.current;
    playbackFileRef.current = null;
    playbackFile?.release();
    releaseOwnerRef.current?.();
    releaseOwnerRef.current = null;
  }, [clearPlaybackPrepareTimer]);

  const resetPlaybackUi = useCallback(() => {
    if (mountedRef.current !== true) return;
    setCurrentTime(0);
    setDuration(0);
    setPhase('idle');
  }, []);

  const stopPlayback = useCallback(() => {
    releasePlayer();
    resetPlaybackUi();
  }, [releasePlayer, resetPlaybackUi]);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelDelete();
      cancelShare();
      releasePlayer();
    };
  }, [cancelDelete, cancelShare, releasePlayer]);

  useLayoutEffect(() => {
    committedIdentityRef.current = identityToken;
    lifecycleRef.current = Symbol();
    cancelDelete();
    cancelShare();
    deletedRef.current = false;
    releasePlayer();
    // Identity changes must synchronously discard account-scoped UI before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMessage(null);
    resetPlaybackUi();
  }, [cancelDelete, cancelShare, identityToken, releasePlayer, resetPlaybackUi, sessionLease]);

  useLayoutEffect(() => {
    const unavailable = recordingStatus === 'unavailable';
    playbackUnavailableRef.current = unavailable;
    if (!unavailable) return;

    releasePlayer();
    // An availability refresh may race an explicit deletion. It invalidates
    // playback only; an active or committed deletion keeps its own controller
    // and visible phase. Every other prior playback phase/error is obsolete.
    if (deleteOperationRef.current !== null || deletedRef.current === true) return;
    setErrorMessage(null);
    resetPlaybackUi();
  }, [recordingStatus, releasePlayer, resetPlaybackUi]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
        lifecycleRef.current = Symbol();
        cancelDelete();
        cancelShare();
        stopPlayback();
      };
    }, [cancelDelete, cancelShare, stopPlayback]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      lifecycleRef.current = Symbol();
      cancelDelete();
      if (state === 'background') cancelShare();
      stopPlayback();
    });
    return () => subscription.remove();
  }, [cancelDelete, cancelShare, stopPlayback]);

  const playbackGrant = useCallback(
    async (signal: AbortSignal) => {
      const requestGrant = () => apiGetRecordingPlaybackGrant(recordingId, signal);
      const retryPending = async (
        next: () => Promise<RecordingPlaybackGrant>,
      ): Promise<RecordingPlaybackGrant> => {
        try {
          return await requestGrant();
        } catch (error) {
          if (!(
            error instanceof ApiError &&
            error.status === 409 &&
            error.code === 'REQUEST_IN_FLIGHT'
          )) {
            throw error;
          }
          const waitSeconds = Math.min(Math.max(error.retryAfterSeconds ?? 2, 1), 5);
          await waitAbortable(waitSeconds * 1_000, signal);
          return next();
        }
      };
      return retryPending(() => retryPending(() => retryPending(requestGrant)));
    },
    [recordingId],
  );

  const startPlayback = useCallback(async () => {
    if (
      playbackUnavailableRef.current ||
      operationRef.current ||
      preparingPlayerRef.current ||
      deleteOperationRef.current ||
      shareOperationRef.current ||
      deletedRef.current === true
    ) {
      return;
    }
    const lifecycle = lifecycleRef.current;
    const existing = playerRef.current;
    if (existing) {
      try {
        existing.muted = false;
        existing.volume = 1;
        existing.play();
        setPhase('playing');
        return;
      } catch {
        // Replace the failed native player below.
      }
    }
    releasePlayer();
    const operation = Symbol();
    operationRef.current = operation;
    const controller = new AbortController();
    playbackControllerRef.current = controller;
    setErrorMessage(null);
    setPhase('loading');
    const operationIsCurrent = () =>
      committedIdentityRef.current === identityToken &&
      operationRef.current === operation &&
      contextIsCurrent(lifecycle);
    let operationReleaseOwner: (() => void) | null = null;
    let operationPlaybackFile: OwnedPrivateFile | null = null;
    const releaseStaleOperationResources = () => {
      if (operationPlaybackFile !== null) {
        if (playbackFileRef.current === operationPlaybackFile) playbackFileRef.current = null;
        operationPlaybackFile.release();
      }
      // Only the exact release closure still published by this operation may
      // clear the global slot; a successor may already own it.
      if (operationReleaseOwner !== null && releaseOwnerRef.current === operationReleaseOwner) {
        releaseOwnerRef.current = null;
        operationReleaseOwner();
      }
    };
    playbackPrepareTimerRef.current = setTimeout(() => {
      const stillPreparingThisOperation =
        operationRef.current === operation ||
        (operationPlaybackFile !== null && playbackFileRef.current === operationPlaybackFile);
      if (!stillPreparingThisOperation || !contextIsCurrent(lifecycle)) return;
      releasePlayer();
      setErrorMessage(translate('recordings.playFailed'));
      setPhase('error');
    }, PLAYBACK_PREPARE_TIMEOUT_MS);
    try {
      const grant = await playbackGrant(controller.signal);
      if (!operationIsCurrent()) return;
      const releaseOwner = await claimPlaybackOwner(operation, stopPlayback);
      operationReleaseOwner = releaseOwner;
      if (!operationIsCurrent()) {
        releaseOwner();
        return;
      }
      releaseOwnerRef.current = releaseOwner;
      await configurePlaybackAudioMode();
      if (!operationIsCurrent()) {
        releaseStaleOperationResources();
        return;
      }
      // Keep submitted audio under app ownership. The native audio module's
      // download-first cache cannot be enumerated or purged on logout, whereas
      // this unique account-scoped file is released on every lifecycle exit.
      const playbackFile = claimPrivatePlaybackFile(ownerId, recordingId, grant.contentType);
      operationPlaybackFile = playbackFile;
      playbackFileRef.current = playbackFile;
      await downloadPrivatePlaybackFile(grant.playbackUrl, playbackFile, controller.signal);
      if (!operationIsCurrent()) {
        releaseStaleOperationResources();
        return;
      }
      const player = createAudioPlayer(playbackFile.file.uri, { updateInterval: 250 });
      playerRef.current = player;
      preparingPlayerRef.current = player;
      // New native players should already default to audible output, but make
      // that contract explicit so a platform/default regression cannot present
      // a progressing yet app-muted recording.
      player.muted = false;
      player.volume = 1;
      let playRequested = false;
      const handlePlaybackStatus = (status: AudioStatus) => {
        if (playerRef.current !== player || !contextIsCurrent(lifecycle)) return;
        if (status.error) {
          releasePlayer();
          setErrorMessage(translate('recordings.playFailed'));
          setPhase('error');
          return;
        }
        setCurrentTime(status.currentTime);
        setDuration(status.duration);
        if (status.isLoaded && !playRequested) {
          playRequested = true;
          try {
            player.muted = false;
            player.volume = 1;
            player.play();
          } catch {
            releasePlayer();
            setErrorMessage(translate('recordings.playFailed'));
            setPhase('error');
            return;
          }
        }
        if (status.didJustFinish) {
          clearPlaybackPrepareTimer();
          if (preparingPlayerRef.current === player) preparingPlayerRef.current = null;
          setPhase('paused');
          void Promise.resolve(player.seekTo(0)).catch(() => {
            if (playerRef.current === player) {
              releasePlayer();
              setErrorMessage(translate('recordings.playFailed'));
              setPhase('error');
            }
          });
        } else if (playRequested && status.playing) {
          clearPlaybackPrepareTimer();
          if (preparingPlayerRef.current === player) preparingPlayerRef.current = null;
          setPhase('playing');
        }
      };
      const playerListener = player.addListener('playbackStatusUpdate', handlePlaybackStatus);
      if (playerRef.current === player) {
        playerListenerRef.current = playerListener;
      } else {
        // A native implementation is allowed to deliver its current status
        // while installing the listener. If that synchronous status failed
        // playback, do not retain the just-created stale subscription.
        playerListener.remove();
      }
      // A local decoder can finish loading between native construction and
      // listener installation, so sample authoritative status after
      // subscribing and close that lost-wakeup window.
      if (playerRef.current === player) {
        const currentStatus = player.currentStatus;
        if (player.isLoaded || currentStatus.isLoaded || currentStatus.error) {
          handlePlaybackStatus(currentStatus);
        }
      }
    } catch (error) {
      if (!operationIsCurrent()) {
        releaseStaleOperationResources();
        return;
      }
      releasePlayer();
      setErrorMessage(userMessageForError(error, t('recordings.playFailed')));
      setPhase('error');
    } finally {
      if (playbackControllerRef.current === controller) playbackControllerRef.current = null;
      if (operationRef.current === operation) operationRef.current = null;
    }
  }, [
    clearPlaybackPrepareTimer,
    contextIsCurrent,
    identityToken,
    ownerId,
    playbackGrant,
    recordingId,
    releasePlayer,
    stopPlayback,
    t,
  ]);

  const togglePlayback = () => {
    const lifecycle = lifecycleRef.current;
    if (committedIdentityRef.current !== identityToken || !contextIsCurrent(lifecycle)) {
      return;
    }
    if (playbackUnavailableRef.current) return;
    if (phase === 'playing') {
      try {
        playerRef.current!.pause();
        setPhase('paused');
      } catch {
        releasePlayer();
        setErrorMessage(t('recordings.playFailed'));
        setPhase('error');
      }
      return;
    }
    void startPlayback();
  };

  const shareAudio = useCallback(async () => {
    const lifecycle = lifecycleRef.current;
    if (
      committedIdentityRef.current !== identityToken ||
      !contextIsCurrent(lifecycle) ||
      playbackUnavailableRef.current ||
      operationRef.current ||
      preparingPlayerRef.current ||
      deleteOperationRef.current ||
      shareOperationRef.current ||
      deletedRef.current === true
    ) {
      return;
    }

    // Sharing and playback both consume a temporary copy. Stop playback first
    // so one user action owns all native/file resources for this recording.
    releasePlayer();
    const operation = Symbol('share-recording');
    const controller = new AbortController();
    shareOperationRef.current = operation;
    shareControllerRef.current = controller;
    setErrorMessage(null);
    setSharing(true);
    const operationFile: { current: OwnedPrivateFile | null } = { current: null };
    const operationOwnsUi = () =>
      committedIdentityRef.current === identityToken &&
      shareOperationRef.current === operation &&
      shareControllerRef.current === controller &&
      contextIsCurrent(lifecycle);
    const operationIsCurrent = () => operationOwnsUi() && !controller.signal.aborted;
    try {
      const prepared = await runWithAbortableTimeout(
        async () => {
          if (!(await Sharing.isAvailableAsync())) return null;
          if (!operationIsCurrent()) throw abortError();
          const grant = await playbackGrant(controller.signal);
          if (!operationIsCurrent()) throw abortError();

          // The signed capability is consumed only by the app-owned downloader.
          // The OS share sheet receives a cache-scoped local URI and never sees a
          // reusable S3 URL or storage coordinate.
          const claimedFile = claimPrivatePlaybackFile(ownerId, recordingId, grant.contentType);
          operationFile.current = claimedFile;
          shareFileRef.current = claimedFile;
          await downloadPrivatePlaybackFile(grant.playbackUrl, claimedFile, controller.signal);
          if (!operationIsCurrent() || !claimedFile.isCurrent()) throw abortError();
          return { grant, file: claimedFile };
        },
        controller,
        SHARE_PREPARE_TIMEOUT_MS,
      );
      if (prepared === null) {
        if (operationIsCurrent()) setErrorMessage(t('recordings.shareUnavailable'));
        return;
      }
      if (!operationIsCurrent()) return;
      // Publish ownership before invoking the native method: it is allowed to
      // synchronously background the app before returning its promise.
      nativeShareFileRef.current = prepared.file;
      await Sharing.shareAsync(prepared.file.file.uri, {
        mimeType: prepared.grant.contentType,
        dialogTitle: t('recordings.shareAction'),
      });
    } catch (error) {
      if (operationOwnsUi()) {
        setErrorMessage(userMessageForError(error, t('recordings.shareFailed')));
      }
    } finally {
      const claimedFile = operationFile.current;
      if (claimedFile !== null) {
        if (shareFileRef.current === claimedFile) shareFileRef.current = null;
        if (nativeShareFileRef.current === claimedFile) nativeShareFileRef.current = null;
        if (claimedFile.isCurrent()) claimedFile.release();
      }
      if (shareControllerRef.current === controller) shareControllerRef.current = null;
      if (shareOperationRef.current === operation) {
        shareOperationRef.current = null;
        if (mountedRef.current === true) setSharing(false);
      }
    }
  }, [contextIsCurrent, identityToken, ownerId, playbackGrant, recordingId, releasePlayer, t]);

  const performDelete = useCallback(
    async (lifecycle: symbol, expectedIdentity: symbol) => {
      if (
        committedIdentityRef.current !== expectedIdentity ||
        !contextIsCurrent(lifecycle) ||
        deleteOperationRef.current ||
        shareOperationRef.current ||
        deletedRef.current === true
      ) {
        return;
      }
      releasePlayer();
      const operation = Symbol();
      deleteOperationRef.current = operation;
      const controller = new AbortController();
      deleteControllerRef.current = controller;
      setErrorMessage(null);
      setPhase('deleting');
      const operationIsCurrent = () =>
        committedIdentityRef.current === expectedIdentity && contextIsCurrent(lifecycle);
      try {
        await apiDeleteRecording(recordingId, controller.signal);
        if (!operationIsCurrent()) return;
        await Promise.all([
          queryClient.cancelQueries({ queryKey: ['recordings', ownerId], exact: true }),
          queryClient.cancelQueries({ queryKey: ['practice-history', ownerId], exact: true }),
        ]);
        if (!operationIsCurrent()) return;
        applyRecordingDeletionToCache(queryClient, ownerId, recordingId);
        void queryClient.invalidateQueries({ queryKey: ['recordings', ownerId], exact: true });
        void queryClient.invalidateQueries({
          queryKey: ['practice-history', ownerId],
          exact: true,
        });
        deletedRef.current = true;
        try {
          void Promise.resolve(onDeletedRef.current?.(recordingId)).catch(() => undefined);
        } catch {
          // The server and local caches already committed the deletion. A
          // synchronous or asynchronous consumer failure cannot roll that
          // successful state back.
        }
        setPhase('deleted');
        AccessibilityInfo.announceForAccessibility(t('recordings.deleted'));
      } catch (error) {
        if (!operationIsCurrent()) return;
        setErrorMessage(userMessageForError(error, t('recordings.deleteFailed')));
        // A delete failure says nothing about playback. Restore the ordinary
        // Play action instead of relabeling it "Try Again" (which retries
        // playback and was misleading beside a delete error message).
        setPhase('idle');
      } finally {
        if (deleteControllerRef.current === controller) deleteControllerRef.current = null;
        if (deleteOperationRef.current === operation) deleteOperationRef.current = null;
      }
    },
    [contextIsCurrent, ownerId, queryClient, recordingId, releasePlayer, t],
  );

  const confirmDelete = () => {
    const lifecycle = lifecycleRef.current;
    if (
      committedIdentityRef.current !== identityToken ||
      !contextIsCurrent(lifecycle) ||
      deleteOperationRef.current ||
      shareOperationRef.current ||
      deletedRef.current === true
    ) {
      return;
    }
    const currentRecordingLabel = recordingLabelRef.current;
    Alert.alert(
      t('recordings.deleteTitle'),
      currentRecordingLabel
        ? t('recordings.deleteBodyNamed', { name: currentRecordingLabel })
        : t('recordings.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('recordings.deleteAction'),
          style: 'destructive',
          onPress: () => void performDelete(lifecycle, identityToken),
        },
      ],
    );
  };

  if (phase === 'deleted') {
    return (
      <Text
        accessibilityLiveRegion="polite"
        style={styles.deletedText}
        testID="recording-playback-deleted"
      >
        {t('recordings.deleted')}
      </Text>
    );
  }

  const unavailable = recordingStatus === 'unavailable';
  const loading = phase === 'loading';
  const deleting = phase === 'deleting';
  const progressMax = Number.isFinite(duration) ? Math.max(duration, 1) : 1;
  const finiteCurrentTime = Number.isFinite(currentTime) ? currentTime : 0;
  const progressNow = Math.min(Math.max(finiteCurrentTime, 0), progressMax);
  const accessibleActionLabel = (action: string) =>
    recordingLabel ? `${action}: ${recordingLabel}` : action;
  return (
    <View
      testID="recording-playback-container"
      style={[styles.container, compact && styles.compact]}
    >
      <View testID="recording-playback-actions" style={styles.actions}>
        <Button
          title={
            phase === 'playing'
              ? t('recorder.pause')
              : phase === 'error'
                ? t('common.tryAgain')
                : t('recorder.play')
          }
          accessibilityLabel={
            phase === 'playing'
              ? accessibleActionLabel(t('recordings.pauseLabel'))
              : accessibleActionLabel(t('recordings.playLabel'))
          }
          variant="secondary"
          size="md"
          fullWidth
          loading={loading}
          disabled={deleting || sharing || unavailable}
          onPress={togglePlayback}
        />
        <Button
          title={sharing ? t('recordings.sharing') : t('recordings.shareAction')}
          accessibilityLabel={accessibleActionLabel(t('recordings.shareLabel'))}
          accessibilityHint={t('recordings.shareHint')}
          variant="secondary"
          size="md"
          fullWidth
          loading={sharing}
          disabled={deleting || loading || unavailable}
          onPress={() => void shareAudio()}
        />
        <Button
          title={t('recordings.deleteAction')}
          accessibilityLabel={accessibleActionLabel(t('recordings.deleteAction'))}
          accessibilityHint={t('recordings.deleteHint')}
          variant="danger"
          size="md"
          fullWidth
          loading={deleting}
          disabled={sharing}
          onPress={confirmDelete}
        />
      </View>
      <View testID="recording-playback-detail-slot" style={styles.detailSlot}>
        {loading && (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.statusText}
            testID="recording-playback-preparing"
          >
            {t('recordings.preparing')}
          </Text>
        )}
        {(phase === 'playing' || phase === 'paused') &&
          Number.isFinite(duration) &&
          duration > 0 && (
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={t('recordings.progressLabel')}
              accessibilityValue={{ min: 0, max: progressMax, now: progressNow }}
              style={styles.progressRow}
              testID="recording-playback-progress"
            >
              <View testID="recording-playback-progress-track" style={styles.progressTrack}>
                <View
                  testID="recording-playback-progress-fill"
                  style={[
                    styles.progressFill,
                    { width: `${Math.round((progressNow / progressMax) * 100)}%` },
                  ]}
                />
              </View>
              <Text testID="recording-playback-time" style={styles.timeText}>
                {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
              </Text>
            </View>
          )}
        {showStatus && recordingStatus === 'retention_pending' && phase === 'idle' && (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.statusText}
            testID="recording-playback-pending"
          >
            {t('recordings.pending')}
          </Text>
        )}
        {showStatus && unavailable && (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.statusText}
            testID="recording-playback-unavailable"
          >
            {t('recordings.unavailable')}
          </Text>
        )}
        {errorMessage && (
          <Text
            accessibilityRole="alert"
            style={styles.errorText}
            testID="recording-playback-error"
          >
            {errorMessage}
          </Text>
        )}
      </View>
    </View>
  );
}

const themedStyles = createThemedStyles(({ colors, radii, spacing }) => ({
  container: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.background,
  },
  compact: {
    padding: spacing.sm,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  detailSlot: {
    // Reserve enough room for the longest shipped two/three-line status copy
    // so Play/Pause/error transitions do not move surrounding list rows.
    minHeight: 88,
  },
  progressRow: {
    marginTop: spacing.sm,
  },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    borderRadius: radii.input,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timeText: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 13,
  },
  statusText: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 14,
  },
  errorText: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 14,
  },
  deletedText: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
  },
}));
