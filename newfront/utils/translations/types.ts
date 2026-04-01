/**
 * Translation Types
 * 
 * Common types used throughout the translation system.
 */

export type Language = "en" | "he";

export interface TranslatedText {
  en: string;
  he: string;
}

export interface TranslationFunction {
  (en: string, he: string): string;
}
