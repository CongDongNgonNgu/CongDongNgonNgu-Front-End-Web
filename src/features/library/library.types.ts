import type { CefrLevel } from '../languages/languages.types';

export const LIBRARY_RESOURCE_TYPES = [
  'VOCABULARY',
  'SENTENCE',
  'TRANSLATION',
  'GRAMMAR_ITEM',
  'DIALOGUE',
  'IDIOM',
  'SLANG',
  'CULTURAL_NOTE',
  'PRONUNCIATION',
  'LEARNING_COLLECTION',
] as const;

export type LibraryResourceType = typeof LIBRARY_RESOURCE_TYPES[number];

export interface LibraryFilters {
  q: string;
  language: string;
  type: LibraryResourceType | '';
  topic: string;
  level: CefrLevel | '';
}

export interface LibrarySearchQuery extends LibraryFilters {
  cursor?: string;
  limit?: number;
}

export interface LibraryPublicLicense {
  licenseKey: string;
  displayName: string;
  canonicalUrl: string;
  attributionRequired: boolean;
  redistributionAllowed: boolean | null;
  derivativeConstraints: string | null;
}

export interface LibraryAttributionCue {
  attribution: string;
  license: LibraryPublicLicense;
}

export interface LibraryPublicSearchItem {
  id: string;
  resourceType: LibraryResourceType;
  primaryLanguageCode: string;
  secondaryLanguageCode: string | null;
  cefrLevel: CefrLevel | null;
  topics: string[];
  reviewState: 'VERIFIED';
  preview: {
    title: string;
    excerpt: string;
  };
  provenance: LibraryAttributionCue[];
  createdAt: string;
  updatedAt: string;
}

export interface LibrarySearchPage {
  items: LibraryPublicSearchItem[];
  nextCursor: string | null;
}

export interface LibraryPublicProvenance extends LibraryAttributionCue {
  sourceType: string;
  sourceId: string;
  sourceUrl: string | null;
  originalAuthorReference: string | null;
}

export type LibraryResourceDetails =
  | { resourceType: 'VOCABULARY'; term: string; definition: string; partOfSpeech: string | null; exampleSentence: string | null }
  | { resourceType: 'SENTENCE'; text: string; context: string | null }
  | { resourceType: 'TRANSLATION'; sourceText: string; translatedText: string }
  | { resourceType: 'GRAMMAR_ITEM'; title: string; explanation: string; pattern: string | null; exampleText: string | null }
  | { resourceType: 'DIALOGUE'; title: string; turns: Array<{ speaker: string; text: string; translation: string | null }> }
  | { resourceType: 'IDIOM'; expression: string; meaning: string; usageNote: string | null }
  | { resourceType: 'SLANG'; expression: string; meaning: string; register: string | null; usageNote: string | null }
  | { resourceType: 'CULTURAL_NOTE'; title: string; body: string }
  | { resourceType: 'PRONUNCIATION'; term: string; phonetic: string; notes: string | null }
  | { resourceType: 'LEARNING_COLLECTION'; title: string; description: string };

export interface LibraryPublicResource {
  id: string;
  resourceType: LibraryResourceType;
  primaryLanguageCode: string;
  secondaryLanguageCode: string | null;
  cefrLevel: CefrLevel | null;
  topics: string[];
  reviewState: 'VERIFIED';
  details: LibraryResourceDetails;
  provenance: LibraryPublicProvenance[];
  createdAt: string;
  updatedAt: string;
}
