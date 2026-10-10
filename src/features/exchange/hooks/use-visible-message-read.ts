import { useEffect, useMemo, useRef } from 'react';
import { parseMessageSequence } from '../messaging-state';
import type { MessagingApiContract } from '../messaging.types';

interface Options {
  api: Pick<MessagingApiContract, 'markRead'>;
  conversationId: string;
  actor?: string;
  sequence: string;
  lastRead: string;
  atLatest: boolean;
  enabled: boolean;
  onFailure: () => void | Promise<void>;
}

// The caller supplies only the history-confirmed position, and reports whether
// its scroll viewport shows the latest message. Sending alone cannot mark gaps read.
export function useVisibleMessageRead({ api, conversationId, actor, ...input }: Options): void {
  const ownership = useMemo(() => ({ api, conversationId, actor }), [api, conversationId, actor]);
  const currentOwner = useRef(ownership); currentOwner.current = ownership;
  const inputRef = useRef(input); inputRef.current = input;
  const checkRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!actor || !conversationId) return;
    const abort = new AbortController();
    let busy = false, confirmed = 0n;
    const active = () => !abort.signal.aborted && currentOwner.current === ownership;
    const visible = () => active() && inputRef.current.enabled && inputRef.current.atLatest
      && document.visibilityState === 'visible' && document.hasFocus();
    const check = () => {
      if (busy || !visible()) return;
      busy = true;
      void Promise.resolve().then(async () => {
        while (visible()) {
          const value = inputRef.current;
          const sequence = parseMessageSequence(value.sequence), persisted = parseMessageSequence(value.lastRead);
          if (persisted > confirmed) confirmed = persisted;
          if (sequence <= confirmed) break;
          await api.markRead(conversationId, sequence.toString(), abort.signal);
          if (!active()) return;
          confirmed = sequence;
        }
      }).catch(() => {
        if (active()) void Promise.resolve().then(() => {
          if (active()) return inputRef.current.onFailure();
        }).catch(() => undefined);
      }).finally(() => { busy = false; });
    };
    checkRef.current = check;
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    check();
    return () => {
      abort.abort();
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      if (checkRef.current === check) checkRef.current = null;
    };
  }, [api, conversationId, actor, ownership]);

  useEffect(() => { checkRef.current?.(); }, [input.sequence, input.lastRead, input.atLatest, input.enabled, ownership]);
}
