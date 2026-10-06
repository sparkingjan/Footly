import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/preview.mjs'],{stdio:['ignore','pipe','inherit'],windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const exports=['onAuthStateChanged','signOut','collection','doc','getDoc','getDocs','setDoc','addDoc','updateDoc','deleteDoc','query','where','orderBy','limit','startAfter','onSnapshot','runTransaction','serverTimestamp','requireUser','userDoc','teamDoc'];
 await context.route('**/firebase-client.js',route=>route.fulfill({contentType:'text/javascript',body:`export const firebaseConfigured=false,auth=null,db=null;${exports.map(name=>`export const ${name}=()=>{};`).join('')}`}));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await mkdir('test-results',{recursive:true});
 const url='http://127.0.0.1:5173/';
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('video').currentTime>0);
 await page.waitForTimeout(1200);
 assert.equal(await page.locator('.video-toggle').count(),0);
 assert.equal(await page.locator('.home-copy').evaluate(el=>getComputedStyle(el).textAlign),'right');
 assert.equal(await page.locator('#hero-title').evaluate(el=>getComputedStyle(el).animationName),'home-slide-in');
 await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});
  await page.locator('.home-menu').click();assert.equal(await page.locator('.home-menu').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.home-menu').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===390)await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 assert.equal(await page.locator('video').evaluate(el=>el.paused),true);
 assert.equal(await page.locator('#hero-title').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:390,height:844});
 await page.goto(url+'app.html');await page.locator('.menu-toggle').click();
 assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
 await page.locator('.menu-toggle').click();await page.locator('.rail-nav a[href="team-setup.html"]').click();await page.waitForURL('**/team-setup.html');
 await page.screenshot({path:'test-results/team-mobile.png',fullPage:true});
 for(const file of ['auth.html','features.html','the-game.html','add-match.html','team-setup.html','away-team.html']){
  await page.goto(url+file);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,file);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: video playback, no video button, right alignment, entrance animation, reduced motion, menus, keyboard dismissal, 320/390px layouts.');
}finally{await browser?.close();server.kill()}
