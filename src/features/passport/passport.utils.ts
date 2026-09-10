import { GOAL_OPTIONS, SKILL_OPTIONS, TIMEZONES } from '../onboarding/onboarding.constants';
import type {
  AvailabilityWindow,
  DeclaredProficiency,
  LanguageCatalogItem,
  LanguageRole,
  OwnProfile,
  ProfileLanguageInput,
  ProfileSkill,
  ProfileUpdateInput,
} from '../onboarding/onboarding.types';
import { PROFICIENCY_VALUES } from '../onboarding/onboarding.types';

export interface PassportDraft {
  languages: ProfileLanguageInput[];
  goals: string[];
  skills: ProfileSkill[];
  interests: string[];
  timezone: string | null;
  availability: AvailabilityWindow[];
}

export const ROLE_LABELS: Record<LanguageRole, string> = {
  native: 'Bản ngữ',
  known: 'Đã biết',
  learning: 'Đang học',
};

export const PROFICIENCY_LABELS: Record<DeclaredProficiency, string> = {
  NATIVE: 'Bản ngữ',
  A1: 'A1 · Mới bắt đầu',
  A2: 'A2 · Sơ cấp',
  B1: 'B1 · Trung cấp',
  B2: 'B2 · Trên trung cấp',
  C1: 'C1 · Cao cấp',
  C2: 'C2 · Thành thạo',
};

export const DAY_LABELS: Record<number, string> = {
  1: 'Thứ hai',
  2: 'Thứ ba',
  3: 'Thứ tư',
  4: 'Thứ năm',
  5: 'Thứ sáu',
  6: 'Thứ bảy',
  7: 'Chủ nhật',
};

const GOAL_LABELS = new Map<string, string>(GOAL_OPTIONS.map((option) => [option.value, option.label]));
const SKILL_LABELS = new Map<string, string>(SKILL_OPTIONS.map((option) => [option.value, option.label]));
const TIMEZONE_LABELS = new Map<string, string>(TIMEZONES.map((option) => [option.value, option.label]));

export function draftFromProfile(profile: OwnProfile): PassportDraft {
  return {
    languages: profile.languages.map((language) => ({
      languageCode: language.code,
      roles: [...language.roles],
      declaredProficiency: language.declaredProficiency,
      isPrimaryLearningTarget: language.isPrimaryLearningTarget,
      visibility: language.visibility,
    })),
    goals: [...profile.goals],
    skills: [...profile.skills],
    interests: [...profile.interests],
    timezone: profile.timezone,
    availability: profile.availability.map((window) => ({ ...window })),
  };
}

export function profileUpdateFromDraft(draft: PassportDraft): ProfileUpdateInput {
  return {
    languages: draft.languages.map((language) => ({
      languageCode: language.languageCode,
      roles: [...language.roles],
      declaredProficiency: language.declaredProficiency,
      isPrimaryLearningTarget: language.isPrimaryLearningTarget,
      visibility: language.visibility,
    })),
    goals: [...draft.goals],
    skills: [...draft.skills],
    interests: [...draft.interests],
    timezone: draft.timezone,
    availability: draft.availability.map((window) => ({ ...window })),
  };
}

export function languageLabel(language: LanguageCatalogItem | undefined, code: string): string {
  return language?.nativeName || language?.englishName || code.toUpperCase();
}

export function secondaryLanguageLabel(language: LanguageCatalogItem | undefined, code: string): string {
  if (!language) return code.toUpperCase();
  const names = [language.vietnameseName, language.englishName]
    .filter((name, index, list) => Boolean(name) && list.indexOf(name) === index && name !== language.nativeName);
  return names.join(' · ');
}

export function goalLabel(goal: string): string {
  return GOAL_LABELS.get(goal) ?? humanize(goal);
}

export function skillLabel(skill: ProfileSkill): string {
  return SKILL_LABELS.get(skill) ?? humanize(skill);
}

export function timezoneLabel(timezone: string | null): string {
  if (!timezone) return 'Chưa chọn múi giờ';
  return TIMEZONE_LABELS.get(timezone) ?? timezone;
}

export function proficiencyLabel(proficiency: string): string {
  return PROFICIENCY_LABELS[proficiency as DeclaredProficiency] ?? proficiency;
}

export function availabilitySummary(availability: readonly AvailabilityWindow[]): string {
  if (availability.length === 0) return 'Chưa chia sẻ khung giờ';
  const dayCount = new Set(availability.map((window) => window.dayOfWeek)).size;
  return dayCount + ' ngày phù hợp · ' + availability.length + ' khung giờ';
}

export function formatAvailabilityWindow(window: AvailabilityWindow): string {
  return (DAY_LABELS[window.dayOfWeek] ?? 'Ngày khác') + ' · ' + window.startTime + '–' + window.endTime;
}

export function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isDeclaredProficiency(value: string): value is DeclaredProficiency {
  return PROFICIENCY_VALUES.includes(value as DeclaredProficiency);
}
