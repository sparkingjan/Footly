import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
const cloud=process.env.EMULATOR_TEST==='1';
const server=spawn(process.execPath,['scripts/preview.mjs'],{stdio:['ignore','pipe','inherit'],windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(`Preview exited ${code}`)))});
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844}});
  // Test local feature behavior without touching a real Firebase account.
  const exports=['onAuthStateChanged','signOut','collection','doc','getDoc','getDocs','setDoc','addDoc','updateDoc','deleteDoc','query','where','orderBy','limit','startAfter','onSnapshot','runTransaction','serverTimestamp','requireUser','userDoc','teamDoc'];
  if(cloud){
    let client=await readFile('firebase-client.js','utf8');
    client=client.replace("import { firebaseConfig, firebaseConfigured } from './firebase-config.js';", "const firebaseConfigured=true;const firebaseConfig={apiKey:'demo-key',projectId:'demo-footly',authDomain:'localhost'};");
    client=client.replace('getAuth, onAuthStateChanged','connectAuthEmulator, getAuth, onAuthStateChanged').replace('getFirestore, collection','connectFirestoreEmulator, getFirestore, collection');
    client=client.replace('if (auth) {', "if(auth){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080)}\nif (auth) {");
    await context.route('**/firebase-client.js',route=>route.fulfill({contentType:'text/javascript',body:client}));
  }else await context.route('**/firebase-client.js',route=>route.fulfill({contentType:'text/javascript',body:`export const firebaseConfigured=false,auth=null,db=null;${exports.map(name=>`export const ${name}=()=>{};`).join('')}`}));
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/Content Security Policy|Refused to/.test(message.text()))errors.push(message.text())});
  const url='http://127.0.0.1:5173/';
  if(cloud){await page.goto(url+'auth.html?mode=signup');await page.locator('#email').fill(`test-${Date.now()}@example.test`);await page.locator('#password').fill('Local-test-only-892!');await page.locator('#submit').click();await page.waitForURL('**/app.html')}
  for(const [file,name] of [['team-setup.html','Home <img src=x onerror=alert(1)>'],['away-team.html','Away']]){
    await page.goto(url+file);await page.locator('#team-name').fill(name);await page.locator('#team-format').selectOption('3-a-side');
    await page.locator('#players').fill('Keeper\nStriker\nMidfielder\nSubstitute');await page.locator('#captain').selectOption('Keeper');
    await page.getByRole('button',{name:'Substitute',exact:true}).click();await page.locator('.pitch-player[data-name="Striker"] small').click();
    assert.equal(await page.locator('.pitch-player[data-name="Substitute"]').count(),1);
    await page.locator('.builder-form button[type=submit]').click();await page.getByText('Team saved. You can now create a match.').waitFor();
    await page.reload();await page.locator('.pitch-player[data-name="Substitute"]').waitFor();
    assert.equal(await page.locator('#football-pitch img[onerror]').count(),0);
  }
  await page.goto(url+'add-match.html');await page.locator('#venue').fill('Community pitch');await page.locator('#match-date').fill('2026-10-06T18:30');await page.locator('button[type=submit]').click();await page.waitForURL('**/live-scorekeeper.html');await page.getByText('Ready. Select a team and record an event.').waitFor();
  async function event(side,type,player){await page.locator('#event-side').selectOption(side);await page.locator('#event-type').selectOption(type);await page.locator('#event-player').fill(player);await page.locator('#event-note').fill('<img src=x onerror=alert(1)>');await page.locator('#event-form button').click();await page.getByText(cloud?'Saved to your account':'Saved in this browser',{exact:true}).waitFor()}
  await event('home','⚽','Substitute');await event('away','⚽','Substitute');await event('away','🟨','Keeper');await page.locator('[data-score=undo]').click();
  await page.getByText(cloud?'Saved to your account':'Saved in this browser',{exact:true}).waitFor();
  assert.equal(await page.locator('#home-score').textContent(),'1');assert.equal(await page.locator('#away-score').textContent(),'0');assert.equal(await page.locator('#feed .feed-row').count(),2);assert.equal(await page.locator('#feed img').count(),0);
  await page.reload();await page.locator('#event-form button:enabled').waitFor();assert.equal(await page.locator('#home-score').textContent(),'1');
  await mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/scorekeeper-mobile.png',fullPage:true});
  for(const file of ['app.html','live-matches.html','match-details.html','match-summary.html','match-commentary.html','match-lineups.html','match-stats.html','stats.html','profile.html','community.html']){
    await page.goto(url+file);await page.locator('body').waitFor();await page.waitForTimeout(400);
    assert.equal(await page.locator('body img[onerror]').count(),0,file);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    assert.equal(overflow,false,`${file} overflows mobile viewport`);
  }
  await page.goto(url+'app.html');await page.screenshot({path:'test-results/dashboard-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'test-results/dashboard-desktop.png',fullPage:true});
  if(cloud){
    await page.goto(url+'community.html');await page.locator('#post-text').fill('Test discussion <img src=x onerror=alert(1)>');await page.locator('#post-submit').click();await page.locator('.discussion-post').waitFor();assert.equal(await page.locator('.discussion-post img').count(),0);page.once('dialog',dialog=>dialog.accept());await page.locator('.post-delete').click();await page.getByText('No discussions yet. Start the first one.').waitFor();
    await page.goto(url+'profile.html');await page.locator('#photo-add:enabled').waitFor();
    await page.locator('#photo-file').setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(20000)});
    await page.getByText('Choose an image smaller than 20 KB (20,000 bytes).',{exact:true}).waitFor();
    const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=','base64');
    await page.locator('#photo-file').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:image});
    await page.locator('#photo-preview:not([hidden])').waitFor();await page.locator('#photo-save').click();
    await page.getByText('Photo locked.',{exact:false}).waitFor();assert.equal(await page.locator('#photo-add').isDisabled(),true);
    await page.reload();await page.getByText('Photo locked.',{exact:false}).waitFor();
    assert.equal(await page.locator('.profile-avatar img').evaluate(el=>el.complete&&el.naturalWidth>0),true);
    await page.screenshot({path:'test-results/profile-photo.png',fullPage:true});
    await page.locator('#portal-logout').click();await page.waitForURL('**/auth.html');assert.equal(await page.evaluate(()=>localStorage.getItem('footlyMatch')),null);
  }
  assert.deepEqual(errors,[]);console.log('PASS: team save/reload/substitution, match creation, both goal sides, cards, undo, persistence, XSS rendering, 10 mobile pages, CSP, browser errors.');
}finally{await browser?.close();server.kill()}
