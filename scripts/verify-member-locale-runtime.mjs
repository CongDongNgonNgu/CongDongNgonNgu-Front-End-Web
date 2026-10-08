import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startMemberFixtureServer } from './member-locale-fixture-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MEMBER_LOCALE_PLAYWRIGHT_MODULE || 'playwright-core');
const outputDir = resolve(process.env.MEMBER_LOCALE_ARTIFACT_DIR || 'artifacts/member-locale');
await mkdir(outputDir, { recursive: true });
const fixture = await startMemberFixtureServer();
const targetOrigin = process.env.MEMBER_LOCALE_TARGET_ORIGIN ? new URL(process.env.MEMBER_LOCALE_TARGET_ORIGIN).origin : fixture.origin;
const deployed = targetOrigin !== fixture.origin;
const browser = await chromium.launch({ headless: true, ...(process.env.MEMBER_LOCALE_BROWSER_EXECUTABLE ? { executablePath: process.env.MEMBER_LOCALE_BROWSER_EXECUTABLE } : { channel: process.env.MEMBER_LOCALE_BROWSER_CHANNEL || 'chrome' }) });
const report = { scope: deployed ? 'DEPLOYED_FRONTEND_SYNTHETIC_API_ADAPTER' : 'LOCAL_SYNTHETIC_TEST_ONLY', frontendOrigin:targetOrigin, liveAuthBackendProof:false, dedicatedOnly:Boolean(process.env.MEMBER_LOCALE_DEDICATED_ONLY), apiAdapterRequests:[], checks: [], screenshots: [], externalRequests: [], pageErrors: [], expectedHttpErrors: [], startedAt: new Date().toISOString() };
const widths = [320, 375, 390, 412, 768, 1024, 1440];
const record = (name, detail = {}) => report.checks.push({ name, status: 'PASS', ...detail });
const text = (locale, en, vi) => locale === 'en' ? en : vi;
async function newPage(locale, width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const request=route.request(); const url=new URL(request.url());
    if (deployed && (url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/v1/'))) {
      const path=(url.pathname.startsWith('/v1/') ? '/api'+url.pathname : url.pathname)+url.search;
      report.apiAdapterRequests.push({method:request.method(),path});
      const corsHeaders={'access-control-allow-origin':targetOrigin,'access-control-allow-credentials':'true','access-control-allow-methods':'GET, POST, PATCH, DELETE, OPTIONS','access-control-allow-headers':'Content-Type, Authorization, X-CSRF-Token'};
      if(request.method()==='OPTIONS') return route.fulfill({status:204,headers:corsHeaders,body:''});
      // Continuous EventSource uses a bounded synthetic message; never open an upstream stream.
      if(path.endsWith('/notifications/stream')) return route.fulfill({status:200,headers:corsHeaders,contentType:'text/event-stream',body:': SYNTHETIC TEST ONLY\n\n'});
      const response=await context.request.fetch(fixture.origin+path,{method:request.method(),data:request.postData() || undefined,headers:{'content-type':'application/json'}});
      return route.fulfill({response,headers:{...response.headers(),...corsHeaders}});
    }
    if (url.origin !== targetOrigin) {
      report.externalRequests.push(url.origin+url.pathname); return route.abort();
    }
    return route.continue();
  });
  // Only the existing browser UI preference is seeded. No auth material is read.
  await context.addInitScript(locale => { if (!localStorage.getItem('congdongngonngu.ui-locale.v1')) localStorage.setItem('congdongngonngu.ui-locale.v1', locale); }, locale);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.expectedHttpErrors.push({ path: new URL(response.url()).pathname, status: response.status() }); });
  return { context, page };
}
async function layout(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => ({
    viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
    unnamedControls: [...document.querySelectorAll('main input:not([type=hidden]),main select,main textarea')].filter(el => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !(el.labels && el.labels.length)).map(el => el.tagName),
    headings: [...document.querySelectorAll('main h1,main h2')].map(el => el.textContent.trim()),
  }));
  assert.ok(result.document <= result.viewport + 1 && result.body <= result.viewport + 1, name + ': ' + JSON.stringify(result));
  assert.deepEqual(result.unnamedControls, [], name + ' unlabeled form controls');
  assert.ok(result.headings.length, name + ' headings absent');
  const visibleText = await page.locator('main').innerText();
  assert.ok(!/SQL INTERNAL|TEST_ONLY_DO_NOT_DISPLAY/.test(visibleText), name + ' raw error leak');
  assert.ok(!/\b(auth|onboarding|profile|exchange)\.[a-zA-Z][a-zA-Z0-9.]+/.test(visibleText), name + ' raw catalog key');
  const dialogBounds = await page.getByRole('dialog').evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().width > 0).map(el => { const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, width:r.width, viewport:innerWidth }; }));
  for (const bounds of dialogBounds) assert.ok(bounds.left >= -1 && bounds.right <= bounds.viewport + 1, name + ' dialog bounds ' + JSON.stringify(bounds));
  record(name, result);
}
async function snap(page, name) {
  await page.screenshot({ path: resolve(outputDir, name + '.png'), fullPage: true });
  report.screenshots.push(name + '.png');
}

async function longCopyLayout(page,name){
  // A bounded DOM-only stress probe; restore every text node before further interaction.
  await page.evaluate(()=>{
    window.__memberLongCopyNodes=[];
    for(const element of document.querySelectorAll('main label,main button,main h2,main p')){
      for(const node of [...element.childNodes])if(node.nodeType===Node.TEXT_NODE&&node.textContent.trim()){
        window.__memberLongCopyNodes.push([node,node.textContent]);
        node.textContent+=' — extended translated interface text';
      }
    }
  });
  try { await layout(page,name+'-long-copy'); }
  finally {await page.evaluate(()=>{for(const[node,value]of window.__memberLongCopyNodes||[])node.textContent=value;delete window.__memberLongCopyNodes;});}
}
async function goAuth(page, path) {
  await page.goto(targetOrigin + path);
  await page.locator('#auth-title').waitFor();
}
async function switchLocale(page, locale) {
  let selector = page.getByRole('combobox', { name: /Interface language|Ngôn ngữ giao diện/ }).filter({ visible: true }).first();
  let opened = false;
  if (!await selector.count()) {
    await page.getByRole('button', { name: /Open menu|Mở menu/ }).first().click(); opened = true;
    selector = page.getByRole('dialog').getByRole('combobox', { name: /Interface language|Ngôn ngữ giao diện/ });
  }
  await selector.focus(); await selector.selectOption(locale);
  assert.equal(await selector.evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('html').getAttribute('lang'), locale);
  if (opened) await page.keyboard.press('Escape');
}
async function settled(page) {
  await page.locator('main h1,main h2').first().waitFor();
}
try {
  for (const locale of process.env.MEMBER_LOCALE_DEDICATED_ONLY ? [] : ['vi', 'en']) for (const width of widths) {
    const { context, page } = await newPage(locale, width);
    fixture.settings.authenticated = false; fixture.settings.completeProfile = false; fixture.settings.mode = 'normal';
    for (const [name, path] of [
      ['login','/login'],['register','/register'],['recovery','/forgot-password'],
      ['reset-form','/reset-password?token=opaque'],['reset-expired','/reset-password'],
      ['reset-complete','/reset-password?complete=1'],['verify','/verify-email?email=fixture@example.invalid'],
      ['callback-collision','/auth/callback?status=collision'],['callback-expired','/auth/callback?status=expired'],
      ['callback-provider','/auth/callback?status=provider-disabled'],
    ]) {
      await goAuth(page, path); assert.equal(await page.locator('html').getAttribute('lang'), locale);
      await layout(page, locale + '-' + name + '-' + width);
      if(['login','register'].includes(name)) await longCopyLayout(page,locale+'-'+name+'-'+width);
      if ([390,1440].includes(width) && ['login','register','reset-expired'].includes(name)) await snap(page, locale + '-' + name + '-' + width);
    }
    await goAuth(page, '/login?entry=exchange#form');
    const email = page.locator('main input[type=email]');
    await email.fill('learner@example.invalid');
    const password = page.locator('main input[autocomplete=current-password]');
    await password.fill('synthetic private password');
    await page.getByRole('checkbox').check();
    const routeBefore = page.url();
    const requestCount = fixture.requests.length;
    await switchLocale(page, locale === 'en' ? 'vi' : 'en');
    assert.equal(await email.inputValue(), 'learner@example.invalid');
    assert.equal(await password.inputValue(), 'synthetic private password');
    assert.equal(await page.getByRole('checkbox').isChecked(), true);
    assert.equal(page.url(), routeBefore);
    assert.equal(fixture.requests.length, requestCount);
    record(locale + '-login-switch-values-route-no-api-' + width);
    await switchLocale(page, locale);
    await page.getByRole('button', { name: text(locale,/Sign in to your account/,/Đăng nhập vào tài khoản/) }).click();
    await page.getByRole('alert').waitFor();
    await layout(page, locale + '-safe-login-error-' + width);
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    record(locale + '-auth-reload-preference-' + width);

    fixture.settings.authenticated = true;
    fixture.settings.delay = 250;
    await page.goto(targetOrigin + '/onboarding');
    await page.locator('main [aria-busy=true]').first().waitFor();
    record(locale+'-onboarding-loading-'+width);
    fixture.settings.delay = 0;
    await page.getByRole('heading', { name: text(locale,'Which languages do you speak?','Bạn nói ngôn ngữ nào?') }).waitFor();
    await page.getByRole('button', { name: text(locale,/Continue/,/Tiếp tục/) }).click();
    await page.getByRole('alert').waitFor();
    const picker = page.getByRole('combobox', { name: text(locale,'Find and add languages','Tìm và thêm ngôn ngữ') });
    assert.equal(await picker.evaluate(el => el === document.activeElement), true);
    const focusStyle = await picker.evaluate(el => { const c=getComputedStyle(el); const parent=getComputedStyle(el.parentElement); return { outline:c.outlineStyle, outlineWidth:c.outlineWidth, boxShadow:c.boxShadow, wrapperShadow:parent.boxShadow, wrapperBorder:parent.borderColor }; });
    assert.ok(focusStyle.outline !== 'none' || focusStyle.boxShadow !== 'none' || focusStyle.wrapperShadow !== 'none', 'visible picker focus style');
    record(locale + '-visible-keyboard-focus-' + width, focusStyle);
    await layout(page, locale + '-onboarding-validation-' + width);
    const nativeGroup = page.getByRole('group', { name: text(locale,/Native languages/,/Ngôn ngữ bản ngữ/) }).last();
    await nativeGroup.getByRole('button', { name: /Vietnamese|Tiếng Việt/ }).click();
    await layout(page, locale + '-onboarding-native-' + width);
    await longCopyLayout(page,locale+'-onboarding-'+width);
    if ([390,1440].includes(width)) await snap(page, locale + '-onboarding-native-' + width);
    const authenticatedRequests = fixture.requests.length;
    const onboardingRoute = page.url();
    await switchLocale(page, locale === 'en' ? 'vi' : 'en');
    assert.equal(page.url(), onboardingRoute);
    assert.equal(fixture.requests.length, authenticatedRequests);
    await switchLocale(page, locale);
    await page.getByRole('button', { name: text(locale,/Continue/,/Tiếp tục/) }).click();
    const learningGroup = page.getByRole('group', { name: text(locale,'Learning languages','Ngôn ngữ bạn muốn học') }).last();
    await learningGroup.getByRole('button', { name: /English|Tiếng Anh/ }).click();
    await layout(page, locale + '-onboarding-learning-' + width);
    await page.getByRole('button', { name: text(locale,/Continue/,/Tiếp tục/) }).click();
    await page.getByRole('radio', { name: /A1/ }).click();
    await layout(page, locale + '-onboarding-proficiency-' + width);
    await page.getByRole('button', { name: text(locale,/Continue/,/Tiếp tục/) }).click();
    await page.getByRole('button', { name: text(locale,/Confident conversations/,/Giao tiếp/) }).click();
    await page.getByRole('button', { name: text(locale,/Speaking/,/^Nói/) }).click();
    await layout(page, locale + '-onboarding-goals-' + width);
    await page.getByRole('button', { name: text(locale,/Continue/,/Tiếp tục/) }).click();
    await layout(page, locale + '-onboarding-optional-' + width);
    record(locale + '-onboarding-learning-selection-session-independent-' + width);

    fixture.settings.completeProfile = true;
    await page.goto(targetOrigin + '/profile');
    const edit = page.getByRole('button', { name: text(locale,'Edit profile','Chỉnh sửa hồ sơ'), exact: true });
    await edit.waitFor(); await layout(page, locale + '-profile-' + width);
    assert.ok((await page.locator('main').innerText()).includes('UGC giữ nguyên 日本語'));
    await edit.click();
    await page.getByRole('heading', { name: text(locale,'Update your language journey','Cập nhật những điều thuộc về hành trình ngôn ngữ') }).waitFor();
    await layout(page, locale + '-profile-edit-' + width);
    await longCopyLayout(page,locale+'-profile-edit-'+width);
    const levelSelect = page.getByLabel(text(locale,'Self-assessed proficiency','Mức tự đánh giá'), { exact:false }).nth(1);
    const visibilitySelect = page.getByLabel(text(locale,'Profile visibility','Hiển thị trên hồ sơ'), { exact:false }).nth(1);
    await levelSelect.selectOption('C1'); await visibilitySelect.selectOption('PRIVATE');
    const profileRoute = page.url(); const profileRequests = fixture.requests.length;
    await switchLocale(page, locale === 'en' ? 'vi' : 'en');
    assert.equal(await page.locator('main select').nth(2).inputValue(), 'C1');
    assert.equal(await page.locator('main select').nth(3).inputValue(), 'PRIVATE');
    assert.equal(page.url(), profileRoute); assert.equal(fixture.requests.length, profileRequests);
    await switchLocale(page, locale);
    record(locale + '-profile-unsaved-canonical-values-session-switch-' + width);
    if ([390,1440].includes(width)) await snap(page, locale + '-profile-edit-' + width);
    fixture.settings.mode='save-error';
    await page.getByRole('button',{name:text(locale,'Save changes','Lưu thay đổi'),exact:true}).click();
    await page.getByRole('alert').waitFor();
    await layout(page,locale+'-profile-safe-save-error-'+width);
    await switchLocale(page,locale === 'en'?'vi':'en'); await switchLocale(page,locale);
    fixture.settings.mode='normal';
    await page.getByRole('button', { name: text(locale,'Cancel','Hủy'), exact: true }).click();

    fixture.settings.mode = 'normal';
    fixture.settings.delay=250;
    await page.goto(targetOrigin + '/exchange');
    await page.getByRole('status',{name:text(locale,'Loading learning partner suggestions','Đang tải gợi ý học cùng')}).waitFor();
    fixture.settings.delay=0; record(locale+'-exchange-loading-'+width);
    await page.getByRole('article').first().waitFor();
    await layout(page, locale + '-exchange-browse-' + width);
    const reasonText=await page.locator('main').innerText();
    assert.ok(reasonText.includes('TEST Partner 日本語'));
    for(const reason of [
      text(locale,'They can support English; you want to learn English.','Họ có thể hỗ trợ Tiếng Anh; bạn đang muốn học Tiếng Anh.'),
      text(locale,'You can support Vietnamese; they want to learn Vietnamese.','Bạn có thể hỗ trợ Tiếng Việt; họ đang muốn học Tiếng Việt.'),
      text(locale,'Your selected proficiency is compatible','Mức độ bạn chọn tương thích'),
      text(locale,'Compatible timezones.','Múi giờ tương thích.'),
      text(locale,'Suitable learning times overlap.','Có khoảng thời gian học phù hợp.'),
      text(locale,'Shared goals:','Mục tiêu chung:'),
      text(locale,'Shared interests: UGC giữ nguyên 日本語.','Sở thích chung: UGC giữ nguyên 日本語.'),
      text(locale,'Matching details are unavailable.','Chi tiết ghép đôi chưa sẵn sàng.')
    ]) assert.ok(reasonText.includes(reason),locale+' generated reason missing: '+reason);
    assert.ok(!reasonText.includes('Unknown internal reason must not display'));
    record(locale+'-seven-localized-matching-templates-ugc-unknown-safe-'+width);
    const filters = page.locator('main details');
    if (await filters.count() && await filters.locator('summary').isVisible()) await filters.locator('summary').click();
    await layout(page, locale + '-exchange-filters-' + width);
    const offer = page.getByLabel(text(locale,'They can support','Họ có thể hỗ trợ'), { exact:true }).filter({visible:true});
    const want = page.getByLabel(text(locale,'They want to practice','Họ muốn luyện'), { exact:true }).filter({visible:true});
    const goal = page.getByLabel(text(locale,'Shared goals','Mục tiêu chung'), { exact:true }).filter({visible:true});
    await offer.selectOption('en'); await want.selectOption('vi'); await goal.fill('conversation');
    const filterRoute=page.url(); const filterRequestCount=fixture.requests.length;
    await switchLocale(page, locale === 'en' ? 'vi' : 'en');
    assert.equal(page.url(),filterRoute); assert.equal(fixture.requests.length,filterRequestCount);
    await switchLocale(page,locale);
    assert.deepEqual(await offer.evaluate(el => [...el.selectedOptions].map(o=>o.value)),['en']);
    assert.deepEqual(await want.evaluate(el => [...el.selectedOptions].map(o=>o.value)),['vi']);
    assert.equal(await goal.inputValue(),'conversation');
    await page.getByRole('button',{name:text(locale,'Apply filters','Áp dụng bộ lọc'),exact:true}).filter({visible:true}).click();
    await page.getByRole('article').first().waitFor();
    assert.ok(fixture.requests.some(request => request.path.includes('offeredLanguageCodes=en') && request.path.includes('wantedLanguageCodes=vi') && request.path.includes('matchingGoalCodes=conversation')));
    await page.getByRole('article').first().waitFor();
    const canonical=page.url();
    assert.equal(canonical,filterRoute);
    const filteredRequest=fixture.requests.filter(request=>request.path.includes('/exchange/discovery?')).at(-1);
    const filterQuery=new URL(filteredRequest.path,fixture.origin).searchParams;
    assert.equal(filterQuery.get('offeredLanguageCodes'),'en'); assert.equal(filterQuery.get('wantedLanguageCodes'),'vi'); assert.equal(filterQuery.get('matchingGoalCodes'),'conversation');
    assert.ok(!/uiLocale|locale=/.test(canonical));
    await switchLocale(page,locale === 'en'?'vi':'en'); assert.equal(page.url(),canonical); await switchLocale(page,locale);
    await page.goto(targetOrigin+'/exchange/profile/target-1');
    await page.getByRole('heading',{name:'TEST Partner 日本語',exact:true}).waitFor();
    await page.goBack(); await page.getByRole('article').first().waitFor(); assert.equal(page.url(),canonical);
    await page.goForward(); await page.getByRole('heading',{name:'TEST Partner 日本語',exact:true}).waitFor();
    await page.goBack(); await page.getByRole('article').first().waitFor();
    record(locale+'-canonical-filters-back-forward-'+width);
    if ([390,1440].includes(width)) await snap(page, locale + '-exchange-filters-' + width);
    await page.goto(targetOrigin + '/exchange/profile/target-1');
    await page.getByRole('heading', { name: 'TEST Partner 日本語', exact: true }).waitFor();
    await layout(page, locale + '-exchange-detail-' + width);
    await longCopyLayout(page,locale+'-exchange-detail-'+width);
    assert.ok((await page.locator('main').innerText()).includes('UGC giữ nguyên 日本語'));
    await page.getByRole('button', { name: text(locale,'Safety','An toàn'), exact: true }).click();
    await page.getByRole('menuitem', { name: text(locale,'Report profile','Báo cáo hồ sơ') }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.getByRole('button', { name: text(locale,'Submit report','Gửi báo cáo') }).click();
    await dialog.getByRole('alert').waitFor();
    await layout(page, locale + '-report-validation-dialog-' + width);
    if ([390,1440].includes(width)) await snap(page, locale + '-report-dialog-' + width);
    await page.keyboard.press('Escape');
    for (const mode of ['empty','error']) {
      fixture.settings.mode = mode; await page.goto(targetOrigin + '/exchange');
      if (mode === 'empty') await page.getByRole('heading', { name: text(locale,'No suitable partners yet','Chưa có người phù hợp') }).waitFor();
      else await page.getByRole('alert').waitFor();
      await layout(page, locale + '-exchange-' + mode + '-' + width);
    }
    fixture.settings.mode = 'missing'; await page.goto(targetOrigin + '/exchange/profile/target-1');
    await page.getByRole('alert').waitFor();
    await layout(page, locale + '-exchange-missing-' + width);
    await context.close();
  }

  for(const locale of ['vi','en']){
    fixture.resetProfile();fixture.settings.authenticated=false;fixture.settings.completeProfile=false;fixture.settings.mode='login-success';
    const {context,page}=await newPage(locale,1440);
    await goAuth(page,'/login?entry=synthetic');
    await page.locator('main input[type=email]').fill('fixture@example.invalid');
    await page.locator('main input[autocomplete=current-password]').fill('SYNTHETIC password 123');
    await switchLocale(page,locale === 'en'?'vi':'en');
    const chosen=locale === 'en'?'vi':'en';
    const loginBefore=fixture.requests.filter(r=>r.path.endsWith('/auth/login')).length;
    await page.getByRole('button',{name:text(chosen,/Sign in to your account/,/Đăng nhập vào tài khoản/)}).click();
    await page.waitForURL(targetOrigin+'/');
    assert.equal(await page.locator('html').getAttribute('lang'),chosen);
    assert.equal(fixture.requests.filter(r=>r.path.endsWith('/auth/login')).length,loginBefore+1);
    await page.reload();await settled(page);
    assert.equal(await page.locator('html').getAttribute('lang'),chosen);
    await page.getByRole('button',{name:text(chosen,'Log out','Đăng xuất'),exact:true}).first().click();
    await page.getByRole('link',{name:text(chosen,'Log in','Đăng nhập'),exact:true}).first().waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'),chosen);
    assert.equal(fixture.settings.authenticated,false);
    record(locale+'-login-logout-reload-ui-preference-session-independence');
    await switchLocale(page,locale);
    fixture.settings.mode='normal';
    await goAuth(page,'/register');
    await page.locator('main input[autocomplete=name]').fill('SYNTHETIC Member');
    await page.locator('main input[type=email]').fill('member@example.invalid');
    const passwords=page.locator('main input[autocomplete=new-password]');
    await passwords.nth(0).fill('SYNTHETIC password 123');await passwords.nth(1).fill('SYNTHETIC password 123');
    await page.getByRole('checkbox').check();
    const registerRoute=page.url();const beforeRegister=fixture.requests.filter(r=>r.path.endsWith('/auth/register')).length;
    await switchLocale(page,chosen);
    assert.equal(await page.locator('main input[autocomplete=name]').inputValue(),'SYNTHETIC Member');
    assert.equal(await passwords.nth(1).inputValue(),'SYNTHETIC password 123');
    assert.equal(await page.getByRole('checkbox').isChecked(),true);assert.equal(page.url(),registerRoute);
    await page.getByRole('button',{name:text(chosen,/Create member account/,/Tạo tài khoản thành viên/)}).click();
    await page.waitForURL('**/verify-email?email=*');
    assert.equal(fixture.requests.filter(r=>r.path.endsWith('/auth/register')).length,beforeRegister+1);
    const registration=fixture.requests.filter(r=>r.path.endsWith('/auth/register')).at(-1).body;
    assert.equal(registration.displayName,'SYNTHETIC Member');assert.equal(registration.email,'member@example.invalid');
    assert.ok(!Object.hasOwn(registration,'locale'));
    record(locale+'-registration-draft-consent-switch-single-submit-canonical');
    await switchLocale(page,locale);
    await goAuth(page,'/forgot-password');
    const recoveryBefore=fixture.requests.filter(r=>r.path.endsWith('/auth/forgot-password')).length;
    await page.locator('main input[type=email]').fill('unknown@example.invalid');
    await page.getByRole('button',{name:text(locale,/Send recovery link/,/Gửi liên kết khôi phục/)}).click();
    await page.getByRole('heading',{name:text(locale,'Check your inbox','Kiểm tra hòm thư của bạn')}).waitFor();
    assert.equal(fixture.requests.filter(r=>r.path.endsWith('/auth/forgot-password')).length,recoveryBefore+1);
    await switchLocale(page,chosen);
    assert.ok((await page.locator('main').innerText()).includes(text(chosen,'If this email address exists','Nếu địa chỉ email tồn tại')));
    record(locale+'-neutral-recovery-success-no-double-submit');
    await switchLocale(page,locale);
    fixture.settings.authenticated=true;fixture.resetProfile();
    await page.goto(targetOrigin+'/onboarding');
    await page.getByRole('heading',{name:text(locale,'Which languages do you speak?','Bạn nói ngôn ngữ nào?')}).waitFor();
    await page.getByRole('group',{name:text(locale,/Native languages/,/Ngôn ngữ bản ngữ/)}).last().getByRole('button',{name:/Vietnamese|Tiếng Việt/}).click();
    await page.getByRole('button',{name:text(locale,/Continue/,/Tiếp tục/)}).click();
    await page.getByRole('group',{name:text(locale,'Learning languages','Ngôn ngữ bạn muốn học')}).last().getByRole('button',{name:/English|Tiếng Anh/}).click();
    await page.getByRole('button',{name:text(locale,/Continue/,/Tiếp tục/)}).click();
    await page.getByRole('radio',{name:/A1/}).click();
    await page.getByRole('button',{name:text(locale,/Continue/,/Tiếp tục/)}).click();
    await page.getByRole('button',{name:text(locale,/Confident conversations/,/Giao tiếp/)}).click();
    await page.getByRole('button',{name:text(locale,/Speaking/,/^Nói/)}).click();
    await page.getByRole('button',{name:text(locale,/Continue/,/Tiếp tục/)}).click();
    const patchesBefore=fixture.requests.filter(r=>r.method==='PATCH'&&r.path.endsWith('/profile')).length;
    await switchLocale(page,chosen);
    await page.getByRole('button',{name:text(chosen,'Skip this step','Bỏ qua bước này'),exact:true}).click();
    await page.waitForURL(targetOrigin+'/');
    assert.equal(fixture.requests.filter(r=>r.method==='PATCH'&&r.path.endsWith('/profile')).length,patchesBefore+1);
    const onboarding=fixture.requests.filter(r=>r.method==='PATCH'&&r.path.endsWith('/profile')).at(-1).body;
    assert.equal(onboarding.languages.find(l=>l.languageCode==='vi').declaredProficiency,'NATIVE');
    assert.equal(onboarding.languages.find(l=>l.languageCode==='en').declaredProficiency,'A1');
    assert.deepEqual(onboarding.goals,['conversation']);assert.deepEqual(onboarding.skills,['speaking']);
    assert.ok(!Object.hasOwn(onboarding,'locale'));
    record(locale+'-successful-onboarding-canonical-single-patch-after-locale-switch');
    fixture.settings.completeProfile=true;
    await page.goto(targetOrigin+'/profile');
    await page.getByRole('button',{name:text(chosen,'Edit profile','Chỉnh sửa hồ sơ'),exact:true}).click();
    await page.getByLabel(text(chosen,'Self-assessed proficiency','Mức tự đánh giá'),{exact:false}).nth(1).selectOption('C1');
    await page.getByLabel(text(chosen,'Profile visibility','Hiển thị trên hồ sơ'),{exact:false}).nth(1).selectOption('PRIVATE');
    await switchLocale(page,locale);
    const profilePatchBefore=fixture.requests.filter(r=>r.method==='PATCH'&&r.path.endsWith('/profile')).length;
    await page.getByRole('button',{name:text(locale,'Save changes','Lưu thay đổi'),exact:true}).click();
    await page.getByRole('status').filter({hasText:text(locale,'Changes saved','Đã lưu thay đổi')}).waitFor();
    assert.equal(fixture.requests.filter(r=>r.method==='PATCH'&&r.path.endsWith('/profile')).length,profilePatchBefore+1);
    const updated=fixture.requests.filter(r=>r.method==='PATCH'&&r.path.endsWith('/profile')).at(-1).body;
    assert.equal(updated.languages.find(l=>l.languageCode==='en').declaredProficiency,'C1');
    assert.equal(updated.languages.find(l=>l.languageCode==='en').visibility,'PRIVATE');
    assert.ok(!Object.hasOwn(updated,'locale'));assert.ok(updated.interests.includes('UGC giữ nguyên 日本語'));
    record(locale+'-successful-profile-canonical-privacy-patch-after-switch');
    await context.close();
  }
  assert.deepEqual(report.externalRequests, []); assert.deepEqual(report.pageErrors, []);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL'; report.failure = error.stack; process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(outputDir, 'runtime-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, checks: report.checks.length, screenshots: report.screenshots.length, externalRequests: report.externalRequests.length, pageErrors: report.pageErrors.length, failure: report.failure, report: resolve(outputDir,'runtime-report.json') }, null, 2));
  await fixture.close(); await browser.close();
}
