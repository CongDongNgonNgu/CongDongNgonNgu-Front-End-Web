import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/manifest.webmanifest'), 'utf8')) as {
  id: string;
  start_url: string;
  scope: string;
  display: string;
  icons: Array<{ src: string; sizes: string; purpose?: string }>;
  shortcuts?: Array<{ url: string }>;
};

describe('PWA manifest', () => {
  it('declares a stable branded standalone shell', () => {
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: '/favicon.png', sizes: '192x192' }),
      expect.objectContaining({ src: '/brand/congdongngonngu-mark.png', sizes: '512x512' }),
    ]));
  });

  it('limits shortcuts to stable public routes', () => {
    expect(manifest.shortcuts?.map((shortcut) => shortcut.url)).toEqual(['/languages', '/community']);
  });
});
