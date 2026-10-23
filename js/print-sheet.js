/* Print the shared millimetre layout directly, without loading a PDF viewer. */
(function () {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  let cached = null, printing = false, releaseTimer;
  function snapshot() {
    const layout = RealScanLayout.computeDocumentLayout(state);
    const slots = [...new Set(layout.pages.flatMap(p => p.placements.map(i => i.slot)))];
    const profile=window.RealScanPrinterProfiles?.getActive() || null;
    return {layout, key: JSON.stringify([layout,profile]), profile, sources: slots.map(slot => [slot, state.images[slot]?.processedDataUrl || ''])};
  }
  function matches(a, b) {
    return a.key === b.key && a.sources.length === b.sources.length && a.sources.every(([slot, src], i) => slot === b.sources[i][0] && src === b.sources[i][1]);
  }
  function svgNode(name, attrs, text) {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function sheet(page, layout, images, profile) {
    const {widthMm:w, heightMm:h} = layout.paper;
    const svg = svgNode('svg', {xmlns:ns, viewBox:`0 0 ${w} ${h}`, width:w+'mm', height:h+'mm', role:'img', 'aria-label':'Hoja de impresión'});
    svg.append(svgNode('rect', {width:w,height:h,fill:'white'}));
    function text(value, x, y, size = 2.5, anchor = 'start') {
      svg.append(svgNode('text', {x,y,'font-size':size,'font-family':'Arial, sans-serif',fill:'#475569','text-anchor':anchor}, value));
    }
    function line(x1,y1,x2,y2) { svg.append(svgNode('line',{x1,y1,x2,y2,stroke:'#666','stroke-width':.22})); }
    if (!layout.isCleanSheet && page.sheetTitle) text(page.sheetTitle.toUpperCase(),w/2,12,3,'middle');
    for (const rawItem of page.placements) {
      const item=profile ? {...rawItem,xMm:rawItem.xMm*profile.scaleX/100+profile.offsetX,yMm:rawItem.yMm*profile.scaleY/100+profile.offsetY,widthMm:rawItem.widthMm*profile.scaleX/100,heightMm:rawItem.heightMm*profile.scaleY/100}:rawItem;
      const image = images[item.slot];
      if (image) {
        const box = RealScanLayout.imagePlacement(item,image.naturalWidth,image.naturalHeight);
        svg.append(svgNode('image',{href:image.src,x:box.x,y:box.y,width:box.w,height:box.h,preserveAspectRatio:'none'}));
      }
      const guide = RealScanLayout.cutGuideGeometry(item);
      const attrs = {fill:'none',stroke:'#666','stroke-width':.22,'stroke-dasharray':'1.5 1.5'};
      if (guide.oval) svg.append(svgNode('ellipse',{...attrs,cx:guide.x+guide.w/2,cy:guide.y+guide.h/2,rx:guide.w/2,ry:guide.h/2}));
      else if (guide.border) svg.append(svgNode('rect',{...attrs,x:guide.x,y:guide.y,width:guide.w,height:guide.h}));
      guide.lines.forEach(points => line(...points));
      if (item.label) text(item.label,item.xMm,item.yMm-2.5);
    }
    if (page.hasRuler) {
      const x=(w-50)/2, y=h-35;
      line(x,y,x+50,y);
      for(let mm=0;mm<=50;mm++) line(x+mm,y,x+mm,y+(mm%10===0?2.8:mm%5===0?1.8:1));
      for(let cm=0;cm<=5;cm++) text(cm+'cm',x+cm*10,y+5.8,2.3,'middle');
      text('Imprime al 100 % · Tamaño real · Sin ajustar a página',w/2,y+11,2.8,'middle');
      text('La regla debe medir 5 cm. Papel: '+layout.paper.shortName,w/2,y+16,2.5,'middle');
    }
    return svg;
  }
  function clear() {
    if (printing) return;
    cached?.frame?.remove(); cached = null;
    document.getElementById('printSheetPreview')?.replaceChildren();
  }
  async function prepare() {
    const job = snapshot();
    if (cached && matches(cached,job)) return cached.promise;
    if (printing) throw Error('Cierra la ventana de impresión antes de preparar otra hoja.');
    clear();
    if (job.layout.errors.length) throw Error(job.layout.errors.join(' '));
    if (!job.sources.some(([,src])=>src)) throw Error('Carga una foto o identificación antes de imprimir.');
    const entry = {...job,frame:null}; cached = entry;
    entry.promise = (async () => {
      const images = {};
      await Promise.all(job.sources.filter(([,src])=>src).map(async ([slot,src])=>{
        const image = new Image(); image.src = src; await image.decode(); images[slot]=image;
      }));
      if (cached !== entry) throw Error('El trabajo cambió. Vuelve a revisar la hoja.');
      const frame=document.createElement('iframe'); entry.frame=frame;
      frame.id='realscan_print_sheet'; frame.title='Hoja preparada para imprimir'; frame.setAttribute('aria-hidden','true');
      frame.style.cssText='position:fixed;left:-20000px;top:0;width:1px;height:1px;border:0;';
      document.body.append(frame);
      const doc=frame.contentDocument, {widthMm:w,heightMm:h}=job.layout.paper;
      const style=doc.createElement('style');
      style.textContent=`@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;padding:0;background:white}section{width:${w}mm;height:${h}mm;break-after:page;page-break-after:always;overflow:hidden}section:last-child{break-after:auto;page-break-after:auto}svg{display:block;width:100%;height:100%}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}`;
      doc.head.append(style); doc.title='RealScan - '+job.layout.spec.name;
      for(const page of job.layout.pages){const section=doc.createElement('section');section.append(doc.importNode(sheet(page,job.layout,images,job.profile),true));doc.body.append(section);}
      await doc.fonts.ready;
      // Decode the actual SVG image resources before enabling the print button.
      await Promise.all(Array.from(doc.querySelectorAll('image'),node=>new Promise((resolve,reject)=>{
        const probe=new frame.contentWindow.Image();probe.onload=resolve;probe.onerror=()=>reject(Error('No se pudo preparar una imagen.'));probe.src=node.getAttribute('href');
      })));
      if(cached!==entry || !matches(entry,snapshot())) throw Error('El trabajo cambió. Vuelve a revisar la hoja.');
      entry.ready=true;
      return entry;
    })().catch(error=>{entry.frame?.remove();if(cached===entry)cached=null;throw error;});
    return entry.promise;
  }
  async function print() {
    if(printing)return;
    const entry=await prepare();
    if(printing)return;
    if(!matches(entry,snapshot()))throw Error('El trabajo cambió. Revisa la hoja antes de imprimir.');
    printing=true;
    const release=()=>{printing=false;clearTimeout(releaseTimer);};
    entry.frame.contentWindow.addEventListener('afterprint',release,{once:true});
    releaseTimer=setTimeout(release,90000);
    try {entry.frame.contentWindow.focus();entry.frame.contentWindow.print();}
    catch(error){release();throw error;}
  }
  function preview(target, entry) {
    target.replaceChildren();
    for (const [i,svg] of Array.from(entry.frame.contentDocument.querySelectorAll('svg')).entries()) {
      const figure=document.createElement('figure'), copy=document.importNode(svg,true), caption=document.createElement('figcaption');
      copy.removeAttribute('width');copy.removeAttribute('height');caption.textContent='Hoja '+(i+1)+' de '+entry.layout.pages.length;
      figure.append(copy,caption);target.append(figure);
    }
  }
  window.RealScanPrint={prepare,print,preview,clear,isPrepared:()=>!!cached?.ready && matches(cached,snapshot())};
})();
