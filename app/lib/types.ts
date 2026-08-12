export type NativeLanguage = 'te' | 'hi' | 'es' | 'zh';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

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

export interface AttemptResult {
  passed: boolean;
  attemptNo: number;
  attemptsLeft?: number;
  score: number;
  transcript: string;
  feedback: string;
  finalFeedback?: string;
  nextQuestion?: Question;
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
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isScore(value: unknown): value is number {
  return isNumber(value) && value >= 0 && value <= 100;
}

function isQuestion(value: unknown): value is Question {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isCefrLevel(value.cefrLevel) &&
    isNonEmptyString(value.promptWord) &&
    isNonEmptyString(value.questionText)
  );
}

function parseWith<T>(
  value: unknown,
  predicate: (value: unknown) => value is T,
): T {
  if (!predicate(value)) throw new ContractError();
  return value;
}

export function parseUser(value: unknown): User {
  return parseWith(value, (candidate): candidate is User => {
    if (!isRecord(candidate)) return false;
    return (
      isUuid(candidate.id) &&
      isNonEmptyString(candidate.name) &&
      isNonEmptyString(candidate.email) &&
      isNativeLanguage(candidate.nativeLanguage) &&
      (candidate.cefrLevel === null || isCefrLevel(candidate.cefrLevel)) &&
      typeof candidate.diagnosticCompleted === 'boolean'
    );
  });
}

export function parseAuthResponse(
  value: unknown,
): { token: string; user: User } {
  if (!isRecord(value) || !isNonEmptyString(value.token)) {
    throw new ContractError();
  }
  return { token: value.token, user: parseUser(value.user) };
}

export function parseUserResponse(value: unknown): { user: User } {
  if (!isRecord(value)) throw new ContractError();
  return { user: parseUser(value.user) };
}

export function parseQuestionResponse(value: unknown): { question: Question } {
  if (!isRecord(value)) throw new ContractError();
  return { question: parseWith(value.question, isQuestion) };
}

export function parseDiagnosticNext(value: unknown): DiagnosticNext {
  if (!isRecord(value) || typeof value.done !== 'boolean') {
    throw new ContractError();
  }
  if (value.done) {
    if (!isCefrLevel(value.level)) throw new ContractError();
    return { done: true, level: value.level };
  }
  if (
    !isRecord(value.progress) ||
    !isNumber(value.progress.asked) ||
    !Number.isInteger(value.progress.asked) ||
    value.progress.asked < 0 ||
    !isNumber(value.progress.maxQuestions) ||
    !Number.isInteger(value.progress.maxQuestions) ||
    value.progress.maxQuestions < 1 ||
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

export function parseDiagnosticAnswerResult(
  value: unknown,
): DiagnosticAnswerResult {
  if (
    !isRecord(value) ||
    typeof value.passed !== 'boolean' ||
    !isScore(value.score) ||
    !isString(value.transcript) ||
    !isNonEmptyString(value.feedback) ||
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
    if (!isCefrLevel(value.level)) throw new ContractError();
    result.level = value.level;
  } else {
    if (value.nextQuestion === undefined) throw new ContractError();
    result.nextQuestion = parseWith(value.nextQuestion, isQuestion);
  }
  return result;
}

export function parseHelpContent(value: unknown): HelpContent {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.promptWord) ||
    !isNonEmptyString(value.promptWordNative) ||
    !isNonEmptyString(value.questionText) ||
    !isNonEmptyString(value.questionTextNative) ||
    !Array.isArray(value.examples) ||
    value.examples.length === 0
  ) {
    throw new ContractError();
  }
  const examples = value.examples.map((example) => {
    if (
      !isRecord(example) ||
      !isNonEmptyString(example.en) ||
      !isNonEmptyString(example.native)
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
    !isNumber(value.attemptNo) ||
    !Number.isInteger(value.attemptNo) ||
    value.attemptNo < 1 ||
    value.attemptNo > 3 ||
    !isScore(value.score) ||
    !isString(value.transcript) ||
    !isNonEmptyString(value.feedback)
  ) {
    throw new ContractError();
  }
  const result: AttemptResult = {
    passed: value.passed,
    attemptNo: value.attemptNo,
    score: value.score,
    transcript: value.transcript,
    feedback: value.feedback,
  };
  if (value.attemptsLeft !== undefined) {
    if (
      !isNumber(value.attemptsLeft) ||
      !Number.isInteger(value.attemptsLeft) ||
      value.attemptsLeft < 0 ||
      value.attemptsLeft > 2
    ) {
      throw new ContractError();
    }
    result.attemptsLeft = value.attemptsLeft;
  }
  if (value.finalFeedback !== undefined) {
    if (!isNonEmptyString(value.finalFeedback)) throw new ContractError();
    result.finalFeedback = value.finalFeedback;
  }
  if (value.nextQuestion !== undefined) {
    result.nextQuestion = parseWith(value.nextQuestion, isQuestion);
  }
  return result;
}

export type AudioUploadGrant =
  | { mode: "direct" }
  | { mode: "s3"; uploadUrl: string; audioKey: string; expiresIn: number };

export function parseAudioUploadGrant(value: unknown): AudioUploadGrant {
  if (!isRecord(value)) throw new ContractError();
  if (value.mode === "direct") return { mode: "direct" };
  if (
    value.mode === "s3" &&
    isNonEmptyString(value.uploadUrl) &&
    isNonEmptyString(value.audioKey) &&
    isNumber(value.expiresIn)
  ) {
    return {
      mode: "s3",
      uploadUrl: value.uploadUrl,
      audioKey: value.audioKey,
      expiresIn: value.expiresIn,
    };
  }
  throw new ContractError();
}
