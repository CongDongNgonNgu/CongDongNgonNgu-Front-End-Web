import { useCallback, useEffect, useRef, useState } from 'react';
import { libraryApi } from '../library.api';
import type { LibraryPublicResource } from '../library.types';

interface UseLibraryResourceOptions {
  api?: LibraryResourceApiPort;
  resourceId: string | undefined;
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

export function useLibraryResource({ api = libraryApi, resourceId }: UseLibraryResourceOptions): LibraryResourceState {
  const [resource, setResource] = useState<LibraryPublicResource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
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

  useEffect(() => { void refresh(); }, [refresh]);

  return { resource, isLoading, error, refresh };
}
