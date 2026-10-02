import { authApi, type AuthApi } from '../auth/auth-api';
import type {
  ChallengeJoinResult,
  ChallengePublicDetail,
  ChallengePublicProgress,
  ChallengePublicStateFilter,
  ChallengePublicSummary,
} from './challenge.types';

export interface ChallengeListInput {
  state?: ChallengePublicStateFilter;
  languageCode?: string;
  limit?: number;
}

export class ChallengeApi {
  constructor(private readonly client: Pick<AuthApi, 'requestPublic' | 'requestProtected'>) {}

  list(input: ChallengeListInput = {}): Promise<ChallengePublicSummary[]> {
    const params = new URLSearchParams();
    if (input.state) params.set('state', input.state);
    if (input.languageCode) params.set('languageCode', input.languageCode);
    if (input.limit) params.set('limit', String(input.limit));
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.client.requestPublic<ChallengePublicSummary[]>(`/challenges${suffix}`);
  }

  get(challengeId: string): Promise<ChallengePublicDetail> {
    return this.client.requestPublic<ChallengePublicDetail>(`/challenges/${encodeURIComponent(challengeId)}`);
  }

  getProgress(challengeId: string): Promise<ChallengePublicProgress | null> {
    return this.client.requestProtected<ChallengePublicProgress | null>(
      `/challenges/${encodeURIComponent(challengeId)}/progress`,
    );
  }

  join(challengeId: string): Promise<ChallengeJoinResult> {
    return this.client.requestProtected<ChallengeJoinResult>(
      `/challenges/${encodeURIComponent(challengeId)}/join`,
      { method: 'POST' },
    );
  }

  leave(challengeId: string): Promise<ChallengeJoinResult['participation']> {
    return this.client.requestProtected<ChallengeJoinResult['participation']>(
      `/challenges/${encodeURIComponent(challengeId)}/join`,
      { method: 'DELETE' },
    );
  }
}

export function createChallengeApi(auth: Pick<AuthApi, 'requestPublic' | 'requestProtected'>): ChallengeApi {
  return new ChallengeApi(auth);
}

export const challengeApi = new ChallengeApi(authApi);
