import {auth,onAuthStateChanged,signOut} from './firebase-client.js';
const control=document.querySelector('#home-auth');
if(auth)onAuthStateChanged(auth,user=>{
 control.hidden=false;control.textContent=user?'Log out':'Sign in';
 control.href=user?'#logout':'auth.html';
 control.onclick=async event=>{
  if(!auth.currentUser)return;
  event.preventDefault();
  control.textContent='Logging out…';
  try{await signOut(auth);}catch{control.textContent='Retry log out';}
 };
});else control.hidden=false;
