// Generates db/seed.sql from db/seed-data.ts.
// Run with: npm run db:generate-seed
import fs from 'fs';
import path from 'path';
import { questions, type QuestionSeed } from './seed-data';

const esc = (s: string) => s.replace(/'/g, "''");

// PostgreSQL text cannot contain NUL. Other C0/C1 controls, bidi controls, and
// invisible formatting marks do not belong in this single-line learning
// catalog and can conceal review mistakes. ZWNJ/ZWJ are deliberately allowed
// in localized text because Telugu and Hindi can use them legitimately.
const UNSAFE_TEXT_CHARACTER =
  // eslint-disable-next-line no-control-regex -- the validator intentionally rejects literal C0/C1 controls
  /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b\u200e\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;
const DEFAULT_IGNORABLE_CHARACTER = /\p{Default_Ignorable_Code_Point}/u;
const REQUIRED_NATIVE_SCRIPT = {
  te: /\p{Script=Telugu}/u,
  hi: /\p{Script=Devanagari}/u,
  zh: /\p{Script=Han}/u,
} as const;

function hasUnsafeTextCharacter(value: string, allowNativeJoiners = false): boolean {
  const defaultIgnorableInput = allowNativeJoiners ? value.replace(/[\u200c\u200d]/gu, '') : value;
  return UNSAFE_TEXT_CHARACTER.test(value) || DEFAULT_IGNORABLE_CHARACTER.test(defaultIgnorableInput);
}

function hasRequiredNativeScript(language: 'te' | 'hi' | 'es' | 'zh', value: string): boolean {
  return language === 'es' || REQUIRED_NATIVE_SCRIPT[language].test(value);
}

/** Validate authored content and render the deterministic deployment artifact. */
export function renderSeedSql(seedQuestions: readonly QuestionSeed[] = questions): string {
  const expectedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
  if (
    seedQuestions.length !== 600 ||
    expectedLevels.some((level) => seedQuestions.filter((question) => question.cefrLevel === level).length !== 100)
  ) {
    throw new Error('expected exactly 100 questions for each CEFR level');
  }
  const naturalKeys = new Set<string>();
  const questionTextKeys = new Set<string>();
  for (const question of seedQuestions) {
    if (
      !question.promptWord.trim() ||
      question.promptWord !== question.promptWord.trim() ||
      question.promptWord.length > 100 ||
      hasUnsafeTextCharacter(question.promptWord) ||
      !question.questionText.trim() ||
      question.questionText !== question.questionText.trim() ||
      question.questionText.length > 1_000 ||
      hasUnsafeTextCharacter(question.questionText)
    ) {
      throw new Error(`invalid English content for "${question.promptWord}" (${question.cefrLevel})`);
    }
    // The database preserves the authored spelling, but catalog review should
    // not allow visually duplicate words that differ only by case, Unicode
    // presentation, or repeated whitespace.
    const normalizedPromptWord = question.promptWord.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
    const naturalKey = `${question.cefrLevel}\u0000${normalizedPromptWord}`;
    if (naturalKeys.has(naturalKey)) {
      throw new Error(`duplicate question key "${question.promptWord}" (${question.cefrLevel})`);
    }
    naturalKeys.add(naturalKey);
    const normalizedQuestionText = question.questionText.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
    if (questionTextKeys.has(normalizedQuestionText)) {
      throw new Error(`duplicate question text for "${question.promptWord}" (${question.cefrLevel})`);
    }
    questionTextKeys.add(normalizedQuestionText);
    let englishExamples: readonly string[] | undefined;
    for (const lang of ['te', 'hi', 'es', 'zh'] as const) {
      const translation = question.translations[lang];
      if (
        !translation ||
        !translation.word.trim() ||
        translation.word !== translation.word.trim() ||
        translation.word.length > 500 ||
        hasUnsafeTextCharacter(translation.word, true) ||
        !hasRequiredNativeScript(lang, translation.word) ||
        !translation.question.trim() ||
        translation.question !== translation.question.trim() ||
        translation.question.length > 4_000 ||
        hasUnsafeTextCharacter(translation.question, true) ||
        !hasRequiredNativeScript(lang, translation.question) ||
        translation.examples.length !== 3
      ) {
        throw new Error(`incomplete ${lang} translation for "${question.promptWord}" (${question.cefrLevel})`);
      }
      for (const example of translation.examples) {
        if (example.en.trim() && example.native.trim() && example.native === example.en) {
          throw new Error(`untranslated example in ${lang} for "${question.promptWord}"`);
        }
        if (
          !example.en.trim() ||
          example.en !== example.en.trim() ||
          example.en.length > 4_000 ||
          hasUnsafeTextCharacter(example.en) ||
          !example.native.trim() ||
          example.native !== example.native.trim() ||
          example.native.length > 4_000 ||
          hasUnsafeTextCharacter(example.native, true) ||
          !hasRequiredNativeScript(lang, example.native)
        ) {
          throw new Error(`empty example in ${lang} for "${question.promptWord}"`);
        }
      }
      const currentEnglishExamples = translation.examples.map(({ en }) => en);
      const referenceEnglishExamples = englishExamples;
      if (
        referenceEnglishExamples &&
        currentEnglishExamples.some((example, index) => example !== referenceEnglishExamples[index])
      ) {
        throw new Error(`inconsistent English examples in ${lang} for "${question.promptWord}"`);
      }
      englishExamples = currentEnglishExamples;
    }
  }

  const lines = [
    '-- Seed data for ai_english. GENERATED by db/generate-seed.ts -- do not edit by hand.',
    `-- ${seedQuestions.length} questions (100 per CEFR level), translations for te/hi/es/zh.`,
    '-- Idempotent: updates content in place by (cefr_level, prompt_word); never deletes user data.',
    'BEGIN;',
  ];
  for (const question of seedQuestions) {
    const translations = esc(JSON.stringify(question.translations));
    lines.push(
      `INSERT INTO questions (cefr_level, prompt_word, question_text, translations) VALUES ('${question.cefrLevel}', '${esc(question.promptWord)}', '${esc(question.questionText)}', '${translations}'::jsonb) ON CONFLICT (cefr_level, prompt_word) DO UPDATE SET question_text = EXCLUDED.question_text, translations = EXCLUDED.translations;`,
    );
  }
  lines.push('COMMIT;', '');
  return lines.join('\n');
}

export function writeSeedSql(
  outputPath = defaultSeedSqlPath(),
  seedQuestions: readonly QuestionSeed[] = questions,
  log: (message: string) => void = console.log,
): void {
  fs.writeFileSync(outputPath, renderSeedSql(seedQuestions), 'utf8');
  log(`wrote db/seed.sql with ${seedQuestions.length} questions`);
}

export function defaultSeedSqlPath(moduleDirectory = __dirname): string {
  return path.join(moduleDirectory, 'seed.sql');
}

// Stryker disable all: direct-execution behavior is subprocess-tested; a
// mutated CommonJS identity check otherwise executes this CLI while Vitest is
// importing the library and produces a mutation-runner bootstrap error.
if (require.main === module) writeSeedSql();
// Stryker restore all
