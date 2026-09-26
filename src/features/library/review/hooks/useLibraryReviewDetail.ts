import { useCallback, useEffect, useRef, useState } from 'react';
import type { LibraryReviewApiPort, LibraryReviewDetail } from '../library-review.types';

export function useLibraryReviewDetail(api: LibraryReviewApiPort, resourceId: string | undefined) {
  const [detail, setDetail] = useState<LibraryReviewDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!resourceId) {
      setDetail(null);
      setError(new Error('Missing review resource id'));
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getReviewDetail(resourceId);
      if (currentRequest !== requestId.current) return;
      setDetail(result);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setDetail(null);
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [api, resourceId]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { detail, isLoading, error, refresh };
}
