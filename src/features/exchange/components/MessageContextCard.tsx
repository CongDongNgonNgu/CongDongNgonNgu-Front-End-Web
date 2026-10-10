import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { resourceTypeLabelKey } from '../../library/library.presentation';
import { useUiLocale } from '../../ui-locale/UiLocaleProvider';
import type { MessageContextCard as Card } from '../messaging.types';
import type { MessageContextRefresh } from '../message-context-refresh';
import { messageContextPath } from '../message-context-path';
import styles from './MessageContextCard.module.css';

export function MessageContextCard({ queue, messageId }: { queue: MessageContextRefresh | null; messageId: string }) {
  const { t } = useUiLocale();const navigate = useNavigate();
  const node = useRef<HTMLDivElement>(null);
  const scope = useMemo(() => ({ queue, messageId }), [queue, messageId]);
  const owner = useRef(scope);owner.current = scope;
  const [owned, setOwned] = useState<{ queue: MessageContextRefresh; id: string; card: Card | undefined } | null>(null);
  const [opening, setOpening] = useState(false);
  const focusWithin = useRef(false);
  useLayoutEffect(() => {
    if (!queue) return;
    let alive = true;setOpening(false);
    const unsubscribe = queue.watch(messageId, card => { if (alive) setOwned({ queue, id: messageId, card }); });
    const element = node.current;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      if (alive) queue.visible(messageId, entries.some(entry => entry.isIntersecting));
    }, { root: element?.closest('[role="log"]') ?? null });
    if (observer && element) observer.observe(element);else queue.visible(messageId, true);
    return () => { alive = false;observer?.disconnect();unsubscribe(); };
  }, [queue, messageId]);
  const card = owned?.queue === queue && owned.id === messageId ? owned.card : undefined;
  const available = card?.availability === 'AVAILABLE' && messageContextPath(card) !== null;
  useLayoutEffect(() => {
    if (!available && focusWithin.current && document.activeElement === document.body) node.current?.focus();
  }, [available]);
  const open = async () => {
    if (!queue || opening) return;
    const lifetime = owner.current;setOpening(true);
    const fresh = await queue.recheck(messageId);
    if (owner.current !== lifetime || !node.current?.isConnected) return;
    setOpening(false);const path = messageContextPath(fresh);
    if (path) navigate(path);else node.current.focus();
  };
  return <div ref={node} className={styles.card} tabIndex={-1} aria-busy={opening || undefined}
    onFocusCapture={() => { focusWithin.current = true; }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focusWithin.current = false; }}>
    {available ? <>
      <span className={styles.category}>{card.type === 'LIBRARY_RESOURCE' ? t(resourceTypeLabelKey(card.category))
        : t(card.category === 'QUESTION' ? 'exchange.messaging.contextQuestion' : 'exchange.messaging.contextDiscussion')} · {card.languageCode}</span>
      <p className={styles.preview}>{card.previewText}</p>
      <Button variant='secondary' onClick={() => void open()} loading={opening}>{t('exchange.messaging.contextOpen')}</Button>
    </> : <p className={styles.unavailable} role={opening ? 'status' : undefined}>
      {t(opening ? 'exchange.messaging.contextChecking' : 'exchange.messaging.contextUnavailable')}
    </p>}
  </div>;
}
