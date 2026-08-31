import { InfiniteData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createAudioPlayer } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import React from 'react';
import { AccessibilityInfo, Alert, AppState, StyleSheet } from 'react-native';

import RecordingPlayback, {
  applyRecordingDeletionToCache,
  formatPlaybackTime,
  removeRecordingFromHistoryPages,
  removeRecordingFromPages,
  runWithAbortableTimeout,
  waitAbortable,
} from '../src/components/RecordingPlayback';
import { ApiError, apiDeleteRecording, apiGetRecordingPlaybackGrant } from '../src/lib/api';
import {
  AUDIO_MODE_OPERATION_TIMEOUT_MS,
  claimPlaybackOwner,
  configurePlaybackAudioMode,
  configureRecordingAudioMode,
  getSubmittedRecordingPlaybackActive,
  serializeAudioMode,
  stopActivePlayback,
  subscribeSubmittedRecordingPlaybackActive,
} from '../src/lib/audio-session';
import { useAuth } from '../src/lib/auth';
import { translateFor } from '../src/lib/i18n';
import {
  claimPrivatePlaybackFile,
  downloadPrivatePlaybackFile,
  type OwnedPrivateFile,
} from '../src/lib/private-artifacts';
import { layout, lightColors, radii, spacing } from '../src/lib/theme';
import type { HistoryPage, RecordingPage } from '../src/lib/types';

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_OWNER_ID = '550e8400-e29b-41d4-a716-446655440099';
const RECORDING_ID = '550e8400-e29b-41d4-a716-446655440011';
const OTHER_RECORDING_ID = '550e8400-e29b-41d4-a716-446655440012';
const t = (key: Parameters<typeof translateFor>[1], params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const asMock = (value: unknown) => value as jest.Mock;

interface MockPrivatePlaybackFile extends OwnedPrivateFile {
  release: jest.Mock;
}

const playbackFiles: MockPrivatePlaybackFile[] = [];

jest.mock('../src/lib/private-artifacts', () => ({
  claimPrivatePlaybackFile: jest.fn(),
  cleanupPrivateArtifacts: jest.fn(async () => undefined),
  downloadPrivatePlaybackFile: jest.fn(async () => undefined),
}));

function recordingActionLabel(
  key:
    | 'recordings.playLabel'
    | 'recordings.pauseLabel'
    | 'recordings.shareLabel'
    | 'recordings.deleteAction',
  recordingLabel: string,
): string {
  return `${t(key)}: ${recordingLabel}`;
}

interface MockPlayer {
  isLoaded: boolean;
  currentStatus: Record<string, unknown>;
  muted: boolean;
  volume: number;
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
  addListener: jest.Mock;
  emit: (status: Record<string, unknown>) => void;
  emitStale: (status: Record<string, unknown>) => void;
  listenerRemove: jest.Mock;
}

const players: MockPlayer[] = [];
let mockNextPlayerPlayError: Error | null = null;
let mockNextAddListenerError: Error | null = null;
let mockAutoLoadPlayer = true;
let mockPlayerInitiallyLoaded = false;
const mockSetAudioModeAsync = jest.fn<Promise<void>, [unknown]>(
  async (_options: unknown) => undefined,
);
let mockAppStateListener: ((state: string) => void) | null = null;
const mockAppStateSubscriptionRemove = jest.fn(() => (mockAppStateListener = null));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => {
    let listener: ((status: Record<string, unknown>) => void) | null = null;
    let lastListener: ((status: Record<string, unknown>) => void) | null = null;
    const listenerRemove = jest.fn(() => (listener = null));
    const initialStatus = {
      currentTime: 0,
      duration: 0,
      playing: false,
      isLoaded: mockPlayerInitiallyLoaded,
      isBuffering: false,
      didJustFinish: false,
      error: null,
    };
    const player: MockPlayer = {
      isLoaded: mockPlayerInitiallyLoaded,
      currentStatus: initialStatus,
      // Deliberately hostile defaults prove the component makes every fresh
      // retained-recording player audible before requesting playback.
      muted: true,
      volume: 0,
      play: jest.fn(() => {
        if (!mockAutoLoadPlayer) return;
        void Promise.resolve().then(() =>
          player.emit({
            currentTime: 0,
            duration: 0,
            playing: true,
            isLoaded: true,
            isBuffering: false,
            didJustFinish: false,
            error: null,
          }),
        );
      }),
      pause: jest.fn(),
      seekTo: jest.fn(async () => undefined),
      remove: jest.fn(),
      addListener: jest.fn((_event: string, next: (status: Record<string, unknown>) => void) => {
        listener = next;
        lastListener = next;
        if (mockAutoLoadPlayer) {
          void Promise.resolve().then(() =>
            player.emit({
              currentTime: 0,
              duration: 0,
              playing: false,
              isLoaded: true,
              isBuffering: false,
              didJustFinish: false,
              error: null,
            }),
          );
        }
        return { remove: listenerRemove };
      }),
      emit: (status) => {
        player.currentStatus = { ...player.currentStatus, ...status };
        if (typeof status.isLoaded === 'boolean') player.isLoaded = status.isLoaded;
        listener?.(player.currentStatus);
      },
      emitStale: (status) => lastListener?.(status),
      listenerRemove,
    };
    if (mockNextPlayerPlayError) {
      const error = mockNextPlayerPlayError;
      mockNextPlayerPlayError = null;
      player.play.mockImplementationOnce(() => {
        throw error;
      });
    }
    if (mockNextAddListenerError) {
      const error = mockNextAddListenerError;
      mockNextAddListenerError = null;
      player.addListener.mockImplementationOnce(() => {
        throw error;
      });
    }
    players.push(player);
    return player;
  }),
  setAudioModeAsync: (options: unknown) => mockSetAudioModeAsync(options),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

interface FocusRegistration {
  callback: () => void | (() => void);
  cleanup: (() => void) | null;
}

const focusRegistrations: FocusRegistration[] = [];
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const registration = { callback, cleanup: null as (() => void) | null };
        focusRegistrations.push(registration);
        const focusCleanup = callback();
        registration.cleanup = typeof focusCleanup === 'function' ? focusCleanup : null;
        return () => {
          registration.cleanup?.();
          const index = focusRegistrations.indexOf(registration);
          if (index >= 0) focusRegistrations.splice(index, 1);
        };
      }, [callback]);
    },
  };
});

let leaseCurrent = true;
let leaseGeneration = 1;
const mockAuth = {
  token: 'token',
  user: {
    id: OWNER_ID,
    name: 'Learner',
    email: 'learner@example.com',
    nativeLanguage: 'te' as const,
    uiLanguage: 'en' as const,
    cefrLevel: 'B1' as const,
    diagnosticCompleted: true,
  },
  sessionVersion: 1,
  isRestoring: false,
  restoreError: null,
  retrySessionRestore: jest.fn(),
  resetStoredSession: jest.fn(),
  captureSessionLease: jest.fn(() => ({ generation: leaseGeneration }) as never),
  isSessionLeaseCurrent: jest.fn(
    (lease: unknown) =>
      (lease as { generation?: number } | undefined)?.generation === leaseGeneration &&
      leaseCurrent,
  ),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
  setUser: jest.fn(),
};

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: jest.fn(() => mockAuth),
}));

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiGetRecordingPlaybackGrant: jest.fn(),
  apiDeleteRecording: jest.fn(),
}));

function grant(recordingId = RECORDING_ID) {
  return {
    recordingId,
    playbackUrl:
      'https://private.s3.us-west-1.amazonaws.com/object?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=x&X-Amz-Date=20260825T000000Z&X-Amz-Expires=60&X-Amz-SignedHeaders=host&X-Amz-Signature=abc',
    expiresIn: 60,
    contentType: 'audio/mp4',
  };
}

function distinctGrant(recordingId: string) {
  return {
    ...grant(recordingId),
    playbackUrl: grant(recordingId).playbackUrl.replace('/object?', `/${recordingId}?`),
  };
}

function recordingItem(id: string): RecordingPage['items'][number] {
  return {
    id,
    questionId: OTHER_RECORDING_ID,
    context: 'practice',
    promptWord: 'courage',
    questionText: 'Describe courage.',
    cefrLevel: 'B1',
    contentType: 'audio/mp4',
    sizeBytes: 100,
    durationMs: 1_000,
    status: 'available',
    createdAt: '2026-08-25T00:00:00.000Z',
    availableAt: '2026-08-25T00:00:01.000Z',
  };
}

function historyItem(id: string, recordingId: string | null): HistoryPage['items'][number] {
  return {
    id,
    questionId: OTHER_RECORDING_ID,
    promptWord: 'courage',
    questionText: 'Describe courage.',
    cefrLevel: 'B1',
    context: 'practice',
    nativeLanguage: null,
    cycleId: '550e8400-e29b-41d4-a716-446655440020',
    attemptNo: 1,
    score: 80,
    passed: true,
    understood: null,
    transcript: 'I was brave.',
    translatedTranscript: null,
    modelAnswer: null,
    feedback: 'Good answer.',
    createdAt: '2026-08-25T00:00:00.000Z',
    recordingId,
    recordingStatus: recordingId ? 'available' : null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(turns = 10): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) await Promise.resolve();
}

function setAppState(state: 'active' | 'background' | 'inactive'): void {
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: state,
  });
}

async function emitAppState(state: 'active' | 'background' | 'inactive'): Promise<void> {
  setAppState(state);
  await act(async () => mockAppStateListener?.(state));
}

async function refocus(index = 0): Promise<void> {
  await act(async () => {
    const nextCleanup = focusRegistrations[index].callback();
    focusRegistrations[index].cleanup = typeof nextCleanup === 'function' ? nextCleanup : null;
  });
}

const queryClients: QueryClient[] = [];
async function renderPlayback(props: Partial<React.ComponentProps<typeof RecordingPlayback>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClients.push(queryClient);
  const result = await render(
    <QueryClientProvider client={queryClient}>
      <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} {...props} />
    </QueryClientProvider>,
  );
  return { ...result, queryClient };
}

function rawButtonHandler(accessibilityLabel: string): () => void {
  type PressFiber = { memoizedProps?: { onPress?: unknown }; return: PressFiber | null };
  let fiber = screen.getByRole('button', { name: accessibilityLabel })
    .unstable_fiber as PressFiber | null;
  while (fiber && typeof fiber.memoizedProps?.onPress !== 'function') fiber = fiber.return;
  if (typeof fiber?.memoizedProps?.onPress !== 'function') {
    throw new Error(`Missing Button handler for ${accessibilityLabel}`);
  }
  return fiber.memoizedProps.onPress as () => void;
}

type AlertAction = { style?: string; onPress?: () => void };

function alertActions(callIndex = 0): AlertAction[] {
  expect(Alert.alert).toHaveBeenCalled();
  const call = asMock(Alert.alert).mock.calls.at(callIndex);
  expect(call).toBeDefined();
  const actions = call?.[2];
  expect(actions).toEqual(expect.any(Array));
  return actions as AlertAction[];
}

beforeEach(async () => {
  await stopActivePlayback();
  leaseCurrent = true;
  leaseGeneration = 1;
  mockAuth.sessionVersion = 1;
  setAppState('active');
  players.length = 0;
  playbackFiles.length = 0;
  asMock(claimPrivatePlaybackFile)
    .mockReset()
    .mockImplementation(() => {
      let current = true;
      const artifact: MockPrivatePlaybackFile = {
        file: { uri: `file:///mock-private/playback-${playbackFiles.length + 1}.m4a` } as never,
        isCurrent: () => current,
        release: jest.fn(() => {
          current = false;
        }),
      };
      playbackFiles.push(artifact);
      return artifact;
    });
  asMock(downloadPrivatePlaybackFile).mockReset().mockResolvedValue(undefined);
  mockNextPlayerPlayError = null;
  mockNextAddListenerError = null;
  mockAutoLoadPlayer = true;
  mockPlayerInitiallyLoaded = false;
  focusRegistrations.length = 0;
  asMock(useAuth).mockClear();
  mockAuth.captureSessionLease.mockClear();
  mockAuth.isSessionLeaseCurrent.mockClear();
  asMock(apiGetRecordingPlaybackGrant).mockReset();
  asMock(apiDeleteRecording).mockReset();
  asMock(apiGetRecordingPlaybackGrant).mockResolvedValue(grant());
  asMock(apiDeleteRecording).mockResolvedValue(undefined);
  asMock(Sharing.isAvailableAsync).mockReset().mockResolvedValue(true);
  asMock(Sharing.shareAsync).mockReset().mockResolvedValue(undefined);
  mockSetAudioModeAsync.mockClear();
  mockAppStateSubscriptionRemove.mockClear();
  asMock(createAudioPlayer).mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    listener: (state: string) => void,
  ) => {
    mockAppStateListener = listener;
    return { remove: mockAppStateSubscriptionRemove };
  }) as never);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  asMock(AccessibilityInfo.announceForAccessibility).mockClear();
});

afterEach(async () => {
  await cleanup();
  for (const client of queryClients.splice(0)) client.clear();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('recording playback primitives', () => {
  it('formats whole, fractional, negative, and non-finite native times', () => {
    expect(formatPlaybackTime(0)).toBe('0:00');
    expect(formatPlaybackTime(9.99)).toBe('0:09');
    expect(formatPlaybackTime(59)).toBe('0:59');
    expect(formatPlaybackTime(60)).toBe('1:00');
    expect(formatPlaybackTime(3_661.9)).toBe('61:01');
    expect(formatPlaybackTime(-9)).toBe('0:00');
    expect(formatPlaybackTime(Number.NaN)).toBe('0:00');
    expect(formatPlaybackTime(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('rejects a pre-aborted wait with the stable AbortError contract', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(waitAbortable(60_000, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Aborted',
    });
  });

  it('registers one abort listener and removes it when the timer resolves', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const add = jest.spyOn(controller.signal, 'addEventListener');
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    let outcome = 'pending';
    void waitAbortable(1_250, controller.signal).then(
      () => (outcome = 'resolved'),
      () => (outcome = 'rejected'),
    );

    expect(add).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
    await jest.advanceTimersByTimeAsync(1_249);
    expect(outcome).toBe('pending');
    await jest.advanceTimersByTimeAsync(1);
    expect(outcome).toBe('resolved');
    expect(remove).toHaveBeenCalledWith('abort', add.mock.calls[0][1]);
  });

  it('cancels the timer and rejects when abort fires during the wait', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    let outcome: unknown = 'pending';
    void waitAbortable(10_000, controller.signal).then(
      () => (outcome = 'resolved'),
      (error: unknown) => (outcome = error),
    );

    controller.abort();
    await flushMicrotasks();
    expect(outcome).toMatchObject({ name: 'AbortError', message: 'Aborted' });
    await jest.advanceTimersByTimeAsync(10_000);
    expect(outcome).toMatchObject({ name: 'AbortError' });
    expect(remove).not.toHaveBeenCalled();
  });

  it('aborts a never-settling operation at its deadline', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const operation = deferred<void>();
    const result = runWithAbortableTimeout(() => operation.promise, controller, 1_000);
    const rejection = expect(result).rejects.toThrow('Operation timed out');

    await jest.advanceTimersByTimeAsync(999);
    expect(controller.signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(1);

    expect(controller.signal.aborted).toBe(true);
    await rejection;
    operation.resolve(undefined);
  });
});

describe('RecordingPlayback', () => {
  beforeAll(async () => {
    leaseCurrent = true;
    setAppState('active');
    asMock(apiGetRecordingPlaybackGrant).mockReset().mockResolvedValue(grant());
    mockSetAudioModeAsync.mockResolvedValue(undefined);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} />
      </QueryClientProvider>,
    );

    const press = fireEvent.press(view.getByRole('button', { name: t('recordings.playLabel') }));
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    await press;

    await view.unmount();
    queryClient.clear();
    await stopActivePlayback();
  });

  it('renders the idle controls, accessibility contract, and complete light-theme layout', async () => {
    await renderPlayback();

    const play = screen.getByRole('button', { name: t('recordings.playLabel') });
    const share = screen.getByRole('button', { name: t('recordings.shareLabel') });
    const remove = screen.getByRole('button', { name: t('recordings.deleteAction') });
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    expect(screen.getByText(t('recordings.shareAction'))).toBeTruthy();
    expect(screen.queryByText(t('recordings.sharing'))).toBeNull();
    expect(play.props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(remove.props.accessibilityHint).toBe(t('recordings.deleteHint'));
    expect(share.props.accessibilityHint).toBe(t('recordings.shareHint'));
    expect(share.props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(remove.props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(StyleSheet.flatten(play.props.style)).toMatchObject({
      minHeight: layout.minimumTarget,
      alignSelf: 'stretch',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderWidth: 1,
      borderColor: lightColors.primary,
    });
    expect(StyleSheet.flatten(remove.props.style)).toMatchObject({
      minHeight: layout.minimumTarget,
      alignSelf: 'stretch',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: lightColors.danger,
    });
    expect(StyleSheet.flatten(share.props.style)).toMatchObject({
      minHeight: layout.minimumTarget,
      alignSelf: 'stretch',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderWidth: 1,
      borderColor: lightColors.primary,
    });
    expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(screen.queryByTestId('recording-playback-pending')).toBeNull();

    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-container').props.style),
    ).toEqual({
      marginTop: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: lightColors.border,
      borderRadius: radii.input,
      backgroundColor: lightColors.background,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-actions').props.style),
    ).toEqual({
      alignSelf: 'stretch',
      gap: spacing.sm,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-detail-slot').props.style),
    ).toEqual({ minHeight: 88 });
  });

  it('includes the recording label in every playback action name', async () => {
    const recordingLabel = 'courage';
    await renderPlayback({ recordingLabel });

    const playLabel = recordingActionLabel('recordings.playLabel', recordingLabel);
    const pauseLabel = recordingActionLabel('recordings.pauseLabel', recordingLabel);
    const shareLabel = recordingActionLabel('recordings.shareLabel', recordingLabel);
    const deleteLabel = recordingActionLabel('recordings.deleteAction', recordingLabel);
    expect(screen.getByRole('button', { name: playLabel })).toBeTruthy();
    expect(screen.getByRole('button', { name: deleteLabel })).toBeTruthy();
    expect(screen.getByRole('button', { name: shareLabel })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('recordings.playLabel') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('recordings.deleteAction') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('recordings.shareLabel') })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: playLabel }));
    await waitFor(() => expect(screen.getByRole('button', { name: pauseLabel })).toBeTruthy());
  });

  it('shares only an app-owned private file and never exposes the signed playback URL', async () => {
    await renderPlayback();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.shareLabel') }));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledTimes(1));

    expect(Sharing.isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledWith(
      RECORDING_ID,
      expect.any(AbortSignal),
    );
    expect(claimPrivatePlaybackFile).toHaveBeenCalledWith(
      OWNER_ID,
      RECORDING_ID,
      grant().contentType,
    );
    expect(downloadPrivatePlaybackFile).toHaveBeenCalledWith(
      grant().playbackUrl,
      playbackFiles[0],
      expect.any(AbortSignal),
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(playbackFiles[0].file.uri, {
      mimeType: grant().contentType,
      dialogTitle: t('recordings.shareAction'),
    });
    expect(Sharing.shareAsync).not.toHaveBeenCalledWith(grant().playbackUrl, expect.anything());
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: t('recordings.shareLabel') }).props.accessibilityState,
    ).toEqual({
      disabled: false,
      busy: false,
    });
  });

  it('coalesces same-frame Share presses behind one owned operation', async () => {
    const available = deferred<boolean>();
    asMock(Sharing.isAvailableAsync).mockReturnValueOnce(available.promise);
    await renderPlayback();
    const share = rawButtonHandler(t('recordings.shareLabel'));

    await act(async () => {
      share();
      share();
      await Promise.resolve();
    });
    expect(Sharing.isAvailableAsync).toHaveBeenCalledTimes(1);
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
    expect(screen.getByText(t('recordings.sharing'))).toBeTruthy();
    // While the share owns the recording's native resources, Play reports the
    // cross-operation busy state instead of a silent startPlayback no-op.
    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });
    expect(
      screen.getByRole('button', { name: t('recordings.deleteAction') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });

    await act(async () => available.resolve(true));
    await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledTimes(1));
  });

  it('times out stalled foreground share preparation and restores every action', async () => {
    jest.useFakeTimers();
    const download = deferred<void>();
    asMock(downloadPrivatePlaybackFile).mockReturnValueOnce(download.promise);
    await renderPlayback();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: t('recordings.shareLabel') }));
      await flushMicrotasks();
    });
    expect(downloadPrivatePlaybackFile).toHaveBeenCalledTimes(1);
    const signal = asMock(downloadPrivatePlaybackFile).mock.calls[0][2] as AbortSignal;
    await act(async () => jest.advanceTimersByTimeAsync(29_999));
    expect(signal.aborted).toBe(false);
    expect(screen.getByText(t('recordings.sharing'))).toBeTruthy();

    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(signal.aborted).toBe(true);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.shareFailed'));
    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    expect(
      screen.getByRole('button', { name: t('recordings.shareLabel') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    expect(
      screen.getByRole('button', { name: t('recordings.deleteAction') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });

    await act(async () => download.resolve(undefined));
    await flushMicrotasks();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('reports unavailable or failed sharing without leaking a temporary artifact', async () => {
    asMock(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.shareLabel') }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.shareUnavailable')),
    );
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
    expect(claimPrivatePlaybackFile).not.toHaveBeenCalled();

    asMock(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
    asMock(Sharing.shareAsync).mockRejectedValueOnce(new Error('native share failed'));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.shareLabel') }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.shareFailed')),
    );
    expect(playbackFiles).toHaveLength(1);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
  });

  it('aborts and removes a partial share file when the app backgrounds', async () => {
    const download = deferred<void>();
    asMock(downloadPrivatePlaybackFile).mockReturnValueOnce(download.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.shareLabel') }));
    await waitFor(() => expect(downloadPrivatePlaybackFile).toHaveBeenCalledTimes(1));
    const signal = asMock(downloadPrivatePlaybackFile).mock.calls[0][2] as AbortSignal;

    await emitAppState('background');
    expect(signal.aborted).toBe(true);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(Sharing.shareAsync).not.toHaveBeenCalled();

    await act(async () => download.reject(signal.reason));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['blur', 'unmount', 'logout'] as const)(
    'aborts and removes a partial share file on %s',
    async (boundary) => {
      const download = deferred<void>();
      asMock(downloadPrivatePlaybackFile).mockReturnValueOnce(download.promise);
      const view = await renderPlayback();
      await fireEvent.press(screen.getByRole('button', { name: t('recordings.shareLabel') }));
      await waitFor(() => expect(downloadPrivatePlaybackFile).toHaveBeenCalledTimes(1));
      const signal = asMock(downloadPrivatePlaybackFile).mock.calls[0][2] as AbortSignal;

      if (boundary === 'blur') {
        await act(async () => focusRegistrations[0].cleanup?.());
      } else if (boundary === 'unmount') {
        await view.unmount();
      } else {
        mockAuth.sessionVersion = 2;
        leaseGeneration = 2;
        await view.rerender(
          <QueryClientProvider client={view.queryClient}>
            <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} />
          </QueryClientProvider>,
        );
      }
      expect(signal.aborted).toBe(true);
      expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
      expect(Sharing.shareAsync).not.toHaveBeenCalled();

      await act(async () => download.reject(signal.reason));
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it.each(['background', 'blur', 'unmount', 'logout'] as const)(
    'keeps a handed-off share file through %s until the native promise settles',
    async (boundary) => {
      const nativeShare = deferred<void>();
      asMock(Sharing.shareAsync).mockReturnValueOnce(nativeShare.promise);
      const view = await renderPlayback();
      await fireEvent.press(screen.getByRole('button', { name: t('recordings.shareLabel') }));
      await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledTimes(1));
      expect(playbackFiles).toHaveLength(1);
      expect(playbackFiles[0].release).not.toHaveBeenCalled();

      if (boundary === 'background') {
        await emitAppState('background');
      } else if (boundary === 'blur') {
        await act(async () => focusRegistrations[0].cleanup?.());
      } else if (boundary === 'unmount') {
        await view.unmount();
      } else {
        mockAuth.sessionVersion = 2;
        leaseGeneration = 2;
        await view.rerender(
          <QueryClientProvider client={view.queryClient}>
            <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} />
          </QueryClientProvider>,
        );
      }

      // The OS already owns the URI. Removing it here can make Android's share
      // chooser deliver an empty or missing attachment.
      expect(playbackFiles[0].release).not.toHaveBeenCalled();

      await act(async () => {
        if (boundary === 'logout') nativeShare.reject(new Error('stale native share failure'));
        else nativeShare.resolve(undefined);
        await flushMicrotasks();
      });
      expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
      if (boundary !== 'unmount') expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('applies only the compact padding override when requested', async () => {
    await renderPlayback({ compact: true });
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-container').props.style),
    ).toEqual(expect.objectContaining({ padding: spacing.sm, marginTop: spacing.md }));
  });

  it('renders retention-pending copy only while idle with its exact status style', async () => {
    const pending = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant).mockReturnValue(pending.promise);
    await renderPlayback({ recordingStatus: 'retention_pending' });
    const status = screen.getByTestId('recording-playback-pending');
    expect(status.parent?.props.testID).toBe('recording-playback-detail-slot');
    expect(status).toHaveTextContent(t('recordings.pending'));
    expect(status.props.accessibilityLiveRegion).toBe('polite');
    expect(StyleSheet.flatten(status.props.style)).toEqual({
      marginTop: spacing.sm,
      color: lightColors.muted,
      fontSize: 14,
    });

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    expect(screen.queryByTestId('recording-playback-pending')).toBeNull();
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    expect(screen.getByTestId('recording-playback-preparing').props.accessibilityLiveRegion).toBe(
      'polite',
    );
    expect(screen.getByTestId('recording-playback-preparing').parent?.props.testID).toBe(
      'recording-playback-detail-slot',
    );
    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: true });
  });

  it('fetches a short-lived URL only after Play and handles play, progress, pause, and rewind', async () => {
    await renderPlayback();
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledWith(
      RECORDING_ID,
      expect.any(AbortSignal),
    );
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      allowsRecording: false,
      allowsBackgroundRecording: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    expect(claimPrivatePlaybackFile).toHaveBeenCalledWith(
      OWNER_ID,
      RECORDING_ID,
      grant().contentType,
    );
    expect(downloadPrivatePlaybackFile).toHaveBeenCalledWith(
      grant().playbackUrl,
      playbackFiles[0],
      expect.any(AbortSignal),
    );
    expect(createAudioPlayer).toHaveBeenCalledWith(playbackFiles[0].file.uri, {
      updateInterval: 250,
    });
    expect(players[0].addListener).toHaveBeenCalledWith(
      'playbackStatusUpdate',
      expect.any(Function),
    );
    expect(players[0]).toMatchObject({ muted: false, volume: 1 });
    expect(players[0].play).toHaveBeenCalledTimes(1);
    expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
    expect(screen.queryByText(t('recorder.play'))).toBeNull();

    await act(async () => {
      players[0].emit({
        currentTime: 2,
        duration: 8,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByText('0:02 / 0:08')).toBeTruthy();
    expect(screen.getByTestId('recording-playback-progress').props).toMatchObject({
      accessible: true,
      accessibilityRole: 'progressbar',
      accessibilityLabel: t('recordings.progressLabel'),
      accessibilityValue: { min: 0, max: 8, now: 2 },
    });
    expect(screen.getByTestId('recording-playback-progress').parent?.props.testID).toBe(
      'recording-playback-detail-slot',
    );
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-progress').props.style),
    ).toEqual({
      marginTop: spacing.sm,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-progress-track').props.style),
    ).toEqual({
      height: 5,
      overflow: 'hidden',
      borderRadius: radii.input,
      backgroundColor: lightColors.border,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-progress-fill').props.style),
    ).toEqual({ height: '100%', backgroundColor: lightColors.primary, width: '25%' });
    expect(StyleSheet.flatten(screen.getByTestId('recording-playback-time').props.style)).toEqual({
      marginTop: spacing.xs,
      color: lightColors.muted,
      fontSize: 13,
    });

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.pauseLabel') }));
    expect(players[0].pause).toHaveBeenCalled();
    expect(screen.getByTestId('recording-playback-progress')).toBeTruthy();
    await act(async () => {
      players[0].emit({
        currentTime: 2,
        duration: 8,
        playing: false,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByRole('button', { name: t('recordings.playLabel') })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    expect(players[0].play).toHaveBeenCalledTimes(2);

    await act(async () => {
      players[0].emit({
        currentTime: 8,
        duration: 8,
        playing: false,
        didJustFinish: true,
        error: null,
      });
    });
    expect(players[0].seekTo).toHaveBeenCalledWith(0);
    expect(screen.getByRole('button', { name: t('recordings.playLabel') })).toBeTruthy();
    expect(screen.getByTestId('recording-playback-progress')).toBeTruthy();

    await act(async () => {
      players[0].emit({
        currentTime: 8,
        duration: 8,
        playing: true,
        didJustFinish: true,
        error: null,
      });
    });
    expect(screen.getByRole('button', { name: t('recordings.playLabel') })).toBeTruthy();

    await act(async () => {
      players[0].emit({
        currentTime: 0,
        duration: 8,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
  });

  it('waits for a downloaded source to load before requesting native playback', async () => {
    mockAutoLoadPlayer = false;
    await renderPlayback();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    const player = players[0];
    expect(player).toMatchObject({ muted: false, volume: 1 });
    expect(player.play).not.toHaveBeenCalled();
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await act(async () => {
      player.emit({
        currentTime: 0,
        duration: 0,
        playing: false,
        isLoaded: false,
        isBuffering: true,
        didJustFinish: false,
        error: null,
      });
    });
    expect(player.play).not.toHaveBeenCalled();
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await act(async () => {
      player.emit({
        currentTime: 0,
        duration: 8,
        playing: false,
        isLoaded: true,
        isBuffering: false,
        didJustFinish: false,
        error: null,
      });
    });
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await act(async () => {
      player.emit({
        currentTime: 0,
        duration: 8,
        playing: true,
        isLoaded: true,
        isBuffering: false,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
  });

  it('starts an already-loaded download cache hit after listener installation', async () => {
    mockAutoLoadPlayer = false;
    mockPlayerInitiallyLoaded = true;
    await renderPlayback();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    const player = players[0];
    expect(player.addListener.mock.invocationCallOrder[0]).toBeLessThan(
      player.play.mock.invocationCallOrder[0],
    );
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player).toMatchObject({ muted: false, volume: 1 });
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await act(async () => {
      player.emit({
        currentTime: 0,
        duration: 8,
        playing: true,
        isLoaded: true,
        isBuffering: false,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
  });

  it('fails a native player that never loads without letting a retained Play create duplicates', async () => {
    jest.useFakeTimers();
    mockAutoLoadPlayer = false;
    await renderPlayback();
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));

    await act(async () => {
      retainedPlay();
      await flushMicrotasks();
    });
    expect(players).toHaveLength(1);
    expect(players[0].play).not.toHaveBeenCalled();

    await act(async () => {
      retainedPlay();
      retainedPlay();
      await flushMicrotasks();
    });
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTimeAsync(29_999));
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();
    expect(players[0].remove).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(players[0].pause).toHaveBeenCalledTimes(1);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
  });

  it('fails preparation at the audio-mode deadline when the native audio mode never settles', async () => {
    jest.useFakeTimers();
    // The serialized audio-mode queue never settles, so the configure await
    // inside preparation can only end through its deadline. One-shot so the
    // shared mock keeps its resolving default for later tests.
    mockSetAudioModeAsync.mockReturnValueOnce(new Promise<void>(() => undefined));
    await renderPlayback();
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));

    await act(async () => {
      retainedPlay();
      await flushMicrotasks();
    });
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await act(async () => jest.advanceTimersByTimeAsync(AUDIO_MODE_OPERATION_TIMEOUT_MS - 1));
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await act(async () => jest.advanceTimersByTimeAsync(1));
    // Behaves exactly like the prepare-failure path: message, error phase, and
    // every claimed resource released; no private file was claimed and no
    // player was ever created because the configure await precedes both.
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();
    expect(players).toHaveLength(0);
    expect(claimPrivatePlaybackFile).not.toHaveBeenCalled();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
  });

  it('cancels the preparation watchdog once native playback is confirmed', async () => {
    jest.useFakeTimers();
    mockAutoLoadPlayer = false;
    await renderPlayback();
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));

    await act(async () => {
      retainedPlay();
      await flushMicrotasks();
    });
    const player = players[0];
    await act(async () => {
      player.emit({
        currentTime: 0,
        duration: 8,
        playing: false,
        isLoaded: true,
        isBuffering: false,
        didJustFinish: false,
        error: null,
      });
      player.emit({
        currentTime: 0,
        duration: 8,
        playing: true,
        isLoaded: true,
        isBuffering: false,
        didJustFinish: false,
        error: null,
      });
    });
    await act(async () => jest.advanceTimersByTimeAsync(30_000));
    expect(player.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
  });

  it('clears the preparation watchdog when the position advances without a playing status', async () => {
    jest.useFakeTimers();
    mockAutoLoadPlayer = false;
    await renderPlayback();
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));

    await act(async () => {
      retainedPlay();
      await flushMicrotasks();
    });
    const player = players[0];
    await act(async () => {
      // Loaded (so play() is requested), then decoding advances — but some
      // Android decoders report playing=false irregularly even while audible.
      // The advancing position must clear the 30s watchdog exactly like a
      // playing=true status would.
      player.emit({
        currentTime: 0,
        duration: 8,
        playing: false,
        isLoaded: true,
        isBuffering: false,
        didJustFinish: false,
        error: null,
      });
      player.emit({
        currentTime: 1.5,
        duration: 8,
        playing: false,
        isLoaded: true,
        isBuffering: false,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
    await act(async () => jest.advanceTimersByTimeAsync(30_000));
    expect(player.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('never publishes or creates a player after the captured session lease expires', async () => {
    const pending = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant).mockReturnValue(pending.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    leaseCurrent = false;
    await act(async () => pending.resolve(grant()));
    expect(players).toHaveLength(0);
  });

  it('captures a fresh session lease when the auth generation changes', async () => {
    const view = await renderPlayback();
    expect(mockAuth.captureSessionLease).toHaveBeenCalledTimes(1);
    mockAuth.sessionVersion = 2;
    leaseGeneration = 2;
    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} />
      </QueryClientProvider>,
    );
    expect(mockAuth.captureSessionLease).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1));
  });

  it('coalesces repeated presses from one retained Play handler while a grant is pending', async () => {
    const pending = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant).mockReturnValue(pending.promise);
    await renderPlayback();
    const play = rawButtonHandler(t('recordings.playLabel'));

    await act(async () => {
      play();
      play();
    });
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve(grant()));
    await waitFor(() => expect(players).toHaveLength(1));
  });

  it('does not let a retained Play handler resume audio after focus is lost', async () => {
    await renderPlayback();
    const play = screen.getByRole('button', { name: t('recordings.playLabel') });
    await act(async () => focusRegistrations[0].cleanup?.());
    await fireEvent.press(play);
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
  });

  it.each(['background', 'inactive'] as const)(
    'does not start playback while AppState is %s even if focus has not emitted cleanup',
    async (state) => {
      await renderPlayback();
      setAppState(state);
      await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
      expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
      expect(players).toHaveLength(0);
    },
  );

  it('invalidates an old grant across blur/refocus and preserves the replacement operation token', async () => {
    const first = deferred<ReturnType<typeof grant>>();
    const second = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await renderPlayback({ recordingStatus: 'retention_pending' });
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));
    await act(async () => retainedPlay());
    const firstSignal = asMock(apiGetRecordingPlaybackGrant).mock.calls[0][1] as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    await act(async () => focusRegistrations[0].cleanup?.());
    expect(firstSignal.aborted).toBe(true);
    await refocus();
    expect(screen.getByTestId('recording-playback-pending')).toHaveTextContent(
      t('recordings.pending'),
    );
    await act(async () => retainedPlay());
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(2);
    const secondSignal = asMock(apiGetRecordingPlaybackGrant).mock.calls[1][1] as AbortSignal;

    await act(async () => first.resolve(grant()));
    expect(players).toHaveLength(0);
    await act(async () => retainedPlay());
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(2);

    await emitAppState('background');
    expect(secondSignal.aborted).toBe(true);
    await act(async () => second.resolve(grant()));
    expect(players).toHaveLength(0);
  });

  it('ignores a stale grant failure after a replacement player is active', async () => {
    const staleGrant = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant)
      .mockReturnValueOnce(staleGrant.promise)
      .mockResolvedValueOnce(distinctGrant(RECORDING_ID));
    await renderPlayback();
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));
    await act(async () => retainedPlay());
    await act(async () => focusRegistrations[0].cleanup?.());
    await refocus();
    await act(async () => retainedPlay());
    await waitFor(() => expect(players).toHaveLength(1));

    await act(async () => staleGrant.reject(new Error('late stale grant failure')));
    await flushMicrotasks();
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
  });

  it('ignores active app-state notifications but invalidates work across inactive/reactivation', async () => {
    const pending = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant).mockReturnValue(pending.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    const signal = asMock(apiGetRecordingPlaybackGrant).mock.calls[0][1] as AbortSignal;

    await emitAppState('active');
    expect(signal.aborted).toBe(false);
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();
    await emitAppState('inactive');
    expect(signal.aborted).toBe(true);
    setAppState('active');
    await act(async () => pending.resolve(grant()));
    expect(players).toHaveLength(0);
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
  });

  it.each([
    ['owner', '550e8400-e29b-41d4-a716-446655440099', RECORDING_ID],
    ['recording', OWNER_ID, OTHER_RECORDING_ID],
  ] as const)(
    'invalidates an old grant when only the %s identity changes',
    async (_kind, nextOwner, nextId) => {
      const pending = deferred<ReturnType<typeof grant>>();
      asMock(apiGetRecordingPlaybackGrant)
        .mockReturnValueOnce(pending.promise)
        .mockResolvedValueOnce(grant(nextId));
      const view = await renderPlayback();
      await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
      const firstSignal = asMock(apiGetRecordingPlaybackGrant).mock.calls[0][1] as AbortSignal;

      await view.rerender(
        <QueryClientProvider client={view.queryClient}>
          <RecordingPlayback ownerId={nextOwner} recordingId={nextId} />
        </QueryClientProvider>,
      );
      expect(mockAuth.captureSessionLease).toHaveBeenCalledTimes(_kind === 'owner' ? 2 : 1);
      expect(firstSignal.aborted).toBe(true);
      await act(async () => pending.resolve(grant()));
      expect(players).toHaveLength(0);
      await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
      await waitFor(() => expect(players).toHaveLength(1));
      expect(apiGetRecordingPlaybackGrant).toHaveBeenLastCalledWith(
        nextId,
        expect.any(AbortSignal),
      );
    },
  );

  it('clears an error and a durable deleted state when the recording identity changes', async () => {
    asMock(apiGetRecordingPlaybackGrant).mockRejectedValueOnce(new ApiError(503, 'busy'));
    const view = await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy());

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="retention_pending"
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByTestId('recording-playback-deleted')).toBeNull();
    expect(screen.getByTestId('recording-playback-pending')).toHaveTextContent(
      t('recordings.pending'),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
  });

  it('preserves active playback across a same-identity rerender', async () => {
    const view = await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingLabel="same recording, new presentation"
        />
      </QueryClientProvider>,
    );

    expect(players[0].listenerRemove).not.toHaveBeenCalled();
    expect(players[0].pause).not.toHaveBeenCalled();
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
  });

  it('cancels loading when the same recording becomes unavailable and rejects its retained Play handler', async () => {
    const pending = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant).mockReturnValue(pending.promise);
    const view = await renderPlayback({ recordingStatus: 'retention_pending' });
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));
    await act(async () => retainedPlay());
    const signal = asMock(apiGetRecordingPlaybackGrant).mock.calls[0][1] as AbortSignal;
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="unavailable"
        />
      </QueryClientProvider>,
    );

    expect(signal.aborted).toBe(true);
    expect(screen.queryByText(t('recordings.preparing'))).toBeNull();
    expect(screen.queryByTestId('recording-playback-pending')).toBeNull();
    expect(screen.getByTestId('recording-playback-unavailable')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });

    await act(async () => retainedPlay());
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(grant()));
    await flushMicrotasks();
    expect(players).toHaveLength(0);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
  });

  it('releases active playback when the same recording becomes unavailable and permits a fresh player when available again', async () => {
    asMock(apiGetRecordingPlaybackGrant)
      .mockResolvedValueOnce(grant())
      .mockResolvedValueOnce(distinctGrant(RECORDING_ID));
    const view = await renderPlayback({ recordingStatus: 'available' });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await act(async () => {
      players[0].emit({
        currentTime: 4,
        duration: 8,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    const retainedPause = rawButtonHandler(t('recordings.pauseLabel'));

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="unavailable"
        />
      </QueryClientProvider>,
    );

    expect(players[0].listenerRemove).toHaveBeenCalledTimes(1);
    expect(players[0].pause).toHaveBeenCalledTimes(1);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('recording-playback-progress')).toBeNull();
    expect(screen.getByTestId('recording-playback-unavailable')).toBeTruthy();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    await act(async () => retainedPause());
    expect(players[0].pause).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="available"
        />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(2));
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(2);
    expect(createAudioPlayer).toHaveBeenLastCalledWith(playbackFiles[1].file.uri, {
      updateInterval: 250,
    });
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
  });

  it('clears a stale playback error when the same recording becomes unavailable', async () => {
    const view = await renderPlayback({ recordingStatus: 'available' });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await act(async () => {
      players[0].emit({
        currentTime: 0,
        duration: 0,
        playing: false,
        didJustFinish: false,
        error: 'native playback failed',
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="unavailable"
        />
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    expect(screen.getByTestId('recording-playback-unavailable')).toBeTruthy();

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="available"
        />
      </QueryClientProvider>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
  });

  it('preserves playback across nonterminal status and presentation changes and uses the latest label', async () => {
    const pending = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant).mockReturnValue(pending.promise);
    const view = await renderPlayback({
      recordingStatus: 'retention_pending',
      recordingLabel: 'old label',
    });
    const retainedConfirm = rawButtonHandler(
      recordingActionLabel('recordings.deleteAction', 'old label'),
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: recordingActionLabel('recordings.playLabel', 'old label'),
      }),
    );
    const signal = asMock(apiGetRecordingPlaybackGrant).mock.calls[0][1] as AbortSignal;

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          compact
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="available"
          recordingLabel="latest label"
        />
      </QueryClientProvider>,
    );

    expect(signal.aborted).toBe(false);
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-container').props.style),
    ).toEqual(expect.objectContaining({ padding: spacing.sm }));
    expect(
      screen.getByRole('button', {
        name: recordingActionLabel('recordings.playLabel', 'latest label'),
      }),
    ).toBeTruthy();
    await act(async () => retainedConfirm());
    expect(Alert.alert).toHaveBeenLastCalledWith(
      t('recordings.deleteTitle'),
      t('recordings.deleteBodyNamed', { name: 'latest label' }),
      expect.any(Array),
    );

    await act(async () => pending.resolve(grant()));
    await waitFor(() => expect(players).toHaveLength(1));
    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="retention_pending"
          recordingLabel="latest label"
        />
      </QueryClientProvider>,
    );

    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    expect(players[0].listenerRemove).not.toHaveBeenCalled();
    expect(players[0].pause).not.toHaveBeenCalled();
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: recordingActionLabel('recordings.pauseLabel', 'latest label'),
      }),
    ).toBeTruthy();
    expect(screen.queryByTestId('recording-playback-pending')).toBeNull();
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-container').props.style),
    ).toEqual(expect.objectContaining({ padding: spacing.md }));
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
  });

  it('rejects a retained Play handler after its recording identity is replaced', async () => {
    const view = await renderPlayback();
    const stalePlay = rawButtonHandler(t('recordings.playLabel'));
    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OTHER_OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );

    await act(async () => stalePlay());
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() =>
      expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledWith(
        OTHER_RECORDING_ID,
        expect.any(AbortSignal),
      ),
    );
  });

  it('rejects a retained Pause handler before it can pause the replacement player', async () => {
    asMock(apiGetRecordingPlaybackGrant).mockImplementation(async (recordingId: string) =>
      distinctGrant(recordingId),
    );
    const view = await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    const stalePause = rawButtonHandler(t('recordings.pauseLabel'));
    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OTHER_OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(2));

    await act(async () => stalePause());
    expect(players[1].pause).not.toHaveBeenCalled();
    expect(players[1].remove).not.toHaveBeenCalled();
    expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
  });

  it('rejects a retained destructive Alert action after identity replacement', async () => {
    const view = await renderPlayback();
    const staleConfirm = rawButtonHandler(t('recordings.deleteAction'));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const staleActions = alertActions();
    const staleDestroy = staleActions.find((action) => action.style === 'destructive')?.onPress;
    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OTHER_OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );

    await act(async () => staleConfirm());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    await act(async () => staleDestroy?.());
    expect(apiDeleteRecording).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    expect(Alert.alert).toHaveBeenCalledTimes(2);
    const currentActions = alertActions(-1);
    await act(async () =>
      currentActions.find((action) => action.style === 'destructive')?.onPress?.(),
    );
    expect(apiDeleteRecording).toHaveBeenCalledWith(OTHER_RECORDING_ID, expect.any(AbortSignal));
  });

  it('rejects retained confirm and modal actions after blur or unmount', async () => {
    const view = await renderPlayback();
    const staleConfirm = rawButtonHandler(t('recordings.deleteAction'));
    await act(async () => staleConfirm());
    const modalActions = alertActions();
    const staleDestroy = modalActions.find((action) => action.style === 'destructive')?.onPress;
    await act(async () => focusRegistrations[0].cleanup?.());

    await act(async () => staleConfirm());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    await refocus();
    await act(async () => staleDestroy?.());
    expect(apiDeleteRecording).not.toHaveBeenCalled();

    await view.unmount();
    await act(async () => staleConfirm());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(apiDeleteRecording).not.toHaveBeenCalled();
  });

  it('never lets a stale grant displace a newer player owned by another surface', async () => {
    const staleGrant = deferred<ReturnType<typeof grant>>();
    asMock(apiGetRecordingPlaybackGrant).mockImplementation((recordingId: string) =>
      recordingId === RECORDING_ID
        ? staleGrant.promise
        : Promise.resolve(distinctGrant(recordingId)),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClients.push(client);
    await render(
      <QueryClientProvider client={client}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} />
        <RecordingPlayback ownerId={OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );
    const playButtons = screen.getAllByRole('button', { name: t('recordings.playLabel') });
    await fireEvent.press(playButtons[0]);
    await act(async () => focusRegistrations[0].cleanup?.());
    await fireEvent.press(playButtons[1]);
    await waitFor(() => expect(players).toHaveLength(1));
    expect(createAudioPlayer).toHaveBeenLastCalledWith(playbackFiles.at(-1)!.file.uri, {
      updateInterval: 250,
    });

    await act(async () => staleGrant.resolve(distinctGrant(RECORDING_ID)));
    await flushMicrotasks();
    expect(players).toHaveLength(1);
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
  });

  it('releases a claim that becomes stale mid-handoff without disturbing the queued newer player', async () => {
    const oldStopped = deferred<void>();
    await claimPlaybackOwner(Symbol('handoff-blocker'), () => oldStopped.promise);
    asMock(apiGetRecordingPlaybackGrant).mockImplementation(async (recordingId: string) =>
      distinctGrant(recordingId),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClients.push(client);
    await render(
      <QueryClientProvider client={client}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} />
        <RecordingPlayback ownerId={OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );
    const playButtons = screen.getAllByRole('button', { name: t('recordings.playLabel') });
    await fireEvent.press(playButtons[0]);
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1));
    await act(async () => focusRegistrations[0].cleanup?.());
    await refocus(0);
    await fireEvent.press(playButtons[1]);
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(2));

    await act(async () => oldStopped.resolve());
    await waitFor(() => expect(players).toHaveLength(1));
    expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
      allowsRecording: false,
      allowsBackgroundRecording: false,
      interruptionMode: 'doNotMix',
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    });
    expect(createAudioPlayer).toHaveBeenLastCalledWith(playbackFiles.at(-1)!.file.uri, {
      updateInterval: 250,
    });
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
  });

  it('stops the previous component when another recording claims playback ownership', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClients.push(client);
    await render(
      <QueryClientProvider client={client}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} />
        <RecordingPlayback ownerId={OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );
    asMock(apiGetRecordingPlaybackGrant).mockImplementation(async (id: string) => grant(id));
    const playButtons = screen.getAllByRole('button', { name: t('recordings.playLabel') });
    await fireEvent.press(playButtons[0]);
    await waitFor(() => expect(players).toHaveLength(1));
    await fireEvent.press(playButtons[1]);
    await waitFor(() => expect(players).toHaveLength(2));
    expect(players[0].pause).toHaveBeenCalled();
    expect(players[0].remove).toHaveBeenCalled();
    expect(players[1].play).toHaveBeenCalled();
  });

  it('publishes global playback-active transitions for ad suppression', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSubmittedRecordingPlaybackActive(listener);
    const view = await renderPlayback();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(getSubmittedRecordingPlaybackActive()).toBe(true));
    expect(listener).toHaveBeenCalledTimes(1);
    await view.unmount();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('releases audio on background and on a recording identity change', async () => {
    const view = await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    const completedGrantSignal = asMock(apiGetRecordingPlaybackGrant).mock
      .calls[0][1] as AbortSignal;
    expect(completedGrantSignal.aborted).toBe(false);
    await act(async () => mockAppStateListener?.('background'));
    expect(players[0].remove).toHaveBeenCalled();
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(completedGrantSignal.aborted).toBe(false);

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: t('recordings.playLabel') })).toBeTruthy();
  });

  it('aborts and releases a partial private download on background', async () => {
    const download = deferred<void>();
    asMock(downloadPrivatePlaybackFile).mockReturnValueOnce(download.promise);
    await renderPlayback();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(downloadPrivatePlaybackFile).toHaveBeenCalledTimes(1));
    const signal = asMock(downloadPrivatePlaybackFile).mock.calls[0][2] as AbortSignal;
    expect(signal.aborted).toBe(false);

    await emitAppState('background');
    expect(signal.aborted).toBe(true);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(players).toHaveLength(0);

    await act(async () => download.reject(signal.reason));
    await flushMicrotasks();
    expect(players).toHaveLength(0);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('times out a stalled private download and returns a retryable playback action', async () => {
    jest.useFakeTimers();
    const download = deferred<void>();
    asMock(downloadPrivatePlaybackFile).mockReturnValueOnce(download.promise);
    await renderPlayback();

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
      await flushMicrotasks();
    });
    const signal = asMock(downloadPrivatePlaybackFile).mock.calls[0][2] as AbortSignal;
    await act(async () => jest.advanceTimersByTimeAsync(29_999));
    expect(signal.aborted).toBe(false);
    expect(screen.getByText(t('recordings.preparing'))).toBeTruthy();

    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(signal.aborted).toBe(true);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();
    expect(players).toHaveLength(0);

    await act(async () => download.reject(signal.reason));
    await flushMicrotasks();
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
  });

  it('does not let a stale download continuation release its refocused successor', async () => {
    const staleDownload = deferred<void>();
    asMock(downloadPrivatePlaybackFile)
      .mockReturnValueOnce(staleDownload.promise)
      .mockResolvedValueOnce(undefined);
    await renderPlayback();
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));

    await act(async () => retainedPlay());
    await waitFor(() => expect(downloadPrivatePlaybackFile).toHaveBeenCalledTimes(1));
    await act(async () => focusRegistrations[0].cleanup?.());
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    await refocus();
    await act(async () => retainedPlay());
    await waitFor(() => expect(players).toHaveLength(1));
    expect(playbackFiles).toHaveLength(2);
    expect(playbackFiles[1].release).not.toHaveBeenCalled();

    await act(async () => staleDownload.resolve());
    await flushMicrotasks();
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(playbackFiles[1].release).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
  });

  it('continues teardown when listener, pause, and remove each throw', async () => {
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await act(async () => {
      players[0].emit({
        currentTime: 4,
        duration: 8,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    players[0].listenerRemove.mockImplementationOnce(() => {
      throw new Error('listener already gone');
    });
    players[0].pause.mockImplementationOnce(() => {
      throw new Error('pause already gone');
    });
    players[0].remove.mockImplementationOnce(() => {
      throw new Error('player already gone');
    });

    await emitAppState('background');
    expect(players[0].listenerRemove).toHaveBeenCalledTimes(1);
    expect(players[0].pause).toHaveBeenCalledTimes(1);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    expect(screen.queryByTestId('recording-playback-progress')).toBeNull();
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
  });

  it('reports native playback and rewind failures without retaining a stale player', async () => {
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await act(async () => {
      players[0].emit({
        currentTime: 1,
        duration: 2,
        playing: true,
        didJustFinish: true,
        error: 'decode',
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();
    expect(screen.queryByText(t('recorder.pause'))).toBeNull();
    expect(screen.queryByTestId('recording-playback-progress')).toBeNull();
    expect(players[0].remove).toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(2));
    expect(screen.queryByRole('alert')).toBeNull();
    players[1].seekTo.mockRejectedValue(new Error('seek failed'));
    await act(async () => {
      players[1].emit({
        currentTime: 2,
        duration: 2,
        playing: false,
        didJustFinish: true,
        error: null,
      });
    });
    await waitFor(() => expect(players[1].remove).toHaveBeenCalled());
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();
    expect(screen.queryByTestId('recording-playback-progress')).toBeNull();
  });

  it('reports audio-mode configuration failure without creating or retaining a player', async () => {
    mockSetAudioModeAsync.mockRejectedValueOnce(new Error('mode failed'));
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed')),
    );
    expect(players).toHaveLength(0);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
  });

  it.each(['listener', 'play'] as const)(
    'releases a partially created player when %s setup throws',
    async (failurePoint) => {
      if (failurePoint === 'listener') mockNextAddListenerError = new Error('listener failed');
      else mockNextPlayerPlayError = new Error('play failed');
      await renderPlayback();
      await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed')),
      );
      expect(players).toHaveLength(1);
      expect(players[0].pause).toHaveBeenCalledTimes(1);
      expect(players[0].remove).toHaveBeenCalledTimes(1);
      expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    },
  );

  it('ignores a removed stale listener after a replacement player starts', async () => {
    await renderPlayback();
    const play = screen.getByRole('button', { name: t('recordings.playLabel') });
    await fireEvent.press(play);
    await waitFor(() => expect(players).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.pauseLabel') }));
    players[0].play.mockImplementationOnce(() => {
      throw new Error('expired native player');
    });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(2));

    await act(async () => {
      players[0].emitStale({
        currentTime: 9,
        duration: 10,
        playing: false,
        didJustFinish: false,
        error: 'stale decode error',
      });
    });
    expect(players[1].remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
  });

  it('does not let a stale rewind rejection tear down its replacement player', async () => {
    const rewind = deferred<void>();
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    players[0].seekTo.mockReturnValueOnce(rewind.promise);
    await act(async () => {
      players[0].emit({
        currentTime: 2,
        duration: 2,
        playing: true,
        didJustFinish: true,
        error: null,
      });
    });
    players[0].play.mockImplementationOnce(() => {
      throw new Error('cannot resume old player');
    });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(2));

    await act(async () => rewind.reject(new Error('late rewind failure')));
    expect(players[1].remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: t('recordings.pauseLabel') })).toBeTruthy();
  });

  it('clamps hostile native progress and hides non-finite or zero-duration progress', async () => {
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));

    await act(async () => {
      players[0].emit({
        currentTime: 150,
        duration: 100,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByTestId('recording-playback-progress').props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 100,
    });
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-progress-fill').props.style),
    ).toEqual(expect.objectContaining({ width: '100%' }));
    expect(screen.getByTestId('recording-playback-time')).toHaveTextContent('2:30 / 1:40');

    await act(async () => {
      players[0].emit({
        currentTime: -25,
        duration: 80,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.getByTestId('recording-playback-progress').props.accessibilityValue.now).toBe(0);
    expect(
      StyleSheet.flatten(screen.getByTestId('recording-playback-progress-fill').props.style),
    ).toEqual(expect.objectContaining({ width: '0%' }));
    expect(screen.getByTestId('recording-playback-time')).toHaveTextContent('0:00 / 1:20');

    await act(async () => {
      players[0].emit({
        currentTime: Number.NaN,
        duration: Number.POSITIVE_INFINITY,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.queryByTestId('recording-playback-progress')).toBeNull();

    await act(async () => {
      players[0].emit({
        currentTime: 0,
        duration: 0,
        playing: true,
        didJustFinish: false,
        error: null,
      });
    });
    expect(screen.queryByTestId('recording-playback-progress')).toBeNull();
  });

  it('replaces an expired or failed paused player and reports a synchronous pause failure', async () => {
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.pauseLabel') }));
    players[0].play.mockImplementationOnce(() => {
      throw new Error('resume failed');
    });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(2));
    expect(players[0].remove).toHaveBeenCalled();

    players[1].pause.mockImplementationOnce(() => {
      throw new Error('pause failed');
    });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.pauseLabel') }));
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();
    expect(screen.queryByText(t('recorder.pause'))).toBeNull();
  });

  it('reuses its owned local file after the signed download capability expires', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-25T00:00:00.000Z'));
    asMock(apiGetRecordingPlaybackGrant).mockResolvedValue({ ...grant(), expiresIn: 20 });
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.pauseLabel') }));

    jest.setSystemTime(new Date('2026-08-25T00:00:09.999Z'));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    expect(players[0].play).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.pauseLabel') }));

    jest.setSystemTime(new Date('2026-08-25T00:01:00.000Z'));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    expect(players).toHaveLength(1);
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    expect(downloadPrivatePlaybackFile).toHaveBeenCalledTimes(1);
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(players[0].play).toHaveBeenCalledTimes(3);
  });

  it('abandons a grant while playback mode is still configuring after focus loss', async () => {
    const mode = deferred<void>();
    mockSetAudioModeAsync.mockReturnValueOnce(mode.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(mockSetAudioModeAsync).toHaveBeenCalled());
    await act(async () => focusRegistrations[0].cleanup?.());
    await act(async () => mode.resolve());
    expect(players).toHaveLength(0);
  });

  it('releases a playback claim that finishes after blur and refocus', async () => {
    const previousStopped = deferred<void>();
    await claimPlaybackOwner(Symbol('blocking-owner'), () => previousStopped.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1));
    await act(async () => focusRegistrations[0].cleanup?.());
    await refocus();

    await act(async () => previousStopped.resolve());
    await flushMicrotasks();
    expect(players).toHaveLength(0);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
  });

  it('aborts a bounded pending retry when its playback surface unmounts', async () => {
    jest.useFakeTimers();
    asMock(apiGetRecordingPlaybackGrant).mockRejectedValue(
      new ApiError(409, 'pending', 1, { code: 'REQUEST_IN_FLIGHT' }),
    );
    const view = await renderPlayback({ recordingStatus: 'retention_pending' });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1));
    const signal = asMock(apiGetRecordingPlaybackGrant).mock.calls[0][1] as AbortSignal;
    await view.unmount();
    expect(signal.aborted).toBe(true);
    expect(mockAppStateSubscriptionRemove).toHaveBeenCalledTimes(1);
    await act(async () => jest.runOnlyPendingTimersAsync());
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
  });

  it('uses the layout-mounted guard when an aborted delete settles before passive focus cleanup', async () => {
    const staleDelete = deferred<void>();
    const onDeleted = jest.fn();
    asMock(apiDeleteRecording).mockReturnValue(staleDelete.promise);
    const view = await renderPlayback({ onDeleted });
    const cancelQueries = jest.spyOn(view.queryClient, 'cancelQueries');
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    const deleteSignal = asMock(apiDeleteRecording).mock.calls[0][1] as AbortSignal;

    focusRegistrations[0].cleanup = () => undefined;
    await view.unmount();
    expect(deleteSignal.aborted).toBe(true);
    await act(async () => staleDelete.resolve());
    await flushMicrotasks();

    expect(cancelQueries).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('shows a retryable deletion error and does not mutate owner caches', async () => {
    asMock(apiDeleteRecording).mockRejectedValue(new ApiError(503, 'busy'));
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    const alert = screen.getByTestId('recording-playback-error');
    expect(alert.parent?.props.testID).toBe('recording-playback-detail-slot');
    expect(alert).toHaveTextContent(t('error.serverBusy'));
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(StyleSheet.flatten(alert.props.style)).toEqual({
      marginTop: spacing.sm,
      color: lightColors.danger,
      fontSize: 14,
    });
  });

  it('cleans up a failed delete for immediate retry without aborting its completed signal', async () => {
    asMock(apiDeleteRecording)
      .mockRejectedValueOnce(new Error('local delete transport failed'))
      .mockResolvedValueOnce(undefined);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const firstActions = alertActions();
    await act(async () =>
      firstActions.find((action) => action.style === 'destructive')?.onPress?.(),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.deleteFailed')),
    );
    expect(screen.getByRole('button', { name: t('recordings.playLabel') })).toBeTruthy();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    expect(screen.queryByTestId('recording-playback-progress')).toBeNull();
    const completedDeleteSignal = asMock(apiDeleteRecording).mock.calls[0][1] as AbortSignal;

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    expect(Alert.alert).toHaveBeenCalledTimes(2);
    await act(async () => focusRegistrations[0].cleanup?.());
    expect(completedDeleteSignal.aborted).toBe(false);
    await refocus();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    expect(Alert.alert).toHaveBeenCalledTimes(3);
    const retryActions = alertActions(2);
    await act(async () =>
      retryActions.find((action) => action.style === 'destructive')?.onPress?.(),
    );
    await waitFor(() => expect(apiDeleteRecording).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy();
  });

  it('does not publish a deletion after the captured session lease expires', async () => {
    const pending = deferred<void>();
    const onDeleted = jest.fn();
    asMock(apiDeleteRecording).mockReturnValue(pending.promise);
    await renderPlayback({ onDeleted });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    leaseCurrent = false;
    await act(async () => pending.resolve());
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.queryByTestId('recording-playback-deleted')).toBeNull();
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('runs a retained destructive callback at most once during and after deletion', async () => {
    const pending = deferred<void>();
    asMock(apiDeleteRecording).mockReturnValue(pending.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    const destroy = actions.find((action) => action.style === 'destructive')?.onPress;

    await act(async () => {
      destroy?.();
      destroy?.();
    });
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    await waitFor(() => expect(screen.getByText(t('recordings.deleted'))).toBeTruthy());
    await act(async () => destroy?.());
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);
  });

  it('confirms unnamed deletion and leaves cancellation side-effect free', async () => {
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    expect(Alert.alert).toHaveBeenCalledWith(
      t('recordings.deleteTitle'),
      t('recordings.deleteBody'),
      expect.any(Array),
    );
    const actions = alertActions() as (AlertAction & { text: string })[];
    expect(actions.map(({ text, style }) => ({ text, style }))).toEqual([
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('recordings.deleteAction'), style: 'destructive' },
    ]);
    expect(actions[0].onPress).toBeUndefined();
    expect(apiDeleteRecording).not.toHaveBeenCalled();
  });

  it('blocks retained play and confirm handlers while deletion is pending', async () => {
    const pending = deferred<void>();
    asMock(apiDeleteRecording).mockReturnValue(pending.promise);
    await renderPlayback();
    const retainedPlay = rawButtonHandler(t('recordings.playLabel'));
    const retainedConfirm = rawButtonHandler(t('recordings.deleteAction'));
    await act(async () => retainedConfirm());
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(apiDeleteRecording).toHaveBeenCalledTimes(1));

    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });
    expect(
      screen.getByRole('button', { name: t('recordings.deleteAction') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: true });
    await act(async () => {
      retainedPlay();
      retainedConfirm();
    });
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    await waitFor(() => expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy());
    await act(async () => {
      retainedPlay();
      retainedConfirm();
    });
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it('cancels an in-flight playback grant before deletion without reviving that grant', async () => {
    const playback = deferred<ReturnType<typeof grant>>();
    const deletion = deferred<void>();
    asMock(apiGetRecordingPlaybackGrant).mockReturnValue(playback.promise);
    asMock(apiDeleteRecording).mockReturnValue(deletion.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    const playbackSignal = asMock(apiGetRecordingPlaybackGrant).mock.calls[0][1] as AbortSignal;
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    expect(playbackSignal.aborted).toBe(true);
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);

    await act(async () => playback.resolve(grant()));
    expect(players).toHaveLength(0);
    expect(screen.getByText(t('recordings.deleteAction'))).toBeTruthy();
    await act(async () => deletion.reject(new ApiError(503, 'busy')));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });

  it('releases active playback before issuing a delete request', async () => {
    const deletion = deferred<void>();
    asMock(apiDeleteRecording).mockReturnValue(deletion.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    expect(players[0].listenerRemove).toHaveBeenCalledTimes(1);
    expect(players[0].pause).toHaveBeenCalledTimes(1);
    expect(players[0].remove).toHaveBeenCalledTimes(1);
    expect(playbackFiles[0].release).toHaveBeenCalledTimes(1);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);
    deletion.reject(new ApiError(503, 'busy'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });

  it('cancels a pending deletion on blur and permits a fresh retry after refocus', async () => {
    const firstDelete = deferred<void>();
    asMock(apiDeleteRecording)
      .mockReturnValueOnce(firstDelete.promise)
      .mockResolvedValueOnce(undefined);
    await renderPlayback();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const firstActions = alertActions();
    await act(async () =>
      firstActions.find((action) => action.style === 'destructive')?.onPress?.(),
    );
    await waitFor(() => expect(apiDeleteRecording).toHaveBeenCalledTimes(1));

    await act(async () => focusRegistrations[0].cleanup?.());
    await act(async () => {
      const nextCleanup = focusRegistrations[0].callback();
      focusRegistrations[0].cleanup = typeof nextCleanup === 'function' ? nextCleanup : null;
    });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const secondActions = alertActions(-1);
    await act(async () =>
      secondActions.find((action) => action.style === 'destructive')?.onPress?.(),
    );
    await waitFor(() => expect(apiDeleteRecording).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText(t('recordings.deleted'))).toBeTruthy());

    await act(async () => firstDelete.reject(new Error('stale delete failure')));
    expect(apiDeleteRecording).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not let a stale delete success cancel caches or stop replacement playback', async () => {
    const staleDelete = deferred<void>();
    const onDeleted = jest.fn();
    asMock(apiDeleteRecording).mockReturnValue(staleDelete.promise);
    const view = await renderPlayback({ onDeleted });
    const cancelQueries = jest.spyOn(view.queryClient, 'cancelQueries');
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await act(async () => focusRegistrations[0].cleanup?.());
    await refocus();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));

    await act(async () => staleDelete.resolve());
    await flushMicrotasks();
    expect(cancelQueries).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(players[0].remove).not.toHaveBeenCalled();
    expect(screen.queryByTestId('recording-playback-deleted')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
  });

  it('abandons deletion after focus loss while owner-cache cancellation is pending', async () => {
    const cacheBarrier = deferred<void>();
    const onDeleted = jest.fn();
    const view = await renderPlayback({ onDeleted });
    const cancelQueries = jest
      .spyOn(view.queryClient, 'cancelQueries')
      .mockImplementation(() => cacheBarrier.promise);
    const invalidateQueries = jest.spyOn(view.queryClient, 'invalidateQueries');
    view.queryClient.setQueryData<InfiniteData<RecordingPage>>(['recordings', OWNER_ID], {
      pages: [{ items: [recordingItem(RECORDING_ID)], nextCursor: null }],
      pageParams: [undefined],
    });

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(cancelQueries).toHaveBeenCalledTimes(2));
    await act(async () => focusRegistrations[0].cleanup?.());
    await refocus();
    await act(async () => cacheBarrier.resolve());
    await flushMicrotasks();

    expect(onDeleted).not.toHaveBeenCalled();
    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(
      view.queryClient.getQueryData<InfiniteData<RecordingPage>>(['recordings', OWNER_ID])?.pages[0]
        .items,
    ).toHaveLength(1);
    expect(screen.queryByTestId('recording-playback-deleted')).toBeNull();
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
  });

  it('does not let an old delete finally clear or de-abort a replacement delete', async () => {
    const first = deferred<void>();
    const second = deferred<void>();
    asMock(apiDeleteRecording)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const firstActions = alertActions();
    await act(async () =>
      firstActions.find((action) => action.style === 'destructive')?.onPress?.(),
    );
    await act(async () => focusRegistrations[0].cleanup?.());
    await refocus();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const secondActions = alertActions(-1);
    const secondDestroy = secondActions.find((action) => action.style === 'destructive')?.onPress;
    await act(async () => secondDestroy?.());
    expect(apiDeleteRecording).toHaveBeenCalledTimes(2);
    const secondSignal = asMock(apiDeleteRecording).mock.calls[1][1] as AbortSignal;

    await act(async () => first.resolve());
    await act(async () => secondDestroy?.());
    expect(apiDeleteRecording).toHaveBeenCalledTimes(2);
    await emitAppState('background');
    expect(secondSignal.aborted).toBe(true);
    await act(async () => second.resolve());
    expect(screen.queryByTestId('recording-playback-deleted')).toBeNull();
  });

  it('bounds pending-retention retries and exposes a retryable error', async () => {
    jest.useFakeTimers();
    asMock(apiGetRecordingPlaybackGrant).mockRejectedValue(
      new ApiError(409, 'pending', 1, { code: 'REQUEST_IN_FLIGHT' }),
    );
    await renderPlayback({ recordingStatus: 'retention_pending' });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3_100);
    });
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(4));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(t('common.tryAgain'))).toBeTruthy();
    expect(screen.queryByTestId('recording-playback-pending')).toBeNull();
  });

  it.each([
    ['missing', undefined, 2_000],
    ['zero', 0, 1_000],
    ['negative', -8, 1_000],
    ['ordinary', 3, 3_000],
    ['oversized', 99, 5_000],
  ] as const)('clamps the %s REQUEST_IN_FLIGHT retry delay', async (_label, retryAfter, delay) => {
    jest.useFakeTimers();
    asMock(apiGetRecordingPlaybackGrant)
      .mockRejectedValueOnce(
        new ApiError(409, 'pending', retryAfter, { code: 'REQUEST_IN_FLIGHT' }),
      )
      .mockResolvedValueOnce(grant());
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1));

    await act(async () => jest.advanceTimersByTimeAsync(delay - 1));
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTimeAsync(1));
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(players).toHaveLength(1));
  });

  it.each([
    ['wrong status', new ApiError(408, 'not pending', 1, { code: 'REQUEST_IN_FLIGHT' })],
    ['wrong code', new ApiError(409, 'different conflict', 1, { code: 'STATE_CHANGED' })],
    [
      'wrong class',
      Object.assign(new Error('lookalike'), {
        status: 409,
        code: 'REQUEST_IN_FLIGHT',
        retryAfterSeconds: 1,
      }),
    ],
  ])('never retries a %s failure', async (_label, failure) => {
    jest.useFakeTimers();
    asMock(apiGetRecordingPlaybackGrant).mockRejectedValue(failure);
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    await act(async () => jest.advanceTimersByTimeAsync(20_000));
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
    expect(players).toHaveLength(0);
  });

  it('renders an unavailable state without offering a misleading retry', async () => {
    await renderPlayback({ recordingStatus: 'unavailable' });
    const button = screen.getByRole('button', { name: t('recordings.playLabel') });
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    expect(screen.getAllByText(t('recordings.unavailable'))).toHaveLength(1);
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    const status = screen.getByTestId('recording-playback-unavailable');
    expect(status.parent?.props.testID).toBe('recording-playback-detail-slot');
    expect(status.props.accessibilityLiveRegion).toBe('polite');
    expect(StyleSheet.flatten(status.props.style)).toEqual({
      marginTop: spacing.sm,
      color: lightColors.muted,
      fontSize: 14,
    });
  });

  it('suppresses duplicate status copy when its parent already renders metadata', async () => {
    await renderPlayback({ recordingStatus: 'unavailable', showStatus: false });

    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(screen.queryByTestId('recording-playback-unavailable')).toBeNull();
    expect(screen.queryByText(t('recordings.unavailable'))).toBeNull();
    expect(screen.getByTestId('recording-playback-detail-slot')).toBeTruthy();
  });

  it('confirms named deletion, updates both caches, and keeps written results outside its scope', async () => {
    const onDeleted = jest.fn();
    const { queryClient } = await renderPlayback({ recordingLabel: 'courage', onDeleted });
    const cancelQueries = jest.spyOn(queryClient, 'cancelQueries');
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    queryClient.setQueryData<InfiniteData<RecordingPage>>(['recordings', OWNER_ID], {
      pages: [
        {
          items: [
            {
              id: RECORDING_ID,
              questionId: OTHER_RECORDING_ID,
              context: 'practice',
              promptWord: 'courage',
              questionText: 'Describe courage.',
              cefrLevel: 'B1',
              contentType: 'audio/mp4',
              sizeBytes: 100,
              durationMs: 1_000,
              status: 'available',
              createdAt: '2026-08-25T00:00:00.000Z',
              availableAt: '2026-08-25T00:00:01.000Z',
            },
          ],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    });
    queryClient.setQueryData<InfiniteData<HistoryPage>>(['practice-history', OWNER_ID], {
      pages: [
        {
          items: [
            {
              id: OTHER_RECORDING_ID,
              questionId: OTHER_RECORDING_ID,
              promptWord: 'courage',
              questionText: 'Describe courage.',
              cefrLevel: 'B1',
              context: 'practice',
              nativeLanguage: null,
              cycleId: '550e8400-e29b-41d4-a716-446655440020',
              attemptNo: 1,
              score: 80,
              passed: true,
              understood: null,
              transcript: 'I was brave.',
              translatedTranscript: null,
              modelAnswer: null,
              feedback: 'Good answer.',
              createdAt: '2026-08-25T00:00:00.000Z',
              recordingId: RECORDING_ID,
              recordingStatus: 'available',
            },
          ],
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    });

    await fireEvent.press(
      screen.getByRole('button', {
        name: recordingActionLabel('recordings.deleteAction', 'courage'),
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      t('recordings.deleteTitle'),
      t('recordings.deleteBodyNamed', { name: 'courage' }),
      expect.any(Array),
    );
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() =>
      expect(apiDeleteRecording).toHaveBeenCalledWith(RECORDING_ID, expect.any(AbortSignal)),
    );
    expect(onDeleted).toHaveBeenCalledWith(RECORDING_ID);
    expect(cancelQueries.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ['recordings', OWNER_ID], exact: true },
      { queryKey: ['practice-history', OWNER_ID], exact: true },
    ]);
    expect(invalidateQueries.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ['recordings', OWNER_ID], exact: true },
      { queryKey: ['practice-history', OWNER_ID], exact: true },
    ]);
    const recordingData = queryClient.getQueryData<InfiniteData<RecordingPage>>([
      'recordings',
      OWNER_ID,
    ]);
    expect(recordingData?.pages[0].items).toEqual([]);
    const historyData = queryClient.getQueryData<InfiniteData<HistoryPage>>([
      'practice-history',
      OWNER_ID,
    ]);
    expect(historyData?.pages[0].items[0]).toMatchObject({
      transcript: 'I was brave.',
      feedback: 'Good answer.',
      recordingId: null,
      recordingStatus: null,
    });
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      t('recordings.deleted'),
    );
    const deleted = screen.getByTestId('recording-playback-deleted');
    expect(deleted).toHaveTextContent(t('recordings.deleted'));
    expect(deleted.props.accessibilityLiveRegion).toBe('polite');
    expect(StyleSheet.flatten(deleted.props.style)).toEqual({
      marginTop: spacing.sm,
      color: lightColors.muted,
      fontSize: 14,
      fontStyle: 'italic',
    });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('delivers deletion only to the latest callback prop', async () => {
    const stale = jest.fn();
    const current = jest.fn();
    const view = await renderPlayback({ onDeleted: stale });
    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={RECORDING_ID} onDeleted={current} />
      </QueryClientProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(current).toHaveBeenCalledWith(RECORDING_ID));
    expect(stale).not.toHaveBeenCalled();
  });

  it('preserves an in-flight deletion across a status change and delivers it to the latest callback', async () => {
    const deletion = deferred<void>();
    const stale = jest.fn();
    const current = jest.fn();
    asMock(apiDeleteRecording).mockReturnValue(deletion.promise);
    const view = await renderPlayback({ recordingStatus: 'available', onDeleted: stale });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    const signal = asMock(apiDeleteRecording).mock.calls[0][1] as AbortSignal;

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="unavailable"
          onDeleted={current}
        />
      </QueryClientProvider>,
    );

    expect(signal.aborted).toBe(false);
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: t('recordings.playLabel') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: false });
    expect(
      screen.getByRole('button', { name: t('recordings.deleteAction') }).props.accessibilityState,
    ).toEqual({ disabled: true, busy: true });
    expect(screen.getByTestId('recording-playback-unavailable')).toBeTruthy();

    await act(async () => deletion.resolve());
    await waitFor(() => expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy());
    expect(current).toHaveBeenCalledTimes(1);
    expect(current).toHaveBeenCalledWith(RECORDING_ID);
    expect(stale).not.toHaveBeenCalled();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      t('recordings.deleted'),
    );
  });

  it('keeps a committed deletion deleted when the same recording becomes unavailable', async () => {
    const onDeleted = jest.fn();
    const view = await renderPlayback({ recordingStatus: 'available', onDeleted });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy());
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback
          ownerId={OWNER_ID}
          recordingId={RECORDING_ID}
          recordingStatus="unavailable"
          onDeleted={onDeleted}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('recording-playback-deleted')).toHaveTextContent(
      t('recordings.deleted'),
    );
    expect(screen.queryByTestId('recording-playback-unavailable')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(apiDeleteRecording).toHaveBeenCalledTimes(1);
  });

  it('keeps a committed deletion deleted when its consumer callback throws', async () => {
    const onDeleted = jest.fn(() => {
      throw new Error('consumer callback failed');
    });
    await renderPlayback({ onDeleted });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());

    await waitFor(() => expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy());
    expect(onDeleted).toHaveBeenCalledWith(RECORDING_ID);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      t('recordings.deleted'),
    );
  });

  it('keeps a committed deletion deleted when its async consumer callback rejects', async () => {
    const onDeleted = jest.fn(async () => {
      throw new Error('async consumer callback failed');
    });
    await renderPlayback({ onDeleted });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await flushMicrotasks();

    expect(screen.getByTestId('recording-playback-deleted')).toBeTruthy();
    expect(onDeleted).toHaveBeenCalledWith(RECORDING_ID);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('binds a post-rerender delete to the latest owner and recording identity', async () => {
    const view = await renderPlayback();
    const cancelQueries = jest.spyOn(view.queryClient, 'cancelQueries');
    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OTHER_OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = alertActions();
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() =>
      expect(apiDeleteRecording).toHaveBeenCalledWith(OTHER_RECORDING_ID, expect.any(AbortSignal)),
    );
    expect(cancelQueries.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ['recordings', OTHER_OWNER_ID], exact: true },
      { queryKey: ['practice-history', OTHER_OWNER_ID], exact: true },
    ]);
  });
});

describe('recording cache helpers', () => {
  it('are no-ops for missing data and remove only the selected recording', () => {
    expect(removeRecordingFromPages(undefined, RECORDING_ID)).toBeUndefined();
    expect(removeRecordingFromHistoryPages(undefined, RECORDING_ID)).toBeUndefined();
    const client = new QueryClient();
    applyRecordingDeletionToCache(client, OWNER_ID, RECORDING_ID);
    client.clear();
  });

  it('preserves page metadata and every non-target recording while removing all target copies', () => {
    const first = recordingItem(RECORDING_ID);
    const keep = recordingItem(OTHER_RECORDING_ID);
    const data: InfiniteData<RecordingPage> = {
      pages: [
        { items: [first, keep], nextCursor: 'cursor-1' },
        { items: [recordingItem(RECORDING_ID)], nextCursor: null },
      ],
      pageParams: [undefined, 'cursor-1'],
    };

    const result = removeRecordingFromPages(data, RECORDING_ID);
    expect(result).toEqual({
      pages: [
        { items: [keep], nextCursor: 'cursor-1' },
        { items: [], nextCursor: null },
      ],
      pageParams: [undefined, 'cursor-1'],
    });
    expect(data.pages[0].items).toEqual([first, keep]);
  });

  it('nulls only matching history media links and preserves all written assessment fields', () => {
    const target = historyItem('attempt-target', RECORDING_ID);
    const keep = historyItem('attempt-keep', OTHER_RECORDING_ID);
    const alreadyEmpty = historyItem('attempt-empty', null);
    const data: InfiniteData<HistoryPage> = {
      pages: [
        { items: [target, keep], nextCursor: 'cursor-1' },
        { items: [alreadyEmpty], nextCursor: null },
      ],
      pageParams: [undefined, 'cursor-1'],
    };

    const result = removeRecordingFromHistoryPages(data, RECORDING_ID);
    expect(result).toEqual({
      pages: [
        {
          items: [{ ...target, recordingId: null, recordingStatus: null }, keep],
          nextCursor: 'cursor-1',
        },
        { items: [alreadyEmpty], nextCursor: null },
      ],
      pageParams: [undefined, 'cursor-1'],
    });
    expect(data.pages[0].items[0]).toBe(target);
    expect(result?.pages[0].items[1]).toBe(keep);
  });

  it('writes only the exact owner-scoped recording and history cache keys', () => {
    const setQueryData = jest.fn();
    applyRecordingDeletionToCache(
      { setQueryData } as unknown as QueryClient,
      OWNER_ID,
      RECORDING_ID,
    );
    expect(setQueryData).toHaveBeenCalledTimes(2);
    expect(setQueryData.mock.calls.map(([key]) => key)).toEqual([
      ['recordings', OWNER_ID],
      ['practice-history', OWNER_ID],
    ]);

    const recordingUpdater = setQueryData.mock.calls[0][1] as (
      value: InfiniteData<RecordingPage>,
    ) => InfiniteData<RecordingPage>;
    const historyUpdater = setQueryData.mock.calls[1][1] as (
      value: InfiniteData<HistoryPage>,
    ) => InfiniteData<HistoryPage>;
    expect(
      recordingUpdater({
        pages: [{ items: [recordingItem(RECORDING_ID)], nextCursor: null }],
        pageParams: [undefined],
      }).pages[0].items,
    ).toEqual([]);
    expect(
      historyUpdater({
        pages: [{ items: [historyItem('attempt', RECORDING_ID)], nextCursor: null }],
        pageParams: [undefined],
      }).pages[0].items[0],
    ).toMatchObject({ recordingId: null, recordingStatus: null });
  });

  it('stops and releases the globally active playback owner before recording', async () => {
    const stop = jest.fn(async () => undefined);
    await claimPlaybackOwner(Symbol('direct-owner-test'), stop);
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
    await stopActivePlayback();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
  });
});

describe('submitted-recording audio session', () => {
  it('initializes a fresh module with playback inactive', () => {
    jest.isolateModules(() => {
      const isolated = jest.requireActual<typeof import('../src/lib/audio-session')>(
        '../src/lib/audio-session',
      );
      expect(isolated.getSubmittedRecordingPlaybackActive()).toBe(false);
    });
  });

  it('configures the exact playback and recording audio modes', async () => {
    await configurePlaybackAudioMode();
    await configureRecordingAudioMode();
    expect(mockSetAudioModeAsync.mock.calls).toEqual([
      [
        {
          allowsRecording: false,
          allowsBackgroundRecording: false,
          interruptionMode: 'doNotMix',
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          shouldRouteThroughEarpiece: false,
        },
      ],
      [
        {
          allowsRecording: true,
          allowsBackgroundRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        },
      ],
    ]);
  });

  it('serializes audio-mode work and recovers the queue after a rejected operation', async () => {
    const first = deferred<void>();
    const calls: string[] = [];
    const firstResult = serializeAudioMode(async () => {
      calls.push('first:start');
      await first.promise;
      calls.push('first:end');
    });
    const secondResult = serializeAudioMode(async () => {
      calls.push('second');
    });
    await flushMicrotasks();
    expect(calls).toEqual(['first:start']);

    const failure = new Error('native mode failed');
    first.reject(failure);
    await expect(firstResult).rejects.toBe(failure);
    await secondResult;
    expect(calls).toEqual(['first:start', 'second']);

    await serializeAudioMode(async () => {
      calls.push('third');
    });
    expect(calls).toEqual(['first:start', 'second', 'third']);
  });

  it('publishes only real active-state transitions and actually unsubscribes listeners', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSubmittedRecordingPlaybackActive(listener);
    const token = Symbol('same-owner');
    const firstStop = jest.fn();
    const replacementStop = jest.fn();
    const firstRelease = await claimPlaybackOwner(token, firstStop);
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    const replacementRelease = await claimPlaybackOwner(token, replacementStop);
    expect(firstStop).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
    firstRelease();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    replacementRelease();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    const finalRelease = await claimPlaybackOwner(Symbol('after-unsubscribe'), jest.fn());
    finalRelease();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps suppression continuously active while a foreign owner is being stopped', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSubmittedRecordingPlaybackActive(listener);
    const stopped = deferred<void>();
    let oldRelease: () => void = () => {
      throw new Error('old release was not installed');
    };
    const previousStop = jest.fn(() => {
      expect(getSubmittedRecordingPlaybackActive()).toBe(true);
      oldRelease();
      return stopped.promise;
    });
    oldRelease = await claimPlaybackOwner(Symbol('old'), previousStop);
    const claim = claimPlaybackOwner(Symbol('new'), jest.fn());
    await flushMicrotasks();
    expect(previousStop).toHaveBeenCalledTimes(1);
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    stopped.resolve();
    const newRelease = await claim;
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    oldRelease();
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
    newRelease();
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('publishes inactive and leaves no owner when replacing-owner teardown fails', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSubmittedRecordingPlaybackActive(listener);
    const failure = new Error('could not stop native player');
    await claimPlaybackOwner(Symbol('failing-old'), () => {
      throw failure;
    });

    await expect(claimPlaybackOwner(Symbol('never-claimed'), jest.fn())).rejects.toBe(failure);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    await expect(stopActivePlayback()).resolves.toBeUndefined();
    unsubscribe();
  });

  it('serializes a queued stop behind a foreign claim and stops the newly installed owner', async () => {
    const oldStopped = deferred<void>();
    const oldStop = jest.fn(() => oldStopped.promise);
    const newStop = jest.fn();
    await claimPlaybackOwner(Symbol('queued-old'), oldStop);
    const claim = claimPlaybackOwner(Symbol('queued-new'), newStop);
    const stop = stopActivePlayback();
    await flushMicrotasks();
    expect(oldStop).toHaveBeenCalledTimes(1);
    expect(newStop).not.toHaveBeenCalled();

    oldStopped.resolve();
    await claim;
    await stop;
    expect(newStop).toHaveBeenCalledTimes(1);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
  });
});
