import {auth,db,firebaseConfigured,doc,getDoc,setDoc} from './firebase-client.js';
export async function registerPlayer(){
 if(!firebaseConfigured||!auth?.currentUser)return;
 const user=auth.currentUser,ref=doc(db,'registeredPlayers',user.uid);
 const profile=await getDoc(doc(db,'users',user.uid));
 const displayName=String(profile.data()?.displayName||user.displayName||'Player').trim().slice(0,100)||'Player';
 const old=await getDoc(ref);if(old.exists()&&old.data().displayName===displayName)return;
 await setDoc(ref,{displayName});
}
