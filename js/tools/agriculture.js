/* 농업 그래프 편집기: 자료 불러오기 · 표 · 설정 패널 · 미리 보기 */
HUB.def('agriculture',function(ROOT){
'use strict';
const KEY='wgagri-editor-v1', UIKEY='wgagri-editor-ui-v1';
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
try{ const el=document.getElementById('ag-data'); if(el) AG.setData(JSON.parse(el.textContent)); }catch(e){ /* 자료 없이도 붙여넣기는 된다 */ }
const HAS=!!AG.data();
const cv=$('#cv');
function exampleDoc(){
  const d=AG.freshDoc('stack'); if(!HAS) return d;
  /* 2027학년도 9월 17번과 같은 짜임: 밀·쌀·옥수수 생산 상위 3개국 비율(2023) */
  AG.presetTop(d,{items:['maize','rice','wheat'],el:'p',tp:'2023',n:3,other:true});
  EG.mask(d.data.rows,'gana'); Object.assign(d.stack,{dir:'h',legend:'none',inLbl:'name',sortSeg:true,norm:true,frame:true,grid:false,leader:true}); Object.assign(d.stack.h,{barW:4.6,gap:4.4});
  return d;
}
function loadLocal(){ try{ const s=localStorage.getItem(KEY); if(!s) return null; const d=JSON.parse(s); return d&&d.app==='agriculture'?AG.normalizeDoc(d):null; }catch(e){ return null; } }
function saveLocal(){ try{ localStorage.setItem(KEY,JSON.stringify(doc)); localStorage.setItem(UIKEY,JSON.stringify(ui)); }catch(e){} }
let doc=loadLocal()||exampleDoc();
let ui=(()=>{ try{ return GG.clean(JSON.parse(localStorage.getItem(UIKEY)||'null')); }catch(e){ return null; } })()||{};
ui=Object.assign({pb:'top',
  top:{items:['wheat','rice','maize'],el:'p',tp:'2023',agg:'mean',n:3,regions:[],other:true},
  reg:{items:['wheat','rice','maize'],el:'p',tp:'2023',agg:'mean',scheme:'6'},
  comp:{rows:['앵글로아메리카','오세아니아','라틴 아메리카','아시아','아프리카','유럽'],items:['sheep','pig','cattle'],el:'s',tp:'2023',agg:'mean'},
  cmp:{rows:['아프리카','오세아니아','아시아','유럽','아메리카'],items:['cereals'],els:['tx','tm'],tp:'2022',agg:'mean',unit:2},
  sc:{rows:['아시아','유럽','앵글로아메리카','라틴 아메리카','오세아니아','아프리카'],items:['wheat','maize'],ex:'p',ey:'tx',tp:'2019~2021',agg:'mean',unit:2},
  names:{items:['maize','rice'],el:'p',tp:'2014~2023',agg:'sum',n:5,order:'gana'},
  net:{item:'cereals',tp:'2018~2022',n:2},paste:{text:'',unit:'%'}},ui);
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
function lastAxes(){ return Object.assign({},EG.lastAxes(),PG.lastAxes(),AG.lastAxes()); }
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
function pbMsg(kind,text){ const m=$('#pbMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }

/* 표를 새로 만들면 누적 막대 모양을 일반 비율 막대로 되돌린다 */
function plainStack(){ const o=doc.stack; o.norm=true; o.sortSeg=false; o.inLbl='none'; o.legend='bottom'; o.frame=true; o.axis.auto=true; o.trans=false; }

/* ───────── 자료 불러오기 ───────── */
function kindLabel(n){ const m=AG.meta(n); return m.kind==='country'?[m.reg,m.sub].filter(Boolean).join(' · ')+(n==='중국'?' · 타이완·홍콩·마카오 포함':m.part?' · 중국 값에 포함':''):m.kind==='region'?'대륙':m.kind==='sub'?'소지역':m.kind==='world'?'세계':'묶음'; }
function placePicker(list,onChange){
  const box=h('div',{class:'search'}); const chips=h('div',{class:'chips'});
  const draw=()=>{ chips.textContent=''; list.forEach((n,i)=>{ const x=h('button',{type:'button','aria-label':`${n} 빼기`},'×'); x.addEventListener('click',()=>{ list.splice(i,1); draw(); onChange(); }); chips.append(h('span',{class:'chip'},n,x)); });
    if(!list.length) chips.append(h('span',{class:'sub'},'아직 고른 곳이 없어요.')); };
  const inp=h('input',{type:'search',autocomplete:'off',placeholder:'나라·지역 이름 (예: 브라질, 아시아)','aria-label':'나라·지역 찾기'}); const ul=h('ul',{class:'results'});
  const show=()=>{ ul.textContent=''; const q=inp.value.trim(); if(!q) return; const a=AG.aliasFind(q);
    const hits=Object.keys(AG.data().meta).filter(n=>n.includes(q)||n===a).slice(0,8);
    for(const n of hits){ const b=h('button',{type:'button',disabled:list.includes(n)},h('span',null,n),h('small',null,kindLabel(n))); b.addEventListener('click',()=>{ if(!list.includes(n)) list.push(n); inp.value=''; ul.textContent=''; draw(); onChange(); inp.focus(); }); ul.append(h('li',null,b)); }
    if(!hits.length) ul.append(h('li',null,h('button',{type:'button',disabled:true},`‘${q}’은(는) 이 자료에 없어요.`))); };
  inp.addEventListener('input',show); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const b=ul.querySelector('button:not([disabled])'); if(b){ e.preventDefault(); b.click(); } } });
  draw(); box.append(chips,inp,ul); return box;
}
function quickAdd(list){
  const s=h('select',{'aria-label':'여러 곳 한꺼번에 넣기'}); s.append(h('option',{value:''},'한꺼번에 넣기…'));
  const add=(label,arr)=>{ const g=h('optgroup',{label}); arr.forEach(([v,t])=>g.append(h('option',{value:v},t))); s.append(g); };
  add('묶음',[['@@6','대륙 6개 (앵글로·라틴 아메리카 나눔)'],['@@5','대륙 5개 (아메리카 하나로)']]);
  add('대륙의 나라 모두',['아시아','유럽','아프리카','오세아니아','앵글로아메리카','라틴 아메리카'].map(r=>['@'+r,r+'의 나라']));
  s.addEventListener('change',()=>{ const v=s.value; if(!v) return; let add2=[];
    if(v==='@@6') add2=AG.REGIONS6.slice(); else if(v==='@@5') add2=AG.REGIONS5.slice();
    else { const R=v.slice(1); add2=Object.entries(AG.data().meta).filter(([n,m])=>m.kind==='country'&&!m.old&&!m.part&&m.reg===R).map(([n])=>n); }
    for(const n of add2) if(!list.includes(n)) list.push(n); s.value=''; saveLocal(); renderPB(); }); return s; }
const people=list=>[h('div',{class:'row'},h('span',{class:'lab'},'나라·지역'),quickAdd(list)),placePicker(list,()=>saveLocal())];
const GRP_ORDER=['곡물','서류','기호·공업 작물','과일','가축','축산물'];
function itemChecks(list,ok,max){
  const g=h('div',{class:'ckgrid'});
  for(const grp of GRP_ORDER){ const its=AG.items(grp).filter(x=>!ok||ok(x.k)); if(!its.length) continue; g.append(h('div',{class:'ckgroup'},grp));
    for(const x of its){ const i=h('input',{type:'checkbox'}); i.checked=list.includes(x.k);
      i.addEventListener('change',()=>{ const j=list.indexOf(x.k); if(i.checked&&j<0){ list.push(x.k); if(max&&list.length>max){ list.shift(); renderPB(); } } if(!i.checked&&j>=0) list.splice(j,1); saveLocal(); });
      g.append(h('label',{class:'check'},i,x.ko)); } }
  return g; }
const EL_PICK=[['p','생산량'],['s','사육 두수'],['a','수확 면적'],['tx','수출량'],['tm','수입량'],['txv','수출액'],['fd','국내 공급량'],['fc','1인당 식용 공급량']];
const elOk=(k,el)=>{ const e=el==='x'?'tx':el==='m'?'tm':el; return AG.hasEl(k,AG.fixEl(k,e)); };
function elSel(get,set,aria){ return sel(EL_PICK,get,v=>{ set(v); saveLocal(); renderPB(); },'none',aria||'지표'); }
function tpRow(o){ return [row('시점',txt(()=>o.tp,v=>{ o.tp=v; saveLocal(); },'2023 또는 2018~2022','시점','none'),seg([['mean','평균'],['sum','합산']],()=>o.agg,v=>{ o.agg=v; saveLocal(); },'none')),
  h('p',{class:'src-note'},'해(2023) 또는 기간(2018~2022, 양 끝 포함)을 적어요. 기간은 평균 또는 합산을 골라요. 생산은 1961~2024년(2010년 이후 해마다), 교역은 1990~2024년(2010년 이후 해마다), 식량 수급표는 2010~2023년 자료예요.')]; }
const unitSel=(o,el)=>sel(AG.EL[el].units.map(([u],j)=>[String(j),u]),()=>String(o.unit==null?AG.EL[el].u:o.unit),v=>{ o.unit=+v; saveLocal(); },'none','단위');
let lastType=doc.preset&&doc.preset.type;
function typeChanged(){ const t=doc.preset&&doc.preset.type; if(t!==lastType){ doc.meta.title=''; lastType=t; } }
function srcTxt(){ const els=[...new Set(doc.data.cols.map(c=>c.el).filter(Boolean))]; const p=doc.preset||{}; if(p.type==='net') return AG.srcOf(['tx']); const e=p.el||(p.els&&p.els[0])||p.ex||'p'; return AG.srcOf(els.length?els:[e==='x'?'tx':e]); }
function riceNote(items,els){ return items.includes('rice')&&els.some(e=>e==='p')&&els.some(e=>['tx','tm','x','m','txv'].includes(e))?' 쌀 생산량은 벼(도정 전) 무게, 수출입량은 도정한 쌀 무게예요.':''; }
function renderPB(){
  const B=$('#pbBody'); B.textContent='';
  if(!HAS&&ui.pb!=='paste') ui.pb='paste';
  syncPB();
  if(ui.pb==='top'){ const t=ui.top;
    B.append(row('지표',elSel(()=>t.el,v=>t.el=v)),row('품목'),itemChecks(t.items,k=>elOk(k,t.el)),...tpRow(t),
      row('상위',num(()=>t.n,v=>t.n=v,{min:1,max:10,step:1,aria:'상위 몇 개국',rebuild:'none'}),h('span',{class:'unit'},'개국')));
    const g=h('div',{class:'ckgrid'}); for(const r of AG.REGIONS6.concat(['아메리카'])){ const i=h('input',{type:'checkbox'}); i.checked=t.regions.includes(r); i.addEventListener('change',()=>{ const j=t.regions.indexOf(r); if(i.checked&&j<0) t.regions.push(r); if(!i.checked&&j>=0) t.regions.splice(j,1); saveLocal(); }); g.append(h('label',{class:'check'},i,r)); }
    B.append(row('지역 한정'),g,h('p',{class:'sub'},'고르지 않으면 세계 전체에서 순위를 매겨요. 값은 품목마다 전 세계에서 그 나라가 차지하는 비율(%)이에요(2027학년도 9월 17번, 2025학년도 9월 11번 원그래프 양식).'),
      row('',chk('나머지는 ‘기타’로 (세계 전체일 때)',()=>t.other,v=>t.other=v,'none')));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!t.items.length){ pbMsg('err','품목을 하나 이상 골라 주세요.'); return; }
      const r=AG.presetTop(doc,{items:t.items,el:t.el,tp:t.tp,agg:t.agg,n:t.n,regions:t.regions,other:t.other}); typeChanged();
      if(!['stack','donut','tree','tb'].includes(doc.kind)) doc.kind='stack';
      if(doc.kind==='stack'){ Object.assign(doc.stack,{dir:'h',legend:'none',inLbl:'name',sortSeg:true,norm:!t.regions.length,frame:!t.regions.length,grid:false,leader:true}); doc.stack.axis.auto=true; doc.stack.trans=false; Object.assign(doc.stack.h,{barW:4.6,gap:4.4}); }
      if(doc.kind==='donut') Object.assign(doc.donut,{inLbl:'name',leader:true,sortSeg:true});
      doc.data.cols.forEach((c,j)=>{ if(c.other) c.fill='white'; });
      const tpTxt=r.tp?(r.tp.a===r.tp.b?`${r.tp.label}년`:`${r.tp.label}년 ${t.agg==='sum'?'합산':'평균'}`):'';
      pbMsg(r.lost.length?'warn':'ok',`행은 품목, 열은 상위 나라예요(${tpTxt}).${r.lost.length?` ${r.lost.join(', ')}은(는) 이 지표 자료가 없어 뺐어요.`:''}${(t.tp&&r.tp&&r.tp.label!==String(t.tp).replace(/년$/,''))?` 적은 시점의 자료가 없어 ${r.tp.label}년으로 그렸어요.`:''} ${srcTxt()}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='reg'){ const t=ui.reg;
    B.append(row('지표',elSel(()=>t.el,v=>t.el=v)),row('품목'),itemChecks(t.items,k=>elOk(k,t.el)),...tpRow(t),
      row('대륙 구분',seg([['6','6개 (앵글로·라틴 아메리카)'],['5','5개 (아메리카)']],()=>t.scheme,v=>{ t.scheme=v; saveLocal(); },'none')),
      h('p',{class:'sub'},'행은 품목, 열은 대륙이에요. 값은 품목마다 전 세계에서 각 대륙이 차지하는 비율(%)이라 행의 합이 100이에요. 러시아는 유럽에 들어가요.'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!t.items.length){ pbMsg('err','품목을 하나 이상 골라 주세요.'); return; }
      AG.presetReg(doc,{items:t.items,el:t.el,tp:t.tp,agg:t.agg,scheme:t.scheme}); plainStack(); typeChanged(); if(!['stack','donut','tb','group'].includes(doc.kind)) doc.kind='stack';
      pbMsg('ok',`행은 품목, 열은 대륙이에요. ${srcTxt()}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='comp'){ const t=ui.comp;
    B.append(...people(t.rows),row('지표',elSel(()=>t.el,v=>t.el=v)),row('품목'),itemChecks(t.items,k=>elOk(k,t.el)),...tpRow(t),
      h('p',{class:'sub'},'행은 나라·지역, 열은 품목이에요. 누적 막대는 행마다 고른 품목의 합을 100%로 그려요(2026학년도 9월 8번 가축 사육 두수 양식).'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!t.rows.length||!t.items.length){ pbMsg('err','나라·지역과 품목을 하나 이상 골라 주세요.'); return; }
      const r=AG.presetComp(doc,{rows:t.rows,items:t.items,el:t.el,tp:t.tp,agg:t.agg}); plainStack(); typeChanged(); if(!['stack','donut','tb','group'].includes(doc.kind)) doc.kind='stack';
      const F=['dark','light','mid','fs','dot','white']; doc.data.cols.forEach((c,j)=>c.fill=F[j%F.length]); Object.assign(doc.stack,{grid:true,frame:true}); doc.stack.axis={auto:false,lo:0,hi:100,step:10};
      pbMsg(r.missing.length?'warn':'ok',`행은 나라·지역, 열은 품목이에요.${r.missing.length?` ${r.missing.join(', ')}은(는) 값이 없어 뺐어요.`:''} ${srcTxt()}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='cmp'){ const t=ui.cmp;
    const g=h('div',{class:'ckgrid'}); for(const [e,ko] of EL_PICK){ const i=h('input',{type:'checkbox'}); i.checked=t.els.includes(e); i.addEventListener('change',()=>{ const j=t.els.indexOf(e); if(i.checked&&j<0) t.els.push(e); if(!i.checked&&j>=0) t.els.splice(j,1); saveLocal(); }); g.append(h('label',{class:'check'},i,ko)); }
    B.append(...people(t.rows),row('지표'),g,row('품목'),itemChecks(t.items),...tpRow(t),row('단위',unitSel(t,t.els[0]&&AG.EL[t.els[0]]?t.els[0]:'p')),
      h('p',{class:'sub'},'행은 나라·지역, 열은 (품목 × 지표)예요. 대륙 값에는 대륙 안 나라끼리의 교역도 들어가요(2025학년도 수능 12번 양식).'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!t.rows.length||!t.items.length||!t.els.length){ pbMsg('err','나라·지역, 품목, 지표를 하나 이상 골라 주세요.'); return; }
      const r=AG.presetCmp(doc,{rows:t.rows,items:t.items,els:t.els,tp:t.tp,agg:t.agg,unit:t.unit}); typeChanged(); if(!['group','tb','small'].includes(doc.kind)) doc.kind='group'; doc.group.axis.auto=true;
      pbMsg(r.missing.length||!r.pairs.length?'warn':'ok',`행은 나라·지역, 열은 품목·지표예요.${!r.pairs.length?' 고른 품목에 그 지표 자료가 없어요.':''}${r.missing.length?` ${r.missing.join(', ')}은(는) 값이 없어 뺐어요.`:''}${riceNote(t.items,t.els)} ${srcTxt()}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='sc'){ const t=ui.sc;
    B.append(...people(t.rows),row('품목 (1~2개)'),itemChecks(t.items,null,2),row('가로축',elSel(()=>t.ex,v=>t.ex=v,'가로축 지표')),row('세로축',elSel(()=>t.ey,v=>t.ey=v,'세로축 지표')),...tpRow(t),row('단위',unitSel(t,'p')),
      h('p',{class:'sub'},'품목이 둘이면 칸을 나란히 두 개 그려요(2024학년도 9월 19번: 밀·옥수수의 지역별 생산량과 수출량).'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!t.rows.length||!t.items.length){ pbMsg('err','나라·지역과 품목을 골라 주세요.'); return; }
      const r=AG.presetSc(doc,{rows:t.rows,items:t.items,ex:t.ex,ey:t.ey,tp:t.tp,agg:t.agg,unit:t.unit}); typeChanged(); doc.kind='sc';
      pbMsg(r.missing.length?'warn':'ok',`열은 품목마다 (가로축, 세로축) 짝이에요.${r.missing.length?` ${r.missing.join(', ')}은(는) 값이 없어 뺐어요.`:''}${riceNote(t.items,[t.ex,t.ey])} ${srcTxt()}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='names'){ const t=ui.names;
    B.append(row('지표',elSel(()=>t.el,v=>t.el=v)),row('품목'),itemChecks(t.items,k=>elOk(k,t.el)),...tpRow(t),
      row('상위',num(()=>t.n,v=>t.n=v,{min:1,max:10,step:1,aria:'상위 몇 개국',rebuild:'none'}),h('span',{class:'unit'},'개국'),seg([['gana','가나다순'],['rank','순위순']],()=>t.order,v=>{ t.order=v; saveLocal(); },'none')),
      h('p',{class:'sub'},'품목마다 상위 나라 이름만 적은 표예요(2026학년도 6월 13번: 생산량 상위 5개국을 가나다순으로).'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!t.items.length){ pbMsg('err','품목을 하나 이상 골라 주세요.'); return; }
      AG.presetNames(doc,{items:t.items,el:t.el,tp:t.tp,agg:t.agg,n:t.n,order:t.order}); typeChanged(); doc.kind='list';
      pbMsg('ok',`행은 나라, 열은 품목이에요. 이름 표는 열마다 값이 큰 나라 ${t.n}곳을 적어요. ${srcTxt()}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='net'){ const t=ui.net; const its=AG.items().filter(x=>AG.hasEl(x.k,'tx')&&AG.hasEl(x.k,'tm'));
    B.append(row('품목',sel(its.map(x=>[x.k,x.ko]),()=>t.item,v=>{ t.item=v; saveLocal(); },'none','품목')),
      row('해',txt(()=>t.tp,v=>{ t.tp=v; saveLocal(); },'2018~2022','해','none')),row('순위',num(()=>t.n,v=>t.n=v,{min:1,max:5,step:1,aria:'몇 위까지',rebuild:'none'}),h('span',{class:'unit'},'위까지')),
      h('p',{class:'sub'},'해마다 순 수출량(수출량 − 수입량)이 많은 나라와 순 수입량이 많은 나라를 적은 표예요(2025학년도 수능 12번 양식). 표의 행 라벨을 A, B로 바꾸면 이름 대신 라벨이 들어가요.'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      const tp=AG.parseTp(t.tp); if(!tp){ pbMsg('err','해를 알아보지 못했어요. 예: 2018~2022'); return; }
      const r=AG.presetNet(doc,{item:t.item,years:AG.tpYears(tp),n:t.n}); typeChanged(); doc.kind='list';
      pbMsg('ok',`${AG.itemName(r.k)} ${r.Y[0]}~${r.Y[r.Y.length-1]}년, 행은 상위에 한 번이라도 든 나라예요. ${srcTxt()}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='paste'){ const p=ui.paste;
    const ta=h('textarea',{spellcheck:'false',placeholder:'엑셀에서 표를 복사해 붙여 넣으세요.\n첫 줄: (빈칸) 항목1 항목2 …\n다음 줄부터: 이름 값 값 …','aria-label':'붙여 넣을 표'}); ta.value=p.text||''; ta.addEventListener('input',()=>{ p.text=ta.value; saveLocal(); });
    const unit=h('input',{type:'text',value:p.unit||'',placeholder:'단위 (예: %, 백만 t)','aria-label':'단위'}); unit.addEventListener('input',()=>{ p.unit=unit.value; saveLocal(); });
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{ const r=EG.parseTable(ta.value); if(r.error){ pbMsg('err',r.error); return; }
      EG.setTable(doc,r.rows.map(n=>({name:n})),r.cols.map(n=>({name:n,other:/^기타$/.test(n.trim())})),r.v); plainStack(); Object.assign(doc.data,{unit:p.unit||'',measure:'',note:'',noteSum:false,rowNoun:'국가',itemNoun:'항목'}); doc.preset={type:'paste'}; doc.meta.year='';
      pbMsg(r.bad?'warn':'ok',`${r.rows.length}행 × ${r.cols.length}열을 읽었어요.${r.bad?` 숫자가 아닌 칸 ${r.bad}개는 빈칸으로 두었어요.`:''} 출처와 연도는 오른쪽 ‘제목·연도·출처’에 적어 주세요.`); changed('all'); });
    B.append(ta,h('div',{class:'paste-row'},unit,go),h('p',{class:'sub'},'USDA·통계청 등 다른 자료는 여기에 붙여 넣어 쓰면 돼요. ‘기타’라는 이름의 열은 기타 칸으로 처리해요.')); }
}
const syncPB=bindSeg($('#pbSeg'),()=>ui.pb,v=>{ ui.pb=v; pbMsg('',''); saveLocal(); renderPB(); });


/* ───────── 표 ───────── */
/* ───────── 표 ───────── */
function renderTable(){
  const D=doc.data; const T=$('#dtab'); T.textContent=''; const tools=$('#tbTools'); tools.textContent='';
  const empty=!D.rows.length||!D.cols.length; $('#tbEmpty').hidden=!empty; $('#dtabWrap').hidden=empty;
  $('#tbInfo').textContent=empty?'':`${D.rows.length}행 × ${D.cols.length}열${D.unit?` · 단위 ${D.unit}`:''}`;
  const unit=h('input',{type:'text',value:D.unit||'',placeholder:'단위','aria-label':'단위',style:'width:80px;flex:none'}); unit.addEventListener('input',()=>{ D.unit=unit.value; changed(); });
  const addR=h('button',{class:'btn small',type:'button'},'+ 행'); addR.addEventListener('click',()=>{ D.rows.push({id:GG.uid(),name:`국가 ${D.rows.length+1}`,lbl:'',fill:EG.PALETTE[D.rows.length%EG.PALETTE.length]}); D.v.push(D.cols.map(()=>null)); changed('tb'); });
  const addC=h('button',{class:'btn small',type:'button'},'+ 열'); addC.addEventListener('click',()=>{ const oi=D.cols.findIndex(c=>c.other); const at=oi>=0?oi:D.cols.length; D.cols.splice(at,0,{id:GG.uid(),name:`항목 ${D.cols.length+1}`,lbl:'',fill:EG.PALETTE[(at+1)%EG.PALETTE.length]}); D.v.forEach(r=>r.splice(at,0,null)); changed('tb'); });
  tools.append(h('div',{class:'row'},h('span',{class:'lab'},'단위'),unit,addR,addC));
  const maskBtns=(list,which)=>{ const box=h('div',{class:'mini'});
    const mk=(t,fn)=>{ const b=h('button',{class:'btn small',type:'button'},t); b.addEventListener('click',()=>{ fn(); changed('tbo'); }); return b; };
    box.append(mk('A~',()=>EG.mask(list,'latin',x=>!x.other)),mk('(가)~',()=>EG.mask(list,'gana',x=>!x.other)),mk('이름으로',()=>list.forEach(x=>x.lbl='')));
    if(which==='cols') box.append(mk('순서 섞기',()=>shuffleCols()));
    if(which==='rows') box.append(mk('순서 섞기',()=>shuffleRows()));
    return box; };
  tools.append(h('div',{class:'row'},h('span',{class:'lab'},'열 라벨'),maskBtns(D.cols,'cols')),h('div',{class:'row'},h('span',{class:'lab'},'행 라벨'),maskBtns(D.rows,'rows')));
  { const fm=h('select',{'aria-label':'무늬 매기는 방식'}); [['ramp','비율 큰 것부터 연하게 → 진하게 → 빗금'],['rampR','비율 큰 것부터 진하게 → 연하게 → 빗금'],['manual','직접 고르기 (지금 무늬 그대로)']].forEach(([v,t])=>fm.append(h('option',{value:v},t)));
    fm.value=D.fillMode==='ramp'||D.fillMode==='rampR'?D.fillMode:'manual'; fm.addEventListener('change',()=>{ D.fillMode=fm.value; changed('tbo'); });
    tools.append(h('div',{class:'row'},h('span',{class:'lab'},'무늬'),fm)); }
  if(empty) return;
  const thead=h('thead'); const hr=h('tr'); hr.append(h('th',{class:'rh corner'},'라벨 · 이름',h('br'),'(행 무늬는 행열을 바꿀 때)'));
  D.cols.forEach((c,j)=>{ const nm=h('input',{class:'nm',value:c.name,'aria-label':`열 ${j+1} 이름`}); nm.addEventListener('input',()=>{ c.name=nm.value; changed(); refreshHint(); });
    const lb=h('input',{class:'lb',value:c.lbl||'',placeholder:'라벨','aria-label':`${c.name} 라벨`}); lb.addEventListener('input',()=>{ c.lbl=lb.value; changed(); refreshHint(); });
    const fs=fillSel(()=>c.fill||'white',v=>{ c.fill=v; doc.data.fillMode='manual'; },`${c.name} 무늬`);
    const mv=d=>{ const k=j+d; if(k<0||k>=D.cols.length) return; [D.cols[j],D.cols[k]]=[D.cols[k],D.cols[j]]; D.v.forEach(r=>{ [r[j],r[k]]=[r[k],r[j]]; }); changed('tb'); };
    const l=h('button',{class:'ico',type:'button',title:'왼쪽으로','aria-label':'왼쪽으로',disabled:j===0},'◀'); l.addEventListener('click',()=>mv(-1));
    const r=h('button',{class:'ico',type:'button',title:'오른쪽으로','aria-label':'오른쪽으로',disabled:j===D.cols.length-1},'▶'); r.addEventListener('click',()=>mv(1));
    const x=h('button',{class:'ico x',type:'button',title:'열 지우기','aria-label':`${c.name} 열 지우기`},'×'); x.addEventListener('click',()=>{ D.cols.splice(j,1); D.v.forEach(rw=>rw.splice(j,1)); changed('tbo'); });
    const hid=h('input',{type:'checkbox'}); hid.checked=!c.hide; hid.addEventListener('change',()=>{ c.hide=!hid.checked; changed('tbo'); });
    const oth=h('input',{type:'checkbox'}); oth.checked=!!c.other; oth.addEventListener('change',()=>{ c.other=oth.checked; changed('tbo'); });
    hr.append(h('th',{class:c.hide?'hid':null},h('div',{class:'colh'},nm,h('div',{class:'tag'},lb,fs),h('div',{class:'tag'},h('label',{title:'그래프에 그리기'},hid,'보임'),h('label',{title:'숨긴 열의 값을 이 열에 더해요'},oth,'기타')),h('div',{class:'tools'},l,r,x)))); });
  thead.append(hr); T.append(thead);
  const tb=h('tbody');
  D.rows.forEach((rw,i)=>{ const tr=h('tr',{class:rw.hide?'hid':null});
    const lb=h('input',{class:'lb',value:rw.lbl||'',placeholder:'라벨','aria-label':`${rw.name} 라벨`}); lb.addEventListener('input',()=>{ rw.lbl=lb.value; changed(); refreshHint(); });
    const nm=h('input',{class:'nm',value:rw.name,'aria-label':`행 ${i+1} 이름`}); nm.addEventListener('input',()=>{ rw.name=nm.value; changed(); refreshHint(); });
    const mv=d=>{ const k=i+d; if(k<0||k>=D.rows.length) return; [D.rows[i],D.rows[k]]=[D.rows[k],D.rows[i]]; [D.v[i],D.v[k]]=[D.v[k],D.v[i]]; changed('tb'); };
    const up=h('button',{class:'ico',type:'button',title:'위로','aria-label':'위로',disabled:i===0},'↑'); up.addEventListener('click',()=>mv(-1));
    const dn=h('button',{class:'ico',type:'button',title:'아래로','aria-label':'아래로',disabled:i===D.rows.length-1},'↓'); dn.addEventListener('click',()=>mv(1));
    const x=h('button',{class:'ico x',type:'button',title:'행 지우기','aria-label':`${rw.name} 행 지우기`},'×'); x.addEventListener('click',()=>{ D.rows.splice(i,1); D.v.splice(i,1); changed('tbo'); });
    const hid=h('input',{type:'checkbox',title:'그래프에 그리기'}); hid.checked=!rw.hide; hid.addEventListener('change',()=>{ rw.hide=!hid.checked; changed('tbo'); });
    const fs=fillSel(()=>rw.fill||'white',v=>{ rw.fill=v; doc.data.fillMode='manual'; },`${rw.name} 무늬`);
    tr.append(h('th',{class:'rh'},h('div',{class:'rowh'},lb,nm,h('span',{class:'tools'},up,dn,x)),h('div',{class:'tag'},fs,h('label',null,hid,'보임'))));
    D.cols.forEach((c,j)=>{ const v=D.v[i][j]; const inp=h('input',{class:'v'+(GG.fin(v)?'':' bad'),type:'text',inputmode:'decimal',value:GG.fin(v)?String(+v.toFixed(4)):'','aria-label':`${rw.name} ${c.name}`});
      inp.addEventListener('input',()=>{ const t=inp.value.trim().replace(/[−–]/g,'-').replace(/,/g,''); const n=t===''?null:+t; const bad=t!==''&&!isFinite(n); inp.classList.toggle('bad',bad||t===''); D.v[i][j]=bad?null:n; changed(); });
      tr.append(h('td',null,inp)); });
    tb.append(tr); });
  T.append(tb);
}
function shuffleCols(){ const D=doc.data; const idx=D.cols.map((_,j)=>j).filter(j=>!D.cols[j].other); const oth=D.cols.map((_,j)=>j).filter(j=>D.cols[j].other);
  for(let i=idx.length-1;i>0;i--){ const k=Math.floor(Math.random()*(i+1)); [idx[i],idx[k]]=[idx[k],idx[i]]; }
  const perm=[...idx,...oth]; const lbls=D.cols.filter(c=>!c.other).map(c=>c.lbl); const fills=D.cols.filter(c=>!c.other).map(c=>c.fill);
  D.cols=perm.map(j=>D.cols[j]); D.v=D.v.map(r=>perm.map(j=>r[j])); let k=0; D.cols.forEach(c=>{ if(!c.other){ c.lbl=lbls[k]; c.fill=fills[k]; k++; } }); }
function shuffleRows(){ const D=doc.data; const idx=D.rows.map((_,i)=>i); for(let i=idx.length-1;i>0;i--){ const k=Math.floor(Math.random()*(i+1)); [idx[i],idx[k]]=[idx[k],idx[i]]; }
  const lbls=D.rows.map(r=>r.lbl); D.rows=idx.map(i=>D.rows[i]); D.v=idx.map(i=>D.v[i]); D.rows.forEach((r,i)=>r.lbl=lbls[i]); }

/* ───────── 문장으로 만들기 ───────── */
const sampleCap=(window.claude&&typeof window.claude.use==='function')?window.claude.use('sample').catch(()=>null):Promise.resolve(null);
let undoDoc=null;
function askMsg(kind,text){ const m=$('#askMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }
function describe(d){
  const D=d.data; const R=D.rows.filter(r=>!r.hide), C=D.cols.filter(c=>!c.hide);
  let t=`${AG.KIND_KO[d.kind]} · ${R.slice(0,8).map(r=>r.lbl&&r.lbl!==r.name?`${r.lbl} ${r.name}`:r.name).join(', ')}${R.length>8?' …':''}`;
  t+=` · ${C.slice(0,8).map(c=>c.lbl&&c.lbl!==c.name?`${c.lbl} ${c.name}`:c.name).join(', ')}${C.length>8?' …':''}`;
  if(d.preset&&d.preset.tp) t+=` · ${d.preset.tp}${/~/.test(d.preset.tp)?(d.preset.agg==='sum'?' 합산':' 평균'):'년'}`;
  return t;
}
function symFind(n){ const t=String(n||'').trim(); if(!t) return null; const D=doc.data;
  if(D.cols.some(c=>c.name===t)||D.rows.some(r=>r.name===t||(Array.isArray(r.top)&&r.top.includes(t)))) return t;
  return AG.aliasFind(t)||(AG.items().find(x=>x.ko===t)||{}).ko||null; }
function parseSym(t){ const o={}; String(t||'').split(/[,，;]/).forEach(x=>{ const m=x.trim().match(/^(.+?)\s*(?:=|:|→|\s)\s*(\S+)$/); if(m){ const n=symFind(m[1])||m[1].trim(); o[n]=m[2]; } }); return Object.keys(o).length?o:undefined; }
function symText(o){ return o?Object.entries(o).map(([n,s])=>`${n}=${s}`).join(', '):''; }
function symNote(pairs,miss){ const ok=pairs.filter(([n])=>!miss.includes(n)); let t='';
  if(ok.length) t+=` ${ok.map(([n,s])=>`${n} → ${s}`).join(', ')}.`; if(miss.length) t+=` ${EG.josa(miss.join(', '),'은','는')} 표에 없어 기호를 붙이지 못했어요.`; return t; }
async function run(){
  if(!HAS){ askMsg('err','FAOSTAT 자료가 실려 있지 않아 문장으로 만들 수 없어요. ‘붙여넣기’로 표를 넣어 주세요.'); return; }
  const q0=$('#q').value.trim(); if(!q0){ $('#q').focus(); return; }
  /* ‘미국은 A, 중국은 B’처럼 기호를 정한 부분은 떼어 두었다가 표를 만든 뒤 붙인다. 기호만 적었으면 지금 표에 바로 붙인다 */
  const SY=EG.symbolsIn(q0,symFind); const q=SY.pairs.length?SY.stripped:q0;
  if(SY.pairs.length&&!/[가-힣A-Za-z0-9]/.test(q)){ undoDoc=JSON.stringify(doc); const miss=EG.applySymbols(doc,SY.pairs); changed('all'); refreshHint(); askMsg(miss.length?'warn':'ok',symNote(SY.pairs,miss).trim()); $('#undoBtn').hidden=false; return; }
  const r=AG.parseRequest(q); let spec=r.spec, via='규칙', missing=[];
  if(!r.understood){ const sample=await sampleCap;
    if(sample){ askMsg('warn','문장을 Claude에게 물어보는 중이에요…'); $('#goBtn').disabled=true;
      try{ const out=await sample.json(AG.buildPrompt(q),{modelTier:'quick'}); const sp=AG.cleanSpec(out); if(sp){ spec=sp; via='Claude'; missing=Array.isArray(out.missing)?out.missing.map(String):[]; } }
      catch(e){ /* 규칙 해석으로 */ } finally{ $('#goBtn').disabled=false; } } }
  if(via==='규칙'&&!r.understood){ askMsg('err','무엇을 그릴지 알아보지 못했어요. 품목(예: 밀, 쌀, 옥수수, 소), 지표(생산, 수출, 사육 두수), 나라·지역 또는 ‘상위 3개국’을 함께 적어 주세요.'); return; }
  undoDoc=JSON.stringify(doc);
  const {doc:d,info}=AG.specToDoc(spec,doc); const symMiss=SY.pairs.length?EG.applySymbols(d,SY.pairs):[];
  if(!d.data.rows.length||!d.data.cols.length){ askMsg('err','고른 품목·지표·나라의 값이 자료에 없어요. 시점이나 지표를 바꿔 보세요.'); undoDoc=null; return; }
  doc=AG.normalizeDoc(d); lastType=doc.preset&&doc.preset.type; syncTop(); changed('all');
  const miss=[...new Set([...(info.missing||[]),...missing])];
  let text=describe(doc)+'.'; if(miss.length) text+=` ${miss.join(', ')}은(는) 자료에 없어 빠졌어요.`; if(info.lost&&info.lost.length) text+=` ${info.lost.join(', ')}은(는) 이 지표 자료가 없어 뺐어요.`;
  if(spec.tp&&info.tp&&info.tp.label!==spec.tp) text+=` ${spec.tp} 자료가 없어 ${info.tp.label}${/~/.test(info.tp.label)?'':'년'}으로 그렸어요.`;
  text+=riceNote(spec.items||[],spec.els||[]);
  if(SY.pairs.length) text+=symNote(SY.pairs,symMiss);
  if(r.notes.length&&via==='규칙') text+=' '+r.notes.join(' '); if(via==='Claude') text+=' (Claude가 해석)';
  askMsg(miss.length||(info.lost&&info.lost.length)?'warn':'ok',text); $('#undoBtn').hidden=false;
}
$('#goBtn').addEventListener('click',run);
$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); run(); } });
$('#undoBtn').addEventListener('click',()=>{ if(!undoDoc) return; doc=AG.normalizeDoc(JSON.parse(undoDoc)); undoDoc=null; $('#undoBtn').hidden=true; syncTop(); changed('all'); askMsg('ok','문장으로 만들기 전으로 되돌렸어요.'); });
const EXAMPLES=[
  '옥수수, 쌀, 밀 생산 상위 3개국 비율 2023, 작물은 (가)~(다)',
  '밀, 옥수수 수출 상위 5개국 원그래프 2018~2022 평균',
  '밀, 옥수수, 쌀의 세계 수출량 누적 막대 2018~2022 평균, 작물은 (가)~(다)',
  '대륙별 곡물 수출량과 수입량 묶은 막대 2022, 아메리카는 하나로, 지역은 (가)~(마)',
  '앵글로아메리카, 오세아니아, 라틴 아메리카, 아시아, 아프리카, 유럽의 양, 돼지, 소 사육 두수 비율 2023, 가축은 A~C',
  '아시아, 유럽, 앵글로아메리카, 라틴 아메리카, 오세아니아, 아프리카의 밀, 옥수수 생산량과 수출량 산점도 2019~2021',
  '옥수수, 쌀 생산 상위 5개국 가나다순 목록 2014~2023 합산',
  '곡물 순 수출·수입 상위 2개국 2018~2022',
  '커피, 카카오, 차 생산 상위 3개국 비율 2023',
  '아프리카의 카카오 생산 상위 3개국 2023',
  '대륙별 쌀 생산량 비율 2023'
];
function renderExamples(){ const box=$('#exList'); box.textContent='';
  EXAMPLES.forEach(q=>{ const b=h('button',{class:'ex',type:'button'},q); b.addEventListener('click',()=>{ $('#q').value=q; run(); }); box.append(b); }); }

/* ───────── 설정 패널 ───────── */
function sec(title,...kids){ return h('section',{class:'sec'},h('h2',{class:'sec-title'},title),...kids); }
const IN_LBL=[['none','없음'],['name','이름'],['value','비율'],['both','둘 다']];
const MK_OPTS=Object.entries(GG.MARKS).filter(([k])=>k!=='none'&&k!=='gd'&&k!=='gs');
function renderOpts(){
  axisRefresh=[]; const P=$('#opts'); P.textContent=''; const k=doc.kind;
  if(k==='stack'){ const o=doc.stack; const dim=o.dir==='v'?o.v:o.h;
    const s1=sec('누적 막대',
      row('방향',seg([['h','가로'],['v','세로']],()=>o.dir,v=>{ o.dir=v; o.grid=v==='v'; },'opts')),
      row('값',seg([['pct','100% 비율'],['raw','값 그대로']],()=>o.norm!==false?'pct':'raw',v=>{ o.norm=v==='pct'; o.axis.auto=true; },'opts')),
      o.norm===false?h('p',{class:'sub'},'막대 길이가 값 그대로예요. 지역 한정 상위국 점유율처럼 합이 100이 아닌 자료에 써요.'):null,
      row('',chk('행과 열 바꾸기 (막대 = 열 항목)',()=>o.trans,v=>o.trans=v,'opts')),
      o.trans?h('p',{class:'sub'},'막대가 열 항목, 막대 안 칸이 행(나라·지역)이 돼요. 칸 무늬는 표의 행 무늬를 써요.'):null,
      row('막대 안 글자',seg(IN_LBL,()=>o.inLbl,v=>o.inLbl=v,'opts')),
      o.inLbl!=='none'?row('',chk('좁은 칸은 바깥에 지시선으로',()=>o.leader,v=>o.leader=v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('소수 자리',seg([['0','0'],['1','1']],()=>String(o.dec),v=>o.dec=+v)):null,
      row('범례',seg([['bottom','아래'],['right','오른쪽'],['none','없음']],()=>o.legend,v=>o.legend=v)),
      row('',chk('막대 사이 연결선 (점선)',()=>o.connect,v=>o.connect=v)),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),
      row('',chk('테두리 상자',()=>o.frame,v=>o.frame=v)),
      row('',chk('작은 눈금 (눈금 간격의 절반)',()=>o.minor,v=>o.minor=v)),
      row('',chk('막대마다 큰 칸부터 (기타는 맨 끝)',()=>o.sortSeg,v=>o.sortSeg=v)),
      row('막대 두께',num(()=>dim.barW,v=>dim.barW=v,{min:1,max:30,step:0.2,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'간격'),num(()=>dim.gap,v=>dim.gap=v,{min:0.5,max:40,step:0.2,aria:'막대 간격(mm)'}),h('span',{class:'unit'},'mm')),
      row('값 축 길이',num(()=>dim.len,v=>dim.len=v,{min:15,max:180,step:1,aria:'값 축 길이(mm)'}),h('span',{class:'unit'},'mm')));
    P.append(s1,sec('축 범위',axisHead(),axisCtl('값 축',o.axis,'stack')));
  }
  if(k==='donut'){ const o=doc.donut; const R=doc.data.rows.filter(r=>!r.hide);
    const s1=sec('원그래프',
      row('구멍',...range(()=>o.hole,v=>o.hole=v,0,0.8,0.01,v=>v<0.01?'원그래프':'도넛 '+Math.round(v*100)+'%')),
      row('지름',num(()=>o.size,v=>o.size=v,{min:12,max:90,step:1,aria:'지름(mm)'}),h('span',{class:'unit'},'mm · 간격'),num(()=>o.gap,v=>o.gap=v,{min:0,max:40,step:0.5,aria:'간격(mm)'}),h('span',{class:'unit'},'mm')),
      row('한 줄에',seg([['0','모두'],['1','1개'],['2','2개'],['3','3개'],['4','4개']],()=>String(o.cols||0),v=>o.cols=+v)),
      o.hole>0?row('가운데',seg([['row','나라 이름'],['total','합계'],['custom','직접'],['none','없음']],()=>o.center,v=>o.center=v,'opts')):null,
      o.hole>0&&o.center==='total'?row('합계 이름',txt(()=>o.totalLabel,v=>o.totalLabel=v,'예: 총인구','합계 이름')):null,
      row('위 라벨',seg([['none','없음'],['lbl','행 라벨']],()=>o.top,v=>o.top=v)),
      row('조각 글자',seg(IN_LBL,()=>o.inLbl,v=>o.inLbl=v,'opts')),
      o.inLbl!=='none'?row('',chk('좁은 조각은 바깥에 지시선으로',()=>o.leader,v=>o.leader=v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('소수 자리',seg([['0','0'],['1','1']],()=>String(o.dec),v=>o.dec=+v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('% 표시',seg([['all','모든 칸'],['first','첫 칸만'],['none','안 붙임']],()=>o.pct||'all',v=>o.pct=v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('',chk('비율을 괄호로 묶기 — 예: (16.5%)',()=>!!o.paren,v=>o.paren=v)):null,
      row('',chk('조각을 큰 순서로 (기타는 맨 끝)',()=>o.sortSeg,v=>o.sortSeg=v)),
      row('범례',seg([['none','없음'],['bottom','아래'],['right','오른쪽']],()=>o.legend,v=>o.legend=v)),
      h('p',{class:'sub'},'조각은 12시 방향에서 시계 방향으로, 표의 열 순서대로 그려요. 작업용 엑셀의 파이 차트 양식이에요.'));
    if(o.hole>0&&o.center==='custom'){ const g=h('div',{class:'ctext'}); for(const r of R){ const i=h('input',{type:'text',value:r.ctext||'',placeholder:'줄은 / 로 나눠요','aria-label':`${r.name} 가운데 글자`}); i.addEventListener('input',()=>{ r.ctext=i.value; changed(); }); g.append(h('span',null,r.lbl||r.name),i); } s1.append(g); }
    P.append(s1);
  }
  if(k==='group'){ const o=doc.group;
    P.append(sec('묶은 막대',
      row('범례',seg([['in','그래프 안'],['bottom','아래'],['right','오른쪽'],['none','없음']],()=>o.legend,v=>o.legend=v)),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('테두리 상자',()=>o.frame,v=>o.frame=v)),
      row('',chk('막대 위에 값',()=>o.values,v=>o.values=v)),
      row('막대 두께',num(()=>o.barW,v=>o.barW=v,{min:0.5,max:20,step:0.1,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'묶음 간격'),num(()=>o.gap,v=>o.gap=v,{min:0.3,max:30,step:0.1,aria:'묶음 간격(mm)'})),
      row('높이',num(()=>o.len,v=>o.len=v,{min:10,max:150,step:1,aria:'높이(mm)'}),h('span',{class:'unit'},'mm'))),
      sec('축 범위',axisHead(),axisCtl('세로축',o.axis,'group')));
  }
  if(k==='tb'){ const o=doc.tb;
    P.append(sec('표',
      row('나타낼 값',seg([['value','값'],['pct','행 비율(%)'],['rank','순위']],()=>o.mode,v=>o.mode=v,'opts')),
      o.mode==='rank'?row('순위',num(()=>o.rankN,v=>o.rankN=v,{min:1,max:10,step:1,aria:'몇 위까지'}),h('span',{class:'unit'},'위까지')):null,
      o.mode==='rank'?h('p',{class:'sub'},'열마다 값이 큰 행부터 행 라벨을 적어요. 나라 이름을 적으려면 ‘이름 표’를 쓰세요.'):null,
      o.mode!=='rank'?row('소수 자리',seg([['0','0'],['1','1'],['2','2']],()=>String(o.dec),v=>o.dec=+v)):null,
      o.mode!=='rank'?row('',chk('천 단위 쉼표',()=>o.comma,v=>o.comma=v)):null,
      o.mode!=='rank'?row('단위 표기',seg([['auto','자동'],['head','열 머리마다'],['top','표 위'],['bottom','표 아래']],()=>o.unitPos||'auto',v=>o.unitPos=v,'opts')):null,
      o.mode!=='rank'&&EG.tableUnits(doc).pos!=='head'?row('',seg([['label',`(단위: ${EG.tableUnits(doc).units[0]})`],['paren',`(${EG.tableUnits(doc).units[0]})`]],()=>o.unitStyle||'label',v=>o.unitStyle=v)):null,
      o.mode!=='rank'?h('p',{class:'sub'},EG.tableUnits(doc).uni?'모든 열의 단위가 같으면 표 위 오른쪽에 한 번만 적어요(시험지 방식, 2025학년도 수능 8번 ‘(만 명)’). 열 머리마다 적으려면 ‘열 머리마다’를 고르세요.':'열마다 단위가 달라서 열 머리마다 적어요.'):null,
      o.mode!=='rank'&&EG.tableUnits(doc).pos==='head'?row('',chk('단위를 둘째 줄에',()=>o.unitLine,v=>o.unitLine=v)):null,
      o.mode!=='rank'?row('첫 칸',txt(()=>o.rowHead,v=>o.rowHead=v,'구분','첫 칸 이름')):null));
  }
  if(k==='tree'){ const o=doc.tree;
    P.append(sec('면적 비율 (정사각형)',
      row('칸 모양',seg([['grid','계단형 100칸'],['rect','직사각형']],()=>o.layout,v=>o.layout=v)),
      h('p',{class:'sub'},o.layout==='grid'?'정사각형을 100칸으로 나눠 1칸 = 1%로 채워요. 칸 경계가 계단 모양이 돼요.':'비율대로 직사각형으로 나눠요(트리맵).'),
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
  if(k==='small'){ const o=doc.small;
    P.append(sec('상댓값 막대',
      row('',chk('열마다 가장 큰 값을 100으로',()=>o.rel,v=>{ o.rel=v; o.axis.auto=true; },'opts')),
      h('p',{class:'sub'},'열(항목)마다 칸 하나, 행(나라)마다 막대 하나예요. 칸 위 제목은 열 라벨, 막대 무늬는 열 무늬예요.'),
      row('칸 크기',num(()=>o.pw,v=>o.pw=v,{min:8,max:80,step:0.5,aria:'칸 가로(mm)'}),h('span',{class:'unit'},'×'),num(()=>o.ph,v=>o.ph=v,{min:8,max:120,step:0.5,aria:'칸 세로(mm)'}),h('span',{class:'unit'},'mm')),
      row('막대 두께',num(()=>o.barW,v=>o.barW=v,{min:0.5,max:20,step:0.1,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'칸 간격'),num(()=>o.gap,v=>o.gap=v,{min:0,max:30,step:0.5,aria:'칸 간격(mm)'})),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v))),
      sec('축 범위',axisHead(),axisCtl('세로축',o.axis,'small')));
  }
  if(k==='sc'){ const o=doc.sc;
    P.append(sec('산점도',
      h('p',{class:'sub'},'표의 열을 품목마다 (가로축, 세로축) 짝으로 읽어요. 품목이 둘이면 칸을 나란히 그려요. 축 범위는 두 칸에 똑같이 써요.'),
      row('',chk('0 선 (실선)',()=>o.zero,v=>{ o.zero=v; o.x.auto=true; o.y.auto=true; })),row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('점 옆에 행 라벨',()=>o.lbl,v=>o.lbl=v)),
      row('',chk('칸이 둘이면 단위를 오른쪽 위에 한 번만',()=>o.share,v=>o.share=v)),
      row('가로축 이름',txt(()=>o.xTitle,v=>o.xTitle=v,'비우면 지표 이름','가로축 이름')),row('세로축 이름',txt(()=>o.yTitle,v=>o.yTitle=v,'비우면 지표 이름','세로축 이름')),
      row('점 크기',num(()=>o.mks,v=>o.mks=v,{min:0.6,max:4,step:0.1,aria:'점 크기(mm)'}),h('span',{class:'unit'},'mm · 칸 간격'),num(()=>o.gap,v=>o.gap=v,{min:0,max:40,step:0.5,aria:'칸 간격(mm)'})),
      row('그래프 크기',num(()=>o.w,v=>o.w=v,{min:20,max:150,step:1,aria:'가로(mm)'}),h('span',{class:'unit'},'×'),num(()=>o.h,v=>o.h=v,{min:20,max:150,step:1,aria:'세로(mm)'}),h('span',{class:'unit'},'mm'))),
      sec('축 범위',axisHead(),axisCtl('가로축',o.x,'scx'),axisCtl('세로축',o.y,'scy')));
  }
  if(k==='list'){ const o=doc.list;
    P.append(sec('이름 표',
      row('짜임',seg([['col','열 = 품목'],['row','행 = 해(열)']],()=>o.layout,v=>o.layout=v,'opts')),
      h('p',{class:'sub'},o.layout==='col'?'표의 열(품목)마다 값이 큰 행(나라) 이름을 적어요(2026학년도 6월 13번).':'표의 열(해)마다 한 줄씩, 값이 큰 나라와 작은(음수) 나라를 적어요(2025학년도 수능 12번 순 수출·수입 표).'),
      row('몇 곳',num(()=>o.n,v=>o.n=v,{min:1,max:10,step:1,aria:'몇 곳'})),
      o.layout==='col'?row('순서',seg([['rank','순위순'],['gana','가나다순']],()=>o.order,v=>o.order=v,'opts')):null,
      o.layout==='col'&&o.order==='rank'?row('',chk('왼쪽에 1위, 2위 … 칸',()=>o.rankCol,v=>o.rankCol=v)):null,
      o.layout==='col'?row('머리 글자',txt(()=>o.head,v=>o.head=v,'예: 생산 국가 → ‘(가) 생산 국가’','머리 글자')):null,
      o.layout==='row'?row('',chk('양쪽(큰 값·음수) 모두',()=>o.dir==='both',v=>o.dir=v?'both':'high','opts')):null,
      o.layout==='row'&&o.dir==='both'?row('머리 글자',txt(()=>o.highWord,v=>o.highWord=v,'순 수출량','큰 값 쪽'),txt(()=>o.lowWord,v=>o.lowWord=v,'순 수입량','음수 쪽')):null,
      o.layout==='row'?row('첫 칸',txt(()=>o.corner,v=>o.corner=v,'연도','첫 칸')):null,
      h('p',{class:'sub'},'나라 이름 대신 라벨을 쓰려면 표의 행 라벨(예: A, B)을 적어요.')));
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
  const notesBox=h('textarea',{class:'note-area',placeholder:'한 줄에 하나씩. 예: 러시아는 유럽에 포함됨.','aria-label':'덧붙일 주석'}); notesBox.value=M.notes||''; notesBox.addEventListener('input',()=>{ M.notes=notesBox.value; changed(); });
  const auto=AG.autoNotes(doc); const srcBtn=h('button',{class:'btn small',type:'button'},'FAO 출처 넣기'); srcBtn.addEventListener('click',()=>{ M.src='(FAO)'; changed('opts'); });
  const titleBtn=h('button',{class:'btn small',type:'button'},'제목 추천'); titleBtn.addEventListener('click',()=>{ M.title=suggestTitle(); changed('opts'); });
  P.append(sec('제목 · 연도 · 출처 · 주석',
    row('제목',txt(()=>M.title,v=>M.title=v,'예: <지역(대륙)별 곡물 수출·수입량>','제목'),titleBtn),
    row('연도',txt(()=>M.year,v=>M.year=v,'예: (2020)','연도')),
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
function suggestTitle(){ const p=doc.preset||{}; const D=doc.data;
  const its=[...new Set(D.cols.map(c=>c.key).filter(Boolean))];
  if(p.type==='top') return `<${D.rows.length>1?'작물별':D.rows[0]?D.rows[0].name:''} ${D.measure} 상위 국가 비율>`;
  if(p.type==='reg') return `<작물별 ${D.measure}의 지역(대륙)별 비율>`;
  if(p.type==='comp') return `<지역(대륙)별 주요 ${D.itemNoun==='가축'?'가축의 사육 두수':'작물의 '+D.measure} 비율>`;
  if(p.type==='cmp') return D.cols.length===2&&D.cols.every(c=>c.key===D.cols[0].key)?`<지역(대륙)별 ${AG.itemName(D.cols[0].key).replace(/\(합계\)$/,'')} ${D.cols.map(c=>c.name.replace(/량$/,'')).join('·')}량>`:`<${D.rowNoun}별 ${D.measure||'값'}>`;
  if(p.type==='names') return '';
  return ''; }
function fontStatus(){ const out=[]; for(const fam of ['serif','gothic']){ const f=GG.fontDef(doc,fam); if(f.web) continue; if(!GG.fontAvailable(f,fam)) out.push(`${f.label.replace(/ \(.*\)$/,'')} 글꼴이 이 컴퓨터에 없어 ${fam==='serif'?'Noto Serif KR':'Noto Sans KR'}로 대신 그려요.`); } return out.length?out.join(' '):'고른 글꼴이 이 컴퓨터에 있어요.'; }
function refreshHint(){
  const el=$('#hintSec'); if(!el) return; el.textContent=''; const H=AG.hintOf(doc); if(!H){ el.hidden=true; return; } el.hidden=false;
  const cp=h('button',{class:'btn small copy',type:'button'},'단서 문구 복사');
  cp.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(H.sentence); toast('발문 단서를 복사했어요.'); }catch(e){ toast('복사가 막혀 있어요. 문구를 직접 선택해 복사해 주세요.'); } });
  el.append(h('h2',{class:'sec-title'},'발문 단서 · 정답'),h('div',{class:'hint'},h('div',null,H.sentence),h('div',{class:'sub'},h('b',null,'정답: '),H.key),cp));
}
/* ───────── 그리기 ───────── */
function warnings(){
  const w=[]; const {R,C,M}=EG.derive(doc); if(!R.length||!C.length) return w;
  w.push(...EG.labelWarn(doc));
  const holes=[]; R.forEach((r,i)=>C.forEach((c,j)=>{ if(M[i][j]==null&&!(doc.preset&&doc.preset.type==='top')) holes.push(`${r.name}·${c.name}`); }));
  if(holes.length&&!['list','sc'].includes(doc.kind)&&!(doc.preset&&doc.preset.type==='names')) w.push(`빈칸 ${holes.length}개(${holes.slice(0,3).join(', ')}${holes.length>3?' …':''})는 0으로 그려요.`);
  if(['stack','donut','tree'].includes(doc.kind)&&M.flat().some(v=>GG.fin(v)&&v<0)) w.push('음수 값은 비율 그림에서 0으로 처리해요.');
  if(doc.kind==='donut'&&doc.donut.center==='total'&&doc.data.unit==='%') w.push('값이 이미 비율(%)이라 가운데 합계가 100이 돼요.');
  if(doc.kind==='stack'&&doc.stack.norm===false){ const tot=Math.max(...M.map(r=>r.filter(GG.fin).reduce((a,b)=>a+Math.max(0,b),0))); const ax=EG.lastAxes().stack; if(ax&&tot>ax.hi+1e-9) w.push('막대가 값 축 최댓값을 넘어가 잘려요. 축 범위를 넓혀 주세요.'); }
  if(doc.kind==='sc'&&!D_hasPairs()) w.push('산점도는 품목마다 (가로축, 세로축) 짝이 있어야 해요. ‘두 지표’로 표를 만들어 주세요.');
  return w;
}
function draw(){
  const desk=getComputedStyle(ROOT.body||ROOT).getPropertyValue('--desk').trim()||'#c7ccd2';
  const r=GG.paintSheet(doc,cv,{desk});
  $('#deskEmpty').hidden=!!r;
  let w=r?warnings():[]; if(!r&&doc.kind==='sc'&&doc.data.rows.length&&!D_hasPairs()) w=['산점도는 품목마다 (가로축, 세로축) 짝이 있어야 해요. 왼쪽 ‘두 지표’로 표를 만들어 주세요.'];
  const dw=$('#deskWarn'); dw.hidden=!w.length; dw.textContent=w.join(' ');
  if(r){ const Wd=r.R.W+2*GG.M, Hd=r.R.H+2*GG.M; $('#sizeInfo').textContent=`${Wd.toFixed(1)} × ${Hd.toFixed(1)} mm · ${Math.round(Wd/25.4*dpi)} × ${Math.round(Hd/25.4*dpi)} px`; } else $('#sizeInfo').textContent='';
  ['pngBtn','svgBtn','copyBtn'].forEach(id=>$('#'+id).disabled=!r);
  for(const f of axisRefresh) f();
  clearTimeout(draw.f); draw.f=setTimeout(()=>GG.ensureFonts(doc),250);
}
if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ GG.clearMetrics(); schedule(); });
new ResizeObserver(()=>schedule()).observe(cv.parentElement);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>schedule());

/* ───────── 내보내기 · 작업 파일 ───────── */
const KIND_FILE={stack:'농업_누적막대',donut:'농업_원그래프',tree:'농업_면적비율',group:'농업_묶은막대',small:'농업_상댓값',tb:'농업_표',sc:'농업_산점도',list:'농업_이름표'};
function D_hasPairs(){ const C=doc.data.cols.filter(c=>!c.hide); return C.some(c=>c.role==='x')&&C.some(c=>c.role==='y'); }
const stamp=()=>{ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const RESULT={saved:'저장했어요.',declined:'저장을 취소했어요.',busy:'잠시 뒤에 다시 눌러 주세요.',failed:'저장하지 못했어요.'};
async function busy(btn,fn){ btn.disabled=true; try{ await fn(); } finally{ btn.disabled=false; } }
$('#pngBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const b=await GG.renderPng(doc,{dpi}); toast(RESULT[await GG.saveFile(`${KIND_FILE[doc.kind]}_${stamp()}.png`,b,'image/png')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#svgBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const s=await GG.svgString(doc); toast(RESULT[await GG.saveFile(`${KIND_FILE[doc.kind]}_${stamp()}.svg`,s,'image/svg+xml')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#copyBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ await GG.copyPng(doc,{dpi}); toast('이미지를 복사했어요. 한글 문서에 바로 붙여 넣을 수 있어요.'); }catch(err){ toast('이 화면에서는 복사가 막혀 있어요. PNG 저장을 써 주세요.'); } }));
bindSeg($('#dpiSeg'),()=>dpi,v=>{ dpi=+v; schedule(); });
$('#saveJson').addEventListener('click',async()=>{ toast(RESULT[await GG.saveFile(`농업그래프_작업_${stamp()}.json`,JSON.stringify(doc,null,1),'application/json')]); });
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='agriculture') throw 0; doc=AG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); }catch(err){ toast('농업 그래프 작업 파일이 아니에요.'); } e.target.value=''; });
const resetBtn=$('#resetBtn'); let resetArm=0;
resetBtn.addEventListener('click',()=>{ if(!resetArm){ resetBtn.textContent='한 번 더 누르면 지워요'; resetArm=setTimeout(()=>{ resetArm=0; resetBtn.textContent='새 작업'; },3000); return; }
  clearTimeout(resetArm); resetArm=0; resetBtn.textContent='새 작업'; doc=AG.freshDoc(doc.kind); syncTop(); changed('all'); pbMsg('',''); toast('새 작업을 시작했어요.'); });

/* ───────── 위쪽 막대 ───────── */
const syncKind=bindSeg($('#kindSeg'),()=>doc.kind,v=>{ doc.kind=v;
  if(v==='list'){ const net=doc.preset&&doc.preset.type==='net'; Object.assign(doc.list,net?{layout:'row',dir:'both'}:{layout:'col',dir:'high'}); }
  /* 값 비교 표를 누적 막대로 바꾸면 값 그대로 쌓는다(2025학년도 9월 11번 ‘전 세계 수출량’) */
  if(v==='stack'&&doc.preset&&doc.preset.type==='cmp'){ const o=doc.stack; o.dir=doc.data.rows.length<=2?'v':'h'; Object.assign(o,{norm:false,legend:'bottom',grid:true,frame:false,sortSeg:false,inLbl:'none',trans:false}); o.axis.auto=true; if(o.dir==='v') o.v.barW=Math.max(o.v.barW,12); }
  changed('opts'); });
function syncTop(){ syncKind(); }
if(!HAS){ $('#pbSeg').querySelectorAll('button:not([data-v="paste"])').forEach(b=>b.disabled=true); }
renderPB(); renderTable(); renderOpts(); renderExamples(); schedule();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ GG.clearMetrics(); schedule(); });
MS=GG.mapSend($,()=>doc); MS.sync();
/* 통합판에서 다른 곳이 작업 파일을 넘겨줄 때 */
return {getDoc:()=>doc,mapRequest:()=>MS.request(),load:d=>{ if(!d||!(d.app==='agriculture')) return false; doc=AG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); return true; }};
});