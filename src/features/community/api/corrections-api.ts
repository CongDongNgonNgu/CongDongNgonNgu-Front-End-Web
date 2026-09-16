import { authApi } from '../../auth/auth-api';
import type { CommunityPost, CommunityRequestClient } from '../community.types';
import type {
  CommunityRequestApi,
  CommunityStructuredResponseApi,
  CorrectionRequestInput,
  CorrectionRequestResponse,
  QuestionInput,
  StructuredResponseAcceptanceResponse,
  StructuredResponseInput,
  StructuredResponseListResponse,
  StructuredResponseResponse,
} from '../corrections.types';

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export class CorrectionsApi implements CommunityRequestApi, CommunityStructuredResponseApi {
  constructor(private readonly client: CommunityRequestClient = authApi) {}

  createCorrectionRequest(input: CorrectionRequestInput): Promise<CorrectionRequestResponse> {
    return this.client.requestProtected<CorrectionRequestResponse>(
      '/community/correction-requests',
      jsonRequest('POST', input),
    );
  }

  getCorrectionRequest(postId: string, authenticated = false): Promise<CorrectionRequestResponse> {
    const path = CorrectionRequestResponsePath(postId);
    return authenticated
      ? this.client.requestProtected<CorrectionRequestResponse>(path)
      : this.client.requestPublic<CorrectionRequestResponse>(path);
  }

  createQuestion(input: QuestionInput): Promise<CommunityPost> {
    return this.client.requestProtected<CommunityPost>(
      '/community/questions',
      jsonRequest('POST', input),
    );
  }

  getQuestion(postId: string, authenticated = false): Promise<CommunityPost> {
    const path = '/community/questions/' + encodeURIComponent(postId);
    return authenticated
      ? this.client.requestProtected<CommunityPost>(path)
      : this.client.requestPublic<CommunityPost>(path);
  }

  listStructuredResponses(
    postId: string,
    query: { limit?: number; cursor?: string } = {},
    authenticated = false,
  ): Promise<StructuredResponseListResponse> {
    const params = new URLSearchParams();
    if (query.limit !== undefined) params.set('limit', String(Math.min(Math.max(query.limit, 1), 50)));
    if (query.cursor) params.set('cursor', query.cursor);
    const path = '/community/posts/' + encodeURIComponent(postId) + '/structured-responses' + (
      params.toString() ? '?' + params.toString() : ''
    );
    return authenticated
      ? this.client.requestProtected<StructuredResponseListResponse>(path)
      : this.client.requestPublic<StructuredResponseListResponse>(path);
  }

  createStructuredResponse(
    postId: string,
    input: StructuredResponseInput,
  ): Promise<StructuredResponseResponse> {
    return this.client.requestProtected<StructuredResponseResponse>(
      '/community/posts/' + encodeURIComponent(postId) + '/structured-responses',
      jsonRequest('POST', input),
    );
  }

  addStructuredResponseHelpful(responseId: string): Promise<StructuredResponseResponse> {
    return this.client.requestProtected<StructuredResponseResponse>(
      '/community/structured-responses/' + encodeURIComponent(responseId) + '/helpful',
      { method: 'PUT' },
    );
  }

  removeStructuredResponseHelpful(responseId: string): Promise<StructuredResponseResponse> {
    return this.client.requestProtected<StructuredResponseResponse>(
      '/community/structured-responses/' + encodeURIComponent(responseId) + '/helpful',
      { method: 'DELETE' },
    );
  }

  acceptStructuredResponse(postId: string, responseId: string): Promise<StructuredResponseResponse> {
    return this.client.requestProtected<StructuredResponseResponse>(
      '/community/posts/' + encodeURIComponent(postId) + '/accepted-response',
      jsonRequest('PUT', { responseId }),
    );
  }

  revokeStructuredResponseAcceptance(postId: string): Promise<StructuredResponseAcceptanceResponse> {
    return this.client.requestProtected<StructuredResponseAcceptanceResponse>(
      '/community/posts/' + encodeURIComponent(postId) + '/accepted-response',
      { method: 'DELETE' },
    );
  }
}

function CorrectionRequestResponsePath(postId: string): string {
  return '/community/correction-requests/' + encodeURIComponent(postId);
}

export const correctionsApi = new CorrectionsApi();
