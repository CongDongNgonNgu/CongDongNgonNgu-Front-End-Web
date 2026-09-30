export type MembershipPlanVersionStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';
export type MembershipSubscriptionStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'REVOKED';
export type MembershipSubscriptionSource = 'DEFAULT_FREE' | 'ADMIN_GRANT' | 'CONTRIBUTION_CREDIT' | 'PURCHASE';
export type MembershipProjectionStatus = 'DEFAULT_FREE' | MembershipSubscriptionStatus;

export interface MembershipCapability {
  featureKey: string;
  decision: 'GRANTED' | 'DENIED';
  limit: number | null;
  limitUnit: string | null;
  parameters: Record<string, unknown>;
}

export interface MembershipCapabilityProjection {
  plan: {
    productCode: string;
    version: number;
    status: MembershipPlanVersionStatus;
  };
  membership: {
    status: MembershipProjectionStatus;
    source: MembershipSubscriptionSource;
    startsAt: string | null;
    endsAt: string | null;
  };
  entitlements: MembershipCapability[];
  evaluatedAt: string;
}

export interface MembershipRequestClient {
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}
