import {
  ONBOARDING_STEP_COUNT,
  PROFILE_SKILLS,
  PROFICIENCY_VALUES,
  type DeclaredProficiency,
  type LanguageCatalogItem,
  type LanguageRole,
  type OnboardingDraft,
  type OnboardingValidationErrors,
  type OwnProfile,
  type ProfileSkill,
  type ProfileUpdateInput,
} from './onboarding.types';

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
  const nativeCodes = readCodes(value.nativeCodes);
  const knownCodes = readCodes(value.knownCodes);
  const learningCodes = readCodes(value.learningCodes);
  const levels = readLevels(value.levels);
  const goals = readTextList(value.goals, 64);
  const skills = readSkills(value.skills);
  const interests = readTextList(value.interests, 64);
  const timezone = typeof value.timezone === 'string' ? value.timezone.trim().slice(0, 64) : '';
  const availability = readAvailability(value.availability);
  return {
    version: 1,
    step,
    nativeCodes,
    knownCodes,
    learningCodes,
    levels,
    goals,
    skills,
    interests,
    timezone,
    availability,
  };
}

export function toggleCode(codes: readonly string[], code: string): string[] {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return [...codes];
  return codes.includes(normalized)
    ? codes.filter((item) => item !== normalized)
    : [...codes, normalized];
}

export function filterLanguages(languages: readonly LanguageCatalogItem[], query: string): LanguageCatalogItem[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [...languages];
  return languages.filter((language) => [language.nativeName, language.englishName, language.vietnameseName, language.code]
    .some((value) => normalizeSearch(value).includes(normalizedQuery)));
}

export function sanitizeLanguageCatalog(value: unknown): LanguageCatalogItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    code: typeof item.code === 'string' ? item.code.trim().toLowerCase() : '',
    slug: typeof item.slug === 'string' ? item.slug.trim() : '',
    nativeName: typeof item.nativeName === 'string' ? item.nativeName.trim() : '',
    englishName: typeof item.englishName === 'string' ? item.englishName.trim() : '',
    vietnameseName: typeof item.vietnameseName === 'string' ? item.vietnameseName.trim() : '',
    direction: item.direction === 'rtl' ? 'rtl' as const : 'ltr' as const,
    active: item.active === true,
    launch: item.launch === true,
    sortOrder: typeof item.sortOrder === 'number' && Number.isFinite(item.sortOrder) ? item.sortOrder : Number.MAX_SAFE_INTEGER,
  })).filter((item) => LANGUAGE_CODE_PATTERN.test(item.code)
    && Boolean(item.slug && item.nativeName && item.englishName && item.vietnameseName)
    && item.active)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export function validateDraftForStep(draft: OnboardingDraft, step: number): OnboardingValidationErrors {
  const errors: OnboardingValidationErrors = {};
  if (step >= 0 && draft.nativeCodes.length === 0 && draft.knownCodes.length === 0) {
    errors.spokenLanguages = 'Vui lòng chọn ít nhất một ngôn ngữ bạn nói.';
  }
  if (step >= 1 && draft.learningCodes.length === 0) {
    errors.learningLanguages = 'Vui lòng chọn ít nhất một ngôn ngữ bạn muốn học.';
  }
  if (step >= 2) {
    const missingLevel = unique([...draft.knownCodes, ...draft.learningCodes])
      .filter((code) => !draft.nativeCodes.includes(code))
      .some((code) => !PROFICIENCY_VALUES.includes(draft.levels[code]));
    if (missingLevel) errors.levels = 'Hãy chọn trình độ hiện tại cho mỗi ngôn ngữ.';
  }
  if (step >= 3) {
    if (draft.goals.length === 0) errors.goals = 'Chọn ít nhất một mục tiêu để cá nhân hóa gợi ý.';
    if (draft.skills.length === 0) errors.skills = 'Chọn ít nhất một kỹ năng bạn muốn luyện tập.';
  }
  if (step >= 4 && draft.availability.some((window) => !isValidAvailability(window))) {
    errors.availability = 'Kiểm tra lại thời gian bạn đã thêm.';
  }
  return errors;
}

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

function timeToMinutes(value: string): number {
  if (value === '24:00') return 1440;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
