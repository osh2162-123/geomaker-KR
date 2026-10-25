/* 홈: 카드를 누르면 그 도구로. 그래프 카드는 다섯 가지 중에 고르고, '이어서 하기' 는 마지막으로 쓴 도구(이 기기에만 기억) */
HUB.def('home',function(ROOT){
  'use strict';
  const box=document.getElementById('hub-tool-home');
  const pick=box.querySelector('.bc-pick'), opener=box.querySelector('[data-open]');
  const closePick=()=>{ if(pick&&!pick.hidden){ pick.hidden=true; opener.setAttribute('aria-expanded','false'); } };
  box.addEventListener('click',e=>{
    if(e.target.closest('[data-open]')){ pick.hidden=false; opener.setAttribute('aria-expanded','true'); const f=pick.querySelector('button'); if(f) f.focus(); return; }
    const a=e.target.closest('[data-go]');
    if(a&&a.dataset.go){ e.preventDefault(); closePick(); HUB.show(a.dataset.go).catch(()=>{}); return; }
    if(!e.target.closest('.bc-pick')) closePick();
  });
  box.addEventListener('keydown',e=>{ if(e.key==='Escape'&&pick&&!pick.hidden){ closePick(); opener.focus(); } });
  function resume(){
    const r=box.querySelector('#homeResume'); if(!r) return;
    let id=null; try{ id=localStorage.getItem('wg-hub-tab-v1'); }catch(e){}
    const tab=id&&id!=='home'?document.getElementById('hub-tab-'+id):null;
    if(!tab){ r.hidden=true; return; }
    r.hidden=false; r.dataset.go=id; r.querySelector('b').textContent=tab.getAttribute('aria-label')||tab.textContent;
  }
  /* 이번 접속에서 열어 본 도구와, 문항 설계로 넘길 기호 상태를 보여 준다(저장 안 함) */
  function now(){
    const sec=box.querySelector('#homeNow'); if(!sec) return; const ul=sec.querySelector('ul'); ul.textContent='';
    const st=(HUB.apis.item&&HUB.apis.item.status)?HUB.apis.item.status():{};
    for(const id of Object.keys(HUB.apis)){
      if(id==='home'||id==='item') continue;
      const tab=document.getElementById('hub-tab-'+id); if(!tab) continue;
      const s=st[id]; const li=document.createElement('li'); const b=document.createElement('button'); b.type='button'; b.dataset.go=id;
      const nm=document.createElement('b'); nm.textContent=tab.getAttribute('aria-label')||tab.textContent; b.append(nm);
      const sm=document.createElement('small'); sm.textContent=s?('기호 '+s.n+'개'+(s.chg?' · 문항에 넣은 뒤 바뀜':(s.linked?' · 문항에 연결됨':' · 문항 설계에 넘길 수 있어요'))):'열려 있어요'; b.append(sm);
      if(s&&s.chg) b.classList.add('chg'); li.append(b); ul.append(li);
    }
    sec.hidden=!ul.children.length;
  }
  resume(); now(); document.addEventListener('hub:show',e=>{ if(e.detail==='home'){ closePick(); resume(); now(); } });
});