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
  it('uses stable, actionable contract-error identity and copy', () => {
    expect(new ContractError()).toMatchObject({
      name: 'ContractError',
      message: 'The server returned an invalid response. Please try again.',
    });
  });

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

  it('rejects a callable user even when it exposes every valid field', () => {
    const callable = () => undefined;
    for (const [key, value] of Object.entries(user)) {
      Object.defineProperty(callable, key, { configurable: true, enumerable: true, value });
    }

    expectContractError(() => parseUser(callable));
  });

  it('enforces the auth token length boundary', () => {
    const token = 'x'.repeat(16_384);

    expect(parseAuthResponse({ token, user })).toEqual({ token, user });
    expectContractError(() => parseAuthResponse({ token: 'x'.repeat(16_385), user }));
  });

  it('rejects null and array auth, user, and question envelopes', () => {
    expectContractError(() => parseAuthResponse(null));
    expectContractError(() => parseAuthResponse(Object.assign([], { token: 'jwt', user })));
    expectContractError(() => parseUserResponse(null));
    expectContractError(() => parseUserResponse(Object.assign([], { user })));
    expectContractError(() => parseQuestionResponse(null));
    expectContractError(() => parseQuestionResponse(Object.assign([], { question })));
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
    expectContractError(() => parseDiagnosticNext({ done: true, level: 'B9' }));
    expectContractError(() =>
      parseDiagnosticNext(
        Object.assign([], {
          done: false,
          question,
          progress: { asked: 0, maxQuestions: 6 },
        }),
      ),
    );
    for (const progress of [null, Object.assign([], { asked: 0, maxQuestions: 6 })]) {
      expectContractError(() =>
        parseDiagnosticNext({
          done: false,
          question,
          progress,
        }),
      );
    }
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
    expectContractError(() => parseDiagnosticAnswerResult({ ...answer, score: Number.NaN }));
    expectContractError(() => parseDiagnosticAnswerResult({ ...answer, score: 101 }));
    expectContractError(() => parseDiagnosticAnswerResult({ ...answer, feedback: '  ' }));
    expectContractError(() => parseDiagnosticAnswerResult({ ...answer, nextQuestion: null }));
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, done: false, nextQuestion: undefined }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...answer, done: true, level: undefined }),
    );
  });

  it('enforces diagnostic-next discriminants one forbidden field at a time', () => {
    const pending = {
      done: false,
      question,
      progress: { asked: 0, maxQuestions: 6 },
    } as const;
    const complete = { done: true, level: 'B1' } as const;

    expectContractError(() => parseDiagnosticNext({ ...pending, level: 'B1' }));
    expectContractError(() => parseDiagnosticNext({ ...complete, question }));
    expectContractError(() =>
      parseDiagnosticNext({ ...complete, progress: { asked: 0, maxQuestions: 6 } }),
    );
    expectContractError(() => parseDiagnosticNext({ ...pending, done: 0 }));
    expectContractError(() => parseDiagnosticNext({ ...pending, done: null }));
  });

  it('enforces diagnostic-answer discriminants one forbidden field at a time', () => {
    const pending = {
      passed: true,
      score: 82,
      transcript: 'I would travel to Spain.',
      feedback: 'Clear and relevant.',
      done: false,
      nextQuestion: question,
    } as const;
    const complete = {
      passed: true,
      score: 82,
      transcript: 'I would travel to Spain.',
      feedback: 'Clear and relevant.',
      done: true,
      level: 'B1',
    } as const;

    expectContractError(() => parseDiagnosticAnswerResult({ ...pending, level: 'B1' }));
    expectContractError(() =>
      parseDiagnosticAnswerResult({
        passed: complete.passed,
        score: complete.score,
        transcript: complete.transcript,
        feedback: complete.feedback,
        done: true,
      }),
    );
    expectContractError(() => parseDiagnosticAnswerResult({ ...complete, nextQuestion: question }));
  });
});

describe('practice contract parsers', () => {
  const help = {
    promptWord: 'travel',
    promptWordNative: 'ప్రయాణం',
    questionText: question.questionText,
    questionTextNative: 'మీరు ఎక్కడికి వెళ్లాలనుకుంటున్నారు?',
    examples: [
      { en: 'I want to travel.', native: 'నేను ప్రయాణించాలనుకుంటున్నాను.' },
      { en: 'I travel by train.', native: 'నేను రైలులో ప్రయాణిస్తాను.' },
      { en: 'Travel teaches me.', native: 'ప్రయాణం నాకు నేర్పుతుంది.' },
    ],
  } as const;

  it('accepts complete help and attempt responses', () => {
    expect(parseHelpContent(help)).toEqual(help);

    const attempt = {
      passed: false,
      attemptNo: 3,
      attemptsLeft: 0,
      score: 60,
      transcript: 'Spain.',
      feedback: 'Add more detail.',
      finalFeedback: 'Use a full sentence.',
      nextQuestion: question,
    };
    expect(parseAttemptResult(attempt)).toEqual(attempt);
  });

  it.each([
    ['an array envelope', Object.assign([], help)],
    ['a missing prompt word', { ...help, promptWord: undefined }],
    ['a non-string prompt word', { ...help, promptWord: 42 }],
    ['a blank prompt word', { ...help, promptWord: '   ' }],
    ['an oversized prompt word', { ...help, promptWord: 'x'.repeat(101) }],
    ['a missing native prompt word', { ...help, promptWordNative: undefined }],
    ['a non-string native prompt word', { ...help, promptWordNative: 42 }],
    ['a blank native prompt word', { ...help, promptWordNative: '   ' }],
    ['an oversized native prompt word', { ...help, promptWordNative: 'x'.repeat(501) }],
    ['a missing question', { ...help, questionText: undefined }],
    ['a non-string question', { ...help, questionText: 42 }],
    ['a blank question', { ...help, questionText: '   ' }],
    ['an oversized question', { ...help, questionText: 'x'.repeat(1_001) }],
    ['a missing native question', { ...help, questionTextNative: undefined }],
    ['a non-string native question', { ...help, questionTextNative: 42 }],
    ['a blank native question', { ...help, questionTextNative: '   ' }],
    ['an oversized native question', { ...help, questionTextNative: 'x'.repeat(4_001) }],
    ['non-array examples', { ...help, examples: 'not-an-array' }],
    ['too few examples', { ...help, examples: help.examples.slice(0, 2) }],
    ['too many examples', { ...help, examples: [...help.examples, help.examples[0]] }],
  ])('rejects help content with %s', (_label, value) => {
    expectContractError(() => parseHelpContent(value));
  });

  it('rejects array and wrong-boolean attempt envelopes that otherwise satisfy the contract', () => {
    const passedAttempt = {
      passed: true,
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
      nextQuestion: question,
    } as const;

    expectContractError(() => parseAttemptResult(Object.assign([], passedAttempt)));
    expectContractError(() => parseAttemptResult({ ...passedAttempt, passed: 'yes' }));
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

  it.each(['fr', 'TE', '', 't e', 'english'])('rejects native language %p', (nativeLanguage) => {
    expectContractError(() => parseUser({ ...user, nativeLanguage }));
  });

  it.each(['A1', 'A2', 'B2', 'C1', 'C2'])('accepts CEFR level %s', (cefrLevel) => {
    expect(parseUser({ ...user, cefrLevel })).toMatchObject({ cefrLevel });
  });

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
    expect(parseDiagnosticAnswerResult({ ...doneAnswer, score })).toMatchObject({ score });
  });

  it.each([-1, 50.5])('rejects out-of-contract score %s', (score) => {
    expectContractError(() => parseDiagnosticAnswerResult({ ...doneAnswer, score }));
  });

  it('accepts the final-question progress boundary', () => {
    const value = {
      done: false,
      question,
      progress: { asked: 0, maxQuestions: 1 },
    } as const;
    expect(parseDiagnosticNext(value)).toEqual(value);
    const upper = {
      done: false,
      question,
      progress: { asked: 99, maxQuestions: 100 },
    } as const;
    expect(parseDiagnosticNext(upper)).toEqual(upper);
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
    expectContractError(() =>
      parseDiagnosticNext({
        done: false,
        question,
        progress: { asked: 0, maxQuestions: 101 },
      }),
    );
  });

  it('rejects non-boolean diagnostic answer flags', () => {
    expectContractError(() => parseDiagnosticAnswerResult({ ...doneAnswer, passed: 'yes' }));
    expectContractError(() => parseDiagnosticAnswerResult({ ...doneAnswer, done: 1 }));
    expectContractError(() =>
      parseDiagnosticAnswerResult({
        ...doneAnswer,
        done: 0,
        level: undefined,
        nextQuestion: question,
      }),
    );
  });
});

describe('help and attempt detail boundaries', () => {
  const help = {
    promptWord: 'travel',
    promptWordNative: 'ప్రయాణం',
    questionText: question.questionText,
    questionTextNative: 'ప్రశ్న',
    examples: [
      { en: 'I travel often.', native: 'నేను తరచుగా ప్రయాణిస్తాను.' },
      { en: 'I travel by train.', native: 'నేను రైలులో ప్రయాణిస్తాను.' },
      { en: 'Travel teaches me.', native: 'ప్రయాణం నాకు నేర్పుతుంది.' },
    ],
  } as const;

  it('rejects blank help example fields', () => {
    expect(parseHelpContent(help)).toEqual(help);
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: [{ en: '', native: 'x' }, ...help.examples.slice(1)],
      }),
    );
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: [{ en: '   ', native: 'x' }, ...help.examples.slice(1)],
      }),
    );
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: [{ en: 'x', native: '' }, ...help.examples.slice(1)],
      }),
    );
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: [{ en: 'x', native: '  ' }, ...help.examples.slice(1)],
      }),
    );
  });

  it.each([
    ['a null example', null],
    ['an array example', Object.assign([], { en: 'English', native: 'Native' })],
    ['a missing native translation', { en: 'English only' }],
    ['a non-string English value', { en: 42, native: 'Native' }],
    ['a non-string native value', { en: 'English', native: 42 }],
  ])('rejects exactly three help examples when one is %s', (_label, malformedExample) => {
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: [help.examples[0], malformedExample, help.examples[2]],
      }),
    );
  });

  it('enforces attempt number and attempts-left bounds', () => {
    const final = {
      passed: false,
      attemptNo: 3,
      attemptsLeft: 0,
      score: 50,
      transcript: '',
      feedback: 'Try again.',
      finalFeedback: 'Use a complete sentence next time.',
      nextQuestion: question,
    };
    const firstRetry = {
      passed: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 50,
      transcript: '',
      feedback: 'Try again.',
    };
    expect(parseAttemptResult(final)).toEqual(final);
    expect(parseAttemptResult(firstRetry)).toEqual(firstRetry);
    expectContractError(() =>
      parseAttemptResult({ ...firstRetry, attemptNo: 1.5, attemptsLeft: 1.5 }),
    );
    expectContractError(() => parseAttemptResult({ ...final, attemptNo: 4 }));
    expectContractError(() => parseAttemptResult({ ...final, attemptsLeft: -1 }));
    expectContractError(() => parseAttemptResult({ ...final, attemptsLeft: 3 }));
    expectContractError(() => parseAttemptResult({ ...final, attemptsLeft: 0.5 }));
  });

  it('enforces passed, retry, and final response shapes', () => {
    const passed = {
      passed: true,
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
      nextQuestion: question,
    };
    expect(parseAttemptResult(passed)).toEqual(passed);
    expectContractError(() => parseAttemptResult({ ...passed, attemptNo: 0 }));
    expectContractError(() => parseAttemptResult({ ...passed, finalFeedback: 'Solid progress.' }));
    expectContractError(() => parseAttemptResult({ ...passed, attemptsLeft: 2 }));
    expectContractError(() => parseAttemptResult({ ...passed, nextQuestion: undefined }));

    const retry = {
      passed: false,
      attemptNo: 2,
      attemptsLeft: 1,
      score: 45,
      transcript: 'An answer.',
      feedback: 'Add detail.',
    };
    expect(parseAttemptResult(retry)).toEqual(retry);
    expectContractError(() => parseAttemptResult({ ...retry, attemptsLeft: 2 }));
    expectContractError(() =>
      parseAttemptResult({ ...retry, finalFeedback: 'Only final failures include this.' }),
    );
    expectContractError(() => parseAttemptResult({ ...retry, nextQuestion: question }));

    const final = {
      ...retry,
      attemptNo: 3,
      attemptsLeft: 0,
      finalFeedback: 'Review the example and continue.',
      nextQuestion: question,
    };
    expect(parseAttemptResult(final)).toEqual(final);
    expectContractError(() => parseAttemptResult({ ...final, finalFeedback: '   ' }));
    expectContractError(() => parseAttemptResult({ ...final, nextQuestion: undefined }));
  });

  it('rejects response strings and collections beyond server contract bounds', () => {
    expect(
      parseUser({ ...user, name: 'x'.repeat(100), email: `${'e'.repeat(242)}@example.com` }),
    ).toMatchObject({
      name: 'x'.repeat(100),
      email: `${'e'.repeat(242)}@example.com`,
    });
    expect(
      parseQuestionResponse({
        question: {
          ...question,
          promptWord: 'x'.repeat(100),
          questionText: 'x'.repeat(1_000),
        },
      }),
    ).toMatchObject({ question: { promptWord: 'x'.repeat(100), questionText: 'x'.repeat(1_000) } });
    expect(
      parseDiagnosticAnswerResult({
        passed: true,
        score: 80,
        transcript: 'x'.repeat(12_000),
        feedback: 'x'.repeat(800),
        done: true,
        level: 'B1',
      }),
    ).toMatchObject({ transcript: 'x'.repeat(12_000), feedback: 'x'.repeat(800) });
    expect(
      parseHelpContent({
        ...help,
        promptWord: 'x'.repeat(100),
        promptWordNative: 'x'.repeat(500),
        questionText: 'x'.repeat(1_000),
        questionTextNative: 'x'.repeat(4_000),
        examples: help.examples.map(() => ({ en: 'x'.repeat(4_000), native: 'x'.repeat(4_000) })),
      }),
    ).toMatchObject({ promptWordNative: 'x'.repeat(500), questionTextNative: 'x'.repeat(4_000) });

    expectContractError(() => parseUser({ ...user, name: 'x'.repeat(101) }));
    expectContractError(() => parseUser({ ...user, email: 'x'.repeat(255) }));
    expectContractError(() =>
      parseQuestionResponse({
        question: { ...question, questionText: 'x'.repeat(1_001) },
      }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({
        passed: true,
        score: 80,
        transcript: 'x'.repeat(12_001),
        feedback: 'Good.',
        done: true,
        level: 'B1',
      }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({
        passed: true,
        score: 80,
        transcript: 'Answer.',
        feedback: 'x'.repeat(801),
        done: true,
        level: 'B1',
      }),
    );
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: [{ en: 'x'.repeat(4_001), native: 'y' }, help.examples[1], help.examples[2]],
      }),
    );
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: [{ en: 'x', native: 'y'.repeat(4_001) }, help.examples[1], help.examples[2]],
      }),
    );
    expectContractError(() =>
      parseHelpContent({
        ...help,
        examples: Array.from({ length: 11 }, () => ({ en: 'x', native: 'y' })),
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        attemptNo: 3,
        attemptsLeft: 0,
        score: 50,
        transcript: '',
        feedback: 'Try again.',
        finalFeedback: 'x'.repeat(4_001),
        nextQuestion: question,
      }),
    );

    const boundedAttempt = {
      passed: true,
      attemptNo: 1,
      score: 80,
      transcript: 'x'.repeat(12_000),
      feedback: 'x'.repeat(800),
      nextQuestion: question,
    };
    expect(parseAttemptResult(boundedAttempt)).toEqual(boundedAttempt);
    expectContractError(() =>
      parseAttemptResult({ ...boundedAttempt, transcript: 'x'.repeat(12_001) }),
    );
    expectContractError(() => parseAttemptResult({ ...boundedAttempt, feedback: 'x'.repeat(801) }));
  });
});

describe('audio upload grant parser', () => {
  const audioKey =
    'audio-uploads/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440002.m4a';
  const s3 = {
    mode: 's3',
    uploadUrl: 'https://bucket.s3.amazonaws.com/',
    uploadFields: {
      key: audioKey,
      'Content-Type': 'audio/mp4',
      Policy: 'signed-policy',
    },
    audioKey,
    contentType: 'audio/mp4',
    expiresIn: 900,
    maxBytes: 25 * 1024 * 1024,
  } as const;
  const withAudioKey = (nextAudioKey: string) => ({
    ...s3,
    audioKey: nextAudioKey,
    uploadFields: { ...s3.uploadFields, key: nextAudioKey },
  });

  it('accepts direct and s3 grants', () => {
    expect(parseAudioUploadGrant({ mode: 'direct' })).toEqual({
      mode: 'direct',
    });
    expect(parseAudioUploadGrant(s3)).toEqual(s3);
  });

  it('strips unknown fields from grants', () => {
    expect(parseAudioUploadGrant({ mode: 'direct', extra: 'x' })).toEqual({
      mode: 'direct',
    });
  });

  it.each([
    ['audio/m4a', 'm4a'],
    ['audio/mp4', 'm4a'],
    ['audio/x-m4a', 'm4a'],
    ['video/mp4', 'm4a'],
    ['audio/mpeg', 'mp3'],
    ['audio/mp3', 'mp3'],
    ['audio/wav', 'wav'],
    ['audio/x-wav', 'wav'],
    ['audio/wave', 'wav'],
    ['audio/ogg', 'ogg'],
    ['application/ogg', 'ogg'],
    ['audio/webm', 'webm'],
    ['video/webm', 'webm'],
    ['audio/flac', 'flac'],
    ['audio/x-flac', 'flac'],
  ])(
    'accepts the server-issuable signed content type %s with its canonical .%s key',
    (contentType, extension) => {
      const nextAudioKey = audioKey.replace(/\.m4a$/, `.${extension}`);
      const value = {
        ...s3,
        audioKey: nextAudioKey,
        contentType,
        uploadFields: {
          ...s3.uploadFields,
          key: nextAudioKey,
          'Content-Type': contentType,
        },
      };
      expect(parseAudioUploadGrant(value)).toEqual(value);
    },
  );

  it.each([
    // The server derives .m4a for every MP4-family content type and .ogg for
    // every Ogg-family one, so .mp4 and .oga keys are never issued.
    ['mp4', 'audio/mp4'],
    ['oga', 'audio/ogg'],
    // Well-formed keys whose extension does not match the grant's content type.
    ['wav', 'audio/webm'],
    ['webm', 'audio/wav'],
    ['m4a', 'audio/wav'],
  ])('rejects the never-issued or mismatched .%s key for %s', (extension, contentType) => {
    const nextAudioKey = audioKey.replace(/\.m4a$/, `.${extension}`);
    expectContractError(() =>
      parseAudioUploadGrant({
        ...s3,
        audioKey: nextAudioKey,
        contentType,
        uploadFields: {
          ...s3.uploadFields,
          key: nextAudioKey,
          'Content-Type': contentType,
        },
      }),
    );
  });

  it.each([60, 3_600])('accepts the upload-grant lifetime boundary %i', (expiresIn) => {
    expect(parseAudioUploadGrant({ ...s3, expiresIn })).toMatchObject({ expiresIn });
  });

  it.each([1, 25 * 1024 * 1024])('accepts the upload byte boundary %i', (maxBytes) => {
    expect(parseAudioUploadGrant({ ...s3, maxBytes })).toMatchObject({ maxBytes });
  });

  it('enforces URL length without accepting credentials, query strings, fragments, or junk', () => {
    const prefix = 'https://bucket.s3.us-east-1.amazonaws.com/';
    const exact = prefix + 'a'.repeat(2_048 - prefix.length);
    expect(parseAudioUploadGrant({ ...s3, uploadUrl: exact })).toMatchObject({ uploadUrl: exact });
    expectContractError(() => parseAudioUploadGrant({ ...s3, uploadUrl: `${exact}a` }));
    expectContractError(() => parseAudioUploadGrant({ ...s3, uploadUrl: `junk${s3.uploadUrl}` }));
    expectContractError(() => parseAudioUploadGrant({ ...s3, uploadUrl: 'https://[' }));
  });

  it('pins the upload destination to a genuine AWS S3 host', () => {
    for (const uploadUrl of [
      'https://bucket.s3.us-east-1.amazonaws.com/',
      'https://bucket.s3.amazonaws.com/',
      'https://BUCKET.S3.US-EAST-1.AMAZONAWS.COM/',
      'https://amazonaws.com/',
    ]) {
      expect(parseAudioUploadGrant({ ...s3, uploadUrl })).toMatchObject({ uploadUrl });
    }
  });

  it.each([
    'https://attacker.example/collect',
    'https://amazonaws.com.evil.com/',
    'https://evilamazonaws.com/',
    'https://notamazonaws.com.attacker.tld/',
    'https://amazonaws.com./',
    'http://amazonaws.com/',
    'http://bucket.s3.us-east-1.amazonaws.com/',
  ])('rejects the non-AWS or cleartext upload destination %s', (uploadUrl) => {
    expectContractError(() => parseAudioUploadGrant({ ...s3, uploadUrl }));
  });

  it.each(['https://user@bucket.s3.amazonaws.com/', 'https://:secret@bucket.s3.amazonaws.com/'])(
    'rejects an HTTPS upload URL with one credential component: %s',
    (uploadUrl) => {
      expectContractError(() => parseAudioUploadGrant({ ...s3, uploadUrl }));
    },
  );

  it('requires the complete, anchored per-user S3 key shape', () => {
    expectContractError(() => parseAudioUploadGrant(withAudioKey(`junk/${audioKey}`)));
    expectContractError(() => parseAudioUploadGrant(withAudioKey(`${audioKey}/junk`)));
    const invalidVersion = audioKey.replace('550e8400-e29b-41d4-a716', '550e8400-e29b-01d4-a716');
    const invalidVariant = audioKey.replace('550e8400-e29b-41d4-a716', '550e8400-e29b-41d4-c716');
    expectContractError(() => parseAudioUploadGrant(withAudioKey(invalidVersion)));
    expectContractError(() => parseAudioUploadGrant(withAudioKey(invalidVariant)));
  });

  it('bounds and sanitizes every signed multipart field', () => {
    const exactKey = 'a'.repeat(128);
    const exactValue = 'v'.repeat(8_192);
    expect(
      parseAudioUploadGrant({
        ...s3,
        uploadFields: { ...s3.uploadFields, [exactKey]: exactValue },
      }),
    ).toMatchObject({ mode: 's3' });

    for (const uploadFields of [
      { ...s3.uploadFields, [`${exactKey}a`]: 'value' },
      { ...s3.uploadFields, [`invalid key`]: 'value' },
      { ...s3.uploadFields, valid: `${exactValue}v` },
      { ...s3.uploadFields, FILE: 'reserved' },
    ]) {
      expectContractError(() => parseAudioUploadGrant({ ...s3, uploadFields }));
    }

    for (const reserved of ['__proto__', 'constructor', 'prototype']) {
      const uploadFields = Object.create(null) as Record<string, string>;
      Object.assign(uploadFields, s3.uploadFields);
      Object.defineProperty(uploadFields, reserved, {
        value: 'reserved',
        enumerable: true,
      });
      expectContractError(() => parseAudioUploadGrant({ ...s3, uploadFields }));
    }
  });

  it('rejects array, whitespace-only, and non-string multipart fields independently', () => {
    expectContractError(() =>
      parseAudioUploadGrant({
        ...s3,
        uploadFields: Object.assign([], s3.uploadFields),
      }),
    );
    expectContractError(() =>
      parseAudioUploadGrant({
        ...s3,
        uploadFields: { ...s3.uploadFields, Policy: '   ' },
      }),
    );
    expectContractError(() =>
      parseAudioUploadGrant({
        ...s3,
        uploadFields: { ...s3.uploadFields, Policy: 42 },
      }),
    );
  });

  it('enforces signed-field count and aggregate-size limits', () => {
    const twoFields = { key: audioKey, 'Content-Type': 'audio/mp4' };
    expect(parseAudioUploadGrant({ ...s3, uploadFields: twoFields })).toMatchObject({ mode: 's3' });
    expectContractError(() => parseAudioUploadGrant({ ...s3, uploadFields: { key: audioKey } }));

    const thirtyTwoFields: Record<string, string> = {
      key: audioKey,
      'Content-Type': 'audio/mp4',
    };
    for (let index = 0; index < 30; index += 1) thirtyTwoFields[`x${index}`] = 'v';
    expect(parseAudioUploadGrant({ ...s3, uploadFields: thirtyTwoFields })).toMatchObject({
      mode: 's3',
    });
    expectContractError(() =>
      parseAudioUploadGrant({ ...s3, uploadFields: { ...thirtyTwoFields, overflow: 'v' } }),
    );

    const fixedLength = 'key'.length + audioKey.length + 'Content-Type'.length + 'audio/mp4'.length;
    const paddingKeys = ['p0', 'p1', 'p2', 'p3'] as const;
    const finalPaddingLength = 32_768 - fixedLength - paddingKeys.join('').length - 3 * 8_192;
    const aggregateBoundaryFields: Record<string, string> = {
      key: audioKey,
      'Content-Type': 'audio/mp4',
    };
    for (const [index, key] of paddingKeys.entries()) {
      aggregateBoundaryFields[key] = 'x'.repeat(index < 3 ? 8_192 : finalPaddingLength);
    }
    expect(parseAudioUploadGrant({ ...s3, uploadFields: aggregateBoundaryFields })).toMatchObject({
      mode: 's3',
    });
    expectContractError(() =>
      parseAudioUploadGrant({
        ...s3,
        uploadFields: { ...aggregateBoundaryFields, p3: `${aggregateBoundaryFields.p3}x` },
      }),
    );
  });

  it.each([
    null,
    undefined,
    'direct',
    42,
    [],
    { mode: 'bogus' },
    { ...s3, mode: 1 },
    { mode: 's3' },
    { ...s3, uploadUrl: '' },
    { ...s3, uploadUrl: 'http://bucket.s3.amazonaws.com/' },
    { ...s3, uploadUrl: 'https://user:secret@bucket.s3.amazonaws.com/' },
    { ...s3, uploadUrl: 'https://bucket.s3.amazonaws.com/?signature=secret' },
    { ...s3, uploadUrl: 'https://bucket.s3.amazonaws.com/#fragment' },
    { ...s3, audioKey: '' },
    { ...s3, audioKey: '../another-user/audio.m4a' },
    { ...s3, uploadFields: {} },
    { ...s3, uploadFields: { ...s3.uploadFields, file: 'reserved' } },
    { ...s3, uploadFields: { ...s3.uploadFields, key: 'wrong-key' } },
    {
      ...s3,
      uploadFields: { ...s3.uploadFields, 'Content-Type': 'audio/wav' },
    },
    { ...s3, contentType: 'application/octet-stream' },
    { ...s3, contentType: 'audio/aac' },
    { ...s3, contentType: 'AUDIO/WEBM' },
    { ...s3, expiresIn: 59 },
    { ...s3, expiresIn: 3601 },
    { ...s3, expiresIn: '900' },
    { ...s3, expiresIn: Number.NaN },
    { ...s3, expiresIn: 60.5 },
    { ...s3, maxBytes: 0 },
    { ...s3, maxBytes: 1.5 },
    { ...s3, maxBytes: 25 * 1024 * 1024 + 1 },
  ])('rejects malformed grant %#', (value) => {
    expectContractError(() => parseAudioUploadGrant(value));
  });
});
