/* 웹 앱(PWA): 서비스 워커로 오프라인 저장, '앱으로 설치' 단추, 새 버전 알림 */
(function(){
  'use strict';
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol)) return;
  const btn=document.getElementById('hubInstall'); let deferred=null;
  window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferred=e; if(btn) btn.hidden=false; });
  if(btn) btn.addEventListener('click',async()=>{ if(!deferred) return; deferred.prompt(); try{ await deferred.userChoice; }catch(err){} deferred=null; btn.hidden=true; });
  window.addEventListener('appinstalled',()=>{ if(btn) btn.hidden=true; });

  /* 알림 막대: 새 버전 · 오프라인 준비 완료 */
  function bar(text,action,fn){
    let b=document.getElementById('hubBar'); if(b) b.remove();
    b=document.createElement('div'); b.id='hubBar'; b.className='hub-bar'; b.setAttribute('role','status');
    const s=document.createElement('span'); s.textContent=text; b.append(s);
    if(action){ const k=document.createElement('button'); k.type='button'; k.className='hub-btn'; k.textContent=action; k.addEventListener('click',fn); b.append(k); }
    const x=document.createElement('button'); x.type='button'; x.className='hub-x'; x.setAttribute('aria-label','닫기'); x.textContent='×'; x.addEventListener('click',()=>b.remove()); b.append(x);
    document.body.append(b);
  }
  /* ‘새로 고침’을 눌렀을 때만 다시 연다(처음 설치 때 서비스 워커가 화면을 넘겨받아도 다시 열지 않음) */
  let want=false, reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(!want||reloading) return; reloading=true; location.reload(); });
  const first=!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg=>{
    const ask=w=>bar('새 버전이 나왔어요. 작업은 저장되어 있으니 새로 고쳐도 괜찮아요.','새로 고침',()=>{ want=true; w.postMessage('skip'); });
    if(reg.waiting&&navigator.serviceWorker.controller) ask(reg.waiting);
    reg.addEventListener('updatefound',()=>{ const w=reg.installing; if(!w) return;
      w.addEventListener('statechange',()=>{ if(w.state!=='installed') return;
        if(navigator.serviceWorker.controller) ask(w); }); });
    /* 처음 열었을 때: 자료를 모두 저장하고 나면(작동 시작) 알려 준다 */
    if(first) navigator.serviceWorker.ready.then(()=>bar('이제 인터넷 없이도 열려요. 모든 자료를 이 기기에 저장했어요.'));
    /* 하루에 한 번쯤 새 버전 확인 */
    setInterval(()=>reg.update().catch(()=>{}),6*3600*1000);
  }).catch(()=>{});
})();
