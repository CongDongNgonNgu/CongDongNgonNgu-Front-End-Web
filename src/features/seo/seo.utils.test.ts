import { describe, expect, it } from 'vitest';
import { getSeoDocument } from './seo.utils';

describe('getSeoDocument', () => {
  it('makes public route metadata indexable and canonical', () => {
    const seo = getSeoDocument('/languages/english', '', 'https://example.test');

    expect(seo.robots).toBe('index,follow');
    expect(seo.canonicalPath).toBe('/languages/english');
    expect(seo.structuredData).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'WebPage' }),
      expect.objectContaining({ '@type': 'BreadcrumbList' }),
    ]));
  });

  it('keeps filter and search variants out of the index while preserving a clean canonical', () => {
    const seo = getSeoDocument('/library', '?q=conversation', 'https://example.test');

    expect(seo.robots).toBe('noindex,follow');
    expect(seo.canonicalPath).toBe('/library');
    expect(seo.structuredData).toEqual([]);
  });

  it('excludes private, mutation, and unknown routes from public SEO', () => {
    expect(getSeoDocument('/admin', '', 'https://example.test')).toMatchObject({ robots: 'noindex,nofollow', canonicalPath: null, structuredData: [] });
    expect(getSeoDocument('/community/ask/question', '', 'https://example.test')).toMatchObject({ robots: 'noindex,nofollow', canonicalPath: null, structuredData: [] });
    expect(getSeoDocument('/not-a-route', '', 'https://example.test')).toMatchObject({ robots: 'noindex,nofollow', canonicalPath: null, structuredData: [] });
  });
});
