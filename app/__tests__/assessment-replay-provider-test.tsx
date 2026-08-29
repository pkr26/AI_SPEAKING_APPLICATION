import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState, type AppStateStatus, Pressable, Text } from 'react-native';

import {
  AssessmentReplayProvider,
  useAssessmentReplay,
} from '../src/lib/assessment-replay-provider';
import { apiFetch, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import {
  clearPendingAssessment,
  loadPendingAssessment,
  markPendingAssessmentFeedbackPending,
} from '../src/lib/pending-assessment';
import { usePracticeFlow } from '../src/lib/practice-flow';
import type { User } from '../src/lib/types';

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440002';
const CYCLE_ID = '550e8400-e29b-41d4-a716-446655440020';
const NOW = Date.now();

const USER: User = {
  id: OWNER_ID,
  name: 'Ada',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
  diagnosticAcknowledged: true,
};

const question = {
  id: QUESTION_ID,
  cefrLevel: 'B1' as const,
  promptWord: 'courage',
  questionText: 'Describe courage.',
};

const pending = {
  ownerId: OWNER_ID,
  endpoint: '/practice/attempt' as const,
  questionId: QUESTION_ID,
  cycleId: CYCLE_ID,
  requestId: REQUEST_ID,
  createdAt: NOW - 1_000,
  retainRecording: false,
  stage: 'feedback-pending' as const,
  feedbackReadyAt: NOW,
};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));
jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiFetch: jest.fn(),
}));
jest.mock('../src/lib/auth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/lib/pending-assessment', () => ({
  ...jest.requireActual('../src/lib/pending-assessment'),
  clearPendingAssessment: jest.fn(),
  loadPendingAssessment: jest.fn(),
  markPendingAssessmentFeedbackPending: jest.fn(),
}));
jest.mock('../src/lib/practice-flow', () => ({ usePracticeFlow: jest.fn() }));

const mockRouter = jest.requireMock('expo-router').router as { replace: jest.Mock };
const restoreFeedback = jest.fn();
let authValue: ReturnType<typeof useAuth>;

function ReplayProbe() {
  const { diagnosticReplay, clearDiagnosticReplay } = useAssessmentReplay();
  return (
    <>
      <Text testID="diagnostic-replay">{diagnosticReplay?.requestId ?? 'none'}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => clearDiagnosticReplay(diagnosticReplay?.requestId ?? REQUEST_ID)}
      >
        <Text>Clear replay</Text>
      </Pressable>
    </>
  );
}

function tree() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AssessmentReplayProvider>
        <Text>protected app</Text>
        <ReplayProbe />
      </AssessmentReplayProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
  authValue = {
    token: 'token',
    user: USER,
    sessionVersion: 1,
    isRestoring: false,
    restoreError: null,
    captureSessionLease: jest.fn(() => ({}) as never),
    isSessionLeaseCurrent: jest.fn(() => true),
  } as unknown as ReturnType<typeof useAuth>;
  jest.mocked(useAuth).mockImplementation(() => authValue);
  jest.mocked(usePracticeFlow).mockReturnValue({ restoreFeedback } as never);
  jest.mocked(loadPendingAssessment).mockResolvedValue(null);
  jest.mocked(clearPendingAssessment).mockResolvedValue(undefined);
  jest.mocked(markPendingAssessmentFeedbackPending).mockResolvedValue(true);
});

describe('AssessmentReplayProvider', () => {
  it('does no secure or network work while signed out', async () => {
    authValue = { ...authValue, token: null, user: null };
    await render(tree());

    expect(screen.getByText('protected app')).toBeTruthy();
    expect(loadPendingAssessment).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('opens the protected app when there is no saved assessment', async () => {
    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('announces the saved-answer check while secure metadata is loading', async () => {
    jest.mocked(loadPendingAssessment).mockReturnValue(new Promise(() => undefined));
    await render(tree());

    expect(screen.getByText('Checking your saved answer').props.accessibilityLiveRegion).toBe(
      'polite',
    );
  });

  it('restores a practice card without incrementing the session tally', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockResolvedValue({
      status: 'completed',
      context: 'practice',
      questionId: QUESTION_ID,
      cycleId: CYCLE_ID,
      question,
      response: {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried.',
        feedback: 'Add detail.',
      },
    });
    await render(tree());

    await waitFor(() =>
      expect(restoreFeedback).toHaveBeenCalledWith(
        QUESTION_ID,
        expect.objectContaining({ score: 45, cycleId: CYCLE_ID }),
        question,
        REQUEST_ID,
      ),
    );
    expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
      REQUEST_ID,
      pending.feedbackReadyAt,
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice/feedback');
    expect(clearPendingAssessment).not.toHaveBeenCalled();
  });

  it('publishes a diagnostic replay for the diagnostic screen', async () => {
    const diagnosticPending = {
      ...pending,
      endpoint: '/diagnostic/answer' as const,
      cycleId: undefined,
    };
    jest.mocked(loadPendingAssessment).mockResolvedValue(diagnosticPending);
    jest.mocked(apiFetch).mockResolvedValue({
      status: 'completed',
      context: 'diagnostic',
      questionId: QUESTION_ID,
      cycleId: null,
      question,
      response: {
        passed: true,
        score: 88,
        transcript: 'I spoke up.',
        feedback: 'Clear answer.',
        done: true,
        level: 'B1',
      },
    });
    await render(tree());

    await waitFor(() =>
      expect(screen.getByTestId('diagnostic-replay')).toHaveTextContent(REQUEST_ID),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/diagnostic');
    expect(restoreFeedback).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Clear replay' }));
    expect(screen.getByTestId('diagnostic-replay')).toHaveTextContent('none');
  });

  it('hands a non-delivered pending stage back to its owning Recorder', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({ ...pending, stage: 'prepared' });
    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('hands a missing legacy reconcile request back to its owning Recorder', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({ ...pending, stage: 'reconcile' });
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(404, 'missing'));
    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the recovery choice visible when its durable feedback marker changed', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(markPendingAssessmentFeedbackPending).mockResolvedValue(false);
    jest.mocked(apiFetch).mockResolvedValue({
      status: 'completed',
      context: 'practice',
      questionId: QUESTION_ID,
      cycleId: CYCLE_ID,
      question,
      response: {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried.',
        feedback: 'Add detail.',
      },
    });
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
    expect(restoreFeedback).not.toHaveBeenCalled();
  });

  it('shows a recovery choice when secure pointer reads fail', async () => {
    jest.mocked(loadPendingAssessment).mockRejectedValue(new Error('secure storage unavailable'));
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('keeps a same-session Check Now path after Check Later without deleting the pointer', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockRejectedValueOnce(new ApiError(0, 'offline'))
      .mockResolvedValueOnce({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        cycleId: CYCLE_ID,
        question,
        response: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 45,
          transcript: 'I tried.',
          feedback: 'Add detail.',
        },
      });
    await render(tree());

    const checkLater = await screen.findByRole('button', { name: 'Check Later' });
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(checkLater);

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Saved answer waiting' })).toBeTruthy();
    expect(
      screen.getByText('Your answer is safe. Check again to restore feedback when it is ready.')
        .props.accessibilityLiveRegion,
    ).toBe('polite');
    await fireEvent.press(screen.getByRole('button', { name: 'Check Now' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(clearPendingAssessment).not.toHaveBeenCalled();
  });

  it('keeps processing delivered feedback visible and retries it after reconnect', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });
    onlineManager.setOnline(false);
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockResolvedValueOnce({
        status: 'processing',
        context: 'practice',
        questionId: QUESTION_ID,
        cycleId: CYCLE_ID,
        question,
      })
      .mockResolvedValueOnce({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        cycleId: CYCLE_ID,
        question,
        response: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 45,
          transcript: 'I tried.',
          feedback: 'Nice work.',
        },
      });
    await render(tree());

    expect(await screen.findByRole('button', { name: 'Check Now' })).toBeTruthy();
    expect(screen.getByText('protected app')).toBeTruthy();
    // The deferred-state subscription is installed in the passive effect
    // following the render that publishes the persistent banner.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    await act(async () => {
      appStateListener?.('background');
      appStateListener?.('active');
    });
    // Foregrounding while still offline must preserve the nonblocking banner.
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Check Now' })).toBeTruthy();
    await act(async () => {
      onlineManager.setOnline(true);
      // A reconnect and foreground notification can arrive in the same native
      // turn; one deferred epoch must still launch only one GET.
      appStateListener?.('background');
      appStateListener?.('active');
    });

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    appStateSpy.mockRestore();
  });

  it('retries a failed replay and restores it when connectivity returns', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockRejectedValueOnce(new ApiError(0, 'offline'))
      .mockResolvedValueOnce({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        cycleId: CYCLE_ID,
        question,
        response: {
          cycleId: CYCLE_ID,
          passed: false,
          mastered: false,
          attemptNo: 1,
          attemptsLeft: 2,
          score: 45,
          transcript: 'I tried.',
          feedback: 'Add detail.',
        },
      });
    await render(tree());

    await fireEvent.press(await screen.findByRole('button', { name: 'Try Again' }));
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('clears an expired pointer and resumes canonical routing', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({
      ...pending,
      feedbackReadyAt: 1,
    });
    await render(tree());

    await waitFor(() => expect(screen.getByText('protected app')).toBeTruthy());
    expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('clears a pointer owned by a different account without probing it', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({
      ...pending,
      ownerId: '550e8400-e29b-41d4-a716-446655440099',
    });
    await render(tree());

    await waitFor(() => expect(screen.getByText('protected app')).toBeTruthy());
    expect(clearPendingAssessment).toHaveBeenCalledWith(REQUEST_ID);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('does not publish a replay after its session lease expires', async () => {
    let current = true;
    authValue = {
      ...authValue,
      isSessionLeaseCurrent: jest.fn(() => current),
    };
    let resolveStatus!: (value: unknown) => void;
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    await render(tree());
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    current = false;
    await act(async () =>
      resolveStatus({
        status: 'completed',
        context: 'practice',
        questionId: QUESTION_ID,
        cycleId: CYCLE_ID,
        question,
        response: {},
      }),
    );
    expect(restoreFeedback).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('provides a safe no-op context outside the provider', async () => {
    function OutsideProbe() {
      const replay = useAssessmentReplay();
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => replay.clearDiagnosticReplay(REQUEST_ID)}
        >
          <Text>{replay.diagnosticReplay?.requestId ?? 'No replay outside'}</Text>
        </Pressable>
      );
    }

    await render(<OutsideProbe />);
    await fireEvent.press(screen.getByRole('button', { name: 'No replay outside' }));
    expect(screen.getByText('No replay outside')).toBeTruthy();
  });
});
