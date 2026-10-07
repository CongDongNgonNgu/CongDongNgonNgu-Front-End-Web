import type { TranslationKey } from '../ui-locale/ui-locale';
import type { LibraryResourceType } from './library.types';

export const resourceTypeLabelKeys = {
  VOCABULARY: 'library.typeVocabulary', SENTENCE: 'library.typeSentence', TRANSLATION: 'library.typeTranslation',
  GRAMMAR_ITEM: 'library.typeGrammar', DIALOGUE: 'library.typeDialogue', IDIOM: 'library.typeIdiom',
  SLANG: 'library.typeSlang', CULTURAL_NOTE: 'library.typeCulture', PRONUNCIATION: 'library.typePronunciation',
  LEARNING_COLLECTION: 'library.typeCollection',
} as const satisfies Record<LibraryResourceType, TranslationKey>;

/** API content language is independent of UI locale; do not guess unknown metadata. */
export function contentLanguage(code: string | null | undefined): string | undefined {
  return code && /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(code) ? code : undefined;
}

/** Learning output uses a string contract, so unknown resource types stay safe. */
export function resourceTypeLabelKey(type: string): TranslationKey {
  return Object.prototype.hasOwnProperty.call(resourceTypeLabelKeys, type)
    ? resourceTypeLabelKeys[type as LibraryResourceType]
    : 'library.content';
}
