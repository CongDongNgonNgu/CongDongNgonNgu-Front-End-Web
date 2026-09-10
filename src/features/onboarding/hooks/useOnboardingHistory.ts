import { useCallback, useEffect } from 'react';
import { ONBOARDING_STEP_COUNT } from '../onboarding.types';

interface UseOnboardingHistoryOptions {
  step: number;
  ready: boolean;
  onStepChange: (step: number) => void;
  onClearError: () => void;
  onResetSearch: () => void;
  onExit: () => void;
}

export function useOnboardingHistory({
  step,
  ready,
  onStepChange,
  onClearError,
  onResetSearch,
  onExit,
}: UseOnboardingHistoryOptions) {
  useEffect(() => {
    if (!ready) return;
    const currentState = window.history.state;
    if (typeof currentState?.onboardingDepth === 'number') return;
    window.history.replaceState(
      { ...currentState, onboardingFlow: true, onboardingStep: step, onboardingDepth: 0 },
      '',
      window.location.href,
    );
  }, [ready, step]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const previousStep = event.state?.onboardingStep;
      if (typeof previousStep === 'number' && previousStep >= 0 && previousStep < ONBOARDING_STEP_COUNT) {
        onStepChange(previousStep);
        onClearError();
        onResetSearch();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [onClearError, onResetSearch, onStepChange]);

  const advance = useCallback((): boolean => {
    if (step >= ONBOARDING_STEP_COUNT - 1) return false;
    const nextStep = step + 1;
    const currentDepth = typeof window.history.state?.onboardingDepth === 'number'
      ? window.history.state.onboardingDepth
      : 0;
    window.history.pushState(
      { ...window.history.state, onboardingFlow: true, onboardingStep: nextStep, onboardingDepth: currentDepth + 1 },
      '',
      window.location.href,
    );
    onStepChange(nextStep);
    onClearError();
    onResetSearch();
    return true;
  }, [onClearError, onResetSearch, onStepChange, step]);

  const back = useCallback((): void => {
    if (step === 0) {
      onExit();
      return;
    }
    if (typeof window.history.state?.onboardingDepth === 'number' && window.history.state.onboardingDepth > 0) {
      window.history.back();
      return;
    }
    const previousStep = step - 1;
    window.history.replaceState(
      { ...window.history.state, onboardingFlow: true, onboardingStep: previousStep, onboardingDepth: 0 },
      '',
      window.location.href,
    );
    onStepChange(previousStep);
    onClearError();
    onResetSearch();
  }, [onClearError, onExit, onResetSearch, onStepChange, step]);

  return { advance, back };
}
