import { Bytes } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { auth, db, firebaseConfigured, doc, getDoc, setDoc, serverTimestamp } from './firebase-client.js';
const avatar=document.querySelector('.profile-avatar');
const panel=document.createElement('div');
panel.className='profile-photo-controls';
panel.innerHTML='<button id="photo-add" type="button" disabled aria-label="Add profile picture">+ Add photo</button><input id="photo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden><p>JPG, PNG or WebP, under 20 KB (20,000 bytes). Once saved, your photo is locked for 365 days.</p><div id="photo-preview" hidden><img alt="New profile picture preview"><button id="photo-save" type="button">Save and lock for one year</button><button id="photo-cancel" type="button">Cancel</button></div><p id="photo-status" role="status" aria-live="polite">Loading photo…</p>';
avatar.after(panel);
const add=panel.querySelector('#photo-add'),fileInput=panel.querySelector('#photo-file'),preview=panel.querySelector('#photo-preview'),save=panel.querySelector('#photo-save'),cancel=panel.querySelector('#photo-cancel'),status=panel.querySelector('#photo-status');
const retry=document.createElement('button');retry.type='button';retry.textContent='Retry loading photo';retry.hidden=true;status.after(retry);
function loadError(error){
 add.disabled=true;retry.hidden=false;
 status.textContent=error?.code==='permission-denied'
  ? 'Photo access was denied. The site’s Firebase photo rules may need updating. Retry after they are deployed.'
  : 'Could not connect to your photo record. Check your connection and retry.';
}
async function loadPhoto(){retry.disabled=true;retry.hidden=true;try{await refresh();}catch(error){loadError(error);}finally{retry.disabled=false;}}
retry.addEventListener('click',loadPhoto);
let pending=null,previewUrl=null,locked=false,busy=false;
function reset(){pending=null;preview.hidden=true;fileInput.value='';preview.querySelector('img').removeAttribute('src');previewUrl=null;}
async function refresh(){
 const snap=await getDoc(doc(db,'profilePhotos',auth.currentUser.uid));
 locked=false;
 if(snap.exists()){
  const data=snap.data();const image=document.createElement('img');image.alt='Your profile picture';image.src=`data:${data.mime};base64,${data.image.toBase64()}`;avatar.replaceChildren(image);
  const next=new Date(data.changedAt.toMillis()+365*24*60*60*1000);locked=Date.now()<next.getTime();
  status.textContent=locked?`Photo locked. You can change it on ${next.toLocaleString()}.`:'You can now update your profile picture.';
  add.textContent='+ Change photo';add.setAttribute('aria-label','Change profile picture');
 }else status.textContent='Choose a photo to preview before saving.';
 add.disabled=locked;
}
add.addEventListener('click',()=>fileInput.click());
cancel.addEventListener('click',()=>{reset();status.textContent='Photo selection cancelled.';});
fileInput.addEventListener('change',async()=>{
 const file=fileInput.files[0];reset();if(!file||locked||busy)return;
 if(file.size===0||file.size>=20000){status.textContent='Choose an image smaller than 20 KB (20,000 bytes).';return;}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)){status.textContent='Choose a JPG, PNG or WebP image.';return;}
 try{
  const bytes=new Uint8Array(await file.arrayBuffer());
  const isPNG=bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
  const isJPEG=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const isWebP=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!(file.type==='image/png'&&isPNG||file.type==='image/jpeg'&&isJPEG||file.type==='image/webp'&&isWebP))throw new Error('Invalid image');
  previewUrl=`data:${file.type};base64,${Bytes.fromUint8Array(bytes).toBase64()}`;const image=preview.querySelector('img');image.src=previewUrl;await image.decode();
  if(image.naturalWidth>4096||image.naturalHeight>4096)throw new Error('Image dimensions too large');
  pending={image:Bytes.fromUint8Array(bytes),mime:file.type};preview.hidden=false;status.textContent='Review your photo. Saving locks it for 365 days.';
 }catch{reset();status.textContent='This image cannot be used. Choose a valid image up to 4096 × 4096 pixels.';}
});
save.addEventListener('click',async()=>{
 if(!pending||locked||busy)return;busy=true;save.disabled=true;cancel.disabled=true;add.disabled=true;status.textContent='Saving photo…';
 try{await setDoc(doc(db,'profilePhotos',auth.currentUser.uid),{...pending,changedAt:serverTimestamp()});reset();await refresh();window.dispatchEvent(new Event('footly-photo-updated'));}
 catch{try{await refresh();if(!locked)status.textContent='Could not save your photo. Please try again.';}catch{status.textContent='Could not save or refresh your photo. Check your connection and reload.';add.disabled=true;}}
 finally{busy=false;save.disabled=false;cancel.disabled=false;}
});
if(firebaseConfigured&&auth?.currentUser){await loadPhoto();}
else status.textContent='Sign in to add a profile picture.';
