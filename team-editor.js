import { auth, db, firebaseConfigured, teamDoc, getDoc, setDoc, serverTimestamp } from './firebase-client.js';
import { escapeHtml } from './match-core.js';
const side = document.body.dataset.teamSide === 'away' ? 'away' : 'home';
const $ = id => document.getElementById(id);
const form = document.querySelector('.builder-form'), pitch = $('football-pitch'), pool = $('player-pool'), message = $('builder-message');
const positions = ['GK','LB','CB','RB','LWB','RWB','DMF','CMF','LMF','RMF','AMF','LWF','RWF','SS','CF'];
let team = null, lineup = [], selectedBench = null, busy = false, ready = !firebaseConfigured;
const roster = () => [...new Set($('players').value.split('\n').map(name => name.trim()).filter(Boolean))];
const roleAt = (x,y) => y > 80 ? 'GK' : y > 60 ? 'CB' : y > 35 ? 'CMF' : 'CF';
const point = index => index === 0 ? {x:50,y:88,position:'GK'} : index === 1 ? {x:50,y:18,position:'CF'} : index === 2 ? {x:50,y:48,position:'CMF'} : {x:18+(index-3)%4*21,y:76-Math.floor((index-3)/4)*25,position:'CB'};
for (let n=3;n<=11;n++) $('team-format').add(new Option(`${n}-a-side`,`${n}-a-side`));
function capture() {
  lineup = [...pitch.querySelectorAll('.pitch-player')].map(player => ({name:player.dataset.name,x:parseFloat(player.style.left),y:parseFloat(player.style.top),position:player.querySelector('select').value}));
}
function render() {
  const names = roster(), size = Number($('team-format').value.split('-')[0]);
  lineup = lineup.filter(player => names.includes(player.name)).slice(0,size);
  for (const name of names) if (lineup.length<size && !lineup.some(p=>p.name===name)) lineup.push({name,...point(lineup.length)});
  const captain = $('captain').value || team?.captain;
  $('captain').replaceChildren(new Option('Select captain',''),...names.map(name=>new Option(name,name)));
  if (names.includes(captain)) $('captain').value=captain;
  pitch.querySelectorAll('.pitch-player').forEach(player=>player.remove());
  for (const data of lineup) {
    const player=document.createElement('div'); player.className='pitch-player'; player.draggable=true;player.tabIndex=0;player.dataset.name=data.name;
    player.setAttribute('aria-label',`${data.name}. Arrow keys move player. Select a substitute then click to replace.`);
    player.style.left=`${Math.max(5,Math.min(95,Number(data.x)||50))}%`;player.style.top=`${Math.max(5,Math.min(95,Number(data.y)||50))}%`;
    player.innerHTML=`<img class="player-image" src="player.png" alt=""><select aria-label="Position for ${escapeHtml(data.name)}">${positions.map(role=>`<option ${role===data.position?'selected':''}>${role}</option>`).join('')}</select><small>${escapeHtml(data.name)}</small>`;
    player.addEventListener('dragstart',event=>event.dataTransfer.setData('text/plain',data.name));
    player.addEventListener('click',event=>{if(selectedBench&&!event.target.closest('select'))swap(selectedBench,data.name)});
    player.addEventListener('keydown',event=>{
      if(event.target.closest('select'))return;
      if(selectedBench&&['Enter',' '].includes(event.key)){event.preventDefault();swap(selectedBench,data.name);return}
      const moves={ArrowLeft:[-3,0],ArrowRight:[3,0],ArrowUp:[0,-3],ArrowDown:[0,3]};
      if(!moves[event.key])return;event.preventDefault();
      player.style.left=`${Math.max(5,Math.min(95,parseFloat(player.style.left)+moves[event.key][0]))}%`;
      player.style.top=`${Math.max(5,Math.min(95,parseFloat(player.style.top)+moves[event.key][1]))}%`;
    });
    pitch.append(player);
  }
  const bench=names.filter(name=>!lineup.some(player=>player.name===name));
  pool.replaceChildren(); pool.hidden=!bench.length;pool.parentElement.classList.toggle('pool-empty',!bench.length);
  for(const name of bench){const button=document.createElement('button');button.type='button';button.className='pool-player';button.textContent=name;button.draggable=true;
    button.addEventListener('dragstart',event=>event.dataTransfer.setData('text/plain',name));
    button.addEventListener('click',()=>{selectedBench=name;message.textContent=`Select a player on the pitch to replace with ${name}.`});pool.append(button)}
}
function swap(incoming,outgoing){capture();const index=lineup.findIndex(player=>player.name===outgoing);if(index<0)return;lineup[index]={...lineup[index],name:incoming};selectedBench=null;render();message.textContent=`${incoming} added to the lineup.`}
pitch.addEventListener('dragover',event=>event.preventDefault());
pitch.addEventListener('drop',event=>{
  event.preventDefault();const name=event.dataTransfer.getData('text/plain');
  const player=[...pitch.querySelectorAll('.pitch-player')].find(item=>item.dataset.name===name);
  if(!player){const target=event.target.closest('.pitch-player');if(target&&roster().includes(name))swap(name,target.dataset.name);return}
  const rect=pitch.getBoundingClientRect(),x=Math.max(5,Math.min(95,(event.clientX-rect.left)/rect.width*100)),y=Math.max(5,Math.min(95,(event.clientY-rect.top)/rect.height*100));
  player.style.left=x+'%';player.style.top=y+'%';player.querySelector('select').value=roleAt(x,y);
});
for(const [id,event] of [['players','input'],['team-format','change']])$(id).addEventListener(event,()=>{capture();render()});
function cache(record){const state=JSON.parse(localStorage.getItem('footlyMvp')||'{}');state[side+'Team']=record;if(side==='home')state.team=record;localStorage.setItem('footlyMvp',JSON.stringify(state));const teams=JSON.parse(localStorage.getItem('footlyTeams')||'{}');teams[side]=record;localStorage.setItem('footlyTeams',JSON.stringify(teams))}
function fill(){ $('team-name').value=team?.name||'';$('players').value=(team?.players||[]).join('\n');$('team-format').value=team?.format||'5-a-side';lineup=team?.lineup||[];render() }
async function save(record){
  if(busy||!ready)return;busy=true;form.querySelectorAll('button').forEach(button=>button.disabled=true);message.textContent='Saving…';
  try{if(firebaseConfigured)await setDoc(teamDoc(auth.currentUser.uid),{[side+'Team']:record,ownerId:auth.currentUser.uid,updatedAt:serverTimestamp()},{merge:true});team=record;cache(record);if(!record)fill();message.textContent=record?'Team saved. You can now create a match.':'Team deleted.'}
  catch(error){console.error(error);message.textContent='Could not save. Your changes remain here; please retry.'}
  finally{busy=false;form.querySelectorAll('button').forEach(button=>button.disabled=false)}
}
form.addEventListener('submit',event=>{
  event.preventDefault();if(!ready||busy)return;capture();const names=roster(),size=Number($('team-format').value.split('-')[0]);
  if(!$('team-name').value.trim()||names.length>50||names.some(name=>name.length>100)){message.textContent='Use a team name and up to 50 players, with names under 100 characters.';return}
  if(lineup.length!==size||!lineup.some(p=>p.name===$('captain').value)||!lineup.some(p=>p.position==='GK')||!lineup.some(p=>['CMF','DMF','AMF','LMF','RMF'].includes(p.position))||!lineup.some(p=>['CF','SS','LWF','RWF'].includes(p.position))){message.textContent=`Choose ${size} starters, a starting captain, a goalkeeper, midfielder, and attacker.`;return}
  save({name:$('team-name').value.trim(),captain:$('captain').value,players:names,format:$('team-format').value,lineup});
});
$('delete-team').addEventListener('click',()=>{if(team&&ready&&!busy&&confirm(`Delete ${side} team?`))save(null)});
form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=true);
try{
  if(firebaseConfigured&&!auth.currentUser)location.replace('auth.html');
  else{
    if(firebaseConfigured){const snapshot=await getDoc(teamDoc(auth.currentUser.uid));team=snapshot.data()?.[side+'Team']||null}
    else{const state=JSON.parse(localStorage.getItem('footlyMvp')||'{}');team=side==='home'?state.team:state.awayTeam}
    fill();ready=true;form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=false);message.textContent='Drag or use arrow keys to position players. Select a substitute, then a starter, to swap.';
  }
}catch(error){console.error(error);message.textContent='Could not load your team. Reload to retry.'}
