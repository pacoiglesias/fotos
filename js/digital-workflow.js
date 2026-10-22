(function(root){
  'use strict';
  let busy=false;
  const $=id=>document.getElementById(id);
  function slots(){return [...new Set(RealScanLayout.computeDocumentLayout(state).pages.flatMap(p=>p.placements.map(i=>i.slot)))];}
  function render(){
    if(!$('digitalOutput'))return;
    const list=$('digitalFiles');list.replaceChildren();
    for(const side of slots()){const src=state.images[side]?.processedDataUrl,figure=document.createElement('figure'),title=document.createElement('figcaption');title.textContent=({front:state.activeCategory==='photos'?'Fotografía / Persona A':'Frente',back:state.activeCategory==='photos'?'Persona B':'Reverso',page3:'Página 3',page4:'Página 4'})[side];if(src){const image=document.createElement('img');image.src=src;image.alt=title.textContent;figure.append(image);}else{const missing=document.createElement('p');missing.textContent='Pendiente de cargar';figure.append(missing);}figure.append(title);list.append(figure);}
    const policy=getActiveSpec().digital;for(const option of $('digitalFormat').options)option.disabled=!!policy&&!policy.formats.includes(option.value);if(policy&&!policy.formats.includes($('digitalFormat').value))$('digitalFormat').value='jpg';
    for(const control of $('digitalOutput').querySelectorAll('button,select'))control.disabled=busy;
    $('digitalDownload').disabled=$('digitalQr').disabled=busy||!RealScanWorkflow.describe().ready;
  }
  function settings(){return {format:$('digitalFormat').value,max:$('digitalPixels').value,bytes:Number($('digitalBytes').value)||0};}
  function openQr(){const chosen=settings(),wanted=slots();$('selectDeliveryFormat').value=chosen.format;$('selectDeliveryMaxPx').value=chosen.max;$('selectDeliveryMaxBytes').value=String(chosen.bytes);$('checkDeliverPdfSheet').checked=false;for(const [side,id]of [['front','checkDeliverFrontJpg'],['back','checkDeliverBackJpg'],['page3','checkDeliverPage3'],['page4','checkDeliverPage4']])$(id).checked=wanted.includes(side);$('btnOpenDeliveryModal').click();}
  async function download(){
    if(busy||!RealScanWorkflow.describe().ready)return;busy=true;render();const revision=state._jobRevision||0,wanted=slots(),sources=wanted.map(s=>state.images[s].processedDataUrl),chosen=settings();
    try{const files=[];for(const side of wanted)files.push(await createDigitalFile(side,chosen.format,chosen.max,chosen.bytes?chosen.bytes-1:0));
      if(revision!==(state._jobRevision||0)||wanted.some((s,i)=>state.images[s].processedDataUrl!==sources[i]))throw Error('Las imágenes cambiaron. Revisa el resultado y vuelve a preparar la entrega.');
      let blob,name;if(files.length===1){blob=await(await fetch(files[0].dataUrl)).blob();name=files[0].name;}else{const zip=new JSZip();files.forEach((file,i)=>zip.file((i+1)+'-'+file.name,file.dataUrl.split(',')[1],{base64:true}));blob=await zip.generateAsync({type:'blob'});name='RealScan_Entrega_Digital.zip';}
      if(revision!==(state._jobRevision||0))return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);$('digitalStatus').textContent='Archivo preparado. Comprueba que abre y cumple los requisitos del destino.';
    }catch(e){$('digitalStatus').textContent=e.message;}finally{busy=false;render();}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const panel=document.createElement('section');panel.id='digitalOutput';panel.className='digital-output mob-pane mob-pane-3';panel.innerHTML='<p class="counter-kicker">ENTREGA DIGITAL</p><h2>Revisa los archivos que recibirá el cliente</h2><p class="counter-help">Esta salida prepara archivos individuales en píxeles, sin añadir papel, guías ni rótulos de impresión. Los límites del trámite deben confirmarse con su institución.</p><div id="digitalFiles" class="digital-files"></div><div class="document-options"><label>Formato<select id="digitalFormat"><option value="jpg">JPG</option><option value="png">PNG</option><option value="pdf">PDF individual</option></select></label><label>Lado mayor<select id="digitalPixels"><option value="original">Resolución procesada</option><option value="1920" selected>Hasta 1920 px</option><option value="1200">Hasta 1200 px</option><option value="600">Hasta 600 px</option></select></label><label>Peso máximo<select id="digitalBytes"><option value="0">Sin límite adicional</option><option value="250000">Menos de 250 KB</option><option value="500000">Menos de 500 KB</option><option value="1000000">Menos de 1 MB</option><option value="2000000">Menos de 2 MB</option></select></label></div><p class="counter-help">La compresión se aplica solo al archivo de entrega; conserva la imagen recibida. PNG no se convierte silenciosamente a JPG. El QR admite hasta 6 MB por archivo.</p><div class="document-actions"><button type="button" id="digitalDownload">Descargar entrega</button><button type="button" id="digitalQr">Entregar por QR</button><button type="button" id="digitalAlsoPrint">También necesito imprimir</button></div><p id="digitalStatus" role="status" class="counter-help"></p>';
    $('colStageWorkspace').after(panel);$('digitalDownload').onclick=download;$('digitalQr').onclick=openQr;$('digitalAlsoPrint').onclick=()=>{RealScanCounter.setOutput('both');setMobileStep(1);};render();
  });
  root.RealScanDigital={render};
})(window);
