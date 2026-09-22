import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { libraryApi } from '../library.api';
import type { LibraryFilters, LibraryPublicSearchItem } from '../library.types';

export interface LibrarySearchApiPort {
  listResources: (query: Partial<LibraryFilters> & { cursor?: string; limit?: number }) => Promise<{
    items: LibraryPublicSearchItem[];
    nextCursor: string | null;
  }>;
}

export interface UseLibrarySearchOptions {
  api?: LibrarySearchApiPort;
  filters: LibraryFilters;
  pageSize?: number;
}

export interface LibrarySearchState {
  items: LibraryPublicSearchItem[];
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: unknown;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

export function mergeUniqueLibraryItems(
  first: LibraryPublicSearchItem[],
  second: LibraryPublicSearchItem[],
): LibraryPublicSearchItem[] {
  const seen = new Set<string>();
  return [...first, ...second].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function getLibrarySearchErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.status === 429) {
    return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';
  }
  return 'Không thể tải thư viện lúc này. Vui lòng thử lại sau ít phút.';
}

export function useLibrarySearch({
  api = libraryApi,
  filters,
  pageSize = 20,
}: UseLibrarySearchOptions): LibrarySearchState {
  const [items, setItems] = useState<LibraryPublicSearchItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setItems([]);
    setNextCursor(null);
    setError(null);
    setIsLoading(true);
    try {
      const result = await api.listResources({ ...filters, limit: pageSize });
      if (currentRequest !== requestId.current) return;
      setItems(result.items);
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [api, filters.language, filters.level, filters.q, filters.topic, filters.type, pageSize]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading || isLoadingMore) return;
    const currentRequest = requestId.current;
    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await api.listResources({ ...filters, limit: pageSize, cursor: nextCursor });
      if (currentRequest !== requestId.current) return;
      setItems((current) => mergeUniqueLibraryItems(current, result.items));
      setNextCursor(result.nextCursor);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) setIsLoadingMore(false);
    }
  }, [api, filters, isLoading, isLoadingMore, nextCursor, pageSize]);

  return { items, nextCursor, isLoading, isLoadingMore, error, refresh, loadMore };
}
