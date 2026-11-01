/* Inclinación estimada de una imagen, sin modificarla nunca.
   Método: mapa de bordes + varianza del perfil de proyección por ángulo.
   Cuando las líneas de texto quedan horizontales, la proyección por filas
   concentra los bordes en pocas filas y su varianza es máxima. Se busca el
   ángulo de corrección (el mismo signo que usa el giro de photo-finish:
   canvas rotate(ángulo) en grados) que maximiza esa varianza.
   Solo se devuelve un ángulo si la evidencia es clara (mejor ≥ 1.15× la
   mediana); si no, null: el operador endereza a mano. La parte pura no usa
   DOM y se prueba en Node con patrones sintéticos. */
(function(root){
'use strict';
function estimateSkewFromGray(gray,w,h){
 if(!gray||!w||!h||gray.length<w*h)return null;
 const points=[];
 const maxPoints=24000,step=Math.max(1,Math.floor(Math.sqrt((w*h)/maxPoints)));
 for(let y=1;y<h-1;y+=step)for(let x=1;x<w-1;x+=step){
  const i=y*w+x;
  if(Math.abs(gray[i+1]-gray[i-1])+Math.abs(gray[i+w]-gray[i-w])>60)points.push([x,y]);
 }
 if(points.length<200)return null;
 function score(angleDeg){
  const a=angleDeg*Math.PI/180,sin=Math.sin(a),cos=Math.cos(a),bins=new Map();
  for(const [x,y] of points){
   const row=Math.round(x*sin+y*cos);
   bins.set(row,(bins.get(row)||0)+1);
  }
  let mean=0;for(const v of bins.values())mean+=v;mean/=bins.size;
  let variance=0;for(const v of bins.values())variance+=(v-mean)*(v-mean);
  return variance/bins.size;
 }
 const scores=[];
 for(let angle=-15;angle<=15;angle+=1)scores.push([angle,score(angle)]);
 scores.sort((a,b)=>b[1]-a[1]);
 const best=scores[0],median=scores[Math.floor(scores.length/2)][1];
 if(!best||median<=0||best[1]<median*1.15)return null;
 let refined=best[0],refinedScore=best[1];
 for(let angle=best[0]-1;angle<=best[0]+1;angle+=0.25){
  if(angle<-15||angle>15)continue;
  const s=score(angle);
  if(s>refinedScore){refinedScore=s;refined=angle;}
 }
 if(Math.abs(refined)<1)return null;
 return {angle:Math.round(refined*4)/4,confidence:Math.round((best[1]/median)*100)/100,points:points.length};
}
const cache=new Map();let cacheEpoch=0;function clear(){cacheEpoch++;cache.clear();}if(typeof document!=='undefined')document.addEventListener('realscan:auth-lock',clear);root.addEventListener?.('pagehide',clear);
async function estimateSkew(dataUrl){
 if(!dataUrl||typeof document==='undefined')return null;
 if(cache.has(dataUrl))return cache.get(dataUrl);const revision=cacheEpoch;
 const result=await (async()=>{
  try{
   const img=new Image();img.src=dataUrl;await img.decode();
   const scale=Math.min(1,600/Math.max(img.naturalWidth,img.naturalHeight));
   const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);
   const data=ctx.getImageData(0,0,w,h).data,gray=new Float32Array(w*h);
   for(let i=0;i<w*h;i++){const o=i*4;gray[i]=0.299*data[o]+0.587*data[o+1]+0.114*data[o+2];}
   canvas.width=canvas.height=0;
   return estimateSkewFromGray(gray,w,h);
  }catch{return null;}
 })();
 if(revision!==cacheEpoch)return null;
 if(cache.size>=8)cache.delete(cache.keys().next().value);
 cache.set(dataUrl,result);
 return result;
}
root.RealScanAutoStraighten={clear,estimateSkew,estimateSkewFromGray};
if(typeof module!=='undefined'&&module.exports)module.exports={estimateSkewFromGray};
})(typeof window!=='undefined'?window:globalThis);
