import { translate, type UiLocale } from '../ui-locale/ui-locale';
import { languageDisplayName } from '../ui-locale/language-display';
import { localizedOnboardingOptions } from '../onboarding/onboarding.constants';
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

export function languageLabel(language: LanguageCatalogItem | undefined, code: string, locale: UiLocale = 'vi'): string {
  return language ? languageDisplayName(language, locale) : code.toUpperCase();
}

export function secondaryLanguageLabel(language: LanguageCatalogItem | undefined, code: string): string {
  if (!language) return code.toUpperCase();
  return language.nativeName;
}

export function goalLabel(goal: string, locale: UiLocale = 'vi'): string {
  const options = localizedOnboardingOptions(locale).GOAL_OPTIONS;
  return options.find((option) => option.value === goal)?.label ?? goal;
}

export function skillLabel(skill: ProfileSkill, locale: UiLocale = 'vi'): string {
  const options = localizedOnboardingOptions(locale).SKILL_OPTIONS;
  return options.find((option) => option.value === skill)?.label ?? skill;
}

export function timezoneLabel(timezone: string | null, locale: UiLocale = 'vi'): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  if (!timezone) return t('onboarding.no.timezone.selected');
  const options = localizedOnboardingOptions(locale).TIMEZONES;
  return options.find((option) => option.value === timezone)?.label ?? timezone;
}

export function proficiencyLabel(proficiency: string, locale: UiLocale = 'vi'): string {
  return localizedPassportLabels(locale).PROFICIENCY_LABELS[proficiency as DeclaredProficiency] ?? proficiency;
}

export function availabilitySummary(availability: readonly AvailabilityWindow[], locale: UiLocale = 'vi'): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  if (availability.length === 0) return t('onboarding.no.availability.shared');
  const dayCount = new Set(availability.map((window) => window.dayOfWeek)).size;
  return dayCount + t('onboarding.suitable.days') + availability.length + t('onboarding.time.windows');
}

export function formatAvailabilityWindow(window: AvailabilityWindow, locale: UiLocale = 'vi'): string {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return (localizedPassportLabels(locale).DAY_LABELS[window.dayOfWeek] ?? t('onboarding.other.day')) + ' · ' + window.startTime + '–' + window.endTime;
}

export function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isDeclaredProficiency(value: string): value is DeclaredProficiency {
  return PROFICIENCY_VALUES.includes(value as DeclaredProficiency);
}

export function localizedPassportLabels(locale: UiLocale) {
const ROLE_LABELS = {
  native: translate(locale, 'onboarding.native'),
  known: translate(locale, 'onboarding.known'),
  learning: translate(locale, 'onboarding.learning'),
};
const PROFICIENCY_LABELS = {
  NATIVE: translate(locale, 'onboarding.native'),
  A1: translate(locale, 'onboarding.a1.beginner'),
  A2: translate(locale, 'onboarding.a2.elementary'),
  B1: translate(locale, 'onboarding.b1.intermediate'),
  B2: translate(locale, 'onboarding.b2.upper.intermediate'),
  C1: translate(locale, 'onboarding.c1.advanced'),
  C2: translate(locale, 'onboarding.c2.proficient'),
};
const DAY_LABELS: Record<number, string> = {
  1: translate(locale, 'onboarding.monday'),
  2: translate(locale, 'onboarding.tuesday'),
  3: translate(locale, 'onboarding.wednesday'),
  4: translate(locale, 'onboarding.thursday'),
  5: translate(locale, 'onboarding.friday'),
  6: translate(locale, 'onboarding.saturday'),
  7: translate(locale, 'onboarding.sunday'),
};
return { ROLE_LABELS, PROFICIENCY_LABELS, DAY_LABELS };
}
