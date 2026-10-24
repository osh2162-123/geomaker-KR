/* 문항 설계 엔진: 성취기준·기출 태그 조회, 발문 조립, 기후 자료로 선지 참·거짓 판정, 답지 구성, 문항 점검
   규칙 출처: 경기도교육청 「2024 평가문항 제작 방법(지리)」(발문·자료·<보기>·선택지 작성 원리, 검토 관점)
   기출 수치: 2024~2027학년도 6월·9월 모의평가와 수능 세계지리 11회 220문항 */
const IT=(function(){
'use strict';
let D=null, K=null;
function setData(d){ D=d; }
function setKice(k){ K=k; }
const fin=Number.isFinite;
const sum=a=>a.reduce((s,x)=>s+x,0), avg=a=>sum(a)/a.length;

/* ───────── 한국어 ───────── */
function batchim(w){
  const s=String(w||'').replace(/[\s)\]」』'"’”.]+$/,'');
  const c=s.slice(-1); if(!c) return false; const code=c.charCodeAt(0);
  if(code>=0xAC00&&code<=0xD7A3) return (code-0xAC00)%28!==0;
  if(/[ㄱ-ㅎ㉠-㉭]/.test(c)) return true;            /* 기역, 니은 … */
  if(/[㉮-㉻]/.test(c)) return false;                  /* 가, 나 … */
  if(/[A-Za-z]/.test(c)) return /[LMNRlmnr]/.test(c);   /* 엘, 엠, 엔, 알 */
  if(/\d/.test(c)) return /[013678]/.test(c);
  if(c==='℃') return false; if(c==='%') return false;
  return false;
}
function rieul(w){ const s=String(w||'').replace(/[\s)\]」』'"’”.]+$/,''); const code=s.slice(-1).charCodeAt(0); return code>=0xAC00&&code<=0xD7A3&&(code-0xAC00)%28===8; }
/* josa('(가)','은는') → '는' */
function josa(w,pair){
  const b=batchim(w);
  switch(pair){
    case '은는': return b?'은':'는';
    case '이가': return b?'이':'가';
    case '을를': return b?'을':'를';
    case '과와': return b?'과':'와';
    case '으로로': return b&&!rieul(w)?'으로':'로';
    case '이다': return b?'이다':'이다';
    default: return '';
  }
}
const W=(w,p)=>w+josa(w,p);
const koSort=a=>a.slice().sort((x,y)=>x.localeCompare(y,'ko'));

/* ───────── 기호 ───────── */
const SEQ={
  gana:['가','나','다','라','마','바','사','아','자','차'].map(s=>`(${s})`),
  latin:'ABCDEFGHIJKL'.split(''),
  circ:'㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩'.split(''),
  mk:'㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷'.split(''),
  jamo:'ㄱㄴㄷㄹㅁㅂㅅㅇ'.split(''),
  num:Array.from({length:12},(_,i)=>String(i+1)),
  stu:['갑','을','병','정','무'],
};
const SEQ_NAME={gana:'(가), (나), (다)',latin:'A, B, C',circ:'㉠, ㉡, ㉢',mk:'㉮, ㉯, ㉰',jamo:'ㄱ, ㄴ, ㄷ',num:'1, 2, 3'};
function seqOf(l){ for(const [k,s] of Object.entries(SEQ)) if(s.includes(l)) return k; return null; }
function seqIdx(l){ const k=seqOf(l); return k?SEQ[k].indexOf(l):99; }
function orderLabels(ls){ return ls.slice().sort((a,b)=>{ const ka=Object.keys(SEQ).indexOf(seqOf(a)), kb=Object.keys(SEQ).indexOf(seqOf(b)); return ka-kb||seqIdx(a)-seqIdx(b); }); }
/* 기호 범위: 셋 이상이고 이어지면 ‘(가)～(라)’, 아니면 쉼표 */
const TILDE='～';
function rangeOf(ls){
  ls=orderLabels(ls.filter(Boolean)); if(!ls.length) return ''; if(ls.length<=2) return ls.join(', ');
  const k=seqOf(ls[0]); const S=k?SEQ[k]:null;
  const cont=S&&ls.every((l,i)=>seqOf(l)===k&&S.indexOf(l)===S.indexOf(ls[0])+i);
  return cont?`${ls[0]}${TILDE}${ls[ls.length-1]}`:ls.join(', ');
}
function seqList(k,n){ return (SEQ[k]||SEQ.gana).slice(0,n); }

/* ───────── 단서 조항 ─────────
   groups: [{labels:['(가)','(나)'], names:['브라질','칠레']}] → ‘(단, (가), (나)는 각각 브라질, 칠레 중 하나임.)’
   여러 묶음은 ‘… 중 하나이고, … 중 하나임.’ */
function condSentence(groups,extra){
  const parts=[];
  for(const g of groups||[]){
    if(g.cond===false) continue;
    const ls=(g.labels||[]).filter(Boolean), ns=(g.names||[]).map(s=>String(s).trim()).filter(Boolean);
    if(ls.length<2||ns.length<2) continue;
    const r=rangeOf(ls); parts.push(`${r}${josa(orderLabels(ls).slice(-1)[0],'은는')} 각각 ${koSort(ns).join(', ')} 중 하나`);
  }
  const ex=String(extra||'').trim().replace(/^\(?\s*단,\s*/,'').replace(/[.)\s]+$/,'').replace(/임$/,'');
  if(ex) parts.push(ex);
  if(!parts.length) return '';
  return '(단, '+parts.map((p,i)=>i<parts.length-1?p+'이고,':p+'임.').join(' ')+')';
}

/* ───────── 발문 ───────── */
const SCENES=[
  {k:'none',name:'자료만 제시',ind:''},
  {k:'class',name:'수업 장면',ind:'다음은 세계지리 수업 장면이다.'},
  {k:'online',name:'온라인 수업',ind:'다음은 세계지리 온라인 수업 장면이다.'},
  {k:'trip',name:'답사 계획·안내',ind:'다음 자료는 답사 계획의 일부이다.'},
  {k:'talk',name:'두 학생의 대화',ind:'다음은 여행 계획에 관한 두 학생 간 대화의 일부이다.'},
  {k:'report',name:'수행 평가 보고서',ind:'다음 자료는 세계지리 수행 평가 보고서의 일부이다.'},
  {k:'news',name:'기사·뉴스',ind:'다음 자료는 ○○ 관련 기사의 일부이다.'},
  {k:'docu',name:'다큐멘터리·방송 대본',ind:'다음은 ○○을/를 소개하는 다큐멘터리 대본의 일부이다.'},
  {k:'quiz',name:'퀴즈·게임',ind:'다음은 세계지리 낱말 퀴즈의 일부이다.'},
  {k:'post',name:'게시물·메시지',ind:'다음 자료는 ○○을/를 여행한 학생의 온라인 게시물이다.'},
  {k:'sheet',name:'평가지·질문지',ind:'다음은 세계지리 수행 평가지이다.'},
  {k:'pick',name:'조건으로 대상 고르기',ind:'다음 자료를 토대로 ○○을/를 선정하고자 한다.'},
];
const DKINDS=[
  {k:'graph',name:'그래프',noun:'그래프'},{k:'table',name:'표',noun:'표'},{k:'map',name:'지도',noun:'지도'},
  {k:'text',name:'글',noun:'글'},{k:'photo',name:'사진·그림',noun:'자료'},{k:'mixed',name:'여러 자료',noun:'자료'},
];
const FORMS=[
  {k:'one',name:'정답형',tail:'옳은 것은?'},
  {k:'neg',name:'부정형',tail:'옳지 않은 것은?'},
  {k:'bogi',name:'합답형',tail:'옳은 것만을 <보기>에서 고른 것은?'},
  {k:'bogiAny',name:'합답형(있는 대로)',tail:'옳은 것만을 <보기>에서 있는 대로 고른 것은?'},
  {k:'find',name:'찾기형',tail:'고른 것은?'},
  {k:'stu',name:'학생형',tail:'교사의 질문에 옳게 답한 학생만을 고른 것은?'},
  {k:'score',name:'채점형',tail:'학생이 받게 될 점수로 옳은 것은?'},
  {k:'best',name:'최선답형',tail:'가장 적절한 것은?'},
];
const formOf=k=>FORMS.find(f=>f.k===k)||FORMS[0];
/* 간접 발문: 장면 문장 또는 ‘그래프는 …을 나타낸 것이다.’ */
function indirectStem(it){
  const sc=SCENES.find(s=>s.k===it.scene)||SCENES[0];
  if(sc.k!=='none') return sc.ind;
  const about=String(it.about||'').trim(); if(!about) return '';
  if(it.dk==='graph'||it.dk==='table'||it.dk==='map') return `${{graph:'그래프',table:'표',map:'지도'}[it.dk]}는 ${about}${josa(about,'을를')} 나타낸 것이다.`;
  if(it.dk==='text') return `다음 글은 ${about}에 관한 것이다.`;
  return `다음 자료는 ${about}에 관한 것이다.`;
}
/* 직접 발문의 앞부분: ‘(가)～(라) 지역에 대한 설명으로’ 또는 ‘이에 대한 설명으로’ */
function refPhrase(it){
  const g=(it.groups||[])[0]||{labels:[]}; const r=rangeOf(g.labels||[]); const tg=String(it.target||'').trim();
  const hasInd=!!indirectStem(it);
  if(it.refMode==='this'&&hasInd) return '이에 대한 설명으로';
  const lead=hasInd?'':({graph:'그래프의 ',table:'표의 ',map:'지도의 ',text:'다음 글의 ',photo:'다음 자료의 ',mixed:'다음 자료의 '}[it.dk]||'');
  if(!r) return hasInd?'이에 대한 설명으로':`${lead.replace(/의 $/,'')}에 대한 설명으로`.replace(/^에/,'이에');
  return `${lead}${r}${tg?' '+tg:''}에 대한 설명으로`;
}
function directStem(it){
  const f=formOf(it.form); const g=(it.groups||[]); const r0=rangeOf((g[0]||{}).labels||[]); const tg=String(it.target||'').trim();
  if(f.k==='find'){
    const r1=rangeOf((g[1]||{}).labels||[]); const pickFrom=String(it.pickFrom||'').trim()||(r1?`지도의 ${r1}`:'<보기>');
    const what=tg?`${r0}에 해당하는 ${W(tg,'을를')}`:`${r0}${josa(r0||'가','을를')}`;
    return `${what} ${pickFrom}에서 고른 것은?`.replace(/\s+/g,' ').trim();
  }
  if(f.k==='stu') return it.anyCount?'교사의 질문에 옳게 답한 학생만을 있는 대로 고른 것은?':'교사의 질문에 옳게 답한 학생만을 고른 것은?';
  if(f.k==='score') return '학생이 받게 될 점수로 옳은 것은?';
  if(f.k==='best') return `${refPhrase(it).replace(/설명으로$/,'내용으로')} 가장 적절한 것은?`;
  return `${refPhrase(it)} ${f.tail}`;
}
function stemParts(it){
  const ind=it.indEdit!=null&&it.indEdit!==''?it.indEdit:indirectStem(it);
  const dir=it.dirEdit!=null&&it.dirEdit!==''?it.dirEdit:directStem(it);
  const cond=it.condOn===false?'':condSentence(it.groups||[],it.condExtra);
  return {ind,dir,cond,pts:it.pts===3?'[3점]':''};
}
function stemText(it){ const p=stemParts(it); return [p.ind,p.dir,p.cond,p.pts].filter(Boolean).join(' '); }

/* ───────── 쾨펜 기후 구분(보조) ─────────
   우리 교과서 기준: 최한월 18℃(A), -3℃(C/D), 최난월 10℃(E). 건조 한계는 연평균 기온과 강수 계절성으로 계산(Peel 외 2007 방식).
   고산 기후(H)는 판별하지 않는다(해발 고도를 보고 사람이 판단) */
const KNAME={Af:'열대 우림 기후',Am:'열대 몬순 기후',Aw:'사바나 기후',As:'사바나 기후',BW:'사막 기후',BS:'스텝 기후',
  Cfa:'온난 습윤 기후',Cfb:'서안 해양성 기후',Cfc:'서안 해양성 기후',Cs:'지중해성 기후',Cw:'온대 겨울 건조 기후',
  Df:'냉대 습윤 기후',Dw:'냉대 겨울 건조 기후',Ds:'냉대 습윤 기후',ET:'툰드라 기후',EF:'빙설 기후'};
const GNAME={A:'열대 기후',B:'건조 기후',C:'온대 기후',D:'냉대 기후',E:'한대 기후'};
function koppen(t,p,lat){
  if(!t||!p||t.length!==12||p.length!==12||!t.every(fin)||!p.every(fin)) return null;
  const Tmin=Math.min(...t), Tmax=Math.max(...t), Tann=avg(t), Pann=sum(p);
  const nh=!(lat<0); const S=nh?[3,4,5,6,7,8]:[9,10,11,0,1,2], Wi=nh?[9,10,11,0,1,2]:[3,4,5,6,7,8];
  const Ps=sum(S.map(i=>p[i])), Pw=sum(Wi.map(i=>p[i]));
  const Pth=20*Tann+(Ps>=0.7*Pann?280:Pw>=0.7*Pann?0:140);
  let code;
  if(Tmax<10) code=Tmax>0?'ET':'EF';
  else if(Pann<Pth) code=Pann<Pth/2?'BW':'BS';
  else if(Tmin>=18){ const Pd=Math.min(...p); code=Pd>=60?'Af':Pd>=100-Pann/25?'Am':'Aw'; }
  else {
    const C=Tmin>-3; const sp=S.map(i=>p[i]), wp=Wi.map(i=>p[i]);
    const second=(Math.min(...sp)<40&&Math.min(...sp)<Math.max(...wp)/3)?'s':(Math.min(...wp)<Math.max(...sp)/10)?'w':'f';
    if(C) code=second==='f'?(Tmax>=22?'Cfa':(t.filter(x=>x>=10).length>=4?'Cfb':'Cfc')):'C'+second;
    else code='D'+second;
  }
  const key=KNAME[code]?code:code.slice(0,2);
  return {code,group:code[0],name:KNAME[key]||KNAME[code.slice(0,2)]||code,gname:GNAME[code[0]]};
}

/* 쾨펜 구분별 대표 특징(교과서 수준). 첫 문장이 가장 대표적인 특징 */
const KNOW={
  '열대 우림 기후':['연중 기온이 높고 강수량이 많아 열대 우림이 나타난다.','건기가 거의 없이 연중 비가 내린다.'],
  '열대 몬순 기후':['계절풍의 영향으로 여름에 강수량이 많다.'],
  '사바나 기후':['건기와 우기가 뚜렷하게 나타나며 열대 초원이 넓게 분포한다.'],
  '사막 기후':['연 강수량이 매우 적어 오아시스 농업이나 유목이 이루어진다.'],
  '스텝 기후':['연 강수량이 적어 짧은 풀의 초원이 나타나며 유목이나 밀 재배가 이루어진다.'],
  '지중해성 기후':['여름철에 고온 건조하고 겨울철에 온난 다습하다.','수목 농업(올리브, 포도, 오렌지 등)이 발달한다.'],
  '온난 습윤 기후':['여름에 고온 다습하고 겨울에 비교적 온난하여 벼농사가 이루어진다.'],
  '서안 해양성 기후':['연중 강수가 고르고 기온의 연교차가 비교적 작다.'],
  '온대 겨울 건조 기후':['여름에 비가 집중되고 겨울에 건조하다.'],
  '냉대 습윤 기후':['겨울이 길고 춥고 침엽수림(타이가)이 넓게 분포한다.'],
  '냉대 겨울 건조 기후':['겨울이 매우 춥고 건조하며 기온의 연교차가 매우 크다.'],
  '툰드라 기후':['짧은 여름에만 이끼류와 지의류가 자라며 순록 유목이 이루어진다.'],
};
/* 천문: 15일 기준 태양 적위(°) */
const DECL=[-21.3,-13.3,-2.4,9.4,18.8,23.3,21.5,13.8,2.2,-9.6,-19.1,-23.3];
function noonAlt(lat,m){ const d=DECL[m-1]; let a=90-Math.abs(lat-d); if(a>90) a=180-a; return a; }
function dayLen(lat,m){ const d=DECL[m-1]*Math.PI/180, f=lat*Math.PI/180; const x=-Math.tan(f)*Math.tan(d); if(x<=-1) return 24; if(x>=1) return 0; return 24*Math.acos(x)/Math.PI; }

/* ───────── 기후 자료 선지 후보 ───────── */
function summerShare(s,which){ const nh=!(s.lat<0); const idx=(which==='sum')===nh?[5,6,7]:[11,0,1]; const P=sum(s.p); return P>0?sum(idx.map(i=>s.p[i]))/P*100:NaN; }
const CM=[
  {k:'tR',noun:'기온의 연교차',adj:'크다',attr:'큰',unit:'℃',tol:1.5,f:s=>Math.max(...s.t)-Math.min(...s.t)},
  {k:'tY',noun:'연평균 기온',adj:'높다',attr:'높은',unit:'℃',tol:1,f:s=>avg(s.t)},
  {k:'tMin',noun:'최한월 평균 기온',adj:'높다',attr:'높은',unit:'℃',tol:1,f:s=>Math.min(...s.t)},
  {k:'tMax',noun:'최난월 평균 기온',adj:'높다',attr:'높은',unit:'℃',tol:1,f:s=>Math.max(...s.t)},
  {k:'t1',noun:'1월 평균 기온',adj:'높다',attr:'높은',unit:'℃',tol:1,f:s=>s.t[0]},
  {k:'t7',noun:'7월 평균 기온',adj:'높다',attr:'높은',unit:'℃',tol:1,f:s=>s.t[6]},
  {k:'pY',noun:'연 강수량',adj:'많다',attr:'많은',unit:'mm',rel:0.1,tol:30,f:s=>sum(s.p)},
  {k:'p1',noun:'1월 강수량',adj:'많다',attr:'많은',unit:'mm',rel:0.15,tol:10,f:s=>s.p[0]},
  {k:'p7',noun:'7월 강수량',adj:'많다',attr:'많은',unit:'mm',rel:0.15,tol:10,f:s=>s.p[6]},
  {k:'rSum',noun:'여름 강수 집중률',adj:'높다',attr:'높은',unit:'%',tol:3,f:s=>summerShare(s,'sum'),note:'여름은 북반구 6~8월, 남반구 12~2월로 보고 계산했어요. 반구가 섞이면 발문에 이 기준을 적어 주세요.'},
  {k:'rWin',noun:'겨울 강수 집중률',adj:'높다',attr:'높은',unit:'%',tol:3,f:s=>summerShare(s,'win'),note:'겨울은 북반구 12~2월, 남반구 6~8월로 보고 계산했어요. 반구가 섞이면 발문에 이 기준을 적어 주세요.'},
  {k:'lat',noun:'위도',special:'lat',unit:'°',tol:2,f:s=>Math.abs(s.lat)},
  {k:'day1',noun:'1월 낮 길이',adj:'길다',attr:'긴',unit:'시간',tol:0.3,f:s=>dayLen(s.lat,1)},
  {k:'day7',noun:'7월 낮 길이',adj:'길다',attr:'긴',unit:'시간',tol:0.3,f:s=>dayLen(s.lat,7)},
  {k:'sun1',noun:'1월 정오의 태양 고도',adj:'높다',attr:'높은',unit:'°',tol:2,f:s=>noonAlt(s.lat,1)},
  {k:'sun7',noun:'7월 정오의 태양 고도',adj:'높다',attr:'높은',unit:'°',tol:2,f:s=>noonAlt(s.lat,7)},
  {k:'elev',noun:'해발 고도',adj:'높다',attr:'높은',unit:'m',tol:100,rel:0.1,f:s=>fin(s.elev)?s.elev:NaN},
];
const fmt=(v,u)=>!fin(v)?'—':u==='mm'||u==='m'?Math.round(v).toLocaleString('ko-KR')+u:u==='시간'?v.toFixed(1)+u:(Math.round(v*10)/10)+u;
function closeOf(m,a,b){ const d=Math.abs(a-b); if(m.rel) return d<Math.max(m.tol,Math.max(Math.abs(a),Math.abs(b))*m.rel); return d<m.tol; }
function needs(m,s){ if(/^(lat|day|sun)/.test(m.k)) return fin(s.lat); if(m.k==='elev') return fin(s.elev); return s.t.every(fin)&&s.p.every(fin); }
/* st: [{l:'(가)', name, t:[12], p:[12], lat, elev}] → 후보 진술 목록 */
function climateStmts(st){
  st=(st||[]).filter(s=>s&&s.l&&Array.isArray(s.t)&&Array.isArray(s.p)); const out=[]; if(!st.length) return out;
  const L=st.map(s=>s.l); const all=rangeOf(L); let n=0; const id=()=>'c'+(++n);
  const add=o=>out.push(Object.assign({id:id(),src:'auto',tier:'calc'},o));
  /* 단독: 반구, 기후 구분, 기준값 */
  for(const s of st){
    if(fin(s.lat)){ const south=s.lat<0;
      add({kind:'단독',grp:'위치',text:`${W(s.l,'은는')} 남반구에 위치한다.`,truth:south,why:`위도 ${fmtLat(s.lat)}`});
      add({kind:'단독',grp:'위치',text:`${W(s.l,'은는')} 북반구에 위치한다.`,truth:!south,why:`위도 ${fmtLat(s.lat)}`}); }
    const kp=koppen(s.t,s.p,s.lat);
    if(kp){ const others=[...new Set(st.map(x=>koppen(x.t,x.p,x.lat)).filter(Boolean).map(x=>x.name))].filter(x=>x!==kp.name);
      add({kind:'단독',grp:'기후 구분',text:`${W(s.l,'은는')} ${kp.name} 지역에 속한다.`,truth:true,why:`쾨펜 계산값 ${kp.code}`,warn:fin(s.elev)&&s.elev>=1500?'해발 고도가 높아 고산 기후로 볼 여지가 있어요. 사람이 확인해 주세요.':''});
      for(const o of others.slice(0,2)) add({kind:'단독',grp:'기후 구분',text:`${W(s.l,'은는')} ${o} 지역에 속한다.`,truth:false,why:`쾨펜 계산값 ${kp.code}(${kp.name})`});
      const tmin=Math.min(...s.t), tmax=Math.max(...s.t);
      add({kind:'기준값',grp:'기후 구분',text:`${W(s.l,'은는')} 최한월 평균 기온이 18℃ 이상이다.`,truth:tmin>=18,why:`최한월 ${fmt(tmin,'℃')}`,warn:Math.abs(tmin-18)<1?'18℃와 차이가 1℃ 안이에요.':''});
      add({kind:'기준값',grp:'기후 구분',text:`${W(s.l,'은는')} 최한월 평균 기온이 -3℃ 미만이다.`,truth:tmin<-3,why:`최한월 ${fmt(tmin,'℃')}`,warn:Math.abs(tmin+3)<1?'-3℃와 차이가 1℃ 안이에요.':''});
      add({kind:'기준값',grp:'기후 구분',text:`${W(s.l,'은는')} 최난월 평균 기온이 10℃ 미만이다.`,truth:tmax<10,why:`최난월 ${fmt(tmax,'℃')}`,warn:Math.abs(tmax-10)<1?'10℃와 차이가 1℃ 안이에요.':''});
    }
  }
  /* 비교: 순서쌍마다 ‘A는 B보다 ○○이 크다/높다/많다’ */
  for(const m of CM) for(const a of st) for(const b of st){
    if(a===b||!needs(m,a)||!needs(m,b)) continue; const va=m.f(a), vb=m.f(b); if(!fin(va)||!fin(vb)) continue;
    const text=m.special==='lat'?`${W(a.l,'은는')} ${b.l}보다 고위도에 위치한다.`:`${W(a.l,'은는')} ${b.l}보다 ${W(m.noun,'이가')} ${m.adj}.`;
    add({kind:'비교',grp:m.noun,m:m.k,text,truth:va>vb,why:`${a.l} ${fmt(va,m.unit)}, ${b.l} ${fmt(vb,m.unit)}`,warn:closeOf(m,va,vb)?'두 값의 차이가 작아 그래프에서 읽기 어렵거나 정답 시비가 생길 수 있어요.':'',note:m.note||''});
  }
  /* 통합: 가장 ~한 곳, 모두 ~, 순서 */
  if(st.length>=3){
    for(const m of CM){
      const vs=st.filter(s=>needs(m,s)).map(s=>({s,v:m.f(s)})).filter(x=>fin(x.v)); if(vs.length<st.length) continue;
      vs.sort((x,y)=>y.v-x.v); const top=vs[0], sec=vs[1];
      const tx=l=>m.special==='lat'?`${all} 중 가장 고위도에 위치한 지역은 ${l}이다.`:`${all} 중 ${W(m.noun,'이가')} 가장 ${m.attr} 지역은 ${l}이다.`;
      const why=vs.map(x=>`${x.s.l} ${fmt(x.v,m.unit)}`).join(', ');
      const w=closeOf(m,top.v,sec.v)?'1위와 2위의 차이가 작아요.':'';
      add({kind:'통합',grp:m.noun,m:m.k,text:tx(top.s.l),truth:true,why,warn:w,note:m.note||''});
      add({kind:'통합',grp:m.noun,m:m.k,text:tx(sec.s.l),truth:false,why,warn:w,note:m.note||''});
      if(st.length<=4&&!m.special){
        const ord=vs.map(x=>x.s.l); const sw=ord.slice(); let gi=0,gm=1e9; for(let i=0;i<vs.length-1;i++){ const d=Math.abs(vs[i].v-vs[i+1].v); if(d<gm){ gm=d; gi=i; } } [sw[gi],sw[gi+1]]=[sw[gi+1],sw[gi]];
        const ot=o=>`${W(m.noun,'은는')} ${o.join(' > ')} 순으로 ${m.adj}.`;
        add({kind:'통합',grp:m.noun,m:m.k,text:ot(ord),truth:true,why,warn:vs.some((x,i)=>i&&closeOf(m,vs[i-1].v,x.v))?'이웃한 두 값의 차이가 작아요.':'',note:m.note||''});
        add({kind:'통합',grp:m.noun,m:m.k,text:ot(sw),truth:false,why,note:m.note||''});
      }
    }
  }
  if(st.length>=2) for(let i=0;i<st.length;i++) for(let j=i+1;j<st.length;j++){
    const a=st[i], b=st[j];
    if(fin(a.lat)&&fin(b.lat)) for(const h of ['남','북']){ const t=h==='남'?(a.lat<0&&b.lat<0):(a.lat>=0&&b.lat>=0);
      add({kind:'통합',grp:'위치',text:`${a.l}, ${W(b.l,'은는')} 모두 ${h}반구에 위치한다.`,truth:t,why:`${a.l} ${fmtLat(a.lat)}, ${b.l} ${fmtLat(b.lat)}`}); }
    const ka=koppen(a.t,a.p,a.lat), kb=koppen(b.t,b.p,b.lat);
    if(ka&&kb){ for(const g of [...new Set([ka.group,kb.group])]) add({kind:'통합',grp:'기후 구분',text:`${a.l}, ${W(b.l,'은는')} 모두 ${GNAME[g]} 지역에 속한다.`,truth:ka.group===g&&kb.group===g,why:`${a.l} ${ka.code}, ${b.l} ${kb.code}`}); }
  }

  /* ── 더 넓힌 진술(기출 기후 문항 조사 반영) ── */
  const mname=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  for(const s of st){
    if(!s.t.every(fin)||!s.p.every(fin)) continue;
    const tmin=Math.min(...s.t), tmax=Math.max(...s.t), tR=tmax-tmin, P=sum(s.p), Pm=Math.min(...s.p), nh=!(s.lat<0);
    const thr=(grp,txt,val,why,w)=>add({kind:'기준값',grp,text:txt,truth:val,why,warn:w||''});
    /* 기준값: 연교차·연 강수량·연평균 기온 */
    for(const x of [10,20,30]) thr('기온의 연교차',`${W(s.l,'은는')} 기온의 연교차가 ${x}℃ 이상이다.`,tR>=x,`연교차 ${fmt(tR,'℃')}`,Math.abs(tR-x)<1.5?`${x}℃와 차이가 1.5℃ 안이에요.`:'');
    for(const x of [500,1000,2000]) thr('연 강수량',`${W(s.l,'은는')} 연 강수량이 ${x.toLocaleString('ko-KR')}mm 이상이다.`,P>=x,`연 강수량 ${fmt(P,'mm')}`,Math.abs(P-x)<x*0.08?`${x}mm와 차이가 작아요.`:'');
    for(const x of [0,10,20]) thr('연평균 기온',`${W(s.l,'은는')} 연평균 기온이 ${x}℃ 이상이다.`,avg(s.t)>=x,`연평균 ${fmt(avg(s.t),'℃')}`,Math.abs(avg(s.t)-x)<1?`${x}℃와 차이가 1℃ 안이에요.`:'');
    /* 연중 일정 */
    thr('연중 기온',`${W(s.l,'은는')} 월평균 기온이 연중 18℃ 이상이다.`,tmin>=18,`최한월 ${fmt(tmin,'℃')}`,Math.abs(tmin-18)<1?'18℃와 차이가 1℃ 안이에요.':'');
    add({kind:'단독',grp:'연중 기온',text:`${W(s.l,'은는')} 월평균 기온이 연중 0℃ 이상이다.`,truth:tmin>=0,why:`최한월 ${fmt(tmin,'℃')}`,warn:Math.abs(tmin)<1?'0℃와 차이가 1℃ 안이에요.':''});
    add({kind:'단독',grp:'연중 기온',text:`${W(s.l,'은는')} 월평균 기온이 0℃ 미만인 달이 있다.`,truth:tmin<0,why:`최한월 ${fmt(tmin,'℃')}`,warn:Math.abs(tmin)<1?'0℃와 차이가 1℃ 안이에요.':''});
    add({kind:'단독',grp:'연중 강수',text:`${W(s.l,'은는')} 월 강수량이 연중 60mm 이상이다.`,truth:Pm>=60,why:`최소월 ${mname[s.p.indexOf(Pm)]} ${fmt(Pm,'mm')}`,warn:Math.abs(Pm-60)<8?'60mm와 차이가 작아요.':''});
    add({kind:'단독',grp:'연중 강수',text:`${W(s.l,'은는')} 월 강수량이 40mm 미만인 달이 있다.`,truth:Pm<40,why:`최소월 ${mname[s.p.indexOf(Pm)]} ${fmt(Pm,'mm')}`,warn:Math.abs(Pm-40)<6?'40mm와 차이가 작아요.':''});
    /* 자기 비교: 한 지점 안에서 1월과 7월 */
    const own=(grp,noun,adj,fa,fb,an,bn,tol)=>{ const a=fa(s), b=fb(s); if(!fin(a)||!fin(b)) return;
      add({kind:'비교',grp,text:`${W(s.l,'은는')} ${an}의 ${noun}${josa(noun,'이가')} ${bn}보다 ${adj}.`,truth:a>b,why:`${an} ${fa.u?fmt(a,fa.u):a.toFixed(1)}, ${bn} ${fb.u?fmt(b,fb.u):b.toFixed(1)}`,warn:Math.abs(a-b)<tol?'두 값의 차이가 작아 그래프에서 읽기 어려워요.':''}); };
    own('연중 비교','평균 기온','높다',x=>x.t[0],x=>x.t[6],'1월','7월',1);
    own('연중 비교','평균 기온','높다',x=>x.t[6],x=>x.t[0],'7월','1월',1);
    own('연중 비교','강수량','많다',x=>x.p[0],x=>x.p[6],'1월','7월',10);
    own('연중 비교','강수량','많다',x=>x.p[6],x=>x.p[0],'7월','1월',10);
    const sm=summerShare(s,'sum'), wn=summerShare(s,'win'); if(fin(sm)&&fin(wn)){
      add({kind:'비교',grp:'연중 비교',text:`${W(s.l,'은는')} 여름철 강수량이 겨울철 강수량보다 많다.`,truth:sm>wn,why:`여름 ${sm.toFixed(0)}%, 겨울 ${wn.toFixed(0)}%`,warn:Math.abs(sm-wn)<5?'두 값의 차이가 작아요.':'',note:'여름은 북반구 6~8월, 남반구 12~2월로 보고 계산했어요.'});
      add({kind:'기준값',grp:'강수 집중',text:`${W(s.l,'은는')} 연 강수량의 50% 이상이 여름철(${nh?'6~8월':'12~2월'})에 집중한다.`,truth:sm>=50,why:`여름 ${sm.toFixed(0)}%`,warn:Math.abs(sm-50)<4?'50%와 차이가 작아요.':''}); }
    /* 최다우월 */
    const pk=s.p.indexOf(Math.max(...s.p)); const summerMonths=nh?[5,6,7]:[11,0,1];
    add({kind:'단독',grp:'최다우월',text:`${W(s.l,'은는')} 강수량이 가장 많은 달이 여름철(${nh?'6~8월':'12~2월'})이다.`,truth:summerMonths.includes(pk),why:`최다우월 ${mname[pk]}`,note:'여름은 북반구 6~8월, 남반구 12~2월로 보고 계산했어요.'});
    /* 위치: 대륙(나라 이름이 있을 때) */
    const cg=s.country&&D&&D.facts&&D.facts.contG&&D.facts.contG[s.country];
    if(cg){ const others=['아시아','유럽','아프리카','북아메리카','남아메리카','오세아니아'].filter(x=>x!==cg);
      add({kind:'단독',grp:'위치(대륙)',text:`${W(s.l,'은는')} ${cg}에 위치한다.`,truth:true,tier:'know',why:`${s.country}: ${cg}`,note:'나라→대륙 분류는 사람이 확인해 주세요(러시아·튀르키예처럼 두 대륙에 걸친 나라 주의).'});
      add({kind:'단독',grp:'위치(대륙)',text:`${W(s.l,'은는')} ${others[(s.l.length+cg.length)%5]}에 위치한다.`,truth:false,tier:'know',why:`${s.country}: ${cg}`}); }
    /* 교과서 지식 ─ 쾨펜 구분별 대표 특징(진술은 교과서 일반론이라 사람이 확인) */
    const kp=koppen(s.t,s.p,s.lat); if(kp&&KNOW[kp.name]){
      const mine=KNOW[kp.name]; const others=Object.keys(KNOW).filter(k=>k!==kp.name);
      for(const f of mine.slice(0,2)) add({kind:'단독',grp:'기후 특징(교과 지식)',text:`${W(s.l,'은는')} ${f}`,truth:true,tier:'know',why:`쾨펜 계산값 ${kp.code}(${kp.name})`,note:'교과서 일반론이에요. 해당 지역에 그대로 맞는지 사람이 확인해 주세요.'});
      const o=others[(s.l.charCodeAt(s.l.length-1)||0)%others.length]; add({kind:'단독',grp:'기후 특징(교과 지식)',text:`${W(s.l,'은는')} ${KNOW[o][0]}`,truth:false,tier:'know',why:`쾨펜 계산값 ${kp.code}(${kp.name}); 이 문장은 ${o}의 특징`,note:'교과서 일반론이에요. 사람이 확인해 주세요.'}); }
  }
  return out;
}

/* ───────── 표·그래프 자료(에너지·종교·인구·농업) 선지 후보 ─────────
   T: {tab, rows:[{l,name}], cols:[{name,unit,grp,l}], v:[[숫자…]…]}   (값은 행=나라, 열=지표)
   tier: calc=표 값으로 계산 / know=세계 수치·분류(프로젝트 자료에서 계산하거나 목록에서 찾음, 사람이 확인) */
const CROPS={'밀':'wheat','쌀':'rice','옥수수':'maize'}, ENER=['석유','천연가스','석탄','원자력','수력','풍력','태양광','지열'];
function uAdj(c){ const t=`${c.unit||''}${c.name||''}`; return /%|‰|비중|비율|률|지수|세|밀도|출산|증가/.test(t)?{adj:'높다',attr:'높은',sub:'비율이'}:{adj:'많다',attr:'많은',sub:''}; }
function tableStmts(T){
  const out=[]; if(!T||!Array.isArray(T.rows)||!Array.isArray(T.cols)) return out;
  let n=0; const add=o=>out.push(Object.assign({id:'t'+(++n),src:'auto',tier:'calc'},o));
  const allRows=T.rows.map((r,i)=>({i,name:String(r.name||'').trim(),lab:String(r.l||'').trim()})).filter(r=>r.name);
  const labRows=allRows.filter(r=>r.lab); const colsLab=T.cols.some(c=>String(c.l||'').trim());
  /* 기호가 열(종교·자원 등)에 붙고 행은 한 나라 이하이면 ‘열 주어’ 방식 */
  const colMode=colsLab&&labRows.length<=1;
  const rows=(labRows.length?labRows:(colMode?[]:allRows)).map(r=>({i:r.i,name:r.name,l:r.lab||r.name}));
  const base=rows.length?rows:allRows.slice(0,1);
  const dup={}; for(const c of T.cols) dup[c.name]=(dup[c.name]||0)+1;
  const cols=T.cols.map((c,j)=>{ const pct=/%|‰/.test(c.unit||''); const lb=String(c.l||'').trim(); const nm=(dup[c.name]>1&&c.grp?`${c.grp} ${c.name}`:c.name);
    const meas=(T.measure&&!/^값$/.test(T.measure))?T.measure:''; const mp=meas.replace(/\s*수$/,'');
    const tn=lb?`${lb}의 ${pct?(mp&&!/비율|비중/.test(mp)?mp+' 비율':'비율'):(meas||'값')}`:(pct&&!/비율|비중|률/.test(nm)?nm+' 비율':nm);
    return {j,name:c.name,unit:c.unit||'',grp:c.grp||'',l:lb,noun:lb?tn:nm,tn,nlab:lb||c.name,pct,meas:mp&&pct?mp:meas}; }).filter(c=>(!colMode||c.l)&&base.some(r=>fin((T.v[r.i]||[])[c.j])));
  const val=(r,c)=>{ const x=(T.v[r.i]||[])[c.j]; return fin(x)?x:NaN; };
  const sp=rows.length>=2;
  /* 열마다: 비교, 가장 ~한 나라, 순서, 기준값 */
  for(const c of (colMode?[]:cols)){
    const ua=uAdj(c); const pct=/%|‰/.test(c.unit);
    const vs=rows.map(r=>({r,v:val(r,c)})).filter(x=>fin(x.v));
    const m={rel:0.1,tol:pct?2:0,f:null};
    const cl=(a,b)=>Math.abs(a-b)<Math.max(m.tol,Math.max(Math.abs(a),Math.abs(b))*m.rel);
    const nn=ua.sub?`${c.noun}${ua.sub?'':''}`:c.noun;
    const subj=(txt)=>txt;
    if(vs.length>=2) for(const a of vs) for(const b of vs){ if(a===b) continue;
      add({kind:'비교',grp:c.noun,text:`${W(a.r.l,'은는')} ${b.r.l}보다 ${W(c.tn,'이가')} ${ua.adj}.`,truth:a.v>b.v,why:`${a.r.l} ${fmtN(a.v,c.unit)}, ${b.r.l} ${fmtN(b.v,c.unit)}`,warn:cl(a.v,b.v)?'두 값의 차이가 작아 그래프에서 읽기 어려워요.':''}); }
    if(vs.length>=3){ const sd=vs.slice().sort((x,y)=>y.v-x.v); const all=rangeOf(rows.map(r=>r.l)); const why=sd.map(x=>`${x.r.l} ${fmtN(x.v,c.unit)}`).join(', '); const w=cl(sd[0].v,sd[1].v)?'1위와 2위의 차이가 작아요.':'';
      add({kind:'통합',grp:c.noun,text:`${all} 중 ${W(c.tn,'이가')} 가장 ${ua.attr} 나라는 ${sd[0].r.l}이다.`.replace('이다.',josa(sd[0].r.l,'이가')==='이'?'이다.':'이다.'),truth:true,why,warn:w});
      add({kind:'통합',grp:c.noun,text:`${all} 중 ${W(c.tn,'이가')} 가장 ${ua.attr} 나라는 ${sd[1].r.l}이다.`,truth:false,why,warn:w});
      add({kind:'통합',grp:c.noun,text:`${all} 중 ${W(c.tn,'이가')} 가장 ${ua.adj==='높다'?'낮은':'적은'} 나라는 ${sd[sd.length-1].r.l}이다.`,truth:true,why,warn:cl(sd[sd.length-1].v,sd[sd.length-2].v)?'끝에서 1위와 2위의 차이가 작아요.':''});
      if(vs.length<=4){ const ord=sd.map(x=>x.r.l); const sw=ord.slice(); let gi=0,gm=1e18; for(let i=0;i<sd.length-1;i++){ const d=Math.abs(sd[i].v-sd[i+1].v); if(d<gm){ gm=d; gi=i; } } [sw[gi],sw[gi+1]]=[sw[gi+1],sw[gi]];
        add({kind:'통합',grp:c.noun,text:`${W(c.tn,'은는')} ${ord.join(' > ')} 순으로 ${ua.adj}.`,truth:true,why,warn:sd.some((x,i)=>i&&cl(sd[i-1].v,x.v))?'이웃한 두 값의 차이가 작아요.':''});
        add({kind:'통합',grp:c.noun,text:`${W(c.tn,'은는')} ${sw.join(' > ')} 순으로 ${ua.adj}.`,truth:false,why}); } }
    if(pct) for(const x of vs){ const base=x.v; const T0=[10,20,30,40,50,60,70,80,90].filter(t=>Math.abs(t-base)>=1);
      const near=T0.sort((a,b)=>Math.abs(a-base)-Math.abs(b-base)).slice(0,2);
      for(const t of near) add({kind:'기준값',grp:c.noun,text:`${W(x.r.l,'은는')} ${W(c.tn,'이가')} ${t}${c.unit.replace(/[^%‰]/g,'')||'%'} 이상이다.`,truth:base>=t,why:`${x.r.l} ${fmtN(base,c.unit)}`,warn:Math.abs(base-t)<3?`${t}와 차이가 3 안이에요.`:''}); }
  }
  /* 행마다: 같은 단위의 열끼리 비교(구성 비중 자료) */
  const byUnit={}; for(const c of cols) (byUnit[c.unit+'|'+c.grp]=byUnit[c.unit+'|'+c.grp]||[]).push(c);
  for(const g of Object.values(byUnit)) if(!colMode&&g.length>=2&&g.length<=8) for(const r of rows){
    const vs=g.map(c=>({c,v:val(r,c)})).filter(x=>fin(x.v)); if(vs.length<2) continue; const sd=vs.slice().sort((a,b)=>b.v-a.v);
    const ua=uAdj(g[0]); const cl=(a,b)=>Math.abs(a-b)<Math.max(2,Math.max(a,b)*0.1);
    for(let i=0;i<vs.length;i++) for(let k=i+1;k<vs.length;k++){ if(out.length>900) break; const a=vs[i], b=vs[k], hi=a.v>=b.v?a:b, lo=hi===a?b:a;
      add({kind:'비교',grp:`${r.l} 안의 비교`,text:`${W(r.l,'은는')} ${hi.c.nlab}의 ${ua.attr==='높은'?'비중':'값'}${josa(ua.attr==='높은'?'비중':'값','이가')} ${lo.c.nlab}보다 ${ua.adj}.`.replace(/값이/,'값이'),truth:true,why:`${hi.c.nlab} ${fmtN(hi.v,hi.c.unit)}, ${lo.c.nlab} ${fmtN(lo.v,lo.c.unit)}`,warn:cl(hi.v,lo.v)?'두 값의 차이가 작아요.':''});
      add({kind:'비교',grp:`${r.l} 안의 비교`,text:`${W(r.l,'은는')} ${lo.c.nlab}의 ${ua.attr==='높은'?'비중':'값'}${josa(ua.attr==='높은'?'비중':'값','이가')} ${hi.c.nlab}보다 ${ua.adj}.`,truth:false,why:`${hi.c.nlab} ${fmtN(hi.v,hi.c.unit)}, ${lo.c.nlab} ${fmtN(lo.v,lo.c.unit)}`,warn:cl(hi.v,lo.v)?'두 값의 차이가 작아요.':''}); }
    if(vs.length>=3){ const why=sd.map(x=>`${x.c.nlab} ${fmtN(x.v,x.c.unit)}`).join(', ');
      add({kind:'단독',grp:`${r.l} 안의 비교`,text:`${W(r.l,'은는')} ${sd[0].c.nlab}의 ${ua.attr==='높은'?'비중':'값'}${josa(ua.attr==='높은'?'비중':'값','이가')} 가장 ${ua.adj==='높다'?'높다':'많다'}.`,truth:true,why,warn:cl(sd[0].v,sd[1].v)?'1위와 2위의 차이가 작아요.':''});
      add({kind:'단독',grp:`${r.l} 안의 비교`,text:`${W(r.l,'은는')} ${sd[1].c.nlab}의 ${ua.attr==='높은'?'비중':'값'}${josa(ua.attr==='높은'?'비중':'값','이가')} 가장 ${ua.adj==='높다'?'높다':'많다'}.`,truth:false,why}); } }

  /* 열 주어 방식: 한 나라(또는 한 지역)의 구성 항목에 (가)~(라)가 붙은 자료 */
  if(colMode&&cols.length>=2){
    const r0=base[0]; const pct=cols.some(c=>c.pct); const meas=(cols[0].meas)||'값'; const noun=pct?(/비율|비중/.test(meas)?meas:(meas==='값'?'비율':meas+' 비율')):meas;
    const adj=pct||/비중|비율|률/.test(noun)?{a:'높다',t:'높은',lo:'낮은'}:{a:'많다',t:'많은',lo:'적은'};
    const vs=cols.map(c=>({c,v:val(r0,c)})).filter(x=>fin(x.v)); const lab=x=>x.c.nlab;
    const cl=(x,y)=>Math.abs(x-y)<Math.max(pct?2:0,Math.max(Math.abs(x),Math.abs(y))*0.1);
    for(const a of vs) for(const b of vs){ if(a===b) continue;
      add({kind:'비교',grp:'항목끼리 비교',text:`${W(lab(a),'은는')} ${lab(b)}보다 ${W(noun,'이가')} ${adj.a}.`,truth:a.v>b.v,why:`${a.c.name} ${fmtN(a.v,a.c.unit)}, ${b.c.name} ${fmtN(b.v,b.c.unit)}`,warn:cl(a.v,b.v)?'두 값의 차이가 작아 그래프에서 읽기 어려워요.':''}); }
    if(vs.length>=3){ const sd=vs.slice().sort((x,y)=>y.v-x.v); const all=rangeOf(vs.map(lab)); const why=sd.map(x=>`${x.c.name}(${lab(x)}) ${fmtN(x.v,x.c.unit)}`).join(', ');
      add({kind:'통합',grp:'항목끼리 비교',text:`${all} 중 ${W(noun,'이가')} 가장 ${adj.t} 것은 ${lab(sd[0])}이다.`,truth:true,why,warn:cl(sd[0].v,sd[1].v)?'1위와 2위의 차이가 작아요.':''});
      add({kind:'통합',grp:'항목끼리 비교',text:`${all} 중 ${W(noun,'이가')} 가장 ${adj.t} 것은 ${lab(sd[1])}이다.`,truth:false,why});
      add({kind:'통합',grp:'항목끼리 비교',text:`${all} 중 ${W(noun,'이가')} 가장 ${adj.lo} 것은 ${lab(sd[sd.length-1])}이다.`,truth:true,why,warn:cl(sd[sd.length-1].v,sd[sd.length-2].v)?'끝에서 1위와 2위의 차이가 작아요.':''});
      if(vs.length<=4){ const ord=sd.map(lab); const sw=ord.slice(); let gi=0,gm=1e18; for(let i=0;i<sd.length-1;i++){ const d=Math.abs(sd[i].v-sd[i+1].v); if(d<gm){ gm=d; gi=i; } } [sw[gi],sw[gi+1]]=[sw[gi+1],sw[gi]];
        add({kind:'통합',grp:'항목끼리 비교',text:`${W(noun,'은는')} ${ord.join(' > ')} 순으로 ${adj.a}.`,truth:true,why,warn:sd.some((x,i)=>i&&cl(sd[i-1].v,x.v))?'이웃한 두 값의 차이가 작아요.':''});
        add({kind:'통합',grp:'항목끼리 비교',text:`${W(noun,'은는')} ${sw.join(' > ')} 순으로 ${adj.a}.`,truth:false,why}); } }
    if(pct) for(const x of vs){ const near=[10,20,30,40,50,60,70,80,90].filter(t=>Math.abs(t-x.v)>=1).sort((a,b)=>Math.abs(a-x.v)-Math.abs(b-x.v)).slice(0,2);
      for(const t of near) add({kind:'기준값',grp:'항목별 기준값',text:`${W(lab(x),'은는')} ${W(noun,'이가')} ${t}% 이상이다.`,truth:x.v>=t,why:`${x.c.name} ${fmtN(x.v,x.c.unit)}`,warn:Math.abs(x.v-t)<3?`${t}와 차이가 3 안이에요.`:''}); }
  }
  /* ── 지식·세계 수치 (tier: know) ── */
  const F=D&&D.facts; const know=o=>add(Object.assign({tier:'know',note:'세계 수치·분류에서 가져온 진술이에요. 출처 연도와 교과서 표기를 사람이 확인해 주세요.'},o));
  if(F){
    const named=colMode?[]:rows.filter(r=>F.contG[r.name]); const ct=name=>F.contG[name];
    const CONT=['아시아','유럽','아프리카','북아메리카','남아메리카','오세아니아'];
    for(const r of named){ const k=ct(r.name); const o=CONT.filter(x=>x!==k)[(r.name.length)%5];
      know({kind:'단독',grp:'위치(대륙)',text:`${W(r.l,'은는')} ${k}에 위치한다.`,truth:true,why:`${r.name}: ${k}`,note:'나라→대륙 분류는 사람이 확인해 주세요(러시아·튀르키예처럼 두 대륙에 걸친 나라 주의).'});
      know({kind:'단독',grp:'위치(대륙)',text:`${W(r.l,'은는')} ${o}에 위치한다.`,truth:false,why:`${r.name}: ${k}`});
      const eu=F.eu.includes(r.name); know({kind:'단독',grp:'국제 기구',text:`${W(r.l,'은는')} 유럽 연합(EU) 회원국이다.`,truth:eu,why:`${r.name}${eu?'은 회원국':'은 회원국이 아님'}(27개국 목록 기준)`}); }
    for(let i=0;i<named.length;i++) for(let j=i+1;j<named.length;j++){ const a=named[i], b=named[j]; const same=ct(a.name)===ct(b.name);
      know({kind:'통합',grp:'위치(대륙)',text:`${a.l}, ${W(b.l,'은는')} 모두 ${ct(a.name)}에 위치한다.`,truth:same,why:`${a.name}: ${ct(a.name)}, ${b.name}: ${ct(b.name)}`}); }
    if(T.tab==='religion'&&F.religion){ const W2=F.religion.world; const rc=cols.filter(c=>W2[c.name]!=null);
      for(let i=0;i<rc.length;i++) for(let j=0;j<rc.length;j++){ if(i===j) continue; const a=rc[i], b=rc[j];
        know({kind:'비교',grp:'세계 신자 수',text:`전 세계 신자 수는 ${W(a.nlab,'은는')} ${b.nlab}보다 많다.`,truth:W2[a.name]>W2[b.name],why:`${F.religion.year}년 ${a.name} ${(W2[a.name]/1e8).toFixed(1)}억, ${b.name} ${(W2[b.name]/1e8).toFixed(1)}억 명`,note:'Pew Research Center 2020년 추정치예요. 신자 수는 조사·추정에 따라 달라지니 사람이 확인해 주세요.'}); }
      if(rc.length>=3){ const top=rc.slice().sort((x,y)=>W2[y.name]-W2[x.name]); know({kind:'단독',grp:'세계 신자 수',text:`${rc.map(c=>c.nlab).join(', ')} 중 전 세계 신자 수가 가장 많은 종교는 ${top[0].nlab}이다.`,truth:true,why:`${F.religion.year}년 기준`,note:'Pew Research Center 2020년 추정치예요.'});
        know({kind:'단독',grp:'세계 신자 수',text:`${rc.map(c=>c.nlab).join(', ')} 중 전 세계 신자 수가 가장 많은 종교는 ${top[1].nlab}이다.`,truth:false,why:`${F.religion.year}년 기준`,note:'Pew Research Center 2020년 추정치예요.'}); } }
    if(T.tab==='agriculture'&&F.agri){ const A=F.agri;
      for(const c of cols){ const txt=`${c.grp} ${c.name}`; const crop=Object.keys(CROPS).find(k=>txt.includes(k))||Object.keys(A.topStock).find(k=>txt.includes(k)); if(!crop) continue;
        const kind=/수출/.test(txt)?'exp':/생산|수확/.test(txt)?'prod':/사육|두수|가축/.test(txt)?'stock':''; if(!kind) continue;
        const topN=kind==='exp'?A.topExp[crop]:kind==='prod'?A.topProd[crop]:A.topStock[crop]; const lab=kind==='exp'?`${crop} 수출량`:kind==='prod'?`${crop} 생산량`:`${crop} 사육 두수`;
        for(const r of rows){ if(!F.contG[r.name]) continue; know({kind:'단독',grp:'세계 순위',text:`${W(r.l,'은는')} 세계에서 ${lab}이 가장 많은 나라이다.`,truth:r.name===topN,why:`${A.year}년 세계 1위: ${topN} (FAO 자료 기준)`,note:'FAO 통계의 해당 연도 기준이에요. 해마다 순위가 바뀔 수 있으니 확인해 주세요.'}); } } }
    if(T.tab==='energy'&&F.energy){ const E=F.energy;
      for(const c of cols){ const txt=`${c.grp} ${c.name}`; const src=ENER.find(k=>txt.includes(k)); if(!src) continue; const key=/생산|채굴/.test(txt)&&['석유','천연가스','석탄'].includes(src)?`${src} 생산`:/발전/.test(txt)&&!/생산|채굴/.test(txt)||['원자력','수력','풍력','태양광','지열'].includes(src)?`${src} 발전`:''; const topN=E.top[key]; if(!topN) continue;
        for(const r of rows){ if(!F.contG[r.name]) continue; know({kind:'단독',grp:'세계 순위',text:`${W(r.l,'은는')} 세계에서 ${key.replace(' ',' ')}량이 가장 많은 나라이다.`.replace('발전량','발전량').replace('생산량','생산량'),truth:r.name===topN,why:`${E.year}년 1위: ${topN} (Energy Institute 표에 있는 나라 기준)`,note:'Energy Institute 통계 연보의 해당 연도 기준이에요. 순위는 해마다 바뀔 수 있어요.'}); } }
      const pc=cols.filter(c=>E.pe[c.name]!=null&&/소비|1차|비중|구성/.test(c.grp+c.name+T.title)); void pc; }
  }
  return out;
}
function fmtN(v,u){ if(!fin(v)) return '—'; u=u||''; if(/%|‰/.test(u)) return (Math.round(v*10)/10)+u.replace(/[^%‰]/g,''); const a=Math.abs(v); const x=a>=1000?Math.round(v).toLocaleString('ko-KR'):(Math.round(v*100)/100); return `${x}${u&&!/^\s*$/.test(u)?u:''}`; }
function fmtLat(v){ return fin(v)?`${Math.abs(v).toFixed(1)}°${v<0?'S':'N'}`:'—'; }

/* ───────── 진술 꼴 ───────── */
const KIND_ORDER=['단독','기준값','대응','비교','통합'];
function kindOf(t){
  t=String(t||'').trim();
  if(/\d+(?:\.\d+)?\s*(?:℃|°C|mm|%|명|m|달러)\s*(?:이상|미만|이하|초과|내외)/.test(t)) return '기준값';
  if(/모두|가장|순으로|[>＞]|(?:～|∼|~)\s*\([가-힣]\)\s*중|\s중\s.*가장/.test(t)) return '통합';
  if(/보다/.test(t)) return '비교';
  if(/^\(?[가-힣A-Fㄱ-ㅎ㉠-㉯]\)?[은는]\s*[^,]+,\s*\(?[가-힣A-F㉠-㉯]\)?[은는]/.test(t)) return '대응';
  return '단독';
}
function firstLabel(t){ const m=String(t).match(/\([가-하]\)|[㉠-㉭]|[㉮-㉻]|(?<![A-Za-z])[A-H](?![A-Za-z])/); return m?m[0]:null; }
/* 경기도 문서: ‘단독 → 비교 → 통합’, 같은 꼴 안에서는 기호 순 */
function sortStmts(list){
  return list.map((s,i)=>({s,i})).sort((x,y)=>{
    const kx=KIND_ORDER.indexOf(x.s.kind||kindOf(x.s.text)), ky=KIND_ORDER.indexOf(y.s.kind||kindOf(y.s.text));
    const ax=firstLabel(x.s.text), ay=firstLabel(y.s.text);
    return kx-ky||(ax&&ay?seqIdx(ax)-seqIdx(ay):0)||x.i-y.i; }).map(x=>x.s);
}

/* ───────── 답지 ─────────
   반환: {opts:[문자열×5], ans:1~5|null, msg:[] } */
const JAMO=['ㄱ','ㄴ','ㄷ','ㄹ'], STU=['갑','을','병','정','무'];
function combosKey(a){ return a.join(','); }
function answerSet(form,stmts,opt){
  const msg=[]; const n=stmts.length; const it_any=!!(opt&&opt.any);
  if(form==='one'||form==='neg'||form==='best'){
    const want=form==='neg'?false:true; const hit=stmts.map((s,i)=>s.truth===want?i:-1).filter(i=>i>=0);
    if(n!==5) msg.push(`선택지를 5개로 맞춰 주세요(지금 ${n}개).`);
    if(stmts.some(s=>s.truth==null)) msg.push('참·거짓을 정하지 않은 선택지가 있어요.');
    if(hit.length!==1) msg.push(form==='neg'?`옳지 않은 선택지가 하나여야 해요(지금 ${hit.length}개).`:`옳은 선택지가 하나여야 해요(지금 ${hit.length}개).`);
    return {opts:stmts.map(s=>s.text),ans:hit.length===1?hit[0]+1:null,msg};
  }
  if(form==='bogi'||form==='bogiAny'||form==='stu'){
    const L=form==='stu'?STU:JAMO; const items=L.slice(0,n);
    if(form==='stu'?(n<4||n>5):(n<3||n>4)) msg.push(form==='stu'?'학생은 4명(갑~정)으로 맞춰 주세요.':'<보기>는 3개(ㄱ~ㄷ)나 4개(ㄱ~ㄹ)로 맞춰 주세요.');
    if(stmts.some(s=>s.truth==null)) msg.push('참·거짓을 정하지 않은 항목이 있어요.');
    const right=items.filter((_,i)=>stmts[i]&&stmts[i].truth===true);
    if(form==='stu'&&n===5){ /* 다섯 명 중 한 명 */
      if(right.length!==1) msg.push(`옳게 답한 학생이 한 명이어야 해요(지금 ${right.length}명).`);
      return {opts:STU.slice(),ans:right.length===1?STU.indexOf(right[0])+1:null,msg,single:true}; }
    if(!right.length){ msg.push('옳은 항목이 하나도 없어요.'); return {opts:[],ans:null,msg}; }
    const sets=pickSets(form,n,right.length,it_any);
    const conv=o=>o.map(c=>c.map(x=>form==='stu'&&JAMO.includes(x)?STU[JAMO.indexOf(x)]:x));
    let best=null; for(const [s,c] of sets){ const ss=conv(s); const i=ss.findIndex(o=>combosKey(o)===combosKey(right)); if(i>=0&&(!best||c>best.c)) best={o:ss,i,c}; }
    if(!best){
      const std=form==='stu'?'갑,을 / 갑,병 / 을,병 / 을,정 / 병,정':'ㄱ,ㄴ / ㄱ,ㄷ / ㄴ,ㄷ / ㄴ,ㄹ / ㄷ,ㄹ';
      const same=form==='bogi'||(form==='stu'&&!it_any);
      if(form==='bogi'||form==='stu') msg.push(n===4&&right.length===2?`정답 ${right.join(', ')}${josa(right[right.length-1],'은는')} 기출 답지 묶음(${std})에 없어요. 진술 하나의 참·거짓을 바꾸거나 ‘있는 대로’ 형식을 검토해 보세요.`:`정답 항목 수(${right.length}개)가 이 형식의 기출 답지 묶음과 맞지 않아요. ‘있는 대로 고른’ 형식을 검토해 보세요.`);
      else msg.push('기출에 없던 답지 묶음을 새로 만들었어요. 답지 분포를 한번 봐 주세요.');
      const made=makeSet(items,right,same); return {opts:made.o.map(o=>o.join(', ')),ans:made.i+1,msg,made:true};
    }
    if(form==='bogiAny'&&right.length===Math.max(...best.o.map(o=>o.length))) msg.push('항목 수가 가장 많은 선지가 정답이에요. 경기도 문서는 이런 배치를 되도록 피하라고 해요.');
    return {opts:best.o.map(o=>o.join(', ')),ans:best.i+1,msg,count:best.c};
  }
  if(form==='find'||form==='score') return {opts:stmts.map(s=>s.text),ans:stmts.findIndex(s=>s.truth===true)+1||null,msg};
  return {opts:stmts.map(s=>s.text),ans:null,msg};
}
function pickSets(form,n,k,any){
  const O=(D&&D.optsets)||{}; const out=[];
  if(form==='bogi'&&n===4){ if(O.bogi4_2) out.push(O.bogi4_2); }
  else if(form==='bogiAny'&&n===4){ for(const x of O.bogi4_any||[]) out.push(x); }
  else if(form==='bogiAny'&&n===3){ for(const x of O.bogi3_any||[]) out.push(x); }
  else if(form==='bogi'&&n===3){ /* 3개 고르기: ㄱ,ㄴ/ㄱ,ㄷ/ㄴ,ㄷ 는 답지가 셋뿐이라 기출에서는 ‘있는 대로’로 낸다 */ for(const x of O.bogi3_any||[]) out.push(x); }
  else if(form==='stu'&&n===4){ if(any) for(const x of O.stu4_any||[]) out.push(x); else if(O.stu4_2) out.push(O.stu4_2); }
  return out;
}
/* 기출 묶음에 정답이 없을 때: 정답을 넣은 다섯 묶음을 만든다(항목 수 유형은 둘 이하) */
function makeSet(items,right,sameOnly){
  const all=[]; const n=items.length;
  for(let m=1;m<(1<<n);m++){ const c=items.filter((_,i)=>m&(1<<i)); if(c.length>=1&&c.length<=3) all.push(c); }
  const k=right.length; const same=all.filter(c=>c.length===k&&combosKey(c)!==combosKey(right));
  const other=all.filter(c=>c.length===(k===2?3:2));
  const pick=sameOnly?[right,...same.slice(0,4)]:[right,...same.slice(0,2),...other.slice(0,2)].slice(0,5);
  while(pick.length<5&&all.length){ const c=all.find(x=>!pick.some(p=>combosKey(p)===combosKey(x))); if(!c) break; pick.push(c); }
  pick.sort((a,b)=>a.length-b.length||combosKey(a).localeCompare(combosKey(b),'ko'));
  return {o:pick,i:pick.findIndex(c=>combosKey(c)===combosKey(right))};
}

/* ───────── 점검 ─────────
   반환: [{lvl:'ok'|'warn'|'err'|'info', msg, rule}] */
const CLUE_WORDS=['항상','반드시','언제나','누구나','절대'];
function checks(it,ansInfo){
  const out=[]; const add=(lvl,msg,rule)=>out.push({lvl,msg,rule:rule||''});
  const P=stemParts(it); const stm=(it.stmts||[]);
  /* 1. 설계 */
  if(!it.std) add('warn','성취기준을 고르지 않았어요.','교육 과정 분석');
  if(!String(it.eval||'').trim()) add('warn','평가 요소를 적지 않았어요.','평가 요소 선정');
  else if(/[,·]|및|와\s|과\s/.test(it.eval)&&String(it.eval).length>40) add('info','평가 요소가 둘 이상으로 보이면 하나로 좁혀 주세요.','발문 ⑤ 한 문항, 한 평가 요소');
  /* 2. 기호 */
  const fam=new Set(); for(const g of it.groups||[]) for(const l of g.labels||[]){ const k=seqOf(l); if(k) fam.add(k); }
  for(const s of stm){ const m=String(s.text).match(/[㉠-㉭]/); if(m) fam.add('circ'); }
  if(['bogi','bogiAny'].includes(it.form)) fam.add('jamo');
  if(fam.size>=4) add('warn',`기호를 ${fam.size}가지 쓰고 있어요. 세 가지 이하로 줄이기를 권해요.`,'자료: 기호를 네 가지 유형 이상 쓰지 않음');
  if(fam.has('num')) add('warn','숫자 기호(1, 2…)는 답지 ①~⑤와 헷갈려요. (가)나 ㉮, A를 쓰세요.','자료 ⑫');
  if((it.groups||[]).some(g=>(g.labels||[]).some(l=>seqOf(l)==='jamo'))&&['bogi','bogiAny'].includes(it.form)) add('err','자료 기호 ㄱ, ㄴ이 <보기> 항목 기호와 겹쳐요.','<보기> ③ 기호 구별');
  const gana=(it.groups||[]).filter(g=>(g.labels||[]).some(l=>seqOf(l)==='gana')); if(gana.length>=2) add('warn','(가), (나)를 두 묶음에 썼어요. 표 안 항목이라면 ㉮, ㉯로 바꾸기를 권해요.','자료 ⑫');
  /* 3. 발문 */
  if(/^다음/.test(P.ind)&&(it.scene==='none')&&['graph','table','map'].includes(it.dk)) add('warn','그림·표·그래프 앞에는 ‘다음’을 쓰지 않아요.','발문 ⑭');
  if(/위\s*자료|윗\s*그림/.test(P.ind+P.dir)) add('warn','‘위 자료’ 대신 ‘이 자료’, ‘이에 대한’을 써요.','자료 사례');
  if(/○○|을\/를|이\/가|은\/는/.test(P.ind+P.dir)) add('warn','발문에 채우지 않은 자리(○○, 을/를)가 있어요. 4단계에서 고쳐 써 주세요.','발문');
  if(/모두\s*고르면/.test(P.dir)) add('err','‘모두 고르면?’은 쓰지 않아요. ‘있는 대로 고른 것은?’으로 바꿔 주세요.','선택지 사례');
  if(it.form==='neg'&&/가장/.test(P.dir)) add('err','부정형 발문에는 ‘가장’을 쓰지 않아요.','부정형');
  if(/거리가\s*먼/.test(P.dir)) add('warn','‘거리가 먼’ 대신 ‘옳지 않은’을 권해요.','부정형');
  if(it.form==='neg') add('ok','부정어 ‘않은’에 밑줄을 그어 내보내요.','부정형');
  const ents=(it.groups||[]).map(g=>(g.names||[]).filter(Boolean).length).reduce((a,b)=>a+b,0);
  if(it.condOn!==false&&ents===0&&(it.groups||[]).some(g=>(g.labels||[]).length>=2&&g.cond!==false)&&it.form!=='find') add('info','기호가 무엇을 가리키는지 단서 조항이 필요하면 ‘대상’에 이름을 적어 주세요.','발문 ⑥·⑦ 단서 조항');
  /* 4. 선택지 */
  const T=stm.map(s=>String(s.text||'').trim()).filter(Boolean);
  if(T.some(t=>/○○|이\/가|을\/를|은\/는/.test(t))) add('warn','선택지에 채우지 않은 자리(○○, 이/가)가 있어요.','선택지');
  for(const s of T){ const w=CLUE_WORDS.find(x=>s.includes(x)); if(w){ add('warn',`‘${w}’ 같은 단정어는 정답·오답의 단서가 돼요: “${s.slice(0,28)}…”`,'선택지 ⑩ 단서어'); break; } }
  if(T.some(s=>/[^\s]만\s/.test(s)&&/뿐|만이/.test(s))) add('info','‘~만’, ‘~뿐’이 정답 단서가 되지 않는지 봐 주세요.','선택지 ⑩');
  { const strip=s=>s.replace(/\([가-하]\)|[A-H]|[㉠-㉭]|[ㄱ-ㄹ]|\s/g,''); const seen={}; for(const s of T){ const k=strip(s); if(seen[k]&&seen[k]!==s){ add('warn',`주어(기호)만 바꾼 선택지가 있어요: “${s.slice(0,24)}…”`,'선택지 ⑩ 주어만 바꾸지 않음'); break; } seen[k]=s; } }
  if(T.length>=3){ const ls=T.map(s=>s.length); const mx=Math.max(...ls), mn=Math.min(...ls); if(mx>mn*1.9&&mx-mn>12) add('info',`선택지 길이 차이가 커요(${mn}~${mx}자). 비슷하게 맞추면 단서가 줄어요.`,'선택지 ⑩ 길이·구성'); }
  { const ks=stm.map(s=>s.kind||kindOf(s.text)); const sorted=sortStmts(stm).map(s=>s.text); if(stm.length>=3&&sorted.join('|')!==stm.map(s=>s.text).join('|')) add('info','‘단독 → 비교 → 통합’, 기호 순으로 배열하기를 권해요. [순서 정리]를 누르면 바꿔요.','선택지 사례(세계지리)'); void ks; }
  for(const s of stm) if(s.warn){ add('warn',`값 차이 주의: “${String(s.text).slice(0,26)}…” — ${s.warn}`,'자료 가독성'); }
  const notes=[...new Set(stm.map(s=>s.note).filter(Boolean))]; for(const n of notes) add('info',n,'단서 조항');
  /* 5. 답지 */
  if(!stm.length&&it.form!=='find') add('info','5단계에서 선지를 고르면 답지 구성까지 점검해요.','답지');
  else if(ansInfo) for(const m of ansInfo.msg||[]) add(/없어요|맞지 않아요|하나여야|하나도/.test(m)?'err':/피하라고|봐 주세요/.test(m)?'info':'warn',m,'답지');
  if(['bogi','bogiAny'].includes(it.form)){
    const n=stm.length;
    if(ansInfo&&ansInfo.opts&&ansInfo.opts.length){ const cnt=new Set(ansInfo.opts.map(o=>o.split(',').length)); if(cnt.size>3) add('warn','답지의 항목 수 유형이 세 가지를 넘어요.','선택지 ⑦');
      if(it.form==='bogi'&&cnt.size>1) add('err','답지마다 고른 개수가 달라요. 발문을 ‘있는 대로 고른 것은?’으로 바꿔 주세요.','선택지 사례');
      if(it.form==='bogiAny'&&cnt.size===1) add('warn','답지마다 고른 개수가 같아요. 발문을 ‘고른 것은?’으로 바꿔 주세요.','선택지 사례'); }
    if(n===4&&it.form==='bogi'&&ansInfo&&ansInfo.ans&&!ansInfo.made) add('ok','기출 표준 답지 묶음을 써요(11회 중 39문항).','기출');
  }
  /* 6. 기출과 겹침 */
  const names=(it.groups||[]).flatMap(g=>g.names||[]).map(s=>String(s).trim()).filter(Boolean);
  if(names.length>=2&&D){ for(const g of D.gichul){ const o=g.ents.filter(e=>names.includes(e)); if(o.length>=Math.min(3,names.length)&&o.length>=2) add('info',`${g.name} ${g.no}번과 대상이 겹쳐요(${o.join(', ')}). 기출과 지나치게 비슷하지 않은지 봐 주세요.`,'검토: 기존 출제 문항과 유사'); } }
  /* 7. 자료 */
  if(it.dk==='map'&&!it.mapIsWorld) add('info','세계·대륙 전도가 아니면 지도에 축척을 넣어요(백지도 편집기 ‘축척 막대’).','자료 제작 유의 사항');
  if(!String(it.srcNote||'').trim()&&['graph','table'].includes(it.dk)) add('info','자료 연도와 출처(오른쪽 아래)를 확인해 주세요.','자료 ⑮ 출처');
  if(!out.some(x=>x.lvl==='err'||x.lvl==='warn')) add('ok','자동 점검에서 걸린 것이 없어요. 아래 ‘사람이 볼 것’도 확인해 주세요.','');
  return out;
}
/* 사람이 볼 것(경기도 문서 검토 관점에서 추림) */
const MANUAL=[
  ['scope','교육과정 범위 안의 내용이고, 교과서에 실린 개념인가?'],
  ['one','평가 요소가 하나이고 발문에 드러나는가?'],
  ['answer','정답이 하나뿐이고, 관점에 따라 오답지가 정답이 될 여지는 없는가?'],
  ['need','자료를 읽지 않고도 풀리는 문항은 아닌가?'],
  ['data','자료가 최근의 공신력 있는 통계이고 연도·출처를 적었는가?'],
  ['print','흑백으로 인쇄해도 기호·선·음영이 구별되는가?'],
  ['fair','특정 집단·종교·지역을 비하하거나 고정 관념을 부추기지 않는가?'],
  ['same','기출·사설 모의고사 문항과 지나치게 비슷하지 않은가?'],
  ['words','지명·용어 표기와 띄어쓰기가 교과서·수능 표기와 같은가?'],
];

/* ───────── 기출 조회 ───────── */
function gichulBy(codes){ if(!D) return []; const S=new Set(codes||[]); return D.gichul.filter(g=>S.has(g.std)); }
function stats(list){
  const c=(f)=>{ const m={}; for(const g of list) for(const v of [].concat(f(g))) if(v) m[v]=(m[v]||0)+1; return Object.entries(m).sort((a,b)=>b[1]-a[1]); };
  return {n:list.length,data:c(g=>g.data),tool:c(g=>g.tool),scene:c(g=>g.scene||'자료만'),form:c(g=>g.form),act:c(g=>g.act),topic:c(g=>g.topic),
    kinds:Object.entries(list.reduce((m,g)=>{ for(const [k,v] of Object.entries(g.kinds||{})) m[k]=(m[k]||0)+v; return m; },{})).sort((a,b)=>b[1]-a[1])};
}
function kiceOf(id){ return K&&K.items?K.items[id]||null:null; }
function related(curr,code){ const C=D&&D.curr[curr]; if(!C) return [code]; if(curr==='c22') return (C.map2015||{})[code]||[]; return [code]; }
const ACTS=[['개념 및 원리 이해','이해하고 있는지'],['문제 파악 및 인식','파악하고 인식할 수 있는지'],['탐구 설계 및 수행','탐구를 설계하고 수행할 수 있는지'],['자료 분석 및 해석','자료를 분석하고 해석할 수 있는지'],['결론 도출 및 평가','결론을 도출하고 평가할 수 있는지']];
function goalOf(ev,act){ ev=String(ev||'').trim(); if(!ev) return ''; const a=ACTS.find(x=>x[0]===act)||ACTS[0];
  if(a[0]==='자료 분석 및 해석') return `자료를 분석하여 ${W(ev,'을를')} 해석할 수 있는지를 평가한다.`;
  if(a[0]==='결론 도출 및 평가') return `제시된 정보를 바탕으로 ${ev}에 관한 결론을 도출할 수 있는지를 평가한다.`;
  if(a[0]==='탐구 설계 및 수행') return `${ev}에 관한 탐구를 설계하고 수행할 수 있는지를 평가한다.`;
  if(a[0]==='문제 파악 및 인식') return `${ev}에서 나타나는 문제를 파악하고 인식할 수 있는지를 평가한다.`;
  return `${W(ev,'을를')} 이해하고 있는지를 평가한다.`; }

/* ───────── 내보내기 ───────── */
const CIRC=['①','②','③','④','⑤'];
function itemText(it,no){
  const P=stemParts(it); const A=answerSet(it.form,it.stmts||[],{any:it.anyCount});
  const L=[]; L.push(`${no||1}. ${[P.ind,P.dir,P.cond,P.pts].filter(Boolean).join(' ')}`);
  L.push(`[자료] ${String(it.dataNote||'').trim()||'(자료를 여기에)'}`);
  const bogi=['bogi','bogiAny'].includes(it.form);
  if(bogi){ L.push('<보 기>'); (it.stmts||[]).forEach((s,i)=>L.push(`${JAMO[i]}. ${s.text}`)); }
  else if(it.form==='stu'&&!A.single){ (it.stmts||[]).forEach((s,i)=>L.push(`${STU[i]}: ${s.text}`)); }
  else if(it.form==='stu'&&A.single){ (it.stmts||[]).forEach((s,i)=>L.push(`${STU[i]}: ${s.text}`)); }
  if(A.opts&&A.opts.length) L.push(A.opts.map((o,i)=>`${CIRC[i]} ${o}`).join(bogi||it.form==='stu'?'   ':'\n'));
  return {text:L.join('\n'),ans:A.ans,ansInfo:A};
}
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function underlineNeg(html){ return html.replace(/옳지 않은/g,'옳지 <u>않은</u>'); }

return {setData,setKice,get data(){ return D; },get hasKice(){ return !!(K&&K.items); },
  josa,batchim,W,SEQ,SEQ_NAME,seqOf,seqIdx,orderLabels,rangeOf,seqList,condSentence,
  SCENES,DKINDS,FORMS,formOf,indirectStem,directStem,stemParts,stemText,
  koppen,KNAME,GNAME,noonAlt,dayLen,climateStmts,tableStmts,CM,
  kindOf,KIND_ORDER,sortStmts,answerSet,checks,MANUAL,
  gichulBy,stats,kiceOf,related,ACTS,goalOf,itemText,esc,underlineNeg,CIRC,JAMO,STU};
})();
