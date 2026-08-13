import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import DiagnosticScreen from '../src/app/diagnostic';
import { ApiError, apiFetch } from '../src/lib/api';
import type { useAuth } from '../src/lib/auth';
import {
  parseDiagnosticAnswerResult,
  type DiagnosticAnswerResult,
  type Question,
  type User,
} from '../src/lib/types';

// ----- expo-router mock -----

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
  useFocusEffect: jest.fn(),
}));

// ----- Recorder stub (captures props; internals tested elsewhere) -----

interface CapturedRecorderProps {
  ownerId: string;
  questionId: string;
  endpoint: string;
  parseResult: (data: unknown) => DiagnosticAnswerResult;
  onResult: (data: DiagnosticAnswerResult) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
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

jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;
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

async function pressAlertButton(text: string) {
  const calls = alertSpy.mock.calls;
  const buttons = calls[calls.length - 1][2] as
    { text?: string; onPress?: () => void }[] | undefined;
  const button = buttons?.find((candidate) => candidate.text === text);
  if (!button?.onPress) throw new Error(`Alert button "${text}" not found`);
  await act(async () => button.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockReset();
  mockRecorderProps = null;
  mockAuthValue = makeAuth();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
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
    expect(screen.getByText('Preparing your diagnostic test…')).toBeTruthy();
  });

  it('renders the question, progress, and wires the recorder', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const queryClient = makeQueryClient();
    await renderScreen(queryClient);

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByText(/Question 1 of up to 5/)).toBeTruthy();
    expect(screen.getByText('Diagnostic Test')).toBeTruthy();

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

  it('does not request diagnostic state without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });

    await renderScreen();

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
  });

  it('removes a loaded question immediately when the authenticated user disappears', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    const rendered = await renderScreen();
    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();

    mockAuthValue = makeAuth({ user: null, sessionVersion: 2 });
    await rendered.rerenderScreen();

    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.queryByText('Diagnostic Test')).toBeNull();
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
    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();

    mockAuthValue = makeAuth({ user: OTHER_USER, sessionVersion: 2 });
    await rendered.rerenderScreen();

    expect(screen.queryByText('Describe a time you showed courage.')).toBeNull();
    expect(screen.getByText('Preparing your diagnostic test…')).toBeTruthy();

    await act(async () => resolveOtherQuestion(nextPayload(QUESTION_2, 0)));
    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
    expect(recorderProps()).toMatchObject({
      ownerId: OTHER_USER.id,
      questionId: QUESTION_2.id,
    });
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
      expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
      const staleCallbacks = recorderProps();

      mockAuthValue = makeAuth({
        user: boundary === 'account' ? OTHER_USER : USER,
        sessionVersion: boundary === 'account' ? 1 : 2,
      });
      await rendered.rerenderScreen();
      await act(async () => resolveCurrentQuestion(nextPayload(QUESTION_2, 0)));
      expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
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

      expect(screen.queryByText('Answer received')).toBeNull();
      expect(screen.getByText('Tell me about a memorable journey.')).toBeTruthy();
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockApiFetch).toHaveBeenCalledTimes(callsBeforeStaleRecovery);

      await act(async () => {
        currentCallbacks.onError('current upload failure');
        currentCallbacks.onRecoveryUnresolved();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not assess your answer',
        'current upload failure',
      );
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
      expect(screen.getByText('Answer received')).toBeTruthy();
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
      expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
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
      const staleAdvance = capturedPressHandler('Next Question');

      const nextSetUser = jest.fn();
      mockAuthValue = makeAuth({
        user: boundary === 'account' ? OTHER_USER : USER,
        sessionVersion: boundary === 'account' ? 1 : 2,
        setUser: nextSetUser,
      });
      await rendered.rerenderScreen();
      expect(screen.getByText('Preparing your diagnostic test…')).toBeTruthy();
      const callsBeforeStaleAdvance = mockApiFetch.mock.calls.length;

      await act(async () => {
        await staleAdvance();
      });

      expect(screen.getByText('Preparing your diagnostic test…')).toBeTruthy();
      expect(screen.queryByText('Tell me about a memorable journey.')).toBeNull();
      expect(screen.queryByText('Answer received')).toBeNull();
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
      expect(await screen.findByText('Diagnostic complete!')).toBeTruthy();
      const staleStartPracticing = capturedPressHandler('Start Practicing');
      const originalSetUser = mockAuthValue.setUser;

      const nextSetUser = jest.fn();
      mockAuthValue = makeAuth({
        user: boundary === 'account' ? OTHER_USER : USER,
        sessionVersion: boundary === 'account' ? 1 : 2,
        setUser: nextSetUser,
      });
      await rendered.rerenderScreen();
      expect(screen.getByText('Preparing your diagnostic test…')).toBeTruthy();
      const callsBeforeStaleStart = mockApiFetch.mock.calls.length;
      invalidateSpy.mockClear();

      await act(async () => {
        await staleStartPracticing();
      });

      expect(screen.getByText('Preparing your diagnostic test…')).toBeTruthy();
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
    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
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
    await screen.findByText('Describe a time you showed courage.');

    const result: DiagnosticAnswerResult = {
      passed: true,
      score: 88,
      transcript: 'I showed courage at work.',
      feedback: 'Well done.',
      done: false,
      nextQuestion: QUESTION_2,
    };
    await act(async () => recorderProps().onResult(result));

    expect(screen.getByText('Answer received')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Next Question' }));

    expect(await screen.findByText('Tell me about a memorable journey.')).toBeTruthy();
    expect(screen.getByText('journey')).toBeTruthy();
    expect(screen.getByText(/Question 2 of up to 5/)).toBeTruthy();
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
    await fireEvent.press(screen.getByRole('button', { name: 'See My Level' }));

    expect(await screen.findByText('Diagnostic complete!')).toBeTruthy();
    expect(screen.getByText('Your English level is')).toBeTruthy();
    expect(screen.getByText('B2')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Start Practicing' }));
    expect(mockAuthValue.setUser).toHaveBeenCalledWith({
      ...USER,
      diagnosticCompleted: true,
      cefrLevel: 'B2',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('does not complete the profile when the user disappears before acknowledgement', async () => {
    mockApiFetch.mockResolvedValue({ done: true, level: 'B2' });
    const rendered = await renderScreen();
    expect(await screen.findByText('Diagnostic complete!')).toBeTruthy();
    const originalSetUser = mockAuthValue.setUser;

    mockAuthValue = makeAuth({ user: null, sessionVersion: 2 });
    await rendered.rerenderScreen();
    expect(screen.queryByRole('button', { name: 'Start Practicing' })).toBeNull();

    expect(originalSetUser).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('wires the diagnostic answer parser into the recorder', async () => {
    // The screen chooses which response contract the recorder parses with; a
    // swapped parser breaks the flow at runtime, so pin the wiring.
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    expect(recorderProps().parseResult).toBe(parseDiagnosticAnswerResult);
  });

  it('keeps the current result visible when an incomplete result has no next question', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    await act(async () =>
      recorderProps().onResult({
        passed: false,
        score: 40,
        transcript: 'An answer.',
        feedback: 'Try again.',
        done: false,
      }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Next Question' }));

    expect(screen.getByText('Answer received')).toBeTruthy();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(mockRecorderProps?.questionId).toBe(QUESTION_1.id);
  });

  it('shows the completion view immediately when the test is already done', async () => {
    mockApiFetch.mockResolvedValue({ done: true, level: 'A2' });
    await renderScreen();

    expect(await screen.findByText('Diagnostic complete!')).toBeTruthy();
    expect(screen.getByText('A2')).toBeTruthy();
  });

  it('shows a retryable error when the question fails to load', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen();

    expect(await screen.findByText("Couldn't load the test")).toBeTruthy();
    expect(
      screen.getByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('falls back to generic copy for non-API load errors', async () => {
    mockApiFetch.mockRejectedValue(new Error('parse failure'));
    await renderScreen();

    expect(
      await screen.findByText('Could not load the diagnostic test. Please try again.'),
    ).toBeTruthy();
  });

  it('surfaces recorder errors through an alert', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onError('upload failed'));
    expect(alertSpy).toHaveBeenCalledWith('Could not assess your answer', 'upload failed');
  });

  it('refetches server state when recorder recovery is unresolved', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      recorderProps().onRecoveryUnresolved();
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('opens the account menu and navigates to settings screens', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Account & privacy' }));
    expect(alertSpy).toHaveBeenCalledWith('Account & privacy', undefined, [
      { text: 'Change Password', onPress: expect.any(Function) },
      { text: 'Delete Account', style: 'destructive', onPress: expect.any(Function) },
      { text: 'Cancel', style: 'cancel' },
    ]);

    await pressAlertButton('Change Password');
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/change-password');

    await pressAlertButton('Delete Account');
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/delete-account');
  });

  it('logs out from the dedicated account action and returns to the gate', async () => {
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.logout).toHaveBeenCalled();
  });

  it('alerts when logout fails', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new Error('offline')),
    });
    mockApiFetch.mockResolvedValue(nextPayload(QUESTION_1, 0));
    await renderScreen();
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not log out',
        'Check your connection and try again.',
      ),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
