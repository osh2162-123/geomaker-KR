/* 세계지리 에너지 그래프 엔진: 기후 그래프 엔진(GG)의 글꼴·그리기·내보내기 위에 에너지 도표 여섯 가지를 얹는다 */
const EG=(function(){
'use strict';
const {fin,fmt,fmtNum,Ops,fontOf,metrics,W,gray,fillColor,patOf,PATS,ticksOf,niceStep,decOf,autoAxis,clamp,uid,GRID_DASH,sum,KN}=GG;

/* ───────── 데이터(EI Statistical Review of World Energy 2025) ───────── */
let ED=null;
function setData(d){ ED=d&&d.mix?d:null; }
function data(){ return ED; }
const FUEL={oil:'석유',gas:'천연가스',coal:'석탄',nuclear:'원자력',hydro:'수력',ren:'신·재생 에너지',other:'기타',wind:'풍력',solar:'태양광',geo:'지열·바이오매스 등'};
const MIX={
  pe:{name:'1차 에너지 소비 (종전 방식)',short:'1차 에너지 소비',measure:'소비량',f:['oil','gas','coal','nuclear','hydro','ren'],
      note:'EI 종전 방식(대체법). 원자력·수력·신재생 발전량을 화력 발전에 드는 연료량으로 환산해요. 2023학년도~2026학년도 시험 수치와 맞아요.'},
  tes:{name:'1차 에너지 공급 (TES, 새 방식)',short:'1차 에너지 공급',measure:'공급량',f:['oil','gas','coal','nuclear','hydro','ren'],
      note:'EI 새 방식(물리적 에너지 함량법). 수력·신재생 비중이 종전 방식보다 작게 나와요. 2027학년도 9월 10번이 이 방식에 가까워요.'},
  elec:{name:'발전량 (에너지원별)',short:'발전량',measure:'발전량',f:['oil','gas','coal','nuclear','hydro','ren','other']},
  ren:{name:'재생 에너지 발전량 (원별)',short:'재생 에너지 발전량',measure:'발전량',f:['wind','solar','hydro','other']}
};
const MIX_LABEL={ren:{other:'지열·바이오매스 등'},elec:{other:'기타 연료'}};
function fuelName(ds,k){ return (MIX_LABEL[ds]&&MIX_LABEL[ds][k])||FUEL[k]||k; }
function mixYears(ds){ return ED&&ED.mix[ds]?Object.keys(ED.mix[ds].y).sort():[]; }
function mixEntities(ds,year){ if(!ED||!ED.mix[ds]) return []; const y=ED.mix[ds].y[year||mixYears(ds).slice(-1)[0]]; return y?Object.keys(y):[]; }
function prodKeys(){ return ED?Object.keys(ED.prod):[]; }
function prodOf(k){ return ED&&ED.prod[k]||null; }
const REGIONS=['북아메리카','중·남아메리카','유럽','독립 국가 연합(CIS)','서남아시아(중동)','아프리카','아시아·태평양'];
const AGG=new Set(['세계',...REGIONS,'유럽 연합(EU)','OPEC','중앙아메리카']);
const ALIAS={'미국':['미합중국','US','USA'],'남아프리카 공화국':['남아공','남아프리카','남아프리카공화국'],'사우디아라비아':['사우디'],'아랍에미리트':['UAE','아랍 에미리트','아랍에미레이트'],
  '오스트레일리아':['호주'],'에스파냐':['스페인'],'튀르키예':['터키'],'타이':['태국'],'타이완':['대만'],'콩고 민주 공화국':['콩고민주공화국','콩고 민주공화국','민주 콩고','DR콩고'],
  '중·남아메리카':['중남미','중·남부 아메리카','중남부 아메리카','라틴 아메리카','라틴아메리카','중남아메리카'],'서남아시아(중동)':['중동','서남아시아'],'아시아·태평양':['아시아 태평양','아태','아시아태평양'],
  '독립 국가 연합(CIS)':['CIS','독립국가연합'],'유럽 연합(EU)':['EU','유럽연합','유럽 연합'],'세계':['전 세계','전세계'],'영국':['UK'],'한국':['대한민국','우리나라'],'북아메리카':['북미','앵글로아메리카'],
  '홍콩(중국)':['홍콩'],'뉴질랜드':['NZ']};

/* ───────── 문서 ───────── */
const KINDS=['stack','donut','tree','group','small','tb'];
const KIND_KO={stack:'누적 막대',donut:'도넛',tree:'면적 비율',group:'묶은 막대',small:'상댓값 막대',tb:'표'};
const FILL_KEYS=['white','light','mid','dark','black',...Object.keys(PATS)];
const FILL_KO=Object.assign({white:'흰색',light:'연한 회색',mid:'회색',dark:'진한 회색',black:'검정'},PATS);
const PALETTE=['light','fs','dark','dot','white','black','mid','vl','hl','bs','zz','sdot','xx'];
function freshDoc(kind){
  const st=GG.freshDoc('climo').style;
  return {app:'energy',v:1,kind:KINDS.includes(kind)?kind:'stack',
    data:{unit:'%',measure:'',rowNoun:'국가',rows:[],cols:[],v:[],merge:true,note:'',src:''},
    preset:null,
    stack:{dir:'h',norm:true,trans:false,inLbl:'none',dec:1,connect:false,grid:false,frame:true,minor:true,sepTicks:true,legend:'bottom',sortSeg:false,leader:true,
      h:{barW:4.4,gap:3.2,len:70},v:{barW:11,gap:12,len:42},axis:{auto:true,lo:0,hi:100,step:20}},
    donut:{hole:0.43,size:30,gap:5,inLbl:'name',dec:1,center:'row',totalLabel:'합계',top:'none',legend:'none',leader:true,cols:0,sortSeg:false,pct:'all',paren:false},
    tree:{layout:'grid',size:34,gap:2.5,sort:true,top:'lbl',inLbl:'name',dec:0,cols:0,legend:'none',pct:'all',paren:false},
    group:{dir:'v',barW:1.6,inner:0,gap:2.4,len:26,legend:'in',grid:true,frame:true,values:false,dec:0,axis:{auto:true,lo:0,hi:150,step:50}},
    small:{rel:true,pw:18,ph:33,gap:3.2,barW:2.2,grid:true,dec:0,axis:{auto:true,lo:0,hi:100,step:20}},
    tb:{mode:'value',dec:1,comma:true,rankN:3,rowHead:'구분',unitLine:true,unitPos:'auto',unitStyle:'label'},
    meta:{title:'',year:'',src:'',notes:'',autoNote:true,yearPos:'auto'},
    style:Object.assign({},st,{patScale:1,segPt:8})
  };
}
function normalizeDoc(d){
  d=GG.clean(d);   /* 밖에서 들어온 값 정리(보안): gengine.js clean() */
  const f=freshDoc(d&&d.kind); if(!d||typeof d!=='object') return f;
  const out=Object.assign({},f,d);
  for(const k of ['data','stack','donut','tree','group','small','tb','meta','style']) out[k]=Object.assign({},f[k],d[k]||{});
  for(const k of ['h','v','axis']) out.stack[k]=Object.assign({},f.stack[k],(d.stack||{})[k]||{});
  out.group.axis=Object.assign({},f.group.axis,(d.group||{}).axis||{}); out.small.axis=Object.assign({},f.small.axis,(d.small||{}).axis||{});
  const D=out.data; D.rows=(Array.isArray(D.rows)?D.rows:[]).map(r=>Object.assign({id:uid(),name:'',lbl:'',fill:'light'},r));
  D.cols=(Array.isArray(D.cols)?D.cols:[]).map(c=>Object.assign({id:uid(),name:'',lbl:'',fill:'light'},c));
  D.v=D.rows.map((_,i)=>D.cols.map((_,j)=>{ const x=((D.v||[])[i]||[])[j]; return x==null||x===''?null:(fin(+x)?+x:null); }));
  if(!KINDS.includes(out.kind)) out.kind='stack';
  return out;
}
const lblOf=x=>(x.lbl!=null&&String(x.lbl).trim()!=='')?String(x.lbl):x.name;
function autoFills(cols){
  const hasOther=cols.some(c=>c.other); const pal=hasOther?PALETTE.filter(f=>f!=='white'):PALETTE; let k=0;
  for(const c of cols){ if(c.other) c.fill='white'; else c.fill=pal[k++%pal.length]; }
}
function setTable(doc,rows,cols,v,o){
  o=o||{}; const D=doc.data;
  D.rows=rows.map(r=>Object.assign({id:uid(),name:'',lbl:'',fill:'light'},typeof r==='string'?{name:r}:r));
  D.cols=cols.map(c=>Object.assign({id:uid(),name:'',lbl:'',fill:'light'},typeof c==='string'?{name:c}:c));
  D.v=D.rows.map((_,i)=>D.cols.map((_,j)=>{ const x=(v[i]||[])[j]; return fin(x)?x:null; }));
  if(o.fills!==false) autoFills(D.cols);
  D.rows.forEach((r,i)=>{ if(!o.rowFill) r.fill=PALETTE[i%PALETTE.length]; });
  D.fillMode='ramp'; delete D.sym; delete D.cellName;
}

/* 화면에 쓸 행·열·값: 숨긴 항목은 ‘기타’에 합친다 */
function derive(doc){
  const D=doc.data; const RA=D.rows, CA=D.cols;
  const ri=RA.map((_,i)=>i).filter(i=>!RA[i].hide), ci=CA.map((_,j)=>j).filter(j=>!CA[j].hide);
  const val=(i,j)=>{ const x=(D.v[i]||[])[j]; return fin(x)?x:null; };
  const M=ri.map(i=>ci.map(j=>val(i,j)));
  const oth=CA.findIndex(c=>c.other&&!c.hide);
  if(D.merge!==false&&oth>=0){ const hid=CA.map((_,j)=>j).filter(j=>CA[j].hide); const k=ci.indexOf(oth);
    ri.forEach((i,a)=>{ for(const j of hid){ const x=val(i,j); if(fin(x)) M[a][k]=(fin(M[a][k])?M[a][k]:0)+x; } }); }
  return {R:ri.map(i=>Object.assign({},RA[i],{_i:i})),C:ci.map(j=>Object.assign({},CA[j],{_j:j})),M};
}
const transpose=M=>M.length?M[0].map((_,j)=>M.map(r=>r[j])):[];
const pctRow=r=>{ const t=sum(r.filter(x=>fin(x)&&x>0)); return r.map(x=>fin(x)&&t>0?Math.max(0,x)/t*100:null); };

/* ───────── 글자 도움 ───────── */
const SERIF_LBL=/^(?:[A-Z][′']?|\([가-하]\)|[㉠-㉭]|[ⓐ-ⓩ]|\d+(?:\.\d+)?)$/;
const roleOf=s=>SERIF_LBL.test(String(s).trim())?'label':'seg';
function tf(doc,role,scale){ if(role==='seg') return GG.fontOf(doc,'legend',(scale||1)*doc.style.segPt/doc.style.legendPt); return fontOf(doc,role,scale); }
function tm(doc,role,s,scale){ return metrics(tf(doc,role,scale),String(s)); }
function put(ops,doc,s,x,y,role,o){ o=Object.assign({},o||{}); if(role==='seg'){ o.scale=(o.scale||1)*doc.style.segPt/doc.style.legendPt; role='legend'; } return ops.text(s,x,y,role,o); }
/* 가운데 맞춤 여러 줄 */
function block(doc,lines,role,scale){ const ref=tm(doc,role,'가',scale); const lh=ref.H*1.22; const w=Math.max(...lines.map(l=>tm(doc,role,l,scale).W)); return {w,h:ref.H+(lines.length-1)*lh,lh,ref}; }
function putBlock(ops,doc,lines,cx,cy,role,o){ o=o||{}; const b=block(doc,lines,role,o.scale); const top=cy-b.h/2;
  lines.forEach((l,i)=>put(ops,doc,l,cx,top+b.ref.A+i*b.lh,role,Object.assign({align:'center'},o))); return b; }
/* 칸 너비에 맞춰 줄 나누기(띄어쓰기 → 글자 단위) */
function wrapFit(doc,text,role,maxW,maxH,scale){
  const s=String(text); const fit=lines=>{ const b=block(doc,lines,role,scale); return b.w<=maxW&&b.h<=maxH?lines:null; };
  let r=fit([s]); if(r) return r;
  const words=s.split(/\s+/).filter(Boolean);
  if(words.length>1){ for(let n=2;n<=Math.min(3,words.length);n++){ const per=Math.ceil(words.length/n); const L=[]; for(let i=0;i<words.length;i+=per) L.push(words.slice(i,i+per).join(' ')); r=fit(L); if(r) return r; } }
  const ch=[...s.replace(/\s+/g,'')]; if(ch.length>=4){ for(let n=2;n<=3;n++){ const per=Math.ceil(ch.length/n); const L=[]; for(let i=0;i<ch.length;i+=per) L.push(ch.slice(i,i+per).join('')); r=fit(L); if(r) return r; } }
  return null;
}
function splits(s){ const out=[[s]]; const words=s.split(/\s+/).filter(Boolean);
  if(words.length>1){ for(let n=2;n<=Math.min(3,words.length);n++){ const per=Math.ceil(words.length/n); const L=[]; for(let i=0;i<words.length;i+=per) L.push(words.slice(i,i+per).join(' ')); out.push(L); } }
  const ch=[...s.replace(/\s+/g,'')]; if(ch.length>=4){ for(let n=2;n<=3;n++){ const per=Math.ceil(ch.length/n); const L=[]; for(let i=0;i<ch.length;i+=per) L.push(ch.slice(i,i+per).join('')); out.push(L); } }
  return out; }
function fitLabel(doc,text,role,maxW,maxH,base,minScale){
  base=base||1; const cands=splits(String(text)); const by=n=>cands.filter(L=>L.length===n);
  const tries=[]; for(const sc of [1,0.92,0.85,0.78].filter(x=>x>=(minScale||0.85)-1e-9)){ tries.push([1,sc],[2,sc]); } tries.push([3,1],[3,0.92],[3,0.85]);
  for(const [n,sc] of tries) for(const L of by(n)){ const b=block(doc,L,role,base*sc); if(b.w<=maxW&&b.h<=maxH) return {lines:L,scale:base*sc}; }
  return null; }
function haloOf(f){ return f==='dark'||f==='black'||f==='mid'?'k':patOf(f)?'w':null; }
function josa(w,a,b){ const t=String(w).replace(/\(.*\)$/,'').trim(); const c=t.charCodeAt(t.length-1)-0xAC00; return t+(c>=0&&c<11172&&c%28?a:b); }
function fillOpts(doc,f,stroke){ return {fill:fillColor(doc,f),pat:patOf(f),ps:doc.style.patScale||1,stroke:stroke===false?null:'#000000',sw:W(doc,0.12)}; }
function particle(lbl){ const t=String(lbl).trim(); const last=t.replace(/[)\]]$/,'').slice(-1); if(/[LMNR]/.test(last)) return '은'; if(/[가-힣]/.test(last)){ const c=last.charCodeAt(0)-0xAC00; return c>=0&&c%28?'은':'는'; } return '는'; }

/* ───────── 범례 ───────── */
function legend(doc,items,mode,maxW){
  const ops=new Ops(doc); const sw=3.4*doc.style.legendPt/8, sh=2.9*doc.style.legendPt/8, gap=1.0, sep=3.0; const rowH=Math.max(sh,tm(doc,'legend','가').H)+1.3;
  let x=0, y=0; const pos=[];
  items.forEach((it,i)=>{ const role=roleOf(it.text)==='label'?'label':'legend'; const m=tm(doc,role,it.text); const w=sw+gap+m.W;
    if(mode==='col'){ x=0; y=i*rowH; }
    else if(x>0&&maxW&&x+w>maxW){ x=0; y+=rowH; }
    pos.push({it,x,y,role,m}); x+=w+sep; });
  for(const p of pos){ ops.rect(p.x,p.y,sw,sh,fillOpts(doc,p.it.fill)); ops.text(p.it.text,p.x+sw+gap,p.y+sh/2+(p.m.A-p.m.D)/2,p.role); }
  const b=ops.bounds(); ops.rect(b.x-1.3,b.y-1.0,b.w+2.6,b.h+2.0,{stroke:'#000000',sw:W(doc,0.12)});
  return ops;
}

/* ───────── ① 누적 막대 ───────── */
const LAST={};
function stackAxis(o,norm,totals){
  if(o.axis.auto===false&&fin(+o.axis.lo)&&fin(+o.axis.hi)&&+o.axis.hi>+o.axis.lo&&+o.axis.step>0) return {lo:+o.axis.lo,hi:+o.axis.hi,step:+o.axis.step};
  if(norm) return {lo:0,hi:100,step:20};
  return autoAxis([0,...totals],{zero:true,target:5});
}
/* 칸 이름: 순위 표(행마다 top 이름 목록이 있는 표)에서 ‘나라 이름’을 고르면 열 이름(1위…) 대신 그 행의 나라 이름을 쓴다.
   D.sym = {나라 이름: 기호} 로 고른 나라만 기호(A, B…)로 바꿔 쓴다. */
function cellName(doc,row,col){ const D=doc.data; if(col&&!col.other&&row&&Array.isArray(row.top)&&(D.cellName==='top'||(D.sym&&Object.keys(D.sym).length))){
    const n=row.top[col._j!=null?col._j:-1]; if(n){ const sy=D.sym&&D.sym[n]; if(sy) return sy; if(D.cellName==='top') return n; } }
  if(col&&!col.other&&!row&&D.sym&&D.sym[col.name]) return D.sym[col.name];
  return lblOf(col); }
/* 0.0%로 보일 만큼 작은 값(행 합의 0.05% 미만)은 기타로 옮기고(기타가 없으면 0), 어느 열이 하나라도 남았는지 돌려준다 */
const TRIM=0.05;
function trimM(doc,M,C){ const on=doc.data.trim!==false; const oth=C.findIndex(c=>c.other); const shown=C.map(()=>false);
  const out=M.map(r=>{ const t=sum(r.filter(x=>fin(x)&&x>0)); const row=r.slice();
    if(on&&t>0){ r.forEach((x,j)=>{ if(j===oth||!fin(x)||x<=0) return; if(x/t*100<TRIM){ row[j]=null; if(oth>=0) row[oth]=(fin(row[oth])?row[oth]:0)+x; } });
      if(oth>=0&&fin(row[oth])&&row[oth]/t*100<TRIM) row[oth]=null; }   /* 모아도 0.0%인 기타는 뺀다 */
    row.forEach((x,j)=>{ if(fin(x)&&x>0) shown[j]=true; }); return row; });
  return {M:out,shown}; }
/* 값 글자가 0(0.0)으로 보이면 의미가 없으므로 빼야 하는지 */
const zeroTxt=(v,dec)=>+fmt(v,dec)===0;
/* 비율 순 무늬: 비율이 큰 열부터 연한 회색 → 회색 → 진한 회색 → 빗금·점 무늬(D.fillMode = ramp). rampR은 큰 값부터 진하게. 기타는 흰색.
   표에서 무늬를 직접 고르면 fillMode = manual이 되어 그대로 둔다. 비율 그림(누적 막대·도넛·면적 비율)에만 쓴다. */
const RAMP_UP=['light','mid','dark','fs','bs','xx','dot','sdot','vl','hl','zz','black'], RAMP_DOWN=['dark','mid','light','fs','bs','xx','dot','sdot','vl','hl','zz','black'];
function applyFills(doc){ const D=doc.data; const mode=D.fillMode; if(mode!=='ramp'&&mode!=='rampR') return false; if(!['stack','donut','tree'].includes(doc.kind)) return false;
  const trans=doc.kind==='stack'&&doc.stack&&doc.stack.trans; const segs=trans?D.rows:D.cols; const vis=(trans?D.cols:D.rows).map((x,i)=>x.hide?-1:i).filter(i=>i>=0);
  const val=(seg,other)=>{ const x=trans?(D.v[seg]||[])[other]:(D.v[other]||[])[seg]; return fin(x)&&x>0?x:0; };
  const tot=o=>sum(segs.map((_,k)=>val(k,o)));
  const w=segs.map((sg,k)=>sg.hide||sg.other?-1:(vis.length?sum(vis.map(o=>{ const t=tot(o); return t>0?val(k,o)/t:0; }))/vis.length:0));
  const order=segs.map((_,k)=>k).filter(k=>w[k]>=0).sort((a,b)=>w[b]-w[a]||a-b); const R=mode==='rampR'?RAMP_DOWN:RAMP_UP; let ch=false;
  order.forEach((k,n)=>{ const f=R[n%R.length]; if(segs[k].fill!==f){ segs[k].fill=f; ch=true; } });
  segs.forEach(sg=>{ if(sg.other&&sg.fill!=='white'){ sg.fill='white'; ch=true; } });
  return ch; }
/* 문장 속 ‘미국은 A, 중국은 B’ · ‘미국과 중국은 각각 A, B’ · ‘미국=A’ 를 찾는다. find(이름)이 알아보는 이름만 쓴다 */
const SYM_RE=String.raw`[A-Z][′']?|\([가-하]\)|[㉠-㉭]|[ⓐ-ⓩ]`;
function symbolsIn(text,find){ const pairs=[]; let rest=String(text||''); const used=[];
  const many=new RegExp(String.raw`((?:[가-힣A-Za-z·]+\s*(?:와|과|,)\s*)+[가-힣A-Za-z·]+?)\s*(?:은|는|을|를)\s*각각\s*((?:${SYM_RE})(?:\s*(?:,|와|과)\s*(?:${SYM_RE}))*)\s*(?:로|으로)?(?:\s*(?:표시|지정|표기)\S*)?(?:\s*(?:해\s*줘|해\s*주세요))?(?=\s*(?:[,.]|$))`,'g');
  let m; while((m=many.exec(rest))){ const syms=m[2].match(new RegExp(SYM_RE,'g'))||[]; const all=m[1].split(/\s*(?:와|과|,)\s*/).map(x=>x.trim()).filter(Boolean);
    const names=all.slice(-syms.length); if(syms.length<2||names.length!==syms.length||!names.every(n=>find(n))) continue;
    names.forEach((n,k)=>pairs.push([find(n),syms[k]])); const at=m[0].lastIndexOf(names[0],m[1].length); used.push(m[0].slice(at)); }
  used.forEach(u=>{ rest=rest.replace(u,' '); });
  const one=new RegExp(String.raw`(^|[,.\s])([가-힣A-Za-z·]+?)\s*(?:은|는|을|를|=|:)\s*(${SYM_RE})\s*(?:로|으로)?\s*(?:표시|지정|표기|바꿔|해)?[가-힣]*(?:\s*(?:줘|주세요))?\s*(?=[,.]|$)`,'g');
  while((m=one.exec(rest))){ const n=find(m[2].trim()); if(n){ pairs.push([n,m[3]]); used.push(m[0].slice(m[1].length)); } }
  let stripped=String(text||''); used.forEach(u=>{ stripped=stripped.replace(u,' '); });
  return {pairs,stripped:stripped.replace(/\s*,(\s*,)+/g,',').replace(/^[\s,]+|[\s,]+$/g,'').replace(/\s+/g,' ').trim()}; }
/* 기호를 표에 붙인다: 이름이 같은 열·행의 라벨, 순위 표면 D.sym. 표에 없는 이름은 돌려준다 */
function applySymbols(doc,pairs){ const D=doc.data; const miss=[];
  for(const [n,sy] of pairs){ let hit=false;
    for(const x of [...D.cols,...D.rows]) if(x.name===n){ x.lbl=sy; hit=true; }
    if(D.rows.some(r=>Array.isArray(r.top)&&r.top.includes(n))){ D.sym=Object.assign({},D.sym||{},{[n]:sy}); hit=true; }
    if(!hit) miss.push(n); }
  return miss; }
/* 비율 값 글자: o.pct = all(모든 칸에 %) · first(첫 칸에만 %, 시험지 원그래프 방식) · none, o.paren = 괄호로 묶기 */
function shareTxt(o,v,first){ let s=fmt(v,o.dec); if(o.pct==='all'||(o.pct==='first'&&first)) s+='%'; return o.paren?`(${s})`:s; }
function segText(doc,o,C,j,v,norm,row){ const name=cellName(doc,row,C[j]); const val=fmt(v,o.dec); const z=zeroTxt(v,o.dec);
  return o.inLbl==='name'?[name]:o.inLbl==='value'?(z?[]:[val]):o.inLbl==='both'?(z?[name]:[name,val]):[]; }
function composeStack(doc){
  const o=doc.stack; let {R,C,M}=derive(doc);
  if(o.trans){ const t=R; R=C; C=t; M=transpose(M); }
  if(!R.length||!C.length) return null;
  const TR=trimM(doc,M,C); M=TR.M;
  const norm=o.norm!==false; const V=norm?M.map(pctRow):M.map(r=>r.map(x=>fin(x)&&x>0?x:null));
  const totals=V.map(r=>sum(r.filter(fin)));
  const ax=stackAxis(o,norm,totals); LAST.stack=ax; ax.hidden=[];
  const ops=new Ops(doc); const hz=o.dir!=='v'; const dim=hz?o.h:o.v;
  const n=R.length, bw=dim.barW, g=dim.gap, L=dim.len; let m=Math.max(1.2,g*0.62);
  const pos=v=>(clamp(v,ax.lo,ax.hi)-ax.lo)/(ax.hi-ax.lo)*L;           // 값 축 위치(0~L)
  /* 가로 막대에 테두리가 있고 첫 막대에 지시선 글자가 올라가면, 글자가 테두리에 걸리지 않게 위아래 여백을 넓힌다 */
  if(hz&&o.frame&&o.leader&&o.inLbl!=='none'){ let need=0, cnt=0;
    C.forEach((_,j)=>{ const v=V[0][j]; if(!(v>0)) return; const lines=segText(doc,o,C,j,v,norm,o.trans?null:R[0]); if(!lines.length) return;
      const role=lines.length===1&&roleOf(lines[0])==='label'?'label':'seg'; const scale=role==='label'?1.12:1; const t=o.inLbl==='both'?lines.join(' '):lines.join(' ');
      const len=v/(ax.hi-ax.lo)*L; if(!fitLabel(doc,t,role,len-0.7,bw-0.5,scale,0.85)){ need=Math.max(need,tm(doc,role,t,scale).H); cnt++; } });
    /* 지시선 글자는 한 층에 좌우로 둘씩, 많으면 위로 쌓인다 */
    if(need){ const lev=Math.min(3,Math.ceil(cnt/2)); m=Math.max(m,lev*(need+0.6)+1.0); } }
  const span=n*bw+(n-1)*g+2*m;
  const P=hz?(a,b)=>[a,b]:(a,b)=>[b,L-a];                               // (값, 범주) → (x, y)
  const lw=W(doc,0.15), tl=0.8;
  const plot=hz?{x:0,y:0,w:L,h:span}:{x:0,y:0,w:span,h:L};
  /* 격자 */
  if(o.grid) for(const t of ticksOf(ax)){ if(t<=ax.lo+1e-9||t>=ax.hi-1e-9) continue; const a=pos(t); const [x0,y0]=P(a,0), [x1,y1]=P(a,span); ops.seg(x0,y0,x1,y1,W(doc,0.1),{dash:GRID_DASH}); }
  /* 막대 */
  const order=C.map((_,j)=>j); const bars=[];
  R.forEach((r,i)=>{ const c0=m+i*(bw+g); let acc=ax.lo>0?0:0; const segs=[];
    let ord=order.slice(); if(o.sortSeg){ ord.sort((a,b)=>(C[a].other?1:0)-(C[b].other?1:0)||(V[i][b]||0)-(V[i][a]||0)); }
    for(const j of ord){ const v=V[i][j]; if(!(v>0)){ segs.push({j,a0:pos(acc),a1:pos(acc),v:0}); continue; } const a0=pos(acc), a1=pos(acc+v); acc+=v;
      const [x0,y0]=P(a0,c0), [x1,y1]=P(a1,c0+bw); const f=C[j].fill||'white';
      ops.rect(Math.min(x0,x1),Math.min(y0,y1),Math.abs(x1-x0),Math.abs(y1-y0),fillOpts(doc,f));
      segs.push({j,a0,a1,v,f}); }
    bars.push({c0,segs}); });
  /* 연결선 */
  if(o.connect&&!o.sortSeg) for(let i=0;i<n-1;i++){ const A=bars[i], B=bars[i+1];
    for(let k=0;k<C.length-1;k++){ const ea=A.segs[k], eb=B.segs[k]; if(!ea||!eb) continue; const a=ea.a1, b=eb.a1; if(a>=L-1e-6&&b>=L-1e-6) continue;
      const [x0,y0]=P(a,A.c0+bw), [x1,y1]=P(b,B.c0); ops.seg(x0,y0,x1,y1,W(doc,0.1),{dash:[0.55,0.4]}); } }
  /* 테두리·눈금 */
  if(o.frame) ops.rect(0,0,plot.w,plot.h,{stroke:'#000000',sw:lw});
  else { const [x0,y0]=P(0,span), [x1,y1]=P(L,span); if(hz) ops.seg(0,span,L,span,lw); else { ops.seg(0,0,0,L,lw); ops.seg(0,L,span,L,lw); } void x0; void y0; void x1; void y1; }
  const dec=decOf(ax.step); const unit=norm?'%':(doc.data.unit||'');
  const tick=(t,major)=>{ const a=pos(t); const inside=o.frame;
    if(hz){ const yb=span; if(inside){ if(t>ax.lo+1e-9&&t<ax.hi-1e-9) ops.seg(a,yb,a,yb-tl,lw); } else ops.seg(a,yb,a,yb+tl,lw); }
    else { const y=L-a; if(inside){ if(t>ax.lo+1e-9&&t<ax.hi-1e-9) ops.seg(0,y,tl,y,lw); } else ops.seg(0,y,-tl,y,lw); }
    void major; };
  const T=ticksOf(ax); for(const t of T) tick(t,true);
  if(o.minor){ for(let k=0;k<T.length-1;k++) tick((T[k]+T[k+1])/2,false); }
  const tickM=metrics(fontOf(doc,'tick'),'0');
  if(hz){ const yb=span+(o.frame?0:tl)+0.9+tickM.A;
    T.forEach((t,k)=>{ const it=ops.text(fmt(t,dec),pos(t),yb,'tick',{align:'center'}); if(k===T.length-1&&unit&&it) ops.text(`(${unit})`,it.box.x+it.box.w+0.25,yb,'unit'); }); }
  else { let right=-(o.frame?0:tl)-0.8; let topLbl=null;
    T.forEach(t=>{ const it=ops.textMid(fmt(t,dec),right,L-pos(t),'tick',{align:'right'}); if(t===T[T.length-1]) topLbl=it; });
    if(unit&&topLbl){ const um=metrics(fontOf(doc,'unit'),`(${unit})`); ops.text(`(${unit})`,topLbl.box.x+topLbl.box.w/2+0.3,topLbl.box.y-1.0,'unit',{align:'center'}); void um; } }
  /* 범주 이름 */
  R.forEach((r,i)=>{ const c=m+i*(bw+g)+bw/2; const s=lblOf(r);
    if(hz) ops.textMid(s,-1.3,c,'cat',{align:'right'});
    else { const cm=metrics(fontOf(doc,'cat'),s); ops.text(s,c,L+1.2+cm.A,'cat',{align:'center'}); } });
  if(!hz&&o.frame&&o.sepTicks) for(let i=0;i<n-1;i++){ const x=m+i*(bw+g)+bw+g/2; ops.seg(x,L,x,L-tl,lw); }
  /* 막대 안 글자와 지시선 */
  const placed=[]; const leaders=[];
  if(o.inLbl!=='none') bars.forEach((b,i)=>{ for(const s of b.segs){ if(!(s.v>0)) continue; const lines=segText(doc,o,C,s.j,s.v,norm,o.trans?null:R[i]); if(!lines.length) continue;
      const role=lines.length===1&&roleOf(lines[0])==='label'?'label':'seg'; const scale=role==='label'?1.12:1;
      const len=Math.abs(s.a1-s.a0); const maxW=(hz?len:bw)-0.7, maxH=(hz?bw:len)-0.5;
      const L2=o.inLbl==='both'&&hz?[lines.join(' ')]:lines; let fit=null;
      if(o.inLbl==='both'&&!hz){ const bb=block(doc,lines,role,scale); fit=bb.w<=maxW&&bb.h<=maxH?{lines,scale}:null; }
      else fit=fitLabel(doc,L2.join(' '),role,maxW,maxH,scale,0.85);
      const cA=(s.a0+s.a1)/2, cB=b.c0+bw/2; const [cx,cy]=P(cA,cB);
      if(fit){ const bb=putBlock(ops,doc,fit.lines,cx,cy,role,{halo:haloOf(s.f),scale:fit.scale}); placed.push({x:cx-bb.w/2,y:cy-bb.h/2,w:bb.w,h:bb.h}); }
      else if(o.leader) leaders.push({i,s,txt:L2.join(' '),role,scale,cx,cy,c0:b.c0}); } });
  const barBox=i=>{ const c0=bars[i].c0; return hz?{x:0,y:c0,w:L,h:bw}:{x:c0,y:0,w:bw,h:L}; };
  const hit=(box,own)=>placed.some(p=>GG.overlap(p,box,0.6)>0)||bars.some((_,k)=>k!==own&&GG.overlap(barBox(k),box,0.3)>0)||(hz?false:box.x+box.w>plot.w+40);
  leaders.sort((p,q)=>p.i-q.i||(hz?p.cx-q.cx:q.cy-p.cy));
  leaders.forEach((ld,k)=>{ const same=leaders.filter(x=>x.i===ld.i); ld.first=same[0]===ld&&same.length>1; void k; });
  for(const ld of leaders){ const m2=tm(doc,ld.role,ld.txt,ld.scale); const lw2=W(doc,0.12);
    if(hz){ const yTop=ld.c0; let done=false;
      for(let lev=0;lev<3&&!done;lev++){ const yl=yTop-1.0-lev*(m2.H+0.6);
        for(const side of (ld.first?[-1,1]:[1,-1])){ const x0=ld.cx+side*1.7; const bx=side>0?x0+0.3:x0-0.3-m2.W; const box={x:bx,y:yl-m2.A,w:m2.W,h:m2.H};
          if(hit(box,ld.i)) continue;
          const ym=yl-m2.A/2+m2.D/2; ops.line([[ld.cx,ld.cy],[ld.cx,ym],[x0,ym]],lw2);
          put(ops,doc,ld.txt,side>0?x0+0.3:x0-0.3,yl,ld.role,{align:side>0?'left':'right',scale:ld.scale}); placed.push(box); done=true; break; } }
      if(!done) ax.hidden.push(ld.txt); }
    else { let done=false;
      for(const side of [1,-1]){ if(done) break; const xe=side>0?ld.c0+bw:ld.c0; for(let k=0;k<7&&!done;k++){ const dy=[0,-1,1,-2,2,-3,3][k]*(m2.H+0.5); const yc=ld.cy+dy;
          const tx=xe+side*1.9; const box={x:side>0?tx:tx-m2.W,y:yc-m2.H/2,w:m2.W,h:m2.H}; if(hit(box,ld.i)) continue;
          ops.line([[ld.cx,ld.cy],[xe+side*0.5,ld.cy],[xe+side*1.5,yc]],lw2); put(ops,doc,ld.txt,tx,yc+(m2.A-m2.D)/2,ld.role,{align:side>0?'left':'right',scale:ld.scale}); placed.push(box); done=true; } }
      if(!done) ax.hidden.push(ld.txt); } }
  /* 범례 */
  let items=C.map((c,j)=>TR.shown[j]?{text:lblOf(c),fill:c.fill||'white'}:null).filter(Boolean);
  if(!hz&&o.legend==='right') items=items.slice().reverse();
  return {ops,plot,legend:o.legend,items,stackNote:norm};
}

/* ───────── ② 도넛 ───────── */
const angPt=(r,t)=>[r*Math.sin(t),-r*Math.cos(t)];
function arcPts(r,a0,a1){ const n=Math.max(2,Math.ceil(Math.abs(a1-a0)/(Math.PI/180))); const out=[]; for(let k=0;k<=n;k++) out.push(angPt(r,a0+(a1-a0)*k/n)); return out; }
function inSlice(x,y,rr,R,a0,a1,pad){ const d=Math.hypot(x,y); if(d<rr+pad||d>R-pad) return false; let t=Math.atan2(x,-y); if(t<0) t+=Math.PI*2; const span=a1-a0; let rel=t-a0; if(rel<0) rel+=Math.PI*2; const padA=pad/Math.max(d,0.1); return rel>=padA&&rel<=span-padA; }
function composeDonut(doc){
  const o=doc.donut; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null;
  const ops=new Ops(doc); const Rr=o.size/2, rr=Rr*clamp(+o.hole||0,0,0.85);
  const subs=[];
  const TR=trimM(doc,M,C);
  R.forEach((r,i)=>{ const sub=new Ops(doc); const vals=TR.M[i].map(v=>fin(v)&&v>0?v:0); const tot=sum(vals); if(!(tot>0)) return;
    let ord=C.map((_,j)=>j); if(o.sortSeg) ord.sort((a,b)=>(C[a].other?1:0)-(C[b].other?1:0)||vals[b]-vals[a]);
    let a=0; const sl=[];
    for(const j of ord){ const fr=vals[j]/tot; if(fr<=0) continue; const a0=a, a1=a+fr*Math.PI*2; a=a1;
      const pts=arcPts(Rr,a0,a1).concat(rr>0?arcPts(rr,a1,a0):[[0,0]]); const f=C[j].fill||'white';
      sub.poly(pts,fillColor(doc,f),{pat:patOf(f),ps:doc.style.patScale||1,stroke:'#000000',sw:W(doc,0.12)}); sl.push({j,a0,a1,fr,f}); }
    /* 가운데 글자 */
    const hole=2*rr*0.86;
    if(rr>0&&o.center!=='none'){ let lines=[], role='legend', bold=false;
      if(o.center==='row'){ lines=[lblOf(r)]; bold=true; role=roleOf(lines[0])==='label'?'label':'legend'; }
      else if(o.center==='total'){ lines=[o.totalLabel||'합계',fmtNum(tot,o.totalDec||0,true),`(${doc.data.unit||''})`]; }
      else if(o.center==='custom'){ lines=String(r.ctext||'').split(/\n|\//).map(s=>s.trim()).filter(Boolean); }
      if(lines.length){ let sc=role==='legend'?1.18:1.1; for(let k=0;k<8;k++){ const b=block(doc,lines,role,sc); if(b.w<=hole&&b.h<=hole*0.92) break; sc*=0.92; }
        if(o.center==='total'){ const parts=lines.map((l,k)=>({l,rl:k===1?'label':'legend',sc:sc*(k===1?1.0:0.86)})); parts.forEach(pt=>pt.m=tm(doc,pt.rl,'가0',pt.sc));
          const gapL=0.55; const H=sum(parts.map(pt=>pt.m.H))+gapL*(parts.length-1); let y=-H/2;
          for(const pt of parts){ put(sub,doc,pt.l,0,y+pt.m.A,pt.rl,{align:'center',scale:pt.sc}); y+=pt.m.H+gapL; } }
        else putBlock(sub,doc,lines,0,0,role,{scale:sc,bold}); } }
    /* 조각 글자 */
    const placed=[]; const lead=[];
    if(o.inLbl!=='none') for(const s of sl){ const vt=shareTxt(o,s.fr*100,s===sl[0]); const z=zeroTxt(s.fr*100,o.dec); const nm=cellName(doc,r,C[s.j]);
      const lines=o.inLbl==='name'?[nm]:o.inLbl==='value'?(z?[]:[vt]):(z?[nm]:[nm,vt]); if(!lines.length) continue;
      const role=lines.length===1&&roleOf(lines[0])==='label'?'label':'seg'; const scale=role==='label'?1.04:1;
      const tmid=(s.a0+s.a1)/2; const rm=rr>0?(rr+Rr)/2:Rr*0.62; const [cx,cy]=angPt(rm,tmid);
      const tryLines=[lines, lines.length===1?(wrapFit(doc,lines[0],role,(Rr-rr)*0.95,(Rr-rr)*0.95,scale)||lines):lines];
      let ok=null; for(const Ls of tryLines){ const b=block(doc,Ls,role,scale); const c=[[cx-b.w/2,cy-b.h/2],[cx+b.w/2,cy-b.h/2],[cx-b.w/2,cy+b.h/2],[cx+b.w/2,cy+b.h/2],[cx,cy-b.h/2],[cx,cy+b.h/2],[cx-b.w/2,cy],[cx+b.w/2,cy]];
        if(c.every(p=>inSlice(p[0],p[1],rr,Rr,s.a0,s.a1,0.25))){ ok=Ls; break; } }
      if(ok) putBlock(sub,doc,ok,cx,cy,role,{halo:haloOf(s.f),scale});
      else if(o.leader) lead.push({s,txt:lines.join(' '),role,scale,t:tmid}); }
    /* 지시선: 왼쪽 반은 왼쪽 위로, 오른쪽 반은 오른쪽으로 */
    const sides={L:[],Rt:[]};
    for(const ld of lead){ const rp=rr>0?rr+(Rr-rr)*0.62:Rr*0.75; const [px,py]=angPt(rp,ld.t); ld.p=[px,py]; const side=px<0?'L':'Rt'; ld.want=py+(py<0?-2.6:2.6); sides[side].push(ld); }
    for(const key of ['L','Rt']){ const arr=sides[key].sort((a,b)=>a.want-b.want); const mH=tm(doc,'seg','가').H+0.9;
      const top=arr.filter(ld=>ld.want<0), bot=arr.filter(ld=>ld.want>=0);
      let prev=Infinity; for(let k=top.length-1;k>=0;k--){ top[k].y=Math.min(top[k].want,prev-mH); prev=top[k].y; }
      prev=-Infinity; for(const ld of bot){ ld.y=Math.max(ld.want,prev+mH); prev=ld.y; }
      for(const ld of arr){ const m2=tm(doc,ld.role,ld.txt,ld.scale); const ex=key==='L'?-(Rr+2.2):(Rr+2.2); const ym=ld.y;
        const edge=key==='L'?Math.min(ex,ld.p[0]-1.2):Math.max(ex,ld.p[0]+1.2);
        sub.line([[ld.p[0],ld.p[1]],[ld.p[0],ym],[edge,ym]],W(doc,0.12));
        put(sub,doc,ld.txt,key==='L'?edge-0.5:edge+0.5,ym+(m2.A-m2.D)/2,ld.role,{align:key==='L'?'right':'left',scale:ld.scale}); void placed; } }
    /* 위 라벨 */
    if(o.top==='lbl') sub.topLbl=lblOf(r);   /* 위 라벨은 줄마다 높이를 맞춰 아래에서 단다 */
    subs.push(sub); });
  if(!subs.length) return null;
  const per=o.cols>0?o.cols:subs.length; const gap=o.gap; let y=0;
  for(let r0=0;r0<subs.length;r0+=per){ /* 한 줄의 원 중심(0, 0)을 같은 높이에 */ const row=subs.slice(r0,r0+per); const bs=row.map(s=>s.bounds());
    const up=Math.max(...bs.map(b=>-b.y)), down=Math.max(...bs.map(b=>b.y+b.h)); let x=0;
    const tm1=metrics(fontOf(doc,'cat',1.1),'가'); const th=row.some(s=>s.topLbl)?tm1.H+1.6:0;
    row.forEach((sub,k)=>{ const b=bs[k]; const lb=sub.topLbl; ops.absorb(sub,x-b.x,y+th+up); if(lb) ops.text(lb,x-b.x,y+th-1.6-tm1.D,'cat',{align:'center',scale:1.1}); x+=b.w+gap; }); y+=th+up+down+gap; }
  const B=ops.bounds();
  return {ops,plot:{x:B.x,y:B.y,w:B.w,h:B.h},legend:o.legend,items:C.map((c,j)=>TR.shown[j]?{text:lblOf(c),fill:c.fill||'white'}:null).filter(Boolean),donut:true};
}

/* ───────── ③ 면적 비율(정사각형) ───────── */
function largestRemainder(vals,total){ const s=sum(vals); if(!(s>0)) return vals.map(()=>0); const raw=vals.map(v=>v/s*total); const out=raw.map(Math.floor); let left=total-sum(out);
  raw.map((v,i)=>[v-Math.floor(v),i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{ if(left>0){ out[i]++; left--; } }); return out; }
function squarifyRows(areas,w,h){ /* 줄(strip) 목록: {items:[k..], vertical:bool} */
  const rows=[]; let rect={w,h}; let row=[]; let i=0;
  const worst=(rw,side)=>{ const s=sum(rw.map(r=>r.a)); if(!(s>0)) return Infinity; const mx=Math.max(...rw.map(r=>r.a)), mn=Math.min(...rw.map(r=>r.a)); return Math.max(side*side*mx/(s*s),s*s/(side*side*Math.max(mn,1e-9))); };
  const flush=()=>{ const s=sum(row.map(r=>r.a)); const vert=rect.w>=rect.h; rows.push({items:row.map(r=>r.k),vertical:vert}); if(vert) rect={w:rect.w-s/rect.h,h:rect.h}; else rect={w:rect.w,h:rect.h-s/rect.w}; row=[]; };
  while(i<areas.length){ const side=Math.min(rect.w,rect.h); const cand=row.concat([areas[i]]); if(!row.length||worst(cand,side)<=worst(row,side)){ row=cand; i++; } else flush(); }
  if(row.length) flush(); return rows;
}
function gridLayout(counts,G){ /* counts: [{k,n}] 순서대로. 칸 번호 → k */
  const owner=new Array(G*G).fill(null); let free=[]; for(let y=0;y<G;y++) for(let x=0;x<G;x++) free.push([x,y]);
  const rows=squarifyRows(counts.filter(c=>c.n>0).map(c=>({k:c.k,a:c.n})),G,G); const N={}; counts.forEach(c=>N[c.k]=c.n);
  for(const r of rows){ const need=sum(r.items.map(k=>N[k]));
    free.sort(r.vertical?(a,b)=>a[0]-b[0]||a[1]-b[1]:(a,b)=>a[1]-b[1]||a[0]-b[0]);
    const strip=free.slice(0,need); free=free.slice(need);
    strip.sort(r.vertical?(a,b)=>a[1]-b[1]||a[0]-b[0]:(a,b)=>a[0]-b[0]||a[1]-b[1]);
    let p=0; for(const k of r.items){ for(let t=0;t<N[k];t++,p++){ const c=strip[p]; if(c) owner[c[1]*G+c[0]]=k; } } }
  return owner;
}
function maxRect(cells,G){ /* cells: Set of idx → 가장 큰 직사각형 [x,y,w,h] (칸 단위) */
  const hgt=new Array(G).fill(0); let best=[0,0,1,1,0];
  for(let y=0;y<G;y++){ for(let x=0;x<G;x++) hgt[x]=cells.has(y*G+x)?hgt[x]+1:0;
    for(let x=0;x<G;x++){ let mh=Infinity; for(let x2=x;x2<G&&hgt[x2]>0;x2++){ mh=Math.min(mh,hgt[x2]); const w=x2-x+1; const sc=w*mh*(1+0.15*Math.min(w,mh)/Math.max(w,mh)); if(sc>best[4]) best=[x,y-mh+1,w,mh,sc]; } } }
  return best.slice(0,4);
}
function composeTree(doc){
  const o=doc.tree; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null; const hidden=[]; LAST.tree={hidden};
  const ops=new Ops(doc); const S=o.size, G=10; const subs=[];
  const TR=trimM(doc,M,C);
  R.forEach((r,i)=>{ const sub=new Ops(doc); const vals=TR.M[i].map(v=>fin(v)&&v>0?v:0); if(!(sum(vals)>0)) return;
    let ord=C.map((_,j)=>j).filter(j=>vals[j]>0); if(o.sort!==false) ord.sort((a,b)=>(C[a].other?1:0)-(C[b].other?1:0)||vals[b]-vals[a]);
    const cell=S/G; const areas={}; const labelAt={};
    if(o.layout==='rect'){ const tot=sum(ord.map(j=>vals[j])); const rows=squarifyRows(ord.map(j=>({k:j,a:vals[j]/tot*S*S})),S,S); let rect={x:0,y:0,w:S,h:S};
      for(const rw of rows){ const s=sum(rw.items.map(j=>vals[j]/tot*S*S));
        if(rw.vertical){ const cw=s/rect.h; let yy=rect.y; for(const j of rw.items){ const hh=vals[j]/tot*S*S/cw; areas[j]=[[rect.x,yy,cw,hh]]; labelAt[j]=[rect.x,yy,cw,hh]; yy+=hh; } rect={x:rect.x+cw,y:rect.y,w:rect.w-cw,h:rect.h}; }
        else { const rh=s/rect.w; let xx=rect.x; for(const j of rw.items){ const ww=vals[j]/tot*S*S/rh; areas[j]=[[xx,rect.y,ww,rh]]; labelAt[j]=[xx,rect.y,ww,rh]; xx+=ww; } rect={x:rect.x,y:rect.y+rh,w:rect.w,h:rect.h-rh}; } }
      for(const j of ord){ const f=C[j].fill||'light'; const a=areas[j][0]; sub.rect(a[0],a[1],a[2],a[3],fillOpts(doc,f)); } }
    else { const n=largestRemainder(ord.map(j=>vals[j]),G*G); const counts=ord.map((j,k)=>({k:j,n:n[k]})); const owner=gridLayout(counts,G);
      for(const j of ord){ const cells=new Set(); owner.forEach((k,idx)=>{ if(k===j) cells.add(idx); }); if(!cells.size) continue;
        const rects=[...cells].map(idx=>[(idx%G)*cell,Math.floor(idx/G)*cell,cell,cell]); const f=C[j].fill||'light';
        sub.region(rects,fillColor(doc,f),{pat:patOf(f),ps:doc.style.patScale||1});
        const mr=maxRect(cells,G); labelAt[j]=[mr[0]*cell,mr[1]*cell,mr[2]*cell,mr[3]*cell]; }
      /* 경계선: 주인이 다른 이웃 칸 사이 */
      const segs=[]; const own=(x,y)=>x<0||y<0||x>=G||y>=G?undefined:owner[y*G+x];
      for(let y=0;y<G;y++) for(let x=0;x<G;x++){ const k=own(x,y); if(x<G-1&&own(x+1,y)!==k) segs.push(['v',x+1,y]); if(y<G-1&&own(x,y+1)!==k) segs.push(['h',y+1,x]); }
      const vmap={}, hmap={}; for(const s of segs){ (s[0]==='v'?vmap:hmap)[s[1]]=((s[0]==='v'?vmap:hmap)[s[1]]||[]).concat([s[2]]); }
      const lw=W(doc,0.12);
      for(const [xs,arr] of Object.entries(vmap)){ arr.sort((a,b)=>a-b); let s0=arr[0], p=arr[0]; for(let q=1;q<=arr.length;q++){ if(arr[q]===p+1){ p=arr[q]; continue; } sub.seg(+xs*cell,s0*cell,+xs*cell,(p+1)*cell,lw,{cap:'square'}); s0=arr[q]; p=arr[q]; } }
      for(const [ys,arr] of Object.entries(hmap)){ arr.sort((a,b)=>a-b); let s0=arr[0], p=arr[0]; for(let q=1;q<=arr.length;q++){ if(arr[q]===p+1){ p=arr[q]; continue; } sub.seg(s0*cell,+ys*cell,(p+1)*cell,+ys*cell,lw,{cap:'square'}); s0=arr[q]; p=arr[q]; } } }
    sub.rect(0,0,S,S,{stroke:'#000000',sw:W(doc,0.15)});
    /* 칸 이름 */
    const firstJ=ord.find(j=>labelAt[j]);
    if(o.inLbl!=='none') for(const j of ord){ const a=labelAt[j]; if(!a) continue; const share=vals[j]/sum(vals)*100; const vt=shareTxt(o,share,j===firstJ); const z=zeroTxt(share,o.dec); const nm=cellName(doc,r,C[j]);
      const base=o.inLbl==='value'?(z?null:[vt]):o.inLbl==='both'?(z?[nm]:[nm,vt]):[nm]; if(!base) continue;
      const role=base.length===1&&roleOf(base[0])==='label'?'label':'seg';
      /* 칸 안에 들어가는 모양을 차례로 찾는다: 두 줄 → 한 줄 → 더 작게 → (둘 다일 때) 이름만. 끝내 안 들어가면 비우고 편집기에 알린다 */
      const fitsB=(L,sc)=>{ const b=block(doc,L,role,sc); return b.w<=a[2]-0.5&&b.h<=a[3]-0.3; };
      const ch=[...base[0]]; const h2=Math.ceil(ch.length/2); const split=ch.length>=4?[ch.slice(0,h2).join(''),ch.slice(h2).join('')]:null;
      const tries=o.inLbl==='both'?[[base,[1,0.9,0.8]],[[base.join(' ')],[1,0.9,0.8]],[base,[0.7,0.62]],[[base.join(' ')],[0.7,0.62]],[[base[0]],[0.8,0.7,0.62]]]
        :[[base,[1,0.9,0.8,0.7]],...(split?[[split,[0.8,0.7,0.62,0.55]]]:[]),[base,[0.62,0.55]]];
      let fit=null; for(const [L,scs] of tries){ for(const sc of scs){ if(fitsB(L,sc)){ fit={lines:L,scale:sc}; break; } } if(fit) break; }
      if(!fit){ hidden.push(nm); continue; }
      putBlock(sub,doc,fit.lines,a[0]+a[2]/2,a[1]+a[3]/2,role,{halo:haloOf(C[j].fill),scale:fit.scale}); }
    if(o.top==='lbl'){ const s=lblOf(r); const mm=metrics(fontOf(doc,'cat',1.15),s); sub.text(s,S/2,-1.6-mm.D,'cat',{align:'center',scale:1.15}); }
    subs.push(sub); });
  if(!subs.length) return null;
  const per=o.cols>0?o.cols:subs.length; let x=0,y=0,rowH=0,col=0;
  subs.forEach(sub=>{ const b=sub.bounds(); if(col>=per){ col=0; x=0; y+=rowH+o.gap+2; rowH=0; } ops.absorb(sub,x,y); x+=S+o.gap; rowH=Math.max(rowH,b.h); col++; });
  const B=ops.bounds();
  return {ops,plot:{x:B.x,y:B.y,w:B.w,h:B.h},legend:o.legend||'none',items:C.map((c,j)=>TR.shown[j]?{text:lblOf(c),fill:c.fill||'light'}:null).filter(Boolean)};
}

/* ───────── ④ 묶은 막대 ───────── */
function axisFrom(conf,vals,o){ if(conf&&conf.auto===false&&fin(+conf.lo)&&fin(+conf.hi)&&+conf.hi>+conf.lo&&+conf.step>0) return {lo:+conf.lo,hi:+conf.hi,step:+conf.step}; return autoAxis(vals,o); }
function composeGroup(doc){
  const o=doc.group; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null;
  const vals=M.flat().filter(fin); const ax=axisFrom(o.axis,[0,...vals],{zero:true,target:3,head:true}); LAST.group=ax;
  const ops=new Ops(doc); const k=C.length, bw=o.barW, inner=o.inner||0, gw=k*bw+(k-1)*inner; const n=R.length;
  const lw1=t=>metrics(fontOf(doc,'cat'),t).W; const two=t=>{ const ch=[...t.replace(/\s+/g,'')]; if(ch.length<4) return lw1(t); const ws=t.split(/\s+/); if(ws.length>1){ const h2=Math.ceil(ws.length/2); return Math.max(lw1(ws.slice(0,h2).join(' ')),lw1(ws.slice(h2).join(' '))); } const h2=Math.ceil(ch.length/2); return Math.max(lw1(ch.slice(0,h2).join('')),lw1(ch.slice(h2).join(''))); };
  const need=Math.max(...R.map(r=>{ const t=lblOf(r); return Math.min(lw1(t),two(t)); })); const g=Math.max(o.gap,need+0.8-gw); const m=g*0.55;
  const span=m*2+n*gw+(n-1)*g; const H=o.len; const yv=v=>H-(clamp(v,ax.lo,ax.hi)-ax.lo)/(ax.hi-ax.lo)*H; const lw=W(doc,0.15);
  if(o.grid) for(const t of ticksOf(ax)){ if(t<=ax.lo+1e-9||t>=ax.hi-1e-9) continue; ops.seg(0,yv(t),span,yv(t),W(doc,0.1),{dash:GRID_DASH}); }
  const y0=yv(Math.max(ax.lo,Math.min(0,ax.hi)));
  R.forEach((r,i)=>{ const gx=m+i*(gw+g); C.forEach((c,j)=>{ const v=M[i][j]; if(!fin(v)) return; const x=gx+j*(bw+inner); const y=yv(v); ops.rect(x,Math.min(y,y0),bw,Math.abs(y0-y),fillOpts(doc,c.fill||'white'));
      if(o.values){ const s=fmtNum(v,o.dec,true); const mm=metrics(fontOf(doc,'value'),s); ops.text(s,x+bw/2,Math.min(y,y0)-0.6,'value',{align:'center'}); void mm; }
      else if(o.barLbl){ /* 범례 대신 막대 위에 열 라벨 */ const t=lblOf(c); const role=roleOf(t)==='label'?'label':'value'; ops.text(t,x+bw/2,(v>=0?Math.min(y,y0):Math.max(y,y0)+metrics(fontOf(doc,role),t).H+0.6)-0.6,role,{align:'center',halo:'w'}); } });
    const s=lblOf(r); const fit=fitLabel(doc,s,'cat',gw+g-0.5,99,1,1)||{lines:[s],scale:1}; const bb=block(doc,fit.lines,'cat',1); putBlock(ops,doc,fit.lines,gx+gw/2,H+1.1+bb.h/2,'cat',{}); });
  if(o.frame) ops.rect(0,0,span,H,{stroke:'#000000',sw:lw}); else { ops.seg(0,0,0,H,lw); ops.seg(0,H,span,H,lw); }
  const dec=decOf(ax.step); let top=null;
  for(const t of ticksOf(ax)){ const y=yv(t); if(t>ax.lo+1e-9&&t<ax.hi-1e-9) ops.seg(0,y,o.frame?0.8:-0.8,y,lw); const it=ops.textMid(fmt(t,dec),-0.9,y,'tick',{align:'right'}); if(t===ax.hi) top=it; }
  if(top&&doc.data.unit){ const u=`(${doc.data.unit})`; ops.text(u,top.box.x,top.box.y-1.0,'unit'); }
  for(let i=0;i<n-1;i++){ const x=m+i*(gw+g)+gw+g/2; ops.seg(x,H,x,H-0.8,lw); }
  const rects=[]; R.forEach((r,i)=>{ const gx=m+i*(gw+g); C.forEach((c,j)=>{ const v=M[i][j]; if(fin(v)) rects.push({x:gx+j*(bw+inner),y:Math.min(yv(v),y0),w:bw,h:Math.abs(y0-yv(v))}); }); });
  return {ops,plot:{x:0,y:0,w:span,h:H},legend:o.legend,items:C.map(c=>({text:lblOf(c),fill:c.fill||'white'})),obstacles:rects};
}

/* ───────── ⑤ 상댓값 소형 막대 ───────── */
function composeSmall(doc){
  const o=doc.small; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null;
  const ops=new Ops(doc); const n=R.length; const lw=W(doc,0.15);
  const V=C.map((c,j)=>{ const col=R.map((_,i)=>M[i][j]); if(!o.rel) return col; const mx=Math.max(...col.filter(fin)); return col.map(v=>fin(v)&&mx>0?v/mx*100:null); });
  const ax=o.rel&&o.axis.auto!==false?{lo:0,hi:100,step:20}:axisFrom(o.axis,[0,...V.flat().filter(fin)],{zero:true,target:5}); LAST.small=ax;
  const twoW=Math.max(...R.map(r=>{ const sp=splits(lblOf(r)).filter(L=>L.length<=2); return Math.min(...sp.map(L=>block(doc,L,'cat',1).w)); }));
  const pw=Math.max(o.pw,n*(twoW+0.6)), ph=o.ph; const yv=v=>ph-(clamp(v,ax.lo,ax.hi)-ax.lo)/(ax.hi-ax.lo)*ph; let x=0; const dec=decOf(ax.step);
  C.forEach((c,j)=>{ const sub=new Ops(doc);
    if(o.grid) for(const t of ticksOf(ax)){ if(t<=ax.lo+1e-9||t>=ax.hi-1e-9) continue; sub.seg(0,yv(t),pw,yv(t),W(doc,0.1),{dash:GRID_DASH}); }
    const slot=pw/n; R.forEach((r,i)=>{ const v=V[j][i]; const cx=slot*(i+0.5); if(fin(v)&&v>0) sub.rect(cx-o.barW/2,yv(v),o.barW,ph-yv(v),fillOpts(doc,c.fill||'black'));
      const s=lblOf(r); const fit=fitLabel(doc,s,'cat',slot-0.3,99,1,0.85)||{lines:splits(s).filter(L=>L.length<=2).pop(),scale:1}; const bb=block(doc,fit.lines,'cat',fit.scale); putBlock(sub,doc,fit.lines,cx,ph+1.1+bb.h/2,'cat',{scale:fit.scale}); });
    sub.rect(0,0,pw,ph,{stroke:'#000000',sw:lw});
    for(const t of ticksOf(ax)) sub.textMid(fmt(t,dec),-0.9,yv(t),'tick',{align:'right'});
    const tt=lblOf(c); const tmm=metrics(fontOf(doc,'title'),tt); sub.text(tt,pw/2,-1.8-tmm.D,'title',{align:'center'});
    const b=sub.bounds(); ops.absorb(sub,x-b.x+(j?0:0),0); x+=b.w+o.gap; });
  const B=ops.bounds(); return {ops,plot:{x:B.x,y:0,w:B.w,h:ph},legend:'none',items:[],small:true};
}

/* ───────── ⑥ 표 ───────── */
function composeTable(doc){
  const o=doc.tb; const {R,C,M}=derive(doc); if(!R.length||!C.length) return null;
  const ops=new Ops(doc); let rows, once=null;
  const head=s=>({t:s,role:'th'}), cellT=s=>({t:s,role:'td'}), num=s=>({t:s,role:'td',num:true});
  const unit=o.mode==='pct'?'%':(doc.data.unit||'');
  if(o.mode==='rank'){ const N=Math.max(1,Math.min(10,o.rankN||3));
    rows=[[head('순위'),...C.map(c=>cellT(lblOf(c)))]];
    for(let k=0;k<N;k++) rows.push([cellT(`${k+1}위`),...C.map((c,j)=>{ const arr=R.map((r,i)=>[M[i][j],lblOf(r)]).filter(a=>fin(a[0])).sort((a,b)=>b[0]-a[0]); return cellT(arr[k]?arr[k][1]:''); })]); }
  else { const V=o.mode==='pct'?M.map(pctRow):M;
    /* 열마다 단위·소수 자리를 따로 둘 수 있다(c.unit, c.dec) */
    const uOf=c=>o.mode!=='pct'&&c.unit!=null&&c.unit!==''?c.unit:unit;
    /* 모든 열의 단위가 같으면 표 위(또는 아래) 오른쪽에 한 번만 적는다(2025학년도 수능 8번 ‘(만 명)’) */
    const U=C.map(uOf); const uni=U.length>0&&!!U[0]&&U.every(u=>u===U[0]); const pos=unitPosOf(o,uni);
    if(pos!=='head') once={pos,s:o.unitStyle==='paren'?`(${U[0]})`:`(단위: ${U[0]})`};
    rows=[[head(o.rowHead||'구분'),...C.map(c=>({t:lblOf(c),role:'th',unit:!once&&uOf(c)?`(${uOf(c)})`:'',line:o.unitLine}))]];
    R.forEach((r,i)=>rows.push([cellT(lblOf(r)),...C.map((c,j)=>num(fmtNum(V[i][j],c.dec!=null&&c.dec!==''&&o.mode!=='pct'?+c.dec:o.dec,o.comma)))])); }
  const gm=metrics(fontOf(doc,'td'),'가'); const lineH=gm.H*1.32, padV=1.25, padH=2.4;
  const linesOf=c=>c.unit?(c.line?[[c.t,'th'],[c.unit,'td']]:[[c.t+' '+c.unit,'th']]):[[c.t,c.role]];
  const cw=c=>Math.max(...linesOf(c).map(([t,rl])=>metrics(fontOf(doc,rl),t).W));
  const nC=rows[0].length; const colW=[], numW=[];
  for(let c=0;c<nC;c++){ let w=0,nw=0; for(const r of rows){ w=Math.max(w,cw(r[c])); if(r[c].num) nw=Math.max(nw,cw(r[c])); } colW[c]=Math.max(w+2*padH,c===0?10:13); numW[c]=nw; }
  if(nC>1){ const mx=Math.max(...colW.slice(1)); for(let c=1;c<nC;c++) colW[c]=mx; }
  const rowH=rows.map(r=>Math.max(...r.map(c=>linesOf(c).length))*lineH+2*padV);
  const X=[0]; colW.forEach(w=>X.push(X[X.length-1]+w)); const Y=[0]; rowH.forEach(h=>Y.push(Y[Y.length-1]+h)); const TW=X[nC], TH=Y[rows.length];
  ops.rect(0,0,TW,rowH[0],{fill:gray(Math.max(doc.style.light,222))});
  if(o.mode==='rank') ops.rect(0,0,colW[0],TH,{fill:gray(Math.max(doc.style.light,222))});
  rows.forEach((r,ri)=>r.forEach((c,ci)=>{ const x0=X[ci], w=colW[ci], yc=Y[ri]+rowH[ri]/2;
    if(c.num){ ops.text(c.t,x0+(w+numW[ci])/2,yc+(gm.A-gm.D)/2,'td',{align:'right'}); return; }
    const L=linesOf(c); L.forEach(([t,rl],li)=>ops.text(t,x0+w/2,yc+(li-(L.length-1)/2)*lineH+(gm.A-gm.D)/2,rl,{align:'center'})); }));
  for(let r=1;r<rows.length;r++) ops.seg(0,Y[r],TW,Y[r],W(doc,0.12));
  for(let c=1;c<nC;c++) ops.seg(X[c],0,X[c],TH,W(doc,0.12));
  ops.rect(0,0,TW,TH,{stroke:'#000000',sw:W(doc,0.16)});
  if(once){ const m=metrics(fontOf(doc,'unit'),once.s); if(once.pos==='top') ops.text(once.s,TW,-1.0-m.D,'unit',{align:'right'}); else ops.text(once.s,TW,TH+1.0+m.A,'unit',{align:'right'}); }
  return {ops,plot:{x:0,y:0,w:TW,h:TH},legend:'none',items:[]};
}
/* 표 단위 위치: auto면 모든 열 단위가 같을 때 표 위, 다르면 열 머리. 위·아래를 골라도 단위가 다르면 열 머리에 적는다 */
function unitPosOf(o,uni){ const p=o.unitPos||'auto'; if(!uni) return 'head'; return p==='auto'?'top':p; }
function tableUnits(doc){ const o=doc.tb; if(o.mode==='rank') return {uni:false,units:[]}; const {C}=derive(doc); const unit=o.mode==='pct'?'%':(doc.data.unit||'');
  const U=C.map(c=>o.mode!=='pct'&&c.unit!=null&&c.unit!==''?c.unit:unit); return {uni:U.length>0&&!!U[0]&&U.every(u=>u===U[0]),units:U,pos:unitPosOf(o,U.length>0&&!!U[0]&&U.every(u=>u===U[0]))}; }
/* 범례를 켰는데 칸 무늬가 모두 같으면 구분이 안 되므로 서로 다른 무늬를 준다(기타는 흰색 그대로) */
function distinctFills(doc){ const C=doc.data.cols.filter(c=>!c.hide&&!c.other); if(C.length<2) return false;
  if(new Set(C.map(c=>c.fill||'light')).size>1) return false; const F=['light','dark','fs','dot','mid','bs','vl','hl','zz','sdot','xx','black'];
  C.forEach((c,j)=>c.fill=F[j%F.length]); return true; }
/* 칸 글자가 비율뿐이면 무엇인지 알 수 없다: 편집기 경고 */
function labelWarn(doc){ const k=doc.kind;
  if(k==='stack'){ const H=LAST.stack&&LAST.stack.hidden||[]; return H.length?[`좁은 칸 ${H.length}개(${H.slice(0,4).join(', ')}${H.length>4?' …':''})는 지시선 글자를 놓을 자리가 없어 비웠어요. 막대 간격을 넓히거나 범례를 켜 주세요.`]:[]; }
  if(k!=='tree'&&k!=='donut') return []; const o=doc[k];
  const hid=k==='tree'&&LAST.tree&&LAST.tree.hidden.length?[`${[...new Set(LAST.tree.hidden)].join(', ')} 칸은 좁아서 글자를 넣지 못했어요. 한 변을 키우거나, 칸 글자를 ‘이름’만 쓰거나, 범례를 켜 주세요.`]:[];
  if(o.legend&&o.legend!=='none') return hid;
  if(o.inLbl==='value'||o.inLbl==='none') return [`칸에 ${o.inLbl==='none'?'글자가 없어':'비율만 있어'} 어느 칸이 무엇인지 알 수 없어요. 범례를 켜거나, 칸 글자를 ‘이름’ 또는 ‘둘 다’로 바꿔 주세요(표의 라벨 칸에 A, B…를 적으면 이름 대신 기호가 들어가요).`];
  return hid; }

/* ───────── 주석 · 연도 · 출처 ───────── */
function namesSorted(arr){ return arr.slice().sort((a,b)=>a.localeCompare(b,'ko')); }
function autoNotes(doc){
  const out=[]; const D=doc.data; const k=doc.kind; const {R,C}=derive(doc);
  if(D.note) out.push(...String(D.note).split('\n').map(x=>x.trim()).filter(Boolean));
  if(k==='stack'&&doc.stack.norm!==false){ const tr=doc.stack.trans; const segs=tr?R:C; const ms=D.measure?`${D.measure} `:'';
    if(tr&&segs.length>1&&D.noteSum!==false) out.push(`${D.itemNoun||'에너지원'}별 ${KN[segs.length]||segs.length} ${D.rowNoun||'지역'}의 ${ms}합을 100%로 하여 나타냄.`);
    else if(!tr&&segs.length>1&&!segs.some(s=>s.other)&&(D.noteSum===true||(D.noteSum==null&&false))) out.push(`${namesSorted(segs.map(s=>s.name)).join(', ')}의 ${ms}합을 100%로 하여 나타냄.`); }
  if(k==='donut'&&C.length>1&&!C.some(s=>s.other)&&D.noteSum===true&&D.measure){ out.push(`${namesSorted(C.map(s=>s.name)).join(', ')}의 ${D.measure} 합을 100%로 하여 나타냄.`); }
  if(k==='small'&&doc.small.rel){ const n=R.length; const nn=D.rowNoun||'국가'; const ms=D.measure||'값'; out.push(`${KN[n]||n} ${nn} 중 ${D.itemNoun||'항목'}별 ${ms}이 가장 ${D.measure?'많은':'큰'} ${nn}의 값을 100으로 했을 때의 상댓값임.`); }
  return out;
}
function noteLines(doc,extra){ const N=doc.meta; const out=[]; if(N.autoNote) out.push(...autoNotes(doc),...(extra||[])); String(N.notes||'').split('\n').map(s=>s.trim()).filter(Boolean).forEach(s=>out.push(s));
  return out.map((s,i)=>/^[*＊]/.test(s)?s:'*'.repeat(i+1)+' '+s); }
function finish(doc,r){
  const ops=r.ops; const plot=r.plot; const meta=doc.meta;
  /* 범례 */
  let legBox=null;
  if(r.legend&&r.legend!=='none'&&r.items&&r.items.length){
    const b0=ops.bounds();
    if(r.legend==='bottom'){ const lg=legend(doc,r.items,'row',Math.max(plot.w+16,60)); const lb=lg.bounds(); const cx=plot.x+plot.w/2; ops.absorb(lg,cx-(lb.x+lb.w/2),b0.y+b0.h+2.0-lb.y); legBox=lb; }
    else if(r.legend==='right'){ const lg=legend(doc,r.items,'col'); const lb=lg.bounds(); ops.absorb(lg,b0.x+b0.w+3.6-lb.x,plot.y+plot.h/2-(lb.y+lb.h/2)); }
    else if(r.legend==='in'){ const lg=legend(doc,r.items,'col'); const lb=lg.bounds(); const obs=r.obstacles||[];
      const spots=[[plot.x+1.6,plot.y+1.6],[plot.x+plot.w-1.6-lb.w,plot.y+1.6]]; let at=null;
      for(const [x,y] of spots){ const box={x,y,w:lb.w,h:lb.h}; if(!obs.some(q=>GG.overlap(q,box,0.4)>0)){ at=[x,y]; break; } }
      if(at) ops.absorb(lg,at[0]-lb.x,at[1]-lb.y); else ops.absorb(lg,b0.x+b0.w+3.6-lb.x,plot.y+plot.h/2-(lb.y+lb.h/2)); } }
  /* 제목 */
  if(meta.title){ const b=ops.bounds(); const mm=metrics(fontOf(doc,'title'),meta.title); ops.text(meta.title,plot.x+plot.w/2,b.y-1.8-mm.D,'title',{align:'center'}); }
  /* 주석 · 연도 · 출처 */
  const notes=noteLines(doc,r.notes); const B=ops.bounds(); const right=B.x+B.w, left=B.x;
  const yr=String(meta.year||'').trim(), src=String(meta.src||'').trim();
  const nf=fontOf(doc,'note'), nm=metrics(nf,'가'); const lh=nm.H*1.6; let y=B.y+B.h+2.0+nm.A; let lastRight=null, lastY=null;
  const yrM=yr?metrics(fontOf(doc,'unit'),yr):null;
  let yearDone=false;
  if(yr&&!src&&!notes.length&&r.legend==='bottom'&&legBox){ /* 범례 줄 오른쪽 */
    const lgRight=plot.x+plot.w/2+legBox.w/2; if(right-yrM.W>lgRight+2.0){ ops.text(yr,right,B.y+B.h-0.6-yrM.D,'unit',{align:'right'}); yearDone=true; } }
  for(const s of notes){ const it=ops.text(s,left+0.4,y,'note'); lastRight=it?it.box.x+it.box.w:left; lastY=y; y+=lh; }
  if(yr&&!yearDone&&!src){ if(lastY!=null&&lastRight+3.0<right-yrM.W) ops.text(yr,right,lastY,'unit',{align:'right'}); else { const yy=lastY!=null?y:B.y+B.h+1.6+yrM.A; ops.text(yr,right,yy,'unit',{align:'right'}); } }
  if(src){ const yy=lastY!=null?y:B.y+B.h+1.8+nm.A; if(yr) ops.text(yr,left+0.4,yy,'unit'); ops.text(src,right,yy,'note',{align:'right'}); }
  return ops;
}
function compose(doc){
  for(const k of Object.keys(LAST)) delete LAST[k];
  const f={stack:composeStack,donut:composeDonut,tree:composeTree,group:composeGroup,small:composeSmall,tb:composeTable}[doc.kind];
  const r=f?f(doc):null; if(!r) return null;
  const ops=finish(doc,r); return {ops,plots:[r.plot]};
}
for(const k of KINDS) GG.register(k,compose,'energy');

/* ───────── 정답 · 발문 단서 ───────── */
function seqRange(lbls){ if(!lbls.length) return ''; if(lbls.length<=2) return lbls.join(', '); return `${lbls[0]}~${lbls[lbls.length-1]}`; }
function hintOf(doc){
  const D=doc.data; const out={key:[],cond:[]};
  for(const [arr,noun] of [[D.cols.filter(c=>!c.hide),'항목'],[D.rows.filter(r=>!r.hide),'지역']]){
    const hidden=arr.filter(x=>x.lbl&&x.lbl.trim()&&x.lbl.trim()!==x.name); if(!hidden.length) continue;
    const sorted=hidden.slice().sort((a,b)=>a.lbl.localeCompare(b.lbl,'ko'));
    out.key.push(sorted.map(x=>`${x.lbl.trim()} ${x.name}`).join(', '));
    const lbls=sorted.map(x=>x.lbl.trim()); const last=lbls[lbls.length-1];
    out.cond.push(`${seqRange(lbls)}${particle(last)} 각각 ${namesSorted(hidden.map(x=>x.name)).join(', ')} 중 하나`); void noun; }
  /* 순위 표에서 기호로 바꾼 나라(D.sym) */
  if(D.sym&&D.rows.some(r=>Array.isArray(r.top))){ const used=Object.entries(D.sym).filter(([n])=>D.rows.some(r=>!r.hide&&Array.isArray(r.top)&&r.top.includes(n))).sort((a,b)=>a[1].localeCompare(b[1],'ko'));
    if(used.length){ out.key.push(used.map(([n,s])=>`${s} ${n}`).join(', ')); const lbls=used.map(x=>x[1]); out.cond.push(`${seqRange(lbls)}${particle(lbls[lbls.length-1])} 각각 ${namesSorted(used.map(x=>x[0])).join(', ')} 중 하나`); } }
  if(!out.key.length) return null;
  return {sentence:`(단, ${out.cond.slice().reverse().join('이며, ')}임.)`,key:out.key.slice().reverse().join(' / ')};
}

/* ───────── 프리셋: EI 자료로 표 만들기 ───────── */
function aliasFind(name){ const t=String(name||'').trim(); if(!t) return null; const all=new Set([...mixEntities('tes'),...mixEntities('ren'),...Object.keys(ED?ED.reg||{}:{}),...AGG]);
  if(all.has(t)) return t; for(const [k,a] of Object.entries(ALIAS)) if(a.includes(t)) return k; return null; }
function presetMix(doc,p){
  const ds=MIX[p.ds]?p.ds:'pe'; const Y=mixYears(ds); const year=Y.includes(String(p.year))?String(p.year):Y[Y.length-1];
  const tab=ED.mix[ds].y[year]; const fk=ED.mix[ds].f; const want=(p.cols&&p.cols.length?p.cols:fk).filter(k=>fk.includes(k));
  const rows=(p.rows||[]).map(n=>aliasFind(n)||n).filter(n=>tab[n]);
  const other=p.other!==false&&want.length<fk.length;
  const cols=want.map(k=>({name:fuelName(ds,k),key:k}));
  if(other) cols.push({name:'기타',key:'_other',other:true});
  const v=rows.map(n=>{ const a=tab[n]; const tot=a[a.length-1]; const r=want.map(k=>{ const x=a[fk.indexOf(k)]; return fin(x)?x:null; });
    if(other){ const s=sum(r.filter(fin)); r.push(fin(tot)?Math.max(0,tot-s):null); } return r; });
  setTable(doc,rows.map(n=>({name:n})),cols,v);
  Object.assign(doc.data,{unit:ED.mix[ds].unit,measure:MIX[ds].measure,rowNoun:rows.every(n=>!AGG.has(n))?'국가':'지역',itemNoun:'에너지원',note:'',noteSum:!other&&want.length<fk.length});
  doc.preset={type:'mix',ds,year,rows,cols:want,other};
  doc.meta.year=`(${year})`;
  return {ds,year,rows,missing:(p.rows||[]).filter(n=>!tab[aliasFind(n)||n])};
}
/* 항목 이름에서 '생산량·수출량…' 같은 끝말 */
const MEAS_RE=/\s*(생산량|소비량|수출량|수입량|확인\s*매장량|매장량|발전량|설비 용량|가채 연수)(\(.*\))?$/;
function measureOf(k){ const n=(prodOf(k)||{}).name||''; const m=n.match(MEAS_RE); return m?m[1].replace(/^확인\s*/,''):'값'; }
function baseName(k){ const n=(prodOf(k)||{}).name||k; return n.replace(MEAS_RE,'')||n; }
function yearFor(k,year){ const s=prodOf(k); if(!s) return null; return s.y.includes(+year)?+year:s.y[s.y.length-1]; }
function canRank(k){ const s=prodOf(k); return !!s&&s.rank!==false; }
function shareOfWorld(k,year){ const s=prodOf(k); if(!s) return null; const i=s.y.indexOf(+year); if(i<0) return null; const w=s.v['세계']&&s.v['세계'][i]; if(!fin(w)||w<=0) return null;
  const skip=new Set(s.agg||[]);
  const rows=Object.entries(s.v).filter(([c,v])=>!AGG.has(c)&&!skip.has(c)&&c!=='세계'&&fin(v[i])).map(([c,v])=>[c,v[i]/w*100]); return rows; }
function uniqSent(list){ const out=[]; for(const t of list) for(const x of String(t||'').split(/(?<=[.요])\s+/)) if(x.trim()&&!out.includes(x.trim())) out.push(x.trim()); return out.length?[out.join(' ')]:[]; }
function yearLabel(ys){ const u=[...new Set(ys)]; return u.length===1?`(${u[0]})`:`(${u.join('·')})`; }
function presetTop(doc,p){
  const keys=(p.items||[]).filter(k=>prodOf(k)&&canRank(k)); const year=String(p.year||2024); const N=Math.max(1,Math.min(10,+p.n||3)); const reg=(p.regions||[]).filter(r=>REGIONS.includes(r));
  const per=keys.map(k=>{ const yk=yearFor(k,year); let rows=shareOfWorld(k,yk)||[]; if(reg.length) rows=rows.filter(([c])=>reg.includes(ED.reg[c])); rows.sort((a,b)=>b[1]-a[1]); return {k,yk,top:rows.slice(0,N)}; });
  const names=[]; for(const p2 of per) for(const [c] of p2.top) if(!names.includes(c)) names.push(c);
  const other=p.other!==false&&!reg.length;
  const cols=names.map(n=>({name:n,fill:'light'})); if(other) cols.push({name:'기타',other:true,fill:'white'});
  const v=per.map(p2=>{ const r=names.map(n=>{ const t=p2.top.find(x=>x[0]===n); return t?t[1]:null; }); if(other) r.push(Math.max(0,100-sum(r.filter(fin)))); return r; });
  const meas=[...new Set(keys.map(measureOf))];
  setTable(doc,per.map(p2=>({name:meas.length===1?baseName(p2.k):(prodOf(p2.k).name.replace(/\(.*\)$/,''))})),cols,v,{fills:false});
  const unitWord=meas.length===1?meas[0]:'값';
  const regTxt=reg.length?`${reg.slice(0,-1).map(r=>josa(r,'과','와')+' ').join('')}${reg[reg.length-1]} 전체 국가 중 `:'';
  const noun=keys.every(k=>prodOf(k).grp==='광물 생산')?'광물':'자원';
  Object.assign(doc.data,{unit:'%',measure:unitWord,rowNoun:'항목',itemNoun:noun,noteSum:false,
    note:reg.length?`${regTxt}해당 ${noun}의 ${unitWord} 상위 ${N}개국이 전 세계 ${unitWord}에서 차지하는 비율을 나타냄.`:''});
  doc.preset={type:'top',items:keys,year,n:N,regions:reg,other};
  doc.meta.year=yearLabel(per.map(p2=>p2.yk));
  const yearNotes=per.filter(p2=>String(p2.yk)!==year).map(p2=>`${prodOf(p2.k).name}은 ${p2.yk}년 값이에요.`);
  return {year,keys,dropped:(p.items||[]).filter(k=>prodOf(k)&&!canRank(k)),notes:uniqSent(keys.map(k=>prodOf(k).note)),yearNotes};
}
function presetCompare(doc,p){
  const keys=(p.items||[]).filter(k=>prodOf(k)); const year=+(p.year||2024); const rows=(p.rows||[]).map(n=>aliasFind(n)||n);
  const yks=keys.map(k=>yearFor(k,year));
  const v=rows.map(n=>keys.map((k,j)=>{ const s=prodOf(k); const i=s.y.indexOf(yks[j]); const a=s.v[n]; return a&&i>=0&&fin(a[i])?a[i]:null; }));
  const units=[...new Set(keys.map(k=>prodOf(k).unit))];
  const meas=[...new Set(keys.map(measureOf))], bases=[...new Set(keys.map(baseName))];
  /* 같은 끝말(예: 모두 생산량)이면 열 이름에서 끝말을 빼고, 같은 자원(예: 석유 생산·수출)이면 끝말만 남긴다 */
  const colName=k=>keys.length>1&&meas.length===1?baseName(k):keys.length>1&&bases.length===1?measureOf(k):prodOf(k).name;
  setTable(doc,rows.map(n=>({name:n})),keys.map(k=>({name:colName(k),key:k})),v);
  const FOS=new Set(['화석 연료 생산','화석 연료 소비','화석 연료 수출입','매장량']);
  const allMin=keys.every(k=>prodOf(k).grp==='광물 생산'), allFos=keys.every(k=>FOS.has(prodOf(k).grp));
  Object.assign(doc.data,{unit:units.length===1?units[0]:'',measure:meas.length===1&&meas[0]!=='값'?meas[0]:'',itemNoun:allMin?'광물':allFos?'자원':'항목',rowNoun:rows.every(n=>!AGG.has(n))?'국가':'지역',note:'',noteSum:false});
  doc.preset={type:'cmp',items:keys,year:String(year),rows};
  doc.meta.year=yearLabel(yks);
  const yearNotes=keys.filter((k,j)=>yks[j]!==year).map((k,j)=>`${prodOf(k).name}은 ${yearFor(k,year)}년 값이에요.`);
  return {year,keys,missing:rows.filter((n,i)=>v[i].every(x=>x==null)),notes:uniqSent(keys.map(k=>prodOf(k).note)),yearNotes};
}

/* ───────── 붙여넣기 표 ───────── */
function parseTable(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(l=>l.replace(/\s+$/,'')).filter(l=>l.trim());
  if(lines.length<2) return {error:'첫 줄에 항목 이름, 다음 줄부터 지역 이름과 값을 붙여 넣어 주세요.'};
  const split=l=>l.includes('\t')?l.split('\t'):l.includes(',')&&!/\d,\d{3}/.test(l)?l.split(','):l.split(/\s{2,}|\s(?=[-−\d.])/);
  const grid=lines.map(l=>split(l).map(s=>s.trim()));
  const head=grid[0]; const num=s=>{ const t=String(s).replace(/[−–]/g,'-').replace(/,/g,'').replace(/%$/,''); return t!==''&&isFinite(+t)?+t:null; };
  const hasCorner=head.length>=2&&num(head[0])==null&&grid.slice(1).every(r=>num(r[0])==null);
  const cols=(hasCorner?head.slice(1):head).filter(s=>s!=='');
  const rows=[], v=[];
  for(const r of grid.slice(1)){ const name=hasCorner?r[0]:`행 ${rows.length+1}`; const vals=(hasCorner?r.slice(1):r).map(num); rows.push(name); v.push(cols.map((_,j)=>vals[j]!=null?vals[j]:null)); }
  if(!cols.length||!rows.length) return {error:'표를 알아보지 못했어요.'};
  const bad=v.flat().filter(x=>x==null).length;
  return {rows,cols,v,bad};
}

/* ───────── 문장으로 만들기 ───────── */
const FUEL_WORDS=[['oil',/석유|원유/],['gas',/천연\s*가스|(?<![가-힣])가스|LNG/],['coal',/석탄/],['nuclear',/원자력|핵/],['hydro',/수력/],['wind',/풍력/],['solar',/태양광|태양열|태양/],['geo',/지열|바이오/],['ren',/신\s*[·ㆍ.]?\s*재생|재생\s*에너지|신재생/]];
const PROD_WORDS=[['lithium',/리튬/],['cobalt',/코발트/],['copper',/구리/],['nickel',/니켈/],['bauxite',/보크사이트/],['graphite',/흑연/],['rare',/희토류/],['manganese',/망가니즈|망간/],['zinc',/아연/],['pgm',/백금/],['aluminium',/알루미늄/],['tin',/주석/],['vanadium',/바나듐/]];
function findPlaces(text){
  const names=new Set([...mixEntities('tes'),...mixEntities('ren'),...Object.keys(ED?ED.reg||{}:{}),...AGG]); const hits=[];
  const cands=[]; for(const n of names) cands.push([n,n]); for(const [k,a] of Object.entries(ALIAS)) for(const x of a) cands.push([x,k]);
  for(const n of [...names]){ const base=n.replace(/\(.*\)$/,'').trim(); if(base&&base!==n) cands.push([base,n]); }
  cands.sort((a,b)=>b[0].length-a[0].length);
  const used=new Array(text.length).fill(false);
  for(const [w,k] of cands){ let from=0; for(;;){ const i=text.indexOf(w,from); if(i<0) break; from=i+1;
      if(used.slice(i,i+w.length).some(Boolean)) continue; const pre=text[i-1]||' ', post=text[i+w.length]||' ';
      if(/[A-Za-z]/.test(w)&&(/[A-Za-z]/.test(pre)||/[A-Za-z]/.test(post))) continue;
      if(/[가-힣]/.test(pre)&&!/[와과및,·\s(]/.test(pre)) continue;
      if(/[가-힣]/.test(post)&&!/[의와과는은이가을를로에도만및별]/.test(post)) continue;
      const tail=text.slice(i+w.length,i+w.length+6); const expand=REGIONS.includes(k)&&/^\s*(의\s*)?(국가|나라|여러\s*나라)/.test(tail);
      for(let t=i;t<i+w.length;t++) used[t]=true; hits.push({i,k,w,expand}); } }
  hits.sort((a,b)=>a.i-b.i); const out=[]; for(const h of hits) if(!out.some(o=>o.k===h.k)) out.push(h); return out;
}
/* 가리기 범위 바로 앞에 이어 적은 에너지원 목록(예: ‘천연가스·신재생·석탄은 (가)~(다)’) */
function fuelListBefore(before){
  const hits=[]; for(const [k,re] of FUEL_WORDS){ const g=new RegExp(re.source,'g'); let m; while((m=g.exec(before))) hits.push({k,i:m.index,e:m.index+m[0].length}); }
  hits.sort((a,b)=>a.i-b.i); if(!hits.length) return [];
  let j=hits.length-1; const tail=before.slice(hits[j].e); if(!/^[^\s,·]{0,6}\s*(?:는|은|을|를|이|가|로|으로)?\s*$/.test(tail)&&!/^\s*(에너지)?\s*(는|은|을|를)?\s*$/.test(tail)) return [];
  const out=[hits[j].k];
  while(j>0){ const gap=before.slice(hits[j-1].e,hits[j].i); if(!/^[\s,·、및와과]*(에너지)?[\s,·、및와과]*$/.test(gap)) break; j--; if(!out.includes(hits[j].k)) out.unshift(hits[j].k); }
  return out;
}
function parseRequest(q){
  const text=String(q||'').replace(/\s+/g,' ').trim(); const spec={kind:null,src:null,ds:null,year:null,rows:[],cols:[],items:[],n:null,regions:[],maskRows:null,maskCols:null,shuffle:false,dir:null,trans:false,connect:false,inLbl:null,other:true,rel:true,mode:null};
  const notes=[]; if(!text) return {understood:false,spec,notes};
  /* 그래프 종류 */
  if(/도넛|원\s*그래프|파이/.test(text)) spec.kind='donut';
  if(/원\s*그래프|파이/.test(text)&&!/도넛/.test(text)) spec.pie=true;
  if(/정사각형|면적\s*비율|트리맵|사각형|면적/.test(text)) spec.kind='tree';
  if(/묶은\s*막대|나란히|생산\s*량?과\s*소비\s*량?|생산.*소비.*비교/.test(text)) spec.kind='group';
  if(/상댓값|상대값|가장\s*(많은|큰).*100/.test(text)) spec.kind='small';
  if(/순위\s*표|순위표/.test(text)) { spec.kind='tb'; spec.mode='rank'; }
  else if(/(^|\s)표(로|\s|$)|표를|표\s*만들/.test(text)&&!spec.kind) spec.kind='tb';
  if(/막대|누적/.test(text)&&!spec.kind) spec.kind='stack';
  if(/세로\s*막대|세로/.test(text)) spec.dir='v'; if(/가로\s*막대|가로/.test(text)) spec.dir='h';
  if(/연결선|점선으로\s*이어/.test(text)) spec.connect=true;
  if(/행\s*열\s*바꿔|뒤집|(에너지원|에너지|자원)별\s*(지역|시·도|시도|국가|나라)/.test(text)) spec.trans=true;
  if(/값\s*표시|수치\s*표시|비율\s*표시|숫자\s*표시/.test(text)) spec.inLbl='value';
  else if(/막대\s*안에?\s*이름|이름\s*표시|라벨\s*표시/.test(text)) spec.inLbl='name';
  if(/섞어|무작위|랜덤/.test(text)) spec.shuffle=true;
  /* 연도 */
  const ym=text.match(/(20[12]\d)\s*년?/); if(ym) spec.year=+ym[1];
  /* 상위 N */
  const tn=text.match(/상위\s*(\d+)\s*(개국|개|위)?/); if(tn) spec.n=+tn[1];
  /* 자료 */
  const prodItems=PROD_WORDS.map(([k,re])=>[k,text.search(re)]).filter(a=>a[1]>=0).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
  const fuels=[]; const fpos=[]; for(const [k,re] of FUEL_WORDS){ const m=re.exec(text); if(m){ fuels.push(k); fpos.push(m.index); } }
  const fuelsOrdered=fuels.map((k,i)=>[k,fpos[i]]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
  const prodWord=/생산/.test(text), consWord=/소비\s*량|소비\s*비율|소비\s*구조|소비/.test(text);
  /* 수출·수입·매장량·가채 연수 (EI 교역·매장량 표) */
  const MW=[['x',/수출/],['m',/수입/],['r',/매장/],['rp',/가채\s*연수|가채연수|R\s*\/\s*P/],['p',/생산(?!국)/],['c',/소비/]];
  const measHits=MW.map(([k,re])=>[k,text.search(re)]).filter(a=>a[1]>=0).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
  const tradeAsk=measHits.some(k=>['x','m','r','rp'].includes(k));
  if(tradeAsk){
    const lng=/LNG|액화\s*천연\s*가스/.test(text), pipe=/파이프라인|관로/.test(text), crude=/원유/.test(text);
    const fos=fuelsOrdered.filter(k=>['oil','gas','coal'].includes(k)); if(!fos.length) fos.push('oil');
    const keyOf=(f,m)=>{ if(m==='p') return f==='coal'?'coal':f; if(m==='c') return f==='coal'?'coalc':f+'c';
      if(f==='oil') return m==='x'?(crude?'crudex':'oilx'):m==='m'?(crude?'crudem':'oilm'):m==='r'?'oilr':'oilrp';
      if(f==='gas') return m==='x'?(lng?'lngx':pipe?'gasxp':'gasx'):m==='m'?'lngm':m==='r'?'gasr':'gasrp';
      return m==='x'?'coalx':m==='m'?'coalm':m==='r'?'coalr':'coalrp'; };
    const items=[]; for(const f of fos) for(const m of measHits){ const k=keyOf(f,m); if(prodOf(k)&&!items.includes(k)) items.push(k); }
    if(fos.includes('gas')&&measHits.includes('m')&&!lng) notes.push('천연가스 수입량은 나라별 LNG 수입량만 있어요. LNG 수입량으로 그렸어요.');
    const topAsk=!!spec.n||/(수출|수입|매장|생산)\s*국|점유|상위/.test(text);
    spec.items=items; spec.ds=null;
    if(topAsk&&items.some(canRank)){ spec.src='top'; spec.items=items.filter(canRank); }
    else { spec.src='cmp'; if((!spec.kind&&measHits.length>1)||(spec.kind==='stack'&&!/누적/.test(text))) spec.kind='group'; }
  }
  if(/종전|구\s*방식|옛\s*방식|대체법/.test(text)) spec.ds='pe';
  else if(/TES|새\s*방식|공급/.test(text)) spec.ds='tes';
  else if(/1차\s*에너지|일차\s*에너지/.test(text)) spec.ds='pe';
  else if(/발전\s*량|발전\s*구조|발전\s*비율|전력/.test(text)&&!(/생산국|상위/.test(text))) spec.ds=fuelsOrdered.some(k=>['wind','solar','geo'].includes(k))&&!fuelsOrdered.some(k=>['oil','gas','coal','nuclear'].includes(k))?'ren':'elec';
  if(tradeAsk){}
  else if(spec.n||/생산국|주요\s*생산|점유/.test(text)){ spec.src='top'; spec.items=prodItems.slice(); if(prodWord||!consWord){ for(const k of fuelsOrdered) if(['oil','gas','coal'].includes(k)) spec.items.push(k); } else { for(const k of fuelsOrdered) if(['oil','gas','coal'].includes(k)) spec.items.push(k+'c'); } }
  else if(spec.kind==='group'&&(prodWord&&consWord)){ spec.src='cmp'; const f=fuelsOrdered.find(k=>['oil','gas','coal'].includes(k))||'oil'; spec.items=f==='coal'?['coale','coalc']:[f,f+'c']; }
  else if(spec.kind==='small'||(prodItems.length&&!spec.ds)||(!spec.ds&&prodWord&&fuelsOrdered.some(k=>['oil','gas','coal'].includes(k)))){ spec.src='cmp'; spec.items=prodItems.slice(); if(!prodItems.length) spec.items=fuelsOrdered.filter(k=>['oil','gas','coal'].includes(k)).map(k=>consWord&&!prodWord?k+'c':k); }
  if(!tradeAsk&&!spec.ds&&!spec.n&&!prodItems.length&&fuelsOrdered.length&&!(spec.kind==='group'&&prodWord&&consWord)&&!(/생산국|주요\s*생산|점유/.test(text))&&!(spec.kind==='small')){
    spec.ds=/발전|전력/.test(text)?(fuelsOrdered.every(k=>['wind','solar','hydro','geo','ren'].includes(k))?'ren':'elec'):/생산/.test(text)?null:'pe'; }
  if(spec.src==null&&spec.ds&&(spec.n||/생산국|주요\s*생산|점유/.test(text))) spec.ds=null;
  if(spec.src) {}
  else if(spec.ds){ spec.src='mix'; const fk=MIX[spec.ds].f; spec.cols=fuelsOrdered.map(k=>spec.ds==='ren'?(k==='ren'?null:k==='geo'?'other':k):k).filter(k=>k&&fk.includes(k)); }
  /* 지역 */
  const places=findPlaces(text);
  if(spec.src==='top'){ spec.regions=places.map(p=>p.k).filter(k=>REGIONS.includes(k)); }
  else spec.rows=places.map(p=>p.expand?'@'+p.k:p.k);
  /* 가리기: A~D, (가)~(다) */
  const G='\\([가나다라마바사아자차카타파하]\\)', Lt='(?<![A-Za-z])[A-J](?![A-Za-z])';
  const re=new RegExp(`(${G}|${Lt})\\s*[~∼～\\-]\\s*(${G}|${Lt})`,'g'); let mm;
  while((mm=re.exec(text))){ const a=mm[1]; const isLatin=/[A-Z]/.test(a); const before=text.slice(0,mm.index); const after=text.slice(mm.index,mm.index+40);
    const only=fuelListBefore(before);
    const itemW=/(에너지원?|자원|항목|광물|발전원?|석유|석탄|가스|수력|원자력|풍력|태양광?|태양열|지열|리튬|구리|코발트|니켈|재생)\S{0,3}\s*$/, placeW=/(국가|지역|나라|대륙|시·도|도시|생산국)\S{0,3}\s*$/;
    const what=placeW.test(before.slice(-10))?'places':itemW.test(before.slice(-14))?'items':/^[^.]*?(국가|지역|나라)/.test(after)?'places':/^[^.]*?(에너지원|자원|항목|광물)/.test(after)?'items':(isLatin?'items':'places');
    const target=spec.src==='top'?(what==='items'?'rows':'cols'):(what==='items'?'cols':'rows');
    const seq=isLatin?'latin':'gana'; if(target==='cols'){ spec.maskCols=seq; if(only.length&&spec.src==='mix') spec.maskOnly=only; } else spec.maskRows=seq; }
  if(/모든\s*에너지|에너지원\s*(모두|전부)|나머지(는|도)\s*(그대로|표시)/.test(text)&&spec.src==='mix'){ spec.allCols=true; spec.other=false; }
  if(/가운데\s*(에\s*)?(총|합계)/.test(text)) spec.center='total';
  if(/기타\s*(없이|빼)|나머지\s*(빼|없이)/.test(text)) spec.other=false;
  if(!spec.kind) spec.kind=spec.src==='top'?'stack':spec.src==='cmp'?(spec.items.length>1?'small':'group'):'stack';
  if(spec.kind==='donut'&&!spec.inLbl) spec.inLbl='name';
  const understood=!!spec.src&&(spec.src==='top'?spec.items.length>0:spec.src==='cmp'?(spec.items.length>0&&spec.rows.length>0):spec.rows.length>0);
  if(spec.src==='mix'&&spec.ds==='pe'&&!/종전|구\s*방식|대체법|TES|새\s*방식|공급/.test(text)) notes.push('1차 에너지는 EI 종전 방식(대체법)으로 그렸어요. 새 방식(TES)은 오른쪽 자료 설정에서 바꿀 수 있어요.');
  return {understood,spec,notes};
}
const SEQ={latin:['A','B','C','D','E','F','G','H','I','J'],gana:['(가)','(나)','(다)','(라)','(마)','(바)','(사)','(아)','(자)','(차)']};
function mask(list,seq,filter){ let k=0; for(const x of list){ if(filter&&!filter(x)){ x.lbl=''; continue; } x.lbl=seq?SEQ[seq][k++]||'':''; } }
function shuffleArr(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }
function specToDoc(spec,cur){
  const d=freshDoc(spec.kind||'stack'); if(cur&&cur.style) d.style=Object.assign({},cur.style);
  let info={}; const yearDef=spec.year||null;
  const expand=(list,pool)=>{ const out=[]; for(const n of list){ if(String(n).startsWith('@')){ const R=n.slice(1); for(const c of pool) if(!AGG.has(c)&&ED.reg[c]===R&&!out.includes(c)) out.push(c); } else if(!out.includes(n)) out.push(n); } return out; };
  if(spec.src==='mix'){ const ds=spec.ds||'pe'; const Y=mixYears(ds); const year=Y.includes(String(yearDef))?String(yearDef):Y[Y.length-1];
    const masked=spec.maskOnly&&spec.maskOnly.length&&spec.maskCols; let cols=spec.cols&&spec.cols.length?spec.cols:null;
    if(spec.allCols||(masked&&spec.kind==='donut'&&cols&&cols.length<=(spec.maskOnly||[]).length)){ cols=null; }
    info=presetMix(d,{ds,year,rows:expand(spec.rows,mixEntities(ds,year)),cols,other:(spec.allCols||spec.kind==='tb'||spec.trans)?false:spec.other});
    if(yearDef&&String(yearDef)!==year) info.yearNote=`${yearDef}년 값이 없어 ${year}년 값으로 그렸어요.`; }
  else if(spec.src==='top'){ const s=prodOf(spec.items[0]); const ys=s?s.y:[2024]; const year=ys.includes(+yearDef)?+yearDef:ys[ys.length-1];
    info=presetTop(d,{items:spec.items,year,n:spec.n||(spec.kind==='tree'?5:3),regions:spec.regions,other:spec.regions.length?false:spec.other});
    if(yearDef&&+yearDef!==year) info.yearNote=`${yearDef}년 값이 없어 ${year}년 값으로 그렸어요.`; }
  else if(spec.src==='cmp'){ const s=prodOf(spec.items[0]); const ys=s?s.y:[2024]; const year=ys.includes(+yearDef)?+yearDef:ys[ys.length-1];
    const pool=[...new Set(spec.items.flatMap(k=>Object.keys((prodOf(k)||{v:{}}).v)))]; info=presetCompare(d,{items:spec.items,year,rows:expand(spec.rows,pool)}); }
  const D=d.data;
  if(spec.shuffle&&spec.maskCols){ const oth=D.cols.filter(c=>c.other); let rest=D.cols.filter(c=>!c.other); const idx=shuffleArr(rest.map((_,j)=>j)); const old=rest; rest=idx.map(j=>old[j]); const perm=[...idx.map(j=>D.cols.indexOf(old[j])),...oth.map(c=>D.cols.indexOf(c))];
    D.v=D.v.map(r=>perm.map(j=>r[j])); D.cols=[...rest,...oth]; autoFills(D.cols); }
  if(spec.maskCols){ const only=spec.src==='mix'&&spec.maskOnly&&spec.maskOnly.length?new Set(spec.maskOnly.map(k=>fuelName(d.preset.ds,k==='geo'&&d.preset.ds==='ren'?'other':k))):null;
    mask(D.cols,spec.maskCols,c=>!c.other&&(!only||only.has(c.name))); }
  if(spec.maskRows) mask(D.rows,spec.maskRows);
  if(spec.kind==='stack'){ const o=d.stack; o.dir=spec.dir||(spec.src==='top'?'h':'h'); o.trans=!!spec.trans; o.connect=!!spec.connect; if(spec.inLbl) o.inLbl=spec.inLbl;
    if(spec.src==='top'&&!spec.regions.length&&!spec.other){ o.norm=false; }
    if(spec.src==='top'&&spec.regions.length){ o.norm=false; o.frame=false; o.grid=false; o.legend='none'; o.inLbl=spec.inLbl||'name'; o.sortSeg=true; D.cols.forEach(c=>c.fill='white'); o.h={barW:4.8,gap:4.2,len:70}; }
    else if(spec.src==='top'){ o.legend='none'; o.inLbl=spec.inLbl||'name'; o.sortSeg=true; }
    if(o.dir==='v'&&!spec.connect){ o.grid=true; } if(o.dir==='h'){ o.grid=!!spec.grid; } }
  if(spec.kind==='donut'){ const o=d.donut; if(spec.pie) o.hole=0; o.inLbl=spec.inLbl||'name'; if(spec.maskRows){ o.center='none'; o.top='lbl'; } if(spec.center==='total'){ o.center='total'; o.top='lbl'; o.totalLabel=d.data.measure?`총${d.data.measure}`:'합계'; if(!spec.inLbl||spec.inLbl==='name'){ o.inLbl='none'; o.legend='bottom'; } } }
  if(spec.kind==='tree'){ D.cols.forEach(c=>c.fill=c.other?'white':'light'); if(spec.maskRows) d.tree.top='lbl'; }
  if(spec.kind==='small'){ const pal=['black','mid','fs','dark','light','dot']; D.cols.forEach((c,j)=>c.fill=pal[j%pal.length]); }
  if(spec.kind==='group'){ const pal=['white','dark','light','fs']; D.cols.forEach((c,j)=>c.fill=pal[j%pal.length]); d.group.legend='in'; }
  if(spec.kind==='tb'&&spec.mode) d.tb.mode=spec.mode;
  return {doc:d,info};
}
function buildPrompt(q){
  const ents=mixEntities('tes').join(', ');
  return `세계지리 에너지 그래프 편집기의 요청을 JSON 하나로 바꿔 줘. 다른 말은 쓰지 마.
형식: {"kind":"stack|donut|tree|group|small|tb","src":"mix|top|cmp","ds":"pe|tes|elec|ren","year":2024,"rows":["미국"],"cols":["oil"],"items":["copper"],"n":3,"regions":[],"maskRows":"gana|latin|null","maskCols":"gana|latin|null","shuffle":false,"dir":"h|v","trans":false,"connect":false,"inLbl":"none|name|value|both","other":true,"mode":"value|pct|rank","missing":[]}
- src=mix: 국가·지역의 에너지 구성. ds=pe(1차 에너지 소비, 종전 방식), tes(1차 에너지 공급, 새 방식), elec(발전량), ren(재생 에너지 발전량). cols 키: pe·tes는 oil gas coal nuclear hydro ren, elec는 oil gas coal nuclear hydro ren other, ren은 wind solar hydro geo. 요청에 나온 에너지만 cols에 넣고, 나머지는 other=true면 ‘기타’로 합친다.
- src=top: 자원별 생산(소비·수출·수입·매장량) 상위 n개국 점유율. items 키: oil gas coal(생산), oilc gasc coalc(소비), oilx crudex gasx gasxp lngx coalx(수출), oilm crudem lngm coalm(수입), oilr gasr coalr(확인 매장량, 2020년 말), lithium cobalt copper nickel bauxite graphite rare manganese zinc pgm aluminium tin vanadium. regions는 ${REGIONS.join(', ')} 중에서만.
- src=cmp: 국가별 값 비교(상댓값 막대·묶은 막대·표). items와 rows를 쓴다. 가채 연수 oilrp gasrp coalrp는 cmp에서만.
- 수출입은 EI 교역 통계(지역 사이 이동)라 석유 수출입은 2023·2024년, 천연가스 수출은 2024년만 있다.
- rows는 이 목록의 이름만: ${ents}. 목록에 없으면 missing에 넣는다.
- 연도는 2023 또는 2024(src=mix), 2014~2024(src=top·cmp).
요청: ${q}`;
}
function cleanSpec(o){
  if(!o||typeof o!=='object') return null;
  const pick=(v,arr,def)=>arr.includes(v)?v:def;
  const s={kind:pick(o.kind,KINDS,'stack'),src:pick(o.src,['mix','top','cmp'],null),ds:pick(o.ds,Object.keys(MIX),'pe'),year:fin(+o.year)?+o.year:null,
    rows:(Array.isArray(o.rows)?o.rows:[]).map(String).map(n=>aliasFind(n)||n),cols:(Array.isArray(o.cols)?o.cols:[]).filter(k=>FUEL[k]),items:(Array.isArray(o.items)?o.items:[]).filter(k=>prodOf(k)),
    n:fin(+o.n)?+o.n:null,regions:(Array.isArray(o.regions)?o.regions:[]).filter(r=>REGIONS.includes(r)),maskRows:pick(o.maskRows,['gana','latin'],null),maskCols:pick(o.maskCols,['gana','latin'],null),
    shuffle:!!o.shuffle,dir:pick(o.dir,['h','v'],null),trans:!!o.trans,connect:!!o.connect,inLbl:pick(o.inLbl,['none','name','value','both'],null),other:o.other!==false,mode:pick(o.mode,['value','pct','rank'],null),rel:true};
  if(!s.src) return null; return s;
}

return {KINDS,KIND_KO,FILL_KEYS,FILL_KO,PALETTE,MIX,FUEL,REGIONS,AGG,shareTxt,cellName,trimM,applyFills,symbolsIn,applySymbols,RAMP_UP,tableUnits,labelWarn,distinctFills,setData,data,mixYears,mixEntities,prodKeys,prodOf,fuelName,
  freshDoc,normalizeDoc,derive,setTable,autoFills,lblOf,compose,hintOf,noteLines,autoNotes,presetMix,presetTop,presetCompare,parseTable,
  parseRequest,specToDoc,buildPrompt,cleanSpec,aliasFind,mask,SEQ,measureOf,baseName,canRank,yearFor,lastAxes:()=>Object.assign({},LAST),
  /* 다른 도표 엔진(종교 등)이 함께 쓰는 조각 */
  finish,legend,block,putBlock,fitLabel,wrapFit,splits,tm,tf,put,roleOf,fillOpts,haloOf,josa,particle,transpose,pctRow,shuffleArr,namesSorted,axisFrom,seqRange,LAST};
})();
