import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
const cloud=process.env.EMULATOR_TEST==='1'||Boolean(process.env.FIRESTORE_EMULATOR_HOST);
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
  await context.addInitScript(()=>{
    window.androidMessages=[];
    window.FootlyAndroid={postMessage(value){
      const message=JSON.parse(value);window.androidMessages.push(message);
      queueMicrotask(()=>window.FootlyAndroid.onmessage?.({data:JSON.stringify({type:'status',enabled:message.type==='enable',message:''})}));
    }};
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/Content Security Policy|Refused to/.test(message.text()))errors.push(message.text())});
  const url='http://127.0.0.1:5173/';
  if(cloud){await page.goto(url+'auth.html?mode=signup');await page.locator('#email').fill(`test-${Date.now()}@example.test`);await page.locator('#password').fill('Local-test-only-892!');await page.locator('#submit').click();await page.waitForURL('**/app.html')}
  if(!cloud)throw new Error('Registered-player flows require EMULATOR_TEST=1 with Auth and Firestore emulators.');
  await page.goto(url);await page.getByRole('link',{name:'Log out',exact:true}).waitFor();
  assert.equal(await page.locator('video.background-video').count(),1);
  assert.equal(await page.locator('video.background-video').evaluate(v=>v.muted&&v.loop&&v.playsInline),true);
  assert.equal(await page.evaluate(()=>window.androidMessages.some(m=>m.type==='session'&&m.uid&&Object.keys(m).sort().join(',')==='type,uid')),true);


  for(let i=0;i<8;i++){
    const response=await fetch('http://127.0.0.1:8080/v1/projects/demo-footly/databases/(default)/documents/registeredPlayers/player-'+i,{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer owner'},body:JSON.stringify({fields:{displayName:{stringValue:'Player '+i}}})});assert(response.ok);
  }
  await page.goto(url+'add-match.html');await page.locator('[data-add="player-0"][data-side="home"]').waitFor();
  await page.locator('#match-home').fill('Home <img src=x onerror=alert(1)>');
  for(let i=0;i<8;i++)await page.locator(`[data-add="player-${i}"][data-side="${i<3?'home':'away'}"]`).click();
  assert.equal(await page.locator('#format-preview').textContent(),'3 vs 5');
  const homeMarker=page.locator('#home-pitch [data-player="player-0"]');await homeMarker.focus();await page.keyboard.press('ArrowLeft');
  await page.locator('#home-roles [data-role-player="player-0"]').selectOption('AMF');
  assert.equal(await homeMarker.locator('small').textContent(),'AMF');
  const awayMarker=page.locator('#away-pitch [data-player="player-3"]');await awayMarker.scrollIntoViewIfNeeded();
  const markerBox=await awayMarker.boundingBox(),pitchBox=await page.locator('#away-pitch').boundingBox();
  await page.mouse.move(markerBox.x+markerBox.width/2,markerBox.y+markerBox.height/2);await page.mouse.down();await page.mouse.move(pitchBox.x+pitchBox.width*.65,pitchBox.y+pitchBox.height*.55,{steps:5});await page.mouse.up();

  assert.equal(await page.locator('[data-add="player-0"]').count(),0);
  await page.locator('#venue').fill('Community pitch');await page.locator('#match-date').fill('2026-10-06T18:30');
  await page.locator('#match-home').focus();await page.evaluate(()=>document.activeElement.blur());
  assert.equal(await page.locator('.selected-player').first().locator('span').nth(1).evaluate(el=>el.getBoundingClientRect().width>60),true);
  await page.evaluate(()=>{window.scrollTo({top:0,behavior:'instant'});document.querySelector('.registered-results').scrollTop=0});
  await page.screenshot({path:'test-results/create-match-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:'test-results/create-match-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});
  await page.locator('#match-submit').click();await page.waitForURL('**/live-scorekeeper.html');await page.getByText('Ready. Select a team and record an event.').waitFor();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('footlyMatch')));
  const homePlacement=saved.players.home.find(p=>p.uid==='player-0');assert.equal(homePlacement.x,47);assert.equal(homePlacement.position,'AMF');
  const awayPlacement=saved.players.away.find(p=>p.uid==='player-3');assert(awayPlacement.x>60&&awayPlacement.x<70);assert(awayPlacement.y>50&&awayPlacement.y<60);
  async function event(side,type,player){await page.locator('#event-side').selectOption(side);await page.locator('#event-type').selectOption(type);await page.locator('#event-player').selectOption(player);await page.locator('#event-note').fill('<img src=x onerror=alert(1)>');await page.locator('#event-form button').click();await page.getByText(cloud?'Saved to your account':'Saved in this browser',{exact:true}).waitFor()}
  await event('home','⚽','player-0');await event('away','⚽','player-3');await event('away','🟨','player-4');await page.locator('[data-score=undo]').click();
  await page.getByText(cloud?'Saved to your account':'Saved in this browser',{exact:true}).waitFor();
  assert.equal(await page.locator('#home-score').textContent(),'1');assert.equal(await page.locator('#away-score').textContent(),'0');assert.equal(await page.locator('#feed .feed-row').count(),2);assert.equal(await page.locator('#feed img').count(),0);
  await page.reload();await page.getByText('Ready. Select a team and record an event.').waitFor();assert.equal(await page.locator('#home-score').textContent(),'1');
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
    await page.getByRole('button',{name:'Enable notifications',exact:true}).click();
    await page.getByRole('button',{name:'Turn off notifications',exact:true}).click();
    await page.getByRole('button',{name:'Enable notifications',exact:true}).waitFor();

    await page.locator('#photo-file').setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(20000)});
    await page.getByText('Choose an image smaller than 20 KB (20,000 bytes).',{exact:true}).waitFor();
    const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=','base64');
    await page.locator('#photo-file').setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:image});
    await page.locator('#photo-preview:not([hidden])').waitFor();await page.locator('#photo-save').click();
    await page.getByText('Photo locked.',{exact:false}).waitFor();assert.equal(await page.locator('#photo-add').isDisabled(),true);
    await page.reload();await page.getByText('Photo locked.',{exact:false}).waitFor();
    assert.equal(await page.locator('.profile-avatar img').evaluate(el=>el.complete&&el.naturalWidth>0),true);
    await page.screenshot({path:'test-results/profile-photo.png',fullPage:true});
    await page.locator('.profile-dot img').waitFor();
    await page.goto(url+'community.html');await page.locator('#post-text').fill('Photo visibility test');await page.locator('#post-submit').click();
    await page.locator('.discussion-post .community-avatar img').waitFor();await page.locator('.profile-dot img').waitFor();
    page.once('dialog',dialog=>dialog.accept());await page.locator('.post-delete').click();await page.getByText('No discussions yet. Start the first one.').waitFor();
    await page.goto(url+'profile.html');

    page.once('dialog',dialog=>dialog.accept());await page.locator('#clear-matches').click();await page.getByText('Match history deleted').waitFor();
    await page.goto(url);await page.getByRole('link',{name:'Log out',exact:true}).click();await page.getByRole('link',{name:'Sign in',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('footlyMatch')),null);
    await page.goto(url);await page.getByRole('link',{name:'Sign in',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.androidMessages.some(m=>m.type==='session'&&m.uid==='')),true);


  }
  assert.deepEqual(errors,[]);console.log('PASS: registered-player 3 vs 5 match creation, both goal sides, cards, undo, persistence, XSS rendering, 10 mobile pages, CSP, browser errors.');
}finally{await browser?.close();server.kill()}
