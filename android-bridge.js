/* Optional Android UI integration. No passwords or tokens cross this bridge. */
let connected=false;
export function syncAndroidAccount(user){
 const bridge=window.FootlyAndroid;
 if(window.top!==window||!bridge?.postMessage)return;
 if(!connected){
  connected=true;
  let enabled=false;
  const onProfile=location.pathname.endsWith('/profile.html');
  let button,status;
  if(onProfile){
   const section=document.createElement('section');section.className='profile-card';
   const title=document.createElement('h2');title.textContent='Android notifications';
   const description=document.createElement('p');description.textContent='Match updates and community activity. Background checks run about every 30 minutes and may be delayed by Android. Enable with the same Footly account.';
   button=document.createElement('button');button.type='button';button.className='profile-actions';button.textContent='Checking notifications…';button.disabled=true;button.id='android-notifications';
   status=document.createElement('p');status.setAttribute('role','status');
   button.addEventListener('click',()=>bridge.postMessage(JSON.stringify({type:enabled?'disable':'enable'})));
   section.append(title,description,button,status);document.querySelector('main')?.append(section);
  }
  bridge.onmessage=event=>{
   try{const message=JSON.parse(event.data);if(message.type!=='status')return;enabled=message.enabled===true;
    if(button){button.disabled=false;button.textContent=enabled?'Turn off notifications':'Enable notifications';status.textContent=typeof message.message==='string'?message.message:'';}
   }catch{}
  };
 }
 bridge.postMessage(JSON.stringify({type:'session',uid:user?.uid||''}));
}
