/* Enhance the 3.16 review without replacing PDF, passport, approval or sharing. */
(function(){
  'use strict';
  const baseReview=window.showPrintReview;
  let sequence=0;
  window.showPrintReview=async function(callback,options){
    const opts=options||{}, session=++sequence;
    baseReview(callback,opts);
    const modal=$('outputReviewModal'),button=$('confirmPrintReview');
    modal.firstElementChild.classList.add('print-review-dialog');
    const title=$('outputReviewTitle');title.tabIndex=-1;title.focus({preventScroll:true});modal.firstElementChild.scrollTop=0;
    if(!$('printSheetPreview')){
      const preview=document.createElement('div');preview.id='printSheetPreview';preview.className='print-sheet-preview';preview.setAttribute('aria-label','Vista previa de todas las hojas');$('printReview').before(preview);
      const feedback=document.createElement('div');feedback.innerHTML='<div id="printReviewIssues" role="status"></div><label id="printMissingConsentRow" class="counter-check" hidden><input id="printMissingConsent" type="checkbox"><span>Imprimir solo las caras cargadas, dejando los espacios faltantes vacíos.</span></label><p id="printReadyStatus" role="status" aria-live="polite" class="counter-help"></p>';
      button.parentElement.before(feedback);
      button.parentElement.classList.add('print-review-actions');
      const pdf=document.createElement('button');pdf.id='printReviewPdf';pdf.type='button';pdf.className='counter-secondary';pdf.textContent='Guardar PDF';button.before(pdf);
    }
    $('printReviewPdf').hidden=opts.mode==='pdf';
    $('printReviewPdf').onclick=()=>{closeModal('outputReviewModal');handleExportPDF(false,true);};
    let refreshId=0;
    async function refresh(){
      const refresh=++refreshId;
      button.disabled=true;button.textContent='Preparando hoja…';
      $('printReadyStatus').textContent='Preparando la hoja mientras la revisas…';
      $('printSheetPreview').replaceChildren();
      if(!await waitForProcessingComplete()){$('printReadyStatus').textContent='La imagen sigue en preparación. Vuelve a corregir para reintentar.';return;}
      if(sequence!==session||refresh!==refreshId)return;
      const checks=runPreflightChecks(),fatal=checks.issues.filter(i=>i.type==='error'&&i.code!=='MISSING_SLOT');
      const missing=checks.issues.some(i=>i.code==='MISSING_SLOT');
      $('printReviewIssues').replaceChildren();
      for(const issue of checks.issues){const p=document.createElement('p');p.className='output-review-warning';p.textContent=issue.message;$('printReviewIssues').append(p);}
      const requireConsent=missing&&opts.mode!=='pdf';
      $('printMissingConsentRow').hidden=!requireConsent;$('printMissingConsent').checked=false;
      if(fatal.length){button.textContent='Corrige los avisos';$('printReadyStatus').textContent='Vuelve a corregir el trabajo antes de continuar.';return;}
      try{
        const entry=await RealScanPrint.prepare();
        if(sequence!==session||refresh!==refreshId)return;
        RealScanPrint.preview($('printSheetPreview'),entry);
        const update=()=>{button.disabled=requireConsent&&!$('printMissingConsent').checked;};
        $('printMissingConsent').onchange=update;update();
        button.textContent=opts.confirmLabel||(opts.mode==='pdf'?'Guardar PDF':'Imprimir');
        $('printReadyStatus').textContent='Hoja lista · '+entry.layout.paper.shortName+' · Tamaño real / 100 %. Desactiva encabezados y pies del navegador.';
        if(entry.profile)$('printReadyStatus').textContent+=' Perfil: '+entry.profile.name+'.';
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
    modal._profileSheet=e=>{if(e.target.matches('.output-review-profile select'))refresh();};
    modal.addEventListener('change',modal._profileSheet);
    await refresh();
  };
})();
