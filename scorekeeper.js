import { auth, db, firebaseConfigured, doc, runTransaction, serverTimestamp } from './firebase-client.js';
import { latestMatch } from './match-data.js';
import { escapeHtml, recordEvent, undoGoal } from './match-core.js';
const $ = id => document.getElementById(id);
const status = $('save-status');
let match, busy = false;
const disable = value => document.querySelectorAll('.control-actions button, .event-form input, .event-form select, .event-form button').forEach(control => control.disabled = value);
disable(true);
function cache() {
  const state = JSON.parse(localStorage.getItem('footlyMvp') || '{}');
  state.match = match; state.events = match.events;
  localStorage.setItem('footlyMvp', JSON.stringify(state));
  localStorage.setItem('footlyMatch', JSON.stringify(match));
}
function render() {
  if(match.schemaVersion===3)renderPlayerOptions();
  $('home-name').textContent = match.home; $('away-name').textContent = match.away;
  $('home-score').textContent = match.homeScore; $('away-score').textContent = match.awayScore;
  $('match-minute').value = match.minute || 1;
  $('feed').innerHTML = match.events.slice().reverse().map(event => `<div class="feed-row"><time>${escapeHtml(event.minute)}'</time><span>${escapeHtml(event.icon)}</span><div><b>${escapeHtml(event.player)}</b><small>${escapeHtml(event.note)}</small></div></div>`).join('') || '<p>No events recorded yet.</p>';
  for (const id of ['stat-possession', 'stat-shots', 'stat-corners']) $(id).textContent = 'Not recorded';
  $('stat-cards').textContent = ['home', 'away'].map(side => match.events.filter(event => event.side === side && ['yellow', 'red'].includes(event.type)).length).join(' — ');
  $('stat-total').textContent = `${match.events.length} events recorded`;
}
async function persist(next) {
  if (busy) return;
  busy = true; disable(true); status.textContent = 'Saving…';
  try {
    if (firebaseConfigured) {
      const ref = doc(db, 'matches', next.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists() || snapshot.data().organizerId !== auth.currentUser.uid) throw new Error('This match is no longer available.');
        if ((snapshot.data().revision || 0) !== (match.revision || 0)) throw new Error('This match changed in another tab. Reload before editing.');
        transaction.update(ref, { homeScore: next.homeScore, awayScore: next.awayScore, minute: next.minute, events: next.events, schemaVersion: match.schemaVersion || 2, revision: (match.revision || 0) + 1, updatedAt: serverTimestamp() });
      });
    }
    match = { ...next, revision: (match.revision || 0) + 1, schemaVersion: match.schemaVersion || 2 };
    cache(); render(); status.textContent = firebaseConfigured ? 'Saved to your account' : 'Saved in this browser';
  } catch (error) { status.textContent = error.message || 'Could not save. Please retry.'; }
  finally { busy = false; disable(false); }
}
function renderPlayerOptions(){
 let field=$('event-player');const value=field.value;if(field.tagName!=='SELECT'){const select=document.createElement('select');select.id='event-player';select.required=true;select.setAttribute('aria-label','Player');field.replaceWith(select);field=select;}
 field.innerHTML=(match.players?.[$('event-side').value]||[]).map(p=>`<option value="${escapeHtml(p.uid)}">${escapeHtml(p.name)} (${escapeHtml(p.uid.slice(0,6))})</option>`).join('');
 if([...field.options].some(o=>o.value===value))field.value=value;
}
$('event-side').addEventListener('change',()=>{if(match?.schemaVersion===3)renderPlayerOptions();});
document.querySelectorAll('[data-score]').forEach(button => button.addEventListener('click', () => {
  if (!match || busy) return;
  if (button.dataset.score === 'undo') {
    const next=undoGoal(match);
    if(next===match){status.textContent='No goal with a recorded team is available to undo.';return}
    return persist(next);
  }
  $('event-side').value = button.dataset.score;if(match.schemaVersion===3)renderPlayerOptions(); $('event-type').value = '⚽'; $('event-player').focus();
  status.textContent = 'Enter the scorer, then add the event.';
}));
$('event-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!match || busy) return;
  const icon = $('event-type').value;
  const type = { '⚽': 'goal', '🟨': 'yellow', '🟥': 'red', '↔': 'substitution', 'A': 'assist' }[icon];
  try {
    const selected=match.schemaVersion===3?(match.players?.[$('event-side').value]||[]).find(p=>p.uid===$('event-player').value):null;
    if(match.schemaVersion===3&&!selected)throw new Error('Choose a registered player from this side.');
    const next = recordEvent({ ...match, minute: Number($('match-minute').value) }, { id: crypto.randomUUID(), type, icon, side: $('event-side').value, player: selected?.name||$('event-player').value.trim(), ...(selected?{playerId:selected.uid}:{}), note: $('event-note').value.trim() || type, minute: Number($('match-minute').value) });
    await persist(next);
  } catch (error) { status.textContent = error.message; }
});
try {
  if (firebaseConfigured && !auth.currentUser) location.replace('auth.html');
  else {
    match = firebaseConfigured ? await latestMatch(auth.currentUser.uid) : JSON.parse(localStorage.getItem('footlyMatch') || 'null');
    if (!match) status.innerHTML = 'Create a match first. <a href="add-match.html">Open match setup</a>';
    else { match.events ||= []; render(); cache(); disable(false); status.textContent = 'Ready. Select a team and record an event.'; }
  }
} catch (error) { status.textContent = 'Could not load the match. Reload to retry.'; console.error(error); }
