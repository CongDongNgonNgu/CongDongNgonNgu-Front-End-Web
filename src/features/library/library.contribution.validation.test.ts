import { describe, expect, it } from 'vitest';
import { INITIAL_CONTRIBUTION_FORM, type LibraryContributionFormState, type LibraryContributionPolicy } from './library.contribution.types';
import { validateContributionForm } from './library.contribution.validation';
import type { LanguageCatalogItem } from '../languages/languages.types';

const languages: LanguageCatalogItem[] = [
  { code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr', active: true, launch: true, sortOrder: 1 },
  { code: 'en', slug: 'english', nativeName: 'English', englishName: 'English', vietnameseName: 'Tiếng Anh', direction: 'ltr', active: true, launch: true, sortOrder: 2 },
  { code: 'xx', slug: 'inactive', nativeName: 'Inactive', englishName: 'Inactive', vietnameseName: 'Không dùng', direction: 'ltr', active: false, launch: false, sortOrder: 3 },
];

const policy: LibraryContributionPolicy = {
  termsVersion: 'server-v2',
  approvedResourceTypes: ['VOCABULARY', 'SENTENCE', 'TRANSLATION', 'GRAMMAR_ITEM'],
  licenses: [{
    licenseKey: 'CC-BY-4.0',
    displayName: 'CC BY 4.0',
    canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attributionRequired: true,
    redistributionAllowed: true,
    derivativeConstraints: null,
  }],
};

function validForm(overrides: Partial<LibraryContributionFormState> = {}): LibraryContributionFormState {
  return {
    ...INITIAL_CONTRIBUTION_FORM,
    resourceType: 'VOCABULARY',
    primaryLanguageCode: 'vi',
    attribution: 'A contributor',
    licenseKey: 'CC-BY-4.0',
    rightsConfirmed: true,
    reuseConsent: true,
    details: { resourceType: 'VOCABULARY', term: 'xin chào', definition: 'greeting', partOfSpeech: '', exampleSentence: '' },
    ...overrides,
  };
}

describe('community contribution validation', () => {
  it('normalizes supported vocabulary input and takes terms from policy', () => {
    const result = validateContributionForm(validForm({ topicsText: ' Daily Life, giao tiếp ' }), policy, languages);

    expect(result.errors).toEqual({});
    expect(result.snapshot).toMatchObject({
      primaryLanguageCode: 'vi',
      topics: ['daily-life', 'giao-tiếp'],
      termsVersion: 'server-v2',
      rightsConfirmed: true,
      reuseConsent: true,
    });
  });

  it('requires active distinct translation languages and supported content', () => {
    const result = validateContributionForm(validForm({
      resourceType: 'TRANSLATION',
      primaryLanguageCode: 'vi',
      secondaryLanguageCode: 'vi',
      details: { resourceType: 'TRANSLATION', sourceText: 'xin chào', translatedText: '' },
    }), policy, languages);

    expect(result.snapshot).toBeNull();
    expect(result.errors.secondaryLanguageCode).toContain('khác nhau');
    expect(result.errors.translatedText).toBeTruthy();
  });

  it('normalizes sentence content and preserves its optional context', () => {
    const result = validateContributionForm(validForm({
      resourceType: 'SENTENCE',
      details: { resourceType: 'SENTENCE', text: '  I study languages.  ', context: '  Daily practice  ' },
    }), policy, languages);

    expect(result.errors).toEqual({});
    expect(result.snapshot?.details).toEqual({
      resourceType: 'SENTENCE',
      text: 'I study languages.',
      context: 'Daily practice',
    });
  });

  it('fails closed when the license or either exact boolean consent is missing', () => {
    const result = validateContributionForm(validForm({ licenseKey: '', rightsConfirmed: false, reuseConsent: false }), policy, languages);

    expect(result.snapshot).toBeNull();
    expect(result.errors.licenseKey).toBeTruthy();
    expect(result.errors.rightsConfirmed).toBeTruthy();
    expect(result.errors.reuseConsent).toBeTruthy();
  });

  it('rejects inactive languages, unsupported type exposure, and excessive topics', () => {
    const result = validateContributionForm(validForm({
      resourceType: 'VOCABULARY',
      primaryLanguageCode: 'xx',
      topicsText: Array.from({ length: 21 }, (_, index) => `topic-${index}`).join(', '),
    }), policy, languages);

    expect(result.snapshot).toBeNull();
    expect(result.errors.primaryLanguageCode).toBeTruthy();
    expect(result.errors.topics).toContain('20');
  });
});
