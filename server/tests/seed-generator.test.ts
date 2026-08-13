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
    expect(questions).toHaveLength(36);
    expect(
      Object.fromEntries(
        ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => [
          level,
          questions.filter(({ cefrLevel }) => cefrLevel === level).length,
        ]),
      ),
    ).toEqual({ A1: 6, A2: 6, B1: 6, B2: 6, C1: 6, C2: 6 });
  });

  it('accepts content exactly at every documented length cap', () => {
    const authored = copyQuestions();
    const first = authored[0]!;
    first.promptWord = 'p'.repeat(100);
    first.questionText = 'q'.repeat(1_000);
    first.translations.te.word = 'w'.repeat(500);
    first.translations.te.question = 't'.repeat(4_000);
    first.translations.te.examples[0] = {
      en: 'e'.repeat(4_000),
      native: 'n'.repeat(4_000),
    };

    expect(() => renderSeedSql(authored)).not.toThrow();
  });

  it('rejects a missing CEFR level and duplicate natural key', () => {
    const missingLevel = copyQuestions().filter(({ cefrLevel }) => cefrLevel !== 'C2');
    expect(() => renderSeedSql(missingLevel)).toThrow('expected exactly 6 questions for each CEFR level');

    const unevenLevels = copyQuestions();
    unevenLevels[0]!.cefrLevel = 'A2';
    expect(() => renderSeedSql(unevenLevels)).toThrow('expected exactly 6 questions for each CEFR level');

    const duplicate = copyQuestions();
    duplicate[1]!.promptWord = duplicate[0]!.promptWord;
    expect(() => renderSeedSql(duplicate)).toThrow('duplicate question key');
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
      'oversized translated word',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.te.word = 'x'.repeat(501);
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
      'oversized translated question',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.hi.question = 'x'.repeat(4_001);
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
      'oversized native example',
      (authored: QuestionSeed[]) => {
        authored[0]!.translations.zh.examples[0]!.native = 'x'.repeat(4_001);
      },
      'empty example in zh',
    ],
  ] as const)('rejects %s', (_caseName, corrupt, expectedMessage) => {
    const authored = copyQuestions();
    corrupt(authored);

    expect(() => renderSeedSql(authored)).toThrow(expectedMessage);
  });

  it.each([
    [
      'blank English prompt',
      (authored: QuestionSeed[]) => {
        authored[0]!.promptWord = '   ';
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

  it('writes a validated artifact to the requested path', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-english-seed-'));
    const outputPath = path.join(directory, 'seed.sql');
    const log = vi.fn();
    try {
      writeSeedSql(outputPath, questions, log);
      expect(fs.readFileSync(outputPath, 'utf8')).toBe(renderSeedSql());
      expect(log).toHaveBeenCalledWith('wrote db/seed.sql with 36 questions');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
