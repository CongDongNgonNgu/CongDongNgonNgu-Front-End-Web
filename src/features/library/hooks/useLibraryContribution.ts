import { useCallback, useState } from 'react';
import { ApiClientError } from '../../../services/api-client';
import { getContributionErrorMessage, shouldRefreshContributionPolicy } from '../library.contribution.errors';
import {
  toCreateResourcePayload,
  toProvenancePayload,
  toSubmitContributionPayload,
} from '../library.contribution.payload';
import type {
  LibraryContributionApiPort,
  LibraryContributionSnapshot,
  LibraryContributionStage,
  LibraryContributionSubmissionResult,
} from '../library.contribution.types';

export interface LibraryContributionState {
  stage: LibraryContributionStage;
  resourceId: string | null;
  frozenSnapshot: LibraryContributionSnapshot | null;
  result: LibraryContributionSubmissionResult | null;
  error: unknown;
  errorMessage: string | null;
  isBusy: boolean;
}

export interface UseLibraryContributionOptions {
  api: LibraryContributionApiPort;
  onPolicyRefreshRequired?: (error: unknown) => void;
}

const INITIAL_STATE: LibraryContributionState = {
  stage: 'IDLE',
  resourceId: null,
  frozenSnapshot: null,
  result: null,
  error: null,
  errorMessage: null,
  isBusy: false,
};

export function useLibraryContribution({ api, onPolicyRefreshRequired }: UseLibraryContributionOptions) {
  const [state, setState] = useState<LibraryContributionState>(INITIAL_STATE);

  const submit = useCallback(async (
    requestedSnapshot: LibraryContributionSnapshot,
    useRequestedSnapshot = false,
  ): Promise<boolean> => {
    if (state.isBusy || state.stage === 'SUCCESS') return false;

    const snapshot = useRequestedSnapshot ? requestedSnapshot : state.frozenSnapshot ?? requestedSnapshot;
    const existingResourceId = state.resourceId;
    let resourceId = existingResourceId;
    let operation: 'create' | 'provenance' | 'submit' = existingResourceId ? 'submit' : 'create';

    setState((current) => ({
      ...current,
      stage: existingResourceId ? (current.stage === 'FAILED_PROVENANCE' ? 'ATTACHING_PROVENANCE' : 'SUBMITTING') : 'CREATING_RESOURCE',
      frozenSnapshot: snapshot,
      error: null,
      errorMessage: null,
      isBusy: true,
    }));

    try {
      if (!resourceId) {
        operation = 'create';
        const created = await api.createResource(toCreateResourcePayload(snapshot));
        resourceId = created.id;
        if (!resourceId) throw new Error('Contribution resource ID missing');
        operation = 'provenance';
        setState((current) => ({ ...current, resourceId, stage: 'ATTACHING_PROVENANCE' }));
        await api.attachProvenance(resourceId, toProvenancePayload(resourceId, snapshot));
      } else if (state.stage === 'FAILED_PROVENANCE') {
        operation = 'provenance';
        setState((current) => ({ ...current, stage: 'ATTACHING_PROVENANCE' }));
        await api.attachProvenance(resourceId, toProvenancePayload(resourceId, snapshot));
      }

      operation = 'submit';
      setState((current) => ({ ...current, stage: 'SUBMITTING' }));
      const result = await api.submitContribution(resourceId, toSubmitContributionPayload(snapshot));
      setState((current) => ({
        ...current,
        stage: 'SUCCESS',
        result,
        resourceId,
        frozenSnapshot: snapshot,
        error: null,
        errorMessage: null,
        isBusy: false,
      }));
      return true;
    } catch (cause) {
      const failedStage: LibraryContributionStage = operation === 'create'
        ? 'FAILED_CREATE'
        : operation === 'provenance'
          ? 'FAILED_PROVENANCE'
          : 'FAILED_SUBMIT';
      setState((current) => ({
        ...current,
        stage: failedStage,
        resourceId,
        frozenSnapshot: snapshot,
        error: cause,
        errorMessage: getContributionErrorMessage(cause),
        isBusy: false,
      }));
      if (shouldRefreshContributionPolicy(cause)) onPolicyRefreshRequired?.(cause);
      return false;
    }
  }, [api, onPolicyRefreshRequired, state]);

  const retry = useCallback(async (): Promise<boolean> => {
    if (!state.frozenSnapshot) return false;
    return submit(state.frozenSnapshot);
  }, [state.frozenSnapshot, submit]);

  const retrySubmitWithSnapshot = useCallback(async (snapshot: LibraryContributionSnapshot): Promise<boolean> => {
    if (state.stage !== 'FAILED_SUBMIT' || !state.resourceId) return false;
    return submit(snapshot, true);
  }, [state.resourceId, state.stage, submit]);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, submit, retry, retrySubmitWithSnapshot, reset };
}

export function isContributionStageBusy(stage: LibraryContributionStage): boolean {
  return stage === 'CREATING_RESOURCE' || stage === 'ATTACHING_PROVENANCE' || stage === 'SUBMITTING';
}

export function isContributionRetryable(stage: LibraryContributionStage): boolean {
  return stage === 'FAILED_CREATE' || stage === 'FAILED_PROVENANCE' || stage === 'FAILED_SUBMIT';
}

export function isTermsStaleError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'LIBRARY_CONTRIBUTION_TERMS_STALE';
}
