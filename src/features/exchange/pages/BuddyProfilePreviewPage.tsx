import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { SelectControl, Textarea } from '../../../components/ui/FormControls';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Dialog, DropdownMenu } from '../../../components/ui/Overlays';
import { Avatar, Badge } from '../../../components/ui/Surface';
import { useAuth } from '../../auth/AuthProvider';
import { ExchangeApi } from '../exchange-api';
import type {
  BuddyProfilePreview,
  BuddyProfilePreviewApi,
  ExchangeBlockStatus,
  ExchangeReportCategory,
  ExchangeRelationshipResponse,
  RelationshipState,
} from '../exchange.types';
import { EXCHANGE_REPORT_CATEGORIES } from '../exchange.types';
import { goalLabel, humanize, proficiencyLabel } from '../../passport/passport.utils';
import styles from './BuddyProfilePreviewPage.module.css';

type RelationshipAction = 'request' | 'accept' | 'decline' | 'cancel' | 'disconnect';
type SafetyDialog = 'block' | 'unblock' | 'report' | null;

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
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error' | 'blocked'>('loading');
  const [loadError, setLoadError] = useState<unknown>(null);
  const [blockStatus, setBlockStatus] = useState<ExchangeBlockStatus | null>(null);
  const [activeAction, setActiveAction] = useState<RelationshipAction | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [safetyMenuOpen, setSafetyMenuOpen] = useState(false);
  const [safetyDialog, setSafetyDialog] = useState<SafetyDialog>(null);
  const [activeSafetyAction, setActiveSafetyAction] = useState<'block' | 'unblock' | null>(null);
  const [safetyError, setSafetyError] = useState('');
  const [safetyMessage, setSafetyMessage] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const retryLoad = useCallback(() => setRetryKey((value) => value + 1), []);

  useEffect(() => {
    if (!userId || !authenticated) return;
    let active = true;
    setLoadState('loading');
    setLoadError(null);
    setProfile(null);
    setSafetyError('');
    api.getBlockStatus(userId)
      .then((nextBlockStatus) => {
        if (!active) return;
        setBlockStatus(nextBlockStatus);
        if (nextBlockStatus.blockedByMe) {
          setLoadState('blocked');
          return null;
        }
        return api.getBuddyProfile(userId);
      })
      .then((nextProfile) => {
        if (!active || !nextProfile) return;
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

  const openSafetyDialog = useCallback((dialog: Exclude<SafetyDialog, null>) => {
    setSafetyMenuOpen(false);
    setSafetyError('');
    setSafetyDialog(dialog);
  }, []);

  const handleSafetyAction = useCallback(async (action: 'block' | 'unblock') => {
    if (activeSafetyAction || !userId) return;
    setActiveSafetyAction(action);
    setSafetyError('');
    try {
      if (action === 'block') {
        await api.blockUser(userId);
        setBlockStatus({ scope: 'exchange-block-status', targetUserId: userId, blockedByMe: true });
        setProfile(null);
        setLoadState('blocked');
        setSafetyMessage('Đã chặn thành viên này. Yêu cầu hoặc kết nối hiện có đã được gỡ.');
      } else {
        await api.unblockUser(userId);
        setBlockStatus({ scope: 'exchange-block-status', targetUserId: userId, blockedByMe: false });
        setSafetyMessage('Đã bỏ chặn. Yêu cầu hoặc kết nối trước đó không được khôi phục.');
        setRetryKey((value) => value + 1);
      }
      setSafetyDialog(null);
    } catch (cause: unknown) {
      setSafetyError(readableError(cause));
    } finally {
      setActiveSafetyAction(null);
    }
  }, [activeSafetyAction, api, userId]);

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
  if (loadState === 'blocked') {
    return (
      <>
        <BlockedPreviewState
          blockedByMe={Boolean(blockStatus?.blockedByMe)}
          message={safetyMessage}
          onUnblock={() => openSafetyDialog('unblock')}
          isUnblocking={activeSafetyAction === 'unblock'}
        />
        <SafetyConfirmDialog
          open={safetyDialog === 'unblock'}
          title='Bỏ chặn thành viên?'
          description='Bạn có thể xem lại hồ sơ nếu người này vẫn đủ điều kiện. Việc bỏ chặn không khôi phục yêu cầu hoặc kết nối trước đó.'
          confirmLabel='Bỏ chặn thành viên'
          active={activeSafetyAction === 'unblock'}
          error={safetyError}
          onClose={() => setSafetyDialog(null)}
          onConfirm={() => handleSafetyAction('unblock')}
        />
      </>
    );
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
    <>
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
          <div className={styles.heroActions}>
            <Badge tone={relationshipTone(profile.relationship.state)}>{relationshipLabel(profile.relationship.state)}</Badge>
            <SafetyMenu open={safetyMenuOpen} onToggle={() => setSafetyMenuOpen((open) => !open)} onAction={openSafetyDialog} />
          </div>
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
        {safetyMessage ? <p className={styles.safetyMessage} role='status'>{safetyMessage}</p> : null}
      </div>
      <SafetyConfirmDialog
        open={safetyDialog === 'block'}
        title='Chặn thành viên này?'
        description='Hồ sơ sẽ không còn xuất hiện trong khám phá. Các yêu cầu hoặc kết nối hiện có sẽ được gỡ và hai bên không thể bắt đầu liên hệ mới.'
        confirmLabel='Chặn thành viên'
        active={activeSafetyAction === 'block'}
        error={safetyError}
        onClose={() => setSafetyDialog(null)}
        onConfirm={() => handleSafetyAction('block')}
      />
      <ExchangeReportDialog
        open={safetyDialog === 'report'}
        api={api}
        targetUserId={userId}
        onClose={() => setSafetyDialog(null)}
        onSubmitted={() => {
          setSafetyDialog(null);
          setSafetyMessage('Báo cáo đã được tiếp nhận riêng tư để xem xét.');
        }}
      />
    </>
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

function SafetyMenu({
  open,
  onToggle,
  onAction,
}: {
  open: boolean;
  onToggle: () => void;
  onAction: (dialog: Exclude<SafetyDialog, null>) => void;
}) {
  return (
    <DropdownMenu open={open} label='An toàn' onToggle={onToggle}>
      <button className={styles.safetyMenuItem} type='button' role='menuitem' onClick={() => onAction('report')}>
        <Icon name='flag' size={18} />
        <span>Báo cáo hồ sơ</span>
      </button>
      <button className={`${styles.safetyMenuItem} ${styles.safetyMenuItemDanger}`} type='button' role='menuitem' onClick={() => onAction('block')}>
        <Icon name='lock' size={18} />
        <span>Chặn thành viên</span>
      </button>
    </DropdownMenu>
  );
}

function BlockedPreviewState({
  blockedByMe,
  message,
  onUnblock,
  isUnblocking,
}: {
  blockedByMe: boolean;
  message: string;
  onUnblock: () => void;
  isUnblocking: boolean;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.blockedPanel} role='status'>
        <span className={styles.blockedIcon} aria-hidden='true'><Icon name='lock' size={24} /></span>
        <p className={styles.eyebrow}>SAFETY STATE</p>
        <h1>Hồ sơ không khả dụng</h1>
        <p>
          Hồ sơ và các thao tác trao đổi hiện không khả dụng trong trạng thái an toàn này.
          Không có yêu cầu hoặc kết nối trước đó được tự động khôi phục.
        </p>
        {message ? <p className={styles.safetyMessage}>{message}</p> : null}
        {blockedByMe ? <Button variant='secondary' onClick={onUnblock} loading={isUnblocking}>Bỏ chặn thành viên</Button> : null}
      </div>
    </div>
  );
}

function SafetyConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  active,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  active: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} title={title} description={description} onClose={active ? () => undefined : onClose}>
      <div className={styles.safetyDialogBody}>
        <p className={styles.safetyDialogNote}>Bạn có thể thay đổi lựa chọn này sau trong giới hạn quyền của tài khoản.</p>
        {error ? <p className={styles.errorMessage} role='alert'>{error}</p> : null}
        <div className={styles.dialogActions}>
          <Button variant='quiet' onClick={onClose} disabled={active}>Hủy</Button>
          <Button variant='danger' onClick={onConfirm} loading={active}>{confirmLabel}</Button>
        </div>
      </div>
    </Dialog>
  );
}

function ExchangeReportDialog({
  open,
  api,
  targetUserId,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  api: BuddyProfilePreviewApi;
  targetUserId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [category, setCategory] = useState('');
  const [context, setContext] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCategory('');
    setContext('');
    setValidationError('');
    setSubmitError('');
    setSubmitting(false);
    setSubmitted(false);
  }, [open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedContext = context.normalize('NFKC').trim();
    if (!category) {
      setValidationError('Hãy chọn một lý do để tiếp tục.');
      return;
    }
    if (Array.from(normalizedContext).length > 1000) {
      setValidationError('Nội dung bổ sung không được vượt quá 1.000 ký tự.');
      return;
    }
    setValidationError('');
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.reportUser(targetUserId, {
        category: category as ExchangeReportCategory,
        ...(normalizedContext ? { context: normalizedContext } : {}),
      });
      setSubmitted(true);
    } catch (cause: unknown) {
      setSubmitError(readableError(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} title='Báo cáo hồ sơ' onClose={submitting ? () => undefined : onClose}>
      {submitted ? (
        <div className={styles.reportSubmitted} role='status'>
          <span className={styles.blockedIcon} aria-hidden='true'><Icon name='check' size={24} /></span>
          <h3>Đã tiếp nhận báo cáo</h3>
          <p>Báo cáo được lưu riêng tư để xem xét. Báo cáo không công khai danh tính của bạn và không hứa hẹn xử lý tức thời.</p>
          <Button onClick={onSubmitted}>Đóng</Button>
        </div>
      ) : (
        <form className={styles.reportForm} onSubmit={handleSubmit} noValidate>
          <p className={styles.safetyDialogNote}>Chọn lý do phù hợp. Thông tin này chỉ dành cho quy trình xem xét nội bộ.</p>
          <SelectControl
            label='Lý do báo cáo'
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setValidationError('');
            }}
            required
          >
            <option value=''>Chọn lý do</option>
            {EXCHANGE_REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>{reportCategoryLabel(value)}</option>
            ))}
          </SelectControl>
          <Textarea
            label='Ngữ cảnh bổ sung'
            value={context}
            onChange={(event) => {
              setContext(event.target.value);
              setValidationError('');
            }}
            hint='Không bắt buộc'
            rows={5}
          />
          <p className={styles.charCount} aria-live='polite'>{Array.from(context).length.toLocaleString('vi-VN')} / 1.000 ký tự</p>
          {validationError ? <p className={styles.errorMessage} role='alert'>{validationError}</p> : null}
          {submitError ? <p className={styles.errorMessage} role='alert'>{submitError}</p> : null}
          <div className={styles.dialogActions}>
            <Button variant='quiet' type='button' onClick={onClose} disabled={submitting}>Hủy</Button>
            <Button type='submit' loading={submitting}>Gửi báo cáo</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function reportCategoryLabel(category: ExchangeReportCategory): string {
  switch (category) {
    case 'SPAM': return 'Spam hoặc quảng cáo không mong muốn';
    case 'HARASSMENT': return 'Quấy rối hoặc thiếu tôn trọng';
    case 'INAPPROPRIATE_CONTENT': return 'Nội dung không phù hợp';
    case 'IMPERSONATION': return 'Mạo danh hoặc thông tin gây hiểu nhầm';
    case 'SAFETY_CONCERN': return 'Lo ngại về an toàn';
    case 'OTHER': return 'Lý do khác';
  }
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
