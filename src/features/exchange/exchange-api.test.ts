import { describe, expect, it, vi } from 'vitest';
import { ExchangeApi } from './exchange-api';
import type { ExchangeRelationshipResponse } from './exchange.types';

function relationship(): ExchangeRelationshipResponse {
  return {
    scope: 'exchange-relationship',
    targetUserId: 'user/2',
    state: 'NONE',
    canRequest: true,
    canAccept: false,
    canDecline: false,
    canCancel: false,
    canDisconnect: false,
  };
}

describe('ExchangeApi relationship contract', () => {
  it('uses protected paths and derives the actor from the session', async () => {
    const requestProtected = vi.fn().mockResolvedValue(relationship());
    const api = new ExchangeApi({
      requestProtected,
      getLanguages: vi.fn(),
    });

    await api.requestConnection('user/2');
    await api.acceptConnection('user/2');
    await api.declineConnection('user/2');
    await api.cancelConnection('user/2');
    await api.disconnect('user/2');

    expect(requestProtected).toHaveBeenNthCalledWith(
      1,
      '/exchange/relationships/user%2F2/request',
      { method: 'POST' },
    );
    expect(requestProtected).toHaveBeenNthCalledWith(
      5,
      '/exchange/relationships/user%2F2/disconnect',
      { method: 'POST' },
    );
    for (const call of requestProtected.mock.calls) {
      expect(call[1]?.body).toBeUndefined();
    }
  });

  it('uses session-derived safety endpoints and never accepts a reporter or blocker id in the body', async () => {
    const requestProtected = vi.fn().mockResolvedValue({});
    const api = new ExchangeApi({
      requestProtected,
      getLanguages: vi.fn(),
    });

    await api.getBlockStatus('user/2');
    await api.blockUser('user/2');
    await api.unblockUser('user/2');
    await api.reportUser('user/2', { category: 'SAFETY_CONCERN', context: 'review' });
    await api.getContactPermission('user/2');

    expect(requestProtected.mock.calls.slice(0, 5)).toEqual([
      ['/exchange/blocks/user%2F2'],
      ['/exchange/blocks/user%2F2', { method: 'POST' }],
      ['/exchange/blocks/user%2F2', { method: 'DELETE' }],
      ['/exchange/reports/user%2F2', { method: 'POST', body: JSON.stringify({ category: 'SAFETY_CONCERN', context: 'review' }) }],
      ['/exchange/contact-permission/user%2F2'],
    ]);
    expect(requestProtected.mock.calls[3][1]?.body).not.toContain('reporter');
    expect(requestProtected.mock.calls[1][1]?.body).toBeUndefined();
  });
});
