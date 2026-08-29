import { QueryClient } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { useAuth } from '../src/lib/auth';
import {
  applyFailedAttemptToQuestionCache,
  PracticeFlowProvider,
  usePracticeFlow,
} from '../src/lib/practice-flow';
import type {
  AttemptResult,
  NativeAttemptResult,
  PracticeQuestionPayload,
  User,
} from '../src/lib/types';

// React 19 requires this opt-in before act() can track async updates.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../src/lib/auth', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = jest.mocked(useAuth);

const CYCLE_ID = '550e8400-e29b-41d4-a716-446655440020';
const NEXT_CYCLE_ID = '550e8400-e29b-41d4-a716-446655440021';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440099';

const AUTH_USER: User = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
  diagnosticAcknowledged: true,
};

const RESULT: AttemptResult = {
  cycleId: CYCLE_ID,
  passed: true,
  mastered: true,
  attemptNo: 1,
  attemptsLeft: 0,
  score: 88,
  transcript: 'she sells seashells',
  feedback: 'Nice pacing.',
};

let flow: ReturnType<typeof usePracticeFlow> | null = null;

function Capture() {
  const value = usePracticeFlow();
  useEffect(() => {
    flow = value;
  });
  return null;
}

function FeedbackLabel() {
  const { feedback } = usePracticeFlow();
  return <Text testID="feedback">{feedback ? feedback.questionId : 'none'}</Text>;
}

function tree() {
  return (
    <PracticeFlowProvider>
      <Capture />
      <FeedbackLabel />
    </PracticeFlowProvider>
  );
}

function setAuthState(sessionVersion: number, user: User | null = AUTH_USER) {
  mockedUseAuth.mockReturnValue({
    sessionVersion,
    user,
  } as unknown as ReturnType<typeof useAuth>);
}

function feedbackText(): string {
  return String(screen.getByTestId('feedback').props.children);
}

beforeEach(() => {
  jest.resetAllMocks();
  flow = null;
  setAuthState(0);
});

describe('PracticeFlowProvider', () => {
  it('stores feedback and replaces it on a subsequent showFeedback', async () => {
    await render(tree());

    expect(flow!.answerMode).toBe('english');
    expect(flow!.feedback).toBeNull();
    expect(feedbackText()).toBe('none');

    await act(async () => {
      flow!.showFeedback('q-1', RESULT);
    });
    expect(flow!.feedback).toEqual({ questionId: 'q-1', result: RESULT });
    expect(feedbackText()).toBe('q-1');

    await act(async () => {
      flow!.showFeedback('q-2', RESULT);
    });
    expect(flow!.feedback).toEqual({ questionId: 'q-2', result: RESULT });
    expect(feedbackText()).toBe('q-2');
  });

  it('stores an optional durable request identity with fresh feedback', async () => {
    await render(tree());

    await act(async () => {
      flow!.showFeedback('q-1', RESULT, undefined, REQUEST_ID);
    });

    expect(flow!.feedback).toEqual({ questionId: 'q-1', result: RESULT, requestId: REQUEST_ID });
  });

  it('restores mode and retry status without counting a replay twice', async () => {
    const nativeResult: NativeAttemptResult = {
      mode: 'native',
      cycleId: CYCLE_ID,
      understood: true,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'నా జవాబు',
      translatedTranscript: 'My answer.',
      modelAnswer: 'My answer.',
      feedback: 'You understood.',
    };
    await render(tree());

    await act(async () => {
      flow!.restoreFeedback('q-1', nativeResult, undefined, REQUEST_ID);
    });

    expect(flow!.answerMode).toBe('native');
    expect(flow!.feedback).toEqual({
      questionId: 'q-1',
      result: nativeResult,
      requestId: REQUEST_ID,
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: CYCLE_ID,
      attemptsLeft: 2,
    });
    expect(flow!.sessionTally).toEqual({ attempts: 0, passed: 0, mastered: 0, levelUps: 0 });

    await act(async () => {
      flow!.restoreFeedback('q-2', RESULT, undefined, REQUEST_ID);
    });
    expect(flow!.answerMode).toBe('english');
    expect(flow!.attemptStatus).toBeNull();
    expect(flow!.sessionTally).toEqual({ attempts: 0, passed: 0, mastered: 0, levelUps: 0 });
  });

  it('stores the selected answer mode', async () => {
    await render(tree());

    await act(async () => {
      flow!.setAnswerMode('native');
    });
    expect(flow!.answerMode).toBe('native');

    await act(async () => {
      flow!.setAnswerMode('english');
    });
    expect(flow!.answerMode).toBe('english');
  });

  it('clears stored feedback', async () => {
    await render(tree());

    await act(async () => {
      flow!.showFeedback('q-1', RESULT);
    });
    expect(feedbackText()).toBe('q-1');

    await act(async () => {
      flow!.clearFeedback();
    });
    expect(flow!.feedback).toBeNull();
    expect(feedbackText()).toBe('none');
  });

  it('resets every practice-flow field before a diagnostic retake', async () => {
    await render(tree());

    await act(async () => {
      flow!.setAnswerMode('native');
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried.',
        feedback: 'Add more detail.',
      });
    });
    expect(flow!.answerMode).toBe('native');
    expect(flow!.feedback).not.toBeNull();
    expect(flow!.attemptStatus).not.toBeNull();
    expect(flow!.sessionTally.attempts).toBe(1);

    await act(async () => flow!.resetPracticeFlow());

    expect(flow!.answerMode).toBe('english');
    expect(flow!.feedback).toBeNull();
    expect(flow!.attemptStatus).toBeNull();
    expect(flow!.sessionTally).toEqual({ attempts: 0, passed: 0, mastered: 0, levelUps: 0 });
  });

  it('pins the attempt status for a scored miss and keeps it past clearFeedback', async () => {
    await render(tree());
    expect(flow!.attemptStatus).toBeNull();

    await act(async () => {
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried to answer.',
        feedback: 'Add more detail.',
      });
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: CYCLE_ID,
      attemptsLeft: 2,
    });

    // Dismissing the feedback card must not lose the retry position: the
    // practice screens show "Try N of 3" from this state before submit.
    await act(async () => {
      flow!.clearFeedback();
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: CYCLE_ID,
      attemptsLeft: 2,
    });
  });

  it('ends the attempt status when the word passes or runs out of attempts', async () => {
    await render(tree());

    await act(async () => {
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 2,
        attemptsLeft: 1,
        score: 40,
        transcript: 'again',
        feedback: 'Almost.',
      });
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: CYCLE_ID,
      attemptsLeft: 1,
    });

    await act(async () => {
      flow!.showFeedback('q-1', RESULT);
    });
    expect(flow!.attemptStatus).toBeNull();

    await act(async () => {
      flow!.showFeedback('q-2', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 3,
        attemptsLeft: 0,
        score: 30,
        transcript: 'last try',
        feedback: 'Out of attempts.',
        finalFeedback: 'Work on word order.',
      });
    });
    expect(flow!.attemptStatus).toBeNull();
  });

  it('treats a scored miss without attemptsLeft as an ended attempt run', async () => {
    await render(tree());

    await act(async () => {
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried to answer.',
        feedback: 'Add more detail.',
      });
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: CYCLE_ID,
      attemptsLeft: 2,
    });

    // The parsed contract always supplies attemptsLeft on a scored miss, but
    // a missing value must fail closed to "no chip" rather than crash.
    await act(async () => {
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 2,
        score: 45,
        transcript: 'I tried again.',
        feedback: 'Add more detail.',
      } as AttemptResult);
    });
    expect(flow!.attemptStatus).toBeNull();
  });

  it.each([
    [
      'silence',
      {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        noSpeech: true,
        attemptNo: 2,
        attemptsLeft: 2,
        score: 0,
        transcript: '',
        feedback: 'We could not detect any speech.',
      } satisfies AttemptResult,
    ],
    [
      'a native-mode answer',
      {
        mode: 'native',
        cycleId: CYCLE_ID,
        understood: true,
        attemptNo: 2,
        attemptsLeft: 1,
        transcript: 'నాకు ప్రయాణం ఇష్టం.',
        translatedTranscript: 'I like travelling.',
        modelAnswer: 'I enjoy travelling.',
        feedback: 'On topic.',
      } satisfies NativeAttemptResult,
    ],
  ])('keeps the attempt status coherent for %s', async (_case, result) => {
    await render(tree());

    await act(async () => {
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried to answer.',
        feedback: 'Add more detail.',
      });
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: CYCLE_ID,
      attemptsLeft: 2,
    });

    await act(async () => {
      flow!.showFeedback('q-1', result);
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: result.cycleId,
      attemptsLeft: result.attemptsLeft,
    });
  });

  it('discards the attempt status when the auth sessionVersion changes', async () => {
    const { rerender } = await render(tree());

    await act(async () => {
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried to answer.',
        feedback: 'Add more detail.',
      });
    });
    expect(flow!.attemptStatus).toEqual({
      questionId: 'q-1',
      cycleId: CYCLE_ID,
      attemptsLeft: 2,
    });

    setAuthState(1);
    await rerender(tree());
    expect(flow!.attemptStatus).toBeNull();
  });

  it.each([
    [
      'remote diagnostic reset',
      {
        ...AUTH_USER,
        cefrLevel: null,
        diagnosticCompleted: false,
        diagnosticAcknowledged: false,
      } satisfies User,
    ],
    [
      'remote completed-placement reveal',
      {
        ...AUTH_USER,
        cefrLevel: 'B2',
        diagnosticCompleted: true,
        diagnosticAcknowledged: false,
      } satisfies User,
    ],
  ])('discards all flow state on a %s without a token rotation', async (_case, refreshedUser) => {
    const view = await render(tree());

    await act(async () => {
      flow!.setAnswerMode('native');
      flow!.showFeedback('q-1', {
        cycleId: CYCLE_ID,
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 45,
        transcript: 'I tried.',
        feedback: 'Add detail.',
      });
    });
    const oldFlow = flow!;
    expect(oldFlow.sessionTally.attempts).toBe(1);

    setAuthState(0, refreshedUser);
    await view.rerender(tree());

    expect(flow).not.toBe(oldFlow);
    expect(flow!.answerMode).toBe('english');
    expect(flow!.feedback).toBeNull();
    expect(flow!.attemptStatus).toBeNull();
    expect(flow!.sessionTally).toEqual({ attempts: 0, passed: 0, mastered: 0, levelUps: 0 });
  });

  it('discards feedback when the auth sessionVersion changes', async () => {
    const { rerender } = await render(tree());

    await act(async () => {
      flow!.showFeedback('q-1', RESULT);
      flow!.setAnswerMode('native');
    });
    expect(feedbackText()).toBe('q-1');
    expect(flow!.answerMode).toBe('native');

    // A re-render with the same session keeps the feedback.
    await rerender(tree());
    expect(feedbackText()).toBe('q-1');

    setAuthState(1);
    await rerender(tree());

    expect(flow!.feedback).toBeNull();
    expect(flow!.answerMode).toBe('english');
    expect(feedbackText()).toBe('none');
  });

  it('does not let a callback retained from a previous session repopulate feedback', async () => {
    const { rerender } = await render(tree());
    const previousSessionFlow = flow!;

    await act(async () => {
      previousSessionFlow.showFeedback('old-question', RESULT);
    });
    expect(feedbackText()).toBe('old-question');

    setAuthState(1);
    await rerender(tree());
    const currentSessionFlow = flow!;
    expect(currentSessionFlow).not.toBe(previousSessionFlow);
    expect(feedbackText()).toBe('none');

    await act(async () => {
      previousSessionFlow.showFeedback('stale-question', RESULT);
    });
    expect(currentSessionFlow.feedback).toBeNull();
    expect(feedbackText()).toBe('none');

    await act(async () => {
      currentSessionFlow.showFeedback('current-question', RESULT);
    });
    expect(feedbackText()).toBe('current-question');
  });

  it('throws when usePracticeFlow runs outside the provider', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    function Bare() {
      usePracticeFlow();
      return null;
    }

    await expect(render(<Bare />)).rejects.toThrow(
      'usePracticeFlow must be used within PracticeFlowProvider',
    );
    consoleSpy.mockRestore();
  });
});

describe('applyFailedAttemptToQuestionCache', () => {
  const USER: User = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    nativeLanguage: 'te',
    uiLanguage: 'en',
    cefrLevel: 'B1',
    diagnosticCompleted: true,
  };

  const QUERY_KEY = ['practice-question', USER.id, USER.cefrLevel];

  const PAYLOAD: PracticeQuestionPayload = {
    question: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      cefrLevel: 'B1',
      promptWord: 'courage',
      questionText: 'Describe a time you showed courage.',
    },
    kind: 'new',
    progress: { masteredCount: 2, learningCount: 1, totalAtLevel: 8 },
    cycleId: CYCLE_ID,
    attemptsUsed: 0,
    attemptsLeft: 3,
  };

  const MISS: AttemptResult = {
    cycleId: CYCLE_ID,
    passed: false,
    mastered: false,
    attemptNo: 1,
    attemptsLeft: 2,
    score: 45,
    transcript: 'I tried to answer.',
    feedback: 'Add more detail.',
  };

  const queryClients: QueryClient[] = [];

  function seededClient(current: PracticeQuestionPayload = PAYLOAD): QueryClient {
    const queryClient = new QueryClient();
    queryClient.setQueryData(QUERY_KEY, current);
    queryClients.push(queryClient);
    return queryClient;
  }

  afterEach(() => {
    // Cancel cache-gc timers so the jest process can exit promptly.
    for (const queryClient of queryClients) queryClient.clear();
    queryClients.length = 0;
  });

  it('moves a cached new word into revision after a real scored miss', () => {
    const queryClient = seededClient();

    applyFailedAttemptToQuestionCache(queryClient, USER, PAYLOAD.question.id, MISS);

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual({
      ...PAYLOAD,
      kind: 'revision',
      attemptsUsed: 1,
      attemptsLeft: 2,
      progress: { ...PAYLOAD.progress, learningCount: 2 },
    });
  });

  it('does not double-count a word already in revision', () => {
    const revision = { ...PAYLOAD, kind: 'revision' as const };
    const queryClient = seededClient(revision);

    applyFailedAttemptToQuestionCache(queryClient, USER, PAYLOAD.question.id, MISS);

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual({
      ...revision,
      attemptsUsed: 1,
      attemptsLeft: 2,
    });
  });

  it('ignores a miss reported for a different cached question', () => {
    const queryClient = seededClient();

    applyFailedAttemptToQuestionCache(
      queryClient,
      USER,
      '550e8400-e29b-41d4-a716-446655440002',
      MISS,
    );

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(PAYLOAD);
  });

  it('ignores a stale result from an older serving cycle of the same word', () => {
    const current = { ...PAYLOAD, cycleId: NEXT_CYCLE_ID };
    const queryClient = seededClient(current);

    applyFailedAttemptToQuestionCache(queryClient, USER, PAYLOAD.question.id, MISS);

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(current);
  });

  it.each([
    [
      'silence',
      {
        ...MISS,
        noSpeech: true,
        attemptNo: 1,
        attemptsLeft: 3,
        score: 0,
        transcript: '',
      } satisfies AttemptResult,
    ],
    ['a passed attempt', { ...MISS, passed: true, attemptsLeft: 0 } satisfies AttemptResult],
  ])('leaves the cache untouched for %s', (_case, result) => {
    const queryClient = seededClient();

    applyFailedAttemptToQuestionCache(queryClient, USER, PAYLOAD.question.id, result);

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(PAYLOAD);
  });

  it('moves a new word into revision and advances the shared count after native speech', () => {
    const queryClient = seededClient();
    const native: NativeAttemptResult = {
      mode: 'native',
      cycleId: CYCLE_ID,
      understood: false,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'నేను రైలులో ప్రయాణిస్తాను.',
      translatedTranscript: 'I travel by train.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'That answer was about travel, not courage.',
    };

    applyFailedAttemptToQuestionCache(queryClient, USER, PAYLOAD.question.id, native);

    expect(queryClient.getQueryData(QUERY_KEY)).toEqual({
      ...PAYLOAD,
      kind: 'revision',
      attemptsUsed: 1,
      attemptsLeft: 2,
      progress: { ...PAYLOAD.progress, learningCount: 2 },
    });
  });

  it('does nothing when no question payload is cached', () => {
    const queryClient = new QueryClient();
    queryClients.push(queryClient);

    applyFailedAttemptToQuestionCache(queryClient, USER, PAYLOAD.question.id, MISS);

    expect(queryClient.getQueryData(QUERY_KEY)).toBeUndefined();
  });
});

describe('session tally', () => {
  const failResult: AttemptResult = {
    cycleId: CYCLE_ID,
    passed: false,
    mastered: false,
    attemptNo: 1,
    attemptsLeft: 2,
    score: 40,
    transcript: 'short answer',
    feedback: 'Add detail.',
  };

  const passResult: AttemptResult = {
    cycleId: CYCLE_ID,
    passed: true,
    mastered: false,
    attemptNo: 2,
    attemptsLeft: 0,
    score: 65,
    transcript: 'a better answer',
    feedback: 'Good.',
  };

  const levelUpResult: AttemptResult = {
    ...RESULT,
    levelUp: { from: 'B1', to: 'B2' },
  };

  const nativeResult: NativeAttemptResult = {
    mode: 'native',
    cycleId: CYCLE_ID,
    understood: true,
    attemptNo: 1,
    attemptsLeft: 2,
    transcript: 'నా జవాబు',
    translatedTranscript: 'My answer.',
    modelAnswer: 'My answer.',
    feedback: 'You understood.',
  };

  const noSpeechResult: AttemptResult = {
    cycleId: CYCLE_ID,
    passed: false,
    mastered: false,
    attemptNo: 1,
    attemptsLeft: 3,
    noSpeech: true,
    score: 0,
    transcript: '',
    feedback: 'We heard nothing.',
  };

  it('starts empty and counts spoken attempts by outcome', async () => {
    await render(tree());
    expect(flow!.sessionTally).toEqual({ attempts: 0, passed: 0, mastered: 0, levelUps: 0 });

    await act(async () => flow!.showFeedback('q-1', failResult));
    expect(flow!.sessionTally).toEqual({ attempts: 1, passed: 0, mastered: 0, levelUps: 0 });

    await act(async () => flow!.showFeedback('q-1', passResult));
    expect(flow!.sessionTally).toEqual({ attempts: 2, passed: 1, mastered: 0, levelUps: 0 });

    await act(async () => flow!.showFeedback('q-2', RESULT));
    expect(flow!.sessionTally).toEqual({ attempts: 3, passed: 2, mastered: 1, levelUps: 0 });

    await act(async () => flow!.showFeedback('q-3', levelUpResult));
    expect(flow!.sessionTally).toEqual({ attempts: 4, passed: 3, mastered: 2, levelUps: 1 });
  });

  it('counts native speech but keeps silence free', async () => {
    await render(tree());

    await act(async () => flow!.showFeedback('q-1', nativeResult));
    await act(async () => flow!.showFeedback('q-1', noSpeechResult));
    expect(flow!.sessionTally).toEqual({ attempts: 1, passed: 0, mastered: 0, levelUps: 0 });
  });

  it('resets on demand for the Home summary dismissal', async () => {
    await render(tree());

    await act(async () => flow!.showFeedback('q-1', passResult));
    expect(flow!.sessionTally.attempts).toBe(1);

    await act(async () => flow!.resetSessionTally());
    expect(flow!.sessionTally).toEqual({ attempts: 0, passed: 0, mastered: 0, levelUps: 0 });
  });

  it('discards the tally on an authentication transition', async () => {
    const view = await render(tree());

    await act(async () => flow!.showFeedback('q-1', passResult));
    expect(flow!.sessionTally.attempts).toBe(1);

    setAuthState(1);
    await view.rerender(tree());
    expect(flow!.sessionTally).toEqual({ attempts: 0, passed: 0, mastered: 0, levelUps: 0 });
  });
});
