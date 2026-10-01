import { authApi } from '../auth/auth-api';
import type {
  MembershipCapabilityProjection,
  MembershipCatalog,
  MembershipCheckoutOrder,
  MembershipContributionCreditProjection,
  MembershipCreditRedemption,
  MembershipPaymentAttempt,
  MembershipRequestClient,
} from './membership.types';

export class MembershipApi {
  constructor(private readonly client: MembershipRequestClient = authApi) {}

  getCatalog(): Promise<MembershipCatalog> {
    return this.client.requestPublic<MembershipCatalog>('/membership/catalog');
  }

  getCapabilities(): Promise<MembershipCapabilityProjection> {
    return this.client.requestProtected<MembershipCapabilityProjection>('/membership/capabilities');
  }

  getContributionCredit(): Promise<MembershipContributionCreditProjection> {
    return this.client.requestProtected<MembershipContributionCreditProjection>('/membership/contribution-credit');
  }

  createOrder(planVersionId: string, priceId: string, idempotencyKey: string): Promise<{ order: MembershipCheckoutOrder; created: boolean }> {
    return this.client.requestProtected<{ order: MembershipCheckoutOrder; created: boolean }>('/membership/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ planVersionId, priceId }),
    });
  }

  getOrder(orderId: string): Promise<MembershipCheckoutOrder> {
    return this.client.requestProtected<MembershipCheckoutOrder>(`/membership/orders/${encodeURIComponent(orderId)}`);
  }

  createPaymentAttempt(orderId: string, idempotencyKey: string): Promise<MembershipPaymentAttempt> {
    return this.client.requestProtected<MembershipPaymentAttempt>(
      `/membership/orders/${encodeURIComponent(orderId)}/payment-attempts`,
      { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  redeemContributionCredit(planVersionId: string, creditUnits: number, idempotencyKey: string): Promise<MembershipCreditRedemption> {
    return this.client.requestProtected<MembershipCreditRedemption>('/membership/contribution-credit/redemptions', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ planVersionId, creditUnits }),
    });
  }
}

export const membershipApi = new MembershipApi();
