import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { firebaseConfig, firebaseConfigured } from './firebase-config.js';

// Keep the local MVP usable until a Firebase project is configured.
if (firebaseConfigured) {
  const auth = getAuth(initializeApp(firebaseConfig));
  onAuthStateChanged(auth, user => {
    if (!user) location.href = 'auth.html';
    else document.body.dataset.firebaseUser = user.uid;
  });
}
