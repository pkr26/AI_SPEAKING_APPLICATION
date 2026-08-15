// Seed content: 100 speaking questions per CEFR level (600 total).
// Each question carries complete translations for te / hi / es / zh:
// the prompt word, the question, and 3 example answers (same English sentence
// across languages, `native` is its translation). Consumed by generate-seed.ts.
// Authored entries live in the per-level modules under db/seed-data/.

import { questions as a1 } from './seed-data/a1';
import { questions as a2 } from './seed-data/a2';
import { questions as b1 } from './seed-data/b1';
import { questions as b2 } from './seed-data/b2';
import { questions as c1 } from './seed-data/c1';
import { questions as c2 } from './seed-data/c2';
import type { QuestionSeed } from './seed-data/types';

export type { LangTranslation, QuestionSeed } from './seed-data/types';

export const questions: QuestionSeed[] = [...a1, ...a2, ...b1, ...b2, ...c1, ...c2];
