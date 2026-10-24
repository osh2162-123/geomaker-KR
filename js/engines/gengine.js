/* 세계지리 기후 그래프 공통 엔진: ClimatView 표 해석, 기후 지표 계산, 시험지 양식 그래프 4종 그리기, PNG·SVG 내보내기 */
const GG=(function(){
'use strict';
const MMPT=25.4/72;          // 1pt = 0.3528 mm
const M=1.5;                 // 그림 바깥 흰 여백(mm)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MINUS='−';
/* 밖에서 들어온 작업 자료(작업 파일·브라우저 저장·다른 탭에서 넘겨받은 것)를 쓰기 전에 정리한다(보안).
   글자 속 < > " ` 는 모양이 비슷한 전각 문자(＜ ＞ ＂ ｀)로 바꿔 HTML·SVG 구조로 읽히지 않게 하고,
   data: 주소는 base64 그림만, javascript: 주소는 지운다. 숫자·참거짓은 그대로, 그 밖의 것은 버린다 */
const CLEAN_MAP={'<':'＜','>':'＞','"':'＂','`':'｀'};
const DATA_IMG=/^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]*$/;
function clean(v,depth){ depth=depth||0; if(depth>60) return null;
  if(typeof v==='string'){ if(/^\s*data:/i.test(v)) return DATA_IMG.test(v)?v:''; if(/^\s*(?:javascript|vbscript):/i.test(v)) return '';
    return v.replace(/[<>"`]/g,c=>CLEAN_MAP[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,''); }
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  if(typeof v==='boolean'||v===null) return v;
  if(Array.isArray(v)) return v.map(x=>clean(x,depth+1));
  if(typeof v==='object'){ const o={}; for(const k of Object.keys(v)){ if(k==='__proto__'||k==='constructor'||k==='prototype') continue; o[clean(k,depth+1)]=clean(v[k],depth+1); } return o; }
  return null; }
const fin=v=>typeof v==='number'&&isFinite(v);
const sum=a=>a.reduce((s,x)=>s+x,0);
const avg=a=>a.length?sum(a)/a.length:NaN;
const gray=v=>{const h=Math.round(clamp(v,0,255)).toString(16).padStart(2,'0'); return '#'+h+h+h;};

/* ───────── 숫자 표기 ───────── */
function decOf(step){ if(!fin(step)||step<=0) return 0; let d=0; while(d<4&&Math.abs(Math.round(step*10**d)-step*10**d)>1e-6) d++; return d; }
function fmt(v,dec){ if(!fin(v)) return ''; let s=(dec==null?(Math.round(v*10)/10).toString():v.toFixed(dec)); if(/^-0(\.0+)?$/.test(s)) s=s.slice(1);
  if(Math.abs(v)>=1000) s=s.replace(/^(-?)(\d+)/,(m,a,b)=>a+b.replace(/\B(?=(\d{3})+(?!\d))/g,',')); return s.replace('-',MINUS); }
function fmtVal(v){ if(!fin(v)) return ''; const r=Math.round(v*10)/10; return fmt(r, Number.isInteger(r)?0:1); }
function fmtNum(v,dec,comma){ if(!fin(v)) return ''; let t=Math.abs(v).toFixed(dec); if(comma){ const q=t.split('.'); t=q[0].replace(/\B(?=(\d{3})+(?!\d))/g,',')+(q[1]!=null?'.'+q[1]:''); } return (v<0&&+t.replace(/,/g,'')!==0?MINUS:'')+t; }
const KN=['','한','두','세','네','다섯','여섯','일곱','여덟','아홉','열'];

/* ───────── 글꼴 ───────── */
const FONTS={
 serif:[
  {key:'hysm',label:'HY신명조 (시험지 글꼴)',names:['HY신명조','HYSinMyeongJo-Medium','한양신명조']},
  {key:'hygm',label:'HY견명조',names:['HY견명조','HYGyeonMyeongJo-Bold','HYGyeonMyeongJo']},
  {key:'hcrb',label:'함초롬바탕',names:['함초롬바탕','HCR Batang','HCRBatang']},
  {key:'batang',label:'바탕',names:['바탕','Batang']},
  {key:'noto',label:'Noto Serif KR (웹 글꼴)',names:['Noto Serif KR'],web:true},
  {key:'user',label:'직접 불러온 글꼴 파일',names:['__UserSerif']}
 ],
 gothic:[
  {key:'hyjg',label:'HY중고딕 (시험지 글꼴)',names:['HY중고딕','HYGothic-Medium','HYGothic']},
  {key:'malgun',label:'맑은 고딕',names:['맑은 고딕','Malgun Gothic']},
  {key:'nanum',label:'나눔고딕',names:['나눔고딕','NanumGothic']},
  {key:'apple',label:'Apple SD 산돌고딕 Neo',names:['Apple SD Gothic Neo']},
  {key:'notos',label:'Noto Sans KR (웹 글꼴)',names:['Noto Sans KR'],web:true},
  {key:'user',label:'직접 불러온 글꼴 파일',names:['__UserGothic']}
 ]
};
const FALLBACK={serif:['Noto Serif KR','Batang','바탕','AppleMyungjo'],gothic:['Noto Sans KR','Malgun Gothic','맑은 고딕','Apple SD Gothic Neo']};
const GENERIC={serif:'serif',gothic:'sans-serif'};
const userFonts={serif:'',gothic:''};
const WEBNAME={serif:'Noto Serif KR',gothic:'Noto Sans KR'};
function fontDef(doc,fam){ const key=fam==='serif'?doc.style.serif:doc.style.gothic; return FONTS[fam].find(f=>f.key===key)||FONTS[fam][0]; }
function familyList(doc,fam){
  const f=fontDef(doc,fam);
  const names=f.key==='user'?[f.names[0]]:f.names;
  const latin=(fam==='serif'&&doc.style.latin==='times')?['Times New Roman','Times']:[];
  return [...latin,...names,...FALLBACK[fam]];
}
function fontStack(doc,fam){ return familyList(doc,fam).map(n=>`"${n}"`).concat([GENERIC[fam]]).join(', '); }
const probe=document.createElement('canvas').getContext('2d');
const instCache={};
function fontInstalled(name){
  if(instCache[name]) return true;
  const t='가나다라마바사ABCabc(가)㉠0123';
  probe.font='40px monospace'; const a=probe.measureText(t).width;
  probe.font=`40px "${name}", monospace`; const b=probe.measureText(t).width;
  probe.font='40px sans-serif'; const c=probe.measureText(t).width;
  probe.font=`40px "${name}", sans-serif`; const d=probe.measureText(t).width;
  const ok=Math.abs(a-b)>0.5||Math.abs(c-d)>0.5; if(ok) instCache[name]=true; return ok;
}
function fontAvailable(f,fam){
  if(f.key==='user') return !!userFonts[fam];
  if(f.web) return document.fonts?document.fonts.check(`16px "${f.names[0]}"`,'가'):false;
  return f.names.some(fontInstalled);
}
function needsWeb(doc,fam){ const f=fontDef(doc,fam); return f.web||!fontAvailable(f,fam); }
async function registerUserFont(fam,file){
  const buf=await file.arrayBuffer(); const name=fam==='serif'?'__UserSerif':'__UserGothic';
  const face=new FontFace(name,buf); await face.load(); document.fonts.add(face);
  userFonts[fam]=file.name.replace(/\.(ttf|otf|woff2?)$/i,''); return userFonts[fam];
}

/* ───────── 기후 지표 ───────── */
const MON=Array.from({length:12},(_,i)=>i);
const SEASON={DJF:[11,0,1],MAM:[2,3,4],JJA:[5,6,7],SON:[8,9,10]};
const METRICS={};
function defM(key,o){ METRICS[key]=Object.assign({key},o); }
defM('tY',{name:'연평균 기온',base:'연평균 기온',unit:'t',grp:'기온',f:s=>avg(s.t)});
defM('tR',{name:'기온의 연교차',base:'기온의 연교차',unit:'t',grp:'기온',f:s=>Math.max(...s.t)-Math.min(...s.t)});
defM('tMin',{name:'최한월 평균 기온',base:'최한월 평균 기온',unit:'t',grp:'기온',f:s=>Math.min(...s.t)});
defM('tMax',{name:'최난월 평균 기온',base:'최난월 평균 기온',unit:'t',grp:'기온',f:s=>Math.max(...s.t)});
defM('pY',{name:'연 강수량',base:'연 강수량',unit:'p',grp:'강수',f:s=>sum(s.p)});
defM('pJJA',{name:'여름(6~8월) 강수량',base:'여름 강수량',unit:'p',grp:'강수',f:s=>sum(SEASON.JJA.map(i=>s.p[i]))});
defM('pDJF',{name:'겨울(12~2월) 강수량',base:'겨울 강수량',unit:'p',grp:'강수',f:s=>sum(SEASON.DJF.map(i=>s.p[i]))});
defM('pMAM',{name:'봄(3~5월) 강수량',base:'봄 강수량',unit:'p',grp:'강수',f:s=>sum(SEASON.MAM.map(i=>s.p[i]))});
defM('pSON',{name:'가을(9~11월) 강수량',base:'가을 강수량',unit:'p',grp:'강수',f:s=>sum(SEASON.SON.map(i=>s.p[i]))});
defM('rJJA',{name:'여름 강수 집중률',base:'여름 강수 집중률',unit:'%',grp:'강수',f:s=>sum(SEASON.JJA.map(i=>s.p[i]))/sum(s.p)*100});
defM('rDJF',{name:'겨울 강수 집중률',base:'겨울 강수 집중률',unit:'%',grp:'강수',f:s=>sum(SEASON.DJF.map(i=>s.p[i]))/sum(s.p)*100});
defM('pMax',{name:'최다우월 강수량',base:'최다우월 강수량',unit:'p',grp:'강수',f:s=>Math.max(...s.p)});
defM('pMin',{name:'최소우월 강수량',base:'최소우월 강수량',unit:'p',grp:'강수',f:s=>Math.min(...s.p)});
for(const i of MON){
  defM('t'+(i+1),{name:`${i+1}월 평균 기온`,base:'평균 기온',unit:'t',grp:'월별 기온',month:i+1,f:s=>s.t[i]});
  defM('p'+(i+1),{name:`${i+1}월 강수량`,base:'강수량',unit:'p',grp:'월별 강수',month:i+1,f:s=>s.p[i]});
}
const METRIC_GROUPS=['기온','강수','월별 기온','월별 강수'];
function metricOf(s,key){
  const m=METRICS[key]; if(!m||!s) return NaN;
  if(m.month){ const a=m.unit==='t'?s.t:s.p; return fin(a[m.month-1])?a[m.month-1]:NaN; }
  if(!s.t.every(fin)&&m.unit==='t') return NaN;
  if(!s.p.every(fin)&&m.unit!=='t') return NaN;
  const v=m.f(s); return fin(v)?v:NaN;
}
function unitText(doc,u){ return u==='t'?doc.style.deg:u==='p'?'mm':'%'; }

/* ───────── 문서 ───────── */
const SEQS={
 gana:['가','나','다','라','마','바','사','아','자','차','카','타','파','하'].map(s=>`(${s})`),
 latin:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
 circ:'㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭'.split(''),
 num:Array.from({length:30},(_,i)=>String(i+1)),
 name:[]
};
const FILLS={white:'흰색',light:'연한 회색',mid:'회색',dark:'진한 회색',black:'검정',hatch:'빗금'};
const MARKS={oc:'○',fc:'●',os:'□',fs:'■',ot:'△',ft:'▲',od:'◇',fd:'◆',gd:'회색 ◆',gs:'회색 ■',none:'없음'};
const LINE_STY=[
 {c:'k',dash:'solid',mk:'oc'},{c:'k',dash:'dash',mk:'os'},{c:'g',dash:'solid',mk:'ft'},
 {c:'k',dash:'solid',mk:'fs'},{c:'k',dash:'dash',mk:'od'},{c:'g',dash:'solid',mk:'fc'}
];
const KINDS=['climo','line','cat','sc','rd','tb'];
function freshDoc(kind){
  return {v:2,kind:kind||'climo',seq:'gana',stations:[],
    climo:{mode:'value',months:'all',xall:true,temp:'line',smooth:true,cols:2,pw:28,ph:26,words:false,t:{auto:true,lo:-10,hi:30,step:10},p:{auto:true,lo:0,hi:400,step:100}},
    line:{v:'t',mode:'value',start:0,mark:'line',xall:true,cols:3,lbl:'legend',lgPos:'auto',smooth:false,titleOn:false,title:'',pw:45,ph:40,y:{auto:true,lo:-20,hi:30,step:10},sty:{}},
    cat:{series:[{m:'p1',alias:'',fill:'mid',mark:'bar',title:''},{m:'p7',alias:'',fill:'dark',mark:'bar',title:''}],layout:'panels',mode:'value',values:false,legend:'right',sep:false,fillBy:'series',brk:false,plus:false,grid:true,zero:'solid',ytitle:'',pw:30,ph:35,y:{auto:true,lo:0,hi:500,step:100},y2:{auto:true,lo:0,hi:1500,step:300}},
    tb:{rows:'st',metrics:[{m:'tR',alias:'',title:''},{m:'tMin',alias:'',title:''},{m:'p1',alias:'',title:''}],mode:'value',dec:1,comma:true,unitLine:false},
    rd:{metrics:[{m:'pJJA',alias:'',title:''},{m:'pDJF',alias:'',title:''},{m:'tY',alias:'',title:''}],center:'',size:46},
    sc:{x:{m:'p7',alias:'',mode:'value',title:''},y:{m:'t1',alias:'',mode:'value',title:''},style:'cross',pw:55,ph:42,xa:{auto:true,lo:0,hi:100,step:20},ya:{auto:true,lo:0,hi:30,step:10}},
    notes:{auto:true,normal:true,extra:''},
    style:{serif:'hysm',gothic:'hyjg',latin:'',deg:'℃',tickPt:8,catPt:9,titlePt:8.5,legendPt:8,unitPt:7.5,notePt:7,valuePt:7.5,tablePt:9,lw:1,light:228,mid:177,dark:126}
  };
}
function normalizeDoc(d){
  d=clean(d); const f=freshDoc(d&&d.kind);
  if(!d||typeof d!=='object') return f;
  const out=Object.assign({},f,d);
  for(const k of ['climo','line','cat','sc','tb','rd','notes','style']) out[k]=Object.assign({},f[k],d[k]||{});
  for(const k of ['t','p']) out.climo[k]=Object.assign({},f.climo[k],(d.climo||{})[k]||{});
  out.line.y=Object.assign({},f.line.y,(d.line||{}).y||{}); out.line.sty=Object.assign({},(d.line||{}).sty||{});
  if(!(+d.v>=2)&&out.line.lbl==='right') out.line.lbl='legend';   /* v1 작업의 기본값(오른쪽 끝 라벨)을 범례 상자로 */
  out.v=2;
  out.cat.y=Object.assign({},f.cat.y,(d.cat||{}).y||{}); out.cat.y2=Object.assign({},f.cat.y2,(d.cat||{}).y2||{});
  const ml=(a,def)=>Array.isArray(a)&&a.length?a.map(x=>Object.assign({m:'tY',alias:'',title:''},x)):def;
  out.tb.metrics=ml((d.tb||{}).metrics,f.tb.metrics); out.rd.metrics=ml((d.rd||{}).metrics,f.rd.metrics);
  out.cat.series=Array.isArray((d.cat||{}).series)&&d.cat.series.length?d.cat.series.map(s=>Object.assign({m:'p1',alias:'',fill:'mid',mark:'bar',title:''},s)):f.cat.series;
  for(const k of ['x','y']) out.sc[k]=Object.assign({},f.sc[k],(d.sc||{})[k]||{});
  for(const k of ['xa','ya']) out.sc[k]=Object.assign({},f.sc[k],(d.sc||{})[k]||{});
  out.stations=(Array.isArray(d.stations)?d.stations:[]).map(normStation).filter(Boolean);
  if(!KINDS.includes(out.kind)) out.kind='climo';
  return out;
}
const nn=v=>(v==null||v==='')?null:(fin(+v)?+v:null);
function normStation(s){
  if(!s||typeof s!=='object') return null;
  const arr=a=>MON.map(i=>{ const v=Array.isArray(a)?+a[i]:NaN; return fin(v)?v:NaN; });
  return {id:s.id||uid(),name:String(s.name||'지점'),lbl:String(s.lbl==null?'':s.lbl),en:s.en||'',country:s.country||'',
    lat:nn(s.lat),lon:nn(s.lon),elev:nn(s.elev),
    t:arr(s.t),p:arr(s.p),ref:!!s.ref,refLbl:String(s.refLbl||'').slice(0,8),src:s.src||'',period:s.period||''};
}
const plotted=doc=>doc.stations.filter(s=>!s.ref);
const refStation=doc=>doc.stations.find(s=>s.ref)||null;
function relabel(doc){
  const seq=SEQS[doc.seq]; let i=0;
  for(const s of doc.stations){ if(s.ref){ s.lbl=''; continue; } s.lbl=doc.seq==='name'?s.name:(seq[i]||String(i+1)); i++; }
}
function nextLabel(doc){
  if(doc.seq==='name') return '';
  const used=new Set(plotted(doc).map(s=>s.lbl)); const seq=SEQS[doc.seq]||SEQS.gana;
  return seq.find(x=>!used.has(x))||'';
}
function addStation(doc,st){
  const s=normStation(st); s.lbl=doc.seq==='name'?s.name:nextLabel(doc); doc.stations.push(s); return s;
}
function valueOf(doc,s,key,mode){
  const v=metricOf(s,key); if(!fin(v)) return NaN;
  if(mode==='mean'){ const P=plotted(doc).map(x=>metricOf(x,key)); if(!P.every(fin)) return NaN; return v-avg(P); }
  if(mode==='ref'){ const r=refStation(doc); if(!r) return NaN; const b=metricOf(r,key); return fin(b)?v-b:NaN; }
  return v;
}
const LINE_V={t:{name:'기온',base:'월평균 기온',u:'t'},p:{name:'강수량',base:'월 강수량',u:'p'},pc:{name:'누적 강수량',base:'누적 강수량',u:'p'},pr:{name:'누적 강수 비율',base:'누적 강수 비율',u:'%'},ps:{name:'월 강수 비율',base:'월 강수 비율',u:'%'}};
function monthOrder(start){ const st=((+start||0)%12+12)%12; return MON.map(i=>(i+st)%12); }
function rawMonthly(s,v,start){
  if(v==='t') return s.t.slice(); if(v==='p') return s.p.slice();
  if(!s.p.every(fin)) return MON.map(()=>NaN);
  const tot=sum(s.p);
  if(v==='ps') return s.p.map(x=>tot>0?x/tot*100:NaN);
  const out=new Array(12).fill(NaN); let acc=0;
  for(const i of monthOrder(start)){ acc+=s.p[i]; out[i]=v==='pc'?acc:(tot>0?acc/tot*100:NaN); }
  return out;
}
function monthlyOf(doc,s,v,mode,start){
  const a=rawMonthly(s,v,start);
  if(mode==='mean'){ const P=plotted(doc).map(o=>rawMonthly(o,v,start)); return MON.map(i=>{ const c=P.map(x=>x[i]); return fin(a[i])&&c.every(fin)?a[i]-avg(c):NaN; }); }
  if(mode==='ref'){ const r=refStation(doc); if(!r) return MON.map(()=>NaN); const b=rawMonthly(r,v,start); return MON.map(i=>fin(a[i])&&fin(b[i])?a[i]-b[i]:NaN); }
  return a;
}
function metricLabel(key,alias,diff){
  const m=METRICS[key]; if(!m) return '';
  const base=alias&&alias.trim()?`${alias.trim()} ${m.base}`:m.name; return diff?`${base} 차이`:base;
}

/* ───────── ClimatView 표 해석 ───────── */
const NUM_RE=/^[-−–]?\d+(?:\.\d+)?$/;
function toNum(tok){ if(tok==null) return null; const t=String(tok).trim().replace(/[−–]/g,'-').replace(/,/g,''); return NUM_RE.test(t)?+t:null; }
const HEAD_RE=/Lat\.?\s*:?\s*(-?[\d.]+)\s*°?\s*([NS])?\s*[\/,]?\s*Lon\.?\s*:?\s*(-?[\d.]+)\s*°?\s*([EW])?(?:\s*Height\s*:?\s*(-?[\d.]+))?/i;
const ROW_RE=/^\s*(\d{4})\s*[-\/.]\s*(\d{1,2})(?!\d)(.*)$/;
function splitBlocks(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n');
  const blocks=[]; let cur=[];
  for(const ln of lines){
    if(HEAD_RE.test(ln)&&cur.some(l=>ROW_RE.test(l))){
      let k=cur.length-1; while(k>=0&&!ROW_RE.test(cur[k])) k--;
      blocks.push(cur.slice(0,k+1)); cur=cur.slice(k+1);
    }
    cur.push(ln);
  }
  if(cur.length) blocks.push(cur);
  return blocks;
}
function parseHeader(lines){
  const out={name:'',en:'',country:'',lat:null,lon:null,elev:null};
  for(let i=0;i<lines.length;i++){
    const m=HEAD_RE.exec(lines[i]); if(!m) continue;
    out.lat=+m[1]*(m[2]&&/s/i.test(m[2])?-1:1); out.lon=+m[3]*(m[4]&&/w/i.test(m[4])?-1:1); if(m[5]!=null) out.elev=+m[5];
    let head=lines[i].slice(0,m.index).trim();
    if(!head){ for(let j=i-1;j>=0;j--){ const t=lines[j].trim(); if(t&&!/climat|station|graph|select|year|month/i.test(t)){ head=t; break; } if(t&&/^[A-Z][A-Z .'\/()-]+-\s*[A-Z]/.test(t)){ head=t; break; } } }
    head=head.replace(/^[#*\s]+/,'').replace(/climate data\s*$/i,'').trim();
    const k=head.lastIndexOf(' -');
    if(k>0){ out.en=head.slice(0,k).trim(); out.country=head.slice(k+2).trim(); } else out.en=head;
    break;
  }
  return out;
}
function rowsOf(lines){
  const rows=[];
  for(const ln of lines){
    const m=ROW_RE.exec(ln); if(!m) continue;
    const mon=+m[2]; if(mon<1||mon>12) continue;
    let rest=m[3]; let cells;
    if(rest.includes('\t')){ cells=rest.split('\t'); if(cells.length&&cells[0].trim()==='') cells.shift(); cells=cells.map(c=>c.trim()); }
    else if(rest.includes('|')){ cells=rest.split('|').map(c=>c.trim()); if(cells.length&&cells[0]==='') cells.shift(); if(cells.length&&cells[cells.length-1]==='') cells.pop(); }
    else if(rest.includes(',')){ cells=rest.split(',').map(c=>c.trim()); if(cells.length&&cells[0]==='') cells.shift(); }
    else cells=rest.trim().split(/\s+/).filter(Boolean);
    const vals=cells.map(c=>/^(<empty>|—|-{1,3}|\/\/\/|\*+|n\/a)$/i.test(c)||c===''?null:toNum(c));
    rows.push({y:+m[1],m:mon,cells,vals,aligned:rest.includes('\t')||rest.includes('|')||rest.includes(',')});
  }
  return rows;
}
/* 평년값 열 찾기: 같은 달이 두 번 나오는 표에서는 평년값만 두 번 다 같다는 점을 이용해 열을 확정한다 */
function pickNormals(rows){
  const tries=[];
  const allAligned=rows.every(r=>r.aligned);
  if(allAligned&&rows.every(r=>r.vals.length>=6)) tries.push(r=>[r.vals[4],r.vals[5]]);
  tries.push(r=>r.vals.length>=5?[r.vals[r.vals.length-5],r.vals[r.vals.length-4]]:[null,null]);
  tries.push(r=>r.vals.length>=2?[r.vals[r.vals.length-2],r.vals[r.vals.length-1]]:[null,null]);
  tries.push(r=>r.vals.length>=4?[r.vals[r.vals.length-4],r.vals[r.vals.length-3]]:[null,null]);
  tries.push(r=>r.vals.length>=3?[r.vals[r.vals.length-3],r.vals[r.vals.length-2]]:[null,null]);
  let best=null;
  for(const f of tries){
    const byM={}; let ok=true, dup=0;
    for(const r of rows){ const [t,p]=f(r); if(t==null||p==null){ ok=false; break; }
      if(t<-70||t>50||p<0||p>3500){ ok=false; break; }
      if(byM[r.m]){ if(byM[r.m][0]!==t||byM[r.m][1]!==p){ ok=false; break; } dup++; } else byM[r.m]=[t,p]; }
    if(!ok) continue;
    const months=Object.keys(byM).length; if(months<12) { if(!best) best={byM,dup,partial:true}; continue; }
    if(dup>0) return {byM,dup,partial:false};
    if(!best||best.partial) best={byM,dup,partial:false};
  }
  return best;
}
/* 숫자만 있는 표: 12개씩 두 줄(기온, 강수량) 또는 12줄 × (월) 기온 강수량 */
function parseGrid(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(Boolean);
  const nums=lines.map(l=>l.split(/[\s,\t|]+/).map(toNum).filter(v=>v!=null));
  const long=nums.filter(a=>a.length>=12);
  if(long.length>=2){ const a=long[0].slice(-12), b=long[1].slice(-12); return {t:a,p:b}; }
  const rows=nums.filter(a=>a.length>=2&&a.length<=4);
  if(rows.length>=12){
    const r=rows.slice(0,12);
    const lead=r.every((a,i)=>a.length>=3&&a[0]===i+1);
    return lead?{t:r.map(a=>a[1]),p:r.map(a=>a[2])}:{t:r.map(a=>a[a.length-2]),p:r.map(a=>a[a.length-1])};
  }
  return null;
}
function parseClimate(text){
  const res={stations:[],errors:[]};
  const src=String(text||'');
  if(!src.trim()){ res.errors.push('붙여 넣은 내용이 비어 있어요.'); return res; }
  const blocks=splitBlocks(src);
  for(const b of blocks){
    const head=parseHeader(b); const rows=rowsOf(b);
    if(rows.length){
      const n=pickNormals(rows);
      if(!n){ res.errors.push(`${head.en||'표'}: 평년값 열을 찾지 못했어요. 표 전체(연/월부터 SPI까지)를 복사했는지 확인해 주세요.`); continue; }
      if(n.partial){ res.errors.push(`${head.en||'표'}: 12달이 다 있지 않아요(${Object.keys(n.byM).length}달). 24개월 표 전체를 붙여 넣어 주세요.`); continue; }
      const t=MON.map(i=>n.byM[i+1][0]), p=MON.map(i=>n.byM[i+1][1]);
      res.stations.push({name:koName(head.en)||head.en||'지점',en:head.en,country:head.country,lat:head.lat,lon:head.lon,elev:head.elev,t,p,src:'JMA ClimatView',period:'1991~2020년 평년값',checked:n.dup});
      continue;
    }
    const g=parseGrid(b.join('\n'));
    if(g){ if(g.t.some(v=>v<-70||v>50)||g.p.some(v=>v<0||v>3500)){ res.errors.push('기온·강수량 범위를 벗어난 숫자가 있어요. 첫 줄이 기온, 둘째 줄이 강수량인지 확인해 주세요.'); continue; }
      res.stations.push({name:head.en||'',en:head.en,country:head.country,lat:head.lat,lon:head.lon,elev:head.elev,t:g.t,p:g.p,src:'직접 입력',period:''}); continue; }
    if(b.some(l=>l.trim())) res.errors.push('표를 알아보지 못했어요. ClimatView 지점 페이지의 표를 통째로 복사하거나, 기온 12개·강수량 12개를 두 줄로 붙여 넣어 주세요.');
  }
  return res;
}
/* ───────── 미리 담은 지점 사전 ───────── */
/* 묶음 형식: {n:한글 이름, a:[다른 이름], e:JMA 지점명, c:나라, la, lo, h, t:[12], p:[12]} */
let STN=[];
const nrm=s=>String(s||'').replace(/[\s·.\-()'’]/g,'').toLowerCase();
function fromBundle(r,i){ return {id:'b'+i,name:r.n,aliases:r.a||[],en:r.e||'',country:r.c||'',lat:r.la,lon:r.lo,elev:r.h,t:r.t,p:r.p,src:r.w?`JMA ClimatView (WMO ${r.w})`:'JMA ClimatView',period:'1991~2020년 평년값'}; }
function setStationDict(d){ STN=(Array.isArray(d)?d:[]).map((r,i)=>r.n?fromBundle(r,i):r); }
try{ const el=document.getElementById('gg-stations'); if(el) setStationDict(JSON.parse(el.textContent)); }catch(e){}
function stationList(){ return STN; }
/* ───────── 쾨펜 기후 구분 ─────────
   교과서 기준: 최한월 18℃(A), -3℃(C/D), 최난월 10℃(E). 건조 한계는 연평균 기온과 강수 계절성으로 계산(Peel 외 2007 방식).
   고산 기후(H)는 판별하지 않는다(해발이 높은 지점은 ‘고지대’ 표시만 한다) */
const KOP_NAME={Af:'열대 우림 기후',Am:'열대 몬순 기후',Aw:'사바나 기후',As:'사바나 기후',BW:'사막 기후',BS:'스텝 기후',Cfa:'온난 습윤 기후',Cfb:'서안 해양성 기후',Cfc:'서안 해양성 기후',
  Cs:'지중해성 기후',Cw:'온대 겨울 건조 기후',Df:'냉대 습윤 기후',Dw:'냉대 겨울 건조 기후',Ds:'냉대 습윤 기후',ET:'툰드라 기후',EF:'빙설 기후'};
const KOP_TYPES=['열대 우림 기후','열대 몬순 기후','사바나 기후','사막 기후','스텝 기후','지중해성 기후','온난 습윤 기후','서안 해양성 기후','온대 겨울 건조 기후','냉대 습윤 기후','냉대 겨울 건조 기후','툰드라 기후','빙설 기후'];
function koppenOf(s){
  const t=s&&s.t, p=s&&s.p; if(!t||!p||t.length!==12||p.length!==12||!t.every(fin)||!p.every(fin)) return null;
  const Tmin=Math.min(...t), Tmax=Math.max(...t), Tann=avg(t), Pann=sum(p); const nh=!(s.lat<0);
  const S=nh?[3,4,5,6,7,8]:[9,10,11,0,1,2], Wi=nh?[9,10,11,0,1,2]:[3,4,5,6,7,8]; const Ps=sum(S.map(i=>p[i])), Pw=sum(Wi.map(i=>p[i]));
  const Pth=20*Tann+(Ps>=0.7*Pann?280:Pw>=0.7*Pann?0:140); let code;
  if(Tmax<10) code=Tmax>0?'ET':'EF';
  else if(Pann<Pth) code=Pann<Pth/2?'BW':'BS';
  else if(Tmin>=18){ const Pd=Math.min(...p); code=Pd>=60?'Af':Pd>=100-Pann/25?'Am':'Aw'; }
  else { const C=Tmin>-3; const sp=S.map(i=>p[i]), wp=Wi.map(i=>p[i]);
    const second=(Math.min(...sp)<40&&Math.min(...sp)<Math.max(...wp)/3)?'s':(Math.min(...wp)<Math.max(...sp)/10)?'w':'f';
    if(C) code=second==='f'?(Tmax>=22?'Cfa':(t.filter(x=>x>=10).length>=4?'Cfb':'Cfc')):'C'+second; else code='D'+second; }
  const key=KOP_NAME[code]?code:code.slice(0,2);
  /* 건조 기후의 3차 구분: 연평균 기온 18℃ 이상이면 h(고온), 아니면 k(저온) */
  const sub=(code==='BW'||code==='BS')?code+(Tann>=18?'h':'k'):code;
  return {code:sub,name:KOP_NAME[key]||KOP_NAME[code]||code,group:code[0]};
}
/* 같은 구분 지점을 ‘대표성’ 순으로: 그 구분 지점들의 가운데(중앙값)에 가까운 순. 해발 1,500 m 넘는 지점은 뒤로 */
function koppenStations(name){
  const L=STN.filter(s=>{ const k=koppenOf(s); return k&&k.name===name; }); if(!L.length) return [];
  const feat=s=>{ const Pann=sum(s.p), nh=!(s.lat<0), S=nh?[3,4,5,6,7,8]:[9,10,11,0,1,2]; return [avg(s.t)/8, Math.log(Pann+30), (Math.max(...s.t)-Math.min(...s.t))/8, sum(S.map(i=>s.p[i]))/Math.max(1,Pann)*2]; };
  const F=L.map(feat); const med=[0,1,2,3].map(i=>{ const a=F.map(f=>f[i]).sort((x,y)=>x-y); return a[a.length>>1]; });
  return L.map((s,i)=>({s,d:Math.hypot(...F[i].map((v,j)=>v-med[j]))+(s.elev>1500?5:0)})).sort((a,b)=>a.d-b.d).map(o=>o.s);
}

function koName(en){
  if(!en) return '';
  const k=String(en).toUpperCase().replace(/\s+/g,' ').trim();
  const hit=STN.find(s=>String(s.en).toUpperCase()===k); return hit?hit.name:'';
}
function searchStations(q,limit){
  const n=nrm(q); if(!n) return [];
  const out=[];
  for(const s of STN){ const names=[s.name,...s.aliases].map(nrm); let sc=9;
    if(names.includes(n)) sc=0; else if(names.some(x=>x.startsWith(n))) sc=1; else if(names.some(x=>x.includes(n))) sc=2;
    else if(nrm(s.en).includes(n)) sc=3; else if(nrm(s.country).includes(n)) sc=5;
    if(sc<9) out.push({s,sc}); }
  out.sort((a,b)=>a.sc-b.sc||a.s.name.localeCompare(b.s.name,'ko'));
  return out.slice(0,limit||12).map(o=>o.s);
}
function stationData(s){ return {name:s.name,en:s.en,country:s.country,lat:s.lat,lon:s.lon,elev:s.elev,t:s.t.slice(),p:s.p.slice(),src:s.src,period:s.period}; }

/* ───────── 문장 해석 ───────── */
const GANA=['가','나','다','라','마','바','사','아','자','차','카','타','파','하'];
const STOP=new Set(('누적 비율 비중 방사형 레이더 삼각형 거미줄 이중축 물결 생략 행 열 그래프 기후 기후그래프 막대 막대그래프 꺾은선 꺾은선그래프 선그래프 산점도 분포도 점그래프 기온 평균기온 월평균 월평균기온 강수량 강수 강우량 차이 평균 평균값 기준 지점 시기 숨김 숨겨 숨기고 월별 비교 그려 그려줘 그려주세요 만들어 만들어줘 만들어주세요 줘 주세요 표시 라벨 가로축 세로축 연중 변화 지역 도시 각각 따로 한 그래프로 그래프에 한그래프에 함께 묶어 값 수치 계절 여름 겨울 봄 가을 연교차 연강수량 연평균 최한월 최난월 집중률 대비 기후값 나란히 같이 네 세 두 다섯 곳 개 와 과 및 의 로 으로 를 을 이 가 은 는 에 에서 도 것 거 x축 y축 가로 세로 격자 상자 십자 사분면 점선 모눈 범례 위에 아래 오른쪽 왼쪽 정답 문제 발문 시험지 양식 1월 7월').split(' '));
const PARTICLE=/(으로|에서|과의|와의|이랑|하고|까지|부터|을|를|이|가|은|는|과|와|의|로|에|도)$/;
function metricKey(kind,m){ const t=/기온/.test(kind)?'t':'p'; const n=+m; return n>=1&&n<=12?t+n:null; }
const SEASON_KEY={'여름':'pJJA','겨울':'pDJF','봄':'pMAM','가을':'pSON'};
function findMetrics(text){
  const taken=new Array(text.length).fill(false); const out=[];
  const take=(i,len,keys)=>{ for(let k=i;k<i+len;k++) if(taken[k]) return false; for(let k=i;k<i+len;k++) taken[k]=true; keys.filter(Boolean).forEach((key,j)=>out.push({i:i+j*0.01,key})); return true; };
  const run=(re,f)=>{ re.lastIndex=0; let m; while((m=re.exec(text))) take(m.index,m[0].length,f(m)); };
  run(/(\d{1,2})\s*월\s*(?:과|와|,|·|및|\/|、)?\s*(\d{1,2})\s*월\s*(?:의\s*)?(?:평균\s*)?(기온|강수량?|강우량?)/g,m=>[metricKey(m[3],m[1]),metricKey(m[3],m[2])]);
  run(/(여름|겨울|봄|가을)\s*(?:\([^)]*\)\s*)?(?:과|와|,|·|및)\s*(여름|겨울|봄|가을)\s*(?:\([^)]*\)\s*)?(?:의\s*)?강수량?/g,m=>[SEASON_KEY[m[1]],SEASON_KEY[m[2]]]);
  run(/(\d{1,2})\s*월\s*(?:의\s*)?(?:평균\s*)?(기온|강수량?|강우량?)/g,m=>[metricKey(m[2],m[1])]);
  run(/연\s*평균\s*기온/g,()=>['tY']); run(/(?:기온\s*의?\s*)?연\s*교차/g,()=>['tR']);
  run(/최한월\s*(?:평균\s*)?기온/g,()=>['tMin']); run(/최난월\s*(?:평균\s*)?기온/g,()=>['tMax']);
  run(/여름\s*(?:\([^)]*\)\s*)?강수\s*집중률/g,()=>['rJJA']); run(/겨울\s*(?:\([^)]*\)\s*)?강수\s*집중률/g,()=>['rDJF']);
  run(/(여름|겨울|봄|가을)\s*(?:\([^)]*\)\s*)?강수량?/g,m=>[SEASON_KEY[m[1]]]);
  run(/연\s*강수량?/g,()=>['pY']); run(/최다우월\s*강수량?/g,()=>['pMax']); run(/최소우월\s*강수량?/g,()=>['pMin']);
  out.sort((a,b)=>a.i-b.i); const seen=new Set(); const keys=[];
  for(const o of out) if(!seen.has(o.key)){ seen.add(o.key); keys.push(o.key); }
  return {keys,taken};
}
function candidatesOf(docStations){
  const c=[];
  for(const s of docStations||[]) if(s.name) c.push({names:[s.name],data:s,from:'doc'});
  for(const s of STN) c.push({names:[s.name,...s.aliases],data:s,from:'bundle'});
  return c;
}
function findStationsIn(text,cands,taken){
  const entries=[]; for(const c of cands) for(const nm of c.names) if(nm&&nm.length>=2) entries.push({nm,c});
  entries.sort((a,b)=>b.nm.length-a.nm.length);
  const hits=[];
  for(const e of entries){ let from=0;
    for(;;){ const i=text.indexOf(e.nm,from); if(i<0) break; from=i+1;
      let free=true; for(let k=i;k<i+e.nm.length;k++) if(taken[k]){ free=false; break; } if(!free) continue;
      const prev=text[i-1]; if(prev&&/[가-힣A-Za-z]/.test(prev)) continue;
      for(let k=i;k<i+e.nm.length;k++) taken[k]=true; hits.push({i,len:e.nm.length,c:e.c,nm:e.nm}); } }
  hits.sort((a,b)=>a.i-b.i);
  const seen=new Set(); return hits.filter(h=>{ const k=h.c.data; if(seen.has(k)) return false; seen.add(k); return true; });
}
function shuffle(a){ const b=a.slice(); for(let i=b.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [b[i],b[j]]=[b[j],b[i]]; } return b; }
function parseRequest(q,docStations){
  const text=String(q||'').replace(/\s+/g,' ').trim();
  const res={spec:null,unknown:[],notes:[],understood:false};
  if(!text) return res;
  const {keys,taken}=findMetrics(text);
  const hits=findStationsIn(text,candidatesOf(docStations),taken);
  /* 기준 지점: ‘위니펙 기준’, ‘위니펙과의 (1월 7월) 강수량 차이’ */
  let ref=null;
  const REF_AFTER=/^\s*(?:(?:을|를|이|가|은|는)?\s*(?:기준|대비)|(?:지역|지점)?\s*(?:과|와)의?\s*(?:\d{1,2}\s*월\s*(?:과|와|,|·|및)?\s*)*(?:월평균\s*|평균\s*|월\s*)?(?:기온|강수량|기후\s*값|값)?\s*차이|(?:지역|지점)?\s*간의)/;
  for(const h of hits){ const after=text.slice(h.i+h.len,h.i+h.len+24), before=text.slice(Math.max(0,h.i-8),h.i);
    if(REF_AFTER.test(after)||/기준\s*(?:지점)?\s*[:은는]?\s*$/.test(before)){ ref=h; break; } }
  /* 라벨: ‘A 샌프란시스코’(앞) 또는 ‘샌프란시스코 A’(뒤). 첫 지점을 보고 어느 쪽에 적었는지 정한다 */
  const latinBefore=h=>{ const m=/(?:^|[\s,，(])([A-Z])\s*[:：=]?\s*$/.exec(text.slice(Math.max(0,h.i-6),h.i)); return m?m[1]:null; };
  const latinAfter=h=>{ const m=/^\s*([A-Z])(?![A-Za-z가-힣])/.exec(text.slice(h.i+h.len,h.i+h.len+4)); return m?m[1]:null; };
  const afterStyle=!!(hits.length&&latinAfter(hits[0])&&!latinBefore(hits[0]));
  const lbls={};
  for(const h of hits){ const before=text.slice(Math.max(0,h.i-6),h.i), after=text.slice(h.i+h.len,h.i+h.len+6); let m;
    if(afterStyle&&latinAfter(h)) lbls[h.i]=latinAfter(h);
    else if(!afterStyle&&latinBefore(h)) lbls[h.i]=latinBefore(h);
    else if((m=/(\([가-하]\)|[㉠-㉭])\s*[:：=]?\s*$/.exec(before))) lbls[h.i]=m[1];
    else if((m=/^\s*\(([A-Z]|[가-하])\)/.exec(after))) lbls[h.i]=/[A-Z]/.test(m[1])?m[1]:`(${m[1]})`;
    else if((m=/^\s*([㉠-㉭])/.exec(after))) lbls[h.i]=m[1]; }
  /* ‘(가) 위니펙 … (가)와의 차이’, ‘A~D 지역과 (가) 지역 간의 차이’: 기호로 기준 지점을 가리킨 경우 */
  if(!ref) for(const h of hits){ const L=lbls[h.i]; if(!L) continue; const e=L.replace(/[()]/g,'\\$&');
    if(new RegExp(e+REF_AFTER.source.replace(/^\^/,'')).test(text)){ ref=h; break; } }
  const refLbl=ref?(lbls[ref.i]||''):'';
  /* 종류 */
  const monthSpecific=keys.some(k=>/^[tp]\d+$/.test(k));
  let kind=null;
  const lv=/누적\s*강수\s*(?:량\s*)?(?:비율|비중)|누적\s*강수율|누적\s*비율/.test(text)?'pr':/누적\s*강수|누적\s*강우|누적/.test(text)?'pc':/월\s*강수\s*(?:량\s*)?(?:비율|비중)|월별\s*강수\s*(?:량\s*)?(?:비율|비중)|강수\s*(?:량\s*)?(?:비율|비중)/.test(text)?'ps':null;
  if(/표\s*(?:로|를|형태|형식)|(?:^|[\s,.，])표(?:[\s,.，]|$)/.test(text)) kind='tb';
  else if(/방사형|레이더|삼각형\s*그래프|거미줄/.test(text)) kind='rd';
  else if(lv) kind='line';
  else if(/산점도|분포도|가로\s*축|세로\s*축|[xXyY]\s*축/.test(text)) kind='sc';
  else if(/꺾은선|선\s*그래프|월별|월\s*평균|연중\s*변화|1\s*~\s*12\s*월/.test(text)&&!monthSpecific) kind='line';
  else if(/기후\s*그래프|우온도|클라이모|기후도/.test(text)) kind='climo';
  else if(/막대|점\s*그래프|점으로/.test(text)||keys.length) kind='cat';
  else kind='climo';
  if(kind==='sc'&&keys.length<2) res.notes.push('산점도에는 지표가 두 개 필요해요. 예: “가로축 7월 강수량, 세로축 1월 기온”.');
  /* 값 모드 */
  let mode='value';
  if(ref) mode='ref'; else if(/평균\s*(?:값)?\s*(?:과|와)?의?\s*차이|평균\s*대비|평균을\s*뺀|합\s*÷|차이/.test(text)) mode='mean';
  /* 라벨 순서 */
  let seq=null;
  if(/\(가\)|가\s*~\s*[나-하]\b|\(가\)\s*~/.test(text)) seq='gana';
  else if(/(?:^|[^A-Za-z])A\s*~\s*[B-Z](?![A-Za-z])|A\s*,\s*B\s*,/.test(text)) seq='latin';
  else if(/㉠(?!\s*,?\s*㉡?\s*시기)|ㄱ\s*~\s*ㄹ/.test(text)) seq='circ';
  else if(/지명|이름\s*(?:으로|그대로)|도시\s*이름/.test(text)) seq='name';
  if(!seq) seq=kind==='cat'||kind==='sc'?'latin':'gana';
  const hide=/숨기|숨김|숨겨|가려|가리고|모르게|시기로|\(가\)\s*시기|㉠\s*시기|[AB]\s*시기/.test(text);
  const aliasSeq=/㉠\s*시기|㉠,\s*㉡/.test(text)?['㉠','㉡','㉢']:/[AB]\s*시기/.test(text)?['A','B','C']:['(가)','(나)','(다)'];
  if(kind==='climo'&&!ref&&mode==='mean'&&!/평균/.test(text)) mode='value';
  const spec={kind,seq,mode,stations:[],ref:null,metrics:keys.slice(0,3),hide,aliasSeq,
    months:/1\s*월\s*(?:과|와|,|·|및|\/)?\s*7\s*월/.test(text)?'17':'all',
    v:lv||(/강수|강우/.test(text)&&!/기온/.test(text)?'p':'t'),
    start:(m=>m?(+m[1]-1)%12:0)(/(\d{1,2})\s*월\s*부터/.exec(text)),
    brk:/물결|생략|≈|축\s*(?:을\s*)?끊/.test(text),
    lmark:/꺾은선|선\s*그래프/.test(text)?'line':(/막대/.test(text)&&/한\s*(?:그래프|칸)에|묶어|나란히|함께/.test(text)?'bar':null),
    rows:/지역(?:이|을)?\s*(?:가로|행)|지역별\s*행/.test(text)?'st':(/지표(?:가|를)?\s*행|지역(?:이|을)?\s*(?:세로|열)/.test(text)?'m':null),
    layout:/한\s*(?:그래프|칸)에|묶어|같은\s*그래프|함께\s*그려|하나로|이중\s*축|막대와\s*점|점과\s*막대/.test(text)?'group':(/따로|각각/.test(text)?'panels':null),
    style:(/십자|사분면/.test(text)&&/격자|모눈|점선/.test(text))||/점선\s*격자|격자\s*점선|모눈/.test(text)&&!/상자|네모/.test(text)?'crossgrid':/격자|상자|네모/.test(text)?'box':(/십자|사분면/.test(text)?'cross':null),
    values:/값\s*(?:을|도)?\s*(?:표시|적|써|넣)|수치/.test(text),
    cols:(m=>m?+m[1]:null)(/한\s*줄에\s*(\d)/.exec(text)),
    lineLbl:/선\s*끝|끝에\s*(?:기호|라벨)|범례\s*없이/.test(text)?'right':/범례/.test(text)?'legend':null,refLbl};
  for(const h of hits){ if(h===ref) continue; spec.stations.push({name:h.c.data.name,lbl:lbls[h.i]||null}); }
  if(ref) spec.ref=ref.c.data.name;
  /* 산점도 축 순서: ‘가로축/x축’ 뒤에 온 지표가 가로축 */
  if(kind==='sc'&&keys.length>=2){
    const xm=/(?:가로\s*축|[xX]\s*축)\s*(?:은|는|:|에|을|를|으로|로)?\s*/.exec(text);
    if(xm){ const after=text.slice(xm.index); const fm=findMetrics(after).keys; if(fm.length) spec.xKey=fm[0]; }
    const ym=/(?:세로\s*축|[yY]\s*축)\s*(?:은|는|:|에|을|를|으로|로)?\s*/.exec(text);
    if(ym){ const after=text.slice(ym.index); const fm=findMetrics(after).keys; if(fm.length) spec.yKey=fm[0]; }
  }
  /* 모르는 지명 */
  const masked=[...text].map((ch,i)=>taken[i]?' ':ch).join('').replace(/\(?[가-하]\)?\s*~\s*\(?[가-하]\)?/g,' ').replace(/\([가-하]\)|[㉠-㉭]/g,' ');
  for(const seg of masked.split(/[,，、\/·]|\s(?:과|와|및|그리고)\s/)){
    const words=seg.trim().split(/\s+/).map(w=>w.replace(/[()（）"'“”‘’.?!~:]/g,'')).map(w=>STOP.has(w)?'':(/^[가-힣]{2,}[로이가도]$/.test(w)&&!/(으로|에서)$/.test(w)?w:w.replace(PARTICLE,''))).filter(w=>/^[가-힣]{2,10}$/.test(w)&&!STOP.has(w)&&![...STOP].some(sw=>sw.length>=2&&(w.startsWith(sw)||w.endsWith(sw))));
    for(const w of words) if(!res.unknown.includes(w)) res.unknown.push(w);
  }
  if(!/그래프|꺾은선|막대|산점도|분포도|기온|강수|강우|기후|,|，|、/.test(text)) res.unknown=[];
  res.spec=spec; res.understood=spec.stations.length>0;
  return res;
}
const SEQ_OF=l=>/^[A-Z]$/.test(l)?'latin':/^\([가-하]\)$/.test(l)?'gana':/^[㉠-㉭]$/.test(l)?'circ':null;
function specToDoc(spec,cur){
  const base=cur||freshDoc();
  const d=freshDoc(spec.kind||'climo');
  d.style=Object.assign({},base.style); d.notes=Object.assign({},base.notes);
  d.seq=SEQS[spec.seq]?spec.seq:'gana';
  const cands=candidatesOf(base.stations);
  const pick=name=>{ const n=nrm(name); const c=cands.find(c=>c.names.some(x=>nrm(x)===n)); return c?c.data:null; };
  const missing=[];
  for(const s of spec.stations||[]){ const data=pick(s.name); if(!data){ missing.push(s.name); continue; } const st=addStation(d,stationData(data)); if(s.lbl) st.lbl=s.lbl; }
  if(spec.ref){ const data=pick(spec.ref); if(data){ const r=addStation(d,stationData(data)); r.ref=true; r.lbl=''; r.refLbl=String(spec.refLbl||'').slice(0,8); } else missing.push(spec.ref); }
  const explicit=(spec.stations||[]).some(s=>s.lbl);
  if(explicit){ d.autoLbl=false; const sq=SEQ_OF((spec.stations.find(s=>s.lbl)||{}).lbl); if(sq) d.seq=sq;
    const used=new Set(plotted(d).map(s=>s.lbl).filter(Boolean)); const seq=SEQS[d.seq]||SEQS.gana; let k=0;
    for(const s of plotted(d)) if(!(spec.stations.find(x=>x.name===s.name)||{}).lbl){ while(used.has(seq[k])) k++; s.lbl=seq[k]||''; used.add(s.lbl); } }
  else relabel(d);
  const n=plotted(d).length; const mode=spec.mode==='ref'&&!refStation(d)?'value':(spec.mode||'value');
  const keys=(spec.metrics||[]).filter(k=>METRICS[k]);
  const aliases=spec.hide?shuffle((spec.aliasSeq||['(가)','(나)','(다)']).slice(0,keys.length)).map(a=>a+' 시기'):[];
  const alias=(k,j)=>spec.hide&&(METRICS[k].month||SEASON_NAME[k])?aliases[j]||'':'';
  if(d.kind==='climo'){ d.climo.months=spec.months==='17'?'17':'all'; d.climo.cols=spec.cols||(n<=3?Math.max(1,n):n===4?2:3); if(d.climo.months==='17'){ d.climo.ph=22; d.climo.pw=20; }
    if(mode!=='value'){ d.climo.mode=mode; d.climo.pw=60; d.climo.ph=34; d.climo.words=true; d.climo.cols=spec.cols||1; d.climo.months='all'; } }
  if(d.kind==='line'){ d.line.v=LINE_V[spec.v]?spec.v:'t'; d.line.mode=mode; d.line.start=spec.start||0; const pv=['pc','pr','ps'].includes(d.line.v); d.line.titleOn=pv;
    d.line.mark=spec.lmark||(pv?'panel':'line');
    if(d.line.mark==='line'&&n>1) d.line.lbl=spec.lineLbl||(mode!=='value'?'right':d.line.lbl);   // 차이 꺾은선은 시험지처럼 선 끝에 기호
    if(d.line.mark==='panel'){ d.line.pw=30; d.line.ph=32; d.line.cols=Math.min(Math.max(n,1),3); } else if(d.line.mark==='bar'){ d.line.pw=Math.max(60,n*24); d.line.ph=40; } }
  if(d.kind==='tb'){ const ks=keys.length?keys:['tR','tMin','p1']; d.tb.mode=mode; d.tb.metrics=ks.slice(0,5).map((k,j)=>({m:k,alias:alias(k,j),title:''})); if(spec.hide) d.tb.metrics.sort((a,b)=>(a.alias||'').localeCompare(b.alias||'','ko')); d.tb.rows=spec.rows||(n>=4&&ks.length>2?'m':'st'); }
  if(d.kind==='rd'){ const ks=keys.length>=3?keys:['pJJA','pDJF','tY']; d.rd.metrics=ks.slice(0,6).map(k=>({m:k,alias:'',title:''})); }
  if(d.kind==='cat'){
    const ks=keys.length?keys:['p1','p7'];
    const units=new Set(ks.map(k=>METRICS[k].unit));
    d.cat.mode=mode; d.cat.values=!!spec.values;
    d.cat.layout=spec.layout||(ks.length>1&&units.size===1&&mode!=='value'?'group':'panels');
    const fills=d.cat.layout==='group'?['light','dark','white']:['mid','mid','mid'];
    let td=0; d.cat.series=ks.map((k,j)=>{ const isT=METRICS[k].unit==='t'&&units.size>1; const mk=isT?(td++?'odot':'dot'):'bar'; return {m:k,alias:alias(k,j),fill:units.size>1&&d.cat.layout==='group'?'light':fills[j],mark:mk,title:''}; });
    d.cat.brk=!!spec.brk&&mode==='value';
    if(d.cat.layout==='group'){ d.cat.pw=Math.max(30,n*13); d.cat.ph=40; d.cat.sep=true; } else { d.cat.pw=Math.max(22,n*7.5); }
    if(d.cat.layout==='group'&&units.size>1){ d.cat.legend='bottom'; d.cat.pw=Math.max(34,n*9); d.cat.ph=38; d.cat.sep=false; }
    if(spec.hide) d.cat.series.sort((a,b)=>(a.alias||'').localeCompare(b.alias||'','ko'));
  }
  if(d.kind==='sc'){
    const ks=keys.length>=2?keys:(keys.length===1?[keys[0],keys[0]==='p7'?'t1':'p7']:['p7','t1']);
    let xk=spec.xKey&&ks.includes(spec.xKey)?spec.xKey:null, yk=spec.yKey&&ks.includes(spec.yKey)?spec.yKey:null;
    if(!xk&&!yk){ const tk=ks.find(k=>METRICS[k].unit==='t'), pk=ks.find(k=>METRICS[k].unit!=='t'); if(tk&&pk){ xk=pk; yk=tk; } else { xk=ks[0]; yk=ks[1]; } }
    else if(!xk) xk=ks.find(k=>k!==yk); else if(!yk) yk=ks.find(k=>k!==xk);
    d.sc.x={m:xk,alias:alias(xk,ks.indexOf(xk)),mode,title:''}; d.sc.y={m:yk,alias:alias(yk,ks.indexOf(yk)),mode,title:''};
    d.sc.style=spec.style||(mode==='value'?'box':'cross');
  }
  return {doc:d,missing};
}
/* Claude에게 맡길 때 쓰는 지시문 */
function buildPrompt(q,docStations){
  const names=[...new Set([...(docStations||[]).map(s=>s.name),...STN.map(s=>s.name)])];
  const metrics=Object.values(METRICS).map(m=>`${m.key}=${m.name}`).join(', ');
  return `너는 한국 고등학교 세계지리·한국지리 시험지의 기후 그래프를 설계하는 도우미다. 교사의 요청을 아래 JSON 한 개로만 바꿔라. 설명이나 코드 블록 없이 JSON만 출력한다.
{"kind":"climo|line|cat|sc","stations":[{"name":"지점 이름","lbl":null}],"ref":null,"seq":"gana|latin|circ|name","mode":"value|mean|ref","metrics":["지표 키"],"hide":false,"months":"all|17","v":"t|p","layout":"panels|group|null","refLbl":"","lineLbl":"legend|right|null","style":"cross|crossgrid|box|null","values":false,"xKey":null,"yKey":null,"start":0,"brk":false,"rows":null}
- kind: climo=기온 꺾은선과 강수 막대를 함께 그린 기후 그래프(mode가 mean/ref면 월별 기온·강수량 차이 그래프), line=여러 지점의 월별 꺾은선, cat=지점별 막대·점(단위가 다른 두 지표를 layout group으로 두면 왼쪽 기온·오른쪽 강수량 이중축), sc=두 지표의 산점도, rd=방사형(삼각형) 상댓값 그래프(지표 3개 이상), tb=표.
- line의 v: t=월평균 기온, p=월 강수량, pc=누적 강수량, pr=누적 강수 비율(%), ps=월 강수 비율(%). start는 누적을 시작하는 달(0=1월). brk=true면 세로축 아래를 물결선(≈)으로 생략. tb의 rows: st=지역이 행, m=지표가 행.
- stations의 name은 반드시 다음 목록에 있는 이름을 그대로 쓴다: ${names.join(', ')}. 목록에 없는 곳은 넣지 말고 "missing":["이름"]에 적는다.
- ref는 ‘서울과의 차이’처럼 기준이 되는 지점 이름(그래프에는 안 그림). mode가 ref일 때만 쓴다. mean은 ‘네 지역 평균과의 차이’.
- refLbl은 기준 지점을 ‘(가)’처럼 기호로 가리킬 때 그 기호(주석에 이름 대신 씀). lineLbl: legend=범례 상자, right=선 끝에 기호(차이 꺾은선 기본).
- metrics 키: ${metrics}. 산점도는 xKey(가로축)와 yKey(세로축)를 정한다. 산점도 style: cross=원점에서 만나는 십자 축, crossgrid=십자 축 + 점선 격자(단위는 축 끝에 따로), box=테두리 상자 + 점선 격자.
- hide=true면 ‘(가) 시기’처럼 달 이름을 숨긴다. lbl은 요청에 지점별 라벨이 직접 적혀 있을 때만 쓴다.
요청: ${q}`;
}

/* ───────── 눈금 ───────── */
function niceStep(span,target){
  if(!(span>0)) return 1; const raw=span/target, p=10**Math.floor(Math.log10(raw));
  for(const m of [1,2,5,10]) if(m*p>=raw*0.999) return m*p; return 10*p;
}
function autoAxis(vals,o){
  o=o||{}; const v=vals.filter(fin);
  let lo=v.length?Math.min(...v):0, hi=v.length?Math.max(...v):1;
  if(o.zero){ lo=Math.min(lo,0); hi=Math.max(hi,0); }
  if(o.sym){ const m=Math.max(Math.abs(lo),Math.abs(hi)); lo=-m; hi=m; }
  if(hi-lo<1e-9){ hi=lo+1; }
  const step=o.step||niceStep(hi-lo,o.target||5);
  let L=Math.floor(lo/step+1e-9)*step, H=Math.ceil(hi/step-1e-9)*step;
  if(o.head&&v.length&&H-Math.max(...v)<step*0.18&&H!==0) H+=step;
  if(o.foot&&v.length&&Math.min(...v)-L<step*0.18&&L!==0) L-=step;
  if(o.sym){ const m=Math.max(-L,H); L=-m; H=m; }
  if(H<=L) H=L+step;
  return {lo:L,hi:H,step};
}
function axisOf(conf,vals,o){
  if(conf&&!conf.auto&&fin(+conf.lo)&&fin(+conf.hi)&&+conf.hi>+conf.lo&&+conf.step>0) return {lo:+conf.lo,hi:+conf.hi,step:+conf.step};
  return autoAxis(vals,o);
}
function ticksOf(a){ const out=[]; const n=Math.round((a.hi-a.lo)/a.step); if(!(n>=0)||n>200) return [a.lo,a.hi]; for(let i=0;i<=n;i++){ out.push(Math.round((a.lo+i*a.step)*1e6)/1e6); } return out; }

/* ───────── 글자 측정 ───────── */
const ROLE={tick:['serif','tickPt'],cat:['serif','catPt'],unit:['serif','unitPt'],value:['serif','valuePt'],title:['gothic','titlePt'],legend:['gothic','legendPt'],note:['gothic','notePt'],axis:['gothic','legendPt'],label:['serif','catPt'],ptitle:['serif','catPt'],th:['gothic','tablePt'],td:['serif','tablePt']};
function fontOf(doc,role,scale){ const r=ROLE[role]||ROLE.tick; const pt=doc.style[r[1]]*(scale||1); return `${(pt*MMPT).toFixed(4)}px ${fontStack(doc,r[0])}`; }
const mCache=new Map();
function metrics(font,text){
  const key=font+'\u0001'+text; const hit=mCache.get(key); if(hit) return hit;
  const mm=/([\d.]+)px/.exec(font); const size=mm?+mm[1]:3;
  probe.font=font.replace(/([\d.]+)px/,'100px'); const m=probe.measureText(text);
  const k=size/100, A=(m.actualBoundingBoxAscent||size*0.75)*k, D=(m.actualBoundingBoxDescent||0)*k;
  const r={W:m.width*k,A,D,H:A+D}; if(mCache.size>4000) mCache.clear(); mCache.set(key,r); return r;
}

/* ───────── 그리기 목록 ───────── */
/* 모든 그래프는 mm 좌표의 그리기 목록(ops)으로 만든 뒤, 화면·PNG·SVG에 똑같이 그린다 */
function Ops(doc){ this.doc=doc; this.list=[]; }
Ops.prototype={
  line(pts,w,o){ o=o||{}; this.list.push({t:'line',pts,w,c:o.c||'#000000',dash:o.dash||null,cap:o.cap||'butt',join:o.join||'miter',closed:!!o.closed}); },
  seg(x0,y0,x1,y1,w,o){ this.line([[x0,y0],[x1,y1]],w,o); },
  rect(x,y,w,h,o){ o=o||{}; if(h<0){ y+=h; h=-h; } this.list.push({t:'rect',x,y,w,h,fill:o.fill||null,pat:o.pat||(o.hatch?'fs':null),ps:o.ps||1,stroke:o.stroke||null,sw:o.sw||0.12}); },
  poly(pts,fill,o){ o=o||{}; this.list.push({t:'poly',pts,fill:fill||null,pat:o.pat||null,ps:o.ps||1,stroke:o.stroke||null,sw:o.sw||0.12}); },
  region(rects,fill,o){ o=o||{}; if(!rects.length) return; this.list.push({t:'region',rects,fill:fill||null,pat:o.pat||null,ps:o.ps||1}); },
  mark(x,y,shape,size,o){ if(shape==='none') return; o=o||{}; this.list.push({t:'mark',x,y,shape,size,sw:o.sw||0.15,g:o.g||'#8c8c8c'}); },
  text(s,x,y,role,o){ o=o||{}; if(s==null||s==='') return null; const font=(o.bold?'bold ':'')+fontOf(this.doc,role,o.scale); const m=metrics(font,String(s));
    const align=o.align||'left'; const bx=align==='center'?x-m.W/2:align==='right'?x-m.W:x;
    const it={t:'text',s:String(s),x,y,font,align,box:{x:bx,y:y-m.A,w:m.W,h:m.H},m}; if(o.halo) it.halo=o.halo; if(o.c) it.c=o.c;
    if(o.rot){ /* (x, y)를 축으로 돌린 글자: 상자는 돌린 네 모서리를 감싸는 사각형 */ it.rot=o.rot; const c=Math.cos(o.rot), sn=Math.sin(o.rot); const x0=bx-x, x1=bx-x+m.W, y0=-m.A, y1=m.D;
      const P=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]].map(([a,b])=>[x+a*c-b*sn,y+a*sn+b*c]); const xs=P.map(p=>p[0]), ys=P.map(p=>p[1]);
      it.box={x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}; }
    this.list.push(it); return it; },
  /* 세로 가운데를 y에 맞춘 글자(숫자 눈금용) */
  textMid(s,x,y,role,o){ const font=fontOf(this.doc,role,o&&o.scale); const ref=metrics(font,'0'); return this.text(s,x,y+(ref.A-ref.D)/2,role,o); },
  /* 한 글자씩 세로로 쌓는 글자(시험지 세로 축 제목) */
  vtext(s,x,yc,role){ const chars=[...String(s)].filter(c=>c!==' '); const font=fontOf(this.doc,role); const lh=metrics(font,'가').H*1.18; const n=chars.length; const y0=yc-(n*lh)/2;
    chars.forEach((c,i)=>{ const m=metrics(font,c); this.text(c,x,y0+i*lh+lh/2+(m.A-m.D)/2,role,{align:'center'}); }); return {w:metrics(font,'가').W,h:n*lh}; },
  bounds(){ let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    const add=(a,b,c,d)=>{ if(!fin(a)||!fin(b)) return; x0=Math.min(x0,a); y0=Math.min(y0,b); x1=Math.max(x1,c); y1=Math.max(y1,d); };
    for(const o of this.list){
      if(o.t==='line'){ const h=o.w/2; for(const p of o.pts) add(p[0]-h,p[1]-h,p[0]+h,p[1]+h); }
      else if(o.t==='poly'){ for(const p of o.pts) add(p[0],p[1],p[0],p[1]); }
      else if(o.t==='region'){ for(const r of o.rects) add(r[0],r[1],r[0]+r[2],r[1]+r[3]); }
      else if(o.t==='rect'){ const h=o.stroke?o.sw/2:0; add(o.x-h,o.y-h,o.x+o.w+h,o.y+o.h+h); }
      else if(o.t==='mark'){ const r=o.size/2+o.sw; add(o.x-r,o.y-r,o.x+r,o.y+r); }
      else if(o.t==='text'){ add(o.box.x,o.box.y,o.box.x+o.box.w,o.box.y+o.box.h); }
    }
    if(!fin(x0)) return {x:0,y:0,w:0,h:0}; return {x:x0,y:y0,w:x1-x0,h:y1-y0}; },
  shift(dx,dy){ for(const o of this.list){ if(o.t==='line'||o.t==='poly') o.pts=o.pts.map(p=>[p[0]+dx,p[1]+dy]); else if(o.t==='region') o.rects=o.rects.map(r=>[r[0]+dx,r[1]+dy,r[2],r[3]]); else if(o.t==='text'){ o.x+=dx; o.y+=dy; o.box.x+=dx; o.box.y+=dy; } else { o.x+=dx; o.y+=dy; } } },
  absorb(other,dx,dy){ other.shift(dx,dy); this.list.push(...other.list); }
};
const GRID_DASH=[0.6,0.28], LINE_DASH=[1.1,0.55], ZERO_DASH=[0.7,0.4];
function fillColor(doc,f){ const s=doc.style; return f==='white'||f==='hatch'||PATS[f]?'#ffffff':f==='light'?gray(s.light):f==='dark'?gray(s.dark):f==='black'?'#1a1a1a':gray(s.mid); }
function patOf(f){ return f==='hatch'?'fs':PATS[f]?f:null; }
function W(doc,v){ return v*doc.style.lw; }

/* 공통 세로축: 눈금 + 숫자. side 'left'|'right', tick 'out'|'in'|'none'. 숫자 칸 가장 바깥 x를 돌려준다 */
function yAxis(ops,doc,ax,o){
  const {x,h,side,tick}=o; const tl=0.8; const dec=decOf(ax.step); let outer=x; let maxW=0;
  const yf=o.yf||(v=>h-(v-ax.lo)/(ax.hi-ax.lo)*h);
  for(const v of ticksOf(ax).concat(o.extra||[])){
    const y=yf(v);
    if(tick==='out') ops.seg(side==='left'?x-tl:x,y,side==='left'?x:x+tl,y,W(doc,0.15));
    if(tick==='in') ops.seg(side==='left'?x:x-tl,y,side==='left'?x+tl:x,y,W(doc,0.15));
    if(o.cross) ops.seg(x-tl*0.75,y,x+tl*0.75,y,W(doc,0.15));
    if(o.skip&&o.skip(v)) continue;
    const gap=(tick==='out'?tl:0)+0.7; const s=(o.plus&&v>1e-9?'+':'')+fmt(v,dec);
    const it=ops.textMid(s,side==='left'?x-gap:x+gap,y,'tick',{align:side==='left'?'right':'left'});
    if(it){ maxW=Math.max(maxW,it.m.W); outer=side==='left'?Math.min(outer,it.box.x):Math.max(outer,it.box.x+it.box.w); }
  }
  return {outer,maxW,gap:(tick==='out'?tl:0)+0.7};
}
const yOf=(ax,h)=>v=>h-(v-ax.lo)/(ax.hi-ax.lo)*h;
function digitTop(doc){ return metrics(fontOf(doc,'tick'),'0').H/2; }

/* 캣멀-롬 곡선을 꺾은선으로 */
function spline(pts,n){
  n=n||10; if(pts.length<3) return pts; const out=[pts[0]];
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    for(let k=1;k<=n;k++){ const t=k/n,t2=t*t,t3=t2*t;
      out.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
                0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]); }
  }
  return out;
}

const LAST={};
/* ───────── ① 기후 그래프 (기온 + 강수량, 지점마다 한 칸) ───────── */
function climoVals(doc,s){ const o=doc.climo; if(o.mode==='value') return {t:s.t,p:s.p}; return {t:monthlyOf(doc,s,'t',o.mode,0),p:monthlyOf(doc,s,'p',o.mode,0)}; }
function climoAxes(doc){
  const o=doc.climo, S=plotted(doc); const idx=o.months==='all'?MON:[0,6];
  const VV=S.map(s=>climoVals(doc,s));
  const tv=VV.flatMap(v=>idx.map(i=>v.t[i])), pv=VV.flatMap(v=>idx.map(i=>v.p[i]));
  if(o.mode!=='value'){
    let ta=axisOf(o.t,tv,{zero:true,target:6}), pa=axisOf(o.p,pv,{zero:true,target:6});
    const aT=o.t.auto!==false, aP=o.p.auto!==false;
    if(aT||aP){ /* 두 축의 0을 같은 높이에 맞춘다 */
      const up=Math.max(Math.round(ta.hi/ta.step),Math.round(pa.hi/pa.step)), dn=Math.max(Math.round(-ta.lo/ta.step),Math.round(-pa.lo/pa.step));
      if(aT) ta={lo:-dn*ta.step,hi:up*ta.step,step:ta.step}; if(aP) pa={lo:-dn*pa.step,hi:up*pa.step,step:pa.step}; }
    LAST.t=ta; LAST.p=pa; return {ta,pa};
  }
  const ta=axisOf(o.t,tv,{zero:true,target:4}); const pa=axisOf(o.p,pv.concat([0,100]),{zero:true,target:4}); /* 아주 건조한 지점이 습해 보이지 않도록 강수량 축은 최소 100 mm */
  LAST.t=ta; LAST.p={lo:0,hi:pa.hi,step:pa.step}; return {ta,pa:LAST.p};
}
function climoPanel(doc,s,ta,pa,many){
  const o=doc.climo, ops=new Ops(doc); const w=o.pw,h=o.ph; const all=o.months==='all'; const idx=all?MON:[0,6];
  const diff=o.mode!=='value'; const vals=climoVals(doc,s);
  const xs=all?idx.map((_,k)=>(k+0.5)*w/12):[w*0.27,w*0.73];
  const yT=yOf(ta,h), yP=yOf(pa,h);
  const bw=all?w/12*(diff?0.6:0.62):w*0.2;
  const pBase=diff?clamp(0,pa.lo,pa.hi):pa.lo;
  idx.forEach((i,k)=>{ const v=vals.p[i]; if(!fin(v)) return; const y=yP(clamp(v,pa.lo,pa.hi)), yb=yP(pBase);
    if(Math.abs(yb-y)>0.02) ops.rect(xs[k]-bw/2,Math.min(y,yb),bw,Math.abs(yb-y),{fill:fillColor(doc,diff?'light':all?'dark':'mid'),stroke:'#000000',sw:W(doc,all&&!diff?0.08:0.12)}); });
  if(diff&&pa.lo<0&&pa.hi>0) ops.seg(0,yP(0),w,yP(0),W(doc,0.12));
  if(all&&o.temp==='line'){
    let pts=idx.map((i,k)=>[xs[k],yT(vals.t[i])]).filter(p=>fin(p[1]));
    if(o.smooth&&!diff) pts=spline(pts,10);
    ops.line(pts,W(doc,diff?0.24:0.4),{join:'round',cap:'round'});
    if(diff) idx.forEach((i,k)=>{ const v=vals.t[i]; if(fin(v)) drawMark(ops,doc,xs[k],yT(v),'fs',1.15); });
  } else {
    idx.forEach((i,k)=>{ const v=vals.t[i]; if(fin(v)) ops.mark(xs[k],yT(v),diff?'fs':all?'fc':'oc',all?1.0:1.45,{sw:W(doc,0.15)}); });
  }
  if(diff) ops.rect(0,0,w,h,{stroke:'#000000',sw:W(doc,0.15)});
  else { ops.seg(0,0,0,h,W(doc,0.15)); ops.seg(w,0,w,h,W(doc,0.15)); ops.seg(-W(doc,0.075),h,w+W(doc,0.075),h,W(doc,0.15)); }
  const L=yAxis(ops,doc,ta,{x:0,h,side:'left',tick:diff?'none':'out'});
  const R=yAxis(ops,doc,pa,{x:w,h,side:'right',tick:diff?'none':'out'});
  const dm=metrics(fontOf(doc,'tick'),'0');
  const xl=all?(o.xall!==false||(diff&&w>=34)?MON.map(i=>[i,String(i+1)]):[[0,'1'],[5,'6'],[11,'12']]):[[0,'1'],[1,'7']];
  /* 12달을 모두 적을 때 칸이 좁으면 숫자를 조금 줄여 겹치지 않게 한다 */
  const cs=xl.length===12?clamp((w/12-0.25)/metrics(fontOf(doc,'tick'),'12').W,0.6,1):1;
  const xb=h+1.3+dm.A*cs; let last=null; for(const [k,lab] of xl){ last=ops.text(lab,xs[k],xb,'tick',{align:'center',scale:cs}); }
  if(last) ops.text('(월)',last.box.x+last.box.w+0.3,xb,'unit',{scale:0.8});
  const top=-digitTop(doc)-0.9;
  const uL=ops.text(`(${doc.style.deg})`,(L.outer+0)/2,top,'unit',{align:'center'});
  ops.text('(mm)',(R.outer+w)/2,top,'unit',{align:'center'});
  let titleY=top+0.15;
  if(o.words&&diff){ ops.vtext('기온 차이',L.outer-2.2,h/2,'axis'); ops.vtext('강수량 차이',R.outer+2.2,h/2,'axis'); }
  else if(o.words){ const wy=top-(uL?uL.m.H:2.5)-0.6; ops.text('온도',(L.outer+0)/2,wy,'axis',{align:'center',scale:0.9}); ops.text('강수량',(R.outer+w)/2,wy,'axis',{align:'center',scale:0.9}); titleY=wy-metrics(fontOf(doc,'axis'),'가').H-1.2; }
  if(diff){ const lg=legendOps(doc,[{text:'기온',line:{w:W(doc,0.24),mk:o.temp==='line'&&all?'fs':'none'}},{text:'강수량',fill:'light'}].map((it,k)=>k===0&&!(o.temp==='line'&&all)?{text:'기온',mark:'fs'}:it),'boxed'); const lb=lg.bounds(); ops.absorb(lg,w-1.4-lb.w-lb.x,h-1.4-lb.h-lb.y); }
  if(s.lbl&&(!diff||many)) ops.text(s.lbl,w/2,titleY,'ptitle',{align:'center'});
  return {ops,plot:{x:0,y:0,w,h}};
}
function arrange(doc,panels,cols,gx,gy){
  const out=new Ops(doc); cols=Math.max(1,cols|0); let rowTop=0; const plots=[];
  for(let r=0;r*cols<panels.length;r++){
    const row=panels.slice(r*cols,r*cols+cols); const bs=row.map(p=>p.ops.bounds());
    const yOff=r===0?0:rowTop-Math.min(...bs.map(b=>b.y));
    let right=null; let bottom=-Infinity;
    row.forEach((p,j)=>{ const b=bs[j]; const dx=right==null?0:right+gx-b.x; out.absorb(p.ops,dx,yOff); plots.push({x:p.plot.x+dx,y:p.plot.y+yOff,w:p.plot.w,h:p.plot.h}); right=b.x+dx+b.w; bottom=Math.max(bottom,b.y+yOff+b.h); });
    rowTop=bottom+gy;
  }
  return {ops:out,plots};
}
function composeClimo(doc){
  const S=plotted(doc); if(!S.length) return null;
  const {ta,pa}=climoAxes(doc);
  const panels=S.map(s=>climoPanel(doc,s,ta,pa,S.length>1));
  return arrange(doc,panels,doc.climo.cols,4.5,4);
}

/* ───────── ② 월별 꺾은선 (지점 여러 개) ───────── */
function lineStyle(doc,s,i){ const k=doc.line.sty[s.id]; const base=LINE_STY[i%LINE_STY.length]; return Object.assign({},base,k||{}); }
function drawMark(ops,doc,x,y,mk,size){ ops.mark(x,y,mk,size,{sw:W(doc,0.15),g:gray(doc.style.mid-40)}); }
const BAR_FILLS=['white','dark','light','hatch','black','mid'];
function lineAxis(doc,series){
  const o=doc.line; const diff=o.mode!=='value';
  const ya=(o.v==='pr'&&!diff&&o.y.auto!==false)?{lo:0,hi:100,step:20}:axisOf(o.y,series.flat(),{zero:diff||o.v!=='t',target:6,sym:false}); LAST.y=ya; return ya;
}
/* 월별 값을 막대로: 'bar'는 한 그래프에 지점별 막대를 나란히, 'panel'은 지점마다 한 칸 */
function lineBarPanel(doc,S,series,ya,o2){
  const o=doc.line, ops=new Ops(doc); const w=o.pw,h=o.ph; const V=LINE_V[o.v]||LINE_V.t; const diff=o.mode!=='value'; const cum=o.v==='pc'||o.v==='pr';
  const ord=monthOrder(cum?o.start:0); const slot=w/12; const y=yOf(ya,h); const base=clamp(0,ya.lo,ya.hi);
  const zeroIn=ya.lo<0&&ya.hi>0;
  for(const v of ticksOf(ya)){ if(v<=ya.lo+1e-9||v>=ya.hi-1e-9) continue; if(zeroIn&&Math.abs(v)<1e-9) continue; if(o2.grid) ops.seg(0,y(v),w,y(v),W(doc,0.1),{dash:GRID_DASH}); }
  const k=series.length; const bw=k===1?slot*0.62:Math.min(slot*0.84/k,slot*0.3);
  series.forEach((vals,j)=>{ const f=o2.fills?o2.fills[j]:'mid';
    ord.forEach((m,pos)=>{ const v=vals[m]; if(!fin(v)) return; const cx=(pos+0.5)*slot-((k-1)/2-j)*bw; const yv=y(clamp(v,ya.lo,ya.hi)), yb=y(base);
      if(Math.abs(yb-yv)>0.01) ops.rect(cx-bw/2,Math.min(yv,yb),bw,Math.abs(yb-yv),{fill:fillColor(doc,f),hatch:f==='hatch',stroke:'#000000',sw:W(doc,0.1)}); }); });
  if(zeroIn) ops.seg(0,y(0),w,y(0),W(doc,0.15));
  ops.rect(0,0,w,h,{stroke:'#000000',sw:W(doc,0.15)});
  const LA=yAxis(ops,doc,ya,{x:0,h,side:'left',tick:'in'});
  const dm=metrics(fontOf(doc,'tick'),'0'); let last=null; const every=o.xall!==false;
  const cs=every?clamp((slot-0.25)/metrics(fontOf(doc,'tick'),'12').W,0.6,1):1; const xb=h+0.9+dm.A*cs;
  ord.forEach((m,pos)=>{ if(!every&&!(pos===0||pos===5||pos===11)) return; last=ops.text(String(m+1),(pos+0.5)*slot,xb,'tick',{align:'center',scale:cs}); });
  if(last) ops.text('(월)',last.box.x+last.box.w+0.3,xb,'unit',{scale:0.85});
  const uy=-digitTop(doc)-0.9; const u=ops.text(`(${unitText(doc,V.u)})`,LA.outer,uy,'unit',{align:'left'});
  if(o2.title) ops.text(o2.title,w/2,uy-(u?u.m.H:2.6)-1.3,o2.titleRole||'title',{align:'center'});
  return {ops,plot:{x:0,y:0,w,h}};
}
function composeLine(doc){
  const o=doc.line, S=plotted(doc); if(!S.length) return null;
  const mark=o.mark==='auto'?(o.v==='t'?'line':'panel'):(o.mark||'line');
  if(mark!=='line'){
    const V=LINE_V[o.v]||LINE_V.t; const diff=o.mode!=='value';
    const series=S.map(s=>monthlyOf(doc,s,o.v,o.mode,o.start)); const ya=lineAxis(doc,series);
    const title=o.titleOn?(o.title||`〈${V.name}${diff?' 차이':''}〉`):'';
    if(mark==='panel'){
      const panels=S.map((s,i)=>lineBarPanel(doc,[s],[series[i]],ya,{title:s.lbl||s.name,titleRole:'ptitle',grid:true}));
      const r=arrange(doc,panels,o.cols||3,4.5,4);
      if(title){ const b=r.ops.bounds(); const tm=metrics(fontOf(doc,'title'),title); r.ops.text(title,b.x+b.w/2,b.y-1.6-tm.D,'title',{align:'center'}); }
      return r;
    }
    const fills=S.map((s,i)=>BAR_FILLS[i%BAR_FILLS.length]);
    const p=lineBarPanel(doc,S,series,ya,{fills,title,grid:true});
    const lg=legendOps(doc,S.map((s,i)=>({text:s.lbl||s.name,fill:fills[i]})),'row','label'); const lb=lg.bounds(); const pb=p.ops.bounds();
    p.ops.absorb(lg,p.plot.w/2-lb.w/2-lb.x,pb.y+pb.h+2.0-lb.y);
    return {ops:p.ops,plots:[p.plot]};
  }
  const w=o.pw,h=o.ph; const ops=new Ops(doc);
  const V=LINE_V[o.v]||LINE_V.t; const cum=o.v==='pc'||o.v==='pr';
  const series=S.map(s=>monthlyOf(doc,s,o.v,o.mode,o.start));
  const diff=o.mode!=='value';
  const ya=(o.v==='pr'&&!diff&&o.y.auto!==false)?{lo:0,hi:100,step:20}:axisOf(o.y,series.flat(),{zero:diff||o.v!=='t',target:6,sym:false}); LAST.y=ya;
  const ord=monthOrder(cum?o.start:0); const pos=[]; ord.forEach((m,k)=>pos[m]=k);
  const xs=MON.map(i=>(pos[i]+0.5)*w/12); const y=yOf(ya,h);
  if(diff&&ya.lo<0&&ya.hi>0) ops.seg(0,y(0),w,y(0),W(doc,0.12),{dash:ZERO_DASH});
  const ends=[], obs=[];
  const densify=P=>{ for(let i=0;i<P.length;i++){ obs.push(P[i]); if(i){ const [a,b]=[P[i-1],P[i]]; const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/0.4); for(let t=1;t<n;t++) obs.push([a[0]+(b[0]-a[0])*t/n,a[1]+(b[1]-a[1])*t/n]); } } };
  series.forEach((vals,k)=>{
    const st=lineStyle(doc,S[k],k); const c=st.c==='g'?gray(doc.style.dark-16):'#000000'; const lw=W(doc,st.c==='g'?0.32:0.22);
    let pts=ord.map(i=>[xs[i],y(vals[i])]).filter(p=>fin(p[1]));
    if(pts.length>1){ const P=o.smooth?spline(pts,8):pts; ops.line(P,lw,{c,dash:st.dash==='dash'?LINE_DASH:null,join:'round',cap:'butt'}); densify(P); } else densify(pts);
    MON.forEach(i=>{ if(fin(vals[i])) drawMark(ops,doc,xs[i],y(vals[i]),st.mk,1.25); });
    const iE=o.lbl==='left'?ord.find(i=>fin(vals[i])):[...ord].reverse().find(i=>fin(vals[i]));
    if(iE!=null) ends.push({k,lbl:S[k].lbl,x:xs[iE],y:y(vals[iE])});
  });
  ops.rect(0,0,w,h,{stroke:'#000000',sw:W(doc,0.15)});
  yAxis(ops,doc,ya,{x:0,h,side:'left',tick:'in'});
  const dm=metrics(fontOf(doc,'tick'),'0'); let last=null;
  const every=o.xall!==false; const cs=every?clamp((w/12-0.25)/metrics(fontOf(doc,'tick'),'12').W,0.6,1):1;
  ord.forEach((i,pos)=>{ ops.seg(xs[i],h,xs[i],h-0.7,W(doc,0.15)); if(!every&&!(pos===0||pos===5||pos===11)) return; last=ops.text(String(i+1),xs[i],h+0.9+dm.A*cs,'tick',{align:'center',scale:cs}); });
  if(last) ops.text('(월)',last.box.x+last.box.w+0.3,h+0.9+dm.A*cs,'unit',{scale:0.85});
  const L=ops.list.filter(t=>t.t==='text'&&t.box.x<0); const lx=L.length?Math.min(...L.map(t=>t.box.x)):-4;
  ops.text(`(${unitText(doc,V.u)})`,lx,-digitTop(doc)-0.9,'unit',{align:'left'});
  if(o.lbl==='legend'&&S.length>1){
    const items=S.map((s,k)=>{ const st=lineStyle(doc,s,k); const g=st.c==='g'; return {text:s.lbl||s.name,line:{w:W(doc,g?0.32:0.22),c:g?gray(doc.style.dark-16):'#000000',dash:st.dash==='dash'?LINE_DASH:null,mk:st.mk}}; });
    const serif=items.every(it=>/^(?:[A-Z]|\([가-하]\)|[㉠-㉭])$/.test(String(it.text).trim()));
    const pos=o.lgPos||'auto';
    const lg=legendOps(doc,items,pos==='below'?'row':'boxed',serif?'label':'legend'); const lb=lg.bounds(); const pad=1.0;
    const spot={tl:[pad,pad],tr:[w-pad-lb.w,pad],bl:[pad,h-pad-lb.h],br:[w-pad-lb.w,h-pad-lb.h]};
    const hits=k=>{ const [x,y]=spot[k]; return obs.filter(p=>p[0]>x-0.5&&p[0]<x+lb.w+0.5&&p[1]>y-0.5&&p[1]<y+lb.h+0.5).length; };
    let at=null;
    if(spot[pos]) at=spot[pos];
    else if(pos==='auto'&&lb.w<w-2*pad&&lb.h<h-2*pad){ const pref=cum?['tl','br','tr','bl']:['tr','tl','br','bl']; let best=null;
      for(const k of pref){ const n=hits(k); if(n===0){ best=k; break; } if(!best||n<hits(best)) best=k; }
      if(hits(best)===0) at=spot[best]; }
    if(at) ops.absorb(lg,at[0]-lb.x,at[1]-lb.y);
    else if(pos==='below'){ const b=ops.bounds(); ops.absorb(lg,w/2-lb.w/2-lb.x,b.y+b.h+2.0-lb.y); }
    else ops.absorb(lg,w+2.4-lb.x,0-lb.y);
  }
  else if(o.lbl!=='none'&&o.lbl!=='legend'&&ends.length){
    const font=fontOf(doc,'label'); const lh=metrics(font,'(가)').H+0.6;
    const arr=ends.slice().sort((a,b)=>a.y-b.y); arr.forEach(e=>e.ly=e.y);
    for(let it=0;it<30;it++){ for(let i=1;i<arr.length;i++){ const d=arr[i].ly-arr[i-1].ly; if(d<lh){ const p=(lh-d)/2; arr[i].ly+=p; arr[i-1].ly-=p; } } }
    for(const e of arr){
      const ref=metrics(font,e.lbl||'(가)');
      if(o.lbl==='left'){ const tx=-(lx<0?-lx:4)-1.6; ops.seg(e.x-0.9,e.y,tx+0.4,e.ly,W(doc,0.12)); ops.text(e.lbl,tx,e.ly+(ref.A-ref.D)/2,'label',{align:'right'}); }
      else { const tx=w+2.2; ops.seg(e.x+0.9,e.y,tx-0.4,e.ly,W(doc,0.12)); ops.text(e.lbl,tx,e.ly+(ref.A-ref.D)/2,'label',{align:'left'}); }
    }
  }
  const t=o.titleOn?(o.title||`〈${V.name}${diff?' 차이':''}〉`):''; if(t) ops.text(t,w/2,-digitTop(doc)-0.9-metrics(fontOf(doc,'unit'),'(').H-1.6,'title',{align:'center'});
  return {ops,plots:[{x:0,y:0,w,h}]};
}

/* ───────── ③ 지역별 막대·점 ───────── */
const STATION_FILLS=['white','light','hatch','dark','mid','black'];
const LADDER=[1,1.5,2,2.5,3,4,5,6,8];
/* 왼쪽 축과 눈금 칸 수를 맞춘 오른쪽 축 (격자선이 양쪽 숫자에 함께 맞도록) */
function alignAxis(vals,n,kind){
  const v=vals.filter(fin); if(!v.length||!(n>=1)) return autoAxis(v,{zero:true});
  const mn=Math.min(...v), mx=Math.max(...v);
  for(let e=-3;e<=6;e++) for(const m of LADDER){ const st=m*10**e;
    if(kind==='sym'){ if(n%2) break; const hi=n/2*st; if(hi>=Math.max(Math.abs(mn),Math.abs(mx))*1.0001) return {lo:-hi,hi,step:st}; }
    else if(kind==='free'){ const lo=Math.floor(mn/st)*st; const hi=lo+n*st; if(lo>0&&hi>=mx*1.0001) return {lo,hi,step:st}; }
    else { const lo=Math.min(0,Math.floor(mn/st)*st); const hi=lo+n*st; if(hi>=mx*1.0001) return {lo,hi,step:st}; } }
  return autoAxis(v,{zero:kind!=='free',sym:kind==='sym'});
}
function brkMap(a,h,B){ return v=>v>=a.lo?(h-B)-(v-a.lo)/(a.hi-a.lo)*(h-B):h-clamp(v/a.lo,0,1)*B; }
function wave(x0,x1,yc,amp,lam){ const pts=[]; for(let x=x0;x<=x1+1e-9;x+=0.15) pts.push([x,yc+amp*Math.sin((x-x0)/lam*Math.PI*2)]); return pts; }
function catPanel(doc,S,sers,V,axes,o2){
  const o=doc.cat, ops=new Ops(doc); const w=o2.w||o.pw,h=o.ph; const n=S.length; const slot=w/n;
  const AL=axes.L, AR=axes.R||null;
  const brk=!!o.brk&&AL.lo>0&&(!AR||AR.lo>0); const B=brk?5.2:0;
  const yL=brk?brkMap(AL,h,B):yOf(AL,h), yR=AR?(brk?brkMap(AR,h,B):yOf(AR,h)):null;
  const yFor=se=>se.side==='R'&&yR?yR:yL, axFor=se=>se.side==='R'&&AR?AR:AL;
  const zeroIn=!brk&&AL.lo<0&&AL.hi>0; const dashZ=o.zero==='dash';
  if(o.grid!==false) for(const v of ticksOf(AL)){ if(v<=AL.lo+1e-9||v>=AL.hi-1e-9) continue; if(zeroIn&&Math.abs(v)<1e-9) continue; ops.seg(0,yL(v),w,yL(v),W(doc,0.1),{dash:GRID_DASH}); }
  if(o.sep) for(let i=1;i<n;i++) ops.seg(i*slot,0,i*slot,h,W(doc,dashZ?0.1:0.12),dashZ?{dash:GRID_DASH}:undefined);
  const bars=sers.filter(se=>se.mark==='bar'), kb=bars.length;
  const barW=kb<=1?slot*(sers.length>1&&kb===1?0.36:0.42):kb===2?slot*0.27:slot*0.2; const gap=kb>1?slot*0.05:0; const tot=kb*barW+Math.max(0,kb-1)*gap;
  const vlabels=[]; const dots=[];
  S.forEach((s,i)=>{
    const cx=(i+0.5)*slot; let b=0;
    sers.forEach((se,j)=>{
      const v=V[j][i]; if(!fin(v)) return; const a=axFor(se), yf=yFor(se); const vv=Math.min(v,a.hi);
      if(se.mark==='bar'){
        const x=cx-tot/2+b*(barW+gap)+barW/2; b++;
        const f=o.fillBy==='station'&&sers.length===1?STATION_FILLS[i%STATION_FILLS.length]:se.fill;
        const base=brk?0:clamp(0,a.lo,a.hi); const yv=yf(brk?vv:Math.max(vv,a.lo)), yb=yf(base);
        if(Math.abs(yb-yv)>0.01) ops.rect(x-barW/2,Math.min(yv,yb),barW,Math.abs(yb-yv),{fill:fillColor(doc,f),hatch:f==='hatch',stroke:'#000000',sw:W(doc,0.12)});
        if(o.values) vlabels.push({s:fmtVal(v),x,y:yv,neg:v<0});
      } else { dots.push({x:cx,y:yf(Math.max(vv,brk?0:a.lo)),mk:se.mark==='odot'?'oc':'fc'}); if(o.values) vlabels.push({s:fmtVal(v),x:cx+1.1,y:yf(vv)+1.0,neg:false,left:true}); }
    });
  });
  if(zeroIn) ops.seg(0,yL(0),w,yL(0),W(doc,dashZ?0.12:0.15),dashZ?{dash:ZERO_DASH}:undefined);
  for(const d of dots) ops.mark(d.x,d.y,d.mk,1.4,{sw:W(doc,0.15)});
  ops.rect(0,0,w,h,{stroke:'#000000',sw:W(doc,0.15)});
  if(brk){ const yc=h-B*0.5, g=0.42, x0=-1.0, x1=w+1.0; const up=wave(x0,x1,yc-g,0.32,2.6), dn=wave(x0,x1,yc+g,0.32,2.6);
    ops.poly(up.concat(dn.slice().reverse()),'#ffffff'); ops.line(up,W(doc,0.12)); ops.line(dn,W(doc,0.12)); }
  for(const t of vlabels){ const m=metrics(fontOf(doc,'value'),t.s); ops.text(t.s,t.x,t.left?t.y:(t.neg?t.y+0.5+m.A:t.y-0.55),'value',{align:t.left?'left':'center'}); }
  const LA=yAxis(ops,doc,AL,{x:0,h,side:'left',tick:'none',yf:yL,extra:brk?[0]:[],plus:o.plus});
  let RA=null; if(AR) RA=yAxis(ops,doc,AR,{x:w,h,side:'right',tick:'none',yf:yR,extra:brk?[0]:[],plus:o.plus});
  const cm=metrics(fontOf(doc,'cat'),'A'); const cw=Math.max(...S.map(s=>metrics(fontOf(doc,'cat'),s.lbl||s.name).W));
  const cs=clamp((slot-0.4)/cw,0.6,1);
  S.forEach((s,i)=>ops.text(s.lbl||s.name,(i+0.5)*slot,h+0.9+cm.A*cs,'cat',{align:'center',scale:cs}));
  const uy=-digitTop(doc)-0.9; const u=ops.text(`(${o2.unit})`,LA.outer,uy,'unit',{align:'left'});
  if(AR&&o2.unit2) ops.text(`(${o2.unit2})`,RA.outer,uy,'unit',{align:'right'});
  if(o.ytitle) ops.vtext(o.ytitle,LA.outer-2.3,h/2,'axis');
  if(o2.title){ const ty=uy-(u?u.m.H:2.6)-1.3; ops.text(o2.title,w/2,ty,'title',{align:'center'}); }
  return {ops,plot:{x:0,y:0,w,h}};
}
function legendOps(doc,items,mode,role){
  const ops=new Ops(doc); role=role||'legend'; const font=fontOf(doc,role); const lh=metrics(font,'가').H; const row=Math.max(lh,2.3)+1.5; const sw=3.0, sh=2.3, lw=5.4;
  let x=0;
  items.forEach((it,i)=>{
    const y=mode==='row'?0:i*row; if(mode!=='row') x=0; let swW=sw;
    if(it.line){ swW=lw; const st=it.line; ops.seg(x,y+sh/2,x+lw,y+sh/2,st.w||W(doc,0.22),{c:st.c||'#000000',dash:st.dash||null}); if(st.mk&&st.mk!=='none') drawMark(ops,doc,x+lw/2,y+sh/2,st.mk,1.15); }
    else if(it.mark==='dot'||it.mark==='odot'||it.mark==='fs') { if(it.mark==='fs') drawMark(ops,doc,x+sw/2,y+sh/2,'fs',1.15); else ops.mark(x+sw/2,y+sh/2,it.mark==='odot'?'oc':'fc',1.35,{sw:W(doc,0.15)}); }
    else ops.rect(x,y,sw,sh,{fill:fillColor(doc,it.fill),pat:patOf(it.fill),stroke:'#000000',sw:W(doc,0.12)});
    const m=metrics(font,it.text); ops.text(it.text,x+swW+1.0,y+sh/2+(m.A-m.D)/2,role);
    if(mode==='row') x+=swW+1.0+m.W+3.4;
  });
  if(mode==='boxed'||mode==='row'){ const b=ops.bounds(); ops.rect(b.x-1.2,b.y-0.9,b.w+2.4,b.h+1.8,{stroke:'#000000',sw:W(doc,0.12)}); }
  return ops;
}
function catUnitOf(doc,key){ return unitText(doc,METRICS[key]?METRICS[key].unit:'p'); }
function composeCat(doc){
  const o=doc.cat, S=plotted(doc); if(!S.length) return null;
  const sers=o.series.filter(se=>METRICS[se.m]).map(se=>Object.assign({},se)); if(!sers.length) return null;
  const diff=o.mode!=='value';
  const V=sers.map(se=>S.map(s=>valueOf(doc,s,se.m,o.mode)));
  const out=new Ops(doc); const plots=[];
  const free=o.brk&&!diff;
  const axOpt=()=>free?{zero:false,target:4,head:true,foot:true}:{zero:true,sym:diff,target:diff?6:5,head:o.values};
  if(o.layout==='group'||sers.length===1){
    const units=[...new Set(sers.map(se=>METRICS[se.m].unit))];
    const dual=sers.length>1&&units.length===2;
    const lu=units.includes('t')?'t':units[0];
    sers.forEach(se=>se.side=dual&&METRICS[se.m].unit!==lu?'R':'L');
    const VL=V.filter((_,j)=>sers[j].side==='L').flat(), VR=V.filter((_,j)=>sers[j].side==='R').flat();
    const AL=axisOf(o.y,VL,axOpt()); LAST.y=AL;
    let AR=null; if(dual){ AR=o.y2&&o.y2.auto===false?axisOf(o.y2,VR,{}):alignAxis(VR,Math.round((AL.hi-AL.lo)/AL.step),diff?'sym':free?'free':'zero'); LAST.y2=AR; }
    const title=sers.length===1?(sers[0].title||`〈${metricLabel(sers[0].m,sers[0].alias,diff)}〉`):'';
    const uL=unitText(doc,lu), uR=dual?unitText(doc,units.find(u=>u!==lu)):'';
    const p=catPanel(doc,S,sers,V,{L:AL,R:AR},{unit:dual?uL:catUnitOf(doc,sers[0].m),unit2:uR,title});
    out.absorb(p.ops,0,0); plots.push(p.plot);
    if(sers.length>1){
      const items=sers.map(se=>({text:se.title||metricLabel(se.m,se.alias,diff),fill:se.fill,mark:se.mark}));
      const lg=legendOps(doc,items,o.legend==='right'?'plain':o.legend==='bottom'?'row':'boxed'); const lb=lg.bounds(); const pb=out.bounds(); const P=p.plot;
      if(o.legend==='right') out.absorb(lg,pb.x+pb.w+3.2-lb.x,P.y+P.h/2-lb.h/2-lb.y);
      else if(o.legend==='inside') out.absorb(lg,P.x+P.w-1.2-lb.w-lb.x,P.y+1.2-lb.y);
      else out.absorb(lg,P.x+P.w/2-lb.w/2-lb.x,pb.y+pb.h+2.0-lb.y);
    }
  } else {
    sers.forEach(se=>se.side='L');
    const units=sers.map(se=>METRICS[se.m].unit); const shared=units.every(u=>u===units[0]);
    const axShared=shared?axisOf(o.y,V.flat(),axOpt()):null; LAST.y=axShared;
    const panels=sers.map((se,j)=>{ const ya=axShared||autoAxis(V[j],axOpt());
      return catPanel(doc,S,[se],[V[j]],{L:ya},{unit:catUnitOf(doc,se.m),title:se.title||`〈${metricLabel(se.m,se.alias,diff)}〉`}); });
    const r=arrange(doc,panels,panels.length,5.5,4); out.absorb(r.ops,0,0); plots.push(...r.plots);
  }
  return {ops:out,plots};
}

/* ───────── ⑤ 방사형(삼각형) 그래프: 가장 높은 지역을 1로 한 상댓값 ───────── */
const RD_STY=[{dash:[1.4,0.45,0.25,0.45],c:'#000000',w:0.2},{c:'#8a8a8a',w:0.32},{dash:[0.9,0.45],c:'#555555',w:0.26},{c:'#000000',w:0.45},{dash:[0.25,0.45],c:'#000000',w:0.28},{dash:[1.4,0.45],c:'#8a8a8a',w:0.3}];
function composeRadar(doc){
  const o=doc.rd, S=plotted(doc); if(!S.length) return null;
  const ms=o.metrics.filter(me=>METRICS[me.m]); if(ms.length<3) return null;
  const ops=new Ops(doc); const R=o.size/2; const n=ms.length;
  const V=ms.map(me=>S.map(s=>metricOf(s,me.m)));
  const Rel=V.map(row=>{ const mx=Math.max(...row.filter(fin)); return row.map(v=>fin(v)&&mx>0?v/mx:NaN); });
  const all=Rel.flat().filter(fin); const minR=all.length?Math.min(...all):0;
  let c=(o.center!==''&&o.center!=null&&fin(+o.center))?+o.center:Math.max(0,Math.floor(minR*10+1e-9)/10-0.1); c=clamp(c,0,0.9); LAST.c=c;
  const rr=v=>clamp((v-c)/(1-c),0,1.04)*R;
  const ang=j=>(-90+j*360/n)*Math.PI/180;
  for(let j=0;j<n;j++){ const a=ang(j); ops.seg(0,0,Math.cos(a)*R,Math.sin(a)*R,W(doc,0.15),{c:gray(120)}); }
  const step=0.2; const ticks=[]; for(let t=Math.ceil((c+1e-9)/step)*step;t<=1+1e-9;t+=step) ticks.push(Math.round(t*100)/100);
  for(const t of ticks){ const r=rr(t);
    for(let j=0;j<n;j++){ const a=ang(j), px=Math.cos(a)*r, py=Math.sin(a)*r, nx=-Math.sin(a)*0.5, ny=Math.cos(a)*0.5; ops.seg(px-nx,py-ny,px+nx,py+ny,W(doc,0.12)); }
    ops.textMid(t===1?'1':fmt(t,1),-0.8,-r,'tick',{align:'right'}); }
  S.forEach((s,i)=>{ const st=RD_STY[i%RD_STY.length]; const pts=ms.map((_,j)=>{ const a=ang(j), r=rr(Rel[j][i]); return [Math.cos(a)*r,Math.sin(a)*r]; });
    if(pts.some(p=>!fin(p[0])||!fin(p[1]))) return; ops.line(pts,W(doc,st.w),{c:st.c,dash:st.dash||null,closed:true,join:'miter'}); });
  const font=fontOf(doc,'axis'); const gm=metrics(font,'가'); const lh=gm.H+0.55;
  ms.forEach((me,j)=>{ const a=ang(j), ca=Math.cos(a), sa=Math.sin(a);
    const M_=METRICS[me.m]; const lines=splitTitle(me.title||(M_.month?metricLabel(me.m,me.alias,false):(me.alias?`${me.alias} ${M_.base}`:M_.base)),5);
    const px=ca*(R+1.3), py=sa*(R+1.3); const align=Math.abs(ca)<0.3?'center':ca>0?'left':'right';
    let y0; if(sa<-0.3) y0=py-(lines.length-1)*lh-0.3; else if(sa>0.3) y0=py+gm.A+0.2; else y0=py-((lines.length-1)*lh)/2+(gm.A-gm.D)/2;
    lines.forEach((l,k)=>ops.text(l,px,y0+k*lh,'axis',{align})); });
  const items=S.map((s,i)=>{ const st=RD_STY[i%RD_STY.length]; return {text:s.lbl||s.name,line:{c:st.c,dash:st.dash,w:W(doc,st.w),mk:'none'}}; });
  const lg=legendOps(doc,items,'boxed','label'); const lb=lg.bounds(); const pb=ops.bounds();
  ops.absorb(lg,pb.x+pb.w+3.0-lb.x,-R-lb.y);
  return {ops,plots:[{x:-R,y:-R,w:2*R,h:2*R}]};
}

/* ───────── ⑥ 표 ───────── */
function composeTable(doc){
  const o=doc.tb, S=plotted(doc); if(!S.length) return null;
  const ms=o.metrics.filter(me=>METRICS[me.m]); if(!ms.length) return null;
  const diff=o.mode!=='value'; const ops=new Ops(doc);
  const V=ms.map(me=>S.map(s=>valueOf(doc,s,me.m,o.mode)));
  const mName=me=>me.title||metricLabel(me.m,me.alias,diff), mUnit=me=>`(${unitText(doc,METRICS[me.m].unit)})`;
  // 모든 열의 단위가 같으면 표 위 오른쪽에 ‘(단위: mm)’를 한 번만 적는다(시험지 방식). unitPos:'head'면 열 머리마다
  const units=[...new Set(ms.map(me=>METRICS[me.m].unit))], topUnit=units.length===1&&o.unitPos!=='head';
  const nameLines=me=>me.alias&&!me.title?[[[`${me.alias.trim()}의`,'th']],[[`${METRICS[me.m].base}${diff?' 차이':''}`,'th']]]:[[[mName(me),'th']]];
  const head=me=>topUnit?{lines:nameLines(me)}:o.unitLine||(me.alias&&!me.title)?{lines:[...nameLines(me),[[mUnit(me),'td']]]}:{lines:[[[mName(me),'th'],[mUnit(me),'td']]]};
  const txt=(t,role)=>({lines:[[[t,role]]]}), num=v=>({num:fmtNum(v,o.dec,o.comma)});
  let rows;
  if(o.rows==='st') rows=[[txt('지역','th'),...ms.map(head)],...S.map((s,i)=>[txt(s.lbl||s.name,'td'),...ms.map((_,j)=>num(V[j][i]))])];
  else rows=[[txt('구분','th'),...S.map(s=>txt(s.lbl||s.name,'td'))],...ms.map((me,j)=>[head(me),...S.map((_,i)=>num(V[j][i]))])];
  const runW=r=>r.reduce((a,[t,role])=>a+metrics(fontOf(doc,role),t).W,0);
  const cellW=c=>c.num!=null?metrics(fontOf(doc,'td'),c.num).W:Math.max(...c.lines.map(runW));
  const gm=metrics(fontOf(doc,'td'),'가'); const lineH=gm.H*1.32; const padV=1.25, padH=2.4;
  const nC=rows[0].length;
  const colW=[]; const numW=[];
  for(let c=0;c<nC;c++){ let w=0, nw=0; for(const r of rows){ w=Math.max(w,cellW(r[c])); if(r[c].num!=null) nw=Math.max(nw,cellW(r[c])); } colW[c]=Math.max(w+2*padH,c===0?10:13); numW[c]=nw; }
  if(nC>1){ const mx=Math.max(...colW.slice(1)); for(let c=1;c<nC;c++) colW[c]=Math.max(colW[c],mx); }
  const rowH=rows.map(r=>Math.max(...r.map(c=>c.lines?c.lines.length:1))*lineH+2*padV);
  const X=[0]; colW.forEach(w=>X.push(X[X.length-1]+w)); const Y=[0]; rowH.forEach(h=>Y.push(Y[Y.length-1]+h));
  const TW=X[X.length-1], TH=Y[Y.length-1];
  ops.rect(0,0,TW,rowH[0],{fill:gray(Math.max(doc.style.light,222))});
  rows.forEach((r,ri)=>r.forEach((c,ci)=>{
    const x0=X[ci], w=colW[ci], yc=Y[ri]+rowH[ri]/2;
    if(c.num!=null){ const right=x0+(w+numW[ci])/2; ops.text(c.num,right,yc+(gm.A-gm.D)/2,'td',{align:'right'}); return; }
    const L=c.lines.length;
    c.lines.forEach((run,li)=>{ const tw=runW(run); let x=x0+w/2-tw/2; const yl=yc+(li-(L-1)/2)*lineH+(gm.A-gm.D)/2;
      for(const [t,role] of run){ ops.text(t,x,yl,role); x+=metrics(fontOf(doc,role),t).W; } });
  }));
  for(let r=1;r<Y.length-1;r++) ops.seg(0,Y[r],TW,Y[r],W(doc,0.12));
  for(let c=1;c<X.length-1;c++) ops.seg(X[c],0,X[c],TH,W(doc,0.12));
  ops.rect(0,0,TW,TH,{stroke:'#000000',sw:W(doc,0.16)});
  if(topUnit){ const um=metrics(fontOf(doc,'unit'),'(단위'); ops.text(`(단위: ${unitText(doc,units[0])})`,TW,-1.1-um.D,'unit',{align:'right'}); }
  return {ops,plots:[{x:0,y:0,w:TW,h:TH}]};
}

/* ───────── ④ 산점도 ───────── */
function scTitle(doc,ax,diff){ const c=doc.sc[ax]; return c.title||metricLabel(c.m,c.alias,diff); }
function composeScatter(doc){
  const o=doc.sc, S=plotted(doc); if(!S.length) return null;
  const X=S.map(s=>valueOf(doc,s,o.x.m,o.x.mode)), Y=S.map(s=>valueOf(doc,s,o.y.m,o.y.mode));
  const cross=o.style==='cross'||o.style==='crossgrid', grid=o.style==='crossgrid'; const w=o.pw,h=o.ph; const ops=new Ops(doc);
  const xa=axisOf(o.xa,X,{zero:cross||o.x.mode!=='value',target:6,head:true,foot:true});
  const ya=axisOf(o.ya,Y,{zero:cross||o.y.mode!=='value',target:6,head:true,foot:true}); LAST.x=xa; LAST.y=ya;
  const fx=v=>(v-xa.lo)/(xa.hi-xa.lo)*w, fy=yOf(ya,h);
  const ux=unitText(doc,METRICS[o.x.m].unit), uy=unitText(doc,METRICS[o.y.m].unit);
  const tx=scTitle(doc,'x',o.x.mode!=='value'), ty=scTitle(doc,'y',o.y.mode!=='value');
  const obst=[];
  if(cross){
    const ox=fx(clamp(0,xa.lo,xa.hi)), oy=fy(clamp(0,ya.lo,ya.hi));
    if(grid){   /* 점선 격자(시험지처럼 바깥 테두리까지 점선, 0은 축이 실선으로 덮음) */
      for(const v of ticksOf(ya)){ if(Math.abs(v)<1e-9) continue; ops.seg(0,fy(v),w,fy(v),W(doc,0.1),{dash:GRID_DASH}); }
      for(const v of ticksOf(xa)){ if(Math.abs(v)<1e-9) continue; ops.seg(fx(v),0,fx(v),h,W(doc,0.1),{dash:GRID_DASH}); } }
    ops.seg(0,oy,w,oy,W(doc,0.15)); ops.seg(ox,0,ox,h,W(doc,0.15));
    const dx=decOf(xa.step), dy=decOf(ya.step); const dm=metrics(fontOf(doc,'tick'),'0');
    for(const v of ticksOf(xa)){ const x=fx(v); ops.seg(x,oy-0.6,x,oy+0.6,W(doc,0.15)); if(Math.abs(v)<1e-9) continue; ops.text(fmt(v,dx),x,oy+0.9+dm.A,'tick',{align:'center'}); }
    for(const v of ticksOf(ya)){ const y=fy(v); ops.seg(ox-0.6,y,ox+0.6,y,W(doc,0.15)); if(Math.abs(v)<1e-9) continue; ops.textMid(fmt(v,dy),ox-1.0,y,'tick',{align:'right'}); }
    ops.text('0',ox-0.5,oy+0.9+dm.A,'tick',{align:'right'});
    obst.push({x:0,y:oy-0.7,w,h:1.4},{x:ox-0.7,y:0,w:1.4,h});
    const tf=fontOf(doc,'axis'); const lh=metrics(tf,'가').H+0.7;
    let xl=`${tx}(${ux})`, parts;
    if(grid){   /* 단위는 따로: 세로축 이름 아래 (mm), 가로축 끝 눈금 뒤 (℃) — 2025학년도 기출 양식 */
      const um=metrics(fontOf(doc,'unit',0.95),'(');
      const uy0=-digitTop(doc)-1.0; ops.text(`(${uy})`,ox,uy0,'unit',{align:'center',scale:0.95});
      const yl=wrapWords(ty,7); yl.forEach((p,i)=>ops.text(p,ox,uy0-um.H-0.5-(yl.length-1-i)*lh,'axis',{align:'center'}));
      const lastT=ops.list.filter(t=>t.t==='text'&&Math.abs(t.y-(oy+0.9+dm.A))<0.01).sort((a,b)=>(b.box.x+b.box.w)-(a.box.x+a.box.w))[0];
      if(lastT) ops.text(`(${ux})`,lastT.box.x+lastT.box.w+0.3,oy+0.9+dm.A,'unit',{scale:0.95});
      xl=tx; parts=wrapWords(xl,7);
    } else { ops.text(`${ty}(${uy})`,ox,-digitTop(doc)-1.3,'axis',{align:'center'}); parts=splitTitle(xl,14); }
    const xr=Math.max(w+2.2,...ops.list.filter(t=>t.t==='text'&&Math.abs(t.y-(oy+0.9+dm.A))<0.01).map(t=>t.box.x+t.box.w+1.6));
    parts.forEach((p,i)=>{ const m=metrics(tf,p); ops.text(p,xr,oy-((parts.length-1)*lh)/2+i*lh+(m.A-m.D)/2-(parts.length>1?0:0),'axis',{align:'left'}); });
  } else {
    for(const v of ticksOf(ya)){ if(v<=ya.lo+1e-9||v>=ya.hi-1e-9) continue; ops.seg(0,fy(v),w,fy(v),W(doc,0.1),{dash:GRID_DASH}); }
    for(const v of ticksOf(xa)){ if(v<=xa.lo+1e-9||v>=xa.hi-1e-9) continue; ops.seg(fx(v),0,fx(v),h,W(doc,0.1),{dash:GRID_DASH}); }
    ops.rect(0,0,w,h,{stroke:'#000000',sw:W(doc,0.15)});
    const Ly=yAxis(ops,doc,ya,{x:0,h,side:'left',tick:'none'});
    const dx=decOf(xa.step); const dm=metrics(fontOf(doc,'tick'),'0'); let last=null;
    for(const v of ticksOf(xa)) last=ops.text(fmt(v,dx),fx(v),h+0.9+dm.A,'tick',{align:'center'});
    if(last) ops.text(`(${ux})`,last.box.x+last.box.w+0.4,h+0.9+dm.A,'unit',{scale:0.95});
    ops.text(`(${uy})`,Ly.outer,-digitTop(doc)-0.9,'unit',{align:'left'});
    const vx=Ly.outer-2.4; ops.vtext(ty,vx,h/2,'axis');
    const xm=metrics(fontOf(doc,'axis'),tx); ops.text(tx,w/2,h+0.9+dm.H+1.4+xm.A,'axis',{align:'center'});
  }
  /* 점 + 이름표 자동 배치 */
  const pts=S.map((s,i)=>({s,x:fx(X[i]),y:fy(Y[i]),ok:fin(X[i])&&fin(Y[i])})).filter(p=>p.ok);
  const r=0.65; for(const p of pts){ ops.mark(p.x,p.y,'fc',1.3,{sw:W(doc,0.15)}); obst.push({x:p.x-r-0.2,y:p.y-r-0.2,w:2*r+0.4,h:2*r+0.4}); }
  const tb=ops.list.filter(t=>t.t==='text').map(t=>t.box); obst.push(...tb);
  const font=fontOf(doc,'label'); const placed=[];
  for(const p of pts){
    const lab=p.s.lbl||p.s.name; const m=metrics(font,lab); const g=0.6;
    const C=[
      {ax:p.x+r+g,ay:p.y+(m.A-m.D)/2,al:'left',pen:0},
      {ax:p.x,ay:p.y-r-g-m.D,al:'center',pen:0.5},
      {ax:p.x-r-g,ay:p.y+(m.A-m.D)/2,al:'right',pen:1},
      {ax:p.x,ay:p.y+r+g+m.A,al:'center',pen:1.5},
      {ax:p.x+r*0.7+g*0.6,ay:p.y-r*0.7-g*0.6-m.D,al:'left',pen:2},
      {ax:p.x-r*0.7-g*0.6,ay:p.y-r*0.7-g*0.6-m.D,al:'right',pen:2}
    ];
    let best=null;
    for(const c of C){ const bx=c.al==='center'?c.ax-m.W/2:c.al==='right'?c.ax-m.W:c.ax; const box={x:bx,y:c.ay-m.A,w:m.W,h:m.H};
      let sc=c.pen; for(const ob of obst.concat(placed)) sc+=overlap(box,ob,0.25)*40;
      if(box.x<-0.2||box.y<-0.2||box.x+box.w>w+0.2||box.y+box.h>h+0.2) sc+=cross?3:25;
      if(!best||sc<best.sc) best={sc,c,box}; }
    ops.text(lab,best.c.ax,best.c.ay,'label',{align:best.c.al}); placed.push(best.box);
  }
  return {ops,plots:[{x:0,y:0,w,h}]};
}
function overlap(a,b,pad){ const x=Math.max(0,Math.min(a.x+a.w,b.x+b.w+pad)-Math.max(a.x,b.x-pad)); const y=Math.max(0,Math.min(a.y+a.h,b.y+b.h+pad)-Math.max(a.y,b.y-pad)); return x*y; }
function wrapWords(s,max){   /* 낱말 단위로 max 글자 안쪽 줄 나누기 */
  const out=[]; let cur='';
  for(const w of String(s).split(/\s+/).filter(Boolean)){ if(cur&&(cur+' '+w).length>max){ out.push(cur); cur=w; } else cur=cur?cur+' '+w:w; }
  if(cur) out.push(cur); return out.length?out:[''];
}
function splitTitle(s,max){
  if(s.length<=max) return [s];
  const sp=[...s.matchAll(/\s/g)].map(m=>m.index); if(!sp.length) return [s];
  const mid=s.length/2; const k=sp.reduce((a,b)=>Math.abs(b-mid)<Math.abs(a-mid)?b:a); return [s.slice(0,k),s.slice(k+1)];
}

/* ───────── 발문 단서: 숨긴 시기 이름과 실제 시기 ───────── */
const SEASON_NAME={pJJA:'여름(6~8월)',pDJF:'겨울(12~2월)',pMAM:'봄(3~5월)',pSON:'가을(9~11월)',rJJA:'여름(6~8월)',rDJF:'겨울(12~2월)'};
function hintOf(doc){
  const list=doc.kind==='cat'?doc.cat.series:doc.kind==='sc'?[doc.sc.x,doc.sc.y]:doc.kind==='tb'?doc.tb.metrics:[];
  const items=[]; const seen=new Set();
  for(const se of list){ const a=(se.alias||'').trim(); if(!a||seen.has(a)) continue; const m=METRICS[se.m]; if(!m) continue;
    const per=m.month?`${m.month}월`:SEASON_NAME[se.m]; if(!per) continue; seen.add(a); items.push({alias:a,per,ord:m.month||({pDJF:0.5,rDJF:0.5,pMAM:3,pJJA:6,rJJA:6,pSON:9})[se.m]||0}); }
  if(items.length<2) return null;
  items.sort((a,b)=>a.alias.localeCompare(b.alias,'ko'));
  const pers=[...new Set(items.map(i=>i.per))]; if(pers.length<2) return null;
  const sorted=items.slice().sort((a,b)=>a.ord-b.ord).map(i=>i.per).filter((v,i,a)=>a.indexOf(v)===i);
  const suf=items.every(i=>/ 시기$/.test(i.alias))?' 시기':'';
  const names=items.map(i=>suf?i.alias.replace(/ 시기$/,''):i.alias);
  const last=(suf||names[names.length-1]).slice(-1); const code=last.charCodeAt(0)-0xAC00; const jo=code>=0&&code<11172&&code%28?'은':'는';
  const sentence=`(단, ${names.join(', ')}${suf}${jo} 각각 ${sorted.join(', ')} 중 하나임.)`;
  const key=items.map(i=>`${i.alias} = ${i.per}`).join(' · ');
  return {sentence,key};
}

/* ───────── 주석 ───────── */
function autoNotes(doc){
  const lines=[]; const n=plotted(doc).length; const ref=refStation(doc); const RN=ref?(ref.refLbl||ref.name):'기준 지점';
  const add=(key,mode)=>{ const m=METRICS[key]; if(!m||mode==='value') return; const b=m.month?(m.unit==='t'?'월평균 기온':'월 강수량'):m.base;
    const l=mode==='mean'?`${b} 차이 = 해당 지역 ${b} ${MINUS} (${KN[n]||n} 지역 ${b}의 합 ÷ ${n})`:`${b} 차이 = 해당 지역의 ${b} ${MINUS} ${RN}의 ${b}`;
    if(!lines.includes(l)) lines.push(l); };
  if(doc.kind==='line'){ const o=doc.line; const V=LINE_V[o.v]||LINE_V.t; const sm=`${(+o.start||0)+1}월`;
    if(o.v==='pc') lines.push(`누적 강수량은 ${sm}부터 해당 월까지의 강수량을 더한 값임.`);
    if(o.v==='pr') lines.push(`누적 강수 비율은 연 강수량 대비 ${sm}부터 해당 월까지의 강수량 비율임.`);
    if(o.v==='ps') lines.push('월 강수 비율은 연 강수량 대비 해당 월 강수량의 비율임.');
    if(o.mode!=='value'){ const b=V.base, hd=o.v==='t'?'기온':o.v==='p'?'강수량':V.name;
      lines.push(o.mode==='mean'?`${hd} 차이 = 해당 지역 ${b} ${MINUS} (${KN[n]||n} 지역 ${b}의 합 ÷ ${n})`:`${hd} 차이 = 해당 지역의 ${b} ${MINUS} ${RN}의 ${b}`); } }
  if(doc.kind==='climo'&&doc.climo.mode!=='value') lines.push(doc.climo.mode==='mean'?`기후 값 차이 = 해당 지역의 기후 값 ${MINUS} (${KN[n]||n} 지역 기후 값의 합 ÷ ${n})`:`기후 값 차이 = 해당 지역의 기후 값 ${MINUS} ${RN}의 기후 값`);
  if(doc.kind==='tb') for(const me of doc.tb.metrics) add(me.m,doc.tb.mode);
  if(doc.kind==='rd') lines.push(`${KN[n]||n} 지역 중 가장 높은 지역의 값을 1로 했을 때의 상댓값임.`);
  if(doc.kind==='cat') for(const se of doc.cat.series) add(se.m,doc.cat.mode);
  if(doc.kind==='sc'){ add(doc.sc.x.m,doc.sc.x.mode); add(doc.sc.y.m,doc.sc.y.mode); }
  return lines;
}
function noteLines(doc){
  const out=[]; const N=doc.notes;
  if(N.auto) out.push(...autoNotes(doc));
  if(N.normal) out.push('1991~2020년의 평년값임.');
  String(N.extra||'').split('\n').map(s=>s.trim()).filter(Boolean).forEach(s=>out.push(s));
  return out.map((s,i)=>(/^\*/.test(s)?s:'*'.repeat(i+1)+s));
}

/* ───────── 조립 ───────── */
const EXT={};
/* 다른 도표 엔진이 그리는 종류: 문서의 app(energy, religion, population …)마다 따로 둔다(기후의 line·sc·tb와 겹치지 않게) */
function register(kind,fn,app){ EXT[(app||'')+'|'+kind]=fn; }
function compose(doc){
  for(const k of Object.keys(LAST)) delete LAST[k];
  const ext=doc.app?EXT[doc.app+'|'+doc.kind]:null;
  if(ext){ const r=ext(doc); if(!r) return null; const B=r.ops.bounds(); return {ops:r.ops,b:B,plots:r.plots,W:B.w,H:B.h}; }
  const r=doc.kind==='climo'?composeClimo(doc):doc.kind==='line'?composeLine(doc):doc.kind==='cat'?composeCat(doc):doc.kind==='rd'?composeRadar(doc):doc.kind==='tb'?composeTable(doc):composeScatter(doc);
  if(!r) return null;
  const ops=r.ops; const b=ops.bounds();
  const notes=noteLines(doc);
  if(notes.length){ const font=fontOf(doc,'note'); const lh=metrics(font,'가').H*1.55; let y=b.y+b.h+2.2+metrics(font,'가').A; const x=b.x+0.6;
    for(const s of notes){ ops.text(s,x,y,'note'); y+=lh; } }
  const B=ops.bounds();
  return {ops,b:B,plots:r.plots,W:B.w,H:B.h};
}

/* ───────── 칠하기 ───────── */
/* 흑백 시험지 무늬: fs 빗금(／) bs 빗금(＼) xx 엇갈린 빗금 vl 세로줄 hl 가로줄 zz 물결줄 dot 촘촘한 점 sdot 성긴 점 */
const PATS={fs:'빗금 ／',bs:'빗금 ＼',xx:'엇갈린 빗금',vl:'세로줄',hl:'가로줄',zz:'물결줄',dot:'촘촘한 점',sdot:'성긴 점'};
function patPaint(ctx,pat,bb,path,k){
  k=k||1; if(ctx.fillPattern){ ctx.beginPath(); path(ctx); ctx.fillPattern(pat,k); return; }
  ctx.save(); ctx.beginPath(); path(ctx); ctx.clip(); ctx.beginPath(); ctx.setLineDash([]);
  const x0=bb.x, y0=bb.y, w=bb.w, h=bb.h;
  if(pat==='dot'||pat==='sdot'){ const s=(pat==='dot'?0.5:1.05)*k, r=(pat==='dot'?0.062:0.075)*Math.sqrt(k); let j=0;
    for(let y=y0+s/2;y<y0+h+s;y+=s*0.866,j++){ const off=j%2?s/2:0; for(let x=x0+off;x<x0+w+s;x+=s){ ctx.moveTo(x+r,y); ctx.arc(x,y,r,0,Math.PI*2); } }
    ctx.fillStyle='#000000'; ctx.fill(); ctx.restore(); return; }
  const s=(pat==='zz'?0.95:pat==='vl'||pat==='hl'?0.72:0.62)*k;
  if(pat==='fs'||pat==='xx') for(let t=-h;t<w+h;t+=s){ ctx.moveTo(x0+t,y0+h); ctx.lineTo(x0+t+h,y0); }
  if(pat==='bs'||pat==='xx') for(let t=-h;t<w+h;t+=s){ ctx.moveTo(x0+t,y0); ctx.lineTo(x0+t+h,y0+h); }
  if(pat==='vl') for(let x=x0+s/2;x<x0+w;x+=s){ ctx.moveTo(x,y0); ctx.lineTo(x,y0+h); }
  if(pat==='hl') for(let y=y0+s/2;y<y0+h;y+=s){ ctx.moveTo(x0,y); ctx.lineTo(x0+w,y); }
  if(pat==='zz'){ const a=0.26*k, p=0.95*k; for(let y=y0+s/2;y<y0+h+s;y+=s){ ctx.moveTo(x0-p,y); let up=true; for(let x=x0-p/2;x<=x0+w+p;x+=p/2){ ctx.lineTo(x,y+(up?-a:a)); up=!up; } } }
  ctx.lineWidth=0.1; ctx.strokeStyle='#000000'; ctx.lineCap='butt'; ctx.lineJoin='miter'; ctx.stroke(); ctx.restore();
}
function polyBox(pts){ let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; for(const p of pts){ a=Math.min(a,p[0]); b=Math.min(b,p[1]); c=Math.max(c,p[0]); d=Math.max(d,p[1]); } return {x:a,y:b,w:c-a,h:d-b}; }
function polyPath(pts){ return ctx=>{ ctx.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]); ctx.closePath(); }; }
function paintOps(ctx,list){
  for(const o of list){
    if(o.t==='line'){ if(o.pts.length<2) continue; ctx.beginPath(); ctx.moveTo(o.pts[0][0],o.pts[0][1]); for(let i=1;i<o.pts.length;i++) ctx.lineTo(o.pts[i][0],o.pts[i][1]); if(o.closed) ctx.closePath();
      ctx.lineWidth=o.w; ctx.strokeStyle=o.c; ctx.lineCap=o.cap; ctx.lineJoin=o.join; ctx.setLineDash(o.dash||[]); ctx.stroke(); ctx.setLineDash([]); }
    else if(o.t==='poly'){ if(o.pts.length<3) continue; const path=polyPath(o.pts);
      if(o.fill){ ctx.beginPath(); path(ctx); ctx.fillStyle=o.fill; ctx.fill(); }
      if(o.pat) patPaint(ctx,o.pat,polyBox(o.pts),path,o.ps);
      if(o.stroke){ ctx.beginPath(); path(ctx); ctx.lineWidth=o.sw; ctx.strokeStyle=o.stroke; ctx.lineJoin='miter'; ctx.setLineDash([]); ctx.stroke(); } }
    else if(o.t==='rect'){
      if(o.fill){ ctx.fillStyle=o.fill; ctx.fillRect(o.x,o.y,o.w,o.h); }
      if(o.pat||o.hatch) patPaint(ctx,o.pat||'fs',o,c=>c.rect(o.x,o.y,o.w,o.h),o.ps);
      if(o.stroke){ ctx.beginPath(); ctx.rect(o.x,o.y,o.w,o.h); ctx.lineWidth=o.sw; ctx.strokeStyle=o.stroke; ctx.lineJoin='miter'; ctx.setLineDash([]); ctx.stroke(); }
    }
    else if(o.t==='region'){ const path=c=>{ for(const r of o.rects) c.rect(r[0],r[1],r[2],r[3]); };
      if(o.fill){ ctx.beginPath(); path(ctx); ctx.fillStyle=o.fill; ctx.fill(); }
      if(o.pat){ let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity; for(const r of o.rects){ a=Math.min(a,r[0]); b=Math.min(b,r[1]); c=Math.max(c,r[0]+r[2]); d=Math.max(d,r[1]+r[3]); } patPaint(ctx,o.pat,{x:a,y:b,w:c-a,h:d-b},path,o.ps); } }
    else if(o.t==='mark'){ paintMark(ctx,o); }
    else if(o.t==='text'){ let tx=o.x, ty=o.y; if(o.rot){ ctx.save(); ctx.translate(o.x,o.y); ctx.rotate(o.rot); tx=0; ty=0; }
      ctx.font=o.font; ctx.textAlign=o.align; ctx.textBaseline='alphabetic';
      if(o.halo){ ctx.lineJoin='round'; ctx.setLineDash([]); ctx.lineWidth=o.halo==='w'?0.6:0.34; ctx.strokeStyle=o.halo==='w'?'#ffffff':'#000000'; ctx.strokeText(o.s,tx,ty); }
      ctx.fillStyle=o.halo==='k'?'#ffffff':(o.c||'#000000'); ctx.fillText(o.s,tx,ty); if(o.rot) ctx.restore(); }
  }
}
function paintMark(ctx,o){
  const r=o.size/2, x=o.x, y=o.y, sh=o.shape; ctx.beginPath(); ctx.setLineDash([]);
  const kind=sh[1], fill=sh[0];
  if(kind==='c') ctx.arc(x,y,r,0,Math.PI*2);
  else if(kind==='s'){ const a=r*0.9; ctx.rect(x-a,y-a,2*a,2*a); }
  else if(kind==='t'){ const a=r*1.12; ctx.moveTo(x,y-a); ctx.lineTo(x+a*0.95,y+a*0.62); ctx.lineTo(x-a*0.95,y+a*0.62); ctx.closePath(); }
  else if(kind==='d'){ const a=r*1.18; ctx.moveTo(x,y-a); ctx.lineTo(x+a,y); ctx.lineTo(x,y+a); ctx.lineTo(x-a,y); ctx.closePath(); }
  if(fill==='f'){ ctx.fillStyle='#000000'; ctx.fill(); }
  else { ctx.fillStyle=fill==='g'?o.g:'#ffffff'; ctx.fill(); ctx.lineWidth=o.sw; ctx.strokeStyle='#000000'; ctx.lineJoin='miter'; ctx.stroke(); }
}
function paintSheet(doc,cv,opts){
  const o=opts||{}; const dpr=o.dpr||window.devicePixelRatio||1;
  const Wd=cv.clientWidth, Hd=cv.clientHeight; if(!Wd||!Hd) return null;
  if(cv.width!==Math.round(Wd*dpr)||cv.height!==Math.round(Hd*dpr)){ cv.width=Math.round(Wd*dpr); cv.height=Math.round(Hd*dpr); }
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,Wd,Hd); c.fillStyle=o.desk||'#c7ccd2'; c.fillRect(0,0,Wd,Hd);
  const R=compose(doc); if(!R) return null;
  const pad=o.pad||28; const sw=R.W+2*M, sh=R.H+2*M;
  const k=clamp(Math.min((Wd-2*pad)/sw,(Hd-2*pad)/sh),1,o.maxK||9);
  const ox=(Wd-sw*k)/2, oy=(Hd-sh*k)/2;
  c.save(); c.shadowColor='rgba(0,0,0,.22)'; c.shadowBlur=14; c.shadowOffsetY=3; c.fillStyle='#ffffff'; c.fillRect(ox,oy,sw*k,sh*k); c.restore();
  c.setTransform(dpr*k,0,0,dpr*k,dpr*(ox+(M-R.b.x)*k),dpr*(oy+(M-R.b.y)*k));
  paintOps(c,R.ops.list);
  return {k,R};
}

/* ───────── SVG ───────── */
const f3=n=>+(+n).toFixed(3);
function SvgCtx(){ this.out=[]; this.defs=[]; this.d=''; this.stack=[]; this.open=0; this.n=0; this.fillStyle='#000000'; this.strokeStyle='#000000'; this.lineWidth=1; this.dash=[]; this.font='3px serif'; this.textAlign='start'; this.textBaseline='alphabetic'; this.lineJoin='miter'; this.lineCap='butt'; }
SvgCtx.prototype={
  save(){ this.stack.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,dash:this.dash.slice(),font:this.font,textAlign:this.textAlign,lineJoin:this.lineJoin,lineCap:this.lineCap,open:this.open}); this.open=0; },
  restore(){ while(this.open>0){this.out.push('</g>');this.open--;} const s=this.stack.pop(); if(s) Object.assign(this,s); },
  beginPath(){this.d='';}, moveTo(x,y){this.d+=`M${f3(x)} ${f3(y)}`;}, lineTo(x,y){this.d+=`L${f3(x)} ${f3(y)}`;}, closePath(){this.d+='Z';},
  rect(x,y,w,h){this.d+=`M${f3(x)} ${f3(y)}h${f3(w)}v${f3(h)}h${f3(-w)}Z`;},
  arc(x,y,r){this.d+=`M${f3(x+r)} ${f3(y)}A${f3(r)} ${f3(r)} 0 1 1 ${f3(x-r)} ${f3(y)}A${f3(r)} ${f3(r)} 0 1 1 ${f3(x+r)} ${f3(y)}Z`;},
  setLineDash(a){this.dash=(a||[]).slice();},
  fill(){ if(this.d) this.out.push(`<path d="${this.d}" fill="${this.fillStyle}"/>`); },
  stroke(){ if(!this.d) return; this.out.push(`<path d="${this.d}" fill="none" stroke="${this.strokeStyle}" stroke-width="${f3(this.lineWidth)}" stroke-linejoin="${this.lineJoin}" stroke-linecap="${this.lineCap}"${this.dash.length?` stroke-dasharray="${this.dash.map(f3).join(' ')}"`:''}/>`); },
  fillRect(x,y,w,h){ this.out.push(`<rect x="${f3(x)}" y="${f3(y)}" width="${f3(w)}" height="${f3(h)}" fill="${this.fillStyle}"/>`); },
  translate(x,y){ this.out.push(`<g transform="translate(${f3(x)} ${f3(y)})">`); this.open++; },
  rotate(a){ this.out.push(`<g transform="rotate(${f3(a*180/Math.PI)})">`); this.open++; },
  clip(){ const id='c'+(++this.n); this.defs.push(`<clipPath id="${id}"><path d="${this.d}"/></clipPath>`); this.out.push(`<g clip-path="url(#${id})">`); this.open++; },
  textAttr(x,y){ const b=/^bold /.test(this.font); const m=/^(?:bold )?([\d.]+)px (.*)$/.exec(this.font)||[0,3,'serif']; const anchor=this.textAlign==='center'?'middle':(this.textAlign==='right'||this.textAlign==='end')?'end':'start';
    const fam=m[2].replace(/"__UserSerif"/g,userFonts.serif?`"${userFonts.serif}"`:'"__UserSerif"').replace(/"__UserGothic"/g,userFonts.gothic?`"${userFonts.gothic}"`:'"__UserGothic"').replace(/"/g,"'");
    return `x="${f3(x)}" y="${f3(y)}" font-size="${f3(+m[1])}" font-family="${esc(fam)}"${b?' font-weight="bold"':''} text-anchor="${anchor}"`; },
  fillText(t,x,y){ this.out.push(`<text ${this.textAttr(x,y)} fill="${this.fillStyle}">${esc(t)}</text>`); },
  fillPattern(pat,k){ if(!this.d) return; const id=`p_${pat}_${String(k).replace('.','_')}`; this.pats=this.pats||{};
    if(!this.pats[id]){ this.pats[id]=1; const sw=0.1; let w,h,body;
      if(pat==='dot'||pat==='sdot'){ const s=(pat==='dot'?0.5:1.05)*k, r=(pat==='dot'?0.062:0.075)*Math.sqrt(k); w=s; h=s*0.866*2;
        body=[[s/2,s*0.433],[0,s*1.299],[s,s*1.299]].map(([x,y])=>`<circle cx="${f3(x)}" cy="${f3(y)}" r="${f3(r)}" fill="#000000"/>`).join(''); }
      else if(pat==='vl'||pat==='hl'){ const s=0.72*k; w=h=s; body=pat==='vl'?`<path d="M${f3(s/2)} 0V${f3(s)}" stroke="#000000" stroke-width="${sw}"/>`:`<path d="M0 ${f3(s/2)}H${f3(s)}" stroke="#000000" stroke-width="${sw}"/>`; }
      else if(pat==='zz'){ const s=0.95*k, a=0.26*k, p=0.95*k; w=p; h=s; body=`<path d="M0 ${f3(s/2+a)}L${f3(p/2)} ${f3(s/2-a)}L${f3(p)} ${f3(s/2+a)}" fill="none" stroke="#000000" stroke-width="${sw}"/>`; }
      else { const s=0.62*k; w=h=s; const f=`M0 ${f3(s)}L${f3(s)} 0M${f3(-s/2)} ${f3(s/2)}L${f3(s/2)} ${f3(-s/2)}M${f3(s/2)} ${f3(s*1.5)}L${f3(s*1.5)} ${f3(s/2)}`;
        const b=`M0 0L${f3(s)} ${f3(s)}M${f3(-s/2)} ${f3(s/2)}L${f3(s/2)} ${f3(s*1.5)}M${f3(s/2)} ${f3(-s/2)}L${f3(s*1.5)} ${f3(s/2)}`;
        body=`<path d="${pat==='bs'?b:pat==='xx'?f+b:f}" fill="none" stroke="#000000" stroke-width="${sw}"/>`; }
      this.defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${f3(w)}" height="${f3(h)}">${body}</pattern>`); }
    this.out.push(`<path d="${this.d}" fill="url(#${id})"/>`); },
  strokeText(t,x,y){ this.out.push(`<text ${this.textAttr(x,y)} fill="none" stroke="${this.strokeStyle}" stroke-width="${f3(this.lineWidth)}" stroke-linejoin="round">${esc(t)}</text>`); }
};

/* ───────── 내보내기 ───────── */
function glyphText(doc){ const R=compose(doc); if(!R) return ''; return [...new Set(R.ops.list.filter(o=>o.t==='text').map(o=>o.s).join(''))].join(''); }
async function ensureFonts(doc){
  if(!document.fonts||!document.fonts.load) return;
  const txt=glyphText(doc)+'0123456789()';
  const jobs=[];
  for(const fam of ['serif','gothic']) if(needsWeb(doc,fam)) jobs.push(document.fonts.load(`16px "${WEBNAME[fam]}"`,txt).catch(()=>{}));
  await Promise.all(jobs);
}
async function readyForExport(doc){ try{ await ensureFonts(doc); if(document.fonts) await document.fonts.ready; }catch(e){} mCache.clear(); }
async function renderPng(doc,opts){
  const o=opts||{}; const dpi=o.dpi||600; await readyForExport(doc);
  const R=compose(doc); if(!R) throw new Error('empty');
  const k=dpi/25.4; const c=document.createElement('canvas'); c.width=Math.round((R.W+2*M)*k); c.height=Math.round((R.H+2*M)*k);
  const x=c.getContext('2d'); x.fillStyle='#ffffff'; x.fillRect(0,0,c.width,c.height);
  x.setTransform(k,0,0,k,(M-R.b.x)*k,(M-R.b.y)*k); paintOps(x,R.ops.list);
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); return withDpi(blob,dpi);
}
function crc32(b){ let c,crc=-1; for(let n=0;n<b.length;n++){ c=(crc^b[n])&255; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; crc=(crc>>>8)^c; } return (crc^-1)>>>0; }
async function withDpi(blob,d){
  const buf=new Uint8Array(await blob.arrayBuffer()); const ppm=Math.round(d/0.0254);
  const ch=new Uint8Array(21), dv=new DataView(ch.buffer); dv.setUint32(0,9); ch.set([112,72,89,115],4); dv.setUint32(8,ppm); dv.setUint32(12,ppm); ch[16]=1; dv.setUint32(17,crc32(ch.subarray(4,17)));
  const out=new Uint8Array(buf.length+21); out.set(buf.subarray(0,33)); out.set(ch,33); out.set(buf.subarray(33),54); return new Blob([out],{type:'image/png'});
}
async function svgString(doc){
  await readyForExport(doc); const R=compose(doc); if(!R) throw new Error('empty');
  const s=new SvgCtx(); const Wm=R.W+2*M, Hm=R.H+2*M; const x0=R.b.x-M, y0=R.b.y-M;
  s.fillStyle='#ffffff'; s.fillRect(x0,y0,Wm,Hm); paintOps(s,R.ops.list);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f3(Wm)}mm" height="${f3(Hm)}mm" viewBox="${f3(x0)} ${f3(y0)} ${f3(Wm)} ${f3(Hm)}"><defs>${s.defs.join('')}</defs>${s.out.join('')}</svg>`;
}

/* ───────── 표의 나라들을 백지도에(통합판): 에너지·종교·인구·농업 탭이 함께 쓴다 ───────── */
const NOT_COUNTRY=/^(세계|전 ?세계|선진국|개발 ?도상국|저개발국|후발 ?개도국|아프리카|아메리카|아시아|유럽|오세아니아|북아메리카|남아메리카|라틴 ?아메리카|앵글로 ?아메리카|북미|중남미|중동|기타|그 외|합계|전체|OECD|EU|.+지역|.+대륙)$/;
function mapSeqOf(l){ l=String(l||'').trim(); if(/^\(?[가-하]\)?$/.test(l)) return 'gana'; if(/^[A-Z]$/.test(l)) return 'latin'; if(/^[㉠-㉭]$/.test(l)) return 'circ'; if(/^[㉮-㉻]$/.test(l)) return 'mk'; return null; }
function mapRows(doc,o){
  o=o||{}; const rows=((doc&&doc.data&&doc.data.rows)||[]).filter(r=>!r.hide&&String(r.name||'').trim());
  const skip=[], cs=[];
  for(const r of rows){ const nm=String(r.name).trim(); if(NOT_COUNTRY.test(nm)){ skip.push(nm); continue; }
    if(cs.some(c=>c.ko===nm)) continue;
    const l=!o.noLbl&&r.lbl!=null&&String(r.lbl).trim()?String(r.lbl).trim():null;
    cs.push({ko:nm,label:l,tone:o.tone||'mid',style:'shade'}); }
  const labs=cs.map(c=>c.label).filter(Boolean);
  const spec={region:o.region||null,labelSeq:(labs.length&&mapSeqOf(labs[0]))||'gana',points:[],countries:cs,noLabels:true,noLbl:!labs.length};
  const rn={'world-atl':'세계 지도','world-pac':'태평양 중심 세계 지도'}[o.region];
  const q=[rn,...cs.map(c=>c.label?`${c.ko} ${c.label}`:c.ko)].filter(Boolean).join(', ')+(labs.length?'':', 기호 없이');
  return {spec,q,cs,skip};
}
/* 화면 쪽: #mapSend 칸(범위·기호·색 고르기, 지도 만들기 단추)을 맡는다. 단독 파일에서는 단추 주소가 비어 칸이 숨는다 */
function mapSend($,getDoc){
  const box=$('#mapSend'), a=$('#mapSendBtn'); if(!box||!a) return {sync(){},request:()=>null};
  const inHub=()=>(a.getAttribute('href')||'').startsWith('#open:');
  const opts=()=>({region:$('#msRegion').value||null,noLbl:$('#msLbl').value==='none',tone:$('#msTone').value||'mid'});
  function sync(){ const R=mapRows(getDoc(),opts()); box.hidden=!inHub()||!R.cs.length;
    const is=$('#itemSend'), ib=$('#itemSendBtn'); if(is&&ib){ const dd=(getDoc()||{}).data||{}; is.hidden=!(ib.getAttribute('href')||'').startsWith('#open:')||!(dd.rows||[]).length||!(dd.cols||[]).length; }
    $('#msNote').textContent=R.skip.length?`나라가 아닌 행은 빠져요: ${R.skip.join(', ')}`:'세계지리 백지도 ‘자동 생성’ 탭에서 표의 나라를 칠한 지도를 만들어요. 행에 기호가 있으면 같은 기호를 붙여요.'; }
  function request(){ const R=mapRows(getDoc(),opts()); return R.cs.length?{spec:R.spec,q:R.q,from:'표'}:null; }
  for(const id of ['#msRegion','#msLbl','#msTone']){ const e=$(id); if(e) e.addEventListener('change',sync); }
  return {sync,request};
}

const dlCap=(window.claude&&typeof window.claude.use==='function')?window.claude.use('downloads').catch(()=>null):Promise.resolve(null);
async function saveFile(name,data,mime){
  const dl=await dlCap;
  if(dl){ try{ await dl.save({filename:name,data}); return 'saved'; } catch(e){ if(e&&e.code==='declined') return 'declined'; if(e&&e.code==='rate_limited') return 'busy'; return 'failed'; } }
  try{ const blob=data instanceof Blob?data:new Blob([data],{type:mime}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000); return 'saved'; }
  catch(e){ return 'failed'; }
}
async function copyPng(doc,opts){ const item=new ClipboardItem({'image/png':renderPng(doc,opts)}); await navigator.clipboard.write([item]); }
function sizeOf(doc){ const R=compose(doc); return R?{w:R.W+2*M,h:R.H+2*M}:null; }

return {clean,MMPT,M,clamp,uid,esc,fin,fmt,fmtVal,MINUS,KN,FONTS,userFonts,fontDef,fontAvailable,needsWeb,registerUserFont,
  METRICS,METRIC_GROUPS,metricOf,metricLabel,unitText,SEQS,FILLS,MARKS,LINE_STY,KINDS,LINE_V,fmtNum,freshDoc,normalizeDoc,normStation,plotted,refStation,relabel,nextLabel,addStation,
  clearMetrics:()=>mCache.clear(),valueOf,monthlyOf,parseClimate,lastAxes:()=>Object.assign({},LAST),hintOf,setStationDict,stationList,searchStations,koppenOf,koppenStations,KOP_TYPES,stationData,parseRequest,specToDoc,buildPrompt,autoAxis,axisOf,climoAxes,compose,autoNotes,noteLines,paintSheet,paintOps,renderPng,svgString,saveFile,copyPng,sizeOf,readyForExport,ensureFonts,lineStyle,
  mapRows,mapSend,register,Ops,PATS,patOf,fillColor,fontOf,metrics,W,gray,legendOps,ticksOf,niceStep,decOf,yAxis,drawMark,overlap,splitTitle,wave,sum,avg,
  GRID_DASH,LINE_DASH,ZERO_DASH,fontStack};
})();
