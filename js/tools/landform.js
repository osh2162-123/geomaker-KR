/* 지형 모식도 편집기: 바탕(기본 모식도·그림·PDF 조각) 위에 기호·지시선·점선 원·화살표·가림 상자·글상자를 놓고 고친다 */
HUB.def('landform',function(ROOT,OPT){
'use strict';
const KEY='wglandform-editor-v1', UIKEY='wglandform-editor-ui-v1';
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
try{ const el=document.getElementById('lg-data'); if(el) LG.setData(JSON.parse(el.textContent)); }catch(e){ /* 기본 모식도 없이도 불러오기는 된다 */ }
try{ const el=document.getElementById('lg-kdata'); if(el) LG.setKice(JSON.parse(el.textContent)); }catch(e){ /* 기출 그림은 없어도 된다 */ }
const HAS=LG.diagrams().length>0, KHAS=LG.kiceItems().length>0;
const stage=$('#stage'), wrap=$('#stageWrap');

/* ───────── 상태 ───────── */
function loadLocal(){ try{ const s=localStorage.getItem(KEY); if(!s) return null; const d=JSON.parse(s); return d&&d.app==='landform'?LG.normalizeDoc(d):null; }catch(e){ return null; } }
let doc=loadLocal()||LG.freshDoc();
if(!doc.base&&HAS&&!doc.items.length) LG.setLibBase(doc,LG.diagrams()[0].id,120);
let ui=(()=>{ try{ return GG.clean(JSON.parse(localStorage.getItem(UIKEY)||'null')); }catch(e){ return null; } })()||{};
ui=Object.assign({tool:'select',mark:'ell',dpi:600,feat:{},kgroup:'all'},ui);
let selId=null, raf=0, saveT=0, warnedBig=false;
function saveLocal(){ clearTimeout(saveT); saveT=setTimeout(()=>{
  try{ localStorage.setItem(UIKEY,JSON.stringify(ui)); }catch(e){}
  try{ localStorage.setItem(KEY,JSON.stringify(doc)); }
  catch(e){ /* 그림이 커서 못 담으면 그림만 빼고 담는다 */ try{ const d=Object.assign({},doc,{base:doc.base&&doc.base.kind==='image'?null:doc.base}); localStorage.setItem(KEY,JSON.stringify(d)); if(!warnedBig){ warnedBig=true; toast('불러온 그림이 커서 다음에 열 때는 다시 불러와야 해요. ‘작업 저장’으로 파일에 남겨 두세요.'); } }catch(e2){} } },300); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2800); }
const selItem=()=>doc.items.find(it=>it.id===selId)||null;

/* ───────── 되돌리기 ───────── */
const undo=[], redo=[]; let last=snap();
function snap(){ const B=doc.base; return {j:JSON.stringify(Object.assign({},doc,{base:B?Object.assign({},B,{src:undefined}):null})),src:B&&B.src}; }
function restore(s){ const d=JSON.parse(s.j); if(d.base&&s.src) d.base.src=s.src; doc=LG.normalizeDoc(d); if(!doc.items.some(it=>it.id===selId)) selId=null; }
function commit(){ const s=snap(); if(s.j===last.j&&s.src===last.src) return; undo.push(last); if(undo.length>80) undo.shift(); redo.length=0; last=s; }
let settleT=0; function settle(){ clearTimeout(settleT); settleT=setTimeout(commit,450); }
function doUndo(){ commit(); if(!undo.length) return; redo.push(last); last=undo.pop(); restore(last); changed('all',true); }
function doRedo(){ if(!redo.length) return; undo.push(last); last=redo.pop(); restore(last); changed('all',true); }
function changed(what,noCommit){ saveLocal(); if(what==='all'){ renderGallery(); renderKice(); renderFeats(); renderOpts(); } else if(what==='opts') renderOpts(); if(!noCommit) settle(); schedule(); }
function schedule(){ if(raf) return; raf=requestAnimationFrame(()=>{ raf=0; draw(); }); }

/* ───────── 화면 ───────── */
let view={k:4,x:-5,y:-5}, fitted=false;
const g={bg:mk('rect',{fill:'#fff'}),img:mk('image',{preserveAspectRatio:'none'}),items:mk('g'),sel:mk('g')};
stage.append(g.bg,g.img,g.items,g.sel);
function mk(t,a){ const e=document.createElementNS(SVGNS,t); for(const [k,v] of Object.entries(a||{})) e.setAttribute(k,v); return e; }
let hrefKey=null;
function setView(){ const r=wrap.getBoundingClientRect(); const W=Math.max(50,r.width), H=Math.max(50,r.height); stage.setAttribute('viewBox',`${view.x} ${view.y} ${W/view.k} ${H/view.k}`); }
function fit(){ const r=wrap.getBoundingClientRect(); const pb=LG.pageBox(doc); const W=Math.max(50,r.width), H=Math.max(50,r.height);
  const k=Math.min((W-40)/Math.max(pb.w,10),(H-40)/Math.max(pb.h,10)); view.k=Math.max(0.5,Math.min(40,k)); view.x=pb.x-(W/view.k-pb.w)/2; view.y=pb.y-(H/view.k-pb.h)/2; fitted=true; setView(); }
function zoomAt(f,cx,cy){ const r=wrap.getBoundingClientRect(); const px=cx==null?r.width/2:cx-r.left, py=cy==null?r.height/2:cy-r.top;
  const mx=view.x+px/view.k, my=view.y+py/view.k; view.k=Math.max(0.5,Math.min(60,view.k*f)); view.x=mx-px/view.k; view.y=my-py/view.k; setView(); drawSel(); }
function draw(){
  const pb=LG.pageBox(doc); const B=doc.base;
  for(const [k,v] of Object.entries({x:pb.x,y:pb.y,width:pb.w,height:pb.h})) g.bg.setAttribute(k,v);
  g.bg.setAttribute('style','filter:drop-shadow(0 1px 3px rgba(0,0,0,.25))');
  const key=B?(B.kind==='lib'?'lib:'+B.id:'img:'+(B.src||'').length+':'+(B.src||'').slice(-40)):'';
  if(key!==hrefKey){ hrefKey=key; const href=LG.baseHref(doc); if(href){ g.img.setAttribute('href',href); g.img.style.display=''; } else { g.img.removeAttribute('href'); g.img.style.display='none'; } }
  if(B) for(const [k,v] of Object.entries({x:B.x,y:B.y,width:B.w,height:B.h})) g.img.setAttribute(k,v);
  g.items.innerHTML=doc.items.map(it=>`<g data-id="${GG.esc(it.id)}">${LG.itemSVG(doc,it)}</g>`).join('');
  drawSel();
  $('#deskEmpty').hidden=!!(B||doc.items.length);
  const dpi=ui.dpi; $('#sizeInfo').textContent=`${pb.w.toFixed(1)} × ${pb.h.toFixed(1)} mm · ${Math.round(pb.w/25.4*dpi)} × ${Math.round(pb.h/25.4*dpi)} px`;
  { const ib=$('#itemSendBtn'); if(ib) ib.hidden=!document.getElementById('hub-tab-item')||!doc.items.some(i=>i.t==='sym'||i.t==='leader'); }
  ['pngBtn','svgBtn','copyBtn'].forEach(id=>$('#'+id).disabled=!(B||doc.items.length));
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
wrap.addEventListener('pointerdown',e=>{
  if(e.button===1||(e.button===0&&e.altKey)){ startPan(e); return; } if(e.button!==0) return;
  wrap.focus({preventScroll:true}); const p=toMM(e); const tool=ui.tool; const tol=6/view.k;
  const hEl=e.target.closest&&e.target.closest('.h');
  if(hEl&&selItem()){ drag={mode:'handle',h:hEl.dataset.h,id:selId}; capture(e); return; }
  if(tool==='select'){ const it=LG.hit(doc,p.x,p.y,tol); if(it){ selId=it.id; drag={mode:'move',id:it.id,last:p,moved:false}; capture(e); renderOpts(); drawSel(); } else { if(selId){ selId=null; renderOpts(); drawSel(); } startPan(e); } return; }
  /* 새로 그리기 */
  let it=null; const S=LG.nextSym(doc);
  if(tool==='sym'){ it=LG.makeItem('sym',{x:p.x,y:p.y,text:LG.takeSym(doc),box:ui.box||'halo'}); doc.items.push(it); selId=it.id; changed('opts'); return; }
  if(tool==='text'){ it=LG.makeItem('text',{x:p.x,y:p.y,text:'글'}); doc.items.push(it); selId=it.id; changed('opts'); setTool('select'); setTimeout(()=>{ const t=$('#propText'); if(t){ t.focus(); t.select(); } },30); return; }
  if(tool==='leader') it=LG.makeItem('leader',{x:p.x,y:p.y,tx:p.x,ty:p.y,text:S,box:ui.box||'halo'});
  if(tool==='ell') it=LG.makeItem('ell',{cx:p.x,cy:p.y,rx:0.01,ry:0.01});
  if(tool==='arrow') it=LG.makeItem('arrow',{x1:p.x,y1:p.y,x2:p.x,y2:p.y});
  if(tool==='line') it=LG.makeItem('line',{x1:p.x,y1:p.y,x2:p.x,y2:p.y});
  if(tool==='rect') it=LG.makeItem('rect',{x:p.x,y:p.y,w:0,h:0});
  if(!it) return; doc.items.push(it); selId=it.id; drag={mode:'create',id:it.id,p0:p}; capture(e); schedule();
});
function capture(e){ try{ wrap.setPointerCapture(e.pointerId); }catch(err){} }
function startPan(e){ drag={mode:'pan',cx:e.clientX,cy:e.clientY,vx:view.x,vy:view.y}; wrap.classList.add('panning'); capture(e); }
wrap.addEventListener('pointermove',e=>{
  if(!drag) return; const p=toMM(e);
  if(drag.mode==='pan'){ view.x=drag.vx-(e.clientX-drag.cx)/view.k; view.y=drag.vy-(e.clientY-drag.cy)/view.k; setView(); return; }
  const it=doc.items.find(x=>x.id===drag.id); if(!it) return;
  if(drag.mode==='move'){ LG.moveItem(it,p.x-drag.last.x,p.y-drag.last.y); drag.last=p; drag.moved=true; }
  else if(drag.mode==='handle') LG.dragHandle(it,drag.h,p.x,p.y,e.shiftKey);
  else if(drag.mode==='create'){ const p0=drag.p0;
    if(it.t==='leader'){ it.x=p.x; it.y=p.y; }
    if(it.t==='ell'){ let rx=Math.abs(p.x-p0.x)/2, ry=Math.abs(p.y-p0.y)/2; if(e.shiftKey) rx=ry=Math.max(rx,ry); it.cx=(p.x+p0.x)/2; it.cy=(p.y+p0.y)/2; it.rx=rx; it.ry=ry; }
    if(it.t==='arrow'||it.t==='line') LG.dragHandle(it,'p2',p.x,p.y,e.shiftKey);
    if(it.t==='rect'){ it.w=p.x-p0.x; it.h=p.y-p0.y; } }
  schedule();
});
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
const TOOLKEY={v:'select',l:'leader',s:'sym',e:'ell',a:'arrow',i:'line',r:'rect',t:'text'};
const syncTool=bindSeg($('#toolSeg'),()=>ui.tool,v=>{ setTool(v); });
function setTool(v){ ui.tool=v; syncTool(); wrap.dataset.tool=v; saveLocal(); }
let clip=null;
ROOT.addEventListener('keydown',e=>{
  const tg=e.target; if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'||tg.isContentEditable)) return;
  if(!(wrap.contains(tg)||tg===wrap||tg===document.body||(tg.closest&&tg.closest('.lapp')))) return;
  const it=selItem(); const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?doRedo():doUndo(); return; }
  if(mod&&e.key.toLowerCase()==='y'){ e.preventDefault(); doRedo(); return; }
  if(mod&&e.key.toLowerCase()==='c'&&it){ clip=JSON.stringify(it); return; }
  if(mod&&e.key.toLowerCase()==='d'&&it){ e.preventDefault(); dup(it); return; }
  if((e.key==='Delete'||e.key==='Backspace')&&it){ e.preventDefault(); delItem(it); return; }
  if(e.key==='Escape'){ if(selId){ selId=null; renderOpts(); drawSel(); } setTool('select'); return; }
  if(it&&e.key.startsWith('Arrow')){ e.preventDefault(); const s=e.shiftKey?2:0.25; LG.moveItem(it,e.key==='ArrowLeft'?-s:e.key==='ArrowRight'?s:0,e.key==='ArrowUp'?-s:e.key==='ArrowDown'?s:0); changed(); return; }
  if(!mod&&!e.altKey&&TOOLKEY[e.key.toLowerCase()]){ setTool(TOOLKEY[e.key.toLowerCase()]); return; }
  if(!mod&&(e.key==='+'||e.key==='=')){ zoomAt(1.25); return; } if(!mod&&e.key==='-'){ zoomAt(0.8); return; } if(!mod&&e.key==='0'){ fit(); return; }
});
document.addEventListener('paste',e=>{
  if(!ROOT.contains(document.activeElement)&&document.activeElement!==document.body) return; if(ROOT.querySelector('.lapp').offsetParent===null) return;
  const tg=e.target; if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA')) return;
  const items=[...(e.clipboardData&&e.clipboardData.items||[])]; const img=items.find(x=>x.type.startsWith('image/'));
  if(img){ e.preventDefault(); openImage(img.getAsFile()); return; }
  if(clip){ e.preventDefault(); const it=JSON.parse(clip); it.id=GG.uid(); LG.moveItem(it,2,2); doc.items.push(it); selId=it.id; clip=JSON.stringify(it); changed('opts'); }
});
function dup(it){ const c=JSON.parse(JSON.stringify(it)); c.id=GG.uid(); LG.moveItem(c,2,2); doc.items.push(c); selId=c.id; changed('opts'); }
function delItem(it){ doc.items=doc.items.filter(x=>x!==it); if(selId===it.id) selId=null; changed('opts'); }

/* ───────── 공통 조각 ───────── */
function bindSeg(el,get,set){
  const sync=()=>el.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===String(get()))));
  el.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||!el.contains(b)) return; set(b.dataset.v); sync(); });
  sync(); return sync;
}
function seg(opts,get,set,rebuild){ const el=h('div',{class:'seg',role:'group'}); for(const [v,t] of opts) el.append(h('button',{type:'button','data-v':v},t)); bindSeg(el,get,v=>{ set(v); changed(rebuild); }); return el; }
function row(label,...ctl){ return h('div',{class:'row'},h('span',{class:'lab'},label),...ctl); }
function num(get,set,o){ o=o||{}; const el=h('input',{type:'number',min:o.min,max:o.max,step:o.step||'any',value:get()==null?'':+(+get()).toFixed(3),placeholder:o.ph||'','aria-label':o.aria||''});
  el.addEventListener('input',()=>{ const v=parseFloat(el.value); if(el.value===''&&o.empty){ set(null); changed(o.rebuild); return; } if(isFinite(v)&&(o.min==null||v>=o.min)&&(o.max==null||v<=o.max)){ set(v); changed(o.rebuild); } }); return el; }
function chk(label,get,set,rebuild){ const i=h('input',{type:'checkbox'}); i.checked=!!get(); i.addEventListener('change',()=>{ set(i.checked); changed(rebuild); }); return h('label',{class:'check'},i,label); }
function sel(opts,get,set,rebuild,aria){ const s=h('select',{'aria-label':aria||''}); for(const [v,t] of opts) s.append(h('option',{value:v},t)); s.value=String(get()); s.addEventListener('change',()=>{ set(s.value); changed(rebuild); }); return s; }
function sec(title,...kids){ return h('section',{class:'sec'},h('h2',{class:'sec-title'},title),...kids); }

/* ───────── 오른쪽: 설정 ───────── */
const BOX=[['halo','흰 테두리'],['none','없음'],['white','흰 상자'],['circle','원'],['wcircle','흰 원']];
const DASHES=[['dot','점선'],['dash','파선'],['fine','잔 파선'],['solid','실선']];
function renderOpts(){
  const P=$('#opts'); P.textContent=''; const it=selItem();
  if(it){ const s=sec(`고른 것: ${LG.ITEM_KO[it.t]}`); const p=h('div',{class:'props'});
    const lw=()=>row('선 굵기',num(()=>it.lw,v=>it.lw=v,{min:0.05,max:2,step:0.05,aria:'선 굵기(mm)',empty:true,ph:String(doc.style.lw)}),h('span',{class:'unit'},'mm (비우면 기본)'));
    if(['sym','leader','text'].includes(it.t)){
      const t=it.t==='text'?h('textarea',{id:'propText','aria-label':'글자'}):h('input',{type:'text',id:'propText','aria-label':'글자'}); t.value=it.text; t.addEventListener('input',()=>{ it.text=t.value; changed(); refreshHint(); });
      p.append(row('글자',t),row('크기',num(()=>it.size,v=>it.size=v,{min:4,max:40,step:0.5,aria:'글자 크기(pt)',empty:true,ph:String(doc.style.size)}),h('span',{class:'unit'},'pt (비우면 기본)')),
        row('글꼴',seg([['serif','명조'],['gothic','고딕']],()=>it.fam,v=>it.fam=v)),row('',chk('굵게',()=>it.bold,v=>it.bold=v)));
      if(it.t!=='text') p.append(row('바탕',sel(BOX,()=>it.box,v=>it.box=v,null,'기호 바탕')));
      if(it.t==='text') p.append(row('정렬',seg([['center','가운데'],['left','왼쪽']],()=>it.align,v=>it.align=v)),row('상자',seg([['none','없음'],['white','흰 바탕'],['frame','테두리']],()=>it.box,v=>it.box=v)));
      if(it.t==='leader') p.append(row('',chk('끝에 점',()=>it.dot,v=>it.dot=v)),lw());
      if(it.t!=='text'&&it.box&&(it.box==='circle'||it.box==='wcircle')) p.append(lw()); }
    if(it.t==='ell') p.append(row('선',sel(DASHES,()=>it.dash,v=>it.dash=v,null,'선 모양')),row('채움',seg([['none','없음'],['white','흰색']],()=>it.fill,v=>it.fill=v)),lw(),
      row('크기',num(()=>it.rx,v=>it.rx=v,{min:0.3,step:0.1,aria:'가로 반지름'}),h('span',{class:'unit'},'×'),num(()=>it.ry,v=>it.ry=v,{min:0.3,step:0.1,aria:'세로 반지름'}),h('span',{class:'unit'},'mm')));
    if(it.t==='arrow') p.append(row('머리',seg([['end','끝'],['both','양쪽'],['start','처음'],['none','없음']],()=>it.head,v=>it.head=v)),row('선',sel(DASHES.slice().reverse(),()=>it.dash,v=>it.dash=v,null,'선 모양')),lw(),
      row('휘기',num(()=>it.bend||0,v=>it.bend=v,{step:0.5,aria:'휘는 정도(mm)'}),h('span',{class:'unit'},'mm (가운데 손잡이로도)')));
    if(it.t==='line') p.append(row('선',sel(DASHES.slice().reverse(),()=>it.dash,v=>it.dash=v,null,'선 모양')),lw());
    if(it.t==='rect') p.append(row('채움',seg([['white','흰색'],['gray','회색'],['none','없음']],()=>it.fill,v=>it.fill=v)),row('테두리',seg([['none','없음'],['solid','실선'],['dash','파선']],()=>it.stroke,v=>it.stroke=v)),lw());
    if(it.t==='dot') p.append(row('크기',num(()=>it.r,v=>it.r=v,{min:0.1,max:5,step:0.05,aria:'점 반지름(mm)'}),h('span',{class:'unit'},'mm')));
    const btn=(t,fn,title)=>{ const b=h('button',{class:'btn small',type:'button',title:title||''},t); b.addEventListener('click',fn); return b; };
    p.append(h('div',{class:'btnrow'},btn('앞으로',()=>{ const i=doc.items.indexOf(it); if(i<doc.items.length-1){ doc.items.splice(i,1); doc.items.splice(i+1,0,it); changed(); } },'한 칸 앞으로'),
      btn('뒤로',()=>{ const i=doc.items.indexOf(it); if(i>0){ doc.items.splice(i,1); doc.items.splice(i-1,0,it); changed(); } },'한 칸 뒤로'),
      btn('복제',()=>dup(it),'Ctrl+D'),btn('지우기',()=>delItem(it),'Delete')));
    s.append(p); P.append(s); }
  else P.append(sec('고른 것',h('p',{class:'sub'},'‘고르기’ 도구로 기호나 선을 누르면 여기서 고쳐요. 끌어서 옮기고, 손잡이(동그라미)로 크기와 끝점을 바꿔요.')));
  /* 기호 순서 */
  const nx=h('input',{type:'text',class:'seqnext',value:LG.nextSym(doc),'aria-label':'다음 기호'});
  nx.addEventListener('change',()=>{ const S=LG.SEQS[doc.seq.set]; const i=S.indexOf(nx.value.trim()); if(i>=0){ doc.seq.next=i; changed(); } else nx.value=LG.nextSym(doc); });
  const rs=h('button',{class:'btn small',type:'button'},'처음부터'); rs.addEventListener('click',()=>{ doc.seq.next=0; changed('opts'); });
  P.append(sec('기호 차례',row('종류',sel(Object.entries(LG.SEQ_KO),()=>doc.seq.set,v=>{ doc.seq.set=v; },'opts','기호 종류')),doc.seq.set==='num'?h('p',{class:'sub seqwarn'},'숫자 기호는 답지 번호 ①~⑤와 헷갈릴 수 있어요. 시험지에는 A, B나 (가), (나)를 권해요.'):'',row('다음 기호',nx,rs),
    row('기호 바탕',sel(BOX,()=>ui.box||'halo',v=>{ ui.box=v; },null,'새 기호 바탕')),h('p',{class:'sub'},'‘기호’나 ‘지시선’ 도구로 누를 때마다 다음 기호가 차례로 들어가요.')));
  /* 기본 모양 */
  const fontOpts=fam=>GG.FONTS[fam].filter(f=>f.key!=='user').map(f=>[f.key,f.label+(f.web||GG.fontAvailable(f,fam)?'':' — 없음')]);
  P.append(sec('글자·선 기본값',row('글자 크기',num(()=>doc.style.size,v=>doc.style.size=v,{min:5,max:30,step:0.5,aria:'기본 글자 크기(pt)'}),h('span',{class:'unit'},'pt')),
    row('선 굵기',num(()=>doc.style.lw,v=>doc.style.lw=v,{min:0.05,max:1.5,step:0.05,aria:'기본 선 굵기(mm)'}),h('span',{class:'unit'},'mm')),
    row('명조',sel(fontOpts('serif'),()=>doc.style.serif,v=>{ doc.style.serif=v; LG.clearMetrics(); loadFonts(); },null,'명조 글꼴')),
    row('고딕',sel(fontOpts('gothic'),()=>doc.style.gothic,v=>{ doc.style.gothic=v; LG.clearMetrics(); loadFonts(); },null,'고딕 글꼴')),
    row('로마자',seg([['times','Times'],['same','명조와 같게']],()=>doc.style.latin==='times'?'times':'same',v=>{ doc.style.latin=v; LG.clearMetrics(); })),
    h('p',{class:'sub'},'시험지 글꼴(HY신명조 등)이 이 컴퓨터에 없으면 Noto Serif KR로 그려요.')));
  P.append(sec('그림 크기',row('',chk('바탕과 주기에 맞춰 저절로',()=>doc.page.auto,v=>{ if(!v){ const pb=LG.pageBox(doc); Object.assign(doc.page,{x:pb.x,y:pb.y,w:pb.w,h:pb.h}); } doc.page.auto=v; },'opts')),
    doc.page.auto?row('여백',num(()=>doc.page.margin,v=>doc.page.margin=v,{min:0,max:20,step:0.5,aria:'여백(mm)'}),h('span',{class:'unit'},'mm')):
      row('크기',num(()=>doc.page.w,v=>doc.page.w=v,{min:10,max:400,step:1,aria:'너비(mm)'}),h('span',{class:'unit'},'×'),num(()=>doc.page.h,v=>doc.page.h=v,{min:10,max:400,step:1,aria:'높이(mm)'}),h('span',{class:'unit'},'mm')),
    !doc.page.auto?row('왼쪽 위',num(()=>doc.page.x,v=>doc.page.x=v,{step:1,aria:'왼쪽(mm)'}),num(()=>doc.page.y,v=>doc.page.y=v,{step:1,aria:'위(mm)'}),h('span',{class:'unit'},'mm')):null));
  const hint=h('section',{class:'sec',id:'hintSec'}); P.append(hint); refreshHint();
  P.append(sec('단축키',h('p',{class:'sub'},'V 고르기 · L 지시선 · S 기호 · E 점선 원 · A 화살표 · I 선 · R 가림 상자 · T 글상자 · Delete 지우기 · Ctrl+D 복제 · Ctrl+Z 되돌리기 · 화살표 키로 조금씩 옮기기 · 휠로 확대 · 빈 곳을 끌면 화면 이동 · Esc 고르기로')));
}
function refreshHint(){
  const el=$('#hintSec'); if(!el) return; el.textContent=''; const H=LG.hintOf(doc); if(!H){ el.hidden=true; return; } el.hidden=false;
  const b=h('button',{class:'btn small copy',type:'button'},'단서 문구 복사'); b.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(H.sentence); toast('복사했어요.'); }catch(e){ toast('복사하지 못했어요. 글을 직접 골라 복사해 주세요.'); } });
  el.append(h('h2',{class:'sec-title'},'발문 단서 · 정답'),h('div',{class:'hint'},h('div',null,H.sentence),h('div',null,h('b',null,'정답: '),H.key),b));
}

/* ───────── 왼쪽: 기본 모식도·지형 ───────── */
let galDone=false;
function renderGallery(){
  const G=$('#gallery'); if(!HAS){ G.textContent=''; $('#libNote').textContent='기본 모식도 자료가 실려 있지 않아요. 그림을 불러와 쓰세요.'; return; }
  if(!galDone){ galDone=true; G.textContent='';
    for(const dg of LG.diagrams()){ const b=h('button',{type:'button',class:'gal','data-id':dg.id,title:dg.name},h('img',{alt:'',src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(dg.svg),loading:'lazy'}),h('span',null,dg.name));
      b.addEventListener('click',()=>{ const had=doc.items.length; if(had&&!confirmSwap()) return; const keep=doc.base&&doc.base.kind==='lib'?doc.base.w:120; doc.items=[]; doc.gen=null; doc.seq.next=0; LG.setLibBase(doc,dg.id,keep); selId=null; changed('all'); fit(); });
      G.append(b); }
    $('#libNote').textContent='직접 그린 모식도예요. 실제 지형을 단순하게 나타낸 것이라 기출 그림과는 모양이 달라요.'; }
  G.querySelectorAll('.gal').forEach(b=>b.setAttribute('aria-pressed',String(!!(doc.base&&doc.base.kind==='lib'&&doc.base.id===b.dataset.id))));
}
/* 기출 그림(평가원 문제지에서 잘라 낸 그림) */
let kDone=false;
function renderKice(){
  const sec=$('#kSec'); sec.hidden=!KHAS; if(!KHAS) return;
  const items=LG.kiceItems(); const G=$('#kGal');
  if(!kDone){ kDone=true;
    const groups=['all',...new Set(items.map(it=>it.group))]; const S=$('#kSeg'); S.textContent='';
    for(const g of groups) S.append(h('button',{type:'button','data-v':g},g==='all'?'전체':g));
    bindSeg(S,()=>ui.kgroup,v=>{ ui.kgroup=v; saveLocal(); filterKice(); });
    for(const it of items){ const b=h('button',{type:'button',class:'gal','data-id':it.id,'data-g':it.group,title:`${it.ex} ${it.q}번 · ${it.name}`},
        h('img',{alt:'',src:it.src,loading:'lazy'}),h('span',null,h('b',null,`${it.short} ${it.q}번`),it.name,it.anchors?h('span',{class:'anc'},' · 문장으로 기호 달기 됨'):null));
      b.addEventListener('click',()=>{ if(doc.items.length&&!confirmSwap()) return; doc.items=[]; doc.gen=null; doc.seq.next=0; LG.setKiceBase(doc,it); selId=null; changed('all'); fit(); });
      G.append(b); }
    filterKice(); }
  G.querySelectorAll('.gal').forEach(b=>b.setAttribute('aria-pressed',String(!!(doc.base&&doc.base.kid===b.dataset.id))));
  const B=doc.base; const cur=B&&B.kid?`지금 바탕: ${B.cite}. `:'';
  $('#kNote').textContent=cur+'한국교육과정평가원 문제지에서 잘라 낸 그림이에요(저작권: 한국교육과정평가원). 혼자 수업을 준비할 때만 쓰고, 이 그림이 든 파일·링크는 다른 사람과 나누지 마세요. 점선 원이 있는 판과 ‘기호 지운 판’은 문장이나 ‘지형 고르기’로 기호를 달 수 있어요.';
}
function filterKice(){ const g=ui.kgroup||'all'; $('#kGal').querySelectorAll('.gal').forEach(b=>{ b.hidden=!(g==='all'||b.dataset.g===g); }); }
function confirmSwap(){ return window.confirm?window.confirm('바탕을 바꾸면 지금 단 기호와 선이 지워져요. 바꿀까요?'):true; }
const syncMark=bindSeg($('#markSeg'),()=>ui.mark,v=>{ ui.mark=v; saveLocal(); });
function renderFeats(){
  const B=doc.base; const dg=LG.baseDiagram(doc); $('#featSec').hidden=!dg; $('#baseRow').hidden=!B; if(B) $('#baseW').value=+B.w.toFixed(1);
  if(!dg) return; const L=$('#featList'); L.textContent=''; const st=ui.feat[dg.id]=ui.feat[dg.id]||{};
  dg.anchors.forEach(a=>{ const s=st[a.key]=st[a.key]||{on:false,sym:''};
    const c=h('input',{type:'checkbox','aria-label':a.ko}); c.checked=!!s.on; c.addEventListener('change',()=>{ s.on=c.checked; saveLocal(); });
    const t=h('input',{type:'text',value:s.sym||'',placeholder:'자동','aria-label':`${a.ko} 기호`}); t.addEventListener('input',()=>{ s.sym=t.value.trim(); if(s.sym&&!s.on){ s.on=true; c.checked=true; } saveLocal(); });
    const go=h('button',{class:'btn small',type:'button',title:'이 지형 하나만 놓기'},'놓기'); go.addEventListener('click',()=>{ placeFeats([[a.key,s.sym||LG.nextSym(doc)]],false); });
    L.append(h('li',null,h('label',{class:'check'},c,a.ko),h('small',null,(a.alias||[]).slice(0,2).join(', ')),t,go)); });
  syncMark();
}
function placeFeats(pairs,replace){
  const dg=LG.baseDiagram(doc); if(!dg) return; if(!pairs.length){ toast('지형을 하나 이상 골라 주세요.'); return; }
  if(replace){ doc.items=doc.items.filter(it=>!it.gen); doc.seq.next=0; doc.gen=null; }
  const S=LG.SEQS[doc.seq.set]; const used=new Set(doc.items.filter(it=>it.text).map(it=>it.text));
  pairs=pairs.map(([k,s])=>{ if(!s){ do{ s=LG.takeSym(doc); }while(used.has(s)&&doc.seq.next<S.length); } else if(S.indexOf(s)>=doc.seq.next) doc.seq.next=S.indexOf(s)+1; used.add(s); return [k,s]; });
  const before=doc.items.length; LG.place(doc,pairs,{mark:ui.mark}); doc.items.slice(before).forEach(it=>it.gen=true);
  doc.gen={dg:dg.id,pairs:[...((doc.gen&&doc.gen.dg===dg.id&&!replace)?doc.gen.pairs:[]),...pairs]};
  selId=null; changed('all'); refreshHint();
}
$('#featAll').addEventListener('click',()=>{ const dg=LG.baseDiagram(doc); if(!dg) return; const st=ui.feat[dg.id]||{}; const on=dg.anchors.filter(a=>st[a.key]&&st[a.key].on);
  placeFeats(on.map(a=>[a.key,st[a.key].sym||'']),true); });
$('#featShuffle').addEventListener('click',()=>{ const dg=LG.baseDiagram(doc); if(!dg) return; const st=ui.feat[dg.id]||{}; const on=dg.anchors.filter(a=>st[a.key]&&st[a.key].on);
  const S=LG.SEQS[doc.seq.set]; const idx=on.map((_,i)=>i); for(let i=idx.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  placeFeats(on.map((a,i)=>[a.key,S[idx[i]]]),true); });
$('#featClear').addEventListener('click',()=>{ doc.items=[]; doc.gen=null; doc.seq.next=0; selId=null; changed('all'); });
$('#baseW').addEventListener('change',()=>{ const B=doc.base; const v=parseFloat($('#baseW').value); if(!B||!isFinite(v)||v<20) return; const k=v/B.w;
  /* 바탕을 키우면 주기도 같은 자리를 따라간다(글자 크기는 그대로) */
  for(const it of doc.items){ for(const [a,o] of [['x',B.x],['cx',B.x],['x1',B.x],['x2',B.x],['tx',B.x]]) if(GG.fin(it[a])) it[a]=o+(it[a]-o)*k; for(const [a,o] of [['y',B.y],['cy',B.y],['y1',B.y],['y2',B.y],['ty',B.y]]) if(GG.fin(it[a])) it[a]=o+(it[a]-o)*k;
    for(const a of ['rx','ry','w','h']) if(GG.fin(it[a])) it[a]*=k; }
  B.w=v; B.h=v*B.natH/B.natW; changed(); fit(); });
$('#baseDel').addEventListener('click',()=>{ doc.base=null; changed('all'); });

/* ───────── 문장으로 만들기 ───────── */
let undoAsk=null;
function askMsg(kind,text){ const m=$('#askMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }
function run(){
  const q=$('#q').value.trim(); if(!q){ $('#q').focus(); return; }
  let spec;
  if(KHAS&&/기출/.test(q)){
    spec=LG.parseKice(q);
    if(!spec.kice){ askMsg('err','어떤 기출 그림인지 찾지 못했어요. 지형 이름(권곡, 파묵칼레 …)이나 시험(예: 2024학년도 6월 4번)을 함께 적어 주세요.'); return; }
    if(!spec.dg||!spec.pairs.length){ const it=spec.kice; undoAsk=JSON.stringify(doc); doc.items=[]; doc.gen=null; doc.seq.next=0; LG.setKiceBase(doc,it); selId=null; changed('all'); fit();
      askMsg('ok',`${it.ex} ${it.q}번 · ${it.name}을(를) 바탕으로 열었어요. `+(it.anchors?'기호를 달 지형 이름을 함께 적으면 자동으로 놓아요(예: 권곡은 A).':'이 그림은 ‘지시선’ 도구(L)로 기호를 직접 놓아 주세요.')); $('#undoAsk').hidden=false; return; }
  } else {
    if(!HAS){ askMsg('err','기본 모식도 자료가 실려 있지 않아 문장으로 만들 수 없어요.'); return; }
    spec=LG.parseRequest(q);
    if(!spec.dg){ askMsg('err','어떤 지형 모식도인지 알아보지 못했어요. ‘빙하 지형’, ‘카르스트 지형’처럼 종류나 지형 이름(권곡, 돌리네 …)을 넣어 주세요.'+(KHAS?' 기출 그림을 쓰려면 문장에 ‘기출’을 넣어 주세요.':'')); return; }
    if(!spec.pairs.length){ askMsg('warn',`${spec.dg.name} 모식도를 열었어요. 기호를 달 지형 이름을 함께 적어 주세요(예: 권곡은 A, 호른은 B).`); undoAsk=JSON.stringify(doc); doc.items=[]; doc.gen=null; doc.seq.next=0; LG.setLibBase(doc,spec.dg.id,doc.base&&doc.base.kind==='lib'?doc.base.w:120); selId=null; changed('all'); fit(); $('#undoAsk').hidden=false; return; }
  }
  undoAsk=JSON.stringify(doc);
  if(spec.mark) ui.mark=spec.mark;
  const {doc:d,info}=LG.specToDoc(Object.assign({},spec,{mark:spec.mark||ui.mark}),doc);
  d.items.forEach(it=>it.gen=true); doc=d; selId=null;
  const st=ui.feat[spec.dg.id]={}; for(const [k,s] of spec.pairs) st[k]={on:true,sym:s};
  changed('all'); fit();
  const dg=spec.dg; const nm=k=>(dg.anchors.find(a=>a.key===k)||{}).ko||k;
  let t=`${dg.name} · ${info.placed.map(([k,s])=>`${s} ${nm(k)}`).join(', ')}.`;
  if(spec.missing.length) t+=` ${spec.missing.join(', ')}은(는) 이 그림에 없어 빠졌어요.`;
  askMsg(spec.missing.length?'warn':'ok',t); $('#undoAsk').hidden=false;
}
$('#goBtn').addEventListener('click',run);
$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); run(); } });
$('#undoAsk').addEventListener('click',()=>{ if(!undoAsk) return; doc=LG.normalizeDoc(JSON.parse(undoAsk)); undoAsk=null; $('#undoAsk').hidden=true; selId=null; changed('all'); fit(); askMsg('ok','문장으로 만들기 전으로 되돌렸어요.'); });
const KEX=['기출 2024학년도 6월 빙하 모식도 기호 지운 판에 권곡, 드럼린, 에스커, 호른을 (가)~(라)로 순서 섞어','기출 건조 지형 모식도 지운 판, 메사는 A, 버섯바위는 B, 선상지는 C, 플라야는 D','기출 파묵칼레'];
function renderExamples(){ const box=$('#exList'); box.textContent=''; const ex=[...((LG.data()&&LG.data().examples)||[]),...(KHAS?KEX:[])];
  ex.forEach(q=>{ const b=h('button',{class:'ex',type:'button'},q); b.addEventListener('click',()=>{ $('#q').value=q; run(); }); box.append(b); }); }

/* ───────── 그림 불러오기: 이미지·PDF 자르기 ───────── */
const dlg=$('#cropDlg'), ccv=$('#cropCv'), cview=$('#cropView'), csel=$('#cropSel');
let crop=null;   /* {kind:'pdf'|'img', pdf, page, scale, img, name, rect:{x,y,w,h} (캔버스 px)} */
function openDlg(){ if(dlg.showModal&&!dlg.open) dlg.showModal(); else dlg.setAttribute('open',''); }
function closeDlg(){ if(dlg.close) dlg.close(); else dlg.removeAttribute('open'); crop=null; }
dlg.addEventListener('close',()=>{ crop=null; });
function cropMsg(t){ $('#cropMsg').textContent=t||''; }
async function openImage(file){
  if(!file) return; const name=file.name||'붙여 넣은 그림'; const src=await new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(file); });
  let im; try{ im=await LG.loadImage(src); }catch(e){ toast('그림을 읽지 못했어요.'); return; }
  crop={kind:'img',img:im,src,name,type:file.type||'image/png',rect:null}; $('#cropPageLab').hidden=true; $('.crop-title').textContent=`그림 잘라 오기 · ${name}`;
  openDlg(); requestAnimationFrame(()=>{ const maxW=Math.min(cview.clientWidth-24,1000), maxH=Math.max(300,window.innerHeight*0.68); const s=Math.min(1,maxW/im.naturalWidth,maxH/im.naturalHeight);
    ccv.width=Math.round(im.naturalWidth*s); ccv.height=Math.round(im.naturalHeight*s); ccv.getContext('2d').drawImage(im,0,0,ccv.width,ccv.height); crop.scale=s; resetSel(); cropMsg(`${im.naturalWidth} × ${im.naturalHeight} px`); });
}
const PDFJS='lib/pdfjs/pdf.min.js', PDFW='lib/pdfjs/pdf.worker.min.js';
let pdfP=null;
function loadScript(u){ return new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=u; s.onload=ok; s.onerror=()=>{ s.remove(); no(new Error(u)); }; document.head.appendChild(s); }); }
function needPdf(){
  if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if(!pdfP) pdfP=(async()=>{
    const inl=document.getElementById('pdfjs-src');
    if(inl){ const s=document.createElement('script'); s.textContent=inl.textContent; document.head.appendChild(s); } else await loadScript(PDFJS);
    const lib=window.pdfjsLib; if(!lib) throw new Error('pdf.js');
    const wi=document.getElementById('pdfjs-worker');
    if(wi) lib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([wi.textContent],{type:'text/javascript'}));
    else { try{ const r=await fetch(PDFW); if(!r.ok) throw 0; lib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([await r.text()],{type:'text/javascript'})); }catch(e){ lib.GlobalWorkerOptions.workerSrc=PDFW; } }
    return lib; })().catch(e=>{ pdfP=null; throw e; });
  return pdfP;
}
/* 한글 CID 글꼴용 CMap: 단독 파일에는 필요한 것만 들어 있고, 아티팩트에서는 cdnjs에서 받는다 */
function cmapOpts(){ const el=document.getElementById('pdfjs-cmaps');
  if(el){ const M=JSON.parse(el.textContent); class F{ constructor(){ this.isCompressed=true; } async fetch({name}){ const b=M[name]; if(!b) throw new Error('CMap '+name); const bin=atob(b); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return {cMapData:u,compressionType:1}; } }
    return {CMapReaderFactory:F,cMapPacked:true}; }
  return {cMapUrl:PDFJS.replace('pdf.min.js','cmaps/'),cMapPacked:true}; }
async function openPdf(file){
  if(!file) return; let lib; toast('PDF를 여는 중…');
  try{ lib=await needPdf(); }catch(e){ toast('PDF 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); return; }
  /* isEvalSupported:false — PDF 글꼴을 그릴 때 eval(new Function)로 코드를 만들지 않게 한다.
     PDF.js 4.2.67 전 판(여기는 3.11.174)에서 조작된 PDF가 스크립트를 실행할 수 있던 문제(CVE-2024-4367)를 막는 공식 완화책 */
  let pdf; try{ pdf=await lib.getDocument(Object.assign({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false},cmapOpts())).promise; }catch(e){ toast('PDF를 열지 못했어요.'); return; }
  crop={kind:'pdf',pdf,name:file.name,page:1,rect:null}; const ps=$('#cropPage'); ps.textContent=''; for(let i=1;i<=pdf.numPages;i++) ps.append(h('option',{value:i},`${i}쪽`));
  ps.value='1'; $('#cropPageLab').hidden=false; $('.crop-title').textContent=`그림 잘라 오기 · ${file.name}`; openDlg(); await showPdfPage(1);
}
async function showPdfPage(n){
  if(!crop||crop.kind!=='pdf') return; const page=await crop.pdf.getPage(n); crop.page=n; crop.pg=page; const v1=page.getViewport({scale:1});
  const maxW=Math.min(Math.max(320,cview.clientWidth-24),1000); const s=maxW/v1.width; const vp=page.getViewport({scale:s}); crop.scale=s;
  ccv.width=Math.round(vp.width); ccv.height=Math.round(vp.height); const ctx=ccv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,ccv.width,ccv.height);
  await page.render({canvasContext:ctx,viewport:vp}).promise; resetSel(); cropMsg(`${n} / ${crop.pdf.numPages}쪽 · 그림 부분을 끌어서 고르세요.`);
}
$('#cropPage').addEventListener('change',()=>showPdfPage(+$('#cropPage').value));
function resetSel(){ if(crop) crop.rect=null; csel.hidden=true; $('#cropOk').disabled=true; }
let cdrag=null;
cview.addEventListener('pointerdown',e=>{ if(!crop||e.button!==0) return; const r=ccv.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) return;
  cdrag={x0:e.clientX-r.left,y0:e.clientY-r.top}; try{ cview.setPointerCapture(e.pointerId); }catch(err){} e.preventDefault(); });
cview.addEventListener('pointermove',e=>{ if(!cdrag) return; const r=ccv.getBoundingClientRect(); const x=Math.max(0,Math.min(r.width,e.clientX-r.left)), y=Math.max(0,Math.min(r.height,e.clientY-r.top));
  const k=ccv.width/r.width; crop.rect={x:Math.min(x,cdrag.x0)*k,y:Math.min(y,cdrag.y0)*k,w:Math.abs(x-cdrag.x0)*k,h:Math.abs(y-cdrag.y0)*k};
  const vr=cview.getBoundingClientRect(); Object.assign(csel.style,{left:(r.left-vr.left+cview.scrollLeft+Math.min(x,cdrag.x0))+'px',top:(r.top-vr.top+cview.scrollTop+Math.min(y,cdrag.y0))+'px',width:Math.abs(x-cdrag.x0)+'px',height:Math.abs(y-cdrag.y0)+'px'}); csel.hidden=false; });
cview.addEventListener('pointerup',()=>{ if(!cdrag) return; cdrag=null; const ok=crop&&crop.rect&&crop.rect.w>8&&crop.rect.h>8; $('#cropOk').disabled=!ok; if(!ok) resetSel(); });
async function useCrop(all){
  if(!crop) return; const c=crop; const R=all?{x:0,y:0,w:ccv.width,h:ccv.height}:c.rect; if(!R) return;
  let src, natW, natH, mmW;
  if(c.kind==='pdf'){ /* 고른 부분을 300dpi로 다시 그린다(종이 위 실제 크기 유지) */
    const hi=Math.min(300/72,Math.sqrt(24e6/((R.w/c.scale)*(R.h/c.scale)))); const f=hi/c.scale;
    const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(R.w*f)); cv.height=Math.max(1,Math.round(R.h*f)); const ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height);
    const vp=c.pg.getViewport({scale:hi,offsetX:-R.x*f,offsetY:-R.y*f}); await c.pg.render({canvasContext:ctx,viewport:vp}).promise;
    src=cv.toDataURL('image/png'); natW=cv.width; natH=cv.height; mmW=R.w/c.scale*25.4/72; }
  else { const f=1/c.scale; const sx=R.x*f, sy=R.y*f, sw=R.w*f, sh=R.h*f;
    if(all&&/svg/.test(c.type)){ src=c.src; natW=c.img.naturalWidth; natH=c.img.naturalHeight; }
    else { const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(sw)); cv.height=Math.max(1,Math.round(sh)); const ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height); ctx.drawImage(c.img,sx,sy,sw,sh,0,0,cv.width,cv.height);
      src=cv.width*cv.height>4e6&&/jpe?g/.test(c.type)?cv.toDataURL('image/jpeg',0.92):cv.toDataURL('image/png'); natW=cv.width; natH=cv.height; }
    mmW=Math.min(150,Math.max(50,natW*25.4/200)); }
  closeDlg(); if(doc.items.length&&!confirmSwap()) return;
  doc.items=[]; doc.gen=null; doc.seq.next=0; LG.setImageBase(doc,src,natW,natH,c.name,Math.round(mmW*10)/10); selId=null; changed('all'); fit();
  toast(c.kind==='pdf'?`잘라 온 그림을 시험지 크기(${doc.base.w.toFixed(1)} mm) 그대로 바탕으로 썼어요.`:'그림을 바탕으로 썼어요.');
}
$('#cropOk').addEventListener('click',()=>useCrop(false));
$('#cropAll').addEventListener('click',()=>useCrop(true));
$('#imgFile').addEventListener('change',e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; openImage(f); });
$('#pdfFile').addEventListener('change',e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; openPdf(f); });

/* ───────── 내보내기 · 작업 파일 ───────── */
const syncDpi=bindSeg($('#dpiSeg'),()=>String(ui.dpi),v=>{ ui.dpi=+v; saveLocal(); draw(); });
function stamp(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
async function loadFonts(){ if(!document.fonts||!document.fonts.load) return; const jobs=[]; const txt=doc.items.map(it=>it.text||'').join('')+'ABC(가)㉠';
  for(const fam of ['serif','gothic']) if(GG.needsWeb({style:doc.style},fam)) jobs.push(document.fonts.load(`16px "${fam==='serif'?'Noto Serif KR':'Noto Sans KR'}"`,txt).catch(()=>{}));
  await Promise.all(jobs); LG.clearMetrics(); schedule(); }
async function exportPng(){ await loadFonts(); return LG.renderPng(doc,ui.dpi); }
const nameOf=()=>`지형모식도${doc.base&&doc.base.kind==='lib'?'_'+(LG.diagram(doc.base.id)||{}).name:''}_${stamp()}`.replace(/[\\/:*?"<>|()\s]+/g,'_').replace(/_+/g,'_');
$('#pngBtn').addEventListener('click',async()=>{ try{ const b=await exportPng(); const r=await GG.saveFile(nameOf()+'.png',b,'image/png'); toast(r==='saved'?'PNG로 저장했어요.':'저장하지 못했어요.'); }catch(e){ toast('PNG를 만들지 못했어요.'); } });
$('#svgBtn').addEventListener('click',async()=>{ await loadFonts(); const r=await GG.saveFile(nameOf()+'.svg',LG.svgString(doc,{inline:true}),'image/svg+xml'); toast(r==='saved'?'SVG로 저장했어요.':'저장하지 못했어요.'); });
$('#copyBtn').addEventListener('click',async()=>{ try{ await navigator.clipboard.write([new ClipboardItem({'image/png':exportPng()})]); toast('그림을 복사했어요. 한글·워드에 붙여 넣으세요.'); }catch(e){ toast('이 브라우저에서는 복사가 막혀 있어요. PNG로 저장해 주세요.'); } });
$('#zIn').addEventListener('click',()=>zoomAt(1.25)); $('#zOut').addEventListener('click',()=>zoomAt(0.8)); $('#zFit').addEventListener('click',fit);
$('#saveJson').addEventListener('click',async()=>{ commit(); const r=await GG.saveFile(`지형모식도_작업_${stamp()}.json`,JSON.stringify(doc),'application/json'); toast(r==='saved'?'작업을 저장했어요.':'저장하지 못했어요.'); });
function loadDoc(d,msg){ doc=LG.normalizeDoc(d); selId=null; commit(); changed('all'); fit(); loadFonts(); if(msg) toast(msg); }
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return; try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='landform') throw 0; loadDoc(d,'작업을 불러왔어요.'); }catch(err){ toast('지형 모식도 작업 파일이 아니에요.'); } });
$('#resetBtn').addEventListener('click',()=>{ commit(); doc=LG.freshDoc(); if(HAS) LG.setLibBase(doc,LG.diagrams()[0].id,120); selId=null; changed('all'); fit(); toast('새 작업을 시작했어요. 되돌리려면 Ctrl+Z.'); });

/* ───────── 시작 ───────── */
renderExamples(); setTool(ui.tool); changed('all',true); requestAnimationFrame(()=>{ fit(); draw(); }); loadFonts();
if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ LG.clearMetrics(); schedule(); });
if(OPT&&OPT.doc) loadDoc(OPT.doc,OPT.msg);
return {load:d=>{ if(!d||d.app!=='landform') return false; loadDoc(d,'작업을 불러왔어요.'); return true; },getDoc:()=>doc};
});