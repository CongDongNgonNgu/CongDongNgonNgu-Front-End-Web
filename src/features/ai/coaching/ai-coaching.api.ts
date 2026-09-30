import { authApi } from '../../auth/auth-api';
import type {
  AiCoachingRequestClient,
  AiGrammarCoachRequest,
  AiGrammarCoachResult,
  AiWritingCoachRequest,
  AiWritingCoachResult,
} from './ai-coaching.types';

function jsonRequest(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export class AiCoachingApi {
  constructor(private readonly client: AiCoachingRequestClient = authApi) {}

  write(input: AiWritingCoachRequest): Promise<AiWritingCoachResult> {
    return this.client.requestProtected<AiWritingCoachResult>('/ai/coaching/writing', jsonRequest('POST', input));
  }

  grammar(input: AiGrammarCoachRequest): Promise<AiGrammarCoachResult> {
    return this.client.requestProtected<AiGrammarCoachResult>('/ai/coaching/grammar', jsonRequest('POST', input));
  }
}

export const aiCoachingApi = new AiCoachingApi();
