import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { AudioModule, setAudioModeAsync, useAudioRecorder, type RecordingStatus } from 'expo-audio';
import * as Crypto from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import React from 'react';
import { AccessibilityInfo, AppState, Platform, type AppStateStatus } from 'react-native';

import Recorder from '../src/components/Recorder';
import {
  ApiError,
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  resolveAudioFileDescriptor,
} from '../src/lib/api';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import {
  capturePendingAssessmentGeneration,
  claimPendingAssessmentRecoveryPost,
  clearPendingAssessment,
  ensurePendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentCancelled,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  refundPendingAssessmentRecoveryPost,
  type PendingAssessment,
} from '../src/lib/pending-assessment';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));

jest.mock('expo-file-system', () => ({
  Directory: jest.fn(() => ({ exists: true, list: jest.fn(() => []) })),
  File: jest.fn((uri: string) => ({
    uri,
    exists: true,
    size: 1024,
    delete: jest.fn(),
    arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
  })),
  Paths: { cache: 'file:///cache' },
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
      android: {},
      ios: {},
      web: { mimeType: 'audio/webm', bitsPerSecond: 128_000 },
    },
  },
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

interface FocusRegistration {
  callback: () => void | (() => void);
  cleanup?: void | (() => void);
}

let mockSentinelFocused = true;
let mockSentinelFocusRegistrations: FocusRegistration[] = [];

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const registration: FocusRegistration = { callback };
        mockSentinelFocusRegistrations.push(registration);
        if (mockSentinelFocused) registration.cleanup = callback();
        return () => {
          if (typeof registration.cleanup === 'function') registration.cleanup();
          mockSentinelFocusRegistrations = mockSentinelFocusRegistrations.filter(
            (entry) => entry !== registration,
          );
        };
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
    resolveAudioFileDescriptor: jest.fn(),
  };
});

jest.mock('../src/lib/pending-assessment', () => ({
  capturePendingAssessmentGeneration: jest.fn(),
  claimPendingAssessmentRecoveryPost: jest.fn(),
  clearPendingAssessment: jest.fn(),
  ensurePendingAssessment: jest.fn(),
  loadPendingAssessment: jest.fn(),
  markPendingAssessmentCancelled: jest.fn(),
  markPendingAssessmentForReconciliation: jest.fn(),
  markPendingAssessmentStage: jest.fn(),
  refundPendingAssessmentRecoveryPost: jest.fn(),
}));

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_QUESTION_ID = '550e8400-e29b-41d4-a716-446655440003';
const RECORDING_URI = 'file:///recordings/sentinel.m4a';
const ENDPOINT = '/practice/attempt' as const;
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);
const START_LABEL = t('recorder.startLabel');
const STOP_LABEL = t('recorder.stopLabel');
const SUBMIT_TEXT = t('recorder.submit');
const RERECORD_TEXT = t('recorder.rerecord');

interface MockRecorder {
  getStatus: jest.Mock;
  prepareToRecordAsync: jest.Mock;
  record: jest.Mock;
  stop: jest.Mock;
  uri: string | null;
  isRecording: boolean;
}

interface MockRecorderState {
  canRecord: boolean;
  isRecording: boolean;
  durationMillis: number;
  url: string | null;
  mediaServicesDidReset: boolean;
  metering?: number;
}

let recorder: MockRecorder;
let recorderState: MockRecorderState;
let liveState: MockRecorderState;
let statusListener: ((status: RecordingStatus) => void) | undefined;
let appStateHandlers: ((state: AppStateStatus) => void)[] = [];
const pendingCleanup = new Set<() => void>();
const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');

const asMock = (value: unknown) => value as jest.Mock;

function deferred<T>() {
  let rawResolve!: (value: T) => void;
  let rawReject!: (reason: unknown) => void;
  let settled = false;
  const promise = new Promise<T>((resolve, reject) => {
    rawResolve = resolve;
    rawReject = reject;
  });
  const cleanupDeferred = () => {
    if (settled) return;
    settled = true;
    pendingCleanup.delete(cleanupDeferred);
    rawResolve(undefined as T);
  };
  pendingCleanup.add(cleanupDeferred);
  return {
    promise,
    resolve(value: T) {
      if (settled) return;
      settled = true;
      pendingCleanup.delete(cleanupDeferred);
      rawResolve(value);
    },
    reject(reason: unknown) {
      if (settled) return;
      settled = true;
      pendingCleanup.delete(cleanupDeferred);
      rawReject(reason);
    },
  };
}

async function flushMicrotasks(turns = 20): Promise<void> {
  if (turns <= 0) return;
  await Promise.resolve();
  await flushMicrotasks(turns - 1);
}

function emitStatus(overrides: Partial<RecordingStatus> = {}) {
  if (!statusListener) throw new Error('Recorder status listener missing');
  statusListener({
    id: 'sentinel-recording',
    isFinished: false,
    hasError: false,
    error: null,
    url: null,
    ...overrides,
  });
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

type SentinelRecorderProps = React.ComponentProps<typeof Recorder>;

function props(overrides: Partial<SentinelRecorderProps> = {}): SentinelRecorderProps {
  return {
    ownerId: OWNER_ID,
    questionId: QUESTION_ID,
    endpoint: ENDPOINT,
    parseResult: jest.fn((value: unknown) => ({ parsed: value })),
    onResult: jest.fn(),
    onError: jest.fn(),
    onRecoveryUnresolved: jest.fn(),
    ...overrides,
  };
}

async function renderRecorder(overrides: Partial<SentinelRecorderProps> = {}) {
  const recorderProps = props(overrides);
  const view = await render(<Recorder {...recorderProps} />);
  await act(async () => flushMicrotasks());
  return { view, recorderProps };
}

type PressFiber = { memoizedProps?: { onPress?: unknown }; return: PressFiber | null };

function committedNodePress(node: { unstable_fiber?: unknown }): () => unknown {
  let fiber = node.unstable_fiber as PressFiber | null;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') {
      return fiber.memoizedProps.onPress as () => unknown;
    }
    fiber = fiber.return;
  }
  throw new Error('No committed press handler');
}

function committedPress(label: string): () => unknown {
  return committedNodePress(screen.getByLabelText(label));
}

async function startRecording() {
  await fireEvent.press(screen.getByLabelText(START_LABEL));
  expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
}

async function recordAndStop() {
  await startRecording();
  recorderState.durationMillis = 5_000;
  await fireEvent.press(screen.getByLabelText(STOP_LABEL));
  expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
}

function deletedFileUris(): string[] {
  return asMock(File)
    .mock.results.map((result) => result.value as { uri?: string; delete?: jest.Mock } | undefined)
    .filter((file) => file?.delete?.mock.calls.length)
    .map((file) => file?.uri)
    .filter((uri): uri is string => typeof uri === 'string');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSentinelFocused = true;
  mockSentinelFocusRegistrations = [];
  appStateHandlers = [];
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  // Web suppresses the process-once native cache janitor in this sentinel file.
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  recorderState = {
    canRecord: true,
    isRecording: false,
    durationMillis: 0,
    url: null,
    mediaServicesDidReset: false,
  };
  liveState = new Proxy({} as MockRecorderState, {
    get: (_target, key: keyof MockRecorderState) => recorderState[key],
  });
  recorder = {
    getStatus: jest.fn(() => liveState),
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(() => {
      recorder.isRecording = true;
      recorderState = { ...recorderState, canRecord: true, isRecording: true };
    }),
    stop: jest.fn(async () => {
      recorder.isRecording = false;
      recorder.uri = RECORDING_URI;
      recorderState = { ...recorderState, canRecord: false, isRecording: false };
      emitStatus({ isFinished: true, url: RECORDING_URI });
    }),
    uri: null,
    isRecording: false,
  };
  asMock(useAudioRecorder).mockReset();
  asMock(useAudioRecorder).mockImplementation(
    (_options: unknown, listener?: (status: RecordingStatus) => void) => {
      statusListener = listener;
      return recorder;
    },
  );
  asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: true });
  asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: true });
  asMock(setAudioModeAsync).mockResolvedValue(undefined);
  asMock(Crypto.randomUUID).mockReturnValue(REQUEST_ID);
  asMock(Directory).mockImplementation(() => ({ exists: true, list: jest.fn(() => []) }));
  asMock(File).mockImplementation((uri: string) => ({
    uri,
    exists: true,
    size: 1024,
    delete: jest.fn(),
    arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
  }));
  asMock(loadPendingAssessment).mockResolvedValue(null);
  asMock(capturePendingAssessmentGeneration).mockReturnValue(0);
  asMock(ensurePendingAssessment).mockImplementation(
    async (candidate: PendingAssessment) => candidate,
  );
  asMock(clearPendingAssessment).mockResolvedValue(undefined);
  asMock(markPendingAssessmentForReconciliation).mockResolvedValue(true);
  asMock(markPendingAssessmentCancelled).mockResolvedValue(true);
  asMock(markPendingAssessmentStage).mockResolvedValue(true);
  asMock(claimPendingAssessmentRecoveryPost).mockResolvedValue(true);
  asMock(refundPendingAssessmentRecoveryPost).mockResolvedValue(true);
  asMock(resolveAudioFileDescriptor).mockResolvedValue({ name: 'audio.m4a', type: 'audio/mp4' });
  asMock(apiRequestAudioUpload).mockResolvedValue({ mode: 'direct' });
  asMock(apiUploadAudio).mockImplementation(
    async (
      _endpoint: string,
      _uri: string,
      _fields: unknown,
      options?: { onRequestStarted?: () => void },
    ) => {
      options?.onRequestStarted?.();
      return { ok: true };
    },
  );
  asMock(apiFetch).mockResolvedValue({ ok: true });
  asMock(apiPostPresignedAudio).mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => {
    appStateHandlers.push(handler as (state: AppStateStatus) => void);
    return { remove: jest.fn() };
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    for (const settle of [...pendingCleanup]) settle();
    await flushMicrotasks();
  });
  pendingCleanup.clear();
  jest.useRealTimers();
  if (originalPlatform) Object.defineProperty(Platform, 'OS', originalPlatform);
  jest.restoreAllMocks();
});

// The campaign executes this component harness as its own Stryker pass, so a
// decisive sentinel result is final before the integration pass begins.
describe('Recorder mutation sentinels', () => {
  it('ID 894: a captured post-unmount Start reaches no lock callback', async () => {
    const onInteractionLockChange = jest.fn();
    const { view } = await renderRecorder({ onInteractionLockChange });
    const staleStart = committedPress(START_LABEL);
    await view.unmount();
    await act(async () => flushMicrotasks());
    onInteractionLockChange.mockClear();
    await act(async () => {
      await Promise.resolve(staleStart());
      await flushMicrotasks();
    });
    expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(onInteractionLockChange).not.toHaveBeenCalledWith(true);
  });

  it('IDs 1120/1123: disposal retains an event URL when the getter disappears', async () => {
    const eventUri = 'blob:https://sentinel.example/disposed';
    const revoke = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    recorder.prepareToRecordAsync.mockImplementation(async () => {
      recorder.uri = null;
    });
    recorder.record.mockImplementation(() => {
      throw new Error('web start failed');
    });
    recorder.stop.mockImplementation(async () => {
      emitStatus({ isFinished: true, url: eventUri });
      recorder.uri = null;
    });
    const { recorderProps } = await renderRecorder();
    await fireEvent.press(screen.getByLabelText(START_LABEL));
    expect(recorderProps.onError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
    expect(revoke).toHaveBeenCalledWith(eventUri);
  });

  it('ID 1273: null follower load remains idle when another recovery owns the lease', async () => {
    const followerRead = deferred<PendingAssessment | null>();
    const status = deferred<unknown>();
    asMock(loadPendingAssessment)
      .mockReturnValueOnce(followerRead.promise)
      .mockResolvedValue(pendingRecord());
    asMock(apiFetch).mockReturnValue(status.promise);
    const shared = props();
    await render(
      <>
        <Recorder key="follower" {...shared} />
        <Recorder key="owner" {...shared} />
      </>,
    );
    await act(async () => flushMicrotasks());
    await act(async () => {
      followerRead.resolve(null);
      await flushMicrotasks();
    });
    expect(screen.getAllByText(t('recorder.statusRecovering'))).toHaveLength(1);
    expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
    await act(async () => {
      status.resolve({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 90 },
      });
      await flushMicrotasks();
    });
  });

  it('IDs 1445/1446/1480/1481/1483: stalled-clock recovery performs exactly 153 polls', async () => {
    jest.useFakeTimers();
    jest.spyOn(performance, 'now').mockReturnValue(10_000);
    asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
    asMock(apiFetch).mockRejectedValue(new ApiError(503, 'temporary'));
    await renderRecorder();
    for (let index = 0; index < 160; index += 1) {
      await act(async () => {
        jest.advanceTimersByTime(2_000);
        await flushMicrotasks();
      });
    }
    expect(apiFetch).toHaveBeenCalledTimes(153);
  });

  it('IDs 2313/2324/2329-2331: a URI-less new take cannot inherit the prior take', async () => {
    await renderRecorder();
    await recordAndStop();
    recorder.prepareToRecordAsync.mockImplementation(async () => {
      recorder.uri = 'file:///recordings/prepared-new.m4a';
    });
    recorder.record.mockImplementation(() => {
      recorder.uri = null;
      recorder.isRecording = true;
      recorderState = { ...recorderState, isRecording: true, canRecord: true };
    });
    await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
    recorder.isRecording = false;
    recorderState = {
      ...recorderState,
      canRecord: false,
      isRecording: false,
      durationMillis: 5_000,
      url: null,
    };
    await act(async () => flushMicrotasks());
    expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
    expect(deletedFileUris()).toContain(RECORDING_URI);
    expect(deletedFileUris()).not.toContain('file:///recordings/prepared-new.m4a');
  });

  it('IDs 2329/2330: URI-less re-record preserves a previous take reused as preparation', async () => {
    await renderRecorder();
    await recordAndStop();
    asMock(File).mockClear();
    recorder.prepareToRecordAsync.mockImplementation(async () => {
      recorder.uri = RECORDING_URI;
    });
    recorder.record.mockImplementation(() => {
      recorder.uri = null;
      recorder.isRecording = true;
      recorderState = { ...recorderState, isRecording: true, canRecord: true };
    });

    await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));

    expect(deletedFileUris()).not.toContain(RECORDING_URI);
  });

  it('ID 2300: a new take must be observed before a leftover URI can be adopted', async () => {
    jest.useFakeTimers();
    const leftoverUri = 'file:///recordings/unobserved-new-take.m4a';
    await renderRecorder();
    await recordAndStop();
    recorder.prepareToRecordAsync.mockImplementationOnce(async () => {
      recorder.uri = leftoverUri;
    });
    recorder.record.mockImplementationOnce(() => {
      recorder.isRecording = true;
      recorder.uri = leftoverUri;
      recorderState = { ...recorderState, canRecord: true, isRecording: true };
    });
    await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
    recorder.isRecording = false;
    recorderState = {
      ...recorderState,
      canRecord: false,
      isRecording: false,
      durationMillis: 5_000,
      url: null,
    };

    await act(async () => {
      jest.advanceTimersByTime(200);
      await flushMicrotasks();
    });

    expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
  });

  it('ID 2243: a stale clear cannot continue into native preparation', async () => {
    const clear = deferred<void>();
    asMock(clearPendingAssessment).mockReturnValue(clear.promise);
    const { view, recorderProps } = await renderRecorder();
    await recordAndStop();
    // First successful submission supplies requestIdRef; the next Start clears it.
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
    await act(async () => flushMicrotasks());
    recorder.prepareToRecordAsync.mockClear();
    let staleStart!: Promise<void>;
    await act(() => {
      staleStart = Promise.resolve(committedPress(START_LABEL)()).then(() => undefined);
    });
    await view.rerender(<Recorder {...recorderProps} questionId={OTHER_QUESTION_ID} />);
    await act(async () => {
      clear.resolve();
      await staleStart;
    });
    expect(recorder.prepareToRecordAsync).not.toHaveBeenCalled();
  });

  it('ID 2337: a preparation failure deletes the URI it created before rejecting', async () => {
    const failedUri = 'file:///recordings/pre-prepare-failure.m4a';
    recorder.prepareToRecordAsync.mockImplementationOnce(async () => {
      recorder.uri = failedUri;
      throw new Error('prepare failed');
    });
    const { recorderProps } = await renderRecorder();

    await fireEvent.press(screen.getByLabelText(START_LABEL));

    expect(recorderProps.onError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
    expect(asMock(File).mock.calls.some(([uri]) => uri === failedUri)).toBe(true);
  });

  it('IDs 2486-2488: a submission result delivered after identity change is inert', async () => {
    const response = deferred<unknown>();
    asMock(apiUploadAudio).mockImplementation(
      async (
        _endpoint: string,
        _uri: string,
        _fields: unknown,
        options?: { onRequestStarted?: () => void },
      ) => {
        options?.onRequestStarted?.();
        return response.promise;
      },
    );
    const { view, recorderProps } = await renderRecorder();
    await recordAndStop();
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
    await view.rerender(<Recorder {...recorderProps} questionId={OTHER_QUESTION_ID} />);
    await act(async () => {
      response.resolve({ ok: true });
      await flushMicrotasks();
    });
    expect(recorderProps.onResult).not.toHaveBeenCalled();
    expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
  });

  it('ID 2692: missing request tracking does not fabricate a failed clear', async () => {
    // Hostile UUID output exercises the defensive no-requestId branch without
    // reaching SecureStore. The production UUID provider cannot do this, but
    // the branch must still treat “nothing to clear” as success.
    asMock(Crypto.randomUUID).mockReturnValueOnce('');
    asMock(apiRequestAudioUpload).mockRejectedValue(new ApiError(413, 'too large'));
    const { recorderProps } = await renderRecorder();
    await recordAndStop();
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
    expect(recorderProps.onError).toHaveBeenCalled();
    expect(clearPendingAssessment).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
  });

  it('component timeout sentinels: operation/phase/current failures settle without real time', async () => {
    jest.useFakeTimers();
    const permission = deferred<{ granted: boolean }>();
    asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
    const { view } = await renderRecorder();
    const start = committedPress(START_LABEL);
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(() => {
      first = Promise.resolve(start()).then(() => undefined);
      second = Promise.resolve(start()).then(() => undefined);
    });
    const reads = asMock(AudioModule.getRecordingPermissionsAsync).mock.calls.length;
    await act(async () => {
      permission.resolve({ granted: true });
      await Promise.allSettled([first, second]);
      jest.runOnlyPendingTimers();
      await flushMicrotasks();
    });
    expect(reads).toBe(1);
    expect(recorder.record).toHaveBeenCalledTimes(1);
    await view.unmount();
  });

  it('audio/stop timeout sentinels: three takes release every single-flight owner', async () => {
    await renderRecorder();
    await recordAndStop();

    for (let expectedTake = 2; expectedTake <= 3; expectedTake += 1) {
      let start!: Promise<void>;
      await act(() => {
        start = Promise.resolve(committedPress(START_LABEL)()).then(() => undefined);
      });
      await flushMicrotasks();
      expect(recorder.record).toHaveBeenCalledTimes(expectedTake);
      await start;
      recorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
    }

    expect(recorder.stop).toHaveBeenCalledTimes(3);
    expect(
      asMock(setAudioModeAsync).mock.calls.filter(([options]) => options.allowsRecording === false),
    ).toHaveLength(3);
  });

  it('recovery timeout sentinels: completed mount recovery commits in bounded microtasks', async () => {
    let loadObserved = false;
    let secondLoadObserved = false;
    let fetchObserved = false;
    let deliveredResult: unknown;
    const secondLoad = deferred<PendingAssessment | null>();
    asMock(loadPendingAssessment)
      .mockImplementationOnce(async () => {
        loadObserved = true;
        return pendingRecord();
      })
      .mockImplementation(() => {
        secondLoadObserved = true;
        return secondLoad.promise;
      });
    asMock(apiFetch).mockImplementation(async () => {
      fetchObserved = true;
      return {
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 96 },
      };
    });
    const onResult = jest.fn((result: unknown) => {
      deliveredResult = result;
    });
    const recorderProps = props({ onResult });
    let view: Awaited<ReturnType<typeof render>> | undefined;
    let outcome:
      | {
          loadObserved: boolean;
          secondLoadObserved: boolean;
          fetchObserved: boolean;
          loadCalls: number;
          fetchCalls: number;
          resultCalls: number;
          deliveredResult: unknown;
        }
      | undefined;
    try {
      view = await render(<Recorder {...recorderProps} />);
      await act(async () => flushMicrotasks(20));
      outcome = {
        loadObserved,
        secondLoadObserved,
        fetchObserved,
        loadCalls: asMock(loadPendingAssessment).mock.calls.length,
        fetchCalls: asMock(apiFetch).mock.calls.length,
        resultCalls: onResult.mock.calls.length,
        deliveredResult,
      };
    } finally {
      await view?.unmount();
      secondLoad.resolve(null);
      await act(async () => flushMicrotasks(20));
    }

    expect(outcome).toEqual({
      loadObserved: true,
      secondLoadObserved: false,
      fetchObserved: true,
      loadCalls: 1,
      fetchCalls: 1,
      resultCalls: 1,
      deliveredResult: { parsed: { score: 96 } },
    });
  });

  it('recovery cleanup sentinels: background aborts the live lease synchronously', async () => {
    asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
    asMock(apiFetch).mockImplementationOnce(
      (_path: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    await renderRecorder();
    const signal = asMock(apiFetch).mock.calls[0][1].signal as AbortSignal;

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      writable: true,
      value: 'background',
    });
    await act(async () => {
      for (const handler of appStateHandlers) handler('background');
      await flushMicrotasks();
    });

    expect(signal.aborted).toBe(true);
  });

  it('completion/lifecycle slow sentinels: native missing event waits exactly 500ms', async () => {
    jest.useFakeTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    recorder.stop.mockImplementation(async () => {
      recorder.isRecording = false;
      recorder.uri = null;
    });
    await renderRecorder();
    await startRecording();
    recorderState.durationMillis = 5_000;
    let settled = false;
    let stop!: Promise<void>;
    await act(() => {
      stop = Promise.resolve(committedPress(STOP_LABEL)()).then(() => {
        settled = true;
      });
    });
    await flushMicrotasks();
    expect(settled).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(500);
      await stop;
    });
    expect(settled).toBe(true);
  });
});
