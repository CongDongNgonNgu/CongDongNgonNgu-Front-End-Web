import { useCallback, useEffect, useRef, useState } from 'react';
import { parseMessageSequence } from '../messaging-state';
import type { DirectConversationSummary, MessagingApiContract } from '../messaging.types';

type ListApi = Pick<MessagingApiContract, 'list'>;
interface ListState { items: DirectConversationSummary[]; cursor: string | null; loading: boolean; error: boolean }
const empty = (): ListState => ({ items: [], cursor: null, loading: false, error: false });
interface Scope { api: ListApi; actor: string; load: (more: boolean) => Promise<void> }

export function useConversations(api: ListApi, actor?: string) {
  const current = useRef<Scope | null>(null);
  const [owned, setOwned] = useState<{ scope: Scope | null; state: ListState }>({ scope: null, state: empty() });
  useEffect(() => {
    if (!actor) { current.current = null; setOwned({ scope: null, state: empty() }); return; }
    const abort = new AbortController();
    let state = empty(), busy = false, refreshPending = false;
    const active = () => !abort.signal.aborted && current.current === scope;
    const publish = (patch: Partial<ListState>) => {
      if (!active()) return;
      state = { ...state, ...patch }; setOwned({ scope, state });
    };
    const scope: Scope = { api, actor, load: async more => {
      if (!active()) return;
      if (busy) { if (!more) refreshPending = true; return; }
      if (more && !state.cursor) return;
      busy = true; publish({ loading: true, error: false });
      try {
        const page = await api.list({ limit: 20, ...(more ? { cursor: state.cursor! } : {}) }, abort.signal);
        if (!active() || refreshPending) return;
        for (const item of page.items) parseMessageSequence(item.unreadCount);
        const items = [...new Map([...(more ? state.items : []), ...page.items].map(item => [item.id, item])).values()];
        publish({ items, cursor: page.nextCursor });
      } catch { publish({ items: [], cursor: null, error: true }); }
      finally {
        busy = false;
        if (active() && refreshPending) { refreshPending = false; void scope.load(false); }
        else publish({ loading: false });
      }
    } };
    current.current = scope; setOwned({ scope, state }); void scope.load(false);
    const refresh = () => { void scope.load(false); };
    const timer = setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      abort.abort(); clearInterval(timer); window.removeEventListener('focus', refresh);
      if (current.current === scope) current.current = null;
    };
  }, [api, actor]);
  const load = useCallback((more: boolean) => {
    const scope = current.current;
    return scope === owned.scope && scope?.api === api && scope.actor === actor ? scope.load(more) : Promise.resolve();
  }, [api, actor, owned.scope]);
  const ownsData = !!actor && owned.scope?.api === api && owned.scope.actor === actor;
  return { ...(ownsData ? owned.state : empty()),
    refresh: useCallback(() => load(false), [load]), loadMore: useCallback(() => load(true), [load]),
  };
}
