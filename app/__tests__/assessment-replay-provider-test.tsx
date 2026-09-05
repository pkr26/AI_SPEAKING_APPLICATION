import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState, type AppStateStatus, Pressable, StyleSheet, Text } from 'react-native';

import {
  AssessmentReplayProvider,
  useAssessmentReplay,
} from '../src/lib/assessment-replay-provider';
import { apiFetch, ApiError } from '../src/lib/api';
import { useAuth } from '../src/lib/auth';
import { colors, layout, spacing } from '../src/lib/theme';
import {
  clearPendingAssessmentIfRequestMatches,
  loadPendingAssessment,
  markPendingAssessmentFeedbackPending,
  notifyPendingAssessmentReplayReady,
  type PendingAssessment,
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

const OTHER_REQUEST_ID = '550e8400-e29b-41d4-a716-446655440077';
const FOREIGN_OWNER_ID = '550e8400-e29b-41d4-a716-446655440099';

const practiceResponse = {
  cycleId: CYCLE_ID,
  passed: false,
  mastered: false,
  attemptNo: 1,
  attemptsLeft: 2,
  score: 45,
  transcript: 'I tried.',
  feedback: 'Add detail.',
};

const processingPracticeStatus = {
  status: 'processing',
  context: 'practice',
  questionId: QUESTION_ID,
  cycleId: CYCLE_ID,
  question,
};

const completedPracticeStatus = {
  status: 'completed',
  context: 'practice',
  questionId: QUESTION_ID,
  cycleId: CYCLE_ID,
  question,
  response: { ...practiceResponse },
};

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
jest.mock('../src/lib/api', () => ({
  ...jest.requireActual('../src/lib/api'),
  apiFetch: jest.fn(),
}));
jest.mock('../src/lib/auth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/lib/pending-assessment', () => ({
  ...jest.requireActual('../src/lib/pending-assessment'),
  clearPendingAssessmentIfRequestMatches: jest.fn(),
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
      <Pressable accessibilityRole="button" onPress={() => clearDiagnosticReplay(OTHER_REQUEST_ID)}>
        <Text>Clear other request</Text>
      </Pressable>
    </>
  );
}

function tree(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } }),
) {
  return (
    <QueryClientProvider client={client}>
      <AssessmentReplayProvider>
        <Text>protected app</Text>
        <ReplayProbe />
      </AssessmentReplayProvider>
    </QueryClientProvider>
  );
}

/**
 * Reads the provider's durable-retry generation from its hook chain. The
 * generation never reaches rendered output, so like the generation-zero pin it
 * is read from the provider fiber's first useState slot.
 */
function readRetryGeneration(): unknown {
  const anchor = screen.getByText('protected app');
  type ProviderFiber = { type?: unknown; memoizedState?: unknown; return: ProviderFiber | null };
  let fiber = anchor.unstable_fiber as ProviderFiber | null;
  while (fiber && fiber.type !== AssessmentReplayProvider) fiber = fiber.return;
  type StateHookSlot = { queue?: unknown; memoizedState?: unknown };
  const firstSlot = (fiber as (ProviderFiber & { memoizedState?: StateHookSlot | null }) | null)
    ?.memoizedState;
  return firstSlot?.memoizedState;
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
  jest.mocked(clearPendingAssessmentIfRequestMatches).mockResolvedValue(true);
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
    expect(authValue.captureSessionLease).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('header', { name: 'Saved answer waiting' })).toBeNull();
    // Clearing with no published card is a guarded no-op, never a crash.
    await fireEvent.press(screen.getByRole('button', { name: 'Clear replay' }));
    expect(screen.getByTestId('diagnostic-replay')).toHaveTextContent('none');
  });

  it('starts the durable-replay retry generation at zero', async () => {
    await render(tree());
    const anchor = await screen.findByText('protected app');
    // The retry generation is provider state that never reaches rendered
    // output, so the pristine value is pinned on the provider's own hook
    // chain: retryVersion is its first useState slot.
    type ProviderFiber = {
      type?: unknown;
      memoizedState?: unknown;
      return: ProviderFiber | null;
    };
    let fiber = anchor.unstable_fiber as ProviderFiber | null;
    while (fiber && fiber.type !== AssessmentReplayProvider) fiber = fiber.return;
    expect(fiber).not.toBeNull();
    type StateHookSlot = { queue?: unknown; memoizedState?: unknown; next?: StateHookSlot };
    const firstSlot = (fiber as (ProviderFiber & { memoizedState: StateHookSlot | null }) | null)
      ?.memoizedState;
    expect(firstSlot?.queue).toBeDefined();
    // The initial check belongs to retry generation zero: a fresh mount must
    // never count phantom re-arms it did not perform.
    expect(firstSlot?.memoizedState).toBe(0);
  });

  it('reacts in the same session when Recorder promotes route-mismatched completed feedback', async () => {
    await render(tree());
    expect(await screen.findByText('protected app')).toBeTruthy();

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

    let providerWasListening = false;
    await act(async () => {
      providerWasListening = notifyPendingAssessmentReplayReady(REQUEST_ID);
    });

    expect(providerWasListening).toBe(true);
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice/feedback');
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();

    await act(async () => Promise.resolve());
    expect(restoreFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it('announces the saved-answer check while secure metadata is loading', async () => {
    jest.mocked(loadPendingAssessment).mockReturnValue(new Promise(() => undefined));
    await render(tree());

    expect(screen.getByText('Checking your saved answer').props.accessibilityLiveRegion).toBe(
      'polite',
    );
  });

  it('lays the checking surface on the shared recovery tokens', async () => {
    jest.mocked(loadPendingAssessment).mockReturnValue(new Promise(() => undefined));
    await render(tree());

    const title = screen.getByText('Checking your saved answer');
    expect(StyleSheet.flatten(title.props.style)).toEqual({
      marginTop: spacing.md,
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    });
    expect(
      StyleSheet.flatten(
        screen.getByText('Your answer is safe. We are restoring your feedback.').props.style,
      ),
    ).toEqual({
      marginTop: spacing.sm,
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23,
      textAlign: 'center',
    });
    // The centered column sits inside a full-height safe screen.
    const center = title.parent;
    expect(center).not.toBeNull();
    expect(StyleSheet.flatten(center!.props.style)).toEqual({
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
      padding: spacing.xl,
    });
    const safeArea = center!.parent;
    expect(safeArea).not.toBeNull();
    expect(StyleSheet.flatten(safeArea!.props.style)).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    // The restoring spinner is the large platform indicator in brand ink.
    const spinner = screen.container.queryAll((node) => node.type === 'ActivityIndicator')[0];
    expect(spinner).toBeDefined();
    expect(spinner.props.size).toBe('large');
    expect(spinner.props.color).toBe(colors.primary);
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
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(
      `/assessments/${REQUEST_ID}`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/practice/feedback');
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
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

  it('keeps a published diagnostic replay when clearing names a different request', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({
      ...pending,
      endpoint: '/diagnostic/answer' as const,
      cycleId: undefined,
    });
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

    await fireEvent.press(screen.getByRole('button', { name: 'Clear other request' }));
    expect(screen.getByTestId('diagnostic-replay')).toHaveTextContent(REQUEST_ID);
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
    // A reconcile pointer belongs to Recorder's bounded flow: a 404 here hands
    // it back instead of terminally retiring the durable slot.
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
  });

  it('retires a delivered pointer after an authoritative 404 and refreshes canonical caches', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    client.setQueryData(['diagnostic-next'], { stale: 'diagnostic' });
    client.setQueryData(['practice-question'], { stale: 'practice' });
    client.setQueryData(['auth-me'], { stale: 'auth' });
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(404, 'replay expired'));

    await render(tree(client));

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledWith(REQUEST_ID);
    expect(client.getQueryData(['diagnostic-next'])).toBeUndefined();
    expect(client.getQueryData(['practice-question'])).toBeUndefined();
    // Only the two assessment question caches are dropped; unrelated queries
    // must survive the canonical refresh.
    expect(client.getQueryData(['auth-me'])).toEqual({ stale: 'auth' });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not apply an old request error to a replacement found by the catch reload', async () => {
    const { feedbackReadyAt: _feedbackReadyAt, ...pendingBase } = pending;
    const replacement = {
      ...pendingBase,
      requestId: '550e8400-e29b-41d4-a716-446655440098',
      stage: 'prepared' as const,
    };
    jest
      .mocked(loadPendingAssessment)
      .mockResolvedValueOnce(pending)
      .mockResolvedValue(replacement);
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(404, 'old replay expired'));

    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    await waitFor(() => expect(loadPendingAssessment).toHaveBeenCalledTimes(3));
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    // The replacement re-read is exactly one retry generation past mount.
    await waitFor(() => expect(readRetryGeneration()).toBe(1));
  });

  it('re-reads a replacement pointer when terminal retirement loses the request race', async () => {
    const { feedbackReadyAt: _feedbackReadyAt, ...pendingBase } = pending;
    const replacement = {
      ...pendingBase,
      requestId: '550e8400-e29b-41d4-a716-446655440099',
      stage: 'prepared' as const,
    };
    jest
      .mocked(loadPendingAssessment)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(pending)
      .mockResolvedValue(replacement);
    jest.mocked(clearPendingAssessmentIfRequestMatches).mockResolvedValueOnce(false);
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(404, 'replay expired'));

    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    await waitFor(() => expect(loadPendingAssessment).toHaveBeenCalledTimes(3));
    expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledWith(REQUEST_ID);
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    // The lost-race re-read is exactly one retry generation past mount.
    await waitFor(() => expect(readRetryGeneration()).toBe(1));
  });

  it('retires an incompatible saved result instead of blocking startup', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockRejectedValue(
      new ApiError(409, 'saved result is incompatible', undefined, {
        code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
      }),
    );

    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledWith(REQUEST_ID);
    expect(screen.queryByRole('alert')).toBeNull();
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

  it('surfaces a retryable error when terminal retirement of an expired pointer fails', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(404, 'replay expired'));
    jest
      .mocked(clearPendingAssessmentIfRequestMatches)
      .mockRejectedValue(new Error('secure storage unavailable'));
    await render(tree());

    await waitFor(() =>
      expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledWith(REQUEST_ID),
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('header', { name: 'We could not restore your feedback' })).toBeTruthy();
  });

  it('lays the recovery choice on the shared retry tokens', async () => {
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

    const title = await screen.findByRole('header', {
      name: 'We could not restore your feedback',
    });
    expect(StyleSheet.flatten(title.props.style)).toEqual({
      marginTop: spacing.md,
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    });
    expect(
      StyleSheet.flatten(
        screen.getByText('Your saved answer is still safe. Try again now or check later.').props
          .style,
      ),
    ).toEqual({
      marginTop: spacing.sm,
      color: colors.muted,
      fontSize: 16,
      lineHeight: 23,
      textAlign: 'center',
    });
    // The choice scrolls in a centered safe screen so both actions stay
    // reachable on small devices.
    let scroller = title.parent;
    while (scroller && scroller.props.contentContainerStyle === undefined) {
      scroller = scroller.parent;
    }
    expect(scroller).not.toBeNull();
    expect(StyleSheet.flatten(scroller!.props.contentContainerStyle)).toEqual({
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: layout.formMaxWidth,
      alignSelf: 'center',
      padding: spacing.xl,
    });
    const safeArea = scroller!.parent;
    expect(StyleSheet.flatten(safeArea!.props.style)).toEqual({
      flex: 1,
      backgroundColor: colors.background,
    });
    const retry = screen.getByRole('button', { name: 'Try again' });
    expect(StyleSheet.flatten(retry.props.style)).toMatchObject({
      marginTop: spacing.xl,
      maxWidth: layout.formMaxWidth,
      alignSelf: 'stretch',
    });
    const checkLater = screen.getByRole('button', { name: 'Check later' });
    expect(StyleSheet.flatten(checkLater.props.style)).toMatchObject({
      borderWidth: 1,
      borderColor: colors.primary,
      marginTop: spacing.md,
      maxWidth: layout.formMaxWidth,
      alignSelf: 'stretch',
    });
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

    const checkLater = await screen.findByRole('button', { name: 'Check later' });
    expect(screen.getByRole('alert')).toBeTruthy();
    await fireEvent.press(checkLater);

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Saved answer waiting' })).toBeTruthy();
    expect(
      screen.getByText('Your answer is safe. Check again to restore feedback when it is ready.')
        .props.accessibilityLiveRegion,
    ).toBe('polite');
    await fireEvent.press(screen.getByRole('button', { name: 'Check now' }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
    // The Check Now action advanced the durable generation by exactly one.
    await waitFor(() => expect(readRetryGeneration()).toBe(1));
  });

  it('lays the deferred banner over the protected app on the shared tokens', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockRejectedValueOnce(new ApiError(0, 'offline'));
    await render(tree());

    await fireEvent.press(await screen.findByRole('button', { name: 'Check later' }));
    expect(await screen.findByText('protected app')).toBeTruthy();

    // The protected app keeps its full-height host behind the banner.
    const appContent = screen.getByText('protected app').parent;
    expect(appContent).not.toBeNull();
    expect(StyleSheet.flatten(appContent!.props.style)).toEqual({ flex: 1 });

    // The banner hugs only the bottom safe edge, lets touches through to the
    // app behind it, and centers its card.
    const title = screen.getByRole('header', { name: 'Saved answer waiting' });
    const card = title.parent;
    expect(card).not.toBeNull();
    expect(StyleSheet.flatten(card!.props.style)).toMatchObject({
      width: '100%',
      maxWidth: layout.formMaxWidth,
      borderWidth: 1,
      borderColor: colors.primary,
      padding: spacing.md,
      shadowColor: colors.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    });
    const host = card!.parent;
    expect(host).not.toBeNull();
    // The library normalizes the authored bottom-only edges onto the host.
    expect((host!.props as { edges?: unknown }).edges).toEqual({
      top: 'off',
      right: 'off',
      bottom: 'additive',
      left: 'off',
    });
    expect((host!.props as { pointerEvents?: unknown }).pointerEvents).toBe('box-none');
    expect(StyleSheet.flatten(host!.props.style)).toEqual({
      width: '100%',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    });
    expect(StyleSheet.flatten(title.props.style)).toEqual({
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
    });
    expect(
      StyleSheet.flatten(
        screen.getByText('Your answer is safe. Check again to restore feedback when it is ready.')
          .props.style,
      ),
    ).toEqual({
      marginTop: spacing.xs,
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    });
    const checkNow = screen.getByRole('button', { name: 'Check now' });
    expect(StyleSheet.flatten(checkNow.props.style)).toMatchObject({
      marginTop: spacing.sm,
      alignSelf: 'stretch',
    });
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

    expect(await screen.findByRole('button', { name: 'Check now' })).toBeTruthy();
    expect(screen.getByText('protected app')).toBeTruthy();
    // The deferred-state subscription is installed in the passive effect
    // following the render that publishes the persistent banner.
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(appStateSpy).toHaveBeenCalledWith('change', expect.any(Function));
    await act(async () => {
      appStateListener?.('background');
      appStateListener?.('active');
    });
    // Foregrounding while still offline must preserve the nonblocking banner.
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Check now' })).toBeTruthy();
    await act(async () => {
      onlineManager.setOnline(true);
      // A reconnect and foreground notification can arrive in the same native
      // turn; one deferred epoch must still launch only one GET.
      appStateListener?.('background');
      appStateListener?.('active');
    });

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    // The reconnect retry advanced the durable generation by exactly one.
    await waitFor(() => expect(readRetryGeneration()).toBe(1));
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

    await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledTimes(2);
    // The Try Again action advanced the durable generation by exactly one.
    await waitFor(() => expect(readRetryGeneration()).toBe(1));
  });

  it('clears an expired pointer and resumes canonical routing', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({
      ...pending,
      createdAt: 1,
      feedbackReadyAt: 1,
    });
    await render(tree());

    await waitFor(() => expect(screen.getByText('protected app')).toBeTruthy());
    expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledWith(REQUEST_ID);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('clears a pointer owned by a different account without probing it', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({
      ...pending,
      ownerId: '550e8400-e29b-41d4-a716-446655440099',
    });
    await render(tree());

    await waitFor(() => expect(screen.getByText('protected app')).toBeTruthy());
    expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledWith(REQUEST_ID);
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
        ...completedPracticeStatus,
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

  it('does no secure or network work without a bearer token even when a user snapshot remains', async () => {
    authValue = { ...authValue, token: null };
    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(loadPendingAssessment).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('does no secure or network work while the session is still restoring', async () => {
    authValue = { ...authValue, isRestoring: true };
    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(loadPendingAssessment).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('recaptures the session lease when the identity rotates', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const view = await render(tree(client));
    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(authValue.captureSessionLease).toHaveBeenCalledTimes(1);

    authValue = { ...authValue, sessionVersion: 2 };
    view.rerender(tree(client));

    await waitFor(() => expect(authValue.captureSessionLease).toHaveBeenCalledTimes(2));
  });

  it('returns to the checking surface while a manual retry re-runs the durable check', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockRejectedValueOnce(new ApiError(0, 'offline'))
      .mockReturnValueOnce(new Promise(() => undefined));
    await render(tree());

    await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Checking your saved answer')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  it('drops a superseded status reply from a replaced check', async () => {
    let resolveStatus!: (value: unknown) => void;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    const view = await render(tree(client));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    // Rotating the identity replaces the in-flight check: the old run's
    // cleanup aborts its controller, and the replacement issues its own GET.
    authValue = { ...authValue, sessionVersion: 2 };
    view.rerender(tree(client));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveStatus({ ...completedPracticeStatus });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Both runs shared the resolved reply, but only the current run may
    // publish it exactly once.
    expect(restoreFeedback).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  });

  it('keeps the checking surface when the lease expires while a foreign pointer retires', async () => {
    let resolveClear!: (value: boolean) => void;
    jest.mocked(loadPendingAssessment).mockResolvedValue({ ...pending, ownerId: FOREIGN_OWNER_ID });
    jest.mocked(clearPendingAssessmentIfRequestMatches).mockReturnValue(
      new Promise((resolve) => {
        resolveClear = resolve;
      }),
    );
    let leaseCurrent = true;
    authValue = { ...authValue, isSessionLeaseCurrent: jest.fn(() => leaseCurrent) };
    await render(tree());
    await waitFor(() => expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledTimes(1));

    leaseCurrent = false;
    await act(async () => {
      resolveClear(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Checking your saved answer')).toBeTruthy();
    expect(screen.queryByText('protected app')).toBeNull();
  });

  it('does not probe the network when the lease expires before the pointer resolves', async () => {
    let resolvePending!: (value: PendingAssessment | null) => void;
    jest.mocked(loadPendingAssessment).mockReturnValue(
      new Promise<PendingAssessment | null>((resolve) => {
        resolvePending = resolve;
      }),
    );
    let leaseCurrent = true;
    authValue = { ...authValue, isSessionLeaseCurrent: jest.fn(() => leaseCurrent) };
    await render(tree());
    await waitFor(() => expect(loadPendingAssessment).toHaveBeenCalledTimes(1));

    leaseCurrent = false;
    await act(async () => {
      resolvePending(pending);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByText('Checking your saved answer')).toBeTruthy();
  });

  it('does not mark or publish a replay when the lease expires before the status reply lands', async () => {
    let resolveStatus!: (value: unknown) => void;
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    let leaseCurrent = true;
    authValue = { ...authValue, isSessionLeaseCurrent: jest.fn(() => leaseCurrent) };
    await render(tree());
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    leaseCurrent = false;
    await act(async () => {
      resolveStatus({ ...completedPracticeStatus });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(markPendingAssessmentFeedbackPending).not.toHaveBeenCalled();
    expect(restoreFeedback).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('does not publish a replay when the lease expires while marking feedback pending', async () => {
    let resolveMark!: (value: boolean) => void;
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockResolvedValue({ ...completedPracticeStatus });
    jest.mocked(markPendingAssessmentFeedbackPending).mockReturnValue(
      new Promise((resolve) => {
        resolveMark = resolve;
      }),
    );
    let leaseCurrent = true;
    authValue = { ...authValue, isSessionLeaseCurrent: jest.fn(() => leaseCurrent) };
    await render(tree());
    await waitFor(() => expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledTimes(1));

    leaseCurrent = false;
    await act(async () => {
      resolveMark(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(restoreFeedback).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('leaves the checking surface when the lease expires before a failed reply is handled', async () => {
    let rejectStatus!: (reason?: unknown) => void;
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectStatus = reject;
      }),
    );
    let leaseCurrent = true;
    authValue = { ...authValue, isSessionLeaseCurrent: jest.fn(() => leaseCurrent) };
    await render(tree());
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

    leaseCurrent = false;
    await act(async () => {
      rejectStatus(new ApiError(0, 'offline'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(loadPendingAssessment).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Checking your saved answer')).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'We could not restore your feedback' })).toBeNull();
  });

  it('leaves the checking surface when the lease expires before the replacement pointer resolves', async () => {
    let resolveReload!: (value: PendingAssessment | null) => void;
    jest
      .mocked(loadPendingAssessment)
      .mockResolvedValueOnce(pending)
      .mockReturnValueOnce(
        new Promise<PendingAssessment | null>((resolve) => {
          resolveReload = resolve;
        }),
      );
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(0, 'offline'));
    let leaseCurrent = true;
    authValue = { ...authValue, isSessionLeaseCurrent: jest.fn(() => leaseCurrent) };
    await render(tree());
    await waitFor(() => expect(loadPendingAssessment).toHaveBeenCalledTimes(2));

    leaseCurrent = false;
    await act(async () => {
      resolveReload(pending);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Checking your saved answer')).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'We could not restore your feedback' })).toBeNull();
  });

  it('re-reads the pointer when the catch reload finds a replacement with a new request id', async () => {
    jest
      .mocked(loadPendingAssessment)
      .mockResolvedValueOnce(pending)
      .mockResolvedValue({ ...pending, requestId: OTHER_REQUEST_ID });
    jest
      .mocked(apiFetch)
      .mockRejectedValueOnce(new ApiError(404, 'old replay expired'))
      .mockResolvedValueOnce({ ...completedPracticeStatus });
    await render(tree());

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
    expect(loadPendingAssessment).toHaveBeenCalledTimes(3);
  });

  it('re-reads the pointer when the catch reload finds a replacement in a new stage', async () => {
    jest
      .mocked(loadPendingAssessment)
      .mockResolvedValueOnce(pending)
      .mockResolvedValue({ ...pending, stage: 'reconcile' as const });
    jest
      .mocked(apiFetch)
      .mockRejectedValueOnce(new ApiError(404, 'old replay expired'))
      .mockResolvedValueOnce({ ...completedPracticeStatus });
    await render(tree());

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
  });

  it('still surfaces a recovery choice when the catch reload cannot re-read an in-flight pointer', async () => {
    jest
      .mocked(loadPendingAssessment)
      .mockResolvedValueOnce(pending)
      .mockRejectedValue(new Error('secure storage unavailable'));
    jest.mocked(apiFetch).mockRejectedValueOnce(new ApiError(0, 'offline'));
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
  });

  it('exposes the app without the deferred banner when a reconcile pointer is still processing', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({ ...pending, stage: 'reconcile' });
    jest.mocked(apiFetch).mockResolvedValue({ ...processingPracticeStatus });
    await render(tree());

    expect(await screen.findByText('protected app')).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'Saved answer waiting' })).toBeNull();
  });

  it('stamps a freshly reconciled pointer with the current time', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({
      ...pending,
      stage: 'reconcile',
      feedbackReadyAt: NOW - 60_000,
    });
    jest.mocked(apiFetch).mockResolvedValue({ ...completedPracticeStatus });
    await render(tree());

    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(markPendingAssessmentFeedbackPending).toHaveBeenCalledWith(
      REQUEST_ID,
      expect.any(Number),
    );
    const stampedAt = jest.mocked(markPendingAssessmentFeedbackPending).mock.calls[0][1];
    expect(stampedAt).toBeGreaterThan(NOW - 1_000);
  });

  it('keeps a 409 that is not the incompatible-result code retryable', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockRejectedValue(new ApiError(409, 'conflict', undefined, { code: 'EMAIL_TAKEN' }));
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
  });

  it('keeps an incompatible-result code on a non-409 status retryable', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockRejectedValue(
      new ApiError(500, 'odd server reply', undefined, {
        code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
      }),
    );
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
  });

  it('shows a recovery choice, not a terminal retirement, when the initial pointer read fails like an incompatible reply', async () => {
    jest
      .mocked(loadPendingAssessment)
      .mockRejectedValueOnce(
        new ApiError(409, 'odd secure-store reply', undefined, {
          code: 'ASSESSMENT_RESULT_INCOMPATIBLE',
        }),
      )
      .mockResolvedValue(pending);
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
    expect(clearPendingAssessmentIfRequestMatches).not.toHaveBeenCalled();
  });

  it('shows a recovery choice, never the app, when the pointer read itself fails with a 404-shaped error', async () => {
    jest
      .mocked(loadPendingAssessment)
      .mockRejectedValue(new ApiError(404, 'secure storage unavailable'));
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
    expect(screen.queryByText('protected app')).toBeNull();
  });

  it('keeps a reconcile pointer retryable when its status reply fails without a 404', async () => {
    jest.mocked(loadPendingAssessment).mockResolvedValue({ ...pending, stage: 'reconcile' });
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(500, 'server error'));
    await render(tree());

    expect(
      await screen.findByRole('header', { name: 'We could not restore your feedback' }),
    ).toBeTruthy();
  });

  it('keeps the checking surface when terminal retirement fails after the lease expired', async () => {
    let rejectClear!: (reason?: unknown) => void;
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest.mocked(apiFetch).mockRejectedValue(new ApiError(404, 'replay expired'));
    jest.mocked(clearPendingAssessmentIfRequestMatches).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectClear = reject;
      }),
    );
    let leaseCurrent = true;
    authValue = { ...authValue, isSessionLeaseCurrent: jest.fn(() => leaseCurrent) };
    await render(tree());
    await waitFor(() => expect(clearPendingAssessmentIfRequestMatches).toHaveBeenCalledTimes(1));

    leaseCurrent = false;
    await act(async () => {
      rejectClear(new Error('secure storage unavailable'));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('Checking your saved answer')).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'We could not restore your feedback' })).toBeNull();
  });

  it('keeps canonical question caches when a foreign pointer is retired', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    client.setQueryData(['diagnostic-next'], { stale: 'diagnostic' });
    client.setQueryData(['practice-question'], { stale: 'practice' });
    jest.mocked(loadPendingAssessment).mockResolvedValue({
      ...pending,
      ownerId: FOREIGN_OWNER_ID,
    });
    await render(tree(client));

    await waitFor(() => expect(screen.getByText('protected app')).toBeTruthy());
    expect(client.getQueryData(['diagnostic-next'])).toEqual({ stale: 'diagnostic' });
    expect(client.getQueryData(['practice-question'])).toEqual({ stale: 'practice' });
  });

  it('retries a deferred check when connectivity alone returns', async () => {
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, _listener) => ({ remove: jest.fn() }));
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockResolvedValueOnce({ ...processingPracticeStatus })
      .mockResolvedValueOnce({ ...completedPracticeStatus });
    await render(tree());

    expect(await screen.findByRole('button', { name: 'Check now' })).toBeTruthy();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    // Losing connectivity alone must never launch a re-check.
    await act(async () => {
      onlineManager.setOnline(false);
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(apiFetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      onlineManager.setOnline(true);
    });
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledTimes(2);
    appStateSpy.mockRestore();
  });

  it('retries a deferred check only on a genuine return to the foreground', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined;
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: jest.fn() };
      });
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockResolvedValueOnce({ ...processingPracticeStatus })
      .mockResolvedValueOnce({ ...completedPracticeStatus });
    await render(tree());

    expect(await screen.findByRole('button', { name: 'Check now' })).toBeTruthy();
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(appStateSpy).toHaveBeenCalledWith('change', expect.any(Function));

    // Neither an inactive transition nor a backgrounding re-checks.
    await act(async () => {
      appStateListener?.('inactive');
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(apiFetch).toHaveBeenCalledTimes(1);
    await act(async () => {
      appStateListener?.('background');
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(apiFetch).toHaveBeenCalledTimes(1);

    // A genuine background-to-foreground return re-checks exactly once.
    await act(async () => {
      appStateListener?.('active');
    });
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledTimes(2);
    appStateSpy.mockRestore();
  });

  it('stops listening for reconnects once the deferred check resolves', async () => {
    const appStateSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, _listener) => ({ remove: jest.fn() }));
    jest.mocked(loadPendingAssessment).mockResolvedValue(pending);
    jest
      .mocked(apiFetch)
      .mockResolvedValueOnce({ ...processingPracticeStatus })
      .mockResolvedValueOnce({ ...completedPracticeStatus });
    await render(tree());

    await fireEvent.press(await screen.findByRole('button', { name: 'Check now' }));
    await waitFor(() => expect(restoreFeedback).toHaveBeenCalledTimes(1));
    expect(apiFetch).toHaveBeenCalledTimes(2);

    // After the deferred card resolves, its reconnect listener is gone, so a
    // later connectivity flap cannot launch a third check.
    await act(async () => {
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(apiFetch).toHaveBeenCalledTimes(2);
    expect(restoreFeedback).toHaveBeenCalledTimes(1);
    appStateSpy.mockRestore();
  });

  it('clears a diagnostic replay published after the identity rotates', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const diagnosticPending = {
      ...pending,
      endpoint: '/diagnostic/answer' as const,
      cycleId: undefined,
    };
    const diagnosticStatus = {
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
    };
    jest.mocked(loadPendingAssessment).mockResolvedValue(diagnosticPending);
    jest.mocked(apiFetch).mockResolvedValue(diagnosticStatus);
    const view = await render(tree(client));
    await waitFor(() =>
      expect(screen.getByTestId('diagnostic-replay')).toHaveTextContent(REQUEST_ID),
    );

    authValue = { ...authValue, sessionVersion: 2 };
    view.rerender(tree(client));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('diagnostic-replay')).toHaveTextContent(REQUEST_ID);

    await fireEvent.press(screen.getByRole('button', { name: 'Clear replay' }));
    expect(screen.getByTestId('diagnostic-replay')).toHaveTextContent('none');
  });
});
