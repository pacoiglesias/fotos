/* Synthetic identities only. Exercise the operator's actual controls and file choosers. */
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const {chromium,webkit}=require('playwright');
const root=path.resolve('dist'),out=path.resolve('.audit/identity-preparation'),checks=[];
fs.mkdirSync(out,{recursive:true});let browser;
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return res.writeHead(404).end();
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');
 res.end(fs.readFileSync(file));
});
function pass(text){checks.push(text);console.log('PASS '+text);}
// WebKit on Windows can stop delivering the animation frames used by locator.screenshot
// while the desktop is busy. Measure actual geometry with timers and capture real page pixels.
async function panelScreenshot(page,file){
 const panel=page.locator('#serviceFlow');await panel.waitFor({state:'visible'});
 await panel.evaluate(element=>element.scrollIntoView({behavior:'instant',block:'start'}));
 let previous=null,stable=0,clip;
 for(let attempt=0;attempt<40;attempt++){
  clip=await panel.evaluate(element=>{const r=element.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
  assert(clip.width>0&&clip.height>0,'Preparation panel must have visible geometry');
  stable=previous&&Object.keys(clip).every(key=>Math.abs(clip[key]-previous[key])<.5)?stable+1:0;
  if(stable>=3)break;previous=clip;await page.waitForTimeout(50);
 }
 assert(stable>=3,'Preparation panel geometry must settle before capturing evidence');
 await page.screenshot({path:file,fullPage:true,clip,animations:'disabled'});
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 for(const [engine,type]of Object.entries({chromium,webkit})){
  browser=await type.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1050},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===origin||/^(data|blob):$/.test(url.protocol)?route.continue():route.abort();});
  await page.addInitScript(()=>{if(window!==top)return;localStorage.setItem('realscan_welcome_seen_v1','1');localStorage.setItem('realscan_auth_v2',JSON.stringify({users:[{username:'admin',passwordHash:'beeaac74a3a1833e8547bf1510c9bbdfaa41d019ad7da238b606d91155014abe',role:'admin',mustChangePassword:false}],currentUsername:'admin',sessionToken:null,sessionExpiry:0}));});
  await page.goto(origin);await page.locator('#loginUserInput').fill('admin');await page.locator('#loginPassInput').fill('PruebaAcceso2026');await page.locator('#btnLoginSubmit').click();await page.locator('#loginOverlay').waitFor({state:'hidden'});
  await page.waitForFunction(()=>window.RealScanWorkspacePolish&&document.getElementById('identityOptions')&&document.body.classList.contains('rs-identity'));
  assert(await page.locator('details[data-rs-wrap=serviceFlow]').isHidden(),'Multipage color/duplex options must not mislabel an ID');
  assert.equal(await page.locator('#flowSides > button').first().getAttribute('data-flow-sides'),'single');
  for(const side of ['front','back'])for(const action of ['camera','file'])await page.locator('[data-preview-action='+action+'][data-preview-side='+side+']').waitFor({state:'visible'});
  await panelScreenshot(page,path.join(out,engine+'-empty.png'));
  await page.locator('[data-flow-sides=single]').click();await page.locator('#quickPaper').selectOption('letter');await page.locator('#flowSets').fill('2');await page.locator('#flowSets').dispatchEvent('change');
  assert.equal(await page.locator('[data-capture-side=back]').count(),0);
  const samples=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1011;c.height=638;const x=c.getContext('2d');function make(text,color){x.fillStyle=color;x.fillRect(0,0,c.width,c.height);x.fillStyle='#172033';x.font='52px Arial';x.fillText(text,80,130);x.strokeStyle='#475569';x.lineWidth=6;x.strokeRect(30,30,951,578);return c.toDataURL('image/png');}return{front:make('FRENTE DE PRUEBA','#dbeafe'),back:make('REVERSO DE PRUEBA','#d1fae5')};});
  async function upload(side,data){const chooser=page.waitForEvent('filechooser');await page.locator('[data-preview-action=file][data-preview-side='+side+']').click();await(await chooser).setFiles({name:side+'-synthetic.png',mimeType:'image/png',buffer:Buffer.from(data.split(',')[1],'base64')});await page.locator('.asset-review [data-review=confirm]').click();await page.waitForFunction(side=>!!state.images[side].processedDataUrl&&!RealScanWorkflow.describe().busy,side);}
  await upload('front',samples.front);
  assert.equal(await page.evaluate(()=>state.outputSets),2);assert.equal(await page.evaluate(()=>state.paperSize),'letter');
  const front=await page.evaluate(()=>state.images.front.originalSrc);
  assert.equal(await page.evaluate(()=>RealScanWorkflow.describe().ready),true);
  assert(await page.locator('[data-workspace-deliver=pdf]').isEnabled());
  pass(engine+' one-front upload is immediately deliverable, preserving paper and copies');
  await page.locator('[data-flow-sides=both]').click();await page.waitForFunction(()=>document.querySelector('[data-capture-side=back]'));
  assert.equal(await page.evaluate(()=>RealScanWorkflow.describe().ready),false);assert(await page.locator('[data-workspace-deliver=pdf]').isDisabled());
  await page.locator('#identityContinueFront').waitFor({state:'visible'});await page.locator('#identityContinueFront').click();await page.waitForFunction(()=>state.printMode==='single'&&RealScanWorkflow.describe().ready);
  assert.equal(await page.evaluate(()=>state.images.front.originalSrc),front);assert.equal(await page.evaluate(()=>state.paperSize),'letter');assert.equal(await page.evaluate(()=>state.outputSets),2);assert(await page.locator('[data-workspace-deliver=pdf]').isEnabled());
  await page.locator('[data-flow-sides=both]').click();await page.waitForFunction(()=>document.querySelector('[data-capture-side=back]'));
  pass(engine+' missing reverse offers a direct one-front continuation without changing paper, sets or the original');
  await upload('back',samples.back);const back=await page.evaluate(()=>state.images.back.originalSrc);
  await page.locator('[data-flow-sides=single]').click();assert.equal(await page.evaluate(()=>state.images.back.originalSrc),back);
  await page.locator('[data-flow-sides=both_separate]').click();await page.waitForFunction(()=>RealScanWorkflow.describe().ready);
  assert.equal(await page.evaluate(()=>state.images.front.originalSrc),front);assert.equal(await page.evaluate(()=>state.images.back.originalSrc),back);
  const dimensions=await page.evaluate(()=>RealScanLayout.computeDocumentLayout(state).pages.flatMap(p=>p.placements.map(v=>[v.widthMm,v.heightMm])));
  assert.equal(dimensions.length,4);for(const piece of dimensions)assert.deepEqual(piece,[85.6,53.98]);
  pass(engine+' switching faces retains both originals and produces four ID-1 pages for two separate-face sets');
  const parent=await page.locator('#identityOptions').evaluate(e=>e.parentElement.id);
  await page.locator('[data-preview-action=edit][data-preview-side=back]').click();await page.locator('#cropModal').waitFor({state:'visible'});await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>state.images.back.originalSrc),back);
  await page.locator('[data-guided-step="2"]').click();assert(await page.evaluate(()=>!!document.activeElement.closest('#identityOptions')));
  await page.locator('[data-guided-step="3"]').click();assert(await page.locator('#outputReviewModal').isHidden());assert.equal(await page.locator('.pdf-delivery-dialog').count(),0);assert(await page.evaluate(()=>!!document.activeElement.closest('#workspaceDelivery')));
  await page.locator('[data-workspace-deliver=pdf]').click();await page.locator('.pdf-delivery-dialog').waitFor({state:'visible'});await page.waitForFunction(()=>!document.getElementById('pdfDeliveryDownload').disabled);await page.locator('#pdfDeliveryClose').click();
  assert.equal(await page.locator('#identityOptions').evaluate(e=>e.parentElement.id),parent);
  pass(engine+' direct per-face adjustment cancels safely and delivery returns to the same stable panel');
  await page.evaluate(()=>document.getElementById('idSheetView').open=false);
  await page.locator('[data-annotation-open=copy]').click();await page.locator('.annotation-editor').waitFor({state:'visible'});await page.waitForFunction(()=>document.getElementById('annItems').children.length===1);await page.locator('[data-ann=apply]').click();await page.locator('.annotation-editor').waitFor({state:'detached'});
  await page.waitForFunction(()=>document.getElementById('idSheetView').open&&document.querySelector('#idSheetView [data-annotation-layer]'));
  assert.equal(await page.evaluate(()=>state.images.front.originalSrc),front);assert.equal(await page.evaluate(()=>state.images.back.originalSrc),back);
  pass(engine+' applying a stamp opens the actual annotated print sheet without changing either original');
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow at '+width);
   assert(await page.locator('#serviceFlow').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Panel overflow at '+width);
   assert(await page.locator('[data-preview-action=file][data-preview-side=front]').isVisible());
   const layout=await page.evaluate(()=>{const controls=document.getElementById('colControlPanel').getBoundingClientRect(),preview=document.getElementById('colStageWorkspace').getBoundingClientRect();return{controls:{x:controls.x,y:controls.y,right:controls.right},preview:{x:preview.x,y:preview.y}};});
   if(width>=1100)assert(layout.controls.right<=layout.preview.x+1,'Controls and preview overlap');else assert(layout.controls.y<=layout.preview.y,'Preparation must precede the sheet on mobile');
   await panelScreenshot(page,path.join(out,engine+'-panel-'+width+'.png'));
  }
  await page.setViewportSize({width:1440,height:1050});await page.locator('#serviceFlow').evaluate(element=>element.scrollIntoView({behavior:'instant',block:'start'}));await page.screenshot({path:path.join(out,engine+'-desktop.png')});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));await panelScreenshot(page,path.join(out,engine+'-dark.png'));
  pass(engine+' stable controls and capture actions fit five screen sizes and both themes');
  await page.evaluate(()=>RealScanDocuments.activate());await page.waitForFunction(()=>document.body.dataset.flowKind==='document');assert(await page.locator('details[data-rs-wrap=serviceFlow]').isVisible());
  await page.locator('details[data-rs-wrap=serviceFlow] > summary').click();assert(await page.locator('#flowDocColor').isVisible());
  await page.evaluate(()=>RealScanDocuments.deactivate());await page.waitForFunction(()=>document.body.classList.contains('rs-identity'));
  assert(await page.locator('details[data-rs-wrap=serviceFlow]').isHidden());assert.equal(await page.evaluate(()=>state.images.front.originalSrc),front);
  assert.deepEqual(errors,[]);pass(engine+' document controls stay with documents and switching back preserves the identification');
  await browser.close();browser=null;
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,version:JSON.parse(fs.readFileSync('dist/version.json'))},null,2));
})().catch(async error=>{console.error(error);for(const context of browser?.contexts()||[])for(const page of context.pages())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
