import { describe, expect, it, vi } from 'vitest';
import { MessagingApi } from './messaging-api';

describe('MessagingApi protected contract', () => {
  it('encodes paths/cursors and leaves sequence strings and actor ownership intact', async () => {
    const requestProtected = vi.fn().mockResolvedValue({});
    const api = new MessagingApi({ requestProtected });
    await api.open('partner/2');
    await api.list({ cursor: 'private+/=', limit: 20 });
    await api.get('conversation/1');
    await api.history('conversation/1', { after: 'opaque+/=', limit: 30 });
    await api.send('conversation/1', { clientMessageId: 'stable-id', text: 'hello\nworld' });
    await api.markRead('conversation/1', '9007199254740993');
    expect(requestProtected.mock.calls).toEqual([
      ['/exchange/conversations', { method: 'POST', body: JSON.stringify({ partnerUserId: 'partner/2' }) }],
      ['/exchange/conversations?limit=20&cursor=private%2B%2F%3D', {}],
      ['/exchange/conversations/conversation%2F1', {}],
      ['/exchange/conversations/conversation%2F1/messages?limit=30&after=opaque%2B%2F%3D', {}],
      ['/exchange/conversations/conversation%2F1/messages', { method: 'POST', body: JSON.stringify({ clientMessageId: 'stable-id', text: 'hello\nworld' }) }],
      ['/exchange/conversations/conversation%2F1/read', { method: 'POST', body: JSON.stringify({ sequence: '9007199254740993' }) }],
    ]);
  });

  it('passes cancellation to every request, including sends with ambiguous outcomes', async () => {
    const requestProtected = vi.fn().mockResolvedValue({});
    const api = new MessagingApi({ requestProtected });
    const signal = new AbortController().signal;
    await api.list({}, signal);
    await api.get('id', signal);
    await api.history('id', {}, signal);
    await api.send('id', { clientMessageId: 'retry-id', text: 'same text' }, signal);
    await api.markRead('id', '1', signal);
    await api.open('partner', signal);
    for (const [, init] of requestProtected.mock.calls) expect(init.signal).toBe(signal);
  });
});
