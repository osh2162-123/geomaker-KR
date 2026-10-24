/* 한국지리 백지도: 시군구·시도 경계 바탕(KM) 위에 기호·점·지시선·색칠을 놓고 고친다. 항목 그리기·내보내기는 지형 모식도 엔진(LG)을 쓴다 */
HUB.def('kmap',function(ROOT,OPT){
'use strict';
const KEY='wgkmap-editor-v1', UIKEY='wgkmap-editor-ui-v1';
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
const SVGNS='http://www.w3.org/2000/svg';
try{ const el=document.getElementById('km-data'); if(el&&!KM.data()) KM.setData(JSON.parse(el.textContent)); }catch(e){}
const HAS=!!KM.data();
const stage=$('#stage'), wrap=$('#stageWrap');

/* ───────── 상태 ───────── */
function freshDoc(){ const d=LG.freshDoc('kmap'); d.map=KM.freshMap(); d.kgen=null; d.knum=null; d.style.size=10; return d; }
function norm(d){ d=GG.clean(d); const x=LG.normalizeDoc(d); if(x.app!=='kmap'){ return freshDoc(); } x.map=KM.normalizeMap(d.map); x.kgen=d.kgen||null; x.knum=d.knum&&Array.isArray(d.knum.pairs)?{pairs:d.knum.pairs.filter(a=>Array.isArray(a)&&a.length>=2).slice(0,999).map(a=>[String(a[0]).slice(0,40),String(a[1]).slice(0,5),String(a[2]||'').slice(0,80)])}:null;
  /* 시험지 양식으로 바꾸기 전(2026-10-04 이전) 작업: 기본 너비·글자·독도 상자를 새 기본값으로 */
  if(!(d.map&&d.map.sv)){ if(x.map.width===70) x.map.width=45; x.map.dokdo=true; if(x.style.size===9) x.style.size=10; x.map.sv=2; }
  return x; }
function loadLocal(){ try{ const s=localStorage.getItem(KEY); if(!s) return null; const d=JSON.parse(s); return d&&d.app==='kmap'?norm(d):null; }catch(e){ return null; } }
let doc=loadLocal()||freshDoc();
let ui=(()=>{ try{ return GG.clean(JSON.parse(localStorage.getItem(UIKEY)||'null')); }catch(e){ return null; } })()||{};
ui=Object.assign({tool:'select',dpi:600,paint:'mid',mode:'auto'},ui);
let selId=null, raf=0, saveT=0, L=null;
function saveLocal(){ clearTimeout(saveT); saveT=setTimeout(()=>{
  try{ localStorage.setItem(UIKEY,JSON.stringify(ui)); }catch(e){}
  try{ localStorage.setItem(KEY,JSON.stringify(Object.assign({},doc,{base:null}))); }catch(e){} },300); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2800); }
const selItem=()=>doc.items.find(it=>it.id===selId)||null;

/* ───────── 바탕 만들기 ───────── */
const AUTO=it=>!!it.km;     /* 축척 막대·이름처럼 저절로 만드는 항목 */
function anchorOf(it){ switch(it.t){ case 'leader': return [it.tx,it.ty]; case 'ell': return [it.cx,it.cy]; case 'arrow': case 'line': return [(it.x1+it.x2)/2,(it.y1+it.y2)/2];
  case 'rect': return [it.x+it.w/2,it.y+it.h/2]; default: return [it.x,it.y]; } }
/* 범위·너비가 바뀌면 손으로 놓은 항목도 같은 땅 위로 옮긴다 */
function remap(oldL,newL){
  if(!oldL||!newL) return; const same=oldL.k===newL.k&&oldL.b.join()===newL.b.join(); if(same) return;
  for(const it of doc.items){ if(AUTO(it)) continue; const [ax,ay]=anchorOf(it); const g=KM.inv(oldL,ax,ay); const [nx,ny]=KM.toPage(newL,g[0],g[1]); LG.moveItem(it,nx-ax,ny-ay); if(it.t==='leader'){ it.tx=nx; it.ty=ny; } }
  /* 새 범위 밖으로 나간 기호·점은 지운다 */
  const out=doc.items.filter(it=>{ if(AUTO(it)) return false; const [x,y]=anchorOf(it); return x<-2||y<-2||x>newL.w+2||y>newL.h+2; });
  if(out.length){ doc.items=doc.items.filter(it=>!out.includes(it)); if(out.some(it=>it.id===selId)) selId=null; toast(`지도 범위 밖으로 나간 항목 ${out.length}개를 지웠어요. 되돌리려면 Ctrl+Z.`); }
}
function rebuild(keep){
  const old=L; const r=HAS?KM.render(doc.map):null;
  if(!r){ doc.base=null; L=null; return; }
  doc.base={kind:'svg',svg:r.svg,x:0,y:0,w:r.w,h:r.h,natW:r.w,natH:r.h,name:'한국지리 백지도'}; L=r.L;
  if(keep) remap(old,L);
  syncAuto();
}
function syncAuto(){
  doc.items=doc.items.filter(it=>!AUTO(it)); if(!L) return; const m=doc.map;
  if(m.names){ const base=Math.max(4.5,Math.min(7,doc.style.size*0.7));
    /* 지역 상자에 들어가는 크기로 줄이고, 3 pt보다 작아야 하면 뺀다(답지용 이름) */
    const put=[]; const sp=KM.nameSpots(L,m).sort((a,b)=>b.w*b.h-a.w*a.h);
    for(const s of sp){ const fs=Math.min(base,s.w*0.7/(s.n.length*0.3528),s.h*0.45/0.3528); if(fs<3) continue;
      const lb=LG.labelBox(doc,{t:'text',text:s.n,size:fs,fam:'gothic'}); const r={x:s.x-lb.w/2,y:s.y-lb.h/2,w:lb.w,h:lb.h}; if(put.some(o=>ov(o,r)>0)) continue; put.push(r);
      doc.items.unshift(LG.makeItem('text',{x:s.x,y:r.y,text:s.n,size:+fs.toFixed(1),fam:'gothic',align:'center',box:'none',km:'names'})); } }
  let below=L.h;
  if(m.scale) for(const p of KM.scaleBarItems(L,m.scalePos)){ doc.items.push(LG.makeItem(p.t,p)); if((p.y1||p.y||0)>L.h) below=Math.max(below,(p.y1||p.y)+0.4); }
  /* 범례: 고속 국도·영해 */
  for(const p of KM.legendItems(L,m,below)) doc.items.push(LG.makeItem(p.t,p));
}

/* ───────── 되돌리기 ───────── */
const undo=[], redo=[]; let last=snap();
function snap(){ return JSON.stringify(Object.assign({},doc,{base:null})); }
function restore(s){ doc=norm(JSON.parse(s)); L=null; rebuild(false); if(!doc.items.some(it=>it.id===selId)) selId=null; }
function commit(){ const s=snap(); if(s===last) return; undo.push(last); if(undo.length>80) undo.shift(); redo.length=0; last=s; }
let settleT=0; function settle(){ clearTimeout(settleT); settleT=setTimeout(commit,450); }
function doUndo(){ commit(); if(!undo.length) return; redo.push(last); last=undo.pop(); restore(last); changed('all',true); }
function doRedo(){ if(!redo.length) return; undo.push(last); last=redo.pop(); restore(last); changed('all',true); }
function changed(what,noCommit){ saveLocal(); if(what==='all'){ renderLeft(); renderOpts(); } else if(what==='opts') renderOpts(); else if(what==='left') renderLeft(); if(!noCommit) settle(); schedule(); }
function mapChanged(keep){ rebuild(keep!==false); changed('all',true); commit(); }
function schedule(){ if(raf) return; raf=requestAnimationFrame(()=>{ raf=0; draw(); }); }

/* ───────── 화면 ───────── */
let view={k:4,x:-5,y:-5}, fitted=false;
const g={bg:mk('rect',{fill:'#fff'}),img:mk('image',{preserveAspectRatio:'none'}),items:mk('g'),sel:mk('g')};
stage.append(g.bg,g.img,g.items,g.sel);
function mk(t,a){ const e=document.createElementNS(SVGNS,t); for(const [k,v] of Object.entries(a||{})) e.setAttribute(k,v); return e; }
let hrefSvg=null;
function setView(){ const r=wrap.getBoundingClientRect(); const W=Math.max(50,r.width), H=Math.max(50,r.height); stage.setAttribute('viewBox',`${view.x} ${view.y} ${W/view.k} ${H/view.k}`); }
function fit(){ const r=wrap.getBoundingClientRect(); const pb=LG.pageBox(doc); const W=Math.max(50,r.width), H=Math.max(50,r.height);
  const k=Math.min((W-40)/Math.max(pb.w,10),(H-40)/Math.max(pb.h,10)); view.k=Math.max(0.5,Math.min(40,k)); view.x=pb.x-(W/view.k-pb.w)/2; view.y=pb.y-(H/view.k-pb.h)/2; fitted=true; setView(); }
function zoomAt(f,cx,cy){ const r=wrap.getBoundingClientRect(); const px=cx==null?r.width/2:cx-r.left, py=cy==null?r.height/2:cy-r.top;
  const mx=view.x+px/view.k, my=view.y+py/view.k; view.k=Math.max(0.5,Math.min(80,view.k*f)); view.x=mx-px/view.k; view.y=my-py/view.k; setView(); drawSel(); }
function draw(){
  const pb=LG.pageBox(doc); const B=doc.base;
  for(const [k,v] of Object.entries({x:pb.x,y:pb.y,width:pb.w,height:pb.h})) g.bg.setAttribute(k,v);
  g.bg.setAttribute('style','filter:drop-shadow(0 1px 3px rgba(0,0,0,.25))');
  if(!B){ g.img.style.display='none'; } else { if(B.svg!==hrefSvg){ hrefSvg=B.svg; g.img.setAttribute('href',LG.baseHref(doc)); } g.img.style.display=''; for(const [k,v] of Object.entries({x:B.x,y:B.y,width:B.w,height:B.h})) g.img.setAttribute(k,v); }
  g.items.innerHTML=doc.items.map(it=>`<g data-id="${GG.esc(it.id)}">${LG.itemSVG(doc,it)}</g>`).join('');
  drawSel();
  $('#deskEmpty').hidden=HAS;
  const dpi=ui.dpi, sz=`${pb.w.toFixed(1)} × ${pb.h.toFixed(1)} mm · ${dpi} dpi에서 ${Math.round(pb.w/25.4*dpi)} × ${Math.round(pb.h/25.4*dpi)} px`;
  $('#sizeInfo').textContent=sz; const so=$('#sizeOut'); if(so) so.textContent=sz;
  ['pngBtn','pngBtn2','svgBtn','copyBtn','copyBtn2'].forEach(id=>{ const b=$('#'+id); if(b) b.disabled=!(B||doc.items.length); });
  wrap.dataset.tool=ui.tool;
}
function drawSel(){
  const it=selItem(); g.sel.innerHTML=''; if(!it) return; const k=view.k; const b=LG.bboxOf(doc,it);
  g.sel.append(mk('rect',{x:b.x-2/k,y:b.y-2/k,width:b.w+4/k,height:b.h+4/k,fill:'none',stroke:'#c3193f','stroke-width':1/k,'stroke-dasharray':`${4/k} ${3/k}`}));
  for(const [name,x,y] of LG.handles(doc,it)) g.sel.append(mk('circle',{class:'h','data-h':name,cx:x,cy:y,r:5/k,fill:'#fff',stroke:'#c3193f','stroke-width':1.5/k}));
}
new ResizeObserver(()=>{ if(!fitted) fit(); else setView(); }).observe(wrap);

/* ───────── 끌기 ───────── */
function toMM(e){ const r=wrap.getBoundingClientRect(); return {x:view.x+(e.clientX-r.left)/view.k,y:view.y+(e.clientY-r.top)/view.k}; }
let drag=null;
function featAt(p){ if(!L) return null; const hits=KM.featuresAt(L,p.x,p.y); return hits[0]||null; }
function shadeKey(f){ if(doc.map.level==='sido'&&f.p.s!=='NK') return 's:'+f.p.s; return KM.unitKey(doc.map,f.p)||f.p.c; }   /* 합친 광역시는 통째로 */
function placeOfAt(p){ const f=featAt(p); if(!f||!L) return null; const sp=KM.nameSpots(L,doc.map);
  const s=sp.find(s=>s.p.k==='sgg'&&s.p.c===f.p.c)||sp.find(s=>s.p.k==='grp'&&s.p.codes&&s.p.codes.includes(f.p.c))||sp.find(s=>s.p.k==='sido'&&s.p.c===f.p.s); return s?s.p:null; }
const pkey=P=>P.k+':'+(P.c||(P.codes||[]).join(','));
const modeArg=()=>ui.mode&&ui.mode!=='auto'?ui.mode:null;
function numAt(p){ const P=placeOfAt(p); if(!P){ toast('시·군 안쪽을 눌러 주세요.'); return; }
  const kk=pkey(P), prev=doc.knum&&doc.knum.pairs.find(a=>a[2]===kk);
  if(prev){ doc.items=doc.items.filter(it=>!((it.t==='sym'||it.t==='leader')&&it.text===prev[1])); doc.knum.pairs=doc.knum.pairs.filter(a=>a!==prev); selId=null; changed('all'); commit(); toast(`${prev[0]}의 ${prev[1]}번을 지웠어요(다시 누르면 새 번호를 놓아요).`); return; }
  const sym=LG.takeSym(doc); const made=placeLabels([{p:P,sym,shaded:false}],modeArg(),doc.items); doc.items.push(...made); (doc.knum||(doc.knum={pairs:[]})).pairs.push([nameOfPlace(P),sym,kk]);
  selId=made.length?made[made.length-1].id:null; changed('opts'); commit(); }
/* 고른 기호를 같은 지역의 안쪽·지시선으로 다시 놓는다 */
function respot(it,mode){ const a=it.t==='leader'?{x:it.tx,y:it.ty}:{x:it.x,y:it.y}; const P=placeOfAt(a); if(!P){ toast('이 기호 아래에서 시·군을 찾지 못했어요. 지도 위에 놓인 기호만 고칠 수 있어요.'); return; }
  const keep=doc.items.filter(x=>x.id!==it.id); const made=placeLabels([{p:P,sym:it.text,shaded:false}],mode,keep); if(!made.length) return; doc.items=keep.concat(made); selId=made[made.length-1].id; changed('all'); commit(); }
function paintAt(p){ const f=featAt(p); if(!f){ toast('땅이 아닌 곳이에요. 시·군 안쪽을 눌러 주세요.'); return; }
  const k=shadeKey(f); const sh=doc.map.shade; if(sh[k]===ui.paint) delete sh[k]; else sh[k]=ui.paint; rebuild(false); changed('all',true); commit(); }
wrap.addEventListener('pointerdown',e=>{
  if(e.button===1||(e.button===0&&e.altKey)){ startPan(e); return; } if(e.button!==0) return;
  wrap.focus({preventScroll:true}); const p=toMM(e); const tool=ui.tool; const tol=6/view.k;
  const hEl=e.target.closest&&e.target.closest('.h');
  if(hEl&&selItem()){ drag={mode:'handle',h:hEl.dataset.h,id:selId}; capture(e); return; }
  if(tool==='select'){ const it=LG.hit(doc,p.x,p.y,tol); if(it){ selId=it.id; drag={mode:'move',id:it.id,last:p,moved:false}; capture(e); renderOpts(); drawSel(); if(!it.km) showTab('sel',true); } else { if(selId){ selId=null; renderOpts(); drawSel(); } startPan(e); } return; }
  if(tool==='paint'){ paintAt(p); return; }
  if(tool==='num'){ numAt(p); return; }
  let it=null; const S=LG.nextSym(doc);
  if(tool==='dot'){ it=LG.makeItem('dot',{x:p.x,y:p.y,r:0.5}); doc.items.push(it); selId=it.id; changed('opts'); return; }
  if(tool==='sym'){ it=LG.makeItem('sym',{x:p.x,y:p.y,text:LG.takeSym(doc),box:ui.box||'halo'}); doc.items.push(it); selId=it.id; changed('opts'); return; }
  if(tool==='text'){ it=LG.makeItem('text',{x:p.x,y:p.y,text:'글'}); doc.items.push(it); selId=it.id; changed('opts'); setTool('select'); setTimeout(()=>{ const t=$('#propText'); if(t){ t.focus(); t.select(); } },30); return; }
  if(tool==='leader') it=LG.makeItem('leader',{x:p.x,y:p.y,tx:p.x,ty:p.y,text:S,box:ui.box||'halo',dot:true});
  if(tool==='ell') it=LG.makeItem('ell',{cx:p.x,cy:p.y,rx:0.01,ry:0.01});
  if(tool==='arrow') it=LG.makeItem('arrow',{x1:p.x,y1:p.y,x2:p.x,y2:p.y});
  if(tool==='line') it=LG.makeItem('line',{x1:p.x,y1:p.y,x2:p.x,y2:p.y});
  if(tool==='rect') it=LG.makeItem('rect',{x:p.x,y:p.y,w:0,h:0});
  if(!it) return; doc.items.push(it); selId=it.id; drag={mode:'create',id:it.id,p0:p}; capture(e); schedule();
});
function capture(e){ try{ wrap.setPointerCapture(e.pointerId); }catch(err){} }
function startPan(e){ drag={mode:'pan',cx:e.clientX,cy:e.clientY,vx:view.x,vy:view.y}; wrap.classList.add('panning'); capture(e); }
const tag=$('#hoverTag'), TAG0='지도 위에 마우스를 올리면 시·군 이름이 나와요';
const setTag=f=>{ tag.textContent=f?(f.p.s==='NK'?`북한 ${KM.nkName(doc.map,f.p)}`:`${KM.sidoName(f.p.s)} ${f.p.n}`):TAG0; };
wrap.addEventListener('pointermove',e=>{
  if(!drag){ setTag(featAt(toMM(e))); return; }
  const p=toMM(e);
  if(drag.mode==='pan'){ view.x=drag.vx-(e.clientX-drag.cx)/view.k; view.y=drag.vy-(e.clientY-drag.cy)/view.k; setView(); return; }
  const it=doc.items.find(x=>x.id===drag.id); if(!it) return;
  if(drag.mode==='move'){ LG.moveItem(it,p.x-drag.last.x,p.y-drag.last.y); drag.last=p; drag.moved=true; if(it.km){ delete it.km; } }
  else if(drag.mode==='handle') LG.dragHandle(it,drag.h,p.x,p.y,e.shiftKey);
  else if(drag.mode==='create'){ const p0=drag.p0;
    if(it.t==='leader'){ it.x=p.x; it.y=p.y; }
    if(it.t==='ell'){ let rx=Math.abs(p.x-p0.x)/2, ry=Math.abs(p.y-p0.y)/2; if(e.shiftKey) rx=ry=Math.max(rx,ry); it.cx=(p.x+p0.x)/2; it.cy=(p.y+p0.y)/2; it.rx=rx; it.ry=ry; }
    if(it.t==='arrow'||it.t==='line') LG.dragHandle(it,'p2',p.x,p.y,e.shiftKey);
    if(it.t==='rect'){ it.w=p.x-p0.x; it.h=p.y-p0.y; } }
  schedule();
});
wrap.addEventListener('pointerleave',()=>{ setTag(null); });
function endDrag(){
  if(!drag) return; const d=drag; drag=null; wrap.classList.remove('panning'); if(d.mode==='pan') return;
  const it=doc.items.find(x=>x.id===d.id);
  if(it&&d.mode==='create'){ const p0=d.p0;
    if(it.t==='leader'){ if(Math.hypot(it.x-p0.x,it.y-p0.y)<1.5){ it.x=p0.x+5; it.y=p0.y-4.5; } it.text=LG.takeSym(doc); }
    if(it.t==='ell'&&it.rx<0.6&&it.ry<0.6){ it.cx=p0.x; it.cy=p0.y; it.rx=4; it.ry=3; }
    if((it.t==='arrow'||it.t==='line')&&Math.hypot(it.x2-it.x1,it.y2-it.y1)<1){ it.x2=it.x1+10; it.y2=it.y1; }
    if(it.t==='rect'){ if(Math.abs(it.w)<1&&Math.abs(it.h)<1){ it.w=12; it.h=6; } LG.fixRect(it); } }
  if(it&&d.mode==='handle') LG.fixRect(it);
  changed('opts'); commit();
}
wrap.addEventListener('pointerup',endDrag); wrap.addEventListener('pointercancel',endDrag);
wrap.addEventListener('dblclick',e=>{ const p=toMM(e); const it=LG.hit(doc,p.x,p.y,6/view.k); if(it&&['sym','leader','text'].includes(it.t)){ selId=it.id; renderOpts(); drawSel(); const t=$('#propText'); if(t){ t.focus(); t.select(); } } });
wrap.addEventListener('wheel',e=>{ e.preventDefault(); if(e.ctrlKey||e.metaKey||Math.abs(e.deltaY)>=Math.abs(e.deltaX)) zoomAt(Math.exp(-e.deltaY*0.0018),e.clientX,e.clientY); },{passive:false});

/* ───────── 도구·단축키 ───────── */
const TOOLKEY={v:'select',p:'paint',d:'dot',l:'leader',n:'num',s:'sym',e:'ell',a:'arrow',i:'line',r:'rect',t:'text'};
const syncTool=bindSeg($('#toolSeg'),()=>ui.tool,v=>{ setTool(v); });
const TOOL_HINT={select:'항목을 끌어 옮기고, 빈 곳을 끌면 지도가 움직여요 · 휠로 확대·축소',paint:'시·군(시·도 지도에서는 시·도)을 누르면 칠하고, 같은 색으로 다시 누르면 지워요 · 색은 꾸미기 갈래에서',
  dot:'누른 자리에 점을 찍어요',sym:'누른 자리에 다음 기호를 놓아요 · 기호 종류는 꾸미기 갈래에서',leader:'지점을 누른 채 기호를 놓을 자리까지 끌어요',num:'시·군을 누르면 다음 기호를 알아서 놓아요(넓으면 안쪽, 좁으면 지시선) · 번호 종류는 꾸미기 갈래에서',ell:'끌어서 점선 원을 그려요 (Shift: 정원)',
  arrow:'끌어서 화살표를 그려요 (Shift: 45° 단위)',line:'끌어서 선을 그려요 (Shift: 45° 단위)',rect:'끌어서 흰 가림 상자를 그려요',text:'누른 자리에 글상자를 놓아요'};
function setTool(v){ ui.tool=v; syncTool(); wrap.dataset.tool=v; const th=$('#toolHint'); if(th) th.textContent=TOOL_HINT[v]||''; saveLocal(); }
let clip=null;
ROOT.addEventListener('keydown',e=>{
  const tg=e.target; if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable)) return;
  if(!(wrap.contains(tg)||tg===wrap||tg===document.body||(tg.closest&&tg.closest('.kapp')))) return;
  const it=selItem(); const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?doRedo():doUndo(); return; }
  if(mod&&e.key.toLowerCase()==='y'){ e.preventDefault(); doRedo(); return; }
  if(mod&&e.key.toLowerCase()==='c'&&it){ clip=JSON.stringify(it); return; }
  if(mod&&e.key.toLowerCase()==='v'&&clip){ e.preventDefault(); const c=JSON.parse(clip); c.id=GG.uid(); delete c.km; LG.moveItem(c,2,2); doc.items.push(c); selId=c.id; clip=JSON.stringify(c); changed('opts'); return; }
  if(mod&&e.key.toLowerCase()==='d'&&it){ e.preventDefault(); dup(it); return; }
  if((e.key==='Delete'||e.key==='Backspace')&&it){ e.preventDefault(); delItem(it); return; }
  if(e.key==='Escape'){ if(selId){ selId=null; renderOpts(); drawSel(); } setTool('select'); return; }
  if(it&&e.key.startsWith('Arrow')){ e.preventDefault(); const s=e.shiftKey?2:0.25; LG.moveItem(it,e.key==='ArrowLeft'?-s:e.key==='ArrowRight'?s:0,e.key==='ArrowUp'?-s:e.key==='ArrowDown'?s:0); delete it.km; changed(); return; }
  if(!mod&&!e.altKey&&TOOLKEY[e.key.toLowerCase()]){ setTool(TOOLKEY[e.key.toLowerCase()]); return; }
  if(!mod&&(e.key==='+'||e.key==='=')){ zoomAt(1.25); return; } if(!mod&&e.key==='-'){ zoomAt(0.8); return; } if(!mod&&e.key==='0'){ fit(); return; }
});
function dup(it){ const c=JSON.parse(JSON.stringify(it)); c.id=GG.uid(); delete c.km; LG.moveItem(c,2,2); doc.items.push(c); selId=c.id; changed('opts'); }
function delItem(it){ doc.items=doc.items.filter(x=>x!==it); if(selId===it.id) selId=null; if(it.km==='scale'){ doc.items=doc.items.filter(x=>x.km!=='scale'); doc.map.scale=false; renderLeft(); } changed('opts'); }

/* ───────── 공통 조각 ───────── */
function bindSeg(el,get,set){
  const sync=()=>el.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===String(get()))));
  el.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||!el.contains(b)) return; set(b.dataset.v); sync(); });
  sync(); return sync;
}
function seg(opts,get,set,after){ const el=h('div',{class:'seg',role:'group'}); for(const [v,t] of opts) el.append(h('button',{type:'button','data-v':v},t)); bindSeg(el,get,v=>{ set(v); (after||(()=>changed()))(); }); return el; }
function row(label,...ctl){ return h('div',{class:'row'},h('span',{class:'lab'},label),...ctl); }
function num(get,set,o){ o=o||{}; const el=h('input',{type:'number',min:o.min,max:o.max,step:o.step||'any',value:get()==null?'':+(+get()).toFixed(3),placeholder:o.ph||'','aria-label':o.aria||''});
  el.addEventListener(o.on||'input',()=>{ const v=parseFloat(el.value); if(el.value===''&&o.empty){ set(null); (o.after||(()=>changed()))(); return; } if(isFinite(v)&&(o.min==null||v>=o.min)&&(o.max==null||v<=o.max)){ set(v); (o.after||(()=>changed()))(); } }); return el; }
function chk(label,get,set,after){ const i=h('input',{type:'checkbox'}); i.checked=!!get(); i.addEventListener('change',()=>{ set(i.checked); (after||(()=>changed()))(); }); return h('label',{class:'check'},i,label); }
function sel(opts,get,set,after,aria){ const s=h('select',{'aria-label':aria||''}); for(const [v,t] of opts) s.append(h('option',{value:v},t)); s.value=String(get()); s.addEventListener('change',()=>{ set(s.value); (after||(()=>changed()))(); }); return s; }
function sec(title,...kids){ return h('section',{class:'sec'},h('h2',{class:'sec-title'},title),...kids); }

/* ───────── 왼쪽: 범위·경계·색칠 ───────── */
const AREAS=[['sk','전국'],['kor','한반도'],['nk','북한'],['capital','수도권'],['gangwon','강원권'],['chung','충청권'],['honam','호남권'],['yeong','영남권'],['dongnam','동남권'],['daegyeong','대경권'],['jeju','제주권']];
function renderLeft(){
  if(!HAS) return; const m=doc.map;
  const A=$('#areaBox'); A.textContent='';
  for(const [v,t] of AREAS){ const b=h('button',{type:'button','aria-pressed':String(m.area===v)},t); b.addEventListener('click',()=>{ m.area=v; m.sido=[]; m.level=['sk','kor','nk'].includes(v)?'sido':'sgg'; m.shade={}; m.metro='auto'; mapChanged(); fit(); }); A.append(b); }
  const S=$('#sidoBox'); S.textContent='';
  for(const c of KM.sidoList(m)){ const on=m.area==='sido'&&m.sido.includes(c); const b=h('button',{type:'button','aria-pressed':String(on),title:KM.sidoName(c)},KM.sidoName(c));
    b.addEventListener('click',()=>{ if(m.area!=='sido'){ m.area='sido'; m.sido=[]; m.shade={}; } const i=m.sido.indexOf(c); if(i>=0) m.sido.splice(i,1); else m.sido.push(c); if(!m.sido.length){ m.area='sk'; m.level='sido'; } else m.level='sgg'; mapChanged(); fit(); }); S.append(b); }
  /* 경계와 보기 */
  const V=$('#viewBox'); V.textContent='';
  V.append(row('경계',seg([['sido','시·도'],['sgg','시·군·구']],()=>m.level,v=>{ m.level=v; m.shade={}; },()=>mapChanged())));
  if(m.level==='sgg'&&KM.metroIn(m).length) V.append(row('',chk('광역시·특별시 구 합치기',()=>KM.mergeOn(m),v=>{ m.metro=v?'merge':'split'; for(const k of Object.keys(m.shade)) if(k.startsWith('s:')||k==='g:12') delete m.shade[k]; },()=>{ mapChanged(); }),h('span',{class:'unit'},'시험지 방식')));
  V.append(row('',chk('이름 넣기(답지용)',()=>m.names,v=>m.names=v,()=>{ syncAuto(); changed(); })));
  V.append(row('',chk('축척 막대',()=>m.scale,v=>m.scale=v,()=>{ syncAuto(); changed(); })));
  V.append(row('',chk('테두리',()=>m.frame,v=>m.frame=v,()=>mapChanged())));
  if(m.area==='sido'&&m.sido.includes('11')&&m.sido.length<=2) V.append(row('',chk('한강(두 줄)',()=>m.han!==false,v=>m.han=v,()=>mapChanged())));
  if(m.area!=='sk'&&m.area!=='kor') V.append(row('',chk('위치도(전국 속 위치)',()=>m.inset,v=>m.inset=v,()=>mapChanged())));
  const hasUl=['sk','kor','yeong','daegyeong'].includes(m.area)||(m.area==='sido'&&m.sido.includes('47'));
  if(hasUl){ V.append(row('울릉도',seg([['box','상자로'],['true','제자리'],['off','빼기']],()=>m.ulleung,v=>m.ulleung=v,()=>{ mapChanged(); fit(); })));
    if(m.ulleung!=='off') V.append(row('',chk('독도 넣기',()=>m.dokdo,v=>m.dokdo=v,()=>{ mapChanged(); fit(); }))); }
  if(m.area==='kor'||m.area==='nk') V.append(row('',chk('북한 도 경계',()=>m.nkdo!==false,v=>m.nkdo=v,()=>mapChanged())));
  if(m.area==='kor'||m.area==='nk') V.append(row('북한 도',seg([['lib','해방(1945) 기준'],['now','현재']],()=>m.nkEra==='now'?'now':'lib',v=>m.nkEra=v,()=>{ mapChanged(); }),h('span',{class:'unit',title:'현재의 양강도는 함경남도에, 자강도는 평안북도에, 나선은 함경북도에, 평양은 평안남도에, 황해남·북도는 황해도에 묶은 근사예요. 군 단위로는 옛 경계와 어긋날 수 있어요.'},'근사(양강→함남, 자강→평북 등)')));
  if(m.area==='nk') V.append(row('',chk('남한 땅 함께 표시(휴전선 아래, 윤곽만)',()=>m.skShow!==false,v=>m.skShow=v,()=>{ mapChanged(); fit(); })));
  const rv=h('div',{class:'kriv'}); for(const r of Object.keys(KM.data().rivers||{})) rv.append(chk(r,()=>(m.rivers||[]).includes(r),v=>{ m.rivers=(m.rivers||[]).filter(x=>x!==r); if(v) m.rivers.push(r); },()=>mapChanged()));
  V.append(row('하천',rv));
  /* 고속 국도(모식적인 선) */
  const rd=h('div',{class:'kriv'}); for(const r of Object.keys(KM.data().roads||{})) rd.append(chk(r,()=>(m.roads||[]).includes(r),v=>{ m.roads=(m.roads||[]).filter(x=>x!==r); if(v) m.roads.push(r); },()=>mapChanged()));
  V.append(row('고속 국도',rd));
  if((m.roads||[]).length){ const st=Object.entries(KM.ROAD_KO);
    for(const r of m.roads) V.append(row('',h('span',{class:'unit'},r),sel(st,()=>KM.roadStyleOf(m,r),v=>{ m.roadStyle=Object.assign({},m.roadStyle,{[r]:v}); },()=>mapChanged(),r+' 선 모양')));
    V.append(row('',chk('범례',()=>m.roadLegend!==false,v=>m.roadLegend=v,()=>{ syncAuto(); changed(); }))); }
  /* 영해(「영해 및 접속수역법 시행령」 별표의 기점·대한 해협 3해리) */
  if(KM.data().sea){ const sv=h('div',{class:'kriv'});
    for(const k of ['bl','bp','ts','nb']) sv.append(chk(KM.SEA_KO[k],()=>!!m[k],v=>{ m[k]=v; },()=>{ mapChanged(); fit(); }));
    V.append(row('영해',sv));
    if(m.bl) V.append(row('',h('span',{class:'unit'},'직선 기선'),sel([['solid','실선'],['dot','점선']],()=>m.blStyle||'solid',v=>m.blStyle=v,()=>mapChanged(),'직선 기선 선 모양')));
    if(KM.seaOn(m)){ V.append(row('',chk('범례',()=>m.seaLegend!==false,v=>m.seaLegend=v,()=>{ syncAuto(); changed(); })));
      if((m.ts||m.nb)&&hasUl&&m.ulleung==='box') V.append(h('p',{class:'sub'},'울릉도·독도 영해선은 울릉도를 ‘제자리’로 두었을 때 그려져요.')); } }
  V.append(row('지도 너비',num(()=>m.width,v=>m.width=v,{min:30,max:250,step:1,aria:'지도 너비(mm)',on:'change',after:()=>{ mapChanged(); fit(); }}),h('span',{class:'unit'},'mm')));
  V.append(row('경계 기준',sel(Object.entries(KM.data().vers).map(([k,v])=>[k,v.label]).reverse(),()=>m.ver,v=>{ m.ver=v; m.verPick=true; m.shade={}; },()=>{ mapChanged(); fit(); },'경계 기준')));
  /* 색칠 */
  const H=$('#shadeBox'); H.textContent='';
  const tones=KM.TONE_ORDER.map(t=>[t,KM.TONES[t].ko]);
  H.append(row('칠할 색',seg(tones,()=>ui.paint,v=>{ ui.paint=v; saveLocal(); },()=>{})));
  H.append(h('p',{class:'sub'},'위쪽 ‘색칠’ 도구(P)를 고르고 지도에서 시·군을 누르면 칠해지고, 같은 색으로 다시 누르면 지워져요. 시·도 경계 지도에서는 시·도 전체가 칠해져요.'));
  const list=h('ul',{class:'kshade'}); const names=k=>{ if(k==='g:12') return '광주(옛 광주광역시)'; if(k.startsWith('s:')) return KM.sidoName(k.slice(2)); const p=KM.places(m).find(p=>p.k==='sgg'&&p.c===k); return p?`${KM.sidoName(p.s)} ${p.n}`:k; };
  for(const [k,t] of Object.entries(m.shade||{})){ const sw=h('span',{class:'ktone',style:`background:${/url/.test(KM.TONES[t].fill)?'repeating-linear-gradient(45deg,#000 0 1px,#fff 1px 3px)':KM.TONES[t].fill}`});
    const del=h('button',{class:'ico',type:'button','aria-label':'지우기',title:'지우기'},'×'); del.addEventListener('click',()=>{ delete m.shade[k]; mapChanged(); });
    list.append(h('li',null,h('span',null,sw,names(k)),sel(tones,()=>t,v=>{ m.shade[k]=v; },()=>mapChanged(),'색'),del)); }
  if(Object.keys(m.shade||{}).length){ H.append(list); const clr=h('button',{class:'btn small',type:'button'},'색칠 모두 지우기'); clr.addEventListener('click',()=>{ m.shade={}; mapChanged(); }); H.append(h('div',{class:'paste-row'},clr)); }
  $('#srcNote').textContent='경계: '+KM.data().src;
}

/* ───────── 오른쪽: 설정 ───────── */
const BOX=[['halo','흰 테두리'],['none','없음'],['white','흰 상자'],['circle','원'],['wcircle','흰 원']];
const DASHES=[['dot','점선'],['dash','파선'],['fine','잔 파선'],['solid','실선']];
function renderOpts(){
  const P=$('#opts'); P.textContent=''; const it=selItem(); const sd=$('#selDot'); if(sd) sd.hidden=!it;
  if(it){ const s=sec(`고른 것: ${LG.ITEM_KO[it.t]}`); const p=h('div',{class:'props'});
    const lw=()=>row('선 굵기',num(()=>it.lw,v=>it.lw=v,{min:0.05,max:2,step:0.05,aria:'선 굵기(mm)',empty:true,ph:String(doc.style.lw)}),h('span',{class:'unit'},'mm (비우면 기본)'));
    if(['sym','leader','text'].includes(it.t)){
      const t=it.t==='text'?h('textarea',{id:'propText','aria-label':'글자'}):h('input',{type:'text',id:'propText','aria-label':'글자'}); t.value=it.text; t.addEventListener('input',()=>{ it.text=t.value; changed(); refreshHint(); });
      p.append(row('글자',t),row('크기',num(()=>it.size,v=>it.size=v,{min:4,max:40,step:0.5,aria:'글자 크기(pt)',empty:true,ph:String(doc.style.size)}),h('span',{class:'unit'},'pt (비우면 기본)')),
        row('글꼴',seg([['serif','명조'],['gothic','고딕']],()=>it.fam,v=>it.fam=v)),row('',chk('굵게',()=>it.bold,v=>it.bold=v)));
      if(it.t!=='text') p.append(row('바탕',sel(BOX,()=>it.box,v=>it.box=v,null,'기호 바탕')));
      if(it.t==='text') p.append(row('정렬',seg([['center','가운데'],['left','왼쪽']],()=>it.align,v=>it.align=v)),row('상자',seg([['none','없음'],['white','흰 바탕'],['frame','테두리']],()=>it.box,v=>it.box=v)));
      if(it.t==='leader') p.append(row('',chk('끝에 점',()=>it.dot,v=>it.dot=v)),lw()); }
    if(it.t==='ell') p.append(row('선',sel(DASHES,()=>it.dash,v=>it.dash=v,null,'선 모양')),row('채움',seg([['none','없음'],['white','흰색']],()=>it.fill,v=>it.fill=v)),lw(),
      row('크기',num(()=>it.rx,v=>it.rx=v,{min:0.3,step:0.1,aria:'가로 반지름'}),h('span',{class:'unit'},'×'),num(()=>it.ry,v=>it.ry=v,{min:0.3,step:0.1,aria:'세로 반지름'}),h('span',{class:'unit'},'mm')));
    if(it.t==='arrow') p.append(row('머리',seg([['end','끝'],['both','양쪽'],['start','처음'],['none','없음']],()=>it.head,v=>it.head=v)),row('선',sel(DASHES.slice().reverse(),()=>it.dash,v=>it.dash=v,null,'선 모양')),lw());
    if(it.t==='line') p.append(row('선',sel(DASHES.slice().reverse(),()=>it.dash,v=>it.dash=v,null,'선 모양')),lw());
    if(it.t==='rect') p.append(row('채움',seg([['white','흰색'],['gray','회색'],['none','없음']],()=>it.fill,v=>it.fill=v)),row('테두리',seg([['none','없음'],['solid','실선'],['dash','파선']],()=>it.stroke,v=>it.stroke=v)),lw());
    if(it.t==='dot') p.append(row('크기',num(()=>it.r,v=>it.r=v,{min:0.1,max:5,step:0.05,aria:'점 반지름(mm)'}),h('span',{class:'unit'},'mm')));
    const btn=(t,fn,title)=>{ const b=h('button',{class:'btn small',type:'button',title:title||''},t); b.addEventListener('click',fn); return b; };
    if((it.t==='sym'||it.t==='leader')&&!it.km) p.append(h('div',{class:'btnrow'},btn('안쪽으로',()=>respot(it,'in'),'이 기호를 지역 안쪽에 놓아요(너무 좁으면 지시선)'),btn('지시선으로',()=>respot(it,'leader'),'이 기호를 지역 밖에 놓고 지시선으로 이어요'),btn('자리 다시 잡기',()=>respot(it,null),'겹치지 않는 자리를 다시 찾아요')));
    p.append(h('div',{class:'btnrow'},btn('복제',()=>dup(it),'Ctrl+D'),btn('지우기',()=>delItem(it),'Delete')));
    s.append(p); P.append(s); }
  else P.append(sec('고른 것',h('p',{class:'sub'},'‘고르기’ 도구(V)로 기호나 선을 누르면 여기서 고쳐요. 축척 막대·범례·이름도 끌어서 옮길 수 있어요.')));
  /* 모든 항목 목록(누르면 고름) */
  const its=doc.items.filter(x=>!x.km); if(its.length){ const ul=h('div',{class:'klist'});
    for(const x of its){ const b=h('button',{type:'button',class:'kli','aria-current':String(x.id===selId)},h('b',null,x.text||''),h('span',null,LG.ITEM_KO[x.t]));
      b.addEventListener('click',()=>{ selId=x.id; renderOpts(); drawSel(); }); ul.append(b); }
    P.append(sec(`모든 항목 (${its.length})`,ul)); }
  const SB=$('#styleBox'); SB.textContent='';
  const nx=h('input',{type:'text',class:'seqnext',value:LG.nextSym(doc),'aria-label':'다음 기호'});
  nx.addEventListener('change',()=>{ const S=LG.SEQS[doc.seq.set]; const i=S.indexOf(nx.value.trim()); if(i>=0){ doc.seq.next=i; changed(); } else nx.value=LG.nextSym(doc); });
  const rs=h('button',{class:'btn small',type:'button'},'처음부터'); rs.addEventListener('click',()=>{ doc.seq.next=0; changed('opts'); });
  SB.append(sec('기호',row('종류',sel(Object.entries(LG.SEQ_KO),()=>doc.seq.set,v=>{ doc.seq.set=v; },()=>changed('opts'),'기호 종류')),doc.seq.set==='num'?h('p',{class:'sub seqwarn'},'숫자 기호는 답지 번호 ①~⑤와 헷갈릴 수 있어요. 시험지에는 A, B나 (가), (나)를 권해요.'):'',row('다음 기호',nx,rs),
    row('표시 방법',sel([['auto','알아서(시·군은 안쪽, 지점은 점)'],['in','지역 안에 글자'],['dot','점 + 글자'],['leader','지시선 + 점']],()=>ui.mode,v=>{ ui.mode=v; saveLocal(); },()=>{},'문장으로 놓을 때 표시 방법')),
    row('기호 바탕',sel(BOX,()=>ui.box||'halo',v=>{ ui.box=v; },null,'새 기호 바탕'))));
  SB.append(numAllSec());
  const fontOpts=fam=>GG.FONTS[fam].filter(f=>f.key!=='user').map(f=>[f.key,f.label+(f.web||GG.fontAvailable(f,fam)?'':' — 없음')]);
  SB.append(sec('글자·선 기본값',row('글자 크기',num(()=>doc.style.size,v=>doc.style.size=v,{min:5,max:30,step:0.5,aria:'기본 글자 크기(pt)'}),h('span',{class:'unit'},'pt')),
    row('선 굵기',num(()=>doc.style.lw,v=>doc.style.lw=v,{min:0.05,max:1.5,step:0.05,aria:'기본 선 굵기(mm)'}),h('span',{class:'unit'},'mm')),
    row('명조',sel(fontOpts('serif'),()=>doc.style.serif,v=>{ doc.style.serif=v; LG.clearMetrics(); loadFonts(); },null,'명조 글꼴')),
    row('고딕',sel(fontOpts('gothic'),()=>doc.style.gothic,v=>{ doc.style.gothic=v; LG.clearMetrics(); loadFonts(); },null,'고딕 글꼴')),
    row('로마자',seg([['times','Times'],['same','명조와 같게']],()=>doc.style.latin==='times'?'times':'same',v=>{ doc.style.latin=v; LG.clearMetrics(); }))));
  refreshHint();
}
function numAllSec(){
  const NA=ui.numAll||(ui.numAll={start:1,order:'code',mode:'auto'});
  const go=h('button',{class:'btn primary',type:'button'},'번호 달기'); go.addEventListener('click',numberAll);
  const cp=h('button',{class:'btn small',type:'button'},'번호·지명 표 복사'); cp.addEventListener('click',async()=>{ const k=doc.knum&&doc.knum.pairs; if(!k||!k.length){ toast('먼저 번호를 달아 주세요.'); return; }
    try{ await navigator.clipboard.writeText(k.slice().sort((a,b)=>(+a[1]||0)-(+b[1]||0)).map(([n,s])=>s+'\t'+n).join('\n')); toast('번호와 지명을 복사했어요. 엑셀·한글에 붙여 넣으세요.'); }catch(e){ toast('복사하지 못했어요.'); } });
  return sec('번호 한꺼번에 달기',h('p',{class:'sub'},'지도에 보이는 시·군(시·도)에 번호를 모두 달아요. 넓은 지역은 안쪽에, 좁은 지역은 바깥쪽에 지시선으로 놓아요. 번호가 많으면 글자 크기를 6~7pt로 줄이세요.'),
    row('시작 번호',num(()=>NA.start,v=>NA.start=Math.max(1,Math.min(900,Math.round(v||1))),{min:1,max:900,step:1,aria:'시작 번호'}),h('span',{class:'unit'},'번부터')),
    row('순서',sel([['code','행정 구역 순(시·도 → 시·군)'],['name','가나다 순'],['ns','북쪽 → 남쪽'],['we','서쪽 → 동쪽'],['cw','시계 방향(북쪽부터)'],['rand','섞어서']],()=>NA.order,v=>{ NA.order=v; saveLocal(); },null,'번호 순서')),
    row('표시 방법',sel([['auto','알아서(좁은 곳은 지시선)'],['in','모두 안쪽'],['leader','모두 지시선']],()=>NA.mode,v=>{ NA.mode=v; saveLocal(); },null,'번호 표시 방법')),
    row('글자 크기',num(()=>doc.style.size,v=>doc.style.size=v,{min:4,max:30,step:0.5,aria:'기본 글자 크기(pt)'}),h('span',{class:'unit'},'pt')),
    h('div',{class:'btnrow'},go,cp)); }
function numberAll(){
  if(!L){ toast('지도를 먼저 만들어 주세요.'); return; } const NA=ui.numAll;
  let sp=KM.nameSpots(L,doc.map).filter(s=>s.p&&['sgg','sido','grp'].includes(s.p.k)); if(!sp.length){ toast('번호를 달 시·군이 지도에 없어요.'); return; }
  const cx=L.w/2, cy=L.h/2; const key={code:s=>0,name:s=>0,ns:s=>s.y*1000+s.x,we:s=>s.x*1000+s.y,cw:s=>{ const a=Math.atan2(s.x-cx,-(s.y-cy)); return a<0?a+2*Math.PI:a; },rand:s=>Math.random()}[NA.order];
  if(NA.order==='code') sp.sort((a,b)=>String(a.p.k==='sido'?a.p.c:a.p.s+a.p.c).localeCompare(String(b.p.k==='sido'?b.p.c:b.p.s+b.p.c)));
  else if(NA.order==='name') sp.sort((a,b)=>a.n.localeCompare(b.n,'ko')); else sp.sort((a,b)=>key(a)-key(b));
  const st=Math.max(1,NA.start|0); if(st+sp.length-1>999){ sp=sp.slice(0,999-st+1); toast('번호는 999번까지라 앞의 '+sp.length+'곳에만 달았어요.'); }
  const S=LG.SEQS.num; doc.seq.set='num'; const labs=sp.map((s,i)=>({p:s.p,sym:S[st-1+i],shaded:false,n:s.n}));
  doc.items=doc.items.filter(it=>!it.gen); const made=placeLabels(labs,NA.mode==='auto'?null:NA.mode,doc.items); made.forEach(it=>it.gen=true); doc.items.push(...made);
  doc.seq.next=st-1+labs.length; doc.knum={pairs:labs.map(x=>[x.n,x.sym,pkey(x.p)])}; doc.kgen=null;
  const nl=made.filter(m=>m.t==='leader').length; selId=null; changed('all'); commit(); toast(`${labs.length}곳에 ${labs[0].sym}~${labs[labs.length-1].sym}번을 달았어요(지시선 ${nl}개). 어긋난 곳은 끌어서 옮기거나 ‘안쪽으로·지시선으로’를 눌러요.`); }
function hintOf(){
  const g=doc.kgen; if(!g||!g.pairs||!g.pairs.length) return null; const have=new Set(doc.items.filter(it=>it.t==='sym'||it.t==='leader').map(it=>it.text));
  const pairs=g.pairs.filter(([,s])=>have.has(s)); if(pairs.length<2) return null;
  const S=Object.values(LG.SEQS).find(S=>pairs.every(([,s])=>S.includes(s)))||[];
  pairs.sort((a,b)=>S.indexOf(a[1])-S.indexOf(b[1])); const lbls=pairs.map(p=>p[1]);
  const idx=lbls.map(l=>S.indexOf(l)); const cont=idx.every((v,i)=>!i||v===idx[i-1]+1)&&lbls.length>2;
  const rng=cont?`${lbls[0]}~${lbls[lbls.length-1]}`:lbls.join(', '); const last=lbls[lbls.length-1].replace(/[()]/g,''); const c=last.charCodeAt(last.length-1);
  const josa=c>=0xAC00&&c<=0xD7A3?((c-0xAC00)%28?'은':'는'):/[㉠-㉭]/.test(last)?'은':/[LMNR]$/i.test(last)?'은':/[013678]$/.test(last)?'은':'는';
  const names=pairs.map(p=>p[0]).slice().sort((a,b)=>a.localeCompare(b,'ko'));
  return {sentence:`(단, ${rng}${josa} 각각 ${names.join(', ')} 중 하나임.)`,key:pairs.map(p=>`${p[1]} ${p[0]}`).join(', ')};
}
function refreshHint(){
  const el=$('#hintSec'); if(!el) return; el.textContent=''; const H=hintOf(); if(!H){ el.hidden=true; return; } el.hidden=false; el.className='khintbox';
  const b=h('button',{class:'btn small copy',type:'button'},'단서 문구 복사'); b.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(H.sentence); toast('복사했어요.'); }catch(e){ toast('복사하지 못했어요. 글을 직접 골라 복사해 주세요.'); } });
  el.append(h('h2',{class:'sec-title'},'발문 단서 · 정답'),h('div',{class:'hint'},h('div',null,H.sentence),h('div',null,h('b',null,'정답: '),H.key),b));
}

/* ───────── 기호 놓기 ───────── */
function boxOfLabel(it){ const b=LG.labelBox(doc,it); return {x:it.x-b.w/2-0.4,y:it.y-b.h/2-0.35,w:b.w+0.8,h:b.h+0.7}; }
function ov(a,b){ return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)); }
/* 지역(시군구·시도)의 쪽 위 상자 */
function regionBox(p){ if(!L||!['sgg','sido','grp'].includes(p.k)) return null;
  const fs=L.feats.filter(f=>p.k==='sido'?f.p.s===p.c:p.k==='grp'?p.codes.includes(f.p.c):f.p.c===p.c); if(!fs.length) return null;
  let b=[1e9,1e9,-1e9,-1e9]; for(const f of fs){ const [x0,y0]=KM.toPage(L,f.b[0],f.b[3]), [x1,y1]=KM.toPage(L,f.b[2],f.b[1]); b=[Math.min(b[0],x0),Math.min(b[1],y0),Math.max(b[2],x1),Math.max(b[3],y1)]; }
  return {x:b[0],y:b[1],w:b[2]-b[0],h:b[3]-b[1]}; }
/* 선분이 상자를 지나는가(양 끝 사이를 고르게 찍어 본다) */
function segBox(x1,y1,x2,y2,o){ for(let i=1;i<10;i++){ const t=i/10, x=x1+(x2-x1)*t, y=y1+(y2-y1)*t; if(x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h) return true; } return false; }
function segX(ax,ay,bx,by,cx,cy,dx,dy){ const o=(px,py,qx,qy,rx,ry)=>(qx-px)*(ry-py)-(qy-py)*(rx-px); const e=0.01;
  if(Math.hypot(ax-cx,ay-cy)<e||Math.hypot(ax-dx,ay-dy)<e||Math.hypot(bx-cx,by-cy)<e||Math.hypot(bx-dx,by-dy)<e) return false;
  return o(ax,ay,bx,by,cx,cy)*o(ax,ay,bx,by,dx,dy)<0&&o(cx,cy,dx,dy,ax,ay)*o(cx,cy,dx,dy,bx,by)<0; }
const D16=Array.from({length:16},(_,i)=>[Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8)]);
function placeLabels(list,mode,keep){
  /* list: [{p, sym, shaded}] → 항목들. 시험지처럼: 시·군은 지역 안에 흰 테두리 기호, 기호보다 작은 지역은 밖에 두고 끝점 없는 지시선, 지점은 점 + 기호 */
  const made=[]; const boxes=[]; const dots=[]; const lsegs=[]; const rest=[]; const Ls=[]; const pb={x:0,y:0,w:L.w,h:L.h}; const cen=[pb.w/2,pb.h/2];
  const landB=(()=>{ let b=[1e9,1e9,-1e9,-1e9]; for(const f of L.feats){ if(f.p&&f.p.s==='NK'&&0) continue; const [x0,y0]=KM.toPage(L,f.b[0],f.b[3]), [x1,y1]=KM.toPage(L,f.b[2],f.b[1]); if(x1-x0>L.w*0.9||y1-y0>L.h*0.9) { /* 큰 바탕은 그대로 */ } b=[Math.min(b[0],x0,x1),Math.min(b[1],y0,y1),Math.max(b[2],x0,x1),Math.max(b[3],y0,y1)]; } return {x:b[0],y:b[1],w:b[2]-b[0],h:b[3]-b[1]}; })();
  for(const k of (keep||[])){ if(k.km) continue; if(k.t==='sym'||k.t==='leader') boxes.push(boxOfLabel(k)); if(k.t==='leader'){ lsegs.push([k.x,k.y,k.tx,k.ty]); if(k.dot) dots.push({x:k.tx-0.6,y:k.ty-0.6,w:1.2,h:1.2}); } if(k.t==='dot') dots.push({x:k.x-k.r-0.2,y:k.y-k.r-0.2,w:k.r*2+0.4,h:k.r*2+0.4}); }
  const frames=[L.ubox,L.dbox,L.loc&&{page:L.loc}].filter(Boolean).map(u=>u.page||KM.boxOf(L,u));   /* 울릉·독도 상자, 위치도 테두리 */
  const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h;
  const inFrame=(x,y)=>frames.some(f=>x>=f.x&&x<=f.x+f.w&&y>=f.y&&y<=f.y+f.h);
  const onLand=b=>{ let n=0; for(let i=0;i<3;i++) for(let j=0;j<3;j++) if(KM.featuresAt(L,b.x+b.w*(i+0.5)/3,b.y+b.h*(j+0.5)/3).length) n++; return n/9; };
  const isRegion=p=>['sgg','sido','nkdo','grp'].includes(p.k);
  const roadSegs=[]; for(const r of (doc.map.roads||[])){ const R=KM.data().roads&&KM.data().roads[r]; if(!R) continue; const P=R.line.map(q=>KM.toPage(L,q[0],q[1])); for(let i=1;i<P.length;i++) roadSegs.push([P[i-1],P[i]]); }
  roadSegs.push(...KM.seaSegs(L,doc.map));   /* 직선 기선·영해선도 가리지 않게 */
  const roadHit=b=>roadSegs.some(([a,c])=>{ if(Math.max(a[0],c[0])<b.x||Math.min(a[0],c[0])>b.x+b.w||Math.max(a[1],c[1])<b.y||Math.min(a[1],c[1])>b.y+b.h) return false; return segBox(a[0],a[1],c[0],c[1],b)||(a[0]>=b.x&&a[0]<=b.x+b.w&&a[1]>=b.y&&a[1]<=b.y+b.h); });
  const modeOf=x=>{ const m=mode&&mode!=='auto'?mode:null; if(m) return m; if(x.shaded) return 'in'; return (x.p.k==='sgg'&&doc.map.level==='sgg')||['sido','nkdo','grp'].includes(x.p.k)?'in':'dot'; };
  /* 점 먼저 */
  for(const x of list){
    if(x.p.k==='road'){ const pt=KM.roadPoint(L,doc.map,x.p.r); x.m='road'; x.px=pt?pt[0]:null; x.py=pt?pt[1]:null; continue; }   /* 고속 국도: 보이는 부분 가운데 옆에 기호(점 없이) */
    x.m=modeOf(x); const sp=KM.spotOf(L,x.p,x.m==='in'||(x.m==='leader'&&isRegion(x.p))?'in':'dot'); x.px=sp.px; x.py=sp.py; if(x.m==='dot'||(x.m==='leader'&&!isRegion(x.p))) dots.push({x:sp.px-0.6,y:sp.py-0.6,w:1.2,h:1.2});
    if(x.p.k==='bp'&&doc.map.bp&&x.m==='dot') x.nodot=true; }   /* 기점 동그라미가 있으면 점을 따로 찍지 않는다 */
  for(const x of list){
    if(x.m==='road'&&x.px==null) continue;
    if(x.m==='in'){ const it=LG.makeItem('sym',{x:x.px,y:x.py,text:x.sym,box:'halo'}); const rb=regionBox(x.p); let lb=boxOfLabel(it);
      if(!rb||(rb.w>=lb.w*1.2&&rb.h>=lb.h*1.2)){
        /* 고속 국도 선 위에 걸리면 같은 지역 안에서 조금 옮긴다 */
        if(roadSegs.length&&roadHit(lb)){ const f0=KM.featuresAt(L,x.px,x.py)[0]; let ok=null;
          for(const r of [1.2,2.0,2.8,3.6]) for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0],[-0.7,-0.7],[0.7,-0.7],[-0.7,0.7],[0.7,0.7]]){ if(ok) break;
            const nx=x.px+dx*r, ny=x.py+dy*r; const f=KM.featuresAt(L,nx,ny)[0]; if(!f||!f0||f.p.c!==f0.p.c) continue;
            const b2={x:lb.x+nx-x.px,y:lb.y+ny-x.py,w:lb.w,h:lb.h}; if(!roadHit(b2)&&!boxes.some(o=>ov(o,b2)>0)) ok=[nx,ny,b2]; }
          if(ok){ it.x=ok[0]; it.y=ok[1]; lb=ok[2]; } }
        boxes.push(lb); made.push(it); continue; }
      /* 기호보다 작은 지역: 상자(울릉) 안이면 상자 옆에, 아니면 지시선 */
      if(inFrame(x.px,x.py)){ x.m='beside'; x.rb=rb; } else x.m='leader'; }
    rest.push(x); }
  /* 안쪽 기호를 먼저 놓았으니, 지점·지시선 기호는 바깥쪽 것부터 놓는다(안쪽 것이 바깥 것의 길을 막지 않게) */
  const dc=x=>x.m==='leader'?Math.hypot(x.px-cen[0],x.py-cen[1]):1e6; rest.sort((a,b)=>dc(b)-dc(a));
  for(const x of rest){
    const tmp=LG.makeItem('sym',{text:x.sym}); const lb=LG.labelBox(doc,tmp); const w=lb.w+0.8, hh=lb.h+0.7;
    if(x.m==='leader'){ x.w=w; x.hh=hh; Ls.push(x); continue; }
    let best=null;
    const dirs=x.m==='leader'?D16:[[1,0],[-1,0],[0.8,-0.8],[-0.8,-0.8],[0.8,0.8],[-0.8,0.8],[0,-1],[0,1]];
    const R=x.m==='leader'?[3.5,5,6.5,8.5,11,14]:[0];
    /* 후보 자리: 지점(또는 작은 지역) 둘레 + 그것을 담은 상자(울릉·독도) 바깥 둘레 */
    const anchors=[x.m==='beside'?{c:[x.rb.x+x.rb.w/2,x.rb.y+x.rb.h/2],ox:x.rb.w/2,oy:x.rb.h/2,g:0.5,extra:0}:{c:[x.px,x.py],ox:0,oy:0,g:0.9,extra:0}];
    if(x.m!=='leader') for(const f of frames) if(x.px>=f.x&&x.px<=f.x+f.w&&x.py>=f.y&&x.py<=f.y+f.h) anchors.push({c:[f.x+f.w/2,f.y+f.h/2],ox:f.w/2,oy:f.h/2,g:0.4,extra:0.3});
    for(const A of anchors) for(const r of R) dirs.forEach(([dx,dy],di)=>{ const gap=x.m==='leader'?r:A.g; const cx=A.c[0]+dx*(gap+A.ox+w/2), cy=A.c[1]+dy*(gap+A.oy+hh/2);
      const b={x:cx-w/2,y:cy-hh/2,w,h:hh}; let pen=A.extra; for(const o of boxes) pen+=ov(b,o)*10; for(const o of dots) pen+=ov(b,o)*30; for(const f of frames) if(ov(b,f)>0&&!inside(b,f)) pen+=8;
      if(roadSegs.length&&roadHit(b)) pen+=4;   /* 고속 국도 선을 가리지 않게 */
      if(x.m==='leader'){ pen+=onLand(b)*0.5;   /* 지시선 기호는 바다·빈 곳을 조금 좋아하되, 지시선이 다른 기호를 지나지 않게 */
        const ex=b.x+b.w/2, ey=b.y+b.h/2; for(const o of boxes) if(segBox(x.px,x.py,ex,ey,o)) pen+=16;
        for(const sg of lsegs) if(segX(x.px,x.py,ex,ey,sg[0],sg[1],sg[2],sg[3])) pen+=20; for(const sg of lsegs) if(segBox(sg[0],sg[1],sg[2],sg[3],b)) pen+=6;   /* 지시선끼리 가로지르지 않게 */
        const ox=x.px-cen[0], oy=x.py-cen[1], ol=Math.hypot(ox,oy)||1; pen+=0.7*(1-(dx*ox+dy*oy)/(ol*Math.hypot(dx,dy))); }   /* 지도 한가운데에서 바깥쪽으로 */
      if(b.x<pb.x||b.y<pb.y||b.x+b.w>pb.w||b.y+b.h>pb.h) pen+=x.m==='leader'?2:1; const sc=pen+di*0.05+r*0.25; if(!best||sc<best.sc) best={sc,cx,cy,b,pen}; });
    boxes.push(best.b);
    if(x.m==='leader'){ lsegs.push([best.cx,best.cy,x.px,x.py]); made.push(LG.makeItem('leader',{x:best.cx,y:best.cy,tx:x.px,ty:x.py,text:x.sym,box:'halo',dot:!isRegion(x.p)})); }
    else { if(x.m!=='beside'&&x.m!=='road'&&!x.nodot) made.push(LG.makeItem('dot',{x:x.px,y:x.py,r:0.5})); made.push(LG.makeItem('sym',{x:best.cx,y:best.cy,text:x.sym,box:'halo'})); }
  }
  /* 지시선 기호: 후보 자리(둘레 + 지도 바깥 사각 둘레)를 모두 만들어 두고, 하나씩 다시 골라 가며 겹침·교차가 가장 적은 배치를 찾는다 */
  if(Ls.length){
    const fb=boxes.slice(), fd=dots.slice(), fs=lsegs.slice();
    for(const x of Ls){ const w=x.w, hh=x.hh; const C=[]; const ox=x.px-cen[0], oy=x.py-cen[1], ol=Math.hypot(ox,oy)||1;
      const add=(cx,cy,len,extra)=>{ const b={x:cx-w/2,y:cy-hh/2,w,h:hh}; let pen=extra+len*0.06; for(const o of fb) pen+=ov(b,o)*10; for(const o of fd) pen+=ov(b,o)*30; for(const f of frames) if(ov(b,f)>0&&!inside(b,f)) pen+=8;
        if(roadSegs.length&&roadHit(b)) pen+=4; pen+=onLand(b)*0.5; for(const o of fb) if(segBox(x.px,x.py,cx,cy,o)) pen+=16; for(const sg of fs){ if(segX(x.px,x.py,cx,cy,sg[0],sg[1],sg[2],sg[3])) pen+=20; if(segBox(sg[0],sg[1],sg[2],sg[3],b)) pen+=6; }
        if(b.x<pb.x||b.y<pb.y||b.x+b.w>pb.w||b.y+b.h>pb.h) pen+=2; C.push({cx,cy,b,pen}); };
      for(const r of [3.5,5,6.5,8.5,11,14]) for(const [dx,dy] of D16) add(x.px+dx*(r+w/2),x.py+dy*(r+hh/2),r,r*0.25+0.7*(1-(dx*ox+dy*oy)/ol));
      const E={x:landB.x-w/2-1.6,y:landB.y-hh/2-1.6,w:landB.w+w+3.2,h:landB.h+hh+3.2}; const step=Math.max(2.4,hh*0.9);
      for(let t=0;t<=E.w;t+=step){ for(const yy of [E.y,E.y+E.h]) add(E.x+t,yy,Math.hypot(E.x+t-x.px,yy-x.py),0.3); } for(let t=step;t<E.h;t+=step){ for(const xx of [E.x,E.x+E.w]) add(xx,E.y+t,Math.hypot(xx-x.px,E.y+t-x.py),0.3); }
      x.C=C; x.cur=-1; }
    const inter=(x,c,y,d)=>{ let q=ov(c.b,d.b)*10; if(segX(x.px,x.py,c.cx,c.cy,y.px,y.py,d.cx,d.cy)) q+=20; if(segBox(x.px,x.py,c.cx,c.cy,d.b)) q+=16; if(segBox(y.px,y.py,d.cx,d.cy,c.b)) q+=16; return q; };
    const costOf=(x,j)=>{ const c=x.C[j]; let q=c.pen; for(const y of Ls) if(y!==x&&y.cur>=0) q+=inter(x,c,y,y.C[y.cur]); return q; };
    Ls.sort((a,b)=>Math.hypot(b.px-cen[0],b.py-cen[1])-Math.hypot(a.px-cen[0],a.py-cen[1]));
    for(const x of Ls){ let bj=0,bc=1e9; x.C.forEach((_,j)=>{ const q=costOf(x,j); if(q<bc){ bc=q; bj=j; } }); x.cur=bj; }
    for(let round=0;round<4;round++){ let ch=false; for(const x of Ls){ const cur=x.cur; x.cur=-1; let bj=cur,bc=1e9; x.C.forEach((_,j)=>{ const q=costOf(x,j); if(q<bc-1e-9){ bc=q; bj=j; } }); x.cur=bj; if(bj!==cur) ch=true; } if(!ch) break; }
    for(const x of Ls){ const c=x.C[x.cur]; boxes.push(c.b); lsegs.push([c.cx,c.cy,x.px,x.py]); made.push(LG.makeItem('leader',{x:c.cx,y:c.cy,tx:x.px,ty:x.py,text:x.sym,box:'halo',dot:!isRegion(x.p)})); }
  }
  return made;
}

/* ───────── 문장으로 만들기 ───────── */
let undoAsk=null;
function askMsg(kind,text){ const m=$('#askMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }
function nameOfPlace(p){ return p.k==='road'?KM.roadLabel(p.r):p.k==='sido'?KM.sidoName(p.c):p.n; }
function run(){
  const q=$('#q').value.trim(); if(!q){ $('#q').focus(); return; }
  if(!HAS){ askMsg('err','지도 자료가 실려 있지 않아요.'); return; }
  const spec=KM.parse(q,doc.map); undoAsk=snap();
  const m=spec.map; m.shade={};  /* 문장 하나 = 새 지도(보기 설정만 이어받음) */
  for(const s of spec.shade){ const p=s.p; if(p.k==='grp'){ if(KM.mergeOn(m)) m.shade['g:12']=s.tone; else p.codes.forEach(c=>m.shade[c]=s.tone); } else m.shade[p.k==='sido'?'s:'+p.c:p.c]=s.tone; }
  doc.map=m; doc.items=[];
  L=null; rebuild(false);
  if(spec.set) doc.seq.set=spec.set; const S=LG.SEQS[doc.seq.set];
  let labs=spec.labels.slice(); const free=labs.filter(x=>!x.sym);
  /* 기호 없는 지명: 차례대로(섞기) */
  const used=new Set(labs.filter(x=>x.sym).map(x=>x.sym)); let k=0; const order=free.map((_,i)=>i); if(spec.shuffle) for(let i=order.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
  const seq=[]; while(seq.length<free.length&&k<S.length){ if(!used.has(S[k])) seq.push(S[k]); k++; }
  free.forEach((x,i)=>{ x.sym=seq[order[i]]||null; });
  labs=labs.filter(x=>x.sym);
  const made=placeLabels(labs,spec.mode||ui.mode); made.forEach(it=>it.gen=true); doc.items.push(...made);
  const lastIdx=Math.max(-1,...labs.map(x=>S.indexOf(x.sym))); doc.seq.next=lastIdx+1;
  doc.kgen={pairs:labs.map(x=>[x.n||nameOfPlace(x.p),x.sym])};
  syncAuto(); selId=null; changed('all',true); commit(); fit();
  let t=`${KM.areaLabel(m)} · ${m.level==='sgg'?'시·군·구':'시·도'} 경계`;
  if(labs.length) t+=` · ${labs.map(x=>`${x.sym} ${nameOfPlace(x.p)}`).join(', ')}`;
  if(spec.shade.length) t+=` · 색칠 ${spec.shade.map(s=>nameOfPlace(s.p)).join(', ')}`;
  if((m.roads||[]).length) t+=` · 고속 국도 ${m.roads.join(', ')}(모식적인 선)`;
  if(KM.seaOn(m)) t+=` · ${['bl','bp','nb','ts'].filter(k=>m[k]).map(k=>KM.SEA_KO[k]).join(', ')}`;
  const offRoad=labs.filter(x=>x.p.k==='road'&&!KM.roadPoint(L,m,x.p.r)); if(offRoad.length) spec.notes.push(offRoad.map(x=>`‘${KM.roadLabel(x.p.r)}’은 이 지도 범위 밖이라 기호를 놓지 못했어요`).join(', '));
  t+='.'; if(spec.notes.length) t+=' '+spec.notes.join(', ')+'(다르면 ‘강원 고성’처럼 시·도를 앞에 붙여 주세요).'; if(spec.missing.length) t+=` ${spec.missing.join(', ')}은(는) 지명 사전에 없어 빠졌어요(‘점’ 도구로 직접 찍어 주세요).`;
  askMsg(spec.missing.length||spec.notes.length?'warn':'ok',t); $('#undoAsk').hidden=false;
}
$('#goBtn').addEventListener('click',run);
$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); run(); } });
$('#undoAsk').addEventListener('click',()=>{ if(!undoAsk) return; restore(undoAsk); undoAsk=null; $('#undoAsk').hidden=true; selId=null; changed('all'); fit(); askMsg('ok','문장으로 만들기 전으로 되돌렸어요.'); });
const EX=['강원 시군 지도, 홍천 A, 인제 B, 평창 C, 정선 D 색칠','경북 시군 지도, 영주, 예천, 경주를 A~C로 색칠','전라 시군 지도, 군산 A, 나주 B, 목포 C, 광양 D',
  '충청권 시군 경계, 천안·아산·당진 색칠, 청주는 (가), 대전은 (나)','서울 자치구, 노원구, 중구, 영등포구 색칠','전국 시도 지도, 서울 A, 대구 B, 광주 C, 제주 D',
  '한반도 지도, 신의주 A, 평양 B, 원산 C, 대관령 D, 서귀포 E','전국 지도, 경부 고속 국도 (가), 영동 고속 국도 (나), 서해안 고속 국도 (다)','강원 시군 지도, 영동고속도로, 평창 A, 강릉 B','경남 시군 지도, 거제는 A, 남해는 B, 창원은 C, 낙동강','남한 시도 지도에 경기, 충남, 경북 진하게 색칠','대구 군위군 색칠, 달성군 A',
  '전국 지도에 직선 기선, 기점, 영해선','전국 지도에 기선은 점선으로, 가거도 (가), 상왕등도 (나), 여서도 (다), 거문도 (라)','호남권 시군 지도, 직선 기선과 영해선, 홍도 A, 가거도 B','전국 지도에 통상 기선과 영해선, 울릉도와 독도'];
function renderExamples(){ const box=$('#exList'); box.textContent=''; EX.forEach(q=>{ const b=h('button',{class:'ex',type:'button'},q); b.addEventListener('click',()=>{ $('#q').value=q; run(); }); box.append(b); }); }

/* ───────── 내보내기 · 작업 파일 ───────── */
const syncDpi=bindSeg($('#dpiSeg'),()=>String(ui.dpi),v=>{ ui.dpi=+v; saveLocal(); draw(); });
function stamp(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
async function loadFonts(){ if(!document.fonts||!document.fonts.load) return; const jobs=[]; const txt=doc.items.map(it=>it.text||'').join('')+'ABC(가)㉠0km';
  for(const fam of ['serif','gothic']) if(GG.needsWeb({style:doc.style},fam)) jobs.push(document.fonts.load(`16px "${fam==='serif'?'Noto Serif KR':'Noto Sans KR'}"`,txt).catch(()=>{}));
  await Promise.all(jobs); LG.clearMetrics(); schedule(); }
async function exportPng(){ await loadFonts(); return LG.renderPng(doc,ui.dpi); }
const nameOf=()=>`한국지리_백지도_${KM.areaLabel(doc.map)}_${stamp()}`.replace(/[\\/:*?"<>|()\s·]+/g,'_').replace(/_+/g,'_');
const savePng=async()=>{ try{ const b=await exportPng(); const r=await GG.saveFile(nameOf()+'.png',b,'image/png'); toast(r==='saved'?'PNG로 저장했어요.':'저장하지 못했어요.'); }catch(e){ toast('PNG를 만들지 못했어요.'); } };
$('#pngBtn').addEventListener('click',savePng); $('#pngBtn2').addEventListener('click',savePng);
$('#undoBtn').addEventListener('click',()=>doUndo()); $('#redoBtn').addEventListener('click',()=>doRedo());
/* 오른쪽 갈래: 지도 · 꾸미기 · 항목 · 내보내기 */
function showTab(t,auto){ if(auto&&window.innerWidth<=900) return; ROOT.querySelectorAll('.ktabs [data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===t)));
  ROOT.querySelectorAll('.kpane').forEach(p=>p.hidden=p.dataset.pane!==t); ui.tab=t; saveLocal(); }
ROOT.querySelectorAll('.ktabs [data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
showTab(['map','style','sel','out'].includes(ui.tab)?ui.tab:'map');
$('#svgBtn').addEventListener('click',async()=>{ await loadFonts(); const r=await GG.saveFile(nameOf()+'.svg',LG.svgString(doc,{inline:true}),'image/svg+xml'); toast(r==='saved'?'SVG로 저장했어요.':'저장하지 못했어요.'); });
const copyPng=async()=>{ try{ await navigator.clipboard.write([new ClipboardItem({'image/png':exportPng()})]); toast('그림을 복사했어요. 한글·워드에 붙여 넣으세요.'); }catch(e){ toast('이 브라우저에서는 복사가 막혀 있어요. PNG로 저장해 주세요.'); } };
$('#copyBtn').addEventListener('click',copyPng); $('#copyBtn2').addEventListener('click',copyPng);
$('#zIn').addEventListener('click',()=>zoomAt(1.25)); $('#zOut').addEventListener('click',()=>zoomAt(0.8)); $('#zFit').addEventListener('click',fit);
$('#saveJson').addEventListener('click',async()=>{ commit(); const r=await GG.saveFile(`한국지리_백지도_작업_${stamp()}.json`,JSON.stringify(Object.assign({},doc,{base:null})),'application/json'); toast(r==='saved'?'작업을 저장했어요.':'저장하지 못했어요.'); });
function loadDoc(d,msg){ doc=norm(d); L=null; rebuild(false); selId=null; commit(); changed('all'); fit(); loadFonts(); if(msg) toast(msg); }
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='kmap') throw 0; loadDoc(d,'작업을 불러왔어요.'); }catch(err){ toast('한국지리 백지도 작업 파일이 아니에요.'); } });
$('#resetBtn').addEventListener('click',()=>{ commit(); doc=freshDoc(); L=null; rebuild(false); selId=null; changed('all'); fit(); toast('새 작업을 시작했어요. 되돌리려면 Ctrl+Z.'); });

/* ───────── 시작 ───────── */
rebuild(false); last=snap();
renderExamples(); setTool(ui.tool); changed('all',true); requestAnimationFrame(()=>{ fit(); draw(); }); loadFonts();
if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ LG.clearMetrics(); schedule(); });
if(OPT&&OPT.doc) loadDoc(OPT.doc,OPT.msg);
return {load:d=>{ if(!d||d.app!=='kmap') return false; loadDoc(d,'작업을 불러왔어요.'); return true; },getDoc:()=>doc};
});