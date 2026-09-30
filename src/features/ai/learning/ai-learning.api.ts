import { authApi } from '../../auth/auth-api';
import type { AiLearningRequest, AiLearningRequestClient, AiLearningResult } from './ai-learning.types';

function jsonRequest(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

export class AiLearningApi {
  constructor(private readonly client: AiLearningRequestClient = authApi) {}

  learn(input: AiLearningRequest): Promise<AiLearningResult> {
    return this.client.requestProtected<AiLearningResult>('/ai/learning/library', jsonRequest(input));
  }
}

export const aiLearningApi = new AiLearningApi();
