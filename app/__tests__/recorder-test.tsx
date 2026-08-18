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
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { File } from 'expo-file-system';
import React from 'react';
import type { TestInstance } from 'test-renderer';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Linking,
  StyleSheet,
  Text,
  useColorScheme,
  type AppStateStatus,
  type EmitterSubscription,
} from 'react-native';

import Recorder, { sleepAbortable } from '../src/components/Recorder';
import {
  ApiError,
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  AUDIO_TIMEOUT_MS,
  resolveAudioFileDescriptor,
} from '../src/lib/api';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import {
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentForReconciliation,
  markPendingAssessmentStage,
  savePendingAssessment,
  type PendingAssessment,
} from '../src/lib/pending-assessment';
import { colors, darkColors, radii, spacing } from '../src/lib/theme';
import { ContractError } from '../src/lib/types';

// The recorder renders in the light palette unless a test flips the OS scheme.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

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
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: jest.fn(),
  useAudioRecorderState: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

interface FocusSubscriber {
  callback: () => void | (() => void);
  cleanup?: void | (() => void);
}

// Every mounted useFocusEffect, so a test can blur and refocus the screen the
// way expo-router does on navigation — without unmounting the component.
let mockFocusSubscribers: FocusSubscriber[] = [];
let mockScreenFocused = true;

// Focus is simulated by invoking the effect on mount and its cleanup on
// unmount, re-running when the callback identity changes (as expo-router does
// while a screen stays focused). While the screen is blurred the effect is
// registered but not invoked, which is what separates "blurred" from
// "unmounted" — the two states the component tracks with different refs.
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const subscriber: FocusSubscriber = { callback };
        mockFocusSubscribers.push(subscriber);
        if (mockScreenFocused) subscriber.cleanup = callback();
        return () => {
          const index = mockFocusSubscribers.indexOf(subscriber);
          if (index >= 0) mockFocusSubscribers.splice(index, 1);
          if (typeof subscriber.cleanup === 'function') subscriber.cleanup();
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

// No I18nProvider is mounted in tests, so the component renders the module's
// active language (English); assertions read the same typed catalog.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

const START_LABEL = t('recorder.startLabel');
const STOP_LABEL = t('recorder.stopLabel');
const SUBMIT_TEXT = t('recorder.submit');
const RERECORD_TEXT = t('recorder.rerecord');
const CANCEL_TEXT = t('common.cancel');
const RECOVERING_TEXT = t('recorder.statusRecovering');
const IDLE_TEXT = t('recorder.statusIdle');
const RECORD_BUTTON_LABEL = new RegExp(`^(${START_LABEL}|${STOP_LABEL})$`);
const recordingStatusText = (elapsed: string) => t('recorder.statusRecording', { elapsed });
const recordedStatusText = (elapsed: string) => t('recorder.statusRecorded', { elapsed });
const waitingForText = (elapsed: string) => t('recorder.waitingFor', { elapsed });

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
  metering?: number;
}

interface MockPreviewPlayer {
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
  seekTo: jest.Mock;
  addListener: jest.Mock;
}

function makeMockPreviewPlayer(): MockPreviewPlayer {
  return {
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
}

let mockRecorder: MockRecorder;
let mockRecorderState: MockRecorderState;
let mockPreviewPlayer: MockPreviewPlayer;
let appStateHandlers: ((state: AppStateStatus) => void)[];
let appStateSubscriptionRemove: jest.Mock;
let reduceMotionSubscriptionRemove: jest.Mock;

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

/** Leaves the screen mounted and focused; only the OS foreground state moves. */
function backgroundApp(): void {
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'background',
  });
}

/** Navigates away from the screen without unmounting it. */
function blurScreen(): void {
  mockScreenFocused = false;
  for (const subscriber of [...mockFocusSubscribers].reverse()) {
    if (typeof subscriber.cleanup === 'function') subscriber.cleanup();
    subscriber.cleanup = undefined;
  }
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
  const button = screen.getByLabelText(RECORD_BUTTON_LABEL);
  const wrap = button.parent;
  if (!wrap) return 0;
  return wrap.children.filter((child) => child !== button && typeof child !== 'string').length;
}

function pulseRingNode(): TestInstance | null {
  const button = screen.getByLabelText(RECORD_BUTTON_LABEL);
  const wrap = button.parent;
  if (!wrap) return null;
  const ring = wrap.children.find((child) => child !== button && typeof child !== 'string');
  return ring && typeof ring !== 'string' ? ring : null;
}

function pulseRingProps(): Record<string, unknown> | null {
  return pulseRingNode()?.props ?? null;
}

function recordIconNode(): TestInstance {
  const button = screen.getByLabelText(RECORD_BUTTON_LABEL);
  const icon = button.children.find((child) => typeof child !== 'string');
  if (!icon || typeof icon === 'string') throw new Error('Record button icon not found');
  return icon;
}

/** The fixed-size wrap that reserves room for the pulse ring behind the mic. */
function recordButtonWrapNode(): TestInstance {
  const wrap = screen.getByLabelText(RECORD_BUTTON_LABEL).parent;
  if (!wrap) throw new Error('Record button wrap not found');
  return wrap;
}

/** The recorder's own root view; every other node hangs off it. */
function recorderContainerNode(): TestInstance {
  const container = recordButtonWrapNode().parent;
  if (!container) throw new Error('Recorder container not found');
  return container;
}

/**
 * The wait spinner shares its accessibility label with the status line, so it
 * is picked out by the ActivityIndicator-only `size` prop.
 */
function waitSpinnerNode(accessibilityLabel: string): TestInstance {
  const spinner = screen
    .getAllByLabelText(accessibilityLabel)
    .find((node) => node.props.size === 'large');
  if (!spinner) throw new Error('Wait spinner not found');
  return spinner;
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

function compositePressablePropsForNode(node: {
  unstable_fiber: unknown;
}): Record<string, unknown> {
  type PressFiber = {
    memoizedProps?: Record<string, unknown> & { onPress?: () => unknown };
    return: PressFiber | null;
  };
  let fiber = node.unstable_fiber as PressFiber | null;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') return fiber.memoizedProps;
    fiber = fiber.return;
  }
  throw new Error('Pressable not found');
}

function compositePressableProps(
  view: Pick<RenderResult, 'getByLabelText'>,
  accessibilityLabel: string,
): Record<string, unknown> {
  return compositePressablePropsForNode(view.getByLabelText(accessibilityLabel));
}

function invokePressHandler(
  view: Pick<RenderResult, 'getByLabelText'>,
  accessibilityLabel: string,
): Promise<void> {
  // The async RNTL fireEvent wrapper cannot overlap the deliberate identity
  // rerender in these race tests. Walk to Pressable's composite fiber so the
  // in-flight handler can be controlled without opening a nested act scope.
  const onPress = compositePressableProps(view, accessibilityLabel).onPress as () => unknown;
  return Promise.resolve(onPress()).then(() => undefined);
}

function invokeRolePressHandler(accessibleName: string): Promise<void> {
  const onPress = compositePressablePropsForNode(
    screen.getByRole('button', { name: accessibleName }),
  ).onPress as () => unknown;
  return Promise.resolve(onPress()).then(() => undefined);
}

function AfterRecorderLayout({ onLayout }: { onLayout?: () => void }) {
  React.useLayoutEffect(() => {
    onLayout?.();
  }, [onLayout]);
  return null;
}

type IdentityHarnessRecorderProps<T> = {
  ownerId: string;
  questionId: string;
  endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native';
  parseResult: (data: unknown) => T;
  onResult: (data: T) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onRecoveryEndpointMismatch?: (
    endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
  ) => boolean;
  onRateLimited?: (message: string) => void;
};

function IdentityLayoutHarness<T>({
  recorderProps,
  onRecorderLayout,
}: {
  recorderProps: IdentityHarnessRecorderProps<T>;
  onRecorderLayout?: () => void;
}) {
  return (
    <>
      <Recorder {...recorderProps} />
      <AfterRecorderLayout onLayout={onRecorderLayout} />
    </>
  );
}

type RecorderTestOverrides = {
  ownerId?: string;
  questionId?: string;
  endpoint?: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native';
  parseResult?: (data: unknown) => { parsed: unknown };
  onError?: (message: string) => void;
  onRecoveryUnresolved?: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onRecoveryEndpointMismatch?: (
    endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
  ) => boolean;
  onRateLimited?: (message: string) => void;
};

function recorderTestProps(overrides: RecorderTestOverrides = {}) {
  return {
    ownerId: OWNER_ID,
    questionId: QUESTION_ID,
    endpoint: ENDPOINT as '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
    parseResult: jest.fn((data: unknown) => ({ parsed: data })),
    onResult: jest.fn(),
    onError: jest.fn(),
    onRecoveryUnresolved: jest.fn(),
    ...overrides,
  };
}

async function renderRecorder(overrides: RecorderTestOverrides = {}) {
  const props = recorderTestProps(overrides);
  const view = await render(<Recorder {...props} />);
  await flushAct();
  return { view, props };
}

async function renderIdentityRaceRecorder(overrides: RecorderTestOverrides = {}) {
  const props = recorderTestProps(overrides);
  const view = await render(<IdentityLayoutHarness recorderProps={props} />);
  await flushAct();
  return { view, props };
}

type PracticeAnswerMode = 'english' | 'native';
type HarnessResult = { parser: PracticeAnswerMode; response: unknown };

function RecoveryModeHarness({
  initialMode,
  parseEnglish,
  parseNative,
  onModeChange,
  onResult,
  onError,
  onRecoveryUnresolved,
}: {
  initialMode: PracticeAnswerMode;
  parseEnglish: (data: unknown) => HarnessResult;
  parseNative: (data: unknown) => HarnessResult;
  onModeChange: (mode: PracticeAnswerMode) => void;
  onResult: (data: HarnessResult) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
}) {
  const [mode, setMode] = React.useState<PracticeAnswerMode>(initialMode);
  const nativeMode = mode === 'native';

  return (
    <>
      <Text testID="recovery-harness-mode">{mode}</Text>
      <Recorder
        key={mode}
        ownerId={OWNER_ID}
        questionId={QUESTION_ID}
        endpoint={nativeMode ? '/practice/attempt/native' : '/practice/attempt'}
        parseResult={nativeMode ? parseNative : parseEnglish}
        onResult={onResult}
        onError={onError}
        onRecoveryUnresolved={onRecoveryUnresolved}
        onRecoveryEndpointMismatch={(savedEndpoint) => {
          let savedMode: PracticeAnswerMode;
          if (savedEndpoint === '/practice/attempt/native') {
            savedMode = 'native';
          } else if (savedEndpoint === '/practice/attempt') {
            savedMode = 'english';
          } else {
            return false;
          }
          onModeChange(savedMode);
          setMode(savedMode);
          return true;
        }}
      />
    </>
  );
}

async function startRecording(): Promise<void> {
  expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
  await fireEvent.press(screen.getByLabelText(START_LABEL));
  expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
}

async function recordAndStop(durationMillis = 5000): Promise<void> {
  await startRecording();
  mockRecorderState.durationMillis = durationMillis;
  await fireEvent.press(screen.getByLabelText(STOP_LABEL));
  expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
}

async function submitLiveRecordingIntoRecovery(
  recoveryRecord: PendingAssessment = pendingRecord(),
  overrides: Parameters<typeof renderRecorder>[0] = {},
) {
  asMock(loadPendingAssessment)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValue(recoveryRecord);
  asMock(apiUploadAudio).mockRejectedValue(new ApiError(0, 'connection interrupted'));
  const rendered = await renderRecorder(overrides);
  await recordAndStop();
  asMock(File).mockClear();

  await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  return rendered;
}

beforeEach(() => {
  appStateHandlers = [];
  appStateSubscriptionRemove = jest.fn();
  reduceMotionSubscriptionRemove = jest.fn();
  mockFocusSubscribers = [];
  mockScreenFocused = true;
  // Module factory mocks outlive restoreAllMocks; re-arm the light default.
  asMock(useColorScheme).mockReset();
  asMock(useColorScheme).mockReturnValue('light');

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
  mockPreviewPlayer = makeMockPreviewPlayer();
  asMock(createAudioPlayer).mockReset();
  asMock(createAudioPlayer).mockImplementation(() => mockPreviewPlayer);
  asMock(Haptics.impactAsync).mockClear();
  asMock(Haptics.impactAsync).mockResolvedValue(undefined);
  asMock(Haptics.notificationAsync).mockClear();
  asMock(Haptics.notificationAsync).mockResolvedValue(undefined);
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
  asMock(resolveAudioFileDescriptor).mockReset();
  asMock(resolveAudioFileDescriptor).mockResolvedValue({
    name: 'audio.m4a',
    type: 'audio/mp4',
  });

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
      return { remove: appStateSubscriptionRemove };
    });
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: reduceMotionSubscriptionRemove } as unknown as EmitterSubscription);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('sleepAbortable', () => {
  it('rejects with an AbortError when the signal is already aborted at entry', async () => {
    // Regression: the timer was declared below the abort check, so a
    // pre-aborted signal hit clearTimeout in the temporal dead zone and
    // rejected with a ReferenceError instead of an AbortError.
    const controller = new AbortController();
    controller.abort();

    await expect(sleepAbortable(60_000, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('resolves after the delay when the signal never fires', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const wait = sleepAbortable(1_000, controller.signal);

    jest.advanceTimersByTime(1_000);

    await expect(wait).resolves.toBeUndefined();
    expect(controller.signal.aborted).toBe(false);
  });

  it('rejects with an AbortError when the signal fires mid-wait', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const wait = sleepAbortable(60_000, controller.signal);
    const assertion = expect(wait).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
  });
});

describe('Recorder', () => {
  describe('idle rendering and recording lifecycle', () => {
    it('renders idle with a start button and no permission banner', async () => {
      await renderRecorder();

      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(screen.getByLabelText(t('recorder.a11yIdle'))).toBeTruthy();
      // Critical privacy copy pinned literally on purpose: this must match
      // t('recorder.privacyNote') exactly, so a silent copy edit fails here.
      expect(
        screen.getByText('We send your recording only after you tap Send Answer.'),
      ).toBeTruthy();
      expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();
    });

    it('does not run the assessment wait clock while idle', async () => {
      const setWaitInterval = jest.spyOn(globalThis, 'setInterval');

      try {
        await renderRecorder();

        expect(setWaitInterval).not.toHaveBeenCalledWith(expect.any(Function), 1_000);
      } finally {
        setWaitInterval.mockRestore();
      }
    });

    it('reports when mode-changing interactions must be locked and releases them on unmount', async () => {
      const onInteractionLockChange = jest.fn();
      const { view } = await renderRecorder({ onInteractionLockChange });

      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
      await startRecording();
      await waitFor(() => expect(onInteractionLockChange).toHaveBeenLastCalledWith(true));

      await view.unmount();
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('renders semantic record-button feedback and the active pulse treatment', async () => {
      await renderRecorder();
      const getRecordButton = () => screen.getByRole('button', { name: START_LABEL });

      expect(flattenedStyle(getRecordButton())).toMatchObject({
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.shadow,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      });
      expect(flattenedStyle(getRecordButton()).opacity).toBeUndefined();
      expect(flattenedStyle(recordIconNode())).toEqual({
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.onDanger,
      });

      await fireEvent(getRecordButton(), 'responderGrant', responderEvent());
      expect(flattenedStyle(getRecordButton())).toMatchObject({
        backgroundColor: colors.danger,
        opacity: 0.6,
      });
      await fireEvent(getRecordButton(), 'responderTerminate', responderEvent());
      await waitFor(() => expect(flattenedStyle(getRecordButton()).opacity).toBeUndefined());
      expect(mockRecorder.record).not.toHaveBeenCalled();

      await startRecording();
      const activeButton = screen.getByRole('button', { name: STOP_LABEL });
      expect(flattenedStyle(activeButton)).toMatchObject({
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
      });
      expect(flattenedStyle(activeButton).opacity).toBeUndefined();
      expect(flattenedStyle(recordIconNode())).toEqual({
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: colors.onDanger,
      });

      const ring = pulseRingNode();
      if (!ring) throw new Error('Active recording did not render its pulse ring');
      expect(flattenedStyle(ring)).toMatchObject({
        position: 'absolute',
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.dangerPulse,
      });
      expect(flattenedStyle(ring).transform).toEqual([{ scale: expect.anything() }]);
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
          // U-M3: the live level meter reads recorderState.metering.
          isMeteringEnabled: true,
          web: expect.objectContaining({
            bitsPerSecond: 64_000,
          }),
        }),
      );
      expect(useAudioRecorderState).toHaveBeenCalledWith(mockRecorder, 200);
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: true,
        allowsBackgroundRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 120 });
      expect(screen.getByText(recordingStatusText('0:00'))).toBeTruthy();
      expect(pulseRingCount()).toBe(1);
      expect(pulseRingProps()).toMatchObject({ accessible: false });
      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
    });

    it('ignores a stale same-frame start press after recording has begun', async () => {
      const { view } = await renderRecorder();
      // Keep the pre-recording Pressable handler. React has not committed its
      // Stop-button render between these two calls, which models a second tap
      // delivered in the same frame after the first async start resolves.
      const onPress = compositePressableProps(view, START_LABEL).onPress as () => unknown;

      await act(async () => {
        await Promise.resolve(onPress());
        await Promise.resolve(onPress());
      });

      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('starts and stops the pulse animation only while recording', async () => {
      const start = jest.fn();
      const stop = jest.fn();
      const loop = {
        start,
        stop,
        reset: jest.fn(),
        _isUsingNativeDriver: jest.fn(() => true),
      } as unknown as ReturnType<typeof Animated.loop>;
      const timingSpy = jest.spyOn(Animated, 'timing');
      const loopSpy = jest.spyOn(Animated, 'loop').mockReturnValue(loop);
      await renderRecorder();

      expect(loopSpy).not.toHaveBeenCalled();
      await startRecording();
      expect(loopSpy).toHaveBeenCalledTimes(1);
      expect(start).toHaveBeenCalledTimes(1);
      expect(timingSpy).toHaveBeenCalledTimes(2);
      expect(timingSpy).toHaveBeenNthCalledWith(1, expect.anything(), {
        toValue: 1.3,
        duration: 550,
        useNativeDriver: true,
      });
      expect(timingSpy).toHaveBeenNthCalledWith(2, expect.anything(), {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      });

      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      expect(stop).toHaveBeenCalledTimes(1);
    });

    it('announces phase changes without making elapsed timer updates live', async () => {
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      const { view, props } = await renderRecorder();
      announce.mockClear();

      await startRecording();
      expect(announce).toHaveBeenLastCalledWith(t('recorder.announceStarted'));
      const announcementCount = announce.mock.calls.length;

      mockRecorderState.durationMillis = 1_000;
      await view.rerender(<Recorder {...props} />);
      const timer = screen.getByText(recordingStatusText('0:01'));
      expect(timer.props.accessible).toBe(false);
      expect(timer.props.accessibilityLiveRegion).toBeUndefined();
      expect(timer.props.accessibilityLabel).toBe(t('recorder.a11yRecording'));
      expect(announce).toHaveBeenCalledTimes(announcementCount);

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(announce).toHaveBeenLastCalledWith(t('recorder.a11ySaved')));
    });

    it('announces the uploading phase when a submission starts', async () => {
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      announce.mockClear();

      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(announce).toHaveBeenLastCalledWith(t('recorder.a11yUploading')));
      // Both the status line and the wait spinner carry the uploading label.
      expect(screen.getAllByLabelText(t('recorder.a11yUploading'))).toHaveLength(2);
      expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy();
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: true,
      });
      expect(flattenedStyle(screen.getByLabelText(START_LABEL))).toMatchObject({
        width: 88,
        height: 88,
        backgroundColor: colors.danger,
        opacity: 0.6,
      });

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
    });

    it('announces the recovering phase when an interrupted assessment is restored', async () => {
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      // Keep the reconciliation poll pending so the phase stays 'recovering'.
      asMock(apiFetch).mockReturnValue(new Promise(() => undefined));
      await renderRecorder();

      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      expect(announce).toHaveBeenCalledWith(t('recorder.a11yRecovering'));
      // Both the status line and the wait spinner carry the recovering label.
      expect(screen.getAllByLabelText(t('recorder.a11yRecovering'))).toHaveLength(2);
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: true,
      });
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

    it('records a foreground permission grant without waiting on any timer', async () => {
      // The prompt's resume wait must be skipped outright while the app is
      // already active: under fake timers nothing would ever advance it, so
      // this start would never finish.
      jest.useFakeTimers();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      const { view } = await renderRecorder();

      await act(async () => {
        await invokePressHandler(view, START_LABEL);
      });

      expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 120 });
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('records a first-ever grant whose own permission dialog backgrounded the app', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();

      const start = invokePressHandler(view, START_LABEL);
      await waitFor(() =>
        expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      // The Android dialog pauses the activity itself: AppState reports
      // 'background' and lifecycle cleanup bumps the epoch while the prompt
      // the learner is answering is still on screen.
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      await act(async () => {
        permission.resolve({ granted: true });
        await flushMicrotasks();
      });
      expect(mockRecorder.record).not.toHaveBeenCalled();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await start;
        await flushMicrotasks();
      });

      // The tap that granted the microphone still records; swallowing it left
      // a first-time learner pressing a button that did nothing.
      expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 120 });
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('abandons a granted prompt when the app never comes back to the foreground', async () => {
      jest.useFakeTimers();
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();

      const start = invokePressHandler(view, START_LABEL);
      await waitFor(() =>
        expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      // 'inactive' with nothing recording runs no lifecycle cleanup at all, so
      // only the bounded wait can release the start that is holding the
      // controls while the prompt is answered off-screen.
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'inactive',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('inactive');
        permission.resolve({ granted: true });
        await flushMicrotasks();
      });
      expect(mockRecorder.record).not.toHaveBeenCalled();

      // Only a resume ends the wait: another lifecycle report leaves the start
      // holding the operation lock, so a second tap still does nothing.
      await act(async () => {
        for (const handler of appStateHandlers) handler('inactive');
        await flushMicrotasks();
      });
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      await invokePressHandler(view, START_LABEL);
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(2_000);
        await start;
        await flushMicrotasks();
      });

      // The learner really did leave: nothing records, nothing is announced,
      // and the device is never switched into recording mode behind them.
      expect(setAudioModeAsync).not.toHaveBeenCalledWith(
        expect.objectContaining({ allowsRecording: true }),
      );
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();

      // ...and the wait released both its listener and the recorder controls,
      // so the next tap in the foreground records normally.
      expect(appStateSubscriptionRemove).toHaveBeenCalledTimes(1);
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(mockRecorder.record).toHaveBeenCalledTimes(1));
    });

    it('shows the permission banner and does not record when denied', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy());

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    });

    it('opens device settings after microphone permission is permanently denied', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await fireEvent.press(await screen.findByText(t('recorder.openSettings')));

      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(openSettings).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('renders a minimum-sized settings action with cancellable pressed feedback', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      openSettings.mockClear();
      await renderRecorder();
      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await screen.findByRole('button', { name: t('recorder.openSettings') });
      const getSettingsButton = () =>
        screen.getByRole('button', { name: t('recorder.openSettings') });
      expect(openSettings).not.toHaveBeenCalled();

      expect(flattenedStyle(getSettingsButton())).toMatchObject({
        minHeight: 44,
        marginTop: 10,
        alignSelf: 'center',
        justifyContent: 'center',
        borderRadius: radii.button,
        paddingHorizontal: spacing.ml,
        backgroundColor: colors.danger,
      });
      expect(flattenedStyle(getSettingsButton()).opacity).toBeUndefined();

      await fireEvent(getSettingsButton(), 'responderGrant', responderEvent());
      expect(openSettings).not.toHaveBeenCalled();
      expect(flattenedStyle(getSettingsButton()).opacity).toBe(0.85);
      await fireEvent(getSettingsButton(), 'responderTerminate', responderEvent());
      expect(openSettings).not.toHaveBeenCalled();
      await waitFor(() => expect(flattenedStyle(getSettingsButton()).opacity).toBeUndefined());

      expect(openSettings).not.toHaveBeenCalled();
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

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await fireEvent.press(await screen.findByText(t('recorder.openSettings')));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.openSettingsFailed')),
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

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    });

    it('abandons a start that is still in flight when the app backgrounds', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      await renderRecorder();

      const press = fireEvent.press(screen.getByLabelText(START_LABEL));
      // The lifecycle stop fires while the permission request is in flight;
      // the stale start must not begin recording once it resolves.
      for (const handler of appStateHandlers) handler('background');
      permission.resolve({ granted: true });
      await press;
      await flushAct();

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('suppresses a late start failure after the app backgrounds', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { props } = await renderRecorder();

      const press = fireEvent.press(screen.getByLabelText(START_LABEL));
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
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    });

    it('cleans up and restores audio mode when stopping the native recording fails', async () => {
      mockRecorder.stop.mockImplementation(async () => {
        // The recorder still reports recording, so the take was never
        // finalized and must be discarded.
        mockRecorder.uri = RECORDING_URI;
        mockRecorder.isRecording = true;
        throw new Error('native stop failure');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed')));

      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('keeps the finalized take when the tapped stop rejects after a native auto-stop', async () => {
      mockRecorder.stop.mockImplementation(async () => {
        // The 2:00 auto-stop finalized the file before the tap's stop call
        // reached the native recorder; the rejection must not destroy it.
        mockRecorder.uri = RECORDING_URI;
        mockRecorder.isRecording = false;
        throw new Error('recorder already stopped');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 121_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      expect(screen.getByText(recordedStatusText('2:00'))).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([]);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
    });

    it('discards a rejected stop whose recording file no longer exists', async () => {
      asMock(File).mockImplementation((uri: string) => ({
        uri,
        exists: false,
        delete: jest.fn(),
        arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
      }));
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = RECORDING_URI;
        throw new Error('native stop failure');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed')));

      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('suppresses a late stop failure after the app backgrounds', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockReturnValue(stop.promise);
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      const press = fireEvent.press(screen.getByLabelText(STOP_LABEL));
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
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    });

    it('discards recordings shorter than 500ms', async () => {
      const { props } = await renderRecorder();
      await startRecording();

      mockRecorderState.durationMillis = 0;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errTooShort')));

      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
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

        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        if (valid) {
          await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
          expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errTooShort'));
        } else {
          await waitFor(() =>
            expect(props.onError).toHaveBeenCalledWith(t('recorder.errTooShort')),
          );
          expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
        }
      },
    );

    it.each([
      [499, false],
      [500, true],
    ])(
      'uses an under-reported native duration and a %ims wall clock as valid=%s',
      async (wallDuration, valid) => {
        const startedAt = 1_700_000_000_000;
        jest.useFakeTimers({ now: startedAt });
        asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
        const { props } = await renderRecorder();
        await startRecording();

        mockRecorderState.durationMillis = 100;
        jest.setSystemTime(startedAt + wallDuration);

        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        if (valid) {
          await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
          expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errTooShort'));
        } else {
          await waitFor(() =>
            expect(props.onError).toHaveBeenCalledWith(t('recorder.errTooShort')),
          );
          expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
        }
      },
    );

    it('keeps a valid recording and shows the formatted duration', async () => {
      await renderRecorder();
      await recordAndStop(65_000);

      expect(screen.getByText(recordedStatusText('1:05'))).toBeTruthy();
      expect(screen.getByLabelText(t('recorder.a11ySaved'))).toBeTruthy();
      expect(setAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
    });

    it('serializes overlapping stop handlers and rejects a stale stop handler', async () => {
      const nativeStop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await nativeStop.promise;
        mockRecorder.uri = RECORDING_URI;
      });
      const { view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      // The record button receives stopRecording directly, so unlike the
      // Send Answer void wrapper, this captured callback is awaitable.
      const stopHandler = compositePressableProps(view, STOP_LABEL).onPress as () => Promise<void>;
      asMock(setAudioModeAsync).mockClear();

      const firstStop = stopHandler();
      const overlappingStop = stopHandler();
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);

      await act(async () => {
        nativeStop.resolve();
        await Promise.all([firstStop, overlappingStop]);
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });

      await act(async () => {
        await stopHandler();
        await flushMicrotasks();
      });
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
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
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      expect(mockRecorder.stop).toHaveBeenCalledTimes(2);
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
    });

    it('renders the live elapsed time while recording', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = { ...mockRecorderState, durationMillis: 65_000 };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByText(recordingStatusText('1:05'))).toBeTruthy();
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

      expect(screen.getByText(recordedStatusText('2:00'))).toBeTruthy();
    });

    it.each([
      [999, false],
      [1000, true],
    ])(
      'treats a mic press %ims after a native auto-stop as a re-record=%s',
      async (elapsed, restarts) => {
        // A stop tap can land just after the 2:00 auto-stop flips the phase
        // to recorded; within the grace window it must not destroy the take.
        const autoStoppedAt = 1_700_000_000_000;
        jest.useFakeTimers({ now: autoStoppedAt });
        asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
        const { view, props } = await renderRecorder();
        await startRecording();

        mockRecorderState = {
          ...mockRecorderState,
          isRecording: true,
          durationMillis: 119_000,
        };
        await view.rerender(<Recorder {...props} />);
        await flushAct();

        mockRecorder.uri = RECORDING_URI;
        mockRecorderState = {
          isRecording: false,
          durationMillis: 120_000,
          url: null,
          mediaServicesDidReset: false,
        };
        await view.rerender(<Recorder {...props} />);
        await flushAct();
        expect(screen.getByText(recordedStatusText('2:00'))).toBeTruthy();

        jest.setSystemTime(autoStoppedAt + elapsed);
        await fireEvent.press(screen.getByLabelText(START_LABEL));
        await flushAct();

        if (restarts) {
          expect(mockRecorder.record).toHaveBeenCalledTimes(2);
          expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
        } else {
          expect(mockRecorder.record).toHaveBeenCalledTimes(1);
          expect(screen.getByText(recordedStatusText('2:00'))).toBeTruthy();
          expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
          expect(deletedRecordingUris()).toEqual([]);
        }
      },
    );

    it('re-records immediately from the mic after a user-tapped stop', async () => {
      // The grace window guards only native auto-stops; a take the learner
      // stopped deliberately can be re-recorded without waiting.
      jest.useFakeTimers({ now: 1_700_000_000_000 });
      asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      expect(mockRecorder.record).toHaveBeenCalledTimes(2);
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
        expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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

    it('does not expose submission when native auto-stop has no recording URI', async () => {
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
        url: null,
        mediaServicesDidReset: false,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
    });

    it.each([
      [499, false],
      [500, true],
    ])(
      'keeps a %ims take finalized before a rejected stop only at the minimum length',
      async (duration, keeps) => {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.uri = RECORDING_URI;
          mockRecorder.isRecording = false;
          throw new Error('recorder already stopped');
        });
        const { props } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = duration;

        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        if (keeps) {
          await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
          expect(props.onError).not.toHaveBeenCalled();
        } else {
          await waitFor(() =>
            expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed')),
          );
          expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
        }
      },
    );

    it('ignores a media-services reset once the take is already saved', async () => {
      const { view, props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      // The reset interrupted nothing: the file is already on disk.
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      expect(deletedRecordingUris()).toEqual([]);
    });

    it('reports an interruption when media services reset during recording', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };
      await view.rerender(<Recorder {...props} />);
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errDeviceInterrupted')),
      );
      await waitFor(() => expect(screen.getByLabelText(START_LABEL)).toBeTruthy());
      expect(mockRecorder.stop).toHaveBeenCalled();
    });

    it('stops recording when the app moves to the background', async () => {
      await renderRecorder();
      await startRecording();

      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
      });
      await waitFor(() => expect(screen.getByLabelText(START_LABEL)).toBeTruthy());

      expect(mockRecorder.stop).toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('stops an active recording during the iOS inactive transition', async () => {
      await renderRecorder();
      await startRecording();
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'inactive',
      });

      await act(async () => {
        for (const handler of appStateHandlers) handler('inactive');
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByLabelText(START_LABEL)).toBeTruthy());

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('tells the learner on return that backgrounding discarded the saved take', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      // Nothing is announced to an app the learner cannot see.
      expect(props.onError).not.toHaveBeenCalled();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      // The take is deliberately not kept across backgrounding, so returning
      // to an empty recorder has to come with an explanation.
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errBackgroundDiscarded'));
      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      // Said once, not on every later foreground.
      expect(props.onError).toHaveBeenCalledTimes(1);
    });

    it('tells the learner on return that backgrounding discarded a live recording', async () => {
      const { props } = await renderRecorder();
      await startRecording();

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errBackgroundDiscarded'));
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('says nothing on return when the background found no take to discard', async () => {
      const { props } = await renderRecorder();

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
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
      expect(appStateSubscriptionRemove).toHaveBeenCalledTimes(1);
      expect(reduceMotionSubscriptionRemove).toHaveBeenCalledTimes(1);
    });

    it('ignores a late reduce-motion read and removes its listener after unmount', async () => {
      const reduceMotion = deferred<boolean>();
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(reduceMotion.promise);
      const { view } = await renderRecorder();

      await view.unmount();
      await act(async () => {
        reduceMotion.resolve(true);
        await flushMicrotasks();
      });

      expect(reduceMotionSubscriptionRemove).toHaveBeenCalledTimes(1);
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

      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      expect(File).not.toHaveBeenCalled();
    });

    it('hides the pulse ring when reduce motion is enabled', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
      await renderRecorder();
      await startRecording();

      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(pulseRingCount()).toBe(0);
    });

    it('animates until the reduce-motion preference is actually known', async () => {
      // The preference read can outlive the first recording; motion is the
      // default so the meter and pulse are not suppressed on a false negative.
      jest
        .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
        .mockReturnValue(new Promise(() => undefined));
      await renderRecorder();
      await startRecording();

      expect(pulseRingCount()).toBe(1);
      expect(screen.queryByText(t('recorder.listening'))).toBeNull();
    });

    it('follows a live reduce-motion preference change while recording', async () => {
      const addListener = jest.mocked(AccessibilityInfo.addEventListener);
      // React Native's own animation machinery also listens for this event;
      // only the subscription opened by mounting the recorder is of interest.
      addListener.mockClear();
      await renderRecorder();
      const [event, handler] = addListener.mock.calls[0];
      await startRecording();
      expect(pulseRingCount()).toBe(1);

      expect(event).toBe('reduceMotionChanged');
      await act(async () => {
        (handler as unknown as (enabled: boolean) => void)(true);
        await flushMicrotasks();
      });

      expect(pulseRingCount()).toBe(0);
      expect(screen.getByText(t('recorder.listening'))).toBeTruthy();
    });

    it('clears the permission banner once a retried start is granted', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValueOnce({
        granted: false,
        canAskAgain: false,
      });
      await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy());
      expect(screen.getByText(t('recorder.openSettings'))).toBeTruthy();

      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: true });
      await startRecording();

      expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();
      expect(screen.queryByText(t('recorder.openSettings'))).toBeNull();
    });

    it('keeps a finalized browser blob take when the tapped stop rejects', async () => {
      const blobUri = 'blob:https://app.example/recordings/answer.webm';
      mockRecorder.stop.mockImplementation(async () => {
        // The 2:00 auto-stop finalized the blob before the tap reached native.
        mockRecorder.uri = blobUri;
        mockRecorder.isRecording = false;
        throw new Error('recorder already stopped');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      // Blob URIs carry no file metadata; the native file API must never see
      // one, and its absence must not be read as a lost recording.
      asMock(File).mockClear();
      asMock(File).mockImplementation(() => {
        throw new Error('unsupported URI');
      });

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
      expect(File).not.toHaveBeenCalled();
    });

    it('discards a rejected stop when the recording file cannot be inspected', async () => {
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = RECORDING_URI;
        mockRecorder.isRecording = false;
        throw new Error('recorder already stopped');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      asMock(File).mockImplementation(() => {
        throw new Error('cache unavailable');
      });

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed')));

      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('does not adopt a leftover recorder URI before recording was ever observed', async () => {
      const { view, props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      // The native recorder never reports isRecording, so the URI left behind
      // by the discarded take must not be adopted as the new one.
      mockRecorderState = {
        isRecording: false,
        durationMillis: 4_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('keeps an adopted auto-stop take when the recorder reports a later URI', async () => {
      const laterUri = 'file:///recordings/late-native.m4a';
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = { ...mockRecorderState, isRecording: true, durationMillis: 3_000 };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        isRecording: false,
        durationMillis: 30_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();
      expect(screen.getByText(recordedStatusText('0:30'))).toBeTruthy();

      // The phase already left 'recording': a later native URI belongs to no
      // take the learner made and must not silently replace the saved one.
      mockRecorder.uri = laterUri;
      mockRecorderState = {
        isRecording: false,
        durationMillis: 90_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByText(recordedStatusText('0:30'))).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        { questionId: QUESTION_ID, requestId: REQUEST_ID },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('does not adopt a native URI while lifecycle cleanup is still in flight', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await stop.promise;
        mockRecorder.uri = RECORDING_URI;
      });
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, isRecording: true, durationMillis: 3_000 };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      for (const handler of appStateHandlers) handler('background');
      await flushAct();

      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        isRecording: false,
        durationMillis: 9_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      // The take is already being torn down; adopting it here would resurrect
      // a recording the lifecycle just decided to discard.
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();

      await act(async () => {
        stop.resolve();
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('re-records after a tapped stop even when the device clock is unsynced', async () => {
      // The grace window guards native auto-stops only. With a clock still at
      // the epoch, a null auto-stop timestamp must not read as "just now".
      jest.useFakeTimers({ now: 500 });
      asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      expect(mockRecorder.record).toHaveBeenCalledTimes(2);
    });

    it('releases the interaction lock through the latest callback on unmount', async () => {
      const first = jest.fn();
      const second = jest.fn();
      const { view, props } = await renderRecorder({ onInteractionLockChange: first });
      await startRecording();

      await view.rerender(<Recorder {...props} onInteractionLockChange={second} />);
      await flushAct();
      first.mockClear();
      second.mockClear();

      await view.unmount();

      expect(second).toHaveBeenCalledWith(false);
      expect(first).not.toHaveBeenCalled();
    });
  });

  describe('identity changes', () => {
    it('does not run lifecycle cleanup for the identity it was mounted with', async () => {
      await renderRecorder();

      // Cleanup always restores the recording audio mode; a fresh mount has
      // nothing to tear down, so none of it may run.
      expect(setAudioModeAsync).not.toHaveBeenCalled();
      expect(mockRecorder.stop).not.toHaveBeenCalled();
      expect(File).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])(
      'resets a permanently denied permission banner when the %s changes',
      async (_field, next) => {
        asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
          granted: false,
          canAskAgain: false,
        });
        const { view, props } = await renderRecorder();

        await fireEvent.press(screen.getByLabelText(START_LABEL));
        await waitFor(() => expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy());
        expect(screen.getByText(t('recorder.openSettings'))).toBeTruthy();

        await view.rerender(<Recorder {...props} {...next} />);
        await flushAct();

        expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();
        expect(screen.queryByText(t('recorder.openSettings'))).toBeNull();
        expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
      },
    );

    it('resets the permission banner when the question changes', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
      });
      const { view, props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy());

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
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
        const { view, props } = await renderIdentityRaceRecorder();
        const staleStart = invokePressHandler(view, START_LABEL);
        const nextError = jest.fn();
        const nextResult = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <IdentityLayoutHarness
            recorderProps={{
              ...props,
              ...next,
              onError: nextError,
              onResult: nextResult,
              onRecoveryUnresolved: nextRecovery,
            }}
            onRecorderLayout={() => permission.resolve({ granted: true })}
          />,
        );
        // The following sibling resolves after Recorder's identity layout
        // effect and before passive lifecycle cleanup can change the epoch.
        // The identity operands themselves must reject this old start.
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

    it('abandons an in-flight start when the identity changes during audio-mode setup', async () => {
      const recordingMode = deferred<void>();
      asMock(setAudioModeAsync).mockImplementation(async (options: { allowsRecording: boolean }) =>
        options.allowsRecording ? recordingMode.promise : undefined,
      );
      const { view, props } = await renderRecorder();
      const staleStart = invokePressHandler(view, START_LABEL);
      await waitFor(() =>
        expect(setAudioModeAsync).toHaveBeenCalledWith(
          expect.objectContaining({ allowsRecording: true }),
        ),
      );

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await act(async () => {
        recordingMode.resolve();
        await staleStart;
        await flushMicrotasks();
      });

      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(setAudioModeAsync).toHaveBeenLastCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('abandons and deletes an in-flight start when the identity changes during preparation', async () => {
      const preparation = deferred<void>();
      mockRecorder.prepareToRecordAsync.mockReturnValue(preparation.promise);
      const { view, props } = await renderRecorder();
      const staleStart = invokePressHandler(view, START_LABEL);
      await waitFor(() => expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1));

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      mockRecorder.uri = RECORDING_URI;
      await act(async () => {
        preparation.resolve();
        await staleStart;
        await flushMicrotasks();
      });

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith({
        allowsRecording: false,
        allowsBackgroundRecording: false,
        shouldPlayInBackground: false,
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])(
      'does not adopt or report an old stop with no URI after the %s changes',
      async (_field, next) => {
        const nativeStop = deferred<void>();
        const { view, props } = await renderIdentityRaceRecorder();
        await startRecording();
        mockRecorder.stop.mockImplementation(async () => nativeStop.promise);
        mockRecorderState.durationMillis = 5_000;
        const staleStop = invokePressHandler(view, STOP_LABEL);
        const nextError = jest.fn();
        const nextResult = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <IdentityLayoutHarness
            recorderProps={{
              ...props,
              ...next,
              onError: nextError,
              onResult: nextResult,
              onRecoveryUnresolved: nextRecovery,
            }}
            onRecorderLayout={() => nativeStop.resolve()}
          />,
        );
        await staleStop;
        await flushAct();

        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
        expect(props.onError).not.toHaveBeenCalled();
        expect(nextError).not.toHaveBeenCalled();
        expect(nextResult).not.toHaveBeenCalled();
        expect(nextRecovery).not.toHaveBeenCalled();
        expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
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
    it('renders the submit action with cancellable pressed feedback without submitting', async () => {
      await renderRecorder();
      await recordAndStop();
      const getSubmitButton = () => screen.getByRole('button', { name: SUBMIT_TEXT });

      expect(flattenedStyle(getSubmitButton())).toMatchObject({
        backgroundColor: colors.primary,
        borderRadius: radii.button,
        paddingVertical: spacing.md,
        alignItems: 'center',
      });

      await fireEvent(getSubmitButton(), 'responderGrant', responderEvent());
      expect(flattenedStyle(getSubmitButton())).toMatchObject({
        backgroundColor: colors.primaryDark,
        borderRadius: radii.button,
        paddingVertical: spacing.md,
        alignItems: 'center',
      });
      await fireEvent(getSubmitButton(), 'responderTerminate', responderEvent());
      await waitFor(() =>
        expect(flattenedStyle(getSubmitButton()).backgroundColor).toBe(colors.primary),
      );

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
    });

    it('uploads directly with a durable requestId and delivers the result', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await flushAct();

      expect(savePendingAssessment).toHaveBeenCalledWith({
        ownerId: OWNER_ID,
        endpoint: ENDPOINT,
        questionId: QUESTION_ID,
        requestId: REQUEST_ID,
        createdAt: expect.any(Number),
        stage: 'prepared',
      });
      expect(markPendingAssessmentStage).toHaveBeenCalledWith(REQUEST_ID, 'direct-posting');
      expect(apiRequestAudioUpload).toHaveBeenCalledWith('audio/mp4', OWNER_ID, {
        signal: expect.any(AbortSignal),
      });
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        { questionId: QUESTION_ID, requestId: REQUEST_ID },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(props.parseResult).toHaveBeenCalledWith({ ok: true });
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } });
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('resubmits the same requestId after a 503, honoring the Retry-After delay', async () => {
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 1))
        .mockResolvedValueOnce({ ok: true });
      const { props } = await renderRecorder();
      await recordAndStop();

      const submittedAt = Date.now();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }), {
        timeout: 4_000,
      });

      expect(Date.now() - submittedAt).toBeGreaterThanOrEqual(999);
      expect(apiUploadAudio).toHaveBeenCalledTimes(2);
      for (const call of asMock(apiUploadAudio).mock.calls) {
        expect(call[2]).toEqual({ questionId: QUESTION_ID, requestId: REQUEST_ID });
      }
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('falls back to recovery with the same requestId when 503 backpressure outlasts the retry budget', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(503, 'capacity busy', 1));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      // 1 initial attempt + 3 capacity retries, one second apart.
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1_000);
          await flushMicrotasks();
        });
      }
      await flushAct();

      expect(apiUploadAudio).toHaveBeenCalledTimes(4);
      for (const call of asMock(apiUploadAudio).mock.calls) {
        expect(call[2]).toEqual({ questionId: QUESTION_ID, requestId: REQUEST_ID });
      }
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('uses distinct request ids for sequential completed answers', async () => {
      asMock(Crypto.randomUUID)
        .mockReset()
        .mockReturnValueOnce(REQUEST_ID)
        .mockReturnValueOnce(OTHER_REQUEST_ID);
      asMock(apiUploadAudio)
        .mockResolvedValueOnce({ ok: 'first' })
        .mockResolvedValueOnce({ ok: 'second' });
      const { props } = await renderRecorder();

      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'first' } }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
      await flushAct();

      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'second' } }),
      );
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(OTHER_REQUEST_ID));

      expect(apiUploadAudio).toHaveBeenNthCalledWith(
        2,
        ENDPOINT,
        RECORDING_URI,
        { questionId: QUESTION_ID, requestId: OTHER_REQUEST_ID },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(Crypto.randomUUID).toHaveBeenCalledTimes(2);
      expect(asMock(clearPendingAssessment).mock.calls).toEqual([[REQUEST_ID], [OTHER_REQUEST_ID]]);
      expect(props.onResult).toHaveBeenCalledTimes(2);
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('serializes overlapping submit handlers and rejects a stale submit handler', async () => {
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      const submitHandler = compositePressablePropsForNode(
        screen.getByRole('button', { name: SUBMIT_TEXT }),
      ).onPress as () => unknown;
      asMock(loadPendingAssessment).mockClear();
      asMock(apiRequestAudioUpload).mockClear();
      asMock(apiUploadAudio).mockClear();

      await act(async () => {
        submitHandler();
        await flushMicrotasks();
      });
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      await act(async () => {
        submitHandler();
        await flushMicrotasks();
      });
      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
      expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledTimes(1));

      await act(async () => {
        submitHandler();
        await flushMicrotasks();
      });
      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
      expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(props.onResult).toHaveBeenCalledTimes(1);
    });

    it('submits the saved URI even when the native recorder clears its URI afterward', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      mockRecorder.uri = null;

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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
      'keeps the recording and reports when the durable %s stage transition is rejected',
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

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errInfoNotSavedNotUploaded')),
        );

        // Nothing was uploaded, so the recording stays armed for a retry.
        expect(apiUploadAudio).not.toHaveBeenCalled();
        expect(apiPostPresignedAudio).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      },
    );

    it('reuses the durable requestId of an existing pending record on retry', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errInterruptedSaved')),
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

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errCannotDisplay')),
      );

      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each(['returns false', 'rejects'] as const)(
      'keeps a contract-invalid successful submission locked when reconciliation persistence %s',
      async (failureMode) => {
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
        await recordAndStop();
        asMock(AudioModule.getRecordingPermissionsAsync).mockClear();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errAnswerSavedRetryInfo')),
        );

        expect(apiUploadAudio).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
        expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
          disabled: true,
        });

        // The Pressable is disabled, which blocks event dispatch entirely;
        // invoke the handler directly so the runtime re-entrancy guard itself
        // is proven, not just the UI lockout.
        await invokePressHandler(screen, START_LABEL);
        expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
        expect(apiUploadAudio).toHaveBeenCalledTimes(1);
        expect(clearPendingAssessment).not.toHaveBeenCalled();
      },
    );

    it.each(['returns false', 'rejects'] as const)(
      'suppresses a contract-invalid submission marker failure after the identity changes when it %s',
      async (failureMode) => {
        const marker = deferred<boolean>();
        asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
        const { view, props } = await renderRecorder({
          parseResult: () => {
            throw new ContractError();
          },
        });
        await recordAndStop();
        let staleSubmit: Promise<void> | null = null;
        await act(async () => {
          staleSubmit = invokeRolePressHandler(SUBMIT_TEXT);
          await flushMicrotasks();
        });
        await waitFor(() =>
          expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
        );
        const nextError = jest.fn();
        const nextResult = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <Recorder
            {...props}
            questionId={OTHER_QUESTION_ID}
            onError={nextError}
            onResult={nextResult}
            onRecoveryUnresolved={nextRecovery}
          />,
        );
        await act(async () => {
          if (failureMode === 'returns false') {
            marker.resolve(false);
          } else {
            marker.reject(new Error('old keychain failure'));
          }
          await staleSubmit;
          await flushMicrotasks();
        });

        expect(apiUploadAudio).toHaveBeenCalledTimes(1);
        expect(props.onError).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(nextError).not.toHaveBeenCalled();
        expect(nextResult).not.toHaveBeenCalled();
        expect(nextRecovery).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

    it('treats an unexpected parser failure as ambiguous instead of a known contract rejection', async () => {
      const parserFailure = new Error('unexpected parser defect');
      const { props } = await renderRecorder({
        parseResult: () => {
          throw parserFailure;
        },
      });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      // With no tombstone to reconcile, the ambiguous failure releases the
      // controls with an honest message instead of latching recovery.
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );

      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errInfoNotSavedNotUploaded')),
      );

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it.each([
      [400, t('recorder.errRejected')],
      [403, t('recorder.errRejected')],
      [404, t('recorder.errRejected')],
      [413, t('error.tooLarge')],
      [415, t('error.unsupportedFormat')],
      [422, t('error.cannotAssess')],
    ])(
      'returns to the recorded phase after a definite %i rejection',
      async (status, expectedMessage) => {
        asMock(apiUploadAudio).mockRejectedValue(
          new ApiError(status, `Request failed with status ${status}`),
        );
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(props.onError).toHaveBeenCalledWith(expectedMessage));

        await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
        expect(props.onResult).not.toHaveBeenCalled();
        expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      },
    );

    it('returns the take with the upgrade message when the version gate rejects it', async () => {
      asMock(apiUploadAudio).mockRejectedValue(
        new ApiError(426, 'Please update the app', undefined, {
          code: 'CLIENT_UPGRADE_REQUIRED',
        }),
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.upgradeRequired')));

      // The version gate rejects ahead of the idempotency claim, so there is
      // nothing to reconcile: no recovery poll, and the take waits for the
      // newer build instead of being deleted by an expired lease.
      expect(apiFetch).not.toHaveBeenCalled();
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it('keeps the take with a connection message when the upload grant never left', async () => {
      asMock(apiRequestAudioUpload).mockRejectedValue(new ApiError(0, 'connection interrupted'));
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.network')));

      // No assessment POST was ever issued, so nothing can have committed:
      // the handoff is forgotten and the take stays sendable instead of
      // spinning through a recovery that would silently delete it.
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([]);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('keeps the take when the direct-to-S3 upload dies before any assessment POST', async () => {
      asMock(apiRequestAudioUpload).mockResolvedValue({
        mode: 's3',
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields: { key: S3_AUDIO_KEY },
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      });
      asMock(apiPostPresignedAudio).mockRejectedValue(new ApiError(0, 'connection lost'));
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.network')));

      // The abandoned S3 object has no claim pointing at it, so the server's
      // own cleanup owns it; the two-minute answer is what must survive here.
      expect(apiFetch).not.toHaveBeenCalled();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(deletedRecordingUris()).toEqual([]);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('reports a local failure raised before the send with send-specific copy', async () => {
      asMock(resolveAudioFileDescriptor).mockRejectedValue(new Error('file inspection failed'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errNotSent')));

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('keeps controls locked when rejected retry metadata cannot be cleared', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(413, 'too large'));
      asMock(clearPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoClear')),
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      await advancePolls(5);
      await waitFor(() => expect(screen.getByRole('button', { name: RERECORD_TEXT })).toBeTruthy());
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone'));
      const recordCallsBeforeRetry = mockRecorder.record.mock.calls.length;

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoClear')),
      );

      expect(mockRecorder.record).toHaveBeenCalledTimes(recordCallsBeforeRetry);
      expect(deletedRecordingUris()).not.toContain(RECORDING_URI);
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('shows the rate-limit copy on a 429 rejection', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(429, 'Request failed with status 429'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.tooMany')));
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it('routes a 429 rejection with its wait line to onRateLimited when provided', async () => {
      asMock(apiUploadAudio).mockRejectedValue(
        new ApiError(429, 'Request failed with status 429', 7 * 60 * 60, {
          code: 'DAILY_LIMIT',
        }),
      );
      const onRateLimited = jest.fn();
      const { props } = await renderRecorder({ onRateLimited });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(onRateLimited).toHaveBeenCalledWith(
          `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`,
        ),
      );

      // Inline handling replaces the alert path; the take stays resubmittable.
      expect(props.onError).not.toHaveBeenCalled();
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it('keeps non-429 rejections on onError even when onRateLimited is provided', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(413, 'too large'));
      const onRateLimited = jest.fn();
      const { props } = await renderRecorder({ onRateLimited });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.tooLarge')));
      expect(onRateLimited).not.toHaveBeenCalled();
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errResultSafeRetryInfo')),
      );

      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('disables controls and guards presses while an upload is in flight', async () => {
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { view, props } = await renderRecorder();
      await recordAndStop();
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
          disabled: true,
        }),
      );
      expect(compositePressableProps(view, START_LABEL).accessibilityState).toEqual({
        disabled: true,
      });
      // Both the status line and the wait spinner carry the uploading label.
      expect(screen.getAllByLabelText(t('recorder.a11yUploading'))).toHaveLength(2);

      // Disabled Pressables block dispatch, so invoke the handler directly to
      // prove the runtime re-entrancy guard, not only the UI lockout.
      await invokePressHandler(screen, START_LABEL);
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: false,
      });
    });

    it('uses the latest parser and result callback when a same-identity upload completes', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { view, props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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
      ['rejected S3 stage', 's3', false],
      ['accepted S3 stage', 's3', true],
      ['rejected direct stage', 'direct', false],
      ['accepted direct stage', 'direct', true],
    ] as const)(
      'stops a stale submission after its %s transition resolves',
      async (_case, mode, transitioned) => {
        const stage = deferred<boolean>();
        asMock(markPendingAssessmentStage).mockReturnValue(stage.promise);
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
        const { view, props } = await renderRecorder();
        await recordAndStop();
        const nextError = jest.fn();
        const nextResult = jest.fn();
        const nextRecovery = jest.fn();

        await act(async () => {
          void invokeRolePressHandler(SUBMIT_TEXT);
          await flushMicrotasks();
        });
        await waitFor(() => expect(markPendingAssessmentStage).toHaveBeenCalledTimes(1));
        expect(apiPostPresignedAudio).not.toHaveBeenCalled();
        expect(apiUploadAudio).not.toHaveBeenCalled();

        await view.rerender(
          <Recorder
            {...props}
            ownerId={OTHER_OWNER_ID}
            onError={nextError}
            onResult={nextResult}
            onRecoveryUnresolved={nextRecovery}
          />,
        );
        await flushAct();
        await act(async () => {
          stage.resolve(transitioned);
          await flushMicrotasks();
        });

        expect(props.onError).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(nextError).not.toHaveBeenCalled();
        expect(nextResult).not.toHaveBeenCalled();
        expect(nextRecovery).not.toHaveBeenCalled();
        expect(apiPostPresignedAudio).not.toHaveBeenCalled();
        expect(apiUploadAudio).not.toHaveBeenCalled();
      },
    );

    it('does not start the paid S3 request when backgrounding finishes the object upload', async () => {
      const s3Upload = deferred<void>();
      asMock(apiRequestAudioUpload).mockResolvedValue({
        mode: 's3',
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields: { key: S3_AUDIO_KEY },
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      });
      asMock(apiPostPresignedAudio).mockReturnValue(s3Upload.promise);
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1));
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      await act(async () => {
        s3Upload.resolve();
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalledWith(ENDPOINT, expect.anything());
    });

    it.each([
      ['a contract-invalid result', 'contract', true],
      ['a failed result marker', 'valid', false],
      ['a valid marked result', 'valid', true],
    ] as const)(
      'suppresses callbacks when %s resolves after the app becomes inactive',
      async (_case, resultKind, markerValue) => {
        const marker = deferred<boolean>();
        asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
        const { props } = await renderRecorder(
          resultKind === 'contract'
            ? {
                parseResult: () => {
                  throw new ContractError();
                },
              }
            : {},
        );
        await recordAndStop();

        await act(async () => {
          void invokeRolePressHandler(SUBMIT_TEXT);
          await flushMicrotasks();
        });
        await waitFor(() =>
          expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
        );
        Object.defineProperty(AppState, 'currentState', {
          configurable: true,
          writable: true,
          value: 'background',
        });

        await act(async () => {
          marker.resolve(markerValue);
          await flushMicrotasks();
        });

        expect(props.onError).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
      },
    );

    it.each([
      ['owner', { ownerId: OTHER_OWNER_ID }],
      ['endpoint', { endpoint: '/diagnostic/answer' as const }],
      ['question', { questionId: OTHER_QUESTION_ID }],
    ])(
      'aborts an in-flight upload and suppresses its result when the %s changes',
      async (_field, next) => {
        const upload = deferred<{ score: number }>();
        asMock(apiUploadAudio).mockReturnValue(upload.promise);
        const { view, props } = await renderIdentityRaceRecorder();
        await recordAndStop();
        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
        const signal = asMock(apiUploadAudio).mock.calls[0][3].signal as AbortSignal;
        const nextParse = jest.fn((data: unknown) => ({ current: data }));
        const nextResult = jest.fn();
        const nextError = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <IdentityLayoutHarness
            recorderProps={{
              ...props,
              ...next,
              parseResult: nextParse,
              onResult: nextResult,
              onError: nextError,
              onRecoveryUnresolved: nextRecovery,
            }}
            onRecorderLayout={() => upload.resolve({ score: 95 })}
          />,
        );
        // Resolve after Recorder's identity layout effect but before passive
        // cleanup aborts the controller. Identity checks must reject the old
        // result independently of the lifecycle epoch and abort signal.
        await flushAct();
        expect(signal.aborted).toBe(true);

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

    it('keeps a newer upload controller attached when an aborted old upload settles', async () => {
      const oldUpload = deferred<{ score: number }>();
      const currentUpload = deferred<{ score: number }>();
      asMock(apiUploadAudio)
        .mockReturnValueOnce(oldUpload.promise)
        .mockReturnValueOnce(currentUpload.promise);
      asMock(Crypto.randomUUID)
        .mockReset()
        .mockReturnValueOnce(REQUEST_ID)
        .mockReturnValueOnce(OTHER_REQUEST_ID);
      const { view, props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      const oldSignal = asMock(apiUploadAudio).mock.calls[0][3].signal as AbortSignal;
      const nextResult = jest.fn();
      const nextError = jest.fn();

      await view.rerender(
        <Recorder
          {...props}
          questionId={OTHER_QUESTION_ID}
          onResult={nextResult}
          onError={nextError}
        />,
      );
      await flushAct();
      expect(oldSignal.aborted).toBe(true);
      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());

      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(2));
      const currentSignal = asMock(apiUploadAudio).mock.calls[1][3].signal as AbortSignal;
      expect(currentSignal.aborted).toBe(false);

      // This transport deliberately ignores the first abort. Its late finally
      // must compare controller identity instead of detaching the newer one.
      await act(async () => {
        oldUpload.resolve({ score: 1 });
        await flushMicrotasks();
      });
      expect(props.onResult).not.toHaveBeenCalled();
      expect(nextResult).not.toHaveBeenCalled();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      const currentAppStateHandler = appStateHandlers.at(-1);
      if (!currentAppStateHandler) throw new Error('AppState handler not installed');
      await act(async () => {
        currentAppStateHandler('background');
        await flushMicrotasks();
      });
      expect(currentSignal.aborted).toBe(true);

      await act(async () => {
        currentUpload.resolve({ score: 99 });
        await flushMicrotasks();
      });
      expect(props.onResult).not.toHaveBeenCalled();
      expect(nextResult).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(nextError).not.toHaveBeenCalled();
    });

    it('aborts and cleans up an in-flight upload when the app backgrounds', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
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

    it('hands an upload stranded by an inactive dip to recovery on the next foreground', async () => {
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord());
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      // Control Center, a call banner, or Siri: 'inactive' never stops an
      // upload, so no lifecycle cleanup runs and no epoch is bumped.
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'inactive',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('inactive');
        await flushMicrotasks();
      });
      await act(async () => {
        upload.resolve({ score: 91 });
        await flushMicrotasks();
      });

      // The result cannot be delivered while the app is away, so the phase
      // moves on to recovery instead of spinning behind a dead Cancel button
      // that no foreground would ever release.
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(screen.queryByRole('button', { name: CANCEL_TEXT })).toBeNull();

      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 91 },
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 91 } }));
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, { timeoutMs: 5000 });
    });

    it('refuses to record or cancel while a stranded upload hands off to recovery', async () => {
      // A submission whose result arrives after the app leaves the foreground
      // detaches its controller and parks the phase in recovery. The wait UI
      // is still on screen, so both guarded controls must stay inert.
      const upload = deferred<{ score: number }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      const cancelOnPress = compositePressablePropsForNode(
        screen.getByRole('button', { name: CANCEL_TEXT }),
      ).onPress as () => unknown;
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        upload.resolve({ score: 91 });
        await flushMicrotasks();
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();

      // Disabled Pressables block dispatch, so invoke the handler directly to
      // prove the runtime guard rather than only the UI lockout.
      await invokePressHandler(screen, START_LABEL);
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);

      // The Cancel control leaves with the uploading phase, and the handler
      // captured while it was on screen stays inert.
      expect(screen.queryByRole('button', { name: CANCEL_TEXT })).toBeNull();
      await act(async () => {
        cancelOnPress();
        await flushMicrotasks();
      });

      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('ignores a second re-record press while the first is still resolving permission', async () => {
      const { view } = await renderRecorder();
      await recordAndStop();
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReset();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);

      let first!: Promise<void>;
      let second!: Promise<void>;
      await act(() => {
        first = invokeRolePressHandler(RERECORD_TEXT);
        second = invokeRolePressHandler(RERECORD_TEXT);
      });
      expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);

      await act(async () => {
        permission.resolve({ granted: true });
        await Promise.all([first, second]);
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(2);
      expect(mockRecorder.record).toHaveBeenCalledTimes(2);
      expect(view).toBeTruthy();
    });

    it('stops resubmitting after exactly three capacity retries', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(503, 'capacity busy', 1));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1_000);
          await flushMicrotasks();
        });
      }
      await flushAct();
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );

      expect(apiUploadAudio).toHaveBeenCalledTimes(4);
    });

    it('waits out the full server-specified Retry-After before a capacity retry', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 6))
        .mockResolvedValueOnce({ ok: true });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await act(async () => {
        await flushMicrotasks();
      });
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(5_999);
        await flushMicrotasks();
      });
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(1);
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(apiUploadAudio).toHaveBeenCalledTimes(2);
    });

    it('does not repeat the saved-take haptic when a rejected upload returns the take', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(413, 'too large'));
      const { props } = await renderRecorder();
      await recordAndStop();
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.tooLarge')));

      // Returning to 'recorded' from 'uploading' is not a newly saved take.
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    });

    it('announces nothing when the recorder settles back to idle', async () => {
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      const { props } = await renderRecorder();
      announce.mockClear();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(announce).toHaveBeenLastCalledWith(t('recorder.a11yUploading'));
      expect(announce).not.toHaveBeenCalledWith(t('recorder.a11yRecovering'));
    });

    it('keeps the durable request id after clearing an unrelated prepared handoff', async () => {
      asMock(Crypto.randomUUID)
        .mockReset()
        .mockReturnValueOnce(REQUEST_ID)
        .mockReturnValue(OTHER_REQUEST_ID);
      const strandedHandoff = pendingRecord({
        requestId: OTHER_REQUEST_ID,
        stage: 'prepared',
      });
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(strandedHandoff)
        .mockResolvedValueOnce(strandedHandoff)
        .mockResolvedValue(null);

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(OTHER_REQUEST_ID));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      expect(apiUploadAudio).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      // Clearing someone else's handoff must not throw away this submission's
      // own retry-stable id: the retry keeps the identity it already minted.
      expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
      expect(savePendingAssessment).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: REQUEST_ID }),
      );
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        { questionId: QUESTION_ID, requestId: REQUEST_ID },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
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
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
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
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('does not let a delayed recovery read overtake a recording start before permission resolves', async () => {
      const pending = deferred<PendingAssessment | null>();
      const permission = deferred<{ granted: boolean }>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();

      const start = invokePressHandler(view, START_LABEL);
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
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
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
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('recovers the latest route identity from the current foreground listener', async () => {
      const { view, props } = await renderRecorder();
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });

      await view.rerender(
        <Recorder {...props} endpoint="/diagnostic/answer" questionId={OTHER_QUESTION_ID} />,
      );
      await flushAct();

      asMock(loadPendingAssessment).mockClear();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({
          endpoint: '/diagnostic/answer',
          questionId: OTHER_QUESTION_ID,
          requestId: OTHER_REQUEST_ID,
        }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'diagnostic',
        questionId: OTHER_QUESTION_ID,
        response: { score: 98 },
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });

      const currentAppStateHandler = appStateHandlers.at(-1);
      if (!currentAppStateHandler) throw new Error('AppState handler not installed');
      await act(async () => {
        currentAppStateHandler('active');
        await flushMicrotasks();
      });

      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 98 } }));
      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${OTHER_REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
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

    it('delivers a completed native-practice recovery only with its isolated context', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ endpoint: '/practice/attempt/native' }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice-native',
        questionId: QUESTION_ID,
        response: { mode: 'native', understood: true },
      });
      const { props } = await renderRecorder({ endpoint: '/practice/attempt/native' });

      expect(props.parseResult).toHaveBeenCalledWith({ mode: 'native', understood: true });
      expect(props.onResult).toHaveBeenCalledWith({
        parsed: { mode: 'native', understood: true },
      });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    });

    it('restores a saved native endpoint before polling it with the English parser', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ endpoint: '/practice/attempt/native' }),
      );
      const onRecoveryEndpointMismatch = jest.fn(() => true);

      const { props } = await renderRecorder({ onRecoveryEndpointMismatch });

      expect(onRecoveryEndpointMismatch).toHaveBeenCalledWith('/practice/attempt/native');
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each([
      [
        'a saved native endpoint when initially rendered in English',
        'english',
        'native',
        '/practice/attempt/native',
        'practice-native',
        { mode: 'native', understood: true },
      ],
      [
        'a saved English endpoint when initially rendered in native mode',
        'native',
        'english',
        '/practice/attempt',
        'practice',
        { mode: 'english', score: 88 },
      ],
    ] as const)(
      'changes mode, remounts, and recovers %s with only its matching parser',
      async (_case, initialMode, savedMode, savedEndpoint, context, response) => {
        const firstStorageRead = deferred<PendingAssessment | null>();
        const savedPending = pendingRecord({ endpoint: savedEndpoint });
        asMock(loadPendingAssessment)
          .mockReturnValueOnce(firstStorageRead.promise)
          .mockResolvedValue(savedPending);
        asMock(apiFetch).mockResolvedValue({
          status: 'completed',
          context,
          questionId: QUESTION_ID,
          response,
        });
        const parseEnglish = jest.fn((data: unknown): HarnessResult => ({
          parser: 'english',
          response: data,
        }));
        const parseNative = jest.fn((data: unknown): HarnessResult => ({
          parser: 'native',
          response: data,
        }));
        const onModeChange = jest.fn();
        const onResult = jest.fn();
        const onError = jest.fn();
        const onRecoveryUnresolved = jest.fn();

        await render(
          <RecoveryModeHarness
            initialMode={initialMode}
            parseEnglish={parseEnglish}
            parseNative={parseNative}
            onModeChange={onModeChange}
            onResult={onResult}
            onError={onError}
            onRecoveryUnresolved={onRecoveryUnresolved}
          />,
        );
        await flushAct();

        expect(screen.getByTestId('recovery-harness-mode').props.children).toBe(initialMode);
        expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
        expect(apiFetch).not.toHaveBeenCalled();

        await act(async () => {
          firstStorageRead.resolve(savedPending);
          await flushMicrotasks();
        });

        await waitFor(() =>
          expect(screen.getByTestId('recovery-harness-mode').props.children).toBe(savedMode),
        );
        await waitFor(() => expect(onResult).toHaveBeenCalledTimes(1));

        const matchingParser = savedMode === 'native' ? parseNative : parseEnglish;
        const wrongParser = savedMode === 'native' ? parseEnglish : parseNative;
        expect(onModeChange).toHaveBeenCalledTimes(1);
        expect(onModeChange).toHaveBeenCalledWith(savedMode);
        // The key change removes the first Recorder's listener and mounts a
        // second instance, which re-reads storage before making the sole poll.
        expect(appStateSubscriptionRemove).toHaveBeenCalledTimes(1);
        expect(appStateHandlers).toHaveLength(2);
        expect(loadPendingAssessment).toHaveBeenCalledTimes(2);
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
          timeoutMs: 5000,
        });
        expect(asMock(apiFetch).mock.invocationCallOrder[0]).toBeGreaterThan(
          appStateSubscriptionRemove.mock.invocationCallOrder[0],
        );
        expect(matchingParser).toHaveBeenCalledTimes(1);
        expect(matchingParser).toHaveBeenCalledWith(response);
        expect(wrongParser).not.toHaveBeenCalled();
        expect(onResult).toHaveBeenCalledWith({ parser: savedMode, response });
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
        expect(clearPendingAssessment).toHaveBeenCalledTimes(1);
        expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
        expect(onError).not.toHaveBeenCalled();
        expect(onRecoveryUnresolved).not.toHaveBeenCalled();
      },
    );

    it('keeps the existing reconciliation path when a screen cannot restore the saved endpoint', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ endpoint: '/practice/attempt/native' }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice-native',
        questionId: QUESTION_ID,
        response: { mode: 'native', understood: true },
      });
      const onRecoveryEndpointMismatch = jest.fn(() => false);

      const { props } = await renderRecorder({ onRecoveryEndpointMismatch });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errInterruptedSaved')),
      );
      expect(onRecoveryEndpointMismatch).toHaveBeenCalledWith('/practice/attempt/native');
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
    });

    it('rejects an English-practice replay for a native-practice handoff', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ endpoint: '/practice/attempt/native' }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { mode: 'native', understood: true },
      });
      const { props } = await renderRecorder({ endpoint: '/practice/attempt/native' });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRecoveryMismatch')),
      );
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
    });

    it.each(['returns false', 'rejects'] as const)(
      'keeps a completed recovery for another route locked when reconciliation persistence %s',
      async (failureMode) => {
        asMock(loadPendingAssessment).mockResolvedValue(
          pendingRecord({ questionId: OTHER_QUESTION_ID }),
        );
        asMock(apiFetch).mockResolvedValue({
          status: 'completed',
          context: 'practice',
          questionId: OTHER_QUESTION_ID,
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
        asMock(AudioModule.getRecordingPermissionsAsync).mockClear();

        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate')),
        );

        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
        expect(apiRequestAudioUpload).not.toHaveBeenCalled();
        expect(apiUploadAudio).not.toHaveBeenCalled();
        expect(props.parseResult).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
        expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
          disabled: true,
        });

        // Disabled Pressables block dispatch, so invoke the handler directly
        // to prove the runtime re-entrancy guard, not only the UI lockout.
        await invokePressHandler(screen, START_LABEL);
        expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(clearPendingAssessment).not.toHaveBeenCalled();
      },
    );

    it.each(['returns false', 'rejects'] as const)(
      'suppresses an old-route reconciliation marker failure after the identity changes when it %s',
      async (failureMode) => {
        const marker = deferred<boolean>();
        asMock(loadPendingAssessment)
          .mockResolvedValueOnce(pendingRecord({ questionId: OTHER_QUESTION_ID }))
          .mockResolvedValue(null);
        asMock(apiFetch).mockResolvedValue({
          status: 'completed',
          context: 'practice',
          questionId: OTHER_QUESTION_ID,
          response: { score: 99 },
        });
        asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
        const { view, props } = await renderRecorder();
        await waitFor(() =>
          expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
        );
        const nextError = jest.fn();
        const nextResult = jest.fn();
        const nextRecovery = jest.fn();

        await view.rerender(
          <Recorder
            {...props}
            questionId={OTHER_QUESTION_ID}
            onError={nextError}
            onResult={nextResult}
            onRecoveryUnresolved={nextRecovery}
          />,
        );
        await act(async () => {
          if (failureMode === 'returns false') {
            marker.resolve(false);
          } else {
            marker.reject(new Error('old keychain failure'));
          }
          await flushMicrotasks();
        });

        expect(props.onError).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(nextError).not.toHaveBeenCalled();
        expect(nextResult).not.toHaveBeenCalled();
        expect(nextRecovery).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

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

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errResultSafeRetryInfo'));
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

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate'));
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

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate'));
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

    it('releases the global recovery lease after normal completion', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 91 },
        })
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 92 },
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
      const view = await render(<Recorder key="first" {...sharedProps} onResult={firstResult} />);
      await flushAct();
      await waitFor(() => expect(firstResult).toHaveBeenCalledWith({ parsed: { score: 91 } }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
      await flushAct();

      await view.rerender(
        <>
          <Recorder key="first" {...sharedProps} onResult={firstResult} />
          <Recorder key="second" {...sharedProps} onResult={secondResult} />
        </>,
      );
      await flushAct();

      await waitFor(() => expect(secondResult).toHaveBeenCalledWith({ parsed: { score: 92 } }));
      expect(loadPendingAssessment).toHaveBeenCalledTimes(2);
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    it('does not let a non-owner cleanup release another recorder recovery lease', async () => {
      const status = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(status.promise);
      const firstResult = jest.fn();
      const secondResult = jest.fn();
      const thirdResult = jest.fn();
      const sharedProps = {
        ownerId: OWNER_ID,
        questionId: QUESTION_ID,
        endpoint: ENDPOINT,
        parseResult: (data: unknown) => ({ parsed: data }),
        onError: jest.fn(),
        onRecoveryUnresolved: jest.fn(),
      };
      const view = await render(<Recorder key="first" {...sharedProps} onResult={firstResult} />);
      await flushAct();
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      asMock(loadPendingAssessment).mockClear();

      await view.rerender(
        <>
          <Recorder key="first" {...sharedProps} onResult={firstResult} />
          <Recorder key="second" {...sharedProps} onResult={secondResult} />
        </>,
      );
      await flushAct();
      expect(loadPendingAssessment).not.toHaveBeenCalled();

      await view.rerender(<Recorder key="first" {...sharedProps} onResult={firstResult} />);
      await flushAct();
      await view.rerender(
        <>
          <Recorder key="first" {...sharedProps} onResult={firstResult} />
          <Recorder key="third" {...sharedProps} onResult={thirdResult} />
        </>,
      );
      await flushAct();

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(secondResult).not.toHaveBeenCalled();
      expect(thirdResult).not.toHaveBeenCalled();

      await act(async () => {
        status.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 93 },
        });
        await flushMicrotasks();
      });
      await waitFor(() => expect(firstResult).toHaveBeenCalledWith({ parsed: { score: 93 } }));
    });

    it('blocks a later recorder before storage access once another recorder owns recovery', async () => {
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
      const view = await render(<Recorder key="first" {...sharedProps} onResult={firstResult} />);
      await flushAct();
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      asMock(loadPendingAssessment).mockClear();

      await view.rerender(
        <>
          <Recorder key="first" {...sharedProps} onResult={firstResult} />
          <Recorder key="second" {...sharedProps} onResult={secondResult} />
        </>,
      );
      await flushAct();

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(secondResult).not.toHaveBeenCalled();

      await act(async () => {
        status.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 93 },
        });
        await flushMicrotasks();
      });
      await waitFor(() => expect(firstResult).toHaveBeenCalledWith({ parsed: { score: 93 } }));
      expect(secondResult).not.toHaveBeenCalled();
    });

    it('does not let an invalidated same-identity recovery overtake its replacement', async () => {
      const oldStatus = deferred<unknown>();
      const currentStatus = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockReturnValueOnce(oldStatus.promise)
        .mockReturnValueOnce(currentStatus.promise);
      const { props } = await renderRecorder();
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

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

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));

      await act(async () => {
        oldStatus.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 1 },
        });
        await flushMicrotasks();
      });
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();

      await act(async () => {
        currentStatus.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 99 },
        });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 99 } }));
      expect(props.parseResult).toHaveBeenCalledTimes(1);
      expect(props.parseResult).not.toHaveBeenCalledWith({ score: 1 });
      expect(props.onResult).toHaveBeenCalledTimes(1);
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

    it('keeps a second recorder latched in recovery when another instance takes the lease mid-read', async () => {
      const followerRead = deferred<PendingAssessment | null>();
      const status = deferred<unknown>();
      const ownerError = jest.fn();
      const followerError = jest.fn();
      const ownerResult = jest.fn();
      const followerResult = jest.fn();
      const sharedProps = {
        ownerId: OWNER_ID,
        questionId: QUESTION_ID,
        endpoint: ENDPOINT,
        parseResult: (data: unknown) => ({ parsed: data }),
        onRecoveryUnresolved: jest.fn(),
      };
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null) // first recorder mounts
        .mockResolvedValueOnce(null) // second recorder mounts
        .mockResolvedValueOnce(null) // the second recorder's submit
        .mockReturnValueOnce(followerRead.promise) // its post-failure recovery
        .mockResolvedValue(pendingRecord()); // the first recorder's recovery
      asMock(apiFetch).mockReturnValue(status.promise);
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(0, 'connection interrupted'));

      await render(
        <>
          <Recorder key="owner" {...sharedProps} onError={ownerError} onResult={ownerResult} />
          <Recorder
            key="follower"
            {...sharedProps}
            onError={followerError}
            onResult={followerResult}
          />
        </>,
      );
      await flushAct();
      expect(appStateHandlers).toHaveLength(2);
      expect(apiFetch).not.toHaveBeenCalled();

      // The second recorder submits; its ambiguous transport failure drops it
      // into recovery, and its own storage read is left in flight.
      const followerMic = () => screen.getAllByLabelText(RECORD_BUTTON_LABEL)[1];
      await fireEvent.press(followerMic());
      await waitFor(() => expect(screen.getAllByLabelText(STOP_LABEL)).toHaveLength(1));
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(followerMic());
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getAllByText(RECOVERING_TEXT)).toHaveLength(1));
      expect(loadPendingAssessment).toHaveBeenCalledTimes(4);

      // The first recorder claims the global lease during that window.
      await act(async () => {
        appStateHandlers[0]('active');
        await flushMicrotasks();
      });
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      expect(screen.getAllByText(RECOVERING_TEXT)).toHaveLength(2);

      await act(async () => {
        followerRead.resolve(null);
        await flushMicrotasks();
      });

      // The missing tombstone belongs to the lease holder. Releasing the second
      // recorder's controls on that evidence would unlock a screen whose
      // durable submission another instance is still reconciling.
      expect(followerError).not.toHaveBeenCalled();
      expect(ownerError).not.toHaveBeenCalled();
      expect(screen.getAllByText(RECOVERING_TEXT)).toHaveLength(2);
      expect(screen.queryByText(IDLE_TEXT)).toBeNull();
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(followerResult).not.toHaveBeenCalled();
      expect(ownerResult).not.toHaveBeenCalled();
    });

    it('returns the surviving take for review when a conflicting claim was abandoned', async () => {
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
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(409, 'question mismatch'))
        .mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      await advancePolls(7);
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errAlreadyAnswered')),
      );

      // The claim was abandoned, not accepted: the local take is the learner's
      // only copy, so it stays on screen for a deliberate resend.
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
      expect(deletedRecordingUris()).not.toContain(RECORDING_URI);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
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

    it('restores a live recording after clearing an abandoned prepared handoff', async () => {
      // A submission that finds a different pending record hands over to
      // recovery before uploading anything; the abandoned record never left
      // the 'prepared' stage, so clearing it returns the fresh take.
      const abandonedHandoff = pendingRecord({ requestId: OTHER_REQUEST_ID, stage: 'prepared' });
      asMock(loadPendingAssessment).mockResolvedValueOnce(null).mockResolvedValue(abandonedHandoff);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(OTHER_REQUEST_ID));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).not.toContain(RECORDING_URI);
      expect(screen.getByLabelText(t('recorder.a11ySaved'))).toBeTruthy();
      expect(screen.getByRole('button', { name: RERECORD_TEXT })).toBeTruthy();
    });

    it('stops the recovery lease and asks for an upgrade when the version gate closes', async () => {
      const onRateLimited = jest.fn();
      asMock(apiFetch).mockRejectedValue(
        new ApiError(426, 'Please update the app', undefined, {
          code: 'CLIENT_UPGRADE_REQUIRED',
        }),
      );
      const { props } = await submitLiveRecordingIntoRecovery(pendingRecord(), { onRateLimited });

      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.upgradeRequired')));

      // The gate rejects before any claim, so polling it out for five minutes
      // would only end by deleting a recording the server never accepted.
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(onRateLimited).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toEqual([]);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it.each([
      ['an invalid response', null, t('recorder.errBadRecoveryResponse')],
      [
        'inconsistent context',
        {
          status: 'completed',
          context: 'diagnostic',
          questionId: QUESTION_ID,
          response: { score: 1 },
        },
        t('recorder.errRecoveryMismatch'),
      ],
      [
        'an unsupported terminal status',
        { status: 'pending', context: 'practice', questionId: QUESTION_ID },
        t('recorder.errRecoveryMismatch'),
      ],
    ] as const)(
      'discards a retained live recording after recovery receives %s',
      async (_case, response, expectedMessage) => {
        asMock(apiFetch).mockResolvedValue(response);
        const { props } = await submitLiveRecordingIntoRecovery();

        await waitFor(() => expect(props.onError).toHaveBeenCalledWith(expectedMessage));

        expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(props.onResult).not.toHaveBeenCalled();
        expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

    it('discards a retained live recording after confirmed direct-post absence', async () => {
      jest.useFakeTimers();
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'not submitted'));
      const { props } = await submitLiveRecordingIntoRecovery();

      await advancePolls(5);
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadUnconfirmed')),
      );

      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('discards a retained live recording when an S3 replay response is contract-invalid', async () => {
      jest.useFakeTimers();
      const startedAt = new Date('2030-01-01T00:00:00Z');
      jest.setSystemTime(startedAt);
      const uploadFields = {
        key: S3_AUDIO_KEY,
        Policy: 'signed-policy',
        'Content-Type': 'audio/mp4',
      };
      const retainedHandoff = pendingRecord({
        stage: 's3-granted',
        audioKey: S3_AUDIO_KEY,
      });
      asMock(apiRequestAudioUpload).mockResolvedValue({
        mode: 's3',
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields,
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      });
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(retainedHandoff);
      let assessmentPostCount = 0;
      asMock(apiFetch).mockImplementation(async (path: string) => {
        if (path === ENDPOINT) {
          assessmentPostCount += 1;
          if (assessmentPostCount === 1) {
            throw new ApiError(0, 'assessment response disconnected');
          }
          return { unsupported: true };
        }
        throw new ApiError(404, 'not submitted');
      });
      const { props } = await renderRecorder({
        parseResult: () => {
          throw new ContractError();
        },
      });
      await recordAndStop();
      asMock(File).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(
          asMock(apiFetch).mock.calls.filter(([path]) => path === `/assessments/${REQUEST_ID}`),
        ).toHaveLength(1),
      );

      expect(markPendingAssessmentStage).toHaveBeenCalledWith(
        REQUEST_ID,
        's3-granted',
        S3_AUDIO_KEY,
      );
      expect(apiPostPresignedAudio).toHaveBeenCalledWith(
        'https://s3.example.com/upload',
        uploadFields,
        RECORDING_URI,
        'audio/mp4',
        25 * 1024 * 1024,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      await advancePolls(1);
      expect(
        asMock(apiFetch).mock.calls.filter(([path]) => path === `/assessments/${REQUEST_ID}`),
      ).toHaveLength(2);
      // Jump the wall clock so the third consecutive absence also satisfies
      // the ten-second anti-race window, without manufacturing extra 404s.
      jest.setSystemTime(startedAt.getTime() + 10_000);
      await advancePolls(1);

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errCannotDisplay')),
      );
      const recoveryStatusCalls = asMock(apiFetch).mock.calls.filter(
        ([path]) => path === `/assessments/${REQUEST_ID}`,
      );
      const assessmentPosts = asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT);
      expect(recoveryStatusCalls).toHaveLength(3);
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
            signal: expect.any(AbortSignal),
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
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('discards a retained live recording after its recovery record expires', async () => {
      jest.useFakeTimers();
      const now = Date.now();
      asMock(apiFetch).mockRejectedValue(new ApiError(503, 'temporarily unavailable'));
      const { props } = await submitLiveRecordingIntoRecovery(
        pendingRecord({ createdAt: now - 25 * 60 * 60_000 - 1 }),
      );

      await advancePolls(1);
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRecoveryExpired')),
      );

      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('clears a prepared handoff without polling because no network request started', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'prepared' }));
      const { props } = await renderRecorder();

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();

      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 94 },
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 94 } }));
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
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoClear'));
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

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errResultSafeRetryInfo'));
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
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errCannotDisplay'));
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
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errInterruptedSaved'));
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

    it('ends the recovery lease with the wait line when the replay is rate limited', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockRejectedValueOnce(
        new ApiError(429, 'daily limit', 7 * 60 * 60, { code: 'DAILY_LIMIT' }),
      );
      const { props } = await renderRecorder();

      await advancePolls(5);

      // The limiter rejects ahead of the idempotency claim, so nothing was
      // charged: finish with the same wait line the submit path shows instead
      // of polling absent reads until the lease expires.
      expect(apiFetch).toHaveBeenNthCalledWith(7, ENDPOINT, {
        method: 'POST',
        body: {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          audioKey: S3_AUDIO_KEY,
        },
        timeoutMs: AUDIO_TIMEOUT_MS,
      });
      expect(props.onError).toHaveBeenCalledWith(
        `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`,
      );
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(Crypto.randomUUID).not.toHaveBeenCalled();

      // Resolved: no further polling for the rest of the five-minute lease.
      await advancePolls(3);
      expect(apiFetch).toHaveBeenCalledTimes(7);
    });

    it('routes a rate-limited replay to the inline wait line and keeps the take', async () => {
      jest.useFakeTimers();
      const onRateLimited = jest.fn();
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(429, 'too many', 30));
      const { props } = await submitLiveRecordingIntoRecovery(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
        { onRateLimited },
      );

      await advancePolls(5);

      await waitFor(() =>
        expect(onRateLimited).toHaveBeenCalledWith(
          `${t('error.tooMany')} ${t('wait.seconds', { count: 30 })}`,
        ),
      );
      expect(props.onError).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([]);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
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

    it('resolves terminally when a 409 resubmission is followed by another absent status read', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(409, 'question mismatch'))
        // The row a genuine in-flight claim would have produced never appears:
        // the next read is still absent, so the conflict is terminal.
        .mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      const { props } = await renderRecorder();

      await advancePolls(8);

      expect(apiFetch).toHaveBeenCalledTimes(8);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errAlreadyAnswered'));
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);

      // Resolved: no further polling until the five-minute lease.
      await advancePolls(3);
      expect(apiFetch).toHaveBeenCalledTimes(8);
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
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone'));
        expect(apiFetch).toHaveBeenCalledTimes(7);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
        expect(Crypto.randomUUID).not.toHaveBeenCalled();
      },
    );

    describe('upload-gone re-upload', () => {
      const REUPLOAD_KEY = `audio-uploads/${OWNER_ID}/550e8400-e29b-41d4-a716-446655440007.m4a`;
      const S3_GRANT = {
        mode: 's3' as const,
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields: { key: S3_AUDIO_KEY },
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      };
      const REUPLOAD_GRANT = {
        ...S3_GRANT,
        uploadFields: { key: REUPLOAD_KEY },
        audioKey: REUPLOAD_KEY,
      };

      /** Six absent status reads open the resubmission window (3 strikes, 10 s). */
      function mockAbsentStatusReads() {
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
      }

      function mockTombstoneAfterSubmit() {
        asMock(loadPendingAssessment)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null)
          .mockResolvedValue(pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }));
      }

      function assessmentPostCalls() {
        return asMock(apiFetch).mock.calls.filter(
          ([path, init]) => path === ENDPOINT && (init as { method?: string }).method === 'POST',
        );
      }

      it('re-uploads the surviving recording with the same requestId under a fresh key and completes', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockResolvedValueOnce(REUPLOAD_GRANT);
        mockTombstoneAfterSubmit();
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        asMock(apiFetch)
          .mockRejectedValueOnce(new ApiError(400, 'audio upload not found or expired'))
          .mockRejectedValueOnce(new ApiError(404, 'not submitted'))
          .mockResolvedValueOnce({ ok: true });
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        await advancePolls(7);
        await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

        // One fresh grant + one fresh S3 POST for the same logical submission.
        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(2);
        expect(markPendingAssessmentStage).toHaveBeenCalledWith(
          REQUEST_ID,
          's3-granted',
          REUPLOAD_KEY,
        );
        expect(apiPostPresignedAudio).toHaveBeenLastCalledWith(
          REUPLOAD_GRANT.uploadUrl,
          REUPLOAD_GRANT.uploadFields,
          RECORDING_URI,
          'audio/mp4',
          REUPLOAD_GRANT.maxBytes,
          {},
        );
        // Initial POST + resubmission with the dead key + resubmission with the
        // fresh key — all carrying the SAME durable requestId.
        const posts = assessmentPostCalls();
        expect(posts).toHaveLength(3);
        const postBodies = posts.map(
          ([, init]) =>
            (init as { body: { questionId: string; requestId: string; audioKey: string } }).body,
        );
        for (const body of postBodies) {
          expect(body.requestId).toBe(REQUEST_ID);
          expect(body.questionId).toBe(QUESTION_ID);
        }
        expect(postBodies[1].audioKey).toBe(S3_AUDIO_KEY);
        expect(postBodies[2].audioKey).toBe(REUPLOAD_KEY);
        expect(props.onError).not.toHaveBeenCalled();
        expect(deletedRecordingUris()).toContain(RECORDING_URI);
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      });

      it('stays bounded and turns terminal when the resubmission with the fresh key is also rejected', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockResolvedValueOnce(REUPLOAD_GRANT);
        mockTombstoneAfterSubmit();
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        asMock(apiFetch)
          .mockRejectedValueOnce(new ApiError(400, 'audio upload not found or expired'))
          .mockRejectedValueOnce(new ApiError(404, 'not submitted'))
          .mockRejectedValueOnce(new ApiError(400, 'audio upload not found or expired'));
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        await advancePolls(7);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        // Exactly one automatic re-upload per recovery cycle: no third grant,
        // no further POSTs, no endless polling after the terminal decision.
        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(2);
        expect(apiFetch).toHaveBeenCalledTimes(10);
        expect(assessmentPostCalls()).toHaveLength(3);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(props.onResult).not.toHaveBeenCalled();
        await advancePolls(3);
        expect(apiFetch).toHaveBeenCalledTimes(10);
      });

      it('keeps the terminal behavior when the local recording no longer exists', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
        mockTombstoneAfterSubmit();
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        asMock(apiFetch).mockRejectedValueOnce(
          new ApiError(400, 'audio upload not found or expired'),
        );
        const { props } = await renderRecorder();
        await recordAndStop();
        // The OS evicted the cached recording: there is nothing to re-upload.
        asMock(File).mockImplementation((uri: string) => ({
          uri,
          exists: false,
          delete: jest.fn(),
          arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
        }));

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        await advancePolls(6);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
        expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledTimes(8);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(props.onResult).not.toHaveBeenCalled();
        expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      });

      /** Drives one submission into recovery and up to the dead-key rejection. */
      async function submitIntoDeadKeyRejection(rejection: ApiError) {
        mockTombstoneAfterSubmit();
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        asMock(apiFetch).mockRejectedValueOnce(rejection);
        const rendered = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        return rendered;
      }

      it('re-uploads when the dead-key rejection names the validation failure', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockResolvedValueOnce(REUPLOAD_GRANT);
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'VALIDATION_FAILED',
          }),
        );
        asMock(apiFetch)
          .mockRejectedValueOnce(new ApiError(404, 'not submitted'))
          .mockResolvedValueOnce({ ok: true });

        await advancePolls(7);
        await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(2);
        expect(markPendingAssessmentStage).toHaveBeenCalledWith(
          REQUEST_ID,
          's3-granted',
          REUPLOAD_KEY,
        );
        const postBodies = assessmentPostCalls().map(
          ([, init]) => (init as { body: { audioKey: string; requestId: string } }).body,
        );
        expect(postBodies.map((body) => body.audioKey)).toEqual([
          S3_AUDIO_KEY,
          S3_AUDIO_KEY,
          REUPLOAD_KEY,
        ]);
        expect(props.onError).not.toHaveBeenCalled();
      });

      it('does not re-upload when the rejection names an unrelated failure', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'diagnostic already complete', undefined, { code: 'DIAGNOSTIC_DONE' }),
        );

        await advancePolls(6);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        // Only the "upload gone" shape earns a fresh object; a genuine domain
        // rejection must not spend another paid grant and S3 POST.
        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
        expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentStage).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledTimes(8);
        expect(assessmentPostCalls()).toHaveLength(2);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(props.onResult).not.toHaveBeenCalled();
      });

      it('does not re-upload when the fresh grant is not an S3 upload form', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockResolvedValueOnce({ mode: 'direct' });
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired'),
        );

        await advancePolls(6);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        // A direct-upload grant carries no object key, so there is nothing the
        // resubmission loop could point at: the cycle ends terminally instead.
        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(2);
        expect(markPendingAssessmentStage).toHaveBeenCalledTimes(1);
        expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledTimes(8);
        expect(assessmentPostCalls()).toHaveLength(2);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      });

      it('abandons the re-upload when the fresh key cannot be persisted', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockResolvedValueOnce(REUPLOAD_GRANT);
        asMock(markPendingAssessmentStage).mockResolvedValueOnce(true).mockResolvedValue(false);
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired'),
        );

        await advancePolls(6);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        // The durable handoff still names the dead key, so uploading a fresh
        // object would strand it: no second S3 POST, no further resubmission.
        expect(markPendingAssessmentStage).toHaveBeenNthCalledWith(
          2,
          REQUEST_ID,
          's3-granted',
          REUPLOAD_KEY,
        );
        expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledTimes(8);
        expect(assessmentPostCalls()).toHaveLength(2);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(props.onResult).not.toHaveBeenCalled();
      });

      it('turns terminal when the fresh upload grant cannot be obtained', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockRejectedValueOnce(new ApiError(0, 'grant request disconnected'));
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired'),
        );

        await advancePolls(6);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(2);
        expect(markPendingAssessmentStage).toHaveBeenCalledTimes(1);
        expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
        expect(apiFetch).toHaveBeenCalledTimes(8);
        expect(assessmentPostCalls()).toHaveLength(2);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      });

      it('does not spend a second object upload once the recorder is no longer current', async () => {
        jest.useFakeTimers();
        const stage = deferred<boolean>();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockResolvedValueOnce(REUPLOAD_GRANT);
        asMock(markPendingAssessmentStage)
          .mockResolvedValueOnce(true)
          .mockReturnValue(stage.promise);
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired'),
        );

        await advancePolls(6);
        await waitFor(() => expect(markPendingAssessmentStage).toHaveBeenCalledTimes(2));
        Object.defineProperty(AppState, 'currentState', {
          configurable: true,
          writable: true,
          value: 'background',
        });
        await act(async () => {
          stage.resolve(true);
          await flushMicrotasks();
        });

        // The screen is gone; uploading the fresh object would bill an upload
        // nobody is waiting for and leave the durable key pointing at it.
        expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
        expect(props.onError).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      });
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

    it('includes the status poll scheduled exactly at the five-minute recovery deadline', async () => {
      const startedAt = new Date('2030-01-02T12:00:00Z');
      jest.useFakeTimers({ now: startedAt });
      asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ createdAt: startedAt.getTime() }),
      );
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
          response: { score: 90 },
        });
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      jest.setSystemTime(startedAt.getTime() + 5 * 60_000 - 2_000);
      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 90 } });
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
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRecoveryExpired'));
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

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUnavailable'));
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('escapes a terminally failed recovery via Try Again without a remount', async () => {
      // A SecureStore read failure parks the recorder in 'recovering' with no
      // polling loop running; the Try Again affordance re-runs the recovery
      // path instead of leaving the mic locked until a remount.
      asMock(loadPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUnavailable'));
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toMatchObject({
        disabled: true,
      });
      const tryAgain = screen.getByRole('button', { name: t('common.tryAgain') });

      // Storage recovers and a completed assessment is waiting: the retried
      // recovery runs the ordinary path to its durable result.
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 7 },
      });
      await fireEvent.press(tryAgain);

      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 7 } }));
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toMatchObject({
        disabled: false,
      });
    });

    it('keeps the Try Again affordance armed when the retried recovery fails again', async () => {
      asMock(loadPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();

      expect(screen.getByRole('button', { name: t('common.tryAgain') })).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));

      await waitFor(() =>
        expect(props.onError).toHaveBeenNthCalledWith(2, t('recorder.errRetryInfoUnavailable')),
      );
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(screen.getByRole('button', { name: t('common.tryAgain') })).toBeTruthy();
    });

    it('recovers through Try Again after the pending-record cleanup fails', async () => {
      // The tombstone belongs to another install's user; forgetting it is the
      // whole recovery. A clear failure must not latch the controls either.
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ ownerId: OTHER_OWNER_ID }));
      asMock(clearPendingAssessment).mockRejectedValueOnce(new Error('keychain unavailable'));
      const { props } = await renderRecorder();

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoClear')),
      );
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));

      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
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

    it('does not deliver a recovered result after its reconciliation marker resolves stale', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValueOnce(pendingRecord()).mockResolvedValue(null);
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 97 },
      });
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { view, props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );
      const nextResult = jest.fn();
      const nextError = jest.fn();
      const nextRecovery = jest.fn();

      await view.rerender(
        <Recorder
          {...props}
          questionId={OTHER_QUESTION_ID}
          onResult={nextResult}
          onError={nextError}
          onRecoveryUnresolved={nextRecovery}
        />,
      );
      await act(async () => {
        marker.resolve(true);
        await flushMicrotasks();
      });

      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(nextResult).not.toHaveBeenCalled();
      expect(nextError).not.toHaveBeenCalled();
      expect(nextRecovery).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
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
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadUnconfirmed'));
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
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: true,
      });

      // Presses are guarded while the component is still in the recovering
      // phase. The disabled Pressable blocks event dispatch, so invoke the
      // handler directly to prove the runtime guard itself.
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      await invokePressHandler(screen, START_LABEL);
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
    });

    it('keeps controls locked without error copy when the initial submission is rejected with 401', async () => {
      // A mid-submit 401 is not a definite rejection: the attempt may have
      // committed, so the recorder enters recovery and lets the session-expiry
      // flow unmount the screen rather than surfacing a misleading error.
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(401, 'Request failed with status 401'));
      // No tombstone at mount or at submit's pre-upload check; it exists by
      // the time recovery looks for it, so the 401 stops the poll silently.
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord({ stage: 'direct-posting' }));
      asMock(apiFetch).mockRejectedValue(new ApiError(401, 'Request failed with status 401'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));

      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: true,
      });
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
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errInterruptedSaved')),
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
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errBadRecoveryResponse')),
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
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRecoveryMismatch')),
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
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errCannotDisplay')),
      );
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });
  });

  describe('assessment wait redesign', () => {
    function abortRejectingUpload() {
      return (
        _endpoint: unknown,
        _uri: unknown,
        _fields: unknown,
        { signal }: { signal: AbortSignal },
      ) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new ApiError(0, 'aborted')), {
            once: true,
          });
        });
    }

    function abortRejectingPresignedPost() {
      return (
        _url: unknown,
        _fields: unknown,
        _uri: unknown,
        _type: unknown,
        _maxBytes: unknown,
        { signal }: { signal: AbortSignal },
      ) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new ApiError(0, 'aborted')), {
            once: true,
          });
        });
    }

    const S3_GRANT = {
      mode: 's3',
      uploadUrl: 'https://s3.example.com/upload',
      uploadFields: { key: S3_AUDIO_KEY },
      audioKey: S3_AUDIO_KEY,
      contentType: 'audio/mp4',
      expiresIn: 300,
      maxBytes: 25 * 1024 * 1024,
    };

    it('walks the staged wait copy with a live elapsed clock', async () => {
      jest.useFakeTimers();
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy());
      expect(screen.getByText(waitingForText('0:00'))).toBeTruthy();
      expect(screen.getByRole('button', { name: CANCEL_TEXT })).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(7_000);
        await flushMicrotasks();
      });
      expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy();
      expect(screen.getByText(waitingForText('0:07'))).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });
      expect(screen.getByText(t('recorder.stageListening'))).toBeTruthy();
      expect(screen.getByText(waitingForText('0:08'))).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(16_000);
        await flushMicrotasks();
      });
      expect(screen.getByText(t('recorder.stageListening'))).toBeTruthy();
      expect(screen.getByText(waitingForText('0:24'))).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });
      expect(screen.getByText(t('recorder.stageAlmostDone'))).toBeTruthy();
      expect(screen.getByText(waitingForText('0:25'))).toBeTruthy();

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(
        screen.queryByText(new RegExp(`^${t('recorder.waitingFor', { elapsed: '' })}`)),
      ).toBeNull();
    });

    it('clears the assessment wait interval after leaving the busy phase', async () => {
      const setWaitInterval = jest.spyOn(globalThis, 'setInterval');
      const clearWaitInterval = jest.spyOn(globalThis, 'clearInterval');
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      try {
        await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy());
        const waitIntervalIndex = setWaitInterval.mock.calls.findIndex(
          ([, delay]) => delay === 1_000,
        );
        expect(waitIntervalIndex).toBeGreaterThanOrEqual(0);
        const waitInterval = setWaitInterval.mock.results[waitIntervalIndex]?.value;

        await act(async () => {
          upload.resolve({ ok: true });
          await flushMicrotasks();
        });
        await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());

        expect(clearWaitInterval).toHaveBeenCalledWith(waitInterval);
      } finally {
        clearWaitInterval.mockRestore();
        setWaitInterval.mockRestore();
      }
    });

    it('shows the longer-than-usual note with elapsed time while recovering', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(new Promise(() => undefined));
      await renderRecorder();

      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      expect(screen.getByText(t('recorder.waitHint'))).toBeTruthy();
      expect(screen.getByText(waitingForText('0:00'))).toBeTruthy();
      // Recovery has no abortable upload: no Cancel action is offered.
      expect(screen.queryByRole('button', { name: CANCEL_TEXT })).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(65_000);
        await flushMicrotasks();
      });
      expect(screen.getByText(waitingForText('1:05'))).toBeTruthy();
    });

    it('cancel before the assessment POST returns the take for review and resubmission', async () => {
      asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
      asMock(apiPostPresignedAudio).mockImplementation(abortRejectingPresignedPost());
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1));

      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await waitFor(() => expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy());

      // Nothing was claimed server-side: the handoff is forgotten, the take
      // survives, and no recovery status polling starts.
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([]);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: CANCEL_TEXT })).toBeNull();

      // The same take submits again cleanly — exactly one assessment POST.
      asMock(apiPostPresignedAudio).mockResolvedValue(undefined);
      asMock(apiFetch).mockResolvedValue({ ok: true });
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(ENDPOINT, {
        method: 'POST',
        body: { questionId: QUESTION_ID, requestId: REQUEST_ID, audioKey: S3_AUDIO_KEY },
        signal: expect.any(AbortSignal),
        timeoutMs: AUDIO_TIMEOUT_MS,
      });
    });

    it('cancel after the assessment POST is in flight defers to recovery without re-posting', async () => {
      asMock(apiUploadAudio).mockImplementation(abortRejectingUpload());
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { ok: 'recovered' },
      });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'recovered' } }),
      );

      // The cancelled POST may have committed: the durable request is
      // resolved and the same audio is never submitted a second time.
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('honors a cancel instead of resubmitting once recovery confirms nothing landed', async () => {
      jest.useFakeTimers();
      asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }));
      asMock(apiFetch).mockImplementation((path: string, options: { signal?: AbortSignal }) =>
        path === ENDPOINT
          ? new Promise((_resolve, reject) => {
              options.signal?.addEventListener('abort', () => reject(new ApiError(0, 'aborted')), {
                once: true,
              });
            })
          : Promise.reject(new ApiError(404, 'not submitted')),
      );
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(ENDPOINT, expect.anything()));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());

      // A lone 404 still races the cancelled POST, so the cancel is only
      // honored once repeated absence has confirmed it.
      await advancePolls(1);
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      await advancePolls(4);

      // Confirmed absence proves the cancelled POST claimed nothing: the take
      // comes back for review instead of spending a capped assessment on an
      // answer the learner explicitly stopped.
      const assessmentPosts = asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT);
      expect(assessmentPosts).toHaveLength(1);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(deletedRecordingUris()).toEqual([]);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('locks into recovery when the cancelled handoff cannot be cleared', async () => {
      asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
      asMock(apiPostPresignedAudio).mockImplementation(abortRejectingPresignedPost());
      asMock(clearPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoClear')),
      );
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('cancel during the upload-grant request returns the take promptly for review', async () => {
      asMock(apiRequestAudioUpload).mockImplementation(
        (_type: unknown, _owner: unknown, { signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new ApiError(0, 'aborted')), {
              once: true,
            });
          }),
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1));

      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await waitFor(() => expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy());

      // The grant request is not the assessment POST: nothing was claimed
      // server-side, so the handoff is forgotten and the take survives.
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([]);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('cancel during the 503 capacity-retry wait defers to recovery without waiting it out', async () => {
      // A 30 s Retry-After would pin the old plain setTimeout; the abort-aware
      // wait must wake on cancel immediately (real timers prove promptness).
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 30))
        .mockReturnValue(new Promise(() => undefined));
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { ok: 'recovered' },
      });
      const { props } = await renderRecorder();
      await recordAndStop();

      const cancelledAt = Date.now();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'recovered' } }),
      );

      expect(Date.now() - cancelledAt).toBeLessThan(5_000);
      // The earlier POST may have committed: recovery resolves the durable
      // request and the same audio is never submitted a second time.
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
      });
    });

    it('releases a completed capacity-retry abort listener', async () => {
      jest.useFakeTimers();
      const addAbortListener = jest.spyOn(AbortSignal.prototype, 'addEventListener');
      const removeAbortListener = jest.spyOn(AbortSignal.prototype, 'removeEventListener');
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 1))
        .mockResolvedValueOnce({ ok: true });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(addAbortListener).toHaveBeenCalledWith('abort', expect.any(Function), { once: true });
      expect(removeAbortListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('ignores a captured Cancel invoked by the synchronous result callback', async () => {
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByRole('button', { name: CANCEL_TEXT })).toBeTruthy());
      const cancelOnPress = compositePressablePropsForNode(
        screen.getByRole('button', { name: CANCEL_TEXT }),
      ).onPress as () => unknown;
      const signal = asMock(apiUploadAudio).mock.calls[0][3].signal as AbortSignal;
      props.onResult.mockImplementation(() => cancelOnPress());

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(signal.aborted).toBe(false);
    });

    it('ignores a cancel press once the take is back in review', async () => {
      await renderRecorder();
      await recordAndStop();

      // No Cancel control exists outside an active upload; the runtime guard
      // also refuses stale invocations.
      expect(screen.queryByRole('button', { name: CANCEL_TEXT })).toBeNull();
    });
  });

  describe('pre-submit playback', () => {
    it('plays and pauses the saved take before submitting', async () => {
      await renderRecorder();
      await recordAndStop();

      expect(screen.queryByRole('button', { name: t('recorder.pauseLabel') })).toBeNull();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(createAudioPlayer).toHaveBeenCalledWith(RECORDING_URI);
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(1);
      expect(screen.getByText(t('recorder.pause'))).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: t('recorder.pauseLabel') }));
      expect(mockPreviewPlayer.pause).toHaveBeenCalledTimes(1);
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();

      // Resuming reuses the same native player instead of leaking a new one.
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(createAudioPlayer).toHaveBeenCalledTimes(1);
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(2);
    });

    it('keeps a captured Pause handler safe after submission releases the player', async () => {
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const pauseOnPress = compositePressablePropsForNode(
        screen.getByRole('button', { name: t('recorder.pauseLabel') }),
      ).onPress as () => unknown;

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1));

      await act(async () => {
        expect(() => pauseOnPress()).not.toThrow();
      });

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
    });

    it('keeps a captured Play handler inert after submission discards the take', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      const playOnPress = compositePressablePropsForNode(
        screen.getByRole('button', { name: t('recorder.playLabel') }),
      ).onPress as () => unknown;

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      asMock(createAudioPlayer).mockClear();

      await act(async () => {
        expect(() => playOnPress()).not.toThrow();
      });
      expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('rewinds and shows Play again when the take finishes', async () => {
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(mockPreviewPlayer.addListener).toHaveBeenCalledWith(
        'playbackStatusUpdate',
        expect.any(Function),
      );
      const onStatus = mockPreviewPlayer.addListener.mock.calls[0][1] as (status: {
        didJustFinish: boolean;
      }) => void;

      await act(async () => {
        onStatus({ didJustFinish: false });
      });
      expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
      expect(mockPreviewPlayer.seekTo).not.toHaveBeenCalled();

      await act(async () => {
        onStatus({ didJustFinish: true });
      });
      expect(mockPreviewPlayer.seekTo).toHaveBeenCalledWith(0);
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    });

    it('releases the preview player when the take is submitted', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const subscription = mockPreviewPlayer.addListener.mock.results[0].value as {
        remove: jest.Mock;
      };

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(subscription.remove).toHaveBeenCalledTimes(1);
      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
    });

    it('releases the preview player when re-recording', async () => {
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
    });

    it('releases the preview player on unmount', async () => {
      const { view } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const subscription = mockPreviewPlayer.addListener.mock.results[0].value as {
        remove: jest.Mock;
      };

      await view.unmount();
      await flushAct();

      expect(subscription.remove).toHaveBeenCalledTimes(1);
      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
    });

    it('treats native player release failures as best effort', async () => {
      mockPreviewPlayer.remove.mockImplementation(() => {
        throw new Error('already released');
      });
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
    });

    it('offers Play again for the next take after the preview was released', async () => {
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(screen.getByText(t('recorder.pause'))).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      // The released player cannot be paused, so the control must not still
      // advertise a playback that is no longer running.
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();
      expect(screen.getByRole('button', { name: t('recorder.playLabel') })).toBeTruthy();
      expect(mockPreviewPlayer.pause).not.toHaveBeenCalled();
    });

    it('ignores a finished-playback event from a released preview player', async () => {
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const stalePlayer = mockPreviewPlayer;
      const staleStatus = stalePlayer.addListener.mock.calls[0][1] as (status: {
        didJustFinish: boolean;
      }) => void;

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      mockPreviewPlayer = makeMockPreviewPlayer();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(1);
      expect(screen.getByText(t('recorder.pause'))).toBeTruthy();

      await act(async () => {
        staleStatus({ didJustFinish: true });
        await flushMicrotasks();
      });

      // The old take finishing must not stop the control that belongs to the
      // take now playing.
      expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
      expect(stalePlayer.seekTo).toHaveBeenCalledWith(0);
      expect(mockPreviewPlayer.seekTo).not.toHaveBeenCalled();
    });

    it('reports a playback failure without blocking submission', async () => {
      asMock(createAudioPlayer).mockImplementation(() => {
        throw new Error('native player unavailable');
      });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
    });
  });

  describe('live level meter', () => {
    // The meter is decorative and hidden from screen readers, so every query
    // must opt into hidden elements.
    const hidden = { includeHiddenElements: true } as const;

    it('drives the meter segments from the recorder metering value', async () => {
      const { view, props } = await renderRecorder();
      expect(screen.queryByTestId('live-level-meter', hidden)).toBeNull();
      await startRecording();

      const meter = screen.getByTestId('live-level-meter', hidden);
      expect(meter.props).toMatchObject({
        accessible: false,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      });
      // The decorative meter never reaches assistive technology.
      expect(screen.queryByTestId('live-level-meter')).toBeNull();
      // No metering reading yet: all six segments stay idle.
      expect(screen.getAllByTestId('level-segment-idle', hidden)).toHaveLength(6);

      mockRecorderState = { ...mockRecorderState, isRecording: true, metering: -30 };
      await view.rerender(<Recorder {...props} />);
      expect(screen.getAllByTestId('level-segment-active', hidden)).toHaveLength(3);
      expect(screen.getAllByTestId('level-segment-idle', hidden)).toHaveLength(3);

      mockRecorderState = { ...mockRecorderState, metering: 0 };
      await view.rerender(<Recorder {...props} />);
      expect(screen.getAllByTestId('level-segment-active', hidden)).toHaveLength(6);
      expect(screen.queryAllByTestId('level-segment-idle', hidden)).toHaveLength(0);

      mockRecorderState = { ...mockRecorderState, metering: -160 };
      await view.rerender(<Recorder {...props} />);
      expect(screen.queryAllByTestId('level-segment-active', hidden)).toHaveLength(0);
      expect(screen.getAllByTestId('level-segment-idle', hidden)).toHaveLength(6);
    });

    it.each([
      ['positive infinity', Number.POSITIVE_INFINITY],
      ['negative infinity', Number.NEGATIVE_INFINITY],
      ['not a number', Number.NaN],
    ])('treats a %s metering reading as silence', async (_case, metering) => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = { ...mockRecorderState, isRecording: true, metering };
      await view.rerender(<Recorder {...props} />);

      expect(screen.queryAllByTestId('level-segment-active', hidden)).toHaveLength(0);
      expect(screen.getAllByTestId('level-segment-idle', hidden)).toHaveLength(6);
    });

    it('hides the meter once the recording stops', async () => {
      await renderRecorder();
      await recordAndStop();

      expect(screen.queryByTestId('live-level-meter', hidden)).toBeNull();
    });

    it('replaces the meter with a static listening note under reduce motion', async () => {
      asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
      await renderRecorder();
      await startRecording();

      expect(screen.getByText(t('recorder.listening'))).toBeTruthy();
      expect(screen.queryByTestId('live-level-meter', hidden)).toBeNull();
    });
  });

  describe('remaining-time announcements and haptics', () => {
    it('announces the remaining time at sixty, ninety, and one hundred ten seconds', async () => {
      jest.useFakeTimers();
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      await renderRecorder();
      await startRecording();
      announce.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(59_999);
      });
      expect(announce).not.toHaveBeenCalledWith(t('recorder.oneMinuteLeft'));

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(announce).toHaveBeenCalledWith(t('recorder.oneMinuteLeft'));
      expect(announce).not.toHaveBeenCalledWith(t('recorder.thirtySecondsLeft'));

      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(announce).toHaveBeenCalledWith(t('recorder.thirtySecondsLeft'));
      expect(announce).not.toHaveBeenCalledWith(t('recorder.tenSecondsLeft'));

      await act(async () => {
        jest.advanceTimersByTime(20_000);
      });
      expect(announce).toHaveBeenCalledWith(t('recorder.tenSecondsLeft'));
    });

    it('stops announcing remaining time once the recording ends', async () => {
      jest.useFakeTimers();
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      announce.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(120_000);
      });
      expect(announce).not.toHaveBeenCalledWith(t('recorder.oneMinuteLeft'));
      expect(announce).not.toHaveBeenCalledWith(t('recorder.thirtySecondsLeft'));
      expect(announce).not.toHaveBeenCalledWith(t('recorder.tenSecondsLeft'));
    });

    it('gives light haptic feedback on record start and on a saved stop', async () => {
      await renderRecorder();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();

      await startRecording();
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');

      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
      expect(Haptics.impactAsync).toHaveBeenLastCalledWith('light');
    });

    it('skips the stop haptic when lifecycle cleanup discards the recording', async () => {
      await renderRecorder();
      await startRecording();
      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);

      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByLabelText(START_LABEL)).toBeTruthy());

      expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    });

    it('keeps recording when the device has no haptics engine', async () => {
      asMock(Haptics.impactAsync).mockRejectedValue(new Error('no haptics engine'));
      await renderRecorder();
      await startRecording();

      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });
  });

  /**
   * Every await in the recovery and submission flows is followed by a
   * staleness check, because the screen can be blurred, backgrounded, retargeted
   * or unmounted while the promise is in flight. Each check is exercised by
   * parking exactly one await and moving exactly one piece of state, so a
   * missing guard shows up as work that should never have happened.
   */
  describe('staleness guards', () => {
    const S3_HANDOFF = pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY });

    /** Six absent status reads open the resubmission window (3 strikes, 10 s). */
    function mockAbsentStatusReads() {
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
    }

    it('does not recover on a foreground signal when initially mounted unfocused', async () => {
      mockScreenFocused = false;
      await renderRecorder();
      asMock(loadPendingAssessment).mockClear();

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('does not read retry storage while a recording start is still resolving', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view } = await renderRecorder();
      const start = invokePressHandler(view, START_LABEL);
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      asMock(loadPendingAssessment).mockClear();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      // A start already owns the operation lock; recovery must not race it.
      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();

      await act(async () => {
        permission.resolve({ granted: true });
        await start;
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
    });

    it('does not read retry storage while the app is backgrounded', async () => {
      backgroundApp();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      const { props } = await renderRecorder();

      // Reading the keychain while the device may be locked is exactly what
      // the foreground check exists to avoid.
      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('does not read retry storage on a foreground signal after the screen blurs', async () => {
      const { props } = await renderRecorder();
      await act(async () => {
        blurScreen();
        await flushMicrotasks();
      });
      asMock(loadPendingAssessment).mockClear();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('suppresses a retry-storage failure raised after the screen blurs', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      const { props } = await renderRecorder();

      await act(async () => {
        blurScreen();
        await flushMicrotasks();
      });
      await act(async () => {
        pending.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.queryByText(RECOVERING_TEXT)).toBeNull();
    });

    it('suppresses a retry-storage failure raised after the recorder unmounts', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      const { view, props } = await renderRecorder();

      await view.unmount();
      await act(async () => {
        pending.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
    });

    it('reports nothing to confirm only while the app is in the foreground', async () => {
      const recoveryRead = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(recoveryRead.promise);
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(0, 'connection interrupted'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());

      backgroundApp();
      await act(async () => {
        recoveryRead.resolve(null);
        await flushMicrotasks();
      });

      // The learner is not looking: releasing the controls with an error would
      // surface an alert against a screen that is no longer in front of them.
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it.each([
      [
        'another owner',
        pendingRecord({ ownerId: OTHER_OWNER_ID, endpoint: '/practice/attempt/native' }),
      ],
      [
        'another question',
        pendingRecord({ questionId: OTHER_QUESTION_ID, endpoint: '/practice/attempt/native' }),
      ],
    ])('never offers to restore a saved endpoint belonging to %s', async (_case, pending) => {
      asMock(loadPendingAssessment).mockResolvedValue(pending);
      asMock(apiFetch).mockReturnValue(new Promise(() => undefined));
      const onRecoveryEndpointMismatch = jest.fn(() => true);
      await renderRecorder({ onRecoveryEndpointMismatch });

      expect(onRecoveryEndpointMismatch).not.toHaveBeenCalled();
    });

    it('stops after the reconcile refresh callback navigates away', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'reconcile' }));
      const onRecoveryUnresolved = jest.fn(() => backgroundApp());
      await renderRecorder({ onRecoveryUnresolved });

      expect(onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('does not release a prepared handoff whose clear resolves after backgrounding', async () => {
      const cleared = deferred<void>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'prepared' }));
      asMock(clearPendingAssessment).mockReturnValue(cleared.promise);
      const { props } = await renderRecorder();
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();

      backgroundApp();
      await act(async () => {
        cleared.resolve();
        await flushMicrotasks();
      });

      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('suppresses a reconciliation-marker failure that lands after backgrounding', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue(null);
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('suppresses an unresolved-recovery refresh that lands after backgrounding', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue(null);
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.resolve(true);
        await flushMicrotasks();
      });

      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('stops when the refresh callback navigates away during an unresolved recovery', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue(null);
      const onError = jest.fn();
      const onRecoveryUnresolved = jest.fn(() => backgroundApp());
      await renderRecorder({ onError, onRecoveryUnresolved });

      expect(onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('stops when the parser navigates away while replaying an S3 resubmission', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(S3_HANDOFF);
      mockAbsentStatusReads();
      asMock(apiFetch).mockResolvedValueOnce({ score: 5 });
      const { props } = await renderRecorder({
        parseResult: () => {
          backgroundApp();
          throw new ContractError();
        },
      });

      await advancePolls(5);

      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
    });

    it('suppresses an other-route reconciliation refresh that lands after backgrounding', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { ok: 'other' },
      });
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.resolve(true);
        await flushMicrotasks();
      });

      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('stops when the refresh callback navigates away on an other-route replay', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { ok: 'other' },
      });
      const onError = jest.fn();
      const onRecoveryUnresolved = jest.fn(() => backgroundApp());
      await renderRecorder({ onError, onRecoveryUnresolved });

      expect(onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('suppresses a parse-failure marker rejection that lands after backgrounding', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { bad: true },
      });
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder({
        parseResult: () => {
          throw new ContractError();
        },
      });
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('suppresses a parse-failure refresh that lands after backgrounding', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { bad: true },
      });
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder({
        parseResult: () => {
          throw new ContractError();
        },
      });
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.resolve(true);
        await flushMicrotasks();
      });

      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('stops when the refresh callback navigates away after an unparseable replay', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { bad: true },
      });
      const onError = jest.fn();
      const onRecoveryUnresolved = jest.fn(() => backgroundApp());
      await renderRecorder({
        onError,
        onRecoveryUnresolved,
        parseResult: () => {
          throw new ContractError();
        },
      });

      expect(onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('stops when the parser navigates away before the result is marked', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 9 },
      });
      const { props } = await renderRecorder({
        parseResult: (data: unknown) => {
          backgroundApp();
          return { parsed: data };
        },
      });

      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('suppresses a result marker rejection that lands after backgrounding', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 9 },
      });
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('does not release a handoff for another user whose clear lands after backgrounding', async () => {
      const cleared = deferred<void>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ ownerId: OTHER_OWNER_ID }));
      asMock(clearPendingAssessment).mockReturnValue(cleared.promise);
      const { props } = await renderRecorder();
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();

      backgroundApp();
      await act(async () => {
        cleared.resolve();
        await flushMicrotasks();
      });

      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('does not resubmit when the absence-confirming status read fails after backgrounding', async () => {
      jest.useFakeTimers();
      const lastRead = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(S3_HANDOFF);
      for (let i = 0; i < 5; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockReturnValueOnce(lastRead.promise);
      const { props } = await renderRecorder();
      await advancePolls(5);
      expect(apiFetch).toHaveBeenCalledTimes(6);

      backgroundApp();
      await act(async () => {
        lastRead.reject(new ApiError(404, 'not submitted'));
        await flushMicrotasks();
      });
      await advancePolls(3);

      // That sixth absence is what opens the resubmission window; acting on it
      // for a screen the learner has left would re-post the attempt unseen.
      expect(apiFetch).toHaveBeenCalledTimes(6);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('stops polling when the app backgrounds during the poll interval', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'processing',
        context: 'practice',
        questionId: QUESTION_ID,
      });
      const { props } = await renderRecorder();
      expect(apiFetch).toHaveBeenCalledTimes(1);

      backgroundApp();
      await advancePolls(4);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('stops when an S3 resubmission response arrives after backgrounding', async () => {
      jest.useFakeTimers();
      const resubmission = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(S3_HANDOFF);
      mockAbsentStatusReads();
      asMock(apiFetch).mockReturnValueOnce(resubmission.promise);
      const { props } = await renderRecorder();
      await advancePolls(5);
      await waitFor(() =>
        expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(1),
      );

      backgroundApp();
      await act(async () => {
        resubmission.resolve({ score: 12 });
        await flushMicrotasks();
      });

      expect(props.parseResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('suppresses a resubmission marker rejection that lands after backgrounding', async () => {
      jest.useFakeTimers();
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(S3_HANDOFF);
      mockAbsentStatusReads();
      asMock(apiFetch).mockResolvedValueOnce({ score: 12 });
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await advancePolls(5);
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('does not deliver a resubmission result marked after backgrounding', async () => {
      jest.useFakeTimers();
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(S3_HANDOFF);
      mockAbsentStatusReads();
      asMock(apiFetch).mockResolvedValueOnce({ score: 12 });
      asMock(markPendingAssessmentForReconciliation).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await advancePolls(5);
      await waitFor(() =>
        expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID),
      );

      backgroundApp();
      await act(async () => {
        marker.resolve(true);
        await flushMicrotasks();
      });

      expect(props.onResult).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('stops when an S3 resubmission rejection arrives after backgrounding', async () => {
      jest.useFakeTimers();
      const resubmission = deferred<unknown>();
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
        .mockResolvedValue(S3_HANDOFF);
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
      mockAbsentStatusReads();
      asMock(apiFetch).mockReturnValueOnce(resubmission.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      await advancePolls(6);
      asMock(File).mockClear();

      backgroundApp();
      await act(async () => {
        resubmission.reject(new ApiError(400, 'audio upload not found or expired'));
        await flushMicrotasks();
      });

      // Nothing may be inspected or re-uploaded once the screen is gone: the
      // local-file probe is the first thing the dead-key branch would do.
      expect(File).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('stops when a re-upload finishes after backgrounding', async () => {
      jest.useFakeTimers();
      const objectUpload = deferred<void>();
      const grant = {
        mode: 's3' as const,
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields: { key: S3_AUDIO_KEY },
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      };
      asMock(apiRequestAudioUpload).mockResolvedValue(grant);
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(S3_HANDOFF);
      asMock(apiPostPresignedAudio)
        .mockResolvedValueOnce(undefined)
        .mockReturnValueOnce(objectUpload.promise);
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
      mockAbsentStatusReads();
      asMock(apiFetch).mockRejectedValueOnce(
        new ApiError(400, 'audio upload not found or expired'),
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      await advancePolls(6);
      await waitFor(() => expect(apiPostPresignedAudio).toHaveBeenCalledTimes(2));
      const readsBeforeBackground = asMock(apiFetch).mock.calls.length;

      backgroundApp();
      await act(async () => {
        objectUpload.resolve();
        await flushMicrotasks();
      });
      await advancePolls(2);

      // The fresh object landed, but nobody is waiting for its result.
      expect(asMock(apiFetch).mock.calls).toHaveLength(readsBeforeBackground);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('abandons a submission whose retry-storage read lands after backgrounding', async () => {
      const existing = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(existing.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(loadPendingAssessment).toHaveBeenCalledTimes(2));

      backgroundApp();
      await act(async () => {
        existing.resolve(null);
        await flushMicrotasks();
      });

      expect(savePendingAssessment).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('abandons a submission whose handoff is saved after backgrounding', async () => {
      const saved = deferred<void>();
      asMock(savePendingAssessment).mockReturnValue(saved.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(savePendingAssessment).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        saved.resolve();
        await flushMicrotasks();
      });

      expect(resolveAudioFileDescriptor).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('does not request an upload grant when descriptor resolution finishes after backgrounding', async () => {
      const descriptor = deferred<{ name: string; type: string }>();
      asMock(resolveAudioFileDescriptor).mockReturnValue(descriptor.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(resolveAudioFileDescriptor).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        descriptor.resolve({ name: 'audio.m4a', type: 'audio/mp4' });
        await flushMicrotasks();
      });

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('suppresses a handoff-save failure that lands after backgrounding', async () => {
      const saved = deferred<void>();
      asMock(savePendingAssessment).mockReturnValue(saved.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(savePendingAssessment).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        saved.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
    });

    it('abandons a submission whose upload grant lands after backgrounding', async () => {
      const grant = deferred<{ mode: string }>();
      asMock(apiRequestAudioUpload).mockReturnValue(grant.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        grant.resolve({ mode: 'direct' });
        await flushMicrotasks();
      });

      expect(markPendingAssessmentStage).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('abandons a capacity retry that wakes up after backgrounding', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(503, 'capacity busy', 1));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });

      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('does not capacity-retry a failure that only looks like the 503 contract', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio).mockRejectedValue({ status: 503, message: 'not an ApiError' });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );

      // The backpressure contract belongs to ApiError; a duck-typed lookalike
      // from another layer is an ambiguous failure, not a retry invitation.
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
    });

    it('suppresses a cancel whose abort rejection lands after backgrounding', async () => {
      const abortRejection = deferred<void>();
      asMock(apiRequestAudioUpload).mockImplementation(
        (_type: unknown, _owner: unknown, { signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener(
              'abort',
              () => {
                void abortRejection.promise.then(() => reject(new ApiError(0, 'aborted')));
              },
              { once: true },
            );
          }),
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));

      backgroundApp();
      await act(async () => {
        abortRejection.resolve();
        await flushMicrotasks();
      });

      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
    });

    it('suppresses a cancelled handoff clear that lands after backgrounding', async () => {
      const cleared = deferred<void>();
      asMock(apiRequestAudioUpload).mockImplementation(
        (_type: unknown, _owner: unknown, { signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new ApiError(0, 'aborted')), {
              once: true,
            });
          }),
      );
      asMock(clearPendingAssessment).mockReturnValue(cleared.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));

      backgroundApp();
      await act(async () => {
        cleared.resolve();
        await flushMicrotasks();
      });

      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('suppresses a definite rejection that lands after backgrounding', async () => {
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        upload.reject(new ApiError(413, 'too large'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
    });

    it('suppresses a rejected handoff clear that lands after backgrounding', async () => {
      const cleared = deferred<void>();
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(413, 'too large'));
      asMock(clearPendingAssessment).mockReturnValue(cleared.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));

      backgroundApp();
      await act(async () => {
        cleared.resolve();
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
    });

    it('abandons a start whose permission resolves after the app leaves the foreground', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view } = await renderRecorder();
      const start = invokePressHandler(view, START_LABEL);
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );

      backgroundApp();
      await act(async () => {
        permission.resolve({ granted: true });
        await start;
        await flushMicrotasks();
      });

      // Switching the device into recording mode for a screen the learner has
      // left would hold the microphone open behind their back.
      expect(setAudioModeAsync).not.toHaveBeenCalled();
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('abandons a start whose stale handoff clear lands after backgrounding', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new Error('unexpected transport defect'));
      const { view, props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );

      const cleared = deferred<void>();
      asMock(clearPendingAssessment).mockReturnValue(cleared.promise);
      asMock(setAudioModeAsync).mockClear();
      const start = invokePressHandler(view, START_LABEL);
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));

      backgroundApp();
      await act(async () => {
        cleared.resolve();
        await start;
        await flushMicrotasks();
      });

      expect(setAudioModeAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
    });

    it('abandons a stop whose native stop resolves after the app leaves the foreground', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await stop.promise;
        mockRecorder.uri = RECORDING_URI;
      });
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      const stopHandler = compositePressableProps(view, STOP_LABEL).onPress as () => Promise<void>;
      const pendingStop = stopHandler();

      backgroundApp();
      await act(async () => {
        stop.resolve();
        await pendingStop;
        await flushMicrotasks();
      });

      expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
      expect(props.onError).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
    });

    it('does not announce a phase change while the app is not in the foreground', async () => {
      const announce = jest.mocked(AccessibilityInfo.announceForAccessibility);
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, isRecording: true, durationMillis: 3_000 };
      await view.rerender(<Recorder {...props} />);
      await flushAct();
      announce.mockClear();

      backgroundApp();
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        isRecording: false,
        durationMillis: 30_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      // The native auto-stop still lands, but shouting it at a screen the
      // learner has left would talk over whatever they moved on to.
      expect(screen.getByText(recordedStatusText('0:30'))).toBeTruthy();
      expect(announce).not.toHaveBeenCalled();
    });

    it('does not request a paid upload grant for a re-upload that is no longer current', async () => {
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
        .mockResolvedValue(S3_HANDOFF);
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'connection interrupted'));
      mockAbsentStatusReads();
      asMock(apiFetch).mockRejectedValueOnce(
        new ApiError(400, 'audio upload not found or expired'),
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      // The app leaves the foreground exactly as the surviving take is probed:
      // the last synchronous step before the re-upload spends anything.
      asMock(File).mockImplementation((uri: string) => {
        backgroundApp();
        return {
          uri,
          exists: true,
          delete: jest.fn(),
          arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
        };
      });
      await advancePolls(6);

      expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('never resubmits a handoff that never reached the granted stage', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 'direct-posting', audioKey: S3_AUDIO_KEY }),
      );
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'not submitted'));
      const { props } = await renderRecorder();

      await advancePolls(5);
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadUnconfirmed')),
      );

      // A leftover key on a direct-post handoff is not evidence that an object
      // was ever uploaded; posting it would claim an attempt that never was.
      expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(0);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
    });

    it('does not probe for a local take when recovery has none', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(S3_HANDOFF);
      mockAbsentStatusReads();
      asMock(apiFetch).mockRejectedValueOnce(
        new ApiError(400, 'audio upload not found or expired'),
      );
      const { props } = await renderRecorder();
      asMock(File).mockClear();

      await advancePolls(5);
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')));

      // Recovery after a crash holds no local recording at all, so the file
      // probe must be short-circuited rather than handed a null URI.
      expect(File).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
    });

    it('keeps recording through an unrecognized app-state report', async () => {
      const { props } = await renderRecorder();
      await startRecording();

      await act(async () => {
        for (const handler of appStateHandlers) handler('unknown' as AppStateStatus);
        await flushMicrotasks();
      });

      // Only a real background or inactive transition ends a take; an
      // unrecognized report must not throw the recording away.
      expect(mockRecorder.stop).not.toHaveBeenCalled();
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(deletedRecordingUris()).toEqual([]);
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('reacts to a real identity change, not to every rebuild of its callbacks', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      const { view, props } = await renderRecorder();

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();
      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy());

      // A replacement native recorder rebuilds the lifecycle callbacks without
      // changing any identity, so the banner the learner is reading survives.
      mockRecorder = {
        prepareToRecordAsync: jest.fn(async () => undefined),
        record: jest.fn(),
        stop: jest.fn(async () => undefined),
        uri: null,
        isRecording: false,
      };
      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy();
      expect(screen.getByText(t('recorder.openSettings'))).toBeTruthy();
    });

    it('rebuilds its native-recorder callbacks when the audio module reports a new instance', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();
      const previousRecorder = mockRecorder;
      const replacement: MockRecorder = {
        prepareToRecordAsync: jest.fn(async () => undefined),
        record: jest.fn(),
        stop: jest.fn(async () => {
          replacement.uri = RECORDING_URI;
        }),
        uri: null,
        isRecording: false,
      };
      mockRecorder = replacement;
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      // The take in flight belongs to the abandoned instance, so the lifecycle
      // cleanup that owns it runs and returns the controls to idle.
      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());
      expect(previousRecorder.stop).toHaveBeenCalledTimes(1);

      // From here every native call must go to the instance the module now
      // reports; driving the abandoned one would silently record nothing.
      previousRecorder.stop.mockClear();
      await startRecording();
      // Only the listener the live effect installed; the mock keeps abandoned
      // ones around, and a stale listener would answer for the old instance.
      const currentAppStateHandler = appStateHandlers.at(-1);
      if (!currentAppStateHandler) throw new Error('AppState handler not installed');
      await act(async () => {
        currentAppStateHandler('background');
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());

      expect(replacement.record).toHaveBeenCalledTimes(1);
      expect(replacement.stop).toHaveBeenCalledTimes(1);
      expect(previousRecorder.stop).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
    });

    it('still performs the final status read when the clock moves during setup', async () => {
      jest.useFakeTimers();
      const startedAt = new Date('2030-01-02T12:00:00Z').getTime();
      jest.setSystemTime(startedAt);
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ createdAt: startedAt - 25 * 60 * 60_000 - 1 }),
      );
      asMock(apiFetch).mockRejectedValue(new ApiError(503, 'temporary failure'));
      // A real clock keeps ticking between stamping the deadline and testing
      // it; the first read is guaranteed by the flag, not by a frozen clock.
      let ticks = 0;
      const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => startedAt + ticks++);
      const { props } = await renderRecorder();
      nowSpy.mockRestore();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRecoveryExpired'));
    });
  });

  /**
   * Screens lock their answer-mode switcher while the recorder holds a take.
   * Every route back to the idle phase must hand that control back, so each
   * settling path is checked for the release rather than only for its copy: a
   * phase that merely renders like idle would leave the screen locked with no
   * escape short of a remount.
   */
  describe('interaction lock release', () => {
    it('unlocks after a completed submission', async () => {
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a successful response the app cannot display', async () => {
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({
        onInteractionLockChange,
        parseResult: () => {
          throw new ContractError();
        },
      });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errCannotDisplay')),
      );

      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a recording start fails', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockRejectedValue(
        new Error('native permission failure'),
      );
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a too-short take is discarded', async () => {
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await startRecording();

      mockRecorderState.durationMillis = 0;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errTooShort')));

      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a take that could not be saved', async () => {
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = RECORDING_URI;
        mockRecorder.isRecording = true;
        throw new Error('native stop failure');
      });
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed')));

      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('passes through unlocked while a re-record clears the previous take', async () => {
      const onInteractionLockChange = jest.fn();
      await renderRecorder({ onInteractionLockChange });
      await recordAndStop();
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
      onInteractionLockChange.mockClear();

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      expect(onInteractionLockChange).toHaveBeenCalledWith(false);
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
    });

    it('unlocks when an ambiguous submission has nothing left to confirm', async () => {
      asMock(apiUploadAudio).mockRejectedValue(new Error('unexpected transport defect'));
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );

      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a reconcile tombstone is refreshed', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'reconcile' }));
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks silently after another user handoff is cleared', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ ownerId: OTHER_OWNER_ID }));
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onError).not.toHaveBeenCalled();
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks silently after a prepared handoff is cleared', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'prepared' }));
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onError).not.toHaveBeenCalled();
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after an unresolved recovery gives up on the handoff', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue(null);
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errBadRecoveryResponse')),
      );
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a completed assessment for another route', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { ok: 'other' },
      });
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errInterruptedSaved')),
      );
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a recovered response the app cannot display', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { bad: true },
      });
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({
        onInteractionLockChange,
        parseResult: () => {
          throw new ContractError();
        },
      });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errCannotDisplay')),
      );
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after a recovered result is delivered', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 7 },
      });
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 7 } }));
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('unlocks after an S3 resubmission delivers its result', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockResolvedValueOnce({ score: 77 });
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      await advancePolls(5);

      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 77 } });
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    });

    it('leaves an inline rate-limit notice standing by not re-locking a busy phase', async () => {
      asMock(apiUploadAudio).mockRejectedValue(
        new ApiError(429, 'Request failed with status 429', 7 * 60 * 60, {
          code: 'DAILY_LIMIT',
        }),
      );
      const onInteractionLockChange = jest.fn();
      const onRateLimited = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange, onRateLimited });
      await recordAndStop();
      await waitFor(() => expect(onInteractionLockChange).toHaveBeenLastCalledWith(true));
      onInteractionLockChange.mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(onRateLimited).toHaveBeenCalledWith(
          `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`,
        ),
      );

      // 'recorded' -> 'uploading' -> 'recorded' never unlocks, so the screens'
      // "a new submission owns the inline space" reset must not fire and wipe
      // the wait line published in the same commit.
      expect(onInteractionLockChange).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('re-locks the screen after the lock callback identity changes mid-take', async () => {
      const first = jest.fn();
      const second = jest.fn();
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { view, props } = await renderRecorder({ onInteractionLockChange: first });
      await recordAndStop();

      // Swapping the callback releases the old one; the replacement must
      // still learn that the recorder is busy on the next phase change.
      await view.rerender(<Recorder {...props} onInteractionLockChange={second} />);
      await flushAct();
      expect(first).toHaveBeenLastCalledWith(false);

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));

      await waitFor(() => expect(second).toHaveBeenLastCalledWith(true));
    });

    it('stays locked and reports unavailable retry storage while already recovering', async () => {
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockRejectedValue(new Error('keychain unavailable'));
      asMock(apiUploadAudio).mockRejectedValue(new ApiError(0, 'connection interrupted'));
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUnavailable')),
      );

      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
    });
  });

  // The recorder owns its own StyleSheet, so every visual rule it declares is
  // pinned here against the design tokens rather than against literals.
  describe('themed presentation', () => {
    const hidden = { includeHiddenElements: true } as const;

    it('lays out the idle recorder from the shared spacing and color tokens', async () => {
      await renderRecorder();

      expect(flattenedStyle(recorderContainerNode())).toEqual({
        alignItems: 'center',
        paddingVertical: spacing.xl,
      });
      expect(flattenedStyle(recordButtonWrapNode())).toEqual({
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
      });
      expect(flattenedStyle(screen.getByText(IDLE_TEXT))).toEqual({
        marginTop: spacing.ml,
        fontSize: 15,
        color: colors.muted,
        textAlign: 'center',
      });
      expect(flattenedStyle(screen.getByText(t('recorder.privacyNote')))).toEqual({
        marginTop: spacing.sm,
        fontSize: 12,
        lineHeight: 17,
        color: colors.muted,
        textAlign: 'center',
      });
    });

    it('renders the permission refusal as a danger-tinted alert', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy());

      const banner = screen.getByText(t('recorder.permissionBody')).parent;
      if (!banner) throw new Error('Permission banner not found');
      expect(banner.props.accessibilityRole).toBe('alert');
      expect(flattenedStyle(banner)).toEqual({
        backgroundColor: colors.dangerLight,
        borderColor: colors.danger,
        borderWidth: 1,
        borderRadius: radii.input,
        padding: spacing.md,
        marginBottom: spacing.lg,
      });
      expect(flattenedStyle(screen.getByText(t('recorder.permissionBody')))).toEqual({
        color: colors.danger,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
      });
      // canAskAgain is not false, so the settings escape hatch stays hidden.
      expect(screen.queryByText(t('recorder.openSettings'))).toBeNull();
    });

    it('renders the live level meter and its filled segments from the tokens', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, isRecording: true, metering: -30 };
      await view.rerender(<Recorder {...props} />);

      expect(flattenedStyle(screen.getByTestId('live-level-meter', hidden))).toEqual({
        marginTop: spacing.md,
        height: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
      });
      const activeSegments = screen.getAllByTestId('level-segment-active', hidden);
      const idleSegments = screen.getAllByTestId('level-segment-idle', hidden);
      expect(activeSegments).toHaveLength(3);
      expect(idleSegments).toHaveLength(3);
      for (const segment of activeSegments) {
        expect(flattenedStyle(segment)).toEqual({
          width: 10,
          height: 14,
          borderRadius: 2,
          backgroundColor: colors.success,
        });
      }
      for (const segment of idleSegments) {
        expect(flattenedStyle(segment)).toEqual({
          width: 10,
          height: 6,
          borderRadius: 2,
          backgroundColor: colors.border,
        });
      }
    });

    it('renders the reduce-motion listening note as muted emphasis', async () => {
      asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
      await renderRecorder();
      await startRecording();

      expect(flattenedStyle(screen.getByText(t('recorder.listening')))).toEqual({
        marginTop: spacing.md,
        fontSize: 14,
        fontWeight: '600',
        color: colors.muted,
      });
    });

    it('renders the upload wait furniture from the tokens', async () => {
      jest.useFakeTimers();
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy());

      const spinner = waitSpinnerNode(t('recorder.a11yUploading'));
      expect(flattenedStyle(spinner)).toEqual({ marginTop: spacing.ml });
      expect(spinner.props.color).toBe(colors.primary);
      expect(flattenedStyle(screen.getByText(waitingForText('0:00')))).toEqual({
        marginTop: spacing.sm,
        fontSize: 13,
        color: colors.muted,
        textAlign: 'center',
      });
      const cancel = screen.getByRole('button', { name: CANCEL_TEXT });
      expect(flattenedStyle(cancel)).toMatchObject({
        marginTop: spacing.md,
        alignSelf: 'center',
      });
      expect(cancel.props.accessibilityHint).toBe(t('recorder.cancelHint'));
      // The longer-than-usual note belongs to recovery, not to a fresh upload.
      expect(screen.queryByText(t('recorder.waitHint'))).toBeNull();
    });

    it('renders the recovery wait hint from the tokens', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(new Promise(() => undefined));
      await renderRecorder();

      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());

      expect(flattenedStyle(screen.getByText(t('recorder.waitHint')))).toEqual({
        marginTop: spacing.md,
        fontSize: 14,
        color: colors.muted,
        textAlign: 'center',
      });
      expect(flattenedStyle(waitSpinnerNode(t('recorder.a11yRecovering')))).toEqual({
        marginTop: spacing.ml,
      });
    });

    it('stacks the review actions with the shared gap and stretch', async () => {
      await renderRecorder();
      await recordAndStop();
      const actions = screen.getByRole('button', { name: SUBMIT_TEXT }).parent;
      if (!actions) throw new Error('Review actions row not found');

      expect(flattenedStyle(actions)).toEqual({
        marginTop: spacing.xl,
        alignSelf: 'stretch',
        gap: spacing.md,
      });
    });

    it('casts a stronger mic shadow and uses the dark palette in dark mode', async () => {
      asMock(useColorScheme).mockReturnValue('dark');
      await renderRecorder();

      expect(flattenedStyle(screen.getByRole('button', { name: START_LABEL }))).toEqual({
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: darkColors.danger,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: darkColors.shadow,
        shadowOpacity: 0.5,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
      });
      expect(flattenedStyle(recordIconNode())).toEqual({
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: darkColors.onDanger,
      });
      expect(flattenedStyle(screen.getByText(IDLE_TEXT)).color).toBe(darkColors.muted);
      expect(darkColors.danger).not.toBe(colors.danger);
    });
  });
});
