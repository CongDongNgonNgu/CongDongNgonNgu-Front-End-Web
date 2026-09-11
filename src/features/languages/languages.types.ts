export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export type CefrLevel = typeof CEFR_LEVELS[number];

export interface LanguageCatalogItem {
  code: string;
  slug: string;
  nativeName: string;
  englishName: string;
  vietnameseName: string;
  direction: 'ltr' | 'rtl';
  active: boolean;
  launch: boolean;
  sortOrder: number;
}

export interface HubMetric {
  state: 'AVAILABLE' | 'REAL_ZERO' | 'NOT_AVAILABLE_YET';
  value: number | null;
}

export type HubSectionKey =
  | 'overview'
  | 'vocabulary'
  | 'grammar'
  | 'sentences'
  | 'pronunciation'
  | 'resources'
  | 'community'
  | 'questions'
  | 'practice'
  | 'exchange';

export interface HubSectionAvailability {
  key: HubSectionKey;
  status: 'AVAILABLE' | 'EMPTY' | 'NOT_IMPLEMENTED' | 'DISABLED';
  isNavigable: boolean;
  href: string | null;
}

export interface LanguageHubFilters {
  levels: CefrLevel[];
  topic: string | null;
}

export interface LanguageHubFilterSummary extends LanguageHubFilters {
  levelOptions: CefrLevel[];
  levelRequired: false;
  topicState: 'NOT_AVAILABLE_YET';
}

export interface LanguageHubOverview {
  language: LanguageCatalogItem;
  seo: {
    title: string;
    description: string;
    canonicalPath: string;
  };
  metrics: {
    learnerCount: HubMetric;
    contributorCount: HubMetric;
    resourceCount: HubMetric;
  };
  sections: HubSectionAvailability[];
  filters: LanguageHubFilterSummary;
}

export interface LanguageApiPort {
  get<T>(path: string): Promise<T>;
}
