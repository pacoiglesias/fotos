const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{chromium}=require('playwright');
const root=path.resolve('dist'),out=path.resolve('.audit/document-evidence'),results=[],errors=[];fs.mkdirSync(out,{recursive:true});let browser;
const server=http.createServer((req,res)=>{const route=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(route==='/'?'/index.html':route));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.js':'application/javascript','.mjs':'application/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
function cameraFixture() {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 900;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#172234";
  ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = "#f5f2e8";
  ctx.beginPath();
  ctx.moveTo(150, 130);
  ctx.lineTo(1050, 170);
  ctx.lineTo(1e3, 750);
  ctx.lineTo(190, 720);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#172234";
  ctx.font = "28px sans-serif";
  for (let y = 270; y < 650; y += 48) ctx.fillText("Documento de prueba \xB7 123456789", 270, y);
  window.__fixture = c;
  window.__tracks = [];
  window.__constraints = [];
  window.__mode = "normal";
  navigator.mediaDevices.getUserMedia = async () => {
    if (__mode === "deny") throw new DOMException("Denied", "NotAllowedError");
    if (__mode === "slow") await new Promise((r) => window.__resolveCamera = r);
    const stream = c.captureStream(15), track = stream.getVideoTracks()[0];
    __tracks.push(track);
    const repaint = setInterval(() => {
      if (track.readyState === "ended") {
        clearInterval(repaint);
        return;
      }
      ctx.fillStyle = "#172234";
      ctx.fillRect(0, 0, 2, 2);
    }, 60);
    track.getCapabilities = () => ({ focusMode: ["continuous"], torch: true });
    track.applyConstraints = async (a) => {
      __constraints.push(a);
    };
    return stream;
  };
  window.ImageCapture = class {
    async takePhoto() {
      return new Promise((resolve) => c.toBlob(resolve, "image/jpeg", 0.98));
    }
  };
}
async function stored(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('realscan_documents_v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('jobs','readonly'),q=tx.objectStore('jobs').get('active');q.onsuccess=()=>resolve(q.result?{count:q.result.pages.length,reviewed:q.result.pages.filter(p=>p.reviewed).length}:null);tx.oncomplete=()=>db.close();};}));}
(async()=>{
 await new Promise(r=>server.listen(5547,'127.0.0.1',r));browser=await chromium.launch({headless:true,...process.env.REALSCAN_CHROMIUM?{executablePath:process.env.REALSCAN_CHROMIUM}:{}});
 const ctx=await browser.newContext({serviceWorkers:'block',viewport:{width:1440,height:1000}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:5547/');await page.waitForFunction(()=>window.RealScanDocuments&&window.pdfjsLib&&typeof ensureJsPdf==='function'&&document.getElementById('counterService'));
 await page.evaluate(()=>{$('loginOverlay').classList.add('hidden');document.body.classList.remove('modal-open');RealScanRelay.create=async(kind)=>({url:location.origin+'/'+(kind==='receive'?'phone-upload':'phone-download')+'.html#s=synthetic',status:'waiting',expiresAt:Date.now()+900000});RealScanRelay.revoke=async()=>{};RealScanRelay.clearFiles=async()=>{};switchIntent('photos');});
 await page.locator('#btnNewProject').click();await page.locator('#newServiceKind').selectOption('document');await page.locator('#newServiceStart').click();await page.locator('#newServiceModal').waitFor({state:'hidden'});await page.locator('#documentWorkspace').waitFor({state:'visible'});
 const mode=await page.evaluate(async()=>{const session=await RealScanQrSync.createReceiveSession();return {category:state.activeCategory,documentJob:RealScanDocuments.status().active,phoneMode:new URLSearchParams(new URL(session.url).hash.slice(1)).get('mode')};});assert.equal(mode.phoneMode,'document');results.push({case:'document-receive-mode-after-photos',passed:true});
 const added=await page.evaluate(async()=>{await ensureJsPdf();const doc=new jspdf.jsPDF();for(let n=1;n<=6;n++){if(n>1)doc.addPage();doc.setFontSize(28);doc.text('SYNTHETIC PAGE '+n,20,35);doc.rect(25,60,150,150);doc.circle(100,135,35);}return RealScanDocuments.addFiles([new File([doc.output('arraybuffer')],'SINTETICO-SEIS-PAGINAS.pdf',{type:'application/pdf'})]);});assert(added);assert.equal(await page.evaluate(()=>RealScanDocuments.status().count),6);assert(await page.locator('#docPdf').isDisabled());
 for(let n=0;n<6;n++){await page.locator('#docPages .document-page').nth(n).getByRole('button',{name:'Revisar',exact:true}).click();await page.locator('.asset-review [data-review=confirm]').click();await page.waitForFunction(n=>RealScanDocuments.status().reviewed===n,n+1);}
 const count=await page.evaluate(async()=>{const pdf=await RealScanDocuments.makePdf();return pdf.getNumberOfPages();});assert.equal(count,6);results.push({case:'six-pages-reviewed-and-exported',pages:count,passed:true});
 await page.locator('#docSearchable').check();await page.locator('#docOcrLanguage').selectOption('eng');const downloadPromise=page.waitForEvent('download',{timeout:180000});await page.locator('#docPdf').click();const downloaded=await downloadPromise;const pdfPath=path.join(out,'six-pages-searchable.pdf');await downloaded.saveAs(pdfPath);const content=await page.evaluate(async data=>{const task=pdfjsLib.getDocument({data:Uint8Array.from(atob(data),c=>c.charCodeAt(0)),isEvalSupported:false});try{const pdf=await task.promise,words=[];for(let n=1;n<=pdf.numPages;n++)words.push((await(await pdf.getPage(n)).getTextContent()).items.map(i=>i.str).join(' '));return words;}finally{await task.destroy();}},fs.readFileSync(pdfPath).toString('base64'));assert.equal(content.length,6);assert(content.every(t=>t.includes('SYNTHETIC')));await page.locator('#docSearchable').uncheck();results.push({case:'six-page-searchable-pdf',passed:true});if(!(await page.locator('#workspaceExportOptions').evaluate(e=>e.open)))await page.locator('#workspaceExportOptions > summary').click();await page.locator('#docPrint').click();await page.locator('#docPrintLink').waitFor({state:'visible'});const printHref=await page.locator('#docPrintLink').getAttribute('href');await page.locator('#docPages .document-page').first().getByRole('button',{name:'Girar',exact:true}).click();await page.waitForFunction(()=>!RealScanDocuments.status().busy);
 assert(await page.locator('#docPrintLink').isHidden());assert.equal(await page.locator('#docPrintLink').getAttribute('href'),null);results.push({case:'stale-print-after-page-change',reviewed:await page.evaluate(()=>RealScanDocuments.status().reviewed),oldPrintVisible:await page.locator('#docPrintLink').isVisible(),samePrintLink:printHref===await page.locator('#docPrintLink').getAttribute('href')});await page.locator('#documentWorkspace').screenshot({path:path.join(out,'stale-print.png')});
 await page.waitForTimeout(800);const before=await stored(page);
 while(await page.locator('#docPages .document-page').count())await page.locator('#docPages .document-page').first().getByRole('button',{name:'Quitar',exact:true}).click();
 await page.waitForTimeout(800);const after=await stored(page);assert.equal(after.count,0);results.push({case:'deleted-pages-remain-in-recovery',inMemory:await page.evaluate(()=>RealScanDocuments.status().count),before,after});
 await page.reload();await page.waitForFunction(()=>window.RealScanDocuments&&window.pdfjsLib);await page.evaluate(()=>{$('loginOverlay').classList.add('hidden');document.body.classList.remove('modal-open');});await page.waitForTimeout(500);assert(await page.locator('#docRecovery').isHidden());assert.equal(await page.evaluate(()=>RealScanDocuments.status().count),0);results.push({case:'deleted-pages-do-not-return',passed:true});
 // B3: captura por lotes — tras cada página, añadir otra sin pasar por el panel.
 await page.locator('#btnNewProject').click();await page.locator('#newServiceKind').selectOption('document');await page.locator('#newServiceStart').click();await page.locator('#newServiceModal').waitFor({state:'hidden'});await page.locator('#documentWorkspace').waitFor({state:'visible'});
 await page.evaluate(cameraFixture);
 await page.locator('#docCamera').click();
 await page.waitForFunction(()=>!document.querySelector('.scan-dialog [data-act=capture]').disabled);
 await page.locator('.scan-dialog [data-act=capture]').click();
 await page.locator('.scan-dialog [data-act=original]').waitFor();
 await page.locator('.scan-dialog [data-act=original]').click();
 await page.locator('#docBatchPrompt').waitFor({state:'visible'});
 assert((await page.locator('#docBatchStatus').innerText()).includes('1 guardada'));
 await page.locator('#docBatchAdd').click();
 await page.waitForFunction(()=>!document.querySelector('.scan-dialog [data-act=capture]').disabled);
 await page.locator('.scan-dialog [data-act=capture]').click();
 await page.locator('.scan-dialog [data-act=original]').waitFor();
 await page.locator('.scan-dialog [data-act=original]').click();
 await page.locator('#docBatchPrompt').waitFor({state:'visible'});
 assert((await page.locator('#docBatchStatus').innerText()).includes('2 guardada'));
 await page.locator('#docBatchDone').click();
 await page.locator('#docBatchPrompt').waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>RealScanDocuments.status().count),2);
 assert.equal(await page.evaluate(()=>RealScanDocuments.status().reviewed),2);
 results.push({case:'batch-camera-two-pages-then-finish',passed:true});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({head:require('child_process').execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(fs.readFileSync('dist/version.json')),results,errors},null,2));console.log('PASS Document QR mode, six-page PDF, stale print invalidation and deletion persistence');
})().catch(async e=>{console.error(e);for(const ctx of browser?.contexts()||[])for(const p of ctx.pages())await p.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
