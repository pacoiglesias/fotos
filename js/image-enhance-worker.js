importScripts('image-processing.js');
self.onmessage=function(event){try{const {pixels,width,height,options}=event.data;const result=self.RealScanImageCore.processPixels(new Uint8ClampedArray(pixels),width,height,options);self.postMessage({pixels:result.buffer},[result.buffer]);}catch(e){self.postMessage({error:e.message||'No se pudo procesar la imagen.'});}};
