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

export interface MembershipPublicBenefit {
  code: string;
  label: string;
  detail: string | null;
}

export interface MembershipCatalogPlan {
  planVersionId: string;
  productCode: string;
  planVersion: number;
  displayName: string;
  description: string;
  benefits: MembershipPublicBenefit[];
  price: {
    id: string;
    code: string;
    amountMinor: string;
    currency: 'VND';
    periodUnit: 'MONTH' | 'YEAR';
    periodCount: number;
  };
}

export interface MembershipCatalog {
  free: {
    productCode: 'FREE';
    planVersion: 1;
    displayName: string;
    description: string;
    benefits: MembershipPublicBenefit[];
  };
  plans: MembershipCatalogPlan[];
  evaluatedAt: string;
}

export interface MembershipContributionCreditProjection {
  contractVersion: string;
  type: 'MEMBERSHIP_ELIGIBILITY_CREDIT';
  ruleVersion: string;
  conversion: {
    source: 'REPUTATION_LEDGER';
    reputationPointsPerCreditUnit: number;
  };
  eligibleReputationPoints: number;
  redeemedCreditUnits: number;
  availableCreditUnits: number;
  remainderReputationPoints: number;
  expirationPolicy: 'NONE_DERIVED_FROM_CURRENT_LEDGER';
  redemption: {
    mode: 'SERVER_AUTHORITATIVE_IDEMPOTENT';
    grantsMembership: true;
    actsAsPaymentTender: false;
    period: 'ONE_MONTH_PER_CREDIT_UNIT';
  };
  evaluatedAt: string;
}

export interface MembershipCreditRedemption {
  created: boolean;
  creditUnits: number;
  plan: { productCode: string; version: number };
  membership: { status: 'ACTIVE'; startsAt: string; endsAt: string };
}

export interface MembershipPaymentAttempt {
  id: string;
  orderId: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  amountMinor: string;
  currency: 'VND';
  checkoutUrl: string | null;
  expiresAt: string;
}

export interface MembershipCheckoutOrder {
  id: string;
  status: 'PENDING_PAYMENT' | 'PAID' | 'FAILED' | 'CANCELLED';
  product: {
    code: string;
    planVersion: number;
    displayName: string;
  };
  price: {
    code: string;
    amountMinor: string;
    currency: 'VND';
    periodUnit: 'MONTH' | 'YEAR';
    periodCount: number;
  };
  createdAt: string;
  updatedAt: string;
  attempt: MembershipPaymentAttempt | null;
}

export interface MembershipRequestClient {
  requestPublic<T>(path: string, init?: RequestInit): Promise<T>;
  requestProtected<T>(path: string, init?: RequestInit): Promise<T>;
}
