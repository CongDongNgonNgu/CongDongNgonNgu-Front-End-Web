import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiClientError } from '../../services/api-client';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Icon } from '../../components/ui/Icon/Icon';
import { Badge, Card } from '../../components/ui/Surface';
import { useOptionalAuth } from '../auth/AuthProvider';
import { MembershipApi, membershipApi } from './membership-api';
import type {
  MembershipCapability,
  MembershipCapabilityProjection,
  MembershipCatalog,
  MembershipCatalogPlan,
  MembershipCheckoutOrder,
  MembershipContributionCreditProjection,
  MembershipPaymentAttempt,
} from './membership.types';
import {
  formatMembershipAmount,
  formatMembershipDate,
  formatMembershipPeriod,
  membershipStatusLabel,
} from './membership.utils';
import styles from './MembershipPage.module.css';

export type MembershipPageApi = Pick<MembershipApi,
  | 'getCatalog'
  | 'getCapabilities'
  | 'getContributionCredit'
  | 'createOrder'
  | 'getOrder'
  | 'createPaymentAttempt'
  | 'redeemContributionCredit'
>;

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface MembershipPageViewProps {
  api: MembershipPageApi;
  authStatus: AuthStatus;
  orderId?: string;
  forgedReturn?: boolean;
}

export function MembershipPage({ api = membershipApi }: { api?: MembershipPageApi }) {
  const auth = useOptionalAuth();
  const { orderId } = useParams<{ orderId?: string }>();
  const [searchParams] = useSearchParams();
  return (
    <MembershipPageView
      api={api}
      authStatus={auth?.status ?? 'unauthenticated'}
      orderId={orderId}
      forgedReturn={searchParams.get('status') === 'success'}
    />
  );
}

export function MembershipPageView({ api, authStatus, orderId, forgedReturn = false }: MembershipPageViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [catalog, setCatalog] = useState<MembershipCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [capabilities, setCapabilities] = useState<MembershipCapabilityProjection | null>(null);
  const [credit, setCredit] = useState<MembershipContributionCreditProjection | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState('');
  const [order, setOrder] = useState<MembershipCheckoutOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(false);
  const [attemptLoading, setAttemptLoading] = useState(false);
  const [attemptError, setAttemptError] = useState('');

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(false);
    try {
      setCatalog(await api.getCatalog());
    } catch {
      setCatalog(null);
      setCatalogError(true);
    } finally {
      setCatalogLoading(false);
    }
  }, [api]);

  const loadAccount = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      setCapabilities(null);
      setCredit(null);
      setAccountLoading(false);
      return;
    }
    setAccountLoading(true);
    setAccountError(false);
    const [capabilityResult, creditResult] = await Promise.allSettled([
      api.getCapabilities(),
      api.getContributionCredit(),
    ]);
    if (capabilityResult.status === 'fulfilled') setCapabilities(capabilityResult.value);
    else setAccountError(true);
    if (creditResult.status === 'fulfilled') setCredit(creditResult.value);
    else setCredit(null);
    setAccountLoading(false);
  }, [api, authStatus]);

  const loadOrder = useCallback(async () => {
    if (!orderId || authStatus !== 'authenticated') {
      setOrder(null);
      setOrderLoading(false);
      return;
    }
    setOrderLoading(true);
    setOrderError(false);
    try {
      setOrder(await api.getOrder(orderId));
    } catch {
      setOrder(null);
      setOrderError(true);
    } finally {
      setOrderLoading(false);
    }
  }, [api, authStatus, orderId]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  useEffect(() => { void loadAccount(); }, [loadAccount]);
  useEffect(() => { void loadOrder(); }, [loadOrder]);

  useEffect(() => {
    const firstPlan = catalog?.plans[0];
    if (!firstPlan) {
      setSelectedPlanKey('');
      return;
    }
    const stillExists = catalog.plans.some((plan) => planKey(plan) === selectedPlanKey);
    if (!stillExists) setSelectedPlanKey(planKey(firstPlan));
  }, [catalog, selectedPlanKey]);

  const activeMembership = capabilities?.plan.productCode !== 'FREE'
    && (capabilities?.membership.status === 'ACTIVE' || capabilities?.membership.status === 'SCHEDULED');
  const redeemPlan = catalog?.plans[0] ?? null;

  async function handlePurchase(plan: MembershipCatalogPlan): Promise<void> {
    if (authStatus !== 'authenticated') {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    if (checkoutLoading || activeMembership) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const result = await api.createOrder(plan.planVersionId, plan.price.id, createIdempotencyKey('membership-order'));
      navigate(`/membership/checkout/${result.order.id}`);
    } catch (error) {
      setCheckoutError(safeCheckoutError(error));
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleRedeem(): Promise<void> {
    if (!redeemPlan || !credit || credit.availableCreditUnits < 1 || redeemLoading) return;
    setRedeemLoading(true);
    setRedeemMessage('');
    try {
      await api.redeemContributionCredit(redeemPlan.planVersionId, 1, createIdempotencyKey('membership-credit'));
      setRedeemMessage('Đã ghi nhận 1 tháng membership từ quyền lợi đóng góp.');
      await loadAccount();
    } catch {
      setRedeemMessage('Chưa thể đổi quyền lợi đóng góp lúc này. Bạn có thể thử lại sau.');
    } finally {
      setRedeemLoading(false);
    }
  }

  async function handlePaymentAttempt(): Promise<void> {
    if (!order || attemptLoading) return;
    setAttemptLoading(true);
    setAttemptError('');
    try {
      const attempt = await api.createPaymentAttempt(order.id, createIdempotencyKey('membership-attempt'));
      setOrder((current) => current ? { ...current, attempt } : current);
    } catch (error) {
      setAttemptError(safePaymentError(error));
      await loadOrder();
    } finally {
      setAttemptLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Membership</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>THÀNH VIÊN CỘNG ĐỒNG</p>
          <h1>Học sâu hơn, vẫn luôn rõ ràng.</h1>
          <p className={styles.heroDescription}>
            Free luôn đủ dùng cho việc học và kết nối. Membership chỉ mở thêm những quyền lợi đã được hệ thống xác nhận.
          </p>
        </div>
        <div className={styles.heroNote}>
          <Icon name='shield-check' size={24} />
          <span>Quyền lợi được quyết định từ dữ liệu máy chủ, không từ nhãn trên trình duyệt.</span>
        </div>
      </header>

      {forgedReturn ? (
        <div className={styles.serverNotice} role='status'>
          Đang kiểm tra trạng thái từ máy chủ. Tham số trên đường dẫn không xác nhận thanh toán hay quyền lợi.
        </div>
      ) : null}

      {catalogLoading ? <Skeleton lines={7} label='Đang tải bảng quyền lợi membership' /> : null}
      {catalogError ? (
        <ErrorState
          title='Chưa tải được bảng membership'
          description='Thông tin gói và giá phải đến từ máy chủ. Hãy thử tải lại để xem dữ liệu mới nhất.'
          onRetry={() => void loadCatalog()}
          retryLabel='Tải lại bảng gói'
        />
      ) : null}
      {!catalogLoading && !catalogError && catalog ? (
        <>
          <section className={styles.pricingSection} aria-labelledby='membership-pricing-title'>
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>BẢNG QUYỀN LỢI</p>
                <h2 id='membership-pricing-title'>Chọn mức hỗ trợ phù hợp</h2>
              </div>
              <p className={styles.sectionHint}>Giá và chu kỳ dưới đây là dữ liệu hiện hành từ máy chủ.</p>
            </div>
            <div className={styles.pricingGrid}>
              <PlanCard
                kind='free'
                title={catalog.free.displayName}
                description={catalog.free.description}
                benefits={catalog.free.benefits}
                priceLabel='0 ₫'
                periodLabel='Không cần thanh toán'
                action={<Badge tone='success'>Đang mở cho mọi người</Badge>}
              />
              {catalog.plans.map((plan) => (
                <PlanCard
                  key={planKey(plan)}
                  kind='member'
                  title={plan.displayName}
                  description={plan.description}
                  benefits={plan.benefits}
                  priceLabel={formatMembershipAmount(plan.price.amountMinor, plan.price.currency) ?? 'Giá chưa sẵn sàng'}
                  periodLabel={formatMembershipPeriod(plan.price.periodUnit, plan.price.periodCount) ?? 'Chu kỳ chưa sẵn sàng'}
                  selected={selectedPlanKey === planKey(plan)}
                  onSelect={() => setSelectedPlanKey(planKey(plan))}
                  action={(
                    <Button
                      fullWidth
                      disabled={authStatus === 'loading' || activeMembership === true || formatMembershipAmount(plan.price.amountMinor, plan.price.currency) === null}
                      loading={checkoutLoading && selectedPlanKey === planKey(plan)}
                      onClick={() => void handlePurchase(plan)}
                    >
                      {activeMembership ? 'Gói hiện tại đang hoạt động' : authStatus === 'authenticated' ? 'Tiếp tục checkout' : 'Đăng nhập để mua'}
                    </Button>
                  )}
                />
              ))}
            </div>
            {catalog.plans.length === 0 ? (
              <EmptyState
                title='Chưa có gói membership đang mở bán'
                description='Bạn vẫn có thể học, đọc thư viện công khai và tham gia trao đổi cơ bản với Free.'
                icon='calendar-check'
              />
            ) : null}
            {checkoutError ? <p className={styles.inlineError} role='alert'>{checkoutError}</p> : null}
          </section>

          {orderId ? (
            <CheckoutPanel
              authStatus={authStatus}
              loading={orderLoading}
              error={orderError}
              order={order}
              attemptLoading={attemptLoading}
              attemptError={attemptError}
              onRetry={() => void loadOrder()}
              onCreateAttempt={() => void handlePaymentAttempt()}
            />
          ) : null}

          {authStatus === 'authenticated' ? (
            <section className={styles.accountSection} aria-labelledby='membership-account-title'>
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>TÀI KHOẢN CỦA BẠN</p>
                  <h2 id='membership-account-title'>Membership hiện tại</h2>
                </div>
                <p className={styles.sectionHint}>Trạng thái và thời hạn đều do máy chủ đánh giá.</p>
              </div>
              {accountLoading && !capabilities ? <Skeleton lines={4} label='Đang tải trạng thái membership' /> : null}
              {accountError && !capabilities ? (
                <ErrorState
                  title='Chưa tải được trạng thái tài khoản'
                  description='Không thể xác nhận quyền lợi lúc này. Hãy thử lại trước khi tiếp tục.'
                  onRetry={() => void loadAccount()}
                  retryLabel='Tải lại trạng thái'
                />
              ) : null}
              {capabilities ? <AccountSummary capabilities={capabilities} catalog={catalog} /> : null}
              {credit ? (
                <CreditPanel
                  credit={credit}
                  loading={redeemLoading}
                  message={redeemMessage}
                  canRedeem={Boolean(redeemPlan)}
                  onRedeem={() => void handleRedeem()}
                />
              ) : null}
            </section>
          ) : authStatus === 'loading' ? null : (
            <aside className={styles.loginCallout} aria-label='Đăng nhập để mua membership'>
              <div>
                <p className={styles.eyebrow}>MUỐN TIẾP TỤC?</p>
                <h2>Đăng nhập để bắt đầu checkout</h2>
                <p>Không có thông tin thanh toán nào được lưu trong trình duyệt. Máy chủ sẽ tạo order và xác nhận từng bước.</p>
              </div>
              <Link className={styles.calloutLink} to='/login' state={{ from: location.pathname }}>Đăng nhập <span aria-hidden='true'>→</span></Link>
            </aside>
          )}
        </>
      ) : null}
    </div>
  );
}

function PlanCard({
  kind,
  title,
  description,
  benefits,
  priceLabel,
  periodLabel,
  selected = false,
  onSelect,
  action,
}: {
  kind: 'free' | 'member';
  title: string;
  description: string;
  benefits: MembershipCatalog['free']['benefits'];
  priceLabel: string;
  periodLabel: string;
  selected?: boolean;
  onSelect?: () => void;
  action: React.ReactNode;
}) {
  return (
    <Card className={`${styles.planCard} ${kind === 'member' ? styles.memberCard : styles.freeCard} ${selected ? styles.selectedCard : ''}`}>
      <div className={styles.planHeader}>
        <div>
          <p className={styles.planKicker}>{kind === 'free' ? 'NỀN TẢNG' : 'THÀNH VIÊN'}</p>
          <h3>{title}</h3>
        </div>
        {kind === 'member' ? <Badge tone='info'>Theo kỳ cố định</Badge> : null}
      </div>
      <p className={styles.planDescription}>{description}</p>
      <div className={styles.priceBlock}>
        <strong>{priceLabel}</strong>
        <span>{periodLabel}</span>
      </div>
      <ul className={styles.benefitList}>
        {benefits.length > 0 ? benefits.map((benefit) => (
          <li key={benefit.code}>
            <Icon name='check' size={18} />
            <span><strong>{benefit.label}</strong>{benefit.detail ? <small>{benefit.detail}</small> : null}</span>
          </li>
        )) : <li className={styles.mutedBenefit}><span>Quyền lợi đang được máy chủ cấu hình.</span></li>}
      </ul>
      {onSelect ? <button className={styles.planSelect} type='button' onClick={onSelect} aria-pressed={selected}>Chọn gói này</button> : null}
      <div className={styles.planAction}>{action}</div>
    </Card>
  );
}

function AccountSummary({ capabilities, catalog }: { capabilities: MembershipCapabilityProjection; catalog: MembershipCatalog }) {
  const planName = capabilities.plan.productCode === 'FREE'
    ? catalog.free.displayName
    : catalog.plans.find((plan) => plan.productCode === capabilities.plan.productCode && plan.planVersion === capabilities.plan.version)?.displayName
      ?? capabilities.plan.productCode;
  return (
    <div className={styles.accountGrid}>
      <Card className={styles.accountCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <p className={styles.planKicker}>GÓI HIỆN TẠI</p>
            <h3>{planName}</h3>
          </div>
          <Badge tone={capabilities.membership.status === 'ACTIVE' ? 'success' : 'neutral'}>{membershipStatusLabel(capabilities.membership.status)}</Badge>
        </div>
        <dl className={styles.statusList}>
          <div><dt>Bắt đầu</dt><dd>{formatMembershipDate(capabilities.membership.startsAt) ?? 'Theo trạng thái Free'}</dd></div>
          <div><dt>Kết thúc</dt><dd>{formatMembershipDate(capabilities.membership.endsAt) ?? 'Không áp dụng'}</dd></div>
          <div><dt>Nguồn</dt><dd>{sourceLabel(capabilities.membership.source)}</dd></div>
        </dl>
      </Card>
      <Card className={styles.accountCard}>
        <div className={styles.accountCardHeader}>
          <div>
            <p className={styles.planKicker}>QUYỀN LỢI ĐANG CÓ</p>
            <h3>Access từ máy chủ</h3>
          </div>
          <Icon name='shield-check' size={24} />
        </div>
        <ul className={styles.entitlementList}>
          {capabilities.entitlements.filter((item) => item.decision === 'GRANTED').map((item) => <EntitlementRow key={item.featureKey} capability={item} />)}
          {capabilities.entitlements.filter((item) => item.decision === 'GRANTED').length === 0 ? <li>Free đang sẵn sàng cho những quyền lợi cơ bản.</li> : null}
        </ul>
      </Card>
    </div>
  );
}

function EntitlementRow({ capability }: { capability: MembershipCapability }) {
  const labels: Record<string, string> = {
    'community.public': 'Cộng đồng công khai',
    'library.public': 'Thư viện công khai',
    'exchange.basic': 'Trao đổi cơ bản',
    'ai.practice': 'Luyện tập AI',
    'practice.advanced': 'Luyện tập nâng cao',
  };
  const detail = capability.featureKey === 'ai.practice' && capability.limit !== null && capability.limitUnit === 'tokens_per_day'
    ? `Tối đa ${capability.limit.toLocaleString('vi-VN')} token/ngày`
    : null;
  return <li><Icon name='check-circle' size={18} /><span>{labels[capability.featureKey] ?? 'Quyền lợi đã được xác nhận'}{detail ? <small>{detail}</small> : null}</span></li>;
}

function CreditPanel({
  credit,
  loading,
  message,
  canRedeem,
  onRedeem,
}: {
  credit: MembershipContributionCreditProjection;
  loading: boolean;
  message: string;
  canRedeem: boolean;
  onRedeem: () => void;
}) {
  return (
    <Card className={styles.creditCard}>
      <div>
        <p className={styles.planKicker}>ĐÓNG GÓP CỘNG ĐỒNG</p>
        <h3>Tín dụng đóng góp — quyền lợi membership</h3>
        <p>{credit.availableCreditUnits > 0 ? `Bạn có ${credit.availableCreditUnits} đơn vị quyền lợi có thể đổi.` : 'Bạn chưa có đơn vị quyền lợi khả dụng.'}</p>
        <small>Đây là quyền lợi phi tiền tệ, được tính từ sổ đóng góp của tài khoản.</small>
      </div>
      <Button
        variant='secondary'
        disabled={!canRedeem || credit.availableCreditUnits < 1}
        loading={loading}
        onClick={onRedeem}
      >
        Đổi 1 tháng membership
      </Button>
      {message ? <p className={styles.creditMessage} role='status'>{message}</p> : null}
    </Card>
  );
}

function CheckoutPanel({
  authStatus,
  loading,
  error,
  order,
  attemptLoading,
  attemptError,
  onRetry,
  onCreateAttempt,
}: {
  authStatus: AuthStatus;
  loading: boolean;
  error: boolean;
  order: MembershipCheckoutOrder | null;
  attemptLoading: boolean;
  attemptError: string;
  onRetry: () => void;
  onCreateAttempt: () => void;
}) {
  if (authStatus !== 'authenticated') return null;
  return (
    <section className={styles.checkoutSection} aria-labelledby='membership-checkout-title'>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>CHECKOUT</p>
          <h2 id='membership-checkout-title'>Kiểm tra thanh toán</h2>
        </div>
        <p className={styles.sectionHint}>Chỉ trạng thái từ máy chủ mới có thể xác nhận order và payment attempt.</p>
      </div>
      {loading ? <Skeleton lines={5} label='Đang tải order từ máy chủ' /> : null}
      {error ? <ErrorState title='Không thể tải order' description='Order không tồn tại, đã hết quyền truy cập hoặc chưa sẵn sàng.' onRetry={onRetry} retryLabel='Tải lại order' /> : null}
      {!loading && !error && order ? (
        <Card className={styles.checkoutCard}>
          <div className={styles.checkoutHeader}>
            <div><p className={styles.planKicker}>ORDER SERVER</p><h3>{order.product.displayName}</h3></div>
            <Badge tone={order.status === 'PAID' ? 'success' : order.status === 'FAILED' ? 'danger' : 'warning'}>{orderStatusLabel(order.status)}</Badge>
          </div>
          <div className={styles.checkoutFacts}>
            <span>{formatMembershipAmount(order.price.amountMinor, order.price.currency) ?? 'Giá chưa sẵn sàng'}</span>
            <span>{formatMembershipPeriod(order.price.periodUnit, order.price.periodCount) ?? 'Chu kỳ chưa sẵn sàng'}</span>
          </div>
          <p className={styles.checkoutNote}>Thanh toán chỉ là một bước. Quyền lợi membership chỉ xuất hiện sau khi máy chủ xác nhận settlement và fulfillment.</p>
          {order.attempt ? <AttemptState attempt={order.attempt} /> : null}
          {attemptError ? <p className={styles.inlineError} role='alert'>{attemptError}</p> : null}
          {order.status === 'PENDING_PAYMENT' && (!order.attempt || ['FAILED', 'CANCELLED', 'EXPIRED'].includes(order.attempt.status)) ? (
            <Button onClick={onCreateAttempt} loading={attemptLoading}>{order.attempt ? 'Thử lại thanh toán' : 'Tạo payment attempt'}</Button>
          ) : null}
          {order.status === 'PAID' ? <p className={styles.serverNotice} role='status'>Máy chủ đã ghi nhận thanh toán. Hãy dùng trạng thái membership bên trên để xác nhận quyền lợi được cấp.</p> : null}
        </Card>
      ) : null}
    </section>
  );
}

function AttemptState({ attempt }: { attempt: MembershipPaymentAttempt }) {
  const checkoutUrl = safeCheckoutUrl(attempt.checkoutUrl);
  return (
    <div className={styles.attemptState} aria-live='polite'>
      <div><span className={styles.attemptLabel}>Payment attempt</span><strong>{attemptLabel(attempt.status)}</strong></div>
      {checkoutUrl ? <a className={styles.paymentLink} href={checkoutUrl} rel='noreferrer'>Mở trang thanh toán do máy chủ cung cấp <span aria-hidden='true'>↗</span></a> : null}
      {attempt.status === 'FAILED' ? <p>Payment provider chưa sẵn sàng hoặc attempt cần được thử lại.</p> : null}
      {attempt.status === 'PENDING' && !checkoutUrl ? <p>Đang chờ hướng dẫn thanh toán từ máy chủ.</p> : null}
    </div>
  );
}

function planKey(plan: MembershipCatalogPlan): string {
  return `${plan.planVersionId}:${plan.price.id}`;
}

function createIdempotencyKey(scope: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ? `${scope}-${random}`.slice(0, 128) : `${scope}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeCheckoutUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}

function safeCheckoutError(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'MEMBERSHIP_CHANGE_NOT_SUPPORTED') return 'Gói membership hiện tại đã hoạt động; thay đổi gói chưa được hỗ trợ.';
  if (error instanceof ApiClientError && error.code === 'PAYMENT_PRODUCT_INVALID') return 'Gói này không còn sẵn sàng. Hãy tải lại bảng gói.';
  return 'Chưa thể tạo order lúc này. Giá và quyền lợi vẫn được giữ nguyên từ máy chủ.';
}

function safePaymentError(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'PAYMENT_PROVIDER_DISABLED') return 'Thanh toán trực tuyến hiện chưa được bật. Chưa có giao dịch nào được thực hiện.';
  if (error instanceof ApiClientError && error.code === 'PAYMENT_PROVIDER_UNAVAILABLE') return 'Cổng thanh toán tạm thời chưa sẵn sàng. Bạn có thể thử lại sau.';
  return 'Chưa thể tạo payment attempt. Không có quyền lợi nào được cấp từ thao tác này.';
}

function sourceLabel(source: MembershipCapabilityProjection['membership']['source']): string {
  switch (source) {
    case 'DEFAULT_FREE': return 'Free mặc định';
    case 'PURCHASE': return 'Mua membership';
    case 'CONTRIBUTION_CREDIT': return 'Đóng góp cộng đồng';
    case 'ADMIN_GRANT': return 'Cấp bởi quản trị viên';
  }
}

function orderStatusLabel(status: MembershipCheckoutOrder['status']): string {
  switch (status) {
    case 'PENDING_PAYMENT': return 'Chờ thanh toán';
    case 'PAID': return 'Đã thanh toán';
    case 'FAILED': return 'Thanh toán thất bại';
    case 'CANCELLED': return 'Đã hủy';
  }
}

function attemptLabel(status: MembershipPaymentAttempt['status']): string {
  switch (status) {
    case 'CREATED': return 'Đã tạo';
    case 'PENDING': return 'Đang chờ thanh toán';
    case 'PAID': return 'Đã thanh toán';
    case 'FAILED': return 'Thất bại';
    case 'CANCELLED': return 'Đã hủy';
    case 'EXPIRED': return 'Đã hết hạn';
  }
}
