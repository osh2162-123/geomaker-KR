/* 한국지리 백지도 엔진(KM): 시군구·시도 경계(UTM-K 좌표)로 시험지 양식 백지도(SVG, mm 단위)를 그리고,
   문장을 읽어 범위·경계·색칠·기호를 정한다. 기호·점·글자는 지형 모식도 엔진(LG)의 항목으로 만든다. */
const KM=(function(){
'use strict';
let D=null; const GC={}, PC={}, PCR={};
function setData(d){ D=d; for(const k in GC) delete GC[k]; for(const k in PC) delete PC[k]; for(const k in PCR) delete PCR[k]; }
function data(){ return D; }
const f2=v=>(Math.round(v*100)/100).toString();
const norm=s=>String(s||'').replace(/[\s·.,()（）]/g,'').toLowerCase();

/* ───────── 권역·시도 ───────── */
const SIDO_ORDER=['11','26','27','28','29','30','31','36','41','43','44','46','12','47','48','50','51','52'];
const REGIONS=[
  {id:'sk',ko:'전국(남한)',w:['전국','남한','대한민국','우리나라','한국']},
  {id:'kor',ko:'한반도(남북한)',w:['한반도','남북한','북한까지','남북','한반도전체']},
  {id:'nk',ko:'북한',w:['북한만','북한지도','북한 지도','북한 전도','북한 땅']},
  {id:'capital',ko:'수도권',w:['수도권'],s:['11','28','41']},
  {id:'gangwon',ko:'강원권',w:['강원권','강원지방','강원 지방','관동지방','관동 지방'],s:['51']},
  {id:'chung',ko:'충청권',w:['충청권','충청지방','충청도'],s:['30','36','43','44']},
  {id:'honam',ko:'호남권',w:['호남권','호남','전라권','전라도','호남지방'],s:['29','46','52','12']},
  {id:'yeong',ko:'영남권',w:['영남권','영남','경상권','경상도','영남지방'],s:['26','27','31','47','48']},
  {id:'dongnam',ko:'동남권',w:['동남권'],s:['26','31','48']},
  {id:'daegyeong',ko:'대경권',w:['대경권','대구경북권'],s:['27','47']},
  {id:'jeju',ko:'제주권',w:['제주권','제주지방','제주 지방'],s:['50']},
];
const SIDO_WORDS={'11':['서울','서울시','서울특별시'],'26':['부산','부산시','부산광역시'],'27':['대구','대구시','대구광역시'],'28':['인천','인천시','인천광역시'],
  '29':['광주광역시','광주시내'],'30':['대전','대전시','대전광역시'],'31':['울산','울산시','울산광역시'],'36':['세종','세종시','세종특별자치시'],
  '41':['경기','경기도'],'43':['충북','충청북도'],'44':['충남','충청남도'],'46':['전남','전라남도'],'12':['전남광주','전남광주통합특별시'],'47':['경북','경상북도'],'48':['경남','경상남도'],
  '50':['제주','제주도','제주특별자치도'],'51':['강원','강원도','강원특별자치도'],'52':['전북','전라북도','전북특별자치도']};

/* ───────── 경계 자료 ───────── */
function verOf(map){ return D&&D.vers[map.ver]?map.ver:'b'; }
function G(map,lod,trim){
  /* trim: 지역 지도면 그 지역의 포함 함수. 지역 본토(100 km² 넘는 조각들의 범위)에서 30 km 넘게 떨어진 섬은 뺀다
     (수도권의 백령도·연평도, 호남권의 흑산도·가거도, 충남의 격렬비열도 등). 울릉도는 상자로 따로 다룬다 */
  const v=verOf(map), key=v+lod+(trim?'t'+map.area+(map.sido||[]).join(','):''); if(GC[key]) return GC[key];
  const t=D.vers[v].topo[lod]; const name=Object.keys(t.objects)[0]; let obj=t.objects[name];
  if(trim){
    const full=topojson.feature(t,obj).features; const P_=full.map(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates.map(partInfo):f.geometry.type==='Polygon'?[partInfo(f.geometry.coordinates)]:[]);
    let core=null; const grow=b=>{ core=core?[Math.min(core[0],b[0]),Math.min(core[1],b[1]),Math.max(core[2],b[2]),Math.max(core[3],b[3])]:b.slice(); };
    obj.geometries.forEach((g,i)=>{ const p=g.properties; if(!trim(p)||isUl(p)) return; P_[i].forEach(q=>{ if(q.a>=1e8) grow(q.b); }); });
    if(!core) obj.geometries.forEach((g,i)=>{ const p=g.properties; if(!trim(p)||isUl(p)||!P_[i].length) return; grow(P_[i].reduce((a,q)=>q.a>a.a?q:a).b); });
    const R=30000;
    if(core) obj={type:'GeometryCollection',geometries:obj.geometries.map((g,i)=>{ if(g.type!=='MultiPolygon'||isUl(g.properties)) return g;
      const keep=g.arcs.filter((_,j)=>{ const b=P_[i][j].b; return b[2]>=core[0]-R&&b[0]<=core[2]+R&&b[3]>=core[1]-R&&b[1]<=core[3]+R; });
      return Object.assign({},g,{arcs:keep.length?keep:g.arcs}); })};
  }
  const fc=topojson.feature(t,obj).features;
  fc.forEach((f,i)=>{ f.i=i; f.p=f.properties; let b=[1e12,1e12,-1e12,-1e12]; eachXY(f.geometry,(x,y)=>{ if(x<b[0])b[0]=x; if(y<b[1])b[1]=y; if(x>b[2])b[2]=x; if(y>b[3])b[3]=y; }); f.b=b; f.fb=b; });
  obj.geometries.forEach(g=>{ g.p=g.properties; });
  return GC[key]={t,obj,fc};
}
function partInfo(P_){ let a=0,bb=[1e12,1e12,-1e12,-1e12]; const r=P_[0]; for(let j=0,k=r.length-1;j<r.length;k=j++){ a+=(r[k][0]+r[j][0])*(r[k][1]-r[j][1]); const [x,y]=r[j]; if(x<bb[0])bb[0]=x; if(y<bb[1])bb[1]=y; if(x>bb[2])bb[2]=x; if(y>bb[3])bb[3]=y; } return {a:Math.abs(a/2),b:bb}; }
function eachXY(g,fn){ const C=g.coordinates; if(g.type==='Polygon') C.forEach(r=>r.forEach(p=>fn(p[0],p[1]))); else if(g.type==='MultiPolygon') C.forEach(P=>P.forEach(r=>r.forEach(p=>fn(p[0],p[1])))); }
/* 북한 도: 해방(1945) 당시 6개 도로 합쳐 보는 근사. 지금의 양강도는 함경남도, 자강도는 평안북도, 나선·평양·남포는 각각 함경북도·평안남도, 황해남·북도는 황해도로 묶는다.
   (실제 옛 도 경계는 지금 도 경계와 달라 군 단위로 어긋나는 곳이 있다. 데이터에 군 단위 북한 경계가 없어 도 단위로만 합친다) */
const NK_LIB={nk09:'h09',nk13:'h09',nk10:'h08',nk08:'h08',nk04:'h03',nk03:'h03',nk02:'h02',nk01:'h02',nk05:'h05',nk06:'h05',nk07:'h07'};
const NK_LIB_MAIN={h09:'nk09',h08:'nk08',h03:'nk03',h02:'nk02',h05:'nk05',h07:'nk07'};
const NK_LIB_NAME={h09:'함경북도',h08:'함경남도',h03:'평안북도',h02:'평안남도',h05:'황해도',h07:'강원도'};
function libOn(map){ return map&&map.nkEra!=='now'; }
function nkGroup(map,p){ return p&&p.s==='NK'?(libOn(map)?(NK_LIB[p.c]||p.c):p.c):null; }
function nkName(map,p){ if(!p||p.s!=='NK') return p&&p.n; return libOn(map)?(NK_LIB_NAME[NK_LIB[p.c]]||p.n):p.n; }
function places(map){ const v=verOf(map); const lib=libOn(map); const key=v+(lib?'L':''); if(PC[key]) return PC[key]; const base=placesRaw(map);
  if(!lib) return PC[key]=base;
  const nd=base.filter(p=>p.k==='nkdo'); const out=base.filter(p=>p.k!=='nkdo');
  for(const gk of Object.keys(NK_LIB_NAME)){ const mc=NK_LIB_MAIN[gk]; const mem=nd.filter(p=>NK_LIB[p.c]===gk); const main=mem.find(p=>p.c===mc); if(!main) continue;
    const w=p=>p===main?3:1; const sw=mem.reduce((a,p)=>a+w(p),0); const nm=NK_LIB_NAME[gk];
    out.push(Object.assign({},main,{n:nm,x:mem.reduce((a,p)=>a+p.x*w(p),0)/sw,y:mem.reduce((a,p)=>a+p.y*w(p),0)/sw,al:nm.endsWith('도')?[nm.slice(0,-1)]:[]})); }
  return PC[key]=out; }
function placesRaw(map){ const v=verOf(map); if(PCR[v]) return PCR[v];
  const base=D.vers[v].places||[]; const extra=[];
  /* 통합특별시 경계에서는 옛 광주광역시(5개 구)를 ‘광주’ 묶음으로 찾는다 */
  if(!base.some(p=>p.k==='sido'&&p.c==='29')){ const g=base.filter(p=>p.k==='sgg'&&p.s==='12'&&/구$/.test(p.n));
    if(g.length){ const av=k=>g.reduce((a,p)=>a+p[k],0)/g.length; extra.push({k:'grp',n:'광주',al:['광주광역시','광주시내'],s:'12',codes:g.map(p=>p.c),x:av('x'),y:av('y'),lx:av('lx'),ly:av('ly')}); } }
  return PCR[v]=[...base,...extra,...(D.places||[])]; }
function sidoName(code){ return (D&&D.sido&&D.sido[code])||code; }
function sidoList(map){ const v=verOf(map); const have=new Set(D.vers[v].places.filter(p=>p.k==='sido').map(p=>p.c)); return SIDO_ORDER.filter(c=>have.has(c)); }

/* ───────── 지도 설정 ───────── */
function freshMap(){ return {ver:'b',verPick:false,area:'sk',sido:[],level:'sido',shade:{},metro:'auto',width:45,scale:true,ulleung:'box',dokdo:true,inset:false,rivers:[],nkdo:true,nkEra:'lib',skShow:true,han:true,frame:false,sv:2,roads:[],roadStyle:{},roadLegend:true,
  bl:false,bp:false,ts:false,nb:false,blStyle:'solid',seaLegend:true}; }
/* 2026년 7월 1일 전남광주통합특별시 출범: 경계 기준을 직접 고른 적이 없는 지도는 7월 기준(b)으로 연다 */
function normalizeMap(m){ const x=Object.assign(freshMap(),m||{}); if(!x.verPick) x.ver='b'; return x; }
/* 그릴 지역인가 */
function incFn(map){
  const a=map.area, S=new Set(map.sido||[]);
  if(a==='sk') return p=>p.s!=='NK';
  if(a==='kor') return p=>true;
  if(a==='nk') return p=>p.s==='NK';
  const R=REGIONS.find(r=>r.id===a); const set=R&&R.s?new Set(R.s):S;
  return p=>set.has(p.s);
}
function areaLabel(map){
  const R=REGIONS.find(r=>r.id===map.area); if(R) return R.ko;
  return (map.sido||[]).map(sidoName).join('·')||'지역';
}
function lodOf(map){ return ['sk','kor','nk','yeong','honam'].includes(map.area)||(map.area==='sido'&&(map.sido||[]).length>3)?'lo':'hi'; }
const ULLEUNG='47940';
function isUl(p){ return p&&p.c===ULLEUNG; }
function ulMode(map,feats){ return feats.some(f=>isUl(f.p))?map.ulleung:'off'; }

/* ───────── 도법: UTM-K(m) → 쪽(mm) ───────── */
const M=1.5;
function layout(map){
  if(!D) return null;
  const wide=['sk','kor','nk'].includes(map.area); const inc=incFn(map); const g=G(map,lodOf(map),wide||seaOn(map)?null:inc);   /* 영해를 그리면 멀리 떨어진 섬(가거도·홍도 등)도 남긴다 */
  const feats=g.fc.filter(f=>inc(f.p)); if(!feats.length) return null;
  const ul=ulMode(map,feats);
  const main=feats.filter(f=>!(isUl(f.p)&&ul!=='true'));
  let b=[1e12,1e12,-1e12,-1e12]; for(const f of main){ const fb=f.fb; b=[Math.min(b[0],fb[0]),Math.min(b[1],fb[1]),Math.max(b[2],fb[2]),Math.max(b[3],fb[3])]; }
  if(ul==='true'&&map.dokdo){ const dk=(D.places||[]).find(p=>p.n==='독도'); if(dk) b=[b[0],Math.min(b[1],dk.y-3000),Math.max(b[2],dk.x+3000),Math.max(b[3],dk.y+3000)]; }
  /* 영해 선·기점이 바다로 나가므로, 그리는 땅에서 50 km 안에 있는 것까지 범위를 넓힌다 */
  const sp=seaParts(map,ul);
  if(sp){ const E=wide?50000:25000, w0=[b[0]-E,b[1]-E,b[2]+E,b[3]+E];
    const add=(x,y)=>{ if(x<w0[0]||x>w0[2]||y<w0[1]||y>w0[3]) return; b=[Math.min(b[0],x-1500),Math.min(b[1],y-1500),Math.max(b[2],x+1500),Math.max(b[3],y+1500)]; };
    if(map.bl||map.bp) for(const p of D.sea.pts) add(p.x,p.y);
    for(const l of sp.ts) for(const q of l) add(q[0],q[1]);
    for(const o of sp.nb) if(!o.ul) for(const q of o.l) add(q[0],q[1]); }
  /* 울릉도·독도 상자: 본토 오른쪽 위에 실제 크기로 */
  let ubox=null, dbox=null;
  if(ul==='box'){ const uf=feats.find(f=>isUl(f.p)); if(uf){ const pad=5000; const ulb=uf.fb.slice(); const dk=(D.places||[]).find(p=>p.n==='독도');
      const uw=ulb[2]-ulb[0]+2*pad, uh=ulb[3]-ulb[1]+2*pad;
      const tx=b[2]+3000, ty=Math.min(b[3],ulb[3]+pad)-uh;      /* 상자 왼쪽 아래(m) */
      ubox={dx:tx-(ulb[0]-pad), dy:ty-(ulb[1]-pad), x:tx, y:ty, w:uw, h:uh, ox:ulb[0]-pad, oy:ulb[1]-pad};
      b=[b[0],Math.min(b[1],ty),Math.max(b[2],tx+uw),Math.max(b[3],ty+uh)];
      /* 독도: 울릉도에서 약 87 km 떨어져 있어 실제 자리로 넣으면 상자가 너무 커지므로, 울릉도 상자 오른쪽에 작은 상자로 따로 */
      if(map.dokdo&&dk){ const sd=Math.max(uw*0.6,5000); const x0=tx+uw-sd, y0=ty-sd;   /* 시험지처럼 울릉도 상자 아래 오른쪽에 붙인 작은 상자 */
        dbox={dx:x0+sd/2-dk.x, dy:y0+sd/2-dk.y, x:x0, y:y0, w:sd, h:sd, px:dk.x, py:dk.y};
        b=[b[0],Math.min(b[1],y0),b[2],b[3]]; } } }
  /* 북한 지도: 시험지처럼 휴전선 아래 남한 땅이 조금 보이게 남쪽에 여백을 둔다 */
  const skOn=map.area==='nk'&&map.skShow!==false; if(skOn) b=[b[0],b[1]-(b[3]-b[1])*0.07,b[2],b[3]];
  const w=Math.max(20,+map.width||70); const k=(w-2*M)/(b[2]-b[0]); const h=(b[3]-b[1])*k+2*M;
  return {g,inc,feats,main,ul,ubox,dbox,b,k,w,h,lod:lodOf(map),skOn};
}
function P(L,x,y,ul){ if(ul&&L.ubox){ x+=L.ubox.dx; y+=L.ubox.dy; } return [M+(x-L.b[0])*L.k, M+(L.b[3]-y)*L.k]; }
function inv(L,px,py){ return [(px-M)/L.k+L.b[0], L.b[3]-(py-M)/L.k]; }
/* 지명의 쪽 좌표(울릉군 안이면 상자로 옮김) */
function inUl(L,x,y){ if(!L.ubox) return false; return x>=L.ubox.ox&&x<=L.ubox.ox+L.ubox.w&&y>=L.ubox.oy&&y<=L.ubox.oy+L.ubox.h; }
function toPage(L,x,y){ const d=L.dbox; if(d&&Math.abs(x-d.px)<d.w/2&&Math.abs(y-d.py)<d.h/2) return [M+(x+d.dx-L.b[0])*L.k, M+(L.b[3]-(y+d.dy))*L.k]; return P(L,x,y,inUl(L,x,y)); }

/* ───────── SVG 조각 ───────── */
function ringPath(L,ring,ul){ let s=''; let lx=null, ly=null;
  for(let i=0;i<ring.length;i++){ const [x,y]=P(L,ring[i][0],ring[i][1],ul); if(i&&Math.abs(x-lx)<0.04&&Math.abs(y-ly)<0.04&&i<ring.length-1) continue; s+=(i?'L':'M')+f2(x)+' '+f2(y); lx=x; ly=y; }
  return s; }
function geomPath(L,geom,ul){ if(!geom) return ''; let s='';
  if(geom.type==='Polygon') geom.coordinates.forEach(r=>s+=ringPath(L,r,ul)+'Z');
  else if(geom.type==='MultiPolygon') geom.coordinates.forEach(P_=>P_.forEach(r=>s+=ringPath(L,r,ul)+'Z'));
  else if(geom.type==='LineString') s+=ringPath(L,geom.coordinates,ul);
  else if(geom.type==='MultiLineString') geom.coordinates.forEach(l=>s+=ringPath(L,l,ul));
  return s; }
const TONES={light:{fill:'#d9d9d9',ko:'연한 회색'},mid:{fill:'#b2b2b2',ko:'회색'},dark:{fill:'#7f7f7f',ko:'진한 회색'},hatch:{fill:'url(#kmHatch)',ko:'빗금'},dots:{fill:'url(#kmDots)',ko:'점무늬'},black:{fill:'#111',ko:'검정'}};
const TONE_ORDER=['light','mid','dark','hatch','dots'];
/* 선 양식: 평가원 한국지리 지도(2024~2027학년도)를 확대해 맞춤. 시험지 지도 너비 42 mm 안팎 기준의 실제 굵기(mm) */
const LS={coast:{w:0.13},sido:{w:0.24,da:'0.6 0.45 0 0.45',cap:'round'},sgg:{w:0.1,da:'0 0.23',cap:'round',col:'#1a1a1a'},
  nk:{w:0.2,da:'0.55 0.4 0 0.4',cap:'round'},dmz:{w:0.16,da:'0.6 0.32'},river:{w:0.15},box:{w:0.1}};
const LW={coast:LS.coast.w,river:LS.river.w};
const strokeOf=k=>{ const S=LS[k]; return `fill="none" stroke="${S.col||'#000'}" stroke-width="${S.w}" stroke-linejoin="round"${S.da?` stroke-dasharray="${S.da}"`:''}${S.cap?` stroke-linecap="${S.cap}"`:''}`; };
function niceKm(km){ const c=[1,2,5,10,20,25,30,50,100,150,200]; let best=c[0]; for(const v of c) if(v<=km) best=v; return best; }
/* 본 지도 SVG(쪽 mm 단위). 반환 {svg,w,h,L} */
/* 광역시·특별시(특별자치시 포함)를 구 경계 없이 한 덩어리로: 시험지의 권역·도 지도 방식. 'auto'는 광역시만 그리는 지도(서울 자치구 지도 등)에서만 구를 나눈다 */
const METRO_ALL=['11','26','27','28','29','30','31','36'];
function metroIn(map){ const inc=incFn(map); return METRO_ALL.filter(s=>inc({s})); }
function mergeOn(map){ const v=map.metro||'auto'; if(map.level!=='sgg') return false; if(v==='merge') return true; if(v==='split') return false;
  return !(map.area==='sido'&&(map.sido||[]).length&&map.sido.every(s=>METRO_ALL.includes(s))); }
/* 합쳐 그릴 덩어리 이름: 광역시는 시·도 코드, 7월 기준 통합특별시의 옛 광주 5개 구는 하나로 */
function unitKey(map,p){ if(!mergeOn(map)||!p) return null; if(METRO_ALL.includes(p.s)) return 's:'+p.s; if(p.s==='12'&&/구$/.test(p.n||'')) return 'g:12'; return null; }
function unitCodes(map,key){ if(key==='g:12') return places(map).filter(q=>q.k==='sgg'&&q.s==='12'&&/구$/.test(q.n)).map(q=>q.c); return null; }
/* 고속 국도 선 양식: [굵기, 색, 파선] 겹쳐 그림 */
const ROAD_ST={bold:[[0.5,'#000']],dash:[[0.5,'#000','1.1 0.55']],double:[[0.62,'#000'],[0.34,'#fff']],thin:[[0.25,'#000']]};
const ROAD_KO={bold:'굵은 실선',dash:'굵은 파선',double:'두 줄',thin:'가는 실선'};
const ROAD_AUTO=['bold','dash','double','thin'];
function roadStyleOf(map,r){ const s=(map.roadStyle||{})[r]; if(s&&ROAD_ST[s]) return s; const i=(map.roads||[]).indexOf(r); return ROAD_AUTO[Math.max(0,i)%ROAD_AUTO.length]; }
function roadLabel(r){ return r+' 고속 국도'; }
/* ───────── 영해: 직선 기선·기점·영해선·통상 기선 ─────────
   자료(D.sea): 「영해 및 접속수역법 시행령」 별표 1의 기점 23곳(세계측지계), 기선에서 12해리(대한 해협은 별표 2의 3해리) 영해선,
   직선 기선을 쓰지 않는 해안(동해안·제주도·울릉도·독도). 기출 지도처럼 서해는 소령도 위도까지, 동해는 휴전선까지 */
const SEA_ST={ts:{w:0.15,da:'0.6 0.4'},bl:{w:0.22},blDot:{w:0.26,da:'0 0.5',cap:'round'},nb:{w:0.42,cap:'round'}};
const SEA_KO={bp:'기점',bl:'직선 기선',nb:'통상 기선',ts:'영해선'};
const UL_X=1230000, DK_X=1340000;     /* UTM-K x: 이보다 동쪽이면 울릉도·독도 쪽 선 */
function seaOn(map){ return !!(map&&(map.bl||map.bp||map.ts||map.nb)&&D&&D.sea); }
/* 이 지도에 그릴 영해 조각. 울릉도를 상자에 넣으면 울릉도·독도 영해선은 상자보다 커서 그리지 않고, 울릉도 통상 기선만 상자 안으로 옮긴다 */
function seaParts(map,ul){ if(!seaOn(map)) return null; const S=D.sea;
  const tag=l=>l[0][0]>DK_X?'dk':l[0][0]>UL_X?'ul':'main';
  const ts=map.ts?S.ts.filter(l=>{ const t=tag(l); return t==='main'||(t==='ul'&&ul==='true')||(t==='dk'&&ul==='true'&&map.dokdo); }):[];
  const nb=map.nb?S.nb.filter(l=>{ const t=tag(l); return t==='main'||(t==='ul'&&(ul==='true'||ul==='box')); }).map(l=>({l,ul:tag(l)==='ul'&&ul==='box'})):[];
  return {ts,nb}; }
function bpR(L){ return Math.max(0.4,Math.min(0.8,(L.mw||L.w)*0.0105)); }
function seaStroke(S){ return `fill="none" stroke="#000" stroke-width="${S.w}" stroke-linejoin="round" stroke-linecap="${S.cap||'butt'}"${S.da?` stroke-dasharray="${S.da}"`:''}`; }
function seaSvg(L,map){ const sp=seaParts(map,L.ul); if(!sp) return []; const out=[]; const S=D.sea; const pt={}; for(const p of S.pts) pt[p.i]=p;
  if(sp.nb.length){ let d=''; for(const o of sp.nb) d+=ringPath(L,o.l,o.ul); out.push(`<path d="${d}" ${seaStroke(SEA_ST.nb)}/>`); }
  if(map.bl){ let d=''; for(const c of S.chains) d+=ringPath(L,c.map(i=>[pt[i].x,pt[i].y]),false); out.push(`<path d="${d}" ${seaStroke(map.blStyle==='dot'?SEA_ST.blDot:SEA_ST.bl)}/>`); }
  if(sp.ts.length){ let d=''; for(const l of sp.ts) d+=ringPath(L,l,false); out.push(`<path d="${d}" ${seaStroke(SEA_ST.ts)}/>`); }
  if(map.bp){ const r=bpR(L); for(const p of S.pts){ const [x,y]=P(L,p.x,p.y,false); out.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="#fff" stroke="#000" stroke-width="0.12"/>`); } }
  return out; }
/* 기호를 놓을 때 피할 영해 선(쪽 좌표 선분) */
function seaSegs(L,map){ const sp=seaParts(map,L.ul); if(!sp) return []; const segs=[]; const S=D.sea; const pt={}; for(const p of S.pts) pt[p.i]=p;
  const add=(line,ul)=>{ let a=null; for(const q of line){ const b=P(L,q[0],q[1],ul); if(a) segs.push([a,b]); a=b; } };
  if(map.bl) for(const c of S.chains) add(c.map(i=>[pt[i].x,pt[i].y]),false);
  for(const l of sp.ts) add(l,false);
  return segs; }
/* 범례 항목: 고속 국도 + 영해 */
function legendEntries(map){ const E=[];
  if(map.roadLegend!==false) for(const r of (map.roads||[])) if(D.roads&&D.roads[r]) E.push({k:'road',r,label:roadLabel(r)});
  if(map.seaLegend!==false&&seaOn(map)) for(const k of ['bp','bl','nb','ts']) if(map[k]) E.push({k,label:SEA_KO[k]});
  return E; }
/* 도로가 이 지도에서 보이는 부분의 가운데(쪽 좌표) */
function roadPoint(L,map,r){ const R=D&&D.roads&&D.roads[r]; if(!R) return null; const vis=[];
  for(let i=0;i<R.line.length;i++){ const [x,y]=toPage(L,R.line[i][0],R.line[i][1]); if(x<0||y<0||x>(L.mw||L.w)||y>L.h) continue; if(featuresAt(L,x,y).length) vis.push([x,y]); }
  if(!vis.length) return null; return vis[Math.floor(vis.length/2)]; }
/* 범례: 땅을 가리지 않는 모서리(없으면 지도 아래)에 테두리 상자 + 선 견본 + 이름 */
function legendItems(L,map,below0){ const ents=legendEntries(map); if(!ents.length) return [];
  const fs=7.5, mm=fs*0.3528, sw=5.5, gap=1.0, lh=mm*1.55, pad=0.9;
  const tw=Math.max(...ents.map(e=>e.label.replace(/ /g,'').length*mm*0.98+e.label.split(' ').length*mm*0.3));
  const W=pad*2+sw+gap+tw, Hh=pad*2+lh*ents.length-(lh-mm);
  const mw=L.mw||L.w; const occ=[]; if(L.ubox) occ.push(boxOf(L,L.ubox)); if(L.dbox) occ.push(boxOf(L,L.dbox)); if(L.loc) occ.push(L.loc);
  /* 축척 막대 자리도 피한다 */
  if(map.scale){ const sb=scaleBarItems(L,map.scalePos); let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const it of sb){ const xs=it.t==='line'?[it.x1,it.x2]:[it.x-1,it.x+3], ys=it.t==='line'?[it.y1,it.y2]:[it.y,it.y+3]; x0=Math.min(x0,...xs); x1=Math.max(x1,...xs); y0=Math.min(y0,...ys); y1=Math.max(y1,...ys); } if(y0<L.h) occ.push({x:x0-0.5,y:y0-0.5,w:x1-x0+1,h:y1-y0+1}); }
  const C={tl:{x:M,y:M},tr:{x:mw-M-W,y:M},bl:{x:M,y:L.h-M-Hh},br:{x:mw-M-W,y:L.h-M-Hh}};
  let best=null; for(const [k,c] of Object.entries(C)){ const r={x:c.x-0.5,y:c.y-0.5,w:W+1,h:Hh+1}; const sc=landFrac(L,r,10,6)+(occ.some(o=>ovl(o,r))?2:0)+(segsHit(L,r)?1:0)+(k[1]==='r'?0.02:0); if(!best||sc<best.sc) best={sc,k,x:c.x,y:c.y}; }
  if(best.sc>0.03) best={k:'below',x:M,y:(below0||L.h)+0.6};
  const out=[{t:'rect',x:best.x,y:best.y,w:W,h:Hh,fill:'white',stroke:'solid',lw:0.12,km:'legend'}];
  ents.forEach((e,i)=>{ const cy=best.y+pad+mm/2+i*lh, x0=best.x+pad;
    if(e.k==='road'){ const st=roadStyleOf(map,e.r);
      if(st==='double') out.push({t:'rect',x:x0,y:cy-0.31,w:sw,h:0.62,fill:'white',stroke:'solid',lw:0.14,km:'legend'});
      else if(st==='dash'){ const d=(sw-0.8)/2; out.push({t:'line',x1:x0,y1:cy,x2:x0+d,y2:cy,lw:ROAD_ST.dash[0][0],dash:'solid',km:'legend'},{t:'line',x1:x0+d+0.8,y1:cy,x2:x0+sw,y2:cy,lw:ROAD_ST.dash[0][0],dash:'solid',km:'legend'}); }
      else out.push({t:'line',x1:x0,y1:cy,x2:x0+sw,y2:cy,lw:ROAD_ST[st][0][0],dash:'solid',km:'legend'}); }
    else if(e.k==='bp'){ const r=bpR(L); out.push({t:'ell',cx:x0+sw/2,cy,rx:r,ry:r,dash:'solid',lw:0.12,fill:'white',km:'legend'}); }
    else if(e.k==='bl'&&map.blStyle==='dot'){ for(let x=x0+0.15;x<=x0+sw;x+=0.5) out.push({t:'dot',x,y:cy,r:0.13,km:'legend'}); }
    else if(e.k==='ts') out.push({t:'line',x1:x0,y1:cy,x2:x0+sw,y2:cy,lw:SEA_ST.ts.w,dash:'fine',km:'legend'});
    else out.push({t:'line',x1:x0,y1:cy,x2:x0+sw,y2:cy,lw:SEA_ST[e.k].w,dash:'solid',km:'legend'});
    out.push({t:'text',x:x0+sw+gap,y:cy-mm*0.62,text:e.label,size:fs,fam:'serif',align:'left',box:'none',km:'legend'}); });
  return out; }
function dokdoMark(x,y){ return `<g fill="#fff" stroke="#000" stroke-width="0.07"><ellipse cx="${f2(x-0.17)}" cy="${f2(y)}" rx="0.15" ry="0.13"/><ellipse cx="${f2(x+0.15)}" cy="${f2(y+0.03)}" rx="0.13" ry="0.11"/></g>`; }
/* 서울 한강 띠: 강북 자치구와 강남 자치구가 맞닿은 경계(한강 가운데)와 그 위아래 이웃 시(고양·김포·구리·남양주·하남) 사이 경계 */
const HAN_S=['강서구','양천구','구로구','영등포구','동작구','관악구','금천구','서초구','강남구','송파구','강동구'];
const HAN_PAIRS=[['11:S','11:N'],['11:강서구','41:고양시'],['41:김포시','41:고양시'],['11:강동구','41:구리시'],['11:강동구','41:남양주시'],['41:하남시','41:남양주시'],['41:하남시','41:구리시']];
function hanOn(map){ return map.han!==false&&map.area==='sido'&&(map.sido||[]).includes('11')&&map.sido.length<=2; }
function hanPath(L,map,t,obj){
  if(!hanOn(map)) return null;
  const tag=p=>p.s==='11'?(HAN_S.includes(p.n)?'11:S':'11:N'):p.s+':'+p.n, nm=p=>p.s+':'+p.n;
  const ok=(a,b)=>HAN_PAIRS.some(([x,y])=>{ const A=[tag(a.p),nm(a.p)], B=[tag(b.p),nm(b.p)]; return (A.includes(x)&&B.includes(y))||(A.includes(y)&&B.includes(x)); });
  const m=topojson.mesh(t,obj,(a,b)=>a!==b&&ok(a,b)); if(!m||!m.coordinates.length) return null;
  const w=Math.max(0.7,Math.min(1.6,900*L.k));     /* 서울 구간 한강 폭 약 0.9 km */
  return {d:geomPath(L,m,false),w};
}
function render(map){
  map=normalizeMap(map); const L=layout(map); if(!L) return null;
  const {g,inc}=L; const t=g.t, obj=g.obj; const sggLevel=map.level==='sgg';
  const isNK=p=>p.s==='NK'; const incUl=p=>isUl(p)&&L.ul==='box';
  const out=[]; let W=L.w, H=L.h; L.mw=L.w;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W)} ${f2(H)}">`);
  out.push(`<defs><pattern id="kmHatch" patternUnits="userSpaceOnUse" width="0.9" height="0.9" patternTransform="rotate(45)"><rect width="0.9" height="0.9" fill="#fff"/><line x1="0" y1="0" x2="0" y2="0.9" stroke="#000" stroke-width="0.22"/></pattern>`+
    `<pattern id="kmDots" patternUnits="userSpaceOnUse" width="0.9" height="0.9"><rect width="0.9" height="0.9" fill="#fff"/><circle cx="0.45" cy="0.45" r="0.17" fill="#000"/></pattern></defs>`);
  /* 흰 바탕(땅) */
  const land=L.feats.map(f=>geomPath(L,f.geometry,incUl(f.p))).join('');
  out.push(`<path d="${land}" fill="#fff" stroke="none"/>`);
  /* 북한 지도에서 보이는 남한 땅(윤곽만): 쪽 밖으로 넘치지 않게 자른다 */
  const skPart=L.skOn?g.fc.filter(f=>f.p.s!=='NK'&&!isUl(f.p)&&f.fb[3]>=L.b[1]&&f.fb[0]<=L.b[2]):[];
  const skSet=new Set(skPart.map(f=>f.p.c));
  if(skPart.length){ const sd=skPart.map(f=>geomPath(L,f.geometry,false)).join('');
    out.push(`<clipPath id="kmSkClip"><rect x="0" y="0" width="${f2(W)}" height="${f2(H)}"/></clipPath>`,`<path d="${sd}" fill="#fff" stroke="none" clip-path="url(#kmSkClip)"/>`); }
  /* 색칠: 시군구 단위(코드) · 시도 단위(s:코드) */
  const sh=map.shade||{};
  for(const [code,tone] of Object.entries(sh)){ const T=TONES[tone]; if(!T) continue; let d='';
    if(code.startsWith('s:')){ const sc=code.slice(2); const gs=obj.geometries.filter(o=>o.p.s===sc&&inc(o.p)&&!isUl(o.p)); if(gs.length) d+=geomPath(L,topojson.merge(t,gs),false);
      const ug=obj.geometries.filter(o=>o.p.s===sc&&inc(o.p)&&isUl(o.p)); if(ug.length) d+=geomPath(L,topojson.merge(t,ug),L.ul==='box'); }
    else if(code==='g:12'){ const gs=obj.geometries.filter(o=>o.p.s==='12'&&/구$/.test(o.p.n||'')&&inc(o.p)); if(gs.length) d+=geomPath(L,topojson.merge(t,gs),false); }
    else if(NK_LIB[code]&&libOn(map)){ const gk=NK_LIB[code]; for(const f of L.feats) if(f.p.s==='NK'&&NK_LIB[f.p.c]===gk) d+=geomPath(L,f.geometry,false); }
    else { const f=L.feats.find(f=>f.p.c===code); if(f) d+=geomPath(L,f.geometry,incUl(f.p)); }
    if(d) out.push(`<path d="${d}" fill="${T.fill}" stroke="none" fill-rule="evenodd"/>`); }
  /* 하천(그릴 땅 안으로만) */
  if((map.rivers||[]).length&&D.rivers){ let rd='';
    for(const r of map.rivers){ if(r==='한강'&&hanOn(map)) continue; for(const ln of (D.rivers[r]||[])) rd+=ringPath(L,ln,false); }
    if(rd){ out.push(`<clipPath id="kmLand"><path d="${land}"/></clipPath>`); out.push(`<path d="${rd}" fill="none" stroke="#000" stroke-width="${LW.river}" stroke-linejoin="round" stroke-linecap="round" clip-path="url(#kmLand)"/>`); } }
  /* 고속 국도(모식적인 선): 그릴 땅 안으로만, 굵은 실선·굵은 파선·두 줄·가는 실선 */
  const roadSvg=[];
  if((map.roads||[]).length&&D.roads){ const cid='kmLandR'; roadSvg.push(`<clipPath id="${cid}"><path d="${land}"/></clipPath>`);
    for(const r of map.roads){ const R=D.roads[r]; if(!R) continue; const d=ringPath(L,R.line,false); const st=roadStyleOf(map,r);
      const S=ROAD_ST[st]||ROAD_ST.bold;
      for(const [w,col,da] of S) roadSvg.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="butt"${da?` stroke-dasharray="${da}"`:''} clip-path="url(#${cid})"/>`); } }
  /* 선: 시·군·구 경계(점선), 북한 도 경계·시·도 경계(일점쇄선), 휴전선(파선), 해안선·국경(실선) */
  const mesh=(fn,ul)=>geomPath(L,topojson.mesh(t,obj,fn),ul);
  const SK=p=>p.s!=='NK'; const both=(a,b)=>a!==b&&inc(a.p)&&inc(b.p);
  const line=(k,d)=>{ if(d) out.push(`<path d="${d}" ${strokeOf(k)}/>`); };
  if(sggLevel){ const uk=p=>unitKey(map,p); line('sgg',mesh((a,b)=>both(a,b)&&a.p.s===b.p.s&&SK(a.p)&&!isUl(a.p)&&!isUl(b.p)&&!(uk(a.p)&&uk(a.p)===uk(b.p)))); }
  /* 서울 한강: 강북·강남 자치구 사이 경계(한강 가운데)를 두 줄 띠로 */
  const han=hanPath(L,map,t,obj);
  if(map.nkdo!==false) line('nk',mesh((a,b)=>both(a,b)&&isNK(a.p)&&isNK(b.p)&&nkGroup(map,a.p)!==nkGroup(map,b.p)));
  /* 시·도 경계: 그리는 시·도끼리, 그리고 그리는 땅과 그리지 않는 남한 땅 사이(바깥 육지 경계) */
  line('sido',mesh((a,b)=>a!==b&&SK(a.p)&&SK(b.p)&&(inc(a.p)||inc(b.p))&&!isUl(a.p)&&!isUl(b.p)&&(a.p.s!==b.p.s||inc(a.p)!==inc(b.p))));
  line('dmz',mesh((a,b)=>a!==b&&SK(a.p)!==SK(b.p)&&(inc(a.p)||inc(b.p))));
  if(han){ const bw=han.w; out.push(`<path d="${han.d}" fill="none" stroke="#000" stroke-width="${f2(bw+2*LS.coast.w)}" stroke-linejoin="round" stroke-linecap="butt"/>`,
    `<path d="${han.d}" fill="none" stroke="#fff" stroke-width="${f2(bw)}" stroke-linejoin="round" stroke-linecap="butt"/>`); }
  line('coast',mesh((a,b)=>a===b&&inc(a.p)&&!incUl(a.p)));
  if(skPart.length){ const cd=mesh((a,b)=>a===b&&skSet.has(a.p.c)); if(cd) out.push(`<path d="${cd}" ${strokeOf('coast')} clip-path="url(#kmSkClip)"/>`); }
  out.push(...roadSvg);
  out.push(...seaSvg(L,map)); L.segs=seaSegs(L,map);   /* 축척·범례가 영해 선을 가리지 않게 */
  /* 울릉도·독도 상자 */
  if(L.ubox){ const uf=L.feats.find(f=>isUl(f.p)); const bx=boxOf(L,L.ubox);
    out.push(`<rect x="${f2(bx.x)}" y="${f2(bx.y)}" width="${f2(bx.w)}" height="${f2(bx.h)}" ${strokeOf('box')}/>`);
    out.push(`<path d="${geomPath(L,uf.geometry,true)}" ${strokeOf('coast')}/>`);
    /* 독도: 실제로는 0.2 km²가 안 되어 시험지처럼 동도·서도 두 섬을 작게 키워 그린다 */
    if(L.dbox){ const db=boxOf(L,L.dbox); out.push(`<rect x="${f2(db.x)}" y="${f2(db.y)}" width="${f2(db.w)}" height="${f2(db.h)}" ${strokeOf('box')}/>`);
      const [x,y]=toPage(L,L.dbox.px,L.dbox.py); out.push(dokdoMark(x,y)); } }
  else if(map.dokdo&&L.ul==='true'){ const dk=(D.places||[]).find(p=>p.n==='독도'); if(dk){ const [x,y]=toPage(L,dk.x,dk.y); out.push(dokdoMark(x,y)); } }
  /* 위치도: 땅이 가장 적은 모서리에 */
  if(map.inset&&!['sk','kor'].includes(map.area)){ const lw=Math.min(18,Math.max(12,W*0.2)); const loc=locatorSVG(map,lw);
    const occ=L.ubox?[boxOf(L,L.ubox)]:[]; if(L.dbox) occ.push(boxOf(L,L.dbox)); let c=bestCorner(L,loc.w,loc.h,map.insetPos,occ);
    /* 어느 모서리든 땅을 가리면 지도 오른쪽 바깥에 붙이고 쪽을 넓힌다 */
    if(c.s>0.03){ c={x:W+0.6,y:0.6}; W=W+loc.w+1.2; H=Math.max(H,loc.h+1.2); L.w=W; L.h=H; }
    L.loc={x:c.x,y:c.y,w:loc.w,h:loc.h};
    out.push(loc.svg.replace(/^<svg /,`<svg x="${f2(c.x)}" y="${f2(c.y)}" `).replace(/ width="[\d.]+mm" height="[\d.]+mm"/,` width="${f2(loc.w)}" height="${f2(loc.h)}"`)); }
  if(map.frame) out.push(`<rect x="0.1" y="0.1" width="${f2(W-0.2)}" height="${f2(H-0.2)}" fill="none" stroke="#000" stroke-width="0.15"/>`);
  out.push('</svg>'); out[0]=`<svg xmlns="http://www.w3.org/2000/svg" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W)} ${f2(H)}">`;
  return {svg:out.join(''),w:W,h:H,L};
}
function boxOf(L,u){ const [x0,y1]=P(L,u.x,u.y), [x1,y0]=P(L,u.x+u.w,u.y+u.h); return {x:x0,y:y0,w:x1-x0,h:y1-y0}; }
/* 사각형(쪽 mm)이 땅을 얼마나 덮는지(0~1) */
function landFrac(L,r,nx,ny){ nx=nx||6; ny=ny||6; let n=0,c=0; for(let i=0;i<nx;i++) for(let j=0;j<ny;j++){ const px=r.x+r.w*(i+0.5)/nx, py=r.y+r.h*(j+0.5)/ny; n++; if(featuresAt(L,px,py).length) c++; } return c/n; }
function ovl(a,b){ return a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h; }
/* 사각형을 영해 선(직선 기선·영해선)이 지나는가 */
function segsHit(L,r){ for(const [a,c] of (L.segs||[])){ if(Math.max(a[0],c[0])<r.x||Math.min(a[0],c[0])>r.x+r.w||Math.max(a[1],c[1])<r.y||Math.min(a[1],c[1])>r.y+r.h) continue;
    for(let i=0;i<=10;i++){ const x=a[0]+(c[0]-a[0])*i/10, y=a[1]+(c[1]-a[1])*i/10; if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h) return true; } } return false; }
function bestCorner(L,w,h,pref,occ){ const m=0.6; const C={tl:{x:m,y:m},tr:{x:L.w-w-m,y:m},bl:{x:m,y:L.h-h-m},br:{x:L.w-w-m,y:L.h-h-m}};
  if(pref&&C[pref]) return Object.assign({k:pref},C[pref]);
  let best=null; for(const [k,c] of Object.entries(C)){ const r={x:c.x,y:c.y,w,h}; const s=landFrac(L,r)+((occ||[]).some(o=>ovl(o,r))?2:0); if(!best||s<best.s) best={k,s,x:c.x,y:c.y}; } return best; }
/* 축척 막대(LG 항목으로: 선 + 글자) */
function scaleBarItems(L,pos){
  /* 시험지 양식: 굵은 막대 양 끝에 가는 눈금, 그 위에 ‘0’과 ‘25 km’(명조). 땅을 가리지 않는 모서리에, 없으면 지도 아래에 */
  const mw=L.mw||L.w; const kmW=(mw-2*M)/L.k/1000; const km=niceKm(kmW*0.24); const len=km*1000*L.k; const tk=0.75, fs=7.5;
  const th=fs*0.3528; const kmw=(String(km).length*0.25+0.28+1.0)*fs*0.3528;   /* 글자 높이, 오른쪽 ‘km’ 너비(mm) 어림 */
  const H=th*1.25+0.25+tk+0.6;      /* 축척 전체 높이 */
  const spot=k=>{ const left=k[1]==='l', top=k[0]==='t'; const x=left?M+0.6:mw-M-len-kmw; const y=top?M+0.2:L.h-M-H+0.2; return {x,y}; };
  if(!pos||pos==='auto'){ const occ=[]; if(L.ubox) occ.push(boxOf(L,L.ubox)); if(L.dbox) occ.push(boxOf(L,L.dbox)); if(L.loc) occ.push(L.loc);
    const fb=k=>{ const s=spot(k); const r={x:s.x-2.0,y:s.y-1.5,w:len+kmw+3.4,h:H+2.6}; return landFrac(L,r,12,6)+(occ.some(o=>ovl(o,r))?2:0)+(segsHit(L,r)?1:0)+(k[0]==='t'?0.01:0); };
    const best=['bl','br','tl','tr'].map(k=>[k,fb(k)]).sort((a,b)=>a[1]-b[1])[0];
    pos=best[1]>0.03?'below':best[0]; }
  const sp=pos==='below'?{x:M+0.6,y:L.h+0.4}:spot(pos);
  const y=sp.y+H-0.4, x0=sp.x+0.2, ty=y-tk-0.25-th*1.25;
  return [{t:'line',x1:x0,y1:y,x2:x0+len,y2:y,lw:0.26,dash:'solid',km:'scale'},{t:'line',x1:x0,y1:y,x2:x0,y2:y-tk,lw:0.11,dash:'solid',km:'scale'},{t:'line',x1:x0+len,y1:y,x2:x0+len,y2:y-tk,lw:0.11,dash:'solid',km:'scale'},
    {t:'text',x:x0,y:ty,text:'0',size:fs,fam:'serif',align:'center',box:'none',km:'scale'},{t:'text',x:x0+len,y:ty,text:String(km),size:fs,fam:'serif',align:'center',box:'none',km:'scale'},
    {t:'text',x:x0+len+String(km).length*0.25*fs*0.3528+0.28*fs*0.3528,y:ty,text:'km',size:fs,fam:'serif',align:'left',box:'none',km:'scale'}];
}
/* 위치도: 남한 윤곽에 이 지역을 칠한 작은 그림(SVG 문자열, 너비 wmm) */
function locatorSVG(map,wmm){
  const g=G({ver:map.ver},'lo'); const inc=incFn(map); const sk=g.fc.filter(f=>f.p.s!=='NK'&&!isUl(f.p));
  let b=[1e12,1e12,-1e12,-1e12]; for(const f of sk) b=[Math.min(b[0],f.b[0]),Math.min(b[1],f.b[1]),Math.max(b[2],f.b[2]),Math.max(b[3],f.b[3])];
  const m=0.8, k=(wmm-2*m)/(b[2]-b[0]), h=(b[3]-b[1])*k+2*m;
  const Pp=(x,y)=>[m+(x-b[0])*k,m+(b[3]-y)*k];
  /* 작은 그림이므로 바깥 윤곽(합친 것)과 시·도 경계만, 아주 작은 섬은 뺀다 */
  const ringD=(r,close)=>{ let s=''; r.forEach((p,i)=>{ const [x,y]=Pp(p[0],p[1]); s+=(i?'L':'M')+f2(x)+' '+f2(y); }); return s+(close?'Z':''); };
  const areaMM=r=>{ let a=0; for(let i=0,j=r.length-1;i<r.length;j=i++) a+=(r[j][0]+r[i][0])*(r[j][1]-r[i][1]); return Math.abs(a/2)*k*k; };
  const poly=geom=>{ if(!geom) return ''; const P_=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[]; let s='';
    for(const pp of P_){ if(areaMM(pp[0])<0.06) continue; pp.forEach(r=>s+=ringD(r,true)); } return s; };
  const sg=g.obj.geometries.filter(o=>o.p.s!=='NK'&&!isUl(o.p));
  const land=poly(topojson.merge(g.t,sg)), hit=poly(topojson.merge(g.t,sg.filter(o=>inc(o.p))));
  const ml=topojson.mesh(g.t,{type:'GeometryCollection',geometries:sg},(a,c)=>a!==c&&a.p.s!==c.p.s);
  let lines=''; if(ml&&ml.coordinates) ml.coordinates.forEach(l=>lines+=ringD(l,false));
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${f2(wmm)}mm" height="${f2(h)}mm" viewBox="0 0 ${f2(wmm)} ${f2(h)}"><rect x="0.1" y="0.1" width="${f2(wmm-0.2)}" height="${f2(h-0.2)}" fill="#fff" stroke="#000" stroke-width="0.15"/><path d="${hit}" fill="#888" stroke="none"/><path d="${lines}" fill="none" stroke="#000" stroke-width="0.05"/><path d="${land}" fill="none" stroke="#000" stroke-width="0.09"/></svg>`,w:wmm,h};
}

/* ───────── 지명 찾기 ───────── */
function featuresAt(L,px,py){
  const [x,y]=inv(L,px,py); const hits=[];
  for(const f of L.feats){ let xx=x, yy=y; if(isUl(f.p)&&L.ul==='box'){ xx=x-L.ubox.dx; yy=y-L.ubox.dy; }
    if(xx<f.b[0]||xx>f.b[2]||yy<f.b[1]||yy>f.b[3]) continue; if(inGeom(f.geometry,xx,yy)) hits.push(f); }
  return hits;
}
function inRing(r,x,y){ let c=false; for(let i=0,j=r.length-1;i<r.length;j=i++){ const [xi,yi]=r[i],[xj,yj]=r[j]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) c=!c; } return c; }
function inGeom(g,x,y){ const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates; for(const P_ of polys){ if(inRing(P_[0],x,y)&&!P_.slice(1).some(h=>inRing(h,x,y))) return true; } return false; }
const KIND_RANK={sgg:0,sido:1,grp:1,island:2,bp:2.5,mountain:3,nkcity:4,nkdo:5,emd:6};
const METRO=new Set(['11','26','27','28','29','30','31']);
/* 이름 → 지명 후보(지금 지도 범위 안을 먼저) */
function lookupEx(map,name,ctxSido,ctxCode){
  const n=norm(name); if(!n) return null; const inc=incFn(map); const all=places(map);
  const c=all.filter(p=>norm(p.n)===n||(p.al||[]).some(a=>norm(a)===n));
  if(!c.length) return null;
  const inside=p=>p.k==='bp'?true:p.k==='sido'?inc({s:p.c}):p.s==='NK'?inc({s:'NK'}):inc({s:p.s});
  /* ‘광주’처럼 광역시와 다른 시·군 이름이 겹치면 광역시를, 시·도 지도에서는 시·도를 먼저 */
  const pri=p=>p.k==='grp'||(p.k==='sido'&&METRO.has(p.c))?-1:map.level==='sido'&&p.k==='sido'?-0.5:(p.k==='bp'&&map.bp)?-2:KIND_RANK[p.k];   /* 기점을 그리면 ‘거문도’는 기점 자리로 */
  const cmp=(a,b)=>((inside(b)?1:0)-(inside(a)?1:0))||((ctxCode&&b.c===ctxCode?1:0)-(ctxCode&&a.c===ctxCode?1:0))||((ctxSido&&(b.s===ctxSido||b.k==='bp')?1:0)-(ctxSido&&(a.s===ctxSido||a.k==='bp')?1:0))||((norm(b.n)===n?1:0)-(norm(a.n)===n?1:0))||(pri(a)-pri(b));
  c.sort(cmp);
  const ties=c.filter(x=>cmp(c[0],x)===0);
  return {p:c[0],amb:ties.length>1,ties,alts:c.slice(1)};
}
function lookup(map,name,ctxSido){ const r=lookupEx(map,name,ctxSido); return r?r.p:null; }
function allNames(map){ const s=new Set(); for(const p of places(map)){ s.add(p.n); (p.al||[]).forEach(a=>{ if(a.length>=2) s.add(a); }); } return [...s].sort((a,b)=>b.length-a.length); }

/* ───────── 문장 읽기 ───────── */
const SEQ_RE=String.raw`\([가-하]\)|[A-Z]|[㉠-㉭]|[a-j](?![a-z])|\d{1,3}(?![\d년])`;
function parse(q,cur){
  const text=' '+String(q||'').replace(/\s+/g,' ').trim()+' '; const map=normalizeMap(cur?JSON.parse(JSON.stringify(cur)):null);
  const out={map,labels:[],shade:[],missing:[],set:null,shuffle:false,mode:null,areaSet:false,notes:[]};
  /* 경계 기준 */
  if(/7\s*월\s*기준|통합특별시|전남광주/.test(text)){ map.ver='b'; map.verPick=true; } else if(/4\s*월\s*기준|통합\s*(이)?전|광주광역시\s*(경계|시절|기준)/.test(text)){ map.ver='a'; map.verPick=true; }
  /* 범위 */
  const used=new Array(text.length).fill(false); const mark=(i,l)=>{ for(let k=i;k<i+l;k++) used[k]=true; };
  let area=null, sidos=[];
  /* 고속 국도: ‘경부 고속 국도’, ‘경부·영동 고속도로’, ‘영동고속도로 (가)’ — ‘영동(군)·호남(권)·남해(군)’ 같은 이름과 헷갈리지 않게 먼저 지운다 */
  const roadHits=[];
  if(D.roads){ const names=[]; for(const [k,R] of Object.entries(D.roads)){ names.push([k,k]); for(const a of R.al||[]) names.push([a.replace(/\s*고속\s*(?:도로|국도)$/,''),k]); }
    const uniq=[...new Map(names.map(n=>[n[0],n])).values()].sort((a,b)=>b[0].length-a[0].length);
    const alt=uniq.map(n=>n[0].replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s*')).join('|');
    const re=new RegExp(String.raw`((?:${alt})(?:\s*(?:,|·|와|과|및)\s*(?:${alt}))*)\s*고속\s*(?:도로|국도)`,'g'); let m;
    while((m=re.exec(text))){ mark(m.index,m[0].length); const seg=m[1]; const nm=new RegExp(alt,'g'); let k; const end=m.index+m[0].length;
      const rest=text.slice(end); const sm=rest.match(new RegExp(String.raw`^\s*(?:은|는|을|를|이|가|=|:)?\s*\(?\s*(${SEQ_RE})\s*\)?\s*(?:로|으로)?(?=[\s,.·만]|$)`));
      const tail=rest.split(/[,.;]/)[0];
      const style=/점선|파선/.test(tail)?'dash':/두\s*줄|이중|겹선/.test(tail)?'double':/가는/.test(tail)?'thin':/굵은|실선/.test(tail)?'bold':null;
      const ks=[]; while((k=nm.exec(seg))){ const hit=uniq.find(n=>n[0].replace(/ /g,'')===k[0].replace(/\s/g,'')); if(hit&&!ks.includes(hit[1])) ks.push(hit[1]); }
      ks.forEach((r,j)=>roadHits.push({r,sym:sm&&ks.length===1?(sm[1].length===1&&/[가-하]/.test(sm[1])?`(${sm[1]})`:sm[1]):null,style}));
      if(sm&&ks.length===1) mark(end,sm[0].length); } }
  { const re=/남한\s*(?:은|도|을|를)?\s*(?:빼|없이|지우|제외|함께|같이|넣|표시|포함)/g; let m; while((m=re.exec(text))) mark(m.index,m[0].length); }
  for(const R of REGIONS) for(const w of R.w){ let from=0; for(;;){ const i=text.indexOf(w,from); if(i<0) break; from=i+1; if(!used[i]){ area=area||R.id; mark(i,w.length); break; } } }
  /* ‘X 지도’, ‘X 시군’, ‘X 시군 경계’처럼 범위를 말하는 시도 이름(문장 앞쪽, 기호가 붙지 않은 것) */
  const sidoHit=[]; const SW=Object.values(SIDO_WORDS).flat().sort((a,b)=>b.length-a.length).join('|');
  const KEYW=String.raw`(?:지역|지방|권|의|전체|일대|시\s*·?\s*군|시군|구\s*·?\s*군|군\s*·?\s*구|지도|백지도|경계|자치구|구\s*경계|에|를|을|만)`;
  const chainRe=new RegExp(String.raw`^(?:특별자치도|특별자치시|광역시|특별시|도)?(?:\s*(?:,|·|와|과|및)\s*(?:${SW})(?:특별자치도|광역시|특별시|도)?)*\s*`+KEYW);
  for(const [c,ws] of Object.entries(SIDO_WORDS)) for(const w of ws.slice().sort((a,b)=>b.length-a.length)){
    let from=0; for(;;){ const i=text.indexOf(w,from); if(i<0) break; from=i+1; if(used[i]) continue; const pre=text[i-1], post=text.slice(i+w.length);
      if(/[가-힣]/.test(pre)) continue;
      const nextSido=new RegExp(String.raw`^\s*[,·]\s*(?:${SW})`).test(post);
      if(area) break;
      { const tl=post.slice(0,40).split(/[.;]/)[0]; const si=tl.search(/색칠|음영|칠해|칠하|빗금|점무늬|진하게|연하게/); if(si>=0&&!/지도|시\s*·?\s*군|경계|자치구/.test(tl.slice(0,si))) break; }
      if(chainRe.test(post)||(!nextSido&&/^(?:특별자치도|광역시|특별시)?\s*[,·]?\s*$/.test(post.slice(0,2)))) { sidoHit.push([i,c,w]); mark(i,w.length); break; }
    } }
  if(sidoHit.length){ sidos=[...new Set(sidoHit.sort((a,b)=>a[0]-b[0]).map(h=>h[1]))]; if(!area) area='sido'; }
  if(area){ map.area=area; map.sido=area==='sido'?sidos:[]; out.areaSet=true; map.inset=false; map.rivers=[]; map.metro='auto'; map.skShow=true; }
  /* 경계 수준 */
  if(/시\s*·?\s*군\s*·?\s*구|시\s*·?\s*군|시군|구\s*·?\s*군|자치구|구\s*경계|군\s*경계/.test(text)) map.level='sgg';
  else if(/시\s*·?\s*도\s*(?:경계|단위|별)?|광역\s*자치\s*단체/.test(text)) map.level='sido';
  else if(out.areaSet) map.level=(map.area==='sk'||map.area==='kor'||map.area==='nk')?'sido':'sgg';
  if(map.area==='kor'||map.area==='nk') map.nkdo=!/북한\s*도\s*경계\s*(?:없이|빼)/.test(text);
  if(map.area==='kor'||map.area==='nk'){ if(/해방\s*(?:기준|당시|직후|전후)|광복\s*(?:기준|당시)|1945|옛\s*(?:행정\s*구역|도\s*경계)/.test(text)) map.nkEra='lib'; else if(/현재\s*(?:행정\s*구역|도\s*경계|기준)|지금\s*(?:행정\s*구역|도\s*경계)|최근\s*행정\s*구역/.test(text)) map.nkEra='now'; }
  if(map.area==='nk'){ if(/남한\s*(?:은|도|을|를)?\s*(?:빼|없이|지우|제외)/.test(text)) map.skShow=false; else if(/남한\s*(?:도|을|를)?\s*(?:함께|같이|넣|표시|포함)/.test(text)) map.skShow=true; }
  /* 보기 */
  if(/독도/.test(text)) map.dokdo=!/독도\s*(?:는|은|를|을)?\s*(?:빼|없이|지우)/.test(text);
  if(/테두리|틀\s*(?:을|를)?\s*(?:넣|두르|그려)/.test(text)) map.frame=!/테두리\s*(?:는|를|을)?\s*(?:빼|없이|지우)/.test(text);
  if(/구\s*(?:를|을)?\s*(?:합쳐|합치|하나로|한\s*덩어리)|광역시\s*(?:는|를|을)?\s*(?:하나로|한\s*덩어리|합쳐)/.test(text)) map.metro='merge';
  else if(/구\s*(?:를|을)?\s*(?:나눠|나누|따로|구분)|구\s*경계\s*(?:까지|도|를|을)?\s*(?:넣|그려|표시)|자치구까지/.test(text)) map.metro='split';
  if(/한강/.test(text)) map.han=!/한강\s*(?:은|는|을|를)?\s*(?:빼|없이|지우)/.test(text);
  if(/울릉도?\s*(?:와|과|·)?\s*독도?\s*(?:를|을)?\s*(?:빼|없이|지우)/.test(text)) { map.ulleung='off'; map.dokdo=false; }
  else if(/울릉도?.{0,6}제자리/.test(text)) map.ulleung='true';
  if(/위치도|위치\s*지도|작은\s*지도/.test(text)) map.inset=true;
  if(/축척\s*(?:없이|빼)/.test(text)) map.scale=false; else if(/축척/.test(text)) map.scale=true;
  for(const r of ['한강','낙동강','압록강','두만강']) if(text.includes(r)) map.rivers=[...new Set([...(map.rivers||[]),r])];
  if(/하천|강\s*(?:을|를)?\s*(?:모두|전부)?\s*(?:그려|표시|넣)/.test(text)&&!(map.rivers||[]).length) map.rivers=['한강','낙동강','압록강','두만강'];
  /* 표시 방법 */
  if(/점\s*(?:으로|과|와|을|를|찍|표시)|점만/.test(text)) out.mode='dot'; else if(/지시선/.test(text)) out.mode='leader'; else if(/(?:지역|구역)\s*안|안쪽|가운데/.test(text)) out.mode='in';
  if(/섞|무작위|랜덤/.test(text)) out.shuffle=true;
  /* 순서 지정 */
  const rng=text.match(/(\([가-하]\)|[A-Z]|[㉠-㉭])\s*[~∼～\-–]\s*(\([가-하]\)|[A-Z]|[㉠-㉭])/);
  if(rng){ const a=rng[1]; out.set=/^\(/.test(a)?'gana':/[㉠-㉭]/.test(a)?'circ':'latin'; }
  else if(/\([가-하]\)/.test(text)) out.set='gana'; else if(/[㉠-㉭]/.test(text)) out.set='circ';
  /* 영해: 문장 하나 = 새 지도(고속 국도처럼 문장에 적은 것만). ‘영해면’(영덕)은 지명 */
  { const t=text.replace(/통상\s*기선/g,'§'), off=w=>new RegExp(w+String.raw`\s*(?:은|는|을|를)?\s*(?:빼|없이|지우)`).test(text);
    map.nb=/통상\s*기선/.test(text)&&!off(String.raw`통상\s*기선`);
    map.bl=/기선/.test(t)&&!off(String.raw`(?:직선\s*)?기선`);
    map.bp=/기점/.test(text)&&!off('기점');
    map.ts=(/영해(?!면|\s*기점)/.test(text)||/\d+\s*해리/.test(text))&&!off(String.raw`영해\s*선?`);
    map.blStyle=/기선.{0,8}(?:점선|점으로)|점선.{0,4}기선/.test(text)?'dot':'solid';
    if(/범례\s*(?:는|를|을)?\s*(?:빼|없이|지우)/.test(text)){ map.seaLegend=false; map.roadLegend=false; } else if(/범례/.test(text)){ map.seaLegend=true; map.roadLegend=true; }
    /* 울릉도·독도 영해선은 실제 자리에서만 그려지므로 울릉도를 제자리에 둔다(‘울릉도 상자’라고 하면 상자) */
    if((map.ts||map.nb)&&map.ulleung==='box'&&!/울릉도?.{0,6}상자/.test(text)){ map.ulleung='true'; map.ulAuto=true; }
    else if(!(map.ts||map.nb)&&map.ulAuto){ if(map.ulleung==='true'&&!/울릉도?.{0,6}제자리/.test(text)) map.ulleung='box'; delete map.ulAuto; }
    const re=/직선\s*기선|통상\s*기선|기선|기점|영해선|영해(?!면)|\d+\s*해리/g; let m; while((m=re.exec(text))) mark(m.index,m[0].length); }
  /* ‘지도·경계·축척’ 같은 지도 낱말은 지명이 아니다(‘시군 지도’의 ‘지도’ ≠ 신안 지도읍) */
  { const re=/백지도|지도(?!읍)|경계|축척|위치도/g; let m; while((m=re.exec(text))) mark(m.index,m[0].length); }
  /* 지명 찾기(긴 이름부터, 낱말 경계) */
  const found=[];
  for(const n of allNames(map)){ let from=0; for(;;){ const i=text.indexOf(n,from); if(i<0) break; from=i+1; if(used.slice(i,i+n.length).some(Boolean)) continue;
      const pre=text[i-1]||' ', post=text[i+n.length]||' ';
      if(/[가-힣A-Za-z]/.test(pre)&&!/[와과,·]/.test(pre)) continue;
      if(/[가-힣]/.test(post)&&!/[은는이가을를과와의도로에만및랑]/.test(post)) continue;
      mark(i,n.length); found.push([i,n]); } }
  found.sort((a,b)=>a[0]-b[0]);
  const ctxS=map.area==='sido'&&map.sido.length===1?map.sido[0]:null;
  /* 색칠: ‘… 색칠/음영/칠해’가 뒤따르는 묶음 */
  const shadeRe=/(색칠|음영|칠해|칠하|칠한|빗금|점무늬|진하게|연하게|회색)/;
  const toneOf=s=>/빗금/.test(s)?'hatch':/점무늬/.test(s)?'dots':/진하게|짙게|어둡게/.test(s)?'dark':/연하게|옅게|밝게/.test(s)?'light':'mid';
  const items=[];
  let ctxNext=null, codeNext=null;
  for(let j=0;j<found.length;j++){ const [i,n]=found[j]; const ctx=ctxNext||ctxS, cc=codeNext; ctxNext=null; codeNext=null; const r=lookupEx(map,n,ctx,cc); if(!r){ out.missing.push(n); continue; } const p=r.p;
    /* ‘대구 군위군’, ‘경기 광주’처럼 시도 이름 바로 뒤에 그 시도의 지명이 오면 시도 이름은 맥락일 뿐 */
    if(p.k==='sido'&&j+1<found.length&&/^\s*$/.test(text.slice(i+n.length,found[j+1][0]))){ const q2=lookupEx(map,found[j+1][1],p.c); if(q2&&q2.p.s===p.c&&q2.p.k!=='sido'){ ctxNext=p.c; continue; } }
    /* ‘신안 지도읍’: 시·군 이름 바로 뒤에 그 시·군의 읍·면 */
    if(p.k==='sgg'&&j+1<found.length&&/^\s*$/.test(text.slice(i+n.length,found[j+1][0]))){ const q2=lookupEx(map,found[j+1][1],p.s,p.c); if(q2&&q2.p.k==='emd'&&q2.p.c===p.c){ ctxNext=p.s; codeNext=p.c; continue; } }
    const rest=text.slice(i+n.length);
    const m=rest.match(new RegExp(String.raw`^\s*(?:은|는|을|를|이|가|=|:)?\s*\(?\s*(${SEQ_RE})\s*\)?\s*(?:로|으로)?(?=[\s,.·만]|$)`));
    let sym=m?(m[1].length===1&&/[가-하]/.test(m[1])?`(${m[1]})`:m[1]):null;
    /* 다음 지명이 나오기 전까지의 꼬리말 */
    const nextI=j+1<found.length?found[j+1][0]:text.length; const tail=text.slice(i+n.length,nextI);
    /* 이 지명 뒤 묶음 끝(다음 지명 사이에 쉼표만 있으면 같은 묶음) */
    /* 기호 없이 ‘독도’, ‘울릉도’만 적으면 지도에 넣으라는 뜻(기호를 붙이지 않음) */
    if(!sym&&(p.n==='독도'||p.n==='울릉도'||isUl(p))&&!shadeRe.test(tail)) continue;
    items.push({p,n,sym,tail,r,ctx});
  }
  /* 겹치는 이름 고르기: 함께 적은 다른 지명들의 시도를 따른다(‘고성 A, 속초 B’ → 강원 고성군) */
  { const cnt={}; for(const it of items) if(!it.r.amb) cnt[it.p.k==='sido'?it.p.c:it.p.s]=(cnt[it.p.k==='sido'?it.p.c:it.p.s]||0)+1;
    for(const it of items){
      if(it.r.amb&&!it.ctx){ const best=it.r.ties.slice().sort((a,b)=>(cnt[b.s]||0)-(cnt[a.s]||0)); it.p=best[0];
        if(best.length>1&&(cnt[best[0].s]||0)===(cnt[best[1].s]||0)) out.notes.push(`‘${it.n}’은(는) ${it.p.s==='NK'?'북한':sidoName(it.p.s)} ${it.p.n}(으)로 잡았어요`); }
      /* ‘제주 A, 서귀포 B’: 같은 시도의 시·군과 함께면 시도(제주도)가 아니라 시(제주시) */
      if(it.p.k==='sido'&&!out.areaSet){ const alt=it.r.alts.find(a=>a.k==='sgg'&&a.s===it.p.c); if(alt&&items.some(o=>o!==it&&o.p.k==='sgg'&&o.p.s===it.p.c)) it.p=alt; } } }
  /* 색칠 묶음: 색칠 말이 나오면 그 앞의, 기호 없이 이어진 지명들 */
  let group=[];
  for(const it of items){ group.push(it); const sm=it.tail.match(shadeRe);
    if(sm){ const tone=toneOf(it.tail); for(const g of group){ if(['sgg','sido','nkdo','grp'].includes(g.p.k)) { g.shade=tone; } } group=[]; }
    else if(/[.;]|\s(?:그리고|또)\s/.test(it.tail)||it.sym) group=[]; }
  /* ‘군산 A, 나주 B, 목포 C, 광양 D 색칠’: 기호를 모두 붙인 목록 끝에 색칠 말이 한 번만 오면 모두 칠한다(‘D만 색칠’은 마지막만) */
  { const n=(text.match(new RegExp(shadeRe.source,'g'))||[]).length; const last=items[items.length-1];
    if(n===1&&items.length>1&&last&&last.shade&&items.every(it=>it.sym)&&!/만\s*(?:을|를)?\s*(?:색칠|음영|칠|빗금|점무늬|진하게|연하게|회색)/.test(text))
      for(const it of items) if(['sgg','sido','nkdo','grp'].includes(it.p.k)) it.shade=last.shade; }
  for(const it of items){
    if(it.shade){ out.shade.push({p:it.p,tone:it.shade}); if(it.sym) out.labels.push({p:it.p,n:it.n,sym:it.sym,shaded:true}); else if(/기호|각각/.test(text)||rng) out.labels.push({p:it.p,n:it.n,sym:null,shaded:true}); }
    else out.labels.push({p:it.p,n:it.n,sym:it.sym});
  }
  /* 범위를 말하지 않았으면 지명들로 정한다 */
  if(!out.areaSet&&items.length){
    const ss=[...new Set(items.map(it=>it.p.k==='sido'?it.p.c:it.p.s))];
    if(ss.includes('NK')) { map.area='kor'; map.level='sido'; }
    else if(ss.length===1&&items.every(it=>it.p.k!=='sido')) { map.area='sido'; map.sido=ss; map.level='sgg'; }
    else { const R=REGIONS.filter(r=>r.s).sort((a,b)=>a.s.length-b.s.length).find(r=>ss.every(s=>r.s.includes(s))&&items.every(it=>it.p.k!=='sido'||METRO.has(it.p.c)||it.p.c==='36')); if(R){ map.area=R.id; map.level='sgg'; } else { map.area='sk'; map.level=items.some(it=>it.p.k==='sgg')?'sgg':'sido'; } }
  }
  /* 고속 국도는 문장에 적은 것만(문장 하나 = 새 지도) */
  map.roads=[...new Set(roadHits.map(h=>h.r))]; map.roadStyle={}; for(const h of roadHits) if(h.style) map.roadStyle[h.r]=h.style;
  for(const h of roadHits) if(h.sym) out.labels.push({p:{k:'road',n:h.r,r:h.r},n:roadLabel(h.r),sym:h.sym});
  /* 범위가 바뀌었으면 위치도·하천은 이 문장에 있을 때만 남긴다 */
  if(cur&&(cur.area!==map.area||(cur.sido||[]).join()!==(map.sido||[]).join())){ out.areaSet=true;
    if(!/위치도|위치\s*지도|작은\s*지도/.test(text)) map.inset=false;
    if(!/구\s*(?:를|을)?\s*(?:합쳐|합치|하나로|한\s*덩어리|나눠|나누|따로|구분)|구\s*경계|자치구까지|광역시\s*(?:는|를|을)?\s*(?:하나로|한\s*덩어리|합쳐)/.test(text)) map.metro='auto';
    if(!/한강|낙동강|압록강|두만강|하천|강\s*(?:을|를)?\s*(?:모두|전부)?\s*(?:그려|표시|넣)/.test(text)) map.rivers=[]; }
  return out;
}
/* 지명을 쪽 좌표의 기호 자리로: 지역 안(이름 자리) 또는 점 */
function spotOf(L,p,mode){ const inRegion=mode==='in'||(mode==null&&['sgg','sido','nkdo','grp'].includes(p.k));
  const x=inRegion&&p.lx!=null?p.lx:p.x, y=inRegion&&p.ly!=null?p.ly:p.y; const [px,py]=toPage(L,x,y); return {px,py,inRegion}; }

/* 시군구(또는 시도) 이름 자리: 이름, 쪽 좌표, 그 지역 상자 크기(mm) */
function nameSpots(L,map){ const lv=map.level; const out=[]; const v=verOf(map); const inc=incFn(map);
  const box=fs=>{ let b=[1e12,1e12,-1e12,-1e12]; for(const f of fs){ b=[Math.min(b[0],f.b[0]),Math.min(b[1],f.b[1]),Math.max(b[2],f.b[2]),Math.max(b[3],f.b[3])]; } return {w:(b[2]-b[0])*L.k,h:(b[3]-b[1])*L.k}; };
  const mg=mergeOn(map);
  for(const p of places(map)){ if(!['sgg','sido','grp'].includes(p.k)) continue;
    if(lv==='sgg'){ if(p.k==='sgg'&&unitKey(map,p)) continue; if(p.k==='sido'&&!(mg&&METRO_ALL.includes(p.c))) continue; if(p.k==='grp'&&!mg) continue; }
    else if(p.k!=='sido') continue;
    const s=p.k==='sido'?p.c:p.s; if(!inc({s})) continue;
    const fs=L.feats.filter(f=>p.k==='sido'?f.p.s===p.c&&!isUl(f.p):p.k==='grp'?p.codes.includes(f.p.c):f.p.c===p.c); if(!fs.length) continue;
    const [x,y]=toPage(L,p.lx,p.ly); let n=p.n; if(p.k==='sido') n=sidoName(p.c); else if(p.k==='sgg'&&/[시군]$/.test(n)&&n.length>2) n=n.slice(0,-1);
    out.push(Object.assign({n,x,y,p},box(fs))); }
  if(map.area==='kor'||map.area==='nk') for(const p of places(map)) if(p.k==='nkdo'){ const [x,y]=toPage(L,p.x,p.y); out.push({n:p.n,x,y,w:30,h:30}); }
  return out; }
return {setData,data,lookupEx,boxOf,roadPoint,legendItems,legendEntries,roadLabel,ROAD_KO,roadStyleOf,seaOn,seaSegs,SEA_KO,mergeOn,unitKey,unitCodes,metroIn,REGIONS,nameSpots,SIDO_WORDS,TONES,TONE_ORDER,freshMap,normalizeMap,layout,render,scaleBarItems,locatorSVG,featuresAt,lookup,parse,spotOf,toPage,inv,
  places,sidoName,sidoList,areaLabel,incFn,niceKm,nkName,nkGroup,M};
})();
