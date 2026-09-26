import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  LibraryInvalidSourceQueueItem,
  LibraryReviewApiPort,
  LibraryReviewQueueItem,
  LibraryReviewQueueQuery,
} from '../library-review.types';

type QueueItem = LibraryReviewQueueItem | LibraryInvalidSourceQueueItem;

interface QueuePage {
  items: QueueItem[];
  nextCursor: string | null;
}

interface UseLibraryReviewQueueOptions {
  api: LibraryReviewApiPort;
  mode: 'pending' | 'source-invalid';
  query: LibraryReviewQueueQuery;
  pageSize?: number;
}

export function useLibraryReviewQueue({ api, mode, query, pageSize = 12 }: UseLibraryReviewQueueOptions) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const load = useCallback(async (cursor?: string, append = false) => {
    const currentRequest = append ? requestId.current : ++requestId.current;
    if (!append) {
      setItems([]);
      setNextCursor(null);
      setError(null);
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
      setError(null);
    }
    try {
      const page: QueuePage = mode === 'source-invalid'
        ? await api.listInvalidSourceQueue({ cursor, limit: pageSize })
        : await api.listReviewQueue({ ...query, cursor, limit: pageSize });
      if (currentRequest !== requestId.current) return;
      setItems((current) => append ? mergeUnique(current, page.items) : page.items);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [api, mode, pageSize, query.language, query.q, query.type]);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(() => load(), [load]);
  const loadMore = useCallback(() => {
    if (!nextCursor || isLoading || isLoadingMore) return Promise.resolve();
    return load(nextCursor, true);
  }, [isLoading, isLoadingMore, load, nextCursor]);

  return { items, nextCursor, isLoading, isLoadingMore, error, refresh, loadMore };
}

function mergeUnique(current: QueueItem[], next: QueueItem[]): QueueItem[] {
  const seen = new Set(current.map((item) => item.resourceId));
  return [...current, ...next.filter((item) => !seen.has(item.resourceId))];
}
