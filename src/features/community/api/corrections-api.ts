import { authApi } from '../../auth/auth-api';
import type { CommunityPost, CommunityRequestClient } from '../community.types';
import type {
  CommunityRequestApi,
  CorrectionRequestInput,
  CorrectionRequestResponse,
  QuestionInput,
} from '../corrections.types';

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export class CorrectionsApi implements CommunityRequestApi {
  constructor(private readonly client: CommunityRequestClient = authApi) {}

  createCorrectionRequest(input: CorrectionRequestInput): Promise<CorrectionRequestResponse> {
    return this.client.requestProtected<CorrectionRequestResponse>(
      '/community/correction-requests',
      jsonRequest('POST', input),
    );
  }

  getCorrectionRequest(postId: string): Promise<CorrectionRequestResponse> {
    return this.client.requestPublic<CorrectionRequestResponse>(
      '/community/correction-requests/' + encodeURIComponent(postId),
    );
  }

  createQuestion(input: QuestionInput): Promise<CommunityPost> {
    return this.client.requestProtected<CommunityPost>(
      '/community/questions',
      jsonRequest('POST', input),
    );
  }

  getQuestion(postId: string): Promise<CommunityPost> {
    return this.client.requestPublic<CommunityPost>(
      '/community/questions/' + encodeURIComponent(postId),
    );
  }
}

export const correctionsApi = new CorrectionsApi();
