import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Synthetic local TEST only: no upstream, credentials or database.
const root = resolve(fileURLToPath(new URL('../dist', import.meta.url)));
export const languages = [
{code:'vi',slug:'vietnamese',nativeName:'Tiếng Việt',englishName:'Vietnamese',vietnameseName:'Tiếng Việt',direction:'ltr',active:true,launch:true,sortOrder:1},
{code:'en',slug:'english',nativeName:'English',englishName:'English',vietnameseName:'Tiếng Anh',direction:'ltr',active:true,launch:true,sortOrder:2},
{code:'ja',slug:'japanese',nativeName:'日本語',englishName:'Japanese',vietnameseName:'Tiếng Nhật',direction:'ltr',active:true,launch:true,sortOrder:3}];
const user = {id:'22222222-2222-4222-8222-222222222222',email:'fixture@example.invalid',displayName:'TEST Learner',status:'ACTIVE',emailVerified:true,roles:['MEMBER']};
const baseProfile={scope:'own',user,languages:[],goals:[],skills:[],interests:[],timezone:null,availability:[]};
const profileLanguages=[{...languages[0],roles:['native'],declaredProficiency:'NATIVE',assessedProficiency:null,isPrimaryLearningTarget:false,visibility:'PUBLIC'},{...languages[1],roles:['learning'],declaredProficiency:'B1',assessedProficiency:null,isPrimaryLearningTarget:true,visibility:'PRIVATE'}];
const candidate={user:{id:'target-1',displayName:'TEST Partner 日本語'},languages:[{...languages[1],offered:true,wanted:false,declaredProficiency:'C1',assessedProficiency:null},{...languages[0],offered:false,wanted:true,declaredProficiency:'A1',assessedProficiency:null}],goals:['conversation'],interests:['music','UGC giữ nguyên 日本語'],normalizedScore:0.86,reasons:['Họ có thể hỗ trợ English; bạn đang muốn học English.','Bạn có thể hỗ trợ Vietnamese; họ đang muốn học Vietnamese.','Mức độ bạn chọn tương thích với hồ sơ ngôn ngữ của nhau.','Mục tiêu chung: conversation, reading, community.','Sở thích chung: UGC giữ nguyên 日本語.','Múi giờ tương thích.','Có khoảng thời gian học phù hợp.','Unknown internal reason must not display']};
const relationship={scope:'exchange-relationship',targetUserId:'target-1',state:'NONE',canRequest:true,canAccept:false,canDecline:false,canCancel:false,canDisconnect:false};
export async function startMemberFixtureServer(port=0){
const requests=[];const pendingLoads=[];const settings={authenticated:false,completeProfile:false,mode:'normal',delay:0,holdLoading:false};let currentProfile=structuredClone(baseProfile);
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1');const path=url.pathname;
if(path.startsWith('/api/')){let body='';for await(const chunk of req)body+=chunk;requests.push({method:req.method,path:path+url.search,body:body?JSON.parse(body):null});
const reply=(data,status=200,code='UNKNOWN_TEST_ERROR')=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(status>=400?{success:false,error:{code,message:'SQL INTERNAL TEST_ONLY_DO_NOT_DISPLAY'}}:{success:true,data}));};
if(settings.holdLoading && (path.endsWith('/languages') || path.endsWith('/exchange/discovery')))await new Promise(done=>pendingLoads.push(done));
if(settings.delay)await new Promise(done=>setTimeout(done,settings.delay));
if(path.endsWith('/auth/providers'))return reply({providers:[{provider:'google',enabled:false,reason:'NOT_CONFIGURED'}]});
if(path.endsWith('/auth/refresh'))return settings.authenticated?reply({accessToken:'SYNTHETIC_TEST_ONLY',expiresIn:600,user}):reply(null,403);
if(path.endsWith('/auth/login')){if(settings.mode==='login-success'){settings.authenticated=true;return reply({accessToken:'SYNTHETIC_TEST_ONLY',expiresIn:600,user});}return reply(null,400,settings.mode==='known-error'?'AUTH_INVALID_CREDENTIALS':'UNKNOWN_TEST_ERROR');}
if(path.endsWith('/auth/logout')){settings.authenticated=false;return reply({loggedOut:true});}
if(path.endsWith('/auth/register'))return reply({requiresEmailVerification:true,userId:user.id});
if(['forgot-password','resend-verification','reset-password','verify-email'].some(action=>path.endsWith('/auth/'+action)))return reply({accepted:true});
if(path.endsWith('/languages'))return settings.mode==='catalog-error'?reply(null,503):reply(languages);
if(path.endsWith('/profile')){if(req.method==='PATCH'){if(settings.mode==='save-error')return reply(null,400);const input=JSON.parse(body);currentProfile={...baseProfile,...input,languages:input.languages.map(item=>({...languages.find(l=>l.code===item.languageCode),...item,code:item.languageCode,assessedProficiency:null}))};return reply(currentProfile);}return reply(settings.completeProfile?{...baseProfile,languages:profileLanguages,goals:['conversation'],skills:['speaking'],interests:['UGC giữ nguyên 日本語'],timezone:'Asia/Ho_Chi_Minh'}:currentProfile);}
if(path.includes('/profiles/'))return reply({scope:'public',user:candidate.user,languages:profileLanguages.filter(l=>l.visibility==='PUBLIC'),goals:['conversation'],skills:['speaking'],interests:['UGC giữ nguyên 日本語']});
if(path.endsWith('/exchange/discovery')){if(settings.mode==='error')return reply(null,503);const page=Number(url.searchParams.get('page')||1);return reply({scope:'exchange-discovery',candidates:settings.mode==='empty'?[]:[candidate],pagination:{page,pageSize:6,totalItems:settings.mode==='empty'?0:1,totalPages:settings.mode==='empty'?0:1},filters:Object.fromEntries(url.searchParams)});}
if(path.includes('/exchange/profile-preview/'))return settings.mode==='missing'?reply(null,404):settings.mode==='error'?reply(null,503):reply({...candidate,scope:'exchange-buddy',relationship,timezoneSummary:{visibility:'SUMMARY',hasTimezone:true},availabilitySummary:{visibility:'SUMMARY',hasAvailability:true}});
if(path.includes('/exchange/blocks/'))return reply({scope:'exchange-block-status',targetUserId:'target-1',blockedByMe:false});
if(path.includes('/exchange/relationships/'))return reply(relationship);
if(path.includes('/exchange/contact-permission/'))return reply({scope:'exchange-contact-permission',targetUserId:'target-1',decision:'DENIED_NOT_CONNECTED'});
if(path.endsWith('/learning/progress'))return reply({totalXp:0,currentStreak:0,longestStreak:0,streakTimezone:'Asia/Ho_Chi_Minh',activeDays:[],milestones:[],recentQualifyingActivity:[]});
if(path.endsWith('/reputation/progress'))return reply({communityReputation:0,contributorLevel:{id:'NEWCOMER',title:'Newcomer',minReputation:0,nextLevel:{id:'HELPER',title:'Helper',minReputation:5}},badges:[],activeContributionCount:0});
if(path.endsWith('/notifications/preferences'))return reply({scope:'own',preferences:[]});
if(path.endsWith('/notifications'))return reply({items:[],nextCursor:null,unreadCount:0});
if(path.endsWith('/notifications/stream')){res.writeHead(200,{'content-type':'text/event-stream'});return res.write(': TEST ONLY\n\n');}
return reply(null,404);}
let asset=resolve(root,'.'+decodeURIComponent(path));if(asset!==root&&!asset.startsWith(root+sep)){res.writeHead(400);return res.end();}if(!extname(asset))asset=resolve(root,'index.html');let bytes;try{bytes=await readFile(asset);}catch{res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[extname(asset)]||'application/octet-stream'});res.end(bytes);
}catch{res.writeHead(500);res.end('Synthetic fixture failed');}});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',done);});return{origin:'http://127.0.0.1:'+server.address().port,requests,settings,releaseLoading:()=>{settings.holdLoading=false;for(const done of pendingLoads.splice(0))done();},resetProfile:()=>{currentProfile=structuredClone(baseProfile);},close:()=>new Promise(done=>{server.closeAllConnections();server.close(done);})};}
