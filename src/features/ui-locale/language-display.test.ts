import { describe, expect, it } from 'vitest';
import { languageDisplayName } from './language-display';

describe('language metadata display', () => {
  it('selects existing localized metadata without changing canonical language identity', () => {
    const language = { code: 'en', englishName: 'English', vietnameseName: 'Tiếng Anh', nativeName: 'English' };
    expect(languageDisplayName(language, 'vi')).toBe('Tiếng Anh');
    expect(languageDisplayName(language, 'en')).toBe('English');
    expect(language.code).toBe('en');
  });
  it('falls back to metadata or code without creating translated domain values', () => {
    expect(languageDisplayName({ code: 'und', englishName: '', vietnameseName: '', nativeName: 'Custom' }, 'en')).toBe('Custom');
    expect(languageDisplayName({ code: 'und', englishName: '', vietnameseName: '' }, 'vi')).toBe('und');
  });
});
