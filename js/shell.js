/* 통합판 겉틀: 탭 전환, 도구를 처음 열 때만 자료·라이브러리를 불러와 붙이기, 작업 파일 갈래 나누기 */
const HUB=(function(){
'use strict';
const MODE="web";            /* artifact: 자료 파일을 그때그때 받아 옴 · standalone: 모두 들어 있음 */
const TOOLS=[{"id": "home", "name": "홈", "need": [], "wait": ""}, {"id": "mapquick", "name": "백지도 자동 생성기", "need": ["d3"], "wait": "지도 라이브러리를 불러오는 중…"}, {"id": "mapedit", "name": "백지도 편집기", "need": ["d3"], "wait": "지도 라이브러리를 불러오는 중…"}, {"id": "kmap", "name": "한국지리 백지도", "need": ["topo", "kmdata"], "wait": "우리나라 경계 자료를 불러오는 중…"}, {"id": "kstat", "name": "한국 통계 지도", "need": ["topo", "kmdata", "kstat"], "wait": "우리나라 경계·통계 자료를 불러오는 중…"}, {"id": "landform", "name": "지형 모식도 편집기", "need": ["ldata"], "wait": "모식도 자료를 불러오는 중…"}, {"id": "climate", "name": "기후 그래프 편집기", "need": ["stations"], "wait": "기후 지점 자료를 불러오는 중…"}, {"id": "energy", "name": "에너지 그래프 편집기", "need": ["edata"], "wait": "에너지 자료를 불러오는 중…"}, {"id": "religion", "name": "종교 그래프 편집기", "need": ["rdata"], "wait": "종교 자료를 불러오는 중…"}, {"id": "population", "name": "인구 그래프 편집기", "need": ["pdata"], "wait": "인구 자료(약 8 MB)를 불러오는 중…"}, {"id": "agriculture", "name": "농업 그래프 편집기", "need": ["adata"], "wait": "농업 자료(약 4.5 MB)를 불러오는 중…"}, {"id": "item", "name": "문항 설계", "need": ["idata"], "wait": "성취기준·기출 자료를 불러오는 중…"}];
const LIBS=['lib/d3.min.js','lib/d3-geo-projection.min.js','lib/topojson-client.min.js'];
const DATA={
  stations:['data/stations.json',d=>GG.setStationDict(d)],
  edata:['data/edata.json',d=>EG.setData(d)],
  rdata:['data/rdata.json',d=>RG.setData(d)],
  pdata:['data/pdata.json',d=>PG.setData(d)],
  adata:['data/adata.json',d=>AG.setData(d)],
  ldata:['data/ldata.json',d=>LG.setData(d)],
  kdata:['data/kdata.json',d=>LG.setKice(d)],
  kmdata:['data/kmdata.json',d=>KM.setData(d)],
  kstat:['data/kstat.json',()=>{}],
  idata:['data/idata.json',d=>IT.setData(d)],
  ikice:['data/ikice.json',d=>IT.setKice(d)],
};
const LAST_KEY='wg-hub-tab-v1';
const defs={}, apis={}, pending={};
const $=s=>document.querySelector(s);
const toolOf=id=>TOOLS.find(t=>t.id===id);
const boxOf=id=>document.getElementById('hub-tool-'+id);
const tabOf=id=>document.getElementById('hub-tab-'+id);
let current=null, toastT=0;

function def(id,fn){ defs[id]=fn; }
function toast(msg){ const t=$('#hubToast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),3200); }

/* ───────── 라이브러리 · 자료 ───────── */
function loadScript(u){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=u; s.onload=ok; s.onerror=()=>{ s.remove(); no(new Error(u)); }; document.head.appendChild(s); }); }
let d3p=null, topop=null;
function needTopo(){
  if(window.topojson) return Promise.resolve();
  if(!topop) topop=loadScript(LIBS[2]).catch(e=>{ topop=null; throw e; });
  return topop;
}
function needD3(){
  if(window.d3&&window.d3.geoMiller&&window.topojson) return Promise.resolve();
  if(!d3p) d3p=(async()=>{ if(!window.d3) await loadScript(LIBS[0]); if(!window.d3.geoMiller) await loadScript(LIBS[1]); if(!window.topojson) await loadScript(LIBS[2]); })().catch(e=>{ d3p=null; throw e; });
  return d3p;
}
/* 자료 읽기. 웹 앱은 data/x.js(<script>)로 읽는다: index.html을 더블클릭해 열어도(file://) 브라우저가 막지 않게 */
const short=u=>String(u).replace(location.href.replace(/[^/]*$/,''),'');
function getJSON(path){
  if(MODE!=='web') return fetch(path).then(r=>{ if(!r.ok) throw new Error(path); return r.json(); });
  const js=path.replace(/\.json$/,'.js'), key=js.replace(/^.*\//,'').replace(/\.js$/,'');
  const box=window.GMDATA=window.GMDATA||{};
  if(box[key]) return Promise.resolve(box[key]);
  return loadScript(js).then(()=>{ if(!box[key]) throw new Error(js); checkVer(key,js); return box[key]; },()=>{ throw new Error(js); });
}
/* 자료 파일이 이 화면과 같은 빌드인지: 다르면(예: 새 파일을 data 폴더가 아닌 맨 위에 올림) 어느 파일인지 알린다 */
const DATAVER={"adata":"818c40ef93","edata":"7da04bce8e","hi":"eb8477bc35","idata":"ea3235e23b","kmdata":"1a5d280150","koppen":"52246e79e5","kstat":"98c2a572bd","ldata":"90dd025ac2","lo":"64da9548ec","pdata":"e7173c9e06","places":"6e3a317164","plates":"f1e72bd1e9","rdata":"d69ae9c7a9","relief":"27762a32c0","stations":"f139be33e4","xlo":"9b80e47a95"}; const oldFiles=[];
function checkVer(key,js){ const want=DATAVER[key]; if(!want) return; const have=(window.GMVER||{})[key]; if(have===want) return;
  oldFiles.push(short(js)); console.warn('옛 자료 파일:',short(js),have,'≠',want);
  let b=document.getElementById('hubOld'); if(!b){ b=document.createElement('div'); b.id='hubOld'; b.className='hub-bar'; b.setAttribute('role','alert'); document.body.append(b); }
  b.textContent=''; const t=document.createElement('span');
  t.textContent='화면과 자료의 버전이 맞지 않아요. 페이지를 한 번 새로 고쳐 주세요. 같은 안내가 계속되면 일부 새 기능이 보이지 않을 수 있지만, 지금 화면은 그대로 써도 돼요.';
  const r=document.createElement('button'); r.type='button'; r.className='hub-btn'; r.textContent='새로 고침'; r.addEventListener('click',()=>location.reload());
  const x=document.createElement('button'); x.type='button'; x.className='hub-x'; x.setAttribute('aria-label','닫기'); x.textContent='×'; x.addEventListener('click',()=>b.remove());
  b.append(t,r,x); }
window.GM_LOAD=getJSON;
const got={};
function needData(k){
  if(MODE==='standalone') return Promise.resolve();
  if(!got[k]) got[k]=getJSON(DATA[k][0]).then(d=>{ DATA[k][1](d); }).catch(e=>{ got[k]=null; throw e; });
  return got[k];
}

/* ───────── 기다림 표시 ───────── */
function wait(msg,retry){
  const w=$('#hubWait'); w.hidden=false; w.textContent='';
  if(!retry){ const s=document.createElement('div'); s.className='hub-spin'; w.append(s); }
  const p=document.createElement('p'); p.textContent=msg; w.append(p);
  if(retry){ const b=document.createElement('button'); b.type='button'; b.className='hub-btn'; b.textContent='다시 시도'; b.onclick=retry; w.append(b); }
}
function unwait(){ $('#hubWait').hidden=true; }

/* ───────── 도구 붙이기 ───────── */
function mount(id,opt){
  if(apis[id]) return Promise.resolve(apis[id]);
  if(pending[id]) return pending[id];
  const T=toolOf(id), box=boxOf(id);
  pending[id]=(async()=>{
    if(current===id) wait(T.wait||'불러오는 중…');
    let step=null;
    try{ for(const n of T.need){ step=n; if(n==='d3') await needD3(); else if(n==='topo') await needTopo(); else await needData(n); } }
    catch(e){
      pending[id]=null;
      const lib=step==='d3'||step==='topo';
      let msg=lib?'지도 라이브러리를 받아 오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.':'자료를 받아 오지 못했어요. 잠시 뒤 다시 시도해 주세요.';
      /* 웹 앱: 교사가 할 수 있는 행동을 안내하고 파일 정보는 콘솔에 남긴다 */
      if(MODE==='web'){ console.warn('불러오기 실패:',short(e&&e.message)); msg="자료를 불러오지 못했어요. 인터넷 연결을 확인하고 '다시 시도'를 눌러 주세요. 계속 안 되면 페이지를 새로 고쳐 주세요."; }
      if(current===id) wait(msg,()=>show(id));
      throw e;
    }
    box.append(document.getElementById('hub-tpl-'+id).content.cloneNode(true));
    try{ apis[id]=defs[id](box,opt||null)||{}; }
    catch(e){
      console.error(e); pending[id]=null; box.textContent='';
      if(current===id) wait('이 도구를 여는 중에 문제가 생겼어요. 새로고침해 주세요.');
      throw e;
    }
    try{ compactBars(id,box); }catch(e){ console.error('compactBars',e); }
    try{ document.dispatchEvent(new CustomEvent('hub:mounted',{detail:{id,box,opt:opt||null}})); }catch(e){ console.error(e); }
    if(current===id) unwait();
    return apis[id];
  })();
  return pending[id];
}

/* ───────── 탭 ───────── */
function show(id,opt){
  if(!toolOf(id)) id=TOOLS[0].id;
  current=id;
  for(const T of TOOLS){
    const on=T.id===id; boxOf(T.id).hidden=!on;
    const tb=tabOf(T.id); tb.setAttribute('aria-selected',on?'true':'false'); tb.tabIndex=on?0:-1;
  }
  document.querySelectorAll('.hub-group[data-g]').forEach(g=>g.classList.toggle('on',!!g.querySelector('.hub-tab[aria-selected="true"]')));
  if(id!=='home'){ try{ localStorage.setItem(LAST_KEY,id); }catch(e){} }
  try{ document.dispatchEvent(new CustomEvent('hub:show',{detail:id})); }catch(e){}
  if(apis[id]){ unwait(); return Promise.resolve(apis[id]); }
  if(pending[id]) wait(toolOf(id).wait||'불러오는 중…');
  return mount(id,opt);
}

function bindMenus(){
  const groups=[...document.querySelectorAll('.hub-group[data-g]')];
  const closeAll=()=>groups.forEach(g=>{ g.classList.remove('open'); g.querySelector('.hub-gl').setAttribute('aria-expanded','false'); });
  groups.forEach(g=>{
    const b=g.querySelector('.hub-gl'), items=[...g.querySelectorAll('.hub-mi')];
    b.addEventListener('click',e=>{ e.stopPropagation(); const was=g.classList.contains('open'); closeAll(); if(!was){ g.classList.add('open'); b.setAttribute('aria-expanded','true'); } });
    b.addEventListener('keydown',e=>{ if(e.key==='ArrowDown'){ e.preventDefault(); closeAll(); g.classList.add('open'); b.setAttribute('aria-expanded','true'); (items.find(m=>m.dataset.go===current)||items[0]).focus(); } });
    items.forEach((m,k)=>{
      m.addEventListener('click',()=>{ closeAll(); show(m.dataset.go).catch(()=>{}); });
      m.addEventListener('keydown',e=>{ if(e.key==='ArrowDown'){ e.preventDefault(); items[(k+1)%items.length].focus(); } else if(e.key==='ArrowUp'){ e.preventDefault(); items[(k-1+items.length)%items.length].focus(); } else if(e.key==='Escape'){ closeAll(); b.focus(); } });
    });
  });
  document.addEventListener('click',closeAll);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAll(); });
  const br=document.querySelector('.hub-brand'); if(br&&tabOf('home')){ br.style.cursor='pointer'; br.addEventListener('click',()=>show('home').catch(()=>{})); }
}
function bindTabs(){
  const order=TOOLS.map(t=>t.id);
  for(const T of TOOLS){
    const tb=tabOf(T.id);
    tb.addEventListener('click',()=>{ show(T.id).catch(()=>{}); });
    tb.addEventListener('keydown',e=>{
      const vis=order.filter(x=>tabOf(x).offsetParent); const i=vis.indexOf(T.id); let j=null; const n=vis.length;
      if(e.key==='ArrowRight') j=(i+1)%n; else if(e.key==='ArrowLeft') j=(i-1+n)%n;
      else if(e.key==='Home') j=0; else if(e.key==='End') j=n-1;
      if(j==null) return; e.preventDefault(); tabOf(vis[j]).focus(); show(vis[j]).catch(()=>{});
    });
  }
}

/* ───────── 도구끼리 넘겨주기: 자동 생성기 → 편집기 ───────── */
function bindLinks(){
  document.addEventListener('click',e=>{
    const a=e.target.closest&&e.target.closest('a[href^="#open:"]'); if(!a) return;
    e.preventDefault();
    const to=a.getAttribute('href').slice(6);
    const from=current; let d=null;
    if(to==='item'){   // 기후·백지도 → 문항 설계: 기호·대상·수치를 넘긴다
      show(to).then(api=>{ if(api&&api.pull) api.pull(from); }).catch(()=>{}); return; }
    if(to==='mapquick'&&apis[from]&&apis[from].mapRequest){   // 기후(지점)·에너지·종교·인구·농업(표의 나라) → 백지도 자동 생성(같은 기호)
      const req=apis[from].mapRequest();
      if(!req){ toast(from==='climate'?'지도에 찍을 지점이 없어요. 위도·경도가 있는 지점을 넣어 주세요.':'지도에 칠할 나라가 없어요. 표에 나라 이름을 넣어 주세요.'); return; }
      const fromName=((toolOf(from)||{}).name||'').replace(/ 그래프 편집기$/,'').trim();
      show(to).then(api=>{ if(api&&api.fromSpec) return api.fromSpec(req.spec,{q:req.q,from:from,fromName:fromName?`${fromName} 탭`:''}); }).catch(()=>{}); return; }
    if(from==='mapquick'&&to==='mapedit'&&apis.mapquick&&apis.mapquick.getDoc) d=apis.mapquick.getDoc();
    try{ localStorage.removeItem('wgmap-handoff'); }catch(err){}
    const msg='자동 생성기에서 만든 지도를 가져왔어요.';
    if(d&&!apis[to]&&!pending[to]){ show(to,{doc:d,msg}).catch(()=>{}); return; }
    show(to).then(api=>{ if(d&&api&&api.load) api.load({doc:d},msg); }).catch(()=>{});
  });
}

/* ───────── 작업 파일 갈래 나누기 ───────── */
function kindOf(d){
  if(!d||typeof d!=='object') return null;
  if(d.app==='energy') return 'energy';
  if(d.app==='religion') return 'religion';
  if(d.app==='population') return 'population';
  if(d.app==='agriculture') return 'agriculture';
  if(d.app==='landform') return 'landform';
  if(d.app==='kmap') return 'kmap';
  if(d.app==='kstat') return 'kstat';
  if(d.app==='item') return 'item';
  if(Array.isArray(d.stations)) return 'climate';
  const m=d.doc||d; if(m&&m.view&&m.frame&&Array.isArray(m.items)) return 'mapedit';
  return null;
}
function openWork(d){
  const id=kindOf(d);
  if(!id){ toast('이 통합판에서 만든 작업 파일이 아니에요.'); return; }
  if(id==='mapedit'&&!apis[id]&&!pending[id]){ show(id,{doc:d.doc||d}).catch(()=>{}); return; }
  show(id).then(api=>{ if(!api||!api.load||!api.load(d)) toast(toolOf(id).name+' 작업 파일을 읽지 못했어요.'); }).catch(()=>{});
}
function bindOpen(){
  const inp=$('#hubOpen');
  inp.addEventListener('change',async()=>{
    const f=inp.files&&inp.files[0]; if(!f) return;
    try{ openWork(JSON.parse(await f.text())); }catch(e){ toast('작업 파일(.json)을 읽지 못했어요.'); }
    inp.value='';
  });
}

/* ───────── 저장·파일 메뉴 모으기(F3): 모든 도구에서 [PNG 저장] [더 보기 ▾], 상단 [파일 ▾] ─────────
   단추를 새로 만들지 않고 기존 단추를 메뉴 안으로 옮기기만 한다(도구 코드의 동작·id는 그대로) */
const MORE_SEL=['#svgBtn','#copyBtn','#jsonBtn','#dpiSeg'];
const FILE_SEL=['#saveJson','label.filebtn:has(#loadJson)','#resetBtn','#newBtn'];
function menu(label,cls,items){
  const d=document.createElement('details'); d.className='mx '+cls;
  const sm=document.createElement('summary'); sm.className='btn'; sm.textContent=label; sm.setAttribute('aria-haspopup','menu');
  const pop=document.createElement('div'); pop.className='mx-pop'; pop.setAttribute('role','menu');
  d.append(sm,pop); items.forEach(el=>pop.append(el));
  pop.addEventListener('click',e=>{ const b=e.target.closest('button,a,label'); if(!b||b.closest('.seg')) return; setTimeout(()=>{ d.open=false; },0); });
  return d;
}
function compactBars(id,box){
  if(id==='home'||id==='item') return;
  const png=box.querySelector('.desk-bar #pngBtn')||box.querySelector('.top .top-actions #pngBtn'); if(png&&!box.querySelector('.mx-more')){ const area=png.parentElement;
    const items=MORE_SEL.map(s=>area.querySelector(':scope>'+s)).filter(Boolean); if(items.length) png.after(menu('더 보기','mx-more',items)); }
  const ta=box.querySelector('.top .top-actions'); if(ta&&!ta.querySelector('.mx-file')){ const items=FILE_SEL.map(s=>ta.querySelector(':scope>'+s)).filter(Boolean);
    if(items.length>1){ const m=menu('파일','mx-file',[]); items[0].before(m); items.forEach(el=>m.querySelector('.mx-pop').append(el)); } }
}
document.addEventListener('click',e=>{ document.querySelectorAll('details.mx[open]').forEach(d=>{ if(!d.contains(e.target)) d.open=false; }); });
/* 메뉴가 열릴 때 화면(휴대폰 폭 포함) 밖으로 나가지 않게 가로 위치를 맞춘다 */
document.addEventListener('toggle',e=>{ const d=e.target; if(!(d instanceof HTMLDetailsElement)||!d.classList.contains('mx')||!d.open) return;
  const p=d.querySelector('.mx-pop'); if(!p) return; p.style.left=''; p.style.right=''; p.style.maxWidth='calc(100vw - 16px)';
  const r=p.getBoundingClientRect(), W=document.documentElement.clientWidth, s=d.getBoundingClientRect();
  if(r.right>W-8) { p.style.left=(W-8-r.width-s.left)+'px'; p.style.right='auto'; }
  else if(r.left<8){ p.style.left=(8-s.left)+'px'; p.style.right='auto'; } },true);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.querySelectorAll('details.mx[open]').forEach(d=>{ d.open=false; d.querySelector('summary').focus(); }); });

/* ───────── 간단히 / 자세히: 화면에 보이는 설정만 바꾸고, 그림과 작업 내용은 그대로 ───────── */
const MODE_KEY='gm-mode-v1';
function setMode(m,save){
  m=m==='detail'?'detail':'simple';
  document.body.dataset.mode=m;
  document.querySelectorAll('#hubMode [data-m]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===m)));
  if(save){ try{ localStorage.setItem(MODE_KEY,m); }catch(e){} window.dispatchEvent(new Event('resize')); }
}
function bindMode(){
  let m='simple'; try{ if(localStorage.getItem(MODE_KEY)==='detail') m='detail'; }catch(e){}
  setMode(m,false);
  const seg=$('#hubMode'); if(seg) seg.addEventListener('click',e=>{ const b=e.target.closest('[data-m]'); if(b) setMode(b.dataset.m,true); });
  document.addEventListener('click',e=>{ const b=e.target.closest('[data-mode-go]'); if(!b) return; setMode(b.dataset.modeGo,true); toast('세부 설정을 모두 보여 줘요. 위쪽 ‘간단히’를 누르면 다시 줄어들어요.'); });
}

function start(){
  bindMode(); bindTabs(); bindMenus(); bindLinks(); bindOpen();
  let first=null;
  const h=(location.hash||'').replace(/^#/,''); if(toolOf(h)) first=h;
  show(first||TOOLS[0].id).catch(()=>{});
}

return {def,start,show,openWork,setMode,get apis(){ return apis; },get current(){ return current; }};
})();
