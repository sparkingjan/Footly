import {escapeHtml} from './match-core.js';
export const positions=['GK','LB','CB','RB','LWB','RWB','DMF','CMF','LMF','RMF','AMF','LWF','RWF','SS','CF'];
export function defaultPosition(index){return index===0?{x:50,y:88,position:'GK'}:{x:20+(index-1)%4*20,y:20+Math.floor((index-1)/4)%3*23,position:index<3?'CF':'CMF'};}
export function roleAt(x,y){return y>80?'GK':y>62?(x<30?'LB':x>70?'RB':'CB'):y>35?(x<30?'LMF':x>70?'RMF':'CMF'):(x<30?'LWF':x>70?'RWF':'CF');}
export function installPositionGuide(squads,isBusy){
 for(const side of ['home','away']){
  const section=document.createElement('section');section.className='position-guide';
  section.innerHTML=`<h3>${side==='home'?'Home':'Away'} position map</h3><p class="directory-help">Drag a player, or focus them and use arrow keys. Choose a role below the map to override the suggested position.</p><div class="setup-pitch" id="${side}-pitch" aria-label="${side} team position map"><div class="setup-box top"></div><div class="setup-box bottom"></div></div><div class="position-roles" id="${side}-roles"></div>`;
  document.getElementById(side+'-players').after(section);
  const pitch=section.querySelector('.setup-pitch');let drag=null;
  const move=(node,x,y)=>{const data=squads[side].get(node.dataset.player);if(!data||isBusy())return;data.x=Math.max(10,Math.min(90,x));data.y=Math.max(9,Math.min(91,y));data.position=roleAt(data.x,data.y);node.style.left=data.x+'%';node.style.top=data.y+'%';node.querySelector('small').textContent=data.position;const select=document.getElementById(side+'-roles').querySelector(`[data-role-player="${CSS.escape(node.dataset.player)}"]`);if(select)select.value=data.position;};
  pitch.addEventListener('pointerdown',event=>{const node=event.target.closest('.setup-player');if(!node||isBusy())return;drag={node,id:event.pointerId};node.setPointerCapture(event.pointerId);node.focus();event.preventDefault();});
  pitch.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const box=pitch.getBoundingClientRect();move(drag.node,100*(event.clientX-box.left)/box.width,100*(event.clientY-box.top)/box.height);});
  const end=()=>{drag=null;};pitch.addEventListener('pointerup',end);pitch.addEventListener('pointercancel',end);
  pitch.addEventListener('keydown',event=>{const node=event.target.closest('.setup-player'),delta={ArrowLeft:[-3,0],ArrowRight:[3,0],ArrowUp:[0,-3],ArrowDown:[0,3]}[event.key];if(!node||!delta)return;event.preventDefault();const data=squads[side].get(node.dataset.player);move(node,data.x+delta[0],data.y+delta[1]);});
  section.querySelector('.position-roles').addEventListener('change',event=>{const uid=event.target.dataset.rolePlayer;if(isBusy()||!uid)return;squads[side].get(uid).position=event.target.value;pitch.querySelector(`[data-player="${CSS.escape(uid)}"] small`).textContent=event.target.value;});
 }
 const guide=document.createElement('details');guide.className='position-key';guide.innerHTML='<summary>Position guide: what do the abbreviations mean?</summary><dl><dt>GK</dt><dd>Goalkeeper</dd><dt>LB / CB / RB</dt><dd>Left, centre and right back</dd><dt>LWB / RWB</dt><dd>Left and right wing-back</dd><dt>DMF / CMF / AMF</dt><dd>Defensive, central and attacking midfielder</dd><dt>LMF / RMF</dt><dd>Left and right midfielder</dd><dt>LWF / RWF</dt><dd>Left and right winger</dd><dt>SS / CF</dt><dd>Second striker and centre forward</dd></dl><p>Attack toward the top of each map. Positions are a guide; team sizes do not have to match.</p>';
 document.getElementById('format-preview').after(guide);
 return ()=>{
  for(const side of ['home','away']){
   const pitch=document.getElementById(side+'-pitch');pitch.querySelectorAll('.setup-player,.pitch-empty').forEach(node=>node.remove());
   for(const [uid,player] of squads[side]){const node=document.createElement('button');node.type='button';node.className='setup-player';node.dataset.player=uid;node.disabled=isBusy();node.style.left=player.x+'%';node.style.top=player.y+'%';node.setAttribute('aria-label',`${player.name}. Use arrow keys to move on the pitch.`);node.innerHTML=`<span class="community-avatar" data-avatar-user="${escapeHtml(uid)}">F</span><b>${escapeHtml(player.name)}</b><small>${escapeHtml(player.position)}</small>`;pitch.append(node);}
   if(!squads[side].size)pitch.insertAdjacentHTML('beforeend','<p class="pitch-empty">Add registered players below to build your lineup.</p>');
   document.getElementById(side+'-roles').innerHTML=[...squads[side]].map(([uid,p])=>`<label>${escapeHtml(p.name)}<select data-role-player="${escapeHtml(uid)}" ${isBusy()?'disabled':''}>${positions.map(role=>`<option ${p.position===role?'selected':''}>${role}</option>`).join('')}</select></label>`).join('');
  }
 };
}
