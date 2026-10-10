import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { normalizeShareNote, type ShareReference } from '../context-share';
import type { ConnectionListApi, ConnectionListItem } from '../exchange.types';
import { mergeMessages } from '../messaging-state';
import { messageContextPath } from '../message-context-path';
import type { MessagingApiContract, SendMessageInput } from '../messaging.types';

export type ContextShareApi = Pick<ConnectionListApi, 'listConnections'> & Pick<MessagingApiContract, 'open' | 'send'>;
type ShareError = 'invalid' | 'failed' | 'rate-limited' | 'unavailable' | null;
interface State {
  partners: ConnectionListItem[]; cursor: string | null; loading: boolean; listError: boolean;
  selected: string; note: string; sending: boolean; error: ShareError; conversationId: string | null;
}
const empty = (): State => ({ partners: [], cursor: null, loading: false, listError: false,
  selected: '', note: '', sending: false, error: null, conversationId: null });

export function useContextShare(api: ContextShareApi, actor: string | undefined, reference: ShareReference) {
  const referenceId = reference.id.toLowerCase();
  const scope = useMemo(() => ({ api, actor, type: reference.type, id: referenceId }), [api, actor, reference.type, referenceId]);
  type Owner = { scope: typeof scope; select: (id: string) => void; setNote: (note: string) => void;
    load: (cursor?: string) => Promise<void>; submit: () => Promise<void> };
  const current = useRef<Owner | null>(null);
  const [owned, setOwned] = useState<{ owner: Owner; state: State } | null>(null);
  useLayoutEffect(() => {
    const abort = new AbortController();let state = empty(), loadGeneration = 0;
    let attempt: { partner: string; input: SendMessageInput } | null = null;
    const active = () => !!actor && !abort.signal.aborted && current.current === owner;
    const publish = (patch: Partial<State>) => {
      if (!active()) return;
      state = { ...state, ...patch };setOwned({ owner, state });
    };
    const owner: Owner = { scope,
      select: id => { if (active() && !state.sending && !state.conversationId) publish({ selected: state.partners.some(p => p.targetUserId === id) ? id : '', error: null }); },
      setNote: note => { if (active() && !state.sending && !state.conversationId) publish({ note, error: null }); },
      load: async cursor => {
        if (!active() || state.loading || state.sending || state.conversationId) return;
        const generation = ++loadGeneration;
        publish({ loading: true, listError: false, ...(cursor === undefined ? { partners: [], selected: '', cursor: null } : {}) });
        try {
          const page = await api.listConnections({ kind: 'CONNECTED', limit: 20, ...(cursor === undefined ? {} : { cursor }) });
          if (!active() || generation !== loadGeneration) return;
          const partners = [...new Map([...(cursor === undefined ? [] : state.partners), ...page.items]
            .filter(p => p.state === 'CONNECTED' && p.targetUserId !== actor).map(p => [p.targetUserId, p])).values()];
          publish({ partners, cursor: page.nextCursor });
        } catch {
          if (generation === loadGeneration) publish({ partners: [], selected: '', cursor: null, listError: true });
        } finally { if (generation === loadGeneration) publish({ loading: false }); }
      },
      submit: async () => {
        if (!active() || state.sending || state.loading || state.conversationId) return;
        const partner = state.selected;
        if (!state.partners.some(p => p.targetUserId === partner)) { publish({ error: 'invalid' });return; }
        let text: string;
        try { text = normalizeShareNote({ type: scope.type, id: scope.id }, state.note); }
        catch { publish({ error: 'invalid' });return; }
        if (!attempt || attempt.partner !== partner || attempt.input.text !== text)
          attempt = { partner, input: { clientMessageId: crypto.randomUUID(), text, contextType: scope.type, contextId: scope.id } };
        const submitted = attempt.input;
        publish({ sending: true, error: null });
        try {
          const conversation = await api.open(partner, abort.signal);
          if (!active()) return;
          if (conversation.partner.userId !== partner || !conversation.id) throw new Error('Conflicting conversation');
          const message = await api.send(conversation.id, submitted, abort.signal);
          if (!active()) return;
          if (message.senderUserId !== actor || message.clientMessageId !== submitted.clientMessageId || message.text !== text
            || !message.context || !['AVAILABLE', 'UNAVAILABLE'].includes(message.context.availability)
            || (message.context.availability === 'AVAILABLE'
              && (message.context.type !== scope.type || message.context.id !== scope.id || !messageContextPath(message.context))))
            throw new Error('Conflicting share acknowledgement');
          mergeMessages(conversation.id, [], [message]);
          attempt = null;publish({ conversationId: conversation.id, note: '' });
        } catch (error) {
          const status = error instanceof ApiClientError ? error.status : undefined;
          const unavailable = status !== undefined && [401, 403, 404].includes(status);
          publish({ error: status === 429 ? 'rate-limited' : unavailable ? 'unavailable' : 'failed',
            ...(unavailable ? { partners: [], selected: '', cursor: null } : {}) });
        } finally { publish({ sending: false }); }
      },
    };
    current.current = owner;setOwned({ owner, state });void owner.load();
    return () => { abort.abort();if (current.current === owner) current.current = null; };
  }, [scope, api, actor]);
  const owner = owned?.owner.scope === scope ? owned.owner : null;
  const valid = () => owner && owner === current.current ? owner : null;
  return { ...(owner && actor ? owned!.state : empty()),
    select: (id: string) => valid()?.select(id), setNote: (note: string) => valid()?.setNote(note),
    retry: () => valid()?.load() ?? Promise.resolve(),
    loadMore: () => owned?.state.cursor ? valid()?.load(owned.state.cursor) ?? Promise.resolve() : Promise.resolve(),
    submit: () => valid()?.submit() ?? Promise.resolve(),
  };
}
