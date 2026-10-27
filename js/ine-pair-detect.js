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

/* Detección pura sobre datos RGBA: recibe el buffer de una imagen y
   devuelve dos cajas {x,y,w,h} en píxeles de esa imagen, o null.
   Sin DOM: se puede probar en Node con búferes sintéticos. */
function detectPairRegions(data, w, h){
 if(!data || !w || !h || data.length < w * h * 4) return null;
 function px(x, y){const i = (y * w + x) * 4;return [data[i], data[i + 1], data[i + 2]];}
 // Fondo estimado desde las cuatro esquinas (como el auto-recorte).
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
 // Máscara en rejilla y componentes conexos (4-vecinos).
 const step = Math.max(1, Math.round(Math.min(w, h) / 500));
 const gw = Math.ceil(w / step), gh = Math.ceil(h / step);
 const mask = new Uint8Array(gw * gh);
 for(let gy = 0; gy < gh; gy++) for(let gx = 0; gx < gw; gx++)
  if(fg(Math.min(w - 1, gx * step), Math.min(h - 1, gy * step))) mask[gy * gw + gx] = 1;
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
  comps.push({x: minX * step, y: minY * step, w: Math.min(w - minX * step, bw * step), h: Math.min(h - minY * step, bh * step), cells: count, gridW: bw, gridH: bh});
 }
 // Una tarjeta INE (CR80, 85.6 x 53.98 mm) mide 1.586 de proporción; se
 // admite de 1.2 a 2.1 para tolerar ligera rotación en la foto.
 const imgArea = w * h;
 const good = comps.filter(function(c){
  if(c.cells * step * step < imgArea * 0.05) return false;
  if(c.w < w * 0.12 || c.h < h * 0.12) return false;
  const ratio = c.w / c.h;
  if(ratio < 1.2 || ratio > 2.1) return false;
  if(c.cells / (c.gridW * c.gridH) < 0.35) return false;
  return true;
 });
 good.sort(function(a, b){return b.cells - a.cells;});
 let pair = null;
 if(good.length === 2) pair = good;
 else if(good.length > 2 && good[1].cells >= good[2].cells * 1.6) pair = good.slice(0, 2);
 if(!pair) return null;
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

/* Integración con el flujo del mostrador: se observa la vista previa de
   cada ranura. Cuando llega una foto nueva a Frente o Reverso y la otra
   ranura está vacía, se intenta la detección; si acierta, el par se
   aplica solo, con aviso visible, intercambio y deshacer de un toque. */
let lastSeen = {}, pairState = null, pairBusy = false, banner = null;
function jobRev(){try{return (typeof state !== 'undefined' && state && state._jobRevision) || 0;}catch(e){return 0;}}
function slotOf(side){try{return (typeof state !== 'undefined' && state && state.images && state.images[side]) || null;}catch(e){return null;}}
function slotEmpty(side){const s = slotOf(side);return !s || !s.originalSrc;}
function isPairCrop(src){return !!pairState && (src === pairState.front || src === pairState.back || src === pairState.original);}
function docModeActive(){
 try{return !!(root.RealScanDocuments && root.RealScanDocuments.status && root.RealScanDocuments.status().active);}
 catch(e){return false;}
}
function waitForCrops(frontSrc, backSrc, ms){
 const started = Date.now();
 return new Promise(function(resolve){
  (function tick(){
   const f = slotOf('front'), b = slotOf('back');
   if(f && b && f.rawOriginalSrc === frontSrc && b.rawOriginalSrc === backSrc) return resolve(true);
   if(Date.now() - started > ms) return resolve(false);
   setTimeout(tick, 100);
  })();
 });
}
function onSlotPreview(side){
 if(pairBusy) return;
 if(side !== 'front' && side !== 'back') return;
 const slot = slotOf(side);
 if(!slot) return;
 if(!slot.originalSrc){if(banner) closeBanner();return;}
 // La foto del par ya aplicado no vuelve a disparar la detección.
 if(isPairCrop(slot.rawOriginalSrc)){lastSeen[side] = slot.rawOriginalSrc;return;}
 if(slot.rawOriginalSrc === lastSeen[side]) return;
 lastSeen[side] = slot.rawOriginalSrc;
 if(banner) closeBanner();
 if(docModeActive()) return;
 const other = side === 'front' ? 'back' : 'front';
 if(!slotEmpty(other)) return;
 const source = slot.rawOriginalSrc || slot.originalSrc, job = jobRev();
 detectPairFromDataUrl(source).then(function(pair){
  if(!pair || pairBusy) return;
  if(jobRev() !== job) return;
  if(slotOf(side) && slotOf(side).rawOriginalSrc !== lastSeen[side]) return;
  if(!slotEmpty(other)) return;
  applyPair(source, side, pair);
 }).catch(function(){/* sin par: el flujo sigue exactamente igual */});
}
async function applyPair(source, loadedSide, pair){
 pairBusy = true;
 try{
  const first = pair.crops[0], second = pair.crops[1];
  root.processRawDataUrl(first, 'front', true);
  root.processRawDataUrl(second, 'back', true);
  if(!await waitForCrops(first, second, 15000)){
   // No quedaron las dos: se restaura la foto original, sin cambios.
   try{root.clearSlot(loadedSide === 'front' ? 'back' : 'front');}catch(e){}
   root.processRawDataUrl(source, loadedSide, true);
   root.showToast && root.showToast('No se pudo separar el par; queda la foto original.', 'warning');
   return;
  }
  pairState = {original: source, originalSide: loadedSide, front: first, back: second};
  lastSeen.front = first;lastSeen.back = second;
  showBanner();
  root.showToast && root.showToast('Se detectaron los dos lados del INE: anverso y reverso listos.', 'success');
 }catch(e){
  try{root.processRawDataUrl(source, loadedSide, true);}catch(err){}
 }finally{pairBusy = false;}
}
async function swapPair(){
 if(!pairState || pairBusy) return;
 pairBusy = true;
 try{
  const f = pairState.front, b = pairState.back;
  root.processRawDataUrl(b, 'front', true);
  root.processRawDataUrl(f, 'back', true);
  if(await waitForCrops(b, f, 15000)){
   pairState.front = b;pairState.back = f;
   lastSeen.front = b;lastSeen.back = f;
   updateBannerThumbs();
  }
 }finally{pairBusy = false;}
}
async function undoPair(){
 if(!pairState || pairBusy) return;
 pairBusy = true;
 const kept = pairState;
 closeBanner();
 pairState = null;
 try{
  try{root.clearSlot(kept.originalSide === 'front' ? 'back' : 'front');}catch(e){}
  root.processRawDataUrl(kept.original, kept.originalSide, true);
  root.showToast && root.showToast('Par deshecho: queda la foto original.', 'info');
 }finally{pairBusy = false;}
}
function thumbFigure(src, label){
 const figure = document.createElement('figure');
 const img = document.createElement('img');
 img.src = src;img.alt = label;
 const cap = document.createElement('figcaption');
 cap.textContent = label;
 figure.append(img, cap);
 return figure;
}
function showBanner(){
 closeBanner();
 if(!pairState) return;
 const box = document.createElement('div');
 box.className = 'ine-pair-banner';
 box.setAttribute('role', 'status');
 const text = document.createElement('div');
 text.className = 'ine-pair-text';
 const title = document.createElement('strong');
 title.textContent = 'INE: anverso y reverso detectados';
 const note = document.createElement('p');
 note.textContent = 'La foto traía los dos lados y se separaron en Frente y Reverso. Si el orden quedó al revés, intercámbialos con un toque.';
 text.append(title, note);
 const thumbs = document.createElement('div');
 thumbs.className = 'ine-pair-thumbs';
 thumbs.append(thumbFigure(pairState.front, 'Anverso'), thumbFigure(pairState.back, 'Reverso'));
 const actions = document.createElement('div');
 actions.className = 'ine-pair-actions';
 const swap = document.createElement('button');
 swap.type = 'button';swap.textContent = 'Intercambiar';
 swap.onclick = function(){swapPair();};
 const undo = document.createElement('button');
 undo.type = 'button';undo.textContent = 'Deshacer';
 undo.onclick = function(){undoPair();};
 actions.append(swap, undo);
 box.append(text, thumbs, actions);
 const anchor = document.getElementById('slotThumbWrapFront');
 if(anchor && anchor.parentElement) anchor.parentElement.insertBefore(box, anchor);
 else{
  const tray = document.getElementById('studioImageTray');
  if(tray && tray.before) tray.before(box);
  else{
   const desk = document.getElementById('deskStart');
   if(desk && desk.after) desk.after(box);
   else document.body.prepend(box);
  }
 }
 banner = box;
}
function updateBannerThumbs(){
 if(!banner || !pairState) return;
 const imgs = banner.querySelectorAll('.ine-pair-thumbs img');
 if(imgs[0]) imgs[0].src = pairState.front;
 if(imgs[1]) imgs[1].src = pairState.back;
}
function closeBanner(){
 if(banner && banner.remove) banner.remove();
 banner = null;
}
function install(){
 if(typeof document === 'undefined') return;
 const prev = root.updateSidePreview;
 if(typeof prev !== 'function' || prev._inePairWrapped) return;
 const wrapped = function(side){
  const result = prev.apply(this, arguments);
  try{onSlotPreview(side);}catch(e){}
  return result;
 };
 wrapped._inePairWrapped = true;
 root.updateSidePreview = wrapped;
}
root.RealScanInePair = {detectPairRegions: detectPairRegions, detectPairFromDataUrl: detectPairFromDataUrl};
if(typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', function(){setTimeout(install, 70);});
if(typeof module !== 'undefined' && module.exports) module.exports = {detectPairRegions: detectPairRegions};
})(typeof window !== 'undefined' ? window : globalThis);
