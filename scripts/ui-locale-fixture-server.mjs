import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Local synthetic fixtures only. This server has no upstream or database access.
const root = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
export const fixtureLanguage = { code: 'vi', slug: 'vietnamese', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', vietnameseName: 'Tiếng Việt', direction: 'ltr', active: true, launch: true, sortOrder: 1 };
const license = { licenseKey: 'CC-BY-4.0', displayName: 'CC BY 4.0', canonicalUrl: 'https://creativecommons.org/licenses/by/4.0/', attributionRequired: true, redistributionAllowed: true, derivativeConstraints: null };
export const fixtureResource = {
  id: '11111111-1111-4111-8111-111111111111', resourceType: 'VOCABULARY', primaryLanguageCode: 'vi', secondaryLanguageCode: null, cefrLevel: 'A1', topics: ['daily-life'], reviewState: 'VERIFIED',
  preview: { title: 'xin chào', excerpt: 'Lời chào trong tiếng Việt. TEST ONLY.' },
  details: { resourceType: 'VOCABULARY', term: 'xin chào', definition: 'Lời chào trong tiếng Việt. TEST ONLY.', partOfSpeech: null, exampleSentence: 'Xin chào bạn!' },
  provenance: [{ attribution: 'Synthetic TEST fixture — not user feedback', license, sourceType: 'COMMUNITY', sourceId: 'fixture', sourceUrl: null, originalAuthorReference: null }],
  createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z',
};
export const disabledMembershipCatalog = {
  free: { productCode: 'FREE', planVersion: 1, displayName: 'Free', description: 'TEST ONLY', benefits: [] },
  plans: [{ planVersionId: '33333333-3333-4333-8333-333333333333', productCode: 'COMMUNITY_MEMBER', planVersion: 1, displayName: 'Community Member', description: 'TEST ONLY', benefits: [], price: { id: '44444444-4444-4444-8444-444444444444', code: 'MONTHLY', amountMinor: '125000', currency: 'VND', periodUnit: 'MONTH', periodCount: 1 } }],
  payment: { available: false, qrAvailable: false, provider: null }, evaluatedAt: '2026-10-06T00:00:00Z',
};
export async function startFixtureServer(port = 4178) {
  const requests = [];
  let authenticated = false;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const path = url.pathname;
      if (path.startsWith('/api/')) {
        requests.push({ method: req.method, path: path + url.search });
        const respond = (data, status = 200) => {
          res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
          res.end(JSON.stringify(status >= 400 ? { success: false, error: { code: `HTTP_${status}`, message: 'Internal database detail TEST_ONLY_DO_NOT_DISPLAY' } } : { success: true, data, message: 'TEST ONLY' }));
        };
        if (path.endsWith('/auth/providers')) return respond({ providers: [] });
        if (path.endsWith('/auth/refresh')) return authenticated ? respond({ accessToken: 'TEST_ONLY_NOT_A_REAL_CREDENTIAL', expiresIn: 600, user: { id: '22222222-2222-4222-8222-222222222222', email: 'fixture@example.invalid', displayName: 'TEST Learner', status: 'ACTIVE', emailVerified: true, roles: ['USER'] } }) : respond(null, 403);
        if (path.endsWith('/languages')) return respond([fixtureLanguage, { ...fixtureLanguage, code: 'fr', slug: 'french', nativeName: 'Français', englishName: 'French', vietnameseName: 'Tiếng Pháp', sortOrder: 2 }]);
        if (path.endsWith('/library/resources')) {
          const query = url.searchParams.get('q');
          if (query === 'error') return respond(null, 503);
          if (query === 'limited') return respond(null, 429);
          if (query === 'delay') await new Promise((done) => setTimeout(done, 600));
          return respond({ items: query === 'empty' ? [] : [{ ...fixtureResource, id: url.searchParams.has('cursor') ? 'next-fixture' : fixtureResource.id }], nextCursor: query === 'paged' && !url.searchParams.has('cursor') ? 'fixture-cursor' : null });
        }
        if (path.includes('/library/resources/')) return path.endsWith('/missing') ? respond(null, 404) : path.endsWith('/denied') ? respond(null, 403) : respond(fixtureResource);
        if (path.endsWith('/membership/catalog')) return respond(disabledMembershipCatalog);
        if (path.endsWith('/membership/capabilities')) return respond({ plan: { productCode: 'FREE', version: 1, status: 'ACTIVE' }, membership: { status: 'DEFAULT_FREE', source: 'DEFAULT_FREE', startsAt: null, endsAt: null }, entitlements: [], evaluatedAt: '2026-10-06T00:00:00Z' });
        if (path.endsWith('/membership/contribution-credit')) return respond(null, 503);
        if (path.endsWith('/notifications/preferences')) return respond({ scope: 'own', preferences: [] });
        if (path.endsWith('/notifications')) return respond({ items: [], nextCursor: null, unreadCount: 0 });
        if (path.endsWith('/notifications/stream')) { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.write(': TEST ONLY\n\n'); return; }
        return respond(null, 404);
      }
      if (path === '/sw.js') { res.writeHead(404); res.end(); return; }
      let asset = resolve(root, '.' + decodeURIComponent(path));
      if (asset !== root && !asset.startsWith(root + sep)) { res.writeHead(400); res.end(); return; }
      if (!extname(asset)) asset = resolve(root, 'index.html');
      let body;
      try { body = await readFile(asset); } catch { res.writeHead(404); res.end(); return; }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon' };
      res.writeHead(200, { 'content-type': mime[extname(asset)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); res.end(body);
    } catch { res.writeHead(500); res.end('TEST fixture failure'); }
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', done); });
  return { origin: `http://127.0.0.1:${server.address().port}`, requests, setAuthenticated: (value) => { authenticated = value; }, close: () => new Promise((done) => { server.closeAllConnections(); server.close(done); }) };
}
if (process.argv.includes('--serve-only')) {
  const fixture = await startFixtureServer();
  console.log(`TEST ONLY fixture server ${fixture.origin}`);
  process.on('SIGINT', async () => { await fixture.close(); process.exit(0); });
}
