import { useCallback, useEffect, useState } from 'react';
import { libraryContributionApi } from '../library.contribution.api';
import type {
  LibraryContributionPolicy,
  LibraryContributionPolicyApiPort,
} from '../library.contribution.types';

export interface LibraryContributionPolicyState {
  policy: LibraryContributionPolicy | null;
  isLoading: boolean;
  error: unknown;
  reload: () => Promise<void>;
}

export function useLibraryContributionPolicy(
  api: LibraryContributionPolicyApiPort = libraryContributionApi,
  enabled = true,
): LibraryContributionPolicyState {
  const [policy, setPolicy] = useState<LibraryContributionPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      setPolicy(await api.getPolicy());
    } catch (cause) {
      setPolicy(null);
      setError(cause);
    } finally {
      setIsLoading(false);
    }
  }, [api, enabled]);

  useEffect(() => {
    if (!enabled) {
      setPolicy(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    void reload();
  }, [enabled, reload]);

  return { policy, isLoading, error, reload };
}
