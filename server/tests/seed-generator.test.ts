import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

import { defaultSeedSqlPath, renderSeedSql, writeSeedSql } from '../db/generate-seed';
import { questions, type QuestionSeed } from '../db/seed-data';

function copyQuestions(): QuestionSeed[] {
  return structuredClone(questions);
}

describe('question seed generator', () => {
  it('targets the seed artifact next to either the source or compiled generator', () => {
    expect(defaultSeedSqlPath('/srv/ai-english/db')).toBe('/srv/ai-english/db/seed.sql');
    expect(defaultSeedSqlPath('/srv/ai-english/dist/db')).toBe('/srv/ai-english/dist/db/seed.sql');
  });

  it('keeps every authored question and translation synchronized with the deployment artifact', () => {
    const committedSql = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');

    expect(renderSeedSql()).toBe(committedSql);
    expect(questions).toHaveLength(600);
    expect(
      Object.fromEntries(
        ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => [
          level,
          questions.filter(({ cefrLevel }) => cefrLevel === level).length,
        ]),
      ),
    ).toEqual({ A1: 100, A2: 100, B1: 100, B2: 100, C1: 100, C2: 100 });
  });

  it('accepts content exactly at every documented length cap', () => {
    const authored = copyQuestions();
    const first = authored[0]!;
    first.promptWord = 'p'.repeat(100);
    first.questionText = 'q'.repeat(1_000);
    first.translations.te.word = `త${'w'.repeat(499)}`;
    first.translations.te.question = `త${'t'.repeat(3_999)}`;
    for (const lang of ['te', 'hi', 'es', 'zh'] as const) {
      first.translations[lang].examples[0]!.en = 'e'.repeat(4_000);
    }
    first.translations.te.examples[0]!.native = `త${'n'.repeat(3_999)}`;

    expect(() => renderSeedSql(authored)).not.toThrow();
  });

  it('rejects a missing CEFR level and duplicate natural key', () => {
    const missingLevel = copyQuestions().filter(({ cefrLevel }) => cefrLevel !== 'C2');
    expect(() => renderSeedSql(missingLevel)).toThrow('expected exactly 100 questions for each CEFR level');

    const unevenLevels = copyQuestions();
    unevenLevels[0]!.cefrLevel = 'A2';
    expect(() => renderSeedSql(unevenLevels)).toThrow('expected exactly 100 questions for each CEFR level');

    const duplicate = copyQuestions();
    duplicate[1]!.promptWord = duplicate[0]!.promptWord;
    expect(() => renderSeedSql(duplicate)).toThrow('duplicate question key');

    const visuallyDuplicate = copyQuestions();
    visuallyDuplicate[1]!.promptWord = duplicate[0]!.promptWord.toUpperCase();
    expect(() => renderSeedSql(visuallyDuplicate)).toThrow('duplicate question key');
  });

  it('uses Unicode case folding when detecting duplicate natural keys', () => {
    const authored = copyQuestions();
    authored[0]!.promptWord = 'straße';
    authored[1]!.promptWord = 'STRASSE';

    expect(() => renderSeedSql(authored)).toThrow('duplicate question key');

    const canonicallyEquivalent = copyQuestions();
    canonicallyEquivalent[0]!.promptWord = 'İstanbul';
    canonicallyEquivalent[1]!.promptWord = 'i\u0307stanbul';

    expect(() => renderSeedSql(canonicallyEquivalent)).toThrow('duplicate question key');
  });

  it('collapses repeated whitespace without erasing word boundaries in natural keys', () => {
    const repeatedWhitespace = copyQuestions();
    repeatedWhitespace[0]!.promptWord = 'mutation boundary';
    repeatedWhitespace[1]!.promptWord = 'mutation  boundary';
    expect(() => renderSeedSql(repeatedWhitespace)).toThrow('duplicate question key');

    const meaningfulWhitespace = copyQuestions();
    meaningfulWhitespace[0]!.promptWord = 'mutation boundary';
    meaningfulWhitespace[1]!.promptWord = 'mutationboundary';
    expect(() => renderSeedSql(meaningfulWhitespace)).not.toThrow();
  });

  it('rejects a question duplicated under another prompt or level', () => {
    const authored = copyQuestions();
    authored[1]!.questionText = authored[0]!.questionText.toUpperCase();

    expect(() => renderSeedSql(authored)).toThrow('duplicate question text');
  });

  it('rejects a 601st question at an unsupported Z9 level', () => {
    const authored = copyQuestions();
    const outOfRange = {
      ...structuredClone(authored[0]!),
      cefrLevel: 'Z9' as QuestionSeed['cefrLevel'],
      promptWord: 'out-of-range-level',
    };

    expect(() => renderSeedSql([...authored, outOfRange])).toThrow(
      'expected exactly 100 questions for each CEFR level',
    );
  });

  it.each([
    [
      'missing translation',
      (authored: QuestionSeed[]) => {
        delete (authored[0]!.translations as Partial<QuestionSeed['translations']>).te;
      },
      'incomplete te translation',
    ],
    [
      'blank translated word',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.te.word = '   ';
      },
      'incomplete te translation',
    ],
    [
      'empty translated word',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.word = '';
      },
      'incomplete es translation',
    ],
    [
      'padded translated word',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.word = ` ${authored[0]!.translations.es.word}`;
      },
      'incomplete es translation',
    ],
    [
      'oversized translated word',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.te.word = `త${'x'.repeat(500)}`;
      },
      'incomplete te translation',
    ],
    [
      'blank translated question',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.hi.question = '   ';
      },
      'incomplete hi translation',
    ],
    [
      'empty translated question',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.question = '';
      },
      'incomplete es translation',
    ],
    [
      'padded translated question',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.question += ' ';
      },
      'incomplete es translation',
    ],
    [
      'oversized translated question',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.hi.question = `हि${'x'.repeat(3_999)}`;
      },
      'incomplete hi translation',
    ],
    [
      'wrong example count',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.examples.pop();
      },
      'incomplete es translation',
    ],
    [
      'blank English example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.zh.examples[0]!.en = '   ';
      },
      'empty example in zh',
    ],
    [
      'empty English example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.zh.examples[0]!.en = '';
      },
      'empty example in zh',
    ],
    [
      'padded English example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.zh.examples[0]!.en += ' ';
      },
      'empty example in zh',
    ],
    [
      'oversized English example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.zh.examples[0]!.en = 'x'.repeat(4_001);
      },
      'empty example in zh',
    ],
    [
      'blank native example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.zh.examples[0]!.native = '   ';
      },
      'empty example in zh',
    ],
    [
      'empty native example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.examples[0]!.native = '';
      },
      'empty example in es',
    ],
    [
      'padded native example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.examples[0]!.native += ' ';
      },
      'empty example in es',
    ],
    [
      'oversized native example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.es.examples[0]!.native = 'x'.repeat(4_001);
      },
      'empty example in es',
    ],
  ] as const)('rejects %s', (_caseName, corrupt, expectedMessage) => {
    const authored = copyQuestions();
    corrupt(authored);

    expect(() => renderSeedSql(authored)).toThrow(expectedMessage);
  });

  it('rejects English examples that drift between language translations', () => {
    const authored = copyQuestions();
    authored[0]!.translations.zh.examples[1]!.en += ' Changed.';

    expect(() => renderSeedSql(authored)).toThrow('inconsistent English examples in zh');
  });

  it('rejects an example copied without translation', () => {
    const authored = copyQuestions();
    authored[0]!.translations.hi.examples[0]!.native = authored[0]!.translations.hi.examples[0]!.en;

    expect(() => renderSeedSql(authored)).toThrow('untranslated example in hi');
  });

  it('requires the expected native script in Telugu, Hindi, and Chinese content', () => {
    const translatedWord = copyQuestions();
    translatedWord[0]!.translations.te.word = 'Spanish only';
    expect(() => renderSeedSql(translatedWord)).toThrow('incomplete te translation');

    const translatedQuestion = copyQuestions();
    translatedQuestion[0]!.translations.hi.question = 'Spanish only';
    expect(() => renderSeedSql(translatedQuestion)).toThrow('incomplete hi translation');

    const translatedExample = copyQuestions();
    translatedExample[0]!.translations.zh.examples[0]!.native = 'Spanish only';
    expect(() => renderSeedSql(translatedExample)).toThrow('empty example in zh');
  });

  it.each([
    [
      'blank English prompt',
      (authored: QuestionSeed[]) => {
        authored[0]!.promptWord = '   ';
      },
    ],
    [
      'empty English prompt',
      (authored: QuestionSeed[]) => {
        authored[0]!.promptWord = '';
      },
    ],
    [
      'padded English prompt',
      (authored: QuestionSeed[]) => {
        authored[0]!.promptWord = ` ${authored[0]!.promptWord}`;
      },
    ],
    [
      'a native-only joiner in an English prompt',
      (authored: QuestionSeed[]) => {
        authored[0]!.promptWord += '\u200c';
      },
    ],
    [
      'an invisible English prompt character',
      (authored: QuestionSeed[]) => {
        authored[0]!.promptWord += '\u200b';
      },
    ],
    [
      'oversized English prompt',
      (authored: QuestionSeed[]) => {
        authored[0]!.promptWord = 'x'.repeat(101);
      },
    ],
    [
      'blank English question',
      (authored: QuestionSeed[]) => {
        authored[0]!.questionText = '   ';
      },
    ],
    [
      'empty English question',
      (authored: QuestionSeed[]) => {
        authored[0]!.questionText = '';
      },
    ],
    [
      'padded English question',
      (authored: QuestionSeed[]) => {
        authored[0]!.questionText += ' ';
      },
    ],
    [
      'a NUL in the English question',
      (authored: QuestionSeed[]) => {
        authored[0]!.questionText += '\u0000';
      },
    ],
    [
      'oversized English question',
      (authored: QuestionSeed[]) => {
        authored[0]!.questionText = 'x'.repeat(1_001);
      },
    ],
  ] as const)('rejects %s', (_caseName, corrupt) => {
    const authored = copyQuestions();
    corrupt(authored);
    expect(() => renderSeedSql(authored)).toThrow('invalid English content');
  });

  it('rejects unsafe controls in localized catalog text while allowing native joiners', () => {
    const unsafe = copyQuestions();
    unsafe[0]!.translations.te.examples[0]!.native += '\u0000';
    expect(() => renderSeedSql(unsafe)).toThrow('empty example in te');

    const hidden = copyQuestions();
    hidden[0]!.translations.te.word += '\u180e';
    expect(() => renderSeedSql(hidden)).toThrow('incomplete te translation');

    for (const joiner of ['\u200c', '\u200d']) {
      const legitimateJoiner = copyQuestions();
      legitimateJoiner[0]!.translations.te.word += joiner;
      expect(() => renderSeedSql(legitimateJoiner)).not.toThrow();
    }
  });

  it('escapes apostrophes in SQL values without changing JSON content', () => {
    const authored = copyQuestions();
    authored[0]!.promptWord = "learner's";
    authored[0]!.questionText = "What's a learner's goal?";
    authored[0]!.translations.es.question = "¿Cuál es tu 'meta'?";

    const sql = renderSeedSql(authored);

    expect(sql).toContain("'learner''s'");
    expect(sql).toContain("'What''s a learner''s goal?'");
    expect(sql).toContain("¿Cuál es tu ''meta''?");
    expect(sql).toContain('ON CONFLICT (cefr_level, prompt_word) DO UPDATE');
    expect(sql.endsWith('COMMIT;\n')).toBe(true);
  });

  it('uses an explicit escape literal for authored text containing backslashes', () => {
    const authored = copyQuestions();
    authored[0]!.promptWord = 'folder\\name';
    authored[0]!.questionText = "Don't use \\quotes in SQL literals.";

    const sql = renderSeedSql(authored);

    // E'' makes the escape rules explicit even if a legacy target has
    // standard_conforming_strings disabled. Backslashes are doubled for the
    // SQL parser and apostrophes are escaped inside that literal.
    expect(sql).toContain("E'folder\\\\name'");
    expect(sql).toContain("E'Don\\'t use \\\\quotes in SQL literals.'");
  });

  it('writes a validated artifact to the requested path', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-english-seed-'));
    const outputPath = path.join(directory, 'seed.sql');
    const log = vi.fn();
    try {
      writeSeedSql(outputPath, questions, log);
      expect(fs.readFileSync(outputPath, 'utf8')).toBe(renderSeedSql());
      expect(log).toHaveBeenCalledWith('wrote db/seed.sql with 600 questions');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
