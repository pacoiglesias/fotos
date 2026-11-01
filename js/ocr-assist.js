/* Datos del documento leídos en este equipo, solo para nombrar y comprobar.
   Nunca inventa: si no hay CURP o nombre con forma clara, devuelve null y
   el título lo escribe el operador. La comparación frente/reverso tolera
   las confusiones habituales del OCR (O/0, I/1) normalizando ambos lados
   igual; si falta la CURP en un lado, no se afirma nada (match null).
   La parte pura no usa DOM y se prueba en Node. */
(function(root){
'use strict';
function normalizeText(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
function tolerant(text){return normalizeText(text).replace(/[^A-Z0-9]/g,'').replace(/O/g,'0').replace(/I/g,'1').replace(/L/g,'1');}
function extractCurp(text){
 const clean=normalizeText(text).replace(/[^A-Z0-9]/g,'');
 const strict=clean.match(/[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9][0-9]/);
 if(strict)return strict[0];
 // Solo en posiciones de dígito se tolera O/I/L del OCR: convertir la L
 // en todo el texto rompería letras legítimas (p. ej. la homonimia RRL).
 const tol=clean.match(/[A-Z]{4}[0-9OIL]{6}[HM][A-Z]{5}[A-Z0-9][0-9OIL]/);
 if(!tol)return null;
 const m=tol[0],digits=s=>s.replace(/O/g,'0').replace(/I/g,'1').replace(/L/g,'1');
 return m.slice(0,4)+digits(m.slice(4,10))+m.slice(10,16)+digits(m.slice(16));
}
function extractName(text){
 const lines=normalizeText(text).split(/\n+/).map(l=>l.replace(/[^A-ZÑ ]/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
 const at=lines.findIndex(l=>/^NOMBRE/.test(l));
 const candidates=at>=0?lines.slice(at+1,at+4):[];
 for(const line of candidates){
  if(line.length>=5&&line.length<=60&&/^[A-ZÑ]+( [A-ZÑ]+){1,4}$/.test(line)&&!/(INSTITUTO|ELECTORAL|CREDENCIAL|VOTAR|DOMICILIO|FECHA|CLAVE|CURP)/.test(line))return line;
 }
 return null;
}
function extractIdentity(text){return {curp:extractCurp(text),name:extractName(text)};}
const cache=new Map();let cacheEpoch=0;function clear(){cacheEpoch++;cache.clear();}if(typeof document!=='undefined')document.addEventListener('realscan:auth-lock',clear);root.addEventListener?.('pagehide',clear);
async function recognizeCached(dataUrl){
 if(!dataUrl||!root.RealScanOcr?.recognizeText)return null;
 if(cache.has(dataUrl))return cache.get(dataUrl);const revision=cacheEpoch;
 const result=await root.RealScanOcr.recognizeText(dataUrl,'spa');
 if(revision!==cacheEpoch)return null;
 if(cache.size>=4)cache.delete(cache.keys().next().value);
 cache.set(dataUrl,result);
 return result;
}
async function suggestFileName(dataUrl){
 const result=await recognizeCached(dataUrl);
 if(!result?.text)return null;
 const identity=extractIdentity(result.text);
 if(identity.curp)return 'INE · '+identity.curp;
 if(identity.name)return 'INE · '+identity.name;
 return null;
}
async function verifySameDocument(frontSrc,backSrc){
 const [front,back]=[await recognizeCached(frontSrc),await recognizeCached(backSrc)];
 const frontCurp=front?.text?extractCurp(front.text):null;
 const backCurp=back?.text?extractCurp(back.text):null;
 if(!frontCurp||!backCurp)return {frontCurp,backCurp,match:null};
 return {frontCurp,backCurp,match:tolerant(frontCurp)===tolerant(backCurp)};
}
root.RealScanOcrAssist={clear,extractCurp,extractName,extractIdentity,recognizeCached,suggestFileName,verifySameDocument};
if(typeof module!=='undefined'&&module.exports)module.exports={normalizeText,tolerant,extractCurp,extractName,extractIdentity};
})(typeof window!=='undefined'?window:globalThis);
