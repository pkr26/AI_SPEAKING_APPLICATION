import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import {
  AudioModule,
  createAudioPlayer,
  setAudioModeAsync,
  useAudioRecorder,
  type RecorderState,
  type RecordingStatus,
} from 'expo-audio';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { Directory, File, Paths } from 'expo-file-system';
import React from 'react';
import type { TestInstance } from 'test-renderer';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  AppState,
  Linking,
  Platform,
  StyleSheet,
  Text,
  useColorScheme,
  type AppStateStatus,
  type EmitterSubscription,
} from 'react-native';

import Recorder, {
  activeMeterSegments,
  audioSessionCanBeAcquired,
  audioSessionIsOwnedBy,
  assessmentIdentityMatches,
  autoStopTapIsWithinGrace,
  automaticRecoveryPostIsAllowed,
  canBeginRecorderOperation,
  canContinueRecoveryLoad,
  canAttemptS3RecoveryPost,
  canReleaseMissingRecovery,
  canResumeRecorderOperation,
  canStartRecoveryAttempt,
  capacityRetryDelayMillis,
  completedTakeIsValid,
  completedRecordingIsUsable,
  deleteRecording,
  formatElapsed,
  monotonicNow,
  nativeStopFailed,
  nextRecordingTakeGeneration,
  operationCanPublish,
  operationShouldUnlock,
  operationShouldReleaseExitLock,
  pendingAssessmentCanUpload,
  preparedRecorderNeedsWebStart,
  previewCanPlayAfterRewind,
  previewStatusReachedEnd,
  previewToggleCanStart,
  recorderContextIsActive,
  recorderControlsAreDisabled,
  recorderOperationIsCurrent,
  readRecorderIsRecording,
  readRecorderUri,
  recordingCompletionCanBeAdopted,
  recordingStatusIsTerminal,
  recordingStartIsBlocked,
  recordingTerminalFailureShouldInterrupt,
  recordingCacheEntryShouldBeDeleted,
  recoveryAbsenceIsConfirmed,
  recoveryAttemptIsCurrent,
  recoveryDurationForRecordAge,
  recoveryRetryDelayMillis,
  recoveryRetryIsVisible,
  recorderStateChanged,
  recordingCompletionNeedsWait,
  rejectedStopTakeCanBeAdopted,
  recordingFileExists,
  rememberTerminalEventQuarantine,
  shouldRunDeferredRecovery,
  shouldMarkRecordingObserved,
  shouldRetryCapacityFailure,
  shouldRunRecordingCacheJanitor,
  shouldPublishRecordingStatus,
  awaitAudioSessionSettled,
  sleepAbortable,
  scrollToExpandedRecorderControls,
  terminalEventQuarantineIndex,
  waitForForeground,
  type RecorderResultMetadata,
} from '../src/components/Recorder';
import {
  ApiError,
  apiFetch,
  apiPostPresignedAudio,
  apiRequestAudioUpload,
  apiUploadAudio,
  AUDIO_TIMEOUT_MS,
  resolveAudioFileDescriptor,
} from '../src/lib/api';
import { claimPlaybackOwner, getSubmittedRecordingPlaybackActive } from '../src/lib/audio-session';
import { translateFor, type MessageKey } from '../src/lib/i18n';
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
  notifyPendingAssessmentReplayReady,
  refundPendingAssessmentRecoveryPost,
  savePendingAssessment,
  type PendingAssessment,
} from '../src/lib/pending-assessment';
import { colors, darkColors, layout, radii, spacing } from '../src/lib/theme';
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
  Directory: jest.fn(() => ({
    exists: true,
    list: jest.fn(() => []),
  })),
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
      android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
      ios: { outputFormat: 'aac', audioQuality: 127 },
      web: { mimeType: 'audio/webm', bitsPerSecond: 128_000 },
    },
  },
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
  useAudioRecorder: jest.fn(),
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
  capturePendingAssessmentGeneration: jest.fn(),
  claimPendingAssessmentRecoveryPost: jest.fn(),
  clearPendingAssessment: jest.fn(),
  ensurePendingAssessment: jest.fn(),
  loadPendingAssessment: jest.fn(),
  markPendingAssessmentCancelled: jest.fn(),
  markPendingAssessmentFeedbackPending: jest.fn(),
  markPendingAssessmentForReconciliation: jest.fn(),
  markPendingAssessmentStage: jest.fn(),
  notifyPendingAssessmentReplayReady: jest.fn(),
  refundPendingAssessmentRecoveryPost: jest.fn(),
  savePendingAssessment: jest.fn(),
}));

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const CYCLE_ID = '550e8400-e29b-41d4-a716-446655440020';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440002';
const OTHER_QUESTION_ID = '550e8400-e29b-41d4-a716-446655440003';
const OTHER_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440004';
const OTHER_OWNER_ID = '550e8400-e29b-41d4-a716-446655440005';
const ENDPOINT = '/practice/attempt' as const;
const S3_AUDIO_KEY = `audio-uploads/practice/${OWNER_ID}/550e8400-e29b-41d4-a716-446655440006.m4a`;
const RECORDING_URI = 'file:///recordings/answer.m4a';

// No I18nProvider is mounted in tests, so the component renders the module's
// active language (English); assertions read the same typed catalog.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

const START_LABEL = t('recorder.startLabel');
const STOP_LABEL = t('recorder.stopLabel');
const SUBMIT_TEXT = t('recorder.submit');
const RERECORD_TEXT = t('recorder.rerecord');
const DISCARD_TEXT = t('recorder.discard');
const CANCEL_TEXT = /^(Cancel Sending|Stop Waiting)$/;
const RECOVERING_TEXT = t('recorder.statusRecovering');
const IDLE_TEXT = t('recorder.statusIdle');
const RECORD_BUTTON_LABEL = new RegExp(`^(${START_LABEL}|${STOP_LABEL})$`);
const recordingStatusText = (elapsed: string) => t('recorder.statusRecording', { elapsed });
const recordedStatusText = (elapsed: string) => t('recorder.statusRecorded', { elapsed });
const waitingForText = (elapsed: string) => t('recorder.waitingFor', { elapsed });

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
let liveRecorderState: MockRecorderState;
let recordingStatusListener: ((status: RecordingStatus) => void) | undefined;
let mockPreviewPlayer: MockPreviewPlayer;
let appStateHandlers: ((state: AppStateStatus) => void)[];
let appStateSubscriptionRemove: jest.Mock;
let reduceMotionSubscriptionRemove: jest.Mock;
let mockRecoveryPostAttempts: number;
let mockRecorderStatusReads: number;

type PreviewStatusEvent = {
  didJustFinish: boolean;
  error?: string | null;
};

function previewStatusListener(
  player: MockPreviewPlayer = mockPreviewPlayer,
): (status: PreviewStatusEvent) => void {
  expect(player.addListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));
  const listener = player.addListener.mock.calls[0]?.[1];
  expect(listener).toEqual(expect.any(Function));
  return listener as (status: PreviewStatusEvent) => void;
}

function previewListenerSubscription(player: MockPreviewPlayer = mockPreviewPlayer): {
  remove: jest.Mock;
} {
  expect(player.addListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));
  const subscription = player.addListener.mock.results[0]?.value as
    { remove?: unknown } | undefined;
  expect(subscription?.remove).toEqual(expect.any(Function));
  return subscription as { remove: jest.Mock };
}
const nativeSetTimeout = globalThis.setTimeout;
const nativeClearTimeout = globalThis.clearTimeout;
const nativeSetInterval = globalThis.setInterval;
const nativeClearInterval = globalThis.clearInterval;
const outstandingRealTimeouts = new Set<Parameters<typeof nativeClearTimeout>[0]>();
const outstandingRealIntervals = new Set<Parameters<typeof nativeClearInterval>[0]>();
const outstandingDeferredResolutions = new Set<() => void>();

const asMock = (fn: unknown) => fn as jest.Mock;

function deferred<T>() {
  let rawResolve!: (value: T) => void;
  let rawReject!: (error: unknown) => void;
  let settled = false;
  const promise = new Promise<T>((res, rej) => {
    rawResolve = res;
    rawReject = rej;
  });
  // A mutant can bypass the mocked bridge call that would normally consume a
  // deliberately rejected deferred. Mark the original promise as handled so
  // that bypass cannot become an unrelated unhandled-rejection crash. Awaiting
  // the original promise still observes the rejection and exercises its owner.
  void promise.catch(() => undefined);
  const settleForCleanup = () => {
    if (settled) return;
    settled = true;
    outstandingDeferredResolutions.delete(settleForCleanup);
    rawResolve(undefined as T);
  };
  outstandingDeferredResolutions.add(settleForCleanup);
  const resolve = (value: T) => {
    if (settled) return;
    settled = true;
    outstandingDeferredResolutions.delete(settleForCleanup);
    rawResolve(value);
  };
  const reject = (error: unknown) => {
    if (settled) return;
    settled = true;
    outstandingDeferredResolutions.delete(settleForCleanup);
    rawReject(error);
  };
  return { promise, resolve, reject };
}

function emitRecordingStatus(overrides: Partial<RecordingStatus> = {}): void {
  if (!recordingStatusListener) throw new Error('Recording status listener was not installed');
  recordingStatusListener({
    id: 'test-recording',
    isFinished: false,
    hasError: false,
    error: null,
    url: null,
    ...overrides,
  });
}

function mockStartedApiFetchFailureOnce(error: unknown): void {
  asMock(apiFetch).mockImplementationOnce(
    async (_path: string, options?: { onRequestStarted?: () => void }) => {
      options?.onRequestStarted?.();
      throw error;
    },
  );
}

function mockStartedApiFetchResultOnce(result: unknown): void {
  asMock(apiFetch).mockImplementationOnce(
    async (_path: string, options?: { onRequestStarted?: () => void }) => {
      options?.onRequestStarted?.();
      return result;
    },
  );
}

function mockStartedUploadFailure(error: unknown): void {
  asMock(apiUploadAudio).mockImplementation(
    async (
      _endpoint: string,
      _uri: string,
      _fields: unknown,
      options?: { onRequestStarted?: () => void },
    ) => {
      options?.onRequestStarted?.();
      throw error;
    },
  );
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

async function settlesWithin(promise: Promise<unknown>, timeoutMs = 1_500): Promise<boolean> {
  let timeout: ReturnType<typeof nativeSetTimeout> | undefined;
  try {
    return await Promise.race([
      promise.then(() => true),
      new Promise<boolean>((resolve) => {
        timeout = nativeSetTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) nativeClearTimeout(timeout);
  }
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

function focusScreen(): void {
  mockScreenFocused = true;
  for (const subscriber of mockFocusSubscribers) {
    if (typeof subscriber.cleanup !== 'function') subscriber.cleanup = subscriber.callback();
  }
}

function pendingRecord(overrides: Partial<PendingAssessment> = {}): PendingAssessment {
  const endpoint = overrides.endpoint ?? ENDPOINT;
  return {
    ownerId: OWNER_ID,
    endpoint,
    questionId: QUESTION_ID,
    ...(endpoint === '/diagnostic/answer' ? {} : { cycleId: CYCLE_ID }),
    requestId: REQUEST_ID,
    createdAt: Date.now(),
    retainRecording: false,
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
  expect(spinner).toBeDefined();
  return spinner!;
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
  cycleId?: string;
  endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native';
  parseResult: (data: unknown) => T;
  onResult: (data: T) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onExitLockChange?: (locked: boolean) => void;
  onExpandedControlsLayout?: () => void;
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
  cycleId?: string;
  disabled?: boolean;
  isStartBlocked?: () => boolean;
  endpoint?: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native';
  parseResult?: (data: unknown) => { parsed: unknown };
  onError?: (message: string) => void;
  onRecoveryUnresolved?: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onExitLockChange?: (locked: boolean) => void;
  onExpandedControlsLayout?: () => void;
  onRecoveryEndpointMismatch?: (
    endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
  ) => boolean;
  onRateLimited?: (message: string) => void;
};

function recorderTestProps(overrides: RecorderTestOverrides = {}) {
  const endpoint = overrides.endpoint ?? ENDPOINT;
  return {
    ownerId: OWNER_ID,
    questionId: QUESTION_ID,
    ...(endpoint === '/diagnostic/answer' ? {} : { cycleId: CYCLE_ID }),
    endpoint,
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
  await flushAct();
  expect(view.getByRole('button', { name: START_LABEL })).toBeTruthy();
  return { view, props };
}

async function renderMetadataRecorder(overrides: RecorderTestOverrides = {}) {
  const { onResult: legacyOnResult, ...baseProps } = recorderTestProps(overrides);
  const onResultWithMetadata = jest.fn<void, [{ parsed: unknown }, RecorderResultMetadata]>();
  const props = { ...baseProps, onResultWithMetadata };
  const view = await render(<Recorder {...props} />);
  await flushAct();
  await flushAct();
  expect(view.getByRole('button', { name: START_LABEL })).toBeTruthy();
  expect(legacyOnResult).not.toHaveBeenCalled();
  return { view, props };
}

async function renderIdentityRaceRecorder(overrides: RecorderTestOverrides = {}) {
  const props = recorderTestProps(overrides);
  const view = await render(<IdentityLayoutHarness recorderProps={props} />);
  await flushAct();
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
        cycleId={CYCLE_ID}
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
  const startControl = screen.getByLabelText(START_LABEL);
  expect(startControl.props.accessibilityHint).toBe(t('recorder.startHint'));
  await fireEvent.press(startControl);
  const stopControl = screen.getByLabelText(STOP_LABEL);
  expect(stopControl.props.accessibilityHint).toBe(t('recorder.stopHint'));
}

async function recordAndStop(durationMillis = 5000): Promise<void> {
  await startRecording();
  mockRecorderState.durationMillis = durationMillis;
  await fireEvent.press(screen.getByLabelText(STOP_LABEL));
  expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
}

async function recordTakeWithNullUriQuarantine(
  view: Pick<RenderResult, 'getByLabelText'>,
): Promise<(uri: string | null) => void> {
  await startRecording();
  mockRecorderState.durationMillis = 5_000;
  let backingUri: string | null = RECORDING_URI;
  const stopReads: (string | null)[] = [null, null, RECORDING_URI];
  Object.defineProperty(mockRecorder, 'uri', {
    configurable: true,
    get: () => (stopReads.length > 0 ? (stopReads.shift() ?? null) : backingUri),
    set: (uri: string | null) => {
      backingUri = uri;
    },
  });
  mockRecorder.stop.mockImplementationOnce(async () => {
    mockRecorder.isRecording = false;
    mockRecorderState = {
      ...mockRecorderState,
      canRecord: false,
      isRecording: false,
    };
    backingUri = RECORDING_URI;
  });

  let stop!: Promise<void>;
  await act(() => {
    stop = invokePressHandler(view, STOP_LABEL);
  });
  await flushAct();
  await act(async () => {
    jest.advanceTimersByTime(500);
    await stop;
    await flushMicrotasks();
  });
  expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
  return (uri: string | null) => {
    backingUri = uri;
  };
}

async function submitLiveRecordingIntoRecovery(
  recoveryRecord: PendingAssessment = pendingRecord(),
  overrides: Parameters<typeof renderRecorder>[0] = {},
) {
  asMock(loadPendingAssessment)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null)
    .mockResolvedValue(recoveryRecord);
  mockStartedUploadFailure(new ApiError(0, 'connection interrupted'));
  const rendered = await renderRecorder(overrides);
  await recordAndStop();
  asMock(File).mockClear();

  await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  return rendered;
}

beforeEach(() => {
  // A cleanup mutant can strand Recorder's real countdown/poll timers after
  // Jest has torn down this test environment. Track the real handles as a
  // harness-level containment boundary; tests that opt into fake timers replace
  // these spies and still exercise production cleanup behavior directly.
  globalThis.setTimeout = ((
    callback: Parameters<typeof setTimeout>[0],
    delay?: number,
    ...args: unknown[]
  ) => {
    const timeout = Reflect.apply(nativeSetTimeout, globalThis, [
      callback,
      delay,
      ...args,
    ]) as ReturnType<typeof setTimeout>;
    outstandingRealTimeouts.add(timeout);
    return timeout;
  }) as typeof setTimeout;
  globalThis.clearTimeout = ((timeout: Parameters<typeof clearTimeout>[0]) => {
    outstandingRealTimeouts.delete(timeout);
    nativeClearTimeout(timeout);
  }) as typeof clearTimeout;
  globalThis.setInterval = ((
    callback: Parameters<typeof setInterval>[0],
    delay?: number,
    ...args: unknown[]
  ) => {
    const interval = Reflect.apply(nativeSetInterval, globalThis, [
      callback,
      delay,
      ...args,
    ]) as ReturnType<typeof setInterval>;
    outstandingRealIntervals.add(interval);
    return interval;
  }) as typeof setInterval;
  globalThis.clearInterval = ((interval: Parameters<typeof clearInterval>[0]) => {
    outstandingRealIntervals.delete(interval);
    nativeClearInterval(interval);
  }) as typeof clearInterval;

  appStateHandlers = [];
  appStateSubscriptionRemove = jest.fn();
  reduceMotionSubscriptionRemove = jest.fn();
  mockFocusSubscribers = [];
  mockScreenFocused = true;
  mockRecoveryPostAttempts = 0;
  onlineManager.setOnline(true);
  mockRecorderStatusReads = 0;
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
    getStatus: jest.fn(() => {
      mockRecorderStatusReads += 1;
      return mockRecorderStatusReads === 1 ? { ...mockRecorderState } : liveRecorderState;
    }),
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(() => {
      mockRecorder.isRecording = true;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: true,
        isRecording: true,
      };
    }),
    stop: jest.fn(async () => {
      mockRecorder.isRecording = false;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
      };
      mockRecorder.uri = RECORDING_URI;
      emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
    }),
    uri: null,
    isRecording: false,
  };
  mockRecorderState = {
    canRecord: true,
    isRecording: false,
    durationMillis: 0,
    url: null,
    mediaServicesDidReset: false,
  };
  // Keep the state object held by Recorder live across explicit rerenders.
  // Expo returns immutable snapshots, while this forwarding proxy lets tests
  // model the next native snapshot without waiting 200 real milliseconds.
  liveRecorderState = new Proxy({} as MockRecorderState, {
    get: (_target, property: keyof MockRecorderState) => mockRecorderState[property],
  });

  asMock(useAudioRecorder).mockReset();
  recordingStatusListener = undefined;
  asMock(useAudioRecorder).mockImplementation(
    (_options: unknown, listener?: (status: RecordingStatus) => void) => {
      recordingStatusListener = listener;
      return mockRecorder;
    },
  );
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
    size: 1024,
    delete: jest.fn(),
    arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
  }));
  asMock(Directory).mockReset();
  asMock(Directory).mockImplementation(() => ({
    exists: true,
    list: jest.fn(() => []),
  }));

  asMock(apiFetch).mockReset();
  asMock(apiRequestAudioUpload).mockReset();
  asMock(apiRequestAudioUpload).mockResolvedValue({
    mode: 'direct',
    assessmentEndpoint: ENDPOINT,
  });
  asMock(apiPostPresignedAudio).mockReset();
  asMock(apiPostPresignedAudio).mockResolvedValue(undefined);
  asMock(apiUploadAudio).mockReset();
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
  asMock(resolveAudioFileDescriptor).mockReset();
  asMock(resolveAudioFileDescriptor).mockResolvedValue({
    name: 'audio.m4a',
    type: 'audio/mp4',
  });

  asMock(loadPendingAssessment).mockReset();
  asMock(loadPendingAssessment).mockResolvedValue(null);
  asMock(savePendingAssessment).mockReset();
  asMock(savePendingAssessment).mockResolvedValue(undefined);
  asMock(capturePendingAssessmentGeneration).mockReset();
  asMock(capturePendingAssessmentGeneration).mockReturnValue(0);
  asMock(ensurePendingAssessment).mockReset();
  asMock(ensurePendingAssessment).mockImplementation(
    async (candidate: PendingAssessment, _expectedGeneration: number) => {
      const existing = (await loadPendingAssessment()) as PendingAssessment | null;
      if (existing) {
        const sameLogicalRequest =
          existing.requestId === candidate.requestId &&
          existing.ownerId === candidate.ownerId &&
          existing.endpoint === candidate.endpoint &&
          existing.questionId === candidate.questionId &&
          existing.cycleId === candidate.cycleId;
        // Most Recorder tests stage their recovery record in loadPendingAssessment
        // before the initial submission. Preserve that test harness choreography;
        // authoritative non-prepared states are covered by explicit ensure mocks.
        if (sameLogicalRequest && existing.stage !== 'prepared') return candidate;
        return existing;
      }
      await savePendingAssessment(candidate);
      return candidate;
    },
  );
  asMock(clearPendingAssessment).mockReset();
  asMock(clearPendingAssessment).mockResolvedValue(undefined);
  asMock(markPendingAssessmentFeedbackPending).mockReset();
  asMock(markPendingAssessmentFeedbackPending).mockResolvedValue(true);
  asMock(notifyPendingAssessmentReplayReady).mockReset();
  asMock(notifyPendingAssessmentReplayReady).mockReturnValue(false);
  asMock(markPendingAssessmentForReconciliation).mockReset();
  asMock(markPendingAssessmentForReconciliation).mockResolvedValue(true);
  asMock(markPendingAssessmentCancelled).mockReset();
  asMock(markPendingAssessmentCancelled).mockResolvedValue(true);
  asMock(claimPendingAssessmentRecoveryPost).mockReset();
  asMock(claimPendingAssessmentRecoveryPost).mockImplementation(
    async (_requestId: string, maxAttempts = 1) => {
      if (mockRecoveryPostAttempts >= maxAttempts) return false;
      mockRecoveryPostAttempts += 1;
      return true;
    },
  );
  asMock(refundPendingAssessmentRecoveryPost).mockReset();
  asMock(refundPendingAssessmentRecoveryPost).mockImplementation(async () => {
    mockRecoveryPostAttempts = Math.max(0, mockRecoveryPostAttempts - 1);
    return true;
  });
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

afterEach(async () => {
  // Recorder unmount starts serialized native/audio cleanup. Run component
  // cleanup here (instead of relying on RNTL's later automatic hook), then
  // flush its promise chain before the next test resets shared native mocks.
  // Without this fence a slow instrumented run can attribute test A's late
  // file deletion to test B.
  cleanup();
  // A mutation assertion can fail before a test reaches its explicit deferred
  // resolution. Unmount first so every Recorder currency guard is stale, then
  // settle those test-only promises to let native/audio/recovery finalizers
  // release module-level ownership before Jest continues the mutant file.
  await act(async () => {
    for (const settle of [...outstandingDeferredResolutions]) settle();
    await flushMicrotasks();
  });
  outstandingDeferredResolutions.clear();
  await flushAct();
  await flushAct();
  for (const timeout of outstandingRealTimeouts) nativeClearTimeout(timeout);
  outstandingRealTimeouts.clear();
  for (const interval of outstandingRealIntervals) nativeClearInterval(interval);
  outstandingRealIntervals.clear();
  jest.useRealTimers();
  globalThis.setTimeout = nativeSetTimeout;
  globalThis.clearTimeout = nativeClearTimeout;
  globalThis.setInterval = nativeSetInterval;
  globalThis.clearInterval = nativeClearInterval;
  jest.restoreAllMocks();
});

describe('Recorder pure behavior contracts', () => {
  it('scrolls expanded controls into view only for the current screen owner', () => {
    const target = { scrollToEnd: jest.fn() };

    scrollToExpandedRecorderControls(null, true);
    scrollToExpandedRecorderControls(target, false);
    expect(target.scrollToEnd).not.toHaveBeenCalled();

    scrollToExpandedRecorderControls(target, true);
    expect(target.scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });

  // Fresh Recorder mutation IDs 6, 8, 66, 68, 69, 102-115.
  it('uses a monotonic clock when available and a wall-clock fallback otherwise', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'performance');
    const performanceNow = jest.spyOn(performance, 'now').mockReturnValue(321);
    expect(monotonicNow()).toBe(321);
    performanceNow.mockRestore();

    const dateNow = jest.spyOn(Date, 'now').mockReturnValue(654);
    try {
      Object.defineProperty(globalThis, 'performance', {
        configurable: true,
        value: undefined,
      });
      expect(monotonicNow()).toBe(654);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'performance', descriptor);
      dateNow.mockRestore();
    }
  });

  it.each([
    [Number.NaN, '0:00'],
    [Number.POSITIVE_INFINITY, '0:00'],
    [-1, '0:00'],
    [0, '0:00'],
    [61_999, '1:01'],
  ])('formats the bounded elapsed value %#', (durationMillis, expected) => {
    expect(formatElapsed(durationMillis)).toBe(expected);
  });

  it.each([
    [undefined, 0],
    [Number.NaN, 0],
    [Number.NEGATIVE_INFINITY, 0],
    [Number.POSITIVE_INFINITY, 0],
    [-60, 0],
    [-30, 3],
    [0, 6],
    [30, 6],
  ])('maps the bounded metering value %#', (metering, expected) => {
    expect(activeMeterSegments(metering)).toBe(expected);
  });

  it('detects each observable recorder-state field and only material duration changes', () => {
    const previous: RecorderState = {
      canRecord: true,
      isRecording: true,
      durationMillis: 1_000,
      mediaServicesDidReset: false,
      metering: -30,
      url: null,
    };
    expect(recorderStateChanged(previous, { ...previous })).toBe(false);
    expect(recorderStateChanged(previous, { ...previous, durationMillis: 1_050 })).toBe(false);
    expect(recorderStateChanged(previous, { ...previous, canRecord: false })).toBe(true);
    expect(recorderStateChanged(previous, { ...previous, isRecording: false })).toBe(true);
    expect(recorderStateChanged(previous, { ...previous, mediaServicesDidReset: true })).toBe(true);
    expect(recorderStateChanged(previous, { ...previous, url: RECORDING_URI })).toBe(true);
    expect(recorderStateChanged(previous, { ...previous, durationMillis: 1_051 })).toBe(true);
    expect(recorderStateChanged(previous, { ...previous, metering: -20 })).toBe(true);
  });

  it.each([
    ['owner', { ownerId: OTHER_OWNER_ID }, false],
    ['endpoint', { endpoint: '/diagnostic/answer' as const }, false],
    ['question', { questionId: OTHER_QUESTION_ID }, false],
    ['matching', {}, true],
  ])('matches the full assessment identity for %s', (_case, overrides, expected) => {
    expect(
      assessmentIdentityMatches(
        { ownerId: OWNER_ID, endpoint: ENDPOINT, questionId: QUESTION_ID, ...overrides },
        OWNER_ID,
        ENDPOINT,
        QUESTION_ID,
      ),
    ).toBe(expected);
  });

  it.each([
    ['all current', true, true, 'active', true],
    ['unmounted', false, true, 'active', false],
    ['blurred', true, false, 'active', false],
    ['inactive', true, true, 'inactive', false],
    ['backgrounded', true, true, 'background', false],
  ])(
    'requires the full active Recorder context for %s',
    (_case, mounted, focused, appState, expected) => {
      expect(recorderContextIsActive(mounted, focused, appState)).toBe(expected);
    },
  );

  // Fresh mutation ID 2025: terminal-event ordering requires increasing takes.
  it('advances recording take generations monotonically', () => {
    expect(nextRecordingTakeGeneration(0)).toBe(1);
    expect(nextRecordingTakeGeneration(41)).toBe(42);
  });

  // Fresh mutation IDs 2673-2706.
  it.each([
    ['ready', false, 'recorded', true],
    ['operation active', true, 'recorded', false],
    ['wrong phase', false, 'idle', false],
  ] as const)('starts preview toggling only when %s', (_case, operation, phase, expected) => {
    expect(previewToggleCanStart(operation, phase)).toBe(expected);
  });

  it.each([
    ['ready', false, 'recorded', true, true],
    ['operation active', true, 'recorded', true, false],
    ['wrong phase', false, 'idle', true, false],
    ['released player', false, 'recorded', false, false],
  ] as const)('plays after rewind only when %s', (_case, operation, phase, player, expected) => {
    expect(previewCanPlayAfterRewind(operation, phase, player)).toBe(expected);
  });

  // Fresh mutation IDs 1862-1869.
  it.each([
    ['idle', false, false, 'idle', false],
    ['external guard', true, false, 'idle', true],
    ['recovery ref', false, true, 'idle', true],
    ['recording', false, false, 'recording', true],
    ['uploading', false, false, 'uploading', true],
    ['recovering', false, false, 'recovering', true],
    ['parked recovery', false, false, 'parked', true],
    ['recorded review', false, false, 'recorded', false],
  ] as const)('blocks recording start for %s', (_case, external, recovering, phase, expected) => {
    expect(recordingStartIsBlocked(external, recovering, phase)).toBe(expected);
  });

  // Fresh mutation IDs 387-397 and 450-463.
  it.each([
    ['mounted', true, false, true],
    ['unmounted', false, false, false],
    ['unmounting', true, true, false],
  ])('publishes operation state only when %s', (_case, mounted, unmounting, expected) => {
    expect(operationCanPublish(mounted, unmounting)).toBe(expected);
  });

  it.each([
    ['eligible', true, false, false, 'idle', true, true],
    ['unmounted', false, false, false, 'idle', true, false],
    ['unmounting', true, true, false, 'idle', true, false],
    ['work remains', true, false, true, 'idle', true, false],
    ['non-idle phase', true, false, false, 'recorded', true, false],
    ['already unlocked', true, false, false, 'idle', false, false],
  ] as const)(
    'balances the operation lock only when %s',
    (_case, mounted, unmounting, active, phase, locked, expected) => {
      expect(operationShouldUnlock(mounted, unmounting, active, phase, locked)).toBe(expected);
    },
  );

  it.each([
    ['idle', true, false, false, 'idle', true, true],
    ['parked recovery', true, false, false, 'parked', true, true],
    ['unmounted', false, false, false, 'idle', true, false],
    ['unmounting', true, true, false, 'idle', true, false],
    ['work remains', true, false, true, 'idle', true, false],
    ['exit-locked phase', true, false, false, 'recovering', true, false],
    ['recorded review', true, false, false, 'recorded', true, false],
    ['already unlocked', true, false, false, 'idle', false, false],
  ] as const)(
    'balances the exit lock only when %s',
    (_case, mounted, unmounting, active, phase, locked, expected) => {
      expect(operationShouldReleaseExitLock(mounted, unmounting, active, phase, locked)).toBe(
        expected,
      );
    },
  );

  // Fresh mutation IDs 662-678 and 713-728.
  it.each([
    ['inactive web recorder', 'web', false, true],
    ['active web recorder', 'web', true, false],
    ['native recorder', 'ios', false, false],
  ])('primes prepared recording only for %s', (_case, platform, recording, expected) => {
    expect(preparedRecorderNeedsWebStart(platform, recording)).toBe(expected);
  });

  it.each([
    ['ios', true],
    ['android', true],
    ['web', false],
  ])('waits for an explicit completion event on %s=%s', (platform, expected) => {
    expect(recordingCompletionNeedsWait(platform)).toBe(expected);
  });

  // Fresh mutation IDs 1884-1906, 2099-2110 and 2268-2290.
  it.each([
    ['current', true, true, true, true, true],
    ['operation', false, true, true, true, false],
    ['lifecycle', true, false, true, true, false],
    ['identity', true, true, false, true, false],
    ['context', true, true, true, false, false],
  ])(
    'requires every Recorder operation currency dimension for %s',
    (_case, operation, lifecycle, identity, context, expected) => {
      expect(recorderOperationIsCurrent(operation, lifecycle, identity, context)).toBe(expected);
    },
  );

  it.each([
    ['encoder error', 'recording', false, { hasError: true, mediaServicesDidReset: false }, true],
    ['media reset', 'recording', false, { hasError: false, mediaServicesDidReset: true }, true],
    [
      'ordinary completion',
      'recording',
      false,
      { hasError: false, mediaServicesDidReset: false },
      false,
    ],
    ['missing completion', 'recording', false, null, false],
    [
      'operation active',
      'recording',
      true,
      { hasError: true, mediaServicesDidReset: false },
      false,
    ],
    ['wrong phase', 'recorded', false, { hasError: true, mediaServicesDidReset: false }, false],
  ] as const)(
    'interrupts recording terminal failure only for %s',
    (_case, phase, operation, completion, expected) => {
      expect(recordingTerminalFailureShouldInterrupt(phase, operation, completion)).toBe(expected);
    },
  );

  // Fresh mutation IDs 1796-1824.
  it.each([
    ['live recording', 'recording', true, true],
    ['paused recording', 'recording', false, false],
    ['native activity outside phase', 'idle', true, false],
  ] as const)('marks recording observation for %s', (_case, phase, recording, expected) => {
    expect(shouldMarkRecordingObserved(phase, recording)).toBe(expected);
  });

  it.each([
    ['terminal event', 'recording', false, false, false, true, false, true, true],
    ['observed native stop', 'recording', false, false, false, false, true, false, true],
    ['wrong phase', 'idle', false, false, false, true, false, true, false],
    ['operation active', 'recording', true, false, false, true, false, true, false],
    ['media reset', 'recording', false, true, false, true, false, true, false],
    ['still recording', 'recording', false, false, true, true, false, true, false],
    ['paused without completion', 'recording', false, false, false, false, true, true, false],
    ['never observed', 'recording', false, false, false, false, false, false, false],
  ] as const)(
    'adopts a native recording completion only for %s',
    (_case, phase, operation, reset, recording, finished, observed, canRecord, expected) => {
      expect(
        recordingCompletionCanBeAdopted(
          phase,
          operation,
          reset,
          recording,
          finished,
          observed,
          canRecord,
        ),
      ).toBe(expected);
    },
  );

  // Fresh mutation IDs 329-371.
  it('distinguishes free, re-entrant, and foreign audio-session ownership', () => {
    const owner = Symbol('owner');
    const other = Symbol('other');
    expect(audioSessionCanBeAcquired(null, owner)).toBe(true);
    expect(audioSessionCanBeAcquired(owner, owner)).toBe(true);
    expect(audioSessionCanBeAcquired(other, owner)).toBe(false);
    expect(audioSessionIsOwnedBy(owner, owner)).toBe(true);
    expect(audioSessionIsOwnedBy(other, owner)).toBe(false);
    expect(audioSessionIsOwnedBy(null, owner)).toBe(false);
  });

  it.each([
    ['ordinary update', false, false, false, false],
    ['finished', true, false, false, true],
    ['error', false, true, false, true],
    ['media reset', false, false, true, true],
  ])('classifies terminal recording status for %s', (_case, finished, error, reset, expected) => {
    expect(
      recordingStatusIsTerminal({
        isFinished: finished,
        hasError: error,
        mediaServicesDidReset: reset,
      }),
    ).toBe(expected);
  });

  it.each([
    ['current', false, true, false, true],
    ['suppressed', true, true, false, false],
    ['unmounted', false, false, false, false],
    ['unmounting', false, true, true, false],
  ])(
    'publishes recording status only when %s',
    (_case, suppressed, mounted, unmounting, expected) => {
      expect(shouldPublishRecordingStatus(suppressed, mounted, unmounting)).toBe(expected);
    },
  );

  // Fresh mutation IDs 215-238.
  it.each([
    ['native startup', 'ios', false, false, true],
    ['web', 'web', false, false, false],
    ['already ran', 'ios', true, false, false],
    ['audio session active', 'ios', false, true, false],
  ])('runs recording-cache cleanup only for %s', (_case, platform, ran, owned, expected) => {
    expect(shouldRunRecordingCacheJanitor(platform, ran, owned)).toBe(expected);
  });

  it.each([
    ['orphan recording', true, false, 'recording-old.m4a', true],
    ['directory', false, false, 'recording-old.m4a', false],
    ['live recording', true, true, 'recording-live.m4a', false],
    ['unrelated file', true, false, 'asset.m4a', false],
  ])('deletes only a cache %s', (_case, file, live, name, expected) => {
    expect(recordingCacheEntryShouldBeDeleted(file, live, name)).toBe(expected);
  });

  // Fresh mutation IDs 1492-1505, 2404-2407 and 2578.
  it.each([
    [undefined, 5_000],
    [Number.NaN, 5_000],
    [0, 1_000],
    [1.234, 1_234],
    [60, 30_000],
  ])('bounds capacity Retry-After %#', (retryAfterSeconds, expected) => {
    expect(capacityRetryDelayMillis(retryAfterSeconds)).toBe(expected);
  });

  it.each([
    ['429', new ApiError(429, 'wait', 1), 2_000],
    ['503', new ApiError(503, 'wait', 10), 10_000],
    ['request in flight', new ApiError(409, 'wait', 7, { code: 'REQUEST_IN_FLIGHT' }), 7_000],
    ['unrelated conflict', new ApiError(409, 'wait', 7, { code: 'STATE_CHANGED' }), null],
    ['lower bound', new ApiError(503, 'wait', 0), 2_000],
    ['upper bound', new ApiError(503, 'wait', 600), 5 * 60_000],
    ['wrong status', new ApiError(500, 'wait', 1), null],
    ['missing retry', new ApiError(503, 'wait'), null],
    ['plain error', new Error('wait'), null],
  ])('derives recovery Retry-After for %s', (_case, error, expected) => {
    expect(recoveryRetryDelayMillis(error)).toBe(expected);
  });

  it.each([
    [new ApiError(0, 'offline'), true],
    [new ApiError(408, 'timeout'), true],
    [new ApiError(409, 'conflict'), false],
    [new Error('offline'), false],
  ])('reserves automatic recovery POST behavior for %#', (error, expected) => {
    expect(automaticRecoveryPostIsAllowed(error)).toBe(expected);
  });

  // Fresh mutation IDs 2837-2964.
  it.each([
    ['enabled', false, false, false, false],
    ['externally disabled', true, false, false, true],
    ['busy', false, true, false, true],
    ['operation active', false, false, true, true],
  ])('derives disabled Recorder controls for %s', (_case, disabled, busy, operation, expected) => {
    expect(recorderControlsAreDisabled(disabled, busy, operation)).toBe(expected);
  });

  it.each([
    ['retrying recovery', 'recovering', true, true],
    ['live recovery', 'recovering', false, false],
    ['stale retry flag outside recovery', 'idle', true, false],
  ] as const)('shows manual recovery retry only for %s', (_case, phase, retry, expected) => {
    expect(recoveryRetryIsVisible(phase, retry)).toBe(expected);
  });

  // Fresh mutation IDs 1135-1137, 1287-1293 and 1312-1313.
  it.each([
    [25 * 60 * 60_000 - 1, 5 * 60_000],
    [25 * 60 * 60_000, 5 * 60_000],
    [25 * 60 * 60_000 + 1, 0],
  ])('bounds recovery duration for record age %ims', (ageMillis, expected) => {
    expect(recoveryDurationForRecordAge(ageMillis)).toBe(expected);
  });

  it.each([
    [2, 10_000, false],
    [3, 9_999, false],
    [3, 10_000, true],
    [4, 10_001, true],
  ])('confirms durable absence with %i reads after %ims', (confirmations, elapsed, expected) => {
    expect(recoveryAbsenceIsConfirmed(confirmations, elapsed)).toBe(expected);
  });

  it.each([
    ['eligible', true, 5_000, 5_000, 's3-granted', S3_AUDIO_KEY, true],
    ['absence unconfirmed', false, 5_000, 5_000, 's3-granted', S3_AUDIO_KEY, false],
    ['too early', true, 4_999, 5_000, 's3-granted', S3_AUDIO_KEY, false],
    ['wrong stage', true, 5_000, 5_000, 'direct-posting', S3_AUDIO_KEY, false],
    ['missing key', true, 5_000, 5_000, 's3-granted', undefined, false],
    ['empty key', true, 5_000, 5_000, 's3-granted', '', false],
  ] as const)(
    'allows an S3 recovery POST only when %s',
    (_case, absence, now, nextAt, stage, key, expected) => {
      expect(canAttemptS3RecoveryPost(absence, now, nextAt, stage, key)).toBe(expected);
    },
  );

  // Fresh mutation IDs 2128-2187 and 2215-2223.
  it.each([
    ['normal', null, 'ios', undefined, false],
    ['Android undefined result', null, 'android', undefined, false],
    ['Android null result', null, 'android', null, false],
    ['Android primitive result', null, 'android', 'stopped', false],
    ['encoder error', { hasError: true, mediaServicesDidReset: false }, 'ios', undefined, true],
    ['media reset', { hasError: false, mediaServicesDidReset: true }, 'ios', undefined, true],
    ['Android result URL', null, 'android', { url: RECORDING_URI }, false],
    ['Android missing URL', null, 'android', {}, true],
    ['iOS ignores Android result shape', null, 'ios', {}, false],
  ] as const)(
    'classifies native stop status for %s',
    (_case, completion, platform, result, expected) => {
      expect(nativeStopFailed(completion, platform, result)).toBe(expected);
    },
  );

  it.each([
    ['valid', false, RECORDING_URI, 500, true, true],
    ['native failure', true, RECORDING_URI, 500, true, false],
    ['missing URI', false, null, 500, true, false],
    ['too short', false, RECORDING_URI, 499, true, false],
    ['unusable file', false, RECORDING_URI, 500, false, false],
  ] as const)(
    'accepts a completed take only when %s',
    (_case, failed, uri, duration, usable, expected) => {
      expect(completedTakeIsValid(failed, uri, duration, usable)).toBe(expected);
    },
  );

  it.each([
    ['valid', RECORDING_URI, false, false, false, true, 500, true, true],
    ['missing URI', null, false, false, false, true, 500, true, false],
    ['encoder error', RECORDING_URI, true, false, false, true, 500, true, false],
    ['media reset', RECORDING_URI, false, true, false, true, 500, true, false],
    ['still recording', RECORDING_URI, false, false, true, true, 500, true, false],
    ['unusable file', RECORDING_URI, false, false, false, false, 500, true, false],
    ['too short', RECORDING_URI, false, false, false, true, 499, true, false],
    ['stale lifecycle', RECORDING_URI, false, false, false, true, 500, false, false],
  ] as const)(
    'adopts a rejected-stop take only when %s',
    (_case, uri, error, reset, recording, usable, duration, current, expected) => {
      expect(
        rejectedStopTakeCanBeAdopted(uri, error, reset, recording, usable, duration, current),
      ).toBe(expected);
    },
  );

  // Fresh mutation IDs 2642 and 2731-2742.
  it.each([
    [-1, false],
    [0, true],
    [999, true],
    [1_000, false],
  ])('bounds auto-stop tap grace at %ims', (elapsedMillis, expected) => {
    expect(autoStopTapIsWithinGrace(elapsedMillis)).toBe(expected);
  });

  it.each([
    ['native completion', true, true, 0, 0, true],
    ['playing', false, true, 10, 10, false],
    ['zero duration', false, false, 0, 0, false],
    ['before tolerance', false, false, 10, 9.94, false],
    ['at tolerance', false, false, 10, 9.95, true],
    ['past end', false, false, 10, 11, true],
  ])(
    'detects preview completion for %s',
    (_case, didJustFinish, playing, duration, currentTime, expected) => {
      expect(previewStatusReachedEnd({ didJustFinish, playing, duration, currentTime })).toBe(
        expected,
      );
    },
  );

  // Fresh mutation IDs 2338-2350 and 2388-2393.
  it.each([
    ['matching prepared handoff', {}, true],
    ['request', { requestId: OTHER_REQUEST_ID }, false],
    ['owner', { ownerId: OTHER_OWNER_ID }, false],
    ['endpoint', { endpoint: '/diagnostic/answer' as const }, false],
    ['question', { questionId: OTHER_QUESTION_ID }, false],
    ['retention choice', { retainRecording: true }, false],
    ['stage', { stage: 's3-granted' as const }, false],
    ['cancelled', { cancelRequested: true }, false],
    ['recovery POST spent', { recoveryPostAttempts: 1 }, false],
  ])('only uploads an authoritative handoff for %s', (_case, overrides, expected) => {
    expect(
      pendingAssessmentCanUpload(
        pendingRecord({ stage: 'prepared', ...overrides }),
        OWNER_ID,
        ENDPOINT,
        QUESTION_ID,
        REQUEST_ID,
        false,
        CYCLE_ID,
      ),
    ).toBe(expected);
  });

  it.each([
    ['capacity refusal', new ApiError(503, 'busy', 1, { code: 'CAPACITY_BUSY' }), false, 0, true],
    ['aborted', new ApiError(503, 'busy', 1, { code: 'CAPACITY_BUSY' }), true, 0, false],
    ['plain error', new Error('busy'), false, 0, false],
    ['wrong status', new ApiError(502, 'busy', 1, { code: 'CAPACITY_BUSY' }), false, 0, false],
    ['wrong code', new ApiError(503, 'busy', 1, { code: 'INTERNAL' }), false, 0, false],
    ['budget spent', new ApiError(503, 'busy', 1, { code: 'CAPACITY_BUSY' }), false, 3, false],
  ])(
    'only retries the bounded capacity contract for %s',
    (_case, error, aborted, retries, expected) => {
      expect(shouldRetryCapacityFailure(error, aborted, retries)).toBe(expected);
    },
  );

  // Fresh mutation IDs 790-992: every recovery lease and currency dimension
  // is independently required, even though normal lifecycle transitions often
  // invalidate several of them together.
  it.each([
    ['eligible', false, false, false, true, true, 'idle', true],
    ['attempt exists', true, false, false, true, true, 'idle', false],
    ['already recovering', false, true, false, true, true, 'idle', false],
    ['upload exists', false, false, true, true, true, 'idle', false],
    ['inactive context', false, false, false, false, true, 'idle', false],
    ['stale identity', false, false, false, true, false, 'idle', false],
    ['recording phase', false, false, false, true, true, 'recording', false],
    ['recovering phase', false, false, false, true, true, 'recovering', true],
  ] as const)(
    'requires every recovery-start dimension for %s',
    (_case, attempted, recovering, uploading, context, identity, phase, expected) => {
      expect(
        canStartRecoveryAttempt(attempted, recovering, uploading, context, identity, phase),
      ).toBe(expected);
    },
  );

  it.each([
    ['eligible', true, true, false, true, true, 'idle', false, true],
    ['missing pending', false, true, false, true, true, 'idle', false, false],
    ['stale operation', true, false, false, true, true, 'idle', false, false],
    ['upload exists', true, true, true, true, true, 'idle', false, false],
    ['inactive context', true, true, false, false, true, 'idle', false, false],
    ['stale identity', true, true, false, true, false, 'idle', false, false],
    ['recording phase', true, true, false, true, true, 'recording', false, false],
    ['another owner', true, true, false, true, true, 'idle', true, false],
  ] as const)(
    'requires every post-load recovery dimension for %s',
    (_case, pending, operation, upload, context, identity, phase, otherOwner, expected) => {
      expect(
        canContinueRecoveryLoad(pending, operation, upload, context, identity, phase, otherOwner),
      ).toBe(expected);
    },
  );

  it.each([
    ['eligible', 'recovering', true, false, true, true, false, true],
    ['idle phase', 'idle', true, false, true, true, false, false],
    ['stale operation', 'recovering', false, false, true, true, false, false],
    ['upload exists', 'recovering', true, true, true, true, false, false],
    ['inactive context', 'recovering', true, false, false, true, false, false],
    ['stale identity', 'recovering', true, false, true, false, false, false],
    ['another owner', 'recovering', true, false, true, true, true, false],
  ] as const)(
    'only releases a missing recovery for %s',
    (_case, phase, operation, upload, context, identity, otherOwner, expected) => {
      expect(
        canReleaseMissingRecovery(phase, operation, upload, context, identity, otherOwner),
      ).toBe(expected);
    },
  );

  it.each([
    ['current', true, true, true, true, false, true, true, true],
    ['generation', false, true, true, true, false, true, true, false],
    ['recovery flag', true, false, true, true, false, true, true, false],
    ['lease', true, true, false, true, false, true, true, false],
    ['operation', true, true, true, false, false, true, true, false],
    ['abort', true, true, true, true, true, true, true, false],
    ['identity', true, true, true, true, false, false, true, false],
    ['context', true, true, true, true, false, true, false, false],
  ])(
    'requires every live recovery currency dimension for %s',
    (_case, generation, recovering, lease, operation, aborted, identity, context, expected) => {
      expect(
        recoveryAttemptIsCurrent(
          generation,
          recovering,
          lease,
          operation,
          aborted,
          identity,
          context,
        ),
      ).toBe(expected);
    },
  );

  it('deduplicates and bounds terminal-event quarantines to the latest four takes', () => {
    const quarantines: { takeGeneration: number; uri: string | null }[] = [];
    for (let takeGeneration = 1; takeGeneration <= 5; takeGeneration += 1) {
      rememberTerminalEventQuarantine(quarantines, {
        takeGeneration,
        uri: `file:///take-${takeGeneration}.m4a`,
      });
    }
    rememberTerminalEventQuarantine(quarantines, {
      takeGeneration: 5,
      uri: 'file:///duplicate.m4a',
    });

    expect(quarantines).toEqual([
      { takeGeneration: 2, uri: 'file:///take-2.m4a' },
      { takeGeneration: 3, uri: 'file:///take-3.m4a' },
      { takeGeneration: 4, uri: 'file:///take-4.m4a' },
      { takeGeneration: 5, uri: 'file:///take-5.m4a' },
    ]);
  });

  // Fresh mutation IDs 403, 410-429 and 473-497.
  it.each([
    ['idle', false, false, 0, true],
    ['owned', false, true, 0, false],
    ['in flight', false, false, 1, false],
    ['superseding owned work', true, true, 1, true],
  ])(
    'decides whether an operation can begin for %s',
    (_case, supersede, owned, count, expected) => {
      expect(canBeginRecorderOperation(supersede, owned, count)).toBe(expected);
    },
  );

  it.each([
    ['sole suspended token', false, true, 1, true],
    ['another owner', true, true, 1, false],
    ['missing token', false, false, 1, false],
    ['competing token', false, true, 2, false],
  ])('decides whether an operation can resume for %s', (_case, owned, held, count, expected) => {
    expect(canResumeRecorderOperation(owned, held, count)).toBe(expected);
  });

  it.each([
    ['eligible idle', 0, true, false, true, 'active', 'idle', true],
    ['eligible recovering', 0, true, false, true, 'active', 'recovering', true],
    ['operation remains', 1, true, false, true, 'active', 'idle', false],
    ['unmounted', 0, false, true, true, 'active', 'idle', false],
    ['unmounting', 0, true, true, true, 'active', 'idle', false],
    ['blurred', 0, true, false, false, 'active', 'idle', false],
    ['backgrounded', 0, true, false, true, 'background', 'idle', false],
    ['recording', 0, true, false, true, 'active', 'recording', false],
    ['uploading', 0, true, false, true, 'active', 'uploading', false],
  ] as const)(
    'decides whether deferred recovery can run for %s',
    (_case, count, mounted, unmounting, focused, appState, phase, expected) => {
      expect(shouldRunDeferredRecovery(count, mounted, unmounting, focused, appState, phase)).toBe(
        expected,
      );
    },
  );

  // Fresh mutation IDs 261-283: exact-URI and missing-URI terminal events
  // must only consume an older take's quarantine entry.
  it.each([
    ['matching URI', 'file:///old.m4a', false, 2, 0],
    ['different URI while idle', 'file:///other.m4a', false, 2, -1],
    ['different URI while a newer take records', 'file:///other.m4a', true, 2, 1],
    ['different URI from the same generation', 'file:///other.m4a', true, 1, -1],
    ['missing URI while a newer take records', null, true, 2, 0],
    ['missing URI while idle', null, false, 2, -1],
    ['missing URI from the same generation', null, true, 1, -1],
  ])(
    'selects the terminal-event quarantine for %s',
    (_case, eventUri, stillRecording, generation, expected) => {
      expect(
        terminalEventQuarantineIndex(
          [
            { takeGeneration: 1, uri: 'file:///old.m4a' },
            { takeGeneration: 1, uri: null },
          ],
          eventUri,
          stillRecording,
          generation,
        ),
      ).toBe(expected);
    },
  );

  // Fresh mutation IDs 181, 182, 197, 199, 200 and the explicit catch paths.
  it('treats remote URIs as present and rejects missing, empty, or unreadable local files', () => {
    asMock(File).mockClear();
    expect(recordingFileExists('blob:https://example.test/audio')).toBe(true);
    expect(completedRecordingIsUsable('blob:https://example.test/audio')).toBe(true);
    expect(File).not.toHaveBeenCalled();

    asMock(File).mockImplementationOnce(() => ({ exists: false, size: 1 }));
    expect(recordingFileExists(RECORDING_URI)).toBe(false);
    asMock(File).mockImplementationOnce(() => ({ exists: false, size: 1 }));
    expect(completedRecordingIsUsable(RECORDING_URI)).toBe(false);

    for (const size of [undefined, Number.NaN, 0]) {
      asMock(File).mockImplementationOnce(() => ({ exists: true, size }));
      expect(completedRecordingIsUsable(RECORDING_URI)).toBe(false);
    }

    asMock(File).mockImplementationOnce(() => {
      throw new Error('file metadata unavailable');
    });
    expect(recordingFileExists(RECORDING_URI)).toBe(false);
    asMock(File).mockImplementationOnce(() => {
      throw new Error('file metadata unavailable');
    });
    expect(completedRecordingIsUsable(RECORDING_URI)).toBe(false);
  });

  it('snapshots completed native file metadata exactly once', () => {
    const exists = jest.fn(() => true);
    const sizes = [1024, undefined];
    const size = jest.fn(() => sizes.shift());
    asMock(File).mockImplementationOnce(() => ({
      get exists() {
        return exists();
      },
      get size() {
        return size();
      },
    }));

    expect(completedRecordingIsUsable(RECORDING_URI)).toBe(true);
    expect(exists).toHaveBeenCalledTimes(1);
    expect(size).toHaveBeenCalledTimes(1);
  });

  it('treats deletion of a missing recording URI as a no-op', () => {
    expect(() => deleteRecording(null)).not.toThrow();
    expect(File).not.toHaveBeenCalled();
  });

  // Fresh mutation IDs 147-152.
  it('waits for the active foreground event and ignores other app states', async () => {
    jest.useFakeTimers();
    backgroundApp();
    let resolved = false;
    void Promise.resolve(waitForForeground(2_000)).then(() => {
      resolved = true;
    });
    expect(appStateHandlers).toHaveLength(1);

    appStateHandlers[0]('inactive');
    await flushMicrotasks();
    expect(resolved).toBe(false);

    appStateHandlers[0]('active');
    await flushMicrotasks();
    expect(resolved).toBe(true);
    expect(appStateSubscriptionRemove).toHaveBeenCalledTimes(1);
  });

  it('bounds a missing foreground event by its timeout', async () => {
    jest.useFakeTimers();
    backgroundApp();
    let resolved = false;
    void Promise.resolve(waitForForeground(2_000)).then(() => {
      resolved = true;
    });

    jest.advanceTimersByTime(1_999);
    await flushMicrotasks();
    expect(appStateSubscriptionRemove).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await flushMicrotasks();
    expect(resolved).toBe(true);
    expect(appStateSubscriptionRemove).toHaveBeenCalledTimes(1);
  });
});

describe('awaitAudioSessionSettled', () => {
  it('resolves immediately for an absent release promise', async () => {
    await expect(awaitAudioSessionSettled(null, 10_000)).resolves.toBeUndefined();
  });

  it('resolves when the release promise settles and clears the deadline timer', async () => {
    jest.useFakeTimers();
    try {
      let release!: () => void;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let outcome: unknown = 'pending';
      void Promise.resolve(awaitAudioSessionSettled(pending, 10_000)).then(
        () => {
          outcome = 'resolved';
        },
        (error: unknown) => {
          outcome = error;
        },
      );
      await flushMicrotasks();
      expect(outcome).toBe('pending');
      release();
      await flushMicrotasks();
      expect(outcome).toBe('resolved');
      // The deadline must be gone with the settled wait: advancing past it
      // cannot turn the already-resolved outcome into a rejection.
      jest.advanceTimersByTime(20_000);
      await flushMicrotasks();
      expect(outcome).toBe('resolved');
    } finally {
      jest.useRealTimers();
    }
  });

  it('propagates an underlying rejection and wraps non-Error failures', async () => {
    await expect(
      awaitAudioSessionSettled(Promise.reject(new Error('restore failed')), 10_000),
    ).rejects.toThrow('restore failed');
    await expect(
      awaitAudioSessionSettled(Promise.reject('string failure'), 10_000),
    ).rejects.toThrow('audio session release failed');
  });

  it('rejects at the deadline when the owning instance never releases', async () => {
    jest.useFakeTimers();
    try {
      const hung = new Promise<void>(() => undefined);
      let outcome: unknown = 'pending';
      void Promise.resolve(awaitAudioSessionSettled(hung, 10_000)).then(
        () => {
          outcome = 'resolved';
        },
        (error: unknown) => {
          outcome = error;
        },
      );
      await flushMicrotasks();
      expect(outcome).toBe('pending');
      jest.advanceTimersByTime(10_000);
      await flushMicrotasks();
      // A queued startRecording turns this rejection into the localized
      // start-failure copy instead of locking the controls forever.
      expect(outcome).toMatchObject({
        message: 'audio session release did not settle in time',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('sleepAbortable', () => {
  it('rejects with an AbortError when the signal is already aborted at entry', async () => {
    // Regression: the timer was declared below the abort check, so a
    // pre-aborted signal hit clearTimeout in the temporal dead zone and
    // rejected with a ReferenceError instead of an AbortError.
    const controller = new AbortController();
    controller.abort();
    let outcome: unknown = 'pending';
    void Promise.resolve(sleepAbortable(60_000, controller.signal)).then(
      () => {
        outcome = 'resolved';
      },
      (error: unknown) => {
        outcome = error;
      },
    );
    await flushMicrotasks();

    expect(outcome).toMatchObject({
      name: 'AbortError',
      message: 'The operation was aborted.',
    });
  });

  it('resolves after the delay when the signal never fires', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    let outcome = 'pending';
    void Promise.resolve(sleepAbortable(1_000, controller.signal)).then(
      () => {
        outcome = 'resolved';
      },
      () => {
        outcome = 'rejected';
      },
    );

    jest.advanceTimersByTime(1_000);
    await flushMicrotasks();

    expect(outcome).toBe('resolved');
    expect(controller.signal.aborted).toBe(false);
  });

  it('rejects with an AbortError when the signal fires mid-wait', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    let outcome: unknown = 'pending';
    void Promise.resolve(sleepAbortable(60_000, controller.signal)).then(
      () => {
        outcome = 'resolved';
      },
      (error: unknown) => {
        outcome = error;
      },
    );

    controller.abort();
    await flushMicrotasks();

    expect(outcome).toMatchObject({
      name: 'AbortError',
      message: 'The operation was aborted.',
    });
  });
});

let recorderRenderSentinelAttempted = false;
let recorderStopLabelSentinelPassed = false;
let recorderStatusSentinelPassed = false;
let recorderWebStopWaitSentinelAttempted = false;
let recorderWebStopWaitSentinelPassed = false;
let recorderWebLifecycleWaitSentinelAttempted = false;
let recorderWebLifecycleWaitSentinelPassed = false;
let recorderSubmitEventSentinelAttempted = false;
let recorderSubmitEventSentinelPassed = false;

describe('Recorder', () => {
  beforeEach(() => {
    // Conditional-render mutations on the recording label/status otherwise
    // cascade through hundreds of interaction tests, including deliberate
    // deferred races. Once the early sentinel has detected either bad render,
    // fail each remaining case at setup so no timeout can hide the assertion.
    if (!recorderRenderSentinelAttempted) return;
    expect(recorderStopLabelSentinelPassed).toBe(true);
    expect(recorderStatusSentinelPassed).toBe(true);
    if (recorderWebStopWaitSentinelAttempted) {
      expect(recorderWebStopWaitSentinelPassed).toBe(true);
    }
    if (recorderWebLifecycleWaitSentinelAttempted) {
      expect(recorderWebLifecycleWaitSentinelPassed).toBe(true);
    }
    if (recorderSubmitEventSentinelAttempted) {
      expect(recorderSubmitEventSentinelPassed).toBe(true);
    }
  });

  it('renders idle with a start button and no permission banner', async () => {
    const currentDelete = jest.fn();
    const audioOrphanDelete = jest.fn();
    const expoOrphanDelete = jest.fn(() => {
      throw new Error('cache entry disappeared');
    });
    const missingAudioList = jest.fn(() => {
      throw new Error('missing directory cannot be listed');
    });
    const cacheEntry = (uri: string, name: string, remove: jest.Mock) =>
      Object.assign(Object.create((File as unknown as { prototype: object }).prototype), {
        uri,
        name,
        delete: remove,
      });
    const currentUri = 'file:///cache/Audio/recording-current.m4a';
    mockRecorder.uri = currentUri;
    asMock(Directory).mockImplementation((_root: unknown, directoryName: string) =>
      directoryName === 'Audio'
        ? { exists: false, list: missingAudioList }
        : {
            exists: true,
            list: jest.fn(() => [
              cacheEntry(currentUri, 'recording-current.m4a', currentDelete),
              cacheEntry(
                'file:///cache/ExpoAudio/recording-orphan-a.m4a',
                'recording-orphan-a.m4a',
                audioOrphanDelete,
              ),
              cacheEntry(
                'file:///cache/ExpoAudio/recording-orphan-b.m4a',
                'recording-orphan-b.m4a',
                expoOrphanDelete,
              ),
            ]),
          },
    );

    const { view, props } = await renderRecorder();

    expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    expect(screen.getByLabelText(t('recorder.a11yIdle'))).toBeTruthy();
    // Critical privacy copy pinned literally on purpose: this must match
    // t('recorder.privacyNote') exactly, so a silent copy edit fails here.
    expect(screen.getByText('We send your recording only after you tap Send Answer.')).toBeTruthy();
    expect(
      screen.getByText(
        'Your score, transcript, and feedback are saved either way. Audio is deleted after checking unless you turn on Save this recording.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();
    expect(Directory).toHaveBeenCalledWith(Paths.cache, 'Audio');
    expect(Directory).toHaveBeenCalledWith(Paths.cache, 'ExpoAudio');
    expect(missingAudioList).not.toHaveBeenCalled();
    expect(currentDelete).not.toHaveBeenCalled();
    expect(audioOrphanDelete).toHaveBeenCalledTimes(1);
    expect(expoOrphanDelete).toHaveBeenCalledTimes(1);

    asMock(Directory).mockClear();
    await view.rerender(
      <>
        <Recorder key="first" {...props} />
        <Recorder key="second" {...props} />
      </>,
    );
    await flushAct();
    // Cache cleanup is process-start work. A later mount must not inspect a URI
    // another native recorder may just have prepared but not rendered.
    expect(Directory).not.toHaveBeenCalled();
  });

  it('renders the recording button label and status before longer lifecycle cases run', async () => {
    recorderRenderSentinelAttempted = true;
    const { view } = await renderRecorder();

    try {
      await fireEvent.press(view.getByLabelText(START_LABEL));
      recorderStopLabelSentinelPassed = screen.queryByLabelText(STOP_LABEL) !== null;
      recorderStatusSentinelPassed = screen.queryByText(recordingStatusText('0:00')) !== null;

      expect(recorderStopLabelSentinelPassed).toBe(true);
      expect(recorderStatusSentinelPassed).toBe(true);
    } finally {
      // A failed render assertion must not leave the shared audio-session owner
      // recording while Jest advances to the rest of this lane.
      const recordButton = screen.queryByLabelText(RECORD_BUTTON_LABEL);
      if (mockRecorder.isRecording && recordButton) {
        mockRecorderState.durationMillis = 5_000;
        await fireEvent.press(recordButton);
      }
    }
  });

  it('dispatches reviewed Submit before longer submission cases run', async () => {
    const { props } = await renderRecorder();
    await recordAndStop();
    asMock(capturePendingAssessmentGeneration).mockClear();
    recorderSubmitEventSentinelAttempted = true;

    await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
    recorderSubmitEventSentinelPassed =
      asMock(capturePendingAssessmentGeneration).mock.calls.length === 1;
    expect(recorderSubmitEventSentinelPassed).toBe(true);

    await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
  });

  it('confirms and discards an unsent reviewed take without any network request', async () => {
    const onInteractionLockChange = jest.fn();
    const onExitLockChange = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderRecorder({ onInteractionLockChange, onExitLockChange });
    await recordAndStop();

    const discardButton = screen.getByRole('button', { name: DISCARD_TEXT });
    expect(discardButton.props.accessibilityHint).toBe(t('recorder.discardHint'));
    expect(onExitLockChange).toHaveBeenLastCalledWith(true);
    await fireEvent.press(discardButton);

    expect(alertSpy).toHaveBeenCalledWith(
      t('recorder.discardTitle'),
      t('recorder.discardBody'),
      expect.arrayContaining([
        expect.objectContaining({ text: t('common.cancel'), style: 'cancel' }),
        expect.objectContaining({ text: DISCARD_TEXT, style: 'destructive' }),
      ]),
    );
    const buttons = alertSpy.mock.calls[0][2] as {
      text?: string;
      onPress?: () => void;
    }[];
    const destructive = buttons.find((button) => button.text === DISCARD_TEXT);
    await act(async () => {
      destructive?.onPress?.();
      await flushMicrotasks();
    });

    expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    expect(screen.queryByRole('button', { name: SUBMIT_TEXT })).toBeNull();
    expect(deletedRecordingUris()).toContain(RECORDING_URI);
    expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
    expect(onExitLockChange).toHaveBeenLastCalledWith(false);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      t('recorder.discarded'),
    );
    expect(clearPendingAssessment).not.toHaveBeenCalled();
    expect(apiRequestAudioUpload).not.toHaveBeenCalled();
    expect(apiUploadAudio).not.toHaveBeenCalled();
    expect(apiPostPresignedAudio).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('hands the current unlocked state to a replacement exit-lock observer', async () => {
    const firstObserver = jest.fn();
    const secondObserver = jest.fn();
    const { view, props } = await renderRecorder({ onExitLockChange: firstObserver });
    firstObserver.mockClear();

    await view.rerender(<Recorder {...props} onExitLockChange={secondObserver} />);
    await flushAct();

    expect(firstObserver).toHaveBeenCalledWith(false);
    expect(secondObserver).toHaveBeenCalledWith(false);
  });

  describe('deterministic mutation boundaries 1001-1500', () => {
    it('does not publish a captured operation after lifecycle unmount cleanup settles', async () => {
      const onInteractionLockChange = jest.fn();
      const { view } = await renderRecorder({ onInteractionLockChange });
      const staleStart = compositePressableProps(view, START_LABEL).onPress as () => unknown;

      await view.unmount();
      await flushAct();
      await flushAct();
      onInteractionLockChange.mockClear();
      await act(async () => {
        await Promise.resolve(staleStart());
        await flushMicrotasks();
      });

      expect(onInteractionLockChange).not.toHaveBeenCalledWith(true);
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('delivers an event-only URI through an already-registered completion waiter', async () => {
      const nativeStop = deferred<unknown>();
      const eventUri = 'file:///recordings/waiter-event-only.m4a';
      mockRecorder.stop.mockReturnValue(nativeStop.promise);
      const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      mockRecorder.uri = null;
      mockRecorder.isRecording = false;
      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL);
      });

      await act(async () => {
        nativeStop.resolve(undefined);
        await flushMicrotasks();
      });
      expect(timeoutSpy.mock.calls.some(([, delay]) => delay === 500)).toBe(true);
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: eventUri });
        await stop;
      });

      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).not.toContain(eventUri);
    });

    it('stops native recording reported outside the React recording phase', async () => {
      await renderRecorder();
      mockRecorder.isRecording = true;
      mockRecorder.uri = 'file:///recordings/native-desync.m4a';

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('releases audio ownership and refreshes restore state across three takes', async () => {
      await renderRecorder();
      await recordAndStop();
      expect(
        screen.getByRole('button', { name: SUBMIT_TEXT }).props.accessibilityState,
      ).toMatchObject({ disabled: false });

      let secondStart!: Promise<void>;
      await act(() => {
        secondStart = invokeRolePressHandler(START_LABEL);
      });
      await flushAct();
      const secondStarted = mockRecorder.record.mock.calls.length === 2;
      expect(secondStarted).toBe(true);
      await secondStart;
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      let thirdStart!: Promise<void>;
      await act(() => {
        thirdStart = invokeRolePressHandler(START_LABEL);
      });
      await flushAct();
      const thirdStarted = mockRecorder.record.mock.calls.length === 3;
      expect(thirdStarted).toBe(true);
      await thirdStart;
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      const restoreCalls = asMock(setAudioModeAsync).mock.calls.filter(
        ([options]) => options.allowsRecording === false,
      );
      expect(restoreCalls).toHaveLength(3);
      expect(mockRecorder.stop).toHaveBeenCalledTimes(3);
    });

    it('admits one Start owner and rejects an overlapping captured Start', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view } = await renderRecorder();
      const startHandler = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      let first!: Promise<void>;
      let second!: Promise<void>;
      await act(() => {
        first = Promise.resolve(startHandler()).then(() => undefined);
        second = Promise.resolve(startHandler()).then(() => undefined);
      });
      await flushAct();
      const permissionReads = asMock(AudioModule.getRecordingPermissionsAsync).mock.calls.length;

      await act(async () => {
        permission.resolve({ granted: true });
        await Promise.allSettled([first, second]);
        await flushMicrotasks();
      });
      const recordCalls = mockRecorder.record.mock.calls.length;
      const recordingVisible = screen.queryByLabelText(STOP_LABEL) !== null;
      if (screen.queryByLabelText(STOP_LABEL)) {
        mockRecorderState.durationMillis = 5_000;
        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      }

      expect(permissionReads).toBe(1);
      expect(recordCalls).toBe(1);
      expect(recordingVisible).toBe(true);
    });

    it('does not adopt a terminal event while Stop still owns the operation', async () => {
      const nativeStop = deferred<unknown>();
      mockRecorder.stop.mockReturnValue(nativeStop.promise);
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 5_000,
      };
      mockRecorder.isRecording = false;
      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL);
      });
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });
      const adoptedWhileStopping = screen.queryByRole('button', { name: SUBMIT_TEXT }) !== null;

      await act(async () => {
        nativeStop.resolve(undefined);
        await stop;
      });
      expect(adoptedWhileStopping).toBe(false);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('bounds self-deferred recovery to one storage read', async () => {
      const unexpectedSecondRead = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockReturnValue(unexpectedSecondRead.promise);
      const { view } = await renderRecorder();
      await flushAct();
      const readCount = asMock(loadPendingAssessment).mock.calls.length;

      await view.unmount();
      await act(async () => {
        unexpectedSecondRead.resolve(null);
        await flushMicrotasks();
      });
      expect(readCount).toBe(1);
    });

    it('uses an already-delivered completion without scheduling another wait', async () => {
      jest.useFakeTimers();
      const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      const { view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL);
      });
      await flushAct();
      const completionWaits = timeoutSpy.mock.calls.filter(([, delay]) => delay === 500).length;
      await act(async () => {
        jest.advanceTimersByTime(500);
        await stop;
      });

      expect(completionWaits).toBe(0);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('waits exactly once when native Stop has no completion event', async () => {
      jest.useFakeTimers();
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.isRecording = false;
        mockRecorder.uri = null;
      });
      const { view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      let settled = false;
      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL).then(() => {
          settled = true;
        });
      });
      await flushAct();
      const settledBeforeWait = settled;
      await act(async () => {
        jest.advanceTimersByTime(500);
        await stop;
      });

      expect(settledBeforeWait).toBe(false);
      expect(settled).toBe(true);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('does not schedule a native completion wait for a normal web Stop', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      let settled = false;
      let stop: Promise<void> | null = null;
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = RECORDING_URI;
        });
        const { view } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = 5_000;
        const completionWaitsBeforeStop = timeoutSpy.mock.calls.filter(
          ([, delay]) => delay === 500,
        ).length;
        recorderWebStopWaitSentinelAttempted = true;

        await act(() => {
          stop = invokePressHandler(view, STOP_LABEL).then(() => {
            settled = true;
          });
        });
        await flushAct();

        const completionWaitsAfterStop = timeoutSpy.mock.calls.filter(
          ([, delay]) => delay === 500,
        ).length;
        recorderWebStopWaitSentinelPassed = completionWaitsAfterStop === completionWaitsBeforeStop;
        expect(completionWaitsAfterStop).toBe(completionWaitsBeforeStop);
        expect(settled).toBe(true);
        expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      } finally {
        const pendingStop = stop;
        if (pendingStop) {
          // A forced native-only branch is allowed to settle only after the
          // no-wait assertion above has already killed it.
          await act(async () => {
            jest.advanceTimersByTime(500);
            await pendingStop;
            await flushMicrotasks();
          });
        }
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('does not schedule a native completion wait after a resolved web lifecycle stop', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = RECORDING_URI;
        });
        await renderRecorder();
        await startRecording();
        mockRecorder.uri = RECORDING_URI;
        const completionWaitsBeforeBackground = timeoutSpy.mock.calls.filter(
          ([, delay]) => delay === 500,
        ).length;
        recorderWebLifecycleWaitSentinelAttempted = true;

        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          await flushMicrotasks();
        });
        await flushAct();

        const completionWaitsAfterBackground = timeoutSpy.mock.calls.filter(
          ([, delay]) => delay === 500,
        ).length;
        recorderWebLifecycleWaitSentinelPassed =
          completionWaitsAfterBackground === completionWaitsBeforeBackground;
        expect(completionWaitsAfterBackground).toBe(completionWaitsBeforeBackground);
        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
        expect(deletedRecordingUris()).toContain(RECORDING_URI);
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      } finally {
        // If the web predicate is forced to the native branch, let its bounded
        // fallback finish only after the timer assertion has already failed.
        await act(async () => {
          jest.advanceTimersByTime(500);
          await flushMicrotasks();
        });
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('does not schedule native completion waits for idle lifecycle cleanup', async () => {
      jest.useFakeTimers();
      const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      const { view } = await renderRecorder();
      await view.unmount();
      await flushAct();
      const completionWaits = timeoutSpy.mock.calls.filter(([, delay]) => delay === 500).length;
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushMicrotasks();
      });

      expect(completionWaits).toBe(0);
      expect(mockRecorder.stop).not.toHaveBeenCalled();
    });

    it('clears lifecycle single-flight ownership before the next backgrounded take', async () => {
      await renderRecorder();
      await startRecording();
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });
      await startRecording();
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      expect(mockRecorder.stop).toHaveBeenCalledTimes(2);
    });

    it('aborts and releases recovery ownership before foreground replacement recovery', async () => {
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
      const { props } = await renderRecorder();
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      const firstSignal = asMock(apiFetch).mock.calls[0][1].signal as AbortSignal;

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      expect(firstSignal.aborted).toBe(true);
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 97 },
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

      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 97 } }));
      expect(apiFetch).toHaveBeenCalledTimes(2);
    });

    it('publishes failures through callbacks installed by the latest render', async () => {
      const firstError = jest.fn();
      const latestError = jest.fn();
      const { view, props } = await renderRecorder({ onError: firstError });
      await view.rerender(<Recorder {...props} onError={latestError} />);
      await flushAct();
      asMock(AudioModule.getRecordingPermissionsAsync).mockRejectedValue(
        new Error('permission bridge unavailable'),
      );

      await fireEvent.press(screen.getByLabelText(START_LABEL));

      expect(latestError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
      expect(firstError).not.toHaveBeenCalled();
    });

    it('delivers a mounted pending result without deferring or rejecting recovery startup', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 94 },
      });
      const { view, props } = await renderRecorder();
      await flushAct();
      const delivered = props.onResult.mock.calls.some(
        ([result]) => (result as { parsed?: { score?: number } }).parsed?.score === 94,
      );

      await view.unmount();
      await flushAct();
      expect(delivered).toBe(true);
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('deterministic mutation boundaries 2501+', () => {
    it('settles and unlocks Start and Stop before exposing the next action', async () => {
      const onInteractionLockChange = jest.fn();
      const { view } = await renderRecorder({ onInteractionLockChange });

      let startSettled = false;
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL).finally(() => {
          startSettled = true;
        });
      });
      await flushAct();
      await flushAct();

      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      expect(startSettled).toBe(true);
      // Recording itself remains an interaction lock even after the Start
      // operation token has settled.
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByLabelText(STOP_LABEL).props.accessibilityState).toMatchObject({
        disabled: false,
      });
      await start;

      mockRecorderState.durationMillis = 5_000;
      let stopSettled = false;
      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL).finally(() => {
          stopSettled = true;
        });
      });
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      await flushAct();
      await flushAct();

      expect(stopSettled).toBe(true);
      // A held review take deliberately retains the screen-level navigation
      // lock, while the completed Stop operation must release its own control
      // disablement so Send can be pressed.
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
      expect(
        asMock(setAudioModeAsync).mock.calls.some(([options]) => options.allowsRecording === false),
      ).toBe(true);
      expect(
        screen.getByRole('button', { name: SUBMIT_TEXT }).props.accessibilityState,
      ).toMatchObject({ disabled: false });
      await stop;
    });

    it('dispatches a recorded submission and releases its operation deterministically', async () => {
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await recordAndStop();

      let submissionSettled = false;
      let submission!: Promise<void>;
      await act(() => {
        submission = invokeRolePressHandler(SUBMIT_TEXT).finally(() => {
          submissionSettled = true;
        });
      });
      await flushAct();
      await flushAct();
      await flushAct();

      expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(props.onResult).toHaveBeenCalledTimes(1);
      expect(submissionSettled).toBe(true);
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
      await submission;
    });

    it('arms the exact web auto-stop and preserves its immediate-tap grace', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');
      const monotonicNow = jest.spyOn(performance, 'now').mockReturnValue(1_000);
      try {
        const { view } = await renderRecorder();
        let start!: Promise<void>;
        await act(() => {
          start = invokePressHandler(view, START_LABEL);
        });
        await flushAct();
        await start;

        expect(mockRecorder.record).toHaveBeenCalledWith();
        expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 120_000);
        mockRecorder.uri = RECORDING_URI;
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
          durationMillis: 120_000,
        };
        monotonicNow.mockReturnValue(121_000);
        await act(async () => {
          jest.advanceTimersByTime(120_000);
          await flushMicrotasks();
        });

        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
        let immediateMic!: Promise<void>;
        await act(() => {
          immediateMic = invokePressHandler(view, START_LABEL);
        });
        await flushAct();
        expect(mockRecorder.record).toHaveBeenCalledTimes(1);
        await immediateMic;
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('does not manufacture a recovery read after preparation fails', async () => {
      const { view, props } = await renderRecorder();
      asMock(loadPendingAssessment).mockClear();
      mockRecorder.prepareToRecordAsync.mockRejectedValueOnce(new Error('prepare failed'));

      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      await flushAct();
      await flushAct();
      await start;

      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('does not dispose a recorder when permission lookup failed before preparation', async () => {
      const { view, props } = await renderRecorder();
      asMock(AudioModule.getRecordingPermissionsAsync).mockRejectedValueOnce(
        new Error('permission unavailable'),
      );
      mockRecorder.stop.mockClear();

      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      await flushAct();
      await flushAct();
      await start;

      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.stop).not.toHaveBeenCalled();
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
    });

    it('does not apply auto-stop grace to an adopted rejected user Stop', async () => {
      const nativeStop = deferred<unknown>();
      const monotonicNow = jest.spyOn(performance, 'now').mockReturnValue(1_000);
      const { view } = await renderRecorder();
      await startRecording();
      mockRecorder.stop.mockReturnValueOnce(nativeStop.promise);
      mockRecorder.uri = RECORDING_URI;
      mockRecorder.isRecording = false;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 5_000,
      };

      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL);
      });
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        nativeStop.reject(new Error('native stop rejected after completion'));
        await flushMicrotasks();
      });
      await stop;
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();

      monotonicNow.mockReturnValue(1_001);
      let nextStart!: Promise<void>;
      await act(() => {
        nextStart = invokePressHandler(view, START_LABEL);
      });
      await flushAct();
      expect(mockRecorder.record).toHaveBeenCalledTimes(2);
      await nextStart;
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
    });

    it('rejects a captured recorded-phase mic press after Start becomes blocked', async () => {
      const { view, props } = await renderRecorder();
      await recordAndStop();
      const staleMic = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      await view.rerender(<Recorder {...props} disabled />);
      await flushAct();

      await act(async () => {
        await Promise.resolve(staleMic());
        await flushMicrotasks();
      });

      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });
  });

  describe('idle rendering and recording lifecycle', () => {
    it('starts eligible mount recovery within a bounded microtask turn', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 93 },
      });

      const { props } = await renderMetadataRecorder();

      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
      });
      expect(props.onResultWithMetadata).toHaveBeenCalledWith(
        { parsed: { score: 93 } },
        { requestId: REQUEST_ID },
      );
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

    it('stops scoped native status polling as soon as recording ends', async () => {
      jest.useFakeTimers();
      await renderRecorder();
      await startRecording();
      await act(async () => {
        jest.advanceTimersByTime(200);
        await flushMicrotasks();
      });
      expect(mockRecorder.getStatus).toHaveBeenCalled();

      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      const readsAfterStop = mockRecorder.getStatus.mock.calls.length;

      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });
      expect(mockRecorder.getStatus).toHaveBeenCalledTimes(readsAfterStop);
    });

    it('does not let a nonterminal native update satisfy the completion wait', async () => {
      jest.useFakeTimers();
      const { view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      emitRecordingStatus({ url: RECORDING_URI });
      mockRecorder.stop.mockImplementationOnce(async () => {
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
        mockRecorder.uri = RECORDING_URI;
      });

      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL);
      });
      await flushAct();
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(499);
        await flushMicrotasks();
      });
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(1);
        await stop;
      });
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it('settles an authoritative terminal waiter before its fallback deadline', async () => {
      jest.useFakeTimers();
      const { view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      mockRecorder.stop.mockImplementationOnce(async () => {
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
        mockRecorder.uri = RECORDING_URI;
      });
      let stop!: Promise<void>;
      let settled = false;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL);
        void stop.then(() => {
          settled = true;
        });
      });
      await flushAct();

      try {
        await act(async () => {
          emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
          await flushMicrotasks();
        });
        expect(settled).toBe(true);
        expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      } finally {
        await act(async () => {
          jest.advanceTimersByTime(500);
          await stop;
          await flushMicrotasks();
        });
      }
    });

    it('publishes authoritative auto-completion within a bounded render turn', async () => {
      jest.useFakeTimers();
      await renderRecorder();
      await startRecording();
      mockRecorder.isRecording = false;
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 5_000,
        url: RECORDING_URI,
      };

      try {
        await act(async () => {
          emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
          await flushMicrotasks();
        });
        expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      } finally {
        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          await flushMicrotasks();
          jest.advanceTimersByTime(500);
          await flushMicrotasks();
        });
      }
    });

    it('does not publish a terminal status update while lifecycle disposal suppresses it', async () => {
      const nativeStop = deferred<void>();
      mockRecorder.stop.mockReturnValueOnce(nativeStop.promise);
      await renderRecorder();
      await startRecording();
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      mockRecorder.getStatus.mockClear();

      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });
      try {
        expect(mockRecorder.getStatus).not.toHaveBeenCalled();
      } finally {
        await act(async () => {
          nativeStop.resolve();
          await flushMicrotasks();
        });
      }
    });

    it('publishes terminal status changes for successive auto-completed takes', async () => {
      const secondUri = 'file:///recordings/second-auto-complete.m4a';
      await renderRecorder();
      await startRecording();
      mockRecorder.isRecording = false;
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 5_000,
        url: RECORDING_URI,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      mockRecorder.prepareToRecordAsync.mockImplementationOnce(async () => {
        mockRecorder.uri = secondUri;
      });
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      mockRecorder.isRecording = false;
      mockRecorder.uri = secondUri;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 5_000,
        url: secondUri,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: secondUri });
        await flushMicrotasks();
      });

      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
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

      expect(onInteractionLockChange.mock.calls).toEqual([[false]]);
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
      const { props } = await renderRecorder();
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
        expect.any(Function),
      );
      const installedStatusListeners = asMock(useAudioRecorder).mock.calls.map((call) => call[1]);
      expect(new Set(installedStatusListeners).size).toBe(1);
      expect(mockRecorder.getStatus).toHaveBeenCalled();
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
      expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errStartFailed'));
      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
    });

    it('stops submitted-recording playback before preparing the microphone', async () => {
      const stopPlayback = jest.fn(async () => undefined);
      await claimPlaybackOwner(Symbol('submitted-recording'), stopPlayback);
      expect(getSubmittedRecordingPlaybackActive()).toBe(true);

      await renderRecorder();
      await startRecording();

      expect(stopPlayback).toHaveBeenCalledTimes(1);
      expect(getSubmittedRecordingPlaybackActive()).toBe(false);
      expect(stopPlayback.mock.invocationCallOrder[0]).toBeLessThan(
        mockRecorder.prepareToRecordAsync.mock.invocationCallOrder[0],
      );
    });

    it('publishes and renders an operation lock while Start permission is unresolved', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const onInteractionLockChange = jest.fn();
      const { view } = await renderRecorder({ onInteractionLockChange });
      onInteractionLockChange.mockClear();

      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: true,
      });

      await act(async () => {
        permission.resolve({ granted: true });
        await start;
      });
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('balances synchronous interaction locks across successive fast Start failures', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockRejectedValue(
        new Error('permission bridge unavailable'),
      );
      const onInteractionLockChange = jest.fn();
      const { view } = await renderRecorder({ onInteractionLockChange });
      const start = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      onInteractionLockChange.mockClear();

      await act(async () => {
        await Promise.resolve(start());
        await Promise.resolve(start());
      });

      expect(onInteractionLockChange.mock.calls).toEqual([[true], [false], [true], [false]]);
    });

    it('does not publish an operation from a captured Start handler after unmount', async () => {
      const onInteractionLockChange = jest.fn();
      const { view } = await renderRecorder({ onInteractionLockChange });
      const staleStart = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      await view.unmount();
      await flushAct();
      onInteractionLockChange.mockClear();

      await act(async () => {
        await Promise.resolve(staleStart());
      });

      expect(onInteractionLockChange).not.toHaveBeenCalled();
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
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

    it('blocks a captured Start handler when the external mutation guard turns on', async () => {
      const { props, view } = await renderRecorder({ isStartBlocked: () => false });
      const staleStart = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      const isStartBlocked = jest.fn(() => true);
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();

      await view.rerender(<Recorder {...props} isStartBlocked={isStartBlocked} />);
      await flushAct();
      await act(async () => {
        await Promise.resolve(staleStart());
      });

      expect(isStartBlocked).toHaveBeenCalledTimes(1);
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
      const allowStart = jest.fn(() => false);
      await view.rerender(<Recorder {...props} disabled isStartBlocked={allowStart} />);
      await flushAct();
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: true,
      });
      await act(async () => {
        await Promise.resolve(staleStart());
      });
      expect(allowStart).not.toHaveBeenCalled();
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('fails closed when a captured Start guard throws', async () => {
      const { props, view } = await renderRecorder({ isStartBlocked: () => false });
      const staleStart = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      await view.rerender(
        <Recorder
          {...props}
          isStartBlocked={() => {
            throw new Error('sibling mutation was removed');
          }}
        />,
      );
      await flushAct();

      await act(async () => {
        await Promise.resolve(staleStart());
      });

      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
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

      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
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

    it('shows a prompt denial only after the permission dialog returns to foreground', async () => {
      jest.useFakeTimers();
      const permission = deferred<{ granted: boolean; canAskAgain: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: true,
      });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view } = await renderRecorder();

      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      await waitFor(() =>
        expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        permission.resolve({ granted: false, canAskAgain: false });
        await flushMicrotasks();
      });
      await act(async () => {
        jest.advanceTimersByTime(2_000);
        await start;
        await flushMicrotasks();
      });
      expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(screen.getByText(t('recorder.permissionBody'))).toBeTruthy();
      expect(screen.getByText(t('recorder.openSettings'))).toBeTruthy();
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('defers a granted prompt until a late foreground return', async () => {
      jest.useFakeTimers();
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();

      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
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

      // The learner really did leave: nothing records or switches audio mode
      // while the app remains inactive.
      expect(setAudioModeAsync).not.toHaveBeenCalledWith(
        expect.objectContaining({ allowsRecording: true }),
      );
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();

      // The bounded waiter releases its listener/operation, but remembers the
      // granted response so the original tap resumes automatically on active.
      expect(appStateSubscriptionRemove).toHaveBeenCalledTimes(1);
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });
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
      await waitFor(() => expect(screen.getByText(t('recorder.permissionRetryBody'))).toBeTruthy());

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    });

    it('times out a start invoked while the app is already inactive', async () => {
      jest.useFakeTimers();
      const { view, props } = await renderRecorder();
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'inactive',
      });
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });

      await act(async () => {
        jest.advanceTimersByTime(2_000);
        await start;
        await flushMicrotasks();
      });

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('locks recovery when start preflight cannot read durable metadata', async () => {
      const { props } = await renderRecorder();
      asMock(loadPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));

      await fireEvent.press(screen.getByLabelText(START_LABEL));

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUnavailable')),
      );
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
    });

    it('opens device settings after microphone permission is permanently denied', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: false,
      });
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
      openSettings.mockClear();
      await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await fireEvent.press(await screen.findByText(t('recorder.openSettings')));

      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(openSettings).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('rechecks permission after Settings and announces a grant without auto-recording', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync)
        .mockResolvedValueOnce({ granted: false, canAskAgain: false })
        .mockResolvedValueOnce({ granted: true });
      const announce = jest
        .spyOn(AccessibilityInfo, 'announceForAccessibility')
        .mockImplementation(() => undefined);
      await renderRecorder();
      await fireEvent.press(screen.getByLabelText(START_LABEL));
      expect(await screen.findByText(t('recorder.permissionBody'))).toBeTruthy();

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      expect(screen.queryByText(t('recorder.permissionBody'))).toBeNull();
      expect(screen.queryByText(t('recorder.openSettings'))).toBeNull();
      expect(announce).toHaveBeenCalledWith(t('recorder.permissionGranted'));
      expect(mockRecorder.record).not.toHaveBeenCalled();
      announce.mockRestore();
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
        minHeight: layout.minimumTarget,
        marginTop: 10,
        alignSelf: 'center',
        justifyContent: 'center',
        borderRadius: radii.button,
        paddingHorizontal: spacing.ml,
        borderWidth: 1,
        borderColor: colors.primary,
      });
      expect(flattenedStyle(getSettingsButton()).opacity).toBeUndefined();

      await fireEvent(getSettingsButton(), 'responderGrant', responderEvent());
      expect(openSettings).not.toHaveBeenCalled();
      expect(flattenedStyle(getSettingsButton()).backgroundColor).toBe(colors.primaryLight);
      await fireEvent(getSettingsButton(), 'responderTerminate', responderEvent());
      expect(openSettings).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(flattenedStyle(getSettingsButton()).backgroundColor).toBeUndefined(),
      );

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

    it('reports an error without disturbing another audio session when the permission check fails', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockRejectedValue(
        new Error('native permission failure'),
      );
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(setAudioModeAsync).not.toHaveBeenCalled();
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
        interruptionMode: 'doNotMix',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
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
        interruptionMode: 'doNotMix',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
      });
      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(mockRecorder.record).toHaveBeenCalledTimes(2));
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
    });

    it('keeps auto-stop tap grace when the browser stop rejects after finalizing', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.uri = RECORDING_URI;
          mockRecorder.isRecording = false;
          throw new Error('browser recorder already stopped');
        });
        await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = 120_000;

        await act(async () => {
          jest.advanceTimersByTime(120_000);
          await flushMicrotasks();
        });
        await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

        await fireEvent.press(screen.getByLabelText(START_LABEL));
        await flushAct();
        expect(mockRecorder.record).toHaveBeenCalledTimes(1);
        expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('rejects an Android stop that resolves but reports its native failure by status event', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.uri = RECORDING_URI;
          mockRecorder.isRecording = false;
          emitRecordingStatus({
            isFinished: true,
            hasError: true,
            error: 'MediaRecorder.stop failed',
            url: RECORDING_URI,
          });
          return { url: null };
        });
        const { props } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = 5_000;

        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed')),
        );

        expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
        expect(deletedRecordingUris()).toContain(RECORDING_URI);
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
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

    it('rejects a zero-byte recording even when the native URI exists', async () => {
      asMock(File).mockImplementation((uri: string) => ({
        uri,
        exists: true,
        size: 0,
        delete: jest.fn(),
        arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
      }));
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
        const monotonicNow = jest.spyOn(performance, 'now').mockReturnValue(1_000);
        asMock(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
        const { props } = await renderRecorder();
        await startRecording();

        mockRecorderState.durationMillis = 100;
        monotonicNow.mockReturnValue(1_000 + wallDuration);

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
        interruptionMode: 'doNotMix',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
    });

    it('retries audio-mode restoration once before releasing its global owner', async () => {
      let restoreAttempts = 0;
      asMock(setAudioModeAsync).mockImplementation(
        async ({ allowsRecording }: { allowsRecording: boolean }) => {
          if (allowsRecording) return;
          restoreAttempts += 1;
          if (restoreAttempts === 1) throw new Error('transient audio-session failure');
        },
      );
      const { props } = await renderRecorder();

      await recordAndStop();

      expect(restoreAttempts).toBe(2);
      expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errAudioReset'));
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it('reports one foreground error after both audio-mode restore attempts fail', async () => {
      asMock(setAudioModeAsync).mockImplementation(
        async ({ allowsRecording }: { allowsRecording: boolean }) => {
          if (!allowsRecording) throw new Error('audio session would not reset');
        },
      );
      const { props } = await renderRecorder();

      await recordAndStop();

      expect(setAudioModeAsync).toHaveBeenCalledTimes(3);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errAudioReset'));
      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it('suppresses audio-reset reporting when failed Start cleanup requested no notification', async () => {
      asMock(setAudioModeAsync).mockImplementation(
        async ({ allowsRecording }: { allowsRecording: boolean }) => {
          if (!allowsRecording) throw new Error('audio session would not reset');
        },
      );
      mockRecorder.prepareToRecordAsync.mockRejectedValue(new Error('prepare failed'));
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errAudioReset'));
      expect(props.onError).toHaveBeenCalledTimes(1);
    });

    it('joins overlapping user-stop and lifecycle audio restoration', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      const nativeStop = deferred<void>();
      const restore = deferred<void>();
      try {
        mockRecorder.stop.mockReturnValueOnce(nativeStop.promise);
        const { view } = await renderRecorder();
        await startRecording();
        mockRecorder.uri = RECORDING_URI;
        mockRecorderState.durationMillis = 5_000;
        asMock(setAudioModeAsync).mockImplementation(
          ({ allowsRecording }: { allowsRecording: boolean }) =>
            allowsRecording ? Promise.resolve() : restore.promise,
        );

        let userStop!: Promise<void>;
        await act(() => {
          userStop = invokePressHandler(view, STOP_LABEL);
        });
        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          nativeStop.resolve();
          await flushMicrotasks();
        });
        expect(
          asMock(setAudioModeAsync).mock.calls.filter(
            ([options]) => !(options as { allowsRecording: boolean }).allowsRecording,
          ),
        ).toHaveLength(1);

        await act(async () => {
          restore.resolve();
          await userStop;
          await flushMicrotasks();
        });
        expect(
          asMock(setAudioModeAsync).mock.calls.filter(
            ([options]) => !(options as { allowsRecording: boolean }).allowsRecording,
          ),
        ).toHaveLength(1);
      } finally {
        restore.resolve();
        nativeStop.resolve();
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('waits for a stale instance to restore audio mode before a new instance records', async () => {
      const restored = deferred<void>();
      asMock(setAudioModeAsync).mockImplementation(
        ({ allowsRecording }: { allowsRecording: boolean }) =>
          allowsRecording ? Promise.resolve() : restored.promise,
      );
      const first = await renderRecorder();
      await startRecording();
      await first.view.unmount();
      await waitFor(() =>
        expect(setAudioModeAsync).toHaveBeenCalledWith(
          expect.objectContaining({ allowsRecording: false }),
        ),
      );

      const second = await renderRecorder();
      let nextStart!: Promise<void>;
      await act(() => {
        nextStart = invokePressHandler(second.view, START_LABEL);
      });
      await flushAct();
      expect(
        asMock(setAudioModeAsync).mock.calls.filter(
          ([options]) => (options as { allowsRecording: boolean }).allowsRecording,
        ),
      ).toHaveLength(1);

      await act(async () => {
        restored.resolve();
        await nextStart;
        await flushMicrotasks();
      });

      expect(
        asMock(setAudioModeAsync).mock.calls.filter(
          ([options]) => (options as { allowsRecording: boolean }).allowsRecording,
        ),
      ).toHaveLength(2);
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('allows only one recorder instance to acquire the global audio session', async () => {
      const firstError = jest.fn();
      const secondError = jest.fn();
      const first = recorderTestProps({ onError: firstError });
      const second = recorderTestProps({ onError: secondError });
      await render(
        <>
          <Recorder {...first} />
          <Recorder {...second} />
        </>,
      );
      await flushAct();
      await flushAct();
      const startButtons = screen.getAllByLabelText(START_LABEL);
      const firstStart = compositePressablePropsForNode(startButtons[0]).onPress as () => unknown;
      const secondStart = compositePressablePropsForNode(startButtons[1]).onPress as () => unknown;

      await act(async () => {
        await Promise.all([Promise.resolve(firstStart()), Promise.resolve(secondStart())]);
        await flushMicrotasks();
      });

      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      expect(firstError.mock.calls.length + secondError.mock.calls.length).toBe(1);
      expect([...firstError.mock.calls, ...secondError.mock.calls]).toContainEqual([
        t('recorder.errStartFailed'),
      ]);
    });

    it('fails a queued start closed when the owning instance never releases the audio session', async () => {
      jest.useFakeTimers();
      const firstError = jest.fn();
      const secondError = jest.fn();
      const first = recorderTestProps({ onError: firstError });
      const second = recorderTestProps({ onError: secondError });
      await render(
        <>
          <Recorder {...first} />
          <Recorder {...second} />
        </>,
      );
      await flushAct();
      // The first instance acquires the module-level audio session; its
      // release promise stays pending while it holds it.
      const startButtons = screen.getAllByLabelText(START_LABEL);
      const firstStart = compositePressablePropsForNode(startButtons[0]).onPress as () => unknown;
      await act(async () => {
        await firstStart();
        await flushMicrotasks();
      });
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);

      // The second instance's start queues on that release promise. A hung
      // native restore must fail this start closed after the bounded wait —
      // never lock the controls on an unresolved promise forever.
      const secondStart = compositePressablePropsForNode(startButtons[1]).onPress as () => unknown;
      await act(async () => {
        const queued = Promise.resolve(secondStart());
        await flushMicrotasks();
        await jest.advanceTimersByTimeAsync(10_000);
        await queued;
      });
      expect(secondError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);

      // Real timers for cleanup so the first instance's stop/restore pipeline
      // settles naturally and the module-level session owner is released for
      // the tests that follow.
      jest.useRealTimers();
      const stopButtons = screen.getAllByLabelText(STOP_LABEL);
      const firstStop = compositePressablePropsForNode(stopButtons[0]).onPress as () => unknown;
      await act(async () => {
        await firstStop();
      });
      await waitFor(() => expect(screen.getAllByText(SUBMIT_TEXT).length).toBeGreaterThan(0));
      expect(firstError).not.toHaveBeenCalled();
    });

    it('serializes overlapping stop handlers and rejects a stale stop handler', async () => {
      const nativeStop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await nativeStop.promise;
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
      });
      const { view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      // The record button receives stopRecording directly, so unlike the
      // Send Answer void wrapper, this captured callback is awaitable.
      const stopHandler = compositePressableProps(view, STOP_LABEL).onPress as () => Promise<void>;
      asMock(setAudioModeAsync).mockClear();

      let firstStop!: Promise<void>;
      let overlappingStop!: Promise<void>;
      await act(() => {
        firstStop = stopHandler();
        overlappingStop = stopHandler();
      });
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
        interruptionMode: 'doNotMix',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
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

      mockRecorder.prepareToRecordAsync.mockImplementationOnce(async () => {
        mockRecorder.uri = secondUri;
      });
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = secondUri;
        emitRecordingStatus({ isFinished: true, url: secondUri });
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

    it('does not let a timed-out prior terminal event poison the next take', async () => {
      jest.useFakeTimers();
      const secondUri = 'file:///recordings/second-answer.m4a';
      const stopWithoutEvent = (uri: string) => {
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
        mockRecorder.uri = uri;
      };
      mockRecorder.stop.mockImplementationOnce(async () => stopWithoutEvent(RECORDING_URI));
      const { props, view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      let firstStop!: Promise<void>;
      await act(() => {
        firstStop = invokePressHandler(view, STOP_LABEL);
      });
      await flushAct();
      await act(async () => {
        jest.advanceTimersByTime(500);
        await firstStop;
        await flushMicrotasks();
      });
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();

      mockRecorder.prepareToRecordAsync.mockImplementationOnce(async () => {
        mockRecorder.uri = secondUri;
      });
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      mockRecorderState.durationMillis = 5_000;

      const secondNativeStop = deferred<void>();
      mockRecorder.stop.mockImplementationOnce(async () => {
        await secondNativeStop.promise;
        stopWithoutEvent(secondUri);
      });
      let secondStop!: Promise<void>;
      await act(() => {
        secondStop = invokePressHandler(view, STOP_LABEL);
      });
      await act(async () => {
        // Take A's event crosses the bridge after take B has begun. It must be
        // consumed by A's timeout quarantine, not B's completion slot.
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        secondNativeStop.resolve();
        await flushMicrotasks();
        emitRecordingStatus({ isFinished: true, url: secondUri });
        await secondStop;
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        secondUri,
        {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('uses the live recorder state to quarantine a late null-URI take', async () => {
      jest.useFakeTimers();
      const secondUri = 'file:///recordings/quarantine-current.m4a';
      const { props, view } = await renderRecorder();
      const setRecorderUri = await recordTakeWithNullUriQuarantine(view);
      mockRecorder.prepareToRecordAsync.mockImplementationOnce(async () => {
        setRecorderUri(secondUri);
      });
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      mockRecorderState.durationMillis = 5_000;

      emitRecordingStatus({
        isFinished: true,
        url: 'file:///recordings/late-unknown-uri.m4a',
      });
      mockRecorder.stop.mockImplementationOnce(async () => {
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
        setRecorderUri(secondUri);
      });
      let stop!: Promise<void>;
      await act(() => {
        stop = invokePressHandler(view, STOP_LABEL);
      });
      await flushAct();
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: secondUri });
        await stop;
      });

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        secondUri,
        {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('treats an unreadable live recording flag as a current terminal failure', async () => {
      jest.useFakeTimers();
      const secondUri = 'file:///recordings/unreadable-live-state.m4a';
      const { props, view } = await renderRecorder();
      const setRecorderUri = await recordTakeWithNullUriQuarantine(view);
      mockRecorder.prepareToRecordAsync.mockImplementationOnce(async () => {
        setRecorderUri(secondUri);
      });
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      Object.defineProperty(mockRecorder, 'isRecording', {
        configurable: true,
        get: () => {
          throw new Error('native recording state unavailable');
        },
        set: (_recording: boolean) => undefined,
      });
      mockRecorder.stop.mockImplementationOnce(async () => {
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
      });

      await act(async () => {
        emitRecordingStatus({
          hasError: true,
          url: 'file:///recordings/current-terminal-error.m4a',
        });
        await flushMicrotasks();
      });
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errDeviceInterrupted'));
      await act(async () => {
        jest.advanceTimersByTime(500);
        await flushMicrotasks();
      });
    });

    it('adopts the take-scoped status URL when neither the event nor the recorder reports one', async () => {
      jest.useFakeTimers();
      const statusUri = 'file:///recordings/take-scoped-status-url.m4a';
      mockRecorder.stop.mockImplementationOnce(async () => {
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
      });
      const { props } = await renderRecorder();
      await startRecording();
      // The 200ms status poll must publish this take's URL for the scoped
      // fallback: neither the terminal event nor the stopped recorder will
      // report one.
      mockRecorderState = {
        ...mockRecorderState,
        url: statusUri,
        durationMillis: 5_000,
      };
      await act(async () => {
        jest.advanceTimersByTime(250);
        await flushMicrotasks();
      });
      Object.defineProperty(mockRecorder, 'uri', {
        configurable: true,
        get: () => null,
        set: (_uri: string | null) => undefined,
      });

      // Auto-stop shape: no operation is in flight, the recorder reports it
      // stopped, and the terminal event carries no URL — only the scoped
      // status snapshot can resolve the take.
      mockRecorder.isRecording = false;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: null });
        await flushMicrotasks();
      });

      // The completion-adoption fallback resolved the take through the
      // generation-scoped status URL instead of losing the recording.
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('accepts a current missing-URL terminal event when the older quarantined event never arrives', async () => {
      jest.useFakeTimers();
      const secondUri = 'file:///recordings/current-without-event-url.m4a';
      const stopWithoutEvent = (uri: string) => {
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
        };
        mockRecorder.uri = uri;
      };
      mockRecorder.stop.mockImplementationOnce(async () => stopWithoutEvent(RECORDING_URI));
      const { props, view } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      let firstStop!: Promise<void>;
      await act(() => {
        firstStop = invokePressHandler(view, STOP_LABEL);
      });
      await flushAct();
      await act(async () => {
        jest.advanceTimersByTime(500);
        await firstStop;
      });

      mockRecorder.prepareToRecordAsync.mockImplementationOnce(async () => {
        mockRecorder.uri = secondUri;
      });
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      mockRecorderState.durationMillis = 5_000;
      mockRecorder.stop.mockImplementationOnce(async () => {
        stopWithoutEvent(secondUri);
        emitRecordingStatus({ isFinished: true, url: null });
      });

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
    });

    it('renders the live elapsed time while recording', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorderState = { ...mockRecorderState, durationMillis: 65_000 };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByText(recordingStatusText('1:05'))).toBeTruthy();
    });

    it('does not mistake an interrupt-paused recorder for a completed take', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();

      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: true,
        isRecording: false,
        durationMillis: 5_000,
        url: RECORDING_URI,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it.each([
      ['encoder error', { hasError: true, error: 'encoder failed' }],
      ['media-services reset', { mediaServicesDidReset: true }],
    ] as const)('tears down a recording after a terminal %s event', async (_case, event) => {
      const { props } = await renderRecorder();
      await startRecording();

      await act(async () => {
        emitRecordingStatus(event);
        await flushMicrotasks();
      });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errDeviceInterrupted')),
      );
      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['too short', 100, 1024, 'recorder.errTooShort'],
      ['empty', 5_000, 0, 'recorder.errSaveFailed'],
    ] as const)(
      'rejects a completed status-event take that is %s',
      async (_case, durationMillis, size, messageKey) => {
        asMock(File).mockImplementation((uri: string) => ({
          uri,
          exists: true,
          size,
          delete: jest.fn(),
          arrayBuffer: jest.fn(async () => new ArrayBuffer(0)),
        }));
        const { props } = await renderRecorder();
        await startRecording();
        mockRecorder.uri = RECORDING_URI;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
          durationMillis,
        };

        await act(async () => {
          emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
          await flushMicrotasks();
        });

        await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t(messageKey)));
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
        expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      },
    );

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
        canRecord: false,
        isRecording: false,
        durationMillis: 200_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });
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
        const monotonicNow = jest.spyOn(performance, 'now').mockReturnValue(1_000);
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
          canRecord: false,
          isRecording: false,
          durationMillis: 120_000,
          url: null,
          mediaServicesDidReset: false,
        };
        await act(async () => {
          emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
          await flushMicrotasks();
        });
        await view.rerender(<Recorder {...props} />);
        await flushAct();
        expect(screen.getByText(recordedStatusText('2:00'))).toBeTruthy();

        monotonicNow.mockReturnValue(1_000 + elapsed);
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

    it('does not apply auto-stop tap grace after the monotonic clock moves backward', async () => {
      const monotonicNow = jest.spyOn(performance, 'now').mockReturnValue(2_000);
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 5_000,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });
      await view.rerender(<Recorder {...props} />);
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      monotonicNow.mockReturnValue(1_999);
      await fireEvent.press(screen.getByLabelText(START_LABEL));

      expect(mockRecorder.record).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('uses its own web auto-stop timer and never passes forDuration to the browser', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        await renderRecorder();
        await startRecording();

        expect(mockRecorder.record).toHaveBeenCalledWith();
        expect(mockRecorder.record).not.toHaveBeenCalledWith({ forDuration: 120 });
        mockRecorderState.durationMillis = 5_000;
        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);

        await act(async () => {
          jest.advanceTimersByTime(120_000);
          await flushMicrotasks();
        });
        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('runs the web auto-stop timer and adopts the completed blob', async () => {
      jest.useFakeTimers();
      let monotonicTime = 1_000;
      jest.spyOn(performance, 'now').mockImplementation(() => monotonicTime);
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      const blobUri = 'blob:https://app.example/recordings/timed.webm';
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = blobUri;
        });
        const { props } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = 120_000;
        monotonicTime = 121_000;

        await act(async () => {
          jest.advanceTimersByTime(120_000);
          await flushMicrotasks();
        });

        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
        expect(props.onError).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.getByText(recordedStatusText('2:00'))).toBeTruthy());
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('polls recorder status only while a live recording needs it', async () => {
      const interval = jest.spyOn(globalThis, 'setInterval');
      const clear = jest.spyOn(globalThis, 'clearInterval');
      await renderRecorder();
      expect(interval).not.toHaveBeenCalledWith(expect.any(Function), 200);

      await startRecording();
      expect(interval).toHaveBeenCalledWith(expect.any(Function), 200);
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      expect(clear).toHaveBeenCalled();
    });

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
          canRecord: false,
          isRecording: false,
          durationMillis: 5_000,
          url: fallbackUri,
          mediaServicesDidReset: false,
        };
        await act(async () => {
          emitRecordingStatus({ isFinished: true });
          await flushMicrotasks();
        });
        await view.rerender(<Recorder {...props} />);
        await flushAct();
        expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

        expect(apiUploadAudio).toHaveBeenCalledWith(
          ENDPOINT,
          fallbackUri,
          {
            questionId: QUESTION_ID,
            requestId: REQUEST_ID,
            cycleId: CYCLE_ID,
            retainRecording: 'false',
          },
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
        canRecord: false,
        isRecording: false,
        durationMillis: 5_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true });
        await flushMicrotasks();
      });
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

    it('reports one discard after duplicate inactive and background notifications', async () => {
      const { props } = await renderRecorder();
      await startRecording();

      await act(async () => {
        for (const handler of appStateHandlers) handler('inactive');
        await flushMicrotasks();
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
      expect(props.onError).toHaveBeenCalledTimes(1);
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

    it('ignores an unavailable reduce-motion preference read', async () => {
      jest
        .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
        .mockRejectedValue(new Error('accessibility service unavailable'));

      await renderRecorder();

      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    });

    it('shares one native stop across repeated background notifications', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await stop.promise;
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
      });
      await renderRecorder();
      await startRecording();

      await act(async () => {
        for (const handler of appStateHandlers) {
          handler('background');
          handler('background');
        }
        await flushMicrotasks();
      });
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
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
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

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(apiFetch).not.toHaveBeenCalled();

      await act(async () => {
        stop.resolve();
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 98 } }));

      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
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
        canRecord: false,
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
        canRecord: false,
        isRecording: false,
        durationMillis: 30_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });
      await view.rerender(<Recorder {...props} />);
      await flushAct();
      expect(screen.getByText(recordedStatusText('0:30'))).toBeTruthy();

      // The phase already left 'recording': a later native URI belongs to no
      // take the learner made and must not silently replace the saved one.
      mockRecorder.uri = laterUri;
      mockRecorderState = {
        canRecord: false,
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
        {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('does not adopt a native URI while lifecycle cleanup is still in flight', async () => {
      const stop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => {
        await stop.promise;
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
      });
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, isRecording: true, durationMillis: 3_000 };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        canRecord: false,
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

    it('installs an interaction lock callback after mounting without one', async () => {
      const { view, props } = await renderRecorder();
      const callback = jest.fn();

      await view.rerender(<Recorder {...props} onInteractionLockChange={callback} />);
      await flushAct();

      expect(callback.mock.calls).toEqual([[false]]);
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
      await waitFor(() => expect(screen.getByText(t('recorder.permissionRetryBody'))).toBeTruthy());

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(screen.queryByText(t('recorder.permissionRetryBody'))).toBeNull();
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
        let staleStart!: Promise<void>;
        await act(() => {
          staleStart = invokePressHandler(view, START_LABEL);
        });
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

    it('abandons a granted system prompt when the recorder identity changed while it was open', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({
        granted: false,
        canAskAgain: true,
      });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderIdentityRaceRecorder();
      let staleStart!: Promise<void>;
      await act(() => {
        staleStart = invokePressHandler(view, START_LABEL);
      });
      await waitFor(() =>
        expect(AudioModule.requestRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );

      await view.rerender(
        <IdentityLayoutHarness
          recorderProps={{ ...props, questionId: OTHER_QUESTION_ID }}
          onRecorderLayout={() => permission.resolve({ granted: true })}
        />,
      );
      await staleStart;
      await flushAct();

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('abandons an in-flight start when the identity changes during audio-mode setup', async () => {
      const recordingMode = deferred<void>();
      asMock(setAudioModeAsync).mockImplementation(async (options: { allowsRecording: boolean }) =>
        options.allowsRecording ? recordingMode.promise : undefined,
      );
      const { view, props } = await renderRecorder();
      let staleStart!: Promise<void>;
      await act(() => {
        staleStart = invokePressHandler(view, START_LABEL);
      });
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
        interruptionMode: 'doNotMix',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('abandons and deletes an in-flight start when the identity changes during preparation', async () => {
      const preparation = deferred<void>();
      mockRecorder.prepareToRecordAsync.mockReturnValue(preparation.promise);
      const { view, props } = await renderRecorder();
      let staleStart!: Promise<void>;
      await act(() => {
        staleStart = invokePressHandler(view, START_LABEL);
      });
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
        interruptionMode: 'doNotMix',
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();

      // Disposing the stale prepared instance must release Android's native
      // preparation latch so the replacement identity can record immediately.
      mockRecorder.uri = null;
      await startRecording();
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(2);
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
    });

    it('releases stale native preparation even when disposal stop throws', async () => {
      const preparation = deferred<void>();
      mockRecorder.prepareToRecordAsync.mockReturnValue(preparation.promise);
      mockRecorder.stop.mockImplementation(async () => {
        emitRecordingStatus({
          isFinished: true,
          hasError: true,
          error: 'prepared recorder could not stop',
        });
        throw new Error('prepared recorder could not stop');
      });
      const { view, props } = await renderIdentityRaceRecorder();
      let staleStart!: Promise<void>;
      await act(() => {
        staleStart = invokePressHandler(view, START_LABEL);
      });
      await waitFor(() => expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1));

      await view.rerender(
        <IdentityLayoutHarness
          recorderProps={{ ...props, questionId: OTHER_QUESTION_ID }}
          onRecorderLayout={() => preparation.resolve()}
        />,
      );
      await staleStart;
      await flushAct();

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).not.toHaveBeenCalled();
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
        let staleStop!: Promise<void>;
        await act(() => {
          staleStop = invokePressHandler(view, STOP_LABEL);
        });
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
        // The stale stop promise and the identity cleanup are independent
        // consumers of the same native stop. Wait for the latter's state
        // publication instead of assuming their final microtasks are ordered.
        await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());
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
          emitRecordingStatus({ isFinished: true, url: blobUri });
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
        emitRecordingStatus({ isFinished: true, url: remoteUri });
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
      const { view, props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();
      asMock(File).mockImplementation((uri: string) => ({
        uri,
        exists: false,
        size: 0,
        delete: deleteFile,
      }));

      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      expect(File).toHaveBeenCalledWith(RECORDING_URI);
      expect(deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('shows an accessible default-off retention choice only during review and submits an explicit opt-in', async () => {
      await renderRecorder();
      expect(screen.queryByRole('switch', { name: t('recorder.saveRecordingLabel') })).toBeNull();

      await recordAndStop();
      const retentionSwitch = screen.getByRole('switch', {
        name: t('recorder.saveRecordingLabel'),
      });
      expect(retentionSwitch.props.value).toBe(false);
      expect(retentionSwitch.props.disabled).toBe(false);
      expect(retentionSwitch.props.accessibilityState).toEqual({ disabled: false });
      expect(retentionSwitch.props.accessibilityHint).toBe(t('recorder.saveRecordingHint'));
      expect(screen.getByText(t('recorder.saveRecordingHint'))).toBeTruthy();

      await fireEvent(retentionSwitch, 'valueChange', true);
      expect(
        screen.getByRole('switch', { name: t('recorder.saveRecordingLabel') }).props.value,
      ).toBe(true);
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));

      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      expect(savePendingAssessment).toHaveBeenCalledWith(
        expect.objectContaining({ retainRecording: true }),
      );
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        expect.objectContaining({ retainRecording: 'true' }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('locks the retention choice during a re-record operation and resets it for the new take', async () => {
      const permission = deferred<{ granted: boolean }>();
      const { view } = await renderRecorder();
      await recordAndStop();
      await fireEvent(
        screen.getByRole('switch', { name: t('recorder.saveRecordingLabel') }),
        'valueChange',
        true,
      );
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValueOnce(permission.promise);

      let rerecord!: Promise<void>;
      await act(() => {
        rerecord = invokeRolePressHandler(RERECORD_TEXT);
      });
      await flushAct();
      const lockedSwitch = screen.getByRole('switch', {
        name: t('recorder.saveRecordingLabel'),
      });
      expect(lockedSwitch.props.value).toBe(true);
      expect(lockedSwitch.props.disabled).toBe(true);
      expect(lockedSwitch.props.accessibilityState).toEqual({ disabled: true });
      await fireEvent(lockedSwitch, 'valueChange', false);
      expect(
        screen.getByRole('switch', { name: t('recorder.saveRecordingLabel') }).props.value,
      ).toBe(true);

      permission.resolve({ granted: true });
      await act(async () => {
        await rerecord;
        await flushMicrotasks();
      });
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      expect(
        screen.getByRole('switch', { name: t('recorder.saveRecordingLabel') }).props.value,
      ).toBe(false);
      expect(view.getByText(SUBMIT_TEXT)).toBeTruthy();
    });

    it('asks the host to reveal recorded review actions only after their layout commits', async () => {
      const onExpandedControlsLayout = jest.fn();
      await renderRecorder({ onExpandedControlsLayout });
      await recordAndStop();
      expect(onExpandedControlsLayout).not.toHaveBeenCalled();

      await fireEvent(screen.getByTestId('recorder-expanded-controls'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 180 } },
      });
      expect(onExpandedControlsLayout).toHaveBeenCalledTimes(1);
    });

    it('accepts expanded-control layout events without a host callback', async () => {
      await renderRecorder();
      await recordAndStop();

      await fireEvent(screen.getByTestId('recorder-expanded-controls'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 180 } },
      });
    });

    it('publishes expanded-control layout only to the latest callback prop', async () => {
      const first = jest.fn();
      const second = jest.fn();
      const { view, props } = await renderRecorder({ onExpandedControlsLayout: first });
      await recordAndStop();
      await view.rerender(<Recorder {...props} onExpandedControlsLayout={second} />);

      await fireEvent(screen.getByTestId('recorder-expanded-controls'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 180 } },
      });
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('asks the host to reveal upload controls after their layout commits', async () => {
      const onExpandedControlsLayout = jest.fn();
      asMock(apiRequestAudioUpload).mockReturnValue(new Promise(() => undefined));
      await renderRecorder({ onExpandedControlsLayout });
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy());

      expect(
        StyleSheet.flatten(screen.getByTestId('recorder-expanded-controls').props.style),
      ).toEqual({
        alignSelf: 'stretch',
        alignItems: 'center',
      });

      onExpandedControlsLayout.mockClear();
      await fireEvent(screen.getByTestId('recorder-expanded-controls'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 120 } },
      });
      expect(onExpandedControlsLayout).toHaveBeenCalledTimes(1);
    });

    it('labels a started assessment as Stop Waiting with its committed-request hint', async () => {
      const assessment = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockImplementation(
        (
          _endpoint: string,
          _uri: string,
          _fields: unknown,
          options?: { onRequestStarted?: () => void },
        ) => {
          options?.onRequestStarted?.();
          return assessment.promise;
        },
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      const stopWaiting = await screen.findByRole('button', {
        name: t('recorder.stopWaiting'),
      });
      expect(stopWaiting.props.accessibilityHint).toBe(t('recorder.stopWaitingHint'));
      expect(screen.queryByRole('button', { name: t('recorder.cancelSending') })).toBeNull();

      await act(async () => {
        assessment.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
    });

    it('labels an in-flight S3 transfer as Cancel Sending with its post-transfer hint', async () => {
      const objectUpload = deferred<void>();
      asMock(apiRequestAudioUpload).mockResolvedValue({
        mode: 's3',
        assessmentEndpoint: ENDPOINT,
        uploadUrl: 'https://s3.example.com/upload',
        uploadFields: { key: S3_AUDIO_KEY },
        audioKey: S3_AUDIO_KEY,
        contentType: 'audio/mp4',
        expiresIn: 300,
        maxBytes: 25 * 1024 * 1024,
      });
      asMock(apiPostPresignedAudio).mockReturnValue(objectUpload.promise);
      asMock(apiFetch).mockResolvedValue({ ok: true });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1));
      const cancel = screen.getByRole('button', { name: t('recorder.cancelSending') });
      expect(cancel.props.accessibilityHint).toBe(t('recorder.cancelAfterTransferHint'));
      expect(screen.queryByRole('button', { name: t('recorder.stopWaiting') })).toBeNull();

      await act(async () => {
        objectUpload.resolve(undefined);
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
    });

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

    it.each(['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native'] as const)(
      'uses Recorder endpoint %s for a fresh grant and direct durable submission',
      async (assessmentEndpoint) => {
        const { props } = await renderMetadataRecorder({ endpoint: assessmentEndpoint });
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await flushAct();

        expect(savePendingAssessment).toHaveBeenCalledWith({
          ownerId: OWNER_ID,
          endpoint: assessmentEndpoint,
          questionId: QUESTION_ID,
          ...(assessmentEndpoint === '/diagnostic/answer' ? {} : { cycleId: CYCLE_ID }),
          requestId: REQUEST_ID,
          createdAt: expect.any(Number),
          retainRecording: false,
          stage: 'prepared',
        });
        expect(markPendingAssessmentStage).toHaveBeenCalledWith(REQUEST_ID, 'direct-posting');
        expect(resolveAudioFileDescriptor).toHaveBeenCalledWith(RECORDING_URI, {
          signal: expect.any(AbortSignal),
        });
        expect(apiRequestAudioUpload).toHaveBeenCalledWith('audio/mp4', OWNER_ID, {
          assessmentEndpoint,
          signal: expect.any(AbortSignal),
        });
        expect(apiUploadAudio).toHaveBeenCalledWith(
          assessmentEndpoint,
          RECORDING_URI,
          {
            questionId: QUESTION_ID,
            requestId: REQUEST_ID,
            ...(assessmentEndpoint === '/diagnostic/answer' ? {} : { cycleId: CYCLE_ID }),
            retainRecording: 'false',
          },
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(props.parseResult).toHaveBeenCalledWith({ ok: true });
        expect(props.onResultWithMetadata).toHaveBeenCalledWith(
          { parsed: { ok: true } },
          { requestId: REQUEST_ID },
        );
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        );
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(deletedRecordingUris()).toContain(RECORDING_URI);
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

    it('does not upload after an account clear invalidates the captured handoff generation', async () => {
      asMock(capturePendingAssessmentGeneration).mockReturnValue(17);
      asMock(ensurePendingAssessment).mockResolvedValue(null);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errInfoNotSavedNotUploaded')),
      );

      expect(ensurePendingAssessment).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: OWNER_ID,
          endpoint: ENDPOINT,
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          stage: 'prepared',
        }),
        17,
      );
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('resubmits the same requestId after a 503, honoring the Retry-After delay', async () => {
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 1, { code: 'CAPACITY_BUSY' }))
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
        expect(call[2]).toEqual({
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        });
      }
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('returns the take after 503 backpressure outlasts the retry budget', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio).mockRejectedValue(
        new ApiError(503, 'capacity busy', 1, { code: 'CAPACITY_BUSY' }),
      );
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
        expect(call[2]).toEqual({
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        });
      }
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(`${t('error.busy')} ${t('wait.second')}`),
      );
      expect(props.onResult).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('does not in-band retry a bare 503 and spends the durable recovery-POST budget', async () => {
      mockStartedUploadFailure(new ApiError(503, 'gateway unavailable', 1));
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment)
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 90 },
      });

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 90 } }));

      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledWith(REQUEST_ID);
    });

    it('keeps recovery locked when reserving ambiguity after an HTTP response fails', async () => {
      mockStartedUploadFailure(new ApiError(502, 'gateway returned an invalid response'));
      asMock(claimPendingAssessmentRecoveryPost).mockRejectedValue(
        new Error('keychain unavailable'),
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate')),
      );
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it.each(['resolves', 'rejects'] as const)(
      'suppresses stale ambiguity reservation when it %s after backgrounding',
      async (outcome) => {
        const claim = deferred<boolean>();
        mockStartedUploadFailure(new ApiError(502, 'ambiguous gateway response'));
        asMock(claimPendingAssessmentRecoveryPost).mockReturnValue(claim.promise);
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() =>
          expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledWith(REQUEST_ID),
        );
        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          if (outcome === 'resolves') {
            claim.resolve(true);
          } else {
            claim.reject(new Error('keychain unavailable'));
          }
          await flushMicrotasks();
        });

        expect(props.onError).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(screen.queryByText(RECOVERING_TEXT)).toBeNull();
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

    it('does not in-band retry a pool-saturation 503 and returns the take', async () => {
      mockStartedUploadFailure(new ApiError(503, 'pool saturated', 5, { code: 'POOL_SATURATED' }));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(
          `${t('error.busy')} ${t('wait.seconds', { count: 5 })}`,
        ),
      );

      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it.each([
      ['PRACTICE_CYCLE_CLOSED', 409],
      ['STATE_CHANGED', 409],
      ['QUESTION_MISMATCH', 409],
      ['REQUEST_ID_REUSED', 409],
      ['DIAGNOSTIC_DONE', 400],
      ['ASSESSMENT_IN_PROGRESS', 409],
    ] as const)(
      'clears and refreshes canonical state immediately after %s without ambiguity polling',
      async (code, status) => {
        mockStartedUploadFailure(new ApiError(status, 'stable rejection', undefined, { code }));
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1));

        expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
        expect(apiFetch).not.toHaveBeenCalled();
        expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      },
    );

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
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        ),
      );
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      await flushAct();

      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'second' } }),
      );
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          OTHER_REQUEST_ID,
          expect.any(Number),
        ),
      );

      expect(apiUploadAudio).toHaveBeenNthCalledWith(
        2,
        ENDPOINT,
        RECORDING_URI,
        {
          questionId: QUESTION_ID,
          requestId: OTHER_REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(Crypto.randomUUID).toHaveBeenCalledTimes(2);
      // Starting a genuinely new take after the feedback owner has returned
      // clears only the Recorder's stale in-memory request id. Delivery itself
      // did not clear the durable feedback pointer.
      expect(asMock(clearPendingAssessment).mock.calls).toEqual([[REQUEST_ID]]);
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

    it('rejects a captured Submit while Re-record owns the recorded phase', async () => {
      const permission = deferred<{ granted: boolean }>();
      const { view } = await renderRecorder();
      await recordAndStop();
      const staleSubmit = compositePressablePropsForNode(
        screen.getByRole('button', { name: SUBMIT_TEXT }),
      ).onPress as () => unknown;
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      asMock(loadPendingAssessment).mockClear();
      asMock(ensurePendingAssessment).mockClear();
      asMock(apiRequestAudioUpload).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      await act(async () => {
        await Promise.resolve(staleSubmit());
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(ensurePendingAssessment).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();

      await act(async () => {
        permission.reject(new Error('permission read cancelled'));
        await flushMicrotasks();
      });
      expect(view.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('stops submission immediately when Cancel aborts an atomic handoff read', async () => {
      const handoff = deferred<PendingAssessment | null>();
      asMock(ensurePendingAssessment).mockReturnValue(handoff.promise);
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(ensurePendingAssessment).toHaveBeenCalledTimes(1));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await act(async () => {
        handoff.resolve(pendingRecord({ stage: 'prepared' }));
        await flushMicrotasks();
      });

      expect(resolveAudioFileDescriptor).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
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
        {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        },
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
        assessmentEndpoint: ENDPOINT,
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
            cycleId: CYCLE_ID,
            retainRecording: false,
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
            assessmentEndpoint: ENDPOINT,
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
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'prepared' }));

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

      expect(savePendingAssessment).not.toHaveBeenCalled();
      expect(apiUploadAudio).toHaveBeenCalledWith(
        ENDPOINT,
        RECORDING_URI,
        {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('recovers instead of uploading through a same-id reconciliation tombstone', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage: 'reconcile' }));
      asMock(ensurePendingAssessment).mockResolvedValue(pendingRecord({ stage: 'reconcile' }));

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1));

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    });

    it('clears a same-id cancelled prepared handoff before allowing a fresh submit', async () => {
      await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 'prepared', cancelRequested: true }),
      );
      asMock(ensurePendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 'prepared', cancelRequested: true }),
      );

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID));

      expect(apiRequestAudioUpload).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
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
        signal: expect.any(AbortSignal),
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
              signal: expect.any(AbortSignal),
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

    it('does not publish a contract error after its recovery callback backgrounds the app', async () => {
      const onRecoveryUnresolved = jest.fn(() => backgroundApp());
      const { props } = await renderRecorder({
        parseResult: () => {
          throw new ContractError();
        },
        onRecoveryUnresolved,
      });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(onRecoveryUnresolved).toHaveBeenCalledTimes(1));

      expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errCannotDisplay'));
      expect(props.onResult).not.toHaveBeenCalled();
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

    it('releases the controls even when the nothing-to-confirm error callback itself throws', async () => {
      const parserFailure = new Error('unexpected parser defect');
      const hostileError = jest.fn((message: string) => {
        if (message === t('recorder.errNothingToConfirm'))
          throw new Error('hostile screen callback');
      });
      await renderRecorder({
        parseResult: () => {
          throw parserFailure;
        },
        onError: hostileError,
      });
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(hostileError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );

      // The throwing callback must not strand the operation token before the
      // loading release: the recorder returns to idle and a fresh recording
      // can still start instead of latching the loading/recovering phase.
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      await fireEvent.press(screen.getByRole('button', { name: START_LABEL }));
      await waitFor(() => expect(screen.getByRole('button', { name: STOP_LABEL })).toBeTruthy());
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
        assessmentEndpoint: ENDPOINT,
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
        assessmentEndpoint: ENDPOINT,
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
      mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchFailureOnce(new ApiError(413, 'object rejected'));
      asMock(clearPendingAssessment).mockRejectedValue(new Error('keychain unavailable'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      await advancePolls(5);
      await waitFor(() => expect(screen.getByRole('button', { name: RERECORD_TEXT })).toBeTruthy());
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone'));
      const recordCallsBeforeRetry = mockRecorder.record.mock.calls.length;
      // The terminal recovery already removed its own tombstone. The retained
      // in-memory request id still has to be cleared before a new take starts.
      asMock(loadPendingAssessment).mockResolvedValue(null);

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

    it('retires an incompatible POST replay without entering recovery or reusing its request id', async () => {
      asMock(apiUploadAudio).mockRejectedValue(
        new ApiError(409, 'old result version', undefined, {
          code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
        }),
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('error.assessmentResultIncompatible')),
      );

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(
        asMock(clearPendingAssessment).mock.calls.filter(([requestId]) => requestId === REQUEST_ID),
      ).toHaveLength(1);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();
    });

    it('recovers the durable result after a network failure mid-upload', async () => {
      mockStartedUploadFailure(new ApiError(0, 'Could not connect to the server.'));
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

    it('reports an unrecoverable handoff when feedback-pointer marking fails after success', async () => {
      asMock(markPendingAssessmentFeedbackPending).mockResolvedValue(false);
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
            assessmentEndpoint: ENDPOINT,
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
        assessmentEndpoint: ENDPOINT,
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
        const markerFunction =
          resultKind === 'contract'
            ? markPendingAssessmentForReconciliation
            : markPendingAssessmentFeedbackPending;
        asMock(markerFunction).mockReturnValue(marker.promise);
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
          expect(markerFunction).toHaveBeenCalledWith(
            REQUEST_ID,
            ...(resultKind === 'contract' ? [] : [expect.any(Number)]),
          ),
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

    it('keeps controls locked until an aborted old upload settles before creating a new controller', async () => {
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

      // An abort-ignoring transport still owns an in-flight operation. It must
      // settle before the replacement identity may open another microphone or
      // upload controller.
      await fireEvent.press(screen.getByLabelText(START_LABEL));
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
      await act(async () => {
        oldUpload.resolve({ score: 1 });
        await flushMicrotasks();
      });
      expect(props.onResult).not.toHaveBeenCalled();
      expect(nextResult).not.toHaveBeenCalled();

      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(2));
      const currentSignal = asMock(apiUploadAudio).mock.calls[1][3].signal as AbortSignal;
      expect(currentSignal.aborted).toBe(false);

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

    it('reconciles the current identity on foreground after a stale upload finishes', async () => {
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

      // Restore lifecycle state, let the stale transport release its operation
      // ownership, then deliver the real foreground signal that owns recovery.
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        upload.resolve({ score: 95 });
        await flushMicrotasks();
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({
          parsed: { score: 97, recovered: true },
        }),
      );
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
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
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
      });
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

    it('stops resubmitting after exactly three capacity retries and returns the take', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio).mockRejectedValue(
        new ApiError(503, 'capacity busy', 1, { code: 'CAPACITY_BUSY' }),
      );
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
        expect(props.onError).toHaveBeenCalledWith(`${t('error.busy')} ${t('wait.second')}`),
      );

      expect(apiUploadAudio).toHaveBeenCalledTimes(4);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });

    it('waits out the full server-specified Retry-After before a capacity retry', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 6, { code: 'CAPACITY_BUSY' }))
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
        {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: 'false',
        },
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  describe('crash recovery', () => {
    it('ignores an online notification when no offline recovery is parked', async () => {
      await renderRecorder();
      const pendingReads = asMock(loadPendingAssessment).mock.calls.length;

      await act(async () => {
        onlineManager.setOnline(false);
        onlineManager.setOnline(true);
        await flushMicrotasks();
      });

      expect(asMock(loadPendingAssessment)).toHaveBeenCalledTimes(pendingReads);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('parks when a status transport observes known offline before its failure is caught', async () => {
      let online = true;
      jest.spyOn(onlineManager, 'isOnline').mockImplementation(() => online);
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockImplementation(async () => {
        online = false;
        throw new ApiError(0, 'network disconnected');
      });
      const { props } = await renderRecorder();

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(t('replay.failedBody')),
      );
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('parks a surviving take for an offline interval longer than the lease and resumes on reconnect', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord());
      mockStartedUploadFailure(new ApiError(0, 'connection interrupted'));
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();
      onlineManager.setOnline(false);

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(t('replay.failedBody')),
      );
      expect(apiFetch).not.toHaveBeenCalled();
      expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(6 * 60_000);
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([]);

      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 91 },
      });
      await act(async () => {
        onlineManager.setOnline(true);
        await flushMicrotasks();
      });

      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 91 } }));
      expect(deletedRecordingUris()).toEqual([RECORDING_URI]);
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('aborts a long recovery sleep as soon as reachability becomes offline', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(503, 'retry later', 120))
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 92 },
        });
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      await act(async () => {
        onlineManager.setOnline(false);
        await flushMicrotasks();
      });
      expect(screen.getByRole('alert')).toHaveTextContent(t('replay.failedBody'));

      await act(async () => {
        jest.advanceTimersByTime(6 * 60_000);
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();

      await act(async () => {
        onlineManager.setOnline(true);
        await flushMicrotasks();
      });
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 92 } }));
    });

    it('does not expose manual retry while an ambiguous handoff is still loading', async () => {
      const recoveryLoad = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(recoveryLoad.promise);
      mockStartedUploadFailure(new Error('transport outcome unknown'));
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 88 },
      });
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();

      await act(async () => {
        recoveryLoad.resolve(pendingRecord());
        await flushMicrotasks();
      });
    });

    it('does not manufacture deferred recovery after another instance releases its lease', async () => {
      const firstResult = deferred<unknown>();
      const firstProps = recorderTestProps();
      const secondProps = recorderTestProps({ onError: jest.fn() });
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(firstResult.promise);
      const view = await render(<Recorder key="lease-owner" {...firstProps} />);
      await flushAct();
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

      await view.rerender(
        <>
          <Recorder key="lease-owner" {...firstProps} />
          <Recorder key="lease-observer" {...secondProps} />
        </>,
      );
      await flushAct();
      asMock(loadPendingAssessment).mockClear();
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const startButtons = screen.getAllByLabelText(START_LABEL);
      const secondStart = compositePressablePropsForNode(startButtons[1]).onPress as () => unknown;
      let start!: Promise<unknown>;
      await act(() => {
        start = Promise.resolve(secondStart());
      });

      await act(async () => {
        firstResult.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 91 },
        });
        await flushMicrotasks();
        permission.reject(new Error('permission bridge unavailable'));
        await start;
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(secondProps.onError).toHaveBeenCalledWith(t('recorder.errStartFailed'));
    });

    it('does not arm manual retry while its own recovery loop is still active', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(new Promise(() => undefined));
      await renderRecorder();

      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      // A duplicate foreground notification from this Recorder must join the
      // live recovery, not mistake its own global lease for another instance
      // and expose a competing retry action.
      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
    });

    it('blocks recording until a delayed recovery read releases operation ownership', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });

      expect(onInteractionLockChange.mock.calls).toEqual([[false]]);
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: false,
      });

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
      await act(async () => {
        pending.resolve(null);
        await flushMicrotasks();
      });

      await startRecording();
      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('does not start recording while a delayed recovery storage read fails', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
      await act(async () => {
        pending.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUnavailable'));
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('does not start a recovery read while recording permission is still resolving', async () => {
      const permission = deferred<{ granted: boolean }>();
      const { view, props } = await renderRecorder();
      asMock(loadPendingAssessment).mockClear();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);

      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      for (const handler of appStateHandlers) handler('active');
      await flushAct();

      expect(apiFetch).not.toHaveBeenCalled();
      expect(loadPendingAssessment).not.toHaveBeenCalled();
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
        <Recorder
          {...props}
          endpoint="/diagnostic/answer"
          questionId={OTHER_QUESTION_ID}
          cycleId={undefined}
        />,
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
        signal: expect.any(AbortSignal),
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
        signal: expect.any(AbortSignal),
      });
      expect(props.parseResult).toHaveBeenCalledWith({ level: 'B1' });
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { level: 'B1' } });
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('retires an incompatible legacy diagnostic recovery and returns to a fresh answer', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ endpoint: '/diagnostic/answer' }),
      );
      asMock(apiFetch).mockRejectedValue(
        new ApiError(409, 'old result version', undefined, {
          code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
        }),
      );
      const { props } = await renderRecorder({ endpoint: '/diagnostic/answer' });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('error.assessmentResultIncompatible')),
      );
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
      });
      expect(clearPendingAssessment).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(apiPostPresignedAudio).not.toHaveBeenCalled();
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('keeps an incompatible legacy recovery locked when its tombstone cannot be cleared', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ endpoint: '/diagnostic/answer' }),
      );
      asMock(clearPendingAssessment).mockRejectedValue(new Error('keychain write failed'));
      asMock(apiFetch).mockRejectedValue(
        new ApiError(409, 'old result version', undefined, {
          code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
        }),
      );
      const { props } = await renderRecorder({ endpoint: '/diagnostic/answer' });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoClear')),
      );
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalledWith(t('error.assessmentResultIncompatible'));
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
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
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
      expect(clearPendingAssessment).not.toHaveBeenCalled();
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
          signal: expect.any(AbortSignal),
        });
        expect(asMock(apiFetch).mock.invocationCallOrder[0]).toBeGreaterThan(
          appStateSubscriptionRemove.mock.invocationCallOrder[0],
        );
        expect(matchingParser).toHaveBeenCalledTimes(1);
        expect(matchingParser).toHaveBeenCalledWith(response);
        expect(wrongParser).not.toHaveBeenCalled();
        expect(onResult).toHaveBeenCalledWith({ parser: savedMode, response });
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        );
        expect(clearPendingAssessment).not.toHaveBeenCalled();
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
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
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
      'keeps a completed recovery for another route locked when feedback-pointer persistence %s',
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
          asMock(markPendingAssessmentFeedbackPending).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentFeedbackPending).mockRejectedValue(
            new Error('keychain unavailable'),
          );
        }
        const { props } = await renderRecorder();
        asMock(AudioModule.getRecordingPermissionsAsync).mockClear();

        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate')),
        );

        expect(apiFetch).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledTimes(1);
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        );
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
      'suppresses an old-route feedback marker failure after the identity changes when it %s',
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
        asMock(markPendingAssessmentFeedbackPending).mockReturnValue(marker.promise);
        const { view, props } = await renderRecorder();
        await waitFor(() =>
          expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
            REQUEST_ID,
            expect.any(Number),
          ),
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
      'keeps a completed recovery locked when feedback-pointer persistence %s',
      async (failureMode) => {
        asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
        asMock(apiFetch).mockResolvedValue({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 99 },
        });
        if (failureMode === 'returns false') {
          asMock(markPendingAssessmentFeedbackPending).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentFeedbackPending).mockRejectedValue(
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
        cycleId: CYCLE_ID,
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
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledTimes(1);
      expect(clearPendingAssessment).not.toHaveBeenCalled();
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
        cycleId: CYCLE_ID,
        endpoint: ENDPOINT,
        parseResult: (data: unknown) => ({ parsed: data }),
        onError: jest.fn(),
        onRecoveryUnresolved: jest.fn(),
      };
      const view = await render(<Recorder key="first" {...sharedProps} onResult={firstResult} />);
      await flushAct();
      await waitFor(() => expect(firstResult).toHaveBeenCalledWith({ parsed: { score: 91 } }));
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        ),
      );
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
        cycleId: CYCLE_ID,
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
        cycleId: CYCLE_ID,
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

    it('aborts an invalidated recovery before its same-identity replacement starts', async () => {
      const currentStatus = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockImplementationOnce(
          (_path: string, { signal }: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              signal.addEventListener(
                'abort',
                () => reject(new DOMException('The operation was aborted.', 'AbortError')),
                { once: true },
              );
            }),
        )
        .mockReturnValueOnce(currentStatus.promise);
      const { props } = await renderRecorder();
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      const oldSignal = asMock(apiFetch).mock.calls[0][1].signal as AbortSignal;

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      expect(oldSignal.aborted).toBe(true);
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
        cycleId: CYCLE_ID,
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
        cycleId: CYCLE_ID,
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
      mockStartedUploadFailure(new ApiError(0, 'connection interrupted'));

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

      // The second recorder submits and remains in its durable-metadata read.
      const followerMic = () => screen.getAllByLabelText(RECORD_BUTTON_LABEL)[1];
      await fireEvent.press(followerMic());
      await waitFor(() => expect(screen.getAllByLabelText(STOP_LABEL)).toHaveLength(1));
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(followerMic());
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy());
      expect(loadPendingAssessment).toHaveBeenCalledTimes(4);

      // The first recorder claims the global lease during that window.
      await act(async () => {
        appStateHandlers[0]('active');
        await flushMicrotasks();
      });
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      expect(screen.getAllByText(RECOVERING_TEXT)).toHaveLength(1);

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
      expect(screen.getAllByRole('button', { name: t('common.tryAgain') })).toHaveLength(1);
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(followerResult).not.toHaveBeenCalled();
      expect(ownerResult).not.toHaveBeenCalled();

      await act(async () => {
        status.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 93 },
        });
        await flushMicrotasks();
      });
      await waitFor(() => expect(ownerResult).toHaveBeenCalledWith({ parsed: { score: 93 } }));
    });

    it('returns the surviving take for review when a conflicting claim was abandoned', async () => {
      jest.useFakeTimers();
      asMock(apiRequestAudioUpload).mockResolvedValue({
        mode: 's3',
        assessmentEndpoint: ENDPOINT,
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
      mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchFailureOnce(new ApiError(409, 'question mismatch'));
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
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

    it('retries foreground recovery after an invalidated storage read finishes unwinding', async () => {
      const staleRead = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockReturnValueOnce(staleRead.promise)
        .mockResolvedValueOnce(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 96 },
      });
      const { props } = await renderRecorder();
      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'background',
      });
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
      // The old SecureStore read still owns a token, so the foreground request
      // is deferred rather than racing it or being forgotten.
      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);

      await act(async () => {
        staleRead.resolve(pendingRecord());
        await flushMicrotasks();
      });

      await waitFor(() => expect(loadPendingAssessment).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 96 } }));
      expect(apiFetch).toHaveBeenCalledTimes(1);
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
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockReset().mockResolvedValue(abandonedHandoff);

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
        assessmentEndpoint: ENDPOINT,
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
      asMock(apiFetch).mockImplementation(
        async (path: string, options?: { onRequestStarted?: () => void }) => {
          if (path === ENDPOINT) {
            options?.onRequestStarted?.();
            assessmentPostCount += 1;
            if (assessmentPostCount === 1) {
              throw new ApiError(0, 'assessment response disconnected');
            }
            return { unsupported: true };
          }
          throw new ApiError(404, 'not submitted');
        },
      );
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
      // Recovery uses monotonic elapsed time, so a wall-clock jump cannot
      // manufacture the ten-second anti-race window.
      jest.setSystemTime(startedAt.getTime() + 10_000);
      await advancePolls(4);

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errCannotDisplay')),
      );
      const recoveryStatusCalls = asMock(apiFetch).mock.calls.filter(
        ([path]) => path === `/assessments/${REQUEST_ID}`,
      );
      const assessmentPosts = asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT);
      expect(recoveryStatusCalls).toHaveLength(6);
      expect(assessmentPosts).toHaveLength(2);
      for (const [, options] of assessmentPosts) {
        expect(options).toMatchObject({
          method: 'POST',
          body: {
            questionId: QUESTION_ID,
            requestId: REQUEST_ID,
            cycleId: CYCLE_ID,
            audioKey: S3_AUDIO_KEY,
          },
          timeoutMs: AUDIO_TIMEOUT_MS,
        });
        expect(options.signal).toBeInstanceOf(AbortSignal);
      }
      expect(assessmentPosts[0][1].onRequestStarted).toEqual(expect.any(Function));
      expect(assessmentPosts[1][1].onRequestStarted).toEqual(expect.any(Function));
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

    it('never re-posts a durably cancelled S3 handoff after remount', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({
          stage: 's3-granted',
          audioKey: S3_AUDIO_KEY,
          cancelRequested: true,
        }),
      );
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'not submitted'));
      const { props } = await renderRecorder();

      await advancePolls(5);

      expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(0);
      expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onResult).not.toHaveBeenCalled();
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
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoClear'));
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      },
    );

    it('resubmits the same S3 key and request id after a crash before assessment POST', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({
          stage: 's3-granted',
          audioKey: S3_AUDIO_KEY,
          retainRecording: true,
        }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchResultOnce({ score: 77 });
      const { props } = await renderMetadataRecorder();

      // Do not race a possibly-started original POST on the first 404.
      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(5);

      expect(props.onResultWithMetadata).toHaveBeenCalledWith(
        { parsed: { score: 77 } },
        { requestId: REQUEST_ID },
      );
      expect(apiFetch).toHaveBeenNthCalledWith(1, `/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
      });
      expect(apiFetch).toHaveBeenNthCalledWith(7, ENDPOINT, {
        method: 'POST',
        body: {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: true,
          audioKey: S3_AUDIO_KEY,
        },
        signal: expect.any(AbortSignal),
        timeoutMs: AUDIO_TIMEOUT_MS,
        onRequestStarted: expect.any(Function),
      });
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it.each(['returns false', 'rejects'] as const)(
      'does not replay a successful S3 resubmission when feedback-pointer persistence %s',
      async (failureMode) => {
        jest.useFakeTimers();
        asMock(loadPendingAssessment).mockResolvedValue(
          pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
        );
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        mockStartedApiFetchResultOnce({ score: 84 });
        if (failureMode === 'returns false') {
          asMock(markPendingAssessmentFeedbackPending).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentFeedbackPending).mockRejectedValue(
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
      mockStartedApiFetchResultOnce({ unsupported: true });
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

    it('hands a resubmitted S3 result for another route to the mounted replay provider', async () => {
      jest.useFakeTimers();
      const pendingEndpoint = '/diagnostic/answer' as const;
      asMock(notifyPendingAssessmentReplayReady).mockReturnValueOnce(true);
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
      mockStartedApiFetchResultOnce({ score: 77 });
      const { props } = await renderRecorder();

      await advancePolls(5);

      expect(apiFetch).toHaveBeenNthCalledWith(7, pendingEndpoint, {
        method: 'POST',
        body: {
          questionId: OTHER_QUESTION_ID,
          requestId: REQUEST_ID,
          retainRecording: false,
          audioKey: S3_AUDIO_KEY,
        },
        signal: expect.any(AbortSignal),
        timeoutMs: AUDIO_TIMEOUT_MS,
        onRequestStarted: expect.any(Function),
      });
      expect(props.parseResult).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
      expect(notifyPendingAssessmentReplayReady).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('keeps a resubmitted result durable when no replay provider is mounted', async () => {
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
      mockStartedApiFetchResultOnce({ score: 77 });
      const { props } = await renderRecorder();

      await advancePolls(5);

      expect(notifyPendingAssessmentReplayReady).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errInterruptedSaved'));
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it.each(['returns false', 'rejects'] as const)(
      'keeps a route-mismatched S3 result locked when feedback-pointer persistence %s',
      async (failureMode) => {
        jest.useFakeTimers();
        asMock(loadPendingAssessment).mockResolvedValue(
          pendingRecord({
            stage: 's3-granted',
            endpoint: '/diagnostic/answer',
            questionId: OTHER_QUESTION_ID,
            audioKey: S3_AUDIO_KEY,
          }),
        );
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        mockStartedApiFetchResultOnce({ score: 77 });
        if (failureMode === 'returns false') {
          asMock(markPendingAssessmentFeedbackPending).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentFeedbackPending).mockRejectedValue(
            new Error('keychain unavailable'),
          );
        }
        const { props } = await renderRecorder();

        await advancePolls(5);

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate'));
        expect(notifyPendingAssessmentReplayReady).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      },
    );

    it.each([0, 408, 502, 504])(
      'polls for the durable result without repeating an S3 POST after ambiguous status %i',
      async (ambiguousStatus) => {
        jest.useFakeTimers();
        asMock(loadPendingAssessment).mockResolvedValue(
          pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
        );
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        mockStartedApiFetchFailureOnce(new ApiError(ambiguousStatus, 'temporary failure'));
        asMock(apiFetch).mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 83 },
        });
        const { props } = await renderRecorder();

        await advancePolls(6);

        const assessmentPosts = asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT);
        expect(assessmentPosts).toHaveLength(1);
        expect(assessmentPosts[0][1]).toMatchObject({
          method: 'POST',
          body: {
            questionId: QUESTION_ID,
            requestId: REQUEST_ID,
            cycleId: CYCLE_ID,
            retainRecording: false,
            audioKey: S3_AUDIO_KEY,
          },
          timeoutMs: AUDIO_TIMEOUT_MS,
        });
        expect(assessmentPosts[0][1].signal).toBeInstanceOf(AbortSignal);
        expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(1);
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
      mockStartedApiFetchFailureOnce(
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
          cycleId: CYCLE_ID,
          retainRecording: false,
          audioKey: S3_AUDIO_KEY,
        },
        signal: expect.any(AbortSignal),
        timeoutMs: AUDIO_TIMEOUT_MS,
        onRequestStarted: expect.any(Function),
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
      mockStartedApiFetchFailureOnce(new ApiError(429, 'too many', 30));
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

    it('bounds an ambiguous S3 assessment POST to one durable attempt', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      asMock(apiFetch).mockImplementation(
        async (path: string, options?: { onRequestStarted?: () => void }) => {
          if (path === ENDPOINT) {
            options?.onRequestStarted?.();
            throw new ApiError(0, 'connection interrupted');
          }
          throw new ApiError(404, 'not submitted');
        },
      );
      await renderRecorder();

      await advancePolls(30);

      const assessmentPosts = asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT);
      expect(assessmentPosts).toHaveLength(1);
      for (const [, options] of assessmentPosts) {
        expect(options.body).toEqual({
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: false,
          audioKey: S3_AUDIO_KEY,
        });
        expect(options.signal).toBeInstanceOf(AbortSignal);
      }
      expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(2);
    });

    it('keeps recovery locked when reserving its one durable POST fails', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(claimPendingAssessmentRecoveryPost).mockRejectedValue(
        new Error('keychain unavailable'),
      );
      const { props } = await renderRecorder();

      await advancePolls(5);

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate'));
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(0);
    });

    it('refunds a recovery-POST claim when the recorder becomes stale before dispatch', async () => {
      jest.useFakeTimers();
      const claim = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(claimPendingAssessmentRecoveryPost).mockReturnValue(claim.promise);
      const { props } = await renderRecorder();
      await advancePolls(5);
      await waitFor(() => expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalled());

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        claim.resolve(true);
        await flushMicrotasks();
      });

      expect(refundPendingAssessmentRecoveryPost).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onError).not.toHaveBeenCalled();
      expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(0);
    });

    it('refunds a claim when recovery fails before the POST reaches the network', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(0, 'token read failed'));
      const { props } = await renderRecorder();

      await advancePolls(5);

      expect(refundPendingAssessmentRecoveryPost).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onError).toHaveBeenCalledWith(t('error.network'));
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
    });

    it('uses a finite recovery Retry-After before polling again', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(503, 'busy', 7))
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 86 },
        });
      const { props } = await renderRecorder();

      await act(async () => {
        jest.advanceTimersByTime(6_999);
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(1);
        await flushMicrotasks();
      });

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 86 } });
    });

    it('aborts a recovery while it is sleeping between status reads', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      const { props } = await renderRecorder();
      const signal = asMock(apiFetch).mock.calls[0][1].signal as AbortSignal;

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      expect(signal.aborted).toBe(true);
      expect(props.onError).not.toHaveBeenCalled();
    });

    it.each([
      [500, 'INTERNAL', 'error.internal'],
      [502, 'PROVIDER_FAILED', 'error.checkFailed'],
      [503, 'CAPACITY_BUSY', 'error.busy'],
      [504, 'PROVIDER_TIMEOUT', 'error.timeout'],
    ] as const)(
      'returns the surviving take after a definite recovery POST HTTP %i (%s)',
      async (status, code, expectedMessageKey) => {
        jest.useFakeTimers();
        const onRateLimited = jest.fn();
        for (let i = 0; i < 6; i++) {
          asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        }
        mockStartedApiFetchFailureOnce(
          new ApiError(status, 'provider failed', undefined, { code }),
        );
        const { props } = await submitLiveRecordingIntoRecovery(
          pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
          { onRateLimited },
        );

        await advancePolls(6);
        await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t(expectedMessageKey)));

        expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(1);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        expect(deletedRecordingUris()).toEqual([]);
        expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
        expect(onRateLimited).not.toHaveBeenCalled();
      },
    );

    it('retires an incompatible S3 recovery POST without polling or posting again', async () => {
      jest.useFakeTimers();
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchFailureOnce(
        new ApiError(409, 'old result version', undefined, {
          code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
        }),
      );
      const { props } = await submitLiveRecordingIntoRecovery(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );

      await advancePolls(6);
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('error.assessmentResultIncompatible')),
      );

      expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(1);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();

      await advancePolls(3);
      expect(apiFetch).toHaveBeenCalledTimes(7);
    });

    it('finishes an authenticated-out S3 resubmission terminally like a 429', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i += 1) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchFailureOnce(new ApiError(401, 'signed out'));
      const { props } = await renderRecorder();

      await advancePolls(5);
      expect(apiFetch).toHaveBeenCalledTimes(7);

      // Auth rejects ahead of the idempotency claim — the same pre-claim proof
      // documented for 429 — so the resubmission committed nothing and the
      // loop must not park in a silent bare return that leaves 'recovering'
      // latched with no polling behind it.
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRejected'));
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(markPendingAssessmentForReconciliation).toHaveBeenCalledWith(REQUEST_ID);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(1);

      // Resolved: no further polling for the rest of the five-minute lease.
      await advancePolls(5);
      expect(apiFetch).toHaveBeenCalledTimes(7);
    });

    it('honors REQUEST_IN_FLIGHT Retry-After before polling the same S3 handoff', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchFailureOnce(
        new ApiError(409, 'processing', 7, { code: 'REQUEST_IN_FLIGHT' }),
      );
      asMock(apiFetch).mockResolvedValueOnce({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 81 },
      });
      const { props } = await renderRecorder();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      await advancePolls(5);

      expect(apiFetch).toHaveBeenCalledTimes(7);
      await act(async () => {
        jest.advanceTimersByTime(6_999);
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(7);
      await act(async () => {
        jest.advanceTimersByTime(1);
        await flushMicrotasks();
      });

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
      mockStartedApiFetchFailureOnce(new ApiError(409, 'question mismatch'));
      // The row a genuine in-flight claim would have produced never appears:
      // the next read is still absent, so the conflict is terminal.
      asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
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

    it('stops a recovery resubmission immediately on a coded stable state conflict', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let i = 0; i < 6; i++) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchFailureOnce(
        new ApiError(409, 'cycle closed', undefined, { code: 'PRACTICE_CYCLE_CLOSED' }),
      );
      const { props } = await renderRecorder();

      await advancePolls(6);
      await waitFor(() => expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1));

      expect(apiFetch).toHaveBeenCalledTimes(7);
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByLabelText(START_LABEL)).toBeTruthy();

      await advancePolls(3);
      expect(apiFetch).toHaveBeenCalledTimes(7);
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
        mockStartedApiFetchFailureOnce(new ApiError(status, 'object unavailable'));
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
      const REUPLOAD_KEY = `audio-uploads/practice/${OWNER_ID}/550e8400-e29b-41d4-a716-446655440007.m4a`;
      const S3_GRANT = {
        mode: 's3' as const,
        assessmentEndpoint: ENDPOINT,
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
        mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        mockStartedApiFetchFailureOnce(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
        );
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        mockStartedApiFetchResultOnce({ ok: true });
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        await advancePolls(7);
        await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));

        // One fresh grant + one fresh S3 POST for the same logical submission.
        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(2);
        expect(apiRequestAudioUpload).toHaveBeenNthCalledWith(2, 'audio/mp4', OWNER_ID, {
          assessmentEndpoint: ENDPOINT,
          signal: expect.any(AbortSignal),
        });
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
          { signal: expect.any(AbortSignal) },
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
        mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        mockStartedApiFetchFailureOnce(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
        );
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
        mockStartedApiFetchFailureOnce(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
        );
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
        mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        mockStartedApiFetchFailureOnce(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
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
        // Refund-first contract: the server proved the resubmission committed
        // nothing, so the durable recovery-POST claim is refunded even though
        // no surviving local take can spend it on a fresh-key re-upload.
        expect(refundPendingAssessmentRecoveryPost).toHaveBeenCalledWith(REQUEST_ID);
      });

      it('treats a local-file inspection throw as a terminal missing-object result', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
        mockTombstoneAfterSubmit();
        mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        mockStartedApiFetchFailureOnce(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
        );
        const { props } = await renderRecorder();
        await recordAndStop();
        asMock(File).mockImplementation(() => {
          throw new Error('cache metadata unavailable');
        });

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        await advancePolls(5);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
        expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      });

      it('keeps recovery locked when refunding a dead-key POST claim fails', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
        mockTombstoneAfterSubmit();
        mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        mockStartedApiFetchFailureOnce(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
        );
        asMock(refundPendingAssessmentRecoveryPost).mockRejectedValue(
          new Error('keychain unavailable'),
        );
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        await advancePolls(5);

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate'));
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      });

      /** Drives one submission into recovery and up to the dead-key rejection. */
      async function submitIntoDeadKeyRejection(rejection: ApiError) {
        mockTombstoneAfterSubmit();
        mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
        mockAbsentStatusReads();
        mockStartedApiFetchFailureOnce(rejection);
        const rendered = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
        return rendered;
      }

      it('does not infer a missing object from a generic validation failure', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'VALIDATION_FAILED',
          }),
        );

        await advancePolls(6);
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone')),
        );

        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
        expect(apiPostPresignedAudio).toHaveBeenCalledTimes(1);
        expect(assessmentPostCalls()).toHaveLength(2);
        expect(props.onResult).not.toHaveBeenCalled();
      });

      it('does not re-upload and refreshes canonical state for a completed diagnostic', async () => {
        jest.useFakeTimers();
        asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'diagnostic already complete', undefined, { code: 'DIAGNOSTIC_DONE' }),
        );

        await advancePolls(6);
        await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('error.diagnosticDone')));

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
          .mockResolvedValueOnce({ mode: 'direct', assessmentEndpoint: ENDPOINT });
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
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
        const persistFreshKey = deferred<boolean>();
        asMock(apiRequestAudioUpload)
          .mockResolvedValueOnce(S3_GRANT)
          .mockResolvedValueOnce(REUPLOAD_GRANT);
        asMock(markPendingAssessmentStage)
          .mockResolvedValueOnce(true)
          .mockReturnValueOnce(persistFreshKey.promise);
        const { props } = await submitIntoDeadKeyRejection(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
        );

        await advancePolls(5);
        await waitFor(() => expect(markPendingAssessmentStage).toHaveBeenCalledTimes(2));
        const statusCallsBeforePersistence = asMock(apiFetch).mock.calls.length;
        await act(async () => {
          persistFreshKey.resolve(false);
          await flushMicrotasks();
        });

        // The durable handoff still names the dead key, so uploading a fresh
        // object would strand it: no second S3 POST or immediate next poll.
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errUploadGone'));
        expect(apiFetch).toHaveBeenCalledTimes(statusCallsBeforePersistence);
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
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
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
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
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
        signal: expect.any(AbortSignal),
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
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
      expect(clearPendingAssessment).not.toHaveBeenCalled();
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

    it('completes a terminal recovery even when the host onRecoveryUnresolved throws', async () => {
      // Host-screen callbacks are boundaries, not collaborators: a throwing
      // onRecoveryUnresolved must not skip the phase write that unlocks the
      // recorder or the durable tracking cleanup after it.
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({});
      const onExitLockChange = jest.fn();
      const onRecoveryUnresolved = jest.fn(() => {
        throw new Error('screen callback failed');
      });
      const { props } = await renderRecorder({ onExitLockChange, onRecoveryUnresolved });

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errBadRecoveryResponse')),
      );
      // The operation token is released one commit after onError (recovery's
      // finally), so await the unlock instead of sampling mid-transition.
      await waitFor(() => expect(onExitLockChange).toHaveBeenLastCalledWith(false));
      expect(onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: false,
      });
    });

    it('finishes terminal recovery cleanup even when the host onError throws', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({});
      const onError = jest.fn(() => {
        throw new Error('screen error callback failed');
      });
      const { props } = await renderRecorder({ onError });

      await waitFor(() =>
        expect(onError).toHaveBeenCalledWith(t('recorder.errBadRecoveryResponse')),
      );
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
    });

    it('arms Try Again when the recovery flow itself throws unexpectedly', async () => {
      // Belt-and-suspenders for any unexpected throw inside recoverPending
      // (here: a hostile error object whose classification read throws inside
      // the poll loop's own catch, so nothing else can absorb it). The learner
      // must still land on the retryable terminal phase with Try Again armed
      // instead of an unhandled rejection over a dead 'recovering' phase.
      const hostileError = new ApiError(503, 'unclassifiable failure');
      Object.defineProperty(hostileError, 'status', {
        get() {
          throw new Error('hostile status read');
        },
      });
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(apiFetch).mockRejectedValue(hostileError);
      const { props } = await renderRecorder();

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate')),
      );
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      const tryAgain = screen.getByRole('button', { name: t('common.tryAgain') });

      // The boundary recovers, so the retried recovery resolves the durable
      // result through the mounted replay provider exactly as before.
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { score: 5 },
      });
      asMock(notifyPendingAssessmentReplayReady).mockReturnValue(true);
      await fireEvent.press(tryAgain);

      await waitFor(() => expect(notifyPendingAssessmentReplayReady).toHaveBeenCalledTimes(1));
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
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
        signal: expect.any(AbortSignal),
      });
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
      expect(props.onResult).not.toHaveBeenCalled();

      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(props.parseResult).toHaveBeenCalledWith({ score: 7 });
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 7 } });
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('parks a long recovery without cancelling it, releases exits, and resumes on demand', async () => {
      jest.useFakeTimers();
      const onInteractionLockChange = jest.fn();
      const onExitLockChange = jest.fn();
      const onExpandedControlsLayout = jest.fn();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'processing',
        context: 'practice',
        questionId: QUESTION_ID,
      });
      await renderRecorder({
        onInteractionLockChange,
        onExitLockChange,
        onExpandedControlsLayout,
      });

      await advancePolls(8);
      const checkLater = screen.getByRole('button', { name: t('replay.checkLater') });
      const callsBeforePark = asMock(apiFetch).mock.calls.length;
      await fireEvent.press(checkLater);

      expect(screen.getByRole('alert')).toHaveTextContent(t('replay.failedBody'));
      const parkedStatus = screen.getByLabelText(t('replay.failedBody'));
      expect(parkedStatus).toHaveTextContent(t('replay.failedBody'));
      onExpandedControlsLayout.mockClear();
      await fireEvent(screen.getByTestId('recorder-expanded-controls'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 280, height: 120 } },
      });
      expect(onExpandedControlsLayout).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toMatchObject({
        disabled: true,
      });
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
      expect(onExitLockChange).toHaveBeenLastCalledWith(false);
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(markPendingAssessmentCancelled).not.toHaveBeenCalled();

      await advancePolls(3);
      expect(apiFetch).toHaveBeenCalledTimes(callsBeforePark);

      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(callsBeforePark + 1));
      expect(onExitLockChange).toHaveBeenLastCalledWith(true);
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
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

    it('does not deliver a recovered result after its feedback marker resolves stale', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValueOnce(pendingRecord()).mockResolvedValue(null);
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 97 },
      });
      asMock(markPendingAssessmentFeedbackPending).mockReturnValue(marker.promise);
      const { view, props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        ),
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

    it('does not let a wall-clock jump bypass the monotonic 404 confirmation window', async () => {
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

      // Moving wall time cannot manufacture monotonic elapsed time.
      jest.setSystemTime(new Date(startedAt.getTime() + 10_000));
      await advancePolls(1);

      expect(apiFetch).toHaveBeenCalledTimes(3);
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();

      await advancePolls(3);

      expect(apiFetch).toHaveBeenCalledTimes(6);
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

    it('stops polling silently on a 401 and parks with an escape instead of wedging', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockRejectedValue(new ApiError(401, 'Request failed with status 401'));
      const onExitLockChange = jest.fn();
      const { props } = await renderRecorder({ onExitLockChange });

      expect(apiFetch).toHaveBeenCalledTimes(1);

      await advancePolls(3);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      // A 401 on the status read proves only that auth currently rejects every
      // route, so polling cannot progress; the loop parks (Try Again armed,
      // route exits released) while keeping the durable pointer and take for a
      // later mount after the session is re-established.
      expect(screen.getByRole('button', { name: t('common.tryAgain') })).toBeTruthy();
      expect(onExitLockChange).toHaveBeenLastCalledWith(false);
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: true,
      });

      // Presses are guarded while the component is still parked. The disabled
      // Pressable blocks event dispatch, so invoke the handler directly to
      // prove the runtime guard itself.
      asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
      await invokePressHandler(screen, START_LABEL);
      expect(AudioModule.getRecordingPermissionsAsync).not.toHaveBeenCalled();
    });

    it('returns the take without spending recovery budget when the posted submission is rejected with 401', async () => {
      // A received 401 proves auth rejected this POST ahead of the idempotency
      // claim (password rotation on another device mid-POST), so the handoff is
      // cleared and the take returned for an explicit retry — mirroring the
      // pre-claim reasoning the recovery loop documents for 429 — instead of
      // spending the one durable recovery-POST budget on polls that can only
      // 401 again. The session-expiry handler reacts to the same 401 on its
      // own; these local transitions coexist with it exactly like the 426/429
      // terminal handling.
      mockStartedUploadFailure(new ApiError(401, 'Request failed with status 401'));
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord({ stage: 'direct-posting' }));
      asMock(apiFetch).mockRejectedValue(new ApiError(401, 'Request failed with status 401'));
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));

      await waitFor(() => expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy());
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRejected'));
      expect(deletedRecordingUris()).toEqual([]);
      expect(screen.getByLabelText(START_LABEL).props.accessibilityState).toEqual({
        disabled: false,
      });
    });

    it('hands completed feedback for another route to the mounted replay provider', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(notifyPendingAssessmentReplayReady).mockReturnValueOnce(true);
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { ok: 'other' },
      });
      const { props } = await renderRecorder();

      await waitFor(() =>
        expect(notifyPendingAssessmentReplayReady).toHaveBeenCalledWith(REQUEST_ID),
      );
      expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
        REQUEST_ID,
        expect.any(Number),
      );
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
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
        { signal, onRequestStarted }: { signal: AbortSignal; onRequestStarted?: () => void },
      ) =>
        new Promise((_resolve, reject) => {
          onRequestStarted?.();
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
      assessmentEndpoint: ENDPOINT,
      uploadUrl: 'https://s3.example.com/upload',
      uploadFields: { key: S3_AUDIO_KEY },
      audioKey: S3_AUDIO_KEY,
      contentType: 'audio/mp4',
      expiresIn: 300,
      maxBytes: 25 * 1024 * 1024,
    };

    it('does not clear durable handoff state for a lifecycle-only pre-POST abort', async () => {
      asMock(apiRequestAudioUpload).mockImplementation(
        (_type: unknown, _owner: unknown, { signal }: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new ApiError(0, 'aborted')), {
              once: true,
            });
          }),
      );
      await renderRecorder();
      await recordAndStop();
      asMock(clearPendingAssessment).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1));
      const signal = asMock(apiRequestAudioUpload).mock.calls[0][2].signal as AbortSignal;

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      expect(signal.aborted).toBe(true);
      // Lifecycle cleanup owns this abort. The stale submit continuation may
      // not mutate SecureStore; foreground recovery will reconcile the handoff.
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
    });

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
        body: {
          questionId: QUESTION_ID,
          requestId: REQUEST_ID,
          cycleId: CYCLE_ID,
          retainRecording: false,
          audioKey: S3_AUDIO_KEY,
        },
        signal: expect.any(AbortSignal),
        timeoutMs: AUDIO_TIMEOUT_MS,
        onRequestStarted: expect.any(Function),
      });
    });

    it('Stop Waiting parks an in-flight assessment and Check Now resolves it without re-posting', async () => {
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
      expect(await screen.findByRole('alert')).toHaveTextContent(t('replay.failedBody'));
      expect(apiFetch).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'recovered' } }),
      );

      // The cancelled POST may have committed: the durable request is
      // resolved and the same audio is never submitted a second time.
      expect(markPendingAssessmentCancelled).toHaveBeenCalledWith(REQUEST_ID);
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('does not auto-resume Stop Waiting after an earlier offline park crosses focus cleanup', async () => {
      onlineManager.setOnline(false);
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { ok: 'earlier recovery' },
      });
      const { props } = await renderRecorder();

      // The first durable handoff parks automatically because reachability is
      // already known to be offline. Navigating away runs lifecycle cleanup;
      // reconnecting while unfocused must not consume that old park marker.
      expect(await screen.findByRole('alert')).toHaveTextContent(t('replay.failedBody'));
      expect(apiFetch).not.toHaveBeenCalled();
      await act(async () => {
        blurScreen();
        await flushMicrotasks();
      });
      await waitFor(() => expect(screen.getByText(IDLE_TEXT)).toBeTruthy());
      const blurredReads = asMock(loadPendingAssessment).mock.calls.length;
      await act(async () => {
        onlineManager.setOnline(true);
        await flushMicrotasks();
      });
      expect(loadPendingAssessment).toHaveBeenCalledTimes(blurredReads);
      expect(apiFetch).not.toHaveBeenCalled();

      // Focus owns the ordinary durable recovery. Once it finishes, the same
      // mounted Recorder can create a later, independent posted submission.
      await act(async () => {
        focusScreen();
        await flushMicrotasks();
      });
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'earlier recovery' } }),
      );
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();

      asMock(loadPendingAssessment).mockResolvedValue(null);
      asMock(apiUploadAudio).mockImplementation(abortRejectingUpload());
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      expect(await screen.findByRole('alert')).toHaveTextContent(t('replay.failedBody'));
      expect(markPendingAssessmentCancelled).toHaveBeenCalledWith(REQUEST_ID);

      // Model the new posted handoff still present in storage. Duplicate
      // foreground/reachability notifications after the learner explicitly
      // chose Stop Waiting must neither read it nor start a status poll.
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      const readsBeforeNotifications = asMock(loadPendingAssessment).mock.calls.length;
      const pollsBeforeNotifications = asMock(apiFetch).mock.calls.length;
      const resultsBeforeNotifications = props.onResult.mock.calls.length;
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        onlineManager.setOnline(false);
        onlineManager.setOnline(true);
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).toHaveBeenCalledTimes(readsBeforeNotifications);
      expect(apiFetch).toHaveBeenCalledTimes(pollsBeforeNotifications);
      expect(props.onResult).toHaveBeenCalledTimes(resultsBeforeNotifications);
      expect(screen.getByRole('alert')).toHaveTextContent(t('replay.failedBody'));
    });

    it('persists cancel intent before lifecycle cleanup aborts a posted request', async () => {
      const marker = deferred<boolean>();
      asMock(markPendingAssessmentCancelled).mockReturnValue(marker.promise);
      asMock(apiUploadAudio).mockImplementation(abortRejectingUpload());
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      const signal = asMock(apiUploadAudio).mock.calls[0][3].signal as AbortSignal;
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      expect(markPendingAssessmentCancelled).toHaveBeenCalledTimes(1);

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      expect(signal.aborted).toBe(false);

      await act(async () => {
        marker.resolve(true);
        await flushMicrotasks();
      });

      expect(signal.aborted).toBe(true);
      expect(markPendingAssessmentCancelled).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onResult).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.queryByText(RECOVERING_TEXT)).toBeNull();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('honors cancel when a successful response races durable cancel persistence', async () => {
      const response = deferred<{ ok: string }>();
      const marker = deferred<boolean>();
      asMock(markPendingAssessmentCancelled).mockReturnValue(marker.promise);
      asMock(apiUploadAudio).mockImplementation(
        (
          _endpoint: string,
          _uri: string,
          _fields: unknown,
          { onRequestStarted }: { onRequestStarted?: () => void },
        ) => {
          onRequestStarted?.();
          return response.promise;
        },
      );
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord({ cancelRequested: true }));
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
      await act(async () => {
        response.resolve({ ok: 'direct' });
        await flushMicrotasks();
      });
      expect(props.parseResult).not.toHaveBeenCalledWith({ ok: 'direct' });
      expect(apiFetch).not.toHaveBeenCalled();
      expect(screen.getByText(t('recorder.stageUploading'))).toBeTruthy();

      await act(async () => {
        marker.resolve(true);
        await flushMicrotasks();
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(t('replay.failedBody'));
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await waitFor(() =>
        expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: 'recovered' } }),
      );
      expect(props.onResult).not.toHaveBeenCalledWith({ parsed: { ok: 'direct' } });
    });

    it.each(['returns false', 'rejects'] as const)(
      'keeps recovery locked when durable cancel intent %s',
      async (outcome) => {
        if (outcome === 'returns false') {
          asMock(markPendingAssessmentCancelled).mockResolvedValue(false);
        } else {
          asMock(markPendingAssessmentCancelled).mockRejectedValue(
            new Error('cancel marker unavailable'),
          );
        }
        asMock(apiUploadAudio).mockImplementation(abortRejectingUpload());
        const { props } = await renderRecorder();
        await recordAndStop();

        await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
        await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
        await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));

        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errRetryInfoUpdate')),
        );
        expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
      },
    );

    it('honors a cancel instead of resubmitting once recovery confirms nothing landed', async () => {
      jest.useFakeTimers();
      asMock(apiRequestAudioUpload).mockResolvedValue(S3_GRANT);
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }));
      asMock(apiFetch).mockImplementation(
        (path: string, options: { signal?: AbortSignal; onRequestStarted?: () => void }) =>
          path === ENDPOINT
            ? new Promise((_resolve, reject) => {
                options.onRequestStarted?.();
                options.signal?.addEventListener(
                  'abort',
                  () => reject(new ApiError(0, 'aborted')),
                  {
                    once: true,
                  },
                );
              })
            : Promise.reject(new ApiError(404, 'not submitted')),
      );
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(ENDPOINT, expect.anything()));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      expect(await screen.findByRole('alert')).toHaveTextContent(t('replay.failedBody'));
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
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

    it('cancel during the 503 capacity-retry wait returns the take without waiting it out', async () => {
      // A 30 s Retry-After would pin the old plain setTimeout; the abort-aware
      // wait must wake on cancel immediately (real timers prove promptness).
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 30, { code: 'CAPACITY_BUSY' }))
        .mockReturnValue(new Promise(() => undefined));
      const { props } = await renderRecorder();
      await recordAndStop();

      const cancelledAt = Date.now();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));

      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));
      await waitFor(() => expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy());

      expect(Date.now() - cancelledAt).toBeLessThan(5_000);
      // A received 503 proves that request finished without a durable claim.
      // While waiting to retry, no POST is in flight and cancel is definitive.
      expect(apiUploadAudio).toHaveBeenCalledTimes(1);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(markPendingAssessmentCancelled).not.toHaveBeenCalled();
      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onResult).not.toHaveBeenCalled();
    });

    it('releases a completed capacity-retry abort listener', async () => {
      jest.useFakeTimers();
      const addAbortListener = jest.spyOn(AbortSignal.prototype, 'addEventListener');
      const removeAbortListener = jest.spyOn(AbortSignal.prototype, 'removeEventListener');
      asMock(apiUploadAudio)
        .mockRejectedValueOnce(new ApiError(503, 'capacity busy', 1, { code: 'CAPACITY_BUSY' }))
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

    it('recovers when native preview play or pause throws synchronously', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      mockPreviewPlayer.play.mockImplementationOnce(() => {
        throw new Error('decoder failed to start');
      });

      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();

      mockPreviewPlayer = makeMockPreviewPlayer();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      mockPreviewPlayer.pause.mockImplementationOnce(() => {
        throw new Error('decoder failed to pause');
      });
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.pauseLabel') }));

      expect(props.onError).toHaveBeenLastCalledWith(t('recorder.errPlayFailed'));
      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    });

    it('releases a preview whose asynchronous playback status reports an error', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const onStatus = previewStatusListener();

      await act(async () => {
        onStatus({ didJustFinish: false, error: 'native decoder failed' });
        await flushMicrotasks();
      });

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    });

    it('cleans up when preview listener installation throws', async () => {
      mockPreviewPlayer.addListener.mockImplementationOnce(() => {
        throw new Error('listener unavailable');
      });
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
      expect(mockPreviewPlayer.play).not.toHaveBeenCalled();
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

    it('reports one error when a status callback re-enters a captured Pause after release', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const pauseOnPress = compositePressablePropsForNode(
        screen.getByRole('button', { name: t('recorder.pauseLabel') }),
      ).onPress as () => unknown;
      const onStatus = previewStatusListener();

      await act(async () => {
        onStatus({ didJustFinish: false, error: 'decoder stopped' });
        await Promise.resolve(pauseOnPress());
      });

      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
    });

    it('keeps a captured Play inert while its take is still uploading', async () => {
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      const stalePlay = compositePressablePropsForNode(
        screen.getByRole('button', { name: t('recorder.playLabel') }),
      ).onPress as () => unknown;

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      asMock(createAudioPlayer).mockClear();
      await act(async () => {
        await Promise.resolve(stalePlay());
      });
      expect(createAudioPlayer).not.toHaveBeenCalled();
      expect(mockPreviewPlayer.play).not.toHaveBeenCalled();

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
      const onStatus = previewStatusListener();

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

    it('waits for the end-of-take rewind before replaying', async () => {
      const rewind = deferred<void>();
      mockPreviewPlayer.seekTo.mockReturnValue(rewind.promise);
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const onStatus = previewStatusListener();

      await act(async () => {
        onStatus({ didJustFinish: true });
      });
      let replay!: Promise<void>;
      let duplicateReplay!: Promise<void>;
      await act(() => {
        replay = invokeRolePressHandler(t('recorder.playLabel'));
        duplicateReplay = invokeRolePressHandler(t('recorder.playLabel'));
      });
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(1);

      await act(async () => {
        rewind.resolve();
        await Promise.all([replay, duplicateReplay]);
      });
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(2);
      expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
    });

    it('clears rewind ownership and play requests across successive completions', async () => {
      const firstRewind = deferred<void>();
      const secondRewind = deferred<void>();
      mockPreviewPlayer.seekTo
        .mockReturnValueOnce(firstRewind.promise)
        .mockReturnValueOnce(secondRewind.promise);
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const onStatus = previewStatusListener();

      await act(async () => {
        onStatus({ didJustFinish: true });
        onStatus({ didJustFinish: true });
      });
      expect(mockPreviewPlayer.seekTo).toHaveBeenCalledTimes(1);
      let firstReplay!: Promise<void>;
      await act(() => {
        firstReplay = invokeRolePressHandler(t('recorder.playLabel'));
      });
      await act(async () => {
        firstRewind.resolve();
        await firstReplay;
      });
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(2);

      await act(async () => {
        onStatus({ didJustFinish: true });
      });
      expect(mockPreviewPlayer.seekTo).toHaveBeenCalledTimes(2);
      let secondReplay!: Promise<void>;
      await act(() => {
        secondReplay = invokeRolePressHandler(t('recorder.playLabel'));
      });
      await act(async () => {
        secondRewind.resolve();
        await secondReplay;
      });
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(3);
    });

    it('does not resume a pending rewind after submission releases its player', async () => {
      const rewind = deferred<void>();
      const upload = deferred<{ ok: boolean }>();
      mockPreviewPlayer.seekTo.mockReturnValue(rewind.promise);
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const onStatus = previewStatusListener();
      await act(async () => onStatus({ didJustFinish: true }));
      let replay!: Promise<void>;
      await act(() => {
        replay = invokeRolePressHandler(t('recorder.playLabel'));
      });

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiUploadAudio).toHaveBeenCalledTimes(1));
      await act(async () => {
        rewind.resolve();
        await replay;
      });
      expect(createAudioPlayer).toHaveBeenCalledTimes(1);
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(1);

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
    });

    it('does not recreate a preview released by an error during rewind', async () => {
      const rewind = deferred<void>();
      mockPreviewPlayer.seekTo.mockReturnValue(rewind.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const onStatus = previewStatusListener();
      await act(async () => onStatus({ didJustFinish: true }));
      let replay!: Promise<void>;
      await act(() => {
        replay = invokeRolePressHandler(t('recorder.playLabel'));
      });
      await act(async () => {
        onStatus({ didJustFinish: false, error: 'decoder failed during rewind' });
        rewind.resolve();
        await replay;
      });

      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(createAudioPlayer).toHaveBeenCalledTimes(1);
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(1);
    });

    it('releases and reports a preview whose end rewind fails', async () => {
      const rewind = deferred<void>();
      mockPreviewPlayer.seekTo.mockReturnValue(rewind.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const onStatus = previewStatusListener();

      await act(async () => {
        onStatus({ didJustFinish: true });
        rewind.reject(new Error('native seek failed'));
        await flushMicrotasks();
      });

      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    });

    // Fresh mutation IDs 2749-2754: seekTo may throw before returning a promise.
    it('releases and reports a preview whose end rewind throws synchronously', async () => {
      mockPreviewPlayer.seekTo.mockImplementation(() => {
        throw new Error('native seek threw');
      });
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const onStatus = previewStatusListener();

      await act(async () => {
        onStatus({ didJustFinish: true });
      });

      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errPlayFailed'));
      expect(screen.getByText(t('recorder.play'))).toBeTruthy();
    });

    it('releases the preview player when the take is submitted', async () => {
      const { props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const subscription = previewListenerSubscription();

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
      const subscription = previewListenerSubscription();

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
      const staleStatus = previewStatusListener(stalePlayer);
      stalePlayer.seekTo.mockRejectedValue(new Error('released player rewind failed'));

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
      // take now playing or install a rewind promise that belongs to no player.
      expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
      expect(stalePlayer.seekTo).not.toHaveBeenCalled();
      expect(mockPreviewPlayer.seekTo).not.toHaveBeenCalled();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.pauseLabel') }));
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      expect(mockPreviewPlayer.play).toHaveBeenCalledTimes(2);
    });

    it.each(['status error', 'synchronous rewind failure'] as const)(
      'does not let a stale preview %s release the current player',
      async (outcome) => {
        const { props } = await renderRecorder();
        await recordAndStop();
        await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
        const stalePlayer = mockPreviewPlayer;
        const staleStatus = previewStatusListener(stalePlayer);

        await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
        await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
        mockRecorderState.durationMillis = 5_000;
        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
        mockPreviewPlayer = makeMockPreviewPlayer();
        await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
        const currentPlayer = mockPreviewPlayer;
        if (outcome === 'synchronous rewind failure') {
          stalePlayer.seekTo.mockImplementation(() => {
            throw new Error('released player cannot seek');
          });
        }

        await act(async () => {
          staleStatus(
            outcome === 'status error'
              ? { didJustFinish: false, error: 'released decoder failed' }
              : { didJustFinish: true },
          );
          await flushMicrotasks();
        });

        expect(currentPlayer.remove).not.toHaveBeenCalled();
        expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errPlayFailed'));
        expect(screen.getByText(t('recorder.pause'))).toBeTruthy();
      },
    );

    it.each(['resolves', 'rejects'] as const)(
      'does not let a stale rewind that %s disturb a newer rewind',
      async (outcome) => {
        const staleRewind = deferred<void>();
        mockPreviewPlayer.seekTo.mockReturnValue(staleRewind.promise);
        const { props } = await renderRecorder();
        await recordAndStop();
        await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
        const staleStatus = previewStatusListener();
        await act(async () => staleStatus({ didJustFinish: true }));

        await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
        await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
        mockRecorderState.durationMillis = 5_000;
        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
        mockPreviewPlayer = makeMockPreviewPlayer();
        const currentRewind = deferred<void>();
        mockPreviewPlayer.seekTo.mockReturnValue(currentRewind.promise);
        await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
        const currentPlayer = mockPreviewPlayer;
        const currentStatus = previewStatusListener(currentPlayer);
        await act(async () => currentStatus({ didJustFinish: true }));

        await act(async () => {
          if (outcome === 'resolves') staleRewind.resolve();
          else staleRewind.reject(new Error('released rewind failed'));
          await flushMicrotasks();
        });
        expect(currentPlayer.remove).not.toHaveBeenCalled();
        expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errPlayFailed'));

        if (outcome === 'resolves') {
          let replay!: Promise<void>;
          await act(() => {
            replay = invokeRolePressHandler(t('recorder.playLabel'));
          });
          expect(currentPlayer.play).toHaveBeenCalledTimes(1);
          await act(async () => {
            currentRewind.resolve();
            await replay;
          });
          expect(currentPlayer.play).toHaveBeenCalledTimes(2);
        } else {
          currentRewind.resolve();
          await flushAct();
        }
      },
    );

    it('does not let an old replay handler start the next take player', async () => {
      const staleRewind = deferred<void>();
      mockPreviewPlayer.seekTo.mockReturnValue(staleRewind.promise);
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const staleStatus = previewStatusListener();
      await act(async () => staleStatus({ didJustFinish: true }));
      let staleReplay!: Promise<void>;
      await act(() => {
        staleReplay = invokeRolePressHandler(t('recorder.playLabel'));
      });

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());
      mockPreviewPlayer = makeMockPreviewPlayer();
      const currentPlayer = mockPreviewPlayer;
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.pauseLabel') }));

      await act(async () => {
        staleRewind.resolve();
        await staleReplay;
      });

      expect(currentPlayer.play).toHaveBeenCalledTimes(1);
      expect(currentPlayer.pause).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: t('recorder.playLabel') })).toBeTruthy();
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

  describe('middle-slice mutation contracts', () => {
    it('cannot let an old browser auto-stop timer stop the next take', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        await renderRecorder();
        await startRecording();
        await act(async () => {
          jest.advanceTimersByTime(5_000);
          await flushMicrotasks();
        });
        mockRecorderState.durationMillis = 5_000;
        await fireEvent.press(screen.getByLabelText(STOP_LABEL));
        await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
        await waitFor(() => expect(mockRecorder.record).toHaveBeenCalledTimes(2));

        // Take one began at t=0 and take two at t=5s. Only the first timer is
        // due at t=120s; if stop/re-record failed to clear it, it will stop the
        // live second take five seconds before that take's own deadline.
        await act(async () => {
          jest.advanceTimersByTime(115_000);
          await flushMicrotasks();
        });

        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
        expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('does not manufacture a deferred recovery after a foreground media reset', async () => {
      const { view, props } = await renderRecorder();
      await startRecording();
      asMock(loadPendingAssessment).mockClear();
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        mediaServicesDidReset: true,
      };

      await act(async () => {
        emitRecordingStatus({ isFinished: true, mediaServicesDidReset: true });
        await flushMicrotasks();
      });
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(loadPendingAssessment).not.toHaveBeenCalled();
    });

    it('consumes deferred recovery when a synchronous replacement Start wins the idle turn', async () => {
      const firstPermission = deferred<{ granted: boolean }>();
      const secondPermission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync)
        .mockReturnValueOnce(firstPermission.promise)
        .mockReturnValueOnce(secondPermission.promise);
      let armReplacement = false;
      let capturedStart: (() => unknown) | null = null;
      const onInteractionLockChange = jest.fn((locked: boolean) => {
        if (!locked && armReplacement && capturedStart) {
          armReplacement = false;
          void capturedStart();
        }
      });
      const { view } = await renderRecorder({ onInteractionLockChange });
      capturedStart = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      asMock(loadPendingAssessment).mockClear();

      let firstStart!: Promise<void>;
      await act(() => {
        firstStart = Promise.resolve(capturedStart?.()).then(() => undefined);
      });
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });
      armReplacement = true;
      await act(async () => {
        firstPermission.reject(new Error('first permission read failed'));
        await firstStart;
        await flushMicrotasks();
      });
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(2),
      );

      await act(async () => {
        secondPermission.reject(new Error('replacement permission read failed'));
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('does not unlock re-entrant controls until every superseding operation ends', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        const nativeStop = deferred<void>();
        const restore = deferred<void>();
        const nextPermission = deferred<{ granted: boolean; canAskAgain?: boolean }>();
        mockRecorder.stop.mockReturnValueOnce(nativeStop.promise);
        let armReentrantStart = false;
        let capturedMic: (() => unknown) | null = null;
        const onInteractionLockChange = jest.fn((locked: boolean) => {
          if (!locked && armReentrantStart && capturedMic) {
            armReentrantStart = false;
            void capturedMic();
          }
        });
        const { view } = await renderRecorder({ onInteractionLockChange });
        capturedMic = compositePressableProps(view, START_LABEL).onPress as () => unknown;
        await startRecording();
        mockRecorder.uri = RECORDING_URI;
        mockRecorderState.durationMillis = 5_000;
        asMock(AudioModule.getRecordingPermissionsAsync).mockClear();
        asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(nextPermission.promise);
        asMock(setAudioModeAsync).mockImplementation(
          ({ allowsRecording }: { allowsRecording: boolean }) =>
            allowsRecording ? Promise.resolve() : restore.promise,
        );

        let userStop!: Promise<void>;
        await act(() => {
          userStop = invokePressHandler(view, STOP_LABEL);
        });
        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          nativeStop.resolve();
          await flushMicrotasks();
        });
        await waitFor(() =>
          expect(
            asMock(setAudioModeAsync).mock.calls.filter(
              ([options]) => !(options as { allowsRecording: boolean }).allowsRecording,
            ),
          ).toHaveLength(1),
        );
        Object.defineProperty(AppState, 'currentState', {
          configurable: true,
          writable: true,
          value: 'active',
        });
        armReentrantStart = true;

        await act(async () => {
          restore.resolve();
          await userStop;
          await flushMicrotasks();
        });
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);

        await act(async () => {
          nextPermission.resolve({ granted: false, canAskAgain: false });
          await flushMicrotasks();
        });
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it.each(['resolves', 'rejects'] as const)(
      'finishes web prepared-recorder disposal immediately when native stop %s',
      async (outcome) => {
        jest.useFakeTimers();
        const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
        Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
        try {
          const preparation = deferred<void>();
          mockRecorder.prepareToRecordAsync.mockReturnValue(preparation.promise);
          mockRecorder.stop.mockImplementation(async () => {
            mockRecorder.isRecording = false;
            if (outcome === 'rejects') throw new Error('web disposal failed');
          });
          const { view, props } = await renderRecorder();
          let staleStart!: Promise<void>;
          await act(() => {
            staleStart = invokePressHandler(view, START_LABEL);
          });
          await waitFor(() => expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1));

          await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
          let settled = false;
          void staleStart.then(() => {
            settled = true;
          });
          await act(async () => {
            preparation.resolve();
            await flushMicrotasks();
          });

          // Web must start an inactive prepared MediaRecorder before stopping
          // it, but must never wait for the native-only completion event.
          expect(mockRecorder.record).toHaveBeenCalledTimes(1);
          expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
          expect(settled).toBe(true);
        } finally {
          if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
        }
      },
    );

    it('uses the asynchronously delivered native completion URI during lifecycle cleanup', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      try {
        const nativeStop = deferred<unknown>();
        mockRecorder.stop.mockReturnValue(nativeStop.promise);
        await renderRecorder();
        await startRecording();
        mockRecorder.uri = null;

        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          await flushMicrotasks();
        });
        await waitFor(() => expect(mockRecorder.stop).toHaveBeenCalledTimes(1));

        const eventUri = 'file:///recordings/lifecycle-event.m4a';
        await act(async () => {
          nativeStop.resolve(undefined);
          // The lifecycle continuation registers its completion waiter in the
          // first promise reaction; deliver the native event after that reaction.
          await Promise.resolve();
          emitRecordingStatus({ isFinished: true, url: eventUri });
          await flushMicrotasks();
        });

        expect(deletedRecordingUris()).toContain(eventUri);
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('snapshots the post-stop native URI before discarding a backgrounded take', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      try {
        const nativeStop = deferred<unknown>();
        mockRecorder.stop.mockReturnValue(nativeStop.promise);
        await renderRecorder();
        await startRecording();
        mockRecorder.uri = 'file:///recordings/before-stop.m4a';

        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          await flushMicrotasks();
        });
        mockRecorder.uri = 'file:///recordings/after-stop.m4a';
        await act(async () => {
          nativeStop.resolve(undefined);
          await flushMicrotasks();
          jest.advanceTimersByTime(500);
          await flushMicrotasks();
        });

        expect(deletedRecordingUris()).toContain('file:///recordings/after-stop.m4a');
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('waits for the bounded native completion window after lifecycle stop rejects', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      try {
        mockRecorder.stop.mockRejectedValue(new Error('native stop failed'));
        await renderRecorder();
        await startRecording();

        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          await flushMicrotasks();
        });
        // Cleanup is intentionally still waiting for the authoritative native
        // completion/error event rather than racing a later take.
        expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();

        await act(async () => {
          jest.advanceTimersByTime(500);
          await flushMicrotasks();
        });
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('restores terminal-status publication after lifecycle cleanup', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      try {
        const lifecycleStop = deferred<unknown>();
        mockRecorder.stop.mockReturnValueOnce(lifecycleStop.promise);
        await renderRecorder();
        await startRecording();
        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          await flushMicrotasks();
          lifecycleStop.resolve(undefined);
          await Promise.resolve();
          emitRecordingStatus({
            isFinished: true,
            url: 'file:///recordings/background-discard.m4a',
          });
          await flushMicrotasks();
        });
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
        mockRecorder.stop.mockResolvedValue(undefined);
        await startRecording();
        mockRecorder.uri = RECORDING_URI;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
          durationMillis: 5_000,
          url: RECORDING_URI,
        };
        await act(async () => {
          emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
          await flushMicrotasks();
        });

        await waitFor(() => expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy());
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('never dereferences missing cancel persistence during lifecycle cleanup', async () => {
      const grant = deferred<unknown>();
      asMock(apiRequestAudioUpload).mockReturnValue(grant.promise);
      const { props } = await renderRecorder();
      await recordAndStop();
      let submission!: Promise<void>;
      await act(() => {
        submission = invokeRolePressHandler(SUBMIT_TEXT);
      });
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1));
      await fireEvent.press(screen.getByRole('button', { name: CANCEL_TEXT }));

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();

      await act(async () => {
        grant.reject(new DOMException('cancelled', 'AbortError'));
        await submission;
      });
    });

    it.each(['resolves', 'rejects'] as const)(
      'waits for native prepared-disposal completion when stop %s',
      async (outcome) => {
        const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
        Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
        try {
          const preparation = deferred<void>();
          const nativeStop = deferred<unknown>();
          mockRecorder.prepareToRecordAsync.mockReturnValue(preparation.promise);
          mockRecorder.stop.mockReturnValue(nativeStop.promise);
          const { view, props } = await renderRecorder();
          let staleStart!: Promise<void>;
          await act(() => {
            staleStart = invokePressHandler(view, START_LABEL);
          });
          await waitFor(() => expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1));
          await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);

          let settled = false;
          void staleStart.then(() => {
            settled = true;
          });
          await act(async () => {
            preparation.resolve();
            await flushMicrotasks();
          });
          await waitFor(() => expect(mockRecorder.stop).toHaveBeenCalledTimes(1));
          await act(async () => {
            if (outcome === 'resolves') nativeStop.resolve(undefined);
            else nativeStop.reject(new Error('native disposal failed'));
            await flushMicrotasks();
          });

          // A resolved/rejected native stop is not terminal until Expo's status
          // event arrives. Settling here opens the next take to the late event.
          expect(settled).toBe(false);
          await act(async () => {
            emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
            await staleStart;
          });
          expect(settled).toBe(true);
        } finally {
          if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
        }
      },
    );

    it('restores terminal-status publication after prepared disposal', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      try {
        const preparation = deferred<void>();
        const nativeStop = deferred<unknown>();
        mockRecorder.prepareToRecordAsync.mockReturnValueOnce(preparation.promise);
        mockRecorder.stop.mockReturnValueOnce(nativeStop.promise);
        const { view, props } = await renderRecorder();
        let staleStart!: Promise<void>;
        await act(() => {
          staleStart = invokePressHandler(view, START_LABEL);
        });
        await waitFor(() => expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1));
        await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
        await act(async () => {
          preparation.resolve();
          await flushMicrotasks();
          nativeStop.resolve(undefined);
          await Promise.resolve();
          emitRecordingStatus({ isFinished: true, url: 'file:///recordings/disposed.m4a' });
          await staleStart;
        });

        mockRecorder.prepareToRecordAsync.mockResolvedValue(undefined);
        mockRecorder.stop.mockImplementation(async () => undefined);
        await startRecording();
        mockRecorder.uri = RECORDING_URI;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
          durationMillis: 5_000,
          url: RECORDING_URI,
        };
        await act(async () => {
          emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
          await flushMicrotasks();
        });

        await waitFor(() => expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy());
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('disposes preparation through the recorder instance that created it', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        const { view, props } = await renderRecorder();
        const abandonedRecorder = mockRecorder;
        const preparation = deferred<void>();
        const replacement: MockRecorder = {
          getStatus: jest.fn(() => liveRecorderState),
          prepareToRecordAsync: jest.fn(() => preparation.promise),
          record: jest.fn(),
          stop: jest.fn(async () => undefined),
          uri: null,
          isRecording: false,
        };
        mockRecorder = replacement;
        await view.rerender(<Recorder {...props} />);
        await flushAct();

        let staleStart!: Promise<void>;
        await act(() => {
          staleStart = invokePressHandler(view, START_LABEL);
        });
        await waitFor(() => expect(replacement.prepareToRecordAsync).toHaveBeenCalledTimes(1));
        await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
        await act(async () => {
          preparation.resolve();
          await staleStart;
        });

        expect(replacement.record).toHaveBeenCalledTimes(1);
        expect(replacement.stop).toHaveBeenCalledTimes(1);
        expect(abandonedRecorder.stop).not.toHaveBeenCalled();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('does not wait for a native-only completion event after a web lifecycle stop rejects', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        mockRecorder.stop.mockRejectedValue(new Error('web stop failed'));
        await renderRecorder();
        await startRecording();
        backgroundApp();
        await act(async () => {
          for (const handler of appStateHandlers) handler('background');
          await flushMicrotasks();
        });

        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('deduplicates a foreground recovery signal while the initial storage read is pending', async () => {
      const pending = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      await renderRecorder();
      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });
      await act(async () => {
        pending.resolve(null);
        await flushMicrotasks();
      });

      expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
    });

    it('does not publish an interaction lock for an empty pending-record probe', async () => {
      const pending = deferred<PendingAssessment | null>();
      const onInteractionLockChange = jest.fn();
      asMock(loadPendingAssessment).mockReturnValue(pending.promise);
      await renderRecorder({ onInteractionLockChange });

      expect(onInteractionLockChange).not.toHaveBeenCalledWith(true);
      await act(async () => {
        pending.resolve(null);
        await flushMicrotasks();
      });
      expect(onInteractionLockChange).not.toHaveBeenCalledWith(true);
    });

    it('runs recorder-replacement cleanup before sibling layout effects', async () => {
      const { view, props } = await renderIdentityRaceRecorder();
      await startRecording();
      const abandonedRecorder = mockRecorder;
      const replacement: MockRecorder = {
        getStatus: jest.fn(() => liveRecorderState),
        prepareToRecordAsync: jest.fn(async () => undefined),
        record: jest.fn(),
        stop: jest.fn(async () => undefined),
        uri: null,
        isRecording: false,
      };
      mockRecorder = replacement;
      const siblingLayout = jest.fn(() => {
        expect(abandonedRecorder.stop).toHaveBeenCalledTimes(1);
      });

      await view.rerender(
        <IdentityLayoutHarness recorderProps={props} onRecorderLayout={siblingLayout} />,
      );
      await flushAct();

      expect(siblingLayout).toHaveBeenCalled();
      expect(replacement.stop).not.toHaveBeenCalled();
    });

    it('starts unmount cleanup before the replacement tree runs layout effects', async () => {
      const { view } = await renderRecorder();
      await startRecording();
      const replacementLayout = jest.fn(() => {
        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      });

      await view.rerender(<AfterRecorderLayout onLayout={replacementLayout} />);
      await flushAct();

      expect(replacementLayout).toHaveBeenCalledTimes(1);
    });

    it.each(['reconcile', 'prepared', 's3-granted'] as const)(
      'rechecks ownership after a rejecting endpoint callback for a %s handoff',
      async (stage) => {
        const pending = pendingRecord({
          endpoint: '/practice/attempt/native',
          stage,
          ...(stage === 's3-granted' ? { audioKey: S3_AUDIO_KEY } : {}),
        });
        asMock(loadPendingAssessment).mockResolvedValue(pending);
        const onRecoveryEndpointMismatch = jest.fn(() => {
          backgroundApp();
          return false;
        });
        const { props } = await renderRecorder({ onRecoveryEndpointMismatch });

        expect(onRecoveryEndpointMismatch).toHaveBeenCalledWith('/practice/attempt/native');
        expect(apiFetch).not.toHaveBeenCalled();
        expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
        expect(clearPendingAssessment).not.toHaveBeenCalled();
      },
    );

    it('releases recovery loading and offers one retry when endpoint restoration throws', async () => {
      const pending = pendingRecord({
        endpoint: '/practice/attempt/native',
        stage: 's3-granted',
        audioKey: S3_AUDIO_KEY,
      });
      asMock(loadPendingAssessment).mockResolvedValue(pending);
      const onRecoveryEndpointMismatch = jest.fn((): boolean => {
        throw new Error('answer-mode owner disappeared');
      });
      const { props } = await renderRecorder({ onRecoveryEndpointMismatch });

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errRecoveryMismatch'));
      expect(screen.getAllByRole('button', { name: t('common.tryAgain') })).toHaveLength(1);
      expect(apiFetch).not.toHaveBeenCalled();
      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();

      // A thrown screen callback must not retain the unpublished loading token
      // or a global lease. Retrying can take ownership and reach the durable
      // status request once the screen callback fails closed normally.
      onRecoveryEndpointMismatch.mockImplementation(() => false);
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice-native',
        questionId: QUESTION_ID,
        response: { score: 81 },
      });
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
    });

    it('hides the manual retry as soon as a live recovery loop takes ownership', async () => {
      asMock(loadPendingAssessment)
        .mockRejectedValueOnce(new Error('keychain unavailable'))
        .mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(new Promise(() => undefined));
      await renderRecorder();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: t('common.tryAgain') })).toBeTruthy(),
      );

      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('arms retry when a recorder already recovering finds another lease owner', async () => {
      const ownerStatus = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(ownerStatus.promise);
      const sharedProps = {
        ownerId: OWNER_ID,
        questionId: QUESTION_ID,
        endpoint: ENDPOINT,
        parseResult: (data: unknown) => ({ parsed: data }),
        onError: jest.fn(),
        onRecoveryUnresolved: jest.fn(),
        onResult: jest.fn(),
      };
      const view = await render(<Recorder key="owner" {...sharedProps} />);
      await flushAct();
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

      await view.rerender(
        <>
          <Recorder key="owner" {...sharedProps} />
          <Recorder key="follower" {...sharedProps} />
        </>,
      );
      await flushAct();
      const followerStart = screen.getAllByLabelText(START_LABEL)[1];
      await fireEvent.press(followerStart);
      await flushAct();

      expect(screen.getAllByText(RECOVERING_TEXT)).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: t('common.tryAgain') })).toHaveLength(1);

      await act(async () => {
        ownerStatus.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 91 },
        });
        await flushMicrotasks();
      });
    });

    async function beginS3DeadKeyRecovery(
      retryFailure: unknown,
      markRequestStarted = true,
      retryImplementation?: () => Promise<unknown>,
    ) {
      jest.useFakeTimers();
      const handoff = pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY });
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(handoff);
      mockStartedUploadFailure(new ApiError(0, 'connection interrupted'));
      for (let index = 0; index < 6; index += 1) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockImplementationOnce(
        async (_path: string, options?: { onRequestStarted?: () => void }) => {
          if (markRequestStarted) options?.onRequestStarted?.();
          if (retryImplementation) return retryImplementation();
          throw retryFailure;
        },
      );
      const rendered = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      return rendered;
    }

    it('aborts descriptor work and buys no grant when re-upload recovery becomes stale', async () => {
      const descriptor = deferred<{ name: string; type: string }>();
      asMock(resolveAudioFileDescriptor)
        .mockResolvedValueOnce({ name: 'audio.m4a', type: 'audio/mp4' })
        .mockReturnValueOnce(descriptor.promise);
      const { props } = await beginS3DeadKeyRecovery(
        new ApiError(400, 'missing audio', undefined, { code: 'AUDIO_UPLOAD_MISSING' }),
      );
      await advancePolls(5);
      await waitFor(() => expect(resolveAudioFileDescriptor).toHaveBeenCalledTimes(2));
      const descriptorSignal = asMock(resolveAudioFileDescriptor).mock.calls[1][1]
        .signal as AbortSignal;

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        descriptor.resolve({ name: 'audio.m4a', type: 'audio/mp4' });
        await flushMicrotasks();
      });

      expect(descriptorSignal.aborted).toBe(true);
      expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('passes the recovery abort signal to a fresh upload-grant request', async () => {
      const freshGrant = deferred<{
        mode: 's3';
        assessmentEndpoint: typeof ENDPOINT;
        uploadUrl: string;
        uploadFields: Record<string, string>;
        audioKey: string;
        contentType: string;
        expiresIn: number;
        maxBytes: number;
      }>();
      asMock(apiRequestAudioUpload)
        .mockResolvedValueOnce({ mode: 'direct', assessmentEndpoint: ENDPOINT })
        .mockReturnValueOnce(freshGrant.promise);
      const { props } = await beginS3DeadKeyRecovery(
        new ApiError(400, 'missing audio', undefined, { code: 'AUDIO_UPLOAD_MISSING' }),
      );
      await advancePolls(5);
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(2));
      const grantSignal = asMock(apiRequestAudioUpload).mock.calls[1][2].signal as AbortSignal;

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        freshGrant.resolve({
          mode: 's3',
          assessmentEndpoint: ENDPOINT,
          uploadUrl: 'https://s3.example.com/new',
          uploadFields: { key: S3_AUDIO_KEY },
          audioKey: S3_AUDIO_KEY,
          contentType: 'audio/mp4',
          expiresIn: 300,
          maxBytes: 25 * 1024 * 1024,
        });
        await flushMicrotasks();
      });

      expect(grantSignal.aborted).toBe(true);
      expect(markPendingAssessmentStage).toHaveBeenCalledTimes(1);
      expect(apiPostPresignedAudio).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('includes the poll exactly at a nonzero monotonic recovery deadline', async () => {
      const wallStart = new Date('2032-05-01T00:00:00Z').getTime();
      jest.useFakeTimers({ now: wallStart });
      const monotonicOrigin = 50_000;
      jest
        .spyOn(performance, 'now')
        .mockImplementation(() => monotonicOrigin + (Date.now() - wallStart));
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ createdAt: wallStart }));
      asMock(apiFetch)
        .mockRejectedValueOnce(new ApiError(503, 'busy', 300))
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 93 },
        });
      const { props } = await renderRecorder();
      expect(apiFetch).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(300_000);
        await flushMicrotasks();
      });

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 93 } });
    });

    it('does not confirm three rapid 404s from an absolute monotonic timestamp', async () => {
      const wallStart = new Date('2032-05-01T00:00:00Z').getTime();
      jest.useFakeTimers({ now: wallStart });
      const monotonicOrigin = 50_000;
      jest
        .spyOn(performance, 'now')
        .mockImplementation(() => monotonicOrigin + (Date.now() - wallStart));
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'not submitted'));
      await renderRecorder();

      await advancePolls(2);

      expect(apiFetch).toHaveBeenCalledTimes(3);
      expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
    });

    it('suppresses a status failure that resolves only after recovery backgrounds', async () => {
      const status = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockReturnValue(status.promise);
      const { props } = await renderRecorder();

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        status.reject(
          new ApiError(426, 'upgrade required', undefined, {
            code: 'CLIENT_UPGRADE_REQUIRED',
          }),
        );
        await flushMicrotasks();
      });

      expect(markPendingAssessmentForReconciliation).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    async function waitForRecoveryPostClaim(claim: Promise<boolean>) {
      asMock(claimPendingAssessmentRecoveryPost).mockReturnValue(claim);
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'not submitted'));
      const rendered = await renderRecorder();
      await advancePolls(5);
      await waitFor(() => expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(1));
      return rendered;
    }

    it('does not report a stale recovery-claim persistence rejection', async () => {
      const claim = deferred<boolean>();
      const { props } = await waitForRecoveryPostClaim(claim.promise);
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        claim.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('does not refund a stale recovery-post claim that was never acquired', async () => {
      const claim = deferred<boolean>();
      const { props } = await waitForRecoveryPostClaim(claim.promise);
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        claim.resolve(false);
        await flushMicrotasks();
      });

      expect(refundPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('returns the take with exact expiry copy when the durable recovery POST was spent', async () => {
      asMock(claimPendingAssessmentRecoveryPost).mockResolvedValue(false);
      const { props } = await beginS3DeadKeyRecovery(new Error('the POST must never be reached'));
      await advancePolls(5);

      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errRecoveryExpired')),
      );
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
    });

    it('returns the take with send-specific copy when recovery fails before dispatch', async () => {
      const { props } = await beginS3DeadKeyRecovery(null, false);
      await advancePolls(5);

      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errNotSent')));
      expect(refundPendingAssessmentRecoveryPost).toHaveBeenCalledWith(REQUEST_ID);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
    });

    it('suppresses a pre-dispatch recovery failure delivered after backgrounding', async () => {
      const retry = deferred<unknown>();
      const { props } = await beginS3DeadKeyRecovery(undefined, false, () => retry.promise);
      await advancePolls(5);
      await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(7));

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        retry.reject(null);
        await flushMicrotasks();
      });

      expect(refundPendingAssessmentRecoveryPost).toHaveBeenCalledWith(REQUEST_ID);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it.each([
      ['a plain matching object', { status: 400, code: 'AUDIO_UPLOAD_MISSING' }],
      [
        'an unrelated ApiError',
        new ApiError(400, 'validation failed', undefined, { code: 'VALIDATION_FAILED' }),
      ],
      [
        'the missing-upload code on the wrong status',
        new ApiError(404, 'not found', undefined, { code: 'AUDIO_UPLOAD_MISSING' }),
      ],
    ] as const)(
      'trusts only the exact missing-upload ApiError contract for %s',
      async (_case, error) => {
        const { props } = await beginS3DeadKeyRecovery(error);
        await advancePolls(5);
        await flushAct();

        expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
        expect(apiPostPresignedAudio).not.toHaveBeenCalled();
        expect(props.onResult).not.toHaveBeenCalled();
      },
    );

    it('does no fresh-file work when a successful dead-key refund resolves stale', async () => {
      const refund = deferred<boolean>();
      asMock(refundPendingAssessmentRecoveryPost).mockReturnValue(refund.promise);
      const { props } = await beginS3DeadKeyRecovery(
        new ApiError(400, 'missing audio', undefined, { code: 'AUDIO_UPLOAD_MISSING' }),
      );
      asMock(resolveAudioFileDescriptor).mockClear();
      await advancePolls(5);
      await waitFor(() => expect(refundPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        refund.resolve(true);
        await flushMicrotasks();
      });

      expect(resolveAudioFileDescriptor).not.toHaveBeenCalled();
      expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
    });

    it('does not report a dead-key refund rejection after recovery becomes stale', async () => {
      const refund = deferred<boolean>();
      asMock(refundPendingAssessmentRecoveryPost).mockReturnValue(refund.promise);
      const { props } = await beginS3DeadKeyRecovery(
        new ApiError(400, 'missing audio', undefined, { code: 'AUDIO_UPLOAD_MISSING' }),
      );
      await advancePolls(5);
      await waitFor(() => expect(refundPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        refund.reject(new Error('keychain unavailable'));
        await flushMicrotasks();
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(props.onRecoveryUnresolved).not.toHaveBeenCalled();
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

    it('preflights a handoff that appears while recording permission is resolving', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      await waitFor(() =>
        expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1),
      );
      asMock(loadPendingAssessment).mockClear();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 92 },
      });

      await act(async () => {
        for (const handler of appStateHandlers) handler('active');
        await flushMicrotasks();
      });

      // The foreground callback must not race the start's permission wait.
      expect(loadPendingAssessment).not.toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalled();

      await act(async () => {
        permission.resolve({ granted: true });
        await start;
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 92 } }));
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(loadPendingAssessment).toHaveBeenCalledTimes(2);
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
      mockStartedUploadFailure(new ApiError(0, 'connection interrupted'));
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment)
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(recoveryRead.promise);

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
      mockStartedApiFetchResultOnce({ score: 5 });
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

    it('suppresses an other-route feedback refresh that lands after backgrounding', async () => {
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
      asMock(markPendingAssessmentFeedbackPending).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        ),
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

    it('suppresses a feedback marker rejection that lands after backgrounding', async () => {
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 9 },
      });
      asMock(markPendingAssessmentFeedbackPending).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        ),
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
      asMock(apiFetch).mockImplementationOnce(
        (_path: string, options?: { onRequestStarted?: () => void }) => {
          options?.onRequestStarted?.();
          return resubmission.promise;
        },
      );
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

    it('suppresses a resubmission feedback marker rejection that lands after backgrounding', async () => {
      jest.useFakeTimers();
      const marker = deferred<boolean>();
      asMock(loadPendingAssessment).mockResolvedValue(S3_HANDOFF);
      mockAbsentStatusReads();
      mockStartedApiFetchResultOnce({ score: 12 });
      asMock(markPendingAssessmentFeedbackPending).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await advancePolls(5);
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        ),
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
      mockStartedApiFetchResultOnce({ score: 12 });
      asMock(markPendingAssessmentFeedbackPending).mockReturnValue(marker.promise);
      const { props } = await renderRecorder();
      await advancePolls(5);
      await waitFor(() =>
        expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
          REQUEST_ID,
          expect.any(Number),
        ),
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
        assessmentEndpoint: ENDPOINT,
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
      mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
      mockAbsentStatusReads();
      asMock(apiFetch).mockImplementationOnce(
        (_path: string, options?: { onRequestStarted?: () => void }) => {
          options?.onRequestStarted?.();
          return resubmission.promise;
        },
      );
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy());
      await advancePolls(6);
      asMock(File).mockClear();

      backgroundApp();
      await act(async () => {
        resubmission.reject(
          new ApiError(400, 'audio upload not found or expired', undefined, {
            code: 'AUDIO_UPLOAD_MISSING',
          }),
        );
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
        assessmentEndpoint: ENDPOINT,
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
      mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
      mockAbsentStatusReads();
      mockStartedApiFetchFailureOnce(
        new ApiError(400, 'audio upload not found or expired', undefined, {
          code: 'AUDIO_UPLOAD_MISSING',
        }),
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

    it('does not upload when atomic handoff creation finishes after backgrounding', async () => {
      const existing = deferred<PendingAssessment | null>();
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(loadPendingAssessment).mockReset().mockReturnValueOnce(existing.promise);

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(loadPendingAssessment).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        existing.resolve(null);
        await flushMicrotasks();
      });

      // Atomic ensure may finish the harmless prepared tombstone it began while
      // foregrounded. The post-read lifecycle check still prevents any upload;
      // foreground recovery will clear this never-sent stage directly.
      expect(savePendingAssessment).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: REQUEST_ID, stage: 'prepared' }),
      );
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
      const grant = deferred<{ mode: 'direct'; assessmentEndpoint: typeof ENDPOINT }>();
      asMock(apiRequestAudioUpload).mockReturnValue(grant.promise);
      const { props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(apiRequestAudioUpload).toHaveBeenCalledTimes(1));

      backgroundApp();
      await act(async () => {
        grant.resolve({ mode: 'direct', assessmentEndpoint: ENDPOINT });
        await flushMicrotasks();
      });

      expect(markPendingAssessmentStage).not.toHaveBeenCalled();
      expect(apiUploadAudio).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('abandons a capacity retry that wakes up after backgrounding', async () => {
      jest.useFakeTimers();
      asMock(apiUploadAudio).mockRejectedValue(
        new ApiError(503, 'capacity busy', 1, { code: 'CAPACITY_BUSY' }),
      );
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
      mockStartedUploadFailure({ status: 503, message: 'not an ApiError' });
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

    it('finishes durable pre-POST cancel cleanup when abort rejection lands after backgrounding', async () => {
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

      expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
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
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
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
      mockStartedUploadFailure(new Error('unexpected transport defect'));
      const { view, props } = await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() =>
        expect(props.onError).toHaveBeenCalledWith(t('recorder.errNothingToConfirm')),
      );

      const cleared = deferred<void>();
      asMock(clearPendingAssessment).mockReturnValue(cleared.promise);
      asMock(setAudioModeAsync).mockClear();
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
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
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
      });
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      asMock(File).mockClear();
      const stopHandler = compositePressableProps(view, STOP_LABEL).onPress as () => Promise<void>;
      let pendingStop!: Promise<void>;
      await act(() => {
        pendingStop = stopHandler();
      });

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
        canRecord: false,
        isRecording: false,
        durationMillis: 30_000,
        url: null,
        mediaServicesDidReset: false,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });
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
        assessmentEndpoint: ENDPOINT,
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
      mockStartedApiFetchFailureOnce(new ApiError(0, 'connection interrupted'));
      mockAbsentStatusReads();
      mockStartedApiFetchFailureOnce(
        new ApiError(400, 'audio upload not found or expired', undefined, {
          code: 'AUDIO_UPLOAD_MISSING',
        }),
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
          size: 1024,
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
      mockStartedApiFetchFailureOnce(
        new ApiError(400, 'audio upload not found or expired', undefined, {
          code: 'AUDIO_UPLOAD_MISSING',
        }),
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
        getStatus: jest.fn(() => liveRecorderState),
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
        getStatus: jest.fn(() => liveRecorderState),
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
      // The abandoned instance's live take and the replacement instance's
      // later take are distinct recordings even though this mock reuses a URI.
      expect(deletedRecordingUris()).toEqual([RECORDING_URI, RECORDING_URI]);
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

    it('stays locked while a re-record clears the previous take', async () => {
      const onInteractionLockChange = jest.fn();
      await renderRecorder({ onInteractionLockChange });
      await recordAndStop();
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
      onInteractionLockChange.mockClear();

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy());

      expect(onInteractionLockChange).not.toHaveBeenCalledWith(false);
      expect(onInteractionLockChange).not.toHaveBeenCalled();
    });

    it('unlocks when an ambiguous submission has nothing left to confirm', async () => {
      mockStartedUploadFailure(new Error('unexpected transport defect'));
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
      mockStartedApiFetchResultOnce({ score: 77 });
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

      // Swapping the callback releases the old one and synchronously publishes
      // the lock currently held by the saved take to its replacement.
      await view.rerender(<Recorder {...props} onInteractionLockChange={second} />);
      await flushAct();
      expect(first).toHaveBeenLastCalledWith(false);
      expect(second).toHaveBeenLastCalledWith(true);
      second.mockClear();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      // recorded -> uploading remains locked, so it must not falsely announce a
      // new lock transition merely because the phase changed.
      expect(second).not.toHaveBeenCalled();

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
      expect(second).toHaveBeenLastCalledWith(false);
    });

    it('stays locked and reports unavailable retry storage while already recovering', async () => {
      mockStartedUploadFailure(new ApiError(0, 'connection interrupted'));
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await recordAndStop();
      asMock(loadPendingAssessment)
        .mockReset()
        .mockResolvedValueOnce(null)
        .mockRejectedValue(new Error('keychain unavailable'));

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
  describe('mutation audit: recovery, lifecycle, and native bridge ownership', () => {
    it('reads native recorder properties defensively and fails closed', () => {
      const releasedRecorder = {} as Pick<MockRecorder, 'uri' | 'isRecording'>;
      Object.defineProperties(releasedRecorder, {
        uri: {
          get: () => {
            throw new Error('released URI');
          },
        },
        isRecording: {
          get: () => {
            throw new Error('released state');
          },
        },
      });

      expect(readRecorderUri(releasedRecorder as never)).toBeNull();
      expect(readRecorderIsRecording(releasedRecorder as never)).toBe(true);
      expect(readRecorderUri({ uri: RECORDING_URI } as never)).toBe(RECORDING_URI);
      expect(readRecorderIsRecording({ isRecording: false } as never)).toBe(false);
    });

    it('audit 2 keeps an ambiguous S3 replay inside its positive backoff window', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let index = 0; index < 6; index += 1) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      mockStartedApiFetchFailureOnce(new ApiError(0, 'response disconnected'));
      asMock(apiFetch).mockRejectedValue(new ApiError(404, 'still absent'));
      await renderRecorder();

      await advancePolls(5);
      expect(asMock(apiFetch).mock.calls.filter(([path]) => path === ENDPOINT)).toHaveLength(1);
      expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(1);

      await advancePolls(1);
      expect(claimPendingAssessmentRecoveryPost).toHaveBeenCalledTimes(1);
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it('audit 4 preserves the ordinary poll interval when no Retry-After exists', async () => {
      jest.useFakeTimers();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockRejectedValueOnce(new Error('offline without retry hint'))
        .mockResolvedValueOnce({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 77 },
        });
      const { props } = await renderRecorder();

      await act(async () => {
        jest.advanceTimersByTime(1_999);
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(1);
        await flushMicrotasks();
      });

      expect(apiFetch).toHaveBeenCalledTimes(2);
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 77 } });
    });

    it('audit 16-19 does not resume a deferred permission grant after focus leaves', async () => {
      jest.useFakeTimers();
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();
      let staleStart!: Promise<void>;
      await act(() => {
        staleStart = invokePressHandler(view, START_LABEL);
      });
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        permission.resolve({ granted: true });
        await flushMicrotasks();
        jest.advanceTimersByTime(2_000);
        await staleStart;
      });

      await act(async () => {
        blurScreen();
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

      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('audit 20-21 renders a retryable deferred denial without opening Settings', async () => {
      jest.useFakeTimers();
      const permission = deferred<{ granted: boolean; canAskAgain: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view } = await renderRecorder();
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        permission.resolve({ granted: false, canAskAgain: true });
        await flushMicrotasks();
        jest.advanceTimersByTime(2_000);
        await start;
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

      expect(screen.getByText(t('recorder.permissionRetryBody'))).toBeTruthy();
      expect(screen.queryByText(t('recorder.openSettings'))).toBeNull();
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('audit 26,28,29,31 releases preview when background discards review', async () => {
      await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: t('recorder.playLabel') }));
      const listener = previewListenerSubscription();

      backgroundApp();
      await act(async () => {
        for (const handler of appStateHandlers) handler('background');
        await flushMicrotasks();
      });

      expect(mockPreviewPlayer.remove).toHaveBeenCalledTimes(1);
      expect(listener.remove).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 14 refocuses with the current identity recovery callback', async () => {
      const { view, props } = await renderRecorder();
      await act(async () => {
        blurScreen();
        await flushMicrotasks();
      });
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { score: 79 },
      });
      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();

      await act(async () => {
        focusScreen();
        await flushMicrotasks();
      });

      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
      });
      expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 79 } });
    });

    it('audit 13 runs deferred recovery through the latest identity callback', async () => {
      const permission = deferred<{ granted: boolean; canAskAgain: boolean }>();
      const { view, props } = await renderRecorder();
      await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
      await flushAct();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ questionId: OTHER_QUESTION_ID }),
      );
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: OTHER_QUESTION_ID,
        response: { score: 83 },
      });
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('active');
        await flushMicrotasks();
      });

      await act(async () => {
        permission.resolve({ granted: false, canAskAgain: false });
        await start;
        await flushMicrotasks();
      });

      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 83 } }));
      expect(apiFetch).toHaveBeenCalledWith(`/assessments/${REQUEST_ID}`, {
        timeoutMs: 5000,
        signal: expect.any(AbortSignal),
      });
    });

    it('audit 60-66 resumes an inactive Start without a false failure', async () => {
      const { view, props } = await renderRecorder();
      backgroundApp();
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      expect(mockRecorder.record).not.toHaveBeenCalled();

      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('active');
        await start;
        await flushMicrotasks();
      });

      expect(mockRecorder.record).toHaveBeenCalledWith({ forDuration: 120 });
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
    });

    it('audit 68 never treats an ordinary permission read as a resumable prompt', async () => {
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view, props } = await renderRecorder();
      let staleStart!: Promise<void>;
      await act(() => {
        staleStart = invokePressHandler(view, START_LABEL);
      });

      backgroundApp();
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('background');
        await flushMicrotasks();
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('active');
        permission.resolve({ granted: true });
        await staleStart;
        await flushMicrotasks();
      });

      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('audit 67 does not open a permission prompt after lifecycle invalidation', async () => {
      const permission = deferred<{ granted: boolean; canAskAgain: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view } = await renderRecorder();
      let staleStart!: Promise<void>;
      await act(() => {
        staleStart = invokePressHandler(view, START_LABEL);
      });
      backgroundApp();
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('background');
        permission.resolve({ granted: false, canAskAgain: true });
        await staleStart;
      });

      expect(AudioModule.requestRecordingPermissionsAsync).not.toHaveBeenCalled();
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('audit 76 suppresses a pending-storage failure after backgrounding', async () => {
      const pendingRead = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(pendingRead.promise);
      const { view, props } = await renderRecorder();
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      backgroundApp();
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('background');
        pendingRead.reject(new Error('keychain unavailable'));
        await start;
      });

      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.queryByText(RECOVERING_TEXT)).toBeNull();
    });

    it('audit 77 ignores pending metadata that resolves after lifecycle invalidation', async () => {
      const pendingRead = deferred<PendingAssessment | null>();
      asMock(loadPendingAssessment)
        .mockResolvedValueOnce(null)
        .mockReturnValueOnce(pendingRead.promise);
      const { view, props } = await renderRecorder();
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      backgroundApp();
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('background');
        pendingRead.resolve(pendingRecord());
        await start;
      });

      expect(apiFetch).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
      expect(props.onResult).not.toHaveBeenCalled();
      expect(screen.queryByText(RECOVERING_TEXT)).toBeNull();
    });

    it('audit 78,100 hands a Start-discovered record to recovery', async () => {
      asMock(loadPendingAssessment).mockResolvedValueOnce(null).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        response: { score: 88 },
      });
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { score: 88 } }));

      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });

    it('audit 37,38 rejects a nonfinite native completion duration', async () => {
      let now = 10_000;
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      const { props } = await renderRecorder();
      await startRecording();
      now = Number.POSITIVE_INFINITY;
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: Number.POSITIVE_INFINITY,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errTooShort'));
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
    });

    it('audit 42 accepts an exactly 500ms authoritative completion', async () => {
      let now = 10_000;
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      const { props } = await renderRecorder();
      await startRecording();
      now = 10_500;
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 500,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });

      expect(screen.getByText(recordedStatusText('0:00'))).toBeTruthy();
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('audit 44 calls an unusable exactly 500ms completion a save failure', async () => {
      let now = 10_000;
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      asMock(File).mockImplementation((uri: string) => ({
        uri,
        exists: true,
        size: 0,
        delete: jest.fn(),
      }));
      const { props } = await renderRecorder();
      await startRecording();
      now = 10_500;
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 500,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
      expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errTooShort'));
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 43 releases the interaction lock after a too-short completion', async () => {
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await startRecording();
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 499,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errTooShort'));
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(false);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 47-49 adopts fallback completion only after recording was observed', async () => {
      jest.useFakeTimers();
      mockRecorder.getStatus.mockImplementation(() => ({ ...mockRecorderState }));
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, isRecording: true, durationMillis: 2_000 };
      await act(async () => {
        jest.advanceTimersByTime(200);
        await flushMicrotasks();
      });

      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 4_000,
      };
      await act(async () => {
        jest.advanceTimersByTime(200);
        await flushMicrotasks();
      });

      expect(screen.getByText(recordedStatusText('0:04'))).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('audit 50-53 adopts an event URL without reading a released recorder URI', async () => {
      let now = 10_000;
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      const { props } = await renderRecorder();
      await startRecording();
      now = 12_000;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: true,
        isRecording: false,
        durationMillis: 2_000,
      };
      Object.defineProperty(mockRecorder, 'uri', {
        configurable: true,
        get: () => {
          throw new Error('released recorder URI');
        },
      });

      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });

      expect(screen.getByText(recordedStatusText('0:02'))).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('bridge fallback adopts recorder-state URL when the native URI getter throws', async () => {
      const stateUri = 'file:///recordings/status-fallback.m4a';
      let now = 10_000;
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      const { props } = await renderRecorder();
      await startRecording();
      now = 13_000;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 3_000,
        url: stateUri,
      };
      Object.defineProperty(mockRecorder, 'uri', {
        configurable: true,
        get: () => {
          throw new Error('released recorder URI');
        },
      });
      mockRecorder.getStatus.mockImplementation(() => ({ ...mockRecorderState }));
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: null });
        await flushMicrotasks();
      });

      expect(screen.getByText(recordedStatusText('0:03'))).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('audit 54 subtracts a nonzero monotonic recording start', async () => {
      let now = 10_000;
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      await renderRecorder();
      await startRecording();
      now = 15_000;
      mockRecorder.uri = RECORDING_URI;
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 0,
      };
      await act(async () => {
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        await flushMicrotasks();
      });

      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
    });

    it('audit 58,90 never disposes a recorder when permission preflight fails', async () => {
      asMock(AudioModule.getRecordingPermissionsAsync).mockRejectedValue(
        new Error('permission bridge failed'),
      );
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(mockRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(mockRecorder.stop).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 83,91 disposes native preparation when record throws', async () => {
      mockRecorder.prepareToRecordAsync.mockImplementation(async () => {
        mockRecorder.uri = RECORDING_URI;
      });
      mockRecorder.record.mockImplementation(() => {
        throw new Error('native record start failed');
      });
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ allowsRecording: false }),
      );
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('still attempts web stop when prepared-stream priming throws', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        mockRecorder.prepareToRecordAsync.mockImplementation(async () => {
          mockRecorder.uri = RECORDING_URI;
        });
        mockRecorder.record.mockImplementation(() => {
          throw new Error('web MediaRecorder could not start');
        });
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
        });
        const { props } = await renderRecorder();

        await fireEvent.press(screen.getByLabelText(START_LABEL));
        await waitFor(() =>
          expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')),
        );

        // The first call is the real Start and the second is disposal's attempt
        // to prime an inactive MediaRecorder. Even when both throw, stop remains
        // an independent cleanup boundary for any getUserMedia tracks acquired
        // by prepareToRecordAsync.
        expect(mockRecorder.record).toHaveBeenCalledTimes(2);
        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
        expect(deletedRecordingUris()).toContain(RECORDING_URI);
        expect(setAudioModeAsync).toHaveBeenLastCalledWith(
          expect.objectContaining({ allowsRecording: false }),
        );
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('deletes every rotated preparation candidate while preserving the prior take', async () => {
      const preparedUri = 'file:///recordings/prepared-a.m4a';
      const disposedUri = 'file:///recordings/prepared-b.m4a';
      const { props } = await renderRecorder();
      await recordAndStop();
      asMock(File).mockClear();
      mockRecorder.prepareToRecordAsync.mockImplementation(async () => {
        mockRecorder.uri = preparedUri;
        mockRecorder.isRecording = false;
      });
      mockRecorder.record.mockImplementation(() => {
        mockRecorder.uri = disposedUri;
        throw new Error('record failed after rotating the prepared URI');
      });
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.isRecording = false;
      });

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(deletedRecordingUris()).toEqual(expect.arrayContaining([preparedUri, disposedUri]));
      expect(deletedRecordingUris()).not.toContain(RECORDING_URI);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
    });

    it('evicts an obsolete prepared URI when successful recording rotates to a live URI', async () => {
      const preparedUri = 'file:///recordings/success-prepared-a.m4a';
      const liveUri = 'file:///recordings/success-live-b.m4a';
      mockRecorder.prepareToRecordAsync.mockImplementation(async () => {
        mockRecorder.uri = preparedUri;
      });
      mockRecorder.record.mockImplementation(() => {
        mockRecorder.uri = liveUri;
        mockRecorder.isRecording = true;
        mockRecorderState = { ...mockRecorderState, canRecord: true, isRecording: true };
      });
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = liveUri;
        mockRecorder.isRecording = false;
        mockRecorderState = { ...mockRecorderState, canRecord: false, isRecording: false };
        emitRecordingStatus({ isFinished: true, url: liveUri });
      });
      await renderRecorder();

      await startRecording();
      expect(deletedRecordingUris()).toContain(preparedUri);
      expect(deletedRecordingUris()).not.toContain(liveUri);

      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(deletedRecordingUris()).not.toContain(liveUri);
    });

    it('audit 1,97,99 preserves a prior take when re-record preparation fails', async () => {
      const onInteractionLockChange = jest.fn();
      const { props } = await renderRecorder({ onInteractionLockChange });
      await recordAndStop();
      asMock(File).mockClear();
      mockRecorder.prepareToRecordAsync.mockRejectedValueOnce(new Error('prepare failed'));

      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(deletedRecordingUris()).toEqual([]);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
      expect(onInteractionLockChange).toHaveBeenLastCalledWith(true);
    });

    it('bridge cleanup restores ownership when prepared URI reads fail', async () => {
      let backingUri: string | null = null;
      let uriReads = 0;
      const { props } = await renderRecorder();
      Object.defineProperty(mockRecorder, 'uri', {
        configurable: true,
        get: () => {
          uriReads += 1;
          if (uriReads === 1) throw new Error('first prepared URI read failed');
          return backingUri;
        },
        set: (value: string | null) => {
          backingUri = value;
        },
      });
      mockRecorder.prepareToRecordAsync.mockImplementation(async () => {
        backingUri = RECORDING_URI;
      });
      mockRecorder.record.mockImplementation(() => {
        throw new Error('record failed after preparation');
      });

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(deletedRecordingUris()).toContain(RECORDING_URI);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ allowsRecording: false }),
      );
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 96 reports only Start failure when cleanup audio reset also fails', async () => {
      mockRecorder.prepareToRecordAsync.mockRejectedValue(new Error('prepare failed'));
      asMock(setAudioModeAsync).mockImplementation(
        ({ allowsRecording }: { allowsRecording: boolean }) =>
          allowsRecording ? Promise.resolve() : Promise.reject(new Error('restore failed')),
      );
      const { props } = await renderRecorder();

      await fireEvent.press(screen.getByLabelText(START_LABEL));
      await waitFor(() => expect(props.onError).toHaveBeenCalledWith(t('recorder.errStartFailed')));

      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errAudioReset'));
    });

    it('audit 87,88,121,122 keeps the web auto-stop at 120s and protects its take', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = RECORDING_URI;
        });
        await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = 120_000;

        await act(async () => {
          jest.advanceTimersByTime(119_999);
          await flushMicrotasks();
        });
        expect(mockRecorder.stop).not.toHaveBeenCalled();
        await act(async () => {
          jest.advanceTimersByTime(1);
          await flushMicrotasks();
        });
        await waitFor(() => expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy());

        await fireEvent.press(screen.getByLabelText(START_LABEL));
        expect(mockRecorder.record).toHaveBeenCalledTimes(1);
        expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('audit 102 keeps an overlapping Stop from settling the take twice', async () => {
      const nativeStop = deferred<void>();
      asMock(setAudioModeAsync).mockImplementation(
        async ({ allowsRecording }: { allowsRecording: boolean }) => {
          if (!allowsRecording) emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        },
      );
      mockRecorder.stop.mockImplementation(async () => {
        await nativeStop.promise;
        mockRecorder.isRecording = false;
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
      });
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      asMock(File).mockClear();
      const stopHandler = compositePressableProps(view, STOP_LABEL).onPress as () => Promise<void>;
      let first!: Promise<void>;
      let second!: Promise<void>;
      await act(() => {
        first = stopHandler();
        second = stopHandler();
      });
      await act(async () => {
        nativeStop.resolve();
        await Promise.all([first, second]);
      });

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(SUBMIT_TEXT)).toBeTruthy();
      expect(setAudioModeAsync).toHaveBeenCalledTimes(2);
      expect(File).toHaveBeenCalledTimes(1);
    });

    it('audit 113,115 rejects an unusable file after a successful native stop', async () => {
      asMock(File).mockImplementation((uri: string) => ({
        uri,
        exists: true,
        size: 0,
        delete: jest.fn(),
      }));
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
    });

    it.each([
      ['native failure', true, RECORDING_URI, 100],
      ['missing URI', false, null, 100],
      ['exact-boundary unusable', false, RECORDING_URI, 500],
    ] as const)(
      'audit 118-120 reports save failure for %s',
      async (_case, stopFails, uri, durationMillis) => {
        asMock(File).mockImplementation((candidate: string) => ({
          uri: candidate,
          exists: true,
          size: _case === 'exact-boundary unusable' ? 0 : 1024,
          delete: jest.fn(),
        }));
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = uri;
          emitRecordingStatus({
            isFinished: true,
            hasError: stopFails,
            url: uri,
          });
        });
        const { props } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = durationMillis;

        await fireEvent.press(screen.getByLabelText(STOP_LABEL));

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
        expect(props.onError).not.toHaveBeenCalledWith(t('recorder.errTooShort'));
        expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
      },
    );

    it('audit 123,132,134,136,138 adopts a rejected stop with explicit healthy flags', async () => {
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.isRecording = false;
        mockRecorder.uri = null;
        emitRecordingStatus({
          isFinished: true,
          hasError: false,
          mediaServicesDidReset: false,
          url: RECORDING_URI,
        });
        throw new Error('native stop raced auto completion');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(screen.getByText(recordedStatusText('0:05'))).toBeTruthy();
      expect(props.onError).not.toHaveBeenCalled();
      expect(deletedRecordingUris()).toEqual([]);
    });

    it.each([
      ['encoder error', { hasError: true, mediaServicesDidReset: false }],
      ['media reset', { hasError: false, mediaServicesDidReset: true }],
    ] as const)('rejected-stop completion fails closed for %s', async (_case, flags) => {
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.isRecording = false;
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI, ...flags });
        throw new Error('native stop rejected');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 125,127,129 rejects an unusable file after native Stop rejects', async () => {
      asMock(File).mockImplementation((uri: string) => ({
        uri,
        exists: true,
        size: 0,
        delete: jest.fn(),
      }));
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.isRecording = false;
        mockRecorder.uri = RECORDING_URI;
        throw new Error('native stop rejected');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 126,128,130 handles a missing rejected-stop URI without throwing', async () => {
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.isRecording = false;
        mockRecorder.uri = null;
        throw new Error('native stop rejected without a file');
      });
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('bridge cleanup settles a rejected stop when native getters throw', async () => {
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState.durationMillis = 5_000;
      mockRecorder.stop.mockRejectedValue(new Error('native stop rejected'));
      Object.defineProperties(mockRecorder, {
        uri: {
          configurable: true,
          get: () => {
            throw new Error('released URI');
          },
        },
        isRecording: {
          configurable: true,
          get: () => {
            throw new Error('released recording state');
          },
        },
      });

      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(setAudioModeAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({ allowsRecording: false }),
      );
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('audit 108 honors a current web terminal failure instead of dropping it', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = RECORDING_URI;
          emitRecordingStatus({
            isFinished: true,
            hasError: true,
            url: RECORDING_URI,
          });
        });
        const { props } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = 5_000;

        await fireEvent.press(screen.getByLabelText(STOP_LABEL));

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
        expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('audit 110 rejects an Android stop result that lacks its native URL', async () => {
      jest.useFakeTimers();
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
      try {
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = RECORDING_URI;
          return {};
        });
        const { view, props } = await renderRecorder();
        await startRecording();
        mockRecorderState.durationMillis = 5_000;
        let stop!: Promise<void>;
        await act(() => {
          stop = invokePressHandler(view, STOP_LABEL);
        });
        await act(async () => {
          jest.advanceTimersByTime(500);
          await stop;
        });

        expect(props.onError).toHaveBeenCalledWith(t('recorder.errSaveFailed'));
        expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
      }
    });

    it('audit 34 reports elapsed wait time from a nonzero monotonic origin', async () => {
      jest.useFakeTimers();
      let now = 20_000;
      jest.spyOn(performance, 'now').mockImplementation(() => now);
      const upload = deferred<{ ok: boolean }>();
      asMock(apiUploadAudio).mockReturnValue(upload.promise);
      await renderRecorder();
      await recordAndStop();

      await fireEvent.press(screen.getByRole('button', { name: SUBMIT_TEXT }));
      await waitFor(() => expect(screen.getByText(waitingForText('0:00'))).toBeTruthy());
      now = 21_000;
      await act(async () => {
        jest.advanceTimersByTime(1_000);
        await flushMicrotasks();
      });

      expect(screen.getByText(waitingForText('0:01'))).toBeTruthy();
      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
    });

    it('audit 46 reports one reset when both terminal effects observe the event', async () => {
      const nativeStop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => nativeStop.promise);
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };

      await act(async () => {
        emitRecordingStatus({ mediaServicesDidReset: true });
        await flushMicrotasks();
      });
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errDeviceInterrupted'));
      expect(props.onError).toHaveBeenCalledTimes(1);
      await act(async () => {
        mockRecorder.isRecording = false;
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        nativeStop.resolve();
        await flushMicrotasks();
      });
    });

    it('audit 55 remembers a polled media reset while native cleanup is pending', async () => {
      const nativeStop = deferred<void>();
      mockRecorder.stop.mockImplementation(async () => nativeStop.promise);
      const { view, props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };
      await view.rerender(<Recorder {...props} />);
      await flushAct();
      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: false };
      await view.rerender(<Recorder {...props} />);
      await flushAct();
      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(props.onError).toHaveBeenCalledWith(t('recorder.errDeviceInterrupted'));
      expect(props.onError).toHaveBeenCalledTimes(1);
      await act(async () => {
        mockRecorder.isRecording = false;
        mockRecorder.uri = RECORDING_URI;
        emitRecordingStatus({ isFinished: true, url: RECORDING_URI });
        nativeStop.resolve();
        await flushMicrotasks();
      });
    });

    it('audit 56 rejects a queued Start handler bound to a replaced recorder object', async () => {
      const { view, props } = await renderRecorder();
      const staleStart = compositePressableProps(view, START_LABEL).onPress as () => unknown;
      const oldRecorder = mockRecorder;
      const replacement: MockRecorder = {
        getStatus: jest.fn(() => liveRecorderState),
        prepareToRecordAsync: jest.fn(async () => undefined),
        record: jest.fn(),
        stop: jest.fn(async () => undefined),
        uri: null,
        isRecording: false,
      };
      mockRecorder = replacement;
      await view.rerender(<Recorder {...props} />);
      await flushAct();
      oldRecorder.prepareToRecordAsync.mockClear();
      oldRecorder.record.mockClear();
      replacement.prepareToRecordAsync.mockClear();

      await act(async () => {
        await Promise.resolve(staleStart());
        await flushMicrotasks();
      });

      expect(oldRecorder.prepareToRecordAsync).not.toHaveBeenCalled();
      expect(oldRecorder.record).not.toHaveBeenCalled();
      expect(replacement.prepareToRecordAsync).not.toHaveBeenCalled();
    });

    it('audit 69,70,73 discards a granted prompt that times out while blurred', async () => {
      jest.useFakeTimers();
      const permission = deferred<{ granted: boolean }>();
      asMock(AudioModule.getRecordingPermissionsAsync).mockResolvedValue({ granted: false });
      asMock(AudioModule.requestRecordingPermissionsAsync).mockReturnValue(permission.promise);
      const { view } = await renderRecorder();
      let start!: Promise<void>;
      await act(() => {
        start = invokePressHandler(view, START_LABEL);
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'inactive',
      });
      await act(async () => {
        blurScreen();
        await flushMicrotasks();
      });
      await act(async () => {
        permission.resolve({ granted: true });
        await flushMicrotasks();
        jest.advanceTimersByTime(2_000);
        await start;
      });

      await act(async () => {
        focusScreen();
        await flushMicrotasks();
      });
      Object.defineProperty(AppState, 'currentState', {
        configurable: true,
        writable: true,
        value: 'active',
      });
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('active');
        await flushMicrotasks();
      });

      expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).not.toHaveBeenCalled();
    });

    it('audit 86 requires observing each new take before fallback adoption', async () => {
      const { view, props } = await renderRecorder();
      await recordAndStop();
      await fireEvent.press(screen.getByRole('button', { name: RERECORD_TEXT }));
      mockRecorderState = {
        ...mockRecorderState,
        canRecord: false,
        isRecording: false,
        durationMillis: 4_000,
      };
      await view.rerender(<Recorder {...props} />);
      await flushAct();

      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
    });

    it('audit 80 rechecks lifecycle before taking a released global audio session', async () => {
      const firstProps = recorderTestProps();
      const secondProps = recorderTestProps({ questionId: OTHER_QUESTION_ID });
      let view: RenderResult | undefined;
      let waitingStart: Promise<void> | undefined;
      try {
        view = await render(
          <>
            <Recorder {...firstProps} />
            <Recorder {...secondProps} />
          </>,
        );
        await flushAct();
        const firstStart = compositePressablePropsForNode(screen.getAllByLabelText(START_LABEL)[0])
          .onPress as () => unknown;
        await act(async () => {
          await Promise.resolve(firstStart());
        });
        const secondStart = compositePressablePropsForNode(screen.getByLabelText(START_LABEL))
          .onPress as () => unknown;
        await act(() => {
          waitingStart = Promise.resolve(secondStart()).then(() => undefined);
        });
        await flushAct();

        let releasedWhileBlurred = false;
        await act(async () => {
          blurScreen();
          releasedWhileBlurred = await settlesWithin(waitingStart!);
          await flushMicrotasks();
        });
        expect(releasedWhileBlurred).toBe(true);

        const recordingModeCalls = asMock(setAudioModeAsync).mock.calls.filter(
          ([options]) => (options as { allowsRecording: boolean }).allowsRecording,
        );
        expect(recordingModeCalls).toHaveLength(1);
        expect(secondProps.onError).not.toHaveBeenCalled();
      } finally {
        // Unmount releases the first recorder's global session even if the
        // focus-teardown assertion fails. The bounded flush lets the queued
        // second Start observe that release without recreating a test hang.
        await view?.unmount();
        await act(async () => {
          if (waitingStart) await settlesWithin(waitingStart);
          await flushMicrotasks();
        });
      }
    });
  });

  describe('fresh 1501-2500 deterministic mutation contracts', () => {
    it('releases a missing recovery probe before any later operation begins', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(null);
      const { view } = await renderRecorder();

      await act(async () => {
        await invokePressHandler(view, START_LABEL);
        await flushMicrotasks();
      });

      expect(AudioModule.getRecordingPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mockRecorder.record).toHaveBeenCalledTimes(1);
    });

    it('marks a post-load foreign recovery lease with one deterministic retry', async () => {
      const ownerLoad = deferred<PendingAssessment | null>();
      const followerLoad = deferred<PendingAssessment | null>();
      const ownerStatus = deferred<unknown>();
      asMock(loadPendingAssessment)
        .mockReturnValueOnce(ownerLoad.promise)
        .mockReturnValueOnce(followerLoad.promise);
      asMock(apiFetch).mockReturnValue(ownerStatus.promise);
      const sharedProps = recorderTestProps();
      await render(
        <>
          <Recorder key="lease-owner" {...sharedProps} />
          <Recorder key="lease-follower" {...sharedProps} />
        </>,
      );
      await flushAct();
      expect(loadPendingAssessment).toHaveBeenCalledTimes(2);

      await act(async () => {
        ownerLoad.resolve(pendingRecord());
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(1);
      await act(async () => {
        followerLoad.resolve(pendingRecord());
        await flushMicrotasks();
      });

      expect(screen.getAllByText(RECOVERING_TEXT)).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: t('common.tryAgain') })).toHaveLength(1);
      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(sharedProps.onError).not.toHaveBeenCalledWith(t('recorder.errNothingToConfirm'));
      await act(async () => {
        ownerStatus.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 91 },
        });
        await flushMicrotasks();
      });
    });

    it('does not report a throwing endpoint callback after it backgrounds recovery', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({
          endpoint: '/practice/attempt/native',
          stage: 's3-granted',
          audioKey: S3_AUDIO_KEY,
        }),
      );
      const onRecoveryEndpointMismatch = jest.fn((): boolean => {
        backgroundApp();
        throw new Error('route disappeared');
      });
      const { props } = await renderRecorder({ onRecoveryEndpointMismatch });

      expect(onRecoveryEndpointMismatch).toHaveBeenCalledTimes(1);
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: t('common.tryAgain') })).toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it('starts focused recovery work without waiting for a result callback', async () => {
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch).mockResolvedValue({
        status: 'processing',
        context: 'practice',
        questionId: QUESTION_ID,
      });
      await renderRecorder();
      await flushAct();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText(RECOVERING_TEXT)).toBeTruthy();
    });

    it.each(['reconcile', 'prepared'] as const)(
      'handles the %s stage without entering the recovery poll loop',
      async (stage) => {
        asMock(loadPendingAssessment).mockResolvedValue(pendingRecord({ stage }));
        asMock(apiFetch).mockImplementation(() => {
          throw new Error(`${stage} must not poll`);
        });
        const { props } = await renderRecorder();
        await flushAct();

        expect(apiFetch).not.toHaveBeenCalled();
        if (stage === 'reconcile') {
          expect(props.onRecoveryUnresolved).toHaveBeenCalledTimes(1);
        } else {
          expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
        }
      },
    );

    it('does not claim or clear after the absence-confirming 404 becomes stale', async () => {
      jest.useFakeTimers();
      const finalStatus = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(
        pendingRecord({ stage: 's3-granted', audioKey: S3_AUDIO_KEY }),
      );
      for (let index = 0; index < 5; index += 1) {
        asMock(apiFetch).mockRejectedValueOnce(new ApiError(404, 'not submitted'));
      }
      asMock(apiFetch).mockReturnValueOnce(finalStatus.promise);
      await renderRecorder();
      await advancePolls(4);
      expect(apiFetch).toHaveBeenCalledTimes(5);
      await act(async () => {
        jest.advanceTimersByTime(2_000);
        await flushMicrotasks();
      });
      expect(apiFetch).toHaveBeenCalledTimes(6);

      backgroundApp();
      await act(async () => {
        for (const handler of [...appStateHandlers]) handler('background');
        finalStatus.reject(new ApiError(404, 'late absence'));
        await flushMicrotasks();
      });

      expect(claimPendingAssessmentRecoveryPost).not.toHaveBeenCalled();
      expect(clearPendingAssessment).not.toHaveBeenCalled();
    });

    it('does not let an invalidated recovery finally clear a replacement lease', async () => {
      const oldStatus = deferred<unknown>();
      const replacementStatus = deferred<unknown>();
      asMock(loadPendingAssessment).mockResolvedValue(pendingRecord());
      asMock(apiFetch)
        .mockReturnValueOnce(oldStatus.promise)
        .mockReturnValueOnce(replacementStatus.promise)
        .mockReturnValue(new Promise(() => undefined));
      const props = recorderTestProps();
      const view = await render(<Recorder key="old-owner" {...props} />);
      await flushAct();
      expect(apiFetch).toHaveBeenCalledTimes(1);

      await view.rerender(<Recorder key="replacement-owner" {...props} />);
      await flushAct();
      expect(apiFetch).toHaveBeenCalledTimes(2);
      await act(async () => {
        oldStatus.reject(new ApiError(0, 'old owner aborted late'));
        await flushMicrotasks();
      });

      await view.rerender(
        <>
          <Recorder key="replacement-owner" {...props} />
          <Recorder key="lease-probe" {...props} />
        </>,
      );
      await flushAct();
      expect(apiFetch).toHaveBeenCalledTimes(2);
      await act(async () => {
        replacementStatus.resolve({
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          response: { score: 94 },
        });
        await flushMicrotasks();
      });
    });

    it('does not adopt a stopped-looking URI without observation or completion', async () => {
      mockRecorder.getStatus.mockImplementation(() => ({ ...mockRecorderState }));
      mockRecorder.record.mockImplementation(() => {
        mockRecorder.uri = RECORDING_URI;
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: true,
          isRecording: false,
          durationMillis: 4_000,
          url: null,
        };
      });
      const { props } = await renderRecorder();
      await startRecording();
      await flushAct();

      expect(screen.getByLabelText(STOP_LABEL)).toBeTruthy();
      expect(screen.queryByText(SUBMIT_TEXT)).toBeNull();
      expect(props.onError).not.toHaveBeenCalled();
    });

    it('registers the AppState listener and stops synchronously on background', async () => {
      await renderRecorder();
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      await startRecording();
      const handler = appStateHandlers.at(-1);
      if (!handler) throw new Error('AppState handler missing');

      backgroundApp();
      await act(() => {
        handler('background');
        expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      });
    });

    it('does not run terminal cleanup while an idle recorder has no failure', async () => {
      const { props } = await renderRecorder();
      await flushAct();

      expect(mockRecorder.stop).not.toHaveBeenCalled();
      expect(props.onError).not.toHaveBeenCalled();
      expect(screen.getByText(IDLE_TEXT)).toBeTruthy();
    });

    it('reports one exact reset error and starts native cleanup synchronously', async () => {
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };

      await act(async () => {
        emitRecordingStatus({ mediaServicesDidReset: true });
        await flushMicrotasks();
      });

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errDeviceInterrupted'));
    });

    it('handles a polled reset immediately even without a terminal event', async () => {
      jest.useFakeTimers();
      mockRecorder.getStatus.mockImplementation(() => ({ ...mockRecorderState }));
      const { props } = await renderRecorder();
      await startRecording();
      mockRecorderState = { ...mockRecorderState, mediaServicesDidReset: true };

      await act(async () => {
        jest.advanceTimersByTime(200);
        await flushMicrotasks();
      });

      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
      expect(props.onError).toHaveBeenCalledWith(t('recorder.errDeviceInterrupted'));
    });

    it('uses the exact validated recording audio mode before native preparation', async () => {
      await renderRecorder();
      await startRecording();

      expect(setAudioModeAsync).toHaveBeenNthCalledWith(1, {
        allowsRecording: true,
        allowsBackgroundRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1);
    });

    it('deletes a web disposal URI created only after native stop resolves', async () => {
      const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
      const preparedUri = 'blob:https://app.example/disposal-prepared';
      const stoppedUri = 'blob:https://app.example/disposal-stopped';
      const revoke = jest.fn();
      const revokeDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
      try {
        const preparation = deferred<void>();
        mockRecorder.prepareToRecordAsync.mockReturnValue(preparation.promise);
        mockRecorder.stop.mockImplementation(async () => {
          mockRecorder.isRecording = false;
          mockRecorder.uri = stoppedUri;
          emitRecordingStatus({ isFinished: true, url: stoppedUri });
        });
        const { view, props } = await renderRecorder();
        let staleStart!: Promise<void>;
        await act(() => {
          staleStart = invokePressHandler(view, START_LABEL);
        });
        await waitFor(() => expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalledTimes(1));
        await view.rerender(<Recorder {...props} questionId={OTHER_QUESTION_ID} />);
        mockRecorder.uri = preparedUri;
        await act(async () => {
          preparation.resolve();
          await staleStart;
        });

        expect(revoke).toHaveBeenCalledWith(preparedUri);
        expect(revoke).toHaveBeenCalledWith(stoppedUri);
      } finally {
        if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
        if (revokeDescriptor) Object.defineProperty(URL, 'revokeObjectURL', revokeDescriptor);
      }
    });

    it('retires prepared and live URIs when stop adopts a distinct final URI', async () => {
      const preparedUri = 'file:///recordings/owned-prepared-a.m4a';
      const liveUri = 'file:///recordings/owned-live-b.m4a';
      const finalUri = 'file:///recordings/owned-final-c.m4a';
      mockRecorder.prepareToRecordAsync.mockImplementation(async () => {
        mockRecorder.uri = preparedUri;
      });
      mockRecorder.record.mockImplementation(() => {
        mockRecorder.uri = liveUri;
        mockRecorder.isRecording = true;
        mockRecorderState = { ...mockRecorderState, canRecord: true, isRecording: true };
      });
      mockRecorder.stop.mockImplementation(async () => {
        mockRecorder.uri = finalUri;
        mockRecorder.isRecording = false;
        mockRecorderState = {
          ...mockRecorderState,
          canRecord: false,
          isRecording: false,
          durationMillis: 5_000,
        };
        emitRecordingStatus({ isFinished: true, url: finalUri });
      });
      await renderRecorder();

      await startRecording();
      expect(deletedRecordingUris()).toContain(preparedUri);
      expect(deletedRecordingUris()).not.toContain(liveUri);
      asMock(File).mockClear();
      mockRecorderState.durationMillis = 5_000;
      await fireEvent.press(screen.getByLabelText(STOP_LABEL));

      expect(deletedRecordingUris()).toContain(liveUri);
      expect(deletedRecordingUris()).not.toContain(finalUri);
      expect(screen.getByRole('button', { name: SUBMIT_TEXT })).toBeTruthy();
    });
  });

  describe('themed presentation', () => {
    const hidden = { includeHiddenElements: true } as const;

    it('lays out the idle recorder from the shared spacing and color tokens', async () => {
      await renderRecorder();

      expect(flattenedStyle(recorderContainerNode())).toEqual({
        width: '100%',
        alignSelf: 'stretch',
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
      await waitFor(() => expect(screen.getByText(t('recorder.permissionRetryBody'))).toBeTruthy());

      const banner = screen.getByText(t('recorder.permissionRetryBody')).parent;
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
      expect(flattenedStyle(screen.getByText(t('recorder.permissionRetryBody')))).toEqual({
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
      const { props } = await renderRecorder();
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
      expect(cancel).toHaveTextContent(t('recorder.cancelSending'));
      expect(screen.queryByRole('button', { name: t('recorder.stopWaiting') })).toBeNull();
      expect(flattenedStyle(cancel)).toMatchObject({
        marginTop: spacing.md,
        alignSelf: 'center',
      });
      expect(cancel.props.accessibilityHint).toBe(t('recorder.cancelBeforeTransferHint'));
      // The longer-than-usual note belongs to recovery, not to a fresh upload.
      expect(screen.queryByText(t('recorder.waitHint'))).toBeNull();

      await act(async () => {
        upload.resolve({ ok: true });
        await flushMicrotasks();
      });
      await waitFor(() => expect(props.onResult).toHaveBeenCalledWith({ parsed: { ok: true } }));
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
      const idleContainerStyle = flattenedStyle(recorderContainerNode());
      const idleMicWrapStyle = flattenedStyle(recordButtonWrapNode());
      await recordAndStop();
      const actions = screen.getByRole('button', { name: SUBMIT_TEXT }).parent;
      if (!actions) throw new Error('Review actions row not found');

      // Phase-specific controls append below the same responsive root and mic
      // wrapper; neither gains centering that would move the microphone.
      expect(flattenedStyle(recorderContainerNode())).toEqual(idleContainerStyle);
      expect(flattenedStyle(recordButtonWrapNode())).toEqual(idleMicWrapStyle);
      expect(flattenedStyle(recorderContainerNode()).justifyContent).toBeUndefined();
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
