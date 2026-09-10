import type { AuthUser } from '../auth/auth.types';

export const ONBOARDING_STEP_COUNT = 5;

export const PROFICIENCY_VALUES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE'] as const;
export type DeclaredProficiency = typeof PROFICIENCY_VALUES[number];

export const PROFILE_SKILLS = ['speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary'] as const;
export type ProfileSkill = typeof PROFILE_SKILLS[number];

export type LanguageRole = 'native' | 'known' | 'learning';

export interface LanguageCatalogItem {
  code: string;
  slug: string;
  nativeName: string;
  englishName: string;
  vietnameseName: string;
  direction: 'ltr' | 'rtl';
  active: boolean;
  launch: boolean;
  sortOrder: number;
}

export interface ProfileLanguageInput {
  languageCode: string;
  roles: LanguageRole[];
  declaredProficiency: DeclaredProficiency;
  isPrimaryLearningTarget?: boolean;
}

export interface ProfileLanguageResponse extends ProfileLanguageInput {
  code: string;
  slug: string;
  nativeName: string;
  englishName: string;
  vietnameseName: string;
  direction: 'ltr' | 'rtl';
  assessedProficiency: string | null;
  isPrimaryLearningTarget: boolean;
  visibility: 'PUBLIC' | 'PRIVATE';
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface OwnProfile {
  scope: 'own';
  user: AuthUser;
  languages: ProfileLanguageResponse[];
  goals: string[];
  skills: ProfileSkill[];
  interests: string[];
  timezone: string | null;
  availability: AvailabilityWindow[];
}

export interface ProfileUpdateInput {
  languages: ProfileLanguageInput[];
  goals: string[];
  skills: ProfileSkill[];
  interests: string[];
  timezone: string | null;
  availability: AvailabilityWindow[];
}

export interface OnboardingDraft {
  version: 1;
  step: number;
  nativeCodes: string[];
  knownCodes: string[];
  learningCodes: string[];
  levels: Record<string, DeclaredProficiency>;
  goals: string[];
  skills: ProfileSkill[];
  interests: string[];
  timezone: string;
  availability: AvailabilityWindow[];
}

export interface OnboardingValidationErrors {
  spokenLanguages?: string;
  learningLanguages?: string;
  levels?: string;
  goals?: string;
  skills?: string;
  availability?: string;
}

export interface OnboardingApi {
  getLanguages: () => Promise<LanguageCatalogItem[]>;
  getProfile: () => Promise<OwnProfile>;
  updateProfile: (input: ProfileUpdateInput) => Promise<OwnProfile>;
}
