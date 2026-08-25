import {
  audioKeyBelongsToOwner,
  audioKeyMatchesAssessmentEndpoint,
  CEFR_LEVELS,
  ContractError,
  isNativeOutcome,
  parseAttemptResult,
  parseAudioUploadGrant,
  parseAuthResponse,
  parseDiagnosticAnswerResult,
  parseDiagnosticNext,
  parseHelpContent,
  parseNativeAttemptResult,
  parsePracticeHistory,
  parsePracticeQuestion,
  parsePracticeStats,
  parseRecordingExportPage,
  parseRecordingPage,
  parseRecordingPlaybackGrant,
  parseUser,
  parseUserDataPage,
  parseUserResponse,
  PRACTICE_MASTER_SCORE,
  PRACTICE_MAX_ATTEMPTS,
  PRACTICE_PASS_SCORE,
} from '../src/lib/types';

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Learner',
  email: 'learner@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
} as const;

const question = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  cefrLevel: 'B1',
  promptWord: 'travel',
  questionText: 'Where would you like to travel?',
} as const;

const practiceProgress = {
  masteredCount: 2,
  learningCount: 1,
  totalAtLevel: 8,
} as const;

const practicePayload = {
  question,
  kind: 'new',
  progress: practiceProgress,
} as const;

function expectContractError(run: () => unknown): void {
  expect(run).toThrow(ContractError);
}

describe('practice scoring constants', () => {
  it('pins the server-mirrored pass, mastery, and attempt limits', () => {
    expect(PRACTICE_PASS_SCORE).toBe(60);
    expect(PRACTICE_MASTER_SCORE).toBe(75);
    expect(PRACTICE_MAX_ATTEMPTS).toBe(3);
  });
});

describe('recording contracts', () => {
  const recordingId = '550e8400-e29b-41d4-a716-446655440050';
  const recording = {
    id: recordingId,
    questionId: question.id,
    context: 'practice' as const,
    promptWord: question.promptWord,
    questionText: question.questionText,
    cefrLevel: question.cefrLevel,
    contentType: 'audio/mp4',
    sizeBytes: 2_048,
    durationMs: 8_000,
    status: 'available' as const,
    createdAt: '2026-08-25T00:00:00.000Z',
    availableAt: '2026-08-25T00:00:01.000Z',
  };
  const playbackUrl =
    'https://private.s3.us-west-1.amazonaws.com/object?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=x&X-Amz-Date=20260825T000000Z&X-Amz-Expires=60&X-Amz-SignedHeaders=host&X-Amz-Signature=abc';

  it('parses library, export, and short-lived playback contracts', () => {
    expect(parseRecordingPage({ items: [recording], nextCursor: null })).toEqual({
      items: [recording],
      nextCursor: null,
    });
    expect(
      parseRecordingExportPage({
        recordings: [{ ...recording, requestId: question.id, attemptId: null }],
        nextCursor: null,
      }),
    ).toEqual({
      recordings: [{ ...recording, requestId: question.id, attemptId: null }],
      nextCursor: null,
    });
    expect(
      parseRecordingPlaybackGrant(
        { recordingId, playbackUrl, expiresIn: 60, contentType: 'audio/mp4' },
        recordingId,
      ),
    ).toEqual({ recordingId, playbackUrl, expiresIn: 60, contentType: 'audio/mp4' });
  });

  it.each([
    { ...recording, id: 'bad' },
    { ...recording, status: 'deleted' },
    { ...recording, status: 'available', availableAt: null },
    { ...recording, status: 'retention_pending', availableAt: recording.availableAt },
    { ...recording, sizeBytes: 0 },
    { ...recording, durationMs: 121_000 },
  ])('rejects malformed recording metadata %#', (value) => {
    expectContractError(() => parseRecordingPage({ items: [value], nextCursor: null }));
  });

  it.each([
    'http://private.s3.us-west-1.amazonaws.com/object',
    'https://evil.example.com/object?X-Amz-Expires=60',
    'https://user:pass@private.s3.us-west-1.amazonaws.com/object?X-Amz-Expires=60',
    'https://private.s3.us-west-1.amazonaws.com/object?X-Amz-Expires=300',
  ])('rejects hostile playback URL %s', (url) => {
    expectContractError(() =>
      parseRecordingPlaybackGrant(
        { recordingId, playbackUrl: url, expiresIn: 60, contentType: 'audio/mp4' },
        recordingId,
      ),
    );
  });

  it('accepts additive recording ids in assessment outcomes and rejects malformed ids', () => {
    const attempt = {
      passed: true,
      mastered: false,
      attemptNo: 1,
      score: 70,
      transcript: 'Answer',
      feedback: 'Good.',
      next: practicePayload,
      recordingId,
    };
    expect(parseAttemptResult(attempt).recordingId).toBe(recordingId);
    expect(
      parseNativeAttemptResult({
        mode: 'native',
        understood: true,
        transcript: 'Respuesta',
        modelAnswer: 'Answer.',
        feedback: 'Good.',
        recordingId,
      }).recordingId,
    ).toBe(recordingId);
    expectContractError(() => parseAttemptResult({ ...attempt, recordingId: 'bad' }));
  });
});

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
    { ...user, uiLanguage: 'fr' },
    { ...user, uiLanguage: 'EN' },
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
    expectContractError(() => parsePracticeQuestion(null));
    expectContractError(() => parsePracticeQuestion(Object.assign([], practicePayload)));
  });
});

describe('question and diagnostic contract parsers', () => {
  it('accepts a valid practice question payload and both diagnostic-next variants', () => {
    expect(parsePracticeQuestion(practicePayload)).toEqual(practicePayload);
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
    expectContractError(() => parsePracticeQuestion({ ...practicePayload, question: {} }));
    expectContractError(() =>
      parsePracticeQuestion({ ...practicePayload, question: { ...question, cefrLevel: 'B9' } }),
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

  it('validates one stable snapshot of diagnostic progress getters', () => {
    let askedReads = 0;
    const invalidProgress = { maxQuestions: 6 } as { asked: number; maxQuestions: number };
    Object.defineProperty(invalidProgress, 'asked', {
      enumerable: true,
      get: () => {
        askedReads += 1;
        return askedReads === 1 ? Number.POSITIVE_INFINITY : 0;
      },
    });
    expectContractError(() =>
      parseDiagnosticNext({ done: false, question, progress: invalidProgress }),
    );
    expect(askedReads).toBe(1);

    let maximumReads = 0;
    const validProgress = { asked: 0 } as { asked: number; maxQuestions: number };
    Object.defineProperty(validProgress, 'maxQuestions', {
      enumerable: true,
      get: () => {
        maximumReads += 1;
        return maximumReads < 3 ? 1 : 0;
      },
    });
    expect(parseDiagnosticNext({ done: false, question, progress: validProgress })).toEqual({
      done: false,
      question,
      progress: { asked: 0, maxQuestions: 1 },
    });
    expect(maximumReads).toBe(1);
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
    expectContractError(() => parseDiagnosticAnswerResult(Object.assign([], answer)));
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

  it('requires diagnostic passed to match the score threshold', () => {
    const answer = {
      passed: true,
      score: 60,
      transcript: 'I would travel to Spain.',
      feedback: 'Clear and relevant.',
      done: true,
      level: 'B1',
    } as const;
    expect(parseDiagnosticAnswerResult(answer)).toEqual(answer);
    expect(parseDiagnosticAnswerResult({ ...answer, passed: false, score: 59 })).toMatchObject({
      passed: false,
      score: 59,
    });
    expectContractError(() => parseDiagnosticAnswerResult({ ...answer, passed: false }));
    expectContractError(() => parseDiagnosticAnswerResult({ ...answer, score: 59 }));
  });

  it('uses the first next-question snapshot in a diagnostic answer', () => {
    let reads = 0;
    const answer = {
      passed: true,
      score: 82,
      transcript: 'I would travel to Spain.',
      feedback: 'Clear and relevant.',
      done: false,
    } as Record<string, unknown>;
    Object.defineProperty(answer, 'nextQuestion', {
      enumerable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? question : undefined;
      },
    });

    expect(parseDiagnosticAnswerResult(answer)).toEqual({
      passed: true,
      score: 82,
      transcript: 'I would travel to Spain.',
      feedback: 'Clear and relevant.',
      done: false,
      nextQuestion: question,
    });
    expect(reads).toBe(1);
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
      mastered: false,
      attemptNo: 3,
      attemptsLeft: 0,
      score: 59,
      transcript: 'Spain.',
      feedback: 'Add more detail.',
      finalFeedback: 'Use a full sentence.',
      next: practicePayload,
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
      mastered: true,
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
      next: practicePayload,
    } as const;

    expectContractError(() => parseAttemptResult(Object.assign([], passedAttempt)));
    expectContractError(() => parseAttemptResult({ ...passedAttempt, passed: 'yes' }));
    expectContractError(() => parseAttemptResult({ ...passedAttempt, mastered: 'yes' }));
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
        mastered: false,
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
        mastered: false,
        attemptNo: 0,
        score: 50,
        transcript: '',
        feedback: 'Try again.',
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        mastered: false,
        attemptNo: 1,
        score: -1,
        transcript: '',
        feedback: 'Try again.',
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        mastered: false,
        attemptNo: 1,
        score: 50,
        transcript: '',
        feedback: 'Try again.',
        next: [],
      }),
    );
  });
});

describe('practice question payload parser', () => {
  it('accepts new and revision payloads at the progress count boundaries', () => {
    expect(parsePracticeQuestion(practicePayload)).toEqual(practicePayload);
    const revision = {
      question,
      kind: 'revision',
      progress: { masteredCount: 0, learningCount: 5, totalAtLevel: 5 },
    } as const;
    expect(parsePracticeQuestion(revision)).toEqual(revision);
    const maxed = {
      question,
      kind: 'new',
      progress: { masteredCount: 100_000, learningCount: 0, totalAtLevel: 100_000 },
    } as const;
    expect(parsePracticeQuestion(maxed)).toEqual(maxed);
    const singleWordLevel = {
      question,
      kind: 'new',
      progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 1 },
    } as const;
    expect(parsePracticeQuestion(singleWordLevel)).toEqual(singleWordLevel);
  });

  it.each([
    ['a bogus kind', { ...practicePayload, kind: 'repeat' }],
    ['an uppercase kind', { ...practicePayload, kind: 'NEW' }],
    ['a missing kind', { question, progress: practiceProgress }],
    ['a missing progress', { question, kind: 'new' }],
    ['a null progress', { ...practicePayload, progress: null }],
    ['an array progress', { ...practicePayload, progress: Object.assign([], practiceProgress) }],
    [
      'more mastered and learning words than the level holds',
      { ...practicePayload, progress: { masteredCount: 3, learningCount: 3, totalAtLevel: 5 } },
    ],
    [
      'an empty level',
      { ...practicePayload, progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0 } },
    ],
    [
      'a negative mastered count',
      { ...practicePayload, progress: { masteredCount: -1, learningCount: 0, totalAtLevel: 1 } },
    ],
    [
      'a fractional learning count',
      { ...practicePayload, progress: { masteredCount: 0, learningCount: 1.5, totalAtLevel: 2 } },
    ],
    [
      'a count beyond the server bound',
      {
        ...practicePayload,
        progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 100_001 },
      },
    ],
  ])('rejects a practice question payload with %s', (_label, value) => {
    expectContractError(() => parsePracticeQuestion(value));
  });
});

describe('native attempt result parser', () => {
  const native = {
    mode: 'native',
    understood: true,
    transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
    modelAnswer: 'She showed courage at work.',
    feedback: 'You understood the question.',
  } as const;

  it('accepts understood, missed, and silent native results', () => {
    expect(parseNativeAttemptResult(native)).toEqual(native);
    const missed = {
      mode: 'native',
      understood: false,
      transcript: 'నేను రైలులో ప్రయాణిస్తాను.',
      modelAnswer: 'She showed courage at work.',
      feedback: 'That answer was about something else.',
    } as const;
    expect(parseNativeAttemptResult(missed)).toEqual(missed);
    const silent = {
      mode: 'native',
      understood: false,
      transcript: '',
      modelAnswer: '',
      feedback: 'We could not hear any speech.',
    } as const;
    expect(parseNativeAttemptResult(silent)).toEqual(silent);
  });

  it('accepts the native string-length boundaries', () => {
    const bounded = {
      ...native,
      transcript: 'x'.repeat(12_000),
      modelAnswer: 'x'.repeat(800),
      feedback: 'x'.repeat(800),
    };
    expect(parseNativeAttemptResult(bounded)).toEqual(bounded);
  });

  it.each([
    ['the wrong mode', { ...native, mode: 'english' }],
    ['a missing mode', { understood: true, transcript: '', modelAnswer: '', feedback: 'Good.' }],
    ['a non-boolean understood flag', { ...native, understood: 'yes' }],
    ['an empty feedback', { ...native, feedback: '' }],
    ['a blank feedback', { ...native, feedback: '   ' }],
    ['an overlong feedback', { ...native, feedback: 'x'.repeat(801) }],
    ['an overlong model answer', { ...native, modelAnswer: 'x'.repeat(801) }],
    ['an overlong transcript', { ...native, transcript: 'x'.repeat(12_001) }],
    ['a non-string model answer', { ...native, modelAnswer: 42 }],
    ['silence marked understood', { ...native, transcript: '', modelAnswer: '' }],
    ['silence with a model answer', { ...native, understood: false, transcript: '' }],
    [
      'speech without a model answer',
      { ...native, understood: false, transcript: 'A spoken answer.', modelAnswer: '' },
    ],
    [
      'whitespace-only speech',
      { ...native, understood: false, transcript: '   ', modelAnswer: 'An answer.' },
    ],
  ])('rejects a native attempt result with %s', (_label, value) => {
    expectContractError(() => parseNativeAttemptResult(value));
  });

  it('rejects null and array native envelopes', () => {
    expectContractError(() => parseNativeAttemptResult(null));
    expectContractError(() => parseNativeAttemptResult(Object.assign([], native)));
  });
});

describe('practice outcome discriminant', () => {
  const nativeOutcome = {
    mode: 'native',
    understood: true,
    transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
    modelAnswer: 'She showed courage at work.',
    feedback: 'You understood the question.',
  } as const;

  const englishOutcome = {
    passed: true,
    mastered: true,
    attemptNo: 1,
    score: 90,
    transcript: 'An answer.',
    feedback: 'Great.',
  };

  it('routes only a native-mode outcome to the native renderer', () => {
    expect(isNativeOutcome(nativeOutcome)).toBe(true);
    expect(isNativeOutcome(englishOutcome)).toBe(false);
  });

  it('routes an outcome carrying some other mode to the English renderer', () => {
    // A future or corrupted server mode must not be treated as the native
    // variant just because the discriminant field is present.
    const otherModeOutcome = { ...englishOutcome, mode: 'english' };
    expect(isNativeOutcome(otherModeOutcome)).toBe(false);
  });
});

describe('no-speech attempt variant', () => {
  it.each([
    [1, 3],
    [2, 2],
    [3, 1],
  ] as const)(
    'accepts silence on attempt %i as a free retry with %i attempts left',
    (attemptNo, attemptsLeft) => {
      const silent = {
        passed: false,
        mastered: false,
        noSpeech: true,
        attemptNo,
        attemptsLeft,
        score: 0,
        transcript: '',
        feedback: 'We could not hear any speech.',
      };
      expect(parseAttemptResult(silent)).toEqual(silent);
    },
  );

  it('rejects silence that carries scored-attempt fields', () => {
    const silent = {
      passed: false,
      mastered: false,
      noSpeech: true,
      attemptNo: 2,
      attemptsLeft: 2,
      score: 0,
      transcript: '',
      feedback: 'We could not hear any speech.',
    };
    expectContractError(() => parseAttemptResult({ ...silent, next: practicePayload }));
    expectContractError(() => parseAttemptResult({ ...silent, finalFeedback: 'Final words.' }));
    expectContractError(() => parseAttemptResult({ ...silent, transcript: 'a few words' }));
    expectContractError(() => parseAttemptResult({ ...silent, score: 1 }));
    expectContractError(() => parseAttemptResult({ ...silent, attemptsLeft: 1 }));
    expectContractError(() => parseAttemptResult({ ...silent, passed: true }));
    expectContractError(() => parseAttemptResult({ ...silent, mastered: true }));
    expectContractError(() => parseAttemptResult({ ...silent, noSpeech: false }));
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

  it.each(['en', 'te', 'hi', 'es', 'zh'])('accepts UI language %s', (uiLanguage) => {
    expect(parseUser({ ...user, uiLanguage })).toMatchObject({ uiLanguage });
  });

  it.each(['fr', 'EN', '', 'english'])('rejects UI language %p', (uiLanguage) => {
    expectContractError(() => parseUser({ ...user, uiLanguage }));
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
    passed: false,
    score: 0,
    transcript: '',
    feedback: 'Good start.',
    done: true,
    level: 'A1',
  } as const;

  it.each([
    [0, false],
    [59, false],
    [60, true],
    [100, true],
  ])('accepts score boundary %i with passed=%s', (score, passed) => {
    expect(parseDiagnosticAnswerResult({ ...doneAnswer, score, passed })).toMatchObject({
      score,
      passed,
    });
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
      mastered: false,
      attemptNo: 3,
      attemptsLeft: 0,
      score: 50,
      transcript: 'A short final answer.',
      feedback: 'Try again.',
      finalFeedback: 'Use a complete sentence next time.',
      next: practicePayload,
    };
    const firstRetry = {
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 50,
      transcript: 'A short answer.',
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

  it('accepts a run closed early because a rival session promoted the level', () => {
    // server/src/practice.ts drops the retry branch when the locked user level
    // no longer matches the question's level, so a miss before the last attempt
    // legitimately arrives in the terminal shape.
    const earlyClose = {
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 0,
      score: 50,
      transcript: 'A short answer.',
      feedback: 'Try again.',
      finalFeedback: 'Your level advanced while this answer was assessed.',
      next: practicePayload,
    };
    expect(parseAttemptResult(earlyClose)).toEqual(earlyClose);
    // The terminal payload is still mandatory: attemptsLeft 0 alone must not
    // let a miscounted retry through.
    expectContractError(() => parseAttemptResult({ ...earlyClose, finalFeedback: undefined }));
    expectContractError(() => parseAttemptResult({ ...earlyClose, next: undefined }));
  });

  it('enforces passed, retry, and final response shapes', () => {
    const passed = {
      passed: true,
      mastered: true,
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
      next: practicePayload,
    };
    expect(parseAttemptResult(passed)).toEqual(passed);
    expectContractError(() => parseAttemptResult({ ...passed, attemptNo: 0 }));
    expectContractError(() => parseAttemptResult({ ...passed, finalFeedback: 'Solid progress.' }));
    expectContractError(() => parseAttemptResult({ ...passed, attemptsLeft: 2 }));
    expectContractError(() => parseAttemptResult({ ...passed, next: undefined }));

    const retry = {
      passed: false,
      mastered: false,
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
    expectContractError(() => parseAttemptResult({ ...retry, next: practicePayload }));

    const final = {
      ...retry,
      attemptNo: 3,
      attemptsLeft: 0,
      finalFeedback: 'Review the example and continue.',
      next: practicePayload,
    };
    expect(parseAttemptResult(final)).toEqual(final);
    expectContractError(() => parseAttemptResult({ ...final, finalFeedback: '   ' }));
    expectContractError(() => parseAttemptResult({ ...final, next: undefined }));
  });

  it.each(['passed', 'mastered'] as const)(
    'rejects the first non-boolean %s snapshot even if a later getter read changes it',
    (field) => {
      let reads = 0;
      const result = {
        passed: true,
        mastered: true,
        attemptNo: 1,
        score: 90,
        transcript: 'A complete answer.',
        feedback: 'Great.',
        next: practicePayload,
      } as Record<string, unknown>;
      Object.defineProperty(result, field, {
        enumerable: true,
        get: () => {
          reads += 1;
          return reads === 1 ? 'yes' : true;
        },
      });

      expectContractError(() => parseAttemptResult(result));
      expect(reads).toBe(1);
    },
  );

  it('rejects the first invalid attempts-left snapshot on the final attempt', () => {
    let reads = 0;
    const result = {
      passed: false,
      mastered: false,
      attemptNo: 3,
      score: 50,
      transcript: 'A short final answer.',
      feedback: 'Try again.',
    } as Record<string, unknown>;
    Object.defineProperty(result, 'attemptsLeft', {
      enumerable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? 1 : 0;
      },
    });

    expectContractError(() => parseAttemptResult(result));
    expect(reads).toBe(1);
  });

  it.each([
    ['passed', { passed: true, mastered: true, attemptNo: 1, score: 90 }],
    ['final', { passed: false, mastered: false, attemptNo: 3, score: 50, attemptsLeft: 0 }],
  ] as const)('uses one stable next payload for a %s result', (_variant, fields) => {
    let reads = 0;
    const result = {
      transcript: 'A complete answer.',
      feedback: 'Feedback.',
      ...(fields.passed ? {} : { finalFeedback: 'Review the example and continue.' }),
      ...fields,
    } as Record<string, unknown>;
    Object.defineProperty(result, 'next', {
      enumerable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? practicePayload : undefined;
      },
    });

    expect(parseAttemptResult(result)).toMatchObject({ next: practicePayload });
    expect(reads).toBe(1);
  });

  it.each([
    ['a passing score marked failed', { passed: false, mastered: false, score: 60 }],
    ['a failing score marked passed', { passed: true, mastered: false, score: 59 }],
    ['a mastery score not marked mastered', { passed: true, mastered: false, score: 75 }],
    ['a sub-mastery score marked mastered', { passed: true, mastered: true, score: 74 }],
  ])('rejects %s', (_label, flags) => {
    expectContractError(() =>
      parseAttemptResult({
        attemptNo: 1,
        transcript: 'A complete answer.',
        feedback: 'Feedback.',
        next: practicePayload,
        ...flags,
      }),
    );
  });

  it('accepts the exact pass and mastery score boundaries', () => {
    const passedAtPassScore = {
      passed: true,
      mastered: false,
      attemptNo: 1,
      score: PRACTICE_PASS_SCORE,
      transcript: 'A complete answer.',
      feedback: 'Feedback.',
      next: practicePayload,
    };
    expect(parseAttemptResult(passedAtPassScore)).toEqual(passedAtPassScore);

    const masteredAtMasterScore = {
      ...passedAtPassScore,
      mastered: true,
      score: PRACTICE_MASTER_SCORE,
    };
    expect(parseAttemptResult(masteredAtMasterScore)).toEqual(masteredAtMasterScore);
  });

  it('rejects a scored attempt that carries no spoken transcript', () => {
    // Only the explicit no-speech variant may omit the transcript; a scored
    // attempt without one would render an empty answer as if it were spoken.
    const retry = {
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 40,
      transcript: '',
      feedback: 'Add detail.',
    };
    expectContractError(() => parseAttemptResult(retry));
    expectContractError(() => parseAttemptResult({ ...retry, transcript: '   ' }));
  });

  it('requires the mastered flag on every scored attempt variant', () => {
    const base = {
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
    };
    expectContractError(() => parseAttemptResult({ ...base, passed: true, next: practicePayload }));
    expectContractError(() => parseAttemptResult({ ...base, passed: false, attemptsLeft: 2 }));
    expectContractError(() =>
      parseAttemptResult({
        ...base,
        passed: false,
        attemptNo: 3,
        attemptsLeft: 0,
        finalFeedback: 'Review the example and continue.',
        next: practicePayload,
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        noSpeech: true,
        attemptNo: 1,
        attemptsLeft: 3,
        score: 0,
        transcript: '',
        feedback: 'We could not hear any speech.',
      }),
    );
  });

  it('rejects response strings and collections beyond server contract bounds', () => {
    expect(
      parseUser({ ...user, name: 'x'.repeat(100), email: `${'e'.repeat(242)}@example.com` }),
    ).toMatchObject({
      name: 'x'.repeat(100),
      email: `${'e'.repeat(242)}@example.com`,
    });
    expect(
      parsePracticeQuestion({
        ...practicePayload,
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
      parsePracticeQuestion({
        ...practicePayload,
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
        mastered: false,
        attemptNo: 3,
        attemptsLeft: 0,
        score: 50,
        transcript: 'A final answer.',
        feedback: 'Try again.',
        finalFeedback: 'x'.repeat(4_001),
        next: practicePayload,
      }),
    );

    const boundedAttempt = {
      passed: true,
      mastered: true,
      attemptNo: 1,
      score: 80,
      transcript: 'x'.repeat(12_000),
      feedback: 'x'.repeat(800),
      next: practicePayload,
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
    'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440002.m4a';
  const s3 = {
    mode: 's3',
    assessmentEndpoint: '/practice/attempt',
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
    expect(
      parseAudioUploadGrant({ mode: 'direct', assessmentEndpoint: '/diagnostic/answer' }),
    ).toEqual({
      mode: 'direct',
      assessmentEndpoint: '/diagnostic/answer',
    });
    expect(parseAudioUploadGrant(s3)).toEqual(s3);
  });

  it('parses one stable snapshot of a signed audio key', () => {
    let reads = 0;
    const grant = { ...s3 } as Record<string, unknown>;
    Object.defineProperty(grant, 'audioKey', {
      enumerable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? audioKey : undefined;
      },
    });

    expect(parseAudioUploadGrant(grant)).toEqual(s3);
    expect(reads).toBe(1);
  });

  it('strips unknown fields from grants', () => {
    expect(
      parseAudioUploadGrant({
        mode: 'direct',
        assessmentEndpoint: '/practice/attempt/native',
        extra: 'x',
      }),
    ).toEqual({
      mode: 'direct',
      assessmentEndpoint: '/practice/attempt/native',
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
      'https://bucket.s3.dualstack.us-east-1.amazonaws.com/',
      'https://s3.us-east-1.amazonaws.com/bucket',
      'https://bucket.s3-us-east-1.amazonaws.com/',
    ]) {
      expect(parseAudioUploadGrant({ ...s3, uploadUrl })).toMatchObject({ uploadUrl });
    }
  });

  it.each([
    'https://attacker.example/collect',
    'https://amazonaws.com/',
    'https://execute-api.us-east-1.amazonaws.com/',
    'https://ec2.us-east-1.amazonaws.com/',
    'https://bucket.s3-website-us-east-1.amazonaws.com/',
    'https://amazonaws.com.evil.com/',
    'https://evilamazonaws.com/',
    'https://notamazonaws.com.attacker.tld/',
    'https://amazonaws.com./',
    'http://amazonaws.com/',
    'http://bucket.s3.us-east-1.amazonaws.com/',
    // A lookalike registrable domain exactly as long as '.amazonaws.com', so
    // trimming that suffix blindly would leave a well-formed S3 endpoint.
    'https://bucket.s3.us-east-1.attackers.com/',
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
    expectContractError(() => parseAudioUploadGrant(withAudioKey(`junk/practice/${audioKey}`)));
    expectContractError(() => parseAudioUploadGrant(withAudioKey(`${audioKey}/junk`)));
    // Trailing segments must not ride in behind a well-formed prefix, even when
    // the whole key still ends in an allowlisted extension.
    expectContractError(() =>
      parseAudioUploadGrant(
        withAudioKey(`${audioKey}/../../550e8400-e29b-41d4-a716-446655440009/steal.m4a`),
      ),
    );
    const invalidVersion = audioKey.replace('550e8400-e29b-41d4-a716', '550e8400-e29b-01d4-a716');
    const invalidVariant = audioKey.replace('550e8400-e29b-41d4-a716', '550e8400-e29b-41d4-c716');
    expectContractError(() => parseAudioUploadGrant(withAudioKey(invalidVersion)));
    expectContractError(() => parseAudioUploadGrant(withAudioKey(invalidVariant)));
  });

  it('requires the signed key scope to match the echoed assessment endpoint', () => {
    const diagnosticAudioKey = audioKey.replace('/practice/', '/diagnostic/');
    expect(
      parseAudioUploadGrant({
        ...withAudioKey(diagnosticAudioKey),
        assessmentEndpoint: '/diagnostic/answer',
      }),
    ).toMatchObject({
      assessmentEndpoint: '/diagnostic/answer',
      audioKey: diagnosticAudioKey,
    });
    expectContractError(() => parseAudioUploadGrant(withAudioKey(diagnosticAudioKey)));
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

  it('does not inherit required multipart fields from a polluted object prototype', () => {
    const pollutedPrototype = {
      key: audioKey,
      'Content-Type': 'audio/mp4',
    };
    const uploadFields = Object.assign(Object.create(pollutedPrototype) as Record<string, string>, {
      Policy: 'signed-policy',
      'x-amz-algorithm': 'AWS4-HMAC-SHA256',
    });

    expectContractError(() => parseAudioUploadGrant({ ...s3, uploadFields }));
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
    { mode: 'direct' },
    { mode: 'direct', assessmentEndpoint: '/diagnostic/next' },
    { ...s3, mode: 1 },
    { ...s3, assessmentEndpoint: undefined },
    { ...s3, assessmentEndpoint: '/practice/answer' },
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

describe('audio key ownership', () => {
  const ownerId = '550e8400-e29b-41d4-a716-446655440000';
  const otherOwnerId = '550e8400-e29b-41d4-a716-446655440009';
  const recordingId = '550e8400-e29b-41d4-a716-446655440002';
  const ownedKey = `audio-uploads/practice/${ownerId}/${recordingId}.m4a`;

  it('accepts an owned key whichever side carries uppercase hex', () => {
    expect(audioKeyBelongsToOwner(ownedKey, ownerId)).toBe(true);
    expect(audioKeyBelongsToOwner(ownedKey.toUpperCase(), ownerId)).toBe(true);
    expect(audioKeyBelongsToOwner(ownedKey, ownerId.toUpperCase())).toBe(true);
  });

  it('rejects a well-formed key stored under another account', () => {
    expect(
      audioKeyBelongsToOwner(`audio-uploads/practice/${otherOwnerId}/${recordingId}.m4a`, ownerId),
    ).toBe(false);
  });

  it('rejects a string-like forged key without invoking an unsafe missing segment method', () => {
    const forged = {
      toString: () => ownedKey,
    } as unknown as string;

    expect(() => audioKeyBelongsToOwner(forged, ownerId)).not.toThrow();
    expect(audioKeyBelongsToOwner(forged, ownerId)).toBe(false);
  });

  it('rejects a string-like forged owner without invoking its method', () => {
    const toLowerCase = jest.fn(() => ownerId);
    const forgedOwner = {
      toLowerCase,
    } as unknown as string;

    expect(() => audioKeyBelongsToOwner(ownedKey, forgedOwner)).not.toThrow();
    expect(audioKeyBelongsToOwner(ownedKey, forgedOwner)).toBe(false);
    expect(toLowerCase).not.toHaveBeenCalled();
  });

  it.each([
    ['a foreign prefix', `uploads/${ownerId}/${recordingId}.m4a`],
    ['a missing scope', `audio-uploads/${ownerId}/${recordingId}.m4a`],
    ['an unknown scope', `audio-uploads/other/${ownerId}/${recordingId}.m4a`],
    ['a non-uuid recording id', `audio-uploads/practice/${ownerId}/recording.m4a`],
    ['a disallowed extension', `audio-uploads/practice/${ownerId}/${recordingId}.exe`],
    [
      'a traversal suffix',
      `audio-uploads/practice/${ownerId}/${recordingId}.m4a/../../${otherOwnerId}/steal.m4a`,
    ],
  ])('rejects %s even though the owner segment matches', (_label, key) => {
    expect(audioKeyBelongsToOwner(key, ownerId)).toBe(false);
  });

  it.each([
    ['/diagnostic/answer', 'diagnostic'],
    ['/practice/attempt', 'practice'],
    ['/practice/attempt/native', 'practice'],
  ] as const)('matches endpoint %s only to the %s key scope', (endpoint, scope) => {
    const matching = `audio-uploads/${scope}/${ownerId}/${recordingId}.m4a`;
    const otherScope = scope === 'diagnostic' ? 'practice' : 'diagnostic';
    const mismatched = `audio-uploads/${otherScope}/${ownerId}/${recordingId}.m4a`;

    expect(audioKeyMatchesAssessmentEndpoint(matching, endpoint)).toBe(true);
    expect(audioKeyMatchesAssessmentEndpoint(mismatched, endpoint)).toBe(false);
  });

  it('fails closed for an endpoint value that bypasses TypeScript', () => {
    expect(
      audioKeyMatchesAssessmentEndpoint(ownedKey, '/practice/answer' as '/practice/attempt'),
    ).toBe(false);
  });

  it('rejects a forged string-like audio key without coercing or calling string methods on it', () => {
    const toString = jest.fn(() => ownedKey);
    const forgedKey = { toString } as unknown as string;
    let result: boolean | undefined;

    expect(() => {
      result = audioKeyMatchesAssessmentEndpoint(forgedKey, '/practice/attempt');
    }).not.toThrow();
    expect(result).toBe(false);
    expect(toString).not.toHaveBeenCalled();
  });
});

// ----- Level-up, SRS dueCount, stats, history, and export parsers -----

describe('levelUp attempt variant', () => {
  const b2Question = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    cefrLevel: 'B2',
    promptWord: 'ambition',
    questionText: 'What is your biggest ambition?',
  } as const;

  const promotedPayload = {
    question: b2Question,
    kind: 'new',
    progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 12 },
  } as const;

  const promotedAttempt = {
    passed: true,
    mastered: true,
    attemptNo: 1,
    score: 90,
    transcript: 'A detailed answer.',
    feedback: 'Excellent.',
    next: promotedPayload,
    levelUp: { from: 'B1', to: 'B2' },
  } as const;

  it('accepts a mastering pass whose next question comes from the new level', () => {
    expect(parseAttemptResult(promotedAttempt)).toEqual(promotedAttempt);
  });

  it('rejects a level-up whose next question is not from the new level', () => {
    expectContractError(() => parseAttemptResult({ ...promotedAttempt, next: practicePayload }));
  });

  it('rejects a level-up on a pass that did not master the word', () => {
    expectContractError(() =>
      parseAttemptResult({
        ...promotedAttempt,
        mastered: false,
        score: 70,
      }),
    );
  });

  it('rejects a level-up on failed and no-speech attempts', () => {
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 2,
        score: 40,
        transcript: 'Short.',
        feedback: 'Add detail.',
        levelUp: { from: 'B1', to: 'B2' },
      }),
    );
    expectContractError(() =>
      parseAttemptResult({
        passed: false,
        mastered: false,
        attemptNo: 1,
        attemptsLeft: 3,
        noSpeech: true,
        score: 0,
        transcript: '',
        feedback: 'We heard nothing.',
        levelUp: { from: 'B1', to: 'B2' },
      }),
    );
  });

  it.each([
    ['a skipped level', { from: 'A2', to: 'C1' }],
    ['no movement', { from: 'B1', to: 'B1' }],
    ['a demotion', { from: 'B2', to: 'B1' }],
    ['an unknown source level', { from: 'Z9', to: 'B2' }],
    ['an unknown target level', { from: 'B1', to: 'Z9' }],
    ['a non-record value', 'B1->B2'],
  ])('rejects a level-up with %s', (_label, levelUp) => {
    expectContractError(() => parseAttemptResult({ ...promotedAttempt, levelUp }));
  });

  // The next-question cross-check cannot stand in for the ladder check when the
  // promotion already targets the level the next question is served from.
  it.each([
    ['a two-level jump', { from: 'A2', to: 'B2' }],
    ['no movement', { from: 'B2', to: 'B2' }],
    ['a demotion', { from: 'C1', to: 'B2' }],
    ['an array envelope', Object.assign([], { from: 'B1', to: 'B2' })],
  ])('rejects a level-up onto the served level with %s', (_label, levelUp) => {
    expectContractError(() => parseAttemptResult({ ...promotedAttempt, levelUp }));
  });

  it('tolerates unknown additive fields on attempt responses', () => {
    const attempt = {
      passed: true,
      mastered: true,
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
      next: practicePayload,
      someFutureField: { anything: true },
    };
    expect(parseAttemptResult(attempt)).toEqual({
      passed: true,
      mastered: true,
      attemptNo: 1,
      score: 90,
      transcript: 'An answer.',
      feedback: 'Great.',
      next: practicePayload,
    });
  });
});

describe('progress dueCount (additive SRS field)', () => {
  it('accepts progress without dueCount from older servers', () => {
    expect(parsePracticeQuestion(practicePayload)).toEqual(practicePayload);
  });

  it('accepts a valid dueCount within the learning+mastered rows', () => {
    const payload = {
      ...practicePayload,
      progress: { ...practiceProgress, dueCount: 3 },
    };
    expect(parsePracticeQuestion(payload)).toEqual(payload);
  });

  it.each([
    ['a negative dueCount', -1],
    ['a fractional dueCount', 1.5],
    ['a dueCount above the learning+mastered rows', 4],
    ['a non-number dueCount', 'many'],
  ])('rejects %s', (_label, dueCount) => {
    expectContractError(() =>
      parsePracticeQuestion({
        ...practicePayload,
        progress: { ...practiceProgress, dueCount },
      }),
    );
  });
});

describe('practice stats parser', () => {
  const stats = {
    level: 'B1',
    progress: { masteredCount: 3, learningCount: 2, totalAtLevel: 10, dueCount: 4 },
    streakDays: 2,
    practicedToday: 1,
    totalAttempts: 12,
    lastPracticedAt: '2026-08-15T10:00:00.000Z',
  } as const;

  it('accepts complete stats and a never-practiced null timestamp', () => {
    expect(parsePracticeStats(stats)).toEqual(stats);
    expect(
      parsePracticeStats({
        ...stats,
        streakDays: 0,
        practicedToday: 0,
        totalAttempts: 0,
        lastPracticedAt: null,
      }),
    ).toEqual({
      ...stats,
      streakDays: 0,
      practicedToday: 0,
      totalAttempts: 0,
      lastPracticedAt: null,
    });
  });

  it('accepts lifetime counters above the former 100,000 ceiling', () => {
    const longLivedAccount = {
      ...stats,
      streakDays: 100_001,
      practicedToday: 100_001,
      totalAttempts: 100_001,
    };
    expect(parsePracticeStats(longLivedAccount)).toEqual(longLivedAccount);
  });

  it('rejects lifetime counters outside the nonnegative safe-integer range', () => {
    expectContractError(() =>
      parsePracticeStats({ ...stats, totalAttempts: Number.MAX_SAFE_INTEGER + 1 }),
    );
    expectContractError(() => parsePracticeStats({ ...stats, streakDays: Number.NaN }));
  });

  it('drops unknown additive fields instead of failing on them', () => {
    expect(parsePracticeStats({ ...stats, someFutureField: 1 })).toEqual(stats);
  });

  it('accepts progress counts sitting exactly on their consistency bounds', () => {
    const singleWordLevel = {
      ...stats,
      progress: { masteredCount: 1, learningCount: 0, totalAtLevel: 1, dueCount: 1 },
    };
    expect(parsePracticeStats(singleWordLevel)).toEqual(singleWordLevel);

    const everyWordStartedAndDue = {
      ...stats,
      progress: { masteredCount: 3, learningCount: 2, totalAtLevel: 5, dueCount: 5 },
    };
    expect(parsePracticeStats(everyWordStartedAndDue)).toEqual(everyWordStartedAndDue);
  });

  it('rejects a level that holds no words at all', () => {
    expectContractError(() =>
      parsePracticeStats({
        ...stats,
        progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
      }),
    );
  });

  it('accepts the pre-placement null level with the all-zero progress snapshot', () => {
    // Before the diagnostic places the learner, the server intentionally
    // answers level: null and zeroed progress counters (there is no level to
    // count words against). The home screen must not fail this as drift.
    const prePlacement = {
      ...stats,
      level: null,
      progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
      streakDays: 0,
      practicedToday: 0,
      totalAttempts: 0,
      lastPracticedAt: null,
    };
    expect(parsePracticeStats(prePlacement)).toEqual(prePlacement);
  });

  it.each(['masteredCount', 'learningCount'] as const)(
    'rejects a null level from one stable nonzero %s snapshot',
    (field) => {
      let totalReads = 0;
      let counterReads = 0;
      const progress = {
        masteredCount: 0,
        learningCount: 0,
        dueCount: 0,
      } as {
        masteredCount: number;
        learningCount: number;
        totalAtLevel: number;
        dueCount: number;
      };
      Object.defineProperty(progress, field, {
        enumerable: true,
        get: () => {
          counterReads += 1;
          return counterReads === 1 ? 1 : 0;
        },
      });
      Object.defineProperty(progress, 'totalAtLevel', {
        enumerable: true,
        get: () => {
          totalReads += 1;
          return totalReads < 3 ? 1 : 0;
        },
      });

      expectContractError(() => parsePracticeStats({ ...stats, level: null, progress }));
      expect(counterReads).toBe(1);
      expect(totalReads).toBe(1);
    },
  );

  it.each(['totalAtLevel', 'dueCount'] as const)(
    'returns the first zero %s snapshot for pre-placement stats',
    (field) => {
      let reads = 0;
      const progress = {
        masteredCount: 0,
        learningCount: 0,
        totalAtLevel: 0,
        dueCount: 0,
      };
      Object.defineProperty(progress, field, {
        enumerable: true,
        get: () => {
          reads += 1;
          return reads < 3 ? 0 : 1;
        },
      });
      const value = {
        ...stats,
        level: null,
        progress,
        streakDays: 0,
        practicedToday: 0,
        totalAttempts: 0,
        lastPracticedAt: null,
      };

      expect(parsePracticeStats(value)).toEqual({
        ...value,
        progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
      });
      expect(reads).toBe(1);
    },
  );

  it.each([
    [
      'masteredCount above zero',
      { masteredCount: 1, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
    ],
    [
      'learningCount above zero',
      { masteredCount: 0, learningCount: 1, totalAtLevel: 1, dueCount: 0 },
    ],
    [
      'a non-empty level word list',
      { masteredCount: 0, learningCount: 0, totalAtLevel: 10, dueCount: 0 },
    ],
    ['a due word', { masteredCount: 1, learningCount: 0, totalAtLevel: 1, dueCount: 1 }],
  ])('rejects a null level with %s', (_label, progress) => {
    expectContractError(() => parsePracticeStats({ ...stats, level: null, progress }));
  });

  it.each([
    ['a non-record value', 'stats'],
    ['an array carrying valid stats fields', Object.assign([], stats)],
    ['an unknown level', { ...stats, level: 'Z9' }],
    ['missing progress', { ...stats, progress: undefined }],
    [
      'progress without dueCount (stats are post-SRS)',
      { ...stats, progress: { masteredCount: 3, learningCount: 2, totalAtLevel: 10 } },
    ],
    [
      'dueCount above the learning+mastered rows',
      { ...stats, progress: { ...stats.progress, dueCount: 6 } },
    ],
    [
      'more mastered+learning than words at the level',
      { ...stats, progress: { ...stats.progress, masteredCount: 9 } },
    ],
    [
      'an empty level word list',
      { ...stats, progress: { ...stats.progress, totalAtLevel: 0, dueCount: 0 } },
    ],
    ['a negative streak', { ...stats, streakDays: -1 }],
    ['a fractional streak', { ...stats, streakDays: 1.5 }],
    ['a negative practicedToday', { ...stats, practicedToday: -1 }],
    ['practicedToday above totalAttempts', { ...stats, practicedToday: 13 }],
    ['a negative totalAttempts', { ...stats, totalAttempts: -1 }],
    ['an unparseable timestamp', { ...stats, lastPracticedAt: 'yesterday-ish' }],
    ['a numeric timestamp', { ...stats, lastPracticedAt: 1_755_252_000 }],
  ])('rejects stats with %s', (_label, value) => {
    expectContractError(() => parsePracticeStats(value));
  });
});

describe('practice history parser', () => {
  const item = {
    id: '550e8400-e29b-41d4-a716-446655440031',
    questionId: '550e8400-e29b-41d4-a716-446655440032',
    promptWord: 'courage',
    questionText: 'Describe a time you showed courage.',
    cefrLevel: 'B1',
    context: 'practice',
    attemptNo: 2,
    score: 59,
    passed: false,
    transcript: 'I tried.',
    feedback: 'Add more detail.',
    createdAt: '2026-08-15T10:00:00.000Z',
  } as const;

  const cursor = '550e8400-e29b-41d4-a716-446655440033';

  it('accepts a page with items and a keyset cursor', () => {
    const page = { items: [item, { ...item, context: 'diagnostic' }], nextCursor: cursor };
    expect(parsePracticeHistory(page)).toEqual(page);
  });

  it('accepts the final empty page and an empty transcript', () => {
    expect(parsePracticeHistory({ items: [], nextCursor: null })).toEqual({
      items: [],
      nextCursor: null,
    });
    expect(
      parsePracticeHistory({ items: [{ ...item, transcript: '' }], nextCursor: null }).items[0]
        .transcript,
    ).toBe('');
  });

  it('rejects an empty page that still advertises another page', () => {
    expectContractError(() => parsePracticeHistory({ items: [], nextCursor: cursor }));
  });

  it('rejects pages larger than the server maximum', () => {
    const items = Array.from({ length: 51 }, (_value, index) => ({
      ...item,
      id: `550e8400-e29b-41d4-a716-4466554400${(index + 10).toString().padStart(2, '0')}`,
    }));
    expectContractError(() => parsePracticeHistory({ items, nextCursor: null }));
  });

  it('accepts a page holding exactly the server maximum', () => {
    const items = Array.from({ length: 50 }, (_value, index) => ({
      ...item,
      id: `550e8400-e29b-41d4-a716-4466554400${(index + 10).toString().padStart(2, '0')}`,
    }));
    expect(parsePracticeHistory({ items, nextCursor: cursor }).items).toEqual(items);
  });

  it.each([1, PRACTICE_MAX_ATTEMPTS])(
    'accepts a history item on attempt-number boundary %i',
    (attemptNo) => {
      const page = { items: [{ ...item, attemptNo }], nextCursor: null };
      expect(parsePracticeHistory(page)).toEqual(page);
    },
  );

  it('accepts diagnostic attempt numbers through the backend maximum of 5', () => {
    const page = {
      items: [{ ...item, context: 'diagnostic', attemptNo: 5 }],
      nextCursor: null,
    } as const;
    expect(parsePracticeHistory(page)).toEqual(page);
  });

  it.each([
    [59, false],
    [60, true],
  ])('accepts history score %i with passed=%s', (score, passed) => {
    const page = { items: [{ ...item, score, passed }], nextCursor: null };
    expect(parsePracticeHistory(page)).toEqual(page);
  });

  it.each([
    [59, true],
    [60, false],
  ])('rejects history score %i with inconsistent passed=%s', (score, passed) => {
    expectContractError(() =>
      parsePracticeHistory({ items: [{ ...item, score, passed }], nextCursor: null }),
    );
  });

  it('keeps the practice maximum at 3 and rejects diagnostic attempt 6', () => {
    expectContractError(() =>
      parsePracticeHistory({
        items: [{ ...item, context: 'practice', attemptNo: 4 }],
        nextCursor: null,
      }),
    );
    expectContractError(() =>
      parsePracticeHistory({
        items: [{ ...item, context: 'diagnostic', attemptNo: 6 }],
        nextCursor: null,
      }),
    );
  });

  it.each([
    ['an array carrying valid item fields', Object.assign([], item)],
    ['a non-uuid id', { ...item, id: 'row-1' }],
    ['a non-uuid questionId', { ...item, questionId: 'question-1' }],
    ['a blank prompt word', { ...item, promptWord: '  ' }],
    ['an oversized question', { ...item, questionText: 'x'.repeat(1_001) }],
    ['an unknown level', { ...item, cefrLevel: 'Z9' }],
    ['an unknown context', { ...item, context: 'homework' }],
    ['a zero attempt number', { ...item, attemptNo: 0 }],
    ['an attempt number above the retry cap', { ...item, attemptNo: PRACTICE_MAX_ATTEMPTS + 1 }],
    ['an out-of-range score', { ...item, score: 101 }],
    ['a non-boolean passed flag', { ...item, passed: 'no' }],
    ['an oversized transcript', { ...item, transcript: 'x'.repeat(12_001) }],
    ['empty feedback', { ...item, feedback: '' }],
    ['an unparseable createdAt', { ...item, createdAt: 'last week' }],
  ])('rejects a history item with %s', (_label, value) => {
    expectContractError(() => parsePracticeHistory({ items: [value], nextCursor: null }));
  });

  it.each([
    ['a non-record page', 'page'],
    ['non-array items', { items: 'rows', nextCursor: null }],
    ['a non-uuid cursor', { items: [item], nextCursor: 'next' }],
  ])('rejects a page envelope with %s', (_label, value) => {
    expectContractError(() => parsePracticeHistory(value));
  });
});

describe('user data export page parser', () => {
  const exportUser = { ...user } as const;
  const cursor = '550e8400-e29b-41d4-a716-446655440034';

  it('passes attempt rows through verbatim for export fidelity', () => {
    const page = {
      user: exportUser,
      attempts: [{ id: 'a1', anything: { nested: true } }],
      nextCursor: cursor,
    };
    expect(parseUserDataPage(page)).toEqual(page);
  });

  it('accepts the final page of an account with no attempts', () => {
    expect(parseUserDataPage({ user: exportUser, attempts: [], nextCursor: null })).toEqual({
      user: exportUser,
      attempts: [],
      nextCursor: null,
    });
  });

  it('accepts a full export page and rejects one row beyond the server maximum', () => {
    const attempts = Array.from({ length: 500 }, (_value, index) => ({ id: index }));
    expect(parseUserDataPage({ user: exportUser, attempts, nextCursor: cursor }).attempts).toEqual(
      attempts,
    );
    expectContractError(() =>
      parseUserDataPage({
        user: exportUser,
        attempts: [...attempts, { id: 500 }],
        nextCursor: cursor,
      }),
    );
  });

  it.each([
    ['a non-record envelope', 'page'],
    ['a malformed user', { user: { ...exportUser, email: '' }, attempts: [], nextCursor: null }],
    ['non-array attempts', { user: exportUser, attempts: 'rows', nextCursor: null }],
    ['a non-record attempt row', { user: exportUser, attempts: ['row'], nextCursor: null }],
    ['a non-uuid cursor', { user: exportUser, attempts: [{}], nextCursor: 'next' }],
    [
      'an empty page that advertises another page',
      { user: exportUser, attempts: [], nextCursor: '550e8400-e29b-41d4-a716-446655440035' },
    ],
  ])('rejects %s', (_label, value) => {
    expectContractError(() => parseUserDataPage(value));
  });
});

describe('CEFR level order', () => {
  it('pins the promotion ladder', () => {
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  });
});
