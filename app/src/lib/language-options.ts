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

/**
 * The single BCP-47 tag per UI language. Date/time formatting and
 * `accessibilityLanguage` tagging must resolve through these maps so adding a
 * UI language is one edit instead of six synchronized per-screen copies.
 */
export const UI_LANGUAGE_LOCALES: Readonly<Record<UiLanguage, string>> = {
  en: 'en-US',
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};

/** BCP-47 tags for native-language (mother-tongue) content. */
export const NATIVE_LANGUAGE_LOCALES: Readonly<Record<NativeLanguage, string>> = {
  te: 'te-IN',
  hi: 'hi-IN',
  es: 'es-ES',
  zh: 'zh-Hans',
};
