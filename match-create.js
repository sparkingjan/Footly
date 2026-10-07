import {auth,db,firebaseConfigured,doc,collection,getDoc,getDocs,setDoc,deleteDoc,query,where,orderBy,limit,startAfter,serverTimestamp} from './firebase-client.js';
import {escapeHtml} from './match-core.js';
import {registerPlayer} from './player-directory.js';
import {showAvatars} from './avatars.js';
const $=id=>document.getElementById(id),squads={home:new Map(),away:new Map()},directory=new Map();
let cursor=null,loading=false,busy=false,generation=0,timer;
function render(){
 for(const side of ['home','away'])$(side+'-players').innerHTML=[...squads[side]].map(([uid,player])=>`<div class="selected-player"><span class="community-avatar" data-avatar-user="${escapeHtml(uid)}">F</span><span>${escapeHtml(player.name)}</span><button type="button" data-remove="${escapeHtml(uid)}" data-side="${side}">Remove</button></div>`).join('')||'<p class="directory-help">Choose players below.</p>';
 $('format-preview').textContent=`${squads.home.size} vs ${squads.away.size}`;
 $('registered-results').innerHTML=[...directory].map(([uid,player])=>{const assigned=squads.home.has(uid)?'Home':squads.away.has(uid)?'Away':null;return `<div class="registered-row"><span class="community-avatar" data-avatar-user="${escapeHtml(uid)}">F</span><div class="registered-name">${escapeHtml(player.name)}<small>ID: ${escapeHtml(uid)}</small></div><div class="registered-actions">${assigned?`<span>In ${assigned}</span>`:`<button type="button" data-add="${escapeHtml(uid)}" data-side="home">+ Home</button><button type="button" data-add="${escapeHtml(uid)}" data-side="away">+ Away</button>`}</div></div>`;}).join('');
 $('match-submit').disabled=busy||!squads.home.size||!squads.away.size;showAvatars();
}
async function search(append=false){
 const token=++generation;loading=true;$('load-players').disabled=true;
 if(!append){cursor=null;directory.clear();render();}
 const name=$('player-search').value.trim();$('directory-status').textContent='Loading registered players…';
 try{
  const results=await getDocs(query(collection(db,'registeredPlayers'),orderBy('displayName'),...(name?[where('displayName','>=',name),where('displayName','<=',name+'\uf8ff')]:[]),...(append&&cursor?[startAfter(cursor)]:[]),limit(50)));
  if(token!==generation)return;
  for(const item of results.docs)directory.set(item.id,{name:item.data().displayName});cursor=results.docs.at(-1)||null;
  $('load-players').hidden=results.size<50;$('directory-status').textContent=directory.size?`${directory.size} players shown. Search matches the start of the name, including capitalisation.`:'No registered players found. Try the start of the name, including its capitalisation.';render();
 }catch{if(token===generation)$('directory-status').textContent='Could not load players. Change the search or reload to retry.';}
 finally{if(token===generation){loading=false;$('load-players').disabled=false;}}
}
$('player-search').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>search(),250);});
$('load-players').addEventListener('click',()=>{if(!loading)search(true);});
$('match-form').addEventListener('click',event=>{
 if(busy)return;const add=event.target.closest('[data-add]'),remove=event.target.closest('[data-remove]');
 if(add){const uid=add.dataset.add;if(squads.home.has(uid)||squads.away.has(uid))return;squads[add.dataset.side].set(uid,directory.get(uid));render();}
 if(remove){squads[remove.dataset.side].delete(remove.dataset.remove);render();}
});
$('match-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!auth?.currentUser||!squads.home.size||!squads.away.size)return;
 busy=true;render();$('match-message').textContent='Checking registered players and saving match…';
 const uid=auth.currentUser.uid,ref=doc(collection(db,'matches')),written=[];
 try{
  for(const side of ['home','away'])for(const [playerId] of squads[side]){
   const registered=await getDoc(doc(db,'registeredPlayers',playerId));if(!registered.exists())throw new Error('A selected player is no longer registered. Remove them and try again.');
   const member=doc(db,'users',uid,'matchRosters',ref.id,'players',playerId);
   await setDoc(member,{uid:playerId,name:registered.data().displayName,side});written.push(member);
  }
  const match={schemaVersion:3,rosterId:ref.id,homeCaptainUid:[...squads.home.keys()][0],awayCaptainUid:[...squads.away.keys()][0],revision:0,organizerId:uid,home:$('match-home').value.trim(),away:$('match-away').value.trim(),competition:$('competition').value.trim(),venue:$('venue').value.trim(),format:`${squads.home.size} vs ${squads.away.size}`,type:$('match-type').value.trim(),date:$('match-date').value,homeScore:0,awayScore:0,minute:1,events:[],createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
  await setDoc(ref,match);location.href='live-scorekeeper.html';
 }catch(error){for(const member of written)try{await deleteDoc(member);}catch{}busy=false;render();$('match-message').textContent=error.message||'Could not create this match. Please retry.';}
});
if(firebaseConfigured&&auth?.currentUser){try{await registerPlayer();await search();}catch{$('directory-status').textContent='Could not prepare the player directory. Reload to retry.';}}
else $('directory-status').textContent='Sign in to select registered players.';
render();
