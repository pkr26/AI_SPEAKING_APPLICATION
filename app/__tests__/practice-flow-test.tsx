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
    });
    expect(feedbackText()).toBe('q-1');

    // A re-render with the same session keeps the feedback.
    await rerender(tree());
    expect(feedbackText()).toBe('q-1');

    setSessionVersion(1);
    await rerender(tree());

    expect(flow!.feedback).toBeNull();
    expect(feedbackText()).toBe('none');
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
