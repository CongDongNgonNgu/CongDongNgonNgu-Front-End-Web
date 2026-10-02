import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Avatar, Badge, Card } from '../../../components/ui/Surface';
import type { AuthStatus } from '../../auth/AuthProvider';
import type { PublicProfile } from '../../passport/passport.types';
import type { EventPublicSummary, EventRegistrationResponse } from '../event.types';
import { eventStateLabel, eventStateTone, formatEventDate, languageLabel, registrationStateLabel, venueLabel } from '../event.formatters';
import styles from './EventDetailPanel.module.css';

interface EventDetailPanelProps {
  event: EventPublicSummary;
  hostProfile: PublicProfile | null;
  hostLoading: boolean;
  authStatus: AuthStatus;
  registration: EventRegistrationResponse | null;
  registrationLoading: boolean;
  actionLoading: boolean;
  actionError: string | null;
  onRegister: () => void;
  onCancel: () => void;
}

export function EventDetailPanel({
  event,
  hostProfile,
  hostLoading,
  authStatus,
  registration,
  registrationLoading,
  actionLoading,
  actionError,
  onRegister,
  onCancel,
}: EventDetailPanelProps) {
  const hostName = hostProfile?.user.displayName ?? 'Người tổ chức cộng đồng';

  return (
    <Card className={styles.panel} as='article'>
      <header className={styles.header}>
        <div className={styles.badges}>
          <Badge tone={eventStateTone(event.state)}>{eventStateLabel(event.state)}</Badge>
          {event.visibility === 'PRIVATE' ? <Badge tone='warning'>Riêng tư</Badge> : null}
        </div>
        <span className={styles.eventKind}><Icon name='calendar-check' size={18} />Sự kiện cộng đồng</span>
      </header>

      <div className={styles.heading}>
        <p className={styles.language}>{languageLabel(event.languageCode)}{event.level ? ` · ${event.level}` : ''}</p>
        <h1>{event.title}</h1>
        {event.topic ? <p className={styles.topic}>Chủ đề: {event.topic}</p> : null}
      </div>

      <section className={styles.hostSection} aria-labelledby='event-host-title'>
        <p className={styles.kicker} id='event-host-title'>Người tổ chức</p>
        {hostLoading ? <p className={styles.muted}>Đang tải thông tin người tổ chức…</p> : (
          hostProfile ? (
            <Link className={styles.hostLink} to={`/profiles/${hostProfile.user.id}`}>
              <Avatar name={hostName} size='md' />
              <span><strong>{hostName}</strong><small>Xem hồ sơ công khai</small></span>
            </Link>
          ) : (
            <div className={styles.hostLink}>
              <Avatar name={hostName} size='md' />
              <span><strong>{hostName}</strong><small>Thông tin công khai chưa sẵn sàng</small></span>
            </div>
          )
        )}
      </section>

      <section aria-labelledby='event-facts-title'>
        <h2 className={styles.screenReaderOnly} id='event-facts-title'>Thông tin sự kiện</h2>
        <dl className={styles.facts}>
          <div>
            <dt><Icon name='calendar-check' size={18} />Thời gian</dt>
            <dd><time dateTime={event.startAt}>{formatEventDate(event.startAt, event.timezone)}</time><span>đến</span><time dateTime={event.endAt}>{formatEventDate(event.endAt, event.timezone)}</time></dd>
          </div>
          <div>
            <dt><Icon name='globe' size={18} />Múi giờ</dt>
            <dd>Giờ địa phương của sự kiện · {event.timezone}</dd>
          </div>
          <div>
            <dt><Icon name='languages' size={18} />Ngôn ngữ</dt>
            <dd>{languageLabel(event.languageCode)}{event.level ? ` · trình độ ${event.level}` : ''}</dd>
          </div>
          <div>
            <dt><Icon name='radio' size={18} />Hình thức</dt>
            <dd>{venueLabel(event.venueType)}</dd>
          </div>
          <div>
            <dt><Icon name='users' size={18} />Sức chứa</dt>
            <dd>Giới hạn {event.capacity} người</dd>
          </div>
        </dl>
      </section>

      {event.venueType === 'SPEAKING_ROOM' ? (
        <p className={styles.boundaryNote}><Icon name='shield-check' size={18} />Đăng ký không tự cấp quyền vào phòng nói; quyền truy cập vẫn do máy chủ kiểm tra.</p>
      ) : null}

      <section className={styles.actionArea} aria-labelledby='event-action-title'>
        <div>
          <p className={styles.kicker}>Tham gia</p>
          <h2 id='event-action-title'>Giữ chỗ theo trạng thái máy chủ</h2>
        </div>
        {registrationLoading ? <p className={styles.muted} role='status'>Đang kiểm tra trạng thái đăng ký…</p> : null}
        {registration ? (
          <div className={styles.registrationState} role='status'>
            <Badge tone={registration.status === 'WAITLISTED' ? 'warning' : registration.status === 'CANCELLED' ? 'neutral' : 'success'}>{registrationStateLabel(registration.status)}</Badge>
            {registration.status === 'WAITLISTED' ? <p>Sự kiện đã đủ chỗ theo quyết định của máy chủ. Bạn đang ở danh sách chờ.</p> : registration.status === 'CANCELLED' ? <p>Đã hủy đăng ký trước đó. Bạn có thể đăng ký lại nếu sự kiện còn mở.</p> : <p>Bạn đã giữ một suất tham gia cho sự kiện này.</p>}
            {registration.waitlistPosition ? <p>Vị trí danh sách chờ: {registration.waitlistPosition}</p> : null}
          </div>
        ) : null}
        {renderAction(event, authStatus, registration, registrationLoading, actionLoading, onRegister, onCancel)}
        {actionError ? <p className={styles.actionError} role='alert'>{actionError}</p> : null}
      </section>
    </Card>
  );
}

function renderAction(
  event: EventPublicSummary,
  authStatus: AuthStatus,
  registration: EventRegistrationResponse | null,
  registrationLoading: boolean,
  actionLoading: boolean,
  onRegister: () => void,
  onCancel: () => void,
) {
  if (event.state === 'CANCELLED') return <p className={styles.stateNote}><Icon name='info' size={18} />Sự kiện này đã được hủy. Không thể đăng ký mới.</p>;
  if (event.state === 'ENDED') return <p className={styles.stateNote}><Icon name='info' size={18} />Sự kiện đã kết thúc. Thông tin vẫn được giữ để tham khảo.</p>;
  if (event.state === 'LIVE') return <p className={styles.stateNote}><Icon name='radio' size={18} />Sự kiện đang diễn ra. Đăng ký mới không còn mở.</p>;
  if (event.isHost) return <p className={styles.stateNote}><Icon name='shield-check' size={18} />Bạn là người tổ chức; không cần đăng ký cho sự kiện của mình.</p>;
  if (authStatus === 'loading') return <Button disabled>Đang kiểm tra phiên đăng nhập</Button>;
  if (authStatus === 'unauthenticated') return <Link className={styles.loginLink} to='/login'>Đăng nhập để đăng ký</Link>;
  if (registrationLoading) return <Button disabled>Đang kiểm tra trạng thái đăng ký</Button>;
  if (registration?.status === 'REGISTERED' || registration?.status === 'WAITLISTED') {
    return <Button variant='quiet' loading={actionLoading} onClick={onCancel}>Hủy đăng ký</Button>;
  }
  return <Button loading={actionLoading} onClick={onRegister}>Đăng ký tham gia</Button>;
}

export function getEventActionError(error: unknown): string {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code?: string }).code;
    if (code === 'EVENT_HOST_CANNOT_REGISTER') return 'Người tổ chức không thể đăng ký cho chính sự kiện này.';
    if (code === 'EVENT_REGISTRATION_NOT_AVAILABLE') return 'Sự kiện không còn nhận đăng ký mới.';
    if (code === 'EVENT_NOT_FOUND') return 'Sự kiện không còn khả dụng hoặc bạn chưa được mời.';
  }
  return 'Chưa thể cập nhật đăng ký lúc này. Hãy thử lại sau.';
}

export function isMissingRegistration(error: unknown): boolean {
  return error instanceof Error && 'status' in error && 'code' in error
    && (error as { status?: number }).status === 404
    && (error as { code?: string }).code === 'EVENT_REGISTRATION_NOT_FOUND';
}
