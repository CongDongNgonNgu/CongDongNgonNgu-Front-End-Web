import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiClientError } from '../../../services/api-client';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { useAuth, type AuthStatus } from '../../auth/AuthProvider';
import { createEventApi, eventApi, type EventApi } from '../event.api';
import type { EventPublicSummary, EventRegistrationResponse } from '../event.types';
import { EventDetailPanel, getEventActionError, isMissingRegistration } from '../components/EventDetailPanel';
import styles from './EventDetailPage.module.css';

interface EventDetailPageViewProps {
  api?: EventApi;
  authStatus: AuthStatus;
  eventId?: string;
}

export function EventDetailPage() {
  const auth = useAuth();
  const params = useParams<{ eventId: string }>();
  const api = useMemo(() => createEventApi(auth.api), [auth.api]);
  return <EventDetailPageView api={api} authStatus={auth.status} eventId={params.eventId} />;
}

export function EventDetailPageView({ api = eventApi, authStatus, eventId }: EventDetailPageViewProps) {
  const [event, setEvent] = useState<EventPublicSummary | null>(null);
  const [hostProfile, setHostProfile] = useState<Awaited<ReturnType<EventApi['getHostProfile']>> | null>(null);
  const [registration, setRegistration] = useState<EventRegistrationResponse | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<unknown>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const requestId = useRef(0);

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setLoadState('error');
      setLoadError(new Error('Missing event id'));
      return;
    }
    const currentRequestId = ++requestId.current;
    setLoadState('loading');
    setLoadError(null);
    setActionError(null);
    setEvent(null);
    setHostProfile(null);
    setRegistration(null);
    setHostLoading(true);
    setRegistrationLoading(authStatus === 'authenticated');
    try {
      const nextEvent = await api.get(eventId, authStatus === 'authenticated');
      if (currentRequestId !== requestId.current) return;
      setEvent(nextEvent);
      setLoadState('ready');

      const hostPromise = api.getHostProfile(nextEvent.hostUserId)
        .then((profile) => {
          if (currentRequestId === requestId.current) setHostProfile(profile);
        })
        .catch(() => undefined)
        .finally(() => {
          if (currentRequestId === requestId.current) setHostLoading(false);
        });

      const registrationPromise = authStatus === 'authenticated'
        ? api.getRegistration(nextEvent.id)
          .then((nextRegistration) => {
            if (currentRequestId === requestId.current) setRegistration(nextRegistration);
          })
          .catch((cause) => {
            if (currentRequestId !== requestId.current) return;
            if (!isMissingRegistration(cause)) setActionError('Chưa thể kiểm tra trạng thái đăng ký lúc này.');
          })
          .finally(() => {
            if (currentRequestId === requestId.current) setRegistrationLoading(false);
          })
        : Promise.resolve();

      await Promise.all([hostPromise, registrationPromise]);
    } catch (cause) {
      if (currentRequestId !== requestId.current) return;
      setEvent(null);
      setLoadState('error');
      setLoadError(cause);
      setHostLoading(false);
      setRegistrationLoading(false);
    }
  }, [api, authStatus, eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  async function handleRegister(): Promise<void> {
    if (!event || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      setRegistration(await api.register(event.id));
    } catch (cause) {
      setActionError(getEventActionError(cause));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!event || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    try {
      setRegistration(await api.cancelRegistration(event.id));
    } catch (cause) {
      setActionError(getEventActionError(cause));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label='Breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span aria-hidden='true'>/</span>
        <Link to='/events'>Sự kiện</Link>
        <span aria-hidden='true'>/</span>
        <span aria-current='page'>Chi tiết</span>
      </nav>
      {loadState === 'loading' ? <Skeleton lines={9} label='Đang tải chi tiết sự kiện' /> : null}
      {loadState === 'error' ? <ErrorState title='Không thể tải sự kiện' description={getLoadErrorDescription(loadError)} onRetry={() => void loadEvent()} /> : null}
      {loadState === 'ready' && event ? (
        <EventDetailPanel
          event={event}
          hostProfile={hostProfile}
          hostLoading={hostLoading}
          authStatus={authStatus}
          registration={registration}
          registrationLoading={registrationLoading}
          actionLoading={actionLoading}
          actionError={actionError}
          onRegister={() => void handleRegister()}
          onCancel={() => void handleCancel()}
        />
      ) : null}
      {loadState === 'ready' && !event ? <EmptyState title='Không tìm thấy sự kiện' description='Liên kết sự kiện này chưa có đủ thông tin để hiển thị.' icon='calendar-check' /> : null}
    </div>
  );
}

function getLoadErrorDescription(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'EVENT_NOT_FOUND') {
    return 'Sự kiện không còn khả dụng hoặc bạn chưa được mời tham gia.';
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Bạn có thể đang ngoại tuyến. Kiểm tra kết nối rồi thử tải lại.';
  }
  return 'Thông tin sự kiện hiện chưa sẵn sàng. Hãy thử tải lại sau.';
}
