import type { UiLocale } from './ui-locale';

/** Display metadata only; callers retain the canonical language code in domain state. */
export function languageDisplayName(language: { code: string; englishName: string; vietnameseName: string; nativeName?: string }, locale: UiLocale): string {
  return (locale === 'en' ? language.englishName : language.vietnameseName) || language.nativeName || language.code;
}
