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

export function parseQuestionResponse(value: unknown): { question: Question } {
  if (!isRecord(value)) throw new ContractError();
  return { question: parseWith(value.question, isQuestion) };
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
    !isNumber(value.attemptNo) ||
    !Number.isInteger(value.attemptNo) ||
    value.attemptNo < 1 ||
    value.attemptNo > 3 ||
    !isScore(value.score) ||
    !isBoundedString(value.transcript, 12_000) ||
    !isBoundedNonEmptyString(value.feedback, 800)
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
  if (value.passed) {
    if (
      value.attemptsLeft !== undefined ||
      value.finalFeedback !== undefined ||
      value.nextQuestion === undefined
    ) {
      throw new ContractError();
    }
    result.nextQuestion = parseWith(value.nextQuestion, isQuestion);
    return result;
  }

  if (value.attemptNo < 3) {
    const expectedAttemptsLeft = 3 - value.attemptNo;
    if (
      value.attemptsLeft !== expectedAttemptsLeft ||
      value.finalFeedback !== undefined ||
      value.nextQuestion !== undefined
    ) {
      throw new ContractError();
    }
    result.attemptsLeft = expectedAttemptsLeft;
    return result;
  }

  if (
    value.attemptsLeft !== 0 ||
    !isBoundedNonEmptyString(value.finalFeedback, 4_000) ||
    value.nextQuestion === undefined
  ) {
    throw new ContractError();
  }
  result.attemptsLeft = 0;
  result.finalFeedback = value.finalFeedback;
  result.nextQuestion = parseWith(value.nextQuestion, isQuestion);
  return result;
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
const AUDIO_CONTENT_TYPES = new Set([
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
]);

function safeUploadUrl(value: string): boolean {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !!url.hostname &&
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
  return /^audio-uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(m4a|mp4|webm|wav)$/i.test(
    value,
  );
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
  if (
    value.mode === 's3' &&
    isNonEmptyString(value.uploadUrl) &&
    safeUploadUrl(value.uploadUrl) &&
    isNonEmptyString(value.audioKey) &&
    safeAudioKey(value.audioKey) &&
    uploadFields !== null &&
    uploadFields.key === value.audioKey &&
    isNonEmptyString(value.contentType) &&
    AUDIO_CONTENT_TYPES.has(value.contentType) &&
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
