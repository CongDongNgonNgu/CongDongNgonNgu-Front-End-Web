import { describe, expect, it, vi } from 'vitest';
import { AiConversationApi } from './ai-conversation.api';

describe('AiConversationApi', () => {
  it('uses protected transport for session creation and encodes session ids', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ id: 'conversation-1' });
    const api = new AiConversationApi({ requestProtected });

    await api.create({ mode: 'conversation', targetLanguageCode: 'ja', responseLanguageCode: 'ja' });
    await api.sendTurn('conversation/1', { message: 'Xin chào' });
    await api.explain('conversation/1', 'turn/1');
    await api.stop('conversation/1');

    expect(requestProtected).toHaveBeenNthCalledWith(1, '/ai/conversations', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ mode: 'conversation', targetLanguageCode: 'ja', responseLanguageCode: 'ja' }),
    }));
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/ai/conversations/conversation%2F1/turns', expect.objectContaining({ method: 'POST' }));
    expect(requestProtected).toHaveBeenNthCalledWith(3, '/ai/conversations/conversation%2F1/explain', expect.objectContaining({ body: JSON.stringify({ messageId: 'turn/1' }) }));
    expect(requestProtected).toHaveBeenNthCalledWith(4, '/ai/conversations/conversation%2F1/stop', expect.objectContaining({ method: 'POST' }));
  });
});
