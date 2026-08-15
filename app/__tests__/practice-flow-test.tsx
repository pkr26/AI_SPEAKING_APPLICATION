import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { useAuth } from '../src/lib/auth';
import { PracticeFlowProvider, usePracticeFlow } from '../src/lib/practice-flow';
import type { AttemptResult } from '../src/lib/types';

// React 19 requires this opt-in before act() can track async updates.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../src/lib/auth', () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = jest.mocked(useAuth);

const RESULT: AttemptResult = {
  passed: true,
  mastered: true,
  attemptNo: 1,
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

function setSessionVersion(sessionVersion: number) {
  mockedUseAuth.mockReturnValue({
    sessionVersion,
  } as unknown as ReturnType<typeof useAuth>);
}

function feedbackText(): string {
  return String(screen.getByTestId('feedback').props.children);
}

beforeEach(() => {
  jest.resetAllMocks();
  flow = null;
  setSessionVersion(0);
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

    setSessionVersion(1);
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

    setSessionVersion(1);
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
