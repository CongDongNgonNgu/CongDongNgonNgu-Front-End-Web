import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CommunityPost } from '../community.types';
import type { CommunityRequestApi, CorrectionRequestResponse } from '../corrections.types';

export interface CorrectionRequestSource {
  data: CorrectionRequestResponse | null;
  loading: boolean;
  error: unknown;
  retry: () => void;
}

export function useCorrectionRequestSource(post: CommunityPost | null, api: Pick<CommunityRequestApi, 'getCorrectionRequest'>, authenticated: boolean, actor?: string | null): CorrectionRequestSource {
  const id = post?.postType === 'CORRECTION_REQUEST' ? post.id : null;
  const [attempt, setAttempt] = useState(0);
  const owner = useMemo(() => ({ id, api, authenticated, actor, attempt }), [id, api, authenticated, actor, attempt]);
  const [result, setResult] = useState<{ owner: typeof owner; data: CorrectionRequestResponse | null; error: unknown } | null>(null);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    if (!owner.id) return;
    let cancelled = false;
    void owner.api.getCorrectionRequest(owner.id, owner.authenticated).then(data => {
      if (!cancelled) setResult({ owner, data, error: null });
    }, error => {
      if (!cancelled) setResult({ owner, data: null, error: error ?? new Error('Unavailable correction source') });
    });
    return () => { cancelled = true; };
  }, [owner]);
  const current = result?.owner === owner ? result : null;
  return { data: current?.data ?? null, error: current?.error ?? null, loading: Boolean(id) && !current, retry };
}
