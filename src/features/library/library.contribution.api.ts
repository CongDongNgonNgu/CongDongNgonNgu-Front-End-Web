import { authApi } from '../auth/auth-api';
import type {
  AuthTransport,
  LibraryContributionApiPort,
  LibraryContributionCreateInput,
  LibraryContributionPolicy,
  LibraryContributionProvenanceInput,
  LibraryContributionSubmitInput,
  LibraryContributionSubmissionResult,
} from './library.contribution.types';

export class LibraryContributionApi implements LibraryContributionApiPort {
  constructor(private readonly auth: AuthTransport) {}

  getPolicy(): Promise<LibraryContributionPolicy> {
    return this.auth.requestPublic<LibraryContributionPolicy>('/library/contribution-policy');
  }

  createResource(input: LibraryContributionCreateInput): Promise<{ id: string }> {
    return this.auth.requestProtected<{ id: string }>('/library/resources', jsonRequest('POST', input));
  }

  attachProvenance(resourceId: string, input: LibraryContributionProvenanceInput): Promise<unknown> {
    return this.auth.requestProtected(
      `/library/resources/${encodeURIComponent(resourceId)}/provenance`,
      jsonRequest('POST', input),
    );
  }

  submitContribution(resourceId: string, input: LibraryContributionSubmitInput): Promise<LibraryContributionSubmissionResult> {
    return this.auth.requestProtected<LibraryContributionSubmissionResult>(
      `/library/resources/${encodeURIComponent(resourceId)}/submit-contribution`,
      jsonRequest('POST', input),
    );
  }
}

function jsonRequest(method: string, body: object): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const libraryContributionApi = new LibraryContributionApi(authApi);
