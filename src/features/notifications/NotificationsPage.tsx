import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon/Icon';
import { useAuth } from '../auth/AuthProvider';
import { NotificationFeed } from './NotificationFeed';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';
import { useNotificationCenter, type NotificationFilter } from './NotificationCenterProvider';
import styles from './NotificationsPage.module.css';
import { useUiLocale } from '../ui-locale/UiLocaleProvider';
import type { TranslationKey } from '../ui-locale/ui-locale';

const filters: Array<{ value: NotificationFilter; label: TranslationKey }> = [
  { value: 'ALL', label: 'exchange.notifications.all' },
  { value: 'UNREAD', label: 'exchange.notifications.unread' },
  { value: 'COMMUNITY', label: 'exchange.notifications.communityFilter' },
  { value: 'CORRECTIONS', label: 'exchange.notifications.category.CORRECTIONS' },
  { value: 'EXCHANGE', label: 'exchange.notifications.category.EXCHANGE' },
  { value: 'REPUTATION', label: 'exchange.notifications.reputationFilter' },
  { value: 'MEMBERSHIP', label: 'exchange.notifications.membershipFilter' },
  { value: 'SECURITY', label: 'exchange.notifications.category.SECURITY' },
];

export function NotificationsPage() {
  const { t, formatNumber } = useUiLocale();
  const { status } = useAuth();
  const center = useNotificationCenter();
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  if (status !== 'authenticated') {
    return (
      <div className={styles.guest}>
        <Icon name='bell' size={24} />
        <h1>{t('exchange.notifications.title')}</h1>
        <p>{t('exchange.notifications.guest')}</p>
        <Link className={styles.primaryLink} to='/login'>{t('exchange.notifications.login')}</Link>
      </div>
    );
  }

  const connectionLabel = center.connectionStatus === 'offline'
    ? t('exchange.notifications.pageOffline')
    : center.connectionStatus === 'reconnecting'
      ? t('exchange.notifications.pageReconnecting')
      : center.connectionStatus === 'connecting'
        ? t('exchange.notifications.pageConnecting')
        : null;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <Link className={styles.backLink} to='/' aria-label={t('exchange.notifications.backHome')}><Icon name='chevron-down' size={20} />{t('exchange.notifications.home')}</Link>
        <div className={styles.headingBlock}>
          <p className={styles.kicker}>{t('exchange.notifications.center')}</p>
          <h1>{t('exchange.notifications.title')}</h1>
          <p className={styles.subtitle}>{t('exchange.notifications.pageCount', { count: center.unreadCount })}</p>
        </div>
        <div className={styles.actions}>
          <Button variant='quiet' size='sm' onClick={() => void center.markAllRead()} disabled={!center.unreadCount}>
            <Icon name='check-circle' size={16} /> {t('exchange.notifications.markAllLong')}
          </Button>
          <Button variant='quiet' size='sm' onClick={() => setPreferencesOpen(true)}>
            <Icon name='more-horizontal' size={16} /> {t('exchange.notifications.preferences')}
          </Button>
        </div>
      </div>

      <p className={styles.liveRegion} aria-live='polite'>{center.announcement}</p>
      {connectionLabel ? (
        <div className={styles.connection} role='status'>
          <Icon name={center.connectionStatus === 'offline' ? 'wifi-off' : 'refresh-cw'} size={18} />
          <span>{connectionLabel}</span>
          <Button variant='quiet' size='sm' onClick={() => void center.refresh()}>{t('exchange.notifications.retry')}</Button>
        </div>
      ) : null}
      {center.error ? <div className={styles.error} role='alert'>{center.error}</div> : null}

      <div className={styles.filterScroller} role='tablist' aria-label={t('exchange.notifications.filter')}>
        {filters.map((item) => (
          <button
            className={center.filter === item.value ? styles.filterActive : styles.filter}
            key={item.value}
            type='button'
            role='tab'
            aria-selected={center.filter === item.value}
            onClick={() => center.setFilter(item.value)}
          >
            {t(item.label)}{item.value === 'UNREAD' ? ` (${formatNumber(center.unreadCount)})` : ''}
          </button>
        ))}
      </div>

      <section className={styles.content} aria-label={t('exchange.notifications.list')}>
        {center.loading ? <NotificationSkeleton /> : <NotificationFeed items={center.visibleItems} onMarkRead={center.markRead} />}
      </section>

      <NotificationPreferencesDialog open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
    </div>
  );
}

function NotificationSkeleton() {
  const { t } = useUiLocale();
  return (
    <div className={styles.skeleton} aria-busy='true' aria-label={t('exchange.notifications.loading')}>
      {[1, 2, 3, 4].map((item) => <span key={item} />)}
    </div>
  );
}
