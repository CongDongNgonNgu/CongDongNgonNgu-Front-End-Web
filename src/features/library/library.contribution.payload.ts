import type {
  LibraryContributionCreateInput,
  LibraryContributionProvenanceInput,
  LibraryContributionSnapshot,
  LibraryContributionSubmitInput,
} from './library.contribution.types';

export function toCreateResourcePayload(snapshot: LibraryContributionSnapshot): LibraryContributionCreateInput {
  return {
    resourceType: snapshot.resourceType,
    primaryLanguageCode: snapshot.primaryLanguageCode,
    secondaryLanguageCode: snapshot.secondaryLanguageCode,
    cefrLevel: snapshot.cefrLevel,
    topics: snapshot.topics,
    visibility: 'PUBLIC',
    details: snapshot.details,
  };
}

export function toProvenancePayload(
  resourceId: string,
  snapshot: LibraryContributionSnapshot,
): LibraryContributionProvenanceInput {
  return {
    sourceType: 'ORIGINAL_AUTHOR',
    sourceId: `community-contribution:${resourceId}`,
    licenseKey: snapshot.licenseKey,
    attribution: snapshot.attribution,
  };
}

export function toSubmitContributionPayload(snapshot: LibraryContributionSnapshot): LibraryContributionSubmitInput {
  return {
    termsVersion: snapshot.termsVersion,
    rightsConfirmed: true,
    reuseConsent: true,
  };
}
