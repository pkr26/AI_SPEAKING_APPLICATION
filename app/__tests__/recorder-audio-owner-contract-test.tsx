import { act } from '@testing-library/react-native';
import { AudioModule, setAudioModeAsync, useAudioRecorder, type RecordingStatus } from 'expo-audio';
import * as Crypto from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import React from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { createRoot, type Root as TestRendererRoot } from 'test-renderer';

import Recorder from '../src/components/Recorder';
import {
  AUDIO_MODE_OPERATION_TIMEOUT_MS,
  configurePlaybackAudioMode,
} from '../src/lib/audio-session';
import {
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  resolveAudioFileDescriptor,
} from '../src/lib/api';
import { translateFor } from '../src/lib/i18n';
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

let mockAudioOwnerFocusRegistrations: FocusRegistration[] = [];

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const registration: FocusRegistration = { callback };
        mockAudioOwnerFocusRegistrations.push(registration);
        registration.cleanup = callback();
        return () => {
          if (typeof registration.cleanup === 'function') registration.cleanup();
          mockAudioOwnerFocusRegistrations = mockAudioOwnerFocusRegistrations.filter(
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
const ENDPOINT = '/practice/attempt' as const;
const START_LABEL = 'Start recording';
const STOP_LABEL = 'Stop recording';
const SAVE_RECORDING_LABEL = 'Save this recording';
const START_FAILED_ERROR = translateFor('en', 'recorder.errStartFailed');
const RESET_ERROR = translateFor('en', 'recorder.errAudioReset');
const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');

const asMock = (value: unknown) => value as jest.Mock;

interface IsolatedRecorder {
  getStatus: jest.Mock;
  prepareToRecordAsync: jest.Mock;
  record: jest.Mock;
  stop: jest.Mock;
  uri: string | null;
  isRecording: boolean;
}

interface IsolatedRecorderState {
  canRecord: boolean;
  isRecording: boolean;
  durationMillis: number;
  url: string | null;
  mediaServicesDidReset: boolean;
}

function deferred<T>() {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (reason: unknown) => void;
  let settled = false;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve(value: T) {
      if (settled) return;
      settled = true;
      resolvePromise(value);
    },
    reject(reason: unknown) {
      if (settled) return;
      settled = true;
      rejectPromise(reason);
    },
  };
}

async function flushMicrotasks(turns = 20): Promise<void> {
  if (turns <= 0) return;
  await Promise.resolve();
  await flushMicrotasks(turns - 1);
}

function rawPressHandlers(renderer: TestRendererRoot, label: string): (() => unknown)[] {
  return renderer.container
    .queryAll(
      (node) =>
        node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label,
    )
    .map((node) => {
      type PressFiber = { memoizedProps?: { onPress?: unknown }; return: PressFiber | null };
      let fiber = node.unstable_fiber as PressFiber | null;
      while (fiber && typeof fiber.memoizedProps?.onPress !== 'function') fiber = fiber.return;
      // Assert instead of throwing raw: a missing handler is the observable
      // behavior under a wiring mutant and must fail as a kill, never an error.
      expect(fiber?.memoizedProps?.onPress).toBeInstanceOf(Function);
      return fiber?.memoizedProps?.onPress as () => unknown;
    });
}

/** Disabled flags of every committed record-button instance, in tree order. */
function startButtonsDisabled(renderer: TestRendererRoot): boolean[] {
  return renderer.container
    .queryAll(
      (node) =>
        node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === START_LABEL,
    )
    .map((node) => node.props.accessibilityState?.disabled === true);
}

/** Count of committed nodes carrying an exact accessibility label. */
function nodesWithAccessibilityLabel(renderer: TestRendererRoot, label: string): number {
  return renderer.container.queryAll((node) => node.props.accessibilityLabel === label).length;
}

function playbackModeRestoreCalls(): number {
  return asMock(setAudioModeAsync).mock.calls.filter(
    ([options]) => (options as { allowsRecording?: boolean }).allowsRecording === false,
  ).length;
}

function installIsolatedRecorders(count: number): IsolatedRecorder[] {
  const states: IsolatedRecorderState[] = Array.from({ length: count }, () => ({
    canRecord: true,
    isRecording: false,
    durationMillis: 5_000,
    url: null,
    mediaServicesDidReset: false,
  }));
  const listeners: (((status: RecordingStatus) => void) | undefined)[] = [];
  const recorders = states.map((_, index): IsolatedRecorder => {
    const isolatedRecorder: IsolatedRecorder = {
      getStatus: jest.fn(() => states[index]),
      prepareToRecordAsync: jest.fn(async () => undefined),
      record: jest.fn(() => {
        isolatedRecorder.isRecording = true;
        states[index] = { ...states[index], canRecord: true, isRecording: true };
      }),
      stop: jest.fn(async () => {
        isolatedRecorder.isRecording = false;
        isolatedRecorder.uri = `file:///recordings/audio-owner-${index}.m4a`;
        states[index] = { ...states[index], canRecord: false, isRecording: false };
        listeners[index]?.({
          id: `audio-owner-${index}`,
          isFinished: true,
          hasError: false,
          error: null,
          url: isolatedRecorder.uri,
        });
      }),
      uri: null,
      isRecording: false,
    };
    return isolatedRecorder;
  });
  let nextRecorderIndex = 0;
  asMock(useAudioRecorder).mockImplementation(function useIsolatedAudioRecorder(
    _options: unknown,
    listener?: (status: RecordingStatus) => void,
  ) {
    const recorderIndexRef = React.useRef<number | null>(null);
    if (recorderIndexRef.current === null) {
      recorderIndexRef.current = nextRecorderIndex;
      nextRecorderIndex += 1;
    }
    const recorderIndex = recorderIndexRef.current;
    const isolatedRecorder = recorders[recorderIndex];
    if (!isolatedRecorder) throw new Error('Unexpected Recorder remount in audio-owner contract');
    listeners[recorderIndex] = listener;
    return isolatedRecorder;
  });
  return recorders;
}

function recorderProps(onError: jest.Mock) {
  return {
    ownerId: OWNER_ID,
    questionId: QUESTION_ID,
    endpoint: ENDPOINT,
    parseResult: (value: unknown) => ({ parsed: value }),
    onResult: jest.fn(),
    onError,
    onRecoveryUnresolved: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockAudioOwnerFocusRegistrations = [];
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
  asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: true });
  asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: true });
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
  asMock(apiUploadAudio).mockResolvedValue({ ok: true });
  asMock(apiFetch).mockResolvedValue({ ok: true });
  asMock(apiPostPresignedAudio).mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
});

afterEach(() => {
  jest.useRealTimers();
  if (originalPlatform) Object.defineProperty(Platform, 'OS', originalPlatform);
  jest.restoreAllMocks();
});

// This file is one isolated Stryker pass. Its intentionally destructive mutant
// outcomes therefore cannot leak into or be overwritten by a later test file.
describe('Recorder audio-owner mutation contract', () => {
  it('serializes acquisition, restore, notification, and waiter handoff in one lifecycle', async () => {
    let trackUnmountedAppStateReads = false;
    let unmountedAppStateReads = 0;
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => {
        if (trackUnmountedAppStateReads) unmountedAppStateReads += 1;
        return 'active';
      },
    });
    const permissions = deferred<{ granted: boolean }>();
    asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permissions.promise);
    const failingRestore = deferred<void>();
    const overlappingRestore = deferred<void>();
    let restoreModeCalls = 0;
    asMock(setAudioModeAsync).mockImplementation(
      ({ allowsRecording }: { allowsRecording: boolean }) => {
        if (allowsRecording) return Promise.resolve();
        restoreModeCalls += 1;
        // restoreAudioMode retries one failed native reset. Any later reset
        // belongs to the contender Stop/unmount overlap.
        return restoreModeCalls <= 2 ? failingRestore.promise : overlappingRestore.promise;
      },
    );
    const recorders = installIsolatedRecorders(2);
    const ownerOnError = jest.fn();
    const renderer = createRoot({
      textComponentTypes: ['Text'],
      publicTextComponentTypes: ['Text'],
    });
    const tree = (
      <>
        <Recorder key="owner" {...recorderProps(ownerOnError)} />
        <Recorder key="contender" {...recorderProps(jest.fn())} />
      </>
    );
    await act(() => {
      renderer.render(tree);
    });

    const actEnvironment = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    let unmounted = false;
    let lateStartSettled = false;
    let ownerStart: Promise<unknown> | null = null;
    let racerStart: Promise<unknown> | null = null;
    let lateStart: Promise<unknown> | null = null;
    let outcome:
      | {
          ownerRecords: number;
          racerRecords: number;
          lateRecordDelta: number;
          failedRestoreCalls: number;
          overlapRestoreCalls: number;
          resetErrorReported: boolean;
          lateStartSettled: boolean;
        }
      | undefined;
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      const starts = rawPressHandlers(renderer, START_LABEL);
      expect(starts).toHaveLength(2);
      expect(starts[0]).toEqual(expect.any(Function));
      expect(starts[1]).toEqual(expect.any(Function));
      const ownerPress = starts[0]!;
      const racerPress = starts[1]!;
      ownerStart = Promise.resolve(ownerPress());
      racerStart = Promise.resolve(racerPress());
      await flushMicrotasks(30);
      permissions.resolve({ granted: true });
      await flushMicrotasks(100);

      const racerRecordsAfterSimultaneousStart = recorders[1].record.mock.calls.length;
      if (recorders[0].record.mock.calls.length === 1 && racerRecordsAfterSimultaneousStart === 0) {
        // The same contender retries only after the owner is fully recording,
        // so it must await the owner's captured release promise this time.
        lateStart = Promise.resolve(racerPress()).finally(() => {
          lateStartSettled = true;
        });
        await flushMicrotasks(30);
      }

      if (recorders[0].record.mock.calls.length > 0) {
        const ownerFocus = mockAudioOwnerFocusRegistrations[0];
        if (!ownerFocus || typeof ownerFocus.cleanup !== 'function') {
          throw new Error('Owner focus cleanup was not registered');
        }
        // Lifecycle stop uses the default notifying restore. Immediately focus
        // again so its eventual failure remains user-visible.
        ownerFocus.cleanup();
        ownerFocus.cleanup = ownerFocus.callback();
        await flushMicrotasks(50);
      }

      if (restoreModeCalls > 0) failingRestore.reject(new Error('restore failed'));
      else failingRestore.resolve();
      await flushMicrotasks(200);
      const failedRestoreCalls = restoreModeCalls;
      const lateRecordDelta =
        recorders[1].record.mock.calls.length - racerRecordsAfterSimultaneousStart;

      if (lateRecordDelta === 1) {
        // The web auto-stop calls the layout-refreshed stopRecording ref even
        // though this raw root intentionally never enters another React act.
        jest.advanceTimersByTime(120_000);
        await flushMicrotasks(50);
        const contenderFocus = mockAudioOwnerFocusRegistrations[1];
        if (!contenderFocus || typeof contenderFocus.cleanup !== 'function') {
          throw new Error('Contender focus cleanup was not registered');
        }
        contenderFocus.cleanup();
        await flushMicrotasks(40);
      }

      // Unmount while the contender's successful restore is pending. Correct
      // code returns that same promise to lifecycle teardown; ID13 starts a
      // second native restore instead.
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      await act(() => {
        renderer.unmount();
      });
      unmounted = true;
      trackUnmountedAppStateReads = true;
      await flushMicrotasks(40);
      overlappingRestore.resolve();
      await flushMicrotasks(200);
      outcome = {
        ownerRecords: recorders[0].record.mock.calls.length,
        racerRecords: racerRecordsAfterSimultaneousStart,
        lateRecordDelta,
        failedRestoreCalls,
        overlapRestoreCalls: restoreModeCalls - failedRestoreCalls,
        resetErrorReported: ownerOnError.mock.calls.some(([message]) => message === RESET_ERROR),
        lateStartSettled,
      };
    } finally {
      failingRestore.resolve();
      overlappingRestore.resolve();
      permissions.resolve({ granted: true });
      if (!unmounted) {
        actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
        await act(() => {
          renderer.unmount();
        });
        unmounted = true;
      }
      await flushMicrotasks(200);
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }

    const startedOperations = [ownerStart, racerStart, lateStart].filter(
      (operation): operation is Promise<unknown> => operation !== null,
    );
    // Await every operation we started, not only promises that happened to be
    // settled when cleanup was sampled. React can run passive unmount cleanup
    // on a later event-loop turn; leaving one of these chains alive lets its
    // final endOperation callback execute after Jest has torn down react-native.
    await Promise.allSettled(startedOperations);
    await flushMicrotasks(20);
    expect(unmountedAppStateReads).toBe(0);

    expect(outcome).toEqual({
      ownerRecords: 1,
      racerRecords: 0,
      lateRecordDelta: 1,
      failedRestoreCalls: 2,
      overlapRestoreCalls: 1,
      resetErrorReported: true,
      lateStartSettled: true,
    });
  });

  it('fails a hung recording-mode start closed and leaves the audio session acquirable', async () => {
    const hungRecordingMode = deferred<void>();
    asMock(setAudioModeAsync).mockImplementation(
      ({ allowsRecording }: { allowsRecording: boolean }) =>
        allowsRecording ? hungRecordingMode.promise : Promise.resolve(),
    );
    const recorders = installIsolatedRecorders(2);
    const ownerOnError = jest.fn();
    const renderer = createRoot({
      textComponentTypes: ['Text'],
      publicTextComponentTypes: ['Text'],
    });
    const actEnvironment = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    let ownerStart: Promise<unknown> | null = null;
    let contenderStart: Promise<unknown> | null = null;
    try {
      await act(() => {
        renderer.render(
          <>
            <Recorder key="owner" {...recorderProps(ownerOnError)} />
            <Recorder key="contender" {...recorderProps(jest.fn())} />
          </>,
        );
      });
      const starts = rawPressHandlers(renderer, START_LABEL);
      expect(starts).toHaveLength(2);

      actEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
      ownerStart = Promise.resolve(starts[0]!());
      await flushMicrotasks(30);
      // The native recording-mode call never settles: the audio-session
      // deadline must reject it so the start fails closed — localized start
      // failure, phase reset, controls unlatched — instead of holding the
      // operation token with every control locked forever.
      await jest.advanceTimersByTimeAsync(AUDIO_MODE_OPERATION_TIMEOUT_MS);
      await flushMicrotasks(50);

      expect(recorders[0].record).not.toHaveBeenCalled();
      expect(ownerOnError.mock.calls.some(([message]) => message === START_FAILED_ERROR)).toBe(
        true,
      );
      expect(startButtonsDisabled(renderer)).toEqual([false, false]);

      // The failed start released the owner, so a later instance acquires the
      // session and records once the native call settles again.
      asMock(setAudioModeAsync).mockImplementation(() => Promise.resolve());
      contenderStart = Promise.resolve(starts[1]!());
      await flushMicrotasks(50);
      expect(recorders[1].record).toHaveBeenCalledTimes(1);
    } finally {
      hungRecordingMode.resolve();
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
      await act(() => {
        renderer.unmount();
      });
      await flushMicrotasks(50);
      await Promise.allSettled([ownerStart, contenderStart].filter(Boolean));
    }
  });

  it('completes stop and lifecycle bookkeeping with a hung native restore and unpoisons the queue', async () => {
    const hungRestore = deferred<void>();
    asMock(setAudioModeAsync).mockImplementation(
      ({ allowsRecording }: { allowsRecording: boolean }) =>
        allowsRecording ? Promise.resolve() : hungRestore.promise,
    );
    const recorders = installIsolatedRecorders(1);
    const ownerOnError = jest.fn();
    const renderer = createRoot({
      textComponentTypes: ['Text'],
      publicTextComponentTypes: ['Text'],
    });
    const operations: Promise<unknown>[] = [];
    const press = (label: string) => () => {
      const handler = rawPressHandlers(renderer, label)[0];
      if (typeof handler !== 'function') {
        // A missing handler is the observable behavior under a wiring mutant and
        // must fail as a kill, never an infrastructure error.
        expect(handler).toBeInstanceOf(Function);
        return;
      }
      operations.push(Promise.resolve(handler()));
    };
    try {
      await act(() => {
        renderer.render(<Recorder {...recorderProps(ownerOnError)} />);
      });

      // A successful take: the recording mode settles, so only the restore hangs.
      await act(async () => {
        press(START_LABEL)();
        await flushMicrotasks(30);
      });
      expect(recorders[0].record).toHaveBeenCalledTimes(1);
      await act(async () => {
        press(STOP_LABEL)();
        await flushMicrotasks(30);
      });
      // The take is adopted before the finally's restore await, so the review
      // actions are already visible while the native reset hangs.
      expect(nodesWithAccessibilityLabel(renderer, SAVE_RECORDING_LABEL)).toBe(1);

      // Both bounded restore attempts (the first plus restoreAudioMode's single
      // retry) hit the deadline; the stop still completes, reports the reset
      // failure once, releases the audio-session owner, and clears the
      // operation token — no latched controls.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2 * AUDIO_MODE_OPERATION_TIMEOUT_MS + 1);
        await flushMicrotasks(50);
      });
      expect(ownerOnError.mock.calls.filter(([message]) => message === RESET_ERROR)).toHaveLength(
        1,
      );
      expect(startButtonsDisabled(renderer)).toEqual([false]);

      // A lifecycle stop (blur) while a NEW take records must also finish: the
      // take is discarded, the phase lands at idle, and the operation token is
      // released even though the native restore never settles.
      await act(async () => {
        press(START_LABEL)();
        await flushMicrotasks(30);
      });
      expect(recorders[0].record).toHaveBeenCalledTimes(2);
      const focus = mockAudioOwnerFocusRegistrations[0];
      const focusCleanup = focus?.cleanup;
      if (typeof focusCleanup !== 'function') {
        throw new Error('Focus cleanup was not registered');
      }
      await act(async () => {
        focusCleanup();
        await flushMicrotasks(30);
      });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(2 * AUDIO_MODE_OPERATION_TIMEOUT_MS + 1);
        await flushMicrotasks(50);
      });
      expect(nodesWithAccessibilityLabel(renderer, SAVE_RECORDING_LABEL)).toBe(0);
      expect(startButtonsDisabled(renderer)).toEqual([false]);

      // The timed-out entries never poisoned the serialized queue: a later
      // playback-mode mutation is accepted and settles immediately.
      const restoreCallsBefore = playbackModeRestoreCalls();
      asMock(setAudioModeAsync).mockImplementation(() => Promise.resolve());
      await configurePlaybackAudioMode();
      expect(playbackModeRestoreCalls()).toBe(restoreCallsBefore + 1);
    } finally {
      hungRestore.resolve();
      await act(() => {
        renderer.unmount();
      });
      await flushMicrotasks(50);
      await Promise.allSettled(operations);
    }
  });
});
