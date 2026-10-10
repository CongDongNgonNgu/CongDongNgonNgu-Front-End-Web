import type { AuthApi } from '../auth/auth-api';
import type { DirectConversationPage, DirectConversationSummary, DirectMessage, MessageHistoryInput,
  MessageHistoryPage, MessagingApiContract, SendMessageInput } from './messaging.types';

const root = '/exchange/conversations';
const path = (id: string) => root + '/' + encodeURIComponent(id);
const cancellation = (signal?: AbortSignal): RequestInit => signal ? { signal } : {};

export class MessagingApi implements MessagingApiContract {
  constructor(private readonly auth: Pick<AuthApi, 'requestProtected'>) {}

  open(partnerUserId: string, signal?: AbortSignal): Promise<DirectConversationSummary> {
    return this.auth.requestProtected(root, { ...cancellation(signal), method: 'POST', body: JSON.stringify({ partnerUserId }) });
  }
  list(input: { limit?: number; cursor?: string } = {}, signal?: AbortSignal): Promise<DirectConversationPage> {
    const params = new URLSearchParams({ limit: String(input.limit ?? 20) });
    if (input.cursor !== undefined) params.set('cursor', input.cursor);
    return this.auth.requestProtected(root + '?' + params, cancellation(signal));
  }
  get(id: string, signal?: AbortSignal): Promise<DirectConversationSummary> {
    return this.auth.requestProtected(path(id), cancellation(signal));
  }
  history(id: string, input: MessageHistoryInput = {}, signal?: AbortSignal): Promise<MessageHistoryPage> {
    const params = new URLSearchParams({ limit: String(input.limit ?? 30) });
    if (input.before !== undefined) params.set('before', input.before);
    if (input.after !== undefined) params.set('after', input.after);
    return this.auth.requestProtected(path(id) + '/messages?' + params, cancellation(signal));
  }
  send(id: string, input: SendMessageInput, signal?: AbortSignal): Promise<DirectMessage> {
    // Construct the allowed body explicitly: sender and sequence are server-owned.
    return this.auth.requestProtected(path(id) + '/messages', { ...cancellation(signal), method: 'POST',
      body: JSON.stringify({ clientMessageId: input.clientMessageId, text: input.text }) });
  }
  async markRead(id: string, sequence: string, signal?: AbortSignal): Promise<void> {
    await this.auth.requestProtected(path(id) + '/read', { ...cancellation(signal), method: 'POST', body: JSON.stringify({ sequence }) });
  }
}
