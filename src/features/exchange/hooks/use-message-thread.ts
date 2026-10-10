import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { mergeMessages, parseMessageSequence } from '../messaging-state';
import type { DirectConversationSummary, DirectMessage, MessagingApiContract, MessageHistoryPage } from '../messaging.types';

interface ThreadState {
  summary: DirectConversationSummary | null;
  messages: DirectMessage[];
  loading: boolean;
  error: boolean;
  unavailable: boolean;
  hasOlder: boolean;
}
const empty = (): ThreadState => ({ summary: null, messages: [], loading: false, error: false, unavailable: false, hasOlder: false });
interface Scope {
  api: MessagingApiContract;
  id: string;
  actor: string;
  reconcile: () => Promise<void>;
  loadOlder: () => Promise<void>;
  acceptSent: (message: DirectMessage) => void;
}

// Owns protected history only. Stream transport, sending and visible read markers
// are separate responsibilities. No private data is persisted in browser storage.
export function useMessageThread(api: MessagingApiContract, id: string, actor?: string) {
  const scopeRef = useRef<Scope | null>(null);
  const [owned, setOwned] = useState<{ scope: Scope | null; state: ThreadState }>({ scope: null, state: empty() });

  useEffect(() => {
    if (!actor || !id) { scopeRef.current = null; setOwned({ scope: null, state: empty() }); return; }
    const abort = new AbortController();
    let state = empty(), after: string | null = null, before: string | null = null;
    let pending = false, working: Promise<void> | null = null;
    const active = () => !abort.signal.aborted && scopeRef.current === scope;
    const publish = (patch: Partial<ThreadState>) => {
      if (!active()) return;
      state = { ...state, ...patch }; setOwned({ scope, state });
    };
    const fail = (error: unknown) => {
      after = null; before = null;
      publish({ ...empty(), error: true, unavailable: error instanceof ApiClientError && [401, 403, 404].includes(error.status) });
    };
    const validatePage = (page: MessageHistoryPage) => {
      if (!page.beforeCursor || !page.afterCursor || (page.nextCursor !== null && !page.nextCursor))
        throw new Error('Invalid history cursor');
      return mergeMessages(id, state.messages, page.items);
    };
    const synchronize = async () => {
      const summary = await api.get(id, abort.signal);
      if (!active()) return;
      if (summary.id !== id) throw new Error('Foreign conversation summary');
      for (const value of [summary.headSequence, summary.changeVersion, summary.lastReadSequence, summary.unreadCount])
        parseMessageSequence(value);
      // One bounded page per iteration, exclusive forward cursors. A send result
      // never advances this cursor; missing messages still arrive through REST.
      const seen = new Set<string>();
      do {
        const boundary = after;
        const page = await api.history(id, boundary === null ? { limit: 30 } : { after: boundary, limit: 50 }, abort.signal);
        if (!active()) return;
        const messages = validatePage(page);
        if (page.nextCursor && boundary !== null && (page.nextCursor === boundary || seen.has(page.nextCursor)))
          throw new Error('History cursor did not advance');
        if (boundary === null) before = page.nextCursor;
        after = page.afterCursor;
        publish({ summary, messages, error: false, unavailable: false, hasOlder: before !== null });
        // Initial/latest history is backwards-paged; its nextCursor belongs to
        // loadOlder, not forward catch-up.
        if (boundary === null || page.nextCursor === null) break;
        seen.add(page.nextCursor);
        after = page.nextCursor;
      } while (active());
    };
    const reconcile = (): Promise<void> => {
      if (!active()) return Promise.resolve();
      pending = true;
      if (working) return working;
      publish({ loading: true });
      working = Promise.resolve().then(async () => {
        try {
          do { pending = false; await synchronize(); } while (pending && active());
        } catch (error) { pending = false; fail(error); }
        finally { working = null; publish({ loading: false }); }
      });
      return working;
    };
    const loadOlder = (): Promise<void> => {
      if (!active() || working || !before || state.unavailable) return Promise.resolve();
      const boundary = before;
      publish({ loading: true });
      working = Promise.resolve().then(async () => {
        try {
          const page = await api.history(id, { before: boundary, limit: 30 }, abort.signal);
          if (!active()) return;
          const messages = validatePage(page);
          if (page.nextCursor === boundary) throw new Error('History cursor did not advance');
          before = page.nextCursor;
          publish({ messages, error: false, hasOlder: before !== null });
          // A hint received during this older-page request still reconciles.
          while (pending && active()) { pending = false; await synchronize(); }
        } catch (error) { pending = false; fail(error); }
        finally { working = null; publish({ loading: false }); }
      });
      return working;
    };
    const scope: Scope = { api, id, actor, reconcile, loadOlder, acceptSent: message => {
      if (!active() || state.unavailable || !state.summary) return;
      try { publish({ messages: mergeMessages(id, state.messages, [message]) }); }
      catch (error) { fail(error); }
    } };
    scopeRef.current = scope;
    setOwned({ scope, state });
    void reconcile();
    return () => { abort.abort(); if (scopeRef.current === scope) scopeRef.current = null; };
  }, [api, id, actor]);

  const currentScope = useCallback(() => {
    const scope = scopeRef.current;
    return scope === owned.scope && scope?.api === api && scope.id === id && scope.actor === actor ? scope : null;
  }, [api, id, actor, owned.scope]);
  // Mask during render, before effects can clear a previous actor/route's state.
  const ownsData = !!actor && owned.scope?.api === api && owned.scope.id === id && owned.scope.actor === actor;
  return { ...(ownsData ? owned.state : empty()),
    reconcile: useCallback(() => currentScope()?.reconcile() ?? Promise.resolve(), [currentScope]),
    loadOlder: useCallback(() => currentScope()?.loadOlder() ?? Promise.resolve(), [currentScope]),
    acceptSent: useCallback((message: DirectMessage) => currentScope()?.acceptSent(message), [currentScope]),
  };
}
