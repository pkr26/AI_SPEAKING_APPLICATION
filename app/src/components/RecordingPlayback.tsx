import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, Text, View } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import {
  ApiError,
  apiDeleteRecording,
  apiGetRecordingPlaybackGrant,
  userMessageForError,
} from '../lib/api';
import { claimPlaybackOwner, configurePlaybackAudioMode } from '../lib/audio-session';
import { useAuth } from '../lib/auth';
import { translate, useT } from '../lib/i18n';
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
  compact?: boolean;
  recordingLabel?: string;
  onDeleted?: (recordingId: string) => void;
}

const PLAYBACK_EXPIRY_SAFETY_MS = 10_000;

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const mountedRef = useRef<boolean | null>(null);
  const focusedRef = useRef<boolean | null>(null);
  const lifecycleRef = useRef(Symbol());
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerListenerRef = useRef<{ remove: () => void } | null>(null);
  const playbackControllerRef = useRef<AbortController | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  const operationRef = useRef<symbol | null>(null);
  const deleteOperationRef = useRef<symbol | null>(null);
  const deletedRef = useRef<boolean | null>(null);
  const playbackExpiryRef = useRef(0);
  const releaseOwnerRef = useRef<(() => void) | null>(null);
  const playbackOwnerRef = useRef(Symbol());
  const committedIdentityRef = useRef(identityToken);
  const onDeletedRef = useRef(onDeleted);
  const sessionLease = useMemo(() => {
    void ownerId;
    void sessionVersion;
    return captureSessionLease();
  }, [captureSessionLease, ownerId, sessionVersion]);

  useEffect(() => {
    onDeletedRef.current = onDeleted;
  }, [onDeleted]);

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

  const releasePlayer = useCallback(() => {
    playbackControllerRef.current?.abort();
    playbackControllerRef.current = null;
    operationRef.current = null;
    playbackExpiryRef.current = 0;
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
    releaseOwnerRef.current?.();
    releaseOwnerRef.current = null;
  }, []);

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
      releasePlayer();
    };
  }, [cancelDelete, releasePlayer]);

  useLayoutEffect(() => {
    committedIdentityRef.current = identityToken;
    lifecycleRef.current = Symbol();
    playbackOwnerRef.current = Symbol();
    cancelDelete();
    deletedRef.current = false;
    releasePlayer();
    // Identity changes must synchronously discard account-scoped UI before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setErrorMessage(null);
    resetPlaybackUi();
  }, [cancelDelete, identityToken, releasePlayer, resetPlaybackUi]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
        lifecycleRef.current = Symbol();
        cancelDelete();
        stopPlayback();
      };
    }, [cancelDelete, stopPlayback]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      lifecycleRef.current = Symbol();
      cancelDelete();
      stopPlayback();
    });
    return () => subscription.remove();
  }, [cancelDelete, stopPlayback]);

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
    if (operationRef.current || deleteOperationRef.current || deletedRef.current === true) {
      return;
    }
    const lifecycle = lifecycleRef.current;
    const existing = playerRef.current;
    if (existing && playbackExpiryRef.current > Date.now() + PLAYBACK_EXPIRY_SAFETY_MS) {
      try {
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
    try {
      const grant = await playbackGrant(controller.signal);
      if (!operationIsCurrent()) return;
      const releaseOwner = await claimPlaybackOwner(playbackOwnerRef.current, stopPlayback);
      if (!operationIsCurrent()) {
        releaseOwner();
        return;
      }
      releaseOwnerRef.current = releaseOwner;
      await configurePlaybackAudioMode();
      if (!operationIsCurrent()) {
        releasePlayer();
        return;
      }
      const player = createAudioPlayer(grant.playbackUrl, { updateInterval: 250 });
      playerRef.current = player;
      playbackExpiryRef.current = Date.now() + grant.expiresIn * 1_000;
      playerListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (playerRef.current !== player || !contextIsCurrent(lifecycle)) return;
        if (status.error) {
          releasePlayer();
          setErrorMessage(translate('recordings.playFailed'));
          setPhase('error');
          return;
        }
        setCurrentTime(status.currentTime);
        setDuration(status.duration);
        if (status.didJustFinish) {
          setPhase('paused');
          void Promise.resolve(player.seekTo(0)).catch(() => {
            if (playerRef.current === player) {
              releasePlayer();
              setErrorMessage(translate('recordings.playFailed'));
              setPhase('error');
            }
          });
        } else if (status.playing) {
          setPhase('playing');
        }
      });
      player.play();
      setPhase('playing');
    } catch (error) {
      if (!operationIsCurrent()) return;
      releasePlayer();
      setErrorMessage(userMessageForError(error, t('recordings.playFailed')));
      setPhase('error');
    } finally {
      if (playbackControllerRef.current === controller) playbackControllerRef.current = null;
      if (operationRef.current === operation) operationRef.current = null;
    }
  }, [contextIsCurrent, identityToken, playbackGrant, releasePlayer, stopPlayback, t]);

  const togglePlayback = () => {
    const lifecycle = lifecycleRef.current;
    if (committedIdentityRef.current !== identityToken || !contextIsCurrent(lifecycle)) {
      return;
    }
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

  const performDelete = useCallback(
    async (lifecycle: symbol, expectedIdentity: symbol) => {
      if (
        committedIdentityRef.current !== expectedIdentity ||
        !contextIsCurrent(lifecycle) ||
        deleteOperationRef.current ||
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
        onDeletedRef.current?.(recordingId);
        setPhase('deleted');
        AccessibilityInfo.announceForAccessibility(t('recordings.deleted'));
      } catch (error) {
        if (!operationIsCurrent()) return;
        setErrorMessage(userMessageForError(error, t('recordings.deleteFailed')));
        setPhase('error');
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
      deletedRef.current === true
    ) {
      return;
    }
    Alert.alert(
      t('recordings.deleteTitle'),
      recordingLabel
        ? t('recordings.deleteBodyNamed', { name: recordingLabel })
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
  return (
    <View
      testID="recording-playback-container"
      style={[styles.container, compact && styles.compact]}
    >
      <View testID="recording-playback-actions" style={styles.actions}>
        <Button
          title={
            unavailable
              ? t('recordings.unavailable')
              : loading
                ? t('recordings.preparing')
                : phase === 'playing'
                  ? t('recorder.pause')
                  : phase === 'error'
                    ? t('common.tryAgain')
                    : t('recorder.play')
          }
          accessibilityLabel={
            phase === 'playing' ? t('recordings.pauseLabel') : t('recordings.playLabel')
          }
          variant="secondary"
          size="sm"
          loading={loading}
          disabled={deleting || unavailable}
          onPress={togglePlayback}
        />
        <Button
          title={t('recordings.deleteAction')}
          accessibilityHint={t('recordings.deleteHint')}
          variant="quiet"
          size="sm"
          loading={deleting}
          onPress={confirmDelete}
        />
      </View>
      {(phase === 'playing' || phase === 'paused') && Number.isFinite(duration) && duration > 0 && (
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
      {recordingStatus === 'retention_pending' && phase === 'idle' && (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.statusText}
          testID="recording-playback-pending"
        >
          {t('recordings.pending')}
        </Text>
      )}
      {unavailable && (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.statusText}
          testID="recording-playback-unavailable"
        >
          {t('recordings.unavailable')}
        </Text>
      )}
      {errorMessage && (
        <Text accessibilityRole="alert" style={styles.errorText} testID="recording-playback-error">
          {errorMessage}
        </Text>
      )}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
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
