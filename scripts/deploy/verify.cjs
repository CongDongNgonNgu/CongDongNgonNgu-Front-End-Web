const fs=require('node:fs');
const API='https://api.congdongngonngu.vn/api/v1';
function validArtifact(index,assets){return index.includes('<html')&&assets.some(x=>x.includes(API))&&!assets.some(x=>/https?:\/\/[^\s"'\x60]*\.(?:onrender\.com|vercel\.app)\/api\/v1/.test(x));}
module.exports={validArtifact};
async function main(){
 if(process.argv[2]==='artifact'){
  const path=require('node:path');
  const dir=path.resolve('dist');
  const assets=fs.readdirSync(path.join(dir,'assets')).filter(x=>x.endsWith('.js')).map(x=>fs.readFileSync(path.join(dir,'assets',x),'utf8'));
  if(!validArtifact(fs.readFileSync(path.join(dir,'index.html'),'utf8'),assets))throw Error('Invalid production artifact');
 }else{
  const sha=process.argv[2],rollback=/^rollback:[0-9a-f]{64}$/.test(sha);if(!rollback&&!/^[0-9a-f]{40}$/.test(sha))throw Error('Invalid SHA');
  const get=url=>fetch(url,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10000)});
  const origin='https://congdongngonngu.vn';
  const index=await get(origin+'/?release='+sha);if(index.status!==200)throw Error('Website unavailable');
  if(!rollback){
   const marker=await get(origin+'/cdnn-release.json?release='+sha);
   if(marker.status!==200||(await marker.json()).sha!==sha)throw Error('Wrong deployed revision');
  }
  const www=await get('https://www.congdongngonngu.vn/');
  if(![301,308].includes(www.status)||www.headers.get('location')!==origin+'/')throw Error('Canonical redirect mismatch');
  const html=await index.text();
  if(rollback&&require('node:crypto').createHash('sha256').update(html).digest('hex')!==sha.slice(9))throw Error('Rollback index mismatch');
  const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(x=>new URL(x[1],origin));
  if(!scripts.length||scripts.some(x=>x.origin!==origin))throw Error('Unexpected entry scripts');
  const bodies=await Promise.all(scripts.map(async u=>{const r=await get(u);if(r.status!==200)throw Error('Missing asset');return r.text();}));
  if(!validArtifact(html,bodies))throw Error('Wrong API or assets');
 }
}
if(require.main===module)main().catch(()=>{console.error('Frontend production verification failed');process.exitCode=1;});
