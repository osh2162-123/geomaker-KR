#!/usr/bin/env node
/* 겹침 검사 실행기 — Node 내장 모듈 + 이 PC의 크롬(헤드리스)만 쓴다. 배포 파일 아님.
   node scripts/layout/run.mjs [시나리오 파일·폴더 ...] [--out 폴더] [--only 앱] [--snap 파일] [--cmp 파일] [--png all|fail|none]
     기본 시나리오: scripts/layout/scenarios/*.json   기본 출력: ../layout-out (저장소 밖)
     --snap  각 사례의 SVG 해시를 저장(기준판 만들 때)
     --cmp   저장한 해시와 비교: 바뀐 사례가 기준판에서 '걸린' 사례였는지 확인(걸리지 않은 그림이 바뀌면 회귀)
   종료 코드: 0 정상(검출이 있어도 0) · 1 회귀(--cmp에서 걸리지 않은 그림이 바뀜) · 2 실행 오류 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import {spawn} from 'node:child_process'; import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url)); const ROOT=path.resolve(HERE,'..','..');
const args=process.argv.slice(2); const opt={out:path.resolve(ROOT,'..','layout-out'),png:'fail',files:[]};
for(let i=0;i<args.length;i++){ const a=args[i]; if(a==='--out') opt.out=path.resolve(args[++i]); else if(a==='--only') opt.only=args[++i]; else if(a==='--snap') opt.snap=path.resolve(args[++i]); else if(a==='--cmp') opt.cmp=path.resolve(args[++i]); else if(a==='--png') opt.png=args[++i]; else opt.files.push(path.resolve(a)); }
if(!opt.files.length) opt.files.push(path.join(HERE,'scenarios'));

/* ── 시나리오 읽기·펼치기 ── */
function listJson(p){ const st=fs.statSync(p); if(st.isDirectory()) return fs.readdirSync(p).filter(f=>f.endsWith('.json')).sort().flatMap(f=>listJson(path.join(p,f))); return [p]; }
function expand(sc){ /* vary: {경로:[값...]} 의 모든 조합 */
  const keys=Object.keys(sc.vary||{}); if(!keys.length) return [sc];
  let combos=[{}]; for(const k of keys){ const next=[]; for(const c of combos) for(const v of sc.vary[k]) next.push(Object.assign({},c,{[k]:v})); combos=next; }
  return combos.map(c=>{ const s=JSON.parse(JSON.stringify(sc)); delete s.vary; s.set=Object.assign({},sc.set||{}); const tag=[];
    for(const [k,v] of Object.entries(c)){ if(k==='kind') s.kind=v; else s.set[k]=v; tag.push(k.split('.').pop()+'='+JSON.stringify(v)); } s.id=sc.id+'['+tag.join(',')+']'; return s; });
}
let scen=[]; const seen=new Set();
for(const f of opt.files.flatMap(listJson)){ let arr; try{ arr=JSON.parse(fs.readFileSync(f,'utf8')); }catch(e){ console.error('시나리오 파일을 읽지 못함:',f,e.message); process.exit(2); }
  if(!Array.isArray(arr)) arr=arr.scenarios||[];
  for(const sc of arr){ if(!sc.id||!sc.app){ console.error('id·app 없는 시나리오:',f,JSON.stringify(sc).slice(0,80)); process.exit(2); } for(const s of expand(sc)){ if(seen.has(s.id)){ console.error('id 중복:',s.id); process.exit(2); } seen.add(s.id); s.file=path.basename(f); scen.push(s); } } }
if(opt.only) scen=scen.filter(s=>s.app===opt.only);
/* 같은 문장끼리 붙여서 실행(문장 해석은 한 번만) */
scen.sort((a,b)=>(a.app+'|'+(a.q||'')).localeCompare(b.app+'|'+(b.q||'')));
console.log(`시나리오 ${scen.length}개`);

/* ── 정적 서버 + 크롬 ── */
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{ let p=decodeURIComponent(new URL(q.url,'http://x').pathname); if(p.endsWith('/')) p+='index.html'; if(/sw\.js$/.test(p)){ r.writeHead(404); r.end(); return; } const f=path.join(ROOT,p); if(!f.startsWith(ROOT)){ r.writeHead(403); r.end(); return; } fs.readFile(f,(e,b)=>{ if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'}); r.end(b); }); });
await new Promise(ok=>srv.listen(0,'127.0.0.1',ok)); const port=srv.address().port;
const CHROME=[process.env.CHROME,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(p=>p&&fs.existsSync(p));
if(!CHROME){ console.error('크롬을 찾지 못함(CHROME 환경 변수로 지정)'); process.exit(2); }
const prof=fs.mkdtempSync(path.join(os.tmpdir(),'gmlay-'));
const chrome=spawn(CHROME,['--headless=new','--remote-debugging-port=0','--user-data-dir='+prof,'--window-size=1500,950','--no-first-run','--disable-extensions','about:blank'],{stdio:['ignore','ignore','pipe']});
const cleanup=()=>{ try{ chrome.kill(); }catch(e){} try{ srv.close(); }catch(e){} };
const wsUrl=await new Promise((ok,no)=>{ let buf=''; chrome.stderr.on('data',d=>{ buf+=d; const m=buf.match(/DevTools listening on (ws:\S+)/); if(m) ok(m[1]); }); setTimeout(()=>no(new Error('크롬 DevTools 연결 실패')),20000); });
const base=wsUrl.replace(/^ws/,'http').replace(/\/devtools.*$/,'');
const tgt=await (await fetch(base+'/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(ok=>ws.onopen=ok);
let mid=0; const pend={}; const consoleErr=[];
ws.onmessage=e=>{ const m=JSON.parse(e.data); if(m.id&&pend[m.id]){ pend[m.id](m); delete pend[m.id]; } else if(m.method==='Runtime.exceptionThrown') consoleErr.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text); };
const send=(method,params={})=>new Promise(ok=>{ const i=++mid; pend[i]=ok; ws.send(JSON.stringify({id:i,method,params})); });
const ev=async expr=>{ const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true}); if(r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text); return r.result.result.value; };
await send('Runtime.enable'); await send('Page.enable');
await send('Page.navigate',{url:`http://127.0.0.1:${port}/index.html`});
for(let i=0;i<60;i++){ await new Promise(r=>setTimeout(r,250)); try{ if(await ev(`typeof HUB==='object'&&!!document.querySelector('.hub')`)) break; }catch(e){} }
await new Promise(r=>setTimeout(r,800));
await ev(fs.readFileSync(path.join(HERE,'probe.js'),'utf8'));

/* ── 실행 ── */
fs.mkdirSync(path.join(opt.out,'png'),{recursive:true});
const results=[]; const t0=Date.now();
for(const [i,sc] of scen.entries()){
  let r; try{ r=await ev(`__LAY.run(${JSON.stringify(sc)})`); }catch(e){ r={ok:false,err:String(e.message||e).slice(0,300)}; }
  r.id=sc.id; r.app=sc.app; r.q=sc.q||''; r.file=sc.file; r.set=sc.set||{}; r.reqKind=sc.kind||'';
  const hard=(r.issues||[]).filter(x=>x.rule!=='G');
  if(r.ok&&(opt.png==='all'||(opt.png==='fail'&&hard.length))){ const url=await ev(`__LAY.snapshot(8)`); if(url){ const fn=sc.id.replace(/[^\w가-힣.-]+/g,'_').slice(0,120)+'.png'; fs.writeFileSync(path.join(opt.out,'png',fn),Buffer.from(url.split(',')[1],'base64')); r.png='png/'+fn; } }
  results.push(r);
  if((i+1)%25===0) console.log(`  ${i+1}/${scen.length} (${Math.round((Date.now()-t0)/1000)}초)`);
}
ws.close(); cleanup();

/* ── 요약·보고서 ── */
const cnt=k=>results.filter(k).length;
const byRule={}; for(const r of results) for(const x of r.issues||[]) byRule[x.rule]=(byRule[x.rule]||0)+1;
const summary={total:results.length,ok:cnt(r=>r.ok&&!r.empty),empty:cnt(r=>r.empty),parseFail:cnt(r=>r.parseFail),error:cnt(r=>!r.ok&&!r.parseFail),
  flagged:cnt(r=>(r.issues||[]).some(x=>x.rule!=='G')),warnOnly:cnt(r=>(r.issues||[]).length&&(r.issues||[]).every(x=>x.rule==='G')),byRule,consoleErrors:consoleErr.slice(0,20)};
let regress=null;
if(opt.cmp){ const basis=JSON.parse(fs.readFileSync(opt.cmp,'utf8')); regress={changedFlagged:[],changedClean:[],missing:[]};
  for(const r of results){ const b=basis[r.id]; if(!b){ regress.missing.push(r.id); continue; } if(b.svgHash!==r.svgHash) (b.flagged?regress.changedFlagged:regress.changedClean).push(r.id); }
  summary.regress={changedFlagged:regress.changedFlagged.length,changedClean:regress.changedClean.length,missing:regress.missing.length}; }
if(opt.snap){ const o={}; for(const r of results) if(r.ok) o[r.id]={svgHash:r.svgHash,flagged:(r.issues||[]).some(x=>x.rule!=='G')}; fs.writeFileSync(opt.snap,JSON.stringify(o,null,1)); }
fs.writeFileSync(path.join(opt.out,'results.json'),JSON.stringify({summary,regress,results},null,1));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const rows=results.filter(r=>!r.ok||(r.issues||[]).some(x=>x.rule!=='G')).map(r=>`<section><h3>${esc(r.id)} <small>${esc(r.app)} · ${esc(r.kind||r.reqKind)}</small></h3><p class=q>${esc(r.q)} ${Object.keys(r.set).length?'<code>'+esc(JSON.stringify(r.set))+'</code>':''}</p>${r.ok?'':`<p class=err>${esc(r.parseFail?'문장 해석 실패 '+(r.msg||''):r.err)}</p>`}<ul>${(r.issues||[]).filter(x=>x.rule!=='G').slice(0,12).map(x=>`<li><b>${x.rule}</b> ${esc(x.a)} ↔ ${esc(x.b)} ${x.area?`(${x.area} mm²)`:''}</li>`).join('')}</ul>${r.png?`<img src="${esc(r.png)}">`:''}</section>`).join('\n');
fs.writeFileSync(path.join(opt.out,'index.html'),`<!doctype html><meta charset=utf-8><title>겹침 검사</title><style>body{font:14px sans-serif;margin:20px;background:#f4f6f8}section{background:#fff;margin:0 0 14px;padding:12px;border-radius:8px}h3{margin:0 0 4px;font-size:15px}small{color:#888;font-weight:400}.q{color:#333;margin:2px 0}.err{color:#c00}img{max-width:100%;border:1px solid #ddd}code{background:#eef;padding:1px 4px}li b{color:#c00}</style><h1>겹침 검사 결과</h1><pre>${esc(JSON.stringify(summary,null,1))}</pre><p>빨강=A(앞 항목), 파랑=B(뒤 항목). G(좁은 간격) 경고는 results.json에만 있음.</p>${rows}`);
console.log(JSON.stringify(summary,null,1)); console.log('보고서:',path.join(opt.out,'index.html'));
if(regress&&regress.changedClean.length){ console.log('회귀: 걸리지 않았던 그림이 바뀜 →',regress.changedClean.slice(0,20).join(', ')); process.exit(1); }
process.exit(summary.error&&summary.error===summary.total?2:0);
