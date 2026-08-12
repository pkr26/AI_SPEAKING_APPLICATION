import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

  asMock(File).mockClear();

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
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
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

    it('discards a recorded answer when the question changes', async () => {
      const { view, props } = await renderRecorder();
      await recordAndStop();

      asMock(File).mockClear();
      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
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

    it('returns to the recorded phase with server copy on a definite 400 rejection', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(400, 'Request failed with status 400'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: 'Submit Answer' }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The server rejected this recording. Please review the question and try again.',
        ),
      );

      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText('Submit Answer')).toBeTruthy();
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
  });

  describe('crash recovery', () => {
    it('clears a prepared handoff without polling because no network request started', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'prepared' }));
      const { props } = await renderRecorder();

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

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

    it('stops S3 recovery on a confirmed missing object without creating a new request', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(400, 'object missing'));
      const { props } = await renderRecorder();

      await advancePolls(5);
      expect(props.onError).toHaveBeenCalledWith(
        'The interrupted upload is no longer available. Please submit the recording again if the question remains.',
      );
      expect(apiFetch).toHaveBeenCalledTimes(7);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    });

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

    it('refreshes when the server returns an invalid recovery response', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({ context: 'practice' });
      const { props } = await renderRecorder();

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          'The server returned an invalid recovery response. Your learning state has been refreshed.',
        ),
      );
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
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
