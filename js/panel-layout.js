/* Keep daily controls together. Native disclosures retain keyboard navigation. */
(function(root){
  'use strict';
  const $=id=>document.getElementById(id);
  let mounted=false,attempts=0;
  function disclosure(id,label,element){
    const details=document.createElement('details');
    details.id=id;details.className='panel-disclosure';
    const summary=document.createElement('summary');summary.textContent=label;
    element.before(details);details.append(summary,element);return details;
  }
  function update(){
    if(!mounted)return;
    const favorites=$('studioFavorites');
    if(favorites&&favorites.parentElement!==$('deskTools'))$('deskTools').append(favorites);
    const doc=root.RealScanDocuments?.status().active;
    $('sheetFinishPanel').hidden=!!doc;
    const active=[];
    if(!state.hideSheetTitle&&(state.includeDocLabels!==false||(state.documentCustomTitle||'').trim()))active.push('Título');
    if(state.includeDocLabels!==false)active.push('Rótulos');
    if(state.includeRulerFooter!==false)active.push('Regla');
    if(state.includeCutMarks!==false)active.push('Marcas');
    const summary=active.length?active.join(' · '):'Sin elementos auxiliares';
    $('sheetFinishSummary').textContent=summary+(state.duplicateCard&&state.format==='card'?' · 2 juegos':'');
    $('sheetFinishPanel').dataset.clean=String(!active.length);
    for(const id of ['btnQuickOfficialClean','btnQuickStandardChecked'])$(id).setAttribute('aria-pressed',String(id==='btnQuickOfficialClean'?!active.length:state.includeDocLabels!==false&&state.includeRulerFooter!==false&&state.includeCutMarks!==false));
  }
  function mount(){
    if(mounted||!$('colControlPanel'))return;
    const flow=$('serviceFlow'),finish=$('sheetFinishPanel'),desk=$('deskStart'),presets=$('deskPresets'),annotations=$('annotationOptions'),position=document.querySelector('.workbench-finishing');
    if(!flow||!finish||!desk||!presets||!annotations||!position){if(++attempts<100)setTimeout(mount,10);return;}
    document.body.classList.add('rs-panels');
    const shortcuts=desk.querySelector('.desk-shortcuts');
    const tools=disclosure('deskTools','Historial, formatos y herramientas',shortcuts);
    tools.append(presets,$('studioFavorites'));
    const capture=$('captureFirstOpen');$('deskReceive').after(capture);
    capture.querySelector('strong').textContent='Capturar primero';
    capture.querySelector('small').textContent='Elige el servicio después de revisar la imagen.';
    $('deskReceive').querySelector('#operatorReceiveActions').children[2].lastChild.textContent='Celular';
    $('studioWelcome').querySelector('h1').textContent='Tipo de trabajo';
    const hint=finish.nextElementSibling;
    if(hint?.textContent.includes('Escala: 100%')){hint.classList.add('sheet-print-hint');$('sheetFinishBody').append(hint);}
    flow.append(finish);
    const positions=disclosure('sheetPositionOptions','Posición y encabezado',position);
    flow.append(positions,$('annotationTools'));
    annotations.open=false;
    $('flowHeading').after($('counterService'));
    const slot=$('dropzoneFront').closest('section');slot.classList.add('panel-slot-editor');
    slot.querySelector('h2').textContent='Imágenes y ajustes por cara';
    const card=document.querySelector('#colStageWorkspace .stage-canvas-area').closest('section');card.classList.add('panel-sheet-preview');
    document.querySelector('#colStageWorkspace .stage-canvas-area').parentElement.classList.add('sheet-preview-mat');
    $('previewDimensionsTag').parentElement.id='sheetPreviewControls';
    $('previewSheetBadgeTag').parentElement.classList.add('sheet-review-caption');
    const fit=document.querySelector('.sheet-zoom-btn[data-sheet-zoom="fit"]');fit.textContent='Hoja completa';fit.title='Ajustar la vista; no cambia el tamaño impreso.';
    mounted=true;update();root.RealScanPanelLayout={update};
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,70));
  for(const event of ['realscan:studio-updated','realscan:document-updated','change','input','click'])document.addEventListener(event,update);
})(window);
