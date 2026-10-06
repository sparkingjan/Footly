import { auth, firebaseConfigured, requireUser, signOut, userDoc, teamDoc, getDoc } from './firebase-client.js';
import { latestMatch } from './match-data.js';
if (firebaseConfigured) requireUser(async user => {
  if (!user) { location.replace('auth.html'); return; }
  document.getElementById('logout')?.addEventListener('click', () => signOut(auth));
  try {
    const [profile, teams, match] = await Promise.all([getDoc(userDoc(user.uid)), getDoc(teamDoc(user.uid)), latestMatch(user.uid)]);
    const team = teams.exists() ? teams.data() : {};
    const state = { user: profile.data()?.displayName || user.displayName || 'Organizer', team: team.homeTeam || null, awayTeam: team.awayTeam || null, match, events: match?.events || [] };
    localStorage.setItem('footlyMvp', JSON.stringify(state));
    if (match) localStorage.setItem('footlyMatch', JSON.stringify(match)); else localStorage.removeItem('footlyMatch');
    window.dispatchEvent(new Event('footly-state'));
  } catch (error) {
    console.error('Cloud load failed', error);
    document.getElementById('welcome').textContent = 'Could not refresh your account. Showing saved data; reload to retry.';
  }
});
