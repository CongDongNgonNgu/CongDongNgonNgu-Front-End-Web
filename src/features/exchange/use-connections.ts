import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionListApi, ConnectionListItem, ConnectionListKind } from './exchange.types';

export type ConnectionAction = 'accept' | 'decline' | 'cancel' | 'disconnect';
export function useConnections(api: ConnectionListApi, authenticated: boolean, actorKey?: string) {
  const [kind, setKind] = useState<ConnectionListKind>('CONNECTED');
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const generation = useRef(0);
  const actionLock = useRef(false);
  const [owner,setOwner]=useState({api,actorKey});

  const load = useCallback(async (nextCursor?: string) => {
    const current = ++generation.current;
    setLoading(true); setError(false);
    if (nextCursor === undefined) { setItems([]); setCursor(null); setOwner({api,actorKey}); }
    try {
      const page = await api.listConnections({kind,limit:20,...(nextCursor === undefined ? {} : {cursor:nextCursor})});
      if (current !== generation.current) return;
      setItems(previous => [...new Map([...(nextCursor === undefined ? [] : previous),...page.items]
        .map(item => [item.connectionId,item])).values()]);
      // An empty authorized scan page can still have another page.
      setCursor(page.nextCursor);
    } catch {
      if (current === generation.current) {
        // Protected transport can reject after refresh without changing AuthProvider status.
        setItems([]); setCursor(null); setError(true);
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [api,kind,actorKey]);

  useEffect(() => {
    setActionError(false); setBusy(null); actionLock.current=false;
    if (authenticated) void load();
    else { setItems([]); setCursor(null); setLoading(false); setError(false); }
    return () => { ++generation.current; };
  }, [authenticated,load]);

  const act = async (action: ConnectionAction, target: string): Promise<boolean> => {
    if (!authenticated || actionLock.current) return false;
    actionLock.current=true; setBusy(target); setActionError(false);
    const current = generation.current;
    try {
      const operation = {accept:api.acceptConnection.bind(api),decline:api.declineConnection.bind(api),
        cancel:api.cancelConnection.bind(api),disconnect:api.disconnect.bind(api)}[action];
      await operation(target);
    } catch {
      if (current === generation.current) setActionError(true);
    } finally {
      if (current === generation.current) {
        // Re-read after rejection: the pair may have been blocked or removed elsewhere.
        const refreshing=load();const refreshGeneration=generation.current;
        await refreshing;
        if(refreshGeneration===generation.current) {
          setBusy(null); actionLock.current=false;
        }
      }
    }
    // Ownership, including the refresh, determines whether the caller can close its dialog.
    return current+1 === generation.current;
  };
  const ownsData=authenticated && owner.api===api && owner.actorKey===actorKey;
  return {kind,setKind,items:ownsData?items:[],cursor:ownsData?cursor:null,loading,error,actionError,busy,act,
    retry:()=>void load(),loadMore:()=>{if(cursor && !loading && !busy) void load(cursor);}};
}
