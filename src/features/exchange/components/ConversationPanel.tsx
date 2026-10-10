import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../../../components/ui/Surface';
import { Button } from '../../../components/ui/Button';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import { useMessageThread } from '../hooks/use-message-thread';
import { useMessageComposer } from '../hooks/use-message-composer';
import { useMessageStream } from '../hooks/use-message-stream';
import { useVisibleMessageRead } from '../hooks/use-visible-message-read';
import type { MessagingApiContract } from '../messaging.types';
import { MessageComposer } from './MessageComposer';
import { MessageTimeline } from './MessageTimeline';
import styles from './ConversationPanel.module.css';

type StreamOptions = Parameters<typeof useMessageStream>[0];
export interface ConversationPanelProps {
  api: MessagingApiContract; id: string; actor: string;
  streamAuth: StreamOptions['auth']; streamClient?: StreamOptions['client'];
  onConversationChange?: () => Promise<void>;
}
export function ConversationPanel({ api, id, actor, streamAuth, streamClient, onConversationChange }: ConversationPanelProps) {
  const { t } = useUiLocale();
  const thread = useMessageThread(api, id, actor);
  const [atLatest, setAtLatest] = useState(true);
  useEffect(() => { if (thread.summary || thread.unavailable) void onConversationChange?.(); },
    [thread.summary?.changeVersion, thread.unavailable, onConversationChange]);
  const enabled = !!thread.summary && !thread.error && !thread.unavailable;
  const composer = useMessageComposer(api, id, actor, enabled, thread.acceptSent);
  const stream = useMessageStream({ auth: streamAuth, client: streamClient, conversationId: id, actor,
    enabled: !thread.unavailable, onReconcile: thread.reconcile });
  useVisibleMessageRead({ api, conversationId: id, actor, sequence: thread.readThroughSequence,
    lastRead: thread.summary?.lastReadSequence ?? '0', atLatest, enabled, onFailure: thread.reconcile });
  const submit = async () => { await composer.send(); await thread.reconcile(); };
  return <section className={styles.panel} aria-label={t('exchange.messaging.title')}>
    {thread.loading && <p className={styles.feedback} role='status'>{t('exchange.messaging.loading')}</p>}
    {thread.error && <div className={styles.feedback} role='alert'>
      <p>{t(thread.unavailable ? 'exchange.messaging.unavailable' : 'exchange.messaging.error')}</p>
      <Button variant='secondary' onClick={() => void thread.reconcile()}>{t('exchange.connections.retry')}</Button>
    </div>}
    {thread.summary && <>
      <header className={styles.header}>
        <div className={styles.identity}><span aria-hidden='true'><Avatar name={thread.summary.partner.displayName}/></span><strong>{thread.summary.partner.displayName}</strong></div>
        <Link className={styles.link} to={'/exchange/profile/' + encodeURIComponent(thread.summary.partner.userId)}>{t('exchange.messaging.profile')}</Link>
      </header>
      {stream !== 'connected' && <p className={styles.status} role='status'>{t(stream === 'connecting' ? 'exchange.messaging.connecting' : stream === 'unavailable' ? 'exchange.messaging.unavailable' : 'exchange.messaging.reconnecting')}</p>}
      <MessageTimeline messages={thread.messages} actor={actor} partner={thread.summary.partner.displayName}
        hasOlder={thread.hasOlder} loading={thread.loading} onLoadOlder={thread.loadOlder} onAtLatestChange={setAtLatest}/>
      <MessageComposer composer={composer} enabled={enabled} onSubmit={submit}/>
    </>}
  </section>;
}
