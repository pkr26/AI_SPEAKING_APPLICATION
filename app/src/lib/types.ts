export type NativeLanguage = 'te' | 'hi' | 'es' | 'zh';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** CEFR levels in promotion order; level-up responses move one step right. */
export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export interface User {
  id: string;
  name: string;
  email: string;
  nativeLanguage: NativeLanguage;
  cefrLevel: CefrLevel | null;
  diagnosticCompleted: boolean;
}

export interface Question {
  id: string;
  cefrLevel: CefrLevel;
  promptWord: string;
  questionText: string;
}

export type DiagnosticNext =
  | {
      done: false;
      question: Question;
      progress: { asked: number; maxQuestions: number };
    }
  | { done: true; level: CefrLevel };

export interface DiagnosticAnswerResult {
  passed: boolean;
  score: number;
  transcript: string;
  feedback: string;
  done: boolean;
  level?: CefrLevel;
  nextQuestion?: Question;
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
}

export interface AttemptResult {
  passed: boolean;
  mastered: boolean;
  attemptNo: number;
  attemptsLeft?: number;
  noSpeech?: boolean;
  score: number;
  transcript: string;
  feedback: string;
  finalFeedback?: string;
  next?: PracticeQuestionPayload;
  levelUp?: LevelUp;
}

export interface PracticeStats {
  level: CefrLevel;
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

export type HistoryContext = 'diagnostic' | 'practice';

export interface HistoryItem {
  id: string;
  questionId: string;
  promptWord: string;
  questionText: string;
  cefrLevel: CefrLevel;
  context: HistoryContext;
  attemptNo: number;
  score: number;
  passed: boolean;
  transcript: string;
  feedback: string;
  createdAt: string;
}

export interface HistoryPage {
  items: HistoryItem[];
  nextCursor: string | null;
}

/** One page of the GET /auth/me/data export. Attempt rows are passed through
 * verbatim so the exported file keeps full server fidelity. */
export interface UserDataPage {
  user: User;
  attempts: Record<string, unknown>[];
  nextCursor: string | null;
}

export interface NativeAttemptResult {
  mode: 'native';
  understood: boolean;
  transcript: string;
  modelAnswer: string;
  feedback: string;
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
  return typeof value === 'number' && Number.isFinite(value);
}

function isNativeLanguage(value: unknown): value is NativeLanguage {
  return value === 'te' || value === 'hi' || value === 'es' || value === 'zh';
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
  return (
    isString(value) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
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

export function parseUser(value: unknown): User {
  return parseWith(value, (candidate): candidate is User => {
    if (!isRecord(candidate)) return false;
    return (
      isUuid(candidate.id) &&
      isBoundedNonEmptyString(candidate.name, 100) &&
      isBoundedNonEmptyString(candidate.email, 254) &&
      isNativeLanguage(candidate.nativeLanguage) &&
      (candidate.cefrLevel === null || isCefrLevel(candidate.cefrLevel)) &&
      typeof candidate.diagnosticCompleted === 'boolean'
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

function isCount(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value >= 0 && value <= 100_000;
}

function isPracticeProgress(value: unknown): value is PracticeProgress {
  return (
    isRecord(value) &&
    isCount(value.masteredCount) &&
    isCount(value.learningCount) &&
    isCount(value.totalAtLevel) &&
    value.totalAtLevel >= 1 &&
    value.masteredCount + value.learningCount <= value.totalAtLevel &&
    // Additive SRS field: absent on older servers, and never larger than the
    // learning+mastered rows it counts due entries of.
    (value.dueCount === undefined ||
      (isCount(value.dueCount) && value.dueCount <= value.masteredCount + value.learningCount))
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
  return (
    isRecord(value) &&
    isPracticeKind(value.kind) &&
    isPracticeProgress(value.progress) &&
    isQuestion(value.question)
  );
}

export function parsePracticeQuestion(value: unknown): PracticeQuestionPayload {
  return parseWith(value, isPracticeQuestionPayload);
}

export function parseDiagnosticNext(value: unknown): DiagnosticNext {
  if (!isRecord(value) || typeof value.done !== 'boolean') {
    throw new ContractError();
  }
  if (value.done) {
    if (!isCefrLevel(value.level) || value.question !== undefined || value.progress !== undefined) {
      throw new ContractError();
    }
    return { done: true, level: value.level };
  }
  if (
    value.level !== undefined ||
    !isRecord(value.progress) ||
    !isNumber(value.progress.asked) ||
    !Number.isInteger(value.progress.asked) ||
    value.progress.asked < 0 ||
    !isNumber(value.progress.maxQuestions) ||
    !Number.isInteger(value.progress.maxQuestions) ||
    value.progress.maxQuestions < 1 ||
    value.progress.maxQuestions > 100 ||
    value.progress.asked >= value.progress.maxQuestions
  ) {
    throw new ContractError();
  }
  return {
    done: false,
    question: parseWith(value.question, isQuestion),
    progress: {
      asked: value.progress.asked,
      maxQuestions: value.progress.maxQuestions,
    },
  };
}

export function parseDiagnosticAnswerResult(value: unknown): DiagnosticAnswerResult {
  if (
    !isRecord(value) ||
    typeof value.passed !== 'boolean' ||
    !isScore(value.score) ||
    !isBoundedString(value.transcript, 12_000) ||
    !isBoundedNonEmptyString(value.feedback, 800) ||
    typeof value.done !== 'boolean'
  ) {
    throw new ContractError();
  }
  const result: DiagnosticAnswerResult = {
    passed: value.passed,
    score: value.score,
    transcript: value.transcript,
    feedback: value.feedback,
    done: value.done,
  };
  if (value.done) {
    if (!isCefrLevel(value.level) || value.nextQuestion !== undefined) {
      throw new ContractError();
    }
    result.level = value.level;
  } else {
    if (value.level !== undefined || value.nextQuestion === undefined) {
      throw new ContractError();
    }
    result.nextQuestion = parseWith(value.nextQuestion, isQuestion);
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

export function parseAttemptResult(value: unknown): AttemptResult {
  if (
    !isRecord(value) ||
    typeof value.passed !== 'boolean' ||
    typeof value.mastered !== 'boolean' ||
    !isNumber(value.attemptNo) ||
    !Number.isInteger(value.attemptNo) ||
    value.attemptNo < 1 ||
    value.attemptNo > PRACTICE_MAX_ATTEMPTS ||
    !isScore(value.score) ||
    !isBoundedString(value.transcript, 12_000) ||
    !isBoundedNonEmptyString(value.feedback, 800)
  ) {
    throw new ContractError();
  }
  const result: AttemptResult = {
    passed: value.passed,
    mastered: value.mastered,
    attemptNo: value.attemptNo,
    score: value.score,
    transcript: value.transcript,
    feedback: value.feedback,
  };

  // These flags are derived by the server, not independent model output.
  // Reject an impossible combination instead of rendering misleading mastery
  // state from a corrupted or incompatible response.
  if (
    value.passed !== value.score >= PRACTICE_PASS_SCORE ||
    value.mastered !== value.score >= PRACTICE_MASTER_SCORE
  ) {
    throw new ContractError();
  }

  // A level promotion can only be earned by the attempt that mastered a word.
  if (value.levelUp !== undefined && !value.mastered) throw new ContractError();

  // Silence is a free retry: nothing was scored and the attempt counter did
  // not advance, so attemptsLeft reflects one more attempt than a real miss.
  if (value.noSpeech !== undefined) {
    if (
      value.noSpeech !== true ||
      value.passed ||
      value.mastered ||
      value.score !== 0 ||
      value.transcript !== '' ||
      value.finalFeedback !== undefined ||
      value.next !== undefined ||
      value.attemptsLeft !== PRACTICE_MAX_ATTEMPTS - (value.attemptNo - 1)
    ) {
      throw new ContractError();
    }
    result.noSpeech = true;
    result.attemptsLeft = value.attemptsLeft as number;
    return result;
  }

  // The server turns an empty Whisper transcript into the explicit free-retry
  // variant above. A scored response can therefore never have no transcript.
  if (!isNonEmptyString(value.transcript)) throw new ContractError();

  if (value.passed) {
    if (
      value.attemptsLeft !== undefined ||
      value.finalFeedback !== undefined ||
      value.next === undefined
    ) {
      throw new ContractError();
    }
    result.next = parseWith(value.next, isPracticeQuestionPayload);
    if (value.levelUp !== undefined) {
      const levelUp = parseWith(value.levelUp, isLevelUp);
      // The promotion response already serves the next question and progress
      // from the new level; a mismatch would desync the whole practice UI.
      if (result.next.question.cefrLevel !== levelUp.to) throw new ContractError();
      result.levelUp = levelUp;
    }
    return result;
  }

  if (value.attemptNo < PRACTICE_MAX_ATTEMPTS) {
    const expectedAttemptsLeft = PRACTICE_MAX_ATTEMPTS - value.attemptNo;
    if (
      value.attemptsLeft !== expectedAttemptsLeft ||
      value.finalFeedback !== undefined ||
      value.next !== undefined
    ) {
      throw new ContractError();
    }
    result.attemptsLeft = expectedAttemptsLeft;
    return result;
  }

  if (
    value.attemptsLeft !== 0 ||
    !isBoundedNonEmptyString(value.finalFeedback, 4_000) ||
    value.next === undefined
  ) {
    throw new ContractError();
  }
  result.attemptsLeft = 0;
  result.finalFeedback = value.finalFeedback;
  result.next = parseWith(value.next, isPracticeQuestionPayload);
  return result;
}

export function parseNativeAttemptResult(value: unknown): NativeAttemptResult {
  if (
    !isRecord(value) ||
    value.mode !== 'native' ||
    typeof value.understood !== 'boolean' ||
    !isBoundedString(value.transcript, 12_000) ||
    !isBoundedString(value.modelAnswer, 800) ||
    !isBoundedNonEmptyString(value.feedback, 800)
  ) {
    throw new ContractError();
  }
  const noSpeech = value.transcript === '';
  if (
    (noSpeech && (value.understood || value.modelAnswer !== '')) ||
    (!noSpeech &&
      (!isBoundedNonEmptyString(value.transcript, 12_000) ||
        !isBoundedNonEmptyString(value.modelAnswer, 800)))
  ) {
    throw new ContractError();
  }
  return {
    mode: 'native',
    understood: value.understood,
    transcript: value.transcript,
    modelAnswer: value.modelAnswer,
    feedback: value.feedback,
  };
}

/** Server timestamps are ISO-8601 strings; anything unparseable is contract drift. */
function isTimestamp(value: unknown): value is string {
  return isBoundedNonEmptyString(value, 64) && !Number.isNaN(Date.parse(value));
}

export function parsePracticeStats(value: unknown): PracticeStats {
  if (
    !isRecord(value) ||
    !isCefrLevel(value.level) ||
    !isRecord(value.progress) ||
    !isCount(value.progress.masteredCount) ||
    !isCount(value.progress.learningCount) ||
    !isCount(value.progress.totalAtLevel) ||
    value.progress.totalAtLevel < 1 ||
    value.progress.masteredCount + value.progress.learningCount > value.progress.totalAtLevel ||
    // Stats were born after SRS, so dueCount is required here.
    !isCount(value.progress.dueCount) ||
    value.progress.dueCount > value.progress.masteredCount + value.progress.learningCount ||
    !isCount(value.streakDays) ||
    !isCount(value.practicedToday) ||
    !isCount(value.totalAttempts) ||
    // Today's attempts are a subset of all attempts.
    value.practicedToday > value.totalAttempts ||
    (value.lastPracticedAt !== null && !isTimestamp(value.lastPracticedAt))
  ) {
    throw new ContractError();
  }
  return {
    level: value.level,
    progress: {
      masteredCount: value.progress.masteredCount,
      learningCount: value.progress.learningCount,
      totalAtLevel: value.progress.totalAtLevel,
      dueCount: value.progress.dueCount,
    },
    streakDays: value.streakDays,
    practicedToday: value.practicedToday,
    totalAttempts: value.totalAttempts,
    lastPracticedAt: value.lastPracticedAt,
  };
}

export const HISTORY_PAGE_LIMIT = 20;
const HISTORY_MAX_PAGE_ITEMS = 50;

function parseHistoryItem(value: unknown): HistoryItem {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isUuid(value.questionId) ||
    !isBoundedNonEmptyString(value.promptWord, 100) ||
    !isBoundedNonEmptyString(value.questionText, 1_000) ||
    !isCefrLevel(value.cefrLevel) ||
    (value.context !== 'diagnostic' && value.context !== 'practice') ||
    !isNumber(value.attemptNo) ||
    !Number.isInteger(value.attemptNo) ||
    // attemptNo ≤ 3 also bounds diagnostic history items; that stays safe only
    // because the server's diagnostic binary search converges within 3
    // questions (server MAX_QUESTIONS = 5, 6 CEFR levels). Revisit this bound
    // if either of those changes.
    value.attemptNo < 1 ||
    value.attemptNo > PRACTICE_MAX_ATTEMPTS ||
    !isScore(value.score) ||
    typeof value.passed !== 'boolean' ||
    !isBoundedString(value.transcript, 12_000) ||
    !isBoundedNonEmptyString(value.feedback, 4_000) ||
    !isTimestamp(value.createdAt)
  ) {
    throw new ContractError();
  }
  return {
    id: value.id,
    questionId: value.questionId,
    promptWord: value.promptWord,
    questionText: value.questionText,
    cefrLevel: value.cefrLevel,
    context: value.context,
    attemptNo: value.attemptNo,
    score: value.score,
    passed: value.passed,
    transcript: value.transcript,
    feedback: value.feedback,
    createdAt: value.createdAt,
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

const EXPORT_MAX_PAGE_ITEMS = 1_000;

export function parseUserDataPage(value: unknown): UserDataPage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.attempts) ||
    value.attempts.length > EXPORT_MAX_PAGE_ITEMS ||
    (value.nextCursor !== null && !isUuid(value.nextCursor)) ||
    (value.attempts.length === 0 && value.nextCursor !== null)
  ) {
    throw new ContractError();
  }
  const attempts = value.attempts.map((attempt) => {
    // Rows are exported verbatim, but they must at least be JSON objects.
    if (!isRecord(attempt)) throw new ContractError();
    return attempt;
  });
  return {
    user: parseUser(value.user),
    attempts,
    nextCursor: value.nextCursor,
  };
}

export type AudioUploadGrant =
  | { mode: 'direct' }
  | {
      mode: 's3';
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
// CONTENT_TYPE_TO_EXT in server/src/upload.ts and server/src/audio-upload.ts.
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

function safeAudioKey(value: string): boolean {
  return /^audio-uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(m4a|mp3|wav|ogg|webm|flac)$/i.test(
    value,
  );
}

export function audioKeyBelongsToOwner(audioKey: string, ownerId: string): boolean {
  return safeAudioKey(audioKey) && audioKey.split('/')[1]?.toLowerCase() === ownerId.toLowerCase();
}

function parseUploadFields(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.length < 2 || entries.length > 32) return null;
  let totalLength = 0;
  const parsed: Record<string, string> = {};
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
  if (value.mode === 'direct') return { mode: 'direct' };
  const uploadFields = parseUploadFields(value.uploadFields);
  const audioKeyExt = isNonEmptyString(value.contentType)
    ? AUDIO_CONTENT_TYPE_TO_EXT[value.contentType]
    : undefined;
  if (
    value.mode === 's3' &&
    isNonEmptyString(value.uploadUrl) &&
    safeUploadUrl(value.uploadUrl) &&
    isNonEmptyString(value.audioKey) &&
    safeAudioKey(value.audioKey) &&
    uploadFields !== null &&
    uploadFields.key === value.audioKey &&
    audioKeyExt !== undefined &&
    value.audioKey.toLowerCase().endsWith(`.${audioKeyExt}`) &&
    uploadFields['Content-Type'] === value.contentType &&
    isNumber(value.expiresIn) &&
    Number.isInteger(value.expiresIn) &&
    value.expiresIn >= 60 &&
    value.expiresIn <= 3600 &&
    isNumber(value.maxBytes) &&
    Number.isInteger(value.maxBytes) &&
    value.maxBytes > 0 &&
    value.maxBytes <= MAX_AUDIO_BYTES
  ) {
    return {
      mode: 's3',
      uploadUrl: value.uploadUrl,
      uploadFields,
      audioKey: value.audioKey,
      contentType: value.contentType,
      expiresIn: value.expiresIn,
      maxBytes: value.maxBytes,
    };
  }
  throw new ContractError();
}
