const style = document.createElement('style');
style.textContent = `.formation-card{margin-top:18px}.formation-tools{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:15px}.formation-tools label{display:grid;gap:6px;color:#789080;font:9px 'DM Mono';letter-spacing:.1em;text-transform:uppercase}.formation-tools select{border:1px solid #d6e1d7;border-radius:7px;padding:9px;background:#fbfdf9;color:#081d14;font:12px 'DM Sans'}.formation-layout{display:grid;grid-template-columns:170px 1fr;gap:14px}.formation-layout.pool-empty{grid-template-columns:1fr}.player-pool{border:1px solid #dce6dd;border-radius:9px;padding:10px;min-height:120px}.player-pool h3{font:10px 'DM Mono';color:#789080;margin:0 0 10px;text-transform:uppercase}.pool-player{display:block;width:100%;border:1px solid #dce6dd;border-radius:5px;background:#f8fbf6;color:#17351e;padding:7px;margin:5px 0;text-align:left;font:11px 'DM Sans';cursor:grab}.football-pitch{position:relative;min-height:510px;border:3px solid #d8f0cc;border-radius:10px;overflow:hidden;background:repeating-linear-gradient(0deg,#347d31 0,#347d31 63px,#3b8736 63px,#3b8736 126px);box-shadow:inset 0 0 0 1px #ffffff66}.football-pitch:before{content:'';position:absolute;inset:50% 0 auto;height:2px;background:#e8f7df}.football-pitch:after{content:'';position:absolute;width:112px;height:112px;left:50%;top:50%;transform:translate(-50%,-50%);border:2px solid #e8f7df;border-radius:50%}.pitch-box{position:absolute;left:50%;transform:translateX(-50%);width:44%;height:18%;border:2px solid #e8f7df}.pitch-box.top{top:0;border-top:0}.pitch-box.bottom{bottom:0;border-bottom:0}.pitch-player{position:absolute;transform:translate(-50%,-50%);z-index:2;width:105px;text-align:center;cursor:grab}.pitch-player:active{cursor:grabbing}.pitch-player select{max-width:105px;border:1px solid #f5ffe7;border-radius:5px;background:#e7f4d8;color:#17351e;padding:5px 2px;font:10px 'DM Sans';box-shadow:0 2px 8px #173d2470}.pitch-player small{display:block;color:#efffe9;font:9px 'DM Mono';margin-top:3px;text-shadow:0 1px 2px #173d24}.formation-note{color:#6f8878;font:10px 'DM Mono';line-height:1.5;margin-top:10px}@media(max-width:700px){.formation-layout{grid-template-columns:1fr}.player-pool{min-height:0}.football-pitch{min-height:440px}}`;
document.head.appendChild(style);
style.textContent += `.formation-actions{display:flex;gap:8px;margin-top:14px}.formation-actions button{border:1px solid #d6e1d7;border-radius:7px;background:#fff;color:#719541;padding:10px 13px;font:11px 'DM Sans';cursor:pointer}.formation-actions .delete-team{color:#a3473d;border-color:#e5c8c4}.player-image{display:block;width:34px;height:34px;object-fit:contain;margin:0 auto -2px;filter:drop-shadow(0 2px 2px #173d2470)}`;

const positions = ['GK','LB','CB','RB','LWB','RWB','DMF','CMF','LMF','RMF','AMF','LWF','RWF','SS','CF'];
const form = document.getElementById('team-form');
if (form) {
  const card = document.createElement('section'); card.id='home-formation-card'; card.className = 'app-card formation-card'; card.style.gridColumn = '1 / -1';
  card.innerHTML = '<h2>Build your lineup</h2><div class="formation-tools"><label>Format<select id="team-format"></select></label></div><div class="formation-layout"><div class="player-pool" id="player-pool"><h3>Drag players</h3></div><div class="football-pitch" id="football-pitch"><div class="pitch-box top"></div><div class="pitch-box bottom"></div></div></div><p class="formation-note">Drag players anywhere on the pitch. Their role changes automatically by location. Use the role menu for precise positions.</p><div class="formation-actions"><button type="button" class="back-team">← Back</button><button type="button" class="delete-team">Delete team</button></div>';
  form.parentElement.appendChild(card);
  const format = card.querySelector('#team-format'), pool = card.querySelector('#player-pool'), pitch = card.querySelector('#football-pitch'), playersField = document.getElementById('players');
  const captainInput = document.getElementById('captain');
  const captainField = document.createElement('select'); captainField.id = 'captain'; captainField.name = 'captain'; captainField.required = true; captainInput?.replaceWith(captainField);
  const saved = JSON.parse(localStorage.getItem('footlyMvp') || '{}').team || {};
  for (let number=3; number<=11; number++) { const option=document.createElement('option'); option.value=`${number}-a-side`; option.textContent=`${number}-a-side`; format.appendChild(option); }
  format.value = saved.format || '5-a-side';
  const names = () => (playersField?.value || '').split('\n').map(item => item.trim()).filter(Boolean);
  const initialPoint = index => { const total=Number(format.value.split('-')[0]); if(index===0) return [88,50]; if(index===1) return [18,50]; if(index===2) return [48,50]; const usable=total-3, row=Math.floor((index-3)/4), col=(index-3)%4; return [76-row*(35/Math.max(1,Math.ceil(usable/4)-1)), 18+col*(64/Math.max(1,Math.min(3,usable-1)))]; };
  const roleAt = (x,y) => { if(y>.84) return 'GK'; if(y>.68) return x<.3?'LB':x>.7?'RB':'DMF'; if(y>.48) return x<.3?'LMF':x>.7?'RMF':'CMF'; if(y>.27) return x<.3?'LWF':x>.7?'RWF':'AMF'; return x<.3?'LWF':x>.7?'RWF':y<.16?'CF':'SS'; };
  function renderCaptain(list) {
    const current = captainField.value || saved.captain || '';
    captainField.innerHTML = '<option value="">Select captain</option>' + list.map(name => `<option>${name}</option>`).join('');
    if (list.includes(current)) captainField.value = current;
  }
  function render() {
    const list=names(), total=Number(format.value.split('-')[0]), savedLineup=Array.isArray(saved.lineup)?saved.lineup:[];
    renderCaptain(list);
    pool.hidden = list.length <= total;
    pool.innerHTML='<h3>Drag players</h3>';
    card.querySelector('.formation-layout').classList.toggle('pool-empty', list.length <= total);
    pitch.querySelectorAll('.pitch-player').forEach(item=>item.remove());
    list.forEach((name,index)=>{
      const savedPlayer=savedLineup.find(item=>typeof item==='object'?item.name===name:item===name), point=savedPlayer?.x ? [savedPlayer.y,savedPlayer.x] : initialPoint(index);
      if(index>=total){ const button=document.createElement('button'); button.className='pool-player'; button.draggable=true; button.dataset.name=name; button.textContent=name; button.addEventListener('dragstart',event=>event.dataTransfer.setData('text/plain',name)); pool.appendChild(button); return; }
      const player=document.createElement('div'); player.className='pitch-player'; player.draggable=true; player.dataset.name=name; player.style.top=point[0]+'%'; player.style.left=point[1]+'%';
      const role=savedPlayer?.position || roleAt(point[1]/100,point[0]/100); player.innerHTML=`<img class="player-image" src="player.png" alt=""><select aria-label="Position for ${name}">${positions.map(item=>`<option ${item===role?'selected':''}>${item}</option>`).join('')}</select><small>${name}</small>`;
      player.querySelector('select').addEventListener('change',event=>{event.stopPropagation()}); player.addEventListener('dragstart',event=>event.dataTransfer.setData('text/plain',name)); pitch.appendChild(player);
    });
  }
  pitch.addEventListener('dragover',event=>event.preventDefault());
  pitch.addEventListener('drop',event=>{event.preventDefault(); const name=event.dataTransfer.getData('text/plain'), rect=pitch.getBoundingClientRect(), x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)), y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height)), player=[...pitch.querySelectorAll('.pitch-player')].find(item=>item.dataset.name===name); if(player){player.style.left=x*100+'%';player.style.top=y*100+'%';player.querySelector('select').value=roleAt(x,y)} });
  format.addEventListener('change',render); playersField?.addEventListener('input',render); document.getElementById('format')?.addEventListener('change',event=>{format.value=event.target.value;render()});
  form.addEventListener('submit',event=>{
    const lineup=[...pitch.querySelectorAll('.pitch-player')].map(player=>player.querySelector('select').value);
    const hasKeeper=lineup.includes('GK'), hasMid=lineup.some(role=>['DMF','CMF','AMF','LMF','RMF'].includes(role)), hasAttack=lineup.some(role=>['CF','SS','LWF','RWF'].includes(role));
    if(!captainField.value){event.preventDefault();event.stopImmediatePropagation();alert('Select the captain from your players.');return}
    if(!hasKeeper||!hasMid||!hasAttack){event.preventDefault();event.stopImmediatePropagation();alert('Your lineup must include a GK, a midfielder, and an attacker.');return}
  }, true);
  form.addEventListener('submit',event=>{
    const lineup=[...pitch.querySelectorAll('.pitch-player')].map(player=>player.querySelector('select').value);
    const hasKeeper=lineup.includes('GK'), hasMid=lineup.some(role=>['DMF','CMF','AMF','LMF','RMF'].includes(role)), hasAttack=lineup.some(role=>['CF','SS','LWF','RWF'].includes(role));
    if(!captainField.value){event.preventDefault();event.stopImmediatePropagation();alert('Select the captain from your players.');return}
    if(!hasKeeper||!hasMid||!hasAttack){event.preventDefault();event.stopImmediatePropagation();alert('Your lineup must include a GK, a midfielder, and an attacker.');return}
    const state=JSON.parse(localStorage.getItem('footlyMvp')||'{}');if(state.team){state.team.captain=captainField.value;state.team.format=format.value;state.team.lineup=[...pitch.querySelectorAll('.pitch-player')].map(player=>({name:player.dataset.name,x:parseFloat(player.style.left),y:parseFloat(player.style.top),position:player.querySelector('select').value}));localStorage.setItem('footlyMvp',JSON.stringify(state))}
  });
  render();
  card.querySelector('.back-team').addEventListener('click',()=>document.querySelector('[data-view="home"]')?.click());
  card.querySelector('.delete-team').addEventListener('click',()=>{if(confirm('Delete this team?')){const state=JSON.parse(localStorage.getItem('footlyMvp')||'{}');state.team=null;localStorage.setItem('footlyMvp',JSON.stringify(state));window.dispatchEvent(new Event('footly-team-delete'));render();document.getElementById('team-message').textContent='Team deleted.'}});
}
