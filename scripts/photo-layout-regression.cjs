const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const root=path.resolve('dist'),out=path.resolve('.audit/photo-layout');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'application/javascript','.mjs':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
let browser;
(async()=>{
 await new Promise(r=>server.listen(5526,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,...(process.env.REALSCAN_CHROMIUM?{executablePath:process.env.REALSCAN_CHROMIUM}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.REALSCAN_PHOTO_URL||'http://127.0.0.1:5526/');
 await page.waitForFunction(()=>window.RealScanLayout?.cutGuideGeometry&&window.pdfjsLib&&typeof updateUI==='function'&&typeof ensureJsPdf==='function');
 const result=await page.evaluate(async()=>{
  await ensureJsPdf();
  $('loginOverlay').classList.add('hidden');document.body.classList.remove('modal-open');
  Object.assign(state,{activeCategory:'photos',format:'photo_infantil',photoCopies:1,mixTwoPhotos:false,includeRulerFooter:false,includeDocLabels:false,includeCutMarks:true,documentCustomTitle:'',outputScalePercent:100,paperSize:'a4'});
  const src=document.createElement('canvas');src.width=src.height=600;const sc=src.getContext('2d');sc.fillStyle='white';sc.fillRect(0,0,600,600);sc.fillStyle='red';sc.beginPath();sc.arc(300,300,150,0,Math.PI*2);sc.fill();
  Object.assign(state.images.front,{originalSrc:src.toDataURL(),processedDataUrl:src.toDataURL(),zoom:2,panX:30,panY:-20,rotation:0,filter:'color',brightness:0,contrast:0});
  setFitMode('front','fit');await waitForProcessingComplete();
  if(state.images.front.zoom!==1||state.images.front.panX||state.images.front.panY)throw Error('Fit retained zoom/pan');
  const processed=new Image();processed.src=state.images.front.processedDataUrl;await processed.decode();
  function redRatio(canvas){const x=canvas.getContext('2d'),d=x.getImageData(0,0,canvas.width,canvas.height).data;let left=Infinity,right=0,top=Infinity,bottom=0;for(let y=0;y<canvas.height;y++)for(let k=0;k<canvas.width;k++){const i=(y*canvas.width+k)*4;if(d[i]>160&&d[i+1]<95&&d[i+2]<95){left=Math.min(left,k);right=Math.max(right,k);top=Math.min(top,y);bottom=Math.max(bottom,y);}}if(!Number.isFinite(left))throw Error('No red test circle');return (right-left+1)/(bottom-top+1);}
  const processedCanvas=document.createElement('canvas');processedCanvas.width=processed.naturalWidth;processedCanvas.height=processed.naturalHeight;processedCanvas.getContext('2d').drawImage(processed,0,0);
  const fitCircle=redRatio(processedCanvas);if(Math.abs(fitCircle-1)>.03)throw Error('Image processing distorted circle '+fitCircle);
  // A restored asset with a different frame ratio must also remain undistorted in every output.
  state.images.front.processedDataUrl=src.toDataURL();updateUI();
  const overlay=document.querySelector('#faithfulSheetPlacements .cut-guide-overlay');
  if(!overlay||overlay.querySelectorAll('line').length!==8||getComputedStyle(overlay).overflow!=='visible'||overlay!==overlay.parentNode.lastElementChild)throw Error('Preview marks absent, clipped or below photo');
  const variants=[];
  async function pdfCanvas(){const data=new Uint8Array(generatePdfDoc().output('arraybuffer')),pdf=await pdfjsLib.getDocument({data,isEvalSupported:false}).promise,p=await pdf.getPage(1),v=p.getViewport({scale:2}),c=document.createElement('canvas');c.width=Math.ceil(v.width);c.height=Math.ceil(v.height);await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;await pdf.cleanup();return c;}
  function difference(a,b){const x=a.getContext('2d').getImageData(0,0,a.width,a.height).data,y=b.getContext('2d').getImageData(0,0,b.width,b.height).data;let count=0;for(let i=0;i<x.length;i+=4)if(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2])>40)count++;return count;}
  for(const format of ['photo_infantil','photo_ovalo_credencial']){
   state.format=format;state.includeCutMarks=true;updateUI();const plan=RealScanLayout.computeDocumentLayout(state);
   // renderPageToCanvas expects HTMLImageElement with naturalWidth/complete.
   const image=new Image();image.src=src.toDataURL();await image.decode();const a=await renderPageToCanvas(plan.pages[0],plan,{front:image}),pa=await pdfCanvas();
   state.includeCutMarks=false;updateUI();const clean=RealScanLayout.computeDocumentLayout(state),b=await renderPageToCanvas(clean.pages[0],clean,{front:image}),pb=await pdfCanvas();
   if(document.querySelector('#faithfulSheetPlacements .cut-guide-overlay'))throw Error('Disabled preview marks still exist');
   const rasterDiff=difference(a,b),pdfDiff=difference(pa,pb),rasterCircle=redRatio(b),pdfCircle=redRatio(pb);
   if(rasterDiff<50||pdfDiff<20)throw Error('Missing exported marks '+format+' '+rasterDiff+' '+pdfDiff);
   if(Math.abs(rasterCircle-1)>.03||Math.abs(pdfCircle-1)>.04)throw Error('Output distorted restored image');
   variants.push({format,rasterDiff,pdfDiff,rasterCircle,pdfCircle});
  }
  let layouts=0;
  for(const [format,spec] of Object.entries(FORMAT_SPECS).filter(([,s])=>s.category==='photos'))for(const paper of ['a4','letter'])for(const ruler of [true,false])for(let n=1;n<=80;n++){
   Object.assign(state,{format,paperSize:paper,includeRulerFooter:ruler,photoCopies:n});const plan=RealScanLayout.computeDocumentLayout(state);if(plan.errors.length)continue;
   for(const page of plan.pages)for(const p of page.placements){if(p.xMm<11.8||p.yMm<15.8||p.xMm+p.widthMm>plan.paper.widthMm-11.8||p.yMm+p.heightMm>plan.paper.heightMm-(ruler?37.8:13.8))throw Error('Layout exceeds safe area '+format+' '+paper+' '+n);}
   if(plan.pages.reduce((a,p)=>a+p.placements.length,0)!==n)throw Error('Missing copy');layouts++;
  }
  Object.assign(state,{format:'photo_infantil',paperSize:'a4',includeRulerFooter:false,includeCutMarks:true,photoCopies:6});updateUI();
  RealScanDiagnostics.record('image.fit','info',{fitMode:'fit',name:'CLIENT_SECRET',dataUrl:src.toDataURL(),guides:true});
  const report=RealScanDiagnostics.snapshot(),text=JSON.stringify(report);if(text.includes('CLIENT_SECRET')||text.includes('data:image')||text.includes('rawOriginalSrc'))throw Error('Diagnostic privacy leak');
  if(report.schemaVersion!==2||report.operation.pieces!==6)throw Error('Missing safe operation context');
  return {fitCircle,variants,layouts,diagnosticSchema:report.schemaVersion};
 });
 await page.locator('#faithfulSheetPlacements').screenshot({path:path.join(out,'guides-desktop.png')});
 for(const width of [360,390,768]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>setMobileStep(1));
  await page.locator('[data-guided-step="2"]').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.mobileStep),'2','Mobile Continue must open the capture step');
  await page.locator('.mob-pane-2 .btn-mob-nav').first().click();
  assert.equal(await page.evaluate(()=>document.body.dataset.mobileStep),'1');
  await page.locator('[data-guided-step="2"]').click();
  await page.locator('.mob-pane-2 .btn-mob-nav').last().click();
  assert.equal(await page.evaluate(()=>document.body.dataset.mobileStep),'3');
  await page.locator('.mob-pane-3 .btn-mob-nav').click();
  assert.equal(await page.evaluate(()=>document.body.dataset.mobileStep),'2');
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>setMobileStep(3));await page.locator('#faithfulSheetPlacements').screenshot({path:path.join(out,'guides-mobile.png')});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({result,errors},null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
