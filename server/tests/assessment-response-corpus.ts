export type ResponseContext = 'diagnostic' | 'practice' | 'practice-native';

export interface AssessmentResponseCase {
  name: string;
  context: ResponseContext;
  value: unknown;
  valid: boolean;
  /**
   * Expected app-parser acceptance when the additive client contract is
   * deliberately more tolerant than the server's durable-data gate. Clients
   * ignore unknown fields so old binaries survive new additive responses;
   * the server still rejects the row as corrupt. Defaults to `valid`.
   */
  appValid?: boolean;
}

const QUESTION_ID = '11111111-1111-4111-8111-111111111111';
const CYCLE_ID = '22222222-2222-4222-8222-222222222222';
const NEXT_CYCLE_ID = '33333333-3333-4333-8333-333333333333';
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const PROMOTIONS = [
  ['A1', 'A2'],
  ['A2', 'B1'],
  ['B1', 'B2'],
  ['B2', 'C1'],
  ['C1', 'C2'],
] as const;

function question(cefrLevel: (typeof LEVELS)[number] = 'A1') {
  return {
    id: QUESTION_ID,
    cefrLevel,
    promptWord: 'contract',
    questionText: 'Explain this contract.',
  };
}

function progress(overrides: Record<string, unknown> = {}) {
  return {
    masteredCount: 1,
    learningCount: 1,
    totalAtLevel: 100,
    dueCount: 1,
    ...overrides,
  };
}

function nextPayload(cefrLevel: (typeof LEVELS)[number] = 'A1', overrides: Record<string, unknown> = {}) {
  return {
    cycleId: NEXT_CYCLE_ID,
    attemptsUsed: 0,
    attemptsLeft: 3,
    question: question(cefrLevel),
    kind: 'new',
    progress: progress(),
    ...overrides,
  };
}

export function diagnosticDone(overrides: Record<string, unknown> = {}) {
  return {
    passed: true,
    score: 60,
    transcript: 'A diagnostic answer.',
    feedback: 'This meets the threshold.',
    done: true,
    level: 'A1',
    ...overrides,
  };
}

export function diagnosticActive(overrides: Record<string, unknown> = {}) {
  return {
    passed: false,
    score: 59,
    transcript: 'A diagnostic answer.',
    feedback: 'Add more detail.',
    done: false,
    nextQuestion: question(),
    ...overrides,
  };
}

export function practiceRetry(overrides: Record<string, unknown> = {}) {
  return {
    passed: false,
    mastered: false,
    cycleId: CYCLE_ID,
    attemptNo: 1,
    attemptsLeft: 2,
    score: 50,
    transcript: 'A retryable answer.',
    feedback: 'Add more detail.',
    ...overrides,
  };
}

export function practiceSilence(overrides: Record<string, unknown> = {}) {
  return {
    passed: false,
    mastered: false,
    cycleId: CYCLE_ID,
    attemptNo: 1,
    attemptsLeft: 3,
    noSpeech: true,
    score: 0,
    transcript: '',
    feedback: 'Please speak clearly and try again.',
    ...overrides,
  };
}

export function practiceTerminal(overrides: Record<string, unknown> = {}) {
  return {
    passed: false,
    mastered: false,
    cycleId: CYCLE_ID,
    attemptNo: 3,
    attemptsLeft: 0,
    score: 50,
    transcript: 'A final attempt.',
    feedback: 'Add more detail.',
    finalFeedback: 'A complete final explanation.',
    next: nextPayload(),
    ...overrides,
  };
}

export function practiceLearningPass(overrides: Record<string, unknown> = {}) {
  return {
    passed: true,
    mastered: false,
    cycleId: CYCLE_ID,
    attemptNo: 1,
    attemptsLeft: 0,
    score: 60,
    transcript: 'A passing answer.',
    feedback: 'Good answer.',
    next: nextPayload(),
    ...overrides,
  };
}

export function practiceMastery(overrides: Record<string, unknown> = {}) {
  return {
    passed: true,
    mastered: true,
    cycleId: CYCLE_ID,
    attemptNo: 1,
    attemptsLeft: 0,
    score: 75,
    transcript: 'A mastered answer.',
    feedback: 'Clear and relevant.',
    next: nextPayload(),
    ...overrides,
  };
}

export function practicePromotion(
  from: (typeof LEVELS)[number] = 'A1',
  to: (typeof LEVELS)[number] = 'A2',
  overrides: Record<string, unknown> = {},
) {
  return practiceMastery({
    next: nextPayload(to),
    levelUp: { from, to },
    ...overrides,
  });
}

export function nativeSpoken(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'native',
    nativeLanguage: 'te',
    cycleId: CYCLE_ID,
    attemptNo: 1,
    attemptsLeft: 2,
    understood: true,
    transcript: 'A native-language answer.',
    translatedTranscript: 'An English translation of the answer.',
    modelAnswer: 'This is a model English answer.',
    feedback: 'The answer shows understanding.',
    ...overrides,
  };
}

export function nativeSilence(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'native',
    nativeLanguage: 'te',
    cycleId: CYCLE_ID,
    attemptNo: 1,
    attemptsLeft: 3,
    understood: false,
    transcript: '',
    translatedTranscript: '',
    modelAnswer: '',
    feedback: 'Please speak clearly and try again.',
    noSpeech: true,
    ...overrides,
  };
}

function without(value: Record<string, unknown>, key: string): Record<string, unknown> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

function caseOf(name: string, context: ResponseContext, value: unknown, valid: boolean): AssessmentResponseCase {
  return { name, context, value, valid };
}

const cases: AssessmentResponseCase[] = [];
const valid = (name: string, context: ResponseContext, value: unknown) =>
  cases.push(caseOf(name, context, value, true));
const invalid = (name: string, context: ResponseContext, value: unknown) =>
  cases.push(caseOf(name, context, value, false));

// Diagnostic scalar boundaries and branch discrimination.
valid('diagnostic pass threshold', 'diagnostic', diagnosticDone());
valid('diagnostic maximum score', 'diagnostic', diagnosticDone({ score: 100 }));
valid('diagnostic fail threshold', 'diagnostic', diagnosticActive());
valid(
  'diagnostic minimum score and empty transcript',
  'diagnostic',
  diagnosticActive({ score: 0, transcript: '', noSpeech: true }),
);
valid('diagnostic maximum transcript', 'diagnostic', diagnosticActive({ transcript: 'x'.repeat(12_000) }));
valid('diagnostic maximum feedback', 'diagnostic', diagnosticActive({ feedback: 'x'.repeat(800) }));
valid('diagnostic additive field', 'diagnostic', diagnosticDone({ additiveFutureField: { enabled: true } }));
for (const level of LEVELS) valid(`diagnostic CEFR ${level}`, 'diagnostic', diagnosticDone({ level }));

for (const [name, value] of [
  ['missing passed', without(diagnosticDone(), 'passed')],
  ['missing score', without(diagnosticDone(), 'score')],
  ['missing transcript', without(diagnosticDone(), 'transcript')],
  ['missing feedback', without(diagnosticDone(), 'feedback')],
  ['missing done', without(diagnosticDone(), 'done')],
  ['empty transcript without noSpeech', diagnosticActive({ score: 0, transcript: '' })],
  ['negative score', diagnosticActive({ score: -1 })],
  ['score above maximum', diagnosticDone({ score: 101 })],
  ['fractional score', diagnosticDone({ score: 60.5 })],
  ['string score', diagnosticDone({ score: '60' })],
  ['NaN score', diagnosticDone({ score: Number.NaN })],
  ['infinite score', diagnosticDone({ score: Number.POSITIVE_INFINITY })],
  ['passing flag below threshold', diagnosticActive({ passed: true })],
  ['failing flag at threshold', diagnosticDone({ passed: false })],
  ['overlong transcript', diagnosticActive({ transcript: 'x'.repeat(12_001) })],
  ['non-string transcript', diagnosticActive({ transcript: 1 })],
  ['empty feedback', diagnosticActive({ feedback: '' })],
  ['whitespace feedback', diagnosticActive({ feedback: '   ' })],
  ['overlong feedback', diagnosticActive({ feedback: 'x'.repeat(801) })],
  ['non-string feedback', diagnosticActive({ feedback: 1 })],
  ['non-boolean done', diagnosticActive({ done: 0 })],
  ['done with next question', diagnosticDone({ nextQuestion: question() })],
  ['done without level', without(diagnosticDone(), 'level')],
  ['done with invalid level', diagnosticDone({ level: 'A3' })],
  ['active with level', diagnosticActive({ level: 'A1' })],
  ['active without next question', without(diagnosticActive(), 'nextQuestion')],
  ['active with non-object next question', diagnosticActive({ nextQuestion: null })],
] as const) {
  invalid(`diagnostic ${name}`, 'diagnostic', value);
}

// Question identity/content boundaries, reached through diagnostic nextQuestion.
const baseQuestion = question();
valid(
  'question exact text bounds and uppercase UUID',
  'diagnostic',
  diagnosticActive({
    nextQuestion: {
      ...baseQuestion,
      id: QUESTION_ID.toUpperCase(),
      promptWord: 'x'.repeat(100),
      questionText: 'x'.repeat(1_000),
    },
  }),
);
for (const [name, candidate] of [
  ['missing id', without(baseQuestion, 'id')],
  ['UUID leading junk', { ...baseQuestion, id: `x${QUESTION_ID}` }],
  ['UUID trailing junk', { ...baseQuestion, id: `${QUESTION_ID}x` }],
  ['UUID version zero', { ...baseQuestion, id: '11111111-1111-0111-8111-111111111111' }],
  ['UUID bad variant', { ...baseQuestion, id: '11111111-1111-4111-7111-111111111111' }],
  ['non-string UUID', { ...baseQuestion, id: 1 }],
  ['invalid CEFR', { ...baseQuestion, cefrLevel: 'A3' }],
  ['non-string CEFR', { ...baseQuestion, cefrLevel: 1 }],
  ['empty prompt', { ...baseQuestion, promptWord: '' }],
  ['whitespace prompt', { ...baseQuestion, promptWord: '   ' }],
  ['overlong prompt', { ...baseQuestion, promptWord: 'x'.repeat(101) }],
  ['non-string prompt', { ...baseQuestion, promptWord: 1 }],
  ['empty question text', { ...baseQuestion, questionText: '' }],
  ['whitespace question text', { ...baseQuestion, questionText: '   ' }],
  ['overlong question text', { ...baseQuestion, questionText: 'x'.repeat(1_001) }],
  ['non-string question text', { ...baseQuestion, questionText: 1 }],
] as const) {
  invalid(`question ${name}`, 'diagnostic', diagnosticActive({ nextQuestion: candidate }));
}

// Practice progress and next-payload boundaries.
valid('practice revision kind', 'practice', practiceLearningPass({ next: nextPayload('A1', { kind: 'revision' }) }));
valid(
  'practice omitted due count',
  'practice',
  practiceLearningPass({ next: nextPayload('A1', { progress: without(progress(), 'dueCount') }) }),
);
valid(
  'practice maximum word-bank counts',
  'practice',
  practiceLearningPass({
    next: nextPayload('A1', {
      progress: progress({ masteredCount: 100_000, learningCount: 0, totalAtLevel: 100_000, dueCount: 100_000 }),
    }),
  }),
);
valid(
  'practice progress sum equals total',
  'practice',
  practiceLearningPass({
    next: nextPayload('A1', {
      progress: progress({ masteredCount: 60, learningCount: 40, totalAtLevel: 100, dueCount: 100 }),
    }),
  }),
);

for (const [name, progressValue] of [
  ['non-object progress', null],
  ['negative mastered count', progress({ masteredCount: -1 })],
  ['over-maximum mastered count', progress({ masteredCount: 100_001 })],
  ['fractional mastered count', progress({ masteredCount: 1.5 })],
  ['string mastered count', progress({ masteredCount: '1' })],
  ['negative learning count', progress({ learningCount: -1 })],
  ['zero total', progress({ totalAtLevel: 0 })],
  ['over-maximum total', progress({ totalAtLevel: 100_001 })],
  ['sum over total', progress({ masteredCount: 80, learningCount: 30, totalAtLevel: 100 })],
  ['negative due count', progress({ dueCount: -1 })],
  ['fractional due count', progress({ dueCount: 1.5 })],
  ['string due count', progress({ dueCount: '1' })],
  ['due over learned sum', progress({ masteredCount: 1, learningCount: 1, dueCount: 3 })],
] as const) {
  invalid(
    `practice ${name}`,
    'practice',
    practiceLearningPass({ next: nextPayload('A1', { progress: progressValue }) }),
  );
}
for (const [name, next] of [
  ['invalid kind', nextPayload('A1', { kind: 'other' })],
  ['missing cycle id', without(nextPayload(), 'cycleId')],
  ['invalid cycle id', nextPayload('A1', { cycleId: 'not-a-uuid' })],
  ['missing attempts used', without(nextPayload(), 'attemptsUsed')],
  ['wrong next attempts left', nextPayload('A1', { attemptsUsed: 1, attemptsLeft: 3 })],
  ['missing question', without(nextPayload(), 'question')],
  ['missing progress', without(nextPayload(), 'progress')],
] as const) {
  invalid(`practice payload ${name}`, 'practice', practiceLearningPass({ next }));
}

// Every valid practice response branch and its branch-specific exclusions.
for (const [attemptNo, attemptsLeft] of [
  [1, 3],
  [2, 2],
  [3, 1],
] as const) {
  valid(`practice silence ${attemptNo}/${attemptsLeft}`, 'practice', practiceSilence({ attemptNo, attemptsLeft }));
}
for (const [attemptNo, attemptsLeft] of [
  [1, 2],
  [2, 1],
] as const) {
  valid(`practice retry ${attemptNo}/${attemptsLeft}`, 'practice', practiceRetry({ attemptNo, attemptsLeft }));
}
valid('practice early terminal failure', 'practice', practiceTerminal({ attemptNo: 1 }));
valid('practice third-attempt terminal failure', 'practice', practiceTerminal());
valid('practice pass threshold', 'practice', practiceLearningPass());
valid('practice score 74 remains learning', 'practice', practiceLearningPass({ score: 74 }));
valid('practice mastery threshold', 'practice', practiceMastery());
valid('practice maximum mastery score', 'practice', practiceMastery({ score: 100 }));
valid('practice additive field', 'practice', practiceMastery({ additiveFutureField: true }));
for (const [from, to] of PROMOTIONS) {
  valid(`practice promotion ${from}/${to}`, 'practice', practicePromotion(from, to));
}

for (const [name, value] of [
  ['missing passed', without(practiceLearningPass(), 'passed')],
  ['missing mastered', without(practiceLearningPass(), 'mastered')],
  ['missing cycle id', without(practiceLearningPass(), 'cycleId')],
  ['invalid cycle id', practiceLearningPass({ cycleId: 'not-a-uuid' })],
  ['missing attempt number', without(practiceLearningPass(), 'attemptNo')],
  ['missing attempts left', without(practiceLearningPass(), 'attemptsLeft')],
  ['missing score', without(practiceLearningPass(), 'score')],
  ['missing transcript', without(practiceLearningPass(), 'transcript')],
  ['missing feedback', without(practiceLearningPass(), 'feedback')],
  ['attempt zero', practiceLearningPass({ attemptNo: 0 })],
  ['attempt four', practiceLearningPass({ attemptNo: 4 })],
  ['fractional attempt', practiceLearningPass({ attemptNo: 1.5 })],
  ['string attempt', practiceLearningPass({ attemptNo: '1' })],
  ['retry at passing score', practiceRetry({ score: 60 })],
  ['learning pass below threshold', practiceLearningPass({ score: 59 })],
  ['learning pass at mastery threshold', practiceLearningPass({ score: 75 })],
  ['mastery below threshold', practiceMastery({ score: 74 })],
  ['passing flag mismatch', practiceLearningPass({ passed: false })],
  ['mastery flag mismatch', practiceMastery({ mastered: false })],
  ['empty scored transcript', practiceLearningPass({ transcript: '' })],
  ['whitespace scored transcript', practiceLearningPass({ transcript: '   ' })],
  ['overlong scored transcript', practiceLearningPass({ transcript: 'x'.repeat(12_001) })],
  ['non-string scored transcript', practiceLearningPass({ transcript: 1 })],
  ['blank feedback', practiceLearningPass({ feedback: '   ' })],
  ['overlong feedback', practiceLearningPass({ feedback: 'x'.repeat(801) })],
  ['non-string feedback', practiceLearningPass({ feedback: 1 })],
] as const) {
  invalid(`practice ${name}`, 'practice', value);
}

for (const [name, value] of [
  ['missing noSpeech', without(practiceSilence(), 'noSpeech')],
  ['false noSpeech', practiceSilence({ noSpeech: false })],
  ['null noSpeech', practiceSilence({ noSpeech: null })],
  ['passed silence', practiceSilence({ passed: true })],
  ['mastered silence', practiceSilence({ mastered: true })],
  ['nonzero silence score', practiceSilence({ score: 1 })],
  ['nonempty silence transcript', practiceSilence({ transcript: 'heard' })],
  ['wrong silence attemptsLeft', practiceSilence({ attemptsLeft: 2 })],
  ['silence with final feedback', practiceSilence({ finalFeedback: 'Unexpected.' })],
  ['silence with next', practiceSilence({ next: nextPayload() })],
  ['silence with levelUp', practiceSilence({ levelUp: { from: 'A1', to: 'A2' } })],
] as const) {
  invalid(`practice ${name}`, 'practice', value);
}

for (const [name, value] of [
  ['retry wrong attemptsLeft', practiceRetry({ attemptsLeft: 1 })],
  ['retry zero attemptsLeft', practiceRetry({ attemptsLeft: 0 })],
  ['third-attempt retry shape', practiceRetry({ attemptNo: 3, attemptsLeft: 0 })],
  ['retry with final feedback', practiceRetry({ finalFeedback: 'Unexpected.' })],
  ['retry with next', practiceRetry({ next: nextPayload() })],
  ['retry with levelUp', practiceRetry({ levelUp: { from: 'A1', to: 'A2' } })],
  ['retry with noSpeech', practiceRetry({ noSpeech: true })],
  ['terminal nonzero attemptsLeft', practiceTerminal({ attemptsLeft: 1 })],
  ['terminal missing final feedback', without(practiceTerminal(), 'finalFeedback')],
  ['terminal blank final feedback', practiceTerminal({ finalFeedback: '   ' })],
  ['terminal overlong final feedback', practiceTerminal({ finalFeedback: 'x'.repeat(4_001) })],
  ['terminal missing next', without(practiceTerminal(), 'next')],
  ['terminal invalid next', practiceTerminal({ next: null })],
  ['terminal with levelUp', practiceTerminal({ levelUp: { from: 'A1', to: 'A2' } })],
  ['terminal with noSpeech', practiceTerminal({ noSpeech: true })],
] as const) {
  invalid(`practice ${name}`, 'practice', value);
}

for (const [name, value] of [
  ['pass with nonzero attemptsLeft', practiceLearningPass({ attemptsLeft: 1 })],
  ['pass with final feedback', practiceLearningPass({ finalFeedback: 'Unexpected.' })],
  ['pass with noSpeech', practiceLearningPass({ noSpeech: false })],
  ['pass without next', without(practiceLearningPass(), 'next')],
  ['pass with invalid next', practiceLearningPass({ next: null })],
  ['learning pass with levelUp', practiceLearningPass({ levelUp: { from: 'A1', to: 'A2' } })],
  ['same-level promotion', practicePromotion('A1', 'A1')],
  ['skipped-level promotion', practicePromotion('A1', 'B1')],
  ['downward promotion', practicePromotion('B1', 'A2')],
  ['promotion next-level mismatch', practicePromotion('A1', 'A2', { next: nextPayload('B1') })],
  ['promotion with non-object levelUp', practiceMastery({ levelUp: 'A1/A2' })],
] as const) {
  invalid(`practice ${name}`, 'practice', value);
}

// Native spoken/silence variants and exact string boundaries.
valid('native spoken understood', 'practice-native', nativeSpoken());
valid('native spoken not understood', 'practice-native', nativeSpoken({ understood: false }));
valid(
  'native terminal spoken',
  'practice-native',
  nativeSpoken({ attemptNo: 3, attemptsLeft: 0, next: nextPayload() }),
);
valid('native silence', 'practice-native', nativeSilence());
valid(
  'native maximum strings',
  'practice-native',
  nativeSpoken({
    transcript: 'x'.repeat(12_000),
    translatedTranscript: 'x'.repeat(12_000),
    modelAnswer: 'x'.repeat(800),
    feedback: 'x'.repeat(800),
  }),
);
valid('native additive field', 'practice-native', nativeSpoken({ additiveFutureField: true }));

for (const [name, value] of [
  ['missing understood', without(nativeSpoken(), 'understood')],
  ['missing native language', without(nativeSpoken(), 'nativeLanguage')],
  ['unsupported native language', nativeSpoken({ nativeLanguage: 'fr' })],
  ['non-string native language', nativeSpoken({ nativeLanguage: 1 })],
  ['missing cycle id', without(nativeSpoken(), 'cycleId')],
  ['missing attempt number', without(nativeSpoken(), 'attemptNo')],
  ['missing attempts left', without(nativeSpoken(), 'attemptsLeft')],
  ['missing transcript', without(nativeSpoken(), 'transcript')],
  ['missing translation', without(nativeSpoken(), 'translatedTranscript')],
  ['missing model answer', without(nativeSpoken(), 'modelAnswer')],
  ['missing feedback', without(nativeSpoken(), 'feedback')],
  ['wrong mode', nativeSpoken({ mode: 'english' })],
  ['missing mode', without(nativeSpoken(), 'mode')],
  ['non-boolean understood', nativeSpoken({ understood: 1 })],
  ['overlong transcript', nativeSpoken({ transcript: 'x'.repeat(12_001) })],
  ['non-string transcript', nativeSpoken({ transcript: 1 })],
  ['whitespace spoken transcript', nativeSpoken({ transcript: '   ' })],
  ['overlong translation', nativeSpoken({ translatedTranscript: 'x'.repeat(12_001) })],
  ['whitespace translation', nativeSpoken({ translatedTranscript: '   ' })],
  ['overlong model answer', nativeSpoken({ modelAnswer: 'x'.repeat(801) })],
  ['non-string model answer', nativeSpoken({ modelAnswer: 1 })],
  ['whitespace model answer', nativeSpoken({ modelAnswer: '   ' })],
  ['blank feedback', nativeSpoken({ feedback: '   ' })],
  ['overlong feedback', nativeSpoken({ feedback: 'x'.repeat(801) })],
  ['non-string feedback', nativeSpoken({ feedback: 1 })],
  ['understood silence', nativeSilence({ understood: true })],
  ['silence without noSpeech', without(nativeSilence(), 'noSpeech')],
  ['silence with translation', nativeSilence({ translatedTranscript: 'Unexpected.' })],
  ['silence with model answer', nativeSilence({ modelAnswer: 'Unexpected.' })],
  ['retry with wrong attempts left', nativeSpoken({ attemptsLeft: 1 })],
  ['retry with next', nativeSpoken({ next: nextPayload() })],
  ['terminal without next', nativeSpoken({ attemptNo: 3, attemptsLeft: 0 })],
] as const) {
  invalid(`native ${name}`, 'practice-native', value);
}

// Context dispatch is part of the durable discriminator contract.
for (const context of ['diagnostic', 'practice', 'practice-native'] as const) {
  invalid(`${context} null top-level response`, context, null);
  invalid(`${context} array top-level response`, context, []);
  invalid(`${context} scalar top-level response`, context, 'response');
}
for (const [name, context, value] of [
  ['diagnostic as practice', 'practice', diagnosticDone()],
  ['diagnostic as native', 'practice-native', diagnosticDone()],
  ['practice as diagnostic', 'diagnostic', practiceMastery()],
  ['practice as native', 'practice-native', practiceMastery()],
  ['native as diagnostic', 'diagnostic', nativeSpoken()],
  ['native as practice', 'practice', nativeSpoken()],
] as const) {
  invalid(name, context, value);
}

const RECORDING_ID = '22222222-2222-4222-8222-222222222222';
for (const [context, value] of [
  ['diagnostic', diagnosticDone({ recordingId: RECORDING_ID })],
  ['practice', practiceMastery({ recordingId: RECORDING_ID })],
  ['practice-native', nativeSpoken({ recordingId: RECORDING_ID })],
] as const) {
  valid(`${context} retained recording id`, context, value);
}
for (const [context, value] of [
  ['diagnostic', diagnosticDone({ recordingId: 'not-a-uuid' })],
  ['practice', practiceMastery({ recordingId: 7 })],
  ['practice-native', nativeSpoken({ recordingId: null })],
] as const) {
  invalid(`${context} invalid retained recording id`, context, value);
}

// Additive word-level transcript tags: valid on every scored speaking shape,
// rejected with an unknown status, and rejected on silence (which never
// carries a transcript to tag).
const WORD_SCORES = [
  { word: 'courage', status: 'good' },
  { word: 'brung', status: 'poor' },
  { word: 'when', status: 'fair' },
];
for (const [context, value] of [
  ['diagnostic', diagnosticDone({ wordScores: WORD_SCORES })],
  ['practice', practiceRetry({ wordScores: WORD_SCORES })],
  ['practice', practiceTerminal({ wordScores: WORD_SCORES })],
] as const) {
  valid(`${context} word-level transcript tags`, context, value);
}
for (const [context, value] of [
  ['practice', practiceRetry({ wordScores: [{ word: 'courage', status: 'excellent' }] })],
  ['practice', practiceSilence({ wordScores: WORD_SCORES })],
  ['diagnostic', diagnosticDone({ wordScores: [{ word: '', status: 'good' }] })],
] as const) {
  invalid(`${context} invalid word-level transcript tags`, context, value);
}

export const assessmentResponseCases: readonly AssessmentResponseCase[] = cases;
