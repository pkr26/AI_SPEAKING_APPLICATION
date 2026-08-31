export const REQUIRED_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const REQUIRED_QUESTIONS_PER_LEVEL = 100;

type RequiredCefrLevel = (typeof REQUIRED_CEFR_LEVELS)[number];

const REQUIRED_TRANSLATION_LANGUAGES = ['te', 'hi', 'es', 'zh'] as const;
const PUBLIC_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface QuestionInventoryQuery {
  text: string;
  values: readonly [number];
}

/**
 * Fetch the complete expected catalog plus one overfill sentinel. Returning
 * raw rows is intentional: JavaScript then applies the same UTF-16 length and
 * whitespace semantics as the mobile response parsers.
 */
export function boundedQuestionInventoryQuery(): QuestionInventoryQuery {
  const scanLimit = REQUIRED_CEFR_LEVELS.length * REQUIRED_QUESTIONS_PER_LEVEL + 1;
  return {
    text: `SELECT id, cefr_level, prompt_word, question_text, translations
           FROM questions
           ORDER BY cefr_level
           LIMIT $1`,
    values: [scanLimit],
  };
}

/** Type guard for a plain JSON object; excludes null and arrays. */
function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Type guard against the six required CEFR level literals. */
function isRequiredCefrLevel(value: unknown): value is RequiredCefrLevel {
  return REQUIRED_CEFR_LEVELS.some((level) => value === level);
}

/**
 * Mirrors the mobile parser's string rule exactly: non-blank under JavaScript
 * trim with a UTF-16 `.length` bound, the same semantics migration 015
 * enforces on persisted public strings.
 */
function isBoundedNonEmptyString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
}

/** One translation example: bounded non-empty English and native sentences. */
function isExample(value: unknown): boolean {
  return (
    isJsonRecord(value) && isBoundedNonEmptyString(value.en, 4_000) && isBoundedNonEmptyString(value.native, 4_000)
  );
}

/** One language's translation payload: word, question, and exactly three examples. */
function isTranslation(value: unknown): boolean {
  return (
    isJsonRecord(value) &&
    isBoundedNonEmptyString(value.word, 500) &&
    isBoundedNonEmptyString(value.question, 4_000) &&
    Array.isArray(value.examples) &&
    value.examples.length === 3 &&
    value.examples.every(isExample)
  );
}

/**
 * Full row contract for a runtime catalog question: strict UUID id, bounded
 * non-empty prompt/question text, and a well-formed translation for every
 * required language. Any single deviation marks the whole row malformed so
 * readiness fails closed instead of serving a partially valid question.
 */
function isWellFormedQuestionRow(row: Record<string, unknown>): boolean {
  const translations = row.translations;
  if (
    typeof row.id !== 'string' ||
    !PUBLIC_UUID_PATTERN.test(row.id) ||
    !isBoundedNonEmptyString(row.prompt_word, 100) ||
    !isBoundedNonEmptyString(row.question_text, 1_000) ||
    !isJsonRecord(translations)
  ) {
    return false;
  }
  return REQUIRED_TRANSLATION_LANGUAGES.every((language) => isTranslation(translations[language]));
}

/**
 * Return operator-readable failures for a bounded raw question scan. An empty
 * result means exactly 100 well-formed rows exist for every required level.
 */
export function questionInventoryIssues(rows: readonly unknown[]): string[] {
  const counts = new Map<RequiredCefrLevel, number>(REQUIRED_CEFR_LEVELS.map((level) => [level, 0]));
  let malformedRows = 0;

  for (const candidate of rows) {
    if (!isJsonRecord(candidate) || !isRequiredCefrLevel(candidate.cefr_level)) {
      malformedRows += 1;
      continue;
    }
    const level = candidate.cefr_level;
    counts.set(level, counts.get(level)! + 1);
    if (!isWellFormedQuestionRow(candidate)) malformedRows += 1;
  }

  const issues: string[] = [];
  for (const level of REQUIRED_CEFR_LEVELS) {
    const count = counts.get(level)!;
    if (count !== REQUIRED_QUESTIONS_PER_LEVEL) {
      issues.push(`question inventory ${level}: expected ${REQUIRED_QUESTIONS_PER_LEVEL}, found ${count}`);
    }
  }
  if (malformedRows > 0) issues.push(`malformed question rows: ${malformedRows}`);
  return issues;
}
