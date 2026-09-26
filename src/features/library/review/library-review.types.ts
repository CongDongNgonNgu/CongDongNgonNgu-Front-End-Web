import type { LibraryResourceDetails, LibraryResourceType } from '../library.types';

export type LibraryReviewState = 'DRAFT' | 'COMMUNITY_REVIEW' | 'VERIFIED' | 'REJECTED';
export type LibraryReviewAction = 'SUBMIT' | 'VERIFY' | 'REJECT' | 'INVALIDATE' | 'REOPEN';

export type LibrarySourceHealthReason =
  | 'VALID'
  | 'CANDIDATE_INVALIDATED'
  | 'CANDIDATE_MISSING'
  | 'ACCEPTANCE_REVOKED_OR_REPLACED'
  | 'RESPONSE_INACTIVE_OR_MISSING'
  | 'PARENT_INACTIVE_OR_MISSING'
  | 'PARENT_NOT_PUBLIC'
  | 'SOURCE_REFERENCE_MISMATCH'
  | string;

export interface LibraryReviewEligibility {
  eligible: boolean;
  issues: Array<
    | 'PROVENANCE_REQUIRED'
    | 'LICENSE_UNKNOWN'
    | 'LICENSE_INACTIVE'
    | 'LICENSE_REDISTRIBUTION_UNSAFE'
    | 'MODERATION_INACTIVE'
    | 'SOURCE_INVALID'
    | string
  >;
}

export interface LibraryReviewLicense {
  licenseKey: string;
  exists: boolean;
  displayName: string | null;
  canonicalUrl: string | null;
  attributionRequired: boolean | null;
  redistributionAllowed: boolean | null;
  derivativeConstraints: string | null;
  active: boolean;
  eligibleForPublicVerification: boolean;
}

export interface LibrarySourceHealth {
  applicable: boolean;
  valid: boolean;
  reason: LibrarySourceHealthReason | null;
}

export interface LibraryReviewProvenanceSummary {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceUrl: string | null;
  attribution: string | null;
  originalAuthorReference: string | null;
  license: LibraryReviewLicense;
  sourceHealth: LibrarySourceHealth;
}

export interface LibraryReviewQueueItem {
  resourceId: string;
  resourceType: LibraryResourceType;
  primaryLanguageCode: string;
  secondaryLanguageCode: string | null;
  cefrLevel: string | null;
  topics: string[];
  reviewState: 'COMMUNITY_REVIEW';
  preview: { title: string; excerpt: string };
  updatedAt: string;
  provenanceRevision: number;
  provenance: LibraryReviewProvenanceSummary[];
  verificationEligibility: LibraryReviewEligibility;
}

export interface LibraryInvalidSourceQueueItem {
  resourceId: string;
  resourceType: LibraryResourceType;
  primaryLanguageCode: string;
  preview: { title: string; excerpt: string };
  reviewState: 'VERIFIED';
  updatedAt: string;
  provenanceRevision: number;
  sourceHealth: LibrarySourceHealth[];
  publicExposure: false;
}

export interface LibraryReviewQueuePage {
  items: LibraryReviewQueueItem[];
  nextCursor: string | null;
}

export interface LibraryInvalidSourceQueuePage {
  items: LibraryInvalidSourceQueueItem[];
  nextCursor: string | null;
}

export interface LibraryReviewAuditRecord {
  id: string;
  resourceId: string;
  actorUserId: string;
  previousState: LibraryReviewState;
  newState: LibraryReviewState;
  action: LibraryReviewAction;
  note: string | null;
  createdAt: string;
}

export interface LibraryReviewContributionEventSummary {
  id: string;
  eventType: string;
  eventVersion: number;
  resourceId: string;
  reviewAuditId: string;
  resourceType: LibraryResourceType;
  termsVersion: string;
  rightsConfirmed: true;
  reuseConsent: true;
  occurredAt: string;
  createdAt: string;
}

export interface LibraryReviewDetail {
  resource: {
    id: string;
    resourceType: LibraryResourceType;
    primaryLanguageCode: string;
    secondaryLanguageCode: string | null;
    cefrLevel: string | null;
    topics: string[];
    visibility: string;
    moderationState: string;
    reviewState: LibraryReviewState;
    createdAt: string;
    updatedAt: string;
    provenanceRevision: number;
    details: LibraryResourceDetails;
  };
  provenance: LibraryReviewProvenanceSummary[];
  reviewAuditHistory: LibraryReviewAuditRecord[];
  contributionEvents: LibraryReviewContributionEventSummary[];
  verificationEligibility: LibraryReviewEligibility;
}

export interface LibraryReviewMutationResult {
  resource: {
    id: string;
    reviewState: LibraryReviewState;
  };
  audit: LibraryReviewAuditRecord;
}

export interface LibraryReviewQueueQuery {
  q?: string;
  language?: string;
  type?: LibraryResourceType | '';
  cursor?: string;
  limit?: number;
}

export interface LibraryReviewApiPort {
  listReviewQueue(query?: LibraryReviewQueueQuery): Promise<LibraryReviewQueuePage>;
  listInvalidSourceQueue(query?: { cursor?: string; limit?: number }): Promise<LibraryInvalidSourceQueuePage>;
  getReviewDetail(resourceId: string): Promise<LibraryReviewDetail>;
  transitionReview(resourceId: string, input: { nextState: 'VERIFIED' | 'REJECTED'; note?: string }): Promise<LibraryReviewMutationResult>;
  reconcileSource(resourceId: string, input?: { note?: string }): Promise<LibraryReviewMutationResult>;
}
