/* 인구 그래프 편집기: 자료 불러오기 · 표 · 설정 패널 · 미리 보기 */
HUB.def('population',function(ROOT){
'use strict';
const KEY='wgpopulation-editor-v1', UIKEY='wgpopulation-editor-ui-v1';
const $=s=>ROOT.querySelector(s);
function h(tag,attrs,...kids){
  const e=document.createElement(tag);
  if(attrs) for(const [k,v] of Object.entries(attrs)){
    if(v==null||v===false) continue;
    if(k==='class') e.className=v; else if(k.startsWith('on')) e.addEventListener(k.slice(2),v); else if(v===true) e.setAttribute(k,''); else e.setAttribute(k,String(v));
  }
  for(const c of kids.flat()) if(c!=null&&c!==false) e.append(c.nodeType?c:document.createTextNode(String(c)));
  return e;
}
try{ const el=document.getElementById('pg-data'); if(el) PG.setData(JSON.parse(el.textContent)); }catch(e){ /* 자료 없이도 붙여넣기는 된다 */ }
const HAS=!!PG.data();
const SRC_TXT='출처: UN, World Population Prospects 2024.';
const cv=$('#cv');
function exampleDoc(){
  const d=PG.freshDoc('sc'); if(!HAS) return d;
  /* 2025학년도 6월 16번과 같은 짜임: 네 대륙의 자연 증가율과 순 이동률, 1960년 → 2020년 */
  PG.presetSc(d,{rows:['앵글로아메리카','유럽','아시아','아프리카'],kx:'rnc',ky:'nmr',tps:['1960','2020']});
  EG.mask(d.data.rows,'gana'); d.meta.year=''; return d;
}
function loadLocal(){ try{ const s=localStorage.getItem(KEY); if(!s) return null; const d=JSON.parse(s); return d&&d.app==='population'?PG.normalizeDoc(d):null; }catch(e){ return null; } }
function saveLocal(){ try{ localStorage.setItem(KEY,JSON.stringify(doc)); localStorage.setItem(UIKEY,JSON.stringify(ui)); }catch(e){} }
let doc=loadLocal()||exampleDoc();
let ui=(()=>{ try{ return GG.clean(JSON.parse(localStorage.getItem(UIKEY)||'null')); }catch(e){ return null; } })()||{};
ui=Object.assign({pb:'trend',
  trend:{rows:['멕시코','세네갈','인도','독일'],keys:['rnc'],units:[0],tps:'1960~1965, 2015~2020'},
  sc:{rows:['아시아','아프리카','유럽','앵글로아메리카'],kx:'rnc',ux:0,ky:'gr',uy:1,tps:'1950~1955, 2015~2020'},
  cmp:{rows:['미국','나이지리아','독일','타이'],keys:['pop','rnc','cdr'],units:[1,0,0],tp:'2023'},
  share:{regions:['아메리카','아프리카','아시아'],n:5,tp:'2023'},proj:{rows:['세계'],k:'pop',unit:2,variants:['hi','med','lo'],tps:'1960, 1980, 2000, 2020, 2040, 2060, 2080, 2100'},paste:{text:'',unit:''}},ui);
if(!ui.proj) ui.proj={rows:['세계'],k:'pop',unit:2,variants:['hi','med','lo'],tps:'1960, 1980, 2000, 2020, 2040, 2060, 2080, 2100'};
if(!ui.mig) ui.mig={dest:'미국',rev:'2024',year:'2024',mode:'pick',origins:['멕시코','인도','중국','필리핀'],n:5};
if(!ui.age) ui.age={rows:['일본','인도','나이지리아'],mode:'pyr',year:'2023',tp:'2023',mask:true};
let dpi=600, raf=0, axisRefresh=[];

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2600); }
let MS={sync(){},request:()=>null};
function changed(what){
  const fc=EG.applyFills(doc);
  saveLocal();
  if(fc&&!['all','tb','tbo'].includes(what)) renderTable();
  if(what==='all'){ renderTable(); renderOpts(); renderPB(); }
  else if(what==='opts') renderOpts();
  else if(what==='tb') renderTable();
  else if(what==='tbo'){ renderTable(); renderOpts(); }
  MS.sync();
  schedule();
}
function schedule(){ if(raf) return; raf=requestAnimationFrame(()=>{ raf=0; draw(); }); }

/* ───────── 공통 조각 ───────── */
function bindSeg(el,get,set){
  const sync=()=>el.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===String(get()))));
  el.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||!el.contains(b)) return; set(b.dataset.v); sync(); });
  sync(); return sync;
}
function seg(opts,get,set,rebuild){ const el=h('div',{class:'seg',role:'group'}); for(const [v,t] of opts) el.append(h('button',{type:'button','data-v':v},t)); bindSeg(el,get,v=>{ set(v); changed(rebuild); }); return el; }
function row(label,...ctl){ return h('div',{class:'row'},h('span',{class:'lab'},label),...ctl); }
function num(get,set,o){ o=o||{}; const el=h('input',{type:'number',min:o.min,max:o.max,step:o.step||'any',value:get(),'aria-label':o.aria||''});
  el.addEventListener('input',()=>{ const v=parseFloat(el.value); if(isFinite(v)&&(o.min==null||v>=o.min)&&(o.max==null||v<=o.max)){ set(v); changed(o.rebuild); } }); return el; }
function chk(label,get,set,rebuild){ const i=h('input',{type:'checkbox'}); i.checked=!!get(); i.addEventListener('change',()=>{ set(i.checked); changed(rebuild); }); return h('label',{class:'check'},i,label); }
function sel(opts,get,set,rebuild,aria){ const s=h('select',{'aria-label':aria||''}); for(const [v,t] of opts) s.append(h('option',{value:v},t)); s.value=String(get()); s.addEventListener('change',()=>{ set(s.value); changed(rebuild); }); return s; }
function txt(get,set,ph,aria,rebuild){ const i=h('input',{type:'text',value:get()||'',placeholder:ph||'','aria-label':aria||ph||''}); i.addEventListener('input',()=>{ set(i.value); changed(rebuild); }); return i; }
function range(get,set,min,max,step,fmt){ const v=h('span',{class:'val'},fmt(get())); const i=h('input',{type:'range',min,max,step,value:get()}); i.addEventListener('input',()=>{ set(+i.value); v.textContent=fmt(+i.value); changed(); }); return [i,v]; }
function axisHead(){ return h('div',{class:'axis-head'},h('span'),h('span'),h('span',null,'최솟값'),h('span',null,'최댓값'),h('span',null,'눈금 간격')); }
function lastAxes(){ return Object.assign({},EG.lastAxes(),PG.lastAxes()); }
function axisCtl(label,conf,key){
  const auto=h('input',{type:'checkbox'}); auto.checked=conf.auto!==false;
  const lo=h('input',{type:'number',step:'any','aria-label':label+' 최솟값'}), hi=h('input',{type:'number',step:'any','aria-label':label+' 최댓값'}), st=h('input',{type:'number',step:'any',min:0,'aria-label':label+' 눈금 간격'});
  const fill=()=>{ const a=conf.auto!==false?(lastAxes()[key]||conf):conf; lo.value=+(+a.lo).toFixed(3); hi.value=+(+a.hi).toFixed(3); st.value=+(+a.step).toFixed(3); lo.disabled=hi.disabled=st.disabled=conf.auto!==false; };
  auto.addEventListener('change',()=>{ if(!auto.checked){ const a=lastAxes()[key]; if(a){ conf.lo=a.lo; conf.hi=a.hi; conf.step=a.step; } } conf.auto=auto.checked; fill(); changed(); });
  const on=(el,k)=>el.addEventListener('input',()=>{ const v=parseFloat(el.value); if(isFinite(v)){ conf[k]=v; changed(); } });
  on(lo,'lo'); on(hi,'hi'); on(st,'step'); axisRefresh.push(fill); fill();
  return h('div',{class:'axis'},h('span',{class:'lab'},label),h('label',{class:'check'},auto,'자동'),lo,hi,st);
}
const fillSel=(get,set,aria)=>sel(EG.FILL_KEYS.map(k=>[k,EG.FILL_KO[k]]),get,set,null,aria);
const mkSel=(get,set,aria)=>sel(Object.entries(GG.MARKS).filter(([k])=>!['gd','gs','none'].includes(k)),get,set,null,aria);
function pbMsg(kind,text){ const m=$('#pbMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }

/* ───────── 자료 불러오기 ───────── */
function kindLabel(n){ const m=PG.meta(n); return m.kind==='country'?[m.reg,m.sub].filter(Boolean).join(' · '):m.kind==='region'?'대륙':m.kind==='sub'?'소지역':m.kind==='dev'?'개발 수준':n==='세계'?'세계':''; }
function placePicker(list,onChange,filter){
  const box=h('div',{class:'search'}); const chips=h('div',{class:'chips'});
  const draw=()=>{ chips.textContent=''; list.forEach((n,i)=>{ const x=h('button',{type:'button','aria-label':`${n} 빼기`},'×'); x.addEventListener('click',()=>{ list.splice(i,1); draw(); onChange(); }); chips.append(h('span',{class:'chip'},n,x)); });
    if(!list.length) chips.append(h('span',{class:'sub'},'아직 고른 곳이 없어요.')); };
  const inp=h('input',{type:'search',autocomplete:'off',placeholder:'나라·지역 이름 (예: 나이지리아, 아프리카)','aria-label':'나라·지역 찾기'}); const ul=h('ul',{class:'results'});
  const show=()=>{ ul.textContent=''; const q=inp.value.trim(); if(!q) return; const a=PG.aliasFind(q);
    const hits=PG.entities().filter(n=>(!filter||filter(n))&&(n.includes(q)||n===a)).slice(0,8);
    for(const n of hits){ const b=h('button',{type:'button',disabled:list.includes(n)},h('span',null,n),h('small',null,kindLabel(n))); b.addEventListener('click',()=>{ if(!list.includes(n)) list.push(n); inp.value=''; ul.textContent=''; draw(); onChange(); inp.focus(); }); ul.append(h('li',null,b)); }
    if(!hits.length) ul.append(h('li',null,h('button',{type:'button',disabled:true},`‘${q}’은(는) 이 자료에 없어요.`))); };
  inp.addEventListener('input',show); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const b=ul.querySelector('button:not([disabled])'); if(b){ e.preventDefault(); b.click(); } } });
  draw(); box.append(chips,inp,ul); return box;
}
function quickAdd(list,onChange){
  const s=h('select',{'aria-label':'여러 곳 한꺼번에 넣기'}); s.append(h('option',{value:''},'한꺼번에 넣기…'));
  const grp=(label,arr)=>{ const g=h('optgroup',{label}); arr.forEach(([v,t])=>g.append(h('option',{value:v},t))); s.append(g); };
  const regs=PG.entities().filter(n=>PG.meta(n).kind==='region'), subs=PG.entities().filter(n=>PG.meta(n).kind==='sub');
  grp('묶음',[['@@6','6대륙 (아시아~오세아니아)'],['@@dev','선진국 · 개발 도상국']]);
  grp('대륙의 나라 모두',regs.map(r=>['@'+r,r+'의 나라'])); grp('소지역의 나라 모두',subs.map(r=>['@'+r,r+'의 나라']));
  s.addEventListener('change',()=>{ const v=s.value; if(!v) return; let add=[];
    if(v==='@@6') add=['아시아','아프리카','유럽','라틴 아메리카','앵글로아메리카','오세아니아']; else if(v==='@@dev') add=['선진국','개발 도상국'];
    else { const R=v.slice(1); add=PG.entities().filter(c=>{ const m=PG.meta(c); return m.kind==='country'&&(m.reg===R||m.sub===R||(R==='아메리카'&&(m.reg==='라틴 아메리카'||m.reg==='앵글로아메리카'))); }); }
    for(const n of add) if(!list.includes(n)) list.push(n); s.value=''; onChange(true); }); return s;
}
const indOpts=()=>PG.IND_KEYS.map(k=>[k,PG.IND[k].name]);
function indPick(get,set,uget,uset,label){
  const u=h('select',{'aria-label':'단위'}); const fillU=()=>{ u.textContent=''; PG.IND[get()].units.forEach(([t],j)=>u.append(h('option',{value:j},t))); const j=uget(); u.value=String(j==null?(PG.IND[get()].u||0):j); };
  const s=sel(indOpts(),get,v=>{ set(v); uset(null); fillU(); saveLocal(); },'none',label||'지표'); fillU(); u.addEventListener('change',()=>{ uset(+u.value); saveLocal(); });
  return [s,u];
}
function tpList(text){ return String(text||'').split(/[,，\s]+(?=\d)/).map(s=>s.trim()).filter(Boolean); }
function tpCheck(list){ const bad=[], out=[]; const Y=new Set(PG.years());
  for(const s of list){ const tp=PG.parseTp(s); if(!tp){ bad.push(s); continue; } const ys=PG.tpYears(tp); if(ys.some(y=>!Y.has(y))){ bad.push(s); continue; } out.push(tp.label); } return {out,bad}; }
const TP_HELP='해(2023) 또는 기간(2015~2020)을 쉼표로 이어 적어요. 5년 단위 기간은 끝 해를 빼고(2015~2019년) 연평균을 내요. 1971~1980처럼 5의 배수가 아니면 끝 해까지 넣어요. 자연적 증감·순 이동·출생아 수·사망자 수는 기간 합계예요. 자료는 1950~2024년 해마다, 2025~2100년은 5년마다(중위 추계)예요. 도시화율·도시 인구·도시 인구 증가율은 2050년까지, 이민자 수·비율은 1990~2020년 5년마다와 2024년만 있어요. 도시 인구 증가율은 ‘2015~2020’처럼 기간으로 적으면 그 기간의 연평균이에요.';
let lastType=null;
function typeChanged(){ const t=doc.preset&&doc.preset.type; if(t!==lastType){ doc.meta.title=''; lastType=t; } }
function renderPB(){
  const B=$('#pbBody'); B.textContent='';
  if(!HAS&&ui.pb!=='paste') ui.pb='paste';
  syncPB();
  const people=(list)=>[h('div',{class:'row'},h('span',{class:'lab'},'나라·지역'),quickAdd(list,()=>renderPB())),placePicker(list,()=>saveLocal())];
  if(ui.pb==='trend'){ const t=ui.trend; if(!t.keys.length) t.keys=['rnc'];
    const ind=t.keys.map((k,i)=>{ const [s,u]=indPick(()=>t.keys[i],v=>t.keys[i]=v,()=>t.units[i],v=>t.units[i]=v,`지표 ${i+1}`); const x=i?h('button',{class:'ico x',type:'button','aria-label':'지표 빼기'},'×'):null; if(x) x.addEventListener('click',()=>{ t.keys.splice(i,1); t.units.splice(i,1); saveLocal(); renderPB(); }); return row(i?`지표 ${i+1}`:'지표',s,u,x); });
    const add=h('button',{class:'btn small',type:'button'},'+ 지표 칸'); add.addEventListener('click',()=>{ if(t.keys.length<3){ t.keys.push('nmig'); t.units.push(null); saveLocal(); renderPB(); } });
    B.append(...people(t.rows),...ind,row('',add,h('span',{class:'sub'},'지표마다 꺾은선 칸이 하나씩 생겨요.')),
      row('시점',txt(()=>t.tps,v=>{ t.tps=v; saveLocal(); },'1960~1965, 2015~2020','시점','none')),
      PG.data().var?row('추계 방식',sel(PG.variants(),()=>t.variant||'med',v=>{ t.variant=v; saveLocal(); },'none','2024년 이후 추계 방식')):null,
      h('div',{class:'mini'},...[['1950~2020 10년 간격',()=>'1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020'],['1970~2020 10년 간격',()=>'1970, 1980, 1990, 2000, 2010, 2020'],['10년 묶음 1971~2020',()=>'1971~1980, 1981~1990, 1991~2000, 2001~2010, 2011~2020'],['5년 기간 두 개',()=>'1960~1965, 2015~2020']].map(([l,f])=>{ const b=h('button',{class:'btn small',type:'button'},l); b.addEventListener('click',()=>{ t.tps=f(); saveLocal(); renderPB(); }); return b; })),
      h('p',{class:'src-note'},TP_HELP));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      const {out,bad}=tpCheck(tpList(t.tps)); if(!t.rows.length){ pbMsg('err','나라나 지역을 하나 이상 골라 주세요.'); return; } if(!out.length){ pbMsg('err','시점을 알아보지 못했어요. 예: 1960~1965, 2015~2020'); return; }
      const r=PG.presetTrend(doc,{rows:t.rows,keys:t.keys,units:t.units,tps:out,variant:t.variant}); typeChanged(); if(!['line','dumb','group','tb','stack'].includes(doc.kind)) doc.kind=out.length===2?'dumb':'line'; PG.groupAxis(doc); doc.ln.y.auto=true; doc.dumb.y.auto=true;
      pbMsg(bad.length||r.missing.length?'warn':'ok',`행은 나라·지역, 열은 시점이에요.${bad.length?` ${bad.join(', ')}은(는) 자료 범위 밖이라 뺐어요.`:''}${r.missing.length?` ${r.missing.join(', ')}은(는) 자료에 없어요.`:''} ${PG.srcText(t.keys)}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='sc'){ const c=ui.sc;
    const [sx,uxs]=indPick(()=>c.kx,v=>c.kx=v,()=>c.ux,v=>c.ux=v,'가로축 지표'), [sy,uys]=indPick(()=>c.ky,v=>c.ky=v,()=>c.uy,v=>c.uy=v,'세로축 지표');
    B.append(...people(c.rows),row('가로축',sx,uxs),row('세로축',sy,uys),
      row('시점',txt(()=>c.tps,v=>{ c.tps=v; saveLocal(); },'1960, 2020','시점','none')),
      h('p',{class:'sub'},'시점을 두 개 적으면 앞 시점(○)과 뒤 시점(●)을 선으로 이어요(2024학년도 9월 12번, 2025학년도 6월 16번 양식).'),h('p',{class:'src-note'},TP_HELP));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      const {out,bad}=tpCheck(tpList(c.tps)); if(!c.rows.length){ pbMsg('err','나라나 지역을 하나 이상 골라 주세요.'); return; } if(!out.length){ pbMsg('err','시점을 알아보지 못했어요. 예: 1960, 2020'); return; }
      const r=PG.presetSc(doc,{rows:c.rows,kx:c.kx,ky:c.ky,ux:c.ux,uy:c.uy,tps:out}); typeChanged(); doc.kind='sc'; doc.sc.x.auto=true; doc.sc.y.auto=true;
      pbMsg(bad.length?'warn':'ok',`열은 (가로축, 세로축) 짝이 시점마다 하나씩이에요.${bad.length?` ${bad.join(', ')}은(는) 자료 범위 밖이라 뺐어요.`:''}${r.missing.length?` ${r.missing.join(', ')}은(는) 자료에 없어요.`:''} ${PG.srcText([c.kx,c.ky])}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='cmp'){ const c=ui.cmp;
    const ind=c.keys.map((k,i)=>{ const [s,u]=indPick(()=>c.keys[i],v=>c.keys[i]=v,()=>c.units[i],v=>c.units[i]=v,`지표 ${i+1}`); const x=h('button',{class:'ico x',type:'button','aria-label':'지표 빼기'},'×'); x.addEventListener('click',()=>{ c.keys.splice(i,1); c.units.splice(i,1); saveLocal(); renderPB(); }); return row(`지표 ${i+1}`,s,u,x); });
    const add=h('button',{class:'btn small',type:'button'},'+ 지표'); add.addEventListener('click',()=>{ c.keys.push('tfr'); c.units.push(null); saveLocal(); renderPB(); });
    B.append(...people(c.rows),...ind,row('',add),row('시점',txt(()=>c.tp,v=>{ c.tp=v; saveLocal(); },'2023','시점','none')),h('p',{class:'src-note'},TP_HELP));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      const {out}=tpCheck(tpList(c.tp)); if(!c.rows.length||!c.keys.length){ pbMsg('err','나라와 지표를 하나 이상 골라 주세요.'); return; } if(!out.length){ pbMsg('err','시점을 알아보지 못했어요. 예: 2023'); return; }
      const r=PG.presetCmp(doc,{rows:c.rows,keys:c.keys,units:c.units,tp:out[0]}); typeChanged(); if(!['tb','group'].includes(doc.kind)) doc.kind='tb'; PG.groupAxis(doc);
      pbMsg(r.missing.length?'warn':'ok',`행은 나라·지역, 열은 지표예요(2027학년도 6월 15번 양식).${r.missing.length?` ${r.missing.join(', ')}은(는) 자료에 없어요.`:''} ${PG.srcText(c.keys)}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='share'){ const s=ui.share; const regs=['아시아','아프리카','유럽','아메리카','라틴 아메리카','앵글로아메리카','오세아니아','세계'];
    const g=h('div',{class:'ckgrid'}); for(const r of regs){ const i=h('input',{type:'checkbox'}); i.checked=s.regions.includes(r); i.addEventListener('change',()=>{ const j=s.regions.indexOf(r); if(i.checked&&j<0) s.regions.push(r); if(!i.checked&&j>=0) s.regions.splice(j,1); saveLocal(); }); g.append(h('label',{class:'check'},i,r)); }
    B.append(row('지역'),g,row('상위',num(()=>s.n,v=>s.n=v,{min:1,max:10,step:1,aria:'상위 몇 개국',rebuild:'none'}),h('span',{class:'unit'},'개국 · 시점'),txt(()=>s.tp,v=>{ s.tp=v; saveLocal(); },'2023','시점','none')),
      h('p',{class:'sub'},'지역 인구에서 1위~N위 나라가 차지하는 비율이에요(2027학년도 9월 6번 양식). 아메리카는 라틴 아메리카와 앵글로아메리카를 더한 값이에요.'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      const {out}=tpCheck(tpList(s.tp)); if(!s.regions.length){ pbMsg('err','지역을 하나 이상 골라 주세요.'); return; }
      const r=PG.presetShare(doc,{regions:s.regions,n:s.n,tp:out[0]||'2023'}); typeChanged(); if(doc.kind!=='stack') doc.kind='tree';
      pbMsg('ok',r.regions.map((g,i)=>`${g}: ${r.names[i].join(', ')}`).join(' / ')+'. '+SRC_TXT); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='proj'){ const c=ui.proj; const V=PG.data().var;
    const indK=PG.IND_KEYS.filter(k=>PG.varIndOk(k)); if(!indK.includes(c.k)) c.k='pop';
    const u=h('select',{'aria-label':'단위'}); const fillU=()=>{ u.textContent=''; PG.IND[c.k].units.forEach(([t],j)=>u.append(h('option',{value:j},t))); u.value=String(c.unit==null?(PG.IND[c.k].u||0):c.unit); }; fillU(); u.addEventListener('change',()=>{ c.unit=+u.value; saveLocal(); });
    const ks=sel(indK.map(k=>[k,PG.IND[k].name]),()=>c.k,v=>{ c.k=v; c.unit=null; fillU(); saveLocal(); },'none','지표');
    const g=h('div',{class:'ckgrid'}); for(const [k,ko] of PG.variants()){ const i=h('input',{type:'checkbox'}); i.checked=c.variants.includes(k); i.addEventListener('change',()=>{ const j=c.variants.indexOf(k); if(i.checked&&j<0) c.variants.push(k); if(!i.checked&&j>=0) c.variants.splice(j,1); saveLocal(); }); g.append(h('label',{class:'check',title:(V&&V.list.find(x=>x[0]===k)||[])[2]||'Medium variant'},i,ko)); }
    B.append(...people(c.rows),row('지표',ks,u),row('추계 방식'),g,row('해',txt(()=>c.tps,v=>{ c.tps=v; saveLocal(); },'1960, 1980, … 2100','해','none')),
      h('p',{class:'src-note'},`2023년까지는 추정값이고, 그 뒤는 고른 추계 방식의 값이에요. 중위 추계 말고는 총인구·합계 출산율·중위 연령·자연 증가율·인구 증가율만, 2030~2100년 10년마다 들어 있어요. 행은 추계 방식(나라가 여럿이면 ‘나라 추계’)이에요.`));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      const {out,bad}=tpCheck(tpList(c.tps)); const ys=out.filter(t=>/^\d{4}$/.test(t)); if(!c.rows.length){ pbMsg('err','나라나 지역을 하나 이상 골라 주세요.'); return; } if(!c.variants.length){ pbMsg('err','추계 방식을 하나 이상 골라 주세요.'); return; } if(!ys.length){ pbMsg('err','해를 적어 주세요. 예: 1960, 1980, 2000, 2020, 2040'); return; }
      const r=PG.presetProj(doc,{rows:c.rows,k:c.k,unit:c.unit,variants:c.variants,tps:ys}); typeChanged(); if(!['line','group','tb'].includes(doc.kind)) doc.kind='line'; doc.ln.y.auto=true; PG.groupAxis(doc);
      const miss=r.lost.length?` 값이 없는 칸 ${r.lost.length}개(${r.lost.slice(0,3).join(', ')}${r.lost.length>3?' …':''})는 비워 두었어요. 중위 말고는 2030~2100년 10년마다만 있어요.`:'';
      pbMsg(miss||bad.length?'warn':'ok',`행은 추계 방식, 열은 해예요.${miss}${bad.length?` ${bad.join(', ')}은(는) 해로 읽지 못했어요.`:''} ${SRC_TXT}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='age'){ const a=ui.age; const Y=PG.pyrYears(); const hasPyr=Y.length>0; if(!hasPyr) a.mode='stack';
    const yearCtl=a.mode==='pyr'?sel(Y.map(y=>[String(y),`${y}년`]),()=>Y.includes(+a.year)?String(a.year):'2023',v=>{ a.year=v; saveLocal(); },'none','해')
      :txt(()=>a.tp,v=>{ a.tp=v; saveLocal(); },'2023','시점','none');
    B.append(row('그래프',hasPyr?seg([['pyr','인구 피라미드'],['stack','연령층 비율 막대']],()=>a.mode,v=>{ a.mode=v; saveLocal(); renderPB(); },'none'):h('span',{class:'sub'},'연령층 비율 막대')),
      ...people(a.rows),row(a.mode==='pyr'?'해':'시점',yearCtl),
      a.mode==='pyr'?row('',chk('나라 이름을 (가)~(바)로 가리기',()=>a.mask,v=>{ a.mask=v; saveLocal(); },'none')):null,
      h('p',{class:'src-note'},a.mode==='pyr'?'5세 단위 남녀 인구가 그 나라 총인구에서 차지하는 비율(%)이에요. 85세 이상은 한 칸으로 묶었어요(2026학년도 9월 10번 양식). 피라미드는 1950~2020년 10년마다, 2023년, 2030~2100년 10년마다(중위 추계) 있어요.'
        :'유소년층(0~14세)·청장년층(15~64세)·노년층(65세 이상) 비율이에요(2027학년도 6월 15번 양식). 부양비·노령화 지수·청장년층 성비는 ‘지표 비교’, ‘두 지표’, ‘시기 변화’에서 지표로 고를 수 있어요.'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!a.rows.length){ pbMsg('err','나라나 지역을 하나 이상 골라 주세요.'); return; }
      if(a.mode==='pyr'){ const r=PG.presetPyr(doc,{rows:a.rows,year:a.year}); if(!r.rows.length){ pbMsg('err','고른 곳의 피라미드 자료가 없어요.'); return; } typeChanged(); doc.kind='pyr'; if(a.mask) PG.maskPyr(doc,'gana');
        pbMsg(r.yearNote||r.rows.length<a.rows.length?'warn':'ok',`행은 연령층, 열은 나라마다 남·여예요.${r.rows.length<a.rows.length?' 피라미드는 여섯 곳까지 그려요.':''}${r.yearNote?' '+r.yearNote:''} ${SRC_TXT}`); }
      else { const {out}=tpCheck(tpList(a.tp)); if(!out.length){ pbMsg('err','시점을 알아보지 못했어요. 예: 2023'); return; }
        const r=PG.presetAge(doc,{rows:a.rows,tp:out[0]}); typeChanged(); if(!['stack','tb','group'].includes(doc.kind)) doc.kind='stack'; doc.stack.norm=true; doc.stack.dir='h'; doc.stack.legend='bottom';
        pbMsg(r.missing.length?'warn':'ok',`행은 나라·지역, 열은 연령층이에요.${r.missing.length?` ${r.missing.join(', ')}은(는) 자료에 없어요.`:''} ${SRC_TXT}`); }
      syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='mig'){ const m=ui.mig; const R=PG.migRevs(); if(!R.includes(m.rev)) m.rev=R[0]; const Y=PG.migYears(m.rev); if(!Y.includes(String(m.year))) m.year=Y[Y.length-1];
    const D=PG.migDests(m.rev); if(!D.includes(m.dest)) m.dest=D.includes('미국')?'미국':D[0];
    B.append(row('판',seg(R.map(r=>[r,r+'년판']),()=>m.rev,v=>{ m.rev=v; saveLocal(); renderPB(); },'none')),
      row('거주국',sel(D.map(n=>[n,n]),()=>m.dest,v=>{ m.dest=v; saveLocal(); },'none','이민자가 사는 나라')),
      row('해',sel(Y.map(y=>[y,y+'년']),()=>String(m.year),v=>{ m.year=v; saveLocal(); },'none','해')),
      row('그릴 모양',seg([['rows','표·막대'],['share','비율 그림']],()=>m.shape||'rows',v=>{ m.shape=v; saveLocal(); renderPB(); },'none')),
      h('p',{class:'sub'},(m.shape||'rows')==='share'?'거주국 한 칸 안에 출신국별 비율을 그려요(면적 비율 또는 누적 막대). 값은 이민자 수(천 명)이고, 비율은 저절로 계산해요.':'출신국마다 한 행씩 이민자 수를 적어요(표 또는 묶은 막대, 2026학년도 9월 15번 양식).'),
      (m.shape||'rows')==='share'?row('',chk('나머지 출신국은 ‘기타’로 (그 나라 안 이민자 전체에서 뺀 값)',()=>m.other!==false,v=>{ m.other=v; saveLocal(); },'none')):null,
      row('출신국',seg([['pick','직접 고르기'],['top','많은 순']],()=>m.mode,v=>{ m.mode=v; saveLocal(); renderPB(); },'none')),
      ...(m.mode==='pick'?[placePicker(m.origins,()=>saveLocal(),n=>PG.meta(n).kind==='country')]:[row('상위',num(()=>m.n,v=>m.n=v,{min:1,max:15,step:1,aria:'상위 몇 개국',rebuild:'none'}),h('span',{class:'unit'},'개국'))]),
      h('p',{class:'src-note'},'UN 국제 이주자 통계(1990~2020년 5년마다와 2024년). 2020년판은 2026학년도 9월 15번처럼 지난 기출이 쓴 값이에요(2024년판에서는 미국 내 독일 출신이 1,148천 명으로 바뀌었고, 세네갈처럼 작은 출신국은 따로 실리지 않았어요). 나라끼리 1천 명 이상인 경우만 들어 있어요. 나라별 이민자 수·이민자 비율은 ‘지표 비교’, ‘시기 변화’에서 지표로 고를 수 있어요.'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(m.mode==='pick'&&!m.origins.length){ pbMsg('err','출신국을 하나 이상 골라 주세요.'); return; }
      const share=(m.shape||'rows')==='share';
      const r=PG.presetMigOD(doc,{dest:m.dest,rev:m.rev,year:m.year,origins:m.mode==='pick'?m.origins:[],n:m.n,shape:share?'share':'rows',other:m.other!==false}); typeChanged();
      if(share){ if(!['tree','stack','tb'].includes(doc.kind)) doc.kind='tree'; Object.assign(doc.tree,{sort:true,inLbl:'both',top:'none'}); Object.assign(doc.stack,{norm:true,trans:false,inLbl:'both',legend:'none',leader:true,sortSeg:true}); }
      else { if(!['tb','group'].includes(doc.kind)) doc.kind='tb'; PG.groupAxis(doc); }
      pbMsg(r.lost.length?'warn':'ok',`${share?`열은 출신 국가예요. 칸 크기는 ${r.dest} 안 이민자 수(${r.rev}년판)의 비율이에요.${r.other!=null?` 기타는 ${r.dest} 안 이민자 전체(${Math.round(r.total).toLocaleString('ko-KR')}천 명)에서 고른 출신국을 뺀 값이에요.`:''}`:`행은 출신 국가, 값은 ${r.dest} 안 이민자 수예요(${r.rev}년판).`}${r.lost.length?` ${EG.josa(r.lost.join(', '),'은','는')} 이 판에 따로 실리지 않아 빈칸이에요${r.rev==='2024'?'(2020년판에는 있을 수 있어요)':''}.`:''} 출처: UN, International Migrant Stock ${r.rev}.`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='paste'){ const p=ui.paste;
    const ta=h('textarea',{spellcheck:'false',placeholder:'엑셀에서 표를 복사해 붙여 넣으세요.\n첫 줄: (빈칸) 항목1 항목2 …\n다음 줄부터: 이름 값 값 …','aria-label':'붙여 넣을 표'}); ta.value=p.text||''; ta.addEventListener('input',()=>{ p.text=ta.value; saveLocal(); });
    const unit=h('input',{type:'text',value:p.unit||'',placeholder:'단위 (예: %, 천 명)','aria-label':'단위'}); unit.addEventListener('input',()=>{ p.unit=unit.value; saveLocal(); });
    const tpl=h('button',{class:'btn small',type:'button'},'피라미드 틀 넣기'); tpl.addEventListener('click',()=>{ ta.value=p.text=PG.PYR_TEMPLATE; saveLocal(); toast('5세 단위 연령층 틀을 넣었어요. 남·여 값을 채워 넣으세요.'); });
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{ const r=EG.parseTable(ta.value); if(r.error){ pbMsg('err',r.error); return; }
      EG.setTable(doc,r.rows.map(n=>({name:n})),r.cols.map(n=>({name:n,other:/^기타$/.test(n.trim())})),r.v); Object.assign(doc.data,{unit:p.unit||'',measure:'',note:'',noteSum:false,rowNoun:'국가',itemNoun:'항목'}); doc.preset={type:'paste'}; doc.meta.year=''; typeChanged();
      const pyr=r.cols.length>=2&&r.rows.every(n=>/^\s*\d+/.test(n))&&r.cols.some(c=>/남|여/.test(c)); if(pyr) doc.kind='pyr';
      pbMsg(r.bad?'warn':'ok',`${r.rows.length}행 × ${r.cols.length}열을 읽었어요.${r.bad?` 숫자가 아닌 칸 ${r.bad}개는 빈칸으로 두었어요.`:''}${pyr?' 연령층 자료라 인구 피라미드로 그렸어요.':''} 출처와 연도는 오른쪽 ‘제목·연도·출처’에 적어 주세요.`); syncTop(); changed('all'); });
    B.append(ta,h('div',{class:'paste-row'},unit,tpl,go),h('p',{class:'sub'},'자료에 없는 값(통계청 자료, 도시화율 등)을 붙여 넣어 쓰세요. 피라미드는 첫 열에 나이(0~4, 5~9 …), 다음 열에 ‘(가) 남’, ‘(가) 여’처럼 적어요.')); }
}
const syncPB=bindSeg($('#pbSeg'),()=>ui.pb,v=>{ ui.pb=v; pbMsg('',''); saveLocal(); renderPB(); });

/* ───────── 표 ───────── */
function renderTable(){
  const D=doc.data; const T=$('#dtab'); T.textContent=''; const tools=$('#tbTools'); tools.textContent='';
  const empty=!D.rows.length||!D.cols.length; $('#tbEmpty').hidden=!empty; $('#dtabWrap').hidden=empty;
  $('#tbInfo').textContent=empty?'':`${D.rows.length}행 × ${D.cols.length}열${D.unit?` · 단위 ${D.unit}`:''}`;
  const unit=h('input',{type:'text',value:D.unit||'',placeholder:'단위','aria-label':'단위',style:'width:80px;flex:none'}); unit.addEventListener('input',()=>{ D.unit=unit.value; changed(); });
  const addR=h('button',{class:'btn small',type:'button'},'+ 행'); addR.addEventListener('click',()=>{ D.rows.push({id:GG.uid(),name:`행 ${D.rows.length+1}`,lbl:'',fill:EG.PALETTE[D.rows.length%EG.PALETTE.length],mk:PG.MKS[D.rows.length%PG.MKS.length]}); D.v.push(D.cols.map(()=>null)); EG.labelNew(D.rows,D.rows[D.rows.length-1],x=>!x.other); changed('tb'); });
  const addC=h('button',{class:'btn small',type:'button'},'+ 열'); addC.addEventListener('click',()=>{ const oi=D.cols.findIndex(c=>c.other); const at=oi>=0?oi:D.cols.length; const prev=D.cols[at-1]||{}; D.cols.splice(at,0,{id:GG.uid(),name:`항목 ${D.cols.length+1}`,lbl:'',fill:EG.PALETTE[(at+1)%EG.PALETTE.length],unit:prev.unit,grp:prev.grp}); D.v.forEach(r=>r.splice(at,0,null)); EG.labelNew(D.cols,D.cols[at],x=>!x.other); changed('tb'); });
  tools.append(h('div',{class:'row'},h('span',{class:'lab'},'단위'),unit,addR,addC));
  const maskBtns=(list,which)=>{ const box=h('div',{class:'mini'});
    const mk=(t,fn,on)=>{ const b=h('button',{class:'btn small'+(on?' on':''),type:'button','aria-pressed':on==null?null:String(!!on)},t); b.addEventListener('click',()=>{ fn(); changed('tbo'); }); return b; };
    const cur=EG.seqOfList(list,x=>!x.other); box.append(...[['A','latin'],['(가)','gana'],['㉠','circ']].map(([t,q])=>mk(t,()=>EG.mask(list,q,x=>!x.other),cur===q)),mk('이름',()=>list.forEach(x=>x.lbl=''),!list.some(x=>x.lbl)));
    if(which==='rows') box.append(mk('순서 섞기',()=>shuffleRows()));
    return box; };
  tools.append(h('div',{class:'row'},h('span',{class:'lab'},'열 라벨'),maskBtns(D.cols,'cols')),h('div',{class:'row'},h('span',{class:'lab'},'행 라벨'),maskBtns(D.rows,'rows')));
  { const fm=h('select',{'aria-label':'무늬 매기는 방식'}); [['ramp','비율 큰 것부터 연하게 → 진하게 → 빗금'],['rampR','비율 큰 것부터 진하게 → 연하게 → 빗금'],['manual','직접 고르기 (지금 무늬 그대로)']].forEach(([v,t])=>fm.append(h('option',{value:v},t)));
    fm.value=D.fillMode==='ramp'||D.fillMode==='rampR'?D.fillMode:'manual'; fm.addEventListener('change',()=>{ D.fillMode=fm.value; changed('tbo'); });
    tools.append(h('div',{class:'row'},h('span',{class:'lab'},'무늬'),fm)); }
  if(empty) return;
  const thead=h('thead'); const hr=h('tr'); hr.append(h('th',{class:'rh corner'},'라벨 · 이름',h('br'),'(행 표시는 꺾은선 점 모양)'));
  D.cols.forEach((c,j)=>{ const nm=h('input',{class:'nm',value:c.name,'aria-label':`열 ${j+1} 이름`}); nm.addEventListener('input',()=>{ c.name=nm.value; changed(); refreshHint(); });
    const lb=h('input',{class:'lb',value:c.lbl||'',placeholder:'라벨','aria-label':`${c.name} 라벨`}); lb.addEventListener('input',()=>{ c.lbl=lb.value; changed(); refreshHint(); });
    const un=h('input',{class:'lb',value:c.unit||'',placeholder:'단위','aria-label':`${c.name} 단위`,style:'width:56px'}); un.addEventListener('input',()=>{ c.unit=un.value; changed(); });
    const fs=fillSel(()=>c.fill||'white',v=>{ c.fill=v; doc.data.fillMode='manual'; },`${c.name} 무늬`);
    const mv=d=>{ const k=j+d; if(k<0||k>=D.cols.length) return; [D.cols[j],D.cols[k]]=[D.cols[k],D.cols[j]]; EG.swapKeep(D.cols[j],D.cols[k]); D.v.forEach(r=>{ [r[j],r[k]]=[r[k],r[j]]; }); changed('tb'); };
    const l=h('button',{class:'ico',type:'button',title:'왼쪽으로','aria-label':'왼쪽으로',disabled:j===0},'◀'); l.addEventListener('click',()=>mv(-1));
    const r=h('button',{class:'ico',type:'button',title:'오른쪽으로','aria-label':'오른쪽으로',disabled:j===D.cols.length-1},'▶'); r.addEventListener('click',()=>mv(1));
    const x=h('button',{class:'ico x',type:'button',title:'열 지우기','aria-label':`${c.name} 열 지우기`},'×'); x.addEventListener('click',()=>{ D.cols.splice(j,1); D.v.forEach(rw=>rw.splice(j,1)); EG.relabelKeep(D.cols,x=>!x.other); changed('tbo'); });
    const hid=h('input',{type:'checkbox'}); hid.checked=!c.hide; hid.addEventListener('change',()=>{ c.hide=!hid.checked; changed('tbo'); });
    hr.append(h('th',{class:c.hide?'hid':null},h('div',{class:'colh'},nm,h('div',{class:'tag'},lb,un),h('div',{class:'tag'},fs,h('label',{title:'그래프에 그리기'},hid,'보임')),c.grp?h('div',{class:'tag'},c.grp):null,h('div',{class:'tools'},l,r,x)))); });
  thead.append(hr); T.append(thead);
  const tb=h('tbody');
  D.rows.forEach((rw,i)=>{ const tr=h('tr',{class:rw.hide?'hid':null});
    const lb=h('input',{class:'lb',value:rw.lbl||'',placeholder:'라벨','aria-label':`${rw.name} 라벨`}); lb.addEventListener('input',()=>{ rw.lbl=lb.value; changed(); refreshHint(); });
    const nm=h('input',{class:'nm',value:rw.name,'aria-label':`행 ${i+1} 이름`}); nm.addEventListener('input',()=>{ rw.name=nm.value; changed(); refreshHint(); });
    const mv=d=>{ const k=i+d; if(k<0||k>=D.rows.length) return; [D.rows[i],D.rows[k]]=[D.rows[k],D.rows[i]]; EG.swapKeep(D.rows[i],D.rows[k]); [D.v[i],D.v[k]]=[D.v[k],D.v[i]]; changed('tb'); };
    const up=h('button',{class:'ico',type:'button',title:'위로','aria-label':'위로',disabled:i===0},'↑'); up.addEventListener('click',()=>mv(-1));
    const dn=h('button',{class:'ico',type:'button',title:'아래로','aria-label':'아래로',disabled:i===D.rows.length-1},'↓'); dn.addEventListener('click',()=>mv(1));
    const x=h('button',{class:'ico x',type:'button',title:'행 지우기','aria-label':`${rw.name} 행 지우기`},'×'); x.addEventListener('click',()=>{ D.rows.splice(i,1); D.v.splice(i,1); EG.relabelKeep(D.rows,x=>!x.other); changed('tbo'); });
    const hid=h('input',{type:'checkbox',title:'그래프에 그리기'}); hid.checked=!rw.hide; hid.addEventListener('change',()=>{ rw.hide=!hid.checked; changed('tbo'); });
    const ms=mkSel(()=>rw.mk||PG.MKS[i%PG.MKS.length],v=>rw.mk=v,`${rw.name} 점 모양`);
    tr.append(h('th',{class:'rh'},h('div',{class:'rowh'},lb,nm,h('span',{class:'tools'},up,dn,x)),h('div',{class:'tag'},ms,h('label',null,hid,'보임'))));
    D.cols.forEach((c,j)=>{ const v=D.v[i][j]; const inp=h('input',{class:'v'+(GG.fin(v)?'':' bad'),type:'text',inputmode:'decimal',value:GG.fin(v)?String(+v.toFixed(4)):'','aria-label':`${rw.name} ${c.name}`});
      inp.addEventListener('input',()=>{ const t=inp.value.trim().replace(/[−–]/g,'-').replace(/,/g,''); const n=t===''?null:+t; const bad=t!==''&&!isFinite(n); inp.classList.toggle('bad',bad||t===''); D.v[i][j]=bad?null:n; changed(); });
      tr.append(h('td',null,inp)); });
    tb.append(tr); });
  T.append(tb);
}
function shuffleRows(){ const D=doc.data; const idx=D.rows.map((_,i)=>i); for(let i=idx.length-1;i>0;i--){ const k=Math.floor(Math.random()*(i+1)); [idx[i],idx[k]]=[idx[k],idx[i]]; }
  const lbls=D.rows.map(r=>r.lbl); D.rows=idx.map(i=>D.rows[i]); D.v=idx.map(i=>D.v[i]); D.rows.forEach((r,i)=>r.lbl=lbls[i]); }

/* ───────── 문장으로 만들기 ───────── */
const sampleCap=(window.claude&&typeof window.claude.use==='function')?window.claude.use('sample').catch(()=>null):Promise.resolve(null);
let undoDoc=null;
function askMsg(kind,text){ const m=$('#askMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }
function describe(d){
  const D=d.data; const R=D.rows.filter(r=>!r.hide), C=D.cols.filter(c=>!c.hide);
  if(d.preset&&d.preset.type==='pyr'){ const g=[]; for(const c of C) if(c.ent&&!g.some(x=>x[1]===c.ent)) g.push([c.grp,c.ent]); return `${PG.KIND_KO[d.kind]} · ${g.map(([l,n])=>l&&l!==n?`${l} ${n}`:n).join(', ')} · ${d.preset.year}년`; }
  let t=`${PG.KIND_KO[d.kind]} · ${R.map(r=>r.lbl&&r.lbl!==r.name?`${r.lbl} ${r.name}`:r.name).join(', ')}`;
  const ks=[...new Set(C.map(c=>c.key).filter(Boolean))].map(k=>PG.IND[k].name); if(ks.length) t+=` · ${ks.join(', ')}`;
  const tps=[...new Set(C.map(c=>c.tp||c.t).filter(Boolean))]; if(tps.length) t+=` · ${tps.join(', ')}`;
  return t;
}
function symFind(n){ const t=String(n||'').trim(); if(!t) return null; const D=doc.data;
  if(D.cols.some(c=>c.name===t)||D.rows.some(r=>r.name===t||(Array.isArray(r.top)&&r.top.includes(t)))) return t;
  return PG.aliasFind(t)||null; }
function parseSym(t){ const o={}; String(t||'').split(/[,，;]/).forEach(x=>{ const m=x.trim().match(/^(.+?)\s*(?:=|:|→|\s)\s*(\S+)$/); if(m){ const n=symFind(m[1])||m[1].trim(); o[n]=m[2]; } }); return Object.keys(o).length?o:undefined; }
function symText(o){ return o?Object.entries(o).map(([n,s])=>`${n}=${s}`).join(', '):''; }
function symNote(pairs,miss){ const ok=pairs.filter(([n])=>!miss.includes(n)); let t='';
  if(ok.length) t+=` ${ok.map(([n,s])=>`${n} → ${s}`).join(', ')}.`; if(miss.length) t+=` ${EG.josa(miss.join(', '),'은','는')} 표에 없어 기호를 붙이지 못했어요.`; return t; }
async function run(){
  if(!HAS){ askMsg('err','UN 자료가 실려 있지 않아 문장으로 만들 수 없어요. ‘붙여넣기’로 표를 넣어 주세요.'); return; }
  const q0=$('#q').value.trim(); if(!q0){ $('#q').focus(); return; }
  /* ‘미국은 A, 중국은 B’처럼 기호를 정한 부분은 떼어 두었다가 표를 만든 뒤 붙인다. 기호만 적었으면 지금 표에 바로 붙인다 */
  const SY=EG.symbolsIn(q0,symFind); const q=SY.pairs.length?SY.stripped:q0;
  if(SY.pairs.length&&!/[가-힣A-Za-z0-9]/.test(q)){ undoDoc=JSON.stringify(doc); const miss=EG.applySymbols(doc,SY.pairs); changed('all'); refreshHint(); askMsg(miss.length?'warn':'ok',symNote(SY.pairs,miss).trim()); $('#undoBtn').hidden=false; return; }
  const r=PG.parseRequest(q); let spec=r.spec, via='규칙', missing=[];
  if(!r.understood){ const sample=await sampleCap;
    if(sample){ askMsg('warn','문장을 Claude에게 물어보는 중이에요…'); $('#goBtn').disabled=true;
      try{ const out=await sample.json(PG.buildPrompt(q),{modelTier:'quick'}); const sp=PG.cleanSpec(out); if(sp){ spec=sp; via='Claude'; missing=Array.isArray(out.missing)?out.missing.map(String):[]; } }
      catch(e){ /* 규칙 해석으로 */ } finally{ $('#goBtn').disabled=false; } } }
  if(via==='규칙'&&!r.understood){ askMsg('err','무엇을 그릴지 알아보지 못했어요. 나라·지역 이름, 지표(예: 합계 출산율, 인구의 자연 증가율), 시점(예: 2015~2020)을 함께 적어 주세요.'+(r.notes.length?' '+r.notes.join(' '):'')); return; }
  undoDoc=JSON.stringify(doc);
  const {doc:d,info}=PG.specToDoc(spec,doc); const symMiss=SY.pairs.length?EG.applySymbols(d,SY.pairs):[];
  if(!d.data.rows.length){ askMsg('err','고른 나라가 이 자료에 없어요. 나라 이름을 확인해 주세요.'); undoDoc=null; return; }
  doc=PG.normalizeDoc(d); lastType=doc.preset&&doc.preset.type; syncTop(); changed('all');
  if(info.template){ ui.pb='paste'; ui.paste.text=PG.PYR_TEMPLATE; saveLocal(); renderPB(); }
  const miss=[...new Set([...(info.missing||[]),...missing])];
  let text=describe(doc)+'.'; if(miss.length) text+=` ${miss.join(', ')}은(는) 자료에 없어 빠졌어요.`;
  if(info.yearNote) text+=' '+info.yearNote;
  if(info.lost&&info.lost.length) text+=` ${EG.josa(info.lost.join(', '),'은','는')} ${info.rev}년판에 따로 실리지 않아 빈칸이에요.${info.rev==='2024'?' 지난 기출(2020년판) 값은 문장에 ‘2020년판’을 넣으면 나와요.':''}`;
  if(info.rev) text+=` (국제 이주자 통계 ${info.rev}년판)`;
  if(doc.preset&&doc.preset.type!=='migod'){ const ks=[...new Set(doc.data.cols.map(c=>c.key).filter(Boolean))]; if(ks.some(k=>/^(urb|rur|upop|rpop|ugr|rgr)$/.test(k))) text+=' 도시화는 UN 세계 도시화 전망 2025년판이에요. 지난 기출 값은 문장에 ‘2018년판’을 넣으면 나와요.'; }
  if(SY.pairs.length) text+=symNote(SY.pairs,symMiss);
  if(r.notes.length&&via==='규칙') text+=' '+r.notes.join(' '); if(via==='Claude') text+=' (Claude가 해석)';
  askMsg(miss.length||info.template||(info.lost&&info.lost.length)?'warn':'ok',text); $('#undoBtn').hidden=false;
}
$('#goBtn').addEventListener('click',run);
$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); run(); } });
$('#undoBtn').addEventListener('click',()=>{ if(!undoDoc) return; doc=PG.normalizeDoc(JSON.parse(undoDoc)); undoDoc=null; $('#undoBtn').hidden=true; syncTop(); changed('all'); askMsg('ok','문장으로 만들기 전으로 되돌렸어요.'); });
const EXAMPLES=[
  '앵글로아메리카, 유럽, 아시아, 아프리카의 인구의 자연 증가율과 순 이동률 산점도 1960년, 2020년, 지역은 (가)~(라)',
  '아시아, 아프리카, 유럽, 앵글로아메리카의 자연 증가율과 전체 증가율(‰) 산점도 1950~1955년, 2015~2020년, 대각선, 지역은 A~D',
  '멕시코, 세네갈, 인도, 독일의 인구의 자연 증가율 두 시기 비교 1960~1965년, 2015~2020년, 국가는 (가)~(라)',
  '이집트, 멕시코, 독일의 인구의 자연적 증감과 순 이동(백만 명) 1971~2020년 10년 단위 꺾은선, 국가는 (가)~(다)',
  '파키스탄, 브라질, 독일, 차드의 인구 밀도 변화 1970~2020년 10년 간격, 국가는 (가)~(라)',
  '미국, 나이지리아, 독일, 타이의 총인구(만 명), 자연 증가율, 사망률 표 2023, 국가는 (가)~(라)',
  '아시아, 아프리카, 유럽, 라틴 아메리카, 앵글로아메리카, 오세아니아의 합계 출산율 1960년, 1990년, 2020년 묶은 막대',
  '아메리카, 아프리카, 아시아의 국가별 인구 순위와 비율 2023, 지역은 (가)~(다)',
  '일본, 한국, 나이지리아, 독일의 중위 연령과 합계 출산율 산점도 2023, 국가는 A~D',
  '세계와 아프리카의 총인구(억 명) 추계 고위·중위·저위 1960~2100년 20년 간격',
  '나이지리아, 일본의 합계 출산율 추계 중위, 출산율 고정 2020, 2040, 2060, 2080, 2100',
  '일본, 인도, 나이지리아의 인구 피라미드 2023, 국가는 (가)~(다)',
  '아시아, 아프리카, 유럽의 유소년층 인구 비율과 노년층 인구 비율 산점도 1950년, 2020년, 지역은 (가)~(다)',
  '독일, 브라질, 앙골라의 노년 부양비와 총부양비 산점도 2023, 국가는 (가)~(다)',
  '한국, 미국, 인도, 니제르의 연령층별 인구 구조 2023, 국가는 A~D',
  '미국 내 이민자 수 멕시코, 세네갈, 인도, 독일 2020년판 표, 국가는 (가)~(라)',
  '한국, 일본, 중국, 인도의 도시화율 변화 1960~2020년 20년 간격',
  '나이지리아, 브라질, 독일의 연평균 도시 인구 증가율 2015~2020년 막대, 국가는 (가)~(다)',
  '수단, 영국, 타이의 도시 인구(만 명), 도시화율, 연평균 도시 인구 증가율 2020 2018년판 표, 국가는 (가)~(다)'
];
function renderExamples(){ const box=$('#exList'); box.textContent='';
  EXAMPLES.forEach(q=>{ const b=h('button',{class:'ex',type:'button'},q); b.addEventListener('click',()=>{ $('#q').value=q; run(); }); box.append(b); }); }

/* ───────── 설정 패널 ───────── */
function sec(title,...kids){ return h('section',{class:'sec'},h('h2',{class:'sec-title'},title),...kids); }
const IN_LBL=[['none','없음'],['name','이름'],['value','비율'],['both','둘 다']];
function renderOpts(){
  axisRefresh=[]; const P=$('#opts'); P.textContent=''; const k=doc.kind;
  if(k==='sc'){ const o=doc.sc;
    P.append(sec('산점도',
      h('p',{class:'sub'},'표의 열을 (가로축, 세로축) 짝으로 읽어요. 짝이 두 개면 앞 시점은 빈 점(○), 뒤 시점은 찬 점(●)이에요.'),
      row('',chk('두 시점을 선으로 잇기',()=>o.conn,v=>o.conn=v,'opts')),o.conn?row('',chk('선 끝 화살표',()=>o.arrow,v=>o.arrow=v)):null,
      row('',chk('대각선 (가로값 = 세로값)',()=>o.diag,v=>o.diag=v)),
      h('p',{class:'sub'},'자연 증가율과 전체 증가율을 함께 그릴 때 대각선보다 위는 순 유입, 아래는 순 유출이에요.'),
      row('',chk('0 선 (실선)',()=>o.zero,v=>{ o.zero=v; o.x.auto=true; o.y.auto=true; })),row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('점 옆에 행 라벨',()=>o.lbl,v=>o.lbl=v,'opts')),o.lbl?row('',chk('겹치면 떨어뜨리고 지시선으로 잇기',()=>o.leader!==false,v=>o.leader=v)):null,
      row('시점 범례',seg([['in','그래프 안'],['right','오른쪽'],['below','아래'],['none','없음']],()=>o.legend,v=>o.legend=v)),
      row('가로축 이름',txt(()=>o.xTitle,v=>o.xTitle=v,'비우면 지표 이름','가로축 이름')),row('세로축 이름',txt(()=>o.yTitle,v=>o.yTitle=v,'비우면 지표 이름','세로축 이름')),
      row('점 크기',num(()=>o.mks,v=>o.mks=v,{min:0.6,max:4,step:0.1,aria:'점 크기(mm)'}),h('span',{class:'unit'},'mm')),
      row('그래프 크기',num(()=>o.w,v=>o.w=v,{min:20,max:150,step:1,aria:'가로(mm)'}),h('span',{class:'unit'},'×'),num(()=>o.h,v=>o.h=v,{min:20,max:150,step:1,aria:'세로(mm)'}),h('span',{class:'unit'},'mm'))),
      sec('축 범위',axisHead(),axisCtl('가로축',o.x,'scx'),axisCtl('세로축',o.y,'scy')));
  }
  if(k==='line'){ const o=doc.ln;
    P.append(sec('꺾은선',
      h('p',{class:'sub'},'행은 선, 열은 시점이에요. 지표가 둘이면 칸이 두 개 생겨요(2025학년도 수능 18번, 2026학년도 수능 10번 양식). 점 모양은 표의 행에서 골라요.'),
      row('선 이름',seg([['end','선 끝 라벨'],['legend','아래 범례'],['none','없음']],()=>o.end,v=>o.end=v)),
      row('',chk('점선',()=>o.dash,v=>o.dash=v)),row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('0 선',()=>o.zero,v=>o.zero=v)),
      row('',chk('칸마다 같은 세로축',()=>o.shareY,v=>o.shareY=v)),
      row('가로축 끝',txt(()=>o.xUnit,v=>o.xUnit=v,'예: 년','가로축 끝 글자')),
      row('점 크기',num(()=>o.mks,v=>o.mks=v,{min:0.5,max:3,step:0.05,aria:'점 크기(mm)'}),h('span',{class:'unit'},'mm')),
      row('칸 크기',num(()=>o.w,v=>o.w=v,{min:15,max:150,step:1,aria:'가로(mm)'}),h('span',{class:'unit'},'×'),num(()=>o.h,v=>o.h=v,{min:15,max:150,step:1,aria:'세로(mm)'}),h('span',{class:'unit'},'간격'),num(()=>o.gap,v=>o.gap=v,{min:0,max:40,step:0.5,aria:'칸 간격(mm)'}))),
      sec('축 범위',axisHead(),axisCtl('세로축',o.y,'ln')));
  }
  if(k==='dumb'){ const o=doc.dumb;
    P.append(sec('두 시기 비교',
      h('p',{class:'sub'},'행마다 세로 막대 하나에 시점별 점을 찍고 이어요(2026학년도 9월 15번 양식). 첫 열은 빈 점(○), 마지막 열은 찬 점(●)이에요.'),
      row('시점 범례',seg([['in','그래프 안'],['right','오른쪽'],['below','아래'],['none','없음']],()=>o.legend,v=>o.legend=v)),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('0 선',()=>o.zero,v=>o.zero=v)),
      row('점 크기',num(()=>o.mks,v=>o.mks=v,{min:0.6,max:4,step:0.1,aria:'점 크기(mm)'}),h('span',{class:'unit'},'mm')),
      row('그래프 크기',num(()=>o.w,v=>o.w=v,{min:15,max:150,step:1,aria:'가로(mm)'}),h('span',{class:'unit'},'×'),num(()=>o.h,v=>o.h=v,{min:15,max:150,step:1,aria:'세로(mm)'}),h('span',{class:'unit'},'mm'))),
      sec('축 범위',axisHead(),axisCtl('세로축',o.y,'dumb')));
  }
  if(k==='pyr'){ const o=doc.pyr;
    P.append(sec('인구 피라미드',
      h('p',{class:'sub'},'첫 열(행 이름)에 나이, 열은 ‘남’, ‘여’ 짝이에요. 짝이 여럿이면 피라미드가 나란히 생겨요(2026학년도 9월 10번 양식). 이 엑셀에는 연령층 자료가 없어 붙여 넣어야 해요.'),
      row('',chk('나라마다 전체 인구 대비 비율(%)로',()=>o.pct,v=>o.pct=v)),
      row('나이 눈금',seg([['10','10세'],['20','20세']],()=>String(o.ageStep),v=>o.ageStep=+v)),
      row('',chk('가로축 자동',()=>o.auto!==false,v=>o.auto=v,'opts')),o.auto===false?row('최댓값',num(()=>o.max,v=>o.max=v,{min:0.5,max:100,step:0.5,aria:'최댓값'}),h('span',{class:'unit'},'눈금'),num(()=>o.step,v=>o.step=v,{min:0.5,max:50,step:0.5,aria:'눈금 간격'})):null,
      row('남자',fillSel(()=>o.male,v=>o.male=v,'남자 무늬'),h('span',{class:'unit'},'여자'),fillSel(()=>o.female,v=>o.female=v,'여자 무늬')),
      row('크기',num(()=>o.w,v=>o.w=v,{min:15,max:120,step:1,aria:'가로(mm)'}),h('span',{class:'unit'},'×'),num(()=>o.h,v=>o.h=v,{min:15,max:120,step:1,aria:'세로(mm)'}),h('span',{class:'unit'},'간격'),num(()=>o.gap,v=>o.gap=v,{min:0,max:30,step:0.5,aria:'간격(mm)'}))));
  }
  if(k==='tree'){ const o=doc.tree;
    P.append(sec('면적 비율',
      row('칸 모양',seg([['rect','직사각형'],['grid','계단형 100칸']],()=>o.layout,v=>o.layout=v)),
      row('칸 글자',seg(IN_LBL,()=>o.inLbl,v=>o.inLbl=v,'opts')),
      o.inLbl==='value'||o.inLbl==='both'?row('소수 자리',seg([['0','0'],['1','1']],()=>String(o.dec),v=>o.dec=+v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('% 표시',seg([['all','모든 칸'],['first','첫 칸만'],['none','안 붙임']],()=>o.pct||'all',v=>o.pct=v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('',chk('비율을 괄호로 묶기 — 예: (16.5%)',()=>!!o.paren,v=>o.paren=v)):null,
      row('범례',seg([['none','없음'],['bottom','아래'],['right','오른쪽']],()=>o.legend||'none',v=>{ o.legend=v; if(v!=='none'&&EG.distinctFills(doc)) toast('칸 무늬가 모두 같아서 범례로 구분되도록 서로 다른 무늬를 넣었어요.'); },'tbo')),
      h('p',{class:'sub'},'칸에 이름(또는 표의 라벨 칸에 적은 A, B…)이 들어가면 범례가 없어도 읽혀요(2024학년도 수능 18번). 비율만 적거나 글자를 뺄 때는 범례를 켜고, 칸 무늬를 서로 다르게 해 주세요.'),
      row('위 라벨',seg([['none','없음'],['lbl','행 라벨']],()=>o.top,v=>o.top=v)),
      row('',chk('큰 칸부터 (기타는 맨 끝)',()=>o.sort!==false,v=>o.sort=v)),
      row('한 변',num(()=>o.size,v=>o.size=v,{min:15,max:90,step:1,aria:'한 변(mm)'}),h('span',{class:'unit'},'mm · 간격'),num(()=>o.gap,v=>o.gap=v,{min:0,max:30,step:0.5,aria:'간격(mm)'}),h('span',{class:'unit'},'mm')),
      row('한 줄에',seg([['0','모두'],['1','1개'],['2','2개'],['3','3개'],['4','4개']],()=>String(o.cols||0),v=>o.cols=+v))));
  }
  if(k==='stack'){ const o=doc.stack; const dim=o.dir==='v'?o.v:o.h;
    P.append(sec('누적 막대',
      row('방향',seg([['h','가로'],['v','세로']],()=>o.dir,v=>{ o.dir=v; o.grid=v==='v'; },'opts')),
      row('값',seg([['pct','100% 비율'],['raw','값 그대로']],()=>o.norm!==false?'pct':'raw',v=>{ o.norm=v==='pct'; o.axis.auto=true; },'opts')),
      row('',chk('행과 열 바꾸기 (막대 = 열 항목)',()=>o.trans,v=>o.trans=v,'opts')),
      row('막대 안 글자',seg(IN_LBL,()=>o.inLbl,v=>o.inLbl=v,'opts')),
      o.inLbl==='value'||o.inLbl==='both'?row('소수 자리',seg([['0','0'],['1','1']],()=>String(o.dec),v=>o.dec=+v)):null,
      row('범례',seg([['bottom','아래'],['right','오른쪽'],['none','없음']],()=>o.legend,v=>o.legend=v)),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('테두리 상자',()=>o.frame,v=>o.frame=v)),
      row('막대 두께',num(()=>dim.barW,v=>dim.barW=v,{min:1,max:30,step:0.2,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'간격'),num(()=>dim.gap,v=>dim.gap=v,{min:0.5,max:40,step:0.2,aria:'막대 간격(mm)'})),
      row('값 축 길이',num(()=>dim.len,v=>dim.len=v,{min:15,max:180,step:1,aria:'값 축 길이(mm)'}),h('span',{class:'unit'},'mm'))),
      sec('축 범위',axisHead(),axisCtl('값 축',o.axis,'stack')));
  }
  if(k==='group'){ const o=doc.group;
    P.append(sec('묶은 막대',
      h('p',{class:'sub'},'행이 묶음, 열이 막대예요(2024학년도 수능 14번 양식). 묶음을 시점으로 바꾸려면 시기 변화 표의 행·열을 바꿔 붙여 넣으세요.'),
      row('막대 이름',seg([['legend','범례'],['bar','막대 위 라벨']],()=>o.barLbl?'bar':'legend',v=>{ o.barLbl=v==='bar'; if(o.barLbl) o.legend='none'; else if(o.legend==='none') o.legend='bottom'; },'opts')),
      !o.barLbl?row('범례',seg([['in','그래프 안'],['bottom','아래'],['right','오른쪽'],['none','없음']],()=>o.legend,v=>o.legend=v)):null,
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('테두리 상자',()=>o.frame,v=>o.frame=v)),
      !o.barLbl?row('',chk('막대 위에 값',()=>o.values,v=>o.values=v)):null,
      row('막대 두께',num(()=>o.barW,v=>o.barW=v,{min:0.5,max:20,step:0.1,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'묶음 간격'),num(()=>o.gap,v=>o.gap=v,{min:0.3,max:30,step:0.1,aria:'묶음 간격(mm)'})),
      row('높이',num(()=>o.len,v=>o.len=v,{min:10,max:150,step:1,aria:'높이(mm)'}),h('span',{class:'unit'},'mm'))),
      sec('축 범위',axisHead(),axisCtl('세로축',o.axis,'group')));
  }
  if(k==='tb'){ const o=doc.tb;
    P.append(sec('표',
      h('p',{class:'sub'},'열마다 단위와 소수 자리를 따로 써요(표의 열 머리에서 단위를 고칠 수 있어요).'),
      row('나타낼 값',seg([['value','값'],['rank','순위']],()=>o.mode,v=>o.mode=v,'opts')),
      o.mode==='rank'?row('순위',num(()=>o.rankN,v=>o.rankN=v,{min:1,max:10,step:1,aria:'몇 위까지'}),h('span',{class:'unit'},'위까지')):null,
      o.mode!=='rank'?row('',chk('천 단위 쉼표',()=>o.comma,v=>o.comma=v)):null,
      o.mode!=='rank'?row('단위 표기',seg([['auto','자동'],['head','열 머리마다'],['top','표 위'],['bottom','표 아래']],()=>o.unitPos||'auto',v=>o.unitPos=v,'opts')):null,
      o.mode!=='rank'&&EG.tableUnits(doc).pos!=='head'?row('',seg([['label',`(단위: ${EG.tableUnits(doc).units[0]})`],['paren',`(${EG.tableUnits(doc).units[0]})`]],()=>o.unitStyle||'label',v=>o.unitStyle=v)):null,
      o.mode!=='rank'?h('p',{class:'sub'},EG.tableUnits(doc).uni?'모든 열의 단위가 같으면 표 위 오른쪽에 한 번만 적어요(시험지 방식, 2025학년도 수능 8번 ‘(만 명)’). 열 머리마다 적으려면 ‘열 머리마다’를 고르세요.':'열마다 단위가 달라서 열 머리마다 적어요.'):null,
      o.mode!=='rank'&&EG.tableUnits(doc).pos==='head'?row('',chk('단위를 둘째 줄에',()=>o.unitLine,v=>o.unitLine=v)):null,
      o.mode!=='rank'?row('첫 칸',txt(()=>o.rowHead,v=>o.rowHead=v,'국가','첫 칸 이름')):null));
  }
  if(['stack','donut','tree'].includes(k)){ const D=doc.data; const rank=D.rows.some(r=>Array.isArray(r.top));
    P.append(sec('칸 정리',
      row('',chk('0.0%로 보일 만큼 작은 값은 그리지 않기 (기타에 합침)',()=>D.trim!==false,v=>D.trim=v)),
      rank?row('칸 이름',seg([['col','순위 (1위, 2위 …)'],['top','나라 이름']],()=>D.cellName==='top'?'top':'col',v=>{ D.cellName=v; })):null,
      rank?row('기호',txt(()=>symText(D.sym),v=>{ D.sym=parseSym(v); refreshHint(); },'예: 미국=A, 중국=B','나라별 기호')):null,
      h('p',{class:'sub'},rank?'기호를 적은 나라만 칸에 기호로 나와요. 문장에 ‘미국은 A, 중국은 B’처럼 적어도 돼요.':'특정 항목을 기호로 쓰려면 표의 라벨 칸에 적거나, 문장에 ‘미국은 A, 중국은 B’처럼 적어요.')));
  }
  /* 발문 단서 */
  const hint=h('section',{class:'sec',id:'hintSec'}); P.append(hint); refreshHint();
  /* 제목 · 연도 · 출처 · 주석 */
  const M=doc.meta;
  const notesBox=h('textarea',{class:'note-area',placeholder:'한 줄에 하나씩. 예: 2015~2020년 값은 연평균임.','aria-label':'덧붙일 주석'}); notesBox.value=M.notes||''; notesBox.addEventListener('input',()=>{ M.notes=notesBox.value; changed(); });
  const auto=PG.autoNotes(doc); const srcBtn=h('button',{class:'btn small',type:'button'},'UN 출처 넣기'); srcBtn.addEventListener('click',()=>{ M.src='(UN, World Population Prospects 2024)'; changed('opts'); });
  P.append(sec('제목 · 연도 · 출처 · 주석',
    row('제목',txt(()=>M.title,v=>M.title=v,'예: <인구의 자연 증가율>','제목')),
    row('연도',txt(()=>M.year,v=>M.year=v,'예: (2023)','연도')),
    row('출처',txt(()=>M.src,v=>M.src=v,'비우면 안 적어요','출처'),srcBtn),
    h('p',{class:'sub'},'세계지리 시험지는 출처 없이 연도만 적어요.'),
    row('',chk(auto.length?`자동 주석: ${auto.join(' ')}`:'자동 주석 (지금은 붙일 것이 없어요)',()=>M.autoNote,v=>M.autoNote=v)),
    notesBox));
  /* 글꼴 · 크기 */
  const S=doc.style;
  const fsel=fam=>sel(GG.FONTS[fam].map(f=>[f.key,f.label]),()=>fam==='serif'?S.serif:S.gothic,v=>{ if(fam==='serif') S.serif=v; else S.gothic=v; GG.clearMetrics(); },'opts',fam==='serif'?'명조 글꼴':'고딕 글꼴');
  const ff=fam=>{ const i=h('input',{type:'file',accept:'.ttf,.otf,.woff,.woff2'}); i.addEventListener('change',async()=>{ const f=i.files&&i.files[0]; if(!f) return; try{ const n=await GG.registerUserFont(fam,f); if(fam==='serif') S.serif='user'; else S.gothic='user'; GG.clearMetrics(); changed('opts'); toast(`${n} 글꼴을 불러왔어요.`); }catch(e){ toast('글꼴 파일을 읽지 못했어요.'); } }); return h('label',{class:'btn small filebtn'},fam==='serif'?'명조 파일':'고딕 파일',i); };
  P.append(h('details',{class:'sec'},h('summary',null,h('h2',{class:'sec-title'},'글꼴 · 글자 크기 · 무늬')),
    row('숫자·라벨',fsel('serif')),row('제목·주석',fsel('gothic')),h('p',{class:'sub'},fontStatus()),row('',h('span',{class:'sub'},'글꼴 파일:'),ff('serif'),ff('gothic')),
    row('눈금 숫자',...range(()=>S.tickPt,v=>{ S.tickPt=v; S.unitPt=Math.max(6,v-0.5); S.valuePt=Math.max(6,v-0.5); },6,11,0.5,v=>v+' pt')),
    row('행 이름',...range(()=>S.catPt,v=>S.catPt=v,6,12,0.5,v=>v+' pt')),
    row('표 글자',...range(()=>S.tablePt,v=>S.tablePt=v,6,12,0.5,v=>v+' pt')),
    row('칸 안 글자',...range(()=>S.segPt,v=>S.segPt=v,5.5,11,0.5,v=>v+' pt')),
    row('범례·제목',...range(()=>S.legendPt,v=>{ S.legendPt=v; S.titlePt=v+0.5; },6,11,0.5,v=>v+' pt')),
    row('주석',...range(()=>S.notePt,v=>S.notePt=v,5.5,10,0.5,v=>v+' pt')),
    row('선 굵기',...range(()=>S.lw,v=>S.lw=v,0.6,1.8,0.1,v=>'×'+v.toFixed(1))),
    row('무늬 간격',...range(()=>S.patScale,v=>S.patScale=v,0.6,1.8,0.05,v=>'×'+v.toFixed(2))),
    row('연한 회색',...range(()=>S.light,v=>S.light=v,180,245,1,v=>String(v))),
    row('회색',...range(()=>S.mid,v=>S.mid=v,120,220,1,v=>String(v))),
    row('진한 회색',...range(()=>S.dark,v=>S.dark=v,60,170,1,v=>String(v))),
    row('라틴 글자',seg([['','글꼴 그대로'],['times','Times']],()=>S.latin,v=>{ S.latin=v; GG.clearMetrics(); }))));
}
function fontStatus(){ const out=[]; for(const fam of ['serif','gothic']){ const f=GG.fontDef(doc,fam); if(f.web) continue; if(!GG.fontAvailable(f,fam)) out.push(`${f.label.replace(/ \(.*\)$/,'')} 글꼴이 이 컴퓨터에 없어 ${fam==='serif'?'Noto Serif KR':'Noto Sans KR'}로 대신 그려요.`); } return out.length?out.join(' '):'고른 글꼴이 이 컴퓨터에 있어요.'; }
function refreshHint(){
  const el=$('#hintSec'); if(!el) return; el.textContent=''; const H=PG.hintOf(doc); if(!H){ el.hidden=true; return; } el.hidden=false;
  const cp=h('button',{class:'btn small copy',type:'button'},'단서 문구 복사');
  cp.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(H.sentence); toast('발문 단서를 복사했어요.'); }catch(e){ toast('복사가 막혀 있어요. 문구를 직접 선택해 복사해 주세요.'); } });
  el.append(h('h2',{class:'sec-title'},'발문 단서 · 정답'),h('div',{class:'hint'},h('div',null,H.sentence),h('div',{class:'sub'},h('b',null,'정답: '),H.key),cp));
}

/* ───────── 그리기 ───────── */
function warnings(){
  const w=[]; const {R,C,M}=EG.derive(doc); if(!R.length||!C.length) return w;
  w.push(...EG.labelWarn(doc));
  const holes=[]; R.forEach((r,i)=>C.forEach((c,j)=>{ if(M[i][j]==null) holes.push(`${r.name}·${c.name}`); }));
  if(holes.length&&doc.kind!=='pyr') w.push(`빈칸 ${holes.length}개(${holes.slice(0,3).join(', ')}${holes.length>3?' …':''})는 그리지 않아요.`);
  if(doc.kind==='sc'&&C.length%2&&!C.every(c=>c.role)) w.push('산점도는 열을 (가로, 세로) 짝으로 읽어요. 마지막 열은 짝이 없어 빠졌어요.');
  if(doc.kind==='pyr'&&!C.some(c=>/남|여/.test(c.name))) w.push('피라미드는 열을 (남, 여) 짝으로 읽어요. 열 이름에 ‘남’, ‘여’를 넣어 주세요.');
  if(doc.kind==='pyr'&&holes.length===R.length*C.length) w.push('값이 비어 있어요. 연령층별 남녀 인구(또는 비율)를 채워 넣어 주세요.');
  if(['tree','stack'].includes(doc.kind)&&M.flat().some(v=>GG.fin(v)&&v<0)) w.push('음수 값은 비율 그림에서 0으로 처리해요.');
  if(doc.kind==='line'||doc.kind==='dumb'||doc.kind==='group'){ const us=[...new Set(C.map(c=>c.unit).filter(Boolean))]; if(doc.kind!=='line'&&us.length>1) w.push(`단위가 다른 열(${us.join(', ')})이 한 축에 그려져요.`); }
  return w;
}
function draw(){
  const desk=getComputedStyle(ROOT.body||ROOT).getPropertyValue('--desk').trim()||'#c7ccd2';
  const r=GG.paintSheet(doc,cv,{desk});
  $('#deskEmpty').hidden=!!r;
  const w=r?warnings():[]; const dw=$('#deskWarn'); dw.hidden=!w.length; dw.textContent=w.join(' ');
  if(r){ const Wd=r.R.W+2*GG.M, Hd=r.R.H+2*GG.M; $('#sizeInfo').textContent=`${Wd.toFixed(1)} × ${Hd.toFixed(1)} mm · ${Math.round(Wd/25.4*dpi)} × ${Math.round(Hd/25.4*dpi)} px`; } else $('#sizeInfo').textContent='';
  ['pngBtn','svgBtn','copyBtn'].forEach(id=>$('#'+id).disabled=!r);
  for(const f of axisRefresh) f();
  clearTimeout(draw.f); draw.f=setTimeout(()=>GG.ensureFonts(doc),250);
}
if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ GG.clearMetrics(); schedule(); });
new ResizeObserver(()=>schedule()).observe(cv.parentElement);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>schedule());

/* ───────── 내보내기 · 작업 파일 ───────── */
const KIND_FILE={sc:'인구_산점도',line:'인구_꺾은선',dumb:'인구_두시기',group:'인구_묶은막대',tb:'인구표',tree:'인구_면적비율',stack:'인구_누적막대',pyr:'인구피라미드'};
const stamp=()=>{ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const RESULT={saved:'저장했어요.',declined:'저장을 취소했어요.',busy:'잠시 뒤에 다시 눌러 주세요.',failed:'저장하지 못했어요.'};
async function busy(btn,fn){ btn.disabled=true; try{ await fn(); } finally{ btn.disabled=false; } }
$('#pngBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const b=await GG.renderPng(doc,{dpi}); toast(RESULT[await GG.saveFile(`${KIND_FILE[doc.kind]}_${stamp()}.png`,b,'image/png')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#svgBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const s=await GG.svgString(doc); toast(RESULT[await GG.saveFile(`${KIND_FILE[doc.kind]}_${stamp()}.svg`,s,'image/svg+xml')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#copyBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ await GG.copyPng(doc,{dpi}); toast('이미지를 복사했어요. 한글 문서에 바로 붙여 넣을 수 있어요.'); }catch(err){ toast('이 화면에서는 복사가 막혀 있어요. PNG 저장을 써 주세요.'); } }));
bindSeg($('#dpiSeg'),()=>dpi,v=>{ dpi=+v; schedule(); });
$('#saveJson').addEventListener('click',async()=>{ toast(RESULT[await GG.saveFile(`인구그래프_작업_${stamp()}.json`,JSON.stringify(doc,null,1),'application/json')]); });
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='population') throw 0; doc=PG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); }catch(err){ toast('인구 그래프 작업 파일이 아니에요.'); } e.target.value=''; });
const resetBtn=$('#resetBtn'); let resetArm=0;
resetBtn.addEventListener('click',()=>{ if(!resetArm){ resetBtn.textContent='한 번 더 누르면 지워요'; resetArm=setTimeout(()=>{ resetArm=0; resetBtn.textContent='새 작업'; },3000); return; }
  clearTimeout(resetArm); resetArm=0; resetBtn.textContent='새 작업'; doc=PG.freshDoc(doc.kind); syncTop(); changed('all'); pbMsg('',''); toast('새 작업을 시작했어요.'); });

/* ───────── 위쪽 막대 ───────── */
const syncKind=bindSeg($('#kindSeg'),()=>doc.kind,v=>{ doc.kind=v; changed('opts'); });
function syncTop(){ syncKind(); }
lastType=doc.preset&&doc.preset.type;
if(!HAS){ $('#pbSeg').querySelectorAll('button:not([data-v="paste"])').forEach(b=>b.disabled=true); }
renderPB(); renderTable(); renderOpts(); renderExamples(); schedule();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ GG.clearMetrics(); schedule(); });
MS=GG.mapSend($,()=>doc); MS.sync();
/* 통합판에서 다른 곳이 작업 파일을 넘겨줄 때 */
return {getDoc:()=>doc,mapRequest:()=>MS.request(),load:d=>{ if(!d||!(d.app==='population')) return false; doc=PG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); return true; }};
});