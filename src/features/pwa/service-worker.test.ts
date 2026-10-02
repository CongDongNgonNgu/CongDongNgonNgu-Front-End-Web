import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const serviceWorker = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

describe('service worker safety contract', () => {
  it('keeps private, API, and mutation requests out of caches', () => {
    expect(serviceWorker).toContain("if (request.method !== 'GET') return 'network-only';");
    expect(serviceWorker).toContain("'/api/'");
    expect(serviceWorker).toContain("'/membership'");
    expect(serviceWorker).toContain("'/payments'");
    expect(serviceWorker).toContain("url.search ? 'pass-through' : 'public-navigation'");
    expect(serviceWorker).not.toMatch(/cacheResponse\([^,]+,\s*request,\s*await fetch\(request\)\).*\/api\//s);
  });

  it('only caches same-origin basic responses', () => {
    expect(serviceWorker).toContain("url.origin !== self.location.origin");
    expect(serviceWorker).toContain("response.type === 'basic'");
    expect(serviceWorker).toContain("request.destination === 'image'");
  });
});
