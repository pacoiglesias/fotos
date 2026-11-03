/* Shared sheet controls. Mutations are committed by the owning review, never by a preview copy. */
(function(root){'use strict';
 const keys=['paperSize','printMode','sheetLayout','documentPageCount','outputSets','photoCopies','photoCopiesPersonA','photoCopiesPersonB','mixTwoPhotos','sheetMarginMm','hideSheetTitle','documentCustomTitle','includeCutMarks','includeDocLabels','includeRulerFooter','sheetPosition','outputScalePercent','photoPack'];
 let histories=new WeakMap();const contexts=new Set();
 const jobKey=()=>[root.state?._jobRevision,root.state?.activeCategory,root.state?.format,!!root.RealScanDocuments?.status().active].join(':');
 const capture=()=>Object.fromEntries(keys.map(key=>[key,root.state[key]]));
 function release(target){const context=histories.get(target);if(context){context.past.length=context.future.length=0;contexts.delete(context);histories.delete(target);}}
 function contextFor(target){let ctx=histories.get(target);if(!ctx||ctx.key!==jobKey()){release(target);ctx={key:jobKey(),past:[],future:[],advanced:false};histories.set(target,ctx);contexts.add(ctx);if(contexts.size>12){const oldest=contexts.values().next().value;oldest.past.length=oldest.future.length=0;contexts.delete(oldest);}}return ctx;}
 function mount(target,change){
  const doc=root.RealScanDocuments.status(),settings=doc.active?doc.options:root.state;
  const ctx=contextFor(target),commit=change;
  if(!doc.active)change=mutate=>commit(()=>{if(ctx.key!==jobKey())return;const before=capture();mutate();if(JSON.stringify(before)!==JSON.stringify(capture())){ctx.past.push(before);if(ctx.past.length>20)ctx.past.shift();ctx.future.length=0;}});
  const panel=document.createElement('section');panel.className='sheet-review-settings';panel.setAttribute('aria-label','Ajustar esta hoja');
  const heading=document.createElement('h3');heading.textContent='Ajustar esta hoja';panel.append(heading);
  if(!doc.active){const actions=document.createElement('div');actions.className='sheet-review-history';for(const [kind,label,from,to]of [['undo','Deshacer ajuste',ctx.past,ctx.future],['redo','Rehacer ajuste',ctx.future,ctx.past]]){const b=document.createElement('button');b.type='button';b.dataset.sheetHistory=kind;b.dataset.historyEnabled=String(!!from.length);b.textContent=label;b.disabled=!from.length;b.onclick=()=>{if(ctx.key!==jobKey()||!from.length)return;commit(()=>{const current=capture(),saved=from.pop();to.push(current);for(const key of keys)root.state[key]=saved[key];root.setPaperSize(saved.paperSize,true);root.setPrintMode(saved.printMode);});};actions.append(b);}panel.append(actions);}
  if(!doc.active){
   const presets=document.createElement('div');presets.className='sheet-review-presets';presets.setAttribute('role','group');presets.setAttribute('aria-label','Acabado rápido');
   for(const [key,label]of [['clean','Hoja limpia'],['guides','Con guías']]){const b=document.createElement('button');b.type='button';b.dataset.sheetPreset=key;b.textContent=label;b.setAttribute('aria-pressed',String(key==='clean'?settings.hideSheetTitle&&settings.includeDocLabels===false&&settings.includeRulerFooter===false&&settings.includeCutMarks===false:settings.includeDocLabels!==false&&settings.includeRulerFooter!==false&&settings.includeCutMarks!==false));b.onclick=()=>change(()=>{const clean=key==='clean';settings.hideSheetTitle=clean;settings.includeDocLabels=settings.includeRulerFooter=settings.includeCutMarks=!clean;if(clean)settings.documentCustomTitle='';});presets.append(b);}panel.append(presets);
  }
  let grid;function group(title){const section=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=title;section.className='sheet-review-group';grid=document.createElement('div');grid.className='sheet-review-settings-grid';section.append(legend,grid);panel.append(section);}group('Hoja');
  function field(label,kind,value,key,apply,limits={min:0,max:25}){const row=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input');name.textContent=label;input.type=kind;input.dataset.sheetSetting=key;input.setAttribute('aria-label',label);if(kind==='checkbox')input.checked=!!value;else input.value=value??'';if(kind==='number'){input.min=limits.min;input.max=limits.max;input.step=1;}if(kind==='text')input.maxLength=48;input.onchange=()=>change(()=>apply(kind==='checkbox'?input.checked:kind==='number'?Math.max(limits.min,Math.min(limits.max,Number(input.value)||0)):input.value));row.append(name,input);grid.append(row);return input;}
  function choose(label,key,values,value,apply){const row=document.createElement('label'),name=document.createElement('span'),input=document.createElement('select');name.textContent=label;input.dataset.sheetSetting=key;input.setAttribute('aria-label',label);for(const [id,text]of values)input.append(new Option(text,id));input.value=String(value);input.onchange=()=>change(()=>apply(input.value));row.append(name,input);grid.append(row);}
  const papers=Object.entries(root.PAPER_SPECS).filter(([id])=>doc.active?['a4','letter','oficio','legal'].includes(id):true).map(([id,spec])=>[id,spec.shortName]);choose('Papel de salida','paper',papers,doc.active?settings.paper:settings.paperSize,v=>doc.active?root.RealScanDocuments.setOptions({paper:v}):root.setPaperSize(v,true));
  if(!doc.active&&settings.activeCategory!=='photos'&&settings.format==='card')choose('Caras de la identificación','sides',[['single','Solo frente'],['both','Ambas juntas'],['both_separate','Una cara por hoja']],settings.printMode,root.setPrintMode);
  choose('Juegos completos','sets',Array.from({length:10},(_,i)=>[String(i+1),String(i+1)]),doc.active?settings.sets:settings.outputSets||1,v=>doc.active?root.RealScanDocuments.setOptions({sets:Number(v)}):settings.outputSets=Number(v));
  if(!doc.active&&settings.activeCategory==='photos'){
   if(settings.mixTwoPhotos){for(const [person,key]of [['A','photoCopiesPersonA'],['B','photoCopiesPersonB']])field('Fotos de persona '+person,'number',settings[key]||0,'copies'+person,v=>root.setIndependentPhotoCopies(person,v),{min:0,max:48});}
   else field('Fotos por juego','number',settings.photoCopies||1,'copies',v=>root.setPhotoCopies(v),{min:1,max:48});
  }
  if(doc.active){
   field('Margen (mm)','number',settings.margin,'margin',v=>root.RealScanDocuments.setOptions({margin:v}));
   group('Encabezado');field('Mostrar encabezado','checkbox',settings.headerEnabled,'header',v=>root.RealScanDocuments.setOptions({headerEnabled:v}));
   field('Texto del encabezado','text',settings.headerText,'title',v=>root.RealScanDocuments.setOptions({headerText:v,headerEnabled:!!v}));
  }else{
   const automatic=settings.sheetMarginMm==null;
   field('Margen automático','checkbox',automatic,'automatic',v=>{settings.sheetMarginMm=v?null:12;});
   const margin=field('Margen mínimo (mm)','number',automatic?'':settings.sheetMarginMm,'margin',v=>{settings.sheetMarginMm=v;});margin.placeholder='Automático';margin.disabled=automatic;
   group('Encabezado');
   field('Mostrar encabezado','checkbox',!settings.hideSheetTitle,'header',v=>{settings.hideSheetTitle=!v;});
   field('Texto del encabezado','text',settings.documentCustomTitle,'title',v=>{settings.documentCustomTitle=v;settings.hideSheetTitle=!v;});
   group('Acabado');field('Líneas de corte','checkbox',settings.includeCutMarks!==false,'cuts',v=>{settings.includeCutMarks=v;});
   field('Rótulos de las caras','checkbox',settings.includeDocLabels!==false,'labels',v=>{settings.includeDocLabels=v;});
   field('Regla de medida','checkbox',settings.includeRulerFooter!==false,'ruler',v=>{settings.includeRulerFooter=v;});
  }
  group('Distribución');
  choose('Posición en la hoja','position',[['center','Centrada'],['top','Arriba'],['compact','Junto al margen']],settings.position||settings.sheetPosition||'center',v=>doc.active?root.RealScanDocuments.setOptions({position:v}):settings.sheetPosition=v);
  if(!doc.active){
   field('Escala del contenido (%)','number',settings.outputScalePercent||100,'scale',v=>root.setPrintScale(v),{min:25,max:200});
   if(Number(settings.outputScalePercent||100)!==100){const reset=document.createElement('button');reset.type='button';reset.dataset.sheetPreset='actual-size';reset.className='sheet-review-actual-size';reset.textContent='Restablecer tamaño real · 100 %';reset.onclick=()=>change(()=>root.setPrintScale(100));panel.append(reset);}
  }
  const map=document.createElement('section');map.className='sheet-map';map.setAttribute('aria-label','Colocar sobre la hoja');const label=document.createElement('strong');label.textContent='Coloca el contenido en la hoja';const positions=document.createElement('div');
  for(const [position,title]of [['top','Arriba'],['center','Centro'],['compact','Junto al margen']]){const button=document.createElement('button');button.type='button';button.dataset.sheetPlace=position;button.setAttribute('aria-pressed',String((settings.position||settings.sheetPosition||'center')===position));button.innerHTML='<svg viewBox="0 0 50 66" aria-hidden="true"><rect x="1" y="1" width="48" height="64" rx="3" fill="none" stroke="currentColor"/><rect x="'+(position==='compact'?6:13)+'" y="'+(position==='center'?23:7)+'" width="24" height="16" rx="2" fill="currentColor" opacity=".25"/></svg>';button.append(document.createTextNode(title));button.onclick=()=>change(()=>doc.active?root.RealScanDocuments.setOptions({position}):settings.sheetPosition=position);positions.append(button);}
  const marginLabel=document.createElement('label'),marginRange=document.createElement('input'),marginValue=doc.active?settings.margin:settings.sheetMarginMm; marginLabel.textContent='Margen sobre la hoja · '+(marginValue==null?'automático':marginValue+' mm');marginRange.type='range';marginRange.min=0;marginRange.max=25;marginRange.step=1;marginRange.value=marginValue??12;marginRange.dataset.sheetSetting='margin-map';marginRange.setAttribute('aria-label','Margen sobre la hoja en milímetros');marginRange.onchange=()=>change(()=>doc.active?root.RealScanDocuments.setOptions({margin:Number(marginRange.value)}):settings.sheetMarginMm=Number(marginRange.value));marginLabel.append(marginRange);map.append(label,positions,marginLabel);panel.append(map);
  root.RealScanCounterEvolution?.mountSheetMap(panel,settings,change,doc.active);
  const advanced=document.createElement('details'),summary=document.createElement('summary'),advancedGrid=document.createElement('div');advanced.className='sheet-review-advanced';advanced.open=ctx.advanced;summary.textContent='Opciones avanzadas · encabezado, rótulos y escala';advancedGrid.className='sheet-review-settings-grid';advanced.append(summary,advancedGrid);advanced.ontoggle=()=>{ctx.advanced=advanced.open;};
  for(const key of ['header','title','labels','ruler','scale']){const input=panel.querySelector('[data-sheet-setting="'+key+'"]');if(input)advancedGrid.append(input.closest('label'));}
  for(const group of [...panel.querySelectorAll('.sheet-review-group')])if(!group.querySelector('label'))group.remove();
  if(advancedGrid.children.length)panel.append(advanced);
  const hint=document.createElement('p');hint.textContent=doc.active?'El contenido se encaja sin deformarlo. El original se conserva.':'Las fotos y tarjetas conservan sus medidas. Si no caben con estos márgenes, revisa el aviso antes de continuar.';panel.append(hint);target.append(panel);return panel;
 }
 function clear(){for(const ctx of contexts){ctx.past.length=ctx.future.length=0;}contexts.clear();histories=new WeakMap();}
 document.addEventListener('realscan:auth-lock',clear);for(const event of ['realscan:studio-updated','realscan:document-updated'])document.addEventListener(event,()=>{for(const ctx of contexts)if(ctx.key!==jobKey()){ctx.past.length=ctx.future.length=0;contexts.delete(ctx);}});
 document.addEventListener('realscan:modal-closed',e=>{const id=e.detail?.id;if(id==='outputReviewModal')release(document.getElementById('printReview'));if(id==='documentPrintReview')release(document.getElementById('documentPrintSettings'));});
 root.RealScanSheetSettings={mount,release,clear};
})(window);
