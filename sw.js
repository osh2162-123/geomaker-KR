/* 지리 자료 제작기 서비스 워커: 처음 열 때 모든 자료를 기기에 저장하고, 그다음부터는 저장한 것을 먼저 쓴다 */
const V='gm-7d6bad4626';
const CORE=["./", "index.html", "manifest.webmanifest", "licenses.html", "guide.html", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-32.png", "icons/icon-512.png", "icons/maskable-512.png", "data/adata.js", "data/edata.js", "data/hi.js", "data/idata.js", "data/kmdata.js", "data/koppen.js", "data/ldata.js", "data/lo.js", "data/pdata.js", "data/places.js", "data/plates.js", "data/rdata.js", "data/relief.js", "data/stations.js", "data/xlo.js", "fonts/LICENSE-Pretendard.txt", "fonts/Pretendard-Bold.subset.woff2", "fonts/Pretendard-Medium.subset.woff2", "fonts/Pretendard-Regular.subset.woff2", "fonts/Pretendard-SemiBold.subset.woff2", "lib/LICENSE-d3-geo-projection.txt", "lib/LICENSE-d3.txt", "lib/LICENSE-topojson-client.txt", "lib/THIRD-PARTY-d3.txt", "lib/d3-geo-projection.min.js", "lib/d3.min.js", "lib/topojson-client.min.js", "lib/pdfjs/LICENSE.txt", "lib/pdfjs/pdf.min.js", "lib/pdfjs/pdf.worker.min.js", "css/base.css", "css/buttons.css", "css/doc.css", "css/feedback.css", "css/fonts.css", "css/footer.css", "css/main.css", "css/tokens.css", "css/topbar.css", "css/compat/chooser.css", "css/compat/controls.css", "css/compat/drawer.css", "css/compat/vars.css", "css/tools/agriculture.css", "css/tools/climate.css", "css/tools/energy.css", "css/tools/home.css", "css/tools/item.css", "css/tools/kmap.css", "css/tools/landform.css", "css/tools/mapedit.css", "css/tools/mapquick.css", "css/tools/population.css", "css/tools/religion.css", "js/pwa.js", "js/shell.js", "js/stats.js", "js/ui.js", "js/engines/aengine.js", "js/engines/eengine.js", "js/engines/engine.js", "js/engines/gengine.js", "js/engines/iengine.js", "js/engines/kengine.js", "js/engines/lengine.js", "js/engines/pengine.js", "js/engines/rengine.js", "js/tools/agriculture.js", "js/tools/climate.js", "js/tools/energy.js", "js/tools/home.js", "js/tools/item.js", "js/tools/kmap.js", "js/tools/landform.js", "js/tools/mapedit.js", "js/tools/mapquick.js", "js/tools/population.js", "js/tools/religion.js"];
/* 저장할 때는 브라우저가 잠깐 기억해 둔 옛 응답(예: 예전 판의 '파일 없음')을 쓰지 않고 서버에서 새로 받는다 */
self.addEventListener('install',e=>{ e.waitUntil(caches.open(V).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'}))))); });
self.addEventListener('activate',e=>{ e.waitUntil((async()=>{ for(const k of await caches.keys()) if(k.startsWith('gm-')&&k!==V) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener('message',e=>{ if(e.data==='skip') self.skipWaiting(); });
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return; const u=new URL(r.url);
  if(u.origin===location.origin){
    e.respondWith((async()=>{
      const c=await caches.open(V); const hit=await c.match(r,{ignoreSearch:true}); if(hit) return hit;
      try{ const res=await fetch(r); if(res.ok) c.put(r,res.clone()); return res; }
      catch(err){ if(r.mode==='navigate'){ const idx=await c.match('index.html'); if(idx) return idx; } throw err; }
    })()); return; }
  /* 웹 글꼴: 저장해 둔 것을 먼저, 없으면 받아서 저장 */
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith((async()=>{ const c=await caches.open('gmfonts'); const hit=await c.match(r);
      if(hit) return hit; try{ const res=await fetch(r); if(res.ok||res.type==='opaque') c.put(r,res.clone()); return res; }catch(err){ return Response.error(); } })()); }
});
