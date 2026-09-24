import type { AuthApi } from '../auth/auth-api';
import type { CefrLevel, LanguageCatalogItem } from '../languages/languages.types';

export const LIBRARY_CONTRIBUTION_RESOURCE_TYPES = [
  'VOCABULARY',
  'SENTENCE',
  'TRANSLATION',
] as const;

export type LibraryContributionResourceType = typeof LIBRARY_CONTRIBUTION_RESOURCE_TYPES[number];

export interface LibraryContributionPolicyLicense {
  licenseKey: string;
  displayName: string;
  canonicalUrl: string;
  attributionRequired: boolean;
  redistributionAllowed: true;
  derivativeConstraints: string | null;
}

export interface LibraryContributionPolicy {
  termsVersion: string;
  approvedResourceTypes: string[];
  licenses: LibraryContributionPolicyLicense[];
}

export type ContributionFormDetails =
  | {
      resourceType: 'VOCABULARY';
      term: string;
      definition: string;
      partOfSpeech: string;
      exampleSentence: string;
    }
  | {
      resourceType: 'SENTENCE';
      text: string;
      context: string;
    }
  | {
      resourceType: 'TRANSLATION';
      sourceText: string;
      translatedText: string;
    };

export interface LibraryContributionFormState {
  resourceType: LibraryContributionResourceType | '';
  primaryLanguageCode: string;
  secondaryLanguageCode: string;
  cefrLevel: CefrLevel | '';
  topicsText: string;
  details: ContributionFormDetails;
  attribution: string;
  licenseKey: string;
  rightsConfirmed: boolean;
  reuseConsent: boolean;
}

export interface LibraryContributionSnapshot {
  resourceType: LibraryContributionResourceType;
  primaryLanguageCode: string;
  secondaryLanguageCode: string | null;
  cefrLevel: CefrLevel | null;
  topics: string[];
  details: ContributionFormDetails;
  attribution: string;
  licenseKey: string;
  termsVersion: string;
  rightsConfirmed: true;
  reuseConsent: true;
}

export interface ContributionValidationResult {
  errors: Record<string, string>;
  snapshot: LibraryContributionSnapshot | null;
}

export type LibraryContributionStage =
  | 'IDLE'
  | 'CREATING_RESOURCE'
  | 'ATTACHING_PROVENANCE'
  | 'SUBMITTING'
  | 'FAILED_CREATE'
  | 'FAILED_PROVENANCE'
  | 'FAILED_SUBMIT'
  | 'SUCCESS';

export interface LibraryContributionCreateInput {
  resourceType: LibraryContributionResourceType;
  primaryLanguageCode: string;
  secondaryLanguageCode: string | null;
  cefrLevel: CefrLevel | null;
  topics: string[];
  visibility: 'PUBLIC';
  details: ContributionFormDetails;
}

export interface LibraryContributionProvenanceInput {
  sourceType: 'ORIGINAL_AUTHOR';
  sourceId: string;
  licenseKey: string;
  attribution: string;
}

export interface LibraryContributionSubmitInput {
  termsVersion: string;
  rightsConfirmed: true;
  reuseConsent: true;
}

export interface LibraryContributionSubmissionResult {
  resource: { id: string; reviewState?: string };
  audit?: { id: string; action?: string };
  event?: { id: string; eventType?: string };
}

export interface LibraryContributionApiPort {
  getPolicy(): Promise<LibraryContributionPolicy>;
  createResource(input: LibraryContributionCreateInput): Promise<{ id: string }>;
  attachProvenance(resourceId: string, input: LibraryContributionProvenanceInput): Promise<unknown>;
  submitContribution(resourceId: string, input: LibraryContributionSubmitInput): Promise<LibraryContributionSubmissionResult>;
}

export interface LibraryContributionPolicyApiPort {
  getPolicy(): Promise<LibraryContributionPolicy>;
}

export interface LibraryContributionLanguageApiPort {
  listLanguages(): Promise<LanguageCatalogItem[]>;
}

export type AuthTransport = Pick<AuthApi, 'requestPublic' | 'requestProtected'>;

export const INITIAL_CONTRIBUTION_FORM: LibraryContributionFormState = {
  resourceType: '',
  primaryLanguageCode: '',
  secondaryLanguageCode: '',
  cefrLevel: '',
  topicsText: '',
  details: {
    resourceType: 'VOCABULARY',
    term: '',
    definition: '',
    partOfSpeech: '',
    exampleSentence: '',
  },
  attribution: '',
  licenseKey: '',
  rightsConfirmed: false,
  reuseConsent: false,
};
