import { auth, db, firebaseConfigured, requireUser, collection, doc, addDoc, getDocs, deleteDoc, query, orderBy, limit, startAfter, serverTimestamp } from './firebase-client.js';
const form=document.getElementById('discussion-form'),text=document.getElementById('post-text'),feed=document.getElementById('discussion-feed'),message=document.getElementById('discussion-message'),submit=document.getElementById('post-submit');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let currentUser=null,cursor=null,loading=false;
const more=document.createElement('button');more.type='button';more.textContent='Load older discussions';more.hidden=true;feed.after(more);more.addEventListener('click',()=>loadPosts(true));
function formatDate(value){if(!value)return 'Just now';const date=value.toDate?value.toDate():new Date(value);return Number.isNaN(date.getTime())?'Just now':date.toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}
async function loadPosts(append=false){
  if(!currentUser||loading)return;loading=true;more.disabled=true;
  try{
    const snapshot=await getDocs(query(collection(db,'communityPosts'),orderBy('createdAt','desc'),...(append&&cursor?[startAfter(cursor)]:[]),limit(50)));
    more.hidden=snapshot.size<50;cursor=snapshot.docs.at(-1)||cursor;
    const html=snapshot.docs.map(item=>{const post=item.data();return `<article class="discussion-post"><div class="post-head"><span class="post-author">${escape(post.authorName||'Footly user')}</span><span class="post-date">${escape(formatDate(post.createdAt))}</span></div><p class="post-text">${escape(post.text)}</p>${post.authorId===currentUser.uid?`<button class="post-delete" data-delete="${escape(item.id)}" type="button">Delete</button>`:''}</article>`}).join('');
    if(append)feed.insertAdjacentHTML('beforeend',html);else feed.innerHTML=html||'<p class="community-empty">No discussions yet. Start the first one.</p>';
  }catch(error){console.error(error);message.textContent='Could not load discussions. Please reload to retry.'}
  finally{loading=false;more.disabled=false}
}
form.addEventListener('submit',async event=>{event.preventDefault();const value=text.value.trim();if(!currentUser||!value)return;if(value.length>2000){message.textContent='Keep posts under 2,000 characters.';return;}submit.disabled=true;message.textContent='Posting…';try{await addDoc(collection(db,'communityPosts'),{text:value,authorId:currentUser.uid,authorName:currentUser.displayName||currentUser.email?.split('@')[0]||'Footly user',createdAt:serverTimestamp()});text.value='';message.textContent='Posted';await loadPosts()}catch(error){console.error(error);message.textContent='Could not post your message.'}finally{submit.disabled=false}});
feed.addEventListener('click',async event=>{const button=event.target.closest('[data-delete]');if(!button||!currentUser||!confirm('Delete this discussion post?'))return;button.disabled=true;try{await deleteDoc(doc(collection(db,'communityPosts'),button.dataset.delete));await loadPosts()}catch(error){console.error(error);button.disabled=false}});
if(!firebaseConfigured){message.textContent='Firebase is not configured.';form.querySelectorAll('textarea,button').forEach(item=>item.disabled=true)}else requireUser(async user=>{if(!user){location.href='auth.html';return}currentUser=user;await loadPosts()});
