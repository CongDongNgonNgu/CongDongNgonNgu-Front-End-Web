import { createInitialDraft, sanitizeDraft } from './onboarding-draft';
import { validateDraftForStep } from './onboarding-validation';
import {
  PROFICIENCY_VALUES,
  type DeclaredProficiency,
  type LanguageRole,
  type OnboardingDraft,
  type OwnProfile,
  type ProfileSkill,
  type ProfileUpdateInput,
} from './onboarding.types';
import { unique } from './onboarding.utils';

export function buildProfileUpdate(draft: OnboardingDraft): ProfileUpdateInput {
  const rolesByCode = new Map<string, LanguageRole[]>();
  addRoles(rolesByCode, draft.nativeCodes, 'native');
  addRoles(rolesByCode, draft.knownCodes, 'known');
  addRoles(rolesByCode, draft.learningCodes, 'learning');
  const firstLearningCode = draft.learningCodes[0];
  const languages = [...rolesByCode.entries()].map(([languageCode, roles]) => {
    const declaredProficiency = roles.includes('native') ? 'NATIVE' : draft.levels[languageCode];
    if (!declaredProficiency || !PROFICIENCY_VALUES.includes(declaredProficiency)) {
      throw new Error('A declared proficiency is required for every non-native language.');
    }
    const relation = {
      languageCode,
      roles,
      declaredProficiency,
    } as {
      languageCode: string;
      roles: LanguageRole[];
      declaredProficiency: DeclaredProficiency;
      isPrimaryLearningTarget?: boolean;
    };
    if (roles.includes('learning')) relation.isPrimaryLearningTarget = languageCode === firstLearningCode;
    return relation;
  });
  return {
    languages,
    goals: unique(draft.goals),
    skills: unique(draft.skills) as ProfileSkill[],
    interests: unique(draft.interests.map((interest) => interest.trim().toLowerCase()).filter(Boolean)),
    timezone: draft.timezone.trim() || null,
    availability: draft.availability.map((window) => ({ ...window })),
  };
}

export function draftFromProfile(profile: OwnProfile): OnboardingDraft {
  const draft = createInitialDraft();
  for (const language of profile.languages) {
    if (language.roles.includes('native')) draft.nativeCodes.push(language.code);
    if (language.roles.includes('known')) draft.knownCodes.push(language.code);
    if (language.roles.includes('learning')) draft.learningCodes.push(language.code);
    if (!language.roles.includes('native')) draft.levels[language.code] = language.declaredProficiency;
  }
  draft.goals = unique(profile.goals);
  draft.skills = unique(profile.skills) as ProfileSkill[];
  draft.interests = unique(profile.interests);
  draft.timezone = profile.timezone ?? '';
  draft.availability = profile.availability.map((window) => ({ ...window }));
  return sanitizeDraft(draft);
}

export function isProfileOnboardingComplete(profile: OwnProfile): boolean {
  const draft = draftFromProfile(profile);
  return Object.keys(validateDraftForStep(draft, 3)).length === 0;
}

function addRoles(map: Map<string, LanguageRole[]>, codes: readonly string[], role: LanguageRole): void {
  for (const rawCode of codes) {
    const code = rawCode.trim().toLowerCase();
    if (!code) continue;
    const roles = map.get(code) ?? [];
    if (!roles.includes(role)) roles.push(role);
    map.set(code, roles);
  }
}
