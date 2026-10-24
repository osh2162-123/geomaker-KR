/* 세계지리 인구 그래프 엔진: 에너지 엔진(EG)의 표·막대·면적 비율 위에 산점도·꺾은선·두 시기 비교·인구 피라미드를 얹는다 */
const PG=(function(){
'use strict';
const {fin,fmt,fmtNum,Ops,fontOf,metrics,W,gray,clamp,GRID_DASH,LINE_DASH,sum,KN,ticksOf,decOf,autoAxis}=GG;
const {finish,block,putBlock,fitLabel,roleOf,fillOpts,josa,particle,lblOf,derive,setTable,autoFills,mask,SEQ,shuffleArr,namesSorted,axisFrom,seqRange,LAST}=EG;

/* ───────── 자료(UN World Population Prospects 2024) ───────── */
let PD=null, YI={};
function setData(d){ PD=d&&d.v?d:null; YI={}; if(PD) PD.years.forEach((y,i)=>YI[y]=i); }
function data(){ return PD; }
const U_PEOPLE=[['천 명',1],['만 명',0.1],['백만 명',0.001]];
const IND={
  pop:{name:'총인구',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001],['억 명',0.00001]],u:1,dec:[0,0,1,2]},
  dens:{name:'인구 밀도',agg:'mean',units:[['명/㎢',1]],dec:[1]},
  sexr:{name:'성비',agg:'mean',units:[['여자 100명당 남자 수',1]],dec:[1]},
  med:{name:'중위 연령',agg:'mean',units:[['세',1]],dec:[1]},
  natc:{name:'인구의 자연적 증감',agg:'sum',units:U_PEOPLE,u:0,dec:[0,0,1]},
  rnc:{name:'인구의 자연 증가율',agg:'mean',units:[['‰',1],['%',0.1]],dec:[1,2]},
  popc:{name:'인구 증감',agg:'sum',units:U_PEOPLE,dec:[0,0,1]},
  gr:{name:'인구 증가율',agg:'mean',units:[['%',1],['‰',10]],dec:[2,1]},
  births:{name:'출생아 수',agg:'sum',units:U_PEOPLE,dec:[0,0,1]},
  cbr:{name:'출생률',agg:'mean',units:[['‰',1]],dec:[1]},
  tfr:{name:'합계 출산율',agg:'mean',units:[['명',1]],dec:[2]},
  deaths:{name:'사망자 수',agg:'sum',units:U_PEOPLE,dec:[0,0,1]},
  cdr:{name:'사망률',agg:'mean',units:[['‰',1]],dec:[1]},
  le:{name:'기대 수명',agg:'mean',units:[['세',1]],dec:[1]},
  lem:{name:'남성 기대 수명',agg:'mean',units:[['세',1]],dec:[1]},
  lef:{name:'여성 기대 수명',agg:'mean',units:[['세',1]],dec:[1]},
  imr:{name:'영아 사망률',agg:'mean',units:[['‰',1],['%',0.1]],dec:[1,2]},
  u5:{name:'5세 미만 아동 사망률',agg:'mean',units:[['‰',1],['%',0.1]],dec:[1,2]},
  nmig:{name:'인구의 순 이동',agg:'sum',units:U_PEOPLE,dec:[0,0,1]},
  nmr:{name:'순 이동률',agg:'mean',units:[['‰',1]],dec:[1]},
  /* 연령 구조(WPP 2024 나이별 인구에서 계산) */
  p014:{name:'유소년층 인구 비율',agg:'mean',units:[['%',1]],dec:[1],age:true},
  p1564:{name:'청장년층 인구 비율',agg:'mean',units:[['%',1]],dec:[1],age:true},
  p65:{name:'노년층 인구 비율',agg:'mean',units:[['%',1]],dec:[1],age:true},
  ydep:{name:'유소년 부양비',agg:'mean',units:[['청장년층 100명당',1]],dec:[1],age:true,bare:true},
  odep:{name:'노년 부양비',agg:'mean',units:[['청장년층 100명당',1]],dec:[1],age:true,bare:true},
  dep:{name:'총부양비',agg:'mean',units:[['청장년층 100명당',1]],dec:[1],age:true,bare:true},
  aging:{name:'노령화 지수',agg:'mean',units:[['유소년층 100명당',1]],dec:[1],age:true,bare:true},
  sr1564:{name:'청장년층 성비',agg:'mean',units:[['여자 100명당 남자 수',1]],dec:[1],age:true},
  pop014:{name:'유소년층 인구',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001]],u:0,dec:[0,0,1],age:true},
  pop1564:{name:'청장년층 인구',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001]],u:0,dec:[0,0,1],age:true},
  pop65:{name:'노년층 인구',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001]],u:0,dec:[0,0,1],age:true},
  /* 도시화(UN 세계 도시화 전망 2025, 국가 정의 기준, 1950~2050년) */
  urb:{name:'도시화율',agg:'mean',units:[['%',1]],dec:[1],src:'wup'},
  rur:{name:'촌락 인구 비율',agg:'mean',units:[['%',1]],dec:[1],src:'wup'},
  upop:{name:'도시 인구',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001],['억 명',0.00001]],u:0,dec:[0,0,1,2],src:'wup'},
  rpop:{name:'촌락 인구',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001],['억 명',0.00001]],u:0,dec:[0,0,1,2],src:'wup'},
  ugr:{name:'연평균 도시 인구 증가율',agg:'mean',units:[['%',1]],dec:[2],src:'wup',per:5},
  rgr:{name:'연평균 촌락 인구 증가율',agg:'mean',units:[['%',1]],dec:[2],src:'wup',per:5},
  /* 2018년판(지난 기출이 쓴 판) */
  urb18:{name:'도시화율(2018년판)',agg:'mean',units:[['%',1]],dec:[1],src:'wup18',base:'urb'},
  rur18:{name:'촌락 인구 비율(2018년판)',agg:'mean',units:[['%',1]],dec:[1],src:'wup18',base:'rur'},
  upop18:{name:'도시 인구(2018년판)',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001],['억 명',0.00001]],u:0,dec:[0,0,1,2],src:'wup18',base:'upop'},
  rpop18:{name:'촌락 인구(2018년판)',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001],['억 명',0.00001]],u:0,dec:[0,0,1,2],src:'wup18',base:'rpop'},
  ugr18:{name:'연평균 도시 인구 증가율(2018년판)',agg:'mean',units:[['%',1]],dec:[2],src:'wup18',base:'ugr',per:5},
  /* 국제 이주자(UN 국제 이주자 통계 2024): 1990~2020년 5년마다와 2024년 */
  mig:{name:'이민자 수',agg:'mean',units:[['천 명',1],['만 명',0.1],['백만 명',0.001]],u:0,dec:[0,0,1],src:'ims'},
  migp:{name:'이민자 비율',agg:'mean',units:[['%',1]],dec:[1],src:'ims'}
};
const SRC_NAME={wpp:'UN, World Population Prospects 2024',wup:'UN, World Urbanization Prospects 2025',wup18:'UN, World Urbanization Prospects 2018',ims:'UN, International Migrant Stock 2024'};
function srcText(keys){ const s=[...new Set((keys||[]).map(k=>IND[k]&&IND[k].src||'wpp'))]; return '출처: '+(s.length?s:['wpp']).map(x=>SRC_NAME[x]).join('; ')+'.'; }
const MIG_YEARS=['1990','1995','2000','2005','2010','2015','2020','2024'];
const IND_KEYS=Object.keys(IND);
const AGE_GROUPS=['유소년층(0~14세)','청장년층(15~64세)','노년층(65세 이상)'];
const GROUPS=[['세계',e=>e==='세계'],['대륙',e=>meta(e).kind==='region'],['소지역',e=>meta(e).kind==='sub'],['개발 수준',e=>meta(e).kind==='dev'],['나라',e=>meta(e).kind==='country']];
const ALIAS={'미국':['미합중국','US','USA'],'오스트레일리아':['호주'],'에스파냐':['스페인'],'튀르키예':['터키'],'타이':['태국'],'타이완':['대만'],'콩고 민주 공화국':['콩고민주공화국','민주 콩고','DR콩고'],
  '남아프리카 공화국':['남아공','남아프리카공화국'],'사우디아라비아':['사우디'],'아랍에미리트':['UAE','아랍 에미리트'],'한국':['대한민국','우리나라','남한'],'북한':['조선'],'영국':['UK'],
  '체코':['체코 공화국'],'미얀마':['버마'],'앵글로아메리카':['앵글로 아메리카','북부 아메리카','북아메리카','북미'],'라틴 아메리카':['라틴아메리카','중·남아메리카','중남미','중·남부 아메리카'],
  '세계':['전 세계','전세계'],'선진국':['선진 지역'],'개발 도상국':['개발도상국','개도국'],'서아시아':['서남아시아'],'아메리카':['아메리카 대륙']};
function meta(n){ return PD&&PD.meta[n]||{}; }
function entities(){ return PD?Object.keys(PD.v):[]; }
function isAgg(n){ const k=meta(n).kind; return !!k&&k!=='country'; }
function aliasFind(name){ const t=String(name||'').trim(); if(!t||!PD) return null; if(PD.v[t]) return t; for(const [k,a] of Object.entries(ALIAS)) if(a.includes(t)) return k; return null; }
function series(n,k){ const e=PD&&PD.v[n]; const i=PD?PD.ind.indexOf(k):-1; return e&&i>=0?e[i]:null; }
function years(){ return PD?PD.years.slice():[]; }

/* ───────── 시점: ‘2023’, ‘2015~2020’(5년 단위는 끝 해 제외), ‘1971~1980’(끝 해 포함) ───────── */
function parseTp(s){ const t=String(s||'').trim().replace(/년$/,''); let m=t.match(/^(\d{4})\s*[~∼～\-–]\s*(\d{4})$/);
  if(m){ const a=+m[1], b=+m[2]; if(b<a) return null; const excl=(b-a)%5===0&&b>a; return {a,b,excl,label:`${a}~${b}`}; }
  m=t.match(/^(\d{4})$/); if(m) return {a:+m[1],b:+m[1],excl:false,label:m[1]}; return null; }
function tpYears(tp){ if(tp.a===tp.b) return [tp.a]; const out=[]; for(let y=tp.a;y<(tp.excl?tp.b:tp.b+1);y++) out.push(y); return out; }
/* 추계 변형: med(중위)는 본 자료, 나머지는 10년마다 다섯 지표만 */
function variants(){ const out=[['med','중위 추계']]; if(PD&&PD.var) for(const [k,ko] of PD.var.list) out.push([k,ko]); return out; }
function variantName(v){ const x=variants().find(a=>a[0]===v); return x?x[1]:v; }
function varIndOk(k){ return !!(PD&&PD.var&&PD.var.ind.includes(k)); }
function varValue(n,k,y,v){ if(!PD||!PD.var) return null; const t=PD.var.v[v]; const e=t&&t[n]; const i=PD.var.years.indexOf(y), j=PD.var.ind.indexOf(k); if(!e||i<0||j<0) return null; const x=e[j][i]; return fin(x)?x:null; }
function valueAt(n,k,tp,uf,variant){
  if(variant&&variant!=='med'&&tp&&tp.b>PD.estLast){ /* 추계 변형은 한 해 값만 */ if(tp.a!==tp.b) return null; const x=varValue(n,k,tp.a,variant); return x==null?null:x*(uf==null?1:uf); }
  const s=series(n,k); if(!s||!tp) return null; const ys=tpYears(tp); const vals=[];
  for(const y of ys){ const i=YI[y]; if(i==null) return null; const v=s[i]; if(!fin(v)) return null; vals.push(v); }
  if(!vals.length) return null; const agg=IND[k].agg==='sum'&&ys.length>1?sum(vals):sum(vals)/vals.length; return agg*(uf==null?1:uf); }
function unitOf(k,ui){ const I=IND[k]; const j=ui==null?(I.u||0):ui; return {u:I.bare?'':I.units[j]?I.units[j][0]:I.units[0][0],f:I.units[j]?I.units[j][1]:1,dec:(I.dec||[1])[j]!=null?I.dec[j]:1}; }
function projNote(tps,variant,keys){ if(keys&&keys.length&&keys.every(k=>IND[k]&&IND[k].src==='ims')) return ''; return PD&&tps.some(tp=>tp.b>PD.estLast)?`${PD.estLast+1}년 이후 값은 ${variant&&variant!=='med'?variantName(variant).replace(/\s*추계$/,'')+' 추계':'중위 추계'}값임.`:''; }

/* ───────── 문서 ───────── */
const KINDS=['sc','line','dumb','group','tb','tree','stack','pyr'];
const KIND_KO={sc:'산점도',line:'꺾은선',dumb:'두 시기 비교',group:'묶은 막대',tb:'표',tree:'면적 비율',stack:'누적 막대',pyr:'인구 피라미드'};
const MKS=['fc','oc','ot','ft','os','fs','od','fd'];
function freshDoc(kind){
  const d=EG.freshDoc('stack'); d.app='population'; d.v=1; d.kind=KINDS.includes(kind)?kind:'sc';
  Object.assign(d.data,{unit:'',measure:'',rowNoun:'국가',itemNoun:'지표'});
  d.sc={w:54,h:44,conn:true,arrow:false,diag:false,zero:true,grid:true,lbl:true,leader:true,legend:'in',mks:1.3,xTitle:'',yTitle:'',x:{auto:true,lo:0,hi:30,step:10},y:{auto:true,lo:0,hi:30,step:10}};
  d.ln={w:40,h:42,gap:9,dash:true,mks:1.15,grid:true,zero:true,end:'end',xUnit:'년',shareY:false,y:{auto:true,lo:0,hi:100,step:20}};
  d.dumb={w:46,h:40,grid:true,zero:true,legend:'in',mks:1.35,y:{auto:true,lo:0,hi:40,step:10}};
  d.pyr={w:34,h:40,gap:7,auto:true,max:12,step:4,ageStep:20,male:'mid',female:'light',pct:true,cols:0};
  Object.assign(d.tree,{layout:'rect',inLbl:'both',top:'lbl',size:34,dec:1,sort:false});
  Object.assign(d.group,{dir:'v',legend:'bottom',barW:2.2,gap:3.2,len:30,barLbl:false});
  Object.assign(d.tb,{dec:1,comma:true,unitLine:true,rowHead:'국가'});
  return d;
}
function normalizeDoc(d){
  d=GG.clean(d);   /* 밖에서 들어온 값 정리(보안): gengine.js clean() */
  const f=freshDoc(d&&d.kind); if(!d||typeof d!=='object') return f;
  const out=EG.normalizeDoc(Object.assign({},d,{kind:'stack'}));
  out.app='population'; out.kind=KINDS.includes(d.kind)?d.kind:'sc';
  for(const k of ['sc','ln','dumb','pyr']) out[k]=Object.assign({},f[k],d[k]||{});
  out.sc.x=Object.assign({},f.sc.x,(d.sc||{}).x||{}); out.sc.y=Object.assign({},f.sc.y,(d.sc||{}).y||{}); out.ln.y=Object.assign({},f.ln.y,(d.ln||{}).y||{}); out.dumb.y=Object.assign({},f.dumb.y,(d.dumb||{}).y||{});
  /* EG.normalizeDoc가 열 속성(unit·dec·role·t·grp·mk)을 지우지 않는지 */
  return out;
}

/* ───────── 그리기 도움 ───────── */
function textAt(ops,doc,s,cx,cy,role,o){ o=o||{}; const m=metrics(fontOf(doc,role,o.scale),String(s)); const rot=o.rot||0; const off=(m.A-m.D)/2;
  return ops.text(s,cx-Math.sin(rot)*off,cy+Math.cos(rot)*off,role,Object.assign({align:'center'},o)); }
function mark(ops,doc,x,y,mk,size){ ops.mark(x,y,mk,size,{sw:W(doc,0.15),g:gray(doc.style.mid-40)}); }
function arrowHead(ops,doc,x0,y0,x1,y1){ const L=Math.hypot(x1-x0,y1-y0); if(L<0.3) return; const ux=(x1-x0)/L, uy=(y1-y0)/L, hl=1.0, hw=0.38; ops.poly([[x1,y1],[x1-ux*hl-uy*hw,y1-uy*hl+ux*hw],[x1-ux*hl+uy*hw,y1-uy*hl-ux*hw]],'#000000'); }
/* 시점 범례: ○ 앞 시기 — ● 뒤 시기 (세로로, 두 표시를 선으로 잇는다) */
function tpLegend(doc,items,join,horiz){
  const ops=new Ops(doc); const f=fontOf(doc,'legend'); const lh=Math.max(metrics(f,'가').H,1.6)+1.6;
  if(horiz){ let x=0; items.forEach(it=>{ mark(ops,doc,x,0,it.mk,1.25); const m=metrics(f,it.text); ops.text(it.text,x+1.6,(m.A-m.D)/2,'legend'); x+=1.6+m.W+3.2; });
    const b=ops.bounds(); ops.rect(b.x-1.2,b.y-0.9,b.w+2.4,b.h+1.8,{stroke:'#000000',sw:W(doc,0.12)}); return ops; }
  items.forEach((it,i)=>{ const y=i*lh; mark(ops,doc,0,y,it.mk,1.25); const m=metrics(f,it.text); ops.text(it.text,1.6,y+(m.A-m.D)/2,'legend'); });
  if(join&&items.length>1) ops.seg(0,0.65,0,(items.length-1)*lh-0.65,W(doc,0.2));
  const b=ops.bounds(); ops.rect(b.x-1.2,b.y-0.9,b.w+2.4,b.h+1.8,{stroke:'#000000',sw:W(doc,0.12)}); return ops;
}
/* 축 범위·눈금 공통: 테두리, 점선 격자, 0 선, 눈금 숫자 */
function frameXY(ops,doc,w,h,ax,ay,o){
  const lw=W(doc,0.15); const X=v=>(v-ax.lo)/(ax.hi-ax.lo)*w, Y=v=>h-(v-ay.lo)/(ay.hi-ay.lo)*h;
  if(o.grid){ for(const t of ticksOf(ax)) if(t>ax.lo+1e-9&&t<ax.hi-1e-9) ops.seg(X(t),0,X(t),h,W(doc,0.1),{dash:GRID_DASH}); for(const t of ticksOf(ay)) if(t>ay.lo+1e-9&&t<ay.hi-1e-9) ops.seg(0,Y(t),w,Y(t),W(doc,0.1),{dash:GRID_DASH}); }
  if(o.zero){ if(ax.lo<0&&ax.hi>0) ops.seg(X(0),0,X(0),h,W(doc,0.12)); if(ay.lo<0&&ay.hi>0) ops.seg(0,Y(0),w,Y(0),W(doc,0.12)); }
  ops.rect(0,0,w,h,{stroke:'#000000',sw:lw});
  const dx=decOf(ax.step), dy=decOf(ay.step); const tm=metrics(fontOf(doc,'tick'),'0'); let lastX=null, topY=null;
  for(const t of ticksOf(ax)) lastX=ops.text(fmt(t,dx),X(t),h+0.9+tm.A,'tick',{align:'center'});
  for(const t of ticksOf(ay)){ const it=ops.textMid(fmt(t,dy),-0.9,Y(t),'tick',{align:'right'}); if(t===ticksOf(ay).slice(-1)[0]) topY=it; }
  if(o.xUnit&&lastX) ops.text(`(${o.xUnit})`,lastX.box.x+lastX.box.w+0.3,h+0.9+tm.A,'unit');
  if(o.yUnit&&topY) ops.text(`(${o.yUnit})`,topY.box.x+topY.box.w/2,topY.box.y-1.0,'unit',{align:'center'});
  return {X,Y};
}

/* ───────── ① 산점도(한 시기 또는 두 시기를 이은 점) ───────── */
function pairsOf(C){
  if(C.length&&C.every(c=>c.role==='x'||c.role==='y')){ const ts=[]; for(const c of C) if(!ts.includes(c.t||'')) ts.push(c.t||'');
    return ts.map(t=>({t,x:C.findIndex(c=>c.role==='x'&&(c.t||'')===t),y:C.findIndex(c=>c.role==='y'&&(c.t||'')===t)})).filter(p=>p.x>=0&&p.y>=0); }
  const out=[]; for(let j=0;j+1<C.length;j+=2) out.push({t:C[j].t||'',x:j,y:j+1}); return out; }
/* 선분이 상자(여유 pad)를 지나는가: 정확히 계산(Liang–Barsky) */
function segBox(a,b,box,pad){ pad=pad||0; const x0=box.x-pad, y0=box.y-pad, x1=box.x+box.w+pad, y1=box.y+box.h+pad; let t0=0, t1=1; const dx=b.x-a.x, dy=b.y-a.y;
  for(const [pp,qq] of [[-dx,a.x-x0],[dx,x1-a.x],[-dy,a.y-y0],[dy,y1-a.y]]){ if(Math.abs(pp)<1e-12){ if(qq<0) return false; continue; } const r=qq/pp; if(pp<0){ if(r>t1) return false; if(r>t0) t0=r; } else { if(r<t0) return false; if(r<t1) t1=r; } }
  return t0<=t1; }
function composeSc(doc){
  const o=doc.sc; const {R,C,M}=derive(doc); const P=pairsOf(C); if(!R.length||!P.length) return null;
  const xs=[], ys=[]; R.forEach((_,i)=>P.forEach(p=>{ if(fin(M[i][p.x])) xs.push(M[i][p.x]); if(fin(M[i][p.y])) ys.push(M[i][p.y]); }));
  if(!xs.length||!ys.length) return null;
  const ax=axisFrom(o.x,xs,{zero:o.zero,target:5}), ay=axisFrom(o.y,ys,{zero:o.zero,target:5}); LAST.scx=ax; LAST.scy=ay;
  const ops=new Ops(doc); const w=o.w, h=o.h; const cx=C[P[0].x], cy=C[P[0].y];
  const xUnit=cx.unit||'', yUnit=cy.unit||''; const {X,Y}=frameXY(ops,doc,w,h,ax,ay,{grid:o.grid,zero:o.zero,xUnit,yUnit});
  if(o.diag){ const lo=Math.max(ax.lo,ay.lo), hi=Math.min(ax.hi,ay.hi); if(hi>lo) ops.seg(X(lo),Y(lo),X(hi),Y(hi),W(doc,0.15)); }
  const nT=P.length; const mkOf=k=>nT===1?'fc':k===0?'oc':k===nT-1?'fc':'oc';
  const pts=[]; const segs=[];
  R.forEach((r,i)=>{ const q=P.map((p,k)=>fin(M[i][p.x])&&fin(M[i][p.y])?{x:X(clamp(M[i][p.x],ax.lo,ax.hi)),y:Y(clamp(M[i][p.y],ay.lo,ay.hi)),mk:mkOf(k)}:null).filter(Boolean);
    if(o.conn&&q.length>1){ ops.line(q.map(p=>[p.x,p.y]),W(doc,0.2)); if(o.arrow){ const a=q[q.length-2], b=q[q.length-1]; arrowHead(ops,doc,a.x,a.y,b.x-(b.x-a.x)*0.06,b.y-(b.y-a.y)*0.06); } for(let k=0;k+1<q.length;k++) segs.push([q[k],q[k+1]]); }
    q.forEach(p=>mark(ops,doc,p.x,p.y,p.mk,o.mks)); pts.push({r,q}); });
  /* 점 이름: 선 가운데(두 시기) 또는 점 옆, 다른 점·선·이름을 피해서. 가까운 자리가 모두 겹치면 조금 떨어뜨리고 지시선으로 잇는다 */
  if(o.lbl){ const placed=pts.flatMap(p=>p.q.map(a=>({x:a.x-o.mks/2-0.25,y:a.y-o.mks/2-0.25,w:o.mks+0.5,h:o.mks+0.5})));
    const segHit=box=>segs.some(([a,b])=>segBox(a,b,box,0.2));
    const allPts=pts.flatMap(p=>p.q.map(a=>({x:a.x,y:a.y,p})));
    const dBox=(box,x,y)=>Math.hypot(Math.max(box.x-x,0,x-box.x-box.w),Math.max(box.y-y,0,y-box.y-box.h));
    /* 겹침 + 선 + 틀 밖 + ‘다른 점에 더 가까움’(어느 점 이름인지 헷갈림) */
    const score=(box,own)=>{ let v=placed.reduce((a,q)=>a+GG.overlap(q,box,0.2),0)+(segHit(box)?3:0)+(box.x<0||box.y<0||box.x+box.w>w||box.y+box.h>h?4:0);
      if(own){ const dOwn=Math.min(...own.q.map(a=>dBox(box,a.x,a.y))); if(allPts.some(a=>a.p!==own&&dBox(box,a.x,a.y)+0.15<dOwn)) v+=1.2; } return v; };
    /* 지시선 끝: 글자 상자 둘레에서 지점 쪽 */
    const edge=(box,px,py)=>{ const cx=box.x+box.w/2, cy=box.y+box.h/2, dx=px-cx, dy=py-cy; const sx=dx?(box.w/2+0.25)/Math.abs(dx):1e9, sy=dy?(box.h/2+0.2)/Math.abs(dy):1e9; const k=Math.min(sx,sy,1); return [cx+dx*k,cy+dy*k]; };
    const DIR8=[[0,-1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[1,1],[-1,1]];
    const DIR16=Array.from({length:16},(_,i)=>{ const a=-Math.PI/2+i*Math.PI/8; return [Math.cos(a),Math.sin(a)]; });
    const labs=[];
    for(const p of pts){ if(!p.q.length) continue; const s=lblOf(p.r); const role=roleOf(s)==='label'?'label':'cat'; const m=metrics(fontOf(doc,role),s);
      const anchors=p.q.length>1?[{x:(p.q[0].x+p.q[1].x)/2,y:(p.q[0].y+p.q[1].y)/2,r:0.9},...p.q.map(a=>({x:a.x,y:a.y,r:o.mks/2+0.5}))]:[{x:p.q[0].x,y:p.q[0].y,r:o.mks/2+0.5}];
      let best=null;
      for(const an of anchors) for(const [dx,dy] of DIR8){ const len=Math.hypot(dx,dy); const ux=dx/len, uy=dy/len;
        const ext=Math.abs(ux)*m.W/2+Math.abs(uy)*m.H/2; const cxp=an.x+ux*(an.r+ext), cyp=an.y+uy*(an.r+ext); const box={x:cxp-m.W/2,y:cyp-m.H/2,w:m.W,h:m.H};
        const bad=score(box,p); if(best==null||bad<best.bad-1e-9) best={bad,cxp,cyp,box}; if(bad<=0) break; }
      /* 지시선으로 빼기: 가까운 자리가 겹칠 때만, 점(두 시기면 선 가운데)에서 2.5~6 mm 떨어진 자리 */
      let lead=null;
      if(best.bad>0&&o.leader!==false){ const an=anchors[0]; let far=null;
        for(const d of [2.6,3.6,4.8,6.2,8,10,12.5,15]) { for(const [ux,uy] of DIR16){ const ext=Math.abs(ux)*m.W/2+Math.abs(uy)*m.H/2; const cxp=an.x+ux*(an.r+d+ext), cyp=an.y+uy*(an.r+d+ext); const box={x:cxp-m.W/2,y:cyp-m.H/2,w:m.W,h:m.H};
            const [ex,ey]=edge(box,an.x,an.y); const A={x:an.x,y:an.y}, B={x:ex,y:ey};
            /* 지시선이 다른 점·이름·선을 지나면 감점 */
            const cross=placed.filter(q=>!(Math.abs(q.x+q.w/2-an.x)<o.mks&&Math.abs(q.y+q.h/2-an.y)<o.mks)&&segBox(A,B,q,0.1)).length*1.0
              +segs.filter(([a,b])=>{ const den=(b.x-a.x)*(B.y-A.y)-(b.y-a.y)*(B.x-A.x); if(Math.abs(den)<1e-9) return false; const t=((A.x-a.x)*(B.y-A.y)-(A.y-a.y)*(B.x-A.x))/den, u=((A.x-a.x)*(b.y-a.y)-(A.y-a.y)*(b.x-a.x))/den; return t>0.02&&t<0.98&&u>0.05&&u<0.98; }).length*0.6;
            const bad=score(box)+cross+d*0.03; if(far==null||bad<far.bad) far={bad,cxp,cyp,box,ex,ey}; }
          if(far&&far.bad<0.25) break; }
        if(far&&far.bad+0.3<best.bad){ best=far; lead=[an.x,an.y,far.ex,far.ey]; } }
      if(lead) segs.push([{x:lead[0],y:lead[1]},{x:lead[2],y:lead[3]}]);
      labs.push({s,role,cx:best.cxp,cy:best.cyp,box:best.box,lead,st:p.q.length>1?0:o.mks/2+0.15}); placed.push(best.box); }
    /* 지시선끼리 엇갈리면 두 이름 자리를 맞바꾼다 */
    const X2=(a,b)=>{ const [p1x,p1y,p2x,p2y]=a, [q1x,q1y,q2x,q2y]=b; const d=(p2x-p1x)*(q2y-q1y)-(p2y-p1y)*(q2x-q1x); if(Math.abs(d)<1e-9) return false;
      const t=((q1x-p1x)*(q2y-q1y)-(q1y-p1y)*(q2x-q1x))/d, u=((q1x-p1x)*(p2y-p1y)-(q1y-p1y)*(p2x-p1x))/d; return t>0.01&&t<0.99&&u>0.01&&u<0.99; };
    const relead=(L,cx,cy)=>{ const box={x:cx-L.box.w/2,y:cy-L.box.h/2,w:L.box.w,h:L.box.h}; const [ex,ey]=edge(box,L.lead[0],L.lead[1]); return {box,lead:[L.lead[0],L.lead[1],ex,ey]}; };
    for(let pass=0;pass<4;pass++){ let sw=false;
      for(let i=0;i<labs.length;i++) for(let j=i+1;j<labs.length;j++){ const A=labs[i], B=labs[j]; if(!A.lead||!B.lead||!X2(A.lead,B.lead)) continue;
        const nA=relead(A,B.cx,B.cy), nB=relead(B,A.cx,A.cy); if(X2(nA.lead,nB.lead)) continue;
        [A.cx,B.cx]=[B.cx,A.cx]; [A.cy,B.cy]=[B.cy,A.cy]; A.box=nA.box; A.lead=nA.lead; B.box=nB.box; B.lead=nB.lead; sw=true; }
      if(!sw) break; }
    for(const L of labs){ if(L.lead){ const [ax0,ay0,bx,by]=L.lead; const len=Math.hypot(bx-ax0,by-ay0)||1; const st=Math.min(L.st,len*0.4); const ux=(bx-ax0)/len, uy=(by-ay0)/len;
        ops.seg(ax0+ux*st,ay0+uy*st,bx,by,W(doc,0.12)); }
      textAt(ops,doc,L.s,L.cx,L.cy,L.role,{halo:'w'}); } }
  /* 축 이름 */
  const xT=o.xTitle||cx.ax||'', yT=o.yTitle||cy.ax||'';
  const tm=metrics(fontOf(doc,'tick'),'0');
  if(xT) ops.text(xT,w/2,h+0.9+tm.H+1.4+metrics(fontOf(doc,'axis'),'가').A,'axis',{align:'center'});
  if(yT){ const L=ops.list.filter(t=>t.t==='text'&&t.box.x<0&&t.box.y>-0.5); const lx=L.length?Math.min(...L.map(t=>t.box.x)):-4; ops.vtext(yT,lx-2.0,h/2,'axis'); }
  /* 시점 범례 */
  let legend=null;
  if(nT>1&&o.legend!=='none'){ const lg=tpLegend(doc,P.map((p,k)=>({text:p.t||`시기 ${k+1}`,mk:mkOf(k)})),o.conn); const lb=lg.bounds();
    const obs=pts.flatMap(p=>p.q.map(a=>({x:a.x-1,y:a.y-1,w:2,h:2}))).concat(ops.list.filter(t=>t.t==='text'&&t.box.x>=0&&t.box.y>=0&&t.box.x<w&&t.box.y<h).map(t=>t.box));
    const spots=[[w-1.6-lb.w,1.6],[1.6,1.6],[w-1.6-lb.w,h-1.6-lb.h],[1.6,h-1.6-lb.h]]; let at=null;
    if(o.legend==='in') for(const [x,y] of spots){ const box={x,y,w:lb.w,h:lb.h}; if(!obs.some(q=>GG.overlap(q,box,0.3)>0)&&!segs.some(([a,b])=>segBox(a,b,box,0.2))){ at=[x,y]; break; } }
    if(!at&&o.legend==='below'){ const b=ops.bounds(); const lg2=tpLegend(doc,P.map((p,k)=>({text:p.t||`시기 ${k+1}`,mk:mkOf(k)})),false,true); const l2=lg2.bounds(); ops.absorb(lg2,w/2-l2.w/2-l2.x,b.y+b.h+2.2-l2.y); at='done'; }
    if(!at){ const b=ops.bounds(); at=[b.x+b.w+3,h/2-lb.h/2]; }
    if(at!=='done') ops.absorb(lg,at[0]-lb.x,at[1]-lb.y); legend=true; }
  void legend;
  return {ops,plot:{x:0,y:0,w,h},legend:'none',items:[],notes:scNotes(doc,C,P)};
}
function scNotes(doc,C,P){ const out=[]; const keys=new Set(C.map(c=>c.key)); if(keys.has('nmr')) out.push('순 이동률 = (유입 인구 − 유출 인구) ÷ 전체 인구 × 1,000'); return out; }

/* ───────── ② 꺾은선(시점별, 지표마다 한 칸) ───────── */
function panelsOf(C){ const out=[]; C.forEach((c,j)=>{ const g=c.grp||''; let p=out[out.length-1]; if(!p||p.g!==g){ p={g,cols:[]}; out.push(p); } p.cols.push(j); }); return out; }
function xLabel(ops,doc,s,x,y){ const m=String(s).match(/^(\d{4})\s*~\s*(\d{4})$/); const tm=metrics(fontOf(doc,'tick'),'0');
  if(!m){ return ops.text(s,x,y+tm.A,'tick',{align:'center'}); }
  ops.text(m[1],x,y+tm.A,'tick',{align:'center'}); const t2=textAt(ops,doc,'~',x,y+tm.H+0.25+0.7,'tick',{rot:Math.PI/2,scale:0.9}); void t2;
  return ops.text(m[2],x,y+tm.H*2+1.1+tm.A,'tick',{align:'center'}); }
function composeLine(doc){
  const o=doc.ln; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null;
  const panels=panelsOf(C); const out=new Ops(doc); let x0=0; const plots=[];
  const allVals=M.flat().filter(fin);
  const cw=Math.max(...C.map(c=>{ const t=String(lblOf(c)); const m=t.match(/^(\d{4})\s*~\s*(\d{4})$/); return metrics(fontOf(doc,'tick'),m?m[1]:t).W; }))+1.4; /* 가로축 글자가 서로 닿지 않는 칸 너비 */
  panels.forEach((pn,pi)=>{ const ops=new Ops(doc); const n=pn.cols.length; const w=Math.max(o.w,n*Math.max(6.2,cw)), h=o.h;
    const vals=o.shareY?allVals:R.flatMap((_,i)=>pn.cols.map(j=>M[i][j])).filter(fin); if(!vals.length) return;
    const ay=pi===0||!o.shareY?axisFrom(o.y.auto===false?o.y:{auto:true},vals,{zero:o.zero,target:5}):LAST['ln0']; LAST['ln'+pi]=ay; if(pi===0) LAST.ln=ay;
    const X=k=>(k+0.5)*w/n, Y=v=>h-(clamp(v,ay.lo,ay.hi)-ay.lo)/(ay.hi-ay.lo)*h; const lw=W(doc,0.15);
    if(o.grid) for(const t of ticksOf(ay)) if(t>ay.lo+1e-9&&t<ay.hi-1e-9) ops.seg(0,Y(t),w,Y(t),W(doc,0.1),{dash:GRID_DASH});
    if(o.zero&&ay.lo<0&&ay.hi>0) ops.seg(0,Y(0),w,Y(0),W(doc,0.12));
    ops.rect(0,0,w,h,{stroke:'#000000',sw:lw});
    const dy=decOf(ay.step); let top=null; for(const t of ticksOf(ay)){ const it=ops.textMid(fmt(t,dy),-0.9,Y(t),'tick',{align:'right'}); if(t===ticksOf(ay).slice(-1)[0]) top=it; }
    const unit=C[pn.cols[0]].unit||doc.data.unit||''; if(unit&&top) ops.text(`(${unit})`,top.box.x+top.box.w/2,top.box.y-1.0,'unit',{align:'center'});
    let last=null; pn.cols.forEach((j,k)=>{ ops.seg(X(k),h,X(k),h-0.8,lw); last=xLabel(ops,doc,lblOf(C[j]),X(k),h+0.9); });
    if(o.xUnit&&last) ops.text(`(${o.xUnit})`,last.box.x+last.box.w+0.3,last.y,'unit');
    const ends=[];
    R.forEach((r,i)=>{ const mk=r.mk||MKS[i%MKS.length]; const pts=pn.cols.map((j,k)=>fin(M[i][j])?[X(k),Y(M[i][j])]:null);
      let run=[]; const flush=()=>{ if(run.length>1) ops.line(run,W(doc,0.2),{dash:o.dash?LINE_DASH:null,join:'round'}); run=[]; };
      pts.forEach(p=>{ if(p) run.push(p); else flush(); }); flush();
      pts.forEach(p=>{ if(p) mark(ops,doc,p[0],p[1],mk,o.mks); });
      const lp=[...pts].reverse().find(Boolean); if(lp) ends.push({r,y:lp[1],mk}); });
    if(o.end==='end'&&ends.length){ const f=fontOf(doc,'label'); const gh=metrics(f,'(가)').H+0.25; ends.sort((a,b)=>a.y-b.y);
      for(let k=1;k<ends.length;k++) if(ends[k].y-ends[k-1].y<gh) ends[k].y=ends[k-1].y+gh;
      /* 맨 아래 이름이 가로축 글자(‘(년)’)에 닿지 않게 위로 올린다 */
      const over=ends.length?ends[ends.length-1].y-(h-gh*0.45):0; if(over>0){ ends[ends.length-1].y-=over; for(let k=ends.length-2;k>=0;k--) if(ends[k+1].y-ends[k].y<gh) ends[k].y=ends[k+1].y-gh; }
      for(const e of ends){ const s=lblOf(e.r); const role=roleOf(s)==='label'?'label':'cat'; ops.textMid(s,w+0.9,e.y,role); } }
    if(pn.g){ const b=ops.bounds(); ops.text(pn.g,w/2,b.y-1.6,'title',{align:'center'}); }
    const b=ops.bounds(); const dx=x0-b.x; out.absorb(ops,dx,0); plots.push({x:dx,y:0,w,h}); x0=x0+b.w+o.gap; });
  if(!plots.length) return null;
  let legend='none', items=[];
  if(o.end==='legend') { legend='bottom'; items=R.map((r,i)=>({text:lblOf(r),line:{w:W(doc,0.2),dash:o.dash?LINE_DASH:null,mk:r.mk||MKS[i%MKS.length]}})); }
  const B=out.bounds(); const r={ops:out,plot:{x:B.x,y:0,w:B.w,h:o.h},legend:'none',items:[],notes:lineNotes(doc)};
  if(legend==='bottom'){ const lg=GG.legendOps(doc,items,'row'); const lb=lg.bounds(); out.absorb(lg,B.x+B.w/2-(lb.x+lb.w/2),B.y+B.h+2.4-lb.y); }
  return r;
}
function lineNotes(){ return []; }

/* ───────── ③ 두 시기 비교(아령) ───────── */
function composeDumb(doc){
  const o=doc.dumb; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null;
  const vals=M.flat().filter(fin); if(!vals.length) return null;
  const ay=axisFrom(o.y,vals,{zero:o.zero,target:5}); LAST.dumb=ay;
  const ops=new Ops(doc); const n=R.length; const w=Math.max(o.w,n*8), h=o.h; const X=i=>(i+0.5)*w/n, Y=v=>h-(clamp(v,ay.lo,ay.hi)-ay.lo)/(ay.hi-ay.lo)*h; const lw=W(doc,0.15);
  if(o.grid) for(const t of ticksOf(ay)) if(t>ay.lo+1e-9&&t<ay.hi-1e-9) ops.seg(0,Y(t),w,Y(t),W(doc,0.1),{dash:GRID_DASH});
  if(o.zero&&ay.lo<0&&ay.hi>0) ops.seg(0,Y(0),w,Y(0),W(doc,0.12));
  ops.rect(0,0,w,h,{stroke:'#000000',sw:lw});
  const dy=decOf(ay.step); let top=null; for(const t of ticksOf(ay)){ const it=ops.textMid(fmt(t,dy),-0.9,Y(t),'tick',{align:'right'}); if(t===ticksOf(ay).slice(-1)[0]) top=it; }
  const unit=C[0].unit||doc.data.unit||''; if(unit&&top) ops.text(`(${unit})`,top.box.x+top.box.w/2,top.box.y-1.0,'unit',{align:'center'});
  const mkOf=k=>C[k].mk||(C.length===1?'fc':k===0?'oc':k===C.length-1?'fc':'ot');
  const tm=metrics(fontOf(doc,'cat'),'가');
  R.forEach((r,i)=>{ const p=C.map((_,k)=>fin(M[i][k])?Y(M[i][k]):null); const ok=p.filter(fin); if(ok.length>1) ops.seg(X(i),Math.min(...ok),X(i),Math.max(...ok),W(doc,0.25));
    p.forEach((y,k)=>{ if(fin(y)) mark(ops,doc,X(i),y,mkOf(k),o.mks); });
    const s=lblOf(r); const role=roleOf(s)==='label'?'label':'cat'; ops.text(s,X(i),h+1.0+tm.A,role,{align:'center'}); });
  if(C.length>1&&o.legend!=='none'){ const lg=tpLegend(doc,C.map((c,k)=>({text:lblOf(c),mk:mkOf(k)})),true); const lb=lg.bounds();
    const obs=[]; R.forEach((_,i)=>C.forEach((__,k)=>{ if(fin(M[i][k])) obs.push({x:X(i)-1.5,y:Y(M[i][k])-1.5,w:3,h:3}); })); R.forEach((_,i)=>{ const ok=C.map((__,k)=>M[i][k]).filter(fin).map(Y); if(ok.length>1) obs.push({x:X(i)-0.5,y:Math.min(...ok),w:1,h:Math.max(...ok)-Math.min(...ok)}); });
    let at=null; if(o.legend==='in') for(const [x,y] of [[w-1.6-lb.w,1.6],[1.6,1.6],[w-1.6-lb.w,h-1.6-lb.h],[1.6,h-1.6-lb.h]]){ const box={x,y,w:lb.w,h:lb.h}; if(!obs.some(q=>GG.overlap(q,box,0.3)>0)){ at=[x,y]; break; } }
    if(!at&&o.legend==='below'){ const b=ops.bounds(); const lg2=tpLegend(doc,C.map((c,k)=>({text:lblOf(c),mk:mkOf(k)})),false,true); const l2=lg2.bounds(); ops.absorb(lg2,w/2-l2.w/2-l2.x,b.y+b.h+2.2-l2.y); at='done'; }
    if(!at) at=[w+3,h/2-lb.h/2]; if(at!=='done') ops.absorb(lg,at[0]-lb.x,at[1]-lb.y); }
  return {ops,plot:{x:0,y:0,w,h},legend:'none',items:[],notes:[]};
}

/* ───────── ④ 인구 피라미드(붙여넣은 연령층 자료) ───────── */
function pyrPairs(C){ const out=[]; const used=new Set();
  C.forEach((c,j)=>{ if(used.has(j)) return; const g=c.grp||String(c.name).replace(/\s*(남자?|여자?|남성|여성|male|female)\s*$/i,'').trim();
    const k=C.findIndex((d,jj)=>jj>j&&!used.has(jj)&&(d.grp||String(d.name).replace(/\s*(남자?|여자?|남성|여성|male|female)\s*$/i,'').trim())===g);
    if(k>=0){ used.add(j); used.add(k); out.push({g,m:j,f:k}); } });
  if(!out.length) for(let j=0;j+1<C.length;j+=2) out.push({g:'',m:j,f:j+1});
  return out; }
function ageOf(name){ const m=String(name).match(/(\d+)/); return m?+m[1]:null; }
function pyrNotes(doc){ const {R}=derive(doc); if(!R.length) return []; const ages=R.map(r=>ageOf(r.name)); const asc=ages.length>1&&fin(ages[0])&&fin(ages[1])?ages[1]>ages[0]:true;
  const k=asc?R.length-1:0; const a=ages[k]; return fin(a)&&/이상|\+/.test(String(R[k].name))?[`${a}세 이상은 ${a}~${a+5}세로 처리함.`]:[]; }
function composePyr(doc){
  const o=doc.pyr; const {R,C,M}=derive(doc); const P=pyrPairs(C); if(!R.length||!P.length) return null;
  const V=P.map(p=>{ const mv=R.map((_,i)=>fin(M[i][p.m])?Math.max(0,M[i][p.m]):0), fv=R.map((_,i)=>fin(M[i][p.f])?Math.max(0,M[i][p.f]):0); const t=sum(mv)+sum(fv);
    return o.pct&&t>0?{m:mv.map(v=>v/t*100),f:fv.map(v=>v/t*100)}:{m:mv,f:fv}; });
  const mx=Math.max(...V.flatMap(v=>v.m.concat(v.f)),0.1);
  let step=+o.step>0?+o.step:GG.niceStep(mx,3), hi=o.auto!==false?Math.ceil(mx/step)*step:+o.max||Math.ceil(mx/step)*step; if(o.auto!==false){ step=GG.niceStep(hi,3); hi=Math.ceil(mx/step)*step; } LAST.pyr={lo:0,hi,step};
  const ages=R.map(r=>ageOf(r.name)); const asc=ages.length>1&&fin(ages[0])&&fin(ages[1])?ages[1]>ages[0]:true;
  const n=R.length, w=o.w, h=o.h, half=w/2, bh=h/n; const lw=W(doc,0.15), bw=W(doc,0.1);
  const out=new Ops(doc); let x0=0; const plots=[];
  P.forEach((p,pi)=>{ const ops=new Ops(doc); const v=V[pi]; const XL=val=>half-val/hi*half, XR=val=>half+val/hi*half;
    R.forEach((_,i)=>{ const row=asc?n-1-i:i; const y=row*bh; /* 아래쪽이 어린 나이 */
      if(v.m[i]>0) ops.rect(XL(v.m[i]),y,half-XL(v.m[i]),bh,{fill:GG.fillColor(doc,o.male),pat:GG.patOf(o.male),ps:doc.style.patScale||1,stroke:'#000000',sw:bw});
      if(v.f[i]>0) ops.rect(half,y,XR(v.f[i])-half,bh,{fill:GG.fillColor(doc,o.female),pat:GG.patOf(o.female),ps:doc.style.patScale||1,stroke:'#000000',sw:bw}); });
    ops.seg(0,h,w,h,lw); ops.seg(0,0,0,h,lw); ops.seg(half,0,half,h,W(doc,0.12));
    const tm=metrics(fontOf(doc,'tick'),'0'); let last=null; const T=ticksOf({lo:0,hi,step});
    const xb=h+1.4+tm.A; for(const t of T){ for(const x of t===0?[half]:[XL(t),XR(t)]){ ops.seg(x,h,x,h+0.7,lw); const it=ops.text(fmt(t,decOf(step)),x,xb,'tick',{align:'center'}); if(!last||it.box.x>last.box.x) last=it; } }
    const pu=o.pct?'(%)':(doc.data.unit?`(${doc.data.unit})`:''); if(last&&pu) ops.text(pu,last.box.x+last.box.w+0.3,xb,'unit');
    const lm=metrics(fontOf(doc,'axis'),'남'); const yl=xb+tm.D+1.0+lm.A; ops.text('남',half/2,yl,'axis',{align:'center'}); ops.text('여',half+half/2,yl,'axis',{align:'center'});
    /* 나이 눈금: 연령층 경계 가운데 ageStep마다 */
    const st=+o.ageStep||20; let topT=null;
    R.forEach((r,i)=>{ const a=ages[i]; if(!fin(a)||a%st!==0) return; const row=asc?n-1-i:i; const yb=(row+1)*bh; ops.seg(-0.7,yb,0,yb,lw); topT=ops.textMid(String(a),-0.9,yb,'tick',{align:'right'}); });
    const anyT=ops.list.filter(t=>t.t==='text'&&t.box.x<0); if(anyT.length){ const tt=anyT.reduce((a,b)=>a.box.y<b.box.y?a:b); ops.text('(세)',tt.box.x+tt.box.w/2,Math.min(tt.box.y,-0.6)-1.0,'unit',{align:'center'}); } void topT;
    if(p.g&&P.length>1){ const b=ops.bounds(); const s=p.g; const role=roleOf(s)==='label'?'label':'title'; ops.text(s,half,b.y-1.5,role,{align:'center',scale:role==='label'?1.05:1}); }
    const b=ops.bounds(); const per=o.cols>0?o.cols:P.length; void per; out.absorb(ops,x0-b.x,0); plots.push(1); x0+=b.w+o.gap; });
  const B=out.bounds();
  return {ops:out,plot:{x:B.x,y:0,w:B.w,h},legend:'none',items:[],notes:pyrNotes(doc)};
}

/* ───────── 조립 ───────── */
function compose(doc){
  for(const k of Object.keys(LAST)) delete LAST[k];
  const f={sc:composeSc,line:composeLine,dumb:composeDumb,pyr:composePyr}[doc.kind]; const r=f?f(doc):null; if(!r) return null;
  const ops=finish(doc,r); return {ops,plots:[r.plot]};
}
for(const k of ['sc','line','dumb','pyr']) GG.register(k,compose,'population');
for(const k of ['group','tb','tree','stack']) GG.register(k,EG.compose,'population');
function autoNotes(doc){ const extra=[]; const {C}=derive(doc);
  if(doc.kind==='sc') extra.push(...scNotes(doc,C,pairsOf(C))); if(doc.kind==='pyr') extra.push(...pyrNotes(doc));
  return EG.autoNotes(doc).concat(extra); }

/* ───────── 자료로 표 만들기 ───────── */
function expandRows(list){ const out=[]; for(const n of list){ const s=String(n);
    if(s.startsWith('@')){ const R=s.slice(1); for(const c of entities()){ const m=meta(c); if(m.kind==='country'&&(m.reg===R||m.sub===R||(R==='아메리카'&&(m.reg==='라틴 아메리카'||m.reg==='앵글로아메리카')))&&!out.includes(c)) out.push(c); } }
    else { const a=aliasFind(s)||s; if(!out.includes(a)) out.push(a); } } return out; }
function indName(k){ return String(IND[k].name).replace(/\(\d{4}년판\)$/,''); }
function colFor(k,ui,tp,extra){ const U=unitOf(k,ui); return Object.assign({name:indName(k),key:k,unit:U.u,dec:U.dec,tp:tp.label},extra||{}); }
/* 지표 비교: 행 = 나라, 열 = 지표(한 시점) */
function presetCmp(doc,p){
  const tp=parseTp(p.tp)||parseTp(String(PD.estLast)); const rows=expandRows(p.rows||[]).filter(n=>PD.v[n]); const keys=(p.keys||[]).filter(k=>IND[k]);
  /* 연평균 증가율 지표를 한 해(5의 배수)로 고르면 그 앞 5년 기간 값을 쓴다(2025학년도 6월 18번: 도시화율은 2020년, 연평균 도시 인구 증가율은 2015~2020년) */
  const tpOf=k=>IND[k].per&&tp.a===tp.b&&tp.a%5===0?parseTp(`${tp.a-IND[k].per}~${tp.a}`):tp;
  const cols=keys.map((k,j)=>colFor(k,(p.units||[])[j],tpOf(k))); const v=rows.map(n=>keys.map((k,j)=>valueAt(n,k,tpOf(k),unitOf(k,(p.units||[])[j]).f)));
  const perK=keys.filter(k=>tpOf(k)!==tp); const others=keys.filter(k=>tpOf(k)===tp);
  const andList=a=>a.length<2?(a[0]||''):`${a.slice(0,-2).map(x=>x+', ').join('')}${EG.josa(a[a.length-2],'과','와')} ${a[a.length-1]}`;
  const perNote=perK.length?`${others.length?EG.josa(andList(others.map(indName)),'은','는')+' '+tp.label+'년, ':''}${EG.josa(andList(perK.map(indName)),'은','는')} ${tpOf(perK[0]).label}년 기준임.`:'';
  setTable(doc,rows.map(n=>({name:n})),cols,v); doc.data.cols.forEach((c,j)=>c.fill=['white','dark','light','fs','dot','black'][j%6]);
  Object.assign(doc.data,{unit:'',measure:'',rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:'지표',note:[projNote([tp],null,keys),perNote].filter(Boolean).join('\n'),noteSum:false});
  doc.preset={type:'cmp',rows,keys,units:p.units||[],tp:tp.label}; doc.meta.year=`(${tp.label})`;
  return {rows,missing:(p.rows||[]).filter(n=>!String(n).startsWith('@')&&!PD.v[aliasFind(n)||n])};
}
/* 시기 변화: 행 = 나라, 열 = 시점(지표마다 한 칸 묶음) */
function presetTrend(doc,p){
  const rows=expandRows(p.rows||[]).filter(n=>PD.v[n]); const keys=(p.keys||[]).filter(k=>IND[k]); const tps=(p.tps||[]).map(parseTp).filter(Boolean);
  const cols=[], idx=[]; keys.forEach((k,ki)=>tps.forEach(tp=>{ const U=unitOf(k,(p.units||[])[ki]); cols.push({name:tp.label,key:k,unit:U.u,dec:U.dec,tp:tp.label,grp:keys.length>1||p.grpTitle?`<${(p.titles&&p.titles[ki])||indName(k)}>`:''}); idx.push([k,tp,U.f]); }));
  const vr=p.variant&&p.variant!=='med'?p.variant:null;
  const v=rows.map(n=>idx.map(([k,tp,f])=>valueAt(n,k,tp,f,vr)));
  setTable(doc,rows.map(n=>({name:n})),cols,v); const pal=['light','white','fs','dark','dot','black']; doc.data.cols.forEach((c,j)=>c.fill=pal[j%tps.length%pal.length]);
  doc.data.rows.forEach((r,i)=>r.mk=MKS[i%MKS.length]);
  const one=keys.length===1?unitOf(keys[0],(p.units||[])[0]):null;
  Object.assign(doc.data,{unit:one?one.u:'',measure:keys.length===1?indName(keys[0]):'',rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:'시기',note:projNote(tps,vr,keys),noteSum:false});
  doc.preset={type:'trend',rows,keys,units:p.units||[],tps:tps.map(t=>t.label),variant:vr||'med'}; doc.meta.year='';
  return {rows,tps,missing:(p.rows||[]).filter(n=>!String(n).startsWith('@')&&!PD.v[aliasFind(n)||n])};
}
/* 추계 비교: 행 = 추계 방식(나라가 여럿이면 나라·추계), 열 = 해 */
function presetProj(doc,p){
  const rows0=expandRows(p.rows||[]).filter(n=>PD.v[n]); const k=IND[p.k]?p.k:'pop'; const U=unitOf(k,p.unit); const tps=(p.tps||[]).map(parseTp).filter(t=>t&&t.a===t.b);
  const ORD=['hi','med','lo',...variants().map(a=>a[0])]; const vs=(p.variants&&p.variants.length?p.variants:['hi','med','lo']).filter(v=>variants().some(a=>a[0]===v)).slice().sort((a,b)=>ORD.indexOf(a)-ORD.indexOf(b)); const lost=[];
  const rows=[], v=[]; for(const n of rows0) for(const vr of vs){ const name=rows0.length>1?`${n} ${variantName(vr)}`:variantName(vr); rows.push({name,ent:n,variant:vr});
    v.push(tps.map(tp=>{ const x=valueAt(n,k,tp,U.f,vr); if(x==null&&!(vr!=='med'&&!varIndOk(k))) lost.push(`${name} ${tp.label}`); return x; })); }
  const cols=tps.map(tp=>({name:tp.label,key:k,unit:U.u,dec:U.dec,tp:tp.label}));
  setTable(doc,rows,cols,v); doc.data.rows.forEach((r,i)=>r.mk=MKS[i%MKS.length]);
  Object.assign(doc.data,{unit:U.u,measure:IND[k].name,rowNoun:'추계',itemNoun:'해',note:tps.some(t=>t.a>PD.estLast)?`${PD.estLast+1}년 이후 값은 추계값임.`:'',noteSum:false});
  doc.preset={type:'proj',rows:rows0,k,unit:p.unit,variants:vs,tps:tps.map(t=>t.label)}; doc.meta.year='';
  return {rows:rows0,lost,badInd:vs.some(v=>v!=='med')&&!varIndOk(k)};
}
/* 산점도: 행 = 나라, 열 = (가로축, 세로축) × 시점 */
function presetSc(doc,p){
  const rows=expandRows(p.rows||[]).filter(n=>PD.v[n]); const tps=(p.tps||[]).map(parseTp).filter(Boolean).slice(0,3); const kx=p.kx, ky=p.ky; if(!IND[kx]||!IND[ky]) return {rows:[],missing:[]};
  const Ux=unitOf(kx,p.ux), Uy=unitOf(ky,p.uy); const cols=[], idx=[];
  tps.forEach(tp=>{ cols.push({name:`${indName(kx)} ${tp.label}`,key:kx,unit:Ux.u,dec:Ux.dec,role:'x',t:`${tp.label}년`,ax:indName(kx)}); idx.push([kx,tp,Ux.f]);
    cols.push({name:`${indName(ky)} ${tp.label}`,key:ky,unit:Uy.u,dec:Uy.dec,role:'y',t:`${tp.label}년`,ax:indName(ky)}); idx.push([ky,tp,Uy.f]); });
  const v=rows.map(n=>idx.map(([k,tp,f])=>valueAt(n,k,tp,f)));
  setTable(doc,rows.map(n=>({name:n})),cols,v,{fills:false});
  Object.assign(doc.data,{unit:'',measure:'',rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:'지표',note:projNote(tps,null,[kx,ky]),noteSum:false});
  doc.preset={type:'sc',rows,kx,ky,ux:p.ux,uy:p.uy,tps:tps.map(t=>t.label)}; doc.meta.year=tps.length===1?`(${tps[0].label})`:'';
  return {rows,missing:(p.rows||[]).filter(n=>!String(n).startsWith('@')&&!PD.v[aliasFind(n)||n])};
}
/* 지역 안 나라별 인구 순위와 비율: 행 = 지역, 열 = 1위…N위, 기타 */
function membersOf(R){ return entities().filter(c=>{ const m=meta(c); return m.kind==='country'&&(m.reg===R||m.sub===R||(R==='아메리카'&&(m.reg==='라틴 아메리카'||m.reg==='앵글로아메리카'))||R==='세계'); }); }
function presetShare(doc,p){
  const tp=parseTp(p.tp)||parseTp(String(PD.estLast)); const N=Math.max(1,Math.min(10,+p.n||5)); const regs=(p.regions||[]).map(n=>aliasFind(n)||n).filter(n=>PD.v[n]&&isAgg(n));
  const cols=Array.from({length:N},(_,k)=>({name:`${k+1}위`,lbl:`${k+1}위`})); cols.push({name:'기타',other:true});
  const names=[]; const v=regs.map(R=>{ const tot=valueAt(R,'pop',tp,1); const list=membersOf(R).map(c=>[c,valueAt(c,'pop',tp,1)]).filter(a=>fin(a[1])).sort((a,b)=>b[1]-a[1]).slice(0,N);
    names.push(list.map(a=>a[0])); const sh=list.map(a=>a[1]/tot*100); const pad=Array(N-sh.length).fill(null);   /* 나라가 N개보다 적은 지역도 기타가 제자리(마지막 열)에 오도록 */
    return [...sh,...pad,Math.max(0,100-sum(sh))]; });
  setTable(doc,regs.map((n,i)=>({name:n,top:names[i]})),cols,v,{fills:false});
  const F=['black','dark','mid','light','light','light','light','light','light','light']; doc.data.cols.forEach((c,j)=>c.fill=c.other?'white':F[j]||'light');
  Object.assign(doc.data,{unit:'%',measure:'인구',rowNoun:'지역',itemNoun:'국가',note:`지역(대륙)별 1~${N}위 국가의 비율만을 나타내고, 그 외의 값은 기타로 처리함.`,noteSum:false});
  doc.preset={type:'share',regions:regs,n:N,tp:tp.label}; doc.meta.year=`(${tp.label})`;
  return {regions:regs,names};
}
/* 거주국 안 이민자의 출신국: 행 = 출신국, 열 = 이민자 수(한 해). rev: 2024년판(기본) 또는 2020년판(지난 기출) */
function migRevs(){ return PD&&PD.migod?Object.keys(PD.migod).sort().reverse():[]; }
function migYears(rev){ const M=PD&&PD.migod&&PD.migod[rev]; return M?M.years.map(String):[]; }
function migDests(rev){ const M=PD&&PD.migod&&PD.migod[rev]; return M?Object.keys(M.v).sort((a,b)=>a.localeCompare(b,'ko')):[]; }
function presetMigOD(doc,p){
  const rev=PD.migod[p.rev]?p.rev:migRevs()[0]; const M=PD.migod[rev]; const dest=aliasFind(p.dest)||p.dest; const tab=M.v[dest]||{};
  const Y=M.years; const year=Y.includes(+p.year)?+p.year:Y[Y.length-1]; const j=Y.indexOf(year); const U=unitOf('mig',p.unit);
  let origins=(p.origins||[]).map(n=>aliasFind(n)||n).filter(n=>n!==dest);
  const lost=origins.filter(n=>!tab[n]);
  if(!origins.length){ const N=Math.max(1,Math.min(15,+p.n||5)); origins=Object.entries(tab).filter(([,a])=>fin(a[j])).sort((a,b)=>b[1][j]-a[1][j]).slice(0,N).map(a=>a[0]); }
  const val=n=>tab[n]&&fin(tab[n][j])?tab[n][j]*U.f:null;
  const picked=!!(p.origins&&p.origins.length); let other=null;
  if(p.shape==='share'){ /* 비율 그림: 한 행(거주국)에 출신국을 열로, 나머지는 ‘기타’(= 그 나라 안 이민자 전체 − 고른 출신국) */
    const F=['light','dark','fs','dot','mid','bs','vl','hl','zz','sdot','xx','black']; const vals=origins.map(val);
    const cols=origins.map((n,k)=>({name:n,fill:F[k%F.length]})); const row=vals.slice();
    const tot=M.tot&&M.tot[dest]&&fin(M.tot[dest][j])?M.tot[dest][j]*U.f:null;
    if(p.other!==false&&fin(tot)){ other=tot-sum(vals.filter(fin)); if(other>0){ cols.push({name:'기타',other:true,fill:'white'}); row.push(other); } else other=null; }
    setTable(doc,[{name:dest}],cols,[row],{fills:false});
    const note=other!=null?(picked?`${dest} 내 이민자 중 나머지 출신 국가는 기타로 처리함.`:`이민자 수 상위 ${origins.length}개 출신 국가 외는 기타로 처리함.`):`${namesSorted(origins).join(', ')} 출신 이민자 수 합을 100%로 하여 나타냄.`;
    Object.assign(doc.data,{unit:U.u,measure:'이민자 수',rowNoun:'거주국',itemNoun:'출신 국가',note,noteSum:false});
    doc.meta.title=`<${dest} 내 이민자의 출신 국가별 비율>`; }
  else {
    setTable(doc,origins.map(n=>({name:n})),[{name:'이민자 수',key:'mig',unit:U.u,dec:U.dec,tp:String(year)}],origins.map(n=>[val(n)]));
    Object.assign(doc.data,{unit:U.u,measure:'이민자 수',rowNoun:'출신 국가',itemNoun:'지표',note:'',noteSum:false});
    doc.meta.title=`<${dest} 내 이민자 수>`; }
  doc.tb.rowHead=p.shape==='share'?'거주국':'출신 국가';
  doc.preset={type:'migod',dest,rev,year:String(year),origins:p.origins||[],n:p.n||5,shape:p.shape==='share'?'share':'rows',other:p.other!==false}; doc.meta.year=`(${year})`;
  return {dest,year,rev,origins,lost,noDest:!M.v[dest],other,total:M.tot&&M.tot[dest]?M.tot[dest][j]:null};
}
/* 연령층별 인구 구조: 행 = 나라, 열 = 유소년·청장년·노년층 비율 */
function presetAge(doc,p){
  const tp=parseTp(p.tp)||parseTp(String(PD.estLast)); const rows=expandRows(p.rows||[]).filter(n=>PD.v[n]); const keys=['p014','p1564','p65'];
  const v=rows.map(n=>keys.map(k=>valueAt(n,k,tp,1)));
  setTable(doc,rows.map(n=>({name:n})),AGE_GROUPS.map((name,j)=>({name,key:keys[j],unit:'%',dec:1})),v);
  const F=['white','light','dark']; doc.data.cols.forEach((c,j)=>c.fill=F[j]);
  Object.assign(doc.data,{unit:'%',measure:'인구',rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:'연령층',note:projNote([tp]),noteSum:false});
  doc.preset={type:'age',rows,tp:tp.label}; doc.meta.year=`(${tp.label})`;
  return {rows,missing:(p.rows||[]).filter(n=>!String(n).startsWith('@')&&!PD.v[aliasFind(n)||n])};
}
/* 인구 피라미드: 행 = 5세 단위 연령층(어린 나이부터), 열 = 나라마다 남·여(각 나라 총인구 대비 %) */
function pyrYears(){ return PD&&PD.pyr?PD.pyr.years.slice():[]; }
function presetPyr(doc,p){
  const Y=pyrYears(); const want=+(String(p.year||'').match(/\d{4}/)||[PD.estLast])[0];
  const year=Y.includes(want)?want:Y.reduce((a,b)=>Math.abs(b-want)<Math.abs(a-want)?b:a,Y[0]);
  const rows=expandRows(p.rows||[]).filter(n=>PD.pyr.v[n]&&PD.pyr.v[n][year]).slice(0,6);
  const G=PD.pyr.groups; const cols=[], idx=[];
  rows.forEach(n=>{ cols.push({name:`${n} 남`,grp:n,ent:n,sex:'m'}); cols.push({name:`${n} 여`,grp:n,ent:n,sex:'f'}); });
  const v=G.map((_,i)=>rows.flatMap(n=>{ const a=PD.pyr.v[n][year]; return [a[i],a[i+G.length]]; }));
  setTable(doc,G.map(g=>({name:g})),cols,v,{fills:false});
  Object.assign(doc.data,{unit:'%',measure:'인구',rowNoun:'연령층',itemNoun:'국가',note:year>PD.estLast?`${PD.estLast+1}년 이후 값은 중위 추계값임.`:'',noteSum:false});
  doc.pyr.pct=true; doc.preset={type:'pyr',rows,year:String(year)}; doc.meta.year=`(${year})`;
  return {rows,year,yearNote:year!==want?`${want}년 피라미드 자료가 없어 ${year}년으로 그렸어요(피라미드는 ${Y[0]}~${Y[Y.length-1]}년 10년마다와 2023년).`:'',missing:(p.rows||[]).filter(n=>!PD.pyr.v[aliasFind(n)||n])};
}
/* 피라미드 가리기: 나라 이름 대신 (가)~(다) */
function maskPyr(doc,seq){ const L=EG.SEQ[seq]; const ents=[...new Set(doc.data.cols.map(c=>c.ent).filter(Boolean))]; doc.data.cols.forEach(c=>{ if(c.ent) c.grp=seq?L[ents.indexOf(c.ent)]:c.ent; }); }
function hintOf(doc){
  if(doc.kind==='pyr'&&doc.data.cols.some(c=>c.ent&&c.grp&&c.grp!==c.ent)){ const seen=[]; for(const c of doc.data.cols) if(c.ent&&c.grp!==c.ent&&!seen.some(x=>x[0]===c.grp)) seen.push([c.grp,c.ent]);
    seen.sort((a,b)=>a[0].localeCompare(b[0],'ko')); const lbls=seen.map(x=>x[0]); const last=lbls[lbls.length-1];
    return {sentence:`(단, ${EG.seqRange(lbls)}${EG.particle(last)} 각각 ${EG.namesSorted(seen.map(x=>x[1])).join(', ')} 중 하나임.)`,key:seen.map(x=>`${x[0]} ${x[1]}`).join(', ')}; }
  return EG.hintOf(doc); }
/* 피라미드 붙여넣기 틀 */
const PYR_TEMPLATE='나이\t(가) 남\t(가) 여\n0~4\t\t\n5~9\t\t\n10~14\t\t\n15~19\t\t\n20~24\t\t\n25~29\t\t\n30~34\t\t\n35~39\t\t\n40~44\t\t\n45~49\t\t\n50~54\t\t\n55~59\t\t\n60~64\t\t\n65~69\t\t\n70~74\t\t\n75~79\t\t\n80~84\t\t\n85 이상\t\t';

/* ───────── 문장으로 만들기 ───────── */
const IND_WORDS=[['ugr',/(연평균\s*)?도시\s*인구\s*(의\s*)?(연평균\s*)?증가율/],['rgr',/(연평균\s*)?촌락\s*인구\s*(의\s*)?(연평균\s*)?증가율|농촌\s*인구\s*증가율/],['urb',/도시화율|도시\s*인구\s*(비율|비중)/],['rur',/촌락\s*인구\s*(비율|비중)|농촌\s*인구\s*(비율|비중)/],
  ['upop',/도시\s*인구/],['rpop',/촌락\s*인구|농촌\s*인구/],['migp',/(이민자|이주자|이주민)\s*(비율|비중)/],['mig',/이민자(\s*수)?|국제\s*이주자(\s*수)?|이주민(\s*수)?/],
  ['ydep',/유소년\s*부양비/],['odep',/노년\s*부양비|노년\s*인구\s*부양비/],['dep',/총\s*부양비|부양비/],['aging',/노령화\s*지수/],['sr1564',/청장년\s*층?\s*(의\s*)?성비/],
  ['p014',/유소년\s*층?\s*(인구\s*)?(비율|비중)|0\s*~\s*14\s*세\s*(인구\s*)?(비율|비중)/],['p1564',/청장년\s*층?\s*(인구\s*)?(비율|비중)|15\s*~\s*64\s*세\s*(인구\s*)?(비율|비중)/],['p65',/노년\s*층?\s*(인구\s*)?(비율|비중)|65\s*세\s*이상\s*(인구\s*)?(비율|비중)|고령\s*인구\s*(비율|비중)/],
  ['nmr',/순\s*이동률|순\s*이주율|순\s*이동\s*비율/],['nmig',/순\s*이동|순\s*이주|이주\s*인구|인구\s*이동/],['rnc',/자연\s*증가율|자연\s*증감률/],['natc',/자연\s*(적\s*)?증감|자연\s*증가\s*인구|자연\s*증가한\s*인구/],
  ['gr',/전체\s*증가율|인구\s*증가율|증가율/],['tfr',/합계\s*출산율|출산율/],['cbr',/출생률|조출생률/],['cdr',/사망률|조사망률/],['imr',/영아\s*사망/],['u5',/5세\s*미만/],['le',/기대\s*수명/],['med',/중위\s*연령/],
  ['dens',/인구\s*밀도/],['sexr',/성비/],['births',/출생아/],['deaths',/사망자/],['pop',/총인구|인구\s*(수|규모)|인구\(/]];
function findPlaces(text){ if(!PD) return []; const names=new Set(entities()); const hits=[]; const cands=[]; for(const n of names) cands.push([n,n]); for(const [k,a] of Object.entries(ALIAS)) for(const x of a) cands.push([x,k]);
  cands.sort((a,b)=>b[0].length-a[0].length); const used=new Array(text.length).fill(false);
  for(const [w,k] of cands){ let from=0; for(;;){ const i=text.indexOf(w,from); if(i<0) break; from=i+1; if(used.slice(i,i+w.length).some(Boolean)) continue; const pre=text[i-1]||' ', post=text[i+w.length]||' ';
      if(/[A-Za-z]/.test(w)&&(/[A-Za-z]/.test(pre)||/[A-Za-z]/.test(post))) continue; if(/[가-힣]/.test(pre)&&!/[와과및,·\s(]/.test(pre)) continue; if(/[가-힣]/.test(post)&&!/[의와과는은이가을를로에도만및별]/.test(post)) continue;
      const tail=text.slice(i+w.length,i+w.length+8); const expand=isAgg(k)&&k!=='세계'&&/^\s*(의\s*)?(모든\s*)?(국가|나라)/.test(tail);
      for(let t=i;t<i+w.length;t++) used[t]=true; hits.push({i,k,expand}); } }
  hits.sort((a,b)=>a.i-b.i); const out=[]; for(const h of hits) if(!out.some(o=>o.k===h.k)) out.push(h); return out; }
function indsIn(text){ const hits=[]; let t=text; for(const [k,re] of IND_WORDS){ const m=re.exec(t); if(m){ hits.push({k,i:m.index,e:m.index+m[0].length}); t=t.slice(0,m.index)+' '.repeat(m[0].length)+t.slice(m.index+m[0].length); } } hits.sort((a,b)=>a.i-b.i); indsIn.last=hits; return hits.map(h=>h.k); }
/* 지표 바로 뒤 괄호 속 단위: ‘총인구(만 명)’, ‘전체 증가율(‰)’ */
function unitIn(text,k){ const I=IND[k]; const h=(indsIn.last||[]).find(x=>x.k===k); const after=h?text.slice(h.e,h.e+10):''; const m=after.match(/^\s*\(([^)]+)\)/);
  if(m){ const j=I.units.findIndex(u=>u[0]===m[1].trim()); if(j>=0) return j; }
  /* 괄호 속 단위가 이 지표의 단위 중 하나면 그것(긴 단위부터: ‘백만 명’이 ‘만 명’보다 먼저) */
  const paren=[...text.matchAll(/\(([^)]+)\)/g)].map(x=>x[1].trim());
  const order=I.units.map((u,j)=>[u[0],j]).sort((a,b)=>b[0].length-a[0].length);
  for(const [u,j] of order) if(paren.includes(u)) return j;
  return null; }
function tpsIn(text){ text=String(text).replace(/\d{4}\s*년?\s*판/g,' '); const out=[]; const re=/(\d{4})\s*년?\s*[~∼～\-–]\s*(\d{4})\s*년?|(\d{4})\s*년?/g; let m;
  while((m=re.exec(text))){ if(m[1]) out.push(`${m[1]}~${m[2]}`); else out.push(m[3]); }
  /* ‘1970~2020년 10년 간격’ → 해마다 / ‘10년 단위(합)’ → 10년 묶음 */
  const step=text.match(/(\d+)\s*년\s*(간격|마다)/), unit=text.match(/(\d+)\s*년\s*단위/);
  if(out.length===1&&/~/.test(out[0])&&(step||unit)){ const [a,b]=out[0].split('~').map(Number); const st=+(step||unit)[1]; const res=[];
    if(unit){ for(let y=a;y+st-1<=b;y+=st) res.push(`${y}~${y+st-1}`); } else for(let y=a;y<=b;y+=st) res.push(String(y)); return res; }
  return out; }
function parseRequest(q){
  const text=String(q||'').replace(/\s+/g,' ').trim(); const spec={kind:null,src:null,rows:[],keys:[],units:[],tps:[],n:null,maskRows:null,maskCols:null,shuffle:false,end:null,diag:false};
  const notes=[]; if(!text) return {understood:false,spec,notes};
  const VW=[['hi',/고위/],['lo',/저위/],['med',/중위/],['cf',/출산율\s*(고정|불변)/],['zm',/순\s*이동\s*0|무이동|이동\s*없/],['nc',/변화\s*없|사망률\s*고정/],['mo',/모멘텀/],['ir',/즉시\s*대체|대체\s*출산율/]];
  const ORD=['hi','med','lo','cf','zm','nc','mo','ir']; spec.variants=VW.filter(([,re])=>re.test(text)).map(([k])=>k).sort((a,b)=>ORD.indexOf(a)-ORD.indexOf(b));
  if(/피라미드/.test(text)) spec.kind='pyr';
  else if(/산점도|가로축|세로축|x\s*축|y\s*축/.test(text)) spec.kind='sc';
  else if(/두\s*시기|아령|시기\s*비교/.test(text)) spec.kind='dumb';
  else if(/꺾은선|선\s*그래프|추이|변화/.test(text)) spec.kind='line';
  else if(/면적|순위와\s*비율|국가별\s*인구\s*순위|인구\s*순위/.test(text)) spec.kind='tree';
  else if(/묶은\s*막대|막대/.test(text)) spec.kind=/누적/.test(text)?'stack':'group';
  else if(/(^|\s)표(로|\s|$)|표를/.test(text)) spec.kind='tb';
  if(/섞어|무작위/.test(text)) spec.shuffle=true; if(/대각선|y\s*=\s*x/.test(text)) spec.diag=true; if(/범례/.test(text)) spec.end='legend';
  let keys=indsIn(text); if(/2018\s*년?\s*판/.test(text)) keys=keys.map(k=>IND[k+'18']?k+'18':k); spec.keys=keys; spec.units=keys.map(k=>unitIn(text,k.replace(/18$/,'')));
  spec.tps=tpsIn(text);
  const tn=text.match(/(\d+)\s*위\s*까지|상위\s*(\d+)/); if(tn) spec.n=+(tn[1]||tn[2]);
  spec.cellName=/나라\s*이름|국가\s*이름|국가명|나라명/.test(text)?'top':null;
  const places=findPlaces(text); spec.rows=places.map(p=>p.expand?'@'+p.k:p.k);
  const odm=text.match(/(\S+?)\s*(내|안|으로\s*온|로\s*온|에\s*사는|에\s*거주하는)\s*(의\s*)?(이민자|이주자|이주민)/);
  if(odm&&PD.migod&&spec.kind!=='pyr'){ const d=aliasFind(odm[1].replace(/(의|에)$/,''))||odm[1]; spec.src='migod'; spec.dest=d; spec.rows=places.map(p=>p.k).filter(n=>n!==d); spec.rev=/2020\s*년?\s*판/.test(text)?'2020':(/2024\s*년?\s*판/.test(text)?'2024':null); if(!spec.kind) spec.kind=/비율|구성|차지/.test(text)?'tree':'tb'; }
  else if(spec.kind!=='pyr'&&(spec.variants.length>1||(spec.variants.length&&/추계|전망/.test(text)))){ spec.src='proj'; if(!spec.kind||spec.kind==='dumb') spec.kind='line'; if(!spec.keys.length) spec.keys=['pop']; }
  else if(spec.kind==='pyr'){ if(PD.pyr&&spec.rows.length){ spec.src='pyr'; } else { spec.src='paste'; notes.push(PD.pyr?'피라미드로 그릴 나라나 지역 이름을 함께 적어 주세요. 붙여넣기 틀을 열어 두었어요.':'인구 피라미드 자료가 없어 붙여넣기 틀을 열어 두었어요.'); } }
  else if(/연령\s*(층\s*)?별?\s*(인구\s*)?구조|연령층별|연령\s*구성|연령층\s*비율/.test(text)&&!keys.some(k=>!['p014','p1564','p65'].includes(k))){ spec.src='age'; if(!spec.kind||spec.kind==='group') spec.kind='stack'; }
  else if(spec.kind==='tree'||((spec.kind==='stack'||!spec.kind)&&/상위\s*\d+\s*개\s*(국|나라)|1\s*~\s*\d+\s*위|국가별\s*(인구\s*)?순위|인구\s*순위/.test(text)&&places.some(p=>isAgg(p.k))&&!keys.some(k=>k!=='pop'))){ spec.src='share'; if(!spec.kind) spec.kind='tree'; spec.rows=places.filter(p=>isAgg(p.k)).map(p=>p.k); }
  else if(spec.kind==='sc'||(keys.length===2&&spec.tps.length<=3&&/산점도|과\s|와\s/.test(text)&&spec.kind!=='tb'&&spec.kind!=='group'&&spec.kind!=='line'&&spec.kind!=='dumb')){ spec.kind='sc'; spec.src='sc'; }
  else if(spec.kind==='tb'||(spec.tps.length<=1&&keys.length>1)){ spec.src='cmp'; if(!spec.kind) spec.kind='tb'; }
  else { spec.src='trend'; if(!spec.kind) spec.kind=spec.tps.length===2?'dumb':'line'; }
  if(spec.src==='sc'&&keys.length<2){ notes.push('산점도는 지표 두 개(가로축, 세로축)가 필요해요.'); }
  /* 가리기 */
  const G='\\([가나다라마바사아자차카타파하]\\)', Lt='(?<![A-Za-z])[A-J](?![A-Za-z])'; const re=new RegExp(`(${G}|${Lt})\\s*[~∼～\\-]\\s*(${G}|${Lt})`,'g'); let mm;
  while((mm=re.exec(text))){ const seq=/[A-Z]/.test(mm[1])?'latin':'gana'; const before=text.slice(Math.max(0,mm.index-12),mm.index); if(/지표|항목|시기/.test(before)) spec.maskCols=seq; else spec.maskRows=seq; }
  const understood=!!spec.src&&(spec.src==='paste'||(spec.src==='migod'&&!!spec.dest)||((spec.src==='pyr'||spec.src==='age')&&spec.rows.length>0)||(spec.src==='share'?spec.rows.length>0:spec.src==='proj'?spec.rows.length>0:(spec.rows.length>0&&keys.length>0&&(spec.src!=='sc'||keys.length>=2))));
  return {understood,spec,notes};
}
function specToDoc(spec,cur){
  const d=freshDoc(spec.kind||'sc'); if(cur&&cur.style) d.style=Object.assign({},cur.style); let info={};
  const last=String(PD.estLast);
  if(spec.src==='cmp') info=presetCmp(d,{rows:spec.rows,keys:spec.keys,units:spec.units,tp:spec.tps[0]||last});
  else if(spec.src==='trend') info=presetTrend(d,{rows:spec.rows,keys:spec.keys,units:spec.units,tps:spec.tps.length?spec.tps:['1970','1980','1990','2000','2010','2020']});
  else if(spec.src==='sc') info=presetSc(d,{rows:spec.rows,kx:spec.keys[0],ky:spec.keys[1],ux:spec.units[0],uy:spec.units[1],tps:spec.tps.length?spec.tps:[last]});
  else if(spec.src==='share') info=presetShare(d,{regions:spec.rows,n:spec.n||5,tp:spec.tps[0]||last});
  else if(spec.src==='proj'){ const ys=spec.tps.filter(t=>/^\d{4}$/.test(t)); info=presetProj(d,{rows:spec.rows,k:spec.keys[0],unit:spec.units[0],variants:spec.variants.length>1?spec.variants:['hi','med','lo'],tps:ys.length>2?ys:PROJ_YEARS}); }
  else if(spec.src==='migod'){ const rev=spec.rev||migRevs()[0]; info=presetMigOD(d,{dest:spec.dest,origins:spec.rows,year:spec.tps[0]||migYears(rev).slice(-1)[0],rev,n:spec.n||5,shape:spec.kind==='tree'||spec.kind==='stack'?'share':'rows'}); }
  else if(spec.src==='pyr'){ info=presetPyr(d,{rows:spec.rows,year:spec.tps[0]||last}); if(info.yearNote) info.yearNote=info.yearNote; }
  else if(spec.src==='age') info=presetAge(d,{rows:spec.rows,tp:spec.tps[0]||last});
  else if(spec.src==='paste'){ const lines=PYR_TEMPLATE.split('\n'); const head=lines[0].split('\t'); setTable(d,lines.slice(1).map(l=>({name:l.split('\t')[0]})),head.slice(1).map(n=>({name:n})),[]); d.data.unit='%'; info={template:true}; }
  const D=d.data;
  if(spec.shuffle&&spec.maskRows&&spec.src!=='pyr'){ const idx=shuffleArr(D.rows.map((_,i)=>i)); D.rows=idx.map(i=>D.rows[i]); D.v=idx.map(i=>D.v[i]); }
  if(spec.src==='pyr'){ if(spec.maskRows) maskPyr(d,spec.maskRows); }
  else if(spec.maskRows) mask(D.rows,spec.maskRows,r=>!r.other);
  if(spec.maskCols) mask(D.cols,spec.maskCols,c=>!c.other);
  if(spec.kind==='sc'){ d.sc.diag=!!spec.diag; }
  if(spec.kind==='line'&&spec.end) d.ln.end=spec.end;
  if(spec.kind==='group') groupAxis(d);
  if(spec.kind==='tb'&&spec.src==='trend'){ d.tb.rowHead=D.rowNoun; }
  if(spec.kind==='tree'){ d.tree.top=spec.maskRows||D.rows.length>1?'lbl':'none'; d.tree.inLbl='both'; if(spec.src==='migod') d.tree.sort=true; }
  if(spec.src==='share'){ if(spec.cellName) D.cellName='top'; if(spec.kind==='stack'){ Object.assign(d.stack,{inLbl:'both',leader:true,legend:'none',sortSeg:false,norm:true,trans:false}); d.stack.h=Object.assign({},d.stack.h,{barW:4.6,gap:4.6}); } }
  return {doc:d,info};
}
/* 묶은 막대 세로축: 눈금을 촘촘하게(합계 출산율 0~7처럼) */
function groupAxis(d){ const vals=d.data.v.flat().filter(fin); if(!vals.length) return; const a=autoAxis([0,...vals],{zero:true,target:6}); d.group.axis={auto:false,lo:a.lo,hi:a.hi,step:a.step}; }
const PROJ_YEARS=['1960','1980','2000','2020','2040','2060','2080','2100'];
function buildPrompt(q){
  return `세계지리 인구 그래프 편집기의 요청을 JSON 하나로 바꿔 줘. 다른 말은 쓰지 마.
형식: {"kind":"sc|line|dumb|group|tb|tree|stack|pyr","src":"cmp|trend|sc|share|paste|proj|pyr|age|migod","dest":null,"rev":null,"variants":["hi","med","lo"],"rows":["독일"],"keys":["rnc"],"units":[null],"tps":["2015~2020"],"n":5,"maskRows":"gana|latin|null","maskCols":"gana|latin|null","shuffle":false,"missing":[]}
- 지표 키: ${IND_KEYS.map(k=>`${k} ${IND[k].name}(${IND[k].units.map(u=>u[0]).join('/')})`).join(', ')}. units는 keys마다 단위 순번(없으면 null).
- 시점 tps: 해(‘2023’) 또는 기간(‘2015~2020’, ‘1971~1980’). 자료는 1950~2023년 해마다, 2025~2100년은 5년마다 추계.
- src=proj: 추계 방식 비교(꺾은선). variants는 ${variants().map(a=>a[0]+' '+a[1]).join(', ')} 중에서. 추계 변형은 pop tfr med rnc gr만, 2030~2100년 10년마다.
- src=cmp: 한 시점에 여러 지표(표·묶은 막대). src=trend: 한 지표를 여러 시점(꺾은선·두 시기 비교·묶은 막대). src=sc: keys 두 개(가로축, 세로축)를 1~2 시점에. src=share: 지역 안 나라별 인구 순위와 비율(rows는 대륙). src=pyr: 인구 피라미드(rows는 나라·지역 1~6곳, tps는 해 하나; 1950~2020년 10년마다·2023·2030~2100년 10년마다). src=age: 연령층별 인구 구조(유소년·청장년·노년층 비율 누적 막대, tps는 해 하나). src=migod: 한 나라(dest) 안 이민자의 출신국별 수(rows=출신국, 비우면 상위 n개국; tps는 1990~2020년 5년마다·2024 중 하나; rev는 2024 또는 2020(지난 기출이 쓴 판)). 도시화율(urb)·도시 인구(upop)·도시 인구 증가율(ugr)·촌락 인구 비율(rur)은 1950~2050년(2025년판; 지난 기출과 맞추려면 urb18·upop18·ugr18·rur18·rpop18 = 2018년판), 이민자 수(mig)·이민자 비율(migp)은 1990~2020년 5년마다와 2024년. src=paste: 이 자료에 없는 것.
- rows는 나라 이름, ‘세계’, 대륙(아시아, 아프리카, 유럽, 라틴 아메리카, 앵글로아메리카, 오세아니아, 아메리카), 선진국, 개발 도상국. 목록에 없으면 missing에 넣는다.
요청: ${q}`;
}
function cleanSpec(o){ if(!o||typeof o!=='object') return null; const pick=(v,arr,def)=>arr.includes(v)?v:def;
  const s={kind:pick(o.kind,KINDS,'line'),src:pick(o.src,['cmp','trend','sc','share','paste','proj','pyr','age','migod'],null),dest:o.dest?String(o.dest):null,rev:pick(String(o.rev),['2024','2020'],null),variants:(Array.isArray(o.variants)?o.variants:[]).filter(v=>variants().some(a=>a[0]===v)),rows:(Array.isArray(o.rows)?o.rows:[]).map(String).map(n=>aliasFind(n)||n),
    keys:(Array.isArray(o.keys)?o.keys:[]).filter(k=>IND[k]),units:Array.isArray(o.units)?o.units.map(u=>fin(+u)?+u:null):[],tps:(Array.isArray(o.tps)?o.tps:[]).map(String).filter(t=>parseTp(t)),
    n:fin(+o.n)?+o.n:null,maskRows:pick(o.maskRows,['gana','latin'],null),maskCols:pick(o.maskCols,['gana','latin'],null),shuffle:!!o.shuffle,end:null,diag:false};
  if(!s.src) return null; return s; }

return {KINDS,KIND_KO,IND,IND_KEYS,GROUPS,MKS,setData,data,meta,entities,isAgg,aliasFind,series,years,parseTp,tpYears,valueAt,unitOf,variants,variantName,varIndOk,presetProj,PROJ_YEARS,
  freshDoc,normalizeDoc,compose,autoNotes,groupAxis,presetCmp,presetTrend,presetSc,presetShare,presetAge,presetPyr,pyrYears,maskPyr,hintOf,AGE_GROUPS,presetMigOD,migRevs,migYears,migDests,MIG_YEARS,srcText,PYR_TEMPLATE,parseRequest,specToDoc,buildPrompt,cleanSpec,membersOf,
  lastAxes:()=>Object.assign({},LAST)};
})();
