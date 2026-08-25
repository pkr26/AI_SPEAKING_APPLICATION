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
import type { HistoryPage, RecordingPage, RecordingStatus } from '../lib/types';
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
const MAX_PENDING_RETRIES = 3;

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function waitAbortable(milliseconds: number, signal: AbortSignal): Promise<void> {
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

function formatPlaybackTime(seconds: number): string {
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
  const [phase, setPhase] = useState<PlaybackPhase>(
    recordingStatus === 'unavailable' ? 'error' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const mountedRef = useRef(false);
  const focusedRef = useRef(false);
  const lifecycleRef = useRef(0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const playerListenerRef = useRef<{ remove: () => void } | null>(null);
  const playbackControllerRef = useRef<AbortController | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  const operationRef = useRef<symbol | null>(null);
  const playbackExpiryRef = useRef(0);
  const releaseOwnerRef = useRef<(() => void) | null>(null);
  const playbackOwnerRef = useRef(Symbol('submitted-recording-playback'));
  const previousIdentityRef = useRef({ ownerId, recordingId });
  const onDeletedRef = useRef(onDeleted);
  const sessionLease = useMemo(() => {
    void sessionVersion;
    void ownerId;
    return captureSessionLease();
  }, [captureSessionLease, ownerId, sessionVersion]);

  useEffect(() => {
    onDeletedRef.current = onDeleted;
  }, [onDeleted]);

  const contextIsCurrent = useCallback(
    (lifecycle = lifecycleRef.current) =>
      mountedRef.current &&
      focusedRef.current &&
      AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive' &&
      lifecycle === lifecycleRef.current &&
      isSessionLeaseCurrent(sessionLease),
    [isSessionLeaseCurrent, sessionLease],
  );

  const releasePlayer = useCallback((publish = true) => {
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
    if (publish && mountedRef.current) {
      setCurrentTime(0);
      setDuration(0);
      setPhase((current) => (current === 'deleted' || current === 'deleting' ? current : 'idle'));
    }
  }, []);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      focusedRef.current = false;
      lifecycleRef.current += 1;
      playbackControllerRef.current?.abort();
      deleteControllerRef.current?.abort();
      releasePlayer(false);
    };
  }, [releasePlayer]);

  useLayoutEffect(() => {
    const previous = previousIdentityRef.current;
    if (previous.ownerId === ownerId && previous.recordingId === recordingId) return;
    previousIdentityRef.current = { ownerId, recordingId };
    lifecycleRef.current += 1;
    playbackOwnerRef.current = Symbol('submitted-recording-playback');
    deleteControllerRef.current?.abort();
    releasePlayer(false);
    setErrorMessage(null);
    setPhase(recordingStatus === 'unavailable' ? 'error' : 'idle');
  }, [ownerId, recordingId, recordingStatus, releasePlayer]);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
        lifecycleRef.current += 1;
        releasePlayer();
      };
    }, [releasePlayer]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      lifecycleRef.current += 1;
      releasePlayer();
    });
    return () => subscription.remove();
  }, [releasePlayer]);

  const playbackGrant = useCallback(
    async (signal: AbortSignal) => {
      for (let pendingRetry = 0; pendingRetry <= MAX_PENDING_RETRIES; pendingRetry++) {
        try {
          return await apiGetRecordingPlaybackGrant(recordingId, signal);
        } catch (error) {
          if (!(
            error instanceof ApiError &&
            error.status === 409 &&
            error.code === 'REQUEST_IN_FLIGHT' &&
            pendingRetry < MAX_PENDING_RETRIES
          )) {
            throw error;
          }
          const waitSeconds = Math.min(Math.max(error.retryAfterSeconds ?? 2, 1), 5);
          await waitAbortable(waitSeconds * 1_000, signal);
        }
      }
      /* istanbul ignore next -- loop termination always throws the last API error */
      throw new Error('recording playback retry bound exhausted');
    },
    [recordingId],
  );

  const startPlayback = useCallback(async () => {
    if (phase === 'loading' || phase === 'deleting' || phase === 'deleted') return;
    const lifecycle = lifecycleRef.current;
    if (!contextIsCurrent(lifecycle)) return;
    const existing = playerRef.current;
    if (existing && playbackExpiryRef.current > Date.now() + PLAYBACK_EXPIRY_SAFETY_MS) {
      try {
        existing.play();
        setPhase('playing');
        return;
      } catch {
        releasePlayer(false);
      }
    }
    releasePlayer(false);
    const operation = Symbol('recording-playback-load');
    operationRef.current = operation;
    const controller = new AbortController();
    playbackControllerRef.current = controller;
    setErrorMessage(null);
    setPhase('loading');
    try {
      const grant = await playbackGrant(controller.signal);
      if (
        controller.signal.aborted ||
        operationRef.current !== operation ||
        !contextIsCurrent(lifecycle)
      ) {
        return;
      }
      const releaseOwner = await claimPlaybackOwner(playbackOwnerRef.current, () =>
        releasePlayer(),
      );
      if (!contextIsCurrent(lifecycle) || operationRef.current !== operation) {
        releaseOwner();
        return;
      }
      releaseOwnerRef.current = releaseOwner;
      await configurePlaybackAudioMode();
      if (!contextIsCurrent(lifecycle) || operationRef.current !== operation) {
        releasePlayer(false);
        return;
      }
      const player = createAudioPlayer(grant.playbackUrl, { updateInterval: 250 });
      playerRef.current = player;
      playbackExpiryRef.current = Date.now() + grant.expiresIn * 1_000;
      playerListenerRef.current = player.addListener('playbackStatusUpdate', (status) => {
        if (playerRef.current !== player || !contextIsCurrent(lifecycle)) return;
        if (status.error) {
          releasePlayer(false);
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
              releasePlayer(false);
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
      if (controller.signal.aborted || !contextIsCurrent(lifecycle)) return;
      releasePlayer(false);
      setErrorMessage(userMessageForError(error, t('recordings.playFailed')));
      setPhase('error');
    } finally {
      if (playbackControllerRef.current === controller) playbackControllerRef.current = null;
      if (operationRef.current === operation) operationRef.current = null;
    }
  }, [contextIsCurrent, phase, playbackGrant, releasePlayer, t]);

  const togglePlayback = () => {
    if (phase === 'playing') {
      try {
        playerRef.current?.pause();
        setPhase('paused');
      } catch {
        releasePlayer(false);
        setErrorMessage(t('recordings.playFailed'));
        setPhase('error');
      }
      return;
    }
    void startPlayback();
  };

  const performDelete = useCallback(async () => {
    const lifecycle = lifecycleRef.current;
    if (!contextIsCurrent(lifecycle) || phase === 'deleting' || phase === 'deleted') return;
    releasePlayer(false);
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setErrorMessage(null);
    setPhase('deleting');
    try {
      await apiDeleteRecording(recordingId, controller.signal);
      if (controller.signal.aborted || !contextIsCurrent(lifecycle)) return;
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ['recordings', ownerId], exact: true }),
        queryClient.cancelQueries({ queryKey: ['practice-history', ownerId], exact: true }),
      ]);
      if (!contextIsCurrent(lifecycle)) return;
      applyRecordingDeletionToCache(queryClient, ownerId, recordingId);
      void queryClient.invalidateQueries({ queryKey: ['recordings', ownerId], exact: true });
      void queryClient.invalidateQueries({ queryKey: ['practice-history', ownerId], exact: true });
      onDeletedRef.current?.(recordingId);
      setPhase('deleted');
      AccessibilityInfo.announceForAccessibility(t('recordings.deleted'));
    } catch (error) {
      if (controller.signal.aborted || !contextIsCurrent(lifecycle)) return;
      setErrorMessage(userMessageForError(error, t('recordings.deleteFailed')));
      setPhase('error');
    } finally {
      if (deleteControllerRef.current === controller) deleteControllerRef.current = null;
    }
  }, [contextIsCurrent, ownerId, phase, queryClient, recordingId, releasePlayer, t]);

  const confirmDelete = () => {
    if (phase === 'deleting' || phase === 'deleted') return;
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
          onPress: () => void performDelete(),
        },
      ],
    );
  };

  if (phase === 'deleted') {
    return (
      <Text accessibilityLiveRegion="polite" style={styles.deletedText}>
        {t('recordings.deleted')}
      </Text>
    );
  }

  const unavailable = recordingStatus === 'unavailable';
  const loading = phase === 'loading';
  const deleting = phase === 'deleting';
  const progressMax = Math.max(duration, 1);
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.actions}>
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
      {(phase === 'playing' || phase === 'paused') && duration > 0 && (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('recordings.progressLabel')}
          accessibilityValue={{ min: 0, max: progressMax, now: Math.min(currentTime, progressMax) }}
          style={styles.progressRow}
        >
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.round((currentTime / progressMax) * 100))}%` },
              ]}
            />
          </View>
          <Text style={styles.timeText}>
            {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
          </Text>
        </View>
      )}
      {recordingStatus === 'retention_pending' && phase === 'idle' && (
        <Text accessibilityLiveRegion="polite" style={styles.statusText}>
          {t('recordings.pending')}
        </Text>
      )}
      {unavailable && (
        <Text accessibilityLiveRegion="polite" style={styles.statusText}>
          {t('recordings.unavailable')}
        </Text>
      )}
      {errorMessage && (
        <Text accessibilityRole="alert" style={styles.errorText}>
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
