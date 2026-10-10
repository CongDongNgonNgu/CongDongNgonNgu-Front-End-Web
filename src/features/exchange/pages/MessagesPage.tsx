import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Surface';
import { useAuth } from '../../auth/AuthProvider';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useConversations } from '../hooks/use-conversations';
import { MessagingApi } from '../messaging-api';
import { parseMessageSequence } from '../messaging-state';
import type { MessagingApiContract, MessageContextApi } from '../messaging.types';
import { ConversationPanel, type ConversationPanelProps } from '../components/ConversationPanel';
import styles from './MessagesPage.module.css';

interface Props {
  api: MessagingApiContract & Partial<MessageContextApi>; actor?: string; authLoading?: boolean; conversationId?: string;
  streamAuth: ConversationPanelProps['streamAuth']; streamClient?: ConversationPanelProps['streamClient'];
}
export function MessagesPage() {
  const auth = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const api = useMemo(() => new MessagingApi(auth.api), [auth.api]);
  const streamAuth = useMemo(() => ({ getAccessToken: () => auth.api.getAccessToken(), refresh: auth.refresh }), [auth.api, auth.refresh]);
  return <MessagesPageView api={api} actor={auth.status === 'authenticated' ? auth.user?.id : undefined}
    authLoading={auth.status === 'loading'} conversationId={conversationId} streamAuth={streamAuth}/>;
}

export function MessagesPageView({ api, actor, authLoading = false, conversationId, streamAuth, streamClient }: Props) {
  const { t } = useUiLocale();
  const list = useConversations(api, actor);
  return <section className={styles.page} aria-labelledby='messages-title'>
    <header className={styles.header}>
      <div><h1 id='messages-title'>{t('exchange.messaging.title')}</h1><p>{t('exchange.messaging.intro')}</p></div>
      <Link className={styles.link} to='/exchange/connections'>{t('exchange.messaging.connections')}</Link>
    </header>
    {authLoading ? <p role='status'>{t('exchange.sessionLoading')}</p> : !actor ?
      <div><p>{t('exchange.messaging.login')}</p><Link className={styles.link} to='/login?returnTo=%2Fexchange%2Fconversations'>{t('exchange.login')}</Link></div> : <>
      {conversationId && <Link className={`${styles.link} ${styles.back}`} to='/exchange/conversations'>← {t('exchange.messaging.list')}</Link>}
      <div className={`${styles.layout} ${conversationId ? styles.selected : ''}`}>
        <aside className={styles.sidebar} aria-label={t('exchange.messaging.list')}>
          <h2>{t('exchange.messaging.list')}</h2>
          {list.loading && <p className={styles.feedback} role='status'>{t('exchange.messaging.loading')}</p>}
          {list.error && <div className={styles.feedback} role='alert'><p>{t('exchange.messaging.listError')}</p>
            <Button variant='secondary' onClick={() => void list.refresh()}>{t('exchange.connections.retry')}</Button></div>}
          {!list.loading && !list.error && list.items.length === 0 && <p className={styles.feedback}>{t(list.cursor ? 'exchange.messaging.scanMore' : 'exchange.messaging.listEmpty')}</p>}
          <ul className={styles.list} aria-busy={list.loading}>
            {list.items.map(item => <li key={item.id}>
              <Link className={styles.row} aria-current={conversationId === item.id ? 'page' : undefined} to={'/exchange/conversations/' + encodeURIComponent(item.id)}>
                <span aria-hidden='true'><Avatar name={item.partner.displayName}/></span>
                <strong>{item.partner.displayName}</strong>
                {item.unreadCount !== '0' && <span className={styles.unread} aria-label={t('exchange.messaging.unread', { count: item.unreadCount })}>{parseMessageSequence(item.unreadCount) > 99n ? '99+' : item.unreadCount}</span>}
              </Link>
            </li>)}
          </ul>
          {list.cursor && <div className={styles.feedback}><Button variant='secondary' loading={list.loading} onClick={() => void list.loadMore()}>{t('exchange.connections.more')}</Button></div>}
        </aside>
        {conversationId ? <ConversationPanel key={actor + ':' + conversationId} api={api} id={conversationId} actor={actor} streamAuth={streamAuth} streamClient={streamClient} onConversationChange={list.refresh}/>
          : <div className={styles.prompt}><p>{t('exchange.messaging.select')}</p></div>}
      </div>
    </>}
  </section>;
}
