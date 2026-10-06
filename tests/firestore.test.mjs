import test, { before, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, collection, getDocs, query, limit, serverTimestamp, deleteDoc, Bytes, deleteField } from 'firebase/firestore';
const enabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
let env;
before(async () => {
  if (!enabled) return;
  env = await initializeTestEnvironment({projectId:'demo-footly',firestore:{rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')}});
  await env.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await setDoc(doc(db,'matches','match-a'),{organizerId:'alice',home:'Home',away:'Away',homeScore:0,awayScore:0,minute:1,events:[],createdAt:new Date(),revision:0,schemaVersion:2});
    await setDoc(doc(db,'playerStats','stat-a'),{userId:'alice'});
    await setDoc(doc(db,'teams','alice'),{ownerId:'alice',homeTeam:null});
  });
});
after(async()=>{await env?.clearFirestore();await env?.cleanup()});
test('cross-account reads, event injection, ownership changes and stat takeover are denied',{skip:!enabled},async()=>{
  const alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore();
  await assertFails(getDoc(doc(bob,'matches','match-a')));
  await assertFails(setDoc(doc(bob,'matches','match-a','events','injected'),{organizerId:'bob'}));
  await assertFails(updateDoc(doc(alice,'matches','match-a'),{organizerId:'bob'}));
  await assertFails(updateDoc(doc(bob,'playerStats','stat-a'),{userId:'bob'}));
  await assertFails(updateDoc(doc(alice,'teams','alice'),{ownerId:'bob'}));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'teams','alice')));
  await assertFails(updateDoc(doc(alice,'teams','alice'),{homeTeam:{name:'Bad roster',captain:'A',players:Array(51).fill('A'),lineup:[]}}));
});
test('owner can atomically score and undo with a monotonically increasing revision',{skip:!enabled},async()=>{
  const db=env.authenticatedContext('alice').firestore(),ref=doc(db,'matches','match-a');
  await assertSucceeds(updateDoc(ref,{homeScore:1,events:[{type:'goal',side:'home'}],revision:1}));
  await assertFails(updateDoc(ref,{homeScore:2,revision:1}));
  await assertSucceeds(updateDoc(ref,{homeScore:0,events:[],revision:2}));
  await assertFails(updateDoc(ref,{homeScore:-1,revision:3}));
});
test('community text and query limits are enforced',{skip:!enabled},async()=>{
  const db=env.authenticatedContext('alice').firestore();
  const post={text:'Hello',authorId:'alice',authorName:'Alice',createdAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(db,'communityPosts','valid'),post));
  await assertFails(setDoc(doc(db,'communityPosts','long'),{...post,text:'x'.repeat(2001)}));
  await assertFails(getDocs(collection(db,'communityPosts')));
  await assertSucceeds(getDocs(query(collection(db,'communityPosts'),limit(50))));
  await assertFails(deleteDoc(doc(env.authenticatedContext('bob').firestore(),'communityPosts','valid')));
});

test('profile photos enforce owner, size, trusted timestamp and annual lock',{skip:!enabled},async()=>{
 const db=env.authenticatedContext('photo-owner').firestore(), ref=doc(db,'profilePhotos','photo-owner');
 const photo={image:Bytes.fromUint8Array(new Uint8Array([1,2,3])),mime:'image/png',changedAt:serverTimestamp()};
 await assertFails(setDoc(ref,{...photo,image:Bytes.fromUint8Array(new Uint8Array(20000))}));
 await assertFails(setDoc(ref,{...photo,mime:'image/svg+xml'}));
 await assertFails(setDoc(ref,{...photo,changedAt:new Date(0)}));
 await assertSucceeds(setDoc(ref,photo));
 await assertFails(setDoc(ref,photo));
 await assertFails(updateDoc(ref,{changedAt:new Date(0)}));
 await assertFails(updateDoc(ref,{image:deleteField()}));
 await assertFails(deleteDoc(ref));
 await assertSucceeds(getDoc(doc(env.authenticatedContext('bob').firestore(),'profilePhotos','photo-owner')));
 await assertFails(getDocs(collection(db,'profilePhotos')));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'profilePhotos','photo-owner')));
 await assertFails(setDoc(doc(env.authenticatedContext('bob').firestore(),'profilePhotos','photo-owner'),photo));
 await env.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore(),'profilePhotos','photo-owner'),{changedAt:new Date(Date.now()-364*86400000)})});
 await assertFails(setDoc(ref,photo));
 await env.withSecurityRulesDisabled(async context=>{await updateDoc(doc(context.firestore(),'profilePhotos','photo-owner'),{changedAt:new Date(Date.now()-366*86400000)})});
 await assertSucceeds(setDoc(ref,{...photo,image:Bytes.fromUint8Array(new Uint8Array(19999))}));
 await assertFails(setDoc(ref,photo));
});
