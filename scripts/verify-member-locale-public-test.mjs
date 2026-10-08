import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Real deployed public frontend/API observations only. No synthetic API adapter.
// Fresh contexts; no account input/submission, auth material inspection or private-user data.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.MEMBER_LOCALE_PLAYWRIGHT_MODULE || 'playwright-core');
const target = new URL(process.env.MEMBER_LOCALE_TARGET_ORIGIN || 'https://cong-dong-ngon-ngu-sigma.vercel.app').origin;
assert.ok(target.startsWith('https://') || new URL(target).protocol === 'http:' && new URL(target).hostname === '127.0.0.1', 'HTTPS TEST origin required');
const output = resolve(process.env.MEMBER_LOCALE_ARTIFACT_DIR || 'artifacts/member-locale-public-test');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless:true, ...(process.env.MEMBER_LOCALE_BROWSER_EXECUTABLE ? { executablePath:process.env.MEMBER_LOCALE_BROWSER_EXECUTABLE } : { channel:process.env.MEMBER_LOCALE_BROWSER_CHANNEL || 'chrome' }) });
const report = {scope:'DEPLOYED_PUBLIC_TEST_NO_SYNTHETIC_ADAPTER',targetOrigin:target,liveAuthenticatedClaim:false,accountSubmissionPerformed:false,privateDataRead:false,checks:[],assets:[],apiResponses:[],blockedMutations:[],pageErrors:[],payment:null,status:'RUNNING'};
const widths=[320,375,390,412,768,1024,1440];
const surfaces=[['login','/login'],['register','/register'],['forgot','/forgot-password'],['reset','/reset-password'],['verify','/verify-email'],['callback','/auth/callback?status=session-expired']];
const record=(name,detail={})=>report.checks.push({name,status:'PASS',...detail});
async function switchLocale(page,locale){
 let selector=page.getByRole('combobox',{name:/Interface language|Ngôn ngữ giao diện/}).filter({visible:true}).first();let drawer=false;
 if(!await selector.count()){await page.getByRole('button',{name:/Open menu|Mở menu/}).first().click();drawer=true;selector=page.getByRole('dialog').getByRole('combobox',{name:/Interface language|Ngôn ngữ giao diện/});}
 await selector.selectOption(locale);assert.equal(await page.locator('html').getAttribute('lang'),locale);
 if(drawer)await page.keyboard.press('Escape');
}
try{
 for(const locale of ['vi','en'])for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:1000},serviceWorkers:'block'});let apiBase=null;
  await context.route('**/*',async route=>{
   const request=route.request();const url=new URL(request.url());const method=request.method();const api=/\/(?:api\/)?v1\//.test(url.pathname);
   const publicGet=api&&method==='GET'&&/\/(auth\/providers|languages|membership\/catalog)$/.test(url.pathname);
   const bootstrap=api&&method==='POST'&&/\/auth\/refresh$/.test(url.pathname)&&!request.postData();
   if((api&&!publicGet&&!bootstrap&&method!=='OPTIONS')||(!['GET','HEAD','OPTIONS'].includes(method)&&!bootstrap)||/\/auth\/oauth\//.test(url.pathname)){
    report.blockedMutations.push({method,path:url.origin+url.pathname});return route.abort();
   }
   return route.continue();
  });
  await context.addInitScript(value=>{if(!localStorage.getItem('congdongngonngu.ui-locale.v1'))localStorage.setItem('congdongngonngu.ui-locale.v1',value);},locale);
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  page.on('response',response=>{
   const url=new URL(response.url());if(/\/(?:api\/)?v1\//.test(url.pathname)){
    report.apiResponses.push({method:response.request().method(),url:url.origin+url.pathname,status:response.status(),source:'ACTUAL_TEST_API'});
    if(url.pathname.endsWith('/auth/providers'))apiBase=url.origin+url.pathname.slice(0,-'/auth/providers'.length);
   }else if(url.pathname.startsWith('/assets/')&&/\.(js|css)$/.test(url.pathname))report.assets.push({url:url.origin+url.pathname,status:response.status(),source:'ACTUAL_DEPLOYED_ASSET'});
  });
  for(const[name,path]of surfaces){
   await page.goto(target+path);await page.locator('#auth-title').waitFor();await page.evaluate(()=>document.fonts.ready);
   const bounds=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,heading:document.querySelector('#auth-title')?.textContent,locale:document.documentElement.lang}));
   assert.ok(bounds.document<=width+1&&bounds.body<=width+1,JSON.stringify({name,locale,width,...bounds}));assert.equal(bounds.locale,locale);
   assert.ok(!/\b(?:auth|onboarding|profile|exchange)\.[a-zA-Z]/.test(await page.locator('main').innerText()),'raw catalog key');record(locale+'-'+name+'-'+width,bounds);
  }
  await page.goto(target+'/login');await page.locator('#auth-title').waitFor();const before=page.url();const next=locale==='vi'?'en':'vi';await switchLocale(page,next);assert.equal(page.url(),before);await page.reload();await page.locator('#auth-title').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),next);record(locale+'-switch-reload-route-'+width);
  await page.goto(target+'/register');await page.locator('#auth-title').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),next);await page.goBack();await page.locator('#auth-title').waitFor();assert.ok(page.url().endsWith('/login'));await page.goForward();await page.locator('#auth-title').waitFor();assert.ok(page.url().endsWith('/register'));record(locale+'-direct-navigation-back-forward-'+width);
  if(!report.payment&&apiBase){
   const response=await context.request.get(apiBase+'/membership/catalog');const body=await response.json();const payment=body.data?.payment;
   report.payment={url:apiBase+'/membership/catalog',status:response.status(),source:'ACTUAL_PUBLIC_TEST_GET',available:payment?.available,qrAvailable:payment?.qrAvailable,provider:payment?.provider};
   assert.ok(response.ok(),'public payment catalog GET failed');assert.equal(payment?.available,false);assert.equal(payment?.qrAvailable,false);assert.equal(payment?.provider,null);record('payment-disabled-public-catalog');
  }
  if(width===320||width===1440)await page.screenshot({path:resolve(output,locale+'-register-'+width+'.png'),fullPage:true});
  await context.close();
 }
 assert.ok(report.payment,'actual public API base/payment catalog not observed');assert.equal(report.pageErrors.length,0,'page errors');assert.equal(report.blockedMutations.length,0,'unexpected forbidden mutation attempted');report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.message;process.exitCode=1;}
finally{report.assets=[...new Map(report.assets.map(item=>[item.url,item])).values()];await writeFile(resolve(output,'runtime-report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({status:report.status,checks:report.checks.length,payment:report.payment,report:resolve(output,'runtime-report.json')}));
