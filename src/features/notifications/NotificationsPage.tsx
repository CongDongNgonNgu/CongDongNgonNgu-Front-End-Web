import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon/Icon';
import { useAuth } from '../auth/AuthProvider';
import { NotificationFeed } from './NotificationFeed';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';
import { useNotificationCenter, type NotificationFilter } from './NotificationCenterProvider';
import styles from './NotificationsPage.module.css';

const filters: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'UNREAD', label: 'Chưa đọc' },
  { value: 'COMMUNITY', label: 'Thảo luận' },
  { value: 'CORRECTIONS', label: 'Hiệu đính' },
  { value: 'EXCHANGE', label: 'Kết nối' },
  { value: 'REPUTATION', label: 'Uy tín' },
  { value: 'MEMBERSHIP', label: 'Tài khoản' },
  { value: 'SECURITY', label: 'Bảo mật' },
];

export function NotificationsPage() {
  const { status } = useAuth();
  const center = useNotificationCenter();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  if (status !== 'authenticated') {
    return (
      <div className={styles.guest}>
        <Icon name='bell' size={24} />
        <h1>Thông báo</h1>
        <p>Đăng nhập để xem các cập nhật riêng tư của bạn.</p>
        <Link className={styles.primaryLink} to='/login'>Đăng nhập</Link>
      </div>
    );
  }

  const connectionLabel = center.connectionStatus === 'offline'
    ? 'Mất kết nối mạng tạm thời. Đang thử kết nối lại.'
    : center.connectionStatus === 'reconnecting'
      ? 'Đang kết nối lại luồng thông báo thời gian thực.'
      : center.connectionStatus === 'connecting'
        ? 'Đang kết nối luồng thông báo thời gian thực.'
        : null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link className={styles.backLink} to='/' aria-label='Quay lại trang chủ'><Icon name='chevron-down' size={20} />Trang chủ</Link>
        <div className={styles.headingBlock}>
          <p className={styles.kicker}>Trung tâm cập nhật</p>
          <h1>Thông báo</h1>
          <p className={styles.subtitle}>{center.unreadCount} thông báo chưa đọc</p>
        </div>
        <div className={styles.actions}>
          <Button variant='quiet' size='sm' onClick={() => void center.markAllRead()} disabled={!center.unreadCount}>
            <Icon name='check-circle' size={16} /> Đánh dấu đã đọc tất cả
          </Button>
          <Button variant='quiet' size='sm' onClick={() => setPreferencesOpen(true)}>
            <Icon name='more-horizontal' size={16} /> Tùy chọn
          </Button>
        </div>
      </div>

      <p className={styles.liveRegion} aria-live='polite'>{center.announcement}</p>
      {connectionLabel ? (
        <div className={styles.connection} role='status'>
          <Icon name={center.connectionStatus === 'offline' ? 'wifi-off' : 'refresh-cw'} size={18} />
          <span>{connectionLabel}</span>
          <Button variant='quiet' size='sm' onClick={() => void center.refresh()}>Thử lại</Button>
        </div>
      ) : null}
      {center.error ? <div className={styles.error} role='alert'>{center.error}</div> : null}

      <div className={styles.filterScroller} role='tablist' aria-label='Lọc thông báo'>
        {filters.map((item) => (
          <button
            className={center.filter === item.value ? styles.filterActive : styles.filter}
            key={item.value}
            type='button'
            role='tab'
            aria-selected={center.filter === item.value}
            onClick={() => center.setFilter(item.value)}
          >
            {item.label}{item.value === 'UNREAD' ? ` (${center.unreadCount})` : ''}
          </button>
        ))}
      </div>

      <section className={styles.content} aria-label='Danh sách thông báo'>
        {center.loading ? <NotificationSkeleton /> : <NotificationFeed items={center.visibleItems} onMarkRead={center.markRead} />}
      </section>

      <NotificationPreferencesDialog open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy='true' aria-label='Đang tải thông báo'>
      {[1, 2, 3, 4].map((item) => <span key={item} />)}
    </div>
  );
}
