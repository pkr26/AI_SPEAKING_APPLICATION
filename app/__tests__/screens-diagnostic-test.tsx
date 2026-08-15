import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { Alert, BackHandler, StyleSheet } from 'react-native';

import DiagnosticScreen from '../src/app/diagnostic';
import { ApiError, apiFetch, userMessageForError } from '../src/lib/api';
import { LogoutCleanupError, type useAuth } from '../src/lib/auth';
import { translateFor, type MessageKey } from '../src/lib/i18n';
import { colors, layout } from '../src/lib/theme';
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
jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      dismissTo: jest.fn(),
    },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

// ----- Recorder stub (captures props; internals tested elsewhere) -----

interface CapturedRecorderProps {
  ownerId: string;
  questionId: string;
  endpoint: string;
  parseResult: (data: unknown) => DiagnosticAnswerResult;
  onResult: (data: DiagnosticAnswerResult) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
}

let mockRecorderProps: CapturedRecorderProps | null = null;

function MockRecorder(props: CapturedRecorderProps) {
  mockRecorderProps = props;
  return null;
}

jest.mock('../src/components/Recorder', () => ({
  __esModule: true,
  default: MockRecorder,
}));

// ----- auth mock -----

type AuthValue = ReturnType<typeof useAuth>;

const USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
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

function makeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    retrySessionRestore: jest.fn(),
    resetStoredSession: jest.fn(),
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

// ----- api mock -----

jest.mock('../src/lib/api', () => {
  const actual = jest.requireActual<typeof import('../src/lib/api')>('../src/lib/api');
  return {
    ...actual,
    apiFetch: jest.fn(),
    userMessageForError: jest.fn(actual.userMessageForError),
  };
});

const mockApiFetch = apiFetch as jest.Mock;
const mockUserMessageForError = jest.mocked(userMessageForError);
const mockRouter = jest.requireMock('expo-router').router as {
  push: jest.Mock;
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

function nextPayload(question: Question, asked: number) {
  return {
    done: false,
    question,
    progress: { asked, maxQuestions: 5 },
  };
}

// ----- helpers -----

let alertSpy: jest.SpyInstance;
let backHandlers: (() => boolean)[];
let backSubscriptionRemove: jest.Mock;

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
  if (!mockRecorderProps) throw new Error('Recorder was not rendered');
  return mockRecorderProps;
}

/** A fresh test (asked === 0) opens on the one-shot intro card; press Start. */
async function startFreshTest() {
  await fireEvent.press(await screen.findByRole('button', { name: t('diag.introStart') }));
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

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockReset();
  mockRecorderProps = null;
  mockAuthValue = makeAuth();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  backHandlers = [];
  backSubscriptionRemove = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler as () => boolean);
    return { remove: backSubscriptionRemove };
  });
});

afterEach(async () => {
  // Flush TanStack Query's batched notifications inside act().
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  // Cancel cache-gc timers so the jest process can exit promptly.
  for (const client of queryClients) client.clear();
  queryClients.length = 0;
  alertSpy.mockRestore();
});

describe('diagnostic screen', () => {
  it('shows a preparing message while the first question loads', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen();
    expect(screen.getByText(t('diag.preparing'))).toBeTruthy();
  });

  it('renders the question, progress, and wires the recorder', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const queryClient = makeQueryClient();
    await renderScreen(queryClient);

    await startFreshTest();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(mockUserMessageForError).not.toHaveBeenCalled();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByText(t('diag.progress', { current: 1, max: 5 }))).toBeTruthy();
    expect(screen.getByText(t('header.diagnostic'))).toBeTruthy();

    expect(recorderProps()).toMatchObject({
      ownerId: USER.id,
      questionId: QUESTION_1.id,
      endpoint: '/diagnostic/answer',
    });
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

  it('shows the one-shot localized intro before the first question of a fresh test', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();

    expect(await screen.findByText(t('diag.introTitle'))).toBeTruthy();
    expect(screen.getByText(t('diag.introWhat'))).toBeTruthy();
    expect(screen.getByText(t('diag.introCount', { count: 5 }))).toBeTruthy();
    expect(screen.getByText(t('diag.introRecorded'))).toBeTruthy();
    expect(screen.getByText(t('diag.introSpeakEnglish'))).toBeTruthy();
    // The question and recorder stay hidden until the learner starts.
    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(mockRecorderProps).toBeNull();

    await startFreshTest();

    expect(screen.queryByText(t('diag.introTitle'))).toBeNull();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(recorderProps().questionId).toBe(QUESTION_1.id);
  });

  it('skips the intro when resuming a test already in progress', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 2));
    await renderScreen();

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText(t('diag.introTitle'))).toBeNull();
    expect(screen.getByText(t('diag.progress', { current: 3, max: 5 }))).toBeTruthy();
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

      expect(screen.queryByText(t('diag.answerSavedTitle'))).toBeNull();
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
      expect(screen.getByText(t('diag.answerSavedTitle'))).toBeTruthy();
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
      expect(screen.queryByText(t('diag.answerSavedTitle'))).toBeNull();
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
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await startFreshTest();

    const result: DiagnosticAnswerResult = {
      passed: true,
      score: 88,
      transcript: 'I showed courage at work.',
      feedback: 'Well done.',
      done: false,
      nextQuestion: QUESTION_2,
    };
    await act(async () => recorderProps().onResult(result));

    expect(screen.getByText(t('diag.answerSavedTitle'))).toBeTruthy();
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
    expect(screen.getByText(t('diag.progress', { current: 2, max: 5 }))).toBeTruthy();
    expect(recorderProps().questionId).toBe(QUESTION_2.id);
  });

  it('reveals the level and completes the diagnostic', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 4));
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
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
    // The per-answer reveal lists this session's answers with pass marks.
    expect(screen.getByText(t('diag.answersTitle'))).toBeTruthy();
    expect(
      screen.getByText(t('diag.answerLine', { number: 1, score: 91, mark: '✓' })),
    ).toBeTruthy();
    // The celebration emoji is decorative: hidden from screen readers (and so
    // from default queries), while the headline carries the meaning.
    expect(screen.queryByText('🎉')).toBeNull();
    expect(screen.getByText('🎉', { includeHiddenElements: true }).props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    });

    await expectPressFeedback(
      () => screen.getByRole('button', { name: t('diag.startPracticing') }),
      {
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: colors.primary,
      },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: t('diag.startPracticing') }));
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({
      ...USER,
      diagnosticCompleted: true,
      cefrLevel: 'B2',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
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
    // Scores stay hidden mid-test; the saved card only acknowledges the answer.
    expect(screen.getByText(t('diag.answerSavedBody'))).toBeTruthy();
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

    expect(screen.getByText(t('diag.answerSavedTitle'))).toBeTruthy();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(mockRecorderProps?.questionId).toBe(QUESTION_1.id);
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
    expect(screen.getByText(t('diag.answerSavedTitle'))).toBeTruthy();

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

    expect(screen.getByText(t('diag.answerSavedTitle'))).toBeTruthy();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();

    // Continuing still advances locally from the acknowledged result.
    await fireEvent.press(screen.getByRole('button', { name: t('diag.nextQuestion') }));
    await waitFor(() => expect(mockRecorderProps?.questionId).toBe(QUESTION_2.id));
  });

  it('shows the completion view immediately when the test is already done', async () => {
    mockApiFetch.mockResolvedValue({ done: true, level: 'A2' });
    await renderScreen();

    expect(await screen.findByText(t('diag.completeTitle'))).toBeTruthy();
    expect(screen.getByText('A2')).toBeTruthy();
    expect(screen.queryByText(t('diag.answersTitle'))).toBeNull();
  });

  it('shows a retryable error when the question fails to load', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen();

    expect(await screen.findByText(t('diag.loadFailedTitle'))).toBeTruthy();
    expect(screen.getByText(t('error.serverBusy'))).toBeTruthy();
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
    expect(mockRouter.push).toHaveBeenCalledWith('/settings');
    expect(alertSpy).not.toHaveBeenCalled();
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
    const account = screen.getByRole('button', { name: t('header.settings') });
    expect(account.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(flattenedStyle(account)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(account);
    expect(mockRouter.push).not.toHaveBeenCalled();

    const logout = screen.getByRole('button', { name: t('common.logOut') });
    expect(logout.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(flattenedStyle(logout)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(logout);
    expect(mockAuthValue.logout).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(
      flattenedStyle(screen.getByRole('button', { name: t('header.settings') })).opacity,
    ).toBeUndefined();
    await fireEvent.press(screen.getByRole('button', { name: t('header.settings') }));
    expect(mockRouter.push).toHaveBeenCalledWith('/settings');
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
