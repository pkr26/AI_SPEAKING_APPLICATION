import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
  QueryObserver,
} from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { AccessibilityInfo, Alert, BackHandler, ScrollView, StyleSheet } from 'react-native';

import DiagnosticScreen from '../src/app/diagnostic';
import type { RecorderResultMetadata } from '../src/components/Recorder';
import { ApiError, apiAcknowledgeDiagnostic, apiFetch, userMessageForError } from '../src/lib/api';
import type { DiagnosticFeedbackReplay } from '../src/lib/assessment-replay-provider';
import { LogoutCleanupError, type SessionLease, type useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { acknowledgePendingAssessmentFeedback } from '../src/lib/pending-assessment';
import { colors, layout, radii, spacing } from '../src/lib/theme';
import {
  parseDiagnosticAnswerResult,
  type DiagnosticAnswerResult,
  type Question,
  type User,
} from '../src/lib/types';

// English copy resolved from the typed catalog: no I18nProvider is mounted
// under jest, so the screen's useT() falls back to 'en'.
const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translateFor('en', key, params);

// ----- expo-router mock -----

// Focus is simulated by invoking the effect on mount and its cleanup on
// unmount, re-running when the callback identity changes (as expo-router does
// while a screen stays focused).
interface MockFocusRegistration {
  callback: () => void | (() => void);
  cleanup: (() => void) | null;
}

const mockFocusRegistrations: MockFocusRegistration[] = [];

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
    },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const registration = { callback, cleanup: null as (() => void) | null };
        mockFocusRegistrations.push(registration);
        const cleanup = callback();
        registration.cleanup = typeof cleanup === 'function' ? cleanup : null;
        return () => {
          registration.cleanup?.();
          const index = mockFocusRegistrations.indexOf(registration);
          if (index >= 0) mockFocusRegistrations.splice(index, 1);
        };
      }, [callback]);
    },
  };
});

// ----- Recorder stub (captures props; internals tested elsewhere) -----

interface CapturedRecorderProps {
  ownerId: string;
  questionId: string;
  disabled?: boolean;
  isStartBlocked?: () => boolean;
  endpoint: string;
  parseResult: (data: unknown) => DiagnosticAnswerResult;
  onResult: (data: DiagnosticAnswerResult, metadata?: RecorderResultMetadata) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onExitLockChange?: (locked: boolean) => void;
  onExpandedControlsLayout?: () => void;
}

let mockRecorderProps: CapturedRecorderProps | null = null;
const mockRecorderPublications: CapturedRecorderProps[] = [];
const mockScrollToExpandedRecorderControls = jest.fn();

interface MockRecorderProps extends Omit<CapturedRecorderProps, 'onResult'> {
  onResult?: (data: DiagnosticAnswerResult) => void;
  onResultWithMetadata?: (data: DiagnosticAnswerResult, metadata: RecorderResultMetadata) => void;
}

function MockRecorder(props: MockRecorderProps) {
  React.useLayoutEffect(() => {
    const captured: CapturedRecorderProps = {
      ...props,
      onResult: (data, metadata) => {
        if (props.onResultWithMetadata) {
          props.onResultWithMetadata(data, metadata as RecorderResultMetadata);
        } else {
          props.onResult?.(data);
        }
      },
    };
    mockRecorderPublications.push(captured);
    mockRecorderProps = captured;
    return () => {
      if (mockRecorderProps === captured) mockRecorderProps = null;
    };
  }, [props]);
  return null;
}

jest.mock('../src/components/Recorder', () => ({
  __esModule: true,
  default: MockRecorder,
  scrollToExpandedRecorderControls: (...args: unknown[]) =>
    mockScrollToExpandedRecorderControls(...args),
}));

// ----- auth mock -----

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: null,
  diagnosticCompleted: false,
};

const OTHER_USER: User = {
  ...USER,
  id: '550e8400-e29b-41d4-a716-446655440010',
  name: 'Grace Hopper',
  email: 'grace@example.com',
};

let mockAuthValue: AuthValue;
let mockAssessmentReplayValue: {
  diagnosticReplay: DiagnosticFeedbackReplay | null;
  clearDiagnosticReplay: jest.Mock;
};

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

jest.mock('../src/lib/assessment-replay-provider', () => ({
  useAssessmentReplay: () => mockAssessmentReplayValue,
}));

// ----- api mock -----

jest.mock('../src/lib/api', () => {
  const actual = jest.requireActual<typeof import('../src/lib/api')>('../src/lib/api');
  return {
    ...actual,
    apiAcknowledgeDiagnostic: jest.fn(),
    apiFetch: jest.fn(),
    userMessageForError: jest.fn(actual.userMessageForError),
  };
});

jest.mock('../src/lib/pending-assessment', () => ({
  ...jest.requireActual('../src/lib/pending-assessment'),
  acknowledgePendingAssessmentFeedback: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;
const mockAcknowledgeDiagnostic = jest.mocked(apiAcknowledgeDiagnostic);
const mockUserMessageForError = jest.mocked(userMessageForError);
const mockAcknowledgePendingFeedback = jest.mocked(acknowledgePendingAssessmentFeedback);
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
  navigate: jest.Mock;
  replace: jest.Mock;
};

// ----- fixtures -----

const QUESTION_1: Question = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  cefrLevel: 'B1',
  promptWord: 'courage',
  questionText: 'Describe a time you showed courage.',
};

const QUESTION_2: Question = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  cefrLevel: 'B1',
  promptWord: 'journey',
  questionText: 'Tell me about a memorable journey.',
};

const DIAGNOSTIC_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440099';

const ANSWER_1 = {
  attemptNo: 1,
  promptWord: QUESTION_1.promptWord,
  questionText: QUESTION_1.questionText,
  transcript: 'A durable answer.',
  score: 88,
  passed: true,
  feedback: 'Durable feedback.',
};

function nextPayload(question: Question, asked: number) {
  return {
    done: false,
    question,
    progress: { asked, maxQuestions: 3 },
  };
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

// ----- helpers -----

let alertSpy: jest.SpyInstance;
let backHandlers: (() => boolean)[];
let backSubscriptionRemove: jest.Mock;
let diagnosticRenderSentinelAttempted = false;
let diagnosticRenderSentinelPassed = false;

function pressHardwareBack(): boolean {
  if (backHandlers.length === 0) throw new Error('No hardware back handler registered');
  return backHandlers[backHandlers.length - 1]();
}

const queryClients: QueryClient[] = [];

function makeQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(queryClient);
  return queryClient;
}

async function renderScreen(queryClient = makeQueryClient()) {
  const tree = () => (
    <QueryClientProvider client={queryClient}>
      <DiagnosticScreen />
    </QueryClientProvider>
  );
  const rendered = await render(tree());
  return {
    ...rendered,
    queryClient,
    rerenderScreen: () => rendered.rerender(tree()),
  };
}

function recorderProps(): CapturedRecorderProps {
  expect(mockRecorderProps).not.toBeNull();
  return mockRecorderProps!;
}

/** A fresh test (asked === 0) opens on the one-shot intro card; press Start. */
async function startFreshTest() {
  const start = await screen.findByRole('button', { name: t('diag.introStart') });
  await fireEvent.press(start);
  // These are intentionally synchronous postconditions. Conditional-render
  // mutants that pin the intro or result branch must fail here instead of
  // leaving every owning test to exhaust an async element lookup.
  expect(screen.queryByRole('button', { name: t('diag.introStart') })).toBeNull();
  expect(screen.queryByText(t('diag.introTitle'))).toBeNull();
  expect(mockRecorderProps).not.toBeNull();
}

type SemanticStyle = Record<string, unknown>;

function flattenedStyle(node: TestInstance): SemanticStyle {
  return StyleSheet.flatten(node.props.style) ?? {};
}

/** The host view a control is laid out in (card, account row, level badge). */
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

function scrollContentStyle(): SemanticStyle {
  return StyleSheet.flatten(scrollView().props.contentContainerStyle) ?? {};
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

function capturedPressHandler(accessibilityLabel: string): () => unknown {
  type PressFiber = {
    memoizedProps?: { onPress?: () => unknown };
    return: PressFiber | null;
  };
  let fiber = screen.getByRole('button', {
    name: accessibilityLabel,
  }).unstable_fiber as unknown as PressFiber | null;
  while (fiber) {
    const onPress = fiber.memoizedProps?.onPress;
    if (typeof onPress === 'function') return onPress;
    fiber = fiber.return;
  }
  throw new Error(`Pressable "${accessibilityLabel}" not found`);
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

beforeEach(() => {
  onlineManager.setOnline(true);
  jest.clearAllMocks();
  mockApiFetch.mockReset();
  mockAcknowledgeDiagnostic.mockReset().mockResolvedValue(undefined);
  mockAcknowledgePendingFeedback.mockReset().mockResolvedValue(true);
  mockRecorderProps = null;
  mockRecorderPublications.length = 0;
  mockAuthValue = makeAuth();
  mockAssessmentReplayValue = {
    diagnosticReplay: null,
    clearDiagnosticReplay: jest.fn(),
  };
  mockFocusRegistrations.length = 0;
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  backHandlers = [];
  backSubscriptionRemove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return { remove: backSubscriptionRemove };
  });
  // A forced intro/result branch otherwise sends most of this lane through
  // deliberate async races and query waits. Once the first render sentinel has
  // found a bad branch, fail every remaining case during setup without mounting
  // another mutated DiagnosticScreen.
  if (diagnosticRenderSentinelAttempted) {
    expect(diagnosticRenderSentinelPassed).toBe(true);
  }
});

afterEach(async () => {
  // Clear every observed cache and drain TanStack Query's timer-batched
  // notifications inside act so slower multi-file runs cannot publish a late
  // DiagnosticScreen update into the next suite.
  await act(async () => {
    for (const client of queryClients) client.clear();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  queryClients.length = 0;
  alertSpy.mockRestore();
});

describe('diagnostic screen', () => {
  it('shows an offline state before the level test can load', async () => {
    onlineManager.setOnline(false);
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();

    expect(await screen.findByRole('header', { name: t('network.offlineTitle') })).toBeTruthy();
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
  });

  it('leaves the fresh intro for the Recorder before longer diagnostic cases run', async () => {
    diagnosticRenderSentinelAttempted = true;
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();

    const start = await screen.findByRole('button', { name: t('diag.introStart') });
    await fireEvent.press(start);
    const introExited = screen.queryByText(t('diag.introTitle')) === null;
    const recorderEntered =
      mockRecorderProps !== null && screen.queryByText(t('diag.answerCheckedTitle')) === null;
    diagnosticRenderSentinelPassed = introExited && recorderEntered;

    expect(introExited).toBe(true);
    expect(recorderEntered).toBe(true);
  });

  it('shows a preparing message while the first question loads', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
    // The wait is announced to screen readers through both the labelled
    // spinner and the polite live region on the text.
    expect(screen.getByLabelText(t('diag.preparing'))).toBeTruthy();
    expect(screen.getByText(t('diag.preparing')).props.accessibilityLiveRegion).toBe('polite');
    expect(mockRecorderProps).toBeNull();
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });

    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');
  });

  it('renders the question, progress, and wires the recorder', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const queryClient = makeQueryClient();
    await renderScreen(queryClient);

    await startFreshTest();
    expect(
      screen.getByText('Describe a time you showed courage.').props.accessibilityLanguage,
    ).toBe('en-US');
    expect(mockUserMessageForError).not.toHaveBeenCalled();
    expect(screen.getByText('courage').props.accessibilityLanguage).toBe('en-US');
    expect(screen.getByText(t('diag.progress', { current: 1, max: 3 }))).toBeTruthy();
    expect(screen.queryByText(t('header.diagnostic'))).toBeNull();
    // Both halves of the prompt card are named for the learner.
    expect(screen.getByText(t('label.word'))).toBeTruthy();
    expect(screen.getByText(t('label.question'))).toBeTruthy();

    expect(recorderProps()).toMatchObject({
      ownerId: USER.id,
      questionId: QUESTION_1.id,
      endpoint: '/diagnostic/answer',
    });
    expect(recorderProps().onExpandedControlsLayout).toEqual(expect.any(Function));
    expect(() => recorderProps().onExpandedControlsLayout?.()).not.toThrow();
    expect(mockScrollToExpandedRecorderControls).toHaveBeenLastCalledWith(expect.anything(), true);
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/diagnostic/next',
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['diagnostic-next', 1, USER.id],
        exact: true,
      }),
    ).toBeDefined();
  });

  it('seeds a nonfinal cold replay before canonical next state and keeps it visible', async () => {
    const canonical = deferred<ReturnType<typeof nextPayload> & { answers: [typeof ANSWER_1] }>();
    const replayResult: DiagnosticAnswerResult = {
      passed: true,
      score: 88,
      transcript: ANSWER_1.transcript,
      feedback: ANSWER_1.feedback,
      done: false,
      nextQuestion: QUESTION_2,
    };
    mockAssessmentReplayValue.diagnosticReplay = {
      requestId: DIAGNOSTIC_REQUEST_ID,
      question: QUESTION_1,
      result: replayResult,
    };
    mockApiFetch.mockReturnValue(canonical.promise);
    await renderScreen();

    expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
    expect(screen.queryByText(QUESTION_2.questionText)).toBeNull();
    expect(mockRecorderProps).toBeNull();

    await act(async () => {
      canonical.resolve({
        ...nextPayload(QUESTION_2, 1),
        answers: [ANSWER_1],
      });
      await canonical.promise;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
    expect(screen.queryByText(QUESTION_2.questionText)).toBeNull();
    expect(await screen.findByText(t('diag.progress', { current: 1, max: 3 }))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    expect(await screen.findByText(QUESTION_2.questionText)).toBeTruthy();
    expect(mockAssessmentReplayValue.clearDiagnosticReplay).toHaveBeenCalledWith(
      DIAGNOSTIC_REQUEST_ID,
    );
  });

  it('adopts a new replay that arrives while the same diagnostic route remains mounted', async () => {
    mockAssessmentReplayValue.diagnosticReplay = {
      requestId: DIAGNOSTIC_REQUEST_ID,
      question: QUESTION_1,
      result: {
        passed: true,
        score: 88,
        transcript: ANSWER_1.transcript,
        feedback: ANSWER_1.feedback,
        done: false,
        nextQuestion: QUESTION_2,
      },
    };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    const rendered = await renderScreen();
    expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();

    mockAssessmentReplayValue.diagnosticReplay = {
      requestId: '650e8400-e29b-41d4-a716-446655440099',
      question: QUESTION_2,
      result: {
        passed: false,
        score: 42,
        transcript: 'A second restored answer.',
        feedback: 'A second restored feedback card.',
        done: true,
        level: 'B1',
      },
    };
    await act(async () => rendered.rerenderScreen());

    expect(await screen.findByText(QUESTION_2.questionText)).toBeTruthy();
    expect(screen.getByText('A second restored answer.').props.accessibilityLanguage).toBe('en-US');
    expect(screen.queryByText(QUESTION_1.questionText)).toBeNull();
  });

  it('keeps a final cold replay ahead of canonical completion and hydrates its answers', async () => {
    const canonical = deferred<{ done: true; level: 'B2'; answers: [typeof ANSWER_1] }>();
    mockAssessmentReplayValue.diagnosticReplay = {
      requestId: DIAGNOSTIC_REQUEST_ID,
      question: QUESTION_1,
      result: {
        passed: true,
        score: ANSWER_1.score,
        transcript: ANSWER_1.transcript,
        feedback: ANSWER_1.feedback,
        done: true,
        level: 'B2',
      },
    };
    mockApiFetch.mockReturnValue(canonical.promise);
    await renderScreen();

    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
    expect(screen.queryByText(t('diag.completeTitle'))).toBeNull();

    await act(async () => {
      canonical.resolve({ done: true, level: 'B2', answers: [ANSWER_1] });
      await canonical.promise;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
    expect(screen.queryByText(t('diag.completeTitle'))).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: t('diag.seeLevel') }));
    expect(await screen.findByText(t('diag.completeTitle'))).toBeTruthy();
    // TalkBack learns about the level reveal through this live region.
    expect(screen.getByText(t('diag.completeTitle')).props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText(ANSWER_1.transcript).props.accessibilityLanguage).toBe('en-US');
    expect(screen.getByText(ANSWER_1.feedback)).toBeTruthy();
    expect(mockAssessmentReplayValue.clearDiagnosticReplay).toHaveBeenCalledWith(
      DIAGNOSTIC_REQUEST_ID,
    );
  });

  it('rejects a replay object retained across an account boundary', async () => {
    const retainedReplay: DiagnosticFeedbackReplay = {
      requestId: DIAGNOSTIC_REQUEST_ID,
      question: QUESTION_1,
      result: {
        passed: true,
        score: 88,
        transcript: ANSWER_1.transcript,
        feedback: ANSWER_1.feedback,
        done: false,
        nextQuestion: QUESTION_2,
      },
    };
    mockAssessmentReplayValue.diagnosticReplay = retainedReplay;
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    const rendered = await renderScreen();
    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();

    mockAuthValue = makeAuth({ user: OTHER_USER, sessionVersion: 2 });
    await rendered.rerenderScreen();

    expect(screen.queryByText(t('diag.answerCheckedTitle'))).toBeNull();
    expect(screen.queryByText(QUESTION_1.questionText)).toBeNull();
    expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
    expect(mockAssessmentReplayValue.clearDiagnosticReplay).not.toHaveBeenCalled();
  });

  it('does not seed a cold replay through an expired session lease', async () => {
    mockAuthValue = makeAuth({ isSessionLeaseCurrent: jest.fn(() => false) });
    mockAssessmentReplayValue.diagnosticReplay = {
      requestId: DIAGNOSTIC_REQUEST_ID,
      question: QUESTION_1,
      result: {
        passed: true,
        score: 88,
        transcript: ANSWER_1.transcript,
        feedback: ANSWER_1.feedback,
        done: false,
        nextQuestion: QUESTION_2,
      },
    };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen();

    expect(screen.queryByText(t('diag.answerCheckedTitle'))).toBeNull();
    expect(screen.queryByText(QUESTION_1.questionText)).toBeNull();
    expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
  });

  it('does not scroll expanded Recorder controls after Diagnostic loses ownership', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const rendered = await renderScreen();
    await startFreshTest();
    const reveal = recorderProps().onExpandedControlsLayout!;
    mockScrollToExpandedRecorderControls.mockClear();

    await rendered.unmount();
    reveal();

    expect(mockScrollToExpandedRecorderControls).toHaveBeenLastCalledWith(null, false);
  });

  it('recaptures the session lease when its auth capture callback changes for the same identity', async () => {
    const leaseA = { owner: 'lease-a' } as never;
    const leaseB = { owner: 'lease-b' } as never;
    const captureA = jest.fn(() => leaseA);
    mockAuthValue = makeAuth({
      captureSessionLease: captureA,
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === leaseA),
    });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const rendered = await renderScreen();
    await startFreshTest();
    expect(captureA).toHaveBeenCalled();

    const captureB = jest.fn(() => leaseB);
    mockAuthValue = makeAuth({
      captureSessionLease: captureB,
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === leaseB),
    });
    await rendered.rerenderScreen();
    alertSpy.mockClear();

    await act(async () => recorderProps().onError('current lease failure'));

    expect(captureB).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(t('diag.assessFailedTitle'), 'current lease failure');
  });

  it('shows the one-shot localized intro before the first question of a fresh test', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();

    expect((await screen.findByText(t('diag.introTitle'))).props.accessibilityRole).toBe('header');
    expect(screen.getByText(t('diag.introWhat'))).toBeTruthy();
    expect(screen.getByText(t('diag.introCount', { count: 3 }))).toBeTruthy();
    expect(screen.getByText(t('diag.introRecorded'))).toBeTruthy();
    expect(screen.getByText(t('diag.introSpeakEnglish'))).toBeTruthy();
    // The question and recorder stay hidden until the learner starts.
    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(mockRecorderProps).toBeNull();

    await startFreshTest();

    expect(screen.queryByText(t('diag.introTitle'))).toBeNull();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    // A newly served question announces itself to TalkBack via this region.
    expect(
      screen.getByText('Describe a time you showed courage.').props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(recorderProps().questionId).toBe(QUESTION_1.id);
  });

  it('skips the intro when resuming a test already in progress', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 2));
    await renderScreen();

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText(t('diag.introTitle'))).toBeNull();
    expect(screen.getByText(t('diag.progress', { current: 3, max: 3 }))).toBeTruthy();
    expect(recorderProps().questionId).toBe(QUESTION_1.id);
  });

  it('does not request diagnostic state without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });

    await renderScreen();

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText(t('diag.preparing'))).toBeNull();
  });

  it('removes a loaded question immediately when the authenticated user disappears', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const rendered = await renderScreen();
    await startFreshTest();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();

    mockAuthValue = makeAuth({ user: null, sessionVersion: 2 });
    await rendered.rerenderScreen();

    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.queryByText(t('header.diagnostic'))).toBeNull();
  });

  it('never combines the previous account question with a new account identity', async () => {
    let resolveOtherQuestion!: (value: ReturnType<typeof nextPayload>) => void;
    const otherQuestion = new Promise<ReturnType<typeof nextPayload>>((resolve) => {
      resolveOtherQuestion = resolve;
    });
    mockApiFetch
      .mockResolvedValueOnce(nextPayload(QUESTION_1, 0))
      .mockReturnValueOnce(otherQuestion);
    const rendered = await renderScreen();
    await startFreshTest();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();

    mockAuthValue = makeAuth({ user: OTHER_USER, sessionVersion: 2 });
    mockRecorderProps = null;
    await rendered.rerenderScreen();

    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
    expect(mockRecorderProps).toBeNull();

    await act(async () => resolveOtherQuestion(nextPayload(QUESTION_2, 0)));
    await startFreshTest();
    expect(screen.getByText('Tell me about a memorable journey.')).toBeTruthy();
    expect(recorderProps()).toMatchObject({
      ownerId: OTHER_USER.id,
      questionId: QUESTION_2.id,
    });
    expect(mockRecorderPublications).not.toContainEqual(
      expect.objectContaining({
        ownerId: OTHER_USER.id,
        questionId: QUESTION_1.id,
      }),
    );
    mockRouter.navigate.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');
  });

  it('drops an initial diagnostic response when its captured session lease expires before delivery', async () => {
    const initial = deferred<ReturnType<typeof nextPayload>>();
    const leaseA = { owner: 'initial-request' } as never;
    let currentLease: unknown = leaseA;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => leaseA),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockReturnValue(initial.promise);
    const queryClient = makeQueryClient();
    await renderScreen(queryClient);
    expect(screen.getByText(t('diag.preparing'))).toBeTruthy();

    currentLease = { owner: 'replacement-session' };
    await act(async () => {
      initial.resolve(nextPayload(QUESTION_1, 0));
      await initial.promise;
    });
    await waitFor(() =>
      expect(queryClient.getQueryState(['diagnostic-next', 1, USER.id])?.status).toBe('success'),
    );
    await act(async () => {
      // The cache settles before TanStack's timer-batched observer notification;
      // drain that turn so DiagnosticScreen's passive data effect has also run.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.queryByText(QUESTION_1.questionText)).toBeNull();
    expect(screen.queryByText(t('diag.introTitle'))).toBeNull();
    expect(screen.queryByRole('button', { name: t('diag.introStart') })).toBeNull();
    expect(screen.queryByText(t('header.diagnostic'))).toBeNull();
    expect(mockRecorderProps).toBeNull();
  });

  it('renders no stale question while a new identity has cached empty diagnostic data', async () => {
    const queryClient = makeQueryClient();
    mockApiFetch.mockResolvedValueOnce(nextPayload(QUESTION_1, 0));
    const rendered = await renderScreen(queryClient);
    await startFreshTest();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();

    queryClient.setQueryData(['diagnostic-next', 2, OTHER_USER.id], null);
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    mockAuthValue = makeAuth({ user: OTHER_USER, sessionVersion: 2 });
    mockRecorderProps = null;
    await rendered.rerenderScreen();

    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.queryByText(t('header.diagnostic'))).toBeNull();
    expect(mockRecorderProps).toBeNull();
  });

  it('keeps the current diagnostic question visible when recovery refresh fails', async () => {
    const queryClient = makeQueryClient();
    const queryKey = ['diagnostic-next', 1, USER.id] as const;
    mockApiFetch
      .mockResolvedValueOnce(nextPayload(QUESTION_1, 0))
      .mockRejectedValueOnce(new Error('background refresh failed'));
    await renderScreen(queryClient);
    await startFreshTest();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();

    await act(async () => recorderProps().onRecoveryUnresolved());
    await waitFor(() => expect(queryClient.getQueryState(queryKey)?.status).toBe('error'));
    // The cache updates before TanStack Query delivers its batched observer notification.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText(t('diag.loadFailedTitle'))).toBeNull();
  });

  it.each(['account', 'session'] as const)(
    'rejects stale recorder callbacks after the %s identity changes and accepts current callbacks',
    async (boundary) => {
      let resolveCurrentQuestion!: (value: ReturnType<typeof nextPayload>) => void;
      const currentQuestion = new Promise<ReturnType<typeof nextPayload>>((resolve) => {
        resolveCurrentQuestion = resolve;
      });
      mockApiFetch
        .mockResolvedValueOnce(nextPayload(QUESTION_1, 0))
        .mockReturnValueOnce(currentQuestion)
        .mockResolvedValue(nextPayload(QUESTION_2, 0));
      const rendered = await renderScreen();
      await startFreshTest();
      expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
      const staleCallbacks = recorderProps();

      mockAuthValue = makeAuth({
        user: boundary === 'account' ? OTHER_USER : USER,
        sessionVersion: boundary === 'account' ? 1 : 2,
      });
      await rendered.rerenderScreen();
      await act(async () => resolveCurrentQuestion(nextPayload(QUESTION_2, 0)));
      await startFreshTest();
      expect(screen.getByText('Tell me about a memorable journey.')).toBeTruthy();
      const currentCallbacks = recorderProps();
      expect(currentCallbacks).not.toBe(staleCallbacks);
      alertSpy.mockClear();
      const callsBeforeStaleRecovery = mockApiFetch.mock.calls.length;

      await act(async () => {
        staleCallbacks.onResult({
          passed: true,
          score: 99,
          transcript: 'stale transcript',
          feedback: 'stale feedback',
          done: false,
          nextQuestion: QUESTION_1,
        });
        staleCallbacks.onError('stale upload failure');
        staleCallbacks.onRecoveryUnresolved();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.queryByText(t('diag.answerCheckedTitle'))).toBeNull();
      expect(screen.getByText('Tell me about a memorable journey.')).toBeTruthy();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledTimes(callsBeforeStaleRecovery);

      await act(async () => {
        currentCallbacks.onError('current upload failure');
        currentCallbacks.onRecoveryUnresolved();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(alertSpy).toHaveBeenCalledWith(t('diag.assessFailedTitle'), 'current upload failure');
      expect(mockApiFetch).toHaveBeenCalledTimes(callsBeforeStaleRecovery + 1);

      await act(async () =>
        currentCallbacks.onResult({
          passed: true,
          score: 90,
          transcript: 'current transcript',
          feedback: 'current feedback',
          done: false,
          nextQuestion: QUESTION_1,
        }),
      );
      expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
    },
  );

  it('does not let an old Recorder release or acquire the new identity lock', async () => {
    const currentQuestion = new Promise<ReturnType<typeof nextPayload>>(() => undefined);
    mockApiFetch
      .mockResolvedValueOnce(nextPayload(QUESTION_1, 0))
      .mockResolvedValueOnce(nextPayload(QUESTION_2, 0))
      .mockReturnValue(currentQuestion);
    const rendered = await renderScreen();
    await startFreshTest();
    const staleCallbacks = recorderProps();

    mockAuthValue = makeAuth({ user: OTHER_USER, sessionVersion: 2 });
    await rendered.rerenderScreen();
    await startFreshTest();
    const currentCallbacks = recorderProps();
    expect(currentCallbacks).not.toBe(staleCallbacks);

    await act(async () => currentCallbacks.onInteractionLockChange?.(true));
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await act(async () => staleCallbacks.onInteractionLockChange?.(false));
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await act(async () => currentCallbacks.onInteractionLockChange?.(false));
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });

    await act(async () => staleCallbacks.onInteractionLockChange?.(true));
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it.each(['blur', 'session lease'] as const)(
    'drops queued diagnostic Recorder work after %s ownership is lost',
    async (boundary) => {
      const renderLease = { owner: 'diagnostic-render' } as never;
      let currentLease: unknown = renderLease;
      mockAuthValue = makeAuth({
        captureSessionLease: jest.fn(() => currentLease as never),
        isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
      });
      mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
      await renderScreen();
      await startFreshTest();
      const callbacks = recorderProps();
      const requestsBeforeBoundary = mockApiFetch.mock.calls.length;

      if (boundary === 'blur') {
        await blurScreen();
      } else {
        currentLease = { owner: 'replacement-session' };
      }
      alertSpy.mockClear();

      await act(async () => {
        callbacks.onResult({
          passed: true,
          score: 99,
          transcript: 'late transcript',
          feedback: 'late feedback',
          done: false,
          nextQuestion: QUESTION_2,
        });
        callbacks.onError('late upload failure');
        callbacks.onRecoveryUnresolved();
        callbacks.onInteractionLockChange?.(true);
        await Promise.resolve();
      });

      expect(screen.queryByText(t('diag.answerCheckedTitle'))).toBeNull();
      expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledTimes(requestsBeforeBoundary);
      expect(
        screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
      ).toMatchObject({ disabled: false });
    },
  );

  it.each(['account', 'session'] as const)(
    'rejects a captured Next Question action after the %s identity changes',
    async (boundary) => {
      const currentQuestion = new Promise<ReturnType<typeof nextPayload>>(() => undefined);
      mockApiFetch
        .mockResolvedValueOnce(nextPayload(QUESTION_1, 0))
        .mockReturnValueOnce(currentQuestion);
      const rendered = await renderScreen();
      await startFreshTest();
      expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
      await act(async () =>
        recorderProps().onResult({
          passed: true,
          score: 88,
          transcript: 'old transcript',
          feedback: 'old feedback',
          done: false,
          nextQuestion: QUESTION_2,
        }),
      );
      const staleAdvance = capturedPressHandler(t('diag.nextQuestion'));

      const nextSetUser = jest.fn();
      mockAuthValue = makeAuth({
        user: boundary === 'account' ? OTHER_USER : USER,
        sessionVersion: boundary === 'account' ? 1 : 2,
        setUser: nextSetUser,
      });
      await rendered.rerenderScreen();
      expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
      const callsBeforeStaleAdvance = mockApiFetch.mock.calls.length;

      await act(async () => {
        await staleAdvance();
      });

      expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
      expect(screen.queryByText('Tell me about a memorable journey.')).toBeNull();
      expect(screen.queryByText(t('diag.answerCheckedTitle'))).toBeNull();
      expect(mockApiFetch).toHaveBeenCalledTimes(callsBeforeStaleAdvance);
      expect(nextSetUser).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    },
  );

  it.each(['account', 'session'] as const)(
    'rejects a captured Start Practicing action after the %s identity changes',
    async (boundary) => {
      const currentQuestion = new Promise<ReturnType<typeof nextPayload>>(() => undefined);
      mockApiFetch
        .mockResolvedValueOnce({ done: true, level: 'B2' })
        .mockReturnValueOnce(currentQuestion);
      const queryClient = makeQueryClient();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const rendered = await renderScreen(queryClient);
      expect(await screen.findByText(t('diag.completeTitle'))).toBeTruthy();
      const staleStartPracticing = capturedPressHandler(t('diag.startPracticing'));
      const originalSetUser = mockAuthValue.setUser;

      const nextSetUser = jest.fn();
      mockAuthValue = makeAuth({
        user: boundary === 'account' ? OTHER_USER : USER,
        sessionVersion: boundary === 'account' ? 1 : 2,
        setUser: nextSetUser,
      });
      await rendered.rerenderScreen();
      expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
      const callsBeforeStaleStart = mockApiFetch.mock.calls.length;
      invalidateSpy.mockClear();

      await act(async () => {
        await staleStartPracticing();
      });

      expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
      expect(originalSetUser).not.toHaveBeenCalled();
      expect(nextSetUser).not.toHaveBeenCalled();
      expect(invalidateSpy).not.toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledTimes(callsBeforeStaleStart);
      expect(mockRouter.replace).not.toHaveBeenCalled();
    },
  );

  it('binds acknowledgement to the session lease captured by its rendered result card', async () => {
    const renderLease = { owner: 'answer-card' } as never;
    let currentLease: unknown = renderLease;
    mockAuthValue = makeAuth({
      captureSessionLease: jest.fn(() => currentLease as never),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
    await renderScreen();
    await screen.findByText(QUESTION_1.questionText);
    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 88,
        transcript: 'owned answer',
        feedback: 'owned feedback',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );

    currentLease = { owner: 'replacement-session' };
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));

    expect(
      parentOf(screen.getByText(t('diag.answerCheckedTitle'))).props.accessibilityLiveRegion,
    ).toBe('polite');
    expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
    expect(screen.queryByText(QUESTION_2.questionText)).toBeNull();
  });

  it('binds Start Practicing to the session lease captured by the completion card', async () => {
    const renderLease = { owner: 'completion-card' } as never;
    let currentLease: unknown = renderLease;
    const setUser = jest.fn();
    mockAuthValue = makeAuth({
      setUser,
      captureSessionLease: jest.fn(() => currentLease as never),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockResolvedValue({ done: true, level: 'B2' });
    const queryClient = makeQueryClient();
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(queryClient);
    expect((await screen.findByText(t('diag.completeTitle'))).props.accessibilityRole).toBe(
      'header',
    );

    currentLease = { owner: 'replacement-session' };
    await fireEvent.press(screen.getByRole('button', { name: t('diag.startPracticing') }));

    expect(setUser).not.toHaveBeenCalled();
    expect(removeSpy).not.toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('invalidates captured recorder callbacks when the diagnostic screen unmounts', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const rendered = await renderScreen();
    await startFreshTest();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    const staleCallbacks = recorderProps();
    const callsBeforeUnmount = mockApiFetch.mock.calls.length;

    await rendered.unmount();
    alertSpy.mockClear();
    await act(async () => {
      staleCallbacks.onError('late upload failure');
      staleCallbacks.onRecoveryUnresolved();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockApiFetch).toHaveBeenCalledTimes(callsBeforeUnmount);
  });

  it('acknowledges an answer and advances to the next question', async () => {
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions')
      .mockImplementation(() => undefined);
    const scrollToTopSpy = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => undefined);
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(queryClient);
    await startFreshTest();
    announceSpy.mockClear();
    scrollToTopSpy.mockClear();

    const result: DiagnosticAnswerResult = {
      passed: true,
      score: 88,
      transcript: 'I showed courage at work.',
      feedback: 'Well done.',
      recordingId: '550e8400-e29b-41d4-a716-446655440090',
      done: false,
      nextQuestion: QUESTION_2,
    };
    await act(async () => recorderProps().onResult(result));

    expect(announceSpy).toHaveBeenLastCalledWith(
      `${t('diag.answerCheckedTitle')}. ${t('diag.scoreLine', {
        score: 88,
        result: t('diag.passed'),
      })}`,
      { queue: true },
    );
    expect(scrollToTopSpy).toHaveBeenLastCalledWith({ y: 0, animated: false });

    expect(screen.getByRole('header', { name: t('diag.answerCheckedTitle') })).toBeTruthy();
    expect(screen.getByText('I showed courage at work.').props.selectable).toBe(true);
    expect(screen.getByText('Well done.').props.accessibilityLanguage).toBe('en-US');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['recordings', USER.id] });
    expect(
      screen.getByText(t('diag.scoreLine', { score: 88, result: t('diag.passed') })),
    ).toBeTruthy();
    expect(mockRecorderProps).toBeNull();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('diag.nextQuestion') }),
      {
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: colors.primary,
      },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));

    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
    expect(screen.getByText('journey')).toBeTruthy();
    expect(screen.getByText(t('diag.progress', { current: 2, max: 3 }))).toBeTruthy();
    expect(recorderProps().questionId).toBe(QUESTION_2.id);
    expect(announceSpy).toHaveBeenLastCalledWith(
      `${t('diag.progress', { current: 2, max: 3 })}. journey. ${QUESTION_2.questionText}`,
      { queue: true },
    );
    expect(scrollToTopSpy).toHaveBeenLastCalledWith({ y: 0, animated: false });
    announceSpy.mockRestore();
    scrollToTopSpy.mockRestore();
  });

  it('durably acknowledges one request before advancing its result card', async () => {
    const acknowledgement = deferred<boolean>();
    mockAcknowledgePendingFeedback.mockReturnValue(acknowledgement.promise);
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
    await renderScreen();
    await screen.findByText(QUESTION_1.questionText);
    await act(async () =>
      recorderProps().onResult(
        {
          passed: true,
          score: 88,
          transcript: 'A durable answer.',
          feedback: 'Durable feedback.',
          done: false,
          nextQuestion: QUESTION_2,
        },
        { requestId: DIAGNOSTIC_REQUEST_ID },
      ),
    );
    const nextQuestion = capturedPressHandler(t('diag.nextQuestion'));

    await act(async () => {
      nextQuestion();
      nextQuestion();
      await Promise.resolve();
    });

    expect(mockAcknowledgePendingFeedback).toHaveBeenCalledTimes(1);
    expect(mockAcknowledgePendingFeedback).toHaveBeenCalledWith(USER.id, DIAGNOSTIC_REQUEST_ID);
    expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
    expect(screen.queryByText(QUESTION_2.questionText)).toBeNull();
    expect(
      screen.getByRole('button', { name: t('diag.nextQuestion') }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
      busy: true,
    });

    await act(async () => {
      acknowledgement.resolve(true);
      await acknowledgement.promise;
    });
    expect(await screen.findByText(QUESTION_2.questionText)).toBeTruthy();
  });

  it('does not advance after durable acknowledgement resolves off-focus', async () => {
    const acknowledgement = deferred<boolean>();
    mockAcknowledgePendingFeedback.mockReturnValue(acknowledgement.promise);
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
    await renderScreen();
    await screen.findByText(QUESTION_1.questionText);
    await act(async () =>
      recorderProps().onResult(
        {
          passed: true,
          score: 88,
          transcript: 'A durable answer.',
          feedback: 'Durable feedback.',
          done: false,
          nextQuestion: QUESTION_2,
        },
        { requestId: DIAGNOSTIC_REQUEST_ID },
      ),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    await blurScreen();

    await act(async () => {
      acknowledgement.resolve(true);
      await acknowledgement.promise;
    });
    expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
    expect(screen.queryByText(QUESTION_2.questionText)).toBeNull();

    await focusScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    expect(await screen.findByText(QUESTION_2.questionText)).toBeTruthy();
    expect(mockAcknowledgePendingFeedback).toHaveBeenCalledTimes(1);
  });

  it.each(['false result', 'rejection'] as const)(
    'keeps the diagnostic result retryable after acknowledgement %s',
    async (failure) => {
      if (failure === 'false result') {
        mockAcknowledgePendingFeedback.mockResolvedValueOnce(false);
      } else {
        mockAcknowledgePendingFeedback.mockRejectedValueOnce(new Error('private storage error'));
      }
      mockAcknowledgePendingFeedback.mockResolvedValueOnce(true);
      mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
      await renderScreen();
      await screen.findByText(QUESTION_1.questionText);
      await act(async () =>
        recorderProps().onResult(
          {
            passed: true,
            score: 88,
            transcript: 'A durable answer.',
            feedback: 'Durable feedback.',
            done: false,
            nextQuestion: QUESTION_2,
          },
          { requestId: DIAGNOSTIC_REQUEST_ID },
        ),
      );

      await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
      expect(await screen.findByRole('alert')).toHaveTextContent(t('boundary.body'));
      expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
      expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
      expect(screen.queryByText(QUESTION_2.questionText)).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
      expect(await screen.findByText(QUESTION_2.questionText)).toBeTruthy();
      expect(mockAcknowledgePendingFeedback).toHaveBeenCalledTimes(2);
    },
  );

  it('keeps diagnostic silence on the same question without advancing progress', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
    await renderScreen();
    await screen.findByText(QUESTION_1.questionText);

    await act(async () =>
      recorderProps().onResult({
        passed: false,
        score: 0,
        transcript: '',
        feedback: 'Please speak clearly and try again.',
        noSpeech: true,
        done: false,
        nextQuestion: QUESTION_1,
      }),
    );

    expect(screen.getByRole('header', { name: t('diag.noSpeechTitle') })).toBeTruthy();
    expect(
      screen.getByText('Please speak clearly and try again.').props.accessibilityLanguage,
    ).toBe('en-US');
    expect(screen.queryByText(t('diag.answersTitle'))).toBeNull();
    expect(
      screen.queryByText(
        t('diag.scoreLine', {
          score: 0,
          result: t('diag.notPassed'),
        }),
      ),
    ).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t('diag.recordAgain') }));

    expect(screen.getByText(QUESTION_1.questionText)).toBeTruthy();
    expect(screen.getByText(t('diag.progress', { current: 2, max: 3 }))).toBeTruthy();
    expect(recorderProps().questionId).toBe(QUESTION_1.id);
  });

  it('rejects callbacks retained by the previous question Recorder after advancing', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
    await renderScreen();
    await screen.findByText(QUESTION_1.questionText);
    const oldCallbacks = recorderProps();

    await act(async () =>
      oldCallbacks.onResult({
        passed: true,
        score: 88,
        transcript: 'accepted answer',
        feedback: 'accepted feedback',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    expect(screen.getByText(QUESTION_2.questionText)).toBeTruthy();
    expect(recorderProps().questionId).toBe(QUESTION_2.id);
    alertSpy.mockClear();
    const callsBeforeReplay = mockApiFetch.mock.calls.length;

    await act(async () => {
      oldCallbacks.onResult({
        passed: true,
        score: 99,
        transcript: 'late old answer',
        feedback: 'late old feedback',
        done: true,
        level: 'C2',
      });
      oldCallbacks.onError('late old error');
      oldCallbacks.onRecoveryUnresolved();
      oldCallbacks.onInteractionLockChange?.(true);
      await Promise.resolve();
    });

    expect(screen.getByText(QUESTION_2.questionText)).toBeTruthy();
    expect(screen.queryByText(t('diag.answerCheckedTitle'))).toBeNull();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockApiFetch).toHaveBeenCalledTimes(callsBeforeReplay);
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });

  it('reveals the level and completes the diagnostic', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 2));
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const removeSpy = jest.spyOn(queryClient, 'removeQueries');
    await renderScreen(queryClient);
    await screen.findByText('Describe a time you showed courage.');

    const result: DiagnosticAnswerResult = {
      passed: true,
      score: 91,
      transcript: 'transcript',
      feedback: 'feedback',
      done: true,
      level: 'B2',
    };
    await act(async () => recorderProps().onResult(result));
    await fireEvent.press(screen.getByRole('button', { name: t('diag.seeLevel') }));

    expect(await screen.findByText(t('diag.completeTitle'))).toBeTruthy();
    expect(screen.getByText(t('diag.levelIntro'))).toBeTruthy();
    expect(screen.getByText('B2')).toBeTruthy();
    expect(screen.getByText(t('cefr.B2'))).toBeTruthy();
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    // The reveal closes by telling the learner what the level is used for.
    expect(screen.getByText(t('diag.levelHint'))).toBeTruthy();
    // The per-answer reveal lists this session's answers with pass marks.
    expect(screen.getByText(t('diag.answersTitle'))).toBeTruthy();
    expect(
      screen.getByText(t('diag.answerLine', { number: 1, score: 91, mark: '✓' })),
    ).toBeTruthy();
    // The celebration mark and confetti are decorative: hidden from screen
    // readers (and so from default queries), while the headline carries the
    // meaning.
    const badge = screen.getByTestId('diagnostic-complete-badge', {
      includeHiddenElements: true,
    });
    expect(badge.props.accessibilityElementsHidden).toBe(true);
    expect(badge.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(
      screen.getByTestId('diagnostic-confetti', { includeHiddenElements: true }).props
        .accessibilityElementsHidden,
    ).toBe(true);

    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('diag.startPracticing') }),
      {
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: colors.primary,
      },
      { backgroundColor: colors.primaryDark },
    );
    const startPracticing = capturedPressHandler(t('diag.startPracticing'));
    await act(async () => {
      await startPracticing();
      await startPracticing();
    });
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({
      ...USER,
      diagnosticCompleted: true,
      diagnosticAcknowledged: true,
      cefrLevel: 'B2',
    });
    expect(mockAcknowledgeDiagnostic).toHaveBeenCalledTimes(1);
    expect(mockAuthValue.setUser).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['practice-stats'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it('keeps the durable level reveal open when acknowledgement fails and allows retry', async () => {
    mockApiFetch.mockResolvedValue({ done: true, level: 'B2', answers: [] });
    mockAcknowledgeDiagnostic
      .mockRejectedValueOnce(new ApiError(503, 'busy'))
      .mockResolvedValueOnce(undefined);
    await renderScreen();
    await screen.findByText(t('diag.completeTitle'));

    await fireEvent.press(screen.getByRole('button', { name: t('diag.startPracticing') }));
    expect(alertSpy).toHaveBeenCalledWith(t('diag.ackFailedTitle'), t('error.serverBusy'));
    expect(screen.getByText(t('diag.completeTitle'))).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: t('diag.startPracticing') }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAcknowledgeDiagnostic).toHaveBeenCalledTimes(2);
  });

  it('gives completion acknowledgement exclusive ownership of account actions', async () => {
    const acknowledgement = deferred<void>();
    mockApiFetch.mockResolvedValue({ done: true, level: 'B2', answers: [] });
    mockAcknowledgeDiagnostic.mockReturnValue(acknowledgement.promise);
    await renderScreen();
    await screen.findByText(t('diag.completeTitle'));
    const startPracticing = capturedPressHandler(t('diag.startPracticing'));
    const openSettings = capturedPressHandler(t('header.settings'));
    const logOut = capturedPressHandler(t('common.logOut'));

    await act(async () => {
      void startPracticing();
      openSettings();
      void logOut();
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: t('diag.startPracticingBusy') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('diag.startPracticing') })).toBeNull();
    expect(mockAcknowledgeDiagnostic).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockAuthValue.logout).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await act(async () => {
      acknowledgement.resolve();
      await acknowledgement.promise;
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('accepts only the first recorder result until its card is acknowledged', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    const callbacks = recorderProps();
    await act(async () => {
      callbacks.onResult({
        passed: true,
        score: 80,
        transcript: 'first',
        feedback: 'first feedback',
        done: false,
        nextQuestion: QUESTION_2,
      });
      callbacks.onResult({
        passed: false,
        score: 10,
        transcript: 'duplicate',
        feedback: 'duplicate feedback',
        done: false,
        nextQuestion: QUESTION_1,
      });
    });

    alertSpy.mockClear();
    mockRouter.navigate.mockClear();
    const callsAfterAcceptedResult = mockApiFetch.mock.calls.length;
    await act(async () => {
      callbacks.onError('late error after accepted result');
      callbacks.onRecoveryUnresolved();
      callbacks.onInteractionLockChange?.(true);
      await Promise.resolve();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockApiFetch).toHaveBeenCalledTimes(callsAfterAcceptedResult);
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');

    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    expect(screen.getByText('Tell me about a memorable journey.')).toBeTruthy();
    expect(recorderProps().questionId).toBe(QUESTION_2.id);
  });

  it('stores per-answer outcomes during the test and reveals them only on completion', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await act(async () =>
      recorderProps().onResult({
        passed: false,
        score: 35,
        transcript: 'first answer',
        feedback: 'first feedback',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );
    // Every answer is explained immediately, before the learner moves on.
    expect(screen.getByText('first answer')).toBeTruthy();
    expect(screen.getByText('first feedback')).toBeTruthy();
    expect(
      screen.getByText(t('diag.scoreLine', { score: 35, result: t('diag.notPassed') })),
    ).toBeTruthy();
    expect(screen.queryByText(t('diag.answersTitle'))).toBeNull();
    expect(
      screen.queryByText(t('diag.answerLine', { number: 1, score: 35, mark: '✗' })),
    ).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));

    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 82,
        transcript: 'second answer',
        feedback: 'second feedback',
        done: true,
        level: 'A2',
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.seeLevel') }));

    expect(await screen.findByText(t('diag.completeTitle'))).toBeTruthy();
    expect(screen.getByText(t('diag.answersTitle'))).toBeTruthy();
    expect(
      screen.getByText(t('diag.answerLine', { number: 1, score: 35, mark: '✗' })),
    ).toBeTruthy();
    expect(
      screen.getByText(t('diag.answerLine', { number: 2, score: 82, mark: '✓' })),
    ).toBeTruthy();
  });

  it('does not complete the profile when the user disappears before acknowledgement', async () => {
    mockApiFetch.mockResolvedValue({ done: true, level: 'B2' });
    const rendered = await renderScreen();
    expect(await screen.findByText(t('diag.completeTitle'))).toBeTruthy();
    const originalSetUser = mockAuthValue.setUser;

    mockAuthValue = makeAuth({ user: null, sessionVersion: 2 });
    await rendered.rerenderScreen();
    expect(screen.queryByRole('button', { name: t('diag.startPracticing') })).toBeNull();

    expect(originalSetUser).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('wires the diagnostic answer parser into the recorder', async () => {
    // The screen chooses which response contract the recorder parses with; a
    // swapped parser breaks the flow at runtime, so pin the wiring.
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    expect(recorderProps().parseResult).toBe(parseDiagnosticAnswerResult);
  });

  it('keeps the current result visible when an incomplete result has no next question', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await act(async () =>
      recorderProps().onResult({
        passed: false,
        score: 40,
        transcript: 'An answer.',
        feedback: 'Try again.',
        done: false,
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));

    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(mockRecorderProps).toBeNull();
  });

  it('ignores stale acknowledgement handlers after diagnostic state advances', async () => {
    // A queued double tap retains the handler for the result it was rendered
    // against. Once that exact card is claimed, replaying it must not erase a
    // later canonical completion or restore an obsolete question.
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 2));
    const { queryClient } = await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    // A finished result that never carried a level: acknowledging it clears the
    // level rather than badging an empty one, so the question stays put.
    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 70,
        transcript: 'first answer',
        feedback: 'first feedback',
        done: true,
      }),
    );
    const replayFinish = capturedPressHandler(t('diag.seeLevel'));
    await fireEvent.press(screen.getByRole('button', { name: t('diag.seeLevel') }));
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText(t('diag.completeTitle'))).toBeNull();

    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 80,
        transcript: 'second answer',
        feedback: 'second feedback',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );
    const replayContinue = capturedPressHandler(t('diag.nextQuestion'));
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();

    // The server finishes the test underneath the learner, dropping both the
    // question and the progress it was counted against.
    mockApiFetch.mockResolvedValue({ done: true, level: 'B2' });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['diagnostic-next'] });
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText(t('diag.completeTitle'))).toBeTruthy();

    // Neither stale handler may mutate the newer completion.
    await act(async () => {
      await replayFinish();
    });
    expect(screen.getByText(t('diag.completeTitle'))).toBeTruthy();

    await act(async () => {
      await replayContinue();
    });
    expect(screen.getByText(t('diag.completeTitle'))).toBeTruthy();
    expect(screen.queryByText('Tell me about a memorable journey.')).toBeNull();
    expect(screen.queryByText(t('diag.introTitle'))).toBeNull();
  });

  it('keeps the unacknowledged answer card when a background refetch advances server state', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const { queryClient } = await renderScreen();
    await startFreshTest();

    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 90,
        transcript: 'An answer.',
        feedback: 'Great answer.',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );
    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();

    // The 5-minute-stale query refetches on focus and resolves with the
    // advanced server state (answer committed, next question current). The
    // card must survive until the learner continues; advance() applies the
    // next question locally.
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_2, 1));
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['diagnostic-next'] });
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(t('diag.answerCheckedTitle'))).toBeTruthy();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();

    // Continuing still advances locally from the acknowledged result.
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    await waitFor(() => expect(mockRecorderProps?.questionId).toBe(QUESTION_2.id));
  });

  it('cancels a pre-answer GET so it cannot rewind state after acknowledgement', async () => {
    const queryClient = makeQueryClient();
    let resolveStale!: (value: ReturnType<typeof nextPayload>) => void;
    const staleRefresh = new Promise<ReturnType<typeof nextPayload>>((resolve) => {
      resolveStale = resolve;
    });
    let staleSignal: AbortSignal | undefined;
    mockApiFetch
      .mockResolvedValueOnce(nextPayload(QUESTION_1, 0))
      .mockImplementationOnce((_path: string, options?: { signal?: AbortSignal }) => {
        staleSignal = options?.signal;
        return staleRefresh;
      });
    await renderScreen(queryClient);
    await startFreshTest();
    let backgroundRefresh!: Promise<void>;

    await act(async () => {
      backgroundRefresh = queryClient.refetchQueries({
        queryKey: ['diagnostic-next', 1, USER.id],
        exact: true,
      });
      await Promise.resolve();
    });
    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 90,
        transcript: 'accepted answer',
        feedback: 'accepted feedback',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    expect(screen.getByText(QUESTION_2.questionText)).toBeTruthy();
    const staleWasAborted = staleSignal?.aborted;

    await act(async () => {
      resolveStale(nextPayload(QUESTION_1, 0));
      await Promise.allSettled([backgroundRefresh]);
      await Promise.resolve();
    });

    expect(staleWasAborted).toBe(true);
    expect(screen.getByText(QUESTION_2.questionText)).toBeTruthy();
    expect(screen.queryByText(QUESTION_1.questionText)).toBeNull();
    expect(recorderProps().questionId).toBe(QUESTION_2.id);
  });

  it('cancels only the diagnostic-next query when a recorder result is accepted', async () => {
    const queryClient = makeQueryClient();
    const unrelated = deferred<string>();
    let unrelatedSignal: AbortSignal | undefined;
    const unrelatedFetch = queryClient.fetchQuery({
      queryKey: ['unrelated-diagnostic-work'],
      queryFn: ({ signal }) => {
        unrelatedSignal = signal;
        return unrelated.promise;
      },
    });
    const unrelatedSettlement = unrelatedFetch.catch((error: unknown) => error);
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));
    await renderScreen(queryClient);
    await screen.findByText(QUESTION_1.questionText);
    await waitFor(() => expect(unrelatedSignal).toBeDefined());

    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 90,
        transcript: 'accepted answer',
        feedback: 'accepted feedback',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );

    expect(unrelatedSignal?.aborted).toBe(false);
    let unrelatedResult: unknown;
    await act(async () => {
      unrelated.resolve('unrelated result');
      unrelatedResult = await unrelatedSettlement;
    });
    expect(unrelatedResult).toBe('unrelated result');
  });

  it('shows the completion view immediately when the test is already done', async () => {
    mockApiFetch.mockResolvedValue({ done: true, level: 'A2' });
    await renderScreen();

    expect(await screen.findByText(t('diag.completeTitle'))).toBeTruthy();
    expect(screen.getByText('A2')).toBeTruthy();
    expect(screen.queryByText(t('diag.answersTitle'))).toBeNull();
  });

  it('restores transcripts and feedback on a durable completed result', async () => {
    mockApiFetch.mockResolvedValue({
      done: true,
      level: 'A2',
      answers: [
        {
          attemptNo: 1,
          promptWord: QUESTION_1.promptWord,
          questionText: QUESTION_1.questionText,
          transcript: 'A durable transcript.',
          score: 72,
          passed: true,
          feedback: 'Durable feedback.',
        },
      ],
    });
    await renderScreen();

    expect((await screen.findByText('A durable transcript.')).props.accessibilityLanguage).toBe(
      'en-US',
    );
    expect(screen.getByText('Durable feedback.').props.accessibilityLanguage).toBe('en-US');
    expect(screen.getByText(QUESTION_1.questionText, { exact: false })).toBeTruthy();
  });

  it('shows a retryable error when the question fails to load', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen();

    expect((await screen.findByText(t('diag.loadFailedTitle'))).props.accessibilityRole).toBe(
      'header',
    );
    expect(screen.getByText(t('error.serverBusy')).props.accessibilityLiveRegion).toBe('assertive');
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.tryAgain') }),
      {
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: colors.primary,
      },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t('common.tryAgain') }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('joins repeated retries after cached empty diagnostic data fails in the background', async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['diagnostic-next', 1, USER.id], null);
    const retryRequest = new Promise<unknown>(() => undefined);
    mockApiFetch
      .mockRejectedValueOnce(new ApiError(500, 'background failure'))
      .mockReturnValue(retryRequest);
    await renderScreen(queryClient);

    await screen.findByRole('button', { name: t('common.tryAgain') });
    const retry = capturedPressHandler(t('common.tryAgain'));
    await act(async () => {
      void retry();
      void retry();
      await Promise.resolve();
    });

    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to generic copy for non-API load errors', async () => {
    mockApiFetch.mockRejectedValue(new Error('parse failure'));
    await renderScreen();

    expect(await screen.findByText(t('diag.loadFailed'))).toBeTruthy();
  });

  it('surfaces recorder errors through an alert', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await act(async () => recorderProps().onError('upload failed'));
    expect(alertSpy).toHaveBeenCalledWith(t('diag.assessFailedTitle'), 'upload failed');
  });

  it('refetches server state when recorder recovery is unresolved', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await act(async () => {
      recorderProps().onRecoveryUnresolved();
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('replaces a pre-recovery refresh and joins repeated recovery callbacks', async () => {
    const queryClient = makeQueryClient();
    let resolveStale!: (value: ReturnType<typeof nextPayload>) => void;
    const stale = new Promise<ReturnType<typeof nextPayload>>((resolve) => {
      resolveStale = resolve;
    });
    let resolveRecovery!: (value: ReturnType<typeof nextPayload>) => void;
    const recovery = new Promise<ReturnType<typeof nextPayload>>((resolve) => {
      resolveRecovery = resolve;
    });
    let staleSignal: AbortSignal | undefined;
    mockApiFetch
      .mockResolvedValueOnce(nextPayload(QUESTION_1, 0))
      .mockImplementationOnce((_path: string, options?: { signal?: AbortSignal }) => {
        staleSignal = options?.signal;
        return stale;
      })
      .mockReturnValueOnce(recovery);
    await renderScreen(queryClient);
    await startFreshTest();
    let backgroundRefresh!: Promise<void>;

    await act(async () => {
      backgroundRefresh = queryClient.refetchQueries({
        queryKey: ['diagnostic-next', 1, USER.id],
        exact: true,
      });
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
      resolveStale(nextPayload(QUESTION_1, 0));
      resolveRecovery(nextPayload(QUESTION_2, 1));
      await Promise.allSettled([backgroundRefresh]);
      await Promise.resolve();
    });
    expect(callsAfterRecovery).toBe(3);
    expect(staleWasAborted).toBe(true);
    expect(await screen.findByText(QUESTION_2.questionText)).toBeTruthy();
  });

  it.each(['resolve', 'reject'] as const)(
    'releases the same Recorder recovery latch after its refresh %s',
    async (settlement) => {
      const firstRefresh = deferred<void>();
      const secondRefresh = deferred<void>();
      const refetch = jest
        .spyOn(QueryObserver.prototype, 'refetch')
        .mockReturnValueOnce(firstRefresh.promise as never)
        .mockReturnValueOnce(secondRefresh.promise as never);
      mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));

      try {
        await renderScreen();
        await screen.findByText(QUESTION_1.questionText);
        const callbacks = recorderProps();

        await act(async () => {
          callbacks.onRecoveryUnresolved();
          await Promise.resolve();
        });
        expect(refetch).toHaveBeenCalledTimes(1);

        await act(async () => {
          if (settlement === 'resolve') firstRefresh.resolve();
          else firstRefresh.reject(new Error('controlled recovery failure'));
          await Promise.resolve();
          await Promise.resolve();
        });
        await act(async () => {
          callbacks.onRecoveryUnresolved();
          await Promise.resolve();
        });
        expect(refetch).toHaveBeenCalledTimes(2);

        secondRefresh.resolve();
        await act(async () => {
          await Promise.resolve();
        });
      } finally {
        firstRefresh.resolve();
        secondRefresh.resolve();
        refetch.mockRestore();
      }
    },
  );

  it.each(['resolve', 'reject'] as const)(
    'does not let an older Recorder recovery settlement release the newer owner after %s',
    async (settlement) => {
      const oldRefresh = deferred<void>();
      const currentRefresh = deferred<void>();
      const unexpectedRefresh = deferred<void>();
      const refetch = jest
        .spyOn(QueryObserver.prototype, 'refetch')
        .mockReturnValueOnce(oldRefresh.promise as never)
        .mockReturnValueOnce(currentRefresh.promise as never)
        .mockReturnValueOnce(unexpectedRefresh.promise as never);
      mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 1));

      try {
        await renderScreen();
        await screen.findByText(QUESTION_1.questionText);
        const oldCallbacks = recorderProps();

        await act(async () => {
          oldCallbacks.onRecoveryUnresolved();
          await Promise.resolve();
        });
        expect(refetch).toHaveBeenCalledTimes(1);

        await act(async () =>
          oldCallbacks.onResult({
            passed: true,
            score: 88,
            transcript: 'accepted answer',
            feedback: 'accepted feedback',
            done: false,
            nextQuestion: QUESTION_2,
          }),
        );
        await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
        expect(screen.getByText(QUESTION_2.questionText)).toBeTruthy();
        const currentCallbacks = recorderProps();

        await act(async () => {
          currentCallbacks.onRecoveryUnresolved();
          await Promise.resolve();
        });
        expect(refetch).toHaveBeenCalledTimes(2);

        await act(async () => {
          if (settlement === 'resolve') oldRefresh.resolve();
          else oldRefresh.reject(new Error('older recovery failure'));
          await Promise.resolve();
          await Promise.resolve();
        });
        await act(async () => {
          currentCallbacks.onRecoveryUnresolved();
          await Promise.resolve();
        });
        expect(refetch).toHaveBeenCalledTimes(2);

        currentRefresh.resolve();
        await act(async () => {
          await Promise.resolve();
        });
      } finally {
        oldRefresh.resolve();
        currentRefresh.resolve();
        unexpectedRefresh.resolve();
        refetch.mockRestore();
      }
    },
  );

  it('navigates to the settings screen from the account action', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('header.settings') }),
      { borderColor: colors.primary, justifyContent: 'center', minHeight: layout.minimumTarget },
      { backgroundColor: colors.primaryLight },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does not let a queued logout run after Settings owns the diagnostic action', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();
    const openSettings = capturedPressHandler(t('header.settings'));
    const logOut = capturedPressHandler(t('common.logOut'));

    await act(async () => {
      openSettings();
      void logOut();
      await Promise.resolve();
    });

    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');
    expect(mockAuthValue.logout).not.toHaveBeenCalled();

    await blurScreen();
    await focusScreen();
    await act(async () => {
      void logOut();
      await Promise.resolve();
    });
    expect(mockAuthValue.logout).toHaveBeenCalledTimes(1);
  });

  it('blocks Settings behind logout and releases the action claim after failure', async () => {
    let rejectLogout!: (reason: Error) => void;
    const pendingLogout = new Promise<void>((_resolve, reject) => {
      rejectLogout = reject;
    });
    const logout = jest.fn(() => pendingLogout);
    mockAuthValue = makeAuth({ logout });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();
    const openSettings = capturedPressHandler(t('header.settings'));
    const logOut = capturedPressHandler(t('common.logOut'));

    await act(async () => {
      void logOut();
      openSettings();
      await Promise.resolve();
    });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: true });

    await act(async () => {
      rejectLogout(new Error('offline'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(alertSpy).toHaveBeenCalledWith(t('logout.failedTitle'), t('logout.failedBody'));

    await act(async () => openSettings());
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');
  });

  it('rejects a logout handler after its render lease is synchronously invalidated', async () => {
    const renderLease = { owner: 'diagnostic-account-actions' } as never;
    let currentLease: unknown = renderLease;
    const logout = jest.fn();
    mockAuthValue = makeAuth({
      logout,
      captureSessionLease: jest.fn(() => currentLease as never),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();
    const staleLogout = capturedPressHandler(t('common.logOut'));

    currentLease = { owner: 'replacement-session' };
    await act(async () => {
      void staleLogout();
      await Promise.resolve();
    });

    expect(logout).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('does not start a recorder take while logout is in flight', async () => {
    const logoutRequest = deferred<void>();
    const logout = jest.fn(() => logoutRequest.promise);
    mockAuthValue = makeAuth({ logout });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();
    const logOut = capturedPressHandler(t('common.logOut'));
    const startBlocked = recorderProps().isStartBlocked;
    expect(startBlocked?.()).toBe(false);
    let blockedDuringLogout = false;

    await act(async () => {
      void logOut();
      blockedDuringLogout = startBlocked?.() ?? false;
      await Promise.resolve();
    });
    expect(logout).toHaveBeenCalledTimes(1);
    // The ref-backed guard flips in the same frame as the tap, before React
    // commits the busy state — the exact event-time race the practice screen
    // fences the same way.
    expect(blockedDuringLogout).toBe(true);
    expect(recorderProps().disabled).toBe(true);

    await act(async () => {
      logoutRequest.resolve(undefined);
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(startBlocked?.()).toBe(false));
    expect(recorderProps().disabled).toBe(false);
  });

  it('logs out from the dedicated account action and returns to the gate', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('common.logOut') }),
      { borderColor: colors.primary, justifyContent: 'center', minHeight: layout.minimumTarget },
      { backgroundColor: colors.primaryLight },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.logout).toHaveBeenCalled();
  });

  it('dedupes same-frame logout taps and releases the latch after a failure', async () => {
    let rejectFirst!: (reason: Error) => void;
    const firstLogout = new Promise<void>((_resolve, reject) => {
      rejectFirst = reject;
    });
    const logout = jest.fn().mockReturnValueOnce(firstLogout).mockResolvedValueOnce(undefined);
    mockAuthValue = makeAuth({ logout });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();
    const pressLogout = capturedPressHandler(t('common.logOut'));

    await act(async () => {
      void pressLogout();
      void pressLogout();
      await Promise.resolve();
    });
    expect(logout).toHaveBeenCalledTimes(1);

    await act(async () => {
      rejectFirst(new Error('offline'));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(alertSpy).toHaveBeenCalledWith(t('logout.failedTitle'), t('logout.failedBody'));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
  });

  it('does not navigate after a pending logout resolves while the diagnostic is blurred', async () => {
    const pendingLogout = deferred<void>();
    const logout = jest.fn(() => pendingLogout.promise);
    mockAuthValue = makeAuth({ logout });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    expect(logout).toHaveBeenCalledTimes(1);
    await blurScreen();
    pendingLogout.resolve();
    await act(async () => {
      await pendingLogout.promise;
      await Promise.resolve();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('drops a pending logout failure after its strict session lease expires without a rerender', async () => {
    const pendingLogout = deferred<void>();
    const leaseA = { owner: 'logout-lease-a' } as never;
    let currentLease: unknown = leaseA;
    const logout = jest.fn(() => pendingLogout.promise);
    mockAuthValue = makeAuth({
      logout,
      captureSessionLease: jest.fn(() => leaseA),
      isSessionLeaseCurrent: jest.fn((lease: SessionLease) => lease === currentLease),
    });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));
    expect(logout).toHaveBeenCalledTimes(1);
    currentLease = { owner: 'logout-lease-b' };
    pendingLogout.reject(new Error('late offline failure'));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('alerts when logout fails', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new Error('offline')),
    });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(t('logout.failedTitle'), t('logout.failedBody')),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('reports a cleanup failure after logout without leaving the screen', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new LogoutCleanupError()),
    });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await fireEvent.press(screen.getByRole('button', { name: t('common.logOut') }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        t('logout.cleanupTitle'),
        t('auth.logoutCleanupFailed'),
      ),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('locks account actions while a recording or submission is active', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    // Every locked control explains why it is locked, not just that it is.
    const hint = t('hint.finishRecordingFirst');
    const account = screen.getByRole('button', { name: t('header.settings') });
    expect(account.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(account.props.accessibilityHint).toBe(hint);
    expect(flattenedStyle(account)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(account);
    expect(mockRouter.push).not.toHaveBeenCalled();

    const logout = screen.getByRole('button', { name: t('common.logOut') });
    expect(logout.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(logout.props.accessibilityHint).toBe(hint);
    expect(flattenedStyle(logout)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(logout);
    expect(mockAuthValue.logout).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityHint,
    ).toBeUndefined();
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityHint,
    ).toBeUndefined();
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('header.settings') })).opacity,
    ).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');
  });

  it('releases account exits while a recovery is parked', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    await act(async () => {
      recorderProps().onInteractionLockChange?.(true);
      recorderProps().onExitLockChange?.(false);
    });

    expect(
      screen.getByRole('button', { name: t('header.settings') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    expect(
      screen.getByRole('button', { name: t('common.logOut') }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/settings');
  });

  it('rejects captured account actions immediately after the Recorder acquires its lock', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();
    const openSettings = capturedPressHandler(t('header.settings'));
    const logOut = capturedPressHandler(t('common.logOut'));

    await act(async () => {
      recorderProps().onInteractionLockChange?.(true);
      void openSettings();
      void logOut();
    });

    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockAuthValue.logout).not.toHaveBeenCalled();
  });

  it('consumes the Android hardware back press so the diagnostic is never popped', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const rendered = await renderScreen();
    await startFreshTest();

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
    expect(pressHardwareBack()).toBe(true);
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await rendered.unmount();
    expect(backSubscriptionRemove).toHaveBeenCalled();
  });
});

describe('diagnostic presentation', () => {
  /** The scrollable, vertically centred column the pre-question states sit in. */
  const CENTERED_STATE = {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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

  const CARD = {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  };

  const CARD_LABEL = {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
  };

  /** Shared by the intro card headline and the saved-answer headline. */
  const CARD_TITLE = {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  };

  const INTRO_LINE = {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  };

  /** Full-width brand CTA, spaced off the card it closes. */
  const PRIMARY_ACTION = {
    minHeight: layout.minimumTarget,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    // The shared primary button's hard bottom edge (see Button).
    shadowColor: colors.shadow,
    shadowOpacity: 0.28,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  };

  it('centres the preparing state on the page tokens', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen();

    const preparing = screen.getByText(t('diag.preparing'));
    expect(flattenedStyle(preparing)).toEqual(MUTED_BODY);
    expect(scrollContentStyle()).toEqual(CENTERED_STATE);
  });

  it('centres the load failure on the page tokens', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen();

    const title = await screen.findByText(t('diag.loadFailedTitle'));
    expect(flattenedStyle(title)).toEqual({
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    });
    expect(scrollContentStyle()).toEqual(CENTERED_STATE);
    expect(flattenedStyle(screen.getByText(t('error.serverBusy')))).toEqual(MUTED_BODY);
    expect(flattenedStyle(screen.getByRole('button', { name: t('common.tryAgain') }))).toEqual(
      PRIMARY_ACTION,
    );
  });

  it('lays the intro card out on the shared page tokens', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    const introTitle = await screen.findByText(t('diag.introTitle'));

    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      padding: layout.screenPadding,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.background,
    });
    expect(screen.queryByText(t('header.diagnostic'))).toBeNull();
    const accountActions = parentOf(screen.getByRole('button', { name: t('header.settings') }));
    expect(flattenedStyle(accountActions)).toEqual({
      alignSelf: 'stretch',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
    });
    expect(flattenedStyle(introTitle)).toEqual(CARD_TITLE);
    const introCard = parentOf(introTitle);
    expect(flattenedStyle(introCard)).toEqual(CARD);
    expect(parentOf(introCard)).toBe(parentOf(accountActions));
    expect(parentOf(introCard).children.indexOf(introCard)).toBeLessThan(
      parentOf(accountActions).children.indexOf(accountActions),
    );
    for (const line of [
      t('diag.introWhat'),
      t('diag.introCount', { count: 3 }),
      t('diag.introRecorded'),
      t('diag.introSpeakEnglish'),
    ]) {
      expect(flattenedStyle(screen.getByText(line))).toEqual(INTRO_LINE);
    }
    expect(flattenedStyle(screen.getByRole('button', { name: t('diag.introStart') }))).toEqual(
      PRIMARY_ACTION,
    );
  });

  it('renders the question card and its progress line from the tokens', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    expect(flattenedStyle(screen.getByText(t('diag.progress', { current: 1, max: 3 })))).toEqual({
      marginTop: spacing.xs,
      fontSize: 14,
      color: colors.muted,
    });
    const promptWord = screen.getByText('courage');
    expect(flattenedStyle(promptWord)).toEqual({
      marginTop: spacing.xs,
      fontSize: 30,
      fontWeight: '800',
      color: colors.primary,
    });
    const questionCard = parentOf(promptWord);
    expect(flattenedStyle(questionCard)).toEqual(CARD);
    expect(flattenedStyle(screen.getByText('Describe a time you showed courage.'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 18,
      lineHeight: 26,
      color: colors.text,
    });
    // Both halves of the card are named for the learner.
    expect(flattenedStyle(screen.getByText(t('label.word')))).toEqual(CARD_LABEL);
    expect(flattenedStyle(screen.getByText(t('label.question')))).toEqual(CARD_LABEL);
    const accountActions = parentOf(screen.getByRole('button', { name: t('header.settings') }));
    expect(parentOf(questionCard)).toBe(parentOf(accountActions));
    expect(parentOf(questionCard).children.indexOf(questionCard)).toBeLessThan(
      parentOf(accountActions).children.indexOf(accountActions),
    );
  });

  it('renders the checked-answer detail card from the tokens', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();
    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 88,
        transcript: 'An answer.',
        feedback: 'Great answer.',
        done: false,
        nextQuestion: QUESTION_2,
      }),
    );

    const savedTitle = screen.getByText(t('diag.answerCheckedTitle'));
    expect(flattenedStyle(savedTitle)).toEqual(CARD_TITLE);
    expect(flattenedStyle(parentOf(savedTitle))).toEqual({
      marginTop: spacing.xl,
      borderRadius: radii.card,
      padding: spacing.lg,
      borderWidth: 1,
      backgroundColor: colors.card,
      borderColor: colors.border,
    });
    expect(
      flattenedStyle(
        screen.getByText(t('diag.scoreLine', { score: 88, result: t('diag.passed') })),
      ),
    ).toEqual({
      marginTop: spacing.md,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    });
    // The transcript renders through the shared word-tagged view: same
    // quotation-free fallback text, on the shared chip scale.
    expect(flattenedStyle(screen.getByText('An answer.'))).toEqual({
      marginTop: spacing.sm,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 27,
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByText('Great answer.'))).toEqual({
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    });
    expect(flattenedStyle(screen.getByRole('button', { name: t('diag.nextQuestion') }))).toEqual(
      PRIMARY_ACTION,
    );
  });

  it('lays the completion reveal out on the page tokens', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 2));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');
    await act(async () =>
      recorderProps().onResult({
        passed: true,
        score: 91,
        transcript: 'transcript',
        feedback: 'feedback',
        done: true,
        level: 'B2',
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.seeLevel') }));
    await screen.findByText(t('diag.completeTitle'));

    expect(scrollContentStyle()).toEqual({
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      backgroundColor: colors.background,
    });
    expect(
      flattenedStyle(
        screen.getByTestId('diagnostic-complete-badge', { includeHiddenElements: true }),
      ),
    ).toEqual({
      width: 84,
      height: 84,
      borderRadius: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      marginBottom: spacing.sm,
    });
    expect(screen.getByTestId('diagnostic-confetti', { includeHiddenElements: true })).toBeTruthy();
    expect(flattenedStyle(screen.getByText(t('diag.completeTitle')))).toEqual({
      marginTop: spacing.md,
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByText(t('diag.levelIntro')))).toEqual({
      marginTop: spacing.ml,
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
    });

    const levelBadgeText = screen.getByText('B2');
    expect(flattenedStyle(levelBadgeText)).toEqual({
      fontSize: 34,
      fontWeight: '800',
      color: colors.onPrimary,
    });
    expect(flattenedStyle(parentOf(levelBadgeText))).toEqual({
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radii.card,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xxl,
    });
    expect(flattenedStyle(screen.getByText(t('cefr.B2')))).toEqual({
      marginTop: spacing.sm,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });

    const answersTitle = screen.getByText(t('diag.answersTitle'));
    expect(flattenedStyle(answersTitle)).toEqual({
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    });
    // The reveal card stretches across the centred column it sits in.
    expect(flattenedStyle(parentOf(answersTitle))).toEqual({
      marginTop: spacing.lg,
      alignSelf: 'stretch',
      backgroundColor: colors.card,
      borderRadius: radii.card,
      padding: spacing.ml,
      borderWidth: 1,
      borderColor: colors.border,
    });
    expect(
      flattenedStyle(screen.getByText(t('diag.answerLine', { number: 1, score: 91, mark: '✓' }))),
    ).toEqual({
      marginTop: spacing.sm,
      fontSize: 15,
      color: colors.text,
    });

    expect(flattenedStyle(screen.getByText(t('diag.levelHint')))).toEqual({
      marginTop: spacing.ml,
      marginBottom: spacing.sm,
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    });
    expect(flattenedStyle(screen.getByRole('button', { name: t('diag.startPracticing') }))).toEqual(
      PRIMARY_ACTION,
    );
  });
});
