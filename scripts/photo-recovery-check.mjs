import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['scripts/preview.mjs'],{stdio:['ignore','pipe','inherit'],windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage();
 await page.route('**/photo-test.html',route=>route.fulfill({contentType:'text/html',body:'<div class="profile-avatar">F</div><script type="module" src="profile-photo.js"></script>'}));
 await page.route('**/firebase-client.js',route=>route.fulfill({contentType:'text/javascript',body:`export const auth={currentUser:{uid:'test'}},db={},firebaseConfigured=true,doc=()=>({}),setDoc=()=>{},serverTimestamp=()=>{};let attempts=0;export async function getDoc(){if(!attempts++){const e=new Error('Denied');e.code='permission-denied';throw e;}return {exists:()=>false};}`}));
 await page.goto('http://127.0.0.1:5173/photo-test.html');
 await page.getByText('Photo access was denied.',{exact:false}).waitFor();
 assert.equal(await page.locator('#photo-add').isDisabled(),true);
 await page.getByRole('button',{name:'Retry loading photo'}).click();
 await page.getByText('Choose a photo to preview before saving.').waitFor();
 assert.equal(await page.locator('#photo-add').isEnabled(),true);
 const chooser=page.waitForEvent('filechooser');await page.locator('#photo-add').click();await chooser;
 console.log('PASS: denied reads stay disabled, retry recovers, Add photo opens file chooser.');
}finally{await browser?.close();server.kill();}
