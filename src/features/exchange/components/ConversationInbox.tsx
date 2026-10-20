import { Link } from 'react-router-dom';
import { Avatar } from '../../../components/ui/Surface';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { parseMessageSequence } from '../messaging-state';
import type { useConversations } from '../hooks/use-conversations';
import styles from './ConversationInbox.module.css';

export function ConversationInbox({ list, selected }: { list: ReturnType<typeof useConversations>; selected?: string }) {
  const { t, formatDate } = useUiLocale();
  return <aside className={styles.sidebar} aria-label={t('exchange.messaging.list')}>
    <h2><Icon name='inbox'/>{t('exchange.messaging.list')}</h2>
    {list.loading && <p className={styles.feedback} role='status'>{t('exchange.messaging.loading')}</p>}
    {list.error && <div className={styles.feedback} role='alert'><p>{t('exchange.messaging.listError')}</p>
      <Button variant='secondary' onClick={() => void list.refresh()}>{t('exchange.connections.retry')}</Button></div>}
    {!list.loading && !list.error && list.items.length === 0 && <div className={styles.feedback}>
      <p>{t(list.cursor ? 'exchange.messaging.scanMore' : 'exchange.messaging.listEmpty')}</p>
      {!list.cursor && <Link className={styles.link} to='/exchange/connections'>{t('exchange.messaging.connections')}</Link>}
    </div>}
    <ul className={styles.list} aria-busy={list.loading}>
      {list.items.map(item => <li key={item.id}>
        <Link className={styles.row} aria-current={selected === item.id ? 'page' : undefined} to={'/exchange/conversations/' + encodeURIComponent(item.id)}>
          <span aria-hidden='true'><Avatar name={item.partner.displayName}/></span>
          <span className={styles.identity}><strong>{item.partner.displayName}</strong>
            <time dateTime={item.updatedAt}>{t('exchange.messaging.updated', { date: formatDate(item.updatedAt, { dateStyle: 'short', timeStyle: 'short' }) })}</time>
          </span>
          {item.unreadCount !== '0' && <span className={styles.unread} aria-label={t('exchange.messaging.unread', { count: item.unreadCount })}>{parseMessageSequence(item.unreadCount) > 99n ? '99+' : item.unreadCount}</span>}
        </Link>
      </li>)}
    </ul>
    {list.cursor && <div className={styles.feedback}><Button variant='secondary' loading={list.loading} onClick={() => void list.loadMore()}>{t('exchange.connections.more')}</Button></div>}
  </aside>;
}
