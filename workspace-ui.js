(() => {
  const page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'index.html' || page === 'auth.html') return;
  document.body.classList.add('workspace');
  const routes = [
    ['app.html','Overview','M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
    ['team-setup.html','Home team','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M17 11h6'],
    ['away-team.html','Away team','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M18 4a4 4 0 0 1 0 8 M20 21v-2a4 4 0 0 0-3-4'],
    ['add-match.html','Create match','M4 5h16v16H4z M8 3v4 M16 3v4 M4 11h16 M12 14v4 M10 16h4'],
    ['live-scorekeeper.html','Scorekeeper','M4 4h16v16H4z M8 9h8 M8 15h3 M15 13v4'],
    ['live-matches.html','Match centre','M3 12h4l3-8 4 16 3-8h4'],
    ['stats.html','Statistics','M4 20V10 M12 20V4 M20 20v-7'],
    ['community.html','Community','M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5']
  ];
  const isMatch = page.startsWith('match-');
  const current = routes.find(([url]) => url === page)?.[1] || ({'profile.html':'Your profile','features.html':'Features','the-game.html':'The game'}[page]) || 'Match details';
  const icon = path => `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
  const shell = document.createElement('div');
  shell.innerHTML = `<a class="skip-link" href="#main-content">Skip to content</a><button class="nav-scrim" aria-label="Close navigation" tabindex="-1"></button><aside class="workspace-rail" id="workspace-navigation" aria-label="Main navigation"><a class="brand" href="index.html"><span class="brand-mark">F</span>footly<span aria-hidden="true">.</span></a><button class="rail-close" aria-label="Close navigation">×</button><p class="rail-label">YOUR MATCHDAY</p><nav class="rail-nav">${routes.map(([url,label,path])=>`<a href="${url}"${page===url || (isMatch&&url==='live-matches.html')?' aria-current="page"':''}>${icon(path)}${label}</a>`).join('')}</nav><div class="rail-foot"><p>From the first lineup.<br>To the final whistle.</p><a href="features.html">Explore Footly ↗</a></div></aside><header class="workspace-topbar"><button class="menu-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="workspace-navigation">☰</button><div class="workspace-location"><span>Workspace &nbsp; / &nbsp; </span><span>${current}</span></div><a class="profile-link" href="profile.html">Your account <span class="profile-dot" data-avatar-user="self">F</span></a></header>`;
  document.body.prepend(...shell.childNodes);
  import('./avatars.js');
  const main = document.querySelector('main'); if(main) main.id='main-content';
  main?.querySelectorAll('h1 br').forEach(br=>br.replaceWith(' '));
  const toggle = document.querySelector('.menu-toggle');
  const rail = document.querySelector('.workspace-rail');
  function close(){document.body.classList.remove('nav-open');toggle.setAttribute('aria-expanded','false');toggle.focus();}
  toggle.addEventListener('click',()=>{document.body.classList.add('nav-open');toggle.setAttribute('aria-expanded','true');rail.querySelector('.rail-close').focus();});
  document.querySelector('.rail-close').addEventListener('click',close);
  document.querySelector('.nav-scrim').addEventListener('click',close);
  document.addEventListener('keydown',event=>{
    if(!document.body.classList.contains('nav-open'))return;
    if(event.key==='Escape')close();
    if(event.key==='Tab'){
      const items=[...rail.querySelectorAll('a,button')].filter(el=>el.offsetParent!==null),first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  // Persistent visible labels make event entry understandable without placeholders.
  if(page==='live-scorekeeper.html'){
    for(const [id,label] of [['event-side','Team'],['match-minute','Match minute'],['event-type','Event'],['event-player','Player'],['event-note','Note (optional)']]){
      const field=document.getElementById(id);if(!field)continue;
      const wrapper=document.createElement('label');wrapper.htmlFor=id;wrapper.textContent=label;if(id==='event-note')wrapper.className='wide';field.before(wrapper);wrapper.append(field);
    }
  }
})();
