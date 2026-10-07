import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_UI_LOCALE, formatUiDate, formatUiNumber, formatUiRelativeTime, localeMetadata, persistUiLocale, readUiLocale, resolveUiLocale, translate, type TranslationKey, type TranslationParams, type UiLocale } from './ui-locale';

function makeLocaleValue(locale: UiLocale, setLocale: (value: unknown) => void) {
  return {
    locale, setLocale,
    t: (key: TranslationKey, params?: TranslationParams) => translate(locale, key, params),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatUiNumber(locale, value, options),
    formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => formatUiDate(locale, value, options),
    formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => formatUiRelativeTime(locale, value, unit),
  };
}
// Isolated components/tests retain the existing Vietnamese experience without a provider.
const defaultValue = makeLocaleValue(DEFAULT_UI_LOCALE, () => undefined);
const UiLocaleContext = createContext(defaultValue);
export function UiLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<UiLocale>(readUiLocale);
  const setLocale = useCallback((value: unknown) => {
    const next = resolveUiLocale(value);
    updateLocale(next);
    persistUiLocale(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeMetadata[locale].direction;
  }, [locale]);
  const value = useMemo(() => makeLocaleValue(locale, setLocale), [locale, setLocale]);
  return <UiLocaleContext.Provider value={value}>{children}</UiLocaleContext.Provider>;
}
export function useUiLocale() { return useContext(UiLocaleContext); }
