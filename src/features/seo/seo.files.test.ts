import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const robots = readFileSync(resolve(process.cwd(), 'public/robots.txt'), 'utf8');
const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');

describe('public SEO files', () => {
  it('publishes the sitemap while excluding private and mutation routes', () => {
    expect(robots).toContain('Sitemap: https://cong-dong-ngon-ngu-sigma.vercel.app/sitemap.xml');
    expect(robots).toContain('Disallow: /api/');
    expect(robots).toContain('Disallow: /membership');
    expect(robots).toContain('Disallow: /community/ask');
  });

  it('keeps the sitemap limited to stable public entry points', () => {
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('https://cong-dong-ngon-ngu-sigma.vercel.app/languages');
    expect(sitemap).not.toContain('/admin');
    expect(sitemap).not.toContain('/membership');
  });
});
