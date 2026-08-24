import { describe, expect, it, vi } from 'vitest';

import {
  boundedQuestionInventoryQuery,
  questionInventoryIssues,
  REQUIRED_CEFR_LEVELS,
} from '../src/question-inventory';

const QUESTION_ID = '11111111-1111-4111-8111-111111111111';

function example(en = 'An English example.', native = 'A native example.'): Record<string, unknown> {
  return { en, native };
}

function translation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    word: 'translated word',
    question: 'Translated question?',
    examples: [example(), example(), example()],
    ...overrides,
  };
}

function questionRow(cefrLevel = 'A1', overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: QUESTION_ID,
    cefr_level: cefrLevel,
    prompt_word: 'word',
    question_text: 'Answer this question.',
    translations: {
      te: translation(),
      hi: translation(),
      es: translation(),
      zh: translation(),
    },
    ...overrides,
  };
}

function completeInventory(): Array<Record<string, unknown>> {
  return REQUIRED_CEFR_LEVELS.flatMap((level) => Array.from({ length: 100 }, () => questionRow(level)));
}

function withTeluguTranslation(overrides: Record<string, unknown>): Record<string, unknown> {
  const row = questionRow();
  const translations = row.translations as Record<string, unknown>;
  return {
    ...row,
    translations: {
      ...translations,
      te: translation(overrides),
    },
  };
}

function withFirstTeluguExample(candidate: unknown): Record<string, unknown> {
  return withTeluguTranslation({
    examples: [candidate, example(), example()],
  });
}

describe('bounded question inventory validation', () => {
  it('builds the raw-row query with exactly one overfill sentinel', () => {
    const query = boundedQuestionInventoryQuery();

    expect(query.text).toContain('SELECT id, cefr_level, prompt_word, question_text, translations');
    expect(query.text).toContain('ORDER BY cefr_level');
    expect(query.text).toContain('LIMIT $1');
    expect(query.values).toEqual([601]);
  });

  it('accepts exactly 100 well-formed rows per level at JavaScript UTF-16 boundaries', () => {
    const rows = completeInventory();
    rows[0] = questionRow('A1', {
      id: QUESTION_ID.toUpperCase(),
      prompt_word: '😀'.repeat(50),
      question_text: '😀'.repeat(500),
      translations: {
        te: translation({
          word: '😀'.repeat(250),
          question: '😀'.repeat(2_000),
          examples: [{ ...example('😀'.repeat(2_000), '😀'.repeat(2_000)), additive: true }, example(), example()],
          additive: true,
        }),
        hi: translation(),
        es: translation(),
        zh: translation(),
        future: translation(),
      },
      additive: true,
    });

    expect(questionInventoryIssues(rows)).toEqual([]);
  });

  it('reports incomplete, overfilled, and unknown-level inventories with exact counts', () => {
    const missing = completeInventory();
    missing.pop();
    expect(questionInventoryIssues(missing)).toContain('question inventory C2: expected 100, found 99');

    const overfilled = completeInventory();
    overfilled.push(questionRow('A1'));
    expect(questionInventoryIssues(overfilled)).toContain('question inventory A1: expected 100, found 101');

    const redistributed = completeInventory();
    redistributed[redistributed.length - 1] = questionRow('A1');
    expect(questionInventoryIssues(redistributed)).toEqual(
      expect.arrayContaining([
        'question inventory A1: expected 100, found 101',
        'question inventory C2: expected 100, found 99',
      ]),
    );

    const unknownLevel = completeInventory();
    unknownLevel[0] = questionRow('A0');
    expect(questionInventoryIssues(unknownLevel)).toEqual(
      expect.arrayContaining(['question inventory A1: expected 100, found 99', 'malformed question rows: 1']),
    );
  });

  it.each([
    ['a null row', null],
    ['an array row', Object.assign([], questionRow())],
    ['a missing question ID', questionRow('A1', { id: undefined })],
    ['a nil question UUID', questionRow('A1', { id: '00000000-0000-0000-0000-000000000000' })],
    ['a version-zero question UUID', questionRow('A1', { id: '11111111-1111-0111-8111-111111111111' })],
    ['a version-seven question UUID', questionRow('A1', { id: '11111111-1111-7111-8111-111111111111' })],
    ['a bad-variant question UUID', questionRow('A1', { id: '11111111-1111-4111-7111-111111111111' })],
    ['a whitespace prompt', questionRow('A1', { prompt_word: '\t\n' })],
    ['a non-string prompt', questionRow('A1', { prompt_word: 1 })],
    ['an overlong UTF-16 prompt', questionRow('A1', { prompt_word: '😀'.repeat(51) })],
    ['a whitespace question', questionRow('A1', { question_text: '\u00a0\n' })],
    ['an overlong UTF-16 question', questionRow('A1', { question_text: '😀'.repeat(501) })],
    ['a null translations value', questionRow('A1', { translations: null })],
    ['an array translations value', questionRow('A1', { translations: [] })],
    [
      'a missing required translation',
      questionRow('A1', {
        translations: { te: translation(), hi: translation(), es: translation() },
      }),
    ],
    [
      'an array translation',
      questionRow('A1', {
        translations: { te: [], hi: translation(), es: translation(), zh: translation() },
      }),
    ],
    [
      'a null translation',
      questionRow('A1', {
        translations: { te: null, hi: translation(), es: translation(), zh: translation() },
      }),
    ],
    ['a whitespace translated word', withTeluguTranslation({ word: '\t' })],
    ['a non-string translated word', withTeluguTranslation({ word: 1 })],
    ['an overlong UTF-16 translated word', withTeluguTranslation({ word: '😀'.repeat(251) })],
    ['a whitespace translated question', withTeluguTranslation({ question: '\n' })],
    ['an overlong UTF-16 translated question', withTeluguTranslation({ question: '😀'.repeat(2_001) })],
    ['non-array examples', withTeluguTranslation({ examples: 'abc' })],
    ['too few examples', withTeluguTranslation({ examples: [example(), example()] })],
    ['too many examples', withTeluguTranslation({ examples: [example(), example(), example(), example()] })],
    ['a null example', withFirstTeluguExample(null)],
    ['an array example', withFirstTeluguExample(Object.assign([], example()))],
    ['a whitespace English example', withFirstTeluguExample(example('\t', 'native'))],
    ['an overlong UTF-16 English example', withFirstTeluguExample(example('😀'.repeat(2_001), 'native'))],
    ['a whitespace native example', withFirstTeluguExample(example('English', '\u00a0'))],
    ['an overlong UTF-16 native example', withFirstTeluguExample(example('English', '😀'.repeat(2_001)))],
  ])('rejects %s', (_name, candidate) => {
    expect(questionInventoryIssues([candidate])).toContain('malformed question rows: 1');
  });

  it.each([
    ['a leading UUID character', `x${QUESTION_ID}`],
    ['a trailing UUID character', `${QUESTION_ID}x`],
    ['a one-character first group', '1-1111-4111-8111-111111111111'],
    ['a non-hex first group', 'gggggggg-1111-4111-8111-111111111111'],
    ['a one-character second group', '11111111-1-4111-8111-111111111111'],
    ['a non-hex second group', '11111111-gggg-4111-8111-111111111111'],
    ['a version outside one through five', '11111111-1111-7111-8111-111111111111'],
    ['a one-character version suffix', '11111111-1111-41-8111-111111111111'],
    ['a non-hex version suffix', '11111111-1111-4ggg-8111-111111111111'],
    ['a non-RFC variant', '11111111-1111-4111-7111-111111111111'],
    ['a one-character variant suffix', '11111111-1111-4111-81-111111111111'],
    ['a non-hex variant suffix', '11111111-1111-4111-8ggg-111111111111'],
    ['a one-character final group', '11111111-1111-4111-8111-1'],
    ['a non-hex final group', '11111111-1111-4111-8111-gggggggggggg'],
    ['a string-like non-string ID', { toString: (): string => QUESTION_ID }],
  ] as const)('fresh module validation rejects %s', async (_name, id) => {
    // These boundaries live in a module-level RegExp. Re-import after the
    // active mutant is selected so static-initializer mutations cannot reuse
    // the ordinary suite's top-level module instance.
    vi.resetModules();
    const fresh = await import('../src/question-inventory');

    expect(fresh.questionInventoryIssues([questionRow('A1', { id })])).toContain('malformed question rows: 1');
  });
});
