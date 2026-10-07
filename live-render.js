import {showAvatars} from './avatars.js';
import { watchMatch } from './match-data.js';
import { playerStats } from './match-core.js';
import { firebaseConfigured, requireUser, db, collection, getDocs, getDoc, teamDoc, query, where, orderBy } from './firebase-client.js';
const uiStyle=document.createElement('style');uiStyle.textContent='.details-panel .player-list .player img{width:30px;height:30px;object-fit:contain}.details-panel .player-list .player{min-height:34px}.details-panel .player-stat-head,.details-panel .player-stat-row{grid-template-columns:2fr repeat(5,1fr)}.details-panel .player-stat-head span:not(:first-child),.details-panel .player-stat-row span:not(:first-child){text-align:center}';document.head.appendChild(uiStyle);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
const localData=()=>{const state=JSON.parse(localStorage.getItem('footlyMvp')||'{}');return{state,match:state.match||JSON.parse(localStorage.getItem('footlyMatch')||'null')}};
const eventsFor=data=>(data.match?.events||data.state.events||[]);
function eventRows(data){const events=eventsFor(data);return events.slice().reverse().map(item=>`<div class="commentary-row"><time>${esc(item.minute||item.time||'LIVE')}'</time><span class="event-icon goal">${esc(item.icon||'⚽')}</span><div><b>${esc(item.player||'Match update')}</b><small>${esc(item.note||item.type||'Live match update')}</small></div></div>`).join('')||'<p class="empty">No events recorded yet.</p>'}
function teamPlayers(data,side){const team=data.state[side==='home'?'team':'awayTeam'],fromTeam=team?.lineup?.length?team.lineup:team?.players||[],fromMatch=data.match?.players?.[side]||[];return fromTeam.length?fromTeam:fromMatch}
function lineupMarkup(data,side){const players=teamPlayers(data,side),name=side==='home'?data.match.home:data.match.away;return `<div class="lineup"><h3>${esc(name)} <span>${players.length} players</span></h3><div class="player-list">${players.length?players.map((item,index)=>{const p=typeof item==='object'?item:{name:item,position:''};return `<div class="player"><span class="community-avatar" data-avatar-user="${esc(p.uid||'')}"><img src="player.png" alt=""></span><span class="player-number">${String(index+1).padStart(2,'0')}</span><strong>${esc(p.name)}</strong><small>${esc(p.position||'—')}</small></div>`}).join(''):'<p class="empty">No lineup saved for this team.</p>'}</div></div>`}
function individualStats(data){return playerStats({...data.match,events:eventsFor(data)}).map(player=>`<div class="player-stat-row"><span class="player-stat-name">${esc(player.name)} <small>${esc(player.side)} · ${esc(player.position||'')}</small></span><span>${esc(data.match.minute||0)}'</span><span>${player.goals}</span><span>${player.assists}</span><span>${player.cards}</span><span>${player.events}</span></div>`).join('')||'<p class="empty">Add named player events in the scorekeeper to build individual stats.</p>'}
const originalHero=document.querySelector('.details-hero')?.innerHTML,originalGrid=document.querySelector('.details-grid')?.innerHTML;
function render(data){
if(originalHero){document.querySelector('.details-hero').innerHTML=originalHero;document.querySelector('.details-grid').innerHTML=originalGrid;}
  const live=document.body.classList.contains('match-page');
  if(live){const layout=document.querySelector('.match-layout');if(!data.match){layout.innerHTML='<p class="empty">No live match ongoing. Create a match to see it here.</p>';return}layout.innerHTML=`<article class="featured-match"><div class="match-card-header"><span class="live-pill"><i></i> LIVE</span><span class="competition">${esc(data.match.competition||data.match.type||'Football match')}</span><span class="match-minute">${esc(data.match.minute||0)}'</span></div><div class="scoreboard"><div class="club"><strong>${esc(data.match.home)}</strong><small>HOME</small></div><div class="score"><b>${esc(data.match.homeScore??0)}</b><span>—</span><b>${esc(data.match.awayScore??0)}</b><small>LIVE</small></div><div class="club away"><strong>${esc(data.match.away)}</strong><small>AWAY</small></div></div><div class="match-events">${eventRows(data)}</div><div class="match-card-footer"><span>● Live updates</span><a href="match-details.html">Match details <b>↗</b></a></div></article>`;document.querySelector('.side-matches')?.remove();return}
  const hero=document.querySelector('.details-hero');if(!data.match){hero.innerHTML='<p class="empty" style="padding:30px">No live match ongoing.</p>';document.querySelector('.details-grid').innerHTML='';return}
  const m=data.match;hero.querySelector('.details-kicker').innerHTML=`<span class="live-pill"><i></i> LIVE · ${esc(m.minute||0)}'</span><span class="competition">${esc(m.competition||m.type||'Football match')}</span><span>${esc(m.venue||'Live match')}</span>`;hero.querySelector('.details-score').innerHTML=`<div class="details-team"><strong>${esc(m.home)}</strong><small>HOME</small></div><div class="details-scoreline"><b>${esc(m.homeScore??0)}</b><span>—</span><b>${esc(m.awayScore??0)}</b><small>LIVE</small></div><div class="details-team"><strong>${esc(m.away)}</strong><small>AWAY</small></div>`;
  document.getElementById('commentary').innerHTML=`<span class="panel-label">Live feed</span><h2>Commentary</h2>${eventRows(data)}`;
  document.getElementById('lineups').innerHTML=`<span class="panel-label">Current squads</span><h2>Lineups</h2>${lineupMarkup(data,'home')}${lineupMarkup(data,'away')}`;
  document.getElementById('stats').innerHTML=`<span class="panel-label">Individual performance</span><h2>Player stats</h2><div class="player-stat-head"><span>Player</span><span>Match min</span><span>G</span><span>A</span><span>Cards</span><span>Events</span></div><div class="individual-stats">${individualStats(data)}</div>`;
  document.getElementById('summary').innerHTML=`<span class="panel-label">Match summary</span><h2>${esc(m.home)} ${esc(m.homeScore??0)} — ${esc(m.awayScore??0)} ${esc(m.away)}</h2><p class="empty">${eventsFor(data).length} event(s) recorded. Use Commentary, Lineups, and Stats for the full live record.</p>`;
}
let stop;
if(firebaseConfigured)requireUser(user=>{
  stop?.();
  if(!user){location.replace('auth.html');return}
  stop=watchMatch(user.uid,match=>{render({state:{},match});showAvatars();},error=>{
    console.error(error);
    const box=document.querySelector('.match-layout')||document.querySelector('.details-hero');
    box.textContent='Live updates unavailable. Reload to retry.';
  });
});else render(localData());
