(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function toast(message){
    let t=$('#ubg-feature-toast');
    if(!t){ t=document.createElement('div'); t.id='ubg-feature-toast'; t.className='ubg-feature-toast'; document.body.appendChild(t); }
    t.textContent=message; t.classList.add('show'); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2200);
  }
  function escapeHtml(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function formatTime(ts){ if(!ts)return 'Never'; const d=new Date(ts); return d.toLocaleString([], {dateStyle:'medium',timeStyle:'short'}); }
  function findGameName(el){ return el?.querySelector('.safe-game-name')?.textContent?.trim() || el?.getAttribute('data-game-name') || el?.textContent?.trim().replace(/\s+/g,' '); }
  window.UBGUI={ $, $$, toast, escapeHtml, formatTime, findGameName };
})();
