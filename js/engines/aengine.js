/* 세계지리 농업 그래프 엔진: FAOSTAT 생산·교역·식량 수급표 자료를 에너지 엔진(EG)의 누적 막대·원그래프·면적 비율·묶은 막대·표와
   인구 엔진(PG)의 산점도로 그린다. 목록 표(상위 나라 이름, 순 수출·수입 순위)는 이 엔진이 직접 그린다. */
const AG=(function(){
'use strict';
const {fin,fmt,Ops,fontOf,metrics,W,gray,sum}=GG;
const {finish,josa,particle,lblOf,derive,setTable,autoFills,mask,SEQ,shuffleArr,namesSorted,seqRange,LAST}=EG;

/* ───────── 자료 ───────── */
let AD=null, IT={}, YI={};
function setData(d){ AD=d&&d.s?d:null; IT={}; YI={}; if(AD){ AD.items.forEach(x=>IT[x.k]=x); for(const [k,ys] of Object.entries(AD.years)){ YI[k]={}; ys.forEach((y,i)=>YI[k][y]=i); } } }
function data(){ return AD; }
const U_W=[['천 t',1],['만 t',0.1],['백만 t',0.001]], U_H=[['천 마리',1],['만 마리',0.1],['백만 마리',0.001]], U_A=[['천 ha',1],['만 ha',0.1],['백만 ha',0.001]], U_V=[['백만 달러',1],['억 달러',0.01]];
/* 지표: 키 → 이름 · 자료(q=생산 QCL, t=교역 TCL, f=식량 수급표 FBS) · 단위 */
const EL={
  p:{name:'생산량',src:'q',units:U_W,u:2},
  a:{name:'수확 면적',src:'q',units:U_A,u:1},
  s:{name:'사육 두수',src:'q',units:U_H,u:2},
  tx:{name:'수출량',src:'t',units:U_W,u:2}, tm:{name:'수입량',src:'t',units:U_W,u:2},
  txv:{name:'수출액',src:'t',units:U_V,u:0}, tmv:{name:'수입액',src:'t',units:U_V,u:0},
  net:{name:'순 수출량',src:'t',units:U_W,u:2,calc:true},
  fp:{name:'생산량(식량 수급표)',src:'f',units:U_W,u:2}, fx:{name:'수출량(식량 수급표)',src:'f',units:U_W,u:2}, fm:{name:'수입량(식량 수급표)',src:'f',units:U_W,u:2},
  fd:{name:'국내 공급량',src:'f',units:U_W,u:2}, fc:{name:'1인당 식용 공급량',src:'f',units:[['kg/년',1]],u:0}
};
const EL_KEYS=Object.keys(EL);
const REGIONS6=['아시아','유럽','아프리카','오세아니아','앵글로아메리카','라틴 아메리카'], REGIONS5=['아시아','유럽','아프리카','오세아니아','아메리카'];
const ALIAS={'미국':['미합중국','US','USA'],'오스트레일리아':['호주'],'에스파냐':['스페인'],'튀르키예':['터키'],'타이':['태국'],'콩고 민주 공화국':['콩고민주공화국','민주 콩고','DR콩고'],
  '남아프리카 공화국':['남아공','남아프리카공화국'],'사우디아라비아':['사우디'],'아랍에미리트':['UAE','아랍 에미리트'],'한국':['대한민국','우리나라','남한'],'영국':['UK'],
  '코트디부아르':['코트디부아르(아이보리코스트)','아이보리코스트'],'앵글로아메리카':['앵글로 아메리카','북부 아메리카','북아메리카','북미'],'라틴 아메리카':['라틴아메리카','중·남부 아메리카','중남부 아메리카','중·남아메리카','중남미'],
  '세계':['전 세계','전세계'],'유럽 연합(EU)':['유럽 연합','EU'],'서아시아':['서남아시아']};
function meta(n){ return AD&&AD.meta[n]||{}; }
function isAgg(n){ const k=meta(n).kind; return !!k&&k!=='country'; }
function items(grp){ return AD?AD.items.filter(x=>!grp||x.grp===grp):[]; }
function itemName(k){ return IT[k]?IT[k].ko:k; }
function hasEl(k,el){ if(!AD) return false; if(el==='net') return !!(AD.s['tx.'+k]&&AD.s['tm.'+k]); return !!AD.s[el+'.'+k]; }
function elsOf(k){ return EL_KEYS.filter(e=>hasEl(k,e)); }
function entities(){ if(!AD) return []; const s=new Set(); for(const v of Object.values(AD.s)) for(const n of Object.keys(v)) s.add(n); return [...s]; }
function aliasFind(name){ const t=String(name||'').trim(); if(!t||!AD) return null; if(AD.meta[t]) return t; for(const [k,a] of Object.entries(ALIAS)) if(a.includes(t)) return k; return null; }
function yearsOf(el){ return AD?AD.years[EL[el].src].slice():[]; }

/* ───────── 시점: ‘2023’, ‘2018~2022’(양 끝 포함) · 묶음 방법(mean 평균 · sum 합산) ───────── */
function parseTp(s){ const t=String(s||'').trim().replace(/년$/,''); let m=t.match(/^(\d{4})\s*[~∼～\-–]\s*(\d{4})$/);
  if(m){ const a=+m[1], b=+m[2]; return b>=a?{a,b,label:`${a}~${b}`}:null; } m=t.match(/^(\d{4})$/); return m?{a:+m[1],b:+m[1],label:m[1]}:null; }
function tpYears(tp){ const out=[]; for(let y=tp.a;y<=tp.b;y++) out.push(y); return out; }
function raw(n,el,k,y){ const s=AD&&AD.s[el+'.'+k]; const i=YI[EL[el].src][y]; if(!s||i==null) return null; const a=s[n]; const x=a?a[i]:null; return fin(x)?x:null; }
function at(n,el,k,y){ if(el==='net'){ const x=raw(n,'tx',k,y), m=raw(n,'tm',k,y); if(x==null&&m==null) return null; return (x||0)-(m||0); } return raw(n,el,k,y); }
function valueAt(n,el,k,tp,agg,uf){
  if(!tp) return null; const ys=tpYears(tp); if(ys.some(y=>YI[EL[el].src][y]==null)) return null;
  const vals=ys.map(y=>at(n,el,k,y)); if(!vals.some(fin)) return null;
  const s=sum(vals.filter(fin)); const v=agg==='sum'||ys.length===1?s:s/ys.length; return v*(uf==null?1:uf); }
function tpOk(el,tp){ return !!tp&&tpYears(tp).every(y=>YI[EL[el].src][y]!=null); }
function unitOf(el,ui){ const E=EL[el]; const j=ui==null?(E.u||0):Math.min(ui,E.units.length-1); return {u:E.units[j][0],f:E.units[j][1],j}; }
function periodNote(tp,agg,elName){ if(!tp||tp.a===tp.b) return ''; return agg==='sum'?`${elName||'통계값'}은 ${tp.label}년 합산값임.`:`${elName?josa(elName,'은','는'):'통계값은'} ${tp.label}년의 평균값임.`; }
function srcOf(els){ const s=new Set(els.map(e=>EL[e]?EL[e].src:'q')); const n={q:'Crops and livestock products',t:'Trade: Crops and livestock products',f:'Food Balances'}; return `출처: FAO, FAOSTAT(${[...s].map(x=>n[x]).join('; ')}).`; }
/* 순위에 넣을 나라: 나라 항목만, 옛 나라(소련 등)는 그 시점에 값이 있을 때만 */
function countryPool(el,k,tp,reg){ return entities().filter(n=>{ const m=meta(n); if(m.kind!=='country'||m.part) return false; if(reg&&reg.length&&!reg.some(r=>r===m.reg||(r==='아메리카'&&(m.reg==='라틴 아메리카'||m.reg==='앵글로아메리카'))||r===m.sub)) return false; return true; }); }

/* ───────── 문서 ───────── */
const KINDS=['stack','donut','tree','group','small','tb','sc','list'];
const KIND_KO={stack:'누적 막대',donut:'원그래프',tree:'면적 비율',group:'묶은 막대',small:'상댓값 막대',tb:'표',sc:'산점도',list:'이름 표'};
function freshDoc(kind){
  const d=EG.freshDoc('stack'); d.app='agriculture'; d.v=1; d.kind=KINDS.includes(kind)?kind:'stack';
  Object.assign(d.data,{unit:'%',measure:'생산량',rowNoun:'국가',itemNoun:'작물'});
  Object.assign(d.donut,{hole:0,center:'none',top:'lbl',inLbl:'name',size:30,gap:8,leader:true});
  d.sc={w:46,h:40,conn:false,arrow:false,diag:false,zero:true,grid:true,lbl:true,legend:'none',mks:1.3,xTitle:'',yTitle:'',x:{auto:true,lo:0,hi:400,step:100},y:{auto:true,lo:0,hi:100,step:20},gap:10,share:false};
  d.list={layout:'col',n:5,dir:'high',order:'rank',head:'',highWord:'순 수출량',lowWord:'순 수입량',rankCol:true,corner:'구분'};
  return d;
}
function normalizeDoc(d){
  d=GG.clean(d);   /* 밖에서 들어온 값 정리(보안): gengine.js clean() */
  const f=freshDoc(d&&d.kind); if(!d||typeof d!=='object') return f;
  const out=EG.normalizeDoc(Object.assign({},d,{kind:'stack'}));
  out.app='agriculture'; out.kind=KINDS.includes(d.kind)?d.kind:'stack';
  out.sc=Object.assign({},f.sc,d.sc||{}); out.sc.x=Object.assign({},f.sc.x,(d.sc||{}).x||{}); out.sc.y=Object.assign({},f.sc.y,(d.sc||{}).y||{});
  out.list=Object.assign({},f.list,d.list||{});
  return out;
}

/* ───────── 산점도: 열의 grp(품목)마다 한 칸, 칸마다 (가로, 세로) 한 쌍 ───────── */
function composeSc(doc){
  const D=doc.data; const C=D.cols.filter(c=>!c.hide); const groups=[]; for(const c of C){ const g=c.grp||''; let p=groups.find(x=>x.g===g); if(!p){ p={g,cols:[]}; groups.push(p); } p.cols.push(c); }
  const panels=groups.filter(p=>p.cols.some(c=>c.role==='x')&&p.cols.some(c=>c.role==='y'));
  if(!panels.length) return null;
  const out=new Ops(doc); let x0=0; const o=doc.sc;
  /* 칸마다 PG 산점도를 따로 그려 옆으로 붙인다(주석·연도는 마지막에 한 번) */
  const unitTxt=panels[0].cols[0].unit||'';
  panels.forEach((p,pi)=>{
    const sub=JSON.parse(JSON.stringify(doc)); sub.app='population'; sub.kind='sc';
    const keepIds=new Set(p.cols.map(c=>c.id)); const idx=D.cols.map((c,j)=>keepIds.has(c.id)?j:-1).filter(j=>j>=0);
    sub.data.cols=idx.map(j=>Object.assign({},D.cols[j],{t:'',unit:o.share?'':D.cols[j].unit})); sub.data.v=D.v.map(r=>idx.map(j=>r[j]));
    sub.meta=Object.assign({},sub.meta,{title:'',year:'',src:'',notes:'',autoNote:false}); sub.data.note='';
    if(o.share&&panels.length>1&&pi>0){ sub.sc.yTitle=' '; }
    const r=GG.compose(sub); if(!r) return; const ops=r.ops; const b=ops.bounds();
    if(p.g&&panels.length>1){ ops.text(p.g,o.w/2,b.y-1.6,'title',{align:'center'}); }
    const b2=ops.bounds(); out.absorb(ops,x0-b2.x,0); x0+=b2.w+o.gap;
  });
  if(panels.length>1&&unitTxt&&o.share){ const B=out.bounds(); out.text(`(${unitTxt})`,B.x+B.w,B.y-0.8,'unit',{align:'right'}); }
  const B=out.bounds();
  return {ops:out,plot:{x:B.x,y:B.y,w:B.w,h:B.h},legend:'none',items:[]};
}

/* ───────── 이름 표: 열(또는 행)마다 값이 큰 나라 이름을 늘어놓는다 ───────── */
function gridTable(ops,doc,rows,o){
  /* 칸: {s, role, shade, cs(가로 합치기), rs(세로 합치기)} · 합쳐진 자리에 놓인 칸은 null */
  o=o||{}; const lineH=metrics(fontOf(doc,'td'),'가').H, padV=2.0, padH=2.8;
  const cw=c=>c?metrics(fontOf(doc,c.role||'td'),String(c.s)).W:0;
  const nR=rows.length, nC=Math.max(...rows.map(r=>r.length)); const colW=Array(nC).fill(o.minW||0), rowH=rows.map(()=>lineH+2*padV);
  const own=rows.map(()=>Array(nC).fill(null)); const cells=[];
  rows.forEach((r,ri)=>r.forEach((cell,ci)=>{ if(!cell) return; const cs=Math.max(1,cell.cs||1), rs=Math.max(1,cell.rs||1); const id={cell,r:ri,c:ci,cs,rs}; cells.push(id);
    for(let y=ri;y<Math.min(nR,ri+rs);y++) for(let x=ci;x<Math.min(nC,ci+cs);x++) own[y][x]=id; }));
  for(const k of cells) if(k.cs===1) colW[k.c]=Math.max(colW[k.c],cw(k.cell)+2*padH);
  if(nC>2){ const mx=Math.max(...colW.slice(1)); for(let c=1;c<nC;c++) colW[c]=mx; }
  for(const k of cells) if(k.cs>1){ const need=cw(k.cell)+2*padH, have=colW.slice(k.c,k.c+k.cs).reduce((a,b)=>a+b,0); if(need>have) for(let c=k.c;c<k.c+k.cs;c++) colW[c]+= (need-have)/k.cs; }
  const X=[0]; colW.forEach(w=>X.push(X[X.length-1]+w)); const Y=[0]; rowH.forEach(h=>Y.push(Y[Y.length-1]+h)); const TW=X[nC], TH=Y[nR];
  const shadeC=gray(Math.max(doc.style.light,222)); const box=k=>({x:X[k.c],y:Y[k.r],w:X[Math.min(nC,k.c+k.cs)]-X[k.c],h:Y[Math.min(nR,k.r+k.rs)]-Y[k.r]});
  for(const k of cells) if(k.cell.shade){ const b=box(k); ops.rect(b.x,b.y,b.w,b.h,{fill:shadeC}); }
  for(const k of cells){ if(k.cell.s==='') continue; const b=box(k); const m=metrics(fontOf(doc,k.cell.role||'td'),'가'); ops.text(String(k.cell.s),b.x+b.w/2,b.y+(b.h-m.H)/2+m.A,k.cell.role||'td',{align:'center'}); }
  const hdr=o.hdr||1;
  for(let r=1;r<nR;r++) for(let c=0;c<nC;c++) if(own[r-1][c]!==own[r][c]) ops.seg(X[c],Y[r],X[c+1],Y[r],W(doc,r===hdr?0.16:0.12));
  for(let c=1;c<nC;c++) for(let r=0;r<nR;r++) if(own[r][c-1]!==own[r][c]) ops.seg(X[c],Y[r],X[c],Y[r+1],W(doc,0.12));
  ops.rect(0,0,TW,TH,{stroke:'#000000',sw:W(doc,0.16)});
  return {w:TW,h:TH};
}
function listCells(doc){
  const o=doc.list; const {R,C,M}=derive(doc); const N=Math.max(1,Math.min(10,+o.n||3));
  const pick=(j,dir)=>{ const a=R.map((r,i)=>[r,M[i][j]]).filter(x=>fin(x[1])&&(dir==='low'?x[1]<0:o.dir==='both'?x[1]>0:true)); a.sort((p,q)=>dir==='low'?p[1]-q[1]:q[1]-p[1]); let top=a.slice(0,N).map(x=>lblOf(x[0]));
    if(o.order==='gana') top=namesSorted(top); return top; };
  return {R,C,N,pick};
}
function composeList(doc){
  const o=doc.list; const {C,N,pick}=listCells(doc); if(!C.length) return null;
  const ops=new Ops(doc); const th=s=>({s,role:'th',shade:true}), td=s=>({s,role:'td'});
  let rows=[], hdr=1;
  if(o.layout==='row'){ /* 행 = 표의 열(예: 해), 칸 = 순위 */
    const ranks=Array.from({length:N},(_,k)=>`${k+1}위`); const pad=n=>Array(n).fill(null);
    if(o.dir==='both'&&N>1){ /* 2025학년도 수능 12번: ‘순 수출량’·‘순 수입량’ 아래에 1위·2위 */
      rows.push([Object.assign(th(o.corner||'구분'),{rs:2}),Object.assign(th(o.highWord),{cs:N}),...pad(N-1),Object.assign(th(o.lowWord),{cs:N}),...pad(N-1)]);
      rows.push([null,...ranks.map(th),...ranks.map(th)]); hdr=2; }
    else { const head=[th(o.corner||'구분')];
      if(o.dir==='both'){ head.push(th(o.highWord),th(o.lowWord)); } else ranks.forEach(r=>head.push(th(o.head?`${o.head} ${r}`:r)));
      rows.push(head); }
    C.forEach((c,j)=>{ const hi=pick(j,'high'); const lo=o.dir==='both'?pick(j,'low'):[];
      const r=[td(lblOf(c))]; for(let k=0;k<N;k++) r.push(td(hi[k]||'')); if(o.dir==='both') for(let k=0;k<N;k++) r.push(td(lo[k]||'')); rows.push(r); });
  } else { /* 열 = 표의 열(예: 작물), 줄 = 1위~N위(또는 가나다순) */
    const head=o.order==='rank'&&o.rankCol?[th(o.corner||'순위')]:[]; C.forEach(c=>head.push(th(o.head?`${lblOf(c)} ${o.head}`:lblOf(c)))); rows.push(head);
    const cols=C.map((c,j)=>pick(j,'high'));
    for(let k=0;k<N;k++){ const r=o.order==='rank'&&o.rankCol?[th(`${k+1}위`)]:[]; cols.forEach(L=>r.push(td(L[k]||''))); rows.push(r); }
  }
  gridTable(ops,doc,rows,{minW:12,hdr});
  const B=ops.bounds(); return {ops,plot:{x:0,y:0,w:B.w,h:B.h},legend:'none',items:[]};
}

function compose(doc){
  for(const k of Object.keys(LAST)) delete LAST[k];
  const f={sc:composeSc,list:composeList}[doc.kind]; const r=f?f(doc):null; if(!r) return null;
  const ops=finish(doc,r); return {ops,plots:[r.plot]};
}
for(const k of ['sc','list']) GG.register(k,compose,'agriculture');
for(const k of ['stack','donut','tree','group','small','tb']) GG.register(k,EG.compose,'agriculture');
function autoNotes(doc){ return EG.autoNotes(doc); }

/* ───────── 자료로 표 만들기 ───────── */
function expandRows(list){ const out=[]; for(const n of list){ const s=String(n);
    if(s==='@@6') REGIONS6.forEach(r=>out.includes(r)||out.push(r)); else if(s==='@@5') REGIONS5.forEach(r=>out.includes(r)||out.push(r));
    else if(s.startsWith('@')){ const R=s.slice(1); for(const c of entities()){ const m=meta(c); if(m.kind==='country'&&!m.old&&!m.part&&(m.reg===R||m.sub===R||(R==='아메리카'&&(m.reg==='라틴 아메리카'||m.reg==='앵글로아메리카')))&&!out.includes(c)) out.push(c); } }
    else { const a=aliasFind(s)||s; if(!out.includes(a)) out.push(a); } } return out; }
function defaultEx(k){ return hasEl(k,'tx')?'tx':'fx'; }
function fixEl(k,el){ if(el==='x') return hasEl(k,'tx')?'tx':'fx'; if(el==='m') return hasEl(k,'tm')?'tm':'fm'; if(el==='p'&&!hasEl(k,'p')&&hasEl(k,'fp')) return 'fp'; if(el==='p'&&IT[k]&&IT[k].live) return 's'; return el; }
function lastTp(el){ const ys=yearsOf(el); return ys.length?{a:ys[ys.length-1],b:ys[ys.length-1],label:String(ys[ys.length-1])}:null; }
function measureOf(el){ return EL[el].name.replace(/\(.*\)$/,''); }
const FILLS=['hl','dark','fs','light','dot','bs','mid','vl','zz','sdot','xx'];   // 흰색은 ‘기타’ 몫(2027학년도 9월 17번 무늬 순서)
/* ① 상위 나라 비율: 행 = 품목, 열 = 상위 나라(겹치면 하나) + 기타, 값 = 세계 대비 % */
function presetTop(doc,p){
  const keys=(p.items||[]).filter(k=>IT[k]); const el0=p.el||'p'; const N=Math.max(1,Math.min(10,+p.n||3)); const agg=p.agg==='sum'?'sum':'mean'; const reg=(p.regions||[]).filter(Boolean);
  const per=[], lost=[];
  for(const k of keys){ const el=fixEl(k,el0); if(!hasEl(k,el)){ lost.push(itemName(k)); continue; }
    const tp=parseTp(p.tp)&&tpOk(el,parseTp(p.tp))?parseTp(p.tp):lastTp(el); const w=valueAt('세계',el,k,tp,agg); if(!fin(w)||w<=0){ lost.push(itemName(k)); continue; }
    const rows=countryPool(el,k,tp,reg).map(n=>[n,valueAt(n,el,k,tp,agg)]).filter(a=>fin(a[1])&&a[1]>0).map(([n,v])=>[n,v/w*100]); rows.sort((a,b)=>b[1]-a[1]);
    per.push({k,el,tp,top:rows.slice(0,N)}); }
  const names=[]; for(const q of per) for(const [n] of q.top) if(!names.includes(n)) names.push(n);
  const other=p.other!==false&&!reg.length;
  const cols=names.map((n,j)=>({name:n,fill:FILLS[j%FILLS.length]})); if(other) cols.push({name:'기타',other:true,fill:'white'});
  const v=per.map(q=>{ const r=names.map(n=>{ const t=q.top.find(x=>x[0]===n); return t?t[1]:null; }); if(other) r.push(Math.max(0,100-sum(r.filter(fin)))); return r; });
  setTable(doc,per.map(q=>({name:itemName(q.k),key:q.k})),cols,v,{fills:false});
  const el=per[0]?per[0].el:el0; const ms=measureOf(el); const tp=per[0]?per[0].tp:null;
  const notes=[periodNote(tp,agg,ms)]; if(other) notes.push(`상위 ${N}개국 외 국가의 ${ms} 비율은 기타로 처리함.`);
  if(reg.length) notes.push(`${reg.join('·')} 국가 중 ${ms} 상위 ${N}개국이 전 세계 ${ms}에서 차지하는 비율임.`);
  Object.assign(doc.data,{unit:'%',measure:ms,rowNoun:'작물',itemNoun:'국가',note:notes.filter(Boolean).join('\n'),noteSum:false});
  doc.preset={type:'top',items:keys,el:el0,tp:tp?tp.label:'',agg,n:N,regions:reg,other};
  doc.meta.year=tp?(tp.a===tp.b?`(${tp.label})`:''):'';
  return {per,lost,tp,el};
}
/* ② 구성: 행 = 나라·지역, 열 = 품목, 값 = 한 지표(그대로; 누적 막대가 100%로 바꾼다) */
function presetComp(doc,p){
  const want=expandRows(p.rows||[]); const keys=(p.items||[]).filter(k=>IT[k]); const el0=p.el||'p'; const agg=p.agg==='sum'?'sum':'mean';
  const els=keys.map(k=>fixEl(k,el0)); const tp=parseTp(p.tp)&&keys.every((k,j)=>tpOk(els[j],parseTp(p.tp)))?parseTp(p.tp):lastTp(els[0]||'p');
  const U=unitOf(els[0]||el0,p.unit);
  const rows=want.filter(n=>keys.some((k,j)=>fin(valueAt(n,els[j],k,tp,agg))));
  const v=rows.map(n=>keys.map((k,j)=>valueAt(n,els[j],k,tp,agg,U.f)));
  setTable(doc,rows.map(n=>({name:n})),keys.map(k=>({name:itemName(k),key:k})),v);
  const ms=measureOf(els[0]||el0);
  Object.assign(doc.data,{unit:U.u,measure:ms,rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:keys.every(k=>IT[k].live)?'가축':'작물',note:periodNote(tp,agg,ms),noteSum:true});
  doc.preset={type:'comp',rows:want,items:keys,el:el0,tp:tp?tp.label:'',agg,unit:U.j};
  doc.meta.year=tp&&tp.a===tp.b?`(${tp.label})`:'';
  return {rows,tp,missing:want.filter(n=>!rows.includes(n))};
}
/* ③ 지역(대륙)별 비율: 행 = 품목, 열 = 지역, 값 = 세계 대비 % */
function presetReg(doc,p){
  /* 행 = 품목(지표가 여럿이면 품목 × 지표), 열 = 대륙, 값 = 세계에서 그 대륙이 차지하는 비율 */
  const keys=(p.items||[]).filter(k=>IT[k]); const els0=(p.els&&p.els.length?p.els:[p.el||'p']); const agg=p.agg==='sum'?'sum':'mean'; const regs=(p.scheme==='5'?REGIONS5:REGIONS6);
  const per=[]; for(const k of keys) for(const e0 of els0){ const el=fixEl(k,e0); if(!hasEl(k,el)||per.some(q=>q.k===k&&q.el===el)) continue;
    const tp=parseTp(p.tp)&&tpOk(el,parseTp(p.tp))?parseTp(p.tp):lastTp(el); const w=valueAt('세계',el,k,tp,agg);
    per.push({k,el,tp,v:regs.map(r=>{ const x=valueAt(r,el,k,tp,agg); return fin(x)&&fin(w)&&w>0?x/w*100:null; })}); }
  const nE=new Set(per.map(q=>q.el)).size, nK=new Set(per.map(q=>q.k)).size;
  const rowName=q=>nE>1&&nK===1?measureOf(q.el):nE>1?`${itemName(q.k)} ${measureOf(q.el)}`:itemName(q.k);
  setTable(doc,per.map(q=>({name:rowName(q),key:q.k,el:q.el})),regs.map((r,j)=>({name:r,fill:FILLS[j%FILLS.length]})),per.map(q=>q.v),{fills:false});
  const el=per[0]?per[0].el:els0[0]; const ms=nE>1?[...new Set(per.map(q=>measureOf(q.el)))].join('·'):measureOf(el); const tp=per[0]?per[0].tp:null;
  const notes=[periodNote(tp,agg,ms),nE>1&&nK===1?`${itemName(per[0].k)}의 전 세계 ${ms}에서 각 지역(대륙)이 차지하는 비율임.`:`작물별 전 세계 ${ms}에서 각 지역(대륙)이 차지하는 비율임.`];
  if(per.some(q=>['tx','tm','fx','fm'].includes(q.el))) notes.push('수출량 및 수입량에는 지역(대륙) 내 국가 간 수출량 및 수입량도 포함됨.');
  Object.assign(doc.data,{unit:'%',measure:ms,rowNoun:nE>1&&nK===1?'지표':'작물',itemNoun:'지역',note:notes.filter(Boolean).join('\n'),noteSum:false});
  doc.preset={type:'reg',items:keys,el:els0[0],els:els0,tp:tp?tp.label:'',agg,scheme:p.scheme==='5'?'5':'6'};
  doc.meta.year=tp&&tp.a===tp.b?`(${tp.label})`:'';
  return {tp,lost:keys.filter(k=>!per.some(q=>q.k===k)).map(itemName)};
}
/* ④ 비교: 행 = 나라·지역, 열 = (품목 × 지표) */
function presetCmp(doc,p){
  const want=expandRows(p.rows||[]); const keys=(p.items||[]).filter(k=>IT[k]); const els0=(p.els&&p.els.length?p.els:['p']); const agg=p.agg==='sum'?'sum':'mean';
  const pairs=[]; for(const k of keys) for(const e of els0){ const el=fixEl(k,e); if(hasEl(k,el)&&!pairs.some(x=>x[0]===k&&x[1]===el)) pairs.push([k,el]); }
  const tp=parseTp(p.tp)&&pairs.every(([k,el])=>tpOk(el,parseTp(p.tp)))?parseTp(p.tp):(pairs.length?lastTp(pairs[0][1]):null);
  const units=pairs.map(([k,el])=>unitOf(el,p.unit));
  const rows=want.filter(n=>pairs.some(([k,el])=>fin(valueAt(n,el,k,tp,agg))));
  const oneItem=keys.length===1, oneEl=new Set(pairs.map(x=>x[1])).size===1;
  const cols=pairs.map(([k,el],j)=>({name:oneItem&&!oneEl?measureOf(el):oneEl&&!oneItem?itemName(k):`${itemName(k)} ${measureOf(el)}`,key:k,el,unit:units[j].u}));
  const v=rows.map(n=>pairs.map(([k,el],j)=>valueAt(n,el,k,tp,agg,units[j].f)));
  setTable(doc,rows.map(n=>({name:n})),cols,v); doc.data.cols.forEach((c,j)=>c.fill=['white','light','dark','fs','dot','black'][j%6]);
  const uu=[...new Set(units.map(u=>u.u))];
  const elN=oneEl&&pairs.length?measureOf(pairs[0][1]):'';
  const notes=[periodNote(tp,agg,elN||'')]; if(pairs.some(([k,el])=>['tx','tm','fx','fm'].includes(el))&&rows.some(isAgg)) notes.push('수출량 및 수입량에는 지역(대륙) 내 국가 간 수출량 및 수입량도 포함됨.');
  Object.assign(doc.data,{unit:uu.length===1?uu[0]:'',measure:elN,rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:'항목',note:notes.filter(Boolean).join('\n'),noteSum:false});
  doc.preset={type:'cmp',rows:want,items:keys,els:els0,tp:tp?tp.label:'',agg,unit:p.unit};
  doc.meta.year=tp&&tp.a===tp.b?`(${tp.label})`:'';
  return {rows,tp,pairs,missing:want.filter(n=>!rows.includes(n))};
}
/* ⑤ 산점도: 품목마다 (가로 지표, 세로 지표) 한 쌍, 품목이 둘 이상이면 칸을 나눈다 */
function presetSc(doc,p){
  const want=expandRows(p.rows||[]); const keys=(p.items||[]).filter(k=>IT[k]); const ex=p.ex||'p', ey=p.ey||'x'; const agg=p.agg==='sum'?'sum':'mean';
  const cols=[], idx=[]; let tpUsed=null;
  for(const k of keys){ const elx=fixEl(k,ex), ely=fixEl(k,ey); if(!hasEl(k,elx)||!hasEl(k,ely)) continue;
    const tp=parseTp(p.tp)&&tpOk(elx,parseTp(p.tp))&&tpOk(ely,parseTp(p.tp))?parseTp(p.tp):lastTp(ely); tpUsed=tpUsed||tp;
    const U=unitOf(elx,p.unit), V=unitOf(ely,p.unit);
    cols.push({name:`${itemName(k)} ${measureOf(elx)}`,key:k,el:elx,unit:U.u,role:'x',ax:measureOf(elx),grp:itemName(k)}); idx.push([k,elx,tp,U.f]);
    cols.push({name:`${itemName(k)} ${measureOf(ely)}`,key:k,el:ely,unit:V.u,role:'y',ax:measureOf(ely),grp:itemName(k)}); idx.push([k,ely,tp,V.f]); }
  const rows=want.filter(n=>idx.some(([k,el,tp])=>fin(valueAt(n,el,k,tp,agg))));
  const v=rows.map(n=>idx.map(([k,el,tp,f])=>valueAt(n,el,k,tp,agg,f)));
  setTable(doc,rows.map(n=>({name:n})),cols,v,{fills:false});
  const notes=[]; if(tpUsed&&tpUsed.a!==tpUsed.b) notes.push(periodNote(tpUsed,agg,''));
  if(cols.some(c=>['tx','tm','fx','fm'].includes(c.el))&&rows.some(isAgg)) notes.push('수출량에는 지역(대륙) 내 국가 간 수출량도 포함됨.');
  Object.assign(doc.data,{unit:cols[0]?cols[0].unit:'',measure:'',rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:'작물',note:notes.join('\n'),noteSum:false});
  doc.sc.share=keys.length>1; doc.sc.x.auto=true; doc.sc.y.auto=true;
  doc.preset={type:'sc',rows:want,items:keys,ex,ey,tp:tpUsed?tpUsed.label:'',agg,unit:p.unit};
  doc.meta.year=tpUsed&&tpUsed.a===tpUsed.b?`(${tpUsed.label})`:'';
  return {rows,tp:tpUsed,missing:want.filter(n=>!rows.includes(n))};
}
/* ⑥ 순 수출·수입 순위(이름 표): 행 = 나라, 열 = 해, 값 = 순 수출량(수출 − 수입) */
function presetNet(doc,p){
  const k=IT[p.item]?p.item:'cereals'; const el=hasEl(k,'tx')?'net':'fx'; const Y=(p.years&&p.years.length?p.years:[2018,2019,2020,2021,2022]).map(Number).filter(y=>YI[EL[el].src][y]!=null);
  const pool=countryPool(el,k); const N=Math.max(1,Math.min(5,+p.n||2));
  const vals=pool.map(n=>Y.map(y=>{ if(el==='net') return at(n,'net',k,y); const x=raw(n,'fx',k,y), m=raw(n,'fm',k,y); return x==null&&m==null?null:(x||0)-(m||0); }));
  /* 어느 해든 상위·하위 N위에 드는 나라만 남긴다 */
  const keep=new Set(); Y.forEach((y,j)=>{ const a=pool.map((n,i)=>[i,vals[i][j]]).filter(x=>fin(x[1])); a.sort((p2,q)=>q[1]-p2[1]); a.slice(0,N).forEach(x=>keep.add(x[0])); a.slice(-N).forEach(x=>keep.add(x[0])); });
  const idx=[...keep]; setTable(doc,idx.map(i=>({name:pool[i]})),Y.map(y=>({name:String(y)})),idx.map(i=>vals[i].map(x=>fin(x)?x*0.001:null)),{fills:false});
  Object.assign(doc.data,{unit:'백만 t',measure:'순 수출량',rowNoun:'국가',itemNoun:'해',note:'순 수출량 = 수출량 − 수입량',noteSum:false});
  Object.assign(doc.list,{layout:'row',n:N,dir:'both',order:'rank',corner:'연도',highWord:'순 수출량',lowWord:'순 수입량'});
  doc.preset={type:'net',item:k,years:Y,n:N}; doc.meta.year=''; doc.meta.title=`<${itemName(k).replace(/\(합계\)$/,'')}의 순 수출·수입량 상위 ${N}개국>`;
  return {k,Y};
}
/* ⑦ 상위 나라 이름 목록: 행 = 나라, 열 = 품목, 값 = 지표(목록 표가 큰 순으로 이름만 적는다) */
function presetNames(doc,p){
  const keys=(p.items||[]).filter(k=>IT[k]); const el0=p.el||'p'; const agg=p.agg==='sum'?'sum':'mean'; const N=Math.max(1,Math.min(10,+p.n||5));
  const per=keys.map(k=>{ const el=fixEl(k,el0); const tp=parseTp(p.tp)&&tpOk(el,parseTp(p.tp))?parseTp(p.tp):lastTp(el);
    const a=countryPool(el,k).map(n=>[n,valueAt(n,el,k,tp,agg)]).filter(x=>fin(x[1])&&x[1]>0).sort((x,y)=>y[1]-x[1]).slice(0,N); return {k,el,tp,a}; });
  const names=[]; for(const q of per) for(const [n] of q.a) if(!names.includes(n)) names.push(n);
  const U=unitOf(per[0]?per[0].el:el0,null);
  setTable(doc,names.map(n=>({name:n})),per.map(q=>({name:itemName(q.k),key:q.k})),names.map(n=>per.map(q=>{ const t=q.a.find(x=>x[0]===n); return t?t[1]*U.f:null; })));
  const tp=per[0]?per[0].tp:null; const ms=per[0]?measureOf(per[0].el):'';
  Object.assign(doc.data,{unit:U.u,measure:ms,rowNoun:'국가',itemNoun:'작물',note:periodNote(tp,agg,ms),noteSum:false});
  Object.assign(doc.list,{layout:'col',n:N,dir:'high',order:p.order==='rank'?'rank':'gana',head:p.order==='rank'?'':'생산 국가',rankCol:p.order==='rank'});
  doc.preset={type:'names',items:keys,el:el0,tp:tp?tp.label:'',agg,n:N,order:doc.list.order}; doc.meta.year=tp&&tp.a===tp.b?`(${tp.label})`:'';
  return {per,tp};
}

/* ───────── 문장으로 만들기 ───────── */
const ITEM_WORDS=[['cereals',/곡물/],['wheat',/(?<![가-힣])밀(?!림|도|접|수|폐|집|크)/],['rice',/(?<![가-힣])(쌀|벼)/],['maize',/옥수수/],['barley',/보리/],['sorghum',/(?<![가-힣])수수/],['millet',/기장/],['oats',/귀리/],['rye',/호밀/],
  ['potato',/감자/],['cassava',/카사바/],['sweetpotato',/고구마/],['yam',/(?<![가-힣])얌/],['soybean',/대두|(?<![가-힣])콩(?![고가-힣])/],['sugarcane',/사탕수수/],['sugarbeet',/사탕무/],['sugar',/설탕|원당/],
  ['coffee',/커피/],['cocoa',/카카오|코코아/],['tea',/(?<![가-힣])차(?=[\s,·와과의를은는이가도]|$)|찻잎/],['palmoil',/팜유/],['oilpalm',/기름야자/],['rubber',/천연\s*고무|(?<![가-힣])고무/],['cotton',/목화|면화/],['tobacco',/담배/],
  ['groundnut',/땅콩/],['rapeseed',/유채/],['sunflower',/해바라기/],['coconut',/코코넛|야자(?!수)/],['olive',/올리브/],['grape',/포도/],['date',/대추야자/],['banana',/바나나/],['orange',/오렌지/],['apple',/사과/],
  ['beef',/쇠고기|소고기/],['pork',/돼지고기/],['mutton',/양고기/],['goatmeat',/염소고기/],['chickenmeat',/닭고기/],['meat',/육류/],['milk',/우유/],['eggs',/달걀|계란/],
  ['buffalo',/물소/],['cattle',/(?<![가-힣물])소(?=[\s,·와과의를은는이가도]|$)/],['sheep',/(?<![가-힣])양(?=[\s,·와과의를은는이가도]|$)/],['goat',/염소/],['pig',/돼지/],['camel',/낙타/],['horse',/(?<![가-힣])말(?=[\s,·와과의를은는이가도]|$)/],['chicken',/(?<![가-힣])닭(?=[\s,·와과의를은는이가도]|$)/]];
function itemsIn(text){ const hits=[]; let t=text; for(const [k,re] of ITEM_WORDS){ const g=new RegExp(re.source,'g'); let m; while((m=g.exec(t))){ hits.push({k,i:m.index,e:m.index+m[0].length}); } t=t.replace(g,s=>' '.repeat(s.length)); }
  hits.sort((a,b)=>a.i-b.i); const out=[]; for(const h of hits) if(!out.includes(h.k)&&IT[h.k]) out.push(h.k); itemsIn.last=hits; return out; }
function findPlaces(text){ if(!AD) return []; const names=new Set(Object.keys(AD.meta)); const hits=[]; const cands=[]; for(const n of names) cands.push([n,n]); for(const [k,a] of Object.entries(ALIAS)) for(const x of a) cands.push([x,k]);
  cands.sort((a,b)=>b[0].length-a[0].length); const used=new Array(text.length).fill(false);
  for(const [w,k] of cands){ let from=0; for(;;){ const i=text.indexOf(w,from); if(i<0) break; from=i+1; if(used.slice(i,i+w.length).some(Boolean)) continue; const pre=text[i-1]||' ', post=text[i+w.length]||' ';
      if(/[A-Za-z]/.test(w)&&(/[A-Za-z]/.test(pre)||/[A-Za-z]/.test(post))) continue; if(/[가-힣]/.test(pre)&&!/[와과및,·\s(]/.test(pre)) continue; if(/[가-힣]/.test(post)&&!/[의와과는은이가을를로에도만및별]/.test(post)) continue;
      const tail=text.slice(i+w.length,i+w.length+8); const expand=isAgg(k)&&k!=='세계'&&/^\s*(의\s*)?(모든\s*)?(국가|나라)/.test(tail);
      for(let t=i;t<i+w.length;t++) used[t]=true; hits.push({i,k,expand}); } }
  hits.sort((a,b)=>a.i-b.i); const out=[]; for(const h of hits) if(!out.some(o=>o.k===h.k)) out.push(h); return out; }
function tpIn(text){ const m=text.match(/(\d{4})\s*년?\s*[~∼～\-–]\s*(\d{4})/); if(m) return `${m[1]}~${m[2]}`; const y=text.match(/(?<!\d)(19[6-9]\d|20[0-2]\d)(?!\d)\s*년?/); return y?y[1]:null; }
function elsIn(text){ const hits=[]; const W=[['net',/순\s*수출|순\s*수입/],['txv',/수출\s*액/],['tmv',/수입\s*액/],['tx',/수출(?!\s*액)/],['tm',/수입(?!\s*액)/],['a',/재배\s*면적|수확\s*면적|경지/],['s',/사육\s*두수|사육|두수/],['fc',/1인당[^,]*?(?:공급량|소비량)|1인당|식용\s*공급량/],['fd',/소비량|공급량/],['p',/생산/]];
  let t=text; for(const [k,re] of W){ const m=re.exec(t); if(m){ hits.push([k,m.index]); t=t.slice(0,m.index)+' '.repeat(m[0].length)+t.slice(m.index+m[0].length); } } hits.sort((a,b)=>a[1]-b[1]); return hits.map(h=>h[0]); }
function parseRequest(q){
  const text=String(q||'').replace(/\s+/g,' ').trim();
  const spec={kind:null,src:null,items:[],els:[],rows:[],tp:null,agg:'mean',n:null,regions:[],scheme:null,order:null,maskRows:null,maskCols:null,shuffle:false,dir:null,inLbl:null,other:true};
  const notes=[]; if(!text) return {understood:false,spec,notes};
  if(/산점도|가로축|세로축/.test(text)) spec.kind='sc';
  else if(/도넛|원\s*그래프|파이/.test(text)) spec.kind='donut';
  else if(/정사각형|면적\s*비율|트리맵/.test(text)) spec.kind='tree';
  else if(/묶은\s*막대/.test(text)) spec.kind='group';
  else if(/상댓값/.test(text)) spec.kind='small';
  else if(/가나다|목록|이름\s*표|순위\s*표/.test(text)) spec.kind='list';
  else if(/누적|막대/.test(text)) spec.kind='stack';
  else if(/(^|\s)표(로|\s|$)|표를/.test(text)) spec.kind='tb';
  if(/세로\s*막대|세로/.test(text)) spec.dir='v'; if(/가로\s*막대|가로/.test(text)) spec.dir='h';
  if(/섞어|무작위/.test(text)) spec.shuffle=true;
  if(/합산|합계|누적\s*생산/.test(text)&&/~/.test(text)) spec.agg='sum';
  spec.items=itemsIn(text); spec.els=elsIn(text); spec.tp=tpIn(text);
  const tn=text.match(/상위\s*(\d+)\s*(개국|개|위)?|(\d+)\s*위\s*까지/); if(tn) spec.n=+(tn[1]||tn[3]);
  const places=findPlaces(text); const regWords=places.filter(p=>isAgg(p.k)&&p.k!=='세계');
  if(/대륙별|지역별|지역\(대륙\)별/.test(text)){ spec.rows=/아메리카(?!\s*\S*\s*로\s*나누)/.test(text)&&!/앵글로|라틴|북부|중·남부|중남부/.test(text)?['@@5']:['@@6']; spec.scheme=spec.rows[0]==='@@5'?'5':'6'; }
  else spec.rows=places.map(p=>p.expand?'@'+p.k:p.k);
  const live=spec.items.length&&spec.items.every(k=>IT[k]&&IT[k].live);
  if(live&&!spec.els.length) spec.els=['s'];
  if(!spec.els.length) spec.els=['p'];
  const el=spec.els[0];
  /* 자료 갈래 */
  if(/순\s*수출|순\s*수입/.test(text)){ spec.src='net'; spec.kind='list'; if(!spec.items.length) spec.items=['cereals']; }
  else if(spec.kind==='sc'){ spec.src='sc'; }
  else if(spec.kind==='list'){ spec.src='names'; spec.order=/가나다/.test(text)?'gana':'rank'; }
  else if(spec.n||/생산국|수출국|수입국|사육국|점유|상위/.test(text)){ spec.src='top'; spec.regions=regWords.map(p=>p.k); if(!spec.kind) spec.kind='stack'; }
  else if(/비율|구성|구조/.test(text)&&spec.rows.length&&spec.items.length>1){ spec.src='comp'; if(!spec.kind) spec.kind='stack'; }
  else if(/비율|분포/.test(text)&&/대륙별|지역별/.test(text)&&!(spec.els.length>1&&spec.items.length>1)){ spec.src='reg'; if(!spec.kind) spec.kind='stack'; }
  else { spec.src='cmp'; if(!spec.kind) spec.kind=spec.els.length>1||spec.items.length>1?'group':'group'; }
  if(spec.src==='top'&&regWords.length) spec.rows=[];
  /* 가리기 */
  const G='\\([가나다라마바사아자차카타파하]\\)', Lt='(?<![A-Za-z])[A-J](?![A-Za-z])'; const re=new RegExp(`(${G}|${Lt})\\s*[~∼～\\-]\\s*(${G}|${Lt})`,'g'); let mm;
  while((mm=re.exec(text))){ const seq=/[A-Z]/.test(mm[1])?'latin':'gana'; const before=text.slice(Math.max(0,mm.index-14),mm.index);
    const itemW=/(작물|곡물|가축|품목|식량|자원)\S{0,3}\s*$/.test(before)||ITEM_WORDS.some(([,r])=>new RegExp('('+r.source+')\\S{0,2}\\s*$').test(before));
    const placeW=/(국가|나라|지역|대륙)\S{0,3}\s*$/.test(before);
    const target=placeW?'place':itemW?'item':'place';
    if(spec.src==='top'||spec.src==='reg'){ if(target==='item') spec.maskRows=seq; else spec.maskCols=seq; }
    else if(spec.src==='names'){ if(target==='item') spec.maskCols=seq; else spec.maskRows=seq; }
    else if(spec.src==='comp'){ if(target==='item') spec.maskCols=seq; else spec.maskRows=seq; }
    else { if(target==='item') spec.maskCols=seq; else spec.maskRows=seq; } }
  if(/기타\s*(없이|빼)/.test(text)) spec.other=false;
  if(/값\s*표시|비율\s*표시|수치/.test(text)) spec.inLbl='value';
  const understood=!!spec.src&&spec.items.length>0&&(['top','reg','names','net'].includes(spec.src)||spec.rows.length>0);
  if(spec.src==='sc'&&spec.els.length<2){ spec.els=[spec.els[0]==='tx'?'p':spec.els[0],'tx']; }
  return {understood,spec,notes};
}
function specToDoc(spec,cur){
  const d=freshDoc(spec.kind||'stack'); if(cur&&cur.style) d.style=Object.assign({},cur.style); let info={};
  const el=spec.els[0]||'p'; const it=spec.items;
  if(spec.src==='top') info=presetTop(d,{items:it,el:el==='x'?'tx':el,tp:spec.tp,agg:spec.agg,n:spec.n||3,regions:spec.regions,other:spec.other});
  else if(spec.src==='reg') info=presetReg(d,{items:it,el,els:spec.els,tp:spec.tp,agg:spec.agg,scheme:spec.scheme||'6'});
  else if(spec.src==='comp') info=presetComp(d,{rows:spec.rows,items:it,el,tp:spec.tp,agg:spec.agg});
  else if(spec.src==='sc') info=presetSc(d,{rows:spec.rows,items:it,ex:spec.els[0],ey:spec.els[1]||'tx',tp:spec.tp,agg:spec.agg});
  else if(spec.src==='names') info=presetNames(d,{items:it,el,tp:spec.tp,agg:spec.agg,n:spec.n||5,order:spec.order});
  else if(spec.src==='net'){ const tp=parseTp(spec.tp); info=presetNet(d,{item:it[0],years:tp?tpYears(tp):null,n:spec.n||2}); }
  else info=presetCmp(d,{rows:spec.rows,items:it,els:spec.els,tp:spec.tp,agg:spec.agg});
  const D=d.data;
  if(spec.shuffle&&spec.maskCols){ const oth=D.cols.filter(c=>c.other); let rest=D.cols.filter(c=>!c.other); const idx=shuffleArr(rest.map((_,j)=>j)); const old=rest; rest=idx.map(j=>old[j]); const perm=[...idx.map(j=>D.cols.indexOf(old[j])),...oth.map(c=>D.cols.indexOf(c))];
    D.v=D.v.map(r=>perm.map(j=>r[j])); D.cols=[...rest,...oth]; }
  if(spec.shuffle&&spec.maskRows){ const idx=shuffleArr(D.rows.map((_,i)=>i)); D.rows=idx.map(i=>D.rows[i]); D.v=idx.map(i=>D.v[i]); }
  if(spec.maskCols) mask(D.cols,spec.maskCols,c=>!c.other); if(spec.maskRows&&spec.src!=='net') mask(D.rows,spec.maskRows);
  if(d.kind==='stack'){ const o=d.stack; o.dir=spec.dir||'h'; if(spec.inLbl) o.inLbl=spec.inLbl;
    if(spec.src==='top'){ Object.assign(o,{legend:'none',inLbl:spec.inLbl||'name',sortSeg:true,norm:!spec.regions.length,frame:!spec.regions.length,grid:false,leader:true}); Object.assign(o.h,{barW:4.6,gap:4.4}); if(spec.regions.length) D.cols.forEach(c=>c.fill='white'); }
    else if(spec.src==='cmp'){ /* 값 그대로 쌓기(2025학년도 9월 11번 ‘전 세계 수출량’): 행이 한두 개면 세로 막대 */
      o.dir=spec.dir||(D.rows.length<=2?'v':'h'); Object.assign(o,{norm:false,legend:'bottom',grid:true,frame:false,sortSeg:false}); o.axis.auto=true;
      if(o.dir==='v') Object.assign(o.v,{barW:Math.max(o.v.barW,12)}); }
    else if(spec.src==='comp'){ /* 2026학년도 9월 8번: 10% 간격 점선 격자, 짙은·옅은·중간 회색 */
      Object.assign(o,{legend:'bottom',grid:true,frame:true}); o.axis={auto:false,lo:0,hi:100,step:10}; const F=['dark','light','mid','fs','dot','white']; D.cols.forEach((c,j)=>c.fill=F[j%F.length]); }
    else { o.legend='bottom'; o.grid=o.dir==='v'; } }
  if(d.kind==='donut'){ const o=d.donut; o.inLbl=spec.inLbl||'name'; o.leader=true; o.sortSeg=spec.src==='top'; }
  if(d.kind==='tree'){ D.cols.forEach(c=>c.fill=c.other?'white':'light'); }
  if(d.kind==='group'){ const pal=['white','light','dark','fs']; D.cols.forEach((c,j)=>c.fill=pal[j%pal.length]); d.group.legend='bottom'; d.group.axis={auto:true,lo:0,hi:100,step:20}; }
  if(d.kind==='small'){ const pal=['black','mid','fs','dark','light','dot']; D.cols.forEach((c,j)=>c.fill=pal[j%pal.length]); }
  if(d.kind==='list'&&spec.src!=='net'&&spec.src!=='names'){ d.kind='tb'; }
  return {doc:d,info};
}
function buildPrompt(q){
  return `세계지리 농업 그래프 편집기의 요청을 JSON 하나로 바꿔 줘. 다른 말은 쓰지 마.
형식: {"kind":"stack|donut|tree|group|small|tb|sc|list","src":"top|reg|comp|cmp|sc|names|net","items":["wheat"],"els":["p"],"rows":["미국"],"tp":"2023","agg":"mean|sum","n":3,"regions":[],"scheme":"6|5","order":"rank|gana","maskRows":"gana|latin|null","maskCols":"gana|latin|null","shuffle":false,"dir":"h|v","other":true,"missing":[]}
- items 키: ${AD?AD.items.map(x=>x.k+' '+x.ko).join(', '):''}.
- els 키: p 생산량, a 수확 면적, s 사육 두수(가축), tx 수출량, tm 수입량, txv 수출액, net 순 수출량, fd 국내 공급량, fc 1인당 식용 공급량.
- src=top: 품목별 상위 n개국이 세계에서 차지하는 비율(누적 막대·원그래프·면적 비율). regions는 그 안에서만 순위를 매길 지역.
- src=reg: 품목별 지역(대륙) 비율(scheme 6 = 아시아·유럽·아프리카·오세아니아·앵글로아메리카·라틴 아메리카, 5 = 아메리카 통합).
- src=comp: 나라·지역(rows)별 품목 구성(예: 대륙별 소·돼지·양 사육 두수 비율).
- src=cmp: 나라·지역별 값 비교(묶은 막대·표). rows에 ‘@@6’ 또는 ‘@@5’를 넣으면 대륙 6개 또는 5개.
- src=sc: 산점도, els 두 개(가로, 세로), 품목이 둘이면 칸을 나눈다.
- src=names: 상위 n개국 이름 목록(order=gana 가나다순). src=net: 곡물 등의 순 수출·수입 상위 국가 표(tp는 기간).
- tp: ‘2023’ 또는 ‘2018~2022’(양 끝 포함). agg: 기간 평균(mean) 또는 합산(sum). 생산 자료는 1961~2024년(2010년 이후 해마다), 교역 자료는 해마다, 식량 수급표는 2010~2023년.
요청: ${q}`;
}
function cleanSpec(o){ if(!o||typeof o!=='object') return null; const pick=(v,arr,def)=>arr.includes(v)?v:def;
  const s={kind:pick(o.kind,KINDS,'stack'),src:pick(o.src,['top','reg','comp','cmp','sc','names','net'],null),items:(Array.isArray(o.items)?o.items:[]).filter(k=>IT[k]),els:(Array.isArray(o.els)?o.els:[]).filter(e=>EL[e]),
    rows:(Array.isArray(o.rows)?o.rows:[]).map(String).map(n=>n.startsWith('@')?n:(aliasFind(n)||n)),tp:o.tp&&parseTp(String(o.tp))?String(o.tp):null,agg:o.agg==='sum'?'sum':'mean',n:fin(+o.n)?+o.n:null,
    regions:(Array.isArray(o.regions)?o.regions:[]).map(String).map(n=>aliasFind(n)||n).filter(n=>isAgg(n)),scheme:pick(String(o.scheme),['6','5'],null),order:pick(o.order,['rank','gana'],null),
    maskRows:pick(o.maskRows,['gana','latin'],null),maskCols:pick(o.maskCols,['gana','latin'],null),shuffle:!!o.shuffle,dir:pick(o.dir,['h','v'],null),inLbl:null,other:o.other!==false};
  if(!s.src||!s.items.length) return null; if(!s.els.length) s.els=['p']; return s; }
function hintOf(doc){ return EG.hintOf(doc); }

return {KINDS,KIND_KO,EL,EL_KEYS,REGIONS6,REGIONS5,setData,data,meta,isAgg,items,itemName,hasEl,elsOf,entities,aliasFind,yearsOf,parseTp,tpYears,valueAt,tpOk,unitOf,srcOf,measureOf,fixEl,
  freshDoc,normalizeDoc,compose,autoNotes,listCells,presetTop,presetComp,presetReg,presetCmp,presetSc,presetNet,presetNames,parseRequest,specToDoc,buildPrompt,cleanSpec,hintOf,
  lastAxes:()=>Object.assign({},LAST)};
})();
