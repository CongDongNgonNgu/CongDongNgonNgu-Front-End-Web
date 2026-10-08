import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { startMemberFixtureServer } from './member-locale-fixture-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MEMBER_LOCALE_PLAYWRIGHT_MODULE || 'playwright-core');
const axePath = process.env.MEMBER_LOCALE_AXE_PATH || require.resolve('axe-core/axe.js');
const output = resolve(process.env.MEMBER_LOCALE_A11Y_DIR || 'artifacts/phase24/a11y');
await mkdir(output, { recursive: true });
const fixture = await startMemberFixtureServer();
const targetOrigin = new URL(process.env.MEMBER_LOCALE_TARGET_ORIGIN || fixture.origin).origin;
const approvedApiOrigin = process.env.MEMBER_LOCALE_APPROVED_API_ORIGIN ? new URL(process.env.MEMBER_LOCALE_APPROVED_API_ORIGIN).origin : null;
const browser = await chromium.launch({ headless: true, ...(process.env.MEMBER_LOCALE_BROWSER_EXECUTABLE ? { executablePath: process.env.MEMBER_LOCALE_BROWSER_EXECUTABLE } : { channel: process.env.MEMBER_LOCALE_BROWSER_CHANNEL || 'chrome' }) });
const report = { scope: process.env.MEMBER_LOCALE_TARGET_ORIGIN ? 'DEPLOYED_STATIC_ASSETS_SYNTHETIC_API_ONLY' : 'LOCAL_SYNTHETIC_TEST_ONLY', liveAuthBackendProof: false, fullStackProof: false, screenReaderTested: false, axeLocales: ['vi','en'], axeWidths: [390,1440], targetOrigin, approvedApiOrigin, syntheticApiOrigin: fixture.origin, checks: [], pageErrors: [], externalRequests: [], startedAt: new Date().toISOString() };
const copy = (locale, en, vi) => locale === 'en' ? en : vi;
async function audit(page, name, selector = 'main') {
  await page.evaluate(() => document.fonts.ready);
  if (!await page.evaluate(() => Boolean(window.axe))) await page.addScriptTag({ path: axePath });
  const result = await page.evaluate(async selector => {
    const results = await window.axe.run({ include: [selector] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
    return { violations: results.violations.map(({ id, impact, description, help, nodes }) => ({ id, impact, description, help, nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })) })), incomplete: results.incomplete.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target }) => ({ target })) })), passes: results.passes.length, colorContrast: { rule: 'color-contrast', evaluatedPassNodes: results.passes.find(rule => rule.id === 'color-contrast')?.nodes.length ?? 0, violationNodes: results.violations.find(rule => rule.id === 'color-contrast')?.nodes.length ?? 0, incompleteTargets: (results.incomplete.find(rule => rule.id === 'color-contrast')?.nodes ?? []).map(node => node.target) } };
  }, selector);
  const manualIncomplete = await page.evaluate(({selector, incomplete}) => {
    const luminance = rgb => rgb.map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
    const parse = color => {const m=color.match(/rgba?\(([^)]+)\)/);return m?m[1].split(',').map(Number):null;};
    const observations=[];
    for(const rule of incomplete) for(const node of rule.nodes) {
      const el=document.querySelector(node.target[0]);
      if(!el){observations.push({rule:rule.id,target:node.target,disposition:'NOT_FOUND_REQUIRES_REVIEW'});continue;}
      const css=getComputedStyle(el), attrs=Object.fromEntries([...el.attributes].filter(a=>a.name==='role'||a.name.startsWith('aria-')).map(a=>[a.name,a.value]));
      if(rule.id==='color-contrast') {
        const fg=parse(css.color);let bg=null,ancestor=el;
        while(ancestor){const rgba=parse(getComputedStyle(ancestor).backgroundColor);if(rgba&&(rgba.length===3||rgba[3]===1)){bg=rgba.slice(0,3);break;}ancestor=ancestor.parentElement;}
        const ratio=fg&&bg?(Math.max(luminance(fg.slice(0,3)),luminance(bg))+0.05)/(Math.min(luminance(fg.slice(0,3)),luminance(bg))+0.05):null;
        observations.push({rule:rule.id,target:node.target,tag:el.tagName,foreground:css.color,background:bg,fontSize:css.fontSize,fontWeight:css.fontWeight,ratio:ratio===null?null:Math.round(ratio*100)/100,minimum:4.5,disposition:ratio>=4.5?(el.matches('select')?'CSS_COLOR_SAMPLE_PASS_NATIVE_RENDERING_NOT_CERTIFIED':'CSS_COLOR_SAMPLE_PASS_NOT_PIXEL_CERTIFICATION'):'MANUAL_CONTRAST_REVIEW_REQUIRED',nativeControl:el.matches('select')});
      }else{
        const controls=el.getAttribute('aria-controls');
        observations.push({rule:rule.id,target:node.target,tag:el.tagName,attrs,controlledElementExists:controls?Boolean(document.getElementById(controls)):null,disposition:'SOURCE_AND_DOM_SEMANTICS_REVIEW_REQUIRED'});
      }
    }
    return observations;
  },{selector,incomplete:result.incomplete});
  const labels = await page.locator(selector).evaluate(root => [...root.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(el => el.getBoundingClientRect().width > 0).map(el => ({ tag: el.tagName, type: el.type, label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || [...(el.labels || [])].map(label => label.textContent.trim()).join(' '), invalid: el.getAttribute('aria-invalid'), describedBy: el.getAttribute('aria-describedby'), description: (el.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)?.textContent).filter(Boolean).join(' ') })));
  const entry = { name, status: result.violations.length ? 'FAIL' : 'PASS', ...result, labels, manualIncomplete };
  report.checks.push(entry);
  await writeFile(resolve(output, name + '.json'), JSON.stringify(entry, null, 2));
}
async function tabFocus(page, name, selector = 'main input,main select,main button,main a') {
  const transitions = [];
  let target = null;
  for (let index = 0; index < 80; index++) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(selector => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const css = getComputedStyle(el), r = el.getBoundingClientRect();
      return { tag: el.tagName, label: el.getAttribute('aria-label') || el.textContent.trim().slice(0,100) || [...(el.labels || [])].map(label => label.textContent.trim()).join(' '), target: el.matches(selector), focusVisible: el.matches(':focus-visible'), outlineStyle: css.outlineStyle, outlineWidth: css.outlineWidth, outlineColor: css.outlineColor, boxShadow: css.boxShadow, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width:r.width,height:r.height }, viewport: { width:innerWidth,height:innerHeight } };
    }, selector);
    if (focus) transitions.push(focus);
    if (focus?.target) { target = focus; break; }
  }
  const indicated = target && target.focusVisible && ((target.outlineStyle !== 'none' && parseFloat(target.outlineWidth) > 0) || target.boxShadow !== 'none');
  const within = target && target.rect.left >= -1 && target.rect.right <= target.viewport.width + 1 && target.rect.top >= -1 && target.rect.bottom <= target.viewport.height + 1;
  report.checks.push({ name: name + '-keyboard-tab-focus', status: indicated && within ? 'PASS' : 'FAIL', transitions, indicated, within });
  await page.screenshot({ path: resolve(output, name + '-focus.png'), fullPage: true });
}
async function errorAssociation(page, name, selector) {
  const value = await page.locator(selector).evaluate(el => ({ invalid: el.getAttribute('aria-invalid'), describedBy: el.getAttribute('aria-describedby'), descriptions: (el.getAttribute('aria-describedby') || '').split(' ').map(id => document.getElementById(id)?.textContent).filter(Boolean) }));
  report.checks.push({ name: name + '-validation-association', status: value.invalid === 'true' && value.descriptions.length > 0 ? 'PASS' : 'FAIL', ...value });
}
try {
  for (const locale of ['vi', 'en']) for (const width of [390,1440]) {
    const context = await browser.newContext({ viewport: { width, height:1000 }, serviceWorkers:'block' });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const approvedApiRequest = (url.origin === targetOrigin || url.origin === approvedApiOrigin) && /^\/(?:api\/)?v1\//.test(url.pathname);
      if (targetOrigin !== fixture.origin && approvedApiRequest) {
        // SSE is a bounded synthetic comment, never a live notification connection.
        if (url.pathname.endsWith('/notifications/stream')) return route.fulfill({status:200,contentType:'text/event-stream',body:': SYNTHETIC TEST ONLY\n\n'});
        const response = await route.fetch({ url: fixture.origin + url.pathname.replace(/^\/v1\//, '/api/v1/') + url.search });
        return route.fulfill({ response });
      }
      if (url.origin !== targetOrigin) { report.externalRequests.push(url.toString()); return route.abort(); }
      return route.continue();
    });
    await context.addInitScript(locale => localStorage.setItem('congdongngonngu.ui-locale.v1', locale), locale);
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    fixture.settings.authenticated=false; fixture.settings.completeProfile=false; fixture.settings.mode='normal';
    for (const [name,path] of [['login','/login'],['register','/register'],['reset','/reset-password?token=opaque']]) {
      await page.goto(targetOrigin + path); await page.locator('#auth-title').waitFor();
      await audit(page, locale+'-'+name+'-'+width);
      await tabFocus(page,locale+'-'+name+'-'+width);
    }
    fixture.settings.authenticated=true;
    await page.goto(targetOrigin+'/onboarding');
    await page.getByRole('heading',{name:copy(locale,'Which languages do you speak?','Bạn nói ngôn ngữ nào?')}).waitFor();
    await page.getByRole('button',{name:copy(locale,/Continue/,/Tiếp tục/)}).click();
    await page.getByRole('alert').waitFor();
    await audit(page,locale+'-onboarding-validation-'+width);
    await errorAssociation(page,locale+'-onboarding-'+width,'main input[role=combobox]');
    await tabFocus(page,locale+'-onboarding-'+width);
    fixture.settings.completeProfile=true;
    await page.goto(targetOrigin+'/profile');
    await page.getByRole('button',{name:copy(locale,'Edit profile','Chỉnh sửa hồ sơ'),exact:true}).click();
    await page.getByRole('heading',{name:copy(locale,'Update your language journey','Cập nhật những điều thuộc về hành trình ngôn ngữ')}).waitFor();
    await audit(page,locale+'-profile-editor-'+width);
    await tabFocus(page,locale+'-profile-editor-'+width);
    await page.goto(targetOrigin+'/exchange'); await page.getByRole('article').first().waitFor();
    const disclosure=page.locator('main details');
    if (!await disclosure.evaluate(el=>el.open)) await disclosure.locator('summary').click();
    await audit(page,locale+'-exchange-browse-'+width);
    await tabFocus(page,locale+'-exchange-browse-'+width);
    await page.goto(targetOrigin+'/exchange/profile/target-1');
    await page.getByRole('heading',{name:'TEST Partner 日本語',exact:true}).waitFor();
    await audit(page,locale+'-exchange-detail-'+width);
    await tabFocus(page,locale+'-exchange-detail-'+width);
    await page.getByRole('button',{name:copy(locale,'Safety','An toàn'),exact:true}).click();
    await page.getByRole('menuitem',{name:copy(locale,'Report profile','Báo cáo hồ sơ')}).click();
    const dialog=page.getByRole('dialog'); await dialog.waitFor();
    await page.getByRole('button',{name:copy(locale,'Submit report','Gửi báo cáo')}).click(); await dialog.getByRole('alert').waitFor();
    await audit(page,locale+'-report-dialog-'+width,'[role=dialog]');
    await errorAssociation(page,locale+'-report-dialog-'+width,'[role=dialog] select');
    const bounds=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,labelledBy:el.getAttribute('aria-labelledby'),label:document.getElementById(el.getAttribute('aria-labelledby'))?.textContent};});
    report.checks.push({ name:locale+'-report-dialog-fit-label-'+width,status:bounds.left>=-1&&bounds.right<=bounds.width+1&&bounds.top>=-1&&bounds.bottom<=bounds.height+1&&bounds.label?'PASS':'FAIL',...bounds });
    await tabFocus(page,locale+'-report-dialog-'+width,'[role=dialog] input,[role=dialog] select,[role=dialog] textarea,[role=dialog] button');
    await page.keyboard.press('Escape');
    const returned=await page.evaluate(()=>({tag:document.activeElement?.tagName,label:document.activeElement?.textContent.trim().slice(0,120),inDialog:Boolean(document.activeElement?.closest('[role=dialog]'))}));
    report.checks.push({name:locale+'-report-dialog-escape-focus-return-'+width,status:returned.tag==='BUTTON'&&!returned.inDialog?'PASS':'FAIL',...returned});
    await context.close();
  }
} catch(error) { report.failure=error.stack; }
finally {
  report.status=report.failure||report.checks.some(check=>check.status==='FAIL')||report.pageErrors.length||report.externalRequests.length?'FAIL':'PASS';
  const contrastChecks = report.checks.filter(check => check.colorContrast);
  const incompleteNodes = contrastChecks.flatMap(check => check.colorContrast.incompleteTargets.map(target => ({ surface: check.name, target })));
  report.manualIncompleteObservations = report.checks.flatMap(check => (check.manualIncomplete || []).map(observation => ({surface:check.name,...observation})));
  report.contrastSummary = { locales: report.axeLocales, widths: report.axeWidths, auditedSurfaces: contrastChecks.length, evaluatedPassNodes: contrastChecks.reduce((count,check) => count + check.colorContrast.evaluatedPassNodes,0), violationNodes: contrastChecks.reduce((count,check) => count + check.colorContrast.violationNodes,0), incompleteNodes, certification: incompleteNodes.length ? 'INCOMPLETE_MANUAL_CONTRAST_REVIEW_REQUIRED' : 'AUTOMATED_RULE_ONLY_NOT_FULL_ACCESSIBILITY_CERTIFICATION' };
  report.finishedAt=new Date().toISOString();
  await writeFile(resolve(output,'a11y-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,checks:report.checks.length,failed:report.checks.filter(check=>check.status==='FAIL').map(check=>({name:check.name,violations:check.violations?.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),invalid:check.invalid,descriptions:check.descriptions})),failure:report.failure,contrast:report.contrastSummary,pageErrors:report.pageErrors,externalRequests:report.externalRequests,report:resolve(output,'a11y-report.json')},null,2));
  process.exitCode=report.status==='PASS'?0:1;
  await fixture.close(); await browser.close();
}
