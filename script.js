const scrollButtons = document.querySelectorAll('[data-scroll]');
if (!document.querySelector('link[data-site-ui]')) { const styleLink = document.createElement('link'); styleLink.rel = 'stylesheet'; styleLink.href = './site-ui.css'; styleLink.dataset.siteUi = 'true'; document.head.appendChild(styleLink); }
scrollButtons.forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.scroll)?.scrollIntoView({behavior:'smooth'})));
document.querySelectorAll('.primary-cta').forEach((link) => link.addEventListener('click', async (event) => {
  event.preventDefault();
  try {
    const { auth, firebaseConfigured, onAuthStateChanged } = await import('./firebase-client.js');
    if (!firebaseConfigured || !auth) { location.href = 'auth.html'; return; }
    let stop;
    stop = onAuthStateChanged(auth, user => { stop?.(); location.href = user ? 'app.html' : 'auth.html'; });
  } catch { location.href = 'auth.html'; }
}));
document.querySelectorAll('[data-scroll="the-game"]').forEach((button) => button.addEventListener('click', () => { location.href = 'app.html'; }));
if (document.body.classList.contains('home-page')) {
  document.querySelector('.home-page .header-link')?.remove();
  const header = document.querySelector('.site-header');
  const auth = document.createElement('div');
  auth.className = 'auth-actions';
  auth.innerHTML = '<a class="auth-signin" href="auth.html">Sign in</a><a class="auth-signup" href="auth.html?mode=signup">Sign up</a><button class="auth-logout" type="button" hidden>Log out</button>';
  header?.appendChild(auth);
  import('./firebase-client.js').then(({ auth: firebaseAuth, firebaseConfigured, onAuthStateChanged, signOut }) => {
    if (!firebaseConfigured || !firebaseAuth) return;
    const signin = auth.querySelector('.auth-signin');
    const signup = auth.querySelector('.auth-signup');
    const logout = auth.querySelector('.auth-logout');
    onAuthStateChanged(firebaseAuth, user => {
      signin.hidden = Boolean(user); signup.hidden = Boolean(user); logout.hidden = !user;
    });
    logout.addEventListener('click', () => signOut(firebaseAuth));
  }).catch(() => {});
}

// Respect reduced motion and data-saving preferences before loading the video.
const backgroundVideo=document.querySelector('.background-video');
if(backgroundVideo&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData){
  const playBackground=()=>{if(document.hidden)backgroundVideo.pause();else backgroundVideo.play().catch(()=>{})};
  document.addEventListener('visibilitychange',playBackground);playBackground();
}
