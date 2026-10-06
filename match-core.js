export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

export function recordEvent(match, event) {
  if (!['home', 'away'].includes(event.side)) throw new Error('Select a team.');
  if (event.player !== undefined && (!event.player.trim() || event.player.length > 100)) throw new Error('Enter a player name under 100 characters.');
  if (event.minute !== undefined && (!Number.isInteger(event.minute) || event.minute < 0 || event.minute > 300)) throw new Error('Enter a match minute from 0 to 300.');
  if ((match.events || []).length >= 500) throw new Error('This match has reached its 500-event limit.');
  const next = { ...match, events: [...(match.events || []), event] };
  if (event.type === 'goal') next[event.side + 'Score'] = (Number(match[event.side + 'Score']) || 0) + 1;
  return next;
}

export function playerStats(match) {
  const players = ['home', 'away'].flatMap(side => (match.players?.[side] || []).map(player => ({ ...(typeof player === 'object' ? player : { name: player }), side })));
  return players.map(player => {
    const unique = players.filter(other => other.name === player.name).length === 1;
    const events = (match.events || []).filter(event => event.player === player.name && (event.side === player.side || (!event.side && unique)));
    return { ...player, events: events.length, goals: events.filter(event => event.type === 'goal' || event.icon === '⚽').length, assists: events.filter(event => event.type === 'assist').length, cards: events.filter(event => ['yellow','red'].includes(event.type) || ['🟨','🟥'].includes(event.icon)).length };
  });
}

export function undoGoal(match) {
  const events = [...(match.events || [])];
  const index = events.findLastIndex(event => (event.type === 'goal' || event.icon === '⚽') && ['home', 'away'].includes(event.side));
  if (index < 0) return match;
  const [event] = events.splice(index, 1);
  return { ...match, events, [event.side + 'Score']: Math.max(0, (Number(match[event.side + 'Score']) || 0) - 1) };
}
