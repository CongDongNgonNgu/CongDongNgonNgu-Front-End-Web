import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startFixtureServer, fixtureResource } from './ui-locale-fixture-server.mjs';

// Optional existing browser tooling; no application/runtime dependency is added.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.UI_LOCALE_PLAYWRIGHT_MODULE || 'playwright-core');
const outputDir = resolve(process.env.UI_LOCALE_ARTIFACT_DIR || 'artifacts/ui-locale');
await mkdir(outputDir, { recursive: true });
const fixture = await startFixtureServer(0);
const browser = await chromium.launch({ headless: true });
const report = { scope: 'LOCAL_SYNTHETIC_TEST_ONLY', externalRequests: [], pageErrors: [], checks: [], screenshots: [], expectedFixtureHttpErrors: [], startedAt: new Date().toISOString() };
const key = 'congdongngonngu.ui-locale.v1';
async function contextFor(locale, storedValue = locale) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== fixture.origin) { report.externalRequests.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  if (storedValue !== null) await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key, value: storedValue });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) report.expectedFixtureHttpErrors.push({ path: new URL(response.url()).pathname, status: response.status() }); });
  return { context, page };
}
const record = (name, detail = {}) => report.checks.push({ name, status: 'PASS', ...detail });
const waitLibrary = (page) => page.getByRole('link', { name: /xin chào/ }).first().waitFor();
async function overflow(page) {
  return page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, offenders: [...document.querySelectorAll('header,nav,main,footer,select,button,input')].filter((element) => { const rect = element.getBoundingClientRect(); return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1); }).slice(0, 8).map((element) => element.tagName + ':' + (element.textContent || '').slice(0, 70)) }));
}
async function assertLayout(page, name) {
  const layout = await overflow(page);
  assert.ok(layout.document <= layout.viewport + 1 && layout.body <= layout.viewport + 1, `${name}: ${JSON.stringify(layout)}`);
  record(name, layout);
}
async function switchLocale(page, locale) {
  const selector = page.getByRole('combobox', { name: /UI language|Interface language|Ngôn ngữ giao diện/ }).filter({ visible: true }).first();
  await selector.focus();
  await selector.selectOption(locale);
  assert.equal(await page.locator('html').getAttribute('lang'), locale);
  assert.equal(await page.locator('html').getAttribute('dir'), 'ltr');
  assert.equal(await selector.inputValue(), locale);
  assert.equal(await selector.evaluate((element) => element === document.activeElement), true);
  return selector;
}
async function snapshot(page, name) {
  await page.screenshot({ path: resolve(outputDir, name + '.png'), fullPage: true });
  report.screenshots.push(name + '.png');
}
try {
  for (const locale of ['vi', 'en']) {
    const { context, page } = await contextFor(locale);
    for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(fixture.origin + '/library?language=vi&type=VOCABULARY#results');
      await waitLibrary(page);
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      await assertLayout(page, `${locale}-browse-${width}`);
      const text = await page.locator('main').innerText();
      assert.ok(text.includes(locale === 'en' ? 'Verified resources' : 'Tài nguyên đã xác minh'));
      if (width < 1024) {
        const filters = page.getByRole('button', { name: locale === 'en' ? /^Filters/ : /^Bộ lọc/ });
        if (await filters.isVisible()) {
          await filters.click();
          const dialog = page.getByRole('dialog');
          await dialog.waitFor();
          assert.equal(await dialog.getByRole('combobox', { name: locale === 'en' ? 'Content language' : 'Ngôn ngữ' }).inputValue(), 'vi');
          await assertLayout(page, `${locale}-filters-${width}`);
          await page.keyboard.press('Escape');
          assert.equal(await filters.evaluate((element) => element === document.activeElement), true);
        }
      }
      await page.getByRole('link', { name: /xin chào/ }).first().click();
      await page.getByRole('heading', { name: 'xin chào', exact: true }).waitFor();
      assert.equal(await page.getByRole('heading', { name: 'xin chào', exact: true }).getAttribute('lang'), 'vi');
      assert.ok((await page.locator('main').innerText()).includes('Lời chào trong tiếng Việt. TEST ONLY.'));
      await assertLayout(page, `${locale}-detail-${width}`);
      if ([390, 1440].includes(width)) await snapshot(page, `${locale}-detail-${width}`);
      for (const query of ['empty', 'error']) {
        await page.goto(fixture.origin + `/library?q=${query}&language=vi`);
        await page.getByRole('heading', { name: query === 'empty' ? (locale === 'en' ? 'No matching resources' : 'Chưa có tài nguyên phù hợp') : (locale === 'en' ? 'Could not load the Library' : 'Không thể tải thư viện') }).waitFor();
        assert.ok(!(await page.locator('main').innerText()).includes('TEST_ONLY_DO_NOT_DISPLAY'));
        await assertLayout(page, `${locale}-${query}-${width}`);
      }
    }
    await page.goto(fixture.origin + '/library?language=vi'); await waitLibrary(page);
    await snapshot(page, `${locale}-browse-1440`);
    await page.goto(fixture.origin + '/library?q=delay&language=vi');
    await page.getByRole('status', { name: locale === 'en' ? 'Loading the Library' : 'Đang tải thư viện' }).waitFor();
    await waitLibrary(page);
    record(`${locale}-localized-loading-recovers`);
    const search = page.getByRole('searchbox', { name: locale === 'en' ? 'Search the Library' : 'Tìm trong thư viện' });
    await search.fill('xin chào'); await search.press('Enter'); await waitLibrary(page);
    assert.equal(new URL(page.url()).searchParams.get('q'), 'xin chào');
    assert.equal(new URL(page.url()).searchParams.get('language'), 'vi');
    record(`${locale}-search-content-language-stable`);
    await page.goto(fixture.origin + '/library?q=paged'); await waitLibrary(page);
    await page.getByRole('button', { name: locale === 'en' ? 'Load more resources' : 'Xem thêm tài nguyên' }).click();
    await page.waitForFunction(() => [...document.querySelectorAll('main a')].filter((a) => a.textContent.includes('xin chào')).length >= 2);
    record(`${locale}-pagination`);
    await page.goto(fixture.origin + '/library?q=limited');
    await page.getByText(locale === 'en' ? 'Too many requests. Please try again in a few minutes.' : 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.').waitFor();
    record(`${locale}-safe-rate-error`);
    for (const id of ['missing', 'denied']) {
      await page.goto(fixture.origin + '/library/' + id);
      await page.getByRole('heading', { name: locale === 'en' ? 'Resource unavailable' : 'Tài nguyên không khả dụng' }).waitFor();
      assert.ok(!(await page.locator('main').innerText()).includes('TEST_ONLY_DO_NOT_DISPLAY'));
      record(`${locale}-safe-${id}`);
    }
    await context.close();
  }
  const { context, page } = await contextFor('vi', null);
  await page.goto(fixture.origin + '/library?language=fr&q=xin#results'); await waitLibrary(page);
  assert.equal(await page.locator('html').getAttribute('lang'), 'vi'); record('default-vi-no-browser-inference');
  const urlBefore = page.url(); const requestCount = fixture.requests.length;
  const selector = await switchLocale(page, 'en');
  await selector.focus(); await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  assert.equal(page.url(), urlBefore); assert.equal(fixture.requests.length, requestCount);
  record('switch-route-hash-filter-no-api-mutation-keyboard');
  await page.reload(); await waitLibrary(page); assert.equal(await page.locator('html').getAttribute('lang'), 'en'); record('reload-persistence');
  await page.getByRole('link', { name: /xin chào/ }).first().click(); await page.getByRole('heading', { name: 'xin chào', exact: true }).waitFor();
  const direct = page.url(); await page.reload(); await page.getByRole('heading', { name: 'xin chào', exact: true }).waitFor(); assert.equal(page.url(), direct); record('direct-detail-url');
  await page.goBack(); await waitLibrary(page); assert.equal(page.url(), urlBefore);
  await page.goForward(); await page.getByRole('heading', { name: 'xin chào', exact: true }).waitFor(); record('back-forward');
  await switchLocale(page, 'vi'); assert.equal(page.url(), direct); record('switch-back-vi-content-unchanged');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mở menu', exact: true }).first().click();
  const drawer = page.getByRole('dialog'); await drawer.waitFor();
  const mobileSelector = drawer.getByRole('combobox', { name: /Interface language|Ngôn ngữ giao diện/ });
  await mobileSelector.focus(); await mobileSelector.selectOption('en');
  assert.equal(await mobileSelector.evaluate((element) => element === document.activeElement), true);
  assert.ok(await drawer.isVisible()); await assertLayout(page, 'mobile-locale-menu');
  await page.keyboard.press('Escape'); record('mobile-menu-switch-focus-escape');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menu').waitFor(); await page.keyboard.press('Escape'); record('desktop-menu-keyboard');
  // TEST-only long-copy stress. No pseudo-locale is exposed by the product.
  for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await page.goto(fixture.origin + '/library'); await waitLibrary(page);
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('header nav a, main button, main label, footer h3')) {
        for (const node of [...element.childNodes]) if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) node.textContent += ' — extended translated interface text';
      }
    });
    await assertLayout(page, `long-copy-${width}`);
  }
  await snapshot(page, 'en-long-copy-1440');
  await context.close();
  const invalid = await contextFor('vi', '../../en');
  await invalid.page.goto(fixture.origin + '/library'); await waitLibrary(invalid.page);
  assert.equal(await invalid.page.locator('html').getAttribute('lang'), 'vi'); record('invalid-stored-value-fallback'); await invalid.context.close();
  fixture.setAuthenticated(true);
  const signedIn = await contextFor('vi');
  await signedIn.page.goto(fixture.origin + '/library?language=vi'); await waitLibrary(signedIn.page);
  await signedIn.page.getByRole('button', { name: /Tài khoản/ }).first().waitFor();
  const signedInRequests = fixture.requests.length;
  await switchLocale(signedIn.page, 'en');
  await signedIn.page.getByRole('button', { name: /Account/ }).first().waitFor();
  assert.equal(fixture.requests.length, signedInRequests); record('authenticated-session-stable-no-refresh-or-write');
  await signedIn.page.goto(fixture.origin + '/membership');
  await signedIn.page.getByRole('button', { name: 'Thanh toán QR chưa mở' }).waitFor();
  assert.equal(await signedIn.page.getByRole('button', { name: /Thanh toán QR/ }).isEnabled(), false);
  record('payment-remains-disabled-with-en-shell');
  await signedIn.context.close();
  assert.deepEqual(report.externalRequests, []); assert.deepEqual(report.pageErrors, []);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(outputDir, 'runtime-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, screenshots: report.screenshots.length, externalRequests: report.externalRequests.length, pageErrors: report.pageErrors.length, failure: report.failure, report: resolve(outputDir, 'runtime-report.json') }, null, 2));
  await browser.close(); await fixture.close();
}
