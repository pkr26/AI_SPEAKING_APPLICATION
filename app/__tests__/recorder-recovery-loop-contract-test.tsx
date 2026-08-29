import { act, cleanup, render } from '@testing-library/react-native';
import { AudioModule, setAudioModeAsync, useAudioRecorder, type RecorderState } from 'expo-audio';
import * as Crypto from 'expo-crypto';
import { Directory, File } from 'expo-file-system';
import React from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';

import Recorder from '../src/components/Recorder';
import {
  ApiError,
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  resolveAudioFileDescriptor,
} from '../src/lib/api';
import {
  capturePendingAssessmentGeneration,
  claimPendingAssessmentRecoveryPost,
  clearPendingAssessment,
  ensurePendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentCancelled,
  markPendingAssessmentFeedbackPending,
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

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => callback(), [callback]);
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
  markPendingAssessmentFeedbackPending: jest.fn(),
  markPendingAssessmentForReconciliation: jest.fn(),
  markPendingAssessmentStage: jest.fn(),
  refundPendingAssessmentRecoveryPost: jest.fn(),
}));

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440002';
const ENDPOINT = '/practice/attempt' as const;
const originalPlatform = Object.getOwnPropertyDescriptor(Platform, 'OS');
const pendingCleanup = new Set<() => void>();

const asMock = (value: unknown) => value as jest.Mock;

function deferred<T>() {
  let rawResolve!: (value: T) => void;
  let settled = false;
  const promise = new Promise<T>((resolve) => {
    rawResolve = resolve;
  });
  const settleForCleanup = () => {
    if (settled) return;
    settled = true;
    pendingCleanup.delete(settleForCleanup);
    rawResolve(undefined as T);
  };
  pendingCleanup.add(settleForCleanup);
  return {
    promise,
    resolve(value: T) {
      if (settled) return;
      settled = true;
      pendingCleanup.delete(settleForCleanup);
      rawResolve(value);
    },
  };
}

async function flushMicrotasks(turns = 20): Promise<void> {
  if (turns <= 0) return;
  await Promise.resolve();
  await flushMicrotasks(turns - 1);
}

function pendingRecord(overrides: Partial<PendingAssessment> = {}): PendingAssessment {
  return {
    ownerId: OWNER_ID,
    endpoint: ENDPOINT,
    questionId: QUESTION_ID,
    requestId: REQUEST_ID,
    createdAt: Date.now(),
    retainRecording: false,
    stage: 'direct-posting',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  // This contract owns only recovery scheduling, not the native cache janitor.
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

  const recorderState: RecorderState = {
    canRecord: true,
    isRecording: false,
    durationMillis: 0,
    url: null,
    mediaServicesDidReset: false,
  };
  const recorder = {
    getStatus: jest.fn(() => recorderState),
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    uri: null,
    isRecording: false,
  };
  asMock(useAudioRecorder).mockImplementation(() => recorder);
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
  asMock(capturePendingAssessmentGeneration).mockReturnValue(0);
  asMock(ensurePendingAssessment).mockImplementation(
    async (candidate: PendingAssessment) => candidate,
  );
  asMock(clearPendingAssessment).mockResolvedValue(undefined);
  asMock(markPendingAssessmentFeedbackPending).mockResolvedValue(true);
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
  asMock(apiPostPresignedAudio).mockResolvedValue(undefined);
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
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
  if (originalPlatform) Object.defineProperty(Platform, 'OS', originalPlatform);
  jest.restoreAllMocks();
});

// This bounded recovery harness runs as its own Stryker pass; later component
// suites cannot convert its decisive result into a shared-state timeout.
describe('Recorder recovery-loop mutation contract', () => {
  it('keeps the ordinary two-second poll delay after a hintless in-flight conflict', async () => {
    jest.useFakeTimers();
    const audioKey = `audio-uploads/practice/${OWNER_ID}/${REQUEST_ID}.m4a`;
    asMock(loadPendingAssessment).mockResolvedValue(
      pendingRecord({ stage: 's3-granted', audioKey }),
    );
    for (let index = 0; index < 6; index += 1) {
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
    }
    asMock(apiFetch).mockImplementationOnce(
      async (_path: string, options?: { onRequestStarted?: () => void }): Promise<never> => {
        options?.onRequestStarted?.();
        throw new ApiError(409, 'processing', undefined, { code: 'REQUEST_IN_FLIGHT' });
      },
    );
    asMock(apiFetch).mockResolvedValueOnce({
      status: 'completed',
      context: 'practice',
      questionId: QUESTION_ID,
      response: { score: 81 },
    });
    const onResult = jest.fn();
    let view: Awaited<ReturnType<typeof render>> | undefined;
    try {
      view = await render(
        <Recorder
          ownerId={OWNER_ID}
          questionId={QUESTION_ID}
          endpoint={ENDPOINT}
          parseResult={(value) => ({ parsed: value })}
          onResult={onResult}
          onError={jest.fn()}
          onRecoveryUnresolved={jest.fn()}
        />,
      );
      await act(async () => flushMicrotasks());
      expect(apiFetch).toHaveBeenCalledTimes(1);

      for (let index = 0; index < 5; index += 1) {
        await act(async () => {
          jest.advanceTimersByTime(2_000);
          await flushMicrotasks();
        });
      }
      expect(apiFetch).toHaveBeenCalledTimes(7);

      await act(async () => {
        jest.advanceTimersByTime(1_999);
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(7);

      await act(async () => {
        jest.advanceTimersByTime(1);
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(8);
      expect(onResult).toHaveBeenCalledWith({ parsed: { score: 81 } });
    } finally {
      await view?.unmount();
      jest.useRealTimers();
    }
  });

  it('bounds a self-deferred recovery to one completed read and one controlled second read', async () => {
    const secondLoad = deferred<PendingAssessment | null>();
    let secondLoadObserved = false;
    asMock(loadPendingAssessment)
      .mockResolvedValueOnce(pendingRecord())
      .mockImplementation(() => {
        secondLoadObserved = true;
        return secondLoad.promise;
      });
    asMock(apiFetch).mockResolvedValue({
      status: 'completed',
      context: 'practice',
      questionId: QUESTION_ID,
      response: { score: 96 },
    });
    const onResult = jest.fn();
    let view: Awaited<ReturnType<typeof render>> | undefined;
    let outcome:
      | {
          loadCalls: number;
          secondLoadObserved: boolean;
          fetchCalls: number;
          resultCalls: number;
        }
      | undefined;
    try {
      view = await render(
        <Recorder
          ownerId={OWNER_ID}
          questionId={QUESTION_ID}
          endpoint={ENDPOINT}
          parseResult={(value) => ({ parsed: value })}
          onResult={onResult}
          onError={jest.fn()}
          onRecoveryUnresolved={jest.fn()}
        />,
      );
      await act(async () => flushMicrotasks());
      outcome = {
        loadCalls: asMock(loadPendingAssessment).mock.calls.length,
        secondLoadObserved,
        fetchCalls: asMock(apiFetch).mock.calls.length,
        resultCalls: onResult.mock.calls.length,
      };
    } finally {
      await view?.unmount();
      secondLoad.resolve(null);
      await act(async () => flushMicrotasks());
    }

    expect(outcome).toEqual({
      loadCalls: 1,
      secondLoadObserved: false,
      fetchCalls: 1,
      resultCalls: 1,
    });
  });
});
