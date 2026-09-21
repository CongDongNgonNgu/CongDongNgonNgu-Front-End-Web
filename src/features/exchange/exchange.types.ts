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

export const RELATIONSHIP_STATES = [
  'NONE',
  'OUTGOING_PENDING',
  'INCOMING_PENDING',
  'CONNECTED',
] as const;
export type RelationshipState = typeof RELATIONSHIP_STATES[number];

export interface ExchangeRelationshipResponse {
  scope: 'exchange-relationship';
  targetUserId: string;
  state: RelationshipState;
  canRequest: boolean;
  canAccept: boolean;
  canDecline: boolean;
  canCancel: boolean;
  canDisconnect: boolean;
}

export const EXCHANGE_REPORT_CATEGORIES = [
  'SPAM',
  'HARASSMENT',
  'INAPPROPRIATE_CONTENT',
  'IMPERSONATION',
  'SAFETY_CONCERN',
  'OTHER',
] as const;
export type ExchangeReportCategory = typeof EXCHANGE_REPORT_CATEGORIES[number];

export const CONTACT_PERMISSION_DECISIONS = [
  'ALLOWED',
  'DENIED_NOT_CONNECTED',
  'DENIED_BLOCKED',
  'DENIED_PERMISSION',
  'DENIED_INELIGIBLE',
] as const;
export type ContactPermissionDecision = typeof CONTACT_PERMISSION_DECISIONS[number];

export interface ExchangeBlockStatus {
  scope: 'exchange-block-status';
  targetUserId: string;
  blockedByMe: boolean;
}

export interface ExchangeBlockResponse {
  scope: 'exchange-block';
  targetUserId: string;
  blocked: boolean;
}

export interface ExchangeReportResponse {
  scope: 'exchange-report';
  submitted: true;
}

export interface ExchangeContactPermissionResponse {
  scope: 'exchange-contact-permission';
  targetUserId: string;
  decision: ContactPermissionDecision;
}

export interface BuddyProfilePreview {
  scope: 'exchange-buddy';
  user: {
    id: string;
    displayName: string;
  };
  languages: DiscoveryLanguage[];
  goals: string[];
  interests: string[];
  timezoneSummary: {
    visibility: 'SUMMARY';
    hasTimezone: boolean;
  } | null;
  availabilitySummary: {
    visibility: 'SUMMARY';
    hasAvailability: boolean;
  } | null;
  relationship: ExchangeRelationshipResponse;
}

export interface BuddyProfilePreviewApi {
  getBuddyProfile: (userId: string) => Promise<BuddyProfilePreview>;
  getBlockStatus: (userId: string) => Promise<ExchangeBlockStatus>;
  blockUser: (userId: string) => Promise<ExchangeBlockResponse>;
  unblockUser: (userId: string) => Promise<ExchangeBlockResponse>;
  reportUser: (userId: string, input: { category: ExchangeReportCategory; context?: string }) => Promise<ExchangeReportResponse>;
  getContactPermission: (userId: string) => Promise<ExchangeContactPermissionResponse>;
  getRelationship: (userId: string) => Promise<ExchangeRelationshipResponse>;
  requestConnection: (userId: string) => Promise<ExchangeRelationshipResponse>;
  acceptConnection: (userId: string) => Promise<ExchangeRelationshipResponse>;
  declineConnection: (userId: string) => Promise<ExchangeRelationshipResponse>;
  cancelConnection: (userId: string) => Promise<ExchangeRelationshipResponse>;
  disconnect: (userId: string) => Promise<ExchangeRelationshipResponse>;
}

export interface PartnerDiscoveryApi {
  discover: (request: DiscoveryRequest) => Promise<DiscoveryResponse>;
  listLanguages: () => Promise<LanguageCatalogItem[]>;
}
