import { syncAndroidAccount } from './android-bridge.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig, firebaseConfigured } from './firebase-config.js';

export { firebaseConfigured, onAuthStateChanged, signOut, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, onSnapshot, runTransaction, serverTimestamp };
export const app = firebaseConfigured ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
const privatePage = !['', 'index.html', 'auth.html', 'features.html', 'the-game.html'].includes(location.pathname.split('/').pop());
// Resolve the account before consumers read cached private state.
if (auth) {
  await auth.authStateReady();
  let activeUid = auth.currentUser?.uid || '';
  const clearAccount = user => {
    syncAndroidAccount(user);
    const uid = user?.uid || '';
    if (localStorage.getItem('footlyAccount') !== uid) {
      for (const key of ['footlyMvp', 'footlyTeams', 'footlyMatch']) localStorage.removeItem(key);
      sessionStorage.removeItem('footlyCloudLoaded');
      localStorage.setItem('footlyAccount', uid);
    }
    if (!uid && privatePage) { document.body.hidden = true; location.replace('auth.html'); }
    else if (activeUid !== uid && !location.pathname.endsWith('/auth.html')) location.reload();
    activeUid = uid;
  };
  clearAccount(auth.currentUser);
  onAuthStateChanged(auth, clearAccount);
}
// A corrupted browser cache must not prevent account recovery.
for (const key of ['footlyMvp', 'footlyMatch', 'footlyTeams']) {
  try { const value = JSON.parse(localStorage.getItem(key) || 'null'); if (value !== null && (typeof value !== 'object' || Array.isArray(value))) localStorage.removeItem(key); }
  catch { localStorage.removeItem(key); }
}
export function requireUser(callback) { return auth ? onAuthStateChanged(auth, user => { if (user || !privatePage) callback(user); }) : callback(null); }
export function userDoc(uid) { return doc(db, 'users', uid); }
export function teamDoc(uid) { return doc(db, 'teams', uid); }
