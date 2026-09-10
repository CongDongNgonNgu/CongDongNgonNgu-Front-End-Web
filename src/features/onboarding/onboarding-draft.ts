import {
  ONBOARDING_STEP_COUNT,
  PROFILE_SKILLS,
  PROFICIENCY_VALUES,
  type DeclaredProficiency,
  type OnboardingDraft,
  type ProfileSkill,
} from './onboarding.types';
import { timeToMinutes, unique } from './onboarding.utils';

export const ONBOARDING_STORAGE_PREFIX = 'cdn:onboarding:draft:';
export const ONBOARDING_COMPLETE_PREFIX = 'cdn:onboarding:complete:';

const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const END_TIME_PATTERN = /^(?:([01]\d|2[0-3]):[0-5]\d|24:00)$/;

export function createInitialDraft(): OnboardingDraft {
  return {
    version: 1,
    step: 0,
    nativeCodes: [],
    knownCodes: [],
    learningCodes: [],
    levels: {},
    goals: [],
    skills: [],
    interests: [],
    timezone: '',
    availability: [],
  };
}

export function getOnboardingStorageKey(userId: string): string {
  return ONBOARDING_STORAGE_PREFIX + encodeURIComponent(userId);
}

export function getOnboardingCompleteKey(userId: string): string {
  return ONBOARDING_COMPLETE_PREFIX + encodeURIComponent(userId);
}

export function readOnboardingDraft(storage: Storage | null | undefined, userId: string): OnboardingDraft {
  if (!storage || !userId) return createInitialDraft();
  try {
    const raw = storage.getItem(getOnboardingStorageKey(userId));
    if (!raw) return createInitialDraft();
    return sanitizeDraft(JSON.parse(raw));
  } catch {
    return createInitialDraft();
  }
}

export function writeOnboardingDraft(storage: Storage | null | undefined, userId: string, draft: OnboardingDraft): void {
  if (!storage || !userId) return;
  try {
    storage.setItem(getOnboardingStorageKey(userId), JSON.stringify(sanitizeDraft(draft)));
  } catch {
    // A full or disabled storage area must not block the onboarding flow.
  }
}

export function markOnboardingComplete(storage: Storage | null | undefined, userId: string): void {
  if (!storage || !userId) return;
  try {
    storage.setItem(getOnboardingCompleteKey(userId), '1');
  } catch {
    // Completion is still confirmed by the server response and route state.
  }
}

export function isOnboardingComplete(storage: Storage | null | undefined, userId: string): boolean {
  if (!storage || !userId) return false;
  try {
    return storage.getItem(getOnboardingCompleteKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function sanitizeDraft(value: unknown): OnboardingDraft {
  const initial = createInitialDraft();
  if (!isRecord(value)) return initial;
  const step = typeof value.step === 'number' && Number.isInteger(value.step)
    ? clamp(value.step, 0, ONBOARDING_STEP_COUNT - 1)
    : initial.step;
  return {
    version: 1,
    step,
    nativeCodes: readCodes(value.nativeCodes),
    knownCodes: readCodes(value.knownCodes),
    learningCodes: readCodes(value.learningCodes),
    levels: readLevels(value.levels),
    goals: readTextList(value.goals, 64),
    skills: readSkills(value.skills),
    interests: readTextList(value.interests, 64),
    timezone: typeof value.timezone === 'string' ? value.timezone.trim().slice(0, 64) : '',
    availability: readAvailability(value.availability),
  };
}

function readCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => LANGUAGE_CODE_PATTERN.test(item)));
}

function readLevels(value: unknown): Record<string, DeclaredProficiency> {
  if (!isRecord(value)) return {};
  const levels: Record<string, DeclaredProficiency> = {};
  for (const [code, level] of Object.entries(value)) {
    if (LANGUAGE_CODE_PATTERN.test(code) && typeof level === 'string' && PROFICIENCY_VALUES.includes(level as DeclaredProficiency)) {
      levels[code] = level as DeclaredProficiency;
    }
  }
  return levels;
}

function readTextList(value: unknown, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return unique(value.filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean));
}

function readSkills(value: unknown): ProfileSkill[] {
  if (!Array.isArray(value)) return [];
  return unique(value.filter((item): item is ProfileSkill => typeof item === 'string' && PROFILE_SKILLS.includes(item as ProfileSkill))) as ProfileSkill[];
}

function readAvailability(value: unknown): OnboardingDraft['availability'] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    dayOfWeek: typeof item.dayOfWeek === 'number' ? item.dayOfWeek : Number(item.dayOfWeek),
    startTime: typeof item.startTime === 'string' ? item.startTime : '',
    endTime: typeof item.endTime === 'string' ? item.endTime : '',
  })).filter(isValidAvailability);
}

function isValidAvailability(value: { dayOfWeek: number; startTime: string; endTime: string }): boolean {
  return Number.isInteger(value.dayOfWeek) && value.dayOfWeek >= 1 && value.dayOfWeek <= 7
    && TIME_PATTERN.test(value.startTime)
    && END_TIME_PATTERN.test(value.endTime)
    && timeToMinutes(value.startTime) < timeToMinutes(value.endTime);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
