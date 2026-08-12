import {
  ContractError,
  parseAttemptResult,
  parseAuthResponse,
  parseDiagnosticAnswerResult,
  parseDiagnosticNext,
  parseHelpContent,
  parseQuestionResponse,
  parseUser,
  parseUserResponse,
} from '../lib/types';

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Learner',
  email: 'learner@example.com',
  nativeLanguage: 'te',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
} as const;

const question = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  cefrLevel: 'B1',
  promptWord: 'travel',
  questionText: 'Where would you like to travel?',
} as const;

function expectContractError(run: () => unknown): void {
  expect(run).toThrow(ContractError);
}

describe('identity contract parsers', () => {
  it('accepts valid user and auth envelopes', () => {
    expect(parseUser(user)).toEqual(user);
    expect(parseUserResponse({ user })).toEqual({ user });
    expect(parseAuthResponse({ token: 'jwt', user })).toEqual({
      token: 'jwt',
      user,
    });
  });

  it.each([
    null,
    [],
    { ...user, nativeLanguage: 'xx' },
    { ...user, cefrLevel: 1 },
    { ...user, cefrLevel: 'B9' },
    { ...user, id: 'not-a-uuid' },
    { ...user, diagnosticCompleted: 'true' },
  ])('rejects malformed user value %#', (value) => {
    expectContractError(() => parseUser(value));
  });

  it('rejects malformed identity envelopes', () => {
    expectContractError(() => parseUserResponse({}));
    expectContractError(() => parseAuthResponse({ token: 123, user }));
    expectContractError(() => parseAuthResponse({ token: '', user }));
    expectContractError(() => parseAuthResponse({ token: 'jwt', user: null }));
  });
});

describe('question and diagnostic contract parsers', () => {
  it('accepts valid question and both diagnostic-next variants', () => {
    expect(parseQuestionResponse({ question })).toEqual({ question });
    expect(
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 0, maxQuestions: 6 },
      }),
    ).toEqual({
      done: false,
      question,
      progress: { asked: 0, maxQuestions: 6 },
    });
    expect(parseDiagnosticNext({ done: true, level: 'B1' })).toEqual({
      done: true,
      level: 'B1',
    });
  });

  it('rejects missing, non-finite, and wrong-type diagnostic fields', () => {
    expectContractError(() => parseQuestionResponse({ question: {} }));
    expectContractError(() =>
      parseQuestionResponse({ question: { ...question, cefrLevel: 'B9' } }),
    );
    expectContractError(() => parseDiagnosticNext({ done: true }));
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: Number.NaN, maxQuestions: 6 },
      }),
    );
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: -1, maxQuestions: 6 },
      }),
    );
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 6, maxQuestions: 6 },
      }),
    );
    expectContractError(() =>
      parseDiagnosticNext({ done: true, level: 'B9' }),
    );
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 0, maxQuestions: Number.POSITIVE_INFINITY },
      }),
    );
  });

  it('accepts valid diagnostic answers and rejects malformed optional values', () => {
    const answer = {
      passed: true,
      score: 82,
      transcript: 'I would travel to Spain.',
      feedback: 'Clear and relevant.',
      done: false,
      nextQuestion: question,
    };
    expect(parseDiagnosticAnswerResult(answer)).toEqual(answer);
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, score: Number.NaN }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, score: 101 }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, feedback: '  ' }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, nextQuestion: null }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, done: false, nextQuestion: undefined }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, done: true, level: undefined }),
    );
  });
});

describe('practice contract parsers', () => {
  it('accepts complete help and attempt responses', () => {
    const help = {
      promptWord: 'travel',
      promptWordNative: 'ప్రయాణం',
      questionText: question.questionText,
      questionTextNative: 'మీరు ఎక్కడికి వెళ్లాలనుకుంటున్నారు?',
      examples: [{ en: 'I want to travel.', native: 'నేను ప్రయాణించాలనుకుంటున్నాను.' }],
    };
    expect(parseHelpContent(help)).toEqual(help);

    const attempt = {
      passed: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 60,
      transcript: 'Spain.',
      feedback: 'Add more detail.',
      finalFeedback: 'Use a full sentence.',
      nextQuestion: question,
    };
    expect(parseAttemptResult(attempt)).toEqual(attempt);
  });

  it('rejects malformed nested help examples and practice edge values', () => {
    expectContractError(() =>
      parseHelpContent({
        promptWord: 'travel',
        promptWordNative: 'ప్రయాణం',
        questionText: question.questionText,
        questionTextNative: 'ప్రశ్న',
        examples: [{ en: 'Example without translation' }],
      }),
    );
    expectContractError(() =>
      parseHelpContent({
        promptWord: 'travel',
        promptWordNative: 'ప్రయాణం',
        questionText: question.questionText,
        questionTextNative: 'ప్రశ్న',
        examples: [],
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        attemptNo: 1,
        attemptsLeft: Number.POSITIVE_INFINITY,
        score: 50,
        transcript: '',
        feedback: 'Try again.',
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        attemptNo: 0,
        score: 50,
        transcript: '',
        feedback: 'Try again.',
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        attemptNo: 1,
        score: -1,
        transcript: '',
        feedback: 'Try again.',
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        attemptNo: 1,
        score: 50,
        transcript: '',
        feedback: 'Try again.',
        nextQuestion: [],
      }),
    );
  });
});
