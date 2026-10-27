(function(root){
 'use strict';
 const OCR=['vendor/ocr/tesseract.min.js','vendor/ocr/worker.min.js','vendor/ocr/core/tesseract-core-lstm.wasm.js','vendor/ocr/core/tesseract-core-simd-lstm.wasm.js','vendor/ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js','vendor/ocr/lang/spa.traineddata.gz','vendor/ocr/lang/eng.traineddata.gz'];
 // v3.14.1: las librerías de exportación (carga diferida desde v3.13.1, fuera
 // del precaché inicial del SW) también forman parte de la preparación sin
 // conexión. Sin esto, tras recargar sin red el SW respondía 503 para
 // vendor/jspdf.umd.min.js y exportar un PDF fallaba con «jspdf is not
 // defined». NO vuelven al precaché inicial: la primera carga sigue ligera
 // y solo se descargan cuando el usuario pulsa «Preparar sin conexión».
 const EXPORT=['vendor/jspdf.umd.min.js','vendor/jszip.min.js','vendor/jsqr.js'];
 // Fondo blanco con IA en el dispositivo: grupo SEGMENT, best-effort y
 // DESPUÉS de OCR y EXPORT. Si su descarga falla, la preparación principal
 // NO falla: se registra segment:false y «Fondo blanco» seguirá usando el
 // respaldo por inundación cuando la IA no esté disponible sin conexión.
 const SEGMENT=['vendor/segment/vision_bundle.mjs','vendor/segment/wasm/vision_wasm_internal.js','vendor/segment/wasm/vision_wasm_internal.wasm','vendor/segment/wasm/vision_wasm_nosimd_internal.js','vendor/segment/wasm/vision_wasm_nosimd_internal.wasm','vendor/segment/selfie_segmenter.tflite'];
 let preparing=false;
 async function info(){
  if(!('serviceWorker' in navigator)||!root.isSecureContext)throw Error('Abre RealScan desde su dirección HTTPS para preparar la app.');
  await navigator.serviceWorker.register('sw.js');
  const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('La app aún se está preparando. Reintenta en unos segundos.')),30000))]);
  return new Promise((resolve,reject)=>{const channel=new MessageChannel(),timer=setTimeout(()=>{channel.port1.close();reject(Error('Actualiza la app con conexión antes de preparar el modo local.'));},8000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();/^realscan-[a-f0-9]{16}$/.test(e.data?.name)?resolve(e.data):reject(Error('No se pudo identificar esta versión.'));};registration.active.postMessage({type:'REALSCAN_CACHE_INFO'},[channel.port2]);});
 }
 async function readMarker(cache){const marker=await cache.match('offline-ready.json');if(!marker)return null;try{return await marker.json();}catch{return null;}}
 async function status(){const current=await info(),cache=await caches.open(current.name),data=await readMarker(cache),has=async list=>(await Promise.all(list.map(asset=>cache.match(asset)))).every(Boolean);return {core:true,ocr:!!data&&await has(OCR),exports:data?.export===true&&await has(EXPORT),segment:data?.segment===true&&await has(SEGMENT),version:current.name};}
 async function prepare(progress){
  if(preparing)throw Error('La preparación ya está en curso.');preparing=true;
  try{const current=await info(),cache=await caches.open(current.name),estimate=await navigator.storage?.estimate?.();if(estimate?.quota&&estimate.quota-estimate.usage<30*1024*1024)throw Error('Libera al menos 30 MB en el navegador y vuelve a intentar.');
   for(let i=0;i<OCR.length;i++){progress?.('Preparando lector sin conexión · '+(i+1)+'/'+OCR.length);const response=await fetch(OCR[i],{cache:'reload'});if(!response.ok)throw Error('No se pudo descargar el lector. Comprueba internet y reintenta.');await cache.put(OCR[i],response);}
   for(let i=0;i<EXPORT.length;i++){progress?.('Preparando exportación sin conexión · '+(i+1)+'/'+EXPORT.length);const response=await fetch(EXPORT[i],{cache:'reload'});if(!response.ok)throw Error('No se pudo descargar una librería de exportación. Comprueba internet y reintenta.');await cache.put(EXPORT[i],response);}
   // Only mark ready when every required resource is present in this exact build cache.
   for(const asset of [...OCR,...EXPORT])if(!await cache.match(asset))throw Error('Faltan recursos. Reintenta la preparación.');
   // SEGMENT (best-effort): cualquier fallo aquí no tumba la preparación.
   let segment=false;
   try{for(let i=0;i<SEGMENT.length;i++){progress?.('Preparando fondo con IA sin conexión · '+(i+1)+'/'+SEGMENT.length);const response=await fetch(SEGMENT[i],{cache:'reload'});if(!response.ok)throw Error('segment download failed');await cache.put(SEGMENT[i],response);}for(const asset of SEGMENT)if(!await cache.match(asset))throw Error('segment incomplete');segment=true;}catch{segment=false;}
   await cache.put('offline-ready.json',new Response(JSON.stringify({version:current.name,ocr:true,export:true,segment,preparedAt:Date.now()}),{headers:{'Content-Type':'application/json'}}));
   await navigator.storage?.persist?.().catch(()=>{});progress?.(segment?'Listo para capturar, guardar PDF, reconocer español e inglés y aplicar fondo con IA sin internet en este navegador.':'Listo para capturar, guardar PDF y reconocer español e inglés sin internet en este navegador. El fondo con IA no se pudo preparar; se usará el fondo blanco clásico sin conexión.');return {version:current.name,segment};
  }finally{preparing=false;}
 }
 root.RealScanOffline={prepare,status};
})(window);
