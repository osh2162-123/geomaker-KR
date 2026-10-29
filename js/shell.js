/* 통합판 겉틀: 탭 전환, 도구를 처음 열 때만 자료·라이브러리를 불러와 붙이기, 작업 파일 갈래 나누기 */
const HUB=(function(){
'use strict';
const MODE="web";            /* artifact: 자료 파일을 그때그때 받아 옴 · standalone: 모두 들어 있음 */
const TOOLS=[{"id": "home", "name": "홈", "need": [], "wait": ""}, {"id": "mapquick", "name": "백지도 자동 생성기", "need": ["d3"], "wait": "지도 라이브러리를 불러오는 중…"}, {"id": "mapedit", "name": "백지도 편집기", "need": ["d3"], "wait": "지도 라이브러리를 불러오는 중…"}, {"id": "kmap", "name": "한국지리 백지도", "need": ["topo", "kmdata"], "wait": "우리나라 경계 자료를 불러오는 중…"}, {"id": "landform", "name": "지형 모식도 편집기", "need": ["ldata"], "wait": "모식도 자료를 불러오는 중…"}, {"id": "climate", "name": "기후 그래프 편집기", "need": ["stations"], "wait": "기후 지점 자료를 불러오는 중…"}, {"id": "energy", "name": "에너지 그래프 편집기", "need": ["edata"], "wait": "에너지 자료를 불러오는 중…"}, {"id": "religion", "name": "종교 그래프 편집기", "need": ["rdata"], "wait": "종교 자료를 불러오는 중…"}, {"id": "population", "name": "인구 그래프 편집기", "need": ["pdata"], "wait": "인구 자료(약 8 MB)를 불러오는 중…"}, {"id": "agriculture", "name": "농업 그래프 편집기", "need": ["adata"], "wait": "농업 자료(약 4.5 MB)를 불러오는 중…"}, {"id": "item", "name": "문항 설계", "need": ["idata"], "wait": "성취기준·기출 자료를 불러오는 중…"}];
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
const DATAVER={"xlo": "4afd7f74c3", "lo": "3041a84396", "hi": "8c2e1839f0", "places": "f77e2744ea", "koppen": "a49c5a7b98", "plates": "42d4952d91", "relief": "867eb9d417", "stations": "21d0842fbc", "edata": "27d88225b0", "rdata": "bb16f47b9f", "pdata": "778a4c6cd7", "adata": "b90afd7aab", "ldata": "b66e20fd47", "kmdata": "e749e9e39d", "idata": "f93e3437aa"}; const oldFiles=[];
function checkVer(key,js){ const want=DATAVER[key]; if(!want) return; const have=(window.GMVER||{})[key]; if(have===want) return;
  oldFiles.push(short(js)); console.warn('옛 자료 파일:',short(js),have,'≠',want);
  let b=document.getElementById('hubOld'); if(!b){ b=document.createElement('div'); b.id='hubOld'; b.className='hub-bar'; b.setAttribute('role','alert'); document.body.append(b); }
  b.textContent=''; const t=document.createElement('span');
  t.textContent=`${oldFiles.join(', ')} 파일이 이 화면보다 옛 판이에요. 사이트의 data 폴더 안에 새 파일을 올려 주세요(맨 위에 올리면 쓰이지 않아요). 고칠 때까지 새 기능 일부가 보이지 않을 수 있어요.`;
  const x=document.createElement('button'); x.type='button'; x.className='hub-x'; x.setAttribute('aria-label','닫기'); x.textContent='×'; x.addEventListener('click',()=>b.remove());
  b.append(t,x); }
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
      /* 웹 앱: 어떤 파일이 없는지 알려 준다(폴더를 빠뜨리고 올린 경우가 많다) */
      if(MODE==='web') msg=`${lib?'라이브러리':'자료'} 파일(${short(e&&e.message)})을 받아 오지 못했어요. 사이트에 index.html과 함께 data·lib·icons 폴더가 그대로 올라가 있는지 확인해 주세요.`;
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
      show(to).then(api=>{ if(api&&api.fromSpec) return api.fromSpec(req.spec,{q:req.q,from:from,fromName:(toolOf(from)||{}).tab?`${(toolOf(from)||{}).tab} 탭`:''}); }).catch(()=>{}); return; }
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

function start(){
  bindTabs(); bindMenus(); bindLinks(); bindOpen();
  let first=null;
  const h=(location.hash||'').replace(/^#/,''); if(toolOf(h)) first=h;
  show(first||TOOLS[0].id).catch(()=>{});
}

return {def,start,show,openWork,get apis(){ return apis; },get current(){ return current; }};
})();
