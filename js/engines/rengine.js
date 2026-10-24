/* 세계지리 종교 그래프 엔진: 에너지 엔진(EG)의 누적 막대·원그래프·묶은 막대·표 위에 삼각 그래프·종교별 막대·순위 표를 얹는다 */
const RG=(function(){
'use strict';
const {fin,fmt,fmtNum,Ops,fontOf,metrics,W,gray,clamp,GRID_DASH,sum,KN}=GG;
const {finish,block,putBlock,fitLabel,tm,roleOf,fillOpts,haloOf,josa,particle,lblOf,derive,setTable,autoFills,mask,SEQ,shuffleArr,namesSorted,axisFrom,seqRange,LAST}=EG;

/* ───────── 자료(Pew Research Center, 2010·2020 종교 인구 추정) ───────── */
let RD=null;
function setData(d){ RD=d&&d.ent?d:null; }
function data(){ return RD; }
const REL={chr:'크리스트교',mus:'이슬람교',hin:'힌두교',bud:'불교',jew:'유대교',oth:'기타 종교',non:'무종교'};
const RKEYS=['chr','mus','hin','bud','jew','oth','non'];
const MAIN=['chr','mus','hin','bud'];
const SCHEME={
  cont:{name:'대륙별 (나라 값을 다시 합침)',short:'대륙',note:'러시아는 유럽에 포함됨.',
    help:'국제 연합 지역 구분으로 나라 값을 다시 더했어요. 튀르키예·이란·캅카스 3국은 아시아, 이집트·수단 등 북부 아프리카는 아프리카, 러시아는 유럽이에요.'},
  pew:{name:'Pew 원자료 6개 지역',short:'지역',note:'',
    help:'Pew의 지역 구분을 그대로 써요. ‘아시아 및 오세아니아’(Asia-Pacific)에 이란·튀르키예·아프가니스탄·중앙아시아가, ‘서남아시아 및 북부 아프리카’(Middle East-North Africa)에 수단이 들어 있어요. 이름은 작업용 엑셀 시트를 따랐어요.'}
};
const ALIAS={'미국':['미합중국','US','USA'],'오스트레일리아':['호주'],'에스파냐':['스페인'],'튀르키예':['터키'],'타이':['태국'],'타이완':['대만'],
  '콩고 민주 공화국':['콩고민주공화국','콩고 민주공화국','민주 콩고','DR콩고'],'남아프리카 공화국':['남아공','남아프리카','남아프리카공화국'],'사우디아라비아':['사우디'],
  '아랍에미리트':['UAE','아랍 에미리트','아랍에미레이트'],'한국':['대한민국','우리나라','남한'],'북한':['조선'],'영국':['UK'],'체코':['체코 공화국'],'코트디부아르':['아이보리코스트'],
  '동티모르':['티모르레스테'],'미얀마':['버마'],'보스니아 헤르체고비나':['보스니아'],'팔레스타인':['팔레스타인 자치 지역'],'중앙아프리카 공화국':['중앙아프리카공화국'],
  '도미니카 공화국':['도미니카공화국'],'파푸아 뉴기니':['파푸아뉴기니'],'뉴질랜드':['NZ'],
  '세계':['전 세계','전세계'],'앵글로아메리카':['앵글로 아메리카','북아메리카','북미'],'라틴 아메리카':['라틴아메리카','중·남아메리카','중남미','중·남부 아메리카','중남부 아메리카'],
  '아시아 및 오세아니아':['아시아·태평양','아시아 태평양','아시아태평양','아태'],'서남아시아 및 북부 아프리카':['서남아시아·북부 아프리카','중동·북아프리카','중동 및 북아프리카','서남아시아와 북부 아프리카'],
  '사하라 이남 아프리카':['사하라이남 아프리카','사하라 이남']};
function years(){ return RD?RD.years.map(String):['2020']; }
function regions(sc){ return RD?RD.order[sc==='pew'?'pew':'cont']:[]; }
function countries(){ return RD?Object.keys(RD.ent).sort((a,b)=>a.localeCompare(b,'ko')):[]; }
function isAgg(n){ return n==='세계'||(!!RD&&(RD.order.cont.includes(n)||RD.order.pew.includes(n))); }
function entities(sc){ return ['세계',...regions(sc),...countries()]; }
function regionOf(n,sc){ const e=RD&&RD.ent[n]; return e?e[sc==='pew'?'pew':'cont']:''; }
function arrOf(name,year,sc){
  if(!RD||!name) return null; year=String(year);
  if(name==='세계') return RD.world[year]||null;
  const s=sc==='pew'?'pew':'cont';
  if(RD.agg[s][name]) return RD.agg[s][name][year]||null;
  const o=s==='pew'?'cont':'pew'; if(RD.agg[o][name]) return RD.agg[o][name][year]||null;
  const e=RD.ent[name]; return e?e.y[year]||null:null; }
function aliasFind(name){ const t=String(name||'').trim(); if(!t||!RD) return null; if(RD.ent[t]||isAgg(t)) return t;
  for(const [k,a] of Object.entries(ALIAS)) if(a.includes(t)) return k; return null; }
function schemeOfName(n){ if(!RD) return null; const inC=RD.order.cont.includes(n), inP=RD.order.pew.includes(n); return inP&&!inC?'pew':inC&&!inP?'cont':null; }

/* ───────── 문서 ───────── */
const KINDS=['stack','donut','tri','bars','group','tb','rank'];
const KIND_KO={stack:'누적 막대',donut:'원그래프',tri:'삼각 그래프',bars:'종교별 막대',group:'묶은 막대',tb:'표',rank:'순위 표'};
function freshDoc(kind){
  const d=EG.freshDoc('stack'); d.app='religion'; d.v=1; d.kind=KINDS.includes(kind)?kind:'stack';
  Object.assign(d.data,{unit:'%',measure:'신자 수',rowNoun:'국가',itemNoun:'종교'});
  Object.assign(d.donut,{hole:0,center:'none',top:'lbl',inLbl:'name',size:28,gap:6});
  d.tri={size:58,step:20,grid:true,nums:true,titles:true,arrows:true,mk:'fc',mks:1.3,lbl:true,unitWord:'(%)'};
  d.bars={by:'row',barW:2.6,gap:1.5,len:30,pgap:5,cols:0,values:false,dec:1,grid:true,shareCat:true,fill:'one',one:'dark',axis:{auto:true,lo:0,hi:100,step:20}};
  d.rank={layout:'country',n:2,shade:true,rowWord:'국가',mRows:'used',mCols:'all',suffix:true,cell:10.5};
  return d;
}
function normalizeDoc(d){
  d=GG.clean(d);   /* 밖에서 들어온 값 정리(보안): gengine.js clean() */
  const f=freshDoc(d&&d.kind); if(!d||typeof d!=='object') return f;
  const out=EG.normalizeDoc(Object.assign({},d,{kind:'stack'}));
  out.app='religion'; out.kind=KINDS.includes(d.kind)?d.kind:'stack';
  for(const k of ['tri','bars','rank']) out[k]=Object.assign({},f[k],d[k]||{});
  out.bars.axis=Object.assign({},f.bars.axis,(d.bars||{}).axis||{});
  return out;
}

/* ───────── 화살표 · 글자 놓기 ───────── */
function arrow(ops,doc,x0,y0,x1,y1){ const lw=W(doc,0.15); const L=Math.hypot(x1-x0,y1-y0); if(L<0.5) return; const ux=(x1-x0)/L, uy=(y1-y0)/L; const hl=1.1, hw=0.42;
  ops.seg(x0,y0,x1-ux*hl*0.8,y1-uy*hl*0.8,lw); ops.poly([[x1,y1],[x1-ux*hl-uy*hw,y1-uy*hl+ux*hw],[x1-ux*hl+uy*hw,y1-uy*hl-ux*hw]],'#000000'); }
/* (cx, cy)를 가운데로 두는 글자. rot이 있으면 돌린 상태로 가운데 */
function textAtCenter(ops,doc,s,cx,cy,role,o){ o=o||{}; const m=metrics(fontOf(doc,role,o.scale),String(s)); const rot=o.rot||0; const off=(m.A-m.D)/2;
  return ops.text(s,cx-Math.sin(rot)*off,cy+Math.cos(rot)*off,role,Object.assign({align:'center'},o)); }
/* 방향(ux, uy)으로 끝점(x, y)에서 띄워 놓는 글자 */
function textBeyond(ops,doc,s,x,y,ux,uy,role,pad,o){ const m=metrics(fontOf(doc,role,o&&o.scale),String(s)); const ext=Math.abs(ux)*m.W/2+Math.abs(uy)*m.H/2+(pad||0.4);
  return textAtCenter(ops,doc,s,x+ux*ext,y+uy*ext,role,o); }

/* ───────── ① 삼각 그래프 ───────── */
function composeTri(doc){
  const o=doc.tri; const {R,C,M}=derive(doc); const cs=C.slice(0,3); if(!R.length||cs.length<3) return null;
  const S=o.size, H=S*Math.sqrt(3)/2; const ops=new Ops(doc); const lw=W(doc,0.15), gw=W(doc,0.1);
  const P=(a,b,c)=>[(b+c/2)/100*S,H-c/100*H];
  const st=[5,10,20,25,50].includes(+o.step)?+o.step:20;
  if(o.grid) for(let t=st;t<100-1e-9;t+=st){
    const seg=(p,q)=>ops.seg(p[0],p[1],q[0],q[1],gw,{dash:GRID_DASH});
    seg(P(100-t,t,0),P(0,t,100-t)); seg(P(100-t,0,t),P(0,100-t,t)); seg(P(t,0,100-t),P(t,100-t,0)); }
  ops.line([P(100,0,0),P(0,100,0),P(0,0,100)],lw,{closed:true,join:'miter'});
  /* 눈금: 읽는 격자선을 바깥으로 늘인 방향 */
  const tl=0.9, s3=Math.sqrt(3)/2;
  const axes=[
    {j:1,edge:t=>P(100-t,t,0),dir:[-0.5,s3],nrm:[0,1]},              /* 아래 변: B */
    {j:2,edge:t=>P(0,100-t,t),dir:[1,0],nrm:[s3,-0.5]},              /* 오른쪽 변: C */
    {j:0,edge:t=>P(t,0,100-t),dir:[-0.5,-s3],nrm:[-s3,-0.5]}];       /* 왼쪽 변: A */
  const numBox={0:[],1:[],2:[]};
  for(const ax of axes) for(let t=0;t<=100+1e-9;t+=st){ const [x,y]=ax.edge(t); const ex=x+ax.dir[0]*tl, ey=y+ax.dir[1]*tl; ops.seg(x,y,ex,ey,lw);
    if(o.nums){ const it=textBeyond(ops,doc,fmt(t,0),ex,ey,ax.dir[0],ax.dir[1],'tick',0.3); if(it) numBox[ax.j].push(it.box); } }
  /* 축 제목과 화살표 */
  if(o.titles){ const cxy=[S/2,H*2/3];
    for(const ax of axes){ const c=cs[ax.j]; const title=`${lblOf(c)}${o.unitWord||''}`; const role=roleOf(lblOf(c))==='label'?'label':'axis';
      const A=ax.edge(0), B=ax.edge(100); const mid=[(A[0]+B[0])/2,(A[1]+B[1])/2]; const n=ax.nrm;
      const prj=b=>Math.max(...[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(p=>(p[0]-mid[0])*n[0]+(p[1]-mid[1])*n[1]));
      const far=Math.max(tl,...numBox[ax.j].map(prj));
      const rot=ax.j===1?0:ax.j===2?Math.PI/3:-Math.PI/3; const m=metrics(fontOf(doc,role),title);
      const d=far+1.1+m.H/2; const cx=mid[0]+n[0]*d, cy=mid[1]+n[1]*d; textAtCenter(ops,doc,title,cx,cy,role,{rot});
      if(o.arrows){ /* 값이 커지는 쪽(0 → 100)으로 */ const ux=(B[0]-A[0])/S, uy=(B[1]-A[1])/S; const half=m.W/2+0.9; const x0=cx+ux*half, y0=cy+uy*half; arrow(ops,doc,x0,y0,x0+ux*4.2,y0+uy*4.2); }
      void cxy; } }
  /* 점 */
  const pts=[]; const lost=[];
  R.forEach((r,i)=>{ const v=cs.map(c=>{ const x=M[i][C.indexOf(c)]; return fin(x)&&x>0?x:0; }); const t=sum(v); if(!(t>0)){ lost.push(r.name); return; }
    const [a,b,c]=v.map(x=>x/t*100); const [x,y]=P(a,b,c); pts.push({r,x,y}); ops.mark(x,y,o.mk||'fc',o.mks||1.3,{sw:W(doc,0.15),g:gray(doc.style.mid-40)}); });
  LAST.tri={lost,used:cs.map(c=>c.name)};
  /* 점 이름: 다른 점·이름과 겹치지 않는 자리 */
  if(o.lbl!==false){ const placed=pts.map(p=>({x:p.x-(o.mks||1.3)/2-0.2,y:p.y-(o.mks||1.3)/2-0.2,w:(o.mks||1.3)+0.4,h:(o.mks||1.3)+0.4})).concat(ops.list.filter(t=>t.t==='text').map(t=>t.box));
    const r0=(o.mks||1.3)/2+0.45;
    for(const p of pts){ const s=lblOf(p.r); const role=roleOf(s)==='label'?'label':'cat'; const m=metrics(fontOf(doc,role),s); let best=null;
      for(const [dx,dy] of [[1,-1],[1,0],[-1,-1],[-1,0],[1,1],[-1,1],[0,-1],[0,1]]){ const len=Math.hypot(dx,dy); const ux=dx/len, uy=dy/len;
        const ext=Math.abs(ux)*m.W/2+Math.abs(uy)*m.H/2; const cx=p.x+ux*(r0+ext), cy=p.y+uy*(r0+ext); const box={x:cx-m.W/2,y:cy-m.H/2,w:m.W,h:m.H};
        const hit=placed.reduce((a,q)=>a+GG.overlap(q,box,0.15),0); if(best==null||hit<best.hit-1e-9){ best={hit,cx,cy,box}; } if(hit<=0) break; }
      textAtCenter(ops,doc,s,best.cx,best.cy,role,{halo:'w'}); placed.push(best.box); } }
  return {ops,plot:{x:0,y:0,w:S,h:H},legend:'none',items:[],notes:extraNotes(doc)};
}

/* ───────── ② 종교별 막대(작은 가로 막대 여러 칸) ───────── */
function composeBars(doc){
  const o=doc.bars; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null;
  const panels=o.by==='col'?C.map((c,j)=>({head:c,items:R.map((r,i)=>({it:r,v:M[i][j]}))})):R.map((r,i)=>({head:r,items:C.map((c,j)=>({it:c,v:M[i][j]}))}));
  const vals=panels.flatMap(p=>p.items.map(x=>x.v)).filter(fin);
  const ax=axisFrom(o.axis,[0,...vals],{zero:true,target:4}); LAST.bars=ax;
  const L=o.len, bw=o.barW, g=o.gap, n=panels[0].items.length, m0=Math.max(1,g*0.7); const span=n*bw+(n-1)*g+2*m0;
  const lw=W(doc,0.15), tl=0.8; const pos=v=>(clamp(v,ax.lo,ax.hi)-ax.lo)/(ax.hi-ax.lo)*L; const dec=GG.decOf(ax.step);
  const per=o.cols>0?o.cols:panels.length; const catW=Math.max(...panels[0].items.map(x=>metrics(fontOf(doc,'cat'),lblOf(x.it)).W));
  const subs=panels.map((p,k)=>{ const sub=new Ops(doc); const first=k%per===0||!o.shareCat;
    if(o.grid) for(const t of GG.ticksOf(ax)){ if(t<=ax.lo+1e-9||t>=ax.hi-1e-9) continue; sub.seg(pos(t),0,pos(t),span,W(doc,0.1),{dash:GRID_DASH}); }
    p.items.forEach((x,i)=>{ const y=m0+i*(bw+g); const v=x.v; const f=o.fill==='item'?(x.it.fill||'dark'):(o.one||'dark');
      if(fin(v)&&v>0) sub.rect(0,y,pos(v),bw,fillOpts(doc,f));
      if(o.values&&fin(v)){ sub.textMid(fmt(v,o.dec),pos(Math.max(v,0))+0.6,y+bw/2,'value'); }
      if(first) sub.textMid(lblOf(x.it),-1.2,y+bw/2,'cat',{align:'right'}); });
    sub.rect(0,0,L,span,{stroke:'#000000',sw:lw});
    const T=GG.ticksOf(ax); const tm0=metrics(fontOf(doc,'tick'),'0'); let last=null;
    for(const t of T){ if(t>ax.lo+1e-9&&t<ax.hi-1e-9) sub.seg(pos(t),span,pos(t),span-tl,lw); last=sub.text(fmt(t,dec),pos(t),span+0.9+tm0.A,'tick',{align:'center'}); }
    if(last&&doc.data.unit) sub.text(`(${doc.data.unit})`,last.box.x+last.box.w+0.25,span+0.9+tm0.A,'unit');
    const tt=lblOf(p.head); const role=roleOf(tt)==='label'?'label':'title'; const mm=metrics(fontOf(doc,role),tt); sub.text(tt,L/2,-1.6-mm.D,role,{align:'center'});
    return {sub,first}; });
  const ops=new Ops(doc); let y=0;
  for(let r0=0;r0<subs.length;r0+=per){ const row=subs.slice(r0,r0+per); const bs=row.map(q=>q.sub.bounds()); const top=Math.min(...bs.map(b=>b.y)); let x=0, bottom=0;
    row.forEach((q,k)=>{ const b=bs[k]; ops.absorb(q.sub,x-b.x,y-top); x+=b.w+o.pgap; bottom=Math.max(bottom,b.y+b.h-top); });
    y+=bottom+o.pgap+1; }
  void catW;
  const B=ops.bounds(); return {ops,plot:{x:B.x,y:B.y,w:B.w,h:B.h},legend:'none',items:[]};
}

/* ───────── ③ 순위 표 ───────── */
function rankInfo(doc){ const {R,C,M}=derive(doc); const o=doc.rank; const N=Math.max(1,Math.min(4,(o.n|0)||2));
  const elig=C.map((_,j)=>j).filter(j=>!C[j].other);
  const ranks=R.map((_,i)=>elig.filter(j=>fin(M[i][j])&&M[i][j]>0).sort((a,b)=>M[i][b]-M[i][a]).slice(0,N));
  return {R,C,M,N,elig,ranks}; }
/* 칸: {lines:[[글자, role, scale]], shade, diag:[오른쪽 위, 왼쪽 아래]} */
function gridTable(ops,doc,rows,o){
  o=o||{}; const gm=metrics(fontOf(doc,'td'),'가'); const lineH=gm.H*1.3, padV=o.padV==null?2.0:o.padV, padH=o.padH==null?2.8:o.padH;
  const lw=(c)=>Math.max(0,...c.lines.map(([s,rl,sc])=>metrics(fontOf(doc,rl,sc),String(s)).W));
  const lh=(c)=>c.lines.reduce((a,[s,rl,sc],k)=>a+(k?lineH*0.15:0)+metrics(fontOf(doc,rl,sc),'가').H,0);
  const nC=Math.max(...rows.map(r=>r.length)); const colW=[], rowH=[];
  const DS=0.88; const tH=metrics(fontOf(doc,'th',DS),'가').H, dp=1.0, dgap=1.8; const diagH=2*tH+2*dp+dgap;
  rows.forEach((r,ri)=>{ let hh=o.minH||0; for(const cell of r){ if(!cell) continue; hh=Math.max(hh,cell.diag?diagH:lh(cell)+2*padV); } rowH[ri]=hh; });
  for(let c=0;c<nC;c++){ let w=o.minW||0; rows.forEach((r,ri)=>{ const cell=r[c]; if(!cell) return;
      if(cell.diag){ /* 대각선이 두 글자 사이를 지나도록: w > (여백 + 긴 글자) ÷ (1 − (여백 + 글자 높이 + 틈) ÷ 칸 높이) */
        const a=metrics(fontOf(doc,'th',DS),cell.diag[0]).W, b=metrics(fontOf(doc,'th',DS),cell.diag[1]).W; const hh=rowH[ri]; const k=1-(dp+tH+0.45)/hh;
        w=Math.max(w,(padH*0.55+Math.max(a,b)+0.4)/Math.max(k,0.2)); }
      else w=Math.max(w,lw(cell)+2*padH); }); colW[c]=w; }
  if(o.equal&&nC>1){ const mx=Math.max(...colW.slice(1)); for(let c=1;c<nC;c++) colW[c]=mx; }
  if(o.square){ const mx=Math.max(...colW.slice(1),o.cell||0); for(let c=1;c<nC;c++) colW[c]=mx; for(let r=1;r<rows.length;r++) rowH[r]=Math.max(rowH[r],mx*0.9); const mh=Math.max(...rowH.slice(1)); for(let r=1;r<rows.length;r++) rowH[r]=mh; }
  const X=[0]; colW.forEach(w=>X.push(X[X.length-1]+w)); const Y=[0]; rowH.forEach(h=>Y.push(Y[Y.length-1]+h)); const TW=X[nC], TH=Y[rows.length];
  const shadeC=gray(Math.max(doc.style.light,222));
  rows.forEach((r,ri)=>r.forEach((cell,ci)=>{ if(cell&&cell.shade) ops.rect(X[ci],Y[ri],colW[ci],rowH[ri],{fill:shadeC}); }));
  rows.forEach((r,ri)=>r.forEach((cell,ci)=>{ if(!cell) return; const x0=X[ci], y0=Y[ri], w=colW[ci], h=rowH[ri];
    if(cell.diag){ ops.seg(x0,y0,x0+w,y0+h,W(doc,0.12)); const mt=metrics(fontOf(doc,'th',DS),'가');
      ops.text(cell.diag[0],x0+w-padH*0.55,y0+dp+mt.A,'th',{align:'right',scale:DS}); ops.text(cell.diag[1],x0+padH*0.55,y0+h-dp-mt.D,'th',{scale:DS}); return; }
    const tot=lh(cell); let y=y0+(h-tot)/2;
    cell.lines.forEach(([s,rl,sc],k)=>{ const mm=metrics(fontOf(doc,rl,sc),'가'); if(k) y+=lineH*0.15; ops.text(s,x0+w/2,y+mm.A,rl,{align:'center',scale:sc}); y+=mm.H; }); }));
  for(let r=1;r<rows.length;r++) ops.seg(0,Y[r],TW,Y[r],W(doc,0.12));
  for(let c=1;c<nC;c++) ops.seg(X[c],0,X[c],TH,W(doc,0.12));
  ops.rect(0,0,TW,TH,{stroke:'#000000',sw:W(doc,0.16)});
  return {w:TW,h:TH};
}
const cellOf=(s,role,scale)=>({lines:[[s,role||'td',scale||1]]});
function composeRank(doc){
  const o=doc.rank; const {R,C,N,elig,ranks}=rankInfo(doc); if(!R.length||!elig.length) return null;
  const ops=new Ops(doc); const rk=k=>`${k+1}위`; const word=o.rowWord||'국가'; let rows;
  const nameCell=s=>({lines:[[s,'td',1]]});
  if(o.layout==='rank'){
    rows=[[{diag:[word,'순위'],shade:o.shade},...R.map(r=>Object.assign(nameCell(lblOf(r)),{shade:o.shade}))]];
    for(let k=0;k<N;k++) rows.push([cellOf(rk(k),'th'),...R.map((_,i)=>{ const j=ranks[i][k]; return j==null?cellOf(''):nameCell(lblOf(C[j])); })]);
    gridTable(ops,doc,rows,{equal:true,minW:12}); }
  else if(o.layout==='matrix'){
    const first=new Set(ranks.map(r=>r[0]).filter(j=>j!=null)), second=new Set(ranks.map(r=>r[1]).filter(j=>j!=null));
    const cols=o.mCols==='used'?elig.filter(j=>first.has(j)):elig; const rws=o.mRows==='all'?elig:elig.filter(j=>second.has(j));
    rows=[[{diag:['1위','2위']},...cols.map(j=>nameCell(lblOf(C[j])))]];
    for(const j2 of rws){ const line=[nameCell(lblOf(C[j2]))];
      for(const j1 of cols){ const who=R.filter((_,i)=>ranks[i][0]===j1&&ranks[i][1]===j2).map(r=>lblOf(r));
        if(!who.length){ line.push(cellOf('')); continue; }
        const lines=[]; for(const s of who){ lines.push([s,'td',1]); if(o.suffix&&roleOf(s)==='label') lines.push([word,'th',0.78]); }
        line.push({lines,shade:true}); }
      rows.push(line); }
    gridTable(ops,doc,rows,{square:true,cell:o.cell||10.5,padV:1.6}); }
  else {
    rows=[[{diag:['순위',word],shade:o.shade},...Array.from({length:N},(_,k)=>Object.assign(cellOf(rk(k),'th'),{shade:o.shade}))]];
    R.forEach((r,i)=>rows.push([nameCell(lblOf(r)),...Array.from({length:N},(_,k)=>{ const j=ranks[i][k]; return j==null?cellOf(''):nameCell(lblOf(C[j])); })]));
    gridTable(ops,doc,rows,{equal:true,minW:10}); }
  const B=ops.bounds();
  return {ops,plot:{x:0,y:0,w:B.w,h:B.h},legend:'none',items:[]};
}
/* 순위 표에 나오지 않는 종교 열은 지운다(발문의 ‘각각 … 중 하나’가 맞도록) */
function pruneForRank(doc){ const {C,ranks}=rankInfo(doc); const used=new Set(ranks.flat()); const keep=C.filter((c,j)=>c.other||used.has(j)).map(c=>c._j);
  const D=doc.data; if(keep.length===D.cols.length) return 0; const drop=D.cols.length-keep.length;
  const all=D.cols.map((_,j)=>j).filter(j=>keep.includes(j)||D.cols[j].hide); D.cols=all.map(j=>D.cols[j]); D.v=D.v.map(r=>all.map(j=>r[j])); return drop; }

/* ───────── 조립 ───────── */
function compose(doc){
  for(const k of Object.keys(LAST)) delete LAST[k];
  const f={tri:composeTri,bars:composeBars,rank:composeRank}[doc.kind]; const r=f?f(doc):null; if(!r) return null;
  const ops=finish(doc,r); return {ops,plots:[r.plot]};
}
for(const k of ['tri','bars','rank']) GG.register(k,compose,'religion');
for(const k of ['stack','donut','group','tb']) GG.register(k,EG.compose,'religion');
function extraNotes(doc){ if(doc.kind!=='tri') return []; const {C}=derive(doc); const cs=C.slice(0,3); if(cs.length<3) return [];
  return !cs.some(c=>c.other)?[`${namesSorted(cs.map(c=>c.name)).join(', ')}의 ${doc.data.measure||'값'} 합을 100%로 하여 나타냄.`]:[]; }
function autoNotes(doc){ return EG.autoNotes(doc).concat(extraNotes(doc)); }

/* ───────── 자료로 표 만들기 ───────── */
function fixYear(y){ const Y=years(); return Y.includes(String(y))?String(y):Y[Y.length-1]; }
function presetComp(doc,p){
  const year=fixYear(p.year); const sc=p.scheme==='pew'?'pew':'cont';
  const keys=(p.keys&&p.keys.length?p.keys:MAIN).filter(k=>RKEYS.includes(k));
  const want=(p.rows||[]).map(n=>aliasFind(n)||n); const rows=want.filter(n=>arrOf(n,year,sc));
  const other=p.other!==false&&keys.length<RKEYS.length; const num=p.val==='num';
  const cols=keys.map(k=>({name:REL[k],key:k})); if(other) cols.push({name:'기타',key:'_other',other:true});
  const v=rows.map(n=>{ const a=arrOf(n,year,sc); const pop=a[0]; const r=keys.map(k=>a[1+RKEYS.indexOf(k)]); if(other) r.push(Math.max(0,pop-sum(r))); return r.map(x=>num?x/1e6:(pop>0?x/pop*100:null)); });
  setTable(doc,rows.map(n=>({name:n})),cols,v);
  Object.assign(doc.data,{unit:num?'백만 명':'%',measure:'신자 수',rowNoun:rows.every(n=>!isAgg(n))?'국가':'지역',itemNoun:'종교',note:'',noteSum:!other});
  doc.preset={type:'comp',year,rows,keys,other,val:num?'num':'pct',scheme:sc};
  doc.meta.year=`(${year})`;
  return {year,rows,missing:want.filter(n=>!arrOf(n,year,sc))};
}
function presetDist(doc,p){
  const year=fixYear(p.year); const sc=p.scheme==='pew'?'pew':'cont';
  const keys=(p.keys&&p.keys.length?p.keys:MAIN).filter(k=>RKEYS.includes(k)); const regs=regions(sc);
  const v=keys.map(k=>{ const i=1+RKEYS.indexOf(k); const a=regs.map(r=>RD.agg[sc][r][year][i]); const t=sum(a); return a.map(x=>t>0?x/t*100:null); });
  setTable(doc,keys.map(k=>({name:REL[k],key:k})),regs.map(r=>({name:r})),v);
  const fills=['light','white','fs','dark','dot','black']; doc.data.cols.forEach((c,j)=>c.fill=fills[j%fills.length]);
  const lines=[`종교별 전 세계 신자 수에서 각 ${SCHEME[sc].short}이 차지하는 비율임.`]; if(SCHEME[sc].note) lines.push(SCHEME[sc].note);
  Object.assign(doc.data,{unit:'%',measure:'신자 수',rowNoun:'종교',itemNoun:SCHEME[sc].short,note:lines.join('\n'),noteSum:false});
  doc.preset={type:'dist',year,keys,scheme:sc};
  doc.meta.year=`(${year})`;
  return {year,keys};
}
function presetTop(doc,p){
  const year=fixYear(p.year); const keys=(p.keys&&p.keys.length?p.keys:['mus']).filter(k=>RKEYS.includes(k)); const N=Math.max(1,Math.min(10,+p.n||3)); const by=p.by==='pct'?'pct':'num';
  const per=keys.map(k=>{ const i=1+RKEYS.indexOf(k); const w=RD.world[year][i];
    const list=Object.entries(RD.ent).map(([n,e])=>[n,e.y[year][i],e.y[year][0]]).filter(a=>a[1]>0);
    list.sort((a,b)=>by==='pct'?(b[1]/b[2]-a[1]/a[2]):(b[1]-a[1]));
    return {k,top:list.slice(0,N).map(([n,x,pop])=>[n,by==='pct'?x/pop*100:x/w*100])}; });
  const names=[]; for(const q of per) for(const [n] of q.top) if(!names.includes(n)) names.push(n);
  if(by==='pct'){ /* 나라 안 신자 비율 상위국: 행 = 종교, 열 = 나라, 값 = 그 나라 인구 중 신자 비율 */
    setTable(doc,per.map(q=>({name:REL[q.k],key:q.k})),names.map(n=>({name:n})),per.map(q=>names.map(n=>{ const t=q.top.find(x=>x[0]===n); return t?t[1]:null; })),{fills:false});
    Object.assign(doc.data,{unit:'%',measure:'신자 비율',rowNoun:'종교',itemNoun:'국가',note:'국가별 인구에서 해당 종교 신자가 차지하는 비율임.',noteSum:false}); }
  else { const other=p.other!==false; const cols=names.map(n=>({name:n,fill:'light'})); if(other) cols.push({name:'기타',other:true,fill:'white'});
    const v=per.map(q=>{ const r=names.map(n=>{ const t=q.top.find(x=>x[0]===n); return t?t[1]:null; }); if(other) r.push(Math.max(0,100-sum(r.filter(fin)))); return r; });
    setTable(doc,per.map(q=>({name:REL[q.k],key:q.k})),cols,v,{fills:false});
    Object.assign(doc.data,{unit:'%',measure:'신자 수',rowNoun:'종교',itemNoun:'국가',note:'종교별 전 세계 신자 수에서 각 국가가 차지하는 비율임.',noteSum:false}); }
  doc.preset={type:'top',keys,year,n:N,by};
  doc.meta.year=`(${year})`;
  return {year,keys};
}

/* ───────── 문장으로 만들기 ───────── */
const REL_WORDS=[['chr',/크리스트교|기독교|그리스도교|가톨릭|개신교/],['mus',/이슬람교|이슬람|무슬림/],['hin',/힌두교|힌두/],['bud',/불교/],['jew',/유대교/],['non',/무종교|종교\s*없음|종교가\s*없는/],['oth',/기타\s*종교/]];
function findPlaces(text){
  if(!RD) return []; const names=new Set([...countries(),'세계',...RD.order.cont,...RD.order.pew]); const hits=[];
  const cands=[]; for(const n of names) cands.push([n,n]); for(const [k,a] of Object.entries(ALIAS)) for(const x of a) cands.push([x,k]);
  cands.sort((a,b)=>b[0].length-a[0].length);
  const used=new Array(text.length).fill(false);
  for(const [w,k] of cands){ let from=0; for(;;){ const i=text.indexOf(w,from); if(i<0) break; from=i+1;
      if(used.slice(i,i+w.length).some(Boolean)) continue; const pre=text[i-1]||' ', post=text[i+w.length]||' ';
      if(/[A-Za-z]/.test(w)&&(/[A-Za-z]/.test(pre)||/[A-Za-z]/.test(post))) continue;
      if(/[가-힣]/.test(pre)&&!/[와과및,·\s(]/.test(pre)) continue;
      if(/[가-힣]/.test(post)&&!/[의와과는은이가을를로에도만및별]/.test(post)) continue;
      const tail=text.slice(i+w.length,i+w.length+8); const expand=isAgg(k)&&k!=='세계'&&/^\s*(의\s*)?(모든\s*)?(국가|나라|여러\s*나라)/.test(tail);
      for(let t=i;t<i+w.length;t++) used[t]=true; hits.push({i,k,w,expand}); } }
  hits.sort((a,b)=>a.i-b.i); const out=[]; for(const h of hits) if(!out.some(o=>o.k===h.k)) out.push(h); return out;
}
function relsIn(text){ const hits=[]; for(const [k,re] of REL_WORDS){ const g=new RegExp(re.source,'g'); let m; while((m=g.exec(text))) hits.push({k,i:m.index,e:m.index+m[0].length}); }
  hits.sort((a,b)=>a.i-b.i); const out=[]; for(const h of hits) if(!out.includes(h.k)) out.push(h.k); return {list:out,hits}; }
/* 가리기 범위 바로 앞에 이어 적은 종교 목록(예: ‘이슬람교·힌두교·불교는 A~C’) */
function relListBefore(before){ const {hits}=relsIn(before); if(!hits.length) return [];
  let j=hits.length-1; const tail=before.slice(hits[j].e); if(!/^\s*(?:는|은|을|를|이|가)?\s*$/.test(tail)) return [];
  const out=[hits[j].k]; while(j>0){ const gap=before.slice(hits[j-1].e,hits[j].i); if(!/^[\s,·、및와과]*$/.test(gap)) break; j--; if(!out.includes(hits[j].k)) out.unshift(hits[j].k); }
  return out; }
function parseRequest(q){
  const text=String(q||'').replace(/\s+/g,' ').trim();
  const spec={kind:null,src:null,year:null,rows:[],keys:[],n:null,scheme:null,val:null,by:null,maskRows:null,maskCols:null,maskOnly:null,shuffle:false,dir:null,inLbl:null,other:true,layout:null,mode:null,center:null};
  const notes=[]; if(!text) return {understood:false,spec,notes};
  /* 그래프 종류 */
  if(/삼각/.test(text)) spec.kind='tri';
  else if(/원\s*그래프|파이|도넛/.test(text)){ spec.kind='donut'; if(/도넛/.test(text)) spec.donut=true; }
  else if(/1\s*,\s*2\s*위|1위\s*(와|과|,|및)?\s*2위|상위\s*(2|두)\s*개?\s*종교|순위\s*표|순위표|신자\s*수\s*(1|2)위/.test(text)) spec.kind='rank';
  else if(/종교(별|마다)\s*(따로|각각)|따로\s*(가로\s*)?막대|칸\s*나눠|작은\s*막대/.test(text)) spec.kind='bars';
  else if(/묶은\s*막대|나란히/.test(text)) spec.kind='group';
  else if(/(^|\s)표(로|\s|$)|표를|표\s*만들/.test(text)) spec.kind='tb';
  else if(/막대|누적/.test(text)) spec.kind='stack';
  if(spec.kind==='rank'){ spec.layout=/교차|가로\s*세로|1위\s*(가|는)?\s*(열|가로)|매트릭스|칸\s*안에\s*(국가|나라)/.test(text)?'matrix':/순위\s*(가|를|는)?\s*행|순위\s*가\s*세로|(국가|나라)\s*(가|를|는)?\s*열/.test(text)?'rank':'country';
    const nm=text.match(/상위\s*(\d)\s*개?\s*종교|1\s*~\s*(\d)\s*위/); if(nm) spec.n=+(nm[1]||nm[2]); }
  if(/세로\s*막대|세로/.test(text)) spec.dir='v'; if(/가로\s*막대|가로/.test(text)) spec.dir='h';
  if(/값\s*표시|수치\s*표시|비율\s*표시|숫자\s*표시/.test(text)) spec.inLbl='value'; else if(/이름\s*표시|라벨\s*표시/.test(text)) spec.inLbl='name';
  if(/섞어|무작위|랜덤/.test(text)) spec.shuffle=true;
  const ym=text.match(/(20[12]0)\s*년?/); if(ym) spec.year=+ym[1];
  if(/기타\s*(없이|빼)|나머지\s*(빼|없이)/.test(text)) spec.other=false;
  if(/신자\s*수\s*\(?\s*(백만|명)|명\s*단위|사람\s*수/.test(text)) spec.val='num';
  /* 자료 */
  const rel=relsIn(text).list; spec.keys=rel.slice();
  const tn=spec.kind==='rank'?null:text.match(/상위\s*(\d+)\s*(개국|개\s*나라|개\s*국가|위)/); if(tn) spec.n=+tn[1];
  const places=findPlaces(text);
  for(const p of places){ const s=schemeOfName(p.k); if(s) spec.scheme=s; }
  if(/대륙/.test(text)&&!spec.scheme) spec.scheme='cont';
  const distWord=/(대륙|지역)\s*별|분포/.test(text)&&!places.length;
  if(tn&&/(신자|많은|상위)/.test(text)){ spec.src='top'; spec.by=/비율\s*(이|가)?\s*(높은|큰)|비율\s*상위/.test(text)?'pct':'num'; if(!spec.keys.length) spec.keys=['mus']; }
  else if(distWord){ spec.src='dist'; }
  else if(places.length){ spec.src='comp'; spec.rows=places.map(p=>p.expand?'@'+p.k:p.k); }
  if(spec.src==='dist'&&!places.length&&!spec.scheme) spec.scheme='cont';
  /* 가리기 */
  const G='\\([가나다라마바사아자차카타파하]\\)', Lt='(?<![A-Za-z])[A-J](?![A-Za-z])';
  const re=new RegExp(`(${G}|${Lt})\\s*[~∼～\\-]\\s*(${G}|${Lt})`,'g'); let mm;
  while((mm=re.exec(text))){ const a=mm[1]; const isLatin=/[A-Z]/.test(a); const before=text.slice(0,mm.index); const after=text.slice(mm.index,mm.index+40);
    const only=relListBefore(before);
    const relW=/(종교|크리스트교|기독교|이슬람교?|힌두교?|불교|유대교|무종교)\S{0,3}\s*$/, placeW=/(국가|지역|나라|대륙|도시)\S{0,3}\s*$/;
    const what=only.length||relW.test(before.slice(-12))?'rel':placeW.test(before.slice(-10))?'place':/^[^.]*?(국가|지역|나라|대륙)/.test(after)?'place':/^[^.]*?종교/.test(after)?'rel':(isLatin?'rel':'place');
    const relIsRow=spec.src==='dist'||spec.src==='top'; const target=what==='rel'?(relIsRow?'rows':'cols'):(relIsRow?'cols':'rows');
    const seq=isLatin?'latin':'gana'; if(target==='cols'){ spec.maskCols=seq; if(only.length&&!relIsRow) spec.maskOnly=only; } else { spec.maskRows=seq; if(only.length&&relIsRow) spec.maskOnly=only; } }
  if(/가운데\s*(에\s*)?(총|합계)/.test(text)) spec.center='total';
  if(!spec.kind) spec.kind=spec.src==='top'&&spec.by==='pct'?'bars':'stack';
  if(spec.kind==='tri'&&spec.src==='comp'&&spec.keys.length>3) notes.push('삼각 그래프는 앞의 세 종교만 써요.');
  if(spec.kind==='tri'&&spec.src==='comp'&&!spec.keys.length) spec.keys=['chr','mus','hin'];
  if(spec.kind==='tri') spec.other=false;
  const understood=!!spec.src&&(spec.src==='comp'?spec.rows.length>0:true);
  return {understood,spec,notes};
}
function specToDoc(spec,cur){
  const d=freshDoc(spec.kind||'stack'); if(cur&&cur.style) d.style=Object.assign({},cur.style);
  let info={}; const sc=spec.scheme==='pew'?'pew':'cont';
  const expand=list=>{ const out=[]; for(const n of list){ if(String(n).startsWith('@')){ const R=n.slice(1); const s=schemeOfName(R)||sc; for(const c of countries()) if(regionOf(c,s)===R&&!out.includes(c)) out.push(c); } else if(!out.includes(n)) out.push(n); } return out; };
  if(spec.src==='comp'){ const keys=spec.keys&&spec.keys.length?(spec.kind==='tri'?spec.keys.slice(0,3):spec.keys):MAIN;
    info=presetComp(d,{year:spec.year,rows:expand(spec.rows),keys,other:spec.kind==='tri'||spec.kind==='rank'||(spec.kind==='group'&&spec.keys.length)?false:spec.other,val:spec.val,scheme:sc});
    if(spec.kind==='rank'&&spec.other!==false) { /* 순위는 고른 종교 안에서 */ } }
  else if(spec.src==='dist') info=presetDist(d,{year:spec.year,keys:spec.keys,scheme:sc});
  else if(spec.src==='top') info=presetTop(d,{year:spec.year,keys:spec.keys,n:spec.n||3,by:spec.by,other:spec.other});
  if(spec.year&&info.year&&String(spec.year)!==String(info.year)) info.yearNote=`${spec.year}년 값이 없어 ${info.year}년 값으로 그렸어요.`;
  const D=d.data;
  if(spec.kind==='rank'){ d.rank.layout=spec.layout||'country'; if(spec.n) d.rank.n=spec.n; if(d.rank.layout==='matrix') d.rank.n=2; info.pruned=pruneForRank(d); }
  if(spec.shuffle&&spec.maskCols){ const oth=D.cols.filter(c=>c.other); const rest=D.cols.filter(c=>!c.other); const idx=shuffleArr(rest.map((_,j)=>j));
    const perm=[...idx.map(j=>D.cols.indexOf(rest[j])),...oth.map(c=>D.cols.indexOf(c))]; D.v=D.v.map(r=>perm.map(j=>r[j])); D.cols=perm.map(j=>D.cols[j]); autoFills(D.cols); }
  if(spec.shuffle&&spec.maskRows&&(spec.src==='dist'||spec.src==='top')){ const idx=shuffleArr(D.rows.map((_,i)=>i)); D.rows=idx.map(i=>D.rows[i]); D.v=idx.map(i=>D.v[i]); }
  const onlySet=spec.maskOnly&&spec.maskOnly.length?new Set(spec.maskOnly.map(k=>REL[k])):null;
  if(spec.maskCols) mask(D.cols,spec.maskCols,c=>!c.other&&(!onlySet||spec.src==='dist'||spec.src==='top'||onlySet.has(c.name)));
  if(spec.maskRows) mask(D.rows,spec.maskRows,r=>!onlySet||!(spec.src==='dist'||spec.src==='top')||onlySet.has(r.name));
  if(spec.kind==='stack'){ const o=d.stack; o.dir=spec.dir||'h'; if(spec.inLbl) o.inLbl=spec.inLbl;
    if(spec.src==='top'&&spec.by!=='pct'){ o.legend='none'; o.inLbl=spec.inLbl||'name'; o.sortSeg=true; D.cols.forEach(c=>c.fill=c.other?'white':'light'); o.h=Object.assign({},o.h,{barW:4.6,gap:7.5}); }
    if(spec.src==='top'&&spec.by==='pct'){ o.norm=false; o.trans=true; o.axis={auto:true,lo:0,hi:100,step:20}; }
    if(o.dir==='v'){ o.grid=true; } }
  if(spec.kind==='donut'){ const o=d.donut; o.hole=spec.donut?0.43:0; o.inLbl=spec.inLbl||'name'; o.top=D.rows.length>1||spec.maskRows?'lbl':'none'; if(spec.center==='total'){ o.hole=0.43; o.center='total'; o.top='lbl'; o.totalLabel='총인구'; } }
  if(spec.kind==='group'){ const pal=['white','dark','light','fs','dot','black']; D.cols.forEach((c,j)=>c.fill=pal[j%pal.length]); d.group.legend='in';
    if(D.unit==='%'){ const mx=Math.max(0,...D.v.flat().filter(fin)); d.group.axis={auto:false,lo:0,hi:mx>80?100:Math.ceil(mx/20)*20||20,step:mx>40?20:10}; d.group.legend='bottom'; } }
  if(spec.kind==='bars'){ d.bars.by=spec.src==='dist'||spec.src==='top'?'row':'col'; }
  if(spec.kind==='tri'){ D.rows.forEach(r=>{ if(!r.lbl) r.lbl=''; }); }
  return {doc:d,info};
}
function buildPrompt(q){
  const ents=countries().join(', ');
  return `세계지리 종교 그래프 편집기의 요청을 JSON 하나로 바꿔 줘. 다른 말은 쓰지 마.
형식: {"kind":"stack|donut|tri|bars|group|tb|rank","src":"comp|dist|top","year":2020,"rows":["인도"],"keys":["chr","mus","hin","bud"],"n":3,"scheme":"cont|pew","val":"pct|num","by":"num|pct","layout":"country|rank|matrix","maskRows":"gana|latin|null","maskCols":"gana|latin|null","shuffle":false,"dir":"h|v","other":true,"missing":[]}
- 종교 키: chr 크리스트교, mus 이슬람교, hin 힌두교, bud 불교, jew 유대교, oth 기타 종교, non 무종교.
- src=comp: 나라·지역의 종교 구성(인구 대비 신자 비율). rows는 나라 이름이나 ‘세계’, 대륙(아시아, 유럽, 아프리카, 앵글로아메리카, 라틴 아메리카, 오세아니아).
- src=dist: 종교별 신자의 대륙(지역) 분포. rows는 비운다. scheme=cont(대륙 재집계) 또는 pew(Pew 6개 지역).
- src=top: 종교별 신자 수 상위 n개국(by=num) 또는 나라 안 신자 비율 상위 n개국(by=pct).
- kind=rank: 나라별 신자 수 상위 n개 종교 표. layout=country(행 국가·열 순위), rank(행 순위·열 국가), matrix(1위×2위 교차표).
- kind=tri: 삼각 그래프, keys는 세 종교.
- rows는 이 목록의 이름만: ${ents}. 목록에 없으면 missing에 넣는다.
- 연도는 2010 또는 2020.
요청: ${q}`;
}
function cleanSpec(o){
  if(!o||typeof o!=='object') return null; const pick=(v,arr,def)=>arr.includes(v)?v:def;
  const s={kind:pick(o.kind,KINDS,'stack'),src:pick(o.src,['comp','dist','top'],null),year:fin(+o.year)?+o.year:null,
    rows:(Array.isArray(o.rows)?o.rows:[]).map(String).map(n=>aliasFind(n)||n),keys:(Array.isArray(o.keys)?o.keys:[]).filter(k=>RKEYS.includes(k)),
    n:fin(+o.n)?+o.n:null,scheme:pick(o.scheme,['cont','pew'],null),val:pick(o.val,['pct','num'],null),by:pick(o.by,['num','pct'],null),layout:pick(o.layout,['country','rank','matrix'],null),
    maskRows:pick(o.maskRows,['gana','latin'],null),maskCols:pick(o.maskCols,['gana','latin'],null),shuffle:!!o.shuffle,dir:pick(o.dir,['h','v'],null),other:o.other!==false,inLbl:null,maskOnly:null};
  if(!s.src) return null; return s;
}

return {KINDS,KIND_KO,REL,RKEYS,MAIN,SCHEME,setData,data,years,regions,countries,entities,isAgg,regionOf,arrOf,aliasFind,
  freshDoc,normalizeDoc,compose,autoNotes,rankInfo,pruneForRank,presetComp,presetDist,presetTop,parseRequest,specToDoc,buildPrompt,cleanSpec,
  lastAxes:()=>Object.assign({},LAST)};
})();
