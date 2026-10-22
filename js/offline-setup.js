(function(root){
 'use strict';
 const OCR=['vendor/ocr/tesseract.min.js','vendor/ocr/worker.min.js','vendor/ocr/core/tesseract-core-lstm.wasm.js','vendor/ocr/core/tesseract-core-simd-lstm.wasm.js','vendor/ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js','vendor/ocr/lang/spa.traineddata.gz','vendor/ocr/lang/eng.traineddata.gz'];
 let preparing=false;
 async function info(){
  if(!('serviceWorker' in navigator)||!root.isSecureContext)throw Error('Abre RealScan desde su dirección HTTPS para preparar la app.');
  await navigator.serviceWorker.register('sw.js');
  const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('La app aún se está preparando. Reintenta en unos segundos.')),30000))]);
  return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('Actualiza la app con conexión antes de preparar el modo local.'));},8000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();/^realscan-[a-f0-9]{16}$/.test(e.data?.name)?resolve(e.data):reject(Error('No se pudo identificar esta versión.'));};registration.active.postMessage({type:'REALSCAN_CACHE_INFO'},[channel.port2]);});
 }
 async function status(){const current=await info(),cache=await caches.open(current.name),marker=await cache.match('offline-ready.json');return {core:true,ocr:!!marker,version:current.name};}
 async function prepare(progress){
  if(preparing)throw Error('La preparación ya está en curso.');preparing=true;
  try{const current=await info(),cache=await caches.open(current.name),estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.quota-estimate.usage<30*1024*1024)throw Error('Libera al menos 30 MB en el navegador y vuelve a intentar.');
   for(let i=0;i<OCR.length;i++){progress?.('Preparando lector sin conexión · '+(i+1)+'/'+OCR.length);const response=await fetch(OCR[i],{cache:'reload'});if(!response.ok)throw Error('No se pudo descargar el lector. Comprueba internet y reintenta.');await cache.put(OCR[i],response);}
   // Only mark ready when every required resource is present in this exact build cache.
   for(const asset of OCR)if(!await cache.match(asset))throw Error('Faltan recursos. Reintenta la preparación.');
   await cache.put('offline-ready.json',new Response(JSON.stringify({version:current.name,ocr:true,preparedAt:Date.now()}),{headers:{'Content-Type':'application/json'}}));
   await navigator.storage?.persist?.().catch(()=>{});progress?.('Listo para capturar, guardar PDF y reconocer español e inglés sin internet en este navegador.');return {version:current.name};
  }finally{preparing=false;}
 }
 root.RealScanOffline={prepare,status};
})(window);
