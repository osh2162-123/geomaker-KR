HUB.def('mapquick',function(ROOT){
'use strict';
const $=(s,r=ROOT)=>r.querySelector(s);
const $$=(s,r=ROOT)=>[...r.querySelectorAll(s)];
const {esc,fmtLat,fmtLon,FONTS,PRESETS}=WG;

const EXAMPLES=[
  {t:'유럽 지도에 로테르담, 함부르크, 뮌헨, 마르세유를 A~D로 찍어 줘'},
  {t:'에티오피아, 케냐, 탄자니아, 콩고민주공화국을 A~D 음영으로'},
  {t:'이집트 (가), 이란 (나), 아랍에미리트 (다), 남수단 (라)'},
  {t:'환태평양 지도에 덴버, 퍼스, 포르투알레그리'},
  {t:'라인강 하구의 석유 화학 항구 도시와 독일 남부의 자동차 산업 도시를 (가), (나)로 찍고, 헷갈릴 만한 독일 도시 두 곳을 더 넣어 줘',claude:true},
  {t:'고비 사막과 파타고니아의 로스글라시아레스 국립공원을 ㉠, ㉡으로',claude:true}
];
const EDIT_RE=/(바꿔|바꾸|빼|빼줘|지워|없애|추가|더\s*넣|옮겨|대신|말고|수정|고쳐|넣어\s*줘|붙여)/;
const STORE='wgquick-last-v1';

let doc=null, meta={q:'',via:'',answer:'',warnings:[],unknown:[]};
let sample=null, sampleKnown=false, ctl=null, busy=false, timer=0, dpi=600;
const pref={font:'hysm',fontPt:9};
let ready=null;

/* ───────── 상태 표시 ───────── */
function setStatus(s,text){ $('#status').dataset.s=s; $('#statusText').textContent=text; }
let toastT=0;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2800); }
function modeNote(){
  const n=$('#modeNote');
  if(!sampleKnown){ n.textContent='Claude 연결을 확인하는 중이에요.'; return; }
  n.textContent=sample
    ?'도시·국가 이름을 직접 적으면 바로 그려요. 설명으로 쓴 문장이나 “B를 함부르크로 바꿔 줘” 같은 수정은 Claude가 읽어요. 이때 선생님의 Claude 사용량이 조금 들어요.'
    :'이 화면에서는 Claude를 부를 수 없어서, 도시·국가·하천 이름을 직접 적은 문장만 이해해요. 설명으로 쓴 문장은 Claude 안에서 이 페이지를 열면 읽을 수 있어요.';
  $$('.ex').forEach((b,i)=>{ b.disabled=!!EXAMPLES[i].claude&&!sample; b.title=b.disabled?'Claude가 있어야 이해하는 문장이에요':''; });
}

/* ───────── 그리기 ───────── */
const cv=$('#cv'), wrap=$('#wrap');
function deskColor(){ return getComputedStyle(ROOT.documentElement||ROOT).getPropertyValue('--desk').trim()||'#c7ccd2'; }
function render(){
  if(!doc) return;
  WG.paintSheet(doc,cv,{desk:deskColor(),pad:28});
  const k=dpi/25.4, M=WG.M;
  $('#sizeInfo').textContent=`틀 ${doc.frame.w} × ${doc.frame.h} mm · ${dpi} dpi로 ${Math.round((doc.frame.w+WG.sheetExtra(doc).ex+2*M)*k).toLocaleString()} × ${Math.round((doc.frame.h+WG.sheetExtra(doc).ey+2*M)*k).toLocaleString()} px`;
}
let rq=0; function requestRender(){ if(!rq) rq=requestAnimationFrame(()=>{ rq=0; render(); }); }

/* ───────── 해석 결과 목록 ───────── */
const KIND={dot:'점',ring:'빈 원',none:'글자만'};
const MK_ICON={dot:'●',ring:'○',none:'T'};
const STY={shade:'음영',circle:'점선 원',multi:'섬마다 지시선'};
const STY_NEXT={shade:'circle',circle:'multi',multi:'shade'};
const styOf=it=>it.style||(it.ring?'circle':it.multi?'multi':'shade');
function relabel(){ WG.autoLabel(doc); requestRender(); persist(); }
function renderList(){
  const box=$('#items');
  $('#via').textContent=meta.via==='claude'?'Claude 해석':meta.via==='rules'?'지명 직접 인식':meta.via==='saved'?'지난 작업':meta.via==='climate'?'기후 탭 지점':meta.via==='table'?'표의 나라':'';
  const ans=$('#answer'); ans.hidden=!meta.answer; ans.textContent=meta.answer||'';
  const w=$('#warn'); const ws=[...(meta.warnings||[]),...((meta.unknown||[]).length?[`못 알아들은 말: ${meta.unknown.join(', ')}`]:[])];
  w.hidden=!ws.length; w.innerHTML=ws.map(x=>`<li>${esc(x)}</li>`).join('');
  if(!doc||(!doc.items.length&&!doc.layers.rivers.length)){ box.innerHTML='<p class="empty" style="padding:10px">아직 지도에 올린 것이 없어요.</p>'; return; }
  const rows=doc.items.map((it,i)=>{
    let kind, where='';
    if(it.sea){ kind='바다 이름'; }
    else if(it.t==='pt'){ kind=KIND[it.mk]||'점'; where=`${fmtLat(it.lat)} ${fmtLon(it.lon)}`; }
    else if(it.t==='shade'){ kind=styOf(it)==='shade'?'국가 음영':'음영 + '+STY[styOf(it)]; }
    else { kind='점선 영역'; where=`${fmtLat(it.lat)} ${fmtLon(it.lon)}`; }
    const src=it.src&&it.src!=='사전'?`<span class="src">${esc(it.src)}</span>`:'';
    return `<div class="it" data-i="${i}"><input value="${esc(it.lbl||'')}" aria-label="${esc(it.name||'항목')} 라벨" maxlength="${it.sea?14:6}">
      <div class="nm"><b>${esc(it.name||'(이름 없음)')}</b><small>${kind}${where?' · '+where:''}${src}</small></div>
      ${it.sea?'<span></span>':it.t==='pt'?`<button class="mk" type="button" title="표시 모양 바꾸기 (점 → 빈 원 → 글자만)" aria-label="표시 모양 바꾸기">${MK_ICON[it.mk]||'●'}</button>`
        :it.t==='shade'?`<button class="mk sty" type="button" title="표시 방식 바꾸기 (음영 → 점선 원 → 섬마다 지시선)" aria-label="${esc(it.name||'국가')} 표시 방식 바꾸기">${({shade:'■',circle:'◌',multi:'⋔'})[styOf(it)]}</button>`:'<span></span>'}
      <button class="x" type="button" aria-label="${esc(it.name||'항목')} 빼기" title="지도에서 빼기">×</button></div>`;
  });
  doc.layers.rivers.forEach(k=>rows.push(`<div class="it" data-r="${esc(k)}"><input value="—" disabled aria-label="하천"><div class="nm"><b>${esc(k)}</b><small>하천</small></div><span></span><button class="x" type="button" aria-label="${esc(k)} 빼기" title="지도에서 빼기">×</button></div>`));
  const ak=WG.answerKey(doc);
  if(doc.items.some(it=>!it.sea)) rows.push(`<div class="ans">${ak?`<p><b>정답</b> ${esc(ak.key)}</p>`:'<p class="clue">기호가 없어요. 아래에서 순서를 골라 적용하면 기호를 새로 붙여요.</p>'}${ak&&ak.clue?`<p class="clue">${esc(ak.clue)}</p>`:''}${ak?`<p><button class="btn small" type="button" id="ansCopy">정답 복사</button>${ak.clue?' <button class="btn small" type="button" id="clueCopy">단서 문구 복사</button>':''}</p>`:''}<p class="reord"><label>기호 다시 매기기 <select id="reMode"><option value="cw">시계 방향</option><option value="ccw">시계 반대 방향</option><option value="we">서쪽부터</option><option value="ns">북쪽부터</option><option value="shuffle">무작위</option><option value="none">기호 지우기(점만)</option></select></label> <button class="btn small" type="button" id="reBtn">적용</button></p></div>`);
  box.innerHTML=rows.join('');
  if($('#reBtn',box)){ const cp=(t,msg)=>{ (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(msg),()=>toast('복사하지 못했어요. 글자를 직접 골라 복사해 주세요.')); };
    if(ak) $('#ansCopy',box).onclick=()=>cp(ak.key,'정답을 복사했어요.'); if(ak&&ak.clue) $('#clueCopy',box).onclick=()=>cp(ak.clue,'단서 문구를 복사했어요.');
    $('#reBtn',box).onclick=()=>{ const md=$('#reMode',box).value, n=WG.relabelItems(doc,md); if(!n){ toast('기호를 붙인 항목이 없어요.'); return; } relabel(); renderList(); toast(md==='none'?`기호 ${n}개를 지웠어요. 점만 남았어요.`:`기호 ${n}개를 다시 매겼어요.`); }; }
  $$('.it[data-i]',box).forEach(row=>{
    const it=doc.items[+row.dataset.i];
    const inp=$('input',row); inp.onchange=()=>{ it.lbl=inp.value.trim(); relabel(); renderList(); };
    const mk=$('.mk',row); if(mk&&it.t==='pt') mk.onclick=()=>{ it.mk=it.mk==='dot'?'ring':it.mk==='ring'?'none':'dot'; mk.textContent=MK_ICON[it.mk]; relabel(); renderList(); };
    if(mk&&it.t==='shade') mk.onclick=()=>{ const nx=STY_NEXT[styOf(it)]; WG.applyCountryStyle(doc,it,nx); if(nx==='circle'&&!it.ring){ WG.applyCountryStyle(doc,it,'multi'); toast('이 나라는 점선 원으로 감쌀 수 없어서 섬마다 지시선으로 바꿨어요.'); } relabel(); renderList(); };
    $('.x',row).onclick=()=>{ doc.items.splice(doc.items.indexOf(it),1); relabel(); renderList(); };
  });
  $$('.it[data-r]',box).forEach(row=>{ $('.x',row).onclick=()=>{ doc.layers.rivers=doc.layers.rivers.filter(k=>k!==row.dataset.r); requestRender(); persist(); renderList(); }; });
}

/* ───────── 해석 → 지도 ───────── */
async function show(spec,m){
  const {doc:d,report}=await WG.specToDoc(spec,{style:{font:pref.font,fontPt:pref.fontPt}});
  if(!d.items.length&&!d.layers.rivers.length&&!WG.zoneOn(d)&&!d.layers.plates.on&&!d.layers.relief.on){ setStatus('err','지도에 올릴 장소를 찾지 못했어요. 도시·국가 이름을 직접 적어 보세요.'); return false; }
  doc=d; meta={...m,warnings:report.warnings};
  syncSettings(); render(); renderList(); persist();
  await WG.ensureGlyphs(doc); requestRender();
  return true;
}
function validSpec(o){
  if(!o||typeof o!=='object'||Array.isArray(o)) return null;
  const arr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
  return {region:typeof o.region==='string'?o.region:null,labelSeq:typeof o.labelSeq==='string'?o.labelSeq:null,
    points:arr(o.points),countries:arr(o.countries),areas:arr(o.areas),rivers:Array.isArray(o.rivers)?o.rivers.filter(x=>typeof x==='string'):[],
    lines:o.lines&&typeof o.lines==='object'?o.lines:{},borders:typeof o.borders==='boolean'?o.borders:null,zone:o.zone&&typeof o.zone==='object'?WG.normZone(o.zone):null,plates:o.plates&&typeof o.plates==='object'&&o.plates.on?{on:true,typed:o.plates.typed!==false,names:o.plates.names!==false}:null,relief:o.relief&&typeof o.relief==='object'&&o.relief.on?o.relief:null,seas:o.seas&&typeof o.seas==='object'?{oceans:o.seas.oceans===true,names:Array.isArray(o.seas.names)?o.seas.names.filter(x=>typeof x==='string').slice(0,30):[]}:null,legend:typeof o.legend==='string'?o.legend:null,order:['cw','ccw','we','ns'].includes(o.order)?o.order:null,noLabels:o.noLabels===true,grat:[0,10,15,20,30].includes(o.grat)?o.grat:null,noLbl:o.noLbl===true,answer:typeof o.answer==='string'?o.answer:''};
}
async function run(q,opts){
  const o=opts||{};
  q=String(q||'').trim();
  if(!q){ setStatus('warn','문장을 먼저 적어 주세요.'); $('#qk-q').focus(); return; }
  if(busy) return;
  setStatus('wait','지도 데이터를 준비하는 중이에요.');
  try{ await ready; }catch(e){ setStatus('err','지도 데이터를 불러오지 못했어요. 새로고침해 주세요.'); return; }
  const isEdit=!!(doc&&meta.q&&EDIT_RE.test(q));
  $('#claudeBtn').hidden=true;
  if(!o.force&&!isEdit){
    const t0=performance.now(); const r=WG.parseRules(q);
    if(r.understood){
      if(await show(r.spec,{q,via:'rules',answer:'',unknown:[]})){
        setStatus('ok',`지명을 직접 읽어 바로 그렸어요 (${Math.max(1,Math.round(performance.now()-t0))} ms).`);
        $('#claudeBtn').hidden=!sample;
      }
      return;
    }
    if(!sample){
      if(r.count>0&&await show(r.spec,{q,via:'rules',answer:'',unknown:r.unknown})) setStatus('warn','알아들은 이름만 지도에 올렸어요. 아래 ‘못 알아들은 말’을 확인해 주세요.');
      else setStatus('err','지명을 찾지 못했어요. 도시·국가 이름을 직접 적어 주세요.');
      return;
    }
  }
  if(!sample){ setStatus('err','고치는 요청은 Claude를 부를 수 있을 때만 돼요. 바꾼 내용을 담아 문장을 새로 적어 주세요.'); return; }
  await askClaude(q,doc&&meta.q?WG.docToSpec(doc):null,!!o.force);
}
const ERR={
  rate_limited:'요청이 몰렸어요. 잠시 뒤에 다시 눌러 주세요.',
  invalid_json:'Claude의 답을 지도 정보로 읽지 못했어요. 문장을 조금 더 구체적으로 적어 다시 눌러 주세요.',
  empty_completion:'Claude가 빈 답을 보냈어요. 문장을 조금 바꿔 다시 눌러 주세요.',
  refused:'Claude가 이 요청을 처리하지 않았어요. 표현을 바꿔 주세요.',
  session_expired:'로그인이 만료됐어요. 다시 로그인한 뒤 눌러 주세요.',
  prompt_too_large:'문장이 너무 길어요. 줄여서 다시 눌러 주세요.'
};
const OFF=['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'];
async function askClaude(q,current,force){
  busy=true; $('#go').disabled=true; $('#stopBtn').hidden=false; ctl=new AbortController();
  const t0=Date.now(); const tick=()=>setStatus('wait',`Claude가 문장을 읽는 중이에요… ${Math.round((Date.now()-t0)/1000)}초`);
  tick(); timer=setInterval(tick,1000);
  try{
    const opts={signal:ctl.signal}; if(force) opts.cache=false;
    const raw=await sample.json(WG.buildPrompt(q,current),opts);
    const spec=validSpec(raw); if(!spec) throw {code:'invalid_json'};
    if(await show(spec,{q,via:'claude',answer:spec.answer,unknown:[]})) setStatus('ok',`Claude가 해석했어요 (${Math.round((Date.now()-t0)/1000)}초).`);
  }catch(e){
    const code=e&&e.code;
    if(code==='cancelled') setStatus('idle','멈췄어요.');
    else if(OFF.includes(code)){ sample=null; modeNote(); setStatus('warn','Claude 사용이 허용되지 않아 지명을 직접 읽는 방식으로만 해석할게요.');
      const r=WG.parseRules(q); if(r.count>0) await show(r.spec,{q,via:'rules',answer:'',unknown:r.unknown}); }
    else setStatus('err',ERR[code]||'연결이 잠깐 끊겼어요. 다시 눌러 주세요.');
  }finally{ busy=false; clearInterval(timer); $('#go').disabled=false; $('#stopBtn').hidden=true; ctl=null; }
}

/* ───────── 저장 ───────── */
function persist(){ try{ localStorage.setItem(STORE,JSON.stringify({q:meta.q,doc,meta,pref})); }catch(e){} }
function restore(){ try{ const s=localStorage.getItem(STORE); if(!s) return false; const o=WG.clean(JSON.parse(s)); if(!o||!o.doc) return false;
  doc=WG.normalizeDoc(o.doc); meta={...(o.meta||{}),via:'saved'}; if(o.pref) Object.assign(pref,o.pref); $('#qk-q').value=o.q||''; return true; }catch(e){ return false; } }
const stamp=()=>{ const d=new Date(), p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`; };
async function save(kind){
  if(!doc){ toast('먼저 지도를 만들어 주세요.'); return; }
  try{
    let r;
    if(kind==='png') r=await WG.saveFile(`백지도_${stamp()}.png`,await WG.renderPng(doc,{dpi}),'image/png');
    else if(kind==='svg') r=await WG.saveFile(`백지도_${stamp()}.svg`,await WG.svgString(doc),'image/svg+xml');
    else r=await WG.saveFile(`백지도_${stamp()}.json`,JSON.stringify({app:'wg-blank-map',v:1,doc},null,1),'application/json');
    if(r==='saved') toast(kind==='json'?'저장했어요. 편집기의 ‘내보내기 → 작업 불러오기’로 여세요.':'저장했어요.');
    else if(r==='busy') toast('저장 창이 이미 열려 있어요.');
    else if(r==='failed') toast('이 화면에서는 파일 저장을 할 수 없어요.');
  }catch(e){ toast('파일을 만들지 못했어요.'); }
}

/* ───────── 설정 ───────── */
function syncSettings(){
  $('#qk-fontSel').value=pref.font; $('#qk-fsz').value=pref.fontPt; $('#fszV').textContent=pref.fontPt+' pt';
  if(doc){ $('#qk-fw').value=doc.frame.w; $('#borders').checked=!!doc.layers.borders; }
  const f=FONTS.find(x=>x.key===pref.font)||FONTS[0]; const ok=WG.fontAvailable(f);
  const msg=f.key==='user'?(ok?`불러온 글꼴 ‘${esc(WG.userFont.name)}’ 사용 중`:'글꼴 파일을 아직 불러오지 않았어요'):f.web?(ok?'웹 글꼴을 불러왔어요':'웹 글꼴을 불러오는 중이에요'):(ok?'이 컴퓨터에 설치돼 있어요':'이 컴퓨터에서 찾지 못해 비슷한 명조체로 그려요');
  $('#fontStatus').innerHTML=`<span class="pill ${ok?'ok':'warn'}">${ok?'✓':'!'} ${msg}</span>`;
}
function applyPref(){ if(!doc) return; doc.style.font=pref.font; doc.style.fontPt=pref.fontPt; relabel(); WG.ensureGlyphs(doc).then(requestRender); syncSettings(); }
$('#qk-fontSel').innerHTML=FONTS.map(f=>`<option value="${f.key}">${esc(f.label)}</option>`).join('');
$('#qk-fontSel').onchange=e=>{ pref.font=e.target.value; applyPref(); };
$('#qk-fsz').oninput=e=>{ pref.fontPt=+e.target.value; $('#fszV').textContent=pref.fontPt+' pt'; if(doc){ doc.style.fontPt=pref.fontPt; requestRender(); } };
$('#qk-fsz').onchange=()=>applyPref();
$('#fontFile').onchange=async e=>{ const file=e.target.files[0]; if(!file) return;
  try{ const ff=new FontFace('__UserFont',await file.arrayBuffer()); await ff.load(); document.fonts.add(ff); WG.userFont.name=file.name.replace(/\.[^.]+$/,''); pref.font='user'; applyPref(); toast(`‘${WG.userFont.name}’ 글꼴로 그려요.`); }
  catch(err){ toast('글꼴 파일을 읽지 못했어요. .ttf나 .otf 파일인지 확인해 주세요.'); } e.target.value=''; };
$('#qk-fw').onchange=e=>{ if(!doc) return; const w=Math.max(30,Math.min(190,Math.round(+e.target.value||doc.frame.w))); const k=w/doc.frame.w;
  doc.frame={w,h:Math.round(doc.frame.h*k)}; for(const v of [doc.view,doc.home].filter(Boolean)){ v.scale*=k; v.tx*=k; v.ty*=k; } relabel(); syncSettings(); };
$('#borders').onchange=e=>{ if(!doc) return; doc.layers.borders=e.target.checked; requestRender(); persist(); };
$$('#dpiSeg button').forEach(b=>b.onclick=()=>{ dpi=+b.dataset.v; $$('#dpiSeg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); render(); });

/* ───────── 이벤트 ───────── */
$('#askForm').addEventListener('submit',e=>{ e.preventDefault(); run($('#qk-q').value); });
$('#qk-q').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); run($('#qk-q').value); } });
$('#stopBtn').onclick=()=>{ if(ctl) ctl.abort(); };
$('#claudeBtn').onclick=()=>run($('#qk-q').value,{force:true});
$('#newCtx').onclick=()=>{ meta={q:'',via:'',answer:'',warnings:[],unknown:[]}; renderList(); $('#qk-q').value=''; $('#qk-q').focus(); setStatus('idle','다음 문장은 새 지도로 읽어요. 지금 지도는 새로 만들 때까지 그대로 보여요.'); };
$('#exList').innerHTML=EXAMPLES.map((x,i)=>`<button class="ex" type="button" data-i="${i}">${esc(x.t)}${x.claude?'<span class="tag">Claude</span>':''}</button>`).join('');
$$('.ex').forEach(b=>b.onclick=()=>{ const x=EXAMPLES[+b.dataset.i]; $('#qk-q').value=x.t; run(x.t); });
$('#pngBtn').onclick=()=>save('png'); $('#svgBtn').onclick=()=>save('svg'); $('#jsonBtn').onclick=()=>save('json');
$('#copyBtn').onclick=async()=>{ if(!doc) return; try{ await WG.copyPng(doc,{dpi}); toast('이미지를 복사했어요. 붙여 넣은 뒤 크기는 따로 맞춰 주세요.'); }catch(e){ toast('이 화면에서는 이미지 복사가 막혀 있어요. PNG 저장을 써 주세요.'); } };
$('#editorLink').addEventListener('click',()=>{ if(doc) try{ localStorage.setItem('wgmap-handoff',JSON.stringify({t:Date.now(),doc})); }catch(e){} });
new ResizeObserver(()=>requestRender()).observe(wrap);
const mq=matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener&&mq.addEventListener('change',requestRender);
new MutationObserver(requestRender).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
WG.onData(()=>{ $('#loading').hidden=true; requestRender(); });
if(document.fonts&&document.fonts.addEventListener) document.fonts.addEventListener('loadingdone',()=>{ requestRender(); syncSettings(); });

/* ───────── 시작 ───────── */
async function start(){
  if(!window.d3||!d3.geoMiller||!window.topojson){ $('#loading').textContent='지도 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.'; setStatus('err','지도 라이브러리를 불러오지 못했어요.'); return; }
  ready=Promise.all([WG.loadLod('lo'),WG.loadPlaces()]);
  const restored=restore();
  syncSettings(); modeNote();
  (window.claude&&typeof window.claude.use==='function'?window.claude.use('sample').catch(()=>null):Promise.resolve(null)).then(s=>{ sample=s; sampleKnown=true; modeNote(); });
  try{ await ready; }catch(e){ $('#loading').textContent='지도 데이터를 불러오지 못했어요. 새로고침해 주세요.'; setStatus('err','지도 데이터를 불러오지 못했어요.'); return; }
  $('#loading').hidden=true;
  if(restored&&doc){ await WG.ensureGeo(doc).catch(()=>{}); render(); renderList(); setStatus('idle','지난번에 만든 지도를 다시 열었어요.'); WG.ensureGlyphs(doc).then(requestRender); return; }
  if(ext) return;   // 기후 탭에서 넘어온 요청이 먼저 그린다
  $('#qk-q').value=EXAMPLES[0].t;
  const r=WG.parseRules(EXAMPLES[0].t);
  await show(r.spec,{q:EXAMPLES[0].t,via:'rules',answer:'',unknown:[]});
  setStatus('idle','예시 문장으로 만든 지도예요. 문장을 바꿔 ‘지도 만들기’를 누르세요.');
}
let ext=false;
const started=start();
/* 통합판: 기후 탭에서 넘긴 지점으로 지도 만들기 */
async function fromSpec(spec,info){
  ext=true; try{ await started; await ready; }catch(e){ return false; }
  const sp=validSpec(spec); if(!sp) return false; const q=(info&&info.q)||''; $('#qk-q').value=q;
  const fromTable=!!(info&&info.from&&info.from!=='climate');
  const ok=await show(sp,{q,via:fromTable?'table':'climate',answer:'',unknown:[]});
  if(ok) setStatus('ok',fromTable?`${(info&&info.fromName)||'표'}의 나라를 칠한 지도를 만들었어요. 문장을 고쳐 다시 만들 수도 있어요.`:'기후 탭의 지점으로 지도를 만들었어요. 문장을 고쳐 다시 만들 수도 있어요.');
  return ok;
}
/* 통합판에서 편집기로 넘길 때 */
return {getDoc:()=>doc,fromSpec};
});