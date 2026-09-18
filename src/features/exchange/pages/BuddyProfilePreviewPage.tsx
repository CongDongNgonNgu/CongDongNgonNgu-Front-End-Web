import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Avatar, Badge } from '../../../components/ui/Surface';
import { useAuth } from '../../auth/AuthProvider';
import { ExchangeApi } from '../exchange-api';
import type {
  BuddyProfilePreview,
  BuddyProfilePreviewApi,
  ExchangeRelationshipResponse,
  RelationshipState,
} from '../exchange.types';
import { goalLabel, humanize, proficiencyLabel } from '../../passport/passport.utils';
import styles from './BuddyProfilePreviewPage.module.css';

type RelationshipAction = 'request' | 'accept' | 'decline' | 'cancel' | 'disconnect';

interface BuddyProfilePreviewPageViewProps {
  api: BuddyProfilePreviewApi;
  authenticated: boolean;
  authLoading?: boolean;
  userId?: string;
}

export function BuddyProfilePreviewPage() {
  const auth = useAuth();
  const api = useMemo(() => new ExchangeApi(auth.api), [auth.api]);
  return (
    <BuddyProfilePreviewPageView
      api={api}
      authenticated={auth.status === 'authenticated'}
      authLoading={auth.status === 'loading'}
    />
  );
}

export function BuddyProfilePreviewPageView({
  api,
  authenticated,
  authLoading = false,
  userId: providedUserId,
}: BuddyProfilePreviewPageViewProps) {
  const params = useParams<{ userId?: string }>();
  const location = useLocation();
  const userId = providedUserId ?? params.userId ?? '';
  const [profile, setProfile] = useState<BuddyProfilePreview | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<unknown>(null);
  const [activeAction, setActiveAction] = useState<RelationshipAction | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const retryLoad = useCallback(() => setRetryKey((value) => value + 1), []);

  useEffect(() => {
    if (!userId || !authenticated) return;
    let active = true;
    setLoadState('loading');
    setLoadError(null);
    api.getBuddyProfile(userId)
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setLoadState('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setProfile(null);
        setLoadError(cause);
        setLoadState('error');
      });
    return () => {
      active = false;
    };
  }, [api, authenticated, retryKey, userId]);

  const handleAction = useCallback(async (action: RelationshipAction) => {
    if (!profile || activeAction || !userId) return;
    setActiveAction(action);
    setActionError('');
    setActionMessage('');
    try {
      const relationship = await runRelationshipAction(api, action, userId);
      setProfile((current) => current ? { ...current, relationship } : current);
      setActionMessage(successMessage(action));
    } catch (cause: unknown) {
      setActionError(readableError(cause));
    } finally {
      setActiveAction(null);
    }
  }, [activeAction, api, profile, userId]);

  if (authLoading && !providedUserId) {
    return <PreviewLoading />;
  }
  if (!authenticated && !providedUserId) {
    return <Navigate to='/login' replace state={{ from: location.pathname }} />;
  }
  if (!userId) {
    return <Navigate to='/exchange' replace />;
  }
  if (loadState === 'error') {
    return (
      <div className={styles.page}>
        <ErrorState
          title='Chưa tải được hồ sơ bạn cùng học'
          description='Hồ sơ này chưa sẵn sàng hoặc không còn khả dụng. Hãy thử tải lại để tiếp tục.'
          onRetry={retryLoad}
          retryLabel='Tải lại hồ sơ'
        />
      </div>
    );
  }
  if (loadState === 'loading' || !profile) {
    return <PreviewLoading />;
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/exchange'>Tìm bạn học</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Hồ sơ bạn cùng học</span>
      </nav>

      <section className={styles.hero} aria-labelledby='buddy-preview-heading'>
        <div className={styles.identityBlock}>
          <Avatar name={profile.user.displayName} size='lg' />
          <div>
            <p className={styles.eyebrow}>BUDDY PROFILE PREVIEW</p>
            <h1 id='buddy-preview-heading'>{profile.user.displayName}</h1>
            <p className={styles.heroDescription}>Một phần chiếu công khai của hồ sơ trao đổi ngôn ngữ.</p>
          </div>
        </div>
        <Badge tone={relationshipTone(profile.relationship.state)}>{relationshipLabel(profile.relationship.state)}</Badge>
      </section>

      <aside className={styles.privacyNote} aria-label='Phạm vi hiển thị'>
        <strong>Chỉ hiển thị thông tin an toàn.</strong>
        <span>Email, số điện thoại, OAuth, phiên đăng nhập, vị trí, múi giờ chính xác và lịch cụ thể không xuất hiện ở đây.</span>
      </aside>

      <div className={styles.contentGrid}>
        <div className={styles.profileColumn}>
          <section className={styles.panel} aria-labelledby='languages-heading'>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>LANGUAGE PASSPORT</p>
              <h2 id='languages-heading'>Ngôn ngữ trao đổi</h2>
            </div>
            <div className={styles.languageGrid}>
              <LanguageGroup title='Có thể hỗ trợ' languages={profile.languages.filter((language) => language.offered)} />
              <LanguageGroup title='Muốn luyện' languages={profile.languages.filter((language) => language.wanted)} />
            </div>
          </section>

          <section className={styles.panel} aria-labelledby='topics-heading'>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>SHARED CONTEXT</p>
              <h2 id='topics-heading'>Mục tiêu và sở thích công khai</h2>
            </div>
            <div className={styles.topicColumns}>
              <TopicGroup title='Mục tiêu' values={profile.goals.map(goalLabel)} empty='Chưa chia sẻ mục tiêu' />
              <TopicGroup title='Sở thích' values={profile.interests.map(humanize)} empty='Chưa chia sẻ sở thích' />
            </div>
          </section>

          <section className={styles.panel} aria-labelledby='availability-heading'>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>MATCHING SIGNALS</p>
              <h2 id='availability-heading'>Thông tin khái quát</h2>
            </div>
            <dl className={styles.summaryList}>
              <div>
                <dt>Múi giờ</dt>
                <dd>{profile.timezoneSummary?.hasTimezone ? 'Đã chia sẻ ở mức khái quát' : 'Chưa chia sẻ'}</dd>
              </div>
              <div>
                <dt>Khả năng sắp xếp</dt>
                <dd>{profile.availabilitySummary?.hasAvailability ? 'Có thông tin khái quát' : 'Chưa chia sẻ'}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className={`${styles.panel} ${styles.relationshipPanel}`} aria-labelledby='relationship-heading'>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>RELATIONSHIP</p>
            <h2 id='relationship-heading'>Trạng thái kết nối</h2>
          </div>
          <div className={styles.statusBlock} role='status' aria-live='polite'>
            <Badge tone={relationshipTone(profile.relationship.state)}>{relationshipLabel(profile.relationship.state)}</Badge>
            <p>{relationshipDescription(profile.relationship.state)}</p>
          </div>
          {activeAction ? <p className={styles.liveMessage} role='status' aria-live='polite'>Đang cập nhật trạng thái kết nối…</p> : null}
          {actionMessage ? <p className={styles.successMessage} role='status' aria-live='polite'>{actionMessage}</p> : null}
          {actionError ? <p className={styles.errorMessage} role='alert'>{actionError}</p> : null}
          <RelationshipActions
            relationship={profile.relationship}
            activeAction={activeAction}
            onAction={handleAction}
          />
          <p className={styles.relationshipNote}>Kết nối giúp hai bên tiếp tục trao đổi. Đây không phải là đánh giá, chứng thực hay quyền truy cập vào liên hệ cá nhân.</p>
        </aside>
      </div>
    </div>
  );
}

function LanguageGroup({ title, languages }: { title: string; languages: BuddyProfilePreview['languages'] }) {
  return (
    <div className={styles.languageGroup}>
      <h3>{title}</h3>
      {languages.length > 0 ? (
        <ul className={styles.languageList}>
          {languages.map((language) => (
            <li key={`${title}-${language.code}`} className={styles.languageItem}>
              <div>
                <strong>{language.nativeName}</strong>
                <span>{language.englishName}</span>
              </div>
              <small>
                {proficiencyLabel(language.declaredProficiency)}
                {language.assessedProficiency ? ` · Đánh giá ${language.assessedProficiency}` : ''}
              </small>
            </li>
          ))}
        </ul>
      ) : <p className={styles.mutedValue}>Chưa chia sẻ</p>}
    </div>
  );
}

function TopicGroup({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return (
    <div className={styles.topicGroup}>
      <h3>{title}</h3>
      {values.length > 0 ? <ul className={styles.topicList}>{values.map((value) => <li key={value}>{value}</li>)}</ul> : <p className={styles.mutedValue}>{empty}</p>}
    </div>
  );
}

function RelationshipActions({
  relationship,
  activeAction,
  onAction,
}: {
  relationship: ExchangeRelationshipResponse;
  activeAction: RelationshipAction | null;
  onAction: (action: RelationshipAction) => void;
}) {
  const disabled = activeAction !== null;
  return (
    <div className={styles.actionGroup} aria-label='Hành động kết nối'>
      {relationship.canRequest ? <Button fullWidth onClick={() => onAction('request')} loading={activeAction === 'request'} disabled={disabled}>Kết nối</Button> : null}
      {relationship.canAccept ? <Button fullWidth onClick={() => onAction('accept')} loading={activeAction === 'accept'} disabled={disabled}>Chấp nhận kết nối</Button> : null}
      {relationship.canDecline ? <Button fullWidth variant='quiet' onClick={() => onAction('decline')} loading={activeAction === 'decline'} disabled={disabled}>Từ chối</Button> : null}
      {relationship.canCancel ? <Button fullWidth variant='quiet' onClick={() => onAction('cancel')} loading={activeAction === 'cancel'} disabled={disabled}>Hủy yêu cầu</Button> : null}
      {relationship.canDisconnect ? <Button fullWidth variant='danger' onClick={() => onAction('disconnect')} loading={activeAction === 'disconnect'} disabled={disabled}>Ngắt kết nối</Button> : null}
    </div>
  );
}

function PreviewLoading() {
  return <div className={styles.page}><div className={styles.loadingPanel}><Skeleton lines={7} label='Đang tải hồ sơ bạn cùng học' /></div></div>;
}

async function runRelationshipAction(api: BuddyProfilePreviewApi, action: RelationshipAction, userId: string) {
  switch (action) {
    case 'request': return api.requestConnection(userId);
    case 'accept': return api.acceptConnection(userId);
    case 'decline': return api.declineConnection(userId);
    case 'cancel': return api.cancelConnection(userId);
    case 'disconnect': return api.disconnect(userId);
  }
}

function relationshipLabel(state: RelationshipState): string {
  switch (state) {
    case 'OUTGOING_PENDING': return 'Đã gửi yêu cầu';
    case 'INCOMING_PENDING': return 'Có yêu cầu đang chờ';
    case 'CONNECTED': return 'Đã kết nối';
    default: return 'Chưa kết nối';
  }
}

function relationshipDescription(state: RelationshipState): string {
  switch (state) {
    case 'OUTGOING_PENDING': return 'Yêu cầu của bạn đang chờ người này phản hồi.';
    case 'INCOMING_PENDING': return 'Người này đã gửi yêu cầu kết nối với bạn.';
    case 'CONNECTED': return 'Hai bạn đã đồng ý kết nối trong không gian trao đổi.';
    default: return 'Gửi một yêu cầu khi bạn muốn tiếp tục kết nối.';
  }
}

function relationshipTone(state: RelationshipState): 'neutral' | 'info' | 'success' | 'warning' {
  switch (state) {
    case 'CONNECTED': return 'success';
    case 'INCOMING_PENDING': return 'warning';
    case 'OUTGOING_PENDING': return 'info';
    default: return 'neutral';
  }
}

function successMessage(action: RelationshipAction): string {
  switch (action) {
    case 'request': return 'Đã gửi yêu cầu kết nối.';
    case 'accept': return 'Đã chấp nhận yêu cầu kết nối.';
    case 'decline': return 'Đã từ chối yêu cầu kết nối.';
    case 'cancel': return 'Đã hủy yêu cầu kết nối.';
    case 'disconnect': return 'Đã ngắt kết nối.';
  }
}

function readableError(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message;
  return 'Không thể cập nhật kết nối lúc này. Vui lòng thử lại.';
}
