import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { mergeMessages, normalizeDraft } from '../messaging-state';
import type { DirectMessage, MessagingApiContract, SendMessageInput } from '../messaging.types';

type ComposerError = 'invalid' | 'failed' | 'rate-limited' | 'unavailable' | null;
interface ComposerState { draft: string; sending: boolean; error: ComposerError }
const empty = (): ComposerState => ({ draft: '', sending: false, error: null });
type SendApi = Pick<MessagingApiContract, 'send'>;
interface ComposerScope {
  api: SendApi; id: string; actor: string;
  setDraft: (draft: string) => void;
  send: () => Promise<boolean>;
}

// Each ambiguous retry retains the exact normalized payload/client ID in memory.
// No optimistic persisted row is invented, and drafts never cross scope lifetimes.
export function useMessageComposer(api: SendApi, id: string, actor: string | undefined,
  enabled: boolean, onAccepted: (message: DirectMessage) => void) {
  const scopeRef = useRef<ComposerScope | null>(null);
  const callbacks = useRef({ enabled, onAccepted });
  callbacks.current = { enabled, onAccepted };
  const [owned, setOwned] = useState<{ scope: ComposerScope | null; state: ComposerState }>({ scope: null, state: empty() });

  useEffect(() => {
    if (!actor || !id) { scopeRef.current = null; setOwned({ scope: null, state: empty() }); return; }
    const abort = new AbortController();
    let state = empty();
    let attempt: SendMessageInput | null = null;
    const active = () => !abort.signal.aborted && scopeRef.current === scope;
    const publish = (patch: Partial<ComposerState>) => {
      if (!active()) return;
      state = { ...state, ...patch }; setOwned({ scope, state });
    };
    const scope: ComposerScope = { api, id, actor,
      setDraft: draft => { if (active()) publish({ draft, error: null }); },
      send: async () => {
        if (!active() || !callbacks.current.enabled || state.sending) return false;
        let text: string;
        try { text = normalizeDraft(state.draft); }
        catch { publish({ error: 'invalid' }); return false; }
        const submittedDraft = state.draft;
        if (!attempt || attempt.text !== text) attempt = { clientMessageId: crypto.randomUUID(), text };
        const submitted = attempt;
        publish({ sending: true, error: null });
        try {
          const message = await api.send(id, submitted, abort.signal);
          if (!active()) return false;
          // A successful transport response must still match this exact attempt.
          if (message.senderUserId !== actor || message.clientMessageId !== submitted.clientMessageId || message.text !== text)
            throw new Error('Conflicting send acknowledgement');
          mergeMessages(id, [], [message]);
          callbacks.current.onAccepted(message);
          attempt = null;
          publish({ draft: state.draft === submittedDraft ? '' : state.draft });
          return true;
        } catch (error) {
          if (!active()) return false;
          const status = error instanceof ApiClientError ? error.status : undefined;
          publish({ error: status === 429 ? 'rate-limited' : status && [401, 403, 404].includes(status) ? 'unavailable' : 'failed' });
          return false;
        } finally { publish({ sending: false }); }
      },
    };
    scopeRef.current = scope; setOwned({ scope, state });
    return () => { abort.abort(); if (scopeRef.current === scope) scopeRef.current = null; };
  }, [api, id, actor]);

  const currentScope = useCallback(() => {
    const scope = scopeRef.current;
    return scope === owned.scope && scope?.api === api && scope.id === id && scope.actor === actor ? scope : null;
  }, [api, id, actor, owned.scope]);
  const ownsData = !!actor && owned.scope?.api === api && owned.scope.id === id && owned.scope.actor === actor;
  return { ...(ownsData ? owned.state : empty()),
    setDraft: useCallback((draft: string) => currentScope()?.setDraft(draft), [currentScope]),
    send: useCallback(() => currentScope()?.send() ?? Promise.resolve(false), [currentScope]),
  };
}
