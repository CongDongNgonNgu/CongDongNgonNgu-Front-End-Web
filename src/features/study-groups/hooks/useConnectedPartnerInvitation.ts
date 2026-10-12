import { useEffect, useMemo, useRef, useState } from 'react';
import type { ConnectionListApi, ConnectionListItem } from '../../exchange/exchange.types';
import type { StudyGroupsApi } from '../study-groups.api';
import type { IssuedInvite } from '../study-groups.types';

export interface ConnectedInvitationScope {
  api: StudyGroupsApi;
  connectionsApi: Pick<ConnectionListApi, 'listConnections'>;
  groupId: string;
  userId: string;
  enabled: boolean;
}
interface PickerState {
  open: boolean;
  items: ConnectionListItem[];
  cursor: string | null;
  selected: string;
  loading: boolean;
  busy: boolean;
  error: unknown;
  invite: IssuedInvite | null;
}
const empty = (): PickerState => ({ open: false, items: [], cursor: null, selected: '', loading: false, busy: false, error: null, invite: null });

export function useConnectedPartnerInvitation({ api, connectionsApi, groupId, userId, enabled }: ConnectedInvitationScope) {
  // A fresh object distinguishes A/B/A transitions even when the IDs match again.
  const scope = useMemo(() => ({ sequence: 0, listBusy: false, issueBusy: false }), [api, connectionsApi, groupId, userId, enabled]);
  const current = useRef(scope);
  current.current = scope;
  const [stored, setStored] = useState({ scope, value: empty() });
  // Erase retained secrets during the same render that changes access/identity.
  if (stored.scope !== scope) setStored({ scope, value: empty() });
  const state = enabled && stored.scope === scope ? stored.value : empty();
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => () => { scope.sequence++; }, [scope]);
  const owns = (sequence: number) => enabled && current.current === scope && scope.sequence === sequence;
  function update(value: PickerState) { setStored({ scope, value }); stateRef.current = value; }
  function close() {
    scope.sequence++;
    scope.listBusy = false;
    scope.issueBusy = false;
    update(empty());
  }
  async function load(append = false) {
    if (!enabled || current.current !== scope || scope.listBusy || scope.issueBusy) return;
    const before = stateRef.current;
    if (append && !before.cursor) return;
    const sequence = scope.sequence;
    scope.listBusy = true;
    update({ ...before, open: true, loading: true, error: null });
    try {
      const page = await connectionsApi.listConnections({ kind: 'CONNECTED', limit: 20, ...(append ? { cursor: before.cursor! } : {}) });
      if (!owns(sequence)) return;
      const peers = new Set<string>();
      const ids = new Set<string>();
      const items = [...(append ? before.items : []), ...page.items.slice(0, 20)].filter(item => {
        if (item.state !== 'CONNECTED' || peers.has(item.targetUserId) || ids.has(item.connectionId)) return false;
        peers.add(item.targetUserId); ids.add(item.connectionId); return true;
      });
      update({ ...stateRef.current, items, cursor: page.nextCursor === before.cursor ? null : page.nextCursor, loading: false });
    } catch (error) {
      if (owns(sequence)) update({ ...empty(), open: true, error });
    } finally {
      if (owns(sequence)) scope.listBusy = false;
    }
  }
  function open() { close(); void load(); }
  function select(selected: string) {
    if (!scope.issueBusy && stateRef.current.items.some(item => item.targetUserId === selected)) update({ ...stateRef.current, selected });
  }
  async function issue() {
    const selected = stateRef.current.selected;
    if (!enabled || current.current !== scope || scope.issueBusy || scope.listBusy || !stateRef.current.items.some(item => item.targetUserId === selected)) return;
    const sequence = scope.sequence;
    scope.issueBusy = true;
    update({ ...stateRef.current, busy: true, error: null });
    try {
      const invite = await api.issueConnectedPartner(groupId, selected);
      if (owns(sequence)) update({ ...empty(), open: true, invite });
    } catch (error) {
      // Re-fetch current eligibility before allowing another issuance attempt.
      if (owns(sequence)) update({ ...empty(), open: true, error });
    } finally {
      if (owns(sequence)) scope.issueBusy = false;
    }
  }
  return { ...state, openPicker: open, close, load, select, issue };
}
