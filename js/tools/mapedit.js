HUB.def('mapedit',function(ROOT,OPT){
'use strict';
const $ = (s,r=ROOT)=>r.querySelector(s);
const $$ = (s,r=ROOT)=>[...r.querySelectorAll(s)];
const {MMPT,M,clamp,r3,uid,esc,norm,RIVERS,KO_FIX,FONTS,SEQS,PROJS,PRESETS,LODS,kxOf,makeProj,fitView,applyPreset,freshDoc,
  fmtLat,fmtLon,fmtTick,parseCoord,gray,metrics,boxEdge,ellPoint,countryCentroid,geo}=WG;
const fontDef=()=>WG.fontDef(doc), fontAvailable=WG.fontAvailable, nextLabel=()=>WG.nextLabel(doc);
const G=()=>WG.G(doc), wantLod=()=>WG.wantLod(doc), degAcross=()=>WG.degAcross(doc), currentLodName=()=>WG.currentLodName(doc), anyGeo=WG.anyGeo;
const loadLod=WG.loadLod, loadPlaces=WG.loadPlaces, normalize=WG.normalizeDoc;
const markerR=it=>WG.markerR(doc,it), labelFont=()=>WG.labelFont(doc), geomOf=(it,P,ctx)=>WG.geomOf(doc,it,P,ctx), placeOffset=(d,it)=>WG.placeOffset(doc,d,it);
const countryAt=(lon,lat)=>WG.countryAt(doc,lon,lat);
const drawBase=(c,P,fw,fh,wf)=>WG.drawBase(doc,c,P,fw,fh,wf), drawOverlay=(c,P,fw,fh)=>WG.drawOverlay(doc,c,P,fw,fh);

/* ───────── 문서 ───────── */
function sampleDoc(){
  const d=freshDoc('europe');
  const pts=[['A',51.92,4.48,-1.2,4.4],['B',53.55,9.99,2.2,2.3],['C',48.14,11.57,-2.2,-2.6],['D',43.3,5.37,-1.9,-2.5]];
  d.items=pts.map(([l,lat,lon,dx,dy])=>({id:uid(),t:'pt',lon,lat,mk:'dot',lbl:l,dx,dy,leader:'on',halo:false,extra:[]}));
  return d;
}

let doc, proj, sel=null, tool='select';

/* ───────── 되돌리기 ───────── */
let hist=[],hi=-1;
const snap=()=>JSON.stringify(doc);
function commit(opts){
  const s=snap();
  if(hist[hi]!==s){ hist=hist.slice(0,hi+1); hist.push(s); if(hist.length>120){hist.shift();} hi=hist.length-1; }
  saveDraft(); syncUndo(); ensureGlyphs();
  if(!opts||opts.base!==false) needBase=true;
  requestRender(); if(!opts||!opts.quiet) syncPanels();
}
function restoreSnap(s){ const cur=doc; doc=JSON.parse(s); if(doc.preset===cur.preset&&doc.view.proj===cur.view.proj&&doc.frame.w===cur.frame.w&&doc.frame.h===cur.frame.h) doc.view=cur.view; if(sel&&!doc.items.find(i=>i.id===sel.id)) sel=null; rebuild(); needBase=true; requestRender(); syncPanels(); saveDraft(); }
function undo(){ if(hi>0){hi--; restoreSnap(hist[hi]); syncUndo();} }
function redo(){ if(hi<hist.length-1){hi++; restoreSnap(hist[hi]); syncUndo();} }
function syncUndo(){ $('#undoBtn').disabled=hi<=0; $('#redoBtn').disabled=hi>=hist.length-1; }
let draftTimer=0, glyphT=0;
function ensureGlyphs(){ clearTimeout(glyphT); glyphT=setTimeout(()=>{ WG.ensureGlyphs(doc).then(()=>requestRender()); },120); }
function saveDraft(){ clearTimeout(draftTimer); draftTimer=setTimeout(()=>{ try{localStorage.setItem('wgmap-draft-v1',JSON.stringify(doc));}catch(e){} },300); }

/* ───────── 화면 ───────── */
const cv=$('#cv'), desk=$('#desk');
const base=document.createElement('canvas');
let kd=10, ox=0, oy=0, dpr=1, needBase=true, raf=0, baseInfo=null, lastBaseMs=0, interacting=false, idleT=0;
let lastGeoms=[], hoverCid=null, draft=null, themeC={}, sx={ex:0,ey:0};
function readTheme(){ const cs=getComputedStyle(ROOT.documentElement||ROOT); themeC={desk:cs.getPropertyValue('--desk').trim()||'#c7ccd2',omr:cs.getPropertyValue('--omr').trim()||'#c3193f'}; }
function layout(){
  const W=desk.clientWidth, H=desk.clientHeight; dpr=window.devicePixelRatio||1;
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  const fw=doc.frame.w, fh=doc.frame.h, padX=28, padTop=44, padBot=40; sx=WG.sheetExtra(doc);
  kd=clamp(Math.min((W-2*padX)/(fw+sx.ex+2*M),(H-padTop-padBot)/(fh+sx.ey+2*M)),2,60);
  ox=(W-(fw+sx.ex)*kd)/2; oy=padTop+((H-padTop-padBot)-(fh+sx.ey)*kd)/2;
  needBase=true; requestRender();
}
function rebuild(){ proj=makeProj(doc.view,doc.frame.w,doc.frame.h); updateStatus(); }
function requestRender(){ if(!raf) raf=requestAnimationFrame(frame); }
function frame(){
  raf=0;
  const fast=interacting&&lastBaseMs>16;
  if(needBase&&!fast){ renderBase(); needBase=false; }
  else if(needBase&&fast){ clearTimeout(idleT); idleT=setTimeout(()=>{ if(!interacting) requestRender(); },150); }
  composite();
}
function renderBase(){
  const t0=performance.now(); const fw=doc.frame.w, fh=doc.frame.h;
  base.width=Math.max(1,Math.round(fw*kd*dpr)); base.height=Math.max(1,Math.round(fh*kd*dpr));
  const c=base.getContext('2d'); c.setTransform(kd*dpr,0,0,kd*dpr,0,0); c.clearRect(0,0,fw,fh);
  drawBase(c,proj,fw,fh,false);
  const g0=proj.invert([fw/2,fh/2]);
  baseInfo={scale:doc.view.scale,g0,p0:[fw/2,fh/2],fw,fh,kd,dpr,projT:doc.view.proj};
  lastBaseMs=performance.now()-t0;
}
function composite(){
  const c=cv.getContext('2d'), fw=doc.frame.w, fh=doc.frame.h;
  { const e=WG.sheetExtra(doc); if(Math.abs(e.ex-sx.ex)>0.01||Math.abs(e.ey-sx.ey)>0.01){ layout(); return; } }   // 범례를 지도 밖에 두면 종이 크기가 바뀜
  c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,cv.width,cv.height);
  c.fillStyle=themeC.desk; c.fillRect(0,0,cv.width/dpr,cv.height/dpr);
  c.save(); c.shadowColor='rgba(0,0,0,.22)'; c.shadowBlur=14; c.shadowOffsetY=3;
  c.fillStyle='#ffffff'; c.fillRect(ox-M*kd,oy-M*kd,(fw+sx.ex+2*M)*kd,(fh+sx.ey+2*M)*kd); c.restore();
  c.save(); c.beginPath(); c.rect(ox,oy,fw*kd,fh*kd); c.clip();
  c.fillStyle=gray(doc.style.sea); c.fillRect(ox,oy,fw*kd,fh*kd);
  if(baseInfo&&baseInfo.projT===doc.view.proj&&baseInfo.g0){
    const a=doc.view.scale/baseInfo.scale; const pn=proj(baseInfo.g0)||baseInfo.p0;
    const bx=pn[0]-a*baseInfo.p0[0], by=pn[1]-a*baseInfo.p0[1];
    const s=a*kd/baseInfo.kd*(dpr/baseInfo.dpr);
    c.setTransform(s,0,0,s,dpr*(ox+kd*bx),dpr*(oy+kd*by));
    c.drawImage(base,0,0);
  }
  c.restore();
  c.setTransform(dpr*kd,0,0,dpr*kd,dpr*ox,dpr*oy);
  c.lineWidth=0.2*doc.style.line; c.strokeStyle='#000000'; c.strokeRect(0,0,fw,fh);
  lastGeoms=drawOverlay(c,proj,fw,fh);
  drawUi(c,fw,fh);
}
function drawUi(c,fw,fh){
  const acc=themeC.omr, u=1/kd;
  c.save(); c.strokeStyle=acc; c.fillStyle=acc; c.lineWidth=1.4*u;
  const g=G();
  if(hoverCid&&g&&tool==='shade'){ const f=g.byId.get(hoverCid); if(f){ c.save(); c.beginPath(); c.rect(0,0,fw,fh); c.clip(); c.beginPath(); d3.geoPath(proj,c)(f); c.globalAlpha=.8; c.lineWidth=1.6*u; c.stroke(); c.restore(); } }
  const sg=sel&&lastGeoms.find(x=>x.it.id===sel.id);
  if(sg){
    const it=sg.it;
    if(it.t==='shade'&&g){ const f=g.byId.get(it.cid); if(f){ c.save(); c.beginPath(); c.rect(0,0,fw,fh); c.clip(); c.beginPath(); d3.geoPath(proj,c)(f); c.lineWidth=2*u; c.stroke(); c.restore(); } }
    if(sg.box){ c.setLineDash([4*u,3*u]); c.strokeRect(sg.box.x-0.35,sg.box.y-0.35,sg.box.w+0.7,sg.box.h+0.7); c.setLineDash([]); }
    const hs=5*u;
    if(it.t!=='shade') c.strokeRect(sg.a[0]-hs,sg.a[1]-hs,hs*2,hs*2);
    for(const e of sg.extras) c.strokeRect(e.p[0]-hs,e.p[1]-hs,hs*2,hs*2);
    if(it.t==='ell'){ for(const h of ellHandles(sg)) c.fillRect(h.p[0]-hs*0.8,h.p[1]-hs*0.8,hs*1.6,hs*1.6); }
  }
  if(draft){ const x=Math.min(draft.m0[0],draft.m1[0]), y=Math.min(draft.m0[1],draft.m1[1]), w=Math.abs(draft.m1[0]-draft.m0[0]), h=Math.abs(draft.m1[1]-draft.m0[1]);
    c.beginPath(); c.ellipse(x+w/2,y+h/2,Math.max(w/2,0.1),Math.max(h/2,0.1),0,0,Math.PI*2); c.setLineDash([4*u,3*u]); c.stroke(); c.setLineDash([]); }
  // 크기 조절 손잡이
  c.globalAlpha=.9; c.beginPath(); c.moveTo(fw+M-0.1,fh+M-0.1-12*u); c.lineTo(fw+M-0.1,fh+M-0.1); c.lineTo(fw+M-0.1-12*u,fh+M-0.1); c.closePath(); c.fill();
  c.restore();
}
function ellHandles(g){ const rot=(g.it.rot||0)*Math.PI/180, c=Math.cos(rot), s=Math.sin(rot);
  return [{k:'rx',p:[g.a[0]+g.rx*c,g.a[1]+g.rx*s]},{k:'ry',p:[g.a[0]-g.ry*s,g.a[1]+g.ry*c]}]; }

/* ───────── 이동·확대 ───────── */
function pan(dx,dy){
  const v=doc.view;
  if(PROJS[v.proj].cyl){ v.rot-=dx/(v.scale*kxOf(v.proj))*180/Math.PI; v.rot=((v.rot+540)%360)-180; v.ty+=dy; }
  else { v.tx+=dx; v.ty+=dy; }
  rebuild();
}
function zoomAt(f,p){
  const g=proj.invert(p); if(!g||!isFinite(g[0])) return;
  const kx=kxOf(doc.view.proj), fw=doc.frame.w;
  const minS=fw/(2*Math.PI*kx)*0.95, maxS=fw/(0.4*Math.PI/180*kx);
  doc.view.scale=clamp(doc.view.scale*f,minS,maxS); rebuild();
  const q=proj(g); if(q) pan(p[0]-q[0],p[1]-q[1]);
}
function beginInteract(){ interacting=true; }
function endInteract(){ interacting=false; needBase=true; requestRender(); saveDraft(); updateStatus(); syncViewInputs(); }

/* ───────── 포인터 ───────── */
let drag=null; const pointers=new Map(); let pinch=null;
function toMm(e){ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left-ox)/kd,(e.clientY-r.top-oy)/kd]; }
function selectedGeom(){ return sel&&lastGeoms.find(x=>x.it.id===sel.id); }
function hit(m){
  const tol=Math.max(0.6,5/kd);
  const sg=selectedGeom();
  if(sg&&sg.it.t==='ell'){ for(const h of ellHandles(sg)) if(Math.hypot(m[0]-h.p[0],m[1]-h.p[1])<tol*1.4) return {id:sg.it.id,part:h.k}; }
  for(let i=lastGeoms.length-1;i>=0;i--){ const g=lastGeoms[i]; const b=g.box; if(b&&m[0]>=b.x-0.4&&m[0]<=b.x+b.w+0.4&&m[1]>=b.y-0.4&&m[1]<=b.y+b.h+0.4) return {id:g.it.id,part:'label'}; }
  for(let i=lastGeoms.length-1;i>=0;i--){ const g=lastGeoms[i]; for(let j=0;j<g.extras.length;j++){ const e=g.extras[j]; if(Math.hypot(m[0]-e.p[0],m[1]-e.p[1])<Math.max(tol,e.r+0.4)) return {id:g.it.id,part:'extra',ei:j}; } }
  for(let i=lastGeoms.length-1;i>=0;i--){ const g=lastGeoms[i]; if(g.it.t==='pt'&&Math.hypot(m[0]-g.a[0],m[1]-g.a[1])<Math.max(tol*1.2,g.r+0.5)) return {id:g.it.id,part:'anchor'}; }
  for(let i=lastGeoms.length-1;i>=0;i--){ const g=lastGeoms[i]; if(g.it.t!=='ell') continue;
    const rot=(g.it.rot||0)*Math.PI/180, c=Math.cos(rot), s=Math.sin(rot), dx=m[0]-g.a[0], dy=m[1]-g.a[1];
    const lx=dx*c+dy*s, ly=-dx*s+dy*c, q=Math.hypot(lx/g.rx,ly/g.ry);
    if(q<1||Math.abs(q-1)*Math.min(g.rx,g.ry)<tol) return {id:g.it.id,part:'anchor'}; }
  return null;
}
function findItem(id){ return doc.items.find(i=>i.id===id); }
function setSel(s,opts){ sel=s; requestRender(); syncSel(); if(s&&!(opts&&opts.noTab)) { if(window.innerWidth>900) showTab('sel'); } $('#selDot').hidden=!s; }

cv.addEventListener('pointerdown',e=>{
  if(e.button===2) return;
  cv.setPointerCapture(e.pointerId); pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pointers.size===2){ const [p1,p2]=[...pointers.values()]; pinch={d:Math.hypot(p1[0]-p2[0],p1[1]-p2[1]),c:[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2]}; drag=null; beginInteract(); return; }
  const m=toMm(e); const fw=doc.frame.w, fh=doc.frame.h;
  if(m[0]>fw+M-14/kd&&m[0]<fw+M+2/kd&&m[1]>fh+M-14/kd&&m[1]<fh+M+2/kd){ drag={kind:'resize',m0:m,w0:fw,h0:fh}; return; }
  const h=hit(m);
  if(h){
    const it=findItem(h.id); setSel(h,{noTab:false});
    const g=lastGeoms.find(x=>x.it.id===h.id);
    drag={kind:'item',h,m0:m,moved:false,orig:JSON.parse(JSON.stringify(it)),a0:g?g.a.slice():null,ex0:h.part==='extra'&&g?g.extras[h.ei].p.slice():null};
    return;
  }
  if(tool==='ellipse'){ draft={m0:m,m1:m}; drag={kind:'ell-new',m0:m}; return; }
  drag={kind:'pending',m0:m,s0:[e.clientX,e.clientY],last:m};
});
cv.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if(pinch&&pointers.size===2){
    const [p1,p2]=[...pointers.values()]; const d=Math.hypot(p1[0]-p2[0],p1[1]-p2[1]), c=[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2];
    const r=cv.getBoundingClientRect(); const cm=[(c[0]-r.left-ox)/kd,(c[1]-r.top-oy)/kd];
    pan((c[0]-pinch.c[0])/kd,(c[1]-pinch.c[1])/kd); zoomAt(d/pinch.d,cm); pinch={d,c}; requestRender(); return;
  }
  const m=toMm(e);
  if(!drag){ hover(m); return; }
  if(drag.kind==='pending'){
    if(Math.hypot(e.clientX-drag.s0[0],e.clientY-drag.s0[1])>4){ drag.kind='pan'; beginInteract(); cv.style.cursor='grabbing'; }
    else return;
  }
  if(drag.kind==='pan'){ pan(m[0]-drag.last[0],m[1]-drag.last[1]); drag.last=toMm(e); requestRender(); return; }
  if(drag.kind==='resize'){ doc.frame.w=Math.round(clamp(drag.w0+m[0]-drag.m0[0],20,190)); doc.frame.h=Math.round(clamp(drag.h0+m[1]-drag.m0[1],15,270)); rebuild(); needBase=true; requestRender(); syncViewInputs(); return; }
  if(drag.kind==='ell-new'){ draft.m1=m; requestRender(); return; }
  if(drag.kind==='item'){
    const it=findItem(drag.h.id); if(!it) return; const dx=m[0]-drag.m0[0], dy=m[1]-drag.m0[1];
    if(!drag.moved&&Math.hypot(dx,dy)*kd<3) return; drag.moved=true;
    const p=drag.h.part;
    if(p==='label'){ it.dx=r3(drag.orig.dx+dx); it.dy=r3(drag.orig.dy+dy); }
    else if(p==='anchor'&&drag.a0){ const g=proj.invert([drag.a0[0]+dx,drag.a0[1]+dy]); if(g){ it.lon=r3(g[0]); it.lat=r3(g[1]); } }
    else if(p==='extra'&&drag.ex0){ const g=proj.invert([drag.ex0[0]+dx,drag.ex0[1]+dy]); if(g){ it.extra[drag.h.ei].lon=r3(g[0]); it.extra[drag.h.ei].lat=r3(g[1]); } }
    else if((p==='rx'||p==='ry')&&drag.a0){ const rot=(it.rot||0)*Math.PI/180, c=Math.cos(rot), s=Math.sin(rot); const vx=m[0]-drag.a0[0], vy=m[1]-drag.a0[1];
      const lx=vx*c+vy*s, ly=-vx*s+vy*c; if(p==='rx') it.rx=Math.max(0.3,Math.abs(lx))/proj.scale(); else it.ry=Math.max(0.3,Math.abs(ly))/proj.scale(); }
    requestRender();
  }
});
function finishPointer(e){
  pointers.delete(e.pointerId);
  if(pinch){ if(pointers.size<2){ pinch=null; endInteract(); } drag=null; return; }
  if(!drag) return;
  const d=drag; drag=null; cv.style.cursor='';
  if(d.kind==='pan'){ endInteract(); return; }
  if(d.kind==='resize'){ layout(); commit(); return; }
  if(d.kind==='ell-new'){ const m=draft.m1; draft=null; const w=Math.abs(m[0]-d.m0[0]), h=Math.abs(m[1]-d.m0[1]);
    if(w>1.2&&h>0.8){ const c=proj.invert([(m[0]+d.m0[0])/2,(m[1]+d.m0[1])/2]); if(c){ const S=proj.scale(); const lbl=nextLabel();
      const it={id:uid(),t:'ell',lon:r3(c[0]),lat:r3(c[1]),rx:w/2/S,ry:h/2/S,rot:0,lbl,dx:r3(w/2+1.2),dy:r3(-h/2-0.6),leader:'off',halo:false,extra:[]};
      doc.items.push(it); setSel({id:it.id,part:'anchor'}); commit({base:false}); } }
    requestRender(); return; }
  if(d.kind==='item'){ if(d.moved) commit({base:findItem(d.h.id)?.t==='shade'}); return; }
  if(d.kind==='pending'&&e.type==='pointerup') clickAt(d.m0);
}
cv.addEventListener('pointerup',finishPointer);
cv.addEventListener('pointercancel',finishPointer);
cv.addEventListener('dblclick',e=>{ const h=hit(toMm(e)); if(h){ setSel(h); showTab('sel'); const i=$('#sLbl'); if(i){ i.focus(); i.select(); } } });
cv.addEventListener('wheel',e=>{ e.preventDefault(); const m=toMm(e); const f=Math.exp(-e.deltaY*(e.deltaMode===1?0.05:0.0018)); beginInteract(); zoomAt(f,m); requestRender(); clearTimeout(wheelT); wheelT=setTimeout(endInteract,180); },{passive:false});
let wheelT=0;
cv.addEventListener('pointerleave',()=>{ if(!drag){ hoverCid=null; requestRender(); } });

let hoverT=0;
function hover(m){
  const now=performance.now(); if(now-hoverT<40) return; hoverT=now;
  const fw=doc.frame.w, fh=doc.frame.h; const h=hit(m);
  const onResize=m[0]>fw+M-14/kd&&m[0]<fw+M+2/kd&&m[1]>fh+M-14/kd&&m[1]<fh+M+2/kd;
  cv.style.cursor=onResize?'nwse-resize':h?(h.part==='label'?'move':'pointer'):(tool==='select'?'grab':'crosshair');
  if(m[0]<0||m[1]<0||m[0]>fw||m[1]>fh){ $('#stPos').textContent='틀 밖'; if(hoverCid){hoverCid=null;requestRender();} return; }
  const g=proj.invert(m); if(!g||!isFinite(g[0])) return;
  const f=countryAt(g[0],g[1]);
  $('#stPos').textContent=`${fmtLat(g[1])}  ${fmtLon(g[0])}${f?' · '+f.properties.ko:''}`;
  const nc=f?f.id:null; if(tool==='shade'&&nc!==hoverCid){ hoverCid=nc; requestRender(); }
}
function clickAt(m){
  const g=proj.invert(m);
  if(tool==='select'){
    if(g){ const f=countryAt(g[0],g[1]); const sh=f&&doc.items.find(i=>i.t==='shade'&&i.cid===f.id); if(sh){ setSel({id:sh.id,part:'shade'}); return; } }
    setSel(null); return;
  }
  if(!g||!isFinite(g[0])||m[0]<0||m[1]<0||m[0]>doc.frame.w||m[1]>doc.frame.h) return;
  if(tool==='dot'||tool==='ring'||tool==='text') { addPoint(g[1],g[0],tool); return; }
  if(tool==='shade'){ const f=countryAt(g[0],g[1]); if(!f){ toast('바다를 눌렀어요. 국가 안쪽을 눌러 주세요.'); return; } toggleShade(f); return; }
  if(tool==='leader'){
    const it=sel&&findItem(sel.id);
    if(!it||!it.lbl){ toast('먼저 지시선을 늘릴 라벨을 선택하세요.'); return; }
    it.extra=it.extra||[]; it.extra.push({lon:r3(g[0]),lat:r3(g[1]),mk:'none'}); commit({base:false}); return;
  }
}
function addPoint(lat,lon,kind){
  const it={id:uid(),t:'pt',lon:r3(lon),lat:r3(lat),mk:kind==='ring'?'ring':kind==='text'?'none':'dot',lbl:kind==='text'?'글자':nextLabel(),dx:0,dy:0,leader:kind==='text'?'off':'auto',halo:false,extra:[]};
  const off=kind==='text'?[0,0]:placeOffset(doc.style.place,it); it.dx=off[0]; it.dy=off[1];
  doc.items.push(it); setSel({id:it.id,part:'anchor'},{noTab:kind!=='text'}); commit({base:false});
  if(kind==='text'){ showTab('sel'); setTimeout(()=>{const i=$('#sLbl'); if(i){i.focus(); i.select();}},0); }
  return it;
}
function toggleShade(f){
  const ex=doc.items.find(i=>i.t==='shade'&&i.cid===f.id);
  if(ex){ doc.items=doc.items.filter(i=>i!==ex); if(sel&&sel.id===ex.id) setSel(null); commit(); return; }
  const c=countryCentroid(f);
  const it={id:uid(),t:'shade',cid:f.id,name:f.properties.ko,tone:'mid',lbl:doc.style.shadeAuto?nextLabel():'',lon:r3(c[0]),lat:r3(c[1]),dx:0,dy:0,leader:'auto',halo:true,extra:[]};
  doc.items.push(it); setSel({id:it.id,part:'shade'},{noTab:true}); commit();
}

/* ───────── 키보드 ───────── */
document.addEventListener('keydown',e=>{ if(ROOT.nodeType===1&&ROOT.closest('[hidden]')) return; /* 통합판에서 다른 탭일 때는 단축키를 쓰지 않는다 */
  if(e.target.closest('input,textarea,select,[contenteditable]')) return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if((e.ctrlKey||e.metaKey)&&k==='y'){ e.preventDefault(); redo(); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const tk={v:'select',d:'dot',o:'ring',t:'text',s:'shade',l:'leader',e:'ellipse'}[k];
  if(tk){ setTool(tk); return; }
  if((e.key==='Delete'||e.key==='Backspace')&&sel){ e.preventDefault(); deleteSel(); return; }
  if(e.key==='Escape'){ setSel(null); return; }
  if(sel&&e.key.startsWith('Arrow')){ const it=findItem(sel.id); if(!it) return; e.preventDefault(); const st=e.shiftKey?1:0.2;
    const d={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]}[e.key]; it.dx=r3(it.dx+d[0]); it.dy=r3(it.dy+d[1]); commit({base:false,quiet:true}); syncSel(); }
  if(k==='+'||k==='='){ zoomAt(1.25,[doc.frame.w/2,doc.frame.h/2]); endInteract(); }
  if(k==='-'||k==='_'){ zoomAt(0.8,[doc.frame.w/2,doc.frame.h/2]); endInteract(); }
});
function deleteSel(){
  if(!sel) return; const it=findItem(sel.id); if(!it) return;
  if(sel.part==='extra'&&it.extra[sel.ei]){ it.extra.splice(sel.ei,1); sel={id:it.id,part:'label'}; commit({base:false}); return; }
  doc.items=doc.items.filter(i=>i!==it); setSel(null); commit({base:it.t==='shade'});
}

/* ───────── 도구 ───────── */
const HINTS={
 select:'항목을 끌어 옮기고, 빈 곳을 끌면 지도가 움직여요 · 휠로 확대·축소',
 dot:'누른 곳에 검은 점(●)과 다음 라벨을 찍어요 · 끌면 지도가 움직여요',
 ring:'누른 곳에 속 빈 원(○)과 다음 라벨을 찍어요',
 text:'누른 곳에 글자만 놓아요 · 내용은 오른쪽 ‘항목’ 탭에서 고쳐요',
 shade:'국가를 누르면 회색으로 칠하고 라벨을 붙여요 · 다시 누르면 지워져요',
 leader:'선택한 라벨에서 누른 곳까지 지시선을 한 가닥 더 그어요 (섬 여러 개 가리키기)',
 ellipse:'끌어서 점선 타원을 그려요 · 선택하면 모서리 손잡이로 크기를 바꿔요'
};
function setTool(t){ tool=t; $$('.tool[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===t))); $('#hintText').textContent=HINTS[t]; hoverCid=null; requestRender(); }
$$('.tool[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
$('#zoomIn').onclick=()=>{ zoomAt(1.25,[doc.frame.w/2,doc.frame.h/2]); endInteract(); };
$('#zoomOut').onclick=()=>{ zoomAt(0.8,[doc.frame.w/2,doc.frame.h/2]); endInteract(); };
$('#fitItems').onclick=()=>{ if(!WG.fitItems(doc)){ toast('맞출 항목이 없어요.'); return; } rebuild(); endInteract(); commit(); };
$('#zoomFit').onclick=()=>{ const p=PRESETS.find(p=>p.id===doc.preset);
  if(p){ doc.view={proj:p.proj,rot:p.lon,scale:1,tx:0,ty:0}; fitView({view:doc.view},{...p,w:doc.frame.w,h:doc.frame.h}); }
  else if(doc.home&&doc.home.proj===doc.view.proj){ doc.view={...doc.home}; } else return;
  rebuild(); endInteract(); };

/* ───────── 패널: 지도 ───────── */
function showTab(t){ $$('.tabs button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t))); ['map','style','sel','out'].forEach(k=>$('#pane-'+k).hidden=k!==t); if(t==='out') syncOut(); }
$$('.tabs button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function buildPresets(){
  $('#presets').innerHTML=PRESETS.map(p=>`<button class="chip" data-id="${p.id}">${esc(p.name)}<small>${p.w} × ${p.h} mm</small></button>`).join('');
  $$('#presets .chip').forEach(b=>b.onclick=()=>{ const p=PRESETS.find(x=>x.id===b.dataset.id); applyPreset(doc,p); rebuild(); layout(); commit(); });
}
$('#proj').innerHTML=Object.entries(PROJS).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join('');
$('#proj').onchange=e=>{ const g=proj.invert([doc.frame.w/2,doc.frame.h/2])||[doc.view.rot,0]; const span=degAcross(); const t=e.target.value;
  const p=t==='polar'?{proj:'polar',lon:doc.view.rot,edge:Math.max(0,90-span/2),w:doc.frame.w,h:doc.frame.h}:{proj:t,lon:g[0],lat:clamp(g[1],-80,80),span:Math.min(span,359),w:doc.frame.w,h:doc.frame.h};
  doc.view={proj:t,rot:p.lon,scale:1,tx:0,ty:0}; fitView({view:doc.view},p); rebuild(); needBase=true; commit(); };
$('#rot').onchange=e=>{ const v=+e.target.value; if(!isFinite(v)) return; const g=proj.invert([doc.frame.w/2,doc.frame.h/2]);
  doc.view.rot=((v+540)%360)-180; rebuild(); endInteract(); commit(); };
function setFrame(){ const w=clamp(+$('#fw').value||doc.frame.w,20,190), h=clamp(+$('#fh').value||doc.frame.h,15,270); doc.frame={w,h}; rebuild(); layout(); commit(); }
$('#fw').onchange=setFrame; $('#fh').onchange=setFrame;
segBind('#detail',v=>{ doc.layers.detail=v; needBase=true; commit(); updateStatus(); });
function bindCheck(id,get,set){ const el=$(id); el.onchange=()=>{ set(el.checked); commit(); }; return el; }
bindCheck('#lyBorders',()=>doc.layers.borders,v=>doc.layers.borders=v);
bindCheck('#lyLakes',()=>doc.layers.lakes,v=>doc.layers.lakes=v);
bindCheck('#lyDokdo',()=>doc.layers.dokdo!==false,v=>doc.layers.dokdo=v);
bindCheck('#lyPolarLbl',()=>doc.layers.polarLbl!==false,v=>doc.layers.polarLbl=v);
bindCheck('#lnEq',()=>doc.layers.lines.eq,v=>doc.layers.lines.eq=v);
bindCheck('#lnTr',()=>doc.layers.lines.tr,v=>doc.layers.lines.tr=v);
bindCheck('#lnAc',()=>doc.layers.lines.ac,v=>doc.layers.lines.ac=v);
bindCheck('#lyMajor',()=>doc.layers.major,v=>doc.layers.major=v);
$('#grat').onchange=e=>{ doc.layers.grat=+e.target.value; commit(); };
$('#scaleSel').onchange=e=>{ doc.layers.scale=e.target.value; scaleWarn(); commit(); };
function scaleWarn(){ const w=$('#scaleWarn'); if(!w) return; const on=doc.layers.scale&&doc.layers.scale!=='none'; let t='';
  let si=null; try{ si=WG.scaleInfo(doc); }catch(e){}
  if(on){ if(!si) t='이 지도에서는 축척을 잴 수 없어요.'; else if(si.vary>0.25) t='이 범위는 위아래로 축척 차이가 커요(세계·대륙 전도). 전도에는 축척을 넣지 않는 것이 시험지 관례예요.'; }
  else if(si&&si.vary<=0.15&&doc.view.proj!=='polar') t='지역 지도로 보여요. 세계·대륙 전도가 아닌 지도에는 축척을 넣는 것이 시험지 관례예요(경기도교육청 「평가문항 제작 방법」).';
  w.hidden=!t; w.textContent=t; w.classList.toggle('soft',!on); }
/* 기후 지역(쾨펜: 열대·건조·온대·냉대·한대, 기후대마다 하나로/기후별/기호별) */
const ZT=[['light','연하게'],['mid','기본'],['dark','진하게'],['hatch','빗금 ／'],['hatch2','빗금 ＼'],['cross','격자'],['dots','점무늬']];
const ZLV=b=>[['off','표시 안 함'],['one',WG.ZB[b].one[0][1]+'(하나로)'],['mid',WG.ZB[b].mid.map(x=>x[1].replace(/ 기후$/,'')).join('·')],['detail','기호별('+WG.ZB[b].detail.map(x=>x[0]).join('·')+')']];
function syncZone(){ const z=doc.layers.zone, on=WG.zoneOn(doc), pl=doc.layers.plates, rl=doc.layers.relief;
  $('#zoneBelts').innerHTML=WG.ZONE_BELTS.map(([b,ko])=>`<div class="row"><label for="zb${b}">${ko}</label><select id="zb${b}" data-zb="${b}" class="grow">${ZLV(b).map(([v,n])=>`<option value="${v}"${v===(z.belts[b]||'off')?' selected':''}>${esc(n)}</option>`).join('')}</select></div>`).join('');
  $('#zoneBelts').querySelectorAll('select').forEach(el=>el.onchange=()=>{ const zz=doc.layers.zone; zz.belts[el.dataset.zb]=el.value;
    const keys=WG.zoneGroups(doc,true).map(g=>g.key); zz.only=(zz.only||[]).filter(k=>keys.includes(k));
    if(WG.zoneOn(doc)) WG.loadZones().then(()=>{ needBase=true; requestRender(); }).catch(()=>toast('기후 지역 자료를 불러오지 못했어요.')); syncZone(); needBase=true; commit(); });
  $('#zoneNote').hidden=!on; $('#zoneLegRow').hidden=!on&&!pl.on&&!rl.on; syncRelief(); $('#zoneLeg').value=doc.layers.legend||'bl'; $('#plOn').checked=pl.on; $('#plTyped').checked=pl.typed; $('#plNames').checked=pl.names; $('#plTyped').disabled=$('#plNames').disabled=!pl.on;
  const all=WG.zoneGroups(doc,true), only=z.only||[], box=$('#zoneTones');
  box.innerHTML=all.map(g=>`<div class="row"><label class="check lab"><input type="checkbox" data-zk="${esc(g.key)}"${!only.length||only.includes(g.key)?' checked':''}>${esc(g.ko)}</label><select data-z="${esc(g.key)}">${ZT.map(([v,n])=>`<option value="${v}"${v===g.tone?' selected':''}>${n}</option>`).join('')}</select></div>`).join('');
  box.querySelectorAll('select').forEach(el=>el.onchange=()=>{ doc.layers.zone.tone[el.dataset.z]=el.value; needBase=true; commit(); });
  box.querySelectorAll('input').forEach(el=>el.onchange=()=>{ const ks=[...box.querySelectorAll('input')].filter(x=>x.checked).map(x=>x.dataset.zk);
    if(!ks.length){ el.checked=true; toast('하나는 남겨 두세요. 모두 끄려면 위에서 \'표시 안 함\'을 고르세요.'); return; }
    doc.layers.zone.only=ks.length===all.length?[]:ks; needBase=true; commit(); }); }
function syncRelief(){ const r=doc.layers.relief; $('#rlOn').checked=r.on; $('#rlNames').checked=r.names; $('#rlNames').disabled=!r.on; $('#rlBox').hidden=!r.on; if(!r.on) return;
  $('#rlCats').innerHTML=WG.RELIEF_CAT.map(([c,ko])=>`<div class="row"><label class="check"><input type="checkbox" data-rc="${c}"${r.show[c]?' checked':''}>${ko}</label><select data-rt="${c}">${ZT.map(([v,n])=>`<option value="${v}"${v===((r.tone||{})[c]||WG.RELIEF_TONE[c])?' selected':''}>${n}</option>`).join('')}</select></div>`).join('');
  $('#rlCats').querySelectorAll('input').forEach(el=>el.onchange=()=>{ r.show[el.dataset.rc]=el.checked; needBase=true; commit(); syncZone(); });
  $('#rlCats').querySelectorAll('select').forEach(el=>el.onchange=()=>{ r.tone[el.dataset.rt]=el.value; needBase=true; commit(); });
  const L=WG.reliefList(); $('#rlList').innerHTML=L.length?L.map(f=>`<label class="check"><input type="checkbox" data-rid="${esc(f.id)}"${!r.only.length||r.only.includes(f.id)?' checked':''}>${esc(f.ko)}</label>`).join(''):'<p class="note">자료를 불러오는 중…</p>';
  $('#rlList').querySelectorAll('input').forEach(el=>el.onchange=()=>{ const on=[...$('#rlList').querySelectorAll('input')].filter(x=>x.checked).map(x=>x.dataset.rid); r.only=on.length===L.length?[]:on; needBase=true; commit(); }); }
$('#rlOn').onchange=e=>{ doc.layers.relief.on=e.target.checked; if(e.target.checked) WG.loadRelief().then(()=>syncZone()).catch(()=>toast('산지 자료를 불러오지 못했어요.')); syncZone(); needBase=true; commit(); };
$('#rlNames').onchange=e=>{ doc.layers.relief.names=e.target.checked; needBase=true; commit(); };
$('#zoneLeg').onchange=e=>{ doc.layers.legend=e.target.value; needBase=true; commit(); };
$('#plOn').onchange=e=>{ doc.layers.plates.on=e.target.checked; if(e.target.checked) WG.loadPlates().catch(()=>toast('판의 경계 자료를 불러오지 못했어요.')); syncZone(); needBase=true; commit(); };
$('#plTyped').onchange=e=>{ doc.layers.plates.typed=e.target.checked; needBase=true; commit(); };
$('#plNames').onchange=e=>{ doc.layers.plates.names=e.target.checked; needBase=true; commit(); };
/* 바다 이름 */
function syncSeas(){ const has=new Set(doc.items.filter(i=>i.sea).map(i=>i.name)); $('#seaSpace').checked=doc.style.seaSpace!==false; $('#seaK').value=String(doc.style.seaK||0.8);
  $('#seaList').innerHTML=WG.SEA_NAMES.map(n=>`<label class="check"><input type="checkbox" data-sea="${esc(n)}"${has.has(n)?' checked':''}>${esc(n)}</label>`).join('');
  $('#seaList').querySelectorAll('input').forEach(el=>el.onchange=()=>{ const n=el.dataset.sea;
    if(el.checked){ const miss=WG.placeSeas(doc,[n],{force:true}); if(miss.length){ el.checked=false; toast(`‘${n}’ 이름은 지금 지도 범위 안에 놓을 자리가 없어요.`); return; } if(miss.tight.length) toast(`‘${n}’ 이름이 육지에 걸려요. 글자 크기를 줄이거나 끌어서 옮겨 주세요.`); }
    else doc.items=doc.items.filter(i=>!(i.sea&&i.name===n));
    commit(); }); }
$('#seaK').onchange=e=>{ doc.style.seaK=+e.target.value; commit(); };
$('#seaSpace').onchange=e=>{ doc.style.seaSpace=e.target.checked; for(const it of doc.items) if(it.sea) it.lbl=WG.seaLabel(doc,it.name); commit(); };
function syncTickSide(){ const k=$('#tkKind').value; $('#tkSide').innerHTML=k==='lat'?'<option value="left">왼쪽</option><option value="right">오른쪽</option>':'<option value="bottom">아래</option><option value="top">위</option>'; }
$('#tkKind').onchange=syncTickSide; syncTickSide();
$('#tkAdd').onclick=()=>{ const v=+$('#tkVal').value; const k=$('#tkKind').value; if(!isFinite(v)||(k==='lat'&&Math.abs(v)>90)||(k==='lon'&&Math.abs(v)>180)){ toast('눈금 값을 확인해 주세요.'); return; } doc.ticks.push({k,v,side:$('#tkSide').value}); commit({base:false}); };
function syncTicks(){
  const cyl=PROJS[doc.view.proj].cyl;
  $('#tickList').innerHTML=doc.ticks.length?doc.ticks.map((t,i)=>`<div class="li"><span class="k">${esc(fmtTick(t))}</span><span class="t">${t.k==='lat'?'위도':'경도'} · ${({left:'왼쪽',right:'오른쪽',top:'위',bottom:'아래'})[t.side]}</span><button class="x" data-i="${i}" aria-label="눈금 지우기">×</button></div>`).join(''):`<div class="li"><span class="t">${cyl?'눈금 없음':'북극 중심 도법에는 가장자리 눈금을 쓰지 않아요'}</span></div>`;
  $$('#tickList .x').forEach(b=>b.onclick=()=>{ doc.ticks.splice(+b.dataset.i,1); commit({base:false}); });
}
function buildRiverList(){
  const q=$('#riverQ').value.trim(); const g=anyGeo();
  let keys=Object.keys(RIVERS);
  keys.sort((a,b)=>a.localeCompare(b,'ko'));
  if(q){ const ql=q.toLowerCase(); keys=keys.filter(k=>k.includes(q)||RIVERS[k].some(n=>n.toLowerCase().includes(ql)));
    if(g&&/[a-z]/i.test(q)) for(const k of g.rivers.keys()) if(!RIVERS[k]&&!keys.includes(k)&&k.toLowerCase().includes(ql)) keys.push(k); }
  const selK=new Set(doc.layers.rivers);
  keys.sort((a,b)=>(selK.has(b)-selK.has(a)));
  $('#riverList').innerHTML=keys.slice(0,80).map(k=>`<label class="check"><input type="checkbox" data-k="${esc(k)}" ${selK.has(k)?'checked':''}>${esc(k)}</label>`).join('')||'<p class="note">맞는 하천이 없어요.</p>';
  $$('#riverList input').forEach(i=>i.onchange=()=>{ const k=i.dataset.k; const s=new Set(doc.layers.rivers); i.checked?s.add(k):s.delete(k); doc.layers.rivers=[...s]; commit(); });
}
$('#riverQ').oninput=buildRiverList;
function syncViewInputs(){ $('#rot').value=Math.round(doc.view.rot*10)/10; $('#fw').value=doc.frame.w; $('#fh').value=doc.frame.h; $('#proj').value=doc.view.proj; }
function syncMap(){
  $$('#presets .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===doc.preset)));
  syncViewInputs(); segSet('#detail',doc.layers.detail);
  syncZone(); syncSeas(); $('#lyBorders').checked=doc.layers.borders; $('#lyLakes').checked=doc.layers.lakes; $('#lyDokdo').checked=doc.layers.dokdo!==false; $('#lyPolarLbl').checked=doc.layers.polarLbl!==false; $('#lnEq').checked=doc.layers.lines.eq; $('#lnTr').checked=doc.layers.lines.tr; $('#lnAc').checked=doc.layers.lines.ac; $('#lyMajor').checked=doc.layers.major;
  $('#grat').value=String(doc.layers.grat); $('#scaleSel').value=doc.layers.scale||'none'; scaleWarn(); syncTicks(); buildRiverList();
}

/* ───────── 패널: 꾸미기 ───────── */
$('#fontSel').innerHTML=FONTS.map(f=>`<option value="${f.key}">${esc(f.label)}</option>`).join('');
$('#fontSel').onchange=e=>{ doc.style.font=e.target.value; loadWebFont(); commit({base:false}); };
$('#latinSel').onchange=e=>{ doc.style.latin=e.target.value; commit({base:false}); };
$('#fontFile').onchange=async e=>{ const file=e.target.files[0]; if(!file) return;
  try{ const buf=await file.arrayBuffer(); const ff=new FontFace('__UserFont',buf); await ff.load(); document.fonts.add(ff);
    WG.userFont.name=file.name.replace(/\.[^.]+$/,''); doc.style.font='user'; commit({base:false}); toast(`‘${WG.userFont.name}’ 글꼴을 쓰고 있어요.`); }
  catch(err){ toast('글꼴 파일을 읽지 못했어요. .ttf나 .otf 파일인지 확인해 주세요.'); }
  e.target.value=''; };
function syncFontStatus(){
  const f=fontDef(); const ok=fontAvailable(f);
  let msg;
  if(f.key==='user') msg=ok?`불러온 글꼴 ‘${esc(WG.userFont.name)}’ 사용 중`:'글꼴 파일을 아직 불러오지 않았어요 → Noto Serif KR로 표시 중';
  else if(f.web) msg=ok?'웹 글꼴을 불러왔어요':'웹 글꼴을 불러오는 중이에요';
  else msg=ok?'이 컴퓨터에 설치돼 있어요':'이 컴퓨터에서 찾지 못했어요 → Noto Serif KR로 표시 중';
  $('#fontStatus').innerHTML=`<span class="pill ${ok?'ok':'warn'}">${ok?'✓':'!'} ${msg}</span>`;
}
function loadWebFont(){ document.fonts.load(`16px "Noto Serif KR"`,'가나다(가)ABC').then(()=>{ requestRender(); syncFontStatus(); }).catch(()=>{}); }
function rangeBind(id,key,fmt,opts){ const el=$(id), out=$(id+'V'); el.oninput=()=>{ doc.style[key]=+el.value; out.textContent=fmt(+el.value); if(opts&&opts.base) needBase=true; requestRender(); updateSizeOut(); };
  el.onchange=()=>commit({base:!!(opts&&opts.base),quiet:true}); return (v)=>{ el.value=v; out.textContent=fmt(v); }; }
const setFsz=rangeBind('#fsz','fontPt',v=>v+' pt');
const setDsz=rangeBind('#dsz','dot',v=>v.toFixed(1)+' mm');
const setRsz=rangeBind('#rsz','ring',v=>v.toFixed(1)+' mm');
const setLsc=rangeBind('#lsc','line',v=>'× '+v.toFixed(2),{base:true});
const setSea=rangeBind('#seaG','sea',v=>String(v),{base:true});
const setSh=rangeBind('#shG','shade',v=>String(v),{base:true});
$('#seqSel').onchange=e=>{ doc.style.seq=e.target.value; seqWarn(); commit({base:false}); };
function seqWarn(){ const w=$('#seqWarn'); if(!w) return; const v=doc.style.seq; const t=v==='num'?'숫자 기호는 답지 번호 ①~⑤와 헷갈릴 수 있어요. 시험지에는 A, B나 (가), (나)를 권해요.':v==='jamo'?'ㄱ, ㄴ은 <보기> 항목 기호와 겹쳐요. 이 지도를 <보기>가 있는 문항에 쓴다면 다른 기호를 권해요.':''; w.hidden=!t; w.textContent=t; }
$('#shadeAuto').onchange=e=>{ doc.style.shadeAuto=e.target.checked; commit({base:false}); };
const DIRS=[['tl','왼쪽 위'],['t','위'],['tr','오른쪽 위'],['l','왼쪽'],['c','가운데'],['r','오른쪽'],['bl','왼쪽 아래'],['b','아래'],['br','오른쪽 아래']];
$('#placeGrid').innerHTML=DIRS.map(([k,n])=>`<button data-d="${k}" title="${n}" aria-label="${n}"></button>`).join('');
$$('#placeGrid button').forEach(b=>b.onclick=()=>{ doc.style.place=b.dataset.d; commit({base:false}); });
function syncStyle(){
  const s=doc.style; $('#fontSel').value=s.font; $('#latinSel').value=s.latin; syncFontStatus();
  setFsz(s.fontPt); setDsz(s.dot); setRsz(s.ring); setLsc(s.line); setSea(s.sea); setSh(s.shade);
  $('#seqSel').value=s.seq; seqWarn(); $('#shadeAuto').checked=s.shadeAuto;
  $$('#placeGrid button').forEach(b=>b.style.borderColor=b.dataset.d===s.place?'var(--omr)':'');
  $('#placeName').textContent=(DIRS.find(d=>d[0]===s.place)||['',''])[1];
}

/* ───────── 패널: 항목 ───────── */
const TYPE={pt:'점',shade:'음영',ell:'영역'};
function itemDesc(it){
  if(it.t==='shade') return `${it.name||it.cid} 음영`;
  const kind=it.t==='ell'?'점선 영역':it.mk==='dot'?'점':it.mk==='ring'?'빈 원':'글자';
  return `${it.name?it.name+' · ':''}${kind} · ${fmtLat(it.lat)} ${fmtLon(it.lon)}`;
}
function syncSel(){
  const it=sel&&findItem(sel.id);
  $('#selDot').hidden=!it;
  const list=$('#itemList');
  list.innerHTML=doc.items.length?doc.items.map(i=>`<button class="li" data-id="${esc(i.id)}" aria-current="${!!(it&&it.id===i.id)}"><span class="k">${esc(i.lbl||'—')}</span><span class="t">${esc(itemDesc(i))}</span></button>`).join(''):'<div class="li"><span class="t">아직 항목이 없어요</span></div>';
  $$('#itemList .li[data-id]').forEach(b=>b.onclick=()=>setSel({id:b.dataset.id,part:'label'}));
  const box=$('#selBox');
  if(!it){ box.innerHTML=`<p class="empty-sel">지도에서 점·라벨·음영을 누르면 여기서 고칠 수 있어요.</p>
    <div class="keys"><kbd>V</kbd><span>선택·이동</span><kbd>D</kbd><span>점</span><kbd>O</kbd><span>빈 원</span><kbd>T</kbd><span>글자</span><kbd>S</kbd><span>국가 음영</span><kbd>L</kbd><span>지시선 추가</span><kbd>E</kbd><span>점선 영역</span>
    <kbd>Delete</kbd><span>선택 항목 지우기</span><kbd>방향키</kbd><span>라벨 0.2 mm씩 (Shift: 1 mm)</span><kbd>Ctrl+Z</kbd><span>되돌리기</span><kbd>더블클릭</kbd><span>라벨 글자 바로 고치기</span></div>`; return; }
  const seg=(id,opts,val)=>`<div class="seg" id="${id}">${opts.map(([v,n])=>`<button data-v="${v}" aria-pressed="${v===val}">${n}</button>`).join('')}</div>`;
  let h=`<section class="grp"><h3>${esc(TYPE[it.t])}${it.t==='shade'?' · '+esc(it.name||it.cid):''}</h3>
    <div class="row"><label for="sLbl">라벨</label><input id="sLbl" type="text" class="grow" value="${esc(it.lbl||'')}" placeholder="비우면 라벨 없음"></div>
    <div class="row"><span class="lab">빠른 입력</span><div class="btnrow" id="quickLbl">${['A','B','C','D','E','(가)','(나)','(다)','(라)','㉠','㉡'].map(s=>`<button class="btn" style="padding:3px 7px" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`;
  if(it.t==='pt') h+=`<div class="row"><span class="lab">표시</span>${seg('sMk',[['dot','● 점'],['ring','○ 빈 원'],['none','없음']],it.mk)}</div>`;
  if(it.t==='shade') h+=`<div class="row"><span class="lab">음영</span>${seg('sTone',[['light','연하게'],['mid','기본'],['dark','진하게'],['black','검정']],it.tone)}</div>
    <div class="row"><span class="lab">표시 방식</span>${seg('sSty',[['shade','음영만'],['circle','점선 원'],['multi','섬마다 지시선']],it.style||(it.ring?'circle':it.multi?'multi':'shade'))}</div>`;
  if(it.t==='ell'){ const S=proj.scale(); h+=`<div class="row"><span class="lab">크기</span><input id="sRx" type="number" step="0.5" min="0.3" value="${(it.rx*S*2).toFixed(1)}" aria-label="가로 지름 mm"><span class="unit">×</span><input id="sRy" type="number" step="0.5" min="0.3" value="${(it.ry*S*2).toFixed(1)}" aria-label="세로 지름 mm"><span class="unit">mm</span></div>
    <div class="row"><label for="sRot">기울기</label><input id="sRot" type="range" min="-90" max="90" step="1" value="${it.rot||0}"><span class="val">${it.rot||0}°</span></div>`; }
  h+=`<div class="row"><span class="lab">라벨 위치</span><div class="grid9" id="sPlace">${DIRS.map(([k,n])=>`<button data-d="${k}" title="${n}" aria-label="${n}"></button>`).join('')}</div></div>
    <div class="row"><span class="lab">지시선</span>${seg('sLead',[['auto','자동'],['on','항상'],['off','없음']],it.leader||'auto')}</div>
    <label class="check"><input type="checkbox" id="sHalo" ${it.halo?'checked':''}>글자에 흰 테두리 (음영 위 라벨)</label>`;
  if(it.t!=='shade') h+=`<div class="row"><span class="lab">위치</span><input id="sLat" type="number" step="0.01" style="width:88px" value="${it.lat}" aria-label="위도"><input id="sLon" type="number" step="0.01" style="width:88px" value="${it.lon}" aria-label="경도"><span class="unit">위도, 경도</span></div>`;
  h+=`<div class="row"><span class="lab">추가 지시선</span><span class="unit">${(it.extra||[]).length}가닥</span><button class="btn" id="sAddLead">더 긋기</button>${(it.extra||[]).length?'<button class="btn" id="sClrLead">모두 지우기</button>':''}</div>`;
  if(it.extra&&it.extra.length) h+=`<div class="row"><span class="lab">끝 모양</span>${seg('sExMk',[['none','없음'],['dot','●'],['ring','○']],it.extra[0].mk)}</div>`;
  h+=`<div class="btnrow"><button class="btn warn" id="sDel">이 항목 지우기</button></div></section>`;
  box.innerHTML=h;
  const lbl=$('#sLbl'); lbl.oninput=()=>{ it.lbl=lbl.value; requestRender(); }; lbl.onchange=()=>commit({base:false,quiet:true});
  $$('#quickLbl button').forEach(b=>b.onclick=()=>{ it.lbl=b.dataset.s; lbl.value=it.lbl; commit({base:false}); });
  const segOn=(id,fn)=>$$(`#${id} button`).forEach(b=>b.onclick=()=>{ fn(b.dataset.v); });
  segOn('sMk',v=>{ it.mk=v; commit({base:false}); });
  segOn('sTone',v=>{ it.tone=v; commit(); });
  segOn('sSty',v=>{ WG.applyCountryStyle(doc,it,v,proj); if(v==='circle'&&!it.ring) toast('이 나라는 지금 보이는 범위에서 점선 원으로 감쌀 수 없어요.'); WG.autoLabel(doc,{only:[it.id]}); commit(); });
  segOn('sLead',v=>{ it.leader=v; commit({base:false}); });
  segOn('sExMk',v=>{ it.extra.forEach(e=>e.mk=v); commit({base:false}); });
  $$('#sPlace button').forEach(b=>b.onclick=()=>{ const o=placeOffset(b.dataset.d,it); it.dx=o[0]; it.dy=o[1]; commit({base:false}); });
  $('#sHalo').onchange=e=>{ it.halo=e.target.checked; commit({base:false}); };
  if($('#sLat')){ const up=()=>{ const la=+$('#sLat').value, lo=+$('#sLon').value; if(isFinite(la)&&isFinite(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180){ it.lat=la; it.lon=lo; commit({base:false}); } }; $('#sLat').onchange=up; $('#sLon').onchange=up; }
  if($('#sRx')){ const S=proj.scale(); $('#sRx').onchange=e=>{ it.rx=Math.max(0.15,+e.target.value/2)/S; commit({base:false}); }; $('#sRy').onchange=e=>{ it.ry=Math.max(0.15,+e.target.value/2)/S; commit({base:false}); };
    const rr=$('#sRot'); rr.oninput=()=>{ it.rot=+rr.value; rr.nextElementSibling.textContent=rr.value+'°'; requestRender(); }; rr.onchange=()=>commit({base:false,quiet:true}); }
  $('#sAddLead').onclick=()=>{ setTool('leader'); toast('지도에서 지시선 끝이 닿을 곳을 누르세요.'); };
  if($('#sClrLead')) $('#sClrLead').onclick=()=>{ it.extra=[]; commit({base:false}); };
  $('#sDel').onclick=deleteSel;
}

/* ───────── 검색 ───────── */
const qEl=$('#q'), resEl=$('#results');
qEl.addEventListener('focus',()=>{ loadPlaces().catch(()=>{}); });
qEl.addEventListener('input',()=>runSearch());
qEl.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const b=resEl.querySelector('button'); if(b){ e.preventDefault(); b.click(); } } if(e.key==='Escape'){ resEl.hidden=true; qEl.blur(); } });
document.addEventListener('pointerdown',e=>{ if(!e.target.closest('.search')) resEl.hidden=true; });
async function runSearch(){
  const q=qEl.value.trim(); if(!q){ resEl.hidden=true; return; }
  const rows=[]; const c=parseCoord(q);
  if(c) rows.push({type:'coord',...c,html:`<b>${fmtLat(c.lat)} ${fmtLon(c.lon)}</b><small>좌표</small>`});
  if(!c) WG.searchCountries(q,4).forEach(f=>rows.push({type:'country',f,html:`<b>${esc(f.properties.ko)}</b><small>국가</small>`}));
  if(!c){ try{ await loadPlaces(); }catch(e){}
    if(qEl.value.trim()!==q) return;
    WG.searchPlaces(q,8).forEach(p=>rows.push({type:'city',lat:p.lat,lon:p.lon,name:p.ko,html:`<b>${esc(p.ko)}</b><small>${esc(p.country)} · ${fmtLat(p.lat)} ${fmtLon(p.lon)}</small>`})); }
  if(qEl.value.trim()!==q) return;
  resEl.hidden=false;
  if(!rows.length){ resEl.innerHTML='<div class="res empty">찾는 지명이 없어요. 좌표(예: 51.9 4.5)로도 찍을 수 있어요.</div>'; return; }
  resEl.innerHTML=rows.map((r,i)=>`<div class="res"><span class="nm">${r.html}</span>${r.type==='country'?`<button data-i="${i}" data-a="shade">음영</button><button data-i="${i}" data-a="dot">점</button>`:`<button data-i="${i}" data-a="dot">점 찍기</button><button data-i="${i}" data-a="ring">○</button>`}</div>`).join('');
  $$('button',resEl).forEach(b=>b.onclick=()=>{ const r=rows[+b.dataset.i]; const a=b.dataset.a;
    if(r.type==='country'){ if(a==='shade'){ const ex=doc.items.find(i=>i.t==='shade'&&i.cid===r.f.id); if(ex) setSel({id:ex.id,part:'shade'}); else toggleShade(r.f); } else { const c=countryCentroid(r.f); const it=addPoint(c[1],c[0],'dot'); it.name=r.f.properties.ko; } whereIs(countryCentroid(r.f)); }
    else { const it=addPoint(r.lat,r.lon,a); if(r.name) it.name=r.name; whereIs([r.lon,r.lat]); }
    resEl.hidden=true; qEl.select(); });
}
function whereIs(g){ const p=proj(g); if(!p||p[0]<0||p[1]<0||p[0]>doc.frame.w||p[1]>doc.frame.h) toastAction('찍었지만 지금 틀 밖이에요.','그곳으로 이동',()=>{ const q=proj(g); pan(doc.frame.w/2-q[0],doc.frame.h/2-q[1]); endInteract(); }); }

/* ───────── 내보내기 ───────── */
let dpi=600, bgMode='white';
segBind('#dpiSeg',v=>{ dpi=+v; updateSizeOut(); });
segBind('#bgSeg',v=>{ bgMode=v; });
function updateSizeOut(){ const k=dpi/25.4, e=WG.sheetExtra(doc), W=Math.round((doc.frame.w+e.ex+2*M)*k), H=Math.round((doc.frame.h+e.ey+2*M)*k);
  $('#sizeOut').innerHTML=`틀 <b>${doc.frame.w} × ${doc.frame.h} mm</b> → <b>${W.toLocaleString()} × ${H.toLocaleString()} px</b> (${dpi} dpi, 여백 ${M} mm${e.ex||e.ey?' · 지도 밖 범례':''} 포함)`; }
function syncOut(){ segSet('#dpiSeg',String(dpi)); segSet('#bgSeg',bgMode); updateSizeOut(); }
async function saveFile(name,data,mime){
  const r=await WG.saveFile(name,data,mime);
  if(r==='saved') toast('저장했어요.'); else if(r==='busy') toast('저장 창이 이미 열려 있어요.'); else if(r==='failed') toast('이 화면에서는 파일 저장을 할 수 없어요.');
}
async function prepExport(){ if(!WG.geo[wantLod()]) toast('지도 데이터를 불러오는 중이에요…'); }
const fname=()=>($('#expName').value.trim()||'세계지리_백지도').replace(/[\\/:*?"<>|]/g,'_');
async function doPng(){ try{ prepExport(); const b=await WG.renderPng(doc,{dpi,bg:bgMode}); await saveFile(`${fname()}.png`,b,'image/png'); }catch(e){ toast('이미지를 만들지 못했어요.'); } }
async function doCopy(){
  try{ await WG.copyPng(doc,{dpi,bg:bgMode}); toast('이미지를 복사했어요. 붙여 넣은 뒤 크기는 따로 맞춰 주세요.'); }
  catch(e){ toast('이 화면에서는 이미지 복사가 막혀 있어요. PNG 저장을 써 주세요.'); }
}
async function doSvg(){ try{ prepExport(); await saveFile(`${fname()}.svg`,await WG.svgString(doc),'image/svg+xml'); }catch(e){ toast('SVG를 만들지 못했어요.'); } }
$('#pngBtn').onclick=doPng; $('#pngBtn2').onclick=doPng; $('#copyBtn').onclick=doCopy; $('#copyBtn2').onclick=doCopy; $('#svgBtn').onclick=doSvg;
$('#saveJson').onclick=()=>saveFile(`${fname()}.json`,JSON.stringify({app:'wg-blank-map',v:1,doc},null,1),'application/json');
$('#loadJson').onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ const o=JSON.parse(await f.text()); const d=o.doc||o; if(!d.view||!d.frame||!Array.isArray(d.items)) throw 0; doc=normalize(d); sel=null; rebuild(); layout(); commit(); toast('작업을 불러왔어요.'); }catch(err){ toast('이 파일은 백지도 작업 파일이 아니에요.'); } e.target.value=''; };
let newArm=0;
$('#newBtn').onclick=()=>{ const b=$('#newBtn'); if(!newArm){ newArm=setTimeout(()=>{ newArm=0; b.textContent='새 지도'; b.classList.remove('warn'); },3000); b.textContent='한 번 더 누르면 비워요'; b.classList.add('warn'); return; }
  clearTimeout(newArm); newArm=0; b.textContent='새 지도'; b.classList.remove('warn'); const st=doc.style; doc=freshDoc(doc.preset); doc.style=st; sel=null; rebuild(); layout(); commit(); toast('점·라벨·음영을 모두 비웠어요. 되돌리기로 되살릴 수 있어요.'); };
$('#undoBtn').onclick=undo; $('#redoBtn').onclick=redo;
$('#tidyBtn').onclick=()=>{ if(!doc.items.some(i=>i.lbl)){ toast('정리할 라벨이 없어요.'); return; } WG.autoLabel(doc); commit({base:false}); toast('라벨을 겹치지 않게 다시 놓았어요. 되돌리기로 돌아갈 수 있어요.'); };

/* ───────── 공통 ───────── */
function segBind(sel,fn){ $$(sel+' button').forEach(b=>b.onclick=()=>{ segSet(sel,b.dataset.v); fn(b.dataset.v); }); }
function segSet(sel,v){ $$(sel+' button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v))); }
let toastT=0;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.style.pointerEvents='none'; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2600); }
function toastAction(msg,label,fn){ const t=$('#toast'); t.innerHTML=`${esc(msg)} <button class="btn" style="margin-left:8px;padding:3px 8px">${esc(label)}</button>`; t.style.pointerEvents='auto'; t.classList.add('on'); t.querySelector('button').onclick=()=>{ fn(); t.classList.remove('on'); }; clearTimeout(toastT); toastT=setTimeout(()=>{t.classList.remove('on'); t.style.pointerEvents='none';},5000); }
function updateStatus(){
  if(!proj) return; const l=currentLodName(); const kx=kxOf(doc.view.proj);
  const mmPerDeg=doc.view.scale*kx*Math.PI/180;
  $('#stInfo').textContent=`틀 ${doc.frame.w}×${doc.frame.h} mm · 경도 1° ≈ ${mmPerDeg<1?mmPerDeg.toFixed(2):mmPerDeg.toFixed(1)} mm · 해안선 ${LODS[l]||'—'}${l&&wantLod()!==l?' (다른 단계 불러오는 중)':''}`;
}
/* 기호 다시 매기기 · 정답 */
$('#relabelBtn').onclick=()=>{ const md=$('#relabelMode').value, wasEmpty=!doc.items.some(it=>it.lbl&&!it.sea), n=WG.relabelItems(doc,md); if(wasEmpty&&md!=='none'&&n) WG.autoLabel(doc); if(md==='none'){ if(!n){ toast('지울 기호가 없어요.'); return; } commit(); toast(`기호 ${n}개를 지웠어요. 점만 남았어요.`); return; } if(n<2){ toast('항목이 두 개 이상 있어야 해요.'); return; } commit(); toast('기호를 다시 매겼어요.'); };
function syncAns(){ const a=WG.answerKey(doc), box=$('#ansBox'); { const ib=$('#itemSendBtn'); if(ib) ib.hidden=!a||!document.getElementById('hub-tab-item'); }
  if(!a){ box.innerHTML='<p class="note">기호를 붙인 항목이 없어요.</p>'; return; }
  box.innerHTML=`<p class="ans-key"><b>정답</b> ${esc(a.key)}</p>${a.clue?`<p class="ans-clue">${esc(a.clue)}</p>`:''}<div class="row"><button class="btn" type="button" id="ansCopy">정답 복사</button>${a.clue?'<button class="btn" type="button" id="clueCopy">단서 문구 복사</button>':''}</div>`;
  const cp=(t,msg)=>{ (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(msg),()=>toast('복사하지 못했어요. 글자를 직접 골라 복사해 주세요.')); };
  $('#ansCopy').onclick=()=>cp(a.key,'정답을 복사했어요.'); if(a.clue) $('#clueCopy').onclick=()=>cp(a.clue,'단서 문구를 복사했어요.'); }
function syncPanels(){ syncMap(); syncStyle(); syncSel(); syncOut(); syncAns(); }

/* ───────── 시작 ───────── */
function start(){
  if(!window.d3||!d3.geoMiller||!window.topojson){ $('#loading').textContent='지도 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.'; return; }
  readTheme();
  let restored=false, handed=false;
  if(OPT&&OPT.doc){ try{ doc=normalize(OPT.doc); handed=OPT.msg||'작업을 불러왔어요.'; }catch(e){ doc=null; } } /* 통합판에서 넘겨준 지도 */
  if(!doc) try{ const h=localStorage.getItem('wgmap-handoff'); if(h){ localStorage.removeItem('wgmap-handoff'); const o=JSON.parse(h); if(o&&o.doc&&Date.now()-(o.t||0)<15*60*1000){ doc=normalize(o.doc); handed=true; } } }catch(e){}
  try{ if(!doc){ const s=localStorage.getItem('wgmap-draft-v1'); if(s){ doc=normalize(JSON.parse(s)); restored=true; } } }catch(e){}
  if(!doc) doc=sampleDoc();
  buildPresets(); rebuild(); setTool('select');
  hist=[snap()]; hi=0; syncUndo();
  layout(); syncPanels();
  new ResizeObserver(()=>layout()).observe(desk);
  const mq=matchMedia('(prefers-color-scheme: dark)'); const rt=()=>{ readTheme(); requestRender(); };
  mq.addEventListener&&mq.addEventListener('change',rt); new MutationObserver(rt).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  document.fonts.addEventListener&&document.fonts.addEventListener('loadingdone',()=>{ requestRender(); syncFontStatus(); });
  const onData=()=>{ needBase=true; requestRender(); $('#loading').hidden=true; updateStatus(); buildRiverList(); };
  WG.onData(onData);
  if(WG.anyGeo()) onData(); /* 통합판: 자동 생성기가 이미 받아 둔 지도 자료 */
  loadLod(wantLod()).catch(()=>loadLod('lo')).catch(()=>{ $('#loading').textContent='지도 데이터를 불러오지 못했어요. 새로고침해 주세요.'; });
  if(fontDef().web) loadWebFont(); ensureGlyphs();
  setTimeout(()=>toast(typeof handed==='string'?handed:handed?'자동 생성기에서 만든 지도를 가져왔어요.':restored?'지난번 작업을 이어서 열었어요.':'예시로 유럽 지도에 A~D를 찍어 두었어요. ‘새 지도’로 비울 수 있어요.'),600);
}
start();
/* 통합판에서 작업 파일·자동 생성기 지도를 넘겨줄 때 */
return {getDoc:()=>doc,load:(o,msg)=>{ const d=o&&(o.doc||o); if(!d||!d.view||!d.frame||!Array.isArray(d.items)) return false; doc=normalize(d); sel=null; rebuild(); layout(); commit(); toast(msg||'작업을 불러왔어요.'); return true; },
  handoff:()=>{ try{ const h=localStorage.getItem('wgmap-handoff'); if(!h) return false; localStorage.removeItem('wgmap-handoff'); const o=JSON.parse(h); if(!o||!o.doc) return false; doc=normalize(o.doc); sel=null; rebuild(); layout(); commit(); toast('자동 생성기에서 만든 지도를 가져왔어요.'); return true; }catch(e){ return false; } }};
});