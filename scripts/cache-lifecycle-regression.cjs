const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{
 let release,calls=0;const gate=new Promise(resolve=>release=resolve),root={RealScanOcr:{recognizeText:async()=>{calls++;if(calls===1)await gate;return {text:'SYNTHETIC TEXT'};}}};
 vm.runInNewContext(fs.readFileSync('js/ocr-assist.js','utf8'),{window:root});const api=root.RealScanOcrAssist,old=api.recognizeCached('synthetic-original');api.clear();release();assert.equal(await old,null);assert.equal((await api.recognizeCached('synthetic-original')).text,'SYNTHETIC TEXT');assert.equal(calls,2);await api.recognizeCached('synthetic-original');assert.equal(calls,2);api.clear();await api.recognizeCached('synthetic-original');assert.equal(calls,3);console.log('PASS Clearing an OCR cache rejects late results and rereads the next job without retaining prior text');
 for(const [file,name,method]of [['js/quality-check.js','RealScanQuality','analyze'],['js/auto-straighten.js','RealScanAutoStraighten','estimateSkew']]){
  let resolveDecode,decodes=0;const pending=new Promise(resolve=>resolveDecode=resolve),canvases=[],root={};const document={addEventListener(){},createElement(){const canvas={width:0,height:0,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(8*8*4)})})};canvases.push(canvas);return canvas;}};
  class Image{naturalWidth=8;naturalHeight=8;async decode(){decodes++;if(decodes===1)await pending;}}
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{window:root,document,Image,Uint8ClampedArray,Float32Array});const api=root[name],previous=api[method]('synthetic-image');api.clear();resolveDecode();assert.equal(await previous,null);await api[method]('synthetic-image');assert.equal(decodes,2);assert(canvases.every(canvas=>canvas.width===0&&canvas.height===0));console.log('PASS '+name+' discards late analysis and releases every temporary canvas');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
