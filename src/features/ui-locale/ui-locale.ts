import { enCommon, viCommon } from './catalogs/common';
import { enShell, viShell } from './catalogs/shell';
import { enLibrary, viLibrary } from './catalogs/library';
import { enErrors, viErrors } from './catalogs/errors';

export const SUPPORTED_UI_LOCALES = ['vi', 'en'] as const;
export type UiLocale = typeof SUPPORTED_UI_LOCALES[number];
export const DEFAULT_UI_LOCALE: UiLocale = 'vi';
export const FALLBACK_UI_LOCALE: UiLocale = 'vi';
export const UI_LOCALE_STORAGE_KEY = 'congdongngonngu.ui-locale.v1';
export const localeMetadata = { vi: { name: 'Tiếng Việt', intl: 'vi-VN', direction: 'ltr' }, en: { name: 'English', intl: 'en-US', direction: 'ltr' } } as const;
export const catalogs = {
  vi: { ...viCommon, ...viShell, ...viLibrary, ...viErrors },
  en: { ...enCommon, ...enShell, ...enLibrary, ...enErrors },
};
export type TranslationKey = keyof typeof catalogs.vi;
export type TranslationParams = Readonly<Record<string, string | number>>;
type Catalogs = Record<UiLocale, Readonly<Record<string, string>>>;

export function resolveUiLocale(value: unknown): UiLocale {
  return value === 'en' ? 'en' : DEFAULT_UI_LOCALE;
}
export function readUiLocale(): UiLocale {
  try { return resolveUiLocale(window.localStorage.getItem(UI_LOCALE_STORAGE_KEY)); }
  catch { return DEFAULT_UI_LOCALE; }
}
export function persistUiLocale(locale: UiLocale): void {
  try { window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, locale); }
  catch { /* Storage can be unavailable; the current tab still works. */ }
}

export function translate(locale: UiLocale, key: string, params: TranslationParams = {}, source: Catalogs = catalogs): string {
  const normalizedLocale = resolveUiLocale(locale);
  const plural = typeof params.count === 'number' ? new Intl.PluralRules(localeMetadata[normalizedLocale].intl).select(params.count) : null;
  const read = (catalog: Readonly<Record<string, string>>) => {
    const variant = plural ? `${key}.${plural}` : key;
    if (Object.prototype.hasOwnProperty.call(catalog, variant)) return catalog[variant];
    return Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : undefined;
  };
  const selected = read(source[resolveUiLocale(locale)]);
  const fallback = read(source.vi);
  if (selected === undefined && import.meta.env.DEV) console.warn('Missing UI catalog entry; fallback applied.');
  const template = selected ?? fallback ?? viCommon['common.unavailable'];
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (placeholder, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(params, name)) return placeholder;
    return typeof params[name] === 'number' ? formatUiNumber(normalizedLocale, params[name]) : String(params[name]);
  });
}

export function formatUiNumber(locale: UiLocale, value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(localeMetadata[resolveUiLocale(locale)].intl, options).format(value);
}
export function formatUiDate(locale: UiLocale, value: Date | number | string, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? translate(locale, 'common.unavailable') : new Intl.DateTimeFormat(localeMetadata[resolveUiLocale(locale)].intl, options).format(date);
}
export function formatUiRelativeTime(locale: UiLocale, value: number, unit: Intl.RelativeTimeFormatUnit): string {
  return new Intl.RelativeTimeFormat(localeMetadata[resolveUiLocale(locale)].intl, { numeric: 'auto' }).format(value, unit);
}
