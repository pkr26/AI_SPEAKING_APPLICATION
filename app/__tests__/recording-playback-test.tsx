import { InfiniteData, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, AppState } from 'react-native';

import RecordingPlayback, {
  applyRecordingDeletionToCache,
  removeRecordingFromHistoryPages,
  removeRecordingFromPages,
} from '../src/components/RecordingPlayback';
import { ApiError, apiDeleteRecording, apiGetRecordingPlaybackGrant } from '../src/lib/api';
import {
  claimPlaybackOwner,
  getSubmittedRecordingPlaybackActive,
  stopActivePlayback,
  subscribeSubmittedRecordingPlaybackActive,
} from '../src/lib/audio-session';
import { useAuth } from '../src/lib/auth';
import { translateFor } from '../src/lib/i18n';
import type { HistoryPage, RecordingPage } from '../src/lib/types';

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const RECORDING_ID = '550e8400-e29b-41d4-a716-446655440011';
const OTHER_RECORDING_ID = '550e8400-e29b-41d4-a716-446655440012';
const t = (key: Parameters<typeof translateFor>[1], params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const asMock = (value: unknown) => value as jest.Mock;

interface MockPlayer {
  play: jest.Mock;
  pause: jest.Mock;
  seekTo: jest.Mock;
  remove: jest.Mock;
  addListener: jest.Mock;
  emit: (status: Record<string, unknown>) => void;
}

const players: MockPlayer[] = [];
const mockSetAudioModeAsync = jest.fn<Promise<void>, [unknown]>(
  async (_options: unknown) => undefined,
);
let mockAppStateListener: ((state: string) => void) | null = null;

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => {
    let listener: ((status: Record<string, unknown>) => void) | null = null;
    const player: MockPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      seekTo: jest.fn(async () => undefined),
      remove: jest.fn(),
      addListener: jest.fn((_event: string, next: (status: Record<string, unknown>) => void) => {
        listener = next;
        return { remove: jest.fn(() => (listener = null)) };
      }),
      emit: (status) => listener?.(status),
    };
    players.push(player);
    return player;
  }),
  setAudioModeAsync: (options: unknown) => mockSetAudioModeAsync(options),
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
  captureSessionLease: jest.fn(() => ({}) as never),
  isSessionLeaseCurrent: jest.fn(() => leaseCurrent),
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
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

beforeEach(() => {
  leaseCurrent = true;
  players.length = 0;
  focusRegistrations.length = 0;
  asMock(useAuth).mockClear();
  asMock(apiGetRecordingPlaybackGrant).mockReset();
  asMock(apiDeleteRecording).mockReset();
  asMock(apiGetRecordingPlaybackGrant).mockResolvedValue(grant());
  asMock(apiDeleteRecording).mockResolvedValue(undefined);
  mockSetAudioModeAsync.mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    listener: (state: string) => void,
  ) => {
    mockAppStateListener = listener;
    return { remove: jest.fn(() => (mockAppStateListener = null)) };
  }) as never);
});

afterEach(async () => {
  await cleanup();
  for (const client of queryClients.splice(0)) client.clear();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('RecordingPlayback', () => {
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
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
    expect(players[0].play).toHaveBeenCalledTimes(1);

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

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.pauseLabel') }));
    expect(players[0].pause).toHaveBeenCalled();
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

  it('does not let a retained Play handler resume audio after focus is lost', async () => {
    await renderPlayback();
    const play = screen.getByRole('button', { name: t('recordings.playLabel') });
    await act(async () => focusRegistrations[0].cleanup?.());
    await fireEvent.press(play);
    expect(apiGetRecordingPlaybackGrant).not.toHaveBeenCalled();
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
    unsubscribe();
  });

  it('releases audio on background and on a recording identity change', async () => {
    const view = await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await act(async () => mockAppStateListener?.('background'));
    expect(players[0].remove).toHaveBeenCalled();

    await view.rerender(
      <QueryClientProvider client={view.queryClient}>
        <RecordingPlayback ownerId={OWNER_ID} recordingId={OTHER_RECORDING_ID} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: t('recordings.playLabel') })).toBeTruthy();
  });

  it('reports native playback and rewind failures without retaining a stale player', async () => {
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(1));
    await act(async () => {
      players[0].emit({
        currentTime: 1,
        duration: 2,
        playing: false,
        didJustFinish: false,
        error: 'decode',
      });
    });
    expect(screen.getByRole('alert')).toHaveTextContent(t('recordings.playFailed'));
    expect(players[0].remove).toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(players).toHaveLength(2));
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

  it('aborts a bounded pending retry when its playback surface unmounts', async () => {
    jest.useFakeTimers();
    asMock(apiGetRecordingPlaybackGrant).mockRejectedValue(
      new ApiError(409, 'pending', 1, { code: 'REQUEST_IN_FLIGHT' }),
    );
    const view = await renderPlayback({ recordingStatus: 'retention_pending' });
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.playLabel') }));
    await waitFor(() => expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1));
    await view.unmount();
    await act(async () => jest.runOnlyPendingTimersAsync());
    expect(apiGetRecordingPlaybackGrant).toHaveBeenCalledTimes(1);
  });

  it('shows a retryable deletion error and does not mutate owner caches', async () => {
    asMock(apiDeleteRecording).mockRejectedValue(new ApiError(503, 'busy'));
    await renderPlayback();
    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    const actions = asMock(Alert.alert).mock.calls[0][2] as {
      style?: string;
      onPress?: () => void;
    }[];
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();
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
  });

  it('renders an unavailable state without offering a misleading retry', async () => {
    await renderPlayback({ recordingStatus: 'unavailable' });
    const button = screen.getByRole('button', { name: t('recordings.playLabel') });
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(screen.getAllByText(t('recordings.unavailable'))).toHaveLength(2);
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
  });

  it('confirms named deletion, updates both caches, and keeps written results outside its scope', async () => {
    const onDeleted = jest.fn();
    const { queryClient } = await renderPlayback({ recordingLabel: 'courage', onDeleted });
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
              attemptNo: 1,
              score: 80,
              passed: true,
              transcript: 'I was brave.',
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

    await fireEvent.press(screen.getByRole('button', { name: t('recordings.deleteAction') }));
    expect(Alert.alert).toHaveBeenCalledWith(
      t('recordings.deleteTitle'),
      t('recordings.deleteBodyNamed', { name: 'courage' }),
      expect.any(Array),
    );
    const actions = asMock(Alert.alert).mock.calls[0][2] as {
      style?: string;
      onPress?: () => void;
    }[];
    await act(async () => actions.find((action) => action.style === 'destructive')?.onPress?.());
    await waitFor(() =>
      expect(apiDeleteRecording).toHaveBeenCalledWith(RECORDING_ID, expect.any(AbortSignal)),
    );
    expect(onDeleted).toHaveBeenCalledWith(RECORDING_ID);
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

  it('stops and releases the globally active playback owner before recording', async () => {
    const stop = jest.fn(async () => undefined);
    await claimPlaybackOwner(Symbol('direct-owner-test'), stop);
    expect(getSubmittedRecordingPlaybackActive()).toBe(true);
    await stopActivePlayback();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(getSubmittedRecordingPlaybackActive()).toBe(false);
  });
});
