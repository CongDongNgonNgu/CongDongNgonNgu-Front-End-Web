import type { LanguageCatalogItem } from './onboarding.types';

const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;

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

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
