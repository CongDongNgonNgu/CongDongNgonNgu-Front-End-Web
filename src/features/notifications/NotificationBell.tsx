import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon/Icon';
import { NotificationFeed } from './NotificationFeed';
import { useOptionalNotificationCenter } from './NotificationCenterProvider';
import styles from './NotificationBell.module.css';
import { useUiLocale } from '../ui-locale/UiLocaleProvider';

export function NotificationBell() {
  const { t, formatNumber } = useUiLocale();
  const center = useOptionalNotificationCenter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (panelRef.current?.contains(event.target as Node) || triggerRef.current?.contains(event.target as Node)) return;
      event.preventDefault();
      close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [close, open]);

  if (!center?.active) return null;

  const unreadLabel = center.unreadCount > 99 ? '99+' : String(center.unreadCount);
  const connectionLabel = center.connectionStatus === 'offline'
    ? 'Ngoại tuyến · Đang thử kết nối lại'
    : center.connectionStatus === 'reconnecting'
      ? 'Đang kết nối lại luồng cập nhật'
      : center.connectionStatus === 'connecting'
        ? 'Đang kết nối luồng cập nhật'
        : null;

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        className={[styles.trigger, open ? styles.triggerActive : ''].filter(Boolean).join(' ')}
        type='button'
        aria-label={center.unreadCount ? t('shell.notificationsUnread', { count: formatNumber(center.unreadCount) }) : t('shell.notifications')}
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-controls='notification-panel'
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name='bell' size={20} />
        {center.unreadCount ? <span className={styles.badge} aria-hidden='true'>{unreadLabel}</span> : null}
      </button>
      {open ? (
        <div ref={panelRef} className={styles.panel} id='notification-panel' role='dialog' aria-label='Thông báo'>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>Cập nhật của bạn</p>
              <h2>Thông báo</h2>
              <p className={styles.count}>{center.unreadCount} chưa đọc</p>
            </div>
            <button className={styles.close} type='button' onClick={close} aria-label='Đóng bảng thông báo'><Icon name='x' size={18} /></button>
          </div>
          <div className={styles.panelToolbar}>
            <div className={styles.filters} role='tablist' aria-label='Lọc thông báo'>
              <button className={center.filter === 'ALL' ? styles.filterActive : styles.filter} type='button' role='tab' aria-selected={center.filter === 'ALL'} onClick={() => center.setFilter('ALL')}>Tất cả</button>
              <button className={center.filter === 'UNREAD' ? styles.filterActive : styles.filter} type='button' role='tab' aria-selected={center.filter === 'UNREAD'} onClick={() => center.setFilter('UNREAD')}>Chưa đọc</button>
            </div>
            <button className={styles.markAll} type='button' onClick={() => void center.markAllRead()} disabled={!center.unreadCount}>Đọc hết</button>
          </div>
          {connectionLabel ? <p className={styles.connection} role='status'><Icon name='refresh-cw' size={16} />{connectionLabel}</p> : null}
          {center.error ? <p className={styles.error} role='alert'>{center.error}</p> : null}
          {center.loading ? <NotificationSkeleton /> : <NotificationFeed items={center.visibleItems} compact onMarkRead={center.markRead} />}
          <Link className={styles.allLink} to='/notifications' onClick={close}>Xem tất cả thông báo <Icon name='arrow-left-right' size={16} /></Link>
        </div>
      ) : null}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy='true' aria-label='Đang tải thông báo'>
      {[1, 2, 3].map((item) => <span key={item} />)}
    </div>
  );
}
