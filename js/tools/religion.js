/* 종교 그래프 편집기: 자료 불러오기 · 표 · 설정 패널 · 미리 보기 */
HUB.def('religion',function(ROOT){
'use strict';
const KEY='wgreligion-editor-v1', UIKEY='wgreligion-editor-ui-v1';
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
try{ const el=document.getElementById('rg-data'); if(el) RG.setData(JSON.parse(el.textContent)); }catch(e){ /* 자료 없이도 붙여넣기는 된다 */ }
const HAS=!!RG.data();
const SRC_TXT='출처: Pew Research Center(2025), 2010·2020년 세계 종교 인구 추정.';
const cv=$('#cv');
function exampleDoc(){
  const d=RG.freshDoc('stack'); if(!HAS) return d;
  /* 작업용 엑셀 ‘국가 종교별 신자수 비율’ 시트와 같은 그림 */
  RG.presetComp(d,{year:'2020',rows:['말레이시아','스리랑카','네팔','방글라데시'],keys:['mus','hin','bud'],other:true});
  EG.mask(d.data.cols,'latin',c=>!c.other); d.data.rows.forEach((r,i)=>r.lbl=i<3?['(가)','(나)','(다)'][i]:'');
  const F=['dark','light','fs']; d.data.cols.forEach((c,j)=>{ c.fill=c.other?'white':F[j]; });
  Object.assign(d.stack,{dir:'v',grid:true}); d.stack.v=Object.assign({},d.stack.v,{barW:9,gap:8,len:44});
  d.meta.title='<국가별 종교 신자 비율>'; return d;
}
function loadLocal(){ try{ const s=localStorage.getItem(KEY); if(!s) return null; const d=JSON.parse(s); return d&&d.app==='religion'?RG.normalizeDoc(d):null; }catch(e){ return null; } }
function saveLocal(){ try{ localStorage.setItem(KEY,JSON.stringify(doc)); localStorage.setItem(UIKEY,JSON.stringify(ui)); }catch(e){} }
let doc=loadLocal()||exampleDoc();
let ui=(()=>{ try{ return GG.clean(JSON.parse(localStorage.getItem(UIKEY)||'null')); }catch(e){ return null; } })()||{};
ui=Object.assign({pb:'comp',comp:{year:'2020',scheme:'cont',rows:['우즈베키스탄','인도','미얀마','필리핀'],keys:['chr','mus','hin','bud'],other:true,val:'pct'},
  dist:{year:'2020',scheme:'cont',keys:['chr','mus','hin','bud']},top:{keys:['mus','hin'],year:'2020',n:3,by:'num',other:true},paste:{text:'',unit:'%'}},ui);
let dpi=600, raf=0, axisRefresh=[];

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('on'),2600); }
let MS={sync(){},request:()=>null};
function changed(what){
  const fc=EG.applyFills(doc);
  saveLocal();
  if(fc&&!['all','tb','tbo'].includes(what)) renderTable();
  if(what==='all'){ renderTable(); renderOpts(); renderPB(); }
  else if(what==='opts') renderOpts();
  else if(what==='tb') renderTable();
  else if(what==='tbo'){ renderTable(); renderOpts(); }
  MS.sync();
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
  el.addEventListener('input',()=>{ const v=parseFloat(el.value); if(isFinite(v)&&(o.min==null||v>=o.min)&&(o.max==null||v<=o.max)){ set(v); changed(o.rebuild); } }); return el; }
function chk(label,get,set,rebuild){ const i=h('input',{type:'checkbox'}); i.checked=!!get(); i.addEventListener('change',()=>{ set(i.checked); changed(rebuild); }); return h('label',{class:'check'},i,label); }
function sel(opts,get,set,rebuild,aria){ const s=h('select',{'aria-label':aria||''}); for(const [v,t] of opts) s.append(h('option',{value:v},t)); s.value=String(get()); s.addEventListener('change',()=>{ set(s.value); changed(rebuild); }); return s; }
function txt(get,set,ph,aria,rebuild){ const i=h('input',{type:'text',value:get()||'',placeholder:ph||'','aria-label':aria||ph||''}); i.addEventListener('input',()=>{ set(i.value); changed(rebuild); }); return i; }
function range(get,set,min,max,step,fmt){ const v=h('span',{class:'val'},fmt(get())); const i=h('input',{type:'range',min,max,step,value:get()}); i.addEventListener('input',()=>{ set(+i.value); v.textContent=fmt(+i.value); changed(); }); return [i,v]; }
function axisHead(){ return h('div',{class:'axis-head'},h('span'),h('span'),h('span',null,'최솟값'),h('span',null,'최댓값'),h('span',null,'눈금 간격')); }
function lastAxes(){ return Object.assign({},EG.lastAxes(),RG.lastAxes()); }
function axisCtl(label,conf,key){
  const auto=h('input',{type:'checkbox'}); auto.checked=conf.auto!==false;
  const lo=h('input',{type:'number',step:'any','aria-label':label+' 최솟값'}), hi=h('input',{type:'number',step:'any','aria-label':label+' 최댓값'}), st=h('input',{type:'number',step:'any',min:0,'aria-label':label+' 눈금 간격'});
  const fill=()=>{ const a=conf.auto!==false?(lastAxes()[key]||conf):conf; lo.value=+(+a.lo).toFixed(3); hi.value=+(+a.hi).toFixed(3); st.value=+(+a.step).toFixed(3); lo.disabled=hi.disabled=st.disabled=conf.auto!==false; };
  auto.addEventListener('change',()=>{ if(!auto.checked){ const a=lastAxes()[key]; if(a){ conf.lo=a.lo; conf.hi=a.hi; conf.step=a.step; } } conf.auto=auto.checked; fill(); changed(); });
  const on=(el,k)=>el.addEventListener('input',()=>{ const v=parseFloat(el.value); if(isFinite(v)){ conf[k]=v; changed(); } });
  on(lo,'lo'); on(hi,'hi'); on(st,'step'); axisRefresh.push(fill); fill();
  return h('div',{class:'axis'},h('span',{class:'lab'},label),h('label',{class:'check'},auto,'자동'),lo,hi,st);
}
const fillSel=(get,set,aria)=>sel(EG.FILL_KEYS.map(k=>[k,EG.FILL_KO[k]]),get,set,null,aria);
function pbMsg(kind,text){ const m=$('#pbMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }

/* 표를 새로 만들면 누적 막대 모양을 일반 비율 막대로 되돌린다 */
function plainStack(){ const o=doc.stack; o.norm=true; o.sortSeg=false; o.inLbl='none'; o.legend='bottom'; o.frame=true; o.axis.auto=true; o.trans=false; }
/* ───────── 자료 불러오기 ───────── */
function placePicker(list,pool,onChange,sc){
  const box=h('div',{class:'search'}); const chips=h('div',{class:'chips'});
  const draw=()=>{ chips.textContent=''; list.forEach((n,i)=>{ const x=h('button',{type:'button','aria-label':`${n} 빼기`},'×'); x.addEventListener('click',()=>{ list.splice(i,1); draw(); onChange(); }); chips.append(h('span',{class:'chip'},n,x)); });
    if(!list.length) chips.append(h('span',{class:'sub'},'아직 고른 곳이 없어요.')); };
  const inp=h('input',{type:'search',autocomplete:'off',placeholder:'나라·지역 이름 (예: 말레이시아)','aria-label':'나라·지역 찾기'}); const ul=h('ul',{class:'results'});
  const show=()=>{ ul.textContent=''; const q=inp.value.trim(); if(!q) return; const P=pool(); const a=RG.aliasFind(q);
    const hits=P.filter(n=>n.includes(q)||n===a).slice(0,8);
    for(const n of hits){ const b=h('button',{type:'button',disabled:list.includes(n)},h('span',null,n),h('small',null,RG.isAgg(n)?'지역 합계':RG.regionOf(n,sc()))); b.addEventListener('click',()=>{ if(!list.includes(n)) list.push(n); inp.value=''; ul.textContent=''; draw(); onChange(); inp.focus(); }); ul.append(h('li',null,b)); }
    if(!hits.length) ul.append(h('li',null,h('button',{type:'button',disabled:true},`‘${q}’은(는) 이 자료에 없어요.`))); };
  inp.addEventListener('input',show); inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const b=ul.querySelector('button:not([disabled])'); if(b){ e.preventDefault(); b.click(); } } });
  draw(); box.append(chips,inp,ul); return box;
}
function regionAdder(list,sc,onChange){
  const s=h('select',{'aria-label':'지역의 나라 한꺼번에 넣기'}); s.append(h('option',{value:''},'지역 나라 한꺼번에…'));
  for(const r of RG.regions(sc())) s.append(h('option',{value:r},r));
  s.addEventListener('change',()=>{ const R=s.value; if(!R) return; for(const n of RG.countries()) if(RG.regionOf(n,sc())===R&&!list.includes(n)) list.push(n); s.value=''; onChange(true); }); return s;
}
function relChecks(keys,only){
  const g=h('div',{class:'ckgrid'});
  for(const k of (only||RG.RKEYS)){ const i=h('input',{type:'checkbox'}); i.checked=keys.includes(k); i.addEventListener('change',()=>{ const j=keys.indexOf(k); if(i.checked&&j<0) keys.push(k); if(!i.checked&&j>=0) keys.splice(j,1); saveLocal(); });
    g.append(h('label',{class:'check'},i,RG.REL[k])); }
  return g;
}
const yearSeg=(get,set)=>seg(RG.years().map(y=>[y,y+'년']),()=>String(get()),v=>{ set(v); saveLocal(); },'none');
function schemeRow(o,re){ return [row('지역 구분',sel(Object.entries(RG.SCHEME).map(([k,v])=>[k,v.name]),()=>o.scheme,v=>{ o.scheme=v; saveLocal(); if(re) renderPB(); },'none','지역 구분')),h('p',{class:'src-note'},RG.SCHEME[o.scheme].help)]; }
let lastType=doc.preset&&doc.preset.type;
function typeChanged(){ const t=doc.preset&&doc.preset.type; if(t!==lastType){ doc.meta.title=''; lastType=t; } }
function afterBuild(){ if(doc.kind==='rank'){ const n=RG.pruneForRank(doc); if(n) return ` 순위에 나오지 않는 종교 ${n}개는 표에서 뺐어요.`; } return ''; }
function renderPB(){
  const B=$('#pbBody'); B.textContent='';
  if(!HAS&&ui.pb!=='paste') ui.pb='paste';
  syncPB();
  if(ui.pb==='comp'){ const c=ui.comp; const sc=()=>c.scheme;
    B.append(row('연도',yearSeg(()=>c.year,v=>c.year=v)),...schemeRow(c,true),
      h('div',{class:'row'},h('span',{class:'lab'},'나라·지역'),regionAdder(c.rows,sc,()=>renderPB())),
      placePicker(c.rows,()=>RG.entities(c.scheme),()=>saveLocal(),sc),
      row('종교'),relChecks(c.keys),row('',chk('고르지 않은 종교는 ‘기타’로 합치기',()=>c.other,v=>{ c.other=v; },'none')),
      row('값',seg([['pct','인구 대비 비율(%)'],['num','신자 수(백만 명)']],()=>c.val,v=>{ c.val=v; saveLocal(); },'none')),
      h('p',{class:'sub'},'체크한 순서대로 열이 생겨요. 순서는 아래 표에서 ◀ ▶로 바꿀 수 있어요. 순위 표·삼각 그래프도 이 표로 그려요.'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!c.rows.length){ pbMsg('err','나라나 지역을 하나 이상 골라 주세요.'); return; } if(!c.keys.length){ pbMsg('err','종교를 하나 이상 골라 주세요.'); return; }
      const r=RG.presetComp(doc,{year:c.year,rows:c.rows,keys:c.keys,other:c.other,val:c.val,scheme:c.scheme}); plainStack(); typeChanged();
      if(doc.kind==='bars') doc.bars.by='col';
      const extra=afterBuild();
      pbMsg(r.missing.length?'warn':'ok',`${r.year}년 값으로 표를 만들었어요 (${doc.data.unit}).${r.missing.length?` ${r.missing.join(', ')}은(는) 자료에 없어 빠졌어요.`:''}${extra} ${SRC_TXT}`); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='dist'){ const d=ui.dist;
    B.append(row('연도',yearSeg(()=>d.year,v=>d.year=v)),...schemeRow(d,true),row('종교'),relChecks(d.keys),
      h('p',{class:'sub'},'행은 종교, 열은 지역이에요. 값은 종교마다 전 세계 신자 수에서 각 지역이 차지하는 비율(%)이라 행의 합이 100이에요.'));
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!d.keys.length){ pbMsg('err','종교를 하나 이상 골라 주세요.'); return; }
      RG.presetDist(doc,{year:d.year,keys:d.keys,scheme:d.scheme}); plainStack(); typeChanged();
      if(doc.kind==='bars') doc.bars.by='row'; if(doc.kind==='rank'||doc.kind==='tri'||doc.kind==='donut') doc.kind='stack';
      pbMsg('ok',`행은 종교, 열은 ${RG.SCHEME[d.scheme].short}이에요. ${SRC_TXT}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='top'){ const t=ui.top;
    B.append(row('종교'),relChecks(t.keys,['chr','mus','hin','bud','jew']),
      row('연도',yearSeg(()=>t.year,v=>t.year=v),h('span',{class:'unit'},'상위'),num(()=>t.n,v=>t.n=v,{min:1,max:10,step:1,aria:'상위 몇 개국',rebuild:'none'}),h('span',{class:'unit'},'개국')),
      row('기준',seg([['num','신자 수'],['pct','나라 안 신자 비율']],()=>t.by,v=>{ t.by=v; saveLocal(); },'none')),
      h('p',{class:'sub'},t.by==='pct'?'나라 인구에서 그 종교 신자가 차지하는 비율이 높은 나라예요. 인구가 아주 적은 나라도 들어가요.':'값은 종교마다 전 세계 신자 수에서 그 나라가 차지하는 비율(%)이에요.'),
      t.by==='num'?row('',chk('나머지는 ‘기타’로',()=>t.other,v=>t.other=v,'none')):null);
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{
      if(!t.keys.length){ pbMsg('err','종교를 하나 이상 골라 주세요.'); return; }
      RG.presetTop(doc,{keys:t.keys,year:t.year,n:t.n,by:t.by,other:t.other}); doc.stack.axis.auto=true; doc.stack.trans=false; typeChanged();
      if(t.by==='num'){ doc.data.cols.forEach(c=>c.fill=c.other?'white':'light'); Object.assign(doc.stack,{dir:'h',grid:false,inLbl:'name',legend:'none',sortSeg:true,norm:true,frame:true}); doc.stack.h=Object.assign({},doc.stack.h,{barW:4.6,gap:7.5}); if(!['stack','tb','bars','group'].includes(doc.kind)) doc.kind='stack'; }
      else { if(!['tb','bars','group'].includes(doc.kind)) doc.kind='bars'; doc.bars.by='row'; }
      pbMsg('ok',`행은 종교, 열은 나라예요. ${SRC_TXT}`); syncTop(); changed('all'); });
    B.append(h('div',{class:'paste-row'},go)); }
  if(ui.pb==='paste'){ const p=ui.paste;
    const ta=h('textarea',{spellcheck:'false',placeholder:'엑셀에서 표를 복사해 붙여 넣으세요.\n첫 줄: (빈칸) 종교1 종교2 …\n다음 줄부터: 나라 이름 값 값 …','aria-label':'붙여 넣을 표'}); ta.value=p.text||''; ta.addEventListener('input',()=>{ p.text=ta.value; saveLocal(); });
    const unit=h('input',{type:'text',value:p.unit||'',placeholder:'단위 (예: %, 백만 명)','aria-label':'단위'}); unit.addEventListener('input',()=>{ p.unit=unit.value; saveLocal(); });
    const go=h('button',{class:'btn primary',type:'button'},'표 만들기'); go.addEventListener('click',()=>{ const r=EG.parseTable(ta.value); if(r.error){ pbMsg('err',r.error); return; }
      EG.setTable(doc,r.rows.map(n=>({name:n})),r.cols.map(n=>({name:n,other:/^기타$/.test(n.trim())})),r.v); plainStack(); Object.assign(doc.data,{unit:p.unit||'',measure:'신자 수',note:'',noteSum:false,rowNoun:'국가',itemNoun:'종교'}); doc.preset={type:'paste'}; doc.meta.year='';
      pbMsg(r.bad?'warn':'ok',`${r.rows.length}행 × ${r.cols.length}열을 읽었어요.${r.bad?` 숫자가 아닌 칸 ${r.bad}개는 빈칸으로 두었어요.`:''} 출처와 연도는 오른쪽 ‘제목·연도·출처’에 적어 주세요.`); changed('all'); });
    B.append(ta,h('div',{class:'paste-row'},unit,go),h('p',{class:'sub'},'통계청·각국 인구 조사 등 다른 자료는 여기에 붙여 넣어 쓰면 돼요. ‘기타’라는 이름의 열은 기타 칸으로 처리해요.')); }
}
const syncPB=bindSeg($('#pbSeg'),()=>ui.pb,v=>{ ui.pb=v; pbMsg('',''); saveLocal(); renderPB(); });

/* ───────── 표 ───────── */
function renderTable(){
  const D=doc.data; const T=$('#dtab'); T.textContent=''; const tools=$('#tbTools'); tools.textContent='';
  const empty=!D.rows.length||!D.cols.length; $('#tbEmpty').hidden=!empty; $('#dtabWrap').hidden=empty;
  $('#tbInfo').textContent=empty?'':`${D.rows.length}행 × ${D.cols.length}열${D.unit?` · 단위 ${D.unit}`:''}`;
  const unit=h('input',{type:'text',value:D.unit||'',placeholder:'단위','aria-label':'단위',style:'width:80px;flex:none'}); unit.addEventListener('input',()=>{ D.unit=unit.value; changed(); });
  const addR=h('button',{class:'btn small',type:'button'},'+ 행'); addR.addEventListener('click',()=>{ D.rows.push({id:GG.uid(),name:`국가 ${D.rows.length+1}`,lbl:'',fill:EG.PALETTE[D.rows.length%EG.PALETTE.length]}); D.v.push(D.cols.map(()=>null)); EG.labelNew(D.rows,D.rows[D.rows.length-1],x=>!x.other); changed('tb'); });
  const addC=h('button',{class:'btn small',type:'button'},'+ 열'); addC.addEventListener('click',()=>{ const oi=D.cols.findIndex(c=>c.other); const at=oi>=0?oi:D.cols.length; D.cols.splice(at,0,{id:GG.uid(),name:`종교 ${D.cols.length+1}`,lbl:'',fill:EG.PALETTE[(at+1)%EG.PALETTE.length]}); D.v.forEach(r=>r.splice(at,0,null)); EG.labelNew(D.cols,D.cols[at],x=>!x.other); changed('tb'); });
  tools.append(h('div',{class:'row'},h('span',{class:'lab'},'단위'),unit,addR,addC));
  const maskBtns=(list,which)=>{ const box=h('div',{class:'mini'});
    const mk=(t,fn,on)=>{ const b=h('button',{class:'btn small'+(on?' on':''),type:'button','aria-pressed':on==null?null:String(!!on)},t); b.addEventListener('click',()=>{ fn(); changed('tbo'); }); return b; };
    const cur=EG.seqOfList(list,x=>!x.other); box.append(...[['A','latin'],['(가)','gana'],['㉠','circ']].map(([t,q])=>mk(t,()=>EG.mask(list,q,x=>!x.other),cur===q)),mk('이름',()=>list.forEach(x=>x.lbl=''),!list.some(x=>x.lbl)));
    if(which==='cols') box.append(mk('순서 섞기',()=>shuffleCols()));
    if(which==='rows') box.append(mk('순서 섞기',()=>shuffleRows()));
    return box; };
  tools.append(h('div',{class:'row'},h('span',{class:'lab'},'열 라벨'),maskBtns(D.cols,'cols')),h('div',{class:'row'},h('span',{class:'lab'},'행 라벨'),maskBtns(D.rows,'rows')));
  { const fm=h('select',{'aria-label':'무늬 매기는 방식'}); [['ramp','비율 큰 것부터 연하게 → 진하게 → 빗금'],['rampR','비율 큰 것부터 진하게 → 연하게 → 빗금'],['manual','직접 고르기 (지금 무늬 그대로)']].forEach(([v,t])=>fm.append(h('option',{value:v},t)));
    fm.value=D.fillMode==='ramp'||D.fillMode==='rampR'?D.fillMode:'manual'; fm.addEventListener('change',()=>{ D.fillMode=fm.value; changed('tbo'); });
    tools.append(h('div',{class:'row'},h('span',{class:'lab'},'무늬'),fm)); }
  if(empty) return;
  const thead=h('thead'); const hr=h('tr'); hr.append(h('th',{class:'rh corner'},'라벨 · 이름',h('br'),'(행 무늬는 행열을 바꿀 때)'));
  D.cols.forEach((c,j)=>{ const nm=h('input',{class:'nm',value:c.name,'aria-label':`열 ${j+1} 이름`}); nm.addEventListener('input',()=>{ c.name=nm.value; changed(); refreshHint(); });
    const lb=h('input',{class:'lb',value:c.lbl||'',placeholder:'라벨','aria-label':`${c.name} 라벨`}); lb.addEventListener('input',()=>{ c.lbl=lb.value; changed(); refreshHint(); });
    const fs=fillSel(()=>c.fill||'white',v=>{ c.fill=v; doc.data.fillMode='manual'; },`${c.name} 무늬`);
    const mv=d=>{ const k=j+d; if(k<0||k>=D.cols.length) return; [D.cols[j],D.cols[k]]=[D.cols[k],D.cols[j]]; EG.swapKeep(D.cols[j],D.cols[k]); D.v.forEach(r=>{ [r[j],r[k]]=[r[k],r[j]]; }); changed('tb'); };
    const l=h('button',{class:'ico',type:'button',title:'왼쪽으로','aria-label':'왼쪽으로',disabled:j===0},'◀'); l.addEventListener('click',()=>mv(-1));
    const r=h('button',{class:'ico',type:'button',title:'오른쪽으로','aria-label':'오른쪽으로',disabled:j===D.cols.length-1},'▶'); r.addEventListener('click',()=>mv(1));
    const x=h('button',{class:'ico x',type:'button',title:'열 지우기','aria-label':`${c.name} 열 지우기`},'×'); x.addEventListener('click',()=>{ D.cols.splice(j,1); D.v.forEach(rw=>rw.splice(j,1)); EG.relabelKeep(D.cols,x=>!x.other); changed('tbo'); });
    const hid=h('input',{type:'checkbox'}); hid.checked=!c.hide; hid.addEventListener('change',()=>{ c.hide=!hid.checked; changed('tbo'); });
    const oth=h('input',{type:'checkbox'}); oth.checked=!!c.other; oth.addEventListener('change',()=>{ c.other=oth.checked; changed('tbo'); });
    hr.append(h('th',{class:c.hide?'hid':null},h('div',{class:'colh'},nm,h('div',{class:'tag'},lb,fs),h('div',{class:'tag'},h('label',{title:'그래프에 그리기'},hid,'보임'),h('label',{title:'숨긴 열의 값을 이 열에 더해요'},oth,'기타')),h('div',{class:'tools'},l,r,x)))); });
  thead.append(hr); T.append(thead);
  const tb=h('tbody');
  D.rows.forEach((rw,i)=>{ const tr=h('tr',{class:rw.hide?'hid':null});
    const lb=h('input',{class:'lb',value:rw.lbl||'',placeholder:'라벨','aria-label':`${rw.name} 라벨`}); lb.addEventListener('input',()=>{ rw.lbl=lb.value; changed(); refreshHint(); });
    const nm=h('input',{class:'nm',value:rw.name,'aria-label':`행 ${i+1} 이름`}); nm.addEventListener('input',()=>{ rw.name=nm.value; changed(); refreshHint(); });
    const mv=d=>{ const k=i+d; if(k<0||k>=D.rows.length) return; [D.rows[i],D.rows[k]]=[D.rows[k],D.rows[i]]; EG.swapKeep(D.rows[i],D.rows[k]); [D.v[i],D.v[k]]=[D.v[k],D.v[i]]; changed('tb'); };
    const up=h('button',{class:'ico',type:'button',title:'위로','aria-label':'위로',disabled:i===0},'↑'); up.addEventListener('click',()=>mv(-1));
    const dn=h('button',{class:'ico',type:'button',title:'아래로','aria-label':'아래로',disabled:i===D.rows.length-1},'↓'); dn.addEventListener('click',()=>mv(1));
    const x=h('button',{class:'ico x',type:'button',title:'행 지우기','aria-label':`${rw.name} 행 지우기`},'×'); x.addEventListener('click',()=>{ D.rows.splice(i,1); D.v.splice(i,1); EG.relabelKeep(D.rows,x=>!x.other); changed('tbo'); });
    const hid=h('input',{type:'checkbox',title:'그래프에 그리기'}); hid.checked=!rw.hide; hid.addEventListener('change',()=>{ rw.hide=!hid.checked; changed('tbo'); });
    const fs=fillSel(()=>rw.fill||'white',v=>{ rw.fill=v; doc.data.fillMode='manual'; },`${rw.name} 무늬`);
    tr.append(h('th',{class:'rh'},h('div',{class:'rowh'},lb,nm,h('span',{class:'tools'},up,dn,x)),h('div',{class:'tag'},fs,h('label',null,hid,'보임'))));
    D.cols.forEach((c,j)=>{ const v=D.v[i][j]; const inp=h('input',{class:'v'+(GG.fin(v)?'':' bad'),type:'text',inputmode:'decimal',value:GG.fin(v)?String(+v.toFixed(4)):'','aria-label':`${rw.name} ${c.name}`});
      inp.addEventListener('input',()=>{ const t=inp.value.trim().replace(/[−–]/g,'-').replace(/,/g,''); const n=t===''?null:+t; const bad=t!==''&&!isFinite(n); inp.classList.toggle('bad',bad||t===''); D.v[i][j]=bad?null:n; changed(); });
      tr.append(h('td',null,inp)); });
    tb.append(tr); });
  T.append(tb);
}
function shuffleCols(){ const D=doc.data; const idx=D.cols.map((_,j)=>j).filter(j=>!D.cols[j].other); const oth=D.cols.map((_,j)=>j).filter(j=>D.cols[j].other);
  for(let i=idx.length-1;i>0;i--){ const k=Math.floor(Math.random()*(i+1)); [idx[i],idx[k]]=[idx[k],idx[i]]; }
  const perm=[...idx,...oth]; const lbls=D.cols.filter(c=>!c.other).map(c=>c.lbl); const fills=D.cols.filter(c=>!c.other).map(c=>c.fill);
  D.cols=perm.map(j=>D.cols[j]); D.v=D.v.map(r=>perm.map(j=>r[j])); let k=0; D.cols.forEach(c=>{ if(!c.other){ c.lbl=lbls[k]; c.fill=fills[k]; k++; } }); }
function shuffleRows(){ const D=doc.data; const idx=D.rows.map((_,i)=>i); for(let i=idx.length-1;i>0;i--){ const k=Math.floor(Math.random()*(i+1)); [idx[i],idx[k]]=[idx[k],idx[i]]; }
  const lbls=D.rows.map(r=>r.lbl); D.rows=idx.map(i=>D.rows[i]); D.v=idx.map(i=>D.v[i]); D.rows.forEach((r,i)=>r.lbl=lbls[i]); }

/* ───────── 문장으로 만들기 ───────── */
const sampleCap=(window.claude&&typeof window.claude.use==='function')?window.claude.use('sample').catch(()=>null):Promise.resolve(null);
let undoDoc=null;
function askMsg(kind,text){ const m=$('#askMsg'); m.className='msg '+kind; m.textContent=text; m.hidden=!text; }
function describe(d){
  const D=d.data; const R=D.rows.filter(r=>!r.hide), C=D.cols.filter(c=>!c.hide);
  let t=`${RG.KIND_KO[d.kind]} · ${R.map(r=>r.lbl&&r.lbl!==r.name?`${r.lbl} ${r.name}`:r.name).join(', ')}`;
  t+=` · ${C.map(c=>c.lbl&&c.lbl!==c.name?`${c.lbl} ${c.name}`:c.name).join(', ')}`;
  if(d.preset&&d.preset.year) t+=` · ${d.preset.year}년`;
  return t;
}
function symFind(n){ const t=String(n||'').trim(); if(!t) return null; const D=doc.data;
  if(D.cols.some(c=>c.name===t)||D.rows.some(r=>r.name===t||(Array.isArray(r.top)&&r.top.includes(t)))) return t;
  return RG.aliasFind(t)||Object.values(RG.REL).includes(t)?t:null; }
function parseSym(t){ const o={}; String(t||'').split(/[,，;]/).forEach(x=>{ const m=x.trim().match(/^(.+?)\s*(?:=|:|→|\s)\s*(\S+)$/); if(m){ const n=symFind(m[1])||m[1].trim(); o[n]=m[2]; } }); return Object.keys(o).length?o:undefined; }
function symText(o){ return o?Object.entries(o).map(([n,s])=>`${n}=${s}`).join(', '):''; }
function symNote(pairs,miss){ const ok=pairs.filter(([n])=>!miss.includes(n)); let t='';
  if(ok.length) t+=` ${ok.map(([n,s])=>`${n} → ${s}`).join(', ')}.`; if(miss.length) t+=` ${EG.josa(miss.join(', '),'은','는')} 표에 없어 기호를 붙이지 못했어요.`; return t; }
async function run(){
  if(!HAS){ askMsg('err','Pew 자료가 실려 있지 않아 문장으로 만들 수 없어요. ‘붙여넣기’로 표를 넣어 주세요.'); return; }
  const q0=$('#q').value.trim(); if(!q0){ $('#q').focus(); return; }
  /* ‘미국은 A, 중국은 B’처럼 기호를 정한 부분은 떼어 두었다가 표를 만든 뒤 붙인다. 기호만 적었으면 지금 표에 바로 붙인다 */
  const SY=EG.symbolsIn(q0,symFind); const q=SY.pairs.length?SY.stripped:q0;
  if(SY.pairs.length&&!/[가-힣A-Za-z0-9]/.test(q)){ undoDoc=JSON.stringify(doc); const miss=EG.applySymbols(doc,SY.pairs); changed('all'); refreshHint(); askMsg(miss.length?'warn':'ok',symNote(SY.pairs,miss).trim()); $('#undoBtn').hidden=false; return; }
  const r=RG.parseRequest(q); let spec=r.spec, via='규칙', missing=[];
  if(!r.understood){ const sample=await sampleCap;
    if(sample){ askMsg('warn','문장을 Claude에게 물어보는 중이에요…'); $('#goBtn').disabled=true;
      try{ const out=await sample.json(RG.buildPrompt(q),{modelTier:'quick'}); const sp=RG.cleanSpec(out); if(sp){ spec=sp; via='Claude'; missing=Array.isArray(out.missing)?out.missing.map(String):[]; } }
      catch(e){ /* 규칙 해석으로 */ } finally{ $('#goBtn').disabled=false; } } }
  if(via==='규칙'&&!r.understood){ askMsg('err','무엇을 그릴지 알아보지 못했어요. 나라 이름과 그래프 종류(예: 신자 수 상위 2개 종교 표, 종교 구성 원그래프, 대륙별 분포 누적 막대)를 함께 적어 주세요.'); return; }
  undoDoc=JSON.stringify(doc);
  const {doc:d,info}=RG.specToDoc(spec,doc); const symMiss=SY.pairs.length?EG.applySymbols(d,SY.pairs):[];
  if(!d.data.rows.length){ askMsg('err','고른 나라가 이 자료에 없어요. 나라 이름을 확인해 주세요.'); undoDoc=null; return; }
  doc=RG.normalizeDoc(d); lastType=doc.preset&&doc.preset.type; syncTop(); changed('all');
  const miss=[...new Set([...(info.missing||[]),...missing])];
  let text=describe(doc)+'.'; if(info.yearNote) text+=' '+info.yearNote; if(miss.length) text+=` ${miss.join(', ')}은(는) 자료에 없어 빠졌어요.`;
  if(info.pruned) text+=` 순위에 나오지 않는 종교 ${info.pruned}개는 뺐어요.`;
  if(SY.pairs.length) text+=symNote(SY.pairs,symMiss);
  if(r.notes.length&&via==='규칙') text+=' '+r.notes.join(' '); if(via==='Claude') text+=' (Claude가 해석)';
  askMsg(miss.length||info.yearNote?'warn':'ok',text); $('#undoBtn').hidden=false;
}
$('#goBtn').addEventListener('click',run);
$('#q').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); run(); } });
$('#undoBtn').addEventListener('click',()=>{ if(!undoDoc) return; doc=RG.normalizeDoc(JSON.parse(undoDoc)); undoDoc=null; $('#undoBtn').hidden=true; syncTop(); changed('all'); askMsg('ok','문장으로 만들기 전으로 되돌렸어요.'); });
const EXAMPLES=[
  '우즈베키스탄, 인도, 미얀마, 필리핀의 신자 수 상위 2개 종교 표, 종교는 A~D, 국가는 (가)~(라)',
  '인도, 방글라데시, 스리랑카의 신자 수 1, 2위 종교 표, 순위가 행, 종교는 A~C, 국가는 (가)~(다)',
  '말레이시아, 스리랑카, 네팔의 신자 수 1위와 2위 교차 표, 종교는 A~C, 국가는 (가)~(다)',
  '대륙별 크리스트교, 이슬람교, 힌두교, 불교 신자 분포 누적 막대, 종교는 (가)~(라)',
  '크리스트교, 이슬람교, 힌두교, 불교의 대륙별 분포를 종교마다 따로 막대로',
  '인도네시아, 인도, 브라질의 종교 구성 원그래프, 국가는 (가)~(다)',
  '인도, 파키스탄, 방글라데시, 스리랑카, 네팔, 말레이시아의 이슬람교·힌두교·불교 삼각 그래프, 국가는 A~F',
  '이슬람교, 힌두교, 불교 신자 수 상위 3개국',
  '나이지리아, 에티오피아, 이집트, 수단의 크리스트교와 이슬람교 신자 비율 묶은 막대 (2020)',
  '레바논, 이스라엘, 키프로스의 종교 구성 세로 막대, 이슬람교·유대교·크리스트교는 A~C'
];
function renderExamples(){ const box=$('#exList'); box.textContent='';
  EXAMPLES.forEach(q=>{ const b=h('button',{class:'ex',type:'button'},q); b.addEventListener('click',()=>{ $('#q').value=q; run(); }); box.append(b); }); }

/* ───────── 설정 패널 ───────── */
function sec(title,...kids){ return h('section',{class:'sec'},h('h2',{class:'sec-title'},title),...kids); }
const IN_LBL=[['none','없음'],['name','이름'],['value','비율'],['both','둘 다']];
const MK_OPTS=Object.entries(GG.MARKS).filter(([k])=>k!=='none'&&k!=='gd'&&k!=='gs');
function renderOpts(){
  axisRefresh=[]; const P=$('#opts'); P.textContent=''; const k=doc.kind;
  if(k==='rank'){ const o=doc.rank; const info=RG.rankInfo(doc);
    const prune=h('button',{class:'btn small',type:'button'},'순위에 안 나오는 종교 열 빼기'); prune.addEventListener('click',()=>{ const n=RG.pruneForRank(doc); toast(n?`종교 열 ${n}개를 뺐어요.`:'뺄 열이 없어요.'); changed('all'); });
    P.append(sec('순위 표',
      (()=>{ const el=seg([['country','행이 국가'],['rank','행이 순위'],['matrix','1위 × 2위']],()=>o.layout,v=>{ o.layout=v; if(v==='matrix') o.n=2; },'opts'); el.classList.add('pbseg'); return el; })(),
      h('p',{class:'sub'},o.layout==='country'?'2027학년도 9월 7번 양식이에요. 행마다 그 나라의 신자 수 1위, 2위 종교 라벨을 적어요.':o.layout==='rank'?'2026학년도 수능 13번 양식이에요. 열마다 나라, 행마다 순위예요.':'2026학년도 6월 8번 양식이에요. 1위 종교(열)와 2위 종교(행)가 만나는 칸에 나라 라벨을 적어요.'),
      o.layout!=='matrix'?row('순위',seg([['1','1위'],['2','2위까지'],['3','3위까지']],()=>String(o.n),v=>o.n=+v)):null,
      row('나라 이름',seg([['국가','국가'],['지역','지역']],()=>o.rowWord,v=>o.rowWord=v)),
      o.layout!=='matrix'?row('',chk('머리 줄 회색',()=>o.shade,v=>o.shade=v)):null,
      o.layout==='matrix'?row('행 종교',seg([['used','2위로 나온 종교만'],['all','모두']],()=>o.mRows,v=>o.mRows=v)):null,
      o.layout==='matrix'?row('열 종교',seg([['all','모두'],['used','1위로 나온 종교만']],()=>o.mCols,v=>o.mCols=v)):null,
      o.layout==='matrix'?row('',chk('라벨 아래 ‘국가’ 작게',()=>o.suffix,v=>o.suffix=v)):null,
      o.layout==='matrix'?row('칸 크기',num(()=>o.cell,v=>o.cell=v,{min:6,max:30,step:0.5,aria:'칸 크기(mm)'}),h('span',{class:'unit'},'mm')):null,
      h('p',{class:'sub'},'표의 행(나라)마다 값이 큰 열(종교)부터 순위를 매겨요. ‘기타’ 열은 순위에 넣지 않아요. 열 라벨(A~D)이 칸에 들어가요.'),
      row('',prune)));
    if(info.R.length&&info.ranks.some(r=>r.length<Math.min(o.n,info.elig.length))) P.append(h('p',{class:'msg warn'},'값이 0인 종교가 있어 빈 칸이 생겼어요.'));
  }
  if(k==='tri'){ const o=doc.tri; const C=doc.data.cols.filter(c=>!c.hide);
    P.append(sec('삼각 그래프',
      h('p',{class:'sub'},C.length>=3?`꼭짓점: 왼쪽 아래 ${EG.lblOf(C[0])}, 오른쪽 아래 ${EG.lblOf(C[1])}, 위 ${EG.lblOf(C[2])}. 보이는 앞의 세 열을 써요. 행(나라)마다 세 값의 합을 100으로 바꿔 점을 찍어요.`:'보이는 열이 세 개 이상 있어야 해요. 자료 불러오기에서 종교 세 개를 고르고 ‘기타로 합치기’를 끄면 돼요.'),
      row('눈금 간격',seg([['10','10'],['20','20'],['25','25']],()=>String(o.step),v=>o.step=+v)),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('눈금 숫자',()=>o.nums,v=>o.nums=v)),
      row('',chk('축 이름',()=>o.titles,v=>o.titles=v,'opts')),o.titles?row('',chk('값이 커지는 쪽 화살표',()=>o.arrows,v=>o.arrows=v)):null,
      o.titles?row('축 이름 끝',txt(()=>o.unitWord,v=>o.unitWord=v,'예: (%)','축 이름 뒤 글자')):null,
      row('점 모양',sel(MK_OPTS,()=>o.mk,v=>o.mk=v,null,'점 모양'),h('span',{class:'unit'},'크기'),num(()=>o.mks,v=>o.mks=v,{min:0.6,max:4,step:0.1,aria:'점 크기(mm)'})),
      row('',chk('점 옆에 행 라벨',()=>o.lbl,v=>o.lbl=v)),
      row('한 변',num(()=>o.size,v=>o.size=v,{min:25,max:140,step:1,aria:'한 변(mm)'}),h('span',{class:'unit'},'mm'))));
  }
  if(k==='bars'){ const o=doc.bars;
    P.append(sec('종교별 막대',
      row('칸 나누기',seg([['row','행마다 한 칸'],['col','열마다 한 칸']],()=>o.by,v=>o.by=v,'opts')),
      h('p',{class:'sub'},o.by==='row'?'표의 행마다 작은 그래프 하나, 그 안의 막대는 열 항목이에요(작업용 엑셀의 대륙별 종교 막대 그래프 양식).':'표의 열마다 작은 그래프 하나, 그 안의 막대는 행 항목이에요.'),
      row('한 줄에',seg([['0','모두'],['1','1개'],['2','2개'],['3','3개'],['4','4개']],()=>String(o.cols||0),v=>o.cols=+v)),
      row('막대 색',seg([['one','한 가지'],['item','항목 무늬']],()=>o.fill,v=>o.fill=v,'opts')),o.fill==='one'?row('',fillSel(()=>o.one,v=>o.one=v,'막대 무늬')):null,
      row('',chk('막대 끝에 값',()=>o.values,v=>o.values=v,'opts')),o.values?row('소수 자리',seg([['0','0'],['1','1']],()=>String(o.dec),v=>o.dec=+v)):null,
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('막대 이름은 줄 첫 칸에만',()=>o.shareCat,v=>o.shareCat=v)),
      row('막대 두께',num(()=>o.barW,v=>o.barW=v,{min:0.8,max:12,step:0.1,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'간격'),num(()=>o.gap,v=>o.gap=v,{min:0.2,max:12,step:0.1,aria:'막대 간격(mm)'})),
      row('값 축 길이',num(()=>o.len,v=>o.len=v,{min:10,max:120,step:1,aria:'값 축 길이(mm)'}),h('span',{class:'unit'},'칸 간격'),num(()=>o.pgap,v=>o.pgap=v,{min:0,max:30,step:0.5,aria:'칸 간격(mm)'}))),
      sec('축 범위',axisHead(),axisCtl('값 축',o.axis,'bars')));
  }
  if(k==='stack'){ const o=doc.stack; const dim=o.dir==='v'?o.v:o.h;
    const s1=sec('누적 막대',
      row('방향',seg([['h','가로'],['v','세로']],()=>o.dir,v=>{ o.dir=v; o.grid=v==='v'; },'opts')),
      row('값',seg([['pct','100% 비율'],['raw','값 그대로']],()=>o.norm!==false?'pct':'raw',v=>{ o.norm=v==='pct'; o.axis.auto=true; },'opts')),
      o.norm===false?h('p',{class:'sub'},'막대 길이가 값 그대로예요. 신자 상위국 점유율처럼 합이 100이 아닌 자료에 써요.'):null,
      row('',chk('행과 열 바꾸기 (막대 = 열 항목)',()=>o.trans,v=>o.trans=v,'opts')),
      o.trans?h('p',{class:'sub'},'막대가 열 항목(종교), 막대 안 칸이 행(나라·지역)이 돼요. 칸 무늬는 표의 행 무늬를 써요.'):null,
      row('막대 안 글자',seg(IN_LBL,()=>o.inLbl,v=>o.inLbl=v,'opts')),
      o.inLbl!=='none'?row('',chk('좁은 칸은 바깥에 지시선으로',()=>o.leader,v=>o.leader=v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('소수 자리',seg([['0','0'],['1','1']],()=>String(o.dec),v=>o.dec=+v)):null,
      row('범례',seg([['bottom','아래'],['right','오른쪽'],['none','없음']],()=>o.legend,v=>o.legend=v)),
      row('',chk('막대 사이 연결선 (점선)',()=>o.connect,v=>o.connect=v)),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),
      row('',chk('테두리 상자',()=>o.frame,v=>o.frame=v)),
      row('',chk('작은 눈금 (눈금 간격의 절반)',()=>o.minor,v=>o.minor=v)),
      row('',chk('막대마다 큰 칸부터 (기타는 맨 끝)',()=>o.sortSeg,v=>o.sortSeg=v)),
      row('막대 두께',num(()=>dim.barW,v=>dim.barW=v,{min:1,max:30,step:0.2,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'간격'),num(()=>dim.gap,v=>dim.gap=v,{min:0.5,max:40,step:0.2,aria:'막대 간격(mm)'}),h('span',{class:'unit'},'mm')),
      row('값 축 길이',num(()=>dim.len,v=>dim.len=v,{min:15,max:180,step:1,aria:'값 축 길이(mm)'}),h('span',{class:'unit'},'mm')));
    P.append(s1,sec('축 범위',axisHead(),axisCtl('값 축',o.axis,'stack')));
  }
  if(k==='donut'){ const o=doc.donut; const R=doc.data.rows.filter(r=>!r.hide);
    const s1=sec('원그래프',
      row('구멍',...range(()=>o.hole,v=>o.hole=v,0,0.8,0.01,v=>v<0.01?'원그래프':'도넛 '+Math.round(v*100)+'%')),
      row('지름',num(()=>o.size,v=>o.size=v,{min:12,max:90,step:1,aria:'지름(mm)'}),h('span',{class:'unit'},'mm · 간격'),num(()=>o.gap,v=>o.gap=v,{min:0,max:40,step:0.5,aria:'간격(mm)'}),h('span',{class:'unit'},'mm')),
      row('한 줄에',seg([['0','모두'],['1','1개'],['2','2개'],['3','3개'],['4','4개']],()=>String(o.cols||0),v=>o.cols=+v)),
      o.hole>0?row('가운데',seg([['row','나라 이름'],['total','합계'],['custom','직접'],['none','없음']],()=>o.center,v=>o.center=v,'opts')):null,
      o.hole>0&&o.center==='total'?row('합계 이름',txt(()=>o.totalLabel,v=>o.totalLabel=v,'예: 총인구','합계 이름')):null,
      row('위 라벨',seg([['none','없음'],['lbl','행 라벨']],()=>o.top,v=>o.top=v)),
      row('조각 글자',seg(IN_LBL,()=>o.inLbl,v=>o.inLbl=v,'opts')),
      o.inLbl!=='none'?row('',chk('좁은 조각은 바깥에 지시선으로',()=>o.leader,v=>o.leader=v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('소수 자리',seg([['0','0'],['1','1']],()=>String(o.dec),v=>o.dec=+v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('% 표시',seg([['all','모든 칸'],['first','첫 칸만'],['none','안 붙임']],()=>o.pct||'all',v=>o.pct=v)):null,
      o.inLbl==='value'||o.inLbl==='both'?row('',chk('비율을 괄호로 묶기 — 예: (16.5%)',()=>!!o.paren,v=>o.paren=v)):null,
      row('',chk('조각을 큰 순서로 (기타는 맨 끝)',()=>o.sortSeg,v=>o.sortSeg=v)),
      row('범례',seg([['none','없음'],['bottom','아래'],['right','오른쪽']],()=>o.legend,v=>o.legend=v)),
      h('p',{class:'sub'},'조각은 12시 방향에서 시계 방향으로, 표의 열 순서대로 그려요. 작업용 엑셀의 파이 차트 양식이에요.'));
    if(o.hole>0&&o.center==='custom'){ const g=h('div',{class:'ctext'}); for(const r of R){ const i=h('input',{type:'text',value:r.ctext||'',placeholder:'줄은 / 로 나눠요','aria-label':`${r.name} 가운데 글자`}); i.addEventListener('input',()=>{ r.ctext=i.value; changed(); }); g.append(h('span',null,r.lbl||r.name),i); } s1.append(g); }
    P.append(s1);
  }
  if(k==='group'){ const o=doc.group;
    P.append(sec('묶은 막대',
      row('범례',seg([['in','그래프 안'],['bottom','아래'],['right','오른쪽'],['none','없음']],()=>o.legend,v=>o.legend=v)),
      row('',chk('점선 격자',()=>o.grid,v=>o.grid=v)),row('',chk('테두리 상자',()=>o.frame,v=>o.frame=v)),
      row('',chk('막대 위에 값',()=>o.values,v=>o.values=v)),
      row('막대 두께',num(()=>o.barW,v=>o.barW=v,{min:0.5,max:20,step:0.1,aria:'막대 두께(mm)'}),h('span',{class:'unit'},'묶음 간격'),num(()=>o.gap,v=>o.gap=v,{min:0.3,max:30,step:0.1,aria:'묶음 간격(mm)'})),
      row('높이',num(()=>o.len,v=>o.len=v,{min:10,max:150,step:1,aria:'높이(mm)'}),h('span',{class:'unit'},'mm'))),
      sec('축 범위',axisHead(),axisCtl('세로축',o.axis,'group')));
  }
  if(k==='tb'){ const o=doc.tb;
    P.append(sec('표',
      row('나타낼 값',seg([['value','값'],['pct','행 비율(%)'],['rank','순위']],()=>o.mode,v=>o.mode=v,'opts')),
      o.mode==='rank'?row('순위',num(()=>o.rankN,v=>o.rankN=v,{min:1,max:10,step:1,aria:'몇 위까지'}),h('span',{class:'unit'},'위까지')):null,
      o.mode==='rank'?h('p',{class:'sub'},'열마다 값이 큰 행부터 행 라벨을 적어요. 나라별 1·2위 종교는 위쪽 ‘순위 표’를 쓰세요.'):null,
      o.mode!=='rank'?row('소수 자리',seg([['0','0'],['1','1'],['2','2']],()=>String(o.dec),v=>o.dec=+v)):null,
      o.mode!=='rank'?row('',chk('천 단위 쉼표',()=>o.comma,v=>o.comma=v)):null,
      o.mode!=='rank'?row('단위 표기',seg([['auto','자동'],['head','열 머리마다'],['top','표 위'],['bottom','표 아래']],()=>o.unitPos||'auto',v=>o.unitPos=v,'opts')):null,
      o.mode!=='rank'&&EG.tableUnits(doc).pos!=='head'?row('',seg([['label',`(단위: ${EG.tableUnits(doc).units[0]})`],['paren',`(${EG.tableUnits(doc).units[0]})`]],()=>o.unitStyle||'label',v=>o.unitStyle=v)):null,
      o.mode!=='rank'?h('p',{class:'sub'},EG.tableUnits(doc).uni?'모든 열의 단위가 같으면 표 위 오른쪽에 한 번만 적어요(시험지 방식, 2025학년도 수능 8번 ‘(만 명)’). 열 머리마다 적으려면 ‘열 머리마다’를 고르세요.':'열마다 단위가 달라서 열 머리마다 적어요.'):null,
      o.mode!=='rank'&&EG.tableUnits(doc).pos==='head'?row('',chk('단위를 둘째 줄에',()=>o.unitLine,v=>o.unitLine=v)):null,
      o.mode!=='rank'?row('첫 칸',txt(()=>o.rowHead,v=>o.rowHead=v,'구분','첫 칸 이름')):null));
  }
  if(['stack','donut','tree'].includes(k)){ const D=doc.data; const rank=D.rows.some(r=>Array.isArray(r.top));
    P.append(sec('칸 정리',
      row('',chk('0.0%로 보일 만큼 작은 값은 그리지 않기 (기타에 합침)',()=>D.trim!==false,v=>D.trim=v)),
      rank?row('칸 이름',seg([['col','순위 (1위, 2위 …)'],['top','나라 이름']],()=>D.cellName==='top'?'top':'col',v=>{ D.cellName=v; })):null,
      rank?row('기호',txt(()=>symText(D.sym),v=>{ D.sym=parseSym(v); refreshHint(); },'예: 미국=A, 중국=B','나라별 기호')):null,
      h('p',{class:'sub'},rank?'기호를 적은 나라만 칸에 기호로 나와요. 문장에 ‘미국은 A, 중국은 B’처럼 적어도 돼요.':'특정 항목을 기호로 쓰려면 표의 라벨 칸에 적거나, 문장에 ‘미국은 A, 중국은 B’처럼 적어요.')));
  }
  /* 발문 단서 */
  const hint=h('section',{class:'sec',id:'hintSec'}); P.append(hint); refreshHint();
  /* 제목 · 연도 · 출처 · 주석 */
  const M=doc.meta;
  const notesBox=h('textarea',{class:'note-area',placeholder:'한 줄에 하나씩. 예: 러시아는 유럽에 포함됨.','aria-label':'덧붙일 주석'}); notesBox.value=M.notes||''; notesBox.addEventListener('input',()=>{ M.notes=notesBox.value; changed(); });
  const auto=RG.autoNotes(doc); const srcBtn=h('button',{class:'btn small',type:'button'},'Pew 출처 넣기'); srcBtn.addEventListener('click',()=>{ M.src='(Pew Research Center)'; changed('opts'); });
  const titleBtn=h('button',{class:'btn small',type:'button'},'제목 추천'); titleBtn.addEventListener('click',()=>{ M.title=suggestTitle(); changed('opts'); });
  P.append(sec('제목 · 연도 · 출처 · 주석',
    row('제목',txt(()=>M.title,v=>M.title=v,'예: <(가)~(다) 국가의 신자 수 1, 2위 종교>','제목'),titleBtn),
    row('연도',txt(()=>M.year,v=>M.year=v,'예: (2020)','연도')),
    row('출처',txt(()=>M.src,v=>M.src=v,'비우면 안 적어요','출처'),srcBtn),
    h('p',{class:'sub'},'세계지리 시험지는 출처 없이 연도만 적어요.'),
    row('',chk(auto.length?`자동 주석: ${auto.join(' ')}`:'자동 주석 (지금은 붙일 것이 없어요)',()=>M.autoNote,v=>M.autoNote=v)),
    notesBox));
  /* 글꼴 · 크기 */
  const S=doc.style;
  const fsel=fam=>sel(GG.FONTS[fam].map(f=>[f.key,f.label]),()=>fam==='serif'?S.serif:S.gothic,v=>{ if(fam==='serif') S.serif=v; else S.gothic=v; GG.clearMetrics(); },'opts',fam==='serif'?'명조 글꼴':'고딕 글꼴');
  const ff=fam=>{ const i=h('input',{type:'file',accept:'.ttf,.otf,.woff,.woff2'}); i.addEventListener('change',async()=>{ const f=i.files&&i.files[0]; if(!f) return; try{ const n=await GG.registerUserFont(fam,f); if(fam==='serif') S.serif='user'; else S.gothic='user'; GG.clearMetrics(); changed('opts'); toast(`${n} 글꼴을 불러왔어요.`); }catch(e){ toast('글꼴 파일을 읽지 못했어요.'); } }); return h('label',{class:'btn small filebtn'},fam==='serif'?'명조 파일':'고딕 파일',i); };
  P.append(h('details',{class:'sec'},h('summary',null,h('h2',{class:'sec-title'},'글꼴 · 글자 크기 · 무늬')),
    row('숫자·라벨',fsel('serif')),row('제목·주석',fsel('gothic')),h('p',{class:'sub'},fontStatus()),row('',h('span',{class:'sub'},'글꼴 파일:'),ff('serif'),ff('gothic')),
    row('눈금 숫자',...range(()=>S.tickPt,v=>{ S.tickPt=v; S.unitPt=Math.max(6,v-0.5); S.valuePt=Math.max(6,v-0.5); },6,11,0.5,v=>v+' pt')),
    row('행 이름',...range(()=>S.catPt,v=>S.catPt=v,6,12,0.5,v=>v+' pt')),
    row('표 글자',...range(()=>S.tablePt,v=>S.tablePt=v,6,12,0.5,v=>v+' pt')),
    row('칸 안 글자',...range(()=>S.segPt,v=>S.segPt=v,5.5,11,0.5,v=>v+' pt')),
    row('범례·제목',...range(()=>S.legendPt,v=>{ S.legendPt=v; S.titlePt=v+0.5; },6,11,0.5,v=>v+' pt')),
    row('주석',...range(()=>S.notePt,v=>S.notePt=v,5.5,10,0.5,v=>v+' pt')),
    row('선 굵기',...range(()=>S.lw,v=>S.lw=v,0.6,1.8,0.1,v=>'×'+v.toFixed(1))),
    row('무늬 간격',...range(()=>S.patScale,v=>S.patScale=v,0.6,1.8,0.05,v=>'×'+v.toFixed(2))),
    row('연한 회색',...range(()=>S.light,v=>S.light=v,180,245,1,v=>String(v))),
    row('회색',...range(()=>S.mid,v=>S.mid=v,120,220,1,v=>String(v))),
    row('진한 회색',...range(()=>S.dark,v=>S.dark=v,60,170,1,v=>String(v))),
    row('라틴 글자',seg([['','글꼴 그대로'],['times','Times']],()=>S.latin,v=>{ S.latin=v; GG.clearMetrics(); }))));
}
function suggestTitle(){ const D=doc.data; const R=D.rows.filter(r=>!r.hide); const lbls=R.map(r=>EG.lblOf(r));
  const gana=lbls.every(s=>/^\([가-하]\)$/.test(s)); const who=gana&&lbls.length?`${EG.seqRange(lbls)} ${doc.rank.rowWord||'국가'}`:(D.rowNoun==='종교'?'종교':D.rowNoun||'국가')+'별';
  if(doc.kind==='rank'){ const n=doc.rank.layout==='matrix'?2:doc.rank.n; return `<${who}의 신자 수 ${n===1?'1위':n===2?'1, 2위':'1~'+n+'위'} 종교>`; }
  if(doc.preset&&doc.preset.type==='dist') return `<종교별 신자 수의 ${RG.SCHEME[doc.preset.scheme].short}별 비율>`;
  if(doc.preset&&doc.preset.type==='top') return doc.preset.by==='pct'?'<종교별 신자 비율 상위 국가>':'<종교별 신자 수 상위 국가>';
  if(doc.kind==='tri') return `<${who}의 종교 구성>`;
  return `<${who.replace(/별$/,'')}${gana?'의':'별'} 종교별 신자 비율>`; }
function fontStatus(){ const out=[]; for(const fam of ['serif','gothic']){ const f=GG.fontDef(doc,fam); if(f.web) continue; if(!GG.fontAvailable(f,fam)) out.push(`${f.label.replace(/ \(.*\)$/,'')} 글꼴이 이 컴퓨터에 없어 ${fam==='serif'?'Noto Serif KR':'Noto Sans KR'}로 대신 그려요.`); } return out.length?out.join(' '):'고른 글꼴이 이 컴퓨터에 있어요.'; }
function refreshHint(){
  const el=$('#hintSec'); if(!el) return; el.textContent=''; const H=EG.hintOf(doc); if(!H){ el.hidden=true; return; } el.hidden=false;
  const cp=h('button',{class:'btn small copy',type:'button'},'단서 문구 복사');
  cp.addEventListener('click',async()=>{ try{ await navigator.clipboard.writeText(H.sentence); toast('발문 단서를 복사했어요.'); }catch(e){ toast('복사가 막혀 있어요. 문구를 직접 선택해 복사해 주세요.'); } });
  el.append(h('h2',{class:'sec-title'},'발문 단서 · 정답'),h('div',{class:'hint'},h('div',null,H.sentence),h('div',{class:'sub'},h('b',null,'정답: '),H.key),cp));
}

/* ───────── 그리기 ───────── */
function warnings(){
  const w=[]; const {R,C,M}=EG.derive(doc); if(!R.length||!C.length) return w;
  w.push(...EG.labelWarn(doc));
  const holes=[]; R.forEach((r,i)=>C.forEach((c,j)=>{ if(M[i][j]==null&&!(doc.preset&&doc.preset.type==='top')) holes.push(`${r.name}·${c.name}`); }));
  if(holes.length&&doc.kind!=='rank') w.push(`빈칸 ${holes.length}개(${holes.slice(0,3).join(', ')}${holes.length>3?' …':''})는 0으로 그려요.`);
  if(['stack','donut','tri'].includes(doc.kind)&&M.flat().some(v=>GG.fin(v)&&v<0)) w.push('음수 값은 비율 그림에서 0으로 처리해요.');
  if(doc.kind==='tri'){ if(C.length<3) w.push('삼각 그래프는 보이는 열이 세 개 있어야 해요.'); else if(C.length>3) w.push(`보이는 열이 ${C.length}개라 앞의 세 열(${C.slice(0,3).map(c=>c.name).join(', ')})만 써요.`);
    const t=RG.lastAxes().tri; if(t&&t.lost.length) w.push(`${t.lost.join(', ')}은(는) 세 값이 모두 0이라 빠졌어요.`); }
  if(doc.kind==='donut'&&doc.donut.center==='total'&&doc.data.unit==='%') w.push('값이 이미 비율(%)이라 가운데 합계가 100이 돼요.');
  if(doc.kind==='stack'&&doc.stack.norm===false){ const tot=Math.max(...M.map(r=>r.filter(GG.fin).reduce((a,b)=>a+Math.max(0,b),0))); const ax=EG.lastAxes().stack; if(ax&&tot>ax.hi+1e-9) w.push('막대가 값 축 최댓값을 넘어가 잘려요. 축 범위를 넓혀 주세요.'); }
  if(doc.kind==='rank'){ const used=new Set(RG.rankInfo(doc).ranks.flat()); const idle=C.filter((c,j)=>!c.other&&!used.has(j)&&c.lbl); if(idle.length) w.push(`${idle.map(c=>c.lbl).join(', ')}(${idle.map(c=>c.name).join(', ')})은(는) 표에 나오지 않아요. 발문 단서가 맞도록 ‘순위에 안 나오는 종교 열 빼기’를 눌러 주세요.`); }
  return w;
}
function draw(){
  const desk=getComputedStyle(ROOT.body||ROOT).getPropertyValue('--desk').trim()||'#c7ccd2';
  const r=GG.paintSheet(doc,cv,{desk});
  $('#deskEmpty').hidden=!!r;
  const w=r?warnings():[]; const dw=$('#deskWarn'); dw.hidden=!w.length; dw.textContent=w.join(' ');
  if(r){ const Wd=r.R.W+2*GG.M, Hd=r.R.H+2*GG.M; $('#sizeInfo').textContent=`${Wd.toFixed(1)} × ${Hd.toFixed(1)} mm · ${Math.round(Wd/25.4*dpi)} × ${Math.round(Hd/25.4*dpi)} px`; } else $('#sizeInfo').textContent='';
  ['pngBtn','svgBtn','copyBtn'].forEach(id=>$('#'+id).disabled=!r);
  for(const f of axisRefresh) f();
  clearTimeout(draw.f); draw.f=setTimeout(()=>GG.ensureFonts(doc),250);
}
if(document.fonts) document.fonts.addEventListener('loadingdone',()=>{ GG.clearMetrics(); schedule(); });
new ResizeObserver(()=>schedule()).observe(cv.parentElement);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>schedule());

/* ───────── 내보내기 · 작업 파일 ───────── */
const KIND_FILE={stack:'종교_누적막대',donut:'종교_원그래프',tri:'종교_삼각그래프',bars:'종교별막대',group:'종교_묶은막대',tb:'종교표',rank:'종교_순위표'};
const stamp=()=>{ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
const RESULT={saved:'저장했어요.',declined:'저장을 취소했어요.',busy:'잠시 뒤에 다시 눌러 주세요.',failed:'저장하지 못했어요.'};
async function busy(btn,fn){ btn.disabled=true; try{ await fn(); } finally{ btn.disabled=false; } }
$('#pngBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const b=await GG.renderPng(doc,{dpi}); toast(RESULT[await GG.saveFile(`${KIND_FILE[doc.kind]}_${stamp()}.png`,b,'image/png')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#svgBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ const s=await GG.svgString(doc); toast(RESULT[await GG.saveFile(`${KIND_FILE[doc.kind]}_${stamp()}.svg`,s,'image/svg+xml')]); }catch(err){ toast('그림을 만들지 못했어요.'); } }));
$('#copyBtn').addEventListener('click',e=>busy(e.currentTarget,async()=>{ try{ await GG.copyPng(doc,{dpi}); toast('이미지를 복사했어요. 한글 문서에 바로 붙여 넣을 수 있어요.'); }catch(err){ toast('이 화면에서는 복사가 막혀 있어요. PNG 저장을 써 주세요.'); } }));
bindSeg($('#dpiSeg'),()=>dpi,v=>{ dpi=+v; schedule(); });
$('#saveJson').addEventListener('click',async()=>{ toast(RESULT[await GG.saveFile(`종교그래프_작업_${stamp()}.json`,JSON.stringify(doc,null,1),'application/json')]); });
$('#loadJson').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; try{ const d=JSON.parse(await f.text()); if(!d||d.app!=='religion') throw 0; doc=RG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); }catch(err){ toast('종교 그래프 작업 파일이 아니에요.'); } e.target.value=''; });
const resetBtn=$('#resetBtn'); let resetArm=0;
resetBtn.addEventListener('click',()=>{ if(!resetArm){ resetBtn.textContent='한 번 더 누르면 지워요'; resetArm=setTimeout(()=>{ resetArm=0; resetBtn.textContent='새 작업'; },3000); return; }
  clearTimeout(resetArm); resetArm=0; resetBtn.textContent='새 작업'; doc=RG.freshDoc(doc.kind); syncTop(); changed('all'); pbMsg('',''); toast('새 작업을 시작했어요.'); });

/* ───────── 위쪽 막대 ───────── */
const syncKind=bindSeg($('#kindSeg'),()=>doc.kind,v=>{ doc.kind=v; changed('opts'); });
function syncTop(){ syncKind(); }
if(!HAS){ $('#pbSeg').querySelectorAll('button:not([data-v="paste"])').forEach(b=>b.disabled=true); }
renderPB(); renderTable(); renderOpts(); renderExamples(); schedule();
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>{ GG.clearMetrics(); schedule(); });
MS=GG.mapSend($,()=>doc); MS.sync();
/* 통합판에서 다른 곳이 작업 파일을 넘겨줄 때 */
return {getDoc:()=>doc,mapRequest:()=>MS.request(),load:d=>{ if(!d||!(d.app==='religion')) return false; doc=RG.normalizeDoc(d); syncTop(); changed('all'); toast('작업을 불러왔어요.'); return true; }};
});