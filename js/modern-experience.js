/* Shared presentation for the counter and the local mobile scanner. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id);
 function choice(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
 function counter(){
  if(!$('workbenchHeader')||!root.RealScanServiceFlow)return;
  document.body.classList.add('rs-modern');
  $('studioWelcome').querySelector('h1').textContent='¿Qué preparamos hoy?';
  $('studioWelcome').querySelector('.studio-eyebrow').textContent='UN SERVICIO. UN RESULTADO CLARO.';
  $('workbenchBar').querySelector('strong').textContent='Tu mostrador, en orden.';
  const captions={id:['01','Identificaciones','Frente y reverso, a tamaño real'],photos:['02','Fotografías','Elige tamaño, cantidad y papel'],document:['03','Documentos','Organiza, revisa y entrega']};
  for(const b of document.querySelectorAll('.studio-services [data-task]')){
   const [number,label,help]=captions[b.dataset.task];b.querySelector('strong').textContent=label;b.querySelector('small').textContent=help;
   const n=document.createElement('span');n.className='modern-service-number';n.textContent=number;n.setAttribute('aria-hidden','true');b.prepend(n);
  }
  // These shortcuts dispatch the original control, so previews and printed measures stay shared.
  const papers=document.createElement('div');papers.className='modern-paper-choices';papers.id='modernPaperChoices';papers.setAttribute('role','group');papers.setAttribute('aria-label','Papel de uso frecuente');
  for(const [value,label]of [['a4','A4'],['letter','Carta'],['photo_10x15','10 × 15 cm']]){
   if(![...$('quickPaper').options].some(o=>o.value===value))continue;
   const b=choice(label,()=>{const input=$('quickPaper');if(input.disabled||b.disabled)return;input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));});b.dataset.modernPaper=value;papers.append(b);
  }
  $('quickPaper').closest('label').before(papers);
  const templates=document.createElement('div');templates.id='modernHeaderTemplates';templates.className='modern-header-templates';templates.setAttribute('role','group');templates.setAttribute('aria-label','Plantillas de encabezado');
  for(const [key,title,text]of [['none','Sin encabezado',''],['archive','Para archivo','Copia para archivo'],['procedure','Para trámite','Copia para trámite']]){
   const b=choice('',()=>{if(b.disabled)return;const input=$('workbenchHeaderText'),check=$('workbenchHeaderEnabled');input.value=text;check.checked=key!=='none';check.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});b.dataset.modernHeader=key;
   const sheet=document.createElement('span');sheet.className='modern-header-sheet';sheet.setAttribute('aria-hidden','true');const heading=document.createElement('span');heading.textContent=text;sheet.append(heading);b.append(sheet,document.createTextNode(title));templates.append(b);
  }
  $('workbenchHeader').querySelector('summary').after(templates);
  const note=document.createElement('p');note.className='modern-header-note';note.textContent='Elige una base y personaliza el texto. Se aplica al PDF y a la impresión.';templates.after(note);
  let queued=false;
  function update(){
   queued=false;const doc=root.RealScanDocuments.status(),allowed=$('loginOverlay').classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden')),busy=doc.active?doc.busy:RealScanWorkflow.describe().busy;
   for(const b of papers.children){b.setAttribute('aria-pressed',String(b.dataset.modernPaper===$('quickPaper').value));b.disabled=!allowed||busy||$('quickPaper').disabled;}
   const enabled=$('workbenchHeaderEnabled').checked,text=$('workbenchHeaderText').value;
   for(const b of templates.children){const key=b.dataset.modernHeader;b.setAttribute('aria-pressed',String(key==='none'?!enabled:enabled&&text===(key==='archive'?'Copia para archivo':'Copia para trámite')));b.disabled=!allowed||busy;}
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(update);}}
  document.addEventListener('realscan:studio-updated',schedule);document.addEventListener('realscan:document-updated',schedule);document.addEventListener('change',schedule);
  new MutationObserver(schedule).observe($('loginOverlay'),{attributes:true,attributeFilter:['class']});update();
  root.RealScanModern={update};
 }
 function init(){if(document.body.classList.contains('mobile-experience')){document.body.classList.add('rs-modern-mobile');return;}counter();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,10));else setTimeout(init,10);
})(window);
