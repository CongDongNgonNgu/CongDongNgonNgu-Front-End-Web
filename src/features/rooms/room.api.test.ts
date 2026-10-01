import { describe, expect, it, vi } from 'vitest';
import { SpeakingRoomApi } from './room.api';

describe('SpeakingRoomApi', () => {
  it('keeps private room access tokens in a header and uses public transport for a guest', async () => {
    const requestPublic = vi.fn().mockResolvedValue({ id: 'room-1' });
    const requestProtected = vi.fn();
    const api = new SpeakingRoomApi({ requestPublic, requestProtected });

    await api.getRoom('room/1', { accessToken: 'room-secret', authenticated: false });

    expect(requestPublic).toHaveBeenCalledWith('/rooms/room%2F1', { headers: { 'X-Room-Access-Token': 'room-secret' } });
    expect(requestProtected).not.toHaveBeenCalled();
  });

  it('preserves the transport receiver when selecting authenticated reads', async () => {
    class ReceiverTransport {
      calls: string[] = [];

      requestPublic<T>(): Promise<T> {
        this.calls.push('public');
        return Promise.resolve({} as T);
      }

      requestProtected<T>(): Promise<T> {
        this.calls.push('protected');
        return Promise.resolve({} as T);
      }
    }

    const transport = new ReceiverTransport();
    const api = new SpeakingRoomApi(transport);

    await api.getRoom('room-1', { authenticated: true });

    expect(transport.calls).toEqual(['protected']);
  });

  it('sends only server-accepted action fields and preserves idempotency keys', async () => {
    const requestProtected = vi.fn().mockResolvedValue({});
    const api = new SpeakingRoomApi({ requestPublic: vi.fn(), requestProtected });

    await api.joinRoom('room-1', { requestId: 'request-1', deviceId: 'device-1' }, 'private-token');
    await api.raiseHand('room-1', 'request-2');
    await api.sendChat('room-1', { requestId: 'request-3', content: '<script>alert(1)</script>' });

    expect(requestProtected).toHaveBeenNthCalledWith(1, '/rooms/room-1/join', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ requestId: 'request-1', deviceId: 'device-1' }),
      headers: { 'X-Room-Access-Token': 'private-token' },
    }));
    expect(requestProtected).toHaveBeenNthCalledWith(2, '/rooms/room-1/queue/raise-hand', {
      method: 'POST',
      body: JSON.stringify({ requestId: 'request-2' }),
    });
    expect(requestProtected).toHaveBeenNthCalledWith(3, '/rooms/room-1/chat', {
      method: 'POST',
      body: JSON.stringify({ requestId: 'request-3', content: '<script>alert(1)</script>' }),
    });
  });

  it('builds bounded chat queries without leaking tokens into the URL', async () => {
    const requestProtected = vi.fn().mockResolvedValue({ items: [], nextCursor: null });
    const api = new SpeakingRoomApi({ requestPublic: vi.fn(), requestProtected });

    await api.listChat('room/1', { limit: 20, cursor: 'cursor/1', accessToken: 'room-secret' });

    expect(requestProtected).toHaveBeenCalledWith('/rooms/room%2F1/chat?limit=20&cursor=cursor%2F1', expect.objectContaining({
      method: 'GET',
      headers: { 'X-Room-Access-Token': 'room-secret' },
    }));
  });
});
