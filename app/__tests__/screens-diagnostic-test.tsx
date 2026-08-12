import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import DiagnosticScreen from '../src/app/diagnostic';
import { ApiError, apiFetch } from '../src/lib/api';
import type { useAuth } from '../src/lib/auth';
import type { DiagnosticAnswerResult, Question, User } from '../src/lib/types';

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

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>
      <DiagnosticScreen />
    </QueryClientProvider>,
  );
}

function recorderProps(): CapturedRecorderProps {
  if (!mockRecorderProps) throw new Error('Recorder was not rendered');
  return mockRecorderProps;
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
    await renderScreen();

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
    await renderScreen();
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
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
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
    expect(alertSpy).toHaveBeenCalledWith('Account & privacy', undefined, expect.any(Array));
    const buttons = alertSpy.mock.calls.at(-1)?.[2] as { text?: string }[];
    expect(buttons).toHaveLength(3);
    expect(buttons).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'Cancel' })]));

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
