// Hostile-server + fuzz adversarial audit for every exported response parser in
// src/lib/types.ts plus parsePendingAssessment from src/lib/pending-assessment.ts.
//
// Every corpus is generated from a deterministic seeded PRNG (mulberry32), so a
// failing iteration always reproduces from the seed printed in the test name or
// error context. The core invariant under attack: a parser either returns a
// value that matches its declared TypeScript shape or throws ContractError
// (parsePendingAssessment instead returns null) — never another crash, never a
// malformed value, never a hang (every loop here is bounded; Jest's own
// per-test timeout enforces the no-hang property).

import { parsePendingAssessment } from '../src/lib/pending-assessment';
import {
  audioKeyBelongsToOwner,
  audioKeyMatchesAssessmentEndpoint,
  ContractError,
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
  parseQuestion,
  parseRecordingExportPage,
  parseRecordingItem,
  parseRecordingPage,
  parseRecordingPlaybackGrant,
  parseUser,
  parseUserDataPage,
  parseUserResponse,
} from '../src/lib/types';

jest.setTimeout(30_000);

// Assertion self-count: the wrapper below counts every expect() invocation in
// this file and the trailing test at the very end of this file pins the exact
// total, so the suite fails if the deterministic corpora ever change shape
// silently. The pin must live in a regular test — not afterAll — because a
// self-count mismatch under a Stryker mutant has to fail inside a test for the
// kill to attribute to this file's test IDs; an afterAll failure is a
// suite-level error Stryker scores as RuntimeError, which the strict mutation
// gate rejects as unresolved.
const EXPECTED_ASSERTIONS = 21_909;
const originalExpect = expect;
let assertionCount = 0;

beforeAll(() => {
  (globalThis as unknown as { expect: typeof expect }).expect = ((...args: unknown[]) => {
    assertionCount += 1;
    return (originalExpect as (...rest: unknown[]) => unknown)(...args);
  }) as typeof expect;
});

afterAll(() => {
  (globalThis as unknown as { expect: typeof expect }).expect = originalExpect;
});

// ---------------------------------------------------------------------------
// Seeded PRNG and hostile value generators
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FUZZ_ITERATIONS = 600;

function pick(rng: () => number, values: readonly unknown[]): unknown {
  return values[Math.floor(rng() * values.length)]!;
}

// NaN / ±Infinity can never arrive through JSON.parse, so hostile servers
// would smuggle them another way; the fuzz feeds them as direct literals too.
const HOSTILE_NUMBERS: readonly unknown[] = [
  0,
  -0,
  1,
  -1,
  2,
  3,
  4,
  59,
  60,
  61,
  74,
  75,
  100,
  101,
  -60,
  0.5,
  1.5,
  60.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  Number.MAX_SAFE_INTEGER,
  Number.MAX_SAFE_INTEGER + 1,
  Number.MIN_SAFE_INTEGER - 1,
  1e308,
  5e-324,
  100_000,
  100_001,
  1_700_000_000_000,
  -1_700_000_000_000,
];

const HOSTILE_STRINGS: readonly unknown[] = [
  '',
  ' ',
  '\t',
  '\n',
  'yes',
  'no',
  'null',
  'undefined',
  'travel',
  'A1',
  'A2',
  'B1',
  'B2',
  'b1',
  'te',
  'en',
  'zh',
  'new',
  'revision',
  'native',
  'diagnostic',
  'practice',
  'practice-native',
  'available',
  'retention_pending',
  'audio/mp4',
  'audio/wav',
  'AWS4-HMAC-SHA256',
  '550e8400-e29b-41d4-a716-446655440000',
  '550E8400-E29B-41D4-A716-446655440000',
  '550e8400-e29b-01d4-a716-446655440000',
  '550e8400-e29b-41d4-c716-446655440000',
  'not-a-uuid',
  '2026-08-25T00:00:00.000Z',
  'yesterday',
  '0',
  '900',
  'a'.repeat(64),
  'a'.repeat(100),
  'a'.repeat(101),
  'a'.repeat(128),
  'a'.repeat(129),
  'a'.repeat(254),
  'a'.repeat(255),
  'a'.repeat(500),
  'a'.repeat(501),
  'a'.repeat(800),
  'a'.repeat(801),
  'a'.repeat(1_000),
  'a'.repeat(1_001),
  'a'.repeat(4_000),
  'a'.repeat(4_001),
  'a'.repeat(8_192),
  'a'.repeat(8_193),
  'a'.repeat(12_000),
  'a'.repeat(12_001),
  'a'.repeat(16_384),
  'a'.repeat(16_385),
  'a'.repeat(2_048),
  'a'.repeat(2_049),
  '\u00A0'.repeat(64),
  '\u2028'.repeat(8),
  '\u3000'.repeat(8),
  'e\u0301'.repeat(32),
  '\u202Eevil-override\u202E'.repeat(8),
  '\u200F'.repeat(8),
  '\u200B'.repeat(64),
  '😀'.repeat(50),
  '😀'.repeat(51),
  (JSON.parse('"\\uD800"') as string).repeat(50),
  (JSON.parse('"\\uDC00"') as string).repeat(64),
  'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440000/550e8400-e29b-41d4-a716-446655440003.m4a',
  'audio-uploads/practice/550e8400-e29b-41d4-a716-446655440000/steal.m4a',
  'https://bucket.s3.us-east-1.amazonaws.com/',
  'https://bucket.s3.amazonaws.com.evil.com/',
  'https://evil.example/collect?x=1',
  'javascript:alert(1)',
  'https://[',
];

const HOSTILE_JSON: readonly string[] = [
  '{"__proto__":{"polluted":"yes"}}',
  '{"__proto__":"reserved","key":"value"}',
  '{"constructor":{"prototype":{"polluted":"yes"}}}',
  '{"prototype":{"polluted":"yes"}}',
  '{"toString":false,"valueOf":"3","hasOwnProperty":1}',
  '{"key":"first","key":"second"}',
  '{"promptWord":"ok","promptWord":"   "}',
  '{"length":4294967295,"0":"a"}',
  '{"file":"reserved","FILE":"reserved","File":"reserved"}',
  '{"Content-Type":"audio/mp4","content-type":"audio/wav"}',
  '[[[[[[[[[[1]]]]]]]]]]',
  '{"a":{"b":{"c":{"d":[null,true,false]}}}}',
  'null',
  'true',
  '123',
  '"string"',
  '[]',
  '{}',
];

const HOSTILE_KEYS: readonly string[] = [
  'id',
  'token',
  'user',
  'question',
  'progress',
  'items',
  'nextCursor',
  'examples',
  'level',
  'score',
  'passed',
  'transcript',
  'feedback',
  'createdAt',
  'uploadFields',
  'key',
  'Content-Type',
  'file',
  'mode',
  'stage',
  'answers',
  'done',
  'levelUp',
  'next',
  'requestId',
  'ownerId',
  'cycleId',
  'endpoint',
  'audioKey',
  'contentType',
  'expiresIn',
  'maxBytes',
  'attemptNo',
  'attemptsLeft',
  'recordings',
  'attempts',
  'practiceCycles',
  'diagnosticState',
  'playbackUrl',
  'recordingId',
  'durationMs',
  'sizeBytes',
  'status',
  'availableAt',
  'retainRecording',
  'recoveryPostAttempts',
  'feedbackReadyAt',
  'cancelRequested',
  'x',
  'y',
];

const UNICODE_KEYS: readonly string[] = [
  '\u202Eid',
  'id\u200F',
  '\u00A0',
  '😀',
  'k\u0301',
  '\u2028key',
  'ключ',
  '名前',
  'a\u0000b',
];

function specialValues(): readonly unknown[] {
  return [
    new Date(0),
    /adversarial/u,
    () => undefined,
    Symbol('adversarial'),
    BigInt('0xdeadbeef'),
    new Map<string, unknown>([
      ['key', 'value'],
      ['__proto__', 'value'],
    ]),
    new Set(['value']),
  ];
}

function junkValue(rng: () => number, depth = 0): unknown {
  const branches = depth >= 3 ? 6 : 10;
  const roll = Math.floor(rng() * branches);
  switch (roll) {
    case 0:
      return null;
    case 1:
      return undefined;
    case 2:
      return pick(rng, HOSTILE_NUMBERS);
    case 3:
      return rng() < 0.5;
    case 4:
      return pick(rng, HOSTILE_STRINGS);
    case 5:
      return JSON.parse(pick(rng, HOSTILE_JSON) as string);
    case 6:
      return pick(rng, specialValues());
    case 7: {
      const length = Math.floor(rng() * 4);
      return Array.from({ length }, () => junkValue(rng, depth + 1));
    }
    case 8: {
      const record: Record<string, unknown> = {};
      const keyCount = 1 + Math.floor(rng() * 4);
      for (let index = 0; index < keyCount; index += 1) {
        record[pick(rng, HOSTILE_KEYS) as string] = junkValue(rng, depth + 1);
      }
      return record;
    }
    default: {
      const record: Record<string, unknown> = {};
      record[pick(rng, UNICODE_KEYS) as string] = junkValue(rng, depth + 1);
      return record;
    }
  }
}

function junkCorpus(seed: number): unknown[] {
  const rng = mulberry32(seed);
  return Array.from({ length: FUZZ_ITERATIONS }, () => junkValue(rng));
}

type PathSegment = string | number;

function collectPaths(value: unknown, prefix: PathSegment[], out: PathSegment[][]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const path = [...prefix, index];
      out.push(path);
      collectPaths(item, path, out);
    });
  } else if (!!value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      const path = [...prefix, key];
      out.push(path);
      collectPaths((value as Record<string, unknown>)[key], path, out);
    }
  }
}

function containerAt(
  root: unknown,
  path: PathSegment[],
): Record<string, unknown> | unknown[] | undefined {
  let current: unknown = root;
  for (const segment of path) {
    if (Array.isArray(current)) current = current[segment as number];
    else if (!!current && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[segment as string];
    } else return undefined;
  }
  return Array.isArray(current) || (!!current && typeof current === 'object')
    ? (current as Record<string, unknown> | unknown[])
    : undefined;
}

function mutatedCopy(rng: () => number, templates: readonly unknown[]): unknown {
  const template = pick(rng, templates);
  const root: unknown = JSON.parse(JSON.stringify(template));
  const paths: PathSegment[][] = [];
  collectPaths(root, [], paths);
  if (paths.length === 0) return root;
  const path = pick(rng, paths) as PathSegment[];
  const parent = containerAt(root, path.slice(0, -1));
  const last = path[path.length - 1]!;
  if (!!parent && typeof parent === 'object' && !Array.isArray(parent)) {
    const record = parent as Record<string, unknown>;
    if (typeof last === 'string' && rng() < 0.15) delete record[last];
    else record[last as string] = junkValue(rng, 2);
    return root;
  }
  if (Array.isArray(parent) && typeof last === 'number') {
    parent[last] = junkValue(rng, 2);
  }
  return root;
}

function mutationCorpus(seed: number, templates: readonly unknown[]): unknown[] {
  const rng = mulberry32(seed);
  return Array.from({ length: FUZZ_ITERATIONS }, () => mutatedCopy(rng, templates));
}

// Pending-assessment blobs live behind a JSON.stringify/JSON.parse round trip
// in SecureStore, so its mutation corpus re-serializes every mutated value.
function pendingBlobCorpus(seed: number, templates: readonly unknown[]): unknown[] {
  const rng = mulberry32(seed);
  return Array.from({ length: FUZZ_ITERATIONS }, () => {
    const mutated = mutatedCopy(rng, templates);
    try {
      return JSON.parse(JSON.stringify(mutated) ?? 'null') as unknown;
    } catch {
      return mutated;
    }
  });
}

function describeValue(value: unknown): string {
  try {
    if (typeof value === 'string') return `string[${value.length}]`;
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return `array[${value.length}]`;
    if (typeof value === 'object') return `object{${Object.keys(value).slice(0, 6).join(',')}}`;
    return String(value).slice(0, 60);
  } catch {
    return 'undescribable';
  }
}

function serializeValue(value: unknown): string {
  try {
    return (
      JSON.stringify(value, (_key, nested) =>
        typeof nested === 'bigint'
          ? `bigint:${nested.toString()}`
          : typeof nested === 'symbol'
            ? `symbol:${nested.toString()}`
            : typeof nested === 'function'
              ? 'function'
              : (nested as unknown),
      )?.slice(0, 2_000) ?? String(value)
    );
  } catch {
    return describeValue(value);
  }
}

function expectContractOrShape(
  parserName: string,
  parser: (value: unknown) => unknown,
  shape: (value: unknown) => boolean,
  inputs: readonly unknown[],
  corpusLabel: string,
): void {
  inputs.forEach((input, iteration) => {
    let result: unknown;
    let thrown: unknown;
    let didThrow = false;
    try {
      result = parser(input);
    } catch (error) {
      thrown = error;
      didThrow = true;
    }
    try {
      if (didThrow) expect(thrown).toBeInstanceOf(ContractError);
      else expect(shape(result)).toBe(true);
    } catch (failure) {
      throw new Error(
        `${parserName} ${corpusLabel} iteration ${iteration} broke the contract on ${describeValue(input)} ${serializeValue(input)} (result ${serializeValue(result)}): ${(failure as Error).message}`,
      );
    }
  });
}

function expectNullOrShape(
  parserName: string,
  parser: (value: unknown) => unknown,
  shape: (value: unknown) => boolean,
  inputs: readonly unknown[],
  corpusLabel: string,
): void {
  inputs.forEach((input, iteration) => {
    let result: unknown;
    let thrown: unknown;
    let didThrow = false;
    try {
      result = parser(input);
    } catch (error) {
      thrown = error;
      didThrow = true;
    }
    try {
      if (didThrow) {
        // FIXED FUZZ FINDING: isUuid type-guards before regex-testing, so no
        // coercion-hostile value can escape the parser as a TypeError any
        // more — the parser must return null instead of throwing.
        throw new Error(
          `parser threw ${String(thrown)} on a hostile input after the isUuid type-guard fix`,
        );
      } else if (result !== null) {
        expect(shape(result)).toBe(true);
      }
    } catch (failure) {
      throw new Error(
        `${parserName} ${corpusLabel} iteration ${iteration} broke the contract on ${describeValue(input)} ${serializeValue(input)}: ${(failure as Error).message}`,
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Independent shape validators (deliberately re-implemented; they must not
// import the predicates under test or a parser bug would validate itself)
// ---------------------------------------------------------------------------

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIO_KEY_PATTERN =
  /^audio-uploads\/(diagnostic|practice)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(m4a|mp3|wav|ogg|webm|flac)$/i;
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function isObj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isStr(value: unknown): value is string {
  return typeof value === 'string';
}

function nonBlank(value: unknown): value is string {
  return isStr(value) && value.trim().length > 0;
}

function boundedNonBlank(value: unknown, max: number): boolean {
  return nonBlank(value) && value.length <= max;
}

function boundedStr(value: unknown, max: number): boolean {
  return isStr(value) && value.length <= max;
}

function intIn(value: unknown, lo: number, hi: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= lo && value <= hi;
}

function isUuidValue(value: unknown): boolean {
  return isStr(value) && UUID_PATTERN.test(value);
}

function isLevelValue(value: unknown): boolean {
  return typeof value === 'string' && LEVELS.includes(value);
}

function isNativeLanguageValue(value: unknown): boolean {
  return typeof value === 'string' && ['te', 'hi', 'es', 'zh'].includes(value);
}

function isTimestampValue(value: unknown): boolean {
  return boundedNonBlank(value, 64) && !Number.isNaN(Date.parse(value as string));
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return (
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()) &&
    Object.keys(value).length === keys.length
  );
}

function shapeUser(value: unknown): boolean {
  return (
    isObj(value) &&
    isUuidValue(value.id) &&
    boundedNonBlank(value.name, 100) &&
    boundedNonBlank(value.email, 254) &&
    isNativeLanguageValue(value.nativeLanguage) &&
    (value.uiLanguage === 'en' || isNativeLanguageValue(value.uiLanguage)) &&
    (value.cefrLevel === null || isLevelValue(value.cefrLevel)) &&
    typeof value.diagnosticCompleted === 'boolean' &&
    (value.diagnosticAcknowledged === undefined ||
      typeof value.diagnosticAcknowledged === 'boolean')
  );
}

function shapeQuestion(value: unknown): boolean {
  return (
    isObj(value) &&
    isUuidValue(value.id) &&
    isLevelValue(value.cefrLevel) &&
    boundedNonBlank(value.promptWord, 100) &&
    boundedNonBlank(value.questionText, 1_000)
  );
}

function shapeProgress(value: unknown): boolean {
  if (!isObj(value)) return false;
  const count = (candidate: unknown): candidate is number =>
    typeof candidate === 'number' &&
    Number.isSafeInteger(candidate) &&
    candidate >= 0 &&
    candidate <= 100_000;
  const mastered = value.masteredCount;
  const learning = value.learningCount;
  const total = value.totalAtLevel;
  if (!count(mastered) || !count(learning) || !count(total)) return false;
  if (total < 1 || (mastered as number) + (learning as number) > (total as number)) return false;
  const due = value.dueCount;
  if (due === undefined) return true;
  return count(due) && (due as number) <= (mastered as number) + (learning as number);
}

function shapeLevelUp(value: unknown): boolean {
  if (!isObj(value) || !isLevelValue(value.from) || !isLevelValue(value.to)) return false;
  return LEVELS.indexOf(value.to as string) === LEVELS.indexOf(value.from as string) + 1;
}

function shapePayload(value: unknown): boolean {
  if (!isObj(value)) return false;
  if (!shapeQuestion(value.question)) return false;
  if (value.kind !== 'revision' && value.kind !== 'new') return false;
  if (!shapeProgress(value.progress)) return false;
  if (!isUuidValue(value.cycleId)) return false;
  const used = value.attemptsUsed;
  if (typeof used !== 'number' || !Number.isInteger(used) || used < 0 || used > 2) return false;
  return value.attemptsLeft === 3 - used;
}

function shapeAttempt(value: unknown): boolean {
  if (!isObj(value)) return false;
  if (!isUuidValue(value.cycleId)) return false;
  if (typeof value.passed !== 'boolean' || typeof value.mastered !== 'boolean') return false;
  const attemptNo = value.attemptNo;
  const attemptsLeft = value.attemptsLeft;
  const score = value.score;
  if (!intIn(attemptNo, 1, 3) || !intIn(attemptsLeft, 0, 3) || !intIn(score, 0, 100)) {
    return false;
  }
  if (!boundedStr(value.transcript, 12_000) || !boundedNonBlank(value.feedback, 800)) return false;
  if (value.recordingId !== undefined && !isUuidValue(value.recordingId)) return false;
  if (value.passed !== score >= 60 || value.mastered !== score >= 75) return false;
  if (value.noSpeech !== undefined) {
    if (value.noSpeech !== true) return false;
    return (
      !value.passed &&
      !value.mastered &&
      score === 0 &&
      value.transcript === '' &&
      value.finalFeedback === undefined &&
      value.next === undefined &&
      value.levelUp === undefined &&
      attemptsLeft === 3 - ((attemptNo as number) - 1)
    );
  }
  if (value.levelUp !== undefined && !value.mastered) return false;
  if (!nonBlank(value.transcript)) return false;
  if (value.passed) {
    if (attemptsLeft !== 0 || value.finalFeedback !== undefined) return false;
    if (!shapePayload(value.next)) return false;
    if (value.levelUp !== undefined) {
      if (!shapeLevelUp(value.levelUp)) return false;
      const next = value.next as { question: { cefrLevel: unknown } };
      const levelUp = value.levelUp as { to: unknown };
      if (next.question.cefrLevel !== levelUp.to) return false;
    }
    return true;
  }
  if (attemptsLeft !== 0) {
    return (
      attemptsLeft === 3 - (attemptNo as number) &&
      value.finalFeedback === undefined &&
      value.next === undefined
    );
  }
  return boundedNonBlank(value.finalFeedback, 4_000) && shapePayload(value.next);
}

function shapeNative(value: unknown): boolean {
  if (!isObj(value) || value.mode !== 'native') return false;
  if (!isNativeLanguageValue(value.nativeLanguage)) return false;
  if (!isUuidValue(value.cycleId)) return false;
  if (typeof value.understood !== 'boolean') return false;
  const attemptNo = value.attemptNo;
  const attemptsLeft = value.attemptsLeft;
  if (!intIn(attemptNo, 1, 3) || !intIn(attemptsLeft, 0, 3)) return false;
  if (!boundedStr(value.transcript, 12_000) || !boundedStr(value.translatedTranscript, 12_000)) {
    return false;
  }
  if (!boundedStr(value.modelAnswer, 800) || !boundedNonBlank(value.feedback, 800)) return false;
  if (value.recordingId !== undefined && !isUuidValue(value.recordingId)) return false;
  if (value.noSpeech !== undefined) {
    if (value.noSpeech !== true) return false;
    return (
      !value.understood &&
      value.transcript === '' &&
      value.translatedTranscript === '' &&
      value.modelAnswer === '' &&
      value.next === undefined &&
      attemptsLeft === 3 - ((attemptNo as number) - 1)
    );
  }
  if (
    !nonBlank(value.transcript) ||
    !nonBlank(value.translatedTranscript) ||
    !nonBlank(value.modelAnswer)
  ) {
    return false;
  }
  if (attemptsLeft !== 3 - (attemptNo as number)) return false;
  if ((attemptsLeft === 0) !== (value.next !== undefined)) return false;
  return value.next === undefined || shapePayload(value.next);
}

function shapeAnswerSummaries(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 5) return false;
  return value.every((row, index) => {
    if (!isObj(row)) return false;
    if (
      !exactKeys(row, [
        'attemptNo',
        'promptWord',
        'questionText',
        'transcript',
        'score',
        'passed',
        'feedback',
      ])
    ) {
      return false;
    }
    const score = row.score;
    if (!intIn(score, 0, 100)) return false;
    return (
      row.attemptNo === index + 1 &&
      boundedNonBlank(row.promptWord, 100) &&
      boundedNonBlank(row.questionText, 1_000) &&
      boundedNonBlank(row.transcript, 12_000) &&
      typeof row.passed === 'boolean' &&
      row.passed === (score as number) >= 60 &&
      boundedNonBlank(row.feedback, 800)
    );
  });
}

function shapeDiagnosticNext(value: unknown): boolean {
  if (!isObj(value)) return false;
  const hasAnswers = value.answers !== undefined;
  if (hasAnswers && !shapeAnswerSummaries(value.answers)) return false;
  if (value.done === true) {
    if (!exactKeys(value, hasAnswers ? ['done', 'level', 'answers'] : ['done', 'level'])) {
      return false;
    }
    return isLevelValue(value.level);
  }
  if (value.done !== false) return false;
  if (
    !exactKeys(
      value,
      hasAnswers ? ['done', 'question', 'progress', 'answers'] : ['done', 'question', 'progress'],
    )
  ) {
    return false;
  }
  if (!shapeQuestion(value.question)) return false;
  const progress = value.progress;
  if (!isObj(progress) || !exactKeys(progress, ['asked', 'maxQuestions'])) return false;
  const asked = progress.asked;
  const max = progress.maxQuestions;
  return intIn(asked, 0, 99) && intIn(max, 1, 100) && (asked as number) < (max as number);
}

function shapeDiagnosticAnswer(value: unknown): boolean {
  if (!isObj(value)) return false;
  const required = ['passed', 'score', 'transcript', 'feedback', 'done'];
  const optional = ['recordingId', 'noSpeech', 'level', 'nextQuestion'];
  if (!Object.keys(value).every((key) => required.includes(key) || optional.includes(key))) {
    return false;
  }
  if (!required.every((key) => key in value)) return false;
  const score = value.score;
  if (!intIn(score, 0, 100)) return false;
  if (typeof value.passed !== 'boolean' || value.passed !== (score as number) >= 60) return false;
  if (typeof value.done !== 'boolean') return false;
  if (!boundedStr(value.transcript, 12_000) || !boundedNonBlank(value.feedback, 800)) return false;
  if (value.recordingId !== undefined && !isUuidValue(value.recordingId)) return false;
  if (value.noSpeech !== undefined) {
    if (value.noSpeech !== true) return false;
    return (
      !value.passed &&
      score === 0 &&
      value.transcript === '' &&
      !value.done &&
      value.level === undefined &&
      shapeQuestion(value.nextQuestion)
    );
  }
  if (!nonBlank(value.transcript)) return false;
  if (value.done) return isLevelValue(value.level) && value.nextQuestion === undefined;
  return value.level === undefined && shapeQuestion(value.nextQuestion);
}

function shapeHelp(value: unknown): boolean {
  if (!isObj(value)) return false;
  if (
    !exactKeys(value, [
      'promptWord',
      'promptWordNative',
      'questionText',
      'questionTextNative',
      'examples',
    ])
  ) {
    return false;
  }
  if (!boundedNonBlank(value.promptWord, 100) || !boundedNonBlank(value.promptWordNative, 500)) {
    return false;
  }
  if (
    !boundedNonBlank(value.questionText, 1_000) ||
    !boundedNonBlank(value.questionTextNative, 4_000)
  ) {
    return false;
  }
  if (!Array.isArray(value.examples) || value.examples.length !== 3) return false;
  return value.examples.every(
    (example) =>
      isObj(example) &&
      exactKeys(example, ['en', 'native']) &&
      boundedNonBlank(example.en, 4_000) &&
      boundedNonBlank(example.native, 4_000),
  );
}

function shapeStats(value: unknown): boolean {
  if (!isObj(value)) return false;
  if (
    !exactKeys(value, [
      'level',
      'progress',
      'streakDays',
      'practicedToday',
      'totalAttempts',
      'lastPracticedAt',
    ])
  ) {
    return false;
  }
  const progress = value.progress;
  if (
    !isObj(progress) ||
    !exactKeys(progress, ['masteredCount', 'learningCount', 'totalAtLevel', 'dueCount'])
  ) {
    return false;
  }
  const count = (candidate: unknown): candidate is number =>
    typeof candidate === 'number' &&
    Number.isSafeInteger(candidate) &&
    candidate >= 0 &&
    candidate <= 100_000;
  const mastered = progress.masteredCount;
  const learning = progress.learningCount;
  const total = progress.totalAtLevel;
  const due = progress.dueCount;
  if (!count(mastered) || !count(learning) || !count(total) || !count(due)) return false;
  if ((mastered as number) + (learning as number) > (total as number)) return false;
  if ((due as number) > (mastered as number) + (learning as number)) return false;
  const lifetime = (candidate: unknown): boolean =>
    typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate >= 0;
  if (
    !lifetime(value.streakDays) ||
    !lifetime(value.practicedToday) ||
    !lifetime(value.totalAttempts)
  ) {
    return false;
  }
  if ((value.practicedToday as number) > (value.totalAttempts as number)) return false;
  if (value.lastPracticedAt !== null && !isTimestampValue(value.lastPracticedAt)) return false;
  if (value.level === null) return total === 0;
  return isLevelValue(value.level) && (total as number) >= 1;
}

function shapeHistoryItem(value: unknown): boolean {
  if (!isObj(value)) return false;
  const required = [
    'id',
    'questionId',
    'promptWord',
    'questionText',
    'cefrLevel',
    'context',
    'nativeLanguage',
    'cycleId',
    'attemptNo',
    'score',
    'passed',
    'understood',
    'transcript',
    'translatedTranscript',
    'modelAnswer',
    'feedback',
    'createdAt',
  ];
  const optional = ['recordingId', 'recordingStatus'];
  if (!Object.keys(value).every((key) => required.includes(key) || optional.includes(key))) {
    return false;
  }
  if (!required.every((key) => key in value)) return false;
  if (!isUuidValue(value.id) || !isUuidValue(value.questionId)) return false;
  if (!boundedNonBlank(value.promptWord, 100) || !boundedNonBlank(value.questionText, 1_000)) {
    return false;
  }
  if (!isLevelValue(value.cefrLevel)) return false;
  const context = value.context;
  if (context !== 'diagnostic' && context !== 'practice' && context !== 'practice-native') {
    return false;
  }
  const attemptNo = value.attemptNo;
  if (!intIn(attemptNo, 1, context === 'diagnostic' ? 5 : 3)) return false;
  if (!boundedStr(value.transcript, 12_000) || !boundedNonBlank(value.feedback, 4_000))
    return false;
  if (!isTimestampValue(value.createdAt)) return false;
  const recordingId = value.recordingId;
  const recordingStatus = value.recordingStatus;
  const recordingOk =
    (recordingId === undefined && recordingStatus === undefined) ||
    (recordingId === null && recordingStatus === null) ||
    (isUuidValue(recordingId) &&
      (recordingStatus === 'retention_pending' ||
        recordingStatus === 'available' ||
        recordingStatus === 'unavailable'));
  if (!recordingOk) return false;
  const score = value.score;
  if (context === 'practice-native') {
    return (
      isUuidValue(value.cycleId) &&
      isNativeLanguageValue(value.nativeLanguage) &&
      score === null &&
      value.passed === null &&
      typeof value.understood === 'boolean' &&
      nonBlank(value.transcript) &&
      boundedNonBlank(value.translatedTranscript, 12_000) &&
      boundedNonBlank(value.modelAnswer, 800)
    );
  }
  if (!intIn(score, 0, 100)) return false;
  return (
    typeof value.passed === 'boolean' &&
    value.passed === (score as number) >= 60 &&
    value.understood === null &&
    value.translatedTranscript === null &&
    value.modelAnswer === null &&
    value.nativeLanguage === null &&
    (context === 'practice' ? isUuidValue(value.cycleId) : value.cycleId === null)
  );
}

function shapeHistoryPage(value: unknown): boolean {
  if (!isObj(value) || !exactKeys(value, ['items', 'nextCursor'])) return false;
  if (!Array.isArray(value.items) || value.items.length > 50) return false;
  if (value.nextCursor !== null && !isUuidValue(value.nextCursor)) return false;
  if (value.items.length === 0 && value.nextCursor !== null) return false;
  return value.items.every(shapeHistoryItem);
}

const RECORDING_ITEM_KEYS = [
  'id',
  'questionId',
  'context',
  'promptWord',
  'questionText',
  'cefrLevel',
  'contentType',
  'sizeBytes',
  'durationMs',
  'status',
  'createdAt',
  'availableAt',
];

function recordingCoreFields(value: Record<string, unknown>): boolean {
  if (!isUuidValue(value.id) || !isUuidValue(value.questionId)) return false;
  if (
    value.context !== 'diagnostic' &&
    value.context !== 'practice' &&
    value.context !== 'practice-native'
  ) {
    return false;
  }
  if (!boundedNonBlank(value.promptWord, 100) || !boundedNonBlank(value.questionText, 1_000)) {
    return false;
  }
  if (!isLevelValue(value.cefrLevel) || !boundedNonBlank(value.contentType, 128)) return false;
  const size = value.sizeBytes;
  if (
    typeof size !== 'number' ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 25 * 1024 * 1024
  ) {
    return false;
  }
  const duration = value.durationMs;
  if (
    duration !== null &&
    (typeof duration !== 'number' ||
      !Number.isSafeInteger(duration) ||
      duration < 500 ||
      duration > 120_500)
  ) {
    return false;
  }
  if (
    value.status !== 'retention_pending' &&
    value.status !== 'available' &&
    value.status !== 'unavailable'
  ) {
    return false;
  }
  if (!isTimestampValue(value.createdAt)) return false;
  return (
    (value.status === 'available' && isTimestampValue(value.availableAt)) ||
    (value.status !== 'available' && value.availableAt === null)
  );
}

function shapeRecordingItem(value: unknown): boolean {
  return isObj(value) && recordingCoreFields(value) && exactKeys(value, RECORDING_ITEM_KEYS);
}

function shapeRecordingPage(value: unknown): boolean {
  if (!isObj(value) || !exactKeys(value, ['items', 'nextCursor'])) return false;
  if (!Array.isArray(value.items) || value.items.length > 50) return false;
  if (value.nextCursor !== null && !isUuidValue(value.nextCursor)) return false;
  if (value.items.length === 0 && value.nextCursor !== null) return false;
  return value.items.every(shapeRecordingItem);
}

function shapeRecordingExportPage(value: unknown): boolean {
  if (!isObj(value) || !exactKeys(value, ['recordings', 'nextCursor'])) return false;
  if (!Array.isArray(value.recordings) || value.recordings.length > 500) return false;
  if (value.nextCursor !== null && !isUuidValue(value.nextCursor)) return false;
  if (value.recordings.length === 0 && value.nextCursor !== null) return false;
  return value.recordings.every(
    (row) =>
      isObj(row) &&
      recordingCoreFields(row) &&
      isUuidValue(row.requestId) &&
      (row.attemptId === null || isUuidValue(row.attemptId)) &&
      exactKeys(row, [...RECORDING_ITEM_KEYS, 'requestId', 'attemptId']),
  );
}

function shapeUserDataPage(value: unknown): boolean {
  if (!isObj(value)) return false;
  if (
    !exactKeys(value, [
      'user',
      'attempts',
      'practiceProgress',
      'practiceCycles',
      'diagnosticState',
      'nextCursor',
      'nextPracticeCycleCursor',
      'attemptsDone',
      'practiceCyclesDone',
    ])
  ) {
    return false;
  }
  if (!shapeUser(value.user)) return false;
  if (!Array.isArray(value.attempts) || value.attempts.length > 500) return false;
  if (!Array.isArray(value.practiceProgress)) return false;
  if (!Array.isArray(value.practiceCycles) || value.practiceCycles.length > 500) return false;
  const rowsOk = (rows: readonly unknown[]): boolean => rows.every((row) => isObj(row));
  if (!rowsOk(value.attempts) || !rowsOk(value.practiceProgress) || !rowsOk(value.practiceCycles)) {
    return false;
  }
  if (value.diagnosticState !== null && !isObj(value.diagnosticState)) return false;
  const cursor = (candidate: unknown): boolean => candidate === null || isUuidValue(candidate);
  if (!cursor(value.nextCursor) || !cursor(value.nextPracticeCycleCursor)) return false;
  if (typeof value.attemptsDone !== 'boolean' || typeof value.practiceCyclesDone !== 'boolean') {
    return false;
  }
  if (value.attempts.length === 0 && value.nextCursor !== null) return false;
  if (value.practiceCycles.length === 0 && value.nextPracticeCycleCursor !== null) return false;
  return (
    value.attemptsDone === (value.nextCursor === null) &&
    value.practiceCyclesDone === (value.nextPracticeCycleCursor === null)
  );
}

function isAwsS3HostShape(hostname: string): boolean {
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

function shapePlaybackGrant(value: unknown): boolean {
  if (
    !isObj(value) ||
    !exactKeys(value, ['recordingId', 'playbackUrl', 'expiresIn', 'contentType'])
  ) {
    return false;
  }
  if (!isUuidValue(value.recordingId)) return false;
  const expiresIn = value.expiresIn;
  if (
    typeof expiresIn !== 'number' ||
    !Number.isSafeInteger(expiresIn) ||
    expiresIn < 30 ||
    expiresIn > 300
  ) {
    return false;
  }
  if (!boundedNonBlank(value.playbackUrl, 16_384) || !boundedNonBlank(value.contentType, 128)) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value.playbackUrl as string);
  } catch {
    return false;
  }
  const signedExpiry = Number(url.searchParams.get('X-Amz-Expires'));
  return (
    url.protocol === 'https:' &&
    isAwsS3HostShape(url.hostname) &&
    !url.username &&
    !url.password &&
    !url.hash &&
    url.searchParams.get('X-Amz-Algorithm') === 'AWS4-HMAC-SHA256' &&
    nonBlank(url.searchParams.get('X-Amz-Credential')) &&
    nonBlank(url.searchParams.get('X-Amz-Date')) &&
    nonBlank(url.searchParams.get('X-Amz-SignedHeaders')) &&
    nonBlank(url.searchParams.get('X-Amz-Signature')) &&
    Number.isSafeInteger(signedExpiry) &&
    signedExpiry === expiresIn
  );
}

const CONTENT_TYPE_EXT: Readonly<Record<string, string>> = {
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

function shapeAudioGrant(value: unknown): boolean {
  if (!isObj(value)) return false;
  const endpoints = ['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native'];
  if (!endpoints.includes(value.assessmentEndpoint as string)) return false;
  if (value.mode === 'direct') return exactKeys(value, ['mode', 'assessmentEndpoint']);
  if (value.mode !== 's3') return false;
  if (
    !exactKeys(value, [
      'mode',
      'assessmentEndpoint',
      'uploadUrl',
      'uploadFields',
      'audioKey',
      'contentType',
      'expiresIn',
      'maxBytes',
    ])
  ) {
    return false;
  }
  const uploadUrl = value.uploadUrl;
  if (!isStr(uploadUrl) || uploadUrl.length > 2_048) return false;
  let url: URL;
  try {
    url = new URL(uploadUrl);
  } catch {
    return false;
  }
  if (
    url.protocol !== 'https:' ||
    !isAwsS3HostShape(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return false;
  }
  const fields = value.uploadFields;
  if (!isObj(fields) || Object.getPrototypeOf(fields) !== null) return false;
  const entries = Object.entries(fields);
  if (entries.length < 2 || entries.length > 32) return false;
  let totalLength = 0;
  for (const [key, fieldValue] of entries) {
    if (
      !/^[A-Za-z0-9_.-]{1,128}$/.test(key) ||
      key.toLowerCase() === 'file' ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype' ||
      !nonBlank(fieldValue) ||
      fieldValue.length > 8_192
    ) {
      return false;
    }
    totalLength += key.length + fieldValue.length;
    if (totalLength > 32_768) return false;
  }
  const audioKey = value.audioKey;
  const contentType = value.contentType;
  if (!isStr(audioKey) || !AUDIO_KEY_PATTERN.test(audioKey)) return false;
  if (!isStr(contentType) || CONTENT_TYPE_EXT[contentType] === undefined) return false;
  const scope = value.assessmentEndpoint === '/diagnostic/answer' ? 'diagnostic' : 'practice';
  if ((audioKey.split('/')[1] ?? '').toLowerCase() !== scope) return false;
  if (!audioKey.toLowerCase().endsWith(`.${CONTENT_TYPE_EXT[contentType] as string}`)) return false;
  if (!Object.hasOwn(fields, 'key') || fields.key !== audioKey) return false;
  if (!Object.hasOwn(fields, 'Content-Type') || fields['Content-Type'] !== contentType) {
    return false;
  }
  return intIn(value.expiresIn, 60, 3_600) && intIn(value.maxBytes, 1, 25 * 1024 * 1024);
}

function shapePending(value: unknown): boolean {
  if (!isObj(value)) return false;
  const allowed = [
    'ownerId',
    'endpoint',
    'questionId',
    'cycleId',
    'requestId',
    'createdAt',
    'retainRecording',
    'stage',
    'feedbackReadyAt',
    'audioKey',
    'cancelRequested',
    'recoveryPostAttempts',
  ];
  if (!Object.keys(value).every((key) => allowed.includes(key))) return false;
  if (
    !isUuidValue(value.ownerId) ||
    !isUuidValue(value.questionId) ||
    !isUuidValue(value.requestId)
  ) {
    return false;
  }
  const endpoints = ['/diagnostic/answer', '/practice/attempt', '/practice/attempt/native'];
  if (!endpoints.includes(value.endpoint as string)) return false;
  const createdAt = value.createdAt;
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt) || createdAt <= 0) return false;
  const stages = ['prepared', 'direct-posting', 's3-granted', 'reconcile', 'feedback-pending'];
  if (!stages.includes(value.stage as string)) return false;
  if (typeof value.retainRecording !== 'boolean') return false;
  if (value.endpoint !== '/diagnostic/answer') {
    if (!isUuidValue(value.cycleId)) return false;
  } else if ('cycleId' in value) {
    return false;
  }
  if (value.stage === 'feedback-pending') {
    const ready = value.feedbackReadyAt;
    if (typeof ready !== 'number' || !Number.isSafeInteger(ready) || ready < createdAt)
      return false;
  } else if ('feedbackReadyAt' in value) {
    return false;
  }
  if (value.stage === 's3-granted') {
    const audioKey = value.audioKey;
    if (!isStr(audioKey) || !AUDIO_KEY_PATTERN.test(audioKey)) return false;
    if ((audioKey.split('/')[2] ?? '').toLowerCase() !== (value.ownerId as string).toLowerCase()) {
      return false;
    }
    const scope = value.endpoint === '/diagnostic/answer' ? 'diagnostic' : 'practice';
    if ((audioKey.split('/')[1] ?? '').toLowerCase() !== scope) return false;
  } else if ('audioKey' in value) {
    return false;
  }
  if (value.cancelRequested !== undefined && typeof value.cancelRequested !== 'boolean')
    return false;
  if (value.recoveryPostAttempts !== undefined) {
    const attempts = value.recoveryPostAttempts;
    if (
      typeof attempts !== 'number' ||
      !Number.isSafeInteger(attempts) ||
      attempts < 0 ||
      attempts > 3
    ) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Valid templates the mutation fuzz corrupts one field at a time
// ---------------------------------------------------------------------------

const U1 = '550e8400-e29b-41d4-a716-446655440000';
const U2 = '550e8400-e29b-41d4-a716-446655440001';
const U3 = '550e8400-e29b-41d4-a716-446655440002';
const U4 = '550e8400-e29b-41d4-a716-446655440003';
const U9 = '550e8400-e29b-41d4-a716-446655440009';
const CYCLE = '550e8400-e29b-41d4-a716-446655440020';
const CYCLE2 = '550e8400-e29b-41d4-a716-446655440021';
const PRACTICE_AUDIO_KEY = `audio-uploads/practice/${U1}/${U4}.m4a`;
const DIAGNOSTIC_AUDIO_KEY = `audio-uploads/diagnostic/${U1}/${U4}.m4a`;

const userTemplate = {
  id: U1,
  name: 'Learner',
  email: 'learner@example.com',
  nativeLanguage: 'te',
  uiLanguage: 'en',
  cefrLevel: 'B1',
  diagnosticCompleted: true,
};

const questionTemplate = {
  id: U2,
  cefrLevel: 'B1',
  promptWord: 'travel',
  questionText: 'Where would you like to travel?',
};

const b2QuestionTemplate = {
  id: U3,
  cefrLevel: 'B2',
  promptWord: 'ambition',
  questionText: 'What is your biggest ambition?',
};

const payloadTemplate = {
  question: questionTemplate,
  kind: 'new',
  progress: { masteredCount: 2, learningCount: 1, totalAtLevel: 8 },
  cycleId: CYCLE,
  attemptsUsed: 0,
  attemptsLeft: 3,
};

const promotedPayloadTemplate = {
  question: b2QuestionTemplate,
  kind: 'new',
  progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 12 },
  cycleId: CYCLE2,
  attemptsUsed: 0,
  attemptsLeft: 3,
};

const attemptPassedTemplate = {
  cycleId: CYCLE,
  passed: true,
  mastered: true,
  attemptNo: 1,
  attemptsLeft: 0,
  score: 90,
  transcript: 'A complete answer.',
  feedback: 'Great.',
  next: promotedPayloadTemplate,
  levelUp: { from: 'B1', to: 'B2' },
};

const attemptRetryTemplate = {
  cycleId: CYCLE,
  passed: false,
  mastered: false,
  attemptNo: 1,
  attemptsLeft: 2,
  score: 45,
  transcript: 'A short answer.',
  feedback: 'Add detail.',
};

const attemptFinalTemplate = {
  cycleId: CYCLE,
  passed: false,
  mastered: false,
  attemptNo: 3,
  attemptsLeft: 0,
  score: 50,
  transcript: 'A final answer.',
  feedback: 'Try again.',
  finalFeedback: 'Review the example and continue.',
  next: payloadTemplate,
};

const attemptSilentTemplate = {
  cycleId: CYCLE,
  passed: false,
  mastered: false,
  noSpeech: true,
  attemptNo: 2,
  attemptsLeft: 2,
  score: 0,
  transcript: '',
  feedback: 'We could not hear any speech.',
};

const nativeSpokenTemplate = {
  mode: 'native',
  nativeLanguage: 'te',
  cycleId: CYCLE,
  understood: true,
  attemptNo: 1,
  attemptsLeft: 2,
  transcript: 'ఆమె పనిలో ధైర్యం చూపింది.',
  translatedTranscript: 'She showed courage at work.',
  modelAnswer: 'She showed courage at work.',
  feedback: 'You understood the question.',
};

const nativeSilentTemplate = {
  mode: 'native',
  nativeLanguage: 'te',
  cycleId: CYCLE,
  understood: false,
  noSpeech: true,
  attemptNo: 1,
  attemptsLeft: 3,
  transcript: '',
  translatedTranscript: '',
  modelAnswer: '',
  feedback: 'We could not hear any speech.',
};

const diagnosticPendingTemplate = {
  done: false,
  question: questionTemplate,
  progress: { asked: 0, maxQuestions: 6 },
};

const diagnosticDoneTemplate = { done: true, level: 'B1' };

const diagnosticAnswerPendingTemplate = {
  passed: true,
  score: 82,
  transcript: 'I would travel to Spain.',
  feedback: 'Clear and relevant.',
  done: false,
  nextQuestion: questionTemplate,
};

const diagnosticAnswerDoneTemplate = {
  passed: true,
  score: 82,
  transcript: 'I would travel to Spain.',
  feedback: 'Clear and relevant.',
  done: true,
  level: 'B1',
};

const helpTemplate = {
  promptWord: 'travel',
  promptWordNative: 'ప్రయాణం',
  questionText: 'Where would you like to travel?',
  questionTextNative: 'మీరు ఎక్కడికి వెళ్లాలనుకుంటున్నారు?',
  examples: [
    { en: 'I want to travel.', native: 'నేను ప్రయాణించాలనుకుంటున్నాను.' },
    { en: 'I travel by train.', native: 'నేను రైలులో ప్రయాణిస్తాను.' },
    { en: 'Travel teaches me.', native: 'ప్రయాణం నాకు నేర్పుతుంది.' },
  ],
};

const statsTemplate = {
  level: 'B1',
  progress: { masteredCount: 3, learningCount: 2, totalAtLevel: 10, dueCount: 4 },
  streakDays: 2,
  practicedToday: 1,
  totalAttempts: 12,
  lastPracticedAt: '2026-08-15T10:00:00.000Z',
};

const historyPracticeItem = {
  id: '550e8400-e29b-41d4-a716-446655440031',
  questionId: '550e8400-e29b-41d4-a716-446655440032',
  promptWord: 'courage',
  questionText: 'Describe a time you showed courage.',
  cefrLevel: 'B1',
  context: 'practice',
  nativeLanguage: null,
  cycleId: CYCLE,
  attemptNo: 2,
  score: 59,
  passed: false,
  understood: null,
  transcript: 'I tried.',
  translatedTranscript: null,
  modelAnswer: null,
  feedback: 'Add more detail.',
  createdAt: '2026-08-15T10:00:00.000Z',
};

const historyDiagnosticItem = {
  ...historyPracticeItem,
  id: '550e8400-e29b-41d4-a716-446655440033',
  context: 'diagnostic',
  cycleId: null,
  attemptNo: 1,
  score: 82,
  passed: true,
};

const historyNativeItem = {
  ...historyPracticeItem,
  id: '550e8400-e29b-41d4-a716-446655440034',
  context: 'practice-native',
  nativeLanguage: 'te',
  score: null,
  passed: null,
  understood: true,
  transcript: 'ఆమె ధైర్యంగా ఉంది.',
  translatedTranscript: 'She was brave.',
  modelAnswer: 'She showed courage at work.',
};

const historyPageTemplate = {
  items: [historyPracticeItem, historyDiagnosticItem, historyNativeItem],
  nextCursor: null,
};

const recordingItemTemplate = {
  id: '550e8400-e29b-41d4-a716-446655440050',
  questionId: U2,
  context: 'practice',
  promptWord: 'travel',
  questionText: 'Where would you like to travel?',
  cefrLevel: 'B1',
  contentType: 'audio/mp4',
  sizeBytes: 2_048,
  durationMs: 8_000,
  status: 'available',
  createdAt: '2026-08-25T00:00:00.000Z',
  availableAt: '2026-08-25T00:00:01.000Z',
};

const recordingPageTemplate = { items: [recordingItemTemplate], nextCursor: null };

const recordingExportPageTemplate = {
  recordings: [
    {
      ...recordingItemTemplate,
      requestId: '550e8400-e29b-41d4-a716-446655440052',
      attemptId: null,
    },
  ],
  nextCursor: null,
};

const userDataPageTemplate = {
  user: userTemplate,
  attempts: [{ id: 'a1', score: 70 }],
  practiceProgress: [{ questionId: U2, status: 'learning' }],
  practiceCycles: [{ id: U4, attemptsUsed: 2 }],
  diagnosticState: { lowIndex: 1, highIndex: 3 },
  nextCursor: null,
  nextPracticeCycleCursor: null,
  attemptsDone: true,
  practiceCyclesDone: true,
};

function signedPlaybackUrl(overrides: Record<string, string | number> = {}): string {
  const {
    protocol = 'https',
    authority = 'private.s3.us-west-1.amazonaws.com',
    algorithm = 'AWS4-HMAC-SHA256',
    expiresValue = '60',
    credential = 'credential',
    extra = '',
    fragment = '',
  } = overrides as Record<string, string>;
  const params = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': credential,
    'X-Amz-Date': '20260825T000000Z',
    'X-Amz-Expires': expiresValue,
    'X-Amz-SignedHeaders': 'host',
    'X-Amz-Signature': 'signature',
  });
  return `${protocol}://${authority}/object?${params.toString()}${extra}${fragment}`;
}

const playbackGrantTemplate = {
  recordingId: '550e8400-e29b-41d4-a716-446655440060',
  playbackUrl: signedPlaybackUrl(),
  expiresIn: 60,
  contentType: 'audio/mp4',
};

const audioGrantS3Template = {
  mode: 's3',
  assessmentEndpoint: '/practice/attempt',
  uploadUrl: 'https://bucket.s3.us-east-1.amazonaws.com/',
  uploadFields: { key: PRACTICE_AUDIO_KEY, 'Content-Type': 'audio/mp4', Policy: 'signed-policy' },
  audioKey: PRACTICE_AUDIO_KEY,
  contentType: 'audio/mp4',
  expiresIn: 900,
  maxBytes: 25 * 1024 * 1024,
};

const audioGrantDirectTemplate = { mode: 'direct', assessmentEndpoint: '/diagnostic/answer' };

const pendingPracticeTemplate = {
  ownerId: U1,
  endpoint: '/practice/attempt',
  questionId: U2,
  cycleId: CYCLE,
  requestId: U3,
  createdAt: 1_700_000_000_000,
  retainRecording: false,
  stage: 'prepared',
};

const pendingDiagnosticTemplate = {
  ownerId: U1,
  endpoint: '/diagnostic/answer',
  questionId: U2,
  requestId: U3,
  createdAt: 1_700_000_000_000,
  retainRecording: true,
  stage: 'direct-posting',
};

const pendingS3Template = {
  ...pendingPracticeTemplate,
  stage: 's3-granted',
  audioKey: PRACTICE_AUDIO_KEY,
};

const pendingFeedbackTemplate = {
  ...pendingPracticeTemplate,
  stage: 'feedback-pending',
  feedbackReadyAt: 1_700_000_060_000,
};

function expectContractError(run: () => unknown): void {
  expect(run).toThrow(ContractError);
}

// ---------------------------------------------------------------------------
// Section 1: seeded property fuzz over every exported parser
// ---------------------------------------------------------------------------

function runParserFuzz(
  parserName: string,
  parser: (value: unknown) => unknown,
  shape: (value: unknown) => boolean,
  seed: number,
  templates: readonly unknown[],
): void {
  expectContractOrShape(
    parserName,
    parser,
    shape,
    junkCorpus(seed),
    `junk seed=0x${seed.toString(16)}`,
  );
  const mutateSeed = (seed + 0x1_0000) >>> 0;
  expectContractOrShape(
    parserName,
    parser,
    shape,
    mutationCorpus(mutateSeed, templates),
    `mutate seed=0x${mutateSeed.toString(16)}`,
  );
  const control = parser(templates[0]);
  expect(shape(control)).toBe(true);
}

describe('adversarial seeded property fuzz: identity and questions', () => {
  it('parseUser only ever returns a shaped user or throws ContractError', () => {
    runParserFuzz('parseUser', parseUser, shapeUser, 0x5eed0001, [userTemplate]);
  });

  it('parseAuthResponse only ever returns a shaped envelope or throws ContractError', () => {
    runParserFuzz(
      'parseAuthResponse',
      parseAuthResponse,
      (value) => {
        if (!isObj(value) || !exactKeys(value, ['token', 'user'])) return false;
        return boundedNonBlank(value.token, 16_384) && shapeUser(value.user);
      },
      0x5eed0002,
      [{ token: 'jwt', user: userTemplate }],
    );
  });

  it('parseUserResponse only ever returns a shaped envelope or throws ContractError', () => {
    runParserFuzz(
      'parseUserResponse',
      parseUserResponse,
      (value) => {
        if (!isObj(value) || !exactKeys(value, ['user'])) return false;
        return shapeUser(value.user);
      },
      0x5eed0003,
      [{ user: userTemplate }],
    );
  });

  it('parseQuestion only ever returns a shaped question or throws ContractError', () => {
    runParserFuzz('parseQuestion', parseQuestion, shapeQuestion, 0x5eed0004, [questionTemplate]);
  });

  it('parsePracticeQuestion only ever returns a shaped payload or throws ContractError', () => {
    runParserFuzz('parsePracticeQuestion', parsePracticeQuestion, shapePayload, 0x5eed0005, [
      payloadTemplate,
      { ...payloadTemplate, kind: 'revision', attemptsUsed: 2, attemptsLeft: 1 },
    ]);
  });
});

describe('adversarial seeded property fuzz: diagnostic and practice outcomes', () => {
  it('parseDiagnosticNext only ever returns a shaped variant or throws ContractError', () => {
    runParserFuzz('parseDiagnosticNext', parseDiagnosticNext, shapeDiagnosticNext, 0x5eed0006, [
      diagnosticPendingTemplate,
      diagnosticDoneTemplate,
      {
        done: false,
        question: questionTemplate,
        progress: { asked: 1, maxQuestions: 6 },
        answers: [
          {
            attemptNo: 1,
            promptWord: 'travel',
            questionText: 'Where would you like to travel?',
            transcript: 'Spain.',
            score: 82,
            passed: true,
            feedback: 'Clear.',
          },
        ],
      },
    ]);
  });

  it('parseDiagnosticAnswerResult only ever returns a shaped answer or throws ContractError', () => {
    runParserFuzz(
      'parseDiagnosticAnswerResult',
      parseDiagnosticAnswerResult,
      shapeDiagnosticAnswer,
      0x5eed0007,
      [
        diagnosticAnswerPendingTemplate,
        diagnosticAnswerDoneTemplate,
        {
          passed: false,
          score: 0,
          transcript: '',
          feedback: 'We could not hear any speech.',
          done: false,
          noSpeech: true,
          nextQuestion: questionTemplate,
        },
      ],
    );
  });

  it('parseAttemptResult only ever returns a shaped attempt or throws ContractError', () => {
    runParserFuzz('parseAttemptResult', parseAttemptResult, shapeAttempt, 0x5eed0008, [
      attemptPassedTemplate,
      attemptRetryTemplate,
      attemptFinalTemplate,
      attemptSilentTemplate,
    ]);
  });

  it('parseNativeAttemptResult only ever returns a shaped native result or throws ContractError', () => {
    runParserFuzz('parseNativeAttemptResult', parseNativeAttemptResult, shapeNative, 0x5eed0009, [
      nativeSpokenTemplate,
      nativeSilentTemplate,
      {
        ...nativeSpokenTemplate,
        understood: false,
        attemptNo: 3,
        attemptsLeft: 0,
        next: payloadTemplate,
      },
    ]);
  });

  it('parseHelpContent only ever returns a shaped help payload or throws ContractError', () => {
    runParserFuzz('parseHelpContent', parseHelpContent, shapeHelp, 0x5eed000a, [helpTemplate]);
  });

  it('parsePracticeStats only ever returns a shaped stats snapshot or throws ContractError', () => {
    runParserFuzz('parsePracticeStats', parsePracticeStats, shapeStats, 0x5eed000b, [
      statsTemplate,
      {
        level: null,
        progress: { masteredCount: 0, learningCount: 0, totalAtLevel: 0, dueCount: 0 },
        streakDays: 0,
        practicedToday: 0,
        totalAttempts: 0,
        lastPracticedAt: null,
      },
    ]);
  });

  it('parsePracticeHistory only ever returns a shaped page or throws ContractError', () => {
    runParserFuzz('parsePracticeHistory', parsePracticeHistory, shapeHistoryPage, 0x5eed000c, [
      historyPageTemplate,
      { items: [], nextCursor: null },
    ]);
  });
});

describe('adversarial seeded property fuzz: recordings, export, and grants', () => {
  it('parseRecordingItem only ever returns a shaped item or throws ContractError', () => {
    runParserFuzz('parseRecordingItem', parseRecordingItem, shapeRecordingItem, 0x5eed000d, [
      recordingItemTemplate,
      { ...recordingItemTemplate, status: 'unavailable', availableAt: null },
    ]);
  });

  it('parseRecordingPage only ever returns a shaped page or throws ContractError', () => {
    runParserFuzz('parseRecordingPage', parseRecordingPage, shapeRecordingPage, 0x5eed000e, [
      recordingPageTemplate,
    ]);
  });

  it('parseRecordingExportPage only ever returns a shaped page or throws ContractError', () => {
    runParserFuzz(
      'parseRecordingExportPage',
      parseRecordingExportPage,
      shapeRecordingExportPage,
      0x5eed000f,
      [recordingExportPageTemplate],
    );
  });

  it('parseUserDataPage only ever returns a shaped export page or throws ContractError', () => {
    runParserFuzz('parseUserDataPage', parseUserDataPage, shapeUserDataPage, 0x5eed0010, [
      userDataPageTemplate,
    ]);
  });

  it('parseRecordingPlaybackGrant only ever returns a shaped grant or throws ContractError', () => {
    runParserFuzz(
      'parseRecordingPlaybackGrant',
      parseRecordingPlaybackGrant,
      shapePlaybackGrant,
      0x5eed0011,
      [playbackGrantTemplate],
    );
  });

  it('parseAudioUploadGrant only ever returns a shaped grant or throws ContractError', () => {
    runParserFuzz('parseAudioUploadGrant', parseAudioUploadGrant, shapeAudioGrant, 0x5eed0012, [
      audioGrantS3Template,
      audioGrantDirectTemplate,
      {
        ...audioGrantS3Template,
        assessmentEndpoint: '/diagnostic/answer',
        uploadUrl: 'https://bucket.s3.us-east-1.amazonaws.com/',
        uploadFields: {
          key: DIAGNOSTIC_AUDIO_KEY,
          'Content-Type': 'audio/mp4',
          Policy: 'signed-policy',
        },
        audioKey: DIAGNOSTIC_AUDIO_KEY,
      },
    ]);
  });

  it('parsePendingAssessment returns null or a shaped handoff and never throws', () => {
    const templates = [
      pendingPracticeTemplate,
      pendingDiagnosticTemplate,
      pendingS3Template,
      pendingFeedbackTemplate,
    ];
    expectNullOrShape(
      'parsePendingAssessment',
      parsePendingAssessment,
      shapePending,
      junkCorpus(0x5eed0013),
      'junk seed=0x5eed0013',
    );
    const blobSeed = 0x5eed213;
    expectNullOrShape(
      'parsePendingAssessment',
      parsePendingAssessment,
      shapePending,
      pendingBlobCorpus(blobSeed, templates),
      `blob seed=0x${blobSeed.toString(16)}`,
    );
    expect(shapePending(parsePendingAssessment(pendingPracticeTemplate))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Section 2: cross-field invariant attacks (each attack has a passing control)
// ---------------------------------------------------------------------------

describe('cross-field invariant attacks', () => {
  it('rejects mastered=true with score 74 and mastered=false with score 75', () => {
    expectContractError(() => parseAttemptResult({ ...attemptPassedTemplate, score: 74 }));
    expectContractError(() =>
      parseAttemptResult({ ...attemptPassedTemplate, score: 75, mastered: false }),
    );
    expect(parseAttemptResult({ ...attemptPassedTemplate, score: 75 })).toMatchObject({
      score: 75,
      mastered: true,
    });
    expect(
      parseAttemptResult({
        ...attemptPassedTemplate,
        score: 74,
        mastered: false,
        levelUp: undefined,
      }),
    ).toMatchObject({ score: 74, mastered: false });
  });

  it('rejects a levelUp on a pass that did not master the word, even onto the served level', () => {
    const nonMasteredPass = {
      cycleId: CYCLE,
      passed: true,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 0,
      score: 70,
      transcript: 'An answer.',
      feedback: 'Good.',
      next: payloadTemplate,
    };
    expectContractError(() =>
      parseAttemptResult({ ...nonMasteredPass, levelUp: { from: 'B1', to: 'B2' } }),
    );
    expectContractError(() =>
      parseAttemptResult({
        ...nonMasteredPass,
        next: promotedPayloadTemplate,
        levelUp: { from: 'B1', to: 'B2' },
      }),
    );
    expect(parseAttemptResult(nonMasteredPass)).toEqual(nonMasteredPass);
  });

  it('rejects noSpeech that carries scored-attempt fields', () => {
    expectContractError(() =>
      parseAttemptResult({ ...attemptSilentTemplate, transcript: 'a few words' }),
    );
    expectContractError(() => parseAttemptResult({ ...attemptSilentTemplate, transcript: '   ' }));
    expectContractError(() => parseAttemptResult({ ...attemptSilentTemplate, score: 1 }));
    expectContractError(() =>
      parseAttemptResult({ ...attemptSilentTemplate, finalFeedback: 'Final words.' }),
    );
    expect(parseAttemptResult(attemptSilentTemplate)).toEqual(attemptSilentTemplate);
  });

  it('rejects a pass that still advertises attempts left', () => {
    expectContractError(() => parseAttemptResult({ ...attemptPassedTemplate, attemptsLeft: 2 }));
    expectContractError(() => parseAttemptResult({ ...attemptPassedTemplate, attemptsLeft: 1 }));
    expect(parseAttemptResult(attemptPassedTemplate)).toEqual(attemptPassedTemplate);
  });

  it('rejects a promotion whose next question is not from levelUp.to', () => {
    expectContractError(() =>
      parseAttemptResult({ ...attemptPassedTemplate, next: payloadTemplate }),
    );
    expect(parseAttemptResult(attemptPassedTemplate)).toMatchObject({
      levelUp: { from: 'B1', to: 'B2' },
    });
  });

  it('rejects a diagnostic noSpeech answer without nextQuestion', () => {
    const silentDiagnostic = {
      passed: false,
      score: 0,
      transcript: '',
      feedback: 'We could not hear any speech.',
      done: false,
      noSpeech: true,
    };
    expectContractError(() => parseDiagnosticAnswerResult(silentDiagnostic));
    expect(
      parseDiagnosticAnswerResult({ ...silentDiagnostic, nextQuestion: questionTemplate }),
    ).toMatchObject({ noSpeech: true });
    expect(
      parseDiagnosticAnswerResult({
        ...silentDiagnostic,
        nextQuestion: questionTemplate,
        recordingId: U4,
      }),
    ).toMatchObject({ recordingId: U4 });
  });

  it('rejects diagnostic-next discriminants that mix done and pending fields', () => {
    expectContractError(() =>
      parseDiagnosticNext({ done: true, level: 'B1', question: questionTemplate }),
    );
    expectContractError(() =>
      parseDiagnosticNext({ done: true, level: 'B1', progress: { asked: 0, maxQuestions: 6 } }),
    );
    expectContractError(() => parseDiagnosticNext({ ...diagnosticPendingTemplate, level: 'B1' }));
    expect(parseDiagnosticNext(diagnosticDoneTemplate)).toEqual(diagnosticDoneTemplate);
  });

  it('rejects attemptNo 0, 4, 1.5, NaN, and Infinity (NaN/Infinity fed as literals)', () => {
    for (const attemptNo of [0, 4, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectContractError(() =>
        parseAttemptResult({ ...attemptRetryTemplate, attemptNo, attemptsLeft: 2 }),
      );
      expectContractError(() => parseNativeAttemptResult({ ...nativeSpokenTemplate, attemptNo }));
    }
    expect(parseAttemptResult(attemptRetryTemplate)).toEqual(attemptRetryTemplate);
  });

  it('rejects scored retries whose attemptsLeft breaks the 3-attemptNo budget', () => {
    expectContractError(() =>
      parseAttemptResult({ ...attemptRetryTemplate, attemptNo: 1, attemptsLeft: 1 }),
    );
    expectContractError(() =>
      parseAttemptResult({ ...attemptRetryTemplate, attemptNo: 2, attemptsLeft: 2 }),
    );
    expect(
      parseAttemptResult({ ...attemptRetryTemplate, attemptNo: 2, attemptsLeft: 1 }),
    ).toMatchObject({ attemptNo: 2, attemptsLeft: 1 });
  });

  it('rejects silent attempts whose attemptsLeft breaks the free-retry budget', () => {
    expectContractError(() => parseAttemptResult({ ...attemptSilentTemplate, attemptsLeft: 1 }));
    expect(
      parseAttemptResult({ ...attemptSilentTemplate, attemptNo: 3, attemptsLeft: 1 }),
    ).toMatchObject({ attemptNo: 3, attemptsLeft: 1 });
  });

  it('rejects passed flags that disagree with the 60-point threshold', () => {
    expectContractError(() => parseAttemptResult({ ...attemptRetryTemplate, passed: true }));
    const missAt59 = {
      cycleId: CYCLE,
      passed: false,
      mastered: false,
      attemptNo: 1,
      attemptsLeft: 2,
      score: 59,
      transcript: 'An answer.',
      feedback: 'Try.',
    };
    expect(parseAttemptResult(missAt59)).toEqual(missAt59);
    expectContractError(() =>
      parseAttemptResult({
        ...missAt59,
        passed: true,
        mastered: false,
        attemptsLeft: 0,
        score: 59,
        next: payloadTemplate,
      }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({ ...diagnosticAnswerDoneTemplate, passed: false, score: 82 }),
    );
  });

  it('rejects native attempts that break the shared three-try budget', () => {
    expectContractError(() =>
      parseNativeAttemptResult({ ...nativeSpokenTemplate, attemptsLeft: 1 }),
    );
    expect(parseNativeAttemptResult(nativeSpokenTemplate)).toEqual(nativeSpokenTemplate);
    expectContractError(() =>
      parseNativeAttemptResult({ ...nativeSilentTemplate, attemptsLeft: 2 }),
    );
    const nativeFinal = {
      ...nativeSpokenTemplate,
      attemptNo: 3,
      attemptsLeft: 0,
      next: payloadTemplate,
    };
    expect(parseNativeAttemptResult(nativeFinal)).toEqual(nativeFinal);
    expectContractError(() =>
      parseNativeAttemptResult({ ...nativeSpokenTemplate, attemptNo: 3, attemptsLeft: 0 }),
    );
  });

  it('rejects history rows whose passed flag disagrees with their score or context shape', () => {
    expectContractError(() =>
      parsePracticeHistory({
        items: [{ ...historyPracticeItem, score: 60, passed: false }],
        nextCursor: null,
      }),
    );
    expect(
      parsePracticeHistory({
        items: [{ ...historyPracticeItem, score: 60, passed: true }],
        nextCursor: null,
      }),
    ).toMatchObject({ items: [{ ...historyPracticeItem, score: 60, passed: true }] });
    expectContractError(() =>
      parsePracticeHistory({
        items: [{ ...historyPracticeItem, understood: true }],
        nextCursor: null,
      }),
    );
    expectContractError(() =>
      parsePracticeHistory({
        items: [{ ...historyDiagnosticItem, cycleId: CYCLE }],
        nextCursor: null,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Section 3: hostile S3/audio upload-grant attacks
// ---------------------------------------------------------------------------

describe('hostile S3 upload-grant attacks', () => {
  const s3Grant = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...audioGrantS3Template,
    ...overrides,
  });
  const withAudioKey = (audioKey: string): Record<string, unknown> => ({
    ...audioGrantS3Template,
    audioKey,
    uploadFields: {
      ...(audioGrantS3Template.uploadFields as Record<string, string>),
      key: audioKey,
    },
  });

  it.each([
    'https://evilamazonaws.com/',
    'https://s3.us-east-1.amazonaws.com.evil.com/',
    'https://bucket.s3.amazonaws.com@evil.com/',
    'https://amazonaws.com.evil.com/',
    'https://bucket.s3-website-us-east-1.amazonaws.com/',
    'https://notamazonaws.com.attacker.tld/',
    'https://amazonaws.com./',
    'https://bucket.s3.us-east-1.attackers.com/',
    'https://execute-api.us-east-1.amazonaws.com/',
    'http://bucket.s3.us-east-1.amazonaws.com/',
    'https://user@bucket.s3.amazonaws.com/',
    'https://user:secret@bucket.s3.amazonaws.com/',
    'https://bucket.s3.amazonaws.com/?X-Amz-Signature=stolen',
    'https://bucket.s3.amazonaws.com/#fragment',
  ])('rejects the hostile or lookalike upload destination %s', (uploadUrl) => {
    expectContractError(() => parseAudioUploadGrant(s3Grant({ uploadUrl })));
  });

  it.each([
    ['an uppercase host the URL parser normalizes', 'https://S3.US-EAST-1.AMAZONAWS.COM/'],
    ['a path-style endpoint', 'https://s3.us-east-1.amazonaws.com/bucket'],
    ['a dualstack endpoint', 'https://bucket.s3.dualstack.us-east-1.amazonaws.com/'],
    ['a dash-region endpoint', 'https://bucket.s3-us-east-1.amazonaws.com/'],
    ['a host without a trailing slash', 'https://bucket.s3.amazonaws.com'],
    ['percent-encoded dots decoding to the genuine host', 'https://bucket%2Es3.amazonaws.com/'],
    [
      'an explicit port on a genuine S3 host (hostname excludes port — documented)',
      'https://bucket.s3.amazonaws.com:8443/',
    ],
    [
      'an arbitrary pathname (only the host is pinned)',
      'https://bucket.s3.us-east-1.amazonaws.com/a/b/../c',
    ],
  ])('documents the accepted S3 destination with %s', (_label, uploadUrl) => {
    expect(parseAudioUploadGrant(s3Grant({ uploadUrl }))).toMatchObject({ uploadUrl });
  });

  it.each([
    ['a lowercase reserved file field', { file: 'reserved' }],
    ['an uppercase reserved file field', { FILE: 'reserved' }],
    ['a capitalized reserved file field', { File: 'reserved' }],
    ['a mixed-case reserved file field', { fIlE: 'reserved' }],
    ['a constructor key', { constructor: 'reserved' }],
    ['a prototype key', { prototype: 'reserved' }],
    ['a key containing a space', { 'invalid key': 'value' }],
    ['a 129-character key', { [`${'k'.repeat(129)}`]: 'value' }],
    ['an 8193-character value', { long: 'v'.repeat(8_193) }],
    ['a non-string value', { key: 42 }],
    ['a whitespace-only value', { key: '   ' }],
  ])('rejects signed multipart fields with %s', (_label, extraFields) => {
    expectContractError(() =>
      parseAudioUploadGrant(
        s3Grant({
          uploadFields: {
            ...(audioGrantS3Template.uploadFields as Record<string, string>),
            ...extraFields,
          },
        }),
      ),
    );
  });

  it('rejects an own __proto__ smuggled field and a lone key field', () => {
    // Object.defineProperty is the only reliable way to plant a real own
    // "__proto__" key: Babel's object-spread helper (unlike native spread)
    // deliberately skips __proto__ assignments.
    const protoFields = {
      ...(audioGrantS3Template.uploadFields as Record<string, string>),
    };
    Object.defineProperty(protoFields, '__proto__', { value: 'reserved', enumerable: true });
    expect(Object.hasOwn(protoFields, '__proto__')).toBe(true);
    expectContractError(() => parseAudioUploadGrant(s3Grant({ uploadFields: protoFields })));
    expectContractError(() =>
      parseAudioUploadGrant(s3Grant({ uploadFields: { key: PRACTICE_AUDIO_KEY } })),
    );
  });

  it('requires the exact Content-Type spelling among the signed fields', () => {
    expectContractError(() =>
      parseAudioUploadGrant(
        s3Grant({
          uploadFields: { key: PRACTICE_AUDIO_KEY, 'content-type': 'audio/mp4' },
        }),
      ),
    );
  });

  it('bounds the field count at 32, value length at 8192, and aggregate size at 32768', () => {
    const thirtyTwo: Record<string, string> = {
      key: PRACTICE_AUDIO_KEY,
      'Content-Type': 'audio/mp4',
    };
    for (let index = 0; index < 30; index += 1) thirtyTwo[`x${index}`] = 'v';
    expect(parseAudioUploadGrant(s3Grant({ uploadFields: thirtyTwo }))).toMatchObject({
      mode: 's3',
    });
    expectContractError(() =>
      parseAudioUploadGrant(s3Grant({ uploadFields: { ...thirtyTwo, overflow: 'v' } })),
    );
    expect(
      parseAudioUploadGrant(
        s3Grant({
          uploadFields: {
            key: PRACTICE_AUDIO_KEY,
            'Content-Type': 'audio/mp4',
            long: 'v'.repeat(8_192),
          },
        }),
      ),
    ).toMatchObject({ mode: 's3' });
    const fixedLength =
      'key'.length + PRACTICE_AUDIO_KEY.length + 'Content-Type'.length + 'audio/mp4'.length;
    const paddingKeys = ['p0', 'p1', 'p2', 'p3'];
    const finalPaddingLength = 32_768 - fixedLength - paddingKeys.join('').length - 3 * 8_192;
    const boundary: Record<string, string> = {
      key: PRACTICE_AUDIO_KEY,
      'Content-Type': 'audio/mp4',
    };
    for (const [index, key] of paddingKeys.entries()) {
      boundary[key] = 'x'.repeat(index < 3 ? 8_192 : finalPaddingLength);
    }
    expect(parseAudioUploadGrant(s3Grant({ uploadFields: boundary }))).toMatchObject({
      mode: 's3',
    });
    expectContractError(() =>
      parseAudioUploadGrant(
        s3Grant({ uploadFields: { ...boundary, p3: `${boundary.p3 as string}x` } }),
      ),
    );
  });

  it('rejects reserved keys smuggled through a null-prototype field map', () => {
    for (const reserved of ['__proto__', 'constructor', 'prototype']) {
      const uploadFields = Object.create(null) as Record<string, string>;
      Object.assign(uploadFields, audioGrantS3Template.uploadFields as Record<string, string>);
      Object.defineProperty(uploadFields, reserved, { value: 'reserved', enumerable: true });
      expectContractError(() => parseAudioUploadGrant(s3Grant({ uploadFields })));
    }
  });

  it('documents the UUID version pin on audio keys: versions 1..5 pass, 0 and 9 fail', () => {
    const v1Key = `audio-uploads/practice/${U1}/550e8400-e29b-11d4-a716-446655440003.m4a`;
    const v5Key = `audio-uploads/practice/${U1}/550e8400-e29b-51d4-a716-446655440003.m4a`;
    const v0Key = `audio-uploads/practice/${U1}/550e8400-e29b-01d4-a716-446655440003.m4a`;
    const v9Key = `audio-uploads/practice/${U1}/550e8400-e29b-91d4-a716-446655440003.m4a`;
    expect(audioKeyBelongsToOwner(v1Key, U1)).toBe(true);
    expect(audioKeyBelongsToOwner(v5Key, U1)).toBe(true);
    expect(audioKeyBelongsToOwner(v0Key, U1)).toBe(false);
    expect(audioKeyBelongsToOwner(v9Key, U1)).toBe(false);
    expect(parseAudioUploadGrant(withAudioKey(v1Key))).toMatchObject({ audioKey: v1Key });
  });

  it('pins audio key ownership case-insensitively and rejects other owners', () => {
    const foreignKey = `audio-uploads/practice/${U9}/${U4}.m4a`;
    expect(audioKeyBelongsToOwner(foreignKey, U1)).toBe(false);
    expect(audioKeyBelongsToOwner(PRACTICE_AUDIO_KEY.toUpperCase(), U1)).toBe(true);
    expect(audioKeyBelongsToOwner(PRACTICE_AUDIO_KEY, U1.toUpperCase())).toBe(true);
  });

  it('rejects scope, endpoint, and string-like forgeries against the key helpers', () => {
    expect(audioKeyMatchesAssessmentEndpoint(DIAGNOSTIC_AUDIO_KEY, '/practice/attempt')).toBe(
      false,
    );
    expect(audioKeyMatchesAssessmentEndpoint(PRACTICE_AUDIO_KEY, '/diagnostic/answer')).toBe(false);
    expect(audioKeyMatchesAssessmentEndpoint(PRACTICE_AUDIO_KEY, '/practice/attempt/native')).toBe(
      true,
    );
    expect(
      audioKeyMatchesAssessmentEndpoint(
        PRACTICE_AUDIO_KEY,
        '/PRACTICE/ATTEMPT' as '/practice/attempt',
      ),
    ).toBe(false);
    const toString = jest.fn(() => PRACTICE_AUDIO_KEY);
    const forgedKey = { toString } as unknown as string;
    expect(() => audioKeyBelongsToOwner(forgedKey, U1)).not.toThrow();
    expect(audioKeyBelongsToOwner(forgedKey, U1)).toBe(false);
    expect(toString).not.toHaveBeenCalled();
  });

  it.each([
    // The server never derives a .mp4 or .oga key, and a key extension must
    // match the grant's content type.
    ['mp4', 'video/mp4'],
    ['oga', 'application/ogg'],
    ['wav', 'audio/webm'],
    ['webm', 'audio/wav'],
    ['m4a', 'audio/wav'],
    ['mp3', 'audio/ogg'],
    ['ogg', 'audio/mpeg'],
    ['flac', 'audio/webm'],
  ])(
    'rejects the never-issued or mismatched .%s key for content type %s',
    (extension, contentType) => {
      const audioKey = PRACTICE_AUDIO_KEY.replace(/\.m4a$/, `.${extension}`);
      expectContractError(() =>
        parseAudioUploadGrant(
          s3Grant({
            audioKey,
            contentType,
            uploadFields: { key: audioKey, 'Content-Type': contentType },
          }),
        ),
      );
    },
  );

  it.each([
    ['m4a', 'audio/x-m4a'],
    ['mp3', 'audio/mpeg'],
    ['flac', 'audio/x-flac'],
    ['m4a', 'video/mp4'],
    ['wav', 'audio/wave'],
  ])('accepts the server-issuable .%s key for content type %s', (extension, contentType) => {
    const audioKey = PRACTICE_AUDIO_KEY.replace(/\.m4a$/, `.${extension}`);
    expect(
      parseAudioUploadGrant(
        s3Grant({
          audioKey,
          contentType,
          uploadFields: { key: audioKey, 'Content-Type': contentType },
        }),
      ),
    ).toMatchObject({ audioKey, contentType });
  });

  it('requires the signed key field to equal the grant audio key exactly (case included)', () => {
    expectContractError(() =>
      parseAudioUploadGrant(
        s3Grant({
          uploadFields: {
            ...(audioGrantS3Template.uploadFields as Record<string, string>),
            key: PRACTICE_AUDIO_KEY.toUpperCase(),
          },
        }),
      ),
    );
    expect(parseAudioUploadGrant(withAudioKey(PRACTICE_AUDIO_KEY.toUpperCase()))).toMatchObject({
      audioKey: PRACTICE_AUDIO_KEY.toUpperCase(),
    });
  });

  it('rejects traversal suffixes riding behind a well-formed key prefix', () => {
    expectContractError(() =>
      parseAudioUploadGrant(withAudioKey(`${PRACTICE_AUDIO_KEY}/../../${U9}/steal.m4a`)),
    );
    expectContractError(() => parseAudioUploadGrant(withAudioKey(`junk/${PRACTICE_AUDIO_KEY}`)));
    expectContractError(() => parseAudioUploadGrant(withAudioKey(`${PRACTICE_AUDIO_KEY}/junk`)));
  });

  it.each([59, 3_601, 0, -60, 60.5, '900', Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the out-of-contract grant lifetime %p',
    (expiresIn) => {
      expectContractError(() => parseAudioUploadGrant(s3Grant({ expiresIn })));
    },
  );

  it.each([60, 900, 3_600])('accepts the upload-grant lifetime boundary %i', (expiresIn) => {
    expect(parseAudioUploadGrant(s3Grant({ expiresIn }))).toMatchObject({ expiresIn });
  });

  it.each([0, -1, 1.5, 25 * 1024 * 1024 + 1, Number.NaN])(
    'rejects the out-of-contract byte ceiling %p',
    (maxBytes) => {
      expectContractError(() => parseAudioUploadGrant(s3Grant({ maxBytes })));
    },
  );

  it.each([1, 25 * 1024 * 1024])('accepts the upload byte boundary %i', (maxBytes) => {
    expect(parseAudioUploadGrant(s3Grant({ maxBytes }))).toMatchObject({ maxBytes });
  });

  it.each([
    ['an uppercase mode', { mode: 'S3' }],
    ['an uppercase endpoint', { assessmentEndpoint: '/DIAGNOSTIC/ANSWER' }],
    ['an unknown endpoint', { assessmentEndpoint: '/practice/answer' }],
    ['a missing endpoint', { assessmentEndpoint: undefined }],
  ])('rejects the grant envelope with %s', (_label, overrides) => {
    expectContractError(() => parseAudioUploadGrant(s3Grant(overrides)));
  });

  it('echoes the endpoint and strips unknown fields from a direct grant', () => {
    expect(
      parseAudioUploadGrant({ ...audioGrantDirectTemplate, extra: 'x', uploadUrl: 'https://x/' }),
    ).toStrictEqual({ mode: 'direct', assessmentEndpoint: '/diagnostic/answer' });
  });
});

// ---------------------------------------------------------------------------
// Section 4: playback grant attacks
// ---------------------------------------------------------------------------

describe('playback grant attacks', () => {
  const recordingId = playbackGrantTemplate.recordingId;
  const grant = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    ...playbackGrantTemplate,
    ...overrides,
  });

  it.each([
    ['cleartext transport', signedPlaybackUrl({ protocol: 'http' })],
    ['a non-AWS host', signedPlaybackUrl({ authority: 'attacker.example' })],
    [
      'a userinfo host confusion',
      signedPlaybackUrl({ authority: 'user@private.s3.us-west-1.amazonaws.com' }),
    ],
    [
      'a password component',
      signedPlaybackUrl({ authority: ':secret@private.s3.us-west-1.amazonaws.com' }),
    ],
    ['a fragment', signedPlaybackUrl({ fragment: '#fragment' })],
    ['the wrong signing algorithm', signedPlaybackUrl({ algorithm: 'AWS3' })],
    ['no algorithm', signedPlaybackUrl({ algorithm: '' })],
    ['no credential', signedPlaybackUrl({ credential: '' })],
    ['a non-numeric expiry', signedPlaybackUrl({ expiresValue: 'abc' })],
    [
      'an uppercase expiry parameter name',
      `https://private.s3.us-west-1.amazonaws.com/object?X-AMZ-EXPIRES=60`,
    ],
    ['a mismatched signed expiry', signedPlaybackUrl({ expiresValue: '61' })],
    ['invalid URL syntax', 'https://['],
    ['a non-URL string', 'not a url at all'],
  ])('rejects the hostile playback URL with %s', (_label, playbackUrl) => {
    expectContractError(() => parseRecordingPlaybackGrant(grant({ playbackUrl })));
  });

  it.each([29, 301, 60.5, '60', Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the playback envelope lifetime %p',
    (expiresIn) => {
      expectContractError(() => parseRecordingPlaybackGrant(grant({ expiresIn })));
    },
  );

  it('accepts both playback lifetime boundaries with matching signed expiry', () => {
    for (const expiresIn of [30, 300]) {
      expect(
        parseRecordingPlaybackGrant(
          grant({ expiresIn, playbackUrl: signedPlaybackUrl({ expiresValue: String(expiresIn) }) }),
        ),
      ).toStrictEqual(
        grant({ expiresIn, playbackUrl: signedPlaybackUrl({ expiresValue: String(expiresIn) }) }),
      );
    }
  });

  it('documents that non-canonical numeric expiry spellings coerce through Number()', () => {
    // '+60' (percent-encoded %2B60), ' 60' (%20), and '60.0' all coerce to 60
    // before the equality check, so they match an expiresIn of 60. S3 itself
    // would reject non-canonical forms; the parser is marginally more lenient.
    for (const expiresValue of ['+60', ' 60', '60.0']) {
      expect(
        parseRecordingPlaybackGrant(grant({ playbackUrl: signedPlaybackUrl({ expiresValue }) })),
      ).toMatchObject({ expiresIn: 60 });
    }
  });

  it('documents that a duplicated expiry parameter resolves to its first value', () => {
    // URLSearchParams.get returns the first occurrence; a trailing second
    // X-Amz-Expires cannot lower or raise the effective signed expiry.
    expect(
      parseRecordingPlaybackGrant(
        grant({ playbackUrl: signedPlaybackUrl({ extra: '&X-Amz-Expires=30' }) }),
      ),
    ).toMatchObject({ expiresIn: 60 });
  });

  it('pins the playback grant to the requested recording id', () => {
    expectContractError(() =>
      parseRecordingPlaybackGrant(grant(), '550e8400-e29b-41d4-a716-446655440061'),
    );
    expectContractError(() => parseRecordingPlaybackGrant(grant({ recordingId: 'not-a-uuid' })));
    expect(parseRecordingPlaybackGrant(grant(), recordingId)).toMatchObject({ recordingId });
  });

  it('accepts a fully signed playback URL exactly at the 16384-unit cap', () => {
    const query = signedPlaybackUrl().slice(signedPlaybackUrl().indexOf('?'));
    const prefix = 'https://private.s3.us-west-1.amazonaws.com/';
    const playbackUrl = `${prefix}${'x'.repeat(16_384 - prefix.length - query.length)}${query}`;
    expect(playbackUrl).toHaveLength(16_384);
    expect(parseRecordingPlaybackGrant(grant({ playbackUrl }))).toMatchObject({ playbackUrl });
  });
});

// ---------------------------------------------------------------------------
// Section 5: unicode rendering-safety probe
// ---------------------------------------------------------------------------

describe('unicode rendering-safety probe', () => {
  it('measures UI strings in UTF-16 units: 50 astral emoji (100 units) pass, 101 units throw', () => {
    const exact = '😀'.repeat(50);
    expect(exact).toHaveLength(100);
    expect(parseQuestion({ ...questionTemplate, promptWord: exact })).toMatchObject({
      promptWord: exact,
    });
    expectContractError(() => parseQuestion({ ...questionTemplate, promptWord: `${exact}a` }));
    expect(parseUser({ ...userTemplate, name: '😀'.repeat(50) })).toMatchObject({
      name: '😀'.repeat(50),
    });
    expectContractError(() => parseUser({ ...userTemplate, name: '😀'.repeat(51) }));
  });

  it('passes bidi and control characters through verbatim (a rendering concern, not a parse concern)', () => {
    const bidi = '\u202Eevil\u202E read backwards\u200F';
    const poisoned = {
      ...questionTemplate,
      promptWord: bidi,
      questionText: `${bidi}\u2066embedded\u2029here`,
    };
    expect(parseQuestion(poisoned)).toEqual(poisoned);
    const helpBidi = {
      ...helpTemplate,
      promptWordNative: bidi,
      questionTextNative: `${bidi}\u200F`,
    };
    expect(parseHelpContent(helpBidi)).toEqual(helpBidi);
    const spoken = { ...attemptRetryTemplate, transcript: bidi, feedback: bidi };
    expect(parseAttemptResult(spoken)).toEqual(spoken);
    const answered = { ...diagnosticAnswerDoneTemplate, transcript: bidi };
    expect(parseDiagnosticAnswerResult(answered)).toEqual(answered);
  });

  it('tolerates lone surrogate code units decoded from JSON escapes', () => {
    const loneSurrogate = JSON.parse('"\\uD800"') as string;
    expect(loneSurrogate).toHaveLength(1);
    const promptWord = loneSurrogate.repeat(100);
    const parsed = parseQuestion({ ...questionTemplate, promptWord });
    expect(parsed.promptWord).toHaveLength(100);
    expect(parsed.promptWord).toBe(promptWord);
    expectContractError(() =>
      parseQuestion({ ...questionTemplate, promptWord: loneSurrogate.repeat(101) }),
    );
  });

  it('rejects whitespace-class-only strings (NBSP, U+2028, U+3000) as blank while zero-width U+200B passes', () => {
    expectContractError(() =>
      parseQuestion({ ...questionTemplate, promptWord: '\u00A0'.repeat(50) }),
    );
    expectContractError(() =>
      parseQuestion({ ...questionTemplate, promptWord: '\u2028'.repeat(50) }),
    );
    expectContractError(() =>
      parseQuestion({ ...questionTemplate, promptWord: '\u3000'.repeat(50) }),
    );
    expectContractError(() =>
      parseDiagnosticAnswerResult({
        ...diagnosticAnswerDoneTemplate,
        feedback: '\u00A0'.repeat(50),
      }),
    );
    expect(parseQuestion({ ...questionTemplate, promptWord: '\u200B'.repeat(50) }).promptWord).toBe(
      '\u200B'.repeat(50),
    );
  });

  it('resolves duplicate JSON keys last-wins, so a trailing blank promptWord is rejected', () => {
    const validThenBlank = JSON.parse(
      `{"id":"${U2}","cefrLevel":"B1","promptWord":"travel","promptWord":"   ","questionText":"Q?"}`,
    );
    expectContractError(() => parseQuestion(validThenBlank));
    const blankThenValid = JSON.parse(
      `{"id":"${U2}","cefrLevel":"B1","promptWord":"   ","promptWord":"travel","questionText":"Q?"}`,
    );
    expect(parseQuestion(blankThenValid)).toMatchObject({ promptWord: 'travel' });
  });
});

// ---------------------------------------------------------------------------
// Section 6: corrupted durable pending-assessment blobs
// ---------------------------------------------------------------------------

describe('parsePendingAssessment corrupted blobs', () => {
  function withoutKeys(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    const copy = { ...source };
    for (const key of keys) delete copy[key];
    return copy;
  }

  const base = pendingPracticeTemplate as unknown as Record<string, unknown>;
  const createdAt = base.createdAt as number;

  it.each([
    ['an unknown stage', { ...base, stage: 'done' }],
    [
      'a missing stage normalized away from a bogus delivery',
      withoutKeys({ ...base, delivery: 'bogus' }, ['stage']),
    ],
    ['a practice blob without its cycle', withoutKeys(base, ['cycleId'])],
    ['a practice blob with a null cycle', { ...base, cycleId: null }],
    ['a practice blob with a non-uuid cycle', { ...base, cycleId: 'nope' }],
    ['a diagnostic blob carrying a cycle', { ...pendingDiagnosticTemplate, cycleId: CYCLE }],
    ['a diagnostic blob carrying a null cycle', { ...pendingDiagnosticTemplate, cycleId: null }],
    ['a feedback-pending blob missing its ready timestamp', { ...base, stage: 'feedback-pending' }],
    [
      'a feedback-ready timestamp before creation',
      { ...base, stage: 'feedback-pending', feedbackReadyAt: createdAt - 1 },
    ],
    [
      'a fractional feedback-ready timestamp',
      { ...base, stage: 'feedback-pending', feedbackReadyAt: createdAt + 0.5 },
    ],
    ['a feedback-ready timestamp on a prepared blob', { ...base, feedbackReadyAt: createdAt }],
    ['an s3-granted blob without an audio key', { ...base, stage: 's3-granted' }],
    [
      'an s3-granted blob whose key belongs to another owner',
      { ...base, stage: 's3-granted', audioKey: `audio-uploads/practice/${U9}/${U4}.m4a` },
    ],
    [
      'an s3-granted blob whose key scope mismatches the endpoint',
      { ...base, stage: 's3-granted', audioKey: DIAGNOSTIC_AUDIO_KEY },
    ],
    ['an s3-granted blob with a malformed key', { ...base, stage: 's3-granted', audioKey: 'junk' }],
    ['a fourth recovery post attempt', { ...base, recoveryPostAttempts: 4 }],
    ['a negative recovery post count', { ...base, recoveryPostAttempts: -1 }],
    ['a fractional recovery post count', { ...base, recoveryPostAttempts: 1.5 }],
    ['a NaN creation timestamp', { ...base, createdAt: Number.NaN }],
    ['an infinite creation timestamp', { ...base, createdAt: Number.POSITIVE_INFINITY }],
    ['a zero creation timestamp', { ...base, createdAt: 0 }],
    ['a negative creation timestamp', { ...base, createdAt: -1 }],
    ['a string creation timestamp', { ...base, createdAt: '1700000000000' }],
    ['a non-boolean retention choice', { ...base, retainRecording: 'yes' }],
    ['a non-boolean cancel marker', { ...base, cancelRequested: 1 }],
    ['a non-uuid owner', { ...base, ownerId: 'not-a-uuid' }],
    ['a non-uuid request', { ...base, requestId: 'not-a-uuid' }],
    ['a non-uuid question', { ...base, questionId: 'not-a-uuid' }],
    ['an unknown endpoint', { ...base, endpoint: '/practice/answer' }],
    ['an array envelope', [base]],
    ['a bare string', 'pending'],
  ])('rejects the corrupted blob with %s', (_label, blob) => {
    expect(parsePendingAssessment(blob)).toBeNull();
  });

  it('returns null for a coercion-hostile object in a uuid field (fuzz-find regression pin)', () => {
    // Found by the seeded blob corpus: params.ts isUuid used to regex-test
    // its argument without a typeof string guard, so RegExp.test's ToString
    // coercion threw a TypeError on objects whose own toString/valueOf are
    // non-callable. The type-guard now makes every hostile uuid field parse
    // to null, keeping the exported parser's null-or-shape contract.
    const hostileUuid = JSON.parse('{"toString":false,"valueOf":"3","hasOwnProperty":1}');
    expect(
      parsePendingAssessment({ ...pendingPracticeTemplate, questionId: hostileUuid }),
    ).toBeNull();
    // Plain objects stringify safely to '[object Object]' and fail as null.
    expect(
      parsePendingAssessment({ ...pendingPracticeTemplate, questionId: { deep: true } }),
    ).toBeNull();
  });

  it('accepts the recovery-post ceiling of 3 and preserves the explicit marker', () => {
    expect(parsePendingAssessment({ ...base, recoveryPostAttempts: 3 })).toMatchObject({
      recoveryPostAttempts: 3,
    });
    expect(parsePendingAssessment({ ...base, cancelRequested: true })).toMatchObject({
      cancelRequested: true,
    });
  });

  it('normalizes legacy blobs: omitted retention becomes true and delivery maps to stages', () => {
    expect(parsePendingAssessment(withoutKeys(base, ['retainRecording']))).toMatchObject({
      retainRecording: true,
    });
    expect(parsePendingAssessment(withoutKeys(base, ['stage']))).toMatchObject({
      stage: 'direct-posting',
    });
    expect(
      parsePendingAssessment(withoutKeys({ ...base, delivery: 'reconcile' }, ['stage'])),
    ).toMatchObject({ stage: 'reconcile' });
    expect(
      parsePendingAssessment(withoutKeys({ ...base, delivery: 'pending' }, ['stage'])),
    ).toMatchObject({ stage: 'direct-posting' });
    expect(
      parsePendingAssessment({ ...base, stage: 'prepared', delivery: 'reconcile' }),
    ).toMatchObject({ stage: 'prepared' });
  });

  it('drops unknown additive fields and strips an audio key from non-s3 stages', () => {
    expect(parsePendingAssessment({ ...base, futureField: { deep: true } })).toStrictEqual({
      ...base,
    });
    expect(parsePendingAssessment({ ...base, audioKey: PRACTICE_AUDIO_KEY })).toStrictEqual({
      ...base,
    });
  });

  it('accepts a feedback pointer exactly at creation time and a diagnostic s3 handoff', () => {
    expect(
      parsePendingAssessment({ ...base, stage: 'feedback-pending', feedbackReadyAt: createdAt }),
    ).toMatchObject({ stage: 'feedback-pending', feedbackReadyAt: createdAt });
    expect(
      parsePendingAssessment({
        ...(pendingDiagnosticTemplate as unknown as Record<string, unknown>),
        stage: 's3-granted',
        audioKey: DIAGNOSTIC_AUDIO_KEY,
      }),
    ).toMatchObject({ stage: 's3-granted', audioKey: DIAGNOSTIC_AUDIO_KEY });
  });

  it('round-trips a valid handoff through the durable JSON representation', () => {
    expect(
      parsePendingAssessment(JSON.parse(JSON.stringify(pendingS3Template)) as unknown),
    ).toStrictEqual(pendingS3Template);
  });
});

// ---------------------------------------------------------------------------
// Section 7: prototype pollution probe
// ---------------------------------------------------------------------------

describe('prototype pollution probe', () => {
  it('leaves Object.prototype and Array.prototype untouched after every corpus', () => {
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.hasOwn(Array.prototype, 'polluted')).toBe(false);
  });

  it('returns signed multipart fields on a null-prototype record that cannot pollute later', () => {
    const grant = parseAudioUploadGrant(audioGrantS3Template);
    expect(grant.mode).toBe('s3');
    if (grant.mode !== 's3') return;
    expect(Object.getPrototypeOf(grant.uploadFields)).toBeNull();
    (grant.uploadFields as Record<string, string>)['__proto__'] = 'attempted';
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

// Declared last so it executes after every corpus above. originalExpect keeps
// this pin out of the wrapped count, so EXPECTED_ASSERTIONS stays exact.
test('assertion self-count stays pinned', () => {
  originalExpect(assertionCount).toBe(EXPECTED_ASSERTIONS);
});
