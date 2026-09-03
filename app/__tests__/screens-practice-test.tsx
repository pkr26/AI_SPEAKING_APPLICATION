import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { Fiber, TestInstance } from 'test-renderer';
import React from 'react';
import {
  AccessibilityInfo,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';

import FeedbackScreen from '../src/app/(tabs)/practice/feedback';
import HelpScreen from '../src/app/(tabs)/practice/help';
import PracticeScreen from '../src/app/(tabs)/practice/index';
import type { RecorderResultMetadata } from '../src/components/Recorder';
import RecordingPlayback from '../src/components/RecordingPlayback';
import { ApiError, apiFetch, apiSkipPracticeWord } from '../src/lib/api';
import { useAuth, type SessionLease } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { acknowledgePendingAssessmentFeedback } from '../src/lib/pending-assessment';
import type { usePracticeFlow } from '../src/lib/practice-flow';
import { colors, darkColors, layout, radii, spacing } from '../src/lib/theme';
import {
  PRACTICE_MASTER_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_PASS_SCORE,
  type AttemptResult,
  type NativeAttemptResult,
  type PracticeOutcome,
  type PracticeQuestionPayload,
  type Question,
  type User,
} from '../src/lib/types';

// Under jest no I18nProvider is mounted, so screens fall back to English;
// assert against the same typed catalog the screens render from.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

const asMock = (fn: unknown) => fn as jest.Mock;

// ----- color scheme -----

// Practice screens render in the light palette unless a test flips the OS
// scheme; the dark palette carries its own elevation and fill decisions.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

// ----- expo-router mock -----

let mockSearchParams: Record<string, string | string[] | undefined> = {};
const mockSetOptions = jest.fn();
type BeforeRemoveEvent = {
  data: { action: { type: string } };
  preventDefault: jest.Mock;
};
const mockBeforeRemoveListeners = new Set<(event: BeforeRemoveEvent) => void>();
const mockAddNavigationListener = jest.fn(
  (event: string, listener: (event: BeforeRemoveEvent) => void) => {
    if (event === 'beforeRemove') mockBeforeRemoveListeners.add(listener);
    return () => mockBeforeRemoveListeners.delete(listener);
  },
);
const mockNavigation = { setOptions: mockSetOptions, addListener: mockAddNavigationListener };
let mockCurrentNavigation = mockNavigation;

// Focus is simulated by invoking the effect on mount and its cleanup on
// unmount, re-running when the callback identity changes (as expo-router does
// while a screen stays focused).
interface MockFocusRegistration {
  callback: () => void | (() => void);
  cleanup: (() => void) | null;
}

const mockFocusRegistrations: MockFocusRegistration[] = [];
let mockDeferFocusSetup = false;
let mockDeferFocusCleanup = false;
const mockDeferredFocusCleanups: (() => void)[] = [];

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
      canGoBack: jest.fn(() => false),
    },
    useLocalSearchParams: () => ({
      cycleId: '550e8400-e29b-41d4-a716-446655440020',
      attemptsUsed: '0',
      ...mockSearchParams,
    }),
    useNavigation: () => mockCurrentNavigation,
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const registration = { callback, cleanup: null as (() => void) | null };
        mockFocusRegistrations.push(registration);
        if (!mockDeferFocusSetup) {
          const cleanup = callback();
          registration.cleanup = typeof cleanup === 'function' ? cleanup : null;
        }
        return () => {
          if (registration.cleanup) {
            if (mockDeferFocusCleanup) mockDeferredFocusCleanups.push(registration.cleanup);
            else registration.cleanup();
          }
          const index = mockFocusRegistrations.indexOf(registration);
          if (index >= 0) mockFocusRegistrations.splice(index, 1);
        };
      }, [callback]);
    },
  };
});

// ----- expo-haptics mock (no native module under jest) -----

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

// ----- Recorder stub -----

interface CapturedRecorderProps {
  ownerId: string;
  questionId: string;
  cycleId?: string;
  disabled?: boolean;
  isStartBlocked?: () => boolean;
  endpoint: string;
  parseResult: (data: unknown) => PracticeOutcome;
  onResult: (data: PracticeOutcome, metadata?: RecorderResultMetadata) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onExitLockChange?: (locked: boolean) => void;
  onExpandedControlsLayout?: () => void;
  onRateLimited?: (message: string) => void;
  onRecoveryEndpointMismatch?: (
    endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
  ) => boolean;
}

interface MockRecorderProps extends Omit<CapturedRecorderProps, 'onResult'> {
  onResult?: (data: PracticeOutcome, metadata?: RecorderResultMetadata) => void;
  onResultWithMetadata?: (data: PracticeOutcome, metadata: RecorderResultMetadata) => void;
}

let mockRecorderProps: CapturedRecorderProps | null = null;
let mockRecorderInstanceSerial = 0;
let mockRecorderMounts: number[] = [];
let mockRecorderUnmounts: number[] = [];
const mockScrollToExpandedRecorderControls = jest.fn();

// A host node stands in for the real recorder so tests can reach the slot the
// screens reserve for it (`styles.recorderArea`) the same way a user's eye does.
function MockRecorder(props: MockRecorderProps) {
  const instanceRef = React.useRef<number | null>(null);
  if (instanceRef.current === null) instanceRef.current = ++mockRecorderInstanceSerial;
  React.useEffect(() => {
    const instance = instanceRef.current!;
    mockRecorderMounts.push(instance);
    return () => {
      mockRecorderUnmounts.push(instance);
    };
  }, []);
  React.useEffect(() => {
    const defaultResultMetadata = { requestId: `mock-request-${instanceRef.current!}` };
    mockRecorderProps = {
      ...props,
      onResult: (data, metadata = defaultResultMetadata) => {
        if (props.onResultWithMetadata) props.onResultWithMetadata(data, metadata);
        else props.onResult?.(data, metadata);
      },
    };
  });
  return <View testID="recorder" />;
}

jest.mock('../src/components/Recorder', () => ({
  __esModule: true,
  default: MockRecorder,
  scrollToExpandedRecorderControls: (...args: unknown[]) =>
    mockScrollToExpandedRecorderControls(...args),
}));

jest.mock('../src/components/RecordingPlayback', () => ({
  __esModule: true,
  default: jest.fn(({ recordingId }: { recordingId: string }) => {
    const ReactActual = jest.requireActual<typeof import('react')>('react');
    const { Text: NativeText } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactActual.createElement(NativeText, null, `recording-player:${recordingId}`);
  }),
}));

// ----- auth mock -----

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

const OTHER_USER: User = {
  ...USER,
  id: '550e8400-e29b-41d4-a716-446655440010',
  name: 'Grace Hopper',
  email: 'grace@example.com',
};

let mockAuthValue: AuthValue;

function makeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
    resetStoredSession: jest.fn(),
    captureSessionLease: jest.fn(() => ({}) as never),
    isSessionLeaseCurrent: jest.fn(() => true),
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
    setUser: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/auth', () => ({
  ...jest.requireActual('../src/lib/auth'),
  useAuth: () => mockAuthValue,
}));

// ----- practice flow mock -----

type PracticeFlowValue = ReturnType<typeof usePracticeFlow>;

let mockPracticeFlow: PracticeFlowValue;

function makePracticeFlow(overrides: Partial<PracticeFlowValue> = {}): PracticeFlowValue {
  return {
    answerMode: 'english',
    feedback: null,
    attemptStatus: null,
    sessionTally: { attempts: 0, passed: 0, mastered: 0, levelUps: 0 },
    setAnswerMode: jest.fn(),
    showFeedback: jest.fn(),
    restoreFeedback: jest.fn(),
    clearRecordingReferences: jest.fn(),
    clearFeedback: jest.fn(),
    resetSessionTally: jest.fn(),
    resetPracticeFlow: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/practice-flow', () => ({
  ...jest.requireActual('../src/lib/practice-flow'),
  usePracticeFlow: () => mockPracticeFlow,
}));

// ----- practice intro mock (SecureStore-backed first-visit explainer) -----

jest.mock('../src/lib/practice-intro', () => ({
  hasSeenPracticeIntro: jest.fn(async () => true),
  markPracticeIntroSeen: jest.fn(async () => undefined),
}));

const mockPracticeIntro = jest.requireMock('../src/lib/practice-intro') as {
  hasSeenPracticeIntro: jest.Mock;
  markPracticeIntroSeen: jest.Mock;
};

// ----- api mock -----

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiFetch: jest.fn(),
  apiSkipPracticeWord: jest.fn(),
}));

jest.mock('../src/lib/pending-assessment', () => ({
  ...jest.requireActual('../src/lib/pending-assessment'),
  acknowledgePendingAssessmentFeedback: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;
const mockSkipWord = apiSkipPracticeWord as jest.Mock;
const mockAcknowledgePendingFeedback = jest.mocked(acknowledgePendingAssessmentFeedback);
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  navigate: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  dismissTo: jest.Mock;
  canGoBack: jest.Mock;
};

// ----- fixtures -----

const QUESTION: Question = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  cefrLevel: 'B1',
  promptWord: 'courage',
  questionText: 'Describe a time you showed courage.',
};

const NEXT_QUESTION: Question = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  cefrLevel: 'B1',
  promptWord: 'journey',
  questionText: 'Tell me about a memorable journey.',
};

const CYCLE_ID = '550e8400-e29b-41d4-a716-446655440020';
const NEXT_CYCLE_ID = '550e8400-e29b-41d4-a716-446655440021';
const FEEDBACK_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440099';

const HELP_CONTENT = {
  promptWord: 'courage',
  promptWordNative: 'ధైర్యం',
  questionText: 'Describe a time you showed courage.',
  questionTextNative: 'మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.',
  examples: [
    { en: 'She showed courage at work.', native: 'ఆమె పనిలో ధైర్యం చూపింది.' },
    {
      en: 'It takes courage to speak up.',
      native: 'మాట్లాడటానికి ధైర్యం కావాలి.',
    },
    {
      en: 'Courage grows with practice.',
      native: 'అభ్యాసంతో ధైర్యం పెరుగుతుంది.',
    },
  ],
};

const PRACTICE_QUESTION: PracticeQuestionPayload = {
  question: QUESTION,
  kind: 'new',
  progress: { masteredCount: 2, learningCount: 1, totalAtLevel: 8 },
  cycleId: CYCLE_ID,
  attemptsUsed: 0,
  attemptsLeft: 3,
};

const NEXT_PRACTICE_QUESTION: PracticeQuestionPayload = {
  question: NEXT_QUESTION,
  kind: 'new',
  progress: { masteredCount: 3, learningCount: 1, totalAtLevel: 8 },
  cycleId: NEXT_CYCLE_ID,
  attemptsUsed: 0,
  attemptsLeft: 3,
};

const PASSED_RESULT: AttemptResult = {
  cycleId: CYCLE_ID,
  passed: true,
  mastered: false,
  attemptNo: 1,
  attemptsLeft: 0,
  score: 72,
  transcript: 'I enjoy reading.',
  feedback: 'Nice work.',
  next: NEXT_PRACTICE_QUESTION,
};

const NATIVE_RESULT_FOR_PARSER: NativeAttemptResult = {
  mode: 'native',
  nativeLanguage: 'te',
  cycleId: CYCLE_ID,
  understood: true,
  attemptNo: 1,
  attemptsLeft: 2,
  transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
  translatedTranscript: 'She showed courage at work.',
  modelAnswer: 'She showed courage at work.',
  feedback: 'You understood the question.',
};

// ----- helpers -----

let alertSpy: jest.SpyInstance;
let backHandlers: (() => boolean)[];
let backSubscriptionRemove: jest.Mock;
let transientSpies: jest.SpyInstance[];

function trackQueryRefetches(): jest.SpyInstance {
  const spy = jest.spyOn(QueryObserver.prototype, 'refetch');
  transientSpies.push(spy);
  return spy;
}

function pressHardwareBack(): boolean {
  if (backHandlers.length === 0) throw new Error('No hardware back handler registered');
  return backHandlers[backHandlers.length - 1]();
}

type MockAlertButton = { text: string; style?: string; onPress?: () => void };

/** Confirms the most recent skip-confirmation alert exactly as the OS would. */
function confirmSkipAlert(): void {
  const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1] as unknown as [
    string,
    string,
    MockAlertButton[],
  ];
  const confirm = (call[2] ?? []).find((button) => button.text === t('practice.skipWord'));
  if (!confirm?.onPress) throw new Error('No skip confirmation button in the last alert');
  confirm.onPress();
}

function dispatchBeforeRemove(type = 'GO_BACK'): jest.Mock {
  const event: BeforeRemoveEvent = {
    data: { action: { type } },
    preventDefault: jest.fn(),
  };
  for (const listener of mockBeforeRemoveListeners) listener(event);
  return event.preventDefault;
}

function createNavigationDouble() {
  const listeners = new Set<(event: BeforeRemoveEvent) => void>();
  const setOptions = jest.fn();
  const addListener = jest.fn((event: string, listener: (event: BeforeRemoveEvent) => void) => {
    if (event === 'beforeRemove') listeners.add(listener);
    return () => listeners.delete(listener);
  });
  return {
    navigation: { setOptions, addListener },
    setOptions,
    listeners,
  };
}

function dispatchNavigationBeforeRemove(
  listeners: ReadonlySet<(event: BeforeRemoveEvent) => void>,
  type = 'GO_BACK',
): jest.Mock {
  const event: BeforeRemoveEvent = {
    data: { action: { type } },
    preventDefault: jest.fn(),
  };
  for (const listener of listeners) listener(event);
  return event.preventDefault;
}

const queryClients: QueryClient[] = [];
let attemptCycleSentinelAttempted = false;
let attemptCycleSentinelPassed = false;

function makeQueryClient() {
  const client = new QueryClient({
    // Tests own cache lifetime explicitly in afterEach. Disable TanStack's
    // five-minute GC handles so query-key handoff cases cannot keep Jest alive
    // after their observers have been unmounted and the cache was cleared.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  queryClients.push(client);
  return client;
}

function withProviders(ui: React.ReactElement, client: QueryClient, bottomInset: number) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: bottomInset },
      }}
    >
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>
  );
}

function renderScreen(ui: React.ReactElement, queryClient?: QueryClient, bottomInset = 0) {
  return render(withProviders(ui, queryClient ?? makeQueryClient(), bottomInset));
}

/**
 * Renders a screen and hands back a re-render that keeps the same providers and
 * the same mounted instance, so a test can change what the mocked hooks return
 * — a switched account, a fresh outcome — without a remount papering over it.
 */
async function renderRerenderable(ui: React.ReactElement, queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient();
  const view = await render(withProviders(ui, client, 0));
  return (next: React.ReactElement) => view.rerender(withProviders(next, client, 0));
}

function recorderProps(): CapturedRecorderProps {
  expect(mockRecorderProps).not.toBeNull();
  return mockRecorderProps!;
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

/** Returns the currently committed Pressable handler without dispatching a
 * separate RNTL act(), for same-frame interaction race coverage. */
function committedPressHandler(node: TestInstance): () => unknown {
  let fiber: Fiber | null = node.unstable_fiber;
  while (fiber) {
    const props = fiber.memoizedProps as { onPress?: unknown } | null;
    if (typeof props?.onPress === 'function') return props.onPress as () => unknown;
    if (fiber.return === null || typeof fiber.return.type === 'string') break;
    fiber = fiber.return;
  }
  throw new Error('No committed press handler found');
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function blurScreen(): Promise<void> {
  await act(async () => {
    for (const registration of mockFocusRegistrations) {
      const cleanup = registration.cleanup;
      registration.cleanup = null;
      cleanup?.();
    }
  });
}

async function focusScreen(): Promise<void> {
  await act(async () => {
    for (const registration of mockFocusRegistrations) {
      const cleanup = registration.callback();
      registration.cleanup = typeof cleanup === 'function' ? cleanup : null;
    }
  });
}

function responderEvent() {
  return {
    currentTarget: { measure: () => undefined },
    nativeEvent: { changedTouches: [], pageX: 0, pageY: 0, touches: [] },
    persist: () => undefined,
  };
}

async function expectPressFeedback(
  getButton: () => TestInstance,
  resting: SemanticStyle,
  pressed: SemanticStyle,
): Promise<void> {
  expect(flattenedStyle(getButton())).toMatchObject(resting);
  await fireEvent(getButton(), 'responderGrant', responderEvent());
  expect(flattenedStyle(getButton())).toMatchObject(pressed);
  await fireEvent(getButton(), 'responderTerminate', responderEvent());
  await waitFor(() => {
    const restored = flattenedStyle(getButton());
    expect(restored).toMatchObject(resting);
    for (const property of Object.keys(pressed)) {
      if (!(property in resting)) expect(restored[property]).toBeUndefined();
    }
  });
}

/** The host view a control is laid out in (card, badge row, bar, footer). */
function parentOf(node: TestInstance): TestInstance {
  const parent = node.parent;
  if (!parent) throw new Error('Element is not laid out inside a parent view');
  return parent;
}

/**
 * ScrollView renders as the host `RCTScrollView`, which keeps
 * `contentContainerStyle` as a prop instead of applying it to a child view.
 */
function scrollView(): TestInstance {
  const [node] = screen.container.queryAll((candidate) => candidate.type === 'RCTScrollView');
  if (!node) throw new Error('No ScrollView rendered');
  return node;
}

function refreshHandler(): () => void {
  const [scroll] = screen.container.queryAll(
    (candidate) => typeof candidate.props.refreshControl?.props?.onRefresh === 'function',
  );
  const onRefresh = scroll?.props.refreshControl?.props?.onRefresh;
  if (typeof onRefresh !== 'function') throw new Error('No RefreshControl rendered');
  return onRefresh as () => void;
}

function scrollContentStyle(): SemanticStyle {
  return StyleSheet.flatten(scrollView().props.contentContainerStyle) ?? {};
}

/** The full-bleed backdrop the scrolling content sits on. */
function screenContainerStyle(): SemanticStyle {
  return flattenedStyle(parentOf(scrollView()));
}

/** The reserved slot the recorder is mounted into. */
function recorderAreaStyle(): SemanticStyle {
  return flattenedStyle(parentOf(screen.getByTestId('recorder')));
}

function buttonContainerPaddingBottom(name: string): unknown {
  let ancestor = screen.getByRole('button', { name }).parent;
  while (ancestor) {
    const paddingBottom = StyleSheet.flatten(ancestor.props.style)?.paddingBottom;
    if (paddingBottom !== undefined) return paddingBottom;
    ancestor = ancestor.parent;
  }
  throw new Error(`Button "${name}" has no padded container`);
}

beforeEach(() => {
  // A forced-invalid cycle otherwise cascades through every later Practice
  // Mode case and turns a clear routing assertion into a subprocess timeout.
  // Once the early sentinel runs, fail all remaining cases at setup if that
  // load-bearing route contract was broken.
  if (attemptCycleSentinelAttempted) expect(attemptCycleSentinelPassed).toBe(true);
  onlineManager.setOnline(true);
  jest.clearAllMocks();
  // Module factory mocks outlive clearAllMocks; re-arm the light default.
  asMock(useColorScheme).mockReset();
  asMock(useColorScheme).mockReturnValue('light');
  mockApiFetch.mockReset();
  mockSkipWord.mockReset();
  // The gate-guard default: nothing beneath the signed-in stack to pop.
  mockRouter.canGoBack.mockReturnValue(false);
  mockAcknowledgePendingFeedback.mockReset().mockResolvedValue(true);
  mockRecorderProps = null;
  mockRecorderInstanceSerial = 0;
  mockRecorderMounts = [];
  mockRecorderUnmounts = [];
  asMock(RecordingPlayback).mockClear();
  mockSearchParams = {};
  mockCurrentNavigation = mockNavigation;
  mockDeferFocusSetup = false;
  mockDeferFocusCleanup = false;
  mockDeferredFocusCleanups.length = 0;
  mockAuthValue = makeAuth();
  mockPracticeFlow = makePracticeFlow();
  // Default to "already seen" so the explainer card stays out of every test
  // that is not explicitly about it.
  mockPracticeIntro.hasSeenPracticeIntro.mockResolvedValue(true);
  mockPracticeIntro.markPracticeIntroSeen.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  transientSpies = [];
  mockBeforeRemoveListeners.clear();
  mockFocusRegistrations.length = 0;
  backHandlers = [];
  backSubscriptionRemove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return { remove: backSubscriptionRemove };
  });
});

afterEach(async () => {
  // Flush TanStack Query's batched notifications and clear cache observers
  // inside act so a durable-card continuation cannot publish into the next
  // suite after its route assertion has completed.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await cleanup();
    for (const client of queryClients) client.clear();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  queryClients.length = 0;
  for (const spy of transientSpies) spy.mockRestore();
  for (const cleanup of mockDeferredFocusCleanups.splice(0)) cleanup();
  alertSpy.mockRestore();
});

describe('practice home screen', () => {
  it('shows an offline state before the first practice question can load', async () => {
    onlineManager.setOnline(false);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByRole('header', { name: t('network.offlineTitle') })).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('recorder')).toBeNull();
  });

  it('shows a loading state while the question loads', async () => {
    const replacement = deferred<unknown>();
    mockApiFetch.mockReturnValue(replacement.promise);
    await renderScreen(<PracticeScreen />);
    const hidden = { includeHiddenElements: true } as const;
    expect(
      screen.getByText(t('practice.loadingQuestion'), hidden).props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(screen.getByTestId('practice-question-skeleton', hidden)).toBeTruthy();
    expect(screen.queryByTestId('recorder')).toBeNull();
    expect(screen.getByText(t('practice.greeting', { name: USER.name }))).toBeTruthy();
    // Section navigation moved to the tab bar; the learning surface exposes
    // no account exits while its question is still loading.
    expect(screen.queryByRole('button', { name: t('settings.retake') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('common.logOut') })).toBeNull();
    await act(async () => {
      replacement.resolve(PRACTICE_QUESTION);
      await replacement.promise;
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('renders the question and wires the recorder', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);

    expect(
      (await screen.findByText('Describe a time you showed courage.')).props.accessibilityLanguage,
    ).toBe('en-US');
    // A newly served question announces itself to TalkBack via this region.
    expect(
      screen.getByText('Describe a time you showed courage.').props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(screen.getByRole('header', { name: 'courage' }).props.accessibilityLanguage).toBe(
      'en-US',
    );
    expect(screen.getByText('B1')).toBeTruthy();
    expect(screen.getByRole('button', { name: t('practice.helpLabel') })).toBeTruthy();
    // The plain-language CEFR explainer sits under the badge row.
    expect(screen.getByText(t('cefr.B1'))).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/practice/question',
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(recorderProps()).toMatchObject({
      ownerId: USER.id,
      questionId: QUESTION.id,
      endpoint: '/practice/attempt',
      disabled: false,
    });
    expect(recorderProps().onExpandedControlsLayout).toEqual(expect.any(Function));
    expect(() => recorderProps().onExpandedControlsLayout?.()).not.toThrow();
    expect(mockScrollToExpandedRecorderControls).toHaveBeenLastCalledWith(expect.anything(), true);
    // The screen chooses which response contract the recorder parses with; a
    // swapped parser breaks the flow at runtime, so pin the wiring.
    expect(recorderProps().parseResult(PASSED_RESULT)).toEqual(PASSED_RESULT);
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['practice-question', USER.id, USER.cefrLevel],
        exact: true,
      }),
    ).toBeDefined();
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['practice-question', USER.id, USER.cefrLevel],
        exact: true,
      })?.options,
    ).toEqual(expect.objectContaining({ enabled: true, retry: false, staleTime: Infinity }));
  });

  it('moves to the top and queues a concise VoiceOver announcement for each new cycle', async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
      .mockImplementation(() => undefined);
    const scrollToTopSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText(QUESTION.questionText);

    expect(announceSpy).toHaveBeenLastCalledWith(
      `${QUESTION.promptWord}. ${QUESTION.questionText}`,
      { queue: true },
    );
    announceSpy.mockClear();
    scrollToTopSpy.mockClear();

    await act(async () => {
      queryClient.setQueryData(
        ['practice-question', USER.id, USER.cefrLevel],
        NEXT_PRACTICE_QUESTION,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(NEXT_QUESTION.questionText)).toBeTruthy();
    expect(scrollToTopSpy).toHaveBeenLastCalledWith({ y: 0, animated: false });
    expect(announceSpy).toHaveBeenLastCalledWith(
      `${NEXT_QUESTION.promptWord}. ${NEXT_QUESTION.questionText}`,
      { queue: true },
    );
    announceSpy.mockRestore();
    scrollToTopSpy.mockRestore();
  });

  it('revalidates the canonical serving cycle after an idle refocus', async () => {
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockResolvedValueOnce(NEXT_PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);

    await blurScreen();
    await focusScreen();

    expect(await screen.findByText(NEXT_QUESTION.questionText)).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('does not publish a focus refresh after the Recorder takes ownership', async () => {
    const canonicalRefresh = deferred<PracticeQuestionPayload>();
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockReturnValueOnce(canonicalRefresh.promise);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);

    await blurScreen();
    await focusScreen();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    await act(async () => recorderProps().onInteractionLockChange?.(true));
    await act(async () => {
      canonicalRefresh.resolve(NEXT_PRACTICE_QUESTION);
      await canonicalRefresh.promise;
      await Promise.resolve();
    });

    expect(screen.getByText(QUESTION.questionText)).toBeTruthy();
    expect(screen.queryByText(NEXT_QUESTION.questionText)).toBeNull();
    expect(recorderProps().questionId).toBe(QUESTION.id);
  });

  it('does not scroll expanded Recorder controls after Practice loses ownership', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rendered = await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const reveal = recorderProps().onExpandedControlsLayout!;
    mockScrollToExpandedRecorderControls.mockClear();

    await rendered.unmount();
    reveal();

    expect(mockScrollToExpandedRecorderControls).toHaveBeenLastCalledWith(null, false);
  });

  it('shows the new-word badge and progress line for a fresh word', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.newWord'))).toBeTruthy();
    expect(
      screen.getByText(
        t('practice.progressLine', { mastered: 2, total: 8 }) +
          t('practice.progressLearning', { count: 1 }),
      ),
    ).toBeTruthy();
  });

  it('shows the mastery explainer card on the first practice visit', async () => {
    mockPracticeIntro.hasSeenPracticeIntro.mockResolvedValue(false);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practiceIntro.title'))).toBeTruthy();
    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.queryByTestId('recorder')).toBeNull();
    expect(screen.getByRole('header', { name: t('practiceIntro.title') })).toBeTruthy();
    expect(mockPracticeIntro.hasSeenPracticeIntro).toHaveBeenCalledWith(USER.id);
    expect(
      screen.getByText(t('practiceIntro.master', { score: PRACTICE_MASTER_SCORE })),
    ).toBeTruthy();
    expect(
      screen.getByText(t('practiceIntro.tries', { count: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
    expect(screen.getByText(t('practiceIntro.silence'))).toBeTruthy();
    expect(screen.getByText(t('practiceIntro.native'))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('practiceIntro.dismiss') }));

    expect(screen.queryByText(t('practiceIntro.title'))).toBeNull();
    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByTestId('recorder')).toBeTruthy();
    expect(mockPracticeIntro.markPracticeIntroSeen).toHaveBeenCalledWith(USER.id);
  });

  it('keeps the recorder gated while first-visit state is still loading', async () => {
    let resolveIntro: ((seen: boolean) => void) | undefined;
    mockPracticeIntro.hasSeenPracticeIntro.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveIntro = resolve;
      }),
    );
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['practice-question', USER.id, USER.cefrLevel], PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />, queryClient);

    const loading = screen.getByText(t('practice.loadingQuestion'));
    expect(loading.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByLabelText(t('practice.loadingQuestion'))).toBeTruthy();
    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.queryByTestId('recorder')).toBeNull();

    await act(async () => resolveIntro?.(true));
    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByTestId('recorder')).toBeTruthy();
  });

  it('never shows the mastery explainer to a learner who has already seen it', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    // Let the stored-flag read resolve before asserting the card stayed away.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByText(t('practiceIntro.title'))).toBeNull();
    expect(mockPracticeIntro.markPracticeIntroSeen).not.toHaveBeenCalled();
  });

  it('shows the review badge and hides a zero review count', async () => {
    mockApiFetch.mockResolvedValue({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      progress: { masteredCount: 4, learningCount: 0, totalAtLevel: 12 },
    });
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.revision'))).toBeTruthy();
    expect(screen.getByText(t('practice.progressLine', { mastered: 4, total: 12 }))).toBeTruthy();
    expect(screen.queryByText(/to review/)).toBeNull();
  });

  it('starts in English and requests native mode from the language toggle', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText(t('practice.answerInMyLanguage'))).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt');
    expect(recorderProps().parseResult(PASSED_RESULT)).toEqual(PASSED_RESULT);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: false });

    await fireEvent.press(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');

    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt/native')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenLastCalledWith('native');
    expect(recorderProps().onRecoveryEndpointMismatch?.('/diagnostic/answer')).toBe(false);
  });

  it('wires native mode to its isolated endpoint and can request English mode', async () => {
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText(t('practice.answeringNative'))).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt/native');
    expect(recorderProps().parseResult(NATIVE_RESULT_FOR_PARSER)).toEqual(NATIVE_RESULT_FOR_PARSER);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: true, disabled: false });
    await fireEvent.press(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');

    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenLastCalledWith('english');
  });

  it('remounts the practice Recorder when answer mode changes endpoint in place', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    expect(mockRecorderMounts).toHaveLength(1);
    const englishInstance = mockRecorderMounts[0];
    expect(recorderProps().endpoint).toBe('/practice/attempt');

    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    await act(async () => {
      await rerenderScreen(<PracticeScreen />);
    });

    expect(recorderProps().endpoint).toBe('/practice/attempt/native');
    expect(recorderProps().parseResult(NATIVE_RESULT_FOR_PARSER)).toEqual(NATIVE_RESULT_FOR_PARSER);
    expect(mockRecorderMounts).toHaveLength(2);
    expect(mockRecorderUnmounts).toEqual([englishInstance]);
    expect(mockRecorderMounts[1]).not.toBe(englishInstance);
  });

  it('gives the language switch a touch-safe target and outlined off state', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toMatchObject({
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(toggle).backgroundColor).toBeUndefined();
    expect(flattenedStyle(screen.getByText(t('practice.answerInMyLanguage')))).toMatchObject({
      color: colors.primary,
    });
    await expectPressFeedback(
      () => screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
      { borderColor: colors.primary },
      { backgroundColor: colors.primaryLight },
    );
  });

  it('fills the language switch with contrast-checked text when native mode is on', async () => {
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toMatchObject({
      minHeight: layout.minimumTarget,
      backgroundColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practice.answeringNative')))).toMatchObject({
      color: '#FFFFFF',
    });
    await expectPressFeedback(
      () => screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('shows the attempt chip when the current word has a known retry state', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, cycleId: CYCLE_ID, attemptsLeft: 2 },
    });
    mockApiFetch.mockResolvedValue({ ...PRACTICE_QUESTION, attemptsUsed: 1, attemptsLeft: 2 });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(
      screen.getByText(t('practice.attemptChip', { current: 2, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
  });

  it('derives the upcoming attempt number from the remaining attempts', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, cycleId: CYCLE_ID, attemptsLeft: 1 },
    });
    mockApiFetch.mockResolvedValue({ ...PRACTICE_QUESTION, attemptsUsed: 2, attemptsLeft: 1 });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(
      screen.getByText(t('practice.attemptChip', { current: 3, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
  });

  it.each([
    ['no attempt state is known', null],
    [
      'the retry state belongs to another word',
      { questionId: NEXT_QUESTION.id, cycleId: CYCLE_ID, attemptsLeft: 2 },
    ],
  ])('uses the durable first-try position when %s', async (_case, attemptStatus) => {
    mockPracticeFlow = makePracticeFlow({ attemptStatus });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText(t('practice.attemptChip', { current: 1, max: 3 }))).toBeTruthy();
  });

  it('locks the language switch while a recording or submission is active', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      recorderProps().onInteractionLockChange?.(true);
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        headerBackVisible: false,
        gestureEnabled: false,
      });
    });
    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(toggle.props.accessibilityState).toEqual({ checked: false, disabled: true });
    await fireEvent.press(toggle);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();

    await act(async () => {
      recorderProps().onInteractionLockChange?.(false);
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        headerBackVisible: true,
        gestureEnabled: true,
      });
    });
    await fireEvent.press(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');
  });

  it('rejects stale control taps delivered in the same commit as a recorder lock', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    // Capture the enabled handlers first. In production the Recorder can take
    // ownership of a take and another touch can already be queued before React
    // commits the disabled controls, so render-state checks alone are too late.
    const staleTogglePress = committedPressHandler(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
    );
    const staleSkipPress = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );

    await act(async () => {
      recorderProps().onInteractionLockChange?.(true);
      staleTogglePress();
      staleSkipPress();
    });

    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockSkipWord).not.toHaveBeenCalled();
  });

  it('locks help and question actions while a recording or submission is active', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const help = screen.getByLabelText(t('practice.helpLabel'));
    expect(help.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenedStyle(help)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(help);
    expect(mockRouter.navigate).not.toHaveBeenCalled();

    const skip = screen.getByRole('button', { name: t('practice.skipWord') });
    expect(skip.props.accessibilityState).toEqual({ disabled: true, busy: false });
    await fireEvent.press(skip);
    expect(mockSkipWord).not.toHaveBeenCalled();

    // Account exits live in Settings/Profile now, so the learning surface has
    // no footer actions left to lock.
    expect(screen.queryByRole('button', { name: t('settings.retake') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('common.logOut') })).toBeNull();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(flattenedStyle(screen.getByLabelText(t('practice.helpLabel'))).opacity).toBeUndefined();
    await fireEvent.press(screen.getByLabelText(t('practice.helpLabel')));
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id, cycleId: CYCLE_ID, attemptsUsed: '0' },
    });
  });

  it('keeps question controls locked but releases route exits for parked recovery', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);

    await act(async () => {
      recorderProps().onInteractionLockChange?.(true);
      recorderProps().onExitLockChange?.(false);
    });

    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(pressHardwareBack()).toBe(false);
    expect(dispatchBeforeRemove()).not.toHaveBeenCalled();
  });

  it('blocks Android hardware back only while the recorder holds the interaction lock', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const view = await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
    // Practice sits above Home now: an idle screen lets the navigator pop back.
    expect(pressHardwareBack()).toBe(false);
    let immediateBack = false;
    let immediatePrevent: jest.Mock | null = null;
    await act(async () => {
      recorderProps().onInteractionLockChange?.(true);
      // Exercise the committed handlers before React can paint disabled props.
      immediateBack = pressHardwareBack();
      immediatePrevent = dispatchBeforeRemove();
    });
    expect(immediateBack).toBe(true);
    expect(immediatePrevent).toHaveBeenCalledTimes(1);
    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
      await Promise.resolve();
    });
    expect(consumed).toBe(true);
    expect(dispatchBeforeRemove('RESET')).not.toHaveBeenCalled();
    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(pressHardwareBack()).toBe(false);
    expect(dispatchBeforeRemove()).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    await view.unmount();
    expect(backSubscriptionRemove).toHaveBeenCalled();
  });

  it('consumes an idle hardware back press only when practice has somewhere to pop', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    // Nothing beneath the tab root to pop: the press falls through so
    // Android's own "back at the task root leaves the app" behavior works.
    expect(mockRouter.canGoBack()).toBe(false);
    expect(pressHardwareBack()).toBe(false);

    // The entry gate sits beneath the signed-in stack: consume the press so
    // back never lands on the gate (which would bounce straight back here).
    mockRouter.canGoBack.mockReturnValue(true);
    expect(pressHardwareBack()).toBe(true);
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('hides header back and the iOS gesture only while the recorder is locked', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
    await act(async () => {
      recorderProps().onInteractionLockChange?.(true);
      // The native header/gesture fence must publish before React can commit
      // the disabled render; a later layout effect is too late for this race.
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        headerBackVisible: false,
        gestureEnabled: false,
      });
    });
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });
    await act(async () => {
      recorderProps().onInteractionLockChange?.(false);
      expect(mockSetOptions).toHaveBeenLastCalledWith({
        headerBackVisible: true,
        gestureEnabled: true,
      });
    });
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
  });

  it('does not load or mount a recorder without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });

    await renderScreen(<PracticeScreen />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText(t('practice.loadingQuestion'))).toBeNull();
    // The stored explainer flag is keyed by account: with no account there is
    // no key to read, so the effect must not reach storage at all.
    expect(mockPracticeIntro.hasSeenPracticeIntro).not.toHaveBeenCalled();
  });

  it('forwards recorder results to the practice flow and feedback route', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');

    const result = {
      ...PASSED_RESULT,
      recordingId: '550e8400-e29b-41d4-a716-446655440090',
    };
    await act(async () => recorderProps().onResult(result));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(
      QUESTION.id,
      result,
      QUESTION,
      expect.any(String),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['recordings', USER.id] });
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('accepts one recorder result when duplicate callbacks arrive before navigation commits', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const callbacks = recorderProps();

    await act(async () => {
      callbacks.onResult(PASSED_RESULT);
      callbacks.onResult(PASSED_RESULT);
    });

    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledTimes(1);
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(
      QUESTION.id,
      PASSED_RESULT,
      QUESTION,
      expect.any(String),
    );
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  it('accepts a distinct second attempt after refocus and rejects request replays', async () => {
    const firstMiss: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'My first answer.',
      feedback: 'Add more detail.',
    };
    const secondMiss: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 52,
      transcript: 'My second answer.',
      feedback: 'Add one specific example.',
    };
    const firstMetadata = { requestId: '550e8400-e29b-41d4-a716-446655440101' };
    const secondMetadata = { requestId: '550e8400-e29b-41d4-a716-446655440102' };
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);

    await act(async () => recorderProps().onResult(firstMiss, firstMetadata));
    await blurScreen();
    await focusScreen();
    await act(async () => {
      const callbacks = recorderProps();
      callbacks.onResult(firstMiss, firstMetadata);
      callbacks.onResult(secondMiss, secondMetadata);
    });
    await blurScreen();
    await focusScreen();
    await act(async () => recorderProps().onResult(secondMiss, secondMetadata));

    expect(mockRecorderMounts).toHaveLength(1);
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledTimes(2);
    expect(mockPracticeFlow.showFeedback).toHaveBeenNthCalledWith(
      1,
      QUESTION.id,
      firstMiss,
      QUESTION,
      firstMetadata.requestId,
    );
    expect(mockPracticeFlow.showFeedback).toHaveBeenNthCalledWith(
      2,
      QUESTION.id,
      secondMiss,
      QUESTION,
      secondMetadata.requestId,
    );
    expect(mockRouter.push).toHaveBeenCalledTimes(2);
  });

  it('bounds handled practice request IDs while retaining the newest duplicates', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    const requestIds = Array.from(
      { length: 9 },
      (_, index) => `550e8400-e29b-41d4-a716-44665544011${index}`,
    );

    for (const requestId of requestIds) {
      await act(async () => recorderProps().onResult(PASSED_RESULT, { requestId }));
      await blurScreen();
      await focusScreen();
    }
    await act(async () =>
      recorderProps().onResult(PASSED_RESULT, { requestId: requestIds[requestIds.length - 1]! }),
    );
    await act(async () => recorderProps().onResult(PASSED_RESULT, { requestId: requestIds[0]! }));

    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledTimes(10);
    expect(mockRouter.push).toHaveBeenCalledTimes(10);
  });

  it.each(['blur', 'session lease'] as const)(
    'drops every queued recorder continuation after %s ownership is lost',
    async (boundary) => {
      const renderLease = { owner: 'practice-render' } as never;
      let currentLease: unknown = renderLease;
      mockAuthValue = makeAuth({
        captureSessionLease: jest.fn(() => currentLease as never),
        isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
      });
      mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
      await renderScreen(<PracticeScreen />);
      await screen.findByText('Describe a time you showed courage.');
      const callbacks = recorderProps();
      const requestsBeforeBoundary = mockApiFetch.mock.calls.length;

      if (boundary === 'blur') {
        await blurScreen();
      } else {
        // No React render occurs here. This is the synchronous Auth epoch gap
        // that a layout-effect identity mirror cannot close.
        currentLease = { owner: 'new-session' };
      }
      alertSpy.mockClear();
      mockSetOptions.mockClear();
      let acceptedEndpointMismatch: boolean | undefined;

      await act(async () => {
        callbacks.onResult(PASSED_RESULT);
        callbacks.onResult(PASSED_RESULT);
        callbacks.onError('late upload failure');
        callbacks.onRateLimited?.('late wait notice');
        callbacks.onRecoveryUnresolved();
        acceptedEndpointMismatch = callbacks.onRecoveryEndpointMismatch?.(
          '/practice/attempt/native',
        );
        callbacks.onInteractionLockChange?.(true);
        await Promise.resolve();
      });

      expect(mockPracticeFlow.showFeedback).not.toHaveBeenCalled();
      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(screen.queryByText('late wait notice')).toBeNull();
      expect(acceptedEndpointMismatch).toBe(false);
      expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledTimes(requestsBeforeBoundary);
      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(
        screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
          .accessibilityState,
      ).toMatchObject({ disabled: false });
    },
  );

  it('updates a cached new word to revision after a real scored miss', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I tried to answer.',
      feedback: 'Add more detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    await waitFor(() => expect(screen.getByText(t('practice.revision'))).toBeTruthy());
    expect(
      screen.getByText(
        t('practice.progressLine', { mastered: 2, total: 8 }) +
          t('practice.progressLearning', { count: 2 }),
      ),
    ).toBeTruthy();
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      attemptsUsed: 1,
      attemptsLeft: 2,
      progress: { ...PRACTICE_QUESTION.progress, learningCount: 2 },
    });
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(
      QUESTION.id,
      miss,
      QUESTION,
      expect.any(String),
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('cancels an active pre-answer question GET before accepting a scored result', async () => {
    const queryClient = makeQueryClient();
    const queryKey = ['practice-question', USER.id, USER.cefrLevel] as const;
    const staleRefresh = deferred<unknown>();
    let staleSignal: AbortSignal | undefined;
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockImplementationOnce((_path: string, options?: { signal?: AbortSignal }) => {
        staleSignal = options?.signal;
        return staleRefresh.promise;
      });
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    let backgroundRefresh!: Promise<void>;

    await act(async () => {
      backgroundRefresh = queryClient.refetchQueries({ queryKey, exact: true });
      await Promise.resolve();
    });
    const miss: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I tried to answer.',
      feedback: 'Add more detail.',
    };
    await act(async () => recorderProps().onResult(miss));
    const staleWasAborted = staleSignal?.aborted;

    await act(async () => {
      staleRefresh.resolve(PRACTICE_QUESTION);
      await Promise.allSettled([backgroundRefresh]);
      await Promise.resolve();
    });

    expect(staleWasAborted).toBe(true);
    expect(queryClient.getQueryData(queryKey)).toEqual({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      attemptsUsed: 1,
      attemptsLeft: 2,
      progress: { ...PRACTICE_QUESTION.progress, learningCount: 2 },
    });
  });

  it('does not double-count a scored miss for a word already in revision', async () => {
    const revision = {
      ...PRACTICE_QUESTION,
      kind: 'revision' as const,
    };
    mockApiFetch.mockResolvedValue(revision);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 50,
      transcript: 'I tried again.',
      feedback: 'Add another supporting detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual({
      ...revision,
      attemptsUsed: 2,
      attemptsLeft: 1,
    });
  });

  it('surfaces recorder errors through an alert', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onError('upload failed'));
    expect(alertSpy).toHaveBeenCalledWith(t('diag.assessFailedTitle'), 'upload failed');
  });

  it('refetches the question when recorder recovery is unresolved', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      recorderProps().onRecoveryUnresolved();
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('replaces a pre-recovery question refresh and deduplicates recovery callbacks', async () => {
    const queryClient = makeQueryClient();
    const queryKey = ['practice-question', USER.id, USER.cefrLevel] as const;
    const staleRefresh = deferred<unknown>();
    const recoveryRefresh = deferred<unknown>();
    let staleSignal: AbortSignal | undefined;
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockImplementationOnce((_path: string, options?: { signal?: AbortSignal }) => {
        staleSignal = options?.signal;
        return staleRefresh.promise;
      })
      .mockReturnValueOnce(recoveryRefresh.promise);
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    let backgroundRefresh!: Promise<void>;

    await act(async () => {
      backgroundRefresh = queryClient.refetchQueries({ queryKey, exact: true });
      await Promise.resolve();
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      recorderProps().onRecoveryUnresolved();
      recorderProps().onRecoveryUnresolved();
      await Promise.resolve();
      await Promise.resolve();
    });
    const callsAfterRecovery = mockApiFetch.mock.calls.length;
    const staleWasAborted = staleSignal?.aborted;

    await act(async () => {
      staleRefresh.resolve(PRACTICE_QUESTION);
      recoveryRefresh.resolve(NEXT_PRACTICE_QUESTION);
      await Promise.allSettled([backgroundRefresh]);
      await Promise.resolve();
    });
    expect(callsAfterRecovery).toBe(3);
    expect(staleWasAborted).toBe(true);
    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
  });

  it('keeps a cached question visible when a recovery refresh fails', async () => {
    const queryClient = makeQueryClient();
    const queryKey = ['practice-question', USER.id, USER.cefrLevel] as const;
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockRejectedValueOnce(new Error('background refresh failed'));
    await renderScreen(<PracticeScreen />, queryClient);
    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();

    await act(async () => recorderProps().onRecoveryUnresolved());
    await waitFor(() => expect(queryClient.getQueryState(queryKey)?.status).toBe('error'));
    // The cache updates before TanStack Query delivers its batched observer notification.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText(t('practice.loadFailedTitle'))).toBeNull();
  });

  it('navigates to help for the current question', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await expectPressFeedback(
      () => screen.getByLabelText(t('practice.helpLabel')),
      {
        alignItems: 'center',
        backgroundColor: colors.primary,
        height: layout.minimumTarget,
        justifyContent: 'center',
        width: layout.minimumTarget,
      },
      { backgroundColor: colors.primaryDark },
    );
    const pressHelp = committedPressHandler(screen.getByLabelText(t('practice.helpLabel')));
    await act(async () => {
      pressHelp();
      pressHelp();
    });
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id, cycleId: CYCLE_ID, attemptsUsed: '0' },
    });
  });

  it('rejects a captured navigation handler after the practice screen loses focus', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const view = await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const staleHelpPress = committedPressHandler(screen.getByLabelText(t('practice.helpLabel')));

    await view.unmount();
    await act(async () => {
      staleHelpPress();
    });

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the question fails to load', async () => {
    const refetchSpy = trackQueryRefetches();
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy')).props.accessibilityLiveRegion).toBe('assertive');
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(refetchSpy).toHaveBeenLastCalledWith({ cancelRefetch: false });
  });

  it('uses the practice fallback without also showing a loading state', async () => {
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText(t('practice.loadFailed'))).toBeTruthy();
    expect(screen.queryByText(t('practice.loadingQuestion'))).toBeNull();
  });
});

describe('practice feedback screen', () => {
  it('handles missing feedback with a way back to practice', async () => {
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByRole('header', { name: t('feedback.noResultTitle') })).toBeTruthy();
    expect(screen.getByText(t('feedback.noResultBody'))).toBeTruthy();
    expect(screen.queryByText(t('feedback.passedTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.nextQuestion'))).toBeNull();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.backToPractice') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.backToPractice') }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the passed variant and seeds the next question', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(screen.getByText(t('feedback.passedTitle'))).toBeTruthy();
    expect(
      screen.getByText(t('feedback.passedBody', { score: PRACTICE_MASTER_SCORE })),
    ).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
    expect(
      screen.getByRole('progressbar', { name: t('feedback.scoreLine', { score: 72 }) }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        t('feedback.scoreMeaning', { pass: PRACTICE_PASS_SCORE, master: PRACTICE_MASTER_SCORE }),
      ),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
    expect(screen.getByText('“I enjoy reading.”')).toBeTruthy();
    expect(screen.getByText(t('feedback.feedbackLabel'))).toBeTruthy();
    expect(screen.getByText('Nice work.').props.accessibilityLanguage).toBe('en-US');
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(screen.queryByText(t('feedback.finalTitle'))).toBeNull();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    // A scored English pass owns the bottom bar alone: the native-answer
    // actions belong to native outcomes only.
    expect(screen.queryByText(t('feedback.tryInEnglish'))).toBeNull();
    expect(screen.queryByText(t('feedback.tryAgainNative'))).toBeNull();
    // Only mastery and a promotion earn the physical cheer.
    expect(jest.mocked(Haptics.notificationAsync)).not.toHaveBeenCalled();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.passedTitle') })),
    ).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('feedback.nextQuestion') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockAcknowledgePendingFeedback).not.toHaveBeenCalled();
  });

  it('acknowledges a durable feedback pointer before one guarded card action', async () => {
    const acknowledgement = deferred<boolean>();
    mockAcknowledgePendingFeedback.mockReturnValue(acknowledgement.promise);
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: PASSED_RESULT,
        question: QUESTION,
        requestId: FEEDBACK_REQUEST_ID,
      },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);
    const nextQuestion = committedPressHandler(
      screen.getByRole('button', { name: t('feedback.nextQuestion') }),
    );

    await act(async () => {
      nextQuestion();
      nextQuestion();
      await Promise.resolve();
    });

    expect(mockAcknowledgePendingFeedback).toHaveBeenCalledTimes(1);
    expect(mockAcknowledgePendingFeedback).toHaveBeenCalledWith(USER.id, FEEDBACK_REQUEST_ID);
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(
      queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel]),
    ).toBeUndefined();
    expect(
      screen.getByRole('button', { name: t('feedback.nextQuestion') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await act(async () => {
      acknowledgement.resolve(true);
      await acknowledgement.promise;
    });
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it.each(['false result', 'rejection'] as const)(
    'keeps durable feedback visible and rearms its action after acknowledgement %s',
    async (failure) => {
      if (failure === 'false result') {
        mockAcknowledgePendingFeedback.mockResolvedValueOnce(false);
      } else {
        mockAcknowledgePendingFeedback.mockRejectedValueOnce(new Error('private storage error'));
      }
      mockAcknowledgePendingFeedback.mockResolvedValueOnce(true);
      mockPracticeFlow = makePracticeFlow({
        feedback: {
          questionId: QUESTION.id,
          result: PASSED_RESULT,
          requestId: FEEDBACK_REQUEST_ID,
        },
      });
      await renderScreen(<FeedbackScreen />);

      await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
      expect(await screen.findByRole('alert')).toHaveTextContent(t('boundary.body'));
      expect(screen.getByText(t('feedback.passedTitle'))).toBeTruthy();
      expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
      expect(mockRouter.dismissTo).not.toHaveBeenCalled();

      await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
      await waitFor(() => expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice'));
      expect(mockAcknowledgePendingFeedback).toHaveBeenCalledTimes(2);
      expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
    },
  );

  it('gates the durable card hardware-back action on the same acknowledgement', async () => {
    const acknowledgement = deferred<boolean>();
    mockAcknowledgePendingFeedback.mockReturnValue(acknowledgement.promise);
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: PASSED_RESULT,
        requestId: FEEDBACK_REQUEST_ID,
      },
    });
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
      await Promise.resolve();
    });
    expect(consumed).toBe(true);
    expect(mockAcknowledgePendingFeedback).toHaveBeenCalledWith(USER.id, FEEDBACK_REQUEST_ID);
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    await act(async () => {
      acknowledgement.resolve(true);
      await acknowledgement.promise;
    });
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('does not navigate after durable acknowledgement resolves off-focus', async () => {
    const acknowledgement = deferred<boolean>();
    mockAcknowledgePendingFeedback.mockReturnValue(acknowledgement.promise);
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: PASSED_RESULT,
        requestId: FEEDBACK_REQUEST_ID,
      },
    });
    await renderScreen(<FeedbackScreen />);
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    await blurScreen();

    await act(async () => {
      acknowledgement.resolve(true);
      await acknowledgement.promise;
    });

    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockPracticeFlow.restoreFeedback).toHaveBeenCalledWith(
      QUESTION.id,
      PASSED_RESULT,
      undefined,
      undefined,
    );

    await focusScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(mockAcknowledgePendingFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('does not mount submitted-recording playback when the outcome omits its additive id', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.queryByText(t('recordings.yourRecording'))).toBeNull();
    expect(asMock(RecordingPlayback)).not.toHaveBeenCalled();
  });

  it('shows contextual submitted-recording playback when the additive id is present', async () => {
    const recordingId = '550e8400-e29b-41d4-a716-446655440090';
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: { ...PASSED_RESULT, recordingId } },
    });
    await renderScreen(<FeedbackScreen />);
    expect(screen.getByText(t('recordings.yourRecording'))).toBeTruthy();
    expect(screen.getByText(`recording-player:${recordingId}`)).toBeTruthy();
    expect(asMock(RecordingPlayback).mock.calls.map(([props]) => props)).toEqual([
      { ownerId: USER.id, recordingId, onDeleted: expect.any(Function) },
    ]);
    const playbackProps = asMock(RecordingPlayback).mock.calls[0][0] as {
      onDeleted: (recordingId: string) => void;
    };
    playbackProps.onDeleted(recordingId);
    expect(mockPracticeFlow.clearRecordingReferences).toHaveBeenCalledTimes(1);
  });

  it('renders the mastered variant and seeds the next question', async () => {
    const masteredResult: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: true,
      mastered: true,
      attemptNo: 1,
      attemptsLeft: 0,
      score: 88,
      transcript: 'I spoke up at work.',
      feedback: 'Confident and clear.',
      next: NEXT_PRACTICE_QUESTION,
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: masteredResult },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(screen.getByText(t('feedback.masteredTitle'))).toBeTruthy();
    expect(
      screen.getByText(t('feedback.masteredBody', { score: PRACTICE_MASTER_SCORE })),
    ).toBeTruthy();
    expect(screen.getByText('88')).toBeTruthy();
    expect(
      screen.getByRole('progressbar', { name: t('feedback.scoreLine', { score: 88 }) }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        t('feedback.scoreMeaning', { pass: PRACTICE_PASS_SCORE, master: PRACTICE_MASTER_SCORE }),
      ),
    ).toBeTruthy();
    // Mastery celebrates with a success haptic; other variants stay silent.
    expect(jest.mocked(Haptics.notificationAsync)).toHaveBeenCalledWith('success');
    expect(screen.getByText('Confident and clear.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.passedTitle'))).toBeNull();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.masteredTitle') })),
    ).toMatchObject({
      color: colors.accent,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the native variant with the model answer when understood', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: true,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
      translatedTranscript: 'She was brave at her job.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'You understood the question.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    // The transcript keeps its submission-time language even if the profile
    // preference changed before a durable replay was viewed.
    mockAuthValue = makeAuth({ user: { ...USER, nativeLanguage: 'hi' } });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.nativeUnderstoodTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.nativeUnderstoodBody'))).toBeTruthy();
    expect(
      screen.getByText(t('feedback.originalTranscript', { language: t('language.te') })),
    ).toBeTruthy();
    expect(
      screen.queryByText(t('feedback.originalTranscript', { language: t('language.hi') })),
    ).toBeNull();
    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”')).toBeTruthy();
    expect(screen.getByText(t('feedback.feedbackLabel'))).toBeTruthy();
    expect(screen.getByText('You understood the question.')).toBeTruthy();
    expect(screen.getByText(t('feedback.englishTranslation'))).toBeTruthy();
    expect(screen.getByText(t('feedback.exampleEnglishAnswer'))).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”').props.accessibilityLanguage).toBe(
      'te-IN',
    );
    // Native results carry no score and never advance the word queue.
    expect(screen.queryByText(/\/ 100/)).toBeNull();
    expect(screen.queryByText(t('feedback.nextQuestion'))).toBeNull();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    // The primary action wears the hero size; its quieter sibling stays md.
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('feedback.tryInEnglish') })),
    ).toMatchObject({
      minHeight: layout.minimumTarget,
      alignSelf: 'stretch',
      paddingVertical: spacing.ml,
      paddingHorizontal: spacing.xl,
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('feedback.tryAgainNative') })),
    ).toMatchObject({
      minHeight: layout.minimumTarget,
      alignSelf: 'stretch',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    });
    expect(
      flattenedStyle(parentOf(screen.getByRole('button', { name: t('feedback.tryInEnglish') }))),
    ).toEqual({ alignSelf: 'stretch', gap: spacing.sm });
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.nativeUnderstoodTitle') })),
    ).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.tryInEnglish') }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('shows a native third try as terminal, keeps translation distinct, and advances', async () => {
    const nativeFinal: NativeAttemptResult = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: true,
      attemptNo: 3,
      attemptsLeft: 0,
      transcript: 'ఆమ తన పనిలో ధైర్యంగా ఉంది.',
      translatedTranscript: 'She was brave at work.',
      modelAnswer: 'She showed courage when she spoke up at work.',
      feedback: 'You understood the question.',
      next: NEXT_PRACTICE_QUESTION,
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, question: QUESTION, result: nativeFinal },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(screen.getByRole('header', { name: t('feedback.nativeFinalTitle') })).toBeTruthy();
    expect(screen.getByText(t('feedback.nativeFinalBody'))).toBeTruthy();
    expect(screen.getByText(t('feedback.attemptLine', { current: 3, max: 3 }))).toBeTruthy();
    expect(screen.getByText(QUESTION.promptWord).props).toMatchObject({
      accessibilityLanguage: 'en-US',
      accessibilityRole: 'header',
      selectable: true,
    });
    expect(screen.getByText(QUESTION.questionText).props).toMatchObject({
      accessibilityLanguage: 'en-US',
      selectable: true,
    });
    expect(screen.getByText(`“${nativeFinal.transcript}”`).props.selectable).toBe(true);
    expect(screen.getByText(nativeFinal.translatedTranscript).props).toMatchObject({
      accessibilityLanguage: 'en-US',
      selectable: true,
    });
    expect(screen.getByText(nativeFinal.modelAnswer).props).toMatchObject({
      accessibilityLanguage: 'en-US',
      selectable: true,
    });
    expect(screen.queryByText(t('feedback.tryInEnglish'))).toBeNull();
    expect(screen.queryByText(t('feedback.tryAgainNative'))).toBeNull();
    const next = screen.getByRole('button', { name: t('feedback.nextQuestion') });
    expect(flattenedStyle(next)).toMatchObject({
      minHeight: layout.minimumTarget,
      alignSelf: 'stretch',
      paddingVertical: spacing.ml,
      paddingHorizontal: spacing.xl,
    });

    await fireEvent.press(next);
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the native variant with a model answer when the answer missed the question', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: false,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'నేను రైలులో ప్రయాణిస్తాను.',
      translatedTranscript: 'I travel by train.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'That answer was about travel, not courage.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.nativeMissedTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.nativeMissedBody'))).toBeTruthy();
    expect(screen.getByText('That answer was about travel, not courage.')).toBeTruthy();
    expect(screen.getByText(t('feedback.exampleEnglishAnswer'))).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.nativeUnderstoodTitle'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.nativeMissedTitle') })),
    ).toMatchObject({
      color: colors.warning,
      textAlign: 'center',
    });
    expect(screen.getByRole('button', { name: t('feedback.tryInEnglish') })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.tryAgainNative') }));
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders native silence as a free retry that preserves native mode', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: false,
      attemptNo: 1,
      attemptsLeft: 3,
      noSpeech: true,
      transcript: '',
      translatedTranscript: '',
      modelAnswer: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      answerMode: 'native',
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.noSpeechTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.nativeNoSpeechBody'))).toBeTruthy();
    expect(
      screen.getByText(t('feedback.attemptStillAvailable', { current: 1, max: 3 })),
    ).toBeTruthy();
    expect(screen.queryByText(t('feedback.attemptLine', { current: 1, max: 3 }))).toBeNull();
    expect(screen.getByText('We could not detect any speech.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.weHeard'))).toBeNull();
    expect(screen.queryByText(/\/ 100/)).toBeNull();
    // Silence is not a judged answer: neither native verdict may appear.
    expect(screen.queryByText(t('feedback.nativeUnderstoodTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.nativeMissedTitle'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.noSpeechTitle') })),
    ).toEqual({
      marginTop: spacing.md,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.warning,
    });

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.tryAgainNative') }));
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the nospeech variant with Try Again and help actions', async () => {
    const noSpeechResult: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      noSpeech: true,
      attemptNo: 1,
      attemptsLeft: 3,
      score: 0,
      transcript: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: noSpeechResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.noSpeechTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.noSpeechBody'))).toBeTruthy();
    expect(
      screen.getByText(t('feedback.attemptStillAvailable', { current: 1, max: 3 })),
    ).toBeTruthy();
    expect(screen.queryByText(t('feedback.attemptLine', { current: 1, max: 3 }))).toBeNull();
    expect(screen.getByText('We could not detect any speech.')).toBeTruthy();
    // Silence carries no score or transcript and does not advance the queue.
    expect(screen.queryByText(/\/ 100/)).toBeNull();
    expect(screen.queryByText(t('feedback.weHeard'))).toBeNull();
    expect(screen.queryByText(t('feedback.nextQuestion'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.noSpeechTitle') })),
    ).toMatchObject({
      color: colors.warning,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('opens help from the nospeech variant', async () => {
    const noSpeechResult: AttemptResult = {
      cycleId: CYCLE_ID,
      passed: false,
      mastered: false,
      noSpeech: true,
      attemptNo: 1,
      attemptsLeft: 3,
      score: 0,
      transcript: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: noSpeechResult },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.seeHelp') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id, cycleId: CYCLE_ID, attemptsUsed: '0' },
    });
  });

  it('keeps feedback actions above a larger device safe-area inset', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />, undefined, 34);

    expect(buttonContainerPaddingBottom(t('feedback.nextQuestion'))).toBe(34);
  });

  it('invalidates the practice question when no next question is provided', async () => {
    const { next: _next, ...result } = PASSED_RESULT;
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the retry variant with remaining attempts and Try Again', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 2,
          attemptsLeft: 1,
          score: 40,
          transcript: 'I tried to answer.',
          feedback: 'Keep practicing.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(
      screen.getByText(t('feedback.retryTitle', { attempt: 3, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.retryBodyOne'))).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(
      screen.getByRole('progressbar', { name: t('feedback.scoreLine', { score: 40 }) }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        t('feedback.scoreMeaning', { pass: PRACTICE_PASS_SCORE, master: PRACTICE_MASTER_SCORE }),
      ),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
    expect(screen.getByText('Keep practicing.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.passedTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.finalTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.nextQuestion'))).toBeNull();
    expect(
      flattenedStyle(
        screen.getByRole('header', {
          name: t('feedback.retryTitle', { attempt: 3, max: PRACTICE_MAX_ATTEMPTS }),
        }),
      ),
    ).toMatchObject({ color: colors.warning, textAlign: 'center' });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('pluralizes remaining attempts', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 55,
          transcript: 'some words',
          feedback: 'Almost there.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(
      screen.getByText(t('feedback.retryTitle', { attempt: 2, max: PRACTICE_MAX_ATTEMPTS })),
    ).toBeTruthy();
    expect(screen.getByText(t('feedback.retryBodyMany', { count: 2 }))).toBeTruthy();
    expect(screen.getByText(t('feedback.weHeard'))).toBeTruthy();
  });

  it('renders the final variant with final feedback', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Regular feedback.',
          finalFeedback: 'Final words.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.finalTitle'))).toBeTruthy();
    expect(screen.getByText(t('feedback.finalBody'))).toBeTruthy();
    expect(screen.getByText(t('feedback.finalFeedbackLabel'))).toBeTruthy();
    expect(screen.getByText('Final words.')).toBeTruthy();
    expect(screen.queryByText('Regular feedback.')).toBeNull();
    expect(screen.getByRole('button', { name: t('feedback.nextQuestion') })).toBeTruthy();
    expect(screen.queryByText(t('feedback.passedTitle'))).toBeNull();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(screen.queryByText(t('common.tryAgain'))).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: t('feedback.finalTitle') })),
    ).toMatchObject({
      color: colors.danger,
      textAlign: 'center',
    });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('feedback.nextQuestion') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
  });

  it('ignores unexpected final feedback outside the final variant', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          ...PASSED_RESULT,
          feedback: 'Normal passed feedback.',
          finalFeedback: 'Must not be displayed.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.feedbackLabel'))).toBeTruthy();
    expect(screen.getByText('Normal passed feedback.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.finalFeedbackLabel'))).toBeNull();
    expect(screen.queryByText('Must not be displayed.')).toBeNull();
  });

  it('does not navigate when the user is missing', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });

  it('advances via the seeded next question when hardware back follows a pass', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('invalidates the practice question when hardware back ends the final attempt', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Regular feedback.',
        },
      },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it.each([
    [
      'a retry result',
      {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 40,
        transcript: 'I tried to answer.',
        feedback: 'Keep practicing.',
      } satisfies AttemptResult,
    ],
    [
      'a nospeech result',
      {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        noSpeech: true,
        attemptNo: 1,
        attemptsLeft: 3,
        score: 0,
        transcript: '',
        feedback: 'We could not detect any speech.',
      } satisfies AttemptResult,
    ],
  ])('treats hardware back as the free retry for %s', async (_label, result) => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result },
    });
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it('treats hardware back as Try in English on the native variant', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: true,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
      translatedTranscript: 'She showed courage at work.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'You understood the question.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('keeps native mode when hardware back follows native silence', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: false,
      attemptNo: 1,
      attemptsLeft: 3,
      noSpeech: true,
      transcript: '',
      translatedTranscript: '',
      modelAnswer: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      answerMode: 'native',
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    // Silence never consumed the word, so the queue must not be advanced or
    // re-fetched behind the learner's back.
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
  });

  it('routes hardware back to practice when there is no result to show', async () => {
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });

  it('hides the decorative outcome badge from screen readers on every variant', async () => {
    const cases: readonly [PracticeOutcome][] = [
      [PASSED_RESULT],
      [{ ...PASSED_RESULT, mastered: true, score: 88 }],
      [
        {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 40,
          transcript: 'I tried.',
          feedback: 'Keep going.',
        },
      ],
      [
        {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Final.',
        },
      ],
      [
        {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          noSpeech: true,
          attemptNo: 1,
          attemptsLeft: 3,
          score: 0,
          transcript: '',
          feedback: 'We could not detect any speech.',
        },
      ],
      [
        {
          mode: 'native',
          nativeLanguage: 'te',
          cycleId: CYCLE_ID,
          understood: true,
          attemptNo: 1,
          attemptsLeft: 2,
          transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
          translatedTranscript: 'She showed courage at work.',
          modelAnswer: 'She showed courage at work.',
          feedback: 'On topic.',
        },
      ],
      [
        {
          mode: 'native',
          nativeLanguage: 'te',
          cycleId: CYCLE_ID,
          understood: false,
          attemptNo: 1,
          attemptsLeft: 2,
          transcript: 'నేను రైలులో ప్రయాణిస్తాను.',
          translatedTranscript: 'I travel by train.',
          modelAnswer: 'She showed courage at work.',
          feedback: 'Off topic.',
        },
      ],
      [
        {
          mode: 'native',
          nativeLanguage: 'te',
          cycleId: CYCLE_ID,
          understood: false,
          attemptNo: 1,
          attemptsLeft: 3,
          noSpeech: true,
          transcript: '',
          translatedTranscript: '',
          modelAnswer: '',
          feedback: 'We could not detect any speech.',
        },
      ],
    ];
    for (const [result] of cases) {
      mockPracticeFlow = makePracticeFlow({ feedback: { questionId: QUESTION.id, result } });
      const view = await renderScreen(<FeedbackScreen />);

      // The icon badge is the celebration mark: present, decorative, hidden
      // from screen readers exactly like the emoji art it replaces.
      const badge = screen.getByTestId('feedback-outcome-badge', {
        includeHiddenElements: true,
      });
      expect(badge.props.accessibilityElementsHidden).toBe(true);
      expect(badge.props.importantForAccessibility).toBe('no-hide-descendants');
      expect(badge.children).not.toHaveLength(0);
      await view.unmount();
    }
  });

  it('scopes the polite live region to the outcome headline and score block', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    const header = screen.getByRole('header', { name: t('feedback.passedTitle') });
    const liveHeader = header.parent;
    if (!liveHeader) throw new Error('Feedback headline has no live-region container');
    expect(liveHeader.props.accessibilityLiveRegion).toBe('polite');
    // The score ring announces itself with the headline…
    expect(screen.getByTestId('feedback-score-ring').parent).toBe(liveHeader);
    expect(
      screen.getByRole('progressbar', { name: t('feedback.scoreLine', { score: 72 }) }),
    ).toBeTruthy();
    // …while the transcript/feedback card stays out of the live region.
    const card = screen.getByText('Nice work.').parent;
    expect(card?.props.accessibilityLiveRegion).toBeUndefined();
  });

  it('ignores a second tap on Try Again before navigation completes', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 40,
          transcript: 'I tried.',
          feedback: 'Keep going.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));

    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
  });

  it('ignores a second tap on Next Question before navigation completes', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    const setDataSpy = jest.spyOn(queryClient, 'setQueryData');
    await renderScreen(<FeedbackScreen />, queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(setDataSpy).toHaveBeenCalledTimes(1);
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
  });

  it('binds feedback actions to the lease captured by the rendered card', async () => {
    const renderLease = { owner: 'feedback-render' } as never;
    let currentLease: unknown = renderLease;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => currentLease as never),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    const setDataSpy = jest.spyOn(queryClient, 'setQueryData');
    await renderScreen(<FeedbackScreen />, queryClient);

    // If the handler captures here instead of at render time, it receives the
    // replacement lease and incorrectly treats the old card as current.
    currentLease = { owner: 'replacement-session' };
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    expect(setDataSpy).not.toHaveBeenCalled();
    expect(mockAuthValue.setUser).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('cancels an active old-question GET before seeding feedback.next', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    const queryKey = ['practice-question', USER.id, USER.cefrLevel] as const;
    queryClient.setQueryData(queryKey, PRACTICE_QUESTION);
    const staleRefresh = deferred<PracticeQuestionPayload>();
    let staleSignal: AbortSignal | undefined;
    const backgroundRefresh = queryClient.fetchQuery({
      queryKey,
      queryFn: ({ signal }) => {
        staleSignal = signal;
        return staleRefresh.promise;
      },
      staleTime: 0,
    });
    const backgroundSettled = Promise.allSettled([backgroundRefresh]);
    await renderScreen(<FeedbackScreen />, queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    const staleWasAborted = staleSignal?.aborted;
    await act(async () => {
      staleRefresh.resolve(PRACTICE_QUESTION);
      await backgroundSettled;
      await Promise.resolve();
    });

    expect(staleWasAborted).toBe(true);
    expect(queryClient.getQueryData(queryKey)).toEqual(NEXT_PRACTICE_QUESTION);
  });

  it('lets hardware back reuse the one-shot action guard with the primary button', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    await act(async () => {
      pressHardwareBack();
    });

    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);
  });

  it('keeps the outcome on screen while the router pops the card away', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalledTimes(1);

    // Clearing the flow state re-renders this card before the pop finishes;
    // the learner must see it slide away, not a spurious failure notice.
    mockPracticeFlow = makePracticeFlow({ feedback: null });
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });

    expect(screen.getByText(t('feedback.passedTitle'))).toBeTruthy();
    expect(screen.getByText('Nice work.')).toBeTruthy();
    expect(screen.queryByText(t('feedback.noResultTitle'))).toBeNull();
    expect(screen.queryByText(t('feedback.noResultBody'))).toBeNull();
  });
});

describe('practice help screen', () => {
  it('shows the offline state before bilingual help can load', async () => {
    onlineManager.setOnline(false);
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);

    expect(await screen.findByRole('header', { name: t('network.offlineTitle') })).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid question link', async () => {
    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<HelpScreen />);

    expect(screen.getByText(t('help.invalidLinkTitle'))).toBeTruthy();
    // Help sends the learner back through the question they came from.
    expect(screen.getByText(t('help.invalidLinkBody'))).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.backToPractice') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.backToPractice') }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('rejects an invalid practice cycle before loading bilingual help', async () => {
    mockSearchParams = { questionId: QUESTION.id, cycleId: 'not-a-cycle-uuid' };
    await renderScreen(<HelpScreen />);

    expect(screen.getByRole('header', { name: t('help.invalidLinkTitle') })).toBeTruthy();
    expect(screen.getByText(t('help.invalidLinkBody'))).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('shows a loading state while help loads', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<HelpScreen />);
    expect(screen.getByText(t('help.loading')).props.accessibilityLiveRegion).toBe('polite');
    // The spinner itself is labelled, so the wait is announced without sight.
    expect(screen.getByLabelText(t('help.loading'))).toBeTruthy();
    expect(screen.queryByText(t('help.loadFailedTitle'))).toBeNull();
  });

  it('renders the word, question, and bilingual examples', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    await renderScreen(<HelpScreen />, queryClient);

    expect(await screen.findByText(t('label.word'))).toBeTruthy();
    expect(screen.getByText('courage').props.accessibilityLanguage).toBe('en-US');
    expect(screen.getByText('ధైర్యం')).toBeTruthy();
    expect(screen.getByText(t('label.question'))).toBeTruthy();
    expect(
      screen.getByText('Describe a time you showed courage.').props.accessibilityLanguage,
    ).toBe('en-US');
    expect(screen.getByText('మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.')).toBeTruthy();
    expect(screen.getByText(t('help.examplesLabel'))).toBeTruthy();
    expect(screen.getByText(t('help.exampleNumber', { number: 1 }))).toBeTruthy();
    expect(screen.getByText('She showed courage at work.').props.accessibilityLanguage).toBe(
      'en-US',
    );
    expect(screen.getByText('ఆమె పనిలో ధైర్యం చూపింది.')).toBeTruthy();
    expect(screen.getByText(t('help.exampleNumber', { number: 2 }))).toBeTruthy();
    expect(screen.getByText('It takes courage to speak up.')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/practice/question/${QUESTION.id}/help`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(screen.getByText('ధైర్యం').props.accessibilityLanguage).toBe('te-IN');
    expect(
      screen.getByText('మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.').props.accessibilityLanguage,
    ).toBe('te-IN');
    expect(screen.getByText('ఆమె పనిలో ధైర్యం చూపింది.').props.accessibilityLanguage).toBe('te-IN');
    const helpQuery = queryClient.getQueryCache().find({
      queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      exact: true,
    });
    expect(helpQuery).toBeDefined();
    expect(helpQuery?.options).toEqual(expect.objectContaining({ staleTime: 60 * 60_000 }));

    await act(async () => {
      refreshHandler()();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  });

  it('keeps the practice action above a larger device safe-area inset', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />, undefined, 34);
    await screen.findByText(t('label.word'));

    expect(buttonContainerPaddingBottom(t('help.startPractice'))).toBe(34);
  });

  it('does not load help without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockSearchParams = { questionId: QUESTION.id };

    await renderScreen(<HelpScreen />);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText(t('label.word'))).toBeNull();
    expect(screen.queryByText(t('help.loading'))).toBeNull();
  });

  it.each([
    ['hi', 'hi-IN'],
    ['es', 'es-ES'],
    ['zh', 'zh-Hans'],
  ] as const)('uses the %s learner language for native help text', async (language, tag) => {
    mockAuthValue = makeAuth({ user: { ...USER, nativeLanguage: language } });
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);

    expect((await screen.findByText('ధైర్యం')).props.accessibilityLanguage).toBe(tag);
    expect(screen.getByText('ఆమె పనిలో ధైర్యం చూపింది.').props.accessibilityLanguage).toBe(tag);
  });

  it('returns from help to the one canonical practice recorder', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);
    await screen.findByText(t('label.word'));

    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('help.startPractice') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('help.startPractice') }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('shows a retryable error when help fails to load', async () => {
    const refetchSpy = trackQueryRefetches();
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch
      .mockRejectedValueOnce(new ApiError(500, 'boom'))
      .mockResolvedValueOnce(HELP_CONTENT);
    await renderScreen(<HelpScreen />);

    expect(await screen.findByText(t('help.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy')).props.accessibilityLiveRegion).toBe('assertive');
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(refetchSpy).toHaveBeenLastCalledWith({ cancelRefetch: false });
  });

  it('uses the help-specific fallback for non-API failures', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<HelpScreen />);

    expect(await screen.findByText(t('help.loadFailed'))).toBeTruthy();
    expect(screen.queryByText(t('help.loading'))).toBeNull();
  });

  it('keeps the help content alone when a background refresh fails', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      HELP_CONTENT,
    );
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<HelpScreen />, queryClient);
    expect(screen.getByText(t('label.word'))).toBeTruthy();

    // Practice Mode shares this query key with a far shorter staleTime, so a
    // focus-driven refetch can fail while this screen still holds content.
    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      });
    });

    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByRole('button', { name: t('help.startPractice') })).toBeTruthy();
    // The full-screen retry card must not replace the help the learner is reading.
    expect(screen.queryByText(t('help.loadFailedTitle'))).toBeNull();
    expect(screen.queryByText(t('error.serverBusy'))).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(t('refresh.failedUsingSaved')),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    expect(screen.getByText('courage')).toBeTruthy();
  });
});

describe('skip word', () => {
  it('skips the current word and fetches the next question', async () => {
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockResolvedValueOnce(NEXT_PRACTICE_QUESTION);
    mockSkipWord.mockResolvedValue(undefined);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      confirmSkipAlert();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSkipWord).toHaveBeenCalledWith(QUESTION.id, CYCLE_ID);
    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    // Only the confirmation dialog was shown; no failure alert fired.
    expect(alertSpy).not.toHaveBeenCalledWith(t('practice.skipFailedTitle'), expect.anything());
  });

  it('requires an explicit confirmation before skipping and honours cancel', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
    expect(mockSkipWord).not.toHaveBeenCalled();
    const [, , buttons] = alertSpy.mock.calls[alertSpy.mock.calls.length - 1]! as unknown as [
      string,
      string,
      MockAlertButton[],
    ];
    expect(alertSpy).toHaveBeenLastCalledWith(
      t('practice.skipConfirmTitle'),
      t('practice.skipConfirmBody'),
      [
        expect.objectContaining({ text: t('common.cancel'), style: 'cancel' }),
        expect.objectContaining({ text: t('practice.skipWord') }),
      ],
    );

    buttons[0]!.onPress?.();
    expect(mockSkipWord).not.toHaveBeenCalled();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
  });

  it('runs one skip when the confirmation is confirmed twice in the same frame', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockReturnValue(new Promise<void>(() => undefined));
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      confirmSkipAlert();
      confirmSkipAlert();
    });

    expect(mockSkipWord).toHaveBeenCalledTimes(1);
  });

  it('replaces a pre-skip question refresh after the word is parked', async () => {
    const queryClient = makeQueryClient();
    const queryKey = ['practice-question', USER.id, USER.cefrLevel] as const;
    const staleRefresh = deferred<unknown>();
    const freshRefresh = deferred<unknown>();
    let staleSignal: AbortSignal | undefined;
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockImplementationOnce((_path: string, options?: { signal?: AbortSignal }) => {
        staleSignal = options?.signal;
        return staleRefresh.promise;
      })
      .mockReturnValueOnce(freshRefresh.promise);
    mockSkipWord.mockResolvedValueOnce(undefined);
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    let backgroundRefresh!: Promise<void>;

    await act(async () => {
      backgroundRefresh = queryClient.refetchQueries({ queryKey, exact: true });
      await Promise.resolve();
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
    await act(async () => {
      confirmSkipAlert();
      await Promise.resolve();
    });
    await waitFor(() => expect(mockSkipWord).toHaveBeenCalledWith(QUESTION.id, CYCLE_ID));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(3));
    const callsAfterSkip = mockApiFetch.mock.calls.length;
    const staleWasAborted = staleSignal?.aborted;

    await act(async () => {
      staleRefresh.resolve(PRACTICE_QUESTION);
      freshRefresh.resolve(NEXT_PRACTICE_QUESTION);
      await Promise.allSettled([backgroundRefresh]);
      await Promise.resolve();
    });
    expect(mockSkipWord).toHaveBeenCalledWith(QUESTION.id, CYCLE_ID);
    expect(callsAfterSkip).toBe(3);
    expect(staleWasAborted).toBe(true);
    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
      ).toEqual({ disabled: false, busy: false }),
    );
  });

  it('issues one skip for two same-render activations', async () => {
    let resolveSkip: () => void = () => undefined;
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSkip = resolve;
      }),
    );
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const press = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    const startBlocked = recorderProps().isStartBlocked;
    expect(startBlocked?.()).toBe(false);
    let blockedDuringSkip = false;

    // Both queued taps only open the confirmation; no skip runs unconfirmed.
    await act(async () => {
      void press();
      void press();
    });
    expect(mockSkipWord).not.toHaveBeenCalled();

    await act(async () => {
      confirmSkipAlert();
      blockedDuringSkip = startBlocked?.() ?? false;
    });
    expect(mockSkipWord).toHaveBeenCalledTimes(1);
    expect(blockedDuringSkip).toBe(true);
    expect(recorderProps().disabled).toBe(true);

    await act(async () => {
      resolveSkip();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(startBlocked?.()).toBe(false));
  });

  it('locks every question-bound exit in the same frame that a skip starts', async () => {
    const skipRequest = deferred<void>();
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockReturnValue(skipRequest.promise);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const skipWord = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    const openHelp = committedPressHandler(screen.getByLabelText(t('practice.helpLabel')));
    const flipMode = committedPressHandler(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }),
    );
    mockSetOptions.mockClear();
    let prevented!: jest.Mock;

    await act(async () => {
      void skipWord();
      confirmSkipAlert();
      openHelp();
      flipMode();
      prevented = dispatchBeforeRemove();
      expect(pressHardwareBack()).toBe(true);
      await Promise.resolve();
    });

    expect(mockSkipWord).toHaveBeenCalledTimes(1);
    expect(prevented).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockSetOptions).toHaveBeenCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });
    expect(screen.getByLabelText(t('practice.helpLabel')).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true });

    await act(async () => {
      skipRequest.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
          .accessibilityState,
      ).toMatchObject({ disabled: false }),
    );
    expect(pressHardwareBack()).toBe(false);
    expect(dispatchBeforeRemove()).not.toHaveBeenCalled();
  });

  it('does no post-skip reconciliation after blur invalidates the render session lease', async () => {
    const skipRequest = deferred<void>();
    const renderLease = { owner: 'skip-render' } as never;
    let currentLease: unknown = renderLease;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => currentLease as never),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockReturnValue(skipRequest.promise);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const skipWord = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    await act(async () => {
      void skipWord();
      confirmSkipAlert();
      await Promise.resolve();
    });
    expect(mockSkipWord).toHaveBeenCalledTimes(1);
    await blurScreen();
    currentLease = { owner: 'replacement-session' };
    alertSpy.mockClear();

    await act(async () => {
      skipRequest.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    // The POST may have committed for its original owner, but a continuation
    // must not issue a GET with the replacement bearer into the old cache key.
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();

    await focusScreen();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
      ).toEqual({ disabled: false, busy: false }),
    );
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it('suppresses a rejected skip after its screen has blurred', async () => {
    const skipRequest = deferred<void>();
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockReturnValue(skipRequest.promise);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const skipWord = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    await act(async () => {
      void skipWord();
      confirmSkipAlert();
      await Promise.resolve();
    });
    expect(mockSkipWord).toHaveBeenCalledTimes(1);
    await blurScreen();
    alertSpy.mockClear();
    await act(async () => {
      skipRequest.reject(new Error('late failure'));
      await Promise.resolve();
      await Promise.resolve();
    });

    await focusScreen();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
      ).toEqual({ disabled: false, busy: false }),
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('disables skipping while the recorder holds the interaction lock', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const skip = screen.getByRole('button', { name: t('practice.skipWord') });
    expect(skip.props.accessibilityState).toMatchObject({ disabled: true });
    expect(skip.props.accessibilityHint).toBe(t('hint.finishRecordingFirst'));
    expect(flattenedStyle(skip)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(skip);
    expect(mockSkipWord).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('alerts with localized copy when the skip fails and keeps the question', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockRejectedValue(new ApiError(429, 'rate limited', 30));
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      confirmSkipAlert();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      t('practice.skipFailedTitle'),
      `${t('error.tooMany')} ${t('wait.seconds', { count: 30 })}`,
    );
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it.each(['PRACTICE_CYCLE_CLOSED', 'STATE_CHANGED'] as const)(
    'reconciles the canonical question and profile without an alert after %s',
    async (code) => {
      const queryClient = makeQueryClient();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      mockApiFetch
        .mockResolvedValueOnce(PRACTICE_QUESTION)
        .mockResolvedValueOnce(NEXT_PRACTICE_QUESTION);
      mockSkipWord.mockRejectedValue(new ApiError(409, 'stale serving cycle', undefined, { code }));
      await renderScreen(<PracticeScreen />, queryClient);
      await screen.findByText(QUESTION.questionText);

      await act(async () => {
        await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
        confirmSkipAlert();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(await screen.findByText(NEXT_QUESTION.questionText)).toBeTruthy();
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
      // Only the confirmation dialog was shown; no failure alert fired.
      expect(alertSpy).not.toHaveBeenCalledWith(t('practice.skipFailedTitle'), expect.anything());
    },
  );

  it('reports a canonical refresh failure after a closed-cycle skip conflict', async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockRejectedValueOnce(new Error('question refresh failed'));
    mockSkipWord.mockRejectedValue(
      new ApiError(409, 'stale serving cycle', undefined, {
        code: 'PRACTICE_CYCLE_CLOSED',
      }),
    );
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText(QUESTION.questionText);

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      confirmSkipAlert();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(alertSpy).toHaveBeenCalledWith(t('practice.skipFailedTitle'), t('practice.loadFailed'));
  });

  it('alerts when the post-skip refetch fails, since the parked word stays on screen', async () => {
    // The skip itself succeeded but the replacement question could not load;
    // refetch() never throws, so the failure must be read off its result or it
    // would pass silently with the parked word still showing.
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockRejectedValueOnce(new Error('network down'));
    mockSkipWord.mockResolvedValue(undefined);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      confirmSkipAlert();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSkipWord).toHaveBeenCalledWith(QUESTION.id, CYCLE_ID);
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
    expect(alertSpy).toHaveBeenCalledWith(t('practice.skipFailedTitle'), t('practice.skipFailed'));
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
  });
});

describe('inline rate-limit notice', () => {
  const WAIT_MESSAGE = `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`;

  it('renders the recorder-reported wait line inline on the practice screen', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(recorderProps().onRateLimited).toEqual(expect.any(Function));
    await act(async () => recorderProps().onRateLimited?.(WAIT_MESSAGE));

    const notice = screen.getByText(WAIT_MESSAGE);
    expect(notice).toBeTruthy();
    // The wait line is an alert for assistive tech, not a silent style change.
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('clears the practice wait line as soon as a new submission locks the recorder', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onRateLimited?.(WAIT_MESSAGE));
    expect(screen.getByText(WAIT_MESSAGE)).toBeTruthy();

    // Releasing the lock is not a new take: the wait line has to survive it.
    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(screen.getByText(WAIT_MESSAGE)).toBeTruthy();

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(screen.queryByText(WAIT_MESSAGE)).toBeNull();
  });
});

describe('level-up celebration', () => {
  const B2_QUESTION: Question = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    cefrLevel: 'B2',
    promptWord: 'ambition',
    questionText: 'What is your biggest ambition?',
  };

  const B2_PRACTICE_QUESTION: PracticeQuestionPayload = {
    question: B2_QUESTION,
    kind: 'new',
    progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 12, dueCount: 0 },
    cycleId: NEXT_CYCLE_ID,
    attemptsUsed: 0,
    attemptsLeft: 3,
  };

  const LEVEL_UP_RESULT: AttemptResult = {
    cycleId: CYCLE_ID,
    passed: true,
    mastered: true,
    attemptNo: 1,
    attemptsLeft: 0,
    score: 90,
    transcript: 'A detailed answer.',
    feedback: 'Excellent.',
    next: B2_PRACTICE_QUESTION,
    levelUp: { from: 'B1', to: 'B2' },
  };

  function renderLevelUpFeedback(queryClient?: QueryClient) {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: LEVEL_UP_RESULT },
    });
    return renderScreen(<FeedbackScreen />, queryClient);
  }

  function expectCurrentUserLevelUp(): void {
    expect(mockAuthValue.setUser).toHaveBeenCalledTimes(1);
    const update = (mockAuthValue.setUser as jest.Mock).mock.calls[0]?.[0] as unknown;
    expect(update).toEqual(expect.any(Function));
    const apply = update as (current: User | null) => User | null;
    const concurrentlyEdited = {
      ...USER,
      name: 'Ada King',
      nativeLanguage: 'hi' as const,
    };
    expect(apply(concurrentlyEdited)).toEqual({ ...concurrentlyEdited, cefrLevel: 'B2' });
    expect(apply(OTHER_USER)).toBe(OTHER_USER);
    expect(apply(null)).toBeNull();
  }

  it('celebrates the promotion with localized copy, hidden art, confetti, and a success haptic', async () => {
    await renderLevelUpFeedback();

    expect(screen.getByRole('header', { name: t('levelUp.title') })).toBeTruthy();
    expect(screen.getByText(t('levelUp.body', { level: 'B2' }))).toBeTruthy();
    expect(screen.getByText(t('levelUp.progress', { from: 'B1', to: 'B2' }))).toBeTruthy();
    expect(screen.getByText(t('cefr.B2'))).toBeTruthy();
    // The celebration replaces the plain mastery headline.
    expect(screen.queryByText(t('feedback.masteredTitle'))).toBeNull();
    expect(
      screen.getByRole('progressbar', { name: t('feedback.scoreLine', { score: 90 }) }),
    ).toBeTruthy();

    const badge = screen.getByTestId('feedback-outcome-badge', {
      includeHiddenElements: true,
    });
    expect(badge.props.accessibilityElementsHidden).toBe(true);
    expect(badge.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.getByTestId('feedback-confetti', { includeHiddenElements: true })).toBeTruthy();
    expect(jest.mocked(Haptics.notificationAsync)).toHaveBeenCalledWith('success');
    expect(flattenedStyle(screen.getByRole('header', { name: t('levelUp.title') }))).toEqual({
      marginTop: spacing.md,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.accent,
    });
    expect(flattenedStyle(screen.getByText(t('levelUp.body', { level: 'B2' })))).toEqual({
      marginTop: spacing.sm,
      fontSize: 20,
      fontWeight: '800',
      color: colors.primary,
      textAlign: 'center',
    });
  });

  it('applies the new level before continuing to the next question', async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderLevelUpFeedback(queryClient);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    // The next question is seeded under the NEW level's cache key and the
    // local user adopts that level so the practice screen reads that key.
    expect(queryClient.getQueryData(['practice-question', USER.id, 'B2'])).toEqual(
      B2_PRACTICE_QUESTION,
    );
    expect(queryClient.getQueryData(['practice-question', USER.id, 'B1'])).toBeUndefined();
    expectCurrentUserLevelUp();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it.each([
    [
      'English',
      {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 0,
        score: 40,
        transcript: 'I tried.',
        feedback: 'Keep practicing.',
        finalFeedback: 'This level changed while the answer was checked.',
        next: B2_PRACTICE_QUESTION,
      } satisfies AttemptResult,
    ],
    [
      'native',
      {
        mode: 'native',
        nativeLanguage: 'te',
        cycleId: CYCLE_ID,
        understood: true,
        attemptNo: 3,
        attemptsLeft: 0,
        transcript: 'నేను ప్రయత్నించాను.',
        translatedTranscript: 'I tried.',
        modelAnswer: 'I kept trying even when it was difficult.',
        feedback: 'You understood the question.',
        next: B2_PRACTICE_QUESTION,
      } satisfies NativeAttemptResult,
    ],
  ])(
    'adopts a rival promotion carried by a terminal %s result without a levelUp field',
    async (_mode, rivalResult) => {
      const queryClient = makeQueryClient();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      queryClient.setQueryData(['practice-question', USER.id, USER.cefrLevel], PRACTICE_QUESTION);
      mockPracticeFlow = makePracticeFlow({
        feedback: { questionId: QUESTION.id, result: rivalResult },
      });
      await renderScreen(<FeedbackScreen />, queryClient);

      await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

      expect(queryClient.getQueryData(['practice-question', USER.id, 'B2'])).toEqual(
        B2_PRACTICE_QUESTION,
      );
      expect(queryClient.getQueryData(['practice-question', USER.id, 'B1'])).toBeUndefined();
      expectCurrentUserLevelUp();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
      expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    },
  );

  it('treats hardware back as Next Question on the level-up variant', async () => {
    const queryClient = makeQueryClient();
    await renderLevelUpFeedback(queryClient);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(queryClient.getQueryData(['practice-question', USER.id, 'B2'])).toEqual(
      B2_PRACTICE_QUESTION,
    );
    expectCurrentUserLevelUp();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });
});

describe('home stats freshness', () => {
  it('marks stats and history stale when scored feedback is shown', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-history'] });
  });

  it('refreshes stats for native speech but leaves silence free', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      nativeLanguage: 'te',
      cycleId: CYCLE_ID,
      understood: true,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
      translatedTranscript: 'She showed courage at work.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'You understood the question.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-history'] });
  });
});

describe('practice explainer across accounts', () => {
  const OTHER_USER: User = {
    ...USER,
    id: '550e8400-e29b-41d4-a716-4466554400aa',
    name: 'Grace Hopper',
  };

  function seedQuestionFor(user: User) {
    const client = makeQueryClient();
    client.setQueryData(['practice-question', user.id, user.cefrLevel], PRACTICE_QUESTION);
    return client;
  }

  it('re-reads the stored flag for a new account and never shows one learner the other’s card', async () => {
    // The first learner has not seen the explainer; the second learner's read
    // never settles, so anything on screen for them came from stale state.
    mockPracticeIntro.hasSeenPracticeIntro
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(new Promise<boolean>(() => undefined));
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(
      <PracticeScreen />,
      seedQuestionFor(OTHER_USER),
    );
    expect(await screen.findByText(t('practiceIntro.title'))).toBeTruthy();

    mockAuthValue = makeAuth({ user: OTHER_USER });
    await act(async () => {
      await rerenderScreen(<PracticeScreen />);
    });

    expect(await screen.findByText(t('practice.loadingQuestion'))).toBeTruthy();
    expect(mockPracticeIntro.hasSeenPracticeIntro).toHaveBeenLastCalledWith(OTHER_USER.id);
    expect(screen.queryByText(t('practiceIntro.title'))).toBeNull();
    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.queryByTestId('recorder')).toBeNull();
  });

  it('ignores an explainer read that lands after the learner switched accounts', async () => {
    let settleFirstRead: ((seen: boolean) => void) | undefined;
    mockPracticeIntro.hasSeenPracticeIntro
      .mockReturnValueOnce(
        new Promise<boolean>((resolve) => {
          settleFirstRead = resolve;
        }),
      )
      .mockResolvedValueOnce(false);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(
      <PracticeScreen />,
      seedQuestionFor(OTHER_USER),
    );
    expect(await screen.findByText(t('practice.loadingQuestion'))).toBeTruthy();
    expect(screen.queryByTestId('recorder')).toBeNull();

    mockAuthValue = makeAuth({ user: OTHER_USER });
    await act(async () => {
      await rerenderScreen(<PracticeScreen />);
    });
    expect(await screen.findByText(t('practiceIntro.title'))).toBeTruthy();

    // The first account's read finally resolves with the opposite answer: it
    // belongs to a learner who is no longer here and must be dropped.
    await act(async () => {
      settleFirstRead?.(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(t('practiceIntro.title'))).toBeTruthy();
  });
});

describe('skip word busy state', () => {
  it('reports the skip as busy until it settles, then hands the control back', async () => {
    mockApiFetch
      .mockResolvedValueOnce(PRACTICE_QUESTION)
      .mockResolvedValueOnce(NEXT_PRACTICE_QUESTION);
    let settleSkip: (() => void) | undefined;
    mockSkipWord.mockReturnValue(
      new Promise<void>((resolve) => {
        settleSkip = () => resolve();
      }),
    );
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');
    const idleSkip = () => screen.getByRole('button', { name: t('practice.skipWord') });
    const busySkip = () => screen.getByRole('button', { name: t('practice.skipBusy') });
    const hidden = { includeHiddenElements: true } as const;

    expect(idleSkip().props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(flattenedStyle(idleSkip()).opacity).toBeUndefined();
    expect(screen.queryByTestId('practice-skip-busy-indicator', hidden)).toBeNull();

    await act(async () => {
      await fireEvent.press(idleSkip());
      confirmSkipAlert();
    });
    expect(busySkip().props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(flattenedStyle(busySkip())).toMatchObject({ opacity: 0.5 });
    // The busy label swaps in with a decorative, screen-reader-hidden spinner.
    expect(screen.getByTestId('practice-skip-busy-indicator', hidden)).toBeTruthy();
    expect(screen.getByText(t('practice.skipBusy'))).toBeTruthy();
    expect(screen.queryByText(t('practice.skipWord'))).toBeNull();

    await act(async () => {
      settleSkip?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() =>
      expect(idleSkip().props.accessibilityState).toEqual({ disabled: false, busy: false }),
    );
    expect(flattenedStyle(idleSkip()).opacity).toBeUndefined();
  });

  it('hands the control back after a failed skip and uses the skip fallback copy', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    mockSkipWord.mockRejectedValue(new Error('private network detail'));
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('practice.skipWord') }));
      confirmSkipAlert();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(alertSpy).toHaveBeenCalledWith(t('practice.skipFailedTitle'), t('practice.skipFailed'));
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityState,
    ).toEqual({ disabled: false, busy: false });
  });
});

describe('practice mutation ownership sentinels', () => {
  it('ignores a Recorder lock before the practice screen receives focus ownership', async () => {
    mockDeferFocusSetup = true;
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    mockSetOptions.mockClear();

    await act(async () => recorderProps().onInteractionLockChange?.(true));

    expect(mockSetOptions).not.toHaveBeenCalled();
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: false });
  });

  it('rolls practice cache, lease, owner locks, and navigation into a new account', async () => {
    const firstLease = { owner: 'practice-first-account' } as never;
    const secondLease = { owner: 'practice-second-account' } as never;
    let currentLease: SessionLease = firstLease;
    const captureSessionLease = jest.fn(() => currentLease);
    const isSessionLeaseCurrent = jest.fn((lease: SessionLease) => lease === currentLease);
    mockAuthValue = makeAuth({ captureSessionLease, isSessionLeaseCurrent });

    const client = makeQueryClient();
    client.setQueryDefaults(['practice-question'], { staleTime: Infinity });
    const secondPayload: PracticeQuestionPayload = {
      ...PRACTICE_QUESTION,
      question: {
        ...QUESTION,
        promptWord: 'clarity',
        questionText: 'Explain why clarity matters.',
      },
    };
    client.setQueryData(['practice-question', USER.id, USER.cefrLevel], PRACTICE_QUESTION);
    client.setQueryData(['practice-question', OTHER_USER.id, OTHER_USER.cefrLevel], secondPayload);
    const view = await render(withProviders(<PracticeScreen />, client, 0));
    expect(screen.getByText(QUESTION.questionText)).toBeTruthy();
    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: true });

    currentLease = secondLease;
    mockAuthValue = makeAuth({
      user: OTHER_USER,
      sessionVersion: 1,
      captureSessionLease,
      isSessionLeaseCurrent,
    });
    await view.rerender(withProviders(<PracticeScreen />, client, 0));

    expect(screen.getByText('Explain why clarity matters.')).toBeTruthy();
    expect(screen.queryByText(QUESTION.questionText)).toBeNull();
    expect(captureSessionLease).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: false });

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: true });
    await act(async () => recorderProps().onInteractionLockChange?.(false));
    await fireEvent.press(screen.getByLabelText(t('practice.helpLabel')));
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/practice/help' }),
    );
    expect(isSessionLeaseCurrent).toHaveBeenCalledWith(secondLease);
  });

  it('uses the synchronous practice layout cleanup before passive focus cleanup', async () => {
    mockDeferFocusCleanup = true;
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const view = await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    const callbacks = recorderProps();

    await view.unmount();
    alertSpy.mockClear();
    await act(async () => callbacks.onError('layout cleanup window'));

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('rejects the previous practice Recorder after an answer-mode owner change', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: false });
    const englishCallbacks = recorderProps();
    await act(async () => englishCallbacks.onInteractionLockChange?.(true));
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toEqual({ checked: false, disabled: true });
    mockSetOptions.mockClear();

    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    await rerenderScreen(<PracticeScreen />);
    expect(recorderProps().endpoint).toBe('/practice/attempt/native');
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toMatchObject({ checked: true, disabled: false });
    expect(mockSetOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });
    alertSpy.mockClear();

    await act(async () => {
      englishCallbacks.onError('old English recorder');
      englishCallbacks.onInteractionLockChange?.(true);
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('moves practice navigation subscriptions and lock publication to a new navigation object', async () => {
    const firstNavigation = createNavigationDouble();
    const secondNavigation = createNavigationDouble();
    mockCurrentNavigation = firstNavigation.navigation;
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(firstNavigation.setOptions).toHaveBeenLastCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });

    firstNavigation.setOptions.mockClear();
    mockCurrentNavigation = secondNavigation.navigation;
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    await rerenderScreen(<PracticeScreen />);

    expect(firstNavigation.listeners.size).toBe(0);
    expect(secondNavigation.listeners.size).toBe(1);
    expect(secondNavigation.setOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });

    firstNavigation.setOptions.mockClear();
    secondNavigation.setOptions.mockClear();
    await blurScreen();
    await focusScreen();
    expect(firstNavigation.setOptions).not.toHaveBeenCalled();
    expect(secondNavigation.setOptions).toHaveBeenLastCalledWith({
      headerBackVisible: true,
      gestureEnabled: true,
    });

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(secondNavigation.setOptions).toHaveBeenLastCalledWith({
      headerBackVisible: false,
      gestureEnabled: false,
    });
    expect(dispatchNavigationBeforeRemove(secondNavigation.listeners)).toHaveBeenCalledTimes(1);
    expect(dispatchNavigationBeforeRemove(firstNavigation.listeners)).not.toHaveBeenCalled();
  });

  it('publishes no practice navigation options while an owner reset commits off-focus', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const rerenderScreen = await renderRerenderable(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    await act(async () => recorderProps().onInteractionLockChange?.(true));
    await blurScreen();
    mockSetOptions.mockClear();

    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    await rerenderScreen(<PracticeScreen />);

    expect(mockSetOptions).not.toHaveBeenCalled();
  });

  it('isolates result cancellation and blocks late Recorder work after navigation is claimed', async () => {
    const refetchSpy = trackQueryRefetches();
    const client = makeQueryClient();
    const unrelated = deferred<string>();
    let unrelatedSignal: AbortSignal | undefined;
    const unrelatedRequest = client.fetchQuery({
      queryKey: ['practice-unrelated-sentinel'],
      queryFn: ({ signal }) => {
        unrelatedSignal = signal;
        return unrelated.promise;
      },
    });
    const unrelatedSettled = Promise.allSettled([unrelatedRequest]);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />, client);
    await screen.findByText(QUESTION.questionText);
    const callbacks = recorderProps();

    await act(async () => {
      callbacks.onResult(PASSED_RESULT);
      callbacks.onError('late result error');
      callbacks.onRecoveryUnresolved();
      await Promise.resolve();
    });
    const unrelatedWasAborted = unrelatedSignal?.aborted;
    unrelated.resolve('kept');
    await unrelatedSettled;

    expect(unrelatedWasAborted).toBe(false);
    expect(alertSpy).not.toHaveBeenCalledWith(t('diag.assessFailedTitle'), 'late result error');
    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it.each(['resolve', 'reject'] as const)(
    'releases a practice recovery claim after the same owner %s path settles',
    async (outcome) => {
      const firstRefresh = deferred<unknown>();
      const secondRefresh = deferred<unknown>();
      const refetchSpy = trackQueryRefetches();
      refetchSpy
        .mockImplementationOnce(() => firstRefresh.promise as never)
        .mockImplementationOnce(() => secondRefresh.promise as never);
      mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
      await renderScreen(<PracticeScreen />);
      await screen.findByText(QUESTION.questionText);
      const recover = recorderProps().onRecoveryUnresolved;

      await act(async () => {
        recover();
        await Promise.resolve();
      });
      expect(refetchSpy).toHaveBeenCalledTimes(1);
      await act(async () => {
        if (outcome === 'resolve') firstRefresh.resolve(PRACTICE_QUESTION);
        else firstRefresh.reject(new Error('recovery failed'));
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        recover();
        await Promise.resolve();
      });
      expect(refetchSpy).toHaveBeenCalledTimes(2);
      await act(async () => {
        secondRefresh.resolve(PRACTICE_QUESTION);
        await Promise.resolve();
      });
    },
  );

  it.each(['resolve', 'reject'] as const)(
    'does not let an old practice recovery %s path clear the new owner claim',
    async (outcome) => {
      const oldRefresh = deferred<unknown>();
      const currentRefresh = deferred<unknown>();
      const extraRefresh = deferred<unknown>();
      const refetchSpy = trackQueryRefetches();
      refetchSpy
        .mockImplementationOnce(() => oldRefresh.promise as never)
        .mockImplementationOnce(() => currentRefresh.promise as never)
        .mockImplementation(() => extraRefresh.promise as never);
      const client = makeQueryClient();
      client.setQueryDefaults(['practice-question'], { staleTime: Infinity });
      client.setQueryData(['practice-question', USER.id, USER.cefrLevel], PRACTICE_QUESTION);
      await renderScreen(<PracticeScreen />, client);
      const oldRecover = recorderProps().onRecoveryUnresolved;
      await act(async () => {
        oldRecover();
        await Promise.resolve();
      });

      await act(async () => {
        client.setQueryData(['practice-question', USER.id, USER.cefrLevel], NEXT_PRACTICE_QUESTION);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(screen.getByText(NEXT_QUESTION.questionText)).toBeTruthy();
      const currentRecover = recorderProps().onRecoveryUnresolved;
      await act(async () => {
        currentRecover();
        await Promise.resolve();
      });
      expect(refetchSpy).toHaveBeenCalledTimes(2);

      await act(async () => {
        if (outcome === 'resolve') oldRefresh.resolve(PRACTICE_QUESTION);
        else oldRefresh.reject(new Error('old recovery failed'));
        await Promise.resolve();
        await Promise.resolve();
      });
      await act(async () => {
        currentRecover();
        await Promise.resolve();
      });
      expect(refetchSpy).toHaveBeenCalledTimes(2);
      await act(async () => {
        currentRefresh.resolve(NEXT_PRACTICE_QUESTION);
        await Promise.resolve();
      });
    },
  );

  it('rejects a retained Skip handler after its captured session lease expires', async () => {
    const firstLease = { owner: 'skip-current' } as never;
    let currentLease: SessionLease = firstLease;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => currentLease),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    const retainedSkip = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );

    currentLease = { owner: 'skip-expired' } as never;
    await act(async () => {
      retainedSkip();
      await Promise.resolve();
    });

    expect(mockSkipWord).not.toHaveBeenCalled();
  });

  it('does not refetch a skipped word after ownership expires during the API call', async () => {
    const skipRequest = deferred<void>();
    const refetchSpy = trackQueryRefetches().mockResolvedValue({ isError: false } as never);
    const firstLease = { owner: 'skip-request' } as never;
    let currentLease: SessionLease = firstLease;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => currentLease),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockSkipWord.mockReturnValue(skipRequest.promise);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    const skip = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    await act(async () => {
      skip();
      confirmSkipAlert();
      await Promise.resolve();
    });
    expect(mockSkipWord).toHaveBeenCalledTimes(1);

    currentLease = { owner: 'skip-request-expired' } as never;
    await act(async () => {
      skipRequest.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(refetchSpy).not.toHaveBeenCalled();
  });

  it('suppresses a rejected skip after its lease expires without losing focus', async () => {
    const skipRequest = deferred<void>();
    const firstLease = { owner: 'skip-rejection' } as never;
    let currentLease: SessionLease = firstLease;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => currentLease),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockSkipWord.mockReturnValue(skipRequest.promise);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    const skip = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    await act(async () => {
      skip();
      confirmSkipAlert();
      await Promise.resolve();
    });
    expect(mockSkipWord).toHaveBeenCalledTimes(1);

    currentLease = { owner: 'skip-rejection-expired' } as never;
    alertSpy.mockClear();
    await act(async () => {
      skipRequest.reject(new Error('late skip rejection'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('suppresses a failed post-skip refetch after its lease expires', async () => {
    const refetchRequest = deferred<{ isError: boolean; error: Error }>();
    const refetchSpy = trackQueryRefetches().mockImplementation(
      () => refetchRequest.promise as never,
    );
    const firstLease = { owner: 'skip-refetch' } as never;
    let currentLease: SessionLease = firstLease;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => currentLease),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockSkipWord.mockResolvedValue(undefined);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(QUESTION.questionText);
    const skip = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    await act(async () => {
      skip();
      confirmSkipAlert();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(refetchSpy).toHaveBeenCalledTimes(1);

    currentLease = { owner: 'skip-refetch-expired' } as never;
    alertSpy.mockClear();
    await act(async () => {
      refetchRequest.resolve({ isError: true, error: new Error('late refetch') });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('publishes no old skip finalizer into a replacement account', async () => {
    const skipRequest = deferred<void>();
    mockSkipWord.mockReturnValue(skipRequest.promise);
    const client = makeQueryClient();
    client.setQueryDefaults(['practice-question'], { staleTime: Infinity });
    client.setQueryData(['practice-question', USER.id, USER.cefrLevel], PRACTICE_QUESTION);
    client.setQueryData(
      ['practice-question', OTHER_USER.id, OTHER_USER.cefrLevel],
      NEXT_PRACTICE_QUESTION,
    );
    const view = await render(withProviders(<PracticeScreen />, client, 0));
    const skip = committedPressHandler(
      screen.getByRole('button', { name: t('practice.skipWord') }),
    );
    await act(async () => {
      skip();
      confirmSkipAlert();
      await Promise.resolve();
    });

    mockAuthValue = makeAuth({ user: OTHER_USER, sessionVersion: 2 });
    await view.rerender(withProviders(<PracticeScreen />, client, 0));
    mockSetOptions.mockClear();
    await act(async () => {
      skipRequest.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetOptions).not.toHaveBeenCalled();
  });
});

describe('practice feedback mutation ownership sentinels', () => {
  it('recaptures the session lease for a replacement feedback card in the same mount', async () => {
    const firstLease = { owner: 'feedback-first-card' } as never;
    const secondLease = { owner: 'feedback-second-card' } as never;
    let currentLease: SessionLease = firstLease;
    const captureSessionLease = jest.fn(() => currentLease);
    const isSessionLeaseCurrent = jest.fn((lease: SessionLease) => lease === currentLease);
    mockAuthValue = makeAuth({ captureSessionLease, isSessionLeaseCurrent });
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);
    expect(screen.getByText(t('feedback.passedTitle'))).toBeTruthy();
    expect(captureSessionLease).toHaveBeenCalledTimes(1);

    currentLease = secondLease;
    mockAuthValue = makeAuth({
      sessionVersion: 2,
      captureSessionLease,
      isSessionLeaseCurrent,
    });
    const replacementResult: AttemptResult = {
      ...PASSED_RESULT,
      mastered: true,
      score: 88,
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: NEXT_QUESTION.id, result: replacementResult },
    });
    await rerenderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.masteredTitle'))).toBeTruthy();
    expect(captureSessionLease).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(isSessionLeaseCurrent).toHaveBeenCalledWith(secondLease);
  });

  it('rejects feedback actions before passive focus ownership is granted', async () => {
    mockDeferFocusSetup = true;
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('uses feedback layout cleanup before a deferred passive focus cleanup', async () => {
    mockDeferFocusCleanup = true;
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const view = await renderScreen(<FeedbackScreen />);
    const retainedNext = committedPressHandler(
      screen.getByRole('button', { name: t('feedback.nextQuestion') }),
    );

    await view.unmount();
    await act(async () => retainedNext());

    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('rejects a retained feedback action after the card loses focus', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);
    const retainedNext = committedPressHandler(
      screen.getByRole('button', { name: t('feedback.nextQuestion') }),
    );
    await blurScreen();

    await act(async () => retainedNext());

    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('cancels only the current practice question when feedback advances', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const client = makeQueryClient();
    const unrelated = deferred<string>();
    let unrelatedSignal: AbortSignal | undefined;
    const unrelatedRequest = client.fetchQuery({
      queryKey: ['feedback-unrelated-sentinel'],
      queryFn: ({ signal }) => {
        unrelatedSignal = signal;
        return unrelated.promise;
      },
    });
    const unrelatedSettled = Promise.allSettled([unrelatedRequest]);
    await renderScreen(<FeedbackScreen />, client);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    const unrelatedWasAborted = unrelatedSignal?.aborted;
    unrelated.resolve('kept');
    await unrelatedSettled;

    expect(unrelatedWasAborted).toBe(false);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });
});

describe('practice home presentation', () => {
  async function renderLoadedHome(payload: PracticeQuestionPayload = PRACTICE_QUESTION) {
    mockApiFetch.mockResolvedValue(payload);
    await renderScreen(<PracticeScreen />);
    await screen.findByText(payload.question.questionText);
  }

  const CARD_LABEL = {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
  };

  const CENTERED_STATE = {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const MUTED_BODY = {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  };

  it('lays the screen out on the shared page tokens', async () => {
    await renderLoadedHome({ ...PRACTICE_QUESTION, attemptsUsed: 1, attemptsLeft: 2 });

    expect(screenContainerStyle()).toEqual({ flex: 1, backgroundColor: colors.background });
    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('practice.greeting', { name: USER.name })))).toEqual({
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      color: colors.text,
      marginBottom: spacing.sm,
    });
    // Recorder phases grow downward from one stable top edge; the ScrollView
    // owns any extra height so review and upload actions stay reachable.
    expect(recorderAreaStyle()).toEqual({
      width: '100%',
      alignSelf: 'stretch',
      justifyContent: 'flex-start',
    });
  });

  it('renders the question card, its labels, and the progress lines from the tokens', async () => {
    await renderLoadedHome();

    const promptWord = screen.getByText('courage');
    expect(flattenedStyle(promptWord)).toEqual({
      marginTop: spacing.xs,
      fontSize: 34,
      lineHeight: 41,
      fontWeight: '800',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(promptWord))).toEqual({
      marginTop: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    });
    expect(flattenedStyle(screen.getByText(QUESTION.questionText))).toEqual({
      marginTop: spacing.xs,
      fontSize: 18,
      lineHeight: 26,
      color: colors.text,
    });
    // Both halves of the card are named for the learner.
    expect(flattenedStyle(screen.getByText(t('label.word')))).toEqual(CARD_LABEL);
    expect(flattenedStyle(screen.getByText(t('label.question')))).toEqual({
      ...CARD_LABEL,
      marginTop: 0,
      flexShrink: 1,
    });
    expect(flattenedStyle(screen.getByText(t('cefr.B1')))).toEqual({
      fontSize: 13,
      color: colors.muted,
      marginBottom: spacing.xs,
    });
    expect(
      flattenedStyle(
        screen.getByText(
          t('practice.progressLine', { mastered: 2, total: 8 }) +
            t('practice.progressLearning', { count: 1 }),
        ),
      ),
    ).toEqual({ fontSize: 13, color: colors.muted, marginBottom: spacing.xs });
  });

  it('tints the badge row for a brand-new word', async () => {
    await renderLoadedHome();

    const levelBadgeText = screen.getByText('B1');
    expect(flattenedStyle(levelBadgeText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(levelBadgeText))).toEqual({
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
      marginBottom: spacing.xs,
    });
    expect(flattenedStyle(parentOf(parentOf(levelBadgeText)))).toEqual({
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    });

    const newBadgeText = screen.getByText(t('practice.newWord'));
    expect(flattenedStyle(newBadgeText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.onSuccess,
    });
    expect(flattenedStyle(parentOf(newBadgeText))).toEqual({
      backgroundColor: colors.success,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
    });
  });

  it('swaps the badge to the warning palette for a word under review', async () => {
    await renderLoadedHome({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      progress: { masteredCount: 4, learningCount: 0, totalAtLevel: 12 },
    });

    const revisionText = screen.getByText(t('practice.revision'));
    expect(flattenedStyle(revisionText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.onWarning,
    });
    expect(flattenedStyle(parentOf(revisionText))).toEqual({
      backgroundColor: colors.warning,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
    });
  });

  it('renders the attempt chip in the primary chip palette', async () => {
    mockPracticeFlow = makePracticeFlow({
      attemptStatus: { questionId: QUESTION.id, cycleId: CYCLE_ID, attemptsLeft: 2 },
    });
    await renderLoadedHome({ ...PRACTICE_QUESTION, attemptsUsed: 1, attemptsLeft: 2 });

    const chipText = screen.getByText(
      t('practice.attemptChip', { current: 2, max: PRACTICE_MAX_ATTEMPTS }),
    );
    expect(flattenedStyle(chipText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
    });
    expect(flattenedStyle(parentOf(chipText))).toEqual({
      backgroundColor: colors.primaryLight,
      borderRadius: radii.badge,
      paddingVertical: 3,
      paddingHorizontal: 10,
    });
  });

  it('renders the first-visit explainer as a primary-tinted card', async () => {
    mockPracticeIntro.hasSeenPracticeIntro.mockResolvedValue(false);
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);

    const title = await screen.findByText(t('practiceIntro.title'));
    expect(flattenedStyle(title)).toEqual({
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(parentOf(title))).toEqual({
      marginBottom: spacing.md,
      backgroundColor: colors.primaryLight,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practiceIntro.silence')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 15,
      lineHeight: 21,
      color: colors.text,
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('practiceIntro.dismiss') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });

  it('renders the help affordance as an elevated primary circle', async () => {
    await renderLoadedHome();

    expect(flattenedStyle(screen.getByLabelText(t('practice.helpLabel')))).toEqual({
      width: layout.minimumTarget,
      height: layout.minimumTarget,
      borderRadius: radii.pill,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    });
    // The "?" text glyph is retired: the circle now carries the themed help
    // icon, hidden from screen readers because the button owns the label.
    expect(screen.queryByText('?')).toBeNull();
    expect(screen.getByLabelText(t('practice.helpLabel')).children).not.toHaveLength(0);

    const questionLabel = screen.getByText(t('label.question'));
    const help = screen.getByLabelText(t('practice.helpLabel'));
    const questionHeadingRow = parentOf(questionLabel);
    const questionCard = parentOf(questionHeadingRow);
    expect(parentOf(help)).toBe(questionHeadingRow);
    expect(parentOf(screen.getByText(QUESTION.questionText))).toBe(questionCard);
    expect(flattenedStyle(questionHeadingRow)).toEqual({
      marginTop: spacing.md,
      minHeight: layout.minimumTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    });
    expect(questionHeadingRow.children.indexOf(questionLabel)).toBeLessThan(
      questionHeadingRow.children.indexOf(help),
    );
    expect(questionCard.children.indexOf(questionHeadingRow)).toBeLessThan(
      questionCard.children.indexOf(screen.getByText(QUESTION.questionText)),
    );
  });

  it('deepens the help-button shadow in the dark palette', async () => {
    asMock(useColorScheme).mockReturnValue('dark');
    await renderLoadedHome();

    // The raised elevation preset's cast strengthens on a dark surface.
    expect(flattenedStyle(screen.getByLabelText(t('practice.helpLabel')))).toMatchObject({
      backgroundColor: darkColors.primary,
      shadowColor: darkColors.shadow,
      shadowOpacity: 0.5,
    });
    expect(screenContainerStyle()).toMatchObject({ backgroundColor: darkColors.background });
  });

  it('keeps each badge ink paired with its own fill in the dark palette', async () => {
    // The light palette paints every on-fill ink white, so only the dark
    // palette can show whether the review badge really takes its own ink.
    expect(darkColors.onSuccess).not.toBe(darkColors.onWarning);
    asMock(useColorScheme).mockReturnValue('dark');
    await renderLoadedHome();

    const newBadgeText = screen.getByText(t('practice.newWord'));
    expect(flattenedStyle(newBadgeText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: darkColors.onSuccess,
    });
    expect(flattenedStyle(parentOf(newBadgeText))).toMatchObject({
      backgroundColor: darkColors.success,
    });

    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      progress: { masteredCount: 4, learningCount: 0, totalAtLevel: 12 },
    });
    await renderScreen(<PracticeScreen />);
    const revisionText = await screen.findByText(t('practice.revision'));
    expect(flattenedStyle(revisionText)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: darkColors.onWarning,
    });
    expect(flattenedStyle(parentOf(revisionText))).toMatchObject({
      backgroundColor: darkColors.warning,
    });
  });

  it('keeps the switch, skip, and wrap-safe footer controls on the token scale', async () => {
    await renderLoadedHome();

    const toggle = screen.getByRole('switch', { name: t('practice.answerInMyLanguage') });
    expect(flattenedStyle(toggle)).toEqual({
      alignSelf: 'center',
      marginTop: spacing.md,
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.ml,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.primary,
    });
    expect(flattenedStyle(screen.getByText(t('practice.answerInMyLanguage')))).toEqual({
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    });

    expect(flattenedStyle(screen.getByRole('button', { name: t('practice.skipWord') }))).toEqual({
      alignSelf: 'center',
      minHeight: layout.minimumTarget,
      justifyContent: 'center',
      paddingHorizontal: spacing.ml,
    });
    expect(flattenedStyle(screen.getByText(t('practice.skipWord')))).toEqual({
      fontSize: 14,
      color: colors.muted,
      textDecorationLine: 'underline',
    });

    // Account exits moved to the tab bar and Settings: the learning surface
    // ends at the skip action with no footer row.
    expect(screen.queryByRole('button', { name: t('settings.retake') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('common.logOut') })).toBeNull();
  });

  it('explains every locked control while the recorder holds a take', async () => {
    await renderLoadedHome();

    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityHint,
    ).toBeUndefined();
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityHint,
    ).toBeUndefined();

    await act(async () => recorderProps().onInteractionLockChange?.(true));

    const hint = t('hint.finishRecordingFirst');
    expect(screen.getByLabelText(t('practice.helpLabel')).props.accessibilityHint).toBe(hint);
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityHint,
    ).toBe(hint);
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityHint,
    ).toBe(hint);
    expect(
      flattenedStyle(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') })),
    ).toMatchObject({ opacity: 0.5 });

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(screen.getByLabelText(t('practice.helpLabel')).props.accessibilityHint).toBeUndefined();
    expect(
      screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }).props
        .accessibilityHint,
    ).toBeUndefined();
    expect(
      screen.getByRole('button', { name: t('practice.skipWord') }).props.accessibilityHint,
    ).toBeUndefined();
    expect(
      flattenedStyle(screen.getByRole('switch', { name: t('practice.answerInMyLanguage') }))
        .opacity,
    ).toBeUndefined();
  });

  it('lays out the question skeleton and announces the wait politely', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<PracticeScreen />);

    const hidden = { includeHiddenElements: true } as const;
    // The hidden live-region line keeps the wait announced without sight.
    const loading = screen.getByText(t('practice.loadingQuestion'), hidden);
    expect(loading.props.accessibilityLiveRegion).toBe('polite');
    // The skeleton mirrors the served card: badge row, hero word, lines.
    expect(screen.getByTestId('practice-question-skeleton', hidden)).toBeTruthy();
    expect(screen.getByTestId('practice-skeleton-word', hidden)).toBeTruthy();
    expect(screen.queryByTestId('recorder')).toBeNull();
  });

  it('centres the load failure and spaces its retry action', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<PracticeScreen />);

    const title = await screen.findByRole('header', { name: t('practice.loadFailedTitle') });
    expect(flattenedStyle(title)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    });
    expect(flattenedStyle(parentOf(title))).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });

  it('renders the inline wait notice as a danger-tinted card', async () => {
    await renderLoadedHome();
    const wait = `${t('error.dailyLimit')} ${t('wait.hours', { count: 7 })}`;
    await act(async () => recorderProps().onRateLimited?.(wait));

    const notice = screen.getByRole('alert');
    expect(flattenedStyle(notice)).toEqual({
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    });
    expect(flattenedStyle(parentOf(notice))).toEqual({
      marginTop: spacing.md,
      backgroundColor: colors.dangerLight,
      borderColor: colors.danger,
      borderWidth: 1,
      borderRadius: radii.input,
      padding: spacing.md,
    });
  });
});

describe('practice help presentation', () => {
  async function renderLoadedHelp() {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);
    await screen.findByText(t('label.word'));
  }

  const CENTERED_STATE = {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  };

  const MUTED_BODY = {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  };

  it('lays the help sheet out on the shared page tokens', async () => {
    await renderLoadedHelp();

    expect(screenContainerStyle()).toEqual({ flex: 1, backgroundColor: colors.background });
    expect(scrollContentStyle()).toEqual({
      padding: layout.screenPadding,
      paddingBottom: spacing.xxl,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    const barContent = parentOf(screen.getByRole('button', { name: t('help.startPractice') }));
    expect(flattenedStyle(barContent)).toEqual({
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(parentOf(barContent))).toEqual({
      padding: spacing.ml,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 16,
    });
  });

  it('renders each section as a card with a label, English, and native text', async () => {
    await renderLoadedHelp();

    const sectionLabel = screen.getByText(t('label.word'));
    expect(flattenedStyle(sectionLabel)).toEqual({
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: spacing.sm,
    });
    expect(flattenedStyle(parentOf(sectionLabel))).toEqual({
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    });
    expect(flattenedStyle(screen.getByText('courage'))).toEqual({
      // type.headline
      fontSize: 20,
      fontWeight: '800',
      color: colors.primary,
    });
    expect(flattenedStyle(screen.getByText('Describe a time you showed courage.'))).toEqual({
      fontSize: 17,
      lineHeight: 24,
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText('ధైర్యం'))).toEqual({
      marginTop: 6,
      fontSize: 16,
      lineHeight: 23,
      color: colors.muted,
    });
  });

  it('separates each example with a rule and a numbered accent line', async () => {
    await renderLoadedHelp();

    const exampleNumber = screen.getByText(t('help.exampleNumber', { number: 1 }));
    expect(flattenedStyle(exampleNumber)).toEqual({
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.xs,
    });
    expect(flattenedStyle(parentOf(exampleNumber))).toEqual({
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.md,
      marginTop: spacing.md,
    });
  });

  it('centres the loading, failure, and broken-link states', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<HelpScreen />);

    const loading = screen.getByText(t('help.loading'));
    expect(flattenedStyle(loading)).toEqual(MUTED_BODY);
    expect(scrollContentStyle()).toEqual(CENTERED_STATE);

    mockApiFetch.mockReset();
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<HelpScreen />);

    const failureTitle = await screen.findByRole('header', { name: t('help.loadFailedTitle') });
    expect(flattenedStyle(failureTitle)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    });
    expect(scrollContentStyle()).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') })),
    ).toMatchObject({ marginTop: spacing.lg });

    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<HelpScreen />);

    const brokenLinkTitle = screen.getByRole('header', { name: t('help.invalidLinkTitle') });
    expect(brokenLinkTitle).toBeTruthy();
    expect(scrollContentStyle()).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('help.invalidLinkBody')))).toEqual(MUTED_BODY);
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.backToPractice') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });
});

describe('feedback outcome wiring', () => {
  const NATIVE_RESULT: NativeAttemptResult = {
    mode: 'native',
    nativeLanguage: 'te',
    cycleId: CYCLE_ID,
    understood: true,
    attemptNo: 1,
    attemptsLeft: 2,
    transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
    translatedTranscript: 'She was brave at her job.',
    modelAnswer: 'She showed courage at work.',
    feedback: 'You understood the question.',
  };

  const NO_SPEECH_RESULT: AttemptResult = {
    cycleId: CYCLE_ID,
    passed: false,
    mastered: false,
    noSpeech: true,
    attemptNo: 1,
    attemptsLeft: 3,
    score: 0,
    transcript: '',
    feedback: 'We could not detect any speech.',
  };

  const RETRY_RESULT: AttemptResult = {
    cycleId: CYCLE_ID,
    passed: false,
    mastered: false,
    attemptNo: 1,
    attemptsLeft: 2,
    score: 40,
    transcript: 'I tried.',
    feedback: 'Keep going.',
  };

  it.each([
    ['hi', 'hi-IN'],
    ['es', 'es-ES'],
    ['zh', 'zh-Hans'],
  ] as const)('reads a %s learner’s own answer back in their language', async (language, tag) => {
    mockAuthValue = makeAuth({ user: { ...USER, nativeLanguage: 'te' } });
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: { ...NATIVE_RESULT, nativeLanguage: language },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”').props.accessibilityLanguage).toBe(tag);
  });

  it('reads an English answer back as English, whatever the learner speaks', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    // USER speaks Telugu, but this transcript is the learner's English.
    expect(screen.getByText('“I enjoy reading.”').props.accessibilityLanguage).toBe('en-US');
  });

  it('never celebrates a promotion that arrives with a failed attempt', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 3,
          attemptsLeft: 0,
          score: 30,
          transcript: 'last try',
          feedback: 'Regular feedback.',
          levelUp: { from: 'B1', to: 'B2' },
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText(t('feedback.finalTitle'))).toBeTruthy();
    expect(screen.queryByText(t('levelUp.title'))).toBeNull();
    expect(screen.queryByText(t('levelUp.body', { level: 'B2' }))).toBeNull();
    expect(screen.queryByText(t('levelUp.progress', { from: 'B1', to: 'B2' }))).toBeNull();
  });

  it('keeps the model English answer hidden when the native answer was silence', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          mode: 'native',
          nativeLanguage: 'te',
          cycleId: CYCLE_ID,
          understood: false,
          attemptNo: 1,
          attemptsLeft: 3,
          noSpeech: true,
          transcript: '',
          translatedTranscript: '',
          modelAnswer: '',
          feedback: 'We could not detect any speech.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    // Nothing was said, so there is nothing to translate back: showing the
    // answer here would hand it over for free.
    expect(screen.getByText(t('feedback.noSpeechTitle'))).toBeTruthy();
    expect(screen.queryByText('She showed courage at work.')).toBeNull();
  });

  it('does not open help for a card that has no question behind it', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: '', result: NO_SPEECH_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.seeHelp') }));

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });

  it('celebrates the outcome the card is showing now, not the one it mounted with', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 40,
          transcript: 'I tried.',
          feedback: 'Keep going.',
        },
      },
    });
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);
    expect(jest.mocked(Haptics.notificationAsync)).not.toHaveBeenCalled();

    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: { ...PASSED_RESULT, mastered: true, score: 88 },
      },
    });
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });

    expect(screen.getByText(t('feedback.masteredTitle'))).toBeTruthy();
    expect(jest.mocked(Haptics.notificationAsync)).toHaveBeenCalledWith('success');
  });

  it('rejects a queued action from an outcome card that has been replaced', async () => {
    const firstFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: RETRY_RESULT },
    });
    mockPracticeFlow = firstFlow;
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);
    const staleRetry = committedPressHandler(
      screen.getByRole('button', { name: t('common.tryAgain') }),
    );

    const secondFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    mockPracticeFlow = secondFlow;
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });
    await act(async () => {
      staleRetry();
    });

    expect(firstFlow.clearFeedback).not.toHaveBeenCalled();
    expect(secondFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(secondFlow.clearFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('re-arms the one-shot action guard when a new outcome replaces an acted card', async () => {
    const firstFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: RETRY_RESULT },
    });
    mockPracticeFlow = firstFlow;
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);
    await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(firstFlow.clearFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.back).not.toHaveBeenCalled();

    const secondFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    mockPracticeFlow = secondFlow;
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    expect(secondFlow.clearFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('treats a changed question id as a new exact card even when the result object is reused', async () => {
    const firstFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    mockPracticeFlow = firstFlow;
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);
    const staleNext = committedPressHandler(
      screen.getByRole('button', { name: t('feedback.nextQuestion') }),
    );

    const secondFlow = makePracticeFlow({
      feedback: { questionId: NEXT_QUESTION.id, result: PASSED_RESULT },
    });
    mockPracticeFlow = secondFlow;
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });
    await act(async () => {
      staleNext();
    });

    expect(firstFlow.clearFeedback).not.toHaveBeenCalled();
    expect(secondFlow.clearFeedback).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(secondFlow.clearFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('re-arms an acted card when only its question identity changes', async () => {
    const firstFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    mockPracticeFlow = firstFlow;
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />);
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(firstFlow.clearFeedback).toHaveBeenCalledTimes(1);

    const secondFlow = makePracticeFlow({
      feedback: { questionId: NEXT_QUESTION.id, result: PASSED_RESULT },
    });
    mockPracticeFlow = secondFlow;
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });
    await fireEvent.press(screen.getByRole('button', { name: t('feedback.nextQuestion') }));

    expect(secondFlow.clearFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledTimes(2);
  });

  it('marks home stats stale when a scored outcome replaces a native one', async () => {
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: NATIVE_RESULT },
    });
    const rerenderScreen = await renderRerenderable(<FeedbackScreen />, queryClient);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });

    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await act(async () => {
      await rerenderScreen(<FeedbackScreen />);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['practice-history'] });
  });
});

describe('practice feedback presentation', () => {
  const SUBTITLE = {
    marginTop: spacing.sm,
    fontSize: 15,
    // On-tint ink: plain muted misses 4.5:1 on the outcome panels' tinted fills.
    color: colors.mutedTint,
    textAlign: 'center',
  };

  it('lays the feedback card out on the shared page tokens', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screenContainerStyle()).toEqual({ flex: 1, backgroundColor: colors.background });
    expect(scrollContentStyle()).toEqual({
      padding: layout.screenPadding,
      alignItems: 'center',
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });

    const header = screen.getByRole('header', { name: t('feedback.passedTitle') });
    expect(flattenedStyle(header)).toEqual({
      marginTop: spacing.md,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      textAlign: 'center',
      color: colors.success,
    });
    // A passed outcome sits on the success-tinted panel.
    expect(flattenedStyle(parentOf(header))).toEqual({
      alignSelf: 'stretch',
      alignItems: 'center',
      backgroundColor: colors.successLight,
      borderRadius: radii.card,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      overflow: 'hidden',
    });
    expect(
      flattenedStyle(screen.getByTestId('feedback-outcome-badge', { includeHiddenElements: true })),
    ).toEqual({
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(
      flattenedStyle(screen.getByText(t('feedback.passedBody', { score: PRACTICE_MASTER_SCORE }))),
    ).toEqual(SUBTITLE);
    expect(flattenedStyle(screen.getByText('72'))).toMatchObject({
      fontWeight: '800',
      color: colors.success,
    });
    expect(
      flattenedStyle(
        screen.getByText(
          t('feedback.scoreMeaning', {
            pass: PRACTICE_PASS_SCORE,
            master: PRACTICE_MASTER_SCORE,
          }),
        ),
      ),
    ).toEqual({
      marginTop: 2,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '600',
      color: colors.muted,
      textAlign: 'center',
    });
  });

  it('renders the transcript and feedback card from the tokens', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    const cardLabel = screen.getByText(t('feedback.weHeard'));
    expect(flattenedStyle(cardLabel)).toEqual({
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    });
    expect(flattenedStyle(parentOf(cardLabel))).toEqual({
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.input,
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary,
    });
    // The learner's own words are prominent and selectable.
    expect(flattenedStyle(screen.getByText('“I enjoy reading.”'))).toEqual({
      marginTop: spacing.sm,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 27,
      color: colors.text,
    });
    expect(screen.getByText('“I enjoy reading.”').props.selectable).toBe(true);
    expect(flattenedStyle(screen.getByText('Nice work.'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 23,
      color: colors.text,
    });
    const barContent = parentOf(screen.getByRole('button', { name: t('feedback.nextQuestion') }));
    expect(flattenedStyle(barContent)).toEqual({
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(parentOf(barContent))).toEqual({
      padding: spacing.ml,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 16,
    });
  });

  it('accents the model English answer under the native verdict', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          mode: 'native',
          nativeLanguage: 'te',
          cycleId: CYCLE_ID,
          understood: true,
          attemptNo: 1,
          attemptsLeft: 2,
          transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
          translatedTranscript: 'She was brave at her job.',
          modelAnswer: 'She showed courage at work.',
          feedback: 'You understood the question.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(flattenedStyle(screen.getByText('She showed courage at work.'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 23,
      color: colors.primary,
      fontWeight: '600',
    });
    expect(flattenedStyle(screen.getByText(t('feedback.nativeUnderstoodBody')))).toEqual(SUBTITLE);
  });

  it('stacks the two silence actions in a spaced column', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          noSpeech: true,
          attemptNo: 1,
          attemptsLeft: 3,
          score: 0,
          transcript: '',
          feedback: 'We could not detect any speech.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    const column = parentOf(screen.getByRole('button', { name: t('common.tryAgain') }));
    expect(flattenedStyle(column)).toEqual({ alignSelf: 'stretch', gap: spacing.sm });
    const barContent = parentOf(column);
    expect(flattenedStyle(barContent)).toEqual({
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
    });
    expect(flattenedStyle(parentOf(barContent))).toEqual({
      padding: spacing.ml,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingBottom: 16,
    });
  });

  it('centres the empty-feedback state and spaces its way out', async () => {
    await renderScreen(<FeedbackScreen />);

    const title = screen.getByRole('header', { name: t('feedback.noResultTitle') });
    expect(title).toBeTruthy();
    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.background,
    });
    // The fallback headline renders the base title style with no inline
    // variant ink; without a base color it is invisible on a dark background.
    expect(flattenedStyle(title)).toMatchObject({
      fontSize: 24,
      lineHeight: 30,
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText(t('feedback.noResultBody')))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 23,
      color: colors.text,
    });
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('common.backToPractice') })),
    ).toMatchObject({ marginTop: spacing.lg });
  });
});
