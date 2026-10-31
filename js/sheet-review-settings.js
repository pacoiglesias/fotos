/* Shared sheet controls. Mutations are committed by the owning review, never by a preview copy. */
(function(root){'use strict';
 function mount(target,change){
  const doc=root.RealScanDocuments.status(),settings=doc.active?doc.options:root.state;
  const panel=document.createElement('section');panel.className='sheet-review-settings';panel.setAttribute('aria-label','Ajustar esta hoja');
  const heading=document.createElement('h3');heading.textContent='Ajustar esta hoja';panel.append(heading);
  let grid;function group(title){const section=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=title;section.className='sheet-review-group';grid=document.createElement('div');grid.className='sheet-review-settings-grid';section.append(legend,grid);panel.append(section);}group('Hoja');
  function field(label,kind,value,key,apply){const row=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input');name.textContent=label;input.type=kind;input.dataset.sheetSetting=key;input.setAttribute('aria-label',label);if(kind==='checkbox')input.checked=!!value;else input.value=value??'';if(kind==='number'){input.min=0;input.max=25;input.step=1;}if(kind==='text')input.maxLength=48;input.onchange=()=>change(()=>apply(kind==='checkbox'?input.checked:kind==='number'?Math.max(0,Math.min(25,Number(input.value)||0)):input.value));row.append(name,input);grid.append(row);return input;}
  function choose(label,key,values,value,apply){const row=document.createElement('label'),name=document.createElement('span'),input=document.createElement('select');name.textContent=label;input.dataset.sheetSetting=key;input.setAttribute('aria-label',label);for(const [id,text]of values)input.append(new Option(text,id));input.value=String(value);input.onchange=()=>change(()=>apply(input.value));row.append(name,input);grid.append(row);}
  const papers=Object.entries(root.PAPER_SPECS).filter(([id])=>doc.active?['a4','letter','oficio','legal'].includes(id):true).map(([id,spec])=>[id,spec.shortName]);choose('Papel de salida','paper',papers,doc.active?settings.paper:settings.paperSize,v=>doc.active?root.RealScanDocuments.setOptions({paper:v}):root.setPaperSize(v,true));
  if(!doc.active&&settings.activeCategory!=='photos'&&settings.format==='card')choose('Caras de la identificación','sides',[['single','Solo frente'],['both','Ambas juntas'],['both_separate','Una cara por hoja']],settings.printMode,root.setPrintMode);
  choose('Juegos completos','sets',Array.from({length:10},(_,i)=>[String(i+1),String(i+1)]),doc.active?settings.sets:settings.outputSets||1,v=>doc.active?root.RealScanDocuments.setOptions({sets:Number(v)}):settings.outputSets=Number(v));
  if(doc.active){
   field('Margen (mm)','number',settings.margin,'margin',v=>root.RealScanDocuments.setOptions({margin:v}));
   group('Encabezado');field('Mostrar encabezado','checkbox',settings.headerEnabled,'header',v=>root.RealScanDocuments.setOptions({headerEnabled:v}));
   field('Texto del encabezado','text',settings.headerText,'title',v=>root.RealScanDocuments.setOptions({headerText:v,headerEnabled:!!v}));
  }else{
   const automatic=settings.sheetMarginMm==null;
   field('Margen automático','checkbox',automatic,'automatic',v=>{settings.sheetMarginMm=v?null:12;});
   const margin=field('Margen mínimo (mm)','number',automatic?12:settings.sheetMarginMm,'margin',v=>{settings.sheetMarginMm=v;});margin.disabled=automatic;
   field('Mostrar encabezado','checkbox',!settings.hideSheetTitle,'header',v=>{settings.hideSheetTitle=!v;});
   field('Texto del encabezado','text',settings.documentCustomTitle,'title',v=>{settings.documentCustomTitle=v;settings.hideSheetTitle=!v;});
   group('Acabado');field('Líneas de corte','checkbox',settings.includeCutMarks!==false,'cuts',v=>{settings.includeCutMarks=v;});
   field('Rótulos de las caras','checkbox',settings.includeDocLabels!==false,'labels',v=>{settings.includeDocLabels=v;});
   field('Regla de medida','checkbox',settings.includeRulerFooter!==false,'ruler',v=>{settings.includeRulerFooter=v;});
  }
  const hint=document.createElement('p');hint.textContent=doc.active?'El contenido se encaja sin deformarlo. El original se conserva.':'Las fotos y tarjetas conservan sus medidas. Si no caben con estos márgenes, revisa el aviso antes de continuar.';panel.append(hint);target.append(panel);return panel;
 }
 root.RealScanSheetSettings={mount};
})(window);
