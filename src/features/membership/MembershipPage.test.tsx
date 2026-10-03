import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../services/api-client';
import { MembershipPageView, type MembershipPageApi } from './MembershipPage';
import type {
  MembershipCapabilityProjection,
  MembershipCatalog,
  MembershipCheckoutOrder,
  MembershipContributionCreditProjection,
  MembershipPaymentAttempt,
} from './membership.types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const catalog: MembershipCatalog = {
  free: {
    productCode: 'FREE',
    planVersion: 1,
    displayName: 'Free',
    description: 'Học và kết nối cộng đồng.',
    benefits: [
      { code: 'community', label: 'Cộng đồng công khai', detail: null },
      { code: 'ai-practice', label: 'Luyện tập AI', detail: 'Tối đa 20.000 token/ngày' },
    ],
  },
  plans: [{
    planVersionId: '33333333-3333-4333-8333-333333333333',
    productCode: 'COMMUNITY_MEMBER',
    planVersion: 1,
    displayName: 'Community Member',
    description: 'Quyền lợi member theo cấu hình hiện hành.',
    benefits: [{ code: 'advanced-practice', label: 'Luyện tập nâng cao', detail: null }],
    price: {
      id: '44444444-4444-4444-8444-444444444444',
      code: 'MONTHLY',
      amountMinor: '125000',
      currency: 'VND',
      periodUnit: 'MONTH',
      periodCount: 1,
    },
  }],
  payment: { available: true, qrAvailable: true, provider: 'payos' },
  evaluatedAt: '2026-10-01T12:00:00.000Z',
};

const freeCapabilities: MembershipCapabilityProjection = {
  plan: { productCode: 'FREE', version: 1, status: 'ACTIVE' },
  membership: { status: 'DEFAULT_FREE', source: 'DEFAULT_FREE', startsAt: null, endsAt: null },
  entitlements: [],
  evaluatedAt: '2026-10-01T12:00:00.000Z',
};

const activeCapabilities: MembershipCapabilityProjection = {
  plan: { productCode: 'COMMUNITY_MEMBER', version: 1, status: 'ACTIVE' },
  membership: {
    status: 'ACTIVE',
    source: 'PURCHASE',
    startsAt: '2026-10-01T00:00:00.000Z',
    endsAt: '2026-11-01T00:00:00.000Z',
  },
  entitlements: [{
    featureKey: 'practice.advanced',
    decision: 'GRANTED',
    limit: null,
    limitUnit: null,
    parameters: {},
  }],
  evaluatedAt: '2026-10-01T12:00:00.000Z',
};

const credit: MembershipContributionCreditProjection = {
  contractVersion: 'membership-contribution-credit-v1',
  type: 'MEMBERSHIP_ELIGIBILITY_CREDIT',
  ruleVersion: 'reputation-ledger-v1',
  conversion: { source: 'REPUTATION_LEDGER', reputationPointsPerCreditUnit: 10 },
  eligibleReputationPoints: 20,
  redeemedCreditUnits: 0,
  availableCreditUnits: 2,
  remainderReputationPoints: 0,
  expirationPolicy: 'NONE_DERIVED_FROM_CURRENT_LEDGER',
  redemption: {
    mode: 'SERVER_AUTHORITATIVE_IDEMPOTENT',
    grantsMembership: true,
    actsAsPaymentTender: false,
    period: 'ONE_MONTH_PER_CREDIT_UNIT',
  },
  evaluatedAt: '2026-10-01T12:00:00.000Z',
};

const pendingOrder: MembershipCheckoutOrder = {
  id: '55555555-5555-4555-8555-555555555555',
  status: 'PENDING_PAYMENT',
  product: { code: 'COMMUNITY_MEMBER', planVersion: 1, displayName: 'Community Member' },
  price: { code: 'MONTHLY', amountMinor: '125000', currency: 'VND', periodUnit: 'MONTH', periodCount: 1 },
  createdAt: '2026-10-01T12:00:00.000Z',
  updatedAt: '2026-10-01T12:00:00.000Z',
  attempt: null,
};

function makeApi(overrides: Partial<MembershipPageApi> = {}): MembershipPageApi {
  return {
    getCatalog: vi.fn().mockResolvedValue(catalog),
    getCapabilities: vi.fn().mockResolvedValue(freeCapabilities),
    getContributionCredit: vi.fn().mockResolvedValue(credit),
    createOrder: vi.fn().mockResolvedValue({ order: pendingOrder, created: true }),
    getOrder: vi.fn().mockResolvedValue(pendingOrder),
    createPaymentAttempt: vi.fn().mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      orderId: pendingOrder.id,
      status: 'PENDING',
      amountMinor: '125000',
      currency: 'VND',
      checkoutUrl: null,
      expiresAt: '2026-10-01T12:15:00.000Z',
    } satisfies MembershipPaymentAttempt),
    redeemContributionCredit: vi.fn().mockResolvedValue({
      created: true,
      creditUnits: 1,
      plan: { productCode: 'COMMUNITY_MEMBER', version: 1 },
      membership: { status: 'ACTIVE', startsAt: '2026-10-01T12:00:00.000Z', endsAt: '2026-11-01T12:00:00.000Z' },
    }),
    ...overrides,
  };
}

function renderPage(api: MembershipPageApi, authStatus: 'loading' | 'authenticated' | 'unauthenticated' = 'unauthenticated', options: { orderId?: string; forgedReturn?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <MembershipPageView api={api} authStatus={authStatus} {...options} />
    </MemoryRouter>,
  );
}

describe('MembershipPage', () => {
  it('renders server pricing and keeps protected account calls unauthenticated', async () => {
    const api = makeApi();
    renderPage(api);

    expect(await screen.findByText('Community Member')).toBeVisible();
    expect(screen.getByText(/125\.000/)).toBeVisible();
    expect(screen.getByText('Cộng đồng công khai')).toBeVisible();
    expect(screen.getByRole('link', { name: /Đăng nhập/ })).toBeVisible();
    expect(api.getCatalog).toHaveBeenCalledTimes(1);
    expect(api.getCapabilities).not.toHaveBeenCalled();
    expect(api.getContributionCredit).not.toHaveBeenCalled();
  });

  it('uses server membership status and does not render renewal or cancellation promises', async () => {
    const api = makeApi({ getCapabilities: vi.fn().mockResolvedValue(activeCapabilities) });
    renderPage(api, 'authenticated');

    expect(await screen.findByText('Đang hoạt động')).toBeVisible();
    expect(screen.getByText(/1 thg 10, 2026/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Gói hiện tại đang hoạt động' })).toBeDisabled();
    expect(screen.queryByText(/gia hạn|hủy|tự động/iu)).not.toBeInTheDocument();
  });

  it('does not trust a forged success query and shows only server order state', async () => {
    const api = makeApi();
    renderPage(api, 'authenticated', { forgedReturn: true, orderId: pendingOrder.id });

    expect(await screen.findByText(/tham số trên đường dẫn không xác nhận/iu)).toBeVisible();
    expect(screen.getByText('Chờ thanh toán')).toBeVisible();
    expect(screen.queryByText('Đã thanh toán')).not.toBeInTheDocument();
  });

  it('fails closed when the provider is disabled and does not invent a checkout success', async () => {
    const api = makeApi({
      createPaymentAttempt: vi.fn().mockRejectedValue(new ApiClientError('disabled', 503, 'PAYMENT_PROVIDER_DISABLED')),
    });
    const user = userEvent.setup();
    renderPage(api, 'authenticated', { orderId: pendingOrder.id });

    await user.click(await screen.findByRole('button', { name: 'Tạo payment attempt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/chưa được bật/i);
    expect(screen.queryByRole('link', { name: /mở trang thanh toán/iu })).not.toBeInTheDocument();
    expect(screen.queryByText('Đã thanh toán')).not.toBeInTheDocument();
  });

  it('uses the server payment capability and does not offer checkout while QR is disabled', async () => {
    const api = makeApi({
      getCatalog: vi.fn().mockResolvedValue({
        ...catalog,
        payment: { available: false, qrAvailable: false, provider: null },
      }),
    });
    renderPage(api, 'authenticated');

    expect((await screen.findAllByText('Thanh toán QR chưa mở')).length).toBe(2);
    expect(screen.getByRole('button', { name: 'Thanh toán QR chưa mở' })).toBeDisabled();
    expect(api.createOrder).not.toHaveBeenCalled();
  });

  it('prevents a double click from creating duplicate orders', async () => {
    let resolveOrder!: (value: { order: MembershipCheckoutOrder; created: boolean }) => void;
    const createOrder = vi.fn().mockImplementation(() => new Promise((resolve) => { resolveOrder = resolve; }));
    const api = makeApi({ createOrder });
    const user = userEvent.setup();
    renderPage(api, 'authenticated');

    const purchaseButton = await screen.findByRole('button', { name: 'Tiếp tục checkout' });
    await user.click(purchaseButton);
    await user.click(purchaseButton);
    expect(createOrder).toHaveBeenCalledTimes(1);
    resolveOrder({ order: pendingOrder, created: true });
    await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1));
  });

  it('labels contribution credit as a non-monetary membership right', async () => {
    const api = makeApi();
    renderPage(api, 'authenticated');

    const heading = await screen.findByText('Tín dụng đóng góp — quyền lợi membership');
    const card = heading.closest('article');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByText(/2 đơn vị quyền lợi/)).toBeVisible();
    expect(within(card as HTMLElement).getByText(/phi tiền tệ/)).toBeVisible();
    expect(within(card as HTMLElement).queryByText(/VND|₫|tiền thanh toán/iu)).not.toBeInTheDocument();
  });
});
