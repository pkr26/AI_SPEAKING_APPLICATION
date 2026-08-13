import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import {
  AudioModule,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import React from 'react';
import {
  AccessibilityInfo,
  AppState,
  Linking,
  type AppStateStatus,
  type EmitterSubscription,
} from 'react-native';

import Recorder from '../src/components/Recorder';
import {
  ApiError,
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  AUDIO_TIMEOUT_MS,
} from '../src/lib/api';
import {
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  savePendingAssessment,
  type PendingAssessment,
} from '../src/lib/pending-assessment';
import { ContractError } from '../src/lib/types';

// The real lib/api module is kept (ApiError identity, userMessageForError,
// audioFileDescriptor, AUDIO_TIMEOUT_MS); only the network functions are faked.
// It imports expo-secure-store, which has no native module under jest.
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

jest.mock('expo-file-system', () => ({
  File: jest.fn((uri: string) => ({
    uri,
    exists: true,
    delete: jest.fn(),
    arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
  })),
  UploadType: { MULTIPART: 'multipart' },
}));

jest.mock('expo-audio', () => ({
  AudioModule: {
    getRecordingPermissionsAsync: jest.fn(),
    requestRecordingPermissionsAsync: jest.fn(),
  },
  RecordingPresets: {
    HIGH_QUALITY: {
      extension: '.m4a',
      sampleRate: 44_100,
      numberOfChannels: 2,
      bitRate: 128_000,
      android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
      ios: { outputFormat: 'aac', audioQuality: 127 },
      web: { mimeType: 'audio/webm', bitsPerSecond: 128_000 },
    },
  },
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: jest.fn(),
  useAudioRecorderState: jest.fn(),
}));

// Focus is simulated by invoking the effect on mount and its cleanup on
// unmount, re-running when the callback identity changes (as expo-router does
// while a screen stays focused).
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

jest.mock('../src/lib/api', () => {
  const actual = jest.requireActual<typeof import('../src/lib/api')>('../src/lib/api');
  return {
    ...actual,
    apiFetch: jest.fn(),
    apiPostPresignedAudio: jest.fn(),
    apiRequestAudioUpload: jest.fn(),
    apiUploadAudio: jest.fn(),
  };
});

jest.mock('../src/lib/pending-assessment', () => ({
  clearPendingAssessment: jest.fn(),
  loadPendingAssessment: jest.fn(),
  markPendingAssessmentForReconciliation: jest.fn(),
  markPendingAssessmentStage: jest.fn(),
  savePendingAssessment: jest.fn(),
}));

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_QUESTION_ID = '550e8400-e29b-41d4-a716-446655440003';
const OTHER_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440004';
const OTHER_OWNER_ID = '550e8400-e29b-41d4-a716-446655440005';
const S3_AUDIO_KEY = `audio-uploads/${OWNER_ID}/550e8400-e29b-41d4-a716-446655440006.m4a`;
const ENDPOINT = '/practice/attempt' as const;
const RECORDING_URI = 'file:///recordings/answer.m4a';

const RECOVERING_TEXT = 'Confirming whether your interrupted assessment was saved…';
const IDLE_TEXT = 'Tap the microphone to record your answer';

interface MockRecorder {
  prepareToRecordAsync: jest.Mock;
  record: jest.Mock;
  stop: jest.Mock;
  uri: string | null;
  isRecording: boolean;
}

interface MockRecorderState {
  isRecording: boolean;
  durationMillis: number;
  url: string | null;
  mediaServicesDidReset: boolean;
}

let mockRecorder: MockRecorder;
let mockRecorderState: MockRecorderState;
let appStateHandlers: ((state: AppStateStatus) => void)[];

const asMock = (fn: unknown) => fn as jest.Mock;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushMicrotasks(rounds = 25): Promise<void> {
  if (rounds <= 0) return;
  await Promise.resolve();
  await flushMicrotasks(rounds - 1);
}

async function flushAct(): Promise<void> {
  await act(async () => {
    await flushMicrotasks();
  });
}

async function advancePolls(times: number): Promise<void> {
  if (times <= 0) return;
  await act(async () => {
    jest.advanceTimersByTime(2000);
    await flushMicrotasks();
  });
  await advancePolls(times - 1);
}

function pendingRecord(overrides: Partial<PendingAssessment> = {}): PendingAssessment {
  return {
    ownerId: OWNER_ID,
    endpoint: ENDPOINT,
    questionId: QUESTION_ID,
    requestId: REQUEST_ID,
    createdAt: Date.now(),
    stage: 'direct-posting',
    ...overrides,
  };
}

function deletedRecordingUris(): string[] {
  return asMock(File)
    .mock.results.map((result) => result.value as { uri: string; delete: jest.Mock } | undefined)
    .filter((file): file is { uri: string; delete: jest.Mock } => !!file)
    .filter((file) => file.delete.mock.calls.length > 0)
    .map((file) => file.uri);
}

function pulseRingCount(): number {
  // The pulse ring is the only sibling of the record button inside its wrap.
  const button = screen.getByLabelText(/^(Start|Stop) recording$/);
  const wrap = button.parent;
  if (!wrap) return 0;
  return wrap.children.filter((child) => child !== button && typeof child !== 'string').length;
}

function invokePressHandler(
  view: Pick<RenderResult, 'getByLabelText'>,
  accessibilityLabel: string,
): Promise<void> {
  // The async RNTL fireEvent wrapper cannot overlap the deliberate identity
  // rerender in these race tests. Walk to Pressable's composite fiber so the
  // in-flight handler can be controlled without opening a nested act scope.
  type PressFiber = {
    memoizedProps?: { onPress?: () => unknown };
    return: PressFiber | null;
  };
  let fiber = view.getByLabelText(accessibilityLabel)
    .unstable_fiber as unknown as PressFiber | null;
  while (fiber) {
    const onPress = fiber.memoizedProps?.onPress;
    if (typeof onPress === 'function') return Promise.resolve(onPress()).then(() => undefined);
    fiber = fiber.return;
  }
  throw new Error(`Pressable "${accessibilityLabel}" not found`);
}

async function renderRecorder(
  overrides: {
    ownerId?: string;
    questionId?: string;
    endpoint?: '/diagnostic/answer' | '/practice/attempt';
    parseResult?: (data: unknown) => { parsed: unknown };
  } = {},
) {
  const props = {
    ownerId: OWNER_ID,
    questionId: QUESTION_ID,
    endpoint: ENDPOINT as '/diagnostic/answer' | '/practice/attempt',
    parseResult: jest.fn((data: unknown) => ({ parsed: data })),
    onResult: jest.fn(),
    onError: jest.fn(),
    onRecoveryUnresolved: jest.fn(),
    ...overrides,
  };
  const view = await render(<Recorder {...props} />);
  await flushAct();
  return { view, props };
}

async function startRecording(): Promise<void> {
  await fireEvent.press(screen.getByLabelText('Start recording'));
  await waitFor(() => expect(screen.getByLabelText('Stop recording')).toBeTruthy());
}

async function recordAndStop(durationMillis = 5000): Promise<void> {
  await startRecording();
  mockRecorderState.durationMillis = durationMillis;
  await fireEvent.press(screen.getByLabelText('Stop recording'));
  await waitFor(() => expect(screen.getByText('Submit Answer')).toBeTruthy());
}

beforeEach(() => {
  appStateHandlers = [];

  // RN's jest environment leaves AppState.currentState undefined; the
  // component only records/uploads/recovers while the app is active.
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });

  mockRecorder = {
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => {
      mockRecorder.uri = RECORDING_URI;
    }),
    uri: null,
    isRecording: false,
  };
  mockRecorderState = {
    isRecording: false,
    durationMillis: 0,
    url: null,
    mediaServicesDidReset: false,
  };

  asMock(useAudioRecorder).mockReset();
  asMock(useAudioRecorder).mockImplementation(() => mockRecorder);
  asMock(useAudioRecorderState).mockReset();
  asMock(useAudioRecorderState).mockImplementation(() => mockRecorderState);
  asMock(AudioModule.getRecordingPermissionsAsync).mockReset();
  asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
    granted: true,
  });
  asMock(AudioModule.requestRecordingPermissionsAsync).mockReset();
  asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({
    granted: true,
  });
  asMock(setAudioModeAsync).mockReset();
  asMock(setAudioModeAsync).mockResolvedValue(undefined);

  asMock(Crypto.randomUUID).mockReset();
  asMock(Crypto.randomUUID).mockReturnValue(REQUEST_ID);

  asMock(File).mockReset();
  asMock(File).mockImplementation((uri: string) => ({
    uri,
    exists: true,
    delete: jest.fn(),
    arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
  }));

  asMock(apiFetch).mockReset();
  asMock(apiRequestAudioUpload).mockReset();
  asMock(apiRequestAudioUpload).mockResolvedValue({ mode: 'direct' });
  asMock(apiPostPresignedAudio).mockReset();
  asMock(apiPostPresignedAudio).mockResolvedValue(undefined);
  asMock(apiUploadAudio).mockReset();
  asMock(apiUploadAudio).mockResolvedValue({ ok: true });

  asMock(loadPendingAssessment).mockReset();
  asMock(loadPendingAssessment).mockResolvedValue(null);
  asMock(savePendingAssessment).mockReset();
  asMock(savePendingAssessment).mockResolvedValue(undefined);
  asMock(clearPendingAssessment).mockReset();
  asMock(clearPendingAssessment).mockResolvedValue(undefined);
  asMock(markPendingAssessmentForReconciliation).mockReset();
  asMock(markPendingAssessmentForReconciliation).mockResolvedValue(true);
  asMock(markPendingAssessmentStage).mockReset();
  asMock(markPendingAssessmentStage).mockResolvedValue(true);

  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((event: string, listener: (state: AppStateStatus) => void) => {
      if (event === 'change') appStateHandlers.push(listener);
      return { remove: jest.fn() };
    });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as EmitterSubscription);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Recorder', () => {
  describe('idle rendering and recording lifecycle', () => {
    it('renders idle with a start button and no permission banner', async () => {
      await renderRecorder();

      expect(screen.getByLabelText('Start recording')).toBeTruthy();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(
        screen.getByText('Your recording is uploaded only after you choose Submit Answer.'),
      ).toBeTruthy();
      expect(screen.queryByText(/Microphone access is needed/)).toBeNull();
    });

    it('starts recording when permission is already granted', async () => {
      await renderRecorder();
      await startRecording();

      expect(useAudioRecorder).toHaveBeenCalledWith(
        expect.objectContaining({
          extension: '.m4a',
          sampleRate: 16_000,
          numberOfChannels: 1,
          bitRate: 64_000,
        }),
      );
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: true,
        allowsBackgroundRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 120 });
      expect(screen.getByText('Recording… 0:00 of 2:00 — tap to stop')).toBeTruthy();
      expect(pulseRingCount()).toBe(1);
      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
    });

    it('announces phase changes without making elapsed timer updates live', async () => {
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      const { view, props } = await renderRecorder();
      announce.mockClear();

      await startRecording();
      expect(announce).toHaveBeenLastCalledWith('Recording started. Tap the microphone to stop.');
      const announcementCount = announce.mock.calls.length;

      mockRecorderState.durationMillis = 1_000;
      await view.rerender(<Recorder {...props} />);
      const timer = screen.getByText('Recording… 0:01 of 2:00 — tap to stop');
      expect(timer.props.accessible).toBe(false);
      expect(timer.props.accessibilityLiveRegion).toBeUndefined();
      expect(timer.props.accessibilityLabel).toBe(
        'Recording in progress. Tap the microphone to stop.',
      );
      expect(announce).toHaveBeenCalledTimes(announcementCount);

      await fireEvent.press(screen.getByLabelText('Stop recording'));
      await waitFor(() =>
        expect(announce).toHaveBeenLastCalledWith('Recording saved. Ready to submit.'),
      );
    });

    it('requests permission when it was not granted yet', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      await renderRecorder();
      await startRecording();

      expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 120 });
    });

    it('shows the permission banner and does not record when denied', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      await renderRecorder();

      await fireEvent.press(screen.getByLabelText('Start recording'));
      await waitFor(() =>
        expect(screen.getByText(/Microphone access is needed to record your answer/)).toBeTruthy(),
      );

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Start recording')).toBeTruthy();
    });

    it('opens device settings after microphone permission is permanently denied', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      await renderRecorder();

      await fireEvent.press(screen.getByLabelText('Start recording'));
      await fireEvent.press(await screen.findByText('Open Settings'));

      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(openSettings).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('offers settings when a permission request is permanently denied and reports settings failures', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: true,
      });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      const openSettings = jest
        .spyOn(Linking, 'openSettings')
        .mockRejectedValue(new Error('settings unavailable'));
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText('Start recording'));
      await fireEvent.press(await screen.findByText('Open Settings'));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Could not open device settings. Open Settings manually and allow microphone access for this app.',
        ),
      );

      expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(openSettings).toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('reports an error and restores audio mode when the permission check fails', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockRejectedValue(
        new Error('native permission failure'),
      );
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText('Start recording'));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Could not start recording. Check microphone access and try again.',
        ),
      );

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
      expect(screen.getByLabelText('Start recording')).toBeTruthy();
    });

    it('abandons a start that is still in flight when the app backgrounds', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      await renderRecorder();

      const press = fireEvent.press(screen.getByLabelText('Start recording'));
      // The lifecycle stop fires while the permission request is in flight;
      // the stale start must not begin recording once it resolves.
      for (const handler of appStateHandlers) handler('background');
      permission.resolve({ granted: true });
      await press;
      await flushAct();

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Start recording')).toBeTruthy();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('suppresses a late start failure after the app backgrounds', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { props } = await renderRecorder();

      const press = fireEvent.press(screen.getByLabelText('Start recording'));
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      for (const handler of appStateHandlers) handler('background');
      permission.reject(new Error('permission service stopped'));
      await press;
      await flushAct();

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Start recording')).toBeTruthy();
    });

    it('cleans up and restores audio mode when stopping the native recording fails', async () => {
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = RECORDING_URI;
        throw new Error('native stop failure');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText('Stop recording'));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Could not save the recording. Please record your answer again.',
        ),
      );

      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('suppresses a late stop failure after the app backgrounds', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockReturnValue(stop.promise);
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      const press = fireEvent.press(screen.getByLabelText('Stop recording'));
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      for (const handler of appStateHandlers) handler('background');
      stop.reject(new Error('native recorder stopped with the app'));
      await press;
      await flushAct();

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Start recording')).toBeTruthy();
    });

    it('discards recordings shorter than 500ms', async () => {
      const { props } = await renderRecorder();
      await startRecording();

      mockRecorderState.durationMillis = 0;
      await fireEvent.press(screen.getByLabelText('Stop recording'));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The recording was too short. Please record your answer again.',
        ),
      );

      expect(screen.getByLabelText('Start recording')).toBeTruthy();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
    });

    it.each([
      [499, false],
      [500, true],
    ])(
      'treats a %ims recording as valid=%s at the exact minimum boundary',
      async (duration, valid) => {
        const { props } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = duration;

        await fireEvent.press(screen.getByLabelText('Stop recording'));
        if (valid) {
          await waitFor(() => expect(screen.getByText('Submit Answer')).toBeTruthy());
          expect(props.onError).not.toHaveBeenCalledWith(
            'The recording was too short. Please record your answer again.',
          );
        } else {
          await waitFor(() =>
            expect(props.onError).toHaveBeenCalledWith(
              'The recording was too short. Please record your answer again.',
            ),
          );
          expect(screen.queryByText('Submit Answer')).toBeNull();
        }
      },
    );

    it('keeps a valid recording and shows the formatted duration', async () => {
      await renderRecorder();
      await recordAndStop(65_000);

      expect(screen.getByText('Recorded 1:05 — ready to submit')).toBeTruthy();
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
    });

    it('resets native stop tracking and deletes the old recording before re-recording', async () => {
      const secondUri = 'file:///recordings/second-answer.m4a';
      await renderRecorder();
      await recordAndStop();
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);

      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = secondUri;
      });
      asMock(File).mockClear();
      await fireEvent.press(screen.getByRole('button', { name: 'Re-record' }));
      await waitFor(() => expect(screen.getByLabelText('Stop recording')).toBeTruthy());

      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText('Stop recording'));
      await waitFor(() => expect(screen.getByText('Submit Answer')).toBeTruthy());

      expect(mockRecorder.stop).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Recorded 0:05 — ready to submit')).toBeTruthy();
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
    });

    it('renders the live elapsed time while recording', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = { ...mockRecorderState, durationMillis: 65_000 };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByText('Recording… 1:05 of 2:00 — tap to stop')).toBeTruthy();
    });

    it('adopts a native auto-stop and clamps the duration at two minutes', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = {
        ...mockRecorderState,
        isRecording: true,
        durationMillis: 3000,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        isRecording: false,
        durationMillis: 200_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByText('Recorded 2:00 — ready to submit')).toBeTruthy();
    });

    it('submits the recorder-state URL when native auto-stop has no recorder URI', async () => {
      const fallbackUri = 'blob:https://app.example/recordings/auto-stop.webm';
      const revoke = jest.fn();
      const previousDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
      try {
        const { view, props } = await renderRecorder();
        await startRecording();

        mockRecorderState = {
          ...mockRecorderState,
          isRecording: true,
          durationMillis: 1_000,
        };
        await view.rerender(<Recorder {...props} />);
        await flushAct();

        mockRecorder.uri = null;
        mockRecorderState = {
          isRecording: false,
          durationMillis: 5_000,
          url: fallbackUri,
          mediaServicesDidReset: false,
        };
        await view.rerender(<Recorder {...props} />);
        await flushAct();
        expect(screen.getByText('Recorded 0:05 — ready to submit')).toBeTruthy();

        await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
        await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

        expect(apiUploadAudio).toHaveBeenCalledWith(
          ENDPOINT,
          fallbackUri,
          { questionId: QUESTION_ID, requestId: REQUEST_ID },
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(revoke).toHaveBeenCalledWith(fallbackUri);
      } finally {
        if (previousDescriptor) {
          Object.defineProperty(URL, 'revokeObjectURL', previousDescriptor);
        } else {
          delete (URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL })
            .revokeObjectURL;
        }
      }
    });

    it('reports an interruption when media services reset during recording', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };
      await view.rerender(<Recorder {...props} />);
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Recording was interrupted by the device. Please record your answer again.',
        ),
      );
      await waitFor(() => expect(screen.getByLabelText('Start recording')).toBeTruthy());
      expect(mockRecorder.stop).toHaveBeenCalled();
    });

    it('stops recording when the app moves to the background', async () => {
      await renderRecorder();
      await startRecording();

      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
      });
      await waitFor(() => expect(screen.getByLabelText('Start recording')).toBeTruthy());

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('stops and deletes a recording when the recorder unmounts', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      await view.unmount();
      await flushAct();

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('shares one native stop across repeated background notifications', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await stop.promise;
        mockRecorder.uri = RECORDING_URI;
      });
      await renderRecorder();
      await startRecording();

      for (const handler of appStateHandlers) {
        handler('background');
        handler('background');
      }
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);

      await act(async () => {
        stop.resolve();
        await flushMicrotasks();
      });

      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('resets lifecycle cleanup ownership so a later recording is stopped independently', async () => {
      await renderRecorder();
      await startRecording();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });
      mockRecorder.uri = null;
      await startRecording();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      expect(mockRecorder.stop).toHaveBeenCalledTimes(2);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('waits for lifecycle recording cleanup before recovering on foreground', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await stop.promise;
        mockRecorder.uri = RECORDING_URI;
      });
      const { props } = await renderRecorder();
      await startRecording();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 98 },
      });

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      for (const handler of appStateHandlers) handler('background');
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      for (const handler of appStateHandlers) handler('active');
      await flushAct();

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(apiFetch).not.toHaveBeenCalled();

      await act(async () => {
        stop.resolve();
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 98 } }));

      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
    });

    it('keeps a completed recording during a transient inactive state', async () => {
      await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await act(async () => {
        for (const handler of appStateHandlers) handler('inactive');
        await flushMicrotasks();
      });

      expect(screen.getByText('Submit Answer')).toBeTruthy();
      expect(File).not.toHaveBeenCalled();
    });

    it('hides the pulse ring when reduce motion is enabled', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      await renderRecorder();
      await startRecording();

      expect(screen.getByLabelText('Stop recording')).toBeTruthy();
      expect(pulseRingCount()).toBe(0);
    });
  });

  describe('identity changes', () => {
    it('resets the permission banner when the question changes', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      const { view, props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText('Start recording'));
      await waitFor(() => expect(screen.getByText(/Microphone access is needed/)).toBeTruthy());

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(screen.queryByText(/Microphone access is needed/)).toBeNull();
      expect(screen.getByLabelText('Start recording')).toBeTruthy();
    });

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])(
      'abandons an in-flight recording start when the %s changes and lets the new identity record',
      async (_field, next) => {
        const permission = deferred<{ granted: boolean }>();
        asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
        const { view, props } = await renderRecorder();
        const staleStart = invokePressHandler(view, 'Start recording');
        const nextError = jest.fn();
        const nextResult = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <Recorder
            {...props}
            {...next}
            onError={nextError}
            onResult={nextResult}
            onRecoveryUnresolved={nextRecovery}
          />,
        );
        permission.resolve({ granted: true });
        await staleStart;
        await flushAct();

        expect(mockRecorder.record).not.toHaveBeenCalled();
        expect(props.onError).not.toHaveBeenCalled();
        expect(nextError).not.toHaveBeenCalled();
        expect(nextResult).not.toHaveBeenCalled();
        expect(nextRecovery).not.toHaveBeenCalled();
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();

        asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: true });
        await startRecording();
        expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      },
    );

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])(
      'does not adopt or report an old stop with no URI after the %s changes',
      async (_field, next) => {
        const nativeStop = deferred<void>();
        const { view, props } = await renderRecorder();
        await startRecording();
        mockRecorder.stop.mockImplementation(async () => nativeStop.promise);
        mockRecorderState.durationMillis = 5_000;
        const staleStop = invokePressHandler(view, 'Stop recording');
        const nextError = jest.fn();
        const nextResult = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <Recorder
            {...props}
            {...next}
            onError={nextError}
            onResult={nextResult}
            onRecoveryUnresolved={nextRecovery}
          />,
        );
        await act(async () => {
          nativeStop.resolve();
          await staleStop;
          await flushMicrotasks();
        });

        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
        expect(props.onError).not.toHaveBeenCalled();
        expect(nextError).not.toHaveBeenCalled();
        expect(nextResult).not.toHaveBeenCalled();
        expect(nextRecovery).not.toHaveBeenCalled();
        expect(screen.queryByText('Submit Answer')).toBeNull();
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])('discards a recorded answer exactly once when the %s changes', async (_field, next) => {
      const { view, props } = await renderRecorder();
      await recordAndStop();

      asMock(File).mockClear();
      await view.rerender(<Recorder {...props} {...next} />);
      await flushAct();

      expect(File).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('deletes both the saved recording and a distinct native candidate on identity change', async () => {
      const nativeCandidate = 'file:///recordings/native-candidate.m4a';
      const { view, props } = await renderRecorder();
      await recordAndStop();
      mockRecorder.uri = nativeCandidate;
      asMock(File).mockClear();

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(deletedRecordingUris()).toEqual(
        expect.arrayContaining([RECORDING_URI, nativeCandidate]),
      );
      expect(deletedRecordingUris()).toHaveLength(2);
    });

    it('treats native file cleanup failures as best effort during identity changes', async () => {
      const { view, props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockImplementation(() => {
        throw new Error('cache unavailable');
      });

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('revokes a browser blob recording instead of treating it as a local file', async () => {
      const blobUri = 'blob:https://app.example/recording';
      const revoke = jest.fn();
      const previousDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.uri = blobUri;
        });
        const { view, props } = await renderRecorder();
        await recordAndStop();
        asMock(File).mockClear();

        await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
        await flushAct();

        expect(revoke).toHaveBeenCalledWith(blobUri);
        expect(File).not.toHaveBeenCalled();
      } finally {
        if (previousDescriptor) {
          Object.defineProperty(URL, 'revokeObjectURL', previousDescriptor);
        } else {
          delete (URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL })
            .revokeObjectURL;
        }
      }
    });

    it('does not pass an unsupported recording URI to the native file API', async () => {
      const remoteUri = 'https://attacker.example/recording.m4a';
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = remoteUri;
      });
      const { view, props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(File).not.toHaveBeenCalled();
    });

    it('does not delete a local recording that no longer exists', async () => {
      const deleteFile = jest.fn();
      asMock(File).mockImplementation((uri: string) => ({
        uri,
        exists: false,
        delete: deleteFile,
      }));
      const { view, props } = await renderRecorder();
      await recordAndStop();

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(File).toHaveBeenCalledWith(RECORDING_URI);
      expect(deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('uploads directly with a durable requestId and delivers the result', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));

      expect(savePendingAssessment).toHaveBeenCalledWith({
        ownerId: OWNER_ID,
        endpoint: ENDPOINT,
        questionId: QUESTION_ID,
        requestId: REQUEST_ID,
        createdAt: expect.any(Number),
        stage: 'prepared',
      });
      expect(markPendingAssessmentStage).toHaveBeenCalledWith(REQUEST_ID, 'direct-posting');
      expect(apiRequestAudioUpload).toHaveBeenCalledWith('audio/mp4');
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        { questionId: QUESTION_ID, requestId: REQUEST_ID },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(props.parseResult).toHaveBeenCalledWith({ ok: true });
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('submits the saved URI even when the native recorder clears its URI afterward', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      mockRecorder.uri = null;

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        { questionId: QUESTION_ID, requestId: REQUEST_ID },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('posts the audio to S3 and submits the stable audioKey when granted an upload form', async () => {
      const uploadFields = {
        key: S3_AUDIO_KEY,
        'Content-Type': 'audio/mp4',
        Policy: 'signed-policy',
      };
      asMock(apiRequestAudioUpload).mockResolvedValue({
        mode: 's3',
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields,
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      });
      asMock(apiFetch).mockResolvedValue({ ok: 's3' });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 's3' } }));

      expect(apiPostPresignedAudio).toHaveBeenCalledWith(
        'https://s3.example.com/upload',
        uploadFields,
        RECORDING_URI,
        'audio/mp4',
        25 * 1024 * 1024,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(markPendingAssessmentStage).toHaveBeenCalledWith(
        REQUEST_ID,
        's3-granted',
        S3_AUDIO_KEY,
      );
      expect(apiFetch).toHaveBeenCalledWith(
        ENDPOINT,
        expect.objectContaining({
          method: 'POST',
          body: {
            questionId: QUESTION_ID,
            requestId: REQUEST_ID,
            audioKey: S3_AUDIO_KEY,
          },
          timeoutMs: AUDIO_TIMEOUT_MS,
        }),
      );
      expect(apiUploadAudio).not.toHaveBeenCalled();
    });

    it.each(['direct', 's3'] as const)(
      'does not send audio when the durable %s stage transition is rejected',
      async (mode) => {
        if (mode === 's3') {
          asMock(apiRequestAudioUpload).mockResolvedValue({
            mode: 's3',
            uploadUrl: 'https://s3.example.com/upload',
            uploadFields: { key: S3_AUDIO_KEY },
            audioKey: S3_AUDIO_KEY,
            contentType: 'audio/mp4',
            expiresIn: 300,
            maxBytes: 25 * 1024 * 1024,
          });
        }
        asMock(markPendingAssessmentStage).mockResolvedValue(false);
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());

        expect(apiUploadAudio).not.toHaveBeenCalled();
        expect(apiPostPresignedAudio).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
      },
    );

    it('reuses the durable requestId of an existing pending record on retry', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(savePendingAssessment).not.toHaveBeenCalled();
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        { questionId: QUESTION_ID, requestId: REQUEST_ID },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('does not upload when a different pending record exists and recovers instead', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({
          requestId: OTHER_REQUEST_ID,
          questionId: OTHER_QUESTION_ID,
        }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { ok: 'other' },
      });

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Your interrupted assessment was saved. Your current learning state has been refreshed.',
        ),
      );

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${OTHER_REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each([
      ['request id', { requestId: OTHER_REQUEST_ID }],
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])(
      'never overwrites pending retry metadata when only the %s differs',
      async (_field, overrides) => {
        const { props } = await renderRecorder();
        await recordAndStop();
        const existing = pendingRecord(overrides);
        asMock(loadPendingAssessment).mockResolvedValue(existing);
        asMock(apiFetch).mockResolvedValue({
          status: 'completed',
          context: existing.endpoint === '/diagnostic/answer' ? 'diagnostic' : 'practice',
          questionId: existing.questionId,
          response: { ok: 'existing' },
        });

        await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
        await waitFor(() => {
          if (existing.ownerId === OWNER_ID) {
            expect(apiFetch).toHaveBeenCalledWith(`/assessments/${existing.requestId}`, {
              timeoutMs: 5000,
            });
          } else {
            expect(clearPendingAssessment).toHaveBeenCalledWith(existing.requestId);
          }
        });

        expect(apiRequestAudioUpload).not.toHaveBeenCalled();
        expect(apiUploadAudio).not.toHaveBeenCalled();
        expect(savePendingAssessment).not.toHaveBeenCalled();
        if (
          existing.ownerId === OWNER_ID &&
          existing.endpoint === ENDPOINT &&
          existing.questionId === QUESTION_ID
        ) {
          expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'existing' } });
        } else {
          expect(props.onResult).not.toHaveBeenCalled();
        }
      },
    );

    it('never re-uploads when the successful response fails contract parsing', async () => {
      const { props } = await renderRecorder({
        parseResult: () => {
          throw new ContractError();
        },
      });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The assessment was saved, but this app version could not display it. Your learning state has been refreshed.',
        ),
      );

      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('treats an unexpected parser failure as ambiguous instead of a known contract rejection', async () => {
      const parserFailure = new Error('unexpected parser defect');
      const { props } = await renderRecorder({
        parseResult: () => {
          throw parserFailure;
        },
      });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());

      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('keeps the recording when retry metadata cannot be saved', async () => {
      asMock(savePendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The app could not securely save retry information, so your recording was not uploaded. Please try again.',
        ),
      );

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(screen.getByText('Submit Answer')).toBeTruthy();
    });

    it.each([
      [400, 'The server rejected this recording. Please review the question and try again.'],
      [403, 'The server rejected this recording. Please review the question and try again.'],
      [404, 'The server rejected this recording. Please review the question and try again.'],
      [413, 'The recording is too large. Please record a shorter answer.'],
      [415, 'This recording format is not supported. Please record your answer again.'],
      [
        422,
        'The recording could not be assessed. Speak for at least a moment and keep the answer under two minutes.',
      ],
    ])(
      'returns to the recorded phase after a definite %i rejection',
      async (status, expectedMessage) => {
        asMock(apiUploadAudio).mockRejectedValue(
          new ApiError(status, `Request failed with status ${status}`),
        );
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
        await waitFor(() => expect(props.onError).toHaveBeenCalledWith(expectedMessage));

        await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
        expect(props.onResult).not.toHaveBeenCalled();
        expect(screen.getByText('Submit Answer')).toBeTruthy();
      },
    );

    it('keeps controls locked when rejected retry metadata cannot be cleared', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(413, 'too large'));
      asMock(clearPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Secure retry information could not be cleared. Restart the app before recording another answer.',
        ),
      );

      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('blocks re-recording when an old recovered request still cannot be cleared', async () => {
      jest.useFakeTimers();
      asMock(apiRequestAudioUpload).mockResolvedValue({
        mode: 's3',
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields: { key: S3_AUDIO_KEY },
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      });
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }));
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(413, 'object rejected'));
      asMock(clearPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      await advancePolls(5);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Re-record' })).toBeTruthy());
      expect(props.onError).toHaveBeenCalledWith(
        'The interrupted upload is no longer available. Please submit the recording again if the question remains.',
      );
      const recordCallsBeforeRetry = mockRecorder.record.mock.calls.length;

      await fireEvent.press(screen.getByRole('button', { name: 'Re-record' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Secure retry information could not be cleared. Restart the app before recording another answer.',
        ),
      );

      expect(mockRecorder.record).toHaveBeenCalledTimes(recordCallsBeforeRetry);
      expect(deletedRecordingUris()).not.toContain(RECORDING_URI);
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('shows the rate-limit copy on a 429 rejection', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(429, 'Request failed with status 429'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Too many attempts. Please wait and try again later.',
        ),
      );
      expect(screen.getByText('Submit Answer')).toBeTruthy();
    });

    it('recovers the durable result after a network failure mid-upload', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(0, 'Could not connect to the server.'));
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { ok: 'recovered' },
      });

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({
          parsed: { ok: 'recovered' },
        }),
      );

      expect(props.parseResult).toHaveBeenCalledWith({ ok: 'recovered' });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('reports an unrecoverable handoff when reconciliation marking fails after success', async () => {
      asMock(markPendingAssessmentForReconciliation).mockResolvedValue(false);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The result is safe, but secure retry information could not be updated. Restart the app to finish recovery.',
        ),
      );

      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('disables controls and guards presses while an upload is in flight', async () => {
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(screen.getByLabelText('Start recording').props.accessibilityState).toEqual({
          disabled: true,
        }),
      );
      expect(screen.getByLabelText('Uploading and assessing your answer')).toBeTruthy();

      await fireEvent.press(screen.getByLabelText('Start recording'));
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(screen.getByLabelText('Start recording').props.accessibilityState).toEqual({
        disabled: false,
      });
    });

    it('uses the latest parser and result callback when a same-identity upload completes', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { view, props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      const nextParse = jest.fn((data: unknown) => ({ latest: data }));
      const nextResult = jest.fn();
      await view.rerender(<Recorder {...props} parseResult={nextParse} onResult={nextResult} />);
      await flushAct();
      await act(async () => {
        upload.resolve({ score: 94 });
        await flushMicrotasks();
      });

      expect(nextParse).toHaveBeenCalledWith({ score: 94 });
      expect(nextResult).toHaveBeenCalledWith({ latest: { score: 94 } });
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])(
      'aborts an in-flight upload and suppresses its result when the %s changes',
      async (_field, next) => {
        const upload = deferred<{ score: number }>();
        asMock(apiUploadAudio).mockReturnValue(upload.promise);
        const { view, props } = await renderRecorder();
        await recordAndStop();
        await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
        await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
        const signal = asMock(apiUploadAudio).mock.calls[0][3].signal as AbortSignal;
        const nextParse = jest.fn((data: unknown) => ({ current: data }));
        const nextResult = jest.fn();
        const nextError = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <Recorder
            {...props}
            {...next}
            parseResult={nextParse}
            onResult={nextResult}
            onError={nextError}
            onRecoveryUnresolved={nextRecovery}
          />,
        );
        await flushAct();
        expect(signal.aborted).toBe(true);

        await act(async () => {
          upload.resolve({ score: 95 });
          await flushMicrotasks();
        });

        expect(props.parseResult).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onError).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(nextParse).not.toHaveBeenCalled();
        expect(nextResult).not.toHaveBeenCalled();
        expect(nextError).not.toHaveBeenCalled();
        expect(nextRecovery).not.toHaveBeenCalled();
        expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      },
    );

    it('aborts and cleans up an in-flight upload when the app backgrounds', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      const signal = asMock(apiUploadAudio).mock.calls[0][3].signal as AbortSignal;

      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      expect(signal.aborted).toBe(true);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      await act(async () => {
        upload.resolve({ score: 96 });
        await flushMicrotasks();
      });
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.parseResult).not.toHaveBeenCalled();
    });

    it('reconciles the current identity after a stale upload finishes following lifecycle cleanup', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      asMock(loadPendingAssessment)
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 97, recovered: true },
      });
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());

      // Restore only the observable lifecycle state. Deliberately do not emit a
      // foreground event: the stale submission's finally block must initiate
      // reconciliation after it releases the operation lock.
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        upload.resolve({ score: 95 });
        await flushMicrotasks();
      });

      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({
          parsed: { score: 97, recovered: true },
        }),
      );
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(props.parseResult).not.toHaveBeenCalledWith({ score: 95 });
    });

    it('aborts and cleans up an in-flight upload when the recorder unmounts', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { view, props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      const signal = asMock(apiUploadAudio).mock.calls[0][3].signal as AbortSignal;

      await view.unmount();
      await flushAct();

      expect(signal.aborted).toBe(true);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      await act(async () => {
        upload.resolve({ score: 96 });
        await flushMicrotasks();
      });
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('does not deliver a late submission result after the app is no longer active', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        upload.resolve({ score: 91 });
        await flushMicrotasks();
      });

      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });
  });

  describe('crash recovery', () => {
    it('does not let a delayed recovery read overtake an active recording', async () => {
      const pending = deferred<PendingAssessment | null>();
      const status = deferred<unknown>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      asMock(apiFetch).mockReturnValue(status.promise);
      const { props } = await renderRecorder();

      await startRecording();
      await act(async () => {
        pending.resolve(pendingRecord());
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Stop recording')).toBeTruthy();
    });

    it('suppresses a delayed recovery storage error after recording starts', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      const { props } = await renderRecorder();

      await startRecording();
      await act(async () => {
        pending.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Stop recording')).toBeTruthy();
    });

    it('does not let a delayed recovery read overtake a recording start before permission resolves', async () => {
      const pending = deferred<PendingAssessment | null>();
      const permission = deferred<{ granted: boolean }>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();

      const start = invokePressHandler(view, 'Start recording');
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      await act(async () => {
        pending.resolve(pendingRecord());
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();

      await act(async () => {
        permission.resolve({ granted: true });
        await start;
      });
      await waitFor(() => expect(screen.getByLabelText('Stop recording')).toBeTruthy());
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
    });

    it('does not read retry storage on a foreground signal while already recording', async () => {
      await renderRecorder();
      await startRecording();
      asMock(loadPendingAssessment).mockClear();

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Stop recording')).toBeTruthy();
    });

    it('does not read retry storage from a stale foreground listener after unmount', async () => {
      const { view, props } = await renderRecorder();
      const staleAppStateHandlers = [...appStateHandlers];
      asMock(loadPendingAssessment).mockClear();

      await view.unmount();
      await act(async () => {
        for (const handler of staleAppStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])('ignores an old retry-storage result after the %s changes', async (_field, next) => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValueOnce(pending.promise).mockResolvedValue(null);
      const { view, props } = await renderRecorder();
      const nextError = jest.fn();
      const nextResult = jest.fn();
      const nextRecovery = jest.fn();

      await view.rerender(
        <Recorder
          {...props}
          {...next}
          onError={nextError}
          onResult={nextResult}
          onRecoveryUnresolved={nextRecovery}
        />,
      );
      await act(async () => {
        pending.resolve(pendingRecord());
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(nextError).not.toHaveBeenCalled();
      expect(nextResult).not.toHaveBeenCalled();
      expect(nextRecovery).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('suppresses an old retry-storage failure after the route identity changes', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValueOnce(pending.promise).mockResolvedValue(null);
      const { view, props } = await renderRecorder();
      const nextError = jest.fn();

      await view.rerender(
        <Recorder {...props} questionId={OTHER_QUESTION_ID} onError={nextError} />,
      );
      await act(async () => {
        pending.reject(new Error('old keychain failure'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(nextError).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('delivers a completed diagnostic recovery with its diagnostic context', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ endpoint: '/diagnostic/answer' }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'diagnostic',
        questionId: QUESTION_ID,
        response: { level: 'B1' },
      });
      const { props } = await renderRecorder({ endpoint: '/diagnostic/answer' });

      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(props.parseResult).toHaveBeenCalledWith({ level: 'B1' });
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { level: 'B1' } });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    });

    it.each(['returns false', 'rejects'] as const)(
      'keeps a completed recovery locked when reconciliation persistence %s',
      async (failureMode) => {
        asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
        asMock(apiFetch).mockResolvedValue({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 99 },
        });
        if (failureMode === 'returns false') {
          asMock(markPendingAssessmentForReconciliation).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentForReconciliation).mockRejectedValue(
            new Error('keychain unavailable'),
          );
        }
        const { props } = await renderRecorder();

        expect(props.onError).toHaveBeenCalledWith(
          'The result is safe, but secure retry information could not be updated. Restart the app to finish recovery.',
        );
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      },
    );

    it.each(['returns false', 'rejects'] as const)(
      'keeps an invalid completed result locked when reconciliation persistence %s',
      async (failureMode) => {
        asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
        asMock(apiFetch).mockResolvedValue({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { unsupported: true },
        });
        if (failureMode === 'returns false') {
          asMock(markPendingAssessmentForReconciliation).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentForReconciliation).mockRejectedValue(
            new Error('keychain unavailable'),
          );
        }
        const { props } = await renderRecorder({
          parseResult: () => {
            throw new ContractError();
          },
        });

        expect(props.onError).toHaveBeenCalledWith(
          'Secure retry information could not be updated. Restart the app to finish recovery.',
        );
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      },
    );

    it.each(['returns false', 'rejects'] as const)(
      'keeps unresolved recovery locked when reconciliation persistence %s',
      async (failureMode) => {
        asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
        asMock(apiFetch).mockResolvedValue({
          status: 'pending',
          context: 'practice',
          questionId: QUESTION_ID,
        });
        if (failureMode === 'returns false') {
          asMock(markPendingAssessmentForReconciliation).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentForReconciliation).mockRejectedValue(
            new Error('keychain unavailable'),
          );
        }
        const { props } = await renderRecorder();

        expect(props.onError).toHaveBeenCalledWith(
          'Secure retry information could not be updated. Restart the app to finish recovery.',
        );
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      },
    );

    it('allows only one mounted recorder instance to own recovery after concurrent storage reads', async () => {
      const status = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(status.promise);
      const firstResult = jest.fn();
      const secondResult = jest.fn();
      const sharedProps = {
        ownerId: OWNER_ID,
        questionId: QUESTION_ID,
        endpoint: ENDPOINT,
        parseResult: (data: unknown) => ({ parsed: data }),
        onError: jest.fn(),
        onRecoveryUnresolved: jest.fn(),
      };

      await render(
        <>
          <Recorder {...sharedProps} onResult={firstResult} />
          <Recorder {...sharedProps} onResult={secondResult} />
        </>,
      );
      await flushAct();

      expect(loadPendingAssessment).toHaveBeenCalledTimes(2);
      expect(apiFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        status.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 93 },
        });
        await flushMicrotasks();
      });

      expect(firstResult.mock.calls.length + secondResult.mock.calls.length).toBe(1);
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).toHaveBeenCalledTimes(1);
    });

    it('releases the global recovery lease when its owner unmounts so another instance can recover', async () => {
      const firstStatus = deferred<unknown>();
      const secondRead = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(pendingRecord())
        .mockReturnValueOnce(secondRead.promise)
        .mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockReturnValueOnce(firstStatus.promise)
        .mockResolvedValue({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 96 },
        });
      const firstResult = jest.fn();
      const secondResult = jest.fn();
      const sharedProps = {
        ownerId: OWNER_ID,
        questionId: QUESTION_ID,
        endpoint: ENDPOINT,
        parseResult: (data: unknown) => ({ parsed: data }),
        onError: jest.fn(),
        onRecoveryUnresolved: jest.fn(),
      };
      const view = await render(
        <>
          <Recorder key="first" {...sharedProps} onResult={firstResult} />
          <Recorder key="second" {...sharedProps} onResult={secondResult} />
        </>,
      );
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      await act(async () => {
        secondRead.resolve(pendingRecord());
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(1);

      await view.rerender(<Recorder key="second" {...sharedProps} onResult={secondResult} />);
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      await waitFor(() => expect(secondResult).toHaveBeenCalledWith({ parsed: { score: 96 } }));
      expect(firstResult).not.toHaveBeenCalled();
      expect(apiFetch).toHaveBeenCalledTimes(2);

      await act(async () => {
        firstStatus.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 1 },
        });
        await flushMicrotasks();
      });
      expect(firstResult).not.toHaveBeenCalled();
    });

    it('does not start recovery when a secure-store read resolves after backgrounding', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      const { props } = await renderRecorder();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        pending.resolve(pendingRecord());
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('suppresses a late secure-store error after the app backgrounds', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      const { props } = await renderRecorder();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        pending.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.queryByText(RECOVERING_TEXT)).toBeNull();
    });

    it('clears a prepared handoff without polling because no network request started', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'prepared' }));
      const { props } = await renderRecorder();

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each([
      ['another owner', { ownerId: OTHER_OWNER_ID }],
      ['a prepared request', { stage: 'prepared' as const }],
    ])(
      'keeps recovery locked when retry metadata for %s cannot be cleared',
      async (_case, next) => {
        asMock(loadPendingAssessment).mockResolvedValue(pendingRecord(next));
        asMock(clearPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
        const { props } = await renderRecorder();

        expect(apiFetch).not.toHaveBeenCalled();
        expect(props.onError).toHaveBeenCalledWith(
          'Secure retry information could not be cleared. Restart the app before recording another answer.',
        );
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      },
    );

    it('resubmits the same S3 key and request id after a crash before assessment POST', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockResolvedValueOnce({ score: 77 });
      const { props } = await renderRecorder();

      // Do not race a possibly-started original POST on the first 404.
      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(5);

      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 77 } });
      expect(apiFetch).toHaveBeenNthCalledWith(1, `/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(apiFetch).toHaveBeenNthCalledWith(7, ENDPOINT, {
        method: 'POST',
        body: {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          audioKey: S3_AUDIO_KEY,
        },
        timeoutMs: AUDIO_TIMEOUT_MS,
      });
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    });

    it.each(['returns false', 'rejects'] as const)(
      'does not replay a successful S3 resubmission when reconciliation persistence %s',
      async (failureMode) => {
        jest.useFakeTimers();
        asMock(loadPendingAssessment).mockResolvedValue(
          pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
        );
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        asMock(apiFetch).mockResolvedValueOnce({ score: 84 });
        if (failureMode === 'returns false') {
          asMock(markPendingAssessmentForReconciliation).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentForReconciliation).mockRejectedValue(
            new Error('keychain unavailable'),
          );
        }
        const { props } = await renderRecorder();

        await advancePolls(5);

        expect(props.onError).toHaveBeenCalledWith(
          'The result is safe, but secure retry information could not be updated. Restart the app to finish recovery.',
        );
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(apiFetch).toHaveBeenCalledTimes(7);
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();

        await advancePolls(5);
        expect(apiFetch).toHaveBeenCalledTimes(7);
      },
    );

    it('reconciles instead of replaying an S3 response that this app cannot parse', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockResolvedValueOnce({ unsupported: true });
      const { props } = await renderRecorder({
        parseResult: () => {
          throw new ContractError();
        },
      });

      await advancePolls(5);

      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(
        'The assessment was saved, but this app version could not display it. Your learning state has been refreshed.',
      );
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).toHaveBeenCalledTimes(7);
    });

    it('resubmits a pending S3 handoff for another route and refreshes canonical state', async () => {
      jest.useFakeTimers();
      const pendingEndpoint = '/diagnostic/answer' as const;
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({
          stage: 's3-granted',
          endpoint: pendingEndpoint,
          questionId: OTHER_QUESTION_ID,
          audioKey: S3_AUDIO_KEY,
        }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockResolvedValueOnce({ score: 77 });
      const { props } = await renderRecorder();

      await advancePolls(5);

      expect(apiFetch).toHaveBeenNthCalledWith(7, pendingEndpoint, {
        method: 'POST',
        body: {
          questionId: OTHER_QUESTION_ID,
          requestId: REQUEST_ID,
          audioKey: S3_AUDIO_KEY,
        },
        timeoutMs: AUDIO_TIMEOUT_MS,
      });
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(
        'Your interrupted assessment was saved. Your current learning state has been refreshed.',
      );
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    });

    it.each([0, 408, 503])(
      'retries the identical S3 assessment POST after ambiguous status %i',
      async (ambiguousStatus) => {
        jest.useFakeTimers();
        asMock(loadPendingAssessment).mockResolvedValue(
          pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
        );
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(ambiguousStatus, 'temporary failure'));
        for (let i = 0; i < 3; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        asMock(apiFetch).mockResolvedValueOnce({ score: 83 });
        const { props } = await renderRecorder();

        await advancePolls(8);

        const assessmentPosts = asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT);
        expect(assessmentPosts).toEqual([
          [
            ENDPOINT,
            {
              method: 'POST',
              body: {
                questionId: QUESTION_ID,
                requestId: REQUEST_ID,
                audioKey: S3_AUDIO_KEY,
              },
              timeoutMs: AUDIO_TIMEOUT_MS,
            },
          ],
          [
            ENDPOINT,
            {
              method: 'POST',
              body: {
                questionId: QUESTION_ID,
                requestId: REQUEST_ID,
                audioKey: S3_AUDIO_KEY,
              },
              timeoutMs: AUDIO_TIMEOUT_MS,
            },
          ],
        ]);
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 83 } });
      },
    );

    it('keeps the same S3 handoff after replay is rate limited and an owner completes it', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(429, 'rate limited'))
        .mockResolvedValueOnce({
          status: 'processing',
          context: 'practice',
          questionId: QUESTION_ID,
        })
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 86 },
        });
      const { props } = await renderRecorder();

      await advancePolls(7);

      expect(apiFetch).toHaveBeenNthCalledWith(7, ENDPOINT, {
        method: 'POST',
        body: {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          audioKey: S3_AUDIO_KEY,
        },
        timeoutMs: AUDIO_TIMEOUT_MS,
      });
      expect(props.onResult).toHaveBeenCalledTimes(1);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 86 } });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledTimes(1);
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(Crypto.randomUUID).not.toHaveBeenCalled();
    });

    it('bounds repeated ambiguous S3 assessment POST attempts', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      asMock(apiFetch).mockImplementation(async (path: string) => {
        if (path === ENDPOINT) throw new ApiError(500, 'temporary failure');
        throw new ApiError(404, 'not submitted');
      });
      await renderRecorder();

      await advancePolls(30);

      const assessmentPosts = asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT);
      expect(assessmentPosts).toHaveLength(3);
      for (const [, options] of assessmentPosts) {
        expect(options.body).toEqual({
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          audioKey: S3_AUDIO_KEY,
        });
      }
    });

    it('applies exponential backoff before the third S3 assessment resubmission', async () => {
      jest.useFakeTimers();
      const startedAt = new Date('2030-01-01T00:00:00Z');
      jest.setSystemTime(startedAt);
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({
          createdAt: startedAt.getTime(),
          stage: 's3-granted',
          audioKey: S3_AUDIO_KEY,
        }),
      );
      asMock(apiFetch).mockImplementation(async (path: string) => {
        if (path === ENDPOINT) throw new ApiError(503, 'temporary failure');
        throw new ApiError(404, 'not submitted');
      });
      await renderRecorder();

      const assessmentPostCount = () =>
        asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT).length;

      await advancePolls(5);
      expect(assessmentPostCount()).toBe(1);
      await advancePolls(3);
      expect(assessmentPostCount()).toBe(2);
      await advancePolls(4);
      expect(assessmentPostCount()).toBe(2);
      await advancePolls(1);
      expect(assessmentPostCount()).toBe(3);
    });

    it('stops S3 resubmission immediately when authentication expires', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(401, 'signed out'));
      const { props } = await renderRecorder();

      await advancePolls(5);
      expect(apiFetch).toHaveBeenCalledTimes(7);
      await advancePolls(5);

      expect(apiFetch).toHaveBeenCalledTimes(7);
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('keeps polling the same S3 handoff when its resubmission is already processing', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(409, 'processing'))
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 81 },
        });
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(6);

      expect(apiFetch).toHaveBeenCalledTimes(8);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 81 } });
      expect(props.onError).not.toHaveBeenCalled();
    });

    it.each([400, 403, 404, 413, 415, 422])(
      'stops S3 recovery on a definite %i rejection without creating a new request',
      async (status) => {
        jest.useFakeTimers();
        asMock(loadPendingAssessment).mockResolvedValue(
          pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
        );
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(status, 'object unavailable'));
        const { props } = await renderRecorder();

        await advancePolls(5);
        expect(props.onError).toHaveBeenCalledWith(
          'The interrupted upload is no longer available. Please submit the recording again if the question remains.',
        );
        expect(apiFetch).toHaveBeenCalledTimes(7);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
        expect(Crypto.randomUUID).not.toHaveBeenCalled();
      },
    );

    it('still checks for a durable result when recovery starts after the five-minute processing lease', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ createdAt: Date.now() - 6 * 60_000 }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 88 },
      });
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 88 } });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('keeps the bounded recovery window at the exact 25-hour retention boundary', async () => {
      jest.useFakeTimers();
      const startedAt = new Date('2030-01-02T12:00:00Z');
      jest.setSystemTime(startedAt);
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ createdAt: startedAt.getTime() - 25 * 60 * 60_000 }),
      );
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(503, 'temporary failure'))
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 89 },
        });
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 89 } });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('performs only the final status read beyond the 25-hour retention boundary', async () => {
      jest.useFakeTimers();
      const startedAt = new Date('2030-01-02T12:00:00Z');
      jest.setSystemTime(startedAt);
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ createdAt: startedAt.getTime() - 25 * 60 * 60_000 - 1 }),
      );
      asMock(apiFetch).mockRejectedValue(new ApiError(503, 'temporary failure'));
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(
        'The interrupted assessment expired safely. Your learning state has been refreshed.',
      );
    });

    it('clears a pending record owned by another user without polling', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ ownerId: OTHER_OWNER_ID }));
      const { props } = await renderRecorder();

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('refreshes immediately when the pending record is a reconcile tombstone', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'reconcile' }));
      const { props } = await renderRecorder();

      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('reports when secure retry storage is unavailable', async () => {
      asMock(loadPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();

      expect(props.onError).toHaveBeenCalledWith(
        'Secure retry information is temporarily unavailable. Restart the app before recording another answer.',
      );
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('polls a processing assessment until the durable result arrives', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockResolvedValueOnce({
          status: 'processing',
          context: 'practice',
          questionId: QUESTION_ID,
        })
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 7 },
        });
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(props.onResult).not.toHaveBeenCalled();

      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(props.parseResult).toHaveBeenCalledWith({ score: 7 });
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 7 } });
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('does not deliver a late recovered result after the app is no longer active', async () => {
      const status = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(status.promise);
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        status.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 92 },
        });
        await flushMicrotasks();
      });

      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])('does not deliver a recovered result after the %s changes', async (_field, next) => {
      const status = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValueOnce(pendingRecord()).mockResolvedValue(null);
      asMock(apiFetch).mockReturnValue(status.promise);
      const { view, props } = await renderRecorder();
      expect(apiFetch).toHaveBeenCalledTimes(1);
      const nextParse = jest.fn((data: unknown) => ({ current: data }));
      const nextResult = jest.fn();
      const nextError = jest.fn();
      const nextRecovery = jest.fn();

      await view.rerender(
        <Recorder
          {...props}
          {...next}
          parseResult={nextParse}
          onResult={nextResult}
          onError={nextError}
          onRecoveryUnresolved={nextRecovery}
        />,
      );
      await flushAct();
      await act(async () => {
        status.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 97 },
        });
        await flushMicrotasks();
      });

      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(nextParse).not.toHaveBeenCalled();
      expect(nextResult).not.toHaveBeenCalled();
      expect(nextError).not.toHaveBeenCalled();
      expect(nextRecovery).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
    });

    it('gives up after three confirmed 404s once ten seconds have elapsed', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'Request failed with status 404'));
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();

      await advancePolls(5);

      expect(apiFetch).toHaveBeenCalledTimes(6);
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(
        'The interrupted upload could not be confirmed. Your learning state has been refreshed; please record again only if the question remains.',
      );
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('uses the third confirmed 404 as the exact absence threshold', async () => {
      jest.useFakeTimers();
      const startedAt = new Date('2030-01-01T00:00:00Z');
      jest.setSystemTime(startedAt);
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ createdAt: startedAt.getTime() }),
      );
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'not submitted'));
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(1);
      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();

      // Move beyond the independent ten-second race window without firing an
      // extra poll; the next scheduled poll is exactly confirmation three.
      jest.setSystemTime(new Date(startedAt.getTime() + 10_000));
      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(3);
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
    });

    it('resets consecutive 404 evidence after the server reports processing', async () => {
      jest.useFakeTimers();
      const startedAt = new Date('2030-01-01T00:00:00Z');
      jest.setSystemTime(startedAt);
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ createdAt: startedAt.getTime() }),
      );
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(404, 'not submitted'))
        .mockResolvedValueOnce({
          status: 'processing',
          context: 'practice',
          questionId: QUESTION_ID,
        })
        .mockRejectedValueOnce(new ApiError(404, 'not submitted'))
        .mockRejectedValueOnce(new ApiError(404, 'not submitted'))
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 90 },
        });
      const { props } = await renderRecorder();

      await advancePolls(1);
      jest.setSystemTime(new Date(startedAt.getTime() + 10_000));
      await advancePolls(3);

      expect(apiFetch).toHaveBeenCalledTimes(5);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 90 } });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('stops polling silently on a 401', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockRejectedValue(new ApiError(401, 'Request failed with status 401'));
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);

      await advancePolls(3);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Start recording').props.accessibilityState).toEqual({
        disabled: true,
      });

      // Presses are guarded while the component is still in the recovering
      // phase.
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      await fireEvent.press(screen.getByLabelText('Start recording'));
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
    });

    it('refreshes when the completed assessment belongs to another route', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { ok: 'other' },
      });
      const { props } = await renderRecorder();

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'Your interrupted assessment was saved. Your current learning state has been refreshed.',
        ),
      );
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each([null, 'completed', {}, [], { context: 'practice' }])(
      'refreshes when the server returns the invalid recovery value %#',
      async (response) => {
        asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
        asMock(apiFetch).mockResolvedValue(response);
        const { props } = await renderRecorder();

        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(
            'The server returned an invalid recovery response. Your learning state has been refreshed.',
          ),
        );
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(props.onResult).not.toHaveBeenCalled();
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

    it.each([
      ['missing context', { status: 'completed', questionId: QUESTION_ID, response: { score: 1 } }],
      [
        'wrong context',
        {
          status: 'completed',
          context: 'diagnostic',
          questionId: QUESTION_ID,
          response: { score: 1 },
        },
      ],
      ['missing question', { status: 'completed', context: 'practice', response: { score: 1 } }],
      [
        'wrong question',
        {
          status: 'completed',
          context: 'practice',
          questionId: OTHER_QUESTION_ID,
          response: { score: 1 },
        },
      ],
      [
        'response on a non-completed status',
        { status: 'pending', context: 'practice', questionId: QUESTION_ID, response: { score: 1 } },
      ],
      [
        'completed status without a response',
        { status: 'completed', context: 'practice', questionId: QUESTION_ID },
      ],
    ])('rejects inconsistent recovery data with %s', async (_case, response) => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue(response);
      const { props } = await renderRecorder();

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The server returned inconsistent recovery data. Your learning state has been refreshed.',
        ),
      );
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
    });

    it('refreshes when the recovered response fails contract parsing', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { bad: true },
      });
      const { props } = await renderRecorder({
        parseResult: () => {
          throw new ContractError();
        },
      });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The assessment was saved, but this app version could not display it. Your learning state has been refreshed.',
        ),
      );
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });
  });
});
