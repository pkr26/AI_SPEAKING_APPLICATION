// Shared seed-content types. Consumed by generate-seed.ts via db/seed-data.ts.

export interface LangTranslation {
  word: string;
  question: string;
  examples: { en: string; native: string }[];
}

export interface QuestionSeed {
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  promptWord: string;
  questionText: string;
  translations: { te: LangTranslation; hi: LangTranslation; es: LangTranslation; zh: LangTranslation };
}
