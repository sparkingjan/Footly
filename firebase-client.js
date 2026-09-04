import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { firebaseConfig, firebaseConfigured } from './firebase-config.js';

export { firebaseConfigured, onAuthStateChanged, signOut, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp };
export const app = firebaseConfigured ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export function requireUser(callback) { return auth ? onAuthStateChanged(auth, callback) : callback(null); }
export function userDoc(uid) { return doc(db, 'users', uid); }
export function teamDoc(uid) { return doc(db, 'teams', uid); }
