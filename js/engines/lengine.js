/* 지형 모식도 엔진(LG): 바탕(기본 모식도·이미지) 위에 기호·지시선·점선 타원·화살표·선·사각형·글상자·점을 놓고,
   화면(SVG)·PNG·SVG로 그린다. 문장을 읽어 기본 모식도의 지형 위치에 기호를 자동으로 놓는다. 단위는 모두 mm. */
const LG=(function(){
'use strict';
const {MMPT,uid,esc,fin,clamp}=GG;

/* ───────── 자료(기본 모식도) ───────── */
let LD=null, KD=null;
function setData(d){ LD=d; }
function data(){ return LD; }
/* 기출 그림(평가원 문제지에서 잘라 낸 그림, 개인 수업 준비용) */
function setKice(d){ KD=d; }
function kiceItems(){ return KD&&KD.items?KD.items:[]; }
function kiceItem(id){ return kiceItems().find(k=>k.id===id)||null; }
function kiceNote(){ return KD&&KD.note||''; }
function diagrams(){ return LD&&LD.diagrams?LD.diagrams:[]; }
function diagram(id){ return diagrams().find(d=>d.id===id)||null; }
function featureOf(dg,name){ if(!dg) return null; const t=norm(name); return dg.anchors.find(a=>norm(a.ko)===t||(a.alias||[]).some(x=>norm(x)===t))||null; }
const norm=s=>String(s||'').replace(/\s+/g,'').replace(/[()（）]/g,'').toLowerCase();

/* ───────── 문서 ───────── */
const SEQS={latin:['A','B','C','D','E','F','G','H','I','J'],gana:['(가)','(나)','(다)','(라)','(마)','(바)','(사)','(아)','(자)','(차)'],
  circ:['㉠','㉡','㉢','㉣','㉤','㉥','㉦','㉧','㉨','㉩'],mk:['㉮','㉯','㉰','㉱','㉲','㉳','㉴','㉵','㉶','㉷'],num:Array.from({length:999},(_,i)=>String(i+1)),low:['a','b','c','d','e','f','g','h','i','j']};
const SEQ_KO={latin:'A, B, C …',gana:'(가), (나) …',circ:'㉠, ㉡ …',mk:'㉮, ㉯ …',num:'1, 2, 3 … (끝없이)',low:'a, b, c …'};
function freshDoc(app){
  return {app:app||'landform',v:1,page:{auto:true,w:120,h:80,margin:1.5},base:null,items:[],
    style:{serif:'hysm',gothic:'hyjg',latin:'times',size:10,lw:0.15},seq:{set:'latin',next:0},gen:null,meta:{notes:''}};
}
function normalizeDoc(d){
  d=GG.clean(d);   /* 밖에서 들어온 값 정리(보안): gengine.js clean() */
  if(!d||typeof d!=='object'||!['landform','kmap'].includes(d.app)) return freshDoc(); const f=freshDoc(d.app);
  const out=Object.assign({},f,d); out.page=Object.assign({},f.page,d.page||{}); out.style=Object.assign({},f.style,d.style||{});
  out.seq=Object.assign({},f.seq,d.seq||{}); out.meta=Object.assign({},f.meta,d.meta||{});
  out.items=Array.isArray(d.items)?d.items.filter(it=>it&&ITEM[it.t]).map(it=>{ const o=Object.assign({id:uid()},ITEM[it.t](),it); if(typeof o.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(o.id)) o.id=uid(); return o; }):[];
  return out;
}
/* 항목 기본값 */
const ITEM={
  sym:()=>({t:'sym',x:0,y:0,text:'A',size:null,fam:'serif',box:'halo',bold:false}),
  leader:()=>({t:'leader',x:0,y:0,tx:10,ty:10,text:'A',size:null,fam:'serif',box:'halo',dot:false,lw:null}),
  ell:()=>({t:'ell',cx:0,cy:0,rx:4,ry:3,dash:'dot',lw:null,fill:'none'}),
  arrow:()=>({t:'arrow',x1:0,y1:0,x2:10,y2:0,lw:null,head:'end',dash:'solid',bend:0}),
  line:()=>({t:'line',x1:0,y1:0,x2:10,y2:0,lw:null,dash:'solid'}),
  rect:()=>({t:'rect',x:0,y:0,w:10,h:6,fill:'white',stroke:'none',lw:null}),
  text:()=>({t:'text',x:0,y:0,text:'글',size:null,fam:'gothic',align:'center',box:'none',bold:false}),
  dot:()=>({t:'dot',x:0,y:0,r:0.45})
};
const ITEM_KO={sym:'기호',leader:'지시선 기호',ell:'점선 타원',arrow:'화살표',line:'선',rect:'사각형',text:'글상자',dot:'점'};
function makeItem(t,props){ return Object.assign({id:uid()},ITEM[t](),props||{}); }
function nextSym(doc){ const S=SEQS[doc.seq.set]||SEQS.latin; return S[doc.seq.next%S.length]; }
function takeSym(doc){ const s=nextSym(doc); doc.seq.next++; return s; }

/* ───────── 글자 크기 ───────── */
const probe=document.createElement('canvas').getContext('2d');
function famOf(doc,fam){ return GG.fontStack({style:doc.style},fam==='gothic'?'gothic':'serif'); }
function fsize(doc,it){ return (it.size||doc.style.size)*MMPT; }          // mm
function fontCss(doc,it,scale){ return `${it.bold?'bold ':''}${(fsize(doc,it)*(scale||1)).toFixed(3)}px ${famOf(doc,it.fam)}`; }
const mcache=new Map();
function measure(doc,it,str){
  const key=`${it.fam}|${it.bold?1:0}|${doc.style.serif}|${doc.style.gothic}|${doc.style.latin}|${str}`; let w=mcache.get(key);
  if(w==null){ probe.font=fontCss(doc,Object.assign({},it,{size:100/MMPT}),1); w=probe.measureText(str).width/100; mcache.set(key,w); }
  const fs=fsize(doc,it); return {w:w*fs,h:fs};
}
function clearMetrics(){ mcache.clear(); }
/* 글자 상자(가운데 x,y) */
function labelBox(doc,it){ const lines=String(it.text||'').split('\n'); const fs=fsize(doc,it); const lh=fs*1.25;
  const w=Math.max(...lines.map(l=>measure(doc,it,l||' ').w)); const h=fs+(lines.length-1)*lh; return {w,h,lines,lh,fs}; }

/* ───────── 기하 ───────── */
const LW=(doc,it)=>it.lw!=null?it.lw:doc.style.lw;
const DASH={solid:null,dash:[1.0,0.6],dot:[0.35,0.45],fine:[0.6,0.4]};
function dashOf(name,lw){ const d=DASH[name]; if(!d) return null; const k=Math.max(1,lw/0.15); return d.map(v=>v*k); }
/* 지시선 시작점: 글자 상자 둘레에서 목표 쪽으로 */
function leaderStart(doc,it){ const b=labelBox(doc,it); const pad=0.45; const hw=b.w/2+pad, hh=b.h/2+pad*0.8;
  const dx=it.tx-it.x, dy=it.ty-it.y; if(Math.abs(dx)<1e-6&&Math.abs(dy)<1e-6) return [it.x,it.y];
  const t=Math.min(hw/Math.abs(dx||1e-9),hh/Math.abs(dy||1e-9)); return t>=1?[it.x,it.y]:[it.x+dx*t,it.y+dy*t]; }
function arrowHead(x1,y1,x2,y2,lw){ const L=Math.hypot(x2-x1,y2-y1)||1; const ux=(x2-x1)/L, uy=(y2-y1)/L; const hl=Math.max(1.4,lw*9), hw=Math.max(0.55,lw*3.6);
  const bx=x2-ux*hl, by=y2-uy*hl; return [[x2,y2],[bx-uy*hw,by+ux*hw],[bx+uy*hw,by-ux*hw]]; }
function bendPt(it){ const mx=(it.x1+it.x2)/2, my=(it.y1+it.y2)/2; const L=Math.hypot(it.x2-it.x1,it.y2-it.y1)||1; return [mx-(it.y2-it.y1)/L*it.bend, my+(it.x2-it.x1)/L*it.bend]; }
function bboxOf(doc,it){
  switch(it.t){
    case 'sym': { const b=labelBox(doc,it); const p=it.box==='circle'||it.box==='wcircle'?Math.max(b.w,b.h)*0.65:0; const w=Math.max(b.w,2*p), h=Math.max(b.h,2*p); return {x:it.x-w/2-0.3,y:it.y-h/2-0.3,w:w+0.6,h:h+0.6}; }
    case 'leader': { const b=labelBox(doc,it); const x0=Math.min(it.x-b.w/2,it.tx), x1=Math.max(it.x+b.w/2,it.tx), y0=Math.min(it.y-b.h/2,it.ty), y1=Math.max(it.y+b.h/2,it.ty); return {x:x0-0.3,y:y0-0.3,w:x1-x0+0.6,h:y1-y0+0.6}; }
    case 'ell': return {x:it.cx-it.rx,y:it.cy-it.ry,w:2*it.rx,h:2*it.ry};
    case 'arrow': case 'line': { const pts=[[it.x1,it.y1],[it.x2,it.y2]]; if(it.t==='arrow'&&it.bend) pts.push(bendPt(it)); const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]); return {x:Math.min(...xs)-1,y:Math.min(...ys)-1,w:Math.max(...xs)-Math.min(...xs)+2,h:Math.max(...ys)-Math.min(...ys)+2}; }
    case 'rect': return {x:Math.min(it.x,it.x+it.w),y:Math.min(it.y,it.y+it.h),w:Math.abs(it.w),h:Math.abs(it.h)};
    case 'text': { const b=labelBox(doc,it); const x=it.align==='left'?it.x:it.x-b.w/2; const pad=it.box!=='none'?1.0:0; return {x:x-pad,y:it.y-pad,w:b.w+2*pad,h:b.h+2*pad}; }
    case 'dot': return {x:it.x-it.r,y:it.y-it.r,w:2*it.r,h:2*it.r};
  }
  return {x:0,y:0,w:0,h:0};
}
function union(a,b){ if(!a) return b; if(!b) return a; const x=Math.min(a.x,b.x), y=Math.min(a.y,b.y); return {x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y}; }
/* 페이지(내보낼 영역): 자동이면 바탕과 모든 항목을 감싸고 여백을 둔다 */
function pageBox(doc){
  const P=doc.page; if(!P.auto) return {x:P.x||0,y:P.y||0,w:P.w,h:P.h};
  let b=doc.base?{x:doc.base.x,y:doc.base.y,w:doc.base.w,h:doc.base.h}:null; for(const it of doc.items) b=union(b,bboxOf(doc,it));
  if(!b) b={x:0,y:0,w:P.w,h:P.h}; const m=P.margin; return {x:b.x-m,y:b.y-m,w:b.w+2*m,h:b.h+2*m};
}
function distSeg(px,py,x1,y1,x2,y2){ const vx=x2-x1, vy=y2-y1; const L2=vx*vx+vy*vy||1e-9; const t=clamp(((px-x1)*vx+(py-y1)*vy)/L2,0,1); return Math.hypot(px-(x1+t*vx),py-(y1+t*vy)); }
/* 맞힘 판정: 위에 있는 것부터 */
function hit(doc,px,py,tol){
  for(let k=doc.items.length-1;k>=0;k--){ const it=doc.items[k]; if(hitOne(doc,it,px,py,tol)) return it; } return null; }
function hitOne(doc,it,px,py,tol){
  switch(it.t){
    case 'sym': case 'text': { const b=bboxOf(doc,it); return px>=b.x-tol&&px<=b.x+b.w+tol&&py>=b.y-tol&&py<=b.y+b.h+tol; }
    case 'leader': { const b=labelBox(doc,it); if(Math.abs(px-it.x)<=b.w/2+tol&&Math.abs(py-it.y)<=b.h/2+tol) return true; const [sx,sy]=leaderStart(doc,it); return distSeg(px,py,sx,sy,it.tx,it.ty)<=tol; }
    case 'ell': { const r=Math.hypot((px-it.cx)/Math.max(it.rx,0.1),(py-it.cy)/Math.max(it.ry,0.1)); const inside=r<=1; return it.fill!=='none'?inside:Math.abs(r-1)*Math.min(it.rx,it.ry)<=tol*1.2||(inside&&Math.min(it.rx,it.ry)<3); }
    case 'arrow': case 'line': { if(it.t==='arrow'&&it.bend){ const [bx,by]=bendPt(it); for(let s=0;s<16;s++){ const t0=s/16,t1=(s+1)/16; const q=t=>[(1-t)*(1-t)*it.x1+2*(1-t)*t*bx+t*t*it.x2,(1-t)*(1-t)*it.y1+2*(1-t)*t*by+t*t*it.y2]; const a=q(t0),b=q(t1); if(distSeg(px,py,a[0],a[1],b[0],b[1])<=tol) return true; } return false; }
      return distSeg(px,py,it.x1,it.y1,it.x2,it.y2)<=tol; }
    case 'rect': { const b=bboxOf(doc,it); const inside=px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h; if(it.fill!=='none') return inside||(Math.abs(px-b.x)<=tol||Math.abs(px-b.x-b.w)<=tol||Math.abs(py-b.y)<=tol||Math.abs(py-b.y-b.h)<=tol)&&px>=b.x-tol&&px<=b.x+b.w+tol&&py>=b.y-tol&&py<=b.y+b.h+tol;
      const near=(Math.abs(px-b.x)<=tol||Math.abs(px-b.x-b.w)<=tol)&&py>=b.y-tol&&py<=b.y+b.h+tol||(Math.abs(py-b.y)<=tol||Math.abs(py-b.y-b.h)<=tol)&&px>=b.x-tol&&px<=b.x+b.w+tol; return near; }
    case 'dot': return Math.hypot(px-it.x,py-it.y)<=it.r+tol;
  }
  return false;
}
/* 고르면 보이는 손잡이: [이름, x, y] */
function handles(doc,it){
  switch(it.t){
    case 'leader': return [['lbl',it.x,it.y],['tgt',it.tx,it.ty]];
    case 'ell': return [['e',it.cx+it.rx,it.cy],['w',it.cx-it.rx,it.cy],['s',it.cx,it.cy+it.ry],['n',it.cx,it.cy-it.ry]];
    case 'arrow': return it.bend!=null?[['p1',it.x1,it.y1],['p2',it.x2,it.y2],['mid',...bendPt(it)]]:[['p1',it.x1,it.y1],['p2',it.x2,it.y2]];
    case 'line': return [['p1',it.x1,it.y1],['p2',it.x2,it.y2]];
    case 'rect': return [['nw',it.x,it.y],['ne',it.x+it.w,it.y],['sw',it.x,it.y+it.h],['se',it.x+it.w,it.y+it.h]];
    case 'dot': return [];
    default: return [];
  }
}
function dragHandle(it,h,x,y,shift){
  switch(h){
    case 'lbl': it.x=x; it.y=y; break;
    case 'tgt': it.tx=x; it.ty=y; break;
    case 'e': case 'w': it.rx=Math.max(0.5,Math.abs(x-it.cx)); if(shift) it.ry=it.rx; break;
    case 'n': case 's': it.ry=Math.max(0.5,Math.abs(y-it.cy)); if(shift) it.rx=it.ry; break;
    case 'p1': if(shift){ [x,y]=snap45(it.x2,it.y2,x,y); } it.x1=x; it.y1=y; break;
    case 'p2': if(shift){ [x,y]=snap45(it.x1,it.y1,x,y); } it.x2=x; it.y2=y; break;
    case 'mid': { const mx=(it.x1+it.x2)/2, my=(it.y1+it.y2)/2; const L=Math.hypot(it.x2-it.x1,it.y2-it.y1)||1; const nx=-(it.y2-it.y1)/L, ny=(it.x2-it.x1)/L; it.bend=(x-mx)*nx+(y-my)*ny; break; }
    case 'nw': { const r=it.x+it.w, b=it.y+it.h; it.x=x; it.y=y; it.w=r-x; it.h=b-y; break; }
    case 'ne': { const b=it.y+it.h; it.w=x-it.x; it.y=y; it.h=b-y; break; }
    case 'sw': { const r=it.x+it.w; it.x=x; it.w=r-x; it.h=y-it.y; break; }
    case 'se': it.w=x-it.x; it.h=y-it.y; break;
  }
}
function snap45(ox,oy,x,y){ const dx=x-ox, dy=y-oy; const L=Math.hypot(dx,dy); const a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4); return [ox+L*Math.cos(a),oy+L*Math.sin(a)]; }
function moveItem(it,dx,dy){
  for(const k of ['x','cx','x1','x2','tx']) if(fin(it[k])) it[k]+=dx;
  for(const k of ['y','cy','y1','y2','ty']) if(fin(it[k])) it[k]+=dy;
}
function fixRect(it){ if(it.t==='rect'){ if(it.w<0){ it.x+=it.w; it.w=-it.w; } if(it.h<0){ it.y+=it.h; it.h=-it.h; } } }

/* ───────── 바탕 ───────── */
let svgHref={svg:null,href:null};
function baseHref(doc){ const B=doc.base; if(!B) return null;
  if(B.kind==='svg'){ if(svgHref.svg!==B.svg) svgHref={svg:B.svg,href:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(B.svg)}; return svgHref.href; }
  if(B.kind==='lib'){ const dg=diagram(B.id); return dg?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(dg.svg):null; }
  return B.src||null; }
function setLibBase(doc,id,width){ const dg=diagram(id); if(!dg) return false; const w=width||(doc.base&&doc.base.kind==='lib'?doc.base.w:120); const h=w*dg.h/dg.w;
  doc.base={kind:'lib',id,name:dg.name,x:0,y:0,w,h,natW:dg.w,natH:dg.h}; return true; }
function setImageBase(doc,src,natW,natH,name,width){ const w=width||Math.min(140,Math.max(60,natW*25.4/300)); doc.base={kind:'image',src,name:name||'불러온 그림',x:0,y:0,w,h:w*natH/natW,natW,natH}; }
function setKiceBase(doc,it,width){ setImageBase(doc,it.src,it.natW,it.natH,`${it.ex} ${it.q}번 · ${it.name}`,width||Math.max(70,it.w));
  doc.base.kid=it.id; doc.base.cite=`한국교육과정평가원, ${it.ex} 세계지리 ${it.q}번`; if(it.anchors) doc.base.anchors=it.anchors; }
/* 지금 바탕의 지형 자리 목록: 기본 모식도, 또는 지형 자리가 적힌 기출 그림 */
function baseDiagram(doc){ const B=doc&&doc.base; if(!B) return null;
  if(B.kind==='lib') return diagram(B.id);
  if(B.anchors&&B.anchors.length) return {id:'k:'+(B.kid||'img'),name:B.name,anchors:B.anchors,img:true};
  return null; }
/* 지형 위치(바탕 좌표 → 페이지 mm) */
function anchorPos(doc,a){ const B=doc.base; if(!B) return null;
  if(B.kind!=='lib'){ if(a.fx==null) return null; return {x:B.x+a.fx*B.w,y:B.y+a.fy*B.h,rx:(a.rx||0.03)*B.w,ry:(a.ry||a.rx||0.03)*B.w}; }
  const dg=diagram(B.id); if(!dg) return null; const k=B.w/dg.w;
  return {x:B.x+(a.x-dg.x0)*k,y:B.y+(a.y-dg.y0)*k,rx:(a.rx||3)*k,ry:(a.ry||(a.rx||3)*0.7)*k}; }

/* ───────── SVG로 그리기 ───────── */
const f3=v=>(Math.round(v*1000)/1000).toString();
function itemSVG(doc,it){
  const lw=LW(doc,it); const da=a=>a?` stroke-dasharray="${a.map(f3).join(' ')}"`:'';
  const textSVG=(x,y,txt,b,anchor)=>{ const fs=b.fs; const lines=b.lines; const top=y-b.h/2; let s='';
    lines.forEach((l,i)=>{ const yy=top+fs*0.86+i*b.lh; s+=`<text x="${f3(x)}" y="${f3(yy)}" font-size="${f3(fs)}" text-anchor="${anchor}" font-family="${esc(famOf(doc,it.fam))}"${it.bold?' font-weight="bold"':''}>${esc(l)}</text>`; }); return s; };
  const labelSVG=(x,y)=>{ const b=labelBox(doc,it); let s='';
    if(it.box==='white') s+=`<rect x="${f3(x-b.w/2-0.4)}" y="${f3(y-b.h/2-0.3)}" width="${f3(b.w+0.8)}" height="${f3(b.h+0.6)}" fill="#fff"/>`;
    if(it.box==='circle'||it.box==='wcircle'){ const r=Math.max(b.w,b.h)*0.62; s+=`<circle cx="${f3(x)}" cy="${f3(y)}" r="${f3(r)}" fill="${it.box==='wcircle'?'#fff':'none'}" stroke="#000" stroke-width="${f3(lw)}"/>`; }
    if(it.box==='halo') s+=`<g stroke="#fff" stroke-width="${f3(b.fs*0.32)}" stroke-linejoin="round" fill="#fff">${textSVG(x,y,it.text,b,'middle')}</g>`;
    return s+`<g fill="#000">${textSVG(x,y,it.text,b,'middle')}</g>`; };
  switch(it.t){
    case 'sym': return labelSVG(it.x,it.y);
    case 'leader': { const [sx,sy]=leaderStart(doc,it); let s=`<line x1="${f3(sx)}" y1="${f3(sy)}" x2="${f3(it.tx)}" y2="${f3(it.ty)}" stroke="#000" stroke-width="${f3(lw*0.8)}"/>`;
      if(it.dot) s+=`<circle cx="${f3(it.tx)}" cy="${f3(it.ty)}" r="${f3(Math.max(0.35,lw*2.2))}" fill="#000"/>`; return s+labelSVG(it.x,it.y); }
    case 'ell': return `<ellipse cx="${f3(it.cx)}" cy="${f3(it.cy)}" rx="${f3(it.rx)}" ry="${f3(it.ry)}" fill="${it.fill==='white'?'#fff':'none'}" stroke="#000" stroke-width="${f3(lw)}"${da(dashOf(it.dash,lw))} stroke-linecap="round"/>`;
    case 'line': return `<line x1="${f3(it.x1)}" y1="${f3(it.y1)}" x2="${f3(it.x2)}" y2="${f3(it.y2)}" stroke="#000" stroke-width="${f3(lw)}"${da(dashOf(it.dash,lw))}/>`;
    case 'arrow': { const ends=arrowEnds(it,lw); let s=`<path d="${ends.d}" fill="none" stroke="#000" stroke-width="${f3(lw)}"${da(dashOf(it.dash,lw))}/>`;
      for(const H of ends.heads) s+=`<path d="M${H.map(p=>f3(p[0])+' '+f3(p[1])).join(' L')} Z" fill="#000"/>`; return s; }
    case 'rect': { const b=bboxOf(doc,it); const st=it.stroke==='none'?'none':'#000'; return `<rect x="${f3(b.x)}" y="${f3(b.y)}" width="${f3(b.w)}" height="${f3(b.h)}" fill="${it.fill==='white'?'#fff':it.fill==='gray'?'#d9d9d9':'none'}" stroke="${st}" stroke-width="${f3(lw)}"${da(it.stroke==='dash'?dashOf('dash',lw):null)}/>`; }
    case 'text': { const b=labelBox(doc,it); const x=it.align==='left'?it.x:it.x; const cy=it.y+b.h/2; const bx=bboxOf(doc,it); let s='';
      if(it.box!=='none') s+=`<rect x="${f3(bx.x)}" y="${f3(bx.y)}" width="${f3(bx.w)}" height="${f3(bx.h)}" fill="#fff" stroke="${it.box==='frame'?'#000':'none'}" stroke-width="${f3(lw)}"/>`;
      return s+`<g fill="#000">${textSVG(x,cy,it.text,b,it.align==='left'?'start':'middle')}</g>`; }
    case 'dot': return `<circle cx="${f3(it.x)}" cy="${f3(it.y)}" r="${f3(it.r)}" fill="#000"/>`;
  }
  return '';
}
/* 화살표: 휘면 2차 곡선. 머리 자리만큼 선을 줄인다 */
function arrowEnds(it,lw){
  const heads=[]; let x1=it.x1,y1=it.y1,x2=it.x2,y2=it.y2; const bend=it.bend||0; const [bx,by]=bend?bendPt(it):[0,0];
  const tip=(ax,ay,px,py)=>{ const H=arrowHead(px,py,ax,ay,lw); heads.push(H); const L=Math.hypot(ax-px,ay-py)||1; const hl=Math.max(1.4,lw*9)*0.8; return [ax-(ax-px)/L*hl,ay-(ay-py)/L*hl]; };
  if(it.head==='end'||it.head==='both'){ const [px,py]=bend?[bx,by]:[x1,y1]; [x2,y2]=tip(x2,y2,px,py); }
  if(it.head==='both'||it.head==='start'){ const [px,py]=bend?[bx,by]:[it.x2,it.y2]; [x1,y1]=tip(x1,y1,px,py); }
  const d=bend?`M${f3(x1)} ${f3(y1)} Q${f3(bx)} ${f3(by)} ${f3(x2)} ${f3(y2)}`:`M${f3(x1)} ${f3(y1)} L${f3(x2)} ${f3(y2)}`;
  return {d,heads};
}
function svgString(doc,opts){
  opts=opts||{}; const pb=pageBox(doc); const href=baseHref(doc); const B=doc.base;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${f3(pb.w)}mm" height="${f3(pb.h)}mm" viewBox="${f3(pb.x)} ${f3(pb.y)} ${f3(pb.w)} ${f3(pb.h)}">`;
  s+=`<rect x="${f3(pb.x)}" y="${f3(pb.y)}" width="${f3(pb.w)}" height="${f3(pb.h)}" fill="#fff"/>`;
  if(B&&href){ if(B.kind==='svg'&&opts.inline){ s+=B.svg.replace(/^<svg /,`<svg x="${f3(B.x)}" y="${f3(B.y)}" width="${f3(B.w)}" height="${f3(B.h)}" `).replace(/ width="[\d.]+mm" height="[\d.]+mm"/,''); }
    else if(B.kind==='lib'&&opts.inline){ const dg=diagram(B.id); s+=dg.svg.replace(/^<svg /,`<svg x="${f3(B.x)}" y="${f3(B.y)}" width="${f3(B.w)}" height="${f3(B.h)}" `).replace(/ width="[\d.]+mm" height="[\d.]+mm"/,''); }
    else s+=`<image href="${href}" xlink:href="${href}" x="${f3(B.x)}" y="${f3(B.y)}" width="${f3(B.w)}" height="${f3(B.h)}" preserveAspectRatio="none"/>`; }
  for(const it of doc.items) s+=`<g data-id="${esc(it.id)}">${itemSVG(doc,it)}</g>`;
  return s+'</svg>';
}

/* ───────── 캔버스(PNG) ───────── */
function drawItems(ctx,doc,k){
  for(const it of doc.items){ const lw=LW(doc,it)*k; ctx.save(); ctx.lineCap='butt'; ctx.lineJoin='round'; ctx.strokeStyle='#000'; ctx.fillStyle='#000';
    const setDash=a=>ctx.setLineDash(a?a.map(v=>v*k):[]);
    const label=(x,y)=>{ const b=labelBox(doc,it); ctx.font=fontCss(doc,it,k); ctx.textAlign='center'; ctx.textBaseline='alphabetic';
      if(it.box==='white'){ ctx.fillStyle='#fff'; ctx.fillRect((x-b.w/2-0.4)*k,(y-b.h/2-0.3)*k,(b.w+0.8)*k,(b.h+0.6)*k); }
      if(it.box==='circle'||it.box==='wcircle'){ const r=Math.max(b.w,b.h)*0.62; ctx.beginPath(); ctx.arc(x*k,y*k,r*k,0,Math.PI*2); if(it.box==='wcircle'){ ctx.fillStyle='#fff'; ctx.fill(); } ctx.lineWidth=lw; setDash(null); ctx.stroke(); }
      const top=y-b.h/2;
      if(it.box==='halo'){ ctx.strokeStyle='#fff'; ctx.lineWidth=b.fs*0.32*k; ctx.lineJoin='round'; b.lines.forEach((l,i)=>ctx.strokeText(l,x*k,(top+b.fs*0.86+i*b.lh)*k)); }
      ctx.fillStyle='#000'; b.lines.forEach((l,i)=>ctx.fillText(l,x*k,(top+b.fs*0.86+i*b.lh)*k)); };
    switch(it.t){
      case 'sym': label(it.x,it.y); break;
      case 'leader': { const [sx,sy]=leaderStart(doc,it); ctx.lineWidth=lw*0.8; ctx.beginPath(); ctx.moveTo(sx*k,sy*k); ctx.lineTo(it.tx*k,it.ty*k); ctx.stroke();
        if(it.dot){ ctx.beginPath(); ctx.arc(it.tx*k,it.ty*k,Math.max(0.35,LW(doc,it)*2.2)*k,0,Math.PI*2); ctx.fill(); } label(it.x,it.y); break; }
      case 'ell': ctx.lineWidth=lw; setDash(dashOf(it.dash,LW(doc,it))); ctx.lineCap='round'; ctx.beginPath(); ctx.ellipse(it.cx*k,it.cy*k,Math.max(0.01,it.rx)*k,Math.max(0.01,it.ry)*k,0,0,Math.PI*2); if(it.fill==='white'){ ctx.fillStyle='#fff'; ctx.fill(); } ctx.stroke(); break;
      case 'line': ctx.lineWidth=lw; setDash(dashOf(it.dash,LW(doc,it))); ctx.beginPath(); ctx.moveTo(it.x1*k,it.y1*k); ctx.lineTo(it.x2*k,it.y2*k); ctx.stroke(); break;
      case 'arrow': { const E=arrowEnds(it,LW(doc,it)); ctx.lineWidth=lw; setDash(dashOf(it.dash,LW(doc,it))); ctx.stroke(new Path2D(scalePath(E.d,k))); setDash(null);
        for(const H of E.heads){ ctx.beginPath(); H.forEach((p,i)=>i?ctx.lineTo(p[0]*k,p[1]*k):ctx.moveTo(p[0]*k,p[1]*k)); ctx.closePath(); ctx.fill(); } break; }
      case 'rect': { const b=bboxOf(doc,it); if(it.fill!=='none'){ ctx.fillStyle=it.fill==='white'?'#fff':'#d9d9d9'; ctx.fillRect(b.x*k,b.y*k,b.w*k,b.h*k); }
        if(it.stroke!=='none'){ ctx.lineWidth=lw; setDash(it.stroke==='dash'?dashOf('dash',LW(doc,it)):null); ctx.strokeRect(b.x*k,b.y*k,b.w*k,b.h*k); } break; }
      case 'text': { const b=labelBox(doc,it); const bx=bboxOf(doc,it);
        if(it.box!=='none'){ ctx.fillStyle='#fff'; ctx.fillRect(bx.x*k,bx.y*k,bx.w*k,bx.h*k); if(it.box==='frame'){ ctx.lineWidth=lw; ctx.strokeRect(bx.x*k,bx.y*k,bx.w*k,bx.h*k); } }
        ctx.fillStyle='#000'; ctx.font=fontCss(doc,it,k); ctx.textAlign=it.align==='left'?'left':'center'; b.lines.forEach((l,i)=>ctx.fillText(l,it.x*k,(it.y+b.fs*0.86+i*b.lh)*k)); break; }
      case 'dot': ctx.beginPath(); ctx.arc(it.x*k,it.y*k,it.r*k,0,Math.PI*2); ctx.fill(); break;
    }
    ctx.restore(); }
}
function scalePath(d,k){ return d.replace(/-?\d+(?:\.\d+)?/g,m=>String(+m*k)); }
function loadImage(src){ return new Promise((ok,no)=>{ const im=new Image(); im.onload=()=>ok(im); im.onerror=no; im.src=src; }); }
async function renderCanvas(doc,dpi){
  const pb=pageBox(doc); const k=dpi/25.4; const W=Math.max(1,Math.round(pb.w*k)), H=Math.max(1,Math.round(pb.h*k));
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);
  ctx.translate(-pb.x*k,-pb.y*k);
  const B=doc.base, href=baseHref(doc);
  if(B&&href){ const im=await loadImage(href); ctx.imageSmoothingQuality='high'; ctx.drawImage(im,B.x*k,B.y*k,B.w*k,B.h*k); }
  drawItems(ctx,doc,k); return cv;
}
async function renderPng(doc,dpi){ const cv=await renderCanvas(doc,dpi); return await new Promise(ok=>cv.toBlob(ok,'image/png')); }

/* ───────── 문장으로 기호 놓기 ───────── */
/* 지형 이름 → 모식도 */
function diagramFor(text,names,pool){
  const t=String(text||''); const all=pool||diagrams(); if(!all.length) return null;
  const score=dg=>{ let s=0; for(const w of dg.words||[]) if(t.includes(w)) s+=3; for(const a of dg.anchors){ if(names.some(n=>norm(n)===norm(a.ko)||(a.alias||[]).some(x=>norm(x)===norm(n)))) s+=2; } return s; };
  let best=null, bs=0; for(const dg of all){ const s=score(dg); if(s>bs){ best=dg; bs=s; } } return best;
}
/* 문장 → {diagram, pairs:[[지형, 기호]], set, mark, shuffle} */
function parseRequest(q,pool){
  const text=String(q||'').replace(/\s+/g,' ').trim(); const out={dg:null,pairs:[],set:null,mark:null,shuffle:false,missing:[],notes:[]};
  if(!text) return out;
  if(/섞|무작위|랜덤/.test(text)) out.shuffle=true;
  if(/점선\s*(원|타원)|동그라미/.test(text)) out.mark='ell'; else if(/글자만|기호만|바로\s*위/.test(text)) out.mark='plain'; else if(/지시선|선으로/.test(text)) out.mark='leader';
  /* 모든 모식도의 지형 이름 후보(긴 것부터) */
  const cands=[]; for(const dg of (pool||diagrams())) for(const a of dg.anchors) for(const n of [a.ko,...(a.alias||[])]) cands.push(n);
  cands.sort((a,b)=>b.length-a.length);
  const used=new Array(text.length).fill(false); const found=[];
  /* ‘빙하 지형’, ‘대륙 빙하 모식도’처럼 그림 종류를 말하는 낱말은 지형 이름으로 읽지 않는다 */
  for(const m of text.matchAll(/((?:대륙|산악)\s*)?(?:빙하|건조|카르스트|화산|해안|하천|사막)\s*(?:기후\s*)?(?:지형|모식도)|(?:대륙|산악)\s*빙하/g)) for(let k=m.index;k<m.index+m[0].length;k++) used[k]=true;
  for(const n of cands){ let from=0; for(;;){ const i=text.indexOf(n,from); if(i<0) break; from=i+1; if(used.slice(i,i+n.length).some(Boolean)) continue;
      /* 낱말 경계: ‘카르스트’ 안의 ‘카르’처럼 다른 낱말의 일부면 건너뛴다(뒤에 조사는 괜찮다) */
      const pre=text[i-1]||' ', post=text[i+n.length]||' ';
      if(/[가-힣A-Za-z]/.test(pre)) continue; if(/[가-힣]/.test(post)&&!/[은는이가을를과와의도로에만및]/.test(post)) continue; if(/[A-Za-z]/.test(post)) continue;
      for(let k=i;k<i+n.length;k++) used[k]=true; found.push([i,n]); } }
  found.sort((a,b)=>a[0]-b[0]); const names=[]; for(const [,n] of found) if(!names.some(x=>norm(x)===norm(n))) names.push(n);
  out.dg=diagramFor(text,names,pool);
  /* 지형별로 기호를 직접 적었는가: ‘권곡은 A’ ‘권곡(A)’ ‘권곡=A’ */
  const SYM=String.raw`\([가-하]\)|[A-Z]|[㉠-㉭]|[a-j]|\d{1,3}`; const direct=[];
  for(const [i,n] of found){ const rest=text.slice(i+n.length); const m=rest.match(new RegExp(String.raw`^\s*(?:은|는|을|를|이|가|=|:)?\s*\(?\s*(${SYM})\s*\)?\s*(?:로|으로)?(?=[\s,.]|$)`)); if(m) direct.push([n,m[1].length===1&&/[가-하]/.test(m[1])?`(${m[1]})`:m[1]]); }
  /* 순서 지정: ‘A~C’, ‘(가)~(라)’, ‘㉠~㉣’ */
  const rng=text.match(/(\([가-하]\)|[A-Z]|[㉠-㉭])\s*[~∼～\-–]\s*(\([가-하]\)|[A-Z]|[㉠-㉭])/);
  if(rng){ const a=rng[1]; out.set=/^\(/.test(a)?'gana':/[㉠-㉭]/.test(a)?'circ':'latin'; }
  else if(/\([가-하]\)/.test(text)) out.set='gana'; else if(/[㉠-㉭]/.test(text)) out.set='circ';
  const dg=out.dg; if(!dg) return out;
  const feat=n=>featureOf(dg,n);
  if(direct.length){ for(const [n,s] of direct){ const a=feat(n); if(a) out.pairs.push([a.key,s]); else out.missing.push(n); } }
  else { const keys=[]; for(const n of names){ const a=feat(n); if(a){ if(!keys.includes(a.key)) keys.push(a.key); } else out.missing.push(n); }
    if(!keys.length&&/모두|전부|다\s*표시/.test(text)) dg.anchors.filter(a=>a.main!==false).forEach(a=>keys.push(a.key));
    const S=SEQS[out.set||'latin']; const order=out.shuffle?shuffle(keys.slice()):keys; order.forEach((k,i)=>out.pairs.push([k,S[i%S.length]])); }
  return out;
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
/* ‘기출 …’ 문장 → 기출 그림 고르기(+지형 자리가 있으면 기호까지) */
function kiceFind(q){
  const t=String(q||''); const items=kiceItems(); if(!items.length) return null;
  const yr=(t.match(/(?:20)?(2[3-9])\s*학년도/)||t.match(/20(2[3-9])/)||[])[1], mo=/수능|대수능|11월/.test(t)?'수능':(t.match(/(6|9)\s*월/)||[])[1];
  const qn=(t.match(/(\d{1,2})\s*번/)||[])[1];
  const wantClean=/지운|깨끗|기호\s*없|빈\s*판/.test(t), wantFull=/원래|원본|전체/.test(t), wantBlock=/모식도|블록/.test(t);
  let best=null, bs=0;
  for(const it of items){ let s=0;
    for(const tg of it.tags) if(t.includes(tg)) s+=3;
    for(const w of it.name.replace(/[()㉠-㉭]/g,' ').split(/[\s,·:]+/)) if(w.length>1&&!/^(지형|모식도|그림|원래|전체|기호|지운|있음|사진)$/.test(w)&&t.includes(w)) s+=2;
    if(/사진/.test(t)&&!/모식도/.test(it.name)) s+=2;
    if(t.includes(it.group)) s+=1;
    if(yr&&it.ex.includes('20'+yr)) s+=4; if(mo){ if(mo==='수능'?it.ex.includes('수능'):it.ex.includes(mo+'월')) s+=4; }
    if(qn&&String(it.q)===qn) s+=4;
    if(wantClean&&/지운/.test(it.name)) s+=3; if(wantFull&&/원래/.test(it.name)) s+=3; if(wantBlock&&/모식도/.test(it.name)) s+=2;
    if(it.anchors) s+=0.5;
    if(s>bs){ bs=s; best=it; } }
  return bs>=3?best:null; }
function parseKice(q){
  const it=kiceFind(q); if(!it) return {kice:null};
  if(!it.anchors) return {kice:it,dg:null,pairs:[]};
  const dg={id:'k:'+it.id,name:`${it.ex} ${it.q}번 · ${it.name}`,anchors:it.anchors,words:[],img:true};
  const sp=parseRequest(String(q).replace(/기출/g,' '),[dg]); sp.kice=it; sp.dg=dg; return sp; }
/* 기호 자리 찾기: 지형 둘레를 돌며, 다른 글자·타원·바탕 밖과 겹치지 않는 곳 */
function place(doc,pairs,opts){
  opts=opts||{}; const B=doc.base; const dg=baseDiagram(doc); if(!dg) return {placed:[],missing:pairs.map(p=>p[0])};
  const mark0=opts.mark||'ell'; const fsMM=(doc.style.size)*MMPT; const placed=[]; const boxes=[]; const items=[];
  const cx0=B.x+B.w/2, cy0=B.y+B.h/2;
  /* 종유석처럼 작은 지형(pt)은 점선 원 대신 점 찍은 지시선으로 */
  const feats=pairs.map(([key,sym])=>{ const a=dg.anchors.find(x=>x.key===key); return a?{a,sym,p:anchorPos(doc,a),m:mark0==='ell'&&a.pt?'leader':mark0}:null; }).filter(Boolean);
  for(const f of feats) if(f.m==='ell') boxes.push({x:f.p.x-f.p.rx,y:f.p.y-f.p.ry,w:2*f.p.rx,h:2*f.p.ry,ell:true});
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  for(const f of feats){ const {p,a,sym}=f; const mark=f.m;
    if(mark==='plain'){ items.push(makeItem('sym',{x:p.x,y:p.y,text:sym,box:'halo'})); placed.push([a.key,sym]); continue; }
    const tmp=makeItem('sym',{text:sym}); const lb=labelBox(doc,tmp); const w=lb.w+0.8, h=lb.h+0.6;
    const pref=a.dir!=null?a.dir*Math.PI/180:Math.atan2(p.y-cy0,p.x-cx0);
    let best=null;
    for(const R of [1.6,2.4,3.4,4.6,6.0]) for(let s=0;s<24;s++){
      const ang=pref+(s%2?1:-1)*Math.ceil(s/2)*Math.PI/12; const er=mark==='ell'?Math.hypot(p.rx*Math.cos(ang),p.ry*Math.sin(ang)):0.8;
      const d=er+R*fsMM+w/2; const x=p.x+Math.cos(ang)*d, y=p.y+Math.sin(ang)*d; const box={x:x-w/2,y:y-h/2,w,h};
      let pen=0; for(const b of boxes) pen+=overlap(box,b)*(b.ell?3:8);
      for(const it of items) if(it.t==='leader'){ if(segBox(...leaderStart(doc,it),it.tx,it.ty,box)) pen+=6; }
      if(box.x<B.x-2||box.x+box.w>B.x+B.w+2||box.y<B.y-2||box.y+box.h>B.y+B.h+2) pen+=4;
      const score=pen*10+R*1.2+Math.ceil(s/2)*0.35;
      if(!best||score<best.score) best={x,y,ang,score,box}; }
    boxes.push(best.box);
    const tx=mark==='ell'?p.x+Math.cos(best.ang)*Math.hypot(p.rx*Math.cos(best.ang),p.ry*Math.sin(best.ang)):p.x;
    const ty=mark==='ell'?p.y+Math.sin(best.ang)*Math.hypot(p.rx*Math.cos(best.ang),p.ry*Math.sin(best.ang)):p.y;
    if(mark==='ell') items.push(makeItem('ell',{cx:p.x,cy:p.y,rx:p.rx,ry:p.ry,dash:'dot'}));
    items.push(makeItem('leader',{x:best.x,y:best.y,tx,ty,text:sym,box:'halo',dot:mark==='leader'}));
    placed.push([a.key,sym]); }
  doc.items.push(...items); return {placed,missing:[]};
}
function segBox(x1,y1,x2,y2,b){ for(let s=0;s<=10;s++){ const t=s/10; const x=x1+(x2-x1)*t, y=y1+(y2-y1)*t; if(x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h) return true; } return false; }
/* 문장 해석 결과로 문서 만들기 */
function specToDoc(spec,cur){
  const d=freshDoc(); if(cur){ d.style=Object.assign({},cur.style); d.page=Object.assign({},cur.page,{auto:true}); }
  if(!spec.dg) return {doc:d,info:{noDiagram:true}};
  if(spec.kice) setKiceBase(d,spec.kice); else setLibBase(d,spec.dg.id,cur&&cur.base&&cur.base.kind==='lib'?cur.base.w:120);
  if(spec.set) d.seq.set=spec.set;
  const r=place(d,spec.pairs,{mark:spec.mark||'ell'});
  d.seq.next=spec.pairs.length; d.gen={dg:spec.dg.id,pairs:r.placed};
  return {doc:d,info:{missing:spec.missing,placed:r.placed}};
}
/* 정답과 발문 단서 */
function seqRange(lbls){ const all=Object.values(SEQS); for(const S of all){ const idx=lbls.map(l=>S.indexOf(l)); if(idx.every(i=>i>=0)){ const s=idx.slice().sort((a,b)=>a-b); if(s.every((v,i)=>!i||v===s[i-1]+1)&&s.length>2) return `${S[s[0]]}~${S[s[s.length-1]]}`; } } return lbls.join(', '); }
function hintOf(doc){
  const g=doc.gen; if(!g||!g.pairs||!g.pairs.length) return null; const dg=String(g.dg).startsWith('k:')?baseDiagram(doc):diagram(g.dg); if(!dg) return null;
  const syms=new Set(doc.items.filter(it=>it.t==='leader'||it.t==='sym').map(it=>it.text));
  const pairs=g.pairs.filter(([,s])=>syms.has(s)).map(([k,s])=>[(dg.anchors.find(a=>a.key===k)||{}).ko||k,s]); if(!pairs.length) return null;
  pairs.sort((a,b)=>a[1].localeCompare(b[1],'ko')); const lbls=pairs.map(p=>p[1]); const last=lbls[lbls.length-1];
  const names=pairs.map(p=>p[0]).slice().sort((a,b)=>a.localeCompare(b,'ko'));
  return {sentence:`(단, ${seqRange(lbls)}${particle(last)} 각각 ${names.join(', ')} 중 하나임.)`,key:pairs.map(p=>`${p[1]} ${p[0]}`).join(', ')};
}
function particle(lbl){ const s=String(lbl).replace(/[()]/g,''); const c=s.charCodeAt(s.length-1);
  if(c>=0xAC00&&c<=0xD7A3) return (c-0xAC00)%28?'은':'는';
  if(/[㉠-㉭]/.test(s)) return '은';
  if(/[A-Z]/i.test(s)) return /[LMNR]$/i.test(s)?'은':'는';
  if(/\d/.test(s)) return /[013678]$/.test(s)?'은':'는';
  return '는'; }

return {SEQS,SEQ_KO,ITEM_KO,setData,data,setKice,kiceItems,kiceItem,kiceNote,setKiceBase,baseDiagram,kiceFind,parseKice,diagrams,diagram,featureOf,freshDoc,normalizeDoc,makeItem,nextSym,takeSym,labelBox,bboxOf,pageBox,hit,handles,dragHandle,moveItem,fixRect,
  baseHref,setLibBase,setImageBase,anchorPos,svgString,itemSVG,renderCanvas,renderPng,loadImage,parseRequest,specToDoc,place,hintOf,clearMetrics,leaderStart};
})();
