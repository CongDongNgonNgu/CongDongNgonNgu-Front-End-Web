import { describe, expect, it } from 'vitest';
import {
  buildLanguageHubSearch,
  parseLanguageHubSearch,
} from './language-filters';

describe('language hub URL filters', () => {
  it('parses repeated and comma-separated CEFR levels in canonical order', () => {
    expect(parseLanguageHubSearch('?level=B2,A1&level=A1&topic=  Travel  ')).toEqual({
      levels: ['A1', 'B2'],
      topic: 'travel',
      issue: null,
    });
  });

  it('treats an empty query as an unfiltered overview', () => {
    expect(parseLanguageHubSearch('')).toEqual({
      levels: [],
      topic: null,
      issue: null,
    });
  });

  it('reports malformed filters without throwing or preserving invalid values', () => {
    expect(parseLanguageHubSearch('?level=A1,A7&topic=travel!')).toEqual({
      levels: [],
      topic: null,
      issue: 'invalid',
    });
  });

  it('builds a stable shareable query for selected filters', () => {
    expect(buildLanguageHubSearch({ levels: ['B2', 'A1'], topic: 'Travel' })).toBe(
      '?level=A1%2CB2&topic=travel',
    );
  });
});
