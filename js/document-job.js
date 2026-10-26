/* Ordered document jobs. Physical ID/photo layouts remain in the calibrated engine. */
(function(root){
  'use strict';
  const MAX_PAGES=40,MAX_BYTES=80*1024*1024,MAX_EDGE=3508;
  const $=id=>document.getElementById(id);
  let active=false,pages=[],originals=[],selected=0,epoch=0,busy=false,task=null,saveTimer=null,saveChain=Promise.resolve(),connection=null,recovery=null;
  let searchable=false,ocrLanguage='spa',version=0,ocrSummary=[];const selection=new Set();
  let past=[],future=[],replacement=null,qualityNotes=new Map(),pdfCache=null;
  function unlocked(){return $('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'));}
  function capture(){return {pages:pages.map(p=>({...p})),originals:originals.slice(),options:{...options},selected,searchable,ocrLanguage,selection:[...selection]};}
  function trimHistory(list){while(list.length>8)list.shift();const current=new Set([...pages.flatMap(p=>[p.data,p.source]),...originals.map(f=>f.data)]);let extra=new Set(list.flatMap(s=>[...s.pages.flatMap(p=>[p.data,p.source]),...s.originals.map(f=>f.data)]).filter(x=>!current.has(x)));while(list.length&&[...extra].reduce((sum,x)=>sum+bytes(x),0)>24*1024*1024){list.shift();extra=new Set(list.flatMap(s=>[...s.pages.flatMap(p=>[p.data,p.source]),...s.originals.map(f=>f.data)]).filter(x=>!current.has(x)));}}
  function checkpoint(){past.push(capture());trimHistory(past);future=[];}
  function travel(redo=false){if(busy||!unlocked())return false;const from=redo?future:past,to=redo?past:future;if(!from.length)return false;to.push(capture());const previous=from.pop();epoch++;pages=previous.pages;originals=previous.originals;options=previous.options;selected=previous.selected;searchable=previous.searchable;ocrLanguage=previous.ocrLanguage;selection.clear();for(const id of previous.selection||[])if(pages.some(p=>p.id===id))selection.add(id);trimHistory(to);persist();render();say(redo?'Cambio rehecho.':'Último cambio deshecho.');return true;}
  function reorder(from,to){if(busy||from===to||from<0||to<0||from>=pages.length||to>=pages.length)return;checkpoint();const [page]=pages.splice(from,1);pages.splice(to,0,page);selected=to;persist();render();}
  async function replaceFile(file){const target=replacement;replacement=null;if(!file||busy||!unlocked()||!target||target.epoch!==epoch)return;const page=pages.find(p=>p.id===target.id);if(!page)return;const revision=epoch;busy=true;render();try{if(file.size>30*1024*1024)throw Error('La imagen supera 30 MB.');const source=await read(file),normalized=await normalize(source);if(revision!==epoch)return;const original={id:id(),name:file.name.slice(0,180),type:file.type,data:source};if(sizeOf(pages.map(p=>p===page?{...p,...normalized,source}:p),[...originals,original])>MAX_BYTES)throw Error('El trabajo supera 80 MB.');checkpoint();originals.push(original);Object.assign(page,normalized,{source,sourceId:original.id,reviewed:false});persist();say('Página reemplazada. Revisa el resultado.');}catch(e){if(revision===epoch)say(e.message,true);}finally{if(revision===epoch){busy=false;render();}}}

  let options={paper:'a4',orientation:'auto',margin:8,quality:'high',color:'color',sets:1,duplex:'single',position:'center',headerText:'',headerEnabled:false,annotations:[]};
  function say(message,error=false){if($('docStatus')){$('docStatus').textContent=message;$('docStatus').dataset.error=String(error);}}
  function id(){return crypto.randomUUID();}
  function bytes(data){const encoded=data.slice(data.indexOf(',')+1);return Math.floor(encoded.length*3/4)-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);}
  function sizeOf(list,files){return [...new Set([...list.flatMap(p=>[p.source,p.data]),...files.map(f=>f.data)])].reduce((sum,data)=>sum+bytes(data),0);}
  function geometry(page,settings=options){
    const paper=PAPER_SPECS[settings.paper]||PAPER_SPECS.a4;
    let w=paper.widthMm,h=paper.heightMm;
    const landscape=settings.orientation==='landscape'||settings.orientation==='auto'&&page.width>page.height;
    if(landscape&&w<h||!landscape&&w>h)[w,h]=[h,w];
    const margin=Math.max(0,Math.min(25,Number(settings.margin)||0));
    const header=settings.headerEnabled&&settings.headerText?12:0;const scale=Math.min((w-2*margin)/page.width,(h-2*margin-header)/page.height);
    return {paperWidth:w,paperHeight:h,width:page.width*scale,height:page.height*scale,header,margin,x:settings.position==='compact'?margin:(w-page.width*scale)/2,y:settings.position==='center'?margin+header+(h-2*margin-header-page.height*scale)/2:margin+header,dpi:page.width/(page.width*scale/25.4)};
  }
  function status(){return {active,busy,count:pages.length,reviewed:pages.filter(p=>p.reviewed).length,ready:active&&!busy&&pages.length>0&&pages.every(p=>p.reviewed),selected,revision:version,selectedCount:selection.size,ocr:ocrSummary.map(p=>({...p})),searchable,ocrLanguage,options:{...options}};}
  function activate(){active=true;document.body.dataset.documentJob='true';render();root.RealScanCounter?.update();}
  function deactivate(){active=false;delete document.body.dataset.documentJob;render();root.RealScanCounter?.update();}
  function pack(){
    const assets=[],lookup=new Map();const asset=data=>{if(!lookup.has(data)){lookup.set(data,assets.length);assets.push(data);}return lookup.get(data);};
    return {schema:1,savedAt:Date.now(),options:{...options},searchable,ocrLanguage,pages:pages.map(p=>({...p,source:asset(p.source),data:asset(p.data)})),originals:originals.map(f=>({...f,data:asset(f.data)})),assets};
  }
  async function database(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{const request=indexedDB.open('realscan_documents_v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('jobs');request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();connection=null;};resolve(request.result);};request.onerror=()=>{connection=null;reject(request.error);};request.onblocked=()=>{connection=null;reject(Error('Cierra otras pestañas para preparar el borrador.'));};});return connection;
  }
  async function transaction(mode,action){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('jobs',mode),request=action(tx.objectStore('jobs'));tx.oncomplete=()=>resolve(request?.result);tx.onerror=tx.onabort=()=>reject(tx.error||request?.error||Error('No se pudo guardar el documento.'));});}
  function persist(){
    version++;ocrSummary=[];trimHistory(past);trimHistory(future);pdfCache=null;for(const [id,note]of qualityNotes){if(!pages.some(p=>p.id===id&&p.data===note.data))qualityNotes.delete(id);}
    const link=$('docPrintLink');
    if(link){link.hidden=true;if(link.dataset.objectUrl)URL.revokeObjectURL(link.dataset.objectUrl);delete link.dataset.objectUrl;link.removeAttribute('href');}
    if($('docDeliveryBox'))$('docDeliveryBox').hidden=true;
    clearTimeout(saveTimer);const revision=epoch;
    saveTimer=setTimeout(()=>{if(revision!==epoch)return;const record=pack();
      saveChain=saveChain.catch(()=>{}).then(async()=>{if(revision!==epoch)return;await transaction('readwrite',s=>s.put(record,'active'));if(revision===epoch){$('docDraft').textContent='Borrador guardado en este dispositivo';}}).catch(()=>{if(revision===epoch){$('docDraft').textContent='No se pudo autoguardar. Descarga un respaldo del documento; el trabajo sigue abierto.';root.RealScanDiagnostics?.record('draft.failed','error');}});
    },350);
  }
  function reset(clearDraft=false){
    version++;ocrSummary=[];selection.clear();past=[];future=[];replacement=null;qualityNotes.clear();pdfCache=null;root.RealScanSearchable?.cancel();searchable=false;ocrLanguage='spa';
    epoch++;busy=false;clearTimeout(saveTimer);root.RealScanReview?.cancel();root.RealScanCapture?.close();task?.destroy?.();task=null;pages=[];originals=[];selected=0;deactivate();
    if($('docDeliveryBox'))$('docDeliveryBox').hidden=true;
    if($('docPrintLink')){const link=$('docPrintLink');link.hidden=true;if(link.dataset.objectUrl)URL.revokeObjectURL(link.dataset.objectUrl);delete link.dataset.objectUrl;}
    options={paper:'a4',orientation:'auto',margin:8,quality:'high',color:'color',sets:1,duplex:'single',position:'center',headerText:'',headerEnabled:false,annotations:[]};
    const cleanup=clearDraft?saveChain.catch(()=>{}).then(()=>transaction('readwrite',s=>s.delete('active'))).catch(()=>say('No se pudo limpiar el borrador anterior. Puedes descartarlo desde Recuperación.',true)):Promise.resolve();
    if(clearDraft){recovery=null;if($('docRecovery'))$('docRecovery').hidden=true;}
    return cleanup;
  }
  function read(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo leer el archivo.'));r.readAsDataURL(file);});}
  async function image(data){
    if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Usa JPG, PNG o WebP. Exporta HEIC desde el teléfono.');
    const img=new Image();img.src=data;await img.decode();if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>60000000)throw Error('La imagen supera 60 megapíxeles o no es válida.');return img;
  }
  async function normalize(data){
    const img=await image(data);let result=data;
    if(Math.max(img.naturalWidth,img.naturalHeight)>MAX_EDGE){const c=document.createElement('canvas'),scale=MAX_EDGE/Math.max(img.naturalWidth,img.naturalHeight);c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);result=c.toDataURL('image/jpeg',.96);return {data:result,width:c.width,height:c.height};}
    return {data:result,width:img.naturalWidth,height:img.naturalHeight};
  }
  async function addFiles(files){
    if(!active||busy||!files.length)return false;const revision=epoch;busy=true;render();
    const staged=[],sourceFiles=[];
    try{
      for(const file of files){
        if(file.size<=0||file.size>30*1024*1024)throw Error('Cada archivo debe tener entre 1 byte y 30 MB.');
        say('Preparando '+(staged.length+1)+' página(s). Puedes cancelar sin añadir páginas incompletas.');
        const data=await read(file);if(revision!==epoch)return false;
        const sourceId=id(),pdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
        sourceFiles.push({id:sourceId,name:(file.name||'Captura.jpg').slice(0,180),type:pdf?'application/pdf':file.type,data});
        if(pdf){
          if(!root.pdfjsLib&&root.ensurePdfReader)await root.ensurePdfReader();
          if(!root.pdfjsLib)throw Error('El lector PDF aún se está preparando. Vuelve a intentarlo.');
          task=pdfjsLib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false,cMapUrl:'vendor/cmaps/',cMapPacked:true,standardFontDataUrl:'vendor/standard_fonts/',wasmUrl:'vendor/wasm/'});
          const ownedTask=task,doc=await ownedTask.promise;
          try{
            if(doc.numPages>MAX_PAGES||pages.length+staged.length+doc.numPages>MAX_PAGES)throw Error('El documento admite hasta 40 páginas. Divide el archivo antes de importarlo.');
            for(let n=1;n<=doc.numPages;n++){
              if(revision!==epoch)return false;const page=await doc.getPage(n),base=page.getViewport({scale:1});
              const scale=Math.min(300/72,MAX_EDGE/Math.max(base.width,base.height)),viewport=page.getViewport({scale});
              if(viewport.width*viewport.height>16000000)throw Error('Página PDF demasiado grande. Divide o reduce el archivo.');
              const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(viewport.width));canvas.height=Math.max(1,Math.round(viewport.height));
              await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'white'}).promise;
              if(revision!==epoch)return false;const rendered=canvas.toDataURL('image/jpeg',.96);
              staged.push({id:id(),sourceId,source:rendered,data:rendered,width:canvas.width,height:canvas.height,reviewed:false});page.cleanup();canvas.width=canvas.height=1;
              say('Leyendo página '+n+' de '+doc.numPages+'…');
              if(sizeOf([...pages,...staged],[...originals,...sourceFiles])>MAX_BYTES)throw Error('El trabajo supera 80 MB de imágenes. Divide el documento en varios trabajos.');
            }
          }finally{await ownedTask.destroy();if(task===ownedTask)task=null;}
        }else{
          if(pages.length+staged.length>=MAX_PAGES)throw Error('Máximo 40 páginas por documento.');
          const result=await normalize(data);staged.push({id:id(),sourceId,source:data,...result,reviewed:false});
        }
        if(sizeOf([...pages,...staged],[...originals,...sourceFiles])>MAX_BYTES)throw Error('El trabajo supera 80 MB. Divide el documento en varios trabajos.');
      }
      if(revision!==epoch)return false;
      checkpoint();selected=pages.length;pages.push(...staged);originals.push(...sourceFiles);persist();say(staged.length+' página(s) añadidas. Revisa cada página antes de entregar.');return true;
    }catch(e){if(revision===epoch)say(e.message||'No se pudo abrir el documento. Las páginas anteriores se conservan.',true);return false;}
    finally{if(revision===epoch){busy=false;render();}}
  }
  async function fromInbox(file){if(file.assigning||file.documentAddedJob===(state._jobRevision||0))return;const job=state._jobRevision||0;file.assigning=true;RealScanReceiveUI.render();try{const blob=await(await fetch(file.dataUrl)).blob();if(!active||job!==(state._jobRevision||0))return;const added=await addFiles([new File([blob],file.name,{type:file.type})]);if(added&&job===(state._jobRevision||0)){file.documentAddedJob=job;file.assignedTo='document';}}catch(e){say('No se pudo añadir el archivo recibido. Reintenta.',true);}finally{file.assigning=false;RealScanReceiveUI.render();}}
  async function enhancePage(page){if(busy||!pages.includes(page)||!root.RealScanEnhance)return;const revision=epoch,source=page.data;try{await root.RealScanEnhance.open({sourceDataUrl:source,photoMode:false,isCurrent:()=>revision===epoch&&pages.includes(page),onAccept:async data=>{if(revision!==epoch||!pages.includes(page))throw Error('El documento cambió.');if(data===source)return;const changed=await normalize(data);if(revision!==epoch||!pages.includes(page))throw Error('El documento cambió.');if(sizeOf(pages.map(p=>p===page?{...page,...changed}:p),originals)>MAX_BYTES)throw Error('El ajuste supera el límite del trabajo.');Object.assign(page,changed,{reviewed:false});persist();render();say('Mejora aplicada. Revisa y confirma esta página antes de entregar.');}});}catch(e){say(e.message,true);}}
  async function reviewPage(page){
    if(busy||!pages.includes(page))return;const revision=epoch;
    const result=await RealScanReview.open({dataUrl:page.data,name:'Página '+(pages.indexOf(page)+1)+' de '+pages.length,photoMode:false});
    if(!result||revision!==epoch||!pages.includes(page))return;
    const changed=await normalize(result);if(revision!==epoch||!pages.includes(page))return;
    if(sizeOf(pages.map(p=>p===page?{...page,...changed}:p),originals)>MAX_BYTES){say('El ajuste supera el límite del trabajo.',true);return;}
    checkpoint();Object.assign(page,changed,{reviewed:true});selected=pages.indexOf(page);persist();render();say('Página revisada. Confirma las restantes antes de entregar.');
  }
  async function rotate(page){
    if(busy||!pages.includes(page))return;const revision=epoch;busy=true;render();
    try{const img=await image(page.data);if(revision!==epoch||!pages.includes(page))return;const c=document.createElement('canvas');c.width=img.naturalHeight;c.height=img.naturalWidth;const ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(img,0,0);const next={data:c.toDataURL('image/jpeg',.96),width:c.width,height:c.height};if(sizeOf(pages.map(p=>p===page?{...page,...next}:p),originals)>MAX_BYTES)throw Error('El ajuste supera el límite del trabajo.');checkpoint();Object.assign(page,next,{reviewed:false});persist();}
    catch(e){if(revision===epoch)say(e.message,true);}finally{if(revision===epoch){busy=false;render();}}
  }
  function move(index,step){reorder(index,index+step);}
  function printGeometry(page,settings){
    const g=geometry(page,settings),profile=root.RealScanPrinterProfiles?.getActive(),sx=(profile?.scaleX||100)/100,sy=(profile?.scaleY||100)/100;
    const result={...g,x:g.x*sx+(profile?.offsetX||0),y:g.y*sy+(profile?.offsetY||0),width:g.width*sx,height:g.height*sy};
    if(result.x<0||result.y<0||result.x+result.width>g.paperWidth||result.y+result.height>g.paperHeight)throw Error('La calibración recorta la imagen. Revisa la impresora.');
    return result;
  }
  async function makePdf(printJob=false,face=null,range=null,quality=null){
    if(range!==null&&(!Array.isArray(range)||!range.length||range.some(i=>!Number.isInteger(i)||i<0||i>=pages.length)))throw Error('Selección de páginas no válida.');
    if(range?(!unlocked()||busy||range.some(i=>!pages[i].reviewed)):!status().ready)throw Error('Revisa y confirma las páginas elegidas antes de preparar la entrega.');
    const profileKey=printJob?JSON.stringify(root.RealScanPrinterProfiles?.getActive()||null):null;
    const cacheKey=JSON.stringify([profileKey,epoch,version,options,printJob,face,range,quality,searchable,ocrLanguage]);if(pdfCache?.key===cacheKey)return pdfCache.pdf;
    if (typeof ensureJsPdf === 'function') await ensureJsPdf();
    const revision=epoch,jobVersion=version,settings={...options,quality:['high','light'].includes(quality)?quality:options.quality},withText=searchable,language=ocrLanguage;let pdf;
    const all=Array.from({length:printJob?(options.sets||1):1},()=>{const set=pages.map(p=>({...p}));if(printJob&&settings.duplex==='manual'&&set.length%2)set.push({blank:true,width:set.at(-1).width,height:set.at(-1).height});return set;}).flat();
    const snapshot=range?range.map(i=>all[i]):face?all.filter((_,i)=>face==='odd'?i%2===0:i%2===1):all;
    await root.RealScanAnnotations?.prepare(settings.annotations||[]);
    const build=async addText=>{
    for(let n=0;n<snapshot.length;n++){
      if(revision!==epoch||jobVersion!==version||(printJob&&profileKey!==JSON.stringify(root.RealScanPrinterProfiles?.getActive()||null)))throw Error('El trabajo cambió. Prepara otra entrega.');
      say('Preparando '+(printJob?'impresión':'PDF')+': página '+(n+1)+' de '+snapshot.length+'…');
      const page=snapshot[n],g=printJob&&!page.blank?printGeometry(page,settings):geometry(page,settings),landscape=g.paperWidth>g.paperHeight;
      if(!pdf)pdf=new jspdf.jsPDF({unit:'mm',format:[g.paperWidth,g.paperHeight],orientation:landscape?'landscape':'portrait',compress:true});
      else pdf.addPage([g.paperWidth,g.paperHeight],landscape?'landscape':'portrait');
      if(page.blank)continue;if(g.header){pdf.setFont('helvetica','normal');pdf.setFontSize(10);pdf.text(settings.headerText,g.paperWidth/2,g.margin+5,{align:'center'});}
      const img=await image(page.data);if(revision!==epoch)throw Error('El trabajo cambió.');
      const canvas=document.createElement('canvas'),max=settings.quality==='light'?1600:MAX_EDGE,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
      canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);if(settings.color==='gray')ctx.filter='grayscale(1)';ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const lossless=settings.quality==='high';const preserve=lossless&&settings.color==='color'&&Math.max(page.width,page.height)<=MAX_EDGE&&/^data:image\/(png|jpeg);/.test(page.data);const data=preserve?page.data:canvas.toDataURL(lossless?'image/png':'image/jpeg',.82);pdf.addImage(data,data.startsWith('data:image/png')?'PNG':'JPEG',g.x,g.y,g.width,g.height);if(addText)await addText(pdf,canvas,g,page.data);root.RealScanAnnotations?.drawPdf(pdf,page.id,g.paperWidth,g.paperHeight,settings.annotations||[]);canvas.width=canvas.height=1;
    }return pdf;};
    if(!withText){const pdf=await build();if(revision!==epoch||jobVersion!==version||(printJob&&profileKey!==JSON.stringify(root.RealScanPrinterProfiles?.getActive()||null)))throw Error('El trabajo cambió. Prepara otra entrega.');if(revision===epoch)pdfCache={key:cacheKey,pdf};return pdf;}
    let currentPage=1;
    const result=await RealScanSearchable.run(language,p=>{if(p.page)currentPage=p.page;say('PDF con texto · página '+currentPage+' de '+snapshot.length+' · '+Math.round((p.progress||0)*100)+' %');},build,()=>revision===epoch&&jobVersion===version);
    if(revision!==epoch||jobVersion!==version||(printJob&&profileKey!==JSON.stringify(root.RealScanPrinterProfiles?.getActive()||null)))throw Error('El trabajo cambió. Prepara otra entrega.');if(result.summary.some(p=>!p.words)&&!confirm('Hay páginas sin texto reconocible. ¿Guardar el PDF con sus imágenes y el texto de las demás páginas?'))throw Error('Entrega cancelada. Las imágenes se conservan.');
    ocrSummary=result.summary.map(p=>({...p}));document.dispatchEvent(new Event('realscan:document-updated'));if(revision===epoch)pdfCache={key:cacheKey,pdf:result.result};return result.result;
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function output(kind){
    if(!status().ready)return;const revision=epoch;busy=true;render();
    try{
      // Only this operation owns the busy flag; rendering uses a frozen snapshot.
      busy=false;const pdfPromise=makePdf(['print','odd','even'].includes(kind),kind==='odd'?'odd':kind==='even'?'even':null);busy=true;const pdf=await pdfPromise;
      if(revision!==epoch)return;
      if(kind==='qr'){
        const data=pdf.output('datauristring').split(',')[1],file={name:'RealScan_Documento.pdf',type:'application/pdf',dataUrl:'data:application/pdf;base64,'+data,size:atob(data).length};
        RealScanRelay.validate(file);
        const old=RealScanQrSync.getActiveDeliverySession();if(old&&!['expired','revoked'].includes(old.status)&&Date.now()<old.expiresAt&&!confirm('Esta entrega reemplazará el QR anterior. Confirma que el cliente anterior terminó de descargar.'))return;
        const session=await RealScanQrSync.createDeliverySession([file],{format:'pdf',pages:pages.length});
        if(revision!==epoch){await RealScanQrSync.revokeDeliverySession();return;}
        RealScanQrSync.renderQrToCanvas(session.url,$('docDeliveryQr'));$('docDeliveryBox').hidden=false;say('PDF disponible por QR durante 15 minutos mientras el puesto permanezca abierto.');
      }else if(kind==='print'){
        const blob=pdf.output('blob'),url=URL.createObjectURL(blob),a=$('docPrintLink');a.href=url;a.hidden=false;if(a.dataset.objectUrl)URL.revokeObjectURL(a.dataset.objectUrl);a.dataset.objectUrl=url;say('Abre el PDF preparado y usa tamaño real / 100 % en el diálogo de impresión. La página ya contiene el encuadre elegido.');a.focus();
      }else{download(pdf.output('blob'),kind==='odd'?'RealScan_1_Impares.pdf':kind==='even'?'RealScan_2_Pares.pdf':'RealScan_Documento.pdf');say(kind==='odd'?'Imprime las caras impares y vuelve a colocar el papel según la prueba de tu impresora.':kind==='even'?'Imprime las caras pares después de comprobar el giro y el orden de la bandeja.':'PDF completo descargado. Comprueba que abre y contiene todas sus páginas.');}
      root.RealScanIssuance?.record(pdf.output('blob'),{action:'pdf-generado'});root.RealScanDiagnostics?.record('document.output','info',{count:pages.length});
    }catch(e){if(revision===epoch)say((e.message||'No se pudo preparar el archivo.')+(kind==='qr'?' Para PDF mayores de 6 MB, elige calidad Ligera y vuelve a preparar, o descarga para entregar por USB.':''),true);}
    finally{if(revision===epoch){busy=false;render();}}
  }
  async function analyzeQuality(){
    if(busy||!unlocked()||!pages.length)return;const revision=epoch;busy=true;render();const seen=new Map();
    try{for(let index=0;index<pages.length;index++){
      const page=pages[index],notes=[];say('Revisando calidad: página '+(index+1)+' de '+pages.length+'…');
      if(seen.has(page.data))notes.push('Posible duplicado de la página '+(seen.get(page.data)+1)+'. Comprueba antes de quitarla.');else seen.set(page.data,index);
      const img=await image(page.data);if(revision!==epoch)return;
      const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,64,64);ctx.drawImage(img,0,0,64,64);const pixels=ctx.getImageData(0,0,64,64).data;let bright=0,sum=0,squares=0;
      for(let n=0;n<pixels.length;n+=4){const value=.2126*pixels[n]+.7152*pixels[n+1]+.0722*pixels[n+2];if(value>248)bright++;sum+=value;squares+=value*value;}
      const variance=squares/4096-(sum/4096)**2;if(bright/4096>.995&&variance<9)notes.push('La página parece vacía. Revisa si contiene texto o marcas tenues.');
      if(geometry(page).dpi<150)notes.push('Resolución baja para el papel elegido. Revisa los textos pequeños.');
      qualityNotes.set(page.id,{data:page.data,notes});
    }say('Revisión terminada. Los avisos son sugerencias: no se ha eliminado ni cambiado ninguna página.');}
    catch(e){if(revision===epoch)say('No se pudo completar la revisión: '+e.message,true);}finally{if(revision===epoch){busy=false;render();}}
  }
  async function digest(text){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');}
  async function validate(record){
    if(!record||record.schema!==1||!Array.isArray(record.pages)||record.pages.length>MAX_PAGES||!Array.isArray(record.originals)||record.originals.length>40||!Array.isArray(record.assets)||record.assets.length>120)throw Error('Respaldo de documento no válido.');
    if(!['a4','letter','oficio','legal'].includes(record.options?.paper)||!['auto','portrait','landscape'].includes(record.options?.orientation)||!['high','light'].includes(record.options?.quality)||!Number.isFinite(record.options?.margin)||record.options.margin<0||record.options.margin>25)throw Error('Opciones de documento no válidas.');
    let total=0;for(const data of record.assets){if(typeof data!=='string'||!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Archivo interno no válido.');total+=bytes(data);if(total>MAX_BYTES)throw Error('El respaldo supera 80 MB de archivos.');}
    const asset=n=>{if(!Number.isInteger(n)||n<0||n>=record.assets.length)throw Error('Referencia de archivo no válida.');return record.assets[n];};
    const restored=[];for(const page of record.pages){const data=asset(page.data),source=asset(page.source),img=await image(data);await image(source);restored.push({id:typeof page.id==='string'&&/^[0-9a-f-]{36}$/i.test(page.id)?page.id:id(),sourceId:String(page.sourceId).slice(0,80),data,source,width:img.naturalWidth,height:img.naturalHeight,reviewed:!!page.reviewed});}
    const files=record.originals.map(f=>{const data=asset(f.data);if(typeof f.name!=='string'||f.name.length>180||!['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type)||!data.startsWith('data:'+f.type+';'))throw Error('Original no válido.');return {id:String(f.id).slice(0,80),name:f.name,type:f.type,data};});
    await root.RealScanAnnotations?.prepare(record.options.annotations||[]);
    return {pages:restored,originals:files,searchable:!!record.searchable,ocrLanguage:['spa','eng','spa+eng'].includes(record.ocrLanguage)?record.ocrLanguage:'spa',options:{...record.options,annotations:root.RealScanAnnotations?root.RealScanAnnotations.clean(record.options.annotations||[]):[],color:record.options.color==='gray'?'gray':'color',sets:Math.max(1,Math.min(10,Math.round(Number(record.options.sets)||1))),duplex:record.options.duplex==='manual'?'manual':'single',position:['center','top','compact'].includes(record.options.position)?record.options.position:'center',headerText:String(record.options.headerText||'').replace(/[\x00-\x1f]/g,'').slice(0,48),headerEnabled:!!record.options.headerEnabled}};
  }
  async function backup(){if(busy||!pages.length)return;try{if (typeof ensureJSZip === 'function') await ensureJSZip();const body=JSON.stringify(pack()),zip=new JSZip();zip.file('document.json',body);zip.file('integrity.json',JSON.stringify({sha256:await digest(body)}));download(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),'RealScan_Documento.realscan');say('Respaldo con páginas y originales descargado.');}catch(e){say('No se pudo crear el respaldo: '+e.message,true);}}
  async function restoreFile(file){
    if(busy||!file)return;const revision=epoch;busy=true;render();
    try{if(file.size>100*1024*1024)throw Error('El respaldo supera 100 MB.');if (typeof ensureJSZip === 'function') await ensureJSZip();const zip=await JSZip.loadAsync(file,{checkCRC32:true});if(Object.values(zip.files).filter(f=>!f.dir).length!==2||!zip.file('document.json')||!zip.file('integrity.json'))throw Error('Contenido del respaldo no válido.');if(zip.file('document.json')._data.uncompressedSize>120*1024*1024||zip.file('integrity.json')._data.uncompressedSize>1000)throw Error('El respaldo descomprimido es demasiado grande.');const body=await zip.file('document.json').async('string'),integrity=JSON.parse(await zip.file('integrity.json').async('string'));if(await digest(body)!==integrity.sha256)throw Error('El respaldo está dañado. El documento actual se conserva.');const restored=await validate(JSON.parse(body));if(revision!==epoch)return;if(pages.length&&!confirm('¿Reemplazar las páginas actuales por este respaldo? Guarda primero el documento actual si lo necesitas.'))return;checkpoint();pages=restored.pages;originals=restored.originals;options=restored.options;searchable=restored.searchable;ocrLanguage=restored.ocrLanguage;selection.clear();selected=0;activate();persist();say('Documento restaurado y comprobado.');}
    catch(e){if(revision===epoch)say(e.message||'No se pudo restaurar. El documento actual se conserva.',true);}finally{if(revision===epoch){busy=false;render();}}
  }
  function render(){
    if(!$('documentWorkspace'))return;
    $('documentWorkspace').hidden=!active;
    const memMB = ((sizeOf(pages, originals) || 0) / (1024 * 1024)).toFixed(1);
    $('docSummary').textContent = pages.length + ' página(s) · ' + pages.filter(p => p.reviewed).length + ' revisada(s) · ' + memMB + ' MB en memoria (máximo 80 MB / 40 págs)';
    if (parseFloat(memMB) > 60 && !busy) say('Trabajo grande (' + memMB + ' MB). Respalda el documento y divide los trabajos largos; la calidad Ligera reduce el PDF de salida, no el borrador.', false);
    if($('docSearchable'))$('docSearchable').checked=searchable;if($('docOcrLanguage')){$('docOcrLanguage').value=ocrLanguage;$('docOcrLanguage').parentElement.hidden=!searchable;}
    $('docPaper').value=options.paper;$('docOrientation').value=options.orientation;$('docMargin').value=options.margin;$('docQuality').value=options.quality;
    for(const control of $('documentWorkspace').querySelectorAll('button,input,select'))if(!control.hasAttribute('data-page-action'))control.disabled=busy;
    $('docCancel').disabled=false;$('docCancel').hidden=!busy;
    for(const name of ['docPdf','docPrint','docQr'])$(name).disabled=!status().ready;
    $('docBackup').disabled=busy||!pages.length;
    for(const id of selection)if(!pages.some(p=>p.id===id))selection.delete(id);const list=$('docPages');list.replaceChildren();
    pages.forEach((page,index)=>{const item=document.createElement('article');item.className='document-page';item.dataset.selected=String(index===selected);const check=document.createElement('input');check.type='checkbox';check.className='workbench-page-select';check.setAttribute('aria-label','Seleccionar página '+(index+1)+' para lote');check.checked=selection.has(page.id);check.disabled=busy;check.onchange=()=>{if(check.checked)selection.add(page.id);else selection.delete(page.id);render();};item.append(check);const thumb=document.createElement('img');thumb.src=page.data;thumb.alt='Página '+(index+1);thumb.loading='lazy';thumb.tabIndex=0;thumb.setAttribute('role','button');thumb.setAttribute('aria-label','Seleccionar página '+(index+1));thumb.onclick=()=>{if(!busy){selected=index;render();}};thumb.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();thumb.click();}};item.draggable=!busy;item.dataset.pageId=page.id;item.ondragstart=e=>e.dataTransfer.setData('application/x-realscan-page',page.id);item.ondragover=e=>{if([...e.dataTransfer.types].includes('application/x-realscan-page'))e.preventDefault();};item.ondrop=e=>{const from=pages.findIndex(p=>p.id===e.dataTransfer.getData('application/x-realscan-page'));if(from>=0){e.preventDefault();e.stopPropagation();reorder(from,index);}};const title=document.createElement('strong');title.textContent='Página '+(index+1)+' · '+(page.reviewed?'Revisada':'Por revisar');
      const actions=document.createElement('div');actions.className='document-page-actions';
      function action(label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.pageAction=label;b.disabled=busy||disabled;b.onclick=fn;actions.append(b);}
      action('Ver página',()=>{selected=index;render();});action('Revisar',()=>reviewPage(page));action('Mejorar legibilidad',()=>enhancePage(page));action('Girar',()=>rotate(page));action('Anterior',()=>move(index,-1),index===0);action('Siguiente',()=>move(index,1),index===pages.length-1);
      action('Restaurar',async()=>{const revision=epoch;try{const restored=await normalize(page.source);if(revision!==epoch||!pages.includes(page))return;checkpoint();Object.assign(page,restored,{reviewed:false});persist();render();}catch(e){say(e.message,true);}});
      action('Reemplazar imagen',()=>{replacement={id:page.id,epoch};$('docReplaceFile').click();});
      action('Extraer texto',()=>RealScanOcr.open({dataUrl:page.data}));
      action('Quitar',()=>{if(!confirm('¿Quitar la página '+(index+1)+'? El original recibido se conserva hasta terminar el servicio.'))return;checkpoint();pages.splice(index,1);selected=Math.min(selected,pages.length-1);persist();render();});item.append(thumb,title);const quality=qualityNotes.get(page.id);if(quality?.data===page.data&&quality.notes.length){const note=document.createElement('p');note.className='flow-quality-note';note.textContent=quality.notes.join(' ');item.append(note);}item.append(actions);list.append(item);
    });
    selected=Math.max(0,Math.min(selected,pages.length-1));const page=pages[selected],preview=$('docPreview');preview.replaceChildren();
    if(page){const g=geometry(page);preview.style.aspectRatio=g.paperWidth+' / '+g.paperHeight;const img=document.createElement('img');img.src=page.data;img.alt='Vista de salida de la página '+(selected+1);img.style.filter=options.color==='gray'?'grayscale(1)':'none';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Editar página '+(selected+1));img.onclick=()=>reviewPage(page);img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();reviewPage(page);}};Object.assign(img.style,{left:g.x/g.paperWidth*100+'%',top:g.y/g.paperHeight*100+'%',width:g.width/g.paperWidth*100+'%',height:g.height/g.paperHeight*100+'%'});preview.append(img);if(g.header){const title=document.createElement('div');title.className='document-live-header';title.textContent=options.headerText;Object.assign(title.style,{position:'absolute',top:g.margin/g.paperHeight*100+'%',left:'0',width:'100%',textAlign:'center'});preview.append(title);}root.RealScanAnnotations?.dom(preview,page.id,g.paperWidth,g.paperHeight,options.annotations||[]);$('docGeometry').textContent='Página '+(selected+1)+' · '+g.paperWidth.toFixed(1)+' × '+g.paperHeight.toFixed(1)+' mm · imagen '+page.width+' × '+page.height+' px · '+Math.round(g.dpi)+' ppp efectivos';}
    else{$('docGeometry').textContent='Importa archivos o captura la primera página.';preview.style.aspectRatio='210 / 297';}
    if($('docUndo')){$('docUndo').disabled=busy||!past.length;$('docRedo').disabled=busy||!future.length;}
    const sourceList=$('docOriginals');sourceList.replaceChildren();for(const source of originals){const b=document.createElement('button');b.type='button';b.textContent='Descargar original · '+source.name;b.onclick=async()=>download(await(await fetch(source.data)).blob(),source.name);sourceList.append(b);}
    root.RealScanCounter?.update();
    document.dispatchEvent(new Event('realscan:document-updated'));
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const area=document.createElement('section');area.id='documentWorkspace';area.hidden=true;area.className='document-workspace';area.innerHTML=`<div class="document-heading"><div><p class="counter-kicker">DOCUMENTO COMPLETO</p><h2>De la primera página a la entrega</h2><p id="docSummary"></p></div><div class="document-actions"><button type="button" id="docImport">＋ Añadir archivos</button><button type="button" id="docCamera">Escanear otra página</button><button type="button" id="docReceive">Recibir por QR</button><button type="button" id="docCancel" hidden>Cancelar proceso</button></div></div>
      <p class="counter-help">Arrastra JPG, PNG, WebP o PDF. Importa hasta 40 páginas; cada PDF se convierte en imágenes para poder revisarlo. El original permanece disponible. No se infieren las medidas físicas de una fotografía: el documento se encaja sin deformarlo en el papel elegido.</p>
      <div class="document-grid"><div><div id="docPages" class="document-pages" aria-label="Páginas en orden de entrega"></div><details><summary>Archivos originales</summary><div id="docOriginals" class="document-originals"></div></details></div><div class="document-output"><h3>Preparar salida</h3><div class="document-options"><label>Papel<select id="docPaper"><option value="a4">A4</option><option value="letter">Carta</option><option value="oficio">Oficio México</option><option value="legal">Legal USA</option></select></label><label>Orientación<select id="docOrientation"><option value="auto">Según cada página</option><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label><label>Margen (mm)<input id="docMargin" type="number" min="0" max="25" step="1" value="8"></label><label>Calidad del PDF<select id="docQuality"><option value="high">Alta · hasta 3508 px</option><option value="light">Ligera · hasta 1600 px</option></select></label></div><label class="counter-check"><input id="docSearchable" type="checkbox"><span>Añadir texto buscable al PDF (OCR local)</span></label><label class="counter-field">Idioma del texto<select id="docOcrLanguage"><option value="spa">Español</option><option value="eng">Inglés</option><option value="spa+eng">Español e inglés</option></select></label><p class="counter-help">La imagen no cambia. El texto es automático: revisa nombres y números. Prepara los idiomas antes de trabajar sin internet.</p><div id="docPreview" class="document-preview"></div><p id="docGeometry" class="counter-help"></p><p class="counter-help">Confirma cada página en «Revisar» antes de preparar el PDF. Para imprimir, abre el PDF y usa 100 % en la impresora. Un archivo ligero puede perder detalle: revisa textos pequeños.</p><div class="document-actions"><button type="button" id="docPdf">Descargar PDF completo</button><button type="button" id="docPrint">Preparar impresión</button><button type="button" id="docQr">Generar QR del PDF</button></div><a id="docPrintLink" class="document-link" target="_blank" rel="noopener" hidden>Abrir PDF para imprimir</a><div id="docDeliveryBox" hidden><canvas id="docDeliveryQr" class="counter-qr"></canvas><button type="button" id="docShowQr">Ver entrega vigente</button><button type="button" id="docWhatsapp">Compartir enlace por WhatsApp</button></div><div class="document-actions"><button type="button" id="docBackup">Respaldar documento</button><button type="button" id="docRestore">Abrir respaldo</button></div></div></div>
      <p id="docStatus" class="document-status" role="status"></p><p id="docDraft" class="counter-help">El borrador se guarda en este dispositivo.</p><input id="docFiles" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden><input id="docNativeCamera" type="file" accept="image/*" capture="environment" hidden><input id="docBackupFile" type="file" accept=".realscan" hidden>`;
    $('workflowGuide').after(area);
    const historyBar=document.createElement('div');historyBar.className='document-history document-actions';historyBar.innerHTML='<button type="button" id="docUndo">↶ Deshacer</button><button type="button" id="docRedo">↷ Rehacer</button><span>Toca una miniatura para seleccionarla. Arrastra para ordenar; Anterior/Siguiente también funcionan con teclado.</span><input id="docReplaceFile" type="file" accept="image/jpeg,image/png,image/webp" hidden>';$('docPages').before(historyBar);const qualityButton=document.createElement('button');qualityButton.id='docAnalyzeQuality';qualityButton.type='button';qualityButton.textContent='Revisar calidad de páginas';qualityButton.onclick=analyzeQuality;historyBar.append(qualityButton);$('docUndo').onclick=()=>travel();$('docRedo').onclick=()=>travel(true);$('docReplaceFile').onchange=e=>{const file=e.target.files[0];e.target.value='';replaceFile(file);};
    const banner=document.createElement('aside');banner.id='docRecovery';banner.className='document-recovery';banner.hidden=true;banner.innerHTML='<p>Hay un documento de varias páginas pendiente en este dispositivo.</p><button type="button" id="docRecover">Recuperar documento</button><button type="button" id="docDiscard">Descartar este borrador</button>';$('counterService').after(banner);
    $('docImport').onclick=()=>$('docFiles').click();$('docFiles').onchange=e=>{const files=[...e.target.files];e.target.value='';addFiles(files);};
    $('docCamera').onclick=()=>{if(busy)return;const revision=epoch;RealScanCapture.open({photoMode:false,onNative:()=>$('docNativeCamera').click(),onAccept:async data=>{if(revision!==epoch)return;const blob=await(await fetch(data)).blob();const before=pages.length;if(await addFiles([new File([blob],'Captura.jpg',{type:blob.type})])&&pages.length===before+1){pages[before].reviewed=true;persist();render();}}});};
    $('docNativeCamera').onchange=e=>{const files=[...e.target.files];e.target.value='';addFiles(files);};$('docReceive').onclick=()=>$('btnOpenReceiveModal').click();
    $('docCancel').onclick=()=>{root.RealScanSearchable?.cancel();epoch++;task?.destroy?.();task=null;busy=false;render();say('Proceso cancelado. Las páginas anteriores se conservan.');};
    for(const [control,key]of [['docPaper','paper'],['docOrientation','orientation'],['docMargin','margin'],['docQuality','quality']])$(control).onchange=()=>{checkpoint();options[key]=key==='margin'?Math.max(0,Math.min(25,Number($(control).value)||0)):$(control).value;persist();render();};
    $('docSearchable').onchange=()=>{checkpoint();searchable=$('docSearchable').checked;persist();render();};$('docOcrLanguage').onchange=()=>{checkpoint();ocrLanguage=$('docOcrLanguage').value;persist();render();};
    $('docPdf').onclick=()=>output('pdf');$('docPrint').onclick=()=>output('print');$('docQr').onclick=()=>output('qr');$('docBackup').onclick=backup;$('docRestore').onclick=()=>$('docBackupFile').click();$('docBackupFile').onchange=e=>{const file=e.target.files[0];e.target.value='';restoreFile(file);};
    $('docShowQr').onclick=()=>$('counterShowDelivery').click();$('docWhatsapp').onclick=()=>shareDeliveryWhatsapp();
    area.addEventListener('dragover',e=>{e.preventDefault();});area.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();addFiles([...e.dataTransfer.files]);});
    document.addEventListener('paste',e=>{if(!active||e.target.closest('input,textarea'))return;const files=[...(e.clipboardData?.items||[])].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();e.stopImmediatePropagation();addFiles(files);}},{capture:true});
    $('docRecover').onclick=async()=>{if(busy)return;try{const restored=await validate(recovery);if((Object.values(state.images).some(i=>i.originalSrc)||pages.length)&&!confirm('¿Cambiar al documento recuperado? Guarda primero el trabajo actual.'))return;prepareWorkspaceForJobSwitch({clearDraft:true,keepDelivery:true});await state._jobSwitchCleanup;pages=restored.pages;originals=restored.originals;options=restored.options;searchable=restored.searchable;ocrLanguage=restored.ocrLanguage;selection.clear();selected=0;activate();persist();say('Documento recuperado.');}catch(e){say('No se pudo recuperar el documento. Puedes abrir un respaldo descargado.',true);showToast(e.message,'error');}};
    $('docDiscard').onclick=async()=>{if(!confirm('¿Descartar únicamente este borrador de documento?'))return;await transaction('readwrite',s=>s.delete('active'));recovery=null;banner.hidden=true;};
    transaction('readonly',s=>s.get('active')).then(record=>{if(record&&Date.now()-record.savedAt<14*86400000&&record.pages?.length){recovery=record;banner.hidden=false;}}).catch(()=>{});
    render();
  });
  function setOptions(patch){if(busy)return;const next={...options,...patch};if(patch.annotations!==undefined)next.annotations=root.RealScanAnnotations.clean(patch.annotations);next.headerText=String(next.headerText||'').replace(/[\x00-\x1f]/g,'').slice(0,48);next.headerEnabled=!!next.headerEnabled;if(!['center','top','compact'].includes(next.position))return;if(!['color','gray'].includes(next.color)||!['single','manual'].includes(next.duplex)||!Number.isInteger(next.sets)||next.sets<1||next.sets>10)return;checkpoint();options=next;persist();render();}
  async function batch(action){if(busy||!unlocked())return false;const targets=pages.filter(p=>selection.has(p.id));if(!targets.length)return false;if(action==='remove'&&!confirm('¿Quitar '+targets.length+' páginas seleccionadas?'))return false;const revision=epoch;busy=true;render();try{const changes=new Map();if(action!=='remove')for(const page of targets){if(!['rotate','gray','restore'].includes(action))throw Error('Acción no válida.');const img=await image(action==='restore'?page.source:page.data);const c=document.createElement('canvas');c.width=action==='rotate'?img.naturalHeight:img.naturalWidth;c.height=action==='rotate'?img.naturalWidth:img.naturalHeight;const ctx=c.getContext('2d');if(action==='rotate'){ctx.translate(c.width,0);ctx.rotate(Math.PI/2);}if(action==='gray')ctx.filter='grayscale(1)';ctx.drawImage(img,0,0);changes.set(page.id,{data:c.toDataURL('image/png'),width:c.width,height:c.height,reviewed:false});c.width=c.height=1;}if(revision!==epoch)return false;const next=action==='remove'?pages.filter(p=>!selection.has(p.id)):pages.map(p=>({...p,...changes.get(p.id)}));if(sizeOf(next,originals)>MAX_BYTES)throw Error('El lote supera 80 MB.');checkpoint();pages=next;persist();return true;}catch(e){if(revision===epoch)say(e.message,true);return false;}finally{if(revision===epoch){busy=false;render();}}}
root.RealScanDocuments={annotationPages:()=>unlocked()&&!busy?pages.map(p=>({...p,key:p.id,w:geometry(p).paperWidth,h:geometry(p).paperHeight,geometry:geometry(p),gray:options.color==='gray',header:options.headerEnabled?options.headerText:''})):[],batch,selectPages(ids){if(busy||!unlocked())return;selection.clear();for(const id of ids)if(pages.some(p=>p.id===id))selection.add(id);render();},listPages:()=>pages.map(p=>({id:p.id,width:p.width,height:p.height})),exportSnapshot:()=>!busy?pack():null,validateSnapshot:validate,async restoreSnapshot(record){if(busy||!unlocked())throw Error('El puesto no está disponible.');const before=[epoch,version,state._jobRevision];const value=await validate(record);if(!unlocked()||before[0]!==epoch||before[1]!==version||before[2]!==state._jobRevision)throw Error('El trabajo cambió. Vuelve a abrir la copia.');prepareWorkspaceForJobSwitch({clearDraft:true,keepDelivery:true});await state._jobSwitchCleanup;pages=value.pages;originals=value.originals;options=value.options;searchable=value.searchable;ocrLanguage=value.ocrLanguage;selected=0;activate();persist();render();},printSnapshot(){if(!unlocked()||!status().ready)throw Error('Revisa y confirma todas las páginas.');return {revision:version,epoch,pages:pages.map(p=>({...p})),options:{...options}};},printFaces(face){if(['odd','even'].includes(face)&&unlocked())return output(face);},analyzeQuality,quality:()=>pages.map(p=>({id:p.id,notes:qualityNotes.get(p.id)?.data===p.data?qualityNotes.get(p.id).notes:[]})),undo:()=>travel(),redo:()=>travel(true),reorder,history:()=>({undo:past.length,redo:future.length}),select(index){if(!busy&&index>=0&&index<pages.length){selected=index;render();}},setOptions,activate,deactivate,reset,status,geometry,printGeometry,addFiles,fromInbox,makePdf,backup,restoreFile,render,reviewPage};
})(window);
