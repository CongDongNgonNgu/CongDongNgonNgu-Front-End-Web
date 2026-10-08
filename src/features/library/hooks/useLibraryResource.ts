import { useCallback, useEffect, useRef, useState } from 'react';
import { libraryApi } from '../library.api';
import type { LibraryPublicResource } from '../library.types';

interface UseLibraryResourceOptions {
  api?: LibraryResourceApiPort;
  resourceId: string | undefined;
  revalidateOnReturn?: boolean;
}

export interface LibraryResourceApiPort {
  getResource: (resourceId: string) => Promise<LibraryPublicResource>;
}

export interface LibraryResourceState {
  resource: LibraryPublicResource | null;
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}

export function useLibraryResource({ api = libraryApi, resourceId, revalidateOnReturn = false }: UseLibraryResourceOptions): LibraryResourceState {
  const [resource, setResource] = useState<LibraryPublicResource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setResource(null);
    setIsLoading(true);
    setError(null);
    if (!resourceId) {
      setResource(null);
      setError(new Error('Missing library resource id'));
      setIsLoading(false);
      return;
    }
    try {
      const result = await api.getResource(resourceId);
      if (currentRequest !== requestId.current) return;
      setResource(result);
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setResource(null);
      setError(cause);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, [api, resourceId]);

  useEffect(() => { void refresh(); return () => { requestId.current++; }; }, [refresh]);
  useEffect(() => {
    if (!revalidateOnReturn) return;
    const onReturn = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    return () => { window.removeEventListener('focus', onReturn); document.removeEventListener('visibilitychange', onReturn); };
  }, [refresh, revalidateOnReturn]);

  return { resource, isLoading, error, refresh };
}
