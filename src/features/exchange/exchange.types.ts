import type { LanguageCatalogItem } from '../languages/languages.types';

export const EXCHANGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type ExchangeLevel = typeof EXCHANGE_LEVELS[number];

export const TIMEZONE_FILTERS = ['ANY', 'SAME_TIMEZONE', 'WITHIN_3_HOURS'] as const;
export type TimezoneFilter = typeof TIMEZONE_FILTERS[number];

export interface DiscoveryFilters {
  offeredLanguageCodes: string[];
  wantedLanguageCodes: string[];
  preferredPartnerLevels: ExchangeLevel[];
  matchingGoalCodes: string[];
  matchingInterestCodes: string[];
  timezoneCompatibility: TimezoneFilter;
}

export interface DiscoveryRequest extends DiscoveryFilters {
  page: number;
  pageSize: number;
}

export interface DiscoveryLanguage {
  code: string;
  slug: string;
  nativeName: string;
  englishName: string;
  vietnameseName: string;
  direction: 'ltr' | 'rtl';
  offered: boolean;
  wanted: boolean;
  declaredProficiency: 'NATIVE' | ExchangeLevel;
  assessedProficiency: string | null;
}

export interface DiscoveryCandidate {
  user: {
    id: string;
    displayName: string;
  };
  languages: DiscoveryLanguage[];
  goals: string[];
  interests: string[];
  normalizedScore: number;
  reasons: string[];
}

export interface DiscoveryResponse {
  scope: 'exchange-discovery';
  candidates: DiscoveryCandidate[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  filters: DiscoveryRequest;
}

export interface PartnerDiscoveryApi {
  discover: (request: DiscoveryRequest) => Promise<DiscoveryResponse>;
  listLanguages: () => Promise<LanguageCatalogItem[]>;
}
