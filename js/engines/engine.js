/* 세계지리 백지도 공통 엔진: 지도 데이터, 도법, 그리기, 내보내기, 지명 사전, 라벨 자동 배치, 문장 해석 */
const WG=(function(){
'use strict';
const MMPT=25.4/72;   // 1pt = 0.3528 mm
const M=1.2;          // 틀 바깥 여백(mm)
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const r3=n=>Math.round(n*1000)/1000;
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
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
const norm=s=>String(s==null?'':s).replace(/[\s·.\-]+/g,'').toLowerCase();
const RAD=Math.PI/180;

/* ───────── 하천 ───────── */
const RIVERS={
 '나일강':['Nile','Albert Nile','Victoria Nile','Bahr el Jebel','El Bahr el Abyad','Damietta Branch','Rosetta Branch','White Nile'],
 '청나일강':['Abay','El Bahr el Azraq','Blue Nile'],
 '아마존강':['Amazonas','Amazon','Ucayali','Solimões'],
 '미시시피강':['Mississippi'],'미주리강':['Missouri','Madison'],'오하이오강':['Ohio','Allegheny'],
 '창장강(양쯔강)':['Yangtze','Chang Jiang','Jinsha','Tongtian','Tuotuo'],
 '황허강':['Huang','Huang He','Yellow'],'주장강':['Xi','Xun','Hongshui','Nanpan'],
 '메콩강':['Mekong','Lancang','Za'],'이라와디강':['Ayeyarwady','Irrawaddy','Irrawaddy Delta','Nmai'],
 '살윈강':['Salween','Nu'],'짜오프라야강':['Chao Phraya'],'홍강':['Hong'],
 '갠지스강':['Ganges','Ganga','Padma'],'브라마푸트라강':['Brahmaputra','Yarlung','Dihang','Maquan','Jamuna'],
 '인더스강':['Indus','Shiquan'],'티그리스강':['Tigris','Dicle','Dijlah'],'유프라테스강':['Euphrates','Al Furat','Firat'],
 '샤트알아랍강':['Shatt al Arab'],'요르단강':['Jordan'],
 '아무다리야강':['Amu  Darya','Amu Darya','Panj','Pamir'],'시르다리야강':['Syr Darya','Naryn'],
 '볼가강':['Volga'],'우랄강':['Ural'],
 '다뉴브강(도나우강)':['Danube','Donau','Duna','Dunav','Borcea','Bratul Chillia','Bratul Sfintu Gheorghe','Bratul Sulina'],
 '라인강':['Rhine','Rhein','Rhin','Nederrijn','Waal','Lek','Rijn'],
 '센강':['Seine'],'루아르강':['Loire'],'론강':['Rhône','Rhone'],'가론강':['Garonne'],
 '엘베강':['Elbe','Labe'],'오데르강':['Oder','Odra'],'비스와강':['Vistula','Wisla','Wisła'],
 '템스강':['Thames'],'포강':['Po'],'에브로강':['Ebro'],'테주강(타호강)':['Tajo','Tejo'],
 '드네프르강':['Dnipro','Dnepre','Dnieper','Dnepr'],'돈강':['Don'],
 '오비강':['Ob'],'이르티시강':['Irtysh','Ertis','Ertix'],
 '예니세이강':['Yenisey','Malyy Yenisey','Verkhniy Yenisey','Kyzyl-Khem'],
 '레나강':['Lena','Bykovskaya Protoka','Olenekskaya Protoka','Trofimovskaya Protoka','Tumatskaya Protoka'],
 '아무르강(헤이룽강)':['Amur','Heilong Jiang','Argun’'],
 '콩고강':['Congo','Lualaba'],'니제르강':['Niger'],'잠베지강':['Zambezi'],'오렌지강':['Orange'],
 '림포포강':['Limpopo'],'세네갈강':['Sénégal','Senegal','Bafing'],'볼타강':['Volta'],
 '오리노코강':['Orinoco'],'파라나강':['Paraná','Parana'],'우루과이강':['Uruguay'],'상프란시스쿠강':['São  Francisco','São Francisco'],
 '마그달레나강':['Magdalena'],
 '콜로라도강':['Colorado'],'컬럼비아강':['Columbia'],'리오그란데강':['Rio Grande'],'세인트로렌스강':['St. Lawrence'],
 '매켄지강':['Mackenzie'],'유콘강':['Yukon'],'허드슨강':['Hudson'],'나이아가라강':['Niagara'],
 '머리강':['Murray'],'달링강':['Darling','Barwon'],'타림강':['Tarim'],
 '수에즈 운하':['Suez Canal'],'파나마 운하':['Panama Canal']
};
const RIVER_OF={}; for(const [k,l] of Object.entries(RIVERS)) l.forEach(n=>RIVER_OF[n]=k);
const RIVER_KEY={};
for(const [k,l] of Object.entries(RIVERS)){
  RIVER_KEY[norm(k)]=k;
  k.split(/[()]/).map(s=>s.trim()).filter(Boolean).forEach(p=>{ RIVER_KEY[norm(p)]=k; if(/강$/.test(p)) RIVER_KEY[norm(p.slice(0,-1))]=k; });
  l.forEach(n=>RIVER_KEY[norm(n)]=k);
}
RIVER_KEY[norm('장강')]='창장강(양쯔강)'; RIVER_KEY[norm('황하')]='황허강'; RIVER_KEY[norm('황허')]='황허강';
function resolveRiver(name){ if(!name) return null; const n=norm(name); return RIVER_KEY[n]||RIVER_KEY[n.replace(/강$/,'')]||null; }
/* 하천에 기호(A 등)를 붙일 때 점을 찍을 자리. 물 분쟁으로 자주 나오는 강은 분쟁이 일어나는 곳 가까이(위도, 경도) */
const RIVER_LABEL_PT={'나일강':[15.6,32.53],'청나일강':[11.2,35.1],'요르단강':[32.3,35.57],'티그리스강':[35.5,43.25],'유프라테스강':[35.95,39.0],'갠지스강':[24.8,87.93]};
function riverLabelPt(key){
  if(RIVER_LABEL_PT[key]) return RIVER_LABEL_PT[key];
  const g=anyGeo(); const fs=g&&g.rivers&&g.rivers.get(key); if(!fs||!fs.length) return null;   // 그 밖의 강: 가장 긴 조각의 가운데 꼭짓점
  let best=null, n=0; for(const f of fs){ const gm=f.geometry; const ls=gm.type==='LineString'?[gm.coordinates]:gm.coordinates; for(const l of ls) if(l.length>n){ n=l.length; best=l; } }
  if(!best) return null; const c=best[Math.floor(best.length/2)]; return [c[1],c[0]];
}

/* ───────── 국가 이름 ───────── */
const KO_FIX={'터키':'튀르키예','조선민주주의인민공화국':'북한','중화인민공화국':'중국','중화민국':'타이완','태국':'타이'};
const KO_ALIAS={TUR:'터키',PRK:'조선민주주의인민공화국 조선',CHN:'중화인민공화국',TWN:'대만 중화민국',THA:'태국',USA:'미합중국',GBR:'잉글랜드 브리튼',
  ARE:'UAE 아랍에미리트연합',COD:'민주콩고 DR콩고 콩고민주공화국',COG:'콩고',AUS:'호주',NLD:'홀란드',CZE:'체코공화국',SWZ:'스와질란드',MMR:'버마',
  CIV:'아이보리코스트',KOR:'한국 남한',SAU:'사우디',ZAF:'남아공 남아프리카',CAF:'중앙아프리카',BIH:'보스니아',DOM:'도미니카공화국',
  SDS:'남수단공화국',PSX:'팔레스타인',SAH:'서사하라',KOS:'코소보',VAT:'바티칸',GRL:'그린란드',MKD:'마케도니아'};
const ISO_FIX={SSD:'SDS',PSE:'PSX',ESH:'SAH',XKX:'KOS',ROM:'ROU',ZAR:'COD',TMP:'TLS'};

/* ───────── 글꼴 ───────── */
const FONTS=[
 {key:'hysm',label:'HY신명조 (시험지 글꼴)',names:['HY신명조','HYSinMyeongJo-Medium','한양신명조']},
 {key:'hygm',label:'HY견명조',names:['HY견명조','HYGyeonMyeongJo-Bold','HYGyeonMyeongJo']},
 {key:'hyjg',label:'HY중고딕',names:['HY중고딕','HYGothic-Medium','HYGothic']},
 {key:'hcrb',label:'함초롬바탕',names:['함초롬바탕','HCR Batang','HCRBatang']},
 {key:'batang',label:'바탕',names:['바탕','Batang']},
 {key:'noto',label:'Noto Serif KR (웹 글꼴)',names:['Noto Serif KR'],web:true},
 {key:'user',label:'직접 불러온 글꼴 파일',names:['__UserFont']}
];
const userFont={name:''};
const FALLBACK=['Noto Serif KR','Batang','바탕','AppleMyungjo'];
function fontDef(doc){ return FONTS.find(f=>f.key===doc.style.font)||FONTS[0]; }
function fontStack(doc,forSvg){
  const f=fontDef(doc);
  const names=f.key==='user'?(forSvg&&userFont.name?[userFont.name]:['__UserFont']):f.names;
  const latin=doc.style.latin==='times'?['Times New Roman','Times']:[];
  const q=forSvg?(n=>`'${n}'`):(n=>`"${n}"`);
  return [...latin,...names,...FALLBACK].map(q).concat(['serif']).join(', ');
}
const probe=document.createElement('canvas').getContext('2d');
const instCache={};
function fontInstalled(name){
  if(instCache[name]!=null) return instCache[name];
  const t='가나다라마바사ABCabc(가)㉠';
  probe.font='40px monospace'; const a=probe.measureText(t).width;
  probe.font=`40px "${name}", monospace`; const b=probe.measureText(t).width;
  probe.font='40px sans-serif'; const c=probe.measureText(t).width;
  probe.font=`40px "${name}", sans-serif`; const d=probe.measureText(t).width;
  const ok=Math.abs(a-b)>0.5||Math.abs(c-d)>0.5;
  if(ok) instCache[name]=true;
  return ok;
}
function fontAvailable(f){
  if(f.key==='user') return !!userFont.name;
  if(f.web) return document.fonts.check(`16px "${f.names[0]}"`,'가');
  return f.names.some(fontInstalled);
}
function needsWebFallback(doc){ const f=fontDef(doc); return f.web||!fontAvailable(f); }
function labelText(doc){ return [...new Set(doc.items.map(i=>i.lbl||'').join('')+'0°NSEW')].join(''); }
function ensureGlyphs(doc){
  if(!needsWebFallback(doc)||!document.fonts||!document.fonts.load) return Promise.resolve();
  return document.fonts.load('16px "Noto Serif KR"',labelText(doc)).catch(()=>{});
}

/* ───────── 라벨 순서 ───────── */
const SEQS={
 latin:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
 lower:'abcdefghijklmnopqrstuvwxyz'.split(''),
 gana:['가','나','다','라','마','바','사','아','자','차','카','타','파','하'].map(s=>`(${s})`),
 circ:'㉠㉡㉢㉣㉤㉥㉦㉧㉨㉩㉪㉫㉬㉭'.split(''),
 mk:'㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻'.split(''),
 jamo:'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split(''),
 num:Array.from({length:40},(_,i)=>String(i+1))
};
function nextLabel(doc){
  const used=new Set(doc.items.map(i=>i.lbl));
  const s=SEQS[doc.style.seq]||SEQS.latin;
  return s.find(x=>!used.has(x))||'';
}
function seqOfLabel(l){ for(const [k,s] of Object.entries(SEQS)) if(s.includes(l)) return k; return null; }

/* ───────── 도법 ───────── */
const PROJS={
 miller:{name:'밀러 (세계 전도)',f:()=>d3.geoMiller(),cyl:true},
 equirect:{name:'등장방형 (경위선 직교)',f:()=>d3.geoEquirectangular(),cyl:true},
 mercator:{name:'메르카토르 (지역도)',f:()=>d3.geoMercator(),cyl:true},
 robinson:{name:'로빈슨',f:()=>d3.geoRobinson(),cyl:true,sphere:true},
 polar:{name:'정거 방위 (북극 중심)',f:()=>d3.geoAzimuthalEquidistant().clipAngle(128),cyl:false,sphere:true}
};
const KX={};
function kxOf(t){
  if(KX[t]!=null) return KX[t];
  if(t==='polar') return (KX[t]=1);
  const P=PROJS[t].f().scale(1).translate([0,0]).rotate([0,0]);
  return (KX[t]=Math.abs(P([180/Math.PI,0])[0]));
}

/* ───────── 지역 프리셋 (틀 크기는 시험지에 인쇄된 그림 크기를 잰 값) ───────── */
const PRESETS=[
 {id:'world-atl',name:'세계 전도',proj:'miller',lon:10,lat:8,span:359,w:108,h:56,borders:false,ticks:[{k:'lat',v:0,side:'left'}]},
 {id:'world-pac',name:'환태평양 (태평양 중심)',proj:'miller',lon:-151,lat:-2,span:260,w:108,h:51,borders:false,ticks:[{k:'lat',v:0,side:'left'}]},
 {id:'old',name:'아프리카~오세아니아',proj:'miller',lon:67,lat:3,span:180,w:70,h:41,borders:false,ticks:[{k:'lat',v:0,side:'left'}]},
 {id:'europe',name:'유럽',proj:'mercator',lon:5,lat:48,span:31,w:46,h:45,borders:true,ticks:[]},
 {id:'swasia',name:'건조 아시아·북부 아프리카',proj:'mercator',lon:42,lat:25,span:62,w:59,h:48,borders:true,ticks:[{k:'lat',v:0,side:'right'}]},
 {id:'ssaf',name:'사하라 이남 아프리카',proj:'mercator',lon:18.5,lat:-9,span:73,w:48,h:48,borders:true,ticks:[{k:'lat',v:0,side:'left'}]},
 {id:'monsoon',name:'몬순 아시아',proj:'mercator',lon:104,lat:20,span:72,w:58,h:48,borders:true,ticks:[{k:'lat',v:0,side:'left'}]},
 {id:'eastasia',name:'동아시아',proj:'mercator',lon:118,lat:37,span:54,w:56,h:44,borders:true,ticks:[]},
 {id:'oceania',name:'오세아니아',proj:'mercator',lon:130,lat:-17,span:102,w:58,h:34,borders:true,ticks:[{k:'lat',v:0,side:'right'}]},
 {id:'usa',name:'미국',proj:'mercator',lon:-96,lat:38.5,span:62,w:56,h:35,borders:true,ticks:[]},
 {id:'angloam',name:'앵글로아메리카',proj:'miller',lon:-100,lat:52,span:120,w:58,h:44,borders:true,ticks:[]},
 {id:'latam',name:'중남부 아메리카',proj:'mercator',lon:-72,lat:-10,span:74,w:46,h:58,borders:true,ticks:[{k:'lat',v:0,side:'left'}]},
 {id:'arctic',name:'북극 중심',proj:'polar',lon:0,edge:35,w:58,h:58,borders:false,ticks:[]}
];
const presetById=id=>PRESETS.find(p=>p.id===id);
/* 원자료는 ±180°에서 땅을 잘라 두 조각으로 저장한다(추코트카 등). 잘린 변은 해안선이 아니므로 빼고 선을 나눈다 */
function cutAntimeridian(ml){
  const on=p=>Math.abs(Math.abs(p[0])-180)<1e-3, out=[];
  for(const line of ml.coordinates){ let cur=[];
    for(let i=0;i<line.length;i++){ const p=line[i];
      if(cur.length&&on(p)&&on(cur[cur.length-1])&&Math.sign(p[0])===Math.sign(cur[cur.length-1][0])){ if(cur.length>1) out.push(cur); cur=[p]; }
      else cur.push(p); }
    if(cur.length>1) out.push(cur); }
  return {type:'MultiLineString',coordinates:out};
}
function makeProj(v,fw,fh){
  const P=PROJS[v.proj].f();
  P.rotate(v.proj==='polar'?[-v.rot,-90]:[-v.rot,0]);
  P.scale(v.scale).translate([v.tx,v.ty]).precision(0.08);
  P.clipExtent([[-M,-M],[fw+M,fh+M]]);
  return P;
}
function fitView(d,p){
  const v=d.view;
  if(p.proj==='polar'){
    const ang=(90-p.edge)*RAD;
    v.scale=(Math.min(p.w,p.h)/2)/ang; v.tx=p.w/2; v.ty=p.h/2; return;
  }
  let P=makeProj(v,p.w,p.h);
  const a=P([p.lon-p.span/2,p.lat]), b=P([p.lon+p.span/2,p.lat]);
  v.scale=p.w/Math.abs(b[0]-a[0]);
  P=makeProj(v,p.w,p.h);
  const c=P([p.lon,p.lat]); v.tx+=p.w/2-c[0]; v.ty+=p.h/2-c[1];
}
function applyPreset(d,p){
  d.preset=p.id; d.frame={w:p.w,h:p.h};
  d.view={proj:p.proj,rot:p.lon,scale:1,tx:0,ty:0};
  d.layers.borders=p.borders; d.ticks=p.ticks.map(t=>({...t}));
  fitView(d,p); d.home={...d.view};
}

/* ───────── 문서 ───────── */
function freshDoc(presetId){
  const d={v:1,preset:presetId,view:{},frame:{w:46,h:45},
    layers:{borders:true,lakes:true,dokdo:true,polarLbl:true,grat:0,lines:{eq:false,tr:false,ac:false},rivers:[],major:false,detail:'auto',zone:{belts:{A:'off',B:'off',C:'off',D:'off',E:'off'},tone:{},only:[]},plates:{on:false,typed:true,names:true},relief:{on:false,show:{shield:true,old:true,new:true},only:[],tone:{},names:false},legend:'bl',scale:'none'},
    ticks:[],
    style:{font:'hysm',latin:'same',fontPt:9,dot:1.2,ring:1.5,line:1,sea:229,seaK:0.8,shade:178,seq:'latin',place:'l',shadeAuto:true},
    items:[]};
  applyPreset(d,presetById(presetId)||PRESETS[3]);
  return d;
}
function normalizeDoc(d){
  d=clean(d)||{}; const f=freshDoc(d.preset&&presetById(d.preset)?d.preset:'europe');
  const out={...f,...d,layers:{...f.layers,...(d.layers||{}),lines:{...f.layers.lines,...((d.layers||{}).lines||{})}},style:{...f.style,...(d.style||{})},frame:{...f.frame,...(d.frame||{})},view:{...f.view,...(d.view||{})}};
  { out.layers.zone=normZone((d.layers||{}).zone);
    const dl=d.layers||{}; out.layers.legend=ZONE_LEGEND.includes(dl.legend)?dl.legend:ZONE_LEGEND.includes((dl.zone||{}).legend)?dl.zone.legend:'bl';   // 옛 판은 zone.legend에 두었음
    const pl=Object.assign({},f.layers.plates,dl.plates||{}); out.layers.plates={on:pl.on===true,typed:pl.typed!==false,names:pl.names!==false};
    out.layers.relief=normRelief(dl.relief); out.layers.dokdo=dl.dokdo!==false; out.layers.polarLbl=dl.polarLbl!==false; out.style.seaK=[1,0.8,0.65].includes(+out.style.seaK)?+out.style.seaK:0.8; }
  if(!PROJS[out.view.proj]) out.view=f.view;
  out.items=(d.items||[]).filter(i=>i&&i.t&&isFinite(i.lon)&&isFinite(i.lat)).map(i=>({dx:0,dy:0,leader:'auto',halo:false,extra:[],...i,id:i.id||uid()}));
  out.ticks=Array.isArray(d.ticks)?d.ticks:f.ticks;
  return out;
}

/* ───────── 지도 데이터 ───────── */
const geo={xlo:null,lo:null,hi:null}, loading={};
const LODS={xlo:'간략',lo:'보통',hi:'자세히'};
const listeners=[];
function onData(fn){ listeners.push(fn); }
function rawData(name){
  const el=document.getElementById('wg-data-'+name);
  if(el){ return new Promise((res,rej)=>setTimeout(()=>{ try{ res(JSON.parse(el.textContent)); }catch(e){ rej(e); } },0)); }
  return GM_LOAD(`data/${name}.json`);
}
/* Natural Earth 10m(hi)의 울릉도는 꼭짓점 몇 개짜리 삼각형이라 확대하면 어색하다. 지우고 drawKoreaIslands가 SGIS 윤곽으로 그린다 */
function dropUlleung(cT,obj){
  const gm=obj.geometries.find(x=>x.properties&&x.properties.id==='KOR'); if(!gm||gm.type!=='MultiPolygon') return;
  const f=topojson.feature(cT,gm), keep=[];
  f.geometry.coordinates.forEach((poly,i)=>{ const r=poly[0]; let cx=0,cy=0; for(const q of r){ cx+=q[0]; cy+=q[1]; } cx/=r.length; cy/=r.length;
    if(!(cx>130.5&&cx<131.2&&cy>37.3&&cy<37.7)) keep.push(gm.arcs[i]); });
  gm.arcs=keep;
}
function prep(raw){
  const cT=raw.c, obj=cT.objects.countries;
  dropUlleung(cT,obj);
  const countries=topojson.feature(cT,obj).features;
  countries.forEach(f=>{
    f.id=f.properties.id; f.bounds=d3.geoBounds(f);
    const p=f.properties; const orig=p.ko; p.ko=KO_FIX[p.ko]||p.ko;
    const names=[p.ko,orig,p.en,f.id,...String(KO_ALIAS[f.id]||'').split(' ')].filter(Boolean);
    p.names=new Set(names.map(norm)); p.key=names.map(norm).join(' ');
  });
  const lakes=topojson.feature(raw.l,raw.l.objects.lakes).features;
  lakes.forEach(f=>f.area=d3.geoArea(f));
  const riversAll=topojson.feature(raw.r,raw.r.objects.rivers).features;
  const rivers=new Map();
  riversAll.forEach(f=>{const en=f.properties.en; const k=RIVER_OF[en]||en; if(!k) return; f.properties.key=k; if(!rivers.has(k)) rivers.set(k,[]); rivers.get(k).push(f);});
  return {countries,byId:new Map(countries.map(f=>[f.id,f])),land:{type:'FeatureCollection',features:countries},
    coast:cutAntimeridian(topojson.mesh(cT,obj,(a,b)=>a===b)),borders:topojson.mesh(cT,obj,(a,b)=>a!==b),lakes,rivers,riversAll};
}
function loadLod(l){
  if(geo[l]) return Promise.resolve(geo[l]);
  if(loading[l]) return loading[l];
  loading[l]=rawData(l).then(raw=>{ geo[l]=prep(raw); listeners.forEach(fn=>{ try{fn(l);}catch(e){} }); return geo[l]; })
    .catch(err=>{ loading[l]=null; throw err; });
  return loading[l];
}
function anyGeo(){ return geo.lo||geo.xlo||geo.hi; }
function degAcross(doc){ return doc.frame.w/(doc.view.scale*kxOf(doc.view.proj))*180/Math.PI; }
function wantLod(doc){ const d=doc.layers.detail; if(LODS[d]) return d; const a=degAcross(doc); return a>=200?'xlo':a>=85?'lo':'hi'; }
function G(doc){ const w=wantLod(doc); if(geo[w]) return geo[w]; loadLod(w).catch(()=>{}); return anyGeo(); }
function currentLodName(doc){ const w=wantLod(doc); if(geo[w]) return w; return ['lo','xlo','hi'].find(k=>geo[k])||null; }
function ensureGeo(doc){ return loadLod(wantLod(doc)); }

/* ───────── 지명 사전 ───────── */
let places=null, placesLoading=null;
function loadPlaces(){
  if(places) return Promise.resolve(places);
  if(!placesLoading) placesLoading=rawData('places').then(rows=>{
    places=rows.map(r=>{ const o={ko:r[0],en:r[1],country:r[2],lat:r[3],lon:r[4],rank:r[5]};
      o.k=norm(o.ko); o.e=String(o.en).toLowerCase(); o.ek=norm(o.en); o.al=r[6]?r[6].split('|').map(norm):[]; o.area=r[8]&&typeof r[8]==='object'?r[8]:null; return o; });
    return places;
  }).catch(e=>{ placesLoading=null; throw e; });
  return placesLoading;
}
function searchPlaces(q,limit=8){
  if(!places) return [];
  const qn=norm(q), ql=String(q).trim().toLowerCase(); if(!qn) return [];
  const hits=[];
  for(const p of places){
    let s=-1;
    if(p.k===qn||p.al.includes(qn)) s=0; else if(p.e===ql||p.ek===qn) s=0;
    else if(p.k.startsWith(qn)||p.al.some(a=>a.startsWith(qn))) s=1; else if(p.e.startsWith(ql)) s=1;
    else if(p.k.includes(qn)) s=2;
    if(s>=0) hits.push([s,p]); if(hits.length>600) break;
  }
  hits.sort((a,b)=>a[0]-b[0]||a[1].rank-b[1].rank);
  return hits.slice(0,limit).map(h=>h[1]);
}
function exactPlaces(name){
  if(!places) return [];
  const n=norm(name), e=String(name).trim().toLowerCase();
  return places.filter(p=>p.k===n||p.al.includes(n)||p.e===e||p.ek===n);
}
function distKm(a,b){ return d3.geoDistance([a[0],a[1]],[b[0],b[1]])*6371; }
/* {ko,en,lat,lon} → 사전 좌표로 맞춤. 좌표가 주어지면 같은 이름 중 가장 가까운 곳(250 km 이내)을 고름 */
function resolvePlace(p){
  const hasXY=isFinite(+p.lat)&&isFinite(+p.lon)&&p.lat!==null&&p.lon!==null&&p.lat!==''&&p.lon!=='';
  const names=[p.ko,p.en,p.name].filter(Boolean);
  let cands=[]; for(const n of names) for(const c of exactPlaces(n)) if(!cands.includes(c)) cands.push(c);
  if(hasXY){
    const xy=[+p.lon,+p.lat];
    let best=null,bd=Infinity; for(const c of cands){ const d=distKm(xy,[c.lon,c.lat]); if(d<bd){bd=d;best=c;} }
    if(best&&bd<250) return {name:p.ko||best.ko,lat:best.lat,lon:best.lon,src:'사전',country:best.country};
    return {name:p.ko||p.en||p.name||'',lat:+p.lat,lon:+p.lon,src:cands.length?'Claude 좌표':'좌표'};
  }
  if(!cands.length) return null;
  cands.sort((a,b)=>a.rank-b.rank);
  const c=cands[0];
  return {name:p.ko||c.ko,lat:c.lat,lon:c.lon,src:'사전',country:c.country,alt:cands.length>1?cands.slice(1,4):null};
}
function findCountry(q){
  const g=anyGeo(); if(!g||!q) return null;
  let s=String(q).trim(); const up=s.toUpperCase();
  if(/^[A-Z]{3}$/.test(up)){ const id=ISO_FIX[up]||up; if(g.byId.has(id)) return g.byId.get(id); }
  const qn=norm(s);
  for(const f of g.countries) if(f.properties.names.has(qn)) return f;
  return null;
}
function searchCountries(q,limit=4){
  const g=anyGeo(); if(!g) return []; const qn=norm(q); if(!qn) return [];
  const ex=findCountry(q);
  const list=g.countries.filter(f=>f!==ex&&f.properties.key.includes(qn)).sort((a,b)=>(norm(b.properties.ko).startsWith(qn)-norm(a.properties.ko).startsWith(qn)));
  return (ex?[ex]:[]).concat(list).slice(0,limit);
}

/* ───────── 좌표 ───────── */
function fmtLat(v){ const a=Math.abs(v); return (a<0.005?'0':a.toFixed(2))+'°'+(a<0.005?'':(v>0?'N':'S')); }
function fmtLon(v){ v=((v+540)%360)-180; const a=Math.abs(v); return (a<0.005?'0':a.toFixed(2))+'°'+(a<0.005||Math.abs(a-180)<0.005?'':(v>0?'E':'W')); }
function fmtTick(t){ const a=Math.abs(t.v); const n=(Math.round(a*100)/100).toString();
  if(a===0) return '0°'; if(t.k==='lon'&&a===180) return '180°';
  return n+'°'+(t.k==='lat'?(t.v>0?'N':'S'):(t.v>0?'E':'W')); }
function parseCoord(s){
  const re=/(북위|남위|동경|서경|[NSEWnsew])?\s*(-?\d+(?:\.\d+)?)\s*(?:°|도)?\s*(?:(\d+(?:\.\d+)?)\s*(?:['′]|분))?\s*(?:(\d+(?:\.\d+)?)\s*(?:["″]|초))?\s*([NSEWnsew](?![a-zA-Z]))?/g;
  const out=[]; let m;
  while((m=re.exec(s))&&out.length<2){
    if(m[2]==null){ if(re.lastIndex===m.index) re.lastIndex++; continue; }
    let v=Math.abs(+m[2])+(m[3]?+m[3]/60:0)+(m[4]?+m[4]/3600:0);
    if(+m[2]<0) v=-v;
    const h=(m[1]||m[5]||'').toUpperCase();
    let axis=null;
    if(/^(N|S|북위|남위)$/.test(h)) axis='lat'; else if(/^(E|W|동경|서경)$/.test(h)) axis='lon';
    if(/^(S|W|남위|서경)$/.test(h)) v=-Math.abs(v);
    out.push({v,axis});
  }
  if(out.length<2) return null;
  let lat,lon;
  if(out[0].axis==='lon'||out[1].axis==='lat'){lon=out[0].v;lat=out[1].v;} else {lat=out[0].v;lon=out[1].v;}
  if(Math.abs(lat)>90||Math.abs(lon)>180) return null;
  return {lat,lon};
}

/* ───────── 도형 계산 ───────── */
const gray=v=>{const h=Math.round(clamp(v,0,255)).toString(16).padStart(2,'0'); return '#'+h+h+h;};
function toneColor(doc,t){ const s=doc.style.shade; return t==='light'?gray(Math.min(s+30,212)):t==='dark'?gray(s-58):t==='black'?'#1a1a1a':gray(s); }
function markerR(doc,it){ if(it.t!=='pt') return 0; return it.mk==='dot'?doc.style.dot/2:it.mk==='ring'?doc.style.ring/2:0; }
function exR(doc,ex){ return ex.mk==='dot'?doc.style.dot/2:ex.mk==='ring'?doc.style.ring/2:0; }
function labelFont(doc){ return `${doc.style.fontPt*MMPT}px ${fontStack(doc,false)}`; }
/* 바다 이름은 기호 글자보다 조금 작게(style.seaK 배) 쓴다 */
function seaFont(doc){ return `${doc.style.fontPt*MMPT*(doc.style.seaK||0.8)}px ${fontStack(doc,false)}`; }
function itemFont(doc,it){ return it&&it.sea?seaFont(doc):labelFont(doc); }
/* 아주 작은 글자 크기에서는 브라우저가 글자 높이를 정수로 반올림하므로, 100px로 재서 줄여 씀 */
const mCache=new Map();
function metrics(ctx,text){
  const f=String(ctx.font||'10px serif'); const key=f+'\u0001'+text; const hit=mCache.get(key); if(hit) return hit;
  const mm=/([\d.]+)px/.exec(f); const size=mm?+mm[1]:10; const prev=probe.font;
  probe.font=f.replace(/([\d.]+)px/,'100px'); const m=probe.measureText(text); probe.font=prev;
  const k=size/100, A=(m.actualBoundingBoxAscent||0)*k, D=(m.actualBoundingBoxDescent||0)*k;
  const r={W:m.width*k,A,D,H:A+D}; if(mCache.size>2000) mCache.clear(); mCache.set(key,r); return r;
}
function boxEdge(b,p,pad){
  const cx=b.x+b.w/2, cy=b.y+b.h/2, dx=p[0]-cx, dy=p[1]-cy, hw=b.w/2+pad, hh=b.h/2+pad;
  if(Math.abs(dx)<=hw&&Math.abs(dy)<=hh) return null;
  const t=Math.min(Math.abs(dx)>1e-9?hw/Math.abs(dx):Infinity, Math.abs(dy)>1e-9?hh/Math.abs(dy):Infinity);
  return [cx+dx*t,cy+dy*t];
}
function ellPoint(g,toward){
  const rot=(g.it.rot||0)*RAD, c=Math.cos(rot), s=Math.sin(rot);
  const dx=toward[0]-g.a[0], dy=toward[1]-g.a[1];
  const lx=dx*c+dy*s, ly=-dx*s+dy*c; const th=Math.atan2(ly/g.ry,lx/g.rx);
  const px=g.rx*Math.cos(th), py=g.ry*Math.sin(th);
  return [g.a[0]+px*c-py*s, g.a[1]+px*s+py*c];
}
function geomOf(doc,it,P,ctx){
  const a=P([it.lon,it.lat])||[NaN,NaN];
  const g={it,a,r:markerR(doc,it),leaders:[],extras:[]};
  if(it.t==='ell'){ g.rx=it.rx*P.scale(); g.ry=it.ry*P.scale(); }
  if(it.t==='shade'&&it.ring){ g.ring={a:P([it.ring.lon,it.ring.lat])||[NaN,NaN],rx:it.ring.rx*P.scale(),ry:it.ring.ry*P.scale(),rot:it.ring.rot||0}; }
  if(it.lbl){
    let m; if(it.sea){ const pf=ctx.font; ctx.font=seaFont(doc); m=metrics(ctx,it.lbl); ctx.font=pf; } else m=metrics(ctx,it.lbl); const cx=a[0]+it.dx, cy=a[1]+it.dy;
    g.cx=cx; g.cy=cy; g.base=cy+(m.A-m.D)/2; g.box={x:cx-m.W/2,y:cy-m.H/2,w:m.W,h:m.H};
    const mode=it.leader||'auto';
    let from=a;
    if(it.t==='ell') from=ellPoint(g,[cx,cy]);
    else if(g.ring) from=ellPt(g.ring,[cx,cy]);
    const end=boxEdge(g.box,from,0.35);
    if(end){
      const d=Math.hypot(end[0]-from[0],end[1]-from[1]);
      const so=it.t==='pt'?(it.mk==='ring'?g.r:it.mk==='dot'?g.r*0.4:0):0;
      const need=mode==='on'||(mode==='auto'&&d-g.r>(it.t==='pt'?0.8:(it.t==='ell'||g.ring)?0.9:1.1));
      if(need&&d>so+0.25){ const ux=(end[0]-from[0])/d, uy=(end[1]-from[1])/d; g.leaders.push([from[0]+ux*so,from[1]+uy*so,end[0],end[1]]); }
    }
  }
  for(const ex of it.extra||[]){
    const p=P([ex.lon,ex.lat])||[NaN,NaN]; const r=exR(doc,ex); g.extras.push({p,r,mk:ex.mk});
    if(g.box){ const end=boxEdge(g.box,p,0.35); if(end){ const d=Math.hypot(end[0]-p[0],end[1]-p[1]); if(d>0.3){ const ux=(end[0]-p[0])/d, uy=(end[1]-p[1])/d, so=ex.mk==='ring'?r:0; g.leaders.push([p[0]+ux*so,p[1]+uy*so,end[0],end[1]]); } } }
  }
  return g;
}
function placeOffset(doc,dir,it){
  probe.font=labelFont(doc); const m=metrics(probe,it.lbl||'A');
  const r=markerR(doc,it), g=0.45, hx=m.W/2, hy=m.H/2, rd=r*0.72;
  const t={l:[-(r+g+hx),0],r:[r+g+hx,0],t:[0,-(r+g+hy)],b:[0,r+g+hy],
    tl:[-(rd+g+hx),-(rd+g*0.4+hy)],tr:[rd+g+hx,-(rd+g*0.4+hy)],bl:[-(rd+g+hx),rd+g*0.4+hy],br:[rd+g+hx,rd+g*0.4+hy],c:[0,0]};
  return (t[dir]||t.l).map(r3);
}
function countryMain(f){
  if(f._main) return f._main;
  let best=f.geometry;
  if(f.geometry.type==='MultiPolygon'){ let ba=-1; for(const c of f.geometry.coordinates){ const g={type:'Polygon',coordinates:c}; const A=d3.geoArea(g); if(A>ba){ba=A;best=g;} } }
  return (f._main=best);
}
function countryCentroid(f){ return d3.geoCentroid(countryMain(f)); }
function inBounds(b,lon,lat){ if(lat<b[0][1]-0.01||lat>b[1][1]+0.01) return false; const x0=b[0][0],x1=b[1][0]; return x0<=x1?(lon>=x0-0.01&&lon<=x1+0.01):(lon>=x0-0.01||lon<=x1+0.01); }
function countryAt(doc,lon,lat){ const g=G(doc); if(!g) return null; for(const f of g.countries){ if(inBounds(f.bounds,lon,lat)&&d3.geoContains(f,[lon,lat])) return f; } return null; }

/* ───────── 그리기 (캔버스·SVG 공통, 단위 mm) ───────── */
function parallel(lat){ const c=[]; for(let x=-180;x<=180;x+=2) c.push([x,lat]); return {type:'LineString',coordinates:c}; }
/* ───────── 기후 지역: 쾨펜-가이거 기후 구분(열대 A·건조 B·온대 C·냉대 D·한대 E) ─────────
   자료: Beck 외(2023) 1 km 쾨펜-가이거 지도의 1991~2020년 0.1° 판 30갈래를 한 번에 다각형으로 바꿔 위상을 지키며 단순화(data/koppen.json, 속성 k=기호).
   이웃 갈래가 경계를 공유하므로 묶어 칠할 때는 topojson.merge로 합쳐 안쪽 경계선이 안 보이게 한다.
   기후대마다 묶음 단위: one(하나로) · mid(교과서 기후) · detail(쾨펜 기호). zone.only가 있으면 그 갈래만 */
const ZONE_BELTS=[['A','열대 기후'],['B','건조 기후'],['C','온대 기후'],['D','냉대 기후'],['E','한대 기후']];
const ZB={
  A:{one:[['A','열대 기후',['Af','Am','Aw']]],
     mid:[['Af','열대 우림 기후',['Af']],['Am','열대 몬순 기후',['Am']],['Aw','사바나 기후',['Aw']]],
     detail:[['Af','Af',['Af']],['Am','Am',['Am']],['Aw','Aw',['Aw']]]},
  B:{one:[['B','건조 기후',['BWh','BWk','BSh','BSk']]],
     mid:[['BW','사막 기후',['BWh','BWk']],['BS','스텝 기후',['BSh','BSk']]],
     detail:[['BWh','BWh',['BWh']],['BWk','BWk',['BWk']],['BSh','BSh',['BSh']],['BSk','BSk',['BSk']]]},
  C:{one:[['C','온대 기후',['Csa','Csb','Csc','Cwa','Cwb','Cwc','Cfa','Cfb','Cfc']]],
     mid:[['Cs','지중해성 기후',['Csa','Csb','Csc']],['Cw','온대 겨울 건조 기후',['Cwa','Cwb','Cwc']],['Cfa','온난 습윤 기후',['Cfa']],['Cfbc','서안 해양성 기후',['Cfb','Cfc']]],
     detail:['Csa','Csb','Csc','Cwa','Cwb','Cwc','Cfa','Cfb','Cfc'].map(k=>[k,k,[k]])},
  D:{one:[['D','냉대 기후',['Dsa','Dsb','Dsc','Dsd','Dwa','Dwb','Dwc','Dwd','Dfa','Dfb','Dfc','Dfd']]],
     mid:[['Df','냉대 습윤 기후',['Dfa','Dfb','Dfc','Dfd']],['Dw','냉대 겨울 건조 기후',['Dwa','Dwb','Dwc','Dwd']],['Ds','냉대 여름 건조 기후',['Dsa','Dsb','Dsc','Dsd']]],
     detail:['Dsa','Dsb','Dsc','Dsd','Dwa','Dwb','Dwc','Dwd','Dfa','Dfb','Dfc','Dfd'].map(k=>[k,k,[k]])},
  E:{one:[['E','한대 기후',['ET','EF']]],
     mid:[['ET','툰드라 기후',['ET']],['EF','빙설 기후',['EF']]],
     detail:[['ET','ET',['ET']],['EF','EF',['EF']]]}};
const ZONE_LEVELS=['off','one','mid','detail'];
const ZONE_TONES=['light','mid','dark','hatch','hatch2','cross','dots'];
const ZONE_TONE={A:'dark',B:'hatch',C:'light',D:'hatch2',E:'mid',
  Af:'dark',Am:'mid',Aw:'hatch',BW:'dark',BS:'light',BWh:'dark',BWk:'mid',BSh:'hatch',BSk:'hatch2',
  Cs:'dots',Cw:'hatch2',Cfa:'mid',Cfbc:'light',Df:'light',Dw:'hatch',Ds:'cross',ET:'mid',EF:'dots'};
const TONE_CYCLE=['light','mid','dark','hatch','hatch2','cross','dots'];
const ZONE_LEGEND=['none','bl','br','tl','tr','outR','outB'];
const ZONE_LABEL={};   /* 옛 판 호환용(범례 이름은 ZB의 이름을 쓴다) */
/* 옛 판(건조 기후만 있던 때): {kind:'arid', split:'one'|'two'|'four'} → {belts:{B:'one'|'mid'|'detail'}} */
const OLD_SPLIT={one:'one',two:'mid',four:'detail'};
function normZone(z){
  z=z&&typeof z==='object'?z:{}; const b={};
  const src=z.belts&&typeof z.belts==='object'?z.belts:{};
  for(const [k] of ZONE_BELTS) b[k]=ZONE_LEVELS.includes(src[k])?src[k]:'off';
  if(z.kind==='arid'&&b.B==='off') b.B=OLD_SPLIT[z.split]||'one';
  const t={}; for(const [k,v] of Object.entries(z.tone&&typeof z.tone==='object'?z.tone:{})) if(ZONE_TONES.includes(v)) t[k]=v;
  const only=Array.isArray(z.only)?z.only.filter(x=>typeof x==='string').slice(0,40):[];
  return {belts:b,tone:t,only};
}
function zoneOn(doc){ const z=doc.layers.zone; return !!z&&ZONE_BELTS.some(([k])=>z.belts[k]&&z.belts[k]!=='off'); }
let zoneTopo=null, zoneLoading=null; const zoneCache={};
function loadZones(){
  if(zoneTopo) return Promise.resolve(zoneTopo); if(zoneLoading) return zoneLoading;
  zoneLoading=rawData('koppen').then(t=>{ zoneTopo=t; listeners.forEach(fn=>{ try{fn('koppen');}catch(e){} }); return t; }).catch(e=>{ zoneLoading=null; throw e; });
  return zoneLoading;
}
/* allGroups: only를 무시하고(편집기에서 켜고 끄는 목록용) */
function zoneGroups(doc,allGroups){
  const z=doc.layers.zone; if(!z||!z.belts) return []; const out=[];
  for(const [b] of ZONE_BELTS){ const lv=z.belts[b]; if(!lv||lv==='off') continue;
    ZB[b][lv].forEach(([key,ko,cls],i)=>{ if(!allGroups&&z.only&&z.only.length&&!z.only.includes(key)) return;
      out.push({belt:b,key,ko,cls,tone:(z.tone&&z.tone[key])||ZONE_TONE[key]||TONE_CYCLE[i%TONE_CYCLE.length]}); }); }
  return out;
}
function zoneShape(key,cls){
  if(!zoneTopo) return null; const ck=key+'|'+cls.join(','); if(zoneCache[ck]) return zoneCache[ck];
  const o=zoneTopo.objects[Object.keys(zoneTopo.objects)[0]];
  return zoneCache[ck]=topojson.merge(zoneTopo,o.geometries.filter(g=>g.properties&&cls.includes(g.properties.k)));
}
/* ───────── 판의 경계 ─────────
   자료: PB2002(Bird 2003, An updated digital model of plate boundaries), fraxen/tectonicplates GeoJSON(ODC-By 1.0).
   작은 판은 교과서처럼 큰 판에 합치고(같은 큰 판끼리의 경계는 버림), 경계 조각(step)의 종류로 수렴(c)·발산(d)·보존(t)을 나눴다.
   해령을 엇갈리게 하는 짧은 변환 단층(450 km 미만)은 해령(발산)으로 쳤다. names: 큰 판 14개의 이름 자리 */
let plateTopo=null, plateLoading=null; const plateCache={};
function loadPlates(){
  if(plateTopo) return Promise.resolve(plateTopo); if(plateLoading) return plateLoading;
  plateLoading=rawData('plates').then(t=>{ plateTopo=t; listeners.forEach(fn=>{ try{fn('plates');}catch(e){} }); return t; }).catch(e=>{ plateLoading=null; throw e; });
  return plateLoading;
}
function plateLines(k){
  if(!plateTopo) return null; const key=k||'all'; if(plateCache[key]) return plateCache[key];
  const o=plateTopo.objects[Object.keys(plateTopo.objects)[0]];
  return plateCache[key]=topojson.mesh(plateTopo,{type:'GeometryCollection',geometries:o.geometries.filter(g=>!k||(g.properties&&g.properties.k===k))});
}
const PLATE_STYLE={c:'수렴 경계',d:'발산 경계',t:'보존 경계'};
function strokePlate(ctx,k,typed,L,inner){ /* 선 모양: 수렴=굵은 실선, 발산=두 줄(흰 속), 보존=점선. 유형 구분을 끄면 모두 실선 */
  ctx.setLineDash([]); ctx.lineCap='butt'; ctx.strokeStyle='#000000';
  if(!typed){ ctx.lineWidth=0.25*L; ctx.stroke(); return; }
  if(k==='c'){ ctx.lineWidth=0.3*L; ctx.stroke(); }
  else if(k==='d'){ ctx.lineWidth=0.48*L; ctx.stroke(); ctx.lineWidth=0.22*L; ctx.strokeStyle=inner||'#ffffff'; ctx.stroke(); ctx.strokeStyle='#000000'; }
  else { ctx.lineWidth=0.24*L; ctx.setLineDash([0.75,0.4]); ctx.stroke(); ctx.setLineDash([]); }
}
function drawPlates(doc,ctx,path,fw,fh){
  const pl=doc.layers.plates; if(!pl||!pl.on) return;
  if(!plateTopo){ loadPlates().catch(()=>{}); return; }
  const L=doc.style.line;
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,fw,fh); ctx.clip(); ctx.lineJoin='round';
  for(const k of (pl.typed?['d','t','c']:[null])){ const m=plateLines(k); if(!m) continue; ctx.beginPath(); path(m); strokePlate(ctx,k||'c',pl.typed,L); }
  ctx.restore();
}
function drawPlateNames(doc,ctx,P,fw,fh,boxes){ boxes=boxes||[];
  const pl=doc.layers.plates; if(!pl||!pl.on||!pl.names||!plateTopo||!plateTopo.names) return;
  const fs=doc.style.fontPt*MMPT*0.8; ctx.save(); ctx.font=`${fs}px ${fontStack(doc,false)}`; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.lineJoin='round';
  /* 큰 판부터 놓고, 앞서 놓은 이름과 겹치면 뺀다(좁은 지도에서 후안데푸카판·코코스판 등이 빠짐) */
  for(const [,ko,cands] of plateTopo.names){ const w=ctx.measureText(ko).width; let q=null;
    for(const [lon,lat] of cands){ const r=P([lon,lat]); if(!r||!isFinite(r[0])) continue;   /* 이름 자리 후보를 차례로: 틀 안에 들고 다른 이름과 안 겹치는 첫 자리 */
      if(r[0]-w/2<0.5||r[0]+w/2>fw-0.5||r[1]-fs<0.5||r[1]>fh-0.5) continue;
      const b={x:r[0]-w/2-0.3,y:r[1]-fs,w:w+0.6,h:fs*1.25}; if(boxes.some(o=>b.x<o.x+o.w&&o.x<b.x+b.w&&b.y<o.y+o.h&&o.y<b.y+b.h)) continue; boxes.push(b); q=r; break; }
    if(!q) continue;
    ctx.lineWidth=0.6; ctx.strokeStyle='#ffffff'; ctx.strokeText(ko,q[0],q[1]); ctx.fillStyle='#000000'; ctx.fillText(ko,q[0],q[1]); }
  ctx.restore();
}
/* ───────── 습곡 산지·안정 육괴 ─────────
   산맥·고원 다각형: Natural Earth 10m geography regions(퍼블릭 도메인). 고기·신기·안정 육괴 분류는 고등학교 세계지리 교과서 기준으로 정함.
   발트 순상지·아프리카·아라비아 안정 육괴는 직접 그린 모식 경계. 모두 시험 지도 수준의 모식 경계(편집기에서 고르거나 지울 수 있음) */
const RELIEF_CAT=[['shield','안정 육괴'],['old','고기 습곡 산지'],['new','신기 습곡 산지']];
const RELIEF_TONE={shield:'light',old:'hatch',new:'dark'};
function normRelief(r){ r=r&&typeof r==='object'?r:{}; const sh=r.show&&typeof r.show==='object'?r.show:{}; const t={};
  for(const [k,v] of Object.entries(r.tone&&typeof r.tone==='object'?r.tone:{})) if(RELIEF_TONE[k]&&ZONE_TONES.includes(v)) t[k]=v;
  return {on:r.on===true,show:{shield:sh.shield!==false,old:sh.old!==false,new:sh.new!==false},only:Array.isArray(r.only)?r.only.filter(x=>typeof x==='string').slice(0,60):[],tone:t,names:r.names===true}; }
let reliefTopo=null, reliefLoading=null, reliefFeats=null;
function loadRelief(){
  if(reliefTopo) return Promise.resolve(reliefTopo); if(reliefLoading) return reliefLoading;
  reliefLoading=rawData('relief').then(t=>{ reliefTopo=t; const o=t.objects[Object.keys(t.objects)[0]];
    reliefFeats=topojson.feature(t,o).features; reliefFeats.forEach(f=>{ f.properties.cen=d3.geoCentroid(f); });
    listeners.forEach(fn=>{ try{fn('relief');}catch(e){} }); return t; }).catch(e=>{ reliefLoading=null; throw e; });
  return reliefLoading;
}
function reliefList(){ return reliefFeats?reliefFeats.map(f=>({id:f.properties.id,c:f.properties.c,ko:f.properties.ko})):[]; }
function reliefShown(doc){ const r=doc.layers.relief; if(!r||!r.on||!reliefFeats) return [];
  return reliefFeats.filter(f=>r.show[f.properties.c]&&(!r.only.length||r.only.includes(f.properties.id))); }
function reliefTone(doc,c){ const r=doc.layers.relief; return (r.tone&&r.tone[c])||RELIEF_TONE[c]; }
function drawRelief(doc,ctx,path,g,fw,fh){
  const r=doc.layers.relief; if(!r||!r.on) return; if(!reliefTopo){ loadRelief().catch(()=>{}); return; }
  const L=doc.style.line, shown=reliefShown(doc); if(!shown.length) return;
  ctx.save(); ctx.beginPath(); path(g.land); ctx.clip();
  for(const [c] of RELIEF_CAT){ const fs=shown.filter(f=>f.properties.c===c); if(!fs.length) continue; const tone=reliefTone(doc,c);
    const fc={type:'FeatureCollection',features:fs};
    fillShape(ctx,doc,path,fc,tone,fw,fh); }
  ctx.restore();
}
function drawReliefNames(doc,ctx,P,fw,fh,boxes){ boxes=boxes||[];
  const r=doc.layers.relief; if(!r||!r.on||!r.names) return; const shown=reliefShown(doc); if(!shown.length) return;
  const fs=doc.style.fontPt*MMPT*0.75; ctx.save(); ctx.font=`${fs}px ${fontStack(doc,false)}`; ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.lineJoin='round';
  for(const f of shown){ const q=P(f.properties.cen); if(!q||!isFinite(q[0])) continue; const t=f.properties.ko, w=ctx.measureText(t).width;
    if(q[0]-w/2<0.5||q[0]+w/2>fw-0.5||q[1]-fs<0.5||q[1]>fh-0.5) continue;
    const b={x:q[0]-w/2-0.3,y:q[1]-fs,w:w+0.6,h:fs*1.25}; if(boxes.some(o=>b.x<o.x+o.w&&o.x<b.x+b.w&&b.y<o.y+o.h&&o.y<b.y+b.h)) continue; boxes.push(b);
    ctx.lineWidth=0.6; ctx.strokeStyle='#ffffff'; ctx.strokeText(t,q[0],q[1]); ctx.fillStyle='#000000'; ctx.fillText(t,q[0],q[1]); }
  ctx.restore();
}
function hatchRect(ctx,x0,y0,w,h,dir,L){ /* 사각형 안을 사선으로 채운다(지도 빗금과 같은 간격) */
  ctx.save(); ctx.beginPath(); ctx.rect(x0,y0,w,h); ctx.clip(); ctx.beginPath(); const st=0.6;
  for(let x=x0-h;x<x0+w+h;x+=st){ if(dir>0){ ctx.moveTo(x,y0+h); ctx.lineTo(x+h,y0); } else { ctx.moveTo(x,y0); ctx.lineTo(x+h,y0+h); } }
  ctx.lineWidth=0.07*L; ctx.strokeStyle='#000000'; ctx.lineCap='butt'; ctx.stroke(); ctx.restore(); }
function dotsRect(ctx,x0,y0,w,h,L){ /* 점무늬: 엇갈린 격자의 작은 점 */
  ctx.save(); ctx.beginPath(); ctx.rect(x0,y0,w,h); ctx.clip(); ctx.beginPath(); const st=0.75, r=0.11*Math.max(0.8,L);
  let row=0; for(let y=y0+st/2;y<y0+h+st;y+=st*0.87,row++) for(let x=x0+(row%2?st/2:0);x<x0+w+st;x+=st){ ctx.moveTo(x+r,y); ctx.arc(x,y,r,0,Math.PI*2); }
  ctx.fillStyle='#000000'; ctx.fill(); ctx.restore(); }
/* 칠 모양 하나로 사각형 칸 채우기(범례 칸) 또는 지금 잘라 둔 영역 채우기 */
function patternRect(ctx,doc,tone,x0,y0,w,h){ const L=doc.style.line;
  if(tone==='hatch'||tone==='hatch2') hatchRect(ctx,x0,y0,w,h,tone==='hatch'?1:-1,L);
  else if(tone==='cross'){ hatchRect(ctx,x0,y0,w,h,1,L); hatchRect(ctx,x0,y0,w,h,-1,L); }
  else if(tone==='dots') dotsRect(ctx,x0,y0,w,h,L);
  else { ctx.fillStyle=toneColor(doc,tone); ctx.fillRect(x0,y0,w,h); } }
function fillShape(ctx,doc,path,shape,tone,fw,fh){
  if(['hatch','hatch2','cross','dots'].includes(tone)){ ctx.save(); ctx.beginPath(); path(shape); ctx.clip(); patternRect(ctx,doc,tone,0,0,fw,fh); ctx.restore(); }
  else { ctx.beginPath(); path(shape); ctx.fillStyle=toneColor(doc,tone); ctx.fill(); } }
/* 범례: 틀 안 모서리에 흰 상자 + 칸(또는 선 견본) + 이름(시험지 범례처럼). 기후 지역과 판의 경계를 한 상자에 */
/* 지금 틀 안에 보이는지: 꼭짓점 표본 중 하나라도 틀 안이면 예, 아니면 틀 안 9점이 도형 안에 드는지(아주 넓은 지역을 확대한 경우) */
const sampleCache=new WeakMap();
function samplePts(shape){
  let s=sampleCache.get(shape); if(s) return s; const all=[];
  const walk=c=>{ if(typeof c[0]==='number') all.push(c); else c.forEach(walk); };
  if(shape.type==='FeatureCollection') shape.features.forEach(f=>f.geometry&&walk(f.geometry.coordinates));
  else { const g=shape.geometry||shape; if(g.coordinates) walk(g.coordinates); }
  const step=Math.max(1,Math.floor(all.length/4000)); s=all.filter((_,i)=>i%step===0); sampleCache.set(shape,s); return s;
}
function visibleIn(shape,P,fw,fh){
  if(!shape) return false;
  for(const c of samplePts(shape)){ const q=P(c); if(q&&q[0]>=0&&q[0]<=fw&&q[1]>=0&&q[1]<=fh) return true; }
  for(const fx of [0.1,0.5,0.9]) for(const fy of [0.1,0.5,0.9]){ const g=P.invert&&P.invert([fw*fx,fh*fy]); if(g&&isFinite(g[0])&&d3.geoContains(shape,g)) return true; }
  return false;
}
/* 기후 지역은 도형이 커서, 한 번 0.5° 격자에 칠해 두고(occ) 틀 안 표본점(32×20)의 경위도로 확인 */
const occCache=new WeakMap();
function occGrid(shape){
  let o=occCache.get(shape); if(o) return o;
  const W=720,H=360, c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
  const pr=d3.geoEquirectangular().scale(W/(2*Math.PI)).translate([W/2,H/2]).precision(0.5);
  x.beginPath(); d3.geoPath(pr,x)(shape); x.fillStyle='#000'; x.fill(); x.lineWidth=1.5; x.strokeStyle='#000'; x.stroke();
  const a=x.getImageData(0,0,W,H).data; o=new Uint8Array(W*H); for(let i=0;i<W*H;i++) o[i]=a[i*4+3]>0?1:0;
  occCache.set(shape,o); return o;
}
function zoneVisible(shape,P,fw,fh){
  if(!shape) return false; const o=occGrid(shape);
  for(let i=0;i<32;i++) for(let j=0;j<20;j++){ const g=P.invert([fw*(i+0.5)/32,fh*(j+0.5)/20]); if(!g||!isFinite(g[0])||!isFinite(g[1])) continue;
    let lon=((g[0]+180)%360+360)%360, lat=g[1]; const cx=Math.min(719,Math.floor(lon*2)), cy=Math.min(359,Math.max(0,Math.floor((90-lat)*2)));
    if(o[cy*720+cx]) return true; }
  return false;
}
let legMemo={k:'',v:null};
function legendEntries(doc){
  const k=JSON.stringify([doc.view,doc.frame,doc.layers.zone,doc.layers.relief,doc.layers.plates,!!zoneTopo,!!reliefTopo,!!plateTopo]);
  if(legMemo.k===k) return legMemo.v; const v=legendEntries0(doc); legMemo={k,v}; return v;
}
function legendEntries0(doc){
  const fw=doc.frame.w, fh=doc.frame.h, P=makeProj(doc.view,fw,fh);
  const e=zoneGroups(doc).filter(g=>!zoneTopo||zoneVisible(zoneShape(g.key,g.cls),P,fw,fh)).map(g=>({kind:'swatch',tone:g.tone,label:g.ko,src:'zone'}));
  { const sh=reliefShown(doc).filter(f=>visibleIn(f,P,fw,fh)); for(const [c,ko] of RELIEF_CAT) if(sh.some(f=>f.properties.c===c)) e.push({kind:'swatch',tone:reliefTone(doc,c),label:ko,src:'relief'}); }
  const pl=doc.layers.plates; if(pl&&pl.on) (pl.typed?['c','d','t']:[null]).forEach(k=>e.push({kind:'line',k:k||'c',typed:pl.typed,label:k?PLATE_STYLE[k]:'판의 경계'}));
  return e;
}
const LEG_GAP=2;   // 지도 밖 범례와 틀 사이(mm)
function legendLayout(doc){
  const pos=doc.layers.legend; if(!pos||pos==='none') return null;
  const ents=legendEntries(doc).filter(x=>x.kind==='line'?!!plateTopo:x.src==='relief'?!!reliefTopo:!!zoneTopo); if(!ents.length) return null;
  const fs=doc.style.fontPt*MMPT*0.75, sw=3.0, sh=1.8, gap=0.9, pad=0.9, rowH=Math.max(sh,fs*1.05)+0.7;
  probe.font=`${fs}px ${fontStack(doc,false)}`;
  const tw=Math.max(...ents.map(t=>probe.measureText(t.label).width));
  return {pos,ents,fs,sw,sh,gap,pad,rowH,W:pad*2+sw+gap+tw,H:pad*2+rowH*ents.length-0.7};
}
/* 범례를 지도 밖에 두면 그만큼 종이가 넓어진다(오른쪽 또는 아래) */
function sheetExtra(doc){
  const pos=doc.layers.legend; if(pos!=='outR'&&pos!=='outB') return {ex:0,ey:0};
  const lay=legendLayout(doc); if(!lay) return {ex:0,ey:0};
  return pos==='outR'?{ex:LEG_GAP+lay.W,ey:Math.max(0,lay.H-doc.frame.h)}:{ex:Math.max(0,lay.W-doc.frame.w),ey:LEG_GAP+lay.H};
}
function drawLegend(doc,ctx,fw,fh){
  const lay=legendLayout(doc); if(!lay) return null;
  const {pos,ents,fs,sw,sh,gap,pad,rowH,W,H}=lay, L=doc.style.line, m=1.2;
  let x0,y0;
  if(pos==='outR'){ x0=fw+LEG_GAP; y0=Math.max(0,fh-H); }        // 틀 오른쪽 밖, 아래쪽 맞춤
  else if(pos==='outB'){ x0=Math.max(0,fw-W); y0=fh+LEG_GAP; }   // 틀 아래 밖, 오른쪽 맞춤
  else { x0=pos[1]==='l'?m:fw-m-W; y0=pos[0]==='t'?m:fh-m-H; }
  ctx.save(); ctx.font=`${fs}px ${fontStack(doc,false)}`;
  ctx.fillStyle='#ffffff'; ctx.fillRect(x0,y0,W,H); ctx.lineWidth=0.1*L; ctx.strokeStyle='#000000'; ctx.strokeRect(x0,y0,W,H);
  ents.forEach((g,i)=>{ const ry=y0+pad+i*rowH, sy=ry+(rowH-0.7-sh)/2, sx=x0+pad;
    if(g.kind==='swatch'){
      patternRect(ctx,doc,g.tone,sx,sy,sw,sh);
      ctx.lineWidth=0.08*L; ctx.strokeStyle='#000000'; ctx.setLineDash([]); ctx.strokeRect(sx,sy,sw,sh); }
    else { ctx.beginPath(); ctx.moveTo(sx,sy+sh/2); ctx.lineTo(sx+sw,sy+sh/2); strokePlate(ctx,g.k,g.typed,L); }
    ctx.fillStyle='#000000'; ctx.textAlign='left'; ctx.textBaseline='alphabetic'; ctx.font=`${fs}px ${fontStack(doc,false)}`;
    ctx.fillText(g.label,sx+sw+gap,sy+sh/2+fs*0.36); });
  ctx.restore(); return (pos==='outR'||pos==='outB')?null:{x:x0,y:y0,w:W,h:H};
}
function drawZones(doc,ctx,path,g,fw,fh){
  const zg=zoneGroups(doc); if(!zg.length) return;
  if(!zoneTopo){ loadZones().catch(()=>{}); return; }
  ctx.save(); ctx.beginPath(); path(g.land); ctx.clip();   // 해안선 밖으로 번지지 않게 육지 안에서만
  for(const z of zg){ const sh=zoneShape(z.key,z.cls); if(sh) fillShape(ctx,doc,path,sh,z.tone,fw,fh); }
  ctx.restore();
}
function drawBase(doc,ctx,P,fw,fh,withFrame){
  const g=G(doc), path=d3.geoPath(P,ctx), L=doc.style.line, ly=doc.layers, sea=gray(doc.style.sea);
  const sph=PROJS[doc.view.proj].sphere;
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,fw,fh); ctx.clip();
  if(sph){ ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,fw,fh); ctx.beginPath(); path({type:'Sphere'}); ctx.fillStyle=sea; ctx.fill(); }
  else { ctx.fillStyle=sea; ctx.fillRect(0,0,fw,fh); }
  if(g){
    ctx.beginPath(); path(g.land); ctx.fillStyle='#ffffff'; ctx.fill();
    for(const it of doc.items) if(it.t==='shade'){ const f=g.byId.get(it.cid); if(!f) continue; ctx.beginPath(); path(f); ctx.fillStyle=toneColor(doc,it.tone); ctx.fill(); }
    drawRelief(doc,ctx,path,g,fw,fh);
    drawZones(doc,ctx,path,g,fw,fh);   // 기후 지역은 나라 음영 위에(둘 다 보이게)
    const minA=0.3/(P.scale()*P.scale());
    const lakes=ly.lakes?g.lakes.filter(f=>f.area>minA):[];
    if(lakes.length){ ctx.beginPath(); lakes.forEach(f=>path(f)); ctx.fillStyle=sea; ctx.fill(); }
    ctx.strokeStyle='#000000'; ctx.lineJoin='round'; ctx.lineCap='round';
    if(ly.grat>0){ ctx.beginPath(); path(d3.geoGraticule().extent([[-180,-89.999],[180,89.999]]).step([ly.grat,ly.grat])()); ctx.lineWidth=0.08*L; ctx.setLineDash([0.3,0.35]); ctx.stroke(); ctx.setLineDash([]); }
    const lines=[]; if(ly.lines.eq) lines.push([0,false]); if(ly.lines.tr) lines.push([23.44,true],[-23.44,true]); if(ly.lines.ac) lines.push([66.56,true],[-66.56,true]);
    for(const [lat,dash] of lines){ ctx.beginPath(); path(parallel(lat)); ctx.lineWidth=0.1*L; ctx.setLineDash(dash?[0.6,0.4]:[]); ctx.stroke(); }
    ctx.setLineDash([]);
    const rv=[]; const maxSr={xlo:2,lo:3,hi:4}[currentLodName(doc)]||3;
    if(ly.major) g.riversAll.forEach(f=>{ if((f.properties.sr||9)<=maxSr) rv.push(f); });
    for(const k of ly.rivers){ const a=g.rivers.get(k); if(a) rv.push(...a); }
    if(rv.length){ ctx.beginPath(); rv.forEach(f=>path(f)); ctx.lineWidth=0.11*L; ctx.stroke(); }
    if(ly.borders){ ctx.beginPath(); path(g.borders); ctx.setLineDash([0.5,0.32]); ctx.lineWidth=0.1*L; ctx.lineCap='butt'; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap='round'; }
    ctx.beginPath(); path(g.coast); ctx.lineWidth=0.12*L; ctx.stroke();
    drawKoreaIslands(doc,ctx,P,g,fw,fh);
    if(lakes.length){ ctx.beginPath(); lakes.forEach(f=>path(f)); ctx.lineWidth=0.1*L; ctx.stroke(); }
    drawPlates(doc,ctx,path,fw,fh);
    if(sph){ ctx.beginPath(); path({type:'Sphere'}); ctx.lineWidth=0.12*L; ctx.stroke(); }
  }
  ctx.restore();
  if(withFrame){ ctx.lineWidth=0.2*L; ctx.strokeStyle='#000000'; ctx.strokeRect(0,0,fw,fh); }
}
/* 울릉도·독도: 지도 자료(Natural Earth)는 독도가 없고, 울릉도는 '자세히'에만 있다.
   한반도가 보이는 지도(가로 150° 이하)에서는 해안선 단계와 상관없이 작은 섬으로 그린다. 대한민국을 칠했으면 같은 명암으로 */
/* 울릉도·독도: 통계청 SGIS 행정 경계(vuski/admdongkor 가공, 공공누리 제1유형·CC BY 4.0)에서 울릉군의 섬 다섯 개
   (울릉도·죽도·관음도, 독도 서도·동도)를 단순화한 윤곽(경도, 위도). Natural Earth에는 독도가 없고, 울릉도는 가장 자세한 해안선에만
   꼭짓점 몇 개짜리로 있어서(prep에서 지움) 두 섬 모두 이 윤곽으로 그린다.
   실제 크기로 그리되, 틀 위에서 너무 작으면 시험지 지도처럼 작은 검은 점으로 찍는다(울릉도 지름 0.22 mm, 독도 0.15 mm, 선 굵기에 비례).
   2024학년도 수능 세계지리 6번 세계 지도(가로 약 107 mm)에서 두 섬은 지름 0.1 mm 남짓한 점이다 */
const KOREA_ISL=[
  {key:'ul',min:0.22,rings:[[[130.8741,37.4531],[130.872,37.4542],[130.8688,37.4589],[130.866,37.46],[130.8629,37.4609],[130.8561,37.4599],[130.8499,37.4639],[130.8403,37.4632],[130.8383,37.4656],[130.8335,37.4671],[130.8311,37.4666],[130.8292,37.4685],[130.8288,37.4708],[130.8265,37.4726],[130.8134,37.4742],[130.8104,37.4758],[130.8079,37.4825],[130.802,37.4853],[130.8011,37.4909],[130.8042,37.5],[130.8014,37.5018],[130.8018,37.5031],[130.8049,37.5044],[130.8048,37.5054],[130.8041,37.5064],[130.8001,37.5076],[130.7958,37.5143],[130.7927,37.5155],[130.7913,37.5201],[130.7935,37.5216],[130.7938,37.5229],[130.792,37.5249],[130.7966,37.5254],[130.8006,37.5249],[130.8015,37.5207],[130.8042,37.5203],[130.806,37.5223],[130.8143,37.5235],[130.8252,37.5311],[130.8293,37.5305],[130.8256,37.5305],[130.8241,37.5287],[130.8291,37.5276],[130.8353,37.5314],[130.8467,37.5362],[130.8494,37.5362],[130.8521,37.535],[130.8575,37.5352],[130.8688,37.5371],[130.8776,37.5434],[130.8815,37.5436],[130.8932,37.5407],[130.8964,37.5423],[130.899,37.5468],[130.9075,37.5489],[130.9106,37.5466],[130.9103,37.544],[130.9124,37.5414],[130.92,37.5419],[130.9214,37.5406],[130.9212,37.5399],[130.9137,37.5376],[130.9129,37.5365],[130.9139,37.5356],[130.9091,37.5284],[130.9125,37.5207],[130.9176,37.5187],[130.9194,37.5135],[130.918,37.5078],[130.9158,37.5062],[130.9165,37.503],[130.9146,37.4968],[130.915,37.4916],[130.9138,37.4871],[130.9145,37.4865],[130.9185,37.4874],[130.9207,37.487],[130.9213,37.4847],[130.9158,37.4821],[130.9131,37.4818],[130.9115,37.4827],[130.9089,37.4807],[130.9097,37.4794],[130.9069,37.4765],[130.9022,37.4748],[130.8962,37.4756],[130.8838,37.4708],[130.877,37.4637],[130.8796,37.4609],[130.8761,37.4623],[130.8753,37.4547],[130.8741,37.4531]],[[130.939,37.5247],[130.9384,37.5252],[130.9369,37.5272],[130.9366,37.5282],[130.9369,37.53],[130.9385,37.5313],[130.9391,37.5314],[130.9415,37.5308],[130.9419,37.5298],[130.9412,37.5255],[130.9403,37.5248],[130.9397,37.5246],[130.939,37.5247]],[[130.9233,37.5417],[130.9206,37.5429],[130.9207,37.5436],[130.9247,37.5455],[130.925,37.5454],[130.9256,37.5447],[130.9261,37.5446],[130.9254,37.543],[130.9236,37.5418],[130.9233,37.5417]]]},
  {key:'dk',min:0.15,rings:[[[131.8632,37.2423],[131.8635,37.2428],[131.8653,37.2443],[131.8655,37.2443],[131.8662,37.2437],[131.8663,37.2428],[131.8662,37.2426],[131.8669,37.2418],[131.8657,37.2406],[131.8652,37.2402],[131.8634,37.2406],[131.8632,37.2408],[131.8632,37.2423]],[[131.871,37.2408],[131.8713,37.2401],[131.87,37.2384],[131.8695,37.2383],[131.8681,37.2394],[131.8684,37.2405],[131.8688,37.2411],[131.8694,37.2415],[131.8703,37.2418],[131.8703,37.2413],[131.87,37.2404],[131.871,37.2408]]]}];
function drawKoreaIslands(doc,ctx,P,g,fw,fh){
  if(doc.layers.dokdo===false) return;
  const kor=g.byId.get('KOR'); if(!kor) return;
  const sh=doc.items.find(it=>it.t==='shade'&&it.cid==='KOR'), fill=sh?toneColor(doc,sh.tone):'#ffffff', L=doc.style.line, k=Math.max(0.8,Math.min(L,1.4));
  for(const grp of KOREA_ISL){
    const rs=grp.rings.map(r=>r.map(p=>P(p))); if(rs.some(r=>r.some(q=>!q||!isFinite(q[0])))) continue;
    const box=r=>{ let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity; for(const q of r){ x0=Math.min(x0,q[0]); x1=Math.max(x1,q[0]); y0=Math.min(y0,q[1]); y1=Math.max(y1,q[1]); } return {x0,y0,x1,y1}; };
    const b=grp.key==='ul'?box(rs[0]):box(rs.flat());   // 울릉도는 본섬 크기로 판단
    if(b.x1<0||b.y1<0||b.x0>fw||b.y0>fh) continue;
    const size=Math.max(b.x1-b.x0,b.y1-b.y0), dmin=grp.min*k;
    if(size<dmin*1.6){ ctx.beginPath(); ctx.arc((b.x0+b.x1)/2,(b.y0+b.y1)/2,Math.max(dmin,size)/2,0,Math.PI*2); ctx.fillStyle='#000000'; ctx.fill(); continue; }
    ctx.beginPath(); for(const r of rs){ r.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])); ctx.closePath(); }
    ctx.fillStyle=fill; ctx.fill(); ctx.lineWidth=0.12*L; ctx.lineJoin='round'; ctx.strokeStyle='#000000'; ctx.stroke();
  }
}
/* ───────── 바다 이름(대양·주요 바다) ─────────
   후보 자리(경도, 위도)를 차례로 보고, 글자 상자가 틀 안에 들고 육지·다른 라벨과 가장 덜 겹치는 곳에 둔다.
   글자만 있는 점 항목(sea:true)으로 넣어 편집기에서 끌어 옮길 수 있다. 기호 매기기·정답·라벨 정리에서는 뺀다 */
const OCEANS=['태평양','대서양','인도양','북극해','남극해'];
const SEAS={
 '태평양':[[-150,12],[-140,-12],[175,28],[-160,0],[160,-15],[-125,-28],[150,18],[-170,35],[-110,10]],
 '대서양':[[-40,28],[-28,-15],[-45,38],[-25,5],[-18,-30],[-55,30],[-35,45]],
 '인도양':[[80,-15],[75,-25],[90,-8],[65,-12],[85,-30]],
 '북극해':[[-150,80],[10,84],[60,82],[170,77],[-100,84],[120,79]],
 '남극해':[[0,-60],[90,-62],[-90,-66],[150,-62],[-150,-68]],
 '지중해':[[18,34.3],[5,39],[20,35],[28,34],[13,38.5]],'흑해':[[34,43.4],[32,43]],'카스피해':[[50.8,42],[51,41]],
 '홍해':[[38.3,20.5],[37.5,22]],'페르시아만':[[51.5,27],[52,26.5]],'아라비아해':[[64,15],[62,17],[66,13]],'아덴만':[[48,12.5]],
 '벵골만':[[88,15],[89,13],[87,17]],'남중국해':[[114,14],[113,12],[115,10]],'동중국해':[[125.5,29],[126,30]],'황해':[[123.6,35.5],[123,36.5]],
 '동해':[[134,40],[135,39.5],[133,41]],'오호츠크해':[[150,53],[148,52]],'베링해':[[-178,58],[178,58]],
 '북해':[[3.5,56],[3,55]],'발트해':[[19.5,57.5],[18.5,56]],'노르웨이해':[[2,67],[4,68]],'바렌츠해':[[40,73],[35,72]],
 '카리브해':[[-75,15],[-70,14],[-80,16]],'멕시코만':[[-90,25],[-88,25.5]],'허드슨만':[[-85,60],[-86,58]],'알래스카만':[[-145,57]],
 '기니만':[[2,2],[3,1]],'산호해':[[155,-15],[153,-17]],'태즈먼해':[[160,-38],[162,-36]]};
const SEA_NAMES=Object.keys(SEAS);
function seaLabel(doc,name){ return doc.style.seaSpace===false?name:[...name].join(' '); }
function landMask(doc,P,fw,fh){
  const res=4, W=Math.max(1,Math.ceil(fw*res)), H=Math.max(1,Math.ceil(fh*res)); const c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d',{willReadFrequently:true}); x.setTransform(res,0,0,res,0,0); const g=G(doc);
  if(g){ x.beginPath(); d3.geoPath(P,x)(g.land); x.fillStyle='#000'; x.fill(); }
  const d=x.getImageData(0,0,W,H).data; const S=new Float64Array((W+1)*(H+1));
  for(let j=0;j<H;j++){ let row=0; for(let i=0;i<W;i++){ row+=d[(j*W+i)*4+3]>40?1:0; S[(j+1)*(W+1)+i+1]=S[j*(W+1)+i+1]+row; } }
  return b=>{ const x0=Math.max(0,Math.floor(b.x*res)), y0=Math.max(0,Math.floor(b.y*res)), x1=Math.min(W,Math.ceil((b.x+b.w)*res)), y1=Math.min(H,Math.ceil((b.y+b.h)*res));
    if(x1<=x0||y1<=y0) return 1; const A=(x1-x0)*(y1-y0); return (S[y1*(W+1)+x1]-S[y0*(W+1)+x1]-S[y1*(W+1)+x0]+S[y0*(W+1)+x0])/A; };
}
/* names 가운데 지금 틀에 놓을 수 있는 것을 바다 이름 항목으로 더한다. 돌려주는 값: 못 놓은 이름 */
function placeSeas(doc,names,opt){ const force=!!(opt&&opt.force), tight=[];
  const fw=doc.frame.w, fh=doc.frame.h, P=makeProj(doc.view,fw,fh); const land=landMask(doc,P,fw,fh);
  probe.font=labelFont(doc); const obst=tickBoxes(doc,probe,P,fw,fh).map(t=>padBox(t.box,1.5));
  for(const it of doc.items){ const gm=geomOf(doc,it,P,probe); if(gm.box) obst.push(padBox(gm.box,0.4)); if(it.t==='pt'&&it.mk!=='none'&&gm.a&&isFinite(gm.a[0])) obst.push({x:gm.a[0]-1,y:gm.a[1]-1,w:2,h:2}); }
  const miss=[];
  // 후보점 둘레를 조금씩 옮겨 보며 육지·다른 글자와 덜 겹치는 자리를 고른다. 띄어 쓴 이름이 육지에 걸리면 붙여 쓴 이름도 본다
  const mmDeg=P.scale()*Math.PI/180;
  const tryLabel=(lbl,lon,lat,q,cap,wide)=>{ const pf=probe.font; probe.font=seaFont(doc); const m=metrics(probe,lbl); probe.font=pf; let best=null;
    const cx0=cap*mmDeg, cy0=cap*mmDeg/Math.max(0.2,Math.cos(lat*RAD));
    const rx=wide?cx0:Math.min(Math.max(m.W*0.5,4),cx0), ry=wide?cy0:Math.min(Math.max(m.H*1.2,3),cy0), nx=wide?8:4, ny=wide?8:3;
    for(let oy=-ry;oy<=ry+1e-6;oy+=ry/ny) for(let ox=-rx;ox<=rx+1e-6;ox+=rx/nx){
      const cx=q[0]+ox, cy=q[1]+oy, b={x:cx-m.W/2,y:cy-m.H/2,w:m.W,h:m.H};
      if(b.x<0.8||b.y<0.8||b.x+b.w>fw-0.8||b.y+b.h>fh-0.8) continue;
      if(land({x:cx-0.3,y:cy-0.3,w:0.6,h:0.6})>0.5) continue;   // 가운데가 육지면 안 됨
      const lf=land(b); let sc=lf*1000+Math.hypot(ox/rx,oy/ry)*6; for(const o of obst) sc+=ovArea(b,o)/(b.w*b.h)*400;
      if(!best||sc<best.sc) best={sc,cx,cy,b,lbl,lf}; }
    return best; };
  for(const name of names){
    if(!SEAS[name]||doc.items.some(it=>it.sea&&it.name===name)) continue;
    const spaced=seaLabel(doc,name); let best=null;
    const cap=OCEANS.includes(name)?15:3;   // 후보점에서 옮길 수 있는 거리(도): 좁은 바다는 이웃 바다로 넘어가지 않게 짧게
    // 1차: 후보점 바로 둘레, 2차(1차에 자리가 없거나 육지에 걸리면): 후보점에서 cap 도까지 넓혀서
    for(const wide of [false,true]){
      if(wide&&best&&best.lf<=0.12) break;
      for(const [lon,lat] of SEAS[name]){ const q=P([lon,lat]); if(!q||!isFinite(q[0])) continue;
        let r=tryLabel(spaced,lon,lat,q,cap,wide);
        if(spaced!==name&&(!r||r.lf>0.02)){ const r2=tryLabel(name,lon,lat,q,cap,wide); if(r2&&(!r||r2.sc<r.sc)) r=r2; }
        if(r&&(!best||r.sc+(wide?8:0)<best.sc)) best=r; } }
    if(!best||(best.lf>(OCEANS.includes(name)?0.05:0.12)&&!force)){ miss.push(name); continue; }   // 글자가 육지를 많이 덮으면 놓지 않는다(force면 놓고 알림)
    if(best.lf>0.12) tight.push(name);
    const ll=P.invert([best.cx,best.cy]); if(!ll){ miss.push(name); continue; }
    doc.items.push({id:uid(),t:'pt',mk:'none',lbl:best.lbl,name,sea:true,lon:+ll[0].toFixed(3),lat:+ll[1].toFixed(3),dx:0,dy:0,leader:'off',halo:false,extra:[]});
    obst.push(padBox(best.b,0.4));
  }
  miss.tight=tight; return miss;
}
function drawOverlay(doc,ctx,P,fw,fh){
  const L=doc.style.line;
  ctx.font=labelFont(doc);
  const geoms=doc.items.map(it=>geomOf(doc,it,P,ctx));
  ctx.save(); ctx.beginPath(); ctx.rect(0,0,fw,fh); ctx.clip();
  ctx.strokeStyle='#000000'; ctx.fillStyle='#000000'; ctx.lineJoin='round'; ctx.lineCap='round';
  for(const g of geoms){ const e=g.it.t==='ell'?{a:g.a,rx:g.rx,ry:g.ry,rot:g.it.rot||0}:g.ring; if(!e||!isFinite(e.a[0])) continue;
    ctx.beginPath(); ctx.ellipse(e.a[0],e.a[1],Math.max(e.rx,0.1),Math.max(e.ry,0.1),e.rot*RAD,0,Math.PI*2); ctx.setLineDash([0.7,0.35]); ctx.lineWidth=0.3*L; ctx.lineCap='butt'; ctx.stroke(); ctx.setLineDash([]); ctx.lineCap='round'; }
  ctx.beginPath(); let any=false;
  for(const g of geoms) for(const l of g.leaders){ ctx.moveTo(l[0],l[1]); ctx.lineTo(l[2],l[3]); any=true; }
  if(any){ ctx.lineWidth=0.12*L; ctx.stroke(); }
  const mark=(p,mk,r)=>{ if(!isFinite(p[0])||mk==='none') return; ctx.beginPath(); ctx.arc(p[0],p[1],r,0,Math.PI*2);
    if(mk==='dot'){ ctx.fillStyle='#000000'; ctx.fill(); } else { ctx.fillStyle='#ffffff'; ctx.fill(); ctx.lineWidth=Math.max(0.2,r*0.24)*L; ctx.strokeStyle='#000000'; ctx.stroke(); } };
  for(const g of geoms){ if(g.it.t==='pt') mark(g.a,g.it.mk,g.r); for(const e of g.extras) mark(e.p,e.mk,e.r); }
  ctx.textAlign='center'; ctx.textBaseline='alphabetic'; ctx.font=labelFont(doc);
  for(const g of geoms) if(g.box&&isFinite(g.cx)){
    ctx.font=itemFont(doc,g.it);
    if(g.it.halo){ ctx.lineJoin='round'; ctx.lineWidth=0.6; ctx.strokeStyle='#ffffff'; ctx.strokeText(g.it.lbl,g.cx,g.base); }
    ctx.fillStyle='#000000'; ctx.fillText(g.it.lbl,g.cx,g.base);
  }
  ctx.restore();
  const lg=drawLegend(doc,ctx,fw,fh);   // 범례를 먼저 놓고, 산지·판 이름은 범례와 겹치면 뺀다
  const nb=lg?[{x:lg.x-0.5,y:lg.y-0.5,w:lg.w+1,h:lg.h+1}]:[];
  const sb=drawScale(doc,ctx,P,fw,fh,lg,geoms); if(sb) nb.push(sb);
  drawReliefNames(doc,ctx,P,fw,fh,nb);
  drawPlateNames(doc,ctx,P,fw,fh,nb);
  drawTicks(doc,ctx,P,fw,fh);
  drawPolarLabels(doc,ctx,P,fw,fh);
  return geoms;
}
/* ───────── 축척 막대 ─────────
   경기도교육청 「평가문항 제작 방법(지리)」: 전도(세계·대륙 규모)를 뺀 지도에는 축척을 적는다.
   길이는 지도 가운데 가로줄의 실제 거리(대권 거리)로 정한다. 위아래로 축척 차이가 크면(세계 전도 등) scaleInfo().vary 가 커진다 */
function niceKm(x){ const p=Math.pow(10,Math.floor(Math.log10(x))); for(const m of [5,2,1]) if(m*p<=x) return m*p; return p; }
function scaleInfo(doc,P,fw,fh){
  P=P||makeProj(doc.view,fw||doc.frame.w,fh||doc.frame.h); fw=fw||doc.frame.w; fh=fh||doc.frame.h;
  const at=y=>{ const a=P.invert([fw*0.4,y]), b=P.invert([fw*0.6,y]); if(!a||!b||!isFinite(a[0])||!isFinite(b[0])) return NaN; return d3.geoDistance(a,b)*6371/(fw*0.2); };
  const c=at(fh/2); if(!isFinite(c)||c<=0) return null;
  const vs=[at(fh*0.1),at(fh*0.9)].filter(isFinite); const vary=vs.length?Math.max(...vs.map(v=>Math.abs(v-c)))/c:0;
  return {kmPerMm:c,vary};
}
function scaleLayout(doc,P,fw,fh,lg,geoms){
  const pos=doc.layers.scale; if(!pos||pos==='none') return null;
  const si=scaleInfo(doc,P,fw,fh); if(!si) return null;
  const km=niceKm(si.kmPerMm*Math.max(fw*0.25,12)), len=km/si.kmPerMm;   /* 막대는 12 mm 이상 */
  const fs=doc.style.fontPt*MMPT*0.75, tk=0.7, kmTxt=String(km).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  probe.font=`${fs}px ${fontStack(doc,false)}`; const tw=probe.measureText(kmTxt).width/2+0.3+probe.measureText('km').width;
  const W=len+tw+1.4, H=fs*0.95+tk+1.3, m=1.2;
  const box=k=>({x:k[1]==='l'?m:fw-m-W,y:k[0]==='t'?m:fh-m-H,w:W,h:H});
  const hit=r=>{ let s=0; if(lg&&!(r.x+r.w<lg.x||lg.x+lg.w<r.x||r.y+r.h<lg.y||lg.y+lg.h<r.y)) s+=10;
    for(const g of geoms||[]){ const p=g.a; if(p&&isFinite(p[0])&&p[0]>r.x-2&&p[0]<r.x+r.w+2&&p[1]>r.y-2&&p[1]<r.y+r.h+2) s+=3; } return s; };
  let k=pos; if(pos==='auto'){ k=['bl','br','tl','tr'].map(c=>[c,hit(box(c))]).sort((a,b)=>a[1]-b[1])[0][0]; }
  const b=box(k); return Object.assign(b,{km,kmTxt,len,fs,tk,vary:si.vary,corner:k});
}
function drawScale(doc,ctx,P,fw,fh,lg,geoms){
  const S=scaleLayout(doc,P,fw,fh,lg,geoms); if(!S) return null;
  const L=doc.style.line, x0=S.x+0.6, y=S.y+S.h-0.55, ty=y-S.tk-0.35;
  ctx.save(); ctx.fillStyle='#ffffff'; ctx.fillRect(S.x,S.y,S.w,S.h);
  ctx.strokeStyle='#000000'; ctx.lineCap='butt'; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0+S.len,y); ctx.lineWidth=0.26*L; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x0,y-S.tk); ctx.moveTo(x0+S.len,y); ctx.lineTo(x0+S.len,y-S.tk); ctx.lineWidth=0.12*L; ctx.stroke();
  ctx.fillStyle='#000000'; ctx.font=`${S.fs}px ${fontStack(doc,false)}`; ctx.textBaseline='alphabetic';
  ctx.textAlign='center'; ctx.fillText('0',x0,ty); ctx.fillText(S.kmTxt,x0+S.len,ty);
  ctx.textAlign='left'; ctx.fillText('km',x0+S.len+ctx.measureText(S.kmTxt).width/2+0.3,ty);
  ctx.restore(); return {x:S.x,y:S.y,w:S.w,h:S.h};
}
function tickBoxes(doc,ctx,P,fw,fh){
  const out=[]; if(!PROJS[doc.view.proj].cyl||!doc.ticks.length) return out;
  ctx.font=labelFont(doc); const mid=P.invert([fw/2,fh/2]); if(!mid) return out;
  for(const t of doc.ticks){
    const label=fmtTick(t); const m=metrics(ctx,label);
    if(t.k==='lat'){ const p=P([mid[0],t.v]); if(!p||p[1]<0.5||p[1]>fh-0.5) continue;
      out.push({t,label,m,y:p[1],box:t.side==='right'?{x:fw-1.3-m.W,y:p[1]-m.H/2,w:m.W+1.3,h:m.H}:{x:0,y:p[1]-m.H/2,w:m.W+1.3,h:m.H}}); }
    else { const p=P([t.v,mid[1]]); if(!p||p[0]<0.5||p[0]>fw-0.5) continue;
      out.push({t,label,m,x:p[0],box:t.side==='top'?{x:p[0]-m.W/2,y:0,w:m.W,h:m.H+1.3}:{x:p[0]-m.W/2,y:fh-1.3-m.H,w:m.W,h:m.H+1.3}}); }
  }
  return out;
}
/* 북극 중심 지도의 경위선 글자: 위선(30°N·60°N)은 경선 하나를 따라 비스듬히, 0° 경선은 틀 가장자리에.
   경위선망을 켰을 때만 그리고, 기호·점과 겹치지 않으며 틀 안에 드는 경선을 고른다(오른쪽으로 뻗는 경선을 먼저) */
function polarLabels(doc,P,fw,fh){
  const out=[]; if(doc.view.proj!=='polar'||!(doc.layers.grat>0)||doc.layers.polarLbl===false) return out;
  const g=doc.layers.grat, lats=30%g===0?[30,60]:[2*g,4*g].filter(l=>l<90);
  const font=`${doc.style.fontPt*MMPT*0.8}px ${fontStack(doc,false)}`;
  const obst=[]; probe.font=labelFont(doc);
  for(const it of doc.items){ const gm=geomOf(doc,it,P,probe); if(gm.box) obst.push(padBox(gm.box,0.3));
    if(it.t==='pt'&&it.mk!=='none'&&isFinite(gm.a[0])) obst.push({x:gm.a[0]-gm.r-0.8,y:gm.a[1]-gm.r-0.8,w:2*gm.r+1.6,h:2*gm.r+1.6}); }
  probe.font=font;
  const rbox=(cx,cy,m,rd)=>{ const hw=m.W/2+0.3, hh=m.H/2+0.3, c=Math.cos(rd), sn=Math.sin(rd); const xs=[],ys=[];
    for(const [x,y] of [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]]){ xs.push(cx+x*c-y*sn); ys.push(cy+x*sn+y*c); }
    return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)}; };
  const inside=b=>b.x>=0.8&&b.y>=0.8&&b.x+b.w<=fw-0.8&&b.y+b.h<=fh-0.8;
  // 경선마다 틀 안에 드는 위선 글자만 모아 점수를 매긴다: 글자 수가 많을수록, 기호·점과 안 겹칠수록, 오른쪽 아래로 뻗는 경선일수록 좋음
  let best=null;
  for(let lon=-180;lon<180;lon+=g){ const lab=[]; let sc=0, ang0=null;
    for(const la of lats){ const a=P([lon,la]), b=P([lon,la-1]); if(!a||!b||!isFinite(a[0])||!isFinite(b[0])) continue;
      const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);   // 바깥(적도) 쪽 방향
      let rd=ang; if(rd>Math.PI/2) rd-=Math.PI; if(rd<-Math.PI/2) rd+=Math.PI;   // 글자가 뒤집히지 않게
      const t=`${la}°N`, m=metrics(probe,t), u=[Math.cos(ang),Math.sin(ang)], k=m.W/2+0.5;
      const cx=a[0]-u[0]*k, cy=a[1]-u[1]*k;   // 위선 바로 안쪽(극 쪽)에 글자 끝이 닿게
      const box=rbox(cx,cy,m,rd); if(!inside(box)) continue;
      let ov=0; for(const o of obst) ov+=ovArea(box,o)/(box.w*box.h); if(ov>0.02) continue;   // 기호·점과 겹치면 이 자리는 버림
      if(lab.some(q=>ovArea(box,q.box)>0)) continue;
      if(ang0==null) ang0=ang; sc+=ov*200; lab.push({t,x:cx,y:cy,rd,m,box}); }
    if(!lab.length) continue;
    let dA=Math.abs(ang0-20*RAD); if(dA>Math.PI) dA=2*Math.PI-dA; sc+=dA/Math.PI*30-lab.length*60;
    if(!best||sc<best.sc) best={sc,lab}; }
  if(best) out.push(...best.lab);
  // 0° 경선: 북극점에서 내려가다 틀을 벗어나는 곳 바로 안쪽, 선의 오른쪽에
  const pole=P([0,90]);
  if(pole&&pole[0]>0&&pole[0]<fw&&pole[1]>0&&pole[1]<fh){ let last=null, outer=null;
    for(let la=89;la>=-30;la-=0.5){ const q=P([0,la]); if(!q||!isFinite(q[0])) break; if(q[0]<0.8||q[1]<0.8||q[0]>fw-0.8||q[1]>fh-0.8){ outer=q; break; } last=q; }
    if(last&&outer){ const t='0°', m=metrics(probe,t); const d=Math.hypot(outer[0]-last[0],outer[1]-last[1])||1, u=[(outer[0]-last[0])/d,(outer[1]-last[1])/d], pr=[-u[1],u[0]];
      let cx=last[0]+pr[0]*(m.W/2+0.7)-u[0]*(m.H/2+0.4), cy=last[1]+pr[1]*(m.W/2+0.7)-u[1]*(m.H/2+0.4);
      cx=clamp(cx,m.W/2+1,fw-m.W/2-1); cy=clamp(cy,m.H/2+1,fh-m.H/2-1);
      out.push({t,x:cx,y:cy,rd:0,m,box:rbox(cx,cy,m,0)}); } }
  out.font=font; return out;
}
function drawPolarLabels(doc,ctx,P,fw,fh){
  const L=polarLabels(doc,P,fw,fh); if(!L.length) return;
  ctx.font=L.font;
  for(const l of L){ const yb=(l.m.A-l.m.D)/2;
    if(typeof SvgCtx==='function'&&ctx instanceof SvgCtx){ const mm=/^([\d.]+)px/.exec(L.font), fz=mm?+mm[1]:3, deg=l.rd*180/Math.PI;
      const at=`font-size="${f3(fz)}" font-family="${esc(fontStack(doc,true))}" text-anchor="middle" transform="translate(${f3(l.x)} ${f3(l.y)}) rotate(${f3(deg)})"`;
      ctx.out.push(`<text x="0" y="${f3(yb)}" ${at} fill="none" stroke="#ffffff" stroke-width="0.5" stroke-linejoin="round">${esc(l.t)}</text>`);
      ctx.out.push(`<text x="0" y="${f3(yb)}" ${at} fill="#000000">${esc(l.t)}</text>`); continue; }
    ctx.save(); ctx.translate(l.x,l.y); ctx.rotate(l.rd); ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.lineJoin='round'; ctx.lineWidth=0.5; ctx.strokeStyle='#ffffff'; ctx.strokeText(l.t,0,yb);
    ctx.fillStyle='#000000'; ctx.fillText(l.t,0,yb); ctx.restore(); }
}
function drawTicks(doc,ctx,P,fw,fh){
  const L=doc.style.line;
  for(const tb of tickBoxes(doc,ctx,P,fw,fh)){
    const {t,label,m}=tb; ctx.font=labelFont(doc); ctx.textBaseline='alphabetic';
    ctx.strokeStyle='#000000'; ctx.fillStyle='#000000'; ctx.lineWidth=0.14*L; ctx.lineCap='butt'; ctx.beginPath();
    if(t.k==='lat'){ const y=tb.y;
      if(t.side==='right'){ ctx.moveTo(fw-0.95,y); ctx.lineTo(fw+0.55,y); ctx.stroke(); ctx.textAlign='right'; ctx.fillText(label,fw-1.3,y+(m.A-m.D)/2); }
      else { ctx.moveTo(-0.55,y); ctx.lineTo(0.95,y); ctx.stroke(); ctx.textAlign='left'; ctx.fillText(label,1.3,y+(m.A-m.D)/2); }
    } else { const x=tb.x; ctx.textAlign='center';
      if(t.side==='top'){ ctx.moveTo(x,-0.55); ctx.lineTo(x,0.95); ctx.stroke(); ctx.fillText(label,x,1.3+m.A); }
      else { ctx.moveTo(x,fh-0.95); ctx.lineTo(x,fh+0.55); ctx.stroke(); ctx.fillText(label,x,fh-1.3-m.D); }
    }
  }
  ctx.textAlign='center';
}
/* 화면용: canvas에 시험지 한 장을 그림 (k = 1 mm당 CSS px) */
function paintSheet(doc,cv,opts){
  const o=opts||{}; const dpr=o.dpr||window.devicePixelRatio||1;
  const W=cv.clientWidth, H=cv.clientHeight; if(!W||!H) return null;
  if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
  const fw=doc.frame.w, fh=doc.frame.h, pad=o.pad||24, {ex,ey}=sheetExtra(doc);
  const k=clamp(Math.min((W-2*pad)/(fw+ex+2*M),(H-2*pad)/(fh+ey+2*M)),1,40);
  const ox=(W-(fw+ex)*k)/2, oy=(H-(fh+ey)*k)/2;
  const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
  c.fillStyle=o.desk||'#c7ccd2'; c.fillRect(0,0,W,H);
  c.save(); c.shadowColor='rgba(0,0,0,.22)'; c.shadowBlur=14; c.shadowOffsetY=3; c.fillStyle='#ffffff'; c.fillRect(ox-M*k,oy-M*k,(fw+ex+2*M)*k,(fh+ey+2*M)*k); c.restore();
  c.setTransform(dpr*k,0,0,dpr*k,dpr*ox,dpr*oy);
  const P=makeProj(doc.view,fw,fh); drawBase(doc,c,P,fw,fh,true); const geoms=drawOverlay(doc,c,P,fw,fh);
  return {k,ox,oy,P,geoms};
}

/* ───────── SVG 출력용 가짜 캔버스 ───────── */
const f3=n=>+(+n).toFixed(3);
function SvgCtx(doc){
  this.doc=doc; this.out=[]; this.defs=[]; this.d=''; this.stack=[]; this.open=0; this.n=0;
  this.fillStyle='#000000'; this.strokeStyle='#000000'; this.lineWidth=1; this.dash=[]; this.font='3px serif';
  this.textAlign='start'; this.textBaseline='alphabetic'; this.lineJoin='miter'; this.lineCap='butt';
}
SvgCtx.prototype={
  save(){ this.stack.push({fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth,dash:this.dash.slice(),font:this.font,textAlign:this.textAlign,lineJoin:this.lineJoin,lineCap:this.lineCap,open:this.open}); this.open=0; },
  restore(){ while(this.open>0){this.out.push('</g>');this.open--;} const s=this.stack.pop(); if(s) Object.assign(this,s); },
  beginPath(){this.d='';}, moveTo(x,y){this.d+=`M${f3(x)} ${f3(y)}`;}, lineTo(x,y){this.d+=`L${f3(x)} ${f3(y)}`;}, closePath(){this.d+='Z';},
  rect(x,y,w,h){this.d+=`M${f3(x)} ${f3(y)}h${f3(w)}v${f3(h)}h${f3(-w)}Z`;},
  arc(x,y,r){this.d+=`M${f3(x+r)} ${f3(y)}A${f3(r)} ${f3(r)} 0 1 1 ${f3(x-r)} ${f3(y)}A${f3(r)} ${f3(r)} 0 1 1 ${f3(x+r)} ${f3(y)}Z`;},
  ellipse(x,y,rx,ry,rot){ const c=Math.cos(rot),s=Math.sin(rot), a=rot*180/Math.PI;
    this.d+=`M${f3(x+rx*c)} ${f3(y+rx*s)}A${f3(rx)} ${f3(ry)} ${f3(a)} 1 1 ${f3(x-rx*c)} ${f3(y-rx*s)}A${f3(rx)} ${f3(ry)} ${f3(a)} 1 1 ${f3(x+rx*c)} ${f3(y+rx*s)}Z`; },
  setLineDash(a){this.dash=a.slice();},
  fill(){ if(this.d) this.out.push(`<path d="${this.d}" fill="${this.fillStyle}"/>`); },
  stroke(){ if(!this.d) return; this.out.push(`<path d="${this.d}" fill="none" stroke="${this.strokeStyle}" stroke-width="${f3(this.lineWidth)}" stroke-linejoin="${this.lineJoin}" stroke-linecap="${this.lineCap}"${this.dash.length?` stroke-dasharray="${this.dash.map(f3).join(' ')}"`:''}/>`); },
  fillRect(x,y,w,h){ this.out.push(`<rect x="${f3(x)}" y="${f3(y)}" width="${f3(w)}" height="${f3(h)}" fill="${this.fillStyle}"/>`); },
  strokeRect(x,y,w,h){ this.out.push(`<rect x="${f3(x)}" y="${f3(y)}" width="${f3(w)}" height="${f3(h)}" fill="none" stroke="${this.strokeStyle}" stroke-width="${f3(this.lineWidth)}"/>`); },
  clip(){ const id='c'+(++this.n); this.defs.push(`<clipPath id="${id}"><path d="${this.d}"/></clipPath>`); this.out.push(`<g clip-path="url(#${id})">`); this.open++; },
  measureText(t){ probe.font=this.font; return probe.measureText(t); },
  _text(t,x,y,extra){ const m=/^([\d.]+)px (.*)$/.exec(this.font)||[0,3,'serif']; const anchor=this.textAlign==='center'?'middle':(this.textAlign==='right'||this.textAlign==='end')?'end':'start';
    this.out.push(`<text x="${f3(x)}" y="${f3(y)}" font-size="${f3(+m[1])}" font-family="${esc(fontStack(this.doc,true))}" text-anchor="${anchor}" ${extra}>${esc(t)}</text>`); },
  fillText(t,x,y){ this._text(t,x,y,`fill="${this.fillStyle}"`); },
  strokeText(t,x,y){ this._text(t,x,y,`fill="none" stroke="${this.strokeStyle}" stroke-width="${f3(this.lineWidth)}" stroke-linejoin="round"`); },
  toString(W,H){ return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${f3(W)}mm" height="${f3(H)}mm" viewBox="${-M} ${-M} ${f3(W)} ${f3(H)}"><defs>${this.defs.join('')}</defs>${this.out.join('')}</svg>`; }
};

/* ───────── 내보내기 ───────── */
async function readyForExport(doc){
  await loadLod(wantLod(doc));
  if(zoneGroups(doc).length) await loadZones().catch(()=>{});
  if(doc.layers.plates&&doc.layers.plates.on) await loadPlates().catch(()=>{});
  if(doc.layers.relief&&doc.layers.relief.on) await loadRelief().catch(()=>{});
  try{ await ensureGlyphs(doc); if(document.fonts) await document.fonts.ready; }catch(e){}
}
async function renderPng(doc,opts){
  const o=opts||{}; const dpi=o.dpi||600;
  await readyForExport(doc);
  const k=dpi/25.4, fw=doc.frame.w, fh=doc.frame.h, {ex,ey}=sheetExtra(doc); const c=document.createElement('canvas');
  c.width=Math.round((fw+ex+2*M)*k); c.height=Math.round((fh+ey+2*M)*k); const x=c.getContext('2d');
  if(o.bg!=='clear'){ x.fillStyle='#ffffff'; x.fillRect(0,0,c.width,c.height); }
  x.setTransform(k,0,0,k,M*k,M*k); const P=makeProj(doc.view,fw,fh);
  drawBase(doc,x,P,fw,fh,true); drawOverlay(doc,x,P,fw,fh);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  return withDpi(blob,dpi);
}
function crc32(b){ let c,crc=-1; for(let n=0;n<b.length;n++){ c=(crc^b[n])&255; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; crc=(crc>>>8)^c; } return (crc^-1)>>>0; }
async function withDpi(blob,d){
  const buf=new Uint8Array(await blob.arrayBuffer()); const ppm=Math.round(d/0.0254);
  const ch=new Uint8Array(21), dv=new DataView(ch.buffer); dv.setUint32(0,9); ch.set([112,72,89,115],4); dv.setUint32(8,ppm); dv.setUint32(12,ppm); ch[16]=1; dv.setUint32(17,crc32(ch.subarray(4,17)));
  const out=new Uint8Array(buf.length+21); out.set(buf.subarray(0,33)); out.set(ch,33); out.set(buf.subarray(33),54); return new Blob([out],{type:'image/png'});
}
async function svgString(doc){
  await readyForExport(doc); const fw=doc.frame.w, fh=doc.frame.h, {ex,ey}=sheetExtra(doc); const s=new SvgCtx(doc); s.fillStyle='#ffffff'; s.fillRect(-M,-M,fw+ex+2*M,fh+ey+2*M);
  const P=makeProj(doc.view,fw,fh); drawBase(doc,s,P,fw,fh,true); drawOverlay(doc,s,P,fw,fh); return s.toString(fw+ex+2*M,fh+ey+2*M);
}
const dlCap=(window.claude&&typeof window.claude.use==='function')?window.claude.use('downloads').catch(()=>null):Promise.resolve(null);
/* 저장: 'saved' | 'declined' | 'busy' | 'failed' */
async function saveFile(name,data,mime){
  const dl=await dlCap;
  if(dl){ try{ await dl.save({filename:name,data}); return 'saved'; } catch(e){ if(e&&e.code==='declined') return 'declined'; if(e&&e.code==='rate_limited') return 'busy'; return 'failed'; } }
  try{
    const blob=data instanceof Blob?data:new Blob([data],{type:mime}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000);
    return 'saved';
  }catch(e){ return 'failed'; }
}
async function copyPng(doc,opts){
  const item=new ClipboardItem({'image/png':renderPng(doc,opts)}); await navigator.clipboard.write([item]);
}

/* ───────── 섬나라 분석 ───────── */
function partsOf(f,P,fw,fh){
  const path=d3.geoPath(P);
  const polys=f.geometry.type==='MultiPolygon'?f.geometry.coordinates.map(c=>({type:'Polygon',coordinates:c})):[f.geometry];
  const out=[];
  for(const g of polys){
    const b=path.bounds(g); if(!isFinite(b[0][0])) continue;
    if(b[1][0]<0||b[0][0]>fw||b[1][1]<0||b[0][1]>fh) continue;
    const A=path.area(g); if(!(A>0.02)) continue;
    out.push({g,A,b});
  }
  return out.sort((x,y)=>y.A-x.A);
}
function isArchipelago(parts){
  if(parts.length<2) return false;
  const total=parts.reduce((s,p)=>s+p.A,0);
  return parts[0].A/total<0.65&&parts.filter(p=>p.A/total>=0.03).length>=2;
}
function partSpot(part,P,fw,fh){
  const c=P(d3.geoCentroid(part.g));
  return interiorSpot(part.g,P,{W:0.5,H:0.5},c||[(part.b[0][0]+part.b[1][0])/2,(part.b[0][1]+part.b[1][1])/2],fw,fh)||c;
}
/* 보이는 섬들을 감싸는 기울어진 타원 (mm) */
function ringFor(parts){
  const total=parts.reduce((s,p)=>s+p.A,0); const pts=[];
  for(const p of parts){ if(p.A<total*0.01) continue; for(const r of [p.g.coordinates[0]]) for(const q of r){ const v=p._P(q); if(v&&isFinite(v[0])) pts.push(v); } }
  if(pts.length<3) return null;
  let mx=0,my=0; for(const [x,y] of pts){ mx+=x; my+=y; } mx/=pts.length; my/=pts.length;
  let sxx=0,syy=0,sxy=0; for(const [x,y] of pts){ sxx+=(x-mx)*(x-mx); syy+=(y-my)*(y-my); sxy+=(x-mx)*(y-my); }
  const th=0.5*Math.atan2(2*sxy,sxx-syy), ux=Math.cos(th), uy=Math.sin(th);
  let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
  for(const [x,y] of pts){ const u=(x-mx)*ux+(y-my)*uy, v=-(x-mx)*uy+(y-my)*ux; if(u<u0)u0=u; if(u>u1)u1=u; if(v<v0)v0=v; if(v>v1)v1=v; }
  const cu=(u0+u1)/2, cv=(v0+v1)/2, a=Math.max((u1-u0)/2,0.6), b=Math.max((v1-v0)/2,0.6);
  let k=0; for(const [x,y] of pts){ const u=(x-mx)*ux+(y-my)*uy-cu, v=-(x-mx)*uy+(y-my)*ux-cv; k=Math.max(k,Math.hypot(u/a,v/b)); }
  const cx=mx+ux*cu-uy*cv, cy=my+uy*cu+ux*cv;
  return {cx,cy,rx:Math.max(a*k+0.9,2),ry:Math.max(b*k+0.9,1.6),rot:th*180/Math.PI};
}
function ringOK(doc,f,r,P,fw,fh){
  if(!r||r.cx<0||r.cx>fw||r.cy<0||r.cy>fh) return false;
  // 타원 안에 다른 나라 땅이 많이 들어가거나(인도네시아·말레이시아), 지도의 큰 부분을 덮으면 점선 원 대신 지시선 방식
  if(Math.PI*r.rx*r.ry>fw*fh*0.2) return false;
  const rot=r.rot*RAD, c=Math.cos(rot), s=Math.sin(rot); let own=0, other=0;
  for(let i=-1;i<=1.0001;i+=0.1) for(let j=-1;j<=1.0001;j+=0.1){ if(i*i+j*j>1) continue;
    const x=r.cx+i*r.rx*c-j*r.ry*s, y=r.cy+i*r.rx*s+j*r.ry*c; if(x<0||y<0||x>fw||y>fh) continue;
    const q=P.invert([x,y]); if(!q) continue; const h=countryAt(doc,q[0],q[1]); if(h===f) own++; else if(h) other++; }
  return own>0&&other<=own*0.2;
}
function chooseCountryStyle(doc,it,P){
  const g=G(doc), f=g&&g.byId.get(it.cid); if(!f) return 'shade';
  const fw=doc.frame.w, fh=doc.frame.h; const parts=partsOf(f,P,fw,fh); parts.forEach(p=>p._P=P);
  if(!isArchipelago(parts)) return 'shade';
  return ringOK(doc,f,ringFor(parts),P,fw,fh)?'circle':'multi';
}
/* style: 'shade' 음영만 | 'circle' 음영 + 점선 원 | 'multi' 음영 + 섬마다 지시선 */
function applyCountryStyle(doc,it,style,P){
  const g=G(doc), f=g&&g.byId.get(it.cid); if(!f) return;
  const fw=doc.frame.w, fh=doc.frame.h; P=P||makeProj(doc.view,fw,fh);
  it.style=style; delete it.ring; it.multi=false; it.extra=[]; it.leader='auto';
  if(style==='circle'){ const parts=partsOf(f,P,fw,fh); parts.forEach(p=>p._P=P); const r=ringFor(parts);
    if(r){ const q=P.invert([r.cx,r.cy]); if(q){ const S=P.scale(); it.ring={lon:r3(q[0]),lat:r3(q[1]),rx:r.rx/S,ry:r.ry/S,rot:r3(r.rot)}; } }
    if(!it.ring) it.style='shade'; }
  else if(style==='multi') it.multi=true;
}
function setMultiPoints(it,f,P,fw,fh){
  const parts=partsOf(f,P,fw,fh); if(!parts.length) return;
  const total=parts.reduce((s,p)=>s+p.A,0);
  const sig=parts.filter(p=>p.A>=total*0.05).slice(0,5);
  const spots=sig.map(p=>partSpot(p,P,fw,fh)).filter(Boolean).map(v=>P.invert(v)).filter(Boolean);
  if(!spots.length) return;
  it.lon=r3(spots[0][0]); it.lat=r3(spots[0][1]);
  it.extra=spots.slice(1).map(q=>({lon:r3(q[0]),lat:r3(q[1]),mk:'none'}));
}

/* ───────── 라벨 자동 배치: 지도 선(해안선·국경·하천)을 그림으로 그려 두고 겹침을 잼 ───────── */
function integral(d,W,H){ const T=new Uint32Array((W+1)*(H+1)); for(let y=0;y<H;y++){ let row=0; for(let x=0;x<W;x++){ row+=d[(y*W+x)*4+3]>40?1:0; T[(y+1)*(W+1)+x+1]=T[y*(W+1)+x+1]+row; } } return T; }
function buildInk(doc,P,fw,fh){
  const res=8, W=Math.max(1,Math.ceil(fw*res)), H=Math.max(1,Math.ceil(fh*res));
  const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d',{willReadFrequently:true});
  x.setTransform(res,0,0,res,0,0); x.lineJoin='round'; x.lineCap='round'; x.strokeStyle='#000'; x.fillStyle='#000';
  const g=G(doc), path=d3.geoPath(P,x), ly=doc.layers;
  if(g){
    x.lineWidth=0.3;
    x.beginPath(); path(g.coast); x.stroke();
    if(ly.borders){ x.beginPath(); path(g.borders); x.stroke(); }
    if(ly.lakes){ const minA=0.3/(P.scale()*P.scale()); x.beginPath(); g.lakes.filter(f=>f.area>minA).forEach(f=>path(f)); x.stroke(); }
    const rv=[]; const maxSr={xlo:2,lo:3,hi:4}[currentLodName(doc)]||3;
    if(ly.major) g.riversAll.forEach(f=>{ if((f.properties.sr||9)<=maxSr) rv.push(f); });
    for(const k of ly.rivers){ const a=g.rivers.get(k); if(a) rv.push(...a); }
    if(rv.length){ x.beginPath(); rv.forEach(f=>path(f)); x.stroke(); }
    const lines=[]; if(ly.lines.eq) lines.push(0); if(ly.lines.tr) lines.push(23.44,-23.44); if(ly.lines.ac) lines.push(66.56,-66.56);
    for(const lat of lines){ x.beginPath(); path(parallel(lat)); x.stroke(); }
    if(ly.grat>0){ x.lineWidth=0.15; x.beginPath(); path(d3.geoGraticule().extent([[-180,-89.999],[180,89.999]]).step([ly.grat,ly.grat])()); x.stroke(); }
  }
  x.lineWidth=0.4;
  for(const it of doc.items){ const e=it.t==='ell'?{lon:it.lon,lat:it.lat,rx:it.rx,ry:it.ry,rot:it.rot}:it.ring; if(!e) continue; const a=P([e.lon,e.lat]); if(!a) continue;
    x.beginPath(); x.ellipse(a[0],a[1],Math.max(e.rx*P.scale(),0.1),Math.max(e.ry*P.scale(),0.1),(e.rot||0)*RAD,0,Math.PI*2); x.stroke(); }
  const d1=x.getImageData(0,0,W,H).data;
  x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,W,H); x.setTransform(res,0,0,res,0,0);
  if(g) for(const it of doc.items) if(it.t==='shade'){ const f=g.byId.get(it.cid); if(f){ x.beginPath(); path(f); x.fill(); } }
  const d2=x.getImageData(0,0,W,H).data;
  const I=integral(d1,W,H), S=integral(d2,W,H);
  const at=(px,py)=>px>=0&&py>=0&&px<W&&py<H&&d1[(py*W+px)*4+3]>40;
  const at2=(px,py)=>px>=0&&py>=0&&px<W&&py<H&&d2[(py*W+px)*4+3]>40;
  return {
    frac(b,shade){ const T=shade?S:I; const x0=clamp(Math.floor(b.x*res),0,W), y0=clamp(Math.floor(b.y*res),0,H), x1=clamp(Math.ceil((b.x+b.w)*res),0,W), y1=clamp(Math.ceil((b.y+b.h)*res),0,H);
      const area=(x1-x0)*(y1-y0); if(area<=0) return 0; return (T[y1*(W+1)+x1]-T[y0*(W+1)+x1]-T[y1*(W+1)+x0]+T[y0*(W+1)+x0])/area; },
    cross(p,q,skip0,skip1,shade){ const L=Math.hypot(q[0]-p[0],q[1]-p[1]); if(L<1e-6) return 0; const n=Math.ceil(L*res*1.5); const f=shade?at2:at; let prev=null,cnt=0;
      for(let i=0;i<=n;i++){ const t=i/n, d=t*L; if(d<skip0||d>L-skip1){ prev=shade?null:false; continue; } const v=f(Math.floor((p[0]+(q[0]-p[0])*t)*res),Math.floor((p[1]+(q[1]-p[1])*t)*res));
        if(shade){ if(prev===false&&v) cnt++; } else if(v&&!prev) cnt++; prev=v; }
      return cnt; }
  };
}
function ovArea(a,b){ const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x), h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y); return w>0&&h>0?w*h:0; }
function circBox(c,b,pad){ const nx=clamp(c[0],b.x-pad,b.x+b.w+pad), ny=clamp(c[1],b.y-pad,b.y+b.h+pad); return Math.hypot(c[0]-nx,c[1]-ny)<c[2]; }
function segHitsBox(p,q,b){ for(let t=0.04;t<0.97;t+=0.04){ const x=p[0]+(q[0]-p[0])*t, y=p[1]+(q[1]-p[1])*t; if(x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h) return true; } return false; }
function segX(a,b,c,d){ const o=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]); const d1=o(c,d,a),d2=o(c,d,b),d3=o(a,b,c),d4=o(a,b,d); return d1*d2<0&&d3*d4<0; }
function distSeg(p,a,b){ const dx=b[0]-a[0], dy=b[1]-a[1]; const L=dx*dx+dy*dy; let t=L?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L:0; t=clamp(t,0,1); return Math.hypot(p[0]-(a[0]+t*dx),p[1]-(a[1]+t*dy)); }
const padBox=(b,p)=>({x:b.x-p,y:b.y-p,w:b.w+2*p,h:b.h+2*p});
const boxAt=(a,off,m)=>({x:a[0]+off[0]-m.W/2,y:a[1]+off[1]-m.H/2,w:m.W,h:m.H});
const ANG16=Array.from({length:16},(_,i)=>i*22.5);
function ellPt(e,toward){
  const rot=(e.rot||0)*RAD, c=Math.cos(rot), s=Math.sin(rot);
  const dx=toward[0]-e.a[0], dy=toward[1]-e.a[1];
  const lx=dx*c+dy*s, ly=-dx*s+dy*c; const th=Math.atan2(ly/e.ry,lx/e.rx);
  const px=e.rx*Math.cos(th), py=e.ry*Math.sin(th);
  return [e.a[0]+px*c-py*s, e.a[1]+px*s+py*c];
}
function labelCands(doc,it,P,fw,fh,g){
  const m=metrics(probe,it.lbl); const out=[];
  const half=(u)=>[u[0]*m.W/2,u[1]*m.H/2];
  if(it.t==='pt'){
    const a=P([it.lon,it.lat]); if(!a) return out; const r=markerR(doc,it); const so=it.mk==='ring'?r:it.mk==='dot'?r*0.4:0;
    const PREF={l:0.3,r:0,tl:1.2,tr:1,bl:1.4,br:1.2,t:2,b:2.2};
    for(const d of Object.keys(PREF)){ const off=placeOffset(doc,d,it); out.push({off,box:boxAt(a,off,m),pref:PREF[d],leaders:[],leaderMode:'auto'}); }
    for(const ang of ANG16){ const u=[Math.cos(ang*RAD),Math.sin(ang*RAD)];
      for(const L of [1.8,3.0,4.4]){ const h=half(u); const off=[u[0]*(r+L)+h[0],u[1]*(r+L)+h[1]]; const box=boxAt(a,off,m);
        const end=boxEdge(box,a,0.35)||[a[0]+off[0],a[1]+off[1]]; out.push({off,box,pref:3+L*1.4,leaders:[[[a[0]+u[0]*so,a[1]+u[1]*so],end]],leaderMode:'auto'}); } }
    return out;
  }
  const ringE=it.t==='ell'?{lon:it.lon,lat:it.lat,rx:it.rx,ry:it.ry,rot:it.rot}:it.ring;
  if(ringE){
    const c=P([ringE.lon,ringE.lat]); const a=P([it.lon,it.lat]); if(!c||!a) return out;
    const E={a:c,rx:ringE.rx*P.scale(),ry:ringE.ry*P.scale(),rot:ringE.rot||0};
    for(const ang of ANG16){ const u=[Math.cos(ang*RAD),Math.sin(ang*RAD)]; const e=ellPt(E,[c[0]+u[0]*1000,c[1]+u[1]*1000]); const h=half(u); const tilt=Math.abs(u[1])*0.8;
      { const ctr=[e[0]+u[0]*0.55+h[0],e[1]+u[1]*0.55+h[1]]; out.push({off:[ctr[0]-a[0],ctr[1]-a[1]],box:boxAt(ctr,[0,0],m),pref:1.6+tilt,leaders:[],leaderMode:'auto',halo:false}); }
      for(const L of [1.6,2.8]){ const ctr=[e[0]+u[0]*L+h[0],e[1]+u[1]*L+h[1]]; const box=boxAt(ctr,[0,0],m); const end=boxEdge(box,e,0.35)||ctr;
        out.push({off:[ctr[0]-a[0],ctr[1]-a[1]],box,pref:0.8+(L-1.6)*1.2+tilt,leaders:[[e,end]],leaderMode:'auto',halo:false}); } }
    return out;
  }
  if(it.t==='shade'){
    const f=g&&g.byId.get(it.cid); if(!f) return out;
    const parts=partsOf(f,P,fw,fh); if(!parts.length) return out;
    if(it.multi){
      const pts=[P([it.lon,it.lat]),...(it.extra||[]).map(e=>P([e.lon,e.lat]))].filter(Boolean); if(!pts.length) return out;
      let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity; const total=parts.reduce((s,p)=>s+p.A,0);
      for(const p of parts){ if(p.A<total*0.03) continue; x0=Math.min(x0,p.b[0][0]); y0=Math.min(y0,p.b[0][1]); x1=Math.max(x1,p.b[1][0]); y1=Math.max(y1,p.b[1][1]); }
      x0=Math.max(x0-6,0.5+m.W/2); y0=Math.max(y0-6,0.5+m.H/2); x1=Math.min(x1+6,fw-0.5-m.W/2); y1=Math.min(y1+6,fh-0.5-m.H/2);
      const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length, cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;
      const step=clamp(Math.min(x1-x0,y1-y0)/18,0.7,2); const a=pts[0];
      for(let x=x0;x<=x1+1e-9;x+=step) for(let y=y0;y<=y1+1e-9;y+=step){ const box=boxAt([x,y],[0,0],m);
        const leaders=pts.map(p=>[p,boxEdge(box,p,0.35)||[x,y]]);
        const len=leaders.reduce((s,l)=>s+Math.hypot(l[1][0]-l[0][0],l[1][1]-l[0][1]),0);
        out.push({off:[x-a[0],y-a[1]],box,pref:len*0.12+Math.hypot(x-cx,y-cy)*0.08,leaders,leaderMode:'auto',halo:false,multi:true}); }
      return out;
    }
    const main=parts[0]; const cen=P(d3.geoCentroid(main.g))||[(main.b[0][0]+main.b[1][0])/2,(main.b[0][1]+main.b[1][1])/2];
    // 나라 안에 들어가는 자리 여러 곳: 무게중심에 가까울수록, 호수·하천 선과 안 겹칠수록 좋음
    for(const sp of interiorSpots(main.g,P,m,cen,fw,fh,60)) out.push({off:[0,0],anchor:sp.p,box:boxAt(sp.p,[0,0],m),pref:sp.d*0.12,leaders:[],leaderMode:'auto',halo:true,inside:true});
    // 나라 밖: 가까운 곳부터 여러 거리·방향에 놓아 보고, 나라 음영·선과 안 겹치는 곳을 고름
    const a=partSpot(main,P,fw,fh)||cen;
    for(const ang of ANG16){ const u=[Math.cos(ang*RAD),Math.sin(ang*RAD)];
      for(const R of [2,3.2,4.4,5.6,7,8.5,10]){ const ctr=[a[0]+u[0]*R,a[1]+u[1]*R]; const box=boxAt(ctr,[0,0],m); const end=boxEdge(box,a,0.35); if(!end) continue;
        out.push({off:[ctr[0]-a[0],ctr[1]-a[1]],anchor:a,box,pref:5+R*0.6,leaders:[[a,end]],leaderMode:'auto',halo:false}); } }
    return out;
  }
  return out;
}
function autoLabel(doc,opts){
  const o=opts||{}; const fw=doc.frame.w, fh=doc.frame.h, P=makeProj(doc.view,fw,fh), g=G(doc);
  probe.font=labelFont(doc);
  for(const it of doc.items) if(it.t==='shade'&&it.multi&&g&&(!o.only||o.only.includes(it.id))){ const f=g.byId.get(it.cid); if(f) setMultiPoints(it,f,P,fw,fh); }
  const ink=buildInk(doc,P,fw,fh);
  const fixed=tickBoxes(doc,probe,P,fw,fh).map(t=>padBox(t.box,0.3));
  probe.font=labelFont(doc);
  const markers=[];
  for(const it of doc.items){ const a=P([it.lon,it.lat]); if(!a) continue; if(it.t==='pt'&&it.mk!=='none') markers.push([a[0],a[1],markerR(doc,it)+0.25,it]);
    for(const ex of it.extra||[]){ const p=P([ex.lon,ex.lat]); if(p&&ex.mk!=='none') markers.push([p[0],p[1],exR(doc,ex)+0.25,it]); } }
  const todo=doc.items.filter(it=>it.lbl&&!it.sea&&(!o.only||o.only.includes(it.id)));
  const st=new Map();
  for(const it of doc.items) if(it.lbl&&!todo.includes(it)){ const gm=geomOf(doc,it,P,probe); if(gm.box) st.set(it.id,{box:padBox(gm.box,0.25),leaders:gm.leaders.map(l=>[[l[0],l[1]],[l[2],l[3]]])}); }
  const cands=new Map(); for(const it of todo) cands.set(it.id,labelCands(doc,it,P,fw,fh,g));
  const score=(it,c)=>{
    const b=c.box; let s=c.pref||0;
    s+=(Math.max(0,0.5-b.x)+Math.max(0,b.x+b.w-(fw-0.5))+Math.max(0,0.5-b.y)+Math.max(0,b.y+b.h-(fh-0.5)))*600;
    const pb=padBox(b,0.25), A=pb.w*pb.h;
    s+=ink.frac(pb)*280;
    if(!c.inside) s+=ink.frac(b,true)*(it.t==='shade'?45:30);
    for(const [id,q] of st){ if(id===it.id) continue; s+=ovArea(pb,q.box)/A*250; for(const l of q.leaders) if(segHitsBox(l[0],l[1],pb)) s+=45; }
    for(const fb of fixed) s+=ovArea(pb,fb)/A*250;
    for(const mk of markers) if(mk[3]!==it&&circBox(mk,pb,0.15)) s+=90;
    for(const l of c.leaders){
      s+=Math.hypot(l[1][0]-l[0][0],l[1][1]-l[0][1])*(c.multi?0:0.5);
      s+=Math.max(0,ink.cross(l[0],l[1],0.6,0.2)-(c.multi?1:0))*9;
      s+=ink.cross(l[0],l[1],0.3,0.2,true)*25;
      for(const [id,q] of st){ if(id===it.id) continue; if(segHitsBox(l[0],l[1],q.box)) s+=45; for(const l2 of q.leaders) if(segX(l[0],l[1],l2[0],l2[1])) s+=30; }
      for(const mk of markers) if(mk[3]!==it&&distSeg([mk[0],mk[1]],l[0],l[1])<mk[2]+0.2) s+=40;
    }
    return s;
  };
  const placeOne=it=>{
    st.delete(it.id); let best=null;
    for(const c of cands.get(it.id)||[]){ const s=score(it,c); if(!best||s<best.s) best={c,s}; }
    if(!best) return;
    const c=best.c;
    if(c.anchor){ const q=P.invert(c.anchor); if(q){ it.lon=r3(q[0]); it.lat=r3(q[1]); } }
    it.dx=r3(c.off[0]); it.dy=r3(c.off[1]); if(c.leaderMode) it.leader=c.leaderMode; if(c.halo!=null) it.halo=c.halo;
    st.set(it.id,{box:padBox(c.box,0.25),leaders:c.leaders});
  };
  const crowd=it=>{ const a=P([it.lon,it.lat])||[0,0]; let n=0; for(const mk of markers) if(mk[3]!==it&&Math.hypot(mk[0]-a[0],mk[1]-a[1])<8) n++; return n; };
  const rank=it=>it.t==='shade'&&!it.multi&&!it.ring?0:it.multi?1:(it.ring||it.t==='ell')?2:3;
  const order=todo.slice().sort((a,b)=>rank(a)-rank(b)||crowd(b)-crowd(a));
  for(let pass=0;pass<2;pass++) for(const it of order) placeOne(it);
  return doc;
}

function interiorSpot(geom,P,m,a,fw,fh){ const r=interiorSpots(geom,P,m,a,fw,fh,1); return r.length?r[0].p:null; }
function interiorSpots(geom,P,m,a,fw,fh,max){
  const rings=geom.coordinates.map(r=>r.map(p=>P(p)).filter(Boolean)); if(!rings.length||rings[0].length<3) return [];
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity; for(const [x,y] of rings[0]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  x0=Math.max(x0,0.6+m.W/2); x1=Math.min(x1,fw-0.6-m.W/2); y0=Math.max(y0,0.6+m.H/2); y1=Math.min(y1,fh-0.6-m.H/2);
  if(x1<x0||y1<y0) return [];
  const inside=(x,y)=>{ let c=false; for(const r of rings){ for(let i=0,j=r.length-1;i<r.length;j=i++){ const [xi,yi]=r[i],[xj,yj]=r[j]; if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi) c=!c; } } return c; };
  const pad=0.45, hw=m.W/2+pad, hh=m.H/2+pad;
  const step=clamp(Math.min(x1-x0,y1-y0)/16,0.3,1.2);
  const ok=[];
  for(let x=x0;x<=x1+1e-9;x+=step) for(let y=y0;y<=y1+1e-9;y+=step){
    const pts=[[x,y],[x-hw,y-hh],[x+hw,y-hh],[x-hw,y+hh],[x+hw,y+hh],[x,y-hh],[x,y+hh],[x-hw,y],[x+hw,y]];
    if(pts.every(p=>inside(p[0],p[1]))) ok.push({p:[x,y],d:Math.hypot(x-a[0],y-a[1])});
  }
  ok.sort((u,v)=>u.d-v.d);
  if(ok.length<=max) return ok;
  const out=ok.slice(0,Math.ceil(max/2)); const rest=ok.slice(Math.ceil(max/2)); const k=rest.length/(max-out.length);
  for(let i=0;out.length<max&&i<rest.length;i+=k) out.push(rest[Math.floor(i)]);
  return out;
}
/* ───────── 해석 결과(spec) → 지도 문서 ─────────
 spec = {region, labelSeq, points:[{ko,en,lat,lon,label,marker}], countries:[{iso3|ko,label,tone}],
         areas:[{ko,lat,lon,rx,ry,label}], rivers:[...], lines:{equator,tropics,polar}, borders} */
function cleanLabel(l){ if(l==null) return null; let s=String(l).trim(); if(!s||/^(null|none|-|없음)$/i.test(s)) return null;
  const m=/^\(?([가나다라마바사아자차카타파하])\)?$/.exec(s); if(m) return `(${m[1]})`; return s.slice(0,6); }
async function specToDoc(spec,opts){
  const o=opts||{};
  await Promise.all([loadLod('lo'),loadPlaces()]);
  const g=geo.lo; const report={warnings:[],items:[]};
  const doc=freshDoc('europe');
  if(o.style) doc.style={...doc.style,...o.style};
  const labels=[];
  const pts=Array.isArray(spec.points)?spec.points:[], cs=Array.isArray(spec.countries)?spec.countries:[], ars=Array.isArray(spec.areas)?spec.areas:[];
  const pending=[];
  for(const p of pts){
    const r=resolvePlace(p||{}); if(!r||!isFinite(r.lat)||!isFinite(r.lon)){ report.warnings.push(`‘${(p&&(p.ko||p.en||p.name))||'?'}’ 위치를 찾지 못했어요`); continue; }
    const mk=['dot','ring','none'].includes(p.marker)?p.marker:'dot';
    const it={id:uid(),t:'pt',lon:r3(r.lon),lat:r3(r.lat),mk,lbl:cleanLabel(p.label),name:r.name,src:r.src,dx:0,dy:0,leader:'auto',halo:false,extra:[]};
    pending.push(it);
  }
  for(const c of cs){
    const f=findCountry((c&&(c.iso3||c.id))||'')||findCountry((c&&c.ko)||'')||findCountry((c&&c.en)||'');
    if(!f){ report.warnings.push(`‘${(c&&(c.ko||c.iso3))||'?'}’ 국가를 찾지 못했어요`); continue; }
    if(pending.some(i=>i.t==='shade'&&i.cid===f.id)) continue;
    const cen=countryCentroid(f);
    pending.push({id:uid(),t:'shade',cid:f.id,name:f.properties.ko,tone:['light','mid','dark','black'].includes(c.tone)?c.tone:'mid',lbl:cleanLabel(c.label),lon:r3(cen[0]),lat:r3(cen[1]),dx:0,dy:0,leader:'auto',halo:true,extra:[],
      style:['shade','circle','multi'].includes(c.style)?c.style:null});
  }
  for(const a of ars){
    if(!a||!isFinite(+a.lat)||!isFinite(+a.lon)) continue;
    const rx=clamp(+a.rx||3,0.3,40), ry=clamp(+a.ry||2,0.3,30), lat=+a.lat;
    pending.push({id:uid(),t:'ell',lon:r3(+a.lon),lat:r3(lat),rx:rx*RAD,ry:ry*RAD/Math.max(0.2,Math.cos(lat*RAD)),rot:clamp(+a.rot||0,-90,90),lbl:cleanLabel(a.label),name:a.ko||'',dx:0,dy:0,leader:'off',halo:false,extra:[]});
  }
  // 라벨 순서: 정해진 라벨의 종류를 따르고, 빈 라벨은 언급 순서대로 채움
  let seq=SEQS[spec.labelSeq]?spec.labelSeq:null;
  if(!seq){ const first=pending.find(i=>i.lbl); seq=(first&&seqOfLabel(first.lbl))||'latin'; }
  doc.style.seq=seq;
  doc.items=pending.filter(i=>i.lbl);
  for(const it of pending){ if(!it.lbl&&spec.noLabels!==true){ it.lbl=nextLabel(doc); } if(!doc.items.includes(it)) doc.items.push(it); }
  doc.items=pending; // 원래 순서 유지
  // 하천·선
  const rv=new Set(); for(const r of (Array.isArray(spec.rivers)?spec.rivers:[])){ const k=resolveRiver(r); if(k) rv.add(k); else report.warnings.push(`‘${r}’ 하천은 목록에 없어요`); }
  doc.layers.rivers=[...rv];
  const ln=spec.lines||{}; doc.layers.lines={eq:!!ln.equator,tr:!!ln.tropics,ac:!!ln.polar};
  { const z=spec.zone; doc.layers.zone=normZone(z);
    const lg=spec.legend||(z&&z.legend); doc.layers.legend=ZONE_LEGEND.includes(lg)?lg:'bl';
    if(['none','auto','bl','br','tl','tr'].includes(spec.scale)) doc.layers.scale=spec.scale;
    const pl=spec.plates; doc.layers.plates=pl&&pl.on?{on:true,typed:pl.typed!==false,names:pl.names!==false}:{on:false,typed:true,names:true};
    doc.layers.relief=normRelief(spec.relief); }
  if(doc.layers.relief.on&&doc.layers.relief.only.length) await loadRelief().catch(()=>{});
  { const sn=spec.seas&&Array.isArray(spec.seas.names)?spec.seas.names.filter(n=>SEAS[n]):[]; doc._seaPts=sn.map(n=>SEAS[n][0]); }   // 이름을 넣을 바다도 틀 안에
  chooseView(doc,spec.region); delete doc._seaPts;
  if([0,10,15,20,30].includes(spec.grat)) doc.layers.grat=spec.grat; else if(doc.view.proj==='polar') doc.layers.grat=30;   // 북극 중심 지도는 경위선망 30°가 기본
  if(spec.noLbl) for(const it of doc.items) if(!it.sea) it.lbl='';
  if(typeof spec.borders==='boolean') doc.layers.borders=spec.borders;
  await ensureGeo(doc).catch(()=>{});
  { const P=makeProj(doc.view,doc.frame.w,doc.frame.h);
    for(const it of doc.items) if(it.t==='shade'){ const st=it.style||chooseCountryStyle(doc,it,P); applyCountryStyle(doc,it,st,P); } }
  autoLabel(doc);
  if(['cw','ccw','we','ns'].includes(spec.order)) relabelItems(doc,spec.order);
  if(doc.view.proj==='polar'&&doc.preset==='custom') labelFit(doc,true);   // 북극 중심 직사각형: 기호 글자까지 틀 안에
  if(spec.seas&&typeof spec.seas==='object'){ const sn=Array.isArray(spec.seas.names)?spec.seas.names.filter(n=>SEAS[n]):[];
    const miss=placeSeas(doc,sn,{force:true});
    for(const n of miss) report.warnings.push(`‘${n}’ 이름은 지금 지도 범위 안에 놓을 자리가 없어요`);
    for(const n of miss.tight) report.warnings.push(`‘${n}’ 이름이 육지에 걸려요. 편집기에서 끌어 옮기거나 바다 이름 글자를 작게 바꿔 보세요`);
    if(spec.seas.oceans) placeSeas(doc,OCEANS.filter(n=>!sn.includes(n))); }
  report.items=doc.items;
  return {doc,report};
}
function featurePoints(doc){
  const pts=[]; const g=anyGeo();
  for(const it of doc.items){
    if(it.sea) continue;   // 바다 이름은 범위를 정하는 데 쓰지 않음
    if(it.t==='pt') pts.push([it.lon,it.lat]);
    else if(it.t==='shade'){ const f=g&&g.byId.get(it.cid); if(f){ const b=d3.geoBounds(countryMain(f)); pts.push(b[0],b[1],[b[0][0],b[1][1]],[b[1][0],b[0][1]]); } else pts.push([it.lon,it.lat]); }
    else if(it.t==='ell'){ const rx=it.rx/RAD, ry=it.ry/RAD*Math.cos(it.lat*RAD); pts.push([it.lon-rx,it.lat-ry],[it.lon+rx,it.lat+ry]); }
    for(const ex of it.extra||[]) pts.push([ex.lon,ex.lat]);
  }
  for(const q of doc._seaPts||[]) pts.push(q);
  /* 문장에서 고른 산맥·순상지도 틀 안에 들도록 */
  const r=doc.layers.relief; if(r&&r.on&&r.only.length&&reliefFeats) for(const f of reliefFeats) if(r.only.includes(f.properties.id)){ const b=d3.geoBounds(f); pts.push(b[0],b[1],[b[0][0],b[1][1]],[b[1][0],b[0][1]]); }
  return pts;
}
function fitsInView(doc,pts,margin){
  const P=makeProj(doc.view,doc.frame.w,doc.frame.h); const m=margin==null?2:margin;
  return pts.every(p=>{ const q=P(p); return q&&q[0]>m&&q[0]<doc.frame.w-m&&q[1]>m&&q[1]<doc.frame.h-m; });
}
function lonArc(lons){
  const a=lons.map(l=>((l+540)%360)-180).sort((x,y)=>x-y);
  if(a.length===1) return {c:a[0],w:0};
  let gap=-1,gi=0; for(let i=0;i<a.length;i++){ const nx=i+1<a.length?a[i+1]:a[0]+360; const d=nx-a[i]; if(d>gap){gap=d;gi=i;} }
  const start=a[(gi+1)%a.length], w=360-gap; let c=start+w/2; c=((c+540)%360)-180; return {c,w};
}
/* 편집기 '항목에 맞추기': 틀 크기·도법은 그대로 두고, 항목이 모두 들어오게 가운데와 축척을 맞춘다 */
/* 북극 중심(정거 방위) 지도를 점들과 북극점이 다 들어오는 직사각형으로 자른다. keepFrame이면 틀 크기는 그대로 두고 축척·위치만 맞춘다.
   방향은 그대로(기본: 0° 경선이 아래). 시험지처럼 가로로 긴 틀이 되는 경우가 많다 */
function fitPolar(doc,pts,keepFrame){
  const v=doc.view; v.proj='polar';
  const P0=PROJS.polar.f().rotate([-v.rot,-90]).scale(1).translate([0,0]);
  const xy=[[0,90],...pts].map(p=>P0(p)).filter(q=>q&&isFinite(q[0])); if(xy.length<2) return false;
  const r0=14*RAD;   // 북극점 둘레는 적어도 위도 14°만큼 보이게
  let x0=Math.min(-r0,...xy.map(q=>q[0])), x1=Math.max(r0,...xy.map(q=>q[0])), y0=Math.min(-r0,...xy.map(q=>q[1])), y1=Math.max(r0,...xy.map(q=>q[1]));
  let W=doc.frame.w, H=doc.frame.h; const m=keepFrame?5:7;
  if(!keepFrame){ W=72; const asp=(y1-y0)/(x1-x0); H=Math.round(clamp((W-2*m)*asp+2*m,W*0.42,W*1.15)); if(asp>1.15){ H=72; W=Math.round(clamp((H-2*m)/asp+2*m,H*0.6,H)); } doc.frame={w:W,h:H}; }
  const sc=Math.min((W-2*m)/(x1-x0),(H-2*m)/(y1-y0));
  v.scale=sc; v.tx=W/2-sc*(x0+x1)/2; v.ty=H/2-sc*(y0+y1)/2;
  if(!keepFrame){ doc.preset='custom'; doc.home={...v}; }
  doc.ticks=[]; return true;
}
function fitItems(doc,margin){
  const pts=featurePoints(doc).concat(doc.items.filter(it=>it.sea).map(it=>[it.lon,it.lat])); if(!pts.length) return false;
  const v=doc.view, fw=doc.frame.w, fh=doc.frame.h, m=margin==null?4:margin;
  if(doc.view.proj==='polar'){ if(!fitPolar(doc,pts,true)) return false; return labelFit(doc,true); }
  const {c}=lonArc(pts.map(p=>p[0])); v.rot=r3(c);
  const P0=makeProj({...v,scale:1,tx:0,ty:0},fw,fh); const xy=pts.map(p=>P0(p)).filter(q=>q&&isFinite(q[0]));
  if(!xy.length) return false;
  const xs=xy.map(q=>q[0]), ys=xy.map(q=>q[1]); const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const minSpan=6*RAD;   // 점 하나만 있어도 너무 크게 확대하지 않게(가로 약 6°)
  const sc=Math.min((fw-2*m)/Math.max(x1-x0,minSpan),(fh-2*m)/Math.max(y1-y0,minSpan*fh/fw));
  v.scale=sc; v.tx=fw/2-sc*(x0+x1)/2; v.ty=fh/2-sc*(y0+y1)/2;
  return labelFit(doc,false);
}
/* 기호 글자·점선 원까지 틀 안(가장자리 2.5mm 띄움)에 들도록, 넘치면 조금씩 줄이고 가운데로 옮긴다. pole이면 북극점도 넣는다 */
function labelFit(doc,pole){
  const v=doc.view, fw=doc.frame.w, fh=doc.frame.h;
  const pad=2.5;
  for(let k=0;k<14;k++){ const P=makeProj(v,fw,fh); probe.font=labelFont(doc); let bx0=Infinity,by0=Infinity,bx1=-Infinity,by1=-Infinity;
    const add=(x,y,rx,ry)=>{ if(!isFinite(x)||!isFinite(y)) return; bx0=Math.min(bx0,x-rx); bx1=Math.max(bx1,x+rx); by0=Math.min(by0,y-ry); by1=Math.max(by1,y+ry); };
    if(pole){ const q=P([0,90]); if(q) add(q[0],q[1],3,3); }
    for(const it of doc.items){ const g=geomOf(doc,it,P,probe);
      if(g.box) add(g.box.x+g.box.w/2,g.box.y+g.box.h/2,g.box.w/2,g.box.h/2);
      if(it.t==='pt'&&it.mk!=='none') add(g.a[0],g.a[1],g.r,g.r);
      if(it.t==='ell') { const r=Math.max(g.rx,g.ry); add(g.a[0],g.a[1],r,r); }
      for(const e of g.extras) add(e.p[0],e.p[1],e.r,e.r); }
    if(!isFinite(bx0)) break;
    const fits=bx0>=pad&&by0>=pad&&bx1<=fw-pad&&by1<=fh-pad;
    const ox=fw/2-(bx0+bx1)/2, oy=fh/2-(by0+by1)/2;
    if(fits&&Math.abs(ox)<0.3&&Math.abs(oy)<0.3) break;
    const need=Math.min((fw-2*pad)/Math.max(bx1-bx0,1e-6),(fh-2*pad)/Math.max(by1-by0,1e-6));
    const f=fits?1:Math.max(0.8,Math.min(0.97,need));
    // 가운데(cx,cy)를 기준으로 줄이고 상자 가운데를 틀 가운데로
    const cx=fw/2, cy=fh/2; v.tx=cx+(v.tx-cx)*f+ox*f; v.ty=cy+(v.ty-cy)*f+oy*f; v.scale*=f;
    if(fits) break; }
  return true;
}
/* 기호 다시 매기기: cw 12시부터 시계방향 | ccw 반시계방향 | we 서→동 | ns 북→남 | shuffle 섞기. 바다 이름은 빼고 */
function relabelItems(doc,mode){
  const fw=doc.frame.w, fh=doc.frame.h, P=makeProj(doc.view,fw,fh);
  if(mode==='none'){ let n=0; for(const it of doc.items) if(!it.sea&&it.lbl){ it.lbl=''; n++; } return n; }   // 기호 없이 점만
  let pool=doc.items.filter(it=>it.lbl&&!it.sea); if(!pool.length) pool=doc.items.filter(it=>!it.sea);   // 기호를 다 지웠으면 모든 항목에 새로 붙임
  const its=pool.map((it,i)=>{ const a=P([it.lon,it.lat])||[0,0]; return {it,x:a[0],y:a[1],i}; });
  if(its.length<2){ if(its.length===1&&!its[0].it.lbl) its[0].it.lbl=(SEQS[doc.style.seq]||SEQS.latin)[0]; return its.length; }
  if(mode==='cw'||mode==='ccw'){ const cx=its.reduce((s,p)=>s+p.x,0)/its.length, cy=its.reduce((s,p)=>s+p.y,0)/its.length;
    for(const p of its){ let a=Math.atan2(p.x-cx,cy-p.y); if(a<-1e-9) a+=2*Math.PI; p.k=mode==='cw'?a:(2*Math.PI-a)%(2*Math.PI); }
    its.sort((a,b)=>a.k-b.k||a.y-b.y); }
  else if(mode==='we') its.sort((a,b)=>a.x-b.x||a.y-b.y);
  else if(mode==='ns') its.sort((a,b)=>a.y-b.y||a.x-b.x);
  else { const before=its.map(p=>p.i).join(); for(let t=0;t<8;t++){ for(let i=its.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [its[i],its[j]]=[its[j],its[i]]; } if(its.map(p=>p.i).join()!==before) break; } }
  const seq=SEQS[doc.style.seq]||SEQS[seqOfLabel(its[0].it.lbl)]||SEQS.latin;
  its.forEach((p,k)=>{ p.it.lbl=seq[k]||p.it.lbl; });
  return its.length;
}
/* 정답: 기호 순서대로 'A 로테르담' 목록과 발문 단서 문장. 이름이 없는 점은 그 자리의 나라 이름 */
function answerKey(doc){
  const order=[]; for(const k of Object.keys(SEQS)) for(const l of SEQS[k]) order.push(l);
  const its=doc.items.filter(it=>it.lbl&&!it.sea).map(it=>{ let n=it.name||''; if(!n){ const f=countryAt(doc,it.lon,it.lat); n=f?f.properties.ko+'(부근)':`${fmtLat(it.lat)} ${fmtLon(it.lon)}`; } return {l:it.lbl,n}; });
  its.sort((a,b)=>{ const ia=order.indexOf(a.l), ib=order.indexOf(b.l); return (ia<0?999:ia)-(ib<0?999:ib); });
  if(!its.length) return null;
  const ls=its.map(x=>x.l), names=its.map(x=>x.n).slice().sort((a,b)=>a.localeCompare(b,'ko'));
  const range=ls.length>2?`${ls[0]}~${ls[ls.length-1]}`:ls.join(', ');
  const last=range.replace(/[()]/g,'').slice(-1); const code=last.charCodeAt(0)-0xAC00;
  const jo=/[A-Za-z]/.test(last)?(/[LMNR]/i.test(last)?'은':'는'):/[ㄱ-ㅎ㉠-㉭]/.test(last)?'은':/\d/.test(last)?('2459'.includes(last)?'는':'은'):(code>=0&&code<11172&&code%28?'은':'는');
  return {key:its.map(x=>`${x.l} ${x.n}`).join(' · '),clue:its.length>1?`(단, ${range}${jo} 각각 ${names.join(', ')} 중 하나임.)`:''};
}
function chooseView(doc,regionId){
  const pts=featurePoints(doc);
  const pr=regionId&&presetById(regionId);
  if(pr&&pr.proj==='polar'&&pts.length){ applyPreset(doc,pr); fitPolar(doc,pts,false); finishView(doc); return; }   // 북극 중심 + 점: 점에 맞춘 직사각형
  if(pr){ applyPreset(doc,pr); if(!pts.length||fitsInView(doc,pts,1.5)){ finishView(doc); return; } }
  if(!pts.length){ applyPreset(doc,presetById('europe')); finishView(doc); return; }
  const {c,w}=lonArc(pts.map(p=>p[0]));
  const lats=pts.map(p=>p[1]); let la0=Math.min(...lats), la1=Math.max(...lats);
  if(w>230){ for(const id of ['world-atl','world-pac']){ applyPreset(doc,presetById(id)); if(fitsInView(doc,pts,1)){ finishView(doc); return; } } applyPreset(doc,presetById('world-atl')); finishView(doc); return; }
  if(la0>48&&w>110){ applyPreset(doc,presetById('arctic')); if(fitPolar(doc,pts,false)){ finishView(doc); return; } }
  // 기존 지역 틀 중 다 들어가는 가장 작은 것이 있으면 그것을 씀 (시험지 크기 유지)
  const cands=PRESETS.filter(p=>p.proj!=='polar'&&!p.id.startsWith('world')).sort((a,b)=>a.span-b.span);
  for(const p of cands){ applyPreset(doc,p); if(fitsInView(doc,pts,2.5)&&p.span<=Math.max(w*3.2,30)){ finishView(doc); return; } }
  const lonSpan=Math.max(w*1.35+8,20), latPad=Math.max((la1-la0)*0.18,3);
  la0=clamp(la0-latPad-(lonSpan<40?2:0),-78,82); la1=clamp(la1+latPad,-78,84);
  if(la1-la0<lonSpan*0.45){ const mid=(la0+la1)/2, h=lonSpan*0.45/2; la0=clamp(mid-h,-78,82); la1=clamp(mid+h,-78,84); }
  const proj=lonSpan>110?'miller':'mercator';
  const P0=PROJS[proj].f().rotate([-c,0]).scale(1).translate([0,0]);
  const xs=[],ys=[]; for(let i=0;i<=8;i++){ const lo=c-lonSpan/2+lonSpan*i/8; for(const la of [la0,la1,(la0+la1)/2]){ const q=P0([lo,la]); xs.push(q[0]); ys.push(q[1]); } }
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  const W=lonSpan>110?80:56; const H=Math.round(clamp(W*(y1-y0)/(x1-x0),W*0.55,W*1.25));
  const s=Math.min(W/(x1-x0),H/(y1-y0));
  doc.preset='custom'; doc.frame={w:W,h:H};
  doc.view={proj,rot:r3(c),scale:s,tx:W/2-s*(x0+x1)/2,ty:H/2-s*(y0+y1)/2};
  doc.home={...doc.view};
  doc.layers.borders=lonSpan<120;
  doc.ticks=[];
  const P=makeProj(doc.view,W,H); const e=P([c,0]); if(e&&e[1]>3&&e[1]<H-3) doc.ticks=[{k:'lat',v:0,side:'left'}];
  finishView(doc);
}
function finishView(doc){
  // 적도가 틀 밖이면 0° 눈금 제거
  if(PROJS[doc.view.proj].cyl&&doc.ticks.length){ const P=makeProj(doc.view,doc.frame.w,doc.frame.h); const mid=P.invert([doc.frame.w/2,doc.frame.h/2]);
    doc.ticks=doc.ticks.filter(t=>{ if(t.k!=='lat'||!mid) return true; const q=P([mid[0],t.v]); return q&&q[1]>1&&q[1]<doc.frame.h-1; }); }
}
/* 문서 → Claude에게 보여줄 현재 지도 요약 */
function docToSpec(doc){
  const s={region:doc.preset==='custom'?null:doc.preset,labelSeq:doc.style.seq,points:[],countries:[],areas:[],rivers:doc.layers.rivers.slice(),
    lines:{equator:!!doc.layers.lines.eq,tropics:!!doc.layers.lines.tr,polar:!!doc.layers.lines.ac},borders:doc.layers.borders,
    zone:zoneOn(doc)?doc.layers.zone:null,
    plates:doc.layers.plates&&doc.layers.plates.on?{on:true,typed:doc.layers.plates.typed,names:doc.layers.plates.names}:null,
    relief:doc.layers.relief&&doc.layers.relief.on?doc.layers.relief:null,legend:doc.layers.legend,scale:doc.layers.scale||'none',grat:doc.layers.grat||0};
  const sn=doc.items.filter(it=>it.sea&&SEAS[it.name]).map(it=>it.name); if(sn.length) s.seas={oceans:false,names:sn};
  for(const it of doc.items){
    if(it.sea) continue;
    if(it.t==='pt') s.points.push({ko:it.name||'',lat:it.lat,lon:it.lon,label:it.lbl||null,marker:it.mk});
    else if(it.t==='shade') s.countries.push({iso3:it.cid,ko:it.name||'',label:it.lbl||null,tone:it.tone,style:it.style||(it.ring?'circle':it.multi?'multi':'shade')});
    else if(it.t==='ell') s.areas.push({ko:it.name||'',lat:it.lat,lon:it.lon,rx:r3(it.rx/RAD),ry:r3(it.ry/RAD*Math.cos(it.lat*RAD)),rot:it.rot||0,label:it.lbl||null});
  }
  return s;
}

/* ───────── 규칙 기반 해석 (Claude 없이) ───────── */
const REGION_WORDS=[['사하라이남아프리카','ssaf'],['사하라이남','ssaf'],['건조아시아','swasia'],['서남아시아','swasia'],['북부아프리카','swasia'],['북아프리카','swasia'],['중동','swasia'],
  ['몬순아시아','monsoon'],['동남아시아','monsoon'],['남아시아','monsoon'],['동아시아','eastasia'],['오세아니아','oceania'],['앵글로아메리카','angloam'],['북아메리카','angloam'],['북미','angloam'],
  ['라틴아메리카','latam'],['중남부아메리카','latam'],['중남미','latam'],['남아메리카','latam'],['남미','latam'],['환태평양','world-pac'],['태평양중심','world-pac'],['세계전도','world-atl'],
  ['세계지도','world-atl'],['북극중심','arctic'],['북극','arctic'],['유럽','europe'],['아프리카','ssaf']];
const COUNTRY_REGION={'미국':'usa'};
const STOP=new Set(['분쟁','분쟁지역','분쟁의','갈등','지역들','빗금','빗금으로','구분','구분해','구분해서','구분해줘','기후','지역','분포','칠해','칠해줘','지도','백지도','지도에','지도를','지도로','지도에서','위에','위치','위치에','찍어','찍어줘','찍어주세요','찍기','찍고','표시','표시해','표시해줘','표시해주세요','해줘','해','줘','주세요','만들어','만들어줘','만들어주세요','그려','그려줘','그려주세요',
  '점','점을','점으로','점만','도시','도시를','도시들','도시는','국가','국가를','국가들','나라','나라를','음영','음영으로','음영을','음영처리','음영처리해줘','색칠','색칠해','색칠해줘','칠해','칠해줘','회색','회색으로',
  '순서','순서로','순서대로','차례로','차례대로','각각','라벨','라벨을','라벨로','라벨은','넣어','넣어줘','빈','원','원으로','동그라미','동그라미로','로','으로','와','과','및','그리고','하고','를','을','에','에서',
  '중심','중심으로','포함','포함해','포함해서','주요','넣고','해서','있는','있게','그리고','또','추가','추가해줘','하천','하천도','강도','같이','함께','표기','표기해줘','이름','기호','기호로','붙여','붙여줘','대로','순','세계','의','한','지역','곳','곳을','곳에','개','속','속이','이랑','랑','대표','전체','범위','틀',
  '점선','점선원','점선으로','타원','타원으로','지시선','지시선으로','둘러','둘러줘','감싸','감싸줘','섬','섬나라','섬은','섬나라는','음영만','표시하고','원도']);
const PARTICLES=['에서는','에서','으로','이랑','하고','까지','부터','에는','에도','에게','은','는','이','가','을','를','에','와','과','의','로','도','만','랑'];
function stripPart(t){ const out=[t]; for(const p of PARTICLES) if(t.length>p.length+1&&t.endsWith(p)) out.push(t.slice(0,-p.length)); return out; }
function labelTok(t){
  let s=t.replace(/[!?]+$/,'').replace(/(은|는|이|가|에|을|를|로|으로|부터|까지|:|=|\.|,)$/,'');
  if(/^\([가나다라마바사아자차카타파하]\)$/.test(s)) return s;
  if(/^[가나다라마바사아자차카타파하]\)$/.test(s)) return `(${s[0]})`;
  if(/^[A-Za-z]$/.test(s)) return s;
  if(/^[ㄱ-ㅎ]$/.test(s)||/^[㉠-㉭]$/.test(s)) return s;
  return null;
}
function matchThing(t,ctx){
  // 반환: {kind:'river'|'country'|'place'|'stop', ...}
  for(const c of stripPart(t)){
    if(STOP.has(c)) return {kind:'stop'};
    if(c==='티그리스유프라테스강'){ const a=resolveRiver('티그리스강'), b=resolveRiver('유프라테스강'); if(a&&b) return {kind:'river',key:b,keys:[a,b]}; }
    if(/(강|운하)$/.test(c)){ const k=resolveRiver(c); if(k) return {kind:'river',key:k}; }
    const f=findCountry(c); if(f&&c.length>=2){ return {kind:'country',f,word:c}; }
    if(c.length>=2){ const ps=exactPlaces(c); if(ps.length){ ps.sort((a,b)=>a.rank-b.rank); return {kind:'place',p:ps[0],word:c}; } }
  }
  return null;
}
function parseRules(q){
  const spec={region:null,labelSeq:null,points:[],countries:[],areas:[],rivers:[],lines:{equator:false,tropics:false,polar:false},borders:null,zone:null,plates:null,relief:null,legend:null,scale:null};
  const unknown=[];
  let s=String(q||'').replace(/[“”"'‘’「」『』]/g,' ');
  // 바다 이름: '해양 이름'(대양 다섯), '지중해·홍해 이름'(그 바다만)
  { const SR=SEA_NAMES.slice().sort((a,b)=>b.length-a.length).join('|');
    const names=[]; let oceans=false;
    s=s.replace(new RegExp('((?:'+SR+')(?:\\s*(?:,|·|와|과|및)\\s*(?:'+SR+'))*)\\s*(?:의\\s*)?이름(?:\\s*(?:도|을|를)?\\s*(?:넣어|표시|달아|써)\\S*)?','g'),(m0,list)=>{ for(const n of list.split(/\s*(?:,|·|와|과|및)\s*/)) if(SEAS[n]&&!names.includes(n)) names.push(n); return ' '; });
    s=s.replace(/(대양|해양|바다)\s*이름(?:\s*(?:도|을|를)?\s*(?:넣어|표시|달아|써)\S*)?/g,()=>{ oceans=true; return ' '; });
    if(oceans||names.length) spec.seas={oceans,names}; }
  // 기호 순서: '시계 방향', '시계 반대 방향(반시계)', '서쪽부터', '북쪽부터'
  { const O=[[/(시계\s*반대\s*방향|반\s*시계\s*방향|반시계)(?:으로|로)?/,'ccw'],[/시계\s*방향(?:으로|로)?/,'cw'],[/(서쪽|왼쪽)\s*부터|서에서\s*동(?:으로)?/,'we'],[/(북쪽|위쪽)\s*부터|북에서\s*남(?:으로)?/,'ns']];
    for(const [re,v] of O){ if(re.test(s)){ spec.order=v; s=s.replace(new RegExp(re.source,'g'),' '); break; } } }
  // 경위선망: '경위선 30도', '경위선망 15° 간격'(숫자가 없으면 30°)
  { const m=/경위선\s*망?\s*(?:을|를)?\s*(?:(\d{1,2})\s*(?:도|°)\s*(?:간격)?)?\s*(?:으로|로)?/.exec(s);
    if(m){ const g=m[1]?+m[1]:30; spec.grat=[10,15,20,30].includes(g)?g:30; s=s.replace(m[0],' '); } }
  // 기호 없이 점만: '기호 없이', '라벨 없이', '표식 없이'
  { const re=/(?:기호|라벨|표식)\s*(?:를|은|는)?\s*(?:없이|없는|빼고|붙이지\s*(?:말고|않고)|달지\s*(?:말고|않고))/;
    if(re.test(s)){ spec.noLbl=true; s=s.replace(new RegExp(re.source,'g'),' '); } }
  if(/\([가나다라마바사]\)|[가나다라]\)?\s*[~\-–]\s*\(?[가나다라]\)/.test(s)) spec.labelSeq='gana';
  else if(/[㉠-㉭]/.test(s)) spec.labelSeq='circ';
  else if(/[㉮-㉻]/.test(s)) spec.labelSeq='mk';
  else if(/(^|[^가-힣])[ㄱ-ㅎ]\s*[,~\-–]\s*[ㄱ-ㅎ]/.test(s)) spec.labelSeq='jamo';
  else if(/(^|[^A-Za-z])[a-e]\s*[~\-–]\s*[a-e]([^A-Za-z]|$)/.test(s)) spec.labelSeq='lower';
  else if(/(^|\s)[1-9]\s*[~\-–]\s*[1-9]\s*(번|으로|로)?(\s|$)/.test(s)) spec.labelSeq='num';
  const ring=/빈\s*원|○|속이?\s*빈|동그라미/.test(s);
  const cstyle=/점선\s*(원|타원|으로)|점선원|타원/.test(s)?'circle':/지시선/.test(s)?'multi':/음영만/.test(s)?'shade':null;
  if(/적도/.test(s)) spec.lines.equator=true;
  if(/회귀선/.test(s)) spec.lines.tropics=true;
  if(/극권/.test(s)) spec.lines.polar=true;
  s=s.replace(/(적도|북회귀선|남회귀선|회귀선|북극권|남극권|극권)(을|를|도|과|와|이|가|선)?/g,' ');
  // 범례 자리(기후 지역·판의 경계 공통)
  if(/축척/.test(s)) spec.scale=/축척\s*(없이|빼|없게|지워)/.test(s)?'none':'auto';
  if(/범례/.test(s)) spec.legend=/범례\s*(없이|빼|없게|지워)/.test(s)?'none':/범례[^,.]{0,8}(밖|바깥)[^,.]{0,6}아래/.test(s)?'outB':/범례[^,.]{0,8}(밖|바깥)/.test(s)?'outR':/범례[^,.]{0,6}오른쪽\s*위/.test(s)?'tr':/범례[^,.]{0,6}왼쪽\s*위/.test(s)?'tl':/범례[^,.]{0,6}오른쪽/.test(s)?'br':'bl';
  // 판의 경계: '판의 경계'·'판 경계'·'판 구조'. '유형 구분 없이'면 한 가지 선, '판 이름 없이'면 이름을 뺀다
  if(/판\s*의?\s*경계|판\s*구조|수렴\s*경계|발산\s*경계|보존\s*경계/.test(s)){
    spec.plates={on:true,typed:!/(유형|종류)\s*(구분\s*)?(없이|빼)|한\s*가지\s*선/.test(s),names:!/판\s*이름\s*(없이|빼|지워)|이름\s*없이/.test(s)};
    s=s.replace(/(판\s*의?\s*경계|판\s*구조|수렴\s*경계|발산\s*경계|보존\s*경계|판\s*이름|이름\s*없이|(유형|종류)\s*(구분\s*)?(없이|빼고)|한\s*가지\s*선)(을|를|과|와|도|은|는|만|으로|로|이|가)?/g,' '); }
  // 습곡 산지·안정 육괴: 분류 이름 또는 산맥 이름. 산맥 이름을 적으면 그것만
  { const RN=[['appalachian','애팔래치아'],['ural','우랄'],['scandinavian','스칸디나비아\\s*산맥|킬렌'],['greatdividing','그레이트\\s*디바이딩|대분수령'],['drakensberg','드라켄즈버그|드라켄스버그'],
      ['rocky','로키'],['sierramadre','시에라\\s*마드레'],['andes','안데스'],['alps','알프스(?!-)'],['pyrenees','피레네'],['carpathian','카르파티아'],['dinaric','디나르'],['atlas','아틀라스'],['caucasus','캅카스|코카서스'],
      ['zagros','자그로스'],['hindukush','힌두쿠시'],['himalaya','히말라야(?!-)'],['southernalps','서던\\s*알프스|남알프스'],
      ['canadian','캐나다\\s*순상지|로렌시아'],['guiana','기아나'],['brazilian','브라질\\s*(순상지|고원)'],['siberian','시베리아\\s*(순상지|고원)|앙가라'],['deccan','데칸'],['australian','오스트레일리아\\s*순상지'],
      ['baltic','발트\\s*순상지|발트\\s*방패'],['african','아프리카\\s*(순상지|안정)'],['arabian','아라비아\\s*(순상지|안정)']];
    const cats={shield:/안정\s*육괴|순상지|안정\s*지괴/.test(s),old:/고기\s*습곡/.test(s),new:/신기\s*습곡|조산대/.test(s)};
    const only=RN.filter(([,re])=>new RegExp(re).test(s)).map(([id])=>id);
    if(cats.shield||cats.old||cats.new||only.length&&/산맥|산지|순상지|육괴/.test(s)){
      const any=cats.shield||cats.old||cats.new;
      spec.relief={on:true,show:any&&!only.length?cats:{shield:true,old:true,new:true},only,names:/(산맥|산지)\s*이름|이름\s*(넣|표시|달)/.test(s),tone:{}};
      s=s.replace(/(안정\s*육괴|안정\s*지괴|순상지|고기\s*습곡\s*(산지|산맥)?|신기\s*습곡\s*(산지|산맥)?|(알프스-히말라야|환태평양)\s*조산대|조산대|습곡\s*산지|(산맥|산지)\s*이름|이름\s*(넣어|표시|달아))(을|를|과|와|도|은|는|만|으로|로|이|가)?/g,' ');
      for(const [,re] of RN) s=s.replace(new RegExp('('+re+')\\s*(산맥|산지|고원|순상지)?(을|를|과|와|도|은|는|만|,)?','g'),' ');
    } }
  // 기후 지역(쾨펜): 기후대 이름 → 하나로, 교과서 기후 이름 → 그 기후만(중간 단위), 쾨펜 기호(Cfb 등) → 그 기호만(세부)
  { const Z={belts:{},tone:{},only:[]}; let named=false; const T=s;
    const lv=(b,l)=>{ const o=Z.belts[b]; const r={off:0,one:1,mid:2,detail:3}; if(!o||r[l]>r[o]) Z.belts[b]=l; };
    const pick=(b,l,key)=>{ lv(b,l); Z.only.push(key); named=true; };
    // 기호(앞뒤가 영문이 아닐 때만)
    const CODE=/(?<![A-Za-z])(Af|Am|Aw|BW[hk]|BS[hk]|C[swf][abc]|D[swf][abcd]|ET|EF)(?![A-Za-z])/g; let m;
    while((m=CODE.exec(T))){ const k=m[1]; pick(k[0],'detail',k); }
    // 교과서 기후 이름
    const MID=[['A','Af',/열대\s*우림/],['A','Am',/열대\s*몬순|열대\s*계절풍/],['A','Aw',/사바나/],['B','BW',/사막\s*기후|사막.{0,14}스텝|스텝.{0,14}사막/],['B','BS',/스텝/],
      ['C','Cs',/지중해성/],['C','Cw',/온대\s*(겨울|동계)\s*건조/],['C','Cfa',/온난\s*습윤/],['C','Cfbc',/서안\s*해양성/],
      ['D','Df',/냉대\s*습윤/],['D','Dw',/냉대\s*(겨울|동계)\s*건조/],['D','Ds',/냉대\s*(여름|하계)\s*건조/],['E','ET',/툰드라/],['E','EF',/빙설/]];
    for(const [b,k,re] of MID) if(re.test(T)) pick(b,'mid',k);
    // 건조 기후 옛 문장: '열대 사막'·'네 갈래' → 네 갈래
    if(/열대\s*(사막|스텝)|(온대|냉대|한대)\s*(사막|스텝)|네\s*갈래|세분/.test(T)&&/건조|사막|스텝/.test(T)){ lv('B','detail'); Z.only=Z.only.filter(k=>k!=='BW'&&k!=='BS'); if(Z.only.length) ['BWh','BWk','BSh','BSk'].forEach(k=>Z.only.push(k)); }
    // 기후대 이름(하나로)
    const BELT=[['A',/열대\s*기후(?!\s*지역의)/],['B',/건조\s*(기후|지역)/],['C',/온대\s*기후/],['D',/냉대\s*기후|아한대\s*기후/],['E',/한대\s*기후(?<!아한대\s*기후)/]];
    for(const [b,re] of BELT) if(re.test(T)&&!Z.belts[b]){ lv(b,'one'); if(named) Z.only.push(b); }
    if(/(쾨펜|기후)\s*(구분|대)\s*(전체|모두)?|세계\s*기후\s*(구분|지역)/.test(T)) for(const [b] of ZONE_BELTS) if(!Z.belts[b]) lv(b,'one');
    // 사막과 스텝만 말하면 건조 기후 둘로(옛 문장 '사막은 진한 회색, 스텝은 옅은 회색')
    if(/사막.{0,14}스텝|스텝.{0,14}사막/.test(T)&&Z.belts.B==='mid'){ Z.only=Z.only.filter(k=>k!=='BW'&&k!=='BS'); if(!Z.only.length) named=false; }
    if(Object.keys(Z.belts).length){
      // 하나로 칠한 기후대는 only에 넣어 둔다(다른 기후를 골라 only가 생겼을 때 사라지지 않게)
      if(Z.only.length) for(const [b,l] of Object.entries(Z.belts)) if(l==='one'&&!Z.only.includes(b)) Z.only.push(b);
      Z.only=[...new Set(Z.only)];
      // 칠 모양: 이름 바로 뒤 14자 안의 '진한 회색'·'옅은 회색'·'빗금'·'점무늬'
      const TW=[[/(진한|짙은|어두운|진하게|짙게)\s*(회색|음영)?/,'dark'],[/(옅은|연한|밝은|연하게|옅게)\s*(회색|음영)?/,'light'],[/점\s*무늬|점으로/,'dots'],[/격자|엇갈린\s*빗금/,'cross'],[/빗금/,'hatch'],[/(중간|기본)\s*(회색|음영)?|회색/,'mid']];
      const toneAfter=(word,key)=>{ const mm=new RegExp(word+'[^,.]{0,14}').exec(T); if(!mm) return; const t=mm[0].replace(new RegExp('^'+word),''); for(const [re,v] of TW) if(re.test(t)){ Z.tone[key]=v; return; } };
      const WORD={A:'열대\\s*기후',B:'건조\\s*(기후|지역)',C:'온대\\s*기후',D:'냉대\\s*기후',E:'한대\\s*기후',Af:'열대\\s*우림(\\s*기후)?',Am:'열대\\s*몬순(\\s*기후)?',Aw:'사바나(\\s*기후)?',
        BW:'사막(\\s*기후)?(은|는|을|를)?',BS:'스텝(\\s*기후)?(은|는|을|를)?',Cs:'지중해성(\\s*기후)?',Cfa:'온난\\s*습윤(\\s*기후)?',Cfbc:'서안\\s*해양성(\\s*기후)?',ET:'툰드라(\\s*기후)?',EF:'빙설(\\s*기후)?'};
      for(const [k,w] of Object.entries(WORD)) toneAfter(w,k);
      spec.zone=Z;
      s=s.replace(/((열대|온대|냉대|한대|아한대|건조)\s*)?(건조|사막|스텝|우림|몬순|계절풍|사바나|지중해성|온난\s*습윤|서안\s*해양성|툰드라|빙설|(겨울|동계|여름|하계)\s*건조|습윤)?\s*기후(\s*(지역|분포|구분|대))?(\s*(전체|모두))?(을|를|도|과|와|이|가|은|는|으로|로|만|및)?|(?<![A-Za-z])(Af|Am|Aw|BW[hk]|BS[hk]|C[swf][abc]|D[swf][abcd]|ET|EF)(?![A-Za-z])|건조\s*지역|(사막|스텝|사바나|툰드라|빙설|지중해성)(은|는|을|를|과|와)?|쾨펜|네\s*갈래(로)?|세분(해서|하여)?|(진한|짙은|어두운|옅은|연한|밝은|중간|기본)\s*(회색|음영)(으로|로)?|진하게|연하게|옅게|짙게|점\s*무늬(로)?|격자|빗금(으로|로)?|회색(으로|로)?/g,' ');
    } }
  // 범례 문장 정리
  s=s.replace(/범례\s*(지도\s*)?(없이|빼고|밖\s*(오른쪽|아래)?|바깥\s*(오른쪽|아래)?|오른쪽\s*위|왼쪽\s*위|오른쪽\s*아래|왼쪽\s*아래|오른쪽|왼쪽)?(에|로|으로)?/g,' ');
  // 좌표 쌍
  const coordRe=/(북위|남위)\s*(\d+(?:\.\d+)?)\s*(?:°|도)?\s*,?\s*(동경|서경)\s*(\d+(?:\.\d+)?)\s*(?:°|도)?|(-?\d{1,2}(?:\.\d+)?)\s*°?\s*([NS])\s*,?\s*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])|\(\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)/g;
  const coordPts=[];
  s=s.replace(coordRe,(m0,a,b,c,d,e,f,g2,h,i,j,off)=>{ let lat,lon;
    if(a){ lat=(a==='남위'?-1:1)*+b; lon=(c==='서경'?-1:1)*+d; } else if(e){ lat=(f==='S'?-1:1)*Math.abs(+e); lon=(h==='W'?-1:1)*Math.abs(+g2); } else { lat=+i; lon=+j; }
    if(Math.abs(lat)<=90&&Math.abs(lon)<=180) coordPts.push({off,pt:{ko:`${fmtLat(lat)} ${fmtLon(lon)}`,lat,lon}}); return ' ⟦C'+(coordPts.length-1)+'⟧ '; });
  // 지역: 지역 이름이 한 어절(또는 이어진 어절)을 통째로 이룰 때만 인정 ('남아프리카 공화국'의 '아프리카'는 지역이 아님)
  { const tk=s.split(/[\s,，、;·\n\/]+/).filter(Boolean); const TAIL=/^(지도)?(에|의|에서|를|은|는|으로|로|중심)?$/;
    let found=null;
    outer: for(const [w,id] of [...REGION_WORDS,...Object.entries(COUNTRY_REGION)]){ const wn=norm(w);
      for(let i=0;i<tk.length;i++) for(let n=1;n<=3&&i+n<=tk.length;n++){
        const j=norm(tk.slice(i,i+n).join('')); if(!j.startsWith(wn)) continue;
        let rest=j.slice(wn.length), take=n;
        if(COUNTRY_REGION[w]){ if(/^지도/.test(rest)){} else if(rest===''&&i+n<tk.length&&/^지도/.test(tk[i+n])){ rest=norm(tk[i+n]); take=n+1; } else continue; }
        if(TAIL.test(rest)){ found=[i,take,id]; break outer; }
      } }
    if(found){ spec.region=found[2]; tk.splice(found[0],found[1]); s=tk.join(' '); } }
  // 라벨 범위 표시(A~D, (가)~(라))는 순서만 알려 주므로 지움
  const LC='[A-Za-z]|[가나다라마바사아자차카타파하]|[ㄱ-ㅎ]|[㉠-㉭]|[1-9]';
  s=s.replace(new RegExp('(^|\\s)\\(?('+LC+')\\)?\\s*(?:[~\\-–]|부터)\\s*\\(?('+LC+')\\)?\\s*(?:까지)?(로|으로|순서로|순으로|순서대로)?(?=[\\s,.]|$)','g'),'$1 ');
  // 붙어 있는 라벨 분리: "로테르담(A)" "A:로테르담" "(가)이란"
  s=s.replace(/([가-힣A-Za-z.])\s*[(\[]\s*([A-Za-z]|[가나다라마바사아자차카타파하]|[ㄱ-ㅎ]|[㉠-㉭])\s*[)\]]/g,(m0,a,L)=>a+' ='+(/[가-힣]/.test(L)?`(${L})`:L)+' ');
  s=s.replace(/(^|\s)(\([가나다라마바사아자차카타파하]\)|[A-Za-z]|[ㄱ-ㅎ]|[㉠-㉭])\s*[:=.)]\s*(?=[가-힣])/g,'$1$2 ');
  s=s.replace(/(^|\s)(\([가나다라마바사아자차카타파하]\))(?=[가-힣])/g,'$1$2 ');
  s=s.replace(/티그리스\s*(?:강)?\s*(?:[·ㆍ・,]|와|과)?\s*유프라테스\s*강/g,'티그리스유프라테스강');   // 물 분쟁: 두 강을 하나로
  const toks=s.split(/[\s,，、;·\n\/]+/).filter(Boolean);
  const seq=[];
  for(let i=0;i<toks.length;i++){
    let t=toks[i].replace(/[!?]+$/,''); if(t.length>2) t=t.replace(/[.]+$/,''); if(!t) continue;
    const cm=/^⟦C(\d+)⟧$/.exec(t); if(cm){ seq.push({kind:'point',pt:coordPts[+cm[1]].pt}); continue; }
    if(t.startsWith('=')){ const L=labelTok(t.slice(1)); if(L){ seq.push({kind:'label',L,after:true}); continue; } }
    const L=labelTok(t); if(L){ seq.push({kind:'label',L}); continue; }
    if(/^[A-Za-z]{2,}$/.test(t)===false&&/^[\d.]+$/.test(t)) { unknown.push(t); continue; }
    // 여러 어절 이름 (콩고 민주 공화국, 남아프리카 공화국, 워싱턴 D.C.)
    let hit=null, used=1;
    for(const n of [3,2]){ if(i+n<=toks.length){ const j=toks.slice(i,i+n).join(' '); const h=matchThing(j); if(h&&h.kind!=='stop'){ hit=h; used=n; break; } } }
    if(!hit) hit=matchThing(t);
    if(!hit){ unknown.push(t); continue; }
    i+=used-1;
    if(hit.kind==='stop') continue;
    if(hit.kind==='river'){ seq.push({kind:'river',key:hit.key,keys:hit.keys||[hit.key]}); continue; }
    if(hit.kind==='country'){
      const f=hit.f; const area=d3.geoArea(f)*6371*6371;
      if(area<9000){ const ps=exactPlaces(f.properties.ko); const c=countryCentroid(f); const p=ps.length?ps.sort((a,b)=>a.rank-b.rank)[0]:null;
        seq.push({kind:'point',pt:{ko:f.properties.ko,lat:p?p.lat:c[1],lon:p?p.lon:c[0]}}); }
      else seq.push({kind:'country',c:{iso3:f.id,ko:f.properties.ko}});
      continue;
    }
    if(hit.kind==='place'&&hit.p.area&&!/점으로|점만/.test(q)){ const a=hit.p.area; seq.push({kind:'area',a:{ko:hit.p.ko,lat:a.lat,lon:a.lon,rx:a.rx,ry:a.ry,rot:a.rot||0}}); continue; }   // 섬 무리(쿠릴 열도 등)는 점선 타원
    if(hit.kind==='place') seq.push({kind:'point',pt:{ko:hit.p.ko,en:hit.p.en,lat:hit.p.lat,lon:hit.p.lon}});
  }
  // 라벨 짝짓기: "A 로테르담" (앞) / "로테르담 A" (뒤)
  const firstLabel=seq.findIndex(x=>x.kind==='label');
  let mode='before';
  if(firstLabel>0&&seq[firstLabel-1].kind!=='label'){
    // 앞에 하천만 있고 문장이 이름으로 끝나면('라인강, A 로테르담, B 함부르크') 라벨은 뒤 이름에 붙는다
    const onlyRivers=seq.slice(0,firstLabel).every(x=>x.kind==='river'), lastIsLabel=seq.length&&seq[seq.length-1].kind==='label';
    mode=onlyRivers&&!lastIsLabel?'before':'after'; }
  if(firstLabel>=0&&seq[firstLabel].after) mode='after';
  const things=[];
  for(let i=0;i<seq.length;i++){
    const x=seq[i];
    if(x.kind==='label'){
      if(x.after||mode==='after'){ const prev=things[things.length-1]; if(prev&&!prev.label) prev.label=x.L; }
      else { const nx=seq.slice(i+1).find(y=>y.kind!=='label'); if(nx&&!nx.label) nx.label=x.L; }
      continue;
    }
    things.push(x);
  }
  for(const x of things){
    if(x.kind==='river'){ for(const k of x.keys) if(!spec.rivers.includes(k)) spec.rivers.push(k);
      if(x.label){ const pt=riverLabelPt(x.key); if(pt) spec.points.push({ko:x.keys.length>1?'티그리스·유프라테스강':x.key,lat:pt[0],lon:pt[1],label:x.label,marker:ring?'ring':'dot'}); } continue; }
    if(x.kind==='point') spec.points.push({...x.pt,label:x.label||null,marker:ring?'ring':'dot'});
    else if(x.kind==='country') spec.countries.push({...x.c,label:x.label||null,style:cstyle});
    else if(x.kind==='area') spec.areas.push({...x.a,label:x.label||null});
  }
  if(!spec.labelSeq){ const any=things.find(x=>x.label); spec.labelSeq=any?seqOfLabel(any.label):'latin'; }
  const count=(spec.seas?1:0)+spec.points.length+spec.countries.length+spec.areas.length+spec.rivers.length+(spec.zone?1:0)+(spec.plates?1:0)+(spec.relief?1:0);
  return {spec,unknown,count,understood:unknown.length===0&&count>0};
}

/* ───────── Claude에게 보낼 요청문 ───────── */
function buildPrompt(q,current){
  const regions=PRESETS.map(p=>`${p.id}(${p.name})`).join(', ');
  const rivers=Object.keys(RIVERS).join(', ');
  return `너는 한국 대학수학능력시험 세계지리 시험지에 들어가는 흑백 백지도를 만드는 도우미다.
교사의 요청을 읽고, 지도에 표시할 것을 JSON 하나로만 답하라. 다른 말은 쓰지 마라.

규칙
- 도시·항구·유적 같은 지점은 points에 넣는다. ko는 한국 교과서 표기, en은 영어 이름, lat·lon은 소수 둘째 자리(북위·동경은 +, 남위·서경은 −).
- 국가 하나를 가리키면 countries에 ISO 3166-1 alpha-3 코드(iso3)로 넣는다. 국가는 회색 음영으로 칠해진다.
- 국가의 style: shade(음영만) | circle(음영 + 나라 전체를 감싸는 굵은 점선 타원, 필리핀·일본·뉴질랜드 같은 섬나라에 흔함) | multi(음영 + 라벨 하나에서 큰 섬마다 지시선, 인도네시아처럼 넓은 군도). 교사가 말하지 않았으면 null로 두면 페이지가 섬나라인지 보고 고른다.
- 사막·산지·분지·평원처럼 넓은 지역은 areas에 중심 좌표와 반지름(rx: 경도 방향 도, ry: 위도 방향 도)으로 넣는다. 점선 타원으로 그려진다.
- 하천을 그려 달라고 하면 rivers에 아래 하천 목록의 이름을 그대로 쓴다.
- 바다 이름을 넣어 달라고 하면 seas에 {"oceans":true(태평양·대서양·인도양·북극해·남극해 가운데 지도에 들어오는 것),"names":[이름 목록]}. names는 ${SEA_NAMES.join('·')} 중에서만.
- label: 교사가 정한 라벨을 그대로 쓴다. 정하지 않았으면 null로 두면 언급 순서대로 붙는다.
- labelSeq: latin(A,B,C) | gana((가),(나)) | circ(㉠,㉡) | mk(㉮,㉯) | jamo(ㄱ,ㄴ) | num(1,2) | lower(a,b) 중 하나.
- marker: dot(검은 점, 기본) | ring(속 빈 원) | none(글자만).
- region: 아래 지역 목록 중 표시할 것이 모두 들어가는 가장 좁은 것. 맞는 것이 없으면 null(자동으로 범위를 잡는다).
- 설명으로 장소를 가리키면(예: "라인강 하구의 석유 화학 항구 도시") 해당 장소를 추론해서 넣는다.
- "오답 선지", "헷갈리는 도시 n개 더" 같은 요청이면 같은 지역의 그럴듯한 장소를 더한다.
- 현재 지도가 주어지고 요청이 그 지도를 고치라는 뜻이면(바꿔, 빼, 추가, 옮겨 등) 현재 지도를 고친 전체를 다시 준다. 새 지도를 원하는 요청이면 현재 지도를 무시한다.
- lines: equator(적도), tropics(남·북회귀선), polar(남·북극권) 표시 여부. borders: 국경선 표시(true/false), 정하지 않았으면 null.
- relief: 습곡 산지·안정 육괴를 칠할 때 {"on":true,"show":{"shield":bool,"old":bool,"new":bool},"only":[산맥 id 목록, 비우면 전부],"names":bool}. id: appalachian, ural, scandinavian, greatdividing, drakensberg(고기) / rocky, sierramadre, andes, alps, pyrenees, carpathian, dinaric, atlas, caucasus, zagros, hindukush, himalaya, southernalps(신기) / canadian, guiana, brazilian, siberian, deccan, australian, baltic, african, arabian(안정 육괴). 요청이 없으면 null.
- plates: 판의 경계를 그릴 때 {"on":true,"typed":true(수렴·발산·보존 선 모양 구분)|false,"names":true(큰 판 이름)|false}. 요청이 없으면 null.
- legend: 범례 자리 bl(왼쪽 아래)|br|tl|tr|outR(지도 밖 오른쪽)|outB(지도 밖 아래)|none. 기후 지역·판의 경계가 있을 때만 쓰인다. 정하지 않았으면 null.
- scale: 축척 막대 auto|bl|br|tl|tr|none. 세계·대륙 전도가 아닌 지역 지도에서 ‘축척’을 말하면 auto. 정하지 않았으면 null.
- zone: 쾨펜 기후 지역을 칠할 때 {"belts":{"A":"off|one|mid|detail","B":…,"C":…,"D":…,"E":…},"only":[갈래 키, 비우면 전부],"tone":{갈래 키:"light|mid|dark|hatch|hatch2|cross|dots"}}. A 열대·B 건조·C 온대·D 냉대·E 한대. one=기후대 하나로(키 A~E), mid=교과서 기후(키 Af 열대 우림, Am 열대 몬순, Aw 사바나, BW 사막, BS 스텝, Cs 지중해성, Cw 온대 겨울 건조, Cfa 온난 습윤, Cfbc 서안 해양성, Df 냉대 습윤, Dw 냉대 겨울 건조, Ds 냉대 여름 건조, ET 툰드라, EF 빙설), detail=쾨펜 기호(키는 기호 그대로, 예: Cfb). 특정 기후만 요청하면 그 키만 only에. 요청이 없으면 null.
- order: 기호를 위치 순서로 다시 붙일 때 cw(12시부터 시계 방향)|ccw(시계 반대 방향)|we(서쪽부터)|ns(북쪽부터). 정하지 않았으면 null.
- grat: 경위선망 간격(도) 0|10|15|20|30. 정하지 않았으면 null(북극 중심 지도는 30). noLbl: true면 점에 기호를 붙이지 않는다(‘지도에 표시된 지역 중 하나’ 유형).
- answer: 교사에게 보여 줄 한두 문장 한국어 설명. 각 라벨이 무엇인지 적는다.

지역 목록: ${regions}
하천 목록: ${rivers}

출력 예:
{"region":"europe","labelSeq":"latin","points":[{"ko":"로테르담","en":"Rotterdam","lat":51.92,"lon":4.48,"label":"A","marker":"dot"}],"countries":[{"iso3":"ETH","ko":"에티오피아","label":"B","tone":"mid","style":null}],"areas":[{"ko":"사하라 사막","lat":23,"lon":12,"rx":18,"ry":7,"label":null}],"rivers":["라인강"],"lines":{"equator":false,"tropics":false,"polar":false},"borders":null,"answer":"A는 로테르담, B는 에티오피아입니다."}

현재 지도: ${current?JSON.stringify(current):'없음'}

교사의 요청:
"""${String(q).slice(0,4000)}"""`;
}

return {scaleInfo,niceKm,clean,fitItems,relabelItems,answerKey,placeSeas,SEA_NAMES,OCEANS,seaLabel,sheetExtra,legendLayout,ZONE_BELTS,ZB,ZONE_LEVELS,zoneOn,normZone,loadRelief,reliefList,RELIEF_CAT,RELIEF_TONE,loadPlates,PLATE_STYLE,ZONE_LEGEND,ZONE_LABEL,ZONE_TONES,ZONE_TONE,zoneGroups,loadZones,MMPT,M,clamp,r3,uid,esc,norm,RAD,RIVERS,RIVER_OF,resolveRiver,KO_FIX,FONTS,userFont,fontDef,fontStack,fontInstalled,fontAvailable,needsWebFallback,labelText,ensureGlyphs,
  SEQS,nextLabel,seqOfLabel,PROJS,kxOf,PRESETS,presetById,makeProj,fitView,applyPreset,freshDoc,normalizeDoc,
  geo,LODS,onData,loadLod,anyGeo,degAcross,wantLod,G,currentLodName,ensureGeo,
  loadPlaces,searchPlaces,exactPlaces,resolvePlace,findCountry,searchCountries,
  fmtLat,fmtLon,fmtTick,parseCoord,gray,toneColor,markerR,labelFont,metrics,boxEdge,ellPoint,geomOf,placeOffset,countryMain,countryCentroid,countryAt,
  drawBase,drawOverlay,paintSheet,SvgCtx,readyForExport,renderPng,withDpi,svgString,saveFile,copyPng,
  autoLabel,applyCountryStyle,chooseCountryStyle,specToDoc,chooseView,docToSpec,parseRules,buildPrompt};
})();
