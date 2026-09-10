import { describe, expect, it } from 'vitest';
import {
  buildProfileUpdate,
  createInitialDraft,
  filterLanguages,
  getOnboardingCompleteKey,
  getOnboardingStorageKey,
  readOnboardingDraft,
  toggleCode,
  validateDraftForStep,
  writeOnboardingDraft,
} from './onboarding-state';
import type { LanguageCatalogItem, OnboardingDraft } from './onboarding.types';

const languages: LanguageCatalogItem[] = [
  { code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr', active: true, launch: true, sortOrder: 10 },
  { code: 'en', slug: 'english', nativeName: 'English', englishName: 'English', vietnameseName: 'Tiếng Anh', direction: 'ltr', active: true, launch: true, sortOrder: 20 },
  { code: 'ja', slug: 'japanese', nativeName: '日本語', englishName: 'Japanese', vietnameseName: 'Tiếng Nhật', direction: 'ltr', active: true, launch: true, sortOrder: 40 },
  { code: 'ko', slug: 'korean', nativeName: '한국어', englishName: 'Korean', vietnameseName: 'Tiếng Hàn', direction: 'ltr', active: true, launch: true, sortOrder: 50 },
];

describe('onboarding state', () => {
  it('searches Vietnamese, native, English and CJK names without flags', () => {
    expect(filterLanguages(languages, 'viet').map((language) => language.code)).toEqual(['vi']);
    expect(filterLanguages(languages, 'japanese').map((language) => language.code)).toEqual(['ja']);
    expect(filterLanguages(languages, '日本').map((language) => language.code)).toEqual(['ja']);
    expect(filterLanguages(languages, '한국').map((language) => language.code)).toEqual(['ko']);
  });

  it('toggles a language idempotently without duplicate entries', () => {
    expect(toggleCode([], 'en')).toEqual(['en']);
    expect(toggleCode(['en'], 'en')).toEqual([]);
    expect(toggleCode(['en', 'ja'], 'en')).toEqual(['ja']);
    expect(toggleCode(['en', 'ja'], 'zh')).toEqual(['en', 'ja', 'zh']);
  });

  it('builds one backend language relation when roles overlap', () => {
    const draft: OnboardingDraft = {
      ...createInitialDraft(),
      nativeCodes: ['vi'],
      knownCodes: ['en'],
      learningCodes: ['en', 'ja'],
      levels: { en: 'B1', ja: 'A2' },
      goals: ['conversation', 'travel'],
      skills: ['speaking', 'listening'],
      interests: ['music'],
      timezone: 'Asia/Ho_Chi_Minh',
      availability: [{ dayOfWeek: 2, startTime: '19:00', endTime: '20:00' }],
    };

    expect(buildProfileUpdate(draft)).toEqual({
      languages: [
        { languageCode: 'vi', roles: ['native'], declaredProficiency: 'NATIVE' },
        { languageCode: 'en', roles: ['known', 'learning'], declaredProficiency: 'B1', isPrimaryLearningTarget: true },
        { languageCode: 'ja', roles: ['learning'], declaredProficiency: 'A2', isPrimaryLearningTarget: false },
      ],
      goals: ['conversation', 'travel'],
      skills: ['speaking', 'listening'],
      interests: ['music'],
      timezone: 'Asia/Ho_Chi_Minh',
      availability: [{ dayOfWeek: 2, startTime: '19:00', endTime: '20:00' }],
    });
  });

  it('validates only the fields required by each progressive step', () => {
    const draft = createInitialDraft();
    expect(validateDraftForStep(draft, 0)).toMatchObject({ spokenLanguages: expect.any(String) });

    const withLanguages: OnboardingDraft = {
      ...draft,
      nativeCodes: ['vi'],
      learningCodes: ['en'],
    };
    expect(validateDraftForStep(withLanguages, 0)).toEqual({});
    expect(validateDraftForStep(withLanguages, 1)).toEqual({});
    expect(validateDraftForStep(withLanguages, 2)).toMatchObject({ levels: expect.any(String) });

    const withLevel = { ...withLanguages, levels: { en: 'A1' as const } };
    expect(validateDraftForStep(withLevel, 2)).toEqual({});
    expect(validateDraftForStep({ ...withLevel, goals: ['conversation'] }, 3)).toMatchObject({ skills: expect.any(String) });
    expect(validateDraftForStep({ ...withLevel, goals: ['conversation'], skills: ['speaking'] }, 3)).toEqual({});
    expect(validateDraftForStep({ ...withLevel, goals: ['conversation'], skills: ['speaking'] }, 4)).toEqual({});
  });

  it('scopes drafts and completion markers to a user and recovers malformed storage', () => {
    const storage = window.localStorage;
    const userId = 'user-1';
    const draft = { ...createInitialDraft(), step: 2, nativeCodes: ['vi'] };
    writeOnboardingDraft(storage, userId, draft);

    expect(getOnboardingStorageKey(userId)).not.toBe(getOnboardingStorageKey('user-2'));
    expect(readOnboardingDraft(storage, userId)).toMatchObject({ step: 2, nativeCodes: ['vi'] });

    storage.setItem(getOnboardingStorageKey(userId), '{not-json');
    expect(readOnboardingDraft(storage, userId)).toEqual(createInitialDraft());
    expect(getOnboardingCompleteKey(userId)).not.toBe(getOnboardingCompleteKey('user-2'));
  });
});
