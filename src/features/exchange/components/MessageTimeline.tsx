import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { DirectMessage } from '../messaging.types';
import styles from './MessageTimeline.module.css';

interface Props {
  messages: DirectMessage[]; actor: string; partner: string; loading: boolean; hasOlder: boolean;
  onLoadOlder: () => Promise<void>; onAtLatestChange: (value: boolean) => void;
}
export function MessageTimeline({ messages, actor, partner, loading, hasOlder, onLoadOlder, onAtLatestChange }: Props) {
  const { t, formatDate } = useUiLocale();
  const viewport = useRef<HTMLDivElement>(null);
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const latest = useRef(true);
  const [atLatest, setAtLatest] = useState(true);
  const report = () => {
    const node = viewport.current;
    if (!node) return;
    const value = node.scrollHeight - node.scrollTop - node.clientHeight <= 32;
    latest.current = value; setAtLatest(value); onAtLatestChange(value);
  };
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const first = messages[0]?.id, last = messages[messages.length - 1]?.id;
    if (latest.current || previous.current.last === undefined) node.scrollTop = node.scrollHeight;
    else if (last === previous.current.last && first !== previous.current.first)
      node.scrollTop += node.scrollHeight - previous.current.height;
    previous.current = { first, last, height: node.scrollHeight };
    report();
  }, [messages]);
  return <>
    <div ref={viewport} className={styles.viewport} onScroll={report} role='log' aria-label={t('exchange.messaging.thread', { partner })}
      aria-live='polite' aria-relevant='additions' tabIndex={0}>
      {hasOlder && <div className={styles.older}><Button variant='quiet' loading={loading} onClick={() => void onLoadOlder()}>{t('exchange.messaging.older')}</Button></div>}
      {messages.length === 0 && !loading && <p className={styles.empty}>{t('exchange.messaging.empty')}</p>}
      <ol className={styles.messages}>
        {messages.map(message => <li key={message.id} className={`${styles.message} ${message.senderUserId === actor ? styles.own : ''}`}>
          <span className={styles.speaker}>{message.senderUserId === actor ? t('exchange.messaging.you') : partner}</span>
          <p>{message.text}</p>
          <time dateTime={message.createdAt}>{formatDate(message.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</time>
        </li>)}
      </ol>
    </div>
    {!atLatest && <Button variant='quiet' onClick={() => { if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; report(); }}>{t('exchange.messaging.latest')}</Button>}
  </>;
}
