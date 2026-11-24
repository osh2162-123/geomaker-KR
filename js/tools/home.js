/* 홈: 카드를 누르면 그 도구로. 그래프 카드는 다섯 가지 중에 고르고, '이어서 하기' 는 마지막으로 쓴 도구(이 기기에만 기억) */
HUB.def('home',function(ROOT){
  'use strict';
  const box=document.getElementById('hub-tool-home');
  const pick=box.querySelector('.bc-pick'), opener=box.querySelector('[data-open]');
  /* 처음에는 완성 예시를 크게, 다시 방문하면 작은 접힘으로 보여 준다. */
  const samples=[
    {id:'mapquick',title:'세계 지도에 나라 칠하기',q:'세계 지도에서 브라질, 인도, 오스트레일리아를 칠해 주세요',key:'wgquick-last-v1'},
    {id:'climate',title:'두 지점의 기후 비교',q:'싱가포르, 리스본 기후 그래프',key:'wgclim-editor-v1'},
    {id:'energy',title:'에너지 비율 누적 막대',q:'브라질, 미국, 중국의 1차 에너지 소비 구조 가로 막대 (2024)',key:'wgenergy-editor-v1'}
  ];
  const starter=document.createElement('details'); starter.className='starter';
  const sm=document.createElement('summary'); sm.textContent='처음이세요? 예시로 시작하기'; starter.append(sm);
  const intro=document.createElement('p'); intro.textContent='하나를 누르면 완성된 그림이 나와요. 문장이나 설정을 바꾼 뒤 PNG로 저장해 보세요.'; starter.append(intro);
  const list=document.createElement('div'); list.className='starter-list'; starter.append(list);
  const msg=document.createElement('p'); msg.setAttribute('role','status'); msg.hidden=true; starter.append(msg);
  let seen=false; try{ seen=localStorage.getItem('gm-starter-seen-v1')==='1'; localStorage.setItem('gm-starter-seen-v1','1'); }catch(e){}
  starter.open=!seen;
  box.querySelector('.bento').before(starter);
  let starting=false;
  samples.forEach(s=>{
    const b=document.createElement('button'); b.type='button'; b.className='btn'; b.textContent=s.title; b.dataset.sample=s.id; list.append(b);
    b.addEventListener('click',async()=>{
      if(starting) return;
      let existing=!!HUB.apis[s.id]?.getDoc?.(); try{ existing=existing||!!localStorage.getItem(s.key); }catch(e){}
      if(existing&&!window.confirm('이 도구에 이전 작업이 있어요. 예시로 바꿀까요? 필요한 작업은 먼저 파일로 저장해 주세요.')) return;
      starting=true; list.querySelectorAll('button').forEach(el=>el.disabled=true); msg.hidden=false; msg.textContent='예시 그림을 준비하고 있어요…';
      try{
        const api=await HUB.show(s.id); let ok=false;
        if(s.id==='mapquick'){
          await Promise.all([WG.loadPlaces(),WG.loadLod('lo')]);
          const r=WG.parseRules(s.q); if(!r.understood) throw new Error('지명');
          ok=await api.fromSpec(r.spec,{q:s.q,from:'home',fromName:'시작 예시'});
        }else{
          const eng=s.id==='climate'?GG:EG;
          const r=s.id==='climate'?eng.parseRequest(s.q,[]):eng.parseRequest(s.q);
          if(!r.understood||(r.unknown&&r.unknown.length)) throw new Error('문장');
          const d=eng.specToDoc(r.spec,eng.freshDoc(s.id==='climate'?'climo':'stack')).doc;
          if(s.id==='climate'?!d.stations.length:!d.data.rows.length) throw new Error('자료');
          ok=api.load(d); const q=document.querySelector('#hub-tool-'+s.id+' #q'); if(q) q.value=s.q;
        }
        if(!ok) throw new Error('그림');
        document.querySelector('#hub-tool-'+s.id+' .gch-skip')?.click();
        window.dispatchEvent(new Event('resize'));
        msg.textContent='예시 그림을 만들었어요. 문장을 바꾸거나 PNG로 저장해 보세요.';
        starter.open=false;
      }catch(e){
        console.warn('시작 예시를 만들지 못했어요.',e);
        await HUB.show('home').catch(()=>{}); starter.open=true;
        msg.textContent='예시 자료를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';
      }finally{ starting=false; list.querySelectorAll('button').forEach(el=>el.disabled=false); }
    });
  });
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
