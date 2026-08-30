import type { AssessmentEndpoint } from './pending-assessment';
import { isUuid as isRouterParamUuid } from './params';

export type NativeLanguage = 'te' | 'hi' | 'es' | 'zh';
export type UiLanguage = 'en' | NativeLanguage;
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** CEFR levels in promotion order; level-up responses move one step right. */
export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface User {
  id: string;
  name: string;
  email: string;
  nativeLanguage: NativeLanguage;
  uiLanguage: UiLanguage;
  cefrLevel: CefrLevel | null;
  diagnosticCompleted: boolean;
  /** Additive compatibility field; absent older servers are treated as acknowledged. */
  diagnosticAcknowledged?: boolean;
}

export interface Question {
  id: string;
  cefrLevel: CefrLevel;
  promptWord: string;
  questionText: string;
}

export interface DiagnosticAnswerSummary {
  attemptNo: number;
  promptWord: string;
  questionText: string;
  transcript: string;
  score: number;
  passed: boolean;
  feedback: string;
}

export type DiagnosticNext =
  | {
      done: false;
      question: Question;
      progress: { asked: number; maxQuestions: number };
      answers?: DiagnosticAnswerSummary[];
    }
  | { done: true; level: CefrLevel; answers?: DiagnosticAnswerSummary[] };

export interface DiagnosticAnswerResult {
  passed: boolean;
  score: number;
  transcript: string;
  feedback: string;
  done: boolean;
  noSpeech?: true;
  level?: CefrLevel;
  nextQuestion?: Question;
  recordingId?: string;
}

export interface HelpContent {
  promptWord: string;
  promptWordNative: string;
  questionText: string;
  questionTextNative: string;
  examples: { en: string; native: string }[];
}

export type PracticeKind = 'revision' | 'new';
export type PracticeAnswerMode = 'english' | 'native';

export const PRACTICE_PASS_SCORE = 60;
export const PRACTICE_MASTER_SCORE = 75;
export const PRACTICE_MAX_ATTEMPTS = 3;

export interface PracticeProgress {
  masteredCount: number;
  learningCount: number;
  totalAtLevel: number;
  /**
   * Words due for spaced-repetition review. Additive server field: older
   * deployments omit it, so it stays optional and is validated when present.
   */
  dueCount?: number;
}

/** Level promotion attached to the attempt response that earned it. */
export interface LevelUp {
  from: CefrLevel;
  to: CefrLevel;
}

export interface PracticeQuestionPayload {
  question: Question;
  kind: PracticeKind;
  progress: PracticeProgress;
  /** Durable server-owned serving cycle shared by English and native answers. */
  cycleId: string;
  attemptsUsed: number;
  attemptsLeft: number;
}

export interface AttemptResult {
  cycleId: string;
  passed: boolean;
  mastered: boolean;
  attemptNo: number;
  attemptsLeft: number;
  noSpeech?: boolean;
  score: number;
  transcript: string;
  feedback: string;
  finalFeedback?: string;
  next?: PracticeQuestionPayload;
  levelUp?: LevelUp;
  recordingId?: string;
}

export interface PracticeStats {
  /** Null before placement, when the progress snapshot is exactly all zeros. */
  level: CefrLevel | null;
  progress: {
    masteredCount: number;
    learningCount: number;
    totalAtLevel: number;
    dueCount: number;
  };
  streakDays: number;
  practicedToday: number;
  totalAttempts: number;
  lastPracticedAt: string | null;
}

export type HistoryContext = 'diagnostic' | 'practice' | 'practice-native';
export type RecordingContext = HistoryContext;
export type RecordingStatus = 'retention_pending' | 'available' | 'unavailable';

export interface HistoryItem {
  id: string;
  questionId: string;
  promptWord: string;
  questionText: string;
  cefrLevel: CefrLevel;
  context: HistoryContext;
  /** Immutable language used for a native answer; null for English/diagnostic rows. */
  nativeLanguage: NativeLanguage | null;
  cycleId: string | null;
  attemptNo: number;
  score: number | null;
  passed: boolean | null;
  understood: boolean | null;
  transcript: string;
  translatedTranscript: string | null;
  modelAnswer: string | null;
  feedback: string;
  createdAt: string;
  recordingId?: string | null;
  recordingStatus?: RecordingStatus | null;
}

export interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

/** One page of the GET /auth/me/data export. Export rows are passed through
 * verbatim so the downloaded file keeps full server fidelity. Attempts and
 * practice cycles have independent cursors/done flags. */
export interface UserDataPage {
  user: User;
  attempts: Record<string, unknown>[];
  practiceProgress: Record<string, unknown>[];
  practiceCycles: Record<string, unknown>[];
  diagnosticState: Record<string, unknown> | null;
  nextCursor: string | null;
  nextPracticeCycleCursor: string | null;
  attemptsDone: boolean;
  practiceCyclesDone: boolean;
}

export interface NativeAttemptResult {
  mode: 'native';
  /** Immutable language snapshot attached to the submitted transcript. */
  nativeLanguage: NativeLanguage;
  cycleId: string;
  understood: boolean;
  attemptNo: number;
  attemptsLeft: number;
  noSpeech?: boolean;
  transcript: string;
  translatedTranscript: string;
  modelAnswer: string;
  feedback: string;
  next?: PracticeQuestionPayload;
  recordingId?: string;
}

export interface RecordingItem {
  id: string;
  questionId: string;
  context: RecordingContext;
  promptWord: string;
  questionText: string;
  cefrLevel: CefrLevel;
  contentType: string;
  sizeBytes: number;
  durationMs: number | null;
  status: RecordingStatus;
  createdAt: string;
  availableAt: string | null;
}

export interface RecordingPage {
  items: RecordingItem[];
  nextCursor: string | null;
}

export interface RecordingExportPage {
  recordings: RecordingExportItem[];
  nextCursor: string | null;
}

export interface RecordingExportItem extends RecordingItem {
  requestId: string;
  attemptId: string | null;
}

export interface RecordingPlaybackGrant {
  recordingId: string;
  playbackUrl: string;
  expiresIn: number;
  contentType: string;
}

export type PracticeOutcome = AttemptResult | NativeAttemptResult;

export function isNativeOutcome(result: PracticeOutcome): result is NativeAttemptResult {
  return 'mode' in result && result.mode === 'native';
}

export class ContractError extends Error {
  constructor() {
    super('The server returned an invalid response. Please try again.');
    this.name = 'ContractError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return isString(value) && value.length <= maxLength;
}

function isBoundedNonEmptyString(value: unknown, maxLength: number): value is string {
  return isNonEmptyString(value) && value.length <= maxLength;
}

function isNumber(value: unknown): value is number {
  return Number.isFinite(value);
}

function isNativeLanguage(value: unknown): value is NativeLanguage {
  return value === 'te' || value === 'hi' || value === 'es' || value === 'zh';
}

function isUiLanguage(value: unknown): value is UiLanguage {
  return value === 'en' || isNativeLanguage(value);
}

function isCefrLevel(value: unknown): value is CefrLevel {
  return (
    value === 'A1' ||
    value === 'A2' ||
    value === 'B1' ||
    value === 'B2' ||
    value === 'C1' ||
    value === 'C2'
  );
}

function isUuid(value: unknown): value is string {
  // Single regex source of truth: the router-param twin in params.ts.
  return isString(value) && isRouterParamUuid(value);
}

function isScore(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value >= 0 && value <= 100;
}

function isQuestion(value: unknown): value is Question {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isCefrLevel(value.cefrLevel) &&
    isBoundedNonEmptyString(value.promptWord, 100) &&
    isBoundedNonEmptyString(value.questionText, 1_000)
  );
}

function parseWith<T>(value: unknown, predicate: (value: unknown) => value is T): T {
  if (!predicate(value)) throw new ContractError();
  return value;
}

/** Strict public-question parser reused by durable assessment replay. */
export function parseQuestion(value: unknown): Question {
  return parseWith(value, isQuestion);
}

export function parseUser(value: unknown): User {
  return parseWith(value, (candidate): candidate is User => {
    if (!isRecord(candidate)) return false;
    return (
      isUuid(candidate.id) &&
      isBoundedNonEmptyString(candidate.name, 100) &&
      isBoundedNonEmptyString(candidate.email, 254) &&
      isNativeLanguage(candidate.nativeLanguage) &&
      isUiLanguage(candidate.uiLanguage) &&
      (candidate.cefrLevel === null || isCefrLevel(candidate.cefrLevel)) &&
      typeof candidate.diagnosticCompleted === 'boolean' &&
      (candidate.diagnosticAcknowledged === undefined ||
        typeof candidate.diagnosticAcknowledged === 'boolean')
    );
  });
}

export function parseAuthResponse(value: unknown): { token: string; user: User } {
  if (!isRecord(value) || !isBoundedNonEmptyString(value.token, 16_384)) {
    throw new ContractError();
  }
  return { token: value.token, user: parseUser(value.user) };
}

export function parseUserResponse(value: unknown): { user: User } {
  if (!isRecord(value)) throw new ContractError();
  return { user: parseUser(value.user) };
}

function isPracticeKind(value: unknown): value is PracticeKind {
  return value === 'revision' || value === 'new';
}

const MAX_WORD_BANK_COUNT = 100_000;

function isWordBankCount(value: unknown): value is number {
  return (
    isNumber(value) && Number.isSafeInteger(value) && value >= 0 && value <= MAX_WORD_BANK_COUNT
  );
}

function isLifetimeCount(value: unknown): value is number {
  return isNumber(value) && Number.isSafeInteger(value) && value >= 0;
}

function isPracticeProgress(value: unknown): value is PracticeProgress {
  return (
    isRecord(value) &&
    isWordBankCount(value.masteredCount) &&
    isWordBankCount(value.learningCount) &&
    isWordBankCount(value.totalAtLevel) &&
    value.totalAtLevel >= 1 &&
    value.masteredCount + value.learningCount <= value.totalAtLevel &&
    // Additive SRS field: absent on older servers, and never larger than the
    // learning+mastered rows it counts due entries of.
    (value.dueCount === undefined ||
      (isWordBankCount(value.dueCount) &&
        value.dueCount <= value.masteredCount + value.learningCount))
  );
}

function isLevelUp(value: unknown): value is LevelUp {
  return (
    isRecord(value) &&
    isCefrLevel(value.from) &&
    isCefrLevel(value.to) &&
    // Promotion always moves exactly one step up the CEFR ladder.
    CEFR_LEVELS.indexOf(value.to) === CEFR_LEVELS.indexOf(value.from) + 1
  );
}

function isPracticeQuestionPayload(value: unknown): value is PracticeQuestionPayload {
  if (!isRecord(value)) return false;
  const attemptsUsed = value.attemptsUsed;
  const attemptsLeft = value.attemptsLeft;
  return (
    isPracticeKind(value.kind) &&
    isPracticeProgress(value.progress) &&
    isQuestion(value.question) &&
    isUuid(value.cycleId) &&
    isNumber(attemptsUsed) &&
    Number.isInteger(attemptsUsed) &&
    attemptsUsed >= 0 &&
    attemptsUsed < PRACTICE_MAX_ATTEMPTS &&
    attemptsLeft === PRACTICE_MAX_ATTEMPTS - attemptsUsed
  );
}

export function parsePracticeQuestion(value: unknown): PracticeQuestionPayload {
  return parseWith(value, isPracticeQuestionPayload);
}

export function parseDiagnosticNext(value: unknown): DiagnosticNext {
  if (!isRecord(value)) {
    throw new ContractError();
  }
  const done = value.done;
  if (typeof done !== 'boolean') throw new ContractError();
  const level = value.level;
  const question = value.question;
  const rawProgress = value.progress;
  const rawAnswers = value.answers;
  const answers = rawAnswers === undefined ? undefined : parseDiagnosticAnswerSummaries(rawAnswers);
  if (done) {
    if (!isCefrLevel(level) || question !== undefined || rawProgress !== undefined) {
      throw new ContractError();
    }
    return answers === undefined ? { done: true, level } : { done: true, level, answers };
  }
  if (!isRecord(rawProgress)) throw new ContractError();
  const asked = rawProgress.asked;
  const maxQuestions = rawProgress.maxQuestions;
  if (
    level !== undefined ||
    !isNumber(asked) ||
    !Number.isInteger(asked) ||
    asked < 0 ||
    !isNumber(maxQuestions) ||
    !Number.isInteger(maxQuestions) ||
    maxQuestions < 1 ||
    maxQuestions > 100 ||
    // Current servers finalize at attemptNo >= maxQuestions, so asked can at
    // most equal it. Equality stays accepted for one legacy shape: a run
    // abandoned under the pre-MAX_QUESTIONS server with 3+ non-silent answers
    // (the DB allows questions_asked up to 5) would otherwise hard-fail this
    // parser and block the resumed test until a manual Settings restart.
    asked > maxQuestions
  ) {
    throw new ContractError();
  }
  const result: DiagnosticNext = {
    done: false,
    question: parseWith(question, isQuestion),
    progress: { asked, maxQuestions },
  };
  if (answers !== undefined) result.answers = answers;
  return result;
}

function parseDiagnosticAnswerSummaries(value: unknown): DiagnosticAnswerSummary[] {
  if (!Array.isArray(value) || value.length > 5) throw new ContractError();
  return value.map((candidate, index) => {
    if (
      !isRecord(candidate) ||
      !isNumber(candidate.attemptNo) ||
      !Number.isInteger(candidate.attemptNo) ||
      candidate.attemptNo !== index + 1 ||
      !isBoundedNonEmptyString(candidate.promptWord, 100) ||
      !isBoundedNonEmptyString(candidate.questionText, 1_000) ||
      !isBoundedNonEmptyString(candidate.transcript, 12_000) ||
      !isScore(candidate.score) ||
      typeof candidate.passed !== 'boolean' ||
      candidate.passed !== candidate.score >= PRACTICE_PASS_SCORE ||
      !isBoundedNonEmptyString(candidate.feedback, 800)
    ) {
      throw new ContractError();
    }
    return {
      attemptNo: candidate.attemptNo,
      promptWord: candidate.promptWord,
      questionText: candidate.questionText,
      transcript: candidate.transcript,
      score: candidate.score,
      passed: candidate.passed,
      feedback: candidate.feedback,
    };
  });
}

export function parseDiagnosticAnswerResult(value: unknown): DiagnosticAnswerResult {
  if (!isRecord(value)) throw new ContractError();
  const passed = value.passed;
  const score = value.score;
  const transcript = value.transcript;
  const feedback = value.feedback;
  const done = value.done;
  const noSpeech = value.noSpeech;
  const recordingId = value.recordingId;
  if (
    typeof passed !== 'boolean' ||
    !isScore(score) ||
    !isBoundedString(transcript, 12_000) ||
    !isBoundedNonEmptyString(feedback, 800) ||
    typeof done !== 'boolean' ||
    (recordingId !== undefined && !isUuid(recordingId))
  ) {
    throw new ContractError();
  }
  if (passed !== score >= PRACTICE_PASS_SCORE) throw new ContractError();
  const result: DiagnosticAnswerResult = {
    passed,
    score,
    transcript,
    feedback,
    done,
  };
  if (recordingId !== undefined) result.recordingId = recordingId;
  const level = value.level;
  const nextQuestion = value.nextQuestion;
  if (noSpeech !== undefined) {
    if (
      noSpeech !== true ||
      passed ||
      score !== 0 ||
      transcript !== '' ||
      done ||
      level !== undefined ||
      nextQuestion === undefined
    ) {
      throw new ContractError();
    }
    result.noSpeech = true;
    result.nextQuestion = parseWith(nextQuestion, isQuestion);
    return result;
  }
  if (!isBoundedNonEmptyString(transcript, 12_000)) throw new ContractError();
  if (done) {
    if (!isCefrLevel(level) || nextQuestion !== undefined) {
      throw new ContractError();
    }
    result.level = level;
  } else {
    if (level !== undefined || nextQuestion === undefined) {
      throw new ContractError();
    }
    result.nextQuestion = parseWith(nextQuestion, isQuestion);
  }
  return result;
}

export function parseHelpContent(value: unknown): HelpContent {
  if (
    !isRecord(value) ||
    !isBoundedNonEmptyString(value.promptWord, 100) ||
    !isBoundedNonEmptyString(value.promptWordNative, 500) ||
    !isBoundedNonEmptyString(value.questionText, 1_000) ||
    !isBoundedNonEmptyString(value.questionTextNative, 4_000) ||
    !Array.isArray(value.examples) ||
    value.examples.length !== 3
  ) {
    throw new ContractError();
  }
  const examples = value.examples.map((example) => {
    if (
      !isRecord(example) ||
      !isBoundedNonEmptyString(example.en, 4_000) ||
      !isBoundedNonEmptyString(example.native, 4_000)
    ) {
      throw new ContractError();
    }
    return { en: example.en, native: example.native };
  });
  return {
    promptWord: value.promptWord,
    promptWordNative: value.promptWordNative,
    questionText: value.questionText,
    questionTextNative: value.questionTextNative,
    examples,
  };
}

export function parseAttemptResult(value: unknown, expectedCycleId?: string): AttemptResult {
  if (!isRecord(value)) throw new ContractError();
  // Snapshot every response field once. JSON responses are plain records, but
  // callers and tests may still hand this public parser accessor-backed input;
  // validation and rendering must agree on the same observed values.
  const passed = value.passed;
  const mastered = value.mastered;
  const cycleId = value.cycleId;
  const attemptNo = value.attemptNo;
  const score = value.score;
  const transcript = value.transcript;
  const feedback = value.feedback;
  const levelUpValue = value.levelUp;
  const noSpeechValue = value.noSpeech;
  const attemptsLeft = value.attemptsLeft;
  const finalFeedback = value.finalFeedback;
  const next = value.next;
  const recordingId = value.recordingId;
  if (
    !isUuid(cycleId) ||
    (expectedCycleId !== undefined && cycleId !== expectedCycleId) ||
    typeof passed !== 'boolean' ||
    typeof mastered !== 'boolean' ||
    !isNumber(attemptNo) ||
    !Number.isInteger(attemptNo) ||
    attemptNo < 1 ||
    attemptNo > PRACTICE_MAX_ATTEMPTS ||
    !isScore(score) ||
    !isNumber(attemptsLeft) ||
    !Number.isInteger(attemptsLeft) ||
    attemptsLeft < 0 ||
    attemptsLeft > PRACTICE_MAX_ATTEMPTS ||
    !isBoundedString(transcript, 12_000) ||
    !isBoundedNonEmptyString(feedback, 800) ||
    (recordingId !== undefined && !isUuid(recordingId))
  ) {
    throw new ContractError();
  }
  const result: AttemptResult = {
    cycleId,
    passed,
    mastered,
    attemptNo,
    attemptsLeft,
    score,
    transcript,
    feedback,
  };
  if (recordingId !== undefined) result.recordingId = recordingId;

  // These flags are derived by the server, not independent model output.
  // Reject an impossible combination instead of rendering misleading mastery
  // state from a corrupted or incompatible response.
  if (passed !== score >= PRACTICE_PASS_SCORE || mastered !== score >= PRACTICE_MASTER_SCORE) {
    throw new ContractError();
  }

  // A level promotion can only be earned by the attempt that mastered a word.
  if (levelUpValue !== undefined && !mastered) throw new ContractError();

  // Silence is a free retry: nothing was scored and the attempt counter did
  // not advance, so attemptsLeft reflects one more attempt than a real miss.
  if (noSpeechValue !== undefined) {
    if (
      noSpeechValue !== true ||
      passed ||
      mastered ||
      score !== 0 ||
      transcript !== '' ||
      finalFeedback !== undefined ||
      next !== undefined ||
      attemptsLeft !== PRACTICE_MAX_ATTEMPTS - (attemptNo - 1)
    ) {
      throw new ContractError();
    }
    result.noSpeech = true;
    return result;
  }

  // The server turns an empty Whisper transcript into the explicit free-retry
  // variant above. A scored response can therefore never have no transcript.
  if (!isNonEmptyString(transcript)) throw new ContractError();

  if (passed) {
    if (attemptsLeft !== 0 || finalFeedback !== undefined || next === undefined) {
      throw new ContractError();
    }
    result.next = parseWith(next, isPracticeQuestionPayload);
    if (levelUpValue !== undefined) {
      const levelUp = parseWith(levelUpValue, isLevelUp);
      // The promotion response already serves the next question and progress
      // from the new level; a mismatch would desync the whole practice UI.
      if (result.next.question.cefrLevel !== levelUp.to) throw new ContractError();
      result.levelUp = levelUp;
    }
    return result;
  }

  // A miss before the last attempt normally leaves retries, but the server
  // closes the run early when a rival session promoted the level mid-assessment
  // (server/src/practice.ts): the word belongs to a level the learner has left,
  // so retrying it is meaningless and the response arrives in the terminal
  // shape instead. `attemptsLeft: 0` selects that branch below, which still
  // demands the full terminal payload, so a miscounted retry cannot slip past.
  if (attemptsLeft !== 0) {
    const expectedAttemptsLeft = PRACTICE_MAX_ATTEMPTS - attemptNo;
    if (
      attemptsLeft !== expectedAttemptsLeft ||
      finalFeedback !== undefined ||
      next !== undefined
    ) {
      throw new ContractError();
    }
    return result;
  }

  if (attemptsLeft !== 0 || !isBoundedNonEmptyString(finalFeedback, 4_000) || next === undefined) {
    throw new ContractError();
  }
  result.finalFeedback = finalFeedback;
  result.next = parseWith(next, isPracticeQuestionPayload);
  return result;
}

export function parseNativeAttemptResult(
  value: unknown,
  expectedCycleId?: string,
): NativeAttemptResult {
  if (
    !isRecord(value) ||
    value.mode !== 'native' ||
    !isNativeLanguage(value.nativeLanguage) ||
    !isUuid(value.cycleId) ||
    (expectedCycleId !== undefined && value.cycleId !== expectedCycleId) ||
    typeof value.understood !== 'boolean' ||
    !isNumber(value.attemptNo) ||
    !Number.isInteger(value.attemptNo) ||
    value.attemptNo < 1 ||
    value.attemptNo > PRACTICE_MAX_ATTEMPTS ||
    !isNumber(value.attemptsLeft) ||
    !Number.isInteger(value.attemptsLeft) ||
    value.attemptsLeft < 0 ||
    value.attemptsLeft > PRACTICE_MAX_ATTEMPTS ||
    !isBoundedString(value.transcript, 12_000) ||
    !isBoundedString(value.translatedTranscript, 12_000) ||
    !isBoundedString(value.modelAnswer, 800) ||
    !isBoundedNonEmptyString(value.feedback, 800) ||
    (value.recordingId !== undefined && !isUuid(value.recordingId))
  ) {
    throw new ContractError();
  }
  const noSpeech = value.noSpeech === true;
  if (value.noSpeech !== undefined && value.noSpeech !== true) throw new ContractError();
  if (noSpeech) {
    if (
      value.understood ||
      value.transcript !== '' ||
      value.translatedTranscript !== '' ||
      value.modelAnswer !== '' ||
      value.next !== undefined ||
      value.attemptsLeft !== PRACTICE_MAX_ATTEMPTS - (value.attemptNo - 1)
    ) {
      throw new ContractError();
    }
  } else if (
    !isBoundedNonEmptyString(value.transcript, 12_000) ||
    !isBoundedNonEmptyString(value.translatedTranscript, 12_000) ||
    !isBoundedNonEmptyString(value.modelAnswer, 800) ||
    value.attemptsLeft !== PRACTICE_MAX_ATTEMPTS - value.attemptNo ||
    (value.attemptsLeft === 0) !== (value.next !== undefined)
  ) {
    throw new ContractError();
  }
  const result: NativeAttemptResult = {
    mode: 'native',
    nativeLanguage: value.nativeLanguage,
    cycleId: value.cycleId,
    understood: value.understood,
    attemptNo: value.attemptNo,
    attemptsLeft: value.attemptsLeft,
    transcript: value.transcript,
    translatedTranscript: value.translatedTranscript,
    modelAnswer: value.modelAnswer,
    feedback: value.feedback,
    ...(noSpeech ? { noSpeech: true } : {}),
    ...(value.recordingId === undefined ? {} : { recordingId: value.recordingId }),
  };
  if (value.next !== undefined) result.next = parseWith(value.next, isPracticeQuestionPayload);
  return result;
}

/** Server timestamps are ISO-8601 strings; anything unparseable is contract drift. */
function isTimestamp(value: unknown): value is string {
  return isBoundedNonEmptyString(value, 64) && !Number.isNaN(Date.parse(value));
}

function isRecordingStatus(value: unknown): value is RecordingStatus {
  return value === 'retention_pending' || value === 'available' || value === 'unavailable';
}

export function parsePracticeStats(value: unknown): PracticeStats {
  if (!isRecord(value)) throw new ContractError();
  const level = value.level;
  const rawProgress = value.progress;
  if (!isRecord(rawProgress)) throw new ContractError();
  const masteredCount = rawProgress.masteredCount;
  const learningCount = rawProgress.learningCount;
  const totalAtLevel = rawProgress.totalAtLevel;
  const dueCount = rawProgress.dueCount;
  const streakDays = value.streakDays;
  const practicedToday = value.practicedToday;
  const totalAttempts = value.totalAttempts;
  const lastPracticedAt = value.lastPracticedAt;
  if (
    !(isCefrLevel(level) || level === null) ||
    !isWordBankCount(masteredCount) ||
    !isWordBankCount(learningCount) ||
    !isWordBankCount(totalAtLevel) ||
    // Stats were born after SRS, so dueCount is required here.
    !isWordBankCount(dueCount) ||
    masteredCount + learningCount > totalAtLevel ||
    dueCount > masteredCount + learningCount ||
    !isLifetimeCount(streakDays) ||
    !isLifetimeCount(practicedToday) ||
    !isLifetimeCount(totalAttempts) ||
    // Today's attempts are a subset of all attempts.
    practicedToday > totalAttempts ||
    (lastPracticedAt !== null && !isTimestamp(lastPracticedAt))
  ) {
    throw new ContractError();
  }
  // Before placement the server intentionally answers level: null with the
  // all-zero progress snapshot (there is no level to count words against);
  // exactly that shape may carry a null level. A placed level always has at
  // least one question, so totalAtLevel 0 stays contract drift there.
  if (level === null) {
    // With nonnegative counts plus the consistency bounds above, total zero
    // necessarily forces mastered, learning, and due to zero as well.
    if (totalAtLevel !== 0) throw new ContractError();
  } else if (totalAtLevel < 1) {
    throw new ContractError();
  }
  return {
    level,
    progress: {
      masteredCount,
      learningCount,
      totalAtLevel,
      dueCount,
    },
    streakDays,
    practicedToday,
    totalAttempts,
    lastPracticedAt,
  };
}

export const HISTORY_PAGE_LIMIT = 20;
const HISTORY_MAX_PAGE_ITEMS = 50;
const DIAGNOSTIC_MAX_ATTEMPTS = 5;

function parseHistoryItem(value: unknown): HistoryItem {
  if (!isRecord(value)) throw new ContractError();
  const context = value.context;
  const nativeLanguage = value.nativeLanguage;
  const cycleId = value.cycleId;
  const attemptNo = value.attemptNo;
  const score = value.score;
  const passed = value.passed;
  const understood = value.understood;
  const translatedTranscript = value.translatedTranscript;
  const modelAnswer = value.modelAnswer;
  const recordingId = value.recordingId;
  const recordingStatus = value.recordingStatus;
  if (
    !isUuid(value.id) ||
    !isUuid(value.questionId) ||
    !isBoundedNonEmptyString(value.promptWord, 100) ||
    !isBoundedNonEmptyString(value.questionText, 1_000) ||
    !isCefrLevel(value.cefrLevel) ||
    (context !== 'diagnostic' && context !== 'practice' && context !== 'practice-native') ||
    !isNumber(attemptNo) ||
    !Number.isSafeInteger(attemptNo) ||
    attemptNo < 1 ||
    attemptNo > (context === 'diagnostic' ? DIAGNOSTIC_MAX_ATTEMPTS : PRACTICE_MAX_ATTEMPTS) ||
    !isBoundedString(value.transcript, 12_000) ||
    !isBoundedNonEmptyString(value.feedback, 4_000) ||
    !isTimestamp(value.createdAt) ||
    !(
      (recordingId === null && recordingStatus === null) ||
      (isUuid(recordingId) && isRecordingStatus(recordingStatus)) ||
      (recordingId === undefined && recordingStatus === undefined)
    )
  ) {
    throw new ContractError();
  }
  if (context === 'practice-native') {
    if (
      !isUuid(cycleId) ||
      !isNativeLanguage(nativeLanguage) ||
      score !== null ||
      passed !== null ||
      typeof understood !== 'boolean' ||
      !isBoundedNonEmptyString(value.transcript, 12_000) ||
      !isBoundedNonEmptyString(translatedTranscript, 12_000) ||
      !isBoundedNonEmptyString(modelAnswer, 800)
    ) {
      throw new ContractError();
    }
  } else {
    if (
      !isScore(score) ||
      typeof passed !== 'boolean' ||
      passed !== score >= PRACTICE_PASS_SCORE ||
      understood !== null ||
      translatedTranscript !== null ||
      modelAnswer !== null ||
      nativeLanguage !== null ||
      (context === 'practice' ? !isUuid(cycleId) : cycleId !== null)
    ) {
      throw new ContractError();
    }
  }
  return {
    id: value.id,
    questionId: value.questionId,
    promptWord: value.promptWord,
    questionText: value.questionText,
    cefrLevel: value.cefrLevel,
    context,
    nativeLanguage: nativeLanguage as NativeLanguage | null,
    cycleId: cycleId as string | null,
    attemptNo: attemptNo as number,
    score: score as number | null,
    passed: passed as boolean | null,
    understood: understood as boolean | null,
    transcript: value.transcript,
    translatedTranscript: translatedTranscript as string | null,
    modelAnswer: modelAnswer as string | null,
    feedback: value.feedback,
    createdAt: value.createdAt,
    ...(recordingId === undefined ? {} : { recordingId, recordingStatus }),
  };
}

export function parsePracticeHistory(value: unknown): HistoryPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    value.items.length > HISTORY_MAX_PAGE_ITEMS ||
    (value.nextCursor !== null && !isUuid(value.nextCursor))
  ) {
    throw new ContractError();
  }
  // An empty page must be the last page, or paging would spin forever.
  if (value.items.length === 0 && value.nextCursor !== null) throw new ContractError();
  return {
    items: value.items.map(parseHistoryItem),
    nextCursor: value.nextCursor,
  };
}

const RECORDING_MAX_PAGE_ITEMS = 500;

export function parseRecordingItem(value: unknown): RecordingItem {
  if (!isRecord(value)) throw new ContractError();
  const context = value.context;
  const durationMs = value.durationMs;
  const status = value.status;
  const availableAt = value.availableAt;
  if (
    !isUuid(value.id) ||
    !isUuid(value.questionId) ||
    (context !== 'diagnostic' && context !== 'practice' && context !== 'practice-native') ||
    !isBoundedNonEmptyString(value.promptWord, 100) ||
    !isBoundedNonEmptyString(value.questionText, 1_000) ||
    !isCefrLevel(value.cefrLevel) ||
    !isBoundedNonEmptyString(value.contentType, 128) ||
    !isNumber(value.sizeBytes) ||
    !Number.isSafeInteger(value.sizeBytes) ||
    value.sizeBytes < 1 ||
    value.sizeBytes > 25 * 1024 * 1024 ||
    !(
      durationMs === null ||
      (isNumber(durationMs) &&
        Number.isSafeInteger(durationMs) &&
        durationMs >= 500 &&
        durationMs <= 120_500)
    ) ||
    !isRecordingStatus(status) ||
    !isTimestamp(value.createdAt) ||
    !(
      (status === 'available' && isTimestamp(availableAt)) ||
      (status !== 'available' && availableAt === null)
    )
  ) {
    throw new ContractError();
  }
  return {
    id: value.id,
    questionId: value.questionId,
    context,
    promptWord: value.promptWord,
    questionText: value.questionText,
    cefrLevel: value.cefrLevel,
    contentType: value.contentType,
    sizeBytes: value.sizeBytes,
    durationMs,
    status,
    createdAt: value.createdAt,
    availableAt,
  };
}

export function parseRecordingPage(value: unknown): RecordingPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.items) ||
    // Shares the history page ceiling: the server accepts limit <= 50 for
    // both list endpoints and only ever issues 20.
    value.items.length > HISTORY_MAX_PAGE_ITEMS ||
    (value.nextCursor !== null && !isUuid(value.nextCursor)) ||
    (value.items.length === 0 && value.nextCursor !== null)
  ) {
    throw new ContractError();
  }
  return { items: value.items.map(parseRecordingItem), nextCursor: value.nextCursor };
}

export function parseRecordingExportPage(value: unknown): RecordingExportPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.recordings) ||
    value.recordings.length > RECORDING_MAX_PAGE_ITEMS ||
    (value.nextCursor !== null && !isUuid(value.nextCursor)) ||
    (value.recordings.length === 0 && value.nextCursor !== null)
  ) {
    throw new ContractError();
  }
  const recordings = value.recordings.map((recording): RecordingExportItem => {
    const parsed = parseRecordingItem(recording);
    if (!isRecord(recording) || !isUuid(recording.requestId)) throw new ContractError();
    if (recording.attemptId !== null && !isUuid(recording.attemptId)) throw new ContractError();
    return { ...parsed, requestId: recording.requestId, attemptId: recording.attemptId };
  });
  return { recordings, nextCursor: value.nextCursor };
}

const EXPORT_MAX_PAGE_ITEMS = 500;

export function parseUserDataPage(value: unknown): UserDataPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.attempts) ||
    !Array.isArray(value.practiceProgress) ||
    !Array.isArray(value.practiceCycles) ||
    value.attempts.length > EXPORT_MAX_PAGE_ITEMS ||
    value.practiceCycles.length > EXPORT_MAX_PAGE_ITEMS ||
    (value.diagnosticState !== null && !isRecord(value.diagnosticState)) ||
    (value.nextCursor !== null && !isUuid(value.nextCursor)) ||
    (value.nextPracticeCycleCursor !== null && !isUuid(value.nextPracticeCycleCursor)) ||
    typeof value.attemptsDone !== 'boolean' ||
    typeof value.practiceCyclesDone !== 'boolean' ||
    (value.attempts.length === 0 && value.nextCursor !== null) ||
    (value.practiceCycles.length === 0 && value.nextPracticeCycleCursor !== null) ||
    value.attemptsDone !== (value.nextCursor === null) ||
    value.practiceCyclesDone !== (value.nextPracticeCycleCursor === null)
  ) {
    throw new ContractError();
  }
  const parseRows = (rows: unknown[]): Record<string, unknown>[] =>
    rows.map((row) => {
      // Rows are exported verbatim, but they must at least be JSON objects.
      if (!isRecord(row)) throw new ContractError();
      return row;
    });
  return {
    user: parseUser(value.user),
    attempts: parseRows(value.attempts),
    practiceProgress: parseRows(value.practiceProgress),
    practiceCycles: parseRows(value.practiceCycles),
    diagnosticState: value.diagnosticState,
    nextCursor: value.nextCursor,
    nextPracticeCycleCursor: value.nextPracticeCycleCursor,
    attemptsDone: value.attemptsDone,
    practiceCyclesDone: value.practiceCyclesDone,
  };
}

export type AudioUploadGrant =
  | { mode: 'direct'; assessmentEndpoint: AssessmentEndpoint }
  | {
      mode: 's3';
      assessmentEndpoint: AssessmentEndpoint;
      uploadUrl: string;
      uploadFields: Record<string, string>;
      audioKey: string;
      contentType: string;
      expiresIn: number;
      maxBytes: number;
    };

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

// Every content type the API can issue an S3 grant for, with the canonical
// audio-key extension the server derives for it (first allowlisted extension
// wins, so e.g. audio/mp4 maps to .m4a). Mirrors AUDIO_TYPES +
// contentTypeToExt in server/src/upload.ts and server/src/audio-upload.ts.
const AUDIO_CONTENT_TYPE_TO_EXT: Readonly<Record<string, string>> = {
  'audio/m4a': 'm4a',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'video/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'application/ogg': 'ogg',
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
};

// The server only ever issues AWS S3 presigned POSTs, so the upload
// destination must be a genuine AWS S3 host (e.g.
// <bucket>.s3.<region>.amazonaws.com); otherwise a compromised API could
// redirect the microphone recording anywhere. S3-compatible non-AWS providers
// would need this pin relaxed to their own hostnames.
function isAwsS3Hostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const suffix = '.amazonaws.com';
  if (!host.endsWith(suffix)) return false;
  const endpoint = host.slice(0, -suffix.length);
  const region = '[a-z]{2}(?:-[a-z0-9]+)+-[0-9]';
  const bucket = '[a-z0-9](?:[a-z0-9.-]{1,61}[a-z0-9])?';
  return new RegExp(`^(?:${bucket}\\.)?s3(?:\\.(?:dualstack\\.)?${region}|-${region})?$`).test(
    endpoint,
  );
}

function safeUploadUrl(value: string): boolean {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      isAwsS3Hostname(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function safePlaybackUrl(value: string, expiresIn: number): boolean {
  if (value.length > 16_384) return false;
  try {
    const url = new URL(value);
    const signedExpiry = Number(url.searchParams.get('X-Amz-Expires'));
    return (
      url.protocol === 'https:' &&
      isAwsS3Hostname(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.hash &&
      url.searchParams.get('X-Amz-Algorithm') === 'AWS4-HMAC-SHA256' &&
      isNonEmptyString(url.searchParams.get('X-Amz-Credential')) &&
      isNonEmptyString(url.searchParams.get('X-Amz-Date')) &&
      isNonEmptyString(url.searchParams.get('X-Amz-SignedHeaders')) &&
      isNonEmptyString(url.searchParams.get('X-Amz-Signature')) &&
      Number.isSafeInteger(signedExpiry) &&
      signedExpiry === expiresIn
    );
  } catch {
    return false;
  }
}

export function parseRecordingPlaybackGrant(
  value: unknown,
  expectedRecordingId?: string,
): RecordingPlaybackGrant {
  if (!isRecord(value)) throw new ContractError();
  const recordingId = value.recordingId;
  const playbackUrl = value.playbackUrl;
  const expiresIn = value.expiresIn;
  const contentType = value.contentType;
  if (
    !isUuid(recordingId) ||
    (expectedRecordingId !== undefined && recordingId !== expectedRecordingId) ||
    !isNumber(expiresIn) ||
    !Number.isSafeInteger(expiresIn) ||
    expiresIn < 30 ||
    expiresIn > 300 ||
    !isBoundedNonEmptyString(playbackUrl, 16_384) ||
    !safePlaybackUrl(playbackUrl, expiresIn) ||
    !isBoundedNonEmptyString(contentType, 128)
  ) {
    throw new ContractError();
  }
  return { recordingId, playbackUrl, expiresIn, contentType };
}

function safeAudioKey(value: string): boolean {
  return /^audio-uploads\/(diagnostic|practice)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(m4a|mp3|wav|ogg|webm|flac)$/i.test(
    value,
  );
}

export function audioKeyBelongsToOwner(audioKey: string, ownerId: string): boolean {
  // This helper is exported and sits on a security boundary. Fail closed when
  // JavaScript callers bypass its TypeScript signature with string-like values.
  if (typeof audioKey !== 'string' || typeof ownerId !== 'string') return false;
  return safeAudioKey(audioKey) && audioKey.split('/')[2]!.toLowerCase() === ownerId.toLowerCase();
}

export function audioKeyMatchesAssessmentEndpoint(
  audioKey: string,
  endpoint: AssessmentEndpoint,
): boolean {
  if (typeof audioKey !== 'string' || typeof endpoint !== 'string' || !safeAudioKey(audioKey)) {
    return false;
  }
  let expectedScope: 'diagnostic' | 'practice';
  if (endpoint === '/diagnostic/answer') {
    expectedScope = 'diagnostic';
  } else if (endpoint === '/practice/attempt' || endpoint === '/practice/attempt/native') {
    expectedScope = 'practice';
  } else {
    return false;
  }
  return audioKey.split('/')[1]!.toLowerCase() === expectedScope;
}

function parseUploadFields(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length < 2 || entries.length > 32) return null;
  let totalLength = 0;
  // Never let Object.prototype supply a required signed form field when the
  // runtime has been polluted. Consumers use normal property reads afterward,
  // so the normalized record itself must have no prototype.
  const parsed = Object.create(null) as Record<string, string>;
  for (const [key, fieldValue] of entries) {
    if (
      !/^[A-Za-z0-9_.-]{1,128}$/.test(key) ||
      key.toLowerCase() === 'file' ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype' ||
      !isNonEmptyString(fieldValue) ||
      fieldValue.length > 8192
    ) {
      return null;
    }
    totalLength += key.length + fieldValue.length;
    if (totalLength > 32_768) return null;
    parsed[key] = fieldValue;
  }
  return parsed;
}

export function parseAudioUploadGrant(value: unknown): AudioUploadGrant {
  if (!isRecord(value)) throw new ContractError();
  const mode = value.mode;
  const assessmentEndpoint = value.assessmentEndpoint;
  if (
    assessmentEndpoint !== '/diagnostic/answer' &&
    assessmentEndpoint !== '/practice/attempt' &&
    assessmentEndpoint !== '/practice/attempt/native'
  ) {
    throw new ContractError();
  }
  if (mode === 'direct') return { mode: 'direct', assessmentEndpoint };
  const uploadUrl = value.uploadUrl;
  const rawUploadFields = value.uploadFields;
  const audioKey = value.audioKey;
  const contentType = value.contentType;
  const expiresIn = value.expiresIn;
  const maxBytes = value.maxBytes;
  const uploadFields = parseUploadFields(rawUploadFields);
  const audioKeyExt = isNonEmptyString(contentType)
    ? AUDIO_CONTENT_TYPE_TO_EXT[contentType]
    : undefined;
  if (
    mode === 's3' &&
    isNonEmptyString(uploadUrl) &&
    safeUploadUrl(uploadUrl) &&
    isNonEmptyString(audioKey) &&
    safeAudioKey(audioKey) &&
    audioKeyMatchesAssessmentEndpoint(audioKey, assessmentEndpoint) &&
    uploadFields !== null &&
    Object.hasOwn(uploadFields, 'key') &&
    uploadFields.key === audioKey &&
    audioKeyExt !== undefined &&
    audioKey.toLowerCase().endsWith(`.${audioKeyExt}`) &&
    Object.hasOwn(uploadFields, 'Content-Type') &&
    uploadFields['Content-Type'] === contentType &&
    isNumber(expiresIn) &&
    Number.isInteger(expiresIn) &&
    expiresIn >= 60 &&
    expiresIn <= 3600 &&
    isNumber(maxBytes) &&
    Number.isInteger(maxBytes) &&
    maxBytes > 0 &&
    maxBytes <= MAX_AUDIO_BYTES
  ) {
    return {
      mode: 's3',
      assessmentEndpoint,
      uploadUrl,
      uploadFields,
      audioKey,
      contentType,
      expiresIn,
      maxBytes,
    };
  }
  throw new ContractError();
}
