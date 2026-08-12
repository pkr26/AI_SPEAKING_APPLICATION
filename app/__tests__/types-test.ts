import {
  ContractError,
  parseAttemptResult,
  parseAudioUploadGrant,
  parseAuthResponse,
  parseDiagnosticAnswerResult,
  parseDiagnosticNext,
  parseHelpContent,
  parseQuestionResponse,
  parseUser,
  parseUserResponse,
} from '../src/lib/types';

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

describe('field validators', () => {
  it.each(['hi', 'es', 'zh'])('accepts native language %s', (nativeLanguage) => {
    expect(parseUser({ ...user, nativeLanguage })).toMatchObject({
      nativeLanguage,
    });
  });

  it.each(['fr', 'TE', '', 't e', 'english'])(
    'rejects native language %p',
    (nativeLanguage) => {
      expectContractError(() => parseUser({ ...user, nativeLanguage }));
    },
  );

  it.each(['A1', 'A2', 'B2', 'C1', 'C2'])(
    'accepts CEFR level %s',
    (cefrLevel) => {
      expect(parseUser({ ...user, cefrLevel })).toMatchObject({ cefrLevel });
    },
  );

  it('accepts a null CEFR level before the diagnostic', () => {
    expect(parseUser({ ...user, cefrLevel: null })).toMatchObject({
      cefrLevel: null,
    });
  });

  it.each(['a1', 'B9', '', 'D1', 'A0'])('rejects CEFR level %p', (cefrLevel) => {
    expectContractError(() => parseUser({ ...user, cefrLevel }));
  });

  it.each([
    'x550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440000x',
    'aa550e8400-e29b-41d4-a716-446655440000bb',
    '550e8400-e29b-41d4-a716-446655440000 trailing',
    '550e8400-e29b-41d4-a716-4466554400000',
  ])('rejects UUID anchored with junk %p', (id) => {
    expectContractError(() => parseUser({ ...user, id }));
  });

  it('rejects whitespace-only identity fields and non-boolean flags', () => {
    expectContractError(() => parseUser({ ...user, name: '   ' }));
    expectContractError(() => parseUser({ ...user, email: '\t ' }));
    expectContractError(() => parseUser({ ...user, diagnosticCompleted: 1 }));
  });
});

describe('score and progress boundaries', () => {
  const doneAnswer = {
    passed: true,
    score: 0,
    transcript: '',
    feedback: 'Good start.',
    done: true,
    level: 'A1',
  } as const;

  it.each([0, 100])('accepts boundary score %i', (score) => {
    expect(
      parseDiagnosticAnswerResult({ ...doneAnswer, score }),
    ).toMatchObject({ score });
  });

  it.each([-1])('rejects out-of-range score %i', (score) => {
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...doneAnswer, score }),
    );
  });

  it('accepts the final-question progress boundary', () => {
    const value = {
      done: false,
      question,
      progress: { asked: 0, maxQuestions: 1 },
    } as const;
    expect(parseDiagnosticNext(value)).toEqual(value);
  });

  it('rejects non-integer and out-of-range progress values', () => {
    expectContractError(() => parseDiagnosticNext(null));
    expectContractError(() => parseDiagnosticNext({ done: 'yes' }));
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 0.5, maxQuestions: 6 },
      }),
    );
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 0, maxQuestions: 1.5 },
      }),
    );
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 0, maxQuestions: 0 },
      }),
    );
  });

  it('rejects non-boolean diagnostic answer flags', () => {
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...doneAnswer, passed: 'yes' }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...doneAnswer, done: 1 }),
    );
  });
});

describe('help and attempt detail boundaries', () => {
  const help = {
    promptWord: 'travel',
    promptWordNative: 'ప్రయాణం',
    questionText: question.questionText,
    questionTextNative: 'ప్రశ్న',
    examples: [{ en: 'I travel often.', native: 'నేను తరచుగా ప్రయాణిస్తాను.' }],
  } as const;

  it('rejects blank help example fields', () => {
    expect(parseHelpContent(help)).toEqual(help);
    expectContractError(() =>
      parseHelpContent({ ...help, examples: [{ en: '', native: 'x' }] }),
    );
    expectContractError(() =>
      parseHelpContent({ ...help, examples: [{ en: '   ', native: 'x' }] }),
    );
    expectContractError(() =>
      parseHelpContent({ ...help, examples: [{ en: 'x', native: '' }] }),
    );
    expectContractError(() =>
      parseHelpContent({ ...help, examples: [{ en: 'x', native: '  ' }] }),
    );
  });

  it('enforces attempt number and attempts-left bounds', () => {
    const base = {
      passed: false,
      attemptNo: 3,
      score: 50,
      transcript: '',
      feedback: 'Try again.',
    };
    expect(parseAttemptResult(base)).toEqual(base);
    expect(parseAttemptResult({ ...base, attemptNo: 1, attemptsLeft: 2 })).toEqual({
      ...base,
      attemptNo: 1,
      attemptsLeft: 2,
    });
    expect(parseAttemptResult({ ...base, attemptsLeft: 0 })).toEqual({
      ...base,
      attemptsLeft: 0,
    });
    expectContractError(() => parseAttemptResult({ ...base, attemptNo: 4 }));
    expectContractError(() => parseAttemptResult({ ...base, attemptsLeft: -1 }));
    expectContractError(() => parseAttemptResult({ ...base, attemptsLeft: 3 }));
    expectContractError(() =>
      parseAttemptResult({ ...base, attemptsLeft: 0.5 }),
    );
  });

  it('validates optional final feedback and follow-up questions', () => {
    const base = {
      passed: true,
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
    };
    expect(
      parseAttemptResult({ ...base, finalFeedback: 'Solid progress.' }),
    ).toEqual({ ...base, finalFeedback: 'Solid progress.' });
    expectContractError(() =>
      parseAttemptResult({ ...base, finalFeedback: '   ' }),
    );
    expect(parseAttemptResult({ ...base, nextQuestion: question })).toEqual({
      ...base,
      nextQuestion: question,
    });
  });
});

describe('audio upload grant parser', () => {
  it('accepts direct and s3 grants', () => {
    expect(parseAudioUploadGrant({ mode: 'direct' })).toEqual({
      mode: 'direct',
    });
    const s3 = {
      mode: 's3',
      uploadUrl: 'https://bucket.s3.amazonaws.com/key?sig=1',
      audioKey: 'audio-uploads/user/1.m4a',
      expiresIn: 900,
    };
    expect(parseAudioUploadGrant(s3)).toEqual(s3);
  });

  it('strips unknown fields from grants', () => {
    expect(parseAudioUploadGrant({ mode: 'direct', extra: 'x' })).toEqual({
      mode: 'direct',
    });
  });

  it.each([
    null,
    undefined,
    'direct',
    42,
    [],
    { mode: 'bogus' },
    { mode: 1, uploadUrl: 'https://x', audioKey: 'k', expiresIn: 10 },
    { mode: 's3' },
    { mode: 's3', uploadUrl: '', audioKey: 'k', expiresIn: 10 },
    { mode: 's3', uploadUrl: '   ', audioKey: 'k', expiresIn: 10 },
    { mode: 's3', uploadUrl: 'https://x', audioKey: '', expiresIn: 10 },
    { mode: 's3', uploadUrl: 'https://x', audioKey: '   ', expiresIn: 10 },
    { mode: 's3', uploadUrl: 'https://x', audioKey: 'k' },
    { mode: 's3', uploadUrl: 'https://x', audioKey: 'k', expiresIn: '10' },
    { mode: 's3', uploadUrl: 'https://x', audioKey: 'k', expiresIn: Number.NaN },
    {
      mode: 's3',
      uploadUrl: 'https://x',
      audioKey: 'k',
      expiresIn: Number.POSITIVE_INFINITY,
    },
  ])('rejects malformed grant %#', (value) => {
    expectContractError(() => parseAudioUploadGrant(value));
  });
});
