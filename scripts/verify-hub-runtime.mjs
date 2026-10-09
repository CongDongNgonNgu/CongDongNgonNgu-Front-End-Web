import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startFixtureServer, fixtureLanguage } from './ui-locale-fixture-server.mjs';

// Isolated mechanics only: no upstream API, database, importer or real session.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.HUB_PLAYWRIGHT_MODULE || 'playwright-core');
const out = resolve(process.env.HUB_ARTIFACT_DIR || 'artifacts/phase25-core');
await mkdir(out, { recursive: true });
const fixture = await startFixtureServer(0);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const report = { scope: 'SYNTHETIC_BROWSER_MECHANICS_ONLY_NOT_CONTENT_READINESS', checks: [], pageErrors: [], externalRequests: [], screenshots: [], fixtureResidual: 0 };
const record = (name, detail = {}) => report.checks.push({ name, status: 'PASS', ...detail });
const coreSections = ['overview', 'vocabulary', 'grammar', 'sentences', 'pronunciation', 'resources', 'community', 'questions', 'practice', 'exchange'];
try {
  for (const locale of ['vi', 'en']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    await context.addInitScript((locale) => localStorage.setItem('congdongngonngu.ui-locale.v1', locale), locale);
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== fixture.origin) { report.externalRequests.push(url.origin); return route.abort(); }
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const respond = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
      if (url.pathname.endsWith('/languages/vietnamese')) return respond(fixtureLanguage);
      if (url.pathname.endsWith('/languages/vietnamese/overview')) return respond({ language: fixtureLanguage, seo: { title: 'TEST Language Hub', description: 'TEST ONLY', canonicalPath: '/languages/vietnamese' }, metrics: { learnerCount: { state: 'NOT_AVAILABLE_YET', value: null }, contributorCount: { state: 'NOT_AVAILABLE_YET', value: null }, resourceCount: { state: 'NOT_AVAILABLE_YET', value: null } }, sections: coreSections.map((key) => ({ key, status: key === 'overview' ? 'AVAILABLE' : 'NOT_IMPLEMENTED', isNavigable: key === 'overview', href: key === 'overview' ? '/languages/vietnamese' : null })), filters: { levels: [], topic: null, levelOptions: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], levelRequired: false, topicState: 'NOT_AVAILABLE_YET' } });
      if (url.pathname.endsWith('/related')) return respond({ items: [], nextCursor: null });
      if (url.pathname.endsWith('/library/resources') && url.searchParams.get('type') === 'SENTENCE') return respond({ items: [], nextCursor: null });
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => report.pageErrors.push(error.message));
    for (const width of [320, 375, 390, 412, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(fixture.origin + '/languages/vietnamese?level=B2&topic=travel');
      const core = page.locator('section[aria-labelledby="resource-preview-heading"]');
      await core.getByRole('link', { name: locale === 'en' ? 'Open Vocabulary in Library' : 'Mở Từ vựng trong Thư viện' }).waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert.equal(geometry.viewport, width);
      assert.ok(geometry.document <= width + 1 && geometry.body <= width + 1, JSON.stringify(geometry));
      const link = core.getByRole('link', { name: locale === 'en' ? 'Open Vocabulary in Library' : 'Mở Từ vựng trong Thư viện' });
      assert.equal(await link.getAttribute('href'), '/library?language=vi&type=VOCABULARY&level=B2&topic=travel');
      await link.focus();
      assert.equal(await link.evaluate((el) => el === document.activeElement), true);
      const file = `${locale}-core-${width}.png`;
      await page.screenshot({ path: resolve(out, file), fullPage: true });
      report.screenshots.push(file);
      record(`${locale}-core-${width}`, geometry);
    }
    const nav = page.getByRole('navigation', { name: locale === 'en' ? 'Language hub sections' : 'Các phần của không gian ngôn ngữ' });
    assert.equal(await nav.getByRole('link').count(), 10);
    assert.equal(await nav.getByRole('button').count(), 0);
    assert.equal(await nav.getByRole('link', {name: locale === 'en' ? 'Community' : 'Cộng đồng', exact: true}).getAttribute('href'), '/community?languageCode=vi');
    assert.equal(await nav.getByRole('link', {name: locale === 'en' ? 'Q&A' : 'Hỏi đáp', exact: true}).getAttribute('href'), '/community/ask/question');
    assert.equal(await nav.getByRole('link', {name: locale === 'en' ? 'Exchange' : 'Trao đổi', exact: true}).getAttribute('href'), '/exchange');
    assert.ok(!(await page.locator('main').innerText()).match(/Sắp có|Coming soon|Chưa khả dụng/));
    for (const [key, name] of [['grammar', locale === 'en' ? 'Grammar' : 'Ngữ pháp'], ['pronunciation', locale === 'en' ? 'Pronunciation' : 'Phát âm'], ['practice', locale === 'en' ? 'Practice' : 'Luyện tập']]) {
      const entry = nav.getByRole('link', {name, exact: true});
      await entry.press('Enter');
      const heading = page.locator('#hub-' + key);
      assert.equal(await heading.evaluate(el => el === document.activeElement), true);
      assert.equal(await entry.getAttribute('aria-current'), 'location');
      await entry.press('Enter');
      assert.equal(await heading.evaluate(el => el === document.activeElement), true);
      record(locale + '-deferred-' + key + '-focus-repeat');
    }
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#hub-pronunciation' && document.activeElement?.id === 'hub-pronunciation');
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#hub-grammar' && document.activeElement?.id === 'hub-grammar');
    await page.goForward();
    await page.waitForFunction(() => location.hash === '#hub-pronunciation' && document.activeElement?.id === 'hub-pronunciation');
    record(locale + '-deferred-history-and-route-contracts');
    await page.getByRole('link', { name: locale === 'en' ? 'Open Vocabulary in Library' : 'Mở Từ vựng trong Thư viện' }).press('Enter');
    await page.getByRole('link', { name: /xin chào/ }).first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('language'), 'vi');
    assert.equal(new URL(page.url()).searchParams.get('level'), 'B2');
    assert.equal(new URL(page.url()).searchParams.get('type'), 'VOCABULARY');
    record(`${locale}-canonical-vocabulary-list`);
    await page.getByRole('link', { name: /xin chào/ }).first().click();
    await page.getByRole('heading', { name: 'xin chào', exact: true }).waitFor();
    assert.ok((await page.locator('main').innerText()).includes('CC BY 4.0'));
    assert.ok((await page.locator('main').innerText()).includes('Synthetic TEST fixture'));
    record(`${locale}-canonical-detail-source-license`);
    await page.goBack();
    await page.getByRole('link', { name: /xin chào/ }).first().waitFor();
    await page.goBack();
    await page.getByRole('link', { name: locale === 'en' ? 'Open Sentences in Library' : 'Mở Mẫu câu trong Thư viện' }).click();
    await page.getByRole('heading', { name: locale === 'en' ? 'No matching resources' : 'Chưa có tài nguyên phù hợp' }).waitFor();
    record(`${locale}-honest-empty-sentences`);
    await context.close();
  }
  assert.deepEqual(report.externalRequests, []);
  assert.deepEqual(report.pageErrors, []);
  report.status = 'PASS';
} finally {
  await browser.close();
  await fixture.close();
  await writeFile(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ status: report.status, checks: report.checks.length, screenshots: report.screenshots.length, errors: report.pageErrors.length, externalRequests: report.externalRequests.length, fixtureResidual: 0 }));
