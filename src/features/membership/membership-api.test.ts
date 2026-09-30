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
      requestProtected: async <T>(path: string, init?: RequestInit) => {
        calls.push({ path, init });
        return projection as T;
      },
    };

    const result = await new MembershipApi(client).getCapabilities();

    expect(result).toEqual(projection);
    expect(calls).toEqual([{ path: '/membership/capabilities', init: undefined }]);
  });
});
