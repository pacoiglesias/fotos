/* Enhance the 3.16 review without replacing PDF, passport, approval or sharing. */
(function(){
  'use strict';
  const baseReview=window.showPrintReview;
  let sequence=0;
  function arrangeReview(){
    const target=$('printReview');
    if(!$('printReviewWorkspace')){
      const workspace=document.createElement('div');workspace.id='printReviewWorkspace';target.before(workspace);
      const controls=document.createElement('section');controls.className='review-adjustments';controls.setAttribute('aria-label','Opciones de la hoja');controls.append(target);
      const view=document.createElement('section');view.className='review-preview-column';view.setAttribute('aria-label','Resultado preparado');
      const toolbar=document.createElement('div');toolbar.className='review-preview-toolbar';toolbar.innerHTML='<strong>Así saldrá tu trabajo</strong><div role="group" aria-label="Ampliación de la vista"><button type="button" data-review-zoom="fit" aria-pressed="true">Hoja completa</button><button type="button" data-review-zoom="detail" aria-pressed="false">Ampliar detalle</button></div>';
      for(const b of toolbar.querySelectorAll('[data-review-zoom]'))b.onclick=()=>{$('printSheetPreview').dataset.zoom=b.dataset.reviewZoom;for(const item of toolbar.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item===b));};
      const hint=document.createElement('p');hint.className='review-preview-hint';hint.textContent='La ampliación cambia solo esta vista. Las medidas del archivo se conservan.';
      for(const b of toolbar.querySelectorAll('[data-review-zoom]'))b.addEventListener('click',()=>{hint.textContent=b.dataset.reviewZoom==='detail'?'Desplázate por la hoja ampliada para revisar el detalle. El archivo no cambia.':'La ampliación cambia solo esta vista. Las medidas del archivo se conservan.';});
      view.append(toolbar,$('printSheetPreview'),hint);workspace.append(view,controls);
      const formats=document.createElement('details');formats.id='printReviewFormats';const formatTitle=document.createElement('summary');formatTitle.textContent='Formato pasaporte · hoja de 4 o 6';formats.append(formatTitle,$('reviewPassportRow'));controls.append(formats);
      const other=$('btnReviewClient')?.parentElement;if(other){const more=document.createElement('details');more.id='printReviewMoreActions';const title=document.createElement('summary');title.textContent='Más acciones · cliente, compartir y dúplex';other.before(more);more.append(title,other);}
    }
    $('printReviewFormats').hidden=state.activeCategory!=='photos';
    $('printSheetPreview').dataset.zoom='fit';for(const b of document.querySelectorAll('[data-review-zoom]'))b.setAttribute('aria-pressed',String(b.dataset.reviewZoom==='fit'));
  }
  window.showPrintReview=async function(callback,options){
    const opts=options||{}, session=++sequence;
    baseReview(callback,opts);
    const modal=$('outputReviewModal'),button=$('confirmPrintReview');
    modal.firstElementChild.classList.add('print-review-dialog');
    const title=$('outputReviewTitle');title.tabIndex=-1;title.focus({preventScroll:true});modal.firstElementChild.scrollTop=0;
    if(!$('printSheetPreview')){
      const preview=document.createElement('div');preview.id='printSheetPreview';preview.className='print-sheet-preview';preview.setAttribute('aria-label','Vista previa de todas las hojas');$('printReview').before(preview);
      const feedback=document.createElement('div');feedback.innerHTML='<div id="printReviewIssues" role="status"></div><label id="printMissingConsentRow" class="counter-check" hidden><input id="printMissingConsent" type="checkbox"><span>Imprimir solo las caras cargadas, dejando los espacios faltantes vacíos.</span></label><p id="printReadyStatus" role="status" aria-live="polite" class="counter-help"></p><p id="printPrinterNotice" class="review-printer-notice"></p>';
      button.parentElement.before(feedback);
      button.parentElement.classList.add('print-review-actions');
      const pdf=document.createElement('button');pdf.id='printReviewPdf';pdf.type='button';pdf.className='counter-secondary';pdf.textContent='Guardar PDF';button.before(pdf);
    }
    arrangeReview();
    $('printReviewPdf').hidden=opts.mode==='pdf';
    $('printReviewPdf').onclick=()=>{closeModal('outputReviewModal');handleExportPDF(false,true);};
    let refreshId=0;
    async function refresh(){
      const refresh=++refreshId;
      button.disabled=true;button.textContent='Preparando hoja…';
      $('printReviewPdf').disabled=true;
      $('printReadyStatus').textContent='Preparando la hoja mientras la revisas…';
      $('printPrinterNotice').textContent='';
      $('printSheetPreview').replaceChildren();
      if(!await waitForProcessingComplete()){$('printReadyStatus').textContent='La imagen sigue en preparación. Vuelve a corregir para reintentar.';return;}
      if(sequence!==session||refresh!==refreshId)return;
      const checks=runPreflightChecks(),fatal=checks.issues.filter(i=>i.type==='error'&&i.code!=='MISSING_SLOT');
      const missing=checks.issues.some(i=>i.code==='MISSING_SLOT');
      $('printReviewIssues').replaceChildren();
      for(const issue of checks.issues){const p=document.createElement('p');p.className='output-review-warning';p.textContent=issue.message;$('printReviewIssues').append(p);}
      const requireConsent=missing&&opts.mode!=='pdf';
      $('printMissingConsentRow').hidden=!requireConsent;$('printMissingConsent').checked=false;
      if(fatal.length||(missing&&opts.mode==='pdf')){button.textContent=missing&&opts.mode==='pdf'?'Completa las caras':'Corrige los avisos';$('printReadyStatus').textContent=missing&&opts.mode==='pdf'?'Agrega la cara pendiente o elige Solo frente antes de descargar.':'Vuelve a corregir el trabajo antes de continuar.';return;}
      try{
        const entry=await RealScanPrint.prepare();
        if(sequence!==session||refresh!==refreshId)return;
        RealScanPrint.preview($('printSheetPreview'),entry);
        const update=()=>{button.disabled=requireConsent&&!$('printMissingConsent').checked;};
        $('printMissingConsent').onchange=update;update();
        $('printReviewPdf').disabled=missing;
        button.textContent=opts.confirmLabel||(opts.mode==='pdf'?'Guardar PDF':'Imprimir');
        const scale=Number(state.outputScalePercent)||100;
        $('printReadyStatus').textContent='Hoja lista · '+entry.layout.paper.shortName+' · '+(scale===100?'Contenido a tamaño real.':'Contenido al '+scale+' %.')+' Al imprimir: 100 %, 1 copia, sin encabezados ni pies.';
        const verified=!!entry.profile&&!!window.RealScanPrinterProfiles?.isVerified?.(entry.profile);
        $('printPrinterNotice').dataset.verified=String(verified);$('printPrinterNotice').textContent=verified?'Perfil '+entry.profile.name+' · medición registrada por el operador.':(entry.profile?'Perfil '+entry.profile.name+' sin medición registrada.':'Sin perfil de corrección.')+' Comprueba las medidas de la primera impresión.';
        button.onclick=()=>{if(button.disabled)return;if(!RealScanPrint.isPrepared()){refresh();return;}button.disabled=true;closeModal('outputReviewModal');callback();};
      }catch(error){
        if(sequence!==session||refresh!==refreshId)return;
        button.textContent='Reintentar';button.disabled=false;button.onclick=refresh;
        $('printReadyStatus').textContent=error.message+' Puedes volver a corregir o descargar el PDF desde la hoja.';
      }
    }
    if(modal._refreshSheet)modal.removeEventListener('click',modal._refreshSheet);
    modal._refreshSheet=e=>{if(e.target.closest('[data-passport-count]'))refresh();};
    modal.addEventListener('click',modal._refreshSheet);
    if(modal._profileSheet)modal.removeEventListener('change',modal._profileSheet);
    modal._profileSheet=e=>{if(e.target.matches('.output-review-profile select, .review-edit-options select'))refresh();};
    modal.addEventListener('change',modal._profileSheet);
    if(modal._settingsSheet)modal.removeEventListener('realscan:sheet-settings-updated',modal._settingsSheet);
    modal._settingsSheet=()=>refresh();modal.addEventListener('realscan:sheet-settings-updated',modal._settingsSheet);
    await refresh();
  };
})();
