import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
test('public SEO uses the production domain and private pages opt out of indexing',async()=>{
 const publicPages=['index.html','features.html','the-game.html'];
 const titles=new Set();
 for(const file of (await readdir('public')).filter(name=>name.endsWith('.html'))){
  const html=await readFile('public/'+file,'utf8');
  if(publicPages.includes(file)){
   const title=html.match(/<title>(.*?)<\/title>/)[1];assert(!titles.has(title));titles.add(title);
   assert.match(html,/<meta name="description" content="[^"]{60,200}">/);
   assert.match(html,/<link rel="canonical" href="https:\/\/footlysj.vercel.app\//);
   assert.match(html,/property="og:image" content="https:\/\/footlysj.vercel.app\/social-preview.png"/);
  }else assert.match(html,/<meta name="robots" content="noindex,follow">/,file);
 }
 const sitemap=await readFile('public/sitemap.xml','utf8');assert.equal((sitemap.match(/<loc>/g)||[]).length,3);assert(!sitemap.includes('profile.html'));
 assert.match(await readFile('public/robots.txt','utf8'),/Sitemap: https:\/\/footlysj.vercel.app\/sitemap.xml/);
 const png=await readFile('public/social-preview.png');assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
});
