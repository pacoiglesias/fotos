/* Searchable text is an optional invisible layer over the unchanged page image. */
(function(root){
 'use strict';
 let active=null,engineLoading=null,fontLoading=null;
 const aborted=()=>new DOMException('Proceso cancelado. La imagen original se conserva.','AbortError');
 function check(job){if(job.cancelled||!job.isCurrent())throw aborted();}
 function wait(job,promise,ms){return new Promise((resolve,reject)=>{let settled=false,timer;function done(fn,value){if(settled)return;settled=true;clearTimeout(timer);if(job.reject===abort)job.reject=null;fn(value);}function abort(){done(reject,aborted());}job.reject=abort;timer=setTimeout(()=>done(reject,Error('El OCR tardó demasiado. Reintenta con menos páginas.')),ms);Promise.resolve(promise).then(v=>done(resolve,v),e=>done(reject,e));if(job.cancelled)abort();});}
 function loadEngine(){
  if(root.Tesseract)return Promise.resolve();
  if(engineLoading)return engineLoading;
  engineLoading=new Promise((resolve,reject)=>{const script=document.createElement('script'),timer=setTimeout(fail,20000);function fail(){clearTimeout(timer);script.remove();engineLoading=null;reject(Error('No se pudo cargar el lector. Prepara el modo sin conexión o comprueba internet.'));}script.src='vendor/ocr/tesseract.min.js';script.onload=()=>{clearTimeout(timer);root.Tesseract?resolve():fail();};script.onerror=fail;document.head.append(script);});return engineLoading;
 }
 async function font(){if(!fontLoading)fontLoading=fetch('vendor/standard_fonts/LiberationSans-Regular.ttf').then(async r=>{if(!r.ok)throw Error('No se pudo preparar la fuente del PDF.');const bytes=new Uint8Array(await r.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);}).catch(e=>{fontLoading=null;throw e;});return fontLoading;}
 function cancel(){const job=active;if(!job)return;job.cancelled=true;job.reject?.();job.worker?.terminate().catch(()=>{});if(active===job)active=null;}
 async function run(language,onProgress,work,isCurrent=()=>true){
  if(active)throw Error('Ya se está preparando un PDF con texto. Espera o cancela ese proceso.');
  if(!['spa','eng','spa+eng'].includes(language))throw Error('Idioma OCR no válido.');
  const job={cancelled:false,worker:null,reject:null,isCurrent};active=job;

  try{
   await root.RealScanOcr?.cancel();check(job);await wait(job,loadEngine(),25000);check(job);
   const pending=Tesseract.createWorker(language,1,{workerPath:new URL('vendor/ocr/worker.min.js',location.href).href,corePath:new URL('vendor/ocr/core/',location.href).href,langPath:new URL('vendor/ocr/lang/',location.href).href,workerBlobURL:false,errorHandler:()=>{},logger:m=>{if(!job.cancelled&&job.isCurrent())onProgress?.({stage:m.status,progress:m.progress||0});}});
   pending.then(w=>{if(job.cancelled||active!==job)w.terminate().catch(()=>{});},()=>{});
   try{job.worker=await wait(job,pending,60000);}catch(e){job.cancelled=true;throw e;}check(job);
   const encodedFont=await wait(job,font(),20000);check(job);let pageNumber=0;const summary=[];
   const result=await work(async(pdf,source,g)=>{
    check(job);pageNumber++;onProgress?.({page:pageNumber,stage:'page',progress:0});
    const c=document.createElement('canvas'),scale=Math.min(1,2600/Math.max(source.width,source.height));c.width=Math.max(1,Math.round(source.width*scale));c.height=Math.max(1,Math.round(source.height*scale));const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.drawImage(source,0,0,c.width,c.height);
    const recognized=await wait(job,job.worker.recognize(c,{}, {text:true,blocks:true}),90000);check(job);
    if(!pdf.existsFileInVFS('RealScanOCR.ttf')){pdf.addFileToVFS('RealScanOCR.ttf',encodedFont);pdf.addFont('RealScanOCR.ttf','RealScanOCR','normal');}pdf.setFont('RealScanOCR','normal');
    let words=0;
    for(const block of recognized.data.blocks||[])for(const paragraph of block.paragraphs||[])for(const line of paragraph.lines||[])for(const word of line.words||[]){
     const b=word.bbox,text=word.text?.trim();if(!text||!b||![b.x0,b.y0,b.x1,b.y1].every(Number.isFinite)||b.x0<0||b.y0<0||b.x1>c.width||b.y1>c.height||b.x1<=b.x0||b.y1<=b.y0)continue;
     const h=(b.y1-b.y0)/c.height*g.height,w=(b.x1-b.x0)/c.width*g.width;
     pdf.setFontSize(Math.max(1,h*72/25.4));const natural=pdf.getTextWidth(text);if(!(natural>0))continue;
     pdf.text(text,g.x+b.x0/c.width*g.width,g.y+b.y0/c.height*g.height,{baseline:'top',renderingMode:'invisible',horizontalScale:w/natural});words++;
    }
    summary.push({page:pageNumber,words,confidence:Math.round(recognized.data.confidence||0)});c.width=c.height=1;
    onProgress?.({page:pageNumber,stage:'done',progress:1,words,confidence:summary.at(-1).confidence});
   });check(job);
   root.RealScanDiagnostics?.record('ocr.pdf','info',{count:summary.length,language,confidence:summary.length?summary.reduce((n,p)=>n+p.confidence,0)/summary.length:0});
   return {result,summary};
  }finally{await job.worker?.terminate().catch(()=>{});if(active===job)active=null;}
 }
 root.RealScanSearchable={run,cancel,get busy(){return !!active;}};
})(window);
