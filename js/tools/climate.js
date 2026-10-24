/* 기후 그래프 편집기: 지점 목록 · 붙여넣기 · 설정 패널 · 미리 보기 */
HUB.def('climate',function(ROOT){
'use strict';
const KEY='wgclim-editor-v1';
const $=s=>ROOT.querySelector(s);
const eun=w=>{ const t=String(w).trim(); const c=t.charCodeAt(t.length-1)-0xAC00; return t+(c>=0&&c<11172?(c%28?'은':'는'):'은(는)'); };
function h(tag,attrs,...kids){
  const e=document.createElement(tag);
  if(attrs) for(const [k,v] of Object.entries(attrs)){
    if(v==null||v===false) continue;
    if(k==='class') e.className=v; else if(k.startsWith('on')) e.addEventListener(k.slice(2),v); else if(v===true) e.setAttribute(k,''); else e.setAttribute(k,String(v));
  }
  for(const c of kids.flat()) if(c!=null&&c!==false) e.append(c.nodeType?c:document.createTextNode(String(c)));
  return e;
}
const cv=$('#cv');
/* 처음 연 사람에게 보여 줄 예시: JMA ClimatView 지점 페이지의 평년값(1991~2020) 그대로 */
const EXAMPLE={name:'아랄해 연안(예시)',en:'ARAL TENIZI',country:'KAZAKHSTAN',lat:46.78,lon:61.65,elev:62,
  t:[-10.6,-9.4,0.1,11.9,19.8,25.7,27.7,25.7,18.2,9.3,-0.4,-7.8],p:[11.7,10.1,17.2,15.1,12.8,8.8,7.4,6.1,3.7,12.0,13.8,13.3],
  src:'JMA ClimatView',period:'1991~2020년 평년값'};
function exampleDoc(){
  if(GG.stationList().length){ const r=GG.parseRequest('싱가포르, 리스본, 모스크바, 다윈 기후 그래프',[]); if(r.understood&&!r.unknown.length){ const d=GG.specToDoc(r.spec,GG.freshDoc('climo')).doc; d.climo.cols=4; return d; } }
  const d=GG.freshDoc('climo'); GG.addStation(d,EXAMPLE); d.climo.cols=1; return d; }
let doc=loadLocal()||exampleDoc();
let dpi=600, raf=0;
const openIds=new Set();
let axisRefresh=[];

function loadLocal(){ try{ const s=localStorage.getItem(KEY); return s?GG.normalizeDoc(JSON.parse(s)):null; }catch(e){ return null; } }
function saveLocal(){ try{ localStorage.setItem(KEY,JSON.stringify(doc)); }catch(e){} }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2600); }
const autoLbl=()=>doc.autoLbl!==false;
function changed(what){
  saveLocal();
  if(what==='all'){ renderStations(); renderOpts(); }
  else if(what==='opts') renderOpts();
  else if(what==='st') renderStations();
  schedule();
}
function schedule(){ if(raf) return; raf=requestAnimationFrame(()=>{ raf=0; draw(); }); }

/* ───────── 공통 조각 ───────── */
function bindSeg(el,get,set){
  const sync=()=>el.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===String(get()))));
  el.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b||!el.contains(b)) return; set(b.dataset.v); sync(); });
  sync(); return sync;
}
function seg(opts,get,set,rebuild){ const el=h('div',{class:'seg',role:'group'}); for(const [v,t] of opts) el.append(h('button',{type:'button','data-v':v},t)); bindSeg(el,get,v=>{ set(v); changed(rebuild); }); return el; }
function row(label,...ctl){ return h('div',{class:'row'},h('span',{class:'lab'},label),...ctl); }
function num(get,set,o){ o=o||{}; const el=h('input',{type:'number',min:o.min,max:o.max,step:o.step||'any',value:get(),'aria-label':o.aria||''});
  el.addEventListener('input',()=>{ const v=parseFloat(el.value); if(isFinite(v)&&(o.min==null||v>=o.min)){ set(v); changed(); } }); return el; }
function chk(label,get,set,rebuild){ const i=h('input',{type:'checkbox'}); i.checked=!!get(); i.addEventListener('change',()=>{ set(i.checked); changed(rebuild); }); return h('label',{class:'check'},i,label); }
function sel(opts,get,set,rebuild,aria){ const s=h('select',{'aria-label':aria||''}); for(const [v,t] of opts) s.append(h('option',{value:v},t)); s.value=String(get()); s.addEventListener('change',()=>{ set(s.value); changed(rebuild); }); return s; }
function txt(get,set,ph,aria){ const i=h('input',{type:'text',value:get()||'',placeholder:ph||'','aria-label':aria||ph||''}); i.addEventListener('input',()=>{ set(i.value); changed(); }); return i; }
function range(get,set,min,max,step,fmt){ const v=h('span',{class:'val'},fmt(get())); const i=h('input',{type:'range',min,max,step,value:get()}); i.addEventListener('input',()=>{ set(+i.value); v.textContent=fmt(+i.value); changed(); }); return [i,v]; }
function metricSelect(get,set,aria){
  const s=h('select',{'aria-label':aria||'지표'});
  for(const g of GG.METRIC_GROUPS){ const og=h('optgroup',{label:g}); for(const m of Object.values(GG.METRICS)) if(m.grp===g) og.append(h('option',{value:m.key},m.name)); s.append(og); }
  s.value=get(); s.addEventListener('change',()=>{ set(s.value); changed('opts'); }); return s;
}
const MODES=[['value','값 그대로'],['mean','지점 평균과의 차이'],['ref','기준 지점과의 차이']];
function axisHead(){ return h('div',{class:'axis-head'},h('span'),h('span'),h('span',null,'최솟값'),h('span',null,'최댓값'),h('span',null,'눈금 간격')); }
function axisCtl(label,conf,key,noLo){
  const auto=h('input',{type:'checkbox'}); auto.checked=conf.auto!==false;
  const lo=h('input',{type:'number',step:'any','aria-label':label+' 최솟값'}), hi=h('input',{type:'number',step:'any','aria-label':label+' 최댓값'}), st=h('input',{type:'number',step:'any',min:0,'aria-label':label+' 눈금 간격'});
  const fill=()=>{ const a=conf.auto!==false?(GG.lastAxes()[key]||conf):conf; lo.value=noLo?0:+(+a.lo).toFixed(3); hi.value=+(+a.hi).toFixed(3); st.value=+(+a.step).toFixed(3);
    lo.disabled=noLo||conf.auto!==false; hi.disabled=st.disabled=conf.auto!==false; };
  auto.addEventListener('change',()=>{ if(!auto.checked){ const a=GG.lastAxes()[key]; if(a){ conf.lo=a.lo; conf.hi=a.hi; conf.step=a.step; } } conf.auto=auto.checked; fill(); changed(); });
  const on=(el,k)=>el.addEventListener('input',()=>{ const v=parseFloat(el.value); if(isFinite(v)){ conf[k]=v; changed(); } });
  on(lo,'lo'); on(hi,'hi'); on(st,'step');
  axisRefresh.push(fill); fill();
  return h('div',{class:'axis'},h('span',{class:'lab'},label),h('label',{class:'check'},auto,'자동'),lo,hi,st);
}
function sizeRow(o,label){
  return row(label||'그래프 칸',num(()=>o.pw,v=>o.pw=v,{min:8,max:180,step:1,aria:'가로(mm)'}),h('span',{class:'unit'},'×'),num(()=>o.ph,v=>o.ph=v,{min:8,max:180,step:1,aria:'세로(mm)'}),h('span',{class:'unit'},'mm'));
}

/* ───────── 지점 목록 ───────── */
const deg=()=>doc.style.deg;
function summary(s){
  const tY=GG.metricOf(s,'tY'), tR=GG.metricOf(s,'tR'), pY=GG.metricOf(s,'pY'); const a=[];
  if(GG.fin(tY)) a.push(`연평균 ${GG.fmt(tY,1)}${deg()}`); if(GG.fin(tR)) a.push(`연교차 ${GG.fmt(tR,1)}${deg()}`); if(GG.fin(pY)) a.push(`연 강수량 ${Math.round(pY).toLocaleString('ko-KR')}mm`);
  if(!a.length) a.push('월별 값을 채워 주세요');
  const b=[]; if(s.en&&s.en!==s.name) b.push(s.en+(s.country?`, ${s.country}`:''));
  if(GG.fin(s.lat)&&GG.fin(s.lon)) b.push(`${Math.abs(s.lat).toFixed(2)}°${s.lat<0?'S':'N'} ${Math.abs(s.lon).toFixed(2)}°${s.lon<0?'W':'E'}`);
  if(GG.fin(s.elev)) b.push(`${s.elev} m`);
  return [a.join(' · '),b.join(' · ')];
}
function relabelIfAuto(){ if(autoLbl()) GG.relabel(doc); }
function renderStations(){
  const list=$('#stList'); list.textContent='';
  $('#stEmpty').hidden=doc.stations.length>0; list.hidden=!doc.stations.length;
  syncMapSend();
  doc.stations.forEach((s,i)=>{
    const li=h('li',{class:'st'+(s.ref?' is-ref':'')});
    const lbl=h('input',{class:'lbl',value:s.ref?(s.refLbl||''):s.lbl,placeholder:s.ref?'기준':'','aria-label':s.ref?`${s.name} 주석 표기(예: (가))`:`${s.name} 라벨`,title:s.ref?'주석에 지점 이름 대신 쓸 기호. 예: (가) → ‘(가)의 월평균 기온’. 비우면 지점 이름':''});
    lbl.addEventListener('input',()=>{ if(s.ref) s.refLbl=lbl.value.slice(0,8); else { s.lbl=lbl.value; doc.autoLbl=false; } changed(); });
    const name=h('input',{class:'name',value:s.name,'aria-label':'지점 이름'});
    const [l1,l2]=summary(s); const sm1=h('small',null,l1), sm2=h('small',null,l2);
    name.addEventListener('input',()=>{ s.name=name.value; if(doc.seq==='name'&&!s.ref){ s.lbl=s.name; lbl.value=s.name; } changed(); });
    const ref=h('button',{class:'refbtn',type:'button','aria-pressed':String(s.ref),title:'차이를 계산할 때 기준이 되는 지점(그래프에는 그리지 않아요)'},'기준');
    ref.addEventListener('click',()=>{ const on=!s.ref; doc.stations.forEach(o=>o.ref=false); s.ref=on; relabelIfAuto(); changed('all'); });
    const mv=d=>{ const j=i+d; if(j<0||j>=doc.stations.length) return; const a=doc.stations; [a[i],a[j]]=[a[j],a[i]]; relabelIfAuto(); changed('all'); };
    const up=h('button',{class:'ico',type:'button','aria-label':'위로',title:'위로',disabled:i===0},'↑'); up.addEventListener('click',()=>mv(-1));
    const dn=h('button',{class:'ico',type:'button','aria-label':'아래로',title:'아래로',disabled:i===doc.stations.length-1},'↓'); dn.addEventListener('click',()=>mv(1));
    const x=h('button',{class:'ico x',type:'button','aria-label':`${s.name} 지우기`,title:'지우기'},'×'); x.addEventListener('click',()=>{ doc.stations.splice(i,1); delete doc.line.sty[s.id]; relabelIfAuto(); changed('all'); toast(`${s.name}을(를) 지웠어요.`); });
    li.append(h('div',{class:'st-row'},lbl,name,h('div',{class:'st-tools'},ref,up,dn,x),h('div',{class:'st-sum'},sm1,l2?sm2:null)));
    /* 월별 값 */
    const det=h('details',null,h('summary',null,'월별 값 보기·고치기')); det.open=openIds.has(s.id);
    det.addEventListener('toggle',()=>{ if(det.open) openIds.add(s.id); else openIds.delete(s.id); });
    const tb=h('table',{class:'mtab'}); tb.append(h('thead',null,h('tr',null,h('th',null,'월'),h('th',null,`기온(${deg()})`),h('th',null,'강수량(mm)'))));
    const body=h('tbody');
    for(let m=0;m<12;m++){
      const mk=(arr,lim)=>{ const v=arr[m]; const inp=h('input',{type:'text',inputmode:'decimal',value:GG.fin(v)?String(v):'','aria-label':`${m+1}월`});
        inp.addEventListener('input',()=>{ const t=inp.value.trim().replace(/[−–]/g,'-'); const n=t===''?NaN:+t; const bad=t!==''&&(!isFinite(n)||n<lim[0]||n>lim[1]); inp.classList.toggle('bad',bad||t==='');
          arr[m]=bad?NaN:n; const [a,b]=summary(s); sm1.textContent=a; sm2.textContent=b; changed(); });
        if(!GG.fin(v)) inp.classList.add('bad'); return inp; };
      body.append(h('tr',null,h('th',null,`${m+1}월`),h('td',null,mk(s.t,[-70,50])),h('td',null,mk(s.p,[0,3500]))));
    }
    tb.append(body); det.append(tb);
    if(s.src||s.period) det.append(h('p',{class:'sub',style:'margin-top:6px'},[s.src,s.period].filter(Boolean).join(' · ')));
    li.append(det); list.append(li);
  });
}

/* ───────── 붙여넣기 ───────── */
function showMsg(kind,text){ const m=$('#pasteMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }
$('#addBtn').addEventListener('click',()=>{
  const r=GG.parseClimate($('#paste').value);
  if(!r.stations.length){ showMsg('err',r.errors[0]||'표를 알아보지 못했어요.'); return; }
  const nm=$('#pName').value.trim(); const added=[];
  r.stations.forEach(st=>{ if(nm&&r.stations.length===1) st.name=nm; const s=GG.addStation(doc,st); added.push({s,st}); });
  relabelIfAuto();
  const one=added[0];
  let text;
  if(added.length===1){ const st=one.st; const where=[st.en,st.country].filter(Boolean).join(', ');
    text=`${one.s.name}을(를) 추가했어요${where&&where!==one.s.name?` (${where})`:''}. ${st.period?st.period+'을 담았고, ':''}${st.checked?`두 번 나오는 ${st.checked}개 달의 값이 모두 일치해요.`:'값을 확인해 주세요.'}`; }
  else text=`지점 ${added.length}곳을 추가했어요: ${added.map(a=>a.s.name).join(', ')}.`;
  if(r.errors.length) text+=' 다만 '+r.errors.join(' ');
  showMsg(r.errors.length?'warn':'ok',text);
  $('#paste').value=''; $('#pName').value='';
  if(!nm&&added.length===1&&/^[A-Z0-9 .'\/()-]+$/.test(one.s.name)) setTimeout(()=>{ const inp=[...ROOT.querySelectorAll('.st .name')].pop(); if(inp){ inp.focus(); inp.select(); } },0);
  changed('all');
});
$('#blankBtn').addEventListener('click',()=>{ const s=GG.addStation(doc,{name:`지점 ${doc.stations.length+1}`,t:[],p:[],src:'직접 입력'}); relabelIfAuto(); openIds.add(s.id); changed('all'); showMsg('ok','빈 지점을 만들었어요. ‘월별 값 보기·고치기’를 열어 기온과 강수량을 넣어 주세요.'); });

/* ───────── 문장으로 만들기 ───────── */
const sampleCap=(window.claude&&typeof window.claude.use==='function')?window.claude.use('sample').catch(()=>null):Promise.resolve(null);
const KIND_KO={climo:'기후 그래프',line:'월별 그래프',cat:'지역별 막대·점',sc:'산점도',rd:'방사형 그래프',tb:'표'};
let undoDoc=null;
function askMsg(kind,text){ const m=$('#askMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }
function cleanSpec(o){
  if(!o||typeof o!=='object') return null;
  const kinds=GG.KINDS;
  const st=Array.isArray(o.stations)?o.stations.map(x=>typeof x==='string'?{name:x,lbl:null}:{name:String(x&&x.name||''),lbl:x&&x.lbl?String(x.lbl):null}).filter(x=>x.name):[];
  return {kind:kinds.includes(o.kind)?o.kind:'climo',seq:['gana','latin','circ','name'].includes(o.seq)?o.seq:'gana',mode:['value','mean','ref'].includes(o.mode)?o.mode:'value',
    stations:st,ref:o.ref?String(o.ref):null,metrics:(Array.isArray(o.metrics)?o.metrics:[]).filter(k=>GG.METRICS[k]).slice(0,3),hide:!!o.hide,aliasSeq:['(가)','(나)','(다)'],
    months:o.months==='17'?'17':'all',v:GG.LINE_V[o.v]?o.v:'t',start:Number.isInteger(o.start)&&o.start>=0&&o.start<12?o.start:0,brk:!!o.brk,lmark:['line','bar','panel'].includes(o.lmark)?o.lmark:null,rows:['st','m'].includes(o.rows)?o.rows:null,layout:['panels','group'].includes(o.layout)?o.layout:null,style:['cross','crossgrid','box'].includes(o.style)?o.style:null,
    values:!!o.values,cols:null,xKey:GG.METRICS[o.xKey]?o.xKey:null,yKey:GG.METRICS[o.yKey]?o.yKey:null,
    refLbl:typeof o.refLbl==='string'?o.refLbl.slice(0,8):'',lineLbl:['legend','right'].includes(o.lineLbl)?o.lineLbl:null};
}
function describe(d){
  const S=GG.plotted(d), R=GG.refStation(d);
  let t=`${KIND_KO[d.kind]} · ${S.map(s=>`${s.lbl} ${s.name}`).join(', ')}`;
  if(R) t+=` · 기준 ${R.refLbl?R.refLbl+' ':''}${R.name}`;
  if(d.kind==='cat') t+=` · ${d.cat.series.map(se=>GG.metricLabel(se.m,se.alias,d.cat.mode!=='value')).join(', ')}`;
  if(d.kind==='sc') t+=` · 가로 ${GG.metricLabel(d.sc.x.m,d.sc.x.alias,d.sc.x.mode!=='value')}, 세로 ${GG.metricLabel(d.sc.y.m,d.sc.y.alias,d.sc.y.mode!=='value')}`;
  if(d.kind==='line') t+=` · ${GG.LINE_V[d.line.v].name}${d.line.mode==='value'?'':' 차이'}`;
  if(d.kind==='climo'&&d.climo.mode!=='value') t+=' · 기후 값 차이';
  if(d.kind==='tb'||d.kind==='rd') t+=` · ${d[d.kind].metrics.map(me=>GG.metricLabel(me.m,me.alias,d.kind==='tb'&&d.tb.mode!=='value')).join(', ')}`;
  return t;
}
async function run(){
  const q=$('#q').value.trim(); if(!q){ $('#q').focus(); return; }
  const r=GG.parseRequest(q,doc.stations);
  let spec=r.spec, unknown=r.unknown.slice(), via='규칙';
  if(!r.understood||unknown.length){
    const sample=await sampleCap;
    if(sample&&!r.understood){
      askMsg('warn','문장을 Claude에게 물어보는 중이에요…'); $('#goBtn').disabled=true;
      try{ const out=await sample.json(GG.buildPrompt(q,doc.stations),{modelTier:'quick'}); const sp=cleanSpec(out); if(sp&&sp.stations.length){ spec=sp; via='Claude'; unknown=Array.isArray(out.missing)?out.missing.map(String):unknown; } }
      catch(e){ /* 규칙 해석 결과로 계속 */ }
      finally{ $('#goBtn').disabled=false; }
    }
  }
  if(!spec||!spec.stations.length){
    const n=GG.stationList().length;
    askMsg('err',unknown.length?`${eun(unknown.join(', '))} 미리 담은 지점에 없어요. 아래 ‘지점 추가’에 ClimatView 표를 붙여 넣은 뒤 다시 만들어 주세요.`:(n?'어느 지점을 그릴지 찾지 못했어요. 지점 이름을 쉼표로 나누어 적어 주세요.':'아직 미리 담은 지점이 없어요. ‘지점 추가’로 지점을 넣은 뒤 그 이름으로 문장을 써 주세요.'));
    return;
  }
  undoDoc=JSON.stringify(doc);
  const {doc:d,missing}=GG.specToDoc(spec,doc);
  doc=d; openIds.clear(); syncTop(); changed('all');
  const miss=[...new Set([...unknown,...missing])];
  let text=describe(doc)+'.';
  if(miss.length) text+=` ${eun(miss.join(', '))} 미리 담은 지점에 없어 빠졌어요. ClimatView 표를 붙여 넣어 지점을 추가해 주세요.`;
  if(r.notes.length&&via==='규칙') text+=' '+r.notes.join(' ');
  if(via==='Claude') text+=' (Claude가 해석)';
  askMsg(miss.length?'warn':'ok',text);
  $('#undoBtn').hidden=false;
}
$('#goBtn').addEventListener('click',run);
$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); run(); } });
$('#undoBtn').addEventListener('click',()=>{ if(!undoDoc) return; doc=GG.normalizeDoc(JSON.parse(undoDoc)); undoDoc=null; $('#undoBtn').hidden=true; syncTop(); changed('all'); askMsg('ok','문장으로 만들기 전으로 되돌렸어요.'); });
function renderExamples(){
  const names=new Set(GG.stationList().map(s=>s.name)); const box=$('#exList'); box.textContent='';
  const EX=[
    '모스크바, 리스본, 싱가포르, 다윈의 1월·7월 기후 그래프',
    '이르쿠츠크, 런던, 리야드 기후 그래프를 (가)~(다)로',
    '서울 기준 베이징, 도쿄, 상하이 월평균 기온 차이 꺾은선',
    'A~D 런던, 리야드, 뭄바이, 시드니의 1월 평균 기온과 7월 강수량, 네 지역 평균과의 차이, 시기 숨김',
    '산점도: 가로축 7월 강수량, 세로축 1월 평균 기온. 런던, 리야드, 뭄바이, 시드니',
    '모스크바, 리스본, 싱가포르의 누적 강수 비율',
    '다윈, 뭄바이, 리스본의 월 강수 비율을 막대로 한 그래프에',
    '서울 기준 도쿄 기후 그래프 차이',
    '베이징, 서울, 도쿄, 상하이의 기온의 연교차와 연 강수량을 막대와 점으로, 물결 생략',
    '리스본, 뭄바이, 시드니의 1월과 7월 강수량, 세 지역 평균과의 차이를 ㉠ 시기 숨김 표로'
  ];
  const usable=EX.filter(q=>{ const r=GG.parseRequest(q,[]); return r.understood&&!r.unknown.length; });
  (usable.length?usable:EX).forEach(q=>{ const b=h('button',{class:'ex',type:'button'},q); b.addEventListener('click',()=>{ $('#q').value=q; run(); }); box.append(b); });
  void names;
}
/* 미리 담은 지점 찾기 */
function setupSearch(){
  const L=GG.stationList(); if(!L.length) return;
  $('#searchBox').hidden=false; $('#bundleNote').textContent=`JMA ClimatView 평년값(1991~2020) ${L.length}곳을 미리 담아 두었어요.`;
  const inp=$('#stSearch'), ul=$('#stResults'); let kop='';
  const add=s=>{ GG.addStation(doc,GG.stationData(s)); relabelIfAuto(); changed('all'); };
  const kopBox=h('div',{class:'kop',role:'group','aria-label':'쾨펜 기후 구분으로 찾기'}); const act=h('div',{class:'kopact'}); act.hidden=true;
  const show=()=>{ ul.textContent=''; const q=inp.value.trim(); let list;
    if(kop){ list=GG.koppenStations(kop); if(q){ const hit=new Set(GG.searchStations(q,400)); list=list.filter(s=>hit.has(s)); } }
    else { if(!q) return; list=GG.searchStations(q,8); }
    list.forEach((s,i)=>{ const tY=GG.metricOf(s,'tY'), pY=GG.metricOf(s,'pY'); const k=GG.koppenOf(s);
      const b=h('button',{type:'button'},h('span',null,s.name,kop&&!q&&i<3&&!(s.elev>1500)?h('em',{class:'rep'},'대표'):null,s.elev>1500?h('em',{class:'hi'},'고지대'):null),
        h('small',null,`${s.country||''} · ${k?k.code:''} · ${GG.fmt(tY,1)}${deg()} · ${Math.round(pY).toLocaleString('ko-KR')}mm`));
      b.addEventListener('click',()=>{ add(s); if(!kop){ inp.value=''; ul.textContent=''; } toast(`${s.name}을(를) 넣었어요.`); inp.focus(); });
      ul.append(h('li',null,b)); });
    if(!ul.children.length) ul.append(h('li',null,h('button',{type:'button',disabled:true},kop?`‘${kop}’ 지점 가운데 ‘${q}’에 맞는 곳이 없어요.`:`‘${q}’${eun(q).slice(String(q).length)} 미리 담은 지점에 없어요. 아래에 표를 붙여 넣어 주세요.`)));
  };
  const setKop=n=>{ kop=kop===n?'':n; [...kopBox.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===kop))); act.textContent=''; act.hidden=!kop;
    if(kop){ const list=GG.koppenStations(kop); const pick=[]; const used=new Set(); for(const s of list){ if(s.elev>1500||used.has(s.country)) continue; used.add(s.country); pick.push(s); if(pick.length>=4) break; }
      const go=h('button',{type:'button',class:'btn small'},`대표 ${pick.length}곳 넣기`); go.addEventListener('click',()=>{ pick.forEach(add); toast(`${pick.map(s=>s.name).join(', ')}을(를) 넣었어요.`); });
      act.append(h('span',{class:'sub'},`${kop} ${list.length}곳 · 대표 순(가운데 값에 가까운 순)`),go,h('span',{class:'sub'},`→ ${pick.map(s=>s.name).join(', ')}`)); }
    show(); };
  for(const n of GG.KOP_TYPES){ const c=GG.koppenStations(n).length; if(!c) continue; const b=h('button',{type:'button',class:'chip','aria-pressed':'false','data-k':n,title:`${n} 지점 ${c}곳`},`${n.replace(' 기후','')} ${c}`); b.addEventListener('click',()=>setKop(n)); kopBox.append(b); }
  inp.after(h('p',{class:'sub kophd'},'기후 구분으로 찾기(쾨펜 계산값 · 경계에 가까운 지점은 교과서와 다를 수 있고, 고산 기후는 판별하지 않아요)'),kopBox,act);
  inp.addEventListener('input',show);
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const b=ul.querySelector('button:not([disabled])'); if(b){ e.preventDefault(); b.click(); } } });
}

/* ───────── 설정 패널 ───────── */
function renderOpts(){
  axisRefresh=[]; const P=$('#opts'); P.textContent='';
  const sec=(title,...kids)=>h('section',{class:'sec'},h('h2',{class:'sec-title'},title),...kids);
  const k=doc.kind;
  if(k==='climo'){ const o=doc.climo; const diff=o.mode!=='value';
    P.append(sec('기후 그래프',
      row('나타낼 값',sel(MODES,()=>o.mode,v=>{ const was=o.mode!=='value'; o.mode=v; const now=v!=='value'; if(now&&!was){ o.pw=Math.max(o.pw,60); o.ph=Math.max(o.ph,34); o.words=true; o.months='all'; o.t.auto=true; o.p.auto=true; } if(!now&&was){ o.pw=20; o.ph=26; o.words=false; o.t.auto=true; o.p.auto=true; } },'opts','나타낼 값')),
      diff?h('p',{class:'sub'},'기온은 ■ 꺾은선, 강수량은 0에서 위아래로 뻗는 막대로 그리고, 두 축의 0을 같은 높이에 맞춰요. 2026학년도 9월 한국지리 12번 양식이에요.'):null,
      row('표시 달',seg([['all','12개월'],['17','1월·7월']],()=>o.months,v=>{ o.months=v; if(v==='17'&&o.pw>22) o.pw=20; if(v==='all'&&o.xall!==false&&o.pw<26) o.pw=28; },'opts')),
      o.months==='all'&&!diff?row('가로축 숫자',seg([['all','1~12월 모두'],['few','1·6·12월']],()=>o.xall===false?'few':'all',v=>{ o.xall=v==='all'; if(o.xall&&o.pw<26) o.pw=28; },'opts')):null,
      o.months==='all'&&!diff&&o.xall!==false&&o.pw<26?h('p',{class:'sub'},'칸이 좁아 월 숫자를 작게 줄여 그리고 있어요. 그래프 칸 가로를 26 mm 이상으로 넓히면 숫자가 제 크기로 나와요.'):null,
      o.months==='all'?row('기온 표시',seg([['line','꺾은선'],['dot','점']],()=>o.temp,v=>o.temp=v,'opts')):null,
      o.months==='all'&&o.temp==='line'&&!diff?row('',chk('곡선을 매끄럽게',()=>o.smooth,v=>o.smooth=v)):null,
      row('한 줄에',seg([['1','1개'],['2','2개'],['3','3개'],['4','4개']],()=>o.cols,v=>o.cols=+v)),
      sizeRow(o),
      row('',chk(diff?'축 옆에 ‘기온 차이·강수량 차이’ 세로 글자':'축 위에 ‘온도·강수량’ 글자',()=>o.words,v=>o.words=v)),
      h('p',{class:'sub'},'모든 지점이 같은 축 범위를 써서 서로 비교할 수 있어요.')));
    P.append(sec('축 범위',axisHead(),axisCtl('기온',o.t,'t'),axisCtl('강수량',o.p,'p',!diff)));
  }
  if(k==='line'){ const o=doc.line; const cum=o.v==='pc'||o.v==='pr';
    const VN={t:'기온',p:'강수량',pc:'누적 강수량',pr:'누적 강수 비율',ps:'월 강수 비율'};
    P.append(sec('월별 그래프',
      row('값',sel(Object.entries(VN),()=>o.v,v=>{ const was=o.v; o.v=v; o.y.auto=true; const pv=['pc','pr','ps'].includes(v); if(pv) o.titleOn=true; if(pv&&was==='t'&&o.mark==='line'){ o.mark='panel'; o.pw=30; o.ph=32; } if(v==='t'&&o.mark!=='line'){ o.mark='line'; o.pw=45; o.ph=40; } },'opts','값')),
      row('모양',sel([['line','꺾은선'],['panel','막대 · 지점마다 한 칸'],['bar','막대 · 한 그래프에']],()=>o.mark==='auto'?(o.v==='t'?'line':'panel'):o.mark,v=>{ o.mark=v; if(v==='panel'){ o.pw=30; o.ph=32; } else if(v==='bar'){ o.pw=Math.max(60,GG.plotted(doc).length*24); o.ph=40; } else { o.pw=45; o.ph=40; } },'opts','모양')),
      row('가로축 숫자',seg([['all','1~12월 모두'],['few','1·6·12월']],()=>o.xall===false?'few':'all',v=>o.xall=v==='all','opts')),
      o.xall!==false&&o.pw<(o.mark==='bar'?40:28)?h('p',{class:'sub'},'칸이 좁아 월 숫자를 작게 줄여 그리고 있어요. 그래프 칸 가로를 넓히면 숫자가 제 크기로 나와요.'):null,
      o.mark==='panel'?row('한 줄에',seg([['1','1개'],['2','2개'],['3','3개'],['4','4개']],()=>o.cols||3,v=>o.cols=+v)):null,
      cum?row('누적 시작',sel(Array.from({length:12},(_,i)=>[String(i),`${i+1}월부터`]),()=>String(o.start||0),v=>o.start=+v,null,'누적 시작 월')):null,
      cum?h('p',{class:'sub'},'남반구 지점을 우기 기준으로 보려면 7월부터 누적하는 식으로 바꿔 보세요. 가로축도 그 달부터 시작해요.'):null,
      row('나타낼 값',sel(MODES,()=>o.mode,v=>o.mode=v,'opts','나타낼 값')),
      o.mark==='line'?row('지점 표시',seg([['legend','범례 상자'],['right','선 끝 라벨'],['none','없음']],()=>o.lbl==='left'?'right':o.lbl,v=>o.lbl=v,'opts')):null,
      o.mark==='line'&&o.lbl==='legend'?row('범례 위치',sel([['auto','자동 (선이 없는 모서리)'],['tl','안쪽 왼쪽 위'],['tr','안쪽 오른쪽 위'],['bl','안쪽 왼쪽 아래'],['br','안쪽 오른쪽 아래'],['right','그래프 오른쪽 바깥'],['below','그래프 아래']],()=>o.lgPos||'auto',v=>o.lgPos=v,null,'범례 위치')):null,
      o.mark==='line'&&o.lbl==='legend'&&(o.lgPos||'auto')==='auto'?h('p',{class:'sub'},'안쪽 네 모서리 가운데 선과 겹치지 않는 곳에 넣어요. 누적 그래프는 왼쪽 위를 먼저 봐요. 빈 모서리가 없으면 그래프 오른쪽 바깥에 둬요.'):null,
      o.mark==='line'?row('',chk('곡선을 매끄럽게',()=>o.smooth,v=>o.smooth=v)):null,
      row('',chk('위에 제목',()=>o.titleOn,v=>o.titleOn=v,'opts')),
      o.titleOn?row('제목',txt(()=>o.title,v=>o.title=v,`비우면 〈${VN[o.v]}${o.mode!=='value'?' 차이':''}〉`,'제목')):null,
      sizeRow(o)));
    const S=GG.plotted(doc);
    if(S.length&&o.mark==='line'){ const box=h('div',{class:'lsty'},h('span'),h('span',{class:'sub'},'표시'),h('span',{class:'sub'},'선'),h('span',{class:'sub'},'색'));
      S.forEach((s,i)=>{ const cur=GG.lineStyle(doc,s,i); const set=(key,v)=>{ doc.line.sty[s.id]=Object.assign({},doc.line.sty[s.id]||{},{[key]:v}); changed(); };
        const mk=h('select',{'aria-label':`${s.lbl} 표시`}); for(const [v,t] of Object.entries(GG.MARKS)) mk.append(h('option',{value:v},t)); mk.value=cur.mk; mk.addEventListener('change',()=>set('mk',mk.value));
        const ds=h('select',{'aria-label':`${s.lbl} 선`}); ds.append(h('option',{value:'solid'},'실선'),h('option',{value:'dash'},'점선')); ds.value=cur.dash; ds.addEventListener('change',()=>set('dash',ds.value));
        const co=h('select',{'aria-label':`${s.lbl} 색`}); co.append(h('option',{value:'k'},'검정'),h('option',{value:'g'},'회색')); co.value=cur.c; co.addEventListener('change',()=>set('c',co.value));
        box.append(h('b',null,s.lbl||s.name),mk,ds,co); });
      P.append(sec('선 모양',box)); }
    P.append(sec('축 범위',axisHead(),axisCtl(VN[o.v],o.y,'y')));
  }
  if(k==='cat'){ const o=doc.cat;
    const s1=sec('지역별 막대·점',
      row('나타낼 값',sel(MODES,()=>o.mode,v=>o.mode=v,'opts','나타낼 값')),
      o.series.length>1?row('배치',seg([['panels','지표마다 따로'],['group','한 그래프에']],()=>o.layout,v=>{ o.layout=v; if(v==='group'){ const u=new Set(o.series.map(se=>GG.METRICS[se.m]&&GG.METRICS[se.m].unit)); if(u.size>1) o.legend='bottom'; } },'opts')):null);
    o.series.forEach((se,j)=>{
      const rm=o.series.length>1?h('button',{class:'ico x',type:'button','aria-label':`지표 ${j+1} 빼기`,title:'빼기'},'×'):null;
      if(rm) rm.addEventListener('click',()=>{ o.series.splice(j,1); changed('opts'); });
      s1.append(h('div',{class:'series'},h('div',{class:'series-head'},`지표 ${j+1}`,rm),
        row('지표',metricSelect(()=>se.m,v=>se.m=v)),
        row('시기 숨김',txt(()=>se.alias,v=>{ se.alias=v; refreshHint(); },'예: (가) 시기','시기 숨김 이름')),
        row('모양',seg([['bar','막대'],['dot','●'],['odot','○']],()=>se.mark,v=>se.mark=v,'opts')),
        se.mark==='bar'?row('채우기',sel(Object.entries(GG.FILLS),()=>se.fill,v=>se.fill=v,null,'채우기')):null,
        row('제목',txt(()=>se.title,v=>se.title=v,'비우면 자동','제목'))));
    });
    if(o.series.length<3){ const add=h('button',{class:'btn small',type:'button'},'+ 지표 추가'); add.addEventListener('click',()=>{ const used=new Set(o.series.map(s=>s.m)); const m=['p7','p1','t1','t7','pY','tY'].find(x=>!used.has(x))||'pY'; o.series.push({m,alias:'',fill:o.series.length===1?'dark':'light',mark:'bar',title:''}); changed('opts'); }); s1.append(h('div',null,add)); }
    const single=o.layout==='panels'||o.series.length===1;
    const units=new Set(o.series.filter(se=>GG.METRICS[se.m]).map(se=>GG.METRICS[se.m].unit));
    const dual=!single&&units.size===2;
    if(dual) s1.append(h('p',{class:'sub'},'단위가 다른 두 지표라 기온은 왼쪽 축, 강수량은 오른쪽 축으로 그려요(이중축). 오른쪽 축은 왼쪽 눈금 칸 수에 맞춰요.'));
    s1.append(row('',chk('막대 위에 값 표시',()=>o.values,v=>o.values=v)));
    if(single) s1.append(row('',chk('지점마다 다른 무늬',()=>o.fillBy==='station',v=>o.fillBy=v?'station':'series')));
    s1.append(row('',chk('지점 사이 구분선',()=>o.sep,v=>o.sep=v)));
    s1.append(row('',chk('가로 점선 격자',()=>o.grid!==false,v=>o.grid=v)));
    s1.append(row('0 기준선',seg([['solid','실선'],['dash','점선']],()=>o.zero||'solid',v=>o.zero=v)));
    s1.append(row('',chk('세로축 아래를 물결선(≈)으로 생략',()=>o.brk,v=>{ o.brk=v; o.y.auto=true; o.y2.auto=true; },'opts')));
    if(o.brk) s1.append(h('p',{class:'sub'},o.mode!=='value'?'차이 그래프에는 축 생략을 쓰지 않아요.':'값이 0에서 멀리 떨어져 있을 때만 생략선이 생겨요. 아래 0과 생략선 위 눈금 사이를 물결선으로 끊어요.'));
    s1.append(row('',chk('양수 눈금에 + 부호',()=>o.plus,v=>o.plus=v)));
    s1.append(row('세로 제목',txt(()=>o.ytitle,v=>o.ytitle=v,'예: 평균 기온 차이','세로축 제목')));
    if(!single) s1.append(row('범례',seg([['right','오른쪽'],['inside','안쪽 위'],['bottom','아래 상자']],()=>o.legend,v=>o.legend=v)));
    s1.append(sizeRow(o,single&&o.series.length>1?'그래프 한 칸':'그래프 칸'));
    P.append(s1);
    if(single&&o.series.length>1&&units.size>1) P.append(sec('축 범위',h('p',{class:'sub'},'기온과 강수량처럼 단위가 다른 지표는 칸마다 알맞은 범위를 자동으로 잡아요. 범위를 직접 정하려면 같은 단위의 지표끼리 그리거나 지표를 하나만 남겨 주세요.')));
    else P.append(sec('축 범위',axisHead(),axisCtl(dual?'왼쪽 축':'세로축',o.y,'y'),dual?axisCtl('오른쪽 축',o.y2,'y2'):null));
  }
  if(k==='rd'||k==='tb'){ const o=doc[k]; const max=k==='rd'?6:5, min=k==='rd'?3:1;
    const s1=sec(k==='rd'?'방사형 그래프':'표');
    if(k==='tb') s1.append(row('나타낼 값',sel(MODES,()=>o.mode,v=>o.mode=v,'opts','나타낼 값')),
      row('행',seg([['st','지역이 행'],['m','지표가 행']],()=>o.rows,v=>o.rows=v)),
      row('소수 자리',seg([['0','0'],['1','1'],['2','2']],()=>String(o.dec),v=>o.dec=+v)),
      row('',chk('천 단위 쉼표 (1,292.5)',()=>o.comma,v=>o.comma=v)),
      row('단위 표기',seg([['top','표 위 (단위: mm)'],['head','열 머리마다']],()=>o.unitPos==='head'?'head':'top',v=>o.unitPos=v)),
      row('',chk('열 머리 단위를 둘째 줄에',()=>o.unitLine,v=>o.unitLine=v)));
    if(k==='rd') s1.append(h('p',{class:'sub'},'지표마다 가장 높은 지역의 값을 1로 한 상댓값을 그려요(2024학년도 수능 한국지리 9번 양식). 기온처럼 0 아래로 내려가는 값은 상댓값이 의미가 없으니 피해 주세요.'));
    o.metrics.forEach((me,j)=>{
      const rm=o.metrics.length>min?h('button',{class:'ico x',type:'button','aria-label':`지표 ${j+1} 빼기`,title:'빼기'},'×'):null;
      if(rm) rm.addEventListener('click',()=>{ o.metrics.splice(j,1); changed('opts'); });
      s1.append(h('div',{class:'series'},h('div',{class:'series-head'},`지표 ${j+1}`,rm),
        row('지표',metricSelect(()=>me.m,v=>me.m=v)),
        k==='tb'?row('시기 숨김',txt(()=>me.alias,v=>{ me.alias=v; refreshHint(); },'예: ㉠ 시기','시기 숨김 이름')):null,
        row(k==='rd'?'축 이름':'이름',txt(()=>me.title,v=>me.title=v,'비우면 자동','이름'))));
    });
    if(o.metrics.length<max){ const add=h('button',{class:'btn small',type:'button'},'+ 지표 추가'); add.addEventListener('click',()=>{ const used=new Set(o.metrics.map(x=>x.m)); const m=['pY','tY','tR','pJJA','pDJF','tMin','p1','p7'].find(x=>!used.has(x))||'tY'; o.metrics.push({m,alias:'',title:''}); changed('opts'); }); s1.append(h('div',null,add)); }
    if(k==='rd'){ const cen=h('input',{type:'number',step:'0.1',min:0,max:0.9,value:o.center,placeholder:'자동','aria-label':'중심값'}); cen.addEventListener('input',()=>{ o.center=cen.value; changed(); });
      s1.append(row('중심값',cen,h('span',{class:'unit'},'비우면 자동 (가장 작은 값보다 조금 아래)')),
        row('크기',num(()=>o.size,v=>o.size=v,{min:20,max:120,step:1,aria:'지름(mm)'}),h('span',{class:'unit'},'mm 지름'))); }
    P.append(s1);
  }
  if(k==='sc'){ const o=doc.sc;
    const axisBlock=(name,c)=>h('div',{class:'series'},h('div',{class:'series-head'},name),
      row('지표',metricSelect(()=>c.m,v=>c.m=v)),
      row('나타낼 값',sel(MODES,()=>c.mode,v=>c.mode=v,'opts','나타낼 값')),
      row('시기 숨김',txt(()=>c.alias,v=>{ c.alias=v; refreshHint(); },'예: (가) 시기','시기 숨김 이름')),
      row('축 제목',txt(()=>c.title,v=>c.title=v,'비우면 자동','축 제목')));
    P.append(sec('산점도',axisBlock('가로축',o.x),axisBlock('세로축',o.y),
      row('모양',seg([['cross','십자 축'],['crossgrid','십자 축 + 점선 격자'],['box','격자 상자']],()=>o.style,v=>o.style=v)),
      sizeRow(o,'그래프 크기')));
    P.append(sec('축 범위',axisHead(),axisCtl('가로축',o.xa,'x'),axisCtl('세로축',o.ya,'y')));
  }
  /* 발문 단서 */
  const hint=h('section',{class:'sec',id:'hintSec'}); P.append(hint); refreshHint();
  /* 주석 */
  const N=doc.notes;
  const extra=h('textarea',{class:'note-area',placeholder:'한 줄에 하나씩. 예: (기상청)','aria-label':'덧붙일 주석'}); extra.value=N.extra||''; extra.addEventListener('input',()=>{ N.extra=extra.value; changed(); });
  P.append(sec('주석',row('',chk('차이 계산식 자동',()=>N.auto,v=>N.auto=v)),row('',chk('‘1991~2020년의 평년값임.’',()=>N.normal,v=>N.normal=v)),extra));
  /* 글꼴·크기 */
  const S=doc.style;
  const fsel=fam=>sel(GG.FONTS[fam].map(f=>[f.key,f.label]),()=>fam==='serif'?S.serif:S.gothic,v=>{ if(fam==='serif') S.serif=v; else S.gothic=v; GG.clearMetrics(); },'opts',fam==='serif'?'명조 글꼴':'고딕 글꼴');
  const fstat=h('p',{class:'sub'},fontStatus());
  const ff=fam=>{ const i=h('input',{type:'file',accept:'.ttf,.otf,.woff,.woff2'}); i.addEventListener('change',async()=>{ const f=i.files&&i.files[0]; if(!f) return; try{ const n=await GG.registerUserFont(fam,f); if(fam==='serif') S.serif='user'; else S.gothic='user'; GG.clearMetrics(); changed('opts'); toast(`${n} 글꼴을 불러왔어요.`); }catch(e){ toast('글꼴 파일을 읽지 못했어요.'); } }); return h('label',{class:'btn small filebtn'},fam==='serif'?'명조 파일':'고딕 파일',i); };
  const det=h('details',{class:'sec'},h('summary',null,h('h2',{class:'sec-title'},'글꼴 · 글자 크기 · 선')),
    row('숫자·라벨',fsel('serif')),row('제목·주석',fsel('gothic')),fstat,row('',h('span',{class:'sub'},'글꼴 파일:'),ff('serif'),ff('gothic')),
    row('눈금 숫자',...range(()=>S.tickPt,v=>{S.tickPt=v; S.unitPt=Math.max(6,v-0.5); S.valuePt=Math.max(6,v-0.5);},6,11,0.5,v=>v+' pt')),
    row('라벨',...range(()=>S.catPt,v=>S.catPt=v,6,12,0.5,v=>v+' pt')),
    row('제목·범례',...range(()=>S.titlePt,v=>{S.titlePt=v; S.legendPt=Math.max(6,v-0.5);},6,12,0.5,v=>v+' pt')),
    row('주석',...range(()=>S.notePt,v=>S.notePt=v,5.5,10,0.5,v=>v+' pt')),
    row('선 굵기',...range(()=>S.lw,v=>S.lw=v,0.6,1.8,0.1,v=>'×'+v.toFixed(1))),
    row('막대 회색',...range(()=>S.mid,v=>S.mid=v,120,220,1,v=>String(v))),
    row('기온 단위',seg([['℃','℃'],['°C','°C']],()=>S.deg,v=>S.deg=v,'all')),
    row('라틴 글자',seg([['','글꼴 그대로'],['times','Times']],()=>S.latin,v=>{ S.latin=v; GG.clearMetrics(); })));
  P.append(det);
}
function fontStatus(){
  const out=[];
  for(const fam of ['serif','gothic']){ const f=GG.fontDef(doc,fam); const ok=GG.fontAvailable(f,fam);
    if(f.web) continue;
    if(!ok) out.push(`${f.label.replace(/ \(.*\)$/,'')} 글꼴이 이 컴퓨터에 없어 ${fam==='serif'?'Noto Serif KR':'Noto Sans KR'}로 대신 그려요.`); }
  return out.length?out.join(' '):'고른 글꼴이 이 컴퓨터에 있어요.';
}
function refreshHint(){
  const el=$('#hintSec'); if(!el) return; el.textContent='';
  const H=GG.hintOf(doc); if(!H){ el.hidden=true; return; } el.hidden=false;
  const cp=h('button',{class:'btn small copy',type:'button'},'단서 문구 복사');
  cp.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(H.sentence); toast('발문 단서를 복사했어요.'); }catch(e){ toast('복사가 막혀 있어요. 문구를 직접 선택해 복사해 주세요.'); } });
  el.append(h('h2',{class:'sec-title'},'발문 단서'),h('div',{class:'hint'},h('div',null,H.sentence),h('div',{class:'sub'},h('b',null,'정답: '),H.key),cp));
}

/* ───────── 그리기 ───────── */
const KIND_NAME={climo:'기후그래프',line:'월별꺾은선',cat:'지역별막대',sc:'산점도',rd:'방사형',tb:'기후표'};
function warnings(){
  const w=[]; const S=GG.plotted(doc);
  const usesRef=(doc.kind==='tb'&&doc.tb.mode==='ref')||(doc.kind==='line'&&doc.line.mode==='ref')||(doc.kind==='cat'&&doc.cat.mode==='ref')||(doc.kind==='sc'&&(doc.sc.x.mode==='ref'||doc.sc.y.mode==='ref'));
  if(usesRef&&!GG.refStation(doc)) w.push('‘기준 지점과의 차이’를 쓰려면 지점 목록에서 ‘기준’ 버튼으로 기준 지점을 하나 정해 주세요.');
  const holes=S.filter(s=>!s.t.every(GG.fin)||!s.p.every(GG.fin)).map(s=>s.name);
  if(holes.length) w.push(`${holes.join(', ')}의 월별 값이 비어 있어 일부를 그리지 못해요.`);
  if(doc.kind==='sc'&&S.length&&S.length<2) w.push('산점도는 지점이 두 곳 이상일 때 의미가 있어요.');
  if(doc.kind==='rd'){ const bad=doc.rd.metrics.filter(me=>S.some(s=>!(GG.metricOf(s,me.m)>0))).map(me=>GG.METRICS[me.m]&&GG.METRICS[me.m].name).filter(Boolean);
    if(bad.length) w.push(`${bad.join(', ')}에 0 이하인 지점이 있어 상댓값이 맞지 않아요. 다른 지표를 고르거나 지점을 바꿔 주세요.`);
    if(doc.rd.metrics.length<3) w.push('방사형 그래프는 지표가 세 개 이상 필요해요.'); }
  if(doc.kind==='climo'&&doc.climo.mode==='ref'&&!GG.refStation(doc)) w.push('‘기준 지점과의 차이’를 쓰려면 지점 목록에서 ‘기준’ 버튼으로 기준 지점을 하나 정해 주세요.');
  return w;
}
function draw(){
  const desk=getComputedStyle(ROOT.body||ROOT).getPropertyValue('--desk').trim()||'#c7ccd2';
  const r=GG.paintSheet(doc,cv,{desk});
  $('#deskEmpty').hidden=GG.plotted(doc).length>0;
  const w=warnings(); const dw=$('#deskWarn'); dw.hidden=!w.length; dw.textContent=w.join(' ');
  if(r){ const W=r.R.W+2*GG.M, H=r.R.H+2*GG.M; $('#sizeInfo').textContent=`${W.toFixed(1)} × ${H.toFixed(1)} mm · ${Math.round(W/25.4*dpi)} × ${Math.round(H/25.4*dpi)} px`; }
  else $('#sizeInfo').textContent='';
  ['pngBtn','svgBtn','copyBtn'].forEach(id=>$('#'+id).disabled=!r);
  for(const f of axisRefresh) f();
  requestFonts();
}
let fontJob=0;
function requestFonts(){ clearTimeout(fontJob); fontJob=setTimeout(()=>{ GG.ensureFonts(doc); },250); }
if(document.fonts){ document.fonts.addEventListener('loadingdone',()=>{ GG.clearMetrics(); schedule(); const fs=$('#opts .sub'); void fs; }); }
new ResizeObserver(()=>schedule()).observe(cv.parentElement);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>schedule());

/* ───────── 내보내기 · 작업 파일 ───────── */
const stamp=()=>{ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const RESULT={saved:'저장했어요.',declined:'저장을 취소했어요.',busy:'잠시 뒤에 다시 눌러 주세요.',failed:'저장하지 못했어요.'};
async function busy(btn,fn){ btn.disabled=true; try{ await fn(); } finally{ btn.disabled=false; } }
$('#pngBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const b=await GG.renderPng(doc,{dpi}); toast(RESULT[await GG.saveFile(`${KIND_NAME[doc.kind]}_${stamp()}.png`,b,'image/png')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#svgBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const s=await GG.svgString(doc); toast(RESULT[await GG.saveFile(`${KIND_NAME[doc.kind]}_${stamp()}.svg`,s,'image/svg+xml')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#copyBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ await GG.copyPng(doc,{dpi}); toast('이미지를 복사했어요. 한글 문서에 바로 붙여 넣을 수 있어요.'); }catch(err){ toast('이 화면에서는 복사가 막혀 있어요. PNG 저장을 써 주세요.'); } }));
bindSeg($('#dpiSeg'),()=>dpi,v=>{ dpi=+v; schedule(); });
$('#saveJson').addEventListener('click',async()=>{ toast(RESULT[await GG.saveFile(`기후그래프_작업_${stamp()}.json`,JSON.stringify(doc,null,1),'application/json')]); });
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; try{ const d=JSON.parse(await f.text()); if(!d||!Array.isArray(d.stations)) throw 0; doc=GG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); }catch(err){ toast('기후 그래프 작업 파일이 아니에요.'); } e.target.value=''; });
const resetBtn=$('#resetBtn'); let resetArm=0;
resetBtn.addEventListener('click',()=>{ if(!resetArm){ resetBtn.textContent='한 번 더 누르면 지워요'; resetArm=setTimeout(()=>{ resetArm=0; resetBtn.textContent='새 작업'; },3000); return; }
  clearTimeout(resetArm); resetArm=0; resetBtn.textContent='새 작업'; const kind=doc.kind; doc=GG.freshDoc(kind); openIds.clear(); syncTop(); changed('all'); showMsg('',''); toast('새 작업을 시작했어요.'); });

/* ───────── 위쪽 막대 ───────── */
const syncKind=bindSeg($('#kindSeg'),()=>doc.kind,v=>{ doc.kind=v; changed('opts'); });
const syncSeq=bindSeg($('#seqSeg'),()=>doc.seq,v=>{ doc.seq=v; doc.autoLbl=true; GG.relabel(doc); changed('st'); if(doc.kind==='line') renderOpts(); });
function syncTop(){ syncKind(); syncSeq(); }
const dpiSync=$('#dpiSeg'); void dpiSync;

renderStations(); renderOpts(); renderExamples(); setupSearch(); schedule();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ GG.clearMetrics(); schedule(); });
/* 통합판에서 다른 곳이 작업 파일을 넘겨줄 때 */
/* 통합판: 지금 지점들을 세계지리 백지도 자동 생성 탭으로 넘긴다(같은 기호). 단독 파일에서는 이 칸을 숨긴다 */
function syncMapSend(){
  const box=$('#mapSend'), a=$('#mapSendBtn'); if(!box||!a) return;
  const inHub=(a.getAttribute('href')||'').startsWith('#open:'); const S=GG.plotted(doc), R=GG.refStation(doc);
  box.hidden=!inHub||!S.length; $('#msRefRow').hidden=!R;
  const ib=$('#itemSend'); if(ib) ib.hidden=!S.length||!document.getElementById('hub-tab-item');
  const nx=S.filter(s=>!isFinite(s.lat)||!isFinite(s.lon)).map(s=>s.name);
  $('#msNote').textContent=nx.length?`위치(위도·경도)를 모르는 지점은 빠져요: ${nx.join(', ')}`:'세계지리 백지도 ‘자동 생성’ 탭에서 같은 지점·같은 기호로 지도를 만들어요.';
}
function mapRequest(){
  const S=GG.plotted(doc), R=GG.refStation(doc);
  const region=$('#msRegion').value||null, noLbl=$('#msLbl').value==='none', withRef=!!R&&$('#msRef').checked, named=doc.seq==='name';
  const ok=s=>isFinite(s.lat)&&isFinite(s.lon);
  const pts=S.filter(ok).map(s=>({ko:s.name,en:s.en||'',lat:s.lat,lon:s.lon,label:noLbl||named?null:(s.lbl||null),marker:'dot'}));
  if(withRef&&ok(R)) pts.push({ko:R.name,en:R.en||'',lat:R.lat,lon:R.lon,label:noLbl?null:(R.refLbl||null),marker:'dot'});
  const spec={region,labelSeq:{gana:'gana',latin:'latin',circ:'circ'}[doc.seq]||'latin',points:pts,noLabels:true,noLbl};
  const rn={arctic:'북극 중심 지도','world-atl':'세계 지도','world-pac':'태평양 중심 세계 지도'}[region];
  const q=[rn,...pts.map(p=>p.label?`${p.ko} ${p.label}`:p.ko)].filter(Boolean).join(', ')+(noLbl?', 기호 없이':'');
  return pts.length?{spec,q}:null;
}
return {mapRequest,getDoc:()=>doc,load:d=>{ if(!d||!(Array.isArray(d.stations))) return false; doc=GG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); return true; }};
});