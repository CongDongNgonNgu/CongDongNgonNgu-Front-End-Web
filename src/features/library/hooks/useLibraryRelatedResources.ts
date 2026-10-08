import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibraryRelatedApiPort, LibraryRelatedPage, LibraryRelatedQuery } from '../library.types';

type RelatedFilters = Omit<LibraryRelatedQuery, 'cursor' | 'limit'>;
interface Options { api: LibraryRelatedApiPort; resourceId: string; filters: RelatedFilters; revalidateOnReturn?: boolean; enabled?: boolean }
interface State extends LibraryRelatedPage { owner: string; isLoading: boolean; error: unknown }
const empty = (owner: string): State => ({ owner, items: [], nextCursor: null, isLoading: true, error: null });

/** Each page is a fresh public projection. Earlier pages are never retained. */
export function useLibraryRelatedResources({ api, resourceId, filters, revalidateOnReturn = true, enabled = true }: Options) {
  const query = useMemo(() => {
    const value: RelatedFilters = {};
    if (filters.language) value.language = filters.language;
    if (filters.type) value.type = filters.type;
    if (filters.level) value.level = filters.level;
    if (filters.relation) value.relation = filters.relation;
    return value;
  }, [filters.language, filters.type, filters.level, filters.relation]);
  const owner = JSON.stringify([resourceId, query, enabled]);
  const [state, setState] = useState<State>(() => empty(owner));
  const generation = useRef(0);
  const busy = useRef(false);
  const cursors = useRef(new Set<string>());
  const currentOwner = useRef(owner);
  currentOwner.current = owner;

  const request = useCallback(async (cursor?: string) => {
    const id = ++generation.current;
    setState(empty(owner));
    if (!enabled) { busy.current = false; return; }
    busy.current = true;
    try {
      const page = await api.getRelatedResources(resourceId, { ...query, limit: 3, ...(cursor ? { cursor } : {}) });
      if (generation.current !== id || currentOwner.current !== owner) return;
      const seen = new Set<string>();
      const items = page.items.slice(0, 12).filter(item => {
        if (item.resource.id === resourceId || seen.has(item.resource.id)) return false;
        seen.add(item.resource.id);
        return true;
      });
      const nextCursor = page.nextCursor && !cursors.current.has(page.nextCursor) ? page.nextCursor : null;
      setState({ owner, items, nextCursor, isLoading: false, error: null });
    } catch (error) {
      if (generation.current === id && currentOwner.current === owner) setState({ ...empty(owner), isLoading: false, error });
    } finally {
      if (generation.current === id) busy.current = false;
    }
  }, [api, owner, query, resourceId, enabled]);

  const refresh = useCallback(() => { cursors.current.clear(); return request(); }, [request]);
  useEffect(() => {
    void refresh();
    return () => { generation.current++; busy.current = false; };
  }, [refresh]);
  useEffect(() => {
    if (!revalidateOnReturn || !enabled) return;
    const onReturn = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => { window.removeEventListener('focus', onReturn); document.removeEventListener('visibilitychange', onReturn); };
  }, [refresh, revalidateOnReturn, enabled]);

  const visible = state.owner === owner ? state : empty(owner);
  const nextPage = useCallback(async () => {
    if (busy.current || !visible.nextCursor) return;
    cursors.current.add(visible.nextCursor);
    await request(visible.nextCursor);
  }, [request, visible.nextCursor]);
  return { items: visible.items, nextCursor: visible.nextCursor, isLoading: visible.isLoading, error: visible.error, refresh, nextPage };
}
