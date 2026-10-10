import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { MessageStreamClient, MessageStreamError, type MessageStreamOptions } from '../message-stream.client';
import { parseMessageSequence } from '../messaging-state';

export type MessageStreamStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'unavailable';
interface StreamAuth { getAccessToken: () => string | null; refresh: () => Promise<{ id: string }> }
interface Options {
  auth: StreamAuth;
  client?: Pick<MessageStreamClient, 'connect'>;
  conversationId: string;
  actor?: string;
  enabled: boolean;
  onReconcile: () => void | Promise<void>;
}

// SSE carries hints only; authoritative REST reconciliation stays active even
// while headers/heartbeats are healthy. No cross-tab content or stored token.
export function useMessageStream({ auth, client: suppliedClient, conversationId, actor, enabled, onReconcile }: Options): MessageStreamStatus {
  const nativeClient = useMemo(() => new MessageStreamClient(), []);
  const client = suppliedClient ?? nativeClient;
  const ownership = useMemo(() => ({ auth, client, conversationId, actor, enabled }), [auth, client, conversationId, actor, enabled]);
  const currentOwner = useRef(ownership); currentOwner.current = ownership;
  const reconcileRef = useRef(onReconcile); reconcileRef.current = onReconcile;
  const [status, setStatus] = useState<{ owner: typeof ownership; value: MessageStreamStatus }>({ owner: ownership, value: 'offline' });

  useEffect(() => {
    if (!enabled || !actor || !conversationId) return;
    const abort = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setInterval> | undefined;
    let retryDelay = 1000, lastEventId: string | undefined;
    let polling = false, pollPending = false, terminal = false, refreshed = false;
    const active = () => !abort.signal.aborted && currentOwner.current === ownership;
    const publish = (value: MessageStreamStatus) => { if (active()) setStatus({ owner: ownership, value }); };
    const requestReconcile = () => {
      if (!active()) return;
      pollPending = true;
      if (polling) return;
      polling = true;
      void Promise.resolve().then(async () => {
        do {
          pollPending = false;
          if (active()) await reconcileRef.current();
        } while (pollPending && active());
      }).catch(() => { pollPending = false; }).finally(() => { polling = false; });
    };
    const stopUnavailable = () => {
      terminal = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
      publish('unavailable');
      // One current protected REST check clears any now-inaccessible thread.
      requestReconcile();
    };
    const connect = async (): Promise<void> => {
      if (!active() || terminal) return;
      let openedAt: number | undefined;
      publish(lastEventId === undefined ? 'connecting' : 'reconnecting');
      try {
        const accessToken = auth.getAccessToken();
        if (!accessToken) throw new MessageStreamError(401);
        const options: MessageStreamOptions = { conversationId, accessToken, signal: abort.signal,
          ...(lastEventId === undefined ? {} : { lastEventId }),
          onConnected: () => {
            if (!active() || terminal) return;
            openedAt = Date.now(); refreshed = false; publish('connected'); requestReconcile();
          },
          onHint: version => {
            if (!active() || terminal) return;
            try {
              const sequence = parseMessageSequence(version);
              if (lastEventId !== undefined && sequence < parseMessageSequence(lastEventId)) return;
              lastEventId = version; requestReconcile();
            } catch { /* Invalid hints cannot advance a route-scoped cursor. */ }
          },
        };
        await client.connect(options);
        if (active()) throw new Error('Message stream closed');
      } catch (error) {
        if (!active() || terminal) return;
        const code = error instanceof ApiClientError ? error.status : undefined;
        if (code === 401) {
          if (refreshed) { stopUnavailable(); return; }
          refreshed = true;
          try {
            const user = await auth.refresh();
            if (!active()) return;
            if (user.id !== actor) { stopUnavailable(); return; }
          } catch { if (active()) stopUnavailable(); return; }
          await connect(); return;
        }
        if (code === 403 || code === 404) { stopUnavailable(); return; }
        publish('offline'); requestReconcile();
        // Invalid Last-Event-ID/route input needs a REST/page retry, not a loop.
        if (code === 400) return;
        if (openedAt !== undefined && Date.now() - openedAt >= 30_000) retryDelay = 1000;
        const serverDelay = error instanceof MessageStreamError ? (error.retryAfter ?? 0) * 1000 : 0;
        reconnectTimer = setTimeout(() => { void connect(); }, Math.max(retryDelay, serverDelay));
        retryDelay = Math.min(retryDelay * 2, 15_000);
      }
    };
    fallbackTimer = setInterval(() => { if (!terminal) requestReconcile(); }, 30_000);
    void connect();
    return () => {
      abort.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [auth, client, conversationId, actor, enabled, ownership]);

  return enabled && actor && status.owner === ownership ? status.value : 'offline';
}
