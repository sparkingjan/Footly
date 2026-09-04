const state = JSON.parse(localStorage.getItem('footlyMvp') || '{"match":null}');
const legacyTeams=JSON.parse(localStorage.getItem('footlyTeams')||'null');
if(legacyTeams&&!state.team){state.team={...legacyTeams.home,captain:legacyTeams.home.players[0]||'',format:'5-a-side',lineup:[]};state.awayTeam={...legacyTeams.away,captain:legacyTeams.away.players[0]||'',format:'5-a-side',lineup:[]};localStorage.setItem('footlyMvp',JSON.stringify(state));}
const home = document.getElementById('home-team');
const away = document.getElementById('away-team');
const homeScore = document.getElementById('home-score');
const awayScore = document.getElementById('away-score');
const meta = document.getElementById('match-meta');
const actions = document.querySelector('.score-actions');
function renderEmptyMatch() {
  if (state.match) return;
  if (home) home.innerHTML = '<span>No match</span><small>HOME</small>';
  if (away) away.innerHTML = '<span>ongoing</span><small>AWAY</small>';
  if (homeScore) homeScore.textContent = '—';
  if (awayScore) awayScore.textContent = '—';
  if (meta) meta.textContent = 'No match ongoing';
  if (actions) actions.hidden = true;
}
renderEmptyMatch();
document.getElementById('match-form')?.addEventListener('submit', () => setTimeout(() => {
  const next = JSON.parse(localStorage.getItem('footlyMvp') || '{}');
  if (next.match && actions) actions.hidden = false;
}, 0));
