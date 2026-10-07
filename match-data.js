import { db, collection, getDocs, query, where, orderBy, limit, onSnapshot } from './firebase-client.js';
export const latestMatchQuery = uid => query(collection(db, 'matches'), where('organizerId', '==', uid), orderBy('createdAt', 'desc'), limit(1));
export async function decodeMatch(snapshot) {
  if (!snapshot) return null;
  const match = { ...snapshot.data(), id: snapshot.id };
  // Legacy records used a subcollection. New records save events with the score.
  if (match.schemaVersion === 3) {
    const roster=await getDocs(collection(db,'users',match.organizerId,'matchRosters',match.rosterId,'players'));
    match.players={home:[],away:[]};
    for(const member of roster.docs){const player=member.data();if(match.players[player.side])match.players[player.side].push(player);}
  }
  if (match.schemaVersion !== 2 && match.schemaVersion !== 3) {
    const events = await getDocs(query(collection(db, 'matches', match.id, 'events'), orderBy('createdAt', 'desc'), limit(501)));
    if(events.size>500)throw new Error('This legacy match has more than 500 events and needs migration before editing.');
    if (!events.empty) match.events = events.docs.reverse().map(item => ({ ...item.data(), id: item.id }));
  }
  match.events ||= [];
  return match;
}
export async function latestMatch(uid) {
  const result = await getDocs(latestMatchQuery(uid));
  return decodeMatch(result.docs[0]);
}
export function watchMatch(uid, callback, onError) {
  let stop, generation = 0;
  const connect = () => {
    stop?.(); const version = ++generation;
    if (document.hidden) return;
    stop = onSnapshot(latestMatchQuery(uid), async snapshot => {
      try { const match = await decodeMatch(snapshot.docs[0]); if (version === generation) callback(match); }
      catch (error) { onError(error); }
    }, onError);
  };
  document.addEventListener('visibilitychange', connect); connect();
  return () => { generation++; stop?.(); document.removeEventListener('visibilitychange', connect); };
}
