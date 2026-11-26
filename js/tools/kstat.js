/* 한국 통계 지도: 한국지리 백지도와 같은 바탕 엔진(KM) 위에, 통계값(GMDATA.kstat)으로 칠한 지도를 1~3장 나란히 만든다.
   그리기는 통계 지도 엔진 SM(sengine.js)이 하고, 이 파일은 설정 칸·문장 해석·저장을 맡는다.
   한국지리 백지도(kmap)의 코드·저장 형식은 건드리지 않는다. 작업 파일은 app:"kstat", 자동 저장은 localStorage wgkstat-editor-v1 */
HUB.def('kstat',function(ROOT){
'use strict';
const KEY='wgkstat-editor-v1';
const $=s=>ROOT.querySelector(s);
const stage=$('#ksStage');
function h(tag,attrs,...kids){
  const e=document.createElement(tag);
  if(attrs) for(const [k,v] of Object.entries(attrs)){
    if(v==null||v===false) continue;
    if(k==='class') e.className=v; else if(k.startsWith('on')) e.addEventListener(k.slice(2),v); else if(v===true) e.setAttribute(k,''); else e.setAttribute(k,String(v));
  }
  for(const c of kids.flat()) if(c!=null&&c!==false) e.append(c.nodeType?c:document.createTextNode(String(c)));
  return e;
}
const STAT=(window.GMDATA&&window.GMDATA.kstat)||null;
SM.setStat(STAT);
const HAS=!!KM.data()&&!!STAT&&!!STAT.ind;
const IND=(STAT&&STAT.ind)||{};
/* 지도에 칠할 수 있는 지표: 값이 하나인 것만(원그래프용 parts, 유선도용 flow는 다음 묶음) */
const LIST=Object.entries(IND).filter(([id,i])=>i&&!i.flow&&!i.parts).map(([id,i])=>({id,ko:i.ko,level:i.level,unit:i.unit,alias:i.alias||[]}));
const MODES=[['topbottom','상위·하위'],['cond','조건'],['ordinal','단계'],['interval','구간']];
const MODE_HELP={topbottom:'상위 N개는 진한 회색, 하위 N개는 연한 회색으로 칠해요. 값과 지표 이름은 그림에 안 나와요.',cond:'조건에 맞는 지역만 한 가지 회색으로 칠해요.',ordinal:'값의 높고 낮음을 단계 회색으로 나타내요. 범례에는 숫자 없이 높음↕낮음만 써요.',interval:'값의 구간별로 칠하고 범례에 이상~미만을 적어요.'};

/* ───────── 상태 ───────── */
const hasInd=id=>Object.prototype.hasOwnProperty.call(IND,id)&&!!IND[id];
const okKey=k=>typeof k==='string'&&/^[A-Za-z0-9_]{1,40}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k);
function firstKey(){ return hasInd('aged_ratio')?'aged_ratio':(LIST[0]?LIST[0].id:''); }
function freshDoc(){
  const d=LG.freshDoc('kstat');
  d.map=Object.assign(KM.freshMap(),{ver:'a',verPick:true,level:'sgg',metro:'split'});
  d.panels=[SM.freshPanel(firstKey())];
  d.foot={show:true,notes:[],verNote:true,year:null,src:null};
  return d;
}
function cleanPanel(p){
  p=p&&typeof p==='object'?p:{}; const q=SM.freshPanel(okKey(p.key)?p.key:'');
  if(MODES.some(m=>m[0]===p.mode)) q.mode=p.mode;
  const n=Math.round(+p.n); if(n>=1&&n<=10) q.n=n;
  const c=Math.round(+p.classes); q.classes=c>=2&&c<=5?c:null;
  q.breaks=Array.isArray(p.breaks)&&p.breaks.length<=4&&p.breaks.every(x=>isFinite(+x))?p.breaks.map(Number):null;
  if(['>=','>','<=','<'].includes(p.op)) q.op=p.op;
  if(p.v!=null&&p.v!==''&&isFinite(+p.v)) q.v=+p.v;
  const r=Math.round(+p.rank); if(r>=1&&r<=300) q.rank=r;
  q.label=typeof p.label==='string'&&p.label?p.label.slice(0,60):null;
  q.title=typeof p.title==='string'?p.title.slice(0,20):null;
  if(p.vals&&typeof p.vals==='object'){ const v={}; for(const [k,x] of Object.entries(p.vals)) if(/^\d{2,5}$/.test(k)&&isFinite(+x)) v[k]=+x; q.vals=Object.keys(v).length?v:null; }
  return q;
}
function norm(d0){
  if(!d0||d0.app!=='kstat') return freshDoc();
  const d=GG.clean(d0); const x=LG.normalizeDoc(d); if(x.app!=='kstat') return freshDoc();
  x.map=KM.normalizeMap(d.map);
  if(x.map.area!=='sido'&&!KM.REGIONS.some(R=>R.id===x.map.area)) x.map.area='sk';
  x.map.sido=Array.isArray(x.map.sido)?x.map.sido.filter(c=>/^\d{2}$/.test(String(c))).slice(0,17).map(String):[];
  if(x.map.area==='sido'&&!x.map.sido.length) x.map.area='sk';
  x.map.level=x.map.level==='sido'?'sido':'sgg';
  x.panels=(Array.isArray(d.panels)?d.panels:[]).slice(0,3).map(cleanPanel); if(!x.panels.length) x.panels=[SM.freshPanel(firstKey())];
  /* GG.clean이 < > 글자를 지우므로 비교 기호는 정리 전 원본에서 읽어 허용 목록으로 검증한다 */
  x.panels.forEach((q,i)=>{ const raw=Array.isArray(d0.panels)&&d0.panels[i]; const o=raw&&raw.op; if(['>=','>','<=','<'].includes(o)) q.op=o; });
  const f=d.foot&&typeof d.foot==='object'?d.foot:{};
  x.foot={show:f.show!==false,verNote:f.verNote!==false,notes:(Array.isArray(f.notes)?f.notes:[]).map(String).filter(Boolean).slice(0,5).map(s=>s.slice(0,100)),
    year:typeof f.year==='string'&&f.year?f.year.slice(0,12):null,src:typeof f.src==='string'&&f.src?f.src.slice(0,60):null};
  x.items=(x.items||[]).filter(it=>it&&it.km!=='kstat');
  return x;
}
function loadLocal(){ try{ const s=localStorage.getItem(KEY); return s?norm(JSON.parse(s)):null; }catch(e){ return null; } }
let doc=loadLocal()||freshDoc(), saveT=0, warns=[];
const saveable=()=>Object.assign({},doc,{base:null,items:doc.items.filter(it=>it.km!=='kstat')});
function saveLocal(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem(KEY,JSON.stringify(saveable())); }catch(e){} },300); }
function toast(msg){ const t=$('#ksToast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2800); }

/* ───────── 그리기 ───────── */
function rebuild(){
  SM.setStat(STAT); warns=[]; let r=null;
  try{ r=HAS?SM.compose(doc):null; }catch(e){ console.error(e); warns.push('지도를 그리는 중에 문제가 생겼어요. 설정을 바꿔 보세요.'); }
  doc.items=doc.items.filter(it=>it.km!=='kstat');
  if(!r){ doc.base=null; if(!HAS) warns.push('통계 자료를 불러오지 못했어요.'); return; }
  doc.base={kind:'svg',svg:r.base.svg,x:0,y:0,w:r.base.w,h:r.base.h,natW:r.base.w,natH:r.base.h,name:'한국 통계 지도'};
  for(const p of r.items) doc.items.push(LG.makeItem(p.t,p));
  warns=r.warn.slice();
  doc.panels.forEach((P,i)=>{ const e=IND[P.key]; if(e&&e.level==='sido'&&doc.map.level==='sgg') warns.push(`${doc.panels.length>1?SM.PANEL_KO[i]+' ':''}${e.ko}은(는) 시·도 단위 값이라 시·군·구 지도에서는 칠해지지 않아요. 단위를 시·도로 바꿔 주세요.`); });
}
function drawWarn(){ const ul=$('#ksWarn'); ul.textContent=''; for(const w of warns) ul.append(h('li',null,w)); ul.hidden=!warns.length; }
function draw(){
  stage.querySelectorAll('svg').forEach(e=>e.remove());
  const B=doc.base; $('#ksEmpty').hidden=!!B; ['svgBtn','pngBtn'].forEach(id=>{ const b=$('#'+id); if(b) b.disabled=!B; });
  if(!B){ $('#ksSize').textContent=''; drawWarn(); return; }
  stage.insertAdjacentHTML('afterbegin',LG.svgString(doc,{inline:true}));
  const pb=LG.pageBox(doc); $('#ksSize').textContent=`${pb.w.toFixed(1)} × ${pb.h.toFixed(1)} mm · 600 dpi에서 ${Math.round(pb.w/25.4*600)} × ${Math.round(pb.h/25.4*600)} px`;
  drawWarn();
}
function changed(){ saveLocal(); rebuild(); draw(); }
async function loadFonts(){
  if(!document.fonts||!document.fonts.load) return; const jobs=[]; const txt=doc.items.map(it=>it.text||'').join('')+'(가)(나)(다)높음낮음상위하위이상미만0123456789';
  for(const fam of ['serif','gothic']) if(GG.needsWeb({style:doc.style},fam)) jobs.push(document.fonts.load(`16px "${fam==='serif'?'Noto Serif KR':'Noto Sans KR'}"`,txt).catch(()=>{}));
  await Promise.all(jobs); LG.clearMetrics(); rebuild(); draw();
}

/* ───────── 패널 설정 칸 ───────── */
const toNum=s=>{ const v=parseFloat(String(s).replace(/,/g,'')); return isFinite(v)?v:null; };
function indSelect(P,onPick){
  const sel=h('select',{'aria-label':'지표'});
  if(!hasInd(P.key)) sel.append(h('option',{value:P.key||''},P.key?`(없는 지표: ${P.key})`:'지표를 고르세요'));
  for(const [lv,name] of [['sgg','시·군·구 단위 지표'],['sido','시·도 단위 지표']]){
    const g=h('optgroup',{label:name}); for(const i of LIST.filter(x=>x.level===lv)) g.append(h('option',{value:i.id},i.ko+(i.unit?` (${i.unit})`:''))); if(g.children.length) sel.append(g); }
  sel.value=P.key; sel.addEventListener('change',()=>onPick(sel.value)); return sel;
}
function setMode(P,m){
  P.mode=m; P.breaks=null;
  if(m==='topbottom'){ P.n=P.n||5; }
  else if(m==='cond'){ if(P.rank==null&&P.v==null) P.rank=5; P.op=P.op||'>='; }
  else if(m==='ordinal'){ P.classes=5; }
  else if(m==='interval'){ P.classes=3; }
}
function valuesTable(P){
  const ind=IND[P.key]; const box=h('div',{class:'ksvals'});
  if(!ind){ box.append(h('p',{class:'note'},'지표를 먼저 고르세요.')); return box; }
  const map=Object.assign(KM.normalizeMap(doc.map),{shade:{}}); const L=KM.layout(map); if(!L) return box;
  const rows=SM.unitsOf(map,L).map(u=>({u,v:SM.valueOf(ind,u.code,P.vals),o:SM.valueOf(ind,u.code,null)}));
  rows.sort((a,b)=>(b.v==null?-Infinity:b.v)-(a.v==null?-Infinity:a.v));
  const t=h('table',null,h('thead',null,h('tr',null,h('th',null,'순위'),h('th',null,'지역'),h('th',null,`값${ind.unit?' ('+ind.unit+')':''}`))));
  const tb=h('tbody'); let rk=0;
  for(const r of rows){ const edited=P.vals&&Object.prototype.hasOwnProperty.call(P.vals,r.u.code);
    const inp=h('input',{type:'number',step:'any',value:r.v==null?'':r.v,'aria-label':`${r.u.name} 값`,class:edited?'edited':''});
    inp.addEventListener('change',()=>{ const v=toNum(inp.value); const vals=Object.assign({},P.vals||{});
      if(v==null||v===r.o) delete vals[r.u.code]; else vals[r.u.code]=v; P.vals=Object.keys(vals).length?vals:null; changed(); renderPanels(true); });
    tb.append(h('tr',null,h('td',null,r.v==null?'-':String(++rk)),h('td',null,r.u.name),h('td',null,inp))); }
  t.append(tb); box.append(h('div',{class:'ksvwrap'},t));
  box.append(h('button',{class:'btn small',type:'button',disabled:!P.vals,onclick:()=>{ P.vals=null; changed(); renderPanels(true); }},'고친 값을 모두 원래대로'));
  return box;
}
function panelBox(P,i){
  const e=IND[P.key]; const many=doc.panels.length>1;
  const head=h('div',{class:'kshead'},h('b',null,many?`지도 ${SM.PANEL_KO[i]}`:'지도'),
    e?h('span',{class:'kstag'},e.level==='sido'?'시·도 단위':'시·군·구 단위'):null,
    many?h('button',{class:'btn small',type:'button',onclick:()=>{ doc.panels.splice(i,1); changed(); renderPanels(); }},'삭제'):null);
  const pick=h('label',{class:'ksrow'},h('span',null,'지표'),indSelect(P,id=>{ P.key=id; P.vals=null; P.breaks=null; const ie=IND[id]; if(i===0&&ie&&ie.level==='sido'&&doc.map.level==='sgg') doc.map.level='sido'; changed(); renderPanels(); syncForm(); }));
  const seg=h('div',{class:'ksseg',role:'group','aria-label':'칠하는 방식'});
  for(const [m,lb] of MODES) seg.append(h('button',{type:'button','aria-pressed':String(P.mode===m),onclick:()=>{ setMode(P,m); changed(); renderPanels(); }},lb));
  const box=h('div',{class:'kspanel'},head,pick,seg,h('p',{class:'note kshelp'},MODE_HELP[P.mode]||''));
  const num=(val,min,max,fn,label)=>{ const inp=h('input',{type:'number',min,max,step:1,value:val==null?'':val,'aria-label':label}); inp.addEventListener('input',()=>{ const v=Math.round(toNum(inp.value)); if(v>=min&&v<=max){ fn(v); changed(); } }); return inp; };
  if(P.mode==='topbottom') box.append(h('label',{class:'ksrow'},h('span',null,'개수'),num(P.n,1,10,v=>{ P.n=v; },'상위·하위 개수'),h('em',null,'개씩')));
  if(P.mode==='cond'){
    box.append(h('label',{class:'ksrow'},h('span',null,'순위'),h('span',{class:'ksrk'},'상위'),num(P.rank,1,300,v=>{ P.rank=v; P.v=null; },'상위 몇 위까지'),h('em',null,'위까지')));
    const op=h('select',{'aria-label':'비교'},...[['>=','이상'],['>','초과'],['<=','이하'],['<','미만']].map(([v,t])=>h('option',{value:v},t))); op.value=P.op||'>=';
    op.addEventListener('change',()=>{ P.op=op.value; if(P.v!=null) changed(); });
    const vi=h('input',{type:'number',step:'any',value:P.v==null?'':P.v,'aria-label':'기준값'}); vi.addEventListener('change',()=>{ const v=toNum(vi.value); P.v=v; if(v!=null) P.rank=null; changed(); renderPanels(); });
    box.append(h('div',{class:'ksadv','data-adv':true},h('label',{class:'ksrow'},h('span',null,'값'),vi,op),
      h('label',{class:'ksrow'},h('span',null,'범례'),(()=>{ const li=h('input',{type:'text',value:P.label||'',placeholder:'예: 15% 이상(비우면 범례 없음)','aria-label':'범례 글'}); li.addEventListener('change',()=>{ P.label=li.value.trim()||null; changed(); }); return li; })())));
  }
  if(P.mode==='ordinal'||P.mode==='interval'){
    const c=P.classes||(P.mode==='ordinal'?5:3);
    const cs=h('select',{'aria-label':'단계 수'},...[2,3,4,5].map(n=>h('option',{value:n},`${n}단계`))); cs.value=String(c);
    cs.addEventListener('change',()=>{ P.classes=+cs.value; P.breaks=null; changed(); renderPanels(); });
    box.append(h('label',{class:'ksrow'},h('span',null,'단계'),cs));
    const bi=h('input',{type:'text',value:P.breaks?P.breaks.join(', '):'',placeholder:`경계값 ${c-1}개(작은 값부터, 쉼표로). 비우면 자동`,'aria-label':'경계값'});
    bi.addEventListener('change',()=>{ const s=bi.value.trim(); if(!s){ P.breaks=null; changed(); return; }
      const v=s.split(/[\s,]+/).filter(Boolean).map(Number); const ok=v.length===c-1&&v.every(isFinite)&&v.every((x,k)=>k===0||x>v[k-1]);
      if(!ok){ toast(`경계값은 ${c-1}개를 작은 값부터 적어 주세요. 자동 경계로 그려요.`); P.breaks=null; } else P.breaks=v; changed(); });
    box.append(h('label',{class:'ksrow ksadv','data-adv':true},h('span',null,'경계'),bi));
  }
  { const ti=h('input',{type:'text',value:P.title==null?'':P.title,placeholder:many?`비우면 ${SM.PANEL_KO[i]}`:'제목 없음','aria-label':'지도 제목'});
    ti.addEventListener('change',()=>{ P.title=ti.value.trim()===''?null:ti.value.trim(); changed(); });
    box.append(h('label',{class:'ksrow ksadv','data-adv':true},h('span',null,'제목'),ti)); }
  const det=h('details',{class:'ksdata'},h('summary',null,'자료 보기·고치기'));
  det.addEventListener('toggle',()=>{ if(det.open&&!det.querySelector('.ksvals')) det.append(valuesTable(P)); });
  if(P.__open) det.open=true;
  box.append(det);
  if(e) box.append(h('p',{class:'note kssrc'},`출처: ${e.src||''}${e.year?` · ${e.year}년`:''}${e.tbl?` · 표 ${e.tbl}`:''}`));
  return box;
}
function renderPanels(keepOpen){
  const host=$('#ksPanels'); const open=keepOpen?[...host.querySelectorAll('.ksdata')].map(d=>d.open):[];
  host.textContent=''; doc.panels.forEach((P,i)=>{ const b=panelBox(P,i); host.append(b); if(open[i]){ const d=b.querySelector('.ksdata'); d.open=true; if(!d.querySelector('.ksvals')) d.append(valuesTable(P)); } });
  $('#ksAdd').hidden=doc.panels.length>=3;
}
$('#ksAdd').addEventListener('click',()=>{ if(doc.panels.length>=3) return; const last=doc.panels[doc.panels.length-1]; const P=cleanPanel(Object.assign({},last,{vals:null,title:null,label:last.label})); doc.panels.push(P); changed(); renderPanels(); });

/* ───────── 바탕 지도·아랫줄 ───────── */
function fillArea(){
  const sel=$('#ksArea'); sel.textContent=''; const g1=h('optgroup',{label:'권역'});
  for(const R of KM.REGIONS) g1.append(h('option',{value:R.id},R.ko)); sel.append(g1);
  const g2=h('optgroup',{label:'시·도 하나'}); for(const c of KM.sidoList(Object.assign(KM.normalizeMap(doc.map),{ver:'a'}))) g2.append(h('option',{value:'sido:'+c},KM.sidoName(c))); sel.append(g2);
}
function syncForm(){
  const m=doc.map, one=m.area==='sido'&&(m.sido||[]).length===1;
  $('#ksArea').value=one?'sido:'+m.sido[0]:(KM.REGIONS.some(R=>R.id===m.area)?m.area:'sk');
  $('#ksLevel').value=m.level==='sgg'?'sgg':'sido'; $('#ksScale').checked=m.scale!==false;
  const f=doc.foot; $('#ksFootShow').checked=!!f.show; $('#ksVerNote').checked=!!f.verNote; $('#ksNotes').value=(f.notes||[]).join('\n');
  $('#ksYear').value=f.year==null?'':f.year; $('#ksSrc').value=f.src==null?'':f.src;
}
$('#ksArea').addEventListener('change',e=>{ const v=e.target.value; if(v.startsWith('sido:')){ doc.map.area='sido'; doc.map.sido=[v.slice(5)]; } else { doc.map.area=v; doc.map.sido=[]; } changed(); });
$('#ksLevel').addEventListener('change',e=>{ doc.map.level=e.target.value; changed(); });
$('#ksScale').addEventListener('change',e=>{ doc.map.scale=e.target.checked; changed(); });
$('#ksFootShow').addEventListener('change',e=>{ doc.foot.show=e.target.checked; changed(); });
$('#ksVerNote').addEventListener('change',e=>{ doc.foot.verNote=e.target.checked; changed(); });
$('#ksNotes').addEventListener('change',e=>{ doc.foot.notes=e.target.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,5); changed(); });
$('#ksYear').addEventListener('change',e=>{ doc.foot.year=e.target.value.trim()||null; changed(); });
$('#ksSrc').addEventListener('change',e=>{ doc.foot.src=e.target.value.trim()||null; changed(); });

/* ───────── 문장으로 만들기(KMAP-STATS §5) ───────── */
/* 지표 별칭: 자료의 ko·alias에 시험지에서 흔히 쓰는 말을 더한다 */
const SYN={aged_ratio:['고령화율','고령화','고령 인구','고령인구','65세 이상 인구','65세 이상','노인 인구 비율'],aging_index:['노령화지수','노령화'],old_dep:['노년부양비','노년 부양비'],young_dep:['유소년부양비','유소년 부양비'],
  median_age:['중위연령','중위 연령'],youth_ratio:['청년층','청년 인구','청년 비율'],one_person_hh:['1인 가구','1인가구','1인 가구 비율','혼자 사는'],elderly_alone:['독거노인','독거 노인','독거노인 가구'],
  foreigner_per1000:['외국인 주민','외국인 비율','외국인 주민 비율','외국인'],population:['인구 수','인구수','주민등록인구','인구'],tfr:['합계출산율','합계 출산율','출산율'],net_migration_rate:['순이동률','순 이동률','순이동'],
  farm_pop_ratio:['농가 인구 비율','농가 인구','농가인구','농가'],paddy_area:['논 면적','논면적','논'],fiscal_indep:['재정자립도','재정 자립도','재정자립'],grdp:['지역내총생산','지역 내 총생산','GRDP','지역총생산'],
  mfg_shipment:['제조업 출하액','출하액'],mfg_workers:['제조업 종사자','제조업 종사자 수'],density_sido:['인구 밀도','인구밀도']};
const nz=s=>String(s).replace(/\s+/g,'');
function nameTable(){ const out=[]; for(const i of LIST){ const names=[i.ko,...(i.alias||[]),...(SYN[i.id]||[])]; for(const n of names) if(n&&n.length>=2) out.push({id:i.id,n,k:nz(n)}); } return out.sort((a,b)=>b.k.length-a.k.length); }
/* 문장 조각에서 지표를 긴 이름부터 찾는다. 반환: 찾은 지표와 그 자리를 지운 문장 */
function findInds(seg){
  const t=nz(seg); const hits=[]; let rest=t;
  for(const nm of nameTable()){ let from=0; for(;;){ const i=rest.indexOf(nm.k,from); if(i<0) break; hits.push({id:nm.id,i,len:nm.k.length}); rest=rest.slice(0,i)+'\u0000'.repeat(nm.k.length)+rest.slice(i+nm.k.length); from=i+nm.k.length; } }
  hits.sort((a,b)=>a.i-b.i); const ids=[]; for(const x of hits) if(!ids.includes(x.id)) ids.push(x.id);
  return {ids,rest:rest.replace(/\u0000+/g,' ')};
}
/* 시도 이름: 정식·약칭을 모두 받는다(충남·충청남도·충청남, 경북·경상북도·경상북 …). 긴 이름부터 찾고, 앞이 한글이면(다른 낱말의 일부) 건너뛴다 */
const SIDO_EXTRA={'43':['충청북','충북도'],'44':['충청남','충남도'],'47':['경상북','경북도'],'48':['경상남','경남도'],'52':['전라북','전북도','전북특별자치도'],'46':['전라남','전남도'],'51':['강원도','강원특별자치도'],'50':['제주도','제주특별자치도'],'41':['경기도'],'36':['세종특별자치시'],'12':['전남광주통합특별시','전남광주']};
function sidoTable(){ const rows=[]; const W=KM.SIDO_WORDS||{}; const codes=new Set([...Object.keys(W),...Object.keys(SIDO_EXTRA)]);
  for(const c of codes) for(const w of new Set([...(W[c]||[]),...(SIDO_EXTRA[c]||[])])) rows.push([c,w]);
  return rows.sort((x,y)=>y[1].length-x[1].length); }
function findSidos(text){
  const used=new Array(text.length).fill(false); const hits=[];
  for(const [c,w] of sidoTable()){ let from=0; for(;;){ const i=text.indexOf(w,from); if(i<0) break; from=i+1;
    if(used.slice(i,i+w.length).some(Boolean)) continue; if(i>0&&/[가-힣]/.test(text[i-1])) continue;
    for(let k=i;k<i+w.length;k++) used[k]=true; hits.push([i,c]); } }
  hits.sort((x,y)=>x[0]-y[0]); return [...new Set(hits.map(x=>x[1]))];
}
/* 방식 낱말: 지표 이름을 지운 문장에서 본다('65세 이상' 같은 이름과 헷갈리지 않게). 'N% 이상인 곳'은 값 조건, 'N위까지·상위 N곳'만 순위 */
const OPS={'이상':'>=','초과':'>','이하':'<=','미만':'<'};
const OPS_KO={'>=':'이상','>':'초과','<=':'이하','<':'미만'};
const josa=(w,a,b)=>{ const c=String(w).charCodeAt(String(w).length-1)-0xAC00; return c>=0&&c%28?a:b; };
function modeOf(txt){
  const P={mode:'topbottom'}; const num=re=>{ const m=txt.match(re); return m?+m[1]:null; };
  const cls=num(/(\d)\s*단계/); const hasLo=/미만|이하/.test(txt), hasHi=/이상|초과/.test(txt);
  const cond=txt.match(/(-?\d+(?:\.\d+)?)\s*(?:%|퍼센트|명|세|배|원|ha|kW)?\s*(이상|초과|이하|미만)/);
  const rank=txt.match(/(\d+)\s*위\s*까지/)||txt.match(/상위\s*(\d+)\s*(?:곳|지역|시군)/);
  if(/구간/.test(txt)||(hasHi&&hasLo&&!cond)||(hasHi&&hasLo&&/~|부터/.test(txt))){ P.mode='interval'; P.classes=cls&&cls>=2&&cls<=5?cls:3; }
  else if(cls||/서열|높고\s*낮|높음/.test(txt)){ P.mode='ordinal'; P.classes=cls&&cls>=2&&cls<=5?cls:5; }
  else if(cond&&!/상위\s*\d|하위\s*\d/.test(txt)){ P.mode='cond'; P.v=+cond[1]; P.op=OPS[cond[2]]; P.rank=null; }
  else if(rank&&!/하위/.test(txt)){ P.mode='cond'; P.rank=Math.min(+rank[1],300); }
  else { const t=num(/상위\s*(\d+)/), b=num(/하위\s*(\d+)/); const v=t||b||num(/(\d+)\s*개/); P.n=v?Math.min(Math.max(v,1),10):5; }
  return P;
}
/* 지도 범위·단위는 문장마다 새로 정한다(이전 문장의 값을 이어받지 않는다). 시도 이름 > 권역 낱말 > 전국 */
function parseSentence(q){
  const text=String(q||'').trim(); if(!text) return {err:'문장을 입력해 주세요.'};
  const base=Object.assign(KM.freshMap(),{ver:'a',verPick:true,level:'sgg',metro:'split'});
  const sp=KM.parse(text,base); const map=sp.map; if(!map.verPick){ map.ver='a'; map.verPick=true; }
  const sidos=findSidos(text);
  if(sidos.length){ map.area='sido'; map.sido=sidos.slice(0,17); }
  else if(sp.areaSet&&map.area!=='sido'){ map.sido=[]; }
  else { map.area='sk'; map.sido=[]; }
  map.metro=map.metro==='merge'?'merge':'split';
  const wantSgg=/구별|구\s*단위|시\s*·?\s*군|시군|군\s*·?\s*구|자치구/.test(text); const wantSido=/시\s*·?\s*도|시도/.test(text);
  /* 패널 나누기: 지역은 전체 문장에서 이미 정했다. (가)(나)(다) 표시가 있으면 그 자리에서, 없으면 찾은 지표마다 한 장 */
  const marks=[...text.matchAll(/\(\s*(가|나|다)\s*\)/g)];
  const segs=[]; if(marks.length>=2) marks.forEach((m,k)=>segs.push(text.slice(m.index+m[0].length,k+1<marks.length?marks[k+1].index:undefined)));
  const common=findInds(text); const panels=[]; const unknown=[];
  if(segs.length){ segs.slice(0,3).forEach((sg,k)=>{ const f=findInds(sg); const id=f.ids[0]||common.ids[k]||null; if(!id){ unknown.push(sg.trim()); return; }
      const own=/상위|하위|단계|구간|미만|이상|이하|초과|위\s*까지/.test(f.rest); panels.push(Object.assign(SM.freshPanel(id),modeOf(own?f.rest:common.rest))); }); }
  else if(common.ids.length){ const mp=modeOf(common.rest); for(const id of common.ids.slice(0,3)) panels.push(Object.assign(SM.freshPanel(id),mp));
    const cnt=text.match(/([2-3])\s*장|(두|세)\s*장/); if(panels.length===1&&cnt){ const k=cnt[1]?+cnt[1]:(cnt[2]==='두'?2:3); for(let j=1;j<k;j++) panels.push(Object.assign({},panels[0])); } }
  if(!panels.length||unknown.length){ map.level=wantSgg?'sgg':wantSido?'sido':'sgg'; return {err:'어떤 통계인지 알아듣지 못했어요.',suggest:suggest(text),map}; }
  const sidoOnly=panels.map(P=>IND[P.key]).filter(e=>e&&e.level==='sido');
  const level=wantSgg?'sgg':wantSido?'sido':(sidoOnly.length?'sido':(sidos.length?'sgg':'sgg'));
  /* 시·도 단위 자료뿐인 지표로 시·군·구 지도를 요구하면 조용히 바꾸지 않고 알려 준다 */
  map.level=level;
  if(wantSgg&&sidoOnly.length){ const alt=Object.assign({},{map:Object.assign({},map,{area:'sk',sido:[],level:'sido'}),panels:panels.map(cleanPanel)});
    return {err:`${sidoOnly[0].ko}${josa(sidoOnly[0].ko,'은','는')} 시·도 단위 자료만 있어서 시·군·구(구) 단위 지도는 만들 수 없어요.`,suggest:suggest(text).filter(i=>i.level==='sgg'),alt,map}; }
  return {map,panels:panels.map(cleanPanel)};
}
/* 비슷한 지표 3개(글자가 겹치는 정도) */
function suggest(text){
  const t=nz(text); const score=i=>{ let s=0; for(const n of [i.ko,...(i.alias||[]),...(SYN[i.id]||[])]){ for(const ch of new Set(nz(n))) if(t.includes(ch)) s+=1/Math.sqrt(nz(n).length); } return s; };
  return LIST.map(i=>({i,s:score(i)})).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.i);
}
function say(msg,btns){ const p=$('#ksAskMsg'); p.hidden=!msg; p.textContent=msg||''; if(btns&&btns.length){ const row=h('span',{class:'ksbtnrow'}); btns.forEach(b=>row.append(b)); p.append(h('br'),row); } }
const fmtV=v=>(+v).toLocaleString('en-US');
function describe(P){ const e=IND[P.key]; const m={topbottom:`상위·하위 ${P.n}개`,cond:P.rank?`상위 ${P.rank}위까지`:(P.v!=null?`${fmtV(P.v)} ${OPS_KO[P.op||'>=']}인 곳`:'조건 칠하기'),ordinal:`${P.classes}단계(높음↕낮음)`,interval:`${P.classes}단계 구간`}[P.mode]; return `${e?e.ko:P.key} ${m}`; }
function runAsk(){
  const q=$('#ksQ').value; const r=parseSentence(q);
  if(r.err){
    const btns=(r.suggest||[]).map(i=>h('button',{class:'btn small',type:'button',onclick:()=>{ doc.map=Object.assign(KM.normalizeMap(r.map||doc.map),{verPick:true,level:i.level==='sido'?'sido':((r.map&&r.map.level)||'sgg')}); doc.panels=[SM.freshPanel(i.id)]; changed(); renderPanels(); syncForm(); say(`${i.ko}(으)로 만들었어요. 방식은 오른쪽에서 바꿀 수 있어요.`); }},i.ko));
    if(r.alt) btns.push(h('button',{class:'btn small',type:'button',onclick:()=>{ doc.map=Object.assign(KM.normalizeMap(r.alt.map),{verPick:true}); doc.panels=r.alt.panels; changed(); renderPanels(); syncForm(); say('전국 시·도 단위 지도로 만들었어요.'); }},'전국 시·도 단위로 만들기'));
    say(r.err+(btns.length?(r.alt?' 이렇게 해 볼까요?':' 이 중에 있나요?'):''),btns); return; }
  doc.map=Object.assign(KM.normalizeMap(r.map),{verPick:true}); doc.panels=r.panels; changed(); renderPanels(); syncForm();
  say(`${r.panels.length}장으로 만들었어요: ${r.panels.map((P,i)=>(r.panels.length>1?SM.PANEL_KO[i]+' ':'')+describe(P)).join(' / ')}. 방식과 값은 오른쪽에서 바꿀 수 있어요.`);
}
const EX=['경상남도 시군별 노령화 지수 상위 5개·하위 5개 지역','강원도 시군 고령 인구 비율 상위 3개 하위 3개','전국 시도별 합계 출산율 5단계 높음 낮음','경기도 시군 1인 가구 비율 3단계 구간',
  '(가) 노령화 지수, (나) 외국인 주민 비율, 경상남도 시군 상위 5개 하위 5개','충청남도 시군 인구 상위 5위까지 칠하기'];
(function(){ const box=$('#ksEx'); EX.forEach(q=>box.append(h('button',{class:'ex',type:'button',onclick:()=>{ $('#ksQ').value=q; runAsk(); }},q))); })();
$('#ksGo').addEventListener('click',runAsk);
$('#ksQ').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); runAsk(); } });

/* ───────── 내보내기 · 작업 파일 ───────── */
function stamp(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
const nameOf=()=>`한국통계지도_${KM.areaLabel(doc.map)}_${stamp()}`.replace(/[\\/:*?"<>|()\s·]+/g,'_').replace(/_+/g,'_');
$('#pngBtn').addEventListener('click',async()=>{ try{ await loadFonts(); const b=await LG.renderPng(doc,600); const r=await GG.saveFile(nameOf()+'.png',b,'image/png'); toast(r==='saved'?'PNG로 저장했어요.':'저장하지 못했어요.'); }catch(e){ console.error(e); toast('PNG를 만들지 못했어요.'); } });
$('#svgBtn').addEventListener('click',async()=>{ await loadFonts(); const r=await GG.saveFile(nameOf()+'.svg',LG.svgString(doc,{inline:true}),'image/svg+xml'); toast(r==='saved'?'SVG로 저장했어요.':'저장하지 못했어요.'); });
$('#saveJson').addEventListener('click',async()=>{ const r=await GG.saveFile(`한국통계지도_작업_${stamp()}.json`,JSON.stringify(saveable()),'application/json'); toast(r==='saved'?'작업을 저장했어요.':'저장하지 못했어요.'); });
function loadDoc(d,msg){ doc=norm(d); fillArea(); syncForm(); changed(); renderPanels(); loadFonts(); if(msg) toast(msg); }
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='kstat') throw 0; loadDoc(d,'작업을 불러왔어요.'); }catch(err){ toast('한국 통계 지도 작업 파일이 아니에요.'); } });
$('#resetBtn').addEventListener('click',()=>{ doc=freshDoc(); syncForm(); changed(); renderPanels(); say(''); toast('새 지도를 시작했어요.'); });

/* ───────── 시작 ───────── */
fillArea(); syncForm(); rebuild(); draw(); renderPanels(); loadFonts();
if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ LG.clearMetrics(); rebuild(); draw(); });
return {load:d=>{ if(!d||d.app!=='kstat') return false; loadDoc(d,'작업을 불러왔어요.'); return true; },getDoc:()=>doc,parse:parseSentence};
});
