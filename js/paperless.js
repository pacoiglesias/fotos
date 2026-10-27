/* Paperless-ngx: archiva el PDF de un trabajo en el Paperless del negocio.
   El token de API vive SOLO en localStorage de este navegador: nunca se
   escribe en el código, en ningún archivo ni en ningún registro. En
   ejemplos y documentación se escribe únicamente el marcador TU_TOKEN,
   nunca un valor real. Sin token no hay envío: los ajustes lo piden antes.
   En producción hace falta un permiso fuera de este repo: CORS de
   Paperless para https://fotos.cobertores.com. La CSP de la app ya
   incluye el dominio de Paperless en connect-src (firebase.json). Sin
   CORS el navegador bloquea el envío y se muestra el error de readableError. */
(function(root){
'use strict';
const BASE_KEY='realscan_paperless_base_v1',TOKEN_KEY='realscan_paperless_token_v1';
const DEFAULT_BASE='https://paperless.iglesiasmurrieta.com';
const say=message=>root.showToast?.(message,'info');
function cleanBase(value){
 const base=(value||'').trim().replace(/\/+$/,'');
 if(!/^https?:\/\/[^/]+$/.test(base))throw Error('La dirección de Paperless no es válida. Usa https://paperless.iglesiasmurrieta.com');
 return base;
}
function getBase(){try{return cleanBase(localStorage.getItem(BASE_KEY)||DEFAULT_BASE);}catch{return DEFAULT_BASE;}}
function getToken(){try{return (localStorage.getItem(TOKEN_KEY)||'').trim();}catch{return '';}}
function hasToken(){return !!getToken();}
function save(base,token){
 const clean=cleanBase(base);
 try{
  localStorage.setItem(BASE_KEY,clean);
  if(token&&token.trim())localStorage.setItem(TOKEN_KEY,token.trim());
  else localStorage.removeItem(TOKEN_KEY);
 }catch{throw Error('No se pudo guardar en este navegador. Revisa el almacenamiento del sitio.');}
 return clean;
}
function fileNameFor(title,blob){
 const ext=blob.type==='image/png'?'png':blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':blob.type==='text/plain'?'txt':'pdf';
 const safe=(title||'RealScan_Entrega').replace(/[\x00-\x1f<>:"/\\|?*]/g,'').trim().slice(0,80)||'RealScan_Entrega';
 return safe+'.'+ext;
}
function readableError(error,status){
 if(status===401||status===403)return 'Paperless rechazó el token. Revisa el token en Ajustes de Paperless (Paperless → Administración → Tokens).';
 if(status===400)return 'Paperless no aceptó el archivo. Revisa que sea un PDF o una imagen válida.';
 if(status)return 'Paperless respondió con un error ('+status+'). Reintenta en un momento.';
 if(error&&error.name==='AbortError')return 'El envío a Paperless tardó demasiado. Revisa tu conexión y reintenta.';
 return 'No se pudo contactar a Paperless. Revisa que la dirección sea correcta, que Paperless esté en línea y que permita el origen de esta app (CORS).';
}
function fail(message){const error=Error(message);error._paperlessReadable=true;return error;}
async function checkAccess(onStatus){
 const base=getBase(),token=getToken();
 if(!token){onStatus?.('Guarda primero tu token en Ajustes de Paperless.');return false;}
 onStatus?.('Comprobando acceso a Paperless…');
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),30000);
 try{
  const res=await fetch(base+'/api/documents/?page_size=1',{headers:{Authorization:'Token '+token},signal:control.signal});
  if(res.ok){onStatus?.('Conexión correcta con Paperless.');return true;}
  onStatus?.(readableError(null,res.status));return false;
 }catch(e){onStatus?.(readableError(e,0));return false;}
 finally{clearTimeout(timer);}
}
async function send(blob,title,onStatus){
 if(!blob||!blob.size)throw fail('No hay archivo preparado para enviar a Paperless.');
 const base=getBase(),token=getToken();
 if(!token){openSettings('Guarda tu token de Paperless para enviar este archivo.');throw fail('Falta el token de Paperless. Guárdalo en Ajustes y vuelve a enviar.');}
 const form=new FormData();
 form.append('document',blob,fileNameFor(title,blob));
 form.append('title',(title||'RealScan_Entrega').slice(0,200));
 onStatus?.('Enviando a Paperless…');
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),180000);
 try{
  const res=await fetch(base+'/api/documents/post_document/',{method:'POST',headers:{Authorization:'Token '+token},body:form,signal:control.signal});
  if(!res.ok)throw fail(readableError(null,res.status));
  let taskId='';
  try{const data=await res.clone().json();taskId=data.task_id||data.id||'';}catch{try{taskId=(await res.text()).trim();}catch{}}
  onStatus?.('Enviado a Paperless. Paperless lo procesará en unos momentos.');
  return {taskId};
 }catch(e){
  if(e&&e._paperlessReadable)throw e;
  throw fail(readableError(e,0));
 }finally{clearTimeout(timer);}
}
function field(labelText,input){
 const label=document.createElement('label');label.textContent=labelText;label.append(input);return label;
}
function openSettings(note){
 let d=document.getElementById('paperlessSettings');
 if(!d){
  d=document.createElement('dialog');d.id='paperlessSettings';d.className='desk-dialog';d.setAttribute('aria-label','Ajustes de Paperless');
  const title=document.createElement('h2');title.textContent='Ajustes de Paperless';
  const noteBox=document.createElement('p');noteBox.id='paperlessNote';noteBox.textContent='El token se guarda solo en este navegador. Se crea en Paperless → Administración → Tokens. Nunca se escribe en el código de la app.';
  const baseInput=document.createElement('input');baseInput.id='paperlessBase';baseInput.type='url';baseInput.placeholder=DEFAULT_BASE;baseInput.setAttribute('aria-label','Dirección de Paperless');
  const tokenInput=document.createElement('input');tokenInput.id='paperlessToken';tokenInput.type='password';tokenInput.placeholder='Pega aquí tu token de API';tokenInput.autocomplete='off';tokenInput.setAttribute('aria-label','Token de API de Paperless');
  const status=document.createElement('p');status.id='paperlessStatus';status.setAttribute('role','status');
  const saveBtn=document.createElement('button');saveBtn.type='button';saveBtn.id='paperlessSave';saveBtn.textContent='Guardar ajustes';
  const checkBtn=document.createElement('button');checkBtn.type='button';checkBtn.id='paperlessCheck';checkBtn.textContent='Comprobar acceso';
  const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.textContent='Cerrar';
  saveBtn.onclick=()=>{try{save(baseInput.value,tokenInput.value);status.textContent='Ajustes de Paperless guardados.';say('Ajustes de Paperless guardados.');}catch(e){status.textContent=e.message;}};
  checkBtn.onclick=async()=>{saveBtn.disabled=true;checkBtn.disabled=true;try{save(baseInput.value,tokenInput.value);status.textContent='Ajustes guardados. Comprobando acceso…';await checkAccess(message=>{status.textContent=message;});}catch(e){status.textContent=e.message;}finally{saveBtn.disabled=false;checkBtn.disabled=false;}};
  closeBtn.onclick=()=>d.close();
  d.append(title,noteBox,field('Dirección de Paperless',baseInput),field('Token de API',tokenInput),status,saveBtn,checkBtn,closeBtn);
  document.body.append(d);
 }
 document.getElementById('paperlessBase').value=getBase();
 document.getElementById('paperlessToken').value=getToken();
 document.getElementById('paperlessStatus').textContent=note||'';
 if(!d.open)d.showModal();
}
root.RealScanPaperless={DEFAULT_BASE,getBase,getToken,hasToken,save,send,checkAccess,openSettings};
})(window);
