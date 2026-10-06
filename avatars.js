import {auth,db,firebaseConfigured,doc,getDoc} from './firebase-client.js';
const photos=new Map();
export async function showAvatars(root=document){
 if(!firebaseConfigured||!auth?.currentUser)return;
 await Promise.all([...root.querySelectorAll('[data-avatar-user]')].map(async element=>{
  const uid=element.dataset.avatarUser==='self'?auth.currentUser.uid:element.dataset.avatarUser;
  if(!uid)return;
  try{
   if(!photos.has(uid))photos.set(uid,getDoc(doc(db,'profilePhotos',uid)).catch(error=>{photos.delete(uid);throw error;}));
   const snapshot=await photos.get(uid);if(!snapshot.exists())return;
   const data=snapshot.data();if(!['image/png','image/jpeg','image/webp'].includes(data.mime))return;
   const image=document.createElement('img');image.alt='';image.src=`data:${data.mime};base64,${data.image.toBase64()}`;image.decoding='async';element.replaceChildren(image);
  }catch{/* Keep the initials visible when no photo can be loaded. */}
 }));
}
window.addEventListener('footly-photo-updated',()=>{photos.clear();showAvatars();});
showAvatars();
