import { auth, db, firebaseConfigured, requireUser, signOut, userDoc, teamDoc, doc, collection, getDoc, getDocs, setDoc, query, where, orderBy, serverTimestamp } from './firebase-client.js';
const appKey = 'footlyMvp';
const read = key => JSON.parse(localStorage.getItem(key) || 'null');
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
async function loadCloud(user) {
  if (!user || sessionStorage.getItem('footlyCloudLoaded') === user.uid) return;
  const [profileSnap, teamSnap, matchesSnap] = await Promise.all([
    getDoc(userDoc(user.uid)), getDoc(teamDoc(user.uid)),
    getDocs(query(collection(db, 'matches'), where('organizerId', '==', user.uid)))
  ]);
  const state = read(appKey) || { user: null, team: null, match: null, events: [] };
  const profile = profileSnap.exists() ? profileSnap.data() : {};
  state.user = profile.displayName || user.displayName || user.email?.split('@')[0] || 'Organizer';
  if (!profileSnap.exists()) await setDoc(userDoc(user.uid), { email: user.email, displayName: state.user, createdAt: serverTimestamp() }, { merge: true });
  if (teamSnap.exists()) { const data=teamSnap.data(); state.team=data.homeTeam || (data.name ? data : state.team); state.awayTeam=data.awayTeam || state.awayTeam; }
  const latest = matchesSnap.docs.slice().sort((a, b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))[0];
  if (latest) {
    state.match = { id: latest.id, ...latest.data() };
    const events = await getDocs(query(collection(db, 'matches', latest.id, 'events'), orderBy('createdAt', 'asc')));
    state.events = events.docs.map(item => ({ id: item.id, ...item.data() }));
    write('footlyMatch', { ...state.match, events: state.events });
  }
  write(appKey, state); sessionStorage.setItem('footlyCloudLoaded', user.uid); location.reload();
}
async function saveTeam(user) { const state = read(appKey); if (state?.team) await setDoc(teamDoc(user.uid), { ...state.team, homeTeam: state.team, awayTeam: state.awayTeam || null, ownerId: user.uid, updatedAt: serverTimestamp() }, { merge: true }); }
async function saveAwayTeam(user) { const state=read(appKey); if(state?.awayTeam) await setDoc(teamDoc(user.uid), { awayTeam: state.awayTeam, ownerId:user.uid, updatedAt:serverTimestamp() }, { merge:true }); }
async function saveMatch(user) {
  const state = read(appKey) || { events: [], match: read('footlyMatch') }, match = state?.match || read('footlyMatch'); if (!match) return;
  const ref = match.id ? doc(db, 'matches', match.id) : doc(collection(db, 'matches'));
  const { id: ignoredMatchId, ...matchData } = match;
  await setDoc(ref, { ...matchData, organizerId: user.uid, createdAt: match.createdAt || serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  await Promise.all((state.events || []).map(event => { const eventRef = event.id ? doc(db, 'matches', ref.id, 'events', event.id) : doc(collection(db, 'matches', ref.id, 'events')); const { id: ignoredEventId, ...eventData } = event; return setDoc(eventRef, { ...eventData, organizerId: user.uid, createdAt: event.createdAt || serverTimestamp() }, { merge: true }); }));
  state.match.id = ref.id; write(appKey, state); write('footlyMatch', { ...state.match, events: state.events });
}
if (!firebaseConfigured) {
  console.warn('Firebase is not configured. Add the Web App config in firebase-config.js.');
} else requireUser(async user => {
  if (!user) { location.href = 'auth.html'; return; }
  document.body.dataset.firebaseUser = user.uid;
  document.addEventListener('click', event => {
    if (event.target.id === 'logout') { event.preventDefault(); event.stopImmediatePropagation(); signOut(auth).then(() => location.href = 'auth.html'); }
  }, true);
  try { await loadCloud(user); } catch (error) { console.error('Firestore load failed', error); }
  document.addEventListener('submit', event => setTimeout(() => (event.target.id === 'team-form' ? saveTeam(user) : event.target.id === 'match-form' ? saveMatch(user) : Promise.resolve()).catch(error => console.error('Firestore save failed', error)), 0));
  document.addEventListener('submit', event => setTimeout(() => (event.target.id === 'away-team-form' ? saveAwayTeam(user) : Promise.resolve()).catch(error => console.error('Firestore away-team save failed', error)), 0));
  window.addEventListener('footly-team-delete', () => setDoc(teamDoc(user.uid), { homeTeam:null, awayTeam:null, ownerId:user.uid, updatedAt:serverTimestamp() }, { merge:true }).catch(error => console.error('Firestore team delete failed', error)));
  document.addEventListener('click', event => { if (event.target.matches('[data-goal], #undo')) setTimeout(() => saveMatch(user).catch(error => console.error('Firestore save failed', error)), 0); });
});
