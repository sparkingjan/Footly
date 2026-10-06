import test from 'node:test';
import assert from 'node:assert/strict';
import { recordEvent, undoGoal, escapeHtml, playerStats } from '../match-core.js';
test('goals update the selected team and undo preserves chronological order', () => {
  const original = { homeScore: 0, awayScore: 0, events: [] };
  const home = recordEvent(original, { type: 'goal', side: 'home', id: 'a' });
  const away = recordEvent(home, { type: 'goal', side: 'away', id: 'b' });
  const card = recordEvent(away, { type: 'yellow', side: 'away', id: 'c' });
  const undone = undoGoal(card);
  assert.equal(undone.homeScore, 1); assert.equal(undone.awayScore, 0);
  assert.deepEqual(undone.events.map(e => e.id), ['a', 'c']);
  assert.deepEqual(card.events.map(e => e.id), ['a', 'b', 'c']);
  assert.equal(original.events.length, 0);
});
test('unknown legacy goal side never decrements the wrong team', () => {
  const match = { homeScore: 0, awayScore: 1, events: [{ icon: '⚽' }] };
  assert.equal(undoGoal(match), match);
});
test('invalid teams and oversized event histories are rejected', () => {
  assert.throws(() => recordEvent({events: []}, {side:'invalid'}));
  assert.throws(() => recordEvent({events: Array(500).fill({})}, {side:'home'}));
});
test('user content cannot break out of text or quoted attributes', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">\'&'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#039;&amp;');
});
test('players with the same name on opposing teams keep separate statistics', () => {
  const rows=playerStats({players:{home:['Alex'],away:['Alex']},events:[{player:'Alex',side:'away',type:'goal'},{player:'Alex',side:'home',type:'assist'},{player:'Alex',type:'goal'}]});
  assert.equal(rows[0].goals,0);assert.equal(rows[0].assists,1);
  assert.equal(rows[1].goals,1);assert.equal(rows[1].assists,0);
});
