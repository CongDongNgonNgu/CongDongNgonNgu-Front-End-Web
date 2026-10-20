import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useConversations } from '../hooks/use-conversations';
import { MessagingApi } from '../messaging-api';
import { ConversationInbox } from '../components/ConversationInbox';
import type { MessagingApiContract, MessageContextApi } from '../messaging.types';
import { ConversationPanel, type ConversationPanelProps } from '../components/ConversationPanel';
import styles from './MessagesPage.module.css';

interface Props {
  api: MessagingApiContract & Partial<MessageContextApi>; actor?: string; actorName?: string; authLoading?: boolean; conversationId?: string;
  streamAuth: ConversationPanelProps['streamAuth']; streamClient?: ConversationPanelProps['streamClient'];
}
export function MessagesPage() {
  const auth = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const api = useMemo(() => new MessagingApi(auth.api), [auth.api]);
  const streamAuth = useMemo(() => ({ getAccessToken: () => auth.api.getAccessToken(), refresh: auth.refresh }), [auth.api, auth.refresh]);
  return <MessagesPageView api={api} actor={auth.status === 'authenticated' ? auth.user?.id : undefined}
    actorName={auth.status === 'authenticated' ? auth.user?.displayName : undefined} authLoading={auth.status === 'loading'} conversationId={conversationId} streamAuth={streamAuth}/>;
}

export function MessagesPageView({ api, actor, actorName, authLoading = false, conversationId, streamAuth, streamClient }: Props) {
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
        <ConversationInbox list={list} selected={conversationId}/>
        {conversationId ? <ConversationPanel key={actor + ':' + conversationId} api={api} id={conversationId} actor={actor} actorName={actorName} streamAuth={streamAuth} streamClient={streamClient} onConversationChange={list.refresh}/>
          : <div className={styles.prompt}><p>{t('exchange.messaging.select')}</p></div>}
      </div>
    </>}
  </section>;
}
