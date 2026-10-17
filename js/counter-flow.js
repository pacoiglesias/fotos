/* Daily counter flow: a new customer is an explicit, reviewable transition. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  let starting = false;
  let output = 'both';
  const settings = ['activeCategory','format','paperSize','printMode','sheetLayout','documentPageCount','photoCopies','photoCopiesPersonA','photoCopiesPersonB','mixTwoPhotos','duplicateCard','includeRulerFooter','includeDocLabels','includeCutMarks','customWidth','customHeight','customUnit','passportOpenOrientation','passportPageOrientation'];
  function activeDelivery() {
    const s = window.RealScanQrSync?.getActiveDeliverySession();
    return s && !['revoked','expired'].includes(s.status) && Date.now() < s.expiresAt ? s : null;
  }
  function update() {
    if (!$('counterCurrent')) return;
    $('counterCurrent').textContent = getActiveSpec().shortName + ' · ' + ({print:'Impresión',digital:'Entrega digital',both:'Impresión y digital'}[output]);
    const delivery = activeDelivery();
    $('counterDelivery').hidden = !delivery;
    if (delivery) $('counterDeliveryText').textContent = (delivery.jobRevision === (state._jobRevision || 0) ? 'Entrega disponible' : 'Entrega anterior disponible') + ' · ' + Math.max(1,Math.ceil((delivery.expiresAt-Date.now())/60000)) + ' min. Mantén este puesto abierto.';
    $('counterDeliver').disabled = !RealScanWorkflow.describe().ready;
    $('counterDeliver').textContent = output === 'print' ? 'Revisar impresión' : 'Preparar entrega digital';
  }
  function openNewService() {
    if (starting) return;
    const delivery = activeDelivery();
    $('newKeepDeliveryRow').hidden = !delivery;
    $('newKeepDelivery').checked = true;
    $('newServiceKind').value = 'id';
    $('newServiceSource').value = 'choose';
    $('newServiceOutput').value = 'both';
    $('newServiceConfirm').checked = !Object.values(state.images).some(i=>i.originalSrc || i._reading) && !RealScanQrSync.getInboxFiles().length;
    $('newServiceError').textContent = '';
    openModal('newServiceModal');
  }
  async function start() {
    if (starting) return;
    if (!$('newServiceConfirm').checked) { $('newServiceError').textContent = 'Confirma que terminaste o guardaste el trabajo actual antes de limpiar sus imágenes.'; $('newServiceConfirm').focus(); return; }
    starting = true;
    $('newServiceStart').disabled = true;
    try {
      const kind = $('newServiceKind').value, source = $('newServiceSource').value, selectedOutput = $('newServiceOutput').value;
      const previous = Object.fromEntries(settings.map(key=>[key,state[key]]));
      const keepDelivery = !!activeDelivery() && $('newKeepDelivery').checked;
      prepareWorkspaceForJobSwitch({clearDraft:true,keepTitle:false,keepDelivery});
      const revision=state._jobRevision;
      await state._jobSwitchCleanup;
      if(revision!==state._jobRevision)return;
      const followSource=!$('newServiceModal').classList.contains('hidden');
      output = selectedOutput;
      if (kind === 'repeat') Object.assign(state,previous);
      else {
        Object.assign(state,{paperSize:'a4',photoCopies:4,photoCopiesPersonA:2,photoCopiesPersonB:2,includeRulerFooter:true,includeDocLabels:true,includeCutMarks:true,documentPageCount:2,sheetLayout:'same_page',printMode:'both',customWidth:8.5,customHeight:5.5,customUnit:'cm',passportOpenOrientation:'portrait',passportPageOrientation:'landscape'});
        $('inputCustomWidth').value=state.customWidth;$('inputCustomHeight').value=state.customHeight;
        switchIntent(kind);
      }
      $('inputCustomWidth').value=state.customWidth;$('inputCustomHeight').value=state.customHeight;
      $('btnUnitCm').classList.toggle('is-active',state.customUnit==='cm');$('btnUnitMm').classList.toggle('is-active',state.customUnit==='mm');
      switchCategory(state.activeCategory);
      if(state.activeCategory!=='photos')setDocumentPages(state.documentPageCount);
      document.querySelectorAll('.format-btn').forEach(b=>b.classList.toggle('is-active',b.dataset.format===state.format));
      $('chkMixTwoPhotos').checked=state.mixTwoPhotos;
      $('chkDuplicateCard').checked=state.duplicateCard;
      if(state.activeCategory==='photos')setMixTwoPhotos(state.mixTwoPhotos);
      setPaperSize(state.paperSize,true);
      savePreferences();
      updateUI();
      closeModal('newServiceModal');
      setMobileStep(source === 'choose' ? 1 : 2);
      window.RealScanDiagnostics?.record('counter.new-service','info',{service:kind,source,output,keepDelivery});
      if (source === 'qr' && followSource) $('btnOpenReceiveModal').click();
      else if (source === 'camera' && followSource) document.querySelector('[data-camera="front"]')?.click();
      else if (source === 'file') { setMobileStep(2); $('dropzoneFront').scrollIntoView({block:'start'}); $('dropzoneFront').focus(); showToast('Elige «Archivo» en la zona de carga. También puedes arrastrar o pegar una imagen.','info'); }
      else showToast('Nuevo servicio preparado. Elige el formato y continúa con la captura.','success');
    } catch(e) { $('newServiceError').textContent='No se pudo preparar el servicio. '+e.message; }
    finally {starting=false;$('newServiceStart').disabled=false;}
  }
  function showDelivery() {
    const delivery=activeDelivery();
    if (!delivery) {update();showToast('La entrega caducó. Prepara otra desde el trabajo actual.','warning');return;}
    $('pendingDeliverySummary').textContent = delivery.files.length+' archivo(s) · '+Math.max(1,Math.ceil((delivery.expiresAt-Date.now())/60000))+' min restantes. Este QR conserva la entrega ya generada; no incluye cambios posteriores.';
    RealScanQrSync.renderQrToCanvas(delivery.url,$('pendingDeliveryQr'));
    $('pendingDeliveryLink').href=delivery.url;
    openModal('pendingDeliveryModal');
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const container=document.createElement('div');
    container.innerHTML=`
      <div id="newServiceModal" class="hidden counter-overlay" role="dialog" aria-labelledby="newServiceTitle">
        <div class="counter-dialog"><div class="counter-dialog-heading"><div><p class="counter-kicker">ATENCIÓN EN MOSTRADOR</p><h2 id="newServiceTitle">Comienza con lo que necesita el cliente</h2></div><button type="button" data-close-modal="newServiceModal" aria-label="Cerrar">×</button></div>
          <p class="counter-help">Prepara el servicio antes de recibir sus archivos. Las imágenes actuales se limpiarán al continuar.</p>
          <label class="counter-field">1. ¿Qué servicio necesita?<select id="newServiceKind"><option value="id">Identificación · frente y reverso</option><option value="photos">Fotografías · elegir medida y copias</option><option value="multi">Pasaporte · páginas en hojas separadas</option><option value="custom">Medida personalizada</option><option value="repeat">Repetir la configuración actual con imágenes nuevas</option></select></label>
          <div class="counter-field-grid"><label class="counter-field">2. ¿Cómo recibes el archivo?<select id="newServiceSource"><option value="choose">Elegir después</option><option value="qr">Desde el celular del cliente por QR</option><option value="camera">Cámara de este dispositivo</option><option value="file">Archivo, USB o escáner</option></select></label>
          <label class="counter-field">3. ¿Cómo lo entregarás?<select id="newServiceOutput"><option value="both">Impresión y archivo digital</option><option value="print">Impresión</option><option value="digital">Archivo digital</option></select></label></div>
          <p class="counter-help">Cada servicio nuevo comienza en A4, escala 100 %, con guías y copias iniciales. «Repetir» conserva el formato y las opciones, sin conservar imágenes ni el nombre del cliente. El destino de entrega orienta el siguiente paso; puedes cambiarlo al finalizar.</p>
          <label id="newKeepDeliveryRow" class="counter-check"><input type="checkbox" id="newKeepDelivery" checked><span>Conservar el QR de descarga anterior hasta que caduque. Solo puede haber una entrega vigente por puesto; crear otra reemplaza la anterior.</span></label>
          <label class="counter-check"><input type="checkbox" id="newServiceConfirm"><span>Ya terminé o guardé el trabajo actual; puedo limpiar sus imágenes.</span></label>
          <p id="newServiceError" role="alert" class="counter-error"></p><div class="counter-dialog-actions"><button type="button" data-close-modal="newServiceModal" class="counter-secondary">Volver al trabajo</button><button type="button" id="newServiceStart" class="counter-primary">Preparar nuevo servicio</button></div>
        </div></div>
      <div id="counterMoreModal" class="hidden counter-overlay" role="dialog" aria-labelledby="counterMoreTitle"><div class="counter-dialog"><div class="counter-dialog-heading"><div><p class="counter-kicker">HERRAMIENTAS Y PREFERENCIAS</p><h2 id="counterMoreTitle">Todo lo demás, a mano</h2></div><button type="button" data-close-modal="counterMoreModal" aria-label="Cerrar">×</button></div><div id="counterTools" class="counter-menu"></div></div></div>
      <div id="pendingDeliveryModal" class="hidden counter-overlay" role="dialog" aria-labelledby="pendingDeliveryTitle"><div class="counter-dialog"><div class="counter-dialog-heading"><h2 id="pendingDeliveryTitle">QR de la entrega vigente</h2><button type="button" data-close-modal="pendingDeliveryModal" aria-label="Cerrar">×</button></div><p id="pendingDeliverySummary" class="counter-help"></p><canvas id="pendingDeliveryQr" class="counter-qr"></canvas><div class="counter-dialog-actions"><a id="pendingDeliveryLink" target="_blank" rel="noopener noreferrer" class="counter-secondary">Abrir descarga</a><button id="pendingDeliveryRevoke" type="button" class="counter-secondary">Finalizar esta entrega</button><button type="button" data-close-modal="pendingDeliveryModal" class="counter-primary">Volver al servicio</button></div></div></div>`;
    document.body.append(container);
    const strip=document.createElement('section');strip.id='counterService';strip.className='counter-service';strip.setAttribute('aria-label','Servicio actual');
    strip.innerHTML='<div><p class="counter-kicker">SERVICIO ACTUAL</p><strong id="counterCurrent"></strong><p class="counter-help">Un cliente, una revisión y una entrega clara.</p></div><div class="counter-service-actions"><button type="button" id="counterStart" class="counter-primary">＋ Nuevo servicio</button><button type="button" id="counterDeliver" class="counter-secondary" title="Carga las imágenes del trabajo para preparar su salida">Preparar entrega digital</button></div><div id="counterDelivery" class="counter-delivery" hidden><span id="counterDeliveryText"></span><button type="button" id="counterShowDelivery">Ver QR vigente</button></div>';
    $('workflowGuide').previousElementSibling.before(strip);
    const header=$('btnNewProject').parentElement;
    for (const id of ['btnInstallPwa','userBadge','btnThemeToggle','btnOpenPresets','btnOpenHistory','btnOpenSettings','btnLogout','btnIphoneHelp','btnScannerHelp']) {
      const button=$(id);if(!button)continue;
      $('counterTools').append(button);
      button.addEventListener('click',()=>closeModal('counterMoreModal'),{capture:true});
    }
    const more=document.createElement('button');more.id='counterMore';more.type='button';more.className='counter-header-more';more.textContent='Más opciones';more.setAttribute('aria-haspopup','dialog');more.onclick=()=>openModal('counterMoreModal');header.append(more);
    header.prepend($('btnNewProject'));
    const themeLabel=document.createElement('span');themeLabel.textContent='Tema claro / oscuro';$('btnThemeToggle').append(themeLabel);
    for(const [id,label] of [['btnNewProject','Nuevo servicio'],['btnOpenReceiveModal','Recibir por QR'],['btnOpenDeliveryModal','Entrega digital']]){const b=$(id);b.setAttribute('aria-label',label);b.lastElementChild.textContent=label;}
    $('counterStart').onclick=openNewService;$('newServiceStart').onclick=start;$('counterShowDelivery').onclick=showDelivery;
    $('counterDeliver').onclick=()=>{if(!RealScanWorkflow.describe().ready)return;if(output==='print')RealScanWorkflow.moveTo(3);else $('btnOpenDeliveryModal').click();};
    $('pendingDeliveryRevoke').onclick=async()=>{if(!confirm('¿El cliente ya descargó sus archivos? Este QR dejará de funcionar.'))return;try{await RealScanQrSync.revokeDeliverySession();closeModal('pendingDeliveryModal');update();}catch(e){showToast(e.message,'error');}};
    update();
  });
  setInterval(update,10000);
  window.RealScanCounter={openNewService,update};
})();
