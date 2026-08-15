import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { TestInstance } from 'test-renderer';
import React from 'react';
import { Alert, BackHandler, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AttemptScreen from '../src/app/practice/attempt';
import FeedbackScreen from '../src/app/practice/feedback';
import HelpScreen from '../src/app/practice/help';
import PracticeScreen from '../src/app/practice/index';
import { ApiError, apiFetch } from '../src/lib/api';
import { LogoutCleanupError, useAuth } from '../src/lib/auth';
import type { usePracticeFlow } from '../src/lib/practice-flow';
import { colors, layout } from '../src/lib/theme';
import {
  parseAttemptResult,
  parseNativeAttemptResult,
  type AttemptResult,
  type NativeAttemptResult,
  type PracticeOutcome,
  type PracticeQuestionPayload,
  type Question,
  type User,
} from '../src/lib/types';

// ----- expo-router mock -----

let mockSearchParams: Record<string, string | string[] | undefined> = {};

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
    useLocalSearchParams: () => mockSearchParams,
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

// ----- Recorder stub -----

interface CapturedRecorderProps {
  ownerId: string;
  questionId: string;
  endpoint: string;
  parseResult: (data: unknown) => PracticeOutcome;
  onResult: (data: PracticeOutcome) => void;
  onError: (message: string) => void;
  onRecoveryUnresolved: () => void;
  onInteractionLockChange?: (locked: boolean) => void;
  onRecoveryEndpointMismatch?: (
    endpoint: '/diagnostic/answer' | '/practice/attempt' | '/practice/attempt/native',
  ) => boolean;
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

// ----- practice flow mock -----

type PracticeFlowValue = ReturnType<typeof usePracticeFlow>;

let mockPracticeFlow: PracticeFlowValue;

function makePracticeFlow(overrides: Partial<PracticeFlowValue> = {}): PracticeFlowValue {
  return {
    answerMode: 'english',
    feedback: null,
    setAnswerMode: jest.fn(),
    showFeedback: jest.fn(),
    clearFeedback: jest.fn(),
    ...overrides,
  };
}

jest.mock('../src/lib/practice-flow', () => ({
  ...jest.requireActual('../src/lib/practice-flow'),
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
};

const NEXT_PRACTICE_QUESTION: PracticeQuestionPayload = {
  question: NEXT_QUESTION,
  kind: 'new',
  progress: { masteredCount: 3, learningCount: 1, totalAtLevel: 8 },
};

const PASSED_RESULT: AttemptResult = {
  passed: true,
  mastered: false,
  attemptNo: 1,
  score: 72,
  transcript: 'I enjoy reading.',
  feedback: 'Nice work.',
  next: NEXT_PRACTICE_QUESTION,
};

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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClients.push(client);
  return client;
}

function renderScreen(ui: React.ReactElement, queryClient?: QueryClient, bottomInset = 0) {
  const client = queryClient ?? makeQueryClient();
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: bottomInset },
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

function buttonContainerPaddingBottom(name: string): unknown {
  const parent = screen.getByRole('button', { name }).parent;
  if (!parent) throw new Error(`Button "${name}" has no container`);
  return StyleSheet.flatten(parent.props.style)?.paddingBottom;
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
  mockSearchParams = {};
  mockAuthValue = makeAuth();
  mockPracticeFlow = makePracticeFlow();
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

describe('practice home screen', () => {
  it('shows a loading state while the question loads', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<PracticeScreen />);
    expect(screen.getByText('Loading your question…')).toBeTruthy();
    expect(screen.getByText(`Hi, ${USER.name}`)).toBeTruthy();
  });

  it('keeps footer actions above a larger device safe-area inset', async () => {
    mockApiFetch.mockReturnValue(new Promise(() => undefined));
    await renderScreen(<PracticeScreen />, undefined, 34);

    expect(buttonContainerPaddingBottom('Settings')).toBe(34);
  });

  it('renders the question and wires the recorder', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
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
    // The screen chooses which response contract the recorder parses with; a
    // swapped parser breaks the flow at runtime, so pin the wiring.
    expect(recorderProps().parseResult).toBe(parseAttemptResult);
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

  it('shows the new-word badge and progress line for a fresh word', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText('New word')).toBeTruthy();
    expect(screen.getByText('2 of 8 words mastered · 1 in revision')).toBeTruthy();
  });

  it('shows the revision badge and hides a zero revision count', async () => {
    mockApiFetch.mockResolvedValue({
      question: QUESTION,
      kind: 'revision',
      progress: { masteredCount: 4, learningCount: 0, totalAtLevel: 12 },
    });
    await renderScreen(<PracticeScreen />);

    expect(await screen.findByText('Revision')).toBeTruthy();
    expect(screen.getByText('4 of 12 words mastered')).toBeTruthy();
    expect(screen.queryByText(/in revision/)).toBeNull();
  });

  it('starts in English and requests native mode from the language toggle', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText('Answer in my language')).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt');
    expect(recorderProps().parseResult).toBe(parseAttemptResult);
    expect(
      screen.getByRole('switch', { name: 'Answer in my language' }).props.accessibilityState,
    ).toEqual({ checked: false, disabled: false });

    await fireEvent.press(screen.getByRole('switch', { name: 'Answer in my language' }));
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

    expect(screen.getByText('Answering in your language — tap for English')).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt/native');
    expect(recorderProps().parseResult).toBe(parseNativeAttemptResult);
    expect(
      screen.getByRole('switch', { name: 'Answer in my language' }).props.accessibilityState,
    ).toEqual({ checked: true, disabled: false });
    await fireEvent.press(screen.getByRole('switch', { name: 'Answer in my language' }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');

    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenLastCalledWith('english');
  });

  it('locks the language switch while a recording or submission is active', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const toggle = screen.getByRole('switch', { name: 'Answer in my language' });
    expect(toggle.props.accessibilityState).toEqual({ checked: false, disabled: true });
    await fireEvent.press(toggle);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    await fireEvent.press(screen.getByRole('switch', { name: 'Answer in my language' }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');
  });

  it('locks help and footer actions while a recording or submission is active', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const help = screen.getByLabelText('Help for this question');
    expect(help.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenedStyle(help)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(help);
    expect(mockRouter.push).not.toHaveBeenCalled();

    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(settings.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenedStyle(settings)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(settings);
    expect(alertSpy).not.toHaveBeenCalled();

    const logout = screen.getByRole('button', { name: 'Log out' });
    expect(logout.props.accessibilityState).toEqual({ disabled: true });
    expect(flattenedStyle(logout)).toMatchObject({ opacity: 0.5 });
    await fireEvent.press(logout);
    expect(mockAuthValue.logout).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(flattenedStyle(screen.getByLabelText('Help for this question')).opacity).toBeUndefined();
    await fireEvent.press(screen.getByLabelText('Help for this question'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id },
    });
  });

  it('consumes the Android hardware back press so the practice root is never popped', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const view = await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(BackHandler.addEventListener).toHaveBeenCalledWith(
      'hardwareBackPress',
      expect.any(Function),
    );
    expect(pressHardwareBack()).toBe(true);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    await view.unmount();
    expect(backSubscriptionRemove).toHaveBeenCalled();
  });

  it('does not load or mount a recorder without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });

    await renderScreen(<PracticeScreen />);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText('Loading your question…')).toBeNull();
  });

  it('forwards recorder results to the practice flow and feedback route', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onResult(PASSED_RESULT));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, PASSED_RESULT);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('updates a cached new word to revision after a real scored miss', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    const queryClient = makeQueryClient();
    await renderScreen(<PracticeScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I tried to answer.',
      feedback: 'Add more detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    await waitFor(() => expect(screen.getByText('Revision')).toBeTruthy());
    expect(screen.getByText('2 of 8 words mastered · 2 in revision')).toBeTruthy();
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      progress: { ...PRACTICE_QUESTION.progress, learningCount: 2 },
    });
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, miss);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
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
      passed: false,
      mastered: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 50,
      transcript: 'I tried again.',
      feedback: 'Add another supporting detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      revision,
    );
  });

  it('surfaces recorder errors through an alert', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onError('upload failed'));
    expect(alertSpy).toHaveBeenCalledWith('Could not assess your answer', 'upload failed');
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
    expect(screen.queryByText("Couldn't load a question")).toBeNull();
  });

  it('navigates to help for the current question', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await expectPressFeedback(
      () => screen.getByLabelText('Help for this question'),
      {
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: colors.primary,
        height: layout.minimumTarget,
        justifyContent: 'center',
        width: layout.minimumTarget,
      },
      { backgroundColor: colors.primaryDark },
    );
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
      screen.getByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Try Again' }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('uses the practice fallback without also showing a loading state', async () => {
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<PracticeScreen />);

    expect(
      await screen.findByText('Could not load a practice question. Please try again.'),
    ).toBeTruthy();
    expect(screen.queryByText('Loading your question…')).toBeNull();
  });

  it('opens the settings menu and navigates to settings screens', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(alertSpy).toHaveBeenCalledWith('Settings', undefined, [
      { text: 'Change Password', onPress: expect.any(Function) },
      { text: 'Delete Account', style: 'destructive', onPress: expect.any(Function) },
      { text: 'Cancel', style: 'cancel' },
    ]);

    await pressAlertButton('Change Password');
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/change-password');

    await pressAlertButton('Delete Account');
    expect(mockRouter.push).toHaveBeenCalledWith('/settings/delete-account');
  });

  it('logs out and returns to the gate', async () => {
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
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
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
    await renderScreen(<PracticeScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Logged out', expect.stringContaining('logged out')),
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('reports a generic logout failure', async () => {
    mockAuthValue = makeAuth({
      logout: jest.fn().mockRejectedValue(new Error('offline')),
    });
    mockApiFetch.mockResolvedValue(PRACTICE_QUESTION);
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
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Back to Practice' }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Practice' }));
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
    const queryClient = makeQueryClient();
    await renderScreen(<AttemptScreen />, queryClient);

    expect(await screen.findByText('Describe a time you showed courage.')).toBeTruthy();
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
    // The screen chooses which response contract the recorder parses with; a
    // swapped parser breaks the flow at runtime, so pin the wiring.
    expect(recorderProps().parseResult).toBe(parseAttemptResult);
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
        exact: true,
      }),
    ).toBeDefined();
    expect(
      queryClient.getQueryCache().find({
        queryKey: ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
        exact: true,
      })?.options,
    ).toEqual(expect.objectContaining({ enabled: true, retry: false }));
    // Practice Mode deliberately hides translations and examples.
    expect(screen.queryByText('ధైర్యం')).toBeNull();
    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt/native')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');
  });

  it('preserves native mode when practice is entered from help', async () => {
    mockPracticeFlow = makePracticeFlow({ answerMode: 'native' });
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(screen.getByText('Answering in your language — tap for English')).toBeTruthy();
    expect(recorderProps().endpoint).toBe('/practice/attempt/native');
    expect(recorderProps().parseResult).toBe(parseNativeAttemptResult);
    expect(
      screen.getByRole('switch', { name: 'Answer in my language' }).props.accessibilityState,
    ).toEqual({ checked: true, disabled: false });

    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: true,
      transcript: 'నాకు ప్రయాణం ఇష్టం.',
      modelAnswer: 'I enjoy travelling because I discover new places.',
      feedback: 'Your answer was on topic.',
    };
    await act(async () => recorderProps().onResult(nativeResult));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, nativeResult);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');

    await fireEvent.press(screen.getByRole('switch', { name: 'Answer in my language' }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');

    expect(recorderProps().onRecoveryEndpointMismatch?.('/practice/attempt')).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenLastCalledWith('english');
    expect(recorderProps().onRecoveryEndpointMismatch?.('/diagnostic/answer')).toBe(false);
  });

  it('locks the help-entry language switch during recording and submission', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    const toggle = screen.getByRole('switch', { name: 'Answer in my language' });
    expect(toggle.props.accessibilityState).toEqual({ checked: false, disabled: true });
    await fireEvent.press(toggle);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    await fireEvent.press(screen.getByRole('switch', { name: 'Answer in my language' }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('native');
  });

  it('blocks the Android hardware back press only while a recording or submission is active', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    expect(pressHardwareBack()).toBe(false);

    await act(async () => recorderProps().onInteractionLockChange?.(true));
    expect(pressHardwareBack()).toBe(true);

    await act(async () => recorderProps().onInteractionLockChange?.(false));
    expect(pressHardwareBack()).toBe(false);
  });

  it('does not load help or mount a recorder without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockSearchParams = { questionId: QUESTION.id };

    await renderScreen(<AttemptScreen />);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText('Loading question…')).toBeNull();
  });

  it.each([
    ['the prompt word', { ...HELP_CONTENT, promptWord: '' }],
    ['the question text', { ...HELP_CONTENT, questionText: '' }],
  ])('does not mount the recorder when help omits %s', async (_label, content) => {
    mockSearchParams = { questionId: QUESTION.id };
    const queryClient = makeQueryClient();
    const queryKey = ['question-help', USER.id, USER.nativeLanguage, QUESTION.id] as const;
    // Exercise the screen's defense against corrupt cached data independently
    // of the API parser, which rejects these shapes before caching them.
    queryClient.setQueryDefaults(queryKey, { staleTime: Infinity });
    queryClient.setQueryData(queryKey, content);

    await renderScreen(<AttemptScreen />, queryClient);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockRecorderProps).toBeNull();
    expect(screen.queryByText('courage')).toBeNull();
    expect(screen.queryByText("Couldn't load the question")).toBeNull();
  });

  it('forwards results to the practice flow and feedback route', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onResult(PASSED_RESULT));
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, PASSED_RESULT);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('updates a cached new word to revision after a real scored miss', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['practice-question', USER.id, USER.cefrLevel], PRACTICE_QUESTION);
    await renderScreen(<AttemptScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 45,
      transcript: 'I tried to answer.',
      feedback: 'Add more detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual({
      ...PRACTICE_QUESTION,
      kind: 'revision',
      progress: { ...PRACTICE_QUESTION.progress, learningCount: 2 },
    });
    expect(mockPracticeFlow.showFeedback).toHaveBeenCalledWith(QUESTION.id, miss);
    expect(mockRouter.push).toHaveBeenCalledWith('/practice/feedback');
  });

  it('does not double-count a scored miss for a word already in revision', async () => {
    const revision = {
      ...PRACTICE_QUESTION,
      kind: 'revision' as const,
    };
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(['practice-question', USER.id, USER.cefrLevel], revision);
    await renderScreen(<AttemptScreen />, queryClient);
    await screen.findByText('Describe a time you showed courage.');
    const miss: AttemptResult = {
      passed: false,
      mastered: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 50,
      transcript: 'I tried again.',
      feedback: 'Add another supporting detail.',
    };

    await act(async () => recorderProps().onResult(miss));

    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      revision,
    );
  });

  it('surfaces attempt recorder errors through an alert', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<AttemptScreen />);
    await screen.findByText('Describe a time you showed courage.');

    await act(async () => recorderProps().onError('microphone upload failed'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Could not assess your answer',
      'microphone upload failed',
    );
  });

  it('keeps cached attempt content visible during a background refresh', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      ['question-help', USER.id, USER.nativeLanguage, QUESTION.id],
      HELP_CONTENT,
    );
    mockApiFetch.mockReturnValue(new Promise(() => undefined));

    await renderScreen(<AttemptScreen />, queryClient);

    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.queryByText('Loading question…')).toBeNull();
    expect(recorderProps().questionId).toBe(QUESTION.id);
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

    expect(await screen.findByText("Couldn't load the question")).toBeTruthy();
    expect(
      screen.getByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Try Again' }),
      { backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('uses the attempt-specific fallback for non-API failures', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<AttemptScreen />);

    expect(
      await screen.findByText('Could not load this practice question. Please try again.'),
    ).toBeTruthy();
  });
});

describe('practice feedback screen', () => {
  it('handles missing feedback with a way back to practice', async () => {
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('No result to show')).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Back to Practice' }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Practice' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
  });

  it('renders the passed variant and seeds the next question', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    const queryClient = makeQueryClient();
    await renderScreen(<FeedbackScreen />, queryClient);

    expect(screen.getByText('Great job!')).toBeTruthy();
    expect(
      screen.getByText(
        'You passed! A score of 75 or above masters a word that is still in learning.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('72')).toBeTruthy();
    expect(screen.getByText('We heard')).toBeTruthy();
    expect(screen.getByText('“I enjoy reading.”')).toBeTruthy();
    expect(screen.getByText('Feedback')).toBeTruthy();
    expect(screen.getByText('Nice work.')).toBeTruthy();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(screen.queryByText('Out of attempts')).toBeNull();
    expect(screen.queryByText('Try Again')).toBeNull();
    expect(flattenedStyle(screen.getByRole('header', { name: 'Great job!' }))).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Next Question' }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Next Question' }));
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the mastered variant and seeds the next question', async () => {
    const masteredResult: AttemptResult = {
      passed: true,
      mastered: true,
      attemptNo: 1,
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

    expect(screen.getByText('Word mastered!')).toBeTruthy();
    expect(screen.getByText('You scored 75 or above — this word is yours.')).toBeTruthy();
    expect(screen.getByText('88')).toBeTruthy();
    expect(screen.getByText('Confident and clear.')).toBeTruthy();
    expect(screen.queryByText('Great job!')).toBeNull();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(flattenedStyle(screen.getByRole('header', { name: 'Word mastered!' }))).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Next Question' }));
    expect(queryClient.getQueryData(['practice-question', USER.id, USER.cefrLevel])).toEqual(
      NEXT_PRACTICE_QUESTION,
    );
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the native variant with the model answer when understood', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: true,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'You understood the question.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('You understood the question!')).toBeTruthy();
    expect(screen.getByText('Your answer made sense. Now try saying it in English!')).toBeTruthy();
    expect(screen.getByText('We heard')).toBeTruthy();
    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”')).toBeTruthy();
    expect(screen.getByText('Feedback')).toBeTruthy();
    expect(screen.getByText('You understood the question.')).toBeTruthy();
    expect(screen.getByText('Say it in English')).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.getByText('“ఆమె పనిలో ధైర్యం చూపింది.”').props.accessibilityLanguage).toBe(
      'te-IN',
    );
    // Native results carry no score and never advance the word queue.
    expect(screen.queryByText('Score')).toBeNull();
    expect(screen.queryByText('Next Question')).toBeNull();
    expect(screen.queryByText('Try Again')).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: 'You understood the question!' })),
    ).toMatchObject({
      color: colors.success,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Try in English' }));
    expect(mockPracticeFlow.setAnswerMode).toHaveBeenCalledWith('english');
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the native variant with a model answer when the answer missed the question', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: false,
      transcript: 'నేను రైలులో ప్రయాణిస్తాను.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'That answer was about travel, not courage.',
    };
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText('Not quite on topic')).toBeTruthy();
    expect(
      screen.getByText('Your answer missed the question. Check the example and try again.'),
    ).toBeTruthy();
    expect(screen.getByText('That answer was about travel, not courage.')).toBeTruthy();
    expect(screen.getByText('Say it in English')).toBeTruthy();
    expect(screen.getByText('She showed courage at work.')).toBeTruthy();
    expect(screen.queryByText('You understood the question!')).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: 'Not quite on topic' })),
    ).toMatchObject({
      color: colors.warning,
      textAlign: 'center',
    });
    expect(screen.getByRole('button', { name: 'Try in English' })).toBeTruthy();
  });

  it('renders native silence as a free retry that preserves native mode', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: false,
      transcript: '',
      modelAnswer: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      answerMode: 'native',
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    expect(screen.getByText("We couldn't hear you")).toBeTruthy();
    expect(
      screen.getByText(
        'Your English practice progress was not changed. Speak clearly and try again in your language.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('We could not detect any speech.')).toBeTruthy();
    expect(screen.queryByText('We heard')).toBeNull();
    expect(screen.queryByText('Say it in English')).toBeNull();
    expect(screen.queryByText('Score')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Try Again in My Language' }));
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('renders the nospeech variant with Try Again and help actions', async () => {
    const noSpeechResult: AttemptResult = {
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

    expect(screen.getByText("We couldn't hear you")).toBeTruthy();
    expect(
      screen.getByText(
        "Don't worry — this didn't count as an attempt. Tap the record button, speak clearly, " +
          'then tap it again to stop — or get help first.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('We could not detect any speech.')).toBeTruthy();
    // Silence carries no score or transcript and does not advance the queue.
    expect(screen.queryByText('Score')).toBeNull();
    expect(screen.queryByText('We heard')).toBeNull();
    expect(screen.queryByText('Next Question')).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: "We couldn't hear you" })),
    ).toMatchObject({
      color: colors.warning,
      textAlign: 'center',
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'See translation & examples' }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/practice/help',
      params: { questionId: QUESTION.id },
    });
  });

  it('keeps feedback actions above a larger device safe-area inset', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />, undefined, 34);

    expect(buttonContainerPaddingBottom('Next Question')).toBe(34);
  });

  it('invalidates the practice question when no next question is provided', async () => {
    const { next: _next, ...result } = PASSED_RESULT;
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result },
    });
    const queryClient = makeQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');
    await renderScreen(<FeedbackScreen />, queryClient);

    await fireEvent.press(screen.getByRole('button', { name: 'Next Question' }));
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

    expect(screen.getByText('Not quite — attempt 2 of 3')).toBeTruthy();
    expect(screen.getByText(/1 attempt left\. Review the feedback and try again\./)).toBeTruthy();
    expect(screen.getByText('40')).toBeTruthy();
    expect(screen.getByText('We heard')).toBeTruthy();
    expect(screen.getByText('Keep practicing.')).toBeTruthy();
    expect(screen.queryByText('Great job!')).toBeNull();
    expect(screen.queryByText('Out of attempts')).toBeNull();
    expect(screen.queryByText('Next Question')).toBeNull();
    expect(
      flattenedStyle(screen.getByRole('header', { name: 'Not quite — attempt 2 of 3' })),
    ).toMatchObject({ color: colors.warning, textAlign: 'center' });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Try Again' }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('pluralizes remaining attempts', async () => {
    mockPracticeFlow = makePracticeFlow({
      feedback: {
        questionId: QUESTION.id,
        result: {
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

    expect(screen.getByText('Out of attempts')).toBeTruthy();
    expect(
      screen.getByText("Here's what to work on. You'll see this word again in future practice."),
    ).toBeTruthy();
    expect(screen.getByText('Final feedback')).toBeTruthy();
    expect(screen.getByText('Final words.')).toBeTruthy();
    expect(screen.queryByText('Regular feedback.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Next Question' })).toBeTruthy();
    expect(screen.queryByText('Great job!')).toBeNull();
    expect(screen.queryByText(/Not quite/)).toBeNull();
    expect(screen.queryByText('Try Again')).toBeNull();
    expect(flattenedStyle(screen.getByRole('header', { name: 'Out of attempts' }))).toMatchObject({
      color: colors.danger,
      textAlign: 'center',
    });
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Next Question' }),
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

    expect(screen.getByText('Feedback')).toBeTruthy();
    expect(screen.getByText('Normal passed feedback.')).toBeTruthy();
    expect(screen.queryByText('Final feedback')).toBeNull();
    expect(screen.queryByText('Must not be displayed.')).toBeNull();
  });

  it('does not navigate when the user is missing', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockPracticeFlow = makePracticeFlow({
      feedback: { questionId: QUESTION.id, result: PASSED_RESULT },
    });
    await renderScreen(<FeedbackScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Next Question' }));
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
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  });

  it('treats hardware back as Try in English on the native variant', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      understood: true,
      transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
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
      understood: false,
      transcript: '',
      modelAnswer: '',
      feedback: 'We could not detect any speech.',
    };
    mockPracticeFlow = makePracticeFlow({
      answerMode: 'native',
      feedback: { questionId: QUESTION.id, result: nativeResult },
    });
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockPracticeFlow.setAnswerMode).not.toHaveBeenCalled();
    expect(mockPracticeFlow.clearFeedback).toHaveBeenCalled();
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/practice');
  });

  it('routes hardware back to practice when there is no result to show', async () => {
    await renderScreen(<FeedbackScreen />);

    let consumed = false;
    await act(async () => {
      consumed = pressHardwareBack();
    });

    expect(consumed).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice');
    expect(mockPracticeFlow.clearFeedback).not.toHaveBeenCalled();
  });
});

describe('practice help screen', () => {
  it('rejects an invalid question link', async () => {
    mockSearchParams = { questionId: 'not-a-uuid' };
    await renderScreen(<HelpScreen />);

    expect(screen.getByText('Invalid question link')).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Back to Practice' }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Back to Practice' }));
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
    const queryClient = makeQueryClient();
    await renderScreen(<HelpScreen />, queryClient);

    expect(await screen.findByText('Word')).toBeTruthy();
    expect(screen.getByText('courage')).toBeTruthy();
    expect(screen.getByText('ధైర్యం')).toBeTruthy();
    expect(screen.getByText('Question')).toBeTruthy();
    expect(screen.getByText('Describe a time you showed courage.')).toBeTruthy();
    expect(screen.getByText('మీరు ధైర్యం చూపిన సమయాన్ని వివరించండి.')).toBeTruthy();
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
  });

  it('keeps the practice action above a larger device safe-area inset', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />, undefined, 34);
    await screen.findByText('Word');

    expect(buttonContainerPaddingBottom('Start Practice')).toBe(34);
  });

  it('does not load help without an authenticated user', async () => {
    mockAuthValue = makeAuth({ user: null });
    mockSearchParams = { questionId: QUESTION.id };

    await renderScreen(<HelpScreen />);

    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText('Word')).toBeNull();
    expect(screen.queryByText('Loading help…')).toBeNull();
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

  it('navigates to practice mode for the same question', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockResolvedValue(HELP_CONTENT);
    await renderScreen(<HelpScreen />);
    await screen.findByText('Word');

    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Start Practice' }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Start Practice' }));
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
      screen.getByText('The service is temporarily unavailable. Please try again later.'),
    ).toBeTruthy();
    await expectPressFeedback(
      () => screen.getByRole('button', { name: 'Try Again' }),
      { alignItems: 'center', backgroundColor: colors.primary },
      { backgroundColor: colors.primaryDark },
    );

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
      // Let the refetch settle and the batched query notification fire.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });

  it('uses the help-specific fallback for non-API failures', async () => {
    mockSearchParams = { questionId: QUESTION.id };
    mockApiFetch.mockRejectedValue(new Error('private parse detail'));
    await renderScreen(<HelpScreen />);

    expect(
      await screen.findByText('Could not load help for this question. Please try again.'),
    ).toBeTruthy();
  });
});
