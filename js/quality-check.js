/* Aviso de foto mala ANTES de imprimir: borrosa o casi toda blanca.
   Nunca bloquea: solo avisa para que el operador amplíe y compruebe.
   Métrica conservadora para imágenes de texto/tarjeta: un borde nítido
   salta de oscuro a claro en 1 px (gradiente > 150); al desenfocar, la
   transición se ensancha y el gradiente por paso cae por debajo. El
   desenfoque NO elimina los bordes, así que un umbral bajo (60) no
   distingue: se usa 150. El aviso de luz solo salta con una imagen casi
   totalmente blanca (> 97 %): una tarjeta blanca normal no llega ahí.
   La parte pura (analyzePixels/verdict) no usa DOM y se prueba en Node. */
(function(root){
'use strict';
function analyzePixels(data,w,h){
 if(!data||!w||!h||data.length<w*h*4)return null;
 const gray=new Float32Array(w*h);
 for(let i=0;i<w*h;i++){const o=i*4;gray[i]=0.299*data[o]+0.587*data[o+1]+0.114*data[o+2];}
 let sharp=0,total=0,washed=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x;
  const gx=Math.abs(gray[i+1]-gray[i-1]),gy=Math.abs(gray[i+w]-gray[i-w]);
  if(gx+gy>150)sharp++;
  total++;
  if(gray[i]>250)washed++;
 }
 return {sharpFraction:total?sharp/total:0,washedFraction:total?washed/total:0,width:w,height:h};
}
function verdict(analysis){
 if(!analysis)return {blurry:false,washed:false};
 return {blurry:analysis.sharpFraction<0.002,washed:analysis.washedFraction>0.97,sharpFraction:analysis.sharpFraction,washedFraction:analysis.washedFraction};
}
const cache=new Map();let cacheEpoch=0;function clear(){cacheEpoch++;cache.clear();}if(typeof document!=='undefined')document.addEventListener('realscan:auth-lock',clear);root.addEventListener?.('pagehide',clear);
async function analyze(dataUrl){
 if(!dataUrl||typeof document==='undefined')return null;
 if(cache.has(dataUrl))return cache.get(dataUrl);const revision=cacheEpoch;
 const result=await (async()=>{
  try{
   const img=new Image();img.src=dataUrl;await img.decode();
   const scale=Math.min(1,500/Math.max(img.naturalWidth,img.naturalHeight));
   const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
   const pixels=analyzePixels(ctx.getImageData(0,0,w,h).data,w,h);
   canvas.width=canvas.height=0;
   return verdict(pixels);
  }catch{return null;}
 })();
 if(revision!==cacheEpoch)return null;
 if(cache.size>=8)cache.delete(cache.keys().next().value);
 cache.set(dataUrl,result);
 return result;
}
root.RealScanQuality={clear,analyze,analyzePixels,verdict};
if(typeof module!=='undefined'&&module.exports)module.exports={analyzePixels,verdict};
})(typeof window!=='undefined'?window:globalThis);
