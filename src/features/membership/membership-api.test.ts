import { describe, expect, it } from 'vitest';
import { MembershipApi } from './membership-api';
import type { MembershipCapabilityProjection, MembershipRequestClient } from './membership.types';

const projection: MembershipCapabilityProjection = {
  plan: { productCode: 'FREE', version: 1, status: 'ACTIVE' },
  membership: {
    status: 'DEFAULT_FREE',
    source: 'DEFAULT_FREE',
    startsAt: null,
    endsAt: null,
  },
  entitlements: [],
  evaluatedAt: '2026-09-30T12:00:00.000Z',
};

describe('MembershipApi', () => {
  it('requests the server-authoritative capability projection without accepting client claims', async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    const client: MembershipRequestClient = {
      requestPublic: async <T>(path: string, init?: RequestInit) => {
        calls.push({ path, init });
        return {} as T;
      },
      requestProtected: async <T>(path: string, init?: RequestInit) => {
        calls.push({ path, init });
        return projection as T;
      },
    };

    const result = await new MembershipApi(client).getCapabilities();

    expect(result).toEqual(projection);
    expect(calls).toEqual([{ path: '/membership/capabilities', init: undefined }]);
  });

  it('uses the public catalog and protected idempotent checkout contract', async () => {
    const calls: Array<{ path: string; init?: RequestInit }> = [];
    const client: MembershipRequestClient = {
      requestPublic: async <T>(path: string, init?: RequestInit) => {
        calls.push({ path, init });
        return { plans: [] } as T;
      },
      requestProtected: async <T>(path: string, init?: RequestInit) => {
        calls.push({ path, init });
        return { order: { id: 'order' }, created: true } as T;
      },
    };
    const api = new MembershipApi(client);

    await api.getCatalog();
    await api.createOrder('plan/id', 'price/id', 'checkout-key-1');
    await api.createPaymentAttempt('order/id', 'attempt-key-1');
    await api.redeemContributionCredit('plan/id', 1, 'credit-key-1');

    expect(calls).toEqual([
      { path: '/membership/catalog', init: undefined },
      {
        path: '/membership/orders',
        init: {
          method: 'POST',
          headers: { 'Idempotency-Key': 'checkout-key-1' },
          body: JSON.stringify({ planVersionId: 'plan/id', priceId: 'price/id' }),
        },
      },
      {
        path: '/membership/orders/order%2Fid/payment-attempts',
        init: { method: 'POST', headers: { 'Idempotency-Key': 'attempt-key-1' } },
      },
      {
        path: '/membership/contribution-credit/redemptions',
        init: {
          method: 'POST',
          headers: { 'Idempotency-Key': 'credit-key-1' },
          body: JSON.stringify({ planVersionId: 'plan/id', creditUnits: 1 }),
        },
      },
    ]);
  });
});
