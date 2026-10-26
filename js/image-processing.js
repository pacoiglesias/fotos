/* Deterministic pixel finishing: no generated text, faces or geometry. */
(function(root){'use strict';
 function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
 function processPixels(source,width,height,options={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>16000000||source.length!==width*height*4)throw Error('Dimensiones no compatibles con la mejora local.');
  const amount=clamp(Number(options.amount)||0,0,1),output=new Uint8ClampedArray(source);
  if(!amount)return output;
  const hist=new Uint32Array(256);let total=0;
  for(let i=0;i<source.length;i+=16){if(source[i+3]<128)continue;hist[Math.round(.299*source[i]+.587*source[i+1]+.114*source[i+2])]++;total++;}
  function percentile(f){let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=total*f)return i;}return 255;}
  const low=percentile(.02),high=percentile(.98),document=options.mode==='document';
  const gain=high-low>35?Math.max(1,Math.min(document?1.18:1.22,(document?250:230)/(high-low))):1;
  const center=document?0:(low+high)/2,offset=document?0:clamp((128-center)*.25,-12,12);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;let blur=[source[i],source[i+1],source[i+2]],flat=false;
   if(x>0&&y>0&&x<width-1&&y<height-1){
    const positions=[i-width*4,i-4,i,i+4,i+width*4];let min=255,max=0;blur=[0,0,0];
    for(const p of positions){const lum=.299*source[p]+.587*source[p+1]+.114*source[p+2];min=Math.min(min,lum);max=Math.max(max,lum);for(let c=0;c<3;c++)blur[c]+=source[p+c]/5;}flat=max-min<32;
   }
   for(let c=0;c<3;c++){
    const original=source[i+c],toned=(original-center)*gain+center+offset;
    const noise=!document&&flat?(blur[c]-original)*.42:0;
    const detail=(!document&&flat)?0:clamp(original-blur[c],-18,18)*(document ? 0.16 : 0.48);
    output[i+c]=clamp(original+amount*(toned-original+noise+detail),0,255);
   }
   output[i+3]=source[i+3];
  }
  return output;
 }
 const api={processPixels};if(typeof module==='object'&&module.exports)module.exports=api;else root.RealScanImageCore=api;
})(typeof self==='object'?self:globalThis);
