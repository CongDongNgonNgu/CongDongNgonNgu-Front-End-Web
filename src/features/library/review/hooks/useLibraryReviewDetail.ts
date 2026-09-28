import { useCallback, useEffect, useRef, useState } from 'react';
import type { LibraryReviewApiPort, LibraryReviewDetail } from '../library-review.types';

export function useLibraryReviewDetail(api: LibraryReviewApiPort, resourceId: string | undefined) {
  const [detail, setDetail] = useState<LibraryReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);
  const detailRef = useRef<LibraryReviewDetail | null>(null);

  const refresh = useCallback(async (): Promise<boolean> => {
    const currentRequest = ++requestId.current;
    if (!resourceId) {
      setDetail(null);
      setError(new Error('Missing review resource id'));
      setIsLoading(false);
      setIsRefreshing(false);
      detailRef.current = null;
      return false;
    }
    const hasExistingDetail = detailRef.current !== null;
    if (hasExistingDetail) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setIsRefreshing(false);
    }
    setError(null);
    try {
      const result = await api.getReviewDetail(resourceId);
      if (currentRequest !== requestId.current) return false;
      detailRef.current = result;
      setDetail(result);
      setError(null);
      return true;
    } catch (cause) {
      if (currentRequest !== requestId.current) return false;
      if (detailRef.current === null) {
        setDetail(null);
        setError(cause);
      }
      return false;
    } finally {
      if (currentRequest === requestId.current) {
        if (hasExistingDetail) setIsRefreshing(false);
        else setIsLoading(false);
      }
    }
  }, [api, resourceId]);

  useEffect(() => {
    requestId.current += 1;
    detailRef.current = null;
    setDetail(null);
    setError(null);
    setIsLoading(true);
    setIsRefreshing(false);
    void refresh();
  }, [resourceId, refresh]);
  return { detail, isLoading, isRefreshing, error, refresh };
}
