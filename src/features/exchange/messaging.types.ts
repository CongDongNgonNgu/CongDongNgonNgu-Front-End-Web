import type { LibraryResourceType } from '../library/library.types';

// PostgreSQL bigint values remain decimal strings across the HTTP boundary.
export interface DirectConversationSummary {
  id: string;
  partner: { userId: string; displayName: string };
  headSequence: string;
  changeVersion: string;
  lastReadSequence: string;
  unreadCount: string;
  updatedAt: string;
}
export interface DirectConversationPage {
  items: DirectConversationSummary[];
  nextCursor: string | null;
}
export type MessageContextType = 'LIBRARY_RESOURCE' | 'COMMUNITY_POST';
export type MessageContextCard = { availability: 'UNAVAILABLE' } | {
  availability: 'AVAILABLE'; type: MessageContextType; id: string;
  category: LibraryResourceType | 'DISCUSSION' | 'QUESTION';
  languageCode: string; previewText: string; canonicalPath: string;
};
export interface DirectMessage {
  id: string;
  conversationId: string;
  senderUserId: string;
  sequence: string;
  text: string;
  clientMessageId: string;
  createdAt: string;
  context?: MessageContextCard | null;
}
export interface MessageHistoryInput { limit?: number; before?: string; after?: string }
export interface MessageHistoryPage {
  items: DirectMessage[];
  nextCursor: string | null;
  beforeCursor: string;
  afterCursor: string;
}
export interface SendMessageInput {
  clientMessageId: string; text?: string; contextType?: MessageContextType; contextId?: string;
}
export interface MessageContextProjection { messageId: string; context: MessageContextCard | null }
export interface MessageContextApi {
  context(conversationId: string, messageId: string, signal?: AbortSignal): Promise<MessageContextProjection>;
}
export interface MessagingApiContract {
  open(partnerUserId: string, signal?: AbortSignal): Promise<DirectConversationSummary>;
  list(input?: { limit?: number; cursor?: string }, signal?: AbortSignal): Promise<DirectConversationPage>;
  get(id: string, signal?: AbortSignal): Promise<DirectConversationSummary>;
  history(id: string, input?: MessageHistoryInput, signal?: AbortSignal): Promise<MessageHistoryPage>;
  send(id: string, input: SendMessageInput, signal?: AbortSignal): Promise<DirectMessage>;
  markRead(id: string, sequence: string, signal?: AbortSignal): Promise<void>;
}
