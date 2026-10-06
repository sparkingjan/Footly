import { escapeHtml } from './match-core.js';
import { auth, db, firebaseConfigured, requireUser, doc, collection, setDoc, serverTimestamp, teamDoc, getDoc } from './firebase-client.js';
const $=id=>document.getElementById(id),form=$('match-form'),home=$('match-home'),away=$('match-away'),format=$('format'),message=$('match-message');
for(let n=3;n<=11;n++){const option=document.createElement('option');option.value=`${n}-a-side`;option.textContent=`${n}-a-side`;format.append(option)}
const state=()=>JSON.parse(localStorage.getItem('footlyMvp')||'{}');
const teams=()=>{const data=JSON.parse(localStorage.getItem('footlyTeams')||'{}'),app=state();return{home:app.team||data.home,away:app.awayTeam||data.away}};
const lineup=team=>(team?.lineup?.length?team.lineup:team?.players||[]);
function loadTeams(){const data=teams();home.innerHTML=data.home?`<option>${escapeHtml(data.home.name)}</option>`:'<option value="">Create home team first</option>';away.innerHTML=data.away?`<option>${escapeHtml(data.away.name)}</option>`:'<option value="">Create away team first</option>';format.value=data.home?.format||'5-a-side'}
loadTeams();let user=null,busy=false;if(firebaseConfigured)requireUser(async current=>{
  if(!current){location.href='auth.html';return}
  try {
    const snapshot=await getDoc(teamDoc(current.uid)),data=snapshot.data()||{},next=state();
    next.team=data.homeTeam||null;next.awayTeam=data.awayTeam||null;
    localStorage.setItem('footlyMvp',JSON.stringify(next));localStorage.setItem('footlyTeams',JSON.stringify({home:next.team,away:next.awayTeam}));
    loadTeams();user=current;
  } catch(error){console.error(error);message.textContent='Could not load your teams. Reload to retry.'}
});
form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;if(firebaseConfigured&&!user){message.textContent='Wait for sign in before creating a match.';return}const data=teams();if(!data.home||!data.away){message.textContent='Create and save both teams before starting a match.';return}const size=Number(format.value.split('-')[0]);if(lineup(data.home).length!==size||lineup(data.away).length!==size){message.textContent='Both starting lineups must match the selected format. Update your teams first.';return}const match={schemaVersion:2,revision:0,home:home.value,away:away.value,competition:$('competition').value.trim(),venue:$('venue').value.trim(),format:format.value,type:$('match-type').value,date:$('match-date').value,homeScore:0,awayScore:0,minute:1,events:[],players:{home:lineup(data.home),away:lineup(data.away)}};busy=true;form.querySelector('[type=submit]').disabled=true;message.textContent='Saving match…';try{if(user&&db){const ref=doc(collection(db,'matches'));await setDoc(ref,{...match,organizerId:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});match.id=ref.id}const next=state();next.match=match;next.events=[];localStorage.setItem('footlyMvp',JSON.stringify(next));localStorage.setItem('footlyMatch',JSON.stringify(match));message.textContent='Match saved. Opening scorekeeper…';setTimeout(()=>location.href='live-scorekeeper.html',350)}catch(error){console.error(error);busy=false;form.querySelector('[type=submit]').disabled=false;message.textContent='Could not save match. Please try again.'}});
