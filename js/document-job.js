/* Ordered document jobs. Physical ID/photo layouts remain in the calibrated engine. */
(function(root){
  'use strict';
  const MAX_PAGES=40,MAX_BYTES=80*1024*1024,MAX_EDGE=3508;
  const $=id=>document.getElementById(id);
  let active=false,pages=[],originals=[],selected=0,epoch=0,busy=false,task=null,saveTimer=null,saveChain=Promise.resolve(),connection=null,recovery=null;
  let options={paper:'a4',orientation:'auto',margin:8,quality:'high'};
  function say(message,error=false){if($('docStatus')){$('docStatus').textContent=message;$('docStatus').dataset.error=String(error);}}
  function id(){return crypto.randomUUID();}
  function bytes(data){return atob(data.split(',')[1]).length;}
  function sizeOf(list,files){return [...new Set([...list.flatMap(p=>[p.source,p.data]),...files.map(f=>f.data)])].reduce((sum,data)=>sum+bytes(data),0);}
  function geometry(page,settings=options){
    const paper=PAPER_SPECS[settings.paper]||PAPER_SPECS.a4;
    let w=paper.widthMm,h=paper.heightMm;
    const landscape=settings.orientation==='landscape'||settings.orientation==='auto'&&page.width>page.height;
    if(landscape&&w<h||!landscape&&w>h)[w,h]=[h,w];
    const margin=Math.max(0,Math.min(25,Number(settings.margin)||0));
    const scale=Math.min((w-2*margin)/page.width,(h-2*margin)/page.height);
    return {paperWidth:w,paperHeight:h,width:page.width*scale,height:page.height*scale,x:(w-page.width*scale)/2,y:(h-page.height*scale)/2,dpi:page.width/(page.width*scale/25.4)};
  }
  function status(){return {active,busy,count:pages.length,reviewed:pages.filter(p=>p.reviewed).length,ready:active&&!busy&&pages.length>0&&pages.every(p=>p.reviewed),selected,options:{...options}};}
  function activate(){active=true;document.body.dataset.documentJob='true';render();root.RealScanCounter?.update();}
  function deactivate(){active=false;delete document.body.dataset.documentJob;render();root.RealScanCounter?.update();}
  function pack(){
    const assets=[],lookup=new Map();const asset=data=>{if(!lookup.has(data)){lookup.set(data,assets.length);assets.push(data);}return lookup.get(data);};
    return {schema:1,savedAt:Date.now(),options:{...options},pages:pages.map(p=>({...p,source:asset(p.source),data:asset(p.data)})),originals:originals.map(f=>({...f,data:asset(f.data)})),assets};
  }
  async function database(){
    if(connection)return connection;
    connection=new Promise((resolve,reject)=>{const request=indexedDB.open('realscan_documents_v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('jobs');request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();connection=null;};resolve(request.result);};request.onerror=()=>{connection=null;reject(request.error);};request.onblocked=()=>{connection=null;reject(Error('Cierra otras pestañas para preparar el borrador.'));};});return connection;
  }
  async function transaction(mode,action){const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('jobs',mode),request=action(tx.objectStore('jobs'));tx.oncomplete=()=>resolve(request?.result);tx.onerror=tx.onabort=()=>reject(tx.error||request?.error||Error('No se pudo guardar el documento.'));});}
  function persist(){
    clearTimeout(saveTimer);const revision=epoch;
    saveTimer=setTimeout(()=>{if(revision!==epoch||!pages.length)return;const record=pack();
      saveChain=saveChain.catch(()=>{}).then(async()=>{if(revision!==epoch)return;await transaction('readwrite',s=>s.put(record,'active'));if(revision===epoch){$('docDraft').textContent='Borrador guardado en este dispositivo';}}).catch(()=>{if(revision===epoch){$('docDraft').textContent='No se pudo autoguardar. Descarga un respaldo del documento; el trabajo sigue abierto.';root.RealScanDiagnostics?.record('draft.failed','error');}});
    },350);
  }
  function reset(clearDraft=false){
    epoch++;busy=false;clearTimeout(saveTimer);root.RealScanReview?.cancel();root.RealScanCapture?.close();task?.destroy?.();task=null;pages=[];originals=[];selected=0;deactivate();
    if($('docDeliveryBox'))$('docDeliveryBox').hidden=true;
    if($('docPrintLink')){const link=$('docPrintLink');link.hidden=true;if(link.dataset.objectUrl)URL.revokeObjectURL(link.dataset.objectUrl);delete link.dataset.objectUrl;}
    options={paper:'a4',orientation:'auto',margin:8,quality:'high'};
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
      selected=pages.length;pages.push(...staged);originals.push(...sourceFiles);persist();say(staged.length+' página(s) añadidas. Revisa cada página antes de entregar.');return true;
    }catch(e){if(revision===epoch)say(e.message||'No se pudo abrir el documento. Las páginas anteriores se conservan.',true);return false;}
    finally{if(revision===epoch){busy=false;render();}}
  }
  async function fromInbox(file){if(file.assigning||file.documentAddedJob===(state._jobRevision||0))return;const job=state._jobRevision||0;file.assigning=true;RealScanReceiveUI.render();try{const blob=await(await fetch(file.dataUrl)).blob();if(!active||job!==(state._jobRevision||0))return;const added=await addFiles([new File([blob],file.name,{type:file.type})]);if(added&&job===(state._jobRevision||0)){file.documentAddedJob=job;file.assignedTo='document';}}catch(e){say('No se pudo añadir el archivo recibido. Reintenta.',true);}finally{file.assigning=false;RealScanReceiveUI.render();}}
  async function reviewPage(page){
    if(busy||!pages.includes(page))return;const revision=epoch;
    const result=await RealScanReview.open({dataUrl:page.data,name:'Página '+(pages.indexOf(page)+1)+' de '+pages.length,photoMode:false});
    if(!result||revision!==epoch||!pages.includes(page))return;
    const changed=await normalize(result);if(revision!==epoch||!pages.includes(page))return;
    if(sizeOf(pages.map(p=>p===page?{...page,...changed}:p),originals)>MAX_BYTES){say('El ajuste supera el límite del trabajo.',true);return;}
    Object.assign(page,changed,{reviewed:true});selected=pages.indexOf(page);persist();render();say('Página revisada. Confirma las restantes antes de entregar.');
  }
  async function rotate(page){
    if(busy||!pages.includes(page))return;const revision=epoch;busy=true;render();
    try{const img=await image(page.data);if(revision!==epoch||!pages.includes(page))return;const c=document.createElement('canvas');c.width=img.naturalHeight;c.height=img.naturalWidth;const ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(img,0,0);const next={data:c.toDataURL('image/jpeg',.96),width:c.width,height:c.height};if(sizeOf(pages.map(p=>p===page?{...page,...next}:p),originals)>MAX_BYTES)throw Error('El ajuste supera el límite del trabajo.');Object.assign(page,next,{reviewed:false});persist();}
    catch(e){if(revision===epoch)say(e.message,true);}finally{if(revision===epoch){busy=false;render();}}
  }
  function move(index,step){if(busy||index+step<0||index+step>=pages.length)return;[pages[index],pages[index+step]]=[pages[index+step],pages[index]];selected=index+step;persist();render();}
  async function makePdf(){
    if(!status().ready)throw Error('Revisa y confirma todas las páginas antes de preparar la entrega.');
    const revision=epoch,snapshot=pages.map(p=>({...p})),settings={...options};let pdf;
    for(let n=0;n<snapshot.length;n++){
      if(revision!==epoch)throw Error('El trabajo cambió. Prepara otra entrega.');
      const page=snapshot[n],g=geometry(page,settings),landscape=g.paperWidth>g.paperHeight;
      if(!pdf)pdf=new jspdf.jsPDF({unit:'mm',format:[g.paperWidth,g.paperHeight],orientation:landscape?'landscape':'portrait',compress:true});
      else pdf.addPage([g.paperWidth,g.paperHeight],landscape?'landscape':'portrait');
      const img=await image(page.data);if(revision!==epoch)throw Error('El trabajo cambió.');
      const canvas=document.createElement('canvas'),max=settings.quality==='light'?1600:MAX_EDGE,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
      canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      pdf.addImage(canvas.toDataURL('image/jpeg',settings.quality==='light'?.82:.96),'JPEG',g.x,g.y,g.width,g.height);canvas.width=canvas.height=1;
    }return pdf;
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  async function output(kind){
    if(!status().ready)return;const revision=epoch;busy=true;render();
    try{
      // Only this operation owns the busy flag; rendering uses a frozen snapshot.
      busy=false;const pdfPromise=makePdf();busy=true;const pdf=await pdfPromise;
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
      }else{download(pdf.output('blob'),'RealScan_Documento.pdf');say('PDF completo descargado. Comprueba que abre y contiene todas sus páginas.');}
      root.RealScanDiagnostics?.record('document.output','info',{count:pages.length});
    }catch(e){if(revision===epoch)say((e.message||'No se pudo preparar el archivo.')+(kind==='qr'?' Para PDF mayores de 6 MB, elige calidad Ligera y vuelve a preparar, o descarga para entregar por USB.':''),true);}
    finally{if(revision===epoch){busy=false;render();}}
  }
  async function digest(text){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');}
  async function validate(record){
    if(!record||record.schema!==1||!Array.isArray(record.pages)||record.pages.length>MAX_PAGES||!Array.isArray(record.originals)||record.originals.length>40||!Array.isArray(record.assets)||record.assets.length>120)throw Error('Respaldo de documento no válido.');
    if(!['a4','letter','oficio','legal'].includes(record.options?.paper)||!['auto','portrait','landscape'].includes(record.options?.orientation)||!['high','light'].includes(record.options?.quality)||!Number.isFinite(record.options?.margin)||record.options.margin<0||record.options.margin>25)throw Error('Opciones de documento no válidas.');
    let total=0;for(const data of record.assets){if(typeof data!=='string'||!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Archivo interno no válido.');total+=bytes(data);if(total>MAX_BYTES)throw Error('El respaldo supera 80 MB de archivos.');}
    const asset=n=>{if(!Number.isInteger(n)||n<0||n>=record.assets.length)throw Error('Referencia de archivo no válida.');return record.assets[n];};
    const restored=[];for(const page of record.pages){const data=asset(page.data),source=asset(page.source),img=await image(data);await image(source);restored.push({id:id(),sourceId:String(page.sourceId).slice(0,80),data,source,width:img.naturalWidth,height:img.naturalHeight,reviewed:!!page.reviewed});}
    const files=record.originals.map(f=>{const data=asset(f.data);if(typeof f.name!=='string'||f.name.length>180||!['image/jpeg','image/png','image/webp','application/pdf'].includes(f.type)||!data.startsWith('data:'+f.type+';'))throw Error('Original no válido.');return {id:String(f.id).slice(0,80),name:f.name,type:f.type,data};});
    return {pages:restored,originals:files,options:{...record.options}};
  }
  async function backup(){if(busy||!pages.length)return;try{const body=JSON.stringify(pack()),zip=new JSZip();zip.file('document.json',body);zip.file('integrity.json',JSON.stringify({sha256:await digest(body)}));download(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),'RealScan_Documento.realscan');say('Respaldo con páginas y originales descargado.');}catch(e){say('No se pudo crear el respaldo: '+e.message,true);}}
  async function restoreFile(file){
    if(busy||!file)return;const revision=epoch;busy=true;render();
    try{if(file.size>100*1024*1024)throw Error('El respaldo supera 100 MB.');const zip=await JSZip.loadAsync(file,{checkCRC32:true});if(Object.values(zip.files).filter(f=>!f.dir).length!==2||!zip.file('document.json')||!zip.file('integrity.json'))throw Error('Contenido del respaldo no válido.');if(zip.file('document.json')._data.uncompressedSize>120*1024*1024||zip.file('integrity.json')._data.uncompressedSize>1000)throw Error('El respaldo descomprimido es demasiado grande.');const body=await zip.file('document.json').async('string'),integrity=JSON.parse(await zip.file('integrity.json').async('string'));if(await digest(body)!==integrity.sha256)throw Error('El respaldo está dañado. El documento actual se conserva.');const restored=await validate(JSON.parse(body));if(revision!==epoch)return;if(pages.length&&!confirm('¿Reemplazar las páginas actuales por este respaldo? Guarda primero el documento actual si lo necesitas.'))return;pages=restored.pages;originals=restored.originals;options=restored.options;selected=0;activate();persist();say('Documento restaurado y comprobado.');}
    catch(e){if(revision===epoch)say(e.message||'No se pudo restaurar. El documento actual se conserva.',true);}finally{if(revision===epoch){busy=false;render();}}
  }
  function render(){
    const memMB = ((sizeOf(pages, originals) || 0) / (1024 * 1024)).toFixed(1);
    $('docSummary').textContent = pages.length + ' página(s) · ' + pages.filter(p => p.reviewed).length + ' revisada(s) · ' + memMB + ' MB en memoria (máximo 80 MB / 40 págs)';
    if (parseFloat(memMB) > 60 && options.quality !== 'light') say('Uso alto de memoria (' + memMB + ' MB). Se recomienda seleccionar Calidad Ligera para asegurar un rendimiento óptimo.', false);
    $('docPaper').value=options.paper;$('docOrientation').value=options.orientation;$('docMargin').value=options.margin;$('docQuality').value=options.quality;
    for(const control of $('documentWorkspace').querySelectorAll('button,input,select'))if(!control.hasAttribute('data-page-action'))control.disabled=busy;
    $('docCancel').disabled=false;$('docCancel').hidden=!busy;
    for(const name of ['docPdf','docPrint','docQr'])$(name).disabled=!status().ready;
    $('docBackup').disabled=busy||!pages.length;
    const list=$('docPages');list.replaceChildren();
    pages.forEach((page,index)=>{const item=document.createElement('article');item.className='document-page';item.dataset.selected=String(index===selected);const thumb=document.createElement('img');thumb.src=page.data;thumb.alt='Página '+(index+1);thumb.loading='lazy';const title=document.createElement('strong');title.textContent='Página '+(index+1)+' · '+(page.reviewed?'Revisada':'Por revisar');
      const actions=document.createElement('div');actions.className='document-page-actions';
      function action(label,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.pageAction=label;b.disabled=busy||disabled;b.onclick=fn;actions.append(b);}
      action('Ver página',()=>{selected=index;render();});action('Revisar',()=>reviewPage(page));action('Girar',()=>rotate(page));action('Anterior',()=>move(index,-1),index===0);action('Siguiente',()=>move(index,1),index===pages.length-1);
      action('Restaurar',async()=>{const revision=epoch;try{const restored=await normalize(page.source);if(revision!==epoch||!pages.includes(page))return;Object.assign(page,restored,{reviewed:false});persist();render();}catch(e){say(e.message,true);}});
      action('Extraer texto',()=>RealScanOcr.open({dataUrl:page.data}));
      action('Quitar',()=>{if(!confirm('¿Quitar la página '+(index+1)+'? El original recibido se conserva hasta terminar el servicio.'))return;pages.splice(index,1);selected=Math.min(selected,pages.length-1);persist();render();});item.append(thumb,title,actions);list.append(item);
    });
    selected=Math.max(0,Math.min(selected,pages.length-1));const page=pages[selected],preview=$('docPreview');preview.replaceChildren();
    if(page){const g=geometry(page);preview.style.aspectRatio=g.paperWidth+' / '+g.paperHeight;const img=document.createElement('img');img.src=page.data;img.alt='Vista de salida de la página '+(selected+1);Object.assign(img.style,{left:g.x/g.paperWidth*100+'%',top:g.y/g.paperHeight*100+'%',width:g.width/g.paperWidth*100+'%',height:g.height/g.paperHeight*100+'%'});preview.append(img);$('docGeometry').textContent='Página '+(selected+1)+' · '+g.paperWidth.toFixed(1)+' × '+g.paperHeight.toFixed(1)+' mm · imagen '+page.width+' × '+page.height+' px · '+Math.round(g.dpi)+' ppp efectivos';}
    else{$('docGeometry').textContent='Importa archivos o captura la primera página.';preview.style.aspectRatio='210 / 297';}
    const sourceList=$('docOriginals');sourceList.replaceChildren();for(const source of originals){const b=document.createElement('button');b.type='button';b.textContent='Descargar original · '+source.name;b.onclick=async()=>download(await(await fetch(source.data)).blob(),source.name);sourceList.append(b);}
    root.RealScanCounter?.update();
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const area=document.createElement('section');area.id='documentWorkspace';area.hidden=true;area.className='document-workspace';area.innerHTML=`<div class="document-heading"><div><p class="counter-kicker">DOCUMENTO COMPLETO</p><h2>De la primera página a la entrega</h2><p id="docSummary"></p></div><div class="document-actions"><button type="button" id="docImport">＋ Añadir archivos</button><button type="button" id="docCamera">Escanear otra página</button><button type="button" id="docReceive">Recibir por QR</button><button type="button" id="docCancel" hidden>Cancelar proceso</button></div></div>
      <p class="counter-help">Arrastra JPG, PNG, WebP o PDF. Importa hasta 40 páginas; cada PDF se convierte en imágenes para poder revisarlo. El original permanece disponible. No se infieren las medidas físicas de una fotografía: el documento se encaja sin deformarlo en el papel elegido.</p>
      <div class="document-grid"><div><div id="docPages" class="document-pages" aria-label="Páginas en orden de entrega"></div><details><summary>Archivos originales</summary><div id="docOriginals" class="document-originals"></div></details></div><div class="document-output"><h3>Preparar salida</h3><div class="document-options"><label>Papel<select id="docPaper"><option value="a4">A4</option><option value="letter">Carta</option><option value="oficio">Oficio México</option><option value="legal">Legal USA</option></select></label><label>Orientación<select id="docOrientation"><option value="auto">Según cada página</option><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label><label>Margen (mm)<input id="docMargin" type="number" min="0" max="25" step="1" value="8"></label><label>Calidad del PDF<select id="docQuality"><option value="high">Alta · hasta 3508 px</option><option value="light">Ligera · hasta 1600 px</option></select></label></div><div id="docPreview" class="document-preview"></div><p id="docGeometry" class="counter-help"></p><p class="counter-help">Confirma cada página en «Revisar» antes de preparar el PDF. Para imprimir, abre el PDF y usa 100 % en la impresora. Un archivo ligero puede perder detalle: revisa textos pequeños.</p><div class="document-actions"><button type="button" id="docPdf">Descargar PDF completo</button><button type="button" id="docPrint">Preparar impresión</button><button type="button" id="docQr">Generar QR del PDF</button></div><a id="docPrintLink" class="document-link" target="_blank" rel="noopener" hidden>Abrir PDF para imprimir</a><div id="docDeliveryBox" hidden><canvas id="docDeliveryQr" class="counter-qr"></canvas><button type="button" id="docShowQr">Ver entrega vigente</button><button type="button" id="docWhatsapp">Compartir enlace por WhatsApp</button></div><div class="document-actions"><button type="button" id="docBackup">Respaldar documento</button><button type="button" id="docRestore">Abrir respaldo</button></div></div></div>
      <p id="docStatus" class="document-status" role="status"></p><p id="docDraft" class="counter-help">El borrador se guarda en este dispositivo.</p><input id="docFiles" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden><input id="docNativeCamera" type="file" accept="image/*" capture="environment" hidden><input id="docBackupFile" type="file" accept=".realscan" hidden>`;
    $('workflowGuide').after(area);
    const banner=document.createElement('aside');banner.id='docRecovery';banner.className='document-recovery';banner.hidden=true;banner.innerHTML='<p>Hay un documento de varias páginas pendiente en este dispositivo.</p><button type="button" id="docRecover">Recuperar documento</button><button type="button" id="docDiscard">Descartar este borrador</button>';$('counterService').after(banner);
    $('docImport').onclick=()=>$('docFiles').click();$('docFiles').onchange=e=>{const files=[...e.target.files];e.target.value='';addFiles(files);};
    $('docCamera').onclick=()=>{if(busy)return;const revision=epoch;RealScanCapture.open({photoMode:false,onNative:()=>$('docNativeCamera').click(),onAccept:async data=>{if(revision!==epoch)return;const blob=await(await fetch(data)).blob();const before=pages.length;if(await addFiles([new File([blob],'Captura.jpg',{type:blob.type})])&&pages.length===before+1){pages[before].reviewed=true;persist();render();}}});};
    $('docNativeCamera').onchange=e=>{const files=[...e.target.files];e.target.value='';addFiles(files);};$('docReceive').onclick=()=>$('btnOpenReceiveModal').click();
    $('docCancel').onclick=()=>{epoch++;task?.destroy?.();task=null;busy=false;render();say('Proceso cancelado. Las páginas anteriores se conservan.');};
    for(const [control,key]of [['docPaper','paper'],['docOrientation','orientation'],['docMargin','margin'],['docQuality','quality']])$(control).onchange=()=>{options[key]=key==='margin'?Math.max(0,Math.min(25,Number($(control).value)||0)):$(control).value;persist();render();};
    $('docPdf').onclick=()=>output('pdf');$('docPrint').onclick=()=>output('print');$('docQr').onclick=()=>output('qr');$('docBackup').onclick=backup;$('docRestore').onclick=()=>$('docBackupFile').click();$('docBackupFile').onchange=e=>{const file=e.target.files[0];e.target.value='';restoreFile(file);};
    $('docShowQr').onclick=()=>$('counterShowDelivery').click();$('docWhatsapp').onclick=()=>shareDeliveryWhatsapp();
    area.addEventListener('dragover',e=>{e.preventDefault();});area.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();addFiles([...e.dataTransfer.files]);});
    document.addEventListener('paste',e=>{if(!active||e.target.closest('input,textarea'))return;const files=[...(e.clipboardData?.items||[])].filter(i=>i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);if(files.length){e.preventDefault();e.stopImmediatePropagation();addFiles(files);}},{capture:true});
    $('docRecover').onclick=async()=>{if(busy)return;try{const restored=await validate(recovery);if((Object.values(state.images).some(i=>i.originalSrc)||pages.length)&&!confirm('¿Cambiar al documento recuperado? Guarda primero el trabajo actual.'))return;prepareWorkspaceForJobSwitch({clearDraft:true,keepDelivery:true});await state._jobSwitchCleanup;pages=restored.pages;originals=restored.originals;options=restored.options;selected=0;activate();persist();say('Documento recuperado.');}catch(e){say('No se pudo recuperar el documento. Puedes abrir un respaldo descargado.',true);showToast(e.message,'error');}};
    $('docDiscard').onclick=async()=>{if(!confirm('¿Descartar únicamente este borrador de documento?'))return;await transaction('readwrite',s=>s.delete('active'));recovery=null;banner.hidden=true;};
    transaction('readonly',s=>s.get('active')).then(record=>{if(record&&Date.now()-record.savedAt<14*86400000&&record.pages?.length){recovery=record;banner.hidden=false;}}).catch(()=>{});
    render();
  });
  root.RealScanDocuments={activate,deactivate,reset,status,geometry,addFiles,fromInbox,makePdf,backup,restoreFile,render,reviewPage};
})(window);
