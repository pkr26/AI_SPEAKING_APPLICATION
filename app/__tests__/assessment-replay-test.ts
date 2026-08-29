import {
  assessmentContextForEndpoint,
  parseAssessmentReplayStatus,
} from '../src/lib/assessment-replay';
import type { PendingAssessment } from '../src/lib/pending-assessment';
import { ContractError } from '../src/lib/types';

const OWNER_ID = '550e8400-e29b-41d4-a716-446655440000';
const QUESTION_ID = '550e8400-e29b-41d4-a716-446655440001';
const NEXT_QUESTION_ID = '550e8400-e29b-41d4-a716-446655440002';
const REQUEST_ID = '550e8400-e29b-41d4-a716-446655440003';
const CYCLE_ID = '550e8400-e29b-41d4-a716-446655440020';

const question = {
  id: QUESTION_ID,
  cefrLevel: 'B1' as const,
  promptWord: 'courage',
  questionText: 'Describe a time you showed courage.',
};

function pending(endpoint: PendingAssessment['endpoint']): PendingAssessment {
  return {
    ownerId: OWNER_ID,
    endpoint,
    questionId: QUESTION_ID,
    ...(endpoint === '/diagnostic/answer' ? {} : { cycleId: CYCLE_ID }),
    requestId: REQUEST_ID,
    createdAt: 1_700_000_000_000,
    retainRecording: false,
    stage: 'feedback-pending',
    feedbackReadyAt: 1_700_000_000_001,
  };
}

const practiceResult = {
  cycleId: CYCLE_ID,
  passed: false,
  mastered: false,
  attemptNo: 1,
  attemptsLeft: 2,
  score: 45,
  transcript: 'I tried to answer.',
  feedback: 'Add more detail.',
};

describe('assessment replay response validation', () => {
  it.each([
    ['/diagnostic/answer', 'diagnostic'],
    ['/practice/attempt', 'practice'],
    ['/practice/attempt/native', 'practice-native'],
  ] as const)('maps %s onto %s', (endpoint, context) => {
    expect(assessmentContextForEndpoint(endpoint)).toBe(context);
  });

  it('accepts a processing response only for the exact practice identity', () => {
    const pointer = pending('/practice/attempt');
    expect(
      parseAssessmentReplayStatus(
        {
          status: 'processing',
          context: 'practice',
          questionId: QUESTION_ID,
          cycleId: CYCLE_ID,
          question,
          additiveFutureField: true,
        },
        pointer,
      ),
    ).toEqual({
      status: 'processing',
      context: 'practice',
      questionId: QUESTION_ID,
      cycleId: CYCLE_ID,
      question,
    });
  });

  it('parses completed English, native, and diagnostic responses', () => {
    expect(
      parseAssessmentReplayStatus(
        {
          status: 'completed',
          context: 'practice',
          questionId: QUESTION_ID,
          cycleId: CYCLE_ID,
          question,
          response: practiceResult,
        },
        pending('/practice/attempt'),
      ),
    ).toMatchObject({ status: 'completed', result: practiceResult });

    const nativeResult = {
      mode: 'native',
      cycleId: CYCLE_ID,
      understood: true,
      attemptNo: 1,
      attemptsLeft: 2,
      transcript: 'నేను ధైర్యంగా ఉన్నాను.',
      translatedTranscript: 'I was brave.',
      modelAnswer: 'I showed courage when I spoke up.',
      feedback: 'You understood the question.',
    } as const;
    expect(
      parseAssessmentReplayStatus(
        {
          status: 'completed',
          context: 'practice-native',
          questionId: QUESTION_ID,
          cycleId: CYCLE_ID,
          question,
          response: nativeResult,
        },
        pending('/practice/attempt/native'),
      ),
    ).toMatchObject({ status: 'completed', result: nativeResult });

    const diagnosticResult = {
      passed: true,
      score: 88,
      transcript: 'I spoke up at work.',
      feedback: 'Clear answer.',
      done: false,
      nextQuestion: {
        id: NEXT_QUESTION_ID,
        cefrLevel: 'B2',
        promptWord: 'journey',
        questionText: 'Describe an important journey.',
      },
    } as const;
    expect(
      parseAssessmentReplayStatus(
        {
          status: 'completed',
          context: 'diagnostic',
          questionId: QUESTION_ID,
          cycleId: null,
          question,
          response: diagnosticResult,
        },
        pending('/diagnostic/answer'),
      ),
    ).toMatchObject({ status: 'completed', result: diagnosticResult });
  });

  it.each([
    null,
    {},
    { status: 'unknown' },
    {
      status: 'processing',
      context: 'practice-native',
      questionId: QUESTION_ID,
      cycleId: CYCLE_ID,
      question,
    },
    {
      status: 'processing',
      context: 'practice',
      questionId: NEXT_QUESTION_ID,
      cycleId: CYCLE_ID,
      question,
    },
    {
      status: 'processing',
      context: 'practice',
      questionId: QUESTION_ID,
      cycleId: NEXT_QUESTION_ID,
      question,
    },
    {
      status: 'processing',
      context: 'practice',
      questionId: QUESTION_ID,
      cycleId: CYCLE_ID,
      question: { ...question, id: NEXT_QUESTION_ID },
    },
    {
      status: 'completed',
      context: 'practice',
      questionId: QUESTION_ID,
      cycleId: CYCLE_ID,
      question,
    },
    {
      status: 'completed',
      context: 'practice',
      questionId: QUESTION_ID,
      cycleId: CYCLE_ID,
      question,
      response: { ...practiceResult, cycleId: NEXT_QUESTION_ID },
    },
  ])('rejects mismatched or malformed status %#', (value) => {
    expect(() => parseAssessmentReplayStatus(value, pending('/practice/attempt'))).toThrow(
      ContractError,
    );
  });
});
