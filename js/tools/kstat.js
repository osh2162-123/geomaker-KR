/* 한국 통계 지도: 한국지리 백지도와 같은 바탕 엔진(KM) 위에 통계값을 칠하는 도구(K1.5 뼈대: 바탕 지도 + 저장·불러오기).
   한국지리 백지도(kmap)의 코드·저장 형식은 건드리지 않는다. 작업 파일은 app:"kstat", 자동 저장은 localStorage wgkstat-editor-v1 */
HUB.def('kstat',function(ROOT){
'use strict';
const KEY='wgkstat-editor-v1';
const $=s=>ROOT.querySelector(s);
const stage=$('#ksStage');
const HAS=!!KM.data();

/* ───────── 상태 ───────── */
function freshDoc(){ return {app:'kstat',ver:1,map:KM.freshMap()}; }
function norm(d){ if(!d||d.app!=='kstat') return freshDoc(); return {app:'kstat',ver:1,map:KM.normalizeMap(d.map)}; }
function loadLocal(){ try{ const s=localStorage.getItem(KEY); return s?norm(JSON.parse(s)):null; }catch(e){ return null; } }
let doc=loadLocal()||freshDoc(), saveT=0, svg='';
function saveLocal(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem(KEY,JSON.stringify(doc)); }catch(e){} },300); }
function toast(msg){ const t=$('#ksToast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2800); }

/* ───────── 그리기 ───────── */
function draw(){
  const r=HAS?KM.render(doc.map):null;
  $('#ksEmpty').hidden=!!r;
  stage.querySelectorAll('svg').forEach(e=>e.remove());
  svg=''; $('#ksSize').textContent='';
  ['svgBtn','pngBtn'].forEach(id=>{ const b=$('#'+id); if(b) b.disabled=!r; });
  if(!r) return;
  svg=r.svg; stage.insertAdjacentHTML('afterbegin',svg);
  $('#ksSize').textContent=`${r.w.toFixed(1)} × ${r.h.toFixed(1)} mm`;
}
function changed(){ saveLocal(); draw(); }

/* ───────── 설정 칸 ───────── */
function fillArea(){
  const sel=$('#ksArea'); sel.textContent='';
  for(const R of KM.REGIONS){ const o=document.createElement('option'); o.value=R.id; o.textContent=R.ko; sel.append(o); }
}
function syncForm(){
  $('#ksArea').value=KM.REGIONS.some(R=>R.id===doc.map.area)?doc.map.area:'sk';
  $('#ksLevel').value=doc.map.level==='sgg'?'sgg':'sido';
  $('#ksScale').checked=!!doc.map.scale;
}
$('#ksArea').addEventListener('change',e=>{ doc.map.area=e.target.value; doc.map.sido=[]; changed(); });
$('#ksLevel').addEventListener('change',e=>{ doc.map.level=e.target.value; changed(); });
$('#ksScale').addEventListener('change',e=>{ doc.map.scale=e.target.checked; changed(); });

/* ───────── 내보내기 · 작업 파일 ───────── */
function stamp(){ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; }
const nameOf=()=>`한국통계지도_${KM.areaLabel(doc.map)}_${stamp()}`.replace(/[\\/:*?"<>|()\s·]+/g,'_').replace(/_+/g,'_');
function pngBlob(dpi){
  return new Promise((ok,no)=>{
    const m=/width="([\d.]+)mm" height="([\d.]+)mm"/.exec(svg); if(!m){ no(new Error('size')); return; }
    const w=Math.round(+m[1]/25.4*dpi), hh=Math.round(+m[2]/25.4*dpi);
    const img=new Image();
    img.onload=()=>{ const c=document.createElement('canvas'); c.width=w; c.height=hh; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,w,hh); x.drawImage(img,0,0,w,hh); c.toBlob(b=>b?ok(b):no(new Error('png')),'image/png'); };
    img.onerror=()=>no(new Error('img'));
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
}
$('#pngBtn').addEventListener('click',async()=>{ try{ const b=await pngBlob(600); const r=await GG.saveFile(nameOf()+'.png',b,'image/png'); toast(r==='saved'?'PNG로 저장했어요.':'저장하지 못했어요.'); }catch(e){ toast('PNG를 만들지 못했어요.'); } });
$('#svgBtn').addEventListener('click',async()=>{ const r=await GG.saveFile(nameOf()+'.svg',svg,'image/svg+xml'); toast(r==='saved'?'SVG로 저장했어요.':'저장하지 못했어요.'); });
$('#saveJson').addEventListener('click',async()=>{ const r=await GG.saveFile(`한국통계지도_작업_${stamp()}.json`,JSON.stringify(doc),'application/json'); toast(r==='saved'?'작업을 저장했어요.':'저장하지 못했어요.'); });
function loadDoc(d,msg){ doc=norm(d); syncForm(); changed(); if(msg) toast(msg); }
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='kstat') throw 0; loadDoc(d,'작업을 불러왔어요.'); }catch(err){ toast('한국 통계 지도 작업 파일이 아니에요.'); } });
$('#resetBtn').addEventListener('click',()=>{ doc=freshDoc(); syncForm(); changed(); toast('새 지도를 시작했어요.'); });

/* ───────── 시작 ───────── */
fillArea(); syncForm(); draw();
return {load:d=>{ if(!d||d.app!=='kstat') return false; loadDoc(d,'작업을 불러왔어요.'); return true; },getDoc:()=>doc};
});
