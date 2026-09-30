import { authApi } from '../auth/auth-api';
import type { MembershipCapabilityProjection, MembershipRequestClient } from './membership.types';

export class MembershipApi {
  constructor(private readonly client: MembershipRequestClient = authApi) {}

  getCapabilities(): Promise<MembershipCapabilityProjection> {
    return this.client.requestProtected<MembershipCapabilityProjection>('/membership/capabilities');
  }
}

export const membershipApi = new MembershipApi();
