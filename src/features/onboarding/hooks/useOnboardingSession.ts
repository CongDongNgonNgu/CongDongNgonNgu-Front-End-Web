import { useCallback, useEffect, useState } from 'react';
import {
  createInitialDraft,
  draftFromProfile,
  isProfileOnboardingComplete,
  markOnboardingComplete,
  readOnboardingDraft,
  sanitizeLanguageCatalog,
  writeOnboardingDraft,
} from '../onboarding-state';
import type { LanguageCatalogItem, OnboardingApi, OnboardingDraft } from '../onboarding.types';
import { hasDraftContent } from '../onboarding.utils';

export type CatalogLoadState = 'loading' | 'ready' | 'error';

interface UseOnboardingSessionOptions {
  api: OnboardingApi;
  userId: string;
  storage: Storage | null;
  onProfileComplete: () => void;
}

export function useOnboardingSession({ api, userId, storage, onProfileComplete }: UseOnboardingSessionOptions) {
  const [draft, setDraft] = useState<OnboardingDraft>(createInitialDraft);
  const [catalog, setCatalog] = useState<LanguageCatalogItem[]>([]);
  const [loadState, setLoadState] = useState<CatalogLoadState>('loading');
  const [loadError, setLoadError] = useState('');

  const loadData = useCallback(() => {
    if (!userId) return;
    const savedDraft = readOnboardingDraft(storage, userId);
    setDraft(savedDraft);
    setLoadState('loading');
    setLoadError('');

    Promise.all([api.getLanguages(), api.getProfile()])
      .then(([rawCatalog, profile]) => {
        const nextCatalog = sanitizeLanguageCatalog(rawCatalog);
        if (nextCatalog.length === 0) throw new Error('The language catalog is unavailable.');

        if (!hasDraftContent(savedDraft)) {
          if (isProfileOnboardingComplete(profile)) {
            markOnboardingComplete(storage, userId);
            onProfileComplete();
            return;
          }
          setDraft(draftFromProfile(profile));
        }

        setCatalog(nextCatalog);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setLoadState('error');
        setLoadError(error instanceof Error ? error.message : 'Unable to load onboarding data.');
      });
  }, [api, onProfileComplete, storage, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (userId && loadState === 'ready') writeOnboardingDraft(storage, userId, draft);
  }, [draft, loadState, storage, userId]);

  return {
    catalog,
    draft,
    loadData,
    loadError,
    loadState,
    setDraft,
  };
}
