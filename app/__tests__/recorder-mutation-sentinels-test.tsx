import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native/pure';
import {
  AudioModule,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingStatus,
} from 'expo-audio';
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
let containedLifecycleErrors: unknown[] = [];
let containedLifecycleFailure: unknown = null;
const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');
const clearNativeTimeout = globalThis.clearTimeout.bind(globalThis);
const clearNativeInterval = globalThis.clearInterval.bind(globalThis);
let realTimeoutSpy: jest.SpyInstance;
let realIntervalSpy: jest.SpyInstance;

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

async function flushRealEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await flushMicrotasks();
}

function beginContainedLifecycleTeardown(): Promise<void> {
  for (const registration of mockSentinelFocusRegistrations) {
    registration.cleanup = undefined;
  }

  // stopForLifecycle is intentionally fire-and-forget at the AppState boundary.
  // Capture the promise created by its `.finally()` in this synchronous turn so
  // destructive mutants reject into the assertion instead of becoming an
  // unhandled rejection after Jest has disposed the environment.
  const originalFinally = Promise.prototype.finally;
  const lifecyclePromises: Promise<unknown>[] = [];
  // eslint-disable-next-line no-extend-native -- restored synchronously in finally below
  Object.defineProperty(Promise.prototype, 'finally', {
    configurable: true,
    writable: true,
    value(this: Promise<unknown>, onfinally?: (() => void) | null) {
      const result = originalFinally.call(this, onfinally);
      lifecyclePromises.push(result);
      return result;
    },
  });
  const actEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  try {
    for (const handler of [...appStateHandlers]) handler('background');
  } finally {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    // eslint-disable-next-line no-extend-native -- restore the captured native method
    Object.defineProperty(Promise.prototype, 'finally', {
      configurable: true,
      writable: true,
      value: originalFinally,
    });
  }

  const observations = lifecyclePromises.map((promise) =>
    promise.then(
      () => undefined,
      (error: unknown) => {
        containedLifecycleErrors.push(error);
        containedLifecycleFailure ??= error;
      },
    ),
  );
  return Promise.all(observations).then(() => undefined);
}

async function unmountWithContainedLifecycle(view: {
  unmount: () => Promise<void>;
}): Promise<void> {
  const lifecycleCompletion = beginContainedLifecycleTeardown();
  let unmountError: unknown;
  try {
    await view.unmount();
  } catch (error) {
    unmountError = error;
  }
  await lifecycleCompletion;
  await flushMicrotasks();
  if (unmountError) throw unmountError;
}

async function unmountWithoutLifecyclePrearm(view: {
  unmount: () => Promise<void>;
}): Promise<void> {
  const originalFinally = Promise.prototype.finally;
  const lifecyclePromises: Promise<unknown>[] = [];
  // eslint-disable-next-line no-extend-native -- restored before the first await
  Object.defineProperty(Promise.prototype, 'finally', {
    configurable: true,
    writable: true,
    value(this: Promise<unknown>, onfinally?: (() => void) | null) {
      const result = originalFinally.call(this, onfinally);
      lifecyclePromises.push(result);
      return result;
    },
  });
  let unmountPromise: Promise<void>;
  try {
    unmountPromise = view.unmount();
  } finally {
    // eslint-disable-next-line no-extend-native -- restore the captured native method
    Object.defineProperty(Promise.prototype, 'finally', {
      configurable: true,
      writable: true,
      value: originalFinally,
    });
  }
  const observations = lifecyclePromises.map((promise) =>
    promise.then(
      () => undefined,
      (error: unknown) => {
        containedLifecycleErrors.push(error);
        containedLifecycleFailure ??= error;
      },
    ),
  );
  let unmountError: unknown;
  try {
    await unmountPromise;
  } catch (error) {
    unmountError = error;
  }
  await Promise.all(observations);
  await flushRealEventLoop();
  if (unmountError) throw unmountError;
}

async function cleanupMountedRecorders(): Promise<void> {
  for (const settle of [...pendingCleanup]) settle();
  jest.useRealTimers();
  const lifecycleCompletion = beginContainedLifecycleTeardown();
  let cleanupError: unknown;
  try {
    await cleanup();
  } catch (error) {
    cleanupError = error;
  }
  await lifecycleCompletion;
  await flushMicrotasks();
  await flushRealEventLoop();
  await flushRealEventLoop();
  if (cleanupError) throw cleanupError;
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

type SentinelRecorderProps = Extract<
  React.ComponentProps<typeof Recorder>,
  { onResult: (data: unknown) => void }
>;

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
  expect(view.getByRole('button', { name: START_LABEL })).toBeTruthy();
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

function createReplacementRecorder(uri: string | null = null): MockRecorder {
  const replacement: MockRecorder = {
    getStatus: jest.fn(() => liveState),
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(() => {
      replacement.isRecording = true;
    }),
    stop: jest.fn(async () => {
      replacement.isRecording = false;
    }),
    uri,
    isRecording: false,
  };
  return replacement;
}

beforeEach(() => {
  // A destructive timer-cleanup mutant must not leave native handles alive for
  // a later Jest environment. Re-establish real timers before capturing every
  // handle this test creates; fake-timer cases may replace the globals later.
  jest.useRealTimers();
  jest.clearAllMocks();
  realTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
  realIntervalSpy = jest.spyOn(globalThis, 'setInterval');
  containedLifecycleErrors = [];
  // Once a destructive teardown mutant has violated the dedicated contract,
  // do not let its half-invalidated module globals poison later sentinel cases
  // and turn one deterministic kill into a file-level timeout.
  if (containedLifecycleFailure) throw containedLifecycleFailure;
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
  asMock(createAudioPlayer).mockReset();
  asMock(createAudioPlayer).mockImplementation(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  }));
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
  asMock(apiRequestAudioUpload).mockResolvedValue({
    mode: 'direct',
    assessmentEndpoint: '/practice/attempt',
  });
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
    const appStateHandler = handler as (state: AppStateStatus) => void;
    appStateHandlers.push(appStateHandler);
    return {
      remove: jest.fn(() => {
        appStateHandlers = appStateHandlers.filter((entry) => entry !== appStateHandler);
      }),
    };
  });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
});

afterEach(async () => {
  let cleanupError: unknown;
  try {
    try {
      await cleanupMountedRecorders();
    } catch (error) {
      cleanupError = error;
    }
    // React schedules passive unmount work with setImmediate. Keep Jest's
    // rejection observer alive until that work and its promise continuations
    // have completed, so a destructive mutant is a test failure rather than a
    // worker crash after environment teardown.
    await flushRealEventLoop();
    await flushRealEventLoop();
  } finally {
    pendingCleanup.clear();
    if (originalPlatform) Object.defineProperty(Platform, 'OS', originalPlatform);
    for (const result of realTimeoutSpy.mock.results) {
      if (result.type === 'return')
        clearNativeTimeout(result.value as ReturnType<typeof setTimeout>);
    }
    for (const result of realIntervalSpy.mock.results) {
      if (result.type === 'return') {
        clearNativeInterval(result.value as ReturnType<typeof setInterval>);
      }
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  }
  expect([cleanupError, ...containedLifecycleErrors].filter(Boolean)).toEqual([]);
});

// The campaign executes this component harness as its own Stryker pass, so a
// decisive sentinel result is final before the integration pass begins.
describe('Recorder mutation sentinels', () => {
  it('ID 1063: null recovery-controller teardown is inert and fully drained', async () => {
    await renderRecorder();
    let teardownError: unknown;
    try {
      await cleanupMountedRecorders();
    } catch (error) {
      teardownError = error;
    }
    expect([teardownError, ...containedLifecycleErrors].filter(Boolean)).toEqual([]);
  });

  it('ID 891: a captured post-unmount Start reaches no lock callback', async () => {
    const onInteractionLockChange = jest.fn();
    const { view } = await renderRecorder({ onInteractionLockChange });
    const staleStart = committedPress(START_LABEL);
    onInteractionLockChange.mockClear();
    // Unlike general mutant-safe teardown, this must not pre-arm an AppState
    // stop while mounted: doing so leaves lockedRef=true and masks ID 891.
    await unmountWithoutLifecyclePrearm(view);
    await act(async () => flushMicrotasks());
    expect(onInteractionLockChange).not.toHaveBeenCalledWith(true);
    await act(async () => {
      await Promise.resolve(staleStart());
      await flushMicrotasks();
    });
    expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(onInteractionLockChange).not.toHaveBeenCalledWith(true);
  });

  it('ID 1220: the preliminary recovery read never publishes an interaction lock', async () => {
    const pending = deferred<PendingAssessment | null>();
    asMock(loadPendingAssessment).mockReturnValue(pending.promise);
    const onInteractionLockChange = jest.fn();

    await renderRecorder({ onInteractionLockChange });
    await act(async () => flushMicrotasks());

    expect(onInteractionLockChange).not.toHaveBeenCalledWith(true);
    await act(async () => {
      pending.resolve(null);
      await flushMicrotasks();
    });
    expect(onInteractionLockChange.mock.calls).toEqual([[false]]);
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

  it('IDs 1317/1321: endpoint callback re-entry preserves a replacement recovery owner', async () => {
    mockSentinelFocused = false;
    const replacementRequestId = OTHER_QUESTION_ID;
    const status = deferred<unknown>();
    let loadCall = 0;
    asMock(loadPendingAssessment).mockImplementation(() => {
      loadCall += 1;
      const record = pendingRecord(
        loadCall === 1
          ? { endpoint: '/practice/attempt/native' }
          : { requestId: replacementRequestId },
      );
      // The replacement is deliberately returned as a raw value while the
      // callback below compresses resolved awaits into the same re-entrant turn.
      return loadCall === 1 ? Promise.resolve(record) : (record as never);
    });
    asMock(apiFetch).mockReturnValue(status.promise);
    let replacementFocus: FocusRegistration | undefined;
    const onRecoveryEndpointMismatch = jest.fn(() => {
      if (!replacementFocus) throw new Error('Replacement focus registration missing');
      const originalResolve = Promise.resolve;
      Object.defineProperty(Promise, 'resolve', {
        configurable: true,
        writable: true,
        value(value: unknown) {
          if (value instanceof Promise) return originalResolve.call(Promise, value);
          return {
            then(
              onFulfilled: (resolved: unknown) => unknown,
              onRejected?: (error: unknown) => unknown,
            ) {
              try {
                return originalResolve.call(Promise, onFulfilled(value));
              } catch (error) {
                return onRejected
                  ? originalResolve.call(Promise, onRejected(error))
                  : Promise.reject(error);
              }
            },
          } as Promise<unknown>;
        },
      });
      try {
        replacementFocus.cleanup = replacementFocus.callback();
      } finally {
        Object.defineProperty(Promise, 'resolve', {
          configurable: true,
          writable: true,
          value: originalResolve,
        });
      }
      return false;
    });
    await render(
      <>
        <Recorder key="stale" {...props({ onRecoveryEndpointMismatch })} />
        <Recorder key="replacement" {...props()} />
      </>,
    );
    await act(async () => flushMicrotasks());
    const staleFocus = mockSentinelFocusRegistrations[0];
    replacementFocus = mockSentinelFocusRegistrations[1];
    if (!staleFocus || !replacementFocus) throw new Error('Focus registrations missing');

    staleFocus.cleanup = staleFocus.callback();
    await act(async () => flushMicrotasks(100));

    expect(onRecoveryEndpointMismatch).toHaveBeenCalledWith('/practice/attempt/native');
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(asMock(apiFetch).mock.calls[0][0]).toContain(replacementRequestId);
    await act(async () => {
      status.resolve({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 91 },
      });
      await flushMicrotasks(100);
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

  it('ID 2268: optimistic reset is not proof that a new take was observed', async () => {
    jest.useFakeTimers();
    // Return immutable snapshots for this state-transition contract. The
    // default live Proxy deliberately avoids rerenders when old/new reads alias,
    // which would prevent the fallback adoption effect from observing either
    // side of the canRecord transition.
    recorder.getStatus.mockImplementation(() => ({ ...recorderState }));
    const leftoverUri = 'file:///recordings/unobserved-new-take.m4a';
    recorder.prepareToRecordAsync.mockImplementationOnce(async () => {
      recorder.uri = leftoverUri;
    });
    recorder.record.mockImplementationOnce(() => {
      recorder.isRecording = true;
      recorder.uri = leftoverUri;
      // The native object starts, but this SDK variant never publishes the
      // intermediate recording status. Adoption must require a real observed
      // status rather than the optimistic reset immediately before record().
      recorderState = { ...recorderState, canRecord: true, isRecording: false };
    });
    await renderRecorder();
    await startRecording();
    recorder.isRecording = false;
    recorderState = {
      ...recorderState,
      canRecord: false,
      isRecording: false,
      durationMillis: 5_000,
      url: null,
    };

    await act(async () => {
      jest.advanceTimersByTime(400);
      await flushMicrotasks();
    });

    expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
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

  it('ID 2238: a failed stale clear reports nothing into the replacement identity', async () => {
    const clear = deferred<void>();
    asMock(clearPendingAssessment).mockReturnValue(clear.promise);
    const onError = jest.fn();
    const { view, recorderProps } = await renderRecorder({ onError });
    await recordAndStop();
    await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
    await act(async () => flushMicrotasks());
    onError.mockClear();
    recorder.prepareToRecordAsync.mockClear();

    let staleStart!: Promise<void>;
    await act(() => {
      staleStart = Promise.resolve(committedPress(START_LABEL)()).then(() => undefined);
    });
    await view.rerender(<Recorder {...recorderProps} questionId={OTHER_QUESTION_ID} />);
    await act(async () => {
      clear.reject(new Error('stale clear failed'));
      await staleStart;
    });

    expect(onError).not.toHaveBeenCalled();
    expect(recorder.prepareToRecordAsync).not.toHaveBeenCalled();
  });

  it('IDs 2187/2188/2206: a prompt response belongs only to its current identity', async () => {
    const prompt = deferred<{ granted: boolean; canAskAgain: boolean }>();
    asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });
    asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(prompt.promise);
    const { view, recorderProps } = await renderRecorder();
    let staleStart!: Promise<void>;
    await act(() => {
      staleStart = Promise.resolve(committedPress(START_LABEL)()).then(() => undefined);
    });
    await flushMicrotasks();
    expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);

    await view.rerender(<Recorder {...recorderProps} questionId={OTHER_QUESTION_ID} />);
    await act(async () => {
      prompt.resolve({ granted: false, canAskAgain: false });
      await staleStart;
      await flushMicrotasks();
    });

    expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();
    expect(recorder.record).not.toHaveBeenCalled();
  });

  it('IDs 2311/2337: a preparation failure deletes its URI and cannot fabricate review', async () => {
    const failedUri = 'file:///recordings/pre-prepare-failure.m4a';
    recorder.prepareToRecordAsync.mockImplementationOnce(async () => {
      recorder.uri = failedUri;
      throw new Error('prepare failed');
    });
    const { recorderProps } = await renderRecorder();

    await fireEvent.press(screen.getByLabelText(START_LABEL));

    expect(recorderProps.onError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
    expect(asMock(File).mock.calls.some(([uri]) => uri === failedUri)).toBe(true);
    expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
    expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
  });

  it('ID 2258: recorder replacement has one notifying lifecycle restore owner', async () => {
    const setup = deferred<void>();
    asMock(setAudioModeAsync).mockImplementation(
      ({ allowsRecording }: { allowsRecording: boolean }) =>
        allowsRecording ? setup.promise : Promise.reject(new Error('restore failed')),
    );
    let activeRecorder = recorder;
    asMock(useAudioRecorder).mockImplementation(
      (_options: unknown, listener?: (status: RecordingStatus) => void) => {
        statusListener = listener;
        return activeRecorder;
      },
    );
    const onError = jest.fn();
    const { view, recorderProps } = await renderRecorder({ onError });
    let staleStart!: Promise<void>;
    await act(() => {
      staleStart = Promise.resolve(committedPress(START_LABEL)()).then(() => undefined);
    });
    await flushMicrotasks();
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ allowsRecording: true }),
    );

    for (const registration of mockSentinelFocusRegistrations) registration.cleanup = undefined;
    activeRecorder = createReplacementRecorder();
    await view.rerender(<Recorder {...recorderProps} />);
    await act(async () => {
      setup.resolve();
      await staleStart;
      await flushMicrotasks();
    });

    expect(
      onError.mock.calls.filter(([message]) => message === t('recorder.errAudioReset')),
    ).toHaveLength(1);
  });

  it('ID 2266: prepared recorder replacement shares the lifecycle restore owner', async () => {
    const prepare = deferred<void>();
    recorder.prepareToRecordAsync.mockReturnValue(prepare.promise);
    recorder.stop.mockResolvedValue(undefined);
    asMock(setAudioModeAsync).mockImplementation(
      ({ allowsRecording }: { allowsRecording: boolean }) =>
        allowsRecording ? Promise.resolve() : Promise.reject(new Error('restore failed')),
    );
    let activeRecorder = recorder;
    asMock(useAudioRecorder).mockImplementation(
      (_options: unknown, listener?: (status: RecordingStatus) => void) => {
        statusListener = listener;
        return activeRecorder;
      },
    );
    const onError = jest.fn();
    const { view, recorderProps } = await renderRecorder({ onError });
    let staleStart!: Promise<void>;
    await act(() => {
      staleStart = Promise.resolve(committedPress(START_LABEL)()).then(() => undefined);
    });
    await flushMicrotasks();
    expect(recorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);

    recorder.uri = 'file:///recordings/stale-prepared.m4a';
    for (const registration of mockSentinelFocusRegistrations) registration.cleanup = undefined;
    activeRecorder = createReplacementRecorder();
    await view.rerender(<Recorder {...recorderProps} />);
    await act(async () => {
      prepare.resolve();
      await staleStart;
      await flushMicrotasks();
    });

    expect(
      onError.mock.calls.filter(([message]) => message === t('recorder.errAudioReset')),
    ).toHaveLength(1);
  });

  it('ID 2340: an old recorder Stop cannot commit after recorder replacement', async () => {
    let activeRecorder = recorder;
    asMock(useAudioRecorder).mockImplementation(
      (_options: unknown, listener?: (status: RecordingStatus) => void) => {
        statusListener = listener;
        return activeRecorder;
      },
    );
    const { view, recorderProps } = await renderRecorder();
    await startRecording();
    recorderState.durationMillis = 5_000;
    const nativeStop = deferred<void>();
    recorder.stop.mockImplementation(() => nativeStop.promise);
    let staleStop!: Promise<void>;
    await act(() => {
      staleStop = Promise.resolve(committedPress(STOP_LABEL)()).then(() => undefined);
    });
    await flushMicrotasks();

    const staleUri = 'file:///recordings/stale-stop.m4a';
    recorder.uri = staleUri;
    for (const registration of mockSentinelFocusRegistrations) registration.cleanup = undefined;
    activeRecorder = createReplacementRecorder();
    await view.rerender(<Recorder {...recorderProps} />);
    await act(async () => {
      nativeStop.resolve();
      await staleStop;
      await flushMicrotasks();
    });

    expect(deletedFileUris()).toContain(staleUri);
    expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
  });

  it('IDs 2451/2453/2454: delayed cancel cannot authorize a stale submission', async () => {
    const response = deferred<unknown>();
    const cancelMark = deferred<boolean>();
    asMock(markPendingAssessmentCancelled).mockReturnValue(cancelMark.promise);
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
    const onError = jest.fn();
    const { view, recorderProps } = await renderRecorder({ onError });
    await recordAndStop();
    let staleSubmit!: Promise<void>;
    await act(() => {
      staleSubmit = Promise.resolve(
        committedNodePress(screen.getByRole('button', { name: SUBMIT_TEXT }))(),
      ).then(() => undefined);
    });
    await flushMicrotasks();
    expect(apiUploadAudio).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: t('common.cancel') }));
    await view.rerender(<Recorder {...recorderProps} questionId={OTHER_QUESTION_ID} />);
    onError.mockClear();
    await act(async () => {
      response.resolve({ ok: true });
      await flushMicrotasks();
      cancelMark.resolve(true);
      await staleSubmit;
      await flushMicrotasks(100);
    });

    expect(recorderProps.onResult).not.toHaveBeenCalled();
    expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('ID 2567: an inactive dip after response blocks parsing the stale submission', async () => {
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
    const { recorderProps } = await renderRecorder();
    await recordAndStop();
    let staleSubmit!: Promise<void>;
    await act(() => {
      staleSubmit = Promise.resolve(
        committedNodePress(screen.getByRole('button', { name: SUBMIT_TEXT }))(),
      ).then(() => undefined);
    });
    await flushMicrotasks();
    expect(apiUploadAudio).toHaveBeenCalledTimes(1);

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      writable: true,
      value: 'inactive',
    });
    await act(async () => {
      response.resolve({ score: 97 });
      await staleSubmit;
      await flushMicrotasks();
    });

    expect(recorderProps.parseResult).not.toHaveBeenCalled();
    expect(recorderProps.onResult).not.toHaveBeenCalled();
    expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
  });

  it('ID 2663: an inactive dip during clear suppresses stale rejection output', async () => {
    const clear = deferred<void>();
    asMock(clearPendingAssessment).mockReturnValue(clear.promise);
    asMock(apiUploadAudio).mockImplementation(
      async (
        _endpoint: string,
        _uri: string,
        _fields: unknown,
        options?: { onRequestStarted?: () => void },
      ) => {
        options?.onRequestStarted?.();
        throw new ApiError(413, 'too large');
      },
    );
    const onError = jest.fn();
    await renderRecorder({ onError });
    await recordAndStop();
    let staleSubmit!: Promise<void>;
    await act(() => {
      staleSubmit = Promise.resolve(
        committedNodePress(screen.getByRole('button', { name: SUBMIT_TEXT }))(),
      ).then(() => undefined);
    });
    await flushMicrotasks();
    expect(clearPendingAssessment).toHaveBeenCalledTimes(1);
    onError.mockClear();

    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      writable: true,
      value: 'inactive',
    });
    await act(async () => {
      clear.resolve();
      await staleSubmit;
      await flushMicrotasks();
    });

    expect(onError).not.toHaveBeenCalled();
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
    await unmountWithContainedLifecycle(view);
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
      if (view) await unmountWithContainedLifecycle(view);
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

  it('ID 1963: unmount clears every remaining-time announcement', async () => {
    jest.useFakeTimers();
    const announce = asMock(AccessibilityInfo.announceForAccessibility);
    const { view } = await renderRecorder();
    await startRecording();
    await unmountWithContainedLifecycle(view);
    announce.mockClear();

    await act(async () => {
      jest.advanceTimersByTime(110_000);
      await flushMicrotasks();
    });

    expect(announce).not.toHaveBeenCalledWith(t('recorder.oneMinuteLeft'));
    expect(announce).not.toHaveBeenCalledWith(t('recorder.thirtySecondsLeft'));
    expect(announce).not.toHaveBeenCalledWith(t('recorder.tenSecondsLeft'));
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

  it('IDs 2834/2835/2836: a re-entrant stale rewind cannot clear a replacement player', async () => {
    type PreviewStatus = { didJustFinish?: boolean; error?: unknown };
    let oldStatusListener: ((status: PreviewStatus) => void) | undefined;
    const oldPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn<Promise<void>, [number]>(),
      addListener: jest.fn((_event: string, listener: (status: PreviewStatus) => void) => {
        oldStatusListener = listener;
        return { remove: jest.fn() };
      }),
    };
    const replacementPlayer = {
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(async () => undefined),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    };
    asMock(createAudioPlayer).mockReturnValueOnce(oldPlayer).mockReturnValue(replacementPlayer);
    let stalePlay!: () => unknown;
    const onError = jest.fn(() => {
      void Promise.resolve(stalePlay());
    });
    await renderRecorder({ onError });
    await recordAndStop();
    stalePlay = committedPress(t('recorder.playLabel'));
    await act(async () => {
      await Promise.resolve(stalePlay());
      await flushMicrotasks();
    });
    expect(oldStatusListener).toEqual(expect.any(Function));

    oldPlayer.seekTo.mockImplementation(() => {
      oldStatusListener!({ error: new Error('old player failed re-entrantly') });
      return Promise.resolve();
    });
    await act(async () => {
      oldStatusListener!({ didJustFinish: true });
      await flushMicrotasks(100);
    });

    expect(replacementPlayer.play).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(t('recorder.pauseLabel'))).toBeTruthy();
  });
});
