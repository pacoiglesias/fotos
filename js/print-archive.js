/* Archive the immutable, complete printed sheets, including overlays and physical page sizes. */
(function(root){
 'use strict';
 const MM_TO_PX=300/25.4;
 async function image(src){const img=new Image();img.src=src;await img.decode();return img;}
 async function fromDocument(saved,{isCurrent=()=>true}={}){
  if(!isCurrent())throw Error('La sesión cambió.');
  if(typeof ensureJsPdf==='function')await ensureJsPdf();
  const sections=[...saved.body.querySelectorAll('section')];if(!sections.length||sections.length>80)throw Error('La copia no contiene hojas válidas.');
  let pdf;const sizes=[];
  for(const section of sections){
   if(!isCurrent())throw Error('El trabajo o la sesión cambió.');
   const svg=[...section.children].find(n=>n.tagName.toLowerCase()==='svg');
   const box=svg?.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
   const w=svg?box?.[2]:parseFloat(section.style.width),h=svg?box?.[3]:parseFloat(section.style.height);
   if(!Number.isFinite(w)||!Number.isFinite(h)||w<30||h<30||w>500||h>600)throw Error('El tamaño de la hoja guardada no es válido.');
   const c=document.createElement('canvas');c.width=Math.round(w*MM_TO_PX);c.height=Math.round(h*MM_TO_PX);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
   try{
    if(svg){const copy=svg.cloneNode(true);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width',c.width);copy.setAttribute('height',c.height);const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(copy));const img=await image(src);ctx.drawImage(img,0,0,c.width,c.height);}
    else for(const n of section.children){
     if(n.tagName==='IMG'){const img=await image(n.getAttribute('src'));const x=parseFloat(n.style.left)||0,y=parseFloat(n.style.top)||0,iw=parseFloat(n.style.width),ih=parseFloat(n.style.height);if(![x,y,iw,ih].every(Number.isFinite)||iw<=0||ih<=0)throw Error('La copia contiene una imagen sin medidas.');ctx.save();if(n.style.filter.includes('grayscale'))ctx.filter='grayscale(1)';ctx.drawImage(img,x*MM_TO_PX,y*MM_TO_PX,iw*MM_TO_PX,ih*MM_TO_PX);ctx.restore();}
     else if(n.tagName==='H1'){ctx.fillStyle='#111';ctx.font=(10*25.4/72*MM_TO_PX)+'px Arial';ctx.textAlign='center';ctx.textBaseline='top';let y=(parseFloat(n.style.top)||0)*MM_TO_PX;for(const line of n.textContent.split('\n')){ctx.fillText(line,c.width/2,y,c.width);y+=10*25.4/72*MM_TO_PX*1.2;}}
    }
    if(!isCurrent())throw Error('La sesión cambió.');
    if(!pdf)pdf=new root.jspdf.jsPDF({unit:'mm',format:[w,h],orientation:w>h?'landscape':'portrait',compress:true});else pdf.addPage([w,h],w>h?'landscape':'portrait');
    pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,w,h);sizes.push({widthMm:w,heightMm:h});
   }finally{c.width=c.height=1;}
  }
  return Object.freeze({blob:pdf.output('blob'),pages:sections.length,sizes});
 }
 root.RealScanPrintArchive={fromDocument};
})(window);
