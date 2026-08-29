import type { NativeLanguage, UiLanguage } from './types';

export interface LanguageOption<Code extends UiLanguage = UiLanguage> {
  code: Code;
  /** Stable English name, used as a second visual and spoken-language cue. */
  english: string;
  /** Autonym: the language name written in that language. */
  native: string;
}

/** Mother-tongue choices used for translated learning help and native answers. */
export const NATIVE_LANGUAGE_OPTIONS: readonly LanguageOption<NativeLanguage>[] = [
  { code: 'te', english: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी' },
  { code: 'es', english: 'Spanish', native: 'Español' },
  { code: 'zh', english: 'Chinese (Simplified)', native: '简体中文' },
];

/** Interface-language choices. This is intentionally independent of mother tongue. */
export const UI_LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: 'en', english: 'English', native: 'English' },
  ...NATIVE_LANGUAGE_OPTIONS,
];
