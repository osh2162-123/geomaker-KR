/* 그래프 다섯 탭(기후·에너지·종교·인구·농업) 공통 화면 도우미
   1) 첫 화면: 그래프 종류를 벤토 카드로 보여 주고, 큰 갈래를 누르면 세부 종류를 고른다
   2) 긴 드롭다운(지표·한꺼번에 넣기)을 갈래별 격자 선택기로 바꾼다 (원래 <select>는 그대로 두고 값만 맞춘다)
   3) 오른쪽·왼쪽 패널의 묶음을 제목을 눌러 접고 펼친다
   4) 표를 크게 보기
   도구 안쪽 코드는 건드리지 않고, 만들어진 화면을 보고 덧입힌다. */
(function(){
'use strict';
const GR=['climate','energy','religion','population','agriculture'];
const NAME={climate:'기후',energy:'에너지',religion:'종교',population:'인구',agriculture:'농업'};
const SUB={climate:'지점의 기온·강수 자료로 시험지 양식 그래프를 만들어요',energy:'Energy Institute 통계로 시험지 양식 도표를 만들어요',religion:'Pew 조사 자료로 나라별 종교 구성을 그려요',population:'UN 자료로 인구 구조·변화·도시화 그래프를 그려요',agriculture:'FAO 자료로 작물·가축 생산과 교역 그래프를 그려요'};
/* 종류 그림(64×64). s=선, f1=흰 면, f2=연한 파랑 면, fb=파랑 면 */
const IC={
 stack:'<rect class="f1 s" x="7" y="12" width="50" height="11" rx="2"/><path class="fb" d="M7 14a2 2 0 0 1 2-2h20v11H9a2 2 0 0 1-2-2z"/><path class="f2" d="M29 12h12v11H29z"/><rect class="f1 s" x="7" y="27" width="50" height="11" rx="2"/><path class="fb" d="M7 29a2 2 0 0 1 2-2h13v11H9a2 2 0 0 1-2-2z"/><path class="f2" d="M22 27h22v11H22z"/><rect class="f1 s" x="7" y="42" width="50" height="11" rx="2"/><path class="fb" d="M7 44a2 2 0 0 1 2-2h28v11H9a2 2 0 0 1-2-2z"/><path class="f2" d="M37 42h8v11h-8z"/>',
 donut:'<circle class="f1 s" cx="32" cy="32" r="23"/><path class="fb" d="M32 32V9a23 23 0 0 1 21.9 16z"/><path class="f2" d="M32 32 53.9 25A23 23 0 0 1 24 53.2z"/><circle class="f1 s" cx="32" cy="32" r="9"/>',
 tree:'<rect class="f1 s" x="8" y="10" width="48" height="44" rx="3"/><path class="fb" d="M8 13a3 3 0 0 1 3-3h24v44H11a3 3 0 0 1-3-3z"/><path class="f2" d="M35 10h18a3 3 0 0 1 3 3v17H35z"/><path class="s nf" d="M35 10v44M35 30h21M45 30v24"/>',
 group:'<path class="s nf" d="M8 10v44h48"/><rect class="fb" x="13" y="30" width="7" height="24" rx="1"/><rect class="f2 s" x="21" y="22" width="7" height="32" rx="1"/><rect class="fb" x="34" y="38" width="7" height="16" rx="1"/><rect class="f2 s" x="42" y="14" width="7" height="40" rx="1"/>',
 small:'<rect class="f1 s" x="7" y="8" width="23" height="22" rx="3"/><rect class="f1 s" x="34" y="8" width="23" height="22" rx="3"/><rect class="f1 s" x="7" y="34" width="23" height="22" rx="3"/><rect class="f1 s" x="34" y="34" width="23" height="22" rx="3"/><rect class="fb" x="12" y="17" width="13" height="8" rx="1"/><rect class="fb" x="39" y="13" width="13" height="12" rx="1"/><rect class="fb" x="12" y="49" width="13" height="3" rx="1"/><rect class="fb" x="39" y="42" width="13" height="10" rx="1"/>',
 tb:'<rect class="f1 s" x="7" y="10" width="50" height="44" rx="4"/><path class="f2" d="M7 14a4 4 0 0 1 4-4h42a4 4 0 0 1 4 4v8H7z"/><path class="s nf" d="M7 22h50M7 33h50M7 44h50M24 22v32M41 22v32"/>',
 climo:'<path class="s nf" d="M8 8v48h48"/><rect class="fb" x="14" y="38" width="6" height="18" rx="1"/><rect class="fb" x="24" y="44" width="6" height="12" rx="1"/><rect class="fb" x="34" y="30" width="6" height="26" rx="1"/><rect class="fb" x="44" y="40" width="6" height="16" rx="1"/><path class="s nf" d="M12 36c8-10 14-22 22-22s12 8 20 14"/>',
 line:'<path class="s nf" d="M8 8v48h48"/><path class="s nf" d="M12 44l12-14 10 8 16-22"/><path class="s nf" d="M12 50l14-6 10-4 14-6" stroke-dasharray="3 3"/><circle class="fb" cx="24" cy="30" r="3"/><circle class="fb" cx="34" cy="38" r="3"/><circle class="fb" cx="50" cy="16" r="3"/>',
 cat:'<path class="s nf" d="M8 8v48h48"/><rect class="f2 s" x="14" y="32" width="8" height="24" rx="1"/><rect class="f2 s" x="27" y="22" width="8" height="34" rx="1"/><rect class="f2 s" x="40" y="38" width="8" height="18" rx="1"/><circle class="fb" cx="18" cy="26" r="3.4"/><circle class="fb" cx="31" cy="16" r="3.4"/><circle class="fb" cx="44" cy="31" r="3.4"/>',
 sc:'<path class="s nf" d="M8 8v48h48M8 32h48"/><circle class="fb" cx="18" cy="42" r="3.4"/><circle class="fb" cx="26" cy="20" r="3.4"/><circle class="f2 s" cx="36" cy="46" r="3.4"/><circle class="fb" cx="46" cy="24" r="3.4"/><circle class="f2 s" cx="50" cy="42" r="3.4"/>',
 rd:'<path class="f1 s" d="M32 8l22 16-8 26H18L10 24z"/><path class="s nf" d="M32 32V8M32 32l22-8M32 32l-8 18M32 32l14 18M32 32 10 24"/><path class="fb" opacity=".75" d="M32 17l14 10-4 16H24l-6-16z"/>',
 rank:'<rect class="f1 s" x="8" y="9" width="48" height="46" rx="4"/><circle class="fb" cx="18" cy="21" r="4"/><circle class="f2 s" cx="18" cy="32" r="4"/><circle class="f2 s" cx="18" cy="43" r="4"/><path class="s nf" d="M28 21h20M28 32h16M28 43h12"/>',
 tri:'<path class="f1 s" d="M32 8 57 54H7z"/><path class="s nf" d="M19.5 31h25M13.5 42h37M26 20h12"/><circle class="fb" cx="30" cy="38" r="3.4"/><circle class="fb" cx="40" cy="44" r="3.4"/><circle class="f2 s" cx="24" cy="46" r="3.4"/>',
 bars:'<path class="s nf" d="M8 8v48h48"/><rect class="fb" x="13" y="26" width="8" height="30" rx="1"/><rect class="f2 s" x="24" y="14" width="8" height="42" rx="1"/><rect class="fb" x="35" y="36" width="8" height="20" rx="1"/><rect class="f2 s" x="46" y="44" width="7" height="12" rx="1"/>',
 dumb:'<path class="s nf" d="M8 8v48h48"/><path class="s nf" d="M18 18h24M14 32h32M24 46h26"/><circle class="f2 s" cx="18" cy="18" r="3.6"/><circle class="fb" cx="42" cy="18" r="3.6"/><circle class="f2 s" cx="14" cy="32" r="3.6"/><circle class="fb" cx="46" cy="32" r="3.6"/><circle class="f2 s" cx="24" cy="46" r="3.6"/><circle class="fb" cx="50" cy="46" r="3.6"/>',
 pyr:'<path class="s nf" d="M32 6v52"/><rect class="fb" x="22" y="48" width="10" height="6" rx="1"/><rect class="fb" x="17" y="39" width="15" height="6" rx="1"/><rect class="fb" x="12" y="30" width="20" height="6" rx="1"/><rect class="fb" x="19" y="21" width="13" height="6" rx="1"/><rect class="fb" x="25" y="12" width="7" height="6" rx="1"/><rect class="f2 s" x="32" y="48" width="9" height="6" rx="1"/><rect class="f2 s" x="32" y="39" width="14" height="6" rx="1"/><rect class="f2 s" x="32" y="30" width="19" height="6" rx="1"/><rect class="f2 s" x="32" y="21" width="12" height="6" rx="1"/><rect class="f2 s" x="32" y="12" width="6" height="6" rx="1"/>',
 list:'<rect class="f1 s" x="8" y="9" width="48" height="46" rx="4"/><path class="fb" d="M14 18h10v5H14zM14 30h10v5H14zM14 42h10v5H14z"/><path class="s nf" d="M30 20.5h20M30 32.5h16M30 44.5h18"/>'
};
const svg=k=>`<svg class="ic" viewBox="0 0 64 64" aria-hidden="true">${IC[k]||IC.tb}</svg>`;
/* 큰 갈래 → 세부 종류(종류 단추의 data-v 값) */
const THEMES={
 climate:[['기후 그래프','기온 선과 강수량 막대','climo',['climo']],['월별 그래프','달마다의 값을 선으로','line',['line']],['지역 비교','막대·산점도·방사형','cat',['cat','sc','rd']],['표','수치를 표로','tb',['tb']]],
 energy:[['구성 비율','누적 막대·도넛·면적','stack',['stack','donut','tree']],['나라별 비교','묶은 막대·상댓값 막대','group',['group','small']],['표','수치를 표로','tb',['tb']]],
 religion:[['구성 비율','누적 막대·원·삼각 그래프','stack',['stack','donut','tri']],['종교별 비교','종교별 막대·묶은 막대','bars',['bars','group']],['순위·표','순위 표와 수치 표','rank',['rank','tb']]],
 population:[['변화와 관계','산점도·꺾은선·두 시기 비교','sc',['sc','line','dumb']],['비교와 구성','묶은 막대·면적·누적 막대','group',['group','tree','stack']],['인구 피라미드','나이·성별 구조','pyr',['pyr']],['표','수치를 표로','tb',['tb']]],
 agriculture:[['구성 비율','누적 막대·원·면적','stack',['stack','donut','tree']],['비교','묶은 막대·상댓값·산점도','group',['group','small','sc']],['표·이름 표','수치 표와 이름 표','tb',['tb','list']]]
};
const h=(t,a,...k)=>{ const e=document.createElement(t); for(const [x,v] of Object.entries(a||{})){ if(v==null) continue; if(x==='class') e.className=v; else e.setAttribute(x,v); } e.append(...k.filter(c=>c!=null)); return e; };

/* ───────── 1) 첫 화면 ───────── */
function chooser(id,box,opt){
  const seg=box.querySelector('#kindSeg'); if(!seg) return;
  const label={}; seg.querySelectorAll('button[data-v]').forEach(b=>label[b.dataset.v]=b.textContent.trim());
  const themes=(THEMES[id]||[]).map(([n,d,ic,ks])=>({n,d,ic,ks:ks.filter(k=>label[k])})).filter(t=>t.ks.length);
  if(!themes.length) return;
  box.classList.add('has-gch');
  const go=k=>{ const b=seg.querySelector(`button[data-v="${k}"]`); if(b) b.click(); close(); };
  const ov=h('div',{class:'gch',role:'region','aria-label':NAME[id]+' 그래프 종류 고르기'});
  const cards=h('div',{class:'gch-grid'});
  themes.forEach((t,i)=>{
    const card=h('div',{class:'gch-c'+(themes.length%3===1&&i===themes.length-1?' wide':'')});
    const main=h('button',{type:'button',class:'gch-main'},h('span',{class:'ic-w',innerHTML:''}),h('b',null,t.n),h('small',null,t.d)); main.firstChild.innerHTML=svg(t.ic);
    card.append(main);
    if(t.ks.length===1) main.addEventListener('click',()=>go(t.ks[0]));
    else{
      const pick=h('div',{class:'gch-pick',hidden:''},h('small',null,t.n+' · 어떤 모양으로 만들까요?'));
      const row=h('div',null); t.ks.forEach((k,j)=>{ const b=h('button',{type:'button',style:`--i:${j}`},h('span',{innerHTML:''}),label[k]); b.firstChild.innerHTML=svg(k); b.addEventListener('click',()=>go(k)); row.append(b); });
      pick.append(row); card.append(pick);
      main.setAttribute('aria-expanded','false');
      main.addEventListener('click',()=>{ cards.querySelectorAll('.gch-pick').forEach(p=>p.hidden=true); cards.querySelectorAll('.gch-main[aria-expanded]').forEach(m=>m.setAttribute('aria-expanded','false')); pick.hidden=false; main.setAttribute('aria-expanded','true'); const f=pick.querySelector('button'); if(f) f.focus(); });
    }
    cards.append(card);
  });
  const keep=h('button',{type:'button',class:'gch-skip'},'작업 중이던 화면으로 바로 가기');
  keep.addEventListener('click',close);
  ov.append(h('div',{class:'gch-in'},h('h2',null,'어떤 그래프를 만들까요?'),h('p',null,SUB[id]),cards,keep));
  box.append(ov); let off=false; try{ off=sessionStorage.getItem('gch-off')==='1'; }catch(e){}   /* 시험 자동화용 끄개 */
  if(opt||off) ov.hidden=true;   /* 다른 도구나 작업 파일에서 자료를 넘겨 받은 경우에는 곧바로 편집 화면 */
  function open(){ ov.hidden=false; cards.querySelectorAll('.gch-pick').forEach(p=>p.hidden=true); const f=ov.querySelector('.gch-main'); if(f) f.focus({preventScroll:true}); }
  function close(){ ov.hidden=true; }
  ov.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });
  /* 위쪽 막대에 '종류 고르기' 되돌아가기 단추 */
  const back=h('button',{type:'button',class:'gch-back',title:'그래프 종류 고르는 첫 화면으로'},h('span',{innerHTML:''}),'종류'); back.firstChild.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="11" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="11" width="6" height="6" rx="1.5"/><rect x="11" y="11" width="6" height="6" rx="1.5"/></svg>';
  back.addEventListener('click',open); seg.before(back);
  /* 완성돼 있던 작업을 불러오면(작업 파일 열기) 첫 화면은 닫는다 */
  document.addEventListener('hub:loaded',e=>{ if(e.detail===id) close(); });
}

/* ───────── 2) 격자 선택기 ───────── */
/* 무늬 견본: 시험지 도표의 칸 무늬(흰·회색 3단계·검정·빗금·줄·점)를 작은 그림으로 */
const FILLS={white:'흰색',light:'연한 회색',mid:'회색',dark:'진한 회색',black:'검정',fs:'빗금 ／',bs:'빗금 ＼',xx:'엇갈린 빗금',vl:'세로줄',hl:'가로줄',zz:'물결줄',dot:'촘촘한 점',sdot:'성긴 점'};
const GRAYS={white:'#fff',light:'#e2e2e2',mid:'#b4b4b4',dark:'#7a7a7a',black:'#1a1a1a'};
let swN=0;
function swatch(k,w,hh){
  const id='sw'+(++swN); let body='';
  const L=(d)=>`<path d="${d}" stroke="#222" stroke-width="1" fill="none"/>`;
  const pat=(pw,ph,inner)=>`<defs><pattern id="${id}" width="${pw}" height="${ph}" patternUnits="userSpaceOnUse">${inner}</pattern></defs><rect width="${w}" height="${hh}" fill="url(#${id})"/>`;
  if(GRAYS[k]) body=`<rect width="${w}" height="${hh}" fill="${GRAYS[k]}"/>`;
  else if(k==='fs') body=pat(5,5,L('M0 5L5 0'));
  else if(k==='bs') body=pat(5,5,L('M0 0L5 5'));
  else if(k==='xx') body=pat(5,5,L('M0 5L5 0M0 0L5 5'));
  else if(k==='vl') body=pat(4,4,L('M2 0V4'));
  else if(k==='hl') body=pat(4,4,L('M0 2H4'));
  else if(k==='zz') body=pat(8,6,L('M0 3Q2 0 4 3T8 3'));
  else if(k==='dot') body=pat(4,4,'<circle cx="2" cy="2" r=".8" fill="#222"/>');
  else if(k==='sdot') body=pat(7,7,'<circle cx="3.5" cy="3.5" r=".9" fill="#222"/>');
  return `<svg class="swt" viewBox="0 0 ${w} ${hh}" width="${w}" height="${hh}" aria-hidden="true"><rect width="${w}" height="${hh}" fill="#fff"/>${body}<rect x=".5" y=".5" width="${w-1}" height="${hh-1}" fill="none" stroke="#555" stroke-width="1"/></svg>`;
}
const isFill=sel=>{ const o=[...sel.options].map(x=>x.value); return o.length>=10&&o.every(v=>v in FILLS); };
const SKIP=/글꼴|무늬|모양|표시$|범위|방식$|위치|채우기|지도|기호|색/;
const POP_GROUPS=[[/도시|촌락/,'도시화'],[/이민/,'이민'],[/출생|출산|사망|기대 수명/,'출생·사망'],[/유소년|청장년|노년|부양비|노령화/,'연령 구조'],[/증감|증가율|이동/,'증감·이동']];
function groupsOf(sel,id){
  const out=[]; const add=(g,o)=>{ let x=out.find(y=>y.g===g); if(!x) out.push(x={g,items:[]}); x.items.push(o); };
  for(const c of sel.children){
    if(c.tagName==='OPTGROUP') for(const o of c.children) add(c.label,{v:o.value,t:o.textContent,d:o.disabled});
    else add('',{v:c.value,t:c.textContent,d:c.disabled});
  }
  if(id==='population'&&out.length===1&&out[0].items.length>20){
    const all=out[0].items; out.length=0;
    for(const o of all){ const r=POP_GROUPS.find(([re])=>re.test(o.t)); add(r?r[1]:'규모·구성',o); }
    const order=['규모·구성','증감·이동','출생·사망','연령 구조','도시화','이민']; out.sort((a,b)=>order.indexOf(a.g)-order.indexOf(b.g));
  }
  return out;
}
function titleOf(sel){ const r=sel.closest('.row'); const l=r&&r.querySelector('label,.lab'); return (sel.getAttribute('aria-label')||(l&&l.textContent)||'고르기').trim(); }
let picker=null;
function openPicker(box,sel,id,btn){
  closePicker();
  const groups=groupsOf(sel,id); const title=titleOf(sel); const fill=isFill(sel);
  const cur=sel.value; let gi=Math.max(0,groups.findIndex(g=>g.items.some(o=>o.v===cur)));
  const ov=h('div',{class:'gs-ov',role:'dialog','aria-modal':'true','aria-label':title});
  const panel=h('div',{class:'gs-p'}); const hd=h('div',{class:'gs-h'},h('b',null,title)); const x=h('button',{type:'button',class:'gs-x','aria-label':'닫기'},'×'); hd.append(x);
  const tabs=h('div',{class:'gs-t',role:'tablist'}); const grid=h('div',{class:'gs-g'});
  const named=groups.filter(g=>g.g).length>1;
  const paint=()=>{
    tabs.textContent=''; if(named) groups.forEach((g,i)=>{ const b=h('button',{type:'button',role:'tab','aria-selected':String(i===gi)},g.g||'기타',h('i',null,String(g.items.length))); b.addEventListener('click',()=>{ gi=i; paint(); }); tabs.append(b); });
    grid.textContent=''; (named?[groups[gi]]:groups).forEach(g=>g.items.forEach(o=>{ const b=h('button',{type:'button','aria-pressed':String(o.v===cur),class:fill?'gs-fill-o':null}); if(fill){ b.innerHTML=swatch(o.v,64,34); b.append(h('span',null,o.t)); } else b.textContent=o.t; if(o.d) b.disabled=true; b.addEventListener('click',()=>{ sel.value=o.v; sel.dispatchEvent(new Event('change',{bubbles:true})); if(fill){ btn.innerHTML=swatch(o.v,34,18); btn.append(h('span',null,o.t)); } else btn.textContent=o.t; closePicker(); btn.isConnected&&btn.focus(); }); grid.append(b); }));
  };
  paint(); panel.append(hd); if(named) panel.append(tabs); panel.append(grid); ov.append(panel); box.append(ov);
  const kill=()=>closePicker(); x.addEventListener('click',kill); ov.addEventListener('mousedown',e=>{ if(e.target===ov) kill(); });
  ov.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); kill(); } });
  picker=ov; const f=grid.querySelector('[aria-pressed="true"]')||grid.querySelector('button'); if(f) f.focus();
}
function closePicker(){ if(picker){ picker.remove(); picker=null; } }
function gridify(box,id,sel){
  if(sel.dataset.gs) return; const fill=isFill(sel); if(!fill&&SKIP.test(sel.getAttribute('aria-label')||'')) return;
  const n=sel.querySelectorAll('option').length; const grouped=sel.querySelector('optgroup');
  if(!fill&&n<7&&!grouped) return; if(sel.closest('.gch,.gs-ov')) return;
  sel.dataset.gs='1';
  const cur=sel.selectedOptions[0]; const btn=h('button',{type:'button',class:'gs-btn'+(fill?' gs-fill':''),'aria-haspopup':'dialog','aria-label':titleOf(sel)+': '+(cur?cur.textContent:'')});
  if(fill&&cur){ btn.innerHTML=swatch(cur.value,34,18); btn.append(h('span',null,cur.textContent)); } else btn.textContent=cur?cur.textContent:'고르기';
  btn.addEventListener('click',()=>openPicker(box,sel,id,btn));
  sel.classList.add('gs-src'); sel.before(btn);
}

/* ───────── 3) 접고 펼치기 ───────── */
const OPEN_DEFAULT=/문장으로|자료 불러오기|^표$|^지점/;
const fold={};   // 도구·패널·제목별로 펼침 상태를 기억(이번 접속 동안)
function foldPane(id,pane,key){
  const secs=[...pane.querySelectorAll(':scope>.sec')];
  secs.forEach((s,i)=>{
    let t=s.querySelector(':scope>.sec-title, :scope>.sec-head .sec-title'); if(!t) return;
    const label=t.textContent.trim(); if(!label) return;
    const k=id+'|'+key+'|'+label; s.dataset.fk=k;
    if(!s.dataset.fz){
      s.dataset.fz='1'; t.setAttribute('role','button'); t.setAttribute('tabindex','0'); t.classList.add('fold-title');
      const toggle=()=>{ const open=s.classList.contains('folded'); fold[k]=open; s.classList.toggle('folded',!open); t.setAttribute('aria-expanded',String(open)); };
      t.addEventListener('click',toggle); t.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
    }
    let open=fold[k]; if(open===undefined) open=(key==='data')?OPEN_DEFAULT.test(label):(i===0);
    s.classList.toggle('folded',!open); t.setAttribute('aria-expanded',String(open));
  });
}
function watchPane(id,box,pane,key){
  if(!pane) return; foldPane(id,pane,key);
  new MutationObserver(()=>foldPane(id,pane,key)).observe(pane,{childList:true});
}

/* ───────── 4) 표 크게 보기 ───────── */
function openSheet(box,wrap,tools,btn){
  const ph1=document.createComment('t'), ph2=document.createComment('w');
  const parts=[]; tools.before(ph1); parts.push([tools,ph1]); wrap.before(ph2); parts.push([wrap,ph2]);
  const ov=h('div',{class:'tsheet',role:'dialog','aria-modal':'true','aria-label':'표 크게 보기'});
  const hd=h('div',{class:'ts-h'},h('b',null,'표 크게 보기'),h('small',null,'여기서 고쳐도 그래프에 바로 반영돼요')); const x=h('button',{type:'button',class:'btn primary'},'닫기'); hd.append(x);
  const body=h('div',{class:'ts-b'}); parts.forEach(([n])=>body.append(n)); ov.append(hd,body); box.append(ov);
  const back=()=>{ parts.forEach(([n,ph])=>{ ph.replaceWith(n); }); ov.remove(); document.removeEventListener('keydown',esc,true); btn.focus(); };
  const esc=e=>{ if(e.key==='Escape') back(); };
  x.addEventListener('click',back); document.addEventListener('keydown',esc,true); x.focus();
}
function bigTable(id,box){
  const wrap=box.querySelector('#dtabWrap'), tools=box.querySelector('#tbTools'); if(!wrap||!tools) return;
  const sec=wrap.closest('.sec'); const head=sec&&sec.querySelector('.sec-head'); if(!head||head.querySelector('.tb-big')) return;
  const btn=h('button',{type:'button',class:'tb-big btn small',title:'표를 화면 가득 크게 봐요'},'크게 보기');
  head.append(btn); btn.addEventListener('click',()=>openSheet(box,wrap,tools,btn));
}

/* 표 아래에 두기: 표가 생기면 미리 보기 아래 넓은 칸으로 옮겨 한눈에 보이게 한다(왼쪽 좁은 칸으로 되돌릴 수도 있음) */
const dockPref={};
function watchTable(id,box){
  const em=box.querySelector('#tbEmpty'), wrap=box.querySelector('#dtabWrap'), tools=box.querySelector('#tbTools'), desk=box.querySelector('main.desk');
  if(!em||!wrap||!tools||!desk) return;
  const sec=wrap.closest('.sec'), info=box.querySelector('#tbInfo');
  const inf=h('small',null);
  const toggle=h('button',{type:'button',class:'btn small'},'왼쪽으로');
  const big=h('button',{type:'button',class:'btn small tb-big2'},'크게 보기');
  const dk=h('section',{class:'tbdock',hidden:'','aria-label':'표'},h('div',{class:'tbd-h'},h('b',null,'표'),inf,big,toggle));
  const slot=h('div',{class:'tbd-b'}); dk.append(slot); desk.append(dk);
  const left=h('button',{type:'button',class:'btn small tb-dockbtn',title:'표를 미리 보기 아래 넓은 칸으로 옮겨요'},'아래로 넓게');
  const head=sec&&sec.querySelector('.sec-head'); if(head) head.append(left);
  let docked=false;
  const sync=()=>{ inf.textContent=info?info.textContent:''; };
  if(info) new MutationObserver(sync).observe(info,{childList:true,characterData:true,subtree:true});
  const place=on=>{
    if(on===docked) return; docked=on;
    if(on){ slot.append(tools,wrap); dk.hidden=false; sec&&sec.classList.add('docked'); box.classList.add('tb-docked'); }
    else { em.before(tools,wrap); dk.hidden=true; sec&&sec.classList.remove('docked'); box.classList.remove('tb-docked'); }
    sync(); window.dispatchEvent(new Event('resize'));   // 미리 보기 크기를 다시 맞춤
  };
  dockPref[id]=dockPref[id]!==false;
  toggle.addEventListener('click',()=>{ dockPref[id]=false; place(false); });
  left.addEventListener('click',()=>{ dockPref[id]=true; if(!em.hidden) return; place(true); });
  big.addEventListener('click',()=>openSheet(box,wrap,tools,big));
  const react=()=>{ const has=em.hidden; if(!has){ place(false); } else if(dockPref[id]) place(true); };
  new MutationObserver(react).observe(em,{attributes:true,attributeFilter:['hidden','style','class']});
  react();
}

document.addEventListener('hub:mounted',e=>{
  const {id,box,opt}=e.detail; if(!GR.includes(id)) return;
  try{
    chooser(id,box,opt);
    const run=()=>box.querySelectorAll('select').forEach(s=>gridify(box,id,s));
    run(); new MutationObserver(run).observe(box,{childList:true,subtree:true});
    watchPane(id,box,box.querySelector('.pane.data'),'data'); watchPane(id,box,box.querySelector('.pane.opts'),'opts');
    bigTable(id,box); watchTable(id,box);
  }catch(err){ console.error('graphui',err); }
});
document.addEventListener('hub:show',()=>closePicker());
})();
