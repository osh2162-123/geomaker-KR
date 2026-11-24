/* 겹침 검사기 — 페이지 안에서 실행된다(run.mjs가 넣음). 배포 파일 아님.
   window.__LAY.run(sc) : 시나리오 하나를 실행하고 {ok, issues, svgHash, kind, ...}를 돌려준다.
   판정 규칙(IMPROVE.md 묶음 E):
     T  글자–글자 겹침
     L  범례–데이터/다른 글자 겹침
     M  글자–데이터 점·선 겹침
     E  글자가 채운 막대·면의 경계에 걸침(안쪽 글자·바깥 글자는 정상)
     O  글자가 틀·패널·표 칸의 테두리를 가로지름
     G  글자 사이가 너무 좁음(0.3 mm 미만, 같은 줄)  — 경고 */
(function(){
'use strict';
/* 엔진은 const 전역이라 window 속성이 아니다 → 직접 참조 */
const APPS={climate:()=>GG,energy:()=>EG,religion:()=>RG,population:()=>PG,agriculture:()=>AG};
const EPS=0.05, GAP=0.3;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* 같은 문장이면 같은 결과가 나오도록 Math.random을 고정 씨앗으로 바꾼다 */
let seed=1;
const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
Math.random=rnd;

function setPath(o,path,v){ const k=path.split('.'); let c=o; for(let i=0;i<k.length-1;i++){ if(c[k[i]]==null||typeof c[k[i]]!=='object') c[k[i]]={}; c=c[k[i]]; } c[k[k.length-1]]=v; }
function merge(a,b){ for(const [k,v] of Object.entries(b||{})){ if(v&&typeof v==='object'&&!Array.isArray(v)&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])) merge(a[k],v); else a[k]=v; } return a; }

/* ── 상자 계산 ── */
function boxOf(o){
  if(o.t==='text'||o.t==='frame') return o.box;
  if(o.t==='mark'){ const r=o.size/2; return {x:o.x-r,y:o.y-r,w:2*r,h:2*r}; }
  if(o.t==='rect') return {x:o.x,y:o.y,w:o.w,h:o.h};
  let pts=o.pts; if(o.t==='region'){ let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; for(const r of o.rects){ a=Math.min(a,r[0]); b=Math.min(b,r[1]); c=Math.max(c,r[0]+r[2]); d=Math.max(d,r[1]+r[3]); } return {x:a,y:b,w:c-a,h:d-b}; }
  if(!pts||!pts.length) return null; let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; for(const p of pts){ a=Math.min(a,p[0]); b=Math.min(b,p[1]); c=Math.max(c,p[0]); d=Math.max(d,p[1]); } return {x:a,y:b,w:c-a,h:d-b};
}
function inter(a,b){ const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x), h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y); return (w>EPS&&h>EPS)?w*h:0; }
function contains(o,i){ return i.x>=o.x-EPS&&i.y>=o.y-EPS&&i.x+i.w<=o.x+o.w+EPS&&i.y+i.h<=o.y+o.h+EPS; }
function segHitsBox(p,q,b){ /* 선분이 상자 안쪽(가장자리 EPS 제외)을 지나는가 — 리앙–바스키 */
  const x0=b.x+EPS,y0=b.y+EPS,x1=b.x+b.w-EPS,y1=b.y+b.h-EPS; if(x1<=x0||y1<=y0) return false;
  let t0=0,t1=1; const dx=q[0]-p[0], dy=q[1]-p[1];
  for(const [P,Q] of [[-dx,p[0]-x0],[dx,x1-p[0]],[-dy,p[1]-y0],[dy,y1-p[1]]]){ if(Math.abs(P)<1e-12){ if(Q<0) return false; } else { const r=Q/P; if(P<0){ if(r>t1) return false; if(r>t0) t0=r; } else { if(r<t0) return false; if(r<t1) t1=r; } } }
  return t1-t0>1e-6;
}
const short=o=>o.t==='frame'?'틀 테두리':o.t==='text'?`글자「${o.s}」(${o.role||'?'})`:o.t==='mark'?`점(${o.shape})`:o.t==='rect'?'막대·면':o.t==='line'?'선':o.t==='poly'?'다각형':o.t;
const segLen=o=>o.pts&&o.pts.length===2?Math.hypot(o.pts[1][0]-o.pts[0][0],o.pts[1][1]-o.pts[0][1]):0;
const isDataLine=o=>o.t==='line'&&!o.dash&&o.pts&&(o.pts.length>2||segLen(o)>1.5);
const isFilled=o=>(o.t==='rect'||o.t==='poly'||o.t==='region')&&(o.fill||o.pat);

/* 돌린 글자는 상자가 실제보다 넓으므로, 돌린 사각형(네 모서리)끼리 분리축 판정을 한다 */
function quad(o){ if(o.t!=='text'||!o.rot) { const b=o.box; return [[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]]; }
  const m=o.m, W=m.W, bx=o.align==='center'?-W/2:o.align==='right'?-W:0; const c=Math.cos(o.rot), sn=Math.sin(o.rot);
  return [[bx,-m.A],[bx+W,-m.A],[bx+W,m.D],[bx,m.D]].map(([a,b])=>[o.x+a*c-b*sn,o.y+a*sn+b*c]); }
function quadOverlap(P,Q){ for(const poly of [P,Q]) for(let i=0;i<4;i++){ const a=poly[i], b=poly[(i+1)%4]; const nx=b[1]-a[1], ny=a[0]-b[0]; const L=Math.hypot(nx,ny)||1;
    const pr=pp=>pp.map(p=>(p[0]*nx+p[1]*ny)/L); const p1=pr(P), p2=pr(Q); const gap=Math.min(Math.max(...p1),Math.max(...p2))-Math.max(Math.min(...p1),Math.min(...p2)); if(gap<=EPS) return false; } return true; }
function lint(R){
  const L=R.ops.list, issues=[];
  const texts=L.filter(o=>o.t==='text'&&o.box&&o.box.w>0);
  const lg=L.filter(o=>o.grp==='legend');
  const add=(rule,a,b,area,extra)=>issues.push(Object.assign({rule,a:short(a),b:b?short(b):'',area:+(area||0).toFixed(3),boxA:boxOf(a),boxB:b?boxOf(b):null},extra||{}));
  /* T: 글자–글자 */
  for(let i=0;i<texts.length;i++) for(let j=i+1;j<texts.length;j++){ const a=texts[i], b=texts[j]; if(a.rot||b.rot){ if(inter(a.box,b.box)>0&&quadOverlap(quad(a),quad(b))) add('T',a,b,inter(a.box,b.box)); continue; } const ar=inter(a.box,b.box); if(ar>0) add('T',a,b,ar);
    else { /* G: 같은 줄에서 너무 가까움 */ const sameLine=Math.abs((a.box.y+a.box.h/2)-(b.box.y+b.box.h/2))<Math.min(a.box.h,b.box.h)*0.5; if(sameLine){ const gap=Math.max(b.box.x-(a.box.x+a.box.w),a.box.x-(b.box.x+b.box.w)); if(gap>-EPS&&gap<GAP&&!(a.grp==='legend'&&b.grp==='legend')&&a.role!=='unit'&&b.role!=='unit') add('G',a,b,0,{gap:+gap.toFixed(3)});   /* '100(%)'처럼 단위를 붙이는 것은 시험지 표기 */ } } }
  /* L: 범례 영역 – 범례가 아닌 데이터·글자 */
  if(lg.length){ let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; for(const o of lg){ const bb=boxOf(o); if(!bb) continue; a=Math.min(a,bb.x); b=Math.min(b,bb.y); c=Math.max(c,bb.x+bb.w); d=Math.max(d,bb.y+bb.h); }
    const LB={x:a,y:b,w:c-a,h:d-b}; const lgObj={t:'legend',box:LB};
    for(const o of L){ if(o.grp==='legend') continue;
      if(o.t==='text'||o.t==='mark'||isFilled(o)){ const bb=boxOf(o); if(!bb) continue; /* 틀 전체를 덮는 배경 면은 제외 */ if(isFilled(o)&&contains(bb,LB)&&bb.w*bb.h>LB.w*LB.h*4) continue; const ar=inter(LB,bb); if(ar>0) issues.push({rule:'L',a:'범례',b:short(o),area:+ar.toFixed(3),boxA:LB,boxB:bb}); }
      else if(isDataLine(o)){ for(let k=0;k<o.pts.length-1;k++) if(segHitsBox(o.pts[k],o.pts[k+1],LB)){ issues.push({rule:'L',a:'범례',b:'데이터 선',area:0,boxA:LB,boxB:boxOf(o)}); break; } } } }
  /* M·E: 글자 – 데이터 */
  for(const t of texts){ if(t.grp==='legend') continue;
    for(const o of L){ if(o.grp==='legend'||o===t) continue;
      if(o.t==='mark'){ const ar=inter(t.box,boxOf(o)); if(ar>0.02) add('M',t,o,ar); }
      else if(isDataLine(o)){ for(let k=0;k<o.pts.length-1;k++) if(segHitsBox(o.pts[k],o.pts[k+1],t.box)){ add('M',t,o,0); break; } }
      else if(isFilled(o)&&o.t==='rect'){ const bb=boxOf(o); const ar=inter(t.box,bb); if(ar>0.02&&!contains(bb,t.box)) add('E',t,o,ar); } } }
  /* O: 글자가 틀(채움 없는 테두리 상자: 그래프 틀·패널·표 칸)의 선을 가로지름 — 완전히 안쪽·바깥쪽은 정상 */
  const frames=L.filter(o=>o.t==='rect'&&o.stroke&&!o.fill&&!o.pat&&o.grp!=='legend'&&o.w>2&&o.h>2);
  for(const t of texts){ if(t.grp==='legend') continue; const tb=t.box;
    for(const f of frames){ const fb={x:f.x,y:f.y,w:f.w,h:f.h}; if(inter(tb,fb)>0&&!contains(fb,tb)){ add('O',t,{t:'frame',box:fb},inter(tb,fb)); break; } } }
  return issues;
}

async function waitDoc(api,before,ms){ const t0=performance.now(); while(performance.now()-t0<ms){ const s=JSON.stringify(api.getDoc()); if(s!==before) return s; await sleep(120); } return null; }
async function md5ish(s){ const b=await crypto.subtle.digest('SHA-1',new TextEncoder().encode(s)); return [...new Uint8Array(b)].slice(0,8).map(x=>x.toString(16).padStart(2,'0')).join(''); }

const docCache=new Map();
async function baseDoc(sc){
  const key=sc.app+'|'+(sc.q||'');
  if(docCache.has(key)) return JSON.parse(docCache.get(key));
  const api=await HUB.show(sc.app); await sleep(150);
  if(sc.q){ const box=document.getElementById('hub-tool-'+sc.app); const q=box.querySelector('#q'), go=box.querySelector('#goBtn');
    const before=JSON.stringify(api.getDoc()); seed=1; q.value=sc.q; go.click(); const s=await waitDoc(api,before,6000);
    if(!s){ const msg=box.querySelector('#askMsg'); return {__parseFail:true,msg:msg&&!msg.hidden?msg.textContent:''}; }
    await sleep(200); }
  const s=JSON.stringify(api.getDoc()); docCache.set(key,s); return JSON.parse(s);
}

async function run(sc){
  const ns=APPS[sc.app]&&APPS[sc.app](); if(!ns) return {ok:false,err:'앱 이름 오류: '+sc.app};
  let doc=await baseDoc(sc); if(doc&&doc.__parseFail) return {ok:false,parseFail:true,msg:doc.msg};
  if(sc.patch) merge(doc,sc.patch);
  if(sc.kind) doc.kind=sc.kind;
  if(sc.set) for(const [k,v] of Object.entries(sc.set)) setPath(doc,k,v);
  doc=ns.normalizeDoc(doc);
  let R; try{ R=GG.compose(doc); }catch(e){ return {ok:false,err:'compose 오류: '+e.message}; }
  if(!R) return {ok:true,empty:true,kind:doc.kind,issues:[]};
  const issues=lint(R);
  let svg=''; try{ svg=await GG.svgString(doc); }catch(e){ svg='ERR '+e.message; }
  window.__lastDoc=doc; window.__lastR=R; window.__lastIssues=issues;
  return {ok:true,kind:doc.kind,W:+R.W.toFixed(2),H:+R.H.toFixed(2),issues,svgHash:await md5ish(svg),nText:R.ops.list.filter(o=>o.t==='text').length};
}

/* 걸린 사례 그림: 문제 상자를 빨강(A)·파랑(B)으로 덧그린 PNG */
function snapshot(scale){
  const doc=window.__lastDoc, issues=window.__lastIssues||[]; const R=window.__lastR; if(!R) return null;
  const k=scale||8, M=GG.M; const cv=document.createElement('canvas'); cv.width=Math.ceil((R.W+2*M)*k); cv.height=Math.ceil((R.H+2*M)*k);
  cv.style.width=cv.width+'px'; cv.style.height=cv.height+'px'; document.body.append(cv);
  const c=cv.getContext('2d');
  const r=GG.paintSheet(doc,cv,{dpr:1,pad:0,maxK:k,desk:'#ffffff'}); if(!r){ cv.remove(); return null; }
  c.setTransform(r.k,0,0,r.k,r.ox+(M-r.R.b.x)*r.k,r.oy+(M-r.R.b.y)*r.k); c.lineWidth=0.12;
  for(const is of issues){ if(is.rule==='G') continue; if(is.boxA){ c.strokeStyle='rgba(230,0,0,.9)'; c.strokeRect(is.boxA.x,is.boxA.y,is.boxA.w,is.boxA.h); } if(is.boxB){ c.strokeStyle='rgba(0,80,230,.9)'; c.strokeRect(is.boxB.x,is.boxB.y,is.boxB.w,is.boxB.h); } }
  const url=cv.toDataURL('image/png'); cv.remove(); return url;
}
window.__LAY={run,snapshot,lint};
})();
