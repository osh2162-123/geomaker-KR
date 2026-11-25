/* 한국 통계 지도 엔진(SM): 시험지 양식의 단계구분도를 만든다.
   바탕 지도는 KM(kengine.js)으로 그리고, 글자·범례는 LG 항목 꼴(속성 객체)로 돌려준다.
   - 지도 여러 장(최대 3) 나란히 + (가)(나)(다) + 범례 1개(같은 꼴이면) + 아랫줄(각주·연도·출처)
   - 칠하기 4방식: 상위·하위 N, 조건, 서열 단계(높음↕낮음), 구간 단계(이상~미만)
   자료(GMDATA.kstat)는 setStat으로 받는다. 값의 열쇠는 kmdata 2026년 4월 기준(ver a) 행안부 코드(시군구 5자리, 시도 2자리). */
const SM=(function(){
'use strict';
let S=null;
function setStat(d){ S=d||null; }
function stat(){ return S; }
const f2=v=>Math.round(v*100)/100;
const PT=0.3528;                       /* 1pt = 0.3528 mm */
const PANEL_KO=['(가)','(나)','(다)'];

/* ───────── 회색 ───────── */
const GRAY={
  top:'#7f7f7f', bottom:'#d9d9d9', cond:'#b2b2b2',
  ord:{2:['#d9d9d9','#7f7f7f'],3:['#dedede','#a6a6a6','#6e6e6e'],4:['#ffffff','#d6d6d6','#a3a3a3','#6e6e6e'],5:['#ffffff','#dcdcdc','#b3b3b3','#8c8c8c','#666666']},
  int:{2:['#d9d9d9','#7f7f7f'],3:['#dedede','#a6a6a6','#6e6e6e'],4:['#ececec','#c4c4c4','#959595','#666666'],5:['#ffffff','#dcdcdc','#b3b3b3','#8c8c8c','#666666']}
};

/* ───────── 자료 꺼내기 ───────── */
function entry(key){ return S&&S.ind&&S.ind[key]||null; }
/* 지도 경계 기준이 b(2026년 7월)면 통합 코드 → a 코드로 거꾸로 찾는다 */
function b2a(){ const m={}; const a2b=(S&&S.a2b)||{}; for(const [a,b] of Object.entries(a2b)) m[b]=a; return m; }
function valueOf(ind,code,vals){ const V=vals||ind.vals||{}; if(V[code]!=null) return +V[code]; const r=b2a()[code]; return r!=null&&V[r]!=null?+V[r]:null; }

/* 지도 범위 안의 단위(칠하기 대상) */
function unitsOf(map,L){
  const out=[]; const seen=new Set();
  if(map.level==='sido'){ for(const f of L.feats){ const s=f.p.s; if(!s||s==='NK'||seen.has(s)) continue; seen.add(s); out.push({code:s,shade:'s:'+s,name:KM.sidoName(s)}); } }
  else for(const f of L.feats){ const p=f.p; if(!p||p.s==='NK'||seen.has(p.c)) continue; seen.add(p.c); out.push({code:p.c,shade:p.c,name:p.n,s:p.s}); }
  return out;
}

/* ───────── 어림수 ───────── */
function niceRound(v){ if(!isFinite(v)||v===0) return 0; const s=Math.sign(v), a=Math.abs(v); const e=Math.pow(10,Math.floor(Math.log10(a)));
  const c=[1,1.5,2,2.5,3,4,5,6,7,8,10].map(m=>m*e); let best=c[0]; for(const x of c) if(Math.abs(x-a)<Math.abs(best-a)) best=x; return s*+best.toPrecision(6); }
function quant(sorted,q){ const i=(sorted.length-1)*q, lo=Math.floor(i), hi=Math.ceil(i); return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo); }
/* 구간 경계: 같은 개수로 나눈 뒤 어림수로. 겹치면 등간격으로 */
function niceBreaks(vals,n){
  const s=vals.slice().sort((a,b)=>a-b); const lo=s[0], hi=s[s.length-1]; if(!(hi>lo)) return [];
  let b=[]; for(let i=1;i<n;i++) b.push(niceRound(quant(s,i/n)));
  const ok=b.every((x,i)=>x>lo&&x<=hi&&(i===0||x>b[i-1]));
  if(!ok){ b=[]; for(let i=1;i<n;i++) b.push(niceRound(lo+(hi-lo)*i/n)); }
  return b.filter((x,i)=>x>lo&&x<=hi&&(i===0||x>b[i-1]));
}
function fmt(v){ const a=Math.abs(v); const d=a>=100?0:a>=10?1:2; return (+v.toFixed(d)).toLocaleString('en-US'); }

/* ───────── 칠하기 ───────── */
/* panel: {key, mode:'topbottom'|'cond'|'ordinal'|'interval', n, op, v, rank, classes, breaks, vals} → {fill:{shadeKey:'#hex'}, legend, warn} */
function classify(panel,units){
  const ind=entry(panel.key); const warn=[];
  if(!ind) return {fill:{},legend:null,warn:[`지표를 찾지 못했어요: ${panel.key||'(없음)'}`]};
  const rows=[]; const miss=[];
  for(const u of units){ const v=valueOf(ind,u.code,panel.vals); if(v==null||!isFinite(v)) miss.push(u.name); else rows.push({u,v}); }
  if(miss.length) warn.push(`값이 없는 지역 ${miss.length}곳(흰색으로 둠): ${miss.slice(0,5).join(', ')}${miss.length>5?' 외':''}`);
  const fill={}; let legend=null; const mode=panel.mode||'topbottom';
  rows.sort((a,b)=>b.v-a.v);
  if(mode==='topbottom'){
    const n=Math.max(1,Math.min(+panel.n||5,Math.floor(rows.length/2)));
    if(rows.length<2*n) warn.push('지역 수가 적어 상위·하위를 나눌 수 없어요.');
    if(rows[n-1]&&rows[n]&&rows[n-1].v===rows[n].v) warn.push(`상위 ${n}위와 ${n+1}위 값이 같아요(${fmt(rows[n].v)}). 출제 전에 확인하세요.`);
    const m=rows.length; if(rows[m-n]&&rows[m-n-1]&&rows[m-n].v===rows[m-n-1].v) warn.push(`하위 ${n}위와 ${n+1}위 값이 같아요(${fmt(rows[m-n].v)}). 출제 전에 확인하세요.`);
    rows.slice(0,n).forEach(r=>fill[r.u.shade]=GRAY.top); rows.slice(m-n).forEach(r=>fill[r.u.shade]=GRAY.bottom);
    legend={kind:'box',rows:[{fill:GRAY.top,label:`상위 ${n}개 지역`},{fill:GRAY.bottom,label:`하위 ${n}개 지역`}]};
  } else if(mode==='cond'){
    let pick;
    if(panel.rank) pick=rows.slice(0,+panel.rank);
    else { const v=+panel.v; const op=panel.op||'>='; pick=rows.filter(r=>op==='>='?r.v>=v:op==='>'?r.v>v:op==='<='?r.v<=v:r.v<v); }
    pick.forEach(r=>fill[r.u.shade]=GRAY.cond);
    legend=panel.label?{kind:'box',rows:[{fill:GRAY.cond,label:panel.label}]}:null;
  } else if(mode==='ordinal'||mode==='interval'){
    const c=Math.max(2,Math.min(+panel.classes||(mode==='ordinal'?5:3),5));
    let br=Array.isArray(panel.breaks)&&panel.breaks.length===c-1?panel.breaks.map(Number):null;
    if(!br){ if(mode==='ordinal'){ const s=rows.map(r=>r.v).sort((a,b)=>a-b); br=[]; for(let i=1;i<c;i++) br.push(quant(s,i/c)); }
      else br=niceBreaks(rows.map(r=>r.v),c); }
    const k=br.length+1; const tones=(mode==='ordinal'?GRAY.ord:GRAY.int)[k]||GRAY.int[3];
    const cls=v=>{ let i=0; while(i<br.length&&v>=br[i]) i++; return i; };
    for(const r of rows) fill[r.u.shade]=tones[cls(r.v)];
    if(k<c) warn.push(`값이 고르지 않아 ${c}단계 대신 ${k}단계로 나눴어요.`);
    if(mode==='ordinal') legend={kind:'ordinal',tones:tones.slice().reverse()};
    else { const u=ind.unit?`(${ind.unit})`:''; const rws=[];
      for(let i=k-1;i>=0;i--){ const lab=i===k-1?`${fmt(br[i-1])} 이상`:i===0?`${fmt(br[0])} 미만`:`${fmt(br[i-1])} 이상~${fmt(br[i])} 미만`; rws.push({fill:tones[i],label:lab}); }
      legend={kind:'box',title:`${ind.ko}${u}`,rows:rws}; }
    legend.breaks=br;
  }
  if(legend) legend.sig=JSON.stringify([legend.kind,legend.title||'',(legend.rows||[]).map(r=>r.fill+r.label),legend.tones||[]]);
  return {fill,legend,warn,count:rows.length};
}

/* ───────── 바탕 지도(패널 나란히) ───────── */
const GAP=4, TITLE_H=6.2;
function base(doc){
  const panels=(doc.panels&&doc.panels.length?doc.panels:[{}]).slice(0,3);
  const out=[]; const warn=[]; let x=0, H=0; const parts=[];
  for(let i=0;i<panels.length;i++){
    const P=panels[i]; const map=Object.assign(KM.normalizeMap(doc.map),{shade:{}});
    const L=KM.layout(map); if(!L){ warn.push('지도 범위를 고르세요.'); return null; }
    const units=unitsOf(map,L); const C=classify(P,units); warn.push(...C.warn.map(w=>panels.length>1?`${PANEL_KO[i]} ${w}`:w));
    map.shade=Object.assign({},C.fill,P.extraShade||{});
    const r=KM.render(map); if(!r) return null;
    const y=panels.length>1||P.title?TITLE_H:0;
    parts.push({i,x,y,w:r.w,h:r.h,L:r.L,map,C,svg:r.svg});
    x+=r.w+GAP; H=Math.max(H,y+r.h);
  }
  const W=x-GAP;
  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W)} ${f2(H)}">`;
  /* 패널마다 무늬 id가 겹치지 않게 바꾼다 */
  for(const p of parts) svg+=p.svg.replace(/kmHatch/g,'kmHatch'+p.i).replace(/kmDots/g,'kmDots'+p.i).replace(/kmSkClip/g,'kmSkClip'+p.i).replace(/kmLandR?/g,m=>m+p.i)
    .replace(/^<svg /,`<svg x="${f2(p.x)}" y="${f2(p.y)}" `).replace(/ width="[\d.]+mm" height="[\d.]+mm"/,` width="${f2(p.w)}" height="${f2(p.h)}"`);
  svg+='</svg>';
  return {svg,w:W,h:H,parts,warn};
}

/* 글자 너비(mm): 브라우저에서는 LG의 실제 글꼴 재기를 쓰고, 없으면 어림 */
let MST=null;
function tw(s,pt,fam){ if(typeof LG!=='undefined'&&LG.labelBox&&MST){ try{ return LG.labelBox({style:MST},{t:'text',text:String(s),size:pt,fam:fam||'gothic'}).w+0.3; }catch(e){} } return textW(s,pt)*1.08+0.3; }
function textW(s,pt){ let em=0; for(const ch of String(s)){ if(/[가-힣ㄱ-ㅎ]/.test(ch)) em+=1; else if(/[()（）]/.test(ch)) em+=0.36; else if(ch===' ') em+=0.3; else if(/[~·,.]/.test(ch)) em+=0.42; else if(/[A-Z%]/.test(ch)) em+=0.7; else em+=0.52; } return em*pt*PT; }

/* 쪽 위 상자들이 땅을 덮는 정도(패널 기준) */
function landIn(part,r){ const L=part.L; const q={x:r.x-part.x,y:r.y-part.y,w:r.w,h:r.h}; if(q.x<0||q.y<0||q.x+q.w>part.w||q.y+q.h>part.h) return 1;
  let n=0,c=0; for(let i=0;i<10;i++) for(let j=0;j<8;j++){ const px=q.x+q.w*(i+0.5)/10, py=q.y+q.h*(j+0.5)/8; n++; if(KM.featuresAt(L,px,py).length) c++; } return c/n; }
const ovl=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;

/* ───────── 범례 항목 ───────── */
const LEG_PT=9;
function legendSize(lg){
  const fs=LEG_PT*PT, row=fs*1.55, sw=fs*1.9, sh=fs*1.05, pad=1.2;
  if(lg.kind==='ordinal'){ const n=lg.tones.length; const lab=tw('높음',LEG_PT); return {w:pad*2+sw+1.2+lab, h:pad*2+n*sh, fs,sw,sh,row,pad}; }
  const tw0=Math.max(...lg.rows.map(r=>tw(r.label,LEG_PT)), lg.title?tw(lg.title,LEG_PT)-sw-1.2:0);
  return {w:pad*2+sw+1.2+tw0, h:pad*2+(lg.title?row:0)+lg.rows.length*row-(row-sh)*0.4, fs,sw,sh,row,pad};
}
function legendItems(lg,x,y){
  const z=legendSize(lg); const it=[];
  it.push({t:'rect',x,y,w:z.w,h:z.h,fill:'white',stroke:'solid',lw:0.15,km:'kstat'});
  if(lg.kind==='ordinal'){
    const x0=x+z.pad, y0=y+z.pad;
    lg.tones.forEach((f,i)=>it.push({t:'rect',x:x0,y:y0+i*z.sh,w:z.sw,h:z.sh,fill:f,stroke:'solid',lw:0.12,km:'kstat'}));
    const tx=x0+z.sw+0.9, bot=y0+lg.tones.length*z.sh;
    it.push({t:'text',x:tx,y:y0-0.1,text:'높음',size:LEG_PT,fam:'gothic',align:'left',box:'none',km:'kstat'});
    it.push({t:'text',x:tx,y:bot-z.fs*1.05,text:'낮음',size:LEG_PT,fam:'gothic',align:'left',box:'none',km:'kstat'});
    const ax=tx+tw('높음',LEG_PT)/2-0.15; it.push({t:'arrow',x1:ax,y1:y0+z.fs*1.35,x2:ax,y2:bot-z.fs*1.25,lw:0.3,head:'both',dash:'solid',bend:0,km:'kstat'});
    return it;
  }
  let yy=y+z.pad;
  if(lg.title){ it.push({t:'text',x:x+z.pad,y:yy,text:lg.title,size:LEG_PT,fam:'gothic',align:'left',box:'none',km:'kstat'}); yy+=z.row; }
  for(const r of lg.rows){ it.push({t:'rect',x:x+z.pad,y:yy,w:z.sw,h:z.sh,fill:r.fill,stroke:'solid',lw:0.12,km:'kstat'});
    it.push({t:'text',x:x+z.pad+z.sw+1.2,y:yy+z.sh/2-z.fs/2,text:r.label,size:LEG_PT,fam:'gothic',align:'left',box:'none',km:'kstat'}); yy+=z.row; }
  return it;
}

/* ───────── 저절로 놓는 항목(제목·축척·범례·아랫줄) ───────── */
const VER_NOTE={a:'* 지도는 2026년 행정 구역 개편 이전을 나타냄.',b:'* 지도는 2026년 행정 구역 개편 이후를 나타냄.'};
function autoItems(doc,B){
  if(!B) return {items:[],w:0,h:0};
  MST=Object.assign({serif:'hysm',gothic:'hyjg',latin:'times',size:10,lw:0.15},doc.style||{});
  const items=[]; const occ=[]; const many=B.parts.length>1;
  const T_PT=10;
  /* 제목 (가)(나)(다) */
  for(const p of B.parts){ const P=doc.panels&&doc.panels[p.i]||{}; const t=P.title!=null?P.title:(many?PANEL_KO[p.i]:'');
    if(t){ items.push({t:'text',x:p.x+p.w/2,y:0.3,text:t,size:T_PT,fam:'serif',align:'center',box:'none',km:'kstat'}); } }
  /* 축척(패널마다) */
  for(const p of B.parts){ if(p.map.scale===false) continue; const sb=KM.scaleBarItems(p.L);
    for(const s of sb){ const o=Object.assign({},s,{km:'kstat'}); if(o.t==='line'){ o.x1+=p.x; o.x2+=p.x; o.y1+=p.y; o.y2+=p.y; } else { o.x+=p.x; o.y+=p.y; } items.push(o); }
    const xs=sb.flatMap(s=>s.t==='line'?[s.x1,s.x2]:[s.x,s.x+2.5]), ys=sb.flatMap(s=>s.t==='line'?[s.y1,s.y2]:[s.y,s.y+3]);
    occ.push({x:p.x+Math.min(...xs)-0.5,y:p.y+Math.min(...ys)-0.5,w:Math.max(...xs)-Math.min(...xs)+1,h:Math.max(...ys)-Math.min(...ys)+1});
    if(p.L.ubox) occ.push(Object.assign({},KM.boxOf(p.L,p.L.ubox),{x:KM.boxOf(p.L,p.L.ubox).x+p.x,y:KM.boxOf(p.L,p.L.ubox).y+p.y}));
    if(p.L.dbox){ const b=KM.boxOf(p.L,p.L.dbox); occ.push({x:b.x+p.x,y:b.y+p.y,w:b.w,h:b.h}); } }
  /* 범례: 모든 패널의 범례 꼴이 같으면 하나, 다르면 패널마다 */
  const lgs=B.parts.map(p=>p.C.legend);
  const same=lgs.every(l=>l&&lgs[0]&&l.sig===lgs[0].sig);
  let W=B.w, H=B.h; let below=0;
  const place=(lg,cands)=>{ const z=legendSize(lg);
    for(const c of cands){ const r={x:c.x,y:c.y,w:z.w,h:z.h}; const part=c.part; if(part&&landIn(part,r)>0.02) continue; if(occ.some(o=>ovl(o,r))) continue; occ.push(r); return r; }
    return null; };
  const at=(p,lg,k)=>{ const z=legendSize(lg); const m=0.8; const x=k[1]==='r'?p.x+p.w-z.w-m:p.x+m; const y=k[0]==='b'?p.y+p.h-z.h-m:p.y+m; return {part:p,x,y}; };
  let rowH=0;
  const putBelow=(lg,cx,row)=>{ const z=legendSize(lg); const r={x:Math.max(0,Math.min(W-z.w,cx-z.w/2)),y:H+1.2+(row?0:below),w:z.w,h:z.h}; if(row) rowH=Math.max(rowH,z.h+1.2); else below+=z.h+1.2; occ.push(r); return r; };
  if(same&&lgs[0]){ const lg=lgs[0]; let r=null;
    if(many&&B.parts.length===2){ /* 두 장: 사이 아래 빈 바다 → 각 모서리 → 아래 */ const p0=B.parts[0], p1=B.parts[1]; const z=legendSize(lg);
      r=place(lg,[{x:(p0.x+p0.w+p1.x)/2-z.w/2,y:p0.y+p0.h-z.h-0.8}]); }
    if(!r){ const last=B.parts[B.parts.length-1]; r=place(lg,['br','bl','tr','tl'].map(k=>at(last,lg,k)).concat(B.parts.slice(0,-1).reverse().flatMap(p=>['br','bl'].map(k=>at(p,lg,k))))); }
    if(!r) r=putBelow(lg,W/2);
    items.push(...legendItems(lg,r.x,r.y));
  } else for(const p of B.parts){ const lg=p.C.legend; if(!lg) continue; let r=place(lg,['bl','br','tl','tr'].map(k=>at(p,lg,k))); if(!r) r=putBelow(lg,p.x+p.w/2,true); items.push(...legendItems(lg,r.x,r.y)); }
  below=Math.max(below,rowH); H+=below;
  /* 아랫줄: 왼쪽 각주·연도, 오른쪽 출처 */
  const F=Object.assign({show:true,notes:[],verNote:true},doc.foot||{});
  if(F.show){ const fpt=9, fs=fpt*PT, lh=fs*1.45; let y=H+1.0;
    const notes=(F.notes||[]).filter(Boolean).slice(); const ver=(doc.map&&doc.map.ver)||'b';
    if(F.verNote) notes.push(VER_NOTE[ver]||'');
    const inds=B.parts.map(p=>entry((doc.panels[p.i]||{}).key)).filter(Boolean);
    const years=[...new Set(inds.map(e=>e.year).filter(Boolean))]; const srcs=[...new Set(inds.map(e=>e.src).filter(Boolean))];
    const year=F.year!=null?F.year:(years.length===1?years[0]:''); const src=F.src!=null?F.src:srcs.join('·');
    for(const n of notes.filter(Boolean)){ items.push({t:'text',x:0,y,text:n,size:fpt,fam:'gothic',align:'left',box:'none',km:'kstat'}); y+=lh; }
    const last=y;
    if(year) items.push({t:'text',x:0,y:last,text:`(${year})`,size:fpt,fam:'serif',align:'left',box:'none',km:'kstat'});
    if(src){ const s=`(${src})`; items.push({t:'text',x:W-tw(s,fpt,'gothic')+0.3,y:last,text:s,size:fpt,fam:'gothic',align:'left',box:'none',km:'kstat'}); }
    if(year||src) y+=lh;
    H=y+0.4; }
  return {items,w:W,h:H};
}

/* 한 번에: 바탕 + 항목 */
function compose(doc){ const B=base(doc); if(!B) return null; const A=autoItems(doc,B); return {base:B,items:A.items,w:A.w,h:A.h,warn:B.warn}; }
function freshPanel(key){ return {key:key||'',mode:'topbottom',n:5,classes:null,breaks:null,title:null}; }

return {setStat,stat,entry,valueOf,unitsOf,classify,base,autoItems,compose,niceBreaks,niceRound,freshPanel,GRAY,PANEL_KO,textW,legendSize};
})();
