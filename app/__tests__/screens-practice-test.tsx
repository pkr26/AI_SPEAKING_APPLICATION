import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AttemptScreen from '../src/app/practice/attempt';
import FeedbackScreen from '../src/app/practice/feedback';
import HelpScreen from '../src/app/practice/help';
import PracticeScreen from '../src/app/practice/index';
import { ApiError, apiFetch } from '../src/lib/api';
import { LogoutCleanupError, useAuth } from '../src/lib/auth';
import type { usePracticeFlow } from '../src/lib/practice-flow';
import type { AttemptResult, Question, User } from '../src/lib/types';

// ----- expo-router mock -----

let mockSearchParams: Record<string, string | string[] | undefined> = {};

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
  },
  useLocalSearchParams: () => mockSearchParams,
  useFocusEffect: jest.fn(),
}));

// ----- Recorder stub -----

interface CapturedRecorderProps {
  ownerId: string;
  questionId: string;
  endpoint: string;
  parseResult: (data: unknown) => AttemptResult;
  onResult: (data: AttemptResult) => void;
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
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

let mockAuthValue: AuthValue;

function makeAuth(overrides: Partial<AuthValue> = {}): AuthValue {
  return {
    token: 'token-abc',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
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

function makePracticeFlow(
  overrides: Partial<PracticeFlowValue> = {},
): PracticeFlowValue {
  return {
    feedback: null,
    showFeedback: jest.fn(),
    clearFeedback: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/practice-flow', () => ({
  usePracticeFlow: () => mockPracticeFlow,
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
  back: jest.Mock;
  dismissTo: jest.Mock;
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
  ],
};

const PASSED_RESULT: AttemptResult = {
  passed: true,
  attemptNo: 1,
  score: 92,
  transcript: 'I enjoy reading.',
  feedback: 'Nice work.',
  nextQuestion: NEXT_QUESTION,
};

// ----- helpers -----

let alertSpy: jest.SpyInstance;

const queryClients: QueryClient[] = [];

function makeQueryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(client);
  return client;
}

function renderScreen(ui: React.ReactElement, queryClient?: QueryClient) {
  const client = queryClient ?? makeQueryClient();
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

function recorderProps(): CapturedRecorderProps {
  if (!mockRecorderProps) throw new Error('Recorder was not rendered');
  return mockRecorderProps;
}

async function pressAlertButton(text: string) {
  const calls = alertSpy.mock.calls;
  const buttons = calls[calls.length - 1][2] as
    | { text?: string; onPress?: () => void }[]
    | undefined;
  const button = buttons?.find((candidate) => candidate.text === text);
  if (!button?.onPress) throw new Error(`Alert button "${text}" not found`);
  await act(async () => button.onPress?.());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockReset();
  mockRecorderProps = null;
  mockSearchParams = {};
  mockAuthValue = makeAuth();
  mockPracticeFlow = makePracticeFlow();
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

describe('practice home screen', () => {
  it('shows a loading state while the question loads', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<PracticeScreen />);
    expect(screen.getByText('Loading your question…')).toBeTruthy();
    expect(screen.getByText(`Hi, ${USER.name}`)).toBeTruthy();
  });

  it('renders the question and wires the recorder', async () => {
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);

    expect(
      await screen.findByText('Describe a time you showed courage.'),
    ).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByText('B1')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/practice/question',
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(recorderProps()).toMatchObject({
      ownerId: USER.id,
      questionId: QUESTION.id,
      endpoint: '/practice/attempt',
    });
  });

  it('forwards recorder results to the practice flow and feedback route', async () => {
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onResult(PASSED_RESULT));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(
      QUESTION.id,
      PASSED_RESULT,
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('surfaces recorder errors through an alert', async () => {
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onError('upload failed'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Could not assess your answer',
      'upload failed',
    );
  });

  it('refetches the question when recorder recovery is unresolved', async () => {
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => {
      recorderProps().onRecoveryUnresolved();
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('navigates to help for the current question', async () => {
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByLabelText('Help for this question'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id },
    });
  });

  it('shows a retryable error when the question fails to load', async () => {
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText("Couldn't load a question")).toBeTruthy();
    expect(
      screen.getByText(
        'The service is temporarily unavailable. Please try again later.',
      ),
    ).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('opens the settings menu and navigates to settings screens', async () => {
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(alertSpy).toHaveBeenCalledWith(
      'Settings',
      undefined,
      expect.any(Array),
    );

    await pressAlertButton('Change Password');
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/change-password');

    await pressAlertButton('Delete Account');
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/delete-account');
  });

  it('logs out and returns to the gate', async () => {
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    expect(mockAuthValue.logout).toHaveBeenCalled();
  });

  it('reports a cleanup failure after logout', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new LogoutCleanupError()),
    });
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Logged out',
        expect.stringContaining('logged out'),
      ),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('reports a generic logout failure', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new Error('offline')),
    });
    mockApiFetch.mockResolvedValue({ question: QUESTION });
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not log out',
        'Could not revoke the server session. Check your connection and try again.',
      ),
    );
  });
});

describe('practice attempt screen', () => {
  it('rejects an invalid question link', async () => {
    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<AttemptScreen />);

    expect(screen.getByText('Invalid question link')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to Practice' }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('shows a loading state while the question loads', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<AttemptScreen />);
    expect(screen.getByText('Loading question…')).toBeTruthy();
  });

  it('renders the question and wires the recorder for the attempt endpoint', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);

    expect(
      await screen.findByText('Describe a time you showed courage.'),
    ).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/practice/question/${QUESTION.id}/help`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(recorderProps()).toMatchObject({
      ownerId: USER.id,
      questionId: QUESTION.id,
      endpoint: '/practice/attempt',
    });
    // Practice Mode deliberately hides translations and examples.
    expect(screen.queryByText('ధైర్యం')).toBeNull();
  });

  it('forwards results to the practice flow and feedback route', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onResult(PASSED_RESULT));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(
      QUESTION.id,
      PASSED_RESULT,
    );
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('invalidates the practice question and exits when recovery is unresolved', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<AttemptScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onRecoveryUnresolved());
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['practice-question', USER.id, USER.cefrLevel],
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
  });

  it('shows a retryable error when the question fails to load', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<AttemptScreen />);

    expect(
      await screen.findByText("Couldn't load the question"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'The service is temporarily unavailable. Please try again later.',
      ),
    ).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});

describe('practice feedback screen', () => {
  it('handles missing feedback with a way back to practice', async () => {
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('No result to show')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to Practice' }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
  });

  it('renders the passed variant and seeds the next question', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(screen.getByText('Great job!')).toBeTruthy();
    expect(screen.getByText('You passed this question.')).toBeTruthy();
    expect(screen.getByText('92')).toBeTruthy();
    expect(screen.getByText('We heard')).toBeTruthy();
    expect(screen.getByText('“I enjoy reading.”')).toBeTruthy();
    expect(screen.getByText('Feedback')).toBeTruthy();
    expect(screen.getByText('Nice work.')).toBeTruthy();

    await fireEvent.press(
      screen.getByRole('button', { name: 'Next Question' }),
    );
    expect(
      queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel]),
    ).toEqual({ question: NEXT_QUESTION });
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('invalidates the practice question when no next question is provided', async () => {
    const { nextQuestion: _next, ...result } = PASSED_RESULT;
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Next Question' }),
    );
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
          passed: false,
          attemptNo: 2,
          attemptsLeft: 1,
          score: 40,
          transcript: '',
          feedback: 'Keep practicing.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('Not quite — attempt 2 of 3')).toBeTruthy();
    expect(
      screen.getByText(/1 attempt left\. Review the feedback and try again\./),
    ).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    // Empty transcripts are hidden.
    expect(screen.queryByText('We heard')).toBeNull();
    expect(screen.getByText('Keep practicing.')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('pluralizes remaining attempts', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 55,
          transcript: 'some words',
          feedback: 'Almost there.',
        },
      },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('Not quite — attempt 1 of 3')).toBeTruthy();
    expect(screen.getByText(/2 attempts left/)).toBeTruthy();
    expect(screen.getByText('We heard')).toBeTruthy();
  });

  it('renders the final variant with final feedback', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
          passed: false,
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

    expect(screen.getByText('Out of attempts')).toBeTruthy();
    expect(
      screen.getByText("Here's what to work on before the next question."),
    ).toBeTruthy();
    expect(screen.getByText('Final feedback')).toBeTruthy();
    expect(screen.getByText('Final words.')).toBeTruthy();
    expect(screen.queryByText('Regular feedback.')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Next Question' }),
    ).toBeTruthy();
  });

  it('does not navigate when the user is missing', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(
      screen.getByRole('button', { name: 'Next Question' }),
    );
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });
});

describe('practice help screen', () => {
  it('rejects an invalid question link', async () => {
    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<HelpScreen />);

    expect(screen.getByText('Invalid question link')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to Practice' }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('shows a loading state while help loads', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<HelpScreen />);
    expect(screen.getByText('Loading help…')).toBeTruthy();
  });

  it('renders the word, question, and bilingual examples', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);

    expect(await screen.findByText('Word')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByText('ధైర్యం')).toBeTruthy();
    expect(screen.getByText('Question')).toBeTruthy();
    expect(
      screen.getByText('Describe a time you showed courage.'),
    ).toBeTruthy();
    expect(
      screen.getByText('మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.'),
    ).toBeTruthy();
    expect(screen.getByText('Example sentences')).toBeTruthy();
    expect(screen.getByText('Example 1')).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.getByText('ఆమె పనిలో ధైర్యం చూపింది.')).toBeTruthy();
    expect(screen.getByText('Example 2')).toBeTruthy();
    expect(screen.getByText('It takes courage to speak up.')).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith(
      `/practice/question/${QUESTION.id}/help`,
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('navigates to practice mode for the same question', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);
    await screen.findByText('Word');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Start Practice' }),
    );
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/attempt',
      params: { questionId: QUESTION.id },
    });
  });

  it('shows a retryable error when help fails to load', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new ApiError(500, 'boom'));
    await renderScreen(<HelpScreen />);

    expect(await screen.findByText("Couldn't load help")).toBeTruthy();
    expect(
      screen.getByText(
        'The service is temporarily unavailable. Please try again later.',
      ),
    ).toBeTruthy();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});
