/* 문항 설계 탭: 성취기준 → 평가 요소 → 장면·자료 → 발문 → 선지 → 점검
   경기도교육청 「2024 평가문항 제작 방법(지리)」의 제작 절차(교육 과정 분석 → 평가 요소 선정 → 문제 장면 설정 → 문항 초안 → 검토)를 따른다 */
HUB.def('item',function(ROOT){
'use strict';
const $=s=>ROOT.querySelector(s);
function h(tag,attrs,...kids){
  const e=document.createElement(tag);
  if(attrs) for(const [k,v] of Object.entries(attrs)){
    if(v==null||v===false) continue;
    if(k==='class') e.className=v; else if(k.startsWith('on')) e.addEventListener(k.slice(2),v); else if(v===true) e.setAttribute(k,''); else e.setAttribute(k,String(v));
  }
  for(const c of kids.flat()) if(c!=null&&c!==false&&c!=='') e.append(c.nodeType?c:document.createTextNode(String(c)));
  return e;
}
const KEY='wg-item-draft-v1';
const STEPS=[['std','교육과정'],['eval','평가 요소'],['scene','장면·자료'],['stem','발문'],['stmt','선지'],['check','점검']];
const KN={1:'한',2:'두',3:'세',4:'네',5:'다섯',6:'여섯'};
const TOOLS=[['climate','기후 그래프'],['energy','에너지 그래프'],['religion','종교 그래프'],['population','인구 그래프'],['agriculture','농업 그래프'],['mapquick','백지도 자동 생성'],['mapedit','백지도 편집기'],['landform','지형 모식도'],['kmap','한국지리 백지도']];
const TOOL_OF={climate:'climate',energy:'energy',religion:'religion',population:'population',agriculture:'agriculture',map:'mapquick',landform:'landform'};
const TARGETS=['지역','국가','도시','종교','에너지 자원','작물','가축','지형','산맥','지역(대륙)','경제 블록','국제 환경 협약'];
let gF={scope:'',data:'all',form:'all',q:'',more:false};
let step=0, side='check', candTab='data', candF={kind:'all',m:'all',ox:'all',tier:'all'};
let it=fresh(); let toastT=0;
/* 다른 탭에서 불러온 자료 그림: 크기가 커서 작업 파일·자동 저장에는 넣지 않고 이 화면에만 둔다 */
let figs=[];

function fresh(){ return {app:'item',v:1,no:1,curr:'w15',unit:'02',std:'',eval:'',act:'개념 및 원리 이해',goal:'',goalAuto:true,
  dk:'graph',scene:'none',about:'',refMode:'labels',target:'지역',groups:[{seq:'gana',labels:['(가)','(나)','(다)','(라)'],names:['','','','']}],
  form:'one',anyCount:false,bogiN:4,pts:2,pickFrom:'',condOn:true,condExtra:'',indEdit:'',dirEdit:'',stmts:[],climate:null,table:null,dataSrc:'',dataNote:'',srcNote:'',manual:{},mapIsWorld:false,
  find:{map:{},opts:null}}; }
function normalize(d){ const f=fresh(); const o=Object.assign(f,d||{}); o.app='item';
  if(!Array.isArray(o.groups)||!o.groups.length) o.groups=f.groups;
  o.groups=o.groups.map(g=>({seq:g.seq||IT.seqOf((g.labels||[])[0])||'gana',labels:(g.labels||[]).slice(),names:(g.names||[]).map(x=>x||''),target:g.target||'',cond:g.cond!==false}));
  o.stmts=(o.stmts||[]).map(s=>({id:s.id||uid(),text:String(s.text||''),truth:s.truth===true?true:s.truth===false?false:null,kind:s.kind||IT.kindOf(s.text),why:s.why||'',warn:s.warn||'',note:s.note||'',src:s.src||'me'}));
  o.manual=o.manual||{}; o.find=Object.assign({map:{},opts:null},o.find||{}); return o; }
const uid=()=>Math.random().toString(36).slice(2,9);
/* 한 파일판: 자료가 문서 안에 들어 있다 */
try{ const el=document.getElementById('it-data'); if(el&&!IT.data) IT.setData(JSON.parse(el.textContent)); }catch(e){}
try{ const el=document.getElementById('it-kice'); if(el&&!IT.hasKice) IT.setKice(JSON.parse(el.textContent)); }catch(e){}
try{ const s=localStorage.getItem(KEY); if(s) it=normalize(JSON.parse(s)); }catch(e){}

/* ───────── 공통 ───────── */
function toast(msg){ let t=$('.itoast'); if(!t){ t=h('div',{class:'toast itoast',role:'status','aria-live':'polite'}); ROOT.querySelector('.iapp').append(t); } t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),3200); }
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(it)); }catch(e){} }
function changed(what){ save(); renderSteps(); renderPaper(); renderCard(); renderSide(); if(what==='step') renderStep(); }
function seg(opts,get,set,cls){ const b=h('div',{class:'seg'+(cls?' '+cls:''),role:'group'}); for(const [v,t,title] of opts){ const x=h('button',{type:'button','aria-pressed':String(get()===v),title:title||null},t); x.addEventListener('click',()=>{ set(v); }); b.append(x); } return b; }
function sec(title,...kids){ return h('section',{class:'sec'},title?h('h3',{class:'sec-title'},title):null,...kids); }
function fld(label,el,sub){ const id='if'+uid(); if(el.id==='') el.id=id; return h('div',{class:'ifld'},h('label',{for:el.id},label),el,sub?h('p',{class:'sub'},sub):null); }
function input(val,on,attrs){ const e=h('input',Object.assign({type:'text',value:val||''},attrs||{})); e.addEventListener('input',()=>on(e.value)); return e; }
function area(val,on,attrs){ const e=h('textarea',Object.assign({rows:2},attrs||{})); e.value=val||''; e.addEventListener('input',()=>on(e.value)); return e; }
const D=()=>IT.data;
const curC=()=>D().curr[it.curr];
const stdObj=()=>it.std?curC().std.find(s=>s.code===it.std):null;
const g0=()=>it.groups[0]||{labels:[],names:[]};
const toolExists=id=>!!document.getElementById('hub-tab-'+id);
function openGichul(){ side='gichul'; gF.scope=''; renderSide(); const e=$('#iSideBody'); if(e&&e.scrollIntoView) e.scrollIntoView({block:'nearest'}); }
function gBtn(t){ const b=h('button',{type:'button',class:'btn small'},t||'기출 참고 열기 →'); b.addEventListener('click',openGichul); return h('div',{class:'ichips'},b); }
function relatedGichul(){ if(!it.std) return []; return IT.gichulBy(IT.related(it.curr,it.std)); }
function unitName(u){ const x=curC().units.find(x=>x.u===u); return x?x.name:''; }
function stdShort(code){ return code.replace('12세지',''); }
const isBogi=()=>it.form==='bogi'||it.form==='bogiAny';
function need(){ if(isBogi()) return it.bogiN||4; if(it.form==='stu') return 4; if(it.form==='find') return 0; if(it.form==='score') return 4; return 5; }
function ans(){ return it.form==='find'?findAnswer():IT.answerSet(it.form,it.stmts,{any:it.anyCount}); }

/* ───────── 단계 표시 ───────── */
function doneOf(k){
  if(k==='std') return !!it.std; if(k==='eval') return !!it.eval.trim();
  if(k==='scene') return it.groups.some(g=>g.names.some(Boolean))||!!it.about.trim()||it.scene!=='none';
  if(k==='stem') return !!it.std&&!!IT.directStem(it);
  if(k==='stmt') return it.form==='find'?!!findAnswer().ans:it.stmts.length>=need()&&!!ans().ans;
  if(k==='check') return IT.MANUAL.every(([id])=>it.manual[id]);
  return false; }
function renderSteps(){
  const N=$('#iSteps'); N.textContent='';
  STEPS.forEach(([k,t],i)=>{ const b=h('button',{type:'button',class:'istep-b'+(doneOf(k)?' done':''),'aria-current':i===step?'step':null},h('span',{class:'n'},doneOf(k)?'✓':String(i+1)),t);
    b.addEventListener('click',()=>go(i)); N.append(b); });
  $('#iPrev').disabled=step===0; $('#iNext').textContent=step===STEPS.length-1?'처음 단계로':'다음 단계'; }
function go(i){ step=Math.max(0,Math.min(STEPS.length-1,i)); renderSteps(); renderStep(); const s=$('#iStep'); if(s) s.scrollTop=0; }

/* ───────── 왼쪽: 단계 내용 ───────── */
function head(t,p){ return h('div',{class:'ihead'},h('h2',null,t),p?h('p',null,p):null); }
function renderStep(){
  const S=$('#iStep'); S.textContent='';
  const k=STEPS[step][0];
  ({std:stepStd,eval:stepEval,scene:stepScene,stem:stepStem,stmt:stepStmt,check:stepCheck})[k](S);
}

/* 1. 교육과정 */
function stepStd(S){
  S.append(head('1. 교육과정 분석','평가할 성취기준을 고르세요. ‘기출’은 2024~2027학년도 6월·9월 모의평가와 수능 11회에서 이 성취기준으로 낸 문항 수예요.'));
  const C=curC();
  const s1=sec('과목',seg([['w15','세계지리 (2015 개정)'],['c22','세계시민과 지리 (2022 개정)']],()=>it.curr,v=>{ if(v===it.curr) return; it.curr=v; it.unit='01'; it.std=''; changed('step'); },'wrap'));
  if(it.curr==='c22') s1.append(h('p',{class:'sub'},'세계시민과 지리는 아직 수능 기출이 없어요. 내용이 겹치는 세계지리(2015) 성취기준의 기출을 참고로 보여 줘요(연결은 Claude 판단이라 확인이 필요해요).'));
  S.append(s1);
  const us=h('select',{'aria-label':'대단원'}); for(const u of C.units) us.append(h('option',{value:u.u},`${+u.u}. ${u.name}`)); us.value=it.unit;
  us.addEventListener('change',()=>{ it.unit=us.value; changed('step'); });
  const list=h('ul',{class:'istd',role:'radiogroup','aria-label':'성취기준'});
  for(const s of C.std.filter(s=>s.u===it.unit)){
    const codes=IT.related(it.curr,s.code); const n=IT.gichulBy(codes).length;
    const li=h('li',{role:'radio','aria-checked':String(it.std===s.code),tabindex:'0'},
      h('div',{class:'code'},`[${s.code}]`,it.curr==='w15'?h('span',{class:'badge'+(n>=10?' hot':'')},`기출 ${n}`):h('span',{class:'badge'},`관련 2015: ${codes.map(stdShort).join('·')||'없음'} · 기출 ${n}`),s.checked?h('span',{class:'badge',title:'경기도교육청 문서에 인용된 문장과 글자까지 같아요'},'원문 대조'):null),
      h('div',{class:'txt'},s.text));
    const pick=()=>{ it.std=s.code; if(it.goalAuto) it.goal=''; changed('step'); };
    li.addEventListener('click',pick); li.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); pick(); } });
    list.append(li); }
  S.append(sec('대단원',us),sec('성취기준',list));
  S.append(sec('',h('p',{class:'isrc'},'성취기준 문장: ',it.curr==='w15'?D().src.std2015:D().src.std2022)));
}

/* 2. 평가 요소 */
function stepEval(S){
  S.append(head('2. 평가 요소 선정','무엇을 물을지 한 가지로 정하세요(평가 요소는 문항의 ‘몸’, 장면은 ‘옷’). 기출이 물은 것을 눌러 시작해도 돼요.'));
  const so=stdObj(); if(!so){ S.append(sec('',h('p',{class:'empty'},'먼저 1단계에서 성취기준을 골라 주세요.'))); return; }
  S.append(sec('고른 성취기준',h('p',{class:'sub'},`[${so.code}] ${so.text}`)));
  /* 내용 요소 */
  const units=it.curr==='w15'?[it.unit]:[...new Set(IT.related(it.curr,it.std).map(c=>c.slice(4,6)))];
  const els=[]; for(const u of units){ const x=D().curr.w15.units.find(z=>z.u===u); if(x) els.push(...x.elems); }
  if(els.length){ const ch=h('div',{class:'ichips'}); for(const e of [...new Set(els)]){ const b=h('button',{type:'button',class:'ichip'},e); b.addEventListener('click',()=>{ it.eval=e; if(it.goalAuto) it.goal=''; changed('step'); }); ch.append(b); }
    S.append(sec('내용 요소(경기도 문서 내용 영역)',ch)); }
  /* 기출이 물은 것 */
  const G=relatedGichul();
  if(G.length){
    const byTopic={}; for(const g of G) (byTopic[g.topic]=byTopic[g.topic]||[]).push(g);
    const ul=h('ul',{class:'ilist'});
    for(const [tp,gs] of Object.entries(byTopic).sort((a,b)=>b[1].length-a[1].length)){
      for(const g of gs){
        const use=h('button',{type:'button',class:'btn small',title:'평가 요소와 행동 영역을 가져와요'},'가져오기');
        use.addEventListener('click',()=>{ it.eval=g.eval; it.act=g.act; if(it.goalAuto) it.goal=''; changed('step'); toast('평가 요소를 가져왔어요.'); });
        const cp=h('button',{type:'button',class:'btn small',title:'자료 종류·장면·발문 형식·배점을 이 기출처럼 맞춰요'},'구조 따라 하기');
        cp.addEventListener('click',()=>{ followStructure(g); });
        ul.append(h('li',{class:'col'},h('div',null,g.eval),h('div',{class:'meta'},`${g.name} ${g.no}번 · ${tp} · ${g.data.join('·')} · ${g.form} · ${g.act}${g.pts===3?' · 3점':''}`),h('div',{class:'ichips'},use,cp)));
      }
    }
    S.append(sec(`기출이 물은 것 (${G.length}문항)`,ul,h('p',{class:'isrc'},'주제·평가 요소·행동 영역 태그는 Claude가 단 초안이에요.')));
  } else S.append(sec('기출이 물은 것',h('p',{class:'empty'},'이 성취기준으로 낸 기출이 11회 안에는 없어요. 새로운 장면을 시도해 볼 수 있는 자리예요.')));
  /* 입력 */
  S.append(sec('평가 요소',fld('이 문항이 묻는 것',area(it.eval,v=>{ it.eval=v; if(it.goalAuto) it.goal=''; changed(); },{rows:2,placeholder:'예: 기후 그래프로 본 열대·건조 기후의 특징'}))));
  const acts=IT.ACTS.map(a=>[a[0],a[0].replace(' 및 ','·')]);
  S.append(sec('행동 영역',seg(acts,()=>it.act,v=>{ it.act=v; if(it.goalAuto) it.goal=''; changed('step'); },'wrap'),
    h('p',{class:'sub'},({'개념 및 원리 이해':'지리 지식·개념·원리를 아는지','문제 파악 및 인식':'자료에서 과제·전제를 찾아내는지','탐구 설계 및 수행':'탐구 절차에 따라 조사·분석을 설계하는지','자료 분석 및 해석':'자료의 핵심 의미를 정확히 읽는지','결론 도출 및 평가':'정보로 결론을 내리거나 타당성을 판단하는지'})[it.act]||'')));
  const gi=input(it.goalAuto?IT.goalOf(it.eval,it.act):it.goal,v=>{ it.goal=v; it.goalAuto=false; changed(); },{placeholder:'평가 요소를 적으면 저절로 채워져요'});
  const rs=h('button',{type:'button',class:'btn small'},'자동 문장으로'); rs.addEventListener('click',()=>{ it.goalAuto=true; it.goal=''; changed('step'); });
  S.append(sec('평가 목표',gi,rs));
}
function followStructure(g){
  const dk=g.data.includes('그래프')?'graph':g.data.includes('표')?'table':g.data.includes('지도')&&g.data.length===1?'map':g.data.includes('글')?'text':g.data.includes('사진')||g.data.includes('그림')?'photo':'mixed';
  const sc={'':'none','수업':'class','답사·여행':'trip','수행평가':'report','기사':'news','방송':'docu','퀴즈·게임':'quiz','게시물·메시지':'post','평가지':'sheet','조건 선정':'pick','질문지':'sheet'}[g.scene];
  it.dk=dk; it.scene=sc||'none'; it.pts=g.pts;
  it.form={'정답형':'one','부정형':'neg','합답형':'bogi','합답형(있는 대로)':'bogiAny','찾기형':'find','학생형':'stu','채점형':'score','최선답형':'best','조건형':'find'}[g.form]||'one';
  if(it.form==='stu') it.anyCount=false;
  const L=g.labels||[]; if(L.includes('A')&&!L.includes('(가)')) { const n=g0().labels.length||4; it.groups[0]=Object.assign(g0(),{seq:'latin',labels:IT.seqList('latin',n),names:(g0().names||[]).slice(0,n)}); }
  changed('step'); toast(`${g.name} ${g.no}번의 자료 종류·장면·형식·배점을 맞췄어요.`);
}


/* ───────── 지금 만들고 있는 자료 불러오기 ───────── */
const FIG_ENGINE={climate:'GG',energy:'GG',religion:'GG',population:'GG',agriculture:'GG',mapquick:'WG',mapedit:'WG',landform:'LG',kmap:'LG'};
const FIG_DPI=200;
function figApi(id){ const A=typeof HUB!=='undefined'&&HUB.apis&&HUB.apis[id]; return A&&A.getDoc?A:null; }
function blobUrl(b){ return new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(b); }); }
async function pngOf(id,doc,dpi){
  const E=FIG_ENGINE[id]; dpi=dpi||FIG_DPI;
  if(E==='GG'&&typeof GG!=='undefined') return GG.renderPng(doc,{dpi});
  if(E==='WG'&&typeof WG!=='undefined') return WG.renderPng(doc,{dpi});
  if(E==='LG'&&typeof LG!=='undefined') return LG.renderPng(doc,dpi);
  throw new Error('engine');
}
async function loadFig(id){
  const name=(TOOLS.find(t=>t[0]===id)||[id,id])[1];
  const A=figApi(id); if(!A){ toast(`${name} 탭을 먼저 열어 자료를 만들어 주세요.`); return; }
  let doc; try{ doc=A.getDoc(); }catch(e){}
  if(!doc){ toast(`${name} 탭에 아직 자료가 없어요.`); return; }
  toast(`${name} 그림을 가져오는 중이에요…`);
  try{
    const blob=await pngOf(id,doc); if(!blob) throw new Error('empty');
    const url=await blobUrl(blob); const im=new Image(); await new Promise((ok,no)=>{ im.onload=ok; im.onerror=no; im.src=url; });
    const f={id,name,url,blob,w:im.naturalWidth,h:im.naturalHeight,t:Date.now()};
    const i=figs.findIndex(x=>x.id===id); if(i>=0) figs[i]=f; else figs.push(f);
    toast(`${name} 그림을 불러왔어요. 시험지 미리 보기에 들어가요.`); changed('step');
  }catch(e){ console.error(e); toast(`${name} 그림을 만들지 못했어요. 그 탭에서 자료가 보이는지 확인해 주세요.`); }
}
function removeFig(id){ figs=figs.filter(f=>f.id!==id); changed('step'); }
async function copyOne(id){
  const f=figs.find(x=>x.id===id); if(!f) return;
  try{ await navigator.clipboard.write([new ClipboardItem({'image/png':f.blob})]); toast(`${f.name} 그림을 복사했어요. 한글·워드에 붙여 넣으세요.`); }
  catch(e){ toast('이 브라우저에서는 복사가 막혀 있어요. ‘저장’을 눌러 PNG로 받아 주세요.'); }
}
async function saveOne(id){
  const f=figs.find(x=>x.id===id); if(!f) return;
  let blob=f.blob, note='';
  try{ const A=figApi(id); const doc=A&&A.getDoc(); if(doc){ blob=await pngOf(id,doc,600); note=' (600 dpi, 그 탭의 지금 상태)'; } }catch(e){ note=' (화면 해상도)'; }
  const a=h('a',{href:URL.createObjectURL(blob),download:`${f.name}_${+it.no||1}번.png`}); document.body.append(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },800);
  toast(`${f.name} 그림을 PNG로 저장했어요${note}.`);
}
async function copyFig(){
  if(!figs.length){ toast('불러온 자료 그림이 없어요. 3단계에서 불러와 주세요.'); return; }
  try{ await navigator.clipboard.write([new ClipboardItem({'image/png':figs[0].blob})]); toast(figs.length>1?`첫 번째 그림(${figs[0].name})을 복사했어요. 한글·워드에 붙여 넣으세요.`:'자료 그림을 복사했어요. 한글·워드에 붙여 넣으세요.'); }
  catch(e){ toast('이 브라우저에서는 복사가 막혀 있어요. 각 도구에서 PNG로 저장해 주세요.'); }
}
function figSection(){
  const row=h('div',{class:'ichips'});
  for(const [id,name] of TOOLS){ if(!toolExists(id)) continue;
    const have=figs.find(f=>f.id===id);
    const b=h('button',{type:'button',class:'btn small',title:'지금 그 탭에 만들어 둔 그림을 가져와요'},have?`${name} 다시 불러오기`:`${name} 불러오기`);
    b.addEventListener('click',()=>loadFig(id)); row.append(b); }
  const list=h('div',{class:'ifigs'});
  figs.forEach(f=>list.append(h('div',{class:'ifig'},h('img',{src:f.url,alt:`${f.name} 그림`}),h('div',{class:'ifig-info'},h('b',null,f.name),h('small',null,`${f.w}×${f.h} px`),h('div',{class:'ifig-btns'},...[['복사',()=>copyOne(f.id)],['저장',()=>saveOne(f.id)],['빼기',()=>removeFig(f.id)]].map(([t,fn])=>{ const x=h('button',{type:'button',class:'btn small'},t); x.addEventListener('click',fn); return x; }))))));
  return sec('지금 만들고 있는 자료 불러오기',row,
    h('p',{class:'sub'},'다른 탭에서 만들고 있는 그래프·지도 그림을 그대로 가져와 시험지 미리 보기의 자료 자리에 넣어요. 그 탭에서 자료를 만든 뒤 눌러 주세요. 그 탭을 고친 뒤에는 ‘다시 불러오기’를 눌러 주세요.'),
    figs.length?list:null,
    figs.length?h('p',{class:'sub'},'‘복사’는 한글·워드에 붙여 넣는 용, ‘저장’은 PNG 파일(600 dpi)로 받는 용이에요. 불러온 그림은 이 화면에만 있어서 새로고침하면 사라져요.'):null);
}

/* 3. 장면·자료 */
function stepScene(S){
  S.append(head('3. 문제 장면 설정','평가 요소를 담을 자료와 장면을 정하고, 자료의 기호가 무엇을 가리키는지 적어요. 자료 그림은 다른 탭에서 만들어요.'));
  const G=relatedGichul();
  if(G.length){ const st=IT.stats(G); S.append(sec('같은 성취기준 기출 경향',h('p',{class:'sub'},
    `자료: ${st.data.slice(0,4).map(([k,v])=>`${k} ${v}`).join(', ')} · 장면: ${st.scene.slice(0,3).map(([k,v])=>`${k} ${v}`).join(', ')} · 형식: ${st.form.slice(0,3).map(([k,v])=>`${k} ${v}`).join(', ')}`))); }
  S.append(sec('자료 종류',seg(IT.DKINDS.map(d=>[d.k,d.name]),()=>it.dk,v=>{ it.dk=v; changed('step'); },'wrap')));
  const scs=h('select',{'aria-label':'장면'}); for(const s of IT.SCENES) scs.append(h('option',{value:s.k},s.name)); scs.value=it.scene;
  scs.addEventListener('change',()=>{ it.scene=scs.value; it.indEdit=''; changed('step'); });
  const ph={graph:'예: 지도에 표시된 네 지역의 기후 특성',table:'예: 세 국가의 도시화 특성',map:'예: 세계의 지진 발생 지점',text:'예: 대기 대순환',photo:'예: 두 지역의 지형',mixed:'예: 세 국가의 국장'}[it.dk];
  const ab=input(it.about,v=>{ it.about=v; changed(); },{placeholder:ph});
  S.append(sec('장면과 자료 설명',fld('장면',scs,it.scene==='none'?'장면 없이 자료만 주면 ‘그래프는 …을 나타낸 것이다.’로 시작해요.':'장면 문장의 ○○은 4단계에서 고쳐 써요.'),it.scene==='none'?fld('무엇을 나타낸 자료인가요?',ab):null));
  /* 자료 만들기 */
  const rec=new Set(IT.stats(G).tool.slice(0,2).map(([k])=>TOOL_OF[k]).filter(Boolean));
  const links=h('div',{class:'ichips'}); for(const [id,name] of TOOLS) if(toolExists(id)) links.append(h('a',{class:'ichip',href:'#open:'+id,title:rec.has(id)?'같은 성취기준 기출에서 많이 쓴 자료예요':null},name,rec.has(id)?h('small',null,'기출'):null));
  const imC=h('button',{type:'button',class:'btn small'},'기후 탭 지점 가져오기'); imC.addEventListener('click',importClimate);
  const imM=h('button',{type:'button',class:'btn small'},'백지도 기호 가져오기'); imM.addEventListener('click',importMap);
  const imT=Object.keys(TABTAB).filter(toolExists).map(t=>{ const b=h('button',{type:'button',class:'btn small'},`${TABTAB[t]} 탭 표 가져오기`); b.addEventListener('click',()=>importTable(t)); return b; });
  S.append(sec('자료 만들기',links,h('div',{class:'ichips'},toolExists('climate')?imC:null,...imT,toolExists('mapedit')||toolExists('mapquick')?imM:null),
    h('p',{class:'sub'},'다른 탭에서 기호를 붙여 자료를 만든 뒤 ‘가져오기’를 누르면 기호와 대상 이름이 아래에 채워져요. 기후 탭 지점이나 에너지·종교·인구·농업 탭 표를 가져오면 5단계에서 수치로 참·거짓을 판정한 선지 후보가 나와요.')));
  S.append(figSection());
  /* 기호 묶음 */
  const box=h('div',{class:'ifld'});
  it.groups.forEach((g,gi)=>box.append(groupEditor(g,gi)));
  const add=h('button',{type:'button',class:'btn small'},'+ 기호 묶음 추가'); add.addEventListener('click',()=>{ const used=new Set(it.groups.map(g=>g.seq)); const seq=['latin','gana','circ','mk'].find(s=>!used.has(s))||'latin'; it.groups.push({seq,labels:IT.seqList(seq,4),names:['','','',''],target:''}); changed('step'); });
  S.append(sec('자료의 기호와 대상',h('p',{class:'sub'},'기호가 가리키는 정답 대상을 적으면 단서 조항 ‘(단, … 각각 … 중 하나임.)’이 만들어져요. 대상은 가나다순으로 적혀요.'),box,add));
  S.append(sec('자료 메모',fld('미리 보기 자료 칸에 적을 말',input(it.dataNote,v=>{ it.dataNote=v; changed(); },{placeholder:'예: 기후 그래프 (가)~(라) + 위치 지도'})),
    fld('자료 연도·출처',input(it.srcNote,v=>{ it.srcNote=v; changed(); },{placeholder:'예: 1991~2020년 평년값, 기상청(JMA)'})),
    it.dk==='map'?h('label',{class:'check'},(()=>{ const c=h('input',{type:'checkbox'}); c.checked=!!it.mapIsWorld; c.addEventListener('change',()=>{ it.mapIsWorld=c.checked; changed(); }); return c; })(),'세계·대륙 전도예요(축척 생략)'):null));
}
function groupEditor(g,gi){
  const wrap=h('div',{class:'igroup'});
  const sq=h('select',{'aria-label':'기호 종류'}); for(const [k,t] of Object.entries(IT.SEQ_NAME)) sq.append(h('option',{value:k},t)); sq.value=g.seq;
  sq.addEventListener('change',()=>{ g.seq=sq.value; g.labels=IT.seqList(g.seq,g.labels.length); changed('step'); });
  const n=h('input',{type:'number',min:'2',max:'8',value:String(g.labels.length),'aria-label':'기호 개수'});
  n.addEventListener('change',()=>{ const k=Math.max(2,Math.min(8,+n.value||4)); g.labels=IT.seqList(g.seq,k); g.names=Array.from({length:k},(_,i)=>g.names[i]||''); changed('step'); });
  const tg=input(gi===0?it.target:g.target,v=>{ if(gi===0) it.target=v; else g.target=v; changed(); },{placeholder:'대상 (지역·국가 …)','aria-label':'대상','list':'iTargets'});
  const x=gi>0?h('button',{type:'button',class:'ico x','aria-label':'이 묶음 지우기'},'×'):null; if(x) x.addEventListener('click',()=>{ it.groups.splice(gi,1); changed('step'); });
  const cc=h('input',{type:'checkbox'}); cc.checked=g.cond!==false; cc.addEventListener('change',()=>{ g.cond=cc.checked; changed(); });
  wrap.append(h('div',{class:'igroup-head'},sq,n,tg,x),h('label',{class:'check'},cc,'이 묶음의 대상 이름을 단서 조항에 넣기'));
  const names=h('div',{class:'inames'});
  g.labels.forEach((l,i)=>{ names.append(h('b',null,l),input(g.names[i]||'',v=>{ g.names[i]=v; changed(); },{'aria-label':`${l} 대상 이름`,placeholder:gi===0?'정답 대상 (예: 싱가포르)':'지도 기호라면 비워 둬도 돼요'})); });
  wrap.append(names);
  if(!document.getElementById('iTargets')){ const dl=h('datalist',{id:'iTargets'}); for(const t of TARGETS) dl.append(h('option',{value:t})); ROOT.querySelector('.iapp').append(dl); }
  return wrap;
}
function importClimate(){
  const api=HUB.apis.climate; if(!api||!api.getDoc){ toast('기후 탭을 불러오는 중이에요…'); HUB.show('climate').then(()=>{ if(HUB.apis.climate&&HUB.apis.climate.getDoc){ importClimate(); HUB.show('item').catch(()=>{}); } }).catch(()=>{}); return; }
  const d=api.getDoc(); if(d.seq==='name'){ toast('기후 탭의 라벨이 ‘지명’이에요. (가)·A·㉠ 중 하나로 바꾼 뒤 가져와 주세요.'); return; }
  const S=GG.plotted(d).filter(s=>s.lbl); if(!S.length){ toast('기후 탭에 기호가 붙은 지점이 없어요.'); return; }
  it.climate=S.map(s=>({l:s.lbl,name:s.name,country:s.country||'',t:s.t.slice(),p:s.p.slice(),lat:s.lat,elev:s.elev})); it.table=null; it.dataSrc='climate';
  const labels=S.map(s=>s.lbl); const seq=IT.seqOf(labels[0])||'gana';
  it.groups[0]={seq,labels,names:S.map(s=>s.name),target:'',cond:false}; it.target='지역'; it.dk=d.kind==='tb'?'table':'graph';
  if(!it.about) it.about=`${KN[S.length]||S.length} 지역의 기후 특성`;
  try{ const H=GG.hintOf(d); if(H&&H.sentence) it.condExtra=H.sentence.replace(/^\(단,\s*/,'').replace(/임\.\)$/,''); }catch(e){}
  if(!it.srcNote&&d.notes&&d.notes.normal) it.srcNote='1991~2020년 평년값';
  candTab='data'; changed('step'); toast(`기후 탭의 ${S.length}개 지점을 가져왔어요. 지점 이름은 정답 기록용이라 단서 조항에는 넣지 않았어요.`);
}

const TABTAB={energy:'에너지',religion:'종교',population:'인구',agriculture:'농업'};
/* 에너지·종교·인구·농업 탭의 표 → it.table (행=나라, 열=지표로 맞춰 둔다) */
function tableOf(doc,tab){
  const d=doc&&doc.data; if(!d||!Array.isArray(d.rows)||!Array.isArray(d.cols)||!d.rows.length||!d.cols.length) return null;
  const CG=(IT.data&&IT.data.facts&&IT.data.facts.contG)||{};
  const rI=d.rows.map((r,i)=>i).filter(i=>!d.rows[i].hide&&String(d.rows[i].name||'').trim());
  const cI=d.cols.map((c,j)=>j).filter(j=>!d.cols[j].hide&&String(d.cols[j].name||'').trim());
  const nr=rI.filter(i=>CG[String(d.rows[i].name).trim()]).length, nc=cI.filter(j=>CG[String(d.cols[j].name).trim()]).length;
  const unit=String(d.unit||'').trim(); const uo=c=>String(c.unit||unit||'');
  const val=(i,j)=>{ const x=(d.v[i]||[])[j]; return Number.isFinite(x)?x:null; };
  if(nc>nr){ /* 열이 나라인 표: 돌려 세운다 */
    return {tab,title:(doc.meta&&doc.meta.title)||'',unit,
      rows:cI.map(j=>({name:String(d.cols[j].name).trim(),l:String(d.cols[j].lbl||'').trim()})),
      cols:rI.map(i=>({name:String(d.rows[i].name).trim(),unit:unit,grp:'',l:String(d.rows[i].lbl||'').trim()})),
      v:cI.map(j=>rI.map(i=>val(i,j))),flipped:true}; }
  return {tab,title:(doc.meta&&doc.meta.title)||'',unit,
    rows:rI.map(i=>({name:String(d.rows[i].name).trim(),l:String(d.rows[i].lbl||'').trim()})),
    cols:cI.map(j=>({name:String(d.cols[j].name).trim(),unit:uo(d.cols[j]),grp:String(d.cols[j].grp||''),l:String(d.cols[j].lbl||'').trim()})),
    v:rI.map(i=>cI.map(j=>val(i,j)))};
}
function importTable(tab){
  const api=HUB.apis[tab]; if(!api||!api.getDoc){ toast(`${TABTAB[tab]} 탭을 불러오는 중이에요…`); HUB.show(tab).then(()=>{ if(HUB.apis[tab]&&HUB.apis[tab].getDoc){ importTable(tab); HUB.show('item').catch(()=>{}); } }).catch(()=>{}); return; }
  const doc=api.getDoc(); const T=tableOf(doc,tab); if(!T){ toast(`${TABTAB[tab]} 탭에 아직 표가 없어요.`); return; }
  T.measure=String((doc.data&&doc.data.measure)||'');
  const colLab=T.cols.some(c=>c.l);
  let labelled=T.rows.filter(r=>r.l);
  if(labelled.length>=2&&labelled.length<T.rows.length){ const keep=T.rows.map((r,i)=>r.l?i:-1).filter(i=>i>=0); T.v=keep.map(i=>T.v[i]); T.rows=keep.map(i=>T.rows[i]); }
  let autoLab=false; if(!labelled.length&&!colLab){ const L=IT.seqList('gana',T.rows.length); T.rows.forEach((r,i)=>{ r.l=L[i]||''; }); autoLab=true; labelled=T.rows.filter(r=>r.l); }
  it.table=T; it.climate=null; it.dataSrc='table';
  const rowNoun=(doc.data&&doc.data.rowNoun)||'국가'; const colNoun={energy:'에너지 자원',religion:'종교',population:'항목',agriculture:'작물'}[tab]||'항목';
  const groups=[];
  const rowsL=T.rows.filter(r=>r.l), colsL=T.cols.filter(c=>c.l);
  if(rowsL.length>=2||(rowsL.length===1&&!colsL.length)){ const labels=rowsL.map(r=>r.l); groups.push({seq:IT.seqOf(labels[0])||'gana',labels,names:rowsL.map(r=>r.name),target:T.flipped?'국가':rowNoun,cond:false}); }
  if(colsL.length){ const labels=colsL.map(c=>c.l); groups.push({seq:IT.seqOf(labels[0])||'latin',labels,names:colsL.map(c=>c.name),target:T.flipped?colNoun:colNoun,cond:false}); }
  if(!groups.length) groups.push({seq:'gana',labels:['(가)','(나)','(다)','(라)'],names:['','','',''],target:'',cond:false});
  it.groups=groups; it.dk=doc.kind==='tb'||doc.kind==='table'?'table':'graph';
  it.target=groups[0].target||rowNoun;
  if(!it.about) it.about=`${KN[T.rows.length]||T.rows.length} 나라의 ${TABTAB[tab]} 특징`;
  if(!it.srcNote&&doc.meta&&doc.meta.year) it.srcNote=String(doc.meta.year);
  candTab='data'; candF={kind:'all',m:'all',ox:'all',tier:'all'}; changed('step');
  toast(`${TABTAB[tab]} 탭의 표(${T.rows.length}행 × ${T.cols.length}열)를 가져왔어요. ${groups.map(g=>`${IT.rangeOf(g.labels)} = ${g.target||'대상'}`).join(', ')}.${autoLab?' 표에 기호가 없어서 행에 (가), (나)…를 붙였어요.':''} 이름은 정답 기록용이라 단서 조항에는 넣지 않았어요.`);
}
function importMap(from){
  const A=HUB.apis; const api=from&&A[from]&&A[from].getDoc?A[from]:(A.mapedit&&A.mapedit.getDoc?A.mapedit:A.mapquick);
  if(!api||!api.getDoc){ toast('백지도 탭을 먼저 열어 기호를 붙여 주세요.'); return; }
  const d=api.getDoc(); if(!d){ toast('백지도에 아직 지도가 없어요.'); return; }
  const k=WG.answerKey(d); if(!k){ toast('백지도에 기호가 붙은 곳이 없어요.'); return; }
  const pairs=k.key.split(' · ').map(x=>{ const i=x.indexOf(' '); return [x.slice(0,i),x.slice(i+1).replace(/\(부근\)$/,'')]; });
  const labels=pairs.map(p=>p[0]), names=pairs.map(p=>p[1]); const seq=IT.seqOf(labels[0])||'latin';
  const gi=it.groups.findIndex(g=>g.seq===seq);
  const ng={seq,labels,names,target:gi>0?it.groups[gi].target:'',cond:false};
  if(gi>=0) it.groups[gi]=ng; else it.groups.push(ng);
  it.mapIsWorld=/world/.test(String(d.preset||''));
  changed('step'); toast(`백지도의 기호 ${labels.length}개를 가져왔어요${d.layers&&d.layers.scale&&d.layers.scale!=='none'?' (축척 있음)':''}.`);
}

/* 4. 발문 */
function stepStem(S){
  S.append(head('4. 발문 쓰기','형식을 고르면 경기도 문서 규칙대로 발문을 조립해요. 간접 발문(자료 설명) → 직접 발문(물음) → 단서 조항 → 배점 순이에요.'));
  const forms=IT.FORMS.map(f=>[f.k,f.name]);
  S.append(sec('형식',seg(forms,()=>it.form,v=>{ it.form=v; it.dirEdit=''; changed('step'); },'wrap'),
    h('p',{class:'sub'},({one:'옳은 선택지 하나. 선택지는 5개.',neg:'옳지 않은 선택지 하나. 부정어에 밑줄을 그어요. ‘가장’을 쓰지 않아요.',bogi:'<보기> ㄱ~ㄹ에서 옳은 것을 고르는 형식. 답지마다 고른 개수가 같을 때 써요.',bogiAny:'답지마다 고른 개수가 다를 때 ‘있는 대로’를 써요. ‘모두 고르면?’은 쓰지 않아요.',find:'기호와 대상을 짝짓는 형식(지도의 A~D에서 고르기 등).',stu:'갑·을·병·정의 대답을 판정하는 형식.',score:'○·× 답변을 채점해 점수를 고르는 형식.',best:'선택지가 부분적으로 모두 맞을 때 ‘가장 적절한’을 써요. 부정형과 함께 쓰지 않아요.'})[it.form]||'')));
  if(it.form==='stu'){ const c=h('input',{type:'checkbox'}); c.checked=!!it.anyCount; c.addEventListener('change',()=>{ it.anyCount=c.checked; changed('step'); }); S.append(sec('',h('label',{class:'check'},c,'답지마다 고른 학생 수가 달라요(‘있는 대로’)'))); }
  if(isBogi()) S.append(sec('<보기> 항목 수',seg([[3,'3개 (ㄱ~ㄷ)'],[4,'4개 (ㄱ~ㄹ)']],()=>it.bogiN||4,v=>{ it.bogiN=v; changed('step'); })));
  S.append(sec('배점',seg([[2,'2점'],[3,'3점']],()=>it.pts,v=>{ it.pts=v; changed('step'); })));
  if(it.form!=='find'&&it.form!=='stu'&&it.form!=='score'&&IT.indirectStem(it)) S.append(sec('대상 부르기',seg([['labels',`${IT.rangeOf(g0().labels)} ${it.target||''}에 대한`.replace(/\s+/g,' ')],['this','이에 대한']],()=>it.refMode,v=>{ it.refMode=v; it.dirEdit=''; changed('step'); },'wrap')));
  if(it.form==='find') S.append(sec('고를 곳',input(it.pickFrom,v=>{ it.pickFrom=v; changed(); },{placeholder:it.groups[1]?`지도의 ${IT.rangeOf(it.groups[1].labels)}`:'예: 지도의 A～D'})));
  /* 단서 조항 */
  const cc=h('input',{type:'checkbox'}); cc.checked=it.condOn!==false; cc.addEventListener('change',()=>{ it.condOn=cc.checked; changed(); });
  S.append(sec('단서 조항',h('label',{class:'check'},cc,'대상 이름으로 단서 조항 만들기'),
    fld('덧붙일 조건',input(it.condExtra,v=>{ it.condExtra=v; changed(); },{placeholder:'예: ㉠, ㉡ 시기는 각각 1월, 7월 중 하나'}),'기후 탭에서 시기 이름을 숨겼다면 가져오기 때 저절로 채워져요. 정답을 찾는 데 필요한 조건은 빠짐없이, 정답의 단서가 되는 말은 빼요.')));
  /* 문장 */
  const ind=area(it.indEdit||IT.indirectStem(it),v=>{ it.indEdit=v===IT.indirectStem(it)?'':v; changed(); },{rows:2,placeholder:'간접 발문이 없으면 비워 둬요'});
  const dir=area(it.dirEdit||IT.directStem(it),v=>{ it.dirEdit=v===IT.directStem(it)?'':v; changed(); },{rows:2});
  const rs=h('button',{type:'button',class:'btn small'},'자동 문장으로 되돌리기'); rs.addEventListener('click',()=>{ it.indEdit=''; it.dirEdit=''; changed('step'); });
  const cp=h('button',{type:'button',class:'btn small'},'발문 복사'); cp.addEventListener('click',copyStem);
  S.append(sec('발문',fld('간접 발문(자료 설명)',ind),fld('직접 발문(물음)',dir),h('div',{class:'ichips'},rs,cp),
    h('p',{class:'sub'},'그림·표·그래프 앞에는 ‘다음’을 쓰지 않고, 글상자 자료에만 ‘다음 글은’을 써요. 자료를 가리킬 때는 ‘이에 대한’, ‘이 자료에 대한’이라고 써요.')));
  /* 기출 발문 참고 */
  if(IT.hasKice){ const G=relatedGichul().slice(0,8); if(G.length){ const ul=h('ul',{class:'ilist'}); for(const g of G){ const k=IT.kiceOf(g.id); if(!k) continue; ul.append(h('li',null,h('div',{class:'grow'},h('div',{class:'stem'},k.stem+(k.cond?' '+k.cond:'')),h('div',{class:'meta'},`${g.name} ${g.no}번 · ${g.form}`)))); }
    S.append(sec('같은 성취기준 기출 발문(개인판에만 보여요)',ul,gBtn())); } }
}

/* 5. 선지 */
function stepStmt(S){
  S.append(head('5. 선지 만들기',it.form==='find'?'기호와 대상의 짝을 정하면 답지 다섯 개를 기출처럼 배열해요.':'자료로 참·거짓이 갈리는 진술을 고르고, ‘단독 → 비교 → 통합’ 순으로 배열해요.'));
  if(it.form==='find'){ stepFind(S); return; }
  const N=need();
  const list=h('ol',{class:'istm'});
  const labs=it.form==='stu'?IT.STU:isBogi()?IT.JAMO:IT.CIRC;
  it.stmts.forEach((s,i)=>{
    const ta=h('textarea',{rows:2,'aria-label':`선택지 ${i+1}`}); ta.value=s.text; ta.addEventListener('input',()=>{ s.text=ta.value; s.kind=IT.kindOf(s.text); s.src='me'; s.why=''; s.warn=''; changed(); });
    const tf=h('button',{type:'button',class:'tf','data-v':s.truth===true?'1':s.truth===false?'0':'',title:'참·거짓 바꾸기'},s.truth===true?'O':s.truth===false?'X':'?');
    tf.addEventListener('click',()=>{ s.truth=s.truth===null?true:s.truth===true?false:null; changed('step'); });
    const up=h('button',{type:'button',class:'ico','aria-label':'위로'},'↑'); up.addEventListener('click',()=>{ if(i>0){ [it.stmts[i-1],it.stmts[i]]=[it.stmts[i],it.stmts[i-1]]; changed('step'); } });
    const dn=h('button',{type:'button',class:'ico','aria-label':'아래로'},'↓'); dn.addEventListener('click',()=>{ if(i<it.stmts.length-1){ [it.stmts[i+1],it.stmts[i]]=[it.stmts[i],it.stmts[i+1]]; changed('step'); } });
    const x=h('button',{type:'button',class:'ico x','aria-label':'지우기'},'×'); x.addEventListener('click',()=>{ it.stmts.splice(i,1); changed('step'); });
    list.append(h('li',null,h('span',{class:'lbl'},labs[i]||'·'),ta,h('div',{class:'tools'},tf,h('span',{class:'kind'},s.kind||IT.kindOf(s.text)),up,dn,x),
      s.why||s.warn?h('div',{class:'why'+(s.warn?' warn':'')},[s.why,s.warn].filter(Boolean).join(' — ')):null));
  });
  const A=ans();
  const sort=h('button',{type:'button',class:'btn small'},'순서 정리'); sort.addEventListener('click',()=>{ it.stmts=IT.sortStmts(it.stmts); changed('step'); toast('단독 → 비교 → 통합, 기호 순으로 정리했어요.'); });
  const clr=h('button',{type:'button',class:'btn small'},'비우기'); clr.addEventListener('click',()=>{ if(it.stmts.length&&!confirm('선지를 모두 지울까요?')) return; it.stmts=[]; changed('step'); });
  const status=h('p',{class:'msg '+(A.ans&&it.stmts.length===N?'ok':'warn')},
    it.stmts.length<N?`${N}개 중 ${it.stmts.length}개를 골랐어요. 아래 후보에서 더 넣어 주세요.`:it.stmts.length>N?`${N}개보다 많아요. ${it.stmts.length-N}개를 빼 주세요.`:A.ans?`정답: ${IT.CIRC[A.ans-1]}${A.opts&&A.opts[A.ans-1]&&(isBogi()||it.form==='stu')?' ('+A.opts[A.ans-1]+')':''}`:'정답이 정해지지 않았어요. 참·거짓을 확인해 주세요.');
  S.append(sec(`고른 선지 (${it.stmts.length}/${N})`,it.stmts.length?list:h('p',{class:'empty'},'아직 고른 선지가 없어요.'),h('div',{class:'ichips'},sort,clr),status,
    ...(A.msg||[]).map(m=>h('p',{class:'msg warn'},m))));
  /* 후보 */
  const tabs=[['data','자료로 판정'],['tpl','진술 틀'],['me','직접 쓰기']]; if(IT.hasKice) tabs.splice(2,0,['gichul','기출 선지']);
  const box=h('div',{class:'ifld'});
  S.append(sec('후보',seg(tabs,()=>candTab,v=>{ candTab=v; renderStep(); },'wrap'),box,gBtn('기출에서 어떻게 나왔는지 보기 →')));
  if(candTab==='data') candData(box); else if(candTab==='tpl') candTpl(box); else if(candTab==='gichul') candGichul(box); else candMe(box);
}
function addStmt(o){ const N=need(); if(it.stmts.length>=N&&!confirm(`이미 ${N}개예요. 그래도 넣을까요?`)) return; it.stmts.push({id:uid(),text:o.text,truth:o.truth==null?null:o.truth,kind:o.kind||IT.kindOf(o.text),why:o.why||'',warn:o.warn||'',note:o.note||'',src:o.src||'me'}); changed('step'); }
function candData(box){
  const isT=it.dataSrc==='table'&&it.table; const isC=!isT&&it.climate&&it.climate.length;
  if(!isT&&!isC){ box.append(h('p',{class:'empty'},'3단계에서 ‘기후 탭 지점 가져오기’를 누르거나, 에너지·종교·인구·농업 탭의 ‘문항 설계로 보내기’를 누르면, 표의 수치로 참·거짓을 판정한 진술 후보가 여기에 나와요. 다른 자료는 ‘진술 틀’이나 ‘직접 쓰기’를 써 주세요.')); return; }
  const C=isT?IT.tableStmts(it.table):IT.climateStmts(it.climate); const used=new Set(it.stmts.map(s=>s.text));
  if(!C.length){ box.append(h('p',{class:'empty'},'표에서 비교할 수치를 찾지 못했어요. 행이 둘 이상이고 숫자 열이 있어야 해요.')); return; }
  if(candF.tier==null) candF.tier='all';
  const ks=['all','단독','기준값','비교','통합'];
  const kSel=h('select',{'aria-label':'진술 꼴'}); for(const k of ks) kSel.append(h('option',{value:k},k==='all'?'모든 꼴':k)); kSel.value=candF.kind;
  const grps=[...new Set(C.map(c=>c.grp))]; const mSel=h('select',{'aria-label':'지표'}); mSel.append(h('option',{value:'all'},'모든 지표')); for(const g of grps) mSel.append(h('option',{value:g},g)); mSel.value=grps.includes(candF.m)?candF.m:'all';
  const oSel=h('select',{'aria-label':'참·거짓'}); for(const [v,t] of [['all','참·거짓 모두'],['o','참만'],['x','거짓만']]) oSel.append(h('option',{value:v},t)); oSel.value=candF.ox;
  const tSel=h('select',{'aria-label':'근거'}); for(const [v,t] of [['all','근거 모두'],['calc','자료로 계산'],['know','지식·세계 수치(확인 필요)']]) tSel.append(h('option',{value:v},t)); tSel.value=candF.tier;
  for(const [el,k] of [[kSel,'kind'],[mSel,'m'],[oSel,'ox'],[tSel,'tier']]) el.addEventListener('change',()=>{ candF[k]=el.value; renderStep(); });
  box.append(h('div',{class:'ifilter'},kSel,mSel,oSel,tSel));
  const show=C.filter(c=>(candF.kind==='all'||c.kind===candF.kind)&&(mSel.value==='all'||c.grp===mSel.value)&&(candF.ox==='all'||(candF.ox==='o')===c.truth)&&(candF.tier==='all'||c.tier===candF.tier));
  const ul=h('ul',{class:'icands'});
  const cap={}; const shown=show.filter(c=>{ cap[c.kind]=(cap[c.kind]||0)+1; return candF.kind!=='all'||cap[c.kind]<=40; });
  for(const c of shown){
    const add=h('button',{type:'button',class:'btn small','aria-label':'선지에 넣기'},'넣기'); add.addEventListener('click',()=>addStmt(c));
    ul.append(h('li',{class:used.has(c.text)?'used':null},h('span',{class:'ox '+(c.truth?'o':'x')},c.truth?'O':'X'),h('span',{class:'t'},c.text,h('span',{class:'w'+(c.warn?' warn':'')},[c.tier==='know'?'[확인 필요]':'',c.why,c.warn].filter(Boolean).join(' — '))),add));
  }
  box.append(ul,h('p',{class:'isrc'},`후보 ${show.length}개${shown.length<show.length?` 중 ${shown.length}개(꼴마다 40개까지, 위에서 꼴·지표를 고르면 모두 보여요)`:''}. ${isT?'‘자료로 계산’은 표의 값을 그대로 비교한 것이고, ‘지식·세계 수치’는 프로젝트 자료(FAO·Energy Institute·Pew)나 분류표에서 가져온 것이라 연도와 표기를 사람이 확인해야 해요.':'기후 구분은 교과서 기준(18℃·-3℃·10℃)으로 계산한 보조값이에요. 고산 기후는 판별하지 않아요. 낮 길이·태양 고도는 각 달 15일 기준이고, ‘지식’ 진술은 교과서 일반론이라 사람이 확인해야 해요. 강수 일수·일교차·바다와의 거리·해류는 자료에 없어 판정하지 않아요.'}`));
}
function candTpl(box){
  const L=g0().labels.length?g0().labels:['(가)','(나)','(다)']; const r=IT.rangeOf(L); const tg=it.target||'지역'; const a=L[0], b=L[1]||L[0], c=L[2]||L[1]||L[0];
  const T=[
    ['단독',`${IT.W(a,'은는')} ○○○이다.`],
    ['단독',`${IT.W(b,'은는')} ○○○에 위치한다.`],
    ['대응',`${IT.W(a,'은는')} ○○, ${IT.W(b,'은는')} ○○이다.`],
    ['비교',`${IT.W(a,'은는')} ${b}보다 ○○이/가 높다.`],
    ['비교',`${IT.W(c,'은는')} ${a}보다 ○○이/가 많다.`],
    ['통합',`${b}, ${IT.W(c,'은는')} 모두 ○○○.`],
    ['통합',`${r} 중 ○○이/가 가장 높은 ${tg}${IT.josa(tg,'은는')} ${c}이다.`],
    ['기준값',`${IT.W(a,'은는')} ○○이/가 ○○ 이상이다.`],
  ];
  const ul=h('ul',{class:'icands'});
  for(const [k,t] of T){ const add=h('button',{type:'button',class:'btn small'},'넣기'); add.addEventListener('click',()=>addStmt({text:t,kind:k,truth:null})); ul.append(h('li',null,h('span',{class:'kind'},k),h('span',{class:'t'},t),add)); }
  box.append(ul,h('p',{class:'sub'},'○○을 채우고 참·거짓(O/X)을 정해 주세요. 경기도 문서 사례(세계지리 10번)는 ‘단독 → 비교 → 통합’ 순으로 놓아요. 비교 대상이 없는 진술(예: ‘건기와 우기가 뚜렷하다’)은 논란 소지가 있어 기준값이나 비교 진술로 바꾸기를 권해요.'));
}
function candGichul(box){
  const G=relatedGichul(); const ul=h('ul',{class:'icands'}); let n=0;
  for(const g of G){ const k=IT.kiceOf(g.id); if(!k) continue; for(const s of k.stmts){ n++; const add=h('button',{type:'button',class:'btn small'},'가져오기'); add.addEventListener('click',()=>addStmt({text:s,truth:null,src:'gichul'}));
    ul.append(h('li',null,h('span',{class:'kind'},IT.kindOf(s)),h('span',{class:'t'},s,h('span',{class:'w'},`${g.name} ${g.no}번`)),add)); } }
  box.append(n?ul:h('p',{class:'empty'},'같은 성취기준 기출 선지가 없어요.'),h('p',{class:'isrc'},'평가원 기출 문장이에요. 그대로 쓰지 말고 진술 꼴을 참고해 내 자료에 맞게 고쳐 써 주세요(참·거짓은 비워 두었어요).'));
}
function candMe(box){
  const ta=h('textarea',{rows:2,placeholder:'선지 문장을 쓰고 참·거짓을 고른 뒤 넣기'}); let tv=null;
  const tf=seg([['1','참(O)'],['0','거짓(X)'],['','미정']],()=>tv===true?'1':tv===false?'0':'',v=>{ tv=v==='1'?true:v==='0'?false:null; [...tf.children].forEach(b=>b.setAttribute('aria-pressed',String(b.textContent.startsWith(v==='1'?'참':v==='0'?'거짓':'미정')))); });
  const add=h('button',{type:'button',class:'btn primary small'},'넣기'); add.addEventListener('click',()=>{ const t=ta.value.trim(); if(!t) return; addStmt({text:t,truth:tv}); });
  box.append(ta,h('div',{class:'ichips'},tf,add),h('p',{class:'sub'},'‘항상’, ‘반드시’ 같은 단정어와 주어만 바꾼 오답지는 점검에서 알려 줘요.'));
}
/* 찾기형: 짝 정하기 → 답지 다섯 개 */
function perms(a){ if(a.length<=1) return [a.slice()]; const out=[]; a.forEach((x,i)=>{ for(const p of perms(a.slice(0,i).concat(a.slice(i+1)))) out.push([x,...p]); }); return out; }
function findAnswer(){
  const A=g0().labels, B=(it.groups[1]||{}).labels||[]; const map=it.find.map||{};
  if(!A.length||!B.length) return {opts:[],ans:null,msg:['기호 묶음이 둘(예: (가)~(다)와 지도의 A~D) 있어야 해요. 3단계에서 묶음을 추가해 주세요.']};
  const right=A.map(a=>map[a]||''); if(right.some(x=>!x)) return {opts:[],ans:null,msg:['모든 기호의 짝을 골라 주세요.']};
  if(new Set(right).size!==right.length) return {opts:[],ans:null,msg:['같은 짝을 두 번 골랐어요.']};
  /* 후보: B에서 A 개수만큼 뽑은 순열. 정답과 한두 자리 다른 것 위주로 넷 */
  const pool=[]; const choose=(arr,k)=>k===0?[[]]:arr.flatMap((x,i)=>choose(arr.slice(i+1),k-1).map(r=>[x,...r]));
  for(const c of choose(B,A.length)) for(const p of perms(c)) pool.push(p);
  const diff=p=>p.reduce((s,x,i)=>s+(x!==right[i]),0); const key=p=>p.join(' ');
  const others=pool.filter(p=>key(p)!==key(right)).sort((x,y)=>diff(x)-diff(y)||key(x).localeCompare(key(y)));
  let pick=it.find.opts&&it.find.opts.length===5&&it.find.opts.some(o=>o===key(right))&&it.find.opts.every(o=>pool.some(p=>key(p)===o))?it.find.opts.map(o=>o.split(' ')):null;
  if(!pick){ const near=others.filter(p=>diff(p)<=2); const far=others.filter(p=>diff(p)>2); const ch=[]; for(const p of near.concat(far)){ if(ch.length>=4) break; if(!ch.some(q=>key(q)===key(p))) ch.push(p); } pick=[right,...ch]; }
  pick.sort((x,y)=>key(x).localeCompare(key(y)));
  const ai=pick.findIndex(p=>key(p)===key(right));
  const msg=[]; const pos=Array.from({length:A.length},(_,i)=>new Set(pick.map(p=>p[i])).size); if(pos.some(n=>n===1)) msg.push('어느 한 자리의 답이 다섯 답지에서 모두 같아요. 그 기호는 판별하지 않아도 풀려요.');
  return {opts:pick.map(p=>p.join('  ')),ans:ai+1,msg,head:A};
}
function stepFind(S){
  const A=g0().labels, B=(it.groups[1]||{}).labels||[];
  if(!B.length){ S.append(sec('',h('p',{class:'empty'},'찾기형은 자료 기호(예: (가)~(다))와 고를 기호(예: 지도의 A~D) 두 묶음이 필요해요. 3단계 ‘+ 기호 묶음 추가’를 눌러 주세요.'))); return; }
  const grid=h('div',{class:'inames'});
  for(const a of A){ const s=h('select',{'aria-label':`${a}의 짝`}); s.append(h('option',{value:''},'—')); for(const b of B) s.append(h('option',{value:b},b)); s.value=it.find.map[a]||'';
    s.addEventListener('change',()=>{ it.find.map[a]=s.value; it.find.opts=null; changed('step'); }); grid.append(h('b',null,a),s); }
  const F=findAnswer();
  const re=h('button',{type:'button',class:'btn small'},'오답 답지 다시 고르기'); re.addEventListener('click',()=>{ shuffleFind(); changed('step'); });
  S.append(sec('정답 짝',grid,h('p',{class:'sub'},'자료의 기호마다 정답이 되는 지도(그림)의 기호를 고르세요.')),
    sec('답지',F.opts.length?h('ol',{class:'ilist'},...F.opts.map((o,i)=>h('li',null,h('span',null,IT.CIRC[i]),h('span',{class:'grow'},o),i+1===F.ans?h('span',{class:'badge hot'},'정답'):null))):h('p',{class:'empty'},F.msg.join(' ')),re,...(F.opts.length?F.msg.map(m=>h('p',{class:'msg warn'},m)):[])));
}
function shuffleFind(){ const A=g0().labels, B=(it.groups[1]||{}).labels||[]; const map=it.find.map||{}; const right=A.map(a=>map[a]||''); if(right.some(x=>!x)) return;
  const choose=(arr,k)=>k===0?[[]]:arr.flatMap((x,i)=>choose(arr.slice(i+1),k-1).map(r=>[x,...r])); const pool=[]; for(const c of choose(B,A.length)) for(const p of perms(c)) pool.push(p.join(' '));
  const others=pool.filter(p=>p!==right.join(' ')); for(let i=others.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [others[i],others[j]]=[others[j],others[i]]; }
  it.find.opts=[right.join(' '),...others.slice(0,4)]; }

/* 6. 점검 */
function stepCheck(S){
  S.append(head('6. 문항 검토','자동 점검은 경기도 문서의 작성 원리로 기계가 볼 수 있는 것만 봐요. 나머지는 사람이 확인해 주세요.'));
  const C=IT.checks(it,ans());
  S.append(sec('자동 점검',checkList(C)));
  const box=h('div',{class:'imanual'});
  for(const [id,t] of IT.MANUAL){ const c=h('input',{type:'checkbox'}); c.checked=!!it.manual[id]; c.addEventListener('change',()=>{ it.manual[id]=c.checked; changed(); }); box.append(h('label',null,c,t)); }
  S.append(sec('사람이 볼 것',box));
  const cp=h('button',{type:'button',class:'btn primary'},'문항 복사'); cp.addEventListener('click',copyItem);
  const sv=h('button',{type:'button',class:'btn'},'작업 저장'); sv.addEventListener('click',saveFile);
  S.append(sec('마무리',h('div',{class:'ichips'},cp,sv),h('p',{class:'sub'},'복사한 문항을 한글(HWP)에 붙여 넣은 뒤, 각 탭에서 저장한 자료 그림을 자료 칸에 넣어 주세요.')));
}
function checkList(C){ const ul=h('ul',{class:'ichk'}); for(const c of C) ul.append(h('li',{class:c.lvl},h('span',null,c.msg,c.rule?h('small',null,c.rule):null))); return ul; }

/* ───────── 가운데: 시험지 모양 ───────── */
function stemHTML(P){
  const e=IT.esc; const dir=IT.underlineNeg(e(P.dir));
  return [P.ind?e(P.ind):'',dir,P.cond?e(P.cond):'',P.pts?`<span class="pts">${P.pts}</span>`:''].filter(Boolean).join(' ');
}
function renderPaper(){
  const W=$('#iPaper'); W.textContent='';
  if(!it.std&&!it.stmts.length&&!it.eval&&!figs.length&&!it.groups.some(g=>g.names.some(Boolean))&&!it.about){ W.append(h('div',{class:'empty-q'},'왼쪽 단계를 따라가면 여기에 시험지 모양으로 문항이 만들어져요.')); return; }
  const P=IT.stemParts(it); const showAns=$('#iShowAns').checked;
  const q=h('p',{class:'q'}); q.innerHTML=`<b>${+it.no||1}.</b> `+stemHTML(P); W.append(q);
  const dbox=h('div',{class:'idata'+(figs.length?' hasfig':'')}, figs.length?null:(it.dataNote||`(${(IT.DKINDS.find(d=>d.k===it.dk)||{}).name||'자료'} 자리)`));
  figs.forEach(f=>dbox.append(h('img',{class:'pfig',src:f.url,alt:`${f.name} 그림`})));
  if(figs.length&&it.dataNote) dbox.append(h('div',{class:'fignote'},it.dataNote));
  const gs=it.groups.filter(g=>g.labels.length); if(gs.length) dbox.append(h('div',null,'기호: '+gs.map(g=>IT.rangeOf(g.labels)).join(' / ')));
  if(it.srcNote) dbox.append(h('div',null,`자료: ${it.srcNote}`));
  W.append(dbox);
  if(it.form==='find'){ const F=findAnswer(); if(F.opts.length){ const hd=F.head||g0().labels; const tb=h('table',{class:'ifind'});
      tb.append(h('tr',null,h('td'),...hd.map(l=>h('th',null,l)))); F.opts.forEach((t,j)=>tb.append(h('tr',{class:showAns&&j+1===F.ans?'ans':null},h('td',null,IT.CIRC[j]),...t.split(/\s+/).map(x=>h('td',null,x))))); W.append(tb); }
    else W.append(h('p',{class:'ph'},'(5단계에서 정답 짝을 고르면 답지가 생겨요)')); return; }
  const A=ans();
  if(isBogi()){ const b=h('div',{class:'bogi'}); it.stmts.forEach((s,i)=>b.append(h('p',null,`${IT.JAMO[i]}. ${s.text}`))); if(!it.stmts.length) b.append(h('p',{class:'ph'},'(<보기> 항목)')); W.append(b); }
  if(it.form==='stu'){ const b=h('div',{class:'stu'}); it.stmts.forEach((s,i)=>b.append(h('p',null,`${IT.STU[i]}: ${s.text}`))); W.append(b); }
  const opts=A.opts&&A.opts.length?A.opts:(isBogi()||it.form==='stu'?[]:it.stmts.map(s=>s.text));
  if(!opts.length){ W.append(h('p',{class:'ph'},'(답지)')); return; }
  const short=opts.every(o=>o.length<=9);
  const o=h('div',{class:'iopts'+(short?'':' long')}); opts.forEach((t,i)=>o.append(h('p',{class:showAns&&A.ans===i+1?'ans':null},`${IT.CIRC[i]} ${t}`))); W.append(o);
}
function renderCard(){
  const C=$('#iCard'); C.textContent='';
  const so=stdObj(); const A=it.form==='find'?findAnswer():ans();
  const dl=h('dl',null,
    h('dt',null,'과목'),h('dd',null,`${curC().title} (${curC().curr})`),
    h('dt',null,'성취기준'),h('dd',null,so?`[${so.code}] ${so.text}`:'—'),
    h('dt',null,'평가 요소'),h('dd',null,it.eval||'—'),
    h('dt',null,'행동 영역'),h('dd',null,it.act),
    h('dt',null,'평가 목표'),h('dd',null,(it.goalAuto?IT.goalOf(it.eval,it.act):it.goal)||'—'),
    h('dt',null,'문제 장면'),h('dd',null,`${(IT.SCENES.find(s=>s.k===it.scene)||{}).name} · ${(IT.DKINDS.find(d=>d.k===it.dk)||{}).name}`),
    h('dt',null,'형식·배점'),h('dd',null,`${IT.formOf(it.form).name} · ${it.pts}점`),
    h('dt',null,'정답'),h('dd',null,A.ans?`${IT.CIRC[A.ans-1]}`+(it.groups[0]&&it.groups[0].names.some(Boolean)?` · ${it.groups.flatMap(g=>g.labels.map((l,i)=>g.names[i]?`${l} ${g.names[i]}`:'').filter(Boolean)).join(', ')}`:''):'—'));
  C.append(h('h3',null,'설계 카드'),dl);
}

/* ───────── 오른쪽 ───────── */
function renderSide(){
  const B=$('#iSideBody'); B.textContent='';
  [...$('#iSideSeg').children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===side)));
  if(side==='check'){ B.append(sec('자동 점검',checkList(IT.checks(it,ans()))),sec('',h('p',{class:'isrc'},'규칙 출처: 경기도교육청 「2024 평가문항 제작 방법(지리)」. ‘사람이 볼 것’은 6단계에 있어요.'))); return; }
  gichulPanel(B);
}
const TABNAME={climate:'기후',energy:'에너지',religion:'종교',population:'인구',agriculture:'농업',landform:'지형',map:'백지도'};
function myTab(){ return it.dataSrc==='table'&&it.table?it.table.tab:(it.climate&&it.climate.length?'climate':''); }
function gScore(g){ let n=0; const rel=it.std?IT.related(it.curr,it.std):[]; if(rel.includes(g.std)) n+=4; const t=myTab(); if(t&&g.tool===t) n+=3;
  const words=[it.eval,...it.groups.flatMap(x=>x.names)].join(' ').split(/[\s·,()]+/).filter(w=>w.length>=2); const hay=g.topic+' '+g.eval; for(const w of words) if(hay.includes(w)) n+=1; return n; }
function gichulPanel(B){
  const all=D().gichul, tab=myTab();
  if(!gF.scope) gF.scope=it.std?'std':tab?'tab':'all';
  if(gF.scope==='std'&&!it.std) gF.scope=tab?'tab':'all';
  if(gF.scope==='tab'&&!tab) gF.scope=it.std?'std':'all';
  const sc=seg([['std','같은 성취기준','고른 성취기준과 같은 기출'],['tab',tab?`같은 자료(${TABNAME[tab]})`:'같은 자료 탭','기후·에너지 등 같은 탭에서 만든 기출'],['all','전체 220문항']],()=>gF.scope,v=>{ gF.scope=v; gF.more=false; renderSide(); });
  const sel=(opts,get,set)=>{ const e=h('select',null,...opts.map(([v,t])=>h('option',{value:v},t))); e.value=get(); e.addEventListener('change',()=>{ set(e.value); gF.more=false; renderSide(); }); return e; };
  const dset=[...new Set(all.flatMap(g=>g.data))], fset=[...new Set(all.map(g=>g.form))];
  const q=h('input',{type:'text',placeholder:'주제·평가 요소·선지 검색(예: 난류, 쌀, 이슬람)',value:gF.q}); q.addEventListener('change',()=>{ gF.q=q.value.trim(); gF.more=false; renderSide(); });
  B.append(sec('기출 참고',h('p',{class:'sub'},'기출에서 이 내용이 어떤 자료·형식·선지로 나왔는지 보고, 발문과 선지 꼴을 가져와 고쳐 쓸 수 있어요.'),sc,
    h('div',{class:'ichips igfilt'},sel([['all','자료 전체'],...dset.map(x=>[x,x])],()=>gF.data,v=>gF.data=v),sel([['all','형식 전체'],...fset.map(x=>[x,x])],()=>gF.form,v=>gF.form=v),q)));
  let G=all.filter(g=>{
    if(gF.scope==='std'){ if(!IT.related(it.curr,it.std).includes(g.std)) return false; }
    else if(gF.scope==='tab'){ if(g.tool!==tab) return false; }
    if(gF.data!=='all'&&!g.data.includes(gF.data)) return false;
    if(gF.form!=='all'&&g.form!==gF.form) return false;
    if(gF.q){ const k=IT.kiceOf(g.id); const hay=[g.topic,g.eval,g.scene,k?k.stem+' '+k.stmts.join(' '):''].join(' '); if(!hay.includes(gF.q)) return false; }
    return true; });
  G=G.map(g=>[g,gScore(g)]).sort((x,y)=>y[1]-x[1]||(y[0].id<x[0].id?-1:1)).map(x=>x[0]);
  if(gF.scope==='std'&&!it.std){ B.append(sec('',h('p',{class:'empty'},'성취기준을 고르면 같은 성취기준의 기출이 나와요. ‘전체’로 둘러볼 수도 있어요.'))); return; }
  const st=IT.stats(G);
  B.append(sec(`기출 ${G.length}문항`,G.length?h('div',{class:'sub'},
    `선지 진술 꼴: ${st.kinds.length?st.kinds.map(([k,v])=>`${k} ${v}`).join(', '):'—'}`,h('br'),
    `자료: ${st.data.slice(0,5).map(([k,v])=>`${k} ${v}`).join(', ')} · 형식: ${st.form.slice(0,4).map(([k,v])=>`${k} ${v}`).join(', ')}`,h('br'),
    `문제 장면: ${st.scene.slice(0,4).map(([k,v])=>`${k} ${v}`).join(', ')}`):h('p',{class:'empty'},'조건에 맞는 기출이 없어요. 범위를 ‘전체’로 넓혀 보세요.')));
  const lim=gF.more?G.length:20; const ul=h('ul',{class:'ilist igich'});
  for(const g of G.slice(0,lim)) ul.append(gCard(g));
  B.append(ul);
  if(G.length>lim){ const m=h('button',{type:'button',class:'btn small'},`더 보기(${G.length-lim})`); m.addEventListener('click',()=>{ gF.more=true; renderSide(); }); B.append(m); }
  if(!IT.hasKice) B.append(sec('',h('p',{class:'isrc'},'공개판에는 평가원 기출 문장과 그림을 싣지 않아요(출제 구조 태그만). 원문과 그림은 해당 연도 평가원 PDF에서 확인해 주세요.')));
  else B.append(sec('',h('p',{class:'isrc'},'발문·선지 글은 개인판에만 있고 그림·정답은 싣지 않았어요. 그림과 정답은 해당 연도 평가원 PDF에서 확인해 주세요. 가져온 문장은 그대로 쓰지 말고 고쳐 써 주세요.')));
}
function gCard(g){
  const k=IT.kiceOf(g.id);
  const li=h('li',null,h('div',null,h('b',null,`${g.name} ${g.no}번`),g.pts===3?' [3점]':'',' · ',g.topic),
    h('div',{class:'meta'},`${g.eval}`),
    h('div',{class:'ichips igtags'},...[g.form,...g.data,g.scene&&g.scene,g.tool&&TABNAME[g.tool],g.act].filter(Boolean).map(t=>h('span',{class:'gtag'},t))));
  if(k){
    li.append(h('div',{class:'stem'},k.stem+(k.cond?' '+k.cond:'')));
    const use=h('button',{type:'button',class:'btn small'},'발문 참고로 넣기'); use.addEventListener('click',()=>{ if(it.dirEdit&&!confirm('직접 발문을 이 기출 발문으로 바꿀까요?')) return; it.dirEdit=k.stem; if(k.cond&&!it.condExtra) it.condExtra=k.cond; changed('step'); toast('발문을 넣었어요. 내 자료에 맞게 고쳐 주세요.'); });
    li.append(h('div',{class:'ichips'},use));
    if(k.stmts.length){ const ol=h('ol'); const d=h('details',null,h('summary',null,`선지 ${k.stmts.length}개 · ${Object.entries(g.kinds||{}).map(([a,b])=>a+' '+b).join(', ')}`),ol);
      for(const t of k.stmts){ const add=h('button',{type:'button',class:'btn small'},'가져오기'); add.addEventListener('click',()=>addStmt({text:t,truth:null,src:'gichul'})); ol.append(h('li',null,h('span',null,t),' ',add)); }
      li.append(d); }
  }
  return li;
}

/* ───────── 복사·저장 ───────── */
async function copyRich(html,text){
  try{ if(navigator.clipboard&&window.ClipboardItem){ await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]); return true; } }catch(e){}
  try{ await navigator.clipboard.writeText(text); return true; }catch(e){}
  const ta=h('textarea',{style:'position:fixed;left:-9999px'}); ta.value=text; document.body.append(ta); ta.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e){} ta.remove(); return ok;
}
function copyStem(){ const P=IT.stemParts(it); const t=[P.ind,P.dir,P.cond,P.pts].filter(Boolean).join(' '); copyRich(`<p>${stemHTML(P)}</p>`,t).then(ok=>toast(ok?'발문을 복사했어요.':'복사하지 못했어요.')); }
function copyItem(){
  const T=it.form==='find'?null:IT.itemText(it,+it.no||1);
  let text, html;
  if(T){ text=T.text+(T.ans?`\n정답: ${IT.CIRC[T.ans-1]}`:''); }
  else { const F=findAnswer(); const P=IT.stemParts(it); text=`${+it.no||1}. ${[P.ind,P.dir,P.cond,P.pts].filter(Boolean).join(' ')}\n[자료] ${it.dataNote||''}\n${F.opts.map((o,i)=>`${IT.CIRC[i]} ${o}`).join('\n')}${F.ans?`\n정답: ${IT.CIRC[F.ans-1]}`:''}`; }
  const W=$('#iPaper').cloneNode(true); W.querySelectorAll('.ans').forEach(e=>e.classList.remove('ans'));
  html=`<div style="font-family:'HY신명조','Batang',serif;font-size:10pt;line-height:1.6">${W.innerHTML.replace(/class="[^"]*"/g,'')}</div>`;
  copyRich(html,text).then(ok=>toast(ok?'문항을 복사했어요. 한글(HWP)에 붙여 넣으면 밑줄도 따라가요.':'복사하지 못했어요.'));
}
function saveFile(){
  const blob=new Blob([JSON.stringify(it,null,1)],{type:'application/json'});
  const a=h('a',{href:URL.createObjectURL(blob),download:`문항설계_${(it.std||'').replace('12세지','')||'새문항'}_${+it.no||1}.json`}); document.body.append(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
function load(d){ if(!d||d.app!=='item') return false; it=normalize(d); step=0; renderAll(); toast('문항 설계를 불러왔어요.'); save(); return true; }
function renderAll(){ $('#iNo').value=String(it.no||1); renderSteps(); renderStep(); renderPaper(); renderCard(); renderSide(); }

/* ───────── 이벤트 ───────── */
$('#iPrev').addEventListener('click',()=>go(step-1));
$('#iNext').addEventListener('click',()=>go(step===STEPS.length-1?0:step+1));
$('#iNo').addEventListener('input',()=>{ it.no=Math.max(1,Math.min(30,+$('#iNo').value||1)); changed(); });
$('#iShowAns').addEventListener('change',renderPaper);
$('#iCopy').addEventListener('click',copyItem);
$('#iCopyStem').addEventListener('click',copyStem);
$('#iCopyFig').addEventListener('click',copyFig);
$('#iSave').addEventListener('click',saveFile);
$('#iLoad').addEventListener('change',async e=>{ const f=e.target.files&&e.target.files[0]; if(!f) return; try{ if(!load(JSON.parse(await f.text()))) toast('문항 설계 작업 파일이 아니에요.'); }catch(err){ toast('작업 파일을 읽지 못했어요.'); } e.target.value=''; });
$('#iNew').addEventListener('click',()=>{ if(!confirm('지금 설계를 지우고 새 문항을 시작할까요?')) return; const keep={curr:it.curr,unit:it.unit,no:(+it.no||1)+1}; it=Object.assign(fresh(),keep); step=0; save(); renderAll(); });
[...$('#iSideSeg').children].forEach(b=>b.addEventListener('click',()=>{ side=b.dataset.v; renderSide(); }));
renderAll();
function pull(from){ if(from==='climate') importClimate(); else if(TABTAB[from]) importTable(from); else if(from==='mapedit'||from==='mapquick') importMap(from); else return; if(step!==2) go(2); }
return {load,pull,getDoc:()=>it};
});