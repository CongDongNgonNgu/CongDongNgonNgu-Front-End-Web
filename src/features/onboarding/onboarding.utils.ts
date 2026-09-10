import type { OnboardingDraft } from './onboarding.types';

export function getClientStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasDraftContent(draft: OnboardingDraft): boolean {
  return draft.step > 0 || draft.nativeCodes.length > 0 || draft.knownCodes.length > 0 || draft.learningCodes.length > 0
    || Object.keys(draft.levels).length > 0 || draft.goals.length > 0 || draft.skills.length > 0 || draft.interests.length > 0
    || Boolean(draft.timezone) || draft.availability.length > 0;
}

export function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}
