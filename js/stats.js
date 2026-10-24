/* 방문 통계(GoatCounter, 쿠키 없음): 페이지를 연 것은 count.js가 스스로 센다.
   여기서는 어느 탭을 쓰는지 보려고, 탭을 처음 열 때 한 번씩 'tab-…' 이벤트로 센다.
   인터넷이 없거나 count.js가 막혀 있으면 아무것도 하지 않는다. */
(function(){
  'use strict';
  if(!/^https?:$/.test(location.protocol)) return;
  const seen=new Set(), q=[];
  const tabs=[...document.querySelectorAll('[role="tab"][id^="hub-tab-"]')];
  const label=b=>(b.getAttribute('aria-label')||b.textContent).replace(/\s+/g,' ').trim();
  function flush(){
    const g=window.goatcounter; if(!g||typeof g.count!=='function') return false;
    while(q.length){ const b=q.shift(); try{ g.count({path:'tab-'+b.id.slice(8),title:'탭: '+label(b),event:true}); }catch(e){} }
    return true;
  }
  function now(){ const b=tabs.find(t=>t.getAttribute('aria-selected')==='true'); if(!b||seen.has(b.id)) return; seen.add(b.id); q.push(b); flush(); }
  const mo=new MutationObserver(now); tabs.forEach(b=>mo.observe(b,{attributes:true,attributeFilter:['aria-selected']}));
  now();
  /* count.js는 async로 늦게 올 수 있어, 올 때까지(최대 30초) 기다렸다가 밀린 것을 보낸다 */
  let n=0; const t=setInterval(()=>{ if(flush()||++n>150) clearInterval(t); },200);
})();
