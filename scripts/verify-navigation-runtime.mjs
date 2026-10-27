import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startMemberFixtureServer } from './member-locale-fixture-server.mjs';

// Browser acceptance uses synthetic API responses; never contacts a database or reads credentials.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HEADER_PLAYWRIGHT_MODULE || 'playwright-core');
const out = resolve(process.env.HEADER_ARTIFACT_DIR || 'artifacts/navigation');
await mkdir(out, { recursive: true });
const fixture = await startMemberFixtureServer();
const origin = process.env.HEADER_TARGET_ORIGIN || fixture.origin;
const baseline = process.env.HEADER_BASELINE === '1';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const report = { scope: origin === fixture.origin ? 'LOCAL_SYNTHETIC_API' : 'DEPLOYED_FRONTEND_SYNTHETIC_API', origin, liveBackendAuthProof: false, baseline, layouts: [], checks: [], screenshots: [], errors: [], blockedExternal: [] };
const widths = [320, 375, 390, 412, 768, 1024, 1280, 1440, 1920];
const check = (name) => report.checks.push(name);
async function openContext(locale, authenticated) {
  fixture.settings.authenticated = authenticated;
  fixture.settings.completeProfile = true;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  await context.addInitScript(locale => localStorage.setItem('congdongngonngu.ui-locale.v1', locale), locale);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/v1/')) {
      const path = (url.pathname.startsWith('/v1/') ? '/api' + url.pathname : url.pathname) + url.search;
      const cors = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'access-control-allow-headers': 'Content-Type, Authorization, X-CSRF-Token' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors, body: '' });
      if (path.endsWith('/notifications/stream')) return route.fulfill({ status: 200, headers: cors, contentType: 'text/event-stream', body: ': SYNTHETIC TEST ONLY\n\n' });
      const response = await context.request.fetch(fixture.origin + path, { method: request.method(), data: request.postData() || undefined });
      return route.fulfill({ response, headers: { ...response.headers(), ...cors } });
    }
    if (url.origin !== origin) { report.blockedExternal.push(url.origin + url.pathname); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.setDefaultTimeout(10000);
  return { context, page };
}
async function settled(page, authenticated, locale) {
  const name = authenticated ? (locale === 'vi' ? 'Đăng xuất' : 'Log out') : (locale === 'vi' ? 'Đăng nhập' : 'Log in');
  await page.getByRole(authenticated ? 'button' : 'link', { name, exact: true, includeHidden: true }).first().waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts.ready);
}
async function measure(page, name) {
  const result = await page.evaluate(() => {
    const header = document.querySelector('header[role=banner]');
    const visible = e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0;
    const controls = [...header.querySelectorAll('a,button,select')].filter(visible).filter(e => !e.closest('nav[aria-label="Quick navigation"],nav[aria-label="Điều hướng nhanh"]'));
    const rects = controls.map(e => { const r = e.getBoundingClientRect(); return { name: e.getAttribute('aria-label') || e.textContent.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom }; });
    const h = header.getBoundingClientRect();
    const hero = document.querySelector('main h1')?.getBoundingClientRect();
    return { width: innerWidth, documentWidth: document.documentElement.scrollWidth, headerHeight: h.height, heroTop: hero?.top, rects };
  });
  report.layouts.push({ name, ...result });
  if (!baseline) {
    assert.ok(result.documentWidth <= result.width, name + ' horizontal overflow');
    assert.equal(result.headerHeight, result.width < 768 ? 57 : 73, name + ' header height');
    for (const r of result.rects) assert.ok(r.left >= 0 && r.right <= result.width && r.top >= 0 && r.bottom <= result.headerHeight, name + ' clipped control: ' + JSON.stringify(r));
    if (result.width >= 1024) {
      for (let i = 1; i < result.rects.length; i++) assert.ok(result.rects[i - 1].right <= result.rects[i].left + 1, name + ' overlapping controls');
    }
  }
  return result;
}
async function screenshot(page, name) {
  await page.screenshot({ path: resolve(out, name + '.png') }); report.screenshots.push(name + '.png');
}
try {
  for (const locale of ['vi', 'en']) {
    const anonymous = new Map();
    for (const authenticated of [false, true]) {
      const { context, page } = await openContext(locale, authenticated);
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(origin + '/'); await settled(page, authenticated, locale);
        const name = `${locale}-${authenticated ? 'authenticated' : 'anonymous'}-${width}`;
        const layout = await measure(page, name);
        if (!authenticated) anonymous.set(width, layout);
        else if (!baseline) {
          assert.equal(layout.headerHeight, anonymous.get(width).headerHeight, name + ' auth header shift');
          assert.equal(layout.heroTop, anonymous.get(width).heroTop, name + ' auth hero shift');
        }
        if (locale === 'vi' && [390, 1440].includes(width)) await screenshot(page, name);
        if (!baseline && locale === 'en') {
          const search = page.getByRole('button', { name: 'Search', exact: true }).filter({ visible: true }).first();
          await search.click(); await page.locator('#global-search-panel').waitFor();
          await page.keyboard.press('Escape'); assert.equal(await search.evaluate(e => e === document.activeElement), true);
          if (authenticated && width >= 1024) {
            const bell = page.getByRole('button', { name: 'Notifications', exact: true });
            await bell.click(); await page.locator('#notification-panel').waitFor(); await page.keyboard.press('Escape');
            assert.equal(await bell.evaluate(e => e === document.activeElement), true);
          }
          if (process.env.HEADER_AXE_PATH && [390, 1440].includes(width)) {
            await page.addScriptTag({ path: process.env.HEADER_AXE_PATH });
            const results = await page.evaluate(() => window.axe.run('header[role=banner]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
            assert.deepEqual(results.violations.map(v => ({ id: v.id, nodes: v.nodes.length })), [], name + ' header accessibility');
            check(name + '-axe-header');
          }
        }
        if (!baseline && width < 1024) {
          const trigger = page.getByRole('button', { name: locale === 'vi' ? 'Mở menu' : 'Open menu', exact: true }).first();
          await trigger.click(); const drawer = page.getByRole('dialog'); await drawer.waitFor();
          for (const href of ['/library', '/languages', '/community', ...(authenticated ? ['/community/groups', '/exchange/conversations'] : ['/login', '/register'])]) {
            assert.ok(await drawer.locator(`a[href="${href}"]`).count(), name + ' missing drawer route ' + href);
          }
          await drawer.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
          const bounds = await drawer.boundingBox(); assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, name + ' drawer overflow');
          if (locale === 'en') {
            const selector = drawer.getByRole('combobox');
            await selector.focus(); await selector.selectOption('vi'); await selector.selectOption('en');
            assert.equal(await selector.evaluate(e => e === document.activeElement), true);
          }
          await page.keyboard.press('Escape'); await drawer.waitFor({ state: 'hidden' });
          assert.equal(await trigger.evaluate(e => e === document.activeElement), true);
        }
      }
      if (!baseline && locale === 'en') {
        await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(origin + '/'); await settled(page, authenticated, locale);
        const selector = page.getByRole('banner').getByRole('combobox').filter({ visible: true });
        await selector.focus(); await selector.selectOption('vi'); await selector.selectOption('en');
        assert.equal(await selector.evaluate(e => e === document.activeElement), true);
        const more = page.getByRole('button', { name: 'More', exact: true });
        await more.focus(); await page.keyboard.press('ArrowDown');
        const region = page.getByRole('region', { name: 'More' }); await region.waitFor();
        assert.equal(await region.locator('a').first().evaluate(e => e === document.activeElement), true);
        await page.keyboard.press('End'); assert.equal(await region.locator('a').last().evaluate(e => e === document.activeElement), true);
        await page.keyboard.press('Escape'); assert.equal(await more.evaluate(e => e === document.activeElement), true);
        await more.click(); await page.locator('main h1').click(); await region.waitFor({ state: 'hidden' });
        await more.click(); await region.locator('a[href="/languages"]').click(); await region.waitFor({ state: 'hidden' });
        await page.goBack(); await more.click(); await page.goForward(); await region.waitFor({ state: 'hidden' });
        await page.goto(origin + '/languages'); await more.click(); assert.equal(await region.locator('a[href="/languages"]').getAttribute('aria-current'), 'page'); await page.keyboard.press('Escape');
        if (authenticated) {
          const account = page.getByRole('button', { name: 'TEST Learner Account', exact: true });
          await account.click(); await page.getByRole('region', { name: 'Account' }).waitFor(); await page.keyboard.press('Escape');
          assert.equal(await account.evaluate(e => e === document.activeElement), true);
          for (const href of ['/community/groups', '/exchange/conversations']) {
            await page.goto(origin + href); await settled(page, true, locale);
            assert.equal(await page.getByRole('navigation', { name: 'Primary navigation' }).locator(`a[href="${href}"]`).getAttribute('aria-current'), 'page');
          }
        }
        check(`${authenticated ? 'authenticated' : 'anonymous'}-dropdown-keyboard-outside-route-back-forward-active`);
      }
      await context.close();
    }
  }
  if (!baseline) {
    for (const width of [390, 768, 1024, 1440]) {
      const { context, page } = await openContext('en', false);
      await page.setViewportSize({ width, height: 900 });
      // Hold bootstrap to measure loading and its transition to signed-in on the same home DOM.
      fixture.settings.authenticated = true; fixture.settings.delay = 500;
      await page.goto(origin + '/'); const loading = await measure(page, `loading-${width}`);
      await settled(page, true, 'en'); fixture.settings.delay = 0;
      const signedIn = await measure(page, `bootstrap-authenticated-${width}`);
      assert.equal(loading.heroTop, signedIn.heroTop); assert.equal(loading.headerHeight, signedIn.headerHeight);
      if (width < 1024) await page.getByRole('button', { name: 'Open menu', exact: true }).first().click();
      await page.getByRole('button', { name: 'Log out', exact: true }).filter({ visible: true }).click();
      await settled(page, false, 'en'); const signedOut = await measure(page, `logout-${width}`);
      assert.equal(signedIn.heroTop, signedOut.heroTop); assert.equal(signedIn.headerHeight, signedOut.headerHeight);
      fixture.settings.mode = 'login-success';
      await page.goto(origin + '/login');
      await page.locator('input[type=email]').fill('fixture@example.invalid');
      await page.locator('input[type=password]').fill('Synthetic-only-123!');
      await page.locator('form button[type=submit]').click(); await page.waitForURL(origin + '/'); await settled(page, true, 'en');
      const loggedIn = await measure(page, `login-${width}`); assert.equal(loggedIn.heroTop, signedOut.heroTop); assert.equal(loggedIn.headerHeight, signedOut.headerHeight);
      fixture.settings.mode = 'normal'; check(`loading-login-logout-zero-header-hero-shift-${width}`);
      await context.close();
    }
    assert.deepEqual(report.errors, []); assert.deepEqual(report.blockedExternal, []);
  }
  report.status = 'PASS';
} catch (e) { report.status = 'FAIL'; report.failure = e.stack; throw e; }
finally {
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, measurements: report.layouts.length, checks: report.checks, output: out, failure: report.failure }));
  await browser.close(); await fixture.close();
}
