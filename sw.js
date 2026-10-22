const CACHE_NAME='__BUILD_VERSION__';
const CORE_ASSETS=__CORE_ASSETS__;
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await cache.addAll(CORE_ASSETS);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('realscan-')&&key!==CACHE_NAME)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);try{const response=await fetch(request);if(response.ok){await cache.put(url.pathname,response.clone());if(url.pathname==='/'||url.pathname==='/index.html'){await cache.put('/index.html',response.clone());await cache.put('/',response.clone());}}return response;}catch(e){const match=await cache.match(url.pathname)||((url.pathname==='/'||url.pathname==='/index.html')?await cache.match('/index.html'):null);return match||new Response('Esta página necesita conexión. Vuelve al inicio para trabajar sin internet.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());return;
 }
 event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;try{const response=await fetch(request);if(response.ok&&url.pathname.includes("/vendor/ocr/")){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());}return response;}catch{return new Response('Este recurso no está preparado para usarse sin conexión.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});}})());
});
self.addEventListener('message',event=>{if(event.data?.type==='REALSCAN_CACHE_INFO')event.ports[0]?.postMessage({name:CACHE_NAME});});
