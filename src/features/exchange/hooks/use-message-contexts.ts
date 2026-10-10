import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MessageContextRefresh } from '../message-context-refresh';
import type { MessageContextApi } from '../messaging.types';

export function useMessageContexts(api: Partial<MessageContextApi>, room: string, actor: string, refreshing: boolean) {
  const scope = useMemo(() => ({ api, room, actor }), [api, room, actor]);
  const current = useRef<{ scope: typeof scope; queue: MessageContextRefresh } | null>(null);
  const [owned, setOwned] = useState<typeof current.current>(null);
  useLayoutEffect(() => {
    if (!api.context || !actor || !room) return;
    const queue = new MessageContextRefresh({ context: api.context.bind(api) }, room);
    const owner = { scope, queue };current.current = owner;setOwned(owner);
    const refresh = () => queue.invalidate();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      window.clearInterval(timer);window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);queue.dispose();
      if (current.current === owner) current.current = null;
    };
  }, [scope, api, room, actor]);
  useLayoutEffect(() => {
    if (refreshing && current.current?.scope === scope) current.current.queue.invalidate();
  }, [refreshing, scope]);
  return owned?.scope === scope ? owned.queue : null;
}
