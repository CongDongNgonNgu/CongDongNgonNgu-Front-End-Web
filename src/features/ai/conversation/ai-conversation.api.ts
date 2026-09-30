import { authApi } from '../../auth/auth-api';
import type { AiConversation, AiConversationRequestClient, AiConversationMode, AiRoleplayConfig } from './ai-conversation.types';

function jsonRequest(method: string, body?: unknown): RequestInit {
  return { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) };
}

export class AiConversationApi {
  constructor(private readonly client: AiConversationRequestClient = authApi) {}

  create(input: { mode: AiConversationMode; targetLanguageCode: string; responseLanguageCode: string; roleplay?: AiRoleplayConfig }): Promise<AiConversation> {
    return this.client.requestProtected<AiConversation>('/ai/conversations', jsonRequest('POST', input));
  }

  get(conversationId: string): Promise<AiConversation> {
    return this.client.requestProtected<AiConversation>(`/ai/conversations/${encodeURIComponent(conversationId)}`);
  }

  sendTurn(conversationId: string, input: { message?: string; retry?: boolean }): Promise<AiConversation> {
    return this.client.requestProtected<AiConversation>(`/ai/conversations/${encodeURIComponent(conversationId)}/turns`, jsonRequest('POST', input));
  }

  explain(conversationId: string, messageId: string): Promise<AiConversation> {
    return this.client.requestProtected<AiConversation>(`/ai/conversations/${encodeURIComponent(conversationId)}/explain`, jsonRequest('POST', { messageId }));
  }

  stop(conversationId: string): Promise<AiConversation> {
    return this.client.requestProtected<AiConversation>(`/ai/conversations/${encodeURIComponent(conversationId)}/stop`, jsonRequest('POST'));
  }
}

export const aiConversationApi = new AiConversationApi();
