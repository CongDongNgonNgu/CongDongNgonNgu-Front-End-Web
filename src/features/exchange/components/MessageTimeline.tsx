import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { DirectMessage } from '../messaging.types';
import type { MessageContextRefresh } from '../message-context-refresh';
import { MessageContextCard } from './MessageContextCard';
import styles from './MessageTimeline.module.css';

interface Props {
  messages: DirectMessage[]; actor: string; partner: string; loading: boolean; hasOlder: boolean;
  onLoadOlder: () => Promise<void>; onAtLatestChange: (value: boolean) => void;
  contextQueue?: MessageContextRefresh | null;
}
export function MessageTimeline({ messages, actor, partner, loading, hasOlder, onLoadOlder, onAtLatestChange, contextQueue = null }: Props) {
  const { t, formatDate } = useUiLocale();
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLOListElement>(null);
  const anchor = useRef<{ element: HTMLElement; offset: number } | null>(null);
  const programmaticTop = useRef<number | null>(null);
  const latestCallback = useRef(onAtLatestChange);latestCallback.current = onAtLatestChange;
  const previous = useRef<{ first?: string; last?: string; height: number }>({ height: 0 });
  const latest = useRef(true);
  const [atLatest, setAtLatest] = useState(true);
  const report = (preserveAnchor = false) => {
    const node = viewport.current;
    if (!node) return;
    const value = node.scrollHeight - node.scrollTop - node.clientHeight <= 32;
    latest.current = value; setAtLatest(value); latestCallback.current(value);
    programmaticTop.current = preserveAnchor ? node.scrollTop : null;
    if (preserveAnchor && anchor.current?.element.isConnected && node.contains(anchor.current.element)) return;
    const top = node.getBoundingClientRect().top;
    const first = Array.from(node.querySelectorAll<HTMLElement>('[data-message-id]'))
      .find(element => element.getBoundingClientRect().bottom > top);
    anchor.current = first ? { element: first, offset: first.getBoundingClientRect().top - top } : null;
  };
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const first = messages[0]?.id, last = messages[messages.length - 1]?.id;
    if (latest.current || previous.current.last === undefined) node.scrollTop = node.scrollHeight;
    else if (last === previous.current.last && first !== previous.current.first) {
      const saved = anchor.current;
      if (saved?.element.isConnected && node.contains(saved.element))
        node.scrollTop += saved.element.getBoundingClientRect().top - node.getBoundingClientRect().top - saved.offset;
      else node.scrollTop += node.scrollHeight - previous.current.height;
    }
    previous.current = { first, last, height: node.scrollHeight };
    report(true);
  }, [messages]);
  useLayoutEffect(() => {
    const node = viewport.current;
    if (!node || !content.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (latest.current) node.scrollTop = node.scrollHeight;
      else if (anchor.current?.element.isConnected && node.contains(anchor.current.element)) {
        const offset = anchor.current.element.getBoundingClientRect().top - node.getBoundingClientRect().top;
        node.scrollTop += offset - anchor.current.offset;
      }
      previous.current.height = node.scrollHeight;report(true);
    });
    observer.observe(content.current);observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <>
    <div ref={viewport} className={styles.viewport} onScroll={() => report(programmaticTop.current === viewport.current?.scrollTop)} role='log' aria-label={t('exchange.messaging.thread', { partner })}
      aria-live='polite' aria-relevant='additions' tabIndex={0}>
      {hasOlder && <div className={styles.older}><Button variant='quiet' loading={loading} onClick={() => void onLoadOlder()}>{t('exchange.messaging.older')}</Button></div>}
      {messages.length === 0 && !loading && <p className={styles.empty}>{t('exchange.messaging.empty')}</p>}
      <ol ref={content} className={styles.messages}>
        {messages.map(message => <li key={message.id} data-message-id={message.id} className={`${styles.message} ${message.senderUserId === actor ? styles.own : ''}`}>
          <span className={styles.speaker}>{message.senderUserId === actor ? t('exchange.messaging.you') : partner}</span>
          {message.text && <p>{message.text}</p>}
          {message.context && <MessageContextCard queue={contextQueue} messageId={message.id}/>}
          <time dateTime={message.createdAt}>{formatDate(message.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</time>
        </li>)}
      </ol>
    </div>
    {!atLatest && <Button variant='quiet' onClick={() => { if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight; report(); }}>{t('exchange.messaging.latest')}</Button>}
  </>;
}
