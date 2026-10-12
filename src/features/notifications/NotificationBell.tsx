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

  const unreadLabel = center.unreadCount > 99 ? '99+' : formatNumber(center.unreadCount);
  const connectionLabel = center.connectionStatus === 'offline'
    ? t('exchange.notifications.offline')
    : center.connectionStatus === 'reconnecting'
      ? t('exchange.notifications.reconnecting')
      : center.connectionStatus === 'connecting'
        ? t('exchange.notifications.connecting')
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
        <div ref={panelRef} className={styles.panel} id='notification-panel' role='dialog' aria-label={t('exchange.notifications.title')}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.kicker}>{t('exchange.notifications.updates')}</p>
              <h2>{t('exchange.notifications.title')}</h2>
              <p className={styles.count}>{t('exchange.notifications.count', { count: center.unreadCount })}</p>
            </div>
            <button className={styles.close} type='button' onClick={close} aria-label={t('exchange.notifications.close')}><Icon name='x' size={18} /></button>
          </div>
          <div className={styles.panelToolbar}>
            <div className={styles.filters} role='tablist' aria-label={t('exchange.notifications.filter')}>
              <button className={center.filter === 'ALL' ? styles.filterActive : styles.filter} type='button' role='tab' aria-selected={center.filter === 'ALL'} onClick={() => center.setFilter('ALL')}>{t('exchange.notifications.all')}</button>
              <button className={center.filter === 'UNREAD' ? styles.filterActive : styles.filter} type='button' role='tab' aria-selected={center.filter === 'UNREAD'} onClick={() => center.setFilter('UNREAD')}>{t('exchange.notifications.unread')}</button>
            </div>
            <button className={styles.markAll} type='button' onClick={() => void center.markAllRead()} disabled={!center.unreadCount}>{t('exchange.notifications.markAll')}</button>
          </div>
          {connectionLabel ? <p className={styles.connection} role='status'><Icon name='refresh-cw' size={16} />{connectionLabel}</p> : null}
          {center.error ? <p className={styles.error} role='alert'>{center.error}</p> : null}
          {center.loading ? <NotificationSkeleton /> : <NotificationFeed items={center.visibleItems} compact onMarkRead={center.markRead} />}
          <Link className={styles.allLink} to='/notifications' onClick={close}>{t('exchange.notifications.viewAll')} <Icon name='arrow-left-right' size={16} /></Link>
        </div>
      ) : null}
    </div>
  );
}

function NotificationSkeleton() {
  const { t } = useUiLocale();
  return (
    <div className={styles.skeleton} aria-busy='true' aria-label={t('exchange.notifications.loading')}>
      {[1, 2, 3].map((item) => <span key={item} />)}
    </div>
  );
}
