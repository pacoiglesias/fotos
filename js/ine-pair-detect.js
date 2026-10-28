/* INE anverso + reverso en una sola foto.
   Cuando una foto (o un documento subido) trae LOS DOS lados del INE
   juntos, la app los detecta y los separa en las ranuras Frente y
   Reverso, sin pasos extra: el par queda listo para imprimir y para
   enviar a Paperless (el envío actual ya construye el PDF desde las
   imágenes, así que el par son dos páginas). NO es enderezado: no se
   corrige perspectiva, solo se recortan los dos rectángulos tipo
   tarjeta tal como aparecen en la foto.
   Si la detección no encuentra exactamente dos tarjetas, el flujo
   actual sigue exactamente igual (la foto se usa como antes).
   Todo corre en el cliente (canvas), sin dependencias nuevas ni
   llamadas a red. El aviso visible permite intercambiar los lados con
   un toque y deshacer el par con otro. */
(function(root){
'use strict';

/* Detección pura sobre datos RGBA: devuelve dos cajas {x,y,w,h} en píxeles
   de esa imagen, o null. Sin DOM: se puede probar en Node con búferes
   sintéticos. Dos pasos: color contra el fondo estimado, y si falla, bordes
   (para tarjeta blanca sobre fondo claro, donde el cuerpo se confunde con
   el fondo pero su borde dibuja un rectángulo). */
function labelComponents(mask, gw, gh, step, w, h){
 const seen = new Uint8Array(gw * gh), comps = [], stack = [];
 for(let s = 0; s < gw * gh; s++){
  if(!mask[s] || seen[s]) continue;
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1, count = 0;
  stack.length = 0;stack.push(s);seen[s] = 1;
  while(stack.length){
   const p = stack.pop(), gx = p % gw, gy = (p / gw) | 0;
   count++;
   if(gx < minX) minX = gx;if(gx > maxX) maxX = gx;
   if(gy < minY) minY = gy;if(gy > maxY) maxY = gy;
   if(gx > 0 && mask[p - 1] && !seen[p - 1]){seen[p - 1] = 1;stack.push(p - 1);}
   if(gx < gw - 1 && mask[p + 1] && !seen[p + 1]){seen[p + 1] = 1;stack.push(p + 1);}
   if(gy > 0 && mask[p - gw] && !seen[p - gw]){seen[p - gw] = 1;stack.push(p - gw);}
   if(gy < gh - 1 && mask[p + gw] && !seen[p + gw]){seen[p + gw] = 1;stack.push(p + gw);}
  }
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  comps.push({x: minX * step, y: minY * step, w: Math.min(w - minX * step, bw * step), h: Math.min(h - minY * step, bh * step), cells: count, gridW: bw, gridH: bh, gx0: minX, gy0: minY, gx1: maxX, gy1: maxY});
 }
 return comps;
}
function cardShapeOk(c, w, h, imgArea, step){
 if(c.cells * step * step < imgArea * 0.05) return false;
 if(c.w < w * 0.12 || c.h < h * 0.12) return false;
 const ratio = c.w / c.h;
 if(ratio < 1.2 || ratio > 2.1) return false;
 if(c.cells / (c.gridW * c.gridH) < 0.35) return false;
 return true;
}
function findCardBoxes(data, w, h){
 if(!data || !w || !h || data.length < w * h * 4) return {color: [], edge: []};
 function px(x, y){const i = (y * w + x) * 4;return [data[i], data[i + 1], data[i + 2]];}
 const ix = Math.max(1, Math.floor(w * 0.02)), iy = Math.max(1, Math.floor(h * 0.02));
 let sr = 0, sg = 0, sb = 0, n = 0;
 const corners = [[ix, iy], [w - 1 - ix, iy], [ix, h - 1 - iy], [w - 1 - ix, h - 1 - iy]];
 for(const corner of corners) for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++){
  const x = Math.min(w - 1, Math.max(0, corner[0] + dx)), y = Math.min(h - 1, Math.max(0, corner[1] + dy));
  const p = px(x, y);sr += p[0];sg += p[1];sb += p[2];n++;
 }
 const bgR = sr / n, bgG = sg / n, bgB = sb / n;
 const light = bgR > 210 && bgG > 210 && bgB > 210;
 const dark = bgR < 45 && bgG < 45 && bgB < 45;
 function fg(x, y){
  const p = px(x, y);
  if(light) return !(p[0] > 220 && p[1] > 220 && p[2] > 220);
  if(dark) return !(p[0] < 45 && p[1] < 45 && p[2] < 45);
  return Math.abs(p[0] - bgR) + Math.abs(p[1] - bgG) + Math.abs(p[2] - bgB) > 60;
 }
 const step = Math.max(1, Math.round(Math.min(w, h) / 500));
 const gw = Math.ceil(w / step), gh = Math.ceil(h / step);
 const mask = new Uint8Array(gw * gh);
 for(let gy = 0; gy < gh; gy++) for(let gx = 0; gx < gw; gx++)
  if(fg(Math.min(w - 1, gx * step), Math.min(h - 1, gy * step))) mask[gy * gw + gx] = 1;
 const imgArea = w * h;
 const color = labelComponents(mask, gw, gh, step, w, h).filter(function(c){return cardShapeOk(c, w, h, imgArea, step);});
 color.sort(function(a, b){return b.cells - a.cells;});
 const lum = function(x, y){const p = px(x, y);return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];};
 const emask = new Uint8Array(gw * gh);
 for(let gy = 0; gy < gh; gy++) for(let gx = 0; gx < gw; gx++){
  const x = Math.min(w - 1, gx * step), y = Math.min(h - 1, gy * step);
  if(Math.abs(lum(Math.min(w - 1, x + step), y) - lum(x, y)) + Math.abs(lum(x, Math.min(h - 1, y + step)) - lum(x, y)) > 24) emask[gy * gw + gx] = 1;
 }
 const edge = labelComponents(emask, gw, gh, step, w, h).filter(function(c){
  if(c.w < w * 0.12 || c.h < h * 0.12) return false;
  const ratio = c.w / c.h;
  if(ratio < 1.2 || ratio > 2.1) return false;
  if(c.cells < 0.5 * (c.gridW + c.gridH)) return false;
  let border = 0, hit = 0;
  for(let gx = c.gx0; gx <= c.gx1; gx++) for(const gy of [c.gy0, c.gy1]){border++;if(emask[gy * gw + gx]) hit++;}
  for(let gy = c.gy0; gy <= c.gy1; gy++) for(const gx of [c.gx0, c.gx1]){border++;if(emask[gy * gw + gx]) hit++;}
  return border > 0 && hit / border >= 0.4;
 });
 edge.sort(function(a, b){return b.cells - a.cells;});
 return {color: color, edge: edge};
}
function pickPair(good){
 // Dos contornos de la misma tarjeta (borde exterior e interior) no son dos
 // tarjetas: se queda el mayor de cada grupo que se solapa mucho.
 const kept=[];
 for(const c of good){
  const overlap=kept.some(k=>{
   const ox=Math.max(0,Math.min(k.x+k.w,c.x+c.w)-Math.max(k.x,c.x));
   const oy=Math.max(0,Math.min(k.y+k.h,c.y+c.h)-Math.max(k.y,c.y));
   const smaller=Math.min(k.w*k.h,c.w*c.h);
   return smaller>0&&(ox*oy)/smaller>0.7;
  });
  if(!overlap)kept.push(c);
 }
 if(kept.length === 2) return kept;
 if(kept.length > 2 && kept[1].cells >= kept[2].cells * 1.6) return kept.slice(0, 2);
 return null;
}
function detectPairRegions(data, w, h){
 if(!data || !w || !h || data.length < w * h * 4) return null;
 const boxes = findCardBoxes(data, w, h);
 const pair = pickPair(boxes.color) || pickPair(boxes.edge);
 if(!pair) return null;
 return orderPair(pair);
}
/* Una sola tarjeta: la caja mayor que pasa el filtro de forma, o null.
   Sirve para marcar los bordes en la vista de confirmación. */
function detectSingleCard(data, w, h){
 if(!data || !w || !h || data.length < w * h * 4) return null;
 const boxes = findCardBoxes(data, w, h);
 const best = boxes.color[0] || boxes.edge[0];
 return best ? {x: best.x, y: best.y, w: best.w, h: best.h} : null;
}

function orderPair(pair){
 // Orden de lectura: misma fila -> izquierda primero; si no, arriba primero.
 const a = pair[0], b = pair[1];
 const cyA = a.y + a.h / 2, cyB = b.y + b.h / 2;
 const sameRow = Math.abs(cyA - cyB) < Math.min(a.h, b.h) * 0.35;
 const ordered = sameRow ? (a.x <= b.x ? [a, b] : [b, a]) : (cyA <= cyB ? [a, b] : [b, a]);
 return ordered.map(function(c){return {x: c.x, y: c.y, w: c.w, h: c.h};});
}
function loadImage(dataUrl){
 return new Promise(function(resolve, reject){
  const img = new Image();
  img.onload = function(){resolve(img);};
  img.onerror = function(){reject(new Error('No se pudo leer la imagen.'));};
  img.src = dataUrl;
 });
}

async function detectPairFromDataUrl(dataUrl){
 const img = await loadImage(dataUrl);
 const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
 const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
 const canvas = document.createElement('canvas');
 canvas.width = w;canvas.height = h;
 const ctx = canvas.getContext('2d', {willReadFrequently: true});
 ctx.drawImage(img, 0, 0, w, h);
 const boxes = detectPairRegions(ctx.getImageData(0, 0, w, h).data, w, h);
 if(!boxes) return null;
 const crops = boxes.map(function(box){
  const padX = Math.round(box.w * 0.02), padY = Math.round(box.h * 0.02);
  const sx = Math.max(0, Math.round(box.x / scale) - Math.round(padX / scale));
  const sy = Math.max(0, Math.round(box.y / scale) - Math.round(padY / scale));
  const sw = Math.min(img.naturalWidth - sx, Math.round(box.w / scale) + 2 * Math.round(padX / scale));
  const sh = Math.min(img.naturalHeight - sy, Math.round(box.h / scale) + 2 * Math.round(padY / scale));
  const c = document.createElement('canvas');
  c.width = Math.max(1, sw);c.height = Math.max(1, sh);
  c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.95);
 });
 return {boxes: boxes, crops: crops};
}

/* Detection proposes two sides only for an unlocked CR80 identification job. */
let lastSeen={},pairState=null,pairBusy=false,banner=null,generation=0;
const $=id=>document.getElementById(id);
function eligible(){return root.state?.activeCategory==='docs'&&root.state?.format==='card'&&$('loginOverlay')?.classList.contains('hidden')&&(!$('setupOverlay')||$('setupOverlay').classList.contains('hidden'))&&!root.RealScanDocuments?.status().active;}
function revision(){return root.state?._jobRevision||0;}
function valid(value){return eligible()&&value.job===revision()&&value.generation===generation;}
function closeBanner(){banner?.remove();banner=null;}
function cancelled(){generation++;pairState=null;pairBusy=false;lastSeen={};closeBanner();}
function onSlotPreview(side){
 if(pairBusy||!['front','back'].includes(side)||!eligible())return;
 const slot=root.state.images[side],other=side==='front'?'back':'front';if(!slot?.originalSrc||root.state.images[other]?.originalSrc)return;
 const src=slot.rawOriginalSrc||slot.originalSrc;if(src===lastSeen[side]||pairState&&(src===pairState.front||src===pairState.back||src===pairState.original))return;
 lastSeen[side]=src;closeBanner();const token={job:revision(),generation,side,original:src};
 detectPairFromDataUrl(src).then(pair=>{if(!pair||!valid(token)||root.state.images[other]?.originalSrc||(root.state.images[side].rawOriginalSrc||root.state.images[side].originalSrc)!==src)return;pairState={...token,front:pair.crops[0],back:pair.crops[1],applied:false};showBanner();}).catch(()=>{});
}
async function applyPair(swap=false){
 const value=pairState;if(!value||pairBusy||!valid(value))return;pairBusy=true;
 try{const front=swap?value.back:value.front,back=swap?value.front:value.back;root.processRawDataUrl(front,'front',true);root.processRawDataUrl(back,'back',true);await root.waitForProcessingComplete?.();if(!valid(value))return;if(root.state.images.front.rawOriginalSrc!==front||root.state.images.back.rawOriginalSrc!==back)throw Error('No se pudieron preparar ambas caras.');Object.assign(value,{front,back,applied:true});lastSeen={front,back};showBanner();root.saveActiveDraft?.();}
 catch(e){if(valid(value))root.showToast?.('Revisa las capturas. La imagen original sigue disponible en Deshacer.','warning');}
 finally{if(value.generation===generation)pairBusy=false;}
}
function keepOriginal(){const value=pairState;if(!value||!valid(value)||pairBusy)return;closeBanner();pairState=null;lastSeen[value.side]=value.original;if(value.applied||(root.state.images[value.side]?.rawOriginalSrc||root.state.images[value.side]?.originalSrc)!==value.original){root.clearSlot(value.side==='front'?'back':'front');root.processRawDataUrl(value.original,value.side,true);root.saveActiveDraft?.();}}
/* División manual bajo demanda ("Esta foto trae dos caras → dividir"):
   la foto se parte por la mitad (lado a lado o una sobre otra) y el
   resultado usa el mismo banner con Usar ambas caras, Intercambiar y
   Deshacer. El original nunca se pierde: Deshacer lo restaura. */
function splitDialog(){
 if(!eligible())return;
 const slot=root.state.images.front,src=slot?.rawOriginalSrc||slot?.originalSrc;
 if(!src){root.showToast?.('Carga primero una foto con las dos caras.','info');return;}
 if(root.state.images.back?.originalSrc){root.showToast?.('El reverso ya está cargado. Usa Intercambiar en el banner del par.','info');return;}
 let dialog=$('inePairSplitDialog');
 if(dialog)dialog.remove();
 dialog=document.createElement('dialog');dialog.id='inePairSplitDialog';dialog.className='desk-dialog';dialog.setAttribute('aria-label','Dividir foto con dos caras');
 dialog.innerHTML='<h2>¿Esta foto trae dos caras?</h2><p>Se divide por la mitad y cada mitad va a su ranura. Después revisa los bordes: puedes intercambiar los lados o deshacer y conservar la foto completa.</p><p class="ine-pair-tip">Consejo: fotografía las tarjetas sobre un fondo oscuro y liso para que se separen solas la próxima vez.</p><div class="document-actions"><button type="button" id="inePairSplitVertical">Dividir: lado a lado</button><button type="button" id="inePairSplitHorizontal">Dividir: una sobre otra</button><button type="button" id="inePairSplitCancel">Cancelar</button></div>';
 document.body.append(dialog);
 const split=async direction=>{
  if(pairBusy)return;pairBusy=true;
  try{
   const img=await loadImage(src);
   const w=img.naturalWidth,h=img.naturalHeight;
   const halves=direction==='vertical'?[[0,0,w/2,h],[w/2,0,w/2,h]]:[[0,0,w,h/2],[0,h/2,w,h/2]];
   const crops=halves.map(([sx,sy,sw,sh])=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.round(sw));c.height=Math.max(1,Math.round(sh));c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.95);});
   pairState={job:revision(),generation,side:'front',original:src,front:crops[0],back:crops[1],applied:false};
   dialog.close();dialog.remove();showBanner();
  }catch(e){root.showToast?.('No se pudo dividir la foto. Usa el modo completo para recortar a mano.','warning');}
  finally{pairBusy=false;}
 };
 dialog.querySelector('#inePairSplitVertical').onclick=()=>split('vertical');
 dialog.querySelector('#inePairSplitHorizontal').onclick=()=>split('horizontal');
 dialog.querySelector('#inePairSplitCancel').onclick=()=>{dialog.close();dialog.remove();};
 dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();dialog.remove();});
 dialog.showModal();
}
function showBanner(){closeBanner();const value=pairState;if(!value||!valid(value))return;const box=document.createElement('section');box.className='ine-pair-banner';box.setAttribute('aria-label','Revisar las dos caras detectadas');const heading=document.createElement('strong');heading.textContent=value.applied?'Dos caras preparadas · revisa los bordes':'Encontramos dos posibles caras de una identificación';const note=document.createElement('p');note.textContent='Comprueba que las tarjetas estén completas, derechas y en el orden correcto. Las medidas finales siguen siendo 85.60 × 53.98 mm. Consejo: sobre un fondo oscuro y liso, la próxima foto se separará sola.';const thumbs=document.createElement('div');thumbs.className='ine-pair-thumbs';for(const [src,label]of [[value.front,'Frente'],[value.back,'Reverso']]){const f=document.createElement('figure'),img=document.createElement('img'),c=document.createElement('figcaption');img.src=src;img.alt=label;c.textContent=label;f.append(img,c);thumbs.append(f);}const actions=document.createElement('div');actions.className='ine-pair-actions';for(const [label,fn]of [[value.applied?'Intercambiar':'Usar ambas caras',()=>applyPair(value.applied)],[value.applied?'Deshacer separación':'Conservar foto completa',keepOriginal]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b);}box.append(heading,note,thumbs,actions);const anchor=$('capturePreviewRail')||$('studioImageTray')||$('deskStart');anchor?.after(box);banner=box;}
function install(){const previous=root.updateSidePreview;if(typeof previous!=='function')return;root.updateSidePreview=function(side){const result=previous.apply(this,arguments);onSlotPreview(side);return result;};
 const tools=$('studioEditorTools');
 if(tools&&!$('inePairSplitBtn')){const b=document.createElement('button');b.type='button';b.id='inePairSplitBtn';b.className='studio-button';b.textContent='Esta foto trae dos caras → dividir';b.onclick=()=>{if(!$('loginOverlay')?.classList.contains('hidden'))return;splitDialog();};tools.append(b);
  const syncSplitBtn=()=>{b.hidden=!eligible()||!root.state.images.front?.originalSrc||!!root.state.images.back?.originalSrc;};
  document.addEventListener('realscan:studio-updated',syncSplitBtn);syncSplitBtn();}document.addEventListener('realscan:auth-lock',cancelled);let job=revision();document.addEventListener('realscan:studio-updated',()=>{if(revision()!==job){job=revision();cancelled();onSlotPreview('front');onSlotPreview('back');}else if(!eligible()&&(pairState||banner)){cancelled();}});}
async function detectSingleCardFromDataUrl(dataUrl){
 const img = await loadImage(dataUrl);
 const scale = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
 const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
 const canvas = document.createElement('canvas');
 canvas.width = w;canvas.height = h;
 const ctx = canvas.getContext('2d', {willReadFrequently: true});
 ctx.drawImage(img, 0, 0, w, h);
 const box = detectSingleCard(ctx.getImageData(0, 0, w, h).data, w, h);
 if(!box) return null;
 return {box: {x: Math.round(box.x / scale), y: Math.round(box.y / scale), w: Math.round(box.w / scale), h: Math.round(box.h / scale)}, width: img.naturalWidth, height: img.naturalHeight};
}
root.RealScanInePair={detectPairRegions,detectPairFromDataUrl,detectSingleCard,detectSingleCardFromDataUrl,cancel:cancelled};
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,70));
if(typeof module!=='undefined'&&module.exports)module.exports={detectPairRegions,detectSingleCard,findCardBoxes};
})(typeof window!=='undefined'?window:globalThis);
