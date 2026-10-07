import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { catalogs, formatUiDate, formatUiNumber, formatUiRelativeTime, SUPPORTED_UI_LOCALES, translate } from './ui-locale';

const placeholders = (text: string) => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map((match) => match[1]).sort();
describe('static locale catalogs', () => {
  it('covers both approved locales with complete nonempty semantic keys and matching interpolation', () => {
    expect(SUPPORTED_UI_LOCALES).toEqual(['vi', 'en']);
    expect(Object.keys(catalogs.en).sort()).toEqual(Object.keys(catalogs.vi).sort());
    for (const [key, text] of Object.entries(catalogs.vi)) {
      expect(key).toMatch(/^(common|shell|navigation|library|errors)(\.[a-zA-Z][a-zA-Z0-9-]*)+$/);
      expect(text.trim()).not.toBe('');
      const english = catalogs.en[key as keyof typeof catalogs.en];
      expect(english.trim(), key).not.toBe('');
      expect(placeholders(english), key).toEqual(placeholders(text));
    }
  });
  it('detects duplicate keys before object literals can overwrite them', () => {
    const localeKeys: Record<string, string[]> = { vi: [], en: [] };
    for (const domain of ['common', 'shell', 'library', 'errors']) {
      const source = ts.createSourceFile(domain, readFileSync(`src/features/ui-locale/catalogs/${domain}.ts`, 'utf8'), ts.ScriptTarget.Latest, true);
      const visit = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && /^(vi|en)/.test(node.name.text)) {
          const keys: string[] = [];
          const read = (child: ts.Node) => {
            if (ts.isPropertyAssignment(child) && ts.isStringLiteral(child.name)) keys.push(child.name.text);
            ts.forEachChild(child, read);
          };
          if (node.initializer) read(node.initializer);
          expect(new Set(keys).size, node.name.text).toBe(keys.length);
          localeKeys[node.name.text.startsWith('vi') ? 'vi' : 'en'].push(...keys);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    for (const keys of Object.values(localeKeys)) expect(new Set(keys).size).toBe(keys.length);
  });
  it('centralizes number, date, time and relative formatting without changing machine values', () => {
    expect(formatUiNumber('vi', 1234.5)).toBe('1.234,5');
    expect(formatUiNumber('en', 1234.5)).toBe('1,234.5');
    const iso = '2026-10-06T13:05:00Z';
    expect(formatUiDate('en', iso, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })).toBe('October 6, 2026');
    expect(formatUiDate('vi', iso, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })).toContain('tháng 10');
    expect(formatUiDate('en', iso, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })).toBe('13:05');
    expect(formatUiRelativeTime('en', -1, 'day')).toBe('yesterday');
    expect(formatUiRelativeTime('vi', -1, 'day').toLowerCase()).toBe('hôm qua');
    expect(formatUiDate('en', 'not a date')).toBe('Content is unavailable.');
    expect(iso).toBe('2026-10-06T13:05:00Z');
  });
  it('uses grammatical English singular counts and locale number formatting', () => {
    expect(translate('en', 'library.resultsCount', { count: 1 })).toBe('1 result');
    expect(translate('en', 'library.visibleResults', { count: 1 })).toBe('1 result shown');
    expect(translate('en', 'library.resultsCount', { count: 1234 })).toBe('1,234 results');
    expect(translate('vi', 'library.resultsCount', { count: 1234 })).toBe('1.234 kết quả');
  });
});
